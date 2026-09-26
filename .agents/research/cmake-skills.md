---
title: "Procedures behind the two skills — cmake-dependency-triage and cmake-modernize (consolidation)"
topic: cmake-skills
model: opus
id_family: CMK-DEP, CMK-TGT
consolidates:
  - cmake-skills/dependency-triage-procedure.md
  - cmake-skills/modernize-procedure.md
inputs:
  - cmake-audit/exemplar-cmake-shape.md
  - cmake-audit/exemplar-deps-and-dual-build.md
  - cmake-audit/find-ocx-cmake-shape-and-contracts.md
  - cmake-audit/fleet-inventory-and-bazel-overlap.md
  - cmake-topic-map.md (conflict 15, Artifact set decision › Skills, Staged for wave 3 › 5, Wave 2 landed (e))
measured_here: cmake-skills/scratch/skills-consolidation/ (M-P, M-S, M-O, M-R, M-A below)
date: 2026-09-26
verified: 2026-09-26
---

# Procedures behind the two skills — consolidation

Two skills ship, as the map decided (conflict 15): `cmake-dependency-triage`
and `cmake-modernize`. This file specifies both procedures, mints the few
standards the triage dive found that no rule owns yet, and hands corrections
back to the families that own the rest. Binaries measured here: CMake
3.31.12 and 4.4.2 (`ocx package exec kitware/cmake:<line>`), Conan 2.32.0,
cmake-conan `develop2` at `b1593849dd`, ninja from the ocx mirror.

Five measurements were run for this consolidation (sources under
`cmake-skills/scratch/skills-consolidation/`, `run.sh` re-runs M-P and M-S):

- **M-P** — the real cmake-conan provider, per generator: what `find_program`
  and `find_library` see after the first `find_package`.
- **M-S** — the same, with the first `find_package` inside a subdirectory.
- **M-O** — `PATCH_COMMAND` under a `SOURCE_DIR` declare, a `GIT_REPOSITORY`
  declare, and a `FETCHCONTENT_SOURCE_DIR_<X>` override, on both lines, gated.
- **M-R** — a dependency declaring `cmake_minimum_required(VERSION 3.7...4.0)`
  under the gate on both lines.
- **M-A** — the modernize dive's as-subproject smoke command, as written, on 4.4.2 with Ninja.

## Verdict

1. **Both skills are procedures that cite rules. Neither mints standards for its own ordering.** The modernize dive's provisional `CMK-TGT-10..18` are withdrawn. `cmake-targets-and-abi.md` (conflict 11) already allocated `CMK-TGT-10..20`, and "skills carry procedures, rules carry standards" (map conflict 15). The dive's content rows are already `CMK-TGT-01/-03` and `CMK-INST-01`. *Binds: skill author.*
2. **Triage reads the cache before any debug flag.** "Which copy resolved" is answered first by `<Pkg>_DIR` against the current hint in `CMakeCache.txt`, then by a `--fresh` reconfigure with `--debug-find-pkg`, then (4.1+) by the configure log. On a reused tree, `--debug-find-pkg` lists only the cached candidate and prints the old answer with confidence. Measured (F2). This amends `CMK-DEP-17`'s order. *Binds: application consuming packages; module author.*
3. **What the cmake-conan provider exposes depends on the generator.** Under `CMakeConfigDeps` the provider includes `conan_cmakedeps_paths.cmake` once, at the first intercepted `find_package`. That sets `CMAKE_PROGRAM_PATH` and `CMAKE_LIBRARY_PATH` in that call's directory scope only (M-P, M-S). Under `CMakeDeps`, only `find_package` ever sees Conan content (M-P, F3). The triage dive's "never" and `CMK-TC-05`'s "later calls may see them" were each half right. `cmake_language(DEFER)` is not an ordering fix. *Binds: application using cmake-conan.*
4. **The 3.x remedy for a 3.5–3.9 dependency floor is a re-pin or a patch of that one line, never a warning switch** (new `CMK-DEP-30`, MUST). On 4.x the remedy stays `CMK-DEP-15`, with the value 3.10. *Binds: application consuming packages.*
5. **An override drops every patch** (new `CMK-DEP-31`, MUST). `FETCHCONTENT_SOURCE_DIR_<X>` skips the declare's `PATCH_COMMAND` on 3.31.12 and 4.4.2 (M-O). The triage dive's rule "a `SOURCE_DIR` declare skips the patch" is refuted: that form patches the named directory in place. *Binds: library shipping a package; recipe or port author; any CI offline probe.*
6. **cmake-modernize is ten ordered steps. It flags a legacy tree and never rewrites it wholesale, and it keeps the project's existing minimum.** Step 1 adds `...<max>`. Raising the minimum is the owner's compatibility decision, taken in its own diff. The configure gate is on locally from step 1; step 8 only wires it into CI. The end state is two green proofs: the `CMK-INST-01` round trip, and an as-subproject smoke that uses `ctest -N` and a target list. The dive's smoke command does not run (M-A). *Binds: library shipping a package.*
7. **find_ocx is a triage subject and a modernize no-op.** It violates `CMK-DEP-13` and `-14` (below), so it is the anonymised worked example for the stale-`_DIR` symptom. It has no compiled target, so modernize is vacuous for it. That matches `cmake-consumable-library.md` Verdict 7.

### Conflicts resolved

