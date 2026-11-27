#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Check what a site loads against the measurement decision record (MKT-MEAS-01, 03, 04, 05, 06, 07).

Subcommands:
  scan --decision FILE [FILE...]      MKT-MEAS-01, 05, 07: analytics hosts, SDKs and placeholders
                                      in the given source files, each tool named in the record
  decision FILE                       MKT-MEAS-01: the record names every required field
  hosts DIST [--own HOST]... [--decision FILE] [--statement FILE]
                                      MKT-MEAS-03: external script hosts not in allowed_hosts;
                                      MKT-MEAS-06: third-party hosts and storage keys the
                                      privacy statement does not name
  beacons DIST                        MKT-MEAS-03: inline beacons and 1-pixel images
  live-diff DIST LIVE [--decision FILE]
                                      MKT-MEAS-03: same-origin scripts the live page has and the
                                      build lacks (CDN injection), unless the record names them
  har FILE [--cookieless]             MKT-MEAS-04, 05: a recorded HAR holds no utm_ in a beacon,
                                      no referrer path, and no cookie when --cookieless
  --self-test                         run the fixtures under fixtures/inventory

DIST and LIVE are a directory of .html and .js files (LIVE is saved with curl) or one file.
The decision record is a text file of `key: value` lines (see references/collection.md).

Exit codes: 0 clean, 1 findings, 2 usage or unreadable input.
Run as: python3 -I inventory_check.py ...
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

FIXTURES = Path(__file__).resolve().parent / "fixtures" / "inventory"
REQUIRED = ("tools", "version", "host", "jurisdictions", "consent_route", "acquisition_data")

# (pattern, tool name). A hit passes only when the tool name appears in the decision record.
TOOLS = [
    (r"plausible\.io/js|data-domain=", "plausible"),
    (r"usefathom\.com", "fathom"),
    (r"posthog-js|i\.posthog\.com", "posthog"),
    (r"matomo\.js|piwik\.js|_paq\.push", "matomo"),
    (r"cloud\.umami\.is|umami\.js|data-website-id=", "umami"),
    (r"googletagmanager\.com|google-analytics\.com|gtag\(", "google"),
    (r"gc\.zgo\.at|goatcounter\.com/count", "goatcounter"),
    (r"clarity\.ms", "clarity"),
    (r"static\.hotjar\.com", "hotjar"),
    (r"cdn\.segment\.com|@segment/analytics", "segment"),
    (r"cdn\.mxpnl\.com|mixpanel-browser", "mixpanel"),
    (r"@amplitude/|cdn\.amplitude\.com", "amplitude"),
    (r"cloudflareinsights\.com", "cloudflare"),
]
PLACEHOLDER = re.compile(r"<!--[^>]*\banalytics\b[^>]*-->", re.IGNORECASE)
UNPINNED = re.compile(r"""<script[^>]+src=["'][^"']*(?:@latest|/latest/)""", re.IGNORECASE)
POSTHOG_ALWAYS = re.compile(r"""cookieless_mode\s*:\s*['"]always['"]""")
POSTHOG_OPTOUT = re.compile(r"opt_out_capturing|identify\(|alias\(")
BEACON = re.compile(
    r"navigator\.sendBeacon|/api/event|/matomo\.php|/collect\?|/j/collect|_paq\.push|gtag\("
)
PIXEL = re.compile(r"""<img[^>]+\b(?:width|height)=["']?1["']?(?=[\s/>"'])""", re.IGNORECASE)
HOST_TAG = re.compile(
    r"""<(script|link|img|iframe)\b([^>]*?)\b(?:src|href)=["']https?://([^"'/?#]+)""",
    re.IGNORECASE | re.DOTALL,
)
REL_SKIP = re.compile(
    r"""rel=["'](?:canonical|alternate|me|author|license|sitemap)["']""", re.IGNORECASE
)
LOCAL_SCRIPT = re.compile(r"""<script[^>]+src=["'](/[^"']*)""", re.IGNORECASE)
STORAGE_KEY = re.compile(
    r"""(?:localStorage|sessionStorage)\.(?:get|set|remove)Item\(\s*["']([^"']+)["']"""
)
STORAGE_API = re.compile(r"document\.cookie|indexedDB")
UTM_IN_BEACON = re.compile(r"utm_[a-z]+", re.IGNORECASE)
REF_PARAM = re.compile(
    r"""(?:[?&]|["'])(?:r|ref|referrer|urlref)(?:=|["']\s*:\s*["'])(https?(?::|%3A)(?://|%2F%2F)[^/&"'%]+(?:/|%2F)[^&"'\s]+)""",
    re.IGNORECASE,
)


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def files_under(target: Path, suffixes: tuple[str, ...] = (".html", ".js", ".mjs")) -> list[Path]:
    if target.is_file():
        return [target]
    return sorted(p for p in target.rglob("*") if p.is_file() and p.suffix in suffixes)


def lineno(text: str, pos: int) -> int:
    return text.count("\n", 0, pos) + 1


