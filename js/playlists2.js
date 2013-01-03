(function () {

	var
	chartUrls = {
		lastfm_base: "http://ws.audioscrobbler.com/2.0/?method=METHOD&page=1&limit=200&api_key=0325c588426d1889087a065994d30fa1&format=json&callback=?",
		billboards_base: "http://api.musixmatch.com/ws/1.1/chart.tracks.get?page=1&page_size=100&country=#&f_has_lyrics=0&apikey=316bd7524d833bb192d98be44fe43017&format=jsonp&callback=?",
		itunes_base: "https://itunes.apple.com/#/rss/topsongs/limit=300/explicit=true/json",
		lastfm_hyped: function () { return this.lastfm_base.replace("METHOD","chart.gethypedtracks"); },
		lastfm_top: function () { return this.lastfm_base.replace("METHOD","chart.gettoptracks"); },
		lastfm_loved: function () { return this.lastfm_base.replace("METHOD","chart.getlovedtracks"); }
	},
	chartPlaylistItems = [
		{title: 'last.fm Top', cover: '/img/last_top.png', url: chartUrls.lastfm_top() },
		{title: 'last.fm Loved', cover: '/img/last_loved.png', url: chartUrls.lastfm_loved() },
		{title: 'last.fm Hyped', cover: '/img/last_hyped.png', url: chartUrls.lastfm_hyped() }
	],
	codes = {
		UK: "UK",
		US: "US",
		JP: "Japan",
		DE: "Germany",
		IN: "India",
		AR: "Argentina",
		FR: "France",
		SE: "Sweden",
		ES: "Spain",
		BR: "Brazil",
		RU: "Russia"
	};

	["FR", "JP", "DE", "US", "UK"].forEach(function(code) {
		var bUrl = chartUrls.billboards_base.replace("#", code.toLowerCase()),
			bCover = '/img/bill_#.jpg'.replace("#", code),
			bp = {title: 'Billboard ' + codes[code], cover: bCover, url: bUrl};
		chartPlaylistItems.unshift(bp);
	});

	["US", "DE", "JP", "IN", "AR", "FR", "SE", "ES"].forEach(function(code) {
		var iUrl = chartUrls.itunes_base.replace("#", code.toLowerCase()),
			ip = {title: 'iTunes ' + codes[code], cover: '/img/iTunes.png', url: iUrl };
		chartPlaylistItems.push(ip);
	});

	$(document).one("baseReady", function() {

		Head = {
			users: new Firebase("https://wild.firebaseio.com/spank/users/"),
			username: "restbeckett"
		};

		var Playlist = {};

		Playlist.makeBaseObject = function(ref)  {
			var base = {};
			base.root = ref;
			base.owners = ref.child("owners");
			base.title = ref.child("title");
			base.writable = ref.child("writable");
			base.tracklist = ref.child("list");
			return base;
		};

		Playlist.updatePlaylistWithItem = function(snapshot) {
			var userbase = snapshot.ref().parent().parent(),
				playlists = userbase.child("playlists"),
				playlistItemIndex = parseInt(snapshot.name(), 10),
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
								base: Playlist.makeBaseObject(thisPlaylistRef)
							};
							Head.playlists.itemsByRef[refID] = playlist;
							if (ownersList.indexOf(Spank.username)===0) {
								Head.playlists.dockItemsMe.unshift(playlist);
//								Head.playlists.dockItemsMe()[playlistItemIndex] = playlist;
//								Head.playlists.dockItemsMe.valueHasMutated();
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
							// has stopped sharing with either me or, everyone
							if (deletedUser===Spank.username || deletedUser==='everyone') {
								Playlist.unwatchPlaylistInfo(thisPlaylistRef);
								Head.playlists.deletePlaylistItemWithRef(refID);
								delete Head.playlists.itemsByRef[refID];
								if (typeof(Spank.charts.currentPlaylistTitle())!=='undefined'
									&& Head.playlists.lastKoo.refID===thisPlaylistRef.name()) {
									Head.playlists.goHome(true);
								}
							}
						}
					});
				})

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

		Playlist.watchPlaylistInfo = function(playlistRef) {
			var titleRef = playlistRef.child("title"),
				coverRef = playlistRef.child("list").child("0");
			titleRef.on('value', watchTitle);
			coverRef.on('value', watchCover);
		};

		Playlist.unwatchPlaylistInfo = function(playlistRef) {
			var titleRef = playlistRef.child("title"),
				coverRef = playlistRef.child("list").child("0");
			titleRef.off('value', watchTitle);
			coverRef.off('value', watchCover);
		};

		Playlist.watchPlaylistRefsBelongingTo(Spank.username);