1. **ID collision.** The modernize dive minted `CMK-TGT-10..18`, and the two targets-and-abi dives minted `CMK-TGT-10..15` and `-10..13`. `cmake-targets-and-abi.md` allocated `-10..20` to its own standards. **Resolved:** the dive's IDs are withdrawn. Six of them are procedure gates in the skill below (no ID). `-13` duplicates `CMK-INST-01`, `-18` duplicates `CMK-CORE-05`, and `-11` duplicates the "flag, do not auto-rewrite" clause of `CMK-TGT-03`; all three are cited. The dependency-seam revision holds `CMK-DEP-19/-20`, and its cross-compile dive has not landed. This file therefore takes a reserved block, `CMK-DEP-30..32`, and leaves `-21..29` to that revision. The authoring pass may renumber the block only if it stays contiguous and no ID is reused.
2. **`CMK-DEP-17` order against triage F2.** `CMK-DEP-17` reads `--debug-find-pkg` first. The dive measured that flag printing a single cached candidate on a reused tree, silent on the changed `dep_ROOT`. **Resolved:** grep the cache first; run `--debug-find-pkg` only on a `--fresh` configure. The amendment is below, and the family owner applies it.
3. **`CMK-TC-05` against triage F3.** `CMK-TC-05` says later `find_*` calls "may see" Conan's paths and prescribes `DEFER`. The dive says no `find_*` other than `find_package` ever sees them. The dive ran only `CMakeDeps`, and M-P shows the paths do arrive under `CMakeConfigDeps`. The dive measured `DEFER` firing at the end of the directory (F3). `aminya__project_options@412045e1f1:src/Conan.cmake:239-248` uses it "to invoke conan even when there's no find_package". **Resolved:** the rule is generator- and scope-dependent, `DEFER` is removed as a remedy, and the amended text is handed to the CMK-TC owner.
4. **Triage rule 11 ("`SOURCE_DIR` skips `PATCH_COMMAND`") is refuted by M-O.** On both lines the patch ran and rewrote the declared directory in place (`VERSION 3.7` became `VERSION 3.10`). The trap that is real is the override: `-DFETCHCONTENT_SOURCE_DIR_OLD37=<pristine>` skips the patch, and the gate fails with rc 1 on both lines. **Resolved:** `CMK-DEP-31`.
5. **`CMK-DEP-15`'s `CMAKE_WARN_DEPRECATED` rationale.** Triage F6 measured `-DCMAKE_WARN_DEPRECATED=OFF` surviving `-Werror=dev` on 3.31.12 (rc 0), which contradicts "does not survive". It also silenced a deprecation in the project's own code under the same flag. **Resolved:** the verdict "never" stands for the stronger measured reason (it switches the gate off for the whole project). The rationale is amended.
6. **`CMK-VER-06`'s 3.x clause against the triage remedies.** `CMK-VER-06` says "On 3.x, patch or re-pin" in one clause, with no measurement and no list of what is forbidden. Map (e)1 routed the 3.x remedy to triage. **Resolved:** `CMK-DEP-30` owns the text and `CMK-VER-06` cites it.
7. **Modernize step 1 (`3.25...<max>`) against its libuv worked example (keeps `3.10`).** **Resolved:** the skill never raises an existing minimum. It adds `...<max>`, and if the minimum is below 3.10 it flags the consumer-gate hazard of `CMK-VER-05` to the owner. The program's 3.25 floor (`CMK-VER-03`) governs new code only.
8. **The modernize dive's as-subproject check.** `cmake --build . --target help --directory DIR` fails with "Unknown argument --directory" (M-A). Its regex, anchored on the Makefile help prefix `... ` followed by `test` or `example`, reads Makefile output only; Ninja prints `name: phony`, and project test targets rarely start with "test". The form `&& echo FAIL || echo OK` then prints OK on any error. **Resolved:** `ctest -N` from a `CTest`-including parent (the mechanism measured in `cmake-dependency-seam/resolution-order-and-providers.md` §7), plus a named-target grep over `--target help` output.
9. **libuv's "9 of 9 bare" (modernize §13).** A re-count at `libuv__libuv@abe835d413:CMakeLists.txt` finds 7 `target_link_libraries` calls, all bare, at lines 477, 494, 530, 727, 745, 747 and 763. **Resolved:** 7 of 7. libuv's 4 `CMAKE_C_FLAGS` hits (`:56,60,68,76`) are appends, so they are SHOULD under the amended `CMK-TGT-04`, not MUST.
10. **Modernize severity against the amended target rows.** The dive calls `CMK-TGT-04` SHOULD and guards `CMAKE_CXX_STANDARD` by the top-level check. `cmake-targets-and-abi.md` amended both: overwriting is MUST and appending is SHOULD, and the guard is `if(NOT DEFINED CMAKE_CXX_STANDARD)`. **Resolved:** the skill follows the amended rows.
11. **Gate placement.** The dive puts the configure gate at step 8. **Resolved:** every configure the skill runs uses the gate spelled for its binary (`CMK-CORE-01`) from step 1. Otherwise the floor step's exit check (the gate canary) has nothing to check. Step 8 only moves the gate into CI.
12. **Stale era claim in the triage dive.** Its "rules_foreign_cc 0.16.0 has no fixed default CMake" was refuted by frame correction 3 of the wave-2 harvest (tag `931cb33cf8` defaults to 3.31.12). **Resolved:** dropped. It was outside the dive's scope anyway.

## The ruleset

Only standards that a check over a tree, a preset or a CI file can catch get
an ID. Diagnosis order and step order are procedure: they live in the skill
sections below and cite IDs.

### CMK-DEP — consuming dependencies (`cmake-build/dependencies.md`)

#### Check 1: grep the tree, presets and CI for gate bypasses and patched dependencies

**CMK-DEP-30 — On CMake 3.x, clear a fetched or vendored dependency whose floor is 3.5–3.9 by re-pinning to a version that declares ≥3.10, or with a `PATCH_COMMAND` that rewrites that one `cmake_minimum_required` line (raise the minimum, or add `...<max>`). Never use `-DCMAKE_WARN_DEPRECATED=OFF`, `-Wno-dev`, `-Wno-deprecated`, `-Wno-error=deprecated` or a preset's `"warnings": {"deprecated": false}` as the remedy.**
- *Binds:* application consuming packages; library that fetches for its own tests.
- *Rationale:* `CMAKE_POLICY_VERSION_MINIMUM` does not exist on 3.31.12 (`versionadded:: 4.0`). Measured on 3.31.12 under `-Werror=dev` (triage F6):
  - The re-pin and the patch each configure with rc 0 and no warnings.
  - `-Wno-error=deprecated` leaves rc 1 in both flag orders, because the `dev` category escalates the same warning on its own.
  - `CMAKE_WARN_DEPRECATED=OFF` passes, but it also silences a deprecation in the project's own code. So it turns the gate off rather than scoping it.
  - `-Wno-dev` suppresses every author warning. It passes the gate only when it comes after `-Werror=dev` on the command line (rc 0); before it, rc 1 (verify wave 3).
  - `-Wno-deprecated` passes the gate on 3.31.12 in both flag orders and on 4.3.4 (rc 0), and it silences the project's own deprecations too. A preset's `"warnings": {"deprecated": false}` also passes on 3.31.12, even with `-Werror=dev` on the command line (verify wave 3).

  M-R shows the range form `3.7...4.0` configures with no deprecation line under the gate on both 3.31.12 and 4.4.2. It is the shape that `microsoft__vcpkg-tool@51bf87ca6e:cmake/FindCMakeRC.cmake:19-24` applies through `cmake/CMakeRC_cmake_4.patch`.
