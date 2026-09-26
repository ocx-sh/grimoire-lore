---
title: "Authoring, testing and formatting CMake modules — consolidated"
topic: cmake-module-authoring
model: opus
id_family: CMK-MOD, CMK-TEST
date: 2026-09-26
verified: 2026-09-26
revised: 2026-09-26
consolidates:
  - cmake-module-authoring/module-contracts.md
  - cmake-module-authoring/module-testing-and-formatting.md
  - cmake-module-authoring/verification-wave2.md
  - cmake-module-authoring/verification-wave3.md
  - cmake-module-authoring/network-timeouts-and-platform-edges.md (wave 3, M-D-16)
  - cmake-audit/find-ocx-cmake-shape-and-contracts.md
  - cmake-audit/exemplar-cmake-shape.md
  - cmake-audit/exemplar-deps-and-dual-build.md
  - cmake-audit/fleet-inventory-and-bazel-overlap.md
  - cmake-versions-and-gate/gate-and-language-semantics.md (cited for measurements it owns, not consolidated)
  - cmake-topic-map.md rows M-D-01..16, M-I-04, M-A-03, M-A-04, M-A-06, M-B-02, M-C-04, M-C-08
---

# Authoring, testing and formatting CMake modules

Tested on CMake 3.31.12, 4.3.4 and 4.4.2 (the host's OCX mirror; upstream is at
4.4.3), ninja 1.13.2 and gersemi 0.29.1, all on 2026-09-26. Rules are written
for the map's assumed floor of 3.25 ([map] conflict 1). Any rule that needs a
newer CMake names that version.

**Measurements this consolidation added (2026-09-26).** They settle the
conflicts below. Sources are in
[`cmake-module-authoring/scratch/module-authoring-consolidation/`](cmake-module-authoring/scratch/module-authoring-consolidation/);
the scripts are `run-t1.sh` to `run-t5-t6.sh`, and the build trees live under
`/home/mherwig/.cache/cmake-measure-scratch/module-authoring-consolidation/`.

| Tag | What was run | Result on 3.31.12 and 4.4.2 unless noted |
|---|---|---|
| C1 | CTest: a test with `PASS_REGULAR_EXPRESSION` whose command exits 0 | **Passed.** The exit code is ignored |
| C2 | CTest: `WILL_FAIL TRUE` on a command that fails for an unrelated reason (`cmake -E cat /nonexistent`) | **Passed** |
| C3 | CTest: `WILL_FAIL` plus `PASS_REGULAR_EXPRESSION`, both when the command exits 0 and when it exits 1 | **Failed** both times ("Required regular expression found"). `WILL_FAIL` inverts the regex result, so the two cannot be combined |
| C4 | CTest: `PASS_REGULAR_EXPRESSION "CMake Error at [^\n]*\\(message\\):\n  module: …"` against a `FATAL_ERROR` and against a `WARNING` carrying the same text | FATAL passed, WARNING failed. Matching the severity header pins the failure mode |
| C5 | `cmake -Werror=dev -P` and `-Werror=author -P` (with and without `-Wdev`/`-Wauthor`) on a script that calls `message(AUTHOR_WARNING)` | **3.31.12 and 4.3.4: exit 0 in all ten combinations; the gate does nothing in script mode.** 4.4.2: exit 1 under either spelling |
| C6 | `FAIL_REGULAR_EXPRESSION "CMake Warning;CMake Deprecation Warning"` on that script run with plain `cmake -P` | Fails on the warning and passes on a clean script, on both lines. This replaces the gate in script mode |
| C7 | Ninja build after editing a file that is read with `file(READ)` but not registered | No re-run of CMake |
| C8 | The same file registered with `set_property(DIRECTORY APPEND PROPERTY CMAKE_CONFIGURE_DEPENDS …)`, then edited | `Re-running CMake...`, and the new value is picked up |
| C9 | A path registered in `CMAKE_CONFIGURE_DEPENDS` that did not exist at configure time, created afterwards | **No re-run** |
| C10 | `list(APPEND CMAKE_CONFIGURE_DEPENDS …)`, a normal variable with the property's name | **No re-run. The variable form does nothing and gives no warning** |
| C11 | `block(SCOPE_FOR POLICIES)` + `cmake_policy(VERSION 3.19)` around a function definition, included from a 3.31 project | The function inside sees CMP0124 and CMP0140 unset (the pin holds), a function defined after `endblock()` sees NEW, and the includer's policies are restored. **Variables set inside the block still leak** |
| C12 | gersemi 0.29.1: `--definitions` pointing at a function that uses `cmake_parse_arguments(PARSE_ARGV 0 …)` | Keywords are recognised. `# gersemi: hints { COMMAND: command_line }` compacts the `COMMAND` value. Without the hint, the value is split one token per line |
| C13 | gersemi 0.29.1: a dispatch function whose parse of a reassigned list (`set(args ${ARGN})` … `${args}`) sits inside `if(op STREQUAL …)` | Keywords are **not** recognised: every token lands on its own line. No warning, `--check` exits 1. **Verify wave 2: the cause is the nesting, not the reassignment.** A top-level parse of a reassigned list is recognised; a `PARSE_ARGV` or `${ARGN}` parse inside an `if()` is not |
| C14 | gersemi 0.29.1: `.gersemirc` containing `definitions: [defs]`, with no CLI flag; also `--diff` on its own | The config key removes every "unknown command" warning. **`--diff` exits 0 even when it would reformat; only `--check` exits 1** |

**Measurements the wave-3 revision added (2026-09-26, 3.31.12, 4.3.4 and
4.4.2 unless noted).** The follow-up dive
([net](cmake-module-authoring/network-timeouts-and-platform-edges.md)) ran no
binaries; these runs replace its source-only claims. The server is a local
Python socket that accepts every connection and never sends a byte. Sources
and runners (`run.sh`, `run-fc-url.sh`, `run-fc-gitenv.sh`, `greps/`) are in
`/home/mherwig/.cache/cmake-measure-scratch/module-authoring-w3/src/`; the
brief limited repository writes to this file, so they were not copied in.
Build trees are deleted.

| Tag | What was run | Result |
|---|---|---|
| C15 | `file(DOWNLOAD … STATUS st)` under `cmake -P` against the stalled server: no timeout option, `TIMEOUT 5`, `INACTIVITY_TIMEOUT 5` | **No option: still blocked at the 30 s ceiling (killed, rc 124).** Either option: returns after 5 s with `status=28;"Timeout was reached"`, and the script exits 0, so only the CMK-MOD-01 check stops the configure |
| C16 | `FetchContent_Declare(dep URL … INACTIVITY_TIMEOUT 5)` + `FetchContent_MakeAvailable` against the stalled server, 3.31.12 and 4.4.2 | Fails (rc 1) after **115 s: 6 attempts**. `download.cmake.in` retries status 28 five times with sleeps of 0, 5, 5, 15 and 60 s (`retry_number 5`, `download_retry_codes 7 6 8 15 28 35`; the template is identical on 3.31.12 and 4.4.2). The worst case is about 6 × T + 85 s |
| C17 | `FetchContent_Declare(dep GIT_REPOSITORY http://127.0.0.1:… TIMEOUT 5 INACTIVITY_TIMEOUT 5)` against the stalled server | **Still blocked at the 60 s ceiling on all three lines.** Neither keyword reaches git |
| C18 | C17 with `GIT_HTTP_LOW_SPEED_LIMIT=1` and `GIT_HTTP_LOW_SPEED_TIME=5` in the environment: from the shell (three lines), or `set(ENV{…})` inside `CMakeLists.txt` guarded by `if(NOT DEFINED ENV{GIT_HTTP_LOW_SPEED_LIMIT})` (3.31.12 and 4.4.2) | Fails (rc 1) after 15 s: 3 clone attempts, each `Operation too slow. Less than 1 bytes/sec transferred the last 5 seconds` |
| C19 | `cmake_policy(GET CMP0176)` in a `cmake_minimum_required(VERSION 3.25...4.4)` project, at project scope and inside a function defined under a CMK-MOD-05 pin `cmake_policy(VERSION 3.25)` | Project scope: `NEW`. **Inside the pinned function: unset, which means the OLD behaviour (`ENCODING AUTO`)**, on every line including 4.4.2 |
| C20 | Under `cmake -P`: `add_library(x INTERFACE)`; and `cmake_language(DEFER CALL …)` in a file reached by `include()` from the script | `add_library command is not scriptable`, rc 1 (not "Unknown CMake command" as [net] §5 states). DEFER: `DEFER CALL may not be scheduled in directory … at this time`, rc 1 |
| C21 | `cmake_language(EXIT 3)` in a project configure | `cmake_language EXIT can be used only in SCRIPT mode`, rc 1 |

## Verdict

1. **A module that downloads or runs a process must fail loudly and verify
   what it downloads. These are MUSTs for any CMake module author.** Measured
   on both lines: `file(DOWNLOAD)` and `execute_process` never stop a configure
   by themselves. `TLS_VERIFY` is on by default only from 3.31. Five MUSTs
   cover it (CMK-MOD-01 to -04 and -11). **Wave 3 adds two more.** A download
   with no timeout blocks the configure indefinitely on a server that accepts
   and never answers (C15), so every network download carries `TIMEOUT` or
   `INACTIVITY_TIMEOUT` (CMK-MOD-17, M-D-16 answered: either keyword bounds
   the stall, so neither alone is the MUST). Captured process output is
   decoded as `AUTO` on Windows under any policy version below 3.31, which
   the CMK-MOD-05 pin itself produces (C19), so it passes `ENCODING UTF-8`
   (CMK-MOD-19).
2. **Pin policies around every definition (MUST), and never leave policy
   defaults changed for the includer (SHOULD).** Both dives measured
   definition-time capture. `block(SCOPE_FOR POLICIES)` is the equivalent form
   on 3.25 and later (C11). Adding `include(CPM.cmake)` quietly sets four
   policy defaults for the rest of the build, so a module we write never does
   that. This SHOULD binds module authors; the consumer side is CMK-DEP's.
