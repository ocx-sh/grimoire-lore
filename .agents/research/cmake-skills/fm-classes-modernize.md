---
title: "Wave 7: cmake-modernize failure modes grouped into classes"
date: 2026-09-26
model: opus
skill: skills/cmake-modernize (SKILL.md 493 lines, 26 failure modes, as of wave 6 handbacks applied)
sources:
  - .agents/research/cmake-skills/wave4-real-tree.md (Chipmunk2D rows M0 to M13, cJSON triage rows T1-a to T3-b)
  - .agents/research/cmake-skills/wave5-modernize-real.md (jsoncpp J0 to J12, tinyformat T0 to T12)
  - .agents/research/cmake-skills/wave5-triage-pm.md (vcpkg and Conan triage rows, read for cross-mechanisms)
  - .agents/research/cmake-skills/wave6-modernize-real.md (openjpeg O0 to O23, zlib Z0 to Z15)
  - .agents/research/cmake-skills/wave6-triage-real.md (bundled fmt, CPM, cross-build triage rows, read for cross-mechanisms)
  - .agents/research/cmake-skills/modernize-procedure.md "AI-agent angle" and verification-wave3.md (origin of failure modes 1 to 9)
scratch: /home/mherwig/.cache/cmake-measure-scratch/w7/modernize-fm/ (old/ holds the pre-wave-7 skill, run.sh re-runs the two moved commands, spancheck.py lists dropped inline code)
---

# cmake-modernize failure modes grouped into classes

Waves 4, 5 and 6 added 10, 14 and 17 candidate failure modes from real trees,
and the skill listed 26 of them one by one. Most are instances of a few
mechanisms, so a count of new instances never reaches zero. This file groups
every listed failure mode, and every misled, stalled or wrong step the three
modernize ledgers record, into nine classes. Each class names one mechanism,
general enough to recur on a tree nobody has tried, and the one check in the
skill that catches it. Two classes (C8, C9) have no numbered failure mode: the
applier fixed their instances as procedure text, and they recur as stalls.

Ledger row IDs: `M` wave 4 Chipmunk2D, `J` wave 5 jsoncpp, `T` wave 5
tinyformat, `O` wave 6 openjpeg, `Z` wave 6 zlib, and the wave 7 held-out trees
`A` cmark and `B` libssh2 (wave7-holdout-modernize.md, verdict `check defect` =
category (ii), `caught` = (i)). Verdicts are the ledger's.
Rows with verdict `worked` are listed only where they confirmed a class check
on a new tree or first exposed an instance.

The triage ledgers (wave 4 `T1` to `T3`, wave 5 triage, wave 6 triage) fed
`cmake-dependency-triage`, not this skill. Their rows are classed with that
skill. One row shares a mechanism with a modernize class and is listed as a
cross-reference under C9.

## C1 The proof's consumer is weaker than a real one

**Mechanism.** A check that builds only the tree, links no consumer, calls no
symbol, or reads one interface (the build tree, or `INSTALL_INTERFACE`) passes
a package that a compiled consumer on another channel rejects.

**Check in the skill.** The round trip (step 6) and the smoke's third pass
(step 7) compile and link a consumer that calls one exported function per
target (`SYM_DECL`, `SYM_CALL`), through the moved install and through
`add_subdirectory`. Step 2 writes `$<BUILD_INTERFACE:...>` from the start.

