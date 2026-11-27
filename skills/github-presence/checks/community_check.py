#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
# ruff: noqa: S310
"""Community health checks for the github-presence skill.

Rules covered:
  CH-COM-17  every issue-chooser route resolves
  CH-COM-18  the organisation .github repository holds SUPPORT.md (--org-repo)
  CH-COM-19  the code of conduct has a reporting contact, no template placeholder
  CH-COM-20  the code of conduct names two contacts or an escalation route

CH-COM-17 needs to know whether Discussions is on: read it with
  gh api repos/OWNER/REPO -q .has_discussions
and pass the answer as --has-discussions true or false. The check never guesses.

Findings print as `path: CH-COM-nn SEVERITY: message`; `note:` lines are
reports. Exit codes: 0 clean, 1 findings, 2 usage or missing input.
"""

from __future__ import annotations

import argparse
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

PLACEHOLDERS = ("INSERT CONTACT METHOD", "NOTE: describe your means of reporting")
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]+")
CONTACT_RE = re.compile(r"@|https?://")
URL_RE = re.compile(r"""^\s*-?\s*url:\s*['"]?(\S+?)['"]?\s*$""")
BLANK_FALSE_RE = re.compile(r"^\s*blank_issues_enabled:\s*false\b")
ROUTES = (("question", "discussions"), ("bug", "issues"), ("vulnerability", "security"))
LINK_RE = re.compile(r"https?://[^\s)>\]]+")


class Out:
    def __init__(self) -> None:
        self.items: list[tuple[str, str, str, str]] = []
        self.notes: list[str] = []

    def add(self, path: Path | str, rule: str, sev: str, msg: str) -> None:
        self.items.append((str(path), rule, sev, msg))


def first_existing(root: Path, names: tuple[str, ...]) -> Path | None:
    for n in names:
        p = root / n
        if p.is_file():
            return p
    return None


def check_chooser(out: Out, config: Path, has_discussions: bool | None, repo: str | None) -> None:
    lines = config.read_text(encoding="utf-8").splitlines()
    blank_false = any(BLANK_FALSE_RE.match(line) for line in lines)
    urls = [m.group(1) for line in lines if (m := URL_RE.match(line))]
    if blank_false and not urls:
        out.add(
            config,
            "CH-COM-17",
            "MUST",
            "blank_issues_enabled is false and contact_links is empty: no question route",
        )
    for url in urls:
        if not re.search(r"/discussions/?$", url):
            continue
        if repo and not url.startswith(f"https://github.com/{repo}/"):
            continue
        if has_discussions is None:
            raise SystemExit(
                "error: the chooser links to /discussions; pass --has-discussions true or false"
            )
        if not has_discussions:
            out.add(
                config,
                "CH-COM-17",
                "MUST",
                f"{url} is a contact link but Discussions is off in this repository",
            )


def check_coc(out: Out, coc: Path) -> None:
    text = coc.read_text(encoding="utf-8")
    for p in PLACEHOLDERS:
        if p in text:
            out.add(coc, "CH-COM-19", "MUST", f"template placeholder left in place: {p}")
    if not CONTACT_RE.search(text):
        out.add(coc, "CH-COM-19", "MUST", "no reporting contact (an email address or a URL)")
    emails = {m.group(0).lower() for m in EMAIL_RE.finditer(text)}
    if len(emails) < 2 and "escalat" not in text.lower():
        out.add(
            coc,
            "CH-COM-20",
            "SHOULD",
            "one reporting contact and no escalation route; ask the owner for wording",
        )


def check_support(out: Out, support: Path, check_links: bool) -> None:
    text = support.read_text(encoding="utf-8")
    low = text.lower()
    for route, word in ROUTES:
        if word not in low:
            out.notes.append(
                f"{support}: CH-COM-18 no {route} route (no mention of {word}): unverified: reading heuristic"
            )
    if "stack overflow" in low or "stackoverflow" in low:
        out.notes.append(
            f"{support}: CH-COM-18 Stack Overflow row present: check the tag count and tag wiki with the commands in the depth file"
        )
    if check_links:
        for raw in sorted(set(LINK_RE.findall(text))):
            url = raw.rstrip(".,;")
            req = urllib.request.Request(
                url, method="HEAD", headers={"User-Agent": "community-check"}
            )
            try:
                with urllib.request.urlopen(req, timeout=20) as resp:
                    code = resp.status
            except urllib.error.HTTPError as err:
                code = err.code
            except OSError as err:
                out.add(support, "CH-COM-18", "MUST", f"{url} did not resolve: {err}")
                continue
            if code != 200:
                out.add(support, "CH-COM-18", "MUST", f"{url} returned {code}, not 200")


