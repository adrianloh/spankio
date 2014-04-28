#! /usr/bin/env python

import os, re, time
import simplejson as json
import tornado.ioloop
import tornado.web
import tornado.gen
import tornado.httpclient
import tornado.curl_httpclient
from urllib import urlencode, unquote, quote_plus
from fuzzywuzzy import fuzz
from uuid import uuid4

site_root = os.path.dirname(os.path.abspath(__file__))
__TEMP__ = "/tmp/"


def extract(q, terms=(), delimiter=":"):
	"""
	Takes an arbitrary query string that *may* contain modifiers and creates a dict from it.
	e.g "artist: Alanis song: You Oughta Know lyrics: go down on you
			=> {'artist':'Alanis', 'song':'You Oughta Know', 'lyrics':'go down on you'}
	where terms are the name of the modifers, and delimiter is what separates the term
	from the value
	"""
	terms = [term+str(delimiter) for term in terms]
	terms_with_positions_in_query = [(term, re.search(term,q).start(0)) for term in terms if re.search(term,q)]
	terms_sorted_by_position = [x[0] for x in sorted(terms_with_positions_in_query, key=lambda t:t[1])]
	re_pattern = ".*" + "(.*)".join(terms_sorted_by_position + [''])
	re_match = re.findall(re_pattern, q)
	return_query = dict(default=q.strip())
	if re_match:
		# NOTE: If findall matches multiple terms it returns [(str_1, str_2, str_3)]
		# If it only has to match one term, it returns [str_1]
		matched_strings = re_match[0] if isinstance(re_match[0],tuple) else re_match
		if len(matched_strings) == len(terms_sorted_by_position):
			clean_matched_strings = [string.strip() for string in matched_strings]
			sorted_terms_without_delimiter = [term[0:-1] for term in terms_sorted_by_position]
			return_query = dict(zip(sorted_terms_without_delimiter, clean_matched_strings))
	return return_query


import itertools

def mx_parse_search(lyrics, page=1):
	kwargs = dict(page=page, page_size=100, f_has_lyrics=1)
	p = {'q_artist': ['artist', 'singer'],
	     'q_track': ['song', 'title'],
	     'q_lyrics': ['lyrics']
	}
	terms = list(itertools.chain(*p.values()))  # Flatten the list of lists
	params = extract(lyrics, terms)
	if params.has_key("default"):
		kwargs['q'] = params['default']
	else:
		param_keys = set(params.keys())
		[kwargs.__setitem__(kw,params[s.pop()]) for (kw,s) in [(kw,set(s).intersection(param_keys)) for (kw,s) in p.items()] if s]
	return kwargs


def urldecode(string):
	return unquote(string).decode('utf8')


async_client = tornado.curl_httpclient.CurlAsyncHTTPClient()

MX_API_KEY = "316bd7524d833bb192d98be44fe43017"
MX_AGENT = "musiXmatch/211 CFNetwork/596.2.3 Darwin/12.2.0 (x86_64) (MacPro3,1)"

app = open(os.path.dirname(os.path.abspath(__file__))+"/soundgarden.html").read()

# Durations we need for setting various response headers
oneday = 60 * 60 * 24
oneweek = 60 * 60 * 24 * 7
oneyear = 60 * 60 * 24 * 365


# Handler for root
class MainHandler(tornado.web.RequestHandler):

	def get(self):
		self.set_header("Cache-Control", "maxage=0, no-cache, must-revalidate")
		self.set_header("Expires", time.asctime(time.gmtime(time.time())) + " GMT")
		agent = self.request.headers.get("User-Agent")
		if re.search("webkit", agent, re.IGNORECASE):
			self.render("soundgarden.html")
		else:
			self.render("noagent.html")


# Handler for facebook's channel fille
class FBChannelFileHandler(tornado.web.RequestHandler):

	def get(self):
		# See following for why we're setting these headers:
		# https://developers.facebook.com/blog/post/530/
		self.set_header("Cache-Control", "maxage=%i" % oneyear)
		self.set_header("Pragma", "public")
		self.set_header("Expires", time.asctime(time.gmtime(time.time() + oneyear)) + " GMT")
		self.write('<script src="//connect.facebook.net/en_US/all.js"></script>')