3. **A Find module keeps the `cmake-developer(7)` contract (MUST).** Network
   fetch on a miss is **SHOULD-not**, not MUST-not. module-contracts ranked it
   MUST, but its own Contested section calls the position a synthesis with one
   corpus instance. Argued evidence cannot carry a MUST. This binds a library
   shipping a package and any Find-module author.
4. **The `find_package` handoff is the case-preserved `<Name>_ROOT`, written as
   `CACHE PATH … FORCE`.** The module does not also emit the upper-case form.
   Measured; it binds authors of tool-provisioning modules.
5. **A negative test must pin the exit status and the diagnostic together.**
   `WILL_FAIL` alone, `PASS_REGULAR_EXPRESSION` whose text is only the message,
   and the two combined each let a wrong outcome pass (C1 to C3). The testing
   dive's "acceptable but less strict" verdict on find_ocx's negative tests is
   **overturned**: all three would still pass if the module started printing
   the same text and then carried on.
6. **The configure gate reaches every inner configure, spelled for that CMake
   line. On 4.3 and earlier, script-mode cases get `FAIL_REGULAR_EXPRESSION`
   instead (C5, C6).** The testing dive's "the concept does not apply in
   script mode" is **overturned**. On 4.4 the gate works under `-P`; on 4.3 and
   earlier it silently does nothing.
7. **Test on a real binary of every CMake line you claim (MUST).** Any floor
   that no CI leg actually runs must be removed from the claim or marked
   untested; never leave it standing. This binds module authors. CMK-VER owns
   the floor rule in general and cites CMK-TEST-01 for the mechanism.
8. **gersemi is SHOULD, and a module project configures it in `.gersemirc`
   through the `definitions` key** (C14). The testing dive's rule that
   `cmake_parse_arguments` must end in the literal `${ARGN}` is **withdrawn**.
   gersemi reads `PARSE_ARGV` signatures (C12), and `PARSE_ARGV` is what
   correctness requires ([gate] §9). What actually defeats gersemi is a
   parse nested inside a control block, whatever list it reads (C13, as
   corrected by verify wave 2).
9. **Handed off rather than duplicated:**
   - CMK-CORE: the `gersemi --check` gate line, cmake-format "recognise and
     migrate", and the `pipefail` + `grep -q` trap (M-A-03, -04, -06).
   - CMK-LANG: function versus macro, list building, and `PARSE_ARGV` (M-C-04,
     M-C-06, M-C-08).
   - CMK-DEP: CPM from the consumer's side, and the `<Name>_ROOT` precedence
     against toolchain-injected paths.

   The versions-and-gate consolidation cites CMK-MOD-01 and CMK-MOD-07 for its
   download and vendored-copy measurements ([gate] rules 9 and 10) rather than
   restating them.
10. **A git fetch cannot be bounded from CMake (SHOULD, CMK-MOD-18).**
    `TIMEOUT` and `INACTIVITY_TIMEOUT` apply to the URL path only; a
    `GIT_REPOSITORY` fetch carrying both still hangs (C17). git's own
    `GIT_HTTP_LOW_SPEED_*` bound it (C18). It stays SHOULD because the remedy
    is process-wide environment, not a CMake option.
11. **Script mode fails loudly in both directions (SHOULD, CMK-MOD-20).**
    Project commands and `cmake_language(DEFER)` are hard errors under `-P`,
    and `cmake_language(EXIT)` is a hard error outside it (C20, C21). Only the
    silent directory-property case needs CMK-MOD-14's guard; the rest is
    caught by CMK-TEST-05 once each entry point is exercised.
12. **Documented gaps (no further round can close them on this host):**
    - The Windows mis-decoding behind CMK-MOD-19 is normative
      (`CMP0176.rst`, CMake issue 26262) and unmeasured: there is no Windows
      host. C19 measures only the policy state that selects it. The rule
      stays MUST because `ENCODING` is ignored off Windows (execute_process.rst
      @ v4.4.2), so it costs nothing where it is not needed.
    - `CMP0176` does not warn (`CMP0176.rst` @ v4.4.2), so no configure gate
      catches the OLD default.
    - `GIT_HTTP_LOW_SPEED_*` bounds git over HTTP(S) only; an `ssh://` or
      `git://` fetch has no bound from CMake or from this remedy.
    - C16 to C18 ran FetchContent in direct mode (CMP0168 NEW, from the
      `3.25...4.4` range). The sub-build mode uses the same
      `download.cmake.in` and `gitclone.cmake.in` templates but was not run.

### Conflicts resolved

- **The find_ocx memo `FORCE` defect is withdrawn.** It is the audit's top
  smell ([ocx] smell 1). The `set()` manual says `INTERNAL` implies `FORCE`
  ([map] H4), and [gate] §6 ran three reconfigures on the verbatim helpers and
  got a memo hit on run 3. CMK-TEST-04 survives on its own merits: the suite
  could neither confirm nor refute the claim. It ships as a SHOULD, because no
  real bug stands behind it.
- **Literal `${ARGN}` versus `PARSE_ARGV`.** The testing dive's rule 7 makes
  the literal `${ARGN}` a MUST. [gate] rule 8 requires `PARSE_ARGV` for
  correctness. Measured (C12, C13): gersemi reads any top-level parse and
  fails on one nested inside a control block (verify wave 2). Resolved as
  CMK-MOD-16: one top-level `PARSE_ARGV` parse per function. The `${ARGN}`
  wording is struck.
- **The gate in script mode.** The testing dive says it does not apply; C5
  says it applies on 4.4 and does nothing on 4.3 and earlier. Resolved as
  CMK-TEST-02 with the C6 substitute.
- **Strength of negative tests.** The testing dive calls
  `PASS_REGULAR_EXPRESSION` acceptable; C1 shows it ignores the exit code.
  Resolved as CMK-TEST-03, and find_ocx is listed as violating it.
- **A Find module that fetches.** module-contracts says MUST in its candidate
  list and "synthesis" under Contested. Resolved as SHOULD (CMK-MOD-09).
- **Where gersemi's configuration lives.** The testing dive puts
  `--definitions` on the command line. C14 shows `.gersemirc` carries it, so
  the editor and CI format the same way. Resolved as CMK-MOD-15, which also
  records that `--diff` exits 0.
- **TLS scope.** The audit says "0 of 5 set `TLS_VERIFY`" without a version.
  [map] H5 shows the default is on from 3.31. The rule is therefore scoped to
  floors below 3.31 (CMK-MOD-03).
- **Upper-case `<NAME>_ROOT` (the M-D-12 question).** Measured as not needed
  from the provisioning side ([mc] §9).
- **`include_guard` on Find modules.** The audit says Findocx lacking a guard
  only causes redundant work; module-contracts says a guard is the wrong tool
  there. They agree. Find modules take none. Helpers take
  `include_guard(GLOBAL)` plus the CMK-MOD-07 version check, because a guard is
  keyed on the file path and never catches a second copy ([gate] §10).
- **Who owns what between the families.** The map gives M-D-02 and M-D-05 to
  CMK-MOD, and [gate] also measured both. CMK-MOD owns them. Of the tooling
  rows the brief also listed (M-A-03, M-A-04, M-A-06), the map gives the
  family-wide gate to CMK-CORE; CMK-MOD keeps only the module-specific gersemi
  setup.
- **Wave 3: which timeout keyword is the MUST.** [net] makes `TIMEOUT` the
  MUST and leaves `INACTIVITY_TIMEOUT` out, on source reading alone. C15
  shows either keyword ends a stall in 5 s. Resolved as CMK-MOD-17: either
  one satisfies the MUST.
- **Wave 3: "hangs indefinitely, confirmed without a binary".** [net]
  inferred it from the absence of a default in `cmFileCommand.cxx`. C15
  measured it on all three lines (still blocked at the ceiling). The claim
  now rests on the run.
- **Wave 3: `ENCODING UTF-8`.** This file had dropped it (no Windows host);
  [net] proposes a MUST. Resolved as MUST (CMK-MOD-19) on the normative
  evidence plus C19, which shows the CMK-MOD-05 pin forces the OLD default
  even on 4.4.2. The Windows effect itself is a documented gap (Verdict 12).
- **Wave 3: the script-mode error for project commands.** [net] §5 says
  "Unknown CMake command". C20 prints `add_library command is not
  scriptable`. Both are hard errors; the wording is corrected here.
- **Wave 3: extend CMK-MOD-14 or add a rule.** [net] proposes CMK-MOD-20 as a
  wider guard list for CMK-MOD-14. Loud errors do not need a guard; they need
  a test (CMK-TEST-05). Resolved as a narrow CMK-MOD-20 on the two
  `cmake_language` subcommands, with CMK-MOD-14 unchanged in meaning.
- **Wave 3: [net]'s verification commands.** Its corpus loop feeds a shell
  glob operand, and its CMK-MOD-17 and -19 checks list files for a manual
  read. Replaced by `grep -rPzo` lookaheads, each run against planted and
  clean fixtures (`greps/` in the wave-3 scratch).

## The ruleset

Conventions:
- Every command reads a variable instead of a placeholder: `MODULE_DIR` is the
  module's source directory, `TEST_DIR` the test harness, `CI_DIR` the CI
  configuration directory, `BUILD_DIR` a configured build tree, `DOC_DIR` the
  documentation directory, `ROOT` the root of the consuming build,
  `MODULE_FILE` a single module file.
- Every grep excludes build trees. The `--exclude-dir='build*'` flag matters:
  a find_ocx run counted 25 `file(DOWNLOAD)` blocks lacking `TLS_VERIFY`,
  where the module itself has 5; the other 20 were copies inside `build/`
  fixtures.
