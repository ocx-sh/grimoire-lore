#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
# ruff: noqa: S310, S603, S607
"""Registry manifest checks for the github-presence skill.

Rules covered:
  CH-GH-13  description present, one line, plain text
  CH-GH-14  crates.io keywords (5 max, pattern) and categories (5 max, live slugs)
  CH-GH-15  keywords filled: crates 3 to 5, npm 3 to 8
  CH-GH-16  npm repository is an object with type and url, plus directory in a monorepo
  CH-GH-17  PyPI readme, Project-URL labels, twine check in the release workflow
  CH-GH-18  README images and links that a registry reuses are absolute
  CH-GH-19  VS Code extension: keywords, PNG icon, SVG use, credential, link fields

Reads Cargo.toml, package.json and pyproject.toml under --root, with the README
each one names. A package that never reaches a registry (cargo publish = false,
npm private, a PyPI project with the classifier `Private :: Do Not Upload`) is skipped. Fenced code in a README is not scanned.

Findings print as `path:line: CH-GH-nn SEVERITY: message`; `note:` lines are
reports. Exit codes: 0 clean, 1 findings, 2 usage or missing input.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import struct
import subprocess
import sys
import tomllib
import urllib.error
import urllib.request
from pathlib import Path

KEYWORD_CRATE_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_+-]{0,19}$")
PYPI_LABELS = {"homepage", "source", "repository", "changelog", "documentation"}
BADGE_HOSTS = ("img.shields.io", "badgen.net", "vsmarketplacebadges.dev")
SKIP_DIRS = {
    "node_modules",
    ".git",
    "target",
    "dist",
    "build",
    ".venv",
    "fixtures",
    "site-packages",
}
IMG_RE = re.compile(r"!\[[^\]]*\]\((\./|\.\./|[^h#/][^):]*)\)|<img[^>]*src=\"(\./|\.\./|[^h\"/])")
LINK_RE = re.compile(r"\]\((\.\.?/[^)]*|[A-Za-z_][^):]*\.(md|txt)|LICENSE)\)")
FENCE_RE = re.compile(r"^\s*(`{3,}|~{3,})")
MARKDOWN_CHARS = ("*", "`", "[")


class Findings:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.items: list[tuple[str, int, str, str, str]] = []
        self.notes: list[str] = []

    def add(self, path: Path, rule: str, sev: str, msg: str, line: int = 0) -> None:
        self.items.append((str(path.relative_to(self.root)), line, rule, sev, msg))

    def note(self, msg: str) -> None:
        self.notes.append(msg)


def list_files(root: Path) -> list[Path]:
    try:
        out = subprocess.run(
            [
                "git",
                "-C",
                str(root),
                "ls-files",
                "-z",
                "--cached",
                "--others",
                "--exclude-standard",
            ],
            capture_output=True,
            check=True,
        ).stdout.decode()
        files = [root / p for p in out.split("\0") if p]
        if files:
            return [
                f for f in files if f.is_file() and not SKIP_DIRS & set(f.relative_to(root).parts)
            ]
    except (OSError, subprocess.CalledProcessError):
        pass
    found: list[Path] = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        found.extend(Path(dirpath) / f for f in filenames)
    return found


def description_checks(fs: Findings, path: Path, desc: object) -> None:
    if not isinstance(desc, str) or not desc.strip():
        fs.add(path, "CH-GH-13", "SHOULD", "description is missing or empty")
        return
    if "\n" in desc.strip() or any(c in desc for c in MARKDOWN_CHARS):
        fs.add(
            path, "CH-GH-13", "SHOULD", "description must be one plain-text line with no Markdown"
        )


def readme_checks(fs: Findings, readme: Path, link_sev: str) -> None:
    """CH-GH-18. Images are MUST everywhere; links are MUST on PyPI, SHOULD elsewhere."""
    if not readme.is_file():
        return
    fence = ""
    for n, line in enumerate(readme.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
        m = FENCE_RE.match(line)
        if m:
            tick = m.group(1)
            if not fence:
                fence = tick
            elif tick[0] == fence[0] and len(tick) >= len(fence):
                fence = ""
            continue
        if fence:
            continue
        if IMG_RE.search(line):
            fs.add(
                readme,
                "CH-GH-18",
                "MUST",
                "relative image path; registries do not serve repository files",
                n,
            )
        if LINK_RE.search(line):
            fs.add(readme, "CH-GH-18", link_sev, "relative link; use an absolute https URL", n)


def png_size(path: Path) -> tuple[int, int] | None:
    data = path.read_bytes()[:24]
    if data[:8] == b"\x89PNG\r\n\x1a\n" and len(data) == 24:
        return struct.unpack(">II", data[16:24])
    return None


def workflow_text(files: list[Path]) -> list[tuple[Path, str]]:
    out = []
    for f in files:
        if (
            f.parent.name == "workflows"
            and f.parent.parent.name == ".github"
            and f.suffix in (".yml", ".yaml")
        ):
            out.append((f, f.read_text(encoding="utf-8", errors="replace")))
    return out


def live_categories() -> set[str] | None:
    req = urllib.request.Request(
        "https://crates.io/api/v1/categories?per_page=100",
        headers={"User-Agent": "registry-manifest-check"},
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.load(resp)
        return {c["slug"] for c in data["categories"]}
    except (OSError, ValueError, KeyError, urllib.error.URLError):
        return None


def check_crate(fs: Findings, path: Path, live: bool, slugs: set[str] | None) -> None:
    pkg = tomllib.loads(path.read_text(encoding="utf-8")).get("package")
    if not pkg:
        return
    if pkg.get("publish") is False or pkg.get("publish") == []:
        return
    description_checks(fs, path, pkg.get("description"))
    kws = pkg.get("keywords")
    cats = pkg.get("categories")
    if isinstance(kws, list):
        if len(kws) > 5:
            fs.add(path, "CH-GH-14", "MUST", f"{len(kws)} keywords, crates.io allows 5")
        for k in kws:
            if not KEYWORD_CRATE_RE.match(str(k)):
                fs.add(
                    path,
                    "CH-GH-14",
                    "MUST",
                    f"keyword {k!r} does not match ^[A-Za-z0-9][A-Za-z0-9_+-]{{0,19}}$",
                )
    if isinstance(cats, list):
        if len(cats) > 5:
            fs.add(path, "CH-GH-14", "MUST", f"{len(cats)} categories, crates.io allows 5")
        if live and slugs is not None:
            for c in cats:
                if c not in slugs:
                    fs.add(path, "CH-GH-14", "MUST", f"category {c!r} is not a live crates.io slug")
        elif cats:
            fs.note(
                f"{path.relative_to(fs.root)}: CH-GH-14 category slugs not checked live (pass --live-categories)"
            )
    if not isinstance(kws, list) or len(kws) < 3:
        fs.add(path, "CH-GH-15", "SHOULD", "fewer than 3 keywords")
    readme = pkg.get("readme")
    target = path.parent / (readme if isinstance(readme, str) else "README.md")
    readme_checks(fs, target, "SHOULD")


def check_package_json(fs: Findings, path: Path, files: list[Path]) -> None:
    pkg = json.loads(path.read_text(encoding="utf-8"))
    if pkg.get("private") is True:
        return
    is_ext = isinstance(pkg.get("engines"), dict) and "vscode" in pkg["engines"]
    description_checks(fs, path, pkg.get("description"))
    repo = pkg.get("repository")
    if not isinstance(repo, dict) or not repo.get("type") or not repo.get("url"):
        fs.add(path, "CH-GH-16", "MUST", "repository must be an object with type and url")
    elif path.parent != fs.root and not repo.get("directory"):
        fs.add(
            path,
            "CH-GH-16",
            "MUST",
            "package is below the repository root: add repository.directory",
        )
    kws = pkg.get("keywords") if isinstance(pkg.get("keywords"), list) else []
    if is_ext:
        check_extension(fs, path, pkg, kws, files)
    elif len(kws) < 3 or len(kws) > 8:
        fs.add(path, "CH-GH-15", "SHOULD", f"{len(kws)} keywords, the norm is 3 to 8")
    readme_checks(fs, path.parent / "README.md", "SHOULD")


def check_extension(fs: Findings, path: Path, pkg: dict, kws: list, files: list[Path]) -> None:
    if len(kws) > 30:
        fs.add(path, "CH-GH-19", "MUST", f"{len(kws)} keywords, the Marketplace allows 30")
    icon = pkg.get("icon")
    if not isinstance(icon, str) or not icon.lower().endswith(".png"):
        fs.add(path, "CH-GH-19", "MUST", "icon must be a PNG file")
    else:
        ipath = path.parent / icon
        size = png_size(ipath) if ipath.is_file() else None
        if size is None:
            fs.add(path, "CH-GH-19", "MUST", f"icon {icon} is missing or not a readable PNG")
        elif min(size) < 128:
            fs.add(path, "CH-GH-19", "MUST", f"icon is {size[0]} x {size[1]}, minimum is 128 x 128")
    for key in ("repository", "bugs", "homepage"):
        if not pkg.get(key):
            fs.add(path, "CH-GH-19", "MUST", f"{key} is not set")
    for name in ("README.md", "CHANGELOG.md"):
        doc = path.parent / name
        if not doc.is_file():
            continue
        for n, line in enumerate(doc.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
            if ".svg" in line and not any(h in line for h in BADGE_HOSTS):
                fs.add(doc, "CH-GH-19", "MUST", "SVG outside a trusted badge host", n)
    for wf, text in workflow_text(files):
        for n, line in enumerate(text.splitlines(), 1):
            if "vsce publish" in line:
                if "--azure-credential" not in line:
                    fs.add(wf, "CH-GH-19", "MUST", "vsce publish without --azure-credential", n)
                if re.search(r"\s(-p|--pat)\b|VSCE_PAT", line):
                    fs.add(wf, "CH-GH-19", "MUST", "vsce publish with a personal access token", n)
        if "VSCE_PAT" in text and "vsce publish" in text:
            fs.add(wf, "CH-GH-19", "MUST", "workflow reads VSCE_PAT")


def check_pyproject(fs: Findings, path: Path, files: list[Path]) -> None:
    proj = tomllib.loads(path.read_text(encoding="utf-8")).get("project")
    if not proj or "Private :: Do Not Upload" in (proj.get("classifiers") or []):
        return
    description_checks(fs, path, proj.get("description"))
    readme = proj.get("readme")
    if not readme:
        fs.add(
            path,
            "CH-GH-17",
            "MUST",
            "project.readme is not set, so there is no Description-Content-Type",
        )
    elif isinstance(readme, str) and not readme.lower().endswith((".md", ".rst", ".txt")):
        fs.add(
            path,
            "CH-GH-17",
            "MUST",
            "readme extension gives no content type; use a table with content-type",
        )
    elif isinstance(readme, dict) and not readme.get("content-type"):
        fs.add(path, "CH-GH-17", "MUST", "readme table has no content-type")
    urls = proj.get("urls") or {}
    for label in urls:
        if len(label) > 32:
            fs.add(path, "CH-GH-17", "MUST", f"Project-URL label {label!r} is over 32 characters")
        if label.lower() == "home-page":
            fs.add(path, "CH-GH-17", "MUST", "use Project-URL, not Home-page")
    if not any(re.sub(r"[^a-z]", "", k.lower()) in PYPI_LABELS for k in urls):
        fs.add(
            path,
            "CH-GH-17",
            "MUST",
            "no recognised Project-URL label (Homepage, Source, Repository, Changelog, Documentation)",
        )
    for wf, text in workflow_text(files):
        if (
            "gh-action-pypi-publish" in text or "twine upload" in text
        ) and "twine check" not in text:
            fs.add(
                wf,
                "CH-GH-17",
                "MUST",
                "release workflow publishes to PyPI with no twine check step",
            )
    target = path.parent / (
        readme if isinstance(readme, str) else (readme or {}).get("file", "README.md")
    )
    readme_checks(fs, target, "MUST")


def run(root: Path, live: bool) -> Findings:
    fs = Findings(root)
    files = list_files(root)
    slugs = live_categories() if live else None
    if live and slugs is None:
        fs.note(
            "CH-GH-14: crates.io slug list unavailable; categories not checked (warn, do not block)"
        )
    seen = 0
    for f in sorted(files):
        if f.name == "Cargo.toml":
            seen += 1
            check_crate(fs, f, live, slugs)
        elif f.name == "package.json":
            seen += 1
            check_package_json(fs, f, files)
        elif f.name == "pyproject.toml":
            seen += 1
            check_pyproject(fs, f, files)
    if not seen:
        fs.note("canary: no Cargo.toml, package.json or pyproject.toml found under the root")
    return fs


def self_test() -> int:
    base = Path(__file__).parent / "fixtures" / "registry"
    bad = 0

    def expect(cond: bool, what: str) -> None:
        nonlocal bad
        if not cond:
            print(f"self-test: FAILED: {what}")
            bad += 1

    ok = run(base / "pass", False)
    expect(not ok.items, f"pass tree is clean, got {ok.items}")
    ko = run(base / "fail", False)
    ids = {(i[2]) for i in ko.items}
    for want in (
        "CH-GH-13",
        "CH-GH-14",
        "CH-GH-15",
        "CH-GH-16",
        "CH-GH-17",
        "CH-GH-18",
        "CH-GH-19",
    ):
        expect(want in ids, f"fail tree trips {want}, got {sorted(ids)}")
    expect(
        any(i[2] == "CH-GH-18" and i[3] == "MUST" and i[0].startswith("py/") for i in ko.items),
        "PyPI relative link is MUST",
    )
    expect(
        any(i[2] == "CH-GH-18" and i[3] == "SHOULD" for i in ko.items),
        "npm relative link is SHOULD",
    )
    print(f"self-test: {'FAILED' if bad else 'ok'}, {bad} mismatches")
    return 1 if bad else 0


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(
        description="Check package manifests and the READMEs registries reuse (CH-GH-13 to 19).",
        epilog="Exit 0 clean, 1 findings, 2 usage or missing input.",
    )
    ap.add_argument("--root", default=".", help="repository root to scan (default: .)")
    ap.add_argument(
        "--live-categories",
        action="store_true",
        help="check crates.io categories against the live slug list",
    )
    ap.add_argument("--must-only", action="store_true", help="exit 1 only for MUST findings")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args(argv)
    if args.self_test:
        return self_test()
    root = Path(args.root).resolve()
    if not root.is_dir():
        print(f"error: {args.root} is not a directory", file=sys.stderr)
        return 2
    fs = run(root, args.live_categories)
    for n in fs.notes:
        print(f"note: {n}")
    blocking = 0
    for rel, line, rule, sev, msg in sorted(fs.items):
        where = f"{rel}:{line}" if line else rel
        print(f"{where}: {rule} {sev}: {msg}")
        if sev == "MUST" or not args.must_only:
            blocking += 1
    return 1 if blocking else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
