#! /usr/bin/env python

import os
import re
import json
import time
from urllib import urlopen

apps = [2883733, 2845797, 3426738, 3397121, 3440393, 2886050, 2234333, 2020214, 3027476, 2887851, 3075287, 2386311, 2045168, 3080847, 2731649, 2954796, 3169215, 3245218, 2795250, 3312454, 3262348, 2182689, 3216201, 3309357, 2843514, 1921008, 2438613, 2902378, 1915108, 3389929]
#users = "60123665629:nadine 60162100638:nadine 60126021662:d81121105b 60123574155:asdzxc 60133331633:nadine 60122059190:nadine"
users = "60123665629:nadine"
users = users.split(" ")
site_root = os.path.dirname(os.path.abspath(__file__))
cmd = """casperjs --ignore-ssl-errors=yes %s --appid=%s --login=%s 2>/dev/null"""
url = "https://api.vkontakte.ru/method/audio.search?q=madonna&access_token=%s&count=1"

refresh_script = site_root + "/vkrefresh.js"
token_file = site_root + "/vktokens.txt"

def savetoken(token):
	with open(token_file, "a") as f:
		f.write(token + "\n")

def cleartokens():
	with open(token_file, "w") as f:
		f.write("")

def loadtokens():
	if os.path.exists(token_file):
		return [t.strip() for t in open(token_file).read().split("\n") if len(t.strip())>0]
	else:
		return []

def killcaptcha(_access_token):
	_ok = False
	captchasolve = site_root + "/captchasolve.js"
	_stdout = os.popen("node %s %s" % (captchasolve, _access_token)).read().strip()
	if re.search("Maguire", _stdout):
		_ok = True
	return _ok

def testtoken(_access_token):
	_ok = True
	res = json.loads(urlopen(url % _access_token).read())
	if res.has_key("error") and res['error'].has_key('captcha_sid'):
		print "CAPTCHA %s" % _access_token
		_ok = killcaptcha(_access_token)
	elif res.has_key("error"):
		_ok = False
		print "ERROR %s" % _access_token
		print res
	else: pass
	return _ok

old_tokens = loadtokens()

cleartokens()

for token in old_tokens:
	if testtoken(token): savetoken(token)

for app_id in apps:
	for user in users:
		cmd1 = cmd % (refresh_script, str(app_id), user)
		stdout = os.popen(cmd1).read().strip()
		print stdout
		if re.search("OK", stdout):
			cols = stdout.split(" ")
			access_token = cols[1]
			if testtoken(access_token):
				savetoken(access_token)
				print access_token