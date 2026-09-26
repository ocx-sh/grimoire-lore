#!/bin/sh
# DEP-09 scope: which FetchContent shapes make a later find_package(dep 3.0 EXACT) succeed against a fetched 1.0?
# Run from the lore worktree root. Usage: sh run.sh
S=$(cd "$(dirname "$0")" && pwd)
for v in 3.31 4.3 4.4; do
  for sh in plain fpa override both; do
    rm -rf "$S/b"
    ocx package exec "kitware/cmake:$v" -- cmake -S "$S/proj" -B "$S/b" "-DSHAPE=$sh" "-DSRC=$S/src-dep" >"$S/out.txt" 2>&1
    echo "$v $sh exit=$? $(grep -m1 -e '\[dep09b\]' -e 'cannot be used' -e 'Error' "$S/out.txt")"
  done
done
rm -rf "$S/b" "$S/out.txt"
