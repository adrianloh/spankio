/*global document, window, Spank */

(function(window, undefined){

	// Prepare
	var History = window.History; // Note: We are using a capital H instead of a lower h
	if ( !History.enabled ) {
		// History.js is disabled for this browser.
		// This is because we can optionally choose to support HTML4 browsers or not.
		return false;
	}

	var originalHistoryPushState = History.pushState;
	History.stack = [];

	History.goToRefID = function(destRefID) {
		var currentRefID = History.getState().data.refID,
			currentPosition = History.stack.indexOf(currentRefID),
			nextPosition = History.stack.indexOf(destRefID),
			stateObjext;
		if (typeof(currentRefID)!=='undefined' && currentPosition>=0 && nextPosition>=0 && currentPosition!==nextPosition) {
			window.history.go(nextPosition-currentPosition);
		} else if (sessionStorage.hasOwnProperty(destRefID)) {
			/*  WARNING: This is a brute-force hack. Noticed a bug where a pinned state can
				get "lost" from the history stack, but the data remains in sessionStorage.
			*/
			stateObjext = sessionStorage[destRefID];
			Spank.charts.restoreStateFromHistory(stateObjext);
		}
	};

	var lastPushedRefID = "";
	History.pushState = function(data, title, url) {
		if (data.hasOwnProperty("refID")) {
			if (History.stack.length<=1) {
				History.stack.push(data.refID);
				lastPushedRefID = data.refID;
			} else {
				if (History.stack.indexOf(data.refID)>=0) {
					// We've moved back somewhere into the stack
					lastPushedRefID = data.refID;
				} else {
					// This is "all new"
					if (History.stack.indexOf(lastPushedRefID)!==History.stack.length-1) {
						// Browser is in the middle of the stack, not the top
						History.stack.splice(History.stack.indexOf(lastPushedRefID)+1);
					}
					lastPushedRefID = data.refID;
					History.stack.push(data.refID);
				}
			}
			originalHistoryPushState(data, title, url);
		}
	};

	// Bind to StateChange Event
	History.Adapter.bind(window, 'statechange', function() { // Note: We are using statechange instead of popstate
		var State = History.getState(); // Note: We are using History.getState() instead of event.state
		//console.log(State.data);
		Spank.charts.restoreStateFromHistory(State.data);
	});

})(window);