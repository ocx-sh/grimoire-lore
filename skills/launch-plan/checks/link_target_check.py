#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Check the URL a venue will link to (CH-LAUNCH-02, 03, 15).

    python3 -I link_target_check.py URL... [--install-host HOST --package NAME]
    python3 -I link_target_check.py --plan PLAN
    python3 -I link_target_check.py --self-test

Each URL is fetched through a public resolver (1.1.1.1 by default), never the
local one, because a stale local record reports a false failure. CH-LAUNCH-02
passes when the final URL is the intended one with HTTP 200, the page has no
gating form, its body has no wall words, and an install command is on the page
or on the page it links as "install". --install-host and --package add the
CH-LAUNCH-03 test: the first install command names that host or that package
as a whole word. --plan reads the plan file: the front-matter link_target and
every community `url_field` are checked, and none may equal canonical_record
(CH-LAUNCH-15). Prints `ok URL` or `URL: CH-LAUNCH-nn: message`. Exit 0 clean,
1 findings, 2 bad usage. Standard library only. --self-test uses no network.
"""

import argparse
import http.client
import re
import socket
import ssl
import struct
import sys
from pathlib import Path
from urllib.parse import urljoin, urlsplit

WALL = re.compile(r"sign ?up|waitlist|request access|early access", re.IGNORECASE)
STRIP = re.compile(r"<(nav|header|footer|script|style|aside)\b.*?</\1>", re.IGNORECASE | re.DOTALL)
INSTALL = re.compile(
    r"curl[^<]*\|\s*(ba)?sh|irm [^<]*\|\s*iex|brew install|cargo (b)?install|npm i(nstall)? "
)
FORM = re.compile(r"<form\b[^>]*>|type=\"?(email|password)", re.IGNORECASE)
SEARCH = re.compile(r"role=\"?search|type=\"?search|action=\"[^\"]*search", re.IGNORECASE)
LINK = re.compile(r"<a\b[^>]*href=\"([^\"]+)\"[^>]*>(.*?)</a>", re.IGNORECASE | re.DOTALL)


def norm(url):
    u = urlsplit(url)
    return f"{u.scheme}://{u.netloc.lower()}{u.path.rstrip('/') or '/'}"


def parse_a(data):
    """The first IPv4 address in a DNS response, or None."""
    qd, an = struct.unpack(">HH", data[4:8])
    i = 12
    for _ in range(qd):
        while data[i]:
            i += 1 + data[i]
        i += 5
    for _ in range(an):
        i = i + 2 if data[i] & 0xC0 == 0xC0 else data.index(b"\0", i) + 1
        kind, _, _, size = struct.unpack(">HHIH", data[i : i + 10])
        i += 10
        if kind == 1 and size == 4:
            return ".".join(str(b) for b in data[i : i + 4])
        i += size
    return None


def dns_a(host, server="1.1.1.1"):
    name = b"".join(bytes([len(p)]) + p.encode() for p in host.split(".")) + b"\0"
    query = struct.pack(">HHHHHH", 0x1F2E, 0x0100, 1, 0, 0, 0) + name + struct.pack(">HH", 1, 1)
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
        s.settimeout(5)
        s.sendto(query, (server, 53))
        return parse_a(s.recvfrom(1500)[0])


class Pinned(http.client.HTTPSConnection):
    """HTTPS to a fixed IP with the right server name for SNI and the certificate."""

    def __init__(self, host, ip, **kw):
        super().__init__(host, context=ssl.create_default_context(), **kw)
        self.ip = ip

    def connect(self):
        raw = socket.create_connection((self.ip, self.port), self.timeout)
        self.sock = self._context.wrap_socket(raw, server_hostname=self.host)


def fetch(url, hops=5):
    """Return (status, final URL, body) using a public resolver. Follows redirects."""
    for _ in range(hops):
        u = urlsplit(url)
        ip = dns_a(u.hostname)
        if not ip:
            return 0, url, ""
        if u.scheme == "https":
            conn = Pinned(u.hostname, ip, port=u.port or 443, timeout=15)
        else:
            conn = http.client.HTTPConnection(ip, u.port or 80, timeout=15)
        conn.request(
            "GET",
            (u.path or "/") + (f"?{u.query}" if u.query else ""),
            headers={"Host": u.netloc, "User-Agent": "Mozilla/5.0", "Connection": "close"},
        )
        resp = conn.getresponse()
        if resp.status in (301, 302, 303, 307, 308) and resp.getheader("Location"):
            url = urljoin(url, resp.getheader("Location"))
            continue
        return resp.status, url, resp.read(2_000_000).decode("utf-8", "replace")
    return 0, url, ""


def judge(url, fetched, install_page=None, host=None, package=None):
    """CH-LAUNCH-02 and 03 on one fetched page. `install_page` is the linked install page's HTML."""
    status, final, html = fetched
    out = []
    if status != 200 or norm(final) != norm(url):
        out.append(("CH-LAUNCH-02", f"HTTP {status} at {final}, not 200 at the intended URL"))
    tags = [m.group(0) for m in FORM.finditer(html) if not SEARCH.search(m.group(0))]
    if tags:
        out.append(("CH-LAUNCH-02", f"a form gates the page: {tags[0][:40]}"))
    wall = WALL.search(STRIP.sub("", html))
    if wall:
        out.append(("CH-LAUNCH-02", f"wall word in the page body: {wall.group(0)!r}"))
    found = INSTALL.search(html) or (INSTALL.search(install_page) if install_page else None)
    if not found:
        out.append(
            ("CH-LAUNCH-02", "no install command on the page or on the page it links as install")
        )
    elif host or package:
        text = found.group(0)
        if not (
            (host and f"://{host}/" in text)
            or (package and re.search(rf"\b{re.escape(package)}\b", text))
        ):
            out.append(
                (
                    "CH-LAUNCH-03",
                    f"the first install command is not for the launched product: {text[:60]}",
                )
            )
    return out


