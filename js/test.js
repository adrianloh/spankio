(function() {

	$(document).ready(function () {

		function getBillboards() {
			$('<div id="ri-grid" class="ri-grid ri-grid-size-3 ri-shadow"></div>').appendTo("body");
			$('<ul id="bgGrid"></li>').appendTo("#ri-grid");
			var params = {apikey:'316bd7524d833bb192d98be44fe43017', format:'jsonp', page:1, page_size:200, country:'uk'};
			$.ajax({
				type:'GET',
				url: "http://api.musixmatch.com/ws/1.1/chart.tracks.get",
				data:params,
				dataType:'jsonp',
				success: function(data) {
					console.log(data);
					var img = '<li><a href="#"><img src="@" /></a></li>';
					var tracklist = data.message.body.track_list;
					$.each(tracklist, function(i,track) {
						var coverart = $(img.replace("@",track.track.album_coverart_350x350));
						coverart.appendTo("#bgGrid");
					});
				}
			});
		}

		getBillboards();

	});

})();