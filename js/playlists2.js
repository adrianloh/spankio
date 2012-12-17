(function () {

	$(document).ready(function() {

		Head = {
			users: new Firebase("https://wild.firebaseio.com/spank/users/")
		};

		Playlist = {
			check: {
				isAPlaylistObject: function(playlist) {
					return (playlist !== null
						&& playlist.hasOwnProperty("title")
						&& playlist.hasOwnProperty("tracklist")
						&& Array.isArray(playlist.tracklist));
				},
				meAllowed: function(username, playlist) {
					return (playlist.hasOwnProperty('owners')
						&& playlist.owners.indexOf(username) >= 0);
				}
			},
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
						newValue = snapshot.val();
					if (newValue!==null && Head.playlists.itemsByRef.hasOwnProperty(refID)) {
						Head.playlists.itemsByRef[refID].title(newValue);
					}
				});

				coverRef.on('value', function(snapshot) {
					var refID = snapshot.ref().parent().parent().name(),
						newValue = snapshot.val();
					if (newValue!==null && Head.playlists.itemsByRef.hasOwnProperty(refID)) {
						Head.playlists.itemsByRef[refID].cover(newValue.thumb);
					}
				});

			},
			updatePlaylistItem: function(refID) {
				return function(snapshot) {
					var track = snapshot.val(),
						dockItems = Head.playlists.itemsByRef;
					if (track!==null && dockItems.hasOwnProperty(refID)) {
						var tracklist = dockItems[refID].tracklist,
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

		Head._watchPlaylistsBelongingTo = function (username) {
			var base = Head.users.child(username),
				playlists = base.child("playlists");
			playlists.on('child_added', function (snapshot) {
				var playlist = snapshot.val();
				if (Playlist.check.isAPlaylistObject(playlist) && Playlist.check.meAllowed(username, playlist)) {
					if (playlist.tracklist.length===0) {
						snapshot.ref().remove();
					} else {
						playlist.base = Playlist.makeBaseObject(snapshot.ref()) ;
						playlist.url = "#";
						playlist.cover = playlist.list[0].thumb;
						playlist.refID = snapshot.name();
						Head.playlists.injectNewPlaylist(playlist);
						// For each playlist item, listen for changes on "title"
						playlist.base.title.on('value', function(current_snapshot) {
							var refID = current_snapshot.ref().parent().name(),
								playlistName = current_snapshot.val();
							if (playlistName!==null
								&& Head.playlists.itemsByRef.hasOwnProperty(refID)) {
								Head.playlists.itemsByRef[refID].title(playlistName);
							}
						});

						// For each playlist item, listen for changes on "tracklist"
						var tracklistRef = playlist.base.tracklist;
						tracklistRef.on('child_changed', Playlist.updatePlaylistItem(playlist.refID));
						tracklistRef.on('child_added', Playlist.updatePlaylistItem(playlist.refID));
						tracklistRef.on('child_removed', function(snapshot) {

						});

					}
				}
			});
		};

		Head.watchPlaylistsBelongingTo = function (username) {
			var base = Head.users.child(username),
				playlistRefs = base.child("playlistRefs"),
				playlists = base.child("playlists");
			playlistRefs.on('child_added', function (snapshot) {
				var refID = snapshot.val(),
					thisPlaylistRef = playlists.child(refID);
				thisPlaylistRef.child("owners").on('value', function(snapshot) {
					var ownersList = snapshot.val();
					if (ownersList.indexOf(username)>=0) {
						var playlist = {};
						playlist.url = "#";
						playlist.owners = ownersList;
						playlist.base = Playlist.makeBaseObject(thisPlaylistRef);
						playlist.refID = thisPlaylistRef.name();
						Head.playlists.injectNewPlaylist(playlist);
						setTimeout(function () {
							Playlist.watchPlaylistInfo(thisPlaylistRef);
						},0)
					}
				});
			});
		};

		Head.playlists = (function () {
			var self = {};
			self.dockItems = ko.observableArray([]);
			self.itemsByRef = {};
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