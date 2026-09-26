#!/usr/bin/env bash
# Axis 6: option() prefix discipline. Heuristic: for each repo, take all option() names,
# find the most common leading token (text up to first '_'), report what fraction of
# option names share that single most-common prefix. Repos with <3 option() calls skipped.
set -uo pipefail
CORPUS=/tmp/claude-1000/-home-mherwig-dev-grimoire-lore--agents-worktrees-java/c4f22277-6831-442c-8bc3-1be41a79fdff/scratchpad/exemplars
SCRATCH=/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/.agents/research/cmake-audit/scratch
OUT="$SCRATCH/option-prefix.tsv"
echo -e "repo\ttotal_options\ttop_prefix\ttop_prefix_count\tshare_pct" > "$OUT"
for d in "$CORPUS"/*/; do
  repo=$(basename "$d")
  files=$(command find "$d" -type f \( -name 'CMakeLists.txt' -o -name '*.cmake' -o -name '*.cmake.in' \) -not -path '*/.git/*')
  [ -z "$files" ] && continue
  names=$(echo "$files" | xargs command grep -hoE '(^|[^_a-zA-Z])option[[:space:]]*\([[:space:]]*[A-Za-z0-9_]+' 2>/dev/null | command grep -oE '[A-Za-z0-9_]+$')
  total=$(echo "$names" | command grep -c . || true)
  [ "$total" -lt 3 ] && continue
  # leading token up to first underscore, uppercased
  top=$(echo "$names" | sed -E 's/_.*//' | tr 'a-z' 'A-Z' | sort | uniq -c | sort -rn | head -1)
  topcount=$(echo "$top" | awk '{print $1}')
  topprefix=$(echo "$top" | awk '{print $2}')
  pct=$(awk -v c="$topcount" -v t="$total" 'BEGIN{printf "%.0f", (c*100.0)/t}')
  echo -e "$repo\t$total\t$topprefix\t$topcount\t$pct" >> "$OUT"
done
echo "Wrote $OUT"
sort -t$'\t' -k2 -rn "$OUT" | head -20 | column -t -s$'\t'
