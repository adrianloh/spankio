(function() {

	function randrange(minVal,maxVal,floatVal) {
		var randVal = minVal+(Math.random()*(maxVal-minVal));
		return typeof floatVal=='undefined'?Math.round(randVal):randVal.toFixed(floatVal);
	}

	function wobble(elem, min, max) {
		var rotate = "rotate(#deg)".replace("#",randrange(min,max));
		elem.css("webkit-transform",rotate);
	}

	function padToFour(number) {
		if (number<=9999) { number = ("000"+number).slice(-4); }
		return number;
	}

	$(document).ready(function () {

		var current_page = 1,
			vk_search_in_progress = false,
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

		// Track our position along the lyrics results list
		$("#resultsSection").scroll(function() {
			var lower_bound = $(document).height(),
				upper_bound = $("#searchForm").height()*5;
			$(".trackEntry").each(function(i, line) {
				var top = $(line).position().top;
				if (top<=lower_bound && top>=upper_bound) {
					$("#track_count_current").text(padToFour(i));
				}
			});
		});

		//
		// When we CLOSE the LIGHTBOX
		//
		$("#closeButton").click(function() {
			$("#lyricsText").text("");
			$("#vk-results-list").html("");
			$("#lightBox").slideUp('fast','swing');
			$("#lightBox_jspPane").html("");
			$(this).removeClass('busy');
			vk_search_in_progress = false;
			mx_get_lyrics_in_progress = false;
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

		var searchVK = function(vksearch_q, mx_track_id) {
			vk_search_in_progress = true;
			$('<ul id="vk-results-list"></ul>').appendTo('.lightBox_jspPane');
			var xhr = $.ajax({
				type: 'GET',
				url: '/vksearch/'+encodeURIComponent(vksearch_q),
				success: function(data) {
					vk_search_in_progress = false;
					var message = "";
					if (data.error) {
						message = '<li class="vkMessage">Oopsies, couldn\'t find this song.</li>'
						$(message).appendTo("#vk-results-list");
					} else {
						message = '<li class="vkMessage">Found @MESSAGE@ track(s)</li>'.replace("@MESSAGE@", data.response.length);
						$(message).appendTo("#vk-results-list");
						$.each(data.response, function (i, track) {
							track.mid = mx_track_id;
							var trackAttr = [],
								title = track.title.slice(0,60) + ' -- ' + track.artist.slice(0,60);
							if (title.length>0 && title.length<80) {
								// The lick button
								var lick = '<img class="lickButton" src="/img/lick.png" mid="@MID@" artist="@ARTIST@" title="@TITLE@" url="@URL@" />',
									trackurl = "/tracksearch/" + track.owner_id + "_" + track.aid + ".mp3"
									lick = lick.replace("@MID@", mx_track_id).replace("@ARTIST@", track.artist).replace("@TITLE@", track.title).replace("@URL@", trackurl);
								// Add the 360 player. The player plays the href of the first <a> it finds after div.ui360
								trackAttr.push('<div class="ui360">' + '<a class="vkDownloadLink" href=/track/' + track.url +'>'+ lick + title + '</a>'+'</div>');
								$('<li class="vkTrackEntry">' + trackAttr.join('') + '</li>').appendTo("#vk-results-list");
							}
						});
						// threeSixtyPlayer.init searches for div.ui360 elements and attaches a player to each item it finds.
						threeSixtyPlayer.init();
					}
				}
			});
			$("#closeButton").click(function() {
				xhr.abort();
			});
		};

		//
		//	LIVE SEARCH FORM
		//
		// Stop the ENTER key from submitting the form when we hit it
		$("#lyrics").keydown(function(e){
			if ( e.keyCode===13 ) {
				return false;
			}
		});

		$.searchByWire = function(search_term) {
			$("#closeButton").trigger("click");
			var data = {q:search_term, page:current_page};
			$("html").addClass('busy');
			$.ajax({
				type: 'GET',
				url: '/mxsearch/' + encodeURIComponent(JSON.stringify(data)),
				success: function(response) {
					$("html").removeClass('busy');
					var items = [],
						tracklist = response.message.body.track_list;
					if (tracklist.length>0) {
						$("#track_count_total").text(padToFour(tracklist.length));
						$('#resultsSection').html("");
						$('<div/>', {'id':'pageNumber', 'class':'results-total', html:'Page: ' + current_page}).appendTo('#resultsTotal');
						$.each(tracklist, function (i, o) {
							var track = o.track;
							var trackAttr = [];
							trackAttr.push('<img class="mxThumb" src="@" />'.replace("@",track.album_coverart_100x100));
							trackAttr.push('<div class="trackName">'+ '<a class="lyricLink" href="#" track_id="' + track.track_id +'">'+ track.track_name.slice(0,45) +'</a>' +'</div>');
 							trackAttr.push('<div class="trackArtist">'+ track.artist_name +'</div>');
							items.push('<li class="trackEntry">' + trackAttr.join('') + '</li>');
						});
					} else {
						items.push('<li class="trackName">' + "Nothing found!" + '</li>');
					}
					$('<ul/>', {'class':'results-list helix', html:items.join('')}).appendTo('#resultsSection');
					//stroll.bind(".results_list");
					$(".trackEntry").each(function() { wobble($(this),-7,5); });
					$("#resultsSection").trigger("scroll");
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
			innerText: "The Times They Are A-Changin'",
			queryDelay:250,
			minimumSearchLength: 3
		});

		// Add new songs to the playlist when the lick button is clicked.
		$(".lickButton").live('click', function addThisToPlaylist() {
			var attributes = ["mid", "title", "artist", "url"],
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

		$.displayLyrics = function(title, artist, track_id) {
			mx_get_lyrics_in_progress = true;
			$.ajax({
				type: 'GET',
				url: "/lyrics/" + track_id,
				success: function(data) {
					mx_get_lyrics_in_progress = false;
					var message = data.message;
					if (message.header.status_code==200) {
						$("#lightBox").attr("mx_track_id", track_id).slideDown('fast','swing');
						$("#lyricsTitle").text(title + " | " + artist);
						//$("#lyricsTitle").fitText();
						var lyrics = message.body.lyrics.lyrics_body || "Lyrics not available.";
						$("#lyricsText").text(lyrics);
					} else {
						console.log("$displayLyrics returned error with object:");
						console.log(data);
					}
				}
			});
		};

		$(".lyricLink").live('click', function openLightbox() {
			if (!vk_search_in_progress && !mx_get_lyrics_in_progress && $("#lightBox").css("display")!='block') {
				var title = $(this).text(),
					artist = $(this).parent().next().text(),
					query_string = title + " " + artist,
					track_id = $(this).attr("track_id");
				searchVK(query_string, track_id);
				$.displayLyrics(title, artist, track_id);
			}
			return false;
		});

	});

})();