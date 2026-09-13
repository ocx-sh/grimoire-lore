#!/usr/bin/env bash
# Axis 3: CI census across .github/workflows/*.yml (+ alt CI files) for all 32 exemplars.
set -uo pipefail
EXDIR=/tmp/claude-1000/-home-mherwig-dev-grimoire-lore--agents-worktrees-cmake/0338694a-012b-46c4-935e-41953f5c1ce2/scratchpad/exemplars
cd "$EXDIR" || exit 1

cols="repo wf_count setup_java temurin zulu oracle graalvm_jdk java_version_file setup_gradle wrapper_validation config_cache_flag build_cache_flag no_daemon stacktrace build_scan dep_graph_submit mvn_batch m2_cache concurrency_group permissions_block pinned_sha_actions tag_actions codeql dependabot renovate scorecard dep_review_action trivy attest_provenance cosign"
echo "$cols" | tr ' ' '\t'

for d in */; do
  r="${d%/}"
  wfdir="$r/.github/workflows"
  wfs=$(find "$wfdir" -maxdepth 1 \( -name '*.yml' -o -name '*.yaml' \) 2>/dev/null)
  if [ -z "$wfs" ]; then wf_count=0; else wf_count=$(printf '%s\n' "$wfs" | wc -l); fi

  w() { [ -z "$wfs" ] && { echo 0; return; }; grep -lF -- "$1" $wfs 2>/dev/null | wc -l; }
  wE() { [ -z "$wfs" ] && { echo 0; return; }; grep -lE -- "$1" $wfs 2>/dev/null | wc -l; }

  setup_java=$(w "actions/setup-java")
  temurin=$(w "temurin")
  zulu=$(w "zulu")
  oracle=$(wE "distribution: *.?oracle")
  graalvm_jdk=$(w "graalvm")
  java_version_file=$(git -C "$r" ls-tree -r --name-only HEAD 2>/dev/null | grep -cE '(^|/)\.java-version$|(^|/)\.sdkmanrc$|(^|/)\.tool-versions$')
  setup_gradle=$(w "gradle/actions/setup-gradle")
  wrapper_validation=$(w "gradle/wrapper-validation-action")
  config_cache_flag=$(w "configuration-cache")
  build_cache_flag=$(w "build-cache")
  no_daemon=$(w "no-daemon")
  stacktrace=$(w "stacktrace")
  build_scan=$(wE "build-scan|[-][-]scan")
  dep_graph_submit=$(w "dependency-graph")
  mvn_batch=$(wE ' -B | --batch-mode|-ntp')
  m2_cache=$(wE '\.m2/repository|actions/cache.*maven')
  concurrency_group=$(w "concurrency:")
  permissions_block=$(w "permissions:")
  if [ -n "$wfs" ]; then
    pinned_sha_actions=$(grep -ohE 'uses: *[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+@[0-9a-f]{40}' $wfs 2>/dev/null | wc -l)
    tag_actions=$(grep -ohE 'uses: *[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+@v[0-9]' $wfs 2>/dev/null | wc -l)
  else
    pinned_sha_actions=0; tag_actions=0
  fi
  codeql=$(w "github/codeql-action")
  if [ -f "$r/.github/dependabot.yml" ] || [ -f "$r/.github/dependabot.yaml" ]; then dependabot=1; else dependabot=0; fi
  renovate=$(git -C "$r" ls-tree -r --name-only HEAD 2>/dev/null | grep -cE '(^|/)renovate\.json5?$|(^|/)\.renovaterc')
  scorecard=$(w "ossf/scorecard-action")
  dep_review_action=$(w "actions/dependency-review-action")
  trivy=$(wE "aquasecurity/trivy|anchore/scan-action")
  attest_provenance=$(w "actions/attest-build-provenance")
  cosign=$(w "sigstore/cosign")

  vals="$r $wf_count $setup_java $temurin $zulu $oracle $graalvm_jdk $java_version_file $setup_gradle $wrapper_validation $config_cache_flag $build_cache_flag $no_daemon $stacktrace $build_scan $dep_graph_submit $mvn_batch $m2_cache $concurrency_group $permissions_block $pinned_sha_actions $tag_actions $codeql $dependabot $renovate $scorecard $dep_review_action $trivy $attest_provenance $cosign"
  echo "$vals" | tr ' ' '\t'
done
