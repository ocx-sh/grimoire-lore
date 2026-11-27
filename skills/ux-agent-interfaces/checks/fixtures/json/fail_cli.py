#!/usr/bin/env python3
"""Fixture CLI that breaks UX-AGENT-01, 02, 03, 04, 09 and 14 on purpose."""

import json
import sys

args = sys.argv[1:]
if args[:2] == ["--format", "json"]:
    args = args[2:]
elif "--format" in args or "--json" in args:
    sys.stderr.write("error: unexpected argument '--format' found\n")
    sys.exit(64)
if any(a.startswith("--") for a in args):
    sys.stderr.write("error: unexpected argument\n")
    sys.exit(64)
if args[:1] == ["about"]:
    print("loading...")
    print(json.dumps({"name": "mytool"}))
elif args[:1] == ["describe"]:
    print(
        json.dumps(
            {
                "error": {
                    "code": "not_found",
                    "exit": 1,
                    "message": 'Traceback (most recent call last): {"errors":[]}',
                }
            }
        )
    )
    sys.exit(79)
else:
    sys.exit(64)
