#!/usr/bin/env python3
"""DOC-PLAIN-02 (>25-word sentence) and DOC-PLAIN-03 (>5-sentence paragraph),
run over the fleet's 248 pages on strip_prose.py output, exactly as specified
in docs-plain-english.md's Verification cells.
"""
import re, sys, json
from strip_prose import strip

SPLIT = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9\"'(])")
WORD = re.compile(r"\S+")
LIMIT = 25
PARA_LIMIT = 5


def main(filelist):
    paths = [p.strip() for p in open(filelist) if p.strip()]
    long_sent = []
    long_para = []
    for path in paths:
        prose = "\n".join(strip(open(path, encoding="utf-8", errors="replace").read().split("\n")))
        for block in re.split(r"\n\s*\n", prose):
            block = " ".join(block.split())
            if not block:
                continue
            sents = [s for s in SPLIT.split(block) if s.strip()]
            if not sents:
                sents = [block]
            if len(sents) > PARA_LIMIT:
                long_para.append((path, len(sents), block[:100]))
            for s in sents:
                n = len(WORD.findall(s))
                if n > LIMIT:
                    long_sent.append((path, n, s[:120]))
    print(json.dumps({
        "DOC-PLAIN-02": {
            "desc": ">25-word sentence",
            "total_hits": len(long_sent),
            "files_hit": len({p for p, *_ in long_sent}),
            "files_total": len(paths),
            "sample": [{"file": p, "words": n, "text": t} for p, n, t in long_sent[:10]],
        },
        "DOC-PLAIN-03": {
            "desc": ">5-sentence paragraph",
            "total_hits": len(long_para),
            "files_hit": len({p for p, *_ in long_para}),
            "files_total": len(paths),
            "sample": [{"file": p, "sentences": n, "text": t} for p, n, t in long_para[:10]],
        },
    }, indent=2))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "filelist.txt")
