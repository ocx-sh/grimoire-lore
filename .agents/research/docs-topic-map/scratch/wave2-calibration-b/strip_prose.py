#!/usr/bin/env python3
"""checks/strip_prose.py -- reimplementation matching the severity ledger's
description: blanks frontmatter, fenced code, ATX headings, table rows,
reference-link definitions and inline code spans, while preserving line
numbers (blanked lines become empty strings, not removed). Prints stripped
text to stdout, or import strip() from another script.
"""
import re
import sys

FRONTMATTER_RE = re.compile(r"\A---\n.*?\n---\n", re.DOTALL)
CODE_FENCE_RE = re.compile(r"^\s*(```|~~~)")
ATX_HEADING_RE = re.compile(r"^#{1,6}\s+")
TABLE_ROW_RE = re.compile(r"^\s*\|.*\|\s*$|^\s*\|?[\s:|-]+\|?\s*$")
REF_LINK_DEF_RE = re.compile(r"^\s*\[[^\]]+\]:\s*\S+")
INLINE_CODE_RE = re.compile(r"`[^`\n]+`")


def strip(text: str) -> str:
    # Blank frontmatter but keep its line count so downstream line numbers match.
    m = FRONTMATTER_RE.match(text)
    if m:
        n = m.group(0).count("\n")
        text = ("\n" * n) + text[m.end():]
    out = []
    in_fence = False
    for ln in text.split("\n"):
        if CODE_FENCE_RE.match(ln):
            in_fence = not in_fence
            out.append("")
            continue
        if in_fence:
            out.append("")
            continue
        if ATX_HEADING_RE.match(ln):
            out.append("")
            continue
        if TABLE_ROW_RE.match(ln):
            out.append("")
            continue
        if REF_LINK_DEF_RE.match(ln):
            out.append("")
            continue
        out.append(INLINE_CODE_RE.sub(" ", ln))
    return "\n".join(out)


if __name__ == "__main__":
    path = sys.argv[1]
    with open(path, encoding="utf-8", errors="replace") as f:
        sys.stdout.write(strip(f.read()))
