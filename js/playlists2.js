/*global document, Head, window, Spank, ko */

var Head = {
	users: new Firebase("https://wild.firebaseio.com/spank/users/")
};

(function () {

	$(document).one("baseReady", function() {

		var Playlist = {};

		Playlist.makeBaseObject = function(ref)  {
			// The firebase object
			var base = {};
			base.root = ref;
			base.viewed_times = ref.child("viewed");
			base.last_viewed = ref.child("last_viewed");
			base.last_updated = ref.child("last_updated");
			base.owners = ref.child("owners");
			base.title = ref.child("title");
			base.writable = ref.child("writable");
			base.tracklist = ref.child("list");
			return base;
		};

		Playlist.updatePlaylistWithItem = function(snapshot) {
			var userbase = snapshot.ref().parent().parent(),
				playlists = userbase.child("playlists"),
				refID = snapshot.val(),
				thisPlaylistRef = playlists.child(refID),
				existingKoo = Head.playlists.getByRef(refID);
			if (existingKoo===null) {
				thisPlaylistRef.child("owners").on("value", function(snapshot) {
					var ownersList = snapshot.val();
					if (ownersList!==null) {
						// We're not interested in a playlist unless we're
						// one of the owners, or the playlist is tagged with "everyone"
						if (ownersList.indexOf('everyone')>=0 ||
							ownersList.indexOf(Spank.username)>=0) {
							if (Head.playlists.itemsByRef.hasOwnProperty(refID)) {
								// As the owners list changes, make sure we don't re-add a
								// playlist we are already watching
								return;
							}
							var playlist = {
								title: ko.observable(""),
								url: ko.observable("#"),
								owners: ko.observableArray(ownersList),
								cover: ko.observable('/img/emptyplaylist.jpg'),
								refID: refID,
								base: Playlist.makeBaseObject(thisPlaylistRef),
								last_viewed: ko.observable(0),
								last_updated: ko.observable(0)
							};
							Head.playlists.itemsByRef[refID] = playlist;
							if (ownersList.indexOf(Spank.username)===0) {
								Head.playlists.dockItemsMe.unshift(playlist);
							} else {
								Head.playlists.dockItemsFriends.unshift(playlist);
							}
							Playlist.watchPlaylistInfo(thisPlaylistRef);
						}
					} else {
						// If the entire ownersList is suddenly null, it probably means that
						// a playlistRef we were watching just got deleted. Always true?
						Playlist.unwatchPlaylistInfo(thisPlaylistRef);
						Head.playlists.deletePlaylistItemWithRef(refID);
						delete Head.playlists.itemsByRef[refID];
					}
				});

				thisPlaylistRef.child("owners").on("child_removed", function(snapshot) {
					var ownerRef = snapshot.ref().parent().child("0"),
						deletedUser = snapshot.val();
					ownerRef.on("value", function(snapshot) {
						if (snapshot.val()!==Spank.username) {
							// If this is not my playlist and the owner of this playlist
							// has stopped sharing with either me or everyone
							if (deletedUser===Spank.username || deletedUser==='everyone') {
								Playlist.unwatchPlaylistInfo(thisPlaylistRef);
								Head.playlists.deletePlaylistItemWithRef(refID);
								delete Head.playlists.itemsByRef[refID];
								if (Spank.charts.userPlaylistIsOpen() && Head.playlists.lastKoo.refID===thisPlaylistRef.name()) {
									// If the playlist we were viewing becomes unavailable
									Head.playlists.randomChart(true);
								}
							}
						}
					});
				});
			} else {
				// What happened here?
			}
		};

		Playlist.watchPlaylistRefsBelongingTo = function(username) {
			var playlistRefs = Head.users.child(username).child("playlistRefs");
			playlistRefs.on('child_added', Playlist.updatePlaylistWithItem);
		};

		Spank.watchPlaylistRefsBelongingTo = Playlist.watchPlaylistRefsBelongingTo;

		function watchTitle(snapshot) {
			var refID = snapshot.ref().parent().name(),
				newValue = snapshot.val(),
				koo = Head.playlists.getByRef(refID);
			if (newValue!==null && koo!==null) {
				koo.title(newValue);
			}
		}

		function watchCover(snapshot) {
			var refID = snapshot.ref().parent().parent().name(),
				newValue = snapshot.val(),
				koo = Head.playlists.getByRef(refID);
			if (newValue!==null && newValue.hasOwnProperty("thumb") && koo!==null) {
				koo.cover(newValue.thumb);
			}
		}

		function watchLastViewed(snapshot) {
			var refID = snapshot.ref().parent().name(),
				newValue = snapshot.val(),
				koo = Head.playlists.getByRef(refID);
			if (newValue!==null && koo!==null) {
				koo.last_viewed(newValue);
				Head.playlists.sortDockWithKoo(koo);
			}
		}

		function watchLastUpdated(snapshot) {
			var refID = snapshot.ref().parent().name(),
				newValue = snapshot.val(),
				koo = Head.playlists.getByRef(refID);
			if (newValue!==null && koo!==null) {
				koo.last_updated(newValue);
				Head.playlists.sortDockWithKoo(koo);
			}
		}

		Playlist.watchPlaylistInfo = function(playlistRef) {
			var titleRef = playlistRef.child("title"),
				coverRef = playlistRef.child("list").child("0"),
				lastViewedRef = playlistRef.child("last_viewed"),
				lastUpdatedRef = playlistRef.child("last_updated");
			titleRef.on('value', watchTitle);
			coverRef.on('value', watchCover);
			lastViewedRef.on('value', watchLastViewed);
			lastUpdatedRef.on('value', watchLastUpdated);
		};

		Playlist.unwatchPlaylistInfo = function(playlistRef) {
			var titleRef = playlistRef.child("title"),
				coverRef = playlistRef.child("list").child("0");
			titleRef.off('value', watchTitle);
			coverRef.off('value', watchCover);
		};

		Playlist.watchPlaylistRefsBelongingTo(Spank.username);

		Head.playlistProperties = (function() {
			var self = {};
			self.userPlaylistIsOpen = ko.computed(function() {
				return Spank.charts.userPlaylistIsOpen();
			});
			self.title = ko.computed(function() {
				return Spank.charts.bigTitle();
			});
			self.owners = ko.observableArray([]);
			self.owners.subscribe(function(list) {
				var writableCheckbox = $("#pprop-writable");
				if (list.length===1 && writableCheckbox.prop("checked")) {
					writableCheckbox.prop("checked", false);
				}
			});
			self.writable = ko.observable(null);
			self.editState = ko.computed(function() {
				if (self.owners().length<=1) {
					return "icon-eye-close icon-large";
				} else if (self.writable()!==null) {
					return self.writable() ? "icon-edit icon-large" : "icon-eye-open icon-large";
				} else {
					return "bogus";
				}
			});
			self.withEveryone = ko.observable(null);
			self.sharedWith = ko.computed(function() {
				var everyone = self.owners().indexOf("everyone")>=0,
					nobody = self.owners().length<=1;
				if (everyone) {
					if (self.writable()) {
						return "Anyone can contribute";
					} else {
						return "Viewable by everyone";
					}
				} else if (nobody) {
					return "Private";
				} else {
					if (self.owners().length===2) {
						return "Shared with 1 other person";
					} else {
						return "Shared with " + self.owners().length-1 + " people";
					}
				}
			});
			self.isMine = ko.computed(function() {
				return self.owners().indexOf(Spank.username)===0;
			});
			self.renamePlaylist = function() {
				var elem = $("#playlists-scroller-list-me").find(".playlistEntry.activePlaylist").find(".playlistName.mine");
				if ((self.owners().indexOf(Spank.username)===0) && elem.length>0) {
					elem.trigger('click');
				}
			};
			self.destroyPlaylist = function() {
				window.notify.notification("!");
				Head.playlists.destroyOpenPlaylist();
			};
			return self;
		})();

		ko.applyBindings(Head.playlistProperties, document.getElementById('playlistProperties'));

		Head.playlists = (function () {
			var self = {};
			self.visible = ko.observable(true);
			self.docksVisible = {
				discover: ko.observable(false),
				charts: ko.observable(false),
				me: ko.observable(false),
				friends: ko.observable(false)
			};
			self.dockNames = ['discover', 'charts', 'me', 'friends'];
			var docks = self.dockNames.map(function(name) {
				var prop = "dockItems" + name.title();
				self[prop] = ko.observableArray([]);
				return self[prop];
			});
			self.bxSliders = {};
			self.itemsByRef = {};

			var found = false;
			self.slideToDockItemWithRefID = function(refID) {
				docks.forEach(function(dock, whichDock) {
					if (found) {
						found = false;
						return;
					}
					var refIDsInThisDock = dock().map(function(o) { return o.refID; }),
						thisDockItemIndex = refIDsInThisDock.indexOf(refID),
						dockName = self.dockNames[whichDock];
					if (thisDockItemIndex>=0) {
						var dockItemThumbSelector = ".playlistThumb[refID='@']".replace("@", refID),
							dockTabSelector = ".playlist-type-btn[value='ppi-@']".replace("@", dockName),
							dockThumbContainerSelector = "#playlists-scroller-list-@".replace("@", dockName);
						// Click the dock item thumbnail
						$(dockItemThumbSelector).click();
						// Click the tab of the respective dock
						$(dockTabSelector).click();
						// Slide over to the clicked item
						var offset = (106*3)+(106*thisDockItemIndex)*-1;
						offset = offset>0 ? 0 : offset;
						$(dockThumbContainerSelector).css("margin-left", offset);
						found = true;
					}
				});
			};

			self.randomChart = function(preserveTab) {
				var nonUserPlaylistDocks = Head.playlists.dockItemsCharts().concat(Head.playlists.dockItemsDiscover()),
					chartRefIDs = nonUserPlaylistDocks.map(function(o) { return o.refID; }),
					i = Math.floor(Math.random()*chartRefIDs.length);
				self.slideToDockItemWithRefID(chartRefIDs[i]);
			};

			self.sortDockWithKoo = function(koo) {
				var whichDock = self.dockItemsMe.indexOf(koo)>= 0 ? self.dockItemsMe : self.dockItemsFriends;
				function moreRecent(a,b) {
					var total_time_a = a.last_viewed() + a.last_updated(),
						total_time_b = b.last_viewed() + b.last_updated();
					if (total_time_a===total_time_b) {
						return 0;
					} else if (total_time_a>total_time_b) {
						return -1;
					} else {
						return 1
					}
				}
				var sorted = whichDock().sort(moreRecent);
				whichDock(sorted);
			};
			self.getByRef = function(refID) {
				var userPlaylistDocks = self.dockItemsMe().concat(self.dockItemsFriends());
				return ko.utils.arrayFirst(userPlaylistDocks, function(koo) {
					if (koo===undefined) {
						return false;
					} else {
						return koo.refID===refID;
					}
				});
			};
			self.deletePlaylistItemWithRef = function(refID) {
				var koo = self.getByRef(refID);
				[self.dockItemsMe, self.dockItemsFriends].forEach(function(dock) {
					var index = dock.indexOf(koo);
					if (index>=0) dock.remove(koo);
				});
			};

			self.renamePlaylist = function(koo) {
				var titleRef = koo.base.title,
					data = {
						title: "Rename this playlist",
						placeholder: "",
						submitmessage: "OK"
					};
				Spank.getInput.show(function(input) {
					input = input ||  "Playlist " + Math.uuid(16);
					titleRef.set(input);
				}, data);
			};

			self.lastKoo = null;
			var	activeListeners = {};

			Spank.playlistsUnlisten = function() {
				if (self.lastKoo!==null) {
					$.each(activeListeners, function(k,v) {
						self.lastKoo.base[k].off('value', v);
					});
				}
			};

			self.destroyPlaylist = function(koo) {
				var refId = koo.refID;
				window.notify.confirm("Delete this playlist?", function() {
					Spank.base.me.child('playlistRefs').transaction(function(currentData) {
						// First delete the refID from playlistRef
						var i = currentData.indexOf(refId);
						if (i>=0) {
							currentData.splice(i,1);
							return currentData;
						} else {
							return undefined;
						}
					}, function onComplete(error, comitted, snapshot, dummy) {
						if (comitted) {
							// Now delete the actual playlist
							koo.base.root.remove();
						}
					});
				});
			};

			self.destroyOpenPlaylist = function() {
				self.destroyPlaylist(self.lastKoo);
			};

			self.activeChartRefID = ko.observable("");
			Spank.charts.refID.subscribe(function(refID) {
				if (typeof(refID)==='undefined') return;
				if (refID.match(/^.*|.*/)) {
					// Highlight the currently active item in dock
					self.activeChartRefID(refID.split("|")[0]);
				}
			});

			self.openPlaylist = function(data, event) {
				try {
					// This might not be ready on first launch, doesn't matter
					Spank.friends.visible(false);
					Spank.lightBox.close();
				} catch(err) { }
				if (data.refID.match(/^-/)) {
					// This is a user playlist
					var refID = data.refID + "|" + Math.uuid(64);
					Spank.charts.resetCharts({title: data.title(), url: "#", refID: refID});
					self.openFireBasePlaylist(data, event);
				} else {
					// This is a chart
					Spank.charts.openChartItem(data, event);
				}
			};

			self.openFireBasePlaylist = function(koo, event) {
//				$(".results-list").addClass("results-user-playlist");
				var thisImage = $(event.target),
					titleRef = koo.base.title,
					ownersRef = koo.base.owners,
					writableRef = koo.base.writable,
					tracklistRef = koo.base.tracklist,
					playlistID = tracklistRef.parent().name();
				Spank.playlistsUnlisten();
				self.lastKoo = koo;
				koo.base.viewed_times.transaction(function(currentData) {
					// Track how many times this playlist has been viewed
					return (currentData===null) ? 1 : currentData+1;
				});
				koo.base.last_viewed.set(Date.now());
				var errorOpeningPlaylist = setTimeout(function() {
					Spank.charts.loading(false);
					window.notify.error("Oops, an error occured. Try opening the playlist again.");
					Head.playlists.randomChart(true);
				}, 10000);
				var startPlaylistPropertyListeners = function() {
					activeListeners['title'] = titleRef.on('value', function(snapshot) {
						var title = snapshot.val();
						if (title!==null) {
							Spank.charts.lameTitle(title);
						}
					});
					activeListeners['owners'] = ownersRef.on('value', function(snapshot) {
						var owners = snapshot.val();
						if (owners!==null) {
							Head.playlistProperties.owners(owners);
							var withEveryone = owners.indexOf("everyone")>=0;
							Head.playlistProperties.withEveryone(withEveryone);
							$("#pprop-everyone").prop("checked", withEveryone);
						}
					});
					activeListeners['writable'] = writableRef.on('value', function(snapshot) {
						var isWritable = snapshot.val();
						if (isWritable!==null) {
							Head.playlistProperties.writable(isWritable);
							$("#pprop-writable").prop("checked", isWritable);
						} else {
							Head.playlistProperties.writable(false);
							$("#pprop-writable").prop("checked", false);
						}
					});
				};
				var refID = koo.refID + "|" + Math.uuid(64);
				Spank.charts.loading(true);
				activeListeners['tracklist'] = tracklistRef.on('value', function(snapshot) {
					var tracklist = snapshot.val();
					if (tracklist!==null) {
						var newStateObj = {
							title: koo.title(),
							refID: refID,
							url: koo.url
						};
						Spank.charts.pushBatch(tracklist, 'replace');
						startPlaylistPropertyListeners();
					}
					clearTimeout(errorOpeningPlaylist);
					Spank.charts.loading(false);
				});
			};

			return self;

		})();

		ko.applyBindings(Head.playlists, document.getElementById('playlistScroller'));

		Head.playlists.randomChart();

		var strip = Spank.utils.stripToLowerCase;

		// Add history items into playlist
		Head.unshiftIntoOpenPlaylist = function(selectedHistoryItems) {
			var isMine = Head.playlistProperties.owners().indexOf(Spank.username)===0,
				isWritable = Head.playlistProperties.writable();
			if (selectedHistoryItems.length>0 && (isMine || isWritable)) {
				Head.pushBatchIntoPlaylistAtBase(Head.playlists.lastKoo.base, selectedHistoryItems);
			} else {
				if (!Spank.charts.userPlaylistIsOpen()) {
					window.notify.error("Open a playlist first then add to it.", 'force');
				} else if (selectedHistoryItems.length>0 && !isWritable) {
					window.notify.error("Sorry, you can't add to this playlist.", 'force');
				}
			}
		};

		Head.pushBatchIntoPlaylistAtBase = function(playlistBase, tracksToAdd) {
			var dx = [], tt;
			$.each(tracksToAdd, function(i,o) {
				tt = strip(o.artist) + strip(o.title);
				dx.push(tt);
				dx.push(o.url);
			});
			playlistBase.last_updated.set(Date.now());
			playlistBase.tracklist.transaction(function(currentData) {
				var newArray = [];
				for (var i = 0, len = currentData.length; i < len; i++) {
					var o = currentData[i],
						tr = strip(o.artist) + strip(o.title);
					if (dx.indexOf(o.url)>=0 || dx.indexOf(tr)>=0 ) {
						// A track in the existing set matches a track we're trying to insert
					} else {
						newArray.push(o);
					}
				}
				newArray.unshift.apply(newArray, tracksToAdd.reverse());
				return newArray;
			});
		};

		// Playlist play button
		$(".icon-play.pprop").click(function() {
			// If no playlist tracks are selected, play the whole list,
			// otherwise, play selected playlist tracks
			var shoppingCartItems = Spank.charts.shoppingCart(),
				itemsToPlay = shoppingCartItems.length===0 ? Spank.charts.chartTracks().slice() : shoppingCartItems.slice().reverse();
			Spank.history.prependToHistory(itemsToPlay, true);
//			$.each(itemsToPlay, function(i,o) {
//				if (i===(itemsToPlay.length-1)) {
//					// This is the last track, do we play it now?
//					// NOTE threeSixtyPlayer.lastSound.paused is null if
//					// we've not yet played anything before.
//					var playNow = threeSixtyPlayer.lastSound!==null ? threeSixtyPlayer.lastSound.paused : true;
//					Spank.history.prependToHistory(o, playNow);
//				} else {
//					Spank.history.prependToHistory(o, false);
//				}
//			});
			Spank.charts.resetShoppingCart();
		});

		$("#pprop-writable").click(function() {
			var isTrue = $(this).prop("checked");
			if (Head.playlistProperties.owners().length===1) {
				isTrue = false;
				$("#pprop-writable").prop("checked", false);
			}
			Head.playlists.lastKoo.base.owners.once('value', function(snapshot) {
				var owners = snapshot.val();
				if (owners!==null && owners.indexOf(Spank.username)===0) {
					Head.playlists.lastKoo.base.writable.set(isTrue);
				}
			});
		});

		$("#pprop-everyone").click(function() {
			var isTrue = $(this).prop("checked");
			Head.playlists.lastKoo.base.owners.once('value', function(snapshot) {
				var owners = snapshot.val();
				if (owners!==null && owners.indexOf(Spank.username)===0) {
					Head.playlists.lastKoo.base.owners.transaction(function(currentData) {
						if (isTrue) {
							currentData.push("everyone");
						} else {
							currentData = currentData.filter(function(e) {
								return e!=='everyone';
							});
						}
						return currentData.length>0 ? currentData : undefined;
					}, function onComplete(error, comitted, snapshot, dummy) {
						if (comitted && snapshot.val().length===1) {
							Head.playlists.lastKoo.base.writable.set(false);
						}
					});
				}
			});
		});

		Head.playlists.visible.subscribe(function(isTrue) {
			// DOM action that toggles "docked" state of playlists
			var scroller = $("#playlistScroller"),
				modes = {'true': 'removeClass', 'false': 'addClass'};
			scroller[modes[isTrue]]("docked");
		});

		$("#toggle-dock-button").click(function() {
			// When far left triangle is clicked, toggle "docked" state of playlists
			var current = Head.playlists.visible();
			Head.playlists.visible(!current);
		});

		var modes = {'true': 'show', 'false': 'hide'};

		$.each(Head.playlists.docksVisible, function(key,v) {
			Head.playlists.docksVisible[key].subscribe(function(isTrue) {
				if (isTrue) {
					// Hide the other playlists that are not currently in view
					Head.playlists.dockNames.filter(function(name) { return name!==key }).forEach(function(name) {
						Head.playlists.docksVisible[name](false);
					});
					// Highlight the currently clicked playlist tab
					$("#ppi-" + key).prop("checked", isTrue);
				}
				$("#playlists-scroller-list-" + key)[modes[isTrue]]();
			});
		});

		Head.playlists.docksVisible.charts(true);

		$("#echonest_button").mousedown(function() {
			$(this).data("on")();
		}).mouseup(function() {
			$(this).data("off")();
		}).click(function() {
			$(".chartThumb[title='Recommendations']").trigger("click");
		});

		$(".playlist-type-btn").click(function() {
			var name = $(this).attr("value").split("-")[1];
			Head.playlists.visible(true);
			Head.playlists.docksVisible[name](true);
		});

		var directionBoxes = $(".sbox-valign");
		directionBoxes.click(function() {
			var direction = $(this).attr("data-direction"),
				targetSlider = $($(".ppi-checkbox:checked").attr("data-target")),
				animate = function() {
					var current = parseInt(targetSlider.css("margin-left"), 10),
						moveBy = direction==='right' ? current-400 : current+400;
					targetSlider.css('margin-left', moveBy);
				};
			animate();
		});

		$(".square-one-valign").click(function() {
			var targetSlider = $($(".ppi-checkbox:checked").attr("data-target"));
			targetSlider.css('margin-left', 0);
		});

	});

})();