(function () {

	$(document).one("baseready", function() {

		Head = {
			users: new Firebase("https://wild.firebaseio.com/spank/users/"),
			username: Spank.username
		};

		var Playlist = {};
		Playlist.updatePlaylistWithItem = function(snapshot) {
			var userbase = snapshot.ref().parent().parent(),
				username = userbase.name(),
				playlists = userbase.child("playlists"),
				playlistItemIndex = parseInt(snapshot.name(), 10),
				refID = snapshot.val(),
				thisPlaylistRef = playlists.child(refID),
				existingKoo = Head.playlists.getByRef(refID);
			if (existingKoo===null) {
				// We're not interested in a playlist unless we are one of the owners
				thisPlaylistRef.child("owners").on('value', function(snapshot) {
					var ownersList = snapshot.val();
					if (ownersList!==null) {
						if (ownersList.indexOf(username)>=0 || ownersList.indexOf('everyone')>=0) {
							var playlist = {
								title: ko.observable(""),
								url: "#",
								owners: ko.observableArray(ownersList),
								cover: ko.observable('/img/emptyplaylist.jpg'),
								refID: refID,
								base: Playlist.makeBaseObject(thisPlaylistRef)
							};
							Head.playlists.itemsByRef[refID] = playlist;
							if (ownersList.indexOf(username)===0) {
								Head.playlists.dockItemsMe()[playlistItemIndex] = playlist;
								Head.playlists.dockItemsMe.valueHasMutated();
							} else {
								Head.playlists.dockItemsOthers.unshift(playlist);
							}
							Playlist.watchPlaylistInfo(thisPlaylistRef);
						}
					} else {
						// if ownersList is null, it means a playlistRef we were listening
						// to has just been deleted. Always true?
						//Head.playlists.deletePlaylistItemWithRef(thisPlaylistRef.name());
					}
				});
			} else {
				// What happened here?
			}
		};

		Playlist.watchPlaylistRefsBelongingTo = function(username) {
			var playlistRefs = Head.users.child(username).child("playlistRefs");
			playlistRefs.on('child_added', Playlist.updatePlaylistWithItem);
		};

		Playlist.makeBaseObject = function(ref)  {
			var base = {};
			base.root = ref;
			base.owners = ref.child("owners");
			base.title = ref.child("title");
			base.tracklist = ref.child("list");
			return base;
		};

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
		Spank.base.me.child("playlistRefs").on("value", function(snapshot) {
			var currentLayout = snapshot.val();
			if (currentLayout!==null) {
				var newDockItems = $.map(currentLayout, function(refID) {
					var playlist = Head.playlists.itemsByRef[refID];
					if (playlist!==undefined) return playlist;
				});
				Head.playlists.dockItemsMe(newDockItems);
			} else {
				Head.playlists.dockItemsMe([]);
			}
		});
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
			self.itemsByRef = {};
			self.dockItemsMe = ko.observableArray([]);
			self.dockItemsOthers = ko.observableArray([]);
			self.allDocks = function() {
				return self.dockItemsMe().concat(self.dockItemsOthers());
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
				[self.dockItemsMe, self.dockItemsOthers].forEach(function(dock) {
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

		Head.playlists.visible.subscribe(function(isTrue) {
			var button = $(".hideshow-playlist-button"),
				scroller = $("#playlistScroller");
			if (isTrue) {
				scroller.animate({bottom: '0px'}, 500, 'swing', function(){
					button.text("Hide Playlists");
				});
			} else {
				scroller.animate({bottom: '-160px'}, 500, 'swing', function() {
					button.text("Show Playlists");
				});
			}
		});

		$(".hideshow-playlist-button").click(function() {
			var current = Head.playlists.visible();
			Head.playlists.visible(!current);
		});

		(function() {
			var t = new Date().getTime(),
				name = hex_md5(String(t)).slice(0,5),
				playlist = {
					title: ko.observable(name),
					url: "#",
					owners: ko.observableArray([Spank.username]),
					cover: ko.observable('/img/emptyplaylist.jpg'),
					refID: null,
					base: null
			};
			Head.playlists.push(playlist);
		})();

	});

})();