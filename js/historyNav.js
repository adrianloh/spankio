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
	History.Adapter.bind(window,'statechange',function() { // Note: We are using statechange instead of popstate
		var State = History.getState(); // Note: We are using History.getState() instead of event.state
//		History.log(State.data, State.title, State.url);
		var k = State.data.stateKey,
			searchField = $("#searchField");
		if (History.datastore.hasOwnProperty(k)) {
			var data = History.datastore[k];
			if (data.hasOwnProperty('chartData')) {
				$.each(data.chartData, function(k,v) {
					Spank.charts[k](v);
					Spank.charts[k].valueHasMutated();
				});
			}
			if (data.hasOwnProperty('q')) {
				if (!Spank._userIsTyping) {
					searchField.val(data.q);
				}
				//console.log($(document.activeElement)[0].tagName);
			}
		} else {
			var queries = {};
			$.each(document.location.search.substr(1).split('&'),function(c,q){
				var i = q.split('=');
				queries[i[0].toString()] = decodeURIComponent(i[1].toString());
			});
			//console.log(queries);
			if (queries.hasOwnProperty("q")) {
				if (queries.q!=='Search') {
					searchField.val(queries.q).trigger("keyup");
				}
			}
		}
	});

})(window);