import Promise from 'bluebird';

export default class captureVisibleTabFull {
    constructor({tab}) {
        this.tab = tab;
    }
    async capture() {
        await this._loadContentScript();
        let {contentFullSize, maxIndexSize, devicePixelRatio} = await this._sendMessage({'type': 'ready'});
        let canvas = this._makeCanvas({contentFullSize, devicePixelRatio});
        let context = canvas.getContext('2d');
        await Array(maxIndexSize).join(',').split(',').reduce((base, _, index) => {
            let position = {};
            return base.then(() => {
                return this._sendMessage({'type': 'doScroll', index});
            }).then(({top, left}) => {
                position = {top, left};
                return this._sleep(150);
            }).then(() => {
                return this._doCapture();
            }).then((dataURI) => {
                return this._drawImage({context, dataURI, left: position['left'], top: position['top']});
            });
        }, Promise.resolve());
        await this._sendMessage({'type': 'done'});
        return canvas;
    }
    _sendMessage(message) {
        return new Promise((resolve, reject) => {
            chrome.tabs.executeScript(this.tab.id, {
                'code': 'onMessage(' + JSON.stringify(message) + ');'
            }, (result) => resolve(result[0]));
        });
    }
    _makeCanvas({contentFullSize, devicePixelRatio}) {
        let canvas = document.createElement('canvas');
        canvas.width = Math.ceil(contentFullSize.width / devicePixelRatio);
        canvas.height = Math.ceil(contentFullSize.height / devicePixelRatio);
        return canvas;
    }
    _loadContentScript() {
        let code = contentScript.toString().replace(/^function\s+[\w\$]+\s*\(\)\s*\{([\s\S]+)\}$/, '$1')
        return new Promise((resolve, reject) => {
            chrome.tabs.executeScript(this.tab.id, { code }, () => resolve());
        });
    }
    _doCapture() {
        return new Promise((resolve) => {
            let param = {
                'format': 'png',
                'quality': 100
            };
            chrome.tabs.captureVisibleTab(null, param, resolve);
        })
    }
    _sleep(msec) {
        return new Promise((resolve) => setTimeout(resolve, msec));
    }
    _drawImage({context, dataURI, left, top}) {
        return new Promise((resolve) => {
            console.assert('string' === typeof dataURI);
            let image = new Image();
            image.addEventListener('load', () => {
                context.drawImage(image, left, top);
                resolve();
            });
            image.src = dataURI;
        })
    }
}

function contentScript () {
    var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

    var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

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
        constructor({global}) {
            this.global = global;

            this.basePosition = new BasePosition({global});
            this.basePosition.save();

            let contentSize = new ContentSize({global});
            this.scopes = contentSize.getScopes();
            this.contentFullSize = contentSize.getFullSize();

            this.originalOverflow = this.global.document.documentElement.style.overflow;
        }
        doScroll(index) {
            let scope = this.scopes[index];
            if (!scope) {
                return;
            }
            this.global.document.documentElement.style.overflow = this.originalOverflow;
            this.global.scrollTo(scope[0], scope[1]);
            this.global.document.documentElement.style.overflow = 'hidden';
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

    let global = (
          "undefined" !== typeof window ? window
        : "undefined" !== typeof global ? global
        : "undefined" !== typeof self ? self
        : {}
    );
    let TypeCommands = {
        'context': {},
        ready({request}) {
            this.context = {};
            this.context.scroller = new Scroller({global});
            return {
                'type': 'Initialized',
                'contentFullSize': this.context.scroller.getContentFullSize(),
                'maxIndexSize': this.context.scroller.getScopeSize(),
                'devicePixelRatio': global.devicePixelRatio || 1
            };
        },
        doScroll({request}) {
            let {index} = request;
            let result = this.context.scroller.doScroll(index);
            console.assert(Array.isArray(result));
            return {
                'type': 'ScrollResult',
                'left': result[0],
                'top': result[1]
            };
        },
        done({request}) {
            this.context.scroller.destroy();
            this.context = {};
        }
    };

    function onMessage (request) {
        let type = request['type'];
        if (TypeCommands[type]) {
            return TypeCommands[type]({request});
        }
    }
}