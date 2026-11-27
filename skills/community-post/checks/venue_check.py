#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Venue checks for the community-post skill.

Rules covered:
  CH-COM-06  a maker's Show HN title (read from the first line of the draft)
  CH-COM-25  a failure prints the failing clause and the matched span, quoted,
             and never a corrected title or any alternative wording
  CH-COM-08  vote and boost solicitation patterns on announcement surfaces
  CH-COM-24  search-visibility claims about a Discord server
  CH-COM-21  a Discord invite that never expires (the `invite` subcommand)
  CH-COM-23  Discord verification level and AutoMod (the `invite` subcommand)

The script only reads. It never writes, edits or rewrites a draft: on Hacker
News the maker's text is human-written, and an edit by a tool is AI-edited text.

Usage:
  venue_check.py title DRAFT [--url URL] [--product NAME ...] [--acronyms FILE]
  venue_check.py solicit PATH ...
  venue_check.py claims [--invite FILE] PATH ...
  venue_check.py invite FILE
  venue_check.py --self-test

`invite FILE` reads the JSON that
`curl -s 'https://discord.com/api/v9/invites/CODE?with_counts=true'` returns.

Exit codes: 0 clean, 1 findings, 2 usage or unreadable input.
Run as: python3 -I venue_check.py ...
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

FIXTURES = Path(__file__).resolve().parent / "fixtures" / "venue"
SKIP_DIRS = {".git", "node_modules", ".agents", "fixtures"}

SUPERLATIVE_RE = re.compile(r"\b(best|fastest|biggest)\b", re.IGNORECASE)
FIRST_RE = re.compile(r"\b(the|world'?s) first\b", re.IGNORECASE)
VERSION_RE = re.compile(r"v?[0-9]+\.[0-9]+\.[0-9]+")
CAPS_RE = re.compile(r"[A-Z]{5,}")
SOLICIT_RE = re.compile(
    r"upvote|up-vote|vote (for|on|us|it)|support us on"
    r"|(hn|hacker news)[^.]{0,40}(vote|upvote|comment)"
    r"|front page of (hn|hacker news)|(news\.)?ycombinator\.com/item",
    re.IGNORECASE,
)
SEARCH_RE = re.compile(r"search(able)?|indexed|google", re.IGNORECASE)


def site_name(url: str) -> str:
    """The host without `www.` and without its last label: github.com gives github."""
    host = re.sub(r"^[a-z]+://", "", url.strip()).split("/")[0].split(":")[0].lower()
    host = re.sub(r"^www\.", "", host)
    return host.rsplit(".", 1)[0] if "." in host else host


def check_title(
    title: str,
    url: str = "",
    products: tuple[str, ...] = (),
    acronyms: frozenset[str] = frozenset(),
) -> list[str]:
    """CH-COM-06. Each finding is `CH-COM-06 <clause>: "<span from the title>"`."""
    out: list[str] = []

    def hit(clause: str, span: str) -> None:
        out.append(f'CH-COM-06 {clause}: "{span}"')

    if not title.startswith("Show HN: "):
        head = title.split(":", 1)[0]
        if len(head) > 20:
            head = head[:20].rsplit(" ", 1)[0] if " " in head[:21] else head[:20]
        hit("prefix", head)
    for m in re.finditer(r"!", title):
        hit("exclamation", title[max(0, m.start() - 8) : m.end()])
    for m in SUPERLATIVE_RE.finditer(title):
        hit("superlative", m.group(0))
    for m in FIRST_RE.finditer(title):
        hit("superlative", m.group(0))
    name = site_name(url) if url else ""
    if name and name not in {p.lower() for p in products}:
        m = re.search(rf"\b{re.escape(name)}\b", title, re.IGNORECASE)
        if m:
            hit("site name", m.group(0))
    for m in VERSION_RE.finditer(title):
        hit("version number", m.group(0))
    for m in CAPS_RE.finditer(title):
        if m.group(0) not in acronyms:
            hit("capitals", m.group(0))
    return out


def read_acronyms(path: Path | None) -> frozenset[str]:
    if path is None:
        return frozenset()
    lines = path.read_text(encoding="utf-8").splitlines()
    return frozenset(s.strip() for s in lines if s.strip() and not s.startswith("#"))


