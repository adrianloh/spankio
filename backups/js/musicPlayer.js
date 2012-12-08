(function(global) {

	$(document).ready(function () {

		$(".playModeButtons").click(function() {
			var attr = $(this).attr("src").match(/\/css\/(.+)_on/)[1];
			threeSixtyPlayer.config[attr] = !threeSixtyPlayer.config[attr];
			playerControlModel[attr](threeSixtyPlayer.config[attr]);
			localStorage[attr] = threeSixtyPlayer.config[attr];
		});

		var playerControlModel = {
			random:ko.observable(),
			loop:ko.observable(),
			shuffle:ko.observable()
		};

		$.each(['loop','shuffle'], function(i,a) {
			playerControlModel[a].subscribe(function(v) {
				var p = v ?	"brightness(0)" : "grayscale(1)",
					s = "#@_button".replace("@",a);
				$(s).css("webkitFilter",p);
			});
		});

		ko.applyBindings(playerControlModel, document.getElementById('spank-player-controls'));

		// Recall the previous saved state of the Loop and Shuffle buttons
		$.each(['loop','shuffle'], function(i,a) {
			if (typeof(localStorage[a])!=='undefined' && localStorage[a]==='true') {
				$('#'+a+"_button").trigger("click");
			}
		});

		// The logic of what to do next once a song finishes playing
		$(document).bind('fatManFinish', function(e,data) {
			var underlyingArray = Spank.history.stream(),
				next_play_index;
			if (threeSixtyPlayer.config.loop) {
				next_play_index = -1;
				// Do nothing because loop is built into 360 Player
			} else if (threeSixtyPlayer.config.shuffle && underlyingArray.length > 1) {
				next_play_index = Spank.utils.randrange(0, underlyingArray.length-1);
			} else if (underlyingArray.length > 1) {
				var next_index = underlyingArray.indexOf(Spank.player.lastPlayedObject)+1;
				next_play_index = next_index < underlyingArray.length && next_index || 0;
			} else if (threeSixtyPlayer.config.loop===false) {
				$("#loop_button").trigger("click");
				next_play_index = 0;
			}
			if (next_play_index>=0) {
				Spank.player.playObject(underlyingArray[next_play_index]);
			}
		});

		$(document).bind('fatManPlay', function(e,data) {
			//console.log("Song started...");
			//console.log(data);
		});


	});

}(window));