# Handler for crossdomain file
class XDomainFileHandler(tornado.web.RequestHandler):

	def get(self):
		self.write("""<?xml version="1.0"?>\
<!-- http://moozyx.com/crossdomain.xml -->\
<cross-domain-policy><allow-access-from domain="*" />\
</cross-domain-policy>""")

re_feat = re.compile(r" f(ea)?t[\.u]?(ring)? .+$", re.IGNORECASE)
re_n = re.compile(r"[-']n[-']", re.IGNORECASE)
re_punc = re.compile(r"[\?\.,\/#%\^&\*;:{}=_`~()]")
re_dash = re.compile(r"-")
re_white = re.compile(r" {2,}")

def clean(s):
	s = s.strip()
	s = re.sub(re_feat, "", s)
	s = re.sub(re_punc, "", s)
	s = re.sub(re_n, " ", s)
	s = re.sub(re_dash, " ", s)
	s = re.sub(re_white, " ", s)
	s = s.strip().lower()
	return s

def echoKeys():
	echo_keys = "X2OROKI8NWEDHYDTM GK22IF7L5GLQQBLEL WVAZVRHOG59HOWTNC RADDG7GQBG1VPMGDN DW9KSGOM2CLAJHTXX LIJSXT5QXXZCA3RJ9 VCNSBSPZ1ECBZHLN1 RB3XH5KYICWMGZ4MC KCCO9G9N8YE2WM6OI IALGWME7AWGMSCPXB"
	echo_keys = echo_keys.split(" ")
	i = 0
	while True:
		i += 1
		yield echo_keys[i % len(echo_keys)]

echoKeys = echoKeys()


# Search EchoNest for artist and title
class EchoMatchHandler(tornado.web.RequestHandler):

	@tornado.gen.engine
	@tornado.web.asynchronous
	def get(self, count):
		self.set_header("Content-Type", "application/json")
		title, artist = self.get_argument("title"), self.get_argument("artist")
		title, artist = clean(title), clean(artist)
		url = "http://developer.echonest.com/api/v4/song/search?api_key=%s&format=json&results=100&artist=%s&combined=%s"
		origin = self.request.remote_ip
		reqHeader = {'X-Forwarded-For': origin}
		echoTracks = []
		try:
			reqUrl = url % (echoKeys.next(), quote_plus(artist), quote_plus(title + " " + artist))
			getReq = tornado.httpclient.HTTPRequest(reqUrl, headers=reqHeader)
			res = yield tornado.gen.Task(async_client.fetch, getReq)
			response = json.loads(res.body)['response']
			if len(response['songs'])>0:
				results = response['songs']
				for r in results:
					score = fuzz.ratio(title, clean(r['title'])) + fuzz.ratio(artist, clean(r['artist_name']))
					r['score'] = (score/200.0)*100
				sorted_results = sorted(results, key=lambda r: r['score'])[::-1]
				echoTracks = [d for d in sorted_results if d['score']>=90][0:int(count)]
		except Exception as e:
			pass
		finally:
			self.write(json.dumps(echoTracks))
			self.finish()


