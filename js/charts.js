(function(){


	$(document).ready(function () {

		var lastfmTop = {
			lastfm_base:"http://ws.audioscrobbler.com/2.0/?method=METHOD&page=1&limit=300&api_key=0325c588426d1889087a065994d30fa1&format=json&callback=?",
			billboards_base:"http://api.musixmatch.com/ws/1.1/chart.tracks.get?page=1&page_size=100&country=#&f_has_lyrics=1&apikey=316bd7524d833bb192d98be44fe43017&format=jsonp&callback=?",
			lastfm_hyped:function(){ return this.lastfm_base.replace("METHOD","chart.gethypedtracks"); },
			lastfm_top:function(){ return this.lastfm_base.replace("METHOD","chart.gettoptracks"); },
			lastfm_loved:function(){ return this.lastfm_base.replace("METHOD","chart.getlovedtracks"); },
			billboards_uk:function() { return this.billboards_base.replace("#","uk"); },
			billboards_us:function() { return this.billboards_base.replace("#","us"); },
			itunes_store:function() { return "https://itunes.apple.com/us/rss/topsongs/limit=300/explicit=true/json"; }
		};

		var last_request_time = new Date().getTime()-5000;
		$(".chart-button").bind("click", function(event, myUrl) {
			var tracklist,
				chartName = $(this).text().replace(".","").replace(" ","_").toLowerCase(),
				url = myUrl || lastfmTop[chartName]();
			var timeNow = new Date().getTime(),
				timeDelta = timeNow - last_request_time;
			if (timeDelta>2000) {
				$("html").addClass('busy');
				console.log(url);
				$.getJSON(url, function(res) {
					if (res.hasOwnProperty("message")) {        // MusiXMatch
						tracklist = res.message.body.track_list;
					} else if (res.hasOwnProperty("feed")) {    // iTunes
						tracklist = res.feed.entry;
					} else if (res.hasOwnProperty("tracks")) {  // LastFM
						tracklist = res.tracks.track;
					}
					Charts.current_url = url;
					if (tracklist.length>0) {
						if (!myUrl) {
							Charts.chartTracks.removeAll();
						}
						$.each(tracklist, function(i,o) {
							Charts.push(o);
						});
						Charts.ok_to_fetch_more = true;
					} else {
						Charts.ok_to_fetch_more = false;
					}
					$("html").removeClass('busy');
				});
				last_request_time = new Date().getTime();
			}
		});

		$(".chart-button").filter(function() {
			return $(this).text()=="Billboards UK";
		}).trigger("click");

	});

})();




