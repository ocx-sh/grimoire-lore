#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Source scans for confirmation code and for invisible marks in generated output.

Arms (select with --only NAME,...; the default is act04, act05 and act06):

  act04  UX-ACT-04  a dismissal test written as "not No": !== 'No', != "Cancel"
  act05  UX-ACT-05  a confirm label of OK, Yes, Confirm or Continue near a dialog,
                    and "Are you sure" or "Do you want to continue" in any string
  act06  UX-ACT-06  a confirmation component whose confirm label has a default
                    (confirmLabel = 'Confirm') or is optional (confirmLabel?: string)
  ai06   UX-AI-06   a zero-width mark (U+200B, U+200C, U+200D, U+2060, U+FEFF) in
                    any text file. A byte-order mark at the first byte is printed as
                    a note and is not a finding. Never part of the default arms.

Usage: actions_scan.py [--only NAME,...] [--format text|json] PATH [PATH ...]
       actions_scan.py --self-test

A PATH is a file (always scanned) or a directory (walked; node_modules, dist, build,
.git and test or fixture trees are skipped). A walk reads only markup and script files,
except under --only ai06, which reads every text file. Findings print as `path:line: ID: message`. A note prints as
`path:line: note: message`. The summary goes to stderr.

Exit codes: 0 clean, 1 findings, 2 usage or unreadable input.
Run as: python3 -I actions_scan.py ...
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

WEB_EXT = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".vue", ".svelte", ".astro", ".html"}
SKIP_DIRS = {"node_modules", "dist", "build", ".git", "test", "tests", "__tests__", "fixtures"}
ARMS = {"act04": "UX-ACT-04", "act05": "UX-ACT-05", "act06": "UX-ACT-06", "ai06": "UX-AI-06"}
DEFAULT_ARMS = ("act04", "act05", "act06")

NEGATED_CANCEL = re.compile(r"""!==?\s*(['"])(No|Cancel)\1""")
BANNED_PHRASE = re.compile(r"are you sure|do you want to continue", re.IGNORECASE)
BANNED_LABEL = re.compile(
    r"""(?:(['"`])(OK|Yes|Confirm|Continue)\1|>\s*(OK|Yes|Confirm|Continue)\s*<)""", re.IGNORECASE
)
DIALOG_CONTEXT = re.compile(
    r"confirm|modal|dialog|showWarningMessage|showInformationMessage|showErrorMessage"
    r"|window\.alert|\balert\(",
    re.IGNORECASE,
)
CONTEXT_LINES = 4
LABEL_PROP = re.compile(
    r"""\b(?:confirm|ok)(?:Button)?(?:Label|Text)\b(\s*\?\s*:|\s*=\s*['"`])"""
)
DECLARATION = re.compile(r"\b(?:const|let|var)\s+$")
ZERO_WIDTH = {"​": "U+200B", "‌": "U+200C", "‍": "U+200D", "⁠": "U+2060", "﻿": "U+FEFF"}


def scan_text(text: str, name: str, arms: tuple[str, ...]) -> tuple[list[dict], list[dict]]:
    """Return (findings, notes) for one file's text."""
    findings: list[dict] = []
    notes: list[dict] = []
    lines = text.splitlines()

    def add(arm: str, lineno: int, message: str) -> None:
        findings.append({"file": name, "line": lineno, "rule": ARMS[arm], "message": message})

    for i, line in enumerate(lines, 1):
        if "act04" in arms and NEGATED_CANCEL.search(line):
            add("act04", i, "dismissal tested as 'not No'; compare the result to the confirm label")
        if "act05" in arms:
            if BANNED_PHRASE.search(line):
                add("act05", i, "generic confirmation message; name the object and the outcome")
            for m in BANNED_LABEL.finditer(line):
                label = m.group(2) or m.group(3)
                rest = line[: m.start()] + " " + line[m.end() :]
                window = " ".join(lines[max(0, i - 1 - CONTEXT_LINES) : i - 1] + [rest] + lines[i : i + CONTEXT_LINES])
                if DIALOG_CONTEXT.search(window):
                    add("act05", i, f"confirm label {label!r}; use a verb that names the action")
        if "act06" in arms:
            for m in LABEL_PROP.finditer(line):
                if DECLARATION.search(line[: m.start()]):
                    continue
                kind = "optional" if "?" in m.group(1) else "has a default"
                add("act06", i, f"confirm label prop {kind}; make it required with no default")
        if "ai06" in arms:
            for ch, label in ZERO_WIDTH.items():
                col = line.find(ch)
                if col < 0:
                    continue
                if ch == "﻿" and i == 1 and col == 0 and line.count(ch) == 1:
                    notes.append({"file": name, "line": i, "message": "byte-order mark at the first byte, an encoding artefact; record it"})
                    continue
                add("ai06", i, f"zero-width mark {label} at column {col + 1}; an owner decision record must cite it")
    return findings, notes


