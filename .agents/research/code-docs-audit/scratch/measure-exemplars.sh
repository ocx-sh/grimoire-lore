#!/usr/bin/env bash
# Runs comment_census.py over every exemplar at HEAD and at its pre-2022 snapshot.
# Output: <out>/<repo>@{head,snap}.json (group=lang, scope=all).
set -u
EX=${EX:-$HOME/.cache/research-lang/exemplars/code-docs}
HERE=$(cd "$(dirname "$0")" && pwd)
C=$HERE/../../../../rules/code-docs/checks/comment_census.py
OUT=$HERE/exemplars
mkdir -p "$OUT"
while IFS=$'\t' read -r repo lang kind head hdate snap sdate; do
  dir=$EX/${repo//\//__}
  name=${repo//\//__}
  for which in head snap; do
    sha=$head; [ "$which" = snap ] && sha=$snap
    [ "$sha" = "-" ] && continue
    [ -s "$OUT/$name@$which.json" ] && continue
    git -C "$dir" -c advice.detachedHead=false checkout -q -f "$sha" || { echo "checkout fail $repo $which" >&2; continue; }
    python3 "$C" --root "$dir" --group lang --scope all --format json > "$OUT/$name@$which.json"
    echo "measured $repo $which"
  done
done < "$EX/shas.tsv"
