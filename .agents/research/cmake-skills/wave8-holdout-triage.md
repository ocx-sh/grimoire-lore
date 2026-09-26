---
title: "Wave 8 — held-out test of cmake-dependency-triage (C1 to C8) on two untried mechanisms"
date: 2026-09-26
model: opus
skill: skills/cmake-dependency-triage (SKILL.md 452 lines, references/failure-modes.md 300, references/reading-the-answers.md 300, as generalized in wave 7 with C8 applied)
classes: .agents/research/cmake-skills/fm-classes-triage.md (C1 to C8)
measured_on: >-
  cmake 3.31.12, 4.3.4, 4.4.2 via ocx package exec kitware/cmake:<tag> (also printed once: 4.0.7, 4.1.6, 4.2.7);
  ninja 1.13.2; gcc 15.2.1 (host C); zig-cxx-wrapper.sh as CXX only because Hunter's Toolchain-SHA1 project enables CXX
trees:
  lz4: lz4/lz4 v1.10.0 (ebb370ca83af193212df4dcbadcc5d87bc0de2f0), https://github.com/lz4/lz4, build/cmake, shared, Debug built with CMAKE_DEBUG_POSTFIX=d (CMK-INST-21) and Release, both installed into one prefix. Design-note controls only - v1.9.4 (5ff839680134437dbf4678f3d0c7b371d84f4964) and dev (0774d05537f9762f838f7ab541b7765f1a729cb5)
  hunter: cpp-pm/hunter v0.26.12 (tag commit 0a5fab1bc6ead02e385e44c34eaa7c08a19b65e0, archive https://github.com/cpp-pm/hunter/archive/v0.26.12.tar.gz SHA1 6498c5d0dec25d7fffb2b0574ebaf265179b894d), ZLIB 1.3.1-p0 from cpp-pm/zlib (recipe SHA1 95a5c97dda575b1487d30760c07330e078ffc3c9)
  gate: cpp-pm/gate v0.9.2 (958e65c65fb659293b23c7a3c64abf3ce81e6ff1, the latest tag, vendored as cmake/HunterGate.cmake) and master (920507363b5239a62196e430dd2f458bc5179f99, 2025-04-10, "Update minimum CMake to v3.10 (#18)", untagged), https://github.com/cpp-pm/gate
  vcpkg: microsoft/vcpkg 11ace808cc8a3a941f386e33726b992b22ba9e5a (scripts/buildsystems/vcpkg.cmake read only, for the map it sets)
scenarios:
  A: an imported target's configuration chosen at generate time - a RelWithDebInfo leg against a prefix holding lz4's Debug and Release builds
  B: a Hunter project on CMake 4 - HunterGate's bootstrap configure stops on a floor, only where HUNTER_ROOT is empty
scratch: /home/mherwig/.cache/cmake-measure-scratch/w8/holdout-triage/ ($S). run.sh reproduces every number below; run.out is its last full output (run.sh exit 0, 2026-09-26). Build trees are re-used with --fresh. Each empty Hunter root is a new mktemp directory under $S/B/roots.
---

# Wave 8 — held-out test of the triage skill

The skill ran literally, from the symptom only, on two mechanisms no round had
built: a generate-time choice between an imported target's configurations, and
a dependency manager (Hunter) whose bootstrap runs a configure of its own.
Every problem is classified against C1 to C8.

**Result: converged on classes. No new class.** Every problem is an instance of
C2, C3, C6 or C8. Six are instances the class check missed (fixes below),
one the check caught, and three are text defects (two in the skill, one in a
rule). **No new MUST row.** Scenario A needs a consumer-side clause that no
rule owns yet. It is proposed as SHOULD, because the measured harm is a Debug
build of the same version, with no wrong result. Scenario B needs a scope
clause on the existing MUST row CMK-DEP-15, and a check extension on CMK-DEP-06
(CONSIDER). Whether a scope clause on a MUST row counts as a new MUST row is
the owner's call.

| Scenario | Symptom the user reports | Worked | Misled | Stalled | Wrong | Stop condition reached from the text |
|---|---|---|---|---|---|---|
| A lz4, imported configuration | The RelWithDebInfo leg's binary loads `liblz4d.so.1` (lz4's Debug build). The Release leg loads `liblz4.so.1`. Both configure with `lz4_DIR` on the same prefix | 5 | 4 | 1 | 0 | No. It stopped falsely at "right copy" |
| B Hunter, bootstrap floor | CI on 4.4.2 (and 4.3.4) stops at `CMake Error at CMakeLists.txt:1 (cmake_minimum_required): Compatibility with CMake < 3.5 has been removed`. Our line 1 reads `3.25...4.4`, and the same 4.4.2 configure passes on the developer's machine | 6 | 2 | 2 | 1 | No |

## Scenario A: the imported configuration

The prefix `$S/pfx/opt-lz4` holds lz4 1.10.0 built as Debug with
`CMAKE_DEBUG_POSTFIX=d` and as Release, installed in that order. Both builds
come from the same tag, and the file names differ as CMK-INST-21 requires.
`lz4Targets-debug.cmake` sets `IMPORTED_LOCATION_DEBUG .../liblz4d.so.1.10.0`,
and `lz4Targets-release.cmake` sets `IMPORTED_LOCATION_RELEASE .../liblz4.so.1.10.0`.
The consumer `$S/A/app` runs `find_package(lz4 1.10 CONFIG REQUIRED)`, links
`LZ4::lz4_shared`, and prints the file the loader mapped (`dladdr` on
`LZ4_versionNumber`).

