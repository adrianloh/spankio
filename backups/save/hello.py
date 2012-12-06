#!/usr/bin/env python
import os

here = os.path.dirname(os.path.abspath(__file__))
os.environ['PYTHON_EGG_CACHE'] = os.path.join(here, '..', 'misc/virtenv/lib/python2.6/site-packages')
virtualenv = os.path.join(here, '..', 'misc/virtenv/bin/activate_this.py')
execfile(virtualenv, dict(__file__=virtualenv))

import tornado.ioloop
import tornado.web

class MainHandler(tornado.web.RequestHandler):
    def get(self):
        self.write(str(self.request))

class UsersHandler(tornado.web.RequestHandler):
    def get(self, username):
        self.redirect("http://spank.io")

application = tornado.web.Application([
    (r"/", MainHandler),
    (r"/users/(.*)", UsersHandler),
])

if __name__ == "__main__":
    address = os.environ['OPENSHIFT_INTERNAL_IP']
    port = os.environ['OPENSHIFT_INTERNAL_PORT']
    application.listen(port, address=address)
    tornado.ioloop.IOLoop.instance().start()