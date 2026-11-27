#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Head, sitemap and structured-data checks on a built site.

Rules covered (the catalog's MKT-SEO family, severity in brackets):
  01 absolute https origin on every canonical, og:url and sitemap loc [MUST]
  02 one canonical per page, equal to the sitemap loc and og:url      [MUST]
  03 unique, non-empty title; site name at most once                  [MUST]
  04 own meta description per page                                    [MUST]
  06 og:title, og:type, og:image, og:url; image form                  [MUST, parts SHOULD]
  07 summary_large_image only with an image                           [SHOULD]
  08 og:type website; article only with a published time              [SHOULD]
  09 no priority or changefreq; sitemap is well-formed XML            [SHOULD]
  10 no generation-time lastmod                                       [MUST]
  21 no review or rating markup outside an allow-list                 [MUST]
  22 one WebSite JSON-LD object on the root page                      [SHOULD]
  23 no popstate handler outside an allow-list                        [MUST]
  25 no FAQPage, HowTo or rating-less SoftwareApplication markup      [SHOULD]
Rules 05 and 18 and 20 are deny-list greps in discoverability.md, not here.

A page with a robots noindex meta is skipped by every per-page check.
Image bytes are fetched only with --fetch-images (rule 06).

Usage:
  head_check.py BUILD_DIR --host HOST [--site-name NAME] [--only 01,03]
                [--must-only] [--fetch-images] [--exempt-description FILE]
                [--reviews-allow FILE] [--back-allow FILE] [--previous-build DIR]
  head_check.py --self-test

Exit codes: 0 clean, 1 findings, 2 usage or missing input.
"""

from __future__ import annotations

import argparse
import contextlib
import io
import json
import re
import sys
import tempfile
import threading
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from collections import defaultdict
from html.parser import HTMLParser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

MAX_IMAGE_BYTES = 5_000_000  # smaller reading of "5 MB"; neither platform page says which megabyte
REVIEW_RE = re.compile(r'aggregateRating|"@type"\s*:\s*"(?:Review|AggregateRating)"')
DEAD_RE = re.compile(r'"@type"\s*:\s*\[?\s*"(?:FAQPage|HowTo)"')
SOFTAPP_RE = re.compile(r'"@type"\s*:\s*\[?\s*"SoftwareApplication"')
RATED_RE = re.compile(r'aggregateRating|"review"')


class Head(HTMLParser):
    """First title, meta tags by name or property, canonical links, JSON-LD blocks."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title: str | None = None
        self.meta: dict[str, list[str]] = {}
        self.canon: list[str] = []
        self.ld: list[str] = []
        self._buf: list[str] = []
        self._mode = ""

    def handle_starttag(self, tag, attrs):
        a = {k: (v or "") for k, v in attrs}
        if tag == "title" and self.title is None:
            self._mode, self._buf = "title", []
        elif tag == "meta":
            key = (a.get("name") or a.get("property") or "").lower()
            if key:
                self.meta.setdefault(key, []).append(a.get("content", ""))
        elif tag == "link" and "canonical" in a.get("rel", "").lower().split():
            self.canon.append(a.get("href", ""))
        elif tag == "script" and a.get("type", "").lower() == "application/ld+json":
            self._mode, self._buf = "ld", []

    def handle_data(self, data):
        if self._mode:
            self._buf.append(data)

    def handle_endtag(self, tag):
        if tag == "title" and self._mode == "title":
            self.title = "".join(self._buf).strip()
            self._mode = ""
        elif tag == "script" and self._mode == "ld":
            self.ld.append("".join(self._buf))
            self._mode = ""

    def one(self, key: str) -> str:
        v = self.meta.get(key)
        return v[0].strip() if v else ""


class Finding:
    def __init__(self, rid: str, sev: str, where: str, msg: str) -> None:
        self.rid, self.sev, self.where, self.msg = rid, sev, where, msg

    def __str__(self) -> str:
        return f"MKT-SEO-{self.rid} {self.sev} {self.where}: {self.msg}"


def read_list(path: str | None) -> set[str]:
    if not path or not Path(path).is_file():
        return set()
    lines = Path(path).read_text(encoding="utf-8").splitlines()
    return {x.strip() for x in lines if x.strip() and not x.startswith("#")}


def load_pages(build: Path) -> tuple[dict[str, Head], dict[str, str]]:
    """Indexable pages (parsed) and the raw text of every html file."""
    pages: dict[str, Head] = {}
    raw: dict[str, str] = {}
    for f in sorted(build.rglob("*.html")):
        rel = f.relative_to(build).as_posix()
        text = f.read_text(encoding="utf-8", errors="replace")
        raw[rel] = text
        h = Head()
        h.feed(text)
        if "noindex" not in " ".join(h.meta.get("robots", [])).lower():
            pages[rel] = h
    return pages, raw


def sitemap_urls(build: Path) -> tuple[dict[str, dict[str, str]], list[str]]:
    """Per sitemap file: loc -> lastmod. Second value: files that do not parse."""
    out: dict[str, dict[str, str]] = {}
    broken: list[str] = []
    for f in sorted(build.rglob("sitemap*.xml")):
        rel = f.relative_to(build).as_posix()
        try:
            raw = f.read_bytes()
            # A sitemap never needs a DTD; refusing one closes the entity-expansion hole.
            if b"<!DOCTYPE" in raw or b"<!ENTITY" in raw:
                raise ET.ParseError("DTD in sitemap")
            root = ET.ElementTree().parse(f)
        except ET.ParseError:
            broken.append(rel)
            continue
        locs: dict[str, str] = {}
        for node in root:
            loc = next((c.text or "" for c in node if c.tag.endswith("loc")), "").strip()
            mod = next((c.text or "" for c in node if c.tag.endswith("lastmod")), "").strip()
            if loc:
                locs[loc] = mod
        out[rel] = locs
    return out, broken


def ld_objects(h: Head) -> list[dict]:
    out: list[dict] = []
    for block in h.ld:
        try:
            data = json.loads(block)
        except ValueError:
            continue
        stack = data if isinstance(data, list) else [data]
        while stack:
            item = stack.pop()
            if isinstance(item, dict):
                out.append(item)
                stack.extend(v for v in item.get("@graph", []) if isinstance(v, (dict, list)))
    return out


def fetch_image(url: str) -> tuple[int, str, int]:
    if urllib.parse.urlsplit(url).scheme not in ("http", "https"):
        return 0, f"unsupported URL scheme: {url}", 0
    opener = urllib.request.build_opener()
    opener.addheaders = [("User-Agent", "catalog-seo-check/1")]
    try:
        with opener.open(url, timeout=30) as r:
            return r.status, r.headers.get("Content-Type", ""), len(r.read(MAX_IMAGE_BYTES + 1))
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get("Content-Type", ""), 0
    except OSError as e:
        return 0, str(e), 0


def image_findings(url: str, where: str) -> list[Finding]:
    status, ctype, size = fetch_image(url)
    kind = ctype.split(";")[0].strip().lower()
    out: list[Finding] = []
    if status != 200 or not kind.startswith("image/") or "svg" in kind:
        out.append(
            Finding("06", "MUST", where, f"og:image {url} answers {status} {ctype or 'no type'}")
        )
    elif kind not in ("image/png", "image/jpeg"):
        out.append(Finding("06", "SHOULD", where, f"og:image {url} is {kind}, prefer PNG or JPEG"))
    if size > MAX_IMAGE_BYTES:
        out.append(
            Finding("06", "SHOULD", where, f"og:image {url} is over {MAX_IMAGE_BYTES} bytes")
        )
    return out


def run(a: argparse.Namespace) -> list[Finding]:
    build = Path(a.build)
    host = a.host.lower()
    origin = re.compile(rf"^https://{re.escape(host)}(/|$)")
    pages, raw = load_pages(build)
    sitemaps, broken = sitemap_urls(build)
    exempt = read_list(a.exempt_description) | {"index.html"}
    reviews_ok, back_ok = read_list(a.reviews_allow), read_list(a.back_allow)
    f: list[Finding] = []

    def add(rid, sev, where, msg):
        f.append(Finding(rid, sev, where, msg))

    page_locs = {u for m in sitemaps.values() for u in m if not u.endswith(".xml")}
    for rel, h in pages.items():
        for v in h.canon + h.meta.get("og:url", []):
            if not origin.match(v):
                add(
                    "01",
                    "MUST",
                    rel,
                    f"canonical or og:url {v!r} is not an absolute https URL on {host}",
                )
        if len(h.canon) != 1:
            add("02", "MUST", rel, f"{len(h.canon)} canonical links, expected exactly 1")
        for c in h.canon:
            if "#" in c:
                add("02", "MUST", rel, f"canonical {c!r} carries a fragment")
        if len(h.canon) == 1 and h.one("og:url") and h.one("og:url") != h.canon[0]:
            add(
                "02",
                "MUST",
                rel,
                f"og:url {h.one('og:url')!r} differs from canonical {h.canon[0]!r}",
            )
        title = h.title or ""
        if not title:
            add("03", "MUST", rel, "title is missing or empty")
        elif a.site_name:
            name = a.site_name.lower()
            if title.lower() == name:
                add("03", "MUST", rel, "title is the site name alone")
            elif title.lower().count(name) > 1:
                add(
                    "03",
                    "MUST",
                    rel,
                    f"site name {a.site_name!r} appears more than once in the title",
                )
        if not h.one("description"):
            add("04", "MUST", rel, "meta description is missing or empty")
        for p in ("title", "type", "image", "url"):
            if not h.one(f"og:{p}"):
                add("06", "MUST", rel, f"og:{p} is missing")
        img = h.one("og:image")
        if img:
            if not img.startswith("https://"):
                add("06", "MUST", rel, f"og:image {img!r} is not an absolute https URL")
            if img.split("?")[0].lower().endswith(".svg"):
                add("06", "MUST", rel, f"og:image {img!r} is SVG")
            if not h.one("og:image:alt"):
                add("06", "SHOULD", rel, "og:image:alt is missing")
        if h.one("twitter:card") == "summary_large_image" and not (img or h.one("twitter:image")):
            add(
                "07",
                "SHOULD",
                rel,
                "summary_large_image declared with no og:image or twitter:image",
            )
        otype = h.one("og:type")
        if rel == "index.html" and otype and otype != "website":
            add("08", "SHOULD", rel, f"home page og:type is {otype!r}, expected website")
        if otype == "article" and not h.one("article:published_time"):
            add("08", "SHOULD", rel, "og:type article without article:published_time")

    by_value: dict[str, list[str]] = defaultdict(list)
    for rel, h in pages.items():
        if h.one("description"):
            by_value[h.one("description")].append(rel)
    for value, rels in by_value.items():
        if len(rels) > 1:
            for rel in (r for r in rels if r not in exempt):
                add(
                    "04",
                    "MUST",
                    rel,
                    f"description shared with {len(rels) - 1} other page(s): {value[:50]!r}",
                )
    dups: dict[str, list[str]] = defaultdict(list)
    for rel, h in pages.items():
        if h.title:
            dups[h.title].append(rel)
    for t, rels in dups.items():
        if len(rels) > 1:
            add("03", "MUST", ", ".join(rels), f"title {t!r} repeats")

    for rel, locs in sitemaps.items():
        for u in locs:
            if not origin.match(u):
                add("01", "MUST", rel, f"loc {u!r} is not an absolute https URL on {host}")
        text = (build / rel).read_text(encoding="utf-8", errors="replace")
        for tag in ("priority", "changefreq"):
            if f"<{tag}>" in text:
                add("09", "SHOULD", rel, f"<{tag}> is present; Google and Bing ignore it")
        mods = [m for u, m in locs.items() if m and not u.endswith(".xml")]
        if len(mods) > 1 and len(set(mods)) == 1:
            add("10", "MUST", rel, f"one lastmod value ({mods[0]}) on every URL, a generation time")
    for rel in broken:
        add("09", "SHOULD", rel, "sitemap is not well-formed XML")
    if a.previous_build:
        old, _ = sitemap_urls(Path(a.previous_build))
        for rel, locs in sitemaps.items():
            for u, m in locs.items():
                if rel in old and u in old[rel] and old[rel][u] != m:
                    add(
                        "10",
                        "MUST",
                        rel,
                        f"lastmod of {u} changed between two builds: {old[rel][u]} to {m}",
                    )
    if sitemaps:
        canon = {c for h in pages.values() for c in h.canon}
        for u in sorted(canon - page_locs):
            add("02", "MUST", "sitemap", f"canonical {u} is in no sitemap")
        for u in sorted(page_locs - canon):
            add("02", "MUST", "sitemap", f"sitemap loc {u} is the canonical of no indexable page")
    else:
        print(
            "note: no sitemap*.xml under the build; the sitemap arms of 01, 02, 09, 10 did not run",
            file=sys.stderr,
        )

    for rel, text in raw.items():
        if REVIEW_RE.search(text) and rel not in reviews_ok:
            add(
                "21",
                "MUST",
                rel,
                "review or rating markup, and the page is not in the reviews allow-list",
            )
        if DEAD_RE.search(text):
            add("25", "SHOULD", rel, "FAQPage or HowTo markup produces no rich result")
        if SOFTAPP_RE.search(text) and not RATED_RE.search(text):
            add("25", "SHOULD", rel, "SoftwareApplication with no rating or review is ineligible")
    for p in sorted(build.rglob("*")):
        if p.suffix in (".js", ".mjs", ".html") and p.is_file():
            rel = p.relative_to(build).as_posix()
            if "popstate" in p.read_text(encoding="utf-8", errors="replace") and rel not in back_ok:
                add("23", "MUST", rel, "popstate handler outside the back-button allow-list")
    home = pages.get("index.html")
    if home is not None:
        sites = [o for o in ld_objects(home) if o.get("@type") == "WebSite"]
        ok = [o for o in sites if o.get("name") and home.canon and o.get("url") == home.canon[0]]
        if len(sites) != 1 or not ok:
            add(
                "22",
                "SHOULD",
                "index.html",
                "expected one WebSite JSON-LD object with name and url equal to the canonical",
            )
    if a.fetch_images:
        urls = {
            h.one("og:image") for h in pages.values() if h.one("og:image").startswith("https://")
        }
        for u in sorted(urls):
            f.extend(image_findings(u, u))
    else:
        print(
            "note: image bytes not fetched; pass --fetch-images for the 200, type and size arms of 06",
            file=sys.stderr,
        )
    if a.only:
        keep = {x.strip() for x in a.only.split(",")}
        f = [x for x in f if x.rid in keep]
    return [x for x in f if x.sev == "MUST"] if a.must_only else f


def serve(routes: dict[str, tuple[int, str, bytes]]) -> ThreadingHTTPServer:
    class H(BaseHTTPRequestHandler):
        def do_GET(self):
            code, ctype, body = routes.get(self.path, (404, "text/plain", b""))
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *args):
            pass

    srv = ThreadingHTTPServer(("127.0.0.1", 0), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def expect(condition: object, message: str) -> None:
    """Self-test check that survives `python -O`, unlike a bare assert."""
    if not condition:
        raise SystemExit(message)


def self_test() -> int:
    here = Path(__file__).resolve().parent / "fixtures" / "seo"

    def go(site: str, *extra: str) -> list[Finding]:
        ns = parse(["--host", "example.com", "--site-name", "Example", str(here / site), *extra])
        return run(ns)

    expect(not [str(x) for x in go("site-good")], "good site must be clean")
    bad = go("site-bad")
    ids = {x.rid for x in bad}
    want = {"01", "02", "03", "04", "06", "07", "08", "09", "10", "21", "22", "23", "25"}
    expect(want <= ids, f"bad site missed rules: {sorted(want - ids)}")
    expect(not any("frag/" in x.where for x in bad), "a noindex page must be skipped")
    allowed = go("site-bad", "--reviews-allow", "/dev/null", "--only", "21")
    expect([x.rid for x in allowed] == ["21"], "--only must filter")
    with tempfile.TemporaryDirectory() as t:
        allow = Path(t, "allow.txt")
        allow.write_text("index.html\napp.js\ndocs/d/index.html\n")
        left = {
            x.rid
            for x in go(
                "site-bad",
                "--reviews-allow",
                str(allow),
                "--back-allow",
                str(allow),
                "--only",
                "21,23",
            )
        }
        expect(not left, f"allow-lists must clear 21 and 23, left {left}")
        prev = Path(t, "prev")
        prev.mkdir()
        (prev / "sitemap-0.xml").write_text(
            "<urlset><url><loc>https://example.com/docs/a/</loc><lastmod>2026-01-01</lastmod></url></urlset>"
        )
        drift = go("site-good", "--previous-build", str(prev), "--only", "10")
        expect([x.rid for x in drift] == ["10"], "lastmod drift between builds must fail")
    png = b"\x89PNG" + b"0" * 10
    srv = serve(
        {
            "/ok.png": (200, "image/png", png),
            "/logo.svg": (200, "image/svg+xml", b"<svg/>"),
            "/big.webp": (200, "image/webp", b"0" * (MAX_IMAGE_BYTES + 5)),
        }
    )
    base = f"http://127.0.0.1:{srv.server_address[1]}"
    expect(not image_findings(f"{base}/ok.png", "p"), "a PNG with 200 passes")
    svg = image_findings(f"{base}/logo.svg", "p")
    expect([x.sev for x in svg] == ["MUST"], "SVG is a MUST finding")
    expect(
        {x.sev for x in image_findings(f"{base}/big.webp", "p")} == {"SHOULD"},
        "WebP and size are SHOULD",
    )
    expect(
        image_findings(f"{base}/gone.png", "p")[0].sev == "MUST", "a 404 image is a MUST finding"
    )
    srv.shutdown()
    h = Head()
    h.feed(
        '<title>A</title><meta name="Description" content="d"><link rel="Canonical nofollow" href="/x">'
    )
    expect(
        (h.title, h.one("description"), h.canon) == ("A", "d", ["/x"]),
        "assertion failed: (h.title, h.one('description'), h.canon) == ('A', 'd', ['/x'])",
    )
    print("head_check self-test: ok")
    return 0


def parse(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    p.add_argument("build", nargs="?", help="built site directory")
    p.add_argument("--host", help="public host name, no scheme (example.com)")
    p.add_argument("--site-name", help="site name, enables the title arms of rule 03")
    p.add_argument("--only", help="comma list of rule numbers to keep, such as 01,03")
    p.add_argument("--must-only", action="store_true", help="report and fail on MUST findings only")
    p.add_argument("--fetch-images", action="store_true", help="fetch each og:image (network)")
    p.add_argument(
        "--exempt-description", help="file of built page paths that may share a description"
    )
    p.add_argument("--reviews-allow", default="structured-data-reviews.txt")
    p.add_argument("--back-allow", default="back-button-allow.txt")
    p.add_argument(
        "--previous-build", help="an earlier build of the same content, for the lastmod diff"
    )
    p.add_argument("--self-test", action="store_true")
    ns = p.parse_args(argv)
    if not ns.self_test and not (ns.build and ns.host):
        p.error("BUILD_DIR and --host are required")
    return ns


def main() -> int:
    ns = parse(sys.argv[1:])
    if ns.self_test:
        with contextlib.redirect_stderr(io.StringIO()):
            return self_test()
    if not Path(ns.build).is_dir():
        print(f"error: {ns.build} is not a directory", file=sys.stderr)
        return 2
    found = run(ns)
    for x in found:
        print(x)
    print(f"{len(found)} finding(s)" if found else "clean")
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main())