| Instance | Ledger | Verdict | What happened |
|---|---|---|---|
| FM1 green build and install called consumable | modernize-procedure.md AI-agent angle 4, verification-wave3 row 57 | (drafting) | A missing `find_dependency` stays green for a `LANGUAGES NONE` consumer |
| M4, FM11 raw source path in a `PUBLIC` include directory | wave4 | misled | Steps 2 to 5 pass, step 6 generate fails, `INTERFACE_INCLUDE_DIRECTORIES property contains path` |
| M11, FM12 empty `main` misses a static link gap | wave4 | wrong | Round trip exit 0, a calling consumer fails ``undefined reference to `sincos'`` |
| O17 | wave6 | worked | `SYM_CALL` caught `openjp2_static` with `undefined reference to lrintf` |
| T11b, FM18 `CMAKE_SOURCE_DIR` in a usage requirement | wave5 | wrong | Round trip and smoke pass, compiled `add_subdirectory` consumer fails `'tinyformat.h' file not found` |
| A9 one round trip over a shared and a static target | wave7 | check defect | `libcmark.a` supplies nothing beside `libcmark.so`. Fixed: the round trip runs once per target |
| A13 | wave7 | caught | Smoke pass 3 compiled a consumer on both trees |

## C2 A default crosses the boundary with an outer layer

**Mechanism.** The tree shares one cache and one set of top-level variables
with its outer layers: a parent under `add_subdirectory`, a toolchain, a
package-manager profile, the user's `-D`. A write that creates or overrides
their entry, or an unprefixed read of a name they also set, changes their
build while every top-level check passes.

**Check in the skill.** `NOT DEFINED` and `PROJECT_IS_TOP_LEVEL` guards (`I11`,
step 5), project prefixes on every toggle, and the smoke's passes 1 and 2
under a parent that includes `CTest`, owns each unprefixed name the option
lister prints, and prints its own `BUILD_SHARED_LIBS` (`asub_bsl`).

| Instance | Ledger | Verdict | What happened |
|---|---|---|---|
| FM5 `CMAKE_CXX_STANDARD` guarded by `PROJECT_IS_TOP_LEVEL` alone | drafting, CMK-TGT-05..07 | (drafting) | The top-level `set()` overrides a Conan profile's standard |
| FM8 smoke parent without `include(CTest)` | verification-wave3 rows 36, 37 | (drafting) | `BUILD_TESTING` stays off and a leaked test tree reads clean |
| M12, FM13 unprefixed `BUILD_DEMOS` | wave4 | wrong | Parent owning `BUILD_DEMOS=ON` fails `Could NOT find OpenGL` |
| T7 | wave5 | worked | Pass 2 caught unprefixed `COMPILE_SPEED_TEST` |
| O15 `CACHE BOOL` toggle missing from the option list | wave6 | misled | Parent owning `WITH_ASTYLE=ON` fails `No CMAKE_CXX_COMPILER could be found` |
| O14 | wave6 | worked | Pass 2 caught options declared after the `add_subdirectory` that reads them |
| J8c, FM16 library `option(BUILD_SHARED_LIBS ... ON)` | wave5 | wrong | Parent's later library `SHARED_LIBRARY`, every smoke grep empty |
| O11 | wave6 | worked (exposed an instance) | Cached `EXECUTABLE_OUTPUT_PATH` builds the parent's later executable in `lib-build/bin/` |
| A6 unguarded `CMAKE_C_STANDARD` | wave7 | check defect | `-DCMAKE_C_STANDARD=11` ignored, exit 0. Fixed: `I11` lists C setters |
| B6 cache `STRING` split across lines | wave7 | check defect | Parent owning `CRYPTO_BACKEND=mbedTLS` fails. Fixed: the option lister matches every cache type |
| B9 installed Config prepends `CMAKE_MODULE_PATH` | wave7 | check defect | Consumer's own `FindWolfSSL` shadowed, exit 0. Fixed: the round trip's `CMAKE_MODULE_PATH` guard |
| B10 library `include(CPack)` | wave7 | check defect | Parent's `CPackConfig.cmake` version rewritten, exit 0. Fixed: the smoke's state diff of cache and build root |
| A11, B12, B13 | wave7 | caught | `I6`, smoke pass 2 and `asub_bsl` on the held-out trees |

## C3 An edit changes the output while presence checks pass

**Mechanism.** An inventory grep proves the old command is gone, and a green
build proves the tree compiles. Neither sees a lost flag, a compile feature
below the compiler's default, a build-type swap, or a policy that rewrites a
configured file.

**Check in the skill.** The per-target flag-set diff (steps 2, 4 and 5, and
after any diff that can change flags) and the configured-file diff (step 1),
both against the step-1 commit, with `realpath` for two `-I` spellings. Wave 7
widened it: one flag-set run per configuration the tree names, the link line
where a diff moves a linker flag, and a test-name diff beside the configured
files.

| Instance | Ledger | Verdict | What happened |
|---|---|---|---|
| M5 deleted `include_directories` passes `I2` | wave4 | wrong | `I2` empty, configure 0, build fails on a missing header |
| M7, FM10 `c_std_99` alone | wave4 | misled | gcc 15.2.1 defaults to C 23, no `-std` emitted, every check green |
| J8b, FM6 verbatim `RelWithDebInfo` | wave5 | misled | `-O3` becomes `-O2 -g`, the smoke compares no flags |
| J5 two `-I` spellings of one directory | wave5 | misled | A false loss, `realpath` resolves both to one path |
| O3, FM20 CMP0219 after raising `<max>` | wave6 | wrong | `libopenjp2.pc` reads `libdir=\/lib64` on 4.4.2, every step 1 check passes |
| O7, FM21 flag-set union over two targets | wave6 | misled | `openjp2_static` loses `-DMUTEX_pthread`, the union diff exits 0 |
| A2 CMP0148 after raising `<max>` | wave7 | check defect | `FindPythonInterp` finds nothing, 9 tests become 2, every step 1 check passes (`CMK-DEP-19`). Fixed: test-name diff and `I13` |
| A4 one configuration | wave7 | check defect | Dropped Debug-only `-DCMARK_DEBUG_NODES` passes the Release diff |
| A5 compile flags only | wave7 | check defect | Dropped Asan link option passes the flag-set diff, the link fails |
| B17 | wave7 | caught | Policy probe (C4) and per-target flag-set diff held on both trees |

## C4 The policy version CMake applies is not the one written

**Mechanism.** A range the checks read as done leaves newer policies unset: two
dots, a floor through a variable, a later own-code `cmake_policy(VERSION)`, or
a three-dot range whose max is older than the CI line.

**Check in the skill.** `F1b` lists every such line, and the policy probe
(`cmake_policy(GET CMP0083 _v)` from a `-DCMAKE_PROJECT_INCLUDE` file) reads
`NEW`, now part of step 1's exit check whatever `F1` prints.

| Instance | Ledger | Verdict | What happened |
|---|---|---|---|
| FM2 two-dot range | modernize-procedure.md AI-agent angle 6 | (drafting) | `3.15..4.3` collapses to `VERSION 3.15` with no diagnostic |
| J1b, FM14 floor through a variable | wave5 | wrong | `F1` exit 1 (empty) on `VERSION ${JSONCPP_OLDEST_VALIDATED_POLICIES_VERSION}` |
| J3, FM14 own-code `cmake_policy(VERSION 3.13.2)` | wave5 | wrong | Probe prints `CMP0083=` to `CMP0177=` unset after `...4.4` |
| O2, FM19 `3.10...3.31.5` | wave6 | misled | `F1` never prints it, 4.4.2 gate fails `Policy CMP0219 is not set` |
| Z3, FM19 `2.4.4...3.15.0` | wave6 | misled | `F1` and the old `F1b` empty, policies after 3.15 unset |
| T3 | wave5 | worked | Floor below `project()` caught by the gated configure, moved above it |

## C5 Visibility comes from a default instead of the readers

**Mechanism.** A keyword decided by the `PRIVATE` default, or by a reader grep
over a directory that also holds sources, is wrong, and the plan options never
build the reader it breaks.

**Check in the skill.** The reader grep over installed header files only, with
the consumer opt-in exception (steps 2 to 4), step 3's build with every option
that adds an in-tree dependent, and a build and round trip with each option
that adds a definition.

| Instance | Ledger | Verdict | What happened |
|---|---|---|---|
| J4, FM15 header-read definition moved `PRIVATE` | wave5 | misled | `-DJSONCPP_USE_SECURE_MEMORY=ON` fails `undefined symbol: Json::Value::operator[]` |
| J10 | wave5 | worked | Round trip with the option in `CFG_ARGS` fails upstream's directory scope, passes `PUBLIC` |
| O5, FM22 reader grep over a mixed directory | wave6 | misled | Three private openjpeg definitions read `PUBLIC` |
| Z5, FM22 consumer opt-in macro | wave6 | misled | `PUBLIC` puts `-D_LARGEFILE64_SOURCE=1` on every installed consumer |
| O9, FM23 step 3 closed on `I1` alone | wave6 | misled | `compare_images` fails `DSO missing from command line` under `-DBUILD_TESTING=ON` |
| A8 definition set as a target property | wave7 | check defect | `COMPILE_FLAGS -DCMARK_STATIC_DEFINE` escapes every inventory command, a Windows-target consumer fails. Fixed: `I2b` and the shared-and-static sentence |
| B4 | wave7 | caught | Reader grep over installed headers decided three keywords |

## C6 A name, default or knob a caller uses today breaks

**Mechanism.** A caller outside the tree uses option spellings and defaults,
install knobs, exported target names, a Find module's names, `.pc` files and
public commands. A modernization that changes one passes every check written
for the new spelling.

**Check in the skill.** New in wave 7: step 0 writes the caller contract into
the plan file as `contract:` rows, and the step that changes a row runs the old
spelling once (step 5's old `-D` and top-level default build, step 6's round
trip per exported name and Find-module name, the pkg-config check, the
twice-`find_package` alias guard, the flatten line for a public parse).

| Instance | Ledger | Verdict | What happened |
|---|---|---|---|
| FM7 mechanical `PARSE_ARGV` swap | topic map pinned decision 7 (M-W3-P) | (drafting) | Every caller passing a quoted list changes |
| J9, FM17 `NAMESPACE` on an existing export | wave5 | wrong | `JsonCpp::JsonCpp` fails at generate, bare `jsoncpp_static` becomes a `-l` flag |
| O19, FM17 unguarded compatibility `ALIAS` | wave6 | misled | Second `find_package` fails `add_library cannot create ALIAS target` |
| O18 | wave6 | worked | Guarded aliases and INSTALL.md's variable consumer pass |
| O12, FM24 test gate re-defaulted `ON` | wave6 | misled | Top-level default build fails `#error OPJ_HAVE_LIBTIFF_NOT_DEFINED` |
| O13, FM24 plain rename | wave6 | misled | `-DBUILD_TESTING=ON` gives 0 tests with exit 0, CI seeds that entry |
| O16 vendored glue reads the renamed options | wave6 | stalled | Old names set back as directory-scoped variables |
| Z13, FM24 install knob | wave6 | misled | `-DINSTALL_LIB_DIR` ignored, library installs to `lib64` |
| Z11, FM25 Find-module name | wave6 | wrong | Prefer-config consumer loses `ZLIB::ZLIB` and FindZLIB's variables |
| Z10, FM26 `.pc` template on replaced variables | wave6 | wrong | pkg-config prints `-I -L -lz` with exit 0, round trip exit 0 |
| B7 shim takes the old `-D` only fresh | wave7 | check defect | Re-configure with `-DENABLE_WERROR=ON` leaves 0 `-Werror`, exit 0. Fixed: the `UNINITIALIZED` block and a re-configure exit check |
| B15 | wave7 | caught | Every `contract:` name through the round trip |