def parse_record(path: Path | None) -> dict[str, str]:
    record: dict[str, str] = {}
    if path is None or not path.is_file():
        return record
    for line in read(path).splitlines():
        m = re.match(r"^\s*[-*]?\s*([A-Za-z_][A-Za-z0-9_ -]*?)\s*:\s*(.*)$", line)
        if m:
            record[m.group(1).strip().lower().replace(" ", "_").replace("-", "_")] = m.group(
                2
            ).strip()
    return record


def cmd_decision(path: Path) -> list[str]:
    if not path.is_file():
        return [f"{path}: MKT-MEAS-01: no decision record"]
    rec = parse_record(path)
    return [f"{path}: MKT-MEAS-01: record lacks `{k}`" for k in REQUIRED if not rec.get(k)]


def cmd_scan(decision: Path | None, files: list[Path]) -> list[str]:
    out: list[str] = []
    rec = parse_record(decision)
    record_text = read(decision).lower() if decision and decision.is_file() else ""
    hit = False
    for path in files:
        text = read(path)
        for pattern, tool in TOOLS:
            for m in re.finditer(pattern, text):
                hit = True
                if tool not in record_text:
                    out.append(
                        f"{path}:{lineno(text, m.start())}: MKT-MEAS-01: {tool} is not named in the decision record"
                    )
                    break
        for m in PLACEHOLDER.finditer(text):
            out.append(
                f"{path}:{lineno(text, m.start())}: MKT-MEAS-01: analytics placeholder block; fill none"
            )
        for m in UNPINNED.finditer(text):
            out.append(f"{path}:{lineno(text, m.start())}: MKT-MEAS-05: unpinned script version")
        if POSTHOG_ALWAYS.search(text) and POSTHOG_OPTOUT.search(text):
            out.append(
                f"{path}: MKT-MEAS-07: cookieless_mode 'always' with identify, alias or an opt-out call"
            )
    if hit and decision and decision.is_file():
        missing = [k for k in REQUIRED if not rec.get(k)]
        if missing:
            out.append(f"{decision}: MKT-MEAS-01: record lacks {', '.join(missing)}")
    return out


def third_party(text: str, own: set[str]) -> list[tuple[int, str, str]]:
    found = []
    for m in HOST_TAG.finditer(text):
        tag, attrs, host = m.group(1).lower(), m.group(2), m.group(3).lower()
        if tag == "link" and REL_SKIP.search(attrs):
            continue
        if host in own:
            continue
        found.append((lineno(text, m.start()), tag, host))
    return found


def cmd_hosts(
    dist: Path, own: set[str], decision: Path | None, statement: Path | None
) -> list[str]:
    out: list[str] = []
    allowed = {
        h.lower() for h in re.split(r"[\s,]+", parse_record(decision).get("allowed_hosts", "")) if h
    }
    stated = read(statement).lower() if statement else None
    for path in files_under(dist, (".html",)):
        text = read(path)
        for line, tag, host in third_party(text, own):
            if tag == "script" and host not in allowed:
                out.append(
                    f"{path}:{line}: MKT-MEAS-03: external script host {host} is not in allowed_hosts"
                )
            if stated is not None and host not in stated:
                out.append(
                    f"{path}:{line}: MKT-MEAS-06: {tag} host {host} is not named in the privacy statement"
                )
    if stated is not None:
        for path in files_under(dist):
            text = read(path)
            for m in STORAGE_KEY.finditer(text):
                if m.group(1).lower() not in stated:
                    out.append(
                        f"{path}:{lineno(text, m.start())}: MKT-MEAS-06: storage key {m.group(1)} is not named in the privacy statement"
                    )
            for m in STORAGE_API.finditer(text):
                word = "indexeddb" if m.group(0) == "indexedDB" else "cookie"
                if word not in stated:
                    out.append(
                        f"{path}:{lineno(text, m.start())}: MKT-MEAS-06: {m.group(0)} is used and the statement does not mention it"
                    )
    return out


def cmd_beacons(dist: Path) -> list[str]:
    out: list[str] = []
    for path in files_under(dist):
        text = read(path)
        for m in BEACON.finditer(text):
            out.append(f"{path}:{lineno(text, m.start())}: MKT-MEAS-03: inline beacon {m.group(0)}")
        if path.suffix == ".html":
            for m in PIXEL.finditer(text):
                out.append(f"{path}:{lineno(text, m.start())}: MKT-MEAS-03: 1-pixel image")
    return out


def local_scripts(target: Path) -> set[str]:
    found: set[str] = set()
    for path in files_under(target, (".html",)):
        found.update(LOCAL_SCRIPT.findall(read(path)))
    return found


def cmd_live_diff(dist: Path, live: Path, decision: Path | None) -> list[str]:
    named = read(decision) if decision and decision.is_file() else ""
    return [
        f"{live}: MKT-MEAS-03: live page loads {src}, which the build does not contain and the record does not name"
        for src in sorted(local_scripts(live) - local_scripts(dist))
        if src not in named
    ]


