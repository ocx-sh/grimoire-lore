---
title: "Verification wave 2 — cmake-module-authoring"
verifies: ../cmake-module-authoring.md
model: opus
date: 2026-09-26
---

# Verification wave 2 — cmake-module-authoring

Every MUST rule and every version claim in
[`cmake-module-authoring.md`](../cmake-module-authoring.md) was re-checked on
2026-09-26 against CMake 3.31.12, 4.3.4 and 4.4.2 (the host's ocx mirror),
ninja 1.13.2 and gersemi 0.29.1 (fetched with `uvx` into the scratch cache),
or against the CMake `Help/*.rst` sources at tag v4.4.2 on
gitlab.kitware.com. Each MUST rule's verification command was also run on a
planted violation and on a clean case.

Fixtures and runners live in
`/home/mherwig/.cache/cmake-measure-scratch/verify-module-authoring/`: `m/run-m1.sh`
to `m/run-m11.sh`, `m/run-g.sh`, `m/run-g2.sh`, `fx/run-greps.sh`,
`fx/awk-mod05.sh`, `fx/awk-mod16.sh`, and the fetched RST under `src/`. Build
trees are deleted by each runner. The brief limited writes to this ledger, the
consolidation and that scratch directory, so the sources were not copied into
the repository.

Tallies: 44 claims checked. 31 confirmed, 13 corrected, 0 left unverifiable
(the Unverifiable section lists the partial checks).

## Ledger

| # | ID or claim | verdict | evidence | note |
|---|---|---|---|---|
| 1 | CMK-MOD-01 (MUST): a failed `file(DOWNLOAD)` without `STATUS` exits 0 and prints nothing | CONFIRMED | M1 `dl_nostatus`: `rc=0 :: -- reached end` on 3.31.12, 4.3.4, 4.4.2; with `STATUS` the code is `37` | Now measured on 4.3 as well |
| 2 | CMK-MOD-02 (MUST): `EXPECTED_HASH` is the in-download integrity check | CONFIRMED | file.rst v4.4.2 §DOWNLOAD `EXPECTED_HASH`/`EXPECTED_MD5`; M1 `dl_badhash`: `file DOWNLOAD HASH mismatch`, rc=1 on all three lines even with `STATUS` given | A mismatch stops the configure without any extra check |
| 3 | CMK-MOD-03 (MUST): severity "MUST when the floor is 3.19 to 3.30" | CORRECTED | file.rst `TLS_VERIFY` has no versionadded (it predates 3.0 annotations); the rule's own heading says "below 3.31" | Now "MUST when the declared floor is below 3.31" |
| 4 | TLS verification is on by default from 3.31, off before | CONFIRMED | CMAKE_TLS_VERIFY.rst "versionchanged 3.31 The default is on. Previously, the default was off."; release/3.31.rst "made without a policy"; M3 default download status `60` on all three lines | Pre-3.31 half is normative only (no pre-3.31 binary on the host) |
| 5 | `CMAKE_TLS_VERIFY=0` still switches it off on 3.31+, and explicit `TLS_VERIFY ON` guards against that | CONFIRMED | M3: default + env 0 gives `st=0`; `TLS_VERIFY ON` + env 0 gives `st=60`, on 3.31.12, 4.3.4, 4.4.2. envvar/CMAKE_TLS_VERIFY.rst: versionadded 3.30 | Added the measurement to the rule's rationale |
| 6 | CMK-MOD-04 (MUST): exception "a probe marked with a comment" | CORRECTED | execute_process.rst v4.4.2: the `CMAKE_EXECUTE_PROCESS_COMMAND_ERROR_IS_FATAL` default "versionadded 4.0" is ignored only when `RESULT_VARIABLE` or `RESULTS_VARIABLE` is supplied. M1 `exec_probe_var`: a bare probe halts with rc=1 on 4.3.4 and 4.4.2 (rc=0 on 3.31.12); the probe with `RESULT_VARIABLE` survives on all three | Probe must capture `RESULT_VARIABLE`; the grep no longer excuses commented hits |
| 7 | `COMMAND_ERROR_IS_FATAL` needs 3.19 | CONFIRMED | execute_process.rst v4.4.2 "versionadded 3.19"; `NONE` value "versionadded 4.0" | Floor note extended with `NONE` and the 4.0 variable |
| 8 | An unchecked `execute_process(COMMAND false)` lets the configure finish | CONFIRMED | M1 `exec_false`: `rc=0 :: -- reached end after false` on all three lines | — |
| 9 | CMK-MOD-05 (MUST): every `function()`/`macro()` inside the pin | CORRECTED | `Kitware__CMake@e8befb989b:Modules/FetchContent.cmake:2490-2507` closes its `block(SCOPE_FOR POLICIES)` and then defines three macros on purpose, with a comment, so that caller code runs under the caller's policies | Exception added for helpers that run caller code |
| 10 | CMK-MOD-05 verification (awk) | CORRECTED | fx: the original awk printed `good/pin_block.cmake: definition at 3 after POP at` for the rule's own block form, and printed nothing for an unpinned indented definition or a macro before `PUSH` | Replaced; the new awk is red on 3 of 3 planted cases, green on 3 of 3 clean ones, and still flags find_ocx `1394` after `1383` |
| 11 | `block(SCOPE_FOR POLICIES)` needs 3.25 and pins like PUSH/POP (C11), variables leak | CONFIRMED | block.rst "versionadded 3.25"; M4: `f_in_push CMP0140=[]`, `f_after_pop CMP0140=[NEW]`, `f_in_block CMP0140=[]`, `f_after_block CMP0140=[NEW]`, includer `NEW`, `LEAKED_FROM_BLOCK=[yes]` on all three lines | — |
| 12 | Functions capture policies where they are defined | CONFIRMED | cmake_policy.rst v4.4.2: "record policy settings when they are created and use the pre-record policies when they are invoked"; M4 | — |
| 13 | CMK-MOD-08 (MUST): imported target "as `<Pkg>::<Pkg>`" | CORRECTED | cmake-developer.7.rst v4.4.2: "these should be namespaced (hence the `Foo::` prefix)"; `Foo::Foo` is the single-library example | Now `<Pkg>::<Component>`, `<Pkg>::<Pkg>` for one library |
| 14 | CMK-MOD-08: no `include_guard` in a Find module; `find_package` runs the module more than once | CONFIRMED | M5: with no guard or a plain `include_guard()` the body runs in both sibling directories; with `include_guard(GLOBAL)` the second `find_package(Foo REQUIRED)` leaves `Foo_FOUND=[]`, no target, and exits 0, on all three lines | Evidence went from argued to measured; added to the rationale |
| 15 | CMK-MOD-08: FPHSA sets `_FOUND` and honours QUIET/REQUIRED/version | CONFIRMED | cmake-developer.7.rst v4.4.2 lines 470-485 ("set `Foo_FOUND` appropriately… check the requested version") | FPHSA is the documented mechanism rather than a "must" in the manual; MUST kept, because a hand-rolled `_FOUND` is how the contract gets broken |
| 16 | CMK-MOD-10 (MUST) and C7-C10: property form reruns; variable form, unregistered file, and created-later path do not | CONFIRMED | M6 under Ninja: `none rerun=no`, `property rerun=yes value=[two`, `variable rerun=no`, `later rerun=no` on all three lines | Now measured on 4.3 as well |
| 17 | CMK-MOD-11 (MUST): namespace snapshot writes the secret into `CMakeCache.txt` | CONFIRMED | M7: `MYMOD_AUTH_TOKEN:STRING=sk-dummy-4b1d` in the cache under the namespace loop; empty under the allow-list, on all three lines | — |
| 18 | CMK-MOD-12 (MUST): `Foo_ROOT` alone wins over `CMAKE_PREFIX_PATH`; `FOO_ROOT` is ignored unless CMP0144 is NEW; no `FORCE` does not replace a cache entry | CONFIRMED | M8: case-preserved finds `A`; upper-case with CMP0144 unset finds `B` and prints a CMP0144 warning; with CMP0144 NEW finds `A`; non-FORCE write over `-DFoo_ROOT=pb` keeps `pb`; on all three lines | The CMP0144 warning also trips the configure gate at a floor below 3.27 |
| 19 | CMP0074 is 3.12, CMP0144 is 3.27 | CONFIRMED | CMP0074.rst "versionadded 3.12"; CMP0144.rst "versionadded 3.27" | — |
| 20 | CMK-MOD-13 (MUST): pick the binary from `CMAKE_HOST_SYSTEM_NAME` and `CMAKE_HOST_SYSTEM_PROCESSOR` | CORRECTED | M1 `host_vars`/`host_query` under `cmake -P`: `HOST_NAME=[Linux] HOST_PROC=[]`, `OS_PLATFORM=[x86_64]` on all three lines | Rule now names the `OS_PLATFORM` query for the CPU; find_ocx `ocx.cmake:483` already uses it |
| 21 | CMK-MOD-14 (SHOULD): a directory property is an example of something that needs a project | CORRECTED | M1 `p_dirprop`: `set_property(DIRECTORY APPEND …)` rc=0 under `-P`; `p_defer`: `cmake_language DEFER CALL may not be scheduled`, rc=1, on all three lines | Wording now says the property is silently accepted, DEFER errors |
| 22 | CMK-MOD-16 floor: `PARSE_ARGV` needs 3.5 | CORRECTED | cmake_parse_arguments.rst v4.4.2: "versionadded 3.7 The `PARSE_ARGV` signature…"; 3.5 is when the command became native | Floor now 3.7 |
| 23 | C13: a reassigned argument list defeats gersemi 0.29.1 | CORRECTED | G2: `reassigned_top` is recognised (keywords grouped); `parseargv_in_if`, `argn_in_if`, `reassigned_in_if` are each split one token per line; `parseargv_positional` is recognised | The cause is nesting in `if()`. Verdict 8, Conflicts, C13 row, MOD-16 rationale and verification, and the applied-table row are fixed |
| 24 | find_ocx MOD-16 row: "5 of 6 parses read `${ARGN}` directly", violation only at `:1327` | CORRECTED | find_ocx `ocx.cmake:1296` sits under `if(op STREQUAL "FIND")` and `:1327` under `elseif(op STREQUAL "UPDATE_COMMAND")`; the new awk prints both | Now 4 of 6 satisfy; `ocx_index` violates at both |
| 25 | C12: gersemi reads `PARSE_ARGV`; the `command_line` hint compacts `COMMAND` | CONFIRMED | Consolidation's own `defs/parse.cmake` + `use.cmake` re-run: `parseargv_fn` compacts, `argn_fn` and `parseargv_nohint_fn` split one token per line | — |
| 26 | C14: `.gersemirc` `definitions` removes the warnings; `--diff` exits 0, `--check` exits 1 | CONFIRMED | G: `.gersemirc` run prints "would be reformatted", rc=1, no warnings; `--diff … --definitions` prints a diff and rc=0; `--check` rc=1 | The CLI `--definitions` flag takes every following path, so sources must come first |
| 27 | gersemi 0.29.1 released 2026-09-14 | CONFIRMED | PyPI JSON: `0.29.1 2026-09-14T17:07:27`, still latest | — |
| 28 | cmake-format / cmakelang last release 0.6.13, 2020-08-19 | CONFIRMED | PyPI JSON: cmakelang `0.6.13 2020-08-19T17:15:23`, cmake-format `0.6.13 2020-08-19T17:15:24` | — |
| 29 | find_ocx gersemi `--check`: exit 1 with 13 warnings | CORRECTED | Re-run on the dirty tree: rc=1 with 17 distinct unknown commands; [mt] measured 13 at `ac2a759cd0` | Both numbers now given; spdlog's 5 re-measured and CONFIRMED |
| 30 | CMK-TEST-01 (MUST): test on every claimed line; `-Werror=author` does nothing on 4.3 and earlier | CONFIRMED | M10 configure mode: `-Werror=author` gives rc=0 with a `CMake Warning (dev)` on 3.31.12 and 4.3.4, rc=1 on 4.4.2 | — |
| 31 | TEST-01 citations: CPM matrix `3.16.3, 3.28.3, 4.3.2`; find_ocx 3.19 leg commented out; cmake-conan single `~3.31.7` at `:30-33` | CORRECTED | `test.yaml:22` and find_ocx `CMakeLists.txt:20-24` confirmed; cmake-conan's `cmakeVersion: "~3.31.7"` is at `cmake_conan.yml:41,58` | Line cite fixed |
| 32 | CMK-TEST-02 (MUST) and C5: the gate does nothing under `-P` on 3.31/4.3, works on 4.4 | CONFIRMED | M10: all five flag sets (`-Werror=dev`, with `-Wdev`, `-Werror=author`, with `-Wauthor`, none) give rc=0 under `-P` on 3.31.12 and 4.3.4; every gate spelling gives rc=1 on 4.4.2 | — |
| 33 | 4.4 accepts `-Werror=dev` with a deprecation notice | CONFIRMED | M10 4.4.2: "The error=dev option is deprecated.  Use -Werror=author instead." and rc=1 | — |
| 34 | C6: `FAIL_REGULAR_EXPRESSION "CMake Warning;CMake Deprecation Warning"` catches the warning and passes a clean script | CONFIRMED | M11: `c6_failre_authorwarn` Failed ("Error regular expression found"), `c6_failre_clean` Passed, on all three lines; it matches 4.4's `CMake Warning (author)` header too | — |
| 35 | CMK-TEST-03 (MUST) and C1-C4 | CONFIRMED | M11 on all three lines: C1 Passed; C2 Passed; C3 both "Required regular expression found"; C4 fatal Passed, warning Failed. PASS_REGULAR_EXPRESSION.rst: "The process exit code is ignored." WILL_FAIL.rst: "inverts the pass / fail test criteria" | A `SEND_ERROR` also prints `CMake Error at … (message):` and then carries on; the exit code is still non-zero, so the severity-pinned regex holds, but only the RunCMake-style driver checks the code itself |
| 36 | `set(… CACHE INTERNAL)` implies `FORCE` (the withdrawn memo defect) | CONFIRMED | set.rst v4.4.2: "Use of this type implies `FORCE`." | — |
| 37 | `ENCODING UTF-8` is the `execute_process` default since 3.31 (CMP0176) | CONFIRMED | execute_process.rst v4.4.2: "This is the default since CMake 3.31. See policy CMP0176." | Only used in the Dropped list |
| 38 | `include_guard(GLOBAL)` is keyed on the file path (CMK-MOD-07) | CONFIRMED | include_guard.rst v4.4.2: guard is "for the current CMake file (see the CMAKE_CURRENT_LIST_FILE variable)" | The two-copy run in [gate] §10 was not repeated |
| 39 | `ocx.cmake:181` declares `__OCX_MODULE_VERSION` | CORRECTED | find_ocx `ocx.cmake:182` | Line cite fixed |
| 40 | CPM.cmake sets four policy defaults at `:89-113` with no `PUSH` in 1,386 lines | CONFIRMED | `cpm-cmake__CPM.cmake@01678cfe17:cmake/CPM.cmake` lines 92, 97, 104, 110 set CMP0077/0126/0135/0150 defaults; 0 `cmake_policy(PUSH)`; 1,386 lines | — |
| 41 | `conan_provider.cmake:35..722` and `FindZLIB.cmake:127-128,279` close the pin at file end | CONFIRMED | PUSH at 35, POP at 722 (the last line); FindZLIB PUSH 127, SET 128, POP 279; the new MOD-05 awk prints nothing for either | — |
| 42 | ccache: 0 of 8 Find modules call FPHSA | CONFIRMED | `ccache__ccache@b471bbde29:cmake/`: 8 `Find*.cmake`, `grep -rL` lists all 8 | — |
| 43 | find_ocx MOD-01/02/03/04 status (5 checked downloads, 3 without hash, 0 of 5 with `TLS_VERIFY`, no unchecked process) | CONFIRMED | The rule greps on find_ocx: STATUS lookahead 0 hits, hash lookahead 3 (`:738,1413,1434`), TLS lookahead 5, execute_process lookahead 0 | — |
| 44 | Tested binaries: 3.31.12, 4.3.4, 4.4.2, ninja 1.13.2 | CONFIRMED | `cmake --version` via `ocx package exec kitware/cmake:{3.31,4.3,4.4}`; `ninja --version` 1.13.2 | Upstream 4.3.5 and 4.4.3 exist (era recheck); results are for the mirror's patches |

## Verification commands exercised

Every command was run exactly as the consolidation writes it (the awk checks
were pulled out of the Markdown by a script and run with `eval`), against
`fx/bad/` (planted violations) and `fx/good/` (clean). Both trees also hold a
`build/` copy of the violations to test `--exclude-dir='build*'`.

| Rule | Planted violation | Outcome on bad | Outcome on clean | Reads as |
|---|---|---|---|---|
| CMK-MOD-01 | `file(DOWNLOAD)` with no `STATUS`, one-line and multi-line | red: both calls printed | green: empty; the `build/` copy was not printed | empty = pass |
| CMK-MOD-02 | downloads without `EXPECTED_HASH` | red: both printed | green: empty | empty = pass |
| CMK-MOD-03 | download without `TLS_VERIFY` | red: the one call without it printed; the multi-line call with `TLS_VERIFY ON` was not | green: empty | empty = pass (floor below 3.31) |
| CMK-MOD-04 | multi-line `execute_process` with only `OUTPUT_VARIABLE` | red: printed | green: empty (one call with `COMMAND_ERROR_IS_FATAL ANY`, one probe with `RESULT_VARIABLE`) | empty = pass |
| CMK-MOD-05 (original) | definition after `POP`; unpinned indented definition; macro before `PUSH` | red on 1 of 3: missed the unpinned and pre-pin cases | **false red** on `block(SCOPE_FOR POLICIES)` | replaced |
| CMK-MOD-05 (corrected) | same three | red on 3 of 3 | green on PUSH/POP, block, and indented block | empty = pass |
| CMK-MOD-06 | `set(CMAKE_POLICY_DEFAULT_CMP0077 NEW)` | red: printed | green: empty | empty = pass |
| CMK-MOD-08 (first) | Find module without FPHSA | red: file listed | green: empty | empty = pass |
| CMK-MOD-08 (second) | `include_guard(GLOBAL)` and a non-namespaced IMPORTED target | lists both for reading | lists the `Bar::Bar` line only, for reading | a hit is read, not auto-failed |
| CMK-MOD-10 | `list(APPEND CMAKE_CONFIGURE_DEPENDS …)` | red: printed | green: empty | empty = pass |
| CMK-MOD-11 | namespace loop over `MYMOD_*` with `MYMOD_AUTH_TOKEN` set | red: the cache line with `sk-dummy-4b1d` printed on all three lines | green: empty under the allow-list | empty = pass |
| CMK-MOD-12 | upper-case `FOO_ROOT` without `FORCE` | lists it for reading | lists `Foo_ROOT … FORCE` for reading | read each hit |
| CMK-MOD-13 (first) | `CMAKE_SYSTEM_PROCESSOR` in binary selection | red: printed | green: empty (`CMAKE_HOST_SYSTEM_NAME` is not a substring hit) | empty = pass |
| CMK-MOD-13 (second, new) | `CMAKE_HOST_SYSTEM_PROCESSOR` in a self-update function | red: printed | green: empty | empty = pass |
| CMK-MOD-16 (new awk) | `PARSE_ARGV`, `${ARGN}` and reassigned parses inside `if()` | red: all three printed | green: top-level reassigned and positional `PARSE_ARGV` parses silent | empty = pass; also flags find_ocx `:1296` and `:1327` |
| CMK-TEST-01 | CI file with no version axis | empty, which is the finding | prints the `cmake_version` matrix line | empty = finding |
| CMK-TEST-02 | `-P` and `-S` tests and a `--build-and-test` with no gate | lists all three, none with the flag | lists the gated `-S` and the `-P` with `FAIL_REGULAR_EXPRESSION` | read each hit |
| CMK-TEST-03 | `WILL_FAIL TRUE` and a message-only regex | red: both printed | prints only the severity-pinned regex | every `WILL_FAIL` or header-less regex is a finding |

## Unverifiable

Nothing was left unchecked. Some checks were partial:

- **TLS default off before 3.31 (row 4):** checked against the documentation
  only. The host has no CMake binary older than 3.31.12, so the pre-3.31 half
  has not been measured.
- **`.gersemirc` is the only file name gersemi discovers (CMK-MOD-15):** a
  `gersemi.yaml` holding the same key was ignored (the warnings came back,
  rc=0), and the 0.29.1 source names only `.gersemirc`. Other candidate names
  were not tried. This is a SHOULD rule, so the ledger does not count it.
- **The two vendored copies that both run (CMK-MOD-07, row 38):** checked
  against `include_guard.rst`. The run in [gate] §10 was not repeated. SHOULD
  rule.
