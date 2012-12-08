(function() {

	$(document).ready(function() {

		Spank.userIsTyping = false;

		var draggedHistoryItem = null;

		ko.bindingHandlers.cartDeleteIcons = {
			init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
				$(element).mouseover(function mousein() {
					$(this).parent().find(".tweetDelete").show();
					$(this).parent().find(".tweetDownload").show();
				}).mouseout(function() {
					$(this).parent().find(".tweetDelete").hide();
					$(this).parent().find(".tweetDownload").hide();
				});
			}
		};

		ko.bindingHandlers.makeDroppablePlaylistTile = {
			init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
				bindDroppablePlaylists(element);
			}
		};

		ko.bindingHandlers.bindPlaylistButtons = {
			init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
				var data = valueAccessor();
				$(element).find(".playlistName").click(function() {
					Spank.userIsTyping = true;
				}).editable({
					editBy:'click',
					onSubmit: function(o) {
						Spank.userIsTyping = false;
						var oldname = o.previous,
							newname = o.current;
						if (oldname!==newname) {
							if (Spank.userData.playlists[oldname]) {
								Spank.playlistScroller.renamePlaylist(oldname, newname, element);
							} else {
								alert("Can't rename me cause I'm empty! Add some songs first...");
								$(this).text(oldname);
							}
						}
					}
				});
			}
		};

		ko.bindingHandlers.pickupStreamItems = {
			init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
				$(element).draggable({
					appendTo: 'body',
					containment: 'window',
					scroll: false,
					helper: 'clone',
					revert: 'invalid',
					cursor: '-webkit-grabbing',
					zIndex:999,
					start:function( event ) {
						draggedHistoryItem = valueAccessor(); // Gets us the raw JSON object of the history item that was picked up
					},
					drag:function( event ) {
					},
					stop:function( event ) {
					}
				});
			}
		};

		$("#lyrics").droppable({
			accept: ".tweetThumb",
			hoverClass: "bgOver",
			drop: function searchMusixForDroppedArtist() {
				if (draggedHistoryItem!==null) {
					$("#lyrics").val("artist: " + draggedHistoryItem.artist).trigger("keyup");
				}
			}
		});

		$("#resultsSection").droppable({
			accept: ".tweetThumb",
			hoverClass: "bgOver",
			drop: function getSimilarAsDroppedTrack(event) {
				console.log(event);
				var similar_url = "http://ws.audioscrobbler.com/2.0/?method=track.getsimilar&artist=@&track=#&autocorrect=1&limit=300&api_key=0325c588426d1889087a065994d30fa1&format=json";
				if (draggedHistoryItem!==null) {
					var url = similar_url.replace("@",encodeURIComponent(draggedHistoryItem.artist)).replace("#", encodeURIComponent(draggedHistoryItem.title));
					Spank.charts.populateResultsWithUrl(url, function extract(res) {
						return res.similartracks.track;
					}, function noresults() {
						alert("Couldn't find any similar songs!");
					});
				}
			}
		});

		var bindDroppablePlaylists = function(o) {
			$(o).droppable({
				accept: ".tweetThumb",
				tolerance: "pointer",
				hoverClass: "bgOver",
				drop: function addDroppedTrackToPlaylistInScrollbar() {
					if (draggedHistoryItem!==null) {
						var droppedHistoryItem = JSON.parse(JSON.stringify(draggedHistoryItem)),
							playlistThumb = $(this).find(".playlistThumb"),
							playlistThumbThatWasClicked = {
								title:playlistThumb.attr("title"),
								cover:playlistThumb.attr("src"),
								url:playlistThumb.attr("url")
							},
							playname = playlistThumbThatWasClicked.title;
						Spank.playlistScroller.addSongToPlaylist(playname, droppedHistoryItem);
					}
				}
			});
		};

		bindDroppablePlaylists(".droppablePlaylist");
		$("#foo2_prev, #foo2_next").live("click", function() {
			bindDroppablePlaylists(".droppablePlaylist");
		});

	});

})();



