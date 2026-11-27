#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Template share of a generated page set (the measurement behind MKT-SEO-24).

Reads every <loc> of a sitemap (recursing into indexes), takes the visible text
of <main> (or of the body without nav, header, footer, script and style),
builds 5-word shingles, and reports each page's template share: the fraction of
its shingles that appear on at least max(2, 0.5 * n) pages of the set.

The 0.5 threshold is this catalog's unvalidated heuristic. It applies only to a
set of 10 pages or more: on fewer pages the share is high by construction, so
the result prints and exits 0 with a note. Word count is reported and never
gated, because Google states no preferred length.

Usage:
  shingle.py SITEMAP [PATH_REGEX] [--root DIR]
  shingle.py --self-test

SITEMAP is a URL, or a file path together with --root. With --root DIR a page
URL is read from DIR/<url path>[/index.html] instead of the network, so a build
can be measured before it deploys.

Exit codes: 0 clean (or fewer than 10 pages), 1 a page at or above 0.5 in a
set of 10 or more, 2 usage or unreadable sitemap.
"""

from __future__ import annotations

import argparse
import contextlib
import io
import itertools
import re
import statistics
import sys
import tempfile
import urllib.request
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

MIN_SET = 10  # shingle definition degenerates on 2 or 3 pages
THRESHOLD = 0.5  # heuristic, set on one generated set with one control


class Text(HTMLParser):
    SKIP = ("script", "style", "nav", "header", "footer", "noscript", "svg")

    def __init__(self) -> None:
        super().__init__()
        self.skip = self.in_main = 0
        self.all: list[str] = []
        self.main: list[str] = []

    def handle_starttag(self, tag, attrs):
        self.skip += tag in self.SKIP
        self.in_main += tag == "main"

    def handle_endtag(self, tag):
        if tag in self.SKIP and self.skip:
            self.skip -= 1
        if tag == "main" and self.in_main:
            self.in_main -= 1

    def handle_data(self, data):
        if not self.skip:
            self.all.append(data)
            if self.in_main:
                self.main.append(data)


def words(html: str) -> list[str]:
    t = Text()
    t.feed(html)
    return re.findall(r"[\w'’-]+", " ".join(t.main or t.all).lower())


def shingles(w: list[str], k: int = 5) -> set[str]:
    return {" ".join(w[i : i + k]) for i in range(max(0, len(w) - k + 1))}


def make_getter(root: str | None):
    def get(url: str) -> str:
        if root and Path(url).is_file():
            return Path(url).read_text(encoding="utf-8", errors="replace")
        if root:
            p = Path(root) / urlparse(url).path.lstrip("/")
            if p.is_dir() or url.endswith("/") or not p.suffix:
                p = p / "index.html"
            return p.read_text(encoding="utf-8", errors="replace")
        req = urllib.request.Request(url, headers={"User-Agent": "catalog-seo-check/1"})
        return urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")

    return get


def locs(url: str, get) -> list[str]:
    out: list[str] = []
    for loc in re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", get(url)):
        out += locs(loc, get) if loc.endswith(".xml") else [loc]
    return out


def measure(pages: dict[str, list[str]]) -> list[tuple[str, int, int, float]]:
    sh = {u: shingles(w) for u, w in pages.items()}
    df = Counter(s for v in sh.values() for s in v)
    cut = max(2, THRESHOLD * len(pages))
    return [
        (u, len(w), len(set(w)), sum(1 for s in sh[u] if df[s] >= cut) / max(1, len(sh[u])))
        for u, w in pages.items()
    ]


def report(pages: dict[str, list[str]]) -> int:
    rows = measure(pages)
    n = len(rows)
    if n == 0:
        print("pages 0")
        return 2
    ws = [r[1] for r in rows]
    over = [r for r in rows if r[3] >= THRESHOLD]
    print(f"pages {n} words min/median/max {min(ws)}/{statistics.median(ws)}/{max(ws)} "
          f"distinct median {statistics.median(r[2] for r in rows)}")
    print(f"template share median {statistics.median(r[3] for r in rows):.2f} "
          f"mean {statistics.mean(r[3] for r in rows):.2f}  pages>={THRESHOLD}: {len(over)}")
    if n <= 300:
        sh = {u: shingles(w) for u, w in pages.items()}
        js = [len(sh[a] & sh[b]) / max(1, len(sh[a] | sh[b])) for a, b in itertools.combinations(sh, 2)]
        if js:
            print(f"pairwise Jaccard median {statistics.median(js):.3f} max {max(js):.3f}; "
                  f"pairs>=0.5: {sum(j >= 0.5 for j in js)} of {len(js)}")
    for r in sorted(over, key=lambda r: -r[3]):
        print(f"  FLOOR {r[0]} {r[3]:.2f}")
    if n < MIN_SET:
        print(f"note: {n} pages is below {MIN_SET}; the result is not used")
        return 0
    return 1 if over else 0


def self_test() -> int:
    assert shingles(["a", "b", "c", "d", "e", "f"]) == {"a b c d e", "b c d e f"}
    assert words("<nav>menu words here</nav><main>Body text</main><footer>x</footer>") == ["body", "text"]
    template = " ".join(f"shared template sentence number {i} appears on every page" for i in range(12))

    def tree(root: Path, unique: bool, count: int) -> None:
        loc = ""
        for i in range(count):
            body = " ".join(f"page {i} sentence {j} says something {i * 7 + j} entirely its own" for j in range(30)) \
                if unique else f"{template} unique{i} tail{i} extra{i} words{i} here{i}"
            d = root / f"p{i}"
            d.mkdir()
            (d / "index.html").write_text(f"<html><body><nav>menu</nav><main>{body}</main></body></html>")
            loc += f"<url><loc>https://example.com/p{i}/</loc></url>"
        (root / "sitemap.xml").write_text(f"<urlset>{loc}</urlset>")

    def run(unique: bool, count: int) -> int:
        with tempfile.TemporaryDirectory() as t:
            tree(Path(t), unique, count)
            get = make_getter(t)
            urls = locs("https://example.com/sitemap.xml", get)
            with contextlib.redirect_stdout(io.StringIO()):
                return report({u: words(get(u)) for u in urls})

    assert run(unique=True, count=12) == 0, "distinct pages pass"
    assert run(unique=False, count=12) == 1, "templated pages fail"
    assert run(unique=False, count=4) == 0, "below 10 pages the result is not used"
    print("shingle self-test: ok")
    return 0


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("sitemap", nargs="?", help="sitemap URL, or a file path with --root")
    p.add_argument("filter", nargs="?", help="regex; only matching page URLs are measured")
    p.add_argument("--root", help="read pages from this build directory instead of the network")
    p.add_argument("--self-test", action="store_true")
    a = p.parse_args()
    if a.self_test:
        return self_test()
    if not a.sitemap:
        p.error("SITEMAP is required")
    get = make_getter(a.root)
    try:
        urls = [u for u in locs(a.sitemap, get) if not a.filter or re.search(a.filter, u)]
    except (OSError, ValueError) as e:
        print(f"error: cannot read sitemap: {e}", file=sys.stderr)
        return 2
    pages: dict[str, list[str]] = {}
    for u in urls:
        try:
            pages[u] = words(get(u))
        except OSError as e:
            print("ERR", u, e)
    return report(pages)


if __name__ == "__main__":
    sys.exit(main())