## C7 A CMake name or citation written from memory

**Mechanism.** A name or a page an agent recalls, rather than reads from the
pinned binary or tag, passes review and does nothing.

**Check in the skill.** The variable-existence check against the pinned binary
(`CMK-LANG-11`, step 4) and each cited page fetched at the pinned tag.

| Instance | Ledger | Verdict | What happened |
|---|---|---|---|
| FM4 invented `CMAKE_CXX_STANDARD_EXTENSIONS` | modernize-procedure.md AI-agent angle 5, verification-wave3 row 39 | (drafting) | Count 0 is invented, raw list match also misreports `CMAKE_CXX_FLAGS` |
| FM9 CMake Tutorial old step titles | modernize-procedure.md AI-agent angle 1, verification-wave3 row 41 | (drafting) | Topic pages at v4.4.2, old titles 404 |

## C8 A check that could not fire reads clean

**Mechanism.** Empty output is a pass only from a check that could have
printed. A gate spelling the binary ignores, a configure that failed, a grep
operand that does not exist, or a pattern that misses a spelling all print
nothing.

**Check in the skill.** The evidence rule, extended in wave 7 to the class:
read the exit code first, a failed configure voids its greps, exit 2 is neither
pass nor hit, a gate is live only when the canary exits 1 through the leg's own
binary, and each pass grep is read with its list command.

