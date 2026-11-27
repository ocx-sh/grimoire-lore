#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Lint a publish package or draft against the registry (CH-CORE-05 to 08, 11, 20).

A package starts with a header of 'key: value' lines (nested keys are indented),
then a blank line, then the draft body. See SKILL.md, "The publish package".

Subcommands (each prints one line per finding):
  rules-fetch PACKAGE [--page FILE]   CH-CORE-05: line 1 is 'rules_fetched: <date> <url>',
                                      and the verbatim rules_quote (8 words or more) is on that page
  labels PACKAGE                      CH-CORE-06: every label field of the platform is an explicit true or false
  ai-use --facts FILE [--facts FILE]... PACKAGE     CH-CORE-07: 'ai_use: yes|no, case: <registry id>' agrees with the registry;
                                      bare 'ai_use: borderline' and 'ai_use: no-ai' pass; a platform with no AI label needs no line
  disclosure PACKAGE                  CH-CORE-08: with 'sponsored: true' the first body line is the disclosure
  refs --facts FILE [--facts FILE]... DRAFT         CH-CORE-11: a platform number carries a registry id or a (command: `...`)
  claims FILE...                      CH-CORE-20: known-wrong platform claims carry their registry id
  --self-test

Exit codes: 0 clean, 1 findings, 2 usage or unreadable input.
Run as: python3 -I draft_check.py ...
"""

from __future__ import annotations

import argparse
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

FIXTURES = Path(__file__).resolve().parent / "fixtures" / "draft"
ROW_RE = re.compile(r"^\| ([A-Z]+-F[0-9]+) ")
# Label fields from CH-CORE-06. A platform with no entry has no label field.
LABELS = {
    "youtube": [("containsSyntheticMedia",), ("hasPaidProductPlacement",)],
    "x": [("made_with_ai",), ("paid_partnership",)],
    "threads": [("is_made_with_ai",)],
    "tiktok": [("is_aigc",), ("brand_content_toggle", "brand_organic_toggle")],
}
NO_AI_FIELD = ("linkedin", "bluesky", "mastodon")  # no AI field exists on these (CH-CORE-06)
DISCLOSURE_RE = re.compile(r"^(ad|sponsored|paid partnership|in partnership with)\b", re.IGNORECASE)
NUMBER_RE = re.compile(
    r"[0-9][0-9,.]* ?(characters|MB|GB|minutes|seconds|pixels|px|hashtags|topics|posts)([^a-z]|$)|\$[0-9]"
)


def split_package(text: str) -> tuple[dict[str, str], dict[str, str], str]:
    """Return the header keys, the nested labels block and the body."""
    head, _, body = text.partition("\n\n")
    header: dict[str, str] = {}
    labels: dict[str, str] = {}
    current = ""
    for line in head.splitlines():
        top = re.match(r"^([a-z_]+):\s*(.*)$", line)
        nested = re.match(r"^\s+([A-Za-z_.]+):\s*(.*)$", line)
        if top:
            current = top.group(1)
            header[current] = top.group(2).strip()
        elif nested and current == "labels":
            labels[nested.group(1)] = nested.group(2).strip()
        elif line.strip() and current:
            header[current] += " " + line.strip()
    return header, labels, body


def registry_kinds(files: list[Path]) -> dict[str, str]:
    kinds: dict[str, str] = {}
    for path in files:
        for line in path.read_text(encoding="utf-8").splitlines():
            if ROW_RE.match(line):
                cells = [c.strip() for c in line.split("|")]
                kinds[cells[1]] = cells[3]
    return kinds


def rules_fetch(path: Path, page: Path | None) -> list[str]:
    lines = path.read_text(encoding="utf-8").splitlines()
    match = re.fullmatch(
        r"rules_fetched: 20[0-9][0-9]-[01][0-9]-[0-3][0-9] (https:\S*)", lines[0] if lines else ""
    )
    if not match:
        return [f"FAIL {path}: line 1 is not rules_fetched: <date> <url>"]
    quote = next(
        (m.group(1) for m in (re.fullmatch(r'rules_quote: "(.*)"', ln) for ln in lines) if m), ""
    )
    if len(quote.split()) < 8:
        return [f"FAIL {path}: rules_quote missing or under 8 words"]
    try:
        if page:
            raw = page.read_text(encoding="utf-8")
        else:
            if not match.group(1).startswith("https://"):
                return [f"FAIL {path}: rules url is not https"]
            opener = urllib.request.build_opener()
            opener.addheaders = [("User-Agent", "Mozilla/5.0 (compatible; draft-check)")]
            with opener.open(match.group(1), timeout=40) as reply:
                raw = reply.read(2_000_000).decode("utf-8", "replace")
    except (urllib.error.URLError, TimeoutError, OSError):
        return [
            f"FAIL {path}: could not fetch {match.group(1)} (re-read by hand if the host blocks scripts)"
        ]
    text = " ".join(re.sub(r"<[^>]*>", " ", raw).split())
    return (
        []
        if quote in text
        else [
            f"FAIL {path}: quote not found on {match.group(1)} (re-read by hand if the host blocks scripts)"
        ]
    )


def labels_check(path: Path) -> list[str]:
    header, labels, _ = split_package(path.read_text(encoding="utf-8"))
    platform = header.get("platform", "").lower()
    leaf = {k.split(".")[-1]: v for k, v in labels.items()}
    out = []
    for options in LABELS.get(platform, []):
        found = [o for o in options if o in leaf]
        if not found:
            out.append(f"{path}: {platform} label {' or '.join(options)} is missing (CH-CORE-06)")
        out += [
            f"{path}: {o} must be true or false, not {leaf[o]!r}"
            for o in found
            if leaf[o] not in ("true", "false")
        ]
    if platform in NO_AI_FIELD:
        out += [
            f"{path}: {platform} has no AI label field, found {k} (CH-CORE-06)"
            for k in leaf
            if re.search(r"(^|_)(ai|aigc|synthetic)", k, re.IGNORECASE)
        ]
    if platform == "linkedin" and not re.search(
        r"brand[_ ]partnership[_ ]toggle",
        " ".join(header.values()) + " ".join(labels),
        re.IGNORECASE,
    ):
        out.append(
            f"{path}: LinkedIn package does not list the Brand partnership toggle as a manual step"
        )
    return out


def ai_use(path: Path, facts: list[Path]) -> list[str]:
    kinds = registry_kinds(facts)
    header, _, _ = split_package(path.read_text(encoding="utf-8"))
    out, seen, border = [], False, False
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.startswith("ai_use:"):
            continue
        seen = True
        bare = re.fullmatch(r"ai_use: (borderline|no-ai)", line)  # the bare words CH-CORE-07 names
        match = re.fullmatch(r"ai_use: (yes|no), case: ([A-Za-z0-9-]+)", line)
        if bare:
            border = border or bare.group(1) == "borderline"
            continue
        if not match:
            out.append(f"{path}:{number}: malformed ai_use")
            continue
        value, case = match.groups()
        if case == "borderline":
            border = True
        elif case == "no-ai":
            if value != "no":
                out.append(f"{path}:{number}: no-ai needs no")
        elif case not in kinds:
            out.append(f"{path}:{number}: case {case} not in registry")
        elif value == "yes" and not kinds[case].startswith("trigger:"):
            out.append(f"{path}:{number}: yes needs a trigger row")
        elif value == "no" and not kinds[case].startswith("exemption:"):
            out.append(f"{path}:{number}: no needs an exemption row")
    if not seen and header.get("platform", "").lower() not in NO_AI_FIELD:
        out.append(f"{path}: no ai_use line")
    if border and "ai_use" not in header.get("open_asks", ""):
        out.append(f"{path}: borderline without an open_asks entry")
    return out


def disclosure(path: Path) -> list[str]:
    header, _, body = split_package(path.read_text(encoding="utf-8"))
    if header.get("sponsored", "").lower() != "true":
        return []
    first = next((ln.strip() for ln in body.splitlines() if ln.strip()), "")
    if DISCLOSURE_RE.match(first):
        return []
    return [
        f"{path}: sponsored: true but the first line is not a disclosure such as 'Ad:' or 'Paid partnership:' (CH-CORE-08)"
    ]


def refs(path: Path, facts: list[Path]) -> list[str]:
    known = set(registry_kinds(facts))
    out = []
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not NUMBER_RE.search(line):
            continue
        ids = re.findall(r"\[([A-Z]+-F[0-9]+)\]", line)
        out += [f"{path}:{number}: unknown id {i}" for i in ids if i not in known]
        if not ids and "(command: `" not in line:
            out.append(f"{path}:{number}: platform number without a registry id")
    return out


def claims(path: Path) -> list[str]:
    out = []
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        where = f"{path}:{number}: {line.strip()[:60]}"
        low = line
        if re.search(r"self-bot|user-bot", low, re.IGNORECASE) and "[DC-F07]" not in line:
            out.append(f"{where} (self-bot claim needs [DC-F07])")
        if re.search(r"product hunt.{0,80}\b(AI|LLMs?)\b", low, re.IGNORECASE) and not re.search(
            r"\[PH-F[0-9]+\]", line
        ):
            out.append(f"{where} (Product Hunt AI claim needs a PH row id)")
        if (
            re.search(r"bluesky.{0,80}(filter|hide|requir)", low, re.IGNORECASE)
            and re.search(r"bot|automat", low, re.IGNORECASE)
            and not re.search(r"\[BS-F0[1-4]\]", line)
        ):
            out.append(f"{where} (Bluesky bot claim needs BS-F01 to BS-F04)")
    return out


def self_test() -> int:
    def need(cond: bool, what: str) -> None:
        if not cond:
            raise SystemExit(f"self-test: {what}")

    p, f = FIXTURES / "pass", FIXTURES / "fail"
    facts = [p / "facts.md"]
    for name, found in (
        ("labels", labels_check(p / "package.md")),
        ("ai-use", ai_use(p / "package.md", facts)),
        ("disclosure", disclosure(p / "package.md")),
        ("refs", refs(p / "package.md", facts)),
        ("claims", claims(p / "package.md")),
        ("rules-fetch", rules_fetch(p / "rules.md", p / "page.html")),
    ):
        need(not found, f"pass fixture reported by {name}: {found}")
    text = " ".join
    out = text(labels_check(f / "package.md"))
    need(
        "hasPaidProductPlacement is missing" in out and "must be true or false" in out,
        f"labels: {out}",
    )
    out = text(labels_check(f / "linkedin.md"))
    need("no AI label field" in out and "Brand partnership" in out, f"labels linkedin: {out}")
    out = text(ai_use(f / "package.md", facts))
    need(
        not ai_use(p / "bare.md", facts) and not ai_use(p / "linkedin.md", facts),
        f"ai-use: bare words or label-less platform rejected: {ai_use(p / 'bare.md', facts)}",
    )
    need(
        "borderline without" in text(ai_use(f / "bare.md", facts))
        and "no ai_use line" in text(ai_use(f / "youtube.md", facts)),
        "ai-use: bare borderline without an ask, or a missing line on an AI-label platform, passed",
    )
    for needle in (
        "yes needs a trigger row",
        "not in registry",
        "no-ai needs no",
        "borderline without",
        "no needs an exemption",
    ):
        need(needle in out, f"ai-use lacks {needle!r}: {out}")
    need(len(disclosure(f / "package.md")) == 1, "disclosure fail fixture not reported")
    out = text(refs(f / "package.md", facts))
    need("without a registry id" in out and "unknown id LI-F77" in out, f"refs: {out}")
    need(len(claims(f / "claims.md")) == 4, f"claims: {claims(f / 'claims.md')}")
    need(len(rules_fetch(f / "rules.md", p / "page.html")) == 1, "invented rules quote passed")
    need(len(rules_fetch(f / "no-quote.md", p / "page.html")) == 1, "missing rules quote passed")
    print("draft_check self-test: ok")
    return 0


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    if argv == ["--self-test"]:
        return self_test()
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    sub = parser.add_subparsers(dest="cmd")
    r = sub.add_parser("rules-fetch")
    r.add_argument("file", type=Path)
    r.add_argument("--page", type=Path)
    for name in ("labels", "disclosure"):
        sub.add_parser(name).add_argument("file", type=Path)
    for name in ("ai-use", "refs"):
        s = sub.add_parser(name)
        s.add_argument(
            "--facts",
            action="append",
            required=True,
            type=Path,
            help="registry file; repeat for more",
        )
        s.add_argument("file", type=Path)
    sub.add_parser("claims").add_argument("files", nargs="+", type=Path)
    args = parser.parse_args(argv)
    if not args.cmd:
        parser.print_usage(sys.stderr)
        return 2
    try:
        if args.cmd == "rules-fetch":
            found = rules_fetch(args.file, args.page)
        elif args.cmd == "labels":
            found = labels_check(args.file)
        elif args.cmd == "disclosure":
            found = disclosure(args.file)
        elif args.cmd == "ai-use":
            found = ai_use(args.file, args.facts)
        elif args.cmd == "refs":
            found = refs(args.file, args.facts)
        else:
            found = [line for f in args.files for line in claims(f)]
    except OSError as err:
        print(f"draft_check: {err}", file=sys.stderr)
        return 2
    for line in found:
        print(line)
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main())
