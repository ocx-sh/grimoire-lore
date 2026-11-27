#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
# ruff: noqa: S310, S603, S607
"""Repository card checks for the github-presence skill.

Rules covered:
  CH-GH-01  non-empty About description; homepage reported, not failed
  CH-GH-02  description is one plain line of 140 characters or fewer
  CH-GH-03  1 to 20 topics matching ^[a-z0-9-]{1,50}$
  CH-GH-04  every write line sits under an APPROVAL-GATE marker (--lint-writes)
  CH-GH-05  custom social preview, under 1,000,000 bytes, at least 640 x 320
  CH-GH-30  at least 3 topics, each starting with a letter or digit

Input is the output of
  gh repo view OWNER/REPO --json name,description,homepageUrl,repositoryTopics,usesCustomOpenGraphImage,openGraphImageUrl,isPrivate
given with --json FILE (or - for stdin), or fetched with --repo OWNER/REPO.
The card checks never write to GitHub.

Findings print as `label: CH-GH-nn SEVERITY: message`. Lines starting with
`note:` are reports, not findings.

Exit codes: 0 clean, 1 findings, 2 usage or missing input.
"""

from __future__ import annotations

import argparse
import json
import re
import struct
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

DESCRIPTION_MAX = 140  # catalog budget, not a GitHub limit (CH-GH-02)
TOPIC_MAX = 20
TOPIC_RE = re.compile(r"^[a-z0-9-]{1,50}$")
TOPIC_LEAD_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,49}$")
IMAGE_MAX_BYTES = 1_000_000
IMAGE_MIN = (640, 320)
FETCH_CAP = 5_000_000
FIELDS = (
    "name,description,homepageUrl,repositoryTopics,"
    "usesCustomOpenGraphImage,openGraphImageUrl,isPrivate"
)
# CH-GH-04: a write must sit under an APPROVAL-GATE marker in its section.
WRITE_RE = re.compile(
    r"gh repo edit|(?:-X|--method)[ =]*(?:PUT|PATCH|POST|DELETE)\b|mutation *[{(]"
)
GH_API_FIELD_RE = re.compile(r"gh api (?:repos|orgs)/\S*.*\s-[fF]\s")
EXPLICIT_METHOD_RE = re.compile(r"(?:-X|--method)\b")
FENCE_RE = re.compile(r"^\s*(`{3,}|~{3,})")


class Report:
    def __init__(self, label: str) -> None:
        self.label = label
        self.findings: list[tuple[str, str, str]] = []  # id, severity, message
        self.notes: list[str] = []

    def add(self, rule: str, severity: str, message: str) -> None:
        self.findings.append((rule, severity, message))

    def note(self, message: str) -> None:
        self.notes.append(message)

    def lines(self, must_only: bool) -> tuple[list[str], int]:
        out = [f"note: {self.label}: {n}" for n in self.notes]
        blocking = 0
        for rule, sev, msg in self.findings:
            out.append(f"{self.label}: {rule} {sev}: {msg}")
            if sev == "MUST" or not must_only:
                blocking += 1
        return out, blocking


def topic_names(raw: object) -> list[str]:
    """Accept the shapes gh prints: [{name}], {names}, {nodes:[{topic:{name}}]}, [str]."""
    if raw is None:
        return []
    if isinstance(raw, dict):
        if "names" in raw:
            return topic_names(raw["names"])
        if "nodes" in raw:
            return topic_names(raw["nodes"])
        if "name" in raw:
            return [str(raw["name"])]
        if "topic" in raw:
            return topic_names(raw["topic"])
        return []
    if isinstance(raw, list):
        names: list[str] = []
        for item in raw:
            names.extend(topic_names(item) if not isinstance(item, str) else [item])
        return names
    return []


