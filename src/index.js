import 'babel-core/polyfill';
import Promise from 'bluebird';

export default class captureVisibleTabFull {
    constructor({tab}) {
        this.tab = tab;
    }
    async capture() {
        await this._loadContentScript();
        let port = chrome.runtime.connect({name: `scroller_${this.tab.id}`});
        let {contentFullSize, maxIndexSize, devicePixelRatio} = await this._connect({port});
        let canvas = this._makeCanvas(contentFullSize, devicePixelRatio);
        Array(maxIndexSize).join(',').split(',').map(async (_, index) => {
            let {top, left} = await this._doScroll({port, index});
            let dataURI = await this._doCapture();
            let image = await this._loadImage(dataURI);
            canvas.getContext('2d').drawImage(image, left, top);
        });
        return canvas;
    }
    _makeCanvas({width, height, scale}) {
        let canvas = document.createElement('canvas');
        canvas.width = width / scale;
        canvas.height = height / scale;
        return canvas;
    }
    _loadContentScript() {
        return new Promise((resolve, reject) => {
            chrome.tabs.executeScript(this.tab.id, {
                'code': `(${contentScript.toString()})(${this.tab.id});`
            }, () => resolve());
        });
    }
    _connect({port}) {
        return new Promise((resolve, reject) => {
            let onMessage = ({type, contentFullSize, maxIndexSize, devicePixelRatio}) => {
                if (type !== 'Initialized') {
                    return;
                }
                port.onMessage.removeListener(onMessage);
                resolve({contentFullSize, maxIndexSize, devicePixelRatio});
            }
            port.onMessage.addListener(onMessage);
        });
    }
    _doScroll({port, index}) {
        return new Promise((resolve, reject) => {
            let onMessage = ({type, top, left}) => {
                if (type !== 'ScrollResult') {
                    return;
                }
                port.onMessage.removeListener(onMessage);
                resolve({top, left});
            }
            port.onMessage.addListener(onMessage);
            port.postMessage({
                'type': 'doScroll',
                index
            })
        });
    }
    _doCapture() {
        let param = {
            'format': 'png',
            'quality': 100
        };
        return new Promise((resolve) => {
            chrome.tabs.captureVisibleTab(null, param, resolve);
        })
    }
    _loadImage(dataURI) {
        return new Promise((resolve) => {
            console.assert(dataURI);
            let image = new Image();
            image.addEventListener('load', () => resolve(image));
            image.src = dataURI;
        })
    }
}

export function contentScript (tabId) {
    class BasePosition {
        constructor({global}) {
            this.global = global;
        }
        save() {
            this.scrollX = this.global.scrollX;
            this.scrollY = this.global.scrollY;
        }
        restore() {
            this.global.scrollTo(this.scrollX, this.scrollY);
        }
    }
    class ContentSize {
        constructor({global, padding = 200}) {
            this.global = global;
            this.padding = padding;
            this.fullWidth = this._getMaxSize('Width');
            this.fullHeight = this._getMaxSize('Height');

            let width = global.innerWidth;
            this.fullWidth = (this.fullWidth <= width + 1) ? width : this.fullWidth;
        }
        getScopes() {
            let windowWidth = this.global.innerWidth;
            let windowHeight = this.global.innerHeight;
            let height = windowHeight - (windowHeight > this.padding ? this.padding : 0);
            let width = windowWidth;
            let heightLength = Math.ceil(this.fullHeight / height);
            let widthLength = Math.ceil(this.fullWidth / width);
            let results = [];
            Array(heightLength).join(',').split(',').forEach((_, heightIndex) => {
                Array(widthLength).join(',').split(',').forEach((_, widthIndex) => {
                    results.push([width * widthIndex, height * heightIndex]);
                });
            });
            return results;
        }
        getFullSize() {
            return {
                'width': this.fullWidth,
                'height': this.fullHeight,
            };
        }
        _getMaxSize(type) {
            let doc = this.global.document;
            return Math.max(
                doc.documentElement[`client${type}`],
                doc.body[`scroll${type}`],
                doc.documentElement[`scroll${type}`],
                doc.body[`offset${type}`],
                doc.documentElement[`offset${type}`]
            );
        }
    }
    class Scroller {
        constructor({global, port}) {
            this.port = port;
            this.global = global;

            this.basePosition = new BasePosition({global});
            this.basePosition.save();

            let contentSize = new ContentSize({global});
            this.scopes = contentSize.getScopes();
            this.contentFullSize = contentSize.getFullSize();

            this.originalOverflow = this.global.document.documentElement.style.overflow;
        }
        initialize() {
            this.global.document.documentElement.style.overflow = 'hidden';
        }
        doScroll(index) {
            let scope = this.scopes[index];
            if (!scope) {
                return;
            }
            this.global.scrollTo(scope[0], scope[1]);
            return scope;
        }
        getContentFullSize() {
            let {width, height} = this.contentFullSize;
            console.assert(Number.isSafeInteger(width));
            console.assert(Number.isSafeInteger(height));
            return {width, height};
        }
        getScopeSize() {
            let length = this.scopes.length;
            console.assert(Number.isSafeInteger(length));
            return length;
        }
        destroy() {
            this.global.document.documentElement.style.overflow = this.originalOverflow;
            this.basePosition.restore();
        }
    }

    let global = getGlobal();
    if (global.hasScreenCapturePage) {
        return;
    }
    chrome.runtime.onConnect.addListener(onConnect);

    function onConnect (port) {
        if (port.name !== `scroller_${tabId}`) {
            return;
        }
        let scroller = new Scroller({global, port});
        scroller.initialize();
        port.onMessage.addListener(({type, index}) => {
            console.assert(type === 'doScroll');
            let result = scroller.doScroll(index);
            console.assert(Array.isArray(result));
            port.postMessage({
                'type': 'ScrollResult',
                'left': result[0],
                'top': result[1]
            });
        });
        port.postMessage({
            'type': 'Initialized',
            'contentFullSize': scroller.getContentFullSize(),
            'maxIndexSize': scroller.getScopeSize(),
            'devicePixelRatio': global.devicePixelRatio || 1
        });
        port.onDisconnect(() => scroller.destroy());
    }

    function getGlobal () {
        return (
              "undefined" !== typeof window ? window
            : "undefined" !== typeof global ? global
            : "undefined" !== typeof self ? self
            : {}
        );
    }

    return {
        getGlobal,
        onConnect,
        Scroller,
        ContentSize,
        BasePosition
    };
}