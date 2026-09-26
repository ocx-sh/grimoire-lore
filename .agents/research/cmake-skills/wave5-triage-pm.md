---
title: "Wave 5 — cmake-dependency-triage run literally through vcpkg and Conan"
date: 2026-09-26
model: opus
skill: skills/cmake-dependency-triage (SKILL.md and references/reading-the-answers.md, as of wave 4 applied)
measured_on: >-
  cmake 3.31.12, 4.3.4, 4.4.2 (also printed: 4.0.7, 4.1.6, 4.2.7) via ocx package exec kitware/cmake:<tag>;
  ninja 1.13.2; gcc 15.2.1 (C only); zig c++ wrapper as CXX for vcpkg's compiler detection
tools:
  conan: 2.32.0 (uvx conan==2.32.0, CONAN_HOME=$S/conan-home, conancenter)
  cmake-conan: develop2 at b1593849dd842c37ff198b9d3e7a6d4e03803121 (2026-06-05)
  vcpkg-tool: 2026-07-27-98d7cb0cf1f4686a3e43aa5672b6230c1d56bce8 (bootstrap-vcpkg.sh -disableMetrics from the root below)
  vcpkg registry: microsoft/vcpkg 11ace808cc8a3a941f386e33726b992b22ba9e5a (2026-09-26T01:08:15-07:00), cloned --depth 1, then unshallowed with --filter=blob:none (see A-side note)
  ports: cjson 1.7.19 (baseline), cjson 1.7.15#2 (override); Conan cjson/1.7.17, cjson/1.7.19, zlib/1.3.1
host copy: cJSON 1.7.15 built from source into $S/pfx/cjson-1.7.15 (the stand-in for "a copy on CMAKE_PREFIX_PATH")
scratch: /home/mherwig/.cache/cmake-measure-scratch/w5/triage-pm/ ($S). run.sh reproduces every number; run.out is its last full output (exit 0). Build trees kept, because rm -rf is refused by the session's permission policy.
---

# Wave 5 — cmake-dependency-triage through the two package managers

Wave 4 ran the triage on plain CMake only (cJSON two-copy scenarios). This wave
builds four real symptoms, two per manager, and plays the user: start from the
symptom, run the skill from its first step, and record each step's verdict.

| Scenario | Symptom the user reports | Worked | Stalled | Misled | Wrong |
|---|---|---|---|---|---|
| A1 vcpkg, version | Manifest says `"version>=": "1.7.15"`, the binary prints 1.7.19 | 4 | 1 | 1 | 0 |
| A2 vcpkg, copy | Switched the leg to the vcpkg preset, the binary still prints the host's 1.7.15 | 3 | 0 | 2 | 1 |
| **A total** | | **7** | **1** | **3** | **1** |
| B1 Conan explicit flow | `conan graph info` says cjson/1.7.19, the binary prints 1.7.17 | 2 | 1 | 2 | 0 |
| B2 cmake-conan provider | Conan installed cjson/1.7.19, the binary prints the host's 1.7.15 | 1 | 1 | 2 | 2 |
| **B total** | | **3** | **2** | **4** | **2** |

No scenario reached the stop condition from the skill's text alone. Each one
reached it with one extra read, given under "Fixes". Every scenario configures,
builds and runs with exit 0 under the per-line gate. None prints a warning that
the gate promotes.

Commands below are run from the scenario's source directory, with
`S=/home/mherwig/.cache/cmake-measure-scratch/w5/triage-pm` and `env.sh` sourced
(`use331`, `use43` and `use44` put that CMake first on `PATH` and set `GATE`).

## Scenario A: vcpkg

### A1 A floor that the baseline outranks

**Fixture** (`A/app/`): a manifest project with
`"builtin-baseline": "11ace808…"` and
`"dependencies": [{ "name": "cjson", "version>=": "1.7.15" }]`. The
`CMakeLists.txt` has `find_package(cJSON 1.7.15 CONFIG REQUIRED)`, and the
configure preset `vcpkg` sets `toolchainFile` and `VCPKG_TARGET_TRIPLET=x64-linux`.
The author wants 1.7.15, the version their production host runs.

**Symptom**: `cmake --preset vcpkg -B b44 -Werror=author` exits 0 on 3.31.12,
4.3.4 and 4.4.2. `vcpkg-manifest-install.log` shows
`cjson:x64-linux@1.7.19`, and the binary prints `header 1.7.19, library 1.7.19`.

| # | Step | What the skill said | What I ran | Command, version, exit, excerpt | Verdict |
|---|---|---|---|---|---|
| A1-a | Before you start | `cmake --version` picks `GATE` | `cmake --version` | 4.4.2 → `GATE=-Werror=author` (also on 3.31.12 and 4.3.4 with `-Werror=dev`) | worked |
| A1-b | Pick the entry point | The description lists "someone asks which version Conan or vcpkg picked". Row T9, whose first read is step 1 | Took T9 | none | worked |
| A1-c | Read order, step 1 | Grep the cache | Ran verbatim, `NAME=cJSON`, on `b44` | Exit 0: `VCPKG_INSTALLED_DIR:PATH=$S/A/app/b44/vcpkg_installed`, `cJSON_DIR:PATH=$S/A/app/b44/vcpkg_installed/x64-linux/share/cjson`. Row 5: the copy is right, so a wrong version is the manager's (T9) | worked |
| A1-d | Read order, step 2 | `--fresh` plus `--debug-find-pkg` | `cmake --preset vcpkg -B b44 --fresh "$GATE" -DCMAKE_POLICY_DEFAULT_CMP0170=NEW --debug-find-pkg=cJSON` | Exit 0 on all three lines: `The file was found at …/vcpkg_installed/x64-linux/share/cjson/cJSONConfig.cmake`. `_DIR` did not move. No version is printed, and none is promised | worked |
| A1-e | Read order, step 3 | The count grep, then the `name`/`path`/`mode` grep | Ran both verbatim | 4.3.4 and 4.4.2: count 1, `path: …/share/cjson/cJSONConfig.cmake`, `mode: "config"`. The same event also holds `version_request.version: "1.7.15"` and `found.version: "1.7.19"`, and the skill's pattern set drops both. On 3.31.12 the count is 0 and the skill offers no other version read. `set(PACKAGE_VERSION "1.7.19")` in `cJSONConfigVersion.cmake` beside `cJSON_DIR` answers it on every line | stalled |
| A1-f | T9 | "A wrong version is the manifest's baseline (CMK-VCPKG-01)" | Ran CMK-VCPKG-01's verification: `grep -rL --include='vcpkg.json' --exclude-dir=vcpkg --exclude-dir=vcpkg_installed --exclude-dir=build -e '"builtin-baseline"' .` | Exit 1, empty output: the rule passes, because the manifest has a baseline. T9 gives no read for the resolved version or its cause. The cause is that the baseline's cjson (`git show 11ace808:versions/baseline.json` → `{"baseline":"1.7.19","port-version":0}`) outranks the `version>=` floor. The fix, an `overrides` entry in the top-level manifest (CMK-VCPKG-02 permits it there), is named nowhere | misled |

