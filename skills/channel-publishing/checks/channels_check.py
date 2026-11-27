#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Validate a channels.yml inventory and the links that name its channels.

Rules covered:
  CH-CORE-02  an automation: bot row has every key, every gate of its platform,
              a recent attestation and, on X, a spend cap; bots exist on five
              platforms only
  CH-CORE-17  every row has the required keys, enum values and an absolute
              last_checked
  CH-CORE-18  forward links (every active row's url is in each linked_from file),
              reverse links (every channel URL in owned sources matches a row),
              staleness (90 days warn, 180 days fail) and zero links for
              retired and planned rows
  CH-CORE-19  an inferred handle is never active or linked; a failed probe is
              never recorded as absence

channels.yml uses a small YAML subset, documented in the skill's
references/channels-inventory.md: a top-level 'channels:' list of flat mappings,
scalars, inline [a, b] lists and '- item' block lists. Comments start with '#'.

Usage:
  channels_check.py [--root DIR] [--today YYYY-MM-DD] [--no-links] channels.yml
  channels_check.py --self-test

Exit codes: 0 clean (warnings do not fail), 1 findings, 2 usage or unreadable input.
Run as: python3 -I channels_check.py ...
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from datetime import date
from pathlib import Path

REQUIRED = ("id", "platform", "handle", "url", "status", "ownership", "verified_by", "owner_role",
            "automation", "approved_by", "labels_required", "credential", "last_checked", "linked_from")
BOT_REQUIRED = ("runs_from", "gates_attested", "attested_by", "attested_at")
ENUMS = {
    "status": ("active", "planned", "retired", "squatted", "none"),
    "ownership": ("proven", "inferred"),
    "automation": ("none", "drafts", "bot"),
}
GATES = {
    "x": ("x-label", "x-bio", "x-human", "x-summoned"),
    "bluesky": ("bs-label", "bs-optin"),
    "threads": ("th-ai",),
    "mastodon": ("ma-flag", "ma-rule6"),
    "discord": ("dc-nobot", "dc-offtopic"),
}
CHANNEL_RE = re.compile(
    r"discord\.(gg|com/invite)/|youtube\.com/@|youtu\.be/|linkedin\.com/(in|company|showcase)/"
    r"|(x|twitter)\.com/[A-Za-z0-9_]+|bsky\.app/profile/"
)
URL_RE = re.compile(r"https?://[^\s)\]>\"'<`]+")
SKIP_PARTS = {".git", ".agents", "node_modules", "fixtures", "test"}
FIXTURES = Path(__file__).resolve().parent / "fixtures" / "channels"


def scalar(text: str) -> str:
    text = text.strip()
    if len(text) >= 2 and text[0] == text[-1] and text[0] in "'\"":
        text = text[1:-1]
    return "" if text in ("null", "~") else text


def parse(text: str) -> list[dict]:
    rows: list[dict] = []
    current: dict | None = None
    key = ""
    item_indent = None
    for raw in text.splitlines():
        line = re.sub(r"\s+#.*$", "", raw).rstrip()
        if not line.strip() or line.lstrip().startswith("#") or line.strip() == "channels:":
            continue
        item = re.match(r"^(\s*)- ([A-Za-z_]+):\s*(.*)$", line)
        if item and item_indent is None:
            item_indent = len(item.group(1))
        if item and len(item.group(1)) != item_indent:
            item = None  # an indented '- word: text' is a list entry, not a new row
        sub = re.match(r"^\s+([A-Za-z_]+):\s*(.*)$", line)
        listed = re.match(r"^\s+- (.*)$", line)
        if item:
            current = {}
            rows.append(current)
            key, value = item.group(2), item.group(3)
        elif sub and current is not None:
            key, value = sub.group(1), sub.group(2)
        elif listed and current is not None and isinstance(current.get(key), list):
            current[key].append(scalar(listed.group(1)))
            continue
        else:
            raise ValueError(f"cannot read line: {raw.strip()[:60]}")
        if value.startswith("[") and value.endswith("]"):
            current[key] = [scalar(v) for v in value[1:-1].split(",") if v.strip()]
        elif value == "":
            current[key] = []  # becomes a block list, or stays empty
        else:
            current[key] = scalar(value)
    return rows


def as_list(value: object) -> list[str]:
    return value if isinstance(value, list) else ([value] if value else [])


def norm(url: str) -> str:
    return re.sub(r"^https?://(www\.)?", "", url.strip().lower()).rstrip("/.,;")


def owned_files(root: Path) -> list[Path]:
    try:
        listed = subprocess.run(["git", "-C", str(root), "ls-files", "-z", "--cached", "--others", "--exclude-standard"], capture_output=True, check=True).stdout
        names = [Path(n.decode()) for n in listed.split(b"\0") if n]
    except (OSError, subprocess.CalledProcessError):
        names = [p.relative_to(root) for p in root.rglob("*") if p.is_file()]
    keep = []
    for name in names:
        if SKIP_PARTS & set(name.parts) or name.parts[:2] == (".claude", "artifacts"):
            continue
        if name.suffix == ".lock" or "-lock." in name.name:
            continue
        keep.append(name)
    return keep


def check(path: Path, today: date, root: Path | None) -> tuple[list[str], list[str]]:
    fails: list[str] = []
    warns: list[str] = []
    rows = parse(path.read_text(encoding="utf-8"))
    for row in rows:
        rid = row.get("id") or "?"

        def bad(msg: str, rid: str = rid) -> None:
            fails.append(f"{path}: {rid}: {msg}")

        missing = [k for k in REQUIRED if k not in row]
        if missing:
            bad(f"missing keys {', '.join(missing)}")
        for k, allowed in ENUMS.items():
            if k in row and row[k] not in allowed:
                bad(f"{k} is {row[k]!r}, want one of {'/'.join(allowed)}")
        try:
            checked = date.fromisoformat(row.get("last_checked", ""))
            age = (today - checked).days
            if age > 180:
                bad(f"last_checked is {age} days old (fails after 180)")
            elif age > 90:
                warns.append(f"{path}: {rid}: last_checked is {age} days old (fails after 180)")
        except ValueError:
            bad("last_checked is not an absolute date")
        status, owner, links = row.get("status"), row.get("ownership"), as_list(row.get("linked_from"))
        verified = str(row.get("verified_by", ""))
        if owner == "inferred" and (status == "active" or links):
            bad("ownership is inferred, so the row is not active and has no linked_from (CH-CORE-19)")
        if owner == "proven" and not verified:
            bad("ownership is proven but verified_by is empty")
        if verified.startswith("not provable") and not re.fullmatch(r"not provable \([^,)]+, \d{4}-\d\d-\d\d\)", verified):
            bad("verified_by must read: not provable (<code>, <date>)")
        if status in ("retired", "none") and (verified.startswith("not provable") or re.fullmatch(r"(HTTP )?[0-9]{3}", verified)):
            bad(f"status {status} rests on a failed probe; a 403 is not absence (CH-CORE-19)")
        if status in ("retired", "planned") and links:
            bad(f"a {status} row has linked_from entries (CH-CORE-18)")
        if row.get("automation") == "bot":
            platform = str(row.get("platform", "")).lower()
            if platform not in GATES:
                bad(f"automation: bot on {platform!r}; bots exist on {', '.join(GATES)} only (CH-CORE-02)")
                continue
            for k in ("approved_by", "credential", "labels_required", *BOT_REQUIRED):
                if not row.get(k):
                    bad(f"bot row has empty or missing {k}")
            lacking = [g for g in GATES[platform] if g not in as_list(row.get("gates_attested"))]
            if lacking:
                bad(f"gates_attested lacks {', '.join(lacking)}")
            try:
                when = (today - date.fromisoformat(row.get("attested_at", ""))).days
                if when > 90:
                    bad(f"attested_at is {when} days old (fails after 90)")
            except ValueError:
                bad("attested_at is not an absolute date")
            if platform == "x" and not row.get("spend_cap"):
                bad("X bot row has no spend_cap")
    if root is not None:
        fails += link_findings(path, rows, root)
    return fails, warns


def link_findings(path: Path, rows: list[dict], root: Path) -> list[str]:
    out: list[str] = []
    for row in rows:
        if row.get("status") != "active" or not row.get("url"):
            continue
        for rel in as_list(row.get("linked_from")):
            target = root / rel
            if not target.is_file() or row["url"].rstrip("/") not in target.read_text(encoding="utf-8", errors="ignore"):
                out.append(f"{path}: {row.get('id')}: {rel} does not contain {row['url']} (forward link)")
    known = [norm(r["url"]) for r in rows if r.get("url")]
    for name in owned_files(root):
        try:
            data = (root / name).read_bytes()[:2_000_000]
        except OSError:
            continue
        if b"\0" in data:
            continue
        for lineno, line in enumerate(data.decode("utf-8", "replace").splitlines(), 1):
            for hit in URL_RE.findall(line):
                if CHANNEL_RE.search(hit) and not any(norm(hit) == k or norm(hit).startswith(k + "/") for k in known):
                    out.append(f"{name}:{lineno}: {hit.rstrip('.,;')} matches no channels.yml row (reverse link)")
    return out


def self_test() -> int:
    today = date(2026, 11, 27)
    root = FIXTURES / "pass"
    fails, _ = check(root / "channels.yml", today, root)
    if fails:
        raise SystemExit(f"self-test: pass fixture reported {fails}")
    root = FIXTURES / "fail"
    fails, warns = check(root / "channels.yml", today, root)
    text = " ".join(fails)
    for needle in ("missing keys", "want one of", "CH-CORE-19", "a 403 is not absence", "retired row has linked_from",
                   "bots exist on", "lacks x-bio", "attested_at is", "no spend_cap", "days old (fails after 180)",
                   "forward link", "reverse link", "not provable (<code>"):
        if needle not in text:
            raise SystemExit(f"self-test: fail fixture did not report {needle!r}: {text}")
    if not any("fails after 180" in w for w in warns):
        raise SystemExit("self-test: a 90-day-old last_checked did not warn")
    print("channels_check self-test: ok")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("channels", nargs="?", type=Path)
    parser.add_argument("--root", type=Path, default=Path("."), help="repository root for the link checks")
    parser.add_argument("--today", help="override today's date (YYYY-MM-DD)")
    parser.add_argument("--no-links", action="store_true", help="skip the CH-CORE-18 link checks")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args(argv)
    if args.self_test:
        return self_test()
    if not args.channels:
        parser.print_usage(sys.stderr)
        return 2
    try:
        today = date.fromisoformat(args.today) if args.today else date.today()
        fails, warns = check(args.channels, today, None if args.no_links else args.root)
    except (OSError, ValueError) as err:
        print(f"channels_check: {err}", file=sys.stderr)
        return 2
    for line in warns:
        print(f"warn: {line}")
    for line in fails:
        print(line)
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
