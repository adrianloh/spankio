/*global $, FB */

Spank.vkTokens = [
	"3ad019d3028e29cef3bc4809b3e78f38b8811cec7e50ad478f63a7a6d690f9a6f13d08d6fbecd5e1fe49f",
	"d7125fb025264a7e8f1107789d332c23901af26b82e25be5c0e05f32e401dd4a330cc7781e9ad79585e18",
	"8814974a7e5487011dc9fcef8554dfc948f2e8ae2453dda138a3f390ab5193dd541463013988d7070953c"
];

function checkVK() {
	var q = "https://api.vkontakte.ru/method/audio.getById?audios=-156990599_907d6c68fd78",
		url = q + "&access_token=" + Spank.vkTokens[0],
		tries = 0;
	(function testVK(url) {
		$.getJSON(url + "&callback=?", function(res) {
			var sid, retryUrl;
			//res.error = {'captcha_sid':961373820056};
			if (res.hasOwnProperty("error") && tries<=2) {
				sid = res.error.captcha_sid;
				console.warn("Authenticating VK captcha: sid " + sid);
				$.getJSON("/decode/" + sid, function(res) {
					if (res!==null && res.hasOwnProperty('text')) {
						retryUrl = url + "&captcha_sid=SID&captcha_key=TEXT".replace(/SID/, sid).replace(/TEXT/, res.text);
						tries+=1;
						testVK(retryUrl);
					} else {
						console.error("ERROR: VK Authentication failed.")
					}
				});
			} else if (tries>2) {
				console.error("ABORT: VK Authentication failed.")
			} else {
				console.log("OK: VK Authentication");
			}
		});
	})(url);
}

var FBUserInfo = null;

// The global switch, when set to True, will shutdown Spank for all users
var shutdown = new Firebase("https://wild.firebaseio.com/spank/shutdown");

function initApp(info) {
	FBUserInfo = info;
	shutdown.on("value", function(snapshot) {
		var isTrue = snapshot.val();
		if (isTrue && !window.location.host.match(/8888/)) {
			$("#applicationBody").hide();
			$("h2").show();
			$("#fb-login").hide();
			$("#loginFacade").css("background","url(/img/loginpics/1.jpg)").show();
		} else {
			$("h2").hide();
			$("#fb-login").show();
			$("#loginFacade").addClass("flipper");
			setTimeout(function() {
				$("#loginFacade").removeClass("flipper").hide();
			}, 2000);
			$("#applicationBody").show();
			var q = "SELECT name,username,uid FROM user WHERE uid in (SELECT uid2 FROM friend WHERE uid1=me()) and is_app_user='1'";
			if (typeof(FB)!=='undefined') {
				FB.api('fql',{q:q}, function(res) {
					FBUserInfo.friends = res.data;
					$(document).trigger("login");
					localStorage.spank = JSON.stringify(FBUserInfo);
				});
			} else {
				$(document).trigger("login");
			}
		}
	});
}

window.fbAsyncInit = function checkFacebookStatus() {
	// init the FB JS SDK

	var domain = window.location.host,
		get_settings = function(url, isProduction) {
			var appId = isProduction ? '412279742177294' : '573967942630120';
			return {
				appId      : appId, // App ID from the App Dashboard
				channelUrl : '//' + url + '/channel.html',
				status     : true, // check the login status upon init?
				cookie     : true, // set sessions cookies to allow your server to access the session?
				xfbml      : true  // parse XFBML tags on this page?
			};
		},
		isProduction = (["spank.io", "moozyx.com"].indexOf(domain) >= 0),
		settings = get_settings(domain, isProduction);

	FB.init(settings);

	function initFB(response) {
		// Refer to: http://developers.facebook.com/docs/reference/javascript/FB.getLoginStatus
		FB.api('/me', function(info) {
			if (info.username==='') {
				info.username = info.id;
			}
			//	FBUserInfo.username = "sam_beckett_92102";      // Login as another user
			info.accessToken = response.authResponse.accessToken;
			initApp(info);
		});
	}

	$("#fb-login").click(function() {
		FB.login(function(response) {
			if (response.status === 'connected') {
				initFB(response);
			} else {
				//user cancelled login or did not grant authorization
				console.log("User cancelled login/authorization.");
			}
		}, {scope:'email, publish_stream'});
	});

	var fblogout = function() {
		FB.logout(function(response) {
			$(document).trigger("logout");
			FBUserInfo = null;
			document.location.reload(true);
		});
	};

	function updateButton(response) {
		if (response.status === 'connected') {
			//user is already logged in and connected
			initFB(response);
		} else {
			shutdown.on("value", function(snapshot) {
				var isTrue = snapshot.val();
				if (isTrue && !window.location.host.match(/8888/)) {
					$("h2").show();
					$("#loginFacade").css("background","url(/img/loginpics/1.jpg)").show();
					$("#fb-login").hide();
				} else {
					$("h2").hide();
					$("#fb-login").show();
					$("#loginFacade").css("background","url(/img/loginpics/1.jpg)").show();
				}
			});
		}
	}

	// run once with current status and whenever the status changes
	FB.getLoginStatus(updateButton);
	FB.Event.subscribe('auth.statusChange', updateButton);

};

(function start(d, debug){
	if (localStorage.hasOwnProperty("spank")) {
		var info = JSON.parse(localStorage.spank);
		if (typeof(info.last_update)==='undefined' || (Date.now()-info.last_update)/1000>86400) {
			delete localStorage.spank;
			start(d, debug);
		} else {
			initApp(info);
		}
	} else {
		var js, id = 'facebook-jssdk', ref = d.getElementsByTagName('script')[0];
		if (d.getElementById(id)) {return;}
		js = d.createElement('script'); js.id = id; js.async = true;
		js.src = "//connect.facebook.net/en_US/all" + (debug ? "/debug" : "") + ".js";
		ref.parentNode.insertBefore(js, ref);
	}
}(document, /*debug*/ false));