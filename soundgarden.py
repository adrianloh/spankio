#! /usr/bin/env python

import os, sys, re, time
import simplejson as json
import tornado.ioloop
import tornado.web
import tornado.gen
import tornado.httpclient
import tornado.curl_httpclient
from urllib2 import urlopen, Request
from urllib import urlencode, unquote
from hashlib import md5

def extract(q, terms=(), delimiter=":"):
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

def mx_parse_search(lyrics, page=1):
	kwargs = dict(page=page, page_size=100, f_has_lyrics=1)
	p = {}
	p['q_artist'] = ['artist','singer']
	p['q_track'] =['song','title']
	p['q_lyrics'] =['lyrics']
	import itertools
	terms = list(itertools.chain(*p.values()))
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

VK_ACCESS_TOKEN = "b63e1d33bf6561b4bf6561b4b9bf4e0dd1bbf65bf6b5dabefccf0d187e2dbaa4ac0b03e"

class MainHandler(tornado.web.RequestHandler):

	def get(self):
		self.render("soundgarden.html", username="Welcome!")

class UsersHandler(tornado.web.RequestHandler):

	def get(self, username):
		self.render("soundgarden.html", username=username)

db_base = "http://onurknz.iriscouch.com/soundgarden/"
class PlaylistHandler(tornado.web.RequestHandler):

	@tornado.gen.engine
	@tornado.web.asynchronous
	def get(self, s):
		self.set_header("Content-Type", "application/json")
		s = s.split("@")
		username, playlist = s[0], s[-1]
		library = {'rev':0, 'playlist':[]}
		url = db_base + username + "_playlist_" + playlist
		try:
			res = yield tornado.gen.Task(async_client.fetch, url, method="GET", connect_timeout=10.0, request_timeout=10.0)
			res = json.loads(res.body)
			if res.has_key("playlist"):
				library['playlist'] = res['playlist']
				library['rev'] = res['_rev']
		except Exception as e:
			print e
		finally:
			self.write(json.dumps(library))
			self.finish()

	@tornado.gen.engine
	@tornado.web.asynchronous
	def put(self, s):
		s = s.split("@")
		user, playlist_name = s[0], s[-1]
		playlist = json.loads(self.get_argument("playlist"))
		url = db_base + user + "_playlist_" + playlist_name
		body = {'playlist':playlist[::-1]}
		rev = self.get_argument("rev")
		if rev != "0": body['_rev'] = rev
		time.sleep(3)
		res = yield tornado.gen.Task(async_client.fetch, url, body=json.dumps(body), method="PUT", connect_timeout=10.0, request_timeout=10.0)
		self.write(res.body)
		self.finish()

MX_AGENT = {'User-Agent':"musiXmatch/211 CFNetwork/596.2.3 Darwin/12.2.0 (x86_64) (MacPro3,1)"}
MX_API_KEY = "316bd7524d833bb192d98be44fe43017"

class MXSearchHandler(tornado.web.RequestHandler):

	@tornado.gen.engine
	@tornado.web.asynchronous
	def get(self, o):
		self.set_header("Content-Type", "application/json")
		data = json.loads(urldecode(o))
		search_string = data['q']
		page = data['page']
		params = mx_parse_search(search_string, page=page)
		params['apikey'] = MX_API_KEY
		params['format'] = 'json'
		# Enabling these two options will sort by popularity
		#params['g_common_track'] = 1
		#params['s_track_rating'] = 'desc'
		url = "http://api.musixmatch.com/ws/1.1/track.search?" + urlencode(params)
		req = tornado.httpclient.HTTPRequest(url, headers=MX_AGENT, connect_timeout=10.0, request_timeout=10.0)
		res = yield tornado.gen.Task(async_client.fetch, req)
		self.write(res.body)
		self.finish()

