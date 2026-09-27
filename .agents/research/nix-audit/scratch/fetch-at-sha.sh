#!/usr/bin/env bash
# Re-create the Nix exemplar corpus at the exact SHAs in nix-fetch.log (the audits cite them).
# Usage: fetch-at-sha.sh <dest-dir>   (never tmpfs; use ~/.cache/research-lang/exemplars/nix)
set -u
DEST="$1"; LOG="$(dirname "$0")/nix-fetch.log"; mkdir -p "$DEST"
fetch() {
  local repo="$1" sha="$2" dir="$DEST/${1//\//__}"
  [ -d "$dir/.git" ] && { echo "skip $repo"; return; }
  git init -q "$dir" && git -C "$dir" remote add origin "https://github.com/$repo.git"
  git -C "$dir" config core.sparseCheckout true
  if [ "$repo" = NixOS/nixpkgs ]; then
    git -C "$dir" sparse-checkout set --no-cone '/*' '/lib/**' '/doc/**' '/ci/**' '/.github/**' \
      '/pkgs/README.md' '/pkgs/by-name/README.md' '/pkgs/build-support/**' \
      '/nixos/doc/manual/development/**' '/maintainers/scripts/**' 2>/dev/null
  else
    git -C "$dir" sparse-checkout set --no-cone '/*' '/**/*.nix' '/**/flake.lock' '/.github/**' \
      '/nix/**' '!/**/*.png' '!/**/*.jpg' '!/**/*.svg' 2>/dev/null
  fi
  git -C "$dir" fetch -q --filter=blob:none --depth 1 origin "$sha" && git -C "$dir" checkout -q FETCH_HEAD \
    && echo "ok   $repo $(git -C "$dir" rev-parse HEAD)" || echo "FAIL $repo $sha"
}
export -f fetch; export DEST
awk '$1=="ok"{print $2, $3}' "$LOG" | xargs -P 6 -n 2 bash -c 'fetch "$0" "$1"'
echo DONE
