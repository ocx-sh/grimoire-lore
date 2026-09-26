---
title: The cmake-modernize procedure — a legacy tree to target-based and consumable
topic: cmake-modernize-procedure
agent: modernize-procedure
model: sonnet
kind: exemplar
date_researched: 2026-09-26
sources_count: 18
scope: |
  The ordered, checked procedure the `cmake-modernize` skill runs once per
  repository: legacy directory-scoped CMake to target-based, consumable
  (installable and exportable) CMake. Cites CMK-TGT-01..09, CMK-INST-01..20,
  CMK-VER-01/02/05, CMK-DEP-07 and CMK-MOD-15/16 rather than restating them;
  mints CMK-TGT-10..18 for the procedure's own ordering, refusal and
  reviewable-unit rules. Does not cover dependency-resolution diagnosis
  (`cmake-dependency-triage`'s subject) or packaging edges (Windows DLLs,
  CPack, SBOM — wave-3 `packaging-edges`).
---

## Contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [What "modernize" means and where it stops](#1-what-modernize-means-and-where-it-stops)
   2. [Step 0 — inventory](#2-step-0--inventory)
   3. [Step 1 — choosing the floor](#3-step-1--choosing-the-floor)
   4. [Step 2 — directory scope to targets, in dependency order](#4-step-2--directory-scope-to-targets-in-dependency-order)
   5. [Step 3 — fixing link keywords](#5-step-3--fixing-link-keywords)
   6. [Step 4 — flags and standards to targets or presets](#6-step-4--flags-and-standards-to-targets-or-presets)
   7. [Step 5 — gating developer-only machinery on PROJECT_IS_TOP_LEVEL](#7-step-5--gating-developer-only-machinery-on-project_is_top_level)
   8. [Step 6 — install and export, proven by the round trip](#8-step-6--install-and-export-proven-by-the-round-trip)
   9. [Step 7 — the as-subproject smoke build](#9-step-7--the-as-subproject-smoke-build)
   10. [Step 8 — the configure gate and gersemi in CI](#10-step-8--the-configure-gate-and-gersemi-in-ci)
   11. [Step 9 — optional CPS and pkg-config](#11-step-9--optional-cps-and-pkg-config)
   12. [The reviewable-unit limit](#12-the-reviewable-unit-limit)
   13. [Worked step list: libuv](#13-worked-step-list-libuv)
   14. [Worked step list: rapidjson](#14-worked-step-list-rapidjson)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- The procedure is ten steps in a fixed order: inventory, floor, targets,
  link keywords, flags/standards, top-level gating, install/export, as-
  subproject smoke, configure gate + gersemi, optional CPS/pkg-config —
  matching the map's `skills/modernize-procedure` dive spec.
- Every step names its entry check (what must already be true to start it)
  and its exit check (the command whose result decides "done"); a step with
  no exit check is not in the procedure.
- The skill **flags, never auto-rewrites**, a legacy tree: `include_directories`,
  `add_definitions`, `link_directories`, bare `target_link_libraries`, and a
  bare `cmake_minimum_required` are reported with file:line, not edited,
  per `CMK-TGT-03` (map DECIDE item 3).
- Converting directory scope to targets runs in **dependency order, leaves
  first**: a target with no in-tree library dependency converts before
  anything that links it, so link-keyword fixes on the leaf are already
  correct when the next target up adds `PUBLIC`/`PRIVATE` against it.
- Green build and install prove nothing about consumability
  (`CMK-INST-01`): the procedure's install/export step is not done until the
  round-trip script — install, move, configure a separate consumer, build —
  exits 0.
- `libuv__libuv@abe835d413` has all 9 of its core `target_link_libraries`
  calls bare and installs a static library it never consumes in CI
  (`CMK-INST-01`/`-18` violation); `Tencent__rapidjson@24b5e7a8b2` builds its
  Config paths from `${CMAKE_INSTALL_PREFIX}` directly (not `GNUInstallDirs`),
  writes them through `configure_file(@ONLY)` (not
  `configure_package_config_file`), and exports with no `NAMESPACE` — three
  independent `CMK-INST` MUST violations in one project.
- The floor is written as `3.25...<max>` (topic-map convention), never a
  bare `3.25`: a bare floor leaves every policy above it **unset** even on a
  newer running binary (`CMK-VER-02`).
- `PROJECT_IS_TOP_LEVEL` is 3.21+; below it, the shim is
  `CMAKE_SOURCE_DIR STREQUAL PROJECT_SOURCE_DIR`, exactly as
  `gabime__spdlog@5b63780337:CMakeLists.txt:23-24` writes it — the corpus's
  only non-template use of the guard.
- Only 4 of 46 exemplars (`friendlyanon__cmake-init`, `cpp-best-practices__cmake_template`,
  `gabime__spdlog`, `Kitware__CMake`) reference `PROJECT_IS_TOP_LEVEL` at all;
  legacy-shaped projects (libuv, rapidjson, zlib, curl root) never gate
  anything on it, so a modernize target adopting it is adding new structure,
  not converting an existing guard.
- Install/export is proven only by the `CMK-INST-01` round trip (install,
  grep for leaked absolute paths, move the prefix, configure and build a
  separate consumer). A green `cmake --build && cmake --install` is not
  evidence: a missing `find_dependency()` and a silently-dropped CPS
  generator expression both pass it and fail only downstream.
- The as-subproject smoke build is a second, distinct proof: configure the
  library as an `add_subdirectory` under a synthetic top-level project with
  `PROJECT_IS_TOP_LEVEL` false, confirming developer-only machinery (tests,
  examples, install rules under `CMK-DEP-07`'s guard) stays off.
- CI gates on the exit code of the version-appropriate configure flag
  (`-Werror=author` on ≥4.4, `-Werror=dev` on ≤4.3 — `CMK-CORE-01`) and on
  `gersemi --check` (SHOULD, `CMK-CORE-04`), never on a grep of stderr text.
- CPS (`install(PACKAGE_INFO)`) and pkg-config are the last, optional step,
  gated on `CMAKE_VERSION VERSION_GREATER_EQUAL 4.3` and on the three
  `CMK-INST-14` preconditions (matching namespace, `simple` schema, no
  unresolved generator expressions) already holding — never added before the
  Config package round trip is green.
- The reviewable-unit limit: a floor bump, a directory-to-target conversion,
  and the first install/export addition are three separate diffs, never one;
  a floor bump never ships in the same diff as a link-keyword or flag change,
  because a broken bisect then can't tell which caused a new gate failure.
- CMake's own tutorial was restructured at the 4.x line: the old numbered
  "Step 1..10" per-page tutorial that generic LLM training data quotes was
  replaced by topic pages (`Getting Started with CMake`,
  `In-Depth CMake Target Commands`, …) at `v4.4.2`; citing "Step 3: Adding a
  Library" by that title now 404s.
- That same current tutorial page classifies `target_include_directories`
  and `target_link_directories` as "Esoteric/Footguns" for **already-linked,
  in-tree targets** (usage requirements propagate through
  `target_link_libraries`) — not a blanket warning against the command a
  library uses to declare its own public headers, which the tutorial's own
  vendored-library exercise and `friendlyanon__cmake-init`'s template both
  still use.

## Findings

### 1. What "modernize" means and where it stops

The procedure converts a **legacy, directory-scoped CMake tree that already
builds** into a **target-based, consumable** one: every build requirement on
a target's own `target_*` commands, and the result installable and
`find_package`-able by a separate consumer. It does not port a non-CMake
build system end to end (that scope belongs to the Cookbook's Vim-from-
Autotools chapter and Mastering CMake's per-build-system sections, both read
below as background, neither followed step for step), and it does not chase
every `CMK-INST`/`CMK-TGT` row to CONSIDER severity — MUST and SHOULD rows
only, in the fixed order below.

The house precedent is `skills/bazel-adopt/`: a go/no-go-free, **already-
decided-to-adopt** procedure with a numbered stop condition, one command per
step, and an explicit "what this procedure deliberately leaves open" list
([bazel-adopt] Stop condition, Procedure). `cmake-modernize` borrows that
shape directly: numbered steps, one exit check each, and a stop condition
that is a state on disk (a green round-trip script and a green as-subproject
build), not a narrative.

### 2. Step 0 — inventory

**Entry check:** the tree configures and builds today (unmodified). If it
does not, this procedure is the wrong tool — inventory a build failure with
`cmake-dependency-triage` first.

**What it runs**, all read-only:

```sh
# CMK-TGT-01: bare target_link_libraries
grep -rn -A2 --include='CMakeLists.txt' --include='*.cmake' -e 'target_link_libraries(' .
# CMK-TGT-03: directory-scope commands
grep -rnE --include='CMakeLists.txt' --include='*.cmake' \
  -e '^[[:space:]]*include_directories\(' -e '^[[:space:]]*add_definitions\(' \
  -e '^[[:space:]]*add_compile_options\(' -e '^[[:space:]]*link_directories\(' \
  -e '^[[:space:]]*link_libraries\(' .
# CMK-TGT-04: global flag variables
grep -rn --include='CMakeLists.txt' --include='*.cmake' \
  -e 'set(CMAKE_CXX_FLAGS' -e 'set(CMAKE_C_FLAGS' \
  -e 'string(APPEND CMAKE_CXX_FLAGS' -e 'string(APPEND CMAKE_C_FLAGS' . \
  | grep -v -e 'toolchain'
# CMK-VER-05: sub-3.5 floors in fetched/vendored trees (include, not exclude, these paths)
grep -rniE --include='CMakeLists.txt' --include='*.cmake' \
  -e 'cmake_minimum_required\([[:space:]]*VERSION[[:space:]]+(2\.|3\.[0-9]([^0-9]|$))' \
  -e 'cmake_policy\([[:space:]]*VERSION[[:space:]]+(2\.|3\.[0-9]([^0-9]|$))' \
  build/_deps third_party 2>/dev/null
```

Every command follows `CMK-CORE-05`: one `grep -rn`, no pipe into
`grep -q`/`head` under `set -o pipefail` — the exact trap this program's
wave-1 exemplar pass tripped, zeroing cells silently ([gate] CMK-CORE-05).

The language-level checks (macro-vs-function scoping, unquoted variable
expansion, `if()` string/name collisions) belong to the `CMK-LANG` family in
`cmake-build/language.md`. **That file had not landed as of this dive** (no
wave-3 `language.md` or dedicated language dive exists in this worktree on
2026-09-26); the nearest landed proxy is `CMK-MOD-16`'s `PARSE_ARGV` check,
which applies only to modules the tree authors itself, not to consumer
`CMakeLists.txt` code. The inventory step therefore runs the greps above
plus whatever `CMK-LANG` ships once it lands, and does not block on its
absence — flag this gap to the skill's author.

**Exit check:** every grep above has produced a written list of file:line
hits (possibly empty). Inventory does not fix anything; it produces the
finding list steps 2-9 consume. Each hit gets a comment in the migration
plan file (mirroring `bazel-adopt`'s decision file, [bazel-adopt] §3) naming
which later step will touch it — this is what makes CMK-TGT-03's "flag,
never auto-rewrite" refusal auditable rather than just a promise.

### 3. Step 1 — choosing the floor

**Entry check:** inventory is written.

Write `cmake_minimum_required(VERSION 3.25...<max>)` at the root, where
`<max>` is the newest CMake the project's own CI will run — never simply the
newest release (`CMK-VER-02`, SHOULD). Never write a two-dot range like
`3.15..4.3`: it silently collapses to `VERSION 3.15`, no diagnostic, even
under the gate (`CMK-VER-01`, MUST, floor convention from the topic map's
conflict-1 resolution — this program's own shipped rules are written for
3.25 and verified on 3.31.12/4.4.2).

Before raising the floor of the project's own root, re-run the `CMK-VER-05`
inventory grep, this time **including** `_deps/`, `third_party/` and vendored
subdirectories: a fetched dependency floor below 3.5 is
`cmake_minimum_required` hard-errors on 4.0+ ("Compatibility with CMake < 3.5
has been removed"), and a floor in 3.5-3.9 turns the dependency's own
deprecation warning into a **gate error in your build**, on 3.31.12 and
4.4.2 alike ([gate] §4, CMK-VER-05). If a vendored subtree has such a floor,
patch it or set `CMAKE_POLICY_VERSION_MINIMUM` scoped to that one
`add_subdirectory`/`FetchContent_MakeAvailable` call and restore it right
after (`CMK-VER-06`) — never as a project-wide default.

**Exit check:**
`grep -rnE --include='CMakeLists.txt' -e 'cmake_minimum_required\([[:space:]]*VERSION[[:space:]]+[0-9]+(\.[0-9]+)*[[:space:]]*(FATAL_ERROR)?[[:space:]]*\)' .`
on the root file only returns empty (the two-dot-or-bare form is gone), and
the gate canary (`§10` below) exits 1 on the newest binary the floor claims
to support.

### 4. Step 2 — directory scope to targets, in dependency order

**Entry check:** step 1's floor is committed; inventory's `CMK-TGT-03` list
exists.

Convert one target at a time, working from the **leaves of the in-tree
dependency graph upward** — a target nothing else in the tree links against
converts first. This is Mastering CMake's own ordering advice generalized:
the book's per-build-system sections convert one Makefile/subsystem to one
CMakeLists at a time rather than rewriting the whole tree in one pass
([mastering-cmake] "choose a strategy and stick with it"), and Effective
Modern CMake states the destination directly: "Forget the commands
`add_compile_options`, `include_directories`, `link_directories`,
`link_libraries`... [they] operate on the directory level... Better operate
on the targets directly" ([emc]).

Leaves-first matters mechanically: step 3 (link keywords) needs a target's
`target_link_libraries` PUBLIC/PRIVATE/INTERFACE split to already reflect
what the target's headers expose, and a parent target's own PUBLIC/PRIVATE
choice depends on whether the child's types leak into the parent's public
headers — information only available once the child is itself target-based.
Converting top-down risks re-doing the parent's link-keyword pass after the
child's own scope changes.

Each target's own conversion is: replace directory-scope `include_directories`
feeding it with `target_include_directories(<t> ... )`; replace
`add_definitions`/`add_compile_options` feeding it with
`target_compile_definitions`/`target_compile_options`; replace
`link_directories` with `target_link_directories` **only** for a
non-CMake vendored library — an in-tree CMake target never needs it, because
usage requirements propagate through `target_link_libraries` (current CMake
Tutorial, [tut-targets] Exercise 3: "It is generally unnecessary to directly
describe include and link directories, as these requirements are inherited
when linking together targets"; see §Contested for the tutorial's own
overreaching table label).

**Exit check:** the `CMK-TGT-03` inventory grep, re-run scoped to the
directory the just-converted target lives in, is empty. Converting the whole
tree exits when the original inventory grep is empty everywhere **except**
inside genuinely vendored, untouched third-party subtrees, which the skill
flags but does not enter (see §The reviewable-unit limit).

### 5. Step 3 — fixing link keywords

**Entry check:** the target from step 2 exists as a `target_*`-described
target (a bare `add_library`/`add_executable` with directory-scope
requirements already converted).

For every `target_link_libraries` call on that target, name `PUBLIC`,
`PRIVATE` or `INTERFACE`, defaulting to `PRIVATE` unless the dependency's
types appear in the target's own installed headers (`CMK-TGT-01`, MUST for
library targets, SHOULD for test/example targets). This is where the
inventory's biggest number lives: bare calls are 13.3% of a repo's own
library code and 32.0% of its test and example code across the corpus
([lib] Verdict #6, CMK-TGT-01) — `libuv__libuv@abe835d413:CMakeLists.txt:477,494,530,727,745,747,763`
is 9 of 9 bare, and `duckdb__duckdb@d8a1bd4:CMakeLists.txt:1276,1316` sits in
the same 23-of-30-bare population the wave-2 dive counted for that repo.
Every private dependency left bare lands in the exported
`INTERFACE_LINK_LIBRARIES` and forces a `find_dependency()` add in step 6
that a correct `PRIVATE` keyword would have made unnecessary.

**Exit check:** `CMK-TGT-01`'s spot-check grep on the target's file returns
only keyworded calls (a call whose second token is not `PUBLIC`/`PRIVATE`/
`INTERFACE` is the finding). Add the target's namespaced `ALIAS`
(`add_library(Pkg::lib ALIAS lib)`, `CMK-TGT-02`, SHOULD) in the same diff —
it costs one line and CMP0028 then catches the next typo for free.

### 6. Step 4 — flags and standards to targets or presets

**Entry check:** step 3 is done for the target (link keywords are correct,
so what "public" now means is settled).

Move anything the inventory's `CMK-TGT-04` grep found
(`set(CMAKE_CXX_FLAGS ...)`, `string(APPEND CMAKE_C_FLAGS ...)`) to
`target_compile_options` on the specific target, or out of the tree entirely
into a toolchain file, preset, or manager profile (`CMK-TGT-04`, SHOULD — a
global flag variable is inherited by every subdirectory including fetched
dependencies and overrides what a Conan or vcpkg toolchain injected).

State the minimum language standard as
`target_compile_features(<t> PUBLIC cxx_std_NN)`, never `CMAKE_CXX_STANDARD`
outside a top-level guard (`CMK-TGT-05`, MUST — `target_compile_features`
fills `INTERFACE_COMPILE_FEATURES`, which exports; the variable does not,
and a bare `set()` also shadows a Conan profile's `compiler.cppstd`). Where
`CMAKE_CXX_STANDARD` genuinely is set (a top level, a preset), it is always
paired with `CMAKE_CXX_STANDARD_REQUIRED ON` (`CMK-TGT-06`, MUST — the
standard otherwise "decays") and `CMAKE_CXX_EXTENSIONS OFF`, spelled exactly
— `CMAKE_CXX_STANDARD_EXTENSIONS` does not exist and is a silent no-op
(`CMK-TGT-07`, SHOULD).

Replace any `file(GLOB)`/`GLOB_RECURSE` feeding `add_library`/
`add_executable`/`target_sources` with an explicit source list
(`CMK-TGT-08`, SHOULD — the CMake docs themselves recommend against it, and
`CONFIGURE_DEPENDS` "may not work reliably on all generators"). Remove any
unconditional literal `-Werror`/`/WX`; warnings-as-errors comes from
`CMAKE_COMPILE_WARNING_AS_ERROR` in a preset/CI or a default-OFF developer
option (`CMK-TGT-09`, MUST).

**Exit check:** the four greps behind `CMK-TGT-04`, `-06`, `-07` and `-09`
(commands given at each rule above) are empty on this target's files, and
`cmake --help-variable NAME` succeeds for every `CMAKE_`-prefixed name the
diff introduces — the mechanical check that catches an invented variable
like `CMAKE_CXX_STANDARD_EXTENSIONS` before it ships.

### 7. Step 5 — gating developer-only machinery on PROJECT_IS_TOP_LEVEL

**Entry check:** the target and its immediate siblings are through steps 2-4.

`PROJECT_IS_TOP_LEVEL` is "a boolean variable indicating whether the most
recently called `project()` command in the current scope or above was in the
top level `CMakeLists.txt` file", added in 3.21
([cmake-var]) — true at the project's own top level and false when the tree
is `add_subdirectory`'d by a consumer. Below the 3.25 floor's compatibility
window (a dependency this project itself vendors down to 3.21) it degrades
gracefully; below 3.21, the shim is `CMAKE_SOURCE_DIR STREQUAL
PROJECT_SOURCE_DIR`, written defensively for both cases exactly as
`gabime__spdlog@5b63780337:CMakeLists.txt:21-24` does:
```cmake
if((DEFINED PROJECT_IS_TOP_LEVEL AND PROJECT_IS_TOP_LEVEL) OR (NOT DEFINED PROJECT_IS_TOP_LEVEL
                                                                 AND CMAKE_SOURCE_DIR STREQUAL PROJECT_SOURCE_DIR))
```
Gate on it: `BUILD_TESTING`/the test tree, examples, developer warnings,
`CMAKE_BUILD_TYPE` defaulting, and any `option()` a packager building this
as a dependency should never see. `friendlyanon__cmake-init@7e0c52fc73:cmake-init/templates/c/shared/CMakeLists.txt`
is the corpus's clean instance: `if(PROJECT_IS_TOP_LEVEL)` around the
examples subdirectory, and `elseif(NOT PROJECT_IS_TOP_LEVEL)` warning that
"Developer mode is intended for developers" before including
`cmake/dev-mode.cmake`.

This is also where `CMK-DEP-07`'s guard belongs for a library that fetches
its own dependencies: `FetchContent_MakeAvailable`/`CPMAddPackage` outside
test code runs only under this same top-level guard, or on a declare that
carries `FIND_PACKAGE_ARGS` (MUST — a library that always fetches denies
every consumer the chance to supply an installed copy).

Only 4 of 46 exemplars reference `PROJECT_IS_TOP_LEVEL` at all
(`friendlyanon__cmake-init` 18 hits, `Kitware__CMake` 10,
`cpp-best-practices__cmake_template` 5, `gabime__spdlog` 1); libuv,
rapidjson, zlib and curl's root do not. This step therefore *adds* new
structure to a legacy tree, it does not convert an existing (unguarded)
form — flag it in the migration plan as new, not converted.

**Exit check:** with the tree `add_subdirectory`'d from a throwaway parent
project (`add_subdirectory(<this-tree>)` under a two-line `project()`), no
test target, example target, or developer-only `option()` is defined
(`cmake --build . --target help` lists none of them). With the tree
configured as its own top level, all of them are present.

### 8. Step 6 — install and export, proven by the round trip

**Entry check:** steps 2-5 are done for every target that will be installed.

This is the step with the most MUST rows, because CMake writes broken
export files with no diagnostic at configure or build time — only a
separate downstream consumer configure exposes the defect. **A green
`cmake --build` and `cmake --install` on the exporting project prove
nothing** (`CMK-INST-01`, Verdict #1): a missing `find_dependency()` and a
CPS generator-expression failure both leave the exporter itself green and
fail only in the consumer's Generate step. So this step's exit check is
always the round-trip script, never the exporter's own build:

```sh
# CMK-INST-01. PKG=find_package name, VER=a satisfied version,
# TARGETS=its imported targets, SRC=absolute source dir.
set -eu
PKG=example VER=1.0 TARGETS=example::example SRC=/abs/path/to/project
W="$PWD"
cmake -S "$SRC" -B "$W/build"
cmake --build "$W/build"
cmake --install "$W/build" --prefix "$W/prefix"
grep -rIl --exclude='*.pc' -e "$SRC" -e "$W/build" -e "$W/prefix" "$W/prefix" > "$W/leaks.txt" || true
test ! -s "$W/leaks.txt"
grep -rn --include='*.cmake' -e 'set(_IMPORT_PREFIX "/' "$W/prefix" > "$W/abs-import.txt" || true
test ! -s "$W/abs-import.txt"
mv "$W/prefix" "$W/moved"
mkdir -p "$W/consumer"
printf 'int main(void) { return 0; }\n' > "$W/consumer/main.c"
printf '%s\n' 'cmake_minimum_required(VERSION 3.25)' 'project(rt LANGUAGES C)' \
  "find_package($PKG $VER CONFIG REQUIRED)" 'add_executable(rt main.c)' \
  "target_link_libraries(rt PRIVATE $TARGETS)" > "$W/consumer/CMakeLists.txt"
cmake -S "$W/consumer" -B "$W/consumer-build" -DCMAKE_PREFIX_PATH="$W/moved"
cmake --build "$W/consumer-build"
grep -e "^${PKG}_DIR" "$W/consumer-build/CMakeCache.txt"
```

Before running it, the diff must already satisfy, in order (each MUST unless
noted):

1. `install(EXPORT ... DESTINATION)` built from `GNUInstallDirs`
   (`${CMAKE_INSTALL_LIBDIR}/cmake/<pkg>`), never from
   `${CMAKE_INSTALL_PREFIX}` or a literal `lib`/`lib64`
   (`CMK-INST-02`/`-09`). `Tencent__rapidjson@24b5e7a8b2:CMakeLists.txt:148`
   is the counter-example: `LIB_INSTALL_DIR` is defined as
   `"${CMAKE_INSTALL_PREFIX}/lib"` and line 233 builds
   `CMAKECONFIG_INSTALL_DIR` from it — CMake then writes a literal
   `set(_IMPORT_PREFIX "/...")` instead of the relocation chain, and the
   package breaks the moment its prefix moves (measured, [lib] §CMK-INST-02).
2. Every `find_dependency()` the Config template needs, guarded the same
   way the build guarded the original `find_package`/`FetchContent`
   (`CMK-INST-03`) — never a raw `find_package()` inside the template, which
   makes the dependency unconditionally fatal.
3. A `<Pkg>ConfigVersion.cmake` from `write_basic_package_version_file()`
   (`CMK-INST-04`) — without it every versioned request fails with
   "version: unknown". `Tencent__rapidjson@24b5e7a8b2:RapidJSONConfigVersion.cmake.in`
   hand-rolls this file with no `COMPATIBILITY` mode at all.
4. The Config template processed with `configure_package_config_file()`,
   never bare `configure_file()` (`CMK-INST-05`) — the latter leaves
   `@PACKAGE_INIT@` as an empty string with no error.
   `Tencent__rapidjson@24b5e7a8b2:RapidJSONConfig.cmake.in:1` has the
   unresolved `@PACKAGE_INIT@` token and `CMakeLists.txt:229-230` processes
   it with plain `CONFIGURE_FILE(...@ONLY)`.
5. `install(EXPORT)`/`export(EXPORT)` given a `NAMESPACE`
   (`CMK-INST-06`) — `Tencent__rapidjson@24b5e7a8b2:CMakeLists.txt:255`,
   `INSTALL(TARGETS RapidJSON EXPORT RapidJSON-targets)`, has none; a typo'd
   consumer link falls back to a silent `-lname` under CMP0028.

**Exit check:** the round-trip script exits 0, its leak and absolute-import
greps are both empty, and its last printed line
(`grep -e "^${PKG}_DIR" ...CMakeCache.txt`) shows which package file the
moved consumer actually resolved. Wire this as its own CI step, separate
from the library's own test suite (`CMK-INST-18`, SHOULD) — libuv installs
in CI and never consumes the result
(`libuv__libuv@abe835d413:.github/workflows/CI-sample.yml:1-30`), which is
exactly the gap this step closes.

### 9. Step 7 — the as-subproject smoke build

**Entry check:** step 5 (PROJECT_IS_TOP_LEVEL gating) and step 6 (install/
export) are both green.

Two different consumption modes need two different proofs. Step 6 proves
the **installed** package resolves through `find_package`. This step proves
the **source tree**, dropped in whole via `add_subdirectory` or
`FetchContent`, behaves as a well-mannered subproject: no test target, no
example target, no developer warning escapes, and (`CMK-DEP-10`) a
dependency this project itself declares does not silently shadow a version a
parent project already declared for the same name, because "the first such
call will control how that dependency will be made available."

```sh
mkdir -p "$W/asub" && printf '%s\n' \
  'cmake_minimum_required(VERSION 3.25)' 'project(asub LANGUAGES C)' \
  "add_subdirectory($SRC lib-build)" > "$W/asub/CMakeLists.txt"
cmake -S "$W/asub" -B "$W/asub-build"
cmake --build . --target help --directory "$W/asub-build" \
  | grep -iE '^\.\.\. (test|example)' && echo FAIL || echo OK
```

**Exit check:** the script prints `OK` (no test or example target leaked
into the parent build's target list), and the same `add_subdirectory`
configure exits 0 with `-DFETCHCONTENT_FULLY_DISCONNECTED=ON` and an
installed copy of every declared dependency already on
`CMAKE_PREFIX_PATH` — this is `CMK-DEP-07`'s own verification, reused here
rather than re-derived: a non-zero exit from a forced fetch, with an
installed copy available, is the finding. Always pass
`-DCMAKE_POLICY_DEFAULT_CMP0170=NEW` alongside it: without that default, a
`FetchContent_Declare` range whose `<max>` stops below 3.30 configures a
forced fetch against an empty source directory and still exits 0
([seam] CMK-DEP-07 verify note).

### 10. Step 8 — the configure gate and gersemi in CI

**Entry check:** steps 6-7 are green locally; this step wires them, plus
formatting, into CI.

Every CI configure leg runs under the gate spelled for the binary that leg
actually runs: `-Werror=author` on CMake ≥4.4, `-Werror=dev` on ≤4.3, and
`-Werror=dev` on a shared command line that must cover both, because
`-Werror=author` is silently ignored (exit 0, no diagnostic) on 3.31.12 and
4.3.4 (`CMK-CORE-01`, MUST). A `CMakePresets.json` raised to schema 12 (CMake
4.4) must rename `warnings.dev`/`errors.dev` to `author` in the same edit —
4.4.2 rejects `dev` under schema 12 outright (`CMK-CORE-02`, MUST). Commit a
`.gersemirc` whose `definitions` key lists every file defining the project's
own commands, and gate on `gersemi --check`, never `--diff` — `--diff` exits
0 even when it would reformat (`CMK-MOD-15`/`CMK-CORE-04`, SHOULD; gersemi
0.29.1, 2026-09-14). Never add `cmake-format` or `cmake-lint` next to it;
both last released 0.6.13 in 2020 and no maintained semantic linter exists
(`CMK-CORE-04`) — migrate an existing `.cmake-format*` config, never extend
it.

**Exit check:** the gate canary
(`cmake_minimum_required(VERSION 3.25...4.4); project(gate_canary LANGUAGES NONE); message(AUTHOR_WARNING "gate canary")`)
exits 1 with each CI leg's exact binary and flags, and `gersemi --check` on
the module directory exits 0 with no `Warning: unknown command` on stderr.

### 11. Step 9 — optional CPS and pkg-config

**Entry check:** step 6's round trip is green, and steps 5/7 confirm the
package's own namespace, schema and generator-expression discipline are
already clean — CPS never comes before the Config package it rides beside.

Add `install(PACKAGE_INFO <pkg> EXPORT <set> VERSION ... COMPAT_VERSION ...)`
guarded by `if(CMAKE_VERSION VERSION_GREATER_EQUAL 4.3)`, only once three
preconditions hold, because on 4.3+ `find_package` picks the `.cps` file
over the Config file in the same prefix (measured, `CMK-INST-14`):

1. The CPS package name equals the export `NAMESPACE`, exactly
   (`CMK-INST-15`, MUST) — a mismatch (`acme::` exporting a CPS package
   named `dep`) breaks every ≥4.3 consumer while 3.31.12 keeps working,
   which is precisely the kind of defect this procedure's round trip must
   run **on both lines** to catch.
2. `VERSION_SCHEMA` omitted or `simple` (`CMK-INST-16`, MUST) — any other
   schema value is written without validation and then rejected by
   `find_package`'s own comparison, silently falling through to the Config
   file, which earlier research misread as "Config wins."
3. Every generator expression on a CPS-exported target's `INTERFACE_*`
   properties is configuration-dependent only (`CMK-INST-17`, MUST) — a
   `$<COMPILE_LANGUAGE:...>` expression there is a fatal configure error
   only once `install(PACKAGE_INFO)` exists, gated on the configure exit
   code, never a log grep (CMake wraps the message across lines).

Add a `.pc.in` alongside it only with `${pcfiledir}`-relative paths computed
via `file(RELATIVE_PATH)`, never a hard-coded `../..` (`CMK-INST-12`,
SHOULD).

**Exit check:** the round-trip script, re-run on a CMake ≥4.3 binary, ends
in `.../cps/<pkg>` on its last printed `_DIR` line and exits 0; the same
script on 3.31.12 ends in `.../cmake/<pkg>` and also exits 0. 0 of 46
exemplars adopt CPS today, so this step has no corpus example to converge
toward — it exists to prevent a namespace or schema mismatch from shipping
silently, not because any exemplar demands it.

### 12. The reviewable-unit limit

Never in one diff:

- **A floor bump and a behavior change.** Raising `<max>` or `<min>`
  changes which policies are NEW; bundling it with a link-keyword or flag
  fix makes a gate failure impossible to bisect to its cause.
- **More than one target's directory-scope-to-target conversion**, unless
  the targets are true dependency-graph leaves converted together because
  neither links the other. Steps 2-3 are inherently per-target; the
  reviewer needs to see one target's before/after, not the whole tree's.
- **The first install/export addition together with any CMK-TGT fix.** The
  round-trip script is the reviewer's only real evidence for this diff; a
  concurrent link-keyword change means a round-trip failure can't be
  attributed to either half.
- **A vendored/untouched third-party subtree.** `CMK-TGT-03`'s directory-
  scope inventory explicitly does not enter these; the skill reports them
  as flagged-not-converted, per the map's binding decision ("flag legacy
  trees, never auto-rewrite them").
- **CPS/pkg-config with anything else.** Step 9 depends on step 6 already
  being independently green; it never rides in the same diff that first
  makes the round trip pass.

This mirrors `bazel-adopt`'s own stop-condition discipline: "Stop when the
[step] exists... Then stop. Do not migrate a second subtree" ([bazel-adopt]
Stop condition) — each step here is its own stopping point, not a
checkpoint inside a bigger patch.

### 13. Worked step list: libuv

`libuv__libuv@abe835d413` (root `CMakeLists.txt`, 3.10 floor, `LANGUAGES C`):

1. **Inventory.** `CMK-TGT-01` grep: 9 of 9 core `target_link_libraries`
   calls bare (`:477,494,530,727,745,747,763`). `CMK-TGT-03`: no
   `include_directories`/`add_definitions` hits at the root (clean).
   `CMK-TGT-04`: `CMAKE_C_FLAGS` appended 4 times for sanitizer flags
   (`:56,60,68,76`) — flagged, not a MUST violation as written (sanitizer
   builds are a developer toggle) but a candidate to move to
   `target_compile_options` behind the same option. Exit: list written.
2. **Floor.** Bare `VERSION 3.10` becomes `3.10...4.4` (their own floor
   choice preserved; this program's 3.25 floor is a recommendation for new
   code, not a mandate to bump an unrelated project's compatibility
   promise). Exit: the two-dot/bare-form grep is clean.
3. **Targets.** Root already uses `add_library`/`add_executable`
   exclusively (no directory-scope leakage found); step 2 is a no-op here.
   Exit: `CMK-TGT-03` grep stays empty.
4. **Link keywords.** Add `PUBLIC`/`PRIVATE`/`INTERFACE` to all 9 calls
   (`uv`, `uv_a`, `uv_run_benchmarks_a`, `uv_run_tests`, `uv_run_tests_a`
   ×2, `uv_run_appcontainer`) — the shared library's own dependencies
   (`${uv_libraries}`, e.g. `pthread`, `dl`) become `PRIVATE` unless a
   consumer's compile needs the same libraries, which libuv's own installed
   headers do not require. Exit: `CMK-TGT-01` grep on the file returns only
   keyworded calls.
5. **Flags/standards.** `CMAKE_C_STANDARD_REQUIRED ON` and
   `CMAKE_C_STANDARD 11` (`:21,23`) already pair correctly — no change.
   Sanitizer `CMAKE_C_FLAGS` appends move to `target_compile_options(uv_a ...)`
   guarded by the existing sanitizer option. Exit: `CMK-TGT-06` pairing
   grep stays clean (it already was).
6. **Top-level gating.** libuv has no `PROJECT_IS_TOP_LEVEL` reference; add
   one around the test/benchmark targets (`uv_run_tests*`,
   `uv_run_benchmarks_a`), which currently build unconditionally even as a
   subproject. Exit: as-subproject smoke build shows those targets absent.
7. **Install/export.** libuv already calls `install(TARGETS uv_a EXPORT
   libuvConfig ...)` (`:795`) and `install(EXPORT libuvConfig ...)` (`:797`)
   and installs a `ConfigVersion.cmake` (`:803`) — but never configures a
   downstream consumer against the installed prefix in CI
   (`:.github/workflows/CI-sample.yml:1-30` builds as a subproject only).
   Run the round-trip script; the first real finding is whatever it
   surfaces (namespace, `find_dependency` completeness — both need a live
   run to settle, not a reading heuristic, precisely `CMK-INST-01`'s point).
   Exit: round trip green.
8. **As-subproject smoke.** Already effectively exercised by libuv's own
   CI, which only does this — invert the finding from step 7 by also
   proving the *installed* path, not replacing the subproject build.
9. **Gate + gersemi.** No `-Werror=dev`/`author` in libuv's CI as read; add
   the version-appropriate flag per leg. No `.gersemirc`; add one.
10. **CPS/pkg-config.** Deferred — libuv has no `.pc.in` today and 0 CPS
    adopters exist corpus-wide; not a candidate until the round trip (step
    7) is green and stable.

### 14. Worked step list: rapidjson

`Tencent__rapidjson@24b5e7a8b2` (root `CMakeLists.txt`, 3.5 floor, header-only,
`add_library(RapidJSON INTERFACE)` at line 196 — 0 `target_link_libraries`
calls in the whole tree):

1. **Inventory.** `CMK-TGT-01`: not applicable (interface library, no
   link calls). `CMK-TGT-04`: `set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} /WX")`
   present (MSVC branch) — flagged as a `CMK-TGT-09` violation too (`/WX`
   unconditional). `CMK-INST-09`: `LIB_INSTALL_DIR`/`INCLUDE_INSTALL_DIR`
   defined from `${CMAKE_INSTALL_PREFIX}` directly (`:147-149`) instead of
   `GNUInstallDirs`. Exit: list written, three independent findings already
   visible before any build runs.
2. **Floor.** `3.5` becomes `3.25...4.4` if the project accepts raising its
   compatibility promise (a real decision for the project, flagged not
   auto-applied); the procedure notes 3.5 itself is exactly the removed-
   compatibility boundary on CMake 4.0+ (`CMK-VER-05`), so this project's
   floor is a live risk independent of this modernization.
3. **Targets.** No directory-scope leakage beyond the flags above; the
   `add_library(RapidJSON INTERFACE)` shape is already target-based. No-op.
4. **Link keywords.** Not applicable — no `target_link_libraries` calls
   exist to fix.
5. **Flags/standards.** Remove the unconditional `/WX`
   (`CMK-TGT-09`); no `CMAKE_CXX_STANDARD` is set (header-only, consumer
   supplies the standard) — nothing to pair.
6. **Top-level gating.** No `PROJECT_IS_TOP_LEVEL` reference; add one
   around `RAPIDJSON_BUILD_TESTS`/`RAPIDJSON_BUILD_EXAMPLES`/
   `RAPIDJSON_BUILD_DOC`, which today are plain `option()`s with no
   top-level guard.
7. **Install/export — the largest step here.** Three independent MUST
   fixes, each with its own citation, before the round trip can pass:
   - Replace `LIB_INSTALL_DIR "${CMAKE_INSTALL_PREFIX}/lib"` (`:148`) and
     the destination built from it (`:233`) with `GNUInstallDirs`'
     `${CMAKE_INSTALL_LIBDIR}`/`${CMAKE_INSTALL_DATADIR}` (`CMK-INST-02`/
     `-09` — a header-only package installs its Config files under
     `${CMAKE_INSTALL_DATADIR}/cmake/<pkg>`, `CMK-INST-08`).
   - Replace the two `CONFIGURE_FILE(...Config.cmake.in ... @ONLY)` calls
     (`:229-230`, and the second pass around `:249-251`) with
     `configure_package_config_file()` so `@PACKAGE_INIT@` in
     `RapidJSONConfig.cmake.in:1` actually resolves (`CMK-INST-05`).
   - Replace the hand-rolled `RapidJSONConfigVersion.cmake.in` (no
     `COMPATIBILITY` mode, string-only version compare) with
     `write_basic_package_version_file()`, choosing `SameMajorVersion` or
     `ExactVersion` per the project's own ABI promise, plus
     `ARCH_INDEPENDENT` for the header-only case (`CMK-INST-04`/`-08`).
   - Add `NAMESPACE RapidJSON::` to `INSTALL(EXPORT RapidJSON-targets ...)`
     (`:255-256` today has none) and a matching
     `add_library(RapidJSON::RapidJSON ALIAS RapidJSON)` (`CMK-INST-06`/
     `CMK-TGT-02`).
   Run the round-trip script only after all four land together (they are
   one coherent "make the Config package correct" diff, not four separate
   reviewable units, because none of them independently produces a
   consumable package — this is the one place the reviewable-unit limit's
   "install/export addition" is itself allowed to be a multi-file, single-
   concern diff, as long as no `CMK-TGT` fix rides along).
8. **As-subproject smoke.** rapidjson is commonly vendored via
   `add_subdirectory`; confirm `RAPIDJSON_BUILD_TESTS` etc. default OFF once
   step 6's guard lands, so a consumer's build does not compile rapidjson's
   own test suite by accident.
9. **Gate + gersemi.** Add the version-appropriate `-Werror` flag and a
   `.gersemirc`; rapidjson's CMake files use legacy uppercase command
   spelling (`CMAKE_MINIMUM_REQUIRED`, `PROJECT`, `SET`) throughout, which
   gersemi normalizes on `--check` (a formatting-only fix, not gated MUST
   here, but worth flagging as a first gersemi run will produce a large
   diff).
10. **CPS/pkg-config.** Only after step 7's round trip is green: the CPS
    namespace precondition (`CMK-INST-15`) is exactly why step 7 added
    `NAMESPACE RapidJSON::` first — CPS export would otherwise default to
    an unnamespaced `RapidJSON` package name mismatched against whatever
    the Config side now exports.

## Normative guidance candidates

Numbering continues the `CMK-TGT` family from `cmake-consumable-library.md`'s
`CMK-TGT-01..09`; these are the procedure's own ordering, refusal and unit
rules, not restatements of the content rows above.

1. **CMK-TGT-10 · MUST.** Run the modernize procedure's ten steps in the
   fixed order (inventory, floor, targets, link keywords, flags/standards,
   top-level gating, install/export, as-subproject smoke, gate+gersemi,
   optional CPS/pkg-config); never start install/export (step 6) before
   link keywords (step 3) are fixed on every target it exports.
   - Rationale: a bare `target_link_libraries` call exports every
     dependency, correctly scoped or not, into `INTERFACE_LINK_LIBRARIES`;
     fixing keywords after export ships means re-running the round trip
     from scratch.
   - Verify: the migration plan file records each step's completion
     timestamp/commit; a step-6 commit whose step-3 grep (`CMK-TGT-01`) is
     still non-empty on an exported target is the finding.
   - Floor: any (procedural, not a CMake-version rule).
2. **CMK-TGT-11 · MUST.** In an untouched legacy tree, the skill reports
   every `CMK-TGT-03` (`include_directories`/`add_definitions`/
   `add_compile_options`/`link_directories`/`link_libraries`) and
   `CMK-TGT-01` (bare `target_link_libraries`) hit with file:line; it never
   edits them without a human converting the enclosing target through steps
   2-3 first.
   - Rationale: map DECIDE item 3 binds this explicitly ("flag legacy
     trees, never auto-rewrite them"); a directory-scope command's blast
     radius (every sibling target, every `add_subdirectory`) is invisible
     from the grep alone.
   - Verify: the tool's own diff touches only files named in a completed
     step's exit check; any edited file not listed in the inventory output
     is the finding.
   - Floor: any.
3. **CMK-TGT-12 · MUST.** Convert directory-scope-to-target one target at a
   time, leaves of the in-tree dependency graph first.
   - Rationale: a parent target's correct link-keyword scope depends on the
     child already being target-based; converting top-down forces a second
     pass. See §4.
   - Verify: reading heuristic — the migration plan's step-2 entries are
     ordered so no target's conversion commit predates a target it links
     against.
   - Floor: any.
4. **CMK-TGT-13 · MUST.** Treat a green `cmake --build && cmake --install`
   as zero evidence for step 6; the only passing signal is the `CMK-INST-01`
   round-trip script exiting 0.
   - Rationale: measured — a missing `find_dependency` and a dropped CPS
     generator expression both leave the exporting project's own build and
     install green ([lib] Verdict #1).
   - Verify: CI step 6's job runs the round-trip script as a distinct step
     with its own required status; a green "build" job with no separate
     "consume" job is the finding.
   - Floor: any.
5. **CMK-TGT-14 · MUST.** A floor bump (step 1) ships in its own diff, with
   no `CMK-TGT`/`CMK-INST` content change riding along.
   - Rationale: a gate failure after a combined diff cannot be bisected to
     the floor change or the content change.
   - Verify: `git log` / PR diff for the floor-bump commit touches only the
     `cmake_minimum_required` line (and, if needed, the matching
     `CMK-VER-05` vendored-floor fix it exposed) — any other functional
     line is the finding.
   - Floor: any.
6. **CMK-TGT-15 · SHOULD.** Land the install/export step (6) as one
   coherent diff covering every `CMK-INST` MUST the round trip depends on
   for that package, rather than one commit per rule ID.
   - Rationale: `CMK-INST-02/-04/-05/-06` are jointly necessary for the
     round trip to mean anything; a partial landing (e.g., `NAMESPACE`
     added but `GNUInstallDirs` not yet) still fails the round trip and
     gives the reviewer no signal about which fix worked.
   - Verify: the round-trip script is run once, after all of that package's
     `CMK-INST` fixes land, not once per fix.
   - Floor: any.
7. **CMK-TGT-16 · MUST.** Never add `install(PACKAGE_INFO)` (step 9) in the
   same diff that first makes the Config round trip pass.
   - Rationale: CPS's own preconditions (`CMK-INST-15/-16/-17`) are only
     checkable once the Config package itself is stable; conflating the two
     diffs makes a CPS-only regression indistinguishable from a Config
     regression.
   - Verify: the commit/PR that adds `install(PACKAGE_INFO)` has a parent
     commit where the round trip already passed on 3.31.12.
   - Floor: 4.3, for the feature the rule gates.
8. **CMK-TGT-17 · SHOULD.** Gate developer-only machinery (step 5) before
   attempting the as-subproject smoke build (step 7), never after.
   - Rationale: the smoke build's exit check is exactly "no test/example
     target present"; running it before the gate exists always fails and
     teaches nothing.
   - Verify: the migration plan orders step 5's commit before step 7's.
   - Floor: 3.21 for `PROJECT_IS_TOP_LEVEL` itself; any for the shim.
9. **CMK-TGT-18 · MUST.** The skill's own inventory-step greps follow
   `CMK-CORE-05`: no early-exiting reader (`grep -q`, `head`) piped under
   `set -o pipefail`.
   - Rationale: this exact pattern zeroed cells and dropped a whole repo
     row in this program's own wave-1 measurement pass ([gate]
     CMK-CORE-05) — a self-inflicted false negative in the tool that is
     supposed to catch false negatives elsewhere.
   - Verify: `SCRIPT_DIR=skills/cmake-modernize; grep -rnE -e '[|] *grep( +-[a-zA-Z]+)* +-[a-zA-Z]*[qm]' -e '[|] *rg( +-[a-zA-Z]+)* +-[a-zA-Z]*[qm]' -e '[|] *head' "$SCRIPT_DIR"`.
     Empty output passes.
   - Floor: any (shell-level).

## Exemplar evidence

| Candidate / cited rule | Satisfies | Violates | Notes |
|---|---|---|---|
| CMK-TGT-01 (link keywords) | `ClickHouse__ClickHouse@0995a518a8:CMakeLists.txt:848` (0.8% bare in core) | `libuv__libuv@abe835d413:CMakeLists.txt:477,494,530,727,745,747,763` (9/9 bare); `duckdb__duckdb@d8a1bd4:CMakeLists.txt:1276,1316` (in the corpus's 23/30-bare population) | Both are the worked step lists' step 4. |
| CMK-TGT-03 (directory scope) | `Tencent__rapidjson@24b5e7a8b2` and `libuv__libuv@abe835d413` root files both have **no** `include_directories`/`add_definitions` hits — the flagging is unnecessary for these two | llvm-project cited in [gate] CMK-CORE-05 as the repo where the pattern is "everywhere" | Neither worked-step exemplar is actually a CMK-TGT-03 violator — the corpus concentration is elsewhere (map DECIDE item 3's "vendored subtrees" concern). |
| CMK-INST-02/-09 (relative Config destination, GNUInstallDirs) | `nlohmann__json@f422b753cc:CMakeLists.txt:78` | `Tencent__rapidjson@24b5e7a8b2:CMakeLists.txt:147-149,233` (measured non-relocatable on 4.4.2, [lib] §CMK-INST-02) | Confirmed directly in this dive: line 148 defines `LIB_INSTALL_DIR` from `${CMAKE_INSTALL_PREFIX}`, line 233 builds the Config destination from it. |
| CMK-INST-04 (ConfigVersion via `write_basic_package_version_file`) | 12 of 14 flagship libraries | `Tencent__rapidjson@24b5e7a8b2:RapidJSONConfigVersion.cmake.in:1-9` (hand-rolled, no `COMPATIBILITY` mode) | Confirmed directly: the file is 9 lines of hand-written string comparison. |
| CMK-INST-05 (`configure_package_config_file`, not bare `configure_file`) | `nlohmann__json`, `friendlyanon__cmake-init` (no path arithmetic) | `Tencent__rapidjson@24b5e7a8b2:RapidJSONConfig.cmake.in:1` (`@PACKAGE_INIT@` unresolved) + `CMakeLists.txt:229-230` (`CONFIGURE_FILE(...@ONLY)`) | Confirmed directly. |
| CMK-INST-06 (NAMESPACE) | 12 of 14 flagship libraries | `glfw__glfw@92dcf4ce74:CMakeLists.txt:119-121`; `Tencent__rapidjson@24b5e7a8b2:CMakeLists.txt:255` (`INSTALL(TARGETS RapidJSON EXPORT RapidJSON-targets)`, no `NAMESPACE`) | Confirmed directly. |
| CMK-INST-18 (round trip as its own CI step) | `curl__curl@98519dac83:tests/cmake/test.sh`; `jbeder__yaml-cpp@1e0876c671:.github/workflows/build.yml:91-103` | `libuv__libuv@abe835d413:.github/workflows/CI-sample.yml:1-30` (subproject only, never consumes an install); `friendlyanon__cmake-init@7e0c52fc73:.github/workflows/ci.yml:113-120` (installs, never consumes) | libuv is the worked step list's step 7/8 gap exactly. |
| PROJECT_IS_TOP_LEVEL adoption | `friendlyanon__cmake-init@7e0c52fc73:cmake-init/templates/c/shared/CMakeLists.txt` (examples gated, dev-mode warns); `gabime__spdlog@5b63780337:CMakeLists.txt:21-24` (pre-3.21 shim, the corpus's only non-template instance) | `libuv__libuv`, `Tencent__rapidjson`, `madler__zlib`, `curl__curl` roots — none reference it | 4 of 46 total corpus repos use it at all (measured this dive: `friendlyanon__cmake-init` 18 hits, `Kitware__CMake` 10, `cpp-best-practices__cmake_template` 5, `gabime__spdlog` 1). |
| CMK-DEP-07 (guarded fetch) | `protocolbuffers__protobuf@c64743979d:cmake/abseil-cpp.cmake:16-43` (try-find-then-fetch by hand, pre-3.24 pattern) | n/a in the two worked exemplars — neither libuv nor rapidjson fetches a dependency | Cited, not re-measured, per [seam] CMK-DEP-07. |
| `find_ocx` | n/a for CMK-TGT/CMK-INST — installs nothing, 0 compiled targets, vacuous for both families ([lib] Verdict #7) | — | The fleet's one CMake consumer has nothing this procedure would run on; it is a `Findocx.cmake` and a bootstrap module, not a library to modernize. |

## AI-agent angle

1. **Citing the CMake Tutorial by its pre-4.x step titles.** "Step 3: Adding
   a Library" and similarly-named pages 404 at `v4.4.2` — the tutorial was
   restructured into topic pages (`Getting Started with CMake`,
   `In-Depth CMake Target Commands`, `In-Depth CMake Library Concepts`, ...)
   ([tut-index]). *Check:* `curl -sfL -o /dev/null <constructed step-N URL>`
   against the exact tag before citing it; a 404 on the pinned tag is the
   failure mode, not a stale local cache.
2. **Reading "Esoteric/Footguns" in the current tutorial's target-command
   table as a blanket warning against `target_include_directories`.** The
   table's own text narrows this to *already-linked, in-tree* targets,
   where usage requirements already propagate through
   `target_link_libraries` — not to a library's own public-header
   declaration, which `friendlyanon__cmake-init`'s template and this
   procedure's own `CMK-INST-02` both still use `target_include_directories(...
   BUILD_INTERFACE ...)` for. *Check:* grep the surrounding paragraph, not
   just the table cell, before repeating a command's classification from
   this page.
3. **Auto-rewriting a legacy tree's directory-scope commands.** An agent
   trained to "fix" `include_directories` on sight will convert an entire
   tree in one pass, defeating both the reviewable-unit limit and
   `CMK-TGT-03`'s explicit refusal. *Check:* the diff touches only files
   named in a completed inventory step's list; anything else is a
   violation of `CMK-TGT-11`.
4. **Treating a green build+install as proof of consumability.** This is
   the single most common false-positive in agent-driven CMake work,
   because CMake itself gives no signal — the failure surfaces only in a
   separate consumer's configure. *Check:* `CMK-INST-01`'s round trip run
   as a distinct step; a "done" claim with no consumer-configure log
   attached is unverified.
5. **Inventing `CMAKE_CXX_STANDARD_EXTENSIONS`.** This program's own
   earlier wave grepped that non-existent name and reported "0/46
   adoption" as if it were evidence of non-adoption of a real switch — it
   is evidence only that the variable doesn't exist. *Check:*
   `cmake --help-variable NAME` against the pinned binary for every
   `CMAKE_`-prefixed variable an agent writes, before it ships.
6. **Writing a two-dot version range (`3.15..4.3`) and believing it
   pins a ceiling.** It silently collapses to `VERSION 3.15` with no
   diagnostic, even under the configure gate — an agent that tested "no
   error" as its success signal will ship this. *Check:* the exact
   three-dot literal, `grep -c '\.\.\.' ` on the `cmake_minimum_required`
   line.
7. **Reaching for Conan-1-era or vcpkg-classic-mode syntax while
   "modernizing."** Out of this dive's direct scope (owned by
   `cpp-packaging`/`CMK-CONAN`/`CMK-VCPKG`), but a real risk when an agent
   asked to "modernize the build" also touches manifest files: Conan 1's
   `conanbuildinfo.cmake`/`CONAN_BASIC_SETUP()` and vcpkg classic mode's
   bare `find_package` with no manifest are both retired shapes an
   LLM's training data still contains at high frequency. *Check:* neither
   token appears anywhere in the diff; if it does, stop and hand off to the
   package-manager-specific rules instead of proceeding.

## Contested / evolving

- **The CMake Tutorial's own restructuring (landed by 4.4.2, exact version
  it changed unmeasured by this dive — the 4.1 pages are explicitly marked
  "last appeared in CMake 4.1").** The house of the canonical beginner path
  moved from a numbered "Step 1..10" single track to topic pages with
  labeled difficulty tiers for target commands. Trending: toward more
  opinionated categorization (the footgun/advanced/common split) rather
  than a flat command reference — useful for humans, a citation trap for
  an agent that assumes stable page titles across CMake eras.
- **Whether `target_link_directories`/`target_include_directories` deserve
  "esoteric" framing at all.** Kitware's own current tutorial narrows this
  to redundant in-tree use; every consolidated `CMK-INST` rule in this
  program still treats `target_include_directories` as load-bearing for a
  library's own public interface. Not a real disagreement once the
  tutorial's own caveat is read in full — flagged here only because the
  bare table invites the wrong generalization (see AI-agent angle #2).
- **CPS adoption remains at 0 of 46 exemplars** as of this dive's
  measurement, unchanged from wave 2's count and the era-recheck's
  confirmation that no new `cps-org/cps` commits landed in the
  2026-09-05→09-26 window. Trending: Kitware's own stated direction is "in
  addition to" the Config package, permanently, per `CMK-INST-14`'s
  citation of the CPS verification dive's Verdict — this is a floor-gated
  SHOULD, not a MUST, and this dive found nothing to change that.
- **gersemi as a formatting gate.** SHOULD by explicit owner default
  (`CMK-CORE-04`, "owner default Q6"), not MUST, and 0 of 46 exemplars run
  it. Two point releases (0.29.0, 0.29.1) landed in the three weeks between
  wave 1 and this recheck with no floor-relevant change — the tool is
  active, not yet a corpus norm.

## Sources

| URL or measurement | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [gitlab.kitware.com Help/command/target_link_libraries.rst@v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/target_link_libraries.rst) | Normative CMake docs | v4.4.2, fetched 2026-09-26 | Confirms the keyword-vs-legacy-form split step 3 rests on. |
| [gitlab.kitware.com Help/variable/PROJECT_IS_TOP_LEVEL.rst@v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/variable/PROJECT_IS_TOP_LEVEL.rst) | Normative CMake docs | v4.4.2 (variable added 3.21), fetched 2026-09-26 | The exact wording and floor step 5 cites. |
| [gitlab.kitware.com Help/guide/tutorial/index.rst@v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/guide/tutorial/index.rst) | Normative CMake guide, tutorial table of contents | v4.4.2, fetched 2026-09-26 | Primary evidence the tutorial's page structure changed — grounds the AI-agent-angle #1 finding. |
| [gitlab.kitware.com Help/guide/tutorial/In-Depth CMake Target Commands.rst@v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/guide/tutorial/In-Depth%20CMake%20Target%20Commands.rst) | Normative CMake guide | v4.4.2, fetched 2026-09-26 | Source of the "Esoteric/Footguns" table and its narrowing caveat (§4, §Contested, AI-agent-angle #2). |
| [cmake.org Mastering CMake — Converting Existing Systems To CMake](https://cmake.org/cmake/help/book/mastering-cmake/chapter/Converting%20Existing%20Systems%20To%20CMake.html) | Normative/codified book chapter | current as served 2026-09-26 | Source of the "one CMakeLists per subsystem, choose a strategy and stick with it" ordering advice in §4. |
| [dev-cafe/cmake-cookbook chapter-15 README](https://raw.githubusercontent.com/dev-cafe/cmake-cookbook/master/chapter-15/README.md) | Primary raw source, practitioner book | fetched 2026-09-26 | Names the chapter's actual worked example (Vim, Autotools→CMake diff) — scopes what "porting a project" means in that text versus this narrower procedure. |
| [Effective Modern CMake (gist mbinna)](https://gist.githubusercontent.com/mbinna/c61dbb39bca0e4fb7d1f73b0d66a4fd1/raw/effective_modern_cmake.md) | Argued practitioner guidance | fetched 2026-09-26 | Direct source for "forget include_directories/link_directories/link_libraries... operate on the targets directly," quoted in §4. |
| Measurement: `libuv__libuv@abe835d413` root `CMakeLists.txt` (`git -C libuv__libuv show HEAD:CMakeLists.txt`) | Exemplar-corpus measurement | corpus snapshot dated for this program, re-verified sha 2026-09-26 | Grounds the entire worked step list in §13 — link-keyword count, flags, install/export state, all read directly. |
| Measurement: `Tencent__rapidjson@24b5e7a8b2` `CMakeLists.txt`, `RapidJSONConfig.cmake.in`, `RapidJSONConfigVersion.cmake.in` | Exemplar-corpus measurement | corpus snapshot, re-verified sha 2026-09-26 | Grounds §14's four independent CMK-INST findings with exact line numbers, read directly in this dive. |
| Measurement: `friendlyanon__cmake-init@7e0c52fc73:cmake-init/templates/c/shared/CMakeLists.txt` | Exemplar-corpus measurement | corpus snapshot, re-verified sha 2026-09-26 | The "end state" template — alias target, BUILD_INTERFACE includes, PROJECT_IS_TOP_LEVEL-gated examples and dev-mode, all in one file, read directly. |
| Measurement: `gabime__spdlog@5b63780337:CMakeLists.txt:21-24` | Exemplar-corpus measurement | corpus snapshot, re-verified sha 2026-09-26 | The corpus's only non-template `PROJECT_IS_TOP_LEVEL` pre-3.21 shim, read directly. |
| Measurement: `PROJECT_IS_TOP_LEVEL` corpus-wide occurrence count (`git -C <repo> show HEAD:<file> | grep -c PROJECT_IS_TOP_LEVEL` over every tracked `CMakeLists.txt`/`*.cmake` in all 46 repos) | Exemplar-corpus measurement, run this dive | 2026-09-26 | Produced the "4 of 46" adoption figure in the Summary and §7/§Exemplar evidence. |
| Measurement: `duckdb__duckdb@d8a1bd4` root `CMakeLists.txt` link-call spot check | Exemplar-corpus measurement, run this dive | corpus snapshot, re-verified sha 2026-09-26 | Confirms the sha behind the wave-2 "23 of 30 bare" figure this dive cites rather than re-derives. |
| [`.agents/research/cmake-consumable-library.md`](../cmake-consumable-library.md) | This program's own wave-2 consolidation, codified | 2026-09-26 | Source of `CMK-INST-01..20`, `CMK-TGT-01..09`, the round-trip script and the 13.3%/32.0% bare-link split this dive builds every step on. |
| [`.agents/research/cmake-versions-and-gate.md`](../cmake-versions-and-gate.md) | This program's own wave-2 consolidation, codified | 2026-09-26 | Source of the gate canary, `CMK-VER-01/-02/-05/-06`, `CMK-CORE-01/-02/-04/-05`. |
| [`.agents/research/cmake-module-authoring.md`](../cmake-module-authoring.md) | This program's own wave-2 consolidation, codified | 2026-09-26 | Source of `CMK-MOD-15/-16` (gersemi definitions, `PARSE_ARGV`). |
| [`.agents/research/cmake-dependency-seam.md`](../cmake-dependency-seam.md) | This program's own wave-2 consolidation, codified | 2026-09-26 | Source of `CMK-DEP-07/-08/-09/-10` and the resolution-order table step 9's guard rests on. |
| [`skills/bazel-adopt/SKILL.md`](../../../skills/bazel-adopt/SKILL.md) | This repository's own shipped skill, codified | dated 2026-09-06 in its own frontmatter | House shape for a once-per-repository adoption procedure: numbered steps, one exit check each, an explicit stop condition and a "what this deliberately leaves open" list, borrowed directly for §1 and §12. |
