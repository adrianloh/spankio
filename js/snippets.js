(function(){

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

	$(document).ready(function () {

		var selectedText = "";

		function parsePost() {
			// We assume that there will always only be ONE lightbox open
			var postTitle = $("#lyricsTitle").text(),
				thumb = $("#lyricsThumb").attr("src"),
				url = $("#lightBox").attr("url");
			if (selectedText) {
				url = (typeof(url)==='undefined') ? "http://spank.io" : "http://spank.io".concat(url);
				url = thumb; // Disable this line and a link to the mp3 goes to the wall instead
				FB.api('/me/feed', 'post', {link:url, name:postTitle, message:selectedText, picture:thumb},
					function(response) {
						if (!response || response.error) {
							console.log(response);
							alert('Error occured');
						} else {
							alert('Posted to FB Wall!');
						}
				});
			}
		}

		var lightBoxContextMenu = [
			{'Post':{
				onclick:function(menuItem,menu) {
					parsePost();
				},
				title:'Post to my Facebook wall',
				disabled:false
			}
			}
		];

		var cmenu1= $(document).contextMenu(lightBoxContextMenu,{theme:'vista'});
		$("#lyricsText").live("contextmenu", function (event) {
			cmenu1.show($(this), event);
			return false;
		});

		$("#lyricsText").bind("mousedown", function() {
			selectedText = getSelectionHTML();
		});

	});


})();





































