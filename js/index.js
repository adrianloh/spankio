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
	var byProperty = function(prop) {
		return function(a,b) {
			if (typeof a[prop] == "number") {
				return (a[prop] - b[prop]);
			} else {
				return ((a[prop] < b[prop]) ? -1 : ((a[prop] > b[prop]) ? 1 : 0));
			}
		};
	};

	var object_to_list = function(o) {
		var mylist = [];
		for(var key in o) {
			if (o.hasOwnProperty(key)) {
				mylist.push(o[key]);
			}
		}
		return mylist;
	};

	$(document).ready(function () {

		var current_page = 1,
			search_term = "",
			store = {},
			track_fragment = "",
			current_playlist = "mainlibrary",
			library = {mainlibrary:{rev:0, playlist:[]}};

		var vk_search_in_progress = false,
			mx_get_lyrics_in_progress = false;

		// Hide the lightbox on first load
		// $("#blockHead").html('&#9609;&#9609;&#9609;&#9609;&#9609;');
		$("#lightBox").hide();
		(new Image()).src = "/img/tape1.png";
		(new Image()).src = "/img/lick.png";
		(new Image()).src = "/TotalControl/images/default-lcd-screen_saving.png";
		(new Image()).src = "/TotalControl/images/default-lcd-screen_unsaved.png";

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

		var addToPlaylist = function(track, callback) {
			var data = track_fragment.replace("@MID@", track.mid).replace("@ARTIST@", track.artist).replace("@TITLE@", track.title).replace("@URL@", track.url);
			$(data).prependTo(".jspPane");
			if (callback) {
				callback();
			}
		};

		var saveAttempt = 0;
		$(document).bind("playlistDidChange", function saveCurrentPlaylist(e){
			$(".total-lcd-screen").css("background-image","url(/TotalControl/images/default-lcd-screen_saving.png)");
			var playlist = [];
			$(".total-row").each(function(i,div) {
				var track = {};
				track.mid = div.getAttribute("mid");
				track.title = div.children[2].innerText;
				track.url = div.children[2].getAttribute("src");
				track.artist = div.children[3].innerText;
				playlist.push(track);
			});
			$(".total-song-amount").text(playlist.length + " Songs");
			$.ajax({
				type:'PUT',
				url: "/playlist/" + $("title").text() + "@" + current_playlist,
				data:{rev:library[current_playlist].rev, playlist:JSON.stringify(playlist)},
				success: function(data) {
					var res = JSON.parse(data);
					if (res.ok) {
						var pname = res.id.split("_").slice(-1);
						library[pname].rev = res.rev;
						$(".total-lcd-screen").css("background-image","url(/TotalControl/images/default-lcd-screen.png)");
						saveAttempt=0;
					} else if (saveAttempt===0) {
						saveAttempt++;
						setTimeout(function(){
							$(document).trigger("playlistDidChange");
						},10000)
					} else {
						$(".total-lcd-screen").css("background-image","url(/TotalControl/images/default-lcd-screen_unsaved.png)");
						saveAttempt=0;
					}
				}
			})
		});

		function populatePlaylist() {
			var username = $("title").text();
			if (username) {
				var url = "/playlist/" + username + "@" + current_playlist;
				$.getJSON(url, function(data) {
					if (data.playlist.length>0) {
						library[current_playlist].rev = data.rev;
						library[current_playlist].playlist = data.playlist;
						$(".total-row").html("");
						$.each(data.playlist, function(i, track) {
							addToPlaylist(track);
						});
						$(".total-song-amount").text(data.playlist.length + " Songs");
					}
				})
			}
		}

		// Total player adds tracks to its playlist by naively appending
		// div layers to itself. Get the div html fragment that we'll
		// use later to add new songs to the playlist.
		$.get("/static/track_fragment.txt", function(fragment) {
			track_fragment = fragment;
			$("#total-playlist").totalControl({
				style: "default.css",
				checkboxesEnabled: true,
				playlistSortable: true,
				position: "relative",
				playlistHeight:500,
				repeatOneEnabled: true,
				repeatAllEnabled: true,
				shuffleEnabled: true,
				playlistVisible: true,
				songTooltipPosition: "top",
				songTooltipEnabled: false,
				miniPlayer:false,
				isDraggable: true,
				autoplayEnabled: false,
				addSongEnabled: false
			});
			populatePlaylist();
			$('<div id="playlists-list"></div>').appendTo("#total-playlist");
			$.each(["Main Library","90s Hits", "Good Old Days", "Dance Bitches Dance"], function(i,o){
				$('<div class="playlist-name">' + o + '</div>').appendTo("#playlists-list");
			});
		});

		//
		// When we CLOSE the LIGHTBOX
		//
		$("#closeButton").click(function() {
			$("#lyricsText").text("");
			$("#vk-results-list").each(function(i,o) {
				$(o).remove();
			});
			$("#lightBox").slideUp('fast','swing');
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
			$('<ul id="vk-results-list"></ul>').appendTo('#lightBox');
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
							store[track.aid] = track;
							var trackAttr = [],
								title = track.title.slice(0,60) + ' -- ' + track.artist.slice(0,60);
							if (title.length>0 && title.length<80) {
								//var div = '<div class="ui360"><a class="vkDownloadLink" href="@URL@">Want your revenge</a></div>'.replace("@URL@", track.url);
								//$(div).appendTo("body");
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
							trackAttr.push('<div class="trackName">'+ '<a class="lyricLink" href="#" track_id="' + track.track_id +'">'+ track.track_name.slice(0,45) +'</a>' +'</div>');
 							trackAttr.push('<div class="trackArtist">'+ track.artist_name +'</div>');
							items.push('<li class="trackEntry">' + trackAttr.join('') + '</li>');
						});
					} else {
						items.push('<li class="trackName">' + "Nothing found!" + '</li>');
					}
					$('<ul/>', {'class':'results-list', html:items.join('')}).appendTo('#resultsSection');
					$(".trackEntry").each(function() { wobble($(this),-7,5); });
					$("#resultsSection").trigger("scroll");
//						$("#prev_page").css('cursor','pointer');
//						$("#next_page").css('cursor','pointer');
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
			innerText: "KEEP CALM AND OPEN YOUR EARS",
			queryDelay:250,
			minimumSearchLength: 3
		});

		var loadMXResults = function() {
			var data = {q:search_term, page:current_page};
			$.ajax({
				type: 'GET',
				url: '/mxsearch/' + encodeURIComponent(JSON.stringify(data)),
				success: function(response) {
					var items = [],
						tracks_available = response.message.header.available,
						tracklist = response.message.body.track_list;
					if (tracklist.length>0) {
						$('<div/>', {'id':'pageNumber', 'class':'results-total', html:'Page: ' + current_page}).appendTo('#resultsTotal');
						$.each(tracklist, function (i, o) {
							var track = o.track;
							var trackAttr = [];
							trackAttr.push('<div class="trackName">'+ '<a class="lyricLink" href="#" track_id="' + track.track_id +'">'+ track.track_name.slice(0,45) +'</a>' +'</div>');
							trackAttr.push('<div class="trackArtist">'+ track.artist_name +'</div>');
							items.push('<li class="trackEntry">' + trackAttr.join('') + '</li>');
						});
					} else {
						items.push('<li class="trackName">' + "Nothing found!" + '</li>');
					}
					$('<ul/>', {'class':'results-list', html:items.join('')}).appendTo('#resultsSection');
					$(".trackEntry").each(function() { wobble($(this),-7,5); });
					$("#prev_page").css('cursor','pointer');
					$("#next_page").css('cursor','pointer');
				}
			});
		};

		// Add new songs to the playlist when the lick button is clicked.
		$(".lickButton").live('click', function addThisToPlaylist() {
			var attributes = ["mid", "title", "artist", "url"],
				data = {},
				that = $(this);
			$.each(attributes, function(i, attr) {
				data[attr] = that.attr(attr);
			});
			addToPlaylist(data, function () {
				$(document).trigger("playlistDidChange");
			});
			return false;
		});

		$.displayLyrics = function(title, artist, track_id) {
			mx_get_lyrics_in_progress = true;
			$.ajax({
				type: 'GET',
				url: "/lyrics/" + track_id,
				success: function(data) {
					mx_get_lyrics_in_progress = false;
					if (data.message.header.status_code==200) {
						$("#lightBox").slideDown('fast','swing');
						$("#lyricsTitle").text(title + " | " + artist);
						var lyrics = "Lyrics not available.";
						if (data.message.body.lyrics.lyrics_body) {
							lyrics = data.message.body.lyrics.lyrics_body
						}
						$("#lyricsText").text(lyrics);
					} else {
						console.log("$displayLyrics returned error with object:");
						console.log(data);
						alert("Cannot find lyrics for this song!");
					}
				}
			});
		};

		$(".total-row").live("dragend", function(e) {
			// console.log(e);
			$(document).trigger("playlistDidChange");
		});

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

		var removeResults = function() {
			$(".results-list").remove();
			$(".results-total").remove();
		};

		$("#next_page").click(function() {
			$(this).css('cursor','wait');
			removeResults();
			current_page++;
			loadMXResults();
		}).hide();

		$("#prev_page").click(function() {
			$(this).css('cursor','wait');
			if (!(current_page===1)) {
				removeResults();
				current_page--;
				loadMXResults();
			}
		}).hide();

		$(".button").css("display","none");
		$(".button").click(function () {
			removeResults();
			current_page = 1;
			search_term = $("input#lyrics").val();
			loadMXResults();
			return false;
		});

	});

})();