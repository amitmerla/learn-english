#!/usr/bin/env python3
"""
Static server for Word Wizard.

Why not just open index.html from disk:
  - the built-in AI APIs need a secure context, and http://localhost counts as one;
  - ES modules are blocked on file:// URLs.

    ./serve.py [port]        # default 8787
"""

import functools
import http.server
import socketserver
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8787


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass


socketserver.ThreadingTCPServer.allow_reuse_address = True
socketserver.ThreadingTCPServer.daemon_threads = True
with socketserver.ThreadingTCPServer(("127.0.0.1", PORT), functools.partial(Handler, directory=str(ROOT))) as httpd:
    print(f"Word Wizard on http://localhost:{PORT}")
    httpd.serve_forever()
