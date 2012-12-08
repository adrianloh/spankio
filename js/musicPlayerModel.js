(function() {

	$(document).ready(function() {

		$(".playModeButtons").click(function() {
			var attr = $(this).attr("src").match(/\/css\/(.+)_on/)[1];
			threeSixtyPlayer.config[attr] = !threeSixtyPlayer.config[attr];
			playerControlModel[attr](threeSixtyPlayer.config[attr]);
			localStorage[attr] = threeSixtyPlayer.config[attr];
		});

		var playerControlModel = {
			random:ko.observable(),
			loop:ko.observable(),
			shuffle:ko.observable()
		};

		ko.applyBindings(playerControlModel, document.getElementById('spank-player-controls'));

		$.each(['loop','shuffle'], function(i,a) {
			playerControlModel[a].subscribe(function(v) {
				var p = v ?	"brightness(0)" : "grayscale(1)",
					s = "#@_button".replace("@",a);
				$(s).css("webkitFilter",p);
			});
		});

		// Recall the previous saved state of the Loop and Shuffle buttons
		$.each(['loop','shuffle'], function(i,a) {
			if (typeof(localStorage[a])!=='undefined' && localStorage[a]==='true') {
				$('#'+a+"_button").trigger("click");
			}
		});

		var fakeSource = "/static/silence.mp3";
		var testAudio = new Audio();
		Spank.player = {
			current_url: ko.observable(fakeSource),
			lastLastPlayedObject: null,
			lastPlayedObject: null,
			playObject: function(o, atHistoryIndex) {
				this.lastLastPlayedObject = this.lastPlayedObject;
				this.lastPlayedObject = o;
				atHistoryIndex = atHistoryIndex || Spank.history.stream().indexOf(o);
				this.highlightHistoryItemWithIndex(atHistoryIndex);
				var thumb_path = o.thumb || Spank.genericAlbumArt,
					bgImage = "url(#)".replace("#",thumb_path);
				if (thumb_path===Spank.genericAlbumArt) {
					// Do this async, so we don't care when this returns;
					this.applyNewCoverArt(o, atHistoryIndex)
				}
				if (o.direct) {
					testAudio.src = o.direct;
					testAudio.preload = "none";
					testAudio.addEventListener('loadstart', function() { // BROWSER BUG: For some reason, testAudio.onloadstart doesn't work
						// If direct VK link OK...
						testAudio.pause();
						Spank.player.current_url(o.direct);
						$("#funkyPlayer").css("background", bgImage);
					});
					var that = this;
					testAudio.onerror = function() {
						// If the direct VK link is no longer there
						that.vkGetDirectLinkAndTryPlayingAgain(o, atHistoryIndex);
					};
					testAudio.load();
				} else {
					this.vkGetDirectLinkAndTryPlayingAgain(o, atHistoryIndex);
				}
			},
			vkGetDirectLinkAndTryPlayingAgain: function(o, atHistoryIndex) {
				console.warn("Looking for new VK link");
				var owner_id = o.url.split(".")[0],
					url = "https://api.vkontakte.ru/method/audio.getById?audios=" + owner_id + "&access_token=" + VK.getToken() + "&callback=?";
				$.getJSON(url, function(data) {
					var newDirectLink = data.response[0].url,
						underlyingArray = Spank.history.stream();
					if (newDirectLink) {
						o.direct = newDirectLink;
						underlyingArray[atHistoryIndex] = o;
						Spank.history.stream.valueHasMutated();
						Spank.player.playObject(o, atHistoryIndex);
					} else {
						alert("Yipes! This audio file has gone missing! Replace it with another one!");
					}

				});
			},
			applyNewCoverArt: function(o, atHistoryIndex) {
				var lastfm_trackSearch = "http://ws.audioscrobbler.com/2.0/?method=track.search&artist=@&track=#&limit=1&api_key=0325c588426d1889087a065994d30fa1&format=json",
					url = lastfm_trackSearch.replace("@", encodeURIComponent(o.artist)).replace("#", encodeURIComponent(o.title));
				$.getJSON(url, function(res) {
					var underlyingArray = Spank.history.stream();
					try {
						var images = res.results.trackmatches.track.image;
						if (Array.isArray(images) && images.length>0) {
							o.thumb = images[images.length-1]['#text'] || o.thumb;
							$("#funkyPlayer").css("background", "url(#)".replace("#", o.thumb));
							underlyingArray[atHistoryIndex] = o;
							Spank.history.stream.valueHasMutated();
						}
					} catch(err) {
						console.error(err);
					}
				})
			},
			highlightHistoryItemWithIndex: function(n) {
				n++;
				var selector = ".tweetItem:nth-child(#)".replace("#",n);
				$(".tweetPlay").removeClass("tweetPlay");
				$(selector).removeClass("tweetStop").addClass("tweetPlay");
			},
			suspendLoopAndTrigger: function(callback) {
				if (threeSixtyPlayer.config.loop) {
					threeSixtyPlayer.config.loop = false;
					callback();
					setTimeout(function() {
						threeSixtyPlayer.config.loop = true;
					},2000);
				} else {
					callback()
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
				next_play_index = 0;
				threeSixtyPlayer.config.jumpToTop = false;
			} else if (threeSixtyPlayer.config.loop) {
				next_play_index = -1;
				// Do nothing because loop is built into 360 Player
			} else if (threeSixtyPlayer.config.shuffle && underlyingArray.length > 1) {
				next_play_index = Spank.utils.randrange(0, underlyingArray.length-1);
			} else if (underlyingArray.length > 1) {
				var next_index = underlyingArray.indexOf(Spank.player.lastPlayedObject)+1;
				next_play_index = next_index < underlyingArray.length && next_index || 0;
			} else if (threeSixtyPlayer.config.loop===false) {
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