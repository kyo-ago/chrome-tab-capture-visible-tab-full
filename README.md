chrome.tab.captureVisibleTab full
=======

You can take the full size capture at CaptureVisibleTab.

Usase
-------

	var captureVisibleTabFull = new CaptureVisibleTabFull(tab);
	captureVisibleTabFull.capture().then(function (canvas) {
		canvas.toDataURL();
	});

License
-------

MIT License

See also
-------

[mrcoles/full-page-screen-capture-chrome-extension](https://github.com/mrcoles/full-page-screen-capture-chrome-extension)