- The `grep -rPzo` checks read each file as a single record (`-z`). A
  negative lookahead then finds a call that lacks a keyword. The patterns
  assume the call's arguments contain no `)`, which holds for `${}` and `$<>`
  arguments.
- "The configure gate" means `-Werror=dev` on 3.x through 4.3 and
  `-Werror=author` on 4.4 and later ([gate] §1). CMK-CORE defines it.

### CMK-MOD — the contract a shipped module keeps

Consumer kind: a **CMake module author**. That covers Find modules, helper
modules, copy-and-own bootstrappers and dependency-provider files. CMK-MOD-08
and -09 also bind a **library shipping a package** that bundles Find modules.

#### Caught by grepping the module for calls that fail open (network and processes)

**CMK-MOD-01 — Check `STATUS` after every `file(DOWNLOAD)`, and stop with a
prefixed `FATAL_ERROR` when the code is not 0.**
- Rationale: measured on 3.31.12 and 4.4.2, a failed download exits 0 and,
  without `STATUS`, prints nothing at all ([mc] §2, [gate] §10).
- Verification: the command below. Empty output passes; each block printed is
  a finding.

  ```sh
  grep -rPzo --include='*.cmake' --exclude-dir='build*' -e 'file\(DOWNLOAD(?:(?!STATUS)[^)])*\)' "$MODULE_DIR"
  ```

  After that, read each `STATUS` capture to confirm it is compared with 0.
- Severity: **MUST**. Floor: any version.

**CMK-MOD-02 — Give every downloaded artifact that will be executed,
extracted, linked or swapped in over a live copy an `EXPECTED_HASH`, and
verify it before the artifact becomes active.**
- The only exception is a documented trust root: a manifest or `SHA256SUMS`
  file that carries the hashes. Name it as such in the module header.
- Rationale: `EXPECTED_HASH` is the only integrity check CMake runs inside the
  download ([mc] Sources, file.rst v4.4.2), and before 3.31 TLS was not
  verified by default ([map] H5). vcpkg carries a hash on 40 of 40 sampled
  github-sourced ports ([deps] §5).
- Verification: the grep below lists downloads with no hash. Empty output
  passes; each block printed must be a documented trust root. Then trace
  every self-update path from its download to its `file(RENAME)` and confirm
  the hash check sits between the two.

  ```sh
  grep -rPzo --include='*.cmake' --exclude-dir='build*' -e 'file\(DOWNLOAD(?:(?!EXPECTED_HASH)(?!EXPECTED_MD5)[^)])*\)' "$MODULE_DIR"
  ```

- Severity: **MUST**. Floor: any version.

**CMK-MOD-03 — Pass `TLS_VERIFY ON` to every `file(DOWNLOAD)` in a module
whose declared floor is below 3.31.**
- Rationale: the `CMAKE_TLS_VERIFY` documentation marks the default as
  changed to on in 3.31, off before that, and the 3.31 release notes say
  the change was made without a policy. The `CMAKE_TLS_VERIFY=0`
  environment variable (read since 3.30) still switches it off for
  downloads that do not pass the option ([map] H5, [mc] §2). Measured by
  verify wave 2 against a local self-signed HTTPS server on 3.31.12, 4.3.4
  and 4.4.2: the default fails verification (status 60), `CMAKE_TLS_VERIFY=0`
  makes it succeed, and an explicit `TLS_VERIFY ON` fails even with the
  variable set to 0. The minimum TLS version also defaults to 1.2 only from
  3.31 (`CMAKE_TLS_VERSION.rst` @ v4.4.2, [net] §3); the `TLS_VERSION`
  option needs 3.30, so no rule pins it below that.
- Verification: first read the floor from `cmake_minimum_required` (or the
  module's `CMAKE_VERSION` guard). If it is below 3.31, the command below must
  print nothing. Empty passes; each block printed is a finding.

  ```sh
  grep -rPzo --include='*.cmake' --exclude-dir='build*' -e 'file\(DOWNLOAD(?:(?!TLS_VERIFY)[^)])*\)' "$MODULE_DIR"
  ```

- Severity: **MUST** when the declared floor is below 3.31 (the option
  itself predates every floor this set supports). At a 3.31+ floor the
  explicit `TLS_VERIFY ON` still guards against the environment override, as
  defence in depth.

**CMK-MOD-04 — Make every `execute_process` fail loudly: either test its
`RESULT_VARIABLE` or `RESULTS_VARIABLE`, or pass `COMMAND_ERROR_IS_FATAL ANY`.**
- A probe, where failure is itself a valid answer, still captures
  `RESULT_VARIABLE` and carries a comment saying it is a probe. A comment
  alone is not enough: on 4.0 and later an includer's
  `CMAKE_EXECUTE_PROCESS_COMMAND_ERROR_IS_FATAL ANY` makes a probe with no
  `RESULT_VARIABLE` halt the configure (measured on 4.3.4 and 4.4.2; 3.31.12
  ignores the variable), and a supplied `RESULT_VARIABLE` exempts the call
  from that variable (execute_process.rst @ v4.4.2).
- Rationale: measured on both lines, an unchecked `execute_process(COMMAND
  false)` lets the configure run to the end ([mc] §3).
- Verification: the command below. Empty output passes; each block printed
  is a finding, probes included. For every `RESULT_VARIABLE` captured, read
  that it is actually tested or that the call carries the probe comment.

  ```sh
  grep -rPzo --include='*.cmake' --exclude-dir='build*' -e 'execute_process\((?:(?!RESULTS?_VARIABLE)(?!COMMAND_ERROR_IS_FATAL)[^)])*\)' "$MODULE_DIR"
  ```

- Severity: **MUST**. Floor: `COMMAND_ERROR_IS_FATAL` needs 3.19 or later
  (its `NONE` value and the `CMAKE_EXECUTE_PROCESS_COMMAND_ERROR_IS_FATAL`
  variable need 4.0); `RESULT_VARIABLE` works on any version.

#### Caught by reading how the module loads (policies and duplicate loads)

**CMK-MOD-05 — Put every `function()` and `macro()` a module defines inside
its policy pin.**
- On any floor, use `cmake_policy(PUSH)` and `cmake_policy(VERSION <floor>)`
  before the first definition and `cmake_policy(POP)` after the last one. On
  3.25 or later, `block(SCOPE_FOR POLICIES)` … `endblock()` is equivalent.
- The one exception is a helper whose job is to run the caller's own code
  (`cmake_language(EVAL)`, a forwarded `find_package` or `add_subdirectory`)
  under the caller's policies. It sits after the pin closes, with a comment
  saying why, as
  `Kitware__CMake@e8befb989b:Modules/FetchContent.cmake:2490-2507` does.
- Rationale: a function captures policies where it is defined. Both [mc] §15
  and [gate] §7 measured that a function defined after the `POP` follows the
  includer's policy version, and C11 shows `block(SCOPE_FOR POLICIES)` pins
  the same way. `conan_provider.cmake:35..722` and Kitware's
  `FindZLIB.cmake:127-128,279` both close the pin at the end of the file.
  A pin below 3.31 also leaves CMP0176 unset inside every pinned function,
  even on 4.4.2 (C19); CMK-MOD-19 is the compensating rule.
- Verification: run the awk command below on each module file. Empty output
  passes; a printed line is the finding unless it is the commented
  caller-code exception above. It accepts either pin form, indented or
  upper-case definitions, and reports a definition before the pin opens,
  after it closes, or with no pin at all. A later variables-only
  `block()` can hide a late definition, so read any `endblock()` it trusts.

  ```sh
  awk '{l=tolower($0)} l~/cmake_policy\(push\)/{if(!open)open=NR} l~/^[[:space:]]*block\(scope_for[^)]*policies/{if(!open)open=NR} l~/^[[:space:]]*block\(\)/{if(!open)open=NR} l~/cmake_policy\(pop\)/{shut=NR} l~/^[[:space:]]*endblock\(/{shut=NR} l~/^[[:space:]]*function\(/{if(!first)first=NR; last=NR} l~/^[[:space:]]*macro\(/{if(!first)first=NR; last=NR} END{if(first && !open) print FILENAME": definition at "first" with no policy pin"; else if(first && first<open) print FILENAME": definition at "first" before the pin opens at "open; else if(last>shut) print FILENAME": definition at "last" after the pin closes at "shut}' "$MODULE_FILE"
  ```

- Severity: **MUST**. Floor: PUSH/POP works on any version;
  `block(SCOPE_FOR POLICIES)` needs 3.25 or later.

**CMK-MOD-06 — Never change the includer's policy state from a module's file
scope.** That means no `set(CMAKE_POLICY_DEFAULT_CMP…)` and no
`cmake_policy(SET …)` outside the pin. A module that must do so, as CPM.cmake
does for CMP0077, CMP0126, CMP0135 and CMP0150, says so in its header.
- Rationale: `CMAKE_POLICY_DEFAULT_CMP<NNNN>` is a plain variable, so it
  applies to every later `project()` and subdirectory, and no `POP` undoes
  it. `cpm-cmake__CPM.cmake@01678cfe17:cmake/CPM.cmake:89-113` does exactly
  this without any `PUSH` in its 1,386 lines ([mc] §15).
- Verification: the command below. Empty output passes; each hit needs a
  header note. If the module sets `ENV{GIT_HTTP_LOW_SPEED_*}` for
  CMK-MOD-18, that process-wide change needs the same header note.

  ```sh
  grep -rn --include='*.cmake' --exclude-dir='build*' -e 'CMAKE_POLICY_DEFAULT_CMP' "$MODULE_DIR"
  ```

  Then read every `cmake_policy(SET` for whether it sits inside the pin.
- Severity: SHOULD, because CPM does this on purpose and documents it in its
  source. Floor: any version.

**CMK-MOD-07 — Give a copy-and-own module a single version variable, record
it in a GLOBAL property on first load, and `FATAL_ERROR` when a second copy
at a different path loads with a different version.**
- Rationale: `include_guard(GLOBAL)` is keyed on the file's path. Measured: two
  vendored copies both run in full, the last one wins, and nothing in the log
  mentions it ([gate] §10). The same version variable is what lets a consumer
  check they have the pinned copy (M-D-14, [mc] §11).
- Verification: set `MODULE_NAME` to the module's file name (for example
  `mymodule.cmake`) and run the command below. More than one path printed
  means the module is vendored twice. Then read each copy for the version
  check. A bare `include_guard` with no check is the finding.

  ```sh
  grep -rl --include="$MODULE_NAME" --exclude-dir='build*' -e 'include_guard' "$ROOT"
  ```

