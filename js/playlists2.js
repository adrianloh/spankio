(function () {

	var
	chartUrls = {
		lastfm_base: "http://ws.audioscrobbler.com/2.0/?method=METHOD&page=1&limit=200&api_key=0325c588426d1889087a065994d30fa1&format=json&callback=?",
		billboards_base: "http://api.musixmatch.com/ws/1.1/chart.tracks.get?page=1&page_size=100&country=#&f_has_lyrics=1&apikey=316bd7524d833bb192d98be44fe43017&format=jsonp&callback=?",
		lastfm_hyped: function () { return this.lastfm_base.replace("METHOD","chart.gethypedtracks"); },
		lastfm_top: function () { return this.lastfm_base.replace("METHOD","chart.gettoptracks"); },
		lastfm_loved: function () { return this.lastfm_base.replace("METHOD","chart.getlovedtracks"); },
		billboards_uk: function () { return this.billboards_base.replace("#","uk"); },
		billboards_us: function () { return this.billboards_base.replace("#","us"); },
		itunes_store: function () { return "https://itunes.apple.com/us/rss/topsongs/limit=300/explicit=true/json"; }
	},
	chartPlaylistItems = [
		{title: 'Billboards UK', cover: '/img/bill_uk.jpg', url: chartUrls.billboards_uk() },
		{title: 'Billboards US', cover: '/img/bill_us.jpg', url: chartUrls.billboards_us() },
		{title: 'last.fm Top', cover: '/img/last_top.png', url: chartUrls.lastfm_top() },
		{title: 'last.fm Loved', cover: '/img/last_loved.png', url: chartUrls.lastfm_loved() },
		{title: 'last.fm Hyped', cover: '/img/last_hyped.png', url: chartUrls.lastfm_hyped() },
		{title: 'iTunes Store', cover: '/img/iTunes.png', url: chartUrls.itunes_store() }
	];

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
						// if ownersList is suddenly null, it means a playlistRef we were listening
						// to has just been deleted. Always true?
						Head.playlists.deletePlaylistItemWithRef(refID);
					}
				});

				thisPlaylistRef.child("owners").on("child_removed", function(snapshot) {
					var username = snapshot.val();
					if (username===Spank.username || username==='everyone') {
						// The owner of this playlist has stopped sharing with
						// either me or, everyone
						Head.playlists.deletePlaylistItemWithRef(refID);
					}
				})

			} else {
				// What happened here?
			}
		};

		Playlist.watchPlaylistRefsBelongingTo = function(username) {
			var playlistRefs = Head.users.child(username).child("playlistRefs");
			//console.log("Watching " + username + "'s playlists");
			playlistRefs.on('child_added', Playlist.updatePlaylistWithItem);
		};

		Spank.watchPlaylistRefsBelongingTo = Playlist.watchPlaylistRefsBelongingTo;

		Playlist.watchPlaylistInfo = function(playlistRef) {
			var titleRef = playlistRef.child("title"),
				coverRef = playlistRef.child("list").child("0");
			// Listen for changes of playlist tiles
			titleRef.on('value', function(snapshot) {
				var refID = snapshot.ref().parent().name(),
					newValue = snapshot.val(),
					koo = Head.playlists.getByRef(refID);
				if (newValue!==null && koo!==null) {
					koo.title(newValue);
				}
			});
			// Listen for changes of playlist covers
			coverRef.on('value', function(snapshot) {
				var refID = snapshot.ref().parent().parent().name(),
					newValue = snapshot.val(),
					koo = Head.playlists.getByRef(refID);
				if (newValue!==null && newValue.hasOwnProperty("thumb") && koo!==null) {
					koo.cover(newValue.thumb);
				}
			});
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
					var index = dock.indexOf(koo),
						lastIndex = dock().length-1;
					if (index>=0) dock.remove(koo);
				});
			};
			self.moveState = (function() {
				var base = Head.users.child("restbeckett"),
					playlistRefs = base.child("playlistRefs");
				var	lastState = null;
				var refIDList = function(dockItem) {
					return $.map(dockItem, function(o) {
						return o.refID;
					});
				};
				return {
					beforeMovePlaylistItem:function() {
						lastState = [];
						$.extend(lastState, self.dockItemsMe());
					},
					afterMovePlaylistItem:function() {
						var currentRefState = refIDList(self.dockItemsMe()),
							lastRefState = refIDList(lastState);
						playlistRefs.transaction(function(currentData) {
							if (JSON.stringify(currentData)!==JSON.stringify(lastRefState)) {
								self.dockItemsMe(lastState);
								return undefined;
							} else {
								return currentRefState;
							}
						});
					}
				};
			})();
			return self;
		})();

		ko.applyBindings(Head.playlists, document.getElementById('playlistScroller'));

		var ppiSelector = ".playlist-type-btn[value='ppi-charts']",
			pSelector = ".playlistThumb[title='Billboards UK']";
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
			var button = $(".toggle-playlist-btn"),
				scroller = $("#playlistScroller"),
				modes = {true: 'removeClass', false: 'addClass'};
			button.children(0).toggleClass("icon-chevron-down icon-chevron-up");
			scroller[modes[isTrue]]("docked");
		});

		$(".toggle-playlist-btn").click(function() {
			var current = Head.playlists.visible();
			Head.playlists.visible(!current);
		});

		var docks = ['charts', 'me', 'friends'],
			PlaylistDocks = {
				charts: ko.observable(true),
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
				}
				$("#ppi-" + key).prop("checked", isTrue);
				$("#playlists-scroller-list-" + key)[modes[isTrue]]();
			});
		});

		$(".playlist-type-btn").click(function() {
			var name = $(this).attr("value").split("-")[1];
			Head.playlists.visible(true);
			PlaylistDocks[name](true);
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