- *Verify:*
  ```sh
  grep -rnE --include='CMakeLists.txt' --include='*.cmake' --include='CMakePresets.json' --include='CMakeUserPresets.json' --include='*.yml' --include='*.yaml' -e 'CMAKE_WARN_DEPRECATED' -e 'Wno-dev' -e 'Wno-error=deprecated[^-a-z]' -e 'Wno-error=deprecated$' .
  ```
  ```sh
  grep -rnE --include='CMakePresets.json' --include='CMakeUserPresets.json' --include='*.yml' --include='*.yaml' -e '[[:space:]"]-Wno-deprecated[^-a-z]' -e '[[:space:]"]-Wno-deprecated$' -e '"deprecated"[[:space:]]*:[[:space:]]*false' .
  ```
  Empty = pass for both. Any hit that exists to get a dependency past the gate = finding. The two `Wno-error=deprecated` alternatives (followed by a non-letter, or at line end) keep the compiler flag `-Wno-error=deprecated-declarations` out, which otherwise floods arrow and qtbase. The second command covers CI and presets only: in `CMakeLists.txt` and `*.cmake`, `-Wno-deprecated` is almost always the GCC/Clang flag (12 corpus hits, all compiler flags), and the leading space or quote keeps `-DCMAKE_CXX_FLAGS=-Wno-deprecated` out. Behavioural check: configure under the gate on every CI line, logging to `logs/`, then `grep -rc --include='*.log' -e 'Deprecation' -e '(deprecated)' logs`. Every count 0 = pass; grep then exits 1, so read the counts, not the exit code. Any non-zero count (grep exits 0) = finding. 3.31.12 and 4.3.4 print the gated form as `CMake Deprecation Error`, 4.4.2 as `CMake Error (deprecated)` (M-O, verify wave 3).
- *Severity:* MUST (measured).
- *Floor:* any 3.x; `PATCH_COMMAND` in `FetchContent` 3.11. On ≥4.0, `CMK-DEP-15` with the value 3.10 applies instead.

**CMK-DEP-31 — Point an offline or override configure (`FETCHCONTENT_SOURCE_DIR_<X>`, including the `CMK-DEP-16` probe) only at source that already carries the declare's `PATCH_COMMAND` result. Prefer a re-pin to a patch when the dependency must also build from an override.**
- *Binds:* library shipping a package; recipe or port author; CI owner of the offline probe.
- *Rationale:* measured (M-O, 3.31.12 and 4.4.2). A `GIT_REPOSITORY` declare with a floor-fixing `PATCH_COMMAND` exits 0. The same configure with `-DFETCHCONTENT_SOURCE_DIR_OLD37=<pristine copy>` exits 1 on the unpatched floor, because the override skips the patch step. A patch that fixes code rather than the floor fails silently instead: the build is simply different. A `SOURCE_DIR` declare does run the patch, and it edits the named directory in place (M-O), so a `SOURCE_DIR` inside the repository makes a configure rewrite tracked files. In the corpus, `microsoft__vcpkg-tool@51bf87ca6e:cmake/FindCMakeRC.cmake:24` patches a CMake-4 floor. Its escape hatch is a found package (`VCPKG_DEPENDENCY_CMAKERC`, `:1-6`), not an override, which is the safe shape.
- *Verify:*
  ```sh
  grep -rn --include='CMakeLists.txt' --include='*.cmake' -e 'PATCH_COMMAND' .
  grep -rn --include='CMakeLists.txt' --include='*.cmake' --include='CMakePresets.json' --include='CMakeUserPresets.json' --include='*.yml' --include='*.yaml' --include='*.sh' -e 'FETCHCONTENT_SOURCE_DIR_' .
  ```
  The first command lists patched dependencies; empty = rule vacuous. The second lists overrides, including one a project passes into a nested build from CMake code (`apache__arrow@3ad410b7b1:cpp/cmake_modules/ThirdpartyToolchain.cmake:2203` hands `-DFETCHCONTENT_SOURCE_DIR_ABSL` to protobuf's `ExternalProject_Add`). An override naming a patched dependency whose directory lacks the patched line = finding (read it with `grep -rn --include='CMakeLists.txt' -e 'cmake_minimum_required' "$OVERRIDE_DIR"`, or the patch's changed line). Behavioural check: the `CMK-DEP-16` offline probe under the gate exits 0.
- *Severity:* MUST (measured).
- *Floor:* `FetchContent` and `FETCHCONTENT_SOURCE_DIR_<X>` 3.11. Measured 3.31.12 and 4.4.2.

#### Check 2: a CI assertion on the resolved copy

