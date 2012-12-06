(function() {

	$(document).ready(function () {

		$("tr").live("hover", function(){
			console.log($(this));
		});




		$.searchByWire = function(search_term) {
			var data = {q:search_term, page:1};
			$('#mxResults').dataTable({
				"sAjaxSource": '/mxsearch2/' + encodeURIComponent(JSON.stringify(data)),
				"bProcessing": true,
				"bDestroy": true,
				"aoColumns": [
					{ "mData": "track_name" },
					{ "mData": "artist_name" },
					{ "mData": "album_name" },
					{ "mData": "album_coverart_100x100" },
					{ "mData": "track_id" }
				]
			});
		return false;
		};

		$("#lyrics").livesearch({
			searchCallback: $.searchByWire,
			innerText: "The Times They Are A-Changin'",
			queryDelay:250,
			minimumSearchLength: 3
		});

	});

})();