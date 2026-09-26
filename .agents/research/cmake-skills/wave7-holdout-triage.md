---
title: "Wave 7 — held-out test of cmake-dependency-triage (class-level checks) on two untried mechanisms"
date: 2026-09-26
model: opus
skill: skills/cmake-dependency-triage (SKILL.md 450 lines, references/failure-modes.md 295, references/reading-the-answers.md 300, as generalized in wave 7)
classes: .agents/research/cmake-skills/fm-classes-triage.md (C1 to C7)
measured_on: >-
  cmake 3.31.12, 4.3.4, 4.4.2 via ocx package exec kitware/cmake:<tag> (also printed once: 4.0.7, 4.1.6, 4.2.7);
  ninja 1.13.2; gcc 15.2.1 (host C); pkgconf 2.3.0; zig-cxx-wrapper.sh only to satisfy zstd's own project(C CXX)
trees:
  zstd: facebook/zstd v1.5.6 (794ea1b0afca0f020f4e57b6732332231fb23c70) and v1.5.7 (f8745da6ff1ad1e7bab384bd1f9d742439278e99), https://github.com/facebook/zstd, built from build/cmake, shared only, each installs lib64/cmake/zstd/zstdConfig.cmake and lib64/pkgconfig/libzstd.pc
  json-c: json-c/json-c json-c-0.17-20230812 (b4c371fa0cbc4dcbaccc359ce9e957a22988fb34) and json-c-0.18-20240915 (41a55cfcedb54d9c1874f2f0eb07b504091d7e37), https://github.com/json-c/json-c, shared only, installs json-c-config.cmake and no version file
scenarios:
  A: a pkg-config IMPORTED_TARGET copy competing with a Config-package copy of zstd in one link
  B: an ExternalProject superbuild whose inner configure sees another prefix than the outer one (json-c)
scratch: /home/mherwig/.cache/cmake-measure-scratch/w7/holdout-triage/ ($S). run.sh reproduces every number below; run.out is its last full output (run.sh exit 0, 2026-09-26). Build trees are re-used with --fresh (no rm).
---

# Wave 7 — held-out test of the triage skill

The wave 7 generalizer rewrote the triage skill around seven failure classes
and a step 4 that asks one question per class. This test runs that skill,
literally and from the symptom only, on two mechanisms no earlier round built:
a pkg-config copy beside a Config-package copy, and an ExternalProject
superbuild. It then classifies every problem against C1 to C7.

**Result: not converged on classes.** Both scenarios meet one mechanism that no
class states. **One library is resolved by more than one lookup, and the triage
credits one lookup's record for the whole artifact.** Proposed as C8 below.
Wave 6's FM19 was an earlier instance of it, filed under C5. Five problems are
known classes whose check missed them (fixes given). Two are plain text
defects. On rules, scenario A needs no new MUST row, because CMK-DEP-33's
first sentence owns it. Scenario B found a rule gap, a candidate MUST row
for forwarding a list to an ExternalProject configure. Whether superbuilds are
in scope is the owner's call (topic map M-G-20 had them as an uncovered P2).

| Scenario | Symptom the user reports | Worked | Misled | Stalled | Wrong | Stop condition reached from the text |
|---|---|---|---|---|---|---|
| A zstd, pkg-config beside Config | `find_package(zstd 1.5.7 CONFIG REQUIRED)` passes and `zstd_DIR` names 1.5.7, but the app prints `zstd runtime 1.5.6` | 5 | 4 | 3 | 0 | No |
| B json-c, ExternalProject superbuild | The superbuild's `CMakeCache.txt` has `json-c_DIR` on 0.18, and the app prints `json-c runtime 0.17` | 3 | 4 | 3 | 1 | No |

## Scenario A: a pkg-config copy beside a Config-package copy

The fixture is `$S/A/app`. The top level runs `find_package(zstd 1.5.7 CONFIG
REQUIRED)` and links `core` to `zstd::libzstd_shared`. The `io/` subdirectory
runs `pkg_check_modules(ZSTD REQUIRED IMPORTED_TARGET libzstd)` and links `io`
to `PkgConfig::ZSTD`. The configure passes `-DCMAKE_PREFIX_PATH=$S/pfx/zstd-1.5.7`.
The user's shell carries `PKG_CONFIG_PATH=$S/pfx/zstd-1.5.6/lib64/pkgconfig`.

Symptom (3.31.12, 4.3.4 and 4.4.2, each with its gate, configure, build and run
all exit 0):
`zstd runtime 1.5.6, core built against 10507, io built against 10506, roundtrip 24`.
Every leg printed one ungated `CMake Warning at CMakeLists.txt:7 (add_executable): Cannot generate a safe runtime search path for target app because there is a cycle in the constraint graph`,
naming both `lib64` directories for `[libzstd.so.1]`.

