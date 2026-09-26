#!/bin/sh
# Verdict 8 / CMK-DEP-11: valid X.cps beside XConfig.cmake in one prefix; which loads? Re-run of wave-2 pfx3.
# Run from the lore worktree root. Usage: sh run.sh
S=$(cd "$(dirname "$0")" && pwd)
M="$S/../m"
for v in 3.31 4.3 4.4; do
  rm -rf "$S/b"
  ocx package exec "kitware/cmake:$v" -- cmake -S "$M/cps" -B "$S/b" "-DCMAKE_PREFIX_PATH=$M/pfx3" 2>&1 | grep -e '\[cps\]' -e 'Error' | sed "s/^/$v /"
done
rm -rf "$S/b"
