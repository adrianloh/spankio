(function(){

	$(document).ready(function() {

		function appendToResults(title, url, tracklist, this_image, reset) {
			var highlightCurrentPlaylistItem = function(this_image) {
				var default_color = "5px solid rgb(204, 204, 204)",
					highlight_border = "5px solid rgb(28, 205, 213)";
				$(".playlistEntry").filter(function () {
					return $(this).css("border")===highlight_border;
				}).css("border", default_color);
				this_image.parent().css("border", highlight_border);
			};
			Spank.charts.currentPlaylistTitle(title);   // NOTE: This is undefined for all results *except* when a user's playlist is open
			Spank.charts.current_url(url);             // This is "#" when a user's playlist is open
			if (reset) {
				// E.g. the first time we click on a playlist item and load new results...
				highlightCurrentPlaylistItem(this_image);
				Spank.charts.pushBatch(tracklist, 'replace');
				$("#searchField").val("Search");
			} else {
				Spank.charts.pushBatch(tracklist);
			}
			Spank.charts.ok_to_fetch_more(true);
		}

		// Use localStorage to cache JSONs returned from external APIs
		var resultsCache = {};
		if (typeof(localStorage.resultsCache)==='undefined') {
			localStorage.resultsCache = JSON.stringify(resultsCache);
		} else {
			resultsCache = JSON.parse(localStorage.resultsCache);
		}

		var last_request_time = new Date().getTime()-5000;
		$(".playlistThumb").live("click", function onClickPlaylistThumbnail(event, myUrl) {
			// Note, we also 'artificially' trigger this event when we're autopaging. In
			// which case myUrl (usually page=2||page=3, etc.) is used, otherwise the url
			// is gotten from the playlist thumbnail itself.
			try {
				// This might not be ready on first launch, doesn't matter
				Spank.friends.visible(false);
				Spank.tearDownLightBox();
			} catch(err) {}
			var this_image = $(this),
				tracklist,
				url = myUrl || $(this).attr("url"),
				timeNow = new Date().getTime(),
				timeDelta = timeNow - last_request_time,
				fetchNew = true,
				title;
			if (url==="#") {                            // This is a user playlist
				title = this_image.attr("title");       // Note: ONLY USER PLAYLISTS HAVE TITLES!
				tracklist = Spank.playlists[title];
				//console.warn("Clicked on playlist: " + title);
				if (tracklist && tracklist.length>0) {
					console.warn("Opening " + title + " with " + tracklist.length + " items.");
					appendToResults(title, url, tracklist, this_image, true);
				} else {
					alert("Drag a cover from your stream to start adding to this playlist!");
				}
				return false;
			} else if (url.match(/http/) && resultsCache[url]) {
				var stored = resultsCache[url],
					timeSinceLastCache = new Date().getTime()-stored.timestamp;
				if (timeSinceLastCache<86400000) { // Keep cache for 24 hours
					appendToResults(undefined, url, stored.data, this_image, !myUrl);
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
						appendToResults(title, url, tracklist, this_image, !myUrl);
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
						Spank.charts.ok_to_fetch_more(false);
					}
					$("html").removeClass('busy');
					this_image.css('cursor','pointer');
				});
			}
			last_request_time = new Date().getTime();
		});
	});
})();