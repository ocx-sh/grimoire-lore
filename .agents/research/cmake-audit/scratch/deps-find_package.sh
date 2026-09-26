#!/usr/bin/env bash
# Axis 1: find_package. Reads calls.tsv (from deps-cmake-calls.py) for the
# find_package rows, classifies flags, and separately greps the corpus for
# CMAKE_FIND_PACKAGE_PREFER_CONFIG / CMAKE_PREFIX_PATH / <Pkg>_ROOT / <Pkg>_DIR
# / CMAKE_MODULE_PATH manipulation and own Find<Pkg>.cmake modules.
set -uo pipefail
CORPUS=/tmp/claude-1000/-home-mherwig-dev-grimoire-lore--agents-worktrees-java/c4f22277-6831-442c-8bc3-1be41a79fdff/scratchpad/exemplars
HERE=$(dirname "$0")
CALLS="$HERE/calls.tsv"
OUT="$HERE/deps-find_package.tsv"

awk -F'\t' 'tolower($4)=="find_package"' "$CALLS" > "$HERE/.fp_rows.tsv"
TOTAL=$(wc -l < "$HERE/.fp_rows.tsv")
CONFIG=$(grep -cE '\bCONFIG\b' "$HERE/.fp_rows.tsv")
MODULE=$(grep -cE '\bMODULE\b' "$HERE/.fp_rows.tsv")
REQUIRED=$(grep -cE '\bREQUIRED\b' "$HERE/.fp_rows.tsv")
COMPONENTS=$(grep -cE '\bCOMPONENTS\b' "$HERE/.fp_rows.tsv")
GLOBAL=$(grep -cE '\bGLOBAL\b' "$HERE/.fp_rows.tsv")
QUIET=$(grep -cE '\bQUIET\b' "$HERE/.fp_rows.tsv")
VERRANGE=$(grep -cE '[0-9]+(\.[0-9]+)*\.\.\.[0-9]' "$HERE/.fp_rows.tsv")
# a version token = 2nd whitespace-separated word that starts with a digit and is not a range
VERSION=$(awk -F'\t' '{n=split($5,a," "); if (n>=2 && a[2] ~ /^[0-9]/) print}' "$HERE/.fp_rows.tsv" | wc -l)

{
echo -e "metric\tcount"
echo -e "total_find_package_calls\t$TOTAL"
echo -e "with_CONFIG\t$CONFIG"
echo -e "with_MODULE\t$MODULE"
echo -e "with_REQUIRED\t$REQUIRED"
echo -e "with_COMPONENTS\t$COMPONENTS"
echo -e "with_GLOBAL\t$GLOBAL"
echo -e "with_QUIET\t$QUIET"
echo -e "with_version_token\t$VERSION"
echo -e "with_version_range\t$VERRANGE"
} > "$OUT"

# per-repo find_package call counts
awk -F'\t' '{c[$1]++} END{for(r in c) print r"\t"c[r]}' "$HERE/.fp_rows.tsv" | sort > "$HERE/deps-find_package-per-repo.tsv"

# package name histogram: first arg of each call
awk -F'\t' '{split($5,a," "); print a[1]}' "$HERE/.fp_rows.tsv" | sort | uniq -c | sort -rn > "$HERE/deps-find_package-names.tsv"

# own Find<Pkg>.cmake modules under cmake/ (or CMake/) per repo
: > "$HERE/deps-find-modules.tsv"
for d in "$CORPUS"/*/; do
  repo=$(basename "$d")
  find "$d" -iname 'Find*.cmake' 2>/dev/null | grep -E '/(cmake|CMake|Modules)/' | while read -r f; do
    pkg=$(basename "$f" .cmake | sed 's/^[Ff]ind//')
    echo -e "$repo\t$pkg\t${f#"$d"}"
  done
done >> "$HERE/deps-find-modules.tsv"

# CMAKE_FIND_PACKAGE_PREFER_CONFIG, CMAKE_PREFIX_PATH, _ROOT, _DIR, CMAKE_MODULE_PATH writes
grep -rlE 'CMAKE_FIND_PACKAGE_PREFER_CONFIG' "$CORPUS" --include='*.cmake' --include='CMakeLists.txt' 2>/dev/null | sed "s#$CORPUS/##" > "$HERE/deps-prefer-config-files.tsv"
grep -rlE '\bCMAKE_PREFIX_PATH\b' "$CORPUS" --include='*.cmake' --include='CMakeLists.txt' 2>/dev/null | sed "s#$CORPUS/##" > "$HERE/deps-prefix-path-files.tsv"
grep -rlE '\bCMAKE_MODULE_PATH\b' "$CORPUS" --include='*.cmake' --include='CMakeLists.txt' 2>/dev/null | sed "s#$CORPUS/##" > "$HERE/deps-module-path-files.tsv"
grep -rohE '[A-Za-z0-9_]+_(ROOT|DIR)\)?\s*[A-Za-z]*' "$CORPUS" --include='*.cmake' --include='CMakeLists.txt' 2>/dev/null | grep -E '_(ROOT|DIR)$|_(ROOT|DIR)\)' | sed -E 's/[^A-Za-z0-9_].*//' | sort | uniq -c | sort -rn | head -40 > "$HERE/deps-root-dir-vars.tsv"

rm -f "$HERE/.fp_rows.tsv"
echo "wrote $OUT and siblings"
