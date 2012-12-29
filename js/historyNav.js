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
		var k = State.data.stateKey;
		if (History.datastore.hasOwnProperty(k)) {
			var data = History.datastore[k];
			if (data.hasOwnProperty('tracks')) {
				Spank.charts.chartTracks(data.tracks);
				Spank.charts.chartTracks.valueHasMutated();
			}
			if (data.hasOwnProperty('q')) {
				$("#searchField").val(data.q);
			}
		}
	});

})(window);