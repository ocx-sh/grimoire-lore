#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""UX-A11Y-12 lead generator: a focus indicator removed with no replacement.

Reads .css and .scss files, plus <style> blocks in .astro, .html, .svelte and
.vue files. For every rule whose selector carries :focus, :focus-visible or
:focus-within and whose body removes the outline (outline none, 0 or
transparent, outline-style none, outline-width 0, all unset or initial), it
looks for a replacement in the same tree of files:

  1. the same rule also draws an outline or a border, or
  2. another focus rule on the same base selector draws one (a ring on
     ::before or ::after counts), or
  3. a :has(...:focus...) rule names the element and draws one, or
  4. a :focus-within rule on an ancestor draws one (descendant selector, or
     BEM block__element naming).

A rule `all: unset` or `all: initial` on a selector with no pseudo-class is a
removal too: it needs a focus rule on the same selector that draws an outline
or a border. A box-shadow alone does not count, because forced colours
suppress it (CSS-A11Y-01).

Skipped on purpose: selectors with :not(:focus) or :not(:focus-visible) (the
mouse-focus idiom), and ::-webkit-* sub-parts of an input.

Marker (pinned): a comment `focus-ok: <reason>` directly before the removing
rule records a reviewed exception. Name the drawing selector and its file.

Rows are tab separated: PASS, FAIL or EXEMPT, file:line, selector, evidence.
These rows are leads. The pass condition is the triaged end state: every FAIL
row is fixed or carries a focus-ok comment, then the script exits 0.

shortcut: a regex tokenizer, no :is() or :where() expansion and no strings
containing braces; upgrade to a PostCSS plugin if a codebase relies on either.

Usage: focus_outline.py [--format text|json] DIR [DIR ...]
       focus_outline.py --self-test
Exit 0 clean, 1 at least one FAIL row, 2 usage or missing input.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

FOCUS = re.compile(r":focus(-visible|-within)?\b")
NOT_FOCUS = re.compile(r":not\(:focus(-visible)?\)")
WEBKIT = re.compile(r"::-webkit-")
PSEUDO_EL = re.compile(r"::(before|after)\b")
MARK = "__FOCUSOK__"

# A removal declaration. `all` is handled apart, because it needs a base selector.
REMOVE = re.compile(
    r"(?<![-\w])outline\s*:\s*(none|0(px)?|transparent)\s*(!important)?\s*(;|$)"
    r"|(?<![-\w])outline-style\s*:\s*none\s*(!important)?\s*(;|$)"
    r"|(?<![-\w])outline-width\s*:\s*0(px)?\s*(!important)?\s*(;|$)"
    r"|(?<![-\w])outline-color\s*:\s*transparent\s*(!important)?\s*(;|$)"
)
ALL_RESET = re.compile(r"(?<![-\w])all\s*:\s*(unset|initial)\s*(!important)?\s*(;|$)")
DRAW = re.compile(
    r"(?<![-\w])outline(-style|-width)?\s*:\s*(?!none\b|0(px)?\s*(;|$)|transparent\b)[^;]+"
    r"|(?<![-\w])border(-[a-z]+)?-color\s*:"
    r"|(?<![-\w])border(-(top|right|bottom|left))?\s*:\s*(?!none\b|0\b)[^;]+"
)


def _split_list(sel: str) -> list[str]:
    parts, depth, cur = [], 0, ""
    for ch in sel:
        depth += ch == "("
        depth -= ch == ")"
        if ch == "," and depth == 0:
            parts.append(cur.strip())
            cur = ""
        else:
            cur += ch
    return [p for p in [*parts, cur.strip()] if p]


def _resolve(prelude: str, parent: list[str]) -> list[str]:
    """Resolve CSS nesting: `&` is the parent, a bare selector is a descendant."""
    own = _split_list(prelude)
    if not parent or prelude.startswith("@"):
        return own
    out = []
    for s in own:
        for p in parent:
            out.append(s.replace("&", p) if "&" in s else f"{p} {s}")
    return out


def parse(css: str) -> list[tuple[str, str, bool, int]]:
    """Return (selector, declarations, exempt, line) for every style rule."""

    def mark(m: re.Match) -> str:
        keep = "\n" * m.group(0).count("\n")
        return (f" {MARK} " if "focus-ok:" in m.group(1) else " ") + keep

    css = re.sub(r"/\*(.*?)\*/", mark, css, flags=re.DOTALL)
    css = re.sub(r"(?m)^\s*//.*$", "", css) if "//" in css else css
    out: list[tuple[str, str, bool, int]] = []
    frames: list[dict] = []
    buf, line = "", 1
    for ch in css:
        if ch == "\n":
            line += 1
        if ch == "{":
            prelude = buf.strip()
            exempt = MARK in prelude
            prelude = prelude.replace(MARK, "").strip()
            parent = frames[-1]["sels"] if frames and not frames[-1]["at"] else []
            frames.append(
                {
                    "sels": _resolve(prelude, parent),
                    "at": prelude.startswith("@"),
                    "decl": "",
                    "exempt": exempt,
                    "line": line,
                }
            )
            buf = ""
        elif ch == ";":
            if frames:
                frames[-1]["decl"] += buf.replace(MARK, "") + ";"
            buf = ""
        elif ch == "}":
            if frames:
                frame = frames.pop()
                frame["decl"] += buf.replace(MARK, "")
                if not frame["at"]:
                    for sel in frame["sels"]:
                        out.append((sel, frame["decl"], frame["exempt"], frame["line"]))
            buf = ""
        else:
            buf += ch
    return out


