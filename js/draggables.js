(function() {

	$(document).ready(function() {

		Spank.userIsTyping = false;

		var draggedHistoryItem = {};

		$("#playlistDropZone").droppable({
			accept: ".tweetThumb",
			greedy: true,
			tolerance: "pointer",
			hoverClass: "bgOver",
			drop: function addDroppedTrackToPlaylistView() {
				var droppedHistoryItem = JSON.parse(JSON.stringify(draggedHistoryItem));
				Spank.playlistScroller.addSongToPlaylist(Spank.charts.currentPlaylistTitle, droppedHistoryItem);
			}
		});

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
				var data = valueAccessor();
				if (data.url!=="#") {
					return false;
				}
				bindDroppablePlaylists(element);
			}
		};

		ko.bindingHandlers.bindPlaylistButtons = {
			init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
				var data = valueAccessor();
				if (data.url!=="#") {
					return false;
				}
				$(element).find(".playlistName").click(function() {
					Spank.userIsTyping = true;
				}).editable({
					editBy:'click',
					onEdit: function(o) {
						$(this).bind("keyup", function(e) {
							if (e.keyCode===13) {       // ENTER key -- submit
								$(this).unbind("keyup");
								$(this).trigger("blur");
							}
						});
					},
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

		var historyDropZones = function(op) {
			var tipsToShow = ['#searchField','#playlistScroller'];
			if (!Spank.charts.currentPlaylistTitle) {
				tipsToShow.push('#resultsSection');
			}
			$.each(tipsToShow, function(i,o) {
				Tipped[op](o);
			});
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
						if (Spank.charts.currentPlaylistTitle) {
							$("#playlistSearchZone").removeClass("searchFullWidth");
							$("#playlistSearchZone").show();
							$("#playlistDropZone").show();
						} else {
							if (!$("#playlistSearchZone").hasClass("searchFullWidth")) $("#playlistSearchZone").addClass("searchFullWidth");
							$("#playlistSearchZone").show();
						}
					},
					drag:function( event ) {
					},
					stop:function( event ) {
						$("#playlistDropZone").hide();
						$("#playlistSearchZone").hide();
					}
				}).hover(function mousein() {
					historyDropZones('show');
				}, function mouseout() {
					historyDropZones('hide');
				});
			}
		};

		$("#searchField").droppable({
			accept: ".tweetThumb",
			hoverClass: "bgOver",
			drop: function searchMusixForDroppedArtist() {
				if (draggedHistoryItem!==null) {
					$("#searchField").val("artist: " + draggedHistoryItem.artist).trigger("keyup");
				}
			}
		});

		$("#playlistSearchZone").droppable({
			accept: ".tweetThumb",
			hoverClass: "bgOver",
			drop: function getSimilarAsDroppedTrack(event) {
				var similar_url = "http://ws.audioscrobbler.com/2.0/?method=track.getsimilar&artist=@&track=#&autocorrect=1&limit=200&api_key=0325c588426d1889087a065994d30fa1&format=json";
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



