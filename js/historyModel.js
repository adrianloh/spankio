(function() {

	$(document).ready(function() {

		$("#funkyPlayer").css("background", 'url(' + Spank.genericAlbumArt + ')');

		$(document).one("login", function() {
			var firebaseOKName = Spank.utils.toFirebaseName(FBUserInfo.username); // Illegal characters for Firebase urls
			Spank.base.users = 'https://wild.firebaseio.com/spank/users/';
			Spank.base.url = Spank.base.users + firebaseOKName;
			Spank.base.history = new Firebase(Spank.base.url + "/history");
			$(document).trigger("baseReady");
			Spank.base.history.on('value', function(snapshot) {
				console.warn("Firebase HISTORY PULL");
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
					Spank.base.history.off('value');
					Spank.base.history.on('child_changed', addNewHistoryItem);
					Spank.base.history.on('child_added', addNewHistoryItem);
					Spank.base.history.on('child_removed', function(snapshot) {
						Spank.history.stream.pop();
					})
				} else {
					console.error(snapshot.val());
				}
			});

			var addNewHistoryItem = function(snapshot) {
				var o = snapshot.val();
				if (o!==null) {
					var atHistoryIndex = parseInt(snapshot.name()),
						koo = {};
					$.each(o, function(k,v) {
						koo[k] = ko.observable(v);
					});
					Spank.history.stream()[atHistoryIndex] = koo;
					Spank.history.stream.valueHasMutated();
					Spank.history.highlightPlayingSong();
				} else {
					console.error(o);
				}
			};

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
			self.findWithUrl = function(url) {
				return ko.utils.arrayFirst(self.stream(), function(o) { return o.url()===url })
			};
			self.highlightPlayingSong = function() {
				setTimeout(function() {
					var playingNow = threeSixtyPlayer.lastSound!==null ? !threeSixtyPlayer.lastSound.paused : false;
					if (playingNow) {
						//console.log("Last sound: " + threeSixtyPlayer.lastSound.url);
						var tweetDownloadLink = $(".tweetDownloadLink[href='#']".replace('#', threeSixtyPlayer.lastSound.url));
						if (tweetDownloadLink.length>0) {
							var tweetItem = tweetDownloadLink.parent();
							$(".tweetPlay").removeClass("tweetPlay");
							tweetItem.removeClass("tweetStop").addClass("tweetPlay");
						}
					}
				},10);
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
				// WARNING! Only KO observables allowed pass this point!!!
				if (koo===Spank.player.lastPlayedObject) {
					return false;
				}
				Spank.base.history.transaction(function update(currentData) {
						var o = ko.toJS(koo);                               //// Back to Vanilla Jane objects
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
					Spank.player.playObject(ko.toJS(koo));                      //// Back to Vanilla Jane objects
					threeSixtyPlayer.config.jumpToTop = false;
				} else {
					threeSixtyPlayer.config.jumpToTop = true;
				}
			};
			self.deleteHistoryItem = function(koo, event) {
				// When you click on the red 'minus' icon
				$(event.target).parent().animate({"left": "-=500px"}, 500, function() {
					if (Spank.player.lastPlayedObject!==null && Spank.player.lastPlayedObject.url===koo.url()) {
						Spank.player.suspendLoopAndTrigger(function() {
							$(document).trigger('fatManFinish');
						});
					}
					Spank.base.history.transaction(function update(currentData) {
						currentData = utils.deleteFromArray(ko.toJS(koo), currentData);
						return currentData;
					}, function onComplete(ok) {
						console.warn("Firebase HISTORY DELETE");
					});
				});
			};
			self.playHistoryItem = function(koo, event) { // When clicking a History item, push it to the top and play it
				if (Spank.history.stream.indexOf(koo)>1) {
					$(event.target).parent().parent().animate({"top": "-=1000px"}, 500, function() {
						self.prependToHistory(koo, true);
					});
				} else {
					self.prependToHistory(koo, true);
				}
				if ($("#history-filter").val()!=='Filter stream') {
					$("#history-filter").trigger("blur");
				}
			};
			self.downloadHistoryItem = function(koo, event) {
				$('<iframe width="0" height="0" frameborder="0" src="@"></iframe>'.replace("@", koo.direct())).appendTo("body");
				setTimeout(function(){
					$("iframe").remove();
				},60000);
			};

			//// Keep this around...
			self.isThisAGift = function(data) {
				return true;
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









