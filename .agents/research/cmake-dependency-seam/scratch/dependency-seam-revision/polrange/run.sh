#!/bin/sh
# Removal policies under the fleet's `3.25...<max>` range, and a removed Find module called optionally.
# Run from the lore worktree root. Usage: sh run.sh
P=$(cd "$(dirname "$0")" && pwd)
for v in 3.31 4.4; do
  echo "== $v"
  ocx package exec "kitware/cmake:$v" -- cmake -P "$P/pol.cmake" 2>&1 | grep -e range -e bare
  rm -rf "$P/b"
  ocx package exec "kitware/cmake:$v" -- cmake -S "$P/src" -B "$P/b" >"$P/out.txt" 2>&1
  echo "exit=$?"
  grep -e 'FOUND=' -e 'Warning' -e 'FindPythonInterp' "$P/out.txt"
done
rm -rf "$P/b" "$P/out.txt"
