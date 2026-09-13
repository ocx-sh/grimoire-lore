#!/usr/bin/env bash
# Axis 1: publishing config census across all exemplar clones.
set -uo pipefail
EXDIR=/tmp/claude-1000/-home-mherwig-dev-grimoire-lore--agents-worktrees-cmake/0338694a-012b-46c4-935e-41953f5c1ce2/scratchpad/exemplars
cd "$EXDIR" || exit 1

printf 'repo\tvanniktech\tnexus_pub_plugin\tnmcp\tyanand\tjreleaser\tcentral_publishing_mvn\tnexus_staging_mvn\tmaven_publish\tsigning_plugin\tinmem_pgp\tgpgcmd\tmvn_gpg\tsonatype_oss\tcentral_sonatype\tjava_platform\tpom_packaging\tversion_catalog_plugin\tplugin_publish\tautomodname\tmoduleinfo_count\tmultirelease\treproducible\toutputTimestamp\tchangelog_md\n'
for d in */; do
  r="${d%/}"
  # gather all build/pom/properties file contents once (grep -R over checked-out files, git-show fallback skipped for speed: files are locally present per sparse-checkout)
  gfiles=$(find "$r" -maxdepth 10 \( -name '*.gradle' -o -name '*.gradle.kts' -o -name '*.versions.toml' \) 2>/dev/null)
  pomfiles=$(find "$r" -maxdepth 10 -name 'pom.xml' 2>/dev/null)
  propfiles=$(find "$r" -maxdepth 3 -name 'gradle.properties' 2>/dev/null)
  all="$gfiles $propfiles"

  g() { # grep -l count across gradle files
    [ -z "$gfiles" ] && { echo 0; return; }
    grep -lF "$1" $gfiles 2>/dev/null | wc -l
  }
  gp() { # grep pattern (regex) count across gradle files
    [ -z "$gfiles" ] && { echo 0; return; }
    grep -lE "$1" $gfiles 2>/dev/null | wc -l
  }
  pm() { # grep -l count across pom files
    [ -z "$pomfiles" ] && { echo 0; return; }
    grep -lF "$1" $pomfiles 2>/dev/null | wc -l
  }

  vanniktech=$(g "com.vanniktech.maven.publish")
  nexus_pub=$(g "io.github.gradle-nexus.publish-plugin")
  nmcp=$(g "com.gradleup.nmcp")
  yanand=$(g "tech.yanand.maven-central-publish")
  jreleaser=$(( $(g "org.jreleaser") + $(pm "jreleaser") ))
  central_publishing_mvn=$(pm "central-publishing-maven-plugin")
  nexus_staging_mvn=$(pm "nexus-staging-maven-plugin")
  maven_publish=$(gp "maven-publish|MavenPublication")
  signing_plugin=$(gp "id[( ]?[\"']signing[\"']|apply plugin:.?.signing")
  inmem_pgp=$(g "useInMemoryPgpKeys")
  gpgcmd=$(g "useGpgCmd")
  mvn_gpg=$(pm "maven-gpg-plugin")
  sonatype_oss=$(grep -lF "oss.sonatype.org" $gfiles $pomfiles 2>/dev/null | wc -l)
  central_sonatype=$(grep -lF "central.sonatype.com" $gfiles $pomfiles 2>/dev/null | wc -l)
  java_platform=$(gp "id[( ]?[\"']java-platform[\"']")
  pom_packaging=$(pm "<packaging>pom</packaging>")
  version_catalog_plugin=$(gp "id[( ]?[\"']version-catalog[\"']")
  plugin_publish=$(gp "com.gradle.plugin-publish")
  automodname=$(grep -rlF "Automatic-Module-Name" "$r" 2>/dev/null | wc -l)
  moduleinfo_count=$(git -C "$r" ls-tree -r --name-only HEAD 2>/dev/null | grep -c 'module-info\.java$')
  multirelease=$(( $(grep -rlF "Multi-Release" "$r" --include='*.gradle*' 2>/dev/null | wc -l) + $(git -C "$r" ls-tree -r --name-only HEAD 2>/dev/null | grep -c '/java9/\|/java1[0-9]/\|moditect') ))
  reproducible=$(gp "preserveFileTimestamps|reproducibleFileOrder|dirPermissions|filePermissions")
  outputTimestamp=$(pm "project.build.outputTimestamp")
  changelog_md=$(git -C "$r" ls-tree --name-only HEAD 2>/dev/null | grep -ci '^changelog')

  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
    "$r" "$vanniktech" "$nexus_pub" "$nmcp" "$yanand" "$jreleaser" "$central_publishing_mvn" "$nexus_staging_mvn" \
    "$maven_publish" "$signing_plugin" "$inmem_pgp" "$gpgcmd" "$mvn_gpg" "$sonatype_oss" "$central_sonatype" \
    "$java_platform" "$pom_packaging" "$version_catalog_plugin" "$plugin_publish" "$automodname" "$moduleinfo_count" \
    "$multirelease" "$reproducible" "$outputTimestamp" "$changelog_md"
done
