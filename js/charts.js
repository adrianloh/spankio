(function(){


	$(document).ready(function () {

		var lastfmTop = {
			base:"http://ws.audioscrobbler.com/2.0/?method=METHOD&api_key=0325c588426d1889087a065994d30fa1&limit=200&format=json&callback=?",
			lastfm_hyped:function(){ return this.base.replace("METHOD","chart.gethypedtracks") },
			lastfm_top:function(){ return this.base.replace("METHOD","chart.gettoptracks") },
			lastfm_loved:function(){ return this.base.replace("METHOD","chart.getlovedtracks") },
			itunes:function() { return "https://itunes.apple.com/us/rss/topsongs/limit=300/explicit=true/json" },
			billboards_uk:function() { return "http://api.musixmatch.com/ws/1.1/chart.tracks.get?page=1&page_size=100&country=uk&f_has_lyrics=1&apikey=316bd7524d833bb192d98be44fe43017&format=jsonp&callback=?" },
			billboards_us:function() { return "http://api.musixmatch.com/ws/1.1/chart.tracks.get?page=1&page_size=100&country=us&f_has_lyrics=1&apikey=316bd7524d833bb192d98be44fe43017&format=jsonp&callback=?" }
		};

		$(".chart-button").bind("click", function() {
			$("html").addClass('busy');
			var chartName = $(this).text();
			var tracklist;
			$.getJSON(lastfmTop[chartName](), function(res) {
				if (res.hasOwnProperty("message")) {        // MusiXMatch
					tracklist = res.message.body.track_list
				} else if (res.hasOwnProperty("feed")) {    // iTunes
					tracklist = res.feed.entry;
				} else if (res.hasOwnProperty("tracks")) {  // LastFM
					tracklist = res.tracks.track
				}
				if (tracklist) {
					Charts.chartTracks.removeAll();
					$.each(tracklist, function(i,o) {
						Charts.push(o);
					});
				}
				$("html").removeClass('busy');
			});
		});

	});

})();




