window.fbAsyncInit = function checkFacebookStatus() {
	// init the FB JS SDK

	var production_settings = {
		appId      : '412279742177294', // App ID from the App Dashboard
		channelUrl : '//spank.io/channel.html', // Channel File for x-domain communication
		status     : true, // check the login status upon init?
		cookie     : true, // set sessions cookies to allow your server to access the session?
		xfbml      : true  // parse XFBML tags on this page?
	};

	var dev_settings = {
		appId      : '	573967942630120', // App ID from the App Dashboard
		channelUrl : '//xerxes.local:8888/channel.html', // Channel File for x-domain communication
		status     : true, // check the login status upon init?
		cookie     : true, // set sessions cookies to allow your server to access the session?
		xfbml      : true  // parse XFBML tags on this page?
	};

	var settings = {
		"spank.io": production_settings,
		"xerxes.local:8888": dev_settings
	};

	FB.init(settings[window.location.host]);

	function initFB(response) {
		// Refer to:
		// http://developers.facebook.com/docs/reference/javascript/FB.getLoginStatus/
		FB.api('/me', function(info) {
			FBUserInfo = info;
			if (FBUserInfo.username==='') {
				FBUserInfo.username = FBUserInfo.id;
			}
//			FBUserInfo.username = "sun.k.weng";
			FBUserInfo.accessToken = response.authResponse.accessToken;
			$("#fb-login").hide();
			$(document).trigger("login");
			var q = "SELECT name,username,uid FROM user WHERE uid in (SELECT uid2 FROM friend WHERE uid1=me()) and is_app_user='1'";
			FB.api('fql',{q:q}, function(res) {
				FBUserInfo.spankingFriends = res;
				localStorage.spank = JSON.stringify(FBUserInfo);
			});
		});
	}

	function updateButton(response) {
		var loginTimeout = setTimeout(function(){
			if (typeof(FBUserInfo)==='undefined' && typeof(localStorage.spank)==='string') {
				FBUserInfo = JSON.parse(localStorage.spank);
				$(document).trigger("login");
			}
			clearTimeout(loginTimeout);
		},5000);
		var button = document.getElementById('fb-auth');
		if (response.status === 'connected') {
			//user is already logged in and connected
			initFB(response);
			button.innerHTML = 'Logout';
			button.onclick = function() {
				FB.logout(function(response) {
					$(document).trigger("logout");
					FB_userInfo = null;
					document.location.reload(true);
				});
			};
		} else {
			clearTimeout(loginTimeout);
			$("#fb-login").show();
			//user is not connected to your app or logged out
			button.innerHTML = 'Login';
			button.onclick = function() {
				FB.login(function(response) {
					if (response.status === 'connected') {
						initFB(response);
					} else {
						//user cancelled login or did not grant authorization
						console.log("User cancelled login/authorization.");
					}
				}, {scope:'email, publish_stream'});
			};
		}
	}
	$('<button id="fb-auth" style="display: none;">Login</button>').appendTo("#searchForm"); // Keep this button around for debug
	$('<div id="fb-login" class="fb-login-button" data-show-faces="false" data-width="200" data-max-rows="1" scope="email, read_friendlists, publish_stream"></div>').appendTo("#searchForm");
	// run once with current status and whenever the status changes
	FB.getLoginStatus(updateButton);
	FB.Event.subscribe('auth.statusChange', updateButton);
};

(function(d, debug){
	var js, id = 'facebook-jssdk', ref = d.getElementsByTagName('script')[0];
	if (d.getElementById(id)) {return;}
	js = d.createElement('script'); js.id = id; js.async = true;
	js.src = "//connect.facebook.net/en_US/all" + (debug ? "/debug" : "") + ".js";
	ref.parentNode.insertBefore(js, ref);
}(document, /*debug*/ false));