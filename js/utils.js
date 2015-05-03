/*global document, Head, window, Spank, ko */

String.prototype.title = function(){
	return this.replace( /(^|\s)([a-z])/g , function(m,p1,p2){ return p1+p2.toUpperCase(); } );
};

Spank.utils = {};

Spank.utils.normalizeMXData = function(mxTrack) {
	var mx = {};
	if (mxTrack.album_name.length>0 && (mxTrack.album_name!==mxTrack.track_name)) mx.album = mxTrack.album_name;
	mx.thumb = mxTrack.album_coverart_350x350 ? mxTrack.album_coverart_350x350 : Spank.genericAlbumArt;
	mx.mxid_track = mxTrack.track_id;
	mx.mxid_artist = mxTrack.artist_id;
	mx.mxid_album = mxTrack.album_id;
	if (mxTrack.track_mbid!==null && mxTrack.track_mbid.length>0) mx.mbid_track = mxTrack.track_mbid;
	if (mxTrack.artist_mbid!==null && mxTrack.artist_mbid.length>0) mx.mbid_artist = mxTrack.artist_mbid;
	return mx;
};

Spank.utils.attachEchoMetadata = function(snapshot, echoTrack) {
	snapshot.echoid_track = echoTrack.id;
	snapshot.echoid_artist = echoTrack.artist_id;
};

Spank.utils.lazyLoadImages = function(containerSelector, res) {
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
};

Spank.utils.shuffle = function(array) {
	var i=array.length,
		newArray = array.slice(0, i),
		p,
		t;
	while (i--) {
		p = Math.floor(Math.random()*i);
		t = newArray[i];
		newArray[i]=newArray[p];
		newArray[p]=t;
	}
	return newArray;
};

Spank.utils.stripToLowerCase = function(string) {
	return $.trim(string.toLowerCase());
};

Spank.utils.pick_random = function(array) {
	return array[Math.floor(Math.random() * array.length)];
};

Spank.utils.randrange = function(minVal,maxVal,floatVal) {
	var randVal = minVal+(Math.random()*(maxVal-minVal));
	return typeof floatVal=='undefined'?Math.round(randVal):randVal.toFixed(floatVal);
};

Spank.utils.wobble = function(elem, min, max) {
	var rotate = "rotate(#deg)".replace("#", Spank.utils.randrange(min,max));
	$(elem).css("webkit-transform",rotate).removeClass("unwobbled");
};

Spank.utils.padToFour = function(number) {
	if (number<=9999) { number = ("000"+number).slice(-4); }
	return number;
};

Spank.utils.randomHexColor = function() {
	return '#' + ('000000' + Math.floor(Math.random() * 0xFFFFFF).toString(16)).substr(-6);
//	return '#'+(Math.random().toString(16) + '000000').slice(2, 8);
};

USERNAME_LOOKUP = {
	682921200: "restbeckett"
};

Spank.utils.toFirebaseName = function(name) {
	if (typeof(name)==='number') {
		name = USERNAME_LOOKUP[name];
	}
	name = USERNAME_LOOKUP[name];
	return name.replace(/[\.#\$\[\]]/g,"_");
};

Spank.utils.guid = function() {
	var S4 = function () {
		return Math.floor(
			Math.random() * 0x10000 /* 65536 */
		).toString(16);
	};
	return (
		S4() + S4() + "-" +
			S4() + "-" +
			S4() + "-" +
			S4() + "-" +
			S4() + S4() + S4()
	);
};

Spank.utils.levenshtein = function(s, t) {
	var lim = 9999999;
	if (Math.abs(s.length - t.length) > lim) return 9999999;

	var d = []; //2d matrix
	// Step 1
	var n = s.length,
		m = t.length;

	if (n == 0) return m;
	if (m == 0) return n;

	var i = n + 1;
	do {
		d[i] = [];
	} while (i--);

	// Step 2
	i = n + 1, j = m + 1;
	do {
		d[i][0] = i;
	} while (i--);
	do {
		d[0][j] = j;
	} while (j--);

	// Step 3
	for (var i = 1; i <= n; i++) {
		var s_i = s.charAt(i - 1);

		// Step 4
		for (var j = 1; j <= m; j++) {

			//Check the jagged ld total so far
			if (i == j && d[i][j] > 4) return n;

			var t_j = t.charAt(j - 1);
			var cost = (s_i == t_j) ? 0 : 1; // Step 5
			//Calculate the minimum
			var mi = d[i - 1][j] + 1;
			var b = d[i][j - 1] + 1;
			var c = d[i - 1][j - 1] + cost;

			if (b < mi) mi = b;
			if (c < mi) mi = c;

			d[i][j] = mi; // Step 6
		}
	}
	// Step 7
	return d[n][m];
};

Spank.utils.similarArtistAndTitle = function(o1, o2) {
	var strip = Spank.utils.stripToLowerCase,
		o1_artist = strip(o1.artist),
		o2_artist = strip(o2.artist),
		o1_title = strip(o1.title),
		o2_title = strip(o2.title);
	return o1_artist===o2_artist && o1_title===o2_title;
};

Spank.utils.hasSameTrackIds = function(o1, o2) {
	var props = ['echoid_track', 'mbid_track', 'itms_track', 'mxid_track'],
		same = false;
	props.forEach(function(p) {
		if (!same) {
			same = (o1.hasOwnProperty(p) && o2.hasOwnProperty(p) && o1[p]===o2[p])
		}
	});
	return same;
};