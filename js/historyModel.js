/*global $, ko, Spank */

(function() {

	Spank.normalizeMXData = function(mxTrack) {
		var mx = {};
		if (mxTrack.album_name.length>0 && (mxTrack.album_name!==mxTrack.track_name)) mx.album = mxTrack.album_name;
		mx.thumb = mxTrack.album_coverart_350x350 ? mxTrack.album_coverart_350x350 : Spank.genericAlbumArt;
		mx.mxid_track = mxTrack.track_id;
		mx.mxid_artist = mxTrack.artist_id;
		mx.mxid_album = mxTrack.album_id;
		if (mxTrack.track_mbid!==null && mxTrack.track_mbid.length>0) mx.mbid_track = mxTrack.track_mbid;
		if (mxTrack.artist_mbid!==null && mxTrack.artist_mbid.length>0) mx.mbid_artist = mxTrack.artist_mbid;
		return mx;
	};

	Spank.attachEchoMetadata = function(snapshot, echoTrack) {
		snapshot.echoid_track = echoTrack.id;
		snapshot.echoid_artist = echoTrack.artist_id;
	};

	Spank.plugTheBitch = function(bitch, tracklistRef) {

		var getAlbumArt = false;
		if (typeof(bitch.thumb)!=='undefined' && !bitch.thumb.match(/mzstatic|7static|musixmatch/)) {
			getAlbumArt = true;
		}

		function getMX(koo) {
			Spank.mxMatchOne(koo.title, koo.artist, function onmatch(mxTrack) {
				var track = Spank.normalizeMXData(mxTrack),
					oForItunes = {url: koo.url, artist: koo.artist, title: koo.title};
				if (track.hasOwnProperty("album")) oForItunes.album = track.album;
				if (!koo.hasOwnProperty("itms_track")) getItunes(oForItunes);
				tracklistRef.transaction(function(currentData) {
					var i = currentData.length;
					while (i--) {
						var current = currentData[i];
						if (current.url===koo.url) {
							for (var k in track) {
								if (track.hasOwnProperty(k)) {
									if (!current.hasOwnProperty(k)) {
										current[k] = track[k];
									}
									if (k==='thumb' && !current.thumb.match(/mzstatic|7static|musixmatch/)) {
										current[k] = track[k];
									}
								}
							}
							break;
						}
					}
					return currentData;
				});
			});
		}

		function getECHO(koo) {
			ECHO.matchOne(koo.title, koo.artist, function onmatch(echoTrack) {
				tracklistRef.transaction(function(currentData) {
					var i = currentData.length;
					while (i--) {
						var s = currentData[i];
						if (s.url===koo.url) {
							Spank.attachEchoMetadata(s, echoTrack);
							break;
						}
					}
					return currentData;
				});
			});
		}

		function getItunes(track) {
			var callback_updateFromItunes = function(tracklist) {
				var iTunesSong = tracklist[0];
				delete iTunesSong.releaseDate;
				delete iTunesSong.score;
				tracklistRef.transaction(function(currentData) {
					var i = currentData.length;
					while (i--) {
						var current = currentData[i];
						if (current.url===track.url) {
							for (var k in iTunesSong) {
								if (iTunesSong.hasOwnProperty(k)) {
									if (!current.hasOwnProperty(k)) {
										current[k] = iTunesSong[k];
									}
									if (k==='thumb' && !current.thumb.match(/mzstatic|7static|musixmatch/)) {
										current[k] = iTunesSong[k];
									}
								}
							}
							break;
						}
					}
					return currentData;
				});
			};
			callback_updateFromItunes.limit = 10;
			ITMS.query(track, callback_updateFromItunes);
		}

		if (bitch===null) return;
		if (typeof(bitch.mxid_track)==='undefined') {
			getMX(bitch);
		}
		if (typeof(bitch.itms_track)==='undefined' || getAlbumArt) {
			getItunes(bitch);
		}
		if (typeof(bitch.echoid_track)==='undefined' || getAlbumArt) {
			getECHO(bitch);
		}

	};

	Spank.tasteProfileId = null;

	function echoTasteItem(o, action) {
		return {
			action: action,
			item: {
				item_id: Spank.username.concat("-", o.echoid_track),
				song_id: o.echoid_track,
				artist_id: o.echoid_artist
			}
		};
	}

	function updateTasteProfile(profileHistoryId, tracklist, action, callback) {
		var echoIds = {},
			echoTracklist = [];
		for (var i=0, len=tracklist.length; i<len; i++) {
			var o = tracklist[i];
			if (("echoid_track" in o) && ("echoid_artist" in o)) {
				if (echoIds.hasOwnProperty(o.echoid_track)) {
					// Pass
				} else {
					echoIds[o.echoid_track] = true;
					echoTracklist.push(echoTasteItem(o, action));
				}
			}
		}
		if (echoTracklist.length===0) return;
		var	postData = {
				id: profileHistoryId,
				tracklist: JSON.stringify(echoTracklist)
			};
		$.ajax({
			type: "POST",
			url: "/echo/taste/update",
			data: postData,
			success: function(res) {
				if (callback) callback(res.id);
			}
		});
	}

	$(document).ready(function() {

		$(document).one("login", function() {

			Spank.username = Spank.utils.toFirebaseName(FBUserInfo.username);
			var Base = Spank.base;
			Base.users = new Firebase('https://wild.firebaseio.com/spank/users');
			Base.me = Base.users.child(Spank.username);
			Base.history = Base.me.child("history");
			Base.historyx = Base.me.child("historyx");
			Base.freshies = Base.me.child("freshies");
			$(document).trigger("baseReady");
			Spank.loggedIn = true;
			var firstPass = true;
			var ignoreInitial = 0;

			function cleanHistory(snapshot) {
				var newHistory = snapshot.val(),
					tracks = [],
					refresh = false;
				for (var i=0, len=newHistory.length; i<len; i++) {
					var track = newHistory[i];
					if (typeof(track)==='object') {
						for (var k in track) {
							if (track.hasOwnProperty(k) &&
								(track[k].toString().length===0 || track[k].toString()==="na")) {
								refresh = true;
								delete track[k];
								if (k==='album') delete track.mxid;
							}
							if (track.hasOwnProperty('mxid')) {
								track.mxid_track = track.mxid;
								delete track.mxid;
								refresh = true;
							}
						}
						tracks.push(track);
					}
				}
				if (!refresh && tracks.length===newHistory.length) {
					assemble(snapshot);
				} else {
					Base.history.set(tracks);
				}
			}

			function initHistory(snapshot) {
				var newHistory = snapshot.val(),
					koHistory = [],
					echoHistory = [];
				for (var i=0, len=newHistory.length; i<len; i++) {
					var o = newHistory[i], koo = {};
					if (o.hasOwnProperty("echoid_track") && o.hasOwnProperty("echoid_artist")) {
						echoHistory.push(o);
					}
					for (var k in o) {
						if (o.hasOwnProperty(k)) {
							koo[k] = k.match(/thumb|url|direct/) ? ko.observable(o[k]) : o[k];
						}
					}
					koHistory.unshift(koo);
				}
				if (echoHistory.length>0) initEchoHistory(echoHistory);
				ignoreInitial = koHistory.length;
				Spank.history.stream(koHistory);
				Spank.history.stream.valueHasMutated();
				startListeningToBase();
			}

			function initEchoHistory(echoHistory) {
				var tasteProfileRef = Base.me.child("echoTasteProfile");
				tasteProfileRef.once("value", function(snapshot) {
					var id = snapshot.val();
					if (id===null) {
						var name = ECHO.key_random().concat(":", Spank.username);
						updateTasteProfile(name, echoHistory, "update", function afterUpdateTasteProfile(tasteId) {
							if (tasteId!==null) {
								Spank.tasteProfileId = tasteId;
								ECHO.startRecommendations();
								tasteProfileRef.set(tasteId);
							}
						});
					} else {
						Spank.tasteProfileId = id;
						ECHO.startRecommendations();
						updateTasteProfile(Spank.tasteProfileId, echoHistory, "update");
					}
				});
			}

			function assemble(snapshot) {
				var newHistory = snapshot.val();
				if (Array.isArray(newHistory) && newHistory.length>0) {
					if (firstPass) {
						firstPass = false;
						cleanHistory(snapshot);
					} else {
						initHistory(snapshot);
					}
				} else {
					startListeningToBase();
				}
			}

			Base.history.on("value", assemble);   // LAUNCH SEQUENCE
			var streamListContainer = $("#history-stream-list-container"),
				startListeningToBase = function() {
				Base.history.off('value', assemble);
				streamListContainer.css("background-image","none");
				if (document.height>900) {
					streamListContainer.addClass("history_fullheight");
				}
				Base.history.on('child_changed', updateHistoryItem);
				Base.history.on('child_added', updateHistoryItem);
				Base.history.on('child_removed', function(snapshot) {
					console.log("REMOVED: " + JSON.stringify(snapshot.val()));
					// Fix for an off-by-one error everytime we remove
					// something from the history list
					Spank.history.stream.shift();
				});
			};

			var ignored = 0;
			var updateHistoryItem = function(snapshot) {
				++ignored;
				if (ignored<=ignoreInitial) return;
				var o = snapshot.val();
				if (o!==null) {
					var stream = Spank.history.saveStream ? Spank.history.stream() : Spank.history.streamBackup,
						atHistoryIndex = stream.length-1-parseInt(snapshot.name(),10),
						koo = {};
					if (typeof(o)==='object') {
						for (var k in o) {
							if (o.hasOwnProperty(k)) {
								var v = k.match(/thumb|url|direct/) ? ko.observable(o[k]) : o[k];
								koo[k] = v;
							}
						}
						if (Spank.player.lastPlayedObject.url===o.url) {
							Spank.player.setCover(o.thumb);
						}
					} else {
						koo = o;
					}
					if (atHistoryIndex<0) {
						stream.unshift(koo);
					} else {
						stream[atHistoryIndex] = koo;
					}
					if (Spank.history.saveStream) Spank.history.stream.valueHasMutated();
				} else {
					console.error(o);
				}
			};

		});

		Spank.history = (function() {

			var self = {};
			self.renderStream = ko.observableArray([]);
			self.stream = ko.observableArray([]);
			self.freshies = ko.observableArray([]);
			self.freshiesList = ko.observableArray([]);
			self.batchItems = ko.observableArray([]);
			self.batchItemsCount = ko.computed(function() {
				return self.batchItems().length + " tracks selected";
			});
			self.batchPics = ko.computed(function() {
				if (self.batchItems().length>0) {
					var images = self.batchItems.slice(0,25).map(function(o) { return '<img class="basketpics" src="'+ko.toJS(o.thumb)+'" />' });
					return images.join("");
				} else {
					return "";
				}
			});
			var perPage = 50,
				atListEnd = ko.observable(false);
			self.page = ko.observable(1);
			self.getHead = function() {
				if (self.stream().length<=perPage) return;
				self.page(1);
				atListEnd(false);
			};
			self.goPrevPage = function() {
				if (self.stream().length<=perPage) return;
				var i = self.page()-1;
				if (i<1) i = 1;
				self.page(i);
				atListEnd(false);
			};
			self.goNextPage = function() {
				if (self.stream().length<=perPage) return;
				if (atListEnd()) {
					self.getHead();
					return;
				}
				var i = self.page()+1;
				if (i<1) i = 1;
				self.page(i);
			};
			self.pageProgress = ko.computed(function() {
				var historyTotal = 0;
				for (var i=0, len=self.stream().length; i<len; i++) {
					if (typeof(self.stream()[i])==='object') historyTotal++;
				}
				var total_pages = parseInt(historyTotal/perPage, 10)+1;
				if (historyTotal%perPage===0) {
					total_pages = historyTotal/perPage;
				}
				return parseInt((self.page()/total_pages)*100, 10)+"%";
			});

			self.cancelStreamFilter = function() {
				if (self.filterActive()) {
					self.saveStream = true;
					self.filterActive(false);
					self.page(1);
					atListEnd(false);
					self.stream(self.streamBackup);
					self.stream.valueHasMutated();
					$("#history-filter").val("").trigger("blur");
				}
			};

			self.thumbSource = Spank.lazyLoadImages("#history-stream-list-container", {_iTunes:"60x60-50", _7static:"_50.jpg"});

			var renderPageTimeout = setTimeout(function() {},0),
				scrollToSongPosition = null;

			function scrollToVerticalPositionOfCurrentTrack() {
				setTimeout(function() {
					$("#history-stream-list-container").scrollTop(scrollToSongPosition);
					scrollToSongPosition = null;
				}, 500);
			}

			function populateRenderStream(p) {
				p--;
				var start = p*perPage,
					end = start+perPage,
					items = [];
				clearTimeout(renderPageTimeout);
				for (var i=0, len=self.stream().length; i<len; i++) {
					var o = self.stream()[i];
					if (typeof(o)==='object') items.push(o);
				}
				if (end>=items.length) atListEnd(true);
				renderPageTimeout = setTimeout(function() {
					self.renderStream(items.slice(start, end));
					self.renderStream.valueHasMutated();
					if (scrollToSongPosition) {
						scrollToVerticalPositionOfCurrentTrack();
					}
				}, 300);
			}

			self.page.subscribe(populateRenderStream);

			self.currentPlayingUrl = Spank.player.current_ownerid;

			self.streamBackup = [];
			self.saveStream = true;
			self.stream.subscribe(function(list) {
				if (self.saveStream) self.streamBackup = list;
				populateRenderStream(self.page());
			});

			var similarArtistAndTitle = Spank.utils.similarArtistAndTitle;

			var isTheSameGift = function(gift, o) {
				if (o.gift===undefined) {
					return false;
				} else {
					var cond1 = similarArtistAndTitle(o, gift),
						cond2 = o.gift.from===gift.gift.from,
						cond3 = o.gift.message===gift.gift.message;
					return (cond1 && cond2 && cond3);
				}
			};

			self.transaction_deleteFromHistory = function(newTrack, currentHistory, add) {
				var newHistory = [], i, len, item;
				if ('gift' in newTrack) {
					// Note that this branch ONLY happens when we manually delete a gift
					for (i = 0, len = currentHistory.length; i < len; i++) {
						item = currentHistory[i];
						if (!isTheSameGift(newTrack, item)) {
							newHistory.push(item);
						} else {
							newHistory.push('nicegapbaby');
						}
					}
				} else {
					for (i = 0, len = currentHistory.length; i < len; i++) {
						item = currentHistory[i];
						if (typeof(item) !== 'object') {
							newHistory.push(item);
						} else if (item.url === newTrack.url || similarArtistAndTitle(newTrack, item)) {
							if ('gift' in item) {
								newHistory.push(item);
							} else {
								newTrack = $.extend(item, newTrack);
								newHistory.push("nicegapbaby");
							}
						} else {
							newHistory.push(item);
						}
					}
				}
				if (add===true) newHistory.push(newTrack);
				return newHistory;
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

			var tweetItem_height = $($(".tweetItem")[0]).height();
			self.showCurrentlyPlayingTrack = function() {
				var o, i=0, len = self.stream().length, length=0;
				while (i<len) {
					o = self.stream()[i];
					if (typeof(o)==='object' && self.currentPlayingUrl()===o.url()) {
						var page = parseInt(length/perPage, 10);
						scrollToSongPosition = (length%perPage)*tweetItem_height;
						if (self.page()===(page+1)) {
							scrollToVerticalPositionOfCurrentTrack();
						} else {
							self.page(page+1);
						}
						break;
					} else if (typeof(o)==='object') {
						length++
					} else {
						// Gap left by deleted track
					}
					i++
				}
			};

			self.prependToHistory = function(list, playNow) {
				var listOfTracksToAdd;
				if (Array.isArray(list)) {
					// True when adding from playlist, or added from VK search results
					// e.g. addition of "all new" tracks into history
					listOfTracksToAdd = list;
					if (Spank.tasteProfileId!==null) {
						updateTasteProfile(Spank.tasteProfileId, listOfTracksToAdd, "update");
					}
				} else {
					// True only when user clicks on an item in history list
					// e.g. no new items are really added to history
					listOfTracksToAdd = [list];
				}

				var newHistory = ko.toJS(self.streamBackup).reverse();
				for (var i = listOfTracksToAdd.length - 1; i >= 0; i--) {
					var o = ko.toJS(listOfTracksToAdd[i]);
					newHistory = self.transaction_addNewHistoryItemAndMakeUnique(o, newHistory);
				}

				Spank.base.history.set(newHistory);

				if (typeof(playNow)!=='undefined') {
					if (playNow) {
						Spank.player.playObject(listOfTracksToAdd[0]);
						threeSixtyPlayer.config.jumpToTop = false;
					} else {
						threeSixtyPlayer.config.jumpToTop = true;
					}
				}

			};

			self.getFirebaseOfKoo = function(koo) {
				var localIndex, firebaseIndex;
				localIndex = self.stream.indexOf(koo);
				if (localIndex>=0) {
					firebaseIndex = self.stream().length-1-localIndex;
					return Spank.base.history.child(firebaseIndex);
				} else {
					return null;
				}
			};

			self.deleteBatch = function() {
				if (!self.saveStream) { $(".historyFilterCancel").click(); }
				var len = self.batchItems().length,
					koo, localIndex, firebaseIndex;
				while (len--) {
					koo = self.batchItems()[len];
					self.getFirebaseOfKoo(koo).set("nicegapbaby");
					if (Spank.player.lastPlayedObject.url===koo.url()) {
						Spank.player.suspendLoopAndTrigger(function() {
							$(document).trigger('fatManFinish', localIndex);
						});
					}
				}
				var selectedItems = ko.toJS(self.batchItems);
				if (Spank.tasteProfileId!==null) {
					updateTasteProfile(Spank.tasteProfileId, selectedItems, "delete");
				}
				self.batchItems([]);
			};

			// When you click on the red 'minus' icon
			self.deleteHistoryItemOnClick = function(koo, event) {
				var stream = self.saveStream ? self.stream() : self.streamBackup,
					localIndex = stream.indexOf(koo),
					firebaseIndex = stream.length-1-localIndex,
					track = ko.toJS(koo),
					li = $(event.target).parent();
				li.addClass("flyleft");
				if (!self.saveStream) { self.stream.remove(koo); }
				Spank.base.history.child(firebaseIndex).set("nicegapbaby");
				if (Spank.tasteProfileId!==null) {
					updateTasteProfile(Spank.tasteProfileId, [track], "delete");
				}
				if (Spank.player.lastPlayedObject.url===track.url) {
					Spank.player.suspendLoopAndTrigger(function() {
						$(document).trigger('fatManFinish', localIndex);
					});
				}
			};

			self.playHistoryItemOnClick = function(koo, event) {
				koo = ko.toJS(koo);
				if (!(Spank.player.lastPlayedObject.url===koo.url)) {
					$(event.target).parents(".tweetItem").addClass("tweetBlink");
					Spank.player.playObject(koo);
				}
			};

			self.addFreshiesOnClick = function(koo, event) {
				koo = ko.toJS(koo);
				Spank.lightBox.addSongToStream(koo);
			};

			self.downloadHistoryItemOnClick = function(koo, event) {
				koo = ko.toJS(koo);
				if (koo.url.match(/^@/)) {
					$(event.target).parent().click(function() { return false; }).attr("href", koo.direct);
				} else {
					var owner_id = koo.url.split(".")[0],
						url = "https://api.vkontakte.ru/method/audio.getById?audios=" + owner_id + "&access_token=" + VK.getToken() + "&callback=?";
					$.getJSON(url, function getActualVKLink(data) {
						if (data.response && data.response.length>0) {
							var newDirectLink = data.response[0].url;
							$(event.target).parent().click(function() { return false; }).attr("href", newDirectLink);
						}
					});
				}
			};

			self.listIndicatorText = ko.observable("Library");
			self.hideFreshies = ko.observable(true);
			self.freshies.subscribe(function() {
				if (!self.hideFreshies()) {
					self.freshiesList(self.freshies());
				}
			});
			self.hideFreshies.subscribe(function(yes) {
				if (yes) {
					self.listIndicatorText("Library");
					//self.freshiesList([]);
				} else {
					self.listIndicatorText("Previously played");
					self.freshiesList(self.freshies());
				}
			});
			self.toggleHistoryFreshies = function() {
				Spank.batchOps.batchItems([]);
				self.hideFreshies(!self.hideFreshies());
			};
			self.recentlyPlayedVisible = ko.computed(function() {
				return !self.hideFreshies() && self.freshies().length>0;
			});

			self.isNotInLibrary = function(koo) {
				return Spank.history.findHistoryItemWithUrl(koo.url)===null;
			};

			self.prependToFreshies = function(koo) {
				var newRef = Spank.base.freshies.push(),
					oldRefToDelete,
					pluggedKoo = Spank.history.findHistoryItemWithUrl(koo.url); // Is this in the library?
				self.freshies().forEach(function(o) {
					if (o.url===koo.url && o.hasOwnProperty('freshiesData')) {
						oldRefToDelete = o.freshiesData.ref;
						Spank.base.freshies.child(oldRefToDelete).remove();
					}
				});
				if (pluggedKoo!==null) {
					// Is in the library, grab the "plugged" track
					koo = ko.toJS(pluggedKoo);
					koo.freshiesData = {inLibrary: true, ref: newRef.name()};
				} else {
					// Playing from the radio
					koo.freshiesData = {inLibary: false, ref: newRef.name()};
				}
				newRef.set(koo, function onComplete() {
					// Spank.plugTheBitch(koo, Spank.base.freshies);
				});
			};

			self.opEnabled = ko.observable(true);

			self.homeActive = ko.computed(function() {
				return (self.hideFreshies() && self.opEnabled() && self.stream().length>perPage && self.page()>1);
			});

			self.leftActive = ko.computed(function() {
				return (self.hideFreshies() && self.page()!==1 && self.opEnabled() && self.stream().length>perPage);
			});

			self.rightActive = ko.computed(function() {
				return (self.hideFreshies() && self.opEnabled() && self.stream().length>perPage);
			});

			var streamFilterField = $("#history-filter");
			streamFilterField.submit(function(e) {
				return false;
			});

			self.filterActive = ko.observable(false);

			streamFilterField.livesearch({
				searchCallback: function(input) {
					input = $.trim(input);
					self.filterActive(true);
					self.saveStream = false;
					if (input.length===0 || input==="Search library") {
						return false;
					} else {
						var results = [],
							q = input.replace(" ", ".*"),
							re = new RegExp(q, "i");
						for (var i=0, len=self.streamBackup.length; i<len; i++) {
							var li = self.streamBackup[i];
							if (typeof(li)==='object' && (li.artist.match(re) || li.title.match(re))) {
								results.push(li);
							}
						}
						self.page(1);
						atListEnd(false);
						self.stream(results);
						self.stream.valueHasMutated();
					}
				},
				innerText: "Search library",
				queryDelay: 250,
				minimumSearchLength: 1
			});

			function getFresh() {
				var f = setInterval(function() {
					if (typeof(Spank.base.freshies)!=='undefined') {
						clearInterval(f);
						Spank.base.freshies.limit(100).on("child_added", function(snapshot) {
							var o = snapshot.val();
							if (o!==null && typeof(o)==='object') {
								self.freshies.unshift(snapshot.val());
							}
						});
						Spank.base.freshies.on("child_removed", function(snapshot) {
							var atFreshieIndex = null;
							self.freshies().forEach(function(o,i) {
								if (o.freshiesData.ref===snapshot.name()) {
									atFreshieIndex = i;
								}
							});
							if (atFreshieIndex!==null) {
								self.freshies.splice(atFreshieIndex, 1);
							}
						});
					}
				}, 250);
			}

			getFresh();      // LAUNCH SEQUENCE

			self.onClickTweetThumb = function(data, event) {
				Spank.batchOps.saveCartAndEmpty();
				if (self.batchItems.indexOf(data)>=0) {
					self.batchItems.remove(data);
				} else {
					if (data.hasOwnProperty('gift')) {
						delete data.gift;
					}
					self.batchItems.push(data);
				}
			};

			return self;

		})();

		ko.applyBindings(Spank.history, document.getElementById('playHistory'));

	});

})();