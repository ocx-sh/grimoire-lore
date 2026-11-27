#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Lint a rendered release-notes body and the git-cliff config that renders it.

Notes body (--notes FILE):
  MKT-REL-10  body not empty, has a bullet or "No user-facing changes.", no
              hash-shaped word in visible text, no verbatim Conventional
              Commits bullet
  MKT-REL-04  every ### heading is one of the six Keep a Changelog headings
  MKT-REL-03  every **BREAKING line is followed by a **Migration:** line
  MKT-REL-06  no bullet carries an internal scope (scopes read from --config)
  MKT-REL-07  every ### Deprecated item has a Migration line naming a removal
              version or date
  MKT-REL-14  summary line (SHOULD): when the notes add, remove, deprecate or
              break something, the first prose line is at most 30 words and is
              not a bullet

Config (--config cliff.toml):
  MKT-REL-03  breaking_description is rendered
  MKT-REL-04  protect_breaking_commits = true, and a breaking-routes-to-Changed
              parser sits before the first skip parser
  MKT-REL-05  at least 4 Changelog: footer parsers
  MKT-REL-06  a scope skip parser exists; no Documentation group
  MKT-REL-14  the {% if message %} slot sits after the version heading
  MKT-REL-10  with --workflows DIR, no generate_release_notes (or `gh release create
              --generate-notes`) while a config exists

Usage:
  notes_check.py [--notes FILE] [--config FILE] [--workflows DIR] [--skip ID]...
  notes_check.py --self-test

Exit codes: 0 clean, 1 findings, 2 usage or unreadable input.
Run as: python3 -I notes_check.py ...
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

SIX = {"Added", "Changed", "Deprecated", "Removed", "Fixed", "Security"}
BULLET = re.compile(r"^\s*[-*] ")
MIGRATION = re.compile(r"\*\*Migration:")
HASH_WORD = re.compile(r"\b[0-9a-f]{7,40}\b")
CC_BULLET = re.compile(r"^[-*] [a-z]+(\([^)]*\))?!?: ")
REMOVAL = re.compile(
    r"remov[a-z]* (in|after|on) (v?[0-9]+\.[0-9]+|[0-9]{4}-[0-9]{2}-[0-9]{2})", re.IGNORECASE
)
GENERATED = re.compile(r"generate[-_]release[-_]notes|--generate-notes")
FINDING = tuple[str, str]  # (rule id, message)


def scopes_from_config(config: str) -> str | None:
    """Return the alternation inside the scope skip parser's pattern, if any."""
    for table in re.findall(r"\{[^{}]*\}", config):
        if re.search(r'field\s*=\s*"scope"', table) and re.search(r"skip\s*=\s*true", table):
            pat = re.search(r'pattern\s*=\s*"((?:[^"\\]|\\.)*)"', table)
            if pat:
                inner = re.fullmatch(r"\^\((.*)\)\$", pat.group(1))
                return inner.group(1) if inner else pat.group(1)
    return None


def check_notes(text: str, scopes: str | None = None) -> list[FINDING]:
    out: list[FINDING] = []
    if not text.strip():
        return [("MKT-REL-10", "body is empty")]
    lines = text.splitlines()
    bullets = [x for x in lines if BULLET.match(x)]
    if not bullets and not any(x.startswith("No user-facing changes.") for x in lines):
        out.append(("MKT-REL-10", "no bullet and no 'No user-facing changes.' line"))
    # Link targets are stripped first: a commit URL inside (...) passes, a hash in link text fails.
    visible = re.sub(r"\]\([^)]*\)", "]", text)
    for word in sorted(set(HASH_WORD.findall(visible))):
        if re.search(r"[0-9]", word) and re.search(r"[a-f]", word):
            out.append(("MKT-REL-10", f"hash-shaped word in visible text: {word}"))
    for n, line in enumerate(lines, 1):
        if CC_BULLET.match(line):
            out.append(("MKT-REL-10", f"line {n}: verbatim Conventional Commits bullet"))
        m = re.match(r"^### (.+?)\s*$", line)
        if m and m.group(1) not in SIX:
            out.append(("MKT-REL-04", f"line {n}: heading outside the six: {m.group(1)}"))
        if "**BREAKING" in line and not (n < len(lines) and MIGRATION.search(lines[n])):
            out.append(("MKT-REL-03", f"line {n}: BREAKING item without a Migration line below"))
        if scopes and re.search(rf"^- .*\*?\(({scopes})\)", line):
            out.append(("MKT-REL-06", f"line {n}: bullet carries an internal scope"))
    out += _deprecated(lines)
    out += _summary(lines, text)
    return out