**Stop condition**, reached with the reads added under Fixes:

- **Copy:** `cJSON_DIR` under `b44/vcpkg_installed`.
- **Version:** 1.7.19, from the version file, the `vcpkg_installed/vcpkg/status`
  `Version:` line, `vcpkg install --dry-run` (`cjson:x64-linux@1.7.19`), or
  4.1+'s `found.version`.
- **Mechanism:** vcpkg takes the highest of the baseline's version and every
  `version>=` floor. The baseline says 1.7.19.
- **Fix** (`A/app-fix/`):
  `"overrides": [{ "name": "cjson", "version": "1.7.15", "port-version": 2 }]`.
  4.4.2 configure exits 0 and logs `cjson:x64-linux@1.7.15#2`. The binary
  prints `header 1.7.15, library 1.7.15`, and 4.4.2's `found.version` is
  `"1.7.15"`.

### A2 A toolchain added to an existing build tree

**Fixture** (`A/app2/`): the same project with `find_package(cJSON CONFIG REQUIRED)` and
`"version>=": "1.7.18"`.

- **Day 1**, the user's pre-vcpkg setup:
  `cmake -S . -B b44 -G Ninja -DCMAKE_BUILD_TYPE=Release -DCMAKE_PREFIX_PATH=$S/pfx/cjson-1.7.15 "$GATE"`.
- **Day 2**, the switch to vcpkg on the same tree, the way an IDE or a
  developer does it: `cmake --preset vcpkg -B b44 "$GATE"`.

**Symptom**: day 2 exits 0 on 3.31.12 (`-Werror=dev`) and on 4.4.2
(`-Werror=author`). It prints one `CMake Warning (unused-cli): Manually-specified
variables were not used by the project: CMAKE_TOOLCHAIN_FILE VCPKG_TARGET_TRIPLET`,
and no `Running vcpkg install` line. The binary prints
`header 1.7.15, library 1.7.15`, while the manifest asks for 1.7.18 or newer.
Every later reconfigure is silent.

| # | Step | What the skill said | What I ran | Command, version, exit, excerpt | Verdict |
|---|---|---|---|---|---|
| A2-a | Before you start | `cmake --version` | as told | 3.31.12 and 4.4.2 | worked |
| A2-b | Pick the entry point | T9 "vcpkg: wrong tree or wrong version", first read step 1 | Took T9 | none | worked |
| A2-c | Read order, step 1 | Grep the cache, then read the table | Ran verbatim, `NAME=cJSON` | Exit 0 on both lines: `CMAKE_PREFIX_PATH:UNINITIALIZED=$S/pfx/cjson-1.7.15`, `CMAKE_TOOLCHAIN_FILE:FILEPATH=$S/vcpkg/scripts/buildsystems/vcpkg.cmake`, `cJSON_DIR:PATH=$S/pfx/cjson-1.7.15/lib64/cmake/cJSON`, and **no** `VCPKG_INSTALLED_DIR` line. No row reads a missing `VCPKG_INSTALLED_DIR`. Row 1 routes to "a stale cache entry, or a rooted copy", which is neither mechanism, and the cached toolchain line looks like proof that vcpkg is in play | misled |
| A2-d | references, Toolchain-injected paths | "The step 1 grep's `CMAKE_TOOLCHAIN_FILE` line names the one toolchain this build tree loaded" | `grep -rn --include='CMakeSystem.cmake' -e 'include(' b44/CMakeFiles` | Exit 1, empty on both lines: the tree loaded no toolchain. The cache records the day-2 value anyway. After `--fresh` the same grep prints `CMakeFiles/4.4.2/CMakeSystem.cmake:6:include("$S/vcpkg/scripts/buildsystems/vcpkg.cmake")` | wrong |
| A2-e | Read order, step 2 | `--fresh`, then re-grep. "A `dep_DIR` that moved to the hinted copy confirms a stale cache (T1)" | `cmake --preset vcpkg -B b44 --fresh "$GATE" -DCMAKE_POLICY_DEFAULT_CMP0170=NEW --debug-find-pkg=cJSON` | Exit 0 on both lines. vcpkg installs `cjson@1.7.19`, `VCPKG_INSTALLED_DIR` appears, `cJSON_DIR` moves to `b44/vcpkg_installed/x64-linux/share/cjson`, and the binary prints 1.7.19. The read is right, and `--fresh` is the fix | worked |
| A2-f | T1, the fix | "For a person, `--fresh`, a new build tree or `-U <Pkg>_DIR` is the fix" | Rebuilt the day-1/day-2 tree, then `cmake --preset vcpkg -B b44 -U cJSON_DIR "$GATE"` | Exit 0 on both lines. `cJSON_DIR` comes straight back to `$S/pfx/cjson-1.7.15/…`, and the binary prints 1.7.15. `-U` clears the entry but cannot load a toolchain, and the cached `CMAKE_PREFIX_PATH` still names the host prefix | misled |

**Stop condition**:

