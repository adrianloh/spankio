(function() {

	$(document).ready(function() {

		// !!! DOESN'T WORK! Event is not fired!
		$(".tweetDetails").hover(function mousein() {
			$(this).parent().find(".tweetDelete").css("display","block");
		}, function mouseout() {
			$(this).parent().find(".tweetDelete").css("display","none");
		});

		Spank.history = (function() {
			var self = this;
			self.stream = ko.observableArray([]);
			self.prependToHistory = function (o, playNow) {
				var underlyingArray = self.stream();
				var i = underlyingArray.length;
				while (i--) {
					var item = underlyingArray[i];
					if (item.url===o.url || ($.trim(item.title.toLowerCase())=== $.trim(o.title.toLowerCase()) && $.trim(item.artist.toLowerCase())=== $.trim(o.artist.toLowerCase()))) {
						underlyingArray.splice(i,1);
					}
				}
				underlyingArray.unshift(o);
				self.stream.valueHasMutated();
				if (playNow) {
					Spank.player.playObject(o, 0);
				}
			};
			self.playHistoryItem = function(o,event) {
				// Push the clicked History item to the top and play it
				if (Spank.history.stream.indexOf(o)>1) {
					$(event.target).parent().parent().animate({"top": "-=1000px", "opacity":"0.0"}, 500, function() {
						self.prependToHistory(o, true);
					});
				} else {
					self.prependToHistory(o, true);
				}
			};
			self.deleteHistoryItem = function(o,event) {
				$(event.target).parent().animate({"left": "-=500px"}, 500, function() {
					if (Spank.player.lastPlayedObject===o) {
						$(document).trigger('fatManFinish');
					}
					self.stream.remove(o);
				});
			};
			return this;
		})();

		ko.applyBindings(Spank.history, document.getElementById('playHistory'));

		var loadSavedHistoryFromParse = function(callbackWithResults, callbackNoResults) {
			var userData = new UserData();
			var query = new Parse.Query(UserData);
			query.equalTo("username", FBUserInfo.username);
			query.find({
				success: function(results) {
					if (results.length>0) {
						Spank.userData = results[0];
						callbackWithResults(Spank.userData.get("history"));
					} else {
						callbackNoResults();
						Spank.userData = userData;
					}
				},
				error: function(error) {
					alert("Error: " + error.code + " " + error.message);
				}
			});
		};

		$(document).one('login', function() {
			loadSavedHistoryFromParse(function found(history) {
				// Get history from Parse
				console.log("Loaded history from Parse: " + FBUserInfo.username);
				Spank.history.stream.push.apply(Spank.history.stream, history);
			}, function notfound() {
				// If nothing was returned from Parse (this user is not saved there yet),
				// then load the history from Redis
				$.getJSON('/playlist/' + encodeURIComponent(FBUserInfo.username + " PLAYLIST Main Library"), function(tracklist) {
					console.log("Loaded history from Redis: " + FBUserInfo.username);
					console.log(tracklist);
					if (tracklist.length>0) {
						Spank.history.stream.push.apply(Spank.history.stream, tracklist);
					}
				});
			});
		});

		var firstload = true;
		Spank.history.stream.subscribe(function saveHistory() {
			if (firstload) {    // The first time we load history, don't save it
				firstload = false;
				return true;
			}
			// Save the history list to Parse
			Spank.userData.save({username: FBUserInfo.username, history: Spank.history.stream()}, {
				success: function(o) {
					console.log("Saved history to Parse!");
				}
			});
			// Save the history list to Redis
		});

	});

})();