def install_link(url, html):
    for href, label in LINK.findall(html):
        if (
            re.search(r"install", href + label, re.IGNORECASE)
            and urlsplit(urljoin(url, href)).netloc == urlsplit(url).netloc
        ):
            return urljoin(url, href)
    return None


def plan_urls(text):
    """(link_target, canonical_record, community url_fields) from a plan file."""
    fm = dict(re.findall(r"^(\w+):\s*(.*)$", text.split("\n---", 1)[0], re.MULTILINE))
    fields, header = [], None
    for line in text.splitlines():
        if not line.startswith("|"):
            header = None
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if header is None:
            header = [c.lower() for c in cells]
        elif "venue_class" in header and "url_field" in header:
            row = dict(zip(header, cells, strict=False))
            if row.get("venue_class") == "community" and row.get("url_field", "").startswith(
                "http"
            ):
                fields.append(row["url_field"])
    return fm.get("link_target", ""), fm.get("canonical_record", ""), fields


def run(urls, record, host, package, getter=fetch):
    findings = []
    for url in urls:
        if record and norm(url) == norm(record):
            findings.append(
                (url, "CH-LAUNCH-15", "the venue URL is the canonical record; link the product")
            )
            continue
        status, final, html = getter(url)
        page = None
        if status == 200 and not INSTALL.search(html):
            nxt = install_link(url, html)
            page = getter(nxt)[2] if nxt else None
        found = judge(url, (status, final, html), page, host, package)
        findings += [(url, rule, msg) for rule, msg in found]
        if not found:
            print(f"ok {url}")
    return findings


def expect(condition, message):
    """Self-test check. A bare assert is stripped by python -O; this is not."""
    if not condition:
        raise SystemExit(str(message))


def self_test():
    here = __import__("pathlib").Path(__file__).resolve().parent / "fixtures" / "launch"

    def page(name):
        return (here / name).read_text(encoding="utf-8")

    url = "https://example.com/"
    good = judge(url, (200, url, page("page-good.html")))
    expect(not good, good)
    gated = {r for r, _ in judge(url, (200, url, page("page-gated.html")))}
    expect(gated == {"CH-LAUNCH-02"}, gated)
    msgs = " ".join(m for _, m in judge(url, (200, url, page("page-gated.html"))))
    expect("form" in msgs and "wall word" in msgs and "no install" in msgs, msgs)
    expect(
        judge(url, (200, "https://example.com/login", page("page-good.html"))),
        "self-test expectation failed",
    )
    expect(
        not judge(url, (200, url, page("page-good.html")), host="example.com", package="mytool"),
        "self-test expectation failed",
    )
    other = judge(
        url, (200, url, page("page-other-install.html")), host="example.com", package="mytool"
    )
    expect([r for r, _ in other] == ["CH-LAUNCH-03"], other)
    expect(
        not judge(url, (200, url, page("page-no-install.html")), page("page-good.html")),
        "self-test expectation failed",
    )
    expect(
        install_link(url, page("page-no-install.html")) == "https://example.com/install",
        "self-test expectation failed",
    )
    expect(
        norm("https://Example.com") == norm("https://example.com/"), "self-test expectation failed"
    )
    expect(
        run([url], url, None, None, getter=lambda u: (200, u, ""))[0][1] == "CH-LAUNCH-15",
        "self-test expectation failed",
    )
    packet = bytes.fromhex("1f2e81800001000200000000") + b"\x07example\x03com\x00\x00\x01\x00\x01"
    packet += bytes.fromhex("c00c000500010000001000") + b"\x06\x03www\xc0\x10"
    packet += bytes.fromhex("c00c0001000100000010") + b"\x00\x04" + bytes([93, 184, 216, 34])
    expect(parse_a(packet) == "93.184.216.34", parse_a(packet))
    link, record, fields = plan_urls(page("good-plan.md"))
    expect(
        (link, record, fields)
        == (
            "https://example.com/",
            "https://example.com/news/mytool-1-0",
            ["https://example.com/"],
        ),
        (link, record, fields),
    )
    print("link_target_check self-test: ok")
    return 0


def main(argv):
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("urls", nargs="*")
    ap.add_argument("--plan")
    ap.add_argument("--record")
    ap.add_argument("--install-host")
    ap.add_argument("--package")
    ap.add_argument("--self-test", action="store_true")
    a = ap.parse_args(argv)
    if a.self_test:
        return self_test()
    urls, record = list(a.urls), a.record
    if a.plan:
        link, rec, fields = plan_urls(Path(a.plan).read_text(encoding="utf-8"))
        urls += [u for u in [link, *fields] if u.startswith("http") and u not in urls]
        record = record or rec
    if not urls:
        ap.print_usage(sys.stderr)
        return 2
    findings = run(urls, record, a.install_host, a.package)
    for url, rule, msg in findings:
        print(f"{url}: {rule}: {msg}")
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
