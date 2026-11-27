#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Lint a fact sheet (CH-CORE-03).

A fact sheet has one heading, '## Fact sheet, the human writes the post',
followed only by bullets '- <key>: <value>'. The keys are version, install,
repository, measured, limit and motive. motive stays blank. A value has at most
20 words outside backticks and no first-person or second-person pronoun.

Usage:
  factsheet_check.py FILE...
  factsheet_check.py --self-test

Exit codes: 0 clean, 1 findings, 2 usage or unreadable input.
Run as: python3 -I factsheet_check.py ...
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

HEADING = "## Fact sheet, the human writes the post"
KEY_RE = re.compile(r"^- (version|install|repository|measured|limit|motive):")
PRONOUN_RE = re.compile(r"[^a-z](i|we|our|us|my|you|your)[^a-z]")
FIXTURES = Path(__file__).resolve().parent / "fixtures" / "factsheet"


def lint(path: Path) -> list[str]:
    out: list[str] = []
    seen = False
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        where = f"{path}:{number}"
        if not line.strip():
            continue
        if line.startswith("#"):
            if line.rstrip() != HEADING:
                out.append(f"{where}: heading not allowed")
            else:
                seen = True
            continue
        if not seen:
            out.append(f"{where}: text before the fact-sheet heading")
            continue
        if not KEY_RE.match(line):
            out.append(f"{where}: not a fact-sheet key")
            continue
        value = re.sub(r"`[^`]*`", "", re.sub(r"^- [a-z]+:\s*", "", line)).strip()
        if line.startswith("- motive:") and value:
            out.append(f"{where}: motive must stay blank")
        if PRONOUN_RE.search(f" {value.lower()} "):
            out.append(f"{where}: first or second person")
        if len(value.split()) > 20:
            out.append(f"{where}: value over 20 words")
    if not seen:
        out.append(f"{path}: no fact-sheet heading")
    return out


def self_test() -> int:
    if lint(FIXTURES / "pass" / "sheet.md"):
        raise SystemExit("self-test: pass fixture reported findings")
    found = " ".join(lint(FIXTURES / "fail" / "sheet.md"))
    for needle in (
        "heading not allowed",
        "not a fact-sheet key",
        "motive must stay blank",
        "first or second person",
        "value over 20 words",
        "text before",
    ):
        if needle not in found:
            raise SystemExit(f"self-test: fail fixture did not report {needle!r}")
    print("factsheet_check self-test: ok")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("files", nargs="*", type=Path)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args(argv)
    if args.self_test:
        return self_test()
    if not args.files:
        parser.print_usage(sys.stderr)
        return 2
    try:
        findings = [line for path in args.files for line in lint(path)]
    except OSError as err:
        print(f"factsheet_check: {err}", file=sys.stderr)
        return 2
    for line in findings:
        print(line)
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main())