**CMK-DEP-32 — When a CI leg depends on a specific copy of a dependency (installed rather than fetched, or a given manager's tree), assert it after configure from `<Pkg>_DIR` in `CMakeCache.txt`.**
- *Binds:* application consuming packages; library whose CI tests the installed path.
- *Rationale:* measured (triage F1, both lines). With the installed copy on `CMAKE_PREFIX_PATH`, an `OVERRIDE_FIND_PACKAGE` declare still wins with no diagnostic. `dep_DIR` then reads `<build>/CMakeFiles/pkgRedirects`, and `--debug-find-pkg` never names the installed prefix. The redirect path is the one reliable tell. Arrow and protobuf use the override on purpose (deps audit §1), so a silent swap is a normal code path, not an exotic one.
- *Verify:* `NAME=dep; grep -rn --include='CMakeCache.txt' -e "^${NAME}_DIR" build`. A path under `CMakeFiles/pkgRedirects` = fetched. A path under the expected prefix = installed. Empty output = the package was never looked up, which is a finding when the leg expects it. The leg fails unless the path matches its expectation.
- *Severity:* SHOULD. The mechanism is measured; the need for a CI leg is argued.
- *Floor:* `CMAKE_FIND_PACKAGE_REDIRECTS_DIR` 3.24; the `_DIR` entry any.

#### Amendments to existing CMK-DEP rows (the family owner applies them; IDs stay stable)

| ID | Amendment | Evidence |
|---|---|---|
| `CMK-DEP-13` (MUST) | *Binds* adds "application consuming packages through a manager's toolchain". Re-pointing `VCPKG_INSTALLED_DIR` (or a triplet or Conan output folder) on a reused tree leaves `<pkg>_DIR` on the old tree. The fix is unchanged: a fresh tree, `--fresh` or `-U <pkg>_DIR`. | Triage F2v: vcpkg-tool 2026-09-26, two overlay-port builds; `widget_DIR` stayed on `installed-A` |
| `CMK-DEP-15` (MUST) | Set the value to **3.10**, not 3.5. 3.5 clears only the hard error and leaves "< 3.10 will be removed", which the gate turns into an error. Rewrite the `CMAKE_WARN_DEPRECATED` rationale: it survives `-Werror=dev` on 3.31.12, but it disables deprecation diagnostics for the whole project. Flag arrow's `3.5` value as a finding against the amended row while keeping arrow as the *shape* exemplar. | Triage F5 (4.4.2), F6 (3.31.12); map (e)1 |
| `CMK-DEP-17` (SHOULD) | Order: (1) `grep -rn --include='CMakeCache.txt' -e "^${NAME}_DIR" -e "^${NAME}_ROOT" build`, and never `cmake -L`, which omits `UNINITIALIZED` entries such as a plain `-D<Pkg>_ROOT`. (2) A `_DIR` under `CMakeFiles/pkgRedirects` means `OVERRIDE_FIND_PACKAGE`. (3) `--debug-find-pkg=<name>` on a `--fresh` reconfigure only. (4) On 4.1+, `found.path` of the last `find_package-v1` event. Never `cmake --graphviz`, which draws the target graph only. | Triage F1, F2 (both lines); graphviz rendered only the legend (4.4.2) |

#### Handed to other families

- **`CMK-TC-05` (MUST), CMK-TC owner.** Replace "or force one with `cmake_language(DEFER … CALL find_package …)`" with the following text. "With cmake-conan (`develop2` `b1593849dd`, Conan 2.32.0), `find_program`, `find_library` and `find_path` see Conan content only under the `CMakeConfigDeps` generator. They see it only after the *first* intercepted `find_package`, and only in that call's directory scope and in subdirectories added after it. Under `CMakeDeps` they never see it, and `CMAKE_PREFIX_PATH` stays empty under both. Put the first `find_package` of a Conan package in the top-level `CMakeLists.txt`, before any `add_subdirectory`. `DEFER` runs the call at the end of the directory, so it is not an ordering fix."
  - Mechanism: `conan-io__cmake-conan@b1593849dd:conan_provider.cmake:634-638` includes `conan_cmakedeps_paths.cmake` only inside the first-run branch of a `macro`.
  - M-P: after `find_package`, `CMAKE_PROGRAM_PATH` and `CMAKE_LIBRARY_PATH` hold the package's `bin` and `lib` under `CMakeConfigDeps` and stay empty under `CMakeDeps`.
  - M-S: with the first call in a subdirectory, the top-level `find_program` is NOTFOUND even after its own later `find_package` ("'conan install' already ran").
- **`CMK-VER-06`, CMK-VER owner.** Its 3.x clause becomes "see `CMK-DEP-30`".
- **Handed back, not re-owned:** `CMK-INST-01`'s round trip already declares a compiled consumer language. Triage F4 adds a second reason: a missing `find_dependency` stays green for a `LANGUAGES NONE` or interface-only consumer, and fails only at a compiled consumer's Generate step, identically on both lines.

#### The cmake-dependency-triage procedure

House shape: `skills/jvm-dependency-triage/SKILL.md` (stop condition, evidence rule, entry by symptom, MUST rows repeated, failure modes).

**Stop condition.** On a `--fresh` configure, `<Pkg>_DIR` names the copy you intended, and the check of the rule that fixed the cause passes. Otherwise the cause sits in the manager's resolution and is handed to `conan graph info` or to the vcpkg manifest (`CMK-CONAN`, `CMK-VCPKG`).

**The evidence rule.** Provenance comes only from the configure's own records: `CMakeCache.txt`, `CMakeFiles/pkgRedirects/`, and `CMakeFiles/CMakeConfigureLog.yaml` on 4.1+. It never comes from the call site, a green configure, a manager trace or a graph drawing.

**Pick the entry point by symptom.**

| # | Symptom | First command | How to read it | Fixing rule |
|---|---|---|---|---|
| T1 | Wrong copy or version found; a re-pointed hint had no effect | grep `NAME_DIR` and `NAME_ROOT` in `build/CMakeCache.txt` | A `_DIR` not under the current hint = stale cache (F2) | `CMK-DEP-13`, `CMK-DEP-17` (amended) |
| T2 | Installed copy ignored; fetched copy built | same grep | `_DIR` = `.../CMakeFiles/pkgRedirects` means an `OVERRIDE_FIND_PACKAGE` declare won (F1). `grep -rn --include='*.cmake' --include='CMakeLists.txt' -e 'OVERRIDE_FIND_PACKAGE' .` names the declaring line. `--trace-source=CMakeLists.txt` traces only files of that name, so it misses a declare in a module such as arrow's `ThirdpartyToolchain.cmake` | `CMK-DEP-07`, `-09`, `-32` |
| T3 | Conan provider active; `find_program` or `find_library` NOTFOUND | grep the configure's console output for `Loading conan_cmakedeps_paths.cmake`, or check that `build/conan/conan_cmakedeps_paths.cmake` exists. `CMakeConfigureLog.yaml` never carries it (0 hits under both generators) | Absent = `CMakeDeps`, so no `find_*` will see Conan. Present = check the call's directory against the first `find_package` (M-P, M-S) | `CMK-TC-05` (amended), `CMK-TC-04` |
| T4 | Consumer fails right after "Configuring done": "link interface of target … not found" | read the installed `<Pkg>Config.cmake` for `find_dependency` | Missing = the exporter never redeclared its dependency (F4) | `CMK-INST-03`, `CMK-INST-01` |
| T5 | 4.x: "Compatibility with CMake < 3.5 has been removed" | the error's file:line | A dependency's floor | `CMK-DEP-15` (value 3.10) |
| T6 | Gate error "Compatibility with CMake < 3.10 will be removed" | the error's file:line and `cmake --version` | 4.x → `CMK-DEP-15`; 3.x → `CMK-DEP-30` (F5, F6) | `CMK-DEP-15`, `-30` |
| T7 | Online configure passes; offline or override configure fails | grep `PATCH_COMMAND` and `FETCHCONTENT_SOURCE_DIR_` | An override of a patched dependency (M-O) | `CMK-DEP-31`, `CMK-DEP-16` |
| T8 | "Which version did Conan pick?" | `conan graph info .` with the build's profiles | The resolved node and revision. `conan graph explain` errors "There is no missing binary" on a resolved graph (F3); run it only for a missing binary | `CMK-CONAN` rows |
| T9 | vcpkg: wrong tree | grep `VCPKG_INSTALLED_DIR` and `NAME_DIR` in the cache | `_DIR` not under the current installed dir = T1 through vcpkg (F2v). `VCPKG_TRACE_FIND_PACKAGE` logs every call whoever answers it, and `vcpkg depend-info` reads only the manifest | `CMK-DEP-13` (amended) |
| T10 | Provider registered, never called | `-DCMAKE_PROJECT_TOP_LEVEL_INCLUDES=` value, then grep the project for the variable | A project-side `set()` or `list(APPEND)` displaced the user's provider | `CMK-TC-04` |

```sh
# T1/T2/T9 — the first read. NAME is the find_package name. Non-empty output is expected;
# the finding is a _DIR that is not under the current hint or installed dir.
NAME=dep
grep -rn --include='CMakeCache.txt' -e "^${NAME}_DIR" -e "^${NAME}_ROOT" -e '^VCPKG_INSTALLED_DIR' build
# Then, and only then, a fresh reconfigure with the search printed:
cmake -S . -B build --fresh --debug-find-pkg="$NAME"
# On 4.1+: 0 events after a real find_package ran = finding (CMK-DEP-17).
grep -rc --include='CMakeConfigureLog.yaml' -e 'kind: "find_package-v1"' build
```

**MUST rows this procedure repeats (bounded):** `CMK-DEP-13`, `-14`, `-15`, `-30`, `-31`; `CMK-TC-04`, `-05`; `CMK-INST-01`, `-03`.

**What it refuses.** It never "fixes" a floor with a global `CMAKE_POLICY_VERSION_MINIMUM` or a warning switch. It never deletes the build tree to hide a stale `_DIR` without first recording which `_DIR` was stale. It never edits a manager lockfile by hand (`CMK-CONAN-09`).

**Not demonstrated:** the positive output of `conan graph explain` on a real missing binary. `CMakeConfigDeps` under a multi-config generator. Whether build-context `tool_requires` binaries reach `CMAKE_PROGRAM_PATH` (M-P used a host requirement). The skill marks these steps "per docs".

### CMK-TGT — targets and usage requirements (`cmake-build/targets.md`)

**No new IDs** (conflict 1). The skill repeats the MUST rows below and
carries the procedure gates. Every gate is a skill step with a mechanical exit
check, not a rule.

**MUST rows cmake-modernize repeats:** `CMK-VER-01` (three-dot range); `CMK-CORE-01` (the gate, spelled per binary); `CMK-TGT-01` (keywords, library targets); `CMK-TGT-04` (overwrite half, as amended); `CMK-TGT-05` (`NOT DEFINED` guard, as amended); `CMK-TGT-09`; `CMK-DEP-07`; `CMK-INST-01` to `-06`; `CMK-INST-09`; `CMK-INST-15` to `-17` (CPS step only).

#### The cmake-modernize procedure

House shape: `skills/bazel-adopt/SKILL.md` (numbered steps, one exit check each, a stop condition that is a state on disk, and a migration plan file).

**Stop condition.** Two things hold, and every inventory hit is marked converted or flagged-not-converted in the plan file:
- the `CMK-INST-01` round trip exits 0 on every CMake line CI runs;
- the as-subproject smoke (step 7) passes.

**Entry check.** The unmodified tree configures and builds today. If it does not, run `cmake-dependency-triage` first.

| Step | Do | Exit check (the command whose result decides "done") | Cites |
|---|---|---|---|
| 0 Inventory | Run the TGT-01, TGT-03, TGT-04 and VER-05 greps, read-only. Write every file:line hit into the plan file with the step that will touch it | Plan file lists every hit (possibly none). No early-exiting reader under `pipefail` | `CMK-TGT-01/-03/-04`, `CMK-VER-05`, `CMK-CORE-05`, `CMK-LANG` |
| 1 Floor | Keep the existing minimum; add `...<max>`, where max is the newest CMake CI runs. Re-run the VER-05 grep over `_deps/`, `third_party/` and vendored trees | The floor grep below is empty, and the gate canary exits 1 on each CI binary | `CMK-VER-01/-02/-05`, `CMK-DEP-15/-30` |
| 2 Targets | Convert directory scope to `target_*`, one target at a time, leaves of the in-tree graph first | The TGT-03 grep, scoped to that target's directory, is empty | `CMK-TGT-03` |
| 3 Keywords | Name `PUBLIC`/`PRIVATE`/`INTERFACE` on that target. Default to `PRIVATE` unless the type appears in its installed headers. Add the namespaced `ALIAS` | The TGT-01 spot check returns only keyworded calls | `CMK-TGT-01/-02` |
| 4 Flags and standards | Replace flag overwrites with `target_compile_options`, a toolchain file or a preset. Use `target_compile_features(... cxx_std_NN)`. Set `CMAKE_CXX_STANDARD` only inside `if(NOT DEFINED CMAKE_CXX_STANDARD)`. No `file(GLOB)`, no literal `-Werror` or `/WX` | The TGT-04/-06/-07/-09 greps are empty on the target's files, and every new `CMAKE_*` name passes failure mode 8's placeholder-aware check against `cmake --help-variable-list` | `CMK-TGT-04..09`, `CMK-LANG-11` |
| 5 Top-level gating | Guard tests, examples, dev options and `CMAKE_BUILD_TYPE` defaulting on `PROJECT_IS_TOP_LEVEL` (3.21; shim below it, as in `gabime__spdlog@5b63780337:CMakeLists.txt:21-24`). Guard any non-test fetch the same way | Step 7's check (run it here too) | `CMK-DEP-07`, `CMK-TGT-17` |
| 6 Install and export | GNUInstallDirs-relative destinations, `configure_package_config_file`, `find_dependency` per dependency, `write_basic_package_version_file`, `NAMESPACE`, all in one diff | The round-trip script exits 0 and its leak greps are empty | `CMK-INST-01..06/-09` |
| 7 As-subproject smoke | Configure the tree under a parent that includes `CTest` | The smoke block below: `Total Tests: 0`, and no recorded developer-only target name in the target list | `CMK-DEP-07`, ctest-contract candidate 4 (CMK-TEST, ID pending) |
| 8 CI | Wire the gate per leg, a `.gersemirc` with `definitions`, `gersemi --check` (never `--diff`), and the round trip as its own job | The canary exits 1 on each leg's exact binary and flags. `gersemi --check` exits 0 | `CMK-CORE-01/-02/-04`, `CMK-MOD-15`, `CMK-INST-18` |
| 9 CPS and pkg-config (optional) | `install(PACKAGE_INFO)` behind `CMAKE_VERSION VERSION_GREATER_EQUAL 4.3`, once the namespace equals the package name, the schema is `simple`, and the genexes are configuration-only | The round trip on ≥4.3 ends in `/cps/<pkg>`; on 3.31 it ends in `/cmake/<pkg>`; both exit 0 | `CMK-INST-12/-14..17` |

```sh
# Step 1 exit: every floor carries a three-dot max. Empty output = pass.
# Lists a bare floor (3.10, 3.10 FATAL_ERROR, upper-case, a space before the paren)
# and a two-dot 3.15..4.3; a three-dot 3.15...4.3 is not listed (eight fixtures,
# verify wave 3). A floor split across lines is not seen.
grep -rniE --include='CMakeLists.txt' \
  -e 'cmake_minimum_required[[:space:]]*\([[:space:]]*VERSION[[:space:]]+[0-9]+(\.[0-9]+)*[[:space:]]*(FATAL_ERROR)?[[:space:]]*\)' \
  -e 'cmake_minimum_required[[:space:]]*\([[:space:]]*VERSION[[:space:]]+[0-9]+(\.[0-9]+)*\.\.[0-9]' .
```

```sh
# Step 7: as-subproject smoke. SRC = absolute library source, W = scratch dir,
# GATE = -Werror=author on 4.4+, -Werror=dev on 4.3 and older (CMK-CORE-01).
mkdir -p "$W/asub"
printf '%s\n' 'cmake_minimum_required(VERSION 3.25...4.4)' 'project(asub LANGUAGES C)' \
  'include(CTest)' "add_subdirectory($SRC lib-build)" > "$W/asub/CMakeLists.txt"
cmake -S "$W/asub" -B "$W/asub-build" -G Ninja "$GATE"
ctest --test-dir "$W/asub-build" -N > "$W/asub-tests.txt"
grep -r --include='asub-tests.txt' -e 'Total Tests: 0' "$W"
cmake --build "$W/asub-build" --target help > "$W/asub-targets.txt"
NAME=mylib_unit_tests
grep -r --include='asub-targets.txt' -e "$NAME" "$W"
```

The first `grep` must print a line; empty = tests leaked. The second `grep`
runs once per developer-only target name recorded from a top-level
configure. Empty = pass. `include(CTest)` in the parent turns
`BUILD_TESTING` on, which is the adversarial case measured in
`resolution-order-and-providers.md` §7. M-A measured the Ninja
`--target help` format (`mylib_examples_leaked: phony` listed, the guarded
`mylib_unit_tests` absent).

**Reviewable-unit limits.** Each of these ships in its own diff:
- a floor change;
- each target's conversion. Mutually independent leaves may share a diff.
- the first install/export. The four `CMK-INST` MUSTs it depends on land together in that one diff, with no `CMK-TGT` change riding along.
- CPS or pkg-config, only after the round trip is already green on its own.

Vendored and third-party subtrees are flagged, never entered.

**What it refuses to do automatically:**
- Raise an existing `cmake_minimum_required` minimum.
- Rewrite any file not named in the inventory.
- Touch a vendored subtree.
- Add `install(PACKAGE_INFO)` before the Config round trip is green on 3.31.
- Add `cmake-format` or `cmake-lint`.
- Edit `conanfile.*` or `vcpkg.json`. A Conan-1 token (`conan_basic_setup`, `conanbuildinfo.cmake`) in the tree stops the skill, which hands off to `cpp-packaging`.

## Applied to find_ocx and the exemplars

| Rule | Holds | Violated | New commitment |
|---|---|---|---|
| `CMK-DEP-13` (amended) | — | find_ocx working tree `ocx.cmake:1199-1201` writes `<name>_ROOT` `CACHE PATH … FORCE`, and `ocx.cmake` has no `_DIR CACHE` unset anywhere (grep empty) | The triage skill's T1 worked example (anonymised) |
| `CMK-DEP-14` | — | find_ocx docs `ocx.cmake:1061-1063` ("a following `find_package(<name>)` / `find_library` searches") and `examples/package/CMakeLists.txt:25-26` (`find_program`); the find_ocx audit §9 repeats the claim | — |
| `CMK-DEP-15` (value 3.10) | Shape: `apache__arrow@3ad410b7b1:cpp/cmake_modules/FindRapidJSONAlt.cmake:29-32` (set/restore) | The same site injects 3.5, which leaves a 3.5–3.9 dependency failing the gate (F5) | — |
| `CMK-DEP-30` | `microsoft__vcpkg-tool@51bf87ca6e:cmake/FindCMakeRC.cmake:19-24` patches CMakeRC's floor to `3.6...4.0` | `curl__curl@98519dac83:.github/workflows/non-native.yml:419` passes `-DCMAKE_WARN_DEPRECATED=OFF` in a `-DCURL_WERROR=ON` leg; `Tencent__rapidjson@24b5e7a8b2:appveyor.yml:107` passes `-Wno-dev` in CI | New for every application; find_ocx vacuous (fetches no CMake project). vcpkg ports passing `-Wno-dev` (`microsoft__vcpkg@c4ee5a52d7:ports/fmilib/portfile.cmake:31`) are not findings: a port build runs no gate |
| `CMK-DEP-31` | vcpkg-tool's CMakeRC escape is a found package, not an override (`FindCMakeRC.cmake:1-6`) | Outside vcpkg, two corpus files pass `FETCHCONTENT_SOURCE_DIR_`: `apache__arrow@3ad410b7b1:cpp/cmake_modules/ThirdpartyToolchain.cmake:2203` (absl into protobuf's nested build) and `grpc__grpc@0f8d72ed71:test/distrib/cpp/run_distrib_test_cmake_fetchcontent.sh:43`; whether either target declare carries a `PATCH_COMMAND` was not checked (verify wave 3). Exposure: vcpkg ports inject overrides into upstream builds (`microsoft__vcpkg@c4ee5a52d7:ports/launch-darkly-server/portfile.cmake:68-72`, `ports/wpilib/portfile.cmake:46`), so any `PATCH_COMMAND` on those upstream declares is dropped unless the port applies it itself; not checked per port. Arrow patches thrift and protobuf (`apache__arrow@3ad410b7b1:cpp/cmake_modules/ThirdpartyToolchain.cmake:1809,2084`) and would lose both under an override | New commitment for any repo that runs the `CMK-DEP-16` probe, and for port authors |
| `CMK-DEP-32` | — | No exemplar asserts the resolved copy. arrow and protobuf resolve by override or try-then-fetch (deps audit §1) with no CI check of which copy won | New |
| `CMK-TC-05` (amended) | `aminya__project_options@412045e1f1:src/Conan.cmake:239-248` uses `DEFER` for its stated purpose (make Conan run with no `find_package`) | The same file appends to `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` (`:237`): a `CMK-TC-04` violation already on record | — |
| modernize step 3 (`CMK-TGT-01`) | `ClickHouse__ClickHouse@0995a518a8:CMakeLists.txt:848` (0.8 % bare in core, per the modernize dive) | `libuv__libuv@abe835d413:CMakeLists.txt:477,494,530,727,745,747,763`: 7 of 7 bare (re-counted) | — |
| modernize step 5 | `friendlyanon__cmake-init@7e0c52fc73:cmake-init/templates/c/shared/CMakeLists.txt`; spdlog's shim | libuv, rapidjson, zlib and curl roots never reference `PROJECT_IS_TOP_LEVEL`. 87 of 101 non-Kitware `add_subdirectory(test*)` sites are unguarded (`cmake-testing-and-ci/ctest-contract.md` §7) | — |
| modernize step 6 (`CMK-INST-02/-05/-06/-09`) | libuv exports with `NAMESPACE libuv::` under `${CMAKE_INSTALL_LIBDIR}/cmake/libuv` with `write_basic_package_version_file` (`CMakeLists.txt:795-803`) | `Tencent__rapidjson@24b5e7a8b2:CMakeLists.txt:148,233` (prefix-absolute destination), `:227-230` (bare `CONFIGURE_FILE`), `:256` (`INSTALL(EXPORT …)` with no `NAMESPACE`); `/WX` at `:136-140` (`CMK-TGT-09`) | — |
| modernize step 8 (`CMK-INST-18`) | `curl__curl@98519dac83:tests/cmake/test.sh` | `libuv__libuv@abe835d413:.github/workflows/CI-sample.yml:1-30` (subproject only); `friendlyanon__cmake-init@7e0c52fc73:.github/workflows/ci.yml:113-120` (installs, never consumes) | — |
| cmake-modernize as a whole | — | — | Vacuous for find_ocx (`LANGUAGES NONE`, no `add_library`); its `-Werror=dev` CI legs already meet step 8's gate for the configure families, while the `-P` families remain ungated (`CMK-TEST-02`) |

