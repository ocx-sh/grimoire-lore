---
title: CMake releases and runner images as cited by cpp-packaging (delta)
pair: cpp-packaging
date_researched: 2026-11-27
window_start: 2026-09-26
model: sonnet
sources_fetched: 9
---

# CMake releases and runner images as cited by cpp-packaging (delta, 2026-09-26 to 2026-11-27)

This is a delta update. Claims upstream did not change stay as written. The sibling pair cmake-build has no delta research on disk yet (only python-packaging exists under refresh-2026-11 at the time of reading), so nothing is cited from it and every point below was derived directly.

## Facts established

Newest patch per CMake branch (tag dates from the Kitware/CMake GitHub mirror of the gitlab.kitware.com tags, via the git tag API; the gitlab tag page itself returned HTTP 403):

| Branch | Baseline cited | Newest in window | Tag date |
|---|---|---|---|
| 3.31 | 3.31.12 | 3.31.12 (no newer tag) | 2026-04-20 |
| 4.3 | 4.3.4 (2026-06-17) | 4.3.6 | 2026-10-27 (4.3.5 on 2026-09-04) |
| 4.4 | 4.4.2 (2026-07-31) | 4.4.5 | 2026-10-27 (4.4.3 2026-08-25, 4.4.4 2026-10-02) |
| 4.5 | none | 4.5.1 | 2026-11-19 |

CMake 4.5 is final: v4.5.0-rc1 was tagged 2026-10-15, v4.5.0 on 2026-11-12, v4.5.1 on 2026-11-19. Source: https://api.github.com/repos/Kitware/CMake/git/matching-refs/tags/v and the per-tag objects.

Runner images (source: actions/runner-images README software lists and release notes):

- ubuntu-24.04: CMake 3.31.6, image 20261116.376.1 in the README. The ubuntu24 release 20261122.23 (2026-11-23) lists no CMake change. Unchanged since baseline.
- macos-15 (arm64): CMake 4.4.2 at baseline. Release 20261118.0550 (2026-11-18) moved 4.4.5 to 4.5.0. Release 20261123.0558 (2026-11-24) moved 4.5.0 to 4.5.1. Current: 4.5.1. (The README at main showed 4.5.0 at fetch time, so main lags the latest release by a few days.) Sources: https://github.com/actions/runner-images/releases (tags macos-15-arm64/20261118.0550 and macos-15-arm64/20261123.0558).

The -Werror=dev and -Werror=author split:

