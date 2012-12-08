(function(){

	$(document).ready(function () {

		var resultsCache = {};
		if (typeof(localStorage.resultsCache)==='undefined') {
			localStorage.resultsCache = JSON.stringify(resultsCache);
		} else {
			resultsCache = JSON.parse(localStorage.resultsCache);
		}

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
			console.log(tracklist);
			if (reset) {
				// E.g. the first time we click on a playlist item and load new results...
				highlightCurrentPlaylistItem(this_image);
				console.log(tracklist.length);
				Spank.charts.chartTracks.removeAll();
				console.log(tracklist.length);
			}
			console.log(tracklist.length);
			console.warn("--->  Pushing to batch " + tracklist.length + ' items');
			Spank.charts.pushBatch(tracklist);
			Spank.charts.ok_to_fetch_more = true;
		};

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
				console.warn("Clicked on playlist: " + title);
				if (tracklist!=null) {
					console.warn("Opening " + title + " with " + tracklist.length + " items.");
					appendToResults(title, url, tracklist, this_image, true);
				} else {
					alert("Empty playlist! Nothing to look at, yo!");
				}
				return false;
			} else if (url.match(/http/) && resultsCache[url]) {
				// Not enough time between calls to an external api
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

		$.each(chartPlaylistItems, function(i,o) {
			// Populate the playlist bar with charts
			Spank.playlistBar.push(o);
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


	});

})();