| Instance | Ledger | Verdict | What happened |
|---|---|---|---|
| FM3 `-Werror=author` on a 3.31 leg | verification-wave3 row 40, cmake-versions-and-gate | (drafting) | Exit 0 and does nothing on 3.31.12 and 4.3.4 |
| J12 runner-image leg, `CMK-CORE-05` operand | wave5 | stalled | Canary has no binary, `scripts` missing exits 2 while hits print |
| T11a failed smoke configure | wave5 | wrong | `Total Tests: 0` and empty greps against no build tree |
| M1b `I9` over absent directories | wave4 | stalled | Exit 2, `No such file or directory` |
| M13 (CI half) greps over absent `.github/workflows` | wave4 | stalled | Exit 2, neither empty nor a hit |
| T12, Z15 | wave5, wave6 | worked | The exit-2 reading held on tinyformat and zlib |
| J1a `I2` misses `add_compile_definitions` | wave5 | misled | Three live calls invisible, only dead twins print |
| O21 CI configures through `ctest -S` | wave6 | misled | `CMK-CORE-01` grep reads "no gate" after the gate is wired |
| A3 case-sensitive configured-file list | wave7 | check defect | Misses `CONFIGURE_FILE(`. Fixed: `-rni` |
| B5 registry entry passes the round trip | wave7 | check defect | The tree's own `export(PACKAGE)` (`CMK-INST-24`) resolves an old build tree, exit 0 with no version file. Fixed: registry switch and anchored `_DIR` grep, `I14` |
| B11 install through a script | wave7 | check defect | `CMK-INST-18` greps miss `make ... install` in `tests/cmake/test.sh`. Fixed: `CI_SCRIPTS` and three install spellings |
| A14, B16 | wave7 | caught | `CI_SCRIPTS` as a file operand, exit-2 reading on absent `scripts` |

