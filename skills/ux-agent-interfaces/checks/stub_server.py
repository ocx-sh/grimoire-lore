#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Throwaway local HTTP stub for the retry and timeout probes (UX-AGENT-10, 11).

Usage:
  stub_server.py MODE [--port N]
  stub_server.py --self-test

  MODE  429   answer every request 429 with `Retry-After: 30`
        503   answer every request 503
        404   answer every request 404 (also the plain-HTTP port: point a TLS
              client at http://... as https://...)
        hang  accept the request and never answer

Prints the base URL (`http://127.0.0.1:PORT`) on the first line, then serves
until killed. The default port is a free one chosen by the system.

Exit codes: 0 clean, 2 usage.
Run as: python3 -I stub_server.py ...
"""

from __future__ import annotations

import argparse
import contextlib
import sys
import threading
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

STATUS = {"429": 429, "503": 503, "404": 404}


def make_server(mode: str, port: int = 0) -> ThreadingHTTPServer:
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:
            if mode == "hang":
                time.sleep(3600)
                return
            self.send_response(STATUS[mode])
            if mode == "429":
                self.send_header("Retry-After", "30")
            self.send_header("Content-Length", "0")
            self.end_headers()

        do_HEAD = do_POST = do_PUT = do_GET

        def log_message(self, *_args: object) -> None:
            pass

    srv = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    srv.daemon_threads = True
    return srv


def self_test() -> int:
    def expect(cond: bool, what: str) -> None:
        if not cond:
            raise SystemExit(f"self-test: {what}")

    for mode, code in STATUS.items():
        srv = make_server(mode)
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        url = f"http://127.0.0.1:{srv.server_address[1]}/v2/"
        try:
            urllib.request.urlopen(url, timeout=2)
            expect(False, f"mode {mode} answered 2xx")
        except urllib.error.HTTPError as e:
            expect(e.code == code, f"mode {mode} answered {e.code}")
            expect(
                (e.headers.get("Retry-After") == "30") == (mode == "429"),
                f"mode {mode} Retry-After header",
            )
        srv.shutdown()
    srv = make_server("hang")
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    try:
        urllib.request.urlopen(f"http://127.0.0.1:{srv.server_address[1]}/", timeout=0.5)
        expect(False, "hang mode answered")
    except TimeoutError:
        pass
    except urllib.error.URLError as e:
        expect(isinstance(e.reason, TimeoutError), f"hang mode failed with {e.reason!r}")
    print("stub_server self-test: ok")
    return 0


def main(argv: list[str]) -> int:
    if argv == ["--self-test"]:
        return self_test()
    p = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    p.add_argument("mode", choices=[*STATUS, "hang"])
    p.add_argument("--port", type=int, default=0)
    a = p.parse_args(argv)
    srv = make_server(a.mode, a.port)
    print(f"http://127.0.0.1:{srv.server_address[1]}", flush=True)
    with contextlib.suppress(KeyboardInterrupt):
        srv.serve_forever()
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
