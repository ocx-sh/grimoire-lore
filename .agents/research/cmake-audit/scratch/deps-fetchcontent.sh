#!/usr/bin/env bash
# Axis 2: FetchContent / ExternalProject_Add, from calls.tsv plus targeted greps
# for FETCHCONTENT_SOURCE_DIR_<X> / FETCHCONTENT_TRY_FIND_PACKAGE_MODE and
# execute_process-driven ExternalProject_Add (configure-time).
set -uo pipefail
CORPUS=/tmp/claude-1000/-home-mherwig-dev-grimoire-lore--agents-worktrees-java/c4f22277-6831-442c-8bc3-1be41a79fdff/scratchpad/exemplars
HERE=$(dirname "$0")
CALLS="$HERE/calls.tsv"

awk -F'\t' 'tolower($4)=="fetchcontent_declare"' "$CALLS" > "$HERE/.fcd.tsv"
DECL=$(wc -l < "$HERE/.fcd.tsv")
MAKEAVAIL=$(awk -F'\t' 'tolower($4)=="fetchcontent_makeavailable"' "$CALLS" | wc -l)
POPULATE=$(awk -F'\t' 'tolower($4)=="fetchcontent_populate"' "$CALLS" | wc -l)
GETPROPS=$(awk -F'\t' 'tolower($4)=="fetchcontent_getproperties"' "$CALLS" | wc -l)
EPADD=$(awk -F'\t' 'tolower($4)=="externalproject_add"' "$CALLS" | wc -l)

FULLHASH=$(grep -cE 'GIT_TAG[[:space:]]+"?[0-9a-f]{33,40}"?' "$HERE/.fcd.tsv")
SHORTHASH=$(grep -cE 'GIT_TAG[[:space:]]+"?[0-9a-f]{7,12}"?([[:space:]]|"|$)' "$HERE/.fcd.tsv")
VERTAG=$(grep -cE 'GIT_TAG[[:space:]]+"?v?[0-9]+\.[0-9]+' "$HERE/.fcd.tsv")
BRANCHTAG=$(grep -cE 'GIT_TAG[[:space:]]+"?(main|master|develop|HEAD)"?' "$HERE/.fcd.tsv")
URL_ANY=$(grep -cE '\bURL[[:space:]]+"?https?://' "$HERE/.fcd.tsv")
URL_HASH=$(grep -cE 'URL_HASH' "$HERE/.fcd.tsv")
FPARGS=$(grep -cE 'FIND_PACKAGE_ARGS' "$HERE/.fcd.tsv")
OVERRIDE=$(grep -cE 'OVERRIDE_FIND_PACKAGE' "$HERE/.fcd.tsv")
SYSTEM=$(grep -cE '\bSYSTEM\b' "$HERE/.fcd.tsv")
EXCLUDE=$(grep -cE 'EXCLUDE_FROM_ALL' "$HERE/.fcd.tsv")
TIMESTAMP=$(grep -cE 'DOWNLOAD_EXTRACT_TIMESTAMP' "$HERE/.fcd.tsv")
SRCSUBDIR=$(grep -cE 'SOURCE_SUBDIR' "$HERE/.fcd.tsv")
GITSHALLOW=$(grep -cE 'GIT_SHALLOW' "$HERE/.fcd.tsv")

SRC_DIR_OVERRIDE=$(grep -rlE 'FETCHCONTENT_SOURCE_DIR_[A-Za-z0-9_]+' "$CORPUS" --include='*.cmake' --include='CMakeLists.txt' 2>/dev/null | wc -l)
TRY_FIND_MODE=$(grep -rlE 'FETCHCONTENT_TRY_FIND_PACKAGE_MODE' "$CORPUS" --include='*.cmake' --include='CMakeLists.txt' 2>/dev/null | wc -l)

OUT="$HERE/deps-fetchcontent.tsv"
{
echo -e "metric\tcount"
echo -e "FetchContent_Declare_calls\t$DECL"
echo -e "FetchContent_MakeAvailable_calls\t$MAKEAVAIL"
echo -e "FetchContent_Populate_calls_legacy\t$POPULATE"
echo -e "FetchContent_GetProperties_calls\t$GETPROPS"
echo -e "ExternalProject_Add_calls\t$EPADD"
echo -e "declare_GIT_TAG_full_hash\t$FULLHASH"
echo -e "declare_GIT_TAG_short_hash\t$SHORTHASH"
echo -e "declare_GIT_TAG_version_tag\t$VERTAG"
echo -e "declare_GIT_TAG_branch_name\t$BRANCHTAG"
echo -e "declare_URL_form\t$URL_ANY"
echo -e "declare_URL_with_URL_HASH\t$URL_HASH"
echo -e "declare_FIND_PACKAGE_ARGS\t$FPARGS"
echo -e "declare_OVERRIDE_FIND_PACKAGE\t$OVERRIDE"
echo -e "declare_SYSTEM\t$SYSTEM"
echo -e "declare_EXCLUDE_FROM_ALL\t$EXCLUDE"
echo -e "declare_DOWNLOAD_EXTRACT_TIMESTAMP\t$TIMESTAMP"
echo -e "declare_SOURCE_SUBDIR\t$SRCSUBDIR"
echo -e "declare_GIT_SHALLOW\t$GITSHALLOW"
echo -e "files_setting_FETCHCONTENT_SOURCE_DIR_X\t$SRC_DIR_OVERRIDE"
echo -e "files_setting_FETCHCONTENT_TRY_FIND_PACKAGE_MODE\t$TRY_FIND_MODE"
} > "$OUT"

awk -F'\t' '{c[$1]++} END{for(r in c) print r"\t"c[r]}' "$HERE/.fcd.tsv" | sort -t$'\t' -k2 -rn > "$HERE/deps-fetchcontent-per-repo.tsv"

# ExternalProject_Add: configure-time (inside execute_process) vs build-time — heuristic:
# a file containing both execute_process( and ExternalProject_Add is flagged for manual read.
awk -F'\t' 'tolower($4)=="externalproject_add"{print $1"\t"$2}' "$CALLS" | sort -u > "$HERE/deps-externalproject-files.tsv"

rm -f "$HERE/.fcd.tsv"
echo "wrote $OUT and siblings"
