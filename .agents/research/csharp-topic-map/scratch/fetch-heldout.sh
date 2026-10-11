#!/usr/bin/env bash
# Held-out trees for phase 8: repos NOT in the 35-repo research corpus. Full blob-less depth-1 checkouts.
set -u
DEST="$1"; shift
one() {
  local repo="$1" dir="$DEST/${1//\//__}"
  [ -d "$dir/.git" ] && { echo "skip $repo"; return; }
  git clone -q --filter=blob:none --depth 1 "https://github.com/$repo.git" "$dir" 2>&1 | tail -1 || return
  echo "ok   $repo $(git -C "$dir" rev-parse --short=12 HEAD) $(find "$dir" -name '*.cs' -not -path '*/.git/*' | wc -l) cs"
}
export -f one; export DEST
printf '%s\n' "$@" | xargs -P 6 -I{} bash -c 'one "{}"'
echo DONE
