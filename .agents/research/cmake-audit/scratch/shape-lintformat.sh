#!/usr/bin/env bash
# Axis 11: lint/format configs, and -Werror=dev / --warn-uninitialized in CI workflows.
set -uo pipefail
CORPUS=/tmp/claude-1000/-home-mherwig-dev-grimoire-lore--agents-worktrees-java/c4f22277-6831-442c-8bc3-1be41a79fdff/scratchpad/exemplars
SCRATCH=/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/.agents/research/cmake-audit/scratch
OUT="$SCRATCH/lintformat.tsv"
echo -e "repo\tcmake_format_cfg\tgersemirc\tcmake_lint_in_precommit\tclang_tidy\tclang_format\tWerror_dev_in_ci\twarn_uninitialized_in_ci" > "$OUT"
for d in "$CORPUS"/*/; do
  repo=$(basename "$d")
  cf="n"; command find "$d" -maxdepth 2 \( -name '.cmake-format.yaml' -o -name '.cmake-format.py' -o -name 'cmake-format.yaml' -o -name '.cmake-format' \) -not -path '*/.git/*' 2>/dev/null | command grep -q . && cf="y"
  gs="n"; command find "$d" -maxdepth 2 -name '.gersemirc' -not -path '*/.git/*' 2>/dev/null | command grep -q . && gs="y"
  pc="n"
  if [ -f "$d/.pre-commit-config.yaml" ]; then
    command grep -qi 'cmake-lint\|cmake_lint\|cmakelang' "$d/.pre-commit-config.yaml" && pc="y"
  fi
  ct="n"; command find "$d" -maxdepth 2 -name '.clang-tidy' -not -path '*/.git/*' 2>/dev/null | command grep -q . && ct="y"
  cfmt="n"; command find "$d" -maxdepth 2 -name '.clang-format' -not -path '*/.git/*' 2>/dev/null | command grep -q . && cfmt="y"
  wd="n"; wu="n"
  if [ -d "$d/.github/workflows" ]; then
    command grep -rl -- '-Werror=dev' "$d/.github/workflows" >/dev/null 2>&1 && wd="y"
    command grep -rl -- '--warn-uninitialized' "$d/.github/workflows" >/dev/null 2>&1 && wu="y"
  fi
  echo -e "$repo\t$cf\t$gs\t$pc\t$ct\t$cfmt\t$wd\t$wu" >> "$OUT"
done
echo "Wrote $OUT"
echo "=== column totals (y counts) ==="
awk -F'\t' 'NR>1{for(i=2;i<=NF;i++) if($i=="y") c[i]++} END{for(i=2;i<=7+1;i++) print i, c[i]+0}' "$OUT"
column -t -s$'\t' "$OUT"