- Severity: SHOULD. The collision is measured, but the remedy is argued.
  Floor: any version.

#### Caught by reading each Find module

**CMK-MOD-08 — In a `Find<Pkg>.cmake`:**
- Set `<Pkg>_FOUND` through `find_package_handle_standard_args`, which honours
  QUIET, REQUIRED and version requests.
- Create each imported target namespaced as `<Pkg>::<Component>`
  (`<Pkg>::<Pkg>` for a single library), under
  `if(<Pkg>_FOUND AND NOT TARGET <Pkg>::<Component>)`.
- Add no `include_guard`.

Rationale: FPHSA and namespaced imported targets are the `cmake-developer(7)`
contract at v4.4.2; that manual says the targets "should be namespaced" and
uses `Foo::Foo` as its single-library example, not as the only allowed name.
`find_package` runs the module again from every directory that calls it
([mc] §1). Measured by verify wave 2 on 3.31.12, 4.3.4 and 4.4.2: with
`include_guard(GLOBAL)` in the module, a second `find_package(Foo REQUIRED)`
from a sibling directory skips the module, leaves `Foo_FOUND` empty and
`Foo::Foo` invisible, and the configure still exits 0.
`ccache__ccache@b471bbde29:cmake/` breaks the contract in all 8 of its Find
modules.

Verification:
- The first command lists Find modules without FPHSA. Empty output passes;
  each file listed is a finding.
- The second lists IMPORTED targets and `include_guard` calls. Read each
  IMPORTED target for its `NOT TARGET` guard; an `include_guard` hit is a
  finding.

```sh
grep -rL --include='Find*.cmake' --exclude-dir='build*' -e 'find_package_handle_standard_args' "$MODULE_DIR"
grep -rn --include='Find*.cmake' --exclude-dir='build*' -e 'IMPORTED' -e 'include_guard' "$MODULE_DIR"
```

Severity: **MUST**. Floor: any version.

**CMK-MOD-09 — Keep a Find module off the network by default.**
- A fetch on a miss (`FetchContent`, `ExternalProject`, `file(DOWNLOAD)`) runs
  only behind an option declared in the same file, defaulting to OFF and
  documented in its `.rst:` header.
- Rationale: Module mode is expected to search locally, and a fetch hides a
  network dependency behind the call site.
  `ccache__ccache@b471bbde29:cmake/FindZstd.cmake:6-8,43-70` downloads when
  the `DEPS` variable is `AUTO`. `DEPS` is declared elsewhere
  (`cmake/Dependencies.cmake:15`) and defaults to `AUTO`, so a copy of the file
  fetches by default ([mc] §1, [deps] smell 4).
- Verification: the command below. Empty output passes. A hit passes only if
  the same file declares the default-OFF option that gates it.

  ```sh
  grep -rn --include='Find*.cmake' --exclude-dir='build*' -e 'FetchContent' -e 'ExternalProject' -e 'file(DOWNLOAD' "$MODULE_DIR"
  ```

- Severity: SHOULD, downgraded (see Conflicts). Floor: any version.

#### Caught by a configure experiment (state across configures)

**CMK-MOD-10 — Register every project file the module reads at configure time
with `set_property(DIRECTORY APPEND PROPERTY CMAKE_CONFIGURE_DEPENDS …)`,
never with a variable of that name.** Also document that a watched file
created after the first configure needs a manual reconfigure.
- Rationale: measured on both lines (C7 to C10). An unregistered file is never
  reread. The variable form does nothing, with no warning. A watched path that
  did not exist at configure time does not trigger a re-run when it appears.
- Verification: the command below. Empty output passes; each hit is a finding.

  ```sh
  grep -rn --include='*.cmake' --exclude-dir='build*' -e 'list(APPEND CMAKE_CONFIGURE_DEPENDS' -e 'set(CMAKE_CONFIGURE_DEPENDS' "$MODULE_DIR"
  ```

  Then read that every `file(READ`, `file(STRINGS` or `string(JSON` on a
  project file has a matching property append.
- Severity: **MUST**. Floor: any version.

**CMK-MOD-11 — Take environment variables into the cache from an allow-list.
Never copy a whole namespace.**
- Credentials are read live and forwarded through the child process's
  environment, never through `CACHE`.
- Rationale: measured, a loop over a whole namespace wrote a planted
  `*_AUTH_TOKEN` into `CMakeCache.txt` in plain text ([mc] §7).
- Verification: set `DUMMY_SECRET=sk-dummy-4b1d` and export it under every
  credential-shaped name the module might read. Configure into `BUILD_DIR`,
  then run the command below. Empty output passes; a hit is the finding.

  ```sh
  grep -rn --include='CMakeCache.txt' -e "$DUMMY_SECRET" "$BUILD_DIR"
  ```

- Severity: **MUST**. Floor: any version.

**CMK-MOD-12 — Hand off to `find_package` by setting the case-preserved
`<Name>_ROOT` as `CACHE PATH … FORCE`.**
- Do not also emit the upper-case `<NAME>_ROOT`. That form is the consumer's
  CMP0144 opt-in.
- Rationale: measured on 4.4.2, `Foo_ROOT` alone is found under CMP0074 and
  outranks `CMAKE_PREFIX_PATH`. Upper-case alone is ignored unless the
  consumer sets CMP0144 NEW ([mc] §9). A write without `FORCE` does not
  replace an existing cache entry ([gate] §5).
- Verification: the command below, then read each `set(` hit for its case,
  `CACHE PATH` and `FORCE`. An upper-case-only root is the finding.

  ```sh
  grep -rn --include='*.cmake' --exclude-dir='build*' -e '_ROOT' "$MODULE_DIR"
  ```

- Severity: **MUST** for modules that provision tools or packages. Floor:
  CMP0074 needs 3.12 or later, below the assumed floor.

**CMK-MOD-13 — Choose which binary a tool-provisioning module fetches from
the host, never from `CMAKE_SYSTEM_*`: `CMAKE_HOST_SYSTEM_NAME` for the OS,
and `cmake_host_system_information(RESULT … QUERY OS_PLATFORM)` for the CPU
in any code that can run under `cmake -P`.**
- Rationale: the variable manuals define the `HOST_` forms as the machine
  running CMake and the plain forms as the build target. A cross build would
  fetch a tool that cannot run. Measured by verify wave 2 on 3.31.12, 4.3.4
  and 4.4.2: under `cmake -P`, `CMAKE_HOST_SYSTEM_PROCESSOR` is empty while
  `CMAKE_HOST_SYSTEM_NAME` and the `OS_PLATFORM` query are set. find_ocx gets
  this right at `ocx.cmake:482-509`, which uses the query ([mc] §12).
- Verification: the first command below. Empty output passes. A hit inside
  the code that picks a binary is the finding. Then run the second: a hit in
  code reachable from a `cmake -P` entry point is a finding, because the
  variable is empty there.

  ```sh
  grep -rn --include='*.cmake' --exclude-dir='build*' -e 'CMAKE_SYSTEM_NAME' -e 'CMAKE_SYSTEM_PROCESSOR' "$MODULE_DIR"
  grep -rn --include='*.cmake' --exclude-dir='build*' -e 'CMAKE_HOST_SYSTEM_PROCESSOR' "$MODULE_DIR"
  ```

- Severity: **MUST**. Floor: any version.

#### Caught by reading the public surface

**CMK-MOD-14 — For any entry point documented to run as `cmake -P`:**
- Guard on `CMAKE_SCRIPT_MODE_FILE` before calling anything that needs a
  project. Measured by verify wave 2 on all three lines: `cmake_language(DEFER)`
  is a hard error under `-P`, while `set_property(DIRECTORY …)` is accepted
  silently and does nothing, which is the case the guard exists for.
  Project commands fail loudly instead: `add_library` under `-P` prints
  `add_library command is not scriptable` (C20).
- Give the entry point a public name, not the module's private `__` prefix.

Rationale: `cmake-commands(7)` separates scripting commands from project
commands. A consumer-invoked function with a private-looking name hides the
public surface from review ([mc] §8, [ocx] smell 5).

Verification:
- The first command finds the documented `-P` entry points; check each name
  against the private prefix.
- The second must print at least one line whenever the first did.

```sh
grep -rn --include='*.md' --include='*.rst' -e 'cmake -P' "$DOC_DIR"
grep -rn --include='*.cmake' --exclude-dir='build*' -e 'CMAKE_SCRIPT_MODE_FILE' "$MODULE_DIR"
```

Severity: SHOULD. The naming half rests on codified house practice, the LLVM
CMake primer and the `cmake-developer(7)` underscore convention. Floor: any
version.

#### Caught by gersemi (formatting a module's own commands)

**CMK-MOD-15 — Commit a `.gersemirc` whose `definitions` key lists every file
or directory that defines the project's own commands. Gate with
`gersemi --check`, never `--diff`.**
- Rationale: C14 shows the config key removes the unknown-command warnings,
  and `--diff` exits 0 even when it would reformat. The testing dive measured
  that without definitions gersemi leaves custom calls alone and prints 13
  unknown-command warnings on find_ocx at `ac2a759cd0` (17 on the dirty tree
  re-run by verify wave 2), and 5 on spdlog ([mt] §6).
  `.gersemirc` is the only file name gersemi discovers ([mt] §7). CMK-CORE
  owns the gate line itself.
