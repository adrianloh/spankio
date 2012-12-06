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
			search_term = "",
			track_fragment = "",
			current_playlist = "Main Library";

		var username = $("title").text();
		if (username=='Welcome!') {
			username = "Guest";
		}

		var vk_search_in_progress = false,
			mx_get_lyrics_in_progress = false;

		$("#lightBox").jScrollPane("lightBox_jspPane", {
			autoReinitialise: true,
			scrollbarWidth: 0,
			scrollbarMargin: 0
		});

		// Preload images
		$.each([
			"/img/tape1.png",
			"/img/lick.png",
			"/TotalControl/images/default-lcd-screen.png",
			"/TotalControl/images/default-lcd-screen_unsaved.png"
		], function(i, src) {
			(new Image()).src = src
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
		// ADD A NEW TRACK TO THE CURRENT PLAYLIST
		//
		var addToPlaylist = function(track, callback) {
			var data = track_fragment.replace("@MID@", track.mid).replace("@ARTIST@", track.artist).replace("@TITLE@", track.title).replace("@URL@", track.url);
			$(data).prependTo(".total_jspPane");
			if (callback) {
				callback();
			}
		};

		//
		// SAVE THE CURRENT PLAYLIST
		//
		$(document).bind("playlistDidChange", function saveCurrentPlaylist(e) {
			var playlist = [];
			playerLCD.loading();
			$(".total-row").each(function(i,div) {
				div = $(div);
				playlist.push({
					mid: div.attr("mid"),
					artist: div.find(".total-artist").text(),
					title: div.find(".total-title").text(),
					url: div.find(".total-title").attr("src")
				});
			});
			playerLCD.status(current_playlist, playlist.length);
			var req_url = "/playlist/" + username + " PLAYLIST " + encodeURIComponent(current_playlist);
			console.log("Saving to: ".concat(req_url));
			$.ajax({
				type:'PUT',
				url: req_url,
				data:{data:JSON.stringify(playlist)},
				success: function(data) {
					if (data) {
						playerLCD.good()
					} else {
						playerLCD.bad()
					}
				}
			})
		});

		function createPlaylistItemWithName(name) {
			$('<div class="playlist-row">' + name + '</div>').editable({editBy:'dblclick'}).droppable({
				hoverClass: "playlist-bout-to-get-some",
				drop: function( event, ui ) {
					var this_playlist_name = $(this).text(),
						dropped_track = $(ui)[0].draggable,
						track = {mid: dropped_track.attr("mid"),
							artist: dropped_track.find(".total-artist").text(),
							title: dropped_track.find(".total-title").text(),
							url: dropped_track.find(".total-title").attr("src")
						},
						req_url = "/playlist/" + username + " PLAYLIST " + encodeURIComponent(this_playlist_name);
					$.ajax({
						type:'PUT',
						url: req_url,
						data:{data:JSON.stringify(track)},
						success: function(data) {
							if (data) {
								playerLCD.good();
							} else {
								playerLCD.bad();
							}
						}
					});
				}
			}).appendTo("#playlist-container");
		}

		//
		// LOAD A NEW PLAYLIST
		//
		$(".playlist-row").live("click", function loadPlaylistOnClick() {
			playerLCD.loading();
			var playlist_to_load = $(this).text();
			console.log("Loading playlist --> " + playlist_to_load);
			current_playlist = playlist_to_load;
			var url = "/playlist/" + username + " PLAYLIST " + encodeURIComponent(playlist_to_load);
			$.getJSON(url, function(tracklist) {
				$(".total-row").remove();
				tracklist = tracklist || [];
				var total_songs = tracklist.length || 0;
				$.each(tracklist, function(i, track) {
					addToPlaylist(track);
				});
				playerLCD.status(playlist_to_load, total_songs);
				playerLCD.good();
			});
		});

		var playerLCD = "";
		$.get("/static/track_fragment.txt", function getTotalSongFragment(fragment) {
			// Total player adds tracks to its playlist by naively appending
			// div layers to itself. Get the div html fragment that we'll
			// use later to add new songs to the playlist.
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
				addSongEnabled: true
			});

			playerLCD = {
				screen:$(".total-lcd-screen"),
				status_line:$(".total-song-amount"),
				good:function(){
					this.screen.css("background-image","url(/TotalControl/images/default-lcd-screen.png)");
				},
				loading:function(){
					this.screen.css("background-image","url(/TotalControl/images/default-lcd-screen_saving.png)");
					return this.screen;
				},
				bad:function(){
					this.screen.css("background-image","url(/TotalControl/images/default-lcd-screen_unsaved.png)");
				},
				status:function(playlist, total){
					this.status_line.text(playlist + " | " + total + " Songs");
				}
			};

			$('<div id="playlist-container"></div>').appendTo("#total-playlist");

			//
			// FIRST LOAD OF SAVED PLAYLISTS
			//
			$.getJSON("/playlist/" + username + " PLAYLIST ALL", function(data) {
				$.each(data, function(i, playlist_name) {
					createPlaylistItemWithName(playlist_name.split(" PLAYLIST ").slice(-1));
				});
				$(".playlist-row").filter(function(i) {
					return $(this).text()=="Main Library";
				}).trigger("click");
			});

			$(".total_jspPane").sortable({
				update : function (e) {
					$(document).trigger("playlistDidChange");
				}
			});

			$(".total-row").draggable({
				connectToSortable: ".total_jspPane",
				helper: "clone",
				revert: "invalid"
			});

			function highlightCurrentlySelectedItemInPlayer(selected_row) {
				var klass = selected_row.attr("class").split(" ")[0];
				$("."+klass).filter(function (i) {
					return $(this).css('background-color')=='rgb(1, 143, 239)'
				}).css("background-color","#ffffff");
				selected_row.css("background-color","018fef");
			}

			//
			//
			// CONTEXT MENUS
			//
			//
			var songListContextMenu = [
				{'Lyrics':{
					onclick:function(menuItem,menu) {
						var div = $(this),
							mid = div.attr("mid"),
							title = div.children()[2].innerText,
							artist = div.children()[3].innerText;
						if (mid) {
							$.displayLyrics(title, artist, mid);
						} else {
							$.searchByWire(title + " " + artist)
						}
					},
					title:'This is the hover title',
					disabled:false
				}
				},
				{'Remove':{
					onclick:function(menuItem,menu) {
						$(this).remove();
						$(document).trigger("playlistDidChange");
					},
					disabled:false
				}
				},
				{'Download':{
					onclick:function(menuItem,menu) {
						var url = $(this).children()[2].getAttribute("src");
						$('<iframe width="0" height="0" frameborder="0" src="@"></iframe>'.replace("@",url)).appendTo("body");
						setTimeout(function(){
							$("iframe").remove();
						},60000);
					},
					disabled:false
				}
				}
			];

			var cmenu1 = $(document).contextMenu(songListContextMenu,{theme:'osx'});
			$(".total-row").live("contextmenu", function (event) {
				highlightCurrentlySelectedItemInPlayer($(this));
				cmenu1.show($(this), event);
				return false;
			});

			$(".playlist-row, .total-row").live("click", function (event) {
				highlightCurrentlySelectedItemInPlayer($(this))
			});

			var playlistItemContextMenu = [
				{'Delete':{
					onclick:function(menuItem,menu) {
						var that = $(this),
							playlist_name_to_delete = that.text(),
							req_url = "/playlist/" + username + " PLAYLIST " + encodeURIComponent(playlist_name_to_delete);
						$.ajax({
							type:'DELETE',
							url: req_url,
							success: function(data) {
								that.remove();
								$(".playlist-row").filter(function(i) {
									return $(this).text()=="Main Library";
								}).trigger("click");
							}
						});
					},
					disabled:false
				}
				}
			];

			var cmenu2 = $(document).contextMenu(playlistItemContextMenu,{theme:'osx'});
			$(".playlist-row").live("contextmenu", function (event) {
				highlightCurrentlySelectedItemInPlayer($(this));
				cmenu2.show($(this), event);
				return false;
			});

			var playlistContainerContextMenu = [
				{'New...':{
					onclick:function(menuItem,menu) {
						var randString = hex_md5(String(new Date().getTime())).slice(0,10);
						createPlaylistItemWithName("Playlist_" + randString);
					},
					title:'This is the hover title',
					disabled:false
				}
				}
			];

			var cmenu3= $(document).contextMenu(playlistContainerContextMenu,{theme:'osx'});
			$("#playlist-container").live("contextmenu", function (event) {
				cmenu3.show($(this), event);
				return false;
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
			innerText: "Keep Calm and Open Your Ears",
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
				addToPlaylist(data, function () {
					$(document).trigger("playlistDidChange");
				});
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

		var removeResults = function() {
			$(".results-list").remove();
			$(".results-total").remove();
		};

	});

})();