#!/usr/bin/env python3
"""DOC-NAV-05 (H5/H6 cap), DOC-NAV-06 (>4000 prose words), DOC-NAV-09 (role-noun
grep on H1s), DOC-NAV-11 (dead search-relaxation keys in generator config) over
the fleet's 248 pages / repo configs. Word counts reuse strip_prose.py, exactly
as docs-navigation-search.md's own Verification cells specify.
"""
import re, sys, json, glob, os
from strip_prose import strip

WORD_RE = re.compile(r"[A-Za-z']+")
H56_RE = re.compile(r"^#{5,6} ")
H1_RE = re.compile(r"^#\s+(.*)$")
ROLE_NOUN_RE = re.compile(r"\b(developer|admin|beginner|advanced|professional|workforce)s?\b", re.IGNORECASE)


def prose_words(text):
    return len(WORD_RE.findall("\n".join(strip(text.split("\n")))))


def main(filelist):
    paths = [p.strip() for p in open(filelist) if p.strip()]
    h56_hits, over4000, role_noun_hits = [], [], []
    for path in paths:
        text = open(path, encoding="utf-8", errors="replace").read()
        lines = text.split("\n")
        h56 = sum(1 for ln in lines if H56_RE.match(ln))
        if h56:
            h56_hits.append((path, h56))
        words = prose_words(text)
        if words > 4000:
            over4000.append((path, words))
        for ln in lines:
            m = H1_RE.match(ln)
            if m and ROLE_NOUN_RE.search(m.group(1)):
                role_noun_hits.append((path, m.group(1).strip()))

    # DOC-NAV-11: dead search-relaxation keys, per generator config, repo-level
    configs = []
    for pat in ("*/mkdocs.yml", "*/.vitepress/config.*", "*/book.toml", "*/docs/book.toml"):
        configs.extend(glob.glob(f"/home/mherwig/dev/{pat}"))
    dead_key_hits = []
    DEAD_KEYS = re.compile(r"\b(synonyms|removeWordsIfNoResults|optionalWords|ignorePlurals|removeStopWords)\b")
    for c in configs:
        try:
            t = open(c, encoding="utf-8", errors="replace").read()
        except OSError:
            continue
        if DEAD_KEYS.search(t):
            dead_key_hits.append(c)

    print(json.dumps({
        "DOC-NAV-05": {
            "desc": "H5/H6 heading present (cap at H4 unless reference+structural test)",
            "pages_flagged": len(h56_hits),
            "files_total": len(paths),
            "sample": [{"file": f, "h56_count": n} for f, n in h56_hits[:10]],
        },
        "DOC-NAV-06": {
            "desc": "non-reference page > 4000 prose words",
            "pages_flagged": len(over4000),
            "files_total": len(paths),
            "sample": sorted([{"file": f, "words": w} for f, w in over4000], key=lambda x: -x["words"])[:10],
        },
        "DOC-NAV-09": {
            "desc": "H1 containing a role noun (developer/admin/beginner/...)",
            "pages_flagged": len(role_noun_hits),
            "files_total": len(paths),
            "sample": [{"file": f, "h1": h} for f, h in role_noun_hits[:10]],
        },
        "DOC-NAV-11": {
            "desc": "dead search-relaxation config key present in a generator config",
            "configs_scanned": len(configs),
            "configs_flagged": len(dead_key_hits),
            "sample": dead_key_hits[:10],
        },
    }, indent=2))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "filelist.txt")