| Step | What the skill said | What happened (command, version, exit, excerpt) | Verdict |
|---|---|---|---|
| A-a Before you start | `cmake --version` picks the gate | `cmake version 4.4.2`, so `GATE=-Werror=author`. `-Werror=dev` on 3.31.12 and 4.3.4 | Worked |
| A-b Step 1 | grep the cache, and the first matching row decides | exit 0, two lines on every version: `CMAKE_PREFIX_PATH:UNINITIALIZED=.../zstd-1.5.7` and `zstd_DIR:PATH=.../zstd-1.5.7/lib64/cmake/zstd`. The last row matched: "configured copy is right … the loader (T11), or … a bundled copy (T14)" | Misled: neither is the mechanism |
| A-c Step 2 | `--fresh`, `--debug-find-pkg=zstd`, and read `The file was found at` | exit 0. `The file was found at .../zstd-1.5.7/lib64/cmake/zstd/zstdConfig.cmake`. The same output held `--   Found libzstd, version 1.5.6` and the runtime-path cycle warning, and no bullet reads either (3.31.12, 4.3.4, 4.4.2) | Misled |
| A-d C2 re-grep | the saved step 1 output beside the re-grep | values unchanged on all three | Worked (C2 correctly clear) |
| A-e Step 3 | count `find_package-v1` events, then pair name, path and version | 4.3.4 and 4.4.2: count 1, `name: "zstd"`, `path: .../zstd-1.5.7/.../zstdConfig.cmake`, `mode: "config"`, `version: "1.5.7"`. 3.31.12: count 0, as expected. The pkg-config lookup is a `find-v1` event (`variable: "pkgcfg_lib_ZSTD_zstd"`, `found: ".../zstd-1.5.6/lib64/libzstd.so"`, backtrace `io/CMakeLists.txt:2 (pkg_check_modules)`), which the pattern excludes | Misled: reads as one resolution |
| A-f Step 4 C1 | is each cited path a record of consumption? | yes for `zstd_DIR`, which is `core`'s record | Worked, but incomplete |
| A-g Step 4 C3, `ldd` and `readelf -d` | the artifact against the records | `libzstd.so.1 => .../zstd-1.5.6/lib64/libzstd.so.1`, `RUNPATH [.../zstd-1.5.6/lib64:.../zstd-1.5.7/lib64]` (all three) | Worked: the substitution was detected |
| A-h Step 4 C3, macro grep | over step 1's prefixes, one hit passes | `grep -rn --include='*.h' ... -e 'define ZSTD_VERSION_RELEASE ' $S/pfx/zstd-1.5.7/include`, exit 0, 1 hit (`7`). Step 1 never names the 1.5.6 prefix | Misled: a false pass |
| A-i C3 route to T11 | "by the read that differs" | T11 reads "an installed binary with no RUNPATH, whose twin has one". This is a build-tree binary whose RUNPATH names two directories for one SONAME. T11's fixes (`$ORIGIN`, `INSTALL_RPATH_USE_LINK_PATH`) do not apply | Stalled |
| A-j C4, C5 | the candidate list, then step 1 re-run per declare spelling | C4: 1.5.7 listed and accepted. C5: no declare exists, and the module row greps `<NAME>_LIBRARY*` for a `find_package` name. Nothing points at `pkgcfg_lib_ZSTD_zstd:FILEPATH=.../zstd-1.5.6/lib64/libzstd.so` or `ZSTD_VERSION:INTERNAL=1.5.6` | Stalled |
| A-k Stop condition | copy, mechanism, rule | Copy: two in the artifact. Mechanism: not named. Rule: CMK-DEP-33 is reached only from T14 (bundled) | Stalled |
| A-l Side effect of step 2 | pass "the same `-D` hints and `--toolchain`" | the literal command drops `-G Ninja`, and `--fresh` rewrote `CMAKE_GENERATOR:INTERNAL=Unix Makefiles` (every version) | Worked for the reads (see B-k) |

The mechanism, measured outside the skill:

- `FindPkgConfig.cmake` (4.4.2, lines 836 to 894) starts from
  `$ENV{PKG_CONFIG_PATH}` and appends the `CMAKE_PREFIX_PATH`-derived
  directories, so the environment's `.pc` wins.
- Control: with `PKG_CONFIG_PATH` unset (4.4.2) it printed
  `Found libzstd, version 1.5.7`, and the app printed `zstd runtime 1.5.7`.
- The link line (`build.ninja`) held both `.../zstd-1.5.6/lib64/libzstd.so`
  and `.../zstd-1.5.7/lib64/libzstd.so.1.5.7`.
- Fix: `io` resolves zstd through the same `find_package` and links
  `zstd::libzstd_shared`. On 3.31.12, 4.3.4 and 4.4.2, configure exit 0 with 0
  cycle warnings, the app printed `zstd runtime 1.5.7, core built against 10507, io built against 10507`,
  and the link line held one library path. The owning rule is CMK-DEP-33's
  first sentence, "Link one copy of each library" (MUST).

## Scenario B: an ExternalProject superbuild whose inner configure sees another prefix

