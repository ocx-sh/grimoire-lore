#!/usr/bin/env python3
"""mdBook preprocessor: remove a leading YAML frontmatter block from every chapter."""
import json, re, sys

FM = re.compile(r"\A---\r?\n.*?\r?\n---[ \t]*\r?\n?", re.S)

def walk(items):
    for it in items:
        ch = it.get("Chapter")
        if ch:
            ch["content"] = FM.sub("", ch["content"], count=1)
            walk(ch.get("sub_items", []))

if len(sys.argv) > 2 and sys.argv[1] == "supports":
    sys.exit(0)                      # support every renderer
ctx, book = json.load(sys.stdin)
walk(book.get("items", book.get("sections", [])))
json.dump(book, sys.stdout)
