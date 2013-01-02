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
		ES: "Spain"
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
							if (Head.playlists.itemsByRef.hasOwnProperty(refID)) return;
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
								Head.playlists.dockItemsMe()[playlistItemIndex] = playlist;
								Head.playlists.dockItemsMe.valueHasMutated();
							} else {
								Head.playlists.dockItemsFriends.unshift(playlist);
							}
							Playlist.watchPlaylistInfo(thisPlaylistRef);
						}
					} else {
						// If ownersList is suddenly null, it means a playlistRef we were listening
						// to has just been deleted. Always true?
						Playlist.unwatchPlaylistInfo(thisPlaylistRef);
						Head.playlists.deletePlaylistItemWithRef(refID);
					}
				});

				thisPlaylistRef.child("owners").on("child_removed", function(snapshot) {
					var username = snapshot.val();
					if (username===Spank.username || username==='everyone') {
						// The owner of this playlist has stopped sharing with
						// either me or, everyone
						Playlist.unwatchPlaylistInfo(thisPlaylistRef);
						Head.playlists.deletePlaylistItemWithRef(refID);
					}
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
			self.withEveryone = ko.observable(null);
			self.sharedWith = ko.computed(function() {
				var everyone = self.owners().indexOf("everyone")>=0,
					nobody = self.owners().length<=1;
				if (everyone) {
					if (self.writable()) {
						return "Editable by anyone";
					} else {
						return "Shared with everyone";
					}
				} else if (nobody) {
					return "Private";
				} else {
					return "Shared with " + self.owners().length + " people";
				}
			});
			self.isMine = ko.computed(function() {
				return self.owners().indexOf(Spank.username)===0;
			});
			return self;
		})();

		ko.applyBindings(Head.playlistProperties, document.getElementById('playlistProperties'));

		Head.playlists = (function () {
			var self = {};
			self.visible = ko.observable(true);
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
			var lastKoo = null,
				activeListeners = {};
			self.openPlaylist = function(koo, event) {
				var thisImage = $(event.target),
					titleRef = koo.base.title,
					ownersRef = koo.base.owners,
					writableRef = koo.base.writable,
					tracklistRef = koo.base.tracklist;
				if (lastKoo!==null) {
					$.each(activeListeners, function(k,v) {
						lastKoo.base[k].off('value',v);
					});
				}
				lastKoo = koo;
				Spank.charts.current_url("#");
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
					console.log(isWritable);
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
						Spank.charts.pushBatch(tracklist, 'replace');
					}
				});
				$(".playlistEntry").removeClass("activePlaylist");
				thisImage.parent().addClass("activePlaylist");
			};

			$("#pprop-writable").click(function() {
				var isTrue = $(this).prop("checked");
				lastKoo.base.owners.once('value', function(snapshot) {
					var owners = snapshot.val();
					if (owners!==null && owners.indexOf(Spank.username)===0) {
						lastKoo.base.writable.transaction(function(currentData) {
							return isTrue;
						});
					}
				});
			});

			$("#pprop-everyone").click(function() {
				var isTrue = $(this).prop("checked");
				lastKoo.base.owners.once('value', function(snapshot) {
					var owners = snapshot.val();
					if (owners!==null && owners.indexOf(Spank.username)===0) {
						lastKoo.base.owners.transaction(function(currentData) {
							if (isTrue) {
								currentData.push("everyone")
							} else {
								currentData = currentData.filter(function(e) {
									return e!=='everyone';
								})
							}
							return currentData;
						});
					}
				});
			});
			return self;
		})();

		ko.applyBindings(Head.playlists, document.getElementById('playlistScroller'));

		var ppiSelector = ".playlist-type-btn[value='ppi-charts']",
			pSelector = ".playlistThumb[title='Billboard UK']";
		$(ppiSelector).trigger("click");
		$(pSelector).trigger("click");

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
			var button = $("#toggle-dock-button"),
				scroller = $("#playlistScroller"),
				modes = {true: 'removeClass', false: 'addClass'};
			button.children(0).toggleClass("icon-caret-down icon-caret-up");
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