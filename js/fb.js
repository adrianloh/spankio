window.fbAsyncInit = function() {
	// init the FB JS SDK
	FB.init({
		appId      : '	412279742177294', // App ID from the App Dashboard
		channelUrl : '//spank.io/channel.html', // Channel File for x-domain communication
		status     : true, // check the login status upon init?
		cookie     : true, // set sessions cookies to allow your server to access the session?
		xfbml      : true  // parse XFBML tags on this page?
	});

	function initFB(response) {
		// Refer to:
		// http://developers.facebook.com/docs/reference/javascript/FB.getLoginStatus/
		FB.api('/me', function(info) {
			FB_userInfo = info;
			console.log(FB_userInfo);
			FB_userInfo.accessToken = response.authResponse.accessToken;
			$("#fb-login").hide();
			$(document).trigger("login");
		});
	}

	function updateButton(response) {
		var button       =   document.getElementById('fb-auth');
		if (response.status === 'connected') {
			//user is already logged in and connected
			initFB(response);
			button.innerHTML = 'Logout';
			button.onclick = function() {
				FB.logout(function(response) {
					$(document).trigger("logout");
					FB_userInfo = null;
				});
			};
		} else {
			$("#fb-login").show();
			//user is not connected to your app or logged out
			button.innerHTML = 'Login';
			button.onclick = function() {
				FB.login(function(response) {
					if (response.status === 'connected') {
						initFB(response);
					} else {
						//user cancelled login or did not grant authorization
						alert("Aiks!");
					}
				}, {scope:'email, read_friendlists, publish_stream'});
			}
		}
		//$('<iframe src="/static/index3.html"></iframe>').appendTo("body");
	}
//	$('<button id="fb-auth">Login</button>').appendTo("#searchForm");
	$('<div id="fb-login" class="fb-login-button" data-show-faces="false" data-width="200" data-max-rows="1"></div>').appendTo("#searchForm");
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