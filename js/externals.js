/*global $, ko, Spank */

SPANKREV = "10292013";
CLOUDFRONT_BASE = "http://d1em6qf217sgaq.cloudfront.net";
CLOUDFRONT_S3_BASE = "http://d1vkkvxpc2ia6t.cloudfront.net";

Spank.servers = {
	'@aspasia':"https://aspasia.s3-ap-southeast-1.amazonaws.com"
};

Spank.library = {};
Spank.libraryIndex = {};

$.getJSON(Spank.servers['@aspasia'] + "/library.json", function(res) {
	Spank.library = res;
	$.each(res, function(artist) {
		Spank.libraryIndex[artist] = FuzzySet([]);
		$.each(Spank.library[artist], function(songName) {
			Spank.libraryIndex[artist].add(songName);
		})
	});
});

VK = (function() {

	var vk = {},
		pick = 0,
		url = CLOUDFRONT_S3_BASE + "/vktokens90212gz.json?origin=" + window.location.host;
	vk.token_user = {};
	vk.keys = [];

	function deprecated_init() {
		$.getJSON(url, function(res) {
			var tokens = [];
			for (var app_id in res) {
				var theseTokens = res[app_id].tokens;
				for (var login in theseTokens) {
					tokens.push(theseTokens[login]);
				}
			}
			var i = tokens.length;
			while (i--) {
				var token_string = tokens[i].split(":"),
					token = token_string[0],
					user_id = token_string[1];
				vk.token_user[token] = user_id;
				vk.keys.push(token);
			}
		});
	}

	vk.deprecated_getToken = function() {
		if (localStorage.hasOwnProperty('vktoken')) { // A workaround for overseas clients
			return localStorage['vktoken']
		} else {
			return vk.keys[++pick % vk.keys.length];
		}
	};

	vk.getToken = function() {
		return "d7125fb025264a7e8f1107789d332c23901af26b82e25be5c0e05f32e401dd4a330cc7781e9ad79585e18";
	};

	vk.api = function(url, successCallback, errorCallback) {
		var attempts = 0,
			token = vk.getToken();
		url = url + "&access_token=" + token + "&callback=?";
		return (function get() {
			return $.getJSON(url, function(res) {
				if (typeof(res)!=='object') {
					console.error("ERROR: VK API request " + url + "returned with unknown response" + res);
					if (typeof(errorCallback)!=='undefined') { errorCallback(); }
				} else {
					if (res.hasOwnProperty('error')) {
						if (res.error.error_code===5) {
							// TODO: Invalidate the access_token in question
							console.error("ERROR: Invalid VK access token: " + token);
							if (typeof(errorCallback)!=='undefined') { errorCallback(); }
						} else if (res.error.error_code===6 && attempts<=4) {
							attempts++;
							setTimeout(function() {
								get();
							}, attempts*100);
						} else {
							console.error("ERROR: VK API request " + url + "failed with error code " + res.error.error_code);
							if (typeof(errorCallback)!=='undefined') { errorCallback(); }
						}
					} else {
						successCallback(res.response)
					}
				}
			});
		})();
	};

	return vk;

})();

ECHO = {
	keys: "X2OROKI8NWEDHYDTM GK22IF7L5GLQQBLEL WVAZVRHOG59HOWTNC RADDG7GQBG1VPMGDN DW9KSGOM2CLAJHTXX LIJSXT5QXXZCA3RJ9 VCNSBSPZ1ECBZHLN1 RB3XH5KYICWMGZ4MC KCCO9G9N8YE2WM6OI IALGWME7AWGMSCPXB",
	init: function() {
		this.keys = this.keys.split(" ")
	},
	pick:0,
	key_random: function() {
		return this.keys[Math.floor(Math.random() * this.keys.length)];
	},
	key: function() {
		return this.keys[++this.pick % this.keys.length];
	},
	matchOne: function(title, artist, callback, err_callback) {
		$.ajax({
			url: "/echo/match/1",
			data: {
				artist: artist,
				title: title
			},
			success: function(results) {
				if (results.length>0) {
					if (callback) callback(results[0]);
				} else {
					if (err_callback) err_callback();
				}
			}
		});
	},
	startRecommendations: function() {
		var catalog_id = Spank.tasteProfileId.match(/SPANK_(.+)/)[1],
			url = "http://developer.echonest.com/api/v4/playlist/static?api_key=FILDTEOIK2HBORODV&results=100&type=catalog-radio&seed_catalog=CATALOG_ID&adventurousness=NOFEARFACTOR&bucket=id:7digital-US&bucket=tracks&page=1".replace("CATALOG_ID", catalog_id),
			item = {title: 'Recommendations', cover: '/img/echo.jpg', url: url, refID:"@echonest-recommended" };
		Head.playlists.dockItemsDiscover.unshift(item);
		$("#echonest_button").show();
	}
};

ECHO.init();

