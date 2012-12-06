#!/usr/bin/env python
import os
import tornado.ioloop
import tornado.web
import tornado.gen
import tornado.curl_httpclient
import tornado.httpclient
from urllib import urlopen

async_client = tornado.curl_httpclient.CurlAsyncHTTPClient()

# Works, but the browser-side is slow as fuck. Also keep as
# an example on how to do chunked tranfers
class VKSearchHandlerAsyncChunked(tornado.web.RequestHandler):

	@tornado.gen.engine
	@tornado.web.asynchronous
	def get(self, search_string):
		req_url = "https://api.vkontakte.ru/method/audio.search"
		search_string = urldecode(search_string)
		self.set_header("Content-Type", "application/x-javascript")
		self.set_header("Tranfer-Encoding", "chunked")
		self.results = []
		data = urlencode(dict(access_token=VK_ACCESS_TOKEN, q=search_string.encode("utf-8"), count=200))
		t1 = time.time()
		results = yield tornado.gen.Task(async_client.fetch, req_url, method="POST", body=data)
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

CHUNK_SIZE = 512000
class VKSongHandler(tornado.web.RequestHandler):
	@tornado.web.asynchronous
	@tornado.gen.engine
	def get(self):
		owner_aid = "http://cs4585.userapi.com/u41141045/audios/e3dd8761795e.mp3"
		self.set_header("Content-Type", "audio/mpeg")
		req = tornado.httpclient.HTTPRequest(url=owner_aid,streaming_callback = self.streaming_callback)
		res = yield tornado.gen.Task(async_client.fetch, req)
		self.set_header("Content-Type", res.headers['Content-Length'])
		self.finish()

	def streaming_callback(self, data):
		self.write(data)
		self.flush()

application = tornado.web.Application([
	(r"/", VKSongHandler),
])

if __name__ == "__main__":
	application.listen(8080)
	tornado.ioloop.IOLoop.instance().start()





class VKInterface(object):

	def __init__(self):
		self.getToken = self.get()

	def get(self):
		while True:
			yield "b63e1d33bf6561b4bf6561b4b9bf4e0dd1bbf65bf6b5dabefccf0d187e2dbaa4ac0b03e"

	def __get(self):
		"""
		To get more, curl -s
		https://oauth.vk.com/token/?username=%2B60122059190&scope=notify%2Cfriends%2Cphotos%2Caudio%2Cvideo%2Cdocs%2Cnotes%2Cwall%2Cgroups%2Cmessages%2Cnotifications%2Cstatus&password=nadine&client_id=2845797&client_secret=th0wMnlZFD4mIVrILNWs&grant_type=password
		"""
		tokens = ["4bf9259742a2591042a259104242893575442a242ac650f120bc93a3fdfa6c641604172",
				  "b63e1d33bf6561b4bf6561b4b9bf4e0dd1bbf65bf6b5dabefccf0d187e2dbaa4ac0b03e",
				  "c5f11c8accaa600dccaa600db0cc810c68cccaacca45c129c03f1a77dd8a556715f06db",
				  "497181d0402afd57402afd5782400191324402a4024c14810836ceb9c3476de8a92c177",
				  "88c778d7819c0450819c0450db81b768358819c8192384fd1359599d4e77328108f3ef2",
				  "597a068250217a0550217a0503500a166055021502f461a0088ebdc6c750fe7598362b8",
				  "8bcff30282948f8582948f859482bfe3e088294829ab39ad23d1e61f080239ebc9b7561"]
		i=0
		while True:
			yield tokens[i%len(tokens)]
			i+=1

