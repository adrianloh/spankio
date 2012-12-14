(function() {

	$(document).ready(function() {

		$(document).one("baseReady", function() {
			Spank.base.live = new Firebase(Spank.base.url + "/live");
			Spank.base.live.on('value', function(snapshot) {
				if (snapshot.val()!==null) {
					var data = snapshot.val();
					//Spank.player.playObject(data.track);
				}
			});
		});

		$(".playModeButtons").click(function() {
			var attr = $(this).attr("src").match(/\/css\/(.+)_on/)[1];
			threeSixtyPlayer.config[attr] = !threeSixtyPlayer.config[attr];
			playerControlModel[attr](threeSixtyPlayer.config[attr]);
			localStorage[attr] = threeSixtyPlayer.config[attr];
		});

		var playerControlModel = {
			random: ko.observable(),
			loop: ko.observable(),
			shuffle: ko.observable()
		};

		ko.applyBindings(playerControlModel, document.getElementById('spank-player-controls'));

		$.each(['loop','shuffle'], function(i,a) {
			playerControlModel[a].subscribe(function(v) {
				var p = v ?	"brightness(0)" : "grayscale(1)",
					s = "#@_button".replace("@",a);
				$(s).css("webkitFilter", p);
			});
		});

		// Recall the previous saved state of the Loop and Shuffle buttons
		$.each(['loop','shuffle'], function(i,a) {
			if (localStorage[a] && localStorage[a]==='true') {
				$('#'+a+"_button").trigger("click");
			}
		});

		var fakeSource = "/static/silence.mp3";
		Spank.player = {
			current_url: ko.observable(fakeSource),
			lastLastPlayedObject: null,
			lastPlayedObject: null,
			playObject: function(o) {
				o = ko.toJS(o);             // Double make sure we are dealing with Plain Janes here and not koo's
				this.lastLastPlayedObject = this.lastPlayedObject;
				this.lastPlayedObject = o;
				var thumb_path = o.thumb || Spank.genericAlbumArt,
					bgImage = "url(#)".replace("#",thumb_path);
				if (thumb_path===Spank.genericAlbumArt) {
					// Do this async cause we don't care when this returns;
					this.applyNewCoverArt(o);
				}
				var owner_id = o.url.split(".")[0],
					url = "https://api.vkontakte.ru/method/audio.getById?audios=" + owner_id + "&access_token=" + VK.getToken() + "&callback=?";
				$.getJSON(url, function getActualVKLink(data) {
					var newDirectLink = data.response[0].url;
					if (newDirectLink) {
						//console.log("Playing direct: " + newDirectLink);
						Spank.player.current_url(newDirectLink);
						$(".noty_text:first").trigger("mouseenter");
						setTimeout(function() {
							Spank.notifyCurrentSong(o.title + " - " + o.artist);
						},1000)
						var koo = Spank.history.findHistoryItemWithUrl(o.url);
						o.direct = newDirectLink;
						if (koo!==null) {
							koo.direct(newDirectLink);
							Spank.history.highlightPlayingSong();
						}
						var pushData = {track:ko.toJS(o), position:0};
						Spank.base.live.set(pushData);
						$("#funkyPlayer").css("background", bgImage);
					} else {
						alert("Yipes! This audio file has gone missing! Replace it with another one!");
					}
				});
			},
			applyNewCoverArt: function(o) {
				var lastfm_trackSearch = "http://ws.audioscrobbler.com/2.0/?method=track.search&artist=@&track=#&limit=1&api_key=0325c588426d1889087a065994d30fa1&format=json",
					url = lastfm_trackSearch.replace("@", encodeURIComponent(o.artist)).replace("#", encodeURIComponent(o.title));
				$.getJSON(url, function(res) {
					try {
						var images = res.results.trackmatches.track.image;
						if (Array.isArray(images) && images.length>0) {
							var koo = Spank.history.findHistoryItemWithUrl(o.url);
							if (koo!==null) {
								var newCoverUrl = images[images.length-1]['#text'];
								koo.thumb(newCoverUrl);
								Spank.history.saveHistory(true);
								$("#funkyPlayer").css("background", "url(#)".replace("#", newCoverUrl));
							}
						}
					} catch(err) {
						console.error("Cannot find new album art.");
					}
				});
			},
			suspendLoopAndTrigger: function(callback) {
				if (threeSixtyPlayer.config.loop) {
					threeSixtyPlayer.config.loop = false;
					callback();
					setTimeout(function() {
						threeSixtyPlayer.config.loop = true;
					},2000);
				} else {
					callback();
				}
			}
		};

		ko.applyBindings(Spank.player, document.getElementById('funkyPlayer'));

		// A song plays when current_url is changed
		Spank.player.current_url.subscribe(function(url) {
			var a = $(".fatManLink")[0];
			// Randomize visualization
			$("#randomizeButton").trigger("click");
			var colorAttributes = [
				'loadRingColor',
				'waveformDataColor',
				'eqDataColor',
				'playRingColor',
				'backgroundRingColor'];
			$.each(colorAttributes, function(i,attr) {
				threeSixtyPlayer.config[attr] = Spank.utils.randomHexColor();
			});
			// The FINAL actual playing of the audio file!!! Pheeewwweee!
			if (typeof(threeSixtyPlayer.indexByURL[url])!=='undefined') {
				$(".sm2-360btn").trigger('click');
			} else {
				var index = threeSixtyPlayer.links.length;
				threeSixtyPlayer.indexByURL[url] = index;
				threeSixtyPlayer.links[index] = a;
				$(".sm2-360btn").trigger('click');
			}
		});

		// The logic of what to do next once a song finishes playing
		$(document).bind('fatManFinish', function(e,data) {
			var underlyingArray = Spank.history.stream(),
				next_play_index;
			if (threeSixtyPlayer.config.jumpToTop) {
				// When a song is playing, but we added something new to the top,
				// next song is to jump to it
				next_play_index = 0;
				threeSixtyPlayer.config.jumpToTop = false;
			} else if (threeSixtyPlayer.config.loop) {
				// Loop ON, do nothing because loop is built into 360 Player
				next_play_index = -1;
			} else if (threeSixtyPlayer.config.shuffle && underlyingArray.length > 1) {
				// Shuffle ON when there's more than one song
				next_play_index = Spank.utils.randrange(0, underlyingArray.length-1);
			} else if (underlyingArray.length > 1) {
				// Normal play, no modes
				var koo = Spank.history.findHistoryItemWithUrl(Spank.player.lastPlayedObject.url),
					next_index = Spank.history.stream.indexOf(koo)+1;
				next_play_index = next_index < underlyingArray.length && next_index || 0;
			} else if (threeSixtyPlayer.config.loop===false) {
				// There's only one song in history
				$("#loop_button").trigger("click");
				next_play_index = 0;
			}
			if (next_play_index>=0) {
				Spank.player.playObject(underlyingArray[next_play_index]);
			}
		});

		$(document).bind('fatManPlay', function(e,data) {
			//console.log("Song started...");
			//console.log(data);
		});



	});

})();