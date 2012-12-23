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
			self.currentPlaylistTitle = ko.observable(undefined);
			self.current_url = null;
			self.ok_to_fetch_more = true;
			self.shoppingCart = ko.observableArray([]);
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
				if (self.ok_to_fetch_more) {
					var match = self.current_url.match(/page=(\d+)/);
					if (match) {
						var next = ++match[1],
							next_url = self.current_url.replace(/page=(\d+)/,"page="+next);
						$($(".playlistThumb")[0]).trigger("click",[next_url]);
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
			self.pushBatch = function(list, mode) {
				$("#resultsSection").show();
				//console.warn("Batch adding " + list.length + ' items.');
				var newItems = $.map(list, function(item) {
					item = self.process(item);
					if (item!==false) {
						return item;
					}
				});
				if (mode && mode==='unshift') {
					self.chartTracks.unshift.apply(self.chartTracks, newItems);
				} else if (mode && mode==='replace') {
					self.chartTracks(newItems);
				} else {
					self.chartTracks.push.apply(self.chartTracks, newItems);
				}
				//console.warn("Rendering " + newItems.length + ' items.');
			};
			self.populateResultsWithUrl = function(url, extract_function, error_callback) {
				// This function is called to look for Similar artists/Similar tracks
				self.currentPlaylistTitle(undefined);
				$("html").addClass('busy');
				$.getJSON(url, function(res) {
					var tracklist;
					$("html").removeClass('busy');
					if (extract_function) {
						tracklist = extract_function(res);
					} else {
						tracklist = res;
					}
					if (Array.isArray(tracklist) && tracklist.length>0) {
						self.current_url = url;
						self.chartTracks.removeAll();
						self.pushBatch(tracklist);
					} else {
						if (error_callback!==undefined) {
							error_callback();
						}
					}
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

		Spank.charts.shoppingCart.subscribe(function(list) {
			var resultOps = $("#resultsOps"),
				mode = list.length===0 ? 'hide' : 'show';
			resultOps[mode]();
		});

		Spank.charts.chartTracks.subscribe(function(list) {
			if (list.length===0) {
				Spank.charts.shoppingCart.removeAll();
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