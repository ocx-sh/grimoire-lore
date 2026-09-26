---
title: "Wave 7 — cmake-dependency-triage failure modes grouped into classes"
date: 2026-09-26
model: opus
skill: skills/cmake-dependency-triage (SKILL.md 500 lines and references/reading-the-answers.md 300 lines, as of wave 6 handbacks applied)
sources:
  - .agents/research/cmake-skills/wave4-real-tree.md
  - .agents/research/cmake-skills/wave5-triage-pm.md
  - .agents/research/cmake-skills/wave6-triage-real.md
  - .agents/research/cmake-skills/wave5-modernize-real.md
  - .agents/research/cmake-skills/wave6-modernize-real.md
  - .agents/research/cmake-skills/wave7-holdout-triage.md (C8, added by the wave 7 applier)
  - .agents/research/cmake-skills/wave8-holdout-triage.md (instances of C2, C3, C6 and C8, no new class)
---

# cmake-dependency-triage: eight failure classes

Waves 4 to 6 added triage failure modes one instance at a time, so the count
never reached zero. This file groups every failure mode the skill listed
(FM1 to FM19, the wave 6 numbering) and every triage step the ledgers record
as misled, stalled or wrong into seven classes, and the wave 7 held-out test
added an eighth (C8). A class is one mechanism,
stated so it recurs on a tree nobody has tried, with the check in the rewritten
skill that catches it. The skill now asks one question per class in its read
order (step 4) and keeps the instances in `references/failure-modes.md`.

Scope of the sources:

- `wave4-real-tree.md`, `wave5-triage-pm.md` and `wave6-triage-real.md` record
  38 non-worked triage steps. All 38 are mapped below.
- `wave5-modernize-real.md` and `wave6-modernize-real.md` record no triage
  step (0 hits for "triage" in either). Their steps belong to cmake-modernize.
  Three of them exercise a triage check and are mapped as cross-skill
  instances: wave 4's M11, wave 6's Z11 and O2. Wave 4's M0 and wave 5's
  shallow vcpkg root are listed under "Outside every class".

## C1 A proxy record read as the record

**Statement.** A declaration, a version request, a manager's current
resolution or a success message is read as the record of what this build tree
consumed. Each proxy is true about something else.

**Check in the skill.** The evidence rule, and step 4's C1 row: "Is each path
and version you cite a record of what this tree consumed?", with the
consumption record per mechanism (generators folder, vcpkg `status`,
`CPM_PACKAGE_` lines, `CMakeSystem.cmake`, `The file was found at`).

| Instance | Ledger | What happened |
|---|---|---|
| FM12 `version>=` read as installed | wave5-triage-pm A1 | `version>=` 1.7.15 installed 1.7.19 on baseline `11ace808`, exit 0 |
| FM14 `conan graph info` as the tree's record | wave5-triage-pm B1 | graph info 1.7.19, binary 1.7.17 (4.4.2) |
| FM15 trusting `Package was found by the dependency provider` | wave5-triage-pm B2 | printed after the fallback found the host copy |
| FM17 CPM copy read from `CPMAddPackage` | wave6-triage-real B1, B2, B3 | lock, cached option and shared cache each decided |
| A1-e stalled | wave5-triage-pm | step 3 dropped the `version:` lines, no 3.x version read |
| A1-f misled | wave5-triage-pm | CMK-VCPKG-01's check passed and named no cause |
| A2-d wrong | wave5-triage-pm | references said the cached `CMAKE_TOOLCHAIN_FILE` was the loaded one |
| B1-b misled | wave5-triage-pm | T8 called graph info "the resolved reference" |
| B1-c misled | wave5-triage-pm | a `generators` `_DIR` read as the right copy whatever version |
| B1-e stalled | wave5-triage-pm | the event's `version: "1.7.17"` was dropped by the pattern set |
| B2-d misled | wave5-triage-pm | the provider line read as the answerer |
| B1-f wrong | wave6-triage-real | the declare grep named the losing `CPMAddPackage` |

