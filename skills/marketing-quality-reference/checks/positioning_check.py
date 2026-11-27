#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Checks for the positioning record (MKT-POS), the first-screen extractors (MKT-PAGE) and the
synthetic-performer figure check (MKT-VOICE-16).

Run from the repository root as `python3 -I positioning_check.py <command>`.
Exit 0 clean, 1 findings, 2 usage or missing input (no record, no file).

Record commands (read .agents/positioning.toml, override with --record):
  fields        MKT-POS-01, 02, 13  required keys, enums, line budget, do_not_say shape
  sourced       MKT-POS-03          an unreviewed draft sources or flags every field
  audience      MKT-POS-05          floor test for a generic audience
  alternatives  MKT-POS-06          first alternative is not "other tools"
  sentence      MKT-POS-07          one sentence, both nouns, no list, no banned trend word
  forbidden     MKT-POS-09          no forbidden variant on a governed surface
  drift         MKT-POS-08, 10, 11  all of the above plus surface match, lists, do_not_say
  denigration   MKT-POS-14          HTML_FILE: no ban word in a sentence naming a tool
  globs         MKT-POS-12          RULE_FILE [EXTRA_GLOB ...]: each glob is its own paths: item
First-screen extractors (MKT-PAGE, no record needed except hero-noun):
  readme-window README              first 15 non-blank, non-wrapper lines as path:line:text
  hero HTML                         line 1 H1, line 2 subhead, line 3 hero text
  hero-noun HTML                    MKT-PAGE-03: recorded category is in the H1 or subhead
  performer HTML                    MKT-VOICE-16: a flagged synthetic-performer figure holds media and its caption
  surface DIST [--need FILE]        MKT-PAGE-01, 02: doc-surface meta count and the / page gate
  surface-list VALUE DIST           MKT-PAGE-11: built pages that declare VALUE (--print0 for xargs -0)
  surface-pair BUILT SOURCE         MKT-PAGE-14: built meta and source comment name the same value

