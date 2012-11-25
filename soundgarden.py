#! /usr/bin/env python

import os, re, time
import json
import tornado.ioloop
import tornado.web
import tornado.gen
import tornado.httpclient
import tornado.curl_httpclient
from urllib import urlencode, unquote
import tornadoredis

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

config = dict(host="pikachu.ec2.myredis.com", port=6449, password="mavN3nb59XyRTfmJtu", selected_db=0)
RED = tornadoredis.Client(**config)
RED.connect()

async_client = tornado.curl_httpclient.CurlAsyncHTTPClient()

VK_ACCESS_TOKEN = "b63e1d33bf6561b4bf6561b4b9bf4e0dd1bbf65bf6b5dabefccf0d187e2dbaa4ac0b03e"
VK_AGENT = "com.r2soft.VKontakteMusic/1010 (unknown)"
MX_API_KEY = "316bd7524d833bb192d98be44fe43017"
MX_AGENT = "musiXmatch/211 CFNetwork/596.2.3 Darwin/12.2.0 (x86_64) (MacPro3,1)"
DB_BASE = "http://onurknz.iriscouch.com/soundgarden/"

class MainHandler(tornado.web.RequestHandler):

	def get(self):
		self.render("soundgarden.html", username="Welcome!")

class UsersHandler(tornado.web.RequestHandler):

	def get(self, username):
		self.render("soundgarden.html", username=username)

class FBChannelFileHandler(tornado.web.RequestHandler):

	def get(self, username):
		self.write('<script src="//connect.facebook.net/en_US/all.js"></script>')

class TestHandler(tornado.web.RequestHandler):

	@tornado.web.asynchronous
	@tornado.gen.engine
	def get(self, owner_aid): # Expected string "/tracksearch/ownerid_aid.mp3"
		req_url = "https://api.vkontakte.ru/method/audio.getById"
		q = os.path.splitext(owner_aid)[0]
		params = dict(access_token=VK_ACCESS_TOKEN, audios=q)
		req = tornado.httpclient.HTTPRequest(req_url, user_agent=VK_AGENT, method="POST", body=urlencode(params), connect_timeout=10.0, request_timeout=10.0)
		response = yield tornado.gen.Task(async_client.fetch, req)
		tracks = json.loads(response.body)
		# {response:[{track}, {track}, {track}]}
		tracks = tracks['response']
		if len(tracks)>0:
			self.redirect(tracks[0]['url'])

class PlaylistHandler(tornado.web.RequestHandler):

	@tornado.gen.engine
	@tornado.web.asynchronous
	def get(self, redkey):
		self.set_header("Content-Type", "application/json")
		redkey = urldecode(redkey)
		if re.search("PLAYLIST ALL", redkey):
			pattern = re.sub("ALL", "*", redkey)
			playlists = yield tornado.gen.Task(RED.keys, pattern)
			if playlists:
				self.write(json.dumps(playlists))
			else:
				self.write(json.dumps(["Main Library"]))
		else:
			tracklist = yield tornado.gen.Task(RED.get, redkey)
			if tracklist: self.write(tracklist if (tracklist is not None) else json.dumps([]))
		self.finish()

	@tornado.gen.engine
	@tornado.web.asynchronous
	def delete(self, redkey):
		redkey = urldecode(redkey)
		res = yield tornado.gen.Task(RED.delete, redkey)
		self.write(str(res))
		self.finish()

	@tornado.gen.engine
	@tornado.web.asynchronous
	def put(self, redkey):
		redkey = urldecode(redkey)
		data = json.loads(self.get_argument("data"))
		playlist = []
		if isinstance(data, list):
			playlist = data[::-1]
		elif isinstance(data, dict):
			print "Got a dict"
			print data
			res = yield tornado.gen.Task(RED.get, redkey)
			if res is not None:
				playlist = json.loads(res)
				playlist.append(data)
				print playlist
				print "Adding to existing..."
			else:
				playlist = [data]
				print "Adding to new playlist..."
		if isinstance(playlist, list):
			res = yield tornado.gen.Task(RED.set, redkey, str(json.dumps(playlist)))
			if res: self.write("OK")
		self.finish()

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
		params['quorum_factor'] = 0.85	# Level of fuzzy logic
		# Enabling these two options will sort by popularity
		#params['g_common_track'] = 1
		#params['s_track_rating'] = 'desc'
		url = "http://api.musixmatch.com/ws/1.1/track.search?" + urlencode(params)
		req = tornado.httpclient.HTTPRequest(url, user_agent=MX_AGENT, connect_timeout=10.0, request_timeout=10.0)
		res = yield tornado.gen.Task(async_client.fetch, req)
		self.write(res.body)
		self.finish()