## C2 Sticky state outlives its input

**Statement.** A configure-time decision is cached, or written once, and
survives the change that should replace it. A remedy that clears one entry
finds the old copy again, and one that clears everything removes the symptom
without naming which input was sticky.

**Check in the skill.** Step 1's output saved before step 2, and step 4's C2
row: "Did a cached or once-written input outlive the change?", read as the
line that moved between the two greps. The step 1 grep now collects every
sticky input measured so far (`_DIR`, the hints, `CMAKE_TOOLCHAIN_FILE`,
`CPM_USE_LOCAL_PACKAGES`, `CPM_SOURCE_CACHE`, and since wave 8 `HUNTER_CACHED_ROOT`).

| Instance | Ledger | What happened |
|---|---|---|
| FM5 wiping the tree first | skill list (wave 3 and earlier) | the stale `_DIR` was the evidence |
| FM13 toolchain on an existing tree, then `-U` | wave5-triage-pm A2 | `-U cJSON_DIR` re-found the host copy |
| T3-a stalled | wave4-real-tree scenario 3 | no `CMAKE_PREFIX_PATH` pattern to compare the stale `_DIR` with |
| A2-c misled | wave5-triage-pm | no row read a missing `VCPKG_INSTALLED_DIR` |
| A2-f misled | wave5-triage-pm | `-U` cannot load a toolchain |
| B2-c misled | wave6-triage-real | `CPM_USE_LOCAL_PACKAGES:BOOL=ON` was not in the grep |
| B2-d wrong | wave6-triage-real | `-U fmt_DIR` kept 12.1.0 |
| B2-e misled | wave6-triage-real | `--fresh` fixed it and was credited to a stale `_DIR` |
| B-j stalled | wave8-holdout-triage | a populated `HUNTER_ROOT` skipped the bootstrap configure that fails on an empty one (exit 0 against exit 1, 4.3.4 and 4.4.2) |

## C3 Substitution after resolution

**Statement.** Every configure record names the intended copy, and the
artifact still carries another: the loader picks a same-SONAME copy, the
generator picks another installed configuration of the package, another
package compiles in a bundled copy, or the source at the recorded pin differs
(an override that skips the patch, an edited shared checkout). Only a read of
the artifact or its source finds it.

**Check in the skill.** Step 4's C3 row, run whatever the entry row: one block
with `ldd`, `readelf -d`, the version-macro grep, `git status --porcelain` on
`_SOURCE_DIR`, and the patch and override greps. The stop condition's "which
copy" now requires these reads to find no other copy.

| Instance | Ledger | What happened |
|---|---|---|
| FM6 `FETCHCONTENT_SOURCE_DIR_<X>` for a patched dependency | skill list (wave 3) | pristine source skipped `PATCH_COMMAND` |
| FM8 stopping at "the configured copy is right" | wave4-real-tree scenario 2 | installed binary loaded host 1.7.18 |
| FM16 stopping at a right `_DIR` beside a bundled copy | wave6-triage-real A | spdlog's bundled fmt 12.1.0 beside fmt 11.1.4 |
| T2-a stalled | wave4-real-tree | no row for loading at run time |
| T2-b misled | wave4-real-tree | step 1's last row routed to a manager |
| A-b misled | wave6-triage-real | only T11 named another copy in a binary |
| A-f stalled | wave6-triage-real | `ldd` listed no fmt for a static link |
| A-g stalled | wave6-triage-real | no copy, mechanism or rule named |
| B3-c stalled | wave6-triage-real | empty step 1 grep for a fetched copy's source |
| B3-d stalled | wave6-triage-real | 0 debug blocks, 0 events |
| B3-e stalled | wave6-triage-real | the declare grep showed CI's pin, nothing read the checkout |
| A-b, A-c, A-h misled | wave8-holdout-triage | `ldd` printed lz4's Debug `liblz4d.so.1` for a RelWithDebInfo leg, and the reads compared only directories |
| A-j stalled | wave8-holdout-triage | a false stop at "right copy", no route for the imported configuration |

