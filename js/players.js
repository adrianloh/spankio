(function(global) {

		Playboy = function() {

		if ( Playboy.prototype._singletonInstance ) {
			return Playboy.prototype._singletonInstance;
		}
		Playboy.prototype._singletonInstance = this;

		var self = this;
		var username = $("title").text();
		var track_fragment = '<div onclick="" mid="@MID@" class="total-row can-play" artwork="/TotalControl/images/artwork.png" style="background-color: rgb(251, 251, 251); "><div type="checkbox" onclick="" class="total-checked"></div><div class="total-not-playing"></div><div class="total-title" src="@URL@">@TITLE@</div><div class="total-artist">@ARTIST@</div><div style="clear:both;"></div></div>';

		this.current_playlist = "Main Library";

		//
		// ADD A NEW TRACK TO THE CURRENT PLAYLIST
		//
		this.addToPlaylist = function(track, callback) {
			var data = track_fragment.replace("@MID@", track.mid).replace("@ARTIST@", track.artist).replace("@TITLE@", track.title).replace("@URL@", track.url);
			$(data).prependTo(".total_jspPane");
			if (callback) {
				callback();
			}
		};

		//
		// CREATE A NEW PLAYLIST ITEM
		//
		this.createPlaylistItemWithName = function(name) {
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
								self.LCD.good();
							} else {
								self.LCD.bad();
							}
						}
					});
				}
			}).appendTo("#playlist-container");
		};

		//
		// SAVE THE CURRENT PLAYLIST
		//
		$(document).bind("playlistDidChange", function saveCurrentPlaylist() {
			var playlist = [];
			self.LCD.loading();
			$(".total-row").each(function(i,div) {
				div = $(div);
				playlist.push({
					mid: div.attr("mid"),
					artist: div.find(".total-artist").text(),
					title: div.find(".total-title").text(),
					url: div.find(".total-title").attr("src")
				});
			});
			self.LCD.status(self.current_playlist, playlist.length);
			var req_url = "/playlist/" + username + " PLAYLIST " + encodeURIComponent(self.current_playlist);
			console.log("Saving to: ".concat(req_url));
			$.ajax({
				type:'PUT',
				url: req_url,
				data:{data:JSON.stringify(playlist)},
				success: function(data) {
					if (data) {
						self.LCD.good()
					} else {
						self.LCD.bad()
					}
				}
			})
		});

		$(".playlist-row").live("click", function loadPlaylistOnClick() {
			self.LCD.loading();
			self.current_playlist = $(this).text();
			console.log("Loading playlist --> " + self.current_playlist);
			var url = "/playlist/" + username + " PLAYLIST " + encodeURIComponent(self.current_playlist);
			$.getJSON(url, function(tracklist) {
				$(".total-row").remove();
				tracklist = tracklist || [];
				var total_songs = tracklist.length || 0;
				$.each(tracklist, function(i, track) {
					self.addToPlaylist(track);
				});
				self.LCD.status(self.current_playlist, total_songs);
				self.LCD.good();
			});
		});

		(function init() {

			$.each([
				"/TotalControl/images/default-lcd-screen.png",
				"/TotalControl/images/default-lcd-screen_saving.png",
				"/TotalControl/images/default-lcd-screen_unsaved.png"
			], function(i, src) {
				(new Image()).src = src
			});

			//
			// ATTACH THE PLAYER TO BODY
			//
			$('<ul id="total-playlist"></ul>').appendTo('body');
			// Total player adds tracks to its playlist by naively appending
			// div layers to itself. Get the div html fragment that we'll
			// use later to add new songs to the playlist.
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

			self.LCD = {
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

			//
			// CREATE THE PLAYLIST CONTAINER *AFTER* THE PLAYER HAS INIT()
			//
			$('<div id="playlist-container"></div>').appendTo("#total-playlist");

			//
			// FIRST LOAD OF SAVED PLAYLISTS
			//
			$.getJSON("/playlist/" + username + " PLAYLIST ALL", function(data) {
				$.each(data, function(i, playlist_name) {
					var name = playlist_name.split(" PLAYLIST ").slice(-1);
					self.createPlaylistItemWithName(name);
				});
				$(".playlist-row").filter(function() {
					return $(this).text()=="Main Library";
				}).trigger("click");
			});

			$(".total_jspPane").sortable({
				update : function () {
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
				$("."+klass).filter(function () {
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
							title = div.find(".total-title").text(),
							artist = div.find(".total-artist").text();
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
						var url = $(this).find(".total-title").attr("src");
						$('<iframe width="0" height="0" frameborder="0" src="@"></iframe>'.replace("@",url)).appendTo("body");
						setTimeout(function(){
							$("iframe").remove();
						},10000);
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
						self.createPlaylistItemWithName("Playlist_" + randString);
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

		})();

	};

	$(document).ready(function () {
		var a = new Playboy();
	});

}(window));