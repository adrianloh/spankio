(function() {
	$('head').append('<link rel="stylesheet" type="text/css" href="/js/gridrotator/demo.css" />');
	$('head').append('<link rel="stylesheet" type="text/css" href="/js/gridrotator/style.css" />');
	function addPhoto(track) {
		var img = '<li><a href="#"><img src="@" /></a></li>';
		var url = track.track.album_coverart_100x100;
		if (url) {
			var coverart = $(img.replace("@",url));
			coverart.appendTo("#bgGrid");
		}
	}
	function initGrid(){
		$( '#ri-grid' ).gridrotator( {
			rows : 10,
			columns : 6,
			maxStep : 20,
			interval : 5000,
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

	function params(country) {
		return {apikey:'316bd7524d833bb192d98be44fe43017', format:'jsonp', page:1, page_size:200, country:country};
	}
	var done = [];
	var xhr1 = $.ajax({
		type:'GET',
		url: "http://api.musixmatch.com/ws/1.1/chart.tracks.get",
		data:params('uk'),
		dataType:'jsonp',
		success: function(data) {
			$.each(data.message.body.track_list, function(i,track) {
				addPhoto(track);
			});
			done.push(1);
		}
	});
	var xhr2 = $.ajax({
		type:'GET',
		url: "http://api.musixmatch.com/ws/1.1/chart.tracks.get",
		data:params('us'),
		dataType:'jsonp',
		success: function(data) {
			$.each(data.message.body.track_list, function(i,track) {
				addPhoto(track);
			});
			done.push(1);
		}
	});
	var checkReady = setInterval(function(){
		if (done.length==2) {
			initGrid();
			clearInterval(checkReady);
		}
	},1000)
})();