## C4 An absent or rejected candidate read as precedence

**Statement.** The winning copy won because the expected one was never a
candidate, or was a candidate the request rejected, not because it ranked
lower. The precedence readings (stale cache, a rooted copy wins) prescribe a
`_DIR` pin that fixes one package and hardens the cause.

**Check in the skill.** Step 4's C4 row: "Where is the expected copy in step
2's candidate list?" Never listed goes to the search space (T1's cross branch,
T3), `considered but not accepted` to the request (T13, now a branch of T1),
and only listed-and-beaten to precedence. Step 2's closing paragraph no longer
says a `_DIR` that stays on a sysroot is a rooted copy winning, which was
FM18's misreading left in the text.

| Instance | Ledger | What happened |
|---|---|---|
| FM3 provider widens search paths, `DEFER` runs earlier | skill list (wave 3) | `find_program` sees Conan paths only in the first call's scope |
| FM18 `_DIR` outside every root read as "a rooted copy won" | wave6-triage-real C | multiarch sysroot never searched, empty `CMAKE_LIBRARY_ARCHITECTURE` |
| B2-b stalled | wave5-triage-pm | no row for the provider's fallback |
| B2-c misled | wave5-triage-pm | no row for a `_DIR` line under a provider |
| B2-f wrong | wave5-triage-pm | rooted branch with both roots empty, pin would pin the host copy |
| C-d wrong | wave6-triage-real | T1's rooted reading inverted |
| C-e misled | wave6-triage-real | a `_DIR` pin fixed one Config package, left `BOTH` |

## C5 A read calibrated on one mechanism

**Statement.** Config-mode `find_package` writes `<Pkg>_DIR`, prints `The file
was found at` the package file and logs one event. A redirect, a provider, a
Find module and CPM each write something else, or file it under another name.
A read tuned to the Config shape reports the difference as absence or as a
CMK-DEP-17 finding.

**Check in the skill.** Step 4's C5 row: "Does the read fit the mechanism that
answered?", with step 1 re-run under each declare's spelling and an empty or
zero result taken as absence only for a mechanism that writes that record.
The per-mechanism record table sits in `references/failure-modes.md` C5, with
a pkg-config row since wave 7.

| Instance | Ledger | What happened |
|---|---|---|
| FM4 empty `_DIR` grep read as "never looked up" | skill list (wave 3) | a Find module or `CMakeConfigDeps` provider answered |
| FM9 `FIND_PACKAGE_ARGS` name spelled unlike the Config file | wave4-real-tree scenario 1 | `cjson` missed `cJSONConfig.cmake` and fetched |
| FM10 CMK-DEP-17 finding for a zero event count | wave4-real-tree, wave6-triage-real | redirect logs an event only under `--debug-find-pkg` |
| T1-f wrong | wave4-real-tree | 0 events beside 17 `find-v1` |
| T1-h misled | wave4-real-tree | DEP-07's shape without `NAMES` still fetched |
| B2-e wrong | wave5-triage-pm | provider events exist under the debug flag |
| B1-d misled | wave6-triage-real | the override grep hit a comment in `CPM.cmake` |
| B1-g stalled | wave6-triage-real | a redirect prints no `The file was found at` |
| B1-h wrong | wave6-triage-real | "no event" false after step 2 |
| B2-f stalled | wave6-triage-real | `Debug Log at cmake/CPM.cmake` never named |
| C-g stalled | wave6-triage-real | the module's cache lines were unread |
| C-h misled | wave6-triage-real | `The file was found at` named `FindEXPAT.cmake` |

## C6 A gate stop in third-party code cleared at the wrong knob

**Statement.** The gate promotes a diagnostic inside code the project does not
own. Remedies that lower its severity or scope fail, are forbidden, or are a
silent no-op on one CMake line. Only a change to the dependency's input clears
it: a scoped floor value, a re-pin, or a patch of every hit. A dependency
configured in a child process never sees a scoped value or a `-D`, so there only
a re-pin or a patch reaches its input (wave 8).

