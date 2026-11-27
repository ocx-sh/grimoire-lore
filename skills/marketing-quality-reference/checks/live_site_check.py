#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Checks against the deployed site under its public name (MKT-SEO-11 to 17, 26).

Subcommands, each with its rule numbers (severity MUST unless marked):
  robots   HOST [--file F] [--index URL ...]   11 response and fields, 12 Sitemap lines, 13 repeated Disallow
  policy-file FILE [--today YYYY-MM-DD]        15 crawler-policy.toml is complete, decided and fresh
  policy   HOST --policy FILE [--build-robots F]  16 live tokens, bytes and bot user-agent status against the file
  parity   HOST BUILD_DIR                      17 live sitemap, sampled heads and Link header against the build
  preview  HOST [HOST ...]                     26 non-public hosts answer X-Robots-Tag noindex [SHOULD]

Every request goes to the public name over https with certificate verification.
A TLS error, a refused connection or a timeout is a finding. The bot test sends
a user-agent string from one address. It is not an IP-verified bot test.
--scheme http exists for the self-test server only.

Exit codes: 0 clean, 1 findings, 2 usage.
"""

from __future__ import annotations

import argparse
import re
import ssl
import sys
import tempfile
import threading
import tomllib
import urllib.error
import urllib.request
from datetime import date
from html.parser import HTMLParser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urljoin, urlparse

BROWSER_UA = "Mozilla/5.0"
MAX_REDIRECTS = 5  # the largest count every compliant crawler must follow (RFC 9309)
MAX_ROBOTS_BYTES = 512_000  # Google reads 500 KiB
REQUIRED_TOKENS = (
    "OAI-SearchBot",
    "Claude-SearchBot",
    "PerplexityBot",
    "ChatGPT-User",
    "Claude-User",
    "Perplexity-User",
    "GPTBot",
    "ClaudeBot",
    "Google-Extended",
)
STALE_DAYS = 180
SEV = {"26": "SHOULD"}


class Unreachable(Exception):
    pass


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


def http(url: str, ua: str = BROWSER_UA, cap: int = 2_000_000, follow: bool = True) -> dict:
    """GET with manual redirects. Raises Unreachable on TLS, DNS, refusal and timeout."""
    hops = 0
    while True:
        if urlparse(url).scheme not in ("http", "https"):
            raise Unreachable(f"unsupported URL scheme: {url}")
        opener = urllib.request.build_opener(_NoRedirect)
        opener.addheaders = [("User-Agent", ua)]
        try:
            with opener.open(url, timeout=20) as r:
                return {
                    "status": r.status,
                    "headers": r.headers,
                    "body": r.read(cap + 1),
                    "redirects": hops,
                    "url": url,
                }
        except urllib.error.HTTPError as e:
            if follow and e.code in (301, 302, 303, 307, 308) and e.headers.get("Location"):
                hops += 1
                url = urljoin(url, e.headers["Location"])
                if hops > 20:
                    raise Unreachable("redirect loop") from None
                continue
            return {
                "status": e.code,
                "headers": e.headers,
                "body": e.read(cap + 1),
                "redirects": hops,
                "url": url,
            }
        except urllib.error.URLError as e:
            kind = "TLS error" if isinstance(e.reason, ssl.SSLError) else "unreachable"
            raise Unreachable(f"{kind} for {url}: {e.reason}") from None
        except (TimeoutError, OSError) as e:
            raise Unreachable(f"unreachable {url}: {e}") from None


def parse_robots(text: str) -> tuple[list[tuple[list[str], list[tuple[str, str]]]], list[str]]:
    """Groups as (user-agents, [(field, value)]) and the Sitemap values. Consecutive
    user-agent lines are one group."""
    groups: list[tuple[list[str], list[tuple[str, str]]]] = []
    sitemaps: list[str] = []
    prev_ua = False
    for raw_line in text.splitlines():
        line = raw_line.split("#", 1)[0].strip()
        if ":" not in line:
            continue
        field, _, value = line.partition(":")
        field, value = field.strip().lower(), value.strip()
        if field == "sitemap":
            sitemaps.append(value)
        elif field == "user-agent":
            if prev_ua:
                groups[-1][0].append(value.lower())
            else:
                groups.append(([value.lower()], []))
            prev_ua = True
            continue
        elif groups:
            groups[-1][1].append((field, value))
        prev_ua = False
    return groups, sitemaps


def robots_text_findings(text: str, indexes: list[str]) -> list[tuple[str, str]]:
    groups, sitemaps = parse_robots(text)
    out: list[tuple[str, str]] = []
    for agents, rules in groups:
        if "*" in agents or "googlebot" in agents:
            for field, value in rules:
                if field in ("crawl-delay", "noindex"):
                    out.append(
                        (
                            "11",
                            f"{field}: {value} in a group for {'/'.join(agents)}; Google ignores it",
                        )
                    )
    star = {v for a, r in groups if "*" in a for f, v in r if f == "disallow" and v}
    for agents, rules in groups:
        if "*" in agents:
            continue
        paths = {v for f, v in rules if f == "disallow"}
        if "/" in paths:
            continue
        for missing in sorted(star - paths):
            out.append(("13", f"group {'/'.join(agents)} drops the shared Disallow: {missing}"))
    for s in sitemaps:
        if not s.startswith("https://"):
            out.append(("12", f"Sitemap line {s!r} is not an absolute https URL"))
    for ix in indexes:
        if ix not in sitemaps:
            out.append(("12", f"sitemap index {ix} is not named by a Sitemap line"))
    if not indexes and not sitemaps:
        out.append(("12", "no Sitemap line"))
    return out


def robots_response_findings(resp: dict) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    ctype = resp["headers"].get("Content-Type", "")
    if resp["status"] != 200:
        out.append(("11", f"robots.txt answers {resp['status']}, expected 200"))
    if resp["redirects"] > MAX_REDIRECTS:
        out.append(("11", f"{resp['redirects']} redirects, over {MAX_REDIRECTS}"))
    if len(resp["body"]) >= MAX_ROBOTS_BYTES:
        out.append(("11", f"robots.txt is {MAX_ROBOTS_BYTES} bytes or more"))
    if not ctype.lower().startswith("text/plain"):
        out.append(("11", f"content type {ctype!r}, expected text/plain"))
    try:
        resp["body"].decode("utf-8")
    except UnicodeDecodeError:
        out.append(("11", "robots.txt is not UTF-8"))
    return out


def policy_file_findings(path: Path, today: date) -> tuple[list[tuple[str, str]], list[str]]:
    try:
        p = tomllib.loads(path.read_text(encoding="utf-8"))
    except (OSError, tomllib.TOMLDecodeError) as e:
        return [("15", f"cannot read {path}: {e}")], []
    out: list[tuple[str, str]] = []
    tokens = p.get("token", {})
    for t in REQUIRED_TOKENS:
        if t not in tokens:
            out.append(("15", f'token {t} has no [token."{t}"] table'))
    for t in ("anthropic-ai", "Claude-Web"):
        if t in tokens and "ClaudeBot" not in tokens:
            out.append(("15", f"{t} is recorded without ClaudeBot"))
    open_items: list[str] = []
    for name, v in tokens.items():
        if v.get("class") not in ("search", "user-fetch", "training"):
            out.append(("15", f"{name}: class must be search, user-fetch or training"))
        if v.get("decision") not in ("allow", "block"):
            out.append(("15", f"{name}: decision must be allow or block"))
        if v.get("decision") == "block":
            if v.get("owner") == "unreviewed":
                open_items.append(name)
            elif not (v.get("owner") and v.get("decided")):
                out.append(
                    (
                        "15",
                        f'{name}: a block needs owner and decided, or owner = "unreviewed" alone',
                    )
                )
    try:
        age = (today - date.fromisoformat(str(p["reviewed"]))).days
        if age > STALE_DAYS:
            out.append(("15", f"reviewed {p['reviewed']} is {age} days old, over {STALE_DAYS}"))
    except (KeyError, ValueError):
        out.append(("15", "top-level reviewed date is missing or not YYYY-MM-DD"))
    if not p.get("sources"):
        out.append(("15", "top-level sources list is missing"))
    if "cdn" in p and not isinstance(p["cdn"], list):
        out.append(("15", "cdn must be a list"))
    return out, open_items


def policy_live_findings(
    host: str, scheme: str, policy: dict, build_robots: Path | None
) -> list[tuple[str, str]]:
    base = f"{scheme}://{host}"
    resp = http(f"{base}/robots.txt")
    live = resp["body"].decode("utf-8", "replace")
    groups, _ = parse_robots(live)
    live_tokens = {a for agents, _r in groups for a in agents if a != "*"}
    policy_tokens = {t.lower(): t for t in policy.get("token", {})}
    out = [
        ("16", f"live robots.txt names {t}, which the policy file does not record")
        for t in sorted(live_tokens - set(policy_tokens))
    ]
    if not policy.get("cdn"):
        if build_robots is None:
            out.append(("16", "no cdn list and no --build-robots: bytes cannot be compared"))
        else:

            def clean(s):
                return [x for x in s.splitlines() if x.strip() and not x.startswith("#")]

            if clean(live) != clean(build_robots.read_text(encoding="utf-8")):
                out.append(("16", "live robots.txt differs from the build's robots.txt"))
    ref = http(f"{base}/", BROWSER_UA)["status"]
    for name, v in sorted(policy.get("token", {}).items()):
        if v.get("class") in ("search", "user-fetch"):
            got = http(f"{base}/", f"Mozilla/5.0 (compatible; {name}/1.0)")["status"]
            if got != ref:
                out.append(("16", f"{name} gets {got}, a browser gets {ref}"))
    return out


class Fields(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.f: dict[str, str] = {}
        self._t = False

    def handle_starttag(self, tag, attrs):
        a = {k: v or "" for k, v in attrs}
        if tag == "title" and "title" not in self.f:
            self._t = True
        elif tag == "link" and "canonical" in a.get("rel", "").lower().split():
            self.f.setdefault("canonical", a.get("href", ""))
        elif tag == "meta":
            key = a.get("name") or a.get("property") or ""
            if key in ("description", "og:image"):
                self.f.setdefault(key, a.get("content", ""))

    def handle_data(self, data):
        if self._t:
            self.f["title"] = data.strip()
            self._t = False


def head_fields(html: str) -> dict[str, str]:
    p = Fields()
    p.feed(html)
    return p.f


def live_locs(url: str) -> list[str]:
    out: list[str] = []
    for loc in re.findall(
        r"<loc>\s*([^<\s]+)\s*</loc>", http(url)["body"].decode("utf-8", "replace")
    ):
        out += live_locs(loc) if loc.endswith(".xml") else [loc]
    return out


def built_file(build: Path, url: str) -> Path | None:
    path = urlparse(url).path
    cands = (
        [build / path.lstrip("/") / "index.html"]
        if path.endswith("/") or "." not in Path(path).name
        else [build / path.lstrip("/")]
    )
    if not path.endswith("/") and "." not in Path(path).name:
        cands.append(build / (path.lstrip("/") + ".html"))
    return next((c for c in cands if c.is_file()), None)


def parity_findings(host: str, scheme: str, build: Path) -> list[tuple[str, str]]:
    base = f"{scheme}://{host}"
    http(f"{base}/")
    robots = http(f"{base}/robots.txt")["body"].decode("utf-8", "replace")
    _, smaps = parse_robots(robots)
    live = sorted({u for s in smaps for u in live_locs(s)})
    built: set[str] = set()
    for f in build.rglob("sitemap*.xml"):
        built |= {
            x
            for x in re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", f.read_text(encoding="utf-8"))
            if not x.endswith(".xml")
        }
    out = [("17", f"sitemap difference: live only {u}") for u in sorted(set(live) - built)]
    out += [("17", f"sitemap difference: build only {u}") for u in sorted(built - set(live))]
    for u in sorted({f"{base}/", *live[:5], *live[-5:]}):
        f = built_file(build, u)
        if f is None:
            out.append(("17", f"no build file for {u}"))
            continue
        resp = http(u)
        live_fields = head_fields(resp["body"].decode("utf-8", "replace"))
        build_fields = head_fields(f.read_text(encoding="utf-8", errors="replace"))
        for k in sorted(set(live_fields) | set(build_fields)):
            if live_fields.get(k) != build_fields.get(k):
                out.append(
                    (
                        "17",
                        f"{u}: {k} is {live_fields.get(k)!r} live and {build_fields.get(k)!r} in the build",
                    )
                )
        link = resp["headers"].get("Link", "")
        m = re.search(r'<([^>]+)>\s*;\s*rel="?canonical"?', link)
        if m and m.group(1) != build_fields.get("canonical"):
            out.append(
                (
                    "02",
                    f"{u}: Link header names canonical {m.group(1)}, HTML says {build_fields.get('canonical')}",
                )
            )
    return out


def preview_findings(hosts: list[str], scheme: str) -> list[tuple[str, str]]:
    out = []
    for h in hosts:
        got = http(f"{scheme}://{h}/")["headers"].get("X-Robots-Tag", "")
        if "noindex" not in got.lower():
            out.append(("26", f"{h} answers X-Robots-Tag {got!r}, expected noindex"))
    return out


def emit(host: str, found: list[tuple[str, str]], notes: list[str] | None = None) -> int:
    for n in notes or []:
        print(n)
    for rid, msg in found:
        print(f"MKT-SEO-{rid} {SEV.get(rid, 'MUST')} {host}: {msg}")
    print(f"{len(found)} finding(s)" if found else "clean")
    return 1 if found else 0


def serve(fn) -> ThreadingHTTPServer:
    class H(BaseHTTPRequestHandler):
        def do_GET(self):
            code, headers, body = fn(self.path, self.headers.get("User-Agent", ""))
            self.send_response(code)
            for k, v in headers.items():
                self.send_header(k, v)
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *args):
            pass

    srv = ThreadingHTTPServer(("127.0.0.1", 0), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def expect(condition: object, message: object) -> None:
    """Self-test check that survives `python -O`, unlike a bare assert."""
    if not condition:
        raise SystemExit(message)


def self_test() -> int:
    here = Path(__file__).resolve().parent / "fixtures" / "seo"

    def robots(n):
        return (here / "robots" / n).read_text(encoding="utf-8")

    def ids(found):
        return sorted({r for r, _ in found})

    expect(
        robots_text_findings(robots("good.txt"), ["https://example.com/sitemap-index.xml"]) == [],
        "assertion failed: robots_text_findings(robots('good.txt'), ['https://example.com/sitemap",
    )
    expect(
        ids(robots_text_findings(robots("crawl-delay.txt"), [])) == ["11"],
        "assertion failed: ids(robots_text_findings(robots('crawl-delay.txt'), [])) == ['11']",
    )
    expect(
        ids(robots_text_findings(robots("drops-disallow.txt"), [])) == ["13"],
        "assertion failed: ids(robots_text_findings(robots('drops-disallow.txt'), [])) == ['13']",
    )
    expect(
        ids(robots_text_findings(robots("good.txt"), ["https://example.com/other.xml"])) == ["12"],
        "assertion failed: ids(robots_text_findings(robots('good.txt'), ['https://example.com/oth",
    )
    expect(
        ids(robots_text_findings("User-agent: *\nDisallow:\nSitemap: /sitemap.xml\n", []))
        == ["12"],
        "assertion failed: ids(robots_text_findings('User-agent: *\\nDisallow:\\nSitemap: /sitemap.",
    )
    today = date(2026, 11, 27)
    found, open_items = policy_file_findings(here / "policy" / "crawler-policy-good.toml", today)
    expect(found == [] and open_items == ["GPTBot"], (found, open_items))
    bad, _ = policy_file_findings(here / "policy" / "crawler-policy-bad.toml", today)
    expect(len(bad) == 3 and ids(bad) == ["15"], bad)
    expect(
        policy_file_findings(here / "policy" / "missing.toml", today)[0],
        "assertion failed: policy_file_findings(here / 'policy' / 'missing.toml', today)[0]",
    )

    good = here / "site-good"
    state: dict = {"mode": "ok"}
    handler: dict = {}

    def dispatch(path: str, ua: str):
        return handler["route"](path, ua)

    srv = serve(dispatch)
    host = f"127.0.0.1:{srv.server_address[1]}"
    with tempfile.TemporaryDirectory() as t:
        build = Path(t)
        for f in good.rglob("*"):
            if f.is_file():
                dest = build / f.relative_to(good)
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_text(
                    f.read_text(encoding="utf-8").replace("https://example.com", f"http://{host}"),
                    encoding="utf-8",
                )
        (build / "robots.txt").write_text(
            f"User-agent: *\nAllow: /\nSitemap: http://{host}/sitemap-0.xml\n"
        )

        def route(path: str, ua: str):
            mode = state["mode"]
            if path.startswith("/r") and path != "/robots.txt":
                n = int(path[2:])
                return (
                    (302, {"Location": f"/r{n + 1}"}, b"")
                    if n < 6
                    else (200, {"Content-Type": "text/plain"}, b"User-agent: *\n")
                )
            if path == "/robots.txt":
                if mode == "redirect":
                    return 302, {"Location": "/r1"}, b""
                if mode == "html":
                    return 200, {"Content-Type": "text/html"}, b"User-agent: *\n"
                return (
                    200,
                    {"Content-Type": "text/plain; charset=utf-8"},
                    (build / "robots.txt").read_bytes(),
                )
            if mode == "pv-ok":
                return 200, {"X-Robots-Tag": "noindex, nofollow"}, b""
            if mode == "pv-bad":
                return 200, {}, b""
            if mode == "blocked" and "PerplexityBot" in ua:
                return 403, {}, b""
            f = built_file(build, path)
            if path == "/sitemap-0.xml" and mode == "short":
                return 200, {}, b"<urlset><url><loc>http://%s/</loc></url></urlset>" % host.encode()
            if f is None:
                return 404, {}, b""
            body = f.read_bytes()
            if mode == "retitle" and path == "/docs/a/":
                body = body.replace(b"Install the tool", b"Something else")
            return 200, {}, body

        handler["route"] = route
        expect(parity_findings(host, "http", build) == [], "good parity")
        state["mode"] = "retitle"
        expect(any("title" in m for _, m in parity_findings(host, "http", build)), "head drift")
        state["mode"] = "short"
        expect(
            any("sitemap difference" in m for _, m in parity_findings(host, "http", build)),
            "sitemap drift",
        )
        state["mode"] = "ok"
        expect(
            robots_response_findings(http(f"http://{host}/robots.txt")) == [],
            "assertion failed: robots_response_findings(http(f'http://{host}/robots.txt')) == []",
        )
        state["mode"] = "html"
        expect(
            ids(robots_response_findings(http(f"http://{host}/robots.txt"))) == ["11"],
            "assertion failed: ids(robots_response_findings(http(f'http://{host}/robots.txt'))) == ['",
        )
        state["mode"] = "redirect"
        expect(
            robots_response_findings(http(f"http://{host}/robots.txt"))[0][1].startswith(
                "6 redirects"
            ),
            "assertion failed: robots_response_findings(http(f'http://{host}/robots.txt'))[0][1].star",
        )
        state["mode"] = "ok"
        pol = {"token": {"GPTBot": {"class": "training"}, "PerplexityBot": {"class": "search"}}}
        expect(
            policy_live_findings(host, "http", pol, build / "robots.txt") == [],
            "assertion failed: policy_live_findings(host, 'http', pol, build / 'robots.txt') == []",
        )
        (build / "robots.txt").write_text(
            "User-agent: *\nAllow: /\nUser-agent: NewBot\nDisallow: /\n"
        )
        expect(
            ids(policy_live_findings(host, "http", pol, build / "robots.txt")) == ["16"],
            "unrecorded token",
        )
        (build / "robots.txt").write_text(
            f"User-agent: *\nAllow: /\nSitemap: http://{host}/sitemap-0.xml\n"
        )
        state["mode"] = "blocked"
        expect(
            any(
                "PerplexityBot gets 403" in m
                for _, m in policy_live_findings(host, "http", pol, build / "robots.txt")
            ),
            "assertion failed: any(('PerplexityBot gets 403' in m for _, m in policy_live_findings(ho",
        )
        state["mode"] = "pv-ok"
        expect(
            preview_findings([host], "http") == [],
            "assertion failed: preview_findings([host], 'http') == []",
        )
        state["mode"] = "pv-bad"
        expect(
            ids(preview_findings([host], "http")) == ["26"],
            "assertion failed: ids(preview_findings([host], 'http')) == ['26']",
        )
    srv.shutdown()
    try:
        http("http://127.0.0.1:1/")
        raise AssertionError("a refused connection must raise")
    except Unreachable:
        pass
    print("live_site_check self-test: ok")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--self-test", action="store_true")
    ap.add_argument(
        "--scheme",
        choices=("https", "http"),
        default="https",
        help="http is for the self-test server",
    )
    sub = ap.add_subparsers(dest="cmd")
    r = sub.add_parser("robots", help="rules 11, 12, 13")
    r.add_argument("host", nargs="?")
    r.add_argument(
        "--file", help="check this robots.txt text instead of fetching (skips the response arm)"
    )
    r.add_argument(
        "--index",
        action="append",
        default=[],
        help="a sitemap index URL the deploy publishes; repeatable",
    )
    pf = sub.add_parser("policy-file", help="rule 15")
    pf.add_argument("file")
    pf.add_argument("--today", help="YYYY-MM-DD, for tests")
    pl = sub.add_parser("policy", help="rule 16")
    pl.add_argument("host")
    pl.add_argument("--policy", required=True)
    pl.add_argument("--build-robots")
    pa = sub.add_parser("parity", help="rule 17")
    pa.add_argument("host")
    pa.add_argument("build")
    pv = sub.add_parser("preview", help="rule 26")
    pv.add_argument("hosts", nargs="+")
    a = ap.parse_args()
    if a.self_test:
        return self_test()
    if not a.cmd:
        ap.error("a subcommand or --self-test is required")
    try:
        if a.cmd == "robots":
            if a.file:
                text, found = Path(a.file).read_text(encoding="utf-8"), []
            elif a.host:
                resp = http(f"{a.scheme}://{a.host}/robots.txt")
                text, found = (
                    resp["body"].decode("utf-8", "replace"),
                    robots_response_findings(resp),
                )
            else:
                ap.error("robots needs HOST or --file")
            notes = (
                []
                if a.index
                else [
                    "note: no --index given; every sitemap index the deploy publishes must be named"
                ]
            )
            return emit(a.host or a.file, found + robots_text_findings(text, a.index), notes)
        if a.cmd == "policy-file":
            today = date.fromisoformat(a.today) if a.today else date.today()
            found, items = policy_file_findings(Path(a.file), today)
            return emit(
                a.file,
                found,
                [f"open item for the owner: {t} is blocked and unreviewed" for t in items],
            )
        if a.cmd == "policy":
            pol = tomllib.loads(Path(a.policy).read_text(encoding="utf-8"))
            br = Path(a.build_robots) if a.build_robots else None
            return emit(a.host, policy_live_findings(a.host, a.scheme, pol, br))
        if a.cmd == "parity":
            if not Path(a.build).is_dir():
                print(f"error: {a.build} is not a directory", file=sys.stderr)
                return 2
            return emit(a.host, parity_findings(a.host, a.scheme, Path(a.build)))
        return emit(", ".join(a.hosts), preview_findings(a.hosts, a.scheme))
    except Unreachable as e:
        return emit(getattr(a, "host", "") or "", [("17", str(e))])
    except (OSError, tomllib.TOMLDecodeError) as e:
        print(f"error: {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
