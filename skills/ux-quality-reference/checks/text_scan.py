#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""List candidate violations of the UX-TEXT string rules in interface source.

Each arm is one regular expression over the lines of the files you pass (the
img-alt arm reads the whole file, because an <img> tag spans lines). Pass the
files of user-visible strings: markup, component source, manifests and CLI
text, with tests excluded by the file list. A hit is a candidate. Comments
and examples a reader judges harmless are read away, never gated.

The command-title and setting-length arms read a VS Code package.json instead.

Arms and the rule each one serves:
  emoji          UX-TEXT-17 (MUST)     emoji in a product string
  interjection   UX-TEXT-17 (MUST)     oops, whoops, uh-oh, yikes
  polite         UX-TEXT-17 (SHOULD)   please, sorry, apologise
  bang           UX-TEXT-17 (SHOULD)   a string that ends with an exclamation mark
  generic        UX-TEXT-03            something went wrong, an error occurred, unknown error
  did-you-mean   UX-TEXT-06            a question where a statement belongs
  decision       UX-TEXT-14            OK, Yes, No, Submit or Done as a decision button
  link-text      UX-TEXT-16            here, click here, learn more, read more as link text
  command-title  UX-TEXT-15            a command title with a lowercase word of five letters or more
  invalid        UX-TEXT-18            invalid with no expected form beside it
  click          UX-TEXT-19            click
  latin          UX-TEXT-19            e.g., i.e., etc.
  ampersand      UX-TEXT-19            & between words
  img-alt        UX-TEXT-20 (MUST)     an <img> with no alt attribute, and empty Markdown alt
  setting-length UX-TEXT-22            a setting description over two sentences with no docs link
  plural-s       UX-TEXT-25 (MUST)     (s), (es), (ies)
  ternary-plural UX-TEXT-26            a noun-swap ternary or if/else on == 1
  format         UX-TEXT-27            hand-rolled number, time and list formatting
  bytes          UX-TEXT-28 (MUST)     a 1024 division next to KB, MB or GB
  locale         UX-TEXT-29            a hard-coded en-US
  status         UX-TEXT-30 (MUST)     a bare Done, Saved, Success, OK or Copied status

Usage:
  text_scan.py --arm ARM [--arm ARM ...] FILE ...
  text_scan.py --arm all FILE ...
  text_scan.py --self-test

Output: `path:line: [arm] text`. Exit codes: 0 clean, 1 findings, 2 usage or unreadable input.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

I = re.I
# name: (pattern, flags, drop pattern for a line that clears the hit)
LINE_ARMS: dict[str, tuple[str, int, str | None]] = {
    "emoji": (r"[\U0001F300-\U0001FAFF☀-➿]", 0, None),
    "interjection": (r"\b(?:oops|whoops|uh-oh|yikes)\b", I, None),
    "polite": (r"\b(?:please|sorry|apologi[sz]e)\b", I, None),
    "bang": (r"""\w!['"`]""", 0, None),
    "generic": (r"something went wrong|an error occurred|unknown error", I, None),
    "did-you-mean": (r"did you mean", I, None),
    "decision": (
        r"""show(?:Warning|Error|Information)Message\([^)]*['"](?:OK|Ok|Yes|No|Submit|Done)['"]"""
        r"""|>(?:OK|Ok|Yes|No|Submit|Done)<""",
        0,
        None,
    ),
    "link-text": (
        r">(?:here|click here|learn more|read more|more)</(?:a|button)>"
        r"|\[(?:here|click here|learn more|read more)\]\(",
        I,
        None,
    ),
    "invalid": (r""""[^"]*\binvalid\b[^"]*\"""", 0, r"expected|must|allowed|one of|valid values|\{|: "),
    "click": (r"\bclick(?:s|ing)?\b", I, None),
    "latin": (r"(?<![\w.])(?:e\.g\.|i\.e\.|etc\.)", I, None),
    "ampersand": (r"[a-z] & [a-z]", I, None),
    "plural-s": (r"""["'`][^"'`]*(?<!http)(?<=[A-Za-z])\((?:s|es|ies)\)""", 0, None),
    "ternary-plural": (
        r"""===?\s*1\s*\?\s*['"`][A-Za-z ]*['"`]\s*:\s*['"`][A-Za-z ]*['"`]"""
        r"""|(?:==|!=) 1 \{ "[A-Za-z ]*" \} else \{ "[A-Za-z ]*" \}""",
        0,
        None,
    ),
    "format": (
        r"toFixed\(|\b(?:min|h|d) ago\b|\.join\(', '\)\s*\+|toISOString\(\)\.slice|Intl\.MessageFormat",
        0,
        None,
    ),
    "bytes": (r"/ ?1024.*\b(?:KB|MB|GB)\b", 0, None),
    "locale": (r"""['"]en-US['"]""", 0, None),
    "status": (
        r"""(?:showInformationMessage|showWarningMessage|setStatus|set_status|println!)"""
        r"""\(\s*['"`]?(?:Done|Saved|Success|Error|OK|Failed|Copied)\.?['"`]?\s*[,)]""",
        0,
        None,
    ),
}
FILE_ARMS = {"img-alt", "command-title", "setting-length"}
IMG_NO_ALT = re.compile(r"<img\b(?![^>]*\balt=)[^>]*>", re.S)
MD_EMPTY_ALT = re.compile(r"!\[\]\(")
ARMS = sorted(set(LINE_ARMS) | FILE_ARMS)