- **Copy:** the host prefix.
- **Mechanism:** a toolchain passed to an existing build tree is never loaded,
  because `CMakeSystem.cmake` is written once. vcpkg never ran, so its
  prepended prefix never existed.
- **Fix:** a new tree or `--fresh`. `-U` is not a fix.
- **Rule:** CMK-DEP-13 covers `--fresh` only by accident. The toolchain half has
  no owner (candidate MUST 1).

The same mechanism applies to switching a tree to `conan_toolchain.cmake`
(per mechanism, not measured).

### A side note: a shallow vcpkg root

The task's `git clone --depth 1` root fails A1 before CMake runs:
`error: git … read-tree 4a0cbb78… failed with exit code 128 … note: vcpkg was
cloned as a shallow repository. Try again with a full vcpkg clone.`, exit 1
(4.4.2). vcpkg loads the manifest of every version a `version>=` or
`overrides` names, and those git trees are not in a shallow clone.

- A baseline-only manifest on the same shallow root exits 0.
- `"version>=": "1.7.18"` exits 1 (run.sh, `A/shallow/`).
- `git fetch --unshallow --filter=blob:none origin` took 12 s and left a
  70 MB `.git`. vcpkg then fetches the needed blobs on demand, and A1 exits 0.

This fails loudly, so it is outside the triage. It is a candidate for
CMK-PKG-02's text (failure mode 6).

## Scenario B: Conan

### B1 The explicit flow after a requirement bump, without `conan install`

**Fixture** (`B/app/`): `conanfile.txt` with `cjson/1.7.17`, `CMakeDeps`,
`CMakeToolchain` and `cmake_layout`.

1. `conan install . --build=missing -c tools.cmake.cmaketoolchain:generator=Ninja`
   builds cjson/1.7.17 from source, exit 0. Then `cmake --preset conan-release`
   and a build: the binary prints 1.7.17.
2. The user bumps the requirement to `cjson/1.7.19` and re-runs
   `cmake --preset conan-release "$GATE"` and the build, both exit 0 on
   4.4.2. They never re-run `conan install`.

**Symptom**: the binary prints `header 1.7.17, library 1.7.17`. Run with the
build's profiles,
`conan graph info . --profile:host=default --profile:build=default` exits 0
and prints `cjson/1.7.19#bb87c8e7… - Downloaded (conancenter)`. The binary
line reads `- Missing` on a cache without 1.7.19 and `- Cache` once any other
build has fetched it (both seen, run.sh reruns show `- Cache`).

| # | Step | What the skill said | What I ran | Command, version, exit, excerpt | Verdict |
|---|---|---|---|---|---|
| B1-a | Before you start | `cmake --version` | as told | 4.4.2 | worked |
| B1-b | Pick the entry point | T8 "Which version did Conan pick?", first read `conan graph info`. The stop condition also says that a wrong version at configure time is "the manager's resolution" | `conan graph info . --profile:host=default --profile:build=default` | Exit 0: `Requirements … cjson/1.7.19#bb87c8e7…`. T8 calls this "the resolved reference", which contradicts the running binary, and no reading covers that contradiction. graph info answers "what would resolve now". Nothing in it describes the build tree | misled |
| B1-c | Read order, step 1 | Grep the cache | Ran verbatim on `build` | Exit 0: `CMAKE_TOOLCHAIN_FILE:FILEPATH=generators/conan_toolchain.cmake`, `cJSON_DIR:PATH=$S/B/app/build/Release/generators`. Row 5: "under the expected prefix. The configured copy is right", back to T8. Under Conan, `<Pkg>_DIR` always names the generators folder, whatever version it describes, so the row's inference is false here | misled |
| B1-d | Read order, step 2 | `--fresh` plus `--debug-find-pkg` | `cmake --preset conan-release --fresh "$GATE" -DCMAKE_POLICY_DEFAULT_CMP0170=NEW --debug-find-pkg=cJSON` | Exit 0: `The file was found at $S/B/app/build/Release/generators/cJSONConfig.cmake`. Accurate, but no new information | worked |
| B1-e | Read order, step 3 | Count, then `name`/`path`/`mode` | Ran both verbatim | 4.4.2: count 1, `path: …/generators/cJSONConfig.cmake`, `mode: "config"`. The event's `version: "1.7.17"` line, which the pattern set drops, is the contradiction with graph info's 1.7.19 | stalled |

**The read that answers it** (not in the skill):

```sh
grep -rn --include='*ConfigVersion.cmake' --include='*-config-version.cmake' --include='*-data.cmake' -e 'set(PACKAGE_VERSION ' -e '_PACKAGE_FOLDER_' build/Release/generators
```

On 4.4.2 this prints `cJSONConfigVersion.cmake:1:set(PACKAGE_VERSION "1.7.17")`
and `cJSON-release-x86_64-data.cmake:15:set(cjson_PACKAGE_FOLDER_RELEASE "$S/conan-home/p/b/cjson627703383b2a7/p")`.
That names the version and the Conan cache folder this tree consumes.

**Stop condition**:

- **Copy:** the 1.7.17 package folder.
- **Mechanism:** the generators folder is stale. It still describes the last
  `conan install`, and `cmake --preset` never re-runs one.
- **Fix:** CMK-CONAN-07's order, `conan install` then `cmake --preset`. After
  the fix the binary prints `header 1.7.19, library 1.7.19`, and the version
  file says 1.7.19.

### B2 The cmake-conan provider falls through to a host copy

**Fixture** (`B/prov/`): `conanfile.txt` with `cjson/1.7.19`, `CMakeConfigDeps`
(the pinned provider generator) and `cmake_layout`. The `CMakeLists.txt` still
reads `find_package(cJSON 1.7.15 EXACT CONFIG REQUIRED)` from before the bump.
The user's shell exports `CMAKE_PREFIX_PATH=$S/pfx/cjson-1.7.15`. The configure
is
`cmake -S . -B b44 -G Ninja -DCMAKE_BUILD_TYPE=Release -DCMAKE_PROJECT_TOP_LEVEL_INCLUDES=$S/cmake-conan/conan_provider.cmake "$GATE"`.