**Check in the skill.** Step 4's C6 row: "Does the remedy change the
dependency's input, with the gate on, on every CI line?", with the floor-writes
grep and the `CMAKE_INSTALL_FULL_` grep in the merged T5, T6 and T12 section.

| Instance | Ledger | What happened |
|---|---|---|
| FM1 global switch or 3.5 for a floor error | skill list (wave 3) | forbidden remedy |
| FM2 `CMAKE_POLICY_VERSION_MINIMUM` on 3.x | skill list (wave 3) | 3.31.12 ignores it, exit 0 |
| FM11 scoped `cmake_diagnostic` or `CMAKE_SKIP_INSTALL_RULES` for 4.4's stop | wave4-real-tree T1-e | both exit 1 on 4.4.2, only a full patch cleared it |
| T1-e stalled | wave4-real-tree | no row for the 4.4 stop |
| O2 misled (cross-skill) | wave6-modernize-real | a vendored in-repo floor on 3.31.12, CMK-DEP-30 had no knob, routed to the owner |
| B-h wrong | wave8-holdout-triage | CMK-DEP-15's set/unset around `HunterGate(` and a `-D` both exit 1 on 4.4.2, the re-pinned gate module exit 0 |
| B-i (caught) | wave8-holdout-triage | the C6 question rejected all three remedies, with no route to the one that works |

## C7 A proof that exercises one consumer kind

**Statement.** A proof passes with a consumer that cannot fail, while the
consumer kind that failed would. A `LANGUAGES NONE` consumer never compiles,
an empty `main` never pulls a static archive member, and a `CONFIG` consumer
never meets the Find module a plain `find_package` loads first.

**Check in the skill.** Step 4's C7 row: "Does the proof run the consumer kind
that failed?", answered by the CMK-INST-01 round trip with a compiled consumer
that calls one exported function, once per consumer kind (T4).

| Instance | Ledger | What happened |
|---|---|---|
| FM7 `LANGUAGES NONE` consumer proves a `find_dependency` fix | skill list (wave 3) | green either way |
| M11 wrong (cross-skill) | wave4-real-tree, Chipmunk2D | empty `main` passed, `sincos` undefined for a calling consumer |
| Z11 wrong (cross-skill) | wave6-modernize-real, zlib | `CONFIG` round trip passed, FindZLIB answered plain consumers |

## C8 One dependency, several lookups

Added by the wave 7 applier (2026-09-26) from the held-out test in
`wave7-holdout-triage.md`, after checking it against C1 to C7 below.

**Statement.** One dependency reaches the build through more than one lookup or
configure: `find_package` beside `pkg_check_modules`, a Find module's
`find_path` beside its `find_library`, per-component calls, a superbuild's
outer configure beside its inner one, or a manager's bootstrap configure
(wave 8). Each lookup has its own inputs, search order and record,
so each can land on another copy with exit 0, and the triage credits one
lookup's record for the whole artifact.

**Check in the skill.** Step 4's C8 row: "Is every lookup that fed the
artifact accounted for?", read from the artifact's side: the link lines (one
directory per library), the `found:` paths of `find-v1` events, and the count
of `CMakeCache.txt` files (more than one is a nested configure). The C3 route,
T11's bullet, T14's second-hit reading, step 1's last row and the stop
condition now name C8.

**Why it is not an instance of C1 to C7** (applier's check):

- C1: the record read (`zstd_DIR`) is this tree's real consumption record for
  `core`, not a proxy for something else. It is one of two true records.
- C3: C3 says every record names the intended copy. Here one record
  (`pkgcfg_lib_ZSTD_zstd`, the inner `json-c_DIR`) names the other copy, and
  no substitution follows resolution. C3's reads detected both held-out
  scenarios, but its routes (T11, T14, T7, T15) named no mechanism.
- C4: the lookup that was read found the expected copy. In B the inner
  lookup's search space was truncated, which is C4 inside C8 (a C4 route now
  names the forwarded arguments).
