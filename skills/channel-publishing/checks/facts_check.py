#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Validate platform-facts registries (CH-CORE-12, 13, 14, 15).

A registry is a Markdown file whose table rows have the columns
  id, platform, fact, value, url, source_date, verified, refresh_days, provenance, expect
and an id of the form [A-Z]+-F[0-9]+.

Checks:
  CH-CORE-12  column grammar: ten columns, https url, three source_date forms,
              absolute verified date, refresh_days enum, provenance enum, an
              expect regex that compiles; no web.archive.org url (CH-CORE-14)
  CH-CORE-13  verified + refresh_days is not past; an expires date has not passed
  CH-CORE-15  with --hosts FILE, a platform or authority row's host is listed

--refetch is the weekly job of CH-CORE-14. It prints MANUAL, UNREACHABLE or
CHANGED lines and always exits 0, so it never blocks a merge.

Usage:
  facts_check.py [--today YYYY-MM-DD] [--hosts FILE] FILE...
  facts_check.py --refetch FILE...
  facts_check.py --self-test

Exit codes: 0 clean, 1 findings, 2 usage or unreadable input.
Run as: python3 -I facts_check.py ...
"""

from __future__ import annotations

import argparse
import re
import sys
import urllib.error
import urllib.request
from collections.abc import Callable
from datetime import date, timedelta
from pathlib import Path

ROW_RE = re.compile(r"^\| ([A-Z]+-F[0-9]+) ")
DATE_RE = r"20[0-9][0-9]-[01][0-9]-[0-3][0-9]"
PROVENANCE = ("platform", "authority", "independent", "vendor")
# Hosts that ban automated access or answer scripts with 403 (CH-CORE-14).
MANUAL_RE = re.compile(
    r"(^|\.)(linkedin\.com|producthunt\.com|help\.x\.com|reddit\.com|reddithelp\.com"
    r"|ftc\.gov|support-dev\.discord\.com)$"
)
FIXTURES = Path(__file__).resolve().parent / "fixtures" / "facts"


def to_date(text: str) -> date | None:
    try:
        return date.fromisoformat(text)
    except ValueError:
        return None


def read_rows(path: Path) -> list[tuple[int, list[str]]]:
    rows = []
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if ROW_RE.match(line):
            rows.append((number, [c.strip() for c in line.strip().split("|")]))
    return rows


def load_hosts(path: Path) -> set[str]:
    hosts = set()
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if line and not line.startswith("#"):
            hosts.add(" ".join(line.split()))
    return hosts


def check_files(files: list[Path], today: date, hosts: set[str] | None) -> list[str]:
    out: list[str] = []
    seen: dict[str, Path] = {}
    for path in files:
        for number, cells in read_rows(path):
            where = f"{path}:{number}"
            if len(cells) != 12:
                out.append(
                    f"{where}: {len(cells) - 2} columns, want 10 (a cell holds a literal pipe?)"
                )
                continue
            rid, _plat, _fact, _val, url, src, verified, refresh, prov, expect = cells[1:11]

            def bad(what: str, where: str = where, rid: str = rid) -> None:
                out.append(f"{where}: {rid}: {what}")

            if rid in seen:
                bad(f"id also defined in {seen[rid]}")
            seen[rid] = path
            if not re.fullmatch(r"https://\S+", url):
                bad("url is not an https URL")
            elif "web.archive.org" in url:
                bad(
                    "url is an archive capture; cite the canonical page and keep the capture in a history note"
                )
            if not re.fullmatch(rf"{DATE_RE}|relative:.+@{DATE_RE}|none", src) or (
                re.fullmatch(DATE_RE, src) and not to_date(src)
            ):
                bad("source_date is not a date, relative:<text>@<date> or none")
            checked = to_date(verified) if re.fullmatch(DATE_RE, verified) else None
            if not checked:
                bad("verified is not an absolute date")
            if not re.fullmatch(rf"30|90|180|expires:{DATE_RE}", refresh):
                bad("refresh_days is not 30, 90, 180 or expires:<date>")
            if prov not in PROVENANCE:
                bad("provenance is not platform, authority, independent or vendor")
            if not expect:
                bad("expect is empty")
            else:
                try:
                    re.compile(expect)
                except re.error as err:
                    bad(f"expect does not compile: {err}")
            if checked and refresh in ("30", "90", "180"):
                due = checked + timedelta(days=int(refresh))
                if due < today:
                    bad(
                        f"overdue by {(today - due).days} days (verified {verified}, refresh_days {refresh}); re-fetch it"
                    )
            if refresh.startswith("expires:"):
                end = to_date(refresh[8:])
                if end and end < today:
                    bad(f"expired on {refresh[8:]}")
            if hosts is not None and prov in ("platform", "authority"):
                host = url.split("/")[2] if url.count("/") >= 2 else url
                if f"{host} {prov}" not in hosts:
                    bad(f"host {host} is not allowlisted as {prov} (CH-CORE-15)")
    return out


def refetch(files: list[Path], fetch: Callable[[str], tuple[int, str]]) -> list[str]:
    out: list[str] = []
    for path in files:
        for _n, cells in read_rows(path):
            if len(cells) != 12:
                continue
            rid, url, verified, refresh, expect = cells[1], cells[5], cells[7], cells[8], cells[10]
            host = url.split("/")[2] if url.count("/") >= 2 else ""
            if MANUAL_RE.search(host):
                base = to_date(verified)
                due = (
                    (base + timedelta(days=int(refresh))).isoformat()
                    if base and refresh.isdigit()
                    else refresh
                )
                out.append(f"MANUAL {rid} {url} due {due}")
                continue
            code, body = fetch(url)
            if not 200 <= code < 300:
                out.append(f"UNREACHABLE {rid} {code} {url}")
                continue
            text = re.sub(r"<[^>]*>", " ", body)
            try:
                found = re.search(expect, text)
            except re.error:
                found = None
            if not found:
                out.append(f"CHANGED {rid} {url}")
    return out


def http_fetch(url: str) -> tuple[int, str]:
    if not url.startswith("https://"):
        return 0, ""
    opener = urllib.request.build_opener()
    opener.addheaders = [("User-Agent", "Mozilla/5.0 (compatible; facts-check)")]
    try:
        with opener.open(url, timeout=40) as reply:
            return reply.status, reply.read(2_000_000).decode("utf-8", "replace")
    except urllib.error.HTTPError as err:
        return err.code, ""
    except (urllib.error.URLError, TimeoutError, OSError):
        return 0, ""


def self_test() -> int:
    today = date(2026, 11, 27)

    def run(path: Path, hosts: set[str] | None = None) -> list[str]:
        return check_files([path], today, hosts)

    good = run(FIXTURES / "pass" / "facts.md")
    if good:
        raise SystemExit(f"self-test: pass fixture reported {good}")
    bad = " ".join(run(FIXTURES / "fail" / "facts.md"))
    for needle in (
        "5 columns",
        "source_date",
        "verified is not",
        "refresh_days",
        "provenance",
        "expect is empty",
        "does not compile",
        "overdue by",
        "expired on",
        "archive capture",
        "also defined",
        "not an https",
    ):
        if needle not in bad:
            raise SystemExit(f"self-test: fail fixture did not report {needle!r}: {bad}")
    hosts = load_hosts(FIXTURES / "hosts.txt")
    if run(FIXTURES / "pass" / "facts.md", hosts):
        raise SystemExit("self-test: allowlisted host reported")
    if "not allowlisted" not in " ".join(run(FIXTURES / "fail" / "facts.md", hosts)):
        raise SystemExit("self-test: unlisted host not reported")
    lines = refetch(
        [FIXTURES / "pass" / "facts.md"],
        lambda url: (200, "<p>Up to 3000 characters</p>") if "ok" in url else (403, ""),
    )
    kinds = sorted(line.split()[0] for line in lines)
    if kinds != ["MANUAL", "UNREACHABLE"]:
        raise SystemExit(f"self-test: refetch kinds {kinds}")
    changed = refetch([FIXTURES / "pass" / "facts.md"], lambda url: (200, "<p>nothing here</p>"))
    if "CHANGED" not in " ".join(changed):
        raise SystemExit("self-test: a page without its expect text was not reported CHANGED")
    print("facts_check self-test: ok")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("files", nargs="*", type=Path)
    parser.add_argument("--today", help="override today's date (YYYY-MM-DD)")
    parser.add_argument(
        "--hosts", type=Path, help="allowlist of '<host> <provenance>' lines (CH-CORE-15)"
    )
    parser.add_argument(
        "--refetch", action="store_true", help="weekly re-fetch job (CH-CORE-14); always exits 0"
    )
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args(argv)
    if args.self_test:
        return self_test()
    if not args.files:
        parser.print_usage(sys.stderr)
        return 2
    today = to_date(args.today) if args.today else date.today()
    if today is None:
        print("facts_check: --today is not a date", file=sys.stderr)
        return 2
    try:
        if args.refetch:
            for line in refetch(args.files, http_fetch):
                print(line)
            return 0
        hosts = load_hosts(args.hosts) if args.hosts else None
        findings = check_files(args.files, today, hosts)
    except OSError as err:
        print(f"facts_check: {err}", file=sys.stderr)
        return 2
    for line in findings:
        print(line)
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main())