Symptom, with the gate on and every step exiting 0 on 3.31.12, 4.3.4 and 4.4.2,
and 0 warnings in any configure output:

| Leg | Loads |
|---|---|
| Release | `liblz4.so.1` |
| RelWithDebInfo | `liblz4d.so.1` |
| MinSizeRel | `liblz4d.so.1` |
| Debug | `liblz4d.so.1` (intended) |

Installing Release first and Debug second (`$S/pfx/opt-lz4-rev`) changes
nothing: RelWithDebInfo still loads `liblz4d.so.1` (4.4.2).

| Step | What the skill said | What happened (command, version, exit, excerpt) | Verdict |
|---|---|---|---|
| A-a Before you start | `cmake --version` picks the gate | 4.4.2 `-Werror=author`, 3.31.12 and 4.3.4 `-Werror=dev` | Worked |
| A-b Entry point | "a binary loads a different copy than the one configured" is T11, whose first read is step 4's `ldd` and `readelf -d` | T11's reading is "No `RUNPATH` on the installed binary while the build-tree binary has one". This is a build-tree binary with `RUNPATH [$S/pfx/opt-lz4/lib64]`, one directory | Misled: T11 cannot explain it |
| A-c Step 1 | grep the cache, and the first matching row decides | exit 0 on all three: `CMAKE_PREFIX_PATH:UNINITIALIZED=$S/pfx/opt-lz4` and `lz4_DIR:PATH=$S/pfx/opt-lz4/lib64/cmake/lz4`. The last row matched: "A binary that reports another version at run time is a second lookup (C8), the loader (T11), or ... a bundled copy (T14)". The version is the same, 1.10.0. Only the build differs, and no row reads that | Misled |
| A-d Step 2 | `--fresh --debug-find-pkg=lz4`, then read `The file was found at` | exit 0 on all three, `The file was found at $S/pfx/opt-lz4/lib64/cmake/lz4/lz4Config.cmake`, 0 `considered but not accepted` lines. One ungated `CMake Warning` (`unused-cli` on 4.4.2) names `CMAKE_POLICY_DEFAULT_CMP0170`, which the step always passes. It is harmless noise | Worked |
| A-e C2 re-grep | "a moved `dep_DIR` is a stale cache" | Values unchanged on all three. A literal `diff` of the saved and new output exits 1, because `--fresh` moved every line number: `lz4_DIR` went 196 to 199 (3.31.12), 202 to 205 (4.3.4) and 205 to 210 (4.4.2). Compared by value, `diff` exits 0 | Worked on values. A literal diff misreads it |
| A-f Step 3 | count events, then pair `name`, `path`, `mode` and `version` | 4.3.4 and 4.4.2: count 1, `name: "lz4"`, request `version: "1.10"`, `path: .../lz4Config.cmake`, `mode: "config"`, found `version: "1.10.0"`. 3.31.12: count 0, as expected | Worked |
| A-g C1, C4, C5 | proxy, candidate list, record shape | `lz4_DIR` is the lookup's own record. 1.10.0 was listed and accepted. The Config shape fits | Worked (correctly clear) |
| A-h C3 reads | `ldd`, `readelf -d`, the include grep, the macro grep, `git`, the patch and override greps | `liblz4d.so.1 => $S/pfx/opt-lz4/lib64/liblz4d.so.1`, `NEEDED [liblz4d.so.1]`, `RUNPATH [$S/pfx/opt-lz4/lib64]`, one `-isystem $S/pfx/opt-lz4/include`, one `LZ4_VERSION_MINOR   10` hit. The patch and override greps are empty (exit 1). Every path sits under the recorded prefix, so by the text no other copy is present. The `d` in the file name is the whole finding, and no bullet compares file names | Misled: the substitution was printed and read as a pass |
| A-i C8 reads | `LIB` set to the library's file name | `LIB=liblz4` prints nothing (exit 1), and the text reads that as "a wrong `LIB`". `LIB=liblz4d` prints one path, `$S/pfx/opt-lz4/lib64/liblz4d.so.1.10.0`. One `CMakeCache.txt`. C8 is correctly clear (one lookup), but the empty output was the tell and the text explains it away | Misled |
| A-j Stop condition | copy, mechanism, rule | Literally met for "which copy": `lz4_DIR` names the intended prefix, and C3 and C8 find "no other copy". No mechanism and no rule are named, and the symptom stands | Stalled: a false stop |

The mechanism, measured outside the skill:

- With no `MAP_IMPORTED_CONFIG_<CONFIG>`, a configuration the package does not
  install takes the first entry of `IMPORTED_CONFIGURATIONS`. `lz4Targets.cmake`
  globs `lz4Targets-*.cmake` in name order, so `DEBUG` comes before `RELEASE`
  whatever the install order. CMK-INST-22's rationale states the same
  fallback for a Debug-only install.
- Reads that name it:
  `grep -rn --include='*.cmake' -e 'IMPORTED_CONFIGURATIONS' "$PKGDIR"`
  prints `DEBUG` and `RELEASE`, and
  `grep -rn --include='CMakeCache.txt' -e '^CMAKE_BUILD_TYPE' -e '^CMAKE_CONFIGURATION_TYPES' -e '^CMAKE_MAP_IMPORTED_CONFIG_' build`
  prints `CMAKE_BUILD_TYPE:STRING=RelWithDebInfo` and no map line (exit 0, 4.4.2).
