soundManager.setup({
	// path to directory containing SM2 SWF
	url:'./360_files/swf/',
	defaultOptions: {
		volume: 33
	}
});

// threeSixtyPlayer = new ThreeSixtyPlayer();
// threeSixtyPlayer.config.useAmplifier = false;
threeSixtyPlayer.config.playNext = true;
threeSixtyPlayer.config.scaleFont = (navigator.userAgent.match(/msie/i)?false:true);
threeSixtyPlayer.config.showHMSTime = false;

// enable some spectrum stuffs

threeSixtyPlayer.config.useWaveformData = true;
threeSixtyPlayer.config.useEQData = true;
threeSixtyPlayer.config.playNext = true;

// enable this in SM2 as well, as needed

if (threeSixtyPlayer.config.useWaveformData) {
	soundManager.flash9Options.useWaveformData = true;
}
if (threeSixtyPlayer.config.useEQData) {
	soundManager.flash9Options.useEQData = true;
}
if (threeSixtyPlayer.config.usePeakData) {
	soundManager.flash9Options.usePeakData = true;
}

if (threeSixtyPlayer.config.useWaveformData || threeSixtyPlayer.flash9Options.useEQData || threeSixtyPlayer.flash9Options.usePeakData) {
	// even if HTML5 supports MP3, prefer flash so the visualization features can be used.
	soundManager.preferFlash = true;
}

//soundManager.onready(function () {
//	threeSixtyPlayer.init("fatManLink");
//});