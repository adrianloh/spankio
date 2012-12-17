(function() {

	$(document).ready(function() {

		document._userIsTyping = false;

		document._draggedHistoryItem = {};

		$(".mxThumb").mouseover(function() {
			$(this).css("z-index","1");
		});

		ko.bindingHandlers.cartDeleteIcons = {
			init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
				var data = ko.toJS(valueAccessor()),
					li = $(element);
				if (data.hasOwnProperty("gift")) {
					var img = '<img class="tweetGift" src="/img/gift.png" from="@" message="#" />';
					img = img.replace("@", data.gift.from).replace("#", data.gift.message);
					li.prepend(img);
				}
				function display(mode) {
					li.find(".tweetDelete")[mode]();
					li.find(".tweetDownload")[mode]();
				}
				li.mouseover(function() {
					var thisGift = li.find('.tweetGift');
					if (thisGift.length>0) {
						$(".giftFrom:first").text("from: " + thisGift.attr("from"));
						$(".giftMessage:first").text(thisGift.attr("message"));
						var pos = li.offset(),
							top = parseInt(pos.top-70),
							left = parseInt(pos.left);
						$(".giftPopup").css("top", top).css("left", left).show();
					}
					display('show')
				}).mouseout(function() {
					$(".giftPopup").hide();
					display('hide')
				});
			}
		};

		var historyDropZones = function(op) {
			var tipsToShow = ['#searchField','#playlistScroller'];
			if (!Spank.charts.currentPlaylistTitle()) {
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
//					cursor: '-webkit-grabbing',
					zIndex:999,
					start:function( event, ui ) {
						document._draggedHistoryItemUIParent = $(element).parent();
						// Gets us the object of the history item that was picked up
						document._draggedHistoryItem = ko.toJS(valueAccessor());
						var searchZone = $("#playlistSearchZone");
						if (Spank.charts.currentPlaylistTitle()) {
							searchZone.removeClass("searchFullWidth").show();
							$("#playlistDropZone").show();
						} else {
							if (!searchZone.hasClass("searchFullWidth")) searchZone.addClass("searchFullWidth");
							searchZone.show();
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
				if (document._draggedHistoryItem!==null) {
					$("#searchField").val("artist: " + document._draggedHistoryItem.artist).trigger("keyup");
				}
			}
		});

		$("#playlistDropZone").droppable({
			accept: ".tweetThumb",
			greedy: true,
			tolerance: "pointer",
			hoverClass: "bgOver",
			drop: function addDroppedTrackToPlaylistView() {
				setTimeout(function() {
					if (document._ignoreDrop===true) return false;
					var droppedHistoryItem = JSON.parse(JSON.stringify(document._draggedHistoryItem));
					Spank.playlistScroller.addSongToPlaylist(Spank.charts.currentPlaylistTitle(), droppedHistoryItem);
				}, 250);
			}
		});

		$("#playlistSearchZone").droppable({
			accept: ".tweetThumb",
			hoverClass: "bgOver",
			drop: function getSimilarAsDroppedTrack(event) {
				setTimeout(function () {
					if (document._ignoreDrop===true) return false;
					var similar_url = "http://ws.audioscrobbler.com/2.0/?method=track.getsimilar&artist=@&track=#&autocorrect=1&limit=200&api_key=0325c588426d1889087a065994d30fa1&format=json";
					if (document._draggedHistoryItem!==null) {
						var url = similar_url.replace("@", encodeURIComponent(document._draggedHistoryItem.artist)).replace("#", encodeURIComponent(document._draggedHistoryItem.title));
						Spank.charts.populateResultsWithUrl(url, function extract(res) {
							return res.similartracks.track;
						}, function noresults() {
							window.notify.error("Couldn't find any similar songs!");
						});
					}
				}, 250);
			}
		});

	});

})();



