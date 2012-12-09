(function() {

	$(document).ready(function() {

		$("#funkyPlayer").css("background", 'url(' + Spank.genericAlbumArt + ')');

		$(document).one("login", function() {
			Spank.base = {};
			Spank.base.url = 'https://wild.firebaseio.com/spank/users/' + FBUserInfo.username;
			Spank.base.history = new Firebase(Spank.base.url + "/history");
			Spank.base.history.on('value', function(snapshot) {
				console.warn("Firebase HISTORY New data");
				var newHistory = snapshot.val();
//				Spank.history.stream([]);
				Spank.history.stream(newHistory);
			});
			$(document).trigger("loadPlaylists");
		});

		Spank.history = (function() {
			var self = {},
				utils = {
					deleteDuplicate: function(o, array) {
						var i = array.length;
						while (i--) {
							var item = array[i];
							if (item.url===o.url || ($.trim(item.title.toLowerCase())=== $.trim(o.title.toLowerCase()) && $.trim(item.artist.toLowerCase())=== $.trim(o.artist.toLowerCase()))) {
								array.splice(i,1);
							}
						}
					}

				};
			self.stream = ko.observableArray([]);
			self.saveHistory = function(o) {
				// E.g. the user moved an item
				if (typeof(o)!=='undefined' && ('item' in o) && ('sourceIndex' in o) && ('targetIndex' in o)) {
					Spank.base.history.transaction(function(currentData) {
						return self.stream();
					});
				}
			};
			self.prependToHistory = function(o, playNow) {
				if (JSON.stringify(o)===JSON.stringify(Spank.player.lastPlayedObject)) {
					return false;
				}
				Spank.base.history.transaction(function update(currentData) {
					if (currentData===null) {
						return [o];
					}
					utils.deleteDuplicate(o, currentData);
					currentData.unshift(o);
					return currentData;
				}, function onComplete(newData) {
					console.warn("Firebase HISTORY updated");
				});
				if (playNow) {
					Spank.player.playObject(o, 0);
					threeSixtyPlayer.config.jumpToTop = false;
				} else {
					threeSixtyPlayer.config.jumpToTop = true;
				}
			};
			self.deleteHistoryItem = function(o, event) {
				$(event.target).parent().animate({"left": "-=500px"}, 500, function() {
					if (Spank.player.lastPlayedObject===o) {
						Spank.player.suspendLoopAndTrigger(function() {
							$(document).trigger('fatManFinish');
						});
					}
					Spank.base.history.transaction(function update(currentData) {
						utils.deleteDuplicate(o, currentData);
						return currentData;
					}, function onComplete(newData) {
						console.warn("HISTORY Saved!");
					});
				});
			};
			self.playHistoryItem = function(o, event) { // When clicking a History item, push it to the top and play it
				if (Spank.history.stream.indexOf(o)>1) {
					$(event.target).parent().parent().animate({"top": "-=1000px", "opacity":"0.0"}, 500, function() {
						self.prependToHistory(o, true);
					});
				} else {
					self.prependToHistory(o, true);
				}
			};
			self.downloadHistoryItem = function(o, event) {
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
			Spank.history.saveHistory();
		});

	});

})();









