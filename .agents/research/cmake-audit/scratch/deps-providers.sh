#!/usr/bin/env bash
# Axis 7: dependency providers, toolchain files, pkg-config, vendored dirs, submodules
set -uo pipefail
CORPUS=/tmp/claude-1000/-home-mherwig-dev-grimoire-lore--agents-worktrees-java/c4f22277-6831-442c-8bc3-1be41a79fdff/scratchpad/exemplars
HERE=$(dirname "$0")
CALLS="$HERE/calls.tsv"

DEPPROV=$(awk -F'\t' 'tolower($4)=="cmake_language" && $5 ~ /SET_DEPENDENCY_PROVIDER/' "$CALLS")
DEPPROV_N=$(echo "$DEPPROV" | grep -c . || echo 0)
TOPLEVEL_INC=$(grep -rlE 'CMAKE_PROJECT_TOP_LEVEL_INCLUDES' "$CORPUS" --include='*.cmake' --include='CMakeLists.txt' --include='CMakePresets.json' 2>/dev/null | sed "s#$CORPUS/##")
TOPLEVEL_N=$(echo "$TOPLEVEL_INC" | grep -c . || echo 0)

TOOLCHAIN_REFS=$(grep -rlE 'CMAKE_TOOLCHAIN_FILE' "$CORPUS" --include='*.cmake' --include='CMakeLists.txt' --include='CMakePresets.json' --include='CMakeUserPresets.json' --include='*.yml' --include='*.yaml' 2>/dev/null | wc -l)

# toolchain files shipped under cmake/ or /toolchain*
: > "$HERE/deps-toolchain-files.tsv"
find "$CORPUS" -ipath '*/cmake/*toolchain*.cmake' -o -ipath '*/toolchain*/*.cmake' -o -ipath '*/cmake/toolchains/*' 2>/dev/null | sort -u | while read -r f; do
  repo=$(echo "$f" | sed "s#$CORPUS/##" | cut -d/ -f1)
  sets=$(grep -ohE 'set\([[:space:]]*(CMAKE_C_COMPILER|CMAKE_CXX_COMPILER|CMAKE_SYSTEM_NAME|CMAKE_SYSROOT|CMAKE_SYSTEM_PROCESSOR)\b' "$f" 2>/dev/null | sed 's/set(\s*//' | sort -u | tr '\n' ',')
  echo -e "$repo\t${f#"$CORPUS"/}\t$sets"
done >> "$HERE/deps-toolchain-files.tsv"
TOOLCHAIN_FILE_N=$(wc -l < "$HERE/deps-toolchain-files.tsv")
CROSS_N=$(grep -c 'CMAKE_SYSTEM_NAME' "$HERE/deps-toolchain-files.tsv" || echo 0)

PKGCONFIG_CALLS=$(grep -rohE '\bpkg_check_modules\b' "$CORPUS" --include='*.cmake' --include='CMakeLists.txt' 2>/dev/null | wc -l)
FINDPKGCONFIG_FILES=$(grep -rlE 'find_package\([[:space:]]*PkgConfig' "$CORPUS" --include='*.cmake' --include='CMakeLists.txt' 2>/dev/null | wc -l)

# vendored third-party directories: top-level dir per repo matching common names,
# checked against git ls-tree (root only) so it is not blind to sparse-checkout gaps.
: > "$HERE/deps-vendored-dirs.tsv"
for d in "$CORPUS"/*/; do
  repo=$(basename "$d")
  git -C "$d" ls-tree --name-only HEAD 2>/dev/null | grep -iE '^(third.?party|external|extern|deps|vendor|contrib)$' | while read -r name; do
    n=$(git -C "$d" ls-tree "HEAD:$name" 2>/dev/null | grep -c '^040000')
    echo -e "$repo\t$name\t$n"
  done
done >> "$HERE/deps-vendored-dirs.tsv"

# git submodules per repo
: > "$HERE/deps-submodules.tsv"
for d in "$CORPUS"/*/; do
  repo=$(basename "$d")
  if git -C "$d" ls-tree HEAD -- .gitmodules 2>/dev/null | grep -q .gitmodules; then
    n=$(git -C "$d" show HEAD:.gitmodules 2>/dev/null | grep -c '^\[submodule')
    echo -e "$repo\t$n"
  fi
done >> "$HERE/deps-submodules.tsv"

{
echo -e "metric\tcount"
echo -e "SET_DEPENDENCY_PROVIDER_calls\t$DEPPROV_N"
echo -e "CMAKE_PROJECT_TOP_LEVEL_INCLUDES_files\t$TOPLEVEL_N"
echo -e "CMAKE_TOOLCHAIN_FILE_reference_files\t$TOOLCHAIN_REFS"
echo -e "toolchain_files_under_cmake_dirs\t$TOOLCHAIN_FILE_N"
echo -e "of_those_cross_compiling_CMAKE_SYSTEM_NAME\t$CROSS_N"
echo -e "pkg_check_modules_calls\t$PKGCONFIG_CALLS"
echo -e "files_find_package_PkgConfig\t$FINDPKGCONFIG_FILES"
echo -e "repos_with_vendored_dir\t$(cut -f1 "$HERE/deps-vendored-dirs.tsv" | sort -u | wc -l)"
echo -e "repos_with_gitmodules\t$(wc -l < "$HERE/deps-submodules.tsv")"
} > "$HERE/deps-providers.tsv"

echo "wrote deps-providers.tsv and siblings"
echo "--- SET_DEPENDENCY_PROVIDER rows ---"
echo "$DEPPROV"
echo "--- TOP_LEVEL_INCLUDES files ---"
echo "$TOPLEVEL_INC"