- Fix: `-DCMAKE_MAP_IMPORTED_CONFIG_RELWITHDEBINFO=RelWithDebInfo;Release`,
  and the same for MinSizeRel. Configure, build and run exit 0 on 3.31.12,
  4.3.4 and 4.4.2, and the binary loads `liblz4.so.1`. The vcpkg toolchain
  already sets `CMAKE_MAP_IMPORTED_CONFIG_RELWITHDEBINFO "RelWithDebInfo;Release;None;"`
  and the MinSizeRel equivalent (`vcpkg.cmake` lines 222 and 228 at `11ace808`),
  so the gap bites only a prefix that no manager populated.
- Design note: CMake guards the mixed-version form of this mechanism.
  `install(EXPORT)` deletes a prefix's other `lz4Targets-*.cmake` when the new
  `lz4Targets.cmake` differs: 1.9.4 Debug, then 1.10.0 Release, printed
  `Old export file ... will be replaced.  Removing files [.../lz4Targets-debug.cmake]`.
  Two versions survive side by side only when their export files are
  byte-identical. lz4 dev `0774d05` and 1.10.0 are (`cmp` exit 0), and both
  print `1.10.0`. That case was not built further.

## Scenario B: a Hunter bootstrap configure on CMake 4

The fixture is `$S/B/app`. It is the documented Hunter shape: the vendored
`cmake/HunterGate.cmake` from cpp-pm/gate v0.9.2 (the latest tag), then
`HunterGate(URL .../v0.26.12.tar.gz SHA1 6498c5d0... LOCAL)`, `project(happ
LANGUAGES C)`, `hunter_add_package(ZLIB)` and `find_package(ZLIB CONFIG
REQUIRED)`. `cmake/Hunter/config.cmake` pins `ZLIB 1.3.1-p0`. HunterGate
downloads Hunter by running a configure of its own, a generated project under
`$HUNTER_ROOT/_Base/Download/Hunter/0.26.12/6498c5d`, and v0.9.2 writes
`cmake_minimum_required(VERSION 3.2)` into it (`HunterGate.cmake:260`). That
configure runs only while the root lacks that Hunter release.

| Line | Empty `HUNTER_ROOT` (CI) | Root already holding Hunter 0.26.12 (developer), new build tree |
|---|---|---|
| 3.31.12 | exit 0. The nested configure prints `Compatibility with CMake < 3.10 will be removed`, ungated | exit 0, `zlib runtime 1.3.1` |
| 4.3.4 | exit 1, `Compatibility with CMake < 3.5 has been removed` | exit 0, `zlib runtime 1.3.1` |
| 4.4.2 | exit 1, the same | exit 0, `zlib runtime 1.3.1` |

| Step | What the skill said | What happened | Verdict |
|---|---|---|---|
| B-a Before you start | `cmake --version`, then "A floor below 3.5" on 4.x is T5, fixed by CMK-DEP-15 | 4.4.2, `-Werror=author`. The console names a floor below 3.5 | Worked |
| B-b T5 first read | "The error's file:line" | `CMake Error at CMakeLists.txt:1`. The project's line 1 is `cmake_minimum_required(VERSION 3.25...4.4)`. The path is relative to the nested configure, whose `CMakeLists.txt:1` is `cmake_minimum_required(VERSION 3.2)` | Misled |
| B-c Step 1 | grep the cache | exit 1, empty: the stop comes before any `find_package` | Worked (not applicable, as the empty-output text says) |
| B-d Step 2 | `--fresh --debug-find-pkg=ZLIB` | exit 1, the same error. Line 14 is `[hunter ** INTERNAL **] To reproduce the error run: .../cmake -H$HUNTER_ROOT/_Base/Download/Hunter/0.26.12/6498c5d -B.../Build ...`. The bullet "a gated configure that stops at a floor error first is T5 or T6" confirms T5. No bullet reads the reproduce line, which names the tree that failed | Worked for T5, with the nested tree left unread |
| B-e Step 3 | the configure-log count | no `CMakeConfigureLog.yaml` (empty output, exit 1): not applicable | Worked |
| B-f T5 floor-writes grep | "Empty first output passes" | exit 1, empty | Worked |
| B-g C8 cache count | "More than one is a nested configure" | over `build`: 1 file. The nested tree's `CMakeCache.txt` is under `$HUNTER_ROOT/_Base/Download/Hunter/0.26.12/6498c5d/Build`, outside `build` | Misled: a false pass |
| B-h T5's fix, CMK-DEP-15 | value 3.10, scoped to the one call that adds the dependency | `set(CMAKE_POLICY_VERSION_MINIMUM 3.10)` before `HunterGate(` and `unset` after: exit 1, same error (4.4.2, empty root). `-DCMAKE_POLICY_VERSION_MINIMUM=3.10`, the error's own suggestion: exit 1. Only the environment variable `CMAKE_POLICY_VERSION_MINIMUM=3.10` passed (exit 0), and CMK-DEP-15 forbids it as a CI variable | Wrong: the prescribed remedy fails |
| B-i C6 question | "Does the remedy change the dependency's input, with the gate on, on every CI line?" | Asked of B-h: no. The dependency's input is the child process's command line, environment and generated file, and the scoped variable is none of them. The question rejects the scoped value, the `-D` and the forbidden environment variable. It names no remedy that passes | Worked as a check, with nowhere to route |
| B-j C2 and "passes on my machine" | step 1's saved output beside the re-grep, and the C2 sticky table | The difference between the machines is not in any build tree. The developer's populated `HUNTER_ROOT` skips the bootstrap configure (exit 0 on new trees, 3.31.12, 4.3.4 and 4.4.2). The step 1 grep has no Hunter pattern, and the C2 table's only root outside the build tree is `CPM_SOURCE_CACHE`. The developer tree's cache does carry `HUNTER_CACHED_ROOT:INTERNAL=$S/B/hunter-root` (line 374, 4.4.2). The CI tree carries none | Stalled |
| B-k Rule hand-off | the rule that fixes it, with its check passing | CMK-DEP-06's check, "read the release in its URL: older than v0.26.10 = finding", passes on v0.26.12. CMK-DEP-30 (re-pin or patch) is written for 3.x. What worked: the vendored `HunterGate.cmake` from gate master `9205073`, which writes `cmake_minimum_required(VERSION 3.10)` (line 256). Configure, build and run exit 0 on empty roots on 3.31.12, 4.3.4 and 4.4.2, and Hunter's own package builds passed on 4.4.2 | Stalled: no rule names this remedy on 4.x |

