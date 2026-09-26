#!/usr/bin/env bash
# Axis 5: vcpkg. Consumer manifests, vcpkg-configuration.json, CI/preset var
# references, and the microsoft/vcpkg 40-port sample.
set -uo pipefail
CORPUS=/tmp/claude-1000/-home-mherwig-dev-grimoire-lore--agents-worktrees-java/c4f22277-6831-442c-8bc3-1be41a79fdff/scratchpad/exemplars
HERE=$(dirname "$0")

# 1) consumer vcpkg.json: repo-root or subdir manifest, excluding microsoft__vcpkg/ports and vcpkg-tool
: > "$HERE/deps-vcpkg-presence.tsv"
for d in "$CORPUS"/*/; do
  repo=$(basename "$d")
  [ "$repo" = "microsoft__vcpkg" ] && continue
  find "$d" -name 'vcpkg.json' 2>/dev/null | while read -r f; do
    echo -e "$repo\t${f#"$d"}"
  done
done >> "$HERE/deps-vcpkg-presence.tsv"

# 2) fields used across those consumer manifests
FILES=$(cut -f1,2 "$HERE/deps-vcpkg-presence.tsv" | while IFS=$'\t' read -r r p; do echo "$CORPUS/$r/$p"; done)
fcount() { local pat="$1"; grep -lE "$pat" $FILES 2>/dev/null | wc -l; }
{
echo -e "metric\tcount"
echo -e "consumer_vcpkg.json_files\t$(echo "$FILES" | wc -w)"
echo -e "field_name\t$(fcount '"name"')"
echo -e "field_version\t$(fcount '"version"[^-]')"
echo -e "field_version-string\t$(fcount '"version-string"')"
echo -e "field_version-semver\t$(fcount '"version-semver"')"
echo -e "field_version-date\t$(fcount '"version-date"')"
echo -e "field_builtin-baseline\t$(fcount '"builtin-baseline"')"
echo -e "field_dependencies\t$(fcount '"dependencies"')"
echo -e "dependencies_with_host_true\t$(fcount '"host"\s*:\s*true')"
echo -e "field_features\t$(fcount '"features"')"
echo -e "field_default-features\t$(fcount '"default-features"')"
echo -e "field_overrides\t$(fcount '"overrides"')"
echo -e "field_license\t$(fcount '"license"')"
echo -e "field_supports\t$(fcount '"supports"')"
echo -e "field_port-version\t$(fcount '"port-version"')"
} > "$HERE/deps-vcpkg-manifest-fields.tsv"

# 3) vcpkg-configuration.json registries
: > "$HERE/deps-vcpkg-configuration.tsv"
find "$CORPUS" -name 'vcpkg-configuration.json' -not -path '*/microsoft__vcpkg/*' 2>/dev/null | while read -r f; do
  repo=$(echo "$f" | sed "s#$CORPUS/##" | cut -d/ -f1)
  kinds=$(grep -oE '"kind"\s*:\s*"[a-z]+"' "$f" | sort -u | tr '\n' ',')
  echo -e "$repo\t${f#"$CORPUS"/}\t$kinds"
done >> "$HERE/deps-vcpkg-configuration.tsv"

# 4) VCPKG_* variables and toolchain wiring in CMakePresets/CI, corpus-wide (excl microsoft__vcpkg internals)
grepvar() {
  grep -rlE "$1" "$CORPUS" --include='CMakePresets.json' --include='CMakeUserPresets.json' --include='*.yml' --include='*.yaml' --include='CMakeLists.txt' --include='*.cmake' 2>/dev/null | grep -v '/microsoft__vcpkg/' | grep -v '/microsoft__vcpkg-tool/' | sed "s#$CORPUS/##"
}
{
echo -e "metric\tfile_count\tfiles(head5)"
for v in VCPKG_CHAINLOAD_TOOLCHAIN_FILE VCPKG_MANIFEST_FEATURES VCPKG_MANIFEST_MODE VCPKG_TARGET_TRIPLET VCPKG_OVERLAY_PORTS VCPKG_BINARY_SOURCES X_VCPKG_ASSET_SOURCES 'scripts/buildsystems/vcpkg\.cmake'; do
  f=$(grepvar "$v")
  n=$(echo "$f" | grep -c . || true)
  [ -z "$f" ] && n=0
  echo -e "$v\t$n\t$(echo "$f" | head -5 | tr '\n' ';')"
done
} > "$HERE/deps-vcpkg-vars.tsv"

# 5) microsoft/vcpkg 40-port sample: first 40 alphabetically under ports/ with a portfile.cmake
VCPKG="$CORPUS/microsoft__vcpkg"
ls "$VCPKG/ports" 2>/dev/null | sort | while read -r p; do
  [ -f "$VCPKG/ports/$p/portfile.cmake" ] && echo "$p"
done | head -40 > "$HERE/deps-vcpkg-port-sample.txt"
PORTFILES=$(while read -r p; do echo "$VCPKG/ports/$p/portfile.cmake"; done < "$HERE/deps-vcpkg-port-sample.txt")
N=$(wc -l < "$HERE/deps-vcpkg-port-sample.txt")
pcount() { local pat="$1"; grep -lE "$pat" $PORTFILES 2>/dev/null | wc -l; }
{
echo -e "metric\tcount_of_$N"
echo -e "vcpkg_cmake_configure\t$(pcount 'vcpkg_cmake_configure')"
echo -e "vcpkg_cmake_install\t$(pcount 'vcpkg_cmake_install')"
echo -e "vcpkg_cmake_config_fixup\t$(pcount 'vcpkg_cmake_config_fixup')"
echo -e "vcpkg_fixup_pkgconfig\t$(pcount 'vcpkg_fixup_pkgconfig')"
echo -e "vcpkg_copy_pdbs\t$(pcount 'vcpkg_copy_pdbs')"
echo -e "vcpkg_from_github\t$(pcount 'vcpkg_from_github')"
echo -e "vcpkg_from_github_with_SHA512\t$(pcount 'SHA512')"
n_optd=0
while read -r p; do perl -0777 -ne 'exit(!(/OPTIONS[\s\S]{0,400}?-D/))' "$VCPKG/ports/$p/portfile.cmake" && n_optd=$((n_optd+1)); done < "$HERE/deps-vcpkg-port-sample.txt"
echo -e "OPTIONS_-D_passed\t$n_optd"
n_usage=0
while read -r p; do [ -f "$VCPKG/ports/$p/usage" ] && n_usage=$((n_usage+1)); done < "$HERE/deps-vcpkg-port-sample.txt"
echo -e "usage_file_present\t$n_usage"
} > "$HERE/deps-vcpkg-port-sample.tsv"

# maintainer guide location
find "$VCPKG" -iname 'maintainer*guide*' 2>/dev/null | sed "s#$CORPUS/##" > "$HERE/deps-vcpkg-maintainer-guide.txt"

echo "wrote deps-vcpkg-*.tsv"