## C9 A finding no step owns stalls the run or rides along

**Mechanism.** A finding whose step, status or reviewable unit the procedure
does not name stops a literal agent, or lands in a diff no plan row covers.

**Check in the skill.** The plan file: every hit and every touched file has a
row with its step and status, a finding that blocks an earlier step goes in as
a row of the step that owns it, the 4.4 category demotion keeps the gate live,
`git status --short` after each configure, and `flagged-not-converted` with the
owner or prerequisite named.

| Instance | Ledger | Verdict | What happened |
|---|---|---|---|
| M0 entry check, absent host dependency | wave4 | stalled | Default configure fails on CXX and OpenGL, `-DBUILD_DEMOS=OFF` recorded |
| T0 entry check on 4.x | wave5 | stalled | Floor 2.8 fails 4.0.7 and 4.4.2, step 1's to fix |
| Z1 configure edits the source tree | wave6 | misled | ` D zconf.h` in every step's diff |
| Z4 4.4 gate error step 6 owns | wave6 | stalled | `install-absolute-destination` blocks steps 1 to 5 on 4.4.2 |
| M2 no CI, `<max>` undefined | wave4 | stalled | Pinned default 4.4 |
| J2 runner-image CMake, `<max>` undefined | wave5 | stalled | Pinned default 4.4, `CMK-VER-03` finding |
| M9 round trip without a slot for plan options | wave4 | stalled | `CFG_ARGS` added |
| M10 step 6 forbids its own `CMK-TGT` fix and new file | wave4 | stalled | Named exception and `new:` rows |
| T5, T8 header-only tree with no target | wave5 | stalled | Step 3 creates the `INTERFACE` target as a `new:` row |
| T9 no project version | wave5 | stalled | `No VERSION specified`, owner's call |
| Z9 version the tree states | wave6 | stalled | `VERSION ${VERSION}` |
| O4 configured-file repair with no step | wave6 | stalled | Second floor diff before step 2 |
| O10 `-Werror=<category>` with no disposition | wave6 | stalled | `flagged-not-converted`, `CMK-TGT-09` note |
| O23 components the host cannot configure | wave6 | stalled | `flagged-not-converted` with the prerequisite named |
| B2 CMP0175 error after raising `<max>` | wave7 | check defect | Gated configure exit 1, no step owned a code repair. Fixed: the floor's second diff owns every repair, `CMK-VER-07` |
| A1, A12, B14 | wave7 | caught | Absent C++ compiler, libFuzzer and TLS backends: plan option or `flagged-not-converted` |
| M13 (formatter half) whole-tree `gersemi` reformat | wave4 | stalled | Its own reviewable unit |
| O22 gersemi gate line includes vendored files | wave6 | misled | One vendored pathspec per directory |
| Wave 4 candidate 5, kept minimum below prescribed features | wave4 | (rejected, docs only) | Step 1's owner question on a minimum below 3.10 covers it |
| Cross-reference: triage T1-e, 4.4 gate stops inside a dependency's `install()` | wave4 | stalled (triage) | Same category as Z4, in third-party code, so the triage skill's T12 owns it |

