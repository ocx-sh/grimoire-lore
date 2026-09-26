#!/usr/bin/env bash
# Axis 1: version floors. Emits TSV: repo, root_cml_path, raw_line, form(single|range|absent|nocmake)
set -uo pipefail
CORPUS=/tmp/claude-1000/-home-mherwig-dev-grimoire-lore--agents-worktrees-java/c4f22277-6831-442c-8bc3-1be41a79fdff/scratchpad/exemplars
SCRATCH=/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/.agents/research/cmake-audit/scratch
OUT="$SCRATCH/versionfloor.tsv"
echo -e "repo\troot_path\traw\tform" > "$OUT"

declare -A ROOTMAP=(
  [apache__arrow]="cpp/CMakeLists.txt"
  [llvm__llvm-project]="llvm/CMakeLists.txt"
)

for d in "$CORPUS"/*/; do
  repo=$(basename "$d")
  root="CMakeLists.txt"
  if [ -n "${ROOTMAP[$repo]:-}" ]; then root="${ROOTMAP[$repo]}"; fi
  f="$d$root"
  if [ ! -f "$f" ]; then
    # no CMake at all, or no discoverable root
    total_cmake=$(command find "$d" -name 'CMakeLists.txt' -not -path '*/.git/*' 2>/dev/null | wc -l)
    if [ "$total_cmake" -eq 0 ]; then
      echo -e "$repo\t-\t-\tnocmake" >> "$OUT"
    else
      echo -e "$repo\t-\t-\tno-root-cmakelists" >> "$OUT"
    fi
    continue
  fi
  raw=$(command grep -iE '^[[:space:]]*cmake_minimum_required' "$f" | tr -d '\r' | sed -E 's/^[[:space:]]*//' | sed 's/\t/ /g' | head -1)
  if [ -z "$raw" ]; then
    echo -e "$repo\t$root\t-\tabsent" >> "$OUT"
    continue
  fi
  if echo "$raw" | command grep -qE '\.\.\.'; then
    form="range"
  else
    form="single"
  fi
  echo -e "$repo\t$root\t$raw\t$form" >> "$OUT"
done
echo "Wrote $OUT"
echo "--- form histogram ---"
cut -f4 "$OUT" | tail -n +1 | sort | uniq -c