class MXLyricsHandler(tornado.web.RequestHandler):

	@tornado.gen.engine
	@tornado.web.asynchronous
	def get(self, mx_track_id):
		self.set_header("Content-Type", "application/json")
		params = {}
		params['apikey'] = MX_API_KEY
		params['format'] = 'json'
		params['track_id'] = mx_track_id
		url = "http://api.musixmatch.com/ws/1.1/track.lyrics.get?" + urlencode(params)
		req = tornado.httpclient.HTTPRequest(url, headers=MX_AGENT, connect_timeout=10.0, request_timeout=10.0)
		res = yield tornado.gen.Task(async_client.fetch, req)
		self.write(res.body)
		self.finish()

CHUNK_SIZE = 512000
class VKSongByIdHandler(tornado.web.RequestHandler):

	@tornado.web.asynchronous
	@tornado.gen.engine
	def get(self, owner_aid):
		# owner_id is the string "/tracksearch/ownerid_aid.mp3"
		q = os.path.splitext(owner_aid)[0]
		params = dict(access_token=VK_ACCESS_TOKEN, audios=q)
		agent = {'User-Agent': "com.r2soft.VKontakteMusic/1010 (unknown)"}
		req = tornado.httpclient.HTTPRequest("https://api.vkontakte.ru/method/audio.getById", method="POST", body=urlencode(params), headers=agent, connect_timeout=10.0, request_timeout=10.0)
		response = yield tornado.gen.Task(async_client.fetch, req)
		tracks = json.loads(response.body)
		tracks = tracks['response']
		if len(tracks)>0:
			self.redirect("/track/"+tracks[0]['url'])

class VKSongHandler(tornado.web.RequestHandler):

	@tornado.web.asynchronous
	@tornado.gen.engine
	def get(self, owner_aid, filename=None):
		self.set_header("Content-Type", "audio/mpeg")
		if not filename:
			filename = os.path.split(owner_aid)[-1]
		self.set_header("Content-Disposition","attachment; filename=%s" % filename)
		req = tornado.httpclient.HTTPRequest(url=owner_aid, header_callback=self.header_callback, streaming_callback=self.streaming_callback)
		try:
			yield tornado.gen.Task(async_client.fetch, req)
			self.finish()
		except IOError, AssertionError:
			pass

	def header_callback(self, data):
		if re.search(r"Content-Length", data):
			self.set_header("Content-Length",re.findall("\d+", data)[0])
			self.flush()

	def streaming_callback(self, data):
		if not self.request.connection.stream.closed():
			self.write(data)
			self.flush()

class VKSearchHandler(tornado.web.RequestHandler):

	@tornado.gen.engine
	@tornado.web.asynchronous
	def get(self, search_string):
		err_response = json.dumps(dict(error=True, response=[]))
		try:
			search_string = urldecode(search_string)
			self.set_header("Content-Type", "application/json")
			params = dict(access_token=VK_ACCESS_TOKEN, q=search_string.encode("utf-8"), count=100)
			data = urlencode(params)
			agent = {'User-Agent': "com.r2soft.VKontakteMusic/1010 (unknown)"}
			req = tornado.httpclient.HTTPRequest("https://api.vkontakte.ru/method/audio.search", method="POST", body=data, headers=agent, connect_timeout=10.0, request_timeout=10.0)
			response_tracks = yield tornado.gen.Task(async_client.fetch, req)
			response = json.loads(response_tracks.body)
			results_total = int(response['response'][0])
			if results_total>0:
				owner_aids = ",".join(["%s_%s"%(song['owner_id'], song['aid']) for song in response['response'][1:]])
				params = dict(access_token=VK_ACCESS_TOKEN, audios=owner_aids)
				data = urlencode(params)
				req = tornado.httpclient.HTTPRequest("https://api.vkontakte.ru/method/audio.getById", method="POST", body=data, headers=agent, connect_timeout=10.0, request_timeout=10.0)
				response = yield tornado.gen.Task(async_client.fetch, req)
				self.write(response.body)
			else:
				self.write(err_response)
		except:
			self.write(err_response)
		finally:
			self.finish()

