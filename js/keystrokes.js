/*global document, window, Spank */

$(document).ready(function(){

	var keys = {
			arrow_right: 39,
			arrow_left: 37,
			spacebar: 32,
			enter: 13,
			del: 46,
			backspace: 81112, // Don't intercept backspace, too risky
			alpha_o: 79,
			alpha_p: 80,
			alpha_q: 81,
			alpha_i: 73,
			pageUp: 33,
			pageDown: 34,
			end: 35,
			home: 36,
			arrow_up: 38,
			arrow_down: 40,
			tilde: 192,
			esc: 27
		},
		boundKeys = $.map(keys, function(o) { return o; });

	$(document).keydown(function(e) {

		if ($(document.activeElement)[0].tagName.toLowerCase()!=='input' && boundKeys.indexOf(e.keyCode)>=0) {
			switch (e.keyCode)
			{
				case keys.arrow_right:    // Next song
					Spank.player.suspendLoopAndTrigger(function() {
						$(document).trigger('fatManFinish');
					});
					break;
				case keys.spacebar:     // Toggle play/pause
					e.preventDefault();
					if (threeSixtyPlayer.lastSound===null) {
						Spank.player.suspendLoopAndTrigger(function() {
							$(document).trigger('fatManFinish');
						});
					} else {
						$(".sm2-360btn").trigger('click');
					}
					break;
				case keys.arrow_left:     // Previous song
					Spank.player.goToPrevTrack();
					break;
				case keys.del:          // Delete currently playing track from stream and go to next song
					Spank.player.suspendLoopAndTrigger(function() {
						$(".tweetPlay").find(".tweetDelete").trigger("click");
					});
					break;
				case keys.alpha_q:      // Open/hide friends list
					$("#friends_button").trigger("click");
					break;
				case keys.alpha_o:      // Toggle loop mode
					$("#loop_button").trigger("click");
					break;
				case keys.alpha_p:      // Toggle shuffle mode
					$("#shuffle_button").trigger("click");
					break;
				case keys.enter:        // Shuffle results list
					$("#searchField").data('livesearch').DoSearch();
					break;
				case keys.home:
					Spank.history.getHead();
					break;
				case keys.tilde:
					Spank.history.showCurrentlyPlayingTrack();
					break;
				case keys.end:
					Spank.history.showCurrentlyPlayingTrack();
					break;
				case keys.pageUp:       // Prev page of stream
					Spank.history.goPrevPage();
					break;
				case keys.arrow_up:
					Spank.history.goPrevPage();
					break;
				case keys.pageDown:     // Next page of stream
					Spank.history.goNextPage();
					break;
				case keys.arrow_down:
					Spank.history.goNextPage();
					break;
			}

			return;

		}

	});

});
