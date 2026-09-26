#!/usr/bin/env bash
# Axis 4: Conan. Presence per repo, marker counts, CCI 40-recipe sample,
# conan/cmake-conan CMake integration files.
set -uo pipefail
CORPUS=/tmp/claude-1000/-home-mherwig-dev-grimoire-lore--agents-worktrees-java/c4f22277-6831-442c-8bc3-1be41a79fdff/scratchpad/exemplars
HERE=$(dirname "$0")

# 1) presence per repo (excluding conan-center-index, handled separately)
: > "$HERE/deps-conan-presence.tsv"
for d in "$CORPUS"/*/; do
  repo=$(basename "$d")
  [ "$repo" = "conan-io__conan-center-index" ] && continue
  cfpy=$(find "$d" -name 'conanfile.py' 2>/dev/null | wc -l)
  cftxt=$(find "$d" -name 'conanfile.txt' 2>/dev/null | wc -l)
  cdata=$(find "$d" -name 'conandata.yml' 2>/dev/null | wc -l)
  clock=$(find "$d" -name 'conan.lock' 2>/dev/null | wc -l)
  if [ "$cfpy" -gt 0 ] || [ "$cftxt" -gt 0 ] || [ "$cdata" -gt 0 ] || [ "$clock" -gt 0 ]; then
    echo -e "$repo\t$cfpy\t$cftxt\t$cdata\t$clock"
  fi
done >> "$HERE/deps-conan-presence.tsv"

# 2) marker counts across ALL conanfile.py in corpus except CCI (root-repo authors' own recipes)
: > "$HERE/.conanfiles.txt"
find "$CORPUS" -name 'conanfile.py' -not -path '*/conan-io__conan-center-index/*' 2>/dev/null > "$HERE/.conanfiles.txt"
N=$(wc -l < "$HERE/.conanfiles.txt")
count() { local pat="$1"; grep -lE "$pat" $(cat "$HERE/.conanfiles.txt") 2>/dev/null | wc -l; }
REQUIRES=$(count '^\s*(self\.requires\(|requires\s*=)')
TOOLREQ=$(count 'tool_requires|build_requires')
TESTREQ=$(count 'test_requires')
GEN_CMAKEDEPS=$(count 'CMakeDeps')
GEN_CMAKETC=$(count 'CMakeToolchain')
GEN_CMAKECFGDEPS=$(count 'CMakeConfigDeps')
GEN_PKGCONFIGDEPS=$(count 'PkgConfigDeps')
GEN_BAZELDEPS=$(count 'BazelDeps')
GEN_BAZELTC=$(count 'BazelToolchain')
LAYOUT=$(count 'def layout\(')
CMAKELAYOUT=$(count 'cmake_layout')
PKGID=$(count 'def package_id\(')
SETTINGS=$(count '^\s*settings\s*=')
OPTIONS=$(count '^\s*options\s*=')
PYREQ=$(count 'python_requires')
CONAN2IMPORT=$(count 'from conan import ConanFile')
CONAN1IMPORT=$(count 'from conans import ConanFile')
CONAN2TOOLS=$(count 'from conan\.tools\.cmake')
LEGACYCMAKE=$(count 'from conans import.*CMake\b|conans\.CMake\b')

OUT="$HERE/deps-conan.tsv"
{
echo -e "metric\tcount_of_N"
echo -e "N_conanfile.py_scanned_excl_CCI\t$N"
echo -e "requires\t$REQUIRES"
echo -e "tool_requires_or_build_requires\t$TOOLREQ"
echo -e "test_requires\t$TESTREQ"
echo -e "generator_CMakeDeps\t$GEN_CMAKEDEPS"
echo -e "generator_CMakeToolchain\t$GEN_CMAKETC"
echo -e "generator_CMakeConfigDeps\t$GEN_CMAKECFGDEPS"
echo -e "generator_PkgConfigDeps\t$GEN_PKGCONFIGDEPS"
echo -e "generator_BazelDeps\t$GEN_BAZELDEPS"
echo -e "generator_BazelToolchain\t$GEN_BAZELTC"
echo -e "def_layout\t$LAYOUT"
echo -e "cmake_layout_call\t$CMAKELAYOUT"
echo -e "def_package_id\t$PKGID"
echo -e "settings_declared\t$SETTINGS"
echo -e "options_declared\t$OPTIONS"
echo -e "python_requires\t$PYREQ"
echo -e "conan2_import_from_conan\t$CONAN2IMPORT"
echo -e "conan1_import_from_conans\t$CONAN1IMPORT"
echo -e "conan2_tools_cmake_import\t$CONAN2TOOLS"
echo -e "legacy_cmake_helper\t$LEGACYCMAKE"
} > "$OUT"

# 3) CCI: first 40 alphabetically under recipes/ that have a conanfile.py (any variant dir, first found)
CCI="$CORPUS/conan-io__conan-center-index"
: > "$HERE/deps-cci-sample.txt"
if [ -d "$CCI/recipes" ]; then
  ls "$CCI/recipes" | sort | while read -r pkg; do
    f=$(find "$CCI/recipes/$pkg" -name 'conanfile.py' 2>/dev/null | sort | head -1)
    [ -n "$f" ] && echo "$f"
  done | head -40 > "$HERE/deps-cci-sample.txt"
fi
CCI_N=$(wc -l < "$HERE/deps-cci-sample.txt")
cci_count() { local pat="$1"; grep -lE "$pat" $(cat "$HERE/deps-cci-sample.txt") 2>/dev/null | wc -l; }
{
echo -e "metric\tcount_of_$CCI_N"
echo -e "N_sampled\t$CCI_N"
echo -e "requires\t$(cci_count '^\s*(self\.requires\(|requires\s*=)')"
echo -e "tool_requires_or_build_requires\t$(cci_count 'tool_requires|build_requires')"
echo -e "test_requires\t$(cci_count 'test_requires')"
echo -e "generator_CMakeDeps\t$(cci_count 'CMakeDeps')"
echo -e "generator_CMakeToolchain\t$(cci_count 'CMakeToolchain')"
echo -e "generator_PkgConfigDeps\t$(cci_count 'PkgConfigDeps')"
echo -e "def_layout\t$(cci_count 'def layout\(')"
echo -e "cmake_layout_call\t$(cci_count 'cmake_layout')"
echo -e "def_package_id\t$(cci_count 'def package_id\(')"
echo -e "python_requires\t$(cci_count 'python_requires')"
echo -e "conan2_import\t$(cci_count 'from conan import ConanFile')"
echo -e "conan1_import\t$(cci_count 'from conans import ConanFile')"
echo -e "config.yml_present_for_sampled_pkgs\t$(find "$CCI/recipes" -maxdepth 1 -name config.yml 2>/dev/null | wc -l)_repo_total_not_per_sample"
echo -e "test_package_CMakeLists_present\t$(for f in $(cat "$HERE/deps-cci-sample.txt"); do d=$(dirname "$f"); [ -f "$d/test_package/CMakeLists.txt" ] && echo y; done | wc -l)"
} > "$HERE/deps-cci-sample.tsv"

# 4) conan-io/conan and conan-io/cmake-conan CMake integration files
: > "$HERE/deps-conan-cmake-integration.tsv"
for repo in conan-io__conan conan-io__cmake-conan; do
  d="$CORPUS/$repo"
  find "$d" -iname 'conan_provider.cmake' -o -iname 'conan.cmake' 2>/dev/null | while read -r f; do
    minver=$(grep -m1 -iE 'cmake_minimum_required' "$f" 2>/dev/null)
    echo -e "$repo\t${f#"$d"}\t$minver"
  done
done >> "$HERE/deps-conan-cmake-integration.tsv"

rm -f "$HERE/.conanfiles.txt"
echo "wrote deps-conan.tsv, deps-conan-presence.tsv, deps-cci-sample.tsv, deps-conan-cmake-integration.tsv"
