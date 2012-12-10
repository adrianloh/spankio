(function() {

	$(document).ready(function() {

		$("#funkyPlayer").css("background", 'url(' + Spank.genericAlbumArt + ')');

		$(document).one("login", function() {
			Spank.base.url = 'https://wild.firebaseio.com/spank/users/' + FBUserInfo.username;
			Spank.base.history = new Firebase(Spank.base.url + "/history");
			Spank.base.history.on('value', function(snapshot) {
				console.warn("Firebase HISTORY PULL");
				var newHistory = snapshot.val();
				if (Array.isArray(newHistory) && newHistory.length>0) {
////				Spank.history.stream([]);
					Spank.history.stream(newHistory);
				} else {
					console.error(snapshot.val());
				}
			});
			$(document).trigger("baseReady");
		});

		Spank.history = (function() {
			var self = {},
				utils = {
					deleteFromArray: function(o, array) {
						var newArray = $.map(array, function(item){
							if (item.url===o.url || ($.trim(item.title.toLowerCase())=== $.trim(o.title.toLowerCase()) && $.trim(item.artist.toLowerCase())=== $.trim(o.artist.toLowerCase()))) {
								// pass
							} else {
								return item
							}
						});
						if (Array.isArray(newArray)) {
							return newArray
						} else {
							return undefined;
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
							// currentData is null if history is empty
							return [o];
						} else if (Array.isArray(currentData)) {
							// normal. Check to make sure we're getting an array
							currentData = utils.deleteFromArray(o, currentData);
							if (Array.isArray(currentData)) {
								currentData.unshift(o);
							}
							return currentData;
						} else {
							// Abort the transaction
							console.error("ERROR: Did not get an array from history.transaction");
							console.error(currentData);
							return undefined;
						}
					}, function onComplete(ok) {
						//console.warn("Firebase HISTORY PUSHED");
					});
				if (playNow) {
					var config = {jumpToTop:false},
						data = {track:o, playerconfig:config, position:0};
					//Spank.base.playnow.set(data);
					Spank.player.playObject(o);
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
						currentData = utils.deleteFromArray(o, currentData);
						return currentData;
					}, function onComplete(newData) {
						console.warn("Firebase HISTORY DELETE");
					});
				});
			};
			self.playHistoryItem = function(o, event) { // When clicking a History item, push it to the top and play it
				if (Spank.history.stream.indexOf(o)>1) {
					$(event.target).parent().parent().animate({"top": "-=1000px"}, 500, function() {
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