## AI-agent failure modes

Ranked by how often they bite: a confident claim with no failing signal ranks first.

1. **Treating a green build and install, or a `LANGUAGES NONE` smoke, as proof of consumability.** *Check:* the `CMK-INST-01` round trip with a compiled consumer. F4 fails only at that consumer's Generate step.
2. **Reading `--debug-find-pkg`, or a green reconfigure, as "which copy".** *Check:* the cache grep first, then `--fresh` (`CMK-DEP-17` amended). Never `cmake -L`, never `--graphviz`.
3. **Getting past a floor error with a global switch** (`CMAKE_WARN_DEPRECATED=OFF`, `-Wno-dev`, `-Wno-deprecated`, a preset's `"warnings": {"deprecated": false}`, a preset-level `CMAKE_POLICY_VERSION_MINIMUM`), or with the value 3.5. *Check:* the two `CMK-DEP-30` greps and the `CMK-DEP-15` grep; `grep -rc --include='*.log' -e 'Deprecation' -e '(deprecated)' logs` over the gated configure logs reads 0 per file (grep exits 1).
4. **Emitting `CMAKE_POLICY_VERSION_MINIMUM` for a 3.x build.** It is 4.0+. 3.31.12 does not reject it: the configure exits 0 with "Manually-specified variables were not used", so nothing happens (measured here). The triage dive's "unknown option" wording is corrected. *Check:* `cmake --version` before choosing between T5/T6 and `CMK-DEP-30`.
5. **Rewriting a legacy tree in one pass.** *Check:* the diff touches only files named in the plan file's inventory (`CMK-TGT-03`'s flag clause), and one target per diff.
6. **Assuming a dependency provider widens search paths like a toolchain file, or that `DEFER` makes a call run earlier.** *Check:* grep the configure's console output for `Loading conan_cmakedeps_paths.cmake` (not `CMakeConfigureLog.yaml`, which never carries it). Absent = no `find_*` sees Conan (M-P). `DEFER` fires at the end of the directory (F3).
7. **Passing `FETCHCONTENT_SOURCE_DIR_<X>` for a patched dependency.** *Check:* the two `CMK-DEP-31` greps.
8. **Inventing a variable** (`CMAKE_CXX_STANDARD_EXTENSIONS`, `CMAKE_DEBUG_PREFIX_MAP`). *Check:* the list prints per-language names in placeholder form (`CMAKE_<LANG>_FLAGS`), so a raw exact match reports the real `CMAKE_CXX_FLAGS` and `CMAKE_CXX_COMPILER` as invented (count 0, verify wave 3 on 4.4.2). Expand the placeholders first:
   ```sh
   NAME=CMAKE_CXX_STANDARD_EXTENSIONS
   mkdir -p varcheck
   cmake --help-variable-list > varcheck/vars.txt
   sed -e 's/<LANG>/C/g' varcheck/vars.txt > varcheck/c.txt
   sed -e 's/<LANG>/CXX/g' varcheck/vars.txt > varcheck/cxx.txt
   sed -e 's/<CONFIG>/[A-Z]+/g' -e 's/<[^>]*>/[A-Za-z0-9_]+/g' varcheck/c.txt varcheck/cxx.txt > varcheck/patterns.txt
   printf '%s\n' "$NAME" > varcheck/name.txt
   grep -rcxE --include='name.txt' -f varcheck/patterns.txt varcheck
   ```
   Count 0 = invented (`CMK-LANG-11`); count 1 = a documented name. Measured: `CMAKE_CXX_STANDARD_EXTENSIONS`, `CMAKE_DEBUG_PREFIX_MAP` and `CMAKE_CXX_FLAGZ` read 0; `CMAKE_CXX_FLAGS`, `CMAKE_CXX_FLAGS_RELEASE`, `CMAKE_CXX_COMPILER`, `CMAKE_C_COMPILER_LAUNCHER` and `CMAKE_POLICY_DEFAULT_CMP0077` read 1. For another language, add its `sed` line.
