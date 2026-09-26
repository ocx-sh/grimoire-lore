#!/bin/sh
# CMAKE_CONFIGURE_DEPENDS: edited watched file, edited unwatched file, watched file that did not exist at configure.
S=/home/mherwig/.cache/cmake-measure-scratch/module-authoring-consolidation
T="$S/t4"
cd /home/mherwig/dev/grimoire-lore/.agents/worktrees/java || exit 1
for v in 3.31 4.4; do
  echo "== $v"
  B="$T/b$v"
  echo a > "$T/watched.txt"; echo a > "$T/unwatched.txt"; rm -f "$T/later.txt"
  run() { ocx package exec ninja-build/ninja -- ocx package exec "kitware/cmake:$v" -- "$@"; }
  run cmake -S "$T" -B "$B" -G Ninja 2>&1 | grep -e CONFIGURED -e Error
  sleep 1; echo b > "$T/unwatched.txt"
  printf 'edit unwatched -> '; run cmake --build "$B" 2>&1 | grep -c -e 'Re-running CMake' -e CONFIGURED
  sleep 1; echo b > "$T/watched.txt"
  printf 'edit watched   -> '; run cmake --build "$B" 2>&1 | grep -e CONFIGURED -e 'Re-running' | tr '\n' ' '; echo
  sleep 1; echo x > "$T/later.txt"
  printf 'create later   -> '; run cmake --build "$B" 2>&1 | grep -e CONFIGURED -e 'Re-running' -e 'missing' | tr '\n' ' '; echo
done