- C5: C5 is one lookup's record read with another mechanism's expectations.
  The pkg-config record shape is a C5 row (added), but the structure, two
  records naming two copies, survives a correctly calibrated read.
- It recurs: two independent held-out mechanisms plus wave 6's FM19.

| Instance | Ledger | What happened |
|---|---|---|
| FM19 a Find module's version taken as the linked copy's (moved from C5) | wave6-triage-real C | header 2.8.5 from the sysroot, library 2.7.3 from the host |
| C-i wrong (moved from C5) | wave6-triage-real | step 3's version was the header's |
| A-b misled | wave7-holdout-triage | step 1's last row assumed one lookup |
| A-c misled | wave7-holdout-triage | `Found libzstd, version 1.5.6` and the runtime-path cycle warning had no reading |
| A-i stalled | wave7-holdout-triage | C3 routed a two-directory `RUNPATH` to T11 |
| B-b, B-c, B-f | wave7-holdout-triage | two caches, and the triage read the one that did not build the artifact |
| B-b misled | wave8-holdout-triage | the error's `CMakeLists.txt:1` was the Hunter bootstrap project's line, read in the project |
| B-g misled | wave8-holdout-triage | the cache count over `build` printed one file, the failing cache sat under `HUNTER_ROOT` |

## Wave 8 held-out test (applied 2026-09-26)

Two new mechanisms, the generator's choice of an imported configuration (lz4
1.10.0) and HunterGate's bootstrap configure on CMake 4 (cpp-pm/gate v0.9.2
with Hunter v0.26.12), produced no new class. The applier checked each problem
against the statements:

- Scenario A is C3: `lz4_DIR`, the event and `The file was found at` all name
  the intended package, and the generator swaps in its Debug build after
  resolution. One lookup and one cache rule out C8, and `lz4_DIR` is the
  lookup's own record, which rules out C1.
- B-b and B-g are C8: a nested configure's record (its error location, its
  cache) was read as the outer one's. Only the location of the inner tree is
  new, so the statement widens from "one library" to "one dependency".
- B-h is C6: the class question caught it (B-i). Its route listed a scoped
  value as an input change, which it is not for a child process.
- B-j is C2: a once-written input outside the tree, the same shape as the
  `CPM_SOURCE_CACHE` row.

## Outside every class

- **M0 (wave4-real-tree), an absent host dependency.** The modernize entry
  check pointed at the triage, which has no row for it. It is not a wrong-copy
  question: cmake-modernize's corrected entry check routes it to the owner.
