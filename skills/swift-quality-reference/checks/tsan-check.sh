#!/usr/bin/env bash
# tsan-check.sh: SW-GATE-27, the ThreadSanitizer job. Fails only on a real data race, a failing test or a missing
# passing run. Run inside the Docker image with --security-opt seccomp=unconfined, from the package root; extra
# arguments go to `swift test` (for example --filter and --scratch-path).
# Usage: [TSAN_TIMEOUT=1200] bash tsan-check.sh [--filter Suite.test] [--scratch-path DIR]
# Scratch path: inside a container (/.dockerenv or /run/.containerenv) the script adds `--scratch-path ${TMPDIR:-/tmp}/tsan-scratch`
# unless you pass your own. A root container writing .build into a host mount leaves root-owned directories and a module cache
# path that the next host build rejects ("precompiled file ... was compiled with module cache path", measured 2026-10-10);
# a scratch path outside the mount keeps the host .build untouched.
# Timeout: `swift test` runs under `timeout -k 30 ${TSAN_TIMEOUT:-1200}` (seconds). One of three runs on PromiseKit hung
# 8+ minutes at 0% CPU behind a defunct test runner (`ThreadSanitizer: CHECK failed: tsan_rtl.cpp:1086`), so a hang is exit 70, not a wait.
# Exit: 0 clean; 1 a "WARNING: ThreadSanitizer: data race" report or a failing test (the matching lines are printed);
#       70 the check did not run: "FATAL: ThreadSanitizer" (Docker seccomp or ASLR), "ThreadSanitizer: CHECK failed"
#       (a runtime abort), a timeout (swift test killed after TSAN_TIMEOUT seconds), a build failure, or no passing
#       test-run line (the tail of the log is printed). 69 `timeout` (GNU coreutils) is not installed. A run of zero tests (a --filter that matches nothing) is no passing run.
# "Swift access race" reports are never counted: on Linux with Swift 6.3 and 6.4 a correct Mutex produces them.
# Write no TSan suppressions: every suppression tried either left the false positive or hid a real race.
# Watched on Swift 6.4.0 and 6.3.3 (measured 2026-10-10): correct Mutex, Gauge and Registry twins exit 0; an unguarded
# counter behind @unchecked Sendable, two Mutexes guarding one variable and a half-guarded type exit 1 with the
# data race line printed; a failing #expect or XCTAssertEqual exits 1; a package that does not build exits 70.
# In the container with no scratch flag no .build appeared beside Package.swift; TSAN_TIMEOUT=2 exited 70 after 124, and a stub swift
# printing `ThreadSanitizer: CHECK failed` exited 70. PromiseKit (`swift test` exit 1 with two CHECK failed lines) now exits 70 in 3 of 3 runs, none hung (measured 2026-10-10).
set -u
command -v timeout > /dev/null || { echo 'tsan-check: timeout (GNU coreutils) not found' >&2; exit 69; }
log=$(mktemp)
trap 'rm -f "$log"' EXIT
scratch=()
if [ -e /.dockerenv ] || [ -e /run/.containerenv ]; then
  scratch=(--scratch-path "${TMPDIR:-/tmp}/tsan-scratch")
  for a in "$@"; do case $a in --scratch-path | --scratch-path=* | --build-path | --build-path=*) scratch=() ;; esac; done
fi
timeout -k 30 "${TSAN_TIMEOUT:-1200}" swift test --sanitize=thread ${scratch[@]+"${scratch[@]}"} "$@" > "$log" 2>&1
rc=$?
if [ "$rc" -eq 124 ] || [ "$rc" -eq 137 ]; then
  tail -n 20 "$log" >&2
  echo "FAIL: swift test outran TSAN_TIMEOUT=${TSAN_TIMEOUT:-1200} seconds and was killed (exit $rc)" >&2
  exit 70
fi
if grep -q -F -e 'FATAL: ThreadSanitizer' -e 'ThreadSanitizer: CHECK failed' "$log"; then
  echo 'FAIL: ThreadSanitizer could not start or aborted (Docker seccomp, ASLR or a runtime CHECK failure)' >&2
  exit 70
fi
if grep -n -F -e 'WARNING: ThreadSanitizer: data race' "$log"; then exit 1; fi
if grep -n -E -e 'Test run with [0-9]+ tests? .*failed' -e 'Executed [0-9]+ tests?, with [1-9][0-9]* failures?' "$log"; then exit 1; fi
if ! grep -q -E -e 'Test run with [1-9][0-9]* tests? .*passed' -e 'Executed [1-9][0-9]* tests?, with 0 failures' "$log"; then
  tail -n 20 "$log" >&2
  echo 'FAIL: no passing test-run line' >&2
  exit 70
fi
exit 0
