#!/usr/bin/env python3
"""DOC-PLAIN-14 reading heuristic (no Vale in this environment, per the rule's
own fallback): a heading with 2+ capitalised words, none a recognised proper
noun/identifier/acronym, reads as Title Case. Strips inline code and trailing
{#anchor} before judging so real identifiers in backticks are not counted.
"""
import re, sys, json

HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)$")
INLINE = re.compile(r"`[^`\n]+`")
ANCHOR = re.compile(r"\{#[\w-]+\}\s*$")
WORD_RE = re.compile(r"[A-Za-z][A-Za-z'-]*")
# common acronyms/proper nouns seen in this fleet's headings -- a real
# deployment would need a maintained allowlist; this is the "no Vale" fallback
# the rule itself specifies, and its point is to show how noisy that fallback is.
ACRONYMS = {"OCX", "API", "CLI", "CI", "CD", "URL", "SDK", "TUF", "MCP", "SBOM",
            "OCI", "FAQ", "ID", "PTY", "WCAG", "GA4", "HTTP", "HTTPS", "JSON",
            "YAML", "TOML", "CSS", "HTML", "DNS", "TLS", "SSH", "PATH", "OS"}


def is_capitalised_word(w):
    return w[0].isupper() and w not in ACRONYMS and not w.isupper() and len(w) > 1


def main(filelist):
    paths = [p.strip() for p in open(filelist) if p.strip()]
    hits = []
    total_headings = 0
    for path in paths:
        for n, ln in enumerate(open(path, encoding="utf-8", errors="replace"), 1):
            m = HEADING_RE.match(ln)
            if not m:
                continue
            total_headings += 1
            text = ANCHOR.sub("", INLINE.sub(" ", m.group(2))).strip()
            words = WORD_RE.findall(text)
            if not words:
                continue
            # first word's capitalisation is expected (sentence case); judge words[1:]
            cap_count = sum(1 for w in words[1:] if is_capitalised_word(w))
            if cap_count >= 2:
                hits.append((path, n, text))
    print(json.dumps({
        "DOC-PLAIN-14": {
            "desc": "heading heuristic: 2+ capitalised non-leading words = Title Case",
            "total_headings_scanned": total_headings,
            "flagged": len(hits),
            "files_total": len(paths),
            "sample": [{"file": f, "line": n, "heading": t} for f, n, t in hits[:15]],
        }
    }, indent=2))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "filelist.txt")
