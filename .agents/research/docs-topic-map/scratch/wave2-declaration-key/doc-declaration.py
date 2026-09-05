#!/usr/bin/env python3
"""Read the page declaration from markdown source. Generator independent.

Usage: doc-declaration.py [--list] FILE...
Exit 1 when any file is missing or malformed. --list prints path<TAB>type<TAB>tier.
"""
import re, sys

TYPES = {"tutorial", "how-to", "reference", "explanation", "troubleshooting",
         "runbook", "landing", "changelog", "readme"}
TIERS = {"first-steps", "everyday", "integration"}
TIER_REQUIRED = {"tutorial", "how-to", "landing"}
FM = re.compile(r"\A---[ \t]*\r?\n(.*?)\r?\n---[ \t]*(?:\r?\n|\Z)", re.S)
KV = re.compile(r"^(doc_type|doc_tier):[ \t]*([\w-]+)[ \t]*$", re.M)

def read(path):
    m = FM.match(open(path, encoding="utf-8", errors="replace").read())
    return dict(KV.findall(m.group(1))) if m else {}

def main(argv):
    listing = "--list" in argv
    bad = 0
    for path in [a for a in argv if not a.startswith("--")]:
        d = read(path)
        t, tier = d.get("doc_type"), d.get("doc_tier")
        if listing:
            print(f"{path}\t{t or '-'}\t{tier or '-'}"); continue
        if t is None:
            print(f"{path}:1: no doc_type in front matter"); bad += 1; continue
        if t not in TYPES:
            print(f"{path}:1: doc_type {t!r} not in {sorted(TYPES)}"); bad += 1
        if t in TIER_REQUIRED and tier not in TIERS:
            print(f"{path}:1: doc_type {t!r} requires doc_tier in {sorted(TIERS)}"); bad += 1
    return 1 if bad else 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