- Verification: run `gersemi --check "$MODULE_DIR"` (CMakeLists.txt is found
  by the directory walk). Exit 0 passes. Any `Warning: unknown command` on
  stderr means the `definitions` list is incomplete.
- Severity: SHOULD (owner default 6). Floor: gersemi 0.29.1, 2026-09-14.

**CMK-MOD-16 — Parse each command's keywords with one top-level
`cmake_parse_arguments(PARSE_ARGV 0 …)` per function.**
- Split a dispatch-style function that has several verbs into one function
  per verb.
- Put `# gersemi: hints { <KEYWORD>: command_line }` directly above the parse
  for each keyword that forwards argv.
- Rationale: C12 shows gersemi recognises `PARSE_ARGV` signatures. Verify
  wave 2 isolated C13: gersemi 0.29.1 reads a top-level parse whether it takes
  `PARSE_ARGV`, `${ARGN}` or a reassigned list, and reads none of them once the
  parse sits inside an `if()`. Without the hint, a forwarded command line is
  split one token per line ([mt] §6). The correctness reason for `PARSE_ARGV`
  belongs to CMK-LANG ([gate] §9).
- Verification: run the awk command on each module file. Empty output passes;
  each line printed is a parse nested in a control block, the finding. Run the
  grep to list the hints; a keyword that forwards argv with no hint is the
  finding.

  ```sh
  awk '{l=tolower($0)} l~/^[[:space:]]*function\(/{d=0} l~/^[[:space:]]*if\(/{d++} l~/^[[:space:]]*foreach\(/{d++} l~/^[[:space:]]*while\(/{d++} l~/^[[:space:]]*endif\(/{d--} l~/^[[:space:]]*endforeach\(/{d--} l~/^[[:space:]]*endwhile\(/{d--} l~/cmake_parse_arguments\(/{if(d>0) print FILENAME":"FNR": parse nested in a control block"}' "$MODULE_FILE"
  grep -rn --include='*.cmake' --exclude-dir='build*' -e 'gersemi: hints' "$MODULE_DIR"
  ```

- Severity: SHOULD. Floor: `PARSE_ARGV` needs 3.7 or later
  (cmake_parse_arguments.rst @ v4.4.2; 3.5 is when the command became
  built in); gersemi 0.29.1.

#### Added in wave 3: caught by grepping for unbounded fetches and undecoded output

**CMK-MOD-17 — Give every network download a finite `TIMEOUT` or
`INACTIVITY_TIMEOUT`: each `file(DOWNLOAD)`, and each `FetchContent_Declare`
or `ExternalProject_Add` that fetches by `URL`.**
- Size the value for the retries: through `FetchContent` or
  `ExternalProject`, a timed-out download is attempted up to six times (one
  try plus five retries), so the worst case is about 6 × T + 85 s (C16). Prefer `INACTIVITY_TIMEOUT` for a
  large artifact, since `TIMEOUT` also cuts off a slow but healthy transfer.
- A timeout returns status 28 and lets the configure continue (C15), so
  CMK-MOD-01's `STATUS` check is still what stops it.
- Rationale: `cmFileCommand.cxx` sets `CURLOPT_TIMEOUT` and
  `CURLOPT_LOW_SPEED_*` only when the caller passes the options, at v3.31.12
  and v4.4.2 alike ([net] §1). Measured on all three lines: with neither
  option, a server that accepts and never answers holds the configure until
  it is killed (C15). 2 of 52 module download calls in the corpus set
  `TIMEOUT` (`grpc__grpc@0f8d72ed71:cmake/download_archive.cmake:31,41`), and
  none sets `INACTIVITY_TIMEOUT` ([net] §2).
- Verification: the three commands below. Empty output passes; each block
  printed is a finding. The lookahead also accepts `INACTIVITY_TIMEOUT`,
  which contains `TIMEOUT`. The `URL` keyword must have whitespace on both
  sides, so a `GIT_REPOSITORY ${URL}` fetch is not reported.

  ```sh
  grep -rPzo --include='*.cmake' --exclude-dir='build*' -e 'file\(DOWNLOAD(?:(?!TIMEOUT)[^)])*\)' "$MODULE_DIR"
  grep -rPzo --include='*.cmake' --exclude-dir='build*' -e 'FetchContent_Declare\((?=[^)]*\sURL\s)(?:(?!TIMEOUT)[^)])*\)' "$MODULE_DIR"
  grep -rPzo --include='*.cmake' --exclude-dir='build*' -e 'ExternalProject_Add\((?=[^)]*\sURL\s)(?:(?!TIMEOUT)[^)])*\)' "$MODULE_DIR"
  ```

- Severity: **MUST**. Floor: `file(DOWNLOAD)` has had both options since
  before 3.0 (no `versionadded` in file.rst @ v4.4.2); `ExternalProject_Add`'s
  `INACTIVITY_TIMEOUT` needs 3.19. Both are below the assumed floor.

**CMK-MOD-18 — Never count on `TIMEOUT` or `INACTIVITY_TIMEOUT` to bound a
`GIT_REPOSITORY` fetch. Bound git itself with `GIT_HTTP_LOW_SPEED_LIMIT` and
`GIT_HTTP_LOW_SPEED_TIME`, or fetch a hashed `URL` archive instead.**
- Set the git variables in CI. A module that sets them itself does so only
  when `ENV{GIT_HTTP_LOW_SPEED_LIMIT}` is not already defined, and says so in
  its header (the change is process-wide, as in CMK-MOD-06).
- Rationale: `gitclone.cmake.in` @ v4.4.2 never reads either keyword
  ([net] §1). Measured on all three lines, a git fetch carrying both still
  hangs (C17), and the git variables end it after three 5 s attempts (C18).
  The worst case is about (1 + retries) × `GIT_HTTP_LOW_SPEED_TIME`. On 3.31
  and 4.3 the template makes 3 attempts. On 4.4 and later it makes 1 +
  `CMAKE_EP_GIT_CLONE_RETRY_COUNT` attempts: the default is 2 retries with a
  0 s delay, which is still 3 attempts (`ExternalProject.cmake` @ v4.4.2,
  "versionadded 4.4"). Choosing `URL` over `GIT_REPOSITORY` for a dependency
  belongs to CMK-DEP.
- Verification: the first command prints any call that carries both
  `GIT_REPOSITORY` and a timeout keyword; each block is a finding, because
  the author believed the keyword bounds the clone. Empty output passes. The
  second lists git fetches and any git bound; a `GIT_REPOSITORY` hit with no
  bound in the module or in `CI_DIR` is the finding.

  ```sh
  grep -rPzo --include='*.cmake' --exclude-dir='build*' -e '\((?=[^)]*GIT_REPOSITORY)(?=[^)]*TIMEOUT)[^)]*\)' "$MODULE_DIR"
  grep -rn --exclude-dir='build*' -e 'GIT_REPOSITORY' -e 'GIT_HTTP_LOW_SPEED' "$MODULE_DIR" "$CI_DIR"
  ```

- Severity: SHOULD. The remedy changes the process environment and covers
  HTTP(S) only (Verdict 12). Floor: any version.

**CMK-MOD-19 — Pass `ENCODING UTF-8` to every `execute_process` that
captures `OUTPUT_VARIABLE` or `ERROR_VARIABLE`, when the module's floor or
policy pin is below 3.31.**
- Rationale: below policy version 3.31, CMP0176 leaves the default at `AUTO`
  (the Windows console or ANSI code page), a default CMake itself calls
  accidental (`CMP0176.rst` @ v4.4.2, issue 26262). The policy does not warn.
  C19 shows the CMK-MOD-05 pin puts every pinned function on the OLD default
  even under 4.4.2. `ENCODING` is ignored on other platforms, so the keyword
  is free there. Kitware's own
  `Modules/ExternalProject/shared_internal_commands.cmake:68-76` @ v4.4.2
  passes it explicitly. Of the other 45 corpus repos, one passes it outside
  module code: a vendored copy of Kitware's test driver
  (`qt__qtbase@0ef5a8e9ca:src/testinternal/3rdparty/cmake/RunCMake.cmake:168`,
  spelled `UTF8`). No shipped module passes it ([net] §4 searched only the
  hyphenated spelling).
- Verification: first read the floor and the pin version; at 3.31 or later
  the rule does not apply. Otherwise run the command below. Empty output
  passes; each block printed is a finding. `RESULT_VARIABLE` alone does not
  trigger it.

  ```sh
  grep -rPzo --include='*.cmake' --exclude-dir='build*' -e 'execute_process\((?=[^)]*(?<!RESULT)(?<!RESULTS)_VARIABLE)(?:(?!ENCODING)[^)])*\)' "$MODULE_DIR"
  ```

- Severity: **MUST** below a 3.31 floor or pin. The Windows mis-decoding is
  normative, not measured (Verdict 12). Floor: `ENCODING` needs 3.8 and its
  `UTF-8` value 3.11.

**CMK-MOD-20 — Keep `cmake_language(DEFER)` out of every path a `cmake -P`
entry point can reach, and `cmake_language(EXIT)` out of every path a
project configure can reach.**
- Guard each with `CMAKE_SCRIPT_MODE_FILE`, as
  `find_ocx ocx.cmake:641-643` does for its DEFER.
- Rationale: `cmake_language` has no single scope rule. `DEFER` needs a
  project directory and fails under `-P`, including inside a file the script
  `include()`s; `EXIT` fails anywhere except `-P` (C20, C21;
  `cmake_language.rst` @ v4.4.2). Both failures are loud, so the rule is about
  shipping a module that works in both of its documented modes.
