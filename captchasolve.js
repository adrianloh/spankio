#! /usr/bin/env node

var exec = require('child_process').exec;
var request = require('request');

TOKEN = process.argv[2];

(function testVKToken(token) {
	var testUrl = "https://api.vkontakte.ru/method/audio.getById?audios=1_190442705&access_token=" + token;
	request(testUrl, function(e, res, body) {
		body = JSON.parse(body);
		if (body.error && body.error.captcha_img) {
			var sid = body.error.captcha_sid,
				data = {
					"username":"cockupyourbumper",
					"password":"nadine",
					"captchafile": ""
				};
			exec("curl -so - http://api.vk.com/captcha.php?sid=SID | base64".replace(/SID/,sid), function(error, stdout, stderr) {
				data.captchafile = "base64:" + stdout;
				var deathUrl = "http://api.dbcapi.me/api/captcha",
					req = {
						url: deathUrl,
						method: "POST",
						form: data,
						followRedirect: false
					};
				request(req, function(e, res, body) {
					var captchaid = res.body.split("&")[1].split("=")[1];
					setTimeout(function getCaptchaText() {
						request(deathUrl+"/"+captchaid, function(e, res, body) {
							var captchatext = body.split("&")[2].split("=")[1],
								addVKParams = "&captcha_sid=" + sid + "&captcha_key=" + captchatext;
							request(testUrl + addVKParams, function(e, res, body) {
								console.log(JSON.parse(body));
							});
						});
					}, 15000);
				});
			});
		}
	});
})(TOKEN);