def run(root: Path, args: argparse.Namespace) -> Out:
    out = Out()
    config = (
        Path(args.config)
        if args.config
        else first_existing(
            root, (".github/ISSUE_TEMPLATE/config.yml", ".github/ISSUE_TEMPLATE/config.yaml")
        )
    )
    coc = (
        Path(args.coc)
        if args.coc
        else first_existing(
            root, ("CODE_OF_CONDUCT.md", ".github/CODE_OF_CONDUCT.md", "docs/CODE_OF_CONDUCT.md")
        )
    )
    support = (
        Path(args.support)
        if args.support
        else first_existing(root, ("SUPPORT.md", ".github/SUPPORT.md", "docs/SUPPORT.md"))
    )
    has = None if args.has_discussions is None else args.has_discussions == "true"
    if config:
        check_chooser(out, config, has, args.repo)
    else:
        out.notes.append("CH-COM-17: no issue chooser config found; nothing to check")
    if coc:
        check_coc(out, coc)
    elif args.org_repo:
        out.add(
            root, "CH-COM-19", "MUST", "organisation .github repository has no CODE_OF_CONDUCT.md"
        )
    else:
        out.notes.append(
            "CH-COM-19: no CODE_OF_CONDUCT.md here; the organisation default applies if it exists"
        )
    if support:
        check_support(out, support, args.check_links)
    elif args.org_repo:
        out.add(root, "CH-COM-18", "MUST", "organisation .github repository has no SUPPORT.md")
    else:
        out.notes.append(
            "CH-COM-18: no SUPPORT.md here; run again with --org-repo on the organisation .github repository"
        )
    return out


def self_test() -> int:
    base = Path(__file__).parent / "fixtures" / "community"
    bad = 0

    def expect(cond: bool, what: str) -> None:
        nonlocal bad
        if not cond:
            print(f"self-test: FAILED: {what}")
            bad += 1

    def ns(**kw: object) -> argparse.Namespace:
        d = dict(
            config=None,
            coc=None,
            support=None,
            has_discussions=None,
            repo=None,
            org_repo=True,
            check_links=False,
        )
        d.update(kw)
        return argparse.Namespace(**d)

    ok = run(base / "pass", ns(has_discussions="true"))
    expect(not ok.items, f"pass tree is clean, got {ok.items}")
    ko = run(base / "fail", ns(has_discussions="false"))
    ids = {i[1] for i in ko.items}
    for want in ("CH-COM-17", "CH-COM-18", "CH-COM-19", "CH-COM-20"):
        expect(want in ids, f"fail tree trips {want}, got {sorted(ids)}")
    expect(any(i[1] == "CH-COM-20" and i[2] == "SHOULD" for i in ko.items), "CH-COM-20 is SHOULD")
    try:
        run(base / "fail", ns())
        expect(False, "a /discussions link with no --has-discussions exits")
    except SystemExit as err:
        expect("has-discussions" in str(err), "the exit names --has-discussions")
    print(f"self-test: {'FAILED' if bad else 'ok'}, {bad} mismatches")
    return 1 if bad else 0


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(
        description="Check issue-chooser routes, SUPPORT.md and the code of conduct (CH-COM-17 to 20).",
        epilog="Exit 0 clean, 1 findings, 2 usage or missing input.",
    )
    ap.add_argument("--root", default=".", help="repository root (default: .)")
    ap.add_argument(
        "--config", help="issue chooser config.yml (default: .github/ISSUE_TEMPLATE/config.yml)"
    )
    ap.add_argument("--coc", help="CODE_OF_CONDUCT.md path")
    ap.add_argument("--support", help="SUPPORT.md path")
    ap.add_argument(
        "--repo", help="OWNER/REPO: check only /discussions links that point at this repository"
    )
    ap.add_argument(
        "--has-discussions",
        choices=("true", "false"),
        help="answer of gh api repos/OWNER/REPO -q .has_discussions",
    )
    ap.add_argument(
        "--org-repo",
        action="store_true",
        help="root is the organisation .github repository: SUPPORT.md and a code of conduct are required",
    )
    ap.add_argument(
        "--check-links",
        action="store_true",
        help="HEAD every link in SUPPORT.md; each must return 200",
    )
    ap.add_argument("--must-only", action="store_true", help="exit 1 only for MUST findings")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args(argv)
    if args.self_test:
        return self_test()
    root = Path(args.root)
    if not root.is_dir():
        print(f"error: {args.root} is not a directory", file=sys.stderr)
        return 2
    try:
        out = run(root, args)
    except SystemExit as err:
        print(err, file=sys.stderr)
        return 2
    for n in out.notes:
        print(f"note: {n}")
    blocking = 0
    for path, rule, sev, msg in sorted(out.items):
        print(f"{path}: {rule} {sev}: {msg}")
        if sev == "MUST" or not args.must_only:
            blocking += 1
    return 1 if blocking else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
