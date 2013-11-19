/*global $, ko, Spank */

(function() {

	var canPlayOpus = false,
		testOpus = document.createElement('audio');
	testOpus.src = "/static/silence.ogg";
	testOpus.play();
	testOpus.pause();
	canPlayOpus = testOpus.error===null;

	$(document).ready(function() {

		$(document).one("baseReady", function() {
			Spank.base.live = Spank.base.me.child("live");
//			Spank.base.live.on('value', function(snapshot) {
//				if (snapshot.val()!==null) {
//					var data = snapshot.val();
//					//Spank.player.playObject(data.track);
//				}
//			});
		});

		Spank.growl = (function() {

			var self = {},
				havePermission,
				notification = null,
				closeNotificationTimeout = setTimeout(function() {}, 1000),
				showNotificationTimeout = setTimeout(function() {}, 1000);

			function notifyCurrentlyPlaying(koo) {
				clearTimeout(closeNotificationTimeout);
				havePermission = window.webkitNotifications.checkPermission();
				if (havePermission === 0) {
					// 0 is PERMISSION_ALLOWED
					if (notification!==null) {
						notification.cancel();
					}
					notification = window.webkitNotifications.createNotification(
						koo.thumb,
						koo.artist,
						koo.title
					);
					closeNotificationTimeout = setTimeout(function() {
						clearTimeout(closeNotificationTimeout);
						notification.close();
					}, 15000);
					notification.onclick = function () {
						Spank.player.goToNextTrack();
						clearTimeout(closeNotificationTimeout);
						notification.close();
					};
					notification.show();
				} else {
					window.webkitNotifications.requestPermission();
				}
			}

			self.notifyCurrentlyPlaying = function(track) {
				showNotificationTimeout = setTimeout(function() {
					notifyCurrentlyPlaying(track);
				}, 5000);
			};

			self.closeNotification = function() {
				clearTimeout(showNotificationTimeout);
				if (notification!==null) {
					notification.cancel();
					notification.close();
				}
			};

			return self;

		})();

		var fakeSource = "/static/silence.mp3";
		Spank.player = (function() {
			var self = {},
				coverImg = new Image();
			self.canPlayOpus = canPlayOpus;
			self.current_url = ko.observable(fakeSource);
			self.current_ownerid =  ko.observable("");
			self.coverurl = ko.observable(Spank.genericAlbumArt);
			self.bitrate = ko.observable(64);
			self.isStreaming = ko.observable(false);
			self.isPlaying = function() {
				var playedTracks = threeSixtyPlayer.sounds.map(function(o) { return o.paused });
				return playedTracks.length>0 && playedTracks.indexOf(true)===-1;
			};
			self.setCover = function(thumb) {
				return null;
				// Set cover art with lores version
				self.coverurl("url(#)".replace("#", thumb));
				$("#largeBackground").css("background-image", "url(#)".replace("#", thumb));
				var thumbpath,
					re_apple = new RegExp(/\d+x\d+-75/);
				if (thumb.match(re_apple)) {
					// Apple thumbnails
					thumbpath = thumb.replace(re_apple, "600x600-75");
				} else if (thumb.match(/7static/)) {
					// 7static thumbnails
					thumbpath = thumb.replace(/_200\.jpg/,"_500.jpg");
				} else {
					thumbpath = thumb;
				}
				coverImg.onload = function() {
					// Set the highres once it's loaded. If 404, then this never gets called.
					var url = "url(#)".replace("#", thumbpath);
					self.coverurl(url);
					self.coverurl.valueHasMutated();
					$("#largeBackground").css("background-image", url);
				};
				coverImg.src = thumbpath;
			};
			self.lastLastPlayedObject = {};
			self.lastPlayedObject = {};
			self.echoPlayNext = null;

			function getNewTrack(o) {
				$(".tweetBlink").removeClass("tweetBlink");
				$(document).trigger("fatManFinish");
				window.notify.error("Crap! I've misplaced this audio file. Get a new one!", 10000);
				var query = "vk: " + o.artist + " " + o.title;
				setTimeout(function() {
					$("#searchField").val(query).trigger("keyup");
				}, 1000);
			}

			self.isPlaying = ko.observable(false);
			self.isPlayingFromLibrary = ko.observable(true);
			self.isNotPlayingFromLibrary = ko.computed(function() {
				return !self.isPlayingFromLibrary();
			});
			var timeoutToAddToFreshies = setTimeout(function(){},0);

			function getAmazonS3Link(url) {
				var info = url.split(":::"),
					re = new RegExp(Spank.username),
					server = Spank.servers[info[0]],
					playUrl;
				playUrl = server + "/" + info[1];
				if (canPlayOpus && playUrl.match(re)) {
					playUrl = playUrl.replace(/...$/,"ogg");
				}
				return playUrl;
			}

			self.playObject = function(o, refIdOfOrigin) {
				// Double make sure we are dealing with Plain Janes here and not koo's
				o = ko.toJS(o);
				// BUG: If user adds a currently playing song with the "+/bullseye"
				// and then immedietly deletes it afterwards, o is "nicegapbaby"
				if (typeof(o)!=='object') {
					threeSixtyPlayer.config.jumpToTop = false;
					$(document).trigger("fatManFinish");
					return;
				}

				self.lastLastPlayedObject = this.lastPlayedObject;
				self.lastPlayedObject = o;

				Spank.growl.closeNotification();
				clearTimeout(timeoutToAddToFreshies);

				if (o.url.match(/^@/)) {
					var fakeVKObject;
					fakeVKObject = {url: getAmazonS3Link(o.url)};
					playOnSuccess([fakeVKObject]);
				} else {
					var url,
						owner_id = o.url.split(".")[0];
					if (self.isStreaming()) {
						playOnSuccess([{url: "http://kali-1.herokuapp.com/" + self.bitrate() + "/" + owner_id + ".ogg"}]);
					} else {
						url = "https://api.vkontakte.ru/method/audio.getById?audios=" + owner_id;
						VK.api(url, playOnSuccess, onError);
					}
				}

				function playOnSuccess(res) {
					if (res.length>0) {
						var pushData = {track:o, position:0},
							newDirectLink = res[0].url,
							koo;
						self.lastPlayedObject.direct = newDirectLink;
						self.current_url(newDirectLink);  // This starts playback
						koo = Spank.history.findHistoryItemWithUrl(o.url);
						self.isPlaying(true);
						self.isPlayingFromLibrary(koo!==null);
						self.current_ownerid(o.url);
						o.direct = newDirectLink;
						Spank.base.live.set(pushData);
						if (self.isPlayingFromLibrary()) {
							koo.direct(newDirectLink);
							koo = ko.toJS(koo);
							Spank.plugTheBitch(koo, Spank.base.history);
						} else {
							koo = o;
						}
						// If a song plays for longer than 30 seconds, then add it to "Recently played"
						timeoutToAddToFreshies = setTimeout(function() {
							Spank.history.prependToFreshies(koo);
						}, 30000);
						setTimeout(function() {
							echoPlaylistFromCurrent();
						}, Spank.utils.randrange(10000,15000));
					} else {
						getNewTrack(o);
					}
				}

				function onError() {
					$(".tweetBlink").removeClass("tweetBlink");
					$(document).trigger("fatManFinish");
				}

			};

			self.addCurrentlyPlayingToLibrary = function() {
				Spank.lightBox.addSongToStream(self.lastPlayedObject);
				Spank.player.isPlayingFromLibrary(true);
			};

			self.suspendLoopAndTrigger = function(callback) {
				if (threeSixtyPlayer.config.loop) {
					threeSixtyPlayer.config.loop = false;
					callback();
					setTimeout(function() {
						threeSixtyPlayer.config.loop = true;
					},2000);
				} else {
					callback();
				}
			};

			var configs = ['playLibrary', 'playCharts', 'loop', 'shuffle'];

			self.stashActive = ko.observable(false);
			self.stashState = function(isActive) {
				// Called by Spank.charts.stashIsActive
				if (isActive && self.playCharts()) {
					self.stashActive(true);
				} else {
					self.stashActive(false);
				}
			};

			configs.forEach(function(prop, i) {
				self[prop] = ko.observable();
				self[prop].subscribe(function(v) {
					threeSixtyPlayer.config[prop] = v;
					localStorage[prop] = v;
				});
			});

			['playCharts', 'playLibrary'].forEach(function(prop,i) {
				self[prop].subscribe(function(v) {
					if (v && (self.playLibrary()===self.playCharts())) {
						self.shuffle(true);
					}
				});
			});

			self.toggleMode = function(data, event) {
				var $e = $(event.target),
					match = $e.attr("id").match(/(.+)_button/);
				if (match) {
					var attr = match[1],
						v = !threeSixtyPlayer.config[attr];
					self[attr](v);
				}
			};

			self.showCurrentlyPlayingTrack = function() {
				Spank.history.showCurrentlyPlayingTrack();
			};

			// Recall the previous saved states
			$.each(configs, function(i, prop) {
				var v = localStorage.hasOwnProperty(prop) ? JSON.parse(localStorage[prop]) : false;
				if (prop.match(/library/i) && !localStorage.hasOwnProperty(prop)) { v = true; }
				self[prop](v);
			});

			self.goToNextTrack = function() {
				self.suspendLoopAndTrigger(function() {
					$(document).trigger('fatManFinish');
				});
			};

			self.goToPrevTrack = function() {
				if (self.lastPlayedObject && self.lastPlayedObject.hasOwnProperty('url')) {
					var currentUrl = self.lastPlayedObject.url,
						recentlyPlayed = Spank.history.freshies(),
						urls = recentlyPlayed.map(function(o) {
							return o.url;
						}),
						currentPlayingIndex = urls.indexOf(currentUrl),
						nextPlayIndex = 0;
					if (currentPlayingIndex+1 >= recentlyPlayed.length) {
						nextPlayIndex = 0;
					} else if (currentPlayingIndex>0) {
						nextPlayIndex = currentPlayingIndex+1;
					} else if (currentPlayingIndex===0) {
						nextPlayIndex = 1;
					}
					self.playObject(recentlyPlayed[nextPlayIndex]);
				}
			};

			return self;

		})();

		ko.applyBindings(Spank.player, document.getElementById('funkyPlayer'));

		// A song plays when current_url is changed
		Spank.player.current_url.subscribe(function(url) {
			var a = $(".fatManLink")[0];
			var colorAttributes = [
				'loadRingColor',
				'waveformDataColor',
				'eqDataColor',
				'playRingColor'];
			$.each(colorAttributes, function(i,attr) {
				threeSixtyPlayer.config[attr] = Spank.utils.randomHexColor();
			});
			if (typeof(threeSixtyPlayer.indexByURL[url])==='undefined') {
				threeSixtyPlayer.indexByURL[url] = 0;
				threeSixtyPlayer.links[0] = a;
			}
			var playLink = document.getElementsByClassName("fatManLink")[0];
			// The FINAL actual playing of the audio file!!! Pheeewwweee!
			if (threeSixtyPlayer.sounds.length>0) {
				threeSixtyPlayer.sounds[0].destruct();
			}
			threeSixtyPlayer.sounds = [];
			threeSixtyPlayer.soundsByURL = {};
			threeSixtyPlayer.handleClick({target:playLink,preventDefault:function(){}});

			var currentPlayingTrack = Spank.player.lastPlayedObject;

			$("#titleCardArtist").text(currentPlayingTrack.artist);
			$("#titleCardSong").text(currentPlayingTrack.title);
			Spank.player.setCover(currentPlayingTrack.thumb);
			$(".tweetBlink").removeClass("tweetBlink");

			Spank.base.live.child("track").set(currentPlayingTrack);
			Spank.growl.notifyCurrentlyPlaying(currentPlayingTrack);
		});

		function echoPlaylistFromCurrent() {
			// The two possible methods are:
			// http://developer.echonest.com/api/v4/playlist/static?api_key=FILDTEOIK2HBORODV&results=10&song_id=SOINAOE1315CD4912A&type=catalog&seed_catalog=CARGZMK13C326966CA&adventurousness=.8
			// http://developer.echonest.com/api/v4/playlist/static?api_key=FILDTEOIK2HBORODV&song_id=SOINAOE1315CD4912A&distribution=focused&format=json&results=50&type=song-radio&bucket=id:CARGZMK13C326966CA&limit=true
			var url = "http://developer.echonest.com/api/v4/playlist/static?api_key=API_KEY&song_id=SONG_ID&distribution=focused&format=json&results=20&type=song-radio&bucket=id:BUCKET_ID&limit=true",
				match, api_key, bucket_id, song_id;
			if (Spank.tasteProfileId!==null && ("echoid_track" in Spank.player.lastPlayedObject)) {
				match = Spank.tasteProfileId.match("(.+):SPANK_(.+)");
				api_key = match[1];
				song_id = Spank.player.lastPlayedObject.echoid_track;
				bucket_id = match[2];
				url = url.replace("API_KEY", match[1]).replace("SONG_ID", song_id).replace("BUCKET_ID", bucket_id);
				$.getJSON(url, function(res) {
					var songs = res.response.songs,
						code = res.response.status.code,
						recommended_ids, recommended_songs_from_history = [];
					if (code===0 && songs.length>0) {
						songs = songs.slice(1, songs.length);                       // Drop the first track, which is the seed track
						recommended_ids = songs.map(function(o) { return o.id; });  // Populate an array with just the EchoNest IDs of recommended songs
						var pickIndex, track, i = Spank.history.streamBackup.length;
						while (i--) {
							if (recommended_ids.length===0) {
								break;
							} else {
								track = Spank.history.streamBackup[i];
								if (typeof(track)==='object' &&
									track.hasOwnProperty("echoid_track")) {
									pickIndex = recommended_ids.indexOf(track.echoid_track);
									if (pickIndex>=0) {
										recommended_ids.splice(pickIndex, 1);
										recommended_songs_from_history.push(track);
									}
								}
							}
						}
						Spank.player.echoPlayNext = Spank.utils.pick_random(recommended_songs_from_history);
					}
				});
			}
		}

		// TODO: Cross-dependent/separation-of-concerns issue between this function and #Spank.charts.radioplay
		function playFromCharts(random) {
			var chartItemsToPlay = $(".mxThumb"),
				stashID = Spank.charts.stashID(),
				stashItems = stashID && sessionStorage.hasOwnProperty(stashID) ? JSON.parse(sessionStorage[stashID]).tracklist : null,
				pickTrack, fakeEvent = {target:$("<div></div>")};
			if (random) {
				// Random radio
				if (stashItems) {
					pickTrack = Spank.utils.pick_random(stashItems);
					Spank.charts.radioPlay(pickTrack, fakeEvent);
				} else {
					Spank.utils.pick_random(chartItemsToPlay).click();
				}
			} else {
				// Figure out which track in the charts we just played and play the next one
				var lastPlayed = Spank.player.lastPlayedObject,
					chartTracks = stashItems ? stashItems : Spank.charts.chartTracks(),
					i = chartTracks.length,
					nextPlayIndex = null;
				while(i--) {
					var t = chartTracks[i];
					if (Spank.utils.hasSameTrackIds(lastPlayed, t)) {
						nextPlayIndex = i+1 < chartTracks.length ? i+1 : -1;
						break;
					}
				}
				if (nextPlayIndex!==null && nextPlayIndex>=0) {
					$(".mxThumb")[nextPlayIndex].click();
				} else {
					Spank.player.shuffle(true);
					$(document).trigger("fatManFinish");
				}
			}
		}

		// The logic of what to do next once a song finishes playing/when we hit next
		$(document).bind('fatManFinish', function getNextSongAndPlay(e, deletedSongIndex) {
			var underlyingArray = Spank.history.stream(),
				next_play_index,
				chartItemsToPlay = $(".mxThumb"),
				config = threeSixtyPlayer.config;
			if (threeSixtyPlayer.config.jumpToTop) {
				// User has queued a specific track
				Spank.player.playObject(underlyingArray[0]);
				threeSixtyPlayer.config.jumpToTop = false;
				return;
			}
			if (config.loop && !(threeSixtyPlayer.lastSound.url.match(/silence\.mp3/))) {
				// Loop ON *and* this is not the first time we're playing,
				// do nothing because loop is built into 360 Player
				return;
			}
			if (!config.playCharts && !config.playLibrary) {
				// For whatever fucky reason BOTH sources have been disabled
				Spank.player.playCharts(true);
				Spank.player.playLibrary(true);
				$(document).trigger("fatManFinish");
				return;
			}
			if (config.playCharts && !config.playLibrary && chartItemsToPlay.length>0 ) {
				// Pure "radio" mode, play only chart items
				playFromCharts(config.shuffle);
				return;
			}
			if (config.playCharts && chartItemsToPlay.length===0) {
				Spank.player.playCharts(false);
				Spank.player.playLibrary(true);
			}
			if (config.shuffle && underlyingArray.length>1) {
				// Shuffle ON with BOTH sources selected
				if (config.playCharts && Math.random()<0.635) {
					// Are we gonna play from the charts?
					playFromCharts(true);
					return;
				}
				// Nope, play from the Library instead
				if (Spank.player.echoPlayNext!==null) {
					// Has EchoNest suggested a track from our library?
					Spank.player.playObject(Spank.player.echoPlayNext);
					Spank.player.echoPlayNext = null;
					return;
				}
				// Nope. Go totally random, baby!
				var playables = Spank.history.stream().filter(function(o) { return typeof(next_song)!=='object'}),
					next_song = Spank.utils.pick_random(playables);
				Spank.player.playObject(next_song);
				return;
			}
			if (underlyingArray.length > 1) {
				// Normal play, no modes
				var koo = Spank.history.findHistoryItemWithUrl(Spank.player.lastPlayedObject.url),
					next_index = Spank.history.stream.indexOf(koo)+1;
				if (typeof(deletedSongIndex)==='number') {
					next_index = deletedSongIndex+1
				}
				return (function pickNextSong() {
					next_play_index = next_index < underlyingArray.length && next_index || 0;
					var next_song = Spank.history.stream()[next_play_index];
					if (typeof(next_song)!=='object') {
						++next_index;
						return pickNextSong();
					} else {
						Spank.player.playObject(underlyingArray[next_play_index])
					}
				})();
			}
			if (threeSixtyPlayer.config.loop===false) {
				// There's only one song in history
				Spank.player.loop(false);
				Spank.player.shuffle(true);
				Spank.player.playLibrary(false);
				Spank.player.playCharts(true);
				$(document).trigger("fatManFinish");
			}
		});

	});

})();