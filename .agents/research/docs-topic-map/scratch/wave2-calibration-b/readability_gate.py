#!/usr/bin/env python3
"""Readability gate: Flesch Reading Ease per page, floor by declared page type.

No third-party deps. Reuses the fleet's own stripping approach
(docs-shape.md §3): drop frontmatter, code fences, ATX heading lines and
table rows, then remove inline code spans, before scoring. The score is
computed on the STRIPPED prose, never on raw file text.

Usage: python3 readability_gate.py <file.md> [<file.md> ...]
Exit code: 0 if every prose-type page clears its floor, 1 otherwise.
"""
import re
import sys

FRONTMATTER_RE = re.compile(r"\A---\n(.*?)\n---\n", re.DOTALL)
CODE_FENCE_RE = re.compile(r"^\s*(```|~~~)")
ATX_HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)")
INLINE_CODE_RE = re.compile(r"`[^`\n]+`")
TABLE_ROW_RE = re.compile(r"^\s*\|.*\|\s*$|^\s*\|?[\s:|-]+\|?\s*$")
SENT_SPLIT_RE = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9\"'(])")
WORD_RE = re.compile(r"[A-Za-z']+")
VOWEL_GROUPS_RE = re.compile(r"[aeiouyAEIOUY]+")
TYPE_KEY_RE = re.compile(r"^\s*(?:type|doc_type)\s*:\s*[\"']?([\w-]+)[\"']?\s*$", re.MULTILINE)

# Page types exempt from the Flesch floor: identifier-dense by nature (flags,
# fields, error codes). They still get the sentence-length cap (a separate
# check, not in this script) but not a syllable-based score.
EXEMPT_TYPES = {"reference", "troubleshooting"}

# Floor for every other declared type. One number, not five, because nothing
# in the sources justifies five different asserted targets -- see the
# research doc's Normative guidance §1. Calibrated to the fleet's own
# measured median (51.6), not an aspirational "plain English" 60.
FLOOR = 50.0


def count_syllables(word):
    word = word.lower()
    n = len(VOWEL_GROUPS_RE.findall(word))
    if word.endswith("e") and n > 1 and not word.endswith("le"):
        n -= 1
    return max(n, 1)


def declared_type(text):
    m = FRONTMATTER_RE.match(text)
    if not m:
        return None
    tm = TYPE_KEY_RE.search(m.group(1))
    return tm.group(1) if tm else None


def strip_to_prose(text):
    text = FRONTMATTER_RE.sub("", text)
    out, in_fence = [], False
    for ln in text.split("\n"):
        if CODE_FENCE_RE.match(ln):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        if ATX_HEADING_RE.match(ln):
            out.append("")
            continue
        if TABLE_ROW_RE.match(ln):
            continue
        out.append(ln)
    return INLINE_CODE_RE.sub(" ", "\n".join(out))


def flesch_reading_ease(prose):
    sentences = []
    for block in re.split(r"\n\s*\n", prose):
        block = " ".join(block.split())
        if not block:
            continue
        parts = [p for p in SENT_SPLIT_RE.split(block) if p.strip()]
        sentences.extend(parts if parts else [block])
    words = WORD_RE.findall(prose)
    if not words or not sentences:
        return None
    syllables = sum(count_syllables(w) for w in words)
    return round(
        206.835 - 1.015 * (len(words) / len(sentences)) - 84.6 * (syllables / len(words)), 1
    )


def main(paths):
    failed = False
    for path in paths:
        with open(path, encoding="utf-8") as fh:
            raw = fh.read()
        ptype = declared_type(raw)
        if ptype in EXEMPT_TYPES:
            print(f"SKIP  {path}  (type={ptype}, exempt from Flesch floor)")
            continue
        score = flesch_reading_ease(strip_to_prose(raw))
        if score is None:
            print(f"SKIP  {path}  (no scoreable prose)")
            continue
        if score < FLOOR:
            failed = True
            print(f"WARN  {path}  Flesch {score} < floor {FLOOR} (type={ptype or 'undeclared'})")
        else:
            print(f"OK    {path}  Flesch {score} (type={ptype or 'undeclared'})")
    return 1 if failed else 0


def _demo():
    # ponytail: smallest runnable check, not a test framework.
    easy = "This is a short page. It has small words. Read it fast.\n"
    hard = ("Notwithstanding the aforementioned considerations, the "
            "implementation necessitates comprehensive orchestration of "
            "interdependent asynchronous subsystems.\n")
    assert flesch_reading_ease(easy) > FLOOR
    assert flesch_reading_ease(hard) < FLOOR
    ref_fm = "---\ntype: reference\n---\nsha256 --flag-name OCIImageIndex.\n"
    assert declared_type(ref_fm) == "reference"
    print("self-check OK")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--self-check":
        _demo()
        sys.exit(0)
    sys.exit(main(sys.argv[1:]))