**Symptom**: on 3.31.12 and 4.4.2 the configure exits 0. Its console shows
`CMake-Conan: Loading conan_cmakedeps_paths.cmake file` and
`cjson/1.7.19#bb87c8e7… - Cache`, so Conan installed 1.7.19. The binary prints
`header 1.7.15, library 1.7.15`.

The variant B2b (`B/prov-missing/`) has cjson absent from the conanfile, which
requires only `zlib/1.3.1`, and a bare `find_package(cJSON CONFIG REQUIRED)`.
It shows the same symptom on 4.4.2: the provider never supplies cJSON, the
configure exits 0 and the binary prints 1.7.15.

The mechanism, read in `conan_provider.cmake` at b1593849:

- Line 665 tries `find_package(<Pkg> … BYPASS_PROVIDER PATHS <generators> NO_DEFAULT_PATH)`.
- When that fails, line 678 re-runs `find_package(<Pkg> ${ARGN} BYPASS_PROVIDER)`
  with CMake's full default search.

| # | Step | What the skill said | What I ran | Command, version, exit, excerpt | Verdict |
|---|---|---|---|---|---|
| B2-a | Before you start | `cmake --version` | as told | 3.31.12, 4.4.2 | worked |
| B2-b | Pick the entry point | T3 (find_program NOTFOUND), T8 (which version Conan picked), T10 (provider never called) | Read all 12 rows | None fits "the provider ran and the consumer got a non-Conan copy". T8's graph info repeats 1.7.19, which Conan did install | stalled |
| B2-c | Read order, step 1 | Grep the cache | Ran verbatim | Exit 0 on both lines: `CMAKE_PROJECT_TOP_LEVEL_INCLUDES:UNINITIALIZED=$S/cmake-conan/conan_provider.cmake`, `cJSON_DIR:PATH=$S/pfx/cjson-1.7.15/lib64/cmake/cJSON`. Row 3 expects no `_DIR` line under a `CMakeConfigDeps` provider, which the passing control confirms: `B/prov-ok` prints none. No row covers a `_DIR` line plus a provider. Row 1 routes to "a stale cache entry, or a rooted copy" | misled |
| B2-d | Read order, step 2 | "`The file was found at` … names the file that answered. `Package was found by the dependency provider` means a provider answered" | `cmake -S . -B b44 -G Ninja --fresh "$GATE" -DCMAKE_POLICY_DEFAULT_CMP0170=NEW -DCMAKE_BUILD_TYPE=Release -DCMAKE_PROJECT_TOP_LEVEL_INCLUDES=… --debug-find-pkg=cJSON` | Exit 0 on both lines. The output prints, in order: `The following configuration files were considered but not accepted: $S/B/prov/b44/conan/build/Release/generators/cJSONConfig.cmake, version: 1.7.19`, then `The file was found at $S/pfx/cjson-1.7.15/…/cJSONConfig.cmake`, then `Package was found by the dependency provider`. The skill treats the last two as alternatives and calls the provider the answerer. It never mentions the not-accepted line, which is the whole diagnosis. In B2b the not-accepted line is absent (nothing to reject), and the other two print the same way | misled |
| B2-e | Read order, step 3 | "A count of 0 on 4.1 or newer … is a finding, except for a provider under `CMakeConfigDeps` … neither of which logs an event (4.3.4 and 4.4.2)" | Ran both greps verbatim after step 2 | 4.4.2: count **3**. The first is the generators try, rejected with `reason: "insufficient_version"`. The second is the fallback, `path: $S/pfx/cjson-1.7.15/…`, `mode: "config"`, `version: "1.7.15"`. The third is `path: "dependency_provider::conan_provide_dependency"`, `mode: "provider"`, `version: ""`. The passing control (`B/prov-ok`) logs **2** on 4.3.4 and 4.4.2 (the generators copy with `version: "1.7.19"`, then the provider event) with `--debug-find-pkg`, and **0** without it. The exception holds only without the debug flag, which the skill's own step order always passes. CMK-DEP-17's "`found.path` of the last event" reads the provider pseudo-path, not a copy. The events themselves do answer the question | wrong |
| B2-f | T1, from row 1 | "`_DIR` stays put under `--fresh`. A rooted copy won: `CMAKE_FIND_ROOT_PATH` or `CMAKE_SYSROOT` is non-empty … Pin the copy with `<Pkg>_DIR` (CMK-DEP-21)" | `grep -c -e 'CMAKE_FIND_ROOT_PATH' -e 'CMAKE_SYSROOT' b44/CMakeCache.txt`, plus the configure log | 0 and 0: nothing is rooted. The branch's premise is false, and its fix (pin `_DIR`) would pin the host copy. The copy stays put because the provider's fallback finds it again on every configure | wrong |

**Stop condition**:

- **Copy:** the host prefix.
- **Version:** 1.7.15.
- **Mechanism:** cmake-conan's fallback `find_package(… BYPASS_PROVIDER)`
  after the generators copy (1.7.19) failed the `EXACT 1.7.15` request, or
  after Conan supplied nothing (B2b).
- **Fix:** align the request with the conanfile, or add the requirement. After
  the fix the passing control prints 1.7.19 and has no `cJSON_DIR` cache line.
- **Guard:** CMK-DEP-32's assertion, with a provider-aware reading (Fixes 9).

## Fixes

Line numbers refer to the files as of this wave (2026-09-26, after wave 4 was
applied).

1. **`skills/cmake-dependency-triage/SKILL.md:144`** (A1-e, B1-e, stalled). Add
   the version pattern to the second step-3 command:

   > `grep -rn --include='CMakeConfigureLog.yaml' -e '^    name: ' -e '^      path: ' -e '^      mode: ' -e '^      version: ' build`

   Add this to the paragraph after it (lines 152-154): "Each event prints its
   request's `version:` (under `version_request`) before the found copy's
   `version:`. A found version that differs from the one the manager reports
   is the finding. On 3.x, read the version file beside the step 1 `_DIR`:
   `grep -rn --include='*ConfigVersion.cmake' --include='*-config-version.cmake' -e 'set(PACKAGE_VERSION ' "$DIR"`
   with `DIR` set to that path."

