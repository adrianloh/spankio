/*global document, window, Spank, ko */

ko.bindingHandlers.koChartItems = {
	init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
		var data = valueAccessor();
		if (data.hasOwnProperty('gift')) {
			delete data.gift;
		}
		var e = $(element),
			tickCheckMark = e.find(".tick_chartItem"),
			mxThumb = e.find(".mxThumb"),
			moremoremoreButton = e.find(".moremoremore"),
			userPlaylistIsOpen = Spank.charts.userPlaylistIsOpen;
		data.__position__ = e.offset().top;
		e.data('koo', data);
		if (userPlaylistIsOpen()) {
//			e.addClass("userPlaylistChartItem");
//			mxThumb.attr("src", data.thumb);
		} else {
//			mxThumb.addClass("veiled");
//			mxThumb.attr("data-src", data.thumb);
		}
		e.hover(function mouseenter() {
//			sideTrackPlayButton.show();
			moremoremoreButton.show();
			if (userPlaylistIsOpen()) {
				tickCheckMark.addClass("tick_chartItem_hover");
			}
		}, function mouseleave() {
//			sideTrackPlayButton.hide();
			moremoremoreButton.hide();
			tickCheckMark.removeClass("tick_chartItem_hover");
		})
	}
};


(function() {

	var DeepFeeze = (function() {
		var self = {};
		self.put = function(target, refID, data) {
			data = JSON.stringify(data);
			if (target==='sessionStorage') {
				sessionStorage[refID] = data;
			}
			if (target==="S3") {
				$.ajax({
					url: "https://spankio-bookmarks.s3.amazonaws.com/" + refID + ".json",
					type: "PUT",
					headers: {
						"Cache-Control":"max-age=315360000",
						"x-amz-storage-class": "REDUCED_REDUNDANCY"
					},
					contentType: "application/json",
					data: data,
					success: function(results) {
						//window.notify.information(results);
					}
				});
			}
		};
		self.get = function(refID, callback) {
			if (sessionStorage.hasOwnProperty(refID)) {
				var data = JSON.parse(sessionStorage[refID]);
				callback(data);
			} else {
				callback(null);
			}
		};
		return self;
	})();

	$(document).ready(function() {

		var self = Spank.charts;
		self.refID = ko.observable("");
		self.userPlaylistIsOpen = ko.computed(function() {
			return self.refID().match(/^-/)!==null;
		});

		function playlistInfoTop() {
			return self.userPlaylistIsOpen() ? 110 : 120;
		}

		var userPlaylistPropertiesOffset = 34;

		(function coolScroll() {
			var $e = $("#playlistInfo"),        // The plain bigTitle you see all the time, along with the number of items in view
				$ee = $("#playlistProperties"), // The extra shit you see when a user's playlist is open
				$e_last = $e.position().top,
				last_position = $("#autopageContent").position().top,
				max = 67,
				newMax = 0,
				fadeBackground = true;
			$("#resultsSection").scroll(function(e) {
				try {
					var first_pos = playlistInfoTop(),
						opsActive = $("#batchOperations").css("display")!=='none',
						curr_position = $("#autopageContent").position().top,
						new_pos, delta;
					delta = curr_position-last_position;
					var top_of_list = $(".trackEntry").first().position().top;
					newMax = opsActive ? max + 44 : max;
					if (delta<0) {
						// Scrolling down to see more
						new_pos = $e_last-Math.abs(delta);
					} else {
						// Scrolling back up towards first item
						new_pos = $e_last+Math.abs(delta);
					}
					if (new_pos<=newMax || top_of_list<=first_pos) new_pos = newMax;
					if (new_pos>first_pos) new_pos = first_pos;
					$e.css("top", new_pos);
					$ee.css("top", new_pos + userPlaylistPropertiesOffset);
					$e_last = new_pos;
					last_position = curr_position;
					var opacity = opsActive ? 1 : 1-(new_pos-newMax)/(first_pos-newMax),
						shadowOpacity = ((opacity*100)/100)*0.15;
					shadowOpacity = "-6px 8px 6px -6px rgba(0,0,0,#)".replace("#", shadowOpacity);
					var bgColor = self.userPlaylistIsOpen() ? "rgba(255, 255, 255, 1)" : "rgba(255, 255, 255, #)".replace("#", opacity);
					var ee = self.userPlaylistIsOpen() ? $ee : $e;
					ee.css({
						"-webkit-box-shadow": shadowOpacity
					});
					$e.css({
						"background-color": bgColor
					});
				} catch(error) {
					// Pass
				}
			});
		})();

		/*
		The stupidity of it all is that when we rearrange tracks in a user's playlist,
		Firebase actually pushes the entire playlist again, which triggers a "replace"
		on self.pushBatch -- which in turns causes the damn UI to jump the top.
		*/
		var userRearrangedTracks = false;
		function backToFirstPositions() {
			if (userRearrangedTracks) {
				userRearrangedTracks = false;
				return;
			}
			$("#resultsSection").scrollTop(0);
			var pInfo_bgColor = self.userPlaylistIsOpen() ? 'rgba(255,255,255,1)':'rgba(255,255,255,0)';
			$("#playlistInfo").css({
				top: playlistInfoTop(),
				'background-color': pInfo_bgColor,
				'-webkit-box-shadow':'-6px 8px 6px -6px rgba(0,0,0,0)'
			});
			$("#playlistProperties").css({
				top: playlistInfoTop() + userPlaylistPropertiesOffset,
				'-webkit-box-shadow':'-6px 8px 6px -6px rgba(0,0,0,0)'
			});
		}

		self.isQuery = false;
		self.loading = ko.observable(false);
		self.bigTitle = ko.observable("");
		self.notifyNothing = function() {
			self.bigTitle("Nothing! We got nothing!");
		};
		self.lameTitle = ko.observable("");
		self.lameTitle.subscribe(function setTitle(titleText) {
			var refID = self.refID(), m;
			if (refID.match(/^\$q_/i)) {
				// Queried/search results
				if (titleText.match(/artist:/)) {
					titleText = 'Songs by ' + $.trim(titleText.split("artist:")[1]);
				} else if (titleText.match(/similarto:/)) {
					titleText = 'Songs similar to :  ' + $.trim(titleText.split("similarto:")[1]);
				} else {
					titleText = 'Search results for "' + titleText + '"';
				}
			} else if (refID.match(/@echonest-genre/)) {
				titleText = "Discover : " + titleText;

			} else if (refID.match(/@itunes-genre/)) {
				m = titleText.match(/iTunes (.+)/i);
				titleText = "iTunes Store - Top " + m[1] + " Singles";

			} else if (refID.match(/@itunes-geo/)) {
				m = titleText.match(/iTunes (.+)/i);
				titleText = "iTunes Store " + m[1] + " - Top Singles";

			} else if (refID.match(/@musix-billboard/i)) {
				titleText = "Billboard " + titleText.split(" ")[1] + " - Hot 300 Singles";

			} else if (refID.match(/@lastfm/)) {
				if (titleText.match(/love/i)) {
					titleText = "last.fm | Tracks loved by most listeners"
				} else if (titleText.match(/hype/i)) {
					titleText = "last.fm | Fastest rising tracks this week"
				} else {
					titleText = "last.fm | Most listeners this week"
				}
			} else {
				// pass thru
			}
			self.bigTitle(titleText);
		});
		self.pushHistoryImmedietly = false;
		self.dontPushHistory = false;
		self.current_url = ko.observable(null);
		self.shoppingCart = ko.observableArray([]);
		self.resetShoppingCart = function() {
			var refresh = Spank.batchOps.pageRefresh;
			refresh();
		};
		self.chartTracks = ko.observableArray([]);

		var padToFour = Spank.utils.padToFour;
		self.totalChartTracks = ko.computed(function() {
			return padToFour(self.chartTracks().length);
		});

		self.process = function(o) {
			// Init defaults for properties our view expects
			var bad = false,
				track = {thumb: Spank.genericAlbumArt };
			try {
				if ("track" in o) {
					// This is a MusiXMatch track object
					o = o.track;
					track.artist = o.artist_name;
					track.title = o.track_name;
					$.extend(track, Spank.utils.normalizeMXData(o));
				} else if ("streamable" in o) {
					// This is a last.fm track object
					// http://ws.audioscrobbler.com/2.0/?method=chart.gethypedtracks&api_key=0325c588426d1889087a065994d30fa1&format=json
					track.title = o.name;
					track.artist = o.artist.name;
					if (o.hasOwnProperty("image")) track.thumb = o.image[o.image.length-2]['#text'];
					if (o.hasOwnProperty("mbid") && o.mbid.length>0) track.mbid_track = o.mbid;
					if (o.artist.hasOwnProperty("mbid") && o.artist.mbid.length>0) track.mbid_artist = o.artist.mbid;
				} else if ("im:artist" in o) {
					// This is an iTunes track object from iTms RSS feed *not* its Search API
					// https://itunes.apple.com/us/rss/topsongs/limit=2/explicit=true/json
					track.title = o['im:name'].label;
					track.artist = o['im:artist'].label;
					track.thumb = o['im:image'][2] ? o['im:image'][2].label : track.thumb;
					track.album = o['im:collection']['im:name'].label;
					track.itms_track = o.id.attributes['im:id'];
					track.itms_artist = o['im:artist'].attributes.href.match(/id\d+/)[0].slice(2);
					track.itms_album = o['im:collection'].link.attributes.href.match(/id\d+/)[0].slice(2);
					if (o.hasOwnProperty("link")) {
						$.each(o.link, function(i,data) {
							if (data.hasOwnProperty("attributes") && data.attributes.hasOwnProperty("type") && data.attributes.type.match(/m4a/)) track.preview = data.attributes.href;
						});
					} else {
						console.log(o);
					}
				} else if ("artist_id" in o) {
					// Echonest song from Playlist API
					track.title = o.title;
					track.artist = o.artist_name;
					track.echoid_track = o.id;
					track.echoid_artist = o.artist_id;
					if (o.hasOwnProperty("tracks") && o.tracks.length>0) {
						if (o.tracks[0].hasOwnProperty("release_image")) {
							track.thumb = o.tracks[0].release_image;
						}
						if (o.tracks[0].hasOwnProperty("preview_url")) {
							track.preview = o.tracks[0].preview_url;
						}
					}
				} else if ("url" in o) {
					// A song in our own playlist is the only known object
					// we know of that has a property called "url"
					var must_have_keys = ["title", "artist", "url", "thumb", "direct"];
					$.each(must_have_keys, function(i, attr) {
						if (typeof(o[attr])==='undefined') {
							bad = true;
						}
					});
					if (!bad) $.extend(track, o);
				} else {
					return o;
				}
			} catch(err) {
				return null;
			}

			$.each(track, function(k,v) {
				if (typeof(v)==='undefined') {
					bad = true;
				}
			});

			return bad ? false : track;
		};

		self.restoreStateFromHistory = function(historyStateObj) {
			/*
			Make sure the poppedState has the stuff we need
			in order to restore the state
			*/
			if (!historyStateObj.hasOwnProperty("refID")) return;
			/*
			 Each time we trigger "replaceState" this function
			 is anadvertantly called. To prevent any modification
			 to the current state, make sure the refID we're restoring
			 is different from the existing one
			 */
			var refID = historyStateObj.refID,
				html = $("html");
			if (refID===self.refID()) return;
			DeepFeeze.get(refID, function(oldStateObj) {
				if (oldStateObj!==null) {
					html.addClass("busy");
					if (oldStateObj.query!==null) {
						$("#searchField").focus().val(oldStateObj.query);
					}
					self.resetCharts(oldStateObj);
					self.pushBatch(oldStateObj.tracklist, "replace");
					html.removeClass("busy");
				}
			});
		};

		self.stashID = ko.observable(null);
		self.stashIsActive = ko.computed(function() {
			var bool = self.stashID()!==null;
			Spank.player.stashState(bool);
			return bool;
		});

		self.pushBatch = function(tracklist, method) {
			var newItems = [], history_method, history_data;
			$("#resultsSection").show();
			for (var i=0, len=tracklist.length; i<len; i++) {
				var item = self.process(tracklist[i]);
				if (item!==null) {
					newItems.push(item);
				}
			}
			if (method.match(/replace/i)) {
				var playerIsCurrentlyPlayingSomethingFromHere = false;
				if (self.stashID()===null && playerIsCurrentlyPlayingSomethingFromHere) {
					self.stashID(self.refID());
				}
				self.chartTracks(newItems);
				history_method = 'pushState';
			} else {
				self.chartTracks[method].apply(self.chartTracks, newItems);
				history_method = 'replaceState';
			}
			if (self.chartTracks().length>=400) {
				self.current_url("#");
			}
			if (self.userPlaylistIsOpen()) {
				$(".trackEntry").addClass("isMarqueeSelectable");
			}
			history_data = {
				refID: self.refID(),
				title: self.lameTitle(),
				url: self.current_url(),
				query: self.refID().match(/^\$q_/) ? $.trim($("#searchField").val()) : null
			};
			if (self.chartTracks().length>0) {
				History[history_method](history_data, self.bigTitle(), "?refID=" + history_data.refID);
				var post_data = {
					refID: history_data.refID,
					title: history_data.title,
					url: history_data.url,
					query: history_data.query,
					tracklist: self.chartTracks()
				};
				DeepFeeze.put("sessionStorage", post_data.refID, post_data);
			} else {
				// Search yielded no results
			}
		};

		self.populateResultsWithUrl = function(url, extract_function, error_callback) {
			Spank.busy.on();
			$.getJSON(url, function(res) {
				var tracklist;
				if (extract_function) {
					tracklist = extract_function(res);
				} else {
					tracklist = res;
				}
				if (Array.isArray(tracklist) && tracklist.length>0) {
					var newStateObj = {
						title: $("#searchField").val(),
						refID: "#" + Math.uuidCompact()
					};
					self.current_url(url);
					self.pushBatch(tracklist, 'replace');
				} else {
					self.pushHistoryImmedietly = false;
					if (error_callback!==undefined) {
						error_callback();
					}
				}
				Spank.busy.off();
			});
		};

		var last_url = "",
			lastObject = "";

		self.resetCharts = function(data) {
			last_url = "";
			lastObject = "";
			self.resetShoppingCart();
			self.chartTracks([]);
			// IMPORTANT! refID must be set before anything else because
			// a shitload of UI stuff depends on knowing it
			self.refID(data.refID);
			self.current_url(data.url);
			self.lameTitle(data.title);
			backToFirstPositions();
		};

		var randrange = Spank.utils.randrange;
		self.fetchPaginatedResults = function(newStateObj) {
			/*
			 The newStateObj only exists the very first time
			 we reload a whole new set of results into the
			 main view, in which case it sets the refID, the title,
			 and commits the history state. Otherwise, the results
			 from this are appended to the main view, and the history
			 state is simply replaced.
			 */
			var newSetOfResults = typeof(newStateObj)!=='undefined',
				url = self.current_url(),
				tracklist = [],
				originalFakeUrl;
			if (url==="#") {
				return;
			}
			if (!url.match(/page=/)) {
				return;
			}
			if (url===last_url) {
				return;
			}
			if (url.match(/echonest.+static/)) {
				/* The url for EchoNest looks like:
				 http://developer.echonest.com/api/v4/playlist/static?api_key=FILDTEOIK2HBORODV&results=100&type=catalog-radio&seed_catalog=CATALOG_ID&adventurousness=NOFEARFACTOR&bucket=id:7digital-US&bucket=tracks&page=1
				 It doesn't actually do pagination (e.g. the "&page=" parameter raises an API error),
				 we're faking it and calling the same url over and over again as the user scrolls.
				*/
				originalFakeUrl = url;
				// replace the useless "&page=" part with a useless callback with
				// a random name each time to prevent $.getJSON from caching the response
				var randomCallback = "&callback=f" + Math.uuid(16);
				url = url.replace("#", randrange(25,80)/100);
				url = url.replace("NOFEARFACTOR", randrange(25,90)/100); // How "adventurous" is the playlist?
				url = url.replace(/&page=\d+/, randomCallback);
				url = url.replace("TOLKIEN", ECHO.key());
				last_url = originalFakeUrl;
			} else {
				last_url = url;
			}
			self.loading(true);
			var killXHR = true,
				xhr = $.getJSON(url, function(res) {
				if (res.hasOwnProperty("message")) {
					// MusiXMatch
					tracklist = res.message.body.track_list;
				} else if (res.hasOwnProperty("tracks")) {
					// LastFM
					tracklist = res.tracks.track;
				} else if (res.hasOwnProperty("spanklist")) {
					// Our own paginated results of iTunes' charts served from Amazon Cloudfront
					tracklist = res.spanklist;
				} else if (res.hasOwnProperty("response") &&
					res.response.hasOwnProperty("status") &&
					res.response.hasOwnProperty("songs")) {
					// Echonest Playlist results
					url = originalFakeUrl;
					var page = parseInt(url.match(/page=(\d+)/)[1], 10);
					if (page<=10 && res.response.status.code===0 && res.response.songs.length>0) {
						tracklist = res.response.songs;
					}
				} else {
					tracklist = res;
				}
				if (Array.isArray(tracklist) && tracklist.length>0) {
					var firstObject = JSON.stringify(tracklist[0]);
					if (lastObject!==firstObject) {
						// console.error("MORE");
						lastObject = firstObject;
						var curr_url = self.current_url(),
							page_string = curr_url.match(/page=(\d+)/);
						if (page_string!==null) {
							var next_page_number = Number(page_string[1])+1,
								next_url = curr_url.replace(/page=\d+/, "page="+next_page_number);
							self.current_url(next_url);
						}
						if (newSetOfResults) {
							self.pushBatch(tracklist, 'replace');
						} else {
							self.pushBatch(tracklist, 'push');
						}
					} else {
						self.current_url("#");
						// console.error("ENDED SIMILAR RESULTS");
					}
				} else {
					self.current_url("#");
					// console.error("NO MORE RESULTS");
				}
			}).done(function() {
				killXHR = false;
			}).fail(function() {
				// window.notify.error("Uh-oh, I've got a run in my pantyhose!");
			}).always(function() {
				self.loading(false);
			});
			setTimeout(function() {
				if (killXHR) {
					// window.notify.information("Awwww honey, I've got a run in my pantyhose!");
					xhr.abort();
					if (self.refID().match(/^@/) && url.match(/page=1/) && self.chartTracks().length===0) {
						Head.playlists.randomChart();
					}
				}
			}, 7500);
		};

		self.openChartItem = function(data, event) {     // Called from Head.playlists.openPlaylist
			data = ko.toJS(data);
			var newStateObj = {
				title: data.title,
				refID:data.refID + "|" + Math.uuid(64),
				url:data.url
			};
			self.resetCharts(newStateObj);
			self.fetchPaginatedResults(newStateObj);
		};

		self.getSimilar = function(track) {
			var similar_url = "http://ws.audioscrobbler.com/2.0/?method=track.getsimilar&artist=@&track=#&autocorrect=1&limit=200&api_key=0325c588426d1889087a065994d30fa1&format=json",
				echoUrl = "http://developer.echonest.com/api/v4/playlist/static?api_key=FILDTEOIK2HBORODV&song_id=SONG_ID&format=json&results=100&type=song-radio&bucket=id:7digital-US&bucket=tracks",
				lastFMUrl,
				methods = ['push', 'replace'],
				newStateObj = {
					title: "similarto: " + track.artist + " - " + track.title,
					refID: "$q_similar|" + Math.uuid(64),
					url: "#"
				};
			lastFMUrl = similar_url.replace("@", encodeURIComponent(track.artist)).replace("#", encodeURIComponent(track.title));
			self.loading(true);
			self.resetCharts(newStateObj);
			$.getJSON(lastFMUrl, function(res) {
				if (res.hasOwnProperty('similartracks') && res.similartracks.track.length>0) {
					self.pushBatch(res.similartracks.track, methods.pop());
				} else {
					console.warn("LastFM did not return similar tracks.");
				}
			}).always(function() {
				self.loading(false);
			});
			if ("echoid_track" in track) {
				echoUrl = echoUrl.concat("&callback=f", Math.uuid(16));
				echoUrl = echoUrl.replace("FILDTEOIK2HBORODV", ECHO.key()).replace("SONG_ID", track.echoid_track);
				$.getJSON(echoUrl, function(res) {
					if (res.response.status.code===0 && res.response.songs.length>0) {
						self.pushBatch(res.response.songs, methods.pop());
					}
				}).always(function() {
					self.loading(false);
				});
			}
		};

		self.onClickFindArtist = function(data, event) {
			var q = "artist: " + data.artist;
			$("#searchField").focus().val(q).trigger("keyup");
		};

		self.unavailableTracks = ko.observableArray([]);

		function stripBrackets(string) {
			if (string.match(/[\(\[].+[\)\]]/)) {
				return $.trim(string.replace(/[\(\[].+[\)\]]/ ,""));
			} else {
				return string;
			}
		}

		function onZeroVKResults(data) {
			self.unavailableTracks.push(data);
			$(document).trigger("fatManFinish");
		}

		 function radioPlay(data, event) {
			var e = $(event.target);
			if (!e.hasClass("spinBitch")) { e.addClass("spinBitch"); }
			e.css("-webkit-transform", "rotate(#deg)".replace("#", randrange(328,384)));
			var koo = ko.toJS(data);
			if (koo.hasOwnProperty('url')) {
				/*
				If the chart item already has a [VK] url, then just send it to
				the player (e.g. we're clicking on an item in a user's playlist)
				*/
				Spank.player.playObject(koo, self.refID());
			} else {
				/*
				 If not, search VK for the song and play it
				 */
				var Track = function() {},
					title = stripBrackets(koo.title),
					artist = koo.artist,
					query_string = title + " " + artist;
				Track.prototype = koo;
				Spank.lightBox.vickisuckme(query_string, 5, Track, function playChartItemInPlace(results) {
					if (results.length===0) {
						onZeroVKResults(data);
					} else {
						Spank.player.playObject(results[0], self.refID());
					}
				}, function onError() {
					onZeroVKResults(data);
				});
			}
		}

		self.radioPlay = function(koo, event) {
			var havePermission = window.webkitNotifications.checkPermission();
			if (havePermission > 0) {
				window.webkitNotifications.requestPermission();
			}
			self.radioPlay = radioPlay;
			self.radioPlay(koo, event);
		};

		self.openLightbox = function(data, event) {
			Spank.lightBox.open(data, self.refID());
		};

		$(".selectableItems-container").selectable({
			filter: ".isMarqueeSelectable",
			selected: function(event, ui) {
				/*	Triggered when the user mouseups after making
					a marquee selection */
			},
			unselected: function(event, ui) {
				var data = $(ui.selected).data('koo');
				self.shoppingCart.remove(data);
			},
			start: function(event, ui) {
				Spank.history.batchItems([]);
			},
			selecting: function(event, ui) {
				var data = $(ui.selecting).data('koo');
				if (self.shoppingCart.indexOf(data)>=0) {
					self.shoppingCart.remove(data);
				} else {
					self.shoppingCart.unshift(data);
				}
			},
			stop: function(event, ui) {
				var l = $(".ui-selected").length;
				Spank.batchOps.numberOfSelectedItemsInOpenPlaylist(l);
				if (l===0) {
					self.shoppingCart([]);
				}
			}
		});

		self.onClickAddToShoppingCart = function(data, event) {
			Spank.history.batchItems([]);
			if (self.shoppingCart.indexOf(data)>=0) {
				self.shoppingCart.remove(data);
			} else {
				if (self.shoppingCart.indexOf(data)===-1) self.shoppingCart.unshift(data);
				Spank.batchOps.numberOfSelectedItemsInOpenPlaylist($(".ui-selected").length);
			}
		};

		/*
			When we drag and drop around items in the main window
		 */

		var lastState;
		self.saveTrackOrder = function(arg) {
			if (!self.userPlaylistIsOpen()) {
				// If we're looking at a chart, then just let the damn things move around, no harm done
				return;
			}
			var okToChange = (Head.playlistProperties.isMine() || Head.playlistProperties.writable());
			lastState = ko.toJSON(self.chartTracks);
			if (!okToChange || self.shoppingCart().length>0) {
				arg.cancelDrop = true;
			}
		};

		self.changeTrackOrder = function(o) {
			if (!self.userPlaylistIsOpen()) {
				// If we're looking at a chart, then just let the damn things move around, no harm done
				return;
			}
			var okToChange = (Head.playlistProperties.isMine() || Head.playlistProperties.writable()),
				lastKnownState = JSON.parse(lastState);
			if (self.userPlaylistIsOpen() && okToChange) {
				Head.playlists.lastKoo.base.tracklist.transaction(function(currentData) {
					if (currentData.length===lastKnownState.length) {
						var i = currentData.length;
						while (i--) {
							if (currentData[i].url!==lastKnownState[i].url) {
								return undefined;
							}
						}
						userRearrangedTracks = true;
						return self.chartTracks();
					} else {
						return undefined;
					}
				}, function onComplete(error, comitted, snapshot, dummy) {
					if (error) {
						window.notify.error("Playlist was changed before you got to it. Try again!");
						self.chartTracks(lastKnownState);
					}
				});
			} else {
				window.notify.error("Sorry, you're no longer allowed to modify this playlist.");
				self.chartTracks(lastKnownState);
			}
		};

		self.bookmarks = ko.observableArray([]);

		self.isPinned = ko.computed(function() {
			return self.refID()===self.stashID();
		});

		self.onClickPin = function(data, event) {
			if (self.isPinned()) {
				self.stashID(null);
			} else {
				self.stashID(self.refID());
			}
		};

		self.goToPinnedState = function(data, event) {
			var stashID = self.stashID();
			if (stashID && sessionStorage.hasOwnProperty(stashID)) {
				History.goToRefID(stashID);
			}
		};

		self.deletePinnedState = function(data, event) {
			self.stashID(null);
		};

		self.thumbSource = Spank.utils.lazyLoadImages("#resultsSection", {_iTunes:"150x150-75", _7static:"_175.jpg"});

		ko.applyBindings(Spank.charts, document.getElementById('resultsSectionBindMe'));

		// Autopager for charts
		var last_position = 0,
			resultsSection = $("#resultsSection"),
			autopageContent = $("#autopageContent");
		resultsSection.scroll(function () {
			var pos = (autopageContent.position().top-resultsSection.height())*-1/resultsSection.height()/(autopageContent.height()/resultsSection.height());
			if (pos>last_position) {
				// User is scrolling down
				if (pos>=0.95) self.fetchPaginatedResults();
			} else {
				// User is scrolling up
			}
			last_position = pos;
		});

	});

})();