def _deprecated(lines: list[str]) -> list[FINDING]:
    out: list[FINDING] = []
    section: list[str] = []
    inside = False
    for line in lines:
        if line.startswith("#"):
            inside = line.strip() == "### Deprecated"
            continue
        if inside:
            section.append(line)
    items = [x for x in section if BULLET.match(x) and not MIGRATION.search(x)]
    migrations = [x for x in section if MIGRATION.search(x)]
    if len(items) != len(migrations):
        out.append(
            ("MKT-REL-07", f"{len(items)} Deprecated items but {len(migrations)} Migration lines")
        )
    for m in migrations:
        if not REMOVAL.search(m):
            out.append(("MKT-REL-07", "Migration line names no removal version or date"))
    return out


def _summary(lines: list[str], text: str) -> list[FINDING]:
    if not re.search(r"^### (Added|Removed|Deprecated)\s*$|\*\*BREAKING", text, re.MULTILINE):
        return []
    for line in lines:
        if not line.strip() or line.startswith("#"):
            continue
        if line.lstrip().startswith(("-", "*", "[")):
            return [("MKT-REL-14", "notes open with a bullet, not a summary sentence")]
        if len(line.split()) > 30:
            return [("MKT-REL-14", "summary sentence is longer than 30 words")]
        return []
    return []


def check_config(config: str) -> list[FINDING]:
    out: list[FINDING] = []
    if "breaking_description" not in config:
        out.append(("MKT-REL-03", "template never renders breaking_description"))
    if not re.search(r"^\s*protect_breaking_commits\s*=\s*true", config, re.MULTILINE):
        out.append(("MKT-REL-04", "protect_breaking_commits = true is missing"))
    parsers = [x for x in config.splitlines() if re.search(r"\b(message|footer|field)\s*=", x)]
    first_skip = next((i for i, x in enumerate(parsers) if re.search(r"skip\s*=\s*true", x)), None)
    first_bang = next((i for i, x in enumerate(parsers) if "!:" in x and "Changed" in x), None)
    if first_skip is not None and (first_bang is None or first_bang > first_skip):
        out.append(("MKT-REL-04", "no breaking-to-Changed parser ahead of the first skip parser"))
    if len(re.findall(r'footer\s*=\s*"\^Changelog', config)) < 4:
        out.append(("MKT-REL-05", "fewer than 4 'footer = \"^Changelog' parsers"))
    if scopes_from_config(config) is None:
        out.append(("MKT-REL-06", 'no scope skip parser (field = "scope", skip = true)'))
    if '"Documentation"' in config:
        out.append(("MKT-REL-06", "a Documentation group is defined"))
    heading = re.search(r"^##\s+\[\{\{\s*-?\s*version", config, re.MULTILINE)
    slot = re.search(r"\{%-?\s*if message\s*-?%\}", config)
    if slot is None:
        out.append(("MKT-REL-14", "no {% if message %} summary slot"))
    elif heading is not None and slot.start() < heading.start():
        out.append(("MKT-REL-14", "summary slot sits above the version heading"))
    return out


def check_workflows(directory: Path) -> list[FINDING]:
    out: list[FINDING] = []
    files = [*directory.glob("*.yml"), *directory.glob("*.yaml")]
    for f in sorted(files):
        for n, line in enumerate(f.read_text(encoding="utf-8").splitlines(), 1):
            if GENERATED.search(line):
                out.append(("MKT-REL-10", f"{f}:{n}: GitHub-generated notes while a config exists"))
    return out