2. **`skills/cmake-dependency-triage/SKILL.md:147-152`** (B2-e, wrong). Replace
   "except for a provider under `CMakeConfigDeps` and for a call answered by a
   FetchContent redirect (`dep_DIR` under `pkgRedirects`), neither of which
   logs an event (4.3.4 and 4.4.2)" with:

   > except for a call answered by a FetchContent redirect (`dep_DIR` under `pkgRedirects`), which logs no event (4.3.4 and 4.4.2). A cmake-conan provider logs events only under `--debug-find-pkg`: after step 2, expect one `mode: "config"` event per `find_package` the provider ran for the call, then one `mode: "provider"` event whose `path` is `dependency_provider::conan_provide_dependency`. The copy is the `config` event before it, never the provider event (cmake-conan `b1593849`, 4.3.4 and 4.4.2).

   Make the same change in CMK-DEP-17's Verification cell,
   **`rules/cmake-build/dependencies.md:136`**. Also replace "`found.path` of
   the last `find_package-v1` event" there with "`found.path` of the last
   `find_package-v1` event whose `mode` is not `provider`".

3. **`skills/cmake-dependency-triage/SKILL.md:107-113`** (A2-c, B1-c, B2-c,
   misled). Add these three rows to the step 1 table, and change the reading
   of row 5:

   > | `CMAKE_TOOLCHAIN_FILE` names `vcpkg.cmake`, and there is no `VCPKG_INSTALLED_DIR` line | vcpkg's toolchain never ran. A toolchain given to an existing build tree is recorded and never loaded. `grep -rn --include='CMakeSystem.cmake' -e 'include(' build/CMakeFiles` prints nothing | T9 |
   > | `dep_DIR` is present while `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` names cmake-conan with `CMakeConfigDeps` | The provider's generators-folder search failed, and its fallback `find_package` found another copy | T3 |
   > | `dep_DIR` is a Conan `generators` folder | Version-agnostic. The generators folder is the copy of record, and its version is read there, never from `conan graph info` | T8 |

   Row 5's reading becomes: "The configured copy is right. A binary that
   reports another version at run time is the loader: T11. Under Conan, first
   check that the row above does not apply. Otherwise a wrong version is the
   manager's".

4. **`skills/cmake-dependency-triage/SKILL.md:128-129`** (B2-d, misled). Replace
   the two bullets with:

   > - `The file was found at` followed by a path names the file that answered.
   > - `Package was found by the dependency provider` means the provider's macro returned success. Under cmake-conan it prints even when the answer came from CMake's default search: the macro retries `find_package(… BYPASS_PROVIDER)` without its generators path when the first try fails. Read the `The file was found at` path above it. A preceding `considered but not accepted: <build>/conan/…/generators/<Pkg>Config.cmake, version: X` names the Conan copy the consumer's version request rejected (3.31.12 and 4.4.2).

5. **`skills/cmake-dependency-triage/SKILL.md:175-181`** (A2-f, misled). Replace
   "For a person, `--fresh`, a new build tree or `-U <Pkg>_DIR` is the fix."
   with:

   > For a person, `--fresh` or a new build tree is the fix. `-U <Pkg>_DIR` is enough only when the toolchain did not change. A `CMAKE_TOOLCHAIN_FILE` or `--toolchain` given to an existing tree is recorded in the cache and never loaded, with one `unused-cli` warning and exit 0, so `-U` finds the old copy again (vcpkg-tool 2026-07-27, 3.31.12 and 4.4.2).

   At line 177, add "adding or changing `CMAKE_TOOLCHAIN_FILE`" to the list of
   re-points that leave the old copy in force.

6. **`skills/cmake-dependency-triage/SKILL.md:363-372`** (A1-f misled, A2-c).
   Replace the T9 body's version sentence ("A wrong version is the manifest's
   baseline (CMK-VCPKG-01).") with:

   > No `VCPKG_INSTALLED_DIR` line at all, while `CMAKE_TOOLCHAIN_FILE` names `vcpkg.cmake`, means the toolchain never ran on this tree: `--fresh` (T1). For the version, read what vcpkg installed, then why:
   >
   > ```sh
   > grep -rn --include='status' -e '^Package: ' -e '^Version: ' -e '^Status: ' build/vcpkg_installed/vcpkg
   > grep -rn -A3 --include='vcpkg-manifest-install.log' -e 'will be built and installed' -e 'already installed' build
   > ```
   >
   > The first prints `Package:`, `Version:` and `Status:` per entry, where only an `install ok installed` entry counts, and the second prints `<port>:<triplet>@<version>[#<port-version>]`. vcpkg takes the highest of the baseline's version and every `version>=` in the graph, so a floor never lowers the result. `git -C "$VCPKG_ROOT" show <baseline>:versions/baseline.json` holds the baseline's entry for the port. A version above the floor is the baseline winning, which is not a defect. When an exact version is required, it is an `overrides` entry in the top-level manifest (CMK-VCPKG-02), measured with cjson: `version>=` 1.7.15 on baseline `11ace808` installs 1.7.19, and `overrides` 1.7.15#2 installs 1.7.15.

7. **`skills/cmake-dependency-triage/SKILL.md:335-347`** (B1-b, misled). Insert
   after the first paragraph of T8:

   > `conan graph info` reports what the conanfile resolves to now. It does not report what a build tree consumes. That is the generators folder the last `conan install` wrote, and `cmake --preset` never re-runs it. Read the generators folder directly:
   >
   > ```sh
   > grep -rn --include='*ConfigVersion.cmake' --include='*-config-version.cmake' --include='*-data.cmake' -e 'set(PACKAGE_VERSION ' -e '_PACKAGE_FOLDER_' build
   > ```
   >
   > The version line and the package folder name the copy this tree builds against. A version that differs from graph info's means `conan install` did not run after the conanfile, profile or lockfile changed (CMK-CONAN-07) (Conan 2.32.0, `CMakeDeps`, 4.4.2).

8. **`skills/cmake-dependency-triage/SKILL.md:158-171`** (B2-b, stalled). Add a
   T13 row, and a section after T12:

   > | T13 | cmake-conan ran, and the consumer got a non-Conan copy or version | Step 1, then step 2 | A `dep_DIR` cache line under `CMakeConfigDeps`, and `considered but not accepted` naming the generators copy | CMK-DEP-32, CMK-CONAN-07 |
   >
   > ## T13 The provider ran, and another copy answered
   >
   > cmake-conan tries the generators folder first. When that `find_package` fails, it re-runs the call with CMake's full default search, and `--debug-find-pkg` still prints `Package was found by the dependency provider`. The first try fails in two cases: the consumer's version request is one Conan's copy does not satisfy (`EXACT`, or a major the version file rejects), or the conanfile does not list the package. Either way a copy on `CMAKE_PREFIX_PATH`, `<Pkg>_ROOT` or a system path wins with exit 0 (cmake-conan `b1593849`, Conan 2.32.0, 3.31.12 and 4.4.2). Fix the request or the conanfile, never the search path. A leg that must use Conan's copy asserts that step 1 prints no `<Pkg>_DIR` line for it (CMK-DEP-32).

9. **`rules/cmake-build/dependencies.md:137`** (CMK-DEP-32 Verification, B2).
   Append: "Under a cmake-conan provider with `CMakeConfigDeps`, the provider
   sets `<Pkg>_DIR` as a normal variable, so a Conan-supplied package has no
   cache line. Any `<Pkg>_DIR` cache line for a package the conanfile lists
   means the provider's fallback found another copy."

10. **`skills/cmake-dependency-triage/references/reading-the-answers.md:114-117`**
    (A2-d, wrong). Replace "The step 1 grep's `CMAKE_TOOLCHAIN_FILE` line names
    the one toolchain this build tree loaded." with:

    > The step 1 grep's `CMAKE_TOOLCHAIN_FILE` line names the toolchain the cache was last given, not the one the tree loaded. The loaded one is the `include(` line in `CMakeFiles/<version>/CMakeSystem.cmake`, which is written on the first configure only: `grep -rn --include='CMakeSystem.cmake' -e 'include(' build/CMakeFiles`. Empty output while the cache names a toolchain means it was given to an existing tree and ignored (3.31.12 and 4.4.2).

11. **`skills/cmake-dependency-triage/references/reading-the-answers.md:94`
    and `:96`** (B2-d, B2-e). Change row 94's meaning to "The provider macro
    returned. Under cmake-conan the answer may be its default-search fallback:
    read `The file was found at` and any `considered but not accepted` line
    above it". Change row 96 to: "…and no `find_package-v1` event without
    `--debug-find-pkg`. With it (step 2), one `mode: "config"` event names the
    generators copy, followed by a `mode: "provider"` event (4.3.4 and 4.4.2)".
    Add this row:

    > | cmake-conan with `CMakeConfigDeps` and a `<X>_DIR:PATH=` cache line outside `<build>/conan` | The provider's fallback `find_package(<X> ${ARGN} BYPASS_PROVIDER)` answered: the generators copy was rejected or absent (T13) |

12. **`skills/cmake-dependency-triage/references/reading-the-answers.md:162-180`**
    (A1-f). Add these two rows to the vcpkg table:

    > | `vcpkg_installed/vcpkg/status` `Version:` line, or `vcpkg-manifest-install.log` `<port>:<triplet>@<version>` | The version installed into this tree | Why that version: read the baseline's `versions/baseline.json` entry |
    > | `vcpkg install --dry-run` in the manifest directory | The versions the manifest resolves to now | What an existing build tree consumed |

    Also change "Its version record is the manifest's `builtin-baseline` …"
    by appending "The result is the highest of the baseline's version and every
    `version>=` in the graph. Only `overrides` pins below the baseline".

13. **Version dating, `SKILL.md:19-22`, `reading-the-answers.md:9-11`,
    `rules/cpp-packaging/vcpkg.md:18`.** These say "vcpkg-tool 2026-09-26".
    Bootstrapping from the registry root of the same day (`11ace808`), which is
    CMK-PKG-02's mechanism, yields vcpkg-tool **2026-07-27**
    (`scripts/vcpkg-tool-metadata.txt`). Everything this wave re-measured
    matched on 2026-07-27: `vcpkg_installed` under the build tree, and the
    `version>=` and `overrides` semantics. The rooted-copy claims were not
    re-measured. Name both: "vcpkg-tool 2026-07-27 (the tool
    registry root `11ace808` bootstraps) and 2026-09-26".

## Candidate new failure modes

Each was measured in this wave. None is in the skill or the rules today (grep
for `CMakeSystem`, `Manually-specified`, `shallow`, `graph info` and
`version>=` over `rules/` and `skills/`, 2026-09-26).

1. **Reading vcpkg's `version>=` as a pin.**
   - The baseline's version outranks a lower floor, so the result is the
     highest of the baseline and every floor.
   - Reproduction: `A/app`, `version>=` 1.7.15 on baseline `11ace808`. vcpkg
     installs 1.7.19 with exit 0, and `find_package(cJSON 1.7.15)` accepts it.
   - Only a top-level `overrides` pins 1.7.15 (`A/app-fix`).
   - CMK-VCPKG-11's rationale ("the lowest version that matches all
     constraints") is literally true but invites the misreading.
2. **A toolchain given to an existing build tree is never loaded.**
   - The cache records the new `CMAKE_TOOLCHAIN_FILE` anyway. One `unused-cli`
     warning prints on the first re-run, and it exits 0 under `-Werror=dev`
     (3.31.12) and `-Werror=author` (4.4.2). Later re-runs are silent.
   - The configure keeps the pre-toolchain copy. `-U <Pkg>_DIR` does not fix
     it, only `--fresh` or a new tree does.
   - Reproduction: `A/app2`, day 1 then day 2.
   - The tell: `CMakeSystem.cmake` has no `include(` line, and there is no
     `VCPKG_INSTALLED_DIR` cache line.
3. **`conan graph info` is not the build tree's record.**
   - After a conanfile, profile or lock change without `conan install`, the
     generators folder keeps the old version.
   - `<Pkg>_DIR` names that folder whatever version it describes, so the
     skill's step 1 row 5 and T8 both report "right copy, version 1.7.19"
     while 1.7.17 builds.
   - Reproduction: `B/app`, install 1.7.17, bump, `cmake --preset` (4.4.2,
     exit 0).
4. **cmake-conan falls through to CMake's default search**, and step 2 still
   says the provider found the package.
   - The generators-folder `find_package` fails when the consumer's request
     rejects Conan's version (`EXACT 1.7.15` against 1.7.19, `B/prov`) or when
     the conanfile lacks the package (`B/prov-missing`).
   - The provider then re-runs the call unrestricted. A host copy wins with
     exit 0 on 3.31.12 and 4.4.2, and `--debug-find-pkg` prints `Package was
     found by the dependency provider`.
   - The tell: a `<Pkg>_DIR` cache line under `CMakeConfigDeps`, plus
     `considered but not accepted … generators/…Config.cmake, version: 1.7.19`.
5. **Provider-answered calls log `find_package-v1` events only under
   `--debug-find-pkg`.**
   - The passing control `B/prov-ok` logs 0 events without the flag and 2
     with it (4.3.4 and 4.4.2). The failing `B/prov` logs 3. A plain Config
     find (`A/app`) logs 1 either way.
   - The outer event's `found.path` is
     `dependency_provider::conan_provide_dependency`.
   - This is a correction to a check (the skill's step-3 exception and
     CMK-DEP-17's "last event"), not a new MUST, like wave 4's failure mode 7.
6. **A shallow vcpkg root breaks any `version>=` or `overrides` that names a
   non-baseline version.**
   - The error is loud: `vcpkg was cloned as a shallow repository`, exit 1
     (`A/shallow`). A baseline-only manifest on the same root exits 0.
   - The failure appears the day someone adds the first floor, in CI that
     clones the root with `--depth 1`.
   - `git fetch --unshallow --filter=blob:none` (70 MB) is enough.
   - It is loud, so it is a CMK-PKG-02 text candidate, not a triage row.

## Candidate new MUST rows

Both are amendments to existing MUST rows, not new families. Each was measured
on 3.31.12 and 4.4.2 (candidate 2 on 4.4.2, 4.3.4 and 3.31.12).

1. **CMK-TC-03 (amendment, a clause on the existing MUST).**
   - Rule: "Give a build tree its toolchain on its first configure. To add or
     change `CMAKE_TOOLCHAIN_FILE` (a manager's included), configure a new
     tree or pass `--fresh`. A toolchain given to an existing tree is recorded
     and never loaded."
   - Verification:
     `grep -rn --include='CMakeSystem.cmake' -e 'include(' build/CMakeFiles`
     names the same file as `grep -rn --include='CMakeCache.txt' -e '^CMAKE_TOOLCHAIN_FILE:' build`.
     Empty output from the first while the second prints a line is the
     finding. Empty output from both means not applicable.
   - Rationale: the same class as TC-03's "a later write is a silent no-op",
     at the tree level instead of the file level.
2. **CMK-VCPKG-11 (amendment, a "never state" clause, the row is MUST).**
   - Rule: "Never state, generate or assume that `version>=` selects that
     version. The baseline is a constraint too, so vcpkg installs the highest
     of the baseline's version and every floor. An exact version is an
     `overrides` entry in the top-level manifest (CMK-VCPKG-02)."
   - Verification is reading only: for each top-level `version>=`, compare it
     with the baseline's entry
     (`git -C "$VCPKG_ROOT" show <baseline>:versions/baseline.json`). If
     prose or a comment treats the floor as the installed version, that is
     the finding.
   - It could reasonably stay a SHOULD, because the check is a reading. It
     is listed here because the defect is silent and the existing MUST row
     already owns "never state as if".

Failure modes 3 to 5 are not MUSTs.

- **3** is already CMK-CONAN-07's order, plus CMK-PKG-04 in CI. It needs only
  the triage read.
- **4** is a provider-aware reading of CMK-DEP-32, which is a SHOULD, and stays
  a SHOULD (Fixes 9).
- **5** corrects a check.
- **6** is loud.

**Convergence:** this wave adds four silent failure modes (1 to 4) and two MUST
amendments, so the program has not converged. Wave 5 found nothing new in
T1's plain stale-cache path, T2, T5 to T7, T11 or T12, which these scenarios
did not reach.

## Wave 5 applied (2026-09-26)

Applier: opus. Files edited: `skills/cmake-dependency-triage/SKILL.md` (499
lines) and `references/reading-the-answers.md` (267 lines). `check-artifacts.py`
prints `clean`. No cmake fence was touched, so gersemi was not run.

### Spot-checks (re-run, `$S/applier-spot.sh`, output `$S/applier-spot.out`, exit 0)

| Claim | Command | Result on 4.4.2 |
|---|---|---|
| A1: `version>=` 1.7.15 installs 1.7.19, `overrides` installs 1.7.15 | `cmake --preset vcpkg -B b44 --fresh "$GATE" ...` in `A/app` and `A/app-fix` | exit 0 both. `cjson:x64-linux@1.7.19`, binary 1.7.19, `found.version: "1.7.19"`. Fix: `cjson:x64-linux@1.7.15#2`, binary 1.7.15. Reproduced |
| A2: toolchain on an existing tree is never loaded, `-U` does not fix | day 1, day 2 preset, `-U cJSON_DIR`, `--fresh` in `A/app2` | exit 0 throughout. `CMake Warning (unused-cli)` naming `CMAKE_TOOLCHAIN_FILE`, cache names `vcpkg.cmake`, `CMakeSystem.cmake` grep exit 1, `cJSON_DIR` on the host prefix before and after `-U`, binary 1.7.15. `--fresh`: `include(".../vcpkg.cmake")`, `_DIR` under `vcpkg_installed`, binary 1.7.19. Reproduced |
| B2 and FM 5: provider fallback answers with the host copy, events only under the debug flag | `B/prov` step 2 and `B/prov-ok` with and without `--debug-find-pkg` | exit 0. `considered but not accepted`, then `The file was found at`, then `Package was found by the dependency provider`. `cJSON_DIR` cache line on the host prefix, 3 events (`insufficient_version`, host `config`, `dependency_provider::conan_provide_dependency` `provider`). Control: 0 events without the flag, 2 with it, no `cJSON_DIR` line. Reproduced |

Also re-run: the shipped forms of the vcpkg `status` grep, the manifest-log
grep, the baseline `git show | jq` read, the 3.x version-file read on `b331`,
the tightened Conan generators grep (`_PACKAGE_FOLDER_[A-Z]* "`, which drops
the four `${..._PACKAGE_FOLDER_...}` reuse lines the ledger's pattern printed),
and 3.31.12's `CMakeSystem.cmake` `include(` line after `--fresh`. All exit 0.

### Changed in my files

- SKILL.md: fixes 1 to 8 applied, condensed. Step 1 gains three rows (vcpkg
  toolchain never ran, cmake-conan with a `_DIR` line, a Conan generators
  `_DIR`) and a first-match rule. Step 2's provider bullet, step 3's exception
  and version pattern, T1 (toolchain bullet, `-U` limit, T13 escape from the
  rooted-copy branch), T8 (generators-folder read), T9 (`status` read,
  baseline-wins rule), new T13, entry table rows T8, T9 and T13, stop
  condition (read what the manager wrote into the tree), preamble dating (fix
  13), MUST row 3 aligned with the DEP-13 handback, failure modes 12 to 15.
- To stay under 500 lines, the Conan lock greps and the 3.x version-file read
  moved to the reference file, and T2 to T12 prose was tightened with no fact
  dropped that the reference file does not also hold.
- reading-the-answers.md: fixes 10 to 13 applied (toolchain `CMakeSystem.cmake`
  read, provider rows 94 and 96 plus a fallback row and mechanism paragraph
  with `conan_provider.cmake` lines 665 and 678, vcpkg resolution rule, the
  `status` and `--dry-run` rows, the baseline read), plus the `graph info` note
  and the moved lock greps.

### New failure modes (SKILL.md list)

12 `version>=` read as the version installed. 13 a toolchain given to an
existing tree, then `-U`. 14 `conan graph info` taken as the tree's record.
15 trusting `Package was found by the dependency provider`.

### Handbacks (rule files, not mine)

- `rules/cmake-build/toolchains-and-providers.md:77` CMK-TC-03 (MUST, clause
  added, ID kept).
- `rules/cmake-build/dependencies.md:134` CMK-DEP-13 (MUST, `-U` limit).
- `rules/cmake-build/dependencies.md:136` CMK-DEP-17 (provider events).
- `rules/cmake-build/dependencies.md:137` CMK-DEP-32 (provider-aware reading).
- `rules/cpp-packaging/vcpkg.md:111` CMK-VCPKG-11 rationale (measured
  selection).

### Rejected

- CMK-VCPKG-11 "never state `version>=` selects that version" MUST clause:
  its check is a reading, and the measured rationale edit plus T9 and failure
  mode 12 cover the defect.
- Failure mode 6 (shallow vcpkg root) as CMK-PKG-02 text: loud, exit 1, and
  vcpkg's own message names the fix.
- Fix 13 at `rules/cpp-packaging/vcpkg.md:18`: that line states what the file
  was written against, which nothing falsified. The new measurements carry
  their own 2026-07-27 dating.
- Failure mode 5 as a new failure mode: it corrects a check (step 3, DEP-17),
  applied as a row edit.

Convergence: not converged. Four new failure modes and two MUST-row amendments
(TC-03, DEP-13), no new MUST row.

## Handbacks applied (2026-09-26)

Applier: opus. Scripts in `$S` (appended to `run.sh`): `handback-spot.sh`,
`handback-spot-b2.sh`, `handback-spot-a1.sh`, outputs beside them as `.out`,
all exit 0. vcpkg-tool `2026-07-27-98d7cb0c`.

| Handback | Result | Applied |
|---|---|---|
| CMK-TC-03 (MUST, clause) | A2 on 3.31.12 (`-Werror=dev`) and 4.4.2 (`-Werror=author`): day 2 exit 0 with 1 `not used by the project` line, day 3 exit 0 with 0 warnings, `CMakeSystem.cmake` `include(` grep exit 1 while the cache names `vcpkg.cmake`, `-U cJSON_DIR` exit 0 and still `pfx/cjson-1.7.15`, `--fresh` loads `vcpkg.cmake` and `_DIR` moves under `vcpkg_installed` | Rule, Rationale and Verification appended as handed back |
| CMK-DEP-13 (MUST, `-U` limit) | same A2 run | Rule and Rationale edited as handed back |
| CMK-DEP-17 (Fixes 2) | B2 on 4.3.4 and 4.4.2: exit 0, host `cJSONConfig.cmake` `config` event then `dependency_provider::conan_provide_dependency` `provider` event. Control: 0 events without `--debug-find-pkg`, 2 with it (`config`, `provider`) | Rule reads the last event whose `mode` is not `provider`. Verification keeps the redirect exception, names the provider-without-debug-flag exception, and adds the event order |
| CMK-DEP-32 (Fixes 9) | B2 cache line on the host prefix, control `_DIR` grep exit 1 on both versions | Verification appended as Fixes 9 words it |
| CMK-VCPKG-11 rationale (Fixes 12) | A1 on 4.4.2: `version>=` 1.7.15 on `11ace808` installs `cjson:x64-linux@1.7.19`, `overrides` installs `1.7.15#2` | Rationale now says the baseline is one of the constraints, with the measurement. Severity unchanged |

The structured handback text for DEP-17, DEP-32 and VCPKG-11 reached this
applier truncated. Those three were applied from this ledger's Fixes 2, 9 and
12. Checker: `clean`, exit 0.
