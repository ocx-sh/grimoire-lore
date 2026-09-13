#!/usr/bin/env bash
# Axis 1b: pom metadata fields, plugin-publish block fields, version scheme, snapshot usage.
set -uo pipefail
EXDIR=/tmp/claude-1000/-home-mherwig-dev-grimoire-lore--agents-worktrees-cmake/0338694a-012b-46c4-935e-41953f5c1ce2/scratchpad/exemplars
cd "$EXDIR" || exit 1

printf 'repo\tpom_name\tpom_desc\tpom_url\tpom_licenses\tpom_developers\tpom_scm\tgp_website\tgp_vcsurl\tgp_tags\tvalidatePlugins\tversion_axion\tversion_nebula\tversion_reckon\tversion_gitversion\tsnapshot_usage\tversion_in_props\n'
for d in */; do
  r="${d%/}"
  gfiles=$(find "$r" -maxdepth 10 \( -name '*.gradle' -o -name '*.gradle.kts' \) 2>/dev/null)
  pomfiles=$(find "$r" -maxdepth 10 -name 'pom.xml' 2>/dev/null)
  propfiles=$(find "$r" -maxdepth 2 -name 'gradle.properties' 2>/dev/null)

  pm() { [ -z "$pomfiles" ] && { echo 0; return; }; grep -lF "$1" $pomfiles 2>/dev/null | wc -l; }
  gp() { [ -z "$gfiles" ] && { echo 0; return; }; grep -lE "$1" $gfiles 2>/dev/null | wc -l; }

  # pom metadata: only meaningful in pom{} publishing blocks (Gradle) OR project-level fields (Maven POM). Count files with each element within a publishing pom{} or a real pom.xml <project> element.
  pom_name=$(( $(gp 'pom \{[^}]*$|^\s*name\.set\(') + $(pm '<name>') ))
  pom_desc=$(( $(gp 'description\.set\(') + $(pm '<description>') ))
  pom_url=$(( $(gp 'url\.set\(') + $(pm '<url>') ))
  pom_licenses=$(( $(gp 'licenses \{|license \{') + $(pm '<licenses>') ))
  pom_developers=$(( $(gp 'developers \{|developer \{') + $(pm '<developers>') ))
  pom_scm=$(( $(gp 'scm \{') + $(pm '<scm>') ))

  gp_website=$(gp 'website\.set\(|website =')
  gp_vcsurl=$(gp 'vcsUrl\.set\(|vcsUrl =')
  gp_tags=$(gp 'tags\.set\(|tags\.addAll|tags =')
  validatePlugins=$(gp 'validatePlugins')

  version_axion=$(gp 'pl\.allegro\.tech\.build\.axion-release')
  version_nebula=$(gp 'com\.netflix\.nebula\.(nebula-)?release|nebula-release')
  version_reckon=$(gp 'org\.ajoberstar\.reckon')
  version_gitversion=$(gp 'com\.palantir\.git-version|gradle-git-version')

  snapshot_usage=$(gp 'SNAPSHOT')
  pp() { [ -z "$propfiles" ] && { echo 0; return; }; grep -lE "$1" $propfiles 2>/dev/null | wc -l; }
  version_in_props=$(pp '^version\s*=')

  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
    "$r" "$pom_name" "$pom_desc" "$pom_url" "$pom_licenses" "$pom_developers" "$pom_scm" \
    "$gp_website" "$gp_vcsurl" "$gp_tags" "$validatePlugins" \
    "$version_axion" "$version_nebula" "$version_reckon" "$version_gitversion" "$snapshot_usage" "$version_in_props"
done
