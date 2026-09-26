#!/bin/sh
# DEP-22: a package only under lib64/ is missed by find_package(CONFIG) under LANGUAGES NONE.
# Run from the lore worktree root. Usage: sh run.sh
S=$(cd "$(dirname "$0")" && pwd)
NINJA=$(ocx package exec ninja-build/ninja -- sh -c 'command -v ninja' 2>/dev/null | tail -n 1)
for v in 3.31 4.3 4.4; do
  for l in none c; do
    rm -rf "$S/b"
    ocx package exec "kitware/cmake:$v" -- cmake -S "$S/$l" -B "$S/b" -G Ninja "-DCMAKE_MAKE_PROGRAM=$NINJA" "-DCMAKE_PREFIX_PATH=$S/p" 2>&1 | grep -e 'WHICH=' | sed "s/^/$v $l /"
  done
done
rm -rf "$S/b"
