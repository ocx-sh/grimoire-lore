#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Static checks for asciicast files (v2 and v3), the terminal-demo gate.

Rules covered (IDs from the terminal-demo skill):
  CH-VID-07  cast format: v3 for new casts, no mixed v2 and v3 fields
  CH-VID-08  column count against the cap of a surface (--width-px W)
  CH-VID-10  vertical master: at most 41 columns and 20 rows (--vertical)
  CH-VID-11  idle gaps of 2 s or less
  CH-VID-14  every typed command of a scenario appears, in order, in a page
  CH-VID-17  at most 3 full-screen clears in any 1 s window
  CH-VID-21  no identity data in the flattened text
  CH-VID-22  no input events, header env holds only SHELL (and TERM in v2)
  CH-VID-23  normalised-text diff of two casts (never bytes)

Usage:
  cast_check.py [--must-only] [--width-px W ...] [--vertical] [--idle-limit S]
                [--allow-home SEG ...] [--identity STR ...]
                [--private-domain DOMAIN ...] FILE...
  cast_check.py --flatten FILE            print the flattened text (feed it to gitleaks)
  cast_check.py --diff A B [--normalise REGEX ...]
  cast_check.py --scenario SCENARIO --page PAGE
  cast_check.py --self-test

Exit codes: 0 clean, 1 findings, 2 usage or unreadable input.
Standard library only. Run it as python3 -I cast_check.py.
"""

from __future__ import annotations

import argparse
import difflib
import getpass
import html
import json
import math
import re
import socket
import sys
from dataclasses import dataclass
from pathlib import Path

HERE = Path(__file__).resolve().parent
FIXTURES = HERE / "fixtures" / "cast"

SEVERITY = {
    "CH-VID-07": "SHOULD",
    "CH-VID-08": "MUST",
    "CH-VID-10": "MUST",
    "CH-VID-11": "SHOULD",
    "CH-VID-14": "MUST",
    "CH-VID-17": "MUST",
    "CH-VID-21": "MUST",
    "CH-VID-22": "MUST",
    "CH-VID-23": "MUST",
}
FLOOR_PX = 6  # DERIVED x-height floor, see the CH-VID-08 row
LAW = 0.98  # x-height is about 0.98 * width / columns
VERTICAL_COLS, VERTICAL_ROWS = 41, 20
IDLE_MAX = 2.0
CLEARS_PER_SECOND = 3

CSI = re.compile(r"\x1b\[[0-?]*[ -/]*[@-~]")
OSC = re.compile(r"\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)")
CHARSET = re.compile(r"\x1b[()][A-Za-z0-9]")
CLEAR = re.compile(r"\x1b\[(?:2J|3J|\?1049h)")
EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PRIVATE_SUFFIX = re.compile(r"\.(?:internal|local|lan|corp)\b")
HOME = re.compile(r"/home/([^/\s]+)")
WIN_USERS = re.compile(r"[A-Za-z]:\\Users")


@dataclass
class Finding:
    path: str
    rule: str
    message: str

    def render(self) -> str:
        return f"{self.path}: {self.rule} ({SEVERITY[self.rule]}): {self.message}"


class CastError(Exception):
    pass


@dataclass
class Cast:
    header: dict
    events: list  # (absolute_time, code, data)

    @property
    def version(self) -> int:
        return int(self.header.get("version", 0))


def load(path: Path) -> Cast:
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except (OSError, UnicodeDecodeError) as exc:
        raise CastError(f"cannot read: {exc}") from exc
    if not lines:
        raise CastError("empty file")
    try:
        header = json.loads(lines[0])
        if not isinstance(header, dict):
            raise ValueError("header is not an object")
        version = int(header.get("version", 0))
        events, clock = [], 0.0
        for n, line in enumerate(lines[1:], 2):
            if not line.strip():
                continue
            t, code, data = json.loads(line)[:3]
            clock = float(t) if version == 2 else clock + float(t)
            events.append((clock, str(code), str(data)))
    except (ValueError, TypeError) as exc:
        raise CastError(f"not valid asciicast JSON lines: {exc}") from exc
    return Cast(header, events)


def flatten(cast: Cast) -> str:
    text = "".join(d for _, c, d in cast.events if c == "o")
    for rx in (OSC, CSI, CHARSET):
        text = rx.sub("", text)
    return text


def geometry(cast: Cast) -> tuple[int | None, int | None]:
    if cast.version == 3:
        term = cast.header.get("term") or {}
        return term.get("cols"), term.get("rows")
    return cast.header.get("width"), cast.header.get("height")


def check_format(cast: Cast, name: str) -> list[Finding]:
    out: list[Finding] = []
    h = cast.header
    if cast.version not in (2, 3):
        return [Finding(name, "CH-VID-07", f"unsupported cast version {h.get('version')!r}")]
    if cast.version == 2:
        out.append(Finding(name, "CH-VID-07", "v2 cast: record new casts as v3 (leave it until re-recorded)"))
        if "term" in h:
            out.append(Finding(name, "CH-VID-07", "v2 header carries the v3 field 'term'"))
    elif "width" in h or "height" in h:
        out.append(Finding(name, "CH-VID-07", "v3 header carries the v2 fields 'width' or 'height'"))
    allowed = {"SHELL", "TERM"} if cast.version == 2 else {"SHELL"}
    extra = sorted(set(h.get("env") or {}) - allowed)
    if extra:
        out.append(Finding(name, "CH-VID-22", f"header env holds {', '.join(extra)}; allowed: {', '.join(sorted(allowed))}"))
    if any(c == "i" for _, c, _ in cast.events):
        n = sum(1 for _, c, _ in cast.events if c == "i")
        out.append(Finding(name, "CH-VID-22", f"{n} input ('i') events; record without input capture"))
    return out


def check_geometry(cast: Cast, name: str, widths: list[float], vertical: bool) -> list[Finding]:
    cols, rows = geometry(cast)
    out: list[Finding] = []
    if not isinstance(cols, int):
        return [Finding(name, "CH-VID-08", "no column count in the header")]
    if vertical:
        if cols > VERTICAL_COLS:
            out.append(Finding(name, "CH-VID-10", f"{cols} columns; the vertical master allows {VERTICAL_COLS}"))
        if isinstance(rows, int) and rows > VERTICAL_ROWS:
            out.append(Finding(name, "CH-VID-10", f"{rows} rows; the vertical master allows {VERTICAL_ROWS}"))
    for w in widths:
        cap = math.floor(LAW * w / FLOOR_PX)
        if cols > cap:
            xh = LAW * w / cols
            out.append(Finding(name, "CH-VID-08", f"{cols} columns exceeds the cap of {cap} for a {w:g} px text line (x-height {xh:.2f} px, floor {FLOOR_PX} px)"))
    return out


def check_idle(cast: Cast, name: str, idle_limit: float | None) -> list[Finding]:
    limits = [v for v in (cast.header.get("idle_time_limit"), idle_limit) if isinstance(v, (int, float))]
    if limits and min(limits) <= IDLE_MAX:
        return []
    gap, prev = 0.0, 0.0
    for t, _, _ in cast.events:
        gap, prev = max(gap, t - prev), t
    if gap <= IDLE_MAX:
        return []
    return [Finding(name, "CH-VID-11", f"largest gap is {gap:.2f} s and no idle limit of {IDLE_MAX:g} s or less is set (header idle_time_limit, player idleTimeLimit or agg --idle-time-limit)")]


def check_flash(cast: Cast, name: str) -> list[Finding]:
    hits = [(t, len(CLEAR.findall(d))) for t, c, d in cast.events if c == "o" and CLEAR.search(d)]
    worst, worst_at = 0, 0.0
    for i, (t, _) in enumerate(hits):
        n = sum(k for u, k in hits[: i + 1] if t - u < 1.0)
        if n > worst:
            worst, worst_at = n, t
    if worst > CLEARS_PER_SECOND:
        return [Finding(name, "CH-VID-17", f"{worst} full-screen clears within 1 s ending at {worst_at:.2f} s; the limit is {CLEARS_PER_SECOND}")]
    return []


def check_identity(cast: Cast, name: str, allow_home: set[str], names: list[str], domains: list[str]) -> list[Finding]:
    flat = flatten(cast)
    out: list[Finding] = []

    def report(kind: str, line_no: int) -> None:
        out.append(Finding(name, "CH-VID-21", f"{kind} in the flattened text at line {line_no} (value withheld)"))

    for n, line in enumerate(flat.splitlines(), 1):
        for m in HOME.finditer(line):
            if m.group(1) not in allow_home:
                report("a /home/ path with a non-allowlisted segment", n)
        scrub = HOME.sub(lambda m: "/home/<ok>" if m.group(1) in allow_home else m.group(0), line)
        if "/Users/" in scrub or WIN_USERS.search(scrub):
            report("a user-profile path", n)
        if "/root/" in scrub:
            report("a /root/ path", n)
        if EMAIL.search(scrub):
            report("an email address", n)
        if PRIVATE_SUFFIX.search(scrub) or any(d in scrub for d in domains):
            report("a private domain suffix", n)
        for ident in names:
            if re.search(rf"(?<![A-Za-z0-9]){re.escape(ident)}(?![A-Za-z0-9])", scrub):
                report("the recorder's user or host name", n)
    return out


def own_names(extra: list[str]) -> list[str]:
    found = list(extra)
    for getter in (getpass.getuser, socket.gethostname):
        try:
            found.append(getter().split(".")[0])
        except Exception:  # shortcut: no user database in some containers, skip the default name
            pass
    return sorted({n for n in found if len(n) >= 4 or n in extra})


NORMALISE = [
    (re.compile(r"/tmp/[^\s/'\"]+"), "/tmp/TMP"),
    (re.compile(r"((?:localhost|127\.0\.0\.1|\[::1\]):)\d{2,5}"), r"\1PORT"),
    (re.compile(r"\d{4}-\d\d-\d\d[T ]\d\d:\d\d:\d\d(?:\.\d+)?Z?"), "TIMESTAMP"),
    (re.compile(r"\b\d\d:\d\d:\d\d\b"), "TIME"),
]


def normalised(cast: Cast, extra: list[str]) -> list[str]:
    text = flatten(cast).replace("\r\n", "\n").replace("\r", "\n")
    for rx, repl in NORMALISE + [(re.compile(p), "NORMALISED") for p in extra]:
        text = rx.sub(repl, text)
    return [ln.rstrip() for ln in text.splitlines()]


def commands_of(scenario: str, text: str) -> list[str]:
    cmds: list[str] = []
    for line in text.splitlines():
        if scenario.endswith(".tape"):
            m = re.match(r"""^Type(?:@\S+)?\s+(["'`])(.*)\1\s*$""", line)
            if m:
                cmds.append(m.group(2))
        else:
            m = re.match(r"""^\s*(?:-\s*)?type:\s*(.*?)\s*$""", line)
            if m:
                cmds.append(m.group(1).strip("'\""))
    return cmds


def check_transcript(scenario: Path, page: Path) -> list[Finding]:
    try:
        cmds = commands_of(scenario.name, scenario.read_text(encoding="utf-8"))
        text = page.read_text(encoding="utf-8")
    except OSError as exc:
        raise CastError(f"cannot read: {exc}") from exc
    text = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", text)))
    if not cmds:
        return [Finding(str(scenario), "CH-VID-14", "no typed command found in the scenario")]
    out, pos = [], 0
    for cmd in cmds:
        parts = [re.escape(p) for p in re.split(r"\{[A-Za-z0-9_]+\}", re.sub(r"\s+", " ", cmd))]
        m = re.compile(r"\S+".join(parts)).search(text, pos)
        if m:
            pos = m.end()
        else:
            out.append(Finding(str(page), "CH-VID-14", f"typed command missing, or out of order, in the page text: {cmd}"))
    return out


def run_checks(paths: list[Path], opt: argparse.Namespace) -> list[Finding]:
    out: list[Finding] = []
    for p in paths:
        name = str(p)
        try:
            cast = load(p)
        except CastError as exc:
            out.append(Finding(name, "CH-VID-07", str(exc)))
            continue
        out += check_format(cast, name)
        out += check_geometry(cast, name, opt.width_px or [], opt.vertical)
        out += check_idle(cast, name, opt.idle_limit)
        out += check_flash(cast, name)
        out += check_identity(cast, name, set(opt.allow_home or ["runner"]), own_names(opt.identity or []), opt.private_domain or [])
    return out


def build_parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(description="Static checks for asciicast files (terminal-demo gate).", epilog="Exit 0 clean, 1 findings, 2 usage.")
    ap.add_argument("files", nargs="*", help="cast files to check")
    ap.add_argument("--width-px", type=float, action="append", help="drawn text-line width in px on a surface (CH-VID-08); repeat for each surface")
    ap.add_argument("--vertical", action="store_true", help="vertical master: 41 columns, 20 rows (CH-VID-10)")
    ap.add_argument("--idle-limit", type=float, help="idle limit the player or agg applies, in seconds (CH-VID-11)")
    ap.add_argument("--allow-home", action="append", help="allowlisted /home/SEGMENT (default: runner)")
    ap.add_argument("--identity", action="append", help="extra user, host or organisation name to forbid (CH-VID-21)")
    ap.add_argument("--private-domain", action="append", help="private domain to forbid (CH-VID-21)")
    ap.add_argument("--must-only", action="store_true", help="ignore SHOULD findings")
    ap.add_argument("--flatten", metavar="FILE", help="print flattened text and exit")
    ap.add_argument("--diff", nargs=2, metavar=("A", "B"), help="CH-VID-23: normalised-text diff")
    ap.add_argument("--normalise", action="append", default=[], help="extra regex replaced before the diff")
    ap.add_argument("--scenario", help="CH-VID-14: scenario YAML or .tape file")
    ap.add_argument("--page", help="CH-VID-14: page source holding the transcript")
    ap.add_argument("--self-test", action="store_true", help="run against the bundled fixtures")
    return ap


def main(argv: list[str]) -> int:
    ap = build_parser()
    opt = ap.parse_args(argv)
    try:
        if opt.self_test:
            return self_test()
        if opt.flatten:
            sys.stdout.write(flatten(load(Path(opt.flatten))))
            return 0
        if opt.diff:
            a, b = (normalised(load(Path(f)), opt.normalise) for f in opt.diff)
            delta = list(difflib.unified_diff(a, b, opt.diff[0], opt.diff[1], lineterm="", n=1))
            for line in delta[:40]:
                print(line)
            if delta:
                print(f"{opt.diff[1]}: CH-VID-23 (MUST): normalised text differs from {opt.diff[0]}")
            return 1 if delta else 0
        if opt.scenario or opt.page:
            if not (opt.scenario and opt.page):
                ap.error("--scenario and --page go together")
            found = check_transcript(Path(opt.scenario), Path(opt.page))
        else:
            if not opt.files:
                ap.error("give at least one cast file")
            if not (opt.width_px or opt.vertical):
                print("note: CH-VID-08 not checked; pass --width-px W measured on each surface", file=sys.stderr)
            found = run_checks([Path(f) for f in opt.files], opt)
    except CastError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    if opt.must_only:
        found = [f for f in found if SEVERITY[f.rule] == "MUST"]
    for f in found:
        print(f.render())
    return 1 if found else 0


def expect(cond: bool, what: str) -> None:
    if not cond:
        raise SystemExit(f"self-test failed: {what}")


def rules_of(paths: list[str], *flags: str) -> set[str]:
    opt = build_parser().parse_args([*flags, *paths])
    return {f.rule for f in run_checks([Path(p) for p in paths], opt)}


def self_test() -> int:
    f = lambda n: str(FIXTURES / n)  # noqa: E731
    clean = rules_of([f("pass-v3.cast")], "--width-px", "360", "--identity", "alice")
    expect(clean == set(), f"pass-v3.cast should be clean, got {clean}")
    bad = rules_of([f("fail-v2.cast")], "--width-px", "360", "--identity", "alice")
    want = {"CH-VID-07", "CH-VID-08", "CH-VID-11", "CH-VID-17", "CH-VID-21", "CH-VID-22"}
    expect(bad == want, f"fail-v2.cast should trip {sorted(want)}, got {sorted(bad)}")
    expect(rules_of([f("fail-v2.cast")], "--idle-limit", "2") == bad - {"CH-VID-11", "CH-VID-08"} | set(), "idle limit from the player must clear CH-VID-11")
    expect("CH-VID-10" in rules_of([f("fail-v2.cast")], "--vertical"), "vertical master must reject 180 columns")
    cast = load(FIXTURES / "canary.cast")
    raw = (FIXTURES / "canary.cast").read_text(encoding="utf-8")
    token = "ghp_" + "".join(chr(ord("A") + i % 26) for i in range(36))
    expect(token in flatten(cast) and token not in raw, "flatten must rebuild the canary token that the raw file hides")
    a, b, c = (normalised(load(FIXTURES / n), []) for n in ("rerun-a.cast", "rerun-b.cast", "rerun-c.cast"))
    expect(a == b, "temp path, port and timestamp differences must normalise away")
    expect(a != c, "a real output change must survive normalisation")
    tape = FIXTURES / "demo.tape"
    expect(check_transcript(tape, FIXTURES / "page-pass.html") == [], "page-pass.html holds every command in order")
    expect(len(check_transcript(tape, FIXTURES / "page-fail.html")) == 2, "page-fail.html misses one command and swaps two")
    print("self-test ok")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