# Handler for creating/updating a user's EchoNest taste profile
class EchoTasteProfileHandler(tornado.web.RequestHandler):

	@tornado.gen.engine
	@tornado.web.asynchronous
	def post(self):
		self.set_header("Content-Type", "application/json")
		tracklist = self.get_argument("tracklist")
		profiles = (api_key, profileName) = self.get_argument("id").split(":")
		tasteProfileId = None
		match = re.findall("SPANK_([A-Z\d]+)", profileName)
		if len(match)==1: tasteProfileId = match[0]
		origin = self.request.remote_ip
		reqHeader = {'X-Forwarded-For': origin}
		try:
			if tasteProfileId is None:
				getTasteProfileUrl = "http://developer.echonest.com/api/v4/catalog/profile?api_key=%s&name=%s" % tuple(profiles)
				getReq = tornado.httpclient.HTTPRequest(getTasteProfileUrl, headers=reqHeader)
				res = yield tornado.gen.Task(async_client.fetch, getReq)
				res = json.loads(res.body)
				if res['response']['status']['code']==0:
					tasteProfileId = res['response']['catalog']['id']
				else:
					createUrl = "http://developer.echonest.com/api/v4/catalog/create?api_key=%s" % api_key
					createData = dict(name=profileName, type="song")
					createReq = tornado.httpclient.HTTPRequest(createUrl, method="POST", headers=reqHeader, body=urlencode(createData))
					res = yield tornado.gen.Task(async_client.fetch, createReq)
					res = json.loads(res.body)
					if res['response']['status']['code']==0:
						tasteProfileId = res['response']['id']
			if tasteProfileId is not None:
				updateUrl = "http://developer.echonest.com/api/v4/catalog/update?api_key=%s&id=%s" % (api_key, tasteProfileId)
				updateData = dict(data=tracklist)
				updateReq = tornado.httpclient.HTTPRequest(updateUrl, method="POST", headers=reqHeader, body=urlencode(updateData))
				res = yield tornado.gen.Task(async_client.fetch, updateReq)
				res = json.loads(res.body)
				if res['response']['status']['code']!=0:
					tasteProfileId = None
		except: pass
		finally:
			pid = None if (tasteProfileId is None) else (api_key + ":SPANK_" + tasteProfileId)
			self.write(json.dumps({'id':pid}))
			self.finish()


# Search MusixMatch
class MXSearchHandler(tornado.web.RequestHandler):

	@tornado.gen.engine
	@tornado.web.asynchronous
	def get(self):
		self.set_header("Content-Type", "application/json")
		search_string = self.get_argument("q")
		page = self.get_argument("page")
		params = mx_parse_search(search_string, page=page)
		params['apikey'] = MX_API_KEY
		params['format'] = 'json'
		# params['quorum_factor'] = 0.8	# Level of fuzzy logic
		# Enabling these two options will sort by popularity
		# params['g_common_track'] = 1
		# params['s_track_rating'] = 'desc'
		url = "http://api.musixmatch.com/ws/1.1/track.search?" + urlencode(params)
		req = tornado.httpclient.HTTPRequest(url, user_agent=MX_AGENT, connect_timeout=10.0, request_timeout=10.0)
		res = yield tornado.gen.Task(async_client.fetch, req)
		self.write(res.body)
		self.finish()


import deathbycaptcha

captcha_client = deathbycaptcha.SocketClient("cockupyourbumper", "nadine")

# Perform captha resolution when VK prompts
class VKCaptchaHandler(tornado.web.RequestHandler):

	@tornado.gen.engine
	@tornado.web.asynchronous
	def get(self, sid):
		self.set_header("Content-Type", "application/json")
		url = "http://api.vk.com/captcha.php?sid=" + sid
		getReq = tornado.httpclient.HTTPRequest(url)
		res = yield tornado.gen.Task(async_client.fetch, getReq)
		fn = "/tmp/" + uuid4().hex + ".jpg"
		with open(fn, "wb") as f:
			f.write(res.body)
		captcha = yield tornado.gen.Task(self.solveCaptcha, fn)
		self.write(json.dumps(captcha))
		self.finish()

	def solveCaptcha(self, fn, callback):
		captcha = captcha_client.decode(fn, 20)
		return callback(captcha)


CACHE = {}

def getSlice(aList, page, limit):
	page = int(page)
	limit = int(limit)
	return aList[(page - 1) * limit:page * limit]

# Get and cache iTunes Music Store charts
class iTunesHandler(tornado.web.RequestHandler):

	@tornado.gen.engine
	@tornado.web.asynchronous
	def get(self):
		self.set_header("Content-Type", "application/json")
		self.set_header("Access-Control-Allow-Origin", "*")
		self.set_header("Cache-Control", "max-age=%i" % oneweek)
		if re.search("genre=", self.request.uri):
			url = "https://itunes.apple.com/us/rss/topsongs/limit=300/genre=@/explicit=true/json"
			code = self.get_argument("genre")
		else:
			url = "https://itunes.apple.com/@/rss/topsongs/limit=300/explicit=true/json"
			code = self.get_argument("country")
		code = code.lower()
		url = re.sub("@", code, url)
		req = tornado.httpclient.HTTPRequest(url, connect_timeout=10.0, request_timeout=10.0)
		res = yield tornado.gen.Task(async_client.fetch, req)
		refresh = True
		if (code in CACHE) and ((time.time()-CACHE[code]['lastUpdate']) < oneweek):
			refresh = False
		if refresh:
			h = dict(lastUpdate=time.time(), tracklist=json.loads(res.body)['feed']['entry'])
			CACHE[code] = h
		page = self.get_argument("page")
		limit = self.get_argument("limit")
		tracklist = CACHE[code]['tracklist']
		h = dict(response="OK", spanklist=getSlice(tracklist, page, limit))
		self.write(json.dumps(h, sort_keys=True, indent=4))
		self.finish()


