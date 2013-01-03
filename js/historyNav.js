(function(window, undefined){

	// Prepare
	var History = window.History; // Note: We are using a capital H instead of a lower h
	if ( !History.enabled ) {
		// History.js is disabled for this browser.
		// This is because we can optionally choose to support HTML4 browsers or not.
		return false;
	}

	History.datastore = {};

	// Bind to StateChange Event
	History.Adapter.bind(window, 'statechange', function() { // Note: We are using statechange instead of popstate
		var State = History.getState(); // Note: We are using History.getState() instead of event.state
//		History.log(State.data, State.title, State.url);
		var k = State.data.stateKey,
			searchField = $("#searchField"),
			selector, playlistThumb, re;
		if (History.firstpush) {
			History.firstpush = false;
			return;
		}
		if (History.datastore.hasOwnProperty(k)) {
			var data = History.datastore[k];
			if (data.hasOwnProperty('chartData')) {
//				console.log("HISTORY GET from DATASTORE General");
				$.each(data.chartData, function(k,v) {
					Spank.charts[k](v);
					Spank.charts[k].valueHasMutated();
				});
				Spank.charts.currentPlaylistTitle(undefined);
				if (data.hasOwnProperty('q')) {
					re = new RegExp(data.q, "i");
					$(".playlistEntry").removeClass("activePlaylist");
					$(".chartThumb").filter(function() { return this.title.match(re); }).first().parent().addClass("activePlaylist");
					if (!Spank._userIsTyping) {
						searchField.val(data.q);
					}
					//console.log($(document.activeElement)[0].tagName);
				}
			}
		} else {
			var queries = {};
			$.each(document.location.search.substr(1).split('&'),function(c,q) {
				try {
					var i = q.split('=');
					queries[i[0].toString()] = decodeURIComponent(i[1].toString());
				} catch(err) {}
			});
			if (queries.hasOwnProperty("q")) {
//				console.log("HISTORY GET from URL General");
				if (queries.q!=='Search') {
					re = new RegExp(queries.q, "i");
					var chart = $(".chartThumb").filter(function() { return this.title.match(re); });
					Spank.charts.dontPushHistory = true;
					if (chart.length>0) {
						searchField.val(queries.q);
						chart.first().trigger('click');
					} else {
						searchField.val(queries.q).trigger("keyup");
					}
				}
			} else if (queries.hasOwnProperty("playlistID")) {
//				console.log("HISTORY GET from URL Playlist");
				Spank.charts.dontPushHistory = true;
				selector = ".playlistThumb[refid='#']".replace("#", queries.playlistID);
				playlistThumb = $(selector);
				if (playlistThumb.length>0) {
					playlistThumb.trigger('click');
				} else {
					window.notify.error("This playlist has been deleted.")
				}
			}
		}
	});

})(window);