#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Contrast of the colours an asciicast prints, against the theme the viewer sees.

Rules covered (IDs from the terminal-demo skill):
  CH-VID-12  the theme foreground and every ANSI palette colour the session
             prints reach 4.5:1 against the theme background
  CH-VID-27  dim (SGR 2) text is scored as the 50/50 blend with the background
             that asciinema-player draws (CSS opacity 0.5)

Usage:
  cast_contrast.py [--theme THEME.json] FILE...
  cast_contrast.py --self-test

The theme comes from the cast header (v2 "theme", v3 "term.theme") unless
--theme names a JSON file holding {"fg": "#rrggbb", "bg": "#rrggbb",
"palette": "#rrggbb:#rrggbb:..."} with 16 palette entries. Pass --theme when the
embed forces a theme, once per colour scheme the site offers. The header theme
does not decide the colours in that case.

Scored: 16-colour foregrounds (SGR 30 to 37, 90 to 97, and 38;5;N for N under
16) and dim over each of them or over the default foreground. Reported as
"manual", never scored: 256-colour indices 16 to 255, truecolour, and any text
drawn over a set background (SGR 40 to 47, 100 to 107, 48) or in reverse video.

Exit codes: 0 clean, 1 a colour fails, 2 usage or unreadable input.
Standard library only. Run it as python3 -I cast_contrast.py.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
FIXTURES = HERE / "fixtures" / "contrast"
MIN_RATIO = 4.5  # WCAG SC 1.4.3 for text

TOKEN = re.compile(r"\x1b\[([0-9;]*)m|\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|([^\x1b])")


def rgb(colour: str) -> list[float]:
    c = colour.lstrip("#")
    return [float(int(c[i : i + 2], 16)) for i in (0, 2, 4)]


def luminance(c: list[float]) -> float:
    def f(v: float) -> float:
        v /= 255
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4

    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2])


