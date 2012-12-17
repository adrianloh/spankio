(function () {

	$(document).ready(function() {

		Head = {
			users: new Firebase("https://wild.firebaseio.com/spank/users/")
		};

		var Playlist = {
			makeBaseObject: function(ref) {
				var base = {};
				base.root = ref;
				base.owners = ref.child("owners");
				base.title = ref.child("title");
				base.tracklist = ref.child("tracklist");
				return base;
			},
			watchPlaylistInfo: function(playlistRef) {
				var titleRef = playlistRef.child("title"),
					coverRef = playlistRef.child("list").child("0");

				titleRef.on('value', function(snapshot) {
					var refID = snapshot.ref().parent().name(),
						newValue = snapshot.val(),
						existing = Head.playlists.getByRef(refID);
					if (newValue!==null && existing!==null) {
						existing.map[refID].title(newValue);
					}
				});

				coverRef.on('value', function(snapshot) {
					var refID = snapshot.ref().parent().parent().name(),
						newValue = snapshot.val(),
						existing = Head.playlists.getByRef(refID);
					if (newValue!==null && existing!==null) {
						existing.map[refID].cover(newValue.thumb);
					}
				});

			},
			updatePlaylistItem: function(refID) {
				return function(snapshot) {
					var track = snapshot.val(),
						existing = Head.playlists.getByRef(refID);
					if (track!==null && existing!==null) {
						var tracklist = existing.dock,
							atIndex = parseInt(snapshot.name(), 10),
							koo = {};
						$.each(track, function(k,v) {
							koo[k] = ko.observable(v);
						});
						tracklist()[atIndex] = koo;
						tracklist.valueHasMutated();
					} else {
						console.error(track);
					}
				};
			}
		};

		Head.watchPlaylistsBelongingTo = function (username) {
			var base = Head.users.child(username),
				playlistRefs = base.child("playlistRefs"),
				playlists = base.child("playlists");
			playlistRefs.on('child_added', updatePlaylistWithItem);
			playlistRefs.on('child_changed', updatePlaylistWithItem);
		};

		var updatePlaylistWithItem = function(snapshot) {
			var userbase = snapshot.ref().parent().parent(),
				username = userbase.name(),
				playlists = userbase.child("playlist"),
				playlistItemIndex = parseInt(snapshot.name(), 10),
				refID = snapshot.val(),
				thisPlaylistRef = playlists.child(refID),
				existing = Head.playlists.getByRef(refID);
			if (existing!==null) {
				var targetDock = existing.dock,
					targetMap = existing.map;
				targetDock()[playlistItemIndex] = targetMap[refID];
				targetDock.valueHasMutated();
			} else {
				thisPlaylistRef.child("owners").on('value', function(snapshot) {
					var ownersList = snapshot.val();
					if (ownersList.indexOf(username)>=0) {
						var playlistModel = Head.playlists,
							playlist = {};
						playlist.title = ko.observable("");
						playlist.url = "#";
						playlist.owners = ko.observableArray(ownersList);
						playlist.cover = ko.observable('/img/emptyplaylist.png');
						playlist.base = Playlist.makeBaseObject(thisPlaylistRef);
						if (ownersList.indexOf(username)===0) {
							playlistModel.itemsByRefMe[refID] = playlist;
							playlistModel.dockItemsMe()[playlistItemIndex] = playlistModel.itemsByRefMe[refID];
							playlistModel.dockItemsMe.valueHasMutated();
						} else {
							playlistModel.itemsByRefOthers[refID] = playlist;
							playlistModel.dockItemsOthers.unshift(playlistModel.itemsByRefOthers[refID]);
						}
						setTimeout(function () {
							Playlist.watchPlaylistInfo(thisPlaylistRef);
						},0)
					}
				});
			}
		};

		Head.playlists = (function () {
			var self = {};
			self.dockItemsMe = ko.observableArray([]);
			self.dockItemsOthers = ko.observableArray([]);
			self.itemsByRefMe = {};
			self.itemsByRefOthers = {};
			self.getByRef = function(refID) {
				var docks = [self.dockItemsMe, self.dockItemsOthers],
					map = [self.itemsByRefMe, self.itemsByRefOthers],
					choose = $.map(map, function(o) {
						return o.hasOwnProperty(refID);
					}),
					which = choose.indexOf(true);
				if (which>=0) {
					return {
						dock: docks[which],
						map: map[which]
					}
				} else {
					return null;
				}
			};
			self.inject = function(playlist) {
				playlist.title = ko.observable(playlist.title);
				playlist.owners = ko.observableArray(playlist.owners);
				playlist.cover = ko.observable(playlist.cover);
				if (playlist.hasOwnProperty("refID")) {
					self.itemsByRef[playlist.refID] = playlist;
				}
				self.dockItems.push(playlist);
			};
			self.injectNewPlaylist = function(override) {
				var name = hex_md5(String(new Date().getTime())).slice(0,5),
					emptyPlaylist = {
						title: "Untitled playlist " + name,
						cover: '/img/emptyplaylist.png',
						owners: [],
						tracklist: []
					};
				$.extend(emptyPlaylist, override);
				self.inject(emptyPlaylist);
			};
			return self;
		})();

		Head.watchPlaylistsBelongingTo("restbeckett");

	});

})();