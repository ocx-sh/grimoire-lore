#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Boundary checks for public-channel work (CH-CORE-01, 02, 04, 10).

Subcommands:
  scan --repo ORG/REPO --channels channels.yml [--root DIR] [--exclude TEXT]... [PATH...]
      CH-CORE-01 and 02. Lists every workflow or skill file that names a posting
      endpoint or a publishing secret and is not the 'runs_from' of a channels.yml
      row. With no PATH it lists git-tracked files under skills, .claude/skills
      and .github/workflows. Files under a channel-publishing directory and files
      named facts.md are skipped, because they name endpoints on purpose.
  browser PATH...
      CH-CORE-01. Fails on playwright, puppeteer or selenium in channel skills.
  package FILE...
      CH-CORE-01 and 04. A publish package has the ten header keys, leaves
      approved_by and approved_at empty, and never targets Stack Overflow.
  gitleaks CONFIG
      CH-CORE-10. The config holds the discord-webhook-url and
      google-oauth-refresh-token rules.
  --self-test

Exit codes: 0 clean, 1 findings, 2 usage or unreadable input.
Run as: python3 -I boundary_check.py ...
"""

from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
import tomllib
from pathlib import Path

ENDPOINTS = re.compile(
    r"api\.linkedin\.com/(rest|v2)/(posts|ugcPosts)|/2/tweets|threads_publish|com\.atproto\.repo\.createRecord"
    r"|youtube/v3/videos|/api/v1/statuses|discord(app)?\.com/api/webhooks|open\.tiktokapis\.com"
    r"|(oauth|www)\.reddit\.com/api/(submit|comment)|news\.ycombinator\.com/(submit|comment)"
    r"|api\.producthunt\.com/v2/api/graphql"
)
SECRETS = re.compile(
    r"secrets\.[A-Z0-9_]*(DISCORD|WEBHOOK|LINKEDIN|TWITTER|X_API|BLUESKY|BSKY|MASTODON|THREADS|YOUTUBE|REDDIT"
    r"|PRODUCTHUNT|TIKTOK)[A-Z0-9_]*"
)
BROWSER = re.compile(r"playwright|puppeteer|selenium", re.IGNORECASE)
HEADER_KEYS = (
    "platform",
    "account",
    "action",
    "labels",
    "ai_role",
    "sponsored",
    "spend",
    "open_asks",
    "approved_by",
    "approved_at",
)
RULES = ("discord-webhook-url", "google-oauth-refresh-token")
HERE = Path(__file__).resolve().parent
FIXTURES = HERE / "fixtures" / "boundary"


def listed_files(root: Path) -> list[str]:
    git = shutil.which("git")
    if git is None:
        print("boundary_check: git not found on PATH", file=sys.stderr)
        raise SystemExit(2)
    out = subprocess.run(  # noqa: S603  git is resolved with shutil.which, args are fixed
        [git, "ls-files", "-z", "--", "skills", ".claude/skills", ".github/workflows"],
        cwd=root,
        capture_output=True,
        check=True,
    ).stdout
    return [n.decode() for n in out.split(b"\0") if n]


def scan(root: Path, paths: list[str], repo: str, channels: str, exclude: list[str]) -> list[str]:
    out = []
    for rel in paths:
        parts = Path(rel).parts
        if (
            "channel-publishing" in parts
            or parts[-1] == "facts.md"
            or any(x in rel for x in exclude)
        ):
            continue
        text = (root / rel).read_text(encoding="utf-8", errors="ignore")
        if (
            ENDPOINTS.search(text) or SECRETS.search(text)
        ) and f"runs_from: {repo}/{rel}" not in channels:
            out.append(f"UNLISTED {repo}/{rel}")
    return out


def browser(paths: list[Path]) -> list[str]:
    out = []
    for path in paths:
        for number, line in enumerate(
            path.read_text(encoding="utf-8", errors="ignore").splitlines(), 1
        ):
            if BROWSER.search(line):
                out.append(f"{path}:{number}: browser automation in a channel skill (CH-CORE-01)")
    return out


def package(path: Path) -> list[str]:
    header: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            break
        match = re.match(r"^([a-z_]+):\s*(.*)$", line)
        if match:
            header[match.group(1)] = match.group(2).strip()
    out = [f"{path}: header lacks {k}" for k in HEADER_KEYS if k not in header]
    for key in ("approved_by", "approved_at"):
        if header.get(key):
            out.append(f"{path}: {key} must stay empty; a human fills it")
    if header.get("platform", "").lower() in ("stackoverflow", "stack overflow"):
        out.append(f"{path}: Stack Overflow gets no content of any kind (CH-CORE-04)")
    return out


def gitleaks(path: Path) -> list[str]:
    ids = [r.get("id") for r in tomllib.loads(path.read_text(encoding="utf-8")).get("rules", [])]
    return [f"{path}: missing gitleaks rule {r}" for r in RULES if r not in ids]


def self_test() -> int:
    def need(cond: bool, what: str) -> None:
        if not cond:
            raise SystemExit(f"self-test: {what}")

    channels = (FIXTURES / "pass" / "channels.yml").read_text(encoding="utf-8")
    repo = "example/mytool"
    ok = scan(FIXTURES / "pass", ["workflows/ci.yml", "workflows/notify.yml"], repo, channels, [])
    need(not ok, f"pass fixture reported {ok}")
    bad = scan(
        FIXTURES / "fail", ["workflows/post.yml", "workflows/notify.yml"], repo, channels, []
    )
    need(bad == ["UNLISTED example/mytool/workflows/post.yml"], f"fail fixture listed {bad}")
    need(
        len(scan(FIXTURES / "fail", ["workflows/notify.yml"], repo, "", [])) == 1,
        "secret-name pattern missed",
    )
    need(
        not scan(FIXTURES / "fail", ["workflows/post.yml"], repo, channels, ["post.yml"]),
        "--exclude ignored",
    )
    need(not browser([FIXTURES / "pass" / "skill.md"]), "browser pass fixture reported")
    need(len(browser([FIXTURES / "fail" / "skill.md"])) == 1, "browser fail fixture not reported")
    need(not package(FIXTURES / "pass" / "package.md"), "pass package reported")
    found = " ".join(package(FIXTURES / "fail" / "package.md"))
    for needle in ("lacks spend", "approved_by must stay empty", "Stack Overflow"):
        need(needle in found, f"package fail fixture lacks {needle!r}")
    need(not gitleaks(HERE / "gitleaks-channels.toml"), "shipped gitleaks rules incomplete")
    need(
        len(gitleaks(FIXTURES / "fail" / "gitleaks.toml")) == 2,
        "gitleaks fail fixture not reported",
    )
    config = tomllib.loads((HERE / "gitleaks-channels.toml").read_text(encoding="utf-8"))
    hook = "https://discord.com/api/webhooks/123456789012345678/" + "a" * 68
    token = "1//" + "b" * 45
    rules = {r["id"]: re.compile(r["regex"]) for r in config["rules"]}
    need(rules["discord-webhook-url"].search(hook) is not None, "webhook rule misses a planted URL")
    need(
        rules["google-oauth-refresh-token"].search(token) is not None,
        "refresh-token rule misses a planted token",
    )
    need(
        rules["discord-webhook-url"].search("https://discord.com/api/v10/users/@me") is None,
        "webhook rule too broad",
    )
    print("boundary_check self-test: ok")
    return 0


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    if argv == ["--self-test"]:
        return self_test()
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    sub = parser.add_subparsers(dest="cmd")
    s = sub.add_parser("scan")
    s.add_argument("--repo", required=True)
    s.add_argument("--channels", required=True, type=Path)
    s.add_argument("--root", type=Path, default=Path())
    s.add_argument("--exclude", action="append", default=[])
    s.add_argument("paths", nargs="*")
    for name in ("browser", "package"):
        sub.add_parser(name).add_argument("files", nargs="+", type=Path)
    sub.add_parser("gitleaks").add_argument("config", type=Path)
    args = parser.parse_args(argv)
    if not args.cmd:
        parser.print_usage(sys.stderr)
        return 2
    try:
        if args.cmd == "scan":
            paths = args.paths or listed_files(args.root)
            found = scan(
                args.root, paths, args.repo, args.channels.read_text(encoding="utf-8"), args.exclude
            )
        elif args.cmd == "browser":
            found = browser(args.files)
        elif args.cmd == "package":
            found = [line for f in args.files for line in package(f)]
        else:
            found = gitleaks(args.config)
    except (OSError, subprocess.CalledProcessError, tomllib.TOMLDecodeError) as err:
        print(f"boundary_check: {err}", file=sys.stderr)
        return 2
    for line in found:
        print(line)
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main())
