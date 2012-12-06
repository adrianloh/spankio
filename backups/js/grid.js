(function() {
	$('head').append('<link rel="stylesheet" type="text/css" href="/js/gridrotator/demo.css" />');
	$('head').append('<link rel="stylesheet" type="text/css" href="/js/gridrotator/style.css" />');
	var params = {apikey:'316bd7524d833bb192d98be44fe43017', format:'jsonp', page:1, page_size:200, country:'uk'};
	function addPhoto(track) {
		var img = '<li><a href="#"><img src="@" /></a></li>';
		var url = track.track.album_coverart_350x350;
		if (url) {
			var coverart = $(img.replace("@",url));
			coverart.appendTo("#bgGrid");
		}
	}
	$.ajax({
		type:'GET',
		url: "http://api.musixmatch.com/ws/1.1/chart.tracks.get",
		data:params,
		dataType:'jsonp',
		success: function(data) {
			$.each(data.message.body.track_list, function(i,track) {
				addPhoto(track);
			});
			params = {apikey:'316bd7524d833bb192d98be44fe43017', format:'jsonp', page:1, page_size:200, country:'us'};
			$.ajax({
				type:'GET',
				url: "http://api.musixmatch.com/ws/1.1/chart.tracks.get",
				data:params,
				dataType:'jsonp',
				success: function(data) {
					$.each(data.message.body.track_list, function(i,track) {
						addPhoto(track);
					});
					$( '#ri-grid' ).gridrotator( {
						rows : 10,
						columns : 6,
						maxStep : 10,
						interval : 2000,
						w1024 : {
							rows : 10,
							columns : 6
						},
						w768 : {
							rows : 10,
							columns : 6
						},
						w480 : {
							rows : 6,
							columns : 4
						},
						w320 : {
							rows : 7,
							columns : 4
						},
						w240 : {
							rows : 7,
							columns : 3
						}
					});
				}
			});
		}
	});
})();