ITMS = (function() {

	var self = {};
	self.parseResults = function(results) {
		var tracklist = [];
		for (var i= 0, len=results.length; i<len; i++) {
			var track = results[i],
				omitFromResults = false;
			if (track.kind==='song') {
				track = {
					title: track.trackName,
					artist: track.artistName,
					album: track.collectionName,
					thumb: track.artworkUrl100.replace("100x100-75","170x170-75"),
					preview: track.previewUrl,
					itms_artist: track.artistId,
					itms_track: track.trackId,
					itms_album: track.collectionId,
					releaseDate: track.releaseDate
				};
				if (track.album==="Nevermind") track.releaseDate="1991-02-21T08:00:00Z";
				for (var k in track) {
					if (track.hasOwnProperty(k) && typeof(track[k])==='undefined') {
						delete track[k];
					}
				}
				if (track.title.match(/karaoke/i)) {
					omitFromResults = true;
				}
				if (track.hasOwnProperty("album") && track.album.match(/hitzone|karaoke|tribute/i)) {
					omitFromResults = true;
				}
				if (!omitFromResults) tracklist.push(track);
			}
		}
		return tracklist;
	};

	function clean(str) {
		str = $.trim(str.replace(/[\.,\/#!%\^&\*;:{}=_`~()]|feat\.?/gi,"")).toLowerCase();
		return str.replace(/-/," ");
	}

//	var iTunesTracksInAnAlbum = "https://itunes.apple.com/lookup?id=294084085&entity=song";

	self.query = function(q, callback, err_callback) {
		var url = "https://itunes.apple.com/search?term=QQQ&media=music&entity=song&limit=#",
			limit = 100,
			qq = typeof(q)==='string' ? q : q.title.concat(" ").concat(q.artist),
			tracklist;
		if (typeof(callback)!=='undefined') {
			if (callback.hasOwnProperty('limit')) limit = callback.limit;
			if (callback.hasOwnProperty('attributes')) url = url.concat(callback.attributes);
		}
		url = url.replace(/QQQ/, encodeURIComponent(clean(qq))).replace("#",limit);
		$.getJSON(url+"&callback=?", function(res) {
			if (res.results.length>0) {
				tracklist = self.parseResults(res.results);
				if (typeof(q)==='object') {
					for (var i=0, len=tracklist.length; i<len; i++) {
						var track = tracklist[i];
						track.score = Spank.utils.levenshtein(q.artist.toLowerCase(), track.artist.toLowerCase()) +
							Spank.utils.levenshtein(q.title.toLowerCase(), track.title.toLowerCase());
						if (q.hasOwnProperty('album')) {
							if (track.hasOwnProperty("album")) {
								track.score += Spank.utils.levenshtein(q.album.toLowerCase(), track.album.toLowerCase());
							} else {
								track.score += 10000;
							}
						}
						if (track.hasOwnProperty("album")) {
							if (track.album.match(/itunes|best|greatest/i)) track.score+=1;
						}
						if (track.hasOwnProperty("releaseDate")) {
							track.score += parseInt(track.releaseDate.split("-")[0], 10);
						}
					}
					tracklist = tracklist.sort(function(a,b) { return a.score-b.score; });
				}
				if (tracklist.length>0) callback(tracklist);
			} else {
				if (err_callback) err_callback();
			}
		});
	};

	return self;

})();

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

//ko.applyBindings(Spank.moodSwings, document.getElementById('moodswings'));

(function() {

	// Refer to: http://www.apple.com/itunes/affiliates/resources/documentation/genre-mapping.html
	var iTmsSubGenres = {
			"Alternative": 20,
			"Rock": 21,
			"Pop": 14,
			"Pop-Rock": 1133,
			"Electronic": 7,
			"Dance": 17,
			"Hip-Hop": 18,
			"Indie Rock": 1004,
			"Adult Alternative": 1144,
			"Techno": 1050,
			"House": 1048
		},
		chartUrls = {
			lastfm_base: "http://ws.audioscrobbler.com/2.0/?api_key=0325c588426d1889087a065994d30fa1&page=1&limit=100&method=#&format=json",
			billboards_base: "http://api.musixmatch.com/ws/1.1/chart.tracks.get?page=1&page_size=100&country=#&f_has_lyrics=0&apikey=316bd7524d833bb192d98be44fe43017&format=jsonp&callback=?",
			itunes_base: "/itunes?country=#&page=1&limit=100&rev=" + SPANKREV,
			itunes_genre_base: "/itunes?genre=#&page=1&limit=100&rev=" + SPANKREV
		},
		chartPlaylistItems = [
			{title: 'last.fm Top', cover: '/img/lastfm.jpg', url: chartUrls.lastfm_base.replace("#","chart.gettoptracks"), refID:"@lastfm-topcharts-all" },
			{title: 'last.fm Loved', cover: '/img/lastfm.jpg', url: chartUrls.lastfm_base.replace("#","chart.getlovedtracks"), refID:"@lastfm-lovedcharts-all" },
			{title: 'last.fm Hyped', cover: '/img/lastfm.jpg', url: chartUrls.lastfm_base.replace("#","chart.gethypedtracks"), refID:"@lastfm-hypedcharts-all" }
		],
		codes = {
			UK: "UK",
			US: "US",
			JP: "Japan",
			DE: "Germany",
			IN: "India",
			AR: "Argentina",
			FR: "France",
			SE: "Sweden",
			ES: "Spain",
			BR: "Brazil",
			RU: "Russia"
		};

	["FR", "DE", "US", "UK"].forEach(function(code) {
		var bUrl = chartUrls.billboards_base.replace("#", code.toLowerCase()),
			bCover = '/img/bill.jpg'.replace("#", code.toLowerCase()),
			bp = {title: 'Billboard ' + codes[code], cover: bCover, url: bUrl, refID:"@musix-billboard-geo-"+code.toLowerCase() };
		chartPlaylistItems.unshift(bp);
	});

	["US", "DE", "FR", "SE", "ES"].forEach(function(code) {
		var iUrl = chartUrls.itunes_base.replace("#", code.toLowerCase()),
			ip = {title: 'iTunes '.concat(codes[code]), cover: '/img/iTunes.jpg', url: iUrl, refID:"@itunes-geo-"+code.toLowerCase() };
		chartPlaylistItems.push(ip);
	});

	$.each(iTmsSubGenres, function(name, code) {
		var data = {title: "iTunes " + name, cover: '/img/iTunes.jpg', url: chartUrls.itunes_genre_base.replace("#",code), refID:"@itunes-genre-"+code };
		chartPlaylistItems.push(data);
	});

	// Get from: http://developer.echonest.com/api/v4/artist/list_genres?api_key=FILDTEOIK2HBORODV&format=json
	var echonestGenres = [
		"Acid House",
		"Alternative Rock",
		"Alternative Dance",
		"Ambient",
		"British Invasion",
		"Britpop",
		"Chill-out",
		"Dance Pop",
		"Dance Rock",
		"Dance-punk",
		"Drum and Bass",
		"Downtempo",
		"Deep House",
		"Dubstep",
		"Electronic",
		"Electro",
		"Electro house",
		"Eurodance",
		"Easy listening",
		"Folk-pop",
		"Folk Rock",
		"Funk Rock",
		"Gangster Rap",
		"Hardcore",
		"Hardcore Techno",
		"Hard Rock",
		"Hip Hop",
		"Indie Folk",
		"Indie Rock",
		"Indie Pop",
		"New Age",
		"Pop",
		"Pop Emo",
		"Pop Punk",
		"Pop Rap",
		"Pop Rock",
		"Post Rock",
		"Progressive Rock",
		"Progressive Trance",
		"Psychedelic Rock",
		"Psychedelic Trance",
		"Punk",
		"R&B",
		"Rap",
		"Rock",
		"Rock 'n Roll",
		"Rock Steady",
		"Stoner Rock",
		"Soft Rock",
		"Techno",
		"Tech House",
		"Turntablism",
		"Trance",
		"Trip Hop",
		"UK Garage",
		"UK Post-punk",
		"Uplifting Trance",
		"Urban Contemporary",
		"Vocal House"
	];

	var discoverDockItems = echonestGenres.map(function(genre) {
		var url = "http://developer.echonest.com/api/v4/playlist/static?api_key=FILDTEOIK2HBORODV&genre=@&format=json&results=100&type=genre-radio&bucket=id:7digital-US&bucket=tracks&page=1",
			genre_lower = genre.toLowerCase();
		url = url.replace("@", encodeURIComponent(genre_lower));
		return {
			title: genre,
			cover: '/img/echo.jpg',
			url: url,
			refID:"@echonest-genre-" + genre_lower.replace(/\W/g,"")
		};
	});

	var f = setInterval(function populateDockItems() {
		try {   // Head.playlists may *not* have been defined yet
			Head.playlists.dockItemsDiscover(discoverDockItems);
			Head.playlists.dockItemsCharts(chartPlaylistItems);
			Head.playlists.randomChart();    // LAUNCH SEQUENCE
			clearInterval(f);
		} catch(e) { /* Keep sucking my dick, bitch */ }
	}, 50);

	Spank.lazyLoadImages = function(containerSelector, res) {
		var document_height = $(document).height() + 200,
			content_top = ko.observable(true), // A dummy we're using to trick thumbSource into evaluating each time we scroll
			re_apple = /\d+x\d+-75/;
		$(containerSelector).scroll(function() {
			content_top(!content_top());
		});
		return function(data, e) {
			var p = content_top(),
				thumbUrl = typeof(data.thumb)==='string' ? data.thumb : data.thumb(),
				thumb;
			if (e.getAttribute("src").match(/grey\.gif/)) {
				if ($(e).offset().top < document_height) {
					if (thumbUrl.match(/7static/)) {
						thumb = thumbUrl.replace(/_200\.jpg/,res._7static);
					} else if (thumbUrl.match(re_apple)) {
						thumb = thumbUrl.replace(re_apple, res._iTunes);
					} else {
						thumb = thumbUrl;
					}
					e.setAttribute("src", thumb);
				}
			}
			return "ok";
		};
	}

})();