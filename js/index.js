/*global $, ko, Spank */

(function() {

	$(document).ready(function () {

		Spank.busy = {
			on: function() {
				$("html").addClass("busy");
				if (Spank.charts.isQuery===true) {
					$("#searchField, .Textinput").addClass("busybee");
				}
			},
			off: function() {
				$("html").removeClass("busy");
				$("#searchField, .Textinput").removeClass("busybee");
			}
		};

		var vk_search_in_progress = false,
			playlistScrollerWasVisible = false;

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

		function urlDecode(s) {
			s = s.replace(/&#36;/gi,"$");
			s = s.replace(/&#33;/gi,"!");
			s = s.replace(/&#39;/gi,"'");
			s = s.replace("&amp;","&");
			return s;
		}

		function clean(str) {
			str = $.trim(str.replace(/[\?\.,\/#%\^&\*;:{}=_`~()]|feat\.?|\d\d\d\d|remastere?d?|album|version| [el]p /gi,"")).toLowerCase();
			str = str.replace(/-/g," ");
			str = str.replace(/ö/gi,"o");
			str = str.replace(/ {2,}/gi," ");
			return str;
		}

		function vickisuckme(query_string, limit, Track, callbackWithResults, callbackOnError) {
			var TrackConstructor = Track,
				q = clean(query_string),
				url = "https://api.vkontakte.ru/method/audio.search?q=" + encodeURIComponent(q) + "&count=" + limit,
				vk_search_in_progress = true,
				perfectScore = 0,
				stripLower = Spank.utils.stripToLowerCase,
				scoreFunction = function(string) {
					return stripLower(string).replace(/ /g, "").length
				},
				sortResults = typeof(TrackConstructor.prototype.artist)!=='undefined'; // This is undefined if we're searching VK directly

			Spank.busy.on();

			var spankTrack = null;
			if (sortResults) {
				// Check to see whether we have this song in our library
				var artist = stripLower(TrackConstructor.prototype.artist),
					title = stripLower(TrackConstructor.prototype.title);
				if (typeof(Spank.library[artist])!=='undefined' && typeof(Spank.library[artist][title])!=='undefined') {
					var track = new TrackConstructor(),
						trackFromLibrary = Spank.library[artist][title],
						serverCode = trackFromLibrary.server,
						serverActual = Spank.servers[serverCode],
						user = trackFromLibrary['user'],
						filename = trackFromLibrary['filename'];
					track.direct = serverActual + "/" + user + "/" + filename;
					track.url = serverCode + "_" + user + "/" + filename;
					spankTrack = track;
				}
			}

			// Get songs from VK
			var xhr = VK.api(url, function onSuccess(response) {
				var results = [],
					trackResults = response.slice(1);  // The first item is an integer of the total results returned
				vk_search_in_progress = false;
				Spank.busy.off();
				if (sortResults) {
					perfectScore = scoreFunction(TrackConstructor.prototype.artist + TrackConstructor.prototype.title);
				}
				for (var i=0, len=trackResults.length; i<len; i++) {
					var vkTrack = trackResults[i],
						artist = urlDecode(vkTrack.artist),
						title = urlDecode(vkTrack.title),
						displayTitle = vkTrack.title.slice(0,60) + ' - ' + vkTrack.artist.slice(0,60);
					if (displayTitle.length>0 && displayTitle.length<80) {
						var track = new TrackConstructor();
						// Why the split? VK started returning urls like this: http://cs536513.vk.me/u17120923/audios/6362cb37e2c3.mp3?extra=atDlhVLq2Tl8ByzkidYJDvfe..."
						track.direct = vkTrack.url.split("?")[0];
						track.title = title;
						if (!sortResults) {
							track.artist = artist
						}
						track.url = vkTrack.owner_id + "_" + vkTrack.aid + ".mp3";
						track.score = Math.abs(perfectScore - scoreFunction(artist + title));
						results.push(track);
						//results.splice(trackScore, 0, track);
					}
				}
				if (sortResults) {
					results = results.sort(function (a, b) {
						if (a.score > b.score)
							return 1;
						if (a.score < b.score)
							return -1;
						// a must be equal to b
						return 0;
					});
				}
				if (spankTrack) {
					results.splice(0,0,spankTrack);
				}
				callbackWithResults(results);
			}, function onError() {
				vk_search_in_progress = false;
				Spank.busy.off();
				if (typeof(callbackOnError)!=='undefined') { callbackOnError() }
			});
			$("#closeButton").click(function() { // Crash close lightbox, don't load VK results
				xhr.abort();
				Spank.busy.off();
			});
		}

		var searchVKWithLightbox = function(q, TrackConstructor) {
			playlistScrollerWasVisible = Head.playlists.visible();
			Head.playlists.visible(false);
			Spank.lightBox.searchComplete(false);
			$("#lightBox").addClass("lboxScaleShow");
			vickisuckme(q, 100, TrackConstructor, function onResults(results) {
				if (results.length===0) {
					Spank.charts.unavailableTracks.push(TrackConstructor.prototype);
				}
				Spank.lightBox.vkTracklist(results);
				Spank.lightBox.vkTracklist.valueHasMutated();
				Spank.lightBox.searchComplete(true);
			}, function onError() {
				// Really do nothing?
			});
		};

		Spank.lightBox = (function() {
			var self = {};
			self.lyricsTitle = ko.observable("");
			self.lyricsText = ko.observable("");
			self.vkTracklist = ko.observableArray([]);
			self.searchComplete = ko.observable(false);
			self.vkMessage = ko.computed(function() {
				if (self.searchComplete() && self.vkTracklist().length===0) {
					return "Sorry, we're currently all out of this song!";
				} else if (self.searchComplete() && self.vkTracklist().length>0) {
					return "Found " + self.vkTracklist().length + " tracks";
				} else {
					return "Searching...";
				}
			});
			self.vickisuckme = vickisuckme;


			function stripFeaturing(string) {
				if (string.match(/([ \(\[]fe?a?t\.?.+)/i)) {
					return $.trim(string.replace(/([ \(\[]fe?a?t\.?.+)/i, ""));
				} else {
					return string;
				}
			}

			function stripBrackets(string) {
				if (string.match(/[\(\[].+[\)\]]/)) {
					return $.trim(string.replace(/[\(\[].+[\)\]]/ ,""));
				} else {
					return string;
				}
			}

			var lastCall = Date.now();
			self.open = function(data, refIdOfOrigin) {
				var lightBox = $("#lightBox");
				if (!vk_search_in_progress && !lightBox.hasClass("lboxScaleShow")) {
					var Track = function() {},
						title = stripBrackets(data.title),
						artist = data.artist,
						query_string = title + " " + artist;
					Track.prototype = data;
					if (!data.hasOwnProperty("mxid_track")) {
						// Songs *not* coming from MusixMatch results/billboards
						Spank.mxMatchOne(title, artist, function(mxTrack) {
							var mxData = Spank.normalizeMXData(mxTrack);
							for (var k in mxData) {
								if (mxData.hasOwnProperty(k) && !Track.prototype.hasOwnProperty(k)) {
									Track.prototype[k] = mxData[k];
								}
								if (Date.now()-lastCall>5000) {
									getLyricsWithMxid(mxData.mxid_track);
									lastCall = Date.now();
								}
							}
						}, function onerr() {
							// pass
						});
					}
					if (!data.hasOwnProperty("echoid_track")) {
						// Songs *not* coming from EchoNest playlist
						ECHO.matchOne(title, artist, function onmatch(echoTrack) {
							// All songs
							Spank.attachEchoMetadata(Track.prototype, echoTrack);
						});
					}
					$(".thoughtbot:contains('Musical')").trigger("click");
					if (data.hasOwnProperty("mxid_track")) {
						if (Date.now()-lastCall>5000) {
							getLyricsWithMxid(data.mxid_track);
							lastCall = Date.now();
						}
					}
					searchVKWithLightbox(query_string, Track);
				}
			};

			self.close = function() {
				$("#lightBox").removeClass("lboxScaleShow");
				setTimeout(function() {
					Spank.lightBox.vkTracklist([]);
					Spank.lightBox.searchComplete(false);
				}, 500);
				Spank.lightBox.lyricsTitle("");
				Spank.lightBox.lyricsText("");
				Spank.busy.off();
				$(".t_Tooltip_controlButtons2").remove();
				$("#myonoffswitch").prop('checked', false);
				vk_search_in_progress = false;
				if (playlistScrollerWasVisible) {
					Head.playlists.visible(true);
					playlistScrollerWasVisible = false;
				}
			};

			self.addSongToStream = function(trackObject, event) {
				var ok = true,
					must_have_keys = ["title", "artist", "url", "thumb", "direct"];
				$.each(must_have_keys, function(i, attr) {
					if (typeof(trackObject[attr])==='undefined') {
						console.error("Error. Failed to add track to stream. Missing essential key: " + attr);
						ok = false;
					}
				});
				if (!ok) return;
				$.each(trackObject, function(k,v) {
					if (typeof(v)!=='undefined') {
						if (v.toString().length===0 || v===null) {
							if (must_have_keys.indexOf(k)<0) { // This is a non-essential key
								trackObject[k] = 'na';
							} else {
								console.error(k + " > " + v);
								ok = false;
							}
						}
					} else {
						console.error("Error. Failed to add track to stream. Got undefined value for key " + k);
						ok = false;
					}
				});
				trackObject.artist = stripFeaturing(trackObject.artist);
				if (ok) {
					var playNow = $(event.target).attr("action")==="play";
					Spank.history.prependToHistory([trackObject], playNow);
				}
			};
			return self;

		})();

		ko.applyBindings(Spank.lightBox, document.getElementById('lightBox'));

		Spank.getInput = {
			title: ko.observable("Send it with a message!"),
			placeholder: ko.observable("This is aawwwesomee"),
			submitmessage: ko.observable("Send")
		};

		Spank.getInput.show = function(callback, data) {
			$.each(data, function(k,v) {
				Spank.getInput[k](v);
			});
			var sendSongForm = $("#sendSongForm");
			sendSongForm.slideDown('fast','swing');
			setTimeout(function() {
				$("#sendMessage").focus();
			}, 500);
			sendSongForm.unbind('submit');
			sendSongForm.submit(function() {
				var messageField = $("#sendMessage"),
					message = messageField.val();
				callback(message);
				messageField.val("");
				sendSongForm.slideUp('fast','swing');
				return false;
			});
			function escape(e) {
				var messageField = $("#sendMessage");
				if (e.keyCode===27) {
					$(document).unbind("keydown",escape);
					messageField.val("");
					messageField.trigger("blur");
					sendSongForm.unbind("submit");
					sendSongForm.slideUp('fast','swing');
				}
			}
			$(document).bind("keydown", escape);
		};

		ko.applyBindings(Spank.getInput, document.getElementById('sendSongForm'));

		var searchRefIDGen = (function() {
			var self = {},
				getNew = true,
				refID,
				tOut = setTimeout(function() {},0),
				method = "replace";
			self.makeNew = function() {
				method = "replace";
				refID = "$q_search|" + Math.uuid(64);
			};
			self.getMethod = function() {
				if (method==="replace") {
					method = "push";
					return "replace";
				}
				return method;
			};
			self.getRef = function() {
				if (getNew) {
					getNew = false;
					self.makeNew();
				}
				tOut = setTimeout(function() {
					getNew = true;
					$("#searchField").blur();
				}, 12000);
				return refID;
			};
			self.dontGetNew = function() {
				clearTimeout(tOut);
			};
			return self;
		})();

		var searchByWire = function(search_term) {
			searchRefIDGen.dontGetNew();
			search_term = $.trim(search_term);
			var newStateObj = {
				title: search_term,
				refID: searchRefIDGen.getRef(),
				url: '/mxsearch?q=#&page=1'.replace("#", search_term)
			};
			$("#searchField, .Textinput").addClass("busybee");
			Spank.charts.resetCharts(newStateObj);
			$.getJSON(newStateObj.url, function(res) {
				if (res.message.header.status_code===200) {
					$("#searchField, .Textinput").removeClass("busybee");
					var tracklist = res.message.body.track_list;
					Spank.charts.pushBatch(tracklist, searchRefIDGen.getMethod());
				} else {
					//window.notify.error("Crap! We're experiencing server issues. Try again later?");
				}
			});
//			var echoArtistBase = "http://developer.echonest.com/api/v4/artist";
//			var echosuggest = echoArtistBase + "/suggest?api_key=@&results=1&name=".replace("@", ECHO.key());
//			var echoextract = echoArtistBase + "/extract?api_key=@&format=json&results=10&sort=familiarity-desc&text=".replace("@", ECHO.key());
//			$.getJSON(echoextract + search_term, function(res) {
//				res = res.response;
//				if (res.status.code===0 && res.artists.length>0) {
//					console.log(res.artists[0].name);
//				}
//			});
			if (search_term.match(/artist:/) && !search_term.match(/title:/)) {
				try {
					var query = search_term.match(/artist: ?(.+)/)[1],
						callbackWithItunesResults = function(tracklist) {
							Spank.charts.pushBatch(tracklist, 'unshift');
						};
					callbackWithItunesResults.limit = 200;
					callbackWithItunesResults.attributes = "&attribute=artistTerm";
					if (query.length>0) ITMS.query(query, callbackWithItunesResults);
				} catch(err) { }
			}
		};

		$("#searchLyrics").submit(function(e) {
			return false;
		});

		$("#searchField").livesearch({
			searchCallback: function(search_term) {
				if (search_term.match(/vk:/)) {
					var Track = function() {};
					Track.prototype.thumb = Spank.genericAlbumArt;
					search_term = $.trim(search_term.split(":")[1]);
					searchVKWithLightbox(search_term, Track);
				} else {
					setTimeout(function() {
						searchByWire(search_term);
					},100)
				}
			},
			innerText: "Search by artist, title or lyrics",
			queryDelay: 200,
			minimumSearchLength: 3
		});

		var streamFilterField = $("#history-filter");
        streamFilterField.submit(function() {
            return false;
        });

		Spank.mxMatchOne = function(title, artist, callback, err_callback) {
			var url = "http://api.musixmatch.com/ws/1.1/matcher.track.get?q_artist=ARTIST&q_track=TRACK&apikey=316bd7524d833bb192d98be44fe43017&format=jsonp&callback=?";
			artist = encodeURIComponent($.trim(artist.toLowerCase()));
			title = encodeURIComponent($.trim(title.toLowerCase()));
			url = url.replace("ARTIST", artist).replace("TRACK", title);
			$.getJSON(url, function(res) {
				try {
					if (res.message.body.hasOwnProperty("track")) {
						callback(res.message.body.track);
					} else {
						if (err_callback) err_callback();
					}
				} catch(err) {
					if (err_callback) err_callback();
				}
			});
		};

		var getLyricsWithMxid = function(mxid) {
			var url = "http://api.musixmatch.com/ws/1.1/track.lyrics.get?track_id=#&apikey=316bd7524d833bb192d98be44fe43017&format=jsonp&callback=?",
				lyrics = sessionStorage[mxid];
			if (typeof (lyrics)==='string') {
				Spank.lightBox.lyricsText(lyrics);
			} else {
				$.getJSON(url.replace("#", mxid), function(data) {
					try {
						if (data.message.body && data.message.body.lyrics.lyrics_body) {
							lyrics = data.message.body.lyrics.lyrics_body+"\n\n\n\n\n\n\n\n\n\n\n\n\n\n";
							sessionStorage[mxid] = lyrics;
							Spank.lightBox.lyricsText(lyrics);
						}
					} catch(err) { }
				});
			}
		};

		$(".superButtons").each(function(i, button) {
			button = $(button);
			button.data('on', function() {
				button.removeClass("playModeOff");
			});
			button.data('off', function() {
				button.addClass("playModeOff");
			});
		});

	});

})();