(function(){

	$(document).ready(function(){

		var keys = {
			right: 39,
			left: 37,
			spacebar: 32,
			del: 46,
			backspace: 81112, // Don't intercept backspace, too risky
			alpha_o: 79,
			alpha_p: 80,
			alpha_i: 73
			},
			boundKeys = $.map(keys, function(o) { return o; });

		document._userIsTyping = true;
		$(document).keydown(function(e) {

			if (!document._userIsTyping && $(document.activeElement).attr("id")!=='searchField' && $(document.activeElement).attr("id")!=='history-filter' && boundKeys.indexOf(e.keyCode)>=0) {
				switch (e.keyCode)
				{
					case keys.right:    // Next song
						Spank.player.suspendLoopAndTrigger(function() {
							$(document).trigger('fatManFinish');
						});
						break;
					case keys.spacebar: // Toggle play/pause
						if (Spank.player.lastPlayedObject===null && threeSixtyPlayer.config.loop) {
							// The very first time we land and hit spacebar
							threeSixtyPlayer.config.loop = false;
							$(".sm2-360btn").trigger('click');
							setTimeout(function() {
								threeSixtyPlayer.config.loop = true;
							},2000);
						} else {
							$(".sm2-360btn").trigger('click');
						}
						break;
					case keys.left:     // Previous song
						var prevSong = Spank.player.lastLastPlayedObject;
						if (prevSong!==null) {
							Spank.player.playObject(prevSong);
						}
						break;
					case keys.del:   // Delete currently playing track from stream and go to next song
						Spank.player.suspendLoopAndTrigger(function() {
							$(".tweetPlay").find(".tweetDelete").trigger("click");
						});
						break;
					case keys.backspace: // Delete currently playing track from stream and go to next song
						Spank.player.suspendLoopAndTrigger(function() {
							$(".tweetPlay").find(".tweetDelete").trigger("click");
						});
						break;
					case keys.alpha_o:  // Toggle loop mode
						$('.playModeButtons[src="/css/loop_on.png"]').trigger("click");
						break;
					case keys.alpha_p:  // Toggle shuffle mode
						$('.playModeButtons[src="/css/shuffle_on.png"]').trigger("click");
						break;
					case keys.alpha_i:  // Shuffle results list
						$('#random_button').trigger("mousedown").trigger('click');
						setTimeout(function() {
							$('#random_button').trigger("mouseup");
						},250);
						break;
				}

				return false;

			}

		});

	});



})();