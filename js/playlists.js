(function(){

	var chartUrls = {
		lastfm_base:"http://ws.audioscrobbler.com/2.0/?method=METHOD&page=1&limit=200&api_key=0325c588426d1889087a065994d30fa1&format=json&callback=?",
		billboards_base:"http://api.musixmatch.com/ws/1.1/chart.tracks.get?page=1&page_size=100&country=#&f_has_lyrics=1&apikey=316bd7524d833bb192d98be44fe43017&format=jsonp&callback=?",
		lastfm_hyped:function () { return this.lastfm_base.replace("METHOD","chart.gethypedtracks"); },
		lastfm_top:function () { return this.lastfm_base.replace("METHOD","chart.gettoptracks"); },
		lastfm_loved:function () { return this.lastfm_base.replace("METHOD","chart.getlovedtracks"); },
		billboards_uk:function () { return this.billboards_base.replace("#","uk"); },
		billboards_us:function () { return this.billboards_base.replace("#","us"); },
		itunes_store:function () { return "https://itunes.apple.com/us/rss/topsongs/limit=300/explicit=true/json"; }
	};
	var chartPlaylistItems = [
		{title:'last.fm Top', cover:'/img/last_top.png', url: chartUrls.lastfm_top() },
		{title:'last.fm Loved', cover:'/img/last_loved.png', url: chartUrls.lastfm_loved() },
		{title:'last.fm Hyped', cover:'/img/last_hyped.png', url: chartUrls.lastfm_hyped() },
		{title:'Billboards UK', cover:'/img/bill_uk.jpg', url: chartUrls.billboards_uk() },
		{title:'Billboards US', cover:'/img/bill_us.jpg', url: chartUrls.billboards_us() },
		{title:'iTunes Store', cover:'/img/iTunes.png', url: chartUrls.itunes_store() }
	];

	$(document).ready(function() {

		Spank.playlistScroller = {
			playlistItems: ko.observableArray([]),
			getPlaylistWithName: function(name) {
				var list = ko.utils.arrayFilter(this.playlistItems(), function(item) {
					return item.title===name;
				});
				if (list.length>0) {
					var o = list[0];
					o.index = this.playlistItems.indexOf(o);
					return o
				} else {
					return null;
				}
			},
			renamePlaylist: function(oldname, newname, element) {
				var o = this.getPlaylistWithName(oldname);
				o.title = newname;
				if (Spank.charts.currentPlaylistTitle===oldname) {
					Spank.charts.currentPlaylistTitle = newname;
				}
				this.savePlaylist(newname, Spank.userData.playlists[oldname]);
				$(element).find(".playlistThumb").attr("title", newname);
				delete Spank.userData.playlists[oldname];
				Spank.userData.save({playlists:Spank.userData.playlists}, {
					success: function(o) {
						console.warn("Renamed playlist " + oldname + ' --> ' + newname);
					}
				});
			},
			removePlaylistWithName: function(playname) {
				var o = this.getPlaylistWithName(playname),
					selector = ".playlistThumb[title='@']".replace("@",playname),
					that = this;
				delete Spank.userData.playlists[playname];
				Spank.userData.save({playlists:Spank.userData.playlists}, {
					success: function(o) {
						console.warn("Deleted playlist " + playname);
						$(selector).parent().remove();
						that.playlistItems.remove(o);
					}
				});
			},
			savePlaylist: function(playname, tracklist) {
				var saveList = JSON.parse(JSON.stringify(tracklist));   // !! IMPORTANT !! Dereference the objects in tracklist from their original...
				Spank.userData.playlists[playname] = saveList;
				Spank.userData.save({playlists:Spank.userData.playlists}, {
					success: function(o) {
						var savedTracklist = Spank.userData.playlists[playname],
							selector = ".playlistThumb[title='@']".replace("@",playname);
						$(selector).attr('src', savedTracklist[0].thumb);
						console.warn("Saved " + savedTracklist.length + ' items into playlist ' + playname);
						//Spank.charts.shoppingCart.removeAll();
					}
				});
			},
			addSongToPlaylist: function(playname, track) {
				var userData = Spank.userData,
					isNewPlaylist = typeof(userData.playlists[playname])==='undefined',
					isInView = Spank.charts.currentPlaylistTitle === playname;
				if (isNewPlaylist) {
					userData.playlists[playname] = [];
				}
				if (isInView) {
					// The true argument makes the charts view prepend the track vs. the default append to bottom
					Spank.charts.pushBatch([track], true);
				}
				userData.playlists[playname].unshift(track);
				this.savePlaylist(playname, userData.playlists[playname]);
				if (isNewPlaylist) {
					Spank.playlistScroller.push({cover:'/img/emptyplaylist.png'});
				}
			},
			push: function(o) {
				var default_item = {
					title: "Playlist " + hex_md5(String(new Date().getTime())).slice(0,5),
					cover: Spank.genericAlbumArt,
					url: '#'
				};
				default_item.title = o.title ? o.title : default_item.title;
				default_item.cover = o.cover ? o.cover : default_item.cover;
				default_item.url = o.url ? o.url : default_item.url;
				this.playlistItems.push(default_item);
			}
		};

		ko.applyBindings(Spank.playlistScroller, document.getElementById('playlistScroller'));

		var scroller_config = {
			width:"100%",
			auto: false,
			scroll:{items:2},
			prev: "#foo2_prev",
			next: "#foo2_next"
		};

		$("#playlists-scroller-list").carouFredSel(scroller_config);
		Spank.playlistScroller.playlistItems.subscribe(function(list) {
			console.log("Added playlist " + list[list.length-1].title);
			$("#playlists-scroller-list").carouFredSel(scroller_config);
		});

		$(document).one("userDataLoaded", function firstLoadOfUserPlaylists() {
			Spank.userData.playlists = Spank.userData.get("playlists") || {};
			$.each(Spank.userData.playlists, function(pname,plist) {
				Spank.playlistScroller.push({
					title:pname,
					cover:plist[0].thumb
				});
			});
		});

		Spank.playlistScroller.push({cover:'/img/emptyplaylist.png'});
		$.each(chartPlaylistItems, function(i,o) {
			// Populate the playlist bar with charts
			Spank.playlistScroller.push(o);
			if (i===chartPlaylistItems.length-1) {
				// After injecting the very last Playlist item, fill the results section
				// with one of the charts... note that we wait a bit first to let FB do
				// it's thing cause once this starts, all the bandwidth will be sucked
				// by downloading album art!
				var t1 = setTimeout(function() {
					$(".playlistThumb[title='Billboards UK']").trigger("click");
					clearTimeout(t1);
				},2000);
			}
		});

		var appendToResults = function(title, url, tracklist, this_image, reset) {
			var highlightCurrentPlaylistItem = function(this_image) {
				var default_color = "5px solid rgb(204, 204, 204)",
					highlight_border = "5px solid rgb(28, 205, 213)";
				$(".playlistEntry").filter(function () {
					return $(this).css("border")===highlight_border;
				}).css("border", default_color);
				this_image.parent().css("border", highlight_border);
			};
			Spank.charts.currentPlaylistTitle = title;  // NOTE: This is undefined for all results *except* when a user's playlist is open
			Spank.charts.current_url = url;             // This is "#" when a user's playlist is open
			if (reset) {
				// E.g. the first time we click on a playlist item and load new results...
				highlightCurrentPlaylistItem(this_image);
				Spank.charts.chartTracks.removeAll();
			}
			Spank.charts.pushBatch(tracklist);
			Spank.charts.ok_to_fetch_more = true;
		};

		var useCacheResults = true, // Use localStorage to cache JSONs returned from external APIs
			resultsCache = {};
		if (typeof(localStorage.resultsCache)==='undefined') {
			localStorage.resultsCache = JSON.stringify(resultsCache);
		} else {
			resultsCache = JSON.parse(localStorage.resultsCache);
		}

		var last_request_time = new Date().getTime()-5000;
		$(".playlistThumb").live("click", function onClickPlaylistThumbnail(event, myUrl) {
			// Note, we also artificially trigger this event when we're autopaging. In
			// which case myUrl (usually page=2||page=3, etc.) is used, otherwise the url
			// is gotten from the playlist thumbnail itself.
			var this_image = $(this),
				tracklist,
				url = myUrl || $(this).attr("url"),
				timeNow = new Date().getTime(),
				timeDelta = timeNow - last_request_time,
				fetchNew = true;
			if (url==="#") {                            // This is a user playlist
				var title = this_image.attr("title"); // Note: ONLY USER PLAYLISTS HAVE TITLES!
				tracklist = Spank.userData.playlists[title];
				//console.warn("Clicked on playlist: " + title);
				if (tracklist!=null) {
					//console.warn("Opening " + title + " with " + tracklist.length + " items.");
					appendToResults(title, url, tracklist, this_image, true);
				} else {
					alert("Aiks! Empty playlist. Drag a thumbnail from your stream to start adding to this playlist");
				}
				return false;
			} else if (url.match(/http/) && resultsCache[url] && useCacheResults) {
				var stored = resultsCache[url],
					timeSinceLastCache = new Date().getTime()-stored.timestamp;
				if (timeSinceLastCache<86400000) { // Keep cache for 24 hours
					appendToResults(title, url, stored.data, this_image, (!myUrl));
					return false;
				}
			} else if (timeDelta<2000) {
				// Not enough time between calls to an external api
				return false;
			}
			if (fetchNew) {
				$("html").addClass('busy');
				this_image.css('cursor','wait');
				$.getJSON(url, function(res) {
					if (res.hasOwnProperty("message")) {        // MusiXMatch
						tracklist = res.message.body.track_list;
					} else if (res.hasOwnProperty("feed")) {    // iTunes
						tracklist = res.feed.entry;
					} else if (res.hasOwnProperty("tracks")) {  // LastFM
						tracklist = res.tracks.track;
					} else {                                    // Our own playlist, which is just a plain array
						tracklist = res;
					}
					if (tracklist.length>0) {
						appendToResults(title, url, tracklist, this_image, (!myUrl));
						resultsCache[url] = {
							timestamp:new Date().getTime(),
							data:tracklist
						};
						try {
							localStorage.resultsCache = JSON.stringify(resultsCache);
						} catch(err) {
							// QUOTA_EXCEEDED_ERR: DOM Exception 22
							// Destroy the cache once we come across an error
							localStorage.resultsCache = JSON.stringify({});
						}
					} else {
						Spank.charts.ok_to_fetch_more = false;
					}
					$("html").removeClass('busy');
					this_image.css('cursor','pointer');
				});
			}
			last_request_time = new Date().getTime();
		});

		$(".arrowright").click(function() {
			var underlyingArray = Spank.charts.shoppingCart();
			$.each(underlyingArray, function(i,o) {
				var playNow = i===(underlyingArray.length-1);
				Spank.history.prependToHistory(o, threeSixtyPlayer.lastSound.paused);
			});
			Spank.charts.shoppingCart.removeAll();
			$(".mxThumb").removeClass("selectedPlaylistItem");
		});

		$(".trash").click(function() {
			var playname = Spank.charts.currentPlaylistTitle;
			if (playname) {
				var activeShoppingCart = Spank.charts.shoppingCart(),
					currentPlaylist = Spank.userData.playlists[playname];
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

		$(".hideshow-playlist-button").click(function() {
			var button = $(this),
				scroller = $("#playlistScroller");
			if (scroller.css("bottom") >= '0px') {
				// Hide playlists
				scroller.animate({bottom: '-200px'}, 500, 'swing', function() {
					button.text("Show Playlists");
				});
			} else {
				// Reveal playlists
				scroller.animate({bottom: '0px'}, 500, 'swing', function(){
					button.text("Hide Playlists");
				});
			}
		});

	});


})();