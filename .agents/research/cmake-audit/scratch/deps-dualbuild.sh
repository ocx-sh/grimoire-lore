#!/usr/bin/env bash
# Axis 8: dual CMake + Bazel build systems.
set -uo pipefail
CORPUS=/tmp/claude-1000/-home-mherwig-dev-grimoire-lore--agents-worktrees-java/c4f22277-6831-442c-8bc3-1be41a79fdff/scratchpad/exemplars
HERE=$(dirname "$0")

: > "$HERE/deps-dualbuild.tsv"
for d in "$CORPUS"/*/; do
  repo=$(basename "$d")
  has_root_cmake=$(git -C "$d" ls-tree --name-only HEAD 2>/dev/null | grep -qx 'CMakeLists.txt' && echo y || echo n)
  has_bazel_anywhere=$(git -C "$d" ls-tree -r --name-only HEAD 2>/dev/null | grep -qE '(^|/)(MODULE\.bazel|WORKSPACE|WORKSPACE\.bazel|BUILD|BUILD\.bazel)$' && echo y || echo n)
  has_root_bazel=$(git -C "$d" ls-tree --name-only HEAD 2>/dev/null | grep -qE '^(MODULE\.bazel|WORKSPACE|WORKSPACE\.bazel|BUILD|BUILD\.bazel)$' && echo y || echo n)
  echo -e "$repo\t$has_root_cmake\t$has_root_bazel\t$has_bazel_anywhere"
done >> "$HERE/deps-dualbuild.tsv"

echo -e "repo\troot_cmake\troot_bazel\tbazel_anywhere" > "$HERE/deps-dualbuild-labeled.tsv"
cat "$HERE/deps-dualbuild.tsv" >> "$HERE/deps-dualbuild-labeled.tsv"

# the real "dual build" set: root CMakeLists.txt AND root-level bazel entrypoint
DUAL=$(awk -F'\t' '$2=="y" && $3=="y"{print $1}' "$HERE/deps-dualbuild.tsv")
echo "$DUAL" > "$HERE/deps-dualbuild-repos.txt"

for repo in $DUAL; do
  d="$CORPUS/$repo"
  cc_lib=$(grep -rohE '\bcc_library\b' "$d" --include='BUILD' --include='BUILD.bazel' --include='*.bzl' 2>/dev/null | wc -l)
  cc_bin=$(grep -rohE '\bcc_binary\b' "$d" --include='BUILD' --include='BUILD.bazel' --include='*.bzl' 2>/dev/null | wc -l)
  cc_test=$(grep -rohE '\bcc_test\b' "$d" --include='BUILD' --include='BUILD.bazel' --include='*.bzl' 2>/dev/null | wc -l)
  add_lib=$(grep -rohE '\badd_library\s*\(' "$d" --include='CMakeLists.txt' --include='*.cmake' 2>/dev/null | wc -l)
  add_exe=$(grep -rohE '\badd_executable\s*\(' "$d" --include='CMakeLists.txt' --include='*.cmake' 2>/dev/null | wc -l)
  add_test=$(grep -rohE '\badd_test\s*\(' "$d" --include='CMakeLists.txt' --include='*.cmake' 2>/dev/null | wc -l)
  bazel_dep_n=$(grep -rohE '^bazel_dep\(' "$d/MODULE.bazel" 2>/dev/null | wc -l)
  echo -e "$repo\tcc_library=$cc_lib\tcc_binary=$cc_bin\tcc_test=$cc_test\tadd_library=$add_lib\tadd_executable=$add_exe\tadd_test=$add_test\tbazel_dep_calls=$bazel_dep_n"
done > "$HERE/deps-dualbuild-targets.tsv"

# sync mechanism artifacts: scripts under cmake/ bazel/ tools/ that mention both systems, and CI parity jobs
: > "$HERE/deps-dualbuild-sync.tsv"
for repo in $DUAL; do
  d="$CORPUS/$repo"
  files=$(grep -rlE 'bazel' "$d" --include='*.cmake' --include='CMakeLists.txt' 2>/dev/null | grep -v '/\.git/')
  ci_files=$(grep -rlE '\bbazel\b' "$d/.github" 2>/dev/null)
  readme=$(find "$d/cmake" "$d/bazel" -iname 'README*' 2>/dev/null)
  echo -e "$repo\tcmake_files_mentioning_bazel=$(echo "$files" | grep -c . || echo 0)\tci_files_mentioning_bazel=$(echo "$ci_files" | grep -c . || echo 0)\treadmes=$readme"
done >> "$HERE/deps-dualbuild-sync.tsv"

# MODULE.bazel bazel_dep list per dual repo (for the drift table, cross-referenced by hand)
: > "$HERE/deps-dualbuild-bazeldeps.tsv"
for repo in $DUAL; do
  d="$CORPUS/$repo"
  if [ -f "$d/MODULE.bazel" ]; then
    grep -E '^bazel_dep\(' "$d/MODULE.bazel" 2>/dev/null | sed "s/^/$repo\t/"
  fi
done >> "$HERE/deps-dualbuild-bazeldeps.tsv"

echo "wrote deps-dualbuild*.tsv; dual-build repos:"
echo "$DUAL"
