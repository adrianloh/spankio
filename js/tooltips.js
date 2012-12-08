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

		Tipped.create(".playModeButtons", {
			skin:'controlButtons'
		});

		Tipped.create(".ui360", {
			skin:'controlButtons',
			target: '.sm2-360btn',
			hook: 'leftmiddle'
		});


	});



})();