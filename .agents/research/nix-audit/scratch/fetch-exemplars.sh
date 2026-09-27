#!/usr/bin/env bash
# Nix exemplar corpus for the research-lang Nix program.
# Blob-less depth-1 clones with a non-cone sparse checkout of Nix, lock, CI and root files.
# nixpkgs gets a narrower sparse set (lib, docs, CI, build-support, conventions).
# Usage: fetch-exemplars.sh <dest-dir>   (never tmpfs; use ~/.cache/research-lang/exemplars/nix)
set -u
DEST="$1"; mkdir -p "$DEST"
REPOS=(
  # app flakes: package the repo's own source
  helix-editor/helix jj-vcs/jj ghostty-org/ghostty zed-industries/zed typst/typst
  sxyazi/yazi direnv/direnv Mic92/nixpkgs-review DeterminateSystems/nix-installer
  DeterminateSystems/flake-checker cachix/devenv cachix/cachix NixOS/nix nix-community/nixd
  numtide/treefmt oxalica/nil nix-community/nix-index
  # library / framework / module flakes
  hercules-ci/flake-parts numtide/flake-utils numtide/treefmt-nix numtide/blueprint
  cachix/git-hooks.nix ipetkov/crane nix-community/home-manager nix-darwin/nix-darwin
  nix-community/disko Mic92/sops-nix
  # generated / index-driven flakes (the ocx analog)
  mitchellh/zig-overlay oxalica/rust-overlay nix-community/fenix nix-community/nix-index-database
  nix-community/nix-vscode-extensions numtide/llm-agents.nix stackbuilders/nixpkgs-terraform
  cachix/nixpkgs-python
  # templates
  NixOS/templates the-nix-way/dev-templates
)
fetch() {
  local repo="$1" dir="$DEST/${1//\//__}"
  [ -d "$dir/.git" ] && { echo "skip $repo"; return; }
  git clone -q --filter=blob:none --depth 1 --no-checkout "https://github.com/$repo.git" "$dir" 2>&1 | tail -1
  if [ "$repo" = NixOS/nixpkgs ]; then
    git -C "$dir" sparse-checkout set --no-cone '/*' '/lib/**' '/doc/**' '/ci/**' '/.github/**' \
      '/pkgs/README.md' '/pkgs/by-name/README.md' '/pkgs/build-support/**' \
      '/nixos/doc/manual/development/**' '/maintainers/scripts/**' 2>/dev/null
  else
    git -C "$dir" sparse-checkout set --no-cone '/*' '/**/*.nix' '/**/flake.lock' '/.github/**' \
      '/nix/**' '!/**/*.png' '!/**/*.jpg' '!/**/*.svg' 2>/dev/null
  fi
  git -C "$dir" checkout -q 2>&1 | tail -1
  echo "ok   $repo $(git -C "$dir" rev-parse HEAD) $(git -C "$dir" log -1 --format=%cs) $(git -C "$dir" ls-files '*.nix' | wc -l) nix-files"
}
export -f fetch; export DEST
{ printf '%s\n' "${REPOS[@]}" | grep -v '^#'; echo NixOS/nixpkgs; } | xargs -P 6 -I{} bash -c 'fetch {}'
echo DONE
