#!/usr/bin/env python3
"""DOC-PLAIN-10: vocabulary-tell density per 1000 words, stripped prose.
Wordlist: the rule names no fixed list (only "delve" as an example). Wikipedia's
"Signs of AI writing" essay (docs-machine-readers-and-prior-art.md key sources)
is the cited ancestor for this whole family's tell taxonomy, so this uses its
most commonly cited single-word tells as the starting set, matching the class
DOC-PLAIN-10 targets: "aggregate-only" tells, ordinary in isolation.
"""
import re, sys, json
from strip_prose import strip

WORDS_RE = re.compile(r"[A-Za-z']+")
TELLS = [
    "delve", "delves", "delving",
    "tapestry", "testament",
    "boast", "boasts", "boasting",
    "realm", "realms",
    "underscore", "underscores", "underscoring",
    "leverage", "leverages", "leveraging",
    "myriad", "plethora",
    "furthermore", "moreover",
    "paramount", "pivotal",
    "invaluable", "intricate",
]
TELL_RE = re.compile(r"\b(" + "|".join(TELLS) + r")\b", re.IGNORECASE)
THRESHOLD = 3.0  # per 1000 words, the rule's own labelled-uncalibrated default


def main(filelist):
    paths = [p.strip() for p in open(filelist) if p.strip()]
    rows = []
    for path in paths:
        prose = "\n".join(strip(open(path, encoding="utf-8", errors="replace").read().split("\n")))
        words = WORDS_RE.findall(prose)
        n_words = len(words)
        if n_words == 0:
            continue
        hits = TELL_RE.findall(prose)
        density = round(1000 * len(hits) / n_words, 2)
        if hits:
            rows.append((path, density, n_words, len(hits), sorted(set(w.lower() for w in hits))))
    rows.sort(key=lambda r: -r[1])
    over = [r for r in rows if r[1] >= THRESHOLD]
    print(json.dumps({
        "DOC-PLAIN-10": {
            "desc": f"tell-word density >= {THRESHOLD}/1000 words",
            "pages_with_any_hit": len(rows),
            "pages_over_threshold": len(over),
            "files_total": len(paths),
            "top10_by_density": [
                {"file": f, "density": d, "words": n, "hits": h, "terms": t}
                for f, d, n, h, t in rows[:10]
            ],
        }
    }, indent=2))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "filelist.txt")
