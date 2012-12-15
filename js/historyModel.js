(function() {

	$(document).ready(function() {

		$("#funkyPlayer").css("background", 'url(' + Spank.genericAlbumArt + ')');

		$(document).one("login", function() {

			var firebaseOKName = Spank.utils.toFirebaseName(FBUserInfo.username);
			Spank.base.users = 'https://wild.firebaseio.com/spank/users/';
			Spank.base.url = Spank.base.users + firebaseOKName;
			Spank.base.history = new Firebase(Spank.base.url + "/history");
			$(document).trigger("baseReady");
			Spank.base.history.once('value', function(snapshot) {
				var newHistory = snapshot.val();
				if (Array.isArray(newHistory) && newHistory.length>0) {
					var koHistory = $.map(newHistory, function(o) {
						var koo = {};
						$.each(o, function(k,v) {
							koo[k] = ko.observable(v);
						});
						return koo;
					});
					Spank.history.stream(koHistory);
					setTimeout(function() {
						window.notify.information("Go!");
					},1000);
					var t2 = setTimeout(function() {
						$(".hideshow-playlist-button").click();
						clearTimeout(t2);
					},1500);
					Spank.base.history.on('child_changed', updateHistoryItem);
					Spank.base.history.on('child_added', updateHistoryItem);
					Spank.base.history.on('child_removed', function(snapshot) {
						// Fix for an off-by-one error everytime we remove
						// something from the history list
						Spank.history.stream.pop();
					});
				} else {
					console.error(snapshot.val());
				}
			});

			var updateHistoryItem = function(snapshot) {
				var o = snapshot.val();
				if (o!==null) {
					var atHistoryIndex = parseInt(snapshot.name(),10),
						koo = {};
					$.each(o, function(k,v) {
						koo[k] = ko.observable(v);
					});
					Spank.history.stream()[atHistoryIndex] = koo;
					Spank.history.stream.valueHasMutated();
					Spank.history.highlightCurrentlyPlayingSong();
				} else {
					console.error(o);
				}
			};

		});

		Spank.history = (function() {
			var self = {};
			self.stream = ko.observableArray([]);

			self.highlightCurrentlyPlayingSong = function() {
				setTimeout(function() {
					$(".tweetItem").removeClass("tweetPlay");
					$(".tweetItem[url='"+ Spank.player.current_ownerid() + "']").addClass("tweetPlay");
				},10)
			};

			function similarArtistAndTitle(o1, o2) {
				var isSimilar = false,
					attr = ['title', 'artist'],
					strip = $.trim;
				$.each(attr, function(i,a) {
					if (strip(o1[a].toLowerCase())===strip(o2[a].toLowerCase())) {
						isSimilar = true;
					}
				});
				return isSimilar;
			}

			function isTheSameGift(gift, o) {
				if (o.gift===undefined) {
					return false;
				} else {
					return (similarArtistAndTitle(o, gift) && o.gift.from===gift.gift.from && o.gift.message===gift.gift.message);
				}
			}

			self.transaction_deleteFromHistory = function(o, array, add) {
				// This is executed within a Firebase transaction, if *anything*
				// goes wrong, we must return undefined so the transaction is aborted.
				var newArray;
				if ('gift' in o) {
					// Note that this branch ONLY happens when we manually delete a gift
					newArray = $.map(array, function(item) {
						if (!isTheSameGift(o, item)) {
							return item;
						} else {
							console.log("Found this gift");
						}
					});
				} else {
					newArray = $.map(array, function(item) {
						if (item.url===o.url || similarArtistAndTitle(o, item)) {
							if ('gift' in item) {
								return item;
							}
							// If any item in History is similar to the one we're deleting
							// do not return this item to the new array e.g. don't save it.
							// e.g. make sure we only keep unique items in history
						} else {
							return item;
						}
					});
				}
				if (Array.isArray(newArray)) {
					if (add===true) {
						newArray.unshift(o);
					}
					return newArray;
				} else {
					return undefined;
				}
			};

			self.transaction_addNewHistoryItemAndMakeUnique = function(o, currentData) {
				return self.transaction_deleteFromHistory(o, currentData, true);
			};

			self.findHistoryItemWithUrl = function(url) {
				return ko.utils.arrayFirst(self.stream(), function(o) {
					return o.url()===url;
				});
			};

			self.saveHistory = function(moveEvent) {
				// E.g. the user moved an item
				if (moveEvent===true || (typeof(moveEvent)!=='undefined' && ('item' in moveEvent) && ('sourceIndex' in moveEvent) && ('targetIndex' in moveEvent))) {
					Spank.base.history.transaction(function(currentData) {
						return ko.toJS(self.stream);                            //// Back to Vanilla Jane objects
					});
				}
			};

			self.prependToHistory = function(xo, playNow) {
				var koo = {},
					stop = false;
				$.each(xo, function(k,v) {
					if (!stop) {
						if (ko.isObservable(v)) {
							koo = xo;
							stop = true;
						} else {
							koo[k] = ko.observable(v);
						}
					}
				});
				if (Spank.player.lastPlayedObject.url===koo.url()) {
					// When user clicks the currently playing song
					return false;
				}
				// WARNING! Only KO observables allowed pass this point!!!
				Spank.base.history.transaction(function update(currentData) {
						var o = ko.toJS(koo);                               //// Back to Vanilla Jane objects
						if (currentData===null) {
							// currentData is null if history is empty
							return [o];
						} else if (Array.isArray(currentData)) {
							return self.transaction_addNewHistoryItemAndMakeUnique(o, currentData);
						} else {
							// Abort the transaction
							console.error("ERROR: Did not get an array from history.transaction");
							console.error(currentData);
							return undefined;
						}
					}, function onComplete(success, snapshot) {
						console.warn("Firebase HISTORY PUSH : " + success);
					});
				if (playNow) {
					Spank.player.playObject(ko.toJS(koo));                      //// Back to Vanilla Jane objects
					threeSixtyPlayer.config.jumpToTop = false;
				} else {
					threeSixtyPlayer.config.jumpToTop = true;
				}
			};

			self.deleteHistoryItemOnClick = function(koo, event) {
				// When you click on the red 'minus' icon
				$(event.target).parent().animate({"left": "-=500px"}, 500, function() {
					// If we're deleting an item that is currently playing, jump to next track
					if (Spank.player.lastPlayedObject.url===koo.url()) {
						Spank.player.suspendLoopAndTrigger(function() {
							$(document).trigger('fatManFinish');
						});
					}
					Spank.base.history.transaction(function update(currentData) {
						return self.transaction_deleteFromHistory(ko.toJS(koo), currentData);
					}, function onComplete(success, snapshot) {
						console.warn("Firebase HISTORY DELETE: " + JSON.stringify(success));
					});
				});
			};

			self.playHistoryItemOnClick = function(koo, event) { // When clicking a History item, push it to the top and play it
				if (Spank.history.stream.indexOf(koo)>1) {
					$(event.target).parent().parent().animate({"top": "-=1000px"}, 500, function() {
						self.prependToHistory(koo, true);
					});
				} else {
					self.prependToHistory(koo, true);
				}
				var historyFilterBox = $("#history-filter");
				if (historyFilterBox.val()!=='Filter stream') {
					historyFilterBox.trigger("blur");
				}
			};

			self.downloadHistoryItemOnClick = function(koo, event) {
				var owner_id = koo.url().split(".")[0],
					url = "https://api.vkontakte.ru/method/audio.getById?audios=" + owner_id + "&access_token=" + VK.getToken() + "&callback=?";
				$.getJSON(url, function getActualVKLink(data) {
					if(data.response && data.response.length>0) {
						var newDirectLink = data.response[0].url;
						koo.direct(newDirectLink);
						$(event.target).parent().click(function() { return false; }).attr("href", newDirectLink);
					}
				});
			};

			return self;

		})();

		ko.applyBindings(Spank.history, document.getElementById('playHistory'));

		var firstload = true;
		Spank.history.stream.subscribe(function saveHistory() {
			firstload = !firstload;
			if (!firstload) return;
			Spank.history.saveHistory();
		});

	});

})();









