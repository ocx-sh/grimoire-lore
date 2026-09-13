#!/usr/bin/env bash
# Axis 5: dependency-drift and security automation roll-up.
set -uo pipefail
EXDIR=/tmp/claude-1000/-home-mherwig-dev-grimoire-lore--agents-worktrees-cmake/0338694a-012b-46c4-935e-41953f5c1ce2/scratchpad/exemplars
cd "$EXDIR" || exit 1

echo -e "repo\tgradle_lockfile\tverif_metadata\tmaven_install_json\tcyclonedx\tlicense_plugin\towasp_depcheck\tsnyk"
for d in */; do
  r="${d%/}"
  paths=$(git -C "$r" ls-tree -r --name-only HEAD 2>/dev/null)
  gradle_lockfile=$(printf '%s\n' "$paths" | grep -c 'gradle\.lockfile$')
  verif_metadata=$(printf '%s\n' "$paths" | grep -c 'verification-metadata\.xml$')
  maven_install_json=$(printf '%s\n' "$paths" | grep -cE '(^|/)maven_install\.json$')
  gfiles=$(find "$r" -maxdepth 10 \( -name '*.gradle' -o -name '*.gradle.kts' \) 2>/dev/null)
  pomfiles=$(find "$r" -maxdepth 10 -name 'pom.xml' 2>/dev/null)
  gg() { [ -z "$gfiles" ] && { echo 0; return; }; grep -lE "$1" $gfiles 2>/dev/null | wc -l; }
  pp() { [ -z "$pomfiles" ] && { echo 0; return; }; grep -lE "$1" $pomfiles 2>/dev/null | wc -l; }
  cyclonedx=$(( $(gg "cyclonedx") + $(pp "cyclonedx") ))
  license_plugin=$(( $(gg "hierynomus\.license|license-gradle-plugin") + $(pp "license-maven-plugin") ))
  owasp=$(( $(gg "dependency-check") + $(pp "dependency-check-maven") ))
  snyk=$(grep -rlF "snyk" "$r/.github/workflows" 2>/dev/null | wc -l)
  echo -e "$r\t$gradle_lockfile\t$verif_metadata\t$maven_install_json\t$cyclonedx\t$license_plugin\t$owasp\t$snyk"
done