def walk(paths: list[str]) -> list[Path]:
    files: list[Path] = []
    for raw in paths:
        p = Path(raw)
        if p.is_dir():
            files += sorted(
                f
                for f in p.rglob("*")
                if f.is_file() and not (set(f.relative_to(p).parts[:-1]) & SKIP_DIRS)
            )
        elif p.is_file():
            files.append(p)
        else:
            raise FileNotFoundError(raw)
    return files


def scan_lines(files: list[Path], pattern: re.Pattern[str], tag: str, label: str) -> list[str]:
    out: list[str] = []
    for f in files:
        try:
            text = f.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        for n, line in enumerate(text.splitlines(), 1):
            m = pattern.search(line)
            if m:
                out.append(f'{f}:{n}: {tag} {label}: "{m.group(0)}"')
    return out


def check_claims(files: list[Path], discoverable: bool) -> list[str]:
    """CH-COM-24: a line that names Discord and a search term needs DISCOVERABLE."""
    if discoverable:
        return []
    out: list[str] = []
    for f in files:
        try:
            text = f.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        for n, line in enumerate(text.splitlines(), 1):
            m = SEARCH_RE.search(line)
            if m and re.search(r"discord", line, re.IGNORECASE):
                out.append(f'{f}:{n}: CH-COM-24 search claim: "{m.group(0)}"')
    return out


def check_invite(data: dict) -> tuple[list[str], list[str]]:
    """Returns (findings, info). CH-COM-21 and CH-COM-23 can fail; CH-COM-24 is info."""
    guild = data.get("guild") or {}
    features = guild.get("features") or []
    findings: list[str] = []
    if data.get("expires_at") is not None:
        findings.append(f'CH-COM-21 invite expires: "{data.get("expires_at")}"')
    level = guild.get("verification_level")
    if not isinstance(level, int) or level < 1:
        findings.append(f'CH-COM-23 verification_level: "{level}"')
    if "AUTO_MODERATION" not in features:
        findings.append('CH-COM-23 feature: "AUTO_MODERATION" missing')
    info = [f"CH-COM-24 DISCOVERABLE: {'yes' if 'DISCOVERABLE' in features else 'no'}"]
    return findings, info


