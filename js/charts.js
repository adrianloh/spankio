(function(){

	var highlightCurrentPlaylistItem = function(this_image) {
		var default_color = "5px solid rgb(204, 204, 204)",
			highlight_border = "5px solid rgb(255, 0, 0)";
		$(".playlistEntry").filter(function () {
			return $(this).css("border")===highlight_border;
		}).css("border", default_color);
		this_image.parent().css("border", highlight_border);
	};

	var appendToResults = function(url, tracklist, this_image, reset) {
		Spank.charts.current_url = url;
			if (reset) {
				// E.g. the first time we click on a playlist item and load new results...
				highlightCurrentPlaylistItem(this_image);
				Spank.charts.chartTracks.removeAll();
			}
			Spank.charts.pushBatch(tracklist);
			Spank.charts.ok_to_fetch_more = true;
	};

	$(document).ready(function () {

		var resultsCache = {};
		if (typeof(localStorage.resultsCache)==='undefined') {
			localStorage.resultsCache = JSON.stringify(resultsCache);
		} else {
			resultsCache = JSON.parse(localStorage.resultsCache);
		}

		var last_request_time = new Date().getTime()-5000;
		$(".playlistThumb").live("click", function(event, myUrl) {
			// myUrl is only used when we're autopaging through the results
			// otherwise the url is gotten from the playlist thumbnail
			var this_image = $(this);
			var tracklist,
				url = myUrl || $(this).attr("url");
			var timeNow = new Date().getTime(),
				timeDelta = timeNow - last_request_time;
			if (timeDelta>2000) {
				var fetchNew = true;
				if (url.match(/http/) && resultsCache[url]) {
					var stored = resultsCache[url],
						timeSinceLastCache = new Date().getTime()-stored.timestamp;
					if (timeSinceLastCache<86400000) {
						appendToResults(url, stored.data, this_image, (!myUrl));
						fetchNew = false;
					}
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
							appendToResults(url, tracklist, this_image, (!myUrl));
							resultsCache[url] = {
								timestamp:new Date().getTime(),
								data:tracklist
							};
							localStorage.resultsCache = JSON.stringify(resultsCache);
						} else {
							Spank.charts.ok_to_fetch_more = false;
						}
						$("html").removeClass('busy');
						this_image.css('cursor','pointer');
					});
				}
				last_request_time = new Date().getTime();
			}
			return false;
		});

		var chartUrls = {
			lastfm_base:"http://ws.audioscrobbler.com/2.0/?method=METHOD&page=1&limit=200&api_key=0325c588426d1889087a065994d30fa1&format=json&callback=?",
			billboards_base:"http://api.musixmatch.com/ws/1.1/chart.tracks.get?page=1&page_size=100&country=#&f_has_lyrics=1&apikey=316bd7524d833bb192d98be44fe43017&format=jsonp&callback=?",
			lastfm_hyped:function(){ return this.lastfm_base.replace("METHOD","chart.gethypedtracks"); },
			lastfm_top:function(){ return this.lastfm_base.replace("METHOD","chart.gettoptracks"); },
			lastfm_loved:function(){ return this.lastfm_base.replace("METHOD","chart.getlovedtracks"); },
			billboards_uk:function() { return this.billboards_base.replace("#","uk"); },
			billboards_us:function() { return this.billboards_base.replace("#","us"); },
			itunes_store:function() { return "https://itunes.apple.com/us/rss/topsongs/limit=300/explicit=true/json"; }
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
			Spank.playlistScroller.push(o);
			if (i===chartPlaylistItems.length-1) {
				// Fill the page with one of the charts... note that
				// we wait a bit first to let FB do it's thing cause
				// once this starts, all the bandwidth will be sucked
				// by downloading album art!
				var t1 = setTimeout(function() {
					$(".playlistThumb[title='Billboards UK']").trigger("click");
					clearTimeout(t1);
				},2000);
			}
		});
	});

})();



