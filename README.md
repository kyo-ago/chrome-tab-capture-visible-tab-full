chrome.tab.captureVisibleTab full
=======

[![Greenkeeper badge](https://badges.greenkeeper.io/kyo-ago/chrome-tab-capture-visible-tab-full.svg)](https://greenkeeper.io/)

Get the full size capture at chrome.tabs.captureVisibleTab.

Usase
-------

	require('babel-core/polyfill');
	var captureVisibleTabFull = new CaptureVisibleTabFull();
	captureVisibleTabFull.capture({tab}).then(function (canvas) {
		canvas.toDataURL();
	});

License
-------

MIT License

See also
-------

[chrome.tabs - Google Chrome](https://developer.chrome.com/extensions/tabs#method-captureVisibleTab)

[mrcoles/full-page-screen-capture-chrome-extension](https://github.com/mrcoles/full-page-screen-capture-chrome-extension)