def collect(paths: list[str], arms: tuple[str, ...]) -> list[Path]:
    files: list[Path] = []
    for raw in paths:
        p = Path(raw)
        if p.is_file():
            files.append(p)
        elif p.is_dir():
            for f in sorted(p.rglob("*")):
                if not f.is_file() or SKIP_DIRS & set(f.relative_to(p).parts[:-1]):
                    continue
                if arms == ("ai06",) or f.suffix in WEB_EXT:
                    files.append(f)
        else:
            raise FileNotFoundError(raw)
    return files


def scan_paths(paths: list[str], arms: tuple[str, ...]) -> tuple[list[dict], list[dict], int]:
    findings: list[dict] = []
    notes: list[dict] = []
    files = collect(paths, arms)
    for f in files:
        try:
            text = f.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue  # shortcut: binary files are skipped silently, add a note if one matters
        fnd, nts = scan_text(text, str(f), arms)
        findings += fnd
        notes += nts
    return findings, notes, len(files)


def check_cases(path: Path) -> list[str]:
    """Validate model-output-cases.json: every regex compiles, every case goes red on its
    naive output and green on its safe output. Returns the problems found."""
    problems: list[str] = []
    data = json.loads(path.read_text(encoding="utf-8"))
    flags = re.IGNORECASE if "i" in data.get("flags", "") else 0

    def violations(case: dict, html: str) -> list[str]:
        bad = []
        for rx in data["global_forbid"] + case.get("forbid", []):
            if re.search(rx, html, flags):
                bad.append(f"forbid {rx}")
        for rx in case.get("require", []):
            if not re.search(rx, html, flags):
                bad.append(f"require {rx}")
        return bad

    for rx in data["global_forbid"]:
        re.compile(rx, flags)
    seen: set[str] = set()
    for case in data["cases"]:
        cid = case["id"]
        if cid in seen:
            problems.append(f"{cid}: duplicate id")
        seen.add(cid)
        for key in ("markdown", "rules", "naive_output", "safe_output"):
            if not case.get(key):
                problems.append(f"{cid}: missing {key}")
        if not violations(case, case.get("naive_output", "")):
            problems.append(f"{cid}: naive_output does not break any assertion, so the case cannot go red")
        if violations(case, case.get("safe_output", "")):
            problems.append(f"{cid}: safe_output breaks {violations(case, case['safe_output'])}")
    return problems


def self_test() -> int:
    here = Path(__file__).parent
    base = here / "fixtures" / "actions"
    bad = 0
    all_arms = tuple(ARMS)
    names = sorted(base.iterdir())
    if not names:
        print("self-test: no fixtures")
        return 1
    for path in names:
        got = scan_text(path.read_text(encoding="utf-8"), path.name, all_arms)[0]
        rules = {f["rule"] for f in got}
        if path.name.startswith("fail-"):
            want = ARMS[path.name.split("-")[1]]
            if want not in rules:
                print(f"self-test: {path.name} expected {want}, got {sorted(rules) or 'nothing'}")
                bad += 1
        elif got:
            print(f"self-test: {path.name} expected clean, got {sorted(rules)}")
            bad += 1
    for problem in check_cases(here / "model-output-cases.json"):
        print(f"self-test: model-output-cases.json: {problem}")
        bad += 1
    print(f"self-test: {'FAILED' if bad else 'ok'}, {bad} mismatches over {len(names)} fixtures and the cases file")
    return 1 if bad else 0


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("paths", nargs="*")
    ap.add_argument("--only", help="comma list of arms: " + ", ".join(ARMS))
    ap.add_argument("--format", choices=("text", "json"), default="text")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args(argv)
    if args.self_test:
        return self_test()
    arms = tuple(a for a in args.only.split(",") if a) if args.only else DEFAULT_ARMS
    unknown = [a for a in arms if a not in ARMS]
    if unknown or not args.paths:
        print(f"usage: unknown arm {unknown} or no PATH given", file=sys.stderr)
        return 2
    try:
        findings, notes, count = scan_paths(args.paths, arms)
    except FileNotFoundError as err:
        print(f"missing input: {err}", file=sys.stderr)
        return 2
    if args.format == "json":
        print(json.dumps({"findings": findings, "notes": notes}, indent=2))
    else:
        for n in notes:
            print(f"{n['file']}:{n['line']}: note: {n['message']}")
        for f in findings:
            print(f"{f['file']}:{f['line']}: {f['rule']}: {f['message']}")
    print(f"scanned {count} file(s), {len(findings)} finding(s)", file=sys.stderr)
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
