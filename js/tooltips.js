(function() {

	$(document).ready(function() {

		$.extend(Tipped.Skins, {
			'controlButtons' : {
				border: { size: 3, color: '#959fa9' },
				background: '#f7f7f7',
				radius: { size: 4, position: 'border' },
				shadow: false,
				closeButtonSkin: 'light'
			}
		});

		$.extend(Tipped.Skins, {
			'dropTip' : {
				border: { size: 3, color: '#959fa9' },
				radius: { size: 4, position: 'border' },
				shadow: {
					blur: 10,
					color: '#000',
					offset: { x: -3, y: 5 },
					opacity: .15
				},
				closeButtonSkin: 'light'
			}
		});

		Tipped.create(".playModeButtons", {
			skin:'controlButtons'
		});

		Tipped.create(".ui360", {
			skin:'controlButtons',
			target: '.sm2-360btn',
			hook: 'leftmiddle'
		});

		Tipped.create("#searchField", "Drop here to find more songs by this artist", {
			skin:'dropTip',
			showOn:false,
			hook: 'bottommiddle'
		});

		Tipped.create("#playlistScroller", function(element) {
			if (!Spank.charts.currentPlaylistTitle) {
				return "Drop on a playlist thumbnail to add to it";
			} else {
				return "Drop to other playlists to add to them";
			}
		},{
			skin:'dropTip',
			showOn:false,
			offset: { x: 100, y: 0 },
			hook: 'topleft'
		});

		Tipped.create("#resultsSection", "Drop here to find similar songs", {
			skin:'dropTip',
			showOn:false,
			offset: { x: 300, y: 0 },
			hook: 'leftmiddle'
		});

	});

})();