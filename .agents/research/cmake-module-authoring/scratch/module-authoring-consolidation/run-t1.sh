#!/bin/sh
# Run the CTest negative-test semantics fixture on 3.31 and 4.4.
S=/home/mherwig/.cache/cmake-measure-scratch/module-authoring-consolidation
cd /home/mherwig/dev/grimoire-lore/.agents/worktrees/java || exit 1
for v in 3.31 4.4; do
  B="$S/t1/b$v"
  ocx package exec "kitware/cmake:$v" -- cmake --version | head -1
  ocx package exec "kitware/cmake:$v" -- cmake -S "$S/t1" -B "$B" >/dev/null 2>&1
  ocx package exec "kitware/cmake:$v" -- ctest --test-dir "$B" 2>&1 | grep -e 'Test *#'
done