- The CMake 4.4 release notes (https://cmake.org/cmake/help/v4.4/release/4.4.html) state: "The -W[no-][error=]dev command-line options are deprecated." and the new spelling is -W[no-][error=]author. This is the origin of the split and it predates the window.
- The CMake 4.5 manual (https://cmake.org/cmake/help/v4.5/manual/cmake.1.html) still documents -Wdev/-Wno-dev as "Deprecated since version 4.4." and as "Compatibility synonyms for -Wauthor / -Wno-author". It documents the generic "-Werror=<category>" form and does not mention -Werror=dev separately.
- The CMake 4.5 release notes (https://cmake.org/cmake/help/v4.5/release/4.5.html) add two diagnostic categories, CMD_STRICT (-Wstrict, presets "strict" field) and CMD_NON_TARGET_DIRECTIVE (-Wnon-target-directive). They do not mention dev, author, or any change to warnings-as-errors. No 4.3.x, 4.4.x or 4.5.x release in the window is documented as changing -Werror=dev, -Werror=author or the deprecation. Patch releases do not publish behavioural release notes, so a silent change cannot be excluded by reading alone.
- Not established: whether -Werror=dev on 4.5 still promotes an AUTHOR_WARNING (the docs call it a synonym, which implies yes, but the manual page does not say). Treat as "could not determine" until measured.

actions/cache: no release in the window. The newest tag and release is v6.1.0 (2026-06-26); the cached baseline already predates it. Source: https://api.github.com/repos/actions/cache/releases and /tags, plus the GitHub releases page. Nothing in the window touches the cache-hit output or key semantics.

## Verdict per claim at risk

1. The Gate, "CMake 3.31.12, 4.3.4 and 4.4.2, verified 2026-09-26": the sentence stays true as a record of what was measured, but it is stale as a stamp. 4.3 and 4.4 each gained patches (4.3.6, 4.4.5) and 4.5.1 now exists. Verdict: changed (stamp only). Replacement once re-measured: "CMake 3.31.12, 4.3.6, 4.4.5 and 4.5.1, verified 2026-11-27." Do not move the stamp before the measurements below are re-run.
2. The Gate, "-Werror=dev on CMake <= 4.3 and on any command line that serves both sides, -Werror=author only on CMake >= 4.4": unchanged for 3.31 to 4.4 (no upstream change in window). For 4.5 it is could not determine. The 4.4 deprecation of the dev spelling means a 4.5 run may emit a deprecation notice for -Werror=dev; measure before extending the sentence to 4.5.
3. The measurement "-Werror=author exits 0 on 3.31.12 and 4.3.4": unchanged for 3.31.12. For 4.3.6 it is expected to hold (a 4.3 patch release adding the author spelling is unlikely) but is not verified; re-run.
4. CMK-PKG-03, "CMake 3.31.6 on ubuntu-24.04, 4.4.2 on macos-15, as of 2026-09-26": changed for macos-15. Old text: "4.4.2 on macos-15". New fact: 4.5.1 (image 20261123.0558, 2026-11-24). ubuntu-24.04 holds at 3.31.6. Replacement: "(CMake 3.31.6 on ubuntu-24.04, 4.5.1 on macos-15, as of 2026-11-27)". The rule's point (images ship different tools on the same day) is strengthened, since the two now differ by a whole minor series.
5. CMK-PKG-04, "Floor: any actions/cache version": unchanged. No new actions/cache release in the window, so the cache-hit output and the key semantics read by greps (1) and (2) did not change. Note v6 exists (2026-06-23, before the window); the "any version" floor already covered it.
6. conan.md CMK-CONAN-10 and vcpkg.md Dead and Never-Existing Surface (a STATUS line and a message(WARNING) pass both flags): unchanged. Nothing in the window alters the STATUS or WARNING behaviour. CMake 4.5 adds new categories (strict, non-target-directive) but these do not promote a STATUS line. The measurement is not re-run on 4.5.
7. vcpkg.md, "CMake behaviour measured on 3.31.12, 4.3.4 and 4.4.2 (2026-09-26)": unchanged as history; stale as a stamp for the same reason as item 1. Also the macOS line in CMK-PKG-02 remains true (it concerns vcpkg-tool 2026-07-27 downloading CMake 4.4.3, a vcpkg root fact, not a runner fact).

## Recommendation

Move the gate's "verified" stamp only after a re-measurement, and then to 3.31.12, 4.3.6, 4.4.5 and 4.5.1. Adding 4.5.1 is the valuable part, because macos-15 CI now runs it by default.

Measurements to re-run (all use the planted AUTHOR_WARNING through a preset, as in the existing gate text, plus a STATUS line and a message(WARNING)):

- 4.5.1: does -Werror=dev fail the configure? Does -Werror=author fail it? Does -Werror=dev print a deprecation notice? Does a preset "warnings": {"deprecated": false} still beat the flag? This decides whether the sentence "-Werror=author only on CMake >= 4.4" can say ">= 4.4" unchanged and whether -Werror=dev is still safe on any command line serving both sides.
- 4.3.6: -Werror=author exits 0 and -Werror=dev fails (confirms the split holds on the newest 4.3).
- 4.4.5: both flags fail the configure on the planted AUTHOR_WARNING.
- 4.5.1: the STATUS-line and message(WARNING) cases for CMK-CONAN-10 and the vcpkg.md dead-surface deprecation line (both flags must still pass them).
- Not needed: 3.31.12 (no newer patch); actions/cache greps (no release).

Verification heuristics: the gate re-run itself is the command (`cmake --preset <p> --fresh -Werror=dev` and `-Werror=author`, check the exit code). Local run attempt failed: PyPI's cmake wheel only reaches 4.4.5 on this machine's index, so 4.5.x was not measured here.

## Candidate normative edits

- Gate stamp and version list: bump as above after re-measurement. Rationale: a stamp must name versions someone actually ran. Verification: exit codes from the re-run above.
- CMK-PKG-03 text: replace "4.4.2 on macos-15, as of 2026-09-26" with "4.5.1 on macos-15, as of 2026-11-27". Rationale: the cited figure is factually wrong today. Verification: the macos-15-arm64 README software list (Tools, Cmake row) at edit time.
