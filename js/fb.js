/*global $, FB */

var FBUserInfo = null;
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
					FBUserInfo.last_update = Date.now();
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

	var settings = {},
		get_settings = function(url, development) {
			var appId = development ? '573967942630120' : '412279742177294';
			return {
				appId      : appId, // App ID from the App Dashboard
				channelUrl : '//' + url + '/channel.html',
				status     : true, // check the login status upon init?
				cookie     : true, // set sessions cookies to allow your server to access the session?
				xfbml      : true  // parse XFBML tags on this page?
			};
		};

	["spank.io", "moozyx.com"].forEach(function(url) {
		settings[url] = get_settings(url, false);
	});

	["xerxes.local:8888", "prometheus.local:8888"].forEach(function(url) {
		settings[url] = get_settings(url, true);
	});

	FB.init(settings[window.location.host]);

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