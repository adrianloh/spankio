(function(){

	$(document).ready(function() {

		Spank.playlistScroller = {
			playlistItems: ko.observableArray(),
			push: function(o) {
				var default_item = {
					title: "Untitled",
					cover: Spank.genericAlbumArt,
					url: "#"
				};
				default_item.title = o.title ? o.title : default_item.title;
				default_item.cover = o.cover ? o.cover : default_item.cover;
				default_item.url = o.url ? o.url : default_item.url;
				this.playlistItems.push(default_item);
			}
		};

		ko.applyBindings(Spank.playlistScroller, document.getElementById('playlistScroller'));

		var scroller_config = {
			width:"100%",
			auto: false,
			prev: "#foo2_prev",
			next: "#foo2_next"
		};

		$("#playlists-scroller-list").carouFredSel(scroller_config);

		Spank.playlistScroller.playlistItems.subscribe(function(list) {
			console.log("Added playlist " + list[list.length-1].title);
			$("#playlists-scroller-list").carouFredSel(scroller_config);
		});

		$(".chart-button").click(function() {
			var button = $(this),
				scroller = $("#playlistScroller");
			if (scroller.css("bottom") >= '0px') {
				scroller.animate({bottom: '-220px'}, 500, 'swing', function() {
					button.text("Show Playlists");
				});
			} else {
				scroller.animate({bottom: '0px'}, 500, 'swing', function(){
					button.text("Hide Playlists");
				});
			}
		});

		$("#playlistScroller").mouseover(function() {
			var scroller = $(this);
			if (scroller.css("bottom") < '0px') {
				scroller.animate({bottom: '0px'}, 500, 'swing', function() {
					$(".chart-button").text("Hide Playlists");
				});
			} else {
				return false;
			}
		});

	});


})();