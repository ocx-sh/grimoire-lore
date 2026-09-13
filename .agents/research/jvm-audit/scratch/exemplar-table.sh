#!/usr/bin/env bash
# Print the exemplar table: repo | HEAD sha | build system(s) detected | DSL | files checked out.
# Usage: exemplar-table.sh <exemplars-dir>
D="$1"
printf '| repo | sha | build systems | gradle dsl | build-logic | checked-out files |\n|---|---|---|---|---|---|\n'
for dir in "$D"/*/; do
  repo="$(basename "$dir" | sed 's|__|/|')"
  sha="$(git -C "$dir" rev-parse --short=10 HEAD 2>/dev/null)"
  tree="$(git -C "$dir" ls-tree -r --name-only HEAD 2>/dev/null)"
  bs=""
  grep -qE '(^|/)(build\.gradle(\.kts)?|settings\.gradle(\.kts)?)$' <<<"$tree" && bs="$bs gradle"
  grep -qE '(^|/)pom\.xml$' <<<"$tree" && bs="$bs maven"
  grep -qE '(^|/)(BUILD|BUILD\.bazel|MODULE\.bazel|WORKSPACE)$' <<<"$tree" && bs="$bs bazel"
  grep -qE '(^|/)build\.xml$' <<<"$tree" && bs="$bs ant"
  kts=$(grep -cE '\.gradle\.kts$' <<<"$tree"); groovy=$(grep -cE '\.gradle$' <<<"$tree")
  dsl="kts=$kts groovy=$groovy"
  bl=""
  grep -qE '^buildSrc/' <<<"$tree" && bl="$bl buildSrc"
  grep -qE '^build-logic/' <<<"$tree" && bl="$bl build-logic"
  grep -qE '^gradle/plugins/' <<<"$tree" && bl="$bl gradle/plugins"
  grep -qE '(^|/)libs\.versions\.toml$' <<<"$tree" && bl="$bl catalog"
  n=$(find "$dir" -type f -not -path '*/.git/*' | wc -l)
  printf '| %s | `%s` | %s | %s | %s | %s |\n' "$repo" "$sha" "${bs# }" "$dsl" "${bl# }" "$n"
done
