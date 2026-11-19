#!/usr/bin/env bash
# swiftlint-gate.sh: SW-GATE-26, SwiftLint through a wrapper that fails when it skipped a rule. The static `swiftlint`
# binary skips `custom_rules` (one "Skipping enabled rule" line, exit 0 on a violating tree), so a bare exit 0 proves nothing.
# Usage: SWIFTLINT='docker run --rm -v '"$PWD:$PWD"' -w '"$PWD"' ghcr.io/realm/swiftlint:0.65.1' \
#          SWIFTLINT_CONFIG=.swiftlint.yml bash swiftlint-gate.sh Sources Tests
#   SWIFTLINT        the command prefix, words separated by single spaces with no quoting inside (default: swiftlint on PATH).
#                    The image entrypoint is already swiftlint, so the prefix ends at the image name and the wrapper adds
#                    `lint` itself: never put a second `swiftlint` word after the image.
#   SWIFTLINT_CONFIG the config file (default .swiftlint.yml). Remaining arguments are the paths to lint.
# Exit: 66 the config file is absent (no run: a bare `swiftlint --strict` on Mint printed 1655 lines and exited 123); 70 SwiftLint printed "Skipping enabled rule" (the carrier did not run) or "but configuration specified version" (a `swiftlint_version:` pin that differs from the running binary: SwiftLint exits 2 with nothing linted, the same code as a violation); otherwise SwiftLint's own code
#       (0 clean, 2 violations, 134 abort, for example "SourceKit is disabled by configuration" from the static binary).
# Watched on SwiftLint 0.65.1 (measured 2026-10-10): the static binary with no mode line exits 70, with
# default_execution_mode: swiftsyntax exits 134; the pinned image exits 2 on a violating tree and 0 on a clean twin.
# SwiftGen (`swiftlint_version: 0.48.0`) on the 0.65.1 image exited 2 with one warning line and no finding, a refused run read as
# violations; the wrapper now exits 70 there. A pinned clean twin exits 70, the same twin without the pin 0, and an unpinned
# violating file 2 (measured 2026-10-10).
# Re-run after each SwiftLint image bump. The log lives in mktemp: nothing is written into the work tree.
set -u
[ -f "${SWIFTLINT_CONFIG:-.swiftlint.yml}" ] || { echo "swiftlint-gate: no config at ${SWIFTLINT_CONFIG:-.swiftlint.yml}; SwiftLint without one lints with every default rule, so run this gate only where a config exists" >&2; exit 66; }
read -r -a cmd <<< "${SWIFTLINT:-swiftlint}"
log=$(mktemp)
trap 'rm -f "$log"' EXIT
"${cmd[@]}" lint --config "${SWIFTLINT_CONFIG:-.swiftlint.yml}" --no-cache --quiet "$@" > "$log" 2>&1
rc=$?
cat "$log"
if grep -q -F -e 'Skipping enabled rule' "$log"; then
  echo 'FAIL: SwiftLint skipped an enabled rule; use the SourceKit image (the static binary skips custom_rules)' >&2
  exit 70
fi
if grep -q -F -e 'but configuration specified version' "$log"; then
  echo 'FAIL: the config pins a different swiftlint_version, SwiftLint did not lint; run the pinned version or drop the pin line' >&2
  exit 70
fi
exit "$rc"
