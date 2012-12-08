(function() {

	$(document).ready(function() {

		$("#funkyPlayer").css("background", 'url(' + Spank.genericAlbumArt + ')');

		$(document).one('login', function() {
			loadSavedHistoryFromParse(function found() {
				// Get history from Parse
				console.log("Loaded history from Parse: " + FBUserInfo.username);
				Spank.history.stream.push.apply(Spank.history.stream, Spank.userData.history);
				$(document).trigger("userDataLoaded")
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

		Spank.history = (function() {
			var self = {};
			self.stream = ko.observableArray([]);
			self.prependToHistory = function (o, playNow) {
				if (JSON.stringify(o)===JSON.stringify(Spank.player.lastPlayedObject)) {
					return false;
				}
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
					threeSixtyPlayer.config.jumpToTop = false;
				} else {
					threeSixtyPlayer.config.jumpToTop = true;
				}
			};
			self.playHistoryItem = function(o,event) { // When clicking a History item, push it to the top and play it
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
						Spank.player.suspendLoopAndTrigger(function() {
							$(document).trigger('fatManFinish');
						});
					}
					self.stream.remove(o);
				});
			};
			self.downloadHistoryItem = function(o,event) {
				$('<iframe width="0" height="0" frameborder="0" src="@"></iframe>'.replace("@", o.direct)).appendTo("body");
				setTimeout(function(){
					$("iframe").remove();
				},60000);
			};
			return self;
		})();

		ko.applyBindings(Spank.history, document.getElementById('playHistory'));

		var firstload = true;
		Spank.history.stream.subscribe(function saveHistory() {
			if (firstload) {    // The first time we load history, don't save it
				firstload = false;
				return true;
			}
			if (typeof(FBUserInfo)!=='undefined') {
				Spank.userData.save({history: Spank.history.stream()}, {
					success: function(o) {
						console.log("Saved history to Parse!");
					}
				});
			} else {
				// Ignore
			}
		});

		var loadSavedHistoryFromParse = function(callbackWithResults, callbackNoResults) {
			var userData = new UserData();
			var query = new Parse.Query(UserData);
			query.equalTo("username", FBUserInfo.username);
			query.first({
				success: function(result) {
					if (result) {
						Spank.userData = result;
						Spank.userData.history = Spank.userData.get("history");
						callbackWithResults();
					} else {
						callbackNoResults();
						Spank.userData = userData;
						Spank.userData.history = [];
					}
				},
				error: function(error) {
					$(".droppablePlaylist").remove();
					Spank.userData = {};
					Spank.userData.save = function() {
						return false;
					};
					alert("BIG PROBLEM ON OUR END! You can continue but nothing will be saved. Shame...");
					//alert("Error: " + error.code + " " + error.message);
				}
			});
		};

	});

})();