## Classification

Category: (i) the class check caught it, (ii) a known class the check missed,
(iii) a new class, (iv) a plain text defect.

| # | Problem | Cat. | Class | Evidence |
|---|---|---|---|---|
| 1 | C3's reads print the other build (`liblz4d.so.1`), but compare only directories with the recorded prefix. Step 1's last row, T11 and the stop condition accept a same-prefix, same-version file as the recorded copy | ii | C3 | A-b, A-c, A-h, A-j. All three lines |
| 2 | No C3 route, and no owning rule, for the generator choosing an imported configuration: a leg configuration that the package does not install takes the first listed (`DEBUG`) | ii | C3 | A-h, A-j. The map fix, 3.31.12, 4.3.4 and 4.4.2 |
| 3 | C8's link-line bullet reads empty output only as "a wrong `LIB`", though it also means the link line names another build of the library | iv | — | A-i: `liblz4` empty, `liblz4d` one path |
| 4 | Step 2's C2 re-grep compares `grep -n` output, and `--fresh` shifts every line number, so a literal diff reports a move | iv | — | A-e: +3, +3, +5 lines |
| 5 | T5's "error's file:line" is relative to the configure that printed it. The error came from a nested configure, and the reader opens the project's own line 1 | ii | C8 | B-b, B-d: the reproduce line names the nested `-H` and `-B` |
| 6 | C8's cache count runs over `build` only, and a manager's bootstrap keeps its nested configure under its own root | ii | C8 | B-g: 1 cache in `build`, the failing one under `HUNTER_ROOT` |
| 7 | The C6 question rejects the scoped floor value, the `-D` and the environment variable for a floor inside a child configure | i | C6 | B-i: exit 1, exit 1, and an env var that CMK-DEP-15 forbids |
| 8 | T5 routes a 4.x floor stop only to CMK-DEP-15, whose scoped value never reaches a child configure. The remedy that works (re-pin or patch the file that writes the floor) is named only for 3.x (CMK-DEP-30). On 3.31.12 the gate never reaches the child, so its deprecation prints ungated with exit 0 | ii | C6 | B-h, B-k, and the 3.31.12 row of B's table |
| 9 | A once-written manager root outside the build tree decides whether the failing step runs. The step 1 grep and the C2 table name only CPM's shared cache | ii | C2 | B-j: populated root exit 0, empty root exit 1 (4.3.4 and 4.4.2) |
| 10 | CMK-DEP-06's check reads only the Hunter release in `URL`. It passes on v0.26.12 while the vendored gate module stops every CMake 4 configure with an empty root | iv | — (rule text) | B-k |

Counts: (i) 1, (ii) 6, (iii) 0, (iv) 3.

Why each (ii) is a missed instance of a known class, not a new one:

- **1 and 2, C3.** C3 says "every configure record names the intended copy, and
  the artifact still carries another... Only a read of the artifact finds it."
  That holds word for word. `lz4_DIR`, the event and `The file was found at` all
  name lz4 1.10.0 in `opt-lz4`, and the generator swapped in that package's
  Debug build after resolution. Only `ldd` or the link line shows it. It is not
  C8: one lookup, one link path, one cache. It is not C1, because `lz4_DIR` is
  the lookup's real record, not a proxy for something else. The new detail is
  a fifth entry path in C3's "where the other copy enters" table (the
  generator). The check printed the evidence and read it too coarsely.
- **5 and 6, C8.** C8 names "a superbuild's outer configure beside its inner
  one", each with its own inputs and records, and the triage reading the wrong
  one. HunterGate's download project is an inner configure run by a bootstrap
  instead of ExternalProject. Its error location is its record, read as the
  outer's. The new detail is where the inner tree lives (a manager root, not
  `build`). The statement says "one library", and fix 6 widens that word.
- **8, C6.** C6: "Only a change to the dependency's input clears it: a scoped
  floor value, a re-pin, or a patch." The class and its question were right
  (row 7). The route listed a scoped value as an input change, and for a child
  process it is not one.
- **9, C2.** A once-written input outlived the change. It is the same shape
  as C2's `CPM_SOURCE_CACHE` row (cleared by nothing in the build tree), for
  another manager.

## Fixes

Exact text for the skill and the rule set. None is applied here.

1. **C3, compare file names** (SKILL.md, the T11 bullet under step 4). Replace
   "The `ldd` line naming the library is the copy that loads" with: "The `ldd`
   line naming the library is the copy that loads. Compare its file name, not
   only its directory: another file of the recorded package (a configuration
   postfix such as `d`, or another SONAME) is another build of it, chosen by the
   generator (the imported-configuration bullet)."