9. **Raising a project's `cmake_minimum_required` minimum while "modernizing", in the same diff as content changes.** *Check:* the floor diff touches only `cmake_minimum_required` lines.
10. **Taking a manager's trace as provenance** (`VCPKG_TRACE_FIND_PACKAGE`, `vcpkg depend-info`, `conan graph explain` on a resolved graph). *Check:* the cache grep (T9); `conan graph info` for Conan (T8).
11. **Copying an unrun verification command.** The modernize dive's `cmake --build . --target help --directory` fails, and its `|| echo OK` prints OK anyway (M-A). *Check:* every shipped command is run once on 3.31.12 and 4.4.2 before it ships. The skill's greps end in a stated empty-output reading, never an `echo`.
12. **Citing the CMake Tutorial by its pre-4.x step titles.** At `v4.4.2` it is organised as topic pages. *Check:* fetch the page at the pinned tag before citing it.

## Open questions

**Owner decisions** (defaults apply if unanswered):
1. **Accept the amendments to `CMK-DEP-13/-15/-17`, `CMK-TC-05` and `CMK-VER-06`**, applied by the dependency-seam and versions-and-gate revisers with their IDs stable. *Default:* yes.
2. **Accept the reserved block `CMK-DEP-30..32`**, or renumber contiguously after the dependency-seam revision lands. *Default:* keep the block. Renumbering is safe only before the rule files are authored.
3. **Should cmake-modernize ever raise a minimum?** *Default:* no. It flags a minimum below 3.10 as a consumer-gate hazard and leaves the choice to the owner.
4. **Map Q4 (both skills or triage only).** Nothing here changes the default: both. Triage first.

