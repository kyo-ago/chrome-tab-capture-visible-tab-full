import assert from 'power-assert';
import CaptureVisibleTabFull from '../src/index';

describe('captureVisibleTabFull', () => {
    let dummyTab = {
        'tab': {
            'id': 1
        }
    };
    let captureVisibleTabFull = new CaptureVisibleTabFull();

    it('capture', () => {
        let result = captureVisibleTabFull.capture({
            'tab': dummyTab
        });
        assert(result instanceof Promise);
    });

    it('execute', () => {
        let code = captureVisibleTabFull._getContentScriptCode();
        try {
            eval(code);
            assert(true);
        } catch (e) {
            assert(e.message === 'chrome is not defined');
        }
    });
});
