#!/usr/bin/env bash
# fold-check.sh: SW-CORE-13, enableUpcomingFeature literals outside the shared `for target in package.targets`
# loop (the per-target literals `swift package migrate` writes beside it).
# Usage: cd PACKAGE_ROOT && bash fold-check.sh
# Output is the violation: one "file:line: text" per literal outside the loop. Empty output with exit 0 is the pass.
# The loop ends at its matching closing brace, so a literal after the loop prints.
# A manifest that keeps one shared top-level `let swiftSettings: [SwiftSetting] = [...]` array applied to every target
# prints it too: that has no per-target drift, so justify it in the pull request instead of moving it.
# Root manifests only (`-maxdepth 1`): a nested Benchmarks, Tests or Examples manifest is its own package and was printed
# beside the root one (vapor/console-kit Benchmarks/Package.swift: 7 extra lines, measured 2026-10-10); run the check from
# that package's own root to cover it.
# Exit: 0 folded; 1 at least one literal printed; 66 no Package.swift or Package@swift-*.swift found (wrong root:
# an empty result would mean nothing).
# Watched red on a post-migrate package and green on the folded tree (measured 2026-10-10, Swift 6.4.0 and 6.3.3);
# red on a literal placed after a closed loop, green on one inside it (2026-10-10).
set -u
found=$(find . -maxdepth 1 \( -name 'Package.swift' -o -name 'Package@swift-*.swift' \) -not -path '*/.build/*' | head -n 1)
[ -n "$found" ] || { echo 'FOLD-CHECK: no Package.swift or Package@swift-*.swift below the current directory' >&2; exit 66; }
# shellcheck disable=SC2016  # the awk program is single-quoted on purpose
out=$(find . -maxdepth 1 \( -name 'Package.swift' -o -name 'Package@swift-*.swift' \) -not -path '*/.build/*' -print0 | xargs -r -0 awk '
  FNR == 1 { inloop = 0 }
  /^for target in package\.targets/ { inloop = 1; depth = 0; seen = 0 }
  { inside = inloop }
  inloop {
    ob = gsub(/\{/, "{"); cb = gsub(/\}/, "}")
    depth += ob - cb
    if (ob > 0) seen = 1
    if (seen && depth <= 0) inloop = 0
  }
  !inside && /enableUpcomingFeature\(/ { print FILENAME ":" FNR ": " $0 }')
[ -z "$out" ] || { printf '%s\n' "$out"; exit 1; }
