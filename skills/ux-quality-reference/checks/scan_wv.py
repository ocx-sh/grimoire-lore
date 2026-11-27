#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Scan webview template literals and stylesheets for UX-A11Y-03, 04 and 35.

Controls: tokenises each open tag of a control in .ts, .js and .html source,
reading past `${...}` substitutions, and classes it by its name source:
  aria-label  the tag carries aria-label, aria-labelledby or label=
  text        the control has body text, a wrapping <label>, or a matching <label for>
  title-only  only a title attribute names it (axe passes this, UX-A11Y-04 fails it)
              A body that is only a ${...} substitution counts as text: list those
              with --list and read what the substitution holds.
  UNNAMED     nothing names it (UX-A11Y-03 and 04)
Colours: in .css, and in colour-bearing lines of .ts, a hex value that is not a
var(--vscode-*, fallback) fallback is a UX-A11Y-35 SHOULD finding (reported, house
policy). Comment lines are skipped.

Usage:
  scan_wv.py [DIR ...] [--list TAG ...] [--self-test]
Output: `path:line: tag KIND` for each finding, then a count per (tag, class).
Exit codes: 0 clean, 1 findings (UNNAMED, title-only or a hex colour), 2 usage.
"""

from __future__ import annotations

import argparse
import re
import sys
from collections import Counter
from pathlib import Path

TAGS = "button|input|select|textarea|a|vscode-button|vscode-icon|vscode-textfield|summary"
OPEN = re.compile(r"<(" + TAGS + r")(?![-\w])")
SOURCE = {".ts", ".js", ".html"}
SKIP_DIRS = {"node_modules", ".git", "dist", "build", "out", "fixtures"}
HEX = re.compile(r"#[0-9a-fA-F]{3,8}\b")
VSCODE_FALLBACK = re.compile(r"var\(\s*--vscode-[\w-]+\s*,[^;{}]*\)")
COLOUR_LINE = re.compile(r"(color|background|border|outline|fill|stroke|shadow)", re.IGNORECASE)


def open_tag(s: str, i: int) -> tuple[str, int]:
    depth, j = 0, i
    while j < len(s):
        if s.startswith("${", j):
            depth += 1
            j += 2
            continue
        c = s[j]
        if c == "}" and depth:
            depth -= 1
        elif c == ">" and depth == 0:
            return s[i : j + 1], j + 1
        j += 1
    return s[i:], len(s)


def classify(s: str, m: re.Match) -> tuple[str, int, str]:
    tag = m.group(1)
    t, end = open_tag(s, m.start())
    close = s.find(f"</{tag}>", end)
    body = s[end:close] if close > 0 and close - end < 600 else ""
    text = re.sub(r"<[^>]*>", "", re.sub(r"\$\{[^}]*\}", "X", body)).strip()
    line = s.count("\n", 0, m.start()) + 1
    if tag == "input" and re.search(r"""type=["']hidden["']""", t):
        return tag, line, "skip"
    if re.search(r"aria-label|aria-labelledby|(?<![-\w])label=", t):
        return tag, line, "aria-label"
    if tag == "input" and re.search(r"""type=["'](submit|button)["'][^>]*value=""", t):
        return tag, line, "text"
    if text:
        return tag, line, "text"
    if tag in ("input", "select", "textarea", "vscode-textfield"):
        before = s[: m.start()]
        wrapped = before.rfind("<label") > before.rfind("</label>")
        ident = re.search(r"""\bid=["']([^"'$]+)["']""", t)
        if wrapped or (
            ident and re.search(r"""\bfor=["']""" + re.escape(ident.group(1)) + r"""["']""", s)
        ):
            return tag, line, "text"
    if re.search(r"\stitle=", t):
        return tag, line, "title-only"
    return tag, line, "UNNAMED"


def scan_file(path: Path) -> tuple[list[tuple[int, str, str]], list[tuple[int, str]]]:
    s = path.read_text(encoding="utf-8", errors="replace")
    controls = (
        []
        if path.suffix == ".css"
        else [(line, tag, kind) for tag, line, kind in (classify(s, m) for m in OPEN.finditer(s))]
    )
    hexes = []
    for n, raw in enumerate(s.split("\n"), 1):
        if re.match(r"\s*(/\*|\*|//)", raw):
            continue
        if path.suffix == ".ts" and not COLOUR_LINE.search(raw):
            continue
        if path.suffix == ".js" and not COLOUR_LINE.search(raw):
            continue
        if path.suffix == ".html" and not COLOUR_LINE.search(raw):
            continue
        stripped = VSCODE_FALLBACK.sub("", raw)
        if HEX.search(stripped):
            hexes.append((n, HEX.search(stripped).group(0)))
    return controls, hexes


def files_under(roots: list[Path]):
    for root in roots:
        if root.is_file():
            yield root
            continue
        for p in sorted(root.rglob("*")):
            if (
                p.is_file()
                and p.suffix in SOURCE | {".css"}
                and not (SKIP_DIRS & set(p.parts))
                and not p.name.endswith(".d.ts")
            ):
                yield p


def scan(roots: list[Path], listing: list[str]) -> tuple[Counter, list[str]]:
    counts: Counter = Counter()
    findings: list[str] = []
    for p in files_under(roots):
        controls, hexes = scan_file(p)
        for line, tag, kind in controls:
            if kind == "skip":
                continue
            counts[(tag, kind)] += 1
            if kind in ("UNNAMED", "title-only"):
                findings.append(f"{p}:{line}: {tag} {kind}")
            elif tag in listing:
                print(f"{p}:{line}: {tag} {kind}")
        for line, value in hexes:
            counts[("colour", "hex")] += 1
            findings.append(f"{p}:{line}: colour hex {value} outside var(--vscode-*, fallback)")
    return counts, findings


def self_test() -> int:
    here = Path(__file__).resolve().parent / "fixtures" / "states"
    ok = True

    def expect(cond: bool, what: str) -> None:
        nonlocal ok
        if not cond:
            ok = False
            print(f"self-test: FAIL {what}")

    counts, found = scan([here / "scanwv-fail-controls.ts"], [])
    expect(counts[("button", "title-only")] == 2, f"title-only buttons: {counts}")
    expect(
        counts[("button", "UNNAMED")] == 1 and counts[("input", "UNNAMED")] == 1,
        f"UNNAMED: {counts}",
    )
    expect(
        counts[("button", "aria-label")] == 1 and counts[("button", "text")] == 1,
        f"named: {counts}",
    )
    expect(len(found) == 4, f"fail fixture findings: {found}")
    counts, found = scan([here / "scanwv-pass-controls.ts"], [])
    expect(found == [], f"pass fixture must be clean: {found}")
    expect(counts[("input", "text")] == 2, f"label-wrapped and for= inputs are named: {counts}")
    counts, found = scan([here / "scanwv-fail-colours.css"], [])
    expect(len(found) == 2, f"two literal colours, fallback and comment ignored: {found}")
    counts, found = scan([here / "scanwv-pass-colours.css"], [])
    expect(found == [], f"var fallbacks pass: {found}")
    print(f"self-test: {'ok' if ok else 'FAILED'}")
    return 0 if ok else 1


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("dirs", nargs="*", default=["."])
    ap.add_argument(
        "--list",
        nargs="+",
        default=[],
        metavar="TAG",
        help="also print every control of these tags",
    )
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args(argv)
    if args.self_test:
        return self_test()
    roots = [Path(d) for d in args.dirs]
    missing = [r for r in roots if not r.exists()]
    if missing:
        print(f"scan_wv: no such path: {missing[0]}", file=sys.stderr)
        return 2
    counts, findings = scan(roots, args.list)
    for line in findings:
        print(line)
    for key, n in sorted(counts.items()):
        print(key, n)
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
