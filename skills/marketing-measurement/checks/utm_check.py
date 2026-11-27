#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Check campaign tags (MKT-MEAS-08, 09, 10, 11).

Subcommands:
  tags [--decision FILE] FILE...      MKT-MEAS-08: a tag appears only when the decision record says
                                      `acquisition_data: yes`; MKT-MEAS-10: every tagged URL
                                      uses the closed format
  owned --host HOST... FILE...        MKT-MEAS-09: no utm_*, ref or source parameter on a relative
                                      link or a link to an owned host
  campaigns FILE.csv                  MKT-MEAS-11: columns url,source,medium,campaign,content,date,
                                      owner,post; no variant spelling of a campaign name, no reused
                                      source, medium, campaign and content tuple; each url as MKT-MEAS-10
  --self-test                         run the fixtures under fixtures/utm

Exit codes: 0 clean, 1 findings, 2 usage or unreadable input.
Run as: python3 -I utm_check.py ...
"""

from __future__ import annotations

import argparse
import csv
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

FIXTURES = Path(__file__).resolve().parent / "fixtures" / "utm"
MEDIUMS = {"social", "email", "video", "referral", "affiliate", "cpc", "paid-social"}
ALLOWED_PARAMS = {"utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref"}
VALUE = re.compile(r"[a-z0-9_-]+")
URL = re.compile(r"""https?://[^\s"'<>)\]]+""")
LINK = re.compile(r"""(?:href|src|content)=["']([^"']+)|\]\(([^)\s]+)""")
COLUMNS = ("url", "source", "medium", "campaign", "content", "date", "owner", "post")
CAMPAIGN_MAX = 40  # house limit, not a platform limit


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def check_url(url: str) -> list[str]:
    """MKT-MEAS-10 findings for one URL that carries a utm_ parameter."""
    query = parse_qs(urlsplit(url).query, keep_blank_values=True)
    flat = {k: v[0] for k, v in query.items()}
    out = [
        f"required {k} is missing or empty"
        for k in ("utm_source", "utm_medium", "utm_campaign")
        if not flat.get(k)
    ]
    for key in ("utm_source", "utm_medium", "utm_campaign"):
        if flat.get(key) and not VALUE.fullmatch(flat[key]):
            out.append(f"{key}={flat[key]} is not lower case a-z, 0-9, hyphen and underscore")
    if flat.get("utm_medium") and flat["utm_medium"] not in MEDIUMS:
        out.append(f"utm_medium={flat['utm_medium']} is not in the closed set")
    if "." in flat.get("utm_source", ""):
        out.append("utm_source carries a TLD; write the platform name")
    if len(flat.get("utm_campaign", "")) > CAMPAIGN_MAX:
        out.append(f"utm_campaign is longer than {CAMPAIGN_MAX} characters")
    out += [f"parameter {k} is not allowed" for k in sorted(set(flat) - ALLOWED_PARAMS)]
    return out


def cmd_tags(decision: Path | None, files: list[Path]) -> list[str]:
    out: list[str] = []
    record = read(decision) if decision and decision.is_file() else ""
    collected = re.search(
        r"^\s*[-*]?\s*acquisition[_ -]data\s*:\s*yes\b", record, re.IGNORECASE | re.MULTILINE
    )
    for path in files:
        for number, line in enumerate(read(path).splitlines(), 1):
            for found in URL.findall(line):
                url = found.rstrip(".,;")
                if "utm_" not in url:
                    continue
                if not collected:
                    out.append(
                        f"{path}:{number}: MKT-MEAS-08: tagged URL and the decision record does not say acquisition_data: yes"
                    )
                out += [f"{path}:{number}: MKT-MEAS-10: {msg}" for msg in check_url(url)]
    return out


def cmd_owned(hosts: set[str], files: list[Path]) -> list[str]:
    out: list[str] = []
    for path in files:
        for number, line in enumerate(read(path).splitlines(), 1):
            candidates = [a or b for a, b in LINK.findall(line)] + [
                u.rstrip(".,;") for u in URL.findall(line)
            ]
            for target in dict.fromkeys(candidates):
                parts = urlsplit(target)
                if parts.scheme in ("mailto", "tel", "javascript"):
                    continue
                host = parts.netloc.lower().removeprefix("www.")
                if parts.netloc and host not in hosts:
                    continue
                bad = sorted(
                    k
                    for k in parse_qs(parts.query, keep_blank_values=True)
                    if k.startswith("utm_") or k in ("ref", "source")
                )
                if bad:
                    out.append(
                        f"{path}:{number}: MKT-MEAS-09: owned link {target[:80]} carries {', '.join(bad)}"
                    )
    return out