//		Spank.base.me.child("playlistRefs").on("value", function(snapshot) {
//			var currentLayout = snapshot.val();
//			if (currentLayout!==null) {
//				var newDockItems = $.map(currentLayout, function(refID) {
//					var playlist = Head.playlists.itemsByRef[refID];
//					if (playlist!==undefined) return playlist;
//				});
//				Head.playlists.dockItemsMe(newDockItems);
//			} else {
//				Head.playlists.dockItemsMe([]);
//			}
//		});
//
//		Head.users.child(me).child("playlistRefs").on('value', function(snapshot) {
//			var index = snapshot.name(),
//				refID = snapshot.val(),
//				playlist = Head.playlists.itemsByRef[refID];
//			if (playlist!==undefined) {
//				Head.playlists.dockItemsMe()[index] = playlist;
//				Head.playlists.dockItemsMe.valueHasMutated();
//			}
//		});

		Head.playlistProperties = (function() {
			var self = {};
			self.title = ko.computed(function() {
				return Spank.charts.currentPlaylistTitle();
			});
			self.owners = ko.observableArray([]);
			self.writable = ko.observable(null);
			self.editState = ko.computed(function() {
				if (self.owners().length<=1) {
					return "icon-eye-close";
				} else if (self.writable()!==null) {
					return self.writable() ? "icon-edit" : "icon-eye-open";
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
						return "Anyone can add";
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
			self.renamePlaylist = function(koo) {
				var elem = $("#playlists-scroller-list-me").find(".playlistEntry.activePlaylist").find(".playlistName.mine");
				if ((self.owners().indexOf(Spank.username)===0) && elem.length>0) {
					elem.trigger('click');
				}
			};
			return self;
		})();

		ko.applyBindings(Head.playlistProperties, document.getElementById('playlistProperties'));

		Head.playlists = (function () {
			var self = {};
			self.visible = ko.observable(true);
			self.goHome = function(preserveTab) {
				var countries = ['UK','US','Japan','Germany','Japan','France'],
					cunt = countries[Math.floor(Math.random()*countries.length)],
					ppiSelector = ".playlist-type-btn[value='ppi-charts']",
					pSelector = ".playlistThumb[title='Billboard #']".replace("#",cunt);
				var chartThumbs = $(".chartThumb"),
					i = Math.floor(Math.random()*chartThumbs.length);
				$(chartThumbs[i]).trigger('click');
				var offset = (106*3)+(106*i)*-1;
				offset = offset>0 ? 0 : offset;
				$("#playlists-scroller-list-charts").css("margin-left", offset);
				if (preserveTab) {

				} else {
					$(ppiSelector).trigger("click");
				}

			};
			self.bxSliders = {};
			self.chartItems = ko.observableArray([]);
			chartPlaylistItems.forEach(function(o) {
				self.chartItems.push(o);
			});
			self.itemsByRef = {};
			self.dockItemsMe = ko.observableArray([]);
			self.dockItemsFriends = ko.observableArray([]);
			self.allDocks = function() {
				return self.dockItemsMe().concat(self.dockItemsFriends());
			};
			self.lastOpenedTracklistRef = null;
			self.onClick = function(koo) {
				var callback = function(snapshot) {
					console.log(snapshot.val());
				};
				if (self.lastOpenedTracklistRef!==null) {
					self.lastOpenedTracklistRef.off("value", callback);
				}
				self.lastOpenedTracklistRef = koo.base.tracklist;
				koo.base.tracklist.on("value", callback);
			};
			self.getByRef = function(refID) {
				return ko.utils.arrayFirst(self.allDocks(), function(koo) {
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
			self.lastKoo = null;
			var	activeListeners = {};
			self.renamePlaylist = function(koo) {
				var
				titleRef = koo.base.title,
				data = {
					title: "Rename this playlist",
					placeholder: "New playlist name",
					submitmessage: "OK"
				};
				Spank.getInput.show(function(input) {
					input = input ||  "Playlist " + hex_md5(new Date().getTime().toString()).slice(0,5);
					titleRef.set(input);
				}, data)
			};

			self.openPlaylist = function(koo, event) {
				var thisImage = $(event.target),
					titleRef = koo.base.title,
					ownersRef = koo.base.owners,
					writableRef = koo.base.writable,
					tracklistRef = koo.base.tracklist;
				if (self.lastKoo!==null) {
					$.each(activeListeners, function(k,v) {
						self.lastKoo.base[k].off('value',v);
					});
				}
				self.lastKoo = koo;
				Spank.friends.visible(false);
				Spank.tearDownLightBox();
				Spank.charts.current_url("#");
				Spank.charts.resetShoppingCart();
				activeListeners['title'] = titleRef.on('value', function(snapshot) {
					var title = snapshot.val();
					if (title!==null) {
						// NOTE: This is undefined for all results *except* when a user's playlist is open
						Spank.charts.currentPlaylistTitle(title);
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
				activeListeners['tracklist'] = tracklistRef.on('value', function(snapshot) {
					var tracklist = snapshot.val();
					if (tracklist!==null) {
						Spank.charts.pushHistoryImmedietly = true;
						Spank.charts.pushBatch(tracklist, 'replace');
					}
				});
				$(".playlistEntry").removeClass("activePlaylist");
				thisImage.parent().addClass("activePlaylist");
			};
			return self;
		})();

		ko.applyBindings(Head.playlists, document.getElementById('playlistScroller'));

		Head.playlists.goHome();

		function strip(e) {
			return $.trim(e.toLowerCase());
		}

		// Add history items into playlist
		Head.unshiftIntoOpenPlaylist = function(selectedHistoryItems) {
			var isInView = typeof(Spank.charts.currentPlaylistTitle())!=='undefined',
				isMine = Head.playlistProperties.owners().indexOf(Spank.username)===0,
				isWritable = Head.playlistProperties.writable();
			if (selectedHistoryItems.length>0 && isInView && (isMine || isWritable)) {
				var dx = [], tt;
				$.each(selectedHistoryItems, function(i,o) {
					tt = strip(o.artist)+strip(o.title);
					dx.push(tt);
					dx.push(o.url);
				});
				Head.playlists.lastKoo.base.tracklist.transaction(function(currentData) {
					var newArray = [];
					$.each(currentData, function(i, o) {
						var tt = strip(o.artist)+strip(o.title);
						if (dx.indexOf(o.url)>=0 || dx.indexOf(tt)>=0 ) {
							// A track in the existing set matches a track we're trying to insert
						} else {
							newArray.push(o);
						}
					});
					newArray.unshift.apply(newArray, selectedHistoryItems.reverse());
					return newArray;
				});
			} else {
				if (!isInView) {
					window.notify.error("Open a playlist first then add to it.", 'force');
				} else if (selectedHistoryItems.length>0 && !isWritable) {
					window.notify.error("Sorry, you can't add to this playlist.", 'force');
				}
			}
		};

		// New playlist from selected history items
		$("#history-filter-container .icon-save").click(function() {
			var selectedHistoryItems = Spank.history.getCheckedKoos();
			if (selectedHistoryItems.length>0) {
				var
				historyItems = $.map(selectedHistoryItems, function(koo) {
					return ko.toJS(koo);
				}),
				data = {
					title: "Name your new playlist!",
					placeholder: "Playlist " + hex_md5(new Date().getTime().toString()).slice(0,5),
					submitmessage: "OK"
				};
				Spank.getInput.show(function(playname) {
					playname = playname || data.placeholder;
					var saveData = {
						title: playname,
						list: historyItems,
						owners:[Spank.username, 'everyone']
					};
					var newRef = Spank.base.me.child("playlists").push(saveData, function afterSave(ok) {
						window.notify.success("Created new playlist " + playname);
						Spank.base.me.child("playlistRefs").transaction(function(currentData) {
							if (currentData===null) {
								return [newRef.name()];
							} else {
								currentData.push(newRef.name());
								return currentData;
							}
						}, function onComplete(ok) {
							if (!ok) return;
							var ppiSelector = ".playlist-type-btn[value='ppi-me']",
								pSelector = ".playlistThumb[title='#']".replace("#",playname);
							setTimeout(function() {
								$(ppiSelector).trigger("click");
								$(pSelector).trigger("click");
							}, 1000);
						});
					});
				}, data)
			}
		});

		// Add selected history items into open playlist
		$("#history-filter-container .icon-signin").click(function() {
			var selectedHistoryItems = Spank.history.getCheckedKoos();
			if (selectedHistoryItems.length>0) {
				var historyItems = $.map(selectedHistoryItems, function(koo) {
					return ko.toJS(koo);
				});
				Head.unshiftIntoOpenPlaylist(historyItems);
			}
		});

		// Hide the "Add to current playlist" button when we're not
		// looking at a playlist
		Spank.charts.currentPlaylistTitle.subscribe(function(isOpen) {
			var historyOps = $(".icon-signin.historyOpIcons");
			if (typeof(isOpen)==='undefined') {
				historyOps.removeClass("opActive");
			} else if (Spank.history.batchItems().length>0) {
				historyOps.addClass("opActive");
			}
		});

		// Playlist play button
		$(".icon-play.pprop").click(function() {
			// If no playlist tracks are selected, play the whole list,
			// otherwise, play selected playlist tracks
			var shoppingCartItems = Spank.charts.shoppingCart(),
				itemsToPlay = shoppingCartItems.length===0 ? Spank.charts.chartTracks().slice().reverse() : Spank.charts.shoppingCart();
			$.each(itemsToPlay, function(i,o) {
				if (i===(itemsToPlay.length-1)) {
					// This is the last track, do we play it now?
					// NOTE threeSixtyPlayer.lastSound.paused is null if
					// we've not yet played anything before.
					var playNow = threeSixtyPlayer.lastSound!==null ? threeSixtyPlayer.lastSound.paused : true;
					Spank.history.prependToHistory(o, playNow);
				} else {
					Spank.history.prependToHistory(o, false);
				}
			});
			Spank.charts.resetShoppingCart();
		});

		// Toggle selection of playlist items
		$(".icon-check.pprop").click(function() {
			if (Spank.charts.shoppingCart().length===0) {
				$(".mxThumb").trigger("click");
			} else {
				Spank.charts.resetShoppingCart();
			}
		});

		// Delete this playlist
		$(".icon-trash.pprop").click(function() {
			var koo = Head.playlists.lastKoo,
				refId = koo.refID,
				shoppingCartItems = Spank.charts.shoppingCart(),
				playlistItems = Spank.charts.chartTracks();

			function cancel($noty) {
				$noty.close();
			}

			function deletePlaylist($noty) {
				if ($noty) $noty.close();
				Spank.base.me.child('playlistRefs').transaction(function(currentData) {
					// First delete the refID from playlistRef
					var i = currentData.indexOf(refId);
					if (i>=0) {
						currentData.splice(i,1);
						return currentData;
					} else {
						return undefined;
					}
				}, function onComplete(ok) {
					if (ok) {
						// Now delete the actual playlist
						koo.base.root.remove();
					}
				});
			}

			function deleteCartItems($noty) {
				$noty.close();
				if (shoppingCartItems.length===playlistItems.length) {
					window.notify.confirm("Removing all tracks will delete this playlist", function() {
						Spank.charts.resetShoppingCart()
						deletePlaylist();
					});
				} else {
					var dx = [], tt;
					$.each(shoppingCartItems, function(i,o) {
						tt = strip(o.artist)+strip(o.title);
						dx.push(tt);
						dx.push(o.url);
					});
					Head.playlists.lastKoo.base.tracklist.transaction(function(currentData) {
						var newArray = [];
						$.each(currentData, function(i, o) {
							var tt = strip(o.artist)+strip(o.title);
							if (dx.indexOf(o.url)>=0 || dx.indexOf(tt)>=0 ) {
								// A track in the existing set matches a track we're trying to insert
							} else {
								newArray.push(o);
							}
						});
						return newArray;
					});
					Spank.charts.resetShoppingCart();
				}
			}

			(function() {
				var message, buttons = [{addClass: 'btn btn-danger', text: 'Cancel', onClick: cancel}];
				if (shoppingCartItems.length>0) {
					message = "Delete selected tracks?";
					buttons.unshift({addClass: 'btn btn-primary', text: 'OK', onClick: deleteCartItems});
				} else {
					message = "Delete this playlist?";
					buttons.unshift({addClass: 'btn btn-primary', text: 'OK', onClick: deletePlaylist});
				}
				var n = noty({
					text: message,
					type: 'alert',
					dismissQueue: true,
					layout: 'center',
					theme: 'defaultTheme',
					buttons: buttons
				});
			})();

		});

		$("#pprop-writable").click(function() {
			var isTrue = $(this).prop("checked");
			Head.playlists.lastKoo.base.owners.once('value', function(snapshot) {
				var owners = snapshot.val();
				if (owners!==null && owners.indexOf(Spank.username)===0) {
					Head.playlists.lastKoo.base.writable.transaction(function(currentData) {
						return isTrue;
					});
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
						return currentData;
					});
				}
			});
		});

//		$("#playlists-scroller-list-me, #playlists-scroller-list-friends").bxSlider({
//			minSlides: 1,
//			maxSlides: 7,
//			slideWidth: 130,
//			slideMargin: 5,
//			moveSlides: 4
//		});

//		Head.playlists.dockItemsMe.subscribe(function() {
//			var data = Head.playlists.bxSliders['me'];
//			Head.rescanChildren(data);
//		});
//
//		Head.playlists.dockItemsFriends.subscribe(function() {
//			var data = Head.playlists.bxSliders['friends'];
//			Head.rescanChildren(data);
//		});

		//Spank.playlistScroller.push({cover:'/img/emptyplaylist.jpg'});

		Head.playlists.visible.subscribe(function(isTrue) {
			var scroller = $("#playlistScroller"),
				modes = {true: 'removeClass', false: 'addClass'};
			scroller[modes[isTrue]]("docked");
		});

		$("#toggle-dock-button").click(function() {
			var current = Head.playlists.visible();
			Head.playlists.visible(!current);
		});

		var docks = ['charts', 'me', 'friends'],
			PlaylistDocks = {
				charts: ko.observable(false),
				me: ko.observable(false),
				friends: ko.observable(false)
			},
			modes = {true:'show', false: 'hide'};
		$.each(PlaylistDocks, function(key,v) {
			PlaylistDocks[key].subscribe(function(isTrue) {
				if (isTrue) {
					docks.filter(function(name) { return name!==key }).forEach(function(name) {
						PlaylistDocks[name](false);
					});
					$("#ppi-" + key).prop("checked", isTrue);
				}
				$("#playlists-scroller-list-" + key)[modes[isTrue]]();
			});
		});

		PlaylistDocks.charts(true);

		$(".playlist-type-btn").click(function() {
			var name = $(this).attr("value").split("-")[1];
			Head.playlists.visible(true);
			PlaylistDocks[name](true);
		});

		var directionBoxes = $(".sbox-valign");
		directionBoxes.click(function() {
			var direction = $(this).attr("data-direction"),
				targetSlider = $($(".ppi-checkbox:checked").attr("data-target")),
				animate = function() {
					var current = parseInt(targetSlider.css("margin-left")),
						moveBy = direction==='right' ? current-400 : current+400;
					targetSlider.css('margin-left', moveBy);
				};
			animate();
		});

		$(".square-one-valign").click(function() {
			var targetSlider = $($(".ppi-checkbox:checked").attr("data-target"));
			targetSlider.css('margin-left', 0);
		});



//		(function() {
//			var t = new Date().getTime().toString(),
//				name = hex_md5(t).slice(0,5),
//				playlist = {
//					title: ko.observable(name),
//					url: "#",
//					owners: ko.observableArray([Spank.username]),
//					cover: ko.observable('/img/emptyplaylist.jpg'),
//					refID: null,
//					base: null
//				};
//			Head.playlists.push(playlist);
//		})();

	});

})();