#!/usr/bin/env bash
# Per-repo yes/no adoption sweep for a curated list of axis 8/9 features.
set -u
# NOTE: pipefail deliberately NOT set here. chk() pipes xargs-grep into a consumer;
# some repos (Kitware__CMake test fixtures) have space-containing filenames that make
# xargs mis-split arguments, so grep -l exits non-zero even though it DID find and
# print real matches first. With pipefail that non-zero would flip a true "y" to "n".
CORPUS=/tmp/claude-1000/-home-mherwig-dev-grimoire-lore--agents-worktrees-java/c4f22277-6831-442c-8bc3-1be41a79fdff/scratchpad/exemplars
SCRATCH=/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/.agents/research/cmake-audit/scratch
OUT="$SCRATCH/adoption.tsv"
echo -e "repo\tCONFIGURE_DEPENDS\tCMAKE_UNITY_BUILD\tCOMPILER_LAUNCHER\ttarget_precompile_headers\tCheckIPOSupported\tGenerateExportHeader\tinstall_EXPORT\tCMakePackageConfigHelpers\tCPack_include\tgtest_discover_tests" > "$OUT"
for d in "$CORPUS"/*/; do
  repo=$(basename "$d")
  files=$(command find "$d" -type f \( -name 'CMakeLists.txt' -o -name '*.cmake' -o -name '*.cmake.in' \) -not -path '*/.git/*')
  [ -z "$files" ] && { echo -e "$repo\t-\t-\t-\t-\t-\t-\t-\t-\t-\t-" >> "$OUT"; continue; }
  chk() { n=$(echo "$files" | xargs -d'\n' command grep -lE "$1" 2>/dev/null | wc -l); [ "$n" -gt 0 ] && echo y || echo n; }
  echo -e "$repo\t$(chk 'CONFIGURE_DEPENDS')\t$(chk 'CMAKE_UNITY_BUILD')\t$(chk 'CMAKE_[A-Z]+_COMPILER_LAUNCHER')\t$(chk 'target_precompile_headers')\t$(chk 'CheckIPOSupported')\t$(chk 'GenerateExportHeader')\t$(chk 'install\([[:space:]]*EXPORT')\t$(chk 'CMakePackageConfigHelpers')\t$(chk 'include\([[:space:]]*CPack')\t$(chk 'gtest_discover_tests')" >> "$OUT"
done
echo "Wrote $OUT"
echo "=== y-counts per column ==="
awk -F'\t' 'NR==1{for(i=2;i<=NF;i++)h[i]=$i; next} {for(i=2;i<=NF;i++) if($i=="y")c[i]++} END{for(i=2;i<=10;i++) print h[i], c[i]+0}' "$OUT"