def cmd_campaigns(path: Path) -> list[str]:
    with path.open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        rows = list(reader)
        header = reader.fieldnames or []
    out: list[str] = []
    missing = [c for c in COLUMNS if c not in header]
    if missing:
        return [f"{path}: MKT-MEAS-11: missing columns {', '.join(missing)}"]
    spellings: dict[str, set[str]] = defaultdict(set)
    tuples = Counter((r["source"], r["medium"], r["campaign"], r["content"]) for r in rows)
    for number, row in enumerate(rows, 2):
        spellings[re.sub(r"[-_]", "", row["campaign"].lower())].add(row["campaign"])
        out += [f"{path}:{number}: MKT-MEAS-10: {msg}" for msg in check_url(row["url"])]
    out += [
        f"{path}: MKT-MEAS-11: variant spellings {sorted(s)}"
        for s in spellings.values()
        if len(s) > 1
    ]
    out += [
        f"{path}: MKT-MEAS-11: tuple {t} is used by {n} rows" for t, n in tuples.items() if n > 1
    ]
    return out


def report(findings: list[str]) -> int:
    for line in findings:
        print(line)
    return 1 if findings else 0


def self_test() -> int:
    ok, bad = FIXTURES / "pass", FIXTURES / "fail"

    def expect(label: str, got: list[str], want_clean: bool, needle: str = "") -> None:
        if want_clean and got:
            raise SystemExit(f"self-test {label}: expected clean, got {got}")
        if not want_clean and (not got or needle not in " ".join(got)):
            raise SystemExit(f"self-test {label}: expected {needle!r}, got {got}")

    expect("tags pass", cmd_tags(ok / "decision.md", [ok / "posts.md"]), True)
    expect(
        "tags no collector", cmd_tags(bad / "decision.md", [ok / "posts.md"]), False, "MKT-MEAS-08"
    )
    for needle in (
        "not in the closed set",
        "lower case",
        "TLD",
        "missing",
        "not allowed",
        "longer than",
    ):
        expect(f"tags {needle}", cmd_tags(ok / "decision.md", [bad / "posts.md"]), False, needle)
    expect("owned pass", cmd_owned({"example.com"}, [ok / "page.md"]), True)
    expect("owned fail", cmd_owned({"example.com"}, [bad / "page.md"]), False, "MKT-MEAS-09")
    got = cmd_owned({"example.com"}, [bad / "page.md"])
    if len(got) != 3:
        raise SystemExit(
            f"self-test owned count: want 3 findings (relative, owned host, www), got {got}"
        )
    expect("campaigns pass", cmd_campaigns(ok / "campaigns.csv"), True)
    expect("campaigns variant", cmd_campaigns(bad / "campaigns.csv"), False, "variant spellings")
    expect("campaigns tuple", cmd_campaigns(bad / "campaigns.csv"), False, "used by 2 rows")
    expect("campaigns columns", cmd_campaigns(bad / "short.csv"), False, "missing columns")
    print("utm_check self-test: ok")
    return 0


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--self-test", action="store_true")
    sub = parser.add_subparsers(dest="cmd")
    p = sub.add_parser("tags")
    p.add_argument("--decision", type=Path)
    p.add_argument("files", nargs="*", type=Path)
    p = sub.add_parser("owned")
    p.add_argument("--host", action="append", default=[], required=True)
    p.add_argument("files", nargs="*", type=Path)
    p = sub.add_parser("campaigns")
    p.add_argument("file", type=Path)
    args = parser.parse_args(argv)
    if args.self_test:
        return self_test()
    if not args.cmd:
        parser.print_usage(sys.stderr)
        return 2
    try:
        if args.cmd == "tags":
            return report(cmd_tags(args.decision, [f for f in args.files if f.is_file()]))
        if args.cmd == "owned":
            hosts = {h.lower().removeprefix("www.") for h in args.host}
            return report(cmd_owned(hosts, [f for f in args.files if f.is_file()]))
        return report(cmd_campaigns(args.file))
    except OSError as err:
        print(f"utm_check: {err}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
