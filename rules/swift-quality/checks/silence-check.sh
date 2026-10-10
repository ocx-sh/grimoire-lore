#!/usr/bin/env bash
# silence-check.sh: SW-CORE-17, added lines of a diagnosis fix that make the symptom stop instead of removing its
# cause: a sleep, a swallowed error, a quieted race, a longer timeout.
# Usage: BASE=COMMIT_BEFORE_THE_FIX bash silence-check.sh      (run from the repository root; fix committed or staged)
# Output is the violation. Scope: the carrier set of weaken-check.sh without its *.json (Swift, workflow, shell, Make, Just and Rake, TOML, container, unit and env files; no docs). Gate and config
# weakening (enable=no, timeout-minutes, a removed -Werror or sanitizer) belongs to weaken-check.sh (SW-CORE-01): run
# both on the fix. A bare `timeout N` or `--timeout=N` added line prints whether or not N rose, for the reviewer to read.
# Also printed: an added `@unchecked Sendable`, a force cast `as!`, an empty `catch` (one line, or a body of only
# comments), a clock `.sleep(for:)`, libc `sleep(`/`nanosleep(`, `asyncAfter`, a shell `sleep N`, and a raised
# `-solver-expression-time-threshold` or `-solver-memory-threshold`. A TSan suppression (`TSAN_OPTIONS`, `race:`) is weaken-check.sh's.
# Exit: 0 and no output = clean; 1 = at least one line printed; 64 BASE unset; 66 BASE does not resolve.
# The installed rule set (`.claude/`, `.agents/`) is excluded from the diff, as in weaken-check.sh (11 own lines on a fresh
# install, 0 after, measured 2026-10-10).
# Watched red (3 lines on a silencing fix) and green (0 on the cancellation fix) (measured 2026-10-10); also red on
# `swift test --timeout 900`, `timeout 60`, `timeout=30`, `Foundation.usleep(100)`, `try?foo()`, `@unchecked Sendable`,
# `as! Int` and a solver threshold (measured 2026-10-10), green on a doc line.
set -u
[ -n "${BASE:-}" ] || { echo 'silence-check: set BASE to the commit before the fix' >&2; exit 64; }
git rev-parse --verify --quiet "${BASE}^{commit}" > /dev/null || { echo "silence-check: BASE does not resolve: $BASE" >&2; exit 66; }
git add -N . > /dev/null
raw=$(mktemp)
out=$(mktemp)
trap 'rm -f "$raw" "$out"' EXIT
git diff -U0 --merge-base "$BASE" -- '*.swift' '*.yml' '*.yaml' '*.toml' '*.supp' '*.sh' '*.rake' '*.mk' '*.service' '*akefile*' '*[Jj]ustfile' '*Dockerfile*' '*Containerfile*' '.env' '.env.*' '*/.env' '*/.env.*' '*.env' ':(exclude).claude' ':(exclude).agents' > "$raw" || { echo 'silence-check: git diff failed' >&2; exit 66; }
grep -v -e '^+++ ' -e '^--- ' "$raw" |
  grep -E -e '^\+.*(Task\.sleep|Thread\.sleep|\.sleep\((for|until):|nanosleep\(|asyncAfter|try\?|nonisolated\(unsafe\)|@unchecked +Sendable|[[:space:]]as!|solver-(expression-time|memory)-threshold|timeout[ =][0-9]+)' \
    -e '^\+(.*[^[:alnum:]_.])?(Foundation\.|Glibc\.|Musl\.|Darwin\.)?u?sleep\(' \
    -e '^\+.*(^|[;&|[:space:]])sleep[[:space:]]+[0-9]' > "$out"
# an empty catch, on one line or over consecutive added lines (a comment-only body counts as empty)
# shellcheck disable=SC2016  # the awk program is single-quoted on purpose
awk '
  /^@@/ { pend = ""; next }
  /^\+.*catch[^{]*\{[[:space:]]*(\/\*([^*]|\*[^\/])*\*\/|\/\/.*)?[[:space:]]*\}/ { print; pend = ""; next }
  /^\+.*catch[^{]*\{[[:space:]]*(\/\/.*|\/\*.*\*\/)?[[:space:]]*$/ { pend = $0; next }
  pend != "" && /^\+[[:space:]]*(\/\/.*|\/\*.*\*\/)?[[:space:]]*$/ { next }
  pend != "" && /^\+[[:space:]]*\}/ { print pend; pend = ""; next }
  { pend = "" }' "$raw" >> "$out"
cat "$out"
[ ! -s "$out" ]
