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
	p = {'q_artist': ['artist', 'singer'],
	     'q_track': ['song', 'title'],
	     'q_lyrics': ['lyrics']
	}
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
#config = dict(host='50.30.35.9', port=2700, password='53163f381734dddac45956b11fc934ea', selected_db=0)
RED = tornadoredis.Client(**config)
RED.connect()

async_client = tornado.curl_httpclient.CurlAsyncHTTPClient()

MX_API_KEY = "316bd7524d833bb192d98be44fe43017"
MX_AGENT = "musiXmatch/211 CFNetwork/596.2.3 Darwin/12.2.0 (x86_64) (MacPro3,1)"

class MainHandler(tornado.web.RequestHandler):

	def get(self):
		self.render("soundgarden.html")

class FBChannelFileHandler(tornado.web.RequestHandler):

	def get(self):
		# See following for why we're setting these headers:
		# https://developers.facebook.com/blog/post/530/
		import time
		expire = 60*60*24*365
		self.set_header("Cache-Control", "maxage=%i" % expire)
		self.set_header("Pragma", "public")
		self.set_header("Expires", time.asctime(time.gmtime(time.time()+expire)) + " GMT")
		self.write('<script src="//connect.facebook.net/en_US/all.js"></script>')

class XDomainFileHandler(tornado.web.RequestHandler):

	def get(self):
		self.write("""<?xml version="1.0"?>
<!-- http://xerxes.local:8888/crossdomain.xml -->
<cross-domain-policy>
<allow-access-from domain="*" />
</cross-domain-policy>""")

class PlaylistHandler(tornado.web.RequestHandler):

	@tornado.gen.engine
	@tornado.web.asynchronous
	def get(self, redkey):
		self.set_header("Content-Type", "application/json")
		redkey = urldecode(redkey)
		tracklist = yield tornado.gen.Task(RED.get, redkey)
		if tracklist: self.write(tracklist if (tracklist is not None) else json.dumps([]))
		self.finish()

class MXSearchHandler(tornado.web.RequestHandler):

	@tornado.gen.engine
	@tornado.web.asynchronous
	def get(self):
		self.set_header("Content-Type", "application/json")
#		data = json.loads(urldecode(o))
		search_string = self.get_argument("q")
		page = self.get_argument("page")
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

class MyStaticHandler(tornado.web.StaticFileHandler):

	def set_extra_headers(self, path):
		self.set_header("Access-Control-Allow-Origin","*")
		self.set_header("Accept-Ranges","bytes")

site_root = os.path.dirname(os.path.abspath(__file__))

application = tornado.web.Application([
	(r"/", MainHandler),
	(r"/channel.html", FBChannelFileHandler),
	(r"/crossdomain.xml", XDomainFileHandler),
	(r"/playlist/(.*)", PlaylistHandler), # Keep around for old users
	(r"/mxsearch", MXSearchHandler),
	(r"/static/(.*)", MyStaticHandler, {"path": site_root}),
	(r"/js/(.*)", tornado.web.StaticFileHandler, {"path": site_root+"/js"}),
	(r"/css/(.*)", tornado.web.StaticFileHandler, {"path": site_root+"/css"}),
	(r"/img/(.*)", tornado.web.StaticFileHandler, {"path": site_root+"/img"}),
	(r"/360_files/(.*)", tornado.web.StaticFileHandler, {"path": site_root+"/360_files"}),
	], debug=True)

if __name__ == "__main__":
	if "OPENSHIFT_INTERNAL_IP" in os.environ:
		address = os.environ['OPENSHIFT_INTERNAL_IP']
		port = os.environ['OPENSHIFT_INTERNAL_PORT']
		application.listen(port, address=address)
	else:
		application.listen(8888)
	tornado.ioloop.IOLoop.instance().start()