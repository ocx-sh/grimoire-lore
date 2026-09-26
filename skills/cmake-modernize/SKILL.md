---
name: cmake-modernize
description: Ordered, once-per-repository procedure that takes a legacy directory-scoped CMake tree to target-based, installable and find_package-consumable CMake, with one exit check per step, a gated install-move-consume round trip and an as-subproject smoke as the two end proofs. Use when someone asks to modernize, clean up or migrate an old CMake tree as a whole, meaning replace include_directories, add_definitions or global CMAKE_CXX_FLAGS with target_* commands across the tree, make a legacy library installable, exportable and consumable through a Config package or CPS, or bring a legacy tree under the configure gate. Not for a one-line edit such as a single target_link_libraries keyword or one cmake_parse_arguments call, which the cmake-build rules cover without a procedure. Not for a tree that does not configure or finds the wrong dependency copy, which is cmake-dependency-triage, not for Conan or vcpkg manifests, which is cpp-packaging, and not for the standards themselves, which are the cmake-build rules.
license: Apache-2.0
metadata:
  summary: Takes a legacy CMake tree to target-based and consumable in ten ordered steps, each closed by a command, never in one rewrite
  keywords: cmake,modernize,modern-cmake,legacy,migration,targets,target_link_libraries,include_directories,add_definitions,CMAKE_CXX_FLAGS,cmake_minimum_required,PROJECT_IS_TOP_LEVEL,install,export,find_package,config-package,round-trip,cps,pkg-config,cmake_parse_arguments,PARSE_ARGV,configure-gate,gersemi
---

# cmake-modernize

Take a CMake tree that already builds from directory scope to targets, then make
it consumable by a separate project, in a fixed order that keeps every step
reviewable on its own. The procedure flags a legacy tree and converts it one
target per diff. It never rewrites the tree in one pass, and it never raises the
project's minimum CMake on its own.

This skill assumes the `cmake-build` rule set is installed and cites rules by ID.
Every command here was run against planted violating and compliant projects on CMake 3.31.12, 4.3.4 and 4.4.2 (2026-09-26).

