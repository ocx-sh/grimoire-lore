#!/usr/bin/env bash
# Swift exemplar corpus for the research-lang Swift program.
# Blob-less depth-1 clones with a sparse checkout that drops binary assets
# (images, xcassets, video, archives); every source, manifest and config file is present.
# Usage: fetch-exemplars.sh <dest-dir>   (never a tmpfs path; use ~/.cache/research-lang/exemplars/swift)
set -u
DEST="$1"; mkdir -p "$DEST"
REPOS=(
  # swiftlang / apple core libraries and tools
  apple/swift-nio apple/swift-argument-parser apple/swift-collections apple/swift-async-algorithms
  apple/swift-log apple/swift-crypto apple/swift-system apple/swift-openapi-generator
  apple/swift-protobuf apple/swift-distributed-tracing apple/swift-container-plugin
  apple/containerization apple/container
  swiftlang/swift-format swiftlang/swift-syntax swiftlang/swift-testing swiftlang/swift-package-manager
  swiftlang/swift-foundation swiftlang/sourcekit-lsp swiftlang/swiftly swiftlang/swift-build
  swiftlang/swift-embedded-examples
  # server ecosystem
  swift-server/async-http-client swift-server/swift-service-lifecycle grpc/grpc-swift-2
  vapor/vapor hummingbird-project/hummingbird swift-server/swift-aws-lambda-runtime
  # community libraries, tools, apps
  pointfreeco/swift-composable-architecture pointfreeco/swift-dependencies pointfreeco/swift-snapshot-testing
  Alamofire/Alamofire kean/Nuke realm/SwiftLint nicklockwood/SwiftFormat tuist/tuist
  Dimillian/IceCubesApp element-hq/element-x-ios
  # build systems and other platforms
  bazelbuild/rules_swift swiftwasm/JavaScriptKit
)
clone() {
  local repo="$1" dir="$DEST/${1//\//__}"
  [ -d "$dir/.git" ] && { echo "skip $repo"; return; }
  git clone -q --filter=blob:none --depth 1 --single-branch --no-checkout "https://github.com/$repo.git" "$dir" 2>&1 | tail -1
  git -C "$dir" sparse-checkout set --no-cone '/*' '!/**/*.png' '!/**/*.jpg' '!/**/*.jpeg' '!/**/*.gif' \
    '!/**/*.pdf' '!/**/*.mp4' '!/**/*.mov' '!/**/*.zip' '!/**/*.tar.gz' '!/**/*.xcassets/**' '!/**/*.ttf' '!/**/*.otf' 2>/dev/null
  git -C "$dir" checkout -q 2>&1 | tail -1
  echo "ok   $repo $(git -C "$dir" rev-parse HEAD) $(git -C "$dir" ls-files '*.swift' | wc -l) swift-files"
}
export -f clone; export DEST
printf '%s\n' "${REPOS[@]}" | grep -v '^#' | xargs -P 6 -I{} bash -c 'clone {}'
echo DONE
