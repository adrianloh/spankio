(function($) {

	var LiveSearch = function(element, opts)
	{
		element = $(element);
		var obj = this;
		var settings = $.extend({}, $.fn.livesearch.defaults, opts);

		var timer = undefined;
		var prevSearchTerm = element.val();

		element.empty();

		element.bind("keyup", function() {
			// have a timer that gets canceled if a key is pressed before it executes
			if(timer != undefined) {
				clearTimeout(timer);
			}
			timer = setTimeout(DoSearch, settings.queryDelay);
		});

		this.DoSearch = DoSearch;
		function DoSearch() {
			var searchTerm = element.val();
			if(searchTerm != prevSearchTerm) {
				prevSearchTerm = searchTerm;
				if(searchTerm.length >= settings.minimumSearchLength) {
//					DisplayProgressIndication();
					DisplayResults(searchTerm);
				}
				else if(searchTerm.length == 0) {
					DisplayResults("");
				}
			}
		}

//		function DisplayProgressIndication() {
//			console.log("wait");
//		};

		function DisplayResults(searchTerm) {
			timer = undefined;
//			console.log("livesearch - " + searchTerm);
			settings.searchCallback(searchTerm);
		}

		if (element.val() == "" || element.val() == settings.innerText) {
			disableSearch();
		}
		else {
			enableSearch();
		}

		element.focus(function() {
			if (element.hasClass("inactive_search")) { enableSearch(); }
		});

		element.blur(function() {
			if (element.val() == "") { disableSearch(); }
		});

		function enableSearch() {
			element.addClass("active_search");
			element.removeClass("inactive_search");
			element.val("");
		}

		function disableSearch() {
			element.addClass("inactive_search");
			element.removeClass("active_search");
////
			prevSearchTerm = "";
			var message = settings.innerText === 'Search library' ? settings.innerText : Spank.tagline;
 			element.val(message);
		}

	};

	$.fn.livesearch = function(options)
	{
		this.each(function()
		{
			var element = $(this);

			// Return early if this element already has a plugin instance
			if (element.data('livesearch')) return;

			// pass options to plugin constructor
			var livesearch = new LiveSearch(this, options);

			// Store plugin object in this element's data
			element.data('livesearch', livesearch);
		});
	};


	$.fn.livesearch.defaults = {
		queryDelay: 250,
		innerText: "Search",
		minimumSearchLength: 3
	};

})(jQuery);
