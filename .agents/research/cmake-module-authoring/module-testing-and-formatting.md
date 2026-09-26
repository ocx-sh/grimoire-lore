---
title: Testing and formatting CMake code
topic: RunCMake, build-and-test harnesses, gersemi
agent: cmake-module-testing-and-formatting
model: sonnet
kind: exemplar
date_researched: 2026-09-26
sources_count: 15
scope: |
  How CMake code itself is tested (per-CMake-line harnesses, negative-test
  style, configure-gate reach, reconfigure coverage) and formatted (gersemi
  as the only maintained tool). Covers module-authoring test patterns
  (find_ocx, Kitware/CMake's RunCMake, CPM.cmake, cmake-conan) and gersemi's
  real behavior on custom commands, measured live on this host. Does NOT
  cover general CTest properties for application test suites (TIMEOUT,
  LABELS, FIXTURES — that is CMK-TEST's ctest-contract dive), CI matrix
  design, or C++ test frameworks.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The RunCMake harness (Kitware/CMake's own reference pattern)](#1-the-runcmake-harness)
   2. [find_ocx's module-test harness, measured against the reference](#2-find_ocxs-module-test-harness-measured-against-the-reference)
   3. [How CPM.cmake and cmake-conan test across CMake versions](#3-how-cpmcmake-and-cmake-conan-test-across-cmake-versions)
   4. [ctest --build-and-test, the mechanism under every harness above](#4-ctest---build-and-test-the-mechanism-under-every-harness-above)
   5. [gersemi is the only maintained formatter; cmake-lint is dead](#5-gersemi-is-the-only-maintained-formatter-cmake-lint-is-dead)
   6. [gersemi on find_ocx: the --definitions surprise, measured](#6-gersemi-on-find_ocx-the---definitions-surprise-measured)
   7. [Config-file discovery and adoption](#7-config-file-discovery-and-adoption)
   8. [The pipefail + grep -q SIGPIPE trap, reproduced](#8-the-pipefail--grep--q-sigpipe-trap-reproduced)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- CMake's own reference test harness is `Tests/RunCMake/RunCMake.cmake` (Kitware/CMake `e8befb989b`): one `run_cmake(<case>)` per subdirectory, matching `<case>-result.txt` (exit code, default `0`) and `<case>-stderr.txt`/`-stdout.txt` (ERE **regex**, via CMake `MATCHES`, not exact string equality) against a real child `cmake` invocation — negative tests assert the exact diagnostic text, not just a nonzero exit.
- `ctest --build-and-test <src> <bin> --build-generator <gen> [--build-options <cmake-opts>] [--test-command ...]` (ctest.1.rst, tag v4.4.2) is the mechanism under every harness in this dive: it runs a real `cmake` configure+build (and optional test) as one CTest test case, so "test the module against CMake 3.31 and 4.4" reduces to "run `ctest --build-and-test` once per provisioned CMake binary."
- find_ocx (`ocx-sh/find_ocx@ac2a759cd0`) runs 10 test families, each once per provisioned CMake line (3.31, 4), via `ocx_add_cmake_version_test` wrapping `ctest --build-and-test ... --build-options -Werror=dev`; **5 of 10 families** (`bootstrap_off`, `floating_fatal`, `script_mode`, `self_update`, `memoize`) never pass `-Werror=dev` because they drive `cmake -P` script mode or a bare `execute_process(cmake -S -B ...)` instead of the wrapped helper — measured directly at `tests/helpers.cmake:44` (gate present) vs `tests/reconfigure_check.cmake:16-18` (gate absent).
- find_ocx's memoization test (`tests/reconfigure_check.cmake`) configures the **same** fixture twice with **no changed input** and asserts the second run hits the memo cache; it never configures once, changes an input (a lockfile, a cache var, a source file), and asserts the memo is correctly **invalidated** — an untested code path in the one place a stale-cache bug would show up.
- find_ocx declares a `cmake_minimum_required(VERSION 3.19)` floor and `Findocx.cmake` claims 3.15, but the CI matrix provisions only CMake 3.31 and 4.x (`CMakeLists.txt:20-24`, with the 3.19 package explicitly commented out as a TODO); `Findocx.cmake` is never `find_package()`-d by any test at all (only copied and hashed by `self_update_check.cmake`) — both floors are unexercised claims, not tested contracts.
- Negative tests in find_ocx use `PASS_REGULAR_EXPRESSION` on the *outer* `ctest`-reported test output (e.g. `"run 'ocx lock'"`), not Kitware's expected-`-stderr.txt`-file style; both are valid CTest-native styles, but the file-based style is more diffable in review and is what CMake's own RunCMake convention uses for a module with more than a couple of negative cases.
- CPM.cmake (`cpm-cmake/CPM.cmake@01678cfe17`) tests across CMake versions differently: not per-inner-`ctest --build-and-test` fixture, but an **outer CI matrix** (`.github/workflows/test.yaml:22`) of `cmake_version: ['3.16.3', '3.28.3', '4.3.2']` × 3 OSes, installing each version with `mise` and running the whole suite once per leg — floor, a mid version, and current are all exercised by a real binary.
- CPM's own unit tests (`test/unit/*.cmake`, `test/CMakeLists.txt`) are `cmake -P` script-mode files with hand-rolled `ASSERT_EQUAL`/`ASSERT_TRUTHY`/`ASSERT_FALSY` functions (`cmake/testing.cmake`) that call `message(FATAL_ERROR)` on failure — no expected-file matching, no RunCMake-style stderr regex; simpler, and adequate only because none of its cases assert on CMake's own diagnostic text.
- `conan-io/cmake-conan` (`b1593849dd`) does **not** test across multiple CMake versions at all: its CI (`cmake_conan.yml`) pins exactly one CMake (`lukka/get-cmake`, `cmakeVersion: "~3.31.7"`) and drives `pytest` (`tests/test_smoke.py`), which shells out to whatever `cmake`/`conan` is on `PATH` — a module-project pattern that is real but weaker than find_ocx's or CPM's per-version matrix; do not cite it as "how module projects test across CMake versions" without that caveat.
- gersemi (`0.29.1`, 2026-09-14 — supersedes the brief's named 0.28.1; run live on this host via `uvx gersemi==0.29.1`) is the only actively maintained CMake formatter; `cmake-format`/`cmake-lint` (cheshirekow/cmake_format) last released **0.6.13 on 2020-08-19** with no repo push since 2024-05-01 and no maintained semantic linter exists in 2026 — `gersemi --check` is a formatting-only gate, never a lint gate.
- **Confirmed surprise**: `gersemi --check`/`--diff` on `find_ocx/ocx.cmake` **without** `--definitions` treats all 16 private `__ocx_*` helpers and the 5 public `ocx_*` commands as unknown commands and falls back to "fix only the indentation of the command name and closing paren, preserve original argument layout" (gersemi's own documented "let's make a deal" fallback) — verbatim reproduced with `uvx gersemi==0.29.1 --check ocx.cmake` (exit 1, 13 "unknown command" warning blocks, one per custom command).
- Passing `--definitions ocx.cmake` removes the unknown-command warnings for commands *defined in that file* but does **not** by itself produce well-formatted keyword-taking calls: `__ocx_run(... COMMAND --format json --project "${toml}" env ... )` still explodes every token of the `COMMAND` value onto its own line, because gersemi only gets `add_custom_command(COMMAND)`-style compact formatting for a keyword when the definition carries an explicit `# gersemi: hints { COMMAND: command_line }` comment — find_ocx has none, so `--definitions` alone is necessary but not sufficient.
- `--definitions` must also cover **every file** that defines a custom command actually used in the file being checked: running `gersemi --definitions ocx.cmake --check CMakeLists.txt` still warns "unknown command" for `ocx_add_cmake_version_test`, `ocx_cmake_test_label`, etc. because those are defined in `tests/helpers.cmake`, a second file the `--definitions` flag never named — a single-file `--definitions` pointer is a common under-configuration.
- gersemi's "obvious manner" detector (README §"Let's make a deal") requires the custom command's `cmake_parse_arguments(<prefix>, ..., ${ARGN})` call to end in the **literal token** `${ARGN}`; find_ocx's `ocx_index(UPDATE_COMMAND ...)` branch instead does `set(args ${ARGN}); list(POP_FRONT args out_var); cmake_parse_arguments(arg "" "INDEX" "PACKAGES" ${args})` — the fourth positional call at `ocx.cmake:1327` uses `${args}`, not `${ARGN}`, so this one dispatch-style, multi-verb function permanently falls outside gersemi's specialized-formatter detection even with a correct `--definitions` pointer.
- gersemi discovers exactly one config filename, `.gersemirc`, searched next to the source file and then up through parent directories (`gersemi --help`, "outcome configuration" section) — no `.gersemirc.yaml`/`.gersemirc.toml` variants; measured at `[host] H7`, 0 of 46 exemplars carry one, confirming zero real-world adoption as of 2026-09-26.
- 7 of 46 exemplars (aminya/project_options, cpm-cmake/CPM.cmake, cpm-cmake/CPMLicenses.cmake, cpp-best-practices/cmake_template, fmtlib/fmt, madler/zlib, TheLartians/ModernCppStarter) carry a `.cmake-format*` config; **3 of those 7 actually run it in CI** (fmtlib/fmt `.github/workflows/lint.yml:33-44` runs `cmake-format -i` + `git diff --exit-code`; TheLartians/ModernCppStarter and cpm-cmake/CPMLicenses.cmake both `pip3 install cmake_format==0.6.11` in a style job) — live, if frozen, CI use of a dead tool is real, not merely a stray config file.
- The `set -o pipefail` + `grep ... | grep -q .` SIGPIPE false negative is real and reproduced live on this host: piping a `grep -rn` match stream from `llvm-project`'s CMake files into `grep -q .` under `pipefail` reports **"NOT FOUND" with exit code 141** even though `target_link_libraries` obviously occurs thousands of times in that tree; removing `pipefail`, or replacing the pipe with a single `grep -rq` (no pipe) or `rg -q` (no pipe), both correctly report found/`0`.

## Findings

### 1. The RunCMake harness

`Kitware__CMake@e8befb989b:Tests/RunCMake/RunCMake.cmake` is CMake's own reference for testing CMake code. Its `run_cmake(test)` function:

- Reads `<test>-result.txt` for the expected exit code (default `0` if the file is absent) — `Tests/RunCMake/RunCMake.cmake:26-32`.
- Reads `<test>-stdout.txt`/`<test>-stderr.txt` (with platform-specific `-<platform>.txt` variants) for expected output, and **compares with `MATCHES`**, i.e. the file content is an ERE regex, not a literal string — `RunCMake.cmake:44-58`. The default expected stderr is `"^$"` (empty) unless a file overrides it.
- Actually invokes a **real child `cmake`** via `execute_process`, capturing `RESULT_VARIABLE`/`OUTPUT_VARIABLE`/`ERROR_VARIABLE` — `RunCMake.cmake:150-165`.
- Strips a long list of known-incidental noise lines (compiler remarks, Xcode warnings, `ninja: no work to do.`) before comparing, so a case's `-stderr.txt` only has to match the diagnostic that matters — `RunCMake.cmake:196-230`.

Worked example (`Kitware__CMake@e8befb989b:Tests/RunCMake/ABI/`):

```cmake
# RunCMakeTest.cmake
include(RunCMake)
run_cmake(C)
run_cmake(CXX)
run_cmake(TestBigEndian-NoLang)
```
```
# TestBigEndian-NoLang-result.txt
1
```
```
# TestBigEndian-NoLang-stderr.txt  (an ERE regex, matched against actual stderr)
^CMake Error at [^
]*/Modules/TestBigEndian\.cmake:[0-9]+ \(message\):
  TEST_BIG_ENDIAN needs either C or CXX language enabled
Call Stack \(most recent call first\):
  [^
]*/Modules/TestBigEndian\.cmake:[0-9]+ \(__TEST_BIG_ENDIAN_LEGACY_IMPL\)
  TestBigEndian-NoLang\.cmake:[0-9]+ \(test_big_endian\)
  CMakeLists\.txt:3 \(include\)$
```
Each `RunCMake` test subdirectory has its own tiny `CMakeLists.txt`: `cmake_minimum_required(VERSION 3.19); project(${RunCMake_TEST} NONE); include(${RunCMake_TEST}.cmake)`.

This is the pattern the map's brief calls for: **exit code + regex-matched stderr, checked against a real child configure**, per negative case, in its own file.

### 2. find_ocx's module-test harness, measured against the reference

`find_ocx/CMakeLists.txt:8-55` and `tests/helpers.cmake` implement 10 test families, dispatched by `ocx_add_cmake_version_test` (`tests/helpers.cmake:23-47`), which is a thin wrapper over `ctest --build-and-test`:

```cmake
# tests/helpers.cmake:38-45
add_test(
  NAME ${fixture}/${OCX_CMAKE_${v}_TEST_LABEL}
  COMMAND ${OCX_CMAKE_${v}_RUN} ctest --build-and-test
    "${CMAKE_SOURCE_DIR}/tests/fixtures/${fixture}"
    "${bin_dir}"
    --build-generator "${CMAKE_GENERATOR}"
    --build-options -Werror=dev ${common_options} ${arg_OPTIONS}
)
```

`OCX_CMAKE_${v}_RUN` is the OCX-provisioned CMake binary for version line `v`, so each of the four `ocx_add_cmake_version_test` families (`bootstrap`, `project_run`, `package`, `foreign_platform`) runs its fixture's inner configure through `-Werror=dev` on **both** provisioned lines. Measured with `CMakeLists.txt:20-21`: only `ocx.sh/cmake:3.31` and `ocx.sh/cmake:4` are provisioned; `ocx.sh/cmake:3.19` is commented out at line 24 ("TODO(mirror backfill): mirror-cmake versions.min is 3.31.0").

Counting the ten families by whether their inner configure carries the gate:

| Family | Mechanism | `-Werror=dev` on inner configure? |
|---|---|---|
| `bootstrap`, `project_run`, `package`, `foreign_platform` | `ocx_add_cmake_version_test` → `ctest --build-and-test --build-options -Werror=dev` | **yes** (4/10) |
| `stale_lock` | explicit `add_test(... COMMAND ${OCX_CMAKE_${v}_RUN} cmake -Werror=dev -S ... -B ...)` | **yes** (`tests/helpers.cmake:57`) |
| `bootstrap_off`, `floating_fatal`, `script_mode`, `self_update` | `cmake -P <fixture>.cmake` — script mode, no `project()`, no configure to gate | **no** (script mode; the concept does not apply, but no substitute check replaces it) |
| `memoize` | `execute_process`-driven `${CMAKE_COMMAND} -S ... -B ...` inside `tests/reconfigure_check.cmake:16-18` | **no** — the list literally omits `-Werror=dev` |

5 of 10 families reach the inner configure without the gate (`tests/helpers.cmake` full text; `tests/reconfigure_check.cmake:1-35`), matching the audit's headline. The `memoize` family is the one case where the gap is avoidable — it *is* a `cmake -S -B` configure (not script mode) and simply never adds `-Werror=dev` to the `configure` list at `tests/reconfigure_check.cmake:16`.

The memoization test itself (`tests/reconfigure_check.cmake:20-34`) configures the same fixture twice with **identical inputs** and asserts: first configure NOT memoized (line 24-26), second configure memoized (line 32-33). It never re-configures a **third** time after mutating an input (e.g. touching `ocx.lock`, changing a cache variable, editing `arg_PACKAGE`) to assert the memo correctly invalidates — the one behavior that a caching bug (stale `CACHE INTERNAL` value surviving an invalidated reconfigure) would actually break.

`Findocx.cmake` (90 lines, claims CMake ≥ 3.15) is never exercised by any test: `grep -rn "Findocx" tests/` finds only `self_update_check.cmake`, which `file(COPY)`s and `file(SHA256)`s the file as a static asset — no test ever runs `find_package(ocx)` through it, on 3.15, 3.31, or anything else.

### 3. How CPM.cmake and cmake-conan test across CMake versions

**CPM.cmake** (`cpm-cmake/CPM.cmake@01678cfe17`) does not run an inner-`ctest --build-and-test` per version like find_ocx. Instead its CI matrix supplies the version:

```yaml
# .github/workflows/test.yaml:13-29
runs-on: ${{ matrix.os }}
strategy:
  matrix:
    os: [ubuntu-latest, windows-2022, macos-latest]
    # ensure compatibility with a recent CMake version as well as the lowest officially supported
    cmake_version: ['3.16.3', '3.28.3', '4.3.2']
```
Each leg installs its named CMake (via `mise`) and runs the whole unit-test suite once. This exercises the **floor** (3.16.3), a **mid** version, and **current** (4.3.2) with a real binary each, on 3 OSes — a coarser but real version-matrix pattern (outer CI axis vs. find_ocx's inner per-fixture axis).

CPM's own unit tests (`test/CMakeLists.txt:5-13`) are `cmake -P` script-mode files, discovered by `file(GLOB "unit/*.cmake")` and run with `add_test(... ${CMAKE_COMMAND} -DCPM_PATH=... -P "${test}")`. Assertions come from `cmake/testing.cmake`'s hand-rolled `ASSERT_EQUAL`/`ASSERT_TRUTHY`/`ASSERT_FALSY`/`ASSERT_DEFINED` functions, each calling `message(FATAL_ERROR)` on failure and `message(STATUS "test passed: ...")` on success — no expected-file matching. Example (`test/unit/dirty-cache-check.cmake`):
```cmake
include(${CPM_PATH}/CPM.cmake)
include(${CPM_PATH}/testing.cmake)
...
cpm_check_git_working_dir_is_clean(${baseDir} v0.0.0 onecommit_test)
assert_truthy(onecommit_test)
```
This style is adequate for CPM because none of its ~20 unit files assert on CMake's own diagnostic text (RunCMake's regex-file style exists specifically for that harder case).

**cmake-conan** (`conan-io/cmake-conan@b1593849dd`) does **not** test across multiple CMake versions. `.github/workflows/cmake_conan.yml:30-33` pins one version via `lukka/get-cmake`:
```yaml
- name: Setup CMake and Ninja
  uses: lukka/get-cmake@latest
  with:
    cmakeVersion: "~3.31.7"
```
and its actual tests (`tests/test_smoke.py`) are `pytest` fixtures that `subprocess.run("cmake ...")` against whatever CMake is on `PATH` (Python, not CMake, drives the harness). This is a legitimate module-project pattern — pytest-driven, single pinned CMake — but weaker on the exact question the brief asks ("how module projects test across CMake versions"): cmake-conan simply does not, on a single pinned patch release. A rule should not cite it as an example of multi-version testing.

### 4. `ctest --build-and-test`, the mechanism under every harness above

From `Help/manual/ctest.1.rst` at tag `v4.4.2` (fetched `gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/ctest.1.rst`):

```
ctest --build-and-test <path-to-source> <path-to-build>
      --build-generator <generator>
      [<options>...]
      [--build-options <opts>...]
      [--test-command <command> [<args>...]]
```
Key options: `--build-generator` is **required**; `--build-options` passes flags straight to the inner `cmake` configure (this is where `-Werror=dev`/`-Werror=author` and `-D...` land); `--build-target` (default `all`); `--build-two-config` runs CMake twice; `--test-command` (must be last) runs a post-build command and its exit code becomes the CTest result; `--test-timeout <seconds>` bounds the whole thing.

This single mode is what turns "configure and build a fixture with CMake version X" into one `add_test()` entry, which is why every harness above (find_ocx's per-version fixtures, an as-subproject smoke test, a module's own template-project regression test) converges on it rather than hand-rolling `execute_process(cmake ...)` — except find_ocx's own `bootstrap_off`/`floating_fatal`/`script_mode`/`self_update`/`memoize` families, which bypass it because they test `cmake -P` script mode or a raw two-shot reconfigure, neither of which `--build-and-test` was designed for (it always does exactly one configure+build cycle, not "configure twice and diff the output").

### 5. gersemi is the only maintained formatter; cmake-lint is dead

- `gersemi` 0.29.1 (2026-09-14) installs and runs cleanly on this host: `uvx gersemi==0.29.1 --version` → `gersemi 0.29.1` (Python 3.14.5, cargo 1.98.1 — it ships a Rust extension). The era re-check (`era-recheck-2026-09-26.md`) supersedes the brief's named 0.28.1; two patch releases (0.29.0, 0.29.1) landed since, neither behavior-relevant to formatting semantics tested here.
- `cmake-format`/`cmake-lint` (`cheshirekow/cmake_format`) last released **0.6.13 on 2020-08-19**, no repository push since 2024-05-01 (`cmake-topic-map/codified-lint-and-policies.md` §1, lines 63-64, 208-209). Its "lint" rule catalogue is a fixed table derived from CMake 3.10-era listfiles.
- No maintained *semantic* CMake linter exists in 2026 (topic-map conflict 4, decided). The lint role for a module is: CMake's own configure-time diagnostics (`cmake --help-manual cmake-diagnostics`, 7 categories on 4.4.2) plus named `grep`/`rg` checks — never a claim that "the linter catches this."
- `gersemi --check <paths>` is therefore the only tool a SHOULD-grade formatting gate can name; a `cmake-lint`-branded check has nothing live to invoke.

### 6. gersemi on find_ocx: the `--definitions` surprise, measured

Command (from `/home/mherwig/.cache/cmake-measure-scratch/module-testing-formatting`, host CMake tooling not involved — this is pure Python/Rust, no network beyond the initial `uvx` package pull):

```sh
uvx gersemi==0.29.1 --check /home/mherwig/dev/find_ocx/ocx.cmake
```
Result: **exit 1** ("would be reformatted"), plus 13 `Warning: unknown command '<name>' used at: ...` blocks, one per distinct private (`__ocx_*`) or public (`ocx_*`) command actually called in the file — e.g.:
```
Warning: unknown command '__ocx_set_result' used at:
/home/mherwig/dev/find_ocx/ocx.cmake:634:3
...
```
(full output saved at `.agents/research/cmake-module-authoring/scratch/module-testing-and-formatting/check-nodefs.out`).

Per gersemi's own README ("Let's make a deal" section, fetched `raw.githubusercontent.com/BlankSpruce/gersemi/0.29.1/README.md`): without a definition, gersemi "will fallback to only fixing indentation of command name and its closing parenthesis while preserving original formatting of arguments." Confirmed live: `--diff` on `ocx.cmake` without `--definitions` reformats every recognized *builtin* command (`set`, `foreach`, `if`) into gersemi's canonical 4-space/keyword-aware layout, while calls like `__ocx_select_release("${manifest}" "${version}" "${triple}" url sha tag filename)` stay compact and untouched beyond re-indentation of the call itself.

Passing `--definitions ocx.cmake` (the file defines all its own commands) removes the "unknown command" warnings for those commands, and correctly recognizes keyword arguments — the diff now shows, e.g., `__ocx_run(WHAT ... COMMAND ... HINTS ...)` grouped by keyword instead of flattened. But the `COMMAND` keyword's value list is **still** exploded one token per line:
```diff
-    __ocx_run(
-      WHAT "checking ${toml} against its lockfile"
-      COMMAND --project "${toml}" lock --check
+    __ocx_run(
+        WHAT "checking ${toml} against its lockfile"
+        COMMAND
+            --project
+            "${toml}"
+            lock
+            --check
```
(`scratch/module-testing-and-formatting/ocx-withdefs.diff`, around the `ocx_index`/`ocx_package` region). Per the README's `# gersemi: hints` section, a keyword only gets the compact `command_line`-style layout (the same treatment native `add_custom_command(COMMAND ...)` gets) if the function definition carries a comment like `# gersemi: hints { COMMAND: command_line }` immediately before its `cmake_parse_arguments` call. `find_ocx`'s `__ocx_run` (`ocx.cmake:436-450`) has no such comment, so even a correct `--definitions` pointer under-formats it.

`--definitions` is also **file-scoped**, not project-scoped: checking `CMakeLists.txt` with `--definitions ocx.cmake` still warns unknown-command for `ocx_add_cmake_version_test`, `ocx_cmake_test_label`, `ocx_add_stale_lock_test`, etc. (`scratch/.../check-withdefs.out` is empty of these because that run targeted `ocx.cmake` itself; re-running against `CMakeLists.txt` with the same single `--definitions ocx.cmake` argument still leaves 8 warning blocks, because those commands live in `tests/helpers.cmake`, a file never named). The fix is `--definitions ocx.cmake tests/helpers.cmake` (space-separated, gersemi accepts multiple `src` paths and directories per `--help`).

Finally, one of find_ocx's 6 `cmake_parse_arguments` call sites permanently defeats the "obvious manner" detector regardless of `--definitions` completeness: `ocx.cmake:1327`, inside the `ocx_index(UPDATE_COMMAND ...)` dispatch branch, does
```cmake
set(args ${ARGN})
list(POP_FRONT args out_var)
cmake_parse_arguments(arg "" "INDEX" "PACKAGES" ${args})
```
— the fourth positional argument is `${args}`, not the literal `${ARGN}` the README's example requires. `ocx_index` is a single function with three `op STREQUAL` branches, only one of which parses keyword args this way; gersemi's detector needs one clean top-level `cmake_parse_arguments(..., ${ARGN})` per function, so this dispatch-style function can never get specialized formatting no matter what is passed to `--definitions`.

Beyond find_ocx: the same "unknown command" pattern reproduces on a real corpus exemplar. `gersemi --check gabime__spdlog@5b63780337:CMakeLists.txt` (no `--definitions`) warns on 4 distinct custom commands (`spdlog_extract_version`, `spdlog_message_once`, `spdlog_enable_warnings`, `spdlog_enable_addr_sanitizer`, `spdlog_enable_thread_sanitizer`) and still exits 1 ("would be reformatted") — confirming this is not an ocx-specific artifact but the general behavior any CMake module with helper functions hits.

### 7. Config-file discovery and adoption

`gersemi --help` ("outcome configuration" section): *"Values for these arguments can be stored in `.gersemirc` file which can be placed in directory next to the source file or any parent directory. The highest priority has file provided through `--config`, then file closest to the source file, then file in parent directory etc."* — **one filename**, `.gersemirc`; no YAML/TOML-suffixed variant is auto-discovered (a differently-named file only works via the explicit `--config` flag). `[host] H7` measured 0 of 46 exemplars carry a `.gersemirc` on 2026-09-26 — unchanged from wave 1.

7 of 46 exemplars carry a `.cmake-format*` config (`find <corpus> -name '.cmake-format*'`, empty-reads-as-no-hit convention, non-empty here): `aminya__project_options` (`.cmake-format.yaml`), `cpm-cmake__CPM.cmake` (`.cmake-format`, plus `cmake/.cmake-format-additional_commands-cpm`), `cpm-cmake__CPMLicenses.cmake` (`.cmake-format`), `cpp-best-practices__cmake_template` (`.cmake-format.yaml`), `fmtlib__fmt` (`.cmake-format`), `madler__zlib` (`.cmake-format.yaml`), `TheLartians__ModernCppStarter` (`.cmake-format`).

Of those 7, **3 actually invoke `cmake-format`/`cmake_format` in CI** (not just carry a stray config):
- `fmtlib__fmt@522e2c12ab:.github/workflows/lint.yml:33-44` — a dedicated `cmake-format` job: `pip install --require-hashes -r support/cmake-format-requirements.txt`, then `find . -name CMakeLists.txt -o -name '*.cmake' | xargs cmake-format -i` followed by `git diff --exit-code`.
- `TheLartians__ModernCppStarter@72b8957f9e:.github/workflows/style.yml:20` — `pip3 install cmake_format==0.6.11 pyyaml` in a style job.
- `cpm-cmake__CPMLicenses.cmake@ca42334d56:.github/workflows/style.yml:20` — same, `cmake_format==0.6.11`.

All three pin a version at or below the tool's final 0.6.13 release — live, working, but frozen CI use of a dead tool. This is the concrete "recognise-and-migrate" set: three real exemplars a `cmake-build` rule can point to as "replace this `cmake-format -i` + `git diff --exit-code` job with `gersemi --check`."

### 8. The `pipefail` + `grep -q` SIGPIPE trap, reproduced

Reproduced live on this host against `llvm__llvm-project@e0316c1b47` (a large repo whose `.cmake`/`CMakeLists.txt` files are checked out in the corpus's sparse clone):

```sh
$ bash -c '
set -o pipefail
if grep -rn "target_link_libraries" "$REPO" --include="*.cmake" --include="CMakeLists.txt" | grep -q .; then
  echo "FOUND (if-true) rc=$?"
else
  echo "NOT FOUND (if-false) rc=$?"
fi'
NOT FOUND (if-false) rc=141
```
`target_link_libraries` obviously occurs throughout `llvm-project`'s CMake files; the pipeline still reports "not found" with exit **141** (128+SIGPIPE). Mechanism: bash's `pipefail` reports the exit status of the last command in the pipeline that exited **non-zero**, scanning the pipeline; `grep -q` finds a match on an early line and exits `0` immediately, closing its stdin pipe, which delivers `SIGPIPE` to the still-writing `grep -rn` producer (exit 141) — and pipefail surfaces that 141, not the reader's 0, so the shell's `if` branch evaluates as failure even though the pattern is present. Two working alternatives, both confirmed on the same host/repo/pattern:

```sh
# same repo, same pattern, pipefail still on, single command (no pipe): correct
$ grep -rn "target_link_libraries" "$REPO" --include="*.cmake" --include="CMakeLists.txt" >/dev/null; echo $?
0
# rg -q, single command, no pipe: correct
$ rg -q "target_link_libraries" "$REPO" --glob "*.cmake" --glob "CMakeLists.txt"; echo $?
0
```
Removing `pipefail` from the original piped form also "fixes" it (reports `rc=0`/FOUND) — but that is fragile: it only works by accident because bash without `pipefail` reports the *last* command's exit status (`grep -q`'s `0`), so a future rewrite that swaps the final stage for something that can itself fail loses the guarantee again. The durable fix is structural: never pipe a large match stream into `grep -q`/`head`/any early-exiting reader under `pipefail`; use a single `grep -rq`/`rg -q` invocation (no pipe at all), or, if a pipe is unavoidable, drop `pipefail` for that one line and check `${PIPESTATUS[0]}` explicitly.

This is the same bug class the audit's method note M4 names, and the harness-shape instructions for this whole research program name explicitly ("never pipe into `grep -q` under `set -o pipefail`") — every verification command in the Normative guidance candidates section below is written to avoid it.

## Normative guidance candidates

Floor for this file's rules: CMake ≥ 3.19 (find_ocx's own floor; nothing here needs newer syntax). Configure gate spelling: `-Werror=dev` on ≤4.3, `-Werror=author` on ≥4.4 (per the shipped index's single definition, cited here as "the configure gate").

1. **A CMake module's test harness MUST run its fixtures through a real, provisioned CMake binary for every version line the module claims to support — never a single ambient `cmake`.** Rationale: a declared floor that no CI leg's binary actually is (find_ocx's 3.19, `Findocx.cmake`'s 3.15) is a claim, not a contract. Verify: the module's own CI config names a binary per declared floor/current line (`grep -n` for a version-pinning action or provisioner alongside each `cmake_minimum_required`); a floor with no matching provisioned binary in CI is the finding.
2. **Every inner configure a module's test harness drives MUST carry the configure gate.** Rationale: `-Werror=dev`/`-Werror=author` is the module's own smoke test against its own future-diagnostics; a test that configures without it can pass while emitting warnings the module's users would see as errors. Verify: `grep -n -e 'ctest --build-and-test' -e 'execute_process.*COMMAND.*cmake ' -e '\${CMAKE_COMMAND}.* -S ' <test-driver-files>` then confirm each hit's argument list also contains `-Werror=dev` or `-Werror=author` or routes through a helper that always adds it (find_ocx's `tests/helpers.cmake:44`); a hit without the gate and without such a helper is the finding — empty grep output means no inner configures exist to check (pass by vacuity, note it).
3. **A negative test MUST assert the actual diagnostic, not merely a nonzero exit code.** Rationale: `WILL_FAIL` alone accepts any failure, including an unrelated crash; `PASS_REGULAR_EXPRESSION` or an expected-file (RunCMake-style `-stderr.txt`, matched as an ERE) pins the failure to the intended cause. Verify (reading heuristic): every `add_test` documented as a negative case sets `PASS_REGULAR_EXPRESSION`/`FAIL_REGULAR_EXPRESSION` or the harness reads an expected-stderr/-stdout file; a bare `WILL_FAIL` with no accompanying pattern is the finding.
4. **A reconfigure/memoization test MUST include a run that changes an input and asserts invalidation, not only a run that repeats identical inputs and asserts the cache hit.** Rationale: find_ocx's `tests/reconfigure_check.cmake` proves the happy path (memo hits when nothing changed) but never proves the memo correctly invalidates when something did — exactly the path a `CACHE INTERNAL` staleness bug lives in. Verify (reading heuristic): a memoization/reconfigure test file contains at least three configure invocations (baseline, repeat-unchanged, repeat-changed) or two files (one asserting the hit, one asserting the miss after a mutation); two-configure files that never mutate an input between them are the finding.
5. **`gersemi --check` is a SHOULD-grade formatting gate for `*.cmake`/`CMakeLists.txt`, run with `--definitions` naming every file in the project that defines a custom command, never with a bare invocation on a project with helper functions.** Rationale: 0/46 exemplars run gersemi and it is unenforced, but it is the only maintained formatter (`cmake-format`/`cmake-lint` dead since 2020-08-19); a bare `gersemi --check module.cmake` on a module with helper functions produces spurious "unknown command" warnings and under-formats those calls, which teaches authors gersemi "doesn't work" when the actual fix is a missing flag. Verify: `gersemi --definitions <every .cmake file defining a function/macro used elsewhere> --check <paths>`; exit 0 = pass, exit 1 = would reformat (a finding to fix, not to ignore), and any `Warning: unknown command` line in stderr means the `--definitions` list is incomplete, not that gersemi failed.
6. **A module function whose keyword argument takes a subcommand-and-flags list (mirroring `add_custom_command(COMMAND ...)`) MUST carry a `# gersemi: hints { KEYWORD: command_line }` comment directly above its `cmake_parse_arguments` call.** Rationale: measured live — without the hint, gersemi explodes every token of that keyword's value onto its own line even when the command's definition is correctly supplied via `--definitions`; the hint is the only way to get the compact, native-`COMMAND`-like layout. Verify: `grep -n -B1 'multiValueArgs.*COMMAND\|COMMAND.*multiValueArgs' <module>.cmake` — actually more directly: for each `multiValueArgs` entry passed through to an `execute_process`/`add_custom_command`-style forwarding, confirm a `# gersemi: hints` comment naming it as `command_line` precedes the enclosing function's `cmake_parse_arguments` call; a forwarding keyword with no hint comment is the finding.
7. **`cmake_parse_arguments`'s fourth positional argument MUST be the literal token `${ARGN}` (never a renamed or reassigned variable) in any function meant to get gersemi's specialized formatting.** Rationale: measured live — `ocx.cmake:1327`'s `cmake_parse_arguments(arg "" "INDEX" "PACKAGES" ${args})` (not `${ARGN}`) permanently defeats gersemi's "obvious manner" detector regardless of `--definitions` completeness; a dispatch-style function with multiple `op STREQUAL` branches parsing different keyword sets should split into one function per verb instead, each with its own clean `cmake_parse_arguments(..., ${ARGN})`. Verify: `grep -n 'cmake_parse_arguments(' <file> | grep -v -e 'ARGN)' -e 'ARGN )'` (a bare positional-args extension can be tightened to require the literal token) — any hit is a candidate for gersemi's fallback path; confirm by function-reading whether it is dispatch-style.
8. **No shipped verification may cite `cmake-lint` or `cmake-format` as a live tool.** Rationale: last release 0.6.13, 2020-08-19; no maintained semantic CMake linter exists in 2026. Verify (decision row, not a runtime check): a `.cmake-format*` config file found in a repo (`find <dir> -maxdepth 2 -name '.cmake-format*'`, non-empty = hit) is a recognise-and-migrate signal — check whether CI actually runs it (`rg -n -e 'cmake-format' -e 'cmake_format' -e 'cmake-lint' <ci-dir>`, non-empty = live usage to retire) — never a reason to add new dependence on it.
9. **A verification `grep`/`rg` that must report presence/absence for a gate (pass/fail on an `if`) MUST NOT pipe into `grep -q`, `head`, or any other early-exiting reader while `set -o pipefail` is active.** Rationale: measured live — the pipeline reports the producer's SIGPIPE exit (141) as a false "not found" even when the pattern is abundant, exactly inverting the check. Verify: use a single `grep -rq PATTERN DIR --include='*.ext'` or `rg -q PATTERN DIR --glob '*.ext'` (no pipe) as the presence test; if a pipeline into an early-exiting reader is unavoidable, drop `pipefail` for that line and check `${PIPESTATUS[0]}` explicitly instead of the pipeline's own `$?`.
10. **A verification `grep`/`rg` scanning a whole repository for a CMake-authoring pattern MUST exclude vendored/generated trees by name (`contrib/`, `third_party/`, `third-party/`, `deps/`, `_deps/`, and any file carrying a "generated" banner comment) unless the row is explicitly about vendored code.** Rationale: an ungated scan over a large mixed build inflates or deflates a headline count depending on whether the vendored share dominates (the map's own M-A-06 concern); mixing first-party and generated/vendored hits without saying so misrepresents what a rule is actually measuring. Verify: `grep -rn --include='*.cmake' --include='CMakeLists.txt' -e PATTERN <dir> | grep -v -e '/third_party/' -e '/third-party/' -e '/contrib/' -e '/_deps/' -e '/deps/'` (a plain final `grep -v` here is fine — it is a filter on already-captured output, not a presence/absence gate under `pipefail`) and state the excluded-line count alongside the kept count.

## Exemplar evidence

| Candidate | Satisfies | Violates / gap | find_ocx |
|---|---|---|---|
| 1 (real binary per version) | `cpm-cmake__CPM.cmake@01678cfe17:.github/workflows/test.yaml:22` (3.16.3/3.28.3/4.3.2 matrix) | `conan-io__cmake-conan@b1593849dd:.github/workflows/cmake_conan.yml:30-33` (single pinned 3.31.7, no matrix) | Violates for its own claimed floor: `CMakeLists.txt:20-24` provisions only 3.31/4, 3.19 commented out; `Findocx.cmake`'s 3.15 untested by any binary |
| 2 (gate on every inner configure) | `ocx-sh/find_ocx@ac2a759cd0:tests/helpers.cmake:44` (4 of 10 families) | Same repo, `tests/reconfigure_check.cmake:16-18` (memoize family, gate omittable and omitted) | Both — 4/10 pass, 5/10 fail, 1/10 (`stale_lock`) passes via explicit `cmake -Werror=dev` |
| 3 (assert the diagnostic) | `Kitware__CMake@e8befb989b:Tests/RunCMake/ABI/TestBigEndian-NoLang-stderr.txt` (full ERE match) | — (RunCMake is the reference; no corpus counterexample dived here) | Partial: `stale_lock`/`bootstrap_off`/`floating_fatal` use `PASS_REGULAR_EXPRESSION` (asserts diagnostic substring, not full file) — acceptable but less strict than RunCMake's file-match convention |
| 4 (invalidate memo, not just hit) | none found in corpus for this dive | `ocx-sh/find_ocx@ac2a759cd0:tests/reconfigure_check.cmake` (two identical configures only) | Violates — the row's namesake example |
| 5 (`gersemi --check --definitions`) | none — 0/46 run gersemi at all ([host] H7) | `ocx-sh/find_ocx@ac2a759cd0:ocx.cmake` (measured: bare `--check` exits 1 with 13 unknown-command warnings); `gabime__spdlog@5b63780337:CMakeLists.txt` (measured: bare `--check` exits 1 with 5 unknown-command warnings) | Violates as-is; `--definitions ocx.cmake tests/helpers.cmake` closes the warning gap but not the reformat (still exit 1 — the module was never gersemi-formatted) |
| 6 (`# gersemi: hints` for COMMAND-like keywords) | none in corpus | `ocx-sh/find_ocx@ac2a759cd0:ocx.cmake:436-450` (`__ocx_run`'s `COMMAND` keyword, measured to over-explode even with `--definitions`) | Violates |
| 7 (`${ARGN}` literal) | 5 of 6 find_ocx sites (`ocx.cmake:442,692,872,1072,1296`) | `ocx-sh/find_ocx@ac2a759cd0:ocx.cmake:1327` (`${args}`, not `${ARGN}`) | Mixed — 5/6 compliant, 1/6 (the dispatch branch) violates |
| 8 (no live cmake-lint citation) | This program's own map already decided this (topic-map conflict 4) | `fmtlib__fmt@522e2c12ab:.github/workflows/lint.yml:33-44`, `TheLartians__ModernCppStarter@72b8957f9e:.github/workflows/style.yml:20`, `cpm-cmake__CPMLicenses.cmake@ca42334d56:.github/workflows/style.yml:20` — all 3 still invoke `cmake-format`/`cmake_format==0.6.11` live in CI: recognise-and-migrate candidates | N/A |
| 9 (no `pipefail`+`grep -q`) | Every command in this file's own verifications (written single-command, no pipe) | Reproduced failure mode on `llvm__llvm-project@e0316c1b47` (measured, this dive) | N/A (find_ocx's CI was not audited for this pattern in this dive) |
| 10 (exclude vendored trees) | Not measured in this dive (out of scope: PROJECT_CONTEXT already flags `grpc`'s 56,456-line generated list and `contrib/`/`third_party/` exclusions as an M-A-06 authoring constraint, not a per-repo count) | — | N/A |

## AI-agent angle

- **Assumes `cmake-lint`/`cmake-format` is a live, installable linter/formatter** because pre-2024 training data is full of `cmake-format -i` examples. Mechanical check: `pip show cmake-format` / `pip index versions cmake-format` (or just the tool's own PyPI page) shows the ceiling at 0.6.13 (2020-08-19); recommend `uvx gersemi==<current> --check` instead and verify with `gersemi --version`.
- **Writes `gersemi --check module.cmake` with no `--definitions` on a module with helper functions**, then either (a) reports gersemi "doesn't support" the module because of the unknown-command warnings, or (b) accepts the resulting reformatted diff without noticing it under-formats every custom call. Mechanical check: any `Warning: unknown command` in gersemi's stderr is a missing `--definitions` entry, not a tool limitation — list every `.cmake` file the target includes/defines commands in and pass them all.
- **Assumes `ctest --build-and-test` implies a version matrix on its own.** A model may write one `ctest --build-and-test` call and believe it has satisfied "test against multiple CMake versions" — it tests against whichever `cmake` binary the *current shell* resolves to. Mechanical check: confirm the `COMMAND` in the `add_test()` invokes an explicitly version-pinned binary path (an OCX/mise/`lukka/get-cmake`-provisioned path), not a bare `cmake`/`${CMAKE_COMMAND}` that resolves to the ambient toolchain.
- **Writes a negative test as `set_tests_properties(... PROPERTIES WILL_FAIL TRUE)` alone**, believing that is sufficient coverage for "the bad input is rejected." Mechanical check: grep for `WILL_FAIL` without an accompanying `PASS_REGULAR_EXPRESSION`/`FAIL_REGULAR_EXPRESSION` on the same test — a real regression could change *which* error triggers the failure and the test would stay green.
- **Assumes a hand-rolled `cmake_parse_arguments` wrapper (`set(args ${ARGN}); list(POP_FRONT ...); cmake_parse_arguments(arg ... ${args})`) is formatting-neutral.** A model asked to "make this gersemi-friendly" may not know the fourth argument must be the *literal* `${ARGN}` token. Mechanical check: `grep -n 'cmake_parse_arguments(' <file>` then confirm the last token before the closing paren is exactly `${ARGN}`, not a derived variable.
- **Reaches for `set -o pipefail; ... | grep -q ...` as "the safe/strict way to write a bash check"**, since `pipefail` is genuinely good practice for most pipelines and models over-generalize it. Mechanical check: any verification line combining `pipefail` with a pipe into `grep -q`/`head`/`sed -n '1p'` (an early-exiting reader) is a candidate false-negative; rewrite as a single non-piped `grep -rq`/`rg -q` invocation.

## Contested / evolving

- **RunCMake-style expected-file negative tests vs. `PASS_REGULAR_EXPRESSION` on the outer CTest output.** Both are valid, CMake-native mechanisms; this dive found no primary-source guidance ranking one over the other for a module (as opposed to CMake's own core test suite, which uses the file style purely for its own scale — thousands of cases). As of 2026-09-26: file-based expected-stderr is more diffable in code review and is what Kitware itself uses at scale; `PASS_REGULAR_EXPRESSION` is lighter-weight and adequate for a handful of negative cases (find_ocx has 3). No trend data either way — this is a project-scale judgment call, not a maturing consensus.
- **gersemi's `--definitions` ergonomics are still evolving.** The tool is on a 2-4 week release cadence (0.28.0→0.29.1 in about 6 weeks across this program's own two observation points); the "Let's make a deal" fallback and `# gersemi: hints` mechanism are the *current* answer to "how do I format my own commands," but the maintainer's README itself invites feedback ("If you find these limitations too strict let me know about your case") — a future release could relax the "obvious manner" `${ARGN}`-literal requirement or infer `command_line`-style keywords without an explicit hint. Treat rule 6 and 7 above as current-version guidance (0.29.1, 2026-09-14), not a permanent constraint.
- **Whether `cmake-format`'s continued live use in 3/46 exemplars' CI is a bug or a stable equilibrium.** All three pin `cmake_format==0.6.11` (below even its final 0.6.13) and none show a recent (2025-2026) commit touching that CI step in the sampled history — read as inertia (a working, if frozen, CI job nobody has had a reason to touch), not as evidence the tool is being actively chosen over gersemi today.

## Sources

| URL or measurement | What it is | Date/era | Why worth reading |
|---|---|---|---|
| `git -C Kitware__CMake@e8befb989b show HEAD:Tests/RunCMake/RunCMake.cmake` | CMake's own reference test-driver function (`run_cmake`) | Corpus SHA as of 2026-09-26 | Primary — the exit-code/regex-file matching mechanism every module-test harness in this dive is compared against |
| `git -C Kitware__CMake@e8befb989b show HEAD:Tests/RunCMake/ABI/{RunCMakeTest.cmake,CMakeLists.txt,TestBigEndian-NoLang-result.txt,TestBigEndian-NoLang-stderr.txt}` | One worked RunCMake case directory | Same SHA | Primary — concrete `-result.txt`/`-stderr.txt` pair, confirms `MATCHES` (regex) semantics |
| `/home/mherwig/dev/find_ocx/CMakeLists.txt`, `tests/helpers.cmake`, `tests/reconfigure_check.cmake` | find_ocx's own test harness | Working tree, read 2026-09-26 | Primary — the module-under-study; measured directly, not from the prior audit's cached line numbers |
| `git -C cpm-cmake__CPM.cmake@01678cfe17 show HEAD:test/CMakeLists.txt`, `cmake/testing.cmake`, `test/unit/dirty-cache-check.cmake`, `.github/workflows/test.yaml` | CPM.cmake's own test suite and CI matrix | Corpus SHA 2026-09-26 | Primary — outer-CI-matrix version-testing pattern, contrasted with find_ocx's inner-fixture pattern |
| `git -C conan-io__cmake-conan@b1593849dd show HEAD:tests/test_smoke.py`, `.github/workflows/cmake_conan.yml` | cmake-conan's pytest-driven smoke tests and CI | Corpus SHA 2026-09-26 | Primary — a module-project pattern that does *not* test multiple CMake versions; needed to correctly scope the brief's claim |
| [gitlab.kitware.com/.../Help/manual/ctest.1.rst@v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/ctest.1.rst) | CTest manual, Build and Test Mode section | Tag v4.4.2 (current per era recheck) | Normative — every option `--build-and-test` accepts, fetched at the exact pinned tag |
| `uvx gersemi==0.29.1 --check /home/mherwig/dev/find_ocx/ocx.cmake` (and `--diff`, with/without `--definitions`) | Live measurement on this host | Run 2026-09-26, gersemi 0.29.1 (2026-09-14) | Measured — the central surprise of this dive; raw output saved under `scratch/module-testing-and-formatting/` |
| `uvx gersemi==0.29.1 --check <nlohmann__json,madler__zlib,gabime__spdlog>/CMakeLists.txt` | Live measurement, 3 corpus files | Run 2026-09-26 | Measured — confirms 0/46 adoption and that the unknown-command pattern generalizes beyond find_ocx |
| `uvx gersemi==0.29.1 --help` | gersemi's own CLI help text | Run 2026-09-26, 0.29.1 | Primary — `.gersemirc` discovery rule, `--definitions` semantics, `--warn-about-unknown-commands` default |
| [raw.githubusercontent.com/BlankSpruce/gersemi/0.29.1/README.md](https://raw.githubusercontent.com/BlankSpruce/gersemi/0.29.1/README.md) | gersemi's README, "Let's make a deal" section | Fetched 2026-09-26 at tag 0.29.1 | Primary — the "obvious manner" `${ARGN}` requirement and `# gersemi: hints`/`# gersemi: ignore` directives, verbatim |
| `find /home/mherwig/.cache/research-lang/exemplars/cmake -name '.cmake-format*'` plus per-repo `git show HEAD:.github/workflows/*` reads | Corpus config-file and CI measurement | Run 2026-09-26 | Measured — the 7-repo config count and the 3-repo live-CI-usage subset, both cited by repo@sha:path:line |
| Live reproduction: `set -o pipefail; grep -rn ... llvm__llvm-project ... | grep -q .` vs. single-command `grep -rq`/`rg -q` | Bash SIGPIPE/pipefail measurement on this host | Run 2026-09-26 | Measured — the exact false-negative this program's own harness instructions warn about, reproduced with exit codes |
| `.agents/research/cmake-topic-map/codified-lint-and-policies.md` §1 | This program's wave-1 dive on cmake-lint/cmake-format's maintenance status | 2026-09-05, re-cited 2026-09-26 | Codified — the 0.6.13/2020-08-19 last-release fact and cmake-lint's frozen rule catalogue, not re-derived here |
| `.agents/research/cmake-topic-map.md` §"Conflicts resolved" #2, #4, M-A-03/04/06, M-B-02, M-I-04 (rows and adjudication) | The commissioning map for this dive | 2026-09-26 | The binding decisions this dive answers into (configure-gate spelling, gersemi-as-SHOULD, no-cmake-lint) |

