#!/usr/bin/env python3
"""Deep dive on DOC-PLAIN-02: does the sentence splitter / word counter
mishandle inline links and code spans? For every flagged long sentence,
recompute word count with markdown link targets removed and report how many
flip from >25 to <=25, i.e. are false positives caused by counting URL path
segments as words.
"""
import re
import sys
from strip_prose import strip

WORD_RE = re.compile(r"[A-Za-z']+")
SENT_SPLIT_RE = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9\"'(])")
MD_LINK_RE = re.compile(r"\[([^\]]*)\]\(([^)]+)\)")
INLINE_CODE_RAW_RE = re.compile(r"`[^`\n]+`")


def split_sentences(prose):
    sentences = []
    for b in re.split(r"\n\s*\n", prose):
        b = " ".join(b.split())
        if not b:
            continue
        parts = [p for p in SENT_SPLIT_RE.split(b) if p.strip()]
        sentences.extend(parts if parts else [b])
    return sentences


def main():
    filelist = sys.argv[1]
    with open(filelist) as f:
        files = [l.strip() for l in f if l.strip()]

    total_long = 0
    fp_from_link_urls = 0
    fp_samples = []
    code_span_effect = 0
    code_samples = []

    for path in files:
        try:
            with open(path, encoding="utf-8", errors="replace") as fh:
                raw = fh.read()
        except OSError:
            continue
        stripped = strip(raw)
        for s in split_sentences(stripped):
            wc = len(WORD_RE.findall(s))
            if wc <= 25:
                continue
            total_long += 1
            # Recompute word count with markdown link URL targets removed
            # (keep the visible link text, drop the (url) part) -- this is
            # what a reader actually reads, versus what the naive word-count
            # regex counts today.
            s_no_url = MD_LINK_RE.sub(lambda m: f"[{m.group(1)}]", s)
            wc_no_url = len(WORD_RE.findall(s_no_url))
            if wc_no_url <= 25 and wc_no_url < wc:
                fp_from_link_urls += 1
                if len(fp_samples) < 10:
                    fp_samples.append((path, wc, wc_no_url, s[:160]))

    print(f"Total sentences flagged >25 words: {total_long}")
    print(f"Of those, word count driven under 25 once URL targets are excluded: {fp_from_link_urls}")
    print()
    for path, wc, wc2, snippet in fp_samples:
        print(f"{path}  raw_wc={wc} wc_without_url_words={wc2}")
        print(f"  {snippet}")


if __name__ == "__main__":
    main()
