(function() {

	$(document).ready(function () {

		var vk_search_in_progress = false,
			mx_get_lyrics_in_progress = false;

		$(document).bind("login", function() {
			$("title").text("Spank.io | " + FBUserInfo.name);
		});

		$(document).bind("logout", function() {
			$("title").text("Welcome to Spank!");
		});

		$(".thoughtbot").click(function toggleBetweenMusicalLyrical(){
			var funcs = {
					'Musical':function(){
						$("#vk-results-container").css("display","block");
						$("#lyricsText").css("display","none");
					},
					'Lyrical':function(){
						$("#lyricsText").css("display","block");
						$("#vk-results-container").css("display","none");
					}
				},
				f = funcs[$(this).text()];
			f();
		});

		Spank.lightBox = {
			lyricsTitle: ko.observable(""),
			lyricsText: ko.observable(""),
			lyricsThumb: ko.observable(""),
			vkSearchResults: ko.observableArray()
		};

		ko.applyBindings(Spank.lightBox, document.getElementById('lightBox'));

		//
		// When we CLOSE the LIGHTBOX
		//
		var playlistScrollerWasVisible = false;
		Spank.tearDownLightBox = function() {
			Spank.lightBox.lyricsText("");
			Spank.lightBox.lyricsTitle("");
			Spank.lightBox.lyricsThumb("");
			$("#lightBox").slideUp('fast','swing', function(){});
			$("#closeButton").hide();
			$("html").removeClass("busy");
			$("#lightBox_jspPane").html("");
			$(".t_Tooltip_controlButtons2").remove();
			$("#myonoffswitch").prop('checked', false);
			vk_search_in_progress = false;
			mx_get_lyrics_in_progress = false;
			if (playlistScrollerWasVisible) {
				Spank.playlistScroller.visible(true);
				playlistScrollerWasVisible = false;
			}
		};

		$("#closeButton").click(function() {	// Close the lightbox. Stop playing music.
			Spank.tearDownLightBox();
		});

		Spank.busy = {
			on: function() {
				$("html").addClass("busy");
				$("#searchField").css("background-color", "rgba(187, 252, 143, 1)");
			},
			off: function() {
				$("html").removeClass("busy");
				$("#searchField").css("background-color", "rgba(255, 255, 255, 1)");
			}
		};

		var images = ['/img/play.png','/img/plus.png'];
		images.forEach(function(src) {
			var img = new Image();
			img.src = src;
		});

		var attempts = 0;
		var searchVK = function(params) {
			vk_search_in_progress = true;
			$("#vk-results-list").remove();
			$('<ul id="vk-results-list"></ul>').appendTo('#vk-results-container');
			var url = "https://api.vkontakte.ru/method/audio.search?q=QUERY&access_token=TOKEN&count=200&callback=?",
				token = VK.getToken();
			url = url.replace("TOKEN", token).replace("QUERY", params.q);
			Spank.busy.on();
			var xhr = $.getJSON(url, function(data) {
				vk_search_in_progress = false;
				Spank.busy.off();
				var message = "";
				if (data.error) {
					if (data.error.error_code===6 && attempts<3) {
						++attempts;
						searchVK(params);
					} else {
						attempts = 0;
						message = '<li class="vkMessage">Oops, something went wrong. Try again.</li>';
						$(message).appendTo("#vk-results-list");
					}
				} else {
					attempts = 0;
					var trackResults = data.response.slice(1),
						resultsTotal = trackResults.length,
						lick = '<i class="icon-play-circle lickButton" src="/img/play.png" thumb="@THUMB@" mxid="@MXID@" artist="@ARTIST@" songtitle="@TITLE@" url="@URL@" direct="@DIRECT@"/></i>',
						plus = '<i class="icon-plus-sign lickButton" src="/img/plus.png" thumb="@THUMB@" mxid="@MXID@" artist="@ARTIST@" songtitle="@TITLE@" url="@URL@" direct="@DIRECT@"/></i>';
					trackResults.forEach(function (track) {
						track.mxid = params.mxid;
						var trackAttr = [],
							title = track.title.slice(0,60) + ' -- ' + track.artist.slice(0,60);
						if (title.length>0 && title.length<80) {
							// VERY VERY IMPORTANT!
							// The lick button contains ALL the data we need to reconstruct every entry of the playlist
							// Where: MXID is MusixMatch's ID used in API tracks.get and URL is a VK song's OWNER_ID+TRACK_ID
							var trackurl = track.owner_id + "_" + track.aid + ".mp3",
								_lick = lick.replace("@DIRECT@", track.url).replace("@THUMB@", params.thumb).replace("@MXID@", params.mxid).replace("@ARTIST@", track.artist).replace("@TITLE@", track.title).replace("@URL@", trackurl),
								_plus = plus.replace("@DIRECT@", track.url).replace("@THUMB@", params.thumb).replace("@MXID@", params.mxid).replace("@ARTIST@", track.artist).replace("@TITLE@", track.title).replace("@URL@", trackurl);
							trackAttr.push('<div class="vkTrackEntry-container">' + '<div class="lickContainer">' + _lick + _plus + '</div>' + '<a class="vkDownloadLink" href="' + track.url +'">' + title + '</a>'+'</div>');
							$('<li class="vkTrackEntry">' + trackAttr.join('') + '</li>').appendTo("#vk-results-list");
						} else {
							--resultsTotal;
						}
					});
					if (resultsTotal<=0) {
						message = '<li class="vkMessage">Sorry, we\'re all out of this song!</li>';
					} else {
						message = '<li class="vkMessage">Found @MESSAGE@ track(s)</li>'.replace("@MESSAGE@", resultsTotal);
					}
					$("#vk-results-list").prepend(message);
					Tipped.create(".lickButton", function(element) {
						if ($(element).attr("src").match(/plus/)) {
							return "Save for later";
						} else {
							return "Play now";
						}
					},{
						hideAfter: 1000,
						skin:'controlButtons2',
						hook: 'topmiddle',
						hideOn: [
							{ element: 'self', event: 'mouseleave' },
							{ element: 'tooltip', event: 'mouseenter' }
						]
					});
				}
			});
			$("#closeButton").click(function() { // Crash close lightbox, don't load VK results
				xhr.abort();
				Spank.busy.off();
			});
		};

		$.searchByWire = function(search_term) {
			if (search_term==='Search') return;
			var queryVKDirectly = $("#myonoffswitch").is(":checked");
			if (queryVKDirectly) {
				setTimeout(function() {
					var lightBox = $("#lightBox");
					if (!vk_search_in_progress && !mx_get_lyrics_in_progress) {
						var query_string = search_term.replace(/\?/,"");
						searchVK({q:query_string,
							mxid:'09061980', thumb:Spank.genericAlbumArt});
						playlistScrollerWasVisible = Spank.playlistScroller.visible();
						Spank.playlistScroller.visible(false);
						lightBox.slideDown('fast','swing', function() {
							$("#closeButton").show();
						});
					}
				}, 1000);
			} else {
				// Each time we start a new search...
				Spank.charts.ok_to_fetch_more(true);
				Spank.tearDownLightBox();                                               // Close the lightbox
				Spank.friends.visible(false);                                           // Close the friends list
				$(".playlistEntry").css("border","5px solid rgb(204, 204, 204)");       // Don't highlight any playlist items
				if ($.trim(search_term)!=='') {
					setTimeout(function() {
						Spank.busy.on();
						if (search_term.match(/similarto/)) {
							try {
								var matches = search_term.match(/similarto:(.+)---(.+)/),
									data = {
										artist: $.trim(matches[1]).toLowerCase(),
										title: $.trim(matches[2]).toLowerCase()
									};
								Spank.charts.getSimilar(data);
							} catch(err) { }
						} else {
							var url = '/mxsearch?q=#&page=1'.replace("#",search_term);
							Spank.charts.populateResultsWithUrl(url, function extract(res) {
								Spank.busy.off();
								return res.message.body.track_list;
							}, function onNoResults() {
								window.notify.error("No results.",'force');
								Spank.busy.off();
							});
						}
					}, 0);
				} else {
					return false;
				}
			}
		};

		$(".trackArtist").live("click", function searchWithArtistName() {
			var artist = $(this).text();
			$("#searchField").val("artist: " + artist).trigger("keyup");
		});

//		var taglineBase = new Firebase("https://wild.firebaseio.com/spank/tagline");
//		taglineBase.on("value", function(snapshot) {
//			Spank.tagline = snapshot.val();
//			$("#searchField").val(snapshot.val());
//		});

		// Don't allow the form to be submitted or we'll jump away
		// from the page!
		$("#searchLyrics").submit(function(e) {
			return false;
		});

		$("#searchField").livesearch({
			searchCallback: $.searchByWire,
			innerText: Spank.tagline,
			queryDelay: 500,
			minimumSearchLength: 3
		});

		var streamFilterField = $("#history-filter");

        streamFilterField.submit(function(e) {
            return false;
        });

        streamFilterField.livesearch({
			searchCallback: function(input) {
                var re = new RegExp(input, "i"),
                    tweetItems = document.getElementsByClassName("tweetItem"),
                    i = tweetItems.length,
                    li;
                while (i--) {
                    li = tweetItems[i];
                    if (li.getAttribute("artist").match(re) || li.getAttribute("songtitle").match(re)) {
                        li.style.display = "list-item";
                    } else {
                        li.style.display = "none";
                    }
                }
			},
			innerText: "Filter stream",
			queryDelay:150,
			minimumSearchLength: 2
		});

		$(".historyFilterCancel").click(function() {
            var tweetItems = document.getElementsByClassName("tweetItem"),
                i = tweetItems.length;
			$("#history-filter").val("Filter stream");
			while (i--) {
				tweetItems[i].style.display = "list-item";
			}
		});

		$(".lickButton").live('click', function prependVKTrackToHistoryAndPlay() {
			var button = $(this),
				attributes = ["songtitle", "artist", "url", "thumb", "direct"],
				data = {},
				that = $(this);
			$.each(attributes, function(i, attr) {
				var save_attr = attr.replace(/song/,"");
				data[save_attr] = that.attr(attr);
			});
			var ok = true,
				must_have_keys = ["title", "artist", "url", "thumb", "direct"];
			$.each(must_have_keys, function(i, attr) {
				if (!data.hasOwnProperty(attr)) {
					console.error(attr);
					ok = false;
				}
			});
			$.each(data, function(k,v) {
				try {
					if (!v.match(/\w/g)) {
						console.error(k + " > " + v);
						ok = false;
					}
				} catch(err) {
					console.error(k + " > " + v);
					ok = false;
				}
			});
			if (ok) {
				if (button.attr("src").match(/play/)) {
					Spank.history.prependToHistory(data, true);
				} else {
					Spank.history.prependToHistory(data, false);
				}
			}
			return false;
		});

		var mxMatchOne = function(title, artist, callback, err_callback) {
			var url = "http://api.musixmatch.com/ws/1.1/matcher.track.get?q_artist=ARTIST&q_track=TRACK&apikey=316bd7524d833bb192d98be44fe43017&format=jsonp&callback=?";
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
					err_callback();
				}
			});
		};

		var getLyricsWithMxid = function(track) {
			mx_get_lyrics_in_progress = true;
			function getLyrics(mxid) {
				var url = "http://api.musixmatch.com/ws/1.1/track.lyrics.get?track_id=#&apikey=316bd7524d833bb192d98be44fe43017&format=jsonp&callback=?";
				$.getJSON(url.replace("#", mxid), function(data) {
					mx_get_lyrics_in_progress = false;
					try {
						if (data.message.body && data.message.body.lyrics.lyrics_body) {
							Spank.lightBox.lyricsText(data.message.body.lyrics.lyrics_body+"\n\n\n\n\n\n\n\n\n\n\n\n\n\n");
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
		};

//		$("#playlists-scroller-list").sortable({
//			update : function () {
//				console.log("Resorting!");
//				//$(document).trigger("playlistDidChange");
//			}
//		});

		$(".lyricLink").live('click', function openLightbox() {
			var lightBox = $("#lightBox");
			if (!vk_search_in_progress && !mx_get_lyrics_in_progress && lightBox.css("display")!='block') {
				var anchor = $(this),
					trackEntry = anchor.parent().parent(),
					title = anchor.text(),
					thumb = trackEntry.find(".mxThumb").attr("src"),
					artist = trackEntry.find(".trackArtist").text(),
					query_string = title + " " + artist.replace(/\W/," "),
					mxid = anchor.attr("mxid"),
					mxData = {artist:artist, title:title, mxid:mxid};
				getLyricsWithMxid(mxData);
				query_string = query_string.replace(/\?/,"");
				searchVK({q:query_string,
					mxid:mxid, thumb:thumb});
				Spank.lightBox.lyricsThumb(thumb);
				Spank.lightBox.lyricsTitle(title + " | " + artist);
				playlistScrollerWasVisible = Spank.playlistScroller.visible();
				Spank.playlistScroller.visible(false);
				lightBox.slideDown('fast','swing', function() {
					$("#closeButton").show();
				});
			}
			return false;
		});

	});

})();