(function() {

	$(document).ready(function() {

		$(document).one("login", function() {

			Spank.username = Spank.utils.toFirebaseName(FBUserInfo.username);
			Spank.base.users = new Firebase('https://wild.firebaseio.com/spank/users');
			Spank.base.me = Spank.base.users.child(Spank.username);
			Spank.base.history = Spank.base.me.child("history");
			$(document).trigger("baseReady");
			var firstPass = true;
			var ignoreInitial = 0;
			function assemble(snapshot) {
				var newHistory = snapshot.val();
				if (Array.isArray(newHistory) && newHistory.length>0) {
					if (firstPass) {
						firstPass = false;
						var tracks = $.map(newHistory, function(o) {
							if (typeof(o)==='object') return o;
						});
						if (tracks.length===newHistory.length) {
							assemble(snapshot);
						} else {
							Spank.base.history.set(tracks);
						}
					} else {
						var koHistory = $.map(newHistory, function(o) {
							var koo = {};
							$.each(o, function(k,v) {
								koo[k] = ko.observable(v);
							});
							return koo;
						});
						koHistory.reverse();
						ignoreInitial = koHistory.length;
						Spank.history.stream(koHistory);
//						Spank.history.stream(koHistory.slice(0,20));
//						setTimeout(function() {
//							Spank.history.stream.push.apply(Spank.history.stream, koHistory.slice(20));
							start();
//						}, 250);
					}
				} else {
					start();
				}
			}

			Spank.base.history.on("value", assemble);
			var start = function() {
				Spank.base.history.off('value', assemble);
				$("#history-stream-list-container").css("background-image","none");
				setTimeout(function() {
                    window.notify.suspended = false;
					window.notify.information("Go!");
				}, 2000);
				Spank.base.history.on('child_changed', updateHistoryItem);
				Spank.base.history.on('child_added', updateHistoryItem);
				Spank.base.history.on('child_removed', function(snapshot) {
					// Fix for an off-by-one error everytime we remove
					// something from the history list
					Spank.history.stream.shift();
				});
			};

			var current = 0;
			var updateHistoryItem = function(snapshot) {
				++current;
				if (current<=ignoreInitial) return;
				var o = snapshot.val();
				if (o!==null) {
					var atHistoryIndex = Spank.history.stream().length-1-parseInt(snapshot.name(),10),
						koo = {};
					if (typeof(o)==='object') {
						$.each(o, function(k,v) {
							koo[k] = ko.observable(v);
						});
					} else {
						koo = o;
					}
					if (atHistoryIndex<0) {
						Spank.history.stream().unshift(koo);
					} else {
						Spank.history.stream()[atHistoryIndex] = koo;
					}
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

			var similarArtistAndTitle = function(o1, o2) {
				var strip = $.trim,
					o1_artist = strip(o1.artist.toLowerCase()),
					o2_artist = strip(o2.artist.toLowerCase()),
					o1_title = strip(o1.title.toLowerCase()),
					o2_title = strip(o2.title.toLowerCase());
				return o1_artist===o2_artist && o1_title===o2_title;
			};

			var isTheSameGift = function(gift, o) {
				if (o.gift===undefined) {
					return false;
				} else {
					return (similarArtistAndTitle(o, gift)
						&& o.gift.from===gift.gift.from
						&& o.gift.message===gift.gift.message);
				}
			};

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
						if (typeof(item)!=='object') return item;
						if (item.url===o.url || similarArtistAndTitle(o, item)) {
							if ('gift' in item) {
								return item;
							} else {
								return "nicegapbaby"
							}
						} else {
							return item;
						}
					});
				}
				if (Array.isArray(newArray)) {
					if (add===true) newArray.push(o);
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
					try {
						return o.url()===url;
					} catch(err) {
						return false;
					}
				});
			};

			self.saveHistory = function(moveEvent) {
				// E.g. the user moved an item
				if (moveEvent===true || (typeof(moveEvent)!=='undefined' && ('item' in moveEvent) && ('sourceIndex' in moveEvent) && ('targetIndex' in moveEvent))) {
					Spank.base.history.transaction(function(currentData) {
						var currentStream = ko.toJS(self.stream);
						currentStream.reverse();
						return currentStream;                            //// Back to Vanilla Jane objects
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

			self.batchItems = ko.observableArray([]);

			self.getCheckedKoos = function() {
				var found = 0,
					i = self.stream().length,
					selectedItems = [];
				if (!self.batchItems().length>0) {
					window.notify.error("Nothing selected in stream");
					return selectedItems;
				}
				while (i--) {
					if (found===self.batchItems().length) break;
					var koo = self.stream()[i];
					if (koo.hasOwnProperty("url") && self.batchItems.indexOf(koo.url())>=0) {
						selectedItems.push(koo);
						++found;
					}
				}
				return selectedItems;
			};

			self.deleteBatch = function() {
				var selectedItems = self.getCheckedKoos();
				if (selectedItems.length===0) return;
				Spank.base.history.transaction(function update(currentData) {
					var intermediete, invalid = false;
					selectedItems.forEach(function(koo) {
						intermediete = self.transaction_deleteFromHistory(ko.toJS(koo), currentData);
						if (Array.isArray(intermediete)) {
							currentData = intermediete;
						} else {
							invalid = true;
						}
					});
					return invalid ? undefined : currentData;
				}, function onComplete(success, snapshot) {
					if (success) {
						window.notify.success("Deleted " + selectedItems.length + " items from stream");
					}
				});
			};

			self.deleteHistoryItemOnClick = function(koo, event) {
				// When you click on the red 'minus' icon
				var li = $(event.target).parent();
				li.addClass("flyleft");
				setTimeout(function() {
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
				},500);
			};

			self.playHistoryItemOnClick = function(koo, event) { // When clicking a History item, push it to the top and play it
				if (Spank.history.stream.indexOf(koo)>1) {
					var li = $(event.target).parent().parent();
					li.addClass("flyup");
					setTimeout(function(){
						self.prependToHistory(koo, true);
					}, 250);
				} else {
					self.prependToHistory(koo, true);
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

		$("#history-filter-container .icon-check").click(function() {
			if ($("#history-stream-list").hasClass("history-cbox-show") && ($(".tweetcheckbox:checked").length>0)) {
				Spank.history.batchItems([])
			} else {
				$("#history-stream-list").toggleClass("history-cbox-hide history-cbox-show");
			}
		});

		$("#history-filter-container .icon-trash").click(function() {
			Spank.history.deleteBatch();
		});

		var firstload = true;
		Spank.history.stream.subscribe(function saveHistory() {
			firstload = !firstload;
			if (!firstload) return;
			Spank.history.saveHistory();
		});

	});

})();