import assert from 'power-assert';
import CaptureVisibleTabFull from '../src/index';

describe('captureVisibleTabFull', () => {
    let dummyTab = {
        'tab': {
            'id': 1
        }
    };
    let captureVisibleTabFull = new CaptureVisibleTabFull(dummyTab);

    it('capture', () => {
        captureVisibleTabFull.capture();
    });
});