#!/usr/bin/env python3
"""Read a mktable.py markdown table on stdin, drop rows that are all-zero
across every metric column (keep TOTAL row), cap at `cap` rows, and note
how many zero-rows were dropped."""
import sys
cap = int(sys.argv[1]) if len(sys.argv) > 1 else 15
lines = sys.stdin.read().splitlines()
header, sep, rows = lines[0], lines[1], lines[2:]
total = rows[-1]
body = rows[:-1]
def allzero(row):
    cells = row.split("|")[3:-1]
    return all(c.strip().startswith("0 (") for c in cells)
nonzero = [r for r in body if not allzero(r)]
dropped = len(body) - len(nonzero)
shown = nonzero[:cap]
print(header)
print(sep)
for r in shown:
    print(r)
print(total)
if dropped or len(nonzero) > cap:
    extra = max(0, len(nonzero) - cap)
    print(f"\n*{dropped} repos are all-zero on these columns (omitted); {extra} more non-zero repos also omitted for space.*" if extra else f"\n*{dropped} repos are all-zero on these columns (omitted).*")
