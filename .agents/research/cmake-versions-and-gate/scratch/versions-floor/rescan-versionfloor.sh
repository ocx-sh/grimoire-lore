#!/usr/bin/env bash
set -uo pipefail
CORPUS=/home/mherwig/.cache/research-lang/exemplars/cmake
OUT=/tmp/claude-1000/-home-mherwig-dev-grimoire-lore--agents-worktrees-java/c4f22277-6831-442c-8bc3-1be41a79fdff/scratchpad/versionfloor-2026-09-26.tsv
echo -e "repo\troot_path\traw\tform\tsha" > "$OUT"

declare -A ROOTMAP=(
  [apache__arrow]="cpp/CMakeLists.txt"
  [llvm__llvm-project]="llvm/CMakeLists.txt"
)

for d in "$CORPUS"/*/; do
  repo=$(basename "$d")
  root="CMakeLists.txt"
  if [ -n "${ROOTMAP[$repo]:-}" ]; then root="${ROOTMAP[$repo]}"; fi
  f="$d$root"
  sha=$(git -C "$d" rev-parse --short HEAD 2>/dev/null || echo "-")
  if [ ! -f "$f" ]; then
    total_cmake=$(command find "$d" -name 'CMakeLists.txt' -not -path '*/.git/*' 2>/dev/null | wc -l)
    if [ "$total_cmake" -eq 0 ]; then
      echo -e "$repo\t-\t-\tnocmake\t$sha" >> "$OUT"
    else
      echo -e "$repo\t-\t-\tno-root-cmakelists\t$sha" >> "$OUT"
    fi
    continue
  fi
  raw=$(command grep -iE '^[[:space:]]*cmake_minimum_required' "$f" | tr -d '\r' | sed -E 's/^[[:space:]]*//' | sed 's/\t/ /g' | head -1)
  if [ -z "$raw" ]; then
    echo -e "$repo\t$root\t-\tabsent\t$sha" >> "$OUT"
    continue
  fi
  if echo "$raw" | command grep -qE '\.\.\.'; then
    form="range"
  else
    form="single"
  fi
  echo -e "$repo\t$root\t$raw\t$form\t$sha" >> "$OUT"
done
echo "Wrote $OUT"