- Verification: the command below. Empty output passes. Each hit must sit
  under a `CMAKE_SCRIPT_MODE_FILE` guard that excludes the wrong mode;
  CMK-TEST-05 then runs each entry point.

  ```sh
  grep -rn --include='*.cmake' --exclude-dir='build*' -e 'cmake_language(DEFER' -e 'cmake_language(EXIT' "$MODULE_DIR"
  ```

- Severity: SHOULD. Floor: `DEFER` needs 3.19, `EXIT` 3.29.

### CMK-TEST — testing CMake code itself

Consumer kind: **CMake module author**, and any project that tests its own
CMake diagnostics. Suite-level CTest rules (timeouts, `--no-tests=error`,
discovery) are the wave-3 `ctest-contract` dive's.

#### Caught by reading the CI matrix

**CMK-TEST-01 — Run the module's tests on a real binary of every CMake line
it claims: at least the declared floor and the newest release.**
- Call each binary by an explicit provisioned path. Two patterns work: a CI
  matrix axis, as CPM.cmake does, or `ctest --build-and-test` per provisioned
  binary, as find_ocx does.
- A floor that no leg can provision is raised or labelled untested. It is
  never left standing as a claim.
- Rationale: behaviour differs between tested lines. `-Werror=author` does
  nothing on 4.3 and earlier ([gate] §1); the gate does nothing under `-P` on
  4.3 and earlier (C5); the TLS default flips at 3.31. find_ocx claims 3.19
  and Findocx 3.15, but tests only 3.31 and 4 ([mt] §2).
- Verification: the command below, compared with every
  `cmake_minimum_required` and `CMAKE_VERSION VERSION_LESS` floor in
  `MODULE_DIR`. A claimed floor with no matching leg is the finding.

  ```sh
  grep -rn --include='*.yml' --include='*.yaml' -e 'cmake_version' -e 'cmake-version' -e 'cmakeVersion' "$CI_DIR"
  ```

  Also read each `add_test` for a bare `cmake` or `${CMAKE_COMMAND}` used
  where a version-specific run is claimed.
- Severity: **MUST**. Floor: any version.

#### Caught by reading the test driver

**CMK-TEST-02 — Put the configure gate, spelled for that line, on every inner
configure the harness drives, including `execute_process`-driven
reconfigures.** For each `cmake -P` case on 4.3 or earlier, which the gate
cannot reach, add `FAIL_REGULAR_EXPRESSION "CMake Warning;CMake Deprecation
Warning"`.
- Rationale: find_ocx drives 5 of its 10 test families without the gate. One
  of them, `memoize`, is a plain configure with no reason to skip it
  (`tests/reconfigure_check.cmake:16-18`). C5 measured the script-mode hole
  and C6 the substitute.
- Verification: the command below, then read each hit for the gate flag or
  the `FAIL_REGULAR_EXPRESSION`. A hit with neither is the finding.

  ```sh
  grep -rn --include='*.cmake' --include='CMakeLists.txt' -e 'build-and-test' -e ' -S ' -e ' -P ' "$TEST_DIR"
  ```

- Severity: **MUST**. Floor: the gate works in script mode on 4.4 and later;
  the substitute works on any version.

**CMK-TEST-03 — A negative test asserts the exit status and the diagnostic
together.**
- Use `PASS_REGULAR_EXPRESSION` that includes the severity header, for example
  `"CMake Error at [^\n]*\\(message\\):\n  mymodule: …"`, or a driver in the
  RunCMake style that checks the result code and stderr separately.
- Never `WILL_FAIL` alone, never `WILL_FAIL` combined with a regex, and never
  a regex matching only the message.
- Rationale: measured on 3.31.12 and 4.4.2 (C1 to C4). A regex alone ignores
  the exit code. `WILL_FAIL` passes on any failure. The two combined invert
  each other. RunCMake checks `-result.txt` and `-stderr.txt` together
  ([mt] §1).
- Verification: the command below. Every `WILL_FAIL` hit is a finding. Every
  regex that lacks a severity header is a finding unless its command is a
  driver that checks the exit code.

  ```sh
  grep -rn --include='*.cmake' --include='CMakeLists.txt' -e 'WILL_FAIL' -e 'PASS_REGULAR_EXPRESSION' "$TEST_DIR"
  ```

- Severity: **MUST**. Floor: any version.

**CMK-TEST-04 — A memoization or reconfigure test runs three configures:
baseline, repeat with nothing changed (expect a hit), then change one input
(expect invalidation, and correct re-storing).**
- Rationale: find_ocx's test only proves the hit. Neither the audit's false
  defect nor its refutation could be settled by the project's own suite;
  settling it took the external three-run repro in [gate] §6.
- Verification: a reading heuristic. Count the configures in the test file
  and look for a mutated input between two of them. A file with two identical
  configures is the finding.
- Severity: SHOULD. Floor: any version.

**CMK-TEST-05 — Exercise every shipped file through the entry point a
consumer uses:** `find_package` for a `Find<Pkg>.cmake`, `include()` for a
helper, `cmake -P` for a script entry point.
- Rationale: `Findocx.cmake` ships, yet no test calls it through
  `find_package`; the only test copies it and checks its hash ([mt] §2).
- Verification: set `SHIPPED` to one shipped file's base name, for example
  `Findocx`, and run the command below. Empty output is the finding. A hit
  counts only if it is a real call rather than a file copy.

  ```sh
  grep -rn --include='*.cmake' --include='CMakeLists.txt' -e "$SHIPPED" "$TEST_DIR"
  ```

- Severity: SHOULD. Floor: any version.

**Dropped, with reasons:**
- M-D-07 and M-D-08 (a module prefix on messages, `string(JSON …
  ERROR_VARIABLE)`): argued only. Without `ERROR_VARIABLE` the configure
  already stops, so the rule would only improve wording.
- M-D-13 (docs from `.rst:` bracket comments): the map files it as a P3
  mechanism note, and docs-quality owns the prose.
- M-D-15's offline and mirror knobs: CMK-DEP and CMK-BZL own offline builds.
- Formerly dropped, reinstated in wave 3: `ENCODING UTF-8` below 3.31 (now
  CMK-MOD-19) and download timeouts (now CMK-MOD-17).

## Applied to find_ocx and the exemplars

find_ocx is read in its dirty working tree on 2026-09-26; the line numbers
were re-checked this session. The corpus SHAs are those of [map] H8.

| Rule | Satisfied by | Violated by | Status for find_ocx |
|---|---|---|---|
| MOD-01 | `find_ocx ocx.cmake:738,765,1413,1434,1467`, all five checked | — | holds |
| MOD-02 | `ocx.cmake:765,1467` (`EXPECTED_HASH SHA256`, verified before the rename) | `ocx.cmake:738,1413,1434` are trust roots and dynamic content that the header never names as such ([ocx] smell 9) | new commitment: document the trust roots |
| MOD-03 | — | `ocx.cmake:738,765,1413,1434,1467`: 0 of 5 pass `TLS_VERIFY`, with a floor of 3.19 (the CMK-MOD-03 lookahead prints all five) | **violated** |
| MOD-04 | `ocx.cmake:449,556`; `conan-io__cmake-conan@b1593849dd:conan_provider.cmake:450,459,489` | `conan_provider.cmake:322` (`xcrun --find`, no result check) is the probe exception, but carries no comment | holds |
| MOD-05 | `conan_provider.cmake:35` PUSH to `:722` POP; `Kitware__CMake@e8befb989b:Modules/FindZLIB.cmake:127-128,279` | `ocx.cmake:1383` POP comes before `__ocx_self_update` at `:1394`, and the awk check prints it | **violated**; low practical severity ([map] "not a defect" list) |
| MOD-06 | find_ocx sets no policy defaults | `cpm-cmake__CPM.cmake@01678cfe17:cmake/CPM.cmake:89-113` (by design; its reason is only in code comments) | holds |
| MOD-07 | `ocx.cmake:182` declares `__OCX_MODULE_VERSION` | `ocx.cmake:173` relies on `include_guard(GLOBAL)` alone | new commitment |
| MOD-08 | `find_ocx Findocx.cmake:79,84`; Kitware `FindZLIB`, `FindBZip2`, `FindEXPAT`, `FindIconv` | `ccache__ccache@b471bbde29:cmake/` (0 of 8 Find modules call FPHSA); `FindZstd.cmake:19` target `dep_zstd` is not namespaced | holds |
| MOD-09 | `Findocx.cmake`'s bootstrap is opt-in (`OCX_BOOTSTRAP`) | `ccache__ccache@b471bbde29:cmake/FindZstd.cmake:6-8,43-70` (on by default, gated from outside the file) | holds |
| MOD-10 | `ocx.cmake:925-929,1145-1149` use the property form | — | the created-later gap is undocumented ([ocx] §7): new commitment |
| MOD-11 | `ocx.cmake:162-164,367-377` (`OCX_AUTH_*` never snapshotted) | [mc] §7's manufactured loop | holds |
| MOD-12 | `ocx.cmake:1199-1202` | — | holds |
| MOD-13 | `ocx.cmake:482-509` | — | holds |
| MOD-14 | — | `ocx.cmake:1394` `__ocx_self_update` is the documented `-P` entry point at `README.md:54` | **violated** |
| MOD-15 | none: 0 of 46 run gersemi ([map] H7) | find_ocx `ocx.cmake` (plain `--check`: exit 1, 13 warnings at `ac2a759cd0`, 17 on the 2026-09-26 dirty tree); `gabime__spdlog@5b63780337:CMakeLists.txt` (5 warnings) | new commitment |
| MOD-16 | 4 of 6 parses sit at function top level (`ocx.cmake:442,692,872,1072`) | `ocx_index` nests both of its parses in its verb dispatch (`ocx.cmake:1296` under `FIND`, `:1327` under `UPDATE_COMMAND`), so gersemi reads neither (C13 as corrected); `ocx.cmake:436-450` `__ocx_run` has no `COMMAND` hint | **violated** |
| MOD-17 | `grpc__grpc@0f8d72ed71:cmake/download_archive.cmake:31,41` (`TIMEOUT 60`) | `ocx.cmake:738,765,1413,1434,1467`: 0 of 5 set either keyword (the first CMK-MOD-17 lookahead prints all five) | **violated** |
| MOD-18 | find_ocx has no `GIT_REPOSITORY` fetch | — (issue 23443, which [net] §1 cited, hangs after the clone finished and has no diagnosed cause) | holds (not applicable) |
| MOD-19 | `Kitware__CMake` `Modules/ExternalProject/shared_internal_commands.cmake:68-76` @ v4.4.2 | `ocx.cmake:449` (`__ocx_run`, parses `ocx` output) and `:556` under the 3.19 pin at `:180`; `Findocx.cmake:62` (floor 3.15) | **violated** |
| MOD-20 | `ocx.cmake:641-643` guards its DEFER with `NOT CMAKE_SCRIPT_MODE_FILE` | — | holds |
| TEST-01 | `cpm-cmake__CPM.cmake@01678cfe17:.github/workflows/test.yaml:22` (3.16.3, 3.28.3, 4.3.2) | `find_ocx CMakeLists.txt:20-24` (the 3.19 line is commented out); `conan-io__cmake-conan@b1593849dd:.github/workflows/cmake_conan.yml:41,58` (a single `~3.31.7`, in both jobs) | **violated** |
| TEST-02 | `find_ocx tests/helpers.cmake:44,57` (spelled `-Werror=dev` only, which 4.4 accepts with a deprecation notice) | `tests/reconfigure_check.cmake:16-18`, and the four `-P` families carry no `FAIL_REGULAR_EXPRESSION` | **violated** |
| TEST-03 | `Kitware__CMake@e8befb989b:Tests/RunCMake/RunCMake.cmake:26-58` | `find_ocx tests/helpers.cmake:65,82,100` match the message only, so the exit code is ignored (C1) | **violated** |
| TEST-04 | none found | `find_ocx tests/reconfigure_check.cmake:20-34` | **violated** |
| TEST-05 | — | `Findocx.cmake` is never loaded through `find_package` by a test | **violated** |

