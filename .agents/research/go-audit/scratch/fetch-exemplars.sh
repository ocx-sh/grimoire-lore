#!/usr/bin/env bash
# Go exemplar corpus for the research-lang Go program.
# Depth-1 clones with full source (Go measurement needs .go files), except SPARSE repos,
# which get a blob-less clone with a sparse checkout of module/config/CI files only.
# Usage: fetch-exemplars.sh <dest-dir>   (never a tmpfs path; use ~/.cache/research-lang/exemplars/go)
set -u
DEST="$1"; mkdir -p "$DEST"
FULL=(
  cli/cli goreleaser/goreleaser google/go-containerregistry oras-project/oras-go oras-project/oras
  sigstore/cosign regclient/regclient ko-build/ko junegunn/fzf charmbracelet/bubbletea
  spf13/cobra urfave/cli uber-go/zap google/go-cmp stretchr/testify golang/tools golang/vuln
  google/go-github prometheus/prometheus etcd-io/etcd caddyserver/caddy tailscale/tailscale
  kubernetes-sigs/controller-runtime containerd/containerd cockroachdb/pebble restic/restic
  syncthing/syncthing grpc/grpc-go golangci/golangci-lint dominikh/go-tools
  bazel-contrib/rules_go bazelbuild/bazel-gazelle hashicorp/terraform aquasecurity/trivy
)
SPARSE=( kubernetes/kubernetes )
full() {
  local repo="$1" dir="$DEST/${1//\//__}"
  [ -d "$dir/.git" ] && { echo "skip $repo"; return; }
  git clone -q --depth 1 --single-branch "https://github.com/$repo.git" "$dir" 2>&1 | tail -1
  echo "ok   $repo $(git -C "$dir" rev-parse HEAD) $(git -C "$dir" ls-files '*.go' | wc -l) go-files"
}
sparse() {
  local repo="$1" dir="$DEST/${1//\//__}"
  [ -d "$dir/.git" ] && { echo "skip $repo"; return; }
  git clone -q --filter=blob:none --depth 1 --no-checkout "https://github.com/$repo.git" "$dir" 2>&1 | tail -1
  git -C "$dir" sparse-checkout set --no-cone '/*' '!/**/*.go' '!/vendor/**' '/**/go.mod' '/**/go.work' '/hack/**' '/.github/**' '/build/**' '!/**/*.png' 2>/dev/null
  git -C "$dir" checkout -q 2>&1 | tail -1
  echo "ok   $repo $(git -C "$dir" rev-parse HEAD) sparse $(git -C "$dir" ls-tree -r --name-only HEAD | grep -c '\.go$') go-files-tracked"
}
export -f full sparse; export DEST
printf '%s\n' "${FULL[@]}" | xargs -P 6 -I{} bash -c 'full {}'
printf '%s\n' "${SPARSE[@]}" | xargs -P 1 -I{} bash -c 'sparse {}'
echo DONE
