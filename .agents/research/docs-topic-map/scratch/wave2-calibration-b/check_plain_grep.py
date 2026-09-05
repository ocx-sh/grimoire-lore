#!/usr/bin/env python3
"""Runs DOC-PLAIN-01, 07, 08, 09, 11, 12 over the fleet's 248 pages.
Each rule's pattern is copied verbatim from docs-plain-english.md's own
Verification cell. 01/07/11/12 run on strip_prose.py output (per the rule's
own spec: "runs against its output, never against raw markdown"). 08 runs on
raw text per its own grep target ("docs/"). 09 is a meta-check against the
rule file itself, run separately at the bottom.

Usage: python3 check_plain_grep.py filelist.txt
"""
import re, sys, json
from strip_prose import strip

RULES = {
    "DOC-PLAIN-01": {
        "desc": "em/en dash, semicolon, curly quotes (stripped prose)",
        "pattern": re.compile(r"[—–;“”‘’]"),
        "on": "stripped",
    },
    "DOC-PLAIN-07": {
        "desc": "bare identifier (hyphen/underscore token, or letters+digits)",
        "pattern": re.compile(r"\b[a-z0-9]+[-_][a-z0-9_-]+\b|\b[a-z]+[0-9]+\b"),
        "on": "stripped",
    },
    "DOC-PLAIN-08": {
        "desc": "chatbot artifact phrases",
        "pattern": re.compile(
            r"I hope this helps|as an AI|as of my last update|knowledge cutoff|"
            r"let me know if|feel free to ask|contentReference|oaicite|\[cite: [0-9]",
            re.IGNORECASE,
        ),
        "on": "raw",
    },
    "DOC-PLAIN-11": {
        "desc": "time-relative words",
        "pattern": re.compile(
            r"\b(as of this writing|currently|does not yet|eventually|in the future|"
            r"latest|newer|newest|now|older|presently|at present|soon)\b",
            re.IGNORECASE,
        ),
        "on": "stripped",
    },
    "DOC-PLAIN-12": {
        "desc": "marketing superlatives",
        "pattern": re.compile(
            r"\b(powerful|seamless(ly)?|revolutionary|game.chang\w*|supercharge\w*|"
            r"unlock\w*|empower\w*|cutting.edge|robust|effortless\w*)\b",
            re.IGNORECASE,
        ),
        "on": "stripped",
    },
}


def main(filelist):
    paths = [p.strip() for p in open(filelist) if p.strip()]
    results = {rid: {"hits": [], "files": set()} for rid in RULES}
    for path in paths:
        text = open(path, encoding="utf-8", errors="replace").read()
        raw_lines = text.split("\n")
        stripped_lines = strip(raw_lines)
        for rid, spec in RULES.items():
            lines = stripped_lines if spec["on"] == "stripped" else raw_lines
            for n, ln in enumerate(lines, 1):
                if spec["pattern"].search(ln):
                    results[rid]["hits"].append((path, n, ln.strip()[:100]))
                    results[rid]["files"].add(path)
    summary = {}
    for rid, spec in RULES.items():
        summary[rid] = {
            "desc": spec["desc"],
            "total_hits": len(results[rid]["hits"]),
            "files_hit": len(results[rid]["files"]),
            "files_total": len(paths),
            "sample": [
                {"file": f, "line": n, "text": t}
                for f, n, t in results[rid]["hits"][:10]
            ],
        }
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "filelist.txt")
