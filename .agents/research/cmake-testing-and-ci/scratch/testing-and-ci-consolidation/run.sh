#!/usr/bin/env bash
# Re-runnable measurements for cmake-testing-and-ci.md (2026-09-26).
# Usage: run.sh <cmake-line: 3.31|4.4>; run from the lore worktree root.
set -u
V=$1; S=${S:-/home/mherwig/.cache/cmake-measure-scratch/testing-and-ci-consolidation}
X="ocx package exec kitware/cmake:$V --"
NINJA_DIR=$(dirname "$(ocx package exec ninja-build/ninja -- sh -c 'command -v ninja')")
B=$S/build-$V; rm -rf "$B"; mkdir -p "$B"
echo "== $V: $($X cmake --version | head -1)"
echo "-- T1 zero tests"
$X cmake -S $S/src/empty -B $B/empty >/dev/null
$X ctest --test-dir $B/empty >/dev/null 2>&1; echo "bare ctest rc=$?"
$X ctest --test-dir $B/empty --no-tests=error >/dev/null 2>&1; echo "--no-tests=error rc=$?"
CTEST_NO_TESTS_ACTION=error $X ctest --test-dir $B/empty >/dev/null 2>&1; echo "CTEST_NO_TESTS_ACTION=error rc=$?"
echo "-- T2 default timeout: include(CTest) vs enable_testing()"
$X cmake -S $S/src/dart -B $B/dart >/dev/null
grep -e '^TimeOut' $B/dart/DartConfiguration.tcl
$X ctest --test-dir $B/dart -V 2>&1 | grep -e 'timeout computed'
$X cmake -S $S/src/plain -B $B/plain >/dev/null
test -e $B/plain/DartConfiguration.tcl && echo "plain: DartConfiguration.tcl present" || echo "plain: no DartConfiguration.tcl"
$X ctest --test-dir $B/plain -V 2>&1 | grep -e 'timeout computed'
$X ctest --test-dir $B/plain --timeout 1 >/dev/null 2>&1; echo "plain --timeout 1 on a 3s test rc=$?"
echo "-- T3 -C on single-config (Ninja) and missing -C on Ninja Multi-Config"
PATH="$NINJA_DIR:$PATH" $X cmake -G Ninja -S $S/src/multi -B $B/single >/dev/null
$X ctest --test-dir $B/single -C Release >/dev/null 2>&1; echo "single-config -C Release rc=$?"
PATH="$NINJA_DIR:$PATH" $X cmake -G "Ninja Multi-Config" -S $S/src/multi -B $B/multi >/dev/null
$X ctest --test-dir $B/multi 2>&1 | grep -e 'not available' -e 'tests passed' -e 'tests failed' | head -3
$X ctest --test-dir $B/multi >/dev/null 2>&1; echo "multi-config no -C rc=$?"
$X ctest --test-dir $B/multi -C Debug >/dev/null 2>&1; echo "multi-config -C Debug rc=$?"
echo "-- T4 WILL_FAIL sentinel vs direct failure"
$X cmake -S $S/src/sentinel -B $B/sentinel >/dev/null
$X ctest --test-dir $B/sentinel 2>&1 | grep -e 'inverted' -e 'direct' | grep -e 'Passed' -e 'Failed'
