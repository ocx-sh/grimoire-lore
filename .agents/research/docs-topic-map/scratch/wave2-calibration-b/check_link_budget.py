#!/usr/bin/env python3
"""DOC-PLAIN-16 (link/explain-once budget, >15-link cap) and DOC-NAV-12
(stub/short-page link count: zero or 2+ links fails, under 150 prose words)
over the fleet's 248 pages. Both need a link inventory and a prose-word count,
so one script does both per docs-plain-english.md and docs-navigation-search.md
Verification cells.
"""
import re, sys, json
from strip_prose import strip

LINK_INLINE_RE = re.compile(r"(?<!\!)\[([^\]]*)\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)")
LINK_REF_USE_RE = re.compile(r"(?<!\!)\[([^\]]*)\]\[([^\]]*)\]")
WORD_RE = re.compile(r"[A-Za-z']+")


def prose_word_count(text):
    stripped = "\n".join(strip(text.split("\n")))
    return len(WORD_RE.findall(stripped))


def link_inventory(text):
    links = []
    for m in LINK_INLINE_RE.finditer(text):
        links.append((m.group(1).strip().lower(), m.group(2).strip().lower()))
    for m in LINK_REF_USE_RE.finditer(text):
        links.append((m.group(1).strip().lower(), (m.group(2) or m.group(1)).strip().lower()))
    return links


def main(filelist):
    paths = [p.strip() for p in open(filelist) if p.strip()]
    reuse_hits = []
    over15 = []
    nav12_zero = []
    nav12_two_plus = []
    for path in paths:
        text = open(path, encoding="utf-8", errors="replace").read()
        links = link_inventory(text)
        seen = {}
        for text_norm, target_norm in links:
            key = (text_norm, target_norm)
            seen[key] = seen.get(key, 0) + 1
        dupes = {k: v for k, v in seen.items() if v > 1}
        if dupes:
            reuse_hits.append((path, dupes))
        if len(links) > 15:
            over15.append((path, len(links)))
        words = prose_word_count(text)
        if words < 150:
            if len(links) == 0:
                nav12_zero.append((path, words))
            elif len(links) >= 2:
                nav12_two_plus.append((path, words, len(links)))
    print(json.dumps({
        "DOC-PLAIN-16-reuse": {
            "desc": "same link text+target used twice or more on one page",
            "pages_flagged": len(reuse_hits),
            "files_total": len(paths),
            "sample": [
                {"file": f, "duplicated": [f"{t!r} -> {u!r} x{c}" for (t, u), c in list(d.items())[:3]]}
                for f, d in reuse_hits[:10]
            ],
        },
        "DOC-PLAIN-16-cap15": {
            "desc": "non-footer link count > 15",
            "pages_flagged": len(over15),
            "files_total": len(paths),
            "sample": [{"file": f, "links": n} for f, n in sorted(over15, key=lambda x: -x[1])[:10]],
        },
        "DOC-NAV-12": {
            "desc": "<150 prose-word page with 0 links or >=2 links (should be exactly 1)",
            "zero_link_stubs": len(nav12_zero),
            "two_plus_link_stubs": len(nav12_two_plus),
            "files_total": len(paths),
            "sample_zero": [{"file": f, "words": w} for f, w in nav12_zero[:10]],
            "sample_two_plus": [{"file": f, "words": w, "links": n} for f, w, n in nav12_two_plus[:10]],
        },
    }, indent=2))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "filelist.txt")
