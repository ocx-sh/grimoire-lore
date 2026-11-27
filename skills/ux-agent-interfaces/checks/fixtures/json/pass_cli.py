#!/usr/bin/env python3
"""Fixture CLI that meets UX-AGENT-01 to 04 and 09: the format flag works in any position."""

import json
import sys

args = sys.argv[1:]
machine = False
rest = []
i = 0
while i < len(args):
    if args[i] == "--format" and i + 1 < len(args):
        machine = args[i + 1] == "json"
        i += 2
        continue
    if args[i] == "--json":
        machine = True
    else:
        rest.append(args[i])
    i += 1


def fail(code, slug, message, retryable=False):
    doc = {
        "schema_version": 1,
        "error": {
            "code": slug,
            "exit": code,
            "retryable": retryable,
            "message": message,
            "hint": "Run mytool --help.",
        },
    }
    print(json.dumps(doc))
    sys.exit(code)


if any(a.startswith("--") for a in rest):
    fail(64, "invalid_input", "unexpected argument " + next(a for a in rest if a.startswith("--")))
if rest[:1] == ["about"]:
    print(json.dumps({"schema_version": 1, "name": "mytool"}))
elif rest[:1] == ["describe"]:
    fail(79, "not_found", "no package named " + (rest[1] if len(rest) > 1 else "?"))
else:
    fail(64, "invalid_input", "unknown command")