## Failure-mode numbers to classes

Every failure mode the skill listed before wave 7 maps to exactly one class.

| FM | Short name | Class |
|---|---|---|
| 1 | Green build and install called consumable | C1 |
| 2 | Two-dot range | C4 |
| 3 | `-Werror=author` on a 3.31 leg | C8 |
| 4 | Invented `CMAKE_*` variable | C7 |
| 5 | `CMAKE_CXX_STANDARD` guarded by `PROJECT_IS_TOP_LEVEL` alone | C2 |
| 6 | Build-type idiom without `FORCE`, or with a swapped default | C3 |
| 7 | Mechanical `PARSE_ARGV` swap | C6 |
| 8 | Smoke parent without `include(CTest)` | C2 |
| 9 | Tutorial cited by old step titles | C7 |
| 10 | Compile feature alone replaces `-std=` | C3 |
| 11 | Raw source path in a `PUBLIC` include directory | C1 |
| 12 | Empty `main` misses a static link gap | C1 |
| 13 | Unprefixed demo or `CACHE BOOL` toggle | C2 |
| 14 | Floor through a variable, reset by `cmake_policy(VERSION)` | C4 |
| 15 | Header-read definition moved `PRIVATE` | C5 |
| 16 | Library's `BUILD_SHARED_LIBS` or output-path cache write | C2 |
| 17 | `NAMESPACE` added, old names or alias guard missing | C6 |
| 18 | `CMAKE_SOURCE_DIR` in a usage requirement | C1 |
| 19 | Empty `F1` on a range with an old max | C4 |
| 20 | Behaviour policy flipped by raising `<max>` | C3 |
| 21 | Flag-set union of two targets | C3 |
| 22 | Reader grep over a mixed directory, opt-in macro | C5 |
| 23 | Step 3 closed on `I1` alone | C5 |
| 24 | Option or install knob renamed or re-defaulted | C6 |
| 25 | Find-module name with only new targets | C6 |
| 26 | `.pc` template on replaced variables | C6 |

