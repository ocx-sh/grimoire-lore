#!/usr/bin/env bash
# Axis 2: fat/shadow jars and distribution shapes.
set -uo pipefail
EXDIR=/tmp/claude-1000/-home-mherwig-dev-grimoire-lore--agents-worktrees-cmake/0338694a-012b-46c4-935e-41953f5c1ce2/scratchpad/exemplars
cd "$EXDIR" || exit 1

printf 'repo\tshadow_johnrengelman\tshadow_gradleup\tshadow_relocate\tshadow_mergeService\tshadow_minimize\tmaven_shade\tshade_relocation\tshade_svc_transformer\tassembly_jwd\tapplication_plugin\tbootJar\tjlink_beryx\tjib\tdockerfile\tgraalvm_native\tbazel_java_binary\tbazel_deploy_jar\n'
for d in */; do
  r="${d%/}"
  gfiles=$(find "$r" -maxdepth 10 \( -name '*.gradle' -o -name '*.gradle.kts' -o -name '*.versions.toml' \) 2>/dev/null)
  pomfiles=$(find "$r" -maxdepth 10 -name 'pom.xml' 2>/dev/null)
  bzlfiles=$(find "$r" -maxdepth 10 \( -name 'BUILD.bazel' -o -name 'BUILD' -o -name '*.bzl' \) 2>/dev/null)

  gg() { [ -z "$gfiles" ] && { echo 0; return; }; grep -lF "$1" $gfiles 2>/dev/null | wc -l; }
  ggE() { [ -z "$gfiles" ] && { echo 0; return; }; grep -lE "$1" $gfiles 2>/dev/null | wc -l; }
  pp() { [ -z "$pomfiles" ] && { echo 0; return; }; grep -lF "$1" $pomfiles 2>/dev/null | wc -l; }
  bb() { [ -z "$bzlfiles" ] && { echo 0; return; }; grep -lF "$1" $bzlfiles 2>/dev/null | wc -l; }

  shadow_j=$(gg "com.github.johnrengelman.shadow")
  shadow_g=$(gg "com.gradleup.shadow")
  shadow_relocate=$(ggE 'relocate\(')
  shadow_merge=$(gg "mergeServiceFiles")
  shadow_min=$(gg "minimize()")
  maven_shade=$(pp "maven-shade-plugin")
  shade_reloc=$(pp "<relocation>")
  shade_svc=$(pp "ServicesResourceTransformer")
  assembly_jwd=$(pp "jar-with-dependencies")
  application_plugin=$(( $(ggE "id[( ]?[\"']application[\"']|apply plugin:.?.application") ))
  bootJar=$(ggE 'bootJar|org\.springframework\.boot')
  jlink=$(gg "org.beryx.jlink")
  jib=$(gg "com.google.cloud.tools.jib")
  dockerfile=$(git -C "$r" ls-tree -r --name-only HEAD 2>/dev/null | grep -ci 'dockerfile')
  graalvm=$(gg "org.graalvm.buildtools.native")
  bazel_java_binary=$(bb "java_binary(")
  bazel_deploy_jar=$(git -C "$r" ls-tree -r --name-only HEAD 2>/dev/null | grep -c '_deploy\.jar$')

  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
    "$r" "$shadow_j" "$shadow_g" "$shadow_relocate" "$shadow_merge" "$shadow_min" \
    "$maven_shade" "$shade_reloc" "$shade_svc" "$assembly_jwd" "$application_plugin" "$bootJar" \
    "$jlink" "$jib" "$dockerfile" "$graalvm" "$bazel_java_binary" "$bazel_deploy_jar"
done
