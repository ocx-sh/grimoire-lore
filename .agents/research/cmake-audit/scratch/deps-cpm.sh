#!/usr/bin/env bash
# Axis 3: CPM.cmake
set -uo pipefail
CORPUS=/tmp/claude-1000/-home-mherwig-dev-grimoire-lore--agents-worktrees-java/c4f22277-6831-442c-8bc3-1be41a79fdff/scratchpad/exemplars
HERE=$(dirname "$0")
CALLS="$HERE/calls.tsv"
OUT="$HERE/deps-cpm.tsv"

# repos vendoring cmake/CPM.cmake (or any CPM.cmake) + version string inside
: > "$HERE/deps-cpm-vendored.tsv"
for d in "$CORPUS"/*/; do
  repo=$(basename "$d")
  find "$d" -iname 'CPM.cmake' 2>/dev/null | while read -r f; do
    ver=$(grep -m1 -E 'CPM_VERSION|set\(CPM_' "$f" 2>/dev/null | head -c 120)
    echo -e "$repo\t${f#"$d"}\t$ver"
  done
done >> "$HERE/deps-cpm-vendored.tsv"

awk -F'\t' 'tolower($4)=="cpmaddpackage"' "$CALLS" > "$HERE/.cpm.tsv"
TOTAL=$(wc -l < "$HERE/.cpm.tsv")
# shorthand form: single-quoted-string-only arg like "gh:owner/repo@ver" or "owner/repo@ver" (no NAME= keyword)
SHORTHAND=$(awk -F'\t' '$5 !~ /NAME[ \t]/' "$HERE/.cpm.tsv" | wc -l)
LONGFORM=$(awk -F'\t' '$5 ~ /NAME[ \t]/' "$HERE/.cpm.tsv" | wc -l)
VERSIONPIN=$(grep -cE '\bVERSION\b' "$HERE/.cpm.tsv")
GITTAGPIN=$(grep -cE '\bGIT_TAG\b' "$HERE/.cpm.tsv")
FPARGS=$(grep -cE 'FIND_PACKAGE_ARGS' "$HERE/.cpm.tsv")

SRC_CACHE=$(grep -rlE 'CPM_SOURCE_CACHE' "$CORPUS" --include='*.cmake' --include='CMakeLists.txt' --include='*.yml' --include='*.yaml' 2>/dev/null | wc -l)
LOCAL_PKGS=$(grep -rlE 'CPM_USE_LOCAL_PACKAGES' "$CORPUS" --include='*.cmake' --include='CMakeLists.txt' 2>/dev/null | wc -l)
DL_ALL=$(grep -rlE 'CPM_DOWNLOAD_ALL' "$CORPUS" --include='*.cmake' --include='CMakeLists.txt' 2>/dev/null | wc -l)
USE_LOCK=$(grep -rlE 'CPMUsePackageLock|package-lock\.cmake' "$CORPUS" --include='*.cmake' --include='CMakeLists.txt' 2>/dev/null | wc -l)
CPMLICENSES=$(find "$CORPUS" -iname 'CPMLicenses.cmake' 2>/dev/null | wc -l)

{
echo -e "metric\tcount"
echo -e "repos_vendoring_CPM.cmake\t$(cut -f1 "$HERE/deps-cpm-vendored.tsv" | sort -u | wc -l)"
echo -e "CPMAddPackage_calls\t$TOTAL"
echo -e "shorthand_form_no_NAME_kw\t$SHORTHAND"
echo -e "long_form_with_NAME_kw\t$LONGFORM"
echo -e "with_VERSION\t$VERSIONPIN"
echo -e "with_GIT_TAG\t$GITTAGPIN"
echo -e "with_FIND_PACKAGE_ARGS\t$FPARGS"
echo -e "files_setting_CPM_SOURCE_CACHE\t$SRC_CACHE"
echo -e "files_setting_CPM_USE_LOCAL_PACKAGES\t$LOCAL_PKGS"
echo -e "files_setting_CPM_DOWNLOAD_ALL\t$DL_ALL"
echo -e "files_using_CPMUsePackageLock_or_package-lock.cmake\t$USE_LOCK"
echo -e "repos_with_CPMLicenses.cmake\t$CPMLICENSES"
} > "$OUT"

awk -F'\t' '{c[$1]++} END{for(r in c) print r"\t"c[r]}' "$HERE/.cpm.tsv" | sort -t$'\t' -k2 -rn > "$HERE/deps-cpm-per-repo.tsv"
rm -f "$HERE/.cpm.tsv"
echo "wrote $OUT and siblings"
