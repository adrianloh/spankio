/*global document, window, soundManager, navigator, ko, Spank */

(function() {

	$(document).ready(function() {

		document._draggedHistoryItem = null;

		var tweetItems = $(".tweetItem");
		tweetItems.live('mouseover', function() {
			var elem = $(this);
			elem.find(".rJ1Qad").addClass("rJ1Qad_hover");
			elem.find(".tweetDelete").removeClass("tweetOpsHide");
			elem.find(".tweetDownload").removeClass("tweetOpsHide");
		});

		tweetItems.live('mouseout', function() {
			var elem = $(this);
			elem.find(".rJ1Qad").removeClass("rJ1Qad_hover");
			elem.find(".tweetDelete").addClass("tweetOpsHide");
			elem.find(".tweetDownload").addClass("tweetOpsHide");
		});

		$(".tweetThumb").live("mouseover",
			function() {
				$(this).siblings(".rJ1Qad").toggleClass("rJ1Qad_hover");
				$(this).parent("li.tweetItem").toggleClass("grippy");
		}).live("mouseout",
			function() {
				$(this).siblings(".rJ1Qad").toggleClass("rJ1Qad_hover");
				$(this).parent("li.tweetItem").toggleClass("grippy");
		});

		$(".rJ1Qad").live("mouseover", function() {
			$(this).addClass("rJ1Qad_hover");
		}).live("mouseout", function() {
			$(this).removeClass("rJ1Qad_hover");
		}).live("click", function() {
			$(this).siblings(".tweetThumb").click();
		});

		$(".giftPopup").bind("hover mouseenter", function() {
			$(this).hide();
		});

		Spank.disableDropZones = function(mode) {
			document._ignoreDrop = mode;
			var method = {'true': 'addClass', 'false': 'removeClass'}[mode.toString()];
			$("#playlistDropZone, #playlistSearchZone")[method]("zoneHide");
		};

		$(".playlistThumb.mine").live("mouseenter", function() {
			Spank.disableDropZones(true);
		}).live("mouseleave", function() {
			Spank.disableDropZones(false);
		});

		ko.bindingHandlers.pickupStreamItems = {
			init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
				var data = valueAccessor(),
					li = $(element),
					dockIsVisible, lastActiveDock;
				li.data('koo', data);
				li.draggable({
					appendTo: 'body',
					containment: 'window',
					scroll: false,
					helper: function() {
						var helper;
						if (Spank.history.batchItems().length===0) {
							helper = li.clone();
							// Speeds up the UI if there are no observables being dragged around
							helper.data("koo", ko.toJS(data));
							helper.find("i,span").remove();
							helper.addClass("tweetItem_dragMode");
							return helper;
						} else {
							helper = $("#basketcase").clone();
							helper.addClass("basketcase");
							var howManyThumbnails = Spank.history.batchItems().length,
								container = helper.find(".basketpics-container"),
								pics = helper.find(".basketpics"),
								big = 40,
								small = 25;
							if (howManyThumbnails<=5) {             // One row, but bigger
								pics.css({width:big});
							} else if (howManyThumbnails<=9) {      // Grid 3x3
								container.css({width:big*3});
								pics.css({width:big});
							} else if (howManyThumbnails<=15) {     // Grid 5x3
								container.css({width:small*5});
								pics.css({width:small});
							} else if (howManyThumbnails===16) {   // Grid 4x3
								container.css({width:big*4});
								pics.css({width:big});
							} else if (howManyThumbnails>=17) {   // Grid 5x5
								container.css({width:small*5});
								pics.css({width:small});
							}
							return helper;
						}
					},
					revert: 'invalid',
					cursor: '-webkit-grabbing',
					zIndex:999,
					addClasses: false,
					start:function( event, ui ) {

						// When a user drags a stream item, we want to jump over
						// to our playlists to make it easy for them to add songs
						dockIsVisible = Head.playlists.visible();
						lastActiveDock = null;
						$.each(Head.playlists.docksVisible, function(dockName, isOpen) {
							if (isOpen()) {
								lastActiveDock = dockName;
							}
						});
						if (Head.playlists.dockItemsMe().length>0) {
							$(".playlist-type-btn[value='ppi-me']").click();
						}

						var defocus = true,
							playlistDropZone = $("#playlistDropZone"),
							searchZone = $("#playlistSearchZone");
						if (Spank.charts.userPlaylistIsOpen()) {
							// When we're looking at an open playlist, the dropzones each occupy 1/2 frame.
							if (Spank.batchOps.batchOpsActive()) {
								playlistDropZone.addClass("dropHalfWidth").addClass("zoneShow");
							} else {
								searchZone.addClass("dropHalfWidth").addClass("zoneShow");
								playlistDropZone.addClass("dropHalfWidth").addClass("zoneShow");
							}
						} else if (!Spank.batchOps.batchOpsActive()) {
							searchZone.removeClass("dropHalfWidth").addClass("zoneShow");
						} else {
							defocus = false;
						}
						if (defocus) {
							if ($(".defocus").length===0) { // Make sure we don't defocus anything twice
								$(".defocusOnDrag1").addClass("defocus");
							}
						}
					},
					drag:function( event, ui ) {
					},
					stop:function( event, ui ) {
						var defocusGroup = $(".defocusOnDrag1");
						if (defocusGroup.hasClass("defocus")) {
							defocusGroup.removeClass("defocus");
						}
						$("#playlistDropZone").removeClass("zoneShow");
						$("#playlistSearchZone").removeClass("zoneShow");
						if (dockIsVisible) {
							var selector = ".playlist-type-btn[value='ppi-WHICH']".replace(/WHICH/, lastActiveDock);
							$(selector).click();
						} else {
							Head.playlists.visible(false);
						}
					}
				});
				if (data.hasOwnProperty("gift")) {
					var img = '<img class="tweetGift" src="/img/gift.png" from="@" message="#" />';
					img = img.replace("@", data.gift.from).replace("#", data.gift.message);
					li.prepend(img);
					li.find(".tweetGift").mouseover(function() {
						var img = $(this);
						$(".giftFrom:first").text("from: " + img.attr("from"));
						$(".giftMessage:first").text(img.attr("message"));
						var pos = li.offset(),
							top = parseInt(pos.top-70, 10),
							left = parseInt(pos.left+100, 10);
						$(".giftPopup").css("top", top).css("left", left).show();
					}).mouseout(function() {
						$(".giftPopup").hide();
					});
				}
			}
		};

		ko.bindingHandlers.dropIntoPlaylist = {
			init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
				var playlistObject = valueAccessor();
				$(element).droppable({
					accept: ".tweetItem",
					greedy: true,
					tolerance: "pointer",
					hoverClass: "playlistMeDropActive",
					drop: function addDroppedTrackToPlaylist(event, ui) {
						var droppedItem = $(ui.draggable);
						if (droppedItem.hasClass("tweetItem")) {
							var batchItems = Spank.history.batchItems(),
								dataToAdd;
							if (batchItems.length>0) {
								dataToAdd = batchItems.map(function(o) { return ko.toJS(o) });
							} else {
								var data = $(ui.draggable).data('koo');
								dataToAdd = [ko.toJS(data)];
							}
							if (dataToAdd.length>0) {
								dataToAdd.reverse();
								Spank.history.batchItems([]);
							}
							Head.pushBatchIntoPlaylistAtBase(playlistObject.base, dataToAdd);
						}
					}
				});
			}
		};

		ko.bindingHandlers.pickupPlaylistItems = {
			init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
				$(element).draggable({
					appendTo: 'body',
					containment: 'window',
					scroll: false,
					helper: 'clone',
					revert: 'invalid',
					cursor: '-webkit-grabbing',
					zIndex:999,
					start:function( event, ui ) {
						// Gets us the object of the history item that was picked up
						document._draggedHistoryItem = valueAccessor();
					},
					drag:function( event ) {
					},
					stop:function( event ) {
					}
				});
			}
		};

		// When you drop a stream thumbnail into the top search bar
		$("#searchFieldDrop, #searchField").droppable({
			accept: ".tweetItem",
			hoverClass: "inputdropactive",
			tolerance: "touch",
			drop: function searchMusixForDroppedArtist(event, ui) {
				var data = $(ui.draggable).data('koo'),
					searchString = data.artist,
					searchVKDirectly = $("#myonoffswitch").is(":checked");
				if (!searchVKDirectly) {
					searchString = "artist: ".concat(searchString);
				}
				Spank.charts.pushHistoryImmedietly = true;
				$("#searchField").focus().val(searchString).trigger("keyup");
			}
		});

		// When you drop a stream thumbnail into "Search for similar..."
		$("#playlistSearchZone").droppable({
			accept: ".tweetItem",
			hoverClass: "bgOver",
			tolerance: "intersect",
			drop: function getSimilarAsDroppedTrack(event, ui) {
				setTimeout(function () {
					if (document._ignoreDrop===true) return;
					var koo = $(ui.draggable).data('koo');
					Spank.charts.getSimilar(ko.toJS(koo));
				}, 250);
			}
		});

		// When you drop a stream thumbnail into a playlist that's currently open
		$("#playlistDropZone").droppable({
			accept: ".tweetItem",
			greedy: true,
			hoverClass: "bgOver",
			drop: function addDroppedTrackToPlaylistView(event, ui) {
				setTimeout(function() {
					if (document._ignoreDrop===true) return;
					var dataToAdd = [];
					if (Spank.history.batchItems().length>0) {
						dataToAdd = ko.toJS(Spank.history.batchItems);
					} else {
						var data = $(ui.draggable).data('koo'),
							droppedHistoryItem = ko.toJS(data);
						dataToAdd = [droppedHistoryItem];
					}
					if (dataToAdd.length>0) {
						dataToAdd.reverse();
						Spank.history.batchItems([]);
					}
					Head.unshiftIntoOpenPlaylist(dataToAdd);
				}, 250);
			}
		});

	});

})();