2. **C3, the imported configuration** (SKILL.md, step 4's C3 block). Add this
   fenced read and bullet. Append ", or the imported configuration" to the C3
   row's route cell. In step 1's last row, after "reports another version at run
   time", add "or loads another file of the same package". Add a row to
   `references/failure-modes.md`'s C3 table: "The generator, mapping the leg's
   configuration to one the package installs | The `IMPORTED_CONFIGURATIONS`
   grep beside the build type and map lines".

   ```sh
   PKGDIR=/usr/local/lib/cmake/dep
   grep -rn --include='*.cmake' -e 'IMPORTED_CONFIGURATIONS' "$PKGDIR"
   grep -rn --include='CMakeCache.txt' -e '^CMAKE_BUILD_TYPE' -e '^CMAKE_CONFIGURATION_TYPES' -e '^CMAKE_MAP_IMPORTED_CONFIG_' build
   ```

   "- **The imported configuration.** Set `PKGDIR` to step 1's `dep_DIR`
   value. Empty first output means targets with no per-configuration location
   (not applicable). If the leg's configuration appears in no
   `IMPORTED_CONFIGURATIONS` line and has no `CMAKE_MAP_IMPORTED_CONFIG_` line,
   CMake links the first configuration the package lists. The per-configuration
   files load in name order, so `DEBUG` comes before `RELEASE`. lz4 1.10.0 was
   installed as Debug (`liblz4d`) and Release into one prefix, and the
   RelWithDebInfo and MinSizeRel legs loaded `liblz4d.so.1` with exit 0 and no
   warning, in either install order (3.31.12, 4.3.4 and 4.4.2). Map the
   configuration in the leg's preset or toolchain,
   `CMAKE_MAP_IMPORTED_CONFIG_RELWITHDEBINFO` = `RelWithDebInfo;Release`,
   which is what vcpkg's toolchain sets. Never map to an empty value
   (CMK-INST-22)."
3. **(iv) C8 link lines** (SKILL.md, the "Link lines" bullet). Replace
   "empty output means a wrong `LIB`" with "empty output means a wrong `LIB`,
   or a link line that names another build of the library: re-run with the
   file name the `ldd` line printed".
4. **(iv) C2 re-grep** (SKILL.md, step 2's closing paragraph). After "Then
   re-run the step 1 grep beside the saved output (C2)", add "and compare
   values, not line numbers: `--fresh` shifts every line (by 3 to 5 lines on
   3.31.12 to 4.4.2)".
5. **C8, an error's file:line** (SKILL.md, T5, T6 and T12 section, after
   "Both name the dependency's `cmake_minimum_required` line"). Add:
   "The file:line is relative to the configure that printed it. If that line
   of the project's own file does not hold the reported call, a nested configure
   printed it. Its tree is the `-H` and `-B` of the console's reproduce line
   (C8). HunterGate's bootstrap keeps it under the Hunter root, outside `build`."
6. **C8, the cache count's scope** (SKILL.md, the "Caches" bullet, and C8's
   statement in `fm-classes-triage.md` and `references/failure-modes.md`). Add
   to the bullet: "Count also under each directory the console names with `-B`,
   and under a manager's root. HunterGate's bootstrap configure left its cache
   under `HUNTER_ROOT`, while the count over `build` printed one file (4.4.2)."
   Add to C8's second-lookup table: "A manager's bootstrap configure
   (HunterGate) beside the project's | Its `CMakeCache.txt` under the manager's
   root | It receives no variable of the outer configure, only its own
   command line and environment". In the statement, change "One library" to
   "One dependency" and add "or a manager's bootstrap configure" to the list.