def _base(sel: str) -> str:
    s = NOT_FOCUS.sub("", sel)
    s = PSEUDO_EL.sub("", s)
    s = FOCUS.sub("", s)
    return re.sub(r"\s+", " ", s).strip()


def _last_class(sel: str) -> str:
    tail = re.split(r"[\s>+~]+", sel)[-1] if sel else ""
    m = re.findall(r"\.[\w-]+", tail)
    return m[0] if m else ""


def _draws(body: str) -> bool:
    return bool(DRAW.search(ALL_RESET.sub("", REMOVE.sub("", body))))


def _replacement(rules: list, sel: str) -> str | None:
    base = _base(sel)
    last = re.split(r"[\s>+~]+", base)[-1] if base else ""
    for s2, b2, _, ln2 in rules:
        if NOT_FOCUS.search(s2) or not FOCUS.search(s2) or not _draws(b2):
            continue
        if REMOVE.search(b2) or ALL_RESET.search(b2):
            continue
        b2base = _base(s2)
        if b2base == base:
            return f"{s2} (line {ln2})"
        if ":has(" in s2 and last and re.search(rf"(?<![\w.#-]){re.escape(last)}(?![\w-])", s2):
            return f"{s2} (line {ln2})"
        if (
            ":focus-within" in s2
            and b2base
            and (
                base.startswith(b2base + " ")
                or (
                    _last_class(b2base) and _last_class(base).startswith(_last_class(b2base) + "__")
                )
            )
        ):
            return f"{s2} (line {ln2})"
    return None


def check(css: str, name: str = "<css>") -> list[tuple[str, str, str, str]]:
    rules = parse(css)
    results = []
    for sel, body, exempt, line in rules:
        where = f"{name}:{line}"
        has_focus = bool(FOCUS.search(sel))
        removes = bool(REMOVE.search(body))
        resets = bool(ALL_RESET.search(body))
        if has_focus:
            if NOT_FOCUS.search(sel) or WEBKIT.search(sel) or not (removes or resets):
                continue
        elif not (resets and ":" not in sel):
            continue
        if exempt:
            results.append(("EXEMPT", where, sel, "focus-ok comment"))
            continue
        if has_focus and _draws(body):
            results.append(("PASS", where, sel, "same rule draws"))
            continue
        found = _replacement(rules, sel)
        if found:
            results.append(("PASS", where, sel, "replacement " + found))
            continue
        shadow_only = any(
            FOCUS.search(s2) and _base(s2) == _base(sel) and "box-shadow" in b2
            for s2, b2, _, _ in rules
        )
        why = ("all unset, " if resets else "") + (
            "box-shadow only" if shadow_only else "no replacement"
        )
        results.append(("FAIL", where, sel, why))
    return results


def files(root: Path):
    for p in sorted(root.rglob("*")):
        if "node_modules" in p.parts or ".git" in p.parts or not p.is_file():
            continue
        if p.suffix in (".css", ".scss"):
            yield p, p.read_text(errors="replace")
        elif p.suffix in (".astro", ".html", ".svelte", ".vue"):
            blocks = re.findall(
                r"<style[^>]*>(.*?)</style>", p.read_text(errors="replace"), flags=re.DOTALL
            )
            if blocks:
                yield p, "\n".join(blocks)


def expect(condition: bool, message: str) -> None:
    """Self-test check. A bare assert is stripped by python -O and would pass silently."""
    if not condition:
        raise SystemExit(f"self-test: {message}")


