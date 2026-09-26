#!/bin/sh
# find_package 4.2 "newest wins": across two CMAKE_PREFIX_PATH entries (p1=1.0 first, p2=2.0) and within one glob (g: foo-1.0, foo-2.0).
# Run from the lore worktree root. Usage: sh run.sh
S=$(cd "$(dirname "$0")" && pwd)
for v in 3.31 4.3 4.4; do
  for pp in "$S/p1;$S/p2" "$S/g"; do
    rm -rf "$S/b"
    ocx package exec "kitware/cmake:$v" -- cmake -S "$S/src" -B "$S/b" "-DCMAKE_PREFIX_PATH=$pp" 2>&1 | grep -e 'WHICH=' | sed "s/^/$v /"
  done
done
rm -rf "$S/b"