find_ocx already satisfies the whole fail-open family (MOD-01, -04, -11, -12,
-13, -10's property form) and has none of the classic quoting bugs
([map] "not a defect"). It breaks eleven rules: MOD-03, -05, -14, -16, -17
and -19, and TEST-01 to -05 (TEST-02 only on the families it leaves
ungated). The fixes it needs, per owner default 2 (a handoff note, no issue
filed):
1. `TLS_VERIFY ON` on 5 downloads.
2. Move the `POP` to the end of the file.
3. Rename the `-P` entry point to a public name.
4. Add a `.gersemirc`.
5. Severity-pinned regexes on 3 negative tests.
6. The gate on `memoize`, and `FAIL_REGULAR_EXPRESSION` on 4 `-P` families.
7. A third configure in the memo test.
8. A `find_package(ocx)` fixture.
9. Label the 3.19 floor untested until a 3.19 binary can be provisioned.
10. `INACTIVITY_TIMEOUT` (or `TIMEOUT`) on the same 5 downloads.
11. `ENCODING UTF-8` on `ocx.cmake:449,556` and `Findocx.cmake:62`.

## AI-agent failure modes

Ranked by how often each bites in a module an agent would write.

1. **Assuming `file(DOWNLOAD)` or `execute_process` fails the configure.** An
   agent writes the bare call and treats `if(EXISTS …)` as proof of success.
   Check: the two `grep -rPzo` lookaheads in CMK-MOD-01 and -04 print nothing.
2. **A download with no timeout.** An agent copies the bare
   `file(DOWNLOAD … STATUS st)` or `FetchContent_Declare(… URL …)`; 50 of 52
   corpus calls look like that, and a stalled server then holds the configure
   forever (C15). Check: the CMK-MOD-17 lookaheads print nothing.
3. **A negative test written as `WILL_FAIL TRUE`, or as a message-only
   `PASS_REGULAR_EXPRESSION`, or both at once.** Each passes a wrong outcome
   (C1 to C3). Check: the CMK-TEST-03 grep. Every `WILL_FAIL` is a finding;
   every regex without `CMake Error` is a finding.
4. **`list(APPEND CMAKE_CONFIGURE_DEPENDS …)` as a variable.** It does
   nothing, with no warning (C10). Check: the CMK-MOD-10 grep prints nothing.
5. **Believing `TLS_VERIFY` is always on, or always off.** Each belief is right
   for one side of 3.31. Check: read the floor first, then run the CMK-MOD-03
   lookahead.
6. **A `-Werror=dev` (or `-Werror=author`) "strict" gate on a `cmake -P` test
   under 4.3 or earlier.** It does nothing there (C5). Check: every `-P`
   `add_test` on those lines carries the `FAIL_REGULAR_EXPRESSION`.
7. **`gersemi --diff` as the CI gate, or `--check` without definitions.** The
   first exits 0 (C14); the second prints unknown-command warnings that an
   agent then files as "gersemi doesn't support this". Check: CI runs
   `--check`, `.gersemirc` carries `definitions`, and stderr has no
   `unknown command`.
8. **Emitting both `Foo_ROOT` and `FOO_ROOT`, or only `FOO_ROOT`.** Check: the
   CMK-MOD-12 read.
9. **`cmake_policy(POP)` placed before a late-added function**, often a
   script-mode helper appended at the end of the file. Check: the CMK-MOD-05
   awk command prints nothing.
10. **Treating `include(CPM.cmake)` as having no side effects.** Check: the
    CMK-MOD-06 grep, run after adding any third-party helper.
11. **Claiming "tested against CMake X" from a single `ctest --build-and-test`**
    that runs whatever `cmake` is on PATH. Check: the CMK-TEST-01 matrix read.
12. **Citing cmake-lint rule IDs as a live check.** The tool's last release is
    0.6.13, from 2020-08-19 ([mt] §5). CMK-CORE owns this; listed here because
    module reviews invite it.
13. **`set -o pipefail` followed by `… | grep -q`** in a verification script. It
    reports "not found", exit 141, on a repository that is full of matches
    ([mt] §8). CMK-CORE owns this.
14. **Adding `TIMEOUT` to a `GIT_REPOSITORY` fetch and calling it bounded.** The
    keyword is accepted and ignored (C17). Check: the first CMK-MOD-18
    lookahead prints nothing.
15. **Assuming `execute_process` output is UTF-8 everywhere.** True off
    Windows and under CMP0176 NEW; false inside a function pinned below 3.31,
    even on 4.4.2 (C19). Check: the CMK-MOD-19 lookahead.
16. **Treating `cmake_language` as one scope rule**, or porting project code
    into a `-P` script and reading `command is not scriptable` as a typo.
    `DEFER` fails under `-P`, `EXIT` fails outside it (C20, C21). Check: the
    CMK-MOD-20 grep, then CMK-TEST-05 runs each entry point.

## Open questions

**Owner decisions (defaults apply if unanswered):**
- **find_ocx handoff.** Owner question 2 defaults to "no issue filed". This
  consolidation adds five findings to the handoff note: MOD-14, MOD-16,
  TEST-03, TEST-05 and the script-mode half of TEST-02. Wave 3 adds two:
  MOD-17 (5 downloads without a timeout) and MOD-19 (3 captures without
  `ENCODING`).
- **find_ocx's 3.19 floor claim.** The mirror's floor is 3.31, so either
  backfill 3.19 into the mirror or relabel the claim as untested below 3.31.
  **Default:** relabel (CMK-TEST-01).

**Subareas that need another round:**
- **dependency-seam / hint precedence:** does a module's `<Name>_ROOT` still
  win over vcpkg's and Conan's toolchain-injected
  `CMAKE_PREFIX_PATH`/`CMAKE_FIND_ROOT_PATH`, and under
  `CMAKE_FIND_ROOT_PATH_MODE_PACKAGE ONLY` in a cross build? [mc] §9 measured
  only against a plain prefix path.
- **testing-and-ci / corpus prevalence:** how many of the corpus's 39
  `WILL_FAIL` uses ([shape] §9) are bare or message-only? That count decides
  whether CMK-TEST-03 belongs in the index's non-negotiables. It is for the
  wave-3 `ctest-contract` dive.

## Sub-artifacts

- [module-contracts.md](cmake-module-authoring/module-contracts.md): the
  contract a shipped module keeps. It covers the Find-module contract, the
  download and process contracts, credentials, the `<Name>_ROOT` handoff, and
  CPM's policy mutation, and carries 5 measurements.
- [module-testing-and-formatting.md](cmake-module-authoring/module-testing-and-formatting.md):
  RunCMake, find_ocx's and CPM's harnesses, gersemi 0.29.1 run live on
  find_ocx, cmake-format's live uses in CI, and the `pipefail` trap reproduced.
- [scratch/module-authoring-consolidation/](cmake-module-authoring/scratch/module-authoring-consolidation/):
  this consolidation's C1 to C14 fixtures and runner scripts.
- [verification-wave2.md](cmake-module-authoring/verification-wave2.md): the
  verify-wave-2 ledger (opus), with planted-violation runs of every check.
- [verification-wave3.md](cmake-module-authoring/verification-wave3.md): the
  verify-wave-3 ledger (opus). It re-runs C15 to C21 on its own fixtures and
  every MUST check verbatim from this file.
- [network-timeouts-and-platform-edges.md](cmake-module-authoring/network-timeouts-and-platform-edges.md):
  the wave-3 dive (sonnet, source and corpus only) on download timeouts, the
  git-fetch gap, CMP0176 and the script-mode command surface. Its candidate
  IDs CMK-MOD-17 to -20 are kept; C15 to C21 replace its unrun claims.

## Key sources

1. [cmake-developer(7) @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/cmake-developer.7.rst):
   the Find-module contract (CMK-MOD-08).
2. [file.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/file.rst)
   and [CMAKE_TLS_VERIFY.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/variable/CMAKE_TLS_VERIFY.rst):
   `STATUS`, `EXPECTED_HASH`, and the 3.31 default flip (CMK-MOD-01 to -03).
3. [execute_process.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/execute_process.rst):
   `COMMAND_ERROR_IS_FATAL` and CMP0176 (CMK-MOD-04).
4. [cmake_policy.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/cmake_policy.rst):
   policies captured at definition (CMK-MOD-05).
5. [CMP0074](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/policy/CMP0074.rst)
   and [CMP0144](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/policy/CMP0144.rst):
   the `<Name>_ROOT` forms (CMK-MOD-12).
6. [ctest.1.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/ctest.1.rst):
   `--build-and-test` (CMK-TEST-01).
7. `Kitware__CMake@e8befb989b:Tests/RunCMake/RunCMake.cmake:26-58`: the
   reference harness that checks result and stderr together (CMK-TEST-03).
8. [gersemi 0.29.1 README](https://raw.githubusercontent.com/BlankSpruce/gersemi/0.29.1/README.md):
   "Let's make a deal", `# gersemi: hints` and `.gersemirc` (CMK-MOD-15, -16).
9. Measured in this file, C1 to C4: CTest's negative-test semantics on 3.31.12
   and 4.4.2.
10. Measured in this file, C5 and C6: the configure gate does nothing under
    `cmake -P` on 3.31.12 and 4.3.4, works on 4.4.2, and the
    `FAIL_REGULAR_EXPRESSION` substitute.
11. Measured in this file, C7 to C10: `CMAKE_CONFIGURE_DEPENDS` (property versus
    variable, and created-later paths) under Ninja.
12. Measured in [mc] §2, §3, §7 and §9: silent download and process failures,
    the credential leak into the cache, and `<Name>_ROOT` precedence.
13. Measured in [gate] §6, §7 and §10: the memo `FORCE` refutation, policy
    capture, and two vendored copies behind `include_guard(GLOBAL)`.
14. `cpm-cmake__CPM.cmake@01678cfe17:cmake/CPM.cmake:89-113`: the file-scope
    change to policy defaults (CMK-MOD-06).
15. [cmFileCommand.cxx @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/blob/v4.4.2/Source/cmFileCommand.cxx#L2257-2266)
    (same at v3.31.12 `:2282-2291`), and the shipped
    `Modules/ExternalProject/download.cmake.in` (identical on 3.31.12 and
    4.4.2 apart from the license header line) and `gitclone.cmake.in` (no
    timeout on any line; 4.4 replaces the fixed 3 tries with
    `CMAKE_EP_GIT_CLONE_RETRY_COUNT`/`_DELAY`): no default timeout, the retry
    loop, and no timeout on the git path (CMK-MOD-17, -18).
16. [CMP0176 @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/policy/CMP0176.rst)
    and [issue 26262](https://gitlab.kitware.com/cmake/cmake/-/work_items/26262):
    the accidental `AUTO` default and the non-warning policy (CMK-MOD-19).
17. [cmake_language.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/cmake_language.rst):
    `EXIT` works only in script mode (CMK-MOD-20).
18. Measured in this file, C15 to C21: stalled-server downloads, the
    FetchContent retry budget, the git bound, CMP0176 under a pin, and the
    script-mode errors, on 3.31.12, 4.3.4 and 4.4.2.

## Revision log

Ledgers: [verification-wave2.md](cmake-module-authoring/verification-wave2.md),
[verification-wave3.md](cmake-module-authoring/verification-wave3.md).
Fixtures and runners: `/home/mherwig/.cache/cmake-measure-scratch/verify-module-authoring/`
(wave 3 under `w3/`).

- 2026-09-26, verify wave 2: CMK-MOD-03 severity scope "floor 3.19 to 3.30" widened to "floor below 3.31"; TLS default, the `CMAKE_TLS_VERIFY=0` override and explicit `TLS_VERIFY ON` measured on 3.31.12, 4.3.4 and 4.4.2.
- 2026-09-26, verify wave 2: CMK-MOD-04 probe exception now requires `RESULT_VARIABLE` as well as the comment (an includer's `CMAKE_EXECUTE_PROCESS_COMMAND_ERROR_IS_FATAL ANY` halts a bare probe on 4.x); verification no longer excuses commented hits; floor notes the 4.0 variable and `NONE`.
- 2026-09-26, verify wave 2: CMK-MOD-05 gains the caller-code exception (Kitware's `FetchContent.cmake:2490-2507`); its awk check replaced: the old one flagged the rule's own `block(SCOPE_FOR POLICIES)` form and missed indented, pre-pin and unpinned definitions.
- 2026-09-26, verify wave 2: CMK-MOD-08 target naming relaxed from `<Pkg>::<Pkg>` to namespaced `<Pkg>::<Component>` per cmake-developer(7); the no-`include_guard` clause now rests on a measurement (GLOBAL guard: second `find_package` silently not found, exit 0).
- 2026-09-26, verify wave 2: CMK-MOD-13 names `cmake_host_system_information(QUERY OS_PLATFORM)` for the CPU, because `CMAKE_HOST_SYSTEM_PROCESSOR` is empty under `cmake -P` (measured on all three lines); second grep added.
- 2026-09-26, verify wave 2: CMK-MOD-14 example corrected: a directory property is accepted silently under `-P`; only `cmake_language(DEFER)` errors.
- 2026-09-26, verify wave 2: CMK-MOD-16 floor `PARSE_ARGV` 3.5 changed to 3.7; C13's cause corrected from "reassigned list" to "parse nested in a control block" (Verdict 8, Conflicts, C13 row, applied-table row); verification replaced with a nesting awk check.
- 2026-09-26, verify wave 2: citation fixes: find_ocx `__OCX_MODULE_VERSION` is at `ocx.cmake:182`, not 181; cmake-conan's `~3.31.7` is at `cmake_conan.yml:41,58`, not 30-33; find_ocx's gersemi warning count is 17 on the dirty tree (13 was at `ac2a759cd0`).
- 2026-09-26, wave 3 revision: new CMK-MOD-17 (MUST, finite `TIMEOUT` or `INACTIVITY_TIMEOUT` on every network download); answers M-D-16; C15 measured the indefinite hang and both keywords bounding it; [net]'s `TIMEOUT`-only MUST widened to either keyword.
- 2026-09-26, wave 3 revision: new CMK-MOD-18 (SHOULD, bound `GIT_REPOSITORY` fetches with `GIT_HTTP_LOW_SPEED_*`); C17 and C18 measured the gap and the remedy.
- 2026-09-26, wave 3 revision: new CMK-MOD-19 (MUST below a 3.31 floor or pin, `ENCODING UTF-8` on captured output); reverses this file's earlier drop of the item, because C19 shows the CMK-MOD-05 pin selects the OLD default on 4.4.2; the Windows effect is recorded as a documented gap.
- 2026-09-26, wave 3 revision: new CMK-MOD-20 (SHOULD, `cmake_language(DEFER)` and `EXIT` kept to their modes); narrowed from [net]'s wider guard list; [net] §5's "Unknown CMake command" corrected to `command is not scriptable` (C20).
- 2026-09-26, wave 3 revision: CMK-MOD-03, -05, -06 and -14 gain one note each (TLS minimum version, the CMP0176 side effect of the pin, the `ENV{}` header note, the loud project-command error); meaning and severity unchanged.
- 2026-09-26, wave 3 revision: Verdict items 10 to 12 added (documented gaps: Windows decoding, no CMP0176 warning, ssh and git transports, sub-build mode); the two module-authoring open questions removed; the Dropped list, the applied table (MOD-17 to -20), find_ocx's fix list (items 10, 11) and the failure modes (1 new at rank 2, 3 appended) updated.
- 2026-09-26, verify wave 3: CMK-MOD-17 said a timed-out download is "retried up to six times"; it is attempted six times (one try plus five retries). `download.cmake.in` has `retry_number 5` over `RANGE 0..5`; 6 failures were logged in 103 s at T = 3 on all three lines, which matches 6 × T + 85 s. The formula is unchanged.
- 2026-09-26, verify wave 3: the CMK-MOD-17 `FetchContent_Declare` and `ExternalProject_Add` lookaheads changed from `\bURL\b` to `\sURL\s`. The old form reported `GIT_REPOSITORY ${URL}` as a URL fetch, a false finding. The new form keeps every planted violation red.
- 2026-09-26, verify wave 3: CMK-MOD-18 no longer cites CMake issue 23443 as "the same hang". Its log shows `HEAD is now at ced8b31` before the stall, so the clone had finished, and no cause was diagnosed. The applied-table MOD-18 row was fixed to match. Added the 4.4 `CMAKE_EP_GIT_CLONE_RETRY_COUNT`/`_DELAY` variables (defaults of 2 retries and 0 s keep 3 attempts). Key source 15 no longer calls `gitclone.cmake.in` identical on 3.31.12 and 4.4.2.
- 2026-09-26, verify wave 3: the CMK-MOD-19 corpus count "0 of the other 45 repos" is corrected. qtbase passes `ENCODING UTF8` in a vendored `RunCMake.cmake:168` test driver; [net] had searched only for `UTF-8`. Still no shipped module passes it. Severity is unchanged.

[map]: cmake-topic-map.md
[mc]: cmake-module-authoring/module-contracts.md
[mt]: cmake-module-authoring/module-testing-and-formatting.md
[ocx]: cmake-audit/find-ocx-cmake-shape-and-contracts.md
[shape]: cmake-audit/exemplar-cmake-shape.md
[deps]: cmake-audit/exemplar-deps-and-dual-build.md
[gate]: cmake-versions-and-gate/gate-and-language-semantics.md
[net]: cmake-module-authoring/network-timeouts-and-platform-edges.md
