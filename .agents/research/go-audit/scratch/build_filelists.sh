#!/usr/bin/env bash
# Build per-repo file lists: non-test, non-generated .go files, excluding vendor/testdata/third_party.
set -u
EXROOT=/home/mherwig/.cache/research-lang/exemplars/go
OUT=/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/.agents/research/go-audit/scratch/filelists
mkdir -p "$OUT"
: > /home/mherwig/dev/grimoire-lore/.agents/worktrees/go/.agents/research/go-audit/scratch/loc.tsv
for repodir in "$EXROOT"/*/; do
  repo=$(basename "$repodir")
  [ "$repo" = "kubernetes__kubernetes" ] && continue
  listfile="$OUT/$repo.txt"
  : > "$listfile.tmp"
  # all .go files, excluding vendor/testdata/third_party dirs and _test.go
  find "$repodir" -type f -name '*.go' \
    -not -path '*/vendor/*' \
    -not -path '*/testdata/*' \
    -not -path '*/third_party/*' \
    -not -name '*_test.go' \
    > "$listfile.all"
  # filter out generated files (first line matches Code generated .* DO NOT EDIT)
  gencount=0
  total=0
  while IFS= read -r f; do
    total=$((total+1))
    firstline=$(head -n 3 "$f" 2>/dev/null | tr -d '\r')
    if printf '%s\n' "$firstline" | grep -qE 'Code generated .* DO NOT EDIT'; then
      gencount=$((gencount+1))
      continue
    fi
    printf '%s\n' "$f" >> "$listfile.tmp"
  done < "$listfile.all"
  mv "$listfile.tmp" "$listfile"
  rm -f "$listfile.all"
  loc=$(xargs -a "$listfile" -d '\n' cat 2>/dev/null | wc -l)
  nfiles=$(wc -l < "$listfile")
  echo -e "$repo\t$nfiles\t$loc\t$gencount" >> /home/mherwig/dev/grimoire-lore/.agents/worktrees/go/.agents/research/go-audit/scratch/loc.tsv
  echo "done $repo: files=$nfiles loc=$loc generated_excluded=$gencount"
done