def ratio(a: list[float], b: list[float]) -> float:
    hi, lo = sorted((luminance(a), luminance(b)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


def hexs(c: list[float]) -> str:
    return "#%02x%02x%02x" % tuple(round(v) for v in c)


class ScanError(Exception):
    pass


def read_theme(header: dict, theme_path: str | None) -> dict:
    theme = None
    if theme_path:
        try:
            theme = json.loads(Path(theme_path).read_text(encoding="utf-8"))
        except (OSError, ValueError) as exc:
            raise ScanError(f"cannot read theme {theme_path}: {exc}") from exc
    else:
        theme = header.get("theme") or (header.get("term") or {}).get("theme")
    if not theme:
        raise ScanError("no theme in the cast header: pass the theme the embed forces with --theme")
    palette = str(theme.get("palette", "")).split(":")
    if len(palette) < 16 or not theme.get("fg") or not theme.get("bg"):
        raise ScanError("theme needs fg, bg and a 16-entry palette")
    return {"fg": rgb(theme["fg"]), "bg": rgb(theme["bg"]), "palette": [rgb(p) for p in palette[:16]]}


def scan(text: str) -> dict:
    """Walk the output and record which colours were drawn with printable text."""
    used: set = set()  # palette index, or None for the default foreground
    dim_used: set = set()
    manual: set[str] = set()
    fg: int | str | None = None
    dim = reverse = False
    bg_set = False
    for m in TOKEN.finditer(text):
        if m.group(2) is not None:
            ch = m.group(2)
            if not ch.strip() or ord(ch) < 32:
                continue
            if bg_set or reverse:
                manual.add("text over a set background or in reverse video")
            elif isinstance(fg, str):
                manual.add(fg)
            else:
                (dim_used if dim else used).add(fg)
            continue
        if m.group(1) is None:
            continue
        ps = [int(x or 0) for x in m.group(1).split(";")] or [0]
        i = 0
        while i < len(ps):
            p = ps[i]
            i += 1
            if p == 0:
                fg, dim, reverse, bg_set = None, False, False, False
            elif p == 2:
                dim = True
            elif p == 22:
                dim = False
            elif p == 7:
                reverse = True
            elif p == 27:
                reverse = False
            elif p == 39:
                fg = None
            elif p == 49:
                bg_set = False
            elif 30 <= p <= 37:
                fg = p - 30
            elif 90 <= p <= 97:
                fg = p - 82
            elif 40 <= p <= 47 or 100 <= p <= 107:
                bg_set = True
            elif p in (38, 48):
                mode = ps[i : i + 1]
                if mode == [5]:
                    n = ps[i + 1] if i + 1 < len(ps) else 0
                    i += 2
                    value: int | str = n if n < 16 else f"256-colour index {n}"
                else:
                    i += 4
                    value = "truecolour"
                if p == 48:
                    bg_set = True
                else:
                    fg = value
    return {"used": used, "dim": dim_used, "manual": manual}


def score(path: Path, theme_path: str | None) -> tuple[list[str], bool]:
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
        header = json.loads(lines[0])
        version = int(header.get("version", 0))
        out_text = "".join(json.loads(ln)[2] for ln in lines[1:] if ln.strip() and json.loads(ln)[1] == "o")
    except (OSError, ValueError, IndexError, TypeError) as exc:
        raise ScanError(f"{path}: not readable as an asciicast: {exc}") from exc
    if version not in (2, 3):
        raise ScanError(f"{path}: unsupported cast version {version}")
    theme = read_theme(header, theme_path)
    found = scan(out_text)
    bg, report, failed = theme["bg"], [], False

    def row(label: str, colour: list[float], blend: bool, rule: str) -> None:
        nonlocal failed
        shown = [(c + b) / 2 for c, b in zip(colour, bg)] if blend else colour
        r = ratio(shown, bg)
        bad = r < MIN_RATIO
        failed |= bad
        tail = f" effective {hexs(shown)}" if blend else ""
        report.append(f"{path}: {rule} {label} {hexs(colour)}{tail} {r:.2f} {'FAIL' if bad else 'ok'}")

    row("fg", theme["fg"], False, "CH-VID-12")
    for idx in sorted(i for i in found["used"] if i is not None):
        row(f"palette {idx}", theme["palette"][idx], False, "CH-VID-12")
    for idx in sorted(i for i in found["dim"] if i is not None):
        row(f"dim over palette {idx}", theme["palette"][idx], True, "CH-VID-27")
    if None in found["dim"]:
        row("dim over theme fg", theme["fg"], True, "CH-VID-27")
    for item in sorted(found["manual"]):
        report.append(f"{path}: manual: {item} is not scored; check it by hand")
    return report, failed


def build_parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(description="Contrast of the colours a cast prints (CH-VID-12, CH-VID-27).", epilog="Exit 0 clean, 1 a colour fails, 2 usage.")
    ap.add_argument("files", nargs="*", help="cast files")
    ap.add_argument("--theme", help="JSON theme the embed forces; run once per colour scheme")
    ap.add_argument("--self-test", action="store_true", help="run against the bundled fixtures")
    return ap


def main(argv: list[str]) -> int:
    ap = build_parser()
    opt = ap.parse_args(argv)
    if opt.self_test:
        return self_test()
    if not opt.files:
        ap.error("give at least one cast file")
    bad = False
    try:
        for f in opt.files:
            lines, failed = score(Path(f), opt.theme)
            print("\n".join(lines))
            bad |= failed
    except ScanError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    return 1 if bad else 0


def expect(cond: bool, what: str) -> None:
    if not cond:
        raise SystemExit(f"self-test failed: {what}")


def self_test() -> int:
    expect(abs(ratio([0, 0, 0], [255, 255, 255]) - 21) < 1e-9, "black on white must give 21:1")
    theme = str(FIXTURES / "theme.json")
    cases = {
        "pass.cast": (0, ""),
        "fail-bright-black.cast": (1, "palette 8 "),
        "fail-dim.cast": (1, "dim over palette 2 #7fae6f effective #4a634a 2.67 FAIL"),
        "pass-dim-fg.cast": (0, "dim over theme fg #e9e9ed effective #80808a 4.52 ok"),
        "pass-bg48.cast": (0, "text over a set background"),
    }
    for name, (code, needle) in cases.items():
        lines, failed = score(FIXTURES / name, theme)
        expect(int(failed) == code, f"{name}: expected exit {code}, got {int(failed)}")
        expect(needle in "\n".join(lines), f"{name}: expected {needle!r} in {lines}")
    lines, _ = score(FIXTURES / "pass.cast", None)  # header theme path
    expect(any("fg" in ln for ln in lines), "header theme must be read when --theme is absent")
    try:
        score(FIXTURES / "no-theme.cast", None)
    except ScanError:
        pass
    else:
        expect(False, "a cast with no theme and no --theme must be refused")
    print("self-test ok")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
