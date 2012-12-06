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
			var self = this;
			self.current_url = null;
			// Editable data
			self.ok_to_fetch_more = true;
			self.chartTracks = ko.observableArray([]);
			self.totalChartTracks = ko.computed(function(){
				return Spank.utils.padToFour(self.chartTracks().length);
			});
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
					title:'na',
					artist:'na',
					album:'',
					mxid:"na",
					thumb: Spank.genericAlbumArt
				};
				if (o.hasOwnProperty("track")) {    // This is a MusiXMatch track object
					o = o.track;
					track.title = o.track_name;
					track.artist = o.artist_name;
					track.album = o.album_name;
					track.thumb = o.album_coverart_350x350 ? o.album_coverart_350x350 : track.thumb;
					track.mbid = o.track_mbid;
					track.mxid = o.track_id;
					return track;
				} else if (o.hasOwnProperty("mbid")) { // This is a last.fm track object
					track.artist = o.artist.name;
					track.title = o.name;
					track.thumb = o.image ? o.image[3]['#text'] : track.thumb;
					track.mbid = o.mbid;
					return track;
				} else if (o.hasOwnProperty("im:artist")) { // This is an iTunes track object
					track.artist = o['im:artist'].label;
					track.title = o['im:name'].label;
					track.thumb = o['im:image'][2] ? o['im:image'][2].label : track.thumb;
					return track;
				} else if (o.hasOwnProperty("url")) { // A song in our own playlist, thus URL
					track.title = o.title;
					track.artist = o.artist;
					track.thumb = o.thumb;
					track.url = o.url;
					return track;
				} else {
					return false;
				}
			};
			self.pushBatch = function(list) {
				var newItems = ko.utils.arrayMap(list, function(item) {
					item = self.process(item);
					if (item!==false) {
						return item;
					}
				});
				//take advantage of push accepting variable arguments
				self.chartTracks.push.apply(self.chartTracks, newItems);
			};
			return this;
		})();

		ko.applyBindings(Spank.charts, document.getElementById('resultsSection'));

		var unfocusSearchBarTimeout = setTimeout(function(){},1000);
		Spank.charts.chartTracks.subscribe(function() {
			$(".trackEntry.unwobbled").each(function(i,elem) {
				Spank.utils.wobble(elem,-8,8);
			});
			clearTimeout(unfocusSearchBarTimeout);
			setTimeout(function() {
				$("#lyrics").blur()
			},10000)
		});

		$("#random_button").mousedown(function() {
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