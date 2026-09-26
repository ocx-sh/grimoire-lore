#!/bin/sh
# Re-runnable copy of the M-L-06 measurement: every actions/cache step in
# every exemplar repo's GitHub Actions workflows, printed with 20 lines of
# trailing context so the key:/path: lines that follow are visible.
# Run from the exemplar corpus root, e.g.:
#   cd /home/mherwig/.cache/research-lang/exemplars/cmake && sh actions-cache-grep.sh
set -eu
for d in */; do
  repo="${d%/}"
  find "$repo" -type f \( -path "*/.github/workflows/*.yml" -o -path "*/.github/workflows/*.yaml" -o -name ".gitlab-ci.yml" \) 2>/dev/null | while IFS= read -r f; do
    grep -n "actions/cache" "$f" 2>/dev/null | cut -d: -f1 | while IFS= read -r ln; do
      echo "=== $repo : $f : line $ln ==="
      sed -n "${ln},$((ln+20))p" "$f"
      echo ""
    done
  done
done
