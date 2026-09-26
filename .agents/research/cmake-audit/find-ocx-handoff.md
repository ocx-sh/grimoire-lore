---
title: find_ocx — measured findings handed off from the CMake program
date: 2026-09-26
status: handoff note (owner default 2: no issue filed)
read_against: /home/mherwig/dev/find_ocx dirty working tree on 2026-09-26 (ocx 0.5.x adoption in flight)
---

# find_ocx — what the CMake program found

The published `cmake-build` rule cites find_ocx only as an anonymised worked
example. This note is the un-anonymised list for the repository's owner.
Line numbers are the dirty working tree on 2026-09-26. Every item is backed by
a measurement on CMake 3.31.12, 4.3.4 or 4.4.2, or by a rule row whose check
went red on this file. Evidence: `cmake-module-authoring.md` › "Applied to
find_ocx and the exemplars", `cmake-language.md` › the same section, and
`cmake-dependency-seam.md` › Open questions 1.

## Withdrawn — do not act

- **The memo `FORCE` defect is not a defect.** `__ocx_set_result`
  (`ocx.cmake:609-611`) writes `CACHE INTERNAL`, and `INTERNAL` implies
  `FORCE` (measured, three-run reconfigure, 3.31.12 and 4.4.2). The wave-1
  audit's headline finding was wrong.
- **Quoting discipline is clean.** 0 of 240 `if()` sites and 0 of 13 loops
  break CMK-LANG-01 or -02.

## Code fixes, highest value first

| # | Fix | Where | Rule |
|---|---|---|---|
| 1 | `unset(<name>_DIR CACHE)` when `<name>_ROOT` changes, or a re-pointed root is ignored by an already-resolved `find_package` | `ocx_package`, `ocx.cmake:1200-1201` | CMK-DEP-13, CMK-MOD-12 |
| 2 | Add `INACTIVITY_TIMEOUT` (or `TIMEOUT`) to every download; a stalled server hangs the configure forever | `ocx.cmake:738,765,1413,1434,1467` | CMK-MOD-17 |
| 3 | Pass `TLS_VERIFY ON`; TLS verification is off by default on 3.19 to 3.30, and the module's floor is 3.19 | same five downloads | CMK-MOD-03 |
| 4 | Name the trust roots in the module header: three downloads carry no `EXPECTED_HASH` because they fetch the manifest or `SHA256SUMS` that carries the hashes | `ocx.cmake:738,1413,1434` | CMK-MOD-02 |
| 5 | Check `<prefix>_UNPARSED_ARGUMENTS` and stop with `FATAL_ERROR` | `ocx_bootstrap` (`ocx.cmake:692`, public), `__ocx_run` (`:442`) | CMK-LANG-06 |
| 6 | Parse with `PARSE_ARGV`, keeping the old list splitting with the flatten line on multi-value keywords (pinned migration clause), or record the behaviour change in the changelog | 6 of 6 parses: `ocx.cmake:442,692,872,1072,1296,1327` | CMK-LANG-04 |
| 7 | Move `cmake_policy(POP)` to the end of the file, so `__ocx_self_update` is defined under the module's 3.19 pin; the header comment at `:178` claims it already is | `ocx.cmake:1383` vs `:1394` | CMK-MOD-05 |
| 8 | Give the documented `cmake -P` entry point a public name | `__ocx_self_update`, `ocx.cmake:1394`, `README.md:54` | CMK-MOD-14 |
| 9 | Put both `ocx_index` parses at function top level so gersemi can read them; give `__ocx_run` a `COMMAND` hint | `ocx.cmake:1296,1327`, `:436-450` | CMK-MOD-16 |
| 10 | `ENCODING UTF-8` on `execute_process` calls that parse tool output | `ocx.cmake:449,556`, `Findocx.cmake:62` | CMK-MOD-19 |
| 11 | Declare a module version beside `include_guard(GLOBAL)`: two vendored copies at different paths both run in full | `ocx.cmake:173,182` | CMK-MOD-07 |

## Docs fix

- **`<X>_ROOT` does not feed a following top-level `find_program` or
  `find_library`.** It is read only inside `find_package(<X>)` and the files
  that call loads (measured C5, 3.31.12, 4.3.4, 4.4.2). The claim is at
  `ocx.cmake:1062-1063` and `examples/package/CMakeLists.txt:25-26`. Rule:
  CMK-DEP-14.
- A consumer whose configure has a non-empty `CMAKE_FIND_ROOT_PATH` (vcpkg's
  toolchain sets one) sees any rooted copy win over the `_ROOT` hand-off. Not
  a code defect; a limit worth one sentence in the README. Rule: CMK-DEP-21.

## Test harness

| # | Fix | Where | Rule |
|---|---|---|---|
| 1 | Test the declared floor: the 3.19 line is commented out, so the floor is untested; label it untested until a 3.19 binary is provisioned | `CMakeLists.txt:20-24` | CMK-TEST-01 |
| 2 | Put the gate on every inner configure, including the memoize reconfigure, and add `FAIL_REGULAR_EXPRESSION "CMake Warning;CMake Deprecation Warning"` to the four `cmake -P` families, which the gate cannot reach on 4.3 and older | `tests/reconfigure_check.cmake:16-18`, the `-P` families | CMK-TEST-02 |
| 3 | Negative tests match the message only and ignore the exit code; pin both | `tests/helpers.cmake:65,82,100` | CMK-TEST-03 |
| 4 | Add a third configure to the memo test, so invalidate-then-reconfigure is exercised | `tests/reconfigure_check.cmake:20-34` | CMK-TEST-04 |
| 5 | Load `Findocx.cmake` through `find_package(ocx)` in a fixture; it ships but no test calls it that way | — | CMK-TEST-05 |
| 6 | Add `frozen_index` to the CI examples matrix; the local gate runs it and CI does not | `.github/workflows/ci.yml` | — |
| 7 | Run gersemi: plain `--check` exits 1 with 17 warnings on the working tree | `ocx.cmake` | CMK-MOD-15 (SHOULD) |

## Not CMake, noted in passing

`__OCX_PIN_VERSION` is 0.3.11 while the working-tree `ocx.lock` was generated
by ocx 0.5.6 and `rules_ocx` requires 0.6.0. The dirty tree bundles the
handover's 0.5.x migration with an undocumented PINS/PLATFORM removal.
