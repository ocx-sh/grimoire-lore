#!/usr/bin/env bash
# Axis 6: Hunter / cpp-pm fork
set -uo pipefail
CORPUS=/tmp/claude-1000/-home-mherwig-dev-grimoire-lore--agents-worktrees-java/c4f22277-6831-442c-8bc3-1be41a79fdff/scratchpad/exemplars
HERE=$(dirname "$0")
CALLS="$HERE/calls.tsv"

HUNTERGATE=$(find "$CORPUS" -iname 'HunterGate.cmake' 2>/dev/null | sed "s#$CORPUS/##")
CONFIGCMAKE=$(find "$CORPUS" -path '*cmake/Hunter/config.cmake' 2>/dev/null | sed "s#$CORPUS/##")
awk -F'\t' 'tolower($4)=="hunter_add_package"{c[$1]++} END{for(r in c) print r"\t"c[r]}' "$CALLS" | sort -t$'\t' -k2 -rn > "$HERE/deps-hunter-per-repo.tsv"

HUNTER="$CORPUS/cpp-pm__hunter"
NPKGS=$(ls "$HUNTER/cmake/projects" 2>/dev/null | wc -l)
LASTCOMMIT=$(git -C "$HUNTER" log -1 --format=%cI 2>/dev/null)
SHA=$(git -C "$HUNTER" rev-parse --short=10 HEAD 2>/dev/null)
VERSCHEME=$(find "$HUNTER" -iname 'releases.txt' -o -iname 'VERSION' 2>/dev/null | sed "s#$CORPUS/##")

# HunterGate pin shape: URL + SHA1 in the corpus's own HunterGate.cmake copies, and
# in consumer CMakeLists.txt calling HunterGate(...)
: > "$HERE/deps-huntergate-pins.tsv"
awk -F'\t' 'tolower($4)=="huntergate"{print}' "$CALLS" >> "$HERE/deps-huntergate-pins.tsv"

{
echo -e "metric\tvalue"
echo -e "HunterGate.cmake_files_in_corpus\t$(echo "$HUNTERGATE" | grep -c . || echo 0)"
echo -e "HunterGate.cmake_paths\t${HUNTERGATE:-none}"
echo -e "cmake/Hunter/config.cmake_files\t$(echo "$CONFIGCMAKE" | grep -c . || echo 0)"
echo -e "hunter_add_package_total_calls\t$(awk -F'\t' 'tolower($4)=="hunter_add_package"' "$CALLS" | wc -l)"
echo -e "cpp-pm__hunter_sha\t$SHA"
echo -e "cpp-pm__hunter_packages_under_cmake_projects\t$NPKGS"
echo -e "cpp-pm__hunter_last_commit\t$LASTCOMMIT"
echo -e "cpp-pm__hunter_version_files\t${VERSCHEME:-none}"
} > "$HERE/deps-hunter.tsv"

echo "wrote deps-hunter.tsv, deps-hunter-per-repo.tsv, deps-huntergate-pins.tsv"
