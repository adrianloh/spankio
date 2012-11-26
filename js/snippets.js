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
				message     : snippet,
				link        : 'http://spank.io/tracksearch/-18147471_84769174.mp3',
				picture     : 'http://thinkdiff.net/iphone/lucky7_ios.jpg',
				name        : title,
				description : snippet
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

		var selectedText = "";

		function parsePost(o) {
			var lyricsTextDiv = $(o),
				postTitle = lyricsTextDiv.parent().find("#lyricsTitle").text();
			if (selectedText) {
				publishFBWall(postTitle, selectedText);
			}
		}

		var lightBoxContextMenu = [
			{'Post':{
				onclick:function(menuItem,menu) {
					parsePost(this);
				},
				title:'Post to my Facebook wall',
				disabled:false
			}
			}
		];

		var cmenu1= $(document).contextMenu(lightBoxContextMenu,{theme:'osx'});
		$("#lyricsText").live("contextmenu", function (event) {
			cmenu1.show($(this), event);
			return false;
		});

		$("#lyricsText").bind("mousedown", function() {
			selectedText = getSelectionHTML();
		});

	});


})();





































