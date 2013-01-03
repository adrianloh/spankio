Array.prototype.shuffle = function() {
	var i=this.length,p,t;
	while (i--) {
		p = Math.floor(Math.random()*i);
		t = this[i];
		this[i]=this[p];
		this[p]=t;
	}
};

(function() {

	$(document).ready(function() {

		Spank.charts = (function() {
			var self = {};
			self.pushHistoryImmedietly = false;
			self.dontPushHistory = false;
			self.currentPlaylistTitle = ko.observable(undefined);
			self.current_url = ko.observable(null);
			self.ok_to_fetch_more = ko.observable(true);
			self.shoppingCart = ko.observableArray([]);
			self.resetShoppingCart = function() {
				$(".mxThumb").removeClass("selectedPlaylistItem");
				self.shoppingCart([]);
			};
			self.chartTracks = ko.observableArray([]);
			self.totalChartTracks = ko.computed(function(){
				return Spank.utils.padToFour(self.chartTracks().length);
			});
			self.onResort = function(o) {
				if (self.currentPlaylistTitle()) {
					Spank.playlistScroller.savePlaylist(self.currentPlaylistTitle(), self.chartTracks());
				}
			};
			self.fetchMore = function() {
				if (self.ok_to_fetch_more()) {
					var match = self.current_url().match(/page=(\d+)/);
					if (match) {
						var next = ++match[1],
							next_url = self.current_url().replace(/page=(\d+)/,"page="+next);
						$($(".chartThumb")[0]).trigger("click",[next_url]);
					}
				}
			};
			self.process = function(o) {
				// Init defaults for properties our view expects
				var track = {
					mbid:'na',
					album:'',
					mxid:"na",
					thumb: Spank.genericAlbumArt
				};
				if ("track" in o) {    // This is a MusiXMatch track object
					o = o.track;
					track.artist = o.artist_name;
					track.title = o.track_name;
					track.thumb = o.album_coverart_350x350 ? o.album_coverart_350x350 : track.thumb;
					track.album = o.album_name;
					track.mbid = o.track_mbid;
					track.mxid = o.track_id;
				} else if ("streamable" in o) { // This is a last.fm track object
					track.artist = o.artist.name;
					track.title = o.name;
					track.thumb = o.image ? o.image[o.image.length-1]['#text'] : track.thumb;
					track.mbid = o.mbid;
				} else if ("im:artist" in o) { // This is an iTunes track object
					track.artist = o['im:artist'].label;
					track.title = o['im:name'].label;
					track.thumb = o['im:image'][2] ? o['im:image'][2].label : track.thumb;
				} else if ("url" in o) {	// A song in our own playlist, thus URL
					track.artist = o.artist;
					track.title = o.title;
					track.thumb = o.thumb;
					track.url = o.url;
					track.direct = o.direct;
				} else {
					return false;
				}
				var bad = false;
				$.each(track, function(k,v) {
					if (typeof(v)==='undefined') {
						bad = true;
					}
				});
				return bad ? false : track;
			};
			var stateHash = function() {
				if (self.current_url()!=="#") {
					return hex_md5(self.current_url().replace(/page=\d+/,""));
				} else {
					return encodeURI(self.currentPlaylistTitle());
				}
			};
            var timeoutPushHistory = setTimeout(function(){},0);
			self.pushBatch = function(list, mode) {
				$("#resultsSection").show();
				var newItems = $.map(list, function(item) {
					item = self.process(item);
					if (item!==false) {
						return item;
					}
				});
                clearTimeout(timeoutPushHistory);
				var query = $.trim($("#searchField").val().toLowerCase()),
					chartData = {
						current_url: self.current_url(),
						ok_to_fetch_more: self.ok_to_fetch_more(),
						chartTracks: null
					},
					setState = function(hash) {
						hash = hash || stateHash();
						chartData.chartTracks = self.chartTracks();
						var playlistTitle = Spank.charts.currentPlaylistTitle();
						if (typeof(playlistTitle)==='undefined') {
							History.datastore[hash] = {q:query, chartData: chartData};
						} else {
							hash = Head.playlists.lastKoo.refID;
						}
						return hash;
					};
                if (mode && mode==='unshift') {
					self.chartTracks.unshift.apply(self.chartTracks, newItems);
	                setState();
				} else if (mode && mode.match(/replace/)) {
					self.chartTracks(newItems);
					var hash = stateHash(),
						callbacks = (function(h) {
			                // Predefine these functions so they are bound to current
			                // value of hash, in case it changes by the time these
			                // functions are called by timeoutPushHistory
							var prefix = "spank.io | ";
			                return {
				                pushPlaylistState: function(title) {
					                if (History.getState().data.stateKey!==h) {
//						                console.log("HISTORY PUSH Playlist");
						                History.pushState({stateKey:h}, prefix + title, "?playlistID="+h);
					                }
				                },
				                pushQueryState: function(title) {
//					                console.log("HISTORY PUSH General");
					                History.pushState({stateKey:h}, prefix + title, "?q="+encodeURIComponent(title));
				                }
			                }
		                })(setState(hash));
	                function pushHistory() {
		                History.firstpush = true;
		                if (typeof(Spank.charts.currentPlaylistTitle())==='undefined') {
			                callbacks.pushQueryState(query);
		                } else {
			                callbacks.pushPlaylistState(Spank.charts.currentPlaylistTitle());
		                }
	                }
	                if (self.dontPushHistory) {
		                self.dontPushHistory = false;
		                return;
	                }
	                if (self.pushHistoryImmedietly) {
		                self.pushHistoryImmedietly = false;
		                pushHistory();
	                } else {
		                timeoutPushHistory = setTimeout(pushHistory, 2500);
	                }
				} else {
					self.chartTracks.push.apply(self.chartTracks, newItems);
	                setState();
				}
			};
			self.populateResultsWithUrl = function(url, extract_function, error_callback) {
				// This function is called to look for Similar artists/Similar tracks
				self.currentPlaylistTitle(undefined);
				Spank.busy.on();
				$.getJSON(url, function(res) {
					var tracklist;
					if (extract_function) {
						tracklist = extract_function(res);
					} else {
						tracklist = res;
					}
					if (Array.isArray(tracklist) && tracklist.length>0) {
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
			self.getSimilar = function(data) {
				var similar_url = "http://ws.audioscrobbler.com/2.0/?method=track.getsimilar&artist=@&track=#&autocorrect=1&limit=200&api_key=0325c588426d1889087a065994d30fa1&format=json";
				var url = similar_url.replace("@", encodeURIComponent(data.artist)).replace("#", encodeURIComponent(data.title));
				self.current_url(url);
				self.ok_to_fetch_more(false);
				self.populateResultsWithUrl(url, function extract(res) {
					return res.similartracks.track;
				}, function noresults() {
					window.notify.error("Couldn't find any similar songs!");
				});
			};
			self.addToShoppingCart = function(data, event) {
				var img = $(event.target);
				if (data.url || data.direct) {
					var atIndex = self.shoppingCart().indexOf(data);
					if (atIndex<0) {
						// ++ new item into the cart
						img.addClass("selectedPlaylistItem");
						self.shoppingCart.unshift(data);
					} else {
						// -- item from cart
						img.removeClass("selectedPlaylistItem");
						self.shoppingCart.remove(data);
					}
				} else {
					img.parent().find(".lyricLink").trigger("click");
				}
			};
			return self;
		})();

		ko.applyBindings(Spank.charts, document.getElementById('resultsSection'));

		Spank.charts.chartTracks.subscribe(function(list) {
			if (list.length===0) {
				Spank.charts.resetShoppingCart();
			}
			$(".trackEntry.unwobbled").each(function(i,elem) {
				Spank.utils.wobble(elem,-7,7);
			});
		});

		$("#random_button").mousedown(function onClickShuffleResultsButton() {
			$(this).css("webkitFilter","brightness(0)");
		}).mouseup(function() {
			$(this).css("webkitFilter","grayscale(1)");
		}).click(function() {
			var old_list = Spank.charts.chartTracks();
			old_list.shuffle();
			Spank.charts.chartTracks([]);
			Spank.charts.chartTracks(old_list);
		});

		// Autopager for charts
		$("#resultsSection").scroll(function () {
			var last = $(".results-list:last-child");
			if ($("#resultsSection").scrollTop()*0.4 > (last.position().top + last.height())) {
				Spank.charts.fetchMore();
			}
		});

	});



})();