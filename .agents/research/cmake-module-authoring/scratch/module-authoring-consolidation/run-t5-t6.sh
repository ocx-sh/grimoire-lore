#!/bin/sh
# t5: CMAKE_CONFIGURE_DEPENDS written as a variable (wrong form). t6: block(SCOPE_FOR POLICIES) as a definition-time pin.
S=/home/mherwig/.cache/cmake-measure-scratch/module-authoring-consolidation
cd /home/mherwig/dev/grimoire-lore/.agents/worktrees/java || exit 1
for v in 3.31 4.4; do
  echo "== $v"
  run() { ocx package exec ninja-build/ninja -- ocx package exec "kitware/cmake:$v" -- "$@"; }
  echo a > "$S/t5/watched.txt"
  run cmake -S "$S/t5" -B "$S/t5/b$v" -G Ninja 2>&1 | grep -e CONFIGURED
  sleep 1; echo b > "$S/t5/watched.txt"
  printf 't5 edit watched (variable form) -> reruns='; run cmake --build "$S/t5/b$v" 2>&1 | grep -c -e 'Re-running CMake'
  run cmake -S "$S/t6" -B "$S/t6/b$v" 2>&1 | grep -e 'f_in_block' -e 'f_after_block' -e 'includer' -e Error
done
