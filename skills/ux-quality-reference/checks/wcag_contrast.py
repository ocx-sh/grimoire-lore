#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""UX-A11Y-15 and UX-A11Y-16 check: WCAG 2 contrast ratios, unrounded.

Reads colour pairs from stdin, one per line:

    <foreground> <background> [label ...]

Colours are #rgb, #rgba, #rrggbb or #rrggbbaa. A foreground alpha is blended
onto the background before the ratio is computed. The background is read as
opaque: list the flattened ground, not a translucent layer. Lines that are
blank or start with // are skipped.

The threshold is the first argument: 4.5 for normal text, 3 for large text and
for a boundary or indicator that is the only cue (UX-A11Y-16). The comparison is
unrounded: 4.499 fails 4.5. Build the pair list yourself, one line per text
token, surface token and theme. A pair missing from the list is not checked.

Usage: wcag_contrast.py THRESHOLD < pairs.txt
       wcag_contrast.py --self-test
Exit 0 every pair passes, 1 at least one pair fails, 2 usage or a bad colour.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

HEX = re.compile(r"^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$")


def rgba(colour: str) -> tuple[list[int], float]:
    if not HEX.match(colour):
        raise ValueError(f"not a hex colour: {colour!r}")
    h = colour.lstrip("#")
    if len(h) in (3, 4):
        h = "".join(c * 2 for c in h)
    v = [int(h[i : i + 2], 16) for i in range(0, len(h), 2)]
    return v[:3], (v[3] / 255 if len(v) == 4 else 1.0)


def luminance(rgb: list[float]) -> float:
    lin = [c / 255 for c in rgb]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in lin]
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]


def ratio(fg: str, bg: str) -> float:
    (f, a), (b, _) = rgba(fg), rgba(bg)
    blended = [a * x + (1 - a) * y for x, y in zip(f, b, strict=True)]
    hi, lo = sorted((luminance(blended), luminance(b)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


def expect(condition: bool, message: str) -> None:
    """Self-test check. A bare assert is stripped by python -O and would pass silently."""
    if not condition:
        raise SystemExit(f"self-test: {message}")


def self_test() -> int:
    expect(
        abs(ratio("#767676", "#ffffff") - 4.542) < 0.001,
        'abs(ratio("#767676", "#ffffff") - 4.542) < 0.001',
    )
    expect(ratio("#767676", "#ffffff") >= 4.5, 'ratio("#767676", "#ffffff") >= 4.5')
    expect(abs(ratio("#aaa", "#fff") - 2.323) < 0.001, 'abs(ratio("#aaa", "#fff") - 2.323) < 0.001')
    expect(abs(ratio("#000", "#fff") - 21) < 1e-9, 'abs(ratio("#000", "#fff") - 21) < 1e-9')
    expect(
        ratio("#00000099", "#ffffff") > ratio("#00000040", "#ffffff"),
        'ratio("#00000099", "#ffffff") > ratio("#00000040", "#ffffff")',
    )
    expect(ratio("#fff", "#fff") == 1.0, 'ratio("#fff", "#fff") == 1.0')
    try:
        ratio("red", "#fff")
    except ValueError:
        pass
    else:
        raise AssertionError("a named colour must be rejected")
    here = Path(__file__).resolve().parent / "fixtures" / "a11y" / "contrast"
    expect(
        run(4.5, (here / "pairs_pass.txt").read_text().splitlines(), quiet=True) == 0,
        'run(4.5, (here / "pairs_pass.txt").read_text().splitlines(), quiet=True) == 0',
    )
    expect(
        run(4.5, (here / "pairs_fail.txt").read_text().splitlines(), quiet=True) == 1,
        'run(4.5, (here / "pairs_fail.txt").read_text().splitlines(), quiet=True) == 1',
    )
    print("self-test ok")
    return 0


def run(need: float, lines: list[str], quiet: bool = False) -> int:
    bad = 0
    for line in lines:
        parts = line.split()
        if len(parts) < 2 or parts[0].startswith("//"):
            continue
        try:
            r = ratio(parts[0], parts[1])
        except ValueError as e:
            print(f"error: {e}", file=sys.stderr)
            return 2
        ok = r >= need
        bad += not ok
        if not quiet:
            print("PASS" if ok else "FAIL", f"{r:.3f}", *parts)
    return 1 if bad else 0


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument(
        "threshold",
        nargs="?",
        type=float,
        help="4.5 for normal text, 3 for large text or a boundary",
    )
    ap.add_argument(
        "--self-test", action="store_true", help="run the built-in checks over the fixtures"
    )
    args = ap.parse_args(argv)
    if args.self_test:
        return self_test()
    if args.threshold is None:
        ap.error("give a THRESHOLD, or --self-test")
    return run(args.threshold, sys.stdin.read().splitlines())


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
