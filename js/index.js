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

	$(document).ready(function () {

		var vk_search_in_progress = false,
			mx_get_lyrics_in_progress = false;

		$(document).bind("login", function() {
			$("title").text("Spank.io | " + FB_userInfo.name);
		});

		$(document).bind("logout", function() {
			$("title").text("Welcome to Spank!");
		});

		$("#lightBox").jScrollPane("lightBox_jspPane", {
			autoReinitialise: true,
			scrollbarWidth: 0,
			scrollbarMargin: 0
		});

		$(".thoughtbot").click(function(){
			var funcs = {
					'Musical':function(){
						$("#vk-results-container").css("opacity","1.0");
						$("#vk-results-container").css("z-index","1");
						$("#lyricsText").css("opacity","0");
						$("#lyricsText").css("z-index","0");
					},
					'Lyrical':function(){
						$("#vk-results-container").css("opacity","0");
						$("#vk-results-container").css("z-index","0");
						$("#lyricsText").css("opacity","1.0");
						$("#lyricsText").css("z-index","1");
					}
				},
				f = funcs[$(this).text()];
			f();
		});

		//
		// When we CLOSE the LIGHTBOX
		//
		function tearDownLightBox() {
			lightBoxModel.lyricsText("");
			lightBoxModel.lyricsTitle("");
			lightBoxModel.lyricsThumb("");
			$("#vk-results-list").remove();
			$("#lightBox").slideUp('fast','swing');
			$("#lightBox_jspPane").html("");
			$(this).removeClass('busy');
			vk_search_in_progress = false;
			mx_get_lyrics_in_progress = false;
		}


		$("#closePlayButton").click(function() {
			tearDownLightBox();
		});

		$("#closeButton").click(function() {
			tearDownLightBox();
			try {
				// If nothing is playing, this raises an Exception
				if (threeSixtyPlayer.lastSound) {
					threeSixtyPlayer.lastSound.destruct();
				}
				$.each(soundManager.soundIDs, function(i, id) {
					if (id.match(/ui360/)) {
						soundManager.destroySound(id);
					}
				});
			} catch(e) {
				console.log(e);
			}
		});

		var vk_keys = ["13e47ebc10ca8da510ca8da57510e1e1c0110ca10c4b1ba407dcd8718254eba6cdd201b",
						"633b3aa76851ba026851ba0223687ad66766851685f861d38e74dc981cb38cbe200a017",
						"b63e1d33bf6561b4bf6561b4b9bf4e0dd1bbf65bf6b5dabefccf0d187e2dbaa4ac0b03e",
						"1d1aa7ae14a55a8e14a55a8e1d148e36eb114a514ab669144121a3185704c3e628ca24d"];
		var pick = 0;
		var searchVK = function(params) {
			vk_search_in_progress = true;
			$('<ul id="vk-results-list"></ul>').appendTo('#vk-results-container');
			var url = "https://api.vkontakte.ru/method/audio.search?q=QUERY\
						&access_token=TOKEN&count=100&callback=?",
				token = vk_keys[++pick%vk_keys.length];
			var xhr = $.getJSON(url.replace("TOKEN", token).replace("QUERY",params.q), function(data) {
				vk_search_in_progress = false;
				var message = "";
				if (data.error) {
					message = '<li class="vkMessage">Oopsies, couldn\'t find this song.</li>';
					$(message).appendTo("#vk-results-list");
				} else {
					message = '<li class="vkMessage">Found @MESSAGE@ track(s)</li>'.replace("@MESSAGE@", data.response[0]);
					$(message).appendTo("#vk-results-list");
					$.each(data.response.slice(1), function (i, track) {
						track.mxid = params.mxid;
						var trackAttr = [],
							title = track.title.slice(0,60) + ' -- ' + track.artist.slice(0,60);
						if (title.length>0 && title.length<80) {
							// VERY VERY IMPORTANT!
							// The lick button contains ALL the data we need to reconstruct every entry of the playlist
							// Where: MXID is MusixMatch's ID used in API tracks.get and URL is a VK song's OWNER_ID+TRACK_ID
							var lick = '<img class="lickButton" src="/img/lick.png" thumb="@THUMB@" mxid="@MXID@" artist="@ARTIST@" title="@TITLE@" url="@URL@" />',
								trackurl = track.owner_id + "_" + track.aid + ".mp3";
							lick = lick.replace("@THUMB@", params.thumb).replace("@MXID@", params.mxid).replace("@ARTIST@", track.artist).replace("@TITLE@", track.title).replace("@URL@", trackurl);
							// Add the 360 player. The player plays the href of the first <a> it finds after div.ui360
							trackAttr.push('<div class="ui360">' + '<a class="vkDownloadLink" href="' + track.url +'">'+ lick + title + '</a>'+'</div>');
							$('<li class="vkTrackEntry">' + trackAttr.join('') + '</li>').appendTo("#vk-results-list");
						}
					});
					// threeSixtyPlayer.init searches for div.ui360 elements and attaches a player to each item it finds.
					threeSixtyPlayer.init();
				}
			});
			$("#closeButton").click(function() {
				xhr.abort();
			});
		};

		//
		//	LIVE SEARCH FORM
		//
		// Suppress the ENTER key
		$("#lyrics").keydown(function(e){
			if ( e.keyCode===13 ) {
				return false;
			}
		});

		function LightBoxViewModel() {
			var self = this;
			self.lyricsTitle = ko.observable("");
			self.lyricsText = ko.observable("");
			self.lyricsThumb = ko.observable("");
			self.vkSearchResults = ko.observableArray([]);
		}

		var lightBoxModel = new LightBoxViewModel();
		ko.applyBindings(lightBoxModel, document.getElementById('lightBox'));

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
				var track = {mbid:'na', title:'na', artist:'na', mxid:"na", thumb:"http://api.musixmatch.com/images/albums/nocover.png"};
				if (o.hasOwnProperty("track")) {    // This is a MusiXMatch track object
					o = o.track;
					track.mbid = o.track_mbid;
					track.mxid = o.track_id;
					track.title = o.track_name;
					track.artist = o.artist_name;
					track.thumb = o.album_coverart_100x100;
					self.chartTracks.push(track);
				} else if (o.hasOwnProperty("mbid")) { // This is a last.fm track object
					track.artist = o.artist.name;
					track.title = o.name;
					track.mbid = o.mbid;
					track.thumb = o.image ? o.image[2]['#text'] : track.thumb;
					self.chartTracks.push(track);
				} else if (o.hasOwnProperty("im:artist")) { // This is an iTunes track object
					track.artist = o['im:artist'].label;
					track.title = o['im:name'].label;
					track.thumb = o['im:image'][1] ? o['im:image'][1].label : track.thumb;
					self.chartTracks.push(track);
				}
			}
		}

		var charts = new ChartsViewModel();
		Charts = charts;
		ko.applyBindings(charts);

		charts.chartTracks.subscribe(function() {
			$(".trackEntry.unwobbled").each(function(i,elem) {
				wobble(elem,-6,6);
			});
		});

		// Autopager for charts
		$("#resultsSection").scroll(function() {
			var last = $(".results-list:last-child");
//			console.log($("#resultsSection").scrollTop()*0.4 + " > " + (last.position().top + last.height()));
			if ($("#resultsSection").scrollTop()*0.4 > (last.position().top + last.height())) {
				Charts.fetchMore();
			}
//			var lower_bound = $(document).height(),
//				upper_bound = $("#searchForm").height()*5;
//			var last = $(".results-list:last-child");
//			if ($("#resultsSection").scrollTop()*0.4 > (last.position().top + last.height())) {
//				Charts.fetchMore();
//			}
//          NOTE: Print the current track number. DISABLED cause it's too slow!
//			$(".trackEntry").each(function(i, line) {
//				var top = $(line).position().top;
//				if (top<=lower_bound && top>=upper_bound) {
//					$("#track_count_current").text(padToFour(i));
//				}
//			});
		});

		$.searchByWire = function(search_term) {
			// Get the lightbox out of the way when we start searching again...
			$("#closePlayButton").trigger("click");
			var url = '/mxsearch?q=#&page=1'.replace("#",search_term);
			$("html").addClass('busy');
			$.ajax({
				type: 'GET',
				url: url,
				success: function(response) {
					$("html").removeClass('busy');
					var items = [],
						tracklist = response.message.body.track_list;
					if (tracklist.length>0) {
						charts.current_url = url;
						charts.chartTracks.removeAll();
						$.each(tracklist, function (i, o) {
							charts.push(o);
						});
					} else {
						items.push('<li class="trackName">' + "Nothing found!" + '</li>');
					}
				}
			});
			return false;
		};

		$(".trackArtist").live("click", function() {
			var artist = $(this).text();
			$("#lyrics").val(artist).trigger("keyup");
		});

		$("#lyrics").livesearch({
			searchCallback: $.searchByWire,
			innerText: "Freed music",
			queryDelay:500,
			minimumSearchLength: 3
		});

		// Add new songs to the playlist when the lick button is clicked.
		$(".lickButton").live('click', function addThisToPlaylist() {
			var attributes = ["mxid", "title", "artist", "url", "thumb"],
				data = {},
				that = $(this);
			try {
				$.each(attributes, function(i, attr) {
					data[attr] = that.attr(attr);
				});
				if (typeof($.MyTotalPlayer)==='object') {
					$.MyTotalPlayer.addToPlaylist(data, function () {
						$(document).trigger("playlistDidChange");
					});
				} else {
					alert("Login first to add to your playlist!");
				}
			} catch(err) {
				console.log(err);
			}
			return false;
		});

		function mxMatchOne(title, artist, callback, err_callback) {
			var url = "http://api.musixmatch.com/ws/1.1/matcher.track.get?q_artist=ARTIST&q_track=TRACK\
						&apikey=316bd7524d833bb192d98be44fe43017&format=jsonp&callback=?";
			artist = encodeURIComponent($.trim(artist));
			title = encodeURIComponent($.trim(title));
			url = url.replace("ARTIST", artist).replace("TRACK", title);
			$.getJSON(url, function(res) {
				try {
					if (res.message.body.track) {
						callback(res.message.body.track);
					} else {
						err_callback();
					}
				} catch(err) {
					err_callback()
				}
			});
		}

		function getLyricsWithMxid(track) {
			mx_get_lyrics_in_progress = true;
			function getLyrics(mxid) {
				var url = "http://api.musixmatch.com/ws/1.1/track.lyrics.get?track_id=#\
							&apikey=316bd7524d833bb192d98be44fe43017&format=jsonp&callback=?";
				$.getJSON(url.replace("#", mxid), function(data) {
					mx_get_lyrics_in_progress = false;
					try {
						if (data.message.body && data.message.body.lyrics.lyrics_body) {
							lightBoxModel.lyricsText(data.message.body.lyrics.lyrics_body);
						}
					} catch(err) { }
				});
			}
			if (track.mxid=='na') {
				mxMatchOne(track.title, track.artist, function onmatch(o) {
					getLyrics(o.track_id);
				}, function onerr() {
					mx_get_lyrics_in_progress = false;
				});
			} else {
				getLyrics(track.mxid);
			}
		}

		$('#accordion-container').easyAccordion();

		$(".lyricLink").live('click', function openLightbox() {
			if (!vk_search_in_progress && !mx_get_lyrics_in_progress && $("#lightBox").css("display")!='block') {
				var anchor = $(this),
					trackEntry = anchor.parent().parent(),
					title = anchor.text(),
					thumb = trackEntry.find(".mxThumb").attr("src"),
					artist = trackEntry.find(".trackArtist").text(),
					query_string = title + " " + artist,
					mxid = anchor.attr("mxid");
				getLyricsWithMxid({artist:artist, title:title, mxid:mxid});
				searchVK({q:query_string,
					mxid:mxid, thumb:thumb});
				lightBoxModel.lyricsThumb(thumb);
				lightBoxModel.lyricsTitle(title + " | " + artist);
				$("#lightBox").slideDown('fast','swing');
			}
			return false;
		});

	});

})();