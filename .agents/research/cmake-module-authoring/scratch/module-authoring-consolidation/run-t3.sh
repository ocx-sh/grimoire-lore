#!/bin/sh
# Severity-pinned negative tests and the FAIL_REGULAR_EXPRESSION script-mode substitute gate.
S=/home/mherwig/.cache/cmake-measure-scratch/module-authoring-consolidation
cd /home/mherwig/dev/grimoire-lore/.agents/worktrees/java || exit 1
cp "$S/t1/fatal.cmake" "$S/t1/aw.cmake" "$S/t3/"
printf '%s\n' "message(WARNING \"module: stale lock - run 'ocx lock'\")" > "$S/t3/warn.cmake"
printf '%s\n' 'message(STATUS "module: ok")' > "$S/t3/clean.cmake"
for v in 3.31 4.4; do
  B="$S/t3/b$v"
  ocx package exec "kitware/cmake:$v" -- cmake --version | head -1
  ocx package exec "kitware/cmake:$v" -- cmake -S "$S/t3" -B "$B" >/dev/null 2>&1
  ocx package exec "kitware/cmake:$v" -- ctest --test-dir "$B" 2>&1 | grep -e 'Test *#'
done
