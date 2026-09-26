#!/usr/bin/env bash
# Axis 4: generator-expression density ($< occurrences per 100 CMake lines) per repo.
set -uo pipefail
CORPUS=/tmp/claude-1000/-home-mherwig-dev-grimoire-lore--agents-worktrees-java/c4f22277-6831-442c-8bc3-1be41a79fdff/scratchpad/exemplars
SCRATCH=/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/.agents/research/cmake-audit/scratch
OUT="$SCRATCH/genexpr-density.tsv"
echo -e "repo\tgenexpr_occurrences\tcmake_lines\tper_100_lines" > "$OUT"
for d in "$CORPUS"/*/; do
  repo=$(basename "$d")
  files=$(command find "$d" -type f \( -name 'CMakeLists.txt' -o -name '*.cmake' -o -name '*.cmake.in' \) -not -path '*/.git/*')
  if [ -z "$files" ]; then
    echo -e "$repo\t0\t0\tno-cmake" >> "$OUT"
    continue
  fi
  occ=$(echo "$files" | xargs command grep -hoE '\$<' 2>/dev/null | wc -l)
  lines=$(echo "$files" | xargs cat 2>/dev/null | wc -l)
  if [ "$lines" -eq 0 ]; then dens="0"; else dens=$(awk -v o="$occ" -v l="$lines" 'BEGIN{printf "%.2f", (o*100.0)/l}'); fi
  echo -e "$repo\t$occ\t$lines\t$dens" >> "$OUT"
done
echo "Wrote $OUT"
sort -t$'\t' -k4 -rn "$OUT" | head -15
