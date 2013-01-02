(function(){

	var chartUrls = {
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
			{title: 'last.fm Top', cover: '/img/last_top.png', url: chartUrls.lastfm_top() },
			{title: 'last.fm Loved', cover: '/img/last_loved.png', url: chartUrls.lastfm_loved() },
			{title: 'last.fm Hyped', cover: '/img/last_hyped.png', url: chartUrls.lastfm_hyped() },
			{title: 'Billboards UK', cover: '/img/bill_uk.jpg', url: chartUrls.billboards_uk() },
			{title: 'Billboards US', cover: '/img/bill_us.jpg', url: chartUrls.billboards_us() },
			{title: 'iTunes Store', cover: '/img/iTunes.png', url: chartUrls.itunes_store() }
		];

	$(document).ready(function() {

		$('#playlists-scroller-list-me').bxSlider({
			minSlides: 4,
			maxSlides: 7,
			slideWidth: 130,
			slideMargin: 5,
			moveSlides: 4
		});

		var dereference = function(o) {
			var t;
			if (Array.isArray(o)) {
				t = $.map(o, function(e) {
					return e;
				});
			} else {
				t = {};
				$.each(o, function(k,v) {
					if (o.hasOwnProperty(k)) {
						t[k] = v;
					}
				});
			}
			return t;
		};

		$(document).one("baseReady", function() {
			Spank.bases = {};
			Spank.bases.playlistRefs = Spank.base.me.child("playlistRefs");
			Spank.bases.playlists = Spank.base.me.child("playlists");
			Spank.bases.known = {};
			Spank.bases.playlists.on('child_added', function(snapshot) {
				var o = snapshot.val(),
					playname = o.title,
					playlist = o.list,
					selector = ".playlistThumb[title='@']".replace("@",playname);
				if (!Array.isArray(playlist)) return;
				if ($(selector).length===0) {
					Spank.playlistScroller.push({
						title: playname,
						cover: playlist[0].thumb
					});
				}
				Spank.bases.known[snapshot.name()] = playname;
				Spank.bases[playname] = snapshot.ref();
				Spank.bases[playname].on("value", function(playSnapshot) {
					if (playSnapshot.val()!==null) {
						var o = playSnapshot.val(),
							this_playname = o.title,
							this_playlist = o.list,
							this_selector = ".playlistThumb[title='@']".replace("@", this_playname),
							this_PlaylistThumbnail = $(this_selector),
							isInView = Spank.charts.currentPlaylistTitle()===this_playname;
						Spank.playlists[this_playname] = dereference(this_playlist);
						if (isInView) Spank.charts.pushBatch(this_playlist, 'replace');
						window.notify.information("Playlist updated '" + playname + "'");
						this_PlaylistThumbnail.attr("src", this_playlist[0].thumb);
					}
				});
			});

			Spank.bases.playlists.on('child_removed', function(snapshot) {
				var playlistThatWasRemoved = snapshot.val(),
					playname = playlistThatWasRemoved.title,
					selector = ".playlistThumb[title='@']".replace("@", playname),
					playlistThumbnail = $(selector);
				// If we deleted this branch, then this_playlist === null
				// e.g. it's like calling for an object at a location that doesn't exists
				delete Spank.bases.known[snapshot.name()];
				playlistThumbnail.parent().remove();
				window.notify.error("Deleted playlist " + playname);
				Spank.rescanChildren();
				if (Spank.charts.currentPlaylistTitle()===playname) {
					$(".playlistThumb[title='Billboard UK']").trigger("click");
				}
			});

			Spank.bases.playlists.on('child_changed', function(snapshot) {
				var basename = snapshot.name(),
					o = snapshot.val();
				if ((basename in Spank.bases.known) && (o.title!==Spank.bases.known[basename])) {
					var newname = o.title,
						oldname = Spank.bases.known[basename];
					window.notify.information("Playlist '" + oldname + "' changed to '" + newname + "'");
					Spank.bases[newname] = Spank.bases[oldname];
					Spank.playlists[newname] = Spank.playlists[oldname];
					Spank.bases.known[basename] = newname;
					if (Spank.charts.currentPlaylistTitle()===oldname) {
						Spank.charts.currentPlaylistTitle(newname);
					}
					// Change the attribute attached to the thumb of this playlist
					var selector = ".playlistThumb[title='@']".replace("@", oldname);
					$(selector).attr("title", newname).parent().find(".playlistName").text(newname);
				}
			});

		});

		Spank.playlistScroller = {
			visible: ko.observable(false),
			playlistItems: ko.observableArray([]),
			getPlaylistInScrollerWithName: function(name) {
				var list = ko.utils.arrayFilter(this.playlistItems(), function(item) {
					return item.title===name;
				});
				if (list.length>0) {
					var o = list[0];
					o.index = this.playlistItems.indexOf(o);
					return o;
				} else {
					return null;
				}
			},
			renamePlaylist: function(oldname, newname) {
				var data = {title: newname, list:Spank.playlists[oldname]};
				Spank.bases[oldname].update(data);
			},
			removePlaylistWithName: function(playname) {
				var refID = Spank.bases[playname].name();
				Spank.bases.playlistRefs.transaction(function(currentData) {
					if (currentData!==null) {
						var atIndex = currentData.indexOf(refID);
						currentData.splice(atIndex,1);
					}
					return currentData;
				}, function onComplete(ok) {
					if (ok) {
						console.log("Deleting " + playname);
						Spank.bases[playname].off('value');
						Spank.bases[playname].remove();
						delete Spank.playlists[playname];
					}
				});
			},
			savePlaylist: function(playname, tracklist, callback) {
				var isNewPlaylist = typeof(Spank.bases[playname])==='undefined',
					saveData = {
						title: playname,
						list:tracklist,
						owners:[Spank.username]
					};
				if (isNewPlaylist) {
					var newRef = Spank.bases.playlists.push(saveData, function afterSave(ok) {
						window.notify.success("Created new playlist " + playname);
						Spank.bases[playname] = newRef;
						Spank.bases.playlistRefs.transaction(function(currentData) {
							if (currentData===null) {
								return [newRef.name()];
							} else {
								currentData.push(newRef.name());
								return currentData;
							}
						});
						if (callback) callback();
					});
				} else {
					Spank.bases[playname].transaction(function(currentData) {
						return saveData;
					}, function(newData) {
						if (callback) callback(newData);
					});
				}
			},
			addSongToPlaylist: function(playname, track) {
				var isNewPlaylist = typeof(Spank.playlists[playname])==='undefined',
					isInView = Spank.charts.currentPlaylistTitle()===playname,
					tracklist = [],
					selector = ".playlistThumb[title='@']".replace("@",playname);
				if (!isNewPlaylist) {
					tracklist = Spank.playlists[playname];
				}
				// The 'unshift' argument makes the charts view prepend the track vs. the default append to bottom
				if (isInView) {
					Spank.charts.pushBatch([track], "unshift");
				}
				//deleteDuplicate(track, Spank.playlists[playname]);
				tracklist.unshift(track);
				this.savePlaylist(playname, tracklist);
				if (isNewPlaylist) {
					// Add a new playlist dropzone since we used this one already
					Spank.playlistScroller.push({cover:'/img/emptyplaylist.jpg'});
				}
			},
			push: function(o) {
				var name = hex_md5(String(new Date().getTime())).slice(0,5),
					defaults = {
						title: "Playlist " + name,
						cover: Spank.genericAlbumArt,
						url: '#'
					};
				$.extend(defaults, o);
				defaults.title = ko.observable(defaults.title);
				this.playlistItems.push(defaults);
			}
		};

//		ko.applyBindings(Spank.playlistScroller, document.getElementById('playlists-scroller-list-me'));

		Spank.playlistScroller.playlistItems.subscribe(function(list) {
			Spank.rescanChildren();
		});

		Spank.playlistScroller.visible.subscribe(function(isTrue) {
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
			var current = Spank.playlistScroller.visible();
			Spank.playlistScroller.visible(!current);
		});

		$(document).one("login", function() {
			Spank.playlistScroller.push({cover:'/img/emptyplaylist.jpg'});
			$.each(chartPlaylistItems, function(i,o) {
				// Populate the playlist bar with charts
				Spank.playlistScroller.push(o);
			});
			var selector = ".playlistThumb[title='Billboard UK']";
			$(selector).trigger("click");
		});

		$(".arrowright").click(function() {
			var underlyingArray = Spank.charts.shoppingCart();
			$.each(underlyingArray, function(i,o) {
				if (i===(underlyingArray.length-1)) {
					// NOTE threeSixtyPlayer.lastSound.paused is null if we've not
					// yet played anything before.
					var playNow = threeSixtyPlayer.lastSound!==null ? threeSixtyPlayer.lastSound.paused : true;
					Spank.history.prependToHistory(o, playNow);
				} else {
					Spank.history.prependToHistory(o, false);
				}
			});
			Spank.charts.shoppingCart.removeAll();
			$(".mxThumb").removeClass("selectedPlaylistItem");
		});

		$(".trash").click(function() {
			var playname = Spank.charts.currentPlaylistTitle();
			if (playname) {
				var activeShoppingCart = Spank.charts.shoppingCart(),
					currentPlaylist = Spank.playlists[playname];
				if (activeShoppingCart.length==currentPlaylist.length) {
					// If the user selected all tracks
					if (confirm("Removing all tracks will delete this playlist")) {
						Spank.playlistScroller.removePlaylistWithName(playname);
						$(".playlistThumb[title='Billboards UK']").trigger("click");
						return true;
					} else {
						Spank.charts.shoppingCart.removeAll();
						$(".mxThumb").removeClass("selectedPlaylistItem");
						return false;
					}
				}
				// e.g. [Tracks in View] minus [Tracks in Shopping Cart]
				$.each(Spank.charts.shoppingCart(), function(i,o) {
					Spank.charts.chartTracks.remove(o);
				});
				// After removal, whatever is left on the charts *is* the new playlist!
				Spank.playlistScroller.savePlaylist(playname, Spank.charts.chartTracks());
				Spank.charts.shoppingCart.removeAll();
			} else {
				console.error("Attempted to save playlist but cannot get playlist name");
				Spank.charts.shoppingCart.removeAll();
			}
		});

	});

})();