def image_size(data: bytes) -> tuple[int, int] | None:
    """Width and height of a PNG, GIF or JPEG, read from the header."""
    if data[:8] == b"\x89PNG\r\n\x1a\n" and len(data) >= 24:
        return struct.unpack(">II", data[16:24])
    if data[:6] in (b"GIF87a", b"GIF89a") and len(data) >= 10:
        return struct.unpack("<HH", data[6:10])
    if data[:2] == b"\xff\xd8":
        i = 2
        while i + 9 < len(data):
            if data[i] != 0xFF:
                i += 1
                continue
            marker = data[i + 1]
            if marker in (0xD8, 0x01) or 0xD0 <= marker <= 0xD7:
                i += 2
                continue
            if 0xC0 <= marker <= 0xCF and marker not in (0xC4, 0xC8, 0xCC):
                h, w = struct.unpack(">HH", data[i + 5 : i + 9])
                return w, h
            i += 2 + struct.unpack(">H", data[i + 2 : i + 4])[0]
    return None


def check_image(rep: Report, data: bytes, severity: str) -> None:
    if len(data) >= IMAGE_MAX_BYTES:
        rep.add(
            "CH-GH-05",
            severity,
            f"social image is {len(data)} bytes, limit is under {IMAGE_MAX_BYTES}",
        )
    size = image_size(data)
    if size is None:
        rep.add("CH-GH-05", severity, "social image is not a readable PNG, GIF or JPEG")
    elif size[0] < IMAGE_MIN[0] or size[1] < IMAGE_MIN[1]:
        rep.add(
            "CH-GH-05",
            severity,
            f"social image is {size[0]} x {size[1]}, minimum is {IMAGE_MIN[0]} x {IMAGE_MIN[1]}",
        )
    elif size != (1280, 640):
        rep.note(f"CH-GH-05: image is {size[0]} x {size[1]}; 1280 x 640 renders best")


def check_card(
    card: dict,
    label: str,
    *,
    flagship: bool,
    image: bytes | None,
    fetch_image: bool,
) -> Report:
    rep = Report(label)
    desc = card.get("description") or ""
    if not desc.strip():
        rep.add("CH-GH-01", "MUST", "About description is empty")
    if not (card.get("homepageUrl") or "").strip():
        rep.note("CH-GH-01: homepage: ask (set it only when a site or docs page exists)")
    if len(desc) > DESCRIPTION_MAX:
        rep.add(
            "CH-GH-02",
            "SHOULD",
            f"description is {len(desc)} characters, budget is {DESCRIPTION_MAX}",
        )
    if "\n" in desc.strip():
        rep.add("CH-GH-02", "SHOULD", "description spans more than one line")
    topics = topic_names(card.get("repositoryTopics"))
    if not 1 <= len(topics) <= TOPIC_MAX:
        rep.add("CH-GH-03", "MUST", f"{len(topics)} topics, allowed 1 to {TOPIC_MAX}")
    for name in topics:
        if not TOPIC_RE.match(name):
            rep.add("CH-GH-03", "MUST", f"topic {name!r} does not match ^[a-z0-9-]{{1,50}}$")
        elif not TOPIC_LEAD_RE.match(name):
            rep.add("CH-GH-30", "SHOULD", f"topic {name!r} does not start with a letter or digit")
    if 1 <= len(topics) < 3:
        rep.add("CH-GH-30", "SHOULD", f"{len(topics)} topics, the catalog norm is 3 or more")
    repo_name = (card.get("name") or "").lower()
    if topics and repo_name and all(t == repo_name for t in topics):
        rep.add(
            "CH-GH-30",
            "SHOULD",
            "the only topic is the repository name; add a category and a language topic",
        )
    if topics:
        rep.note("CH-GH-30: category and language topics: unverified: reading heuristic")
    sev = "MUST" if flagship else "SHOULD"
    if card.get("usesCustomOpenGraphImage") is not True:
        rep.add(
            "CH-GH-05",
            sev,
            "no custom social preview is set (usesCustomOpenGraphImage is not true)",
        )
    elif image is not None:
        check_image(rep, image, sev)
    elif fetch_image and card.get("openGraphImageUrl"):
        try:
            req = urllib.request.Request(
                card["openGraphImageUrl"], headers={"User-Agent": "repo-card-check"}
            )
            with urllib.request.urlopen(req, timeout=20) as resp:
                if not resp.geturl().startswith("https://"):
                    raise OSError("not https")
                check_image(rep, resp.read(FETCH_CAP), sev)
        except OSError as err:
            rep.add("CH-GH-05", sev, f"could not download the social image to check size: {err}")
    else:
        rep.add("CH-GH-05", sev, "size and dimensions unchecked: pass --image FILE")
    return rep


