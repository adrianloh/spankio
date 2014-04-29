#! /usr/local/bin/casper

Array.prototype.pick = function (i) {
	return this.splice(i >= 0 ? i : Math.random() * this.length | 0, 1)[0];
};

var x = require('casper').selectXPath;
var casper = require('casper').create({
    logLevel: "info",              // Only "info" level messages will be logged
    onError: function(self, m) {   // Any "error" level message will be written
        console.log('FATAL:' + m); // on the console output and PhantomJS will
        self.exit();               // terminate
    },
    pageSettings: {
        loadImages:  false
    }
});

casper.userAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_3) AppleWebKit/537.31 (KHTML, like Gecko) Chrome/26.0.1410.65 Safari/537.31");

var apps = [2883733, 2845797, 3426738, 3397121, 3440393, 2886050, 2234333, 2020214, 3027476, 2887851, 3075287, 2386311, 2045168, 3080847, 2731649, 2954796, 3169215, 3245218, 2795250, 3312454, 3262348, 2182689, 3216201, 3309357, 2843514, 1921008, 2438613, 2902378, 1915108, 3389929];
var users = "60123665629:nadine 60162100638:nadine 60126021662:d81121105b 60123574155:asdzxc 60133331633:nadine 60122059190:nadine".split(" ");

//appid = casper.cli.options['appid'];
//login = casper.cli.options['login'];

appid = apps.pick();
login = users.pick();

username = login.split(":")[0];
password = login.split(":")[1];

url = "http://oauth.vk.com/oauth/authorize?client_id=APPID&redirect_uri=http%3A%2F%2Foauth.vk.com%2Fblank.html&response_type=token&scope=78862&state=&display=page";
url = url.replace("APPID", appid);
casper.start(url, function() {
	this.sendKeys(x('//input[@name="email"]'), username);
	this.sendKeys(x('//input[@name="pass"]'), password);
	this.click('#install_allow');
});

var output;

casper.then(function() {
	var title = this.getTitle();
	if (title.match(/blank/i)) {
		output = this.getCurrentUrl();
	} else if (title.match(/request/i)) {
		this.click('#install_allow');
	}
});

casper.then(function() {
	if (typeof(output)!=='string') {
		output = this.getCurrentUrl();
	}
});

casper.then(function() {
	if (typeof(output)==='string') {
		var m = output.match(/.*access_token=(.+)&expires_in=(\d+)&user_id=(.+)/);
		if (m) {
			this.echo("OK " + m[1] + " " + m[3] + " " + m[2], "INFO");
		} else {
			this.echo("FAIL " + appid + " " + username, "ERROR");
		}
	}
});

casper.run();