def run(notes: Path | None, config: Path | None, workflows: Path | None, skip: set[str]):
    found: list[tuple[str, FINDING]] = []
    cfg_text = config.read_text(encoding="utf-8") if config else None
    if notes:
        scopes = scopes_from_config(cfg_text) if cfg_text else None
        found += [(str(notes), f) for f in check_notes(notes.read_text(encoding="utf-8"), scopes)]
    if cfg_text is not None:
        found += [(str(config), f) for f in check_config(cfg_text)]
        if workflows:
            found += [(str(workflows), f) for f in check_workflows(workflows)]
    return [(src, f) for src, f in found if f[0] not in skip]


def expect(condition: object, message: object = "condition false") -> None:
    """Self-test check that survives python -O, which strips a bare assert."""
    if not condition:
        raise SystemExit(f"self-test failed: {message}")


def self_test() -> int:
    fx = Path(__file__).resolve().parent / "fixtures" / "notes"
    good_cfg = (fx / "cliff.good.toml").read_text(encoding="utf-8")
    scopes = scopes_from_config(good_cfg)
    expect(scopes and "release" in scopes, scopes)
    expect(check_notes((fx / "good.md").read_text(encoding="utf-8"), scopes) == [])
    expect(check_config(good_cfg) == [])
    bad = {f[0] for f in check_notes((fx / "bad.md").read_text(encoding="utf-8"), scopes)}
    expect(
        bad
        == {
            "MKT-REL-03",
            "MKT-REL-04",
            "MKT-REL-06",
            "MKT-REL-07",
            "MKT-REL-10",
            "MKT-REL-14",
        },
        bad,
    )
    empty = check_notes((fx / "empty.md").read_text(encoding="utf-8"))
    expect([f[0] for f in empty] == ["MKT-REL-10"], empty)
    expect(check_notes("") == [("MKT-REL-10", "body is empty")])
    expect(check_notes("No user-facing changes. Only CI changed.\n") == [])
    # A commit URL in a link target passes; the same hash in link text fails.
    ok = "- Fix a crash ([#1](https://example.com/commit/abc1234def))\n"
    expect(check_notes(ok) == [])
    expect(any("hash" in m for _, m in check_notes("- Fix a crash [abc1234def]\n")))
    bad_cfg = {f[0] for f in check_config((fx / "cliff.bad.toml").read_text(encoding="utf-8"))}
    expect(
        bad_cfg == {"MKT-REL-03", "MKT-REL-04", "MKT-REL-05", "MKT-REL-06", "MKT-REL-14"}, bad_cfg
    )
    # release.yml uses the action input, cli.yml the gh flag, ok.yml neither.
    wf = [(f[0], f[1].split(":")[0].rsplit("/", 1)[-1]) for f in check_workflows(fx / "workflows")]
    expect(wf == [("MKT-REL-10", "cli.yml"), ("MKT-REL-10", "release.yml")], wf)
    expect(run(fx / "bad.md", fx / "cliff.good.toml", None, set(bad)) == [])
    print("notes_check self-test ok")
    return 0


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--notes", type=Path, help="rendered release-notes body")
    ap.add_argument("--config", type=Path, help="cliff.toml")
    ap.add_argument("--workflows", type=Path, help="directory of workflow files (needs --config)")
    ap.add_argument("--skip", action="append", default=[], help="rule ID to leave out, repeatable")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args(argv)
    if args.self_test:
        return self_test()
    if not (args.notes or args.config):
        ap.error("give --notes, --config or --self-test")
    try:
        found = run(args.notes, args.config, args.workflows, set(args.skip))
    except OSError as err:
        print(f"notes_check: {err}", file=sys.stderr)
        return 2
    for src, (rule, msg) in found:
        print(f"{rule}: {src}: {msg}")
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