def lint_writes(path: Path) -> list[str]:
    """CH-GH-04: findings for write lines with no APPROVAL-GATE marker above them."""
    out: list[str] = []
    gated = False
    fence = ""
    for n, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        m = FENCE_RE.match(line)
        if m:
            tick = m.group(1)
            if not fence:
                fence = tick
            elif tick[0] == fence[0] and len(tick) >= len(fence):
                fence = ""
        elif not fence and re.match(r"^#{1,6} ", line):
            gated = False
        if "APPROVAL-GATE" in line:
            gated = True
            continue
        if WRITE_RE.search(line) and not gated:
            out.append(
                f"{path}:{n}: CH-GH-04 MUST: write command with no APPROVAL-GATE marker above it in its section"
            )
        if GH_API_FIELD_RE.search(line) and not EXPLICIT_METHOD_RE.search(line):
            out.append(
                f"{path}:{n}: CH-GH-04 MUST: gh api with -f or -F posts implicitly; write the method with -X or --method"
            )
    return out


def load_card(args: argparse.Namespace) -> tuple[dict, str] | None:
    if args.json:
        text = sys.stdin.read() if args.json == "-" else Path(args.json).read_text(encoding="utf-8")
        card = json.loads(text)
        return card, args.repo or card.get("nameWithOwner") or args.json
    if args.repo:
        proc = subprocess.run(
            ["gh", "repo", "view", args.repo, "--json", FIELDS],
            capture_output=True,
            text=True,
            check=False,
        )
        if proc.returncode != 0:
            print(f"error: gh repo view failed: {proc.stderr.strip()}", file=sys.stderr)
            return None
        return json.loads(proc.stdout), args.repo
    return None