Counts: C1 4, C2 4, C3 4, C4 3, C5 3, C6 5, C7 2, C8 1, C9 0. All 50 misled,
stalled or wrong rows of the three modernize ledgers (wave 4 11, wave 5 16,
wave 6 23) map to a class above, with M13 split into its CI half (C8) and its
formatter half (C9).

## What changed in the skill

- SKILL.md (450 lines): "What agents get wrong" (26 items) became "Failure
  classes" (9 entries). The step table gained a Classes column. The evidence
  rule states C8 for every check, the plan-file section states C9 and the new
  caller contract (C6), and an "Output drift" paragraph makes the flag-set and
  configured-file diffs (C3) run after every diff that can change them. Step 1's
  exit check now includes the policy probe (C4). Step 5's exit adds the
  flag-set diff, and step 6's runs the round trip once per `contract:` spelling.
  The step prose keeps every rule, command and snippet, and its per-tree
  evidence moved to the reference file.
- references/failure-modes.md (287 lines, new): each class with its check,
  the 26 old items under their class, and the evidence moved out of the steps.
- references/inventory.md (299 lines): `F1` and `F1b` moved in from SKILL.md
  step 1, byte-identical, with the measured output of each.
- Every rule ID SKILL.md cited is still cited, the 16 MUST rows are unchanged,
  every fenced command of the old skill is present verbatim, and every inline
  code span of the old skill is present (`spancheck.py`, 0 missing).

## Moved commands, re-run from the ledger scratch

`run.sh` extracts `F1` and `F1b` from the shipped `inventory.md` fence and runs
them from `git archive` copies of each tree's step-0 state. grep (GNU grep)
3.12, no CMake involved, 2026-09-26.

| Tree | Command | Exit | Output | Ledger reading |
|---|---|---|---|---|
| Chipmunk2D `f2f3d66` | F1 | 0 | `./CMakeLists.txt:1:cmake_minimum_required(VERSION 3.7)` | wave4 M1, same line |
| jsoncpp step 0 (`bb7f08b`) | F1 | 1 | empty | wave5 J1b, exit 1 |
| jsoncpp step 0 (`bb7f08b`) | F1b | 0 | `./CMakeLists.txt:17` variable floor, `./CMakeLists.txt:24` `cmake_policy(VERSION ...)` | wave5 applied, `:17` and `:24` |
| zlib `w6-s0` | F1b | 0 | `./CMakeLists.txt:1:cmake_minimum_required(VERSION 2.4.4...3.15.0)` | wave6 applied `apply-f1b.sh`, `CMakeLists.txt:1` |
| openjpeg `w6-s0` | F1 | 0 | `thirdparty/libtiff:1` and `thirdparty/libz:3` (`VERSION 3.5`), `tests/nonregression/CMakeLists.txt:3` | wave6 O1, same three lines |
| openjpeg `w6-s0` | F1b | 0 | `tools/ctest_scripts/travis-ci.cmake:7` and `CMakeLists.txt:10` (`3.10...3.31.5`) | wave6 applied `apply-f1b.sh`, same two lines |

Both commands read the same after the move.

## Wave 7 held-out test (2026-09-26)

commonmark/cmark at `0.30.3` and libssh2/libssh2 at `libssh2-1.11.1`, run by
following the skill literally (wave7-holdout-modernize.md). Every one of the 30
problem rows maps to C1 to C9 above: (i) 12 caught, (ii) 14 check defects, (iii)
0 new classes, (iv) 4 text defects. The defects cluster where a class check was
still a list of known instances: C2 (4, fixed by a state diff and a
`CMAKE_MODULE_PATH` guard that need no name in advance), C3 (3, one
configuration and compile flags only), C8 (3). The applier re-ran A2, B2 and B5
and every shipped command spelling (out/30 to out/33 in the holdout scratch).
Class counts after wave 7: no class added. The skill's MUST table grew from 16
to 19 rows with `CMK-DEP-19`, `CMK-VER-07` and `CMK-INST-24`, all rows the rule
set already carries.