**Another research round, by subarea:**
- **`dependency-seam` / providers.** Do build-context `tool_requires` binaries reach `CMAKE_PROGRAM_PATH` through `conan_cmakedeps_paths.cmake`? How does the file behave under a multi-config generator (M-P used one host requirement, single-config)? Does Conan's `CMakeToolchain` path, without a provider, differ?
- **`package-managers` / Conan diagnosis.** The positive output of `conan graph explain` on a real missing binary, needed for T8's second half.
- **`skills` / dry run.** Execute cmake-modernize end to end on full clones of libuv and rapidjson. Record per-step diff sizes, whether the reviewable-unit limits hold in practice, and every command's real output on both lines. The dive worked from reads only.
- **`versions-and-gate`.** *Answered in verify wave 3:* `-Wno-deprecated` clears the gate on 3.31.12 (both flag orders), on 4.3.4, and on 4.4.2 when it comes after `-Werror=author` (rc 0). Before the gate on 4.4.2 it does not (rc 1). `CMK-DEP-30` now forbids it and greps for it. Still open for the CMK-CORE owner: whether `CMK-CORE-01`'s canary should also run with the project's preset `warnings` block applied. A preset's `"deprecated": false` beat a command-line `-Werror=dev` on 3.31.12.

## Sub-artifacts