def cmd_har(path: Path, cookieless: bool) -> list[str]:
    out: list[str] = []
    entries = json.loads(read(path)).get("log", {}).get("entries", [])
    for number, entry in enumerate(entries):
        req = entry.get("request", {})
        url = req.get("url", "")
        body = (req.get("postData") or {}).get("text", "")
        if number > 0 and (UTM_IN_BEACON.search(url) or UTM_IN_BEACON.search(body)):
            out.append(
                f"{path}: MKT-MEAS-04: request {number} carries a utm_ parameter: {url[:80]}"
            )
        for blob in (url, body):
            if number > 0 and REF_PARAM.search(blob):
                out.append(
                    f"{path}: MKT-MEAS-04: request {number} sends a referrer with a path: {url[:80]}"
                )
                break
        if cookieless and (req.get("cookies") or entry.get("response", {}).get("cookies")):
            out.append(f"{path}: MKT-MEAS-05: request {number} sets or sends a cookie: {url[:80]}")
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
            raise SystemExit(f"self-test {label}: expected a finding with {needle!r}, got {got}")

    expect("scan pass", cmd_scan(ok / "decision.md", [ok / "dist" / "index.html"]), True)
    expect("scan fail", cmd_scan(None, [bad / "dist" / "index.html"]), False, "plausible")
    expect("scan placeholder", cmd_scan(None, [bad / "dist" / "index.html"]), False, "placeholder")
    expect("scan named", cmd_scan(ok / "decision.md", [ok / "plausible.html"]), True)
    expect(
        "scan incomplete record",
        cmd_scan(bad / "decision.md", [ok / "plausible.html"]),
        False,
        "lacks",
    )
    expect("posthog", cmd_scan(ok / "decision.md", [bad / "posthog.js"]), False, "MKT-MEAS-07")
    expect("decision pass", cmd_decision(ok / "decision.md"), True)
    expect("decision fail", cmd_decision(bad / "decision.md"), False, "lacks")
    expect(
        "hosts pass",
        cmd_hosts(ok / "dist", {"example.com"}, ok / "decision.md", ok / "privacy.md"),
        True,
    )
    expect(
        "hosts fail",
        cmd_hosts(bad / "dist", {"example.com"}, bad / "decision.md", ok / "privacy.md"),
        False,
        "MKT-MEAS-03",
    )
    expect(
        "statement fail",
        cmd_hosts(bad / "dist", {"example.com"}, None, ok / "privacy.md"),
        False,
        "MKT-MEAS-06",
    )
    expect("beacons pass", cmd_beacons(ok / "dist"), True)
    expect("beacons fail", cmd_beacons(bad / "dist"), False, "1-pixel")
    expect("live pass", cmd_live_diff(ok / "dist", ok / "live", None), True)
    expect("live fail", cmd_live_diff(bad / "dist", bad / "live", None), False, "email-decode")
    expect("live named", cmd_live_diff(bad / "dist", bad / "live", ok / "decision-live.md"), True)
    expect("har pass", cmd_har(ok / "clean.har", True), True)
    expect("har utm", cmd_har(bad / "beacon.har", False), False, "utm_")
    expect("har referrer", cmd_har(bad / "beacon.har", False), False, "referrer")
    expect("har cookie", cmd_har(bad / "beacon.har", True), False, "cookie")
    print("inventory_check self-test: ok")
    return 0


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--self-test", action="store_true")
    sub = parser.add_subparsers(dest="cmd")
    p = sub.add_parser("scan")
    p.add_argument("--decision", type=Path)
    p.add_argument("files", nargs="*", type=Path)
    p = sub.add_parser("decision")
    p.add_argument("file", type=Path)
    p = sub.add_parser("hosts")
    p.add_argument("dist", type=Path)
    p.add_argument("--own", action="append", default=[])
    p.add_argument("--decision", type=Path)
    p.add_argument("--statement", type=Path)
    p = sub.add_parser("beacons")
    p.add_argument("dist", type=Path)
    p = sub.add_parser("live-diff")
    p.add_argument("dist", type=Path)
    p.add_argument("live", type=Path)
    p.add_argument("--decision", type=Path)
    p = sub.add_parser("har")
    p.add_argument("file", type=Path)
    p.add_argument("--cookieless", action="store_true")
    args = parser.parse_args(argv)
    if args.self_test:
        return self_test()
    if not args.cmd:
        parser.print_usage(sys.stderr)
        return 2
    try:
        if args.cmd == "scan":
            return report(cmd_scan(args.decision, [f for f in args.files if f.is_file()]))
        if args.cmd == "decision":
            return report(cmd_decision(args.file))
        if args.cmd == "hosts":
            return report(
                cmd_hosts(args.dist, {h.lower() for h in args.own}, args.decision, args.statement)
            )
        if args.cmd == "beacons":
            return report(cmd_beacons(args.dist))
        if args.cmd == "live-diff":
            return report(cmd_live_diff(args.dist, args.live, args.decision))
        return report(cmd_har(args.file, args.cookieless))
    except (OSError, json.JSONDecodeError) as err:
        print(f"inventory_check: {err}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
