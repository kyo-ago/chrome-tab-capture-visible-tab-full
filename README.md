chrome.tab.captureVisibleTab full
=======

Get the full size capture at chrome.tabs.captureVisibleTab.

Usage
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