# Works, but the browser-side is slow as fuck. Also keep as
# an example on how to do chunked tranfers
class VKSearchHandlerAsyncChunked(tornado.web.RequestHandler):

	@tornado.gen.engine
	@tornado.web.asynchronous
	def get(self, search_string):
		search_string = urldecode(search_string)
		self.set_header("Content-Type", "application/x-javascript")
		self.set_header("Tranfer-Encoding", "chunked")
		self.results = []
		url = "https://api.vkontakte.ru/method/audio.search"
		data = urlencode(dict(access_token=VK_ACCESS_TOKEN, q=search_string.encode("utf-8"), count=200))
		t1 = time.time()
		results = yield tornado.gen.Task(async_client.fetch, url, method="POST", body=data)
		print time.time()-t1
		self.parse_results(results)

	def parse_results(self, response):
		res = {'message':'VK service not available'}
		results = []
		response = json.loads(response.body)
		if response.has_key("error"):
			results_total = -1
			print response['error']
		else:
			results_total = response['response'][0]
		try:
			if results_total<0:	raise RuntimeError
			elif results_total:
				results = response['response'][1:]
				res['message'] = 'Found %i tracks' % len(results)
			else:
				res['message'] = "No downloads available from VK."
		except Exception as e: print e
		finally:
			self.results = results # So that #sendRows can see this
			self.write(json.dumps(res)+"\n")
			self.flush()
			if results_total>1:
				self.main_loop = tornado.ioloop.IOLoop.instance()
				self.scheduler = tornado.ioloop.PeriodicCallback(self.async_callback(self.sendRows), 10, io_loop = self.main_loop)
				self.scheduler.start()
			else:
				self.finish()

	def sendRows(self):
		if self.request.connection.stream.closed():
			self.scheduler.stop()
			self.scheduler = None
		else:
			try:
				if len(self.results)>0:
					song = self.results.pop()
					h = dict(aid=song['aid'], title=song['title'].encode('utf-8'), artist=song['artist'].encode('utf-8'), url=song['url'])
					self.write(json.dumps(h)+"\n")
					self.flush()
				else:
					self.finish()
			except: pass

site_root = os.path.dirname(os.path.abspath(__file__))
application = tornado.web.Application([
	(r"/", MainHandler),
	(r"/users/(.*)", UsersHandler),
	(r"/playlist/(.*)", PlaylistHandler),
	(r"/mxsearch/(.*)", MXSearchHandler),
	(r"/lyrics/([0-9]+)", MXLyricsHandler),
	(r"/vksearch/(.*)", VKSearchHandler),
	(r"/track/(.*)", VKSongHandler),
	(r"/tracksearch/(.*)", VKSongByIdHandler),
	(r"/static/(.*)", tornado.web.StaticFileHandler, {"path": site_root}),
	(r"/js/(.*)", tornado.web.StaticFileHandler, {"path": site_root+"/js"}),
	(r"/css/(.*)", tornado.web.StaticFileHandler, {"path": site_root+"/css"}),
	(r"/img/(.*)", tornado.web.StaticFileHandler, {"path": site_root+"/img"}),
	(r"/TotalControl/(.*)", tornado.web.StaticFileHandler, {"path": site_root+"/TotalControl"}),
	(r"/360player/(.*)", tornado.web.StaticFileHandler, {"path": site_root+"/360player"}),
	])

if __name__ == "__main__":
	if "OPENSHIFT_INTERNAL_IP" in os.environ:
		address = os.environ['OPENSHIFT_INTERNAL_IP']
		port = os.environ['OPENSHIFT_INTERNAL_PORT']
		application.listen(port, address=address)
	else:
		application.listen(8888)
	tornado.ioloop.IOLoop.instance().start()