def load_invite(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def self_test() -> int:
    bad: list[str] = []

    def expect(cond: bool, what: str) -> None:
        if not cond:
            bad.append(what)

    acr = read_acronyms(FIXTURES / "acronyms.txt")
    pass_title = (FIXTURES / "hn-pass.md").read_text(encoding="utf-8").splitlines()[0]
    expect(check_title(pass_title, "https://github.com/example/mytool") == [], "hn-pass is clean")

    fail_text = (FIXTURES / "hn-fail.md").read_text(encoding="utf-8")
    fail_title = fail_text.splitlines()[0]
    found = check_title(fail_title, "https://github.com/example/mytool")
    clauses = {re.match(r"CH-COM-06 ([a-z ]+):", s).group(1) for s in found}  # type: ignore[union-attr]
    for want in ("exclamation", "superlative", "version number", "capitals"):
        expect(want in clauses, f"hn-fail reports {want}")
    # CH-COM-25: every quoted span is a substring of the draft, and no line is a title.
    for s in found:
        for span in re.findall(r'"([^"]*)"', s):
            expect(span in fail_title, f"span {span!r} is quoted from the draft")
        expect("Show HN:" not in s, "a finding never carries a title")

    site = (FIXTURES / "hn-fail-site.md").read_text(encoding="utf-8").splitlines()[0]
    expect(
        any("site name" in s for s in check_title(site, "https://github.com/example/mytool")),
        "hn-fail-site reports the site name",
    )
    expect(
        not any(
            "site name" in s
            for s in check_title(site, "https://github.com/example/mytool", ("github",))
        ),
        "the product's own name is not a site-name finding",
    )
    prefix = (FIXTURES / "hn-fail-prefix.md").read_text(encoding="utf-8").splitlines()[0]
    expect(any("prefix" in s for s in check_title(prefix)), "hn-fail-prefix reports the prefix")
    expect(
        check_title("ocx, a package manager")[:1] == ['CH-COM-06 prefix: "ocx, a package"'],
        "prefix span ends at a word boundary",
    )
    expect(
        check_title(prefix)[:1] == ['CH-COM-06 prefix: "Mytool"'],
        "prefix span stops at the first colon",
    )
    expect(
        any("capitals" in s for s in check_title("Show HN: Mytool, an ASCII table renderer")),
        "capitals fail without an allow-list",
    )
    expect(
        check_title("Show HN: Mytool, an ASCII table renderer", acronyms=acr) == [],
        "capitals pass with the allow-list",
    )
    expect(check_title("Show HN: A first-class table renderer") == [], "first-class passes")
    expect(
        any("superlative" in s for s in check_title("Show HN: The first table renderer")),
        "the first fails",
    )

    clean = walk([str(FIXTURES / "solicit-pass")])
    dirty = walk([str(FIXTURES / "solicit-fail")])
    expect(
        scan_lines(clean, SOLICIT_RE, "CH-COM-08", "solicitation") == [], "solicit-pass is clean"
    )
    expect(
        len(scan_lines(dirty, SOLICIT_RE, "CH-COM-08", "solicitation")) >= 2,
        "solicit-fail has hits",
    )

    claim_pass = [FIXTURES / "claims-pass.md"]
    claim_fail = [FIXTURES / "claims-fail.md"]
    expect(check_claims(claim_pass, False) == [], "claims-pass is clean")
    expect(len(check_claims(claim_fail, False)) == 1, "claims-fail has one hit")
    expect(check_claims(claim_fail, True) == [], "a DISCOVERABLE server clears the claim")

    findings, info = check_invite(load_invite(FIXTURES / "invite-small.json"))
    expect(
        len(findings) == 3 and info == ["CH-COM-24 DISCOVERABLE: no"],
        "invite-small fails three gates",
    )
    findings, info = check_invite(load_invite(FIXTURES / "invite-discoverable.json"))
    expect(
        findings == [] and info == ["CH-COM-24 DISCOVERABLE: yes"], "invite-discoverable is clean"
    )

    before = hashlib.sha256((FIXTURES / "hn-fail.md").read_bytes()).hexdigest()
    check_title(fail_title)
    after = hashlib.sha256((FIXTURES / "hn-fail.md").read_bytes()).hexdigest()
    expect(before == after, "the draft is never modified")

    for what in bad:
        print(f"self-test FAILED: {what}")
    print(f"self-test: {'FAILED' if bad else 'ok'}, {len(bad)} failures")
    return 1 if bad else 0


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument(
        "--self-test", action="store_true", help="run the checks over the bundled fixtures"
    )
    sub = ap.add_subparsers(dest="cmd")
    t = sub.add_parser("title", help="CH-COM-06 and CH-COM-25 over the first line of a draft")
    t.add_argument("draft")
    t.add_argument("--url", default="", help="the URL the Show HN submits")
    t.add_argument("--product", action="append", default=[], help="a name the title may contain")
    t.add_argument("--acronyms", help="file of allowed 5+ capital words, one per line")
    s = sub.add_parser("solicit", help="CH-COM-08 patterns over announcement surfaces")
    s.add_argument("paths", nargs="+")
    c = sub.add_parser("claims", help="CH-COM-24 search-visibility claims")
    c.add_argument("--invite", help="invite API JSON; a DISCOVERABLE feature clears the claim")
    c.add_argument("paths", nargs="+")
    i = sub.add_parser("invite", help="CH-COM-21, 23 and 24 over invite API JSON")
    i.add_argument("file")
    args = ap.parse_args(argv)

    if args.self_test:
        return self_test()
    try:
        if args.cmd == "title":
            lines = Path(args.draft).read_text(encoding="utf-8").splitlines()
            if not lines or not lines[0].strip():
                print(f"{args.draft}: empty first line", file=sys.stderr)
                return 2
            acr = read_acronyms(Path(args.acronyms) if args.acronyms else None)
            out = check_title(lines[0], args.url, tuple(args.product), acr)
        elif args.cmd == "solicit":
            out = scan_lines(walk(args.paths), SOLICIT_RE, "CH-COM-08", "solicitation")
            if out:
                out.append("every hit needs a human verdict; never auto-edit a hit")
        elif args.cmd == "claims":
            discoverable = bool(args.invite) and "DISCOVERABLE" in (
                (load_invite(Path(args.invite)).get("guild") or {}).get("features") or []
            )
            out = check_claims(walk(args.paths), discoverable)
        elif args.cmd == "invite":
            out, info = check_invite(load_invite(Path(args.file)))
            for line in info:
                print(line)
        else:
            ap.print_usage(sys.stderr)
            return 2
    except (OSError, json.JSONDecodeError, FileNotFoundError) as err:
        print(f"venue_check.py: {err}", file=sys.stderr)
        return 2
    for line in out:
        print(line)
    return 1 if out else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