def manifest_hits(text: str, arm: str) -> list[tuple[int, str, str]]:
    try:
        data = json.loads(text)
    except ValueError:
        return []
    contributes = data.get("contributes") if isinstance(data, dict) else None
    if not isinstance(contributes, dict):
        return []

    def at(needle: str) -> int:
        i = text.find(json.dumps(needle)[1:-1])
        return text.count("\n", 0, i) + 1 if i >= 0 else 1

    out = []
    if arm == "command-title":
        for c in contributes.get("commands") or []:
            title = c.get("title") if isinstance(c, dict) else None
            bad = re.findall(r"[A-Za-z][A-Za-z']*", title) if isinstance(title, str) else []
            bad = [w for w in bad if len(w) > 4 and not w[0].isupper()]
            if bad:
                out.append((at(title), arm, f"{title}: lowercase {', '.join(bad)}"))
    else:
        conf = contributes.get("configuration") or []
        for block in conf if isinstance(conf, list) else [conf]:
            props = block.get("properties") if isinstance(block, dict) else None
            for key, spec in (props or {}).items():
                desc = (spec.get("markdownDescription") or spec.get("description") or "") if isinstance(spec, dict) else ""
                if len(re.findall(r"[.!?](\s|$)", desc)) > 2 and not re.search(r"\]\(|https?://", desc):
                    out.append((at(key), arm, f"{key}: over two sentences, no docs link"))
    return out


def scan(path: str, arms: list[str]) -> list[str] | None:
    try:
        text = Path(path).read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        print(f"text_scan: cannot read {path}: {exc.strerror}", file=sys.stderr)
        return None
    out = []
    lines = text.split("\n")
    for arm in arms:
        if arm in LINE_ARMS:
            pat, flags, drop = LINE_ARMS[arm]
            rx, dx = re.compile(pat, flags), re.compile(drop) if drop else None
            for n, line in enumerate(lines, 1):
                if rx.search(line) and not (dx and dx.search(line)):
                    out.append((n, arm, line.strip()))
        elif arm != "img-alt":
            out.extend(manifest_hits(text, arm))
        else:
            for m in IMG_NO_ALT.finditer(text):
                out.append((text.count("\n", 0, m.start()) + 1, arm, " ".join(m.group(0).split())))
            for n, line in enumerate(lines, 1):
                if MD_EMPTY_ALT.search(line):
                    out.append((n, arm, line.strip()))
    return [f"{path}:{n}: [{arm}] {s[:120]}" for n, arm, s in sorted(out)]


def self_test() -> int:
    here = Path(__file__).resolve().parent / "fixtures" / "text"
    fails = sorted(here.glob("fail-*"))
    passes = sorted(here.glob("pass-*"))
    ok = bool(fails and passes)
    for arm in ARMS:
        hit = [r for f in fails for r in scan(str(f), [arm]) or []]
        clean = [r for f in passes for r in scan(str(f), [arm]) or []]
        if not hit:
            ok = False
            print(f"self-test: FAIL arm {arm} found nothing in the fail fixtures")
        if clean:
            ok = False
            print(f"self-test: FAIL arm {arm} flagged a pass fixture: {clean[0]}")
    rows = scan(str(here / "fail-page.html"), ["img-alt"]) or []
    if len(rows) != 2:
        ok = False
        print(f"self-test: FAIL img-alt must list the two alt-less tags, got {rows}")
    rows = scan(str(here / "fail-strings.ts"), ["plural-s"]) or []
    if len(rows) != 1:
        ok = False
        print(f"self-test: FAIL plural-s must skip http(s), got {rows}")
    print(f"self-test: {'ok' if ok else 'FAILED'}")
    return 0 if ok else 1


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("files", nargs="*")
    ap.add_argument("--arm", action="append", default=[], help="arm name, or all (repeatable)")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args(argv)
    if args.self_test:
        return self_test()
    arms = ARMS if "all" in args.arm else args.arm
    bad = [a for a in arms if a not in ARMS]
    if not arms or bad or not args.files:
        print(f"text_scan: need --arm (one of {', '.join(ARMS)}) and at least one file", file=sys.stderr)
        return 2
    found = False
    for path in args.files:
        rows = scan(path, arms)
        if rows is None:
            return 2
        for row in rows:
            print(row)
            found = True
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
