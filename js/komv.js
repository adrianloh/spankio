(function() {

	function randrange(minVal,maxVal,floatVal) {
		var randVal = minVal+(Math.random()*(maxVal-minVal));
		return typeof floatVal=='undefined'?Math.round(randVal):randVal.toFixed(floatVal);
	}

	function wobble(elem, min, max) {
		var rotate = "rotate(#deg)".replace("#",randrange(min,max));
		$(elem).css("webkit-transform",rotate).removeClass("unwobbled");
	}

	function padToFour(number) {
		if (number<=9999) { number = ("000"+number).slice(-4); }
		return number;
	}

	$(document).ready(function(){

		function LightBoxViewModel() {
			var self = this;
			self.lyricsTitle = ko.observable("");
			self.lyricsText = ko.observable("");
			self.lyricsThumb = ko.observable("");
			self.vkSearchResults = ko.observableArray([]);
		}

		Spank.lightBox = new LightBoxViewModel();
		ko.applyBindings(Spank.lightBox, document.getElementById('lightBox'));

		function ChartsViewModel() {
			var self = this;
			self.current_url = null;
			// Editable data
			self.ok_to_fetch_more = true;
			self.chartTracks = ko.observableArray([]);
			self.totalChartTracks = ko.computed(function(){
				return padToFour(self.chartTracks().length);
			});
			self.fetchMore = function() {
				if (self.ok_to_fetch_more) {
					var match = self.current_url.match(/page=(\d+)/);
					if (match) {
						var next = ++match[1],
							next_url = self.current_url.replace(/page=(\d+)/,"page="+next);
						$(".chart-button").trigger("click",[next_url]);
					}
				}
			};
			self.push = function(o) {
				// Init defaults for properties our view expects
				var track = {
					mbid:'na',
					title:'na',
					artist:'na',
					album:'',
					mxid:"na",
					thumb:"http://lh5.googleusercontent.com/-iNJ6fFP1ESk/ULlYVjb-m6I/AAAAAAAAVZU/QFfGVNT2pb8/s0/hi-512-5.png"
				};
				if (o.hasOwnProperty("track")) {    // This is a MusiXMatch track object
					o = o.track;
					track.title = o.track_name;
					track.artist = o.artist_name;
					track.album = o.album_name;
					track.thumb = o.album_coverart_350x350 ? o.album_coverart_350x350 : track.thumb;
					track.mbid = o.track_mbid;
					track.mxid = o.track_id;
					self.chartTracks.push(track);
				} else if (o.hasOwnProperty("mbid")) { // This is a last.fm track object
					track.artist = o.artist.name;
					track.title = o.name;
					track.thumb = o.image ? o.image[2]['#text'] : track.thumb;
					track.mbid = o.mbid;
					self.chartTracks.push(track);
				} else if (o.hasOwnProperty("im:artist")) { // This is an iTunes track object
					track.artist = o['im:artist'].label;
					track.title = o['im:name'].label;
					track.thumb = o['im:image'][2] ? o['im:image'][2].label : track.thumb;
					self.chartTracks.push(track);
				}
			};
		}

		Spank.charts = new ChartsViewModel();
		ko.applyBindings(Spank.charts);

		Spank.charts.chartTracks.subscribe(function() {
			$(".trackEntry.unwobbled").each(function(i,elem) {
				wobble(elem,-8,8);
			});
		});

		// Autopager for charts
		$("#resultsSection").scroll(function() {
			var last = $(".results-list:last-child");
			if ($("#resultsSection").scrollTop()*0.4 > (last.position().top + last.height())) {
				Spank.charts.fetchMore();
			}
		});

		$(document).bind("soundplay", function(event,o) {
			console.log(o);
		});

	});



})();