def self_test() -> int:
    def v(css: str) -> list[str]:
        return [r[0] for r in check(css)]

    expect(
        v("button:focus{outline:none}") == ["FAIL"], 'v("button:focus{outline:none}") == ["FAIL"]'
    )
    expect(
        v("a:focus-visible{outline:none;box-shadow:0 0 0 2px red}") == ["FAIL"],
        'v("a:focus-visible{outline:none;box-shadow:0 0 0 2px red}") == ["FAIL"]',
    )
    expect(
        v("a:focus{outline:0}a:focus-visible{outline:2px solid blue}")[0] == "PASS",
        'v("a:focus{outline:0}a:focus-visible{outline:2px solid blue}")[0] == "PASS"',
    )
    expect(
        v(".f:has(.t:focus-visible){outline:2px solid red}a:focus{outline:none}") == ["FAIL"],
        'v(".f:has(.t:focus-visible){outline:2px solid red}a:focus{outline:none}") == ["FAIL"]',
    )
    expect(
        v(".f:has(.t:focus-visible){outline:var(--ring)} .t:focus-visible{outline:none}")
        == ["PASS"],
        'v(".f:has(.t:focus-visible){outline:var(--ring)} .t:focus-visible{outline:none}") == [ "PASS" ]',
    )
    expect(
        v(".x:focus-visible{outline:none;border-color:var(--c)}") == ["PASS"],
        'v(".x:focus-visible{outline:none;border-color:var(--c)}") == ["PASS"]',
    )
    expect(
        v(".g:focus-within{border-color:blue} .g__in:focus-visible{outline:none}") == ["PASS"],
        'v(".g:focus-within{border-color:blue} .g__in:focus-visible{outline:none}") == ["PASS"]',
    )
    expect(
        v("/* focus-ok: active option draws it */ .l:focus-visible{outline:none}") == ["EXEMPT"],
        'v("/* focus-ok: active option draws it */ .l:focus-visible{outline:none}") == ["EXEMPT"]',
    )
    expect(
        v(".mouse:focus:not(:focus-visible){outline:0}") == [],
        'v(".mouse:focus:not(:focus-visible){outline:0}") == []',
    )
    expect(
        v(".in::-webkit-datetime-edit-day-field:focus{outline:none}") == [],
        'v(".in::-webkit-datetime-edit-day-field:focus{outline:none}") == []',
    )
    expect(
        v(".nest{padding:0;&:focus{outline:none}}") == ["FAIL"],
        'v(".nest{padding:0;&:focus{outline:none}}") == ["FAIL"]',
    )
    expect(
        v(".nest{padding:0;&:focus{outline:none}&:focus-visible{outline:2px solid red}}")[0]
        == "PASS",
        'v(".nest{padding:0;&:focus{outline:none}&:focus-visible{outline:2px solid red}}")[0] == "PASS"',
    )
    expect(
        v(".bs{all:unset}.bs:focus-visible{box-shadow:0 0 0 2px red}") == ["FAIL"],
        'v(".bs{all:unset}.bs:focus-visible{box-shadow:0 0 0 2px red}") == ["FAIL"]',
    )
    expect(
        v(".ok{all:unset}.ok:focus-visible{outline:2px solid blue}") == ["PASS"],
        'v(".ok{all:unset}.ok:focus-visible{outline:2px solid blue}") == ["PASS"]',
    )
    expect(
        v(".ring:focus-visible{outline:none}.ring:focus-visible::after{outline:2px solid blue}")
        == ["PASS"],
        'v( ".ring:focus-visible{outline:none}.ring:focus-visible::after{outline:2px solid blue}" ) == ["PASS"]',
    )
    expect(
        v("@media (min-width:1px){.m:focus{outline:none}}") == ["FAIL"],
        'v("@media (min-width:1px){.m:focus{outline:none}}") == ["FAIL"]',
    )
    here = Path(__file__).resolve().parent / "fixtures" / "a11y" / "focus_outline"
    expect(here.is_dir(), f"fixtures missing: {here}")
    for fx in sorted(here.iterdir()):
        css = fx.read_text()
        if fx.suffix == ".html":
            css = "\n".join(re.findall(r"<style[^>]*>(.*?)</style>", css, flags=re.DOTALL))
        rows = [r[0] for r in check(css, fx.name)]
        if fx.name.startswith("fail_"):
            expect("FAIL" in rows, f"{fx.name}: expected a FAIL row, got {rows}")
        else:
            expect(
                rows and "FAIL" not in rows, f"{fx.name}: expected PASS or EXEMPT only, got {rows}"
            )
    print("self-test ok")
    return 0


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("dirs", nargs="*", type=Path, help="source directories to scan")
    ap.add_argument("--format", choices=("text", "json"), default="text")
    ap.add_argument(
        "--self-test", action="store_true", help="run the built-in checks over the fixtures"
    )
    args = ap.parse_args(argv)
    if args.self_test:
        return self_test()
    if not args.dirs:
        ap.error("give at least one DIR, or --self-test")
    rows = []
    for root in args.dirs:
        if not root.exists():
            print(f"error: no such path: {root}", file=sys.stderr)
            return 2
        for p, css in files(root):
            rows.extend(check(css, str(p)))
    if args.format == "json":
        print(
            json.dumps(
                [
                    dict(zip(("verdict", "where", "selector", "evidence"), r, strict=False))
                    for r in rows
                ],
                indent=1,
            )
        )
    else:
        for r in rows:
            print(*r, sep="\t")
    return 1 if any(r[0] == "FAIL" for r in rows) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
