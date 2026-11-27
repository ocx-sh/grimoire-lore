#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Lint a YouTube upload manifest before any upload (CH-YT-01 to 10, 16, 20, 22 to 24).

    yt_manifest_check.py MANIFEST.toml --channel-record RECORD.yml
        [--earlier DESC.txt ...] [--earlier-manifest M.toml ...]
        [--target LONGFORM.toml] [--repo DIR] [--insert-body F.json]
        [--readback F.json] [--strict] [--today YYYY-MM-DD]
    yt_manifest_check.py --channel-record RECORD.yml          (CH-YT-12 alone)
    yt_manifest_check.py --pilot PILOT.toml                   (CH-YT-21)
    yt_manifest_check.py --self-test

Reads files only. Never calls a network endpoint. Output is one line per finding,
`PATH: ID SEVERITY: message`. Exit 0 clean, 1 on any MUST finding (SHOULD
findings are warnings, and also exit 1 under --strict), 2 on a bad invocation.
Manifest schema: references/manifest.md. Run as `python3 -I`.
Limits hard-coded below mirror references/facts.md: YT-F11 title, YT-F13 description
bytes, YT-F14 tags, YT-F15 hashtags, YT-F17 and YT-F18 chapters, YT-F19 and YT-F20
thumbnails, YT-F22 Short length, YT-F24 and YT-F25 end screens. Re-read them when a
row changes.
"""

from __future__ import annotations

import argparse
import contextlib
import datetime as dt
import io
import difflib
import json
import re
import shutil
import struct
import subprocess
import sys
import tempfile
import tomllib
from pathlib import Path

HERE = Path(__file__).resolve().parent
MUST, SHOULD = "MUST", "SHOULD"
REQUIRED = [
    "format", "title", "description", "tags", "chapters", "default_language",
    "default_audio_language", "made_for_kids", "synthetic", "paid_placement",
    "privacy", "thumbnail", "audio", "duration_s", "cta_at_s", "ai_use", "package",
]
PACKAGE_KEYS = [
    "platform", "account", "action", "labels", "ai_role", "sponsored", "spend",
    "open_asks", "approved_by", "approved_at",
]
RECORD_KEYS = [
    "channel_id", "checked", "description", "links", "first_link", "audience",
    "dubbing", "default_language", "contact_email", "verification_tier",
    "custom_thumbnails", "clickable_links", "chapters", "test_and_compare",
    "related_video_on_short",
]
ANNOUNCE = re.compile(
    r"(?<![A-Za-z0-9_])(introducing|launch(e[sd]|ing)?|v?1\.0|now in|public preview)(?![A-Za-z0-9_])",
    re.IGNORECASE,
)
STAMP = re.compile(r"\s*[\(\[]?((\d{1,2}):)?(\d{1,2}):(\d{2})\b")
SERIES = re.compile(r"\b(Shorts|Ep\.?|Part|#) ?(\d+)", re.IGNORECASE)
HASHTAG = re.compile(r"(^|[^A-Za-z0-9&#])#[A-Za-z][A-Za-z0-9_]*")
SPONSOR_LINE = re.compile(r"^(ad|sponsored|paid partnership|in partnership with)", re.IGNORECASE)


class Report:
    def __init__(self, path: str):
        self.path, self.items = path, []

    def add(self, rid: str, sev: str, msg: str) -> None:
        self.items.append((rid, sev, msg))

    def lines(self) -> list[str]:
        return [f"{self.path}: {r} {s}: {m}" for r, s, m in self.items]


def read_text(p: Path) -> str | None:
    try:
        return p.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return None


def chapters(desc: str, duration: int | None) -> tuple[str, str]:
    """Return (status, reason): status is none, valid or invalid; reason may carry a warn."""
    st = []
    for line in desc.splitlines():
        m = STAMP.match(line)
        if m:
            st.append((line.strip(), int(m.group(2) or 0) * 3600 + int(m.group(3)) * 60 + int(m.group(4))))
    if not st:
        return "none", ""
    bad = (
        "first stamp not at zero" if st[0][1] != 0 else
        "fewer than 3 stamps" if len(st) < 3 else
        "stamps not ascending or a chapter under 10 s" if any(b[1] - a[1] < 10 for a, b in zip(st, st[1:])) else
        "last chapter under 10 s" if duration is not None and duration - st[-1][1] < 10 else ""
    )
    if bad:
        return "invalid", bad
    return "valid", "" if re.match(r"[\(\[]?00:00\b", st[0][0]) else "first stamp not written 00:00 (house form)"


def image_size(p: Path) -> tuple[int, int] | None:
    b = p.read_bytes()
    if b[:8] == b"\x89PNG\r\n\x1a\n":
        return struct.unpack(">II", b[16:24])
    if b[:2] == b"\xff\xd8":
        i = 2
        while i + 9 < len(b):
            if b[i] != 0xFF:
                i += 1
                continue
            m = b[i + 1]
            if m in (0x01, 0xFF) or 0xD0 <= m <= 0xD8:
                i += 1 if m == 0xFF else 2
                continue
            if m in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                h, w = struct.unpack(">HH", b[i + 5 : i + 9])
                return w, h
            i += 2 + struct.unpack(">H", b[i + 2 : i + 4])[0]
    return None


def similarity(new: str, olds: list[str]) -> float:
    texts = [new.splitlines()] + [o.splitlines() for o in olds]
    shared = set(texts[0]).intersection(*texts[1:]) if len(texts) > 2 else set()
    keep = ["\n".join(l for l in t if l.strip() and l not in shared) for t in texts]
    return max(difflib.SequenceMatcher(None, keep[0], k).ratio() for k in keep[1:])


def parse_record(text: str) -> dict[str, str]:
    out = {}
    for line in text.splitlines():
        if ":" in line and not line.startswith("#"):
            k, _, v = line.partition(":")
            out[k.strip()] = v.strip()
    return out


def check_record(path: Path, today: dt.date) -> tuple[Report, dict[str, str]]:
    rep = Report(str(path))
    text = read_text(path)
    if text is None:
        rep.add("CH-YT-12", MUST, "channel record missing or unreadable")
        return rep, {}
    rec = parse_record(text)
    for k in RECORD_KEYS:
        if not rec.get(k):
            rep.add("CH-YT-12", MUST, f"channel record has no value for {k}")
    try:
        age = (today - dt.date.fromisoformat(rec.get("checked", ""))).days
        if age > 90:
            rep.add("CH-YT-12", MUST, f"channel record checked {age} days ago, re-verify every 90 days")
    except ValueError:
        rep.add("CH-YT-12", MUST, "checked is not an ISO date")
    if rec.get("channel_id") and not re.fullmatch(r"UC[0-9A-Za-z_-]{22}", rec["channel_id"]):
        rep.add("CH-YT-14", MUST, "channel_id is not a UC id of 24 characters")
    if not re.match(r"(publish manually|off)\b", rec.get("dubbing", ""), re.IGNORECASE):
        rep.add("CH-YT-11", SHOULD, "dubbing line does not start with 'Publish manually' or 'off'")
    return rep, rec


def check_pilot(path: Path) -> Report:
    rep = Report(str(path))
    try:
        p = tomllib.loads(path.read_text(encoding="utf-8"))
    except (OSError, tomllib.TOMLDecodeError) as e:
        rep.add("CH-YT-21", MUST, f"pilot record unreadable: {e}")
        return rep
    for k in ("approved_by", "approved_at", "pass_median_engaged_views", "pass_actions", "pass_set_at", "start"):
        if p.get(k) in (None, ""):
            rep.add("CH-YT-21", MUST, f"pilot record has no value for {k}")
    shorts = sorted(s.get("published", "") for s in p.get("short", []))
    if shorts and p.get("pass_set_at", "") > shorts[0]:
        rep.add("CH-YT-21", MUST, "the pass bar was set after the first Short was published")
    if "verdict" in p or "end" in p:
        try:
            first = dt.date.fromisoformat(shorts[0])
            inside = [s for s in shorts if (dt.date.fromisoformat(s) - first).days <= 90]
        except (IndexError, ValueError):
            inside = []
        if len(inside) < 10:
            rep.add("CH-YT-21", MUST, f"{len(inside)} Shorts within 90 days of the first, need at least 10")
        v = p.get("verdict")
        try:
            want = (
                p["measured_median_engaged_views"] >= p["pass_median_engaged_views"]
                and p["measured_actions"] >= p["pass_actions"]
            )
            if v not in ("pass", "fail") or (v == "pass") != want:
                rep.add("CH-YT-21", MUST, "verdict is missing or does not follow from measured values against the bar")
        except (KeyError, TypeError):
            rep.add("CH-YT-21", MUST, "measured_median_engaged_views and measured_actions must be numbers")
    return rep


def git_tag_date(repo: Path, ref: str) -> str | None:
    try:
        ok = subprocess.run(["git", "-C", str(repo), "rev-parse", "-q", "--verify", f"refs/tags/{ref}"],
                            capture_output=True, text=True)
        if ok.returncode:
            return None
        out = subprocess.run(["git", "-C", str(repo), "log", "-1", "--format=%cs", ref],
                             capture_output=True, text=True)
        return out.stdout.strip() or None
    except OSError:
        return None


def check_manifest(path: Path, a: argparse.Namespace, today: dt.date) -> list[Report]:
    rep = Report(str(path))
    reports = [rep]
    try:
        m = tomllib.loads(path.read_text(encoding="utf-8"))
    except (OSError, tomllib.TOMLDecodeError) as e:
        rep.add("CH-YT-01", MUST, f"manifest unreadable: {e}")
        return reports
    missing = [k for k in REQUIRED if k not in m]
    if m.get("format") == "short" and "related_video" not in m:
        missing.append("related_video")
    for k in missing:
        rep.add("CH-YT-01", MUST, f"manifest has no key {k}")
    pkg = m.get("package", {})
    for k in PACKAGE_KEYS:
        if k not in pkg:
            rep.add("CH-CORE-01", MUST, f"[package] has no key {k}")
    if missing:
        return reports  # later checks index these keys
    short, base = m["format"] == "short", path.parent
    dur, cta = m["duration_s"], m["cta_at_s"]
    desc = read_text(base / m["description"])
    if desc is None:
        rep.add("CH-YT-02", MUST, f"description file {m['description']} missing or not UTF-8")
        desc = ""

    # CH-YT-02
    title = m["title"]
    if len(title) > 100 or set(title) & set("<>"):
        rep.add("CH-YT-02", MUST, "title is over 100 characters or holds < or >")
    if len(desc.encode("utf-8")) > 5000 or set(desc) & set("<>"):
        rep.add("CH-YT-02", MUST, "description is over 5000 UTF-8 bytes or holds < or >")
    # CH-YT-03
    first3 = [l for l in desc.splitlines() if l.strip()][:3]
    if not any(re.search(r"https?://", l) for l in first3):
        rep.add("CH-YT-03", SHOULD, "no destination URL in the first three non-empty description lines")
    # CH-YT-04
    pieces = [s.strip() for s in re.split(r"\.\s+|\n", desc) if s.strip()]
    if len(pieces) != len(set(pieces)):
        rep.add("CH-YT-04", MUST, "a sentence repeats inside the description")
    olds = [t for t in (read_text(Path(p)) for p in a.earlier) if t is not None]
    if olds:
        r = similarity(desc, olds)
        if r >= 0.6:
            rep.add("CH-YT-04", MUST, f"description similarity {r:.2f} to an earlier description, need below 0.60")
    # CH-YT-05
    tags = m["tags"]
    if len(HASHTAG.findall(desc)) > 3:
        rep.add("CH-YT-05", SHOULD, "more than 3 hashtags")
    if sum(len(t) + 2 * (" " in t) for t in tags) + max(len(tags) - 1, 0) > 500:
        rep.add("CH-YT-05", SHOULD, "tags exceed 500 characters as the API counts them")
    # CH-YT-06, CH-YT-07
    status, why = chapters(desc, dur)
    if status == "invalid":
        rep.add("CH-YT-06", MUST, f"invalid chapter list: {why}")
    elif why:
        rep.add("CH-YT-06", SHOULD, why)
    if m["chapters"] not in ("description", "none") or (m["chapters"] == "none") != (status == "none"):
        rep.add("CH-YT-06", MUST, "chapters key must be 'description' when the description has stamps, else 'none'")
    if (not short and dur >= 600 and status == "none") or (short and status != "none"):
        rep.add("CH-YT-07", SHOULD, "chapters belong on long-form videos of 600 s or more, and never on a Short")
    # CH-YT-08
    th = base / m["thumbnail"]
    if th.suffix.lower() not in (".jpg", ".jpeg", ".png") or not th.is_file():
        rep.add("CH-YT-08", MUST, "thumbnail is not an existing JPG or PNG file")
    else:
        size = image_size(th)
        if th.stat().st_size > 52428800:
            rep.add("CH-YT-08", MUST, "thumbnail is over 50 MB")
        if size is None:
            rep.add("CH-YT-08", MUST, "thumbnail dimensions unreadable")
        else:
            w, h = size
            ok = (abs(h / w - 16 / 9) < 0.01 and h >= 1280) if short else (abs(w / h - 16 / 9) < 0.01 and w >= 1280)
            if not ok:
                rep.add("CH-YT-08", MUST, f"thumbnail {w}x{h}: need {'9:16, height' if short else '16:9, width'} at least 1280")
    # CH-YT-09, CH-YT-10
    if m["privacy"] != "private":
        rep.add("CH-YT-09", MUST, "privacy must be private")
    for k in ("made_for_kids", "synthetic", "paid_placement"):
        if not isinstance(m[k], bool):
            rep.add("CH-YT-10", MUST, f"{k} must be an explicit true or false")
    for k in ("default_language", "default_audio_language"):
        if not isinstance(m[k], str) or not m[k]:
            rep.add("CH-YT-10", MUST, f"{k} must be set")
    if a.insert_body:
        body = json.loads(Path(a.insert_body).read_text(encoding="utf-8"))
        st, sn = body.get("status", {}), body.get("snippet", {})
        if st.get("privacyStatus") != "private":
            rep.add("CH-YT-09", MUST, "insert body status.privacyStatus is not private")
        have = [
            "defaultLanguage" in sn, "defaultAudioLanguage" in sn, "selfDeclaredMadeForKids" in st,
            "containsSyntheticMedia" in st, "hasPaidProductPlacement" in body.get("paidProductPlacementDetails", {}),
        ]
        if not all(have):
            rep.add("CH-YT-10", MUST, "insert body lacks one of the five explicit fields")
    if a.readback:
        item = json.loads(Path(a.readback).read_text(encoding="utf-8"))["items"][0]
        got = (
            item["snippet"].get("defaultLanguage"), item["snippet"].get("defaultAudioLanguage"),
            item["status"].get("selfDeclaredMadeForKids"), item["status"].get("containsSyntheticMedia"),
            item.get("paidProductPlacementDetails", {}).get("hasPaidProductPlacement"),
            item["status"].get("privacyStatus"),
        )
        want = (m["default_language"], m["default_audio_language"], m["made_for_kids"], m["synthetic"],
                m["paid_placement"], "private")
        if got != want:
            rep.add("CH-YT-10", MUST, "read-back values differ from the manifest")
    # CH-YT-16
    if ANNOUNCE.search(title):
        ref, date = m.get("milestone_ref", ""), git_tag_date(Path(a.repo), m.get("milestone_ref", "") or "-")
        if not ref or date is None:
            rep.add("CH-YT-16", MUST, "announcement word in the title and milestone_ref is not an existing tag")
        elif date > m.get("publish_date", today.isoformat()):
            rep.add("CH-YT-16", MUST, f"milestone tag {ref} is dated {date}, after the publish date")
    # CH-YT-20 (Shorts) and CH-YT-24
    if short:
        if dur > 180:
            rep.add("CH-YT-20", MUST, "a Short is 180 s or shorter")
        if cta < dur - 5:
            rep.add("CH-YT-20", MUST, "a Short's call to action falls in its last 5 seconds")
        if not m.get("related_video"):
            rep.add("CH-YT-20", MUST, "related_video is empty")
        if not a.target:
            rep.add("CH-YT-20", MUST, "pass --target with the linked long-form manifest")
        else:
            try:
                t = tomllib.loads(Path(a.target).read_text(encoding="utf-8"))
                if t.get("format") != "long" or t.get("hook_covered_by_s", 999) > 10:
                    rep.add("CH-YT-20", MUST, "the linked long-form video must be format long with hook_covered_by_s of 10 or less")
            except (OSError, tomllib.TOMLDecodeError):
                rep.add("CH-YT-20", MUST, "target manifest unreadable")
    end = m.get("end_screen", [])
    if cta < dur - 20 or cta > dur:
        rep.add("CH-YT-24", SHOULD, "cta_at_s must fall inside the last 20 seconds of the video")
    if end and not (dur >= 25 and len(end) <= 4 and not m["made_for_kids"]):
        rep.add("CH-YT-24", SHOULD, "end screen needs 25 s or more, at most 4 elements, and not made for kids")
    # CH-YT-22
    marks = SERIES.findall(title)
    if marks or m.get("series"):
        if not (m.get("series") and m.get("episode") and m.get("concept")):
            rep.add("CH-YT-22", MUST, "a numbered series needs series, episode and concept in the manifest")
        for p in a.earlier_manifest:
            try:
                o = tomllib.loads(Path(p).read_text(encoding="utf-8"))
            except (OSError, tomllib.TOMLDecodeError):
                rep.add("CH-YT-22", MUST, f"earlier manifest {p} unreadable")
                continue
            same_mark = {(w.lower(), n) for w, n in marks} & {(w.lower(), n) for w, n in SERIES.findall(o.get("title", ""))}
            if same_mark or (m.get("series") and (m.get("series"), m.get("episode")) == (o.get("series"), o.get("episode"))):
                rep.add("CH-YT-22", MUST, f"episode number already used by {p}")
            norm = lambda s: re.sub(r"\W+", " ", str(s)).strip().lower()
            if m.get("concept") and norm(m.get("concept")) == norm(o.get("concept", "")):
                rep.add("CH-YT-22", MUST, f"concept repeats the one in {p}")
    # CH-YT-23
    for e in m["audio"] if isinstance(m["audio"], list) and m["audio"] else [{}]:
        if e.get("source") not in ("own", "audio-library", "none"):
            rep.add("CH-YT-23", MUST, "every audio entry needs source own, audio-library or none")
        elif e.get("license") == "cc" and (not e.get("credit") or e["credit"] not in desc):
            rep.add("CH-YT-23", MUST, "a Creative Commons track's credit string must appear in the description")
    # CH-CORE-06, 07, 08 for this platform
    if sorted(pkg.get("labels", [])) != ["paid_placement", "synthetic"]:
        rep.add("CH-CORE-06", MUST, "[package] labels must name synthetic and paid_placement")
    facts = read_text(HERE.parent / "references" / "facts.md") or ""
    kinds = dict(re.findall(r"^\| (YT-F\d+) \| youtube \| (trigger|exemption):", facts, re.MULTILINE))
    am = re.fullmatch(r"(yes|no), case: ([A-Za-z0-9-]+)", m["ai_use"])
    case = am.group(2) if am else ""
    if not am or (case == "borderline" and not any("ai_use" in x for x in pkg.get("open_asks", []))) or (
        case not in ("borderline", "no-ai") and (case not in kinds or (am.group(1) == "yes") != (kinds[case] == "trigger"))
    ) or (case == "no-ai" and am.group(1) != "no"):
        rep.add("CH-CORE-07", MUST, "ai_use must be 'yes|no, case: <registry id>' that agrees with the row, or borderline with an open_asks entry")
    if (pkg.get("sponsored") or m["paid_placement"]) and not SPONSOR_LINE.match((first3 or [""])[0].strip()):
        rep.add("CH-CORE-08", MUST, "a sponsored video's first description line must start with Ad: or Paid partnership:")
    # CH-YT-12 gates from the channel record
    rrep, rec = check_record(Path(a.channel_record), today) if a.channel_record else (None, {})
    if rrep is None:
        rep.add("CH-YT-12", MUST, "pass --channel-record")
    else:
        reports.append(rrep)
        gates = [
            ("clickable_links", bool(re.search(r"https?://", desc)), "a description URL"),
            ("custom_thumbnails", True, "a custom thumbnail"),
            ("related_video_on_short", short, "a Related video"),
        ]
        for key, used, what in gates:
            if used and rec.get(key) != "Enabled":
                rep.add("CH-YT-12", MUST, f"{what} needs the record line {key} to read Enabled")
        if status != "none" and rec.get("chapters", "Enabled") not in ("Enabled", "not listed"):
            rep.add("CH-YT-12", MUST, "chapters line shows a status other than Enabled or not listed")
    waived = m.get("reasons", {})
    rep.items = [i for i in rep.items if not (i[1] == SHOULD and str(waived.get(i[0], "")).strip())]
    return reports


def run(argv: list[str], today: dt.date | None = None) -> tuple[int, list[str]]:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("manifest", nargs="?")
    ap.add_argument("--channel-record")
    ap.add_argument("--pilot")
    ap.add_argument("--earlier", nargs="*", default=[])
    ap.add_argument("--earlier-manifest", nargs="*", default=[])
    ap.add_argument("--target")
    ap.add_argument("--repo", default=".")
    ap.add_argument("--insert-body")
    ap.add_argument("--readback")
    ap.add_argument("--strict", action="store_true")
    ap.add_argument("--today")
    ap.add_argument("--self-test", action="store_true")
    try:
        a = ap.parse_args(argv)
    except SystemExit as e:
        return int(e.code or 0) and 2, []
    t = dt.date.fromisoformat(a.today) if a.today else (today or dt.date.today())
    if a.pilot:
        reps = [check_pilot(Path(a.pilot))]
    elif a.manifest:
        reps = check_manifest(Path(a.manifest), a, t)
    elif a.channel_record:
        reps = [check_record(Path(a.channel_record), t)[0]]
    else:
        ap.print_usage(sys.stderr)
        return 2, []
    items = [i for r in reps for i in r.items]
    out = [l for r in reps for l in r.lines()]
    return (1 if any(s == MUST or a.strict for _, s, _ in items) else 0), out


def self_test() -> int:
    fx, today = HERE / "fixtures" / "youtube", "2026-11-27"
    base = ["--channel-record", str(fx / "channel-record.yml"), "--today", today]

    def ids(argv):
        code, out = run(argv)
        return code, sorted({l.split(": ", 1)[1].split(" ", 1)[0] for l in out}), out

    def expect(cond, what):
        if not cond:
            raise SystemExit(f"self-test failed: {what}")

    # helpers
    expect(chapters("00:00 a\n00:30 b\n01:10 c", 200) == ("valid", ""), "valid chapters")
    expect(chapters("0:00 a\n0:30 b\n1:10 c", 200)[1].startswith("first stamp not written"), "0:00 warns")
    expect(chapters("0:05 a\n0:30 b\n1:10 c", 200)[0] == "invalid", "first stamp not at zero")
    expect(chapters("00:00 a\n00:30 b", 200)[0] == "invalid", "two stamps")
    expect(chapters("00:00 a\n00:05 b\n01:10 c", 200)[0] == "invalid", "5 s gap")
    expect(chapters("00:00 a\n00:30 b\n01:10 c", 75)[0] == "invalid", "last chapter under 10 s")
    expect(chapters("no stamps", 100) == ("none", ""), "no stamps")
    expect(image_size(fx / "thumb-long.png") == (1280, 720), "png size")
    jpeg = b"\xff\xd8\xff\xe0\x00\x04ab\xff\xc0\x00\x0b\x08\x02\xd0\x05\x00\x01xx\xff\xd9"
    with tempfile.NamedTemporaryFile(suffix=".jpg") as f:
        f.write(jpeg)
        f.flush()
        expect(image_size(Path(f.name)) == (1280, 720), "jpeg size")
    expect(bool(ANNOUNCE.search("Introducing mytool")) and not ANNOUNCE.search("launchd tricks"), "announce words")

    # a temporary git repo gives the milestone tag
    repo = Path(tempfile.mkdtemp())
    have_git = shutil.which("git") is not None
    if have_git:
        env = {"GIT_AUTHOR_NAME": "t", "GIT_AUTHOR_EMAIL": "t@example.com", "GIT_COMMITTER_NAME": "t",
               "GIT_COMMITTER_EMAIL": "t@example.com", "GIT_COMMITTER_DATE": "2026-11-01T00:00:00Z",
               "GIT_AUTHOR_DATE": "2026-11-01T00:00:00Z", "PATH": "/usr/bin:/bin:/usr/local/bin"}
        for cmd in (["init", "-q"], ["commit", "-q", "--allow-empty", "-m", "x"], ["tag", "v1.0.0"]):
            subprocess.run(["git", "-C", str(repo), *cmd], env=env, check=True, capture_output=True)

    code, got, out = ids([str(fx / "pass-long" / "manifest.toml"), "--repo", str(repo), *base])
    expect(code == 0 and got == [] or (not have_git and got == ["CH-YT-16"]), f"pass-long should be clean, got {out}")
    code, got, out = ids([str(fx / "pass-short" / "manifest.toml"), "--target", str(fx / "pass-short" / "target.toml"), *base])
    expect(code == 0 and got == [], f"pass-short should be clean, got {out}")
    fl = fx / "fail-long"
    code, got, out = ids([str(fl / "manifest.toml"), "--earlier", str(fl / "old1.txt"), str(fl / "old2.txt"),
                          "--earlier-manifest", str(fl / "old.toml"), "--repo", str(repo), *base])
    want = (fl / "expect.txt").read_text().split()
    expect(code == 1 and got == want, f"fail-long ids {got} != {want}")
    with tempfile.TemporaryDirectory() as tmp:  # a recorded reason waives a SHOULD finding
        shutil.copytree(fl, Path(tmp) / "f")
        mf = Path(tmp) / "f" / "manifest.toml"
        mf.write_text(mf.read_text().replace("../thumb", str(fx / "thumb"))
                      + '\n[reasons]\n"CH-YT-03" = "the link sits in the pinned comment"\n')
        code, got, out = ids([str(mf), "--repo", str(repo), *base])
        expect("CH-YT-03" not in got and "CH-YT-02" in got, "a reason should waive only the SHOULD it names")
    fs = fx / "fail-short"
    code, got, out = ids([str(fs / "manifest.toml"), "--target", str(fs / "target.toml"), "--channel-record",
                          str(fx / "channel-record-stale.yml"), "--today", today])
    want = (fs / "expect.txt").read_text().split()
    expect(code == 1 and got == want, f"fail-short ids {got} != {want}")
    code, got, out = ids(["--pilot", str(fx / "pilot-pass.toml")])
    expect(code == 0 and got == [], f"pilot-pass should be clean, got {out}")
    code, got, out = ids(["--pilot", str(fx / "pilot-fail.toml")])
    expect(code == 1 and got == ["CH-YT-21"] and len(out) >= 3, f"pilot-fail should name 3 defects, got {out}")
    code, got, out = ids([str(fx / "pass-long" / "manifest.toml"), "--insert-body", str(fx / "insert-body-fail.json"),
                          "--readback", str(fx / "readback-fail.json"), "--repo", str(repo), *base])
    expect(code == 1 and "CH-YT-09" in got and "CH-YT-10" in got, f"insert and read-back should fail, got {out}")
    code, _, _ = ids([str(fx / "pass-long" / "manifest.toml"), "--insert-body", str(fx / "insert-body-pass.json"),
                      "--repo", str(repo), *base])
    expect(code == 0, "insert-body-pass should be clean")
    with contextlib.redirect_stderr(io.StringIO()):
        expect(run([])[0] == 2, "no arguments is a usage error")
    shutil.rmtree(repo, ignore_errors=True)
    print("self-test ok")
    return 0


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        sys.exit(self_test())
    code, lines = run(sys.argv[1:])
    print("\n".join(lines))
    sys.exit(code)