- **Wave 5's shallow vcpkg root.** Loud (`vcpkg was cloned as a shallow
  repository`, exit 1), and vcpkg's message names the fix. Rejected in wave 5.

## Every failure-mode number to exactly one class

| FM | Short name | Class |
|---|---|---|
| 1 | Floor error "fixed" with a global switch or 3.5 | C6 |
| 2 | `CMAKE_POLICY_VERSION_MINIMUM` for a 3.x build | C6 |
| 3 | Provider widens search paths, `DEFER` runs earlier | C4 |
| 4 | Empty `_DIR` grep read as "never looked up" | C5 |
| 5 | Wiping the build tree first | C2 |
| 6 | `FETCHCONTENT_SOURCE_DIR_<X>` for a patched dependency | C3 |
| 7 | `LANGUAGES NONE` consumer as the proof | C7 |
| 8 | Stopping at "the configured copy is right" | C3 |
| 9 | `FIND_PACKAGE_ARGS` name spelled unlike the Config file | C5 |
| 10 | CMK-DEP-17 finding for a redirect's zero count | C5 |
| 11 | Scoped diagnostic or `CMAKE_SKIP_INSTALL_RULES` for 4.4's stop | C6 |
| 12 | vcpkg `version>=` read as installed | C1 |
| 13 | Toolchain on an existing tree, then `-U` | C2 |
| 14 | `conan graph info` as the tree's record | C1 |
| 15 | Trusting `Package was found by the dependency provider` | C1 |
| 16 | A right `_DIR` beside a bundled copy | C3 |
| 17 | CPM copy read from the `CPMAddPackage` call | C1 |
| 18 | `_DIR` outside every root read as a rooted copy | C4 |
| 19 | A Find module's version as the linked copy's | C8 (C5 until wave 7) |

Per class: C1 4, C2 2, C3 3, C4 2, C5 3, C6 3, C7 1, C8 1 (19). Ledger steps
of waves 4 to 6: C1 8, C2 6, C3 8, C4 5, C5 9, C6 1, C7 0, C8 1 (38), plus
three cross-skill instances. Wave 7's held-out steps are counted in its ledger.

## What the rewrite changed

- SKILL.md 500 to 450 lines. `references/failure-modes.md` is new (295
  lines) and holds FM1 to FM19 verbatim under their classes, with the
  measured evidence that left SKILL.md (T11's cJSON versions, T12's cJSON
  releases and the remedies that failed, T14's spdlog symbol counts, T1's zig
  cc detail, the vendored-module `_ROOT` grep, and the re-check list).
  `reading-the-answers.md` is unchanged.
- Step 4 is new: one question per class, and one block of artifact and source
  reads for C3 (the old T7, T11, T14 and T15 `git` commands, now run whatever
  the entry row). T11 and T14 live there, T13 is a branch of T1 ordered by the
  C4 answer, and T3 with T10, T5 and T6 with T12, T8 with T9 share sections.
- One instance-specific reading that contradicted FM18 is gone: step 2 said
  a `_DIR` that stays on a sysroot is a rooted copy winning. It now defers to
  the C4 question.
- Every rule ID the old SKILL.md cited is still cited there, the 12 MUST rows
  are byte-identical, and every fenced command is in SKILL.md or the new
  reference. Commands that lacked an empty-output clause gained one (step 1,
  step 3's count, T4's second grep, T7's second grep).
- Checker: `check-artifacts.py` with the six `--forbid` operands prints
  `clean`, exit 0.

## Re-run of two moved commands (ledger scratch, 2026-09-26)

Both commands moved from T14 and T15 into step 4's C3 block. They were run in
the skill's shape against the wave 6 triage fixtures by
`/home/mherwig/.cache/cmake-measure-scratch/w7/triage-classes/run.sh`
(output `run.out`, exit 0). GNU grep 3.12, git 2.54.0. No CMake binary is
involved in either read.

| Command | Result | Ledger reading |
|---|---|---|
| `grep -rn --include='*.h' --include='*.hpp' -e 'define FMT_VERSION ' "$S/pfx/fmt-11.1.4/include" "$S/pfx/spdlog-1.17.0-bundled/include"` | exit 0, 2 hits: `fmt/base.h:24:#define FMT_VERSION 110104` and `spdlog/fmt/bundled/base.h:24:#define FMT_VERSION 120100` | same (wave 6 `run.out` lines 438 and 439) |
| The same grep with `spdlog-1.17.0-ext` | exit 0, 1 hit, `FMT_VERSION 110104` | same (line 441) |
| `git -C "$DIR" status --porcelain`, `DIR` from `CPM_PACKAGE_fmt_SOURCE_DIR:INTERNAL=.../B/cpm-cache/fmt/061b` in `B/cache/b44` | exit 0, ` M include/fmt/base.h` | same (wave 6 B3 fixture) |
| The same `git` read on the unedited fetched copy in `B/lock-fix/b44/_deps/fmt-src` | exit 0, empty output (the pass) | new control |

Both read the same after the move. The move changed where the commands sit,
not what they print.

## Convergence reading

This task adds no MUST row and no new failure mode. It regroups 19 listed
failure modes and 38 ledger steps into 7 classes, and two items stay outside
every class for stated reasons. The held-out test (fresh trees producing no
new class and no new MUST row) is not part of this task and was not run.
