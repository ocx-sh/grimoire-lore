#!/usr/bin/env python3
"""Runs DOC-PLAIN checks (worker B's share) over a file list and prints a
per-rule hit count, per-surface breakdown, and sampled lines. One file,
several functions -- ponytail: no framework, no per-rule module.

Usage: python3 plain_checks.py <filelist.txt>
"""
import re
import sys
import statistics
from collections import defaultdict
from strip_prose import strip

VOWEL_GROUPS_RE = re.compile(r"[aeiouyAEIOUY]+")
WORD_RE = re.compile(r"[A-Za-z']+")
SENT_SPLIT_RE = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9\"'(])")

RULES = {
    "PLAIN-01": re.compile(r"[—–;“”‘’]"),
    "PLAIN-08": re.compile(
        r"I hope this helps|as an AI|as of my last update|knowledge cutoff|"
        r"let me know if|feel free to ask|contentReference|oaicite|\[cite: [0-9]",
        re.IGNORECASE,
    ),
    "PLAIN-11": re.compile(
        r"\b(as of this writing|currently|does not yet|eventually|"
        r"in the future|latest|newer|newest|now|older|presently|"
        r"at present|soon)\b",
        re.IGNORECASE,
    ),
    "PLAIN-12": re.compile(
        r"\b(powerful|seamlessly?|revolutionary|game.chang\w*|supercharge\w*|"
        r"unlock\w*|empower\w*|cutting.edge|robust|effortless\w*)\b",
        re.IGNORECASE,
    ),
}

DENSITY_WORDS = re.compile(
    r"\b(delve|delves|delving|tapestry|testament|boasts|leverage|leverages|"
    r"leveraging|robust|seamless|seamlessly|holistic|paradigm|synerg\w*|"
    r"unlock\w*|elevate\w*|foster\w*|underscore\w*)\b",
    re.IGNORECASE,
)


def count_syllables(word):
    word = word.lower()
    n = len(VOWEL_GROUPS_RE.findall(word))
    if word.endswith("e") and n > 1 and not word.endswith("le"):
        n -= 1
    return max(n, 1)


def split_sentences(prose):
    sentences = []
    for b in re.split(r"\n\s*\n", prose):
        b = " ".join(b.split())
        if not b:
            continue
        parts = [p for p in SENT_SPLIT_RE.split(b) if p.strip()]
        sentences.extend(parts if parts else [b])
    return sentences


def flesch(text):
    sentences = split_sentences(text)
    words = WORD_RE.findall(text)
    if not words or not sentences:
        return None
    n_syll = sum(count_syllables(w) for w in words)
    return round(206.835 - 1.015 * (len(words) / len(sentences)) - 84.6 * (n_syll / len(words)), 1)


def long_sentences(text, limit=25):
    hits = []
    for s in split_sentences(text):
        wc = len(WORD_RE.findall(s))
        if wc > limit:
            hits.append((wc, s[:100]))
    return hits


def paragraphs_over(text, limit=5):
    hits = []
    for block in re.split(r"\n\s*\n", text):
        block = " ".join(block.split())
        if not block:
            continue
        n = len(split_sentences(block))
        if n > limit:
            hits.append((n, block[:80]))
    return hits


def surface_of(path):
    # First path segment is the repo == the "surface" for this fleet.
    return path.split("/")[0]


