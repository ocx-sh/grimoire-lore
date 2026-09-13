#!/usr/bin/env bash
# Blob-less, depth-1 clones with a non-cone sparse checkout of build/config files only.
# Source blobs stay on the server and are fetched lazily by `git show HEAD:<path>`.
set -u
DEST="$1"; shift
REPOS=(
  square/okhttp Kotlin/kotlinx.coroutines detekt/detekt junit-team/junit-framework
  spring-projects/spring-boot apache/kafka micronaut-projects/micronaut-core
  google/guava FasterXML/jackson-databind google/dagger grpc/grpc-java bazelbuild/bazel
  GradleUp/shadow gradle/gradle android/nowinandroid apache/maven apache/ant
  google/error-prone cashapp/sqldelight ktorio/ktor JetBrains/Exposed
  apollographql/apollo-kotlin assertj/assertj mockito/mockito
  testcontainers/testcontainers-java bazel-contrib/rules_jvm_external
  bazelbuild/rules_java bazelbuild/rules_kotlin uber/NullAway pinterest/ktlint
  diffplug/spotless gradle/actions
)
one() {
  local repo="$1" name="${1//\//__}" dir="$DEST/${1//\//__}"
  [ -d "$dir/.git" ] && { echo "skip $repo"; return; }
  git clone -q --filter=blob:none --depth 1 --no-checkout "https://github.com/$repo.git" "$dir" 2>&1 | tail -1
  git -C "$dir" sparse-checkout set --no-cone \
    '/*' '!/**/src/**' '!/**/*.java' '!/**/*.kt' '!/**/*.scala' '!/**/*.groovy' '!/**/*.md' '!/**/*.png' '!/**/*.jar' '!/**/*.svg' '!/**/*.jpg' '!/**/*.gif' '!/**/*.html' '!/**/*.css' '!/**/*.js' '!/**/*.ts' '!/**/*.json' '!/**/*.txt' '!/**/*.proto' '!/**/*.c' '!/**/*.cc' '!/**/*.h' '!/**/*.py' '!/**/*.sh' '!/**/*.bat' \
    '/buildSrc/**' '/build-logic/**' '/gradle/**' '/.mvn/**' '/.github/**' '/config/**' '/.bazelrc' '/.bazelversion' 2>/dev/null
  git -C "$dir" checkout -q 2>&1 | tail -1
  echo "ok   $repo $(git -C "$dir" ls-tree -r --name-only HEAD | wc -l) tracked, $(find "$dir" -type f -not -path '*/.git/*' | wc -l) checked out"
}
export -f one; export DEST
printf '%s\n' "${REPOS[@]}" | xargs -P 6 -I{} bash -c 'one {}'
echo DONE
