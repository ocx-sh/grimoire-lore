#!/bin/sh
# Re-run the consolidation's measurements (2026-09-26). Run from the lore worktree root.
# Build trees go to $B (on disk, never /tmp); delete it afterwards.
set -u
S="$(cd "$(dirname "$0")" && pwd)"
B="${B:-$HOME/.cache/cmake-measure-scratch/vg-consolidation/b}"
c() { v="$1"; shift; ocx package exec "kitware/cmake:$v" -- cmake "$@"; echo "rc=$?"; }
# M1 -Werror=author reaches CMD_INSTALL_ABSOLUTE_DESTINATION (4.4); 3.x gate does not see it
c 4.4 -S "$S/m1-author-children" -B "$B/m1a" -Werror=author
c 3.31 -S "$S/m1-author-children" -B "$B/m1d" -Werror=dev
# M2 uninitialized-variable noise from CMake's own modules (expect none)
c 4.4 -S "$S/m2-uninit-noise" -B "$B/m2a" -Werror=uninitialized
# M3 bare floor vs range: post-floor policies unset vs NEW
for v in 3.31 4.4; do for d in bare range; do c "$v" -S "$S/m3-floor-policies/$d" -B "$B/m3-$v-$d"; done; done
# M4 cmake_policy(SET ... OLD) is silent under the gate; M4b an unset policy is a gate error
c 4.4 -S "$S/m4-policy-old" -B "$B/m4" -Werror=author
c 4.4 -S "$S/m4b-unset-policy" -B "$B/m4b" -Werror=author
c 3.31 -S "$S/m4b-unset-policy" -B "$B/m4b3" -Werror=dev
# M6 presets schema 10 errors.dev honoured on 3.31, 4.3, 4.4
for v in 3.31 4.3 4.4; do c "$v" -S "$S/m6-presets-v10" --preset gate; done
# M8 dependency floor 3.5-3.9 fails the gate (edit m8-old-floor-gate/dep floor to vary)
c 4.4 -S "$S/m8-old-floor-gate" -B "$B/m8" -Werror=author
# M9 scoped CMAKE_POLICY_VERSION_MINIMUM=3.10 clears the gate on 4.4, not on 3.31
c 4.4 -S "$S/m9-scoped-fix" -B "$B/m9" -Werror=author -DM9_SECOND=ON
c 3.31 -S "$S/m9-scoped-fix" -B "$B/m9-3" -Werror=dev
# M5 gate UUIDs embedded in each binary
for v in 3.31 4.3 4.4; do bin=$(ocx package exec "kitware/cmake:$v" -- sh -c 'command -v cmake'); strings -n 6 "$bin" | grep -o -e 'CMAKE_EXPERIMENTAL_[A-Z_]*' | sort -u; done
# M7 two-dot range scan (hit = finding): only m7-regex/a should match
grep -rnE --include='CMakeLists.txt' --include='*.cmake' -e 'VERSION[[:space:]]+[0-9]+(\.[0-9]+)*\.\.[0-9]' "$S/m7-regex"
# M10 dependency-floor scan (hit = candidate): a/ b/ d/ match; d/ is exempt on reading (range max >= 3.10 escapes, measured)
grep -rniE --include='CMakeLists.txt' --include='*.cmake' -e 'cmake_minimum_required\([[:space:]]*VERSION[[:space:]]+(2\.|3\.[0-9]([^0-9]|$))' "$S/m10-deprx"