def self_test() -> int:
    base = Path(__file__).parent / "fixtures" / "card"
    bad = 0

    def expect(cond: bool, what: str) -> None:
        nonlocal bad
        if not cond:
            print(f"self-test: FAILED: {what}")
            bad += 1

    png_ok = base / "social-ok.png"
    png_small = base / "social-small.png"
    good = check_card(
        json.loads((base / "pass.json").read_text()),
        "pass",
        flagship=True,
        image=png_ok.read_bytes(),
        fetch_image=False,
    )
    expect(not good.findings, f"pass.json clean, got {good.findings}")
    expect(any("homepage: ask" in n for n in good.notes) is False, "pass.json has a homepage")
    bare = check_card(
        json.loads((base / "fail.json").read_text()),
        "fail",
        flagship=True,
        image=None,
        fetch_image=False,
    )
    blank = check_card(
        dict(json.loads((base / "fail.json").read_text()), description=""),
        "blank",
        flagship=True,
        image=None,
        fetch_image=False,
    )
    ids = {f[0] for f in bare.findings} | {f[0] for f in blank.findings}
    for want in ("CH-GH-01", "CH-GH-02", "CH-GH-03", "CH-GH-30", "CH-GH-05"):
        expect(want in ids, f"fail.json trips {want}, got {sorted(ids)}")
    expect(any("homepage: ask" in n for n in bare.notes), "fail.json reports homepage: ask")
    small = check_card(
        json.loads((base / "pass.json").read_text()),
        "small",
        flagship=False,
        image=png_small.read_bytes(),
        fetch_image=False,
    )
    expect(
        any(f[0] == "CH-GH-05" and f[1] == "SHOULD" for f in small.findings),
        "a 320 x 160 image is a SHOULD finding on a non-flagship",
    )
    expect(image_size(png_ok.read_bytes()) == (1280, 640), "PNG header read")
    expect(image_size(b"GIF89a" + struct.pack("<HH", 700, 400)) == (700, 400), "GIF header read")
    jpeg = (
        b"\xff\xd8\xff\xe0"
        + struct.pack(">H", 4)
        + b"\x00\x00"
        + b"\xff\xc0"
        + struct.pack(">HBHH", 11, 8, 400, 800)
        + b"\x00" * 6
    )
    expect(image_size(jpeg) == (800, 400), "JPEG header read")
    expect(not lint_writes(base / "writes_pass.md"), "writes_pass.md is clean")
    fail_lines = lint_writes(base / "writes_fail.md")
    expect(len(fail_lines) == 3, f"writes_fail.md has 3 findings, got {len(fail_lines)}")
    with tempfile.TemporaryDirectory() as tmp:
        empty = Path(tmp) / "empty.md"
        empty.write_text("# Notes\n\nNo writes here.\n", encoding="utf-8")
        expect(not lint_writes(empty), "a file with no writes is clean")
    print(f"self-test: {'FAILED' if bad else 'ok'}, {bad} mismatches")
    return 1 if bad else 0


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(
        description="Check a GitHub repository card (CH-GH-01 to 05, 30) or lint write steps (CH-GH-04).",
        epilog="Exit 0 clean, 1 findings, 2 usage or missing input.",
    )
    ap.add_argument("--repo", help="OWNER/REPO; fetched with gh repo view unless --json is given")
    ap.add_argument("--json", metavar="FILE", help="gh repo view --json output, or - for stdin")
    ap.add_argument(
        "--flagship", action="store_true", help="CH-GH-05 is MUST for a flagship, SHOULD otherwise"
    )
    ap.add_argument(
        "--internal",
        action="store_true",
        help="the owner classed this repository internal: skip the card checks",
    )
    ap.add_argument(
        "--image", metavar="FILE", help="the social preview image file, to check bytes and size"
    )
    ap.add_argument(
        "--lint-writes",
        nargs="+",
        metavar="FILE",
        help="CH-GH-04: lint Markdown files for ungated write commands",
    )
    ap.add_argument("--must-only", action="store_true", help="exit 1 only for MUST findings")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args(argv)

    if args.self_test:
        return self_test()
    blocking = 0
    ran = False
    if args.lint_writes:
        ran = True
        for name in args.lint_writes:
            path = Path(name)
            if not path.is_file():
                print(f"error: {name} is not a file", file=sys.stderr)
                return 2
            lines = lint_writes(path)
            print("\n".join(lines)) if lines else None
            blocking += len(lines)
    if args.repo or args.json:
        ran = True
        if args.internal:
            print(
                f"note: {args.repo or args.json}: classed internal by the owner, card checks skipped"
            )
        else:
            loaded = load_card(args)
            if loaded is None:
                return 2
            card, label = loaded
            if card.get("isPrivate") is True:
                print(f"note: {label}: private repository, card checks skipped")
            else:
                image = None
                if args.image:
                    if not Path(args.image).is_file():
                        print(f"error: {args.image} is not a file", file=sys.stderr)
                        return 2
                    image = Path(args.image).read_bytes()
                rep = check_card(
                    card,
                    label,
                    flagship=args.flagship,
                    image=image,
                    fetch_image=bool(args.repo and not args.json),
                )
                lines, n = rep.lines(args.must_only)
                print("\n".join(lines)) if lines else None
                blocking += n
    if not ran:
        ap.print_usage(sys.stderr)
        return 2
    return 1 if blocking else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
