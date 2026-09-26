#!/bin/sh
# Re-runs the CMK-LANG consolidation measurements (2026-09-26).
# Run from the lore worktree root; build trees go under $SCRATCH, never /tmp.
SRC=$(dirname "$0")/src
SCRATCH=${SCRATCH:-$HOME/.cache/cmake-measure-scratch/cmake-language-consolidation}
for v in 3.31 4.3 4.4; do
  echo "=== kitware/cmake:$v"
  ocx package exec "kitware/cmake:$v" -- cmake -S "$SRC/deref" -B "$SCRATCH/deref-$v" 2>&1 | grep -e 'M[1-5]'
  ocx package exec "kitware/cmake:$v" -- cmake -S "$SRC/deref" -B "$SCRATCH/deref-$v-e" -DRUN_EMPTY=1 >/dev/null 2>&1; echo "M6 empty unquoted operand exit=$?"
  ocx package exec "kitware/cmake:$v" -- cmake -S "$SRC/cmp0054" -B "$SCRATCH/cmp0054-$v" >/dev/null 2>&1; echo "CMP0054 OLD exit=$?"
  ocx package exec "kitware/cmake:$v" -- cmake -S "$SRC/parse" -B "$SCRATCH/parse-$v" -DFORCE_ARGN=1 2>&1 | grep -e 'P[13]'
  ocx package exec "kitware/cmake:$v" -- cmake -S "$SRC/parse" -B "$SCRATCH/parse-$v-m" -DMACRO_ARGV=1 >/dev/null 2>&1; echo "P2 PARSE_ARGV in macro exit=$?"
done
