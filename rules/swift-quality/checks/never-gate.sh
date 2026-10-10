#!/usr/bin/env bash
# never-gate.sh: SW-GATE-28, the three Never* swift-format rules (NeverForceUnwrap, NeverUseForceTry,
# NeverUseImplicitlyUnwrappedOptionals) on changed Swift files only, for adopted repositories whose .swift-format keeps them off.
# Usage: BASE=origin/main bash never-gate.sh      (run from the repository root; BASE = the merge target, default main)
# The repository's own .swift-format is copied to a mktemp overlay with the three values set to true, so nothing
# tracked changes (SW-GATE-05). The overlay needs the full rules block (SW-GATE-06). New repositories gate the whole
# tree through SW-ERR-05 and do not need this script.
# Exit: 0 clean; 123 `swift format lint --strict` found a finding in a changed file (xargs folds the tool's 1 into 123);
#       65 the overlay does not switch on all three rules (no full rules block); 66 no .swift-format, or BASE does not resolve.
# --merge-base compares the work tree with the merge base of BASE and HEAD: committed, uncommitted and (after `git add -A`,
# which changes the index and no file) untracked files are all seen, and a branch behind BASE is not charged for BASE's
# changes. Needs git 2.30 or newer and swift-format from Swift 6.0 or newer. Works in a git worktree.
# The rules skip a file that imports Testing or XCTest. File granularity: touching a dirty file means repairing its findings.
# Watched red and green on Swift 6.4.0 and 6.3.3 (measured 2026-10-10): main, a new clean file and a branch behind main
# exit 0; a force unwrap added to a clean file, a comment appended to a legacy file, `Int!`/`try!`/`as!` in a new file,
# an uncommitted edit and an untracked new file exit 123; no config exits 66, a config without the rules block exits 65.
set -u
BASE=${BASE:-main}
[ -f .swift-format ] || { echo 'MISSING .swift-format'; exit 66; }
git rev-parse --verify --quiet "${BASE}^{commit}" > /dev/null || { echo "MISSING BASE: $BASE does not resolve"; exit 66; }
overlay=$(mktemp)
list=$(mktemp)
trap 'rm -f "$overlay" "$list"' EXIT
sed -e 's/"NeverForceUnwrap" *: *false/"NeverForceUnwrap" : true/' \
  -e 's/"NeverUseForceTry" *: *false/"NeverUseForceTry" : true/' \
  -e 's/"NeverUseImplicitlyUnwrappedOptionals" *: *false/"NeverUseImplicitlyUnwrappedOptionals" : true/' .swift-format > "$overlay"
grep -c -E -e '"NeverForceUnwrap" *: *true' -e '"NeverUseForceTry" *: *true' -e '"NeverUseImplicitlyUnwrappedOptionals" *: *true' "$overlay" | grep -q -x 3 || { echo 'overlay does not enable the three Never rules'; exit 65; }
git add -A -- '*.swift'
git diff --name-only -z --diff-filter=ACMR --merge-base "$BASE" -- '*.swift' > "$list" || { echo 'MISSING BASE: git diff failed'; exit 66; }
xargs -r -0 swift format lint --strict --configuration "$overlay" < "$list"