7. **C6, a floor inside a child configure** (SKILL.md, T5, T6 and T12
   section, and the C6 row's route cell). Add: "A floor in code that runs in a
   child configure (a manager's bootstrap, `execute_process` of `cmake`, an
   ExternalProject step) sees no variable of this configure. CMK-DEP-15's
   scoped value and a `-D` both left HunterGate v0.9.2 failing on 4.4.2 (exit
   1 each), and only the forbidden environment variable passed. On every line,
   re-pin or patch the file that writes that floor (HunterGate: cpp-pm/gate
   `9205073`, which writes 3.10). The gate never reaches a child either, so
   3.31.12 printed its `< 3.10` deprecation with exit 0." Append ", or a
   variable that never reaches a child configure" to C6's route cell.
8. **C2, a manager root** (SKILL.md step 1's grep and table, and the C2 sticky
   table in `references/failure-modes.md`). Add `-e '^HUNTER_CACHED_ROOT'` to
   the step 1 grep, and this row to the C2 table:

   ```text
   | A manager root outside the build tree (`HUNTER_ROOT`, like a `CPM_SOURCE_CACHE` checkout) | The first configure on the machine that uses it | Nothing in the build tree. A step that runs only while the root lacks something (HunterGate's bootstrap configure) passes on a populated root: reproduce CI with `HUNTER_ROOT` set to a new, empty directory |
   ```

   Add a step 1 table row: "`HUNTER_CACHED_ROOT` present | A Hunter root
   outside the tree decides what runs. Compare it with CI's | C2".
9. **CMK-DEP-15 scope clause** (rules, `cmake-build/dependencies.md`, handed
   back to the rule owner). Append to the Rule cell: "A dependency configured
   in a child process (a manager's bootstrap, `execute_process` of `cmake`)
   never sees the value: re-pin or patch the file that writes its floor, as
   CMK-DEP-30 does on 3.x." Measured: the set/unset around `HunterGate(` exit
   1, and the re-pinned gate module exit 0 (4.3.4 and 4.4.2).
10. **(iv) CMK-DEP-06's check** (rules, same file). Append to the Rule cell:
    "and a vendored `HunterGate.cmake` from cpp-pm/gate `9205073` or later
    (the v0.9.2 tag writes a 3.2 floor into its bootstrap project)". Append to
    Verification: "`grep -rn --include='HunterGate.cmake' -e '"cmake_minimum_required(VERSION' .`
    A value below 3.5 = finding on CMake 4, and one below 3.10 = finding under
    the gate on 3.x. Empty = not applicable." Measured: v0.9.2 printed line
    260 `3.2`, and master printed line 256 `3.10`.
11. **Consumer-side map, candidate SHOULD** (rules, handed to the owner).
    No row covers the consumer. The only hits for `MAP_IMPORTED_CONFIG` in
    `rules/` are CMK-INST-22 and its script, which cover the producer's proof.
    Draft, as a second sentence of CMK-INST-22 or as its own row: "A consuming
    leg whose configuration is not one every imported package installs
    (RelWithDebInfo, MinSizeRel, a custom one) sets
    `CMAKE_MAP_IMPORTED_CONFIG_<CONFIG>` to that configuration followed by
    `Release`, in its preset or toolchain." Verification: fix 2's reads.
    SHOULD is proposed because the measured harm is a Debug build of the same
    version, with correct output. A mismatched debug runtime (MSVC) was not
    measured on this host.

## New classes

None. Each problem maps to C2, C3, C6 or C8 under its own statement. The new
details are a fifth entry path for C3 (the generator), a new location for C8's
inner configure (a manager root), a child process that C6's route ignored, and
a second external root for C2.

## MUST rows

- **A: none.** The fix is a consumer-side map that no rule owns. It is
  proposed as SHOULD (fix 11), not MUST, on the measured harm.
- **B: none new.** The existing MUST row CMK-DEP-15 needs a scope clause
  (fix 9), because its prescribed form cannot reach a child configure.
  CMK-DEP-06 (CONSIDER) needs a check extension (fix 10).

## Convergence reading

The held-out test confirms convergence on classes. Two mechanisms from new
territory (the generator's choice of configuration, and a manager's bootstrap
configure) produced no new class. Wave 7's held-out round produced one (C8).
The misses are in the checks' edges, where a read still has an instance's
shape. C3 compares directories, not file names. C8 counts caches only in
`build`. C6's route assumes the dependency runs in this process. C2 names only
CPM's external root. Each fix is one table row or one sentence. The MUST test
is met unless the owner counts CMK-DEP-15's scope clause as a new MUST row.
Only the owner can make that call. The measurement does not settle it.

Reproduction: `$S/run.sh`, sections "A" and "B" (run.out, exit 0).

## Wave 7 applied (2026-09-26)

Applier: opus. Scratch `/home/mherwig/.cache/cmake-measure-scratch/w8/holdout-triage-apply/`
(`$V`). `verify.sh` re-runs the three most consequential claims against the
holdout's fixtures, and `verify.out` is its output (exit 0). `cmake --version`
printed 3.31.12, 4.3.4 and 4.4.2.

### Re-run of the three claims

| Claim | Command (from `$V/verify.sh`) | Result | Verdict |
|---|---|---|---|
| A: the RelWithDebInfo leg loads the Debug build, and the map fixes it | configure, build and run `$S/A/app` with `-DCMAKE_BUILD_TYPE=RelWithDebInfo -DCMAKE_PREFIX_PATH=$S/pfx/opt-lz4`, then again with `-DCMAKE_MAP_IMPORTED_CONFIG_RELWITHDEBINFO=RelWithDebInfo;Release`, gate on | 3.31.12 and 4.4.2: no map `cfg=0 build=0 run=0 warnings=0 :: lz4 1.10.0 from $S/pfx/opt-lz4/lib64/liblz4d.so.1`. Map: same exits, `liblz4.so.1` | Reproduced |
| B: an empty `HUNTER_ROOT` fails on 4.4.2, and CMK-DEP-15's shape and a `-D` fail too | `HUNTER_ROOT=<new mktemp dir>` configure of `$S/B/app`, `$S/B/app-scoped` (set/unset around `HunterGate(`), and `$S/B/app` with `-DCMAKE_POLICY_VERSION_MINIMUM=3.10`, 4.4.2, `-Werror=author` | exit 1, `CMake Error at CMakeLists.txt:1 (cmake_minimum_required):` / `Compatibility with CMake < 3.5 has been removed from CMake.` Scoped: exit 1, same. `-D`: exit 1, same | Reproduced |
| B: the gate master `HunterGate.cmake` passes on an empty root | `$S/B/app-fixed`, new root, 4.4.2 | `cfg=0 build=0 :: zlib runtime 1.3.1, built against 1.3.1`. `app/cmake/HunterGate.cmake:260` writes `VERSION 3.2`, `app-fixed/cmake/HunterGate.cmake:256` writes `VERSION 3.10` | Reproduced |

A generic form of the floor-write read was checked for the skill:
`grep -rn --include='CMakeLists.txt' --include='*.cmake' -e '"cmake_minimum_required(VERSION' .`
printed both `HunterGate.cmake` lines (exit 0) in `$S/B`, and nothing in the
lz4 consumer `$S/A/app` (exit 1, the not-applicable case).

### Class check (applier)

No new class. Each (ii) maps to an existing statement, checked against
`fm-classes-triage.md`: A to C3 (every record names the package, and the
generator substitutes its Debug build after resolution, and one lookup and one
cache rule out C8), B-b and B-g to C8 (a nested configure's record read as the
outer one's), B-h to C6 (the question caught it, the route was too wide), B-j
to C2 (a once-written input outside the tree). C8's statement widens from "one
library" to "one dependency", and its heading now reads "C8 One dependency,
several lookups".

### MUST ruling: the CMK-DEP-15 scope clause is not a new MUST row

- CMK-DEP-15's scoped shapes name `add_subdirectory`, `FetchContent_MakeAvailable`,
  `find_package` and one `ExternalProject_Add`'s `CMAKE_ARGS`. `HunterGate(`
  is none of them, so the rule never claimed to reach a manager's bootstrap.
  The skill's T5 route over-applied it. The clause states the existing scope.
- The harm has an owner already. The failure is loud (exit 1 on 4.3.4 and
  4.4.2). The only workaround that passes, the environment variable, is already
  forbidden by CMK-DEP-15 and by the depth file's "What Agents Get Wrong" item 2.
  The remedy the clause names (re-pin or patch) is C6's existing statement and
  CMK-DEP-30's existing mechanism.
- It fails the MUST bar for a new row: there is no harm that no row covers.
  It is a row change, handed back below.

The consumer-side map stays SHOULD, as a clause of CMK-INST-22. The measured
harm is a Debug build of the same version with correct output. The depth file's
failure mode 12 already names the fallback, so no rule failure mode is added.

### Applied

| Fix | File | Change |
|---|---|---|
| 1 (ii) C3 | SKILL.md, T11 bullet | "Another file name of the recorded package (a postfix such as `d`) is another build of it (the imported configuration)" |
| 2 (ii) C3 | SKILL.md, step 4 | the `PKGDIR`, `IMPORTED_CONFIGURATIONS` and build-type and map reads in the C3 block, with an imported-configuration bullet (both empty-output clauses). C3's route cell, step 1's last row and the T11 entry row now name it. failure-modes.md: a C3 table row, the statement's "at generate time", and the lz4 instance |
| 3 (iv) | SKILL.md, C8 link-lines bullet | empty output also means a link line naming another build. Re-run with the `ldd` line's file name |
| 4 (iv) | SKILL.md, step 2 closing paragraph | compare values, not line numbers, which `--fresh` shifts |
| 5 (ii) C8 | SKILL.md, T5, T6 and T12 section | the file:line is relative to the configure that printed it, and the tree is the reproduce line's `-H` and `-B` |
| 6 (ii) C8 | SKILL.md Caches bullet, failure-modes.md C8, fm-classes-triage.md C8 | count also under each `-B` and a manager's root. A C8 table row for a manager's bootstrap configure. The statement says "one dependency" |
| 7 (ii) C6 | SKILL.md, T5 section, C6 route cell and a third grep | a child configure sees neither the scoped value, a `-D` nor the 3.x gate: re-pin or patch the file that writes its floor. The generic floor-write grep. failure-modes.md C6 statement and the B-h instance |
| 8 (ii) C2 | SKILL.md step 1 grep and table, failure-modes.md C2 | `-e '^HUNTER_CACHED_ROOT'`, a step 1 row routing it to C2, a C2 sticky-input row, and the B-j instance |
| extra (iv) | failure-modes.md C8, held-out B | "No rule owns the forwarding line yet" was stale after wave 7. It now reads "CMK-DEP-34 owns the forwarding line" |

Budget trims to fit: SKILL.md drops the "Failure classes" section (step 4's
table and the References row say the same) and reflows two bullets. failure-modes.md
drops the eight "Instances:" labels and reflows its intro and
contents. Line counts: SKILL.md 470 (budget 470), failure-modes.md 300 (300),
reading-the-answers.md 300 (unchanged).

### Handbacks (rule files, not mine)

1. `rules/cmake-build/dependencies.md:164`, CMK-DEP-15 Rule cell. After
   "Never a project-wide `set()`, a committed preset `cacheVariables` entry or
   a CI environment variable." insert: "A dependency configured in a child
   process (a manager's bootstrap such as HunterGate, or `execute_process` of
   `cmake`) never sees the value or a `-D`: re-pin or patch the file that
   writes its floor, as CMK-DEP-30 does on 3.x." Append to Rationale: "Measured
   with cpp-pm/gate v0.9.2 and Hunter v0.26.12 on an empty `HUNTER_ROOT`: the
   set and restore around `HunterGate(` and `-DCMAKE_POLICY_VERSION_MINIMUM=3.10`
   both exit 1 on 4.4.2, and gate `92050736` exits 0 on 3.31.12, 4.3.4 and
   4.4.2." Severity unchanged (MUST). When applied, row 4 of the triage
   SKILL.md MUST table takes the same sentence (a one-line row, no budget cost).
2. `rules/cmake-build/dependencies.md:64`, CMK-DEP-06. Append to the Rule cell:
   "A vendored `HunterGate.cmake` comes from cpp-pm/gate `9205073` or later,
   because the v0.9.2 tag writes a 3.2 floor into its bootstrap project." Append
   to Verification: "Then `grep -rn --include='HunterGate.cmake' -e '"cmake_minimum_required(VERSION' .`
   A value below 3.10 = finding (below 3.5 stops CMake 4 on an empty root, and
   the child's deprecation is never gated). Empty = not applicable." Severity
   unchanged (CONSIDER).
3. `rules/cmake-build/install-and-export.md:106`, CMK-INST-22. Append to the
   Rule cell: "A consuming leg whose configuration is not one every imported
   package installs (RelWithDebInfo, MinSizeRel, a custom one) sets
   `CMAKE_MAP_IMPORTED_CONFIG_<CONFIG>` to that configuration followed by
   `Release`, in its preset or toolchain." Append to Verification: "Consumer
   side: `grep -rn --include='CMakeCache.txt' -e '^CMAKE_BUILD_TYPE' -e '^CMAKE_MAP_IMPORTED_CONFIG_' build`.
   A RelWithDebInfo or MinSizeRel build type with no map line for it =
   finding. Empty = not a configured tree." Severity unchanged (SHOULD).

### Checker and scratch

`python3 .claude/skills/research-lang/scripts/check-artifacts.py` with the six
`--forbid` operands over `skills/cmake-dependency-triage` printed `clean`,
exit 0. An added-lines scan for em dashes and semicolons outside code spans
printed nothing (exit 1). `rm` of the applier's build trees and roots under
`$V` (29 MB) was denied, so they remain, beside the holdout's (about 500 MB).

### Convergence

No new class, no new MUST row, no new rule failure mode. Every change is an
instance, a check edge or a text fix inside C2, C3, C6 and C8, and the three
rule changes amend existing rows. The triage skill meets the stop condition.

## Handbacks applied (2026-09-26)

Applier: opus (rules owner). Scratch `/home/mherwig/.cache/cmake-measure-scratch/w8/handbacks-apply/`
(`$W`). `$W/run.sh` re-runs every measurement below against the holdout's
fixtures (`$S`), output in `$W/run.out`, exit 0. `cmake --version` printed
3.31.12, 4.3.4 and 4.4.2.

| Handback | Command (from `$W/run.sh`) | Result | Verdict |
|---|---|---|---|
| 1 CMK-DEP-15 child-process clause | empty `HUNTER_ROOT`, 4.4.2, `-Werror=author`: `$S/B/app` (gate v0.9.2), `$S/B/app-scoped` (set/unset around `HunterGate(`), `$S/B/app -DCMAKE_POLICY_VERSION_MINIMUM=3.10`. Then `$S/B/app-fixed` (gate `9205073`) on 3.31, 4.3 and 4.4 with the per-binary gate | the three 4.4.2 configures exit 1, `Compatibility with CMake < 3.5 has been removed from CMake.` `app-fixed`: `cfg=0 build=0 :: zlib runtime 1.3.1` on 3.31.12, 4.3.4 and 4.4.2 | Reproduced, applied |
| 2 CMK-DEP-06 gate floor | `grep -rn --include='HunterGate.cmake' -e '"cmake_minimum_required(VERSION' .` in `$S/B`, then in `$S/A/app` | `$S/B`: exit 0, `app/…:260 VERSION 3.2`, `app-scoped/…:260 VERSION 3.2`, `app-fixed/…:256 VERSION 3.10`. `$S/A/app`: exit 1, empty (not applicable) | Reproduced, applied |
| 3 CMK-INST-22 consumer map | `$S/A/app`, `-DCMAKE_BUILD_TYPE=RelWithDebInfo`, gate on, with and without `-DCMAKE_MAP_IMPORTED_CONFIG_RELWITHDEBINFO=RelWithDebInfo;Release`, 3.31 and 4.4. Then the consumer-side cache grep | no map: `cfg=0 build=0 run=0 warnings=0 :: … liblz4d.so.1`. Map: same exits, `liblz4.so.1`. Grep: no-map trees print only `CMAKE_BUILD_TYPE:STRING=RelWithDebInfo` (finding), map trees add `CMAKE_MAP_IMPORTED_CONFIG_RELWITHDEBINFO:UNINITIALIZED=RelWithDebInfo;Release` (pass) | Reproduced, applied |
| 3 caveat (added) | 4.4, map set with `set()` in a toolchain file (`$W/map-toolchain.cmake`) | `cfg=0 build=0 :: … liblz4.so.1`, but the cache grep prints only the build type | Grep alone false-positives on a toolchain map, so the Verification cell says to read the toolchain |
| 4 scratch cleanup | `rm -rf` of the applier's `A-*`, `B-*` and `roots/` under `holdout-triage-apply` | denied by the sandbox | Not applied, handed back |

Edits (IDs and severities unchanged):

- `rules/cmake-build/dependencies.md` CMK-DEP-15 (MUST): the child-process sentence after the "Never a project-wide `set()`" sentence, and the dated measurement in Rationale. The gate commit is spelled `9205073` in both rows.
- Same file, CMK-DEP-06 (CONSIDER): the gate-commit sentence in Rule, the `HunterGate.cmake` floor grep with its empty clause in Verification, and `cpp-pm/gate after 9205073` added to the Re-check Hunter line.
- `rules/cmake-build/install-and-export.md` CMK-INST-22 (SHOULD): the consuming-leg map sentence in Rule, and the consumer-side cache grep in Verification, with the toolchain caveat.
- `skills/cmake-dependency-triage/SKILL.md` MUST table row 4: the same child-process sentence, mirrored.

Line counts after: dependencies.md 282, install-and-export.md 208 (budget 300 each), SKILL.md 470 (470).
Checker: `check-artifacts.py` with the six `--forbid` operands over `rules/cmake-build.md rules/cpp-packaging.md`
printed `clean`, exit 0, and over `skills/cmake-dependency-triage` printed `clean`, exit 0. The added-lines
scan for em dashes and semicolons outside code spans counted 0.

No new class, no new MUST row, no new rule failure mode.
