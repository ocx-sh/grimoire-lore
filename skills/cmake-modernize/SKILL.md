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
The whole procedure was also run end to end on the real legacy C trees
`slembcke/Chipmunk2D` at commit `f2f3d662`, `uclouvain/openjpeg` at `8314119b`
and `madler/zlib` at `v1.3.1`, and on the C++ trees
`open-source-parsers/jsoncpp` at `3347a4b8` and `c42f/tinyformat` at `aef402d8`,
on 3.31.12 and 4.4.2 (2026-09-26).

Contents: [Stop condition](#stop-condition) · [Before you start](#before-you-start) ·
[The procedure](#the-procedure) · [Reviewable units](#reviewable-units) · [What it refuses](#what-it-refuses) ·
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

**Entry check.** The unmodified tree configures and builds today with the
options its documentation gives for a library-only build (for example
`-DBUILD_DEMOS=OFF`). Write those options into the plan file once. Every later
configure, the round trip (`CFG_ARGS`) and the smoke pass them. Run the entry
check ungated on the oldest CMake line CI runs (3.31 in a tree with no CI). A
floor below 3.5 stops every 4.x configure with
`Compatibility with CMake < 3.5 has been removed from CMake`: that is step 1's
to fix, not a stop, as long as the oldest line configures (c42f/tinyformat at
`aef402d8`, exit 0 on 3.31.12, exit 1 on 4.0.7 and 4.4.2). If the tree
does not configure even then, stop. A wrong copy of a dependency is
`cmake-dependency-triage`. An absent host dependency or compiler is the
owner's to install or switch off, not a triage.

Run `git status --short` after the entry configure. Empty output = pass. A
tracked file the configure changed is restored before every step's diff is
committed, or it rides along as a change no plan row names (madler/zlib at
`v1.3.1` renames its `zconf.h` in the source tree on every configure). A 4.4
gate error whose category step 6 owns (`install-absolute-destination`,
`CMK-INST-10`) is demoted on the 4.4 line alone until step 6, with
`-Werror=author -Wno-error=install-absolute-destination`, and recorded as a
step-6 row. On zlib that configure exits 0 with six warnings instead of six
errors, and the canary still exits 1 (4.4.2). Step 6's round trip runs without it.

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
| Command | The inventory command ID that printed it (`I1` to `I12`, `F1`, `F1b`) |
| Rule | The rule ID the hit violates |
| Step | The step that will touch it |
| Status | `open`, `converted`, `flagged-not-converted` (vendored, the owner declined, or a component the host cannot configure, with the missing prerequisite named) or `vacuous` |

## The procedure

Ten steps, in this order. Each names what it changes and the command whose
result decides "done". The full commands with their readings are in
[references/inventory.md](references/inventory.md) (steps 0 to 4) and
[references/proofs.md](references/proofs.md) (steps 5 to 9).

| Step | Do | Exit check | Cites |
|---|---|---|---|
| 0 Inventory | Run `I1` to `I12`, `F1` and `F1b` read-only. Write every hit into the plan file | The plan file lists every hit, possibly none. No command in the inventory pipes into an early-exiting reader | `CMK-TGT-01/-03/-04/-17`, `CMK-LANG-04/-11`, `CMK-VER-05`, `CMK-DEP-07/-15`, `CMK-CORE-05` |
| 1 Floor | Keep the existing minimum. Add `...<max>`, or raise an existing `...<max>` below it, where `<max>` is the newest CMake CI runs. Re-scan fetched and vendored trees | `F1` prints no line outside a vendored directory (a vendored hit is recorded `flagged-not-converted`), every `F1b` line is settled as step 1 below says, the canary exits 1, the project's gated configure exits 0 on each CI binary, and the configured-file check prints nothing | `CMK-VER-01/-02/-05`, `CMK-DEP-15/-30` |
| 2 Targets | Move directory scope onto `target_*`, one target at a time, leaves of the in-tree graph first. A `PUBLIC` or `INTERFACE` include directory under the source or build tree is written `$<BUILD_INTERFACE:...>` from the start, because `install(EXPORT)` rejects a raw source path at generate time. A definition that an installed header reads is `PUBLIC`, never `PRIVATE` (see below) | `I2`, scoped to that target's directory, is empty, the gated configure and build exit 0, and the flag-set diff for one source of that target is empty | `CMK-TGT-03` |
| 3 Keywords | Name `PUBLIC`, `PRIVATE` or `INTERFACE` on that target's links. Default to `PRIVATE` unless the type is in its installed headers. Add the namespaced `ALIAS`. A header-only library with no target gets `add_library(<pkg> INTERFACE)`, its `ALIAS` and a `$<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}>` include directory here, as a `new:` plan row, so step 6 carries no `CMK-TGT` change | `I1` on that file shows only keyworded calls, and the gated build exits 0 with every option that adds an in-tree dependent of the target switched on, tests included | `CMK-TGT-01/-02` |
| 4 Flags and standards | Overwrites and appends become `target_compile_options`, a toolchain file or a preset. A `-std=` flag becomes the target property `<LANG>_STANDARD NN` (with `<LANG>_EXTENSIONS ON` for a `gnu` spelling) plus `target_compile_features(<t> PUBLIC <lang>_std_NN)` for consumers. The compile feature alone is a floor: when the compiler's default is newer, CMake adds no flag. Fix the parses `I4` listed | `I3` shows no overwrite, `I11` hits sit in a `NOT DEFINED` guard, every `I12` hit sits in a developer option that defaults `OFF`, every new `CMAKE_*` name passes the variable check, and the flag-set diff for one source per converted target is empty | `CMK-TGT-04..09`, `CMK-LANG-04/-11` |
| 5 Top-level gating | Gate the test tree on a project-prefixed option that defaults to `PROJECT_IS_TOP_LEVEL`, or `OFF` where the legacy option defaulted `OFF`, with `include(CTest)` inside the gate (`CMK-TEST-09`). Gate examples, demos and developer options on project-prefixed options (`<PROJECT>_BUILD_EXAMPLES`) that default to `PROJECT_IS_TOP_LEVEL`. An unprefixed name such as `BUILD_DEMOS` reads the parent's own entry of that name. Guard the `CMAKE_BUILD_TYPE` default and any non-test fetch on `PROJECT_IS_TOP_LEVEL`. A library whose `option(BUILD_SHARED_LIBS ...)` defaults `ON` first sets it as a normal variable under `if(NOT PROJECT_IS_TOP_LEVEL AND NOT DEFINED BUILD_SHARED_LIBS)`, or the option creates the parent's cache entry and every later `add_library()` of the parent turns `SHARED` | The step 7 smoke, run here too, the top-level gated build with the plan options, the old `-D` spelling of each renamed option, and the `CMK-DEP-07` probe when `I7` listed a hit | `CMK-DEP-07`, `CMK-TGT-11/-17`, `CMK-TEST-09` |
| 6 Install and export | `GNUInstallDirs` destinations, `configure_package_config_file`, `find_dependency` per public dependency, `write_basic_package_version_file`, `NAMESPACE`, all in one diff | The gated round trip exits 0 on every CI line, and its leak greps are empty. A tree that ships a `.pc` also passes the pkg-config check | `CMK-INST-01..06/-09` |
| 7 As-subproject smoke | Configure the tree under a parent that includes `CTest`, then under a parent that also owns each unprefixed option the library declares | Every pass configures with exit 0. The tests grep prints `Total Tests: 0`, the `asub_bsl=[ON]` grep and the target grep are empty for every developer-only name, the second pass's target grep is empty, and the third pass, a compiled consumer through `add_subdirectory`, builds with exit 0 | `CMK-DEP-07`, `CMK-TGT-11`, `CMK-TEST-09` |
| 8 CI | Wire the gate per leg, `gersemi --check` (never `--diff`), and the round trip as its own job. In a tree with no CI, report the three items to the owner and stop. Do not create a CI system. A first `gersemi` reformat ships as its own diff, never inside a conversion diff. A leg that takes CMake from the runner image has no binary to run the canary through here: spell its gate `-Werror=dev`, record the unpinned CMake as a `CMK-VER-03` finding and the canary run as the owner's | The canary exits 1 through each leg's own binary and preset. `gersemi --check` exits 0 | `CMK-CORE-01/-02/-04/-05`, `CMK-MOD-15`, `CMK-INST-18` |
| 9 CPS and pkg-config (optional) | `install(PACKAGE_INFO)` behind `if(CMAKE_VERSION VERSION_GREATER_EQUAL 4.3)`, once the namespace equals the package name, the schema is `simple` and the genexes are configuration-only | The round trip on 4.3 or later ends in `/cps/<pkg>`, on 3.31 in `/cmake/<pkg>`, and both exit 0 | `CMK-INST-12..17` |

### Step 1 in detail

The floor diff touches only `cmake_minimum_required` lines, plus any vendored
floor fix the re-scan exposes. It never rides with a content change, because a
gate failure after a combined diff cannot be bisected. A file `configure_file()`
writes that changes under the new range (the configured-file check in
[references/inventory.md](references/inventory.md#the-configured-file-check))
is repaired in a second diff before step 2, never by lowering `<max>`. A `cmake_minimum_required`
below the top-level `project()` moves above it in the same diff: in place, the
gated configure fails with
`cmake_minimum_required() should be called prior to this top-level project()`
(tinyformat, 3.31.12, 4.0.7 and 4.4.2).

```sh
# F1: every own-code floor carries a three-dot max. Empty output = pass.
# Lists a bare floor (3.10, 3.10 FATAL_ERROR, upper case, a space before the paren)
# and a two-dot 3.15..4.3. A floor split across lines or spelled through a variable is not seen: F1b lists those.
grep -rniE --include='CMakeLists.txt' --exclude-dir='_deps' --exclude-dir='build*' \
  -e 'cmake_minimum_required[[:space:]]*\([[:space:]]*VERSION[[:space:]]+[0-9]+(\.[0-9]+)*[[:space:]]*(FATAL_ERROR)?[[:space:]]*\)' \
  -e 'cmake_minimum_required[[:space:]]*\([[:space:]]*VERSION[[:space:]]+[0-9]+(\.[0-9]+)*\.\.[0-9]' .
# F1b: floors through a variable, own-code policy pins, and every existing range. A list to read, never a pass.
grep -rniE --include='CMakeLists.txt' --include='*.cmake' --exclude-dir='_deps' --exclude-dir='build*' \
  -e 'cmake_minimum_required[[:space:]]*\([[:space:]]*VERSION[[:space:]]+[$]' \
  -e 'cmake_policy[[:space:]]*\([[:space:]]*VERSION' \
  -e 'cmake_minimum_required[[:space:]]*\([[:space:]]*VERSION[[:space:]]+[0-9.]+\.\.\.[0-9]' .
```

Empty `F1b` output = nothing more to check. An existing range whose max is
below the plan's `<max>` gets the plan's `<max>`: `F1` never lists
openjpeg's `3.10...3.31.5` or zlib's `2.4.4...3.15.0`. A floor through a variable gets its
`...<max>` like any other. An own-code `cmake_policy(VERSION <v>)` after the
floor resets the policy version that `...<max>` set, so the floor diff gives it
the same `...<max>`, or raises the variable that caps it. Confirm by printing
one policy newer than the kept minimum from a `-DCMAKE_PROJECT_INCLUDE` probe
file holding `cmake_policy(GET CMP0083 _v)` and `message(STATUS "CMP0083=${_v}")`:
it reads `NEW` after the diff, and empty means the pin still wins.

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

A compile definition takes its keyword from its readers, not from step 3's
`PRIVATE` default. List the readers in the installed include directory:

```sh
# NAME = the definition, the operand = the directory the library installs headers from, when it
# holds only installed headers. Otherwise name each installed header file, generated ones from the build tree.
NAME=JSONCPP_USE_SECURE_MEMORY
grep -rn -e "$NAME" include
```

Empty output = `PRIVATE`. Any line = `PUBLIC`, or a configured header that
bakes the value in, with one exception: a header that only asks whether the
consumer wants an API (zlib's `zlib.h` reading `_LARGEFILE64_SOURCE`) is no
reader, and `PUBLIC` there puts `-D_LARGEFILE64_SOURCE=1` on every installed
consumer (both lines). openjpeg installs `openjpeg.h` from
`src/lib/openjp2`, which also holds every source, so a grep of that directory
reads all three of its private definitions as `PUBLIC`. Then configure, build and test once more with each option
that adds such a definition switched on: the plan options alone never set it.
On open-source-parsers/jsoncpp at `3347a4b8`, the `PRIVATE` form passed every
step 2 check and failed with `undefined symbol: Json::Value::operator[]` under
`-DJSONCPP_USE_SECURE_MEMORY=ON` (3.31.12 and 4.4.2), and `PUBLIC` built with exit 0.

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

Keep the value the legacy tree defaulted to, for the build type and for every
option. `RelWithDebInfo` is for a tree that had none. The smoke compares no
flags, so re-run the flag-set check after this edit: the verbatim snippet turned
jsoncpp's `-O3` into `-O2 -g` (4.4.2).

A renamed option takes its old spelling as its default at top level only, and
is declared before the first `add_subdirectory` that reads it:

```cmake
if(PROJECT_IS_TOP_LEVEL AND DEFINED BUILD_TESTING)
    set(_opj_testing_default ${BUILD_TESTING})
else()
    set(_opj_testing_default OFF)
endif()
option(OPENJPEG_BUILD_TESTING "Build the tests" ${_opj_testing_default})
```

It reads `OFF` at top level, `ON` with `-DBUILD_TESTING=ON`, and `OFF` under a
parent that includes `CTest` (3.31.12 and 4.4.2). A plain rename drops `-DBUILD_TESTING=ON` with only a "not used" warning, and
openjpeg's CI script seeds that cache entry, so it would run 0 tests green
(both lines). A file that still reads an old name, vendored glue included, gets
it back as a directory-scoped normal variable set from the new option before
the `add_subdirectory` that reads it. A toggle declared as
`set(<name> ... CACHE BOOL ...)` is an option for this step too. A library's
cache write of a variable CMake reads (`EXECUTABLE_OUTPUT_PATH`,
`LIBRARY_OUTPUT_PATH`, `CMAKE_<KIND>_OUTPUT_DIRECTORY`) moves under
`PROJECT_IS_TOP_LEVEL`, or every executable the parent adds later lands in
`lib-build/bin/` (openjpeg, both lines).

### Step 6: one coherent diff

The four `CMK-INST` MUSTs the round trip depends on (`-02`, `-04`, `-05`, `-06`,
plus `-03` for each public dependency and `-09` for the destinations) land
together, with no `CMK-TGT` change riding along except the
`$<BUILD_INTERFACE:>` and `INCLUDES DESTINATION` form of an include directory
that the round trip rejects. Add a `new:` plan row for each file the step
creates (the Config template) before the diff. None of them alone produces a
consumable package, so the round trip runs once, after all of them. A green
`cmake --install` is not the exit: a missing `find_dependency` stays green until
a compiled consumer's Generate step (`CMK-INST-01`). The script is in
[references/proofs.md](references/proofs.md#the-gated-round-trip).

When the tree already exports targets without a namespace, adding `NAMESPACE`
renames every imported target consumers link today. Ship the old names in the
Config package as an `ALIAS` of each namespaced imported target, each under
`if(NOT TARGET <old>)` (a consumer on CMake 3.18 or later, the version that
allows it). Without the guard, a second `find_package` in one directory fails
with `add_library cannot create ALIAS target` (openjpeg, both lines). Keep every
name a hand-written targets file defined. Run the round trip once per old
spelling as well as the new one. Dropping an old name instead is the owner's
call, written into the plan file as a changelog item. On jsoncpp the `NAMESPACE` edit alone passed for
`jsoncpp::jsoncpp_static`, failed `JsonCpp::JsonCpp` at generate, and turned a
bare `jsoncpp_static` into a `-l` flag (`'json/json.h' file not found`), while
the tree's own `abi-compatibility.yml` links `JsonCpp::JsonCpp` (3.31.12 and
4.4.2). With the old names shipped, all five spellings exit 0.

A package whose name CMake ships a Find module for (`ZLIB`, `PNG`, `CURL`) is
consumed today through that module's imported target and result variables. The
Config package defines them too (`ZLIB::ZLIB`, `ZLIB_INCLUDE_DIRS`,
`ZLIB_LIBRARIES`), and the round trip runs once more on the module's target
name. On madler/zlib at `v1.3.1` the round trip passed without them, plain
`find_package(ZLIB)` never read the Config, and a consumer with
`-DCMAKE_FIND_PACKAGE_PREFER_CONFIG=ON` failed at configure on `ZLIB::ZLIB`
and at compile on the variables (both lines).

A hand-written `.pc` template reads the variables step 6 replaces. zlib's
`zlib.pc.cmakein` reads `@INSTALL_LIB_DIR@`, so after the switch to
`CMAKE_INSTALL_*` pkg-config printed `-I -L -lz` with exit 0 while the round
trip passed (both lines). Run the pkg-config check in
[references/proofs.md](references/proofs.md#the-pkg-config-check). An install
knob the tree documents (`-DINSTALL_LIB_DIR`) keeps working, or goes into the
plan file as a changelog item: after the switch it is dropped with only a
"not used" warning.

`write_basic_package_version_file` without `VERSION` reads `PROJECT_VERSION`,
and a `project()` without one stops the configure with `No VERSION specified`
(tinyformat, 3.31.12 and 4.4.2). A version the tree already states (zlib's
`set(VERSION "1.3.1")`) is passed as `VERSION ${VERSION}`. Only a tree that
states none goes to the owner. Record the answer in the plan file, and never
derive a version from a git tag on your own.

What step 8's CI carries, item by item, is in
[references/proofs.md](references/proofs.md#ci-checks). The `I4` parse
migration and its flatten line are in
[references/inventory.md](references/inventory.md#migrating-a-parse).

## Reviewable units

Each of these ships as its own diff:

- The floor change, alone, then any configured-file repair it needs.
- Each target's conversion (steps 2 to 4). Independent leaves may share one.
- The first install and export (step 6), with no `CMK-TGT` change in it.
- CPS or pkg-config, only after the round trip is already green without it.
- The first `gersemi` reformat, alone, with no content change.

A diff that touches a file no plan-file row names is out of scope. Steps 5 and
6 add `new:` rows for the structure and files they create. Vendored and
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
| `<max>` | The newest CMake CI runs, never the newest release. A tree with no CI, or whose CI takes CMake from the runner image without pinning a version (a `CMK-VER-03` finding), takes the program's pinned newest line (4.4) and records it in the plan file |
| CI lines | The CMake lines CI pins. A tree with no CI, or with an unpinned runner-image CMake, takes 3.31 and 4.4 for every "each CI line" check, and step 8 is reported to the owner, not created |
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
   `CACHE` set there does nothing. Copying its `RelWithDebInfo` over a tree
   that defaulted to `Release` silently swaps `-O3` for `-O2 -g`.
7. **Swapping `${ARGN}` for `PARSE_ARGV` mechanically**, which silently changes
   every caller that passes a quoted list.
8. **Running the as-subproject check from a parent without `include(CTest)`.**
   `BUILD_TESTING` then stays off and a leaked test tree reads clean.
9. **Citing the CMake Tutorial by its old step titles.** At v4.4.2 it is
    organised as topic pages. Fetch the page at the pinned tag first.
10. **Replacing `-std=gnu99` with `target_compile_features(<t> PUBLIC c_std_99)`
    alone.** The feature is a floor. gcc 15.2.1 defaults to C 23, so CMake adds
    no `-std` and the library silently compiles as gnu23 while every other step 4
    check passes (Chipmunk2D, 3.31.12 and 4.4.2). The flag-set diff shows the
    lost `-std=gnu99`. The same holds for `cxx_std_NN` below a newer default.
11. **Writing a raw `${PROJECT_SOURCE_DIR}/include` into a `PUBLIC` include
    directory in step 2.** Steps 2 to 5 pass, then step 6's generate fails with
    `INTERFACE_INCLUDE_DIRECTORIES property contains path` (both lines).
12. **Trusting the round trip's consumer to catch a static library's missing
    link dependency.** An empty `main` pulls no archive member. Chipmunk2D's
    static target never linked `m`, passed with an empty `main` and failed with
    ``undefined reference to `sincos'`` once `main` called `cpBodyNew` (both
    lines). `SYM_CALL` exists for this.
13. **Gating demos on an unprefixed `option(BUILD_DEMOS ... ${PROJECT_IS_TOP_LEVEL})`.**
    A parent that owns `BUILD_DEMOS=ON` switches the library's demos on too,
    and the parent's configure fails on the demos' dependencies (Chipmunk2D:
    `Could NOT find OpenGL`, both lines). The plain smoke passes, so run its
    second pass. A `CACHE BOOL` toggle is an option too (openjpeg's `WITH_ASTYLE`).
14. **Adding `...<max>` to a floor spelled through a variable, then stopping.**
    `F1` never lists `cmake_minimum_required(VERSION ${VAR})`, and a later
    own-code `cmake_policy(VERSION 3.13.2)` resets what the range set. On
    jsoncpp every step 1 check passed while CMP0083 to CMP0177 stayed unset
    (3.31.12 and 4.4.2). Run `F1b` and the policy probe.
15. **Moving a definition that an installed header reads onto the target as
    `PRIVATE`.** Every step 2 check passes under the plan options. The option
    that sets it breaks the link (jsoncpp, `JSONCPP_USE_SECURE_MEMORY`, both
    lines). Grep the installed headers for the name first.
16. **Keeping a library's `option(BUILD_SHARED_LIBS ... ON)` as found.** Under
    a parent that never set it, the option creates the parent's cache entry,
    and the parent's later libraries build as `SHARED_LIBRARY` while every
    smoke target grep stays empty (jsoncpp, both lines). The `asub_bsl` grep
    shows it. A cached `EXECUTABLE_OUTPUT_PATH` sends the parent's later
    executables into `lib-build/bin/` the same way (openjpeg, both lines).
17. **Adding `NAMESPACE` to an existing export and trusting the round trip on
    the new name.** Every name consumers already link breaks, one at generate
    and one at compile (jsoncpp, both lines). An old-name `ALIAS` without its
    `NOT TARGET` guard fails a second `find_package` (openjpeg, both lines).
18. **Keeping a tree's `${CMAKE_SOURCE_DIR}` in a usage requirement.** It is the
    parent's source root under `add_subdirectory`. The round trip reads only
    `INSTALL_INTERFACE` and the smoke's first two passes compile nothing, so
    they pass, and the third pass fails with `'tinyformat.h' file not found`
    (tinyformat, both lines). Write `CMAKE_CURRENT_SOURCE_DIR` or
    `PROJECT_SOURCE_DIR`, and the same for `CMAKE_BINARY_DIR` in generated
    files.
19. **Reading an empty `F1` as done when the floor is a range with an old max.**
    openjpeg's `3.10...3.31.5` and zlib's `2.4.4...3.15.0` print nothing, and
    every policy after the old max stays unset. `F1b` lists every range.
20. **Trusting step 1's checks after raising `<max>`.** On 4.4.2, CMP0219 stopped
    re-escaping `macro()` arguments and openjpeg's `.pc` macro wrote
    `libdir=\/lib64`, while the canary, the gated configure and the policy probe
    passed. The configured-file check shows it.
21. **Reading the flag-set union of two targets that compile one source.**
    `openjp2_static` lost `-DMUTEX_pthread` and the union diff exited 0 (both
    lines). Filter each run on `TGT`.
22. **Grepping a header directory that also holds sources, or making a consumer
    opt-in macro `PUBLIC`.** openjpeg's three private definitions read `PUBLIC`,
    and zlib's `_LARGEFILE64_SOURCE` landed on every installed consumer.
23. **Closing step 3 on `I1` alone.** The `PRIVATE` default took `m` from
    openjpeg's in-tree `compare_images`, which failed with
    `DSO missing from command line` under `-DBUILD_TESTING=ON` (4.4.2).
24. **Renaming or re-defaulting an option without its legacy behaviour.** A
    plain rename dropped `-DBUILD_TESTING=ON`, CI's seeded entry included, with
    exit 0 and 0 tests. A test gate that defaulted `OFF` came on at top level and
    failed the default build on a host without libtiff (openjpeg, both lines).
    zlib's documented `-DINSTALL_LIB_DIR` was ignored after step 6.
25. **Shipping a Config package under a Find-module name with only new targets.**
    zlib's round trip passed, and a `CMAKE_FIND_PACKAGE_PREFER_CONFIG` consumer
    lost `ZLIB::ZLIB` and FindZLIB's variables (both lines).
26. **Leaving a hand-written `.pc` template on the variables step 6 replaced.**
    zlib's `.pc` shipped empty `libdir` and `includedir`, and pkg-config printed
    `-I -L -lz` with exit 0 while the round trip passed (both lines).

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
| 13 | A compile definition that an installed header reads is `PUBLIC` on the library target, or baked into a configured installed header, never `PRIVATE` or directory-scoped (the MUST half) | CMK-TGT-03 |
| 14 | In a library, never write `BUILD_SHARED_LIBS` with a `FORCE` outside `if(NOT DEFINED BUILD_SHARED_LIBS)`, and never let a non-top-level `option(BUILD_SHARED_LIBS … ON)` create the parent's cache entry (the MUST half) | CMK-TGT-11 |
| 15 | A library others consume never builds its usage requirements on `CMAKE_SOURCE_DIR` or `CMAKE_BINARY_DIR` (the MUST half) | CMK-TGT-21 |
| 16 | Give every export a `NAMESPACE`. Adding one to an export that shipped without it keeps every old exported name as an `ALIAS` in the Config package, each under `if(NOT TARGET <old>)`, or ships a changelog entry naming the rename | CMK-INST-06 |

## References

Read one level down, on demand. These files do not link each other.

| File | Read it when |
|---|---|
| [references/inventory.md](references/inventory.md) | Running step 0, or re-running an inventory command as the exit check of steps 1 to 4. Holds `I1` to `I12` with the reading of each, the parse migration, the flag-set, configured-file and variable-existence checks |
| [references/proofs.md](references/proofs.md) | Running steps 5 to 9. Holds the gate canary, the gated round trip, the pkg-config check, the as-subproject smoke, the `CMK-DEP-07` offline probe, the CI greps and the CPS checks |

Re-check on each tool bump: the gate spelling split and preset `warnings`
behaviour (CMake minor releases after 4.4.2), `gersemi --diff` exit code
(gersemi after 0.29.1), and the `/cps/<pkg>` round-trip ending (CMake after
4.4.2), all as of 2026-09-26.