class MXLyricsHandler(tornado.web.RequestHandler):

	@tornado.gen.engine
	@tornado.web.asynchronous
	def get(self, mx_track_id):
		self.set_header("Content-Type", "application/json")
		params = {'apikey':MX_API_KEY,
				  'format':'json',
				  'track_id':mx_track_id}
		req_url = "http://api.musixmatch.com/ws/1.1/track.lyrics.get?" + urlencode(params)
		req = tornado.httpclient.HTTPRequest(req_url, user_agent=MX_AGENT, connect_timeout=10.0, request_timeout=10.0)
		res = yield tornado.gen.Task(async_client.fetch, req)
		self.write(res.body)
		self.finish()

class VKSongByIdHandler(tornado.web.RequestHandler):

	@tornado.web.asynchronous
	@tornado.gen.engine
	def get(self, owner_aid): # Expected string "/tracksearch/ownerid_aid.mp3"
		req_url = "https://api.vkontakte.ru/method/audio.getById"
		q = os.path.splitext(owner_aid)[0]
		params = dict(access_token=VK_ACCESS_TOKEN, audios=q)
		req = tornado.httpclient.HTTPRequest(req_url, user_agent=VK_AGENT, method="POST", body=urlencode(params), connect_timeout=10.0, request_timeout=10.0)
		response = yield tornado.gen.Task(async_client.fetch, req)
		tracks = json.loads(response.body)
		# {response:[{track}, {track}, {track}]}
		tracks = tracks['response']
		if len(tracks)>0:
			self.redirect("/track/"+tracks[0]['url'])
		if not self._finished:
			self.finish()

	def finish(self, chunk=None):
		if not self.request.connection.stream.closed():
			super(VKSongByIdHandler, self).finish(chunk)

class VKSongHandler(tornado.web.RequestHandler):

	@tornado.web.asynchronous
	@tornado.gen.engine
	def get(self, owner_aid):
		self.async_client = tornado.curl_httpclient.CurlAsyncHTTPClient()
		self.set_header("Content-Type", "audio/mpeg")
		filename = os.path.split(owner_aid)[-1]
		self.set_header("Content-Disposition","attachment; filename=%s" % filename)
		req = tornado.httpclient.HTTPRequest(url=owner_aid, user_agent=VK_AGENT, header_callback=self.header_callback, streaming_callback=self.streaming_callback)
		try:
			yield tornado.gen.Task(self.async_client.fetch, req)
		except IOError, AssertionError:
			pass
		if not self._finished:
			self.finish()

	def finish(self, chunk=None):
		if not self.request.connection.stream.closed():
			super(VKSongHandler, self).finish(chunk)

#	def on_connection_close(self):
#		self.flush()

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
		req_url = "https://api.vkontakte.ru/method/audio.search"
		err_response = json.dumps(dict(error=True, response=[]))
		try:
			self.set_header("Content-Type", "application/json")
			search_string = urldecode(search_string)
			params = dict(access_token=VK_ACCESS_TOKEN, q=search_string.encode("utf-8"), count=100)
			data = urlencode(params)
			req = tornado.httpclient.HTTPRequest(req_url, method="POST", body=data, user_agent=VK_AGENT, connect_timeout=10.0, request_timeout=10.0)
			response_tracks = yield tornado.gen.Task(async_client.fetch, req)
			response = json.loads(response_tracks.body)
			# {response:[434, {track}, {track}, {track}]}
			results_total = int(response['response'][0])
			if results_total>0:
				owner_aids = ",".join(["%s_%s"%(song['owner_id'], song['aid']) for song in response['response'][1:]])
				params = dict(access_token=VK_ACCESS_TOKEN, audios=owner_aids)
				data = urlencode(params)
				req = tornado.httpclient.HTTPRequest("https://api.vkontakte.ru/method/audio.getById", method="POST", body=data, user_agent=VK_AGENT, connect_timeout=10.0, request_timeout=10.0)
				response = yield tornado.gen.Task(async_client.fetch, req)
				# {response:[{track}, {track}, {track}]}
				self.write(response.body)
			else:
				self.write(err_response)
		except Exception as e:
			print e
			self.write(err_response)
		finally:
			self.finish()

site_root = os.path.dirname(os.path.abspath(__file__))
application = tornado.web.Application([
	(r"/", MainHandler),
	(r"/channel.html", FBChannelFileHandler),
	(r"/test/(.*)", TestHandler),
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
	], debug=True)

if __name__ == "__main__":
	if "OPENSHIFT_INTERNAL_IP" in os.environ:
		address = os.environ['OPENSHIFT_INTERNAL_IP']
		port = os.environ['OPENSHIFT_INTERNAL_PORT']
		application.listen(port, address=address)
	else:
		application.listen(8888)
	tornado.ioloop.IOLoop.instance().start()


