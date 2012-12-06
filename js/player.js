(function(global) {

	$(document).ready(function () {

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

		$.each(['loop','shuffle'], function(i,a) {
			playerControlModel[a].subscribe(function(v) {
				var p = v ?	"brightness(0)" : "grayscale(1)",
					s = "#@_button".replace("@",a);
				$(s).css("webkitFilter",p);
			});
		});

		ko.applyBindings(playerControlModel, document.getElementById('spank-player-controls'));

		$.each(['loop','shuffle'], function(i,a) {
			if (typeof(localStorage[a])!=='undefined' && localStorage[a]==='true') {
				console.log(a+" is true");
				$('#'+a+"_button").trigger("click");
			}
		});

		var deprecated_getPlaylistsFromRedis = function () {
			var req = "/playlist/list/" + encodeURIComponent(FBUserInfo.username + " PLAYLIST ALL");
			$.getJSON(req, function(data) {
				$.each(data, function(i,o) {
					var playlistItem = {
						title: $.trim(o.title.split(" PLAYLIST").slice(1)[0]),
						cover: o.cover.match(/^http/) ? o.cover : Spank.genericAlbumArt,
						url: "/playlist/items/" + encodeURIComponent(this.title)
					};
					Spank.playlistScroller.push(playlistItem);
				});
			});
		};

		// On first launch, grab the user's playlist once we log into Facebook
		$(document).one("login", function() {
			// getPlaylistsFromRedis();
			// Dock the playlist bar...
			var t2 = setTimeout(function() {
				$(".chart-button").trigger("click");
				clearTimeout(t2);
			},5000);

		});

		$(document).bind('fatManFinish', function(e,data) {
			var underlyingArray = Spank.history.stream(),
				next_play_index;
			if (threeSixtyPlayer.config.loop) {
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

}(window));