The fixture is `$S/B/sb`, a real-world superbuild shape. It runs
`find_package(json-c CONFIG)` and builds json-c 0.18 into a stage only if that
lookup misses. Then `ExternalProject_Add(app ... CMAKE_ARGS -DCMAKE_PREFIX_PATH=${CMAKE_PREFIX_PATH} ...)`.
The user configures with
`-DCMAKE_PREFIX_PATH=$S/pfx/sdk;$S/pfx/json-c-0.18`, and the shell has
`CMAKE_PREFIX_PATH=$S/pfx/json-c-0.17`. The outer lookup finds 0.18, so nothing
is built. ExternalProject splits the list at `;`, so the inner configure gets
`-DCMAKE_PREFIX_PATH=$S/pfx/sdk` plus a stray positional path. The inner
configure then falls through to the environment's 0.17.

Symptom (3.31.12, 4.3.4 and 4.4.2, configure and build exit 0):
`json-c runtime 0.17, built against 0.17`. The inner configure printed
`CMake Warning: Ignoring extra path from command line: ".../json-c-0.18"` twice,
but only when its configure step ran: 2 on the 3.31.12 and 4.3.4 passes and 0
on the 4.4.2 pass, where ExternalProject skipped an unchanged configure step.
`app-prefix/tmp/app-cfgcmd.txt` records
`-DCMAKE_PREFIX_PATH=.../sdk;.../json-c-0.18` as two list items.

| Step | What the skill said | What happened | Verdict |
|---|---|---|---|
| B-a Before you start | gate per line | as A-a | Worked |
| B-b Step 1 | recursive cache grep, and the first matching row decides | exit 0, four lines from two caches: `build-4.4/CMakeCache.txt` has `json-c_DIR` on `.../json-c-0.18/...`, and `build-4.4/app-prefix/src/app-build/CMakeCache.txt` has `CMAKE_PREFIX_PATH` = `.../sdk` and `json-c_DIR` on `.../json-c-0.17/...` (all three). The `-r` printed the inner record, but no row reads two caches. The inner line matches "`dep_DIR` not under the current … `CMAKE_PREFIX_PATH` entry: a stale cache entry, or a rooted copy" | Misled |
| B-c Step 2 | `--fresh` reconfigure of the leg's tree | exit 0 on all three, `The file was found at .../json-c-0.18/.../json-c-config.cmake`. The inner configure does not run at configure time, so step 2 never searches for the artifact's copy | Stalled |
| B-d C2 re-grep | values that moved | "values unchanged" on all three, the inner cache included. The row's reading, "does not move: a rooted copy wins, or never a candidate", sends the reader to T1's roots, which are empty | Misled |
| B-e Step 3 | events per configure | count 1 in each log, found by `-r`: outer `path: .../json-c-0.18/...`, inner `.../json-c-0.17/...`, both with `version: ""`. Step 3 explains a blank version only for a `pkgRedirects` path | Stalled on the version |
| B-f C3 `ldd` | `BIN=build/app` | `ldd: build-4.4/app: No such file or directory`. The artifact is `app-prefix/src/app-build/app`, where `libjson-c.so.5 => .../json-c-0.17/lib64/libjson-c.so.5` and `RUNPATH [.../json-c-0.17/lib64]` | Worked once the binary was located: the outer record and the artifact differ |
| B-g C3 macro grep | over step 1's prefixes, a second hit is a bundled copy | two hits, `JSON_C_VERSION "0.18"` and `"0.17"`. The text reads that as "a copy another package bundles" (T14) | Wrong: json-c bundles nothing |
| B-h Step 2 on the inner tree | the reader improvises, using the arguments from `app-cfgcmd.txt` | 4.4.2 exit 0. `Ignoring extra path` printed twice, `The file was found at .../json-c-0.17/...`, and 0.18 never appears as a candidate (2 matches, both in the warning) | Worked (C4: never listed) |
| B-i C4 route | "never listed: the search space (T1, T3)" | T1's never-listed branch is cross-build only, and T3 is a provider's scope. Neither names a nested configure's forwarded arguments, and no rule owns them | Stalled |
| B-j The fix and C2 | reconfigure after the fix | `CMAKE_CACHE_ARGS "-DCMAKE_PREFIX_PATH:STRING=${CMAKE_PREFIX_PATH}"` gave 0.18 on new trees (3.31.12, 4.3.4, 4.4.2). Applied in place with outer `--fresh`, the inner cache got the full `CMAKE_PREFIX_PATH:STRING=...sdk;...json-c-0.18`, but `json-c_DIR` stayed on 0.17 and the app printed 0.17 (3.31.12 and 4.4.2). An inner `--fresh -C app-prefix/tmp/app-cache-.cmake` gave 0.18 | Misled: `--fresh` is the documented reset |
| B-k Side effect of step 2 | pass "the same `-D` hints and `--toolchain`" | the literal command omits `-G`, so `--fresh` switched the outer tree to Unix Makefiles. The next `cmake --build` exited 2 with `Error: generator : Unix Makefiles Does not match the generator used previously: Ninja` from the inner tree (3.31.12, 4.3.4, 4.4.2) | Misled |