- [cmake-skills/dependency-triage-procedure.md](cmake-skills/dependency-triage-procedure.md): six deliberate failures (F1–F6, plus F2v through vcpkg) on 3.31.12 and 4.4.2 with the real cmake-conan provider, Conan 2.32.0 and vcpkg-tool 2026-09-26. Its rule 11 is refuted here (conflict 4), and its F3 generalisation is narrowed (conflict 3).
- [cmake-skills/modernize-procedure.md](cmake-skills/modernize-procedure.md): the ten-step procedure with worked lists for libuv and rapidjson. Its `CMK-TGT-10..18` are withdrawn (conflict 1), its smoke command is replaced (conflict 8), and its libuv count is corrected (conflict 9).
- [cmake-skills/scratch/dependency-triage/](cmake-skills/scratch/dependency-triage/): the dive's scratch projects and `run.sh`.
- [cmake-skills/scratch/skills-consolidation/](cmake-skills/scratch/skills-consolidation/): this file's M-P, M-S, M-O, M-R and M-A sources and `run.sh`.

## Key sources

| Source | Why |
|---|---|
| M-P and M-S (this file; Conan 2.32.0, cmake-conan `b1593849dd`, CMake 4.4.2) | Provider path exposure by generator and by directory scope; the amendment to `CMK-TC-05` |
| M-O and M-R (this file; 3.31.12 and 4.4.2, gated) | The override drops the patch (`CMK-DEP-31`), `SOURCE_DIR` patches in place, and a `...4.0` max clears the deprecation (`CMK-DEP-30`) |
| M-A (this file; 4.4.2, Ninja) | The modernize dive's smoke command fails ("Unknown argument --directory"); the Ninja help format |
| Triage F1, F2, F2v (`dependency-triage-procedure.md`) | `pkgRedirects` as the override tell; stale `_DIR` through plain CMake and through vcpkg; `-L` blind to `UNINITIALIZED` |
| Triage F4, F5, F6 | `find_dependency` visible only to a compiled consumer; 3.5 against 3.10; the four 3.x remedies measured |
| [`conan_provider.cmake`, develop2](https://raw.githubusercontent.com/conan-io/cmake-conan/develop2/conan_provider.cmake) (corpus `b1593849dd`, lines 575-681) | The `macro`, the first-run include of `conan_cmakedeps_paths.cmake`, and `BYPASS_PROVIDER` |
| [FetchContent.cmake @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Modules/FetchContent.cmake) | `OVERRIDE_FIND_PACKAGE` and the redirects directory (lines 211-226) |
| [cmake_language.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/cmake_language.rst) | `DEFER` runs "as if written at the end of the current directory's CMakeLists.txt" |
| [cmake-configure-log.7.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/cmake-configure-log.7.rst) | `find_package-v1` is `versionadded:: 4.1` |
| `microsoft__vcpkg-tool@51bf87ca6e:cmake/FindCMakeRC.cmake:1-25` and `cmake/CMakeRC_cmake_4.patch` | The corpus's real floor patch, with a found-package escape instead of an override |
| `microsoft__vcpkg-tool@51bf87ca6e:scripts/buildsystems/vcpkg.cmake:811-826` | `VCPKG_TRACE_FIND_PACKAGE` is a `find_package` macro override, not provenance |
| [PROJECT_IS_TOP_LEVEL.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/variable/PROJECT_IS_TOP_LEVEL.rst) | The step-5 guard and its 3.21 floor |
| [Mastering CMake: Converting Existing Systems To CMake](https://cmake.org/cmake/help/book/mastering-cmake/chapter/Converting%20Existing%20Systems%20To%20CMake.html) | Convert one subsystem at a time, the root of the leaves-first order |
| `cmake-dependency-seam/resolution-order-and-providers.md` §7 | `ctest -N` from a parent is the measured as-subproject test check |
| `cmake-targets-and-abi.md` conflict 11 and the TGT-04/-05 amendments | The ID allocation and severities this file follows |

## Revision log

Ledger: [cmake-skills/verification-wave3.md](cmake-skills/verification-wave3.md). Scratch: [cmake-skills/scratch/verify-skills/](cmake-skills/scratch/verify-skills/) (`run.sh`, `run.log`).

- 2026-09-26, verify wave 3: `CMK-DEP-30` now also forbids `-Wno-deprecated` and a preset's `"warnings": {"deprecated": false}`, and gains a second grep over CI and presets. Both cleared the gate on a 3.7-floor dependency: 3.31.12 (both flag orders, and the preset even with `-Werror=dev` on the command line), 4.3.4, and 4.4.2 with the flag after `-Werror=author`. The rationale also records that `-Wno-dev` passes only after `-Werror=dev`.
- 2026-09-26, verify wave 3: `CMK-DEP-30`'s behavioural check read "exit 0 with every count 0 = pass". `grep -rc` exits 1 when every count is 0, so that pass condition could never hold. It now reads the counts: all 0 = pass, any non-zero = finding.
- 2026-09-26, verify wave 3: `CMK-DEP-31`'s override grep now also scans `CMakeLists.txt`, `*.cmake` and `CMakeUserPresets.json`. The old scope missed arrow's `-DFETCHCONTENT_SOURCE_DIR_ABSL` in `ThirdpartyToolchain.cmake:2203`. The Applied row's "no corpus file outside vcpkg passes an override" is corrected: arrow and grpc do.
- 2026-09-26, verify wave 3: the step-1 floor grep missed `cmake_minimum_required (VERSION …)` with a space before the paren, as in `gflags__gflags@bdda022e7c:CMakeLists.txt:73` (`3.10 FATAL_ERROR`, a bare floor). Both patterns now allow the space. They were checked on eight fixtures.
- 2026-09-26, verify wave 3: T2 no longer names the declaring line with `--trace-source=CMakeLists.txt`. That option traces only files of that name, and a declare in a module file produced 0 trace lines (4.4.2). Arrow's seven `OVERRIDE_FIND_PACKAGE` declares all sit in a `.cmake` module. T2 now greps for `OVERRIDE_FIND_PACKAGE` instead.
- 2026-09-26, verify wave 3: T3 and failure mode 6 said "grep the configure log" for `conan_cmakedeps_paths`. `CMakeConfigureLog.yaml` has 0 hits under both generators. The tell is the console line `Loading conan_cmakedeps_paths.cmake`, or the file `build/conan/conan_cmakedeps_paths.cmake`.
- 2026-09-26, verify wave 3: step 4's exit check and failure mode 8 compared names with `cmake --help-variable-list` directly. That list uses placeholders, so the real `CMAKE_CXX_FLAGS` and `CMAKE_CXX_COMPILER` counted 0 ("invented"). The check now expands `<LANG>`, `<CONFIG>` and the other placeholders first.
- 2026-09-26, verify wave 3: the open question on `-Wno-deprecated` is answered by the measurement above. The preset-`warnings` gap is handed to the CMK-CORE owner.
- 2026-09-26, verify wave 3: the rapidjson "no `NAMESPACE`" citation moves from `:255` to `:256`. Line 255 is `INSTALL(TARGETS …)`, and the `INSTALL(EXPORT RapidJSON-targets …)` without a namespace is line 256.
