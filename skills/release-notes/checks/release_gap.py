#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Compare a repository's tags with its GitHub Releases, from saved gh output.

  MKT-REL-11  every stable vX.Y.Z tag has a published Release (a draft does not
              count), less the tags listed in the baseline file
  CH-GH-07    exactly one release is Latest, and it is the highest stable tag
  CH-GH-09    isPrerelease is true exactly when the tag has a SemVer
              pre-release identifier (-rc.1, -beta.2)
  CH-GH-08    with --assets and --docs, every asset name in a documented
              /releases/latest/download/<asset> URL exists in the Latest release

Inputs are files, so the script never calls the network:
  --tags      one tag per line: gh api "repos/$REPO/tags" --paginate -q '.[].name'
  --releases  JSON: gh release list -R "$REPO" -L 1000 --json tagName,isLatest,isPrerelease,isDraft
  --baseline  tags exempt from MKT-REL-11, one per line; blank and # lines ignored.
              A file that does not exist counts as empty (no legacy tags)
  --assets    JSON: gh release view "$LATEST_TAG" --json assets
  --docs      files that document /releases/latest/download/<asset> URLs

Alias tags (v0, v1.2) never match the three-component stable pattern.
A documented asset name that is all upper case (ASSET, NAME) is a placeholder and is skipped.

Usage:
  release_gap.py --tags FILE --releases FILE [--baseline FILE] [--assets FILE --docs FILE...]
  release_gap.py --self-test

Exit codes: 0 clean, 1 findings, 2 usage or unreadable input.
Run as: python3 -I release_gap.py ...
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

STABLE = re.compile(r"^v?(\d+)\.(\d+)\.(\d+)$")
PRE = re.compile(r"^v?\d+\.\d+\.\d+-.+")
DOWNLOAD = re.compile(r"releases/latest/download/([A-Za-z0-9._-]+)")


def version_key(tag: str) -> tuple[int, int, int]:
    m = STABLE.match(tag)
    if not m:
        raise ValueError(tag)
    return int(m.group(1)), int(m.group(2)), int(m.group(3))


def check(
    tags: list[str],
    releases: list[dict],
    baseline: set[str],
    asset_names: set[str] | None = None,
    documented: list[str] | None = None,
) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    published = {r["tagName"] for r in releases if not r.get("isDraft")}
    stable = [t for t in tags if STABLE.match(t)]
    for t in sorted(stable, key=version_key):
        if t not in published and t not in baseline:
            out.append(("MKT-REL-11", f"stable tag {t} has no published Release"))
    latest = [r["tagName"] for r in releases if r.get("isLatest")]
    if len(latest) != 1:
        out.append(("CH-GH-07", f"{len(latest)} releases are Latest, expected exactly 1"))
    else:
        pool = stable or [t for t in published if STABLE.match(t)]
        if pool and latest[0] != max(pool, key=version_key):
            out.append(
                (
                    "CH-GH-07",
                    f"Latest is {latest[0]}, highest stable tag is {max(pool, key=version_key)}",
                )
            )
    for r in releases:
        tag = r["tagName"]
        if bool(PRE.match(tag)) != bool(r.get("isPrerelease")):
            out.append(("CH-GH-09", f"{tag}: isPrerelease is {bool(r.get('isPrerelease'))}"))
    if asset_names is not None:
        for name in sorted(set(documented or [])):
            if re.fullmatch(r"[A-Z_]+", name):
                continue
            if name not in asset_names:
                out.append(("CH-GH-08", f"documented asset {name} is not in the Latest release"))
    return out


def documented_names(paths: list[Path]) -> list[str]:
    names: list[str] = []
    for p in paths:
        names += DOWNLOAD.findall(p.read_text(encoding="utf-8"))
    return names


def _lines(path: Path) -> list[str]:
    return [x.strip() for x in path.read_text(encoding="utf-8").splitlines() if x.strip()]


def _baseline(path: Path | None) -> set[str]:
    if path is None or not path.exists():
        return set()
    return {x for x in _lines(path) if not x.startswith("#")}


def expect(condition: object, message: object = "condition false") -> None:
    """Self-test check that survives python -O, which strips a bare assert."""
    if not condition:
        raise SystemExit(f"self-test failed: {message}")


def self_test() -> int:
    fx = Path(__file__).resolve().parent / "fixtures" / "gap"
    tags = _lines(fx / "tags.txt")
    releases = json.loads((fx / "releases.json").read_text(encoding="utf-8"))
    baseline = _baseline(fx / "baseline.txt")
    expect(baseline and _baseline(fx / "absent.txt") == set() and _baseline(None) == set())
    assets = {
        a["name"] for a in json.loads((fx / "assets.json").read_text(encoding="utf-8"))["assets"]
    }
    docs = documented_names([fx / "README.md"])
    expect(docs == ["mytool-installer.sh", "ASSET"], docs)
    # v1.4.0 is in the baseline, v2 and v1 are aliases, v2.1.0-rc.1 is a prerelease.
    expect(check(tags, releases, baseline, assets, docs) == [])
    expect(
        check(tags, releases, set(), assets, docs)
        == [("MKT-REL-11", "stable tag v1.4.0 has no published Release")]
    )
    draft = [dict(r, isDraft=r["tagName"] == "v1.4.1") for r in releases]
    expect([f[0] for f in check(tags, draft, baseline)] == ["MKT-REL-11"])
    moved = [dict(r, isLatest=r["tagName"] == "v1.4.1") for r in releases]
    expect([f[0] for f in check(tags, moved, baseline)] == ["CH-GH-07"])
    none = [dict(r, isLatest=False) for r in releases]
    expect([f[0] for f in check(tags, none, baseline)] == ["CH-GH-07"])
    flag = [dict(r, isPrerelease=False) for r in releases]
    expect([f[0] for f in check(tags, flag, baseline)] == ["CH-GH-09"])
    renamed = {"mytool-linux-amd64"}
    expect([f[0] for f in check(tags, releases, baseline, renamed, docs)] == ["CH-GH-08"])
    print("release_gap self-test ok")
    return 0


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--tags", type=Path)
    ap.add_argument("--releases", type=Path)
    ap.add_argument("--baseline", type=Path)
    ap.add_argument("--assets", type=Path)
    ap.add_argument("--docs", type=Path, nargs="+", default=[])
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args(argv)
    if args.self_test:
        return self_test()
    if not (args.tags and args.releases):
        ap.error("give --tags and --releases, or --self-test")
    if bool(args.assets) != bool(args.docs):
        ap.error("--assets and --docs go together")
    try:
        tags = _lines(args.tags)
        releases = json.loads(args.releases.read_text(encoding="utf-8"))
        baseline = _baseline(args.baseline)
        names = None
        documented = None
        if args.assets:
            names = {
                a["name"] for a in json.loads(args.assets.read_text(encoding="utf-8"))["assets"]
            }
            documented = documented_names(args.docs)
    except (OSError, ValueError, KeyError) as err:
        print(f"release_gap: {err}", file=sys.stderr)
        return 2
    found = check(tags, releases, baseline, names, documented)
    for rule, msg in found:
        print(f"{rule}: {msg}")
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