## Classification

Category: (i) the class check caught it, (ii) a known class the check missed,
(iii) a new class, (iv) a plain text defect.

| # | Problem | Cat. | Class | Evidence |
|---|---|---|---|---|
| 1 | The artifact loads another copy than every step 1 to 3 record names (A) | i | C3 | A-g: `ldd` shows 1.5.6 against `zstd_DIR` 1.5.7 |
| 2 | The artifact's copy differs from the superbuild's record (B) | i | C3 | B-f: the inner binary loads 0.17, and the outer `json-c_DIR` is 0.18 |
| 3 | pkg-config's record (`pkgcfg_lib_<P>_<lib>`, `<P>_VERSION`, a `find-v1` event) is invisible to step 1's `^NAME_DIR` grep and step 3's `find_package-v1` pattern | ii | C5 | A-e, A-j. The C5 record table has no pkg-config row |
| 4 | The C3 macro grep takes its prefixes from step 1, so a copy step 1 never names passes as one hit | ii | C3 | A-h: 1 hit, a false pass |
| 5 | The C3 macro grep calls any second hit a bundled copy | ii | C3 | B-g: two hits from two lookups, routed to T14 |
| 6 | Outer `--fresh` never resets a nested configure's cache. After the fix the inner `json-c_DIR` stayed stale | ii | C2 | B-j: 0.17 until the inner `--fresh` (3.31.12, 4.4.2) |
| 7 | A never-listed candidate in a nested configure has no route: its arguments are the search space, and the list split in `CMAKE_ARGS` truncated it | ii | C4 | B-h, B-i. C4 detected it, and the route and the owning rule are missing |
| 8 | Step 1's last row assumes one lookup: a right `_DIR` plus another runtime version goes only to T11 or T14 | iii | C8 | A-b |
| 9 | Step 2's output carried the tells of a second lookup (`Found libzstd, version 1.5.6`, the ungated runtime-path cycle warning), and no reading covers them | iii | C8 | A-c, all three versions |
| 10 | C3's route sent a build-tree RUNPATH that names two directories for one SONAME to T11, which cannot explain it | iii | C8 | A-i |
| 11 | Two caches from two configures in the step 1 output, and the triage reads the one that did not build the artifact | iii | C8 | B-b, B-c, B-f |
| 12 | Step 3 gives no reading for `version: ""` beside a non-redirect path (a package with no version file) | iv | — | B-e: json-c 0.17 and 0.18 |
| 13 | Step 2's command omits the generator, so `--fresh` switches a Ninja leg to the default generator | iv | — | A-l, B-k: the superbuild build exits 2 |

Counts: (i) 2, (ii) 5, (iii) 4 problems of 1 new class (C8), (iv) 2.

## Fixes

Exact text for the skill and the rule set. None is applied here.

1. **C5, pkg-config's record** (`references/failure-modes.md`, the C5 record table). Add this row:

   ```text
   | pkg-config (`pkg_check_modules`, `pkg_search_module`) | `pkgcfg_lib_<PREFIX>_<lib>:FILEPATH=` and `<PREFIX>_VERSION`, `<PREFIX>_LIBDIR` `INTERNAL` lines under the call's prefix, never `<Pkg>_DIR`. A `find-v1` event (not `find_package-v1`) with `variable: "pkgcfg_lib_<PREFIX>_<lib>"`, and the console line `Found <module>, version`. `$ENV{PKG_CONFIG_PATH}` is searched before the `CMAKE_PREFIX_PATH`-derived directories (FindPkgConfig.cmake 4.4.2) |
   ```

2. **C3, the macro grep's prefixes** (SKILL.md, the T14 bullet under step 4). Replace
   "over each of step 1's prefixes" with "over each `-I` and `-isystem` directory
   on the artifact's compile lines (`build.ninja` `INCLUDES`, or `flags.make`)".
   Measured: A's `main.c` line held both `.../zstd-1.5.7/include` and
   `.../zstd-1.5.6/include`.
3. **C3, a second macro hit** (same bullet). Replace "A second hit is a copy
   another package bundles" with "A second hit under another package's include
   tree is a bundled copy. A second hit under the same package's other prefix is
   a second lookup (C8)".
4. **C2, nested configures** (`references/failure-modes.md`, the C2 sticky
   table, and SKILL.md's C2 row). Add this row:

   ```text
   | A nested configure's cache (ExternalProject `<name>-prefix/src/<name>-build`) | Its first configure step, then only when the recorded arguments change | `--fresh` on that tree, with `-C <name>-prefix/tmp/<name>-cache-.cmake` when the project uses `CMAKE_CACHE_ARGS`. Never the outer `--fresh` |
   ```

   Also append to the C2 "Ask" cell: "`--fresh` resets only the tree it names".
5. **C4, never listed in a nested configure** (the C4 table's "Never listed" row, Cause cell). Append
   ", or the arguments a nested configure received: ExternalProject splits a
   `CMAKE_ARGS` list at `;`, so `-DCMAKE_PREFIX_PATH=${CMAKE_PREFIX_PATH}` passes
   only the first entry (`<name>-prefix/tmp/<name>-cfgcmd.txt`, and
   `Ignoring extra path from command line` when that configure step runs)".
   In Fix at, add "the forwarding line (`CMAKE_CACHE_ARGS` with a `:STRING` type)".
   The rule it cites does not exist yet: see the MUST candidate below.
6. **(iv) Step 3, blank version.** After "with its `path:` in `pkgRedirects`
   and a blank found `version:` (4.3.4 and 4.4.2)", add: "A blank found
   `version:` beside any other path means the package ships no version file
   (json-c 0.17 and 0.18), so read its version macro (step 4's C3 grep)".
7. **(iv) Step 2, the generator.** Replace "Pass the same `-D` hints and
   `--toolchain` the leg passes" with "Pass the same `-G`, `-D` hints and
   `--toolchain` the leg passes: `--fresh` drops the cached generator, and a
   superbuild's next build then fails on its inner tree's generator (exit 2,
   3.31.12 to 4.4.2)".
8. **CMK-DEP-33, Verification column** (rules, handed back to the rule owner).
   Append: "and the artifact's link line lists one path per library:
   `grep -rn --include='build.ninja' --include='link.txt' -e 'libzstd' build`,
   naming the library. More than one directory for one library = finding, and
   empty = wrong name". Measured: 2 paths on the broken tree, 1 after the fix
   (4.4.2). The row's first sentence already owns scenario A, so this is no new
   MUST row.

## New classes

### C8 One library, several lookups

**Statement.** A library reaches one artifact through more than one lookup:
`find_package` beside `pkg_check_modules`, a Find module's separate `find_path`
and `find_library`, per-component lookups, two spellings of one package, or a
superbuild's outer `find_package` beside the inner configure's. Each lookup has
its own inputs, search order and record, so each can land on a different copy
with exit 0. A triage that reads one lookup's record credits it for the whole
artifact.

**Why no C1 to C7 covers it.** The lookup's record is read correctly and is a
real consumption record, so it is not C1. Nothing outlived a change, so it is
not C2. The other copy is resolved by a lookup, not substituted after one, and
not every record names the intended copy (`pkgcfg_lib_ZSTD_zstd` names 1.5.6),
so C3's statement fails. The expected copy was found by the lookup that was
read, so it is not C4. C5 covers reading one mechanism's record with another's
expectations, and fits only the narrow facet already filed as fix 1. The skill
assumes one lookup per library everywhere: step 1's last row, the C3 routes and
the stop condition's "which copy".

**Instances.** Scenario A and scenario B above (held out), and wave 6's FM19:
FindEXPAT took `expat.h` 2.8.5 from the sysroot and `libexpat.so` 2.7.3 from
the host. The generalizer filed FM19 under C5 for its misread version, but its
structure is two lookups landing on two copies.

**Check, as step 4's C8 row.** Ask: "Is every lookup that fed the artifact
accounted for?" Read from the artifact's side, not the lookup's:

```sh
LIB=libzstd
grep -rn --include='build.ninja' --include='link.txt' -e "$LIB" build
grep -rn --include='CMakeConfigureLog.yaml' -e "^    found: \"[^\"]*${LIB}" build
grep -rl --include='CMakeCache.txt' -e '^CMAKE_HOME_DIRECTORY' build
```

- **Link lines.** One directory per library passes. Two is the finding: A
  printed `.../zstd-1.5.6/lib64/libzstd.so` and `.../zstd-1.5.7/lib64/libzstd.so.1.5.7`,
  and the fixed tree printed one. For B the link line is the inner tree's
  (`.../json-c-0.17/lib64/libjson-c.so.5.3.0`), and it contradicts the outer
  `json-c_DIR`.
- **`found:` of `find-v1` events** (4.1 and newer). These are `find_library`
  answers, pkg-config's included, beside step 3's `find_package-v1` paths.
  Another prefix than step 3's is the finding: A 4.4.2 printed
  `.../zstd-1.5.6/lib64/libzstd.so` (exit 0), and the fixed tree printed
  nothing (exit 1). Empty output passes.
- **Configures in the tree.** One file passes. More than one means nested
  configures: the one whose tree holds the artifact is the record, and steps 2
  and 3 run on that tree with the arguments in `<name>-prefix/tmp/<name>-cfgcmd.txt`.
  B printed 2, and A printed 1.
- **Console tell.** `Cannot generate a safe runtime search path for target ... cycle ... [<soname>]`
  is ungated (exit 0 under `-Werror=dev` and `-Werror=author`) and means two
  directories hold one SONAME.

A failing answer goes to the owning rule: CMK-DEP-33 (resolve the library
once, so every consumer links one target), or the forwarding line in B.

Reproduction: `$S/run.sh`, sections "A", "B" and "proposed C8 check" (run.out, exit 0).

## MUST rows

- **None from A.** CMK-DEP-33 "Link one copy of each library" (MUST) owns it.
  Only its Verification column needs fix 8.
- **One candidate from B (rule gap).** No row in `rules/cmake-build/*.md` or
  `rules/cpp-packaging/*.md` covers what an ExternalProject configure receives.
  The grep for `ExternalProject`, `LIST_SEPARATOR` and `CMAKE_CACHE_ARGS` hits
  only DEP-01, DEP-03, MOD-09 and MOD-17, which cover pins, hashes and network.
  Draft text: "Forward a list-valued search variable (`CMAKE_PREFIX_PATH`,
  `CMAKE_MODULE_PATH`, `CMAKE_FIND_ROOT_PATH`) to an `ExternalProject_Add`
  configure through `CMAKE_CACHE_ARGS` with a `:STRING` type, or with
  `LIST_SEPARATOR`, never as `-D<VAR>=${list}` in `CMAKE_ARGS`". Measured:
  the `CMAKE_ARGS` form built 0.17 with exit 0 on 3.31.12, 4.3.4 and 4.4.2,
  and `CMAKE_CACHE_ARGS` built 0.18. The topic map filed build-time
  superbuilds as M-G-20 (uncovered, P2), and its corpus found no configure-time
  superbuild recursion. Admitting the row is the program's scope decision, not
  a measurement.

## Convergence reading

The held-out test does not confirm convergence. One new class (C8) came out of
two independent fresh scenarios, and it retro-fits an earlier instance (FM19).
That makes it a recurring mechanism, not one tree's detail. The five (ii)
problems are each fixed by one more line in an existing class's table. The
program stops on the next held-out round only if that round adds no class
beyond C8 and no MUST row.

## Wave 7 applied (2026-09-26)

Applier: opus. Scratch: `$S/applier/` (`verify.sh` and `c8check.sh`, output in
`verify.out` and `c8check.out`, both exit 0). Every build tree is new, and
`c8check.sh` also reads the holdout's `A/build-fix-4.4` without rebuilding it.

### Re-runs of the three most consequential claims

All three reproduced on new trees (`ocx package exec kitware/cmake:3.31` printed
`cmake version 3.31.12`, `:4.4` printed `cmake version 4.4.2`; ninja from
`ninja-build/ninja`; GNU grep).

| Claim | Command (in `verify.sh`) | Result |
|---|---|---|
| A: `zstd_DIR` on 1.5.7, app runs 1.5.6 | configure with `PKG_CONFIG_PATH=$S/pfx/zstd-1.5.6/lib64/pkgconfig`, `-G Ninja`, gate, `-DCMAKE_PREFIX_PATH=$S/pfx/zstd-1.5.7`, build, run | 3.31.12 and 4.4.2: configure, build, run exit 0, 1 `safe runtime search path` warning, `zstd runtime 1.5.6, core built against 10507, io built against 10506`, `zstd_DIR:PATH=.../zstd-1.5.7/lib64/cmake/zstd`, link paths `.../zstd-1.5.6/lib64/libzstd.so` and `.../zstd-1.5.7/lib64/libzstd.so.1.5.7`. `found:` grep: 4.4.2 exit 0 (`.../zstd-1.5.6/lib64/libzstd.so`, log line 2607), 3.31.12 exit 1 |
| B: `CMAKE_ARGS` list forwarding builds 0.17, `CMAKE_CACHE_ARGS :STRING` builds 0.18 (the MUST candidate) | `sb` and `sb-fix` on new trees, shell `CMAKE_PREFIX_PATH=$S/pfx/json-c-0.17` | 3.31.12 and 4.4.2: `sb` exit 0, 2 `Ignoring extra path`, `json-c runtime 0.17`, outer `json-c_DIR` 0.18, inner 0.17, 2 caches. `sb-fix` exit 0, 0 warnings, `json-c runtime 0.18`, both `json-c_DIR` 0.18 |
| B: outer `--fresh` leaves the inner cache stale, and step 2 without `-G` breaks the next build | 4.4.2, broken build, swap in the fix, outer `--fresh -G Ninja`, build; then outer `--fresh` without `-G`, build | outer `--fresh` exit 0, build exit 0, still `json-c runtime 0.17`, inner `CMAKE_PREFIX_PATH:STRING=.../sdk;.../json-c-0.18` beside `json-c_DIR:PATH=.../json-c-0.17/...`. Without `-G`: `CMAKE_GENERATOR:INTERNAL=Unix Makefiles`, build exit 2, `Does not match the generator used previously: Ninja` |

My first claim-3 attempt reused the claim-2 tree under a copied source
directory and got build exit 1 (`does not match the source ... used to
generate cache`). That was my fixture error, not the claim: a dedicated tree
reproduced it.

### Class decision

C8 is added as a class, not as an instance. Checked against every C1 to C7
statement in `fm-classes-triage.md`: the record read in A is a real
consumption record (not C1), one record names the other copy and nothing is
substituted after resolution (not C3), the read lookup found the expected
copy (not C4), and a correctly calibrated read still shows two records naming
two copies (not C5). Its facets that are C2, C4 and C5 were filed there. It
recurs across two held-out mechanisms and FM19, which moved from C5 to C8
(with step C-i). Reasoning is in `fm-classes-triage.md` C8.

### Applied

| # | Fix | Where |
|---|---|---|
| 1 | pkg-config record row (cache lines verified: `pkgcfg_lib_ZSTD_zstd:FILEPATH`, `ZSTD_LIBDIR:INTERNAL`, `ZSTD_VERSION:INTERNAL=1.5.6` on 3.31.12 and 4.4.2, `variable: "pkgcfg_lib_ZSTD_zstd"` in the 4.4.2 log, FindPkgConfig.cmake 4.4.2 lines 836 to 894) | `references/failure-modes.md` C5 table |
| 2 | Macro grep over the compile lines' include directories, with a new include grep in the C3 block. `grep -rho --include='build.ninja' --include='flags.make' -e '-isystem [^ ]*' -e ' -I[^ ]*' build` printed both `-isystem .../zstd-1.5.6/include` and `.../zstd-1.5.7/include` (4.4.2, exit 0), and the macro grep over them printed `RELEASE  6` and `RELEASE  7` | SKILL.md step 4 C3 block and T14 bullet, T14 entry row |
| 3 | A second macro hit under the same package's other prefix is C8, under another package's tree a bundled copy | SKILL.md T14 bullet |
| 4 | Nested configure row in the sticky table, and `--fresh` resets only the tree it names | `failure-modes.md` C2 table, SKILL.md C2 row |
| 5 | Never listed: a nested configure's forwarded arguments, fixed at the forwarding line | `failure-modes.md` C4 table, SKILL.md C4 row |
| 6 (iv) | Blank found `version:` beside a non-redirect path: no version file, read the macro | SKILL.md step 3 |
| 7 (iv) | Step 2 passes `-G` (`GEN=Ninja` added to the command), with the exit-2 consequence | SKILL.md step 2 |
| C8 | Step 4 row, a three-grep C8 block, C3 route, T11 note, step 1 last row and cache note, stop condition, evidence rule, class section with the table of second lookups and instances (FM19, held-out A and B), Find-module note in `reading-the-answers.md` | SKILL.md, both references, `fm-classes-triage.md` |

The C8 block, measured by `c8check.sh` (4.4.2 trees unless named):

| Tree | Link-line paths | `found:` grep | Caches |
|---|---|---|---|
| A broken | 2 (`zstd-1.5.6/.../libzstd.so`, `zstd-1.5.7/.../libzstd.so.1.5.7`) | exit 0, 1.5.6 | 1 |
| A fixed | 1 (1.5.7) | exit 1 | 1 |
| B broken | 1 (`json-c-0.17/.../libjson-c.so.5.3.0`), contradicting the outer 0.18 record | exit 1 | 2 |
| B fixed | 1 (0.18) | exit 1 | 2 |
| A broken, 3.31.12 | 2 | exit 1 (no `find-v1` before 4.1) | 1 |

Two caches on the fixed superbuild too, so the cache count routes to the inner
tree, it is not itself a finding. The skill says so.

Not applied: `LIST_SEPARATOR` as an alternative fix (not measured here).

Budget cuts to fit the additions (content moved, not dropped, where a
reference already held it): SKILL.md 450 (cap 450), the class list under
"Failure classes" became a pointer to step 4's table, the pinned-defaults
table became a paragraph, and T1, T3, T4, T5/T6/T12, T8/T9 and step 3 prose
was tightened. `failure-modes.md` 300 (cap 300): FM9, FM12, FM13, FM14, FM16
and FM18 evidence that `reading-the-answers.md` already carries now links
there. `reading-the-answers.md` 300 (cap 300), one sentence changed.

Checker: `check-artifacts.py` with the six `--forbid` operands on
`skills/cmake-dependency-triage` printed `clean`, exit 0.

### MUST rows

None added. A needs none (CMK-DEP-33 owns it). B's candidate passes the
reproduction and harm tests, but not the "an agent gets it wrong without being
told" test on evidence: the exemplar corpus (46 repos, 2026-09-26) has no
production `ExternalProject_Add` forwarding a list through `CMAKE_ARGS`
unescaped, while llvm, apache/arrow, qt/qtbase and grpc use `LIST_SEPARATOR`
or `CMAKE_CACHE_ARGS`. Superbuilds are M-G-20 (uncovered, P2). Handed back as
a scope decision with draft text, next free ID CMK-DEP-34.

### Handbacks

1. `rules/cmake-build/dependencies.md:138`, CMK-DEP-33, Verification cell. Replace it with:
   "`grep -rho --include='build.ninja' --include='link.txt' -e '[^ ]*/libfmt[.][^ ]*' build`, naming the library's file name: paths from one directory = pass, two directories = finding (a second lookup), empty = wrong name. Then `grep -rn --include='*.h' --include='*.hpp' -e 'define FMT_VERSION ' /usr/local/include /opt/spdlog/include`, naming the library's version macro and each `-I` or `-isystem` directory on the artifact's compile lines. One hit per macro = pass, a second hit = finding, empty = wrong macro or directory."
2. Owner decision, only if superbuilds enter scope: a new row in `rules/cmake-build/dependencies.md` after line 138:
   "| CMK-DEP-34 | Forward a list-valued search variable (`CMAKE_PREFIX_PATH`, `CMAKE_MODULE_PATH`, `CMAKE_FIND_ROOT_PATH`) to an `ExternalProject_Add` configure through `CMAKE_CACHE_ARGS` with a `:STRING` type, never as `-D<VAR>=${list}` in `CMAKE_ARGS`. | `CMAKE_ARGS` splits a list at `;`, so the inner configure gets the first entry, prints `Ignoring extra path from command line` only when its configure step runs, and falls back to the environment with exit 0. Measured 2026-09-26 on 3.31.12, 4.3.4 and 4.4.2 with json-c 0.17 and 0.18: the `CMAKE_ARGS` form built 0.17, `CMAKE_CACHE_ARGS` built 0.18. An outer `--fresh` never resets the inner cache. Floor: any. | `grep -rn --include='CMakeLists.txt' --include='*.cmake' -e 'CMAKE_PREFIX_PATH=\${' -e 'CMAKE_MODULE_PATH=\${' -e 'CMAKE_FIND_ROOT_PATH=\${' .`: a hit inside an `ExternalProject_Add` `CMAKE_ARGS` = finding, empty = pass. | MUST |"
   The triage skill would then cite CMK-DEP-34 in the C8 "Caches" bullet and add it to its MUST table (topic map note 3.1).

### Convergence

Not converged: this wave added one class (C8). No MUST row and no rule
failure mode were added.

## Handbacks applied (2026-09-26)

Applier: opus, rules owner. Scratch `R=/home/mherwig/.cache/cmake-measure-scratch/w7/handbacks-rules`.
`bash $R/run-dep33.sh` (reads the applier's existing A trees, no rebuild) and `bash $R/run-dep34.sh`
(new superbuild trees on 4.4.2, deleted after the run) reproduce the numbers below into
`run-dep33.out` and `run-dep34.out`, both exit 0.

| Check | Command | Version | Exit | Excerpt |
|---|---|---|---|---|
| DEP-33 link-line grep, A broken | `grep -rho --include='build.ninja' --include='link.txt' -e '[^ ]*/libzstd[.][^ ]*' applier/A-4.4` (and `A-3.31`) | 4.4.2, 3.31.12 trees | 0 | `.../zstd-1.5.7/lib64/libzstd.so.1.5.7` and `.../zstd-1.5.6/lib64/libzstd.so`: two directories |
| same, A fixed | on `A/build-fix-4.4` and `A/build-fix-3.31` | 4.4.2, 3.31.12 trees | 0 | `.../zstd-1.5.7/lib64/libzstd.so.1.5.7` only |
| same, wrong name | `-e '[^ ]*/libzstdx[.][^ ]*'` | n/a | 1 | empty |
| DEP-33 macro grep | `grep -rn --include='*.h' --include='*.hpp' -e 'define ZSTD_VERSION_RELEASE '` over both `-isystem` dirs, then the fixed one | n/a | 0, 0 | `RELEASE  6` and `RELEASE  7`, then `RELEASE  7` only |
| DEP-34 candidate, claim 2 | `sb` and `sb-fix` configured `--fresh -G Ninja -Werror=author` with shell `CMAKE_PREFIX_PATH` on json-c 0.17, built, run | 4.4.2 | 0, 0 | `sb`: 2 `Ignoring extra path`, `json-c runtime 0.17`, outer `json-c_DIR` 0.18, inner 0.17. `sb-fix`: 0 warnings, `json-c runtime 0.18`, both 0.18 |
| DEP-34 candidate Verification grep | the row's three-`-e` grep on `B/sb` and `B/sb-fix` | n/a | 0, 1 | `sb/CMakeLists.txt:19: CMAKE_ARGS -DCMAKE_PREFIX_PATH=${CMAKE_PREFIX_PATH}`, then empty |

1. **Applied** (handback 1). `rules/cmake-build/dependencies.md` CMK-DEP-33 Verification cell
   replaced with the handback's text verbatim, plus one dated sentence naming the zstd
   measurement. Severity unchanged (MUST). The file stays at 281 lines.
2. **Not applied, handed back to the owner** (handback 2). The measurement reproduces and the
   row's grep separates broken from fixed, but the handback is conditional on an owner scope
   decision (superbuilds, M-G-20, uncovered P2) that no one has made. The ledger's own MUST
   test also fails on the corpus (no production `ExternalProject_Add` forwards a list through
   `CMAKE_ARGS`). CMK-DEP-34 stays unminted. If the owner admits it, the row text in
   "Handbacks" item 2 applies as is after line 138.

Checker: `check-artifacts.py` with the six `--forbid` operands on `rules/cmake-build.md
rules/cpp-packaging.md` printed `clean`, exit 0. No new MUST row, no new rule failure mode.