Shortcuts are named in the code. `--self-test` runs every command over the
fixtures in fixtures/positioning/ and exits non-zero on any surprise.
"""

from __future__ import annotations

import argparse
import atexit
import datetime
import fnmatch
import html
import json
import re
import shutil
import subprocess
import sys
import tempfile
import tomllib
from html.parser import HTMLParser
from pathlib import Path

RECORD = ".agents/positioning.toml"
REQ = ("status reviewed review_by owner style sentence category object "
       "forbidden audience non_target alternatives maturity").split()
STYLES = {"head-to-head", "big-fish-small-pond", "new-game", "ASK-OWNER"}
ASK = "ASK-OWNER"
MAX_RECORD_LINES = 80

# MKT-POS-09 scan scope: governed surfaces and docs prose, never agent config.
SURFACES = ["README.md", "*/README.md", "CHANGELOG.md", "Cargo.toml", "package.json", "pyproject.toml",
            "docs/**/*.md", "docs/**/*.mdx", "docs/**/*.astro", "site/**/*.md*", "website/**/*.md*",
            "dist/index.html"]
GLOBS = ["README.md", "**/README.md", "CHANGELOG.md", "Cargo.toml", "package.json",
         "pyproject.toml", ".agents/positioning.toml"]
# MKT-POS-07: three or more items, short items, with or without the Oxford comma.
LIST = re.compile(r"[\w'-]+(?: [\w'-]+){0,2}, [\w'-]+(?: [\w'-]+){0,2},? (?:and|or) [\w'-]+", re.I)
GENERIC_AUDIENCE = re.compile(r"^(developers|engineers|teams|everyone|anyone)( and (developers|teams))?\.?$", re.I)
GENERIC_ALT = {"other tools", "competitors", "alternatives", ""}
BAN = re.compile(r"\b(bloated|slow|clunky|ancient|outdated|legacy|dead|broken|painful|terrible|worse)\b", re.I)
WRAPPER = re.compile(r"^\s*(</?div|<p\s+align|</p>|<img|<picture|</picture>|<source|<br|\[!\[)", re.I)


class Missing(Exception):
    """A required input is absent: exit 2."""


def load(root: Path, record: str) -> dict:
    p = root / record
    if not p.is_file():
        raise Missing(f"no record at {p}: draft one with the positioning-brief skill and ask the owner (MKT-POS-03)")
    try:
        return tomllib.loads(p.read_text(encoding="utf-8"))
    except tomllib.TOMLDecodeError as e:
        raise Missing(f"{p} is not valid TOML: {e}")


def norm(s: str) -> str:
    """Whitespace, case, trailing period and a leading article do not count (MKT-POS-08)."""
    s = re.sub(r"\s+", " ", s).strip().lower().rstrip(".").strip()
    return re.sub(r"^(a|an|the) ", "", s)


# --- record checks ---------------------------------------------------------------

def fields(d: dict, text: str = "") -> list[str]:
    out = [f"MKT-POS-02: missing required field {k}" for k in REQ if not d.get(k)]
    out += [f"MKT-POS-02: missing table {k}" for k in ("lists", "do_not_say") if k not in d]
    if d.get("status") not in (None, "reviewed", "unreviewed"):
        out.append("MKT-POS-02: status must be reviewed or unreviewed")
    if d.get("style") and d["style"] not in STYLES:
        out.append("MKT-POS-02: style must be head-to-head, big-fish-small-pond or new-game")
    for a in d.get("alternatives", []):
        if not isinstance(a, dict) or not str(a.get("name", "")).strip():
            out.append("MKT-POS-02: every alternatives entry needs a name")
    for e in d.get("do_not_say", []):
        out += [f"MKT-POS-13: do_not_say entry lacks {k}" for k in ("pattern", "reason", "instead", "lift_when") if not e.get(k)]
    if text and len(text.splitlines()) > MAX_RECORD_LINES:
        out.append(f"MKT-POS-01: record is {len(text.splitlines())} lines, the limit is {MAX_RECORD_LINES}")
    return out


def sourced(d: dict, root: Path) -> list[str]:
    """MKT-POS-03. status, reviewed and review_by are set by the drafter, never sourced."""
    if d.get("status") != "unreviewed":
        return []
    bad, src = [], d.get("sources", {})
    for k in REQ[3:]:
        if ASK in json.dumps(d.get(k, "")):
            continue
        p, _, n = str(src.get(k, "")).rpartition(":")
        f = root / p
        if not (p and n.isdigit() and f.is_file() and 1 <= int(n) <= len(f.read_text(errors="replace").splitlines())):
            bad.append(f"MKT-POS-03: {k} has neither {ASK} nor a sources.{k} path:line that exists")
    return bad


def audience(d: dict) -> list[str]:
    a = str(d.get("audience", "")).strip()
    return ["MKT-POS-05: audience is a generic floor word, name one segment"] if GENERIC_AUDIENCE.match(a) else []


def alternatives(d: dict) -> list[str]:
    alts = d.get("alternatives") or [{}]
    first = str(alts[0].get("name", "")).strip().lower()
    return ["MKT-POS-06: the first alternative must be what the audience does today"] if first in GENERIC_ALT else []


def sentence(d: dict) -> list[str]:
    s, e = str(d.get("sentence", "")), []
    if re.search(r"[.!?] ", s):
        e.append("MKT-POS-07: more than one sentence")
    e += [f"MKT-POS-07: sentence lacks the {k} noun" for k in ("category", "object") if str(d.get(k, "")).lower() not in s.lower()]
    if LIST.search(s):
        e.append("MKT-POS-07: list of 3 or more items")
    tw = d.get("trend_words", {})
    if tw.get("hero") == "banned":
        e += [f"MKT-POS-07: trend word {w}" for w in tw.get("list", []) if w.lower() in s.lower()]
    return e


def _scan(root: Path):
    for g in SURFACES:
        for f in sorted(root.glob(g)):
            rel = f.relative_to(root).as_posix()
            if f.is_file() and "/node_modules/" not in rel:
                yield rel, f.read_text(errors="replace")


def forbidden(d: dict, root: Path) -> list[str]:
    terms = [t.lower() for t in d.get("forbidden", []) if t.strip() and t != ASK]  # a blank entry never matches everything
    allow, hits = d.get("forbidden_allow", []), []
    for rel, text in _scan(root):
        if any(fnmatch.fnmatch(rel, a) for a in allow):
            continue
        for i, line in enumerate(text.splitlines(), 1):
            hits += [f"MKT-POS-09: {rel}:{i}: forbidden variant {t!r}" for t in terms if t in line.lower()]
    return hits


def do_not_say(d: dict, root: Path) -> list[str]:
    hits = []
    for e in d.get("do_not_say", []):
        try:
            rx = re.compile(e["pattern"])
        except (KeyError, re.error):
            continue  # a missing or broken pattern is reported by fields()
        for rel, text in _scan(root):
            for i, line in enumerate(text.splitlines(), 1):
                if rx.search(line):
                    hits.append(f"MKT-POS-13: {rel}:{i}: do_not_say {e.get('text', e['pattern'])!r}")
    return hits


def globs(rule_text: str, extra: list[str] | tuple = ()) -> list[str]:
    """MKT-POS-12: every glob is its own `paths:` item, root names included."""
    fm = rule_text.split("---")[1] if rule_text.startswith("---") else ""
    items = {m.group(1) for m in re.finditer(r"(?m)^\s*-\s*['\"]?([^'\"\n]+?)['\"]?\s*$", fm)}
    return [f"MKT-POS-12: glob {g} is not its own paths: item" for g in [*GLOBS, *extra] if g not in items]


def denigration(text: str, names: list[str]) -> list[str]:
    """MKT-POS-14: a ban word in the same sentence as a named tool."""
    text = re.sub(r"<[^>]+>", " ", text)
    return ["MKT-POS-14: " + s.strip()[:120] for s in re.split(r"(?<=[.!?])\s+", text)
            if any(n.lower() in s.lower() for n in names if n) and BAN.search(s)]


# --- surfaces (MKT-POS-08, 10, 11) --------------------------------------------------

def readme_window(text: str, n: int = 15) -> list[tuple[int, str]]:
    """First n non-blank lines without HTML wrappers or badges, stopping at the first `## `."""
    out = []
    for i, line in enumerate(text.splitlines(), 1):
        if line.startswith("## "):
            break
        if line.strip() and not WRAPPER.match(line):
            out.append((i, line))
            if len(out) == n:
                break
    return out


def tagline(text: str) -> str:
    for _, line in readme_window(text):
        line = re.sub(r"^\s*>\s*", "", line).strip()
        if not line.startswith("#") and len(line.split()) >= 5:
            return line
    return ""


def manifest_description(name: str, text: str) -> str:
    try:
        if name == "Cargo.toml":
            t = tomllib.loads(text)
            return (t.get("package") or t.get("workspace", {}).get("package") or {}).get("description", "")
        if name == "package.json":
            return json.loads(text).get("description", "")
        if name == "pyproject.toml":
            return tomllib.loads(text).get("project", {}).get("description", "")
    except (tomllib.TOMLDecodeError, json.JSONDecodeError, AttributeError):
        return ""
    return ""


def source_surfaces(read) -> dict[str, str]:
    """README tagline and manifest descriptions. `read(rel)` returns text or None."""
    out = {}
    if (t := read("README.md")) is not None:
        out["README tagline"] = tagline(t)
    for m in ("Cargo.toml", "package.json", "pyproject.toml"):
        if (t := read(m)) is not None:
            out[f"{m} description"] = manifest_description(m, t)
    return {k: v for k, v in out.items() if v}


class Head(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title, self.meta, self.h1, self.surface, self._in = "", {}, [], [], None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ("title", "h1"):
            self._in = tag
            if tag == "h1":
                self.h1.append("")
        elif tag == "meta":
            key = a.get("name") or a.get("property")
            if key == "doc-surface":
                self.surface.append(a.get("content", ""))
            elif key:
                self.meta.setdefault(key, a.get("content", ""))

    def handle_endtag(self, tag):
        if tag == self._in:
            self._in = None

    def handle_data(self, d):
        if self._in == "title":
            self.title += d
        elif self._in == "h1":
            self.h1[-1] += d


def one_more_sentence(extra: str) -> bool:
    return len(re.findall(r"[.!?](?:\s|$)", extra.strip())) <= 1


def surface_match(d: dict, root: Path, dist: str, about: str | None, docs_home: str | None) -> list[str]:
    """MKT-POS-08: equality on four surfaces, nouns on the others."""
    want, out = norm(d["sentence"]), []
    for label, text in source_surfaces(lambda r: (root / r).read_text(errors="replace") if (root / r).is_file() else None).items():
        if norm(text) != want:
            out.append(f"MKT-POS-08: {label} differs from the record sentence: {text[:80]!r}")
    page = root / dist / "index.html"
    nouns = [str(d.get(k, "")).lower() for k in ("product", "category", "object") if d.get(k)]
    has_noun = lambda s: any(n and n in s.lower() for n in nouns)
    if page.is_file():
        h = Head()
        h.feed(page.read_text(errors="replace"))
        for key in ("description", "og:description"):
            got = norm(h.meta.get(key, ""))
            if not got.startswith(want) or not one_more_sentence(got[len(want):]):
                out.append(f"MKT-POS-08: built {key} is not the sentence plus at most one sentence: {h.meta.get(key, '')[:80]!r}")
        if not has_noun(h.title):
            out.append("MKT-POS-08: built <title> holds neither the product name, category nor object")
        for t in h.h1:
            if not has_noun(t) and str(d.get("category", "")).lower() not in h.title.lower():
                out.append(f"MKT-POS-08: h1 {t.strip()[:60]!r} is a slogan and the <title> does not carry the category")
    if about is not None and not norm(about).startswith(want):
        out.append("MKT-POS-08: the repository About text does not start with the sentence")
    if docs_home:
        f = root / docs_home
        lead = next((ln for _, ln in readme_window(f.read_text(errors="replace")) if len(ln.split()) >= 5 and not ln.startswith("#")), "") if f.is_file() else ""
        if not has_noun(lead):
            out.append("MKT-POS-08: the docs-home lead holds neither the product name, category nor object")
    return out


def list_findings(items: list[str], surfaces: dict[str, str], name: str = "list") -> list[str]:
    """MKT-POS-10: a surface naming 2 or more members must name all of them."""
    out = []
    for label, text in surfaces.items():
        seen = {i for i in items if re.search(rf"\b{re.escape(i)}s?\b", text, re.I)}
        if len(seen) >= 2 and seen != set(items):
            out.append(f"MKT-POS-10: {label} names {len(seen)} of {len(items)} members of [{name}]; render the list from its source or use a count")
    return out


def lists(d: dict, root: Path, surfaces: dict[str, str], run: bool) -> list[str]:
    out = []
    for name, spec in d.get("lists", {}).items():
        if not run or not isinstance(spec, dict) or not spec.get("extract"):
            continue
        cp = subprocess.run(spec["extract"], shell=True, cwd=root, capture_output=True, text=True)  # noqa: S602 owner-written command
        items = [ln.strip() for ln in cp.stdout.splitlines() if ln.strip()]
        out += list_findings(items, surfaces, name) if items else [f"MKT-POS-10: extract for [{name}] printed nothing (exit {cp.returncode})"]
    return out


def identity(d: dict, old: dict | None, cur_src: dict, old_src: dict, today: datetime.date) -> list[str]:
    """MKT-POS-04 via MKT-POS-11: no identity change while the record is unreviewed or stale."""
    rb = d.get("review_by")
    stale = d.get("status") != "reviewed" or (isinstance(rb, datetime.date) and rb < today)
    if not stale:
        return []
    out = []
    if old is not None:
        out += [f"MKT-POS-04: {k} changed while the record is unreviewed or past review_by" for k in ("sentence", "category", "object") if d.get(k) != old.get(k)]
    out += [f"MKT-POS-04: {k} changed while the record is unreviewed or past review_by" for k, v in cur_src.items() if k in old_src and v != old_src[k]]
    return out


def git_show(root: Path, ref: str, rel: str) -> str | None:
    cp = subprocess.run(["git", "show", f"{ref}:{rel}"], cwd=root, capture_output=True, text=True)
    return cp.stdout if cp.returncode == 0 else None


def drift(d: dict, root: Path, text: str, a) -> list[str]:
    out = fields(d, text) + audience(d) + alternatives(d) + sentence(d) + forbidden(d, root) + do_not_say(d, root)
    out += sourced(d, root)
    out += surface_match(d, root, a.dist, a.about, a.docs_home)
    surf = source_surfaces(lambda r: (root / r).read_text(errors="replace") if (root / r).is_file() else None)
    if (root / "README.md").is_file():
        surf["README"] = (root / "README.md").read_text(errors="replace")  # whole file: a list can sit anywhere in it
    page = root / a.dist / "index.html"
    if page.is_file():
        h = Head()
        h.feed(page.read_text(errors="replace"))
        surf.update({"built description": h.meta.get("description", ""), "built og:description": h.meta.get("og:description", "")})
    out += lists(d, root, surf, a.run_extract)
    if a.base:
        old_text = git_show(root, a.base, RECORD)
        old = tomllib.loads(old_text) if old_text else None
        old_src = source_surfaces(lambda r: git_show(root, a.base, r))
        cur_src = source_surfaces(lambda r: (root / r).read_text(errors="replace") if (root / r).is_file() else None)
        out += identity(d, old, cur_src, old_src, datetime.date.today())
    return out


# --- first-screen extractors (MKT-PAGE) ----------------------------------------------

def hero(t: str):
    """(H1, subhead, hero text) of the built page, or None when no <h1> follows the hero start."""
    m = re.search(r'<section\b[^>]*class="[^"]*hero', t) or re.search(r"<main\b", t)
    t = t[m.start():] if m else t
    s = re.search(r"<h1\b.*?(?=<h2\b|\Z)", t, re.S)
    if not s:
        return None
    s = s.group(0)
    x = lambda h: " ".join(html.unescape(re.sub(r"<[^>]+>", " ", h)).split())
    h1 = re.search(r"<h1\b.*?</h1>", s, re.S)
    sub = next((x(q) for q in re.findall(r"<p\b.*?</p>", s, re.S) if len(x(q).split()) >= 4), "")
    return x(h1.group(0)) if h1 else "", sub, x(re.sub(r"<(script|style)\b.*?</\1>", "", s, flags=re.S))


CAPTION = re.compile(r"synthetic performer|no human performer is depicted|modified or generated using artificial intelligence", re.I)
PERSON = re.compile(r"\b(person|people|presenter|host|actor|actress|avatar|spokesperson|speaker|narrator|voiceover|man|woman)\b", re.I)


class Figures(HTMLParser):
    """MKT-VOICE-16: every <figure data-synthetic-performer> holds media and its own figcaption."""

    def __init__(self):
        super().__init__()
        self.stack, self.figs, self.loose = [], [], []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "figure":
            f = {"flag": "data-synthetic-performer" in a, "media": 0, "cap": "", "incap": False}
            self.figs.append(f)
            self.stack.append(f)
        elif tag == "figcaption" and self.stack:
            self.stack[-1]["incap"] = True
        elif tag in ("img", "video", "audio"):
            f = self.stack[-1] if self.stack else None
            if f is not None:
                f["media"] += 1
            if PERSON.search(a.get("alt", "") + " " + a.get("aria-label", "")) and not (f and f["flag"]):
                self.loose.append((a.get("alt") or a.get("aria-label") or "").strip())

    def handle_endtag(self, tag):
        if tag == "figcaption" and self.stack:
            self.stack[-1]["incap"] = False
        if tag == "figure" and self.stack:
            self.stack.pop()

    def handle_data(self, d):
        if self.stack and self.stack[-1]["incap"]:
            self.stack[-1]["cap"] += d


def performer(text: str) -> tuple[list[str], list[str]]:
    """(failures, READ lines). READ lines ask a human and never fail the run."""
    p = Figures()
    p.feed(text)
    bad = ["MKT-VOICE-16: a flagged figure has no media, or no matching figcaption inside it"
           for f in p.figs if f["flag"] and not (f["media"] and CAPTION.search(f["cap"]))]
    return bad, [f"READ media alt names a person but its figure is not flagged: {a}" for a in p.loose]


SURFACE_VALUES = {"pitch", "home", "offer"}
SOURCE_DECL = re.compile(r"doc_surface:\s*(\w+)")


def built_surfaces(dist: Path) -> dict[str, tuple[list[str], int]]:
    """path -> (doc-surface meta values, number of <h1> elements) for every built page."""
    out = {}
    for f in sorted(dist.rglob("*.html")):
        h = Head()
        h.feed(f.read_text(errors="replace"))
        out[f.relative_to(dist).as_posix()] = (h.surface, len(h.h1))
    return out


def surface_findings(pages: dict, need: str | None) -> tuple[list[str], str]:
    out, counts = [], {v: 0 for v in SURFACE_VALUES}
    for path, (vals, _) in pages.items():
        out += [f"MKT-PAGE-02: {path}: doc-surface value {v!r} is not pitch, home or offer" for v in vals if v not in SURFACE_VALUES]
        if len(vals) > 1:
            out.append(f"MKT-PAGE-02: {path}: {len(vals)} doc-surface metas, expected 1")
        for v in vals[:1]:
            counts[v] = counts.get(v, 0) + 1
    skipped = sum(1 for vals, _ in pages.values() if not vals)
    if need:
        if need not in pages:
            out.append(f"MKT-PAGE-02: {need} is not in the build")
        elif pages[need][1] >= 1 and not pages[need][0]:
            out.append(f"MKT-PAGE-02: {need}: has an <h1> and no doc-surface meta")
    return out, f"pitch={counts['pitch']} home={counts['home']} offer={counts['offer']} skipped_no_doc_surface={skipped}"


def source_surface(text: str) -> str | None:
    """The doc_surface source comment: first 12 lines after any front matter."""
    m = re.match(r"---\n.*?\n---\n", text, re.S)
    body = text[m.end():] if m else text
    d = SOURCE_DECL.search("\n".join(body.splitlines()[:12]))
    return d.group(1) if d else None


# --- self-test -------------------------------------------------------------------------

def self_test() -> int:
    here = Path(__file__).resolve().parent / "fixtures" / "positioning"
    n = 0
    tmp = Path(tempfile.mkdtemp())
    atexit.register(shutil.rmtree, tmp, ignore_errors=True)

    def stage(name):
        """Copy a fixture tree out, renaming readme.txt to README.md: the catalog bans an upper-case stem in the tree."""
        dst = tmp / name
        shutil.copytree(here / name, dst)
        (dst / "readme.txt").rename(dst / "README.md")
        return dst

    def ok(cond, what):
        nonlocal n
        if not cond:
            raise AssertionError(what)
        n += 1

    base = dict(status="reviewed", reviewed="x", review_by="y", owner="o", style="new-game", sentence="s",
                category="package manager", object="AI-agent config", forbidden=["AI artifacts"], audience="a",
                non_target=["b"], alternatives=[{"name": "c"}], maturity="m", lists={}, do_not_say=[])
    S = lambda s, **kw: sentence({**base, "sentence": s, **kw})
    ok(S("Package manager for AI-agent config, installed into each coding agent in the format it reads.") == [], "good sentence")
    for s in ("Package manager for AI-agent config: skills, rules, and agents.",
              "Package manager for AI-agent config: skills, rules and agents.",
              "Package manager for AI-agent config for Claude Code, Cursor or Codex CLI."):
        ok(any("list of 3" in e for e in S(s)), s)
    ok(any("lacks the object" in e for e in S("The simple package manager")), "missing object noun")
    ok(any("more than one" in e for e in S("Package manager for AI-agent config. Fast.")), "two sentences")
    ok(any("trend word agentic" in e for e in S("Agentic package manager for AI-agent config",
                                                trend_words={"hero": "banned", "list": ["agentic"]})), "trend word")
    ok(fields(base) == [] and len(fields({k: v for k, v in base.items() if k != "style"})) == 1, "fields")
    ok(any("lists" in e for e in fields({k: v for k, v in base.items() if k != "lists"})), "lists table required")
    ok(audience({**base, "audience": "developers and teams"}) != [] and audience({**base, "audience": "Platform engineers who pin CLI tools"}) == [], "audience floor")
    ok(alternatives({**base, "alternatives": [{"name": "Other tools"}]}) != [] and alternatives(base) == [], "generic alternative")
    ok(denigration("apt ships Node 18. Our legacy mode is opt-in.", ["apt"]) == [], "no ban word beside a name")
    ok(len(denigration("<p>apt ships ancient Node.</p> mytool is new.", ["apt"])) == 1, "denigration hit")
    fm = '---\npaths:\n  - "README.md"\n  - \'**/README.md\'\n  - CHANGELOG.md\n  - README.md.bak\n---\nbody\n'
    ok(len(globs(fm)) == 4 and globs("no frontmatter") != [], "globs reports missing items")
    ok((here / "pass" / "rule.md").is_file() and globs((here / "pass" / "rule.md").read_text()) == [], "globs fixture passes")
    ok(list_findings(["skill", "rule", "agent"], {"x": "Works with skills and rules."}) != [], "partial list fails")
    ok(list_findings(["skill", "rule", "agent"], {"x": "Works with skills, rules and agents."}) == [], "full list passes")
    ok(list_findings(["skill", "rule", "agent"], {"x": "Manages skills."}) == [], "one member is not a list")
    ok(norm("A Package manager.") == norm("package  manager"), "norm article, case, period")
    ok(tagline("# t\n\n[![ci](x)](y)\n<p align=center>\nShort.\nPackage manager for AI-agent config here.\n") == "Package manager for AI-agent config here.", "tagline")
    today = datetime.date(2026, 11, 27)
    draft = {**base, "status": "unreviewed", "review_by": today}
    ok(identity(draft, {**base, "sentence": "old"}, {}, {}, today) != [], "identity change while unreviewed")
    ok(identity(base | {"review_by": datetime.date(2027, 5, 27)}, {**base, "sentence": "old"}, {}, {}, today) == [], "reviewed record may change")
    ok(identity(draft, None, {"README tagline": "new"}, {"README tagline": "old"}, today) != [], "surface change while unreviewed")

    root = stage("pass")
    a = argparse.Namespace(dist="dist", about=None, docs_home=None, run_extract=shutil.which("sh") is not None, base=None)
    d = load(root, RECORD)
    ok(drift(d, root, (root / RECORD).read_text(), a) == [], f"pass tree is clean: {drift(d, root, (root / RECORD).read_text(), a)}")
    ok(surface_match(d, root, "dist", "Package manager for AI-agent config, installed into each coding agent in the format it reads. More.", "docs/intro.md") == [], "about and docs lead")
    ok(surface_match(d, root, "dist", "Something else", None) != [], "about mismatch")

    root = stage("fail")
    d = load(root, RECORD)
    got = "\n".join(drift(d, root, (root / RECORD).read_text(), a))
    for needle in ("MKT-POS-05", "MKT-POS-06", "MKT-POS-08: Cargo.toml description", "MKT-POS-08: README tagline",
                   "built description", "built og:description", "built <title>", "slogan", "MKT-POS-09", "MKT-POS-13"):
        ok(needle in got, f"fail tree reports {needle}")
    if a.run_extract:
        ok("MKT-POS-10" in got, "fail tree reports a partial list")

    root = stage("draft")
    d = load(root, RECORD)
    ok(fields(d) == [] and sourced(d, root) == [], f"draft is complete: {fields(d)} {sourced(d, root)}")
    ok(sourced({**d, "owner": "someone"}, root) != [], "an unsourced, unflagged field fails")
    ok(sourced({**d, "sources": {**d["sources"], "maturity": "README.md:99999"}}, root) != [], "a source line that does not exist fails")

    hp = (here / "hero" / "pass.html").read_text()
    h = hero(hp)
    ok(h is not None and h[0] == "Same tools. Every machine." and h[1].startswith("The package manager"), "hero skips the site-title h1")
    ok(hero((here / "hero" / "none.html").read_text()) is None, "no h1 is a failed first screen")
    pf = lambda n: performer((here / "performer" / n).read_text())
    ok(pf("pass.html") == ([], []), "a correct flagged figure passes")
    ok(len(pf("fail-footer.html")[0]) == 1, "a caption in the footer fails")
    ok(len(pf("fail-other-figure.html")[0]) == 1, "a caption in another figure fails")
    ok(pf("read.html")[0] == [] and len(pf("read.html")[1]) == 1, "an unflagged person alt prints READ")
    pages = built_surfaces(here / "surface")
    f, summary = surface_findings(pages, "index.html")
    ok(summary == "pitch=1 home=1 offer=0 skipped_no_doc_surface=1" and f == [], f"surface counts {summary} {f}")
    f, _ = surface_findings(pages | {"index.html": ([], 1)}, "index.html")
    ok(any("has an <h1> and no doc-surface meta" in x for x in f), "the / page needs a declaration")
    f, _ = surface_findings({"index.html": (["pitch", "home"], 1), "a.html": (["landing"], 1)}, None)
    ok(len(f) == 2, "a doubled meta and an unknown value fail")
    ok(source_surface("---\ntitle: x\n---\n<!-- doc_surface: pitch -->\nbody") == "pitch" and source_surface("no declaration") is None, "source comment")
    print(f"self-test ok ({n} checks)")
    return 0


# --- CLI --------------------------------------------------------------------------------

def main(argv: list[str]) -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--root", default=".", help="repository root (default: .)")
    p.add_argument("--record", default=RECORD, help=f"record path under the root (default: {RECORD})")
    p.add_argument("--self-test", action="store_true", help="run every command over the bundled fixtures")
    sub = p.add_subparsers(dest="cmd")
    for c in ("fields", "sourced", "audience", "alternatives", "sentence", "forbidden"):
        sub.add_parser(c)
    dr = sub.add_parser("drift")
    dr.add_argument("--dist", default="dist", help="built site directory under the root (default: dist)")
    dr.add_argument("--about", help="the repository About text, read with gh repo view")
    dr.add_argument("--docs-home", help="docs-home file under the root, for its lead sentence")
    dr.add_argument("--base", help="git ref: fail on an identity change while the record is unreviewed or stale")
    dr.add_argument("--run-extract", action="store_true", help="run each [lists.*] extract command (owner-written shell)")
    sub.add_parser("denigration").add_argument("html")
    g = sub.add_parser("globs")
    g.add_argument("rule")
    g.add_argument("extra", nargs="*")
    sub.add_parser("readme-window").add_argument("readme")
    sub.add_parser("hero").add_argument("html")
    sub.add_parser("hero-noun").add_argument("html")
    sub.add_parser("performer").add_argument("html")
    sf = sub.add_parser("surface")
    sf.add_argument("dist")
    sf.add_argument("--need", help="built page that must declare a surface when it has an <h1>, such as index.html")
    sl = sub.add_parser("surface-list")
    sl.add_argument("value")
    sl.add_argument("dist")
    sl.add_argument("--print0", action="store_true", help="NUL-separate the paths for xargs -0")
    sp = sub.add_parser("surface-pair")
    sp.add_argument("built")
    sp.add_argument("source")
    a = p.parse_args(argv)
    if a.self_test:
        try:
            return self_test()
        except AssertionError as e:
            print(f"self-test FAILED: {e}", file=sys.stderr)
            return 1
    if not a.cmd:
        p.print_usage(sys.stderr)
        return 2
    root = Path(a.root)
    try:
        if a.cmd == "globs":
            out = globs(Path(a.rule).read_text(encoding="utf-8"), a.extra)
        elif a.cmd == "readme-window":
            out = [f"{a.readme}:{i}:{ln}" for i, ln in readme_window(Path(a.readme).read_text(encoding="utf-8", errors="replace"))]
            print("\n".join(out))
            return 0
        elif a.cmd == "performer":
            bad, reads = performer(Path(a.html).read_text(encoding="utf-8", errors="replace"))
            print("\n".join(bad + reads) if bad or reads else "ok")
            return 1 if bad else 0
        elif a.cmd == "surface":
            if not Path(a.dist).is_dir():
                raise Missing(f"{a.dist} is not a directory")
            out, summary = surface_findings(built_surfaces(Path(a.dist)), a.need)
            print(summary)
        elif a.cmd == "surface-list":
            pages = built_surfaces(Path(a.dist))
            hits = [str(Path(a.dist) / p) for p, (v, _) in pages.items() if a.value in v]
            sep = "\0" if a.print0 else "\n"
            sys.stdout.write("".join(h + sep for h in hits))
            return 0
        elif a.cmd == "surface-pair":
            h = Head()
            h.feed(Path(a.built).read_text(encoding="utf-8", errors="replace"))
            src = source_surface(Path(a.source).read_text(encoding="utf-8", errors="replace"))
            out = [f"MKT-PAGE-14: built={h.surface} source={src}"] if src is not None and h.surface != [src] else []
        elif a.cmd == "hero":
            h = hero(Path(a.html).read_text(encoding="utf-8", errors="replace"))
            if h is None:
                print(f"{a.html}: no <h1> in the hero segment, the first screen fails", file=sys.stderr)
                return 1
            print("\n".join(h))
            return 0
        elif a.cmd == "hero-noun":
            d = load(root, a.record)
            h = hero(Path(a.html).read_text(encoding="utf-8", errors="replace"))
            if h is None:
                print(f"{a.html}: no <h1> in the hero segment, the first screen fails", file=sys.stderr)
                return 1
            noun = str(d.get("category", ""))
            out = [] if noun and noun.lower() in f"{h[0]} {h[1]}".lower() else [f"MKT-PAGE-03: category {noun!r} is in neither the H1 nor the subhead"]
        elif a.cmd == "denigration":
            d = load(root, a.record)
            names = [x["name"] for x in d.get("alternatives", []) if x.get("kind") == "tool"]
            out = denigration(Path(a.html).read_text(encoding="utf-8", errors="replace"), names)
        else:
            d = load(root, a.record)
            text = (root / a.record).read_text(encoding="utf-8")
            out = {"fields": lambda: fields(d, text), "sourced": lambda: sourced(d, root), "audience": lambda: audience(d),
                   "alternatives": lambda: alternatives(d), "sentence": lambda: sentence(d), "forbidden": lambda: forbidden(d, root),
                   "drift": lambda: drift(d, root, text, a)}[a.cmd]()
    except Missing as e:
        print(f"positioning_check: {e}", file=sys.stderr)
        return 2
    except OSError as e:
        print(f"positioning_check: {e}", file=sys.stderr)
        return 2
    print("\n".join(out) if out else "ok")
    return 1 if out else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
