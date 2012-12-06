(function() {

	$(document).ready(function() {

		var highlightHistoryItemWithIndex = function(n) {
			n++;
			var selector = ".tweetItem:nth-child(#)".replace("#",n);
			$(".tweetPlay").removeClass("tweetPlay");
			$(selector).removeClass("tweetStop").addClass("tweetPlay");
		};

		function vkGetDirectLinkAndTryPlayingAgain(o, atHistoryIndex) {
			console.log("Looking for new VK link");
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
		}

		var fakeSource = "/static/silence.mp3";
		var testAudio = new Audio();
		Spank.player = {
			current_url: ko.observable(fakeSource),
			lastLastPlayedObject: null,
			lastPlayedObject: null,
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
			},
			playObject: function(o, atHistoryIndex) {
				this.lastLastPlayedObject = this.lastPlayedObject;
				this.lastPlayedObject = o;
				atHistoryIndex = atHistoryIndex || Spank.history.stream().indexOf(o);
				highlightHistoryItemWithIndex(atHistoryIndex);
				var thumb_path = o.thumb || Spank.genericAlbumArt,
					css_prop = "url(#)".replace("#",thumb_path);
				if (o.direct) {
					testAudio.src = o.direct;
					testAudio.preload = "none";
					testAudio.onerror = function() {
						vkGetDirectLinkAndTryPlayingAgain(o, atHistoryIndex);
					};
					testAudio.addEventListener('loadstart', function() {
						testAudio.pause();
						Spank.player.current_url(o.direct);
						$("#funkyPlayer").css("background", css_prop);
					});
					testAudio.load();
				} else {
					vkGetDirectLinkAndTryPlayingAgain(o, atHistoryIndex);
				}
			}
		};

		ko.applyBindings(Spank.player, document.getElementById('funkyPlayer'));

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
			// Play
			if (typeof(threeSixtyPlayer.indexByURL[url])!=='undefined') {
				$(".sm2-360btn").trigger('click');
			} else {
				var index = threeSixtyPlayer.links.length;
				threeSixtyPlayer.indexByURL[url] = index;
				threeSixtyPlayer.links[index] = a;
				$(".sm2-360btn").trigger('click');
			}
		});

	});

})();