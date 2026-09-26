#!/usr/bin/env bash
# Axis 9: CI census over .github/workflows + .gitlab-ci.yml
set -uo pipefail
CORPUS=/tmp/claude-1000/-home-mherwig-dev-grimoire-lore--agents-worktrees-java/c4f22277-6831-442c-8bc3-1be41a79fdff/scratchpad/exemplars
HERE=$(dirname "$0")

hitfiles() { grep -rlE "$1" "$CORPUS" --include='*.yml' --include='*.yaml' 2>/dev/null | grep -E '\.github/workflows/|\.gitlab-ci\.yml$'; }
hitrepos() { hitfiles "$1" | sed "s#$CORPUS/##" | cut -d/ -f1 | sort -u; }

{
echo -e "metric\trepos_n\trepo_list"
for label_pat in \
  "lukka/get-cmake:lukka/get-cmake" \
  "jwlawson/actions-setup-cmake:jwlawson/actions-setup-cmake" \
  "pip install cmake or pip3 install cmake:pip[3]? install[^\\\\n]*cmake" \
  "apt-get install cmake or apt install cmake:apt(-get)?[^\\\\n]*install[^\\\\n]*cmake" \
  "cmake --preset(s):cmake --preset" \
  "-Werror=dev:-Werror=dev" \
  "--warn-uninitialized:--warn-uninitialized" \
  "sanitizer -fsanitize:-fsanitize=" \
  "ccache-action hendrikmuhs:hendrikmuhs/ccache-action" \
  "sccache-action mozilla:mozilla-actions/sccache-action" \
  "lukka/run-vcpkg:lukka/run-vcpkg" \
  "actions/cache keyed on vcpkg.json:actions/cache[^\\\\n]{0,400}vcpkg\\.json" \
  "actions/cache keyed on conan.lock:actions/cache[^\\\\n]{0,400}conan\\.lock" \
  "conan cache save/restore action:conan-io/run-conan" \
  "generator Ninja Multi-Config:Ninja Multi-Config" \
  "generator Visual Studio:Visual Studio [0-9]+ 20" \
  "generator Xcode:-G[ '\"]*Xcode" \
  "CMAKE_BUILD_TYPE matrix var:CMAKE_BUILD_TYPE" \
  "install-tree consumption (--install flag):cmake --install" \
  ; do
  label="${label_pat%%:*}"; pat="${label_pat#*:}"
  repos=$(hitrepos "$pat")
  n=$(echo "$repos" | grep -c . || echo 0)
  echo -e "$label\t$n\t$(echo "$repos" | tr '\n' ',')"
done
} > "$HERE/deps-ci.tsv"

# OS matrix count per repo (rough: count distinct runs-on / os: entries across workflow files)
: > "$HERE/deps-ci-os.tsv"
for d in "$CORPUS"/*/; do
  repo=$(basename "$d")
  wf="$d/.github/workflows"
  [ -d "$wf" ] || continue
  oses=$(grep -rhoE "runs-on:\s*\[?[^,\]\n]*" "$wf" 2>/dev/null | sed -E 's/runs-on:\s*\[?//' | tr -d '"' | sed -E 's/^\s+|\s+$//g' | sort -u | grep -viE '\$\{\{' | grep -viE '^(self-hosted|group:)')
  matrix_os=$(grep -rhoE 'ubuntu-[0-9.]+|windows-[0-9]+|macos-[0-9.]+|macos-latest|windows-latest|ubuntu-latest' "$wf" 2>/dev/null | sort -u | tr '\n' ',')
  echo -e "$repo\t$matrix_os"
done >> "$HERE/deps-ci-os.tsv"

echo "wrote deps-ci.tsv, deps-ci-os.tsv"
