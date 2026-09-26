#!/bin/sh
# <Pkg>_ROOT vs a manager's CMAKE_FIND_ROOT_PATH entry, and whether <Pkg>_DIR bypasses it.
# Run from the lore worktree root. Usage: sh run.sh
B=$(cd "$(dirname "$0")" && pwd)
for v in 3.31 4.4; do
  for args in "" "-DMODE=BOTH" "-DMODE=ONLY" "-DMODE=NEVER" "-DUSE_DIR=ON" "-DUSE_DIR=ON -DMODE=ONLY"; do
    rm -rf "$B/b"
    # shellcheck disable=SC2086
    ocx package exec "kitware/cmake:$v" -- cmake -S "$B/src" -B "$B/b" $args 2>&1 | grep -e 'MODE=' -e 'Error' | sed "s/^/$v /"
  done
done
rm -rf "$B/b"