def main():
    filelist = sys.argv[1]
    with open(filelist) as f:
        files = [l.strip() for l in f if l.strip()]

    per_rule_pages = defaultdict(set)
    per_rule_hits = defaultdict(int)
    per_rule_samples = defaultdict(list)
    per_surface_rule_pages = defaultdict(lambda: defaultdict(set))

    flesch_scores = []
    long_sent_pages = 0
    long_sent_hits = 0
    long_sent_samples = []
    para_pages = 0
    para_hits = 0
    density_per_1k = []
    words_total = 0

    for path in files:
        try:
            with open(path, encoding="utf-8", errors="replace") as fh:
                raw = fh.read()
        except OSError:
            continue
        stripped = strip(raw)
        surf = surface_of(path)

        for rule, pat in RULES.items():
            n = len(pat.findall(stripped))
            if n:
                per_rule_pages[rule].add(path)
                per_rule_hits[rule] += n
                per_surface_rule_pages[rule][surf].add(path)
                if len(per_rule_samples[rule]) < 10:
                    for m in pat.finditer(stripped):
                        line_no = stripped.count("\n", 0, m.start()) + 1
                        per_rule_samples[rule].append(f"{path}:{line_no}: {m.group(0)!r}")
                        if len(per_rule_samples[rule]) >= 10:
                            break

        words = WORD_RE.findall(stripped)
        words_total += len(words)
        fs = flesch(stripped)
        if fs is not None:
            flesch_scores.append((path, fs))

        ls = long_sentences(stripped)
        if ls:
            long_sent_pages += 1
            long_sent_hits += len(ls)
            per_surface_rule_pages["PLAIN-02"][surf].add(path)
            for wc, snippet in ls[:2]:
                if len(long_sent_samples) < 10:
                    long_sent_samples.append(f"{path} ({wc}w): {snippet}")

        pv = paragraphs_over(stripped)
        if pv:
            para_pages += 1
            para_hits += len(pv)
            per_surface_rule_pages["PLAIN-03"][surf].add(path)

        if words:
            d = len(DENSITY_WORDS.findall(stripped))
            density_per_1k.append((path, round(d * 1000 / len(words), 2), d))

    print(f"Files scanned: {len(files)}, total prose words: {words_total}")
    print()

    for rule in RULES:
        print(f"=== DOC-{rule} ===")
        print(f"pages with hits: {len(per_rule_pages[rule])}/{len(files)}  raw hits: {per_rule_hits[rule]}")
        by_surf = {s: len(v) for s, v in per_surface_rule_pages[rule].items()}
        print(f"by surface: {dict(sorted(by_surf.items(), key=lambda kv: -kv[1]))}")
        for s in per_rule_samples[rule][:10]:
            print(" sample:", s)
        print()

    print("=== DOC-PLAIN-02 (long sentences >25w) ===")
    print(f"pages with hits: {long_sent_pages}/{len(files)}  raw hits: {long_sent_hits}")
    by_surf = {s: len(v) for s, v in per_surface_rule_pages["PLAIN-02"].items()}
    print(f"by surface: {dict(sorted(by_surf.items(), key=lambda kv: -kv[1]))}")
    for s in long_sent_samples:
        print(" sample:", s)
    print()

    print("=== DOC-PLAIN-03 (paragraphs >5 sentences) ===")
    print(f"pages with hits: {para_pages}/{len(files)}  raw hits: {para_hits}")
    by_surf = {s: len(v) for s, v in per_surface_rule_pages["PLAIN-03"].items()}
    print(f"by surface: {dict(sorted(by_surf.items(), key=lambda kv: -kv[1]))}")
    print()

    print("=== DOC-PLAIN-05 (Flesch Reading Ease) ===")
    vals = [v for _, v in flesch_scores]
    print(f"pages scored: {len(vals)}  median: {statistics.median(vals):.1f}  "
          f"mean: {statistics.mean(vals):.1f}")
    below50 = [(p, v) for p, v in flesch_scores if v < 50]
    print(f"pages below floor 50: {len(below50)}/{len(vals)} ({100*len(below50)/len(vals):.1f}%)")
    for p, v in sorted(below50, key=lambda kv: kv[1])[:10]:
        print(f" sample below floor: {p} = {v}")
    print()

    print("=== DOC-PLAIN-10 (tell density per 1000 words) ===")
    nonzero = [d for d in density_per_1k if d[2] > 0]
    print(f"pages with >=1 hit: {len(nonzero)}/{len(density_per_1k)}")
    over3 = [d for d in density_per_1k if d[1] > 3]
    print(f"pages over density 3: {len(over3)}/{len(density_per_1k)}")
    for p, dens, n in sorted(nonzero, key=lambda kv: -kv[1])[:10]:
        print(f" sample: {p} density={dens} raw={n}")


if __name__ == "__main__":
    main()