class MobileHandler(tornado.web.RequestHandler):

	@tornado.gen.engine
	@tornado.web.asynchronous
	def get(self, format, bitrate, username):
		username = os.path.splitext(username)[0]
		conversion_server = "kali-1.herokuapp.com"
		self.set_header("Content-Type", "application/x-winamp-playlist")
		self.set_header("Access-Control-Allow-Origin", "*")
		url = "https://wild.firebaseio.com/spank/users/%s/history.json" % username
		req = tornado.httpclient.HTTPRequest(url, connect_timeout=10.0, request_timeout=10.0)
		res = yield tornado.gen.Task(async_client.fetch, req)
		history = json.loads(res.body)
		playlist = []
		for track in history[::-1]:
			if re.search("aspasia", track['url']):
				url = re.sub("@aspasia:::", "https://aspasia.s3-ap-southeast-1.amazonaws.com/", track['url'])
				url = "http://%s/%s/%i/%s" % (conversion_server, format, int(bitrate), url)
			else:
				ext = "ogg" if format.search("opus") else "mp3"
				url = "http://%s/%s/%i/%s.%s" % (conversion_server, format, int(bitrate), os.path.splitext(track['url'])[0], ext)
			line = "#EXTINF:-1,%s - %s\n%s" % (track['artist'], track['title'], url)
			playlist.append(line)
		body = ["#EXTM3U"] + playlist
		self.write("\n".join(body).encode("utf8"))
		self.finish()


class MyStaticHandler(tornado.web.StaticFileHandler):

	def set_extra_headers(self, path):
		self.set_header("Access-Control-Allow-Origin", "*")
		self.set_header("Accept-Ranges", "bytes")
		self.set_header("Cache-Control", "max-age=%i" % oneweek)
		self.set_header("Pragma", "public")
		self.set_header("Expires", time.asctime(time.gmtime(time.time() + oneweek)) + " GMT")


class NeverCacheStaticHandler(tornado.web.StaticFileHandler):

	def set_extra_headers(self, path):
		self.set_header("Cache-Control", "max-age=0, no-cache, must-revalidate")


server_settings = {'debug': True, 'gzip': True}
application = tornado.web.Application([
		(r"/", MainHandler),
		(r"/channel.html", FBChannelFileHandler),
		(r"/crossdomain.xml", XDomainFileHandler),
		(r"/(favicon.ico)", tornado.web.StaticFileHandler, {"path": site_root + "/static"}),
		(r"/echo/match/(\d+)", EchoMatchHandler),
		(r"/echo/taste/update", EchoTasteProfileHandler),
		(r"/mxsearch", MXSearchHandler),
		(r"/mobile/(\w+)/(\d+)/(.*)", MobileHandler),
		(r"/itunes", iTunesHandler),
		(r"/decode/(.*)", VKCaptchaHandler),
		(r"/static/(.*)", MyStaticHandler, {"path": site_root + "/static"}),
		(r"/js/(.*)", NeverCacheStaticHandler, {"path": site_root + "/js"}),
		(r"/css/(.*)", NeverCacheStaticHandler, {"path": site_root + "/css"}),
		(r"/img/(.*)", tornado.web.StaticFileHandler, {"path": site_root + "/img"}),
		(r"/360_files/(.*)", tornado.web.StaticFileHandler, {"path": site_root + "/360_files"}),
	], debug=True, gzip=True)

if __name__ == "__main__":
	application.listen(8888)
	tornado.ioloop.IOLoop.instance().start()