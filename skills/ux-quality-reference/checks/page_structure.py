#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Page-structure checks on built HTML.

Rules: UX-A11Y-28 (lang and title, MUST), UX-A11Y-29 (one main, SHOULD),
UX-A11Y-31 (one h1, SHOULD), UX-A11Y-32 (skip link first, MUST),
UX-A11Y-33 (repeated chrome consistent across the set, MUST) and the page-list
half of UX-VERIFY-04 (the scanned pages come from the sitemap, MUST).

Usage:
  page_structure.py [--sitemap FILE] [--page-list FILE] [--must-only]
                    [--format text|json] DIR
  page_structure.py --self-test

Without --sitemap every .html file under DIR that contains an <html> element
is a page; a file without one is a fragment and is skipped. With --sitemap only
the routes the sitemap lists are read, and a listed route with no built file is
a finding. --page-list FILE (one route per line, for example the list the axe
gate scans) must equal the sitemap's route set.

Chrome links are the links inside header, nav and footer elements. A nav whose
aria-label names a breadcrumb, a table of contents, a pagination or an "on this
page" list is page-specific and is left out of the UX-A11Y-33 comparison.

Exit 0 clean, 1 findings, 2 usage or unreadable input.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import tempfile
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit

LANG_RE = re.compile(r"^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$")  # shape, not a registry lookup
PAGE_SPECIFIC_NAV = re.compile(
    r"breadcrumb|table of contents|on this page|pagination|toc", re.IGNORECASE
)
VOID = {
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
}
CHROME_TAGS = {"header", "nav", "footer"}
SEVERITY = {
    "UX-A11Y-28": "MUST",
    "UX-A11Y-29": "SHOULD",
    "UX-A11Y-31": "SHOULD",
    "UX-A11Y-32": "MUST",
    "UX-A11Y-33": "MUST",
    "UX-VERIFY-04": "MUST",
}


class Page(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.has_html = False
        self.lang: str | None = None
        self.title = ""
        self._in_title = False
        self.mains = 0
        self.h1 = 0
        self.noindex = False
        self.ids: set[str] = set()
        self.first_focusable: tuple[str, dict[str, str | None]] | None = None
        self.has_chrome = False
        self.links: list[tuple[str, str]] = []  # (text, href) inside chrome
        self._stack: list[tuple[str, bool]] = []  # (tag, counts as chrome)
        self._link: list | None = None
        self._template = 0

    def _chrome(self) -> bool:
        return any(c for _, c in self._stack)

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        a = dict(attrs)
        if tag == "html":
            self.has_html = True
            self.lang = a.get("lang")
        if tag == "template":
            self._template += 1
        if self._template:
            return
        if tag == "title":
            self._in_title = True
        if (
            tag == "meta"
            and (a.get("name") or "").lower() == "robots"
            and "noindex" in (a.get("content") or "").lower()
        ):
            self.noindex = True
        if a.get("id"):
            self.ids.add(a["id"] or "")
        if tag == "main" or a.get("role") == "main":
            self.mains += 1
        if tag == "h1":
            self.h1 += 1
        if tag in CHROME_TAGS:
            self.has_chrome = True
        if self.first_focusable is None and self._focusable(tag, a):
            self.first_focusable = (tag, a)
        if tag not in VOID:
            specific = (
                tag == "nav" and PAGE_SPECIFIC_NAV.search(a.get("aria-label") or "") is not None
            )
            self._stack.append((tag, tag in CHROME_TAGS and not specific))
        if tag == "a" and a.get("href") and self._chrome():
            self._link = [a.get("aria-label") or "", a["href"] or "", []]

    @staticmethod
    def _focusable(tag: str, a: dict[str, str | None]) -> bool:
        if "hidden" in a:
            return False
        if tag == "a":
            return a.get("href") is not None
        if tag == "input":
            return (a.get("type") or "").lower() != "hidden"
        if tag in {"button", "select", "textarea", "summary"}:
            return True
        ti = a.get("tabindex")
        return ti is not None and ti.lstrip("-").isdigit() and int(ti) >= 0

    def handle_endtag(self, tag: str) -> None:
        if tag == "template" and self._template:
            self._template -= 1
            return
        if self._template:
            return
        if tag == "title":
            self._in_title = False
        if tag == "a" and self._link is not None:
            text = (self._link[0] or " ".join("".join(self._link[2]).split())).strip()
            self.links.append((text, self._link[1]))
            self._link = None
        for i in range(len(self._stack) - 1, -1, -1):
            if self._stack[i][0] == tag:
                del self._stack[i:]
                break

    def handle_data(self, data: str) -> None:
        if self._template:
            return
        if self._in_title:
            self.title += data
        if self._link is not None:
            self._link[2].append(data)


def parse(path: Path) -> Page | None:
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError as err:
        print(f"page_structure: cannot read {path}: {err}", file=sys.stderr)
        raise SystemExit(2) from err
    page = Page()
    page.feed(text)
    page.close()
    return page


def sitemap_routes(sitemap: Path) -> list[str]:
    try:
        text = sitemap.read_text(encoding="utf-8")
    except OSError as err:
        print(f"page_structure: cannot read {sitemap}: {err}", file=sys.stderr)
        raise SystemExit(2) from err
    return sorted(
        {urlsplit(u).path or "/" for u in re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", text)}
    )


def route_file(root: Path, route: str) -> Path | None:
    rel = unquote(route).lstrip("/")
    candidates = (
        [root / rel / "index.html"]
        if route.endswith("/") or not rel
        else [root / rel / "index.html", root / f"{rel}.html", root / rel]
    )
    return next((c for c in candidates if c.is_file()), None)


def resolve(route: str, href: str) -> str | None:
    parts = urlsplit(urljoin(route, href))
    if parts.scheme not in ("", "http", "https") or (
        parts.netloc and parts.scheme in ("mailto", "tel")
    ):
        return None
    path = parts.path
    path = path.removesuffix("index.html")
    return f"{parts.netloc}{path}"


def check(
    root: Path, sitemap: Path | None, page_list: Path | None
) -> tuple[list[tuple[str, str, str]], int]:
    """Return findings as (rule, where, message) and the number of pages read."""
    findings: list[tuple[str, str, str]] = []
    pages: dict[str, Page] = {}
    if sitemap:
        routes = sitemap_routes(sitemap)
        for route in routes:
            f = route_file(root, route)
            if f is None:
                findings.append(
                    (
                        "UX-VERIFY-04",
                        route,
                        "the sitemap lists this route and no built file serves it",
                    )
                )
                continue
            page = parse(f)
            if page and page.has_html:
                pages[route] = page
        if page_list:
            try:
                page_text = page_list.read_text(encoding="utf-8")
            except OSError as err:
                print(f"page_structure: cannot read {page_list}: {err}", file=sys.stderr)
                raise SystemExit(2) from err
            listed = {ln.strip() for ln in page_text.splitlines() if ln.strip()}
            for r in sorted(set(routes) - listed):
                findings.append(("UX-VERIFY-04", r, "in the sitemap, missing from the page list"))
            for r in sorted(listed - set(routes)):
                findings.append(("UX-VERIFY-04", r, "in the page list, not in the sitemap"))
    else:
        if page_list:
            print("page_structure: --page-list needs --sitemap", file=sys.stderr)
            raise SystemExit(2)
        for f in sorted(root.rglob("*.html")):
            page = parse(f)
            if page and page.has_html:
                rel = "/" + f.relative_to(root).as_posix()
                pages[rel] = page

    for route, p in pages.items():
        if not p.lang or not LANG_RE.match(p.lang):
            findings.append(
                ("UX-A11Y-28", route, f"html lang is missing or not a BCP 47 tag (got {p.lang!r})")
            )
        if not p.title.strip():
            findings.append(("UX-A11Y-28", route, "title is missing or empty"))
        if not p.noindex and p.mains != 1:
            findings.append(("UX-A11Y-29", route, f"expected exactly one main, found {p.mains}"))
        if p.h1 != 1:
            findings.append(("UX-A11Y-31", route, f"expected exactly one h1, found {p.h1}"))
        if p.has_chrome:
            ff = p.first_focusable
            href = (ff[1].get("href") or "") if ff else ""
            if not ff or ff[0] != "a" or not href.startswith("#") or len(href) < 2:
                findings.append(
                    (
                        "UX-A11Y-32",
                        route,
                        "the first focusable element is not a skip link to a fragment",
                    )
                )
            elif href[1:] not in p.ids:
                findings.append(
                    (
                        "UX-A11Y-32",
                        route,
                        f"the skip link targets {href}, which no element carries as id",
                    )
                )

    seen_order: dict[tuple[str, str], str] = {}
    by_text: dict[str, dict[str, str]] = {}
    by_url: dict[str, dict[str, str]] = {}
    reported: set[tuple] = set()
    for route, p in pages.items():
        urls: list[str] = []
        for text, href in p.links:
            url = resolve(route, href)
            if url is None or not text:
                continue
            if url not in urls:
                urls.append(url)
            by_text.setdefault(text, {}).setdefault(url, route)
            by_url.setdefault(url, {}).setdefault(text, route)
        urls = urls[:60]
        for i, a in enumerate(urls):
            for b in urls[i + 1 :]:
                if (b, a) in seen_order and (a, b) not in seen_order and (b, a) not in reported:
                    reported.add((b, a))
                    findings.append(
                        (
                            "UX-A11Y-33",
                            route,
                            f"chrome order inverted: {a} comes before {b} here, after it on {seen_order[(b, a)]}",
                        )
                    )
                seen_order.setdefault((a, b), route)
    for text, targets in by_text.items():
        if len(targets) > 1:
            findings.append(
                (
                    "UX-A11Y-33",
                    next(iter(targets.values())),
                    f"link text {text!r} points at {len(targets)} different targets",
                )
            )
    for url, texts in by_url.items():
        if len(texts) > 1:
            findings.append(
                (
                    "UX-A11Y-33",
                    next(iter(texts.values())),
                    f"target {url or '/'} carries {len(texts)} link texts: {sorted(texts)}",
                )
            )
    return findings, len(pages)


def run(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(
        description=__doc__.split("\n\n")[0], epilog="Exit 0 clean, 1 findings, 2 usage."
    )
    ap.add_argument("dir", nargs="?", type=Path, help="built site directory")
    ap.add_argument("--sitemap", type=Path, help="sitemap.xml whose routes are the page list")
    ap.add_argument("--page-list", type=Path, help="routes the gate scans, one per line")
    ap.add_argument("--must-only", action="store_true", help="report MUST rules only")
    ap.add_argument("--format", choices=("text", "json"), default="text")
    ap.add_argument(
        "--self-test",
        action="store_true",
        help="run the fixtures under checks/fixtures/verify and exit",
    )
    args = ap.parse_args(argv)
    if args.self_test:
        return self_test()
    if not args.dir or not args.dir.is_dir():
        ap.print_usage(sys.stderr)
        return 2
    findings, count = check(args.dir, args.sitemap, args.page_list)
    if args.must_only:
        findings = [f for f in findings if SEVERITY[f[0]] == "MUST"]
    if args.format == "json":
        print(
            json.dumps(
                {
                    "pages": count,
                    "findings": [
                        {"rule": r, "severity": SEVERITY[r], "where": w, "message": m}
                        for r, w, m in findings
                    ],
                },
                indent=2,
            )
        )
    else:
        for r, w, m in findings:
            print(f"{w}: {r} ({SEVERITY[r]}): {m}")
        print(f"page_structure: {count} pages read, {len(findings)} findings")
    return 1 if findings else 0


def expect(cond: bool, what: str) -> None:
    if not cond:  # assert is stripped by -O; a self-test must not be
        raise SystemExit(f"self-test: {what}")


def self_test() -> int:
    base = Path(__file__).resolve().parent / "fixtures" / "verify"
    good, bad = base / "site-pass", base / "site-fail"
    f, n = check(good, good / "sitemap.xml", good / "page-list.txt")
    expect(n == 2 and not f, f"clean fixture must pass, got {f}")
    f, n = check(bad, bad / "sitemap.xml", bad / "page-list.txt")
    got = {(r, w) for r, w, _ in f}
    for want in [
        ("UX-A11Y-28", "/a/"),
        ("UX-A11Y-29", "/a/"),
        ("UX-A11Y-31", "/a/"),
        ("UX-A11Y-32", "/a/"),
        ("UX-A11Y-28", "/b/"),
        ("UX-A11Y-32", "/b/"),
        ("UX-A11Y-33", "/b/"),
        ("UX-VERIFY-04", "/missing/"),
        ("UX-VERIFY-04", "/unlisted/"),
    ]:
        expect(want in got, f"planted violation not found: {want}; got {sorted(got)}")
    msgs = " ".join(m for _, _, m in f)
    expect(
        "different targets" in msgs and "inverted" in msgs,
        f"UX-A11Y-33 text and order cases missing: {msgs}",
    )
    with (
        tempfile.TemporaryDirectory() as tmp
    ):  # a fragment (no html element) is skipped, not a finding
        (Path(tmp) / "frag.html").write_text("<div>fragment</div>", encoding="utf-8")
        f, n = check(Path(tmp), None, None)
        expect(n == 0 and not f, "a fragment must be skipped")
    try:  # an unreadable page list is a usage error (exit 2), never a traceback
        check(good, good / "sitemap.xml", good / "no-such-list.txt")
        expect(False, "a missing page list must exit 2")
    except SystemExit as err:
        expect(err.code == 2, f"a missing page list must exit 2, got {err.code}")
    print("page_structure: self-test ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(run(sys.argv[1:]))