Contents: [Stop condition](#stop-condition) · [Before you start](#before-you-start) ·
[The procedure](#the-procedure) · [Legacy parses](#legacy-parses) ·
[Reviewable units](#reviewable-units) · [What it refuses](#what-it-refuses) ·
[Pinned defaults](#pinned-defaults) · [What agents get wrong](#what-agents-get-wrong) ·
[MUST rows this procedure enforces](#must-rows-this-procedure-enforces) ·
[References](#references)

## Stop condition

Stop when all three hold:

- The gated round trip (`CMK-INST-01`) exits 0 on every CMake line CI runs.
- The as-subproject smoke (step 7) passes.
- Every inventory hit in the plan file is marked `converted`,
  `flagged-not-converted` or `vacuous`, with the step that settled it.

Then stop. Do not start a second modernization pass, do not bump the minimum,
and do not add CPS unless step 9 was asked for. A step with no exit-check output
captured in the plan file is not done, whatever the build says.

## Before you start

**Entry check.** The unmodified tree configures and builds today. If it does
not, or if it finds the wrong copy of a dependency, stop and run
`cmake-dependency-triage` first. This procedure assumes a working baseline.

**The gate is on from step 1, not step 8.** Every configure this skill runs
uses the configure gate spelled for its binary (`CMK-CORE-01`):

| Binary line | Gate spelling |
|---|---|
| CMake 4.4 and later | `-Werror=author` |
| CMake 4.3 and older | `-Werror=dev` |
| One command line serving both sides | `-Werror=dev` |

`-Werror=author` on 3.31.12 or 4.3.4 exits 0 and does nothing (re-measured
2026-09-26). The scripts below take the spelling in `GATE`.

**The evidence rule.** "Done" comes from a command's output captured in the
plan file: an exit code, a grep's lines, the round trip's last `_DIR` line.
Never from a green `cmake --build`, never from a green `cmake --install`, and
never from reading the diff.

**The plan file.** Write `cmake-modernize-plan.md` at the repository root (the
adopter may name it otherwise, once). One row per inventory hit:

| Column | Holds |
|---|---|
| Hit | `file:line` as the inventory printed it |
| Command | The inventory command ID that printed it (`I1` to `I12`, `F1`) |
| Rule | The rule ID the hit violates |
| Step | The step that will touch it |
| Status | `open`, `converted`, `flagged-not-converted` (vendored, or the owner declined) or `vacuous` |

## The procedure

Ten steps, in this order. Each names what it changes and the command whose
result decides "done". The full commands with their readings are in
[references/inventory.md](references/inventory.md) (steps 0 to 4) and
[references/proofs.md](references/proofs.md) (steps 5 to 9).

| Step | Do | Exit check | Cites |
|---|---|---|---|
| 0 Inventory | Run `I1` to `I12` and `F1` read-only. Write every hit into the plan file | The plan file lists every hit, possibly none. No command in the inventory pipes into an early-exiting reader | `CMK-TGT-01/-03/-04/-17`, `CMK-LANG-04/-11`, `CMK-VER-05`, `CMK-DEP-07/-15`, `CMK-CORE-05` |
| 1 Floor | Keep the existing minimum. Add `...<max>`, where `<max>` is the newest CMake CI runs. Re-scan fetched and vendored trees | `F1` prints no line outside a vendored directory (a vendored hit is recorded `flagged-not-converted`), the canary exits 1 and the project's gated configure exits 0 on each CI binary | `CMK-VER-01/-02/-05`, `CMK-DEP-15/-30` |
| 2 Targets | Move directory scope onto `target_*`, one target at a time, leaves of the in-tree graph first | `I2`, scoped to that target's directory, is empty | `CMK-TGT-03` |
| 3 Keywords | Name `PUBLIC`, `PRIVATE` or `INTERFACE` on that target's links. Default to `PRIVATE` unless the type is in its installed headers. Add the namespaced `ALIAS` | `I1` on that file shows only keyworded calls | `CMK-TGT-01/-02` |
| 4 Flags and standards | Overwrites become `target_compile_options`, a toolchain file or a preset. Standards become `target_compile_features`. Fix the parses `I4` listed | `I3` shows no overwrite, `I11` hits sit in a `NOT DEFINED` guard, every `I12` hit sits in a developer option that defaults `OFF`, and every new `CMAKE_*` name passes the variable check | `CMK-TGT-04..09`, `CMK-LANG-04/-11` |
| 5 Top-level gating | Gate the test tree on a project-prefixed option that defaults to `PROJECT_IS_TOP_LEVEL`, with `include(CTest)` inside the gate (`CMK-TEST-09`). Guard examples, dev options, the `CMAKE_BUILD_TYPE` default and any non-test fetch on `PROJECT_IS_TOP_LEVEL` | The step 7 smoke, run here too, and the `CMK-DEP-07` probe when `I7` listed a hit | `CMK-DEP-07`, `CMK-TGT-17`, `CMK-TEST-09` |
| 6 Install and export | `GNUInstallDirs` destinations, `configure_package_config_file`, `find_dependency` per public dependency, `write_basic_package_version_file`, `NAMESPACE`, all in one diff | The gated round trip exits 0 on every CI line, and its leak greps are empty | `CMK-INST-01..06/-09` |
| 7 As-subproject smoke | Configure the tree under a parent that includes `CTest` | The tests grep prints `Total Tests: 0`, and the target grep is empty for every developer-only name | `CMK-DEP-07`, `CMK-TEST-09` |
| 8 CI | Wire the gate per leg, `gersemi --check` (never `--diff`), and the round trip as its own job | The canary exits 1 through each leg's own binary and preset. `gersemi --check` exits 0 | `CMK-CORE-01/-02/-04/-05`, `CMK-MOD-15`, `CMK-INST-18` |
| 9 CPS and pkg-config (optional) | `install(PACKAGE_INFO)` behind `if(CMAKE_VERSION VERSION_GREATER_EQUAL 4.3)`, once the namespace equals the package name, the schema is `simple` and the genexes are configuration-only | The round trip on 4.3 or later ends in `/cps/<pkg>`, on 3.31 in `/cmake/<pkg>`, and both exit 0 | `CMK-INST-12..17` |

### Step 1 in detail

The floor diff touches only `cmake_minimum_required` lines, plus any vendored
floor fix the re-scan exposes. It never rides with a content change, because a
gate failure after a combined diff cannot be bisected.

```sh
# F1: every own-code floor carries a three-dot max. Empty output = pass.
# Lists a bare floor (3.10, 3.10 FATAL_ERROR, upper case, a space before the paren)
# and a two-dot 3.15..4.3. A floor split across lines is not seen, so read those.
grep -rniE --include='CMakeLists.txt' --exclude-dir='_deps' --exclude-dir='build*' \
  -e 'cmake_minimum_required[[:space:]]*\([[:space:]]*VERSION[[:space:]]+[0-9]+(\.[0-9]+)*[[:space:]]*(FATAL_ERROR)?[[:space:]]*\)' \
  -e 'cmake_minimum_required[[:space:]]*\([[:space:]]*VERSION[[:space:]]+[0-9]+(\.[0-9]+)*\.\.[0-9]' .
```

If the kept minimum is below 3.10, write it into the plan file as a
`CMK-VER-05` hazard for the owner and ask whether to raise it. The added
`...<max>` of 3.10 or above already keeps a gated consumer on 3.31 or 4.4 green
(`CMK-VER-05`), so the question is the owner's compatibility promise, not a
gate failure.

A vendored or fetched floor below 3.10 that `I9` lists is fixed where it is
loaded. On CMake 4.x, set `CMAKE_POLICY_VERSION_MINIMUM` to 3.10 around that one
add and restore it (`CMK-DEP-15`). On 3.x, where that variable does not exist,
re-pin a fetched dependency or add a `PATCH_COMMAND` to its declare
(`CMK-DEP-30`). A vendored subtree is never edited: record it
`flagged-not-converted` with the `CMK-DEP-30` remedy named, and hand it to the
owner. Never clear it with a warning switch or a preset's
`"warnings": {"deprecated": false}`.

### Steps 2 to 4: one target per diff

Work from the leaves of the in-tree link graph upward: a target nothing else in
the tree links converts first. A parent's `PUBLIC` or `PRIVATE` choice depends on
whether the child's types leak into the parent's headers, which is only
decidable once the child is target-based. Mutually independent leaves may share
a diff.

`link_directories` becomes `target_link_directories` only for a non-CMake
vendored library. An in-tree CMake target never needs it, because usage
requirements propagate through `target_link_libraries`. Where
`CMAKE_CXX_STANDARD` must stay (a top level, a manager profile), the whole trio
sits in one guard (`CMK-TGT-05..07`):

```cmake
if(NOT DEFINED CMAKE_CXX_STANDARD)
    set(CMAKE_CXX_STANDARD 20)
    set(CMAKE_CXX_STANDARD_REQUIRED ON)
    set(CMAKE_CXX_EXTENSIONS OFF)
endif()
```

`PROJECT_IS_TOP_LEVEL` may be added with `AND`, never instead: a Conan
toolchain sets the standard before `project()`, and a top-level `set()` after
it silently wins. A standard of 20 or later with no module sources also needs
`CMAKE_CXX_SCAN_FOR_MODULES OFF` (CMake ≥ 3.28, `CMK-TGT-18`).

### Step 5: the guard and its shim

```cmake
get_property(_is_multi GLOBAL PROPERTY GENERATOR_IS_MULTI_CONFIG)
if(PROJECT_IS_TOP_LEVEL AND NOT _is_multi AND NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE RelWithDebInfo CACHE STRING "Build type" FORCE)
endif()
```

`PROJECT_IS_TOP_LEVEL` needs CMake 3.21. For a kept minimum below that, test
`CMAKE_SOURCE_DIR STREQUAL PROJECT_SOURCE_DIR` when the variable is not
defined. A `FetchContent_MakeAvailable` or `CPMAddPackage` outside test code runs
only under this guard, on a declare that carries `FIND_PACKAGE_ARGS`, or as the
fallback of a `find_package` that ran first (`CMK-DEP-07`). Mark each guard in
the plan file as new structure, not a conversion: legacy trees rarely carry one.

### Step 6: one coherent diff

The four `CMK-INST` MUSTs the round trip depends on (`-02`, `-04`, `-05`, `-06`,
plus `-03` for each public dependency and `-09` for the destinations) land
together, with no `CMK-TGT` change riding along. None of them alone produces a
consumable package, so the round trip runs once, after all of them. A green
`cmake --install` is not the exit: a missing `find_dependency` stays green until
a compiled consumer's Generate step (`CMK-INST-01`). The script is in
[references/proofs.md](references/proofs.md#the-gated-round-trip).

### Step 8: what CI carries

- Every configure leg under its own gate spelling, checked by the canary
  through that leg's binary and preset.
- No preset that switches the gate off:
  `grep -rn --include='CMakePresets.json' --include='CMakeUserPresets.json' -e '"dev"[[:space:]]*:[[:space:]]*false' -e '"deprecated"[[:space:]]*:[[:space:]]*false' .`
  Empty output = pass. Any hit = finding (a preset's `"deprecated": false` beat
  a command-line `-Werror=dev` on 3.31.12).
- A presets file raised to schema 12 (CMake ≥ 4.4) renames `dev` to `author` in the same edit
  (`CMK-CORE-02`).
- `gersemi --check` as the formatting gate, gersemi 0.29.1 (as of 2026-09-26).
  `--diff` exits 0 even when it would reformat (measured). A module project that
  runs gersemi commits a `.gersemirc` whose `definitions` lists its own command
  files (`CMK-MOD-15`). An existing `.cmake-format*` file is migrated, never
  extended.
- The round trip as its own job, separate from the test suite (`CMK-INST-18`).

## Legacy parses

`I4` lists every `cmake_parse_arguments` that forwards `${ARGN}`. Each hit inside
a `function()` is a `CMK-LANG-04` finding. A hit inside a `macro()` is
`CMK-LANG-08`'s. Migrating a public command to `PARSE_ARGV` changes what its
callers get (measured on 3.31.12, 4.3.4 and 4.4.2):

| Call | `${ARGN}` legacy | `PARSE_ARGV` |
|---|---|---|
| `MULTI "${L}" z`, with `L` = `x;y` | 3 elements | 2 elements, the first `x;y` |
| `ONE "a;b"` | `ONE` = `a`, `b` unparsed | `ONE` = `a;b` |

So the fix written into the plan file for each multi-value keyword whose values
are lists of files, targets or paths carries the flatten line, directly after
the parse:

```cmake
function(mylib_add NAME)
    cmake_parse_arguments(PARSE_ARGV 1 arg "" "DEST" "SOURCES")
    set(arg_SOURCES ${arg_SOURCES})
endfunction()
```

With the flatten line, `SOURCES "${L}" z` gives 3 elements again. The one-value
change is a fix, because the legacy parse left `b` unparsed. A public command's
parse is never rewritten without the flatten line, or without a changelog entry
naming the behaviour change. A private helper is SHOULD. After the parse, read
`<prefix>_UNPARSED_ARGUMENTS` and stop with `FATAL_ERROR` (`CMK-LANG-06`).

## Reviewable units

Each of these ships as its own diff:

- The floor change, alone.
- Each target's conversion (steps 2 to 4). Independent leaves may share one.
- The first install and export (step 6), with no `CMK-TGT` change in it.
- CPS or pkg-config, only after the round trip is already green without it.

A diff that touches a file no plan-file row names is out of scope. Vendored and
third-party subtrees are recorded as `flagged-not-converted` and never entered.

## What it refuses

- Raising an existing `cmake_minimum_required` minimum. It reports and asks.
  The owner raises it in a diff of its own.
- Rewriting a file the inventory did not name, or the whole tree in one pass.
- Touching a vendored subtree.
- Rewriting a public command's parse without the flatten line.
- Adding `install(PACKAGE_INFO)` before the Config round trip is green on 3.31.
- Adding `cmake-format` or `cmake-lint`.
- Editing `conanfile.*` or `vcpkg.json`. A Conan 1 token (`I10`) stops the skill
  and hands off to `cpp-packaging`.

## Pinned defaults

Agreed decisions, not derivations. Each is a default an adopter overrides once.

| Decision | Default (pinned) |
|---|---|
| The minimum | Kept as found. `...<max>` is added. The program floor `3.25...4.4` applies to new code only |
| `<max>` | The newest CMake CI runs, never the newest release |
| Gate spelling | `-Werror=author` on 4.4 and later, `-Werror=dev` on 4.3 and older and on a shared line |
| Migrating a parse | `PARSE_ARGV` plus the flatten line for list-valued multi-value keywords |
| Formatting gate | `gersemi --check`, SHOULD, gersemi 0.29.1 |
| Plan file | `cmake-modernize-plan.md` at the repository root |

## What agents get wrong

1. **Calling a green build and install "consumable".** Only the round trip with a
   compiled consumer shows a missing `find_dependency`.
2. **Writing `3.15..4.3`.** Two dots are one literal and collapse to `VERSION 3.15`
   with no diagnostic, even under the gate.
3. **Passing `-Werror=author` to a 3.31 leg** and reading the green run as a live
   gate. Run the canary on that leg.
4. **Inventing `CMAKE_CXX_STANDARD_EXTENSIONS`** or `CMAKE_DEBUG_PREFIX_MAP`. Run the
   placeholder-expanded variable check (`CMK-LANG-11`). A raw match against
   `cmake --help-variable-list` also reports the real `CMAKE_CXX_FLAGS` as
   invented, because the list prints `CMAKE_<LANG>_FLAGS`.
5. **Guarding `CMAKE_CXX_STANDARD` with `PROJECT_IS_TOP_LEVEL` alone.** The top level
   is exactly where it overrides a Conan profile.
6. **Copying the build-type idiom without `FORCE` after `project()`.** A plain
   `CACHE` set there does nothing.
7. **Swapping `${ARGN}` for `PARSE_ARGV` mechanically**, which silently changes
   every caller that passes a quoted list.
8. **Running the as-subproject check from a parent without `include(CTest)`.**
   `BUILD_TESTING` then stays off and a leaked test tree reads clean.
9. **Citing the CMake Tutorial by its old step titles.** At v4.4.2 it is
    organised as topic pages. Fetch the page at the pinned tag first.

## MUST rows this procedure enforces

Duplicated as a hedge against the scoped rule not being loaded. The rule text,
rationale and full verification live in the `cmake-build` rule and its depth
files, and a disputed row is settled there.

| # | Finding | Rule |
|---|---|---|
| 1 | Run every CI configure leg under the configure gate spelled for the binary that leg runs: `-Werror=author` on CMake 4.4 and later, `-Werror=dev` on 4.3 and older, and `-Werror=dev` when one command line serves legs on both sides | CMK-CORE-01 |
| 2 | In any verification script over a CMake tree, never pipe a match stream into an early-exiting reader (`grep -q`, `head`) under `set -o pipefail` | CMK-CORE-05 |
| 3 | An installable library resolves its dependencies with `find_package` and never forces acquisition | CMK-DEP-07 |
| 4 | On CMake 4.x, set a third-party dependency's policy knobs with set and restore around the one `add_subdirectory`, `FetchContent_MakeAvailable` or `find_package` that loads it, with `CMAKE_POLICY_VERSION_MINIMUM` at 3.10 | CMK-DEP-15 |
| 5 | Whenever install, export, Config-template or dependency wiring changes, prove the package can be consumed with the round-trip script, and never treat a green build and install as proof | CMK-INST-01 |
| 6 | In a `function()`, parse with `cmake_parse_arguments(PARSE_ARGV ...)` and never forward an unquoted `${ARGN}` into the parse. Migrating an existing public command needs the flatten line or a changelog entry naming the behaviour change | CMK-LANG-04 |
| 7 | Never declare an option, cache entry or variable of your own whose name begins with `CMAKE_` or `_CMAKE_` (in any case), or with `_` followed by a CMake command name | CMK-LANG-11 |
| 8 | In every `target_link_libraries` call in an installable library's own code, name `PUBLIC`, `PRIVATE` or `INTERFACE` | CMK-TGT-01 |
| 9 | Never overwrite `CMAKE_<LANG>_FLAGS`, `CMAKE_<LANG>_FLAGS_<CONFIG>` or `CMAKE_<KIND>_LINKER_FLAGS` (the MUST half, appending is SHOULD) | CMK-TGT-04 |
| 10 | Only the top-level project defaults `CMAKE_BUILD_TYPE`, and only on a single-config generator. A library never writes it | CMK-TGT-17 |
| 11 | Write a version range with exactly three literal dots | CMK-VER-01 |
| 12 | Before a CMake bump, and whenever a dependency is added or re-pinned, scan the fetched and vendored trees for effective policy versions below 3.10 | CMK-VER-05 |

## References

Read one level down, on demand. These files do not link each other.

| File | Read it when |
|---|---|
| [references/inventory.md](references/inventory.md) | Running step 0, or re-running an inventory command as the exit check of steps 1 to 4. Holds `I1` to `I12` with the reading of each, and the variable-existence check |
| [references/proofs.md](references/proofs.md) | Running steps 5 to 9. Holds the gate canary, the gated round trip, the as-subproject smoke, the `CMK-DEP-07` offline probe, the CI greps and the CPS checks |

Re-check on each tool bump: the gate spelling split and preset `warnings`
behaviour (CMake minor releases after 4.4.2), `gersemi --diff` exit code
(gersemi after 0.29.1), and the `/cps/<pkg>` round-trip ending (CMake after
4.4.2), all as of 2026-09-26.
