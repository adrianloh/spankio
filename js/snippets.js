(function(){

	function getSelectedText()
	{
		var selectedText=(
			window.getSelection
				?
				window.getSelection()
				:
				document.getSelection
					?
					document.getSelection()
					:
					document.selection.createRange().text
			);
		if(!selectedText || selectedText=="")
		{
			if(document.activeElement.selectionStart)
			{
				selectedText = document.activeElement.value.substring(
					document.activeElement.selectionStart
						. document.activeElement.selectionEnd);
			}
		}
		return selectedText;
	}

	function getSelectionHTML() { 										// http://snipplr.com/view/10912/get-html-of-selection/
		var userSelection = window.getSelection();
		if (userSelection.isCollapsed)
			return '';
		else {
			var range = userSelection.getRangeAt(0);
			var clonedSelection = range.cloneContents();
			var div = document.createElement('div');
			div.appendChild(clonedSelection);

			//convert relative address to absolute
			var hrefs = div.querySelectorAll('[href]');
			for (var i=0, len=hrefs.length; i<len; i++)
				hrefs[i].href = hrefs[i].href;
			var srcs = div.querySelectorAll('[src]');
			for (var i=0, len=srcs.length; i<len; i++)
				srcs[i].src = srcs[i].src;

			return div.innerHTML;
		}
	}

	function publishFBWall(title, snippet) {
		FB.api('/me/feed', 'post',
			{
				message     : "I love thinkdiff.net for facebook app development tutorials",
				link        : 'http://ithinkdiff.net',
				picture     : 'http://thinkdiff.net/iphone/lucky7_ios.jpg',
				name        : title,
				description : 'Checkout iOS apps and games from iThinkdiff.net. I found some of them are just awesome!'

			},
			function(response) {
				if (!response || response.error) {
					console.log(response);
					alert('Error occured');
				} else {
					alert('Post ID: ' + response.id);
				}
			});
	}

	$(document).ready(function () {

		function doFBStuff() {
			FB.getLoginStatus(function(response) {
				if (response.status === 'connected') {
					console.log(response);
				} else if (response.status === 'not_authorized') {
					// not_authorized
				} else {
					// not_logged_in
				}
			});
		}

		$("#lyricsText").bind("neverhappensmouseup", function(e) {
			var selectedText = getSelectionHTML();
			if (selectedText) {
				console.log(selectedText);
				publishFBWall("Testing",selectedText);
			}
		});

	});


})();





































