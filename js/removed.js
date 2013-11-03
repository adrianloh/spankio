/**
From externals.js
*/

Spank.moodSwings = (function() {
	var self = {};
	self.visible = ko.observable(false);
	self.visible.subscribe(function(v) {
		var mode = v ? "show" : "hide",
			moodButton = $("#moodswing_button"),
			moodSearchBox = $("#moodswings");
		if (mode==='show') {
			moodButton.data("on")();
			moodSearchBox.slideDown('fast','swing', function() {});
		} else {
			moodButton.data("off")();
			moodSearchBox.slideUp('fast','swing', function(){});
		}
	});

	$("#moodswing_button").click(function() {
		var current = self.visible();
		self.visible(!current);
	});

	self.basedOn = ko.observableArray([]);
	self.feelingNow = ko.observableArray([]);
	self.title = ko.computed(function() {
		if (self.basedOn().length>0) {
			return 'Find songs by artists like <span class="mood-artist">' + self.basedOn()[0].artist + '</span> that are...';
		} else {
			return "Drop a track here to start a mood swing!";
		}
	});
	self.feelingNow.subscribe(function() {
		self.moodSearch();
	});
	self.basedOn.subscribe(function() {
		self.moodSearch();
	});
	self.moodSearch = function() {
		var url = "http://developer.echonest.com/api/v4/playlist/static?api_key=FILDTEOIK2HBORODV&COCK&results=100&type=artist-radio&SUCKER&adventurousness=.9&sort=song_hotttnesss-desc&bucket=id:7digital-US&bucket=tracks";
		if (self.basedOn().length>0 && self.feelingNow().length>0) {
			var data = self.basedOn()[0],
				artist, moodParams;
			if (data.hasOwnProperty("echoid_artist")) {
				artist = "artist_id=#".replace("#", data.echoid_artist);
			} else {
				artist = "artist=#".replace("#", data.artist);
			}
			moodParams = "mood=" + self.feelingNow().join("&mood=");
			url = url.replace("COCK", artist).replace("SUCKER", moodParams);
			url = url + "&callback=" + Spank.utils.guid();
			Spank.busy.on();
			$.getJSON(url, function(res) {
				Spank.busy.off();
				if (res.hasOwnProperty("response") &&
					res.response.hasOwnProperty("status") &&
					res.response.hasOwnProperty("songs") &&
					res.response.status.code===0 &&
					res.response.songs.length>0) {
					Spank.charts.current_url(url);
					Spank.charts.pushHistoryImmedietly = true;
					$("#searchField").val("moodswing: " + data.artist);
					Spank.charts.pushBatch(res.response.songs, 'replace');
				}
			});
		}
	};

	$("#moodswings").droppable({
		accept: ".tweetThumb",
		hoverClass: "moodOver",
		drop: function() {
			document._ignoreDrop = true;
			if (document._draggedHistoryItem!==null) {
				self.basedOn()[0] = ko.toJS(document._draggedHistoryItem);
				self.basedOn.valueHasMutated();
			}
			setTimeout(function() {
				document._ignoreDrop = false;
			}, 2500);
		}
	});

	self.moods =
		['aggressive',
			'ambient',
			'angry',
			'angst-ridden',
			'bouncy',
			'calming',
			'carefree',
			'cheerful',
			'cold',
			'complex',
			'cool',
			'dark',
			'disturbing',
			'dramatic',
			'dreamy',
			'eerie',
			'elegant',
			'energetic',
			'enthusiastic',
			'epic',
			'fun',
			'funky',
			'futuristic',
			'gentle',
			'gleeful',
			'gloomy',
			'groovy',
			'happy',
			'harsh',
			'haunting',
			'humorous',
			'hypnotic',
			'industrial',
			'intense',
			'intimate',
			'joyous',
			'laid-back',
			'light',
			'lively',
			'manic',
			'meditation',
			'melancholia',
			'mellow',
			'mystical',
			'ominous',
			'party+music',
			'passionate',
			'peaceful',
			'playful',
			'poignant',
			'quiet',
			'rebellious',
			'reflective',
			'relax',
			'romantic',
			'rowdy',
			'sad',
			'sentimental',
			'sexy',
			'smooth',
			'soothing',
			'sophisticated',
			'spacey',
			'spiritual',
			'strange',
			'sweet',
			'theater',
			'trippy',
			'warm',
			'whimsical'];
	return self;
})();

ko.applyBindings(Spank.moodSwings, document.getElementById('moodswings'));