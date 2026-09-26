---
title: "Wave 5: cpp-packaging rules run against real manifests"
verifies: rules/cpp-packaging.md, rules/cpp-packaging/conan.md, rules/cpp-packaging/vcpkg.md
date: 2026-09-26
projects:
  - repo: https://github.com/BehaviorTree/BehaviorTree.CPP
    commit: ca4edbf39366157e644c2757f7207f10feb1d050
    role: Conan consumer (conanfile.py)
  - repo: https://github.com/Netflix/spectator-cpp
    commit: 656bf58c5560e83b31918bd71b73cecb2c634014
    role: Conan consumer (conanfile.py)
  - repo: https://github.com/jasp-stats/jasp-desktop
    commit: ac151234c1a524fca33bc2fa3d4adb0d2e2babe4
    role: Conan consumer (conanfile.py) + secondary FetchContent mechanism
  - repo: https://github.com/CesiumGS/cesium-native
    commit: 13e17085f509c5577a1049b1e3dc5752e49e3d69
    role: vcpkg consumer (vcpkg.json + vcpkg-configuration.json, builtin registry baseline)
  - repo: https://github.com/openvinotoolkit/openvino
    commit: 71a6aed7cffb2a102b5be51951f91e25c87fcf87
    role: vcpkg consumer (vcpkg.json, builtin-baseline) AND Conan consumer (conanfile.txt, ranged) AND FetchContent/ExternalProject user, all three at once
  - repo: https://github.com/conan-io/conan-center-index (sparse: recipes/fmt/*)
    commit: 07389b8fa043666661da208a0cff039338f6e596
    role: CCI recipe
  - repo: https://github.com/microsoft/vcpkg (sparse: ports/zlib/*)
    commit: 11ace808cc8a3a941f386e33726b992b22ba9e5a
    role: registry vcpkg port
tools:
  - "CMake 3.31.12, 4.0.7, 4.1.6, 4.2.7, 4.3.4, 4.4.2 (kitware/cmake, ocx package exec), version-printed and used"
  - "ninja 1.13.2 (ninja-build/ninja, ocx package exec)"
  - "Conan 2.32.0 via uvx"
  - "vcpkg-tool 2026-07-27-98d7cb0cf1f4686a3e43aa5672b6230c1d56bce8, bootstrapped -disableMetrics from a fresh --depth 1 clone of microsoft/vcpkg (11ace808)"
  - "compiler: host gcc 15.2.1 for C; zig 0.16.0-dev c++ (clang 21.1.0 frontend) as CMAKE_CXX_COMPILER, no g++ on host"
---

# Wave 5: cpp-packaging rules run against real manifests

Ledger for the second convergence test of the `cpp-packaging` rule set
(`rules/cpp-packaging.md`, `rules/cpp-packaging/conan.md`,
`rules/cpp-packaging/vcpkg.md`), read in full before this run. Every
verification cell quoted in those three files was run, exactly as written,
against each real project it applies to. Scratch, fixtures and `run.sh` live
at `/home/mherwig/.cache/cmake-measure-scratch/w5/packaging-real/`.

**Result: 2 false positives / verification-cell defects, 0 outright misses
(a real MUST violation the cell fails to flag), 8 confirmed true findings on
real projects (the cells work, and real code trips them), and 2 candidate new
MUST/refinement rows.** The two live installs (Conan on BehaviorTree.CPP,
vcpkg on cesium-native) both ran real `install` + CMake `configure` on CMake
4.4.2, and the Conan leg fully reproduced CMK-CONAN-10's documented failure
mode end to end, including the compiled `-std=` flag.

## Row-by-project results

Empty cell = verification cell not applicable to that project (no matching
file). "Pass (clean)" = the file was read and the pass is a true pass, not a
grep miss. "Pass (real hit)" = the grep fired and reading confirmed it is a
genuine, correctly-classified finding.

| ID | BehaviorTree.CPP | spectator-cpp | jasp-desktop | cesium-native | openvino | fmt (CCI) | zlib (port) |
|---|---|---|---|---|---|---|---|
| CMK-PKG-01 | pass (1 mechanism) | pass (1 mechanism) | **hit, true** (conanfile.py + pinned FetchContent) | pass (1 mechanism; `extern/vcpkg` correctly excluded by `--exclude-dir=vcpkg`) | **hit, true** (3 mechanisms at once) | n/a | n/a |
| CMK-PKG-02 | n/a | n/a | n/a | **hit, true** (`VCPKG_ROOT=$VCPKG_INSTALLATION_ROOT`, the runner's preinstalled vcpkg) | pass | n/a | n/a |
| CMK-PKG-04 | n/a | n/a | n/a | pass (their own vcpkg binary cache is `x-aws`, no `actions/cache` around `vcpkg install` itself) | pass | n/a | n/a |
| CMK-CONAN-01/02/03 | pass (clean) | pass (clean) | pass (clean) | — | — | pass (clean) | — |
| CMK-CONAN-04/05 | pass (no CMakeConfigDeps) | pass | pass | — | pass | n/a (recipe `generate()` always CMakeDeps) | — |
| CMK-CONAN-06 | pass (no build-context find_package) | pass (`tool_requires = ()`) | pass (cmake/bison tool_requires, no cross `find_package`) | — | pass | — | — |
| CMK-CONAN-07 | pass | pass (only a `.gitignore` line, not real use) | pass | — | pass | — | — |
| CMK-CONAN-08/CI-02 | pass (clean, confirmed live too) | pass | pass | n/a | pass | — | — |
| CMK-CONAN-09 | pass (no ranges) | pass (no ranges) | pass (no ranges; the FetchContent side-mechanism is separately pinned) | — | **hit, true MUST violation** (ranges in `conanfile.txt`, `conan.lock` committed but never referenced by any script or CI job, one CI install line with no `--lockfile` at all) | — | — |
| CMK-CONAN-10 | **hit, true MUST violation — live-reproduced** (`set(CMAKE_CXX_STANDARD 17)` at CMakeLists.txt:7, unguarded, after `project()` at line 3) | pass (guarded correctly, `CMAKE_CXX_EXTENSIONS OFF` set alongside a matching standard) | **hit** — `CMAKE_MSVC_RUNTIME_LIBRARY` set (Linux-only project; read as not applicable, matches CMK-VCPKG-06/CONAN-10 boundary correctly) | — | — | — | — |
| CMK-CONAN-11 | n/a (private consumer conanfile, not a recipe; raise matches project default) | n/a | n/a | — | — | — | — |
| CMK-CONAN-12 | pass (single-arch CI, no cross leg) | n/a | n/a | — | pass (single-arch except the RISC-V leg, which correctly passes `-pr:h`; no `-pr:b`, but it also declares no build-context tool_requires, so not applicable) | — | — |
| CMK-CONAN-13 | pass (`cmake_layout` present) | **hit, true** (no `layout()`/`cmake_layout` at all) | **hit, true** (same) | — | — | pass (clean) | — |
| CMK-CONAN-14/15/16/17/18 | pass (no mixins, no header-only) | pass | pass | — | — | pass (clean) | — |
| CMK-CONAN-20 | pass | pass | pass | — | — | n/a (not a range) | — |
| CMK-CONAN-21 | **hit** (no `required_conan_version`) | **hit** (same) | **hit** (same) | — | — | pass (`>=2.1`) | — |
| CMK-CONAN-22 | n/a (no test_package) | n/a | n/a | — | — | pass (clean) | — |
| CMK-CONAN-23 | n/a (no conandata.yml) | n/a | n/a | — | — | n/a-covered (fmt vendors nothing hash-relevant here) | — |
| CMK-VCPKG-01 | — | — | — | pass (`vcpkg-configuration.json` carries the baseline) | pass (`builtin-baseline` in `vcpkg.json`) | — | — |
| CMK-VCPKG-02 | — | — | — | **verification-cell defect** (see below) | pass | — | — |
| CMK-VCPKG-03 | — | — | — | pass (own `ktx` overlay port sets `"host": true` correctly) | n/a | — | — |
| CMK-VCPKG-04 | — | — | — | pass (triplet set at CMakeLists.txt:57-115, before `project()` at :196) | pass, but **noise finding** (see below) | — | — |
| CMK-VCPKG-06 | — | — | — | pass (Linux-only triplets in CI, not applicable) | pass (not applicable) | — | — |
| CMK-VCPKG-08 | — | — | — | **hit, true** (`x-aws` in `VCPKG_BINARY_SOURCES`, no "experimental" comment) | pass | — | — |
| CMK-VCPKG-09 | — | — | — | pass (no `X_VCPKG_ASSET_SOURCES`) | pass | — | — |
| CMK-VCPKG-10 | — | — | — | **false positive** (see below) | pass | — | — |
| CMK-VCPKG-11 | — | — | — | pass | pass | — | — |
| CMK-VCPKG-12/13/14/16/18 | — | — | — | — | — | — | pass (clean; modern `vcpkg_cmake_*` helpers, lowercase SHA512, no hand-rolled copyright) |

## Live install + configure (CMake 4.4.2)

**Conan leg — BehaviorTree.CPP.** `conan install . --build=missing` with a
scratch `CONAN_HOME`, profile `compiler=clang/21`, `CXX`/`CC` pointed at a
local `-Wno-unused-command-line-argument` wrapper around `zig c++`/`zig cc`
(the shared `zig-cxx-wrapper.sh` fails Conan's dependency builds because zig
treats its `-stdlib=libstdc++` as an unused, `-Werror`'d argument). Finished
successfully: 8 dependencies resolved, `flatbuffers`, `libsodium`, `foonathan-lexy`
and others built from source. `cmake --preset conan-release --fresh
-Werror=author` (CMake 4.4.2) then exited 0.

To test CMK-CONAN-10 live, re-ran `conan install . -s compiler.cppstd=20
--build=missing`, then `cmake --preset conan-release --fresh -Werror=author`
again:

```
-- Warning: Standard CMAKE_CXX_STANDARD value defined in conan_toolchain.cmake
   to 20 has been modified to 17 by .../BehaviorTree.CPP/CMakeLists.txt
```

Exit code 0. `build/Release/CMakeFiles/behaviortree_cpp.dir/flags.make` shows
`-std=c++17`. This is CMK-CONAN-10's documented mechanism, reproduced exactly:
the profile asked for C++20, the project's own unguarded `set(CMAKE_CXX_STANDARD
17)` (line 7, right after `project()` at line 3) silently won, CMake only
printed a `STATUS`-level line, and the gate (`-Werror=author` on 4.4.2) did not
catch it. BehaviorTree.CPP is a real, actively used robotics library (ROS
ecosystem) — not a planted fixture.

**vcpkg leg — cesium-native.** Bootstrapped `microsoft/vcpkg` `--depth 1` at
11ace808, `-disableMetrics`. Copied `doc/cmake-presets/CMakeUserPresets.json`
to the repo root (as their own CI does) and ran `cmake --preset=vcpkg-ninja
-DCMAKE_BUILD_TYPE=Release` with `VCPKG_ROOT` pointed at the bootstrapped
clone and `CC`/`CXX` at the zig wrappers. vcpkg correctly read the triplet and
overlay settings from before `project()` (CMK-VCPKG-04 confirmed live), then
downloaded its own pinned CMake 4.4.3 for port builds regardless of the
4.4.2 on `PATH` (a vcpkg-internal tool-provisioning behavior worth noting:
`CMK-PKG-03`'s "state which mechanism supplies a version-sensitive tool"
applies to vcpkg's *own* CMake fetch too, which a project's own CI pinning
cannot override). It built 9/36 dependencies from source (no binary cache
configured for this run) before failing on `openssl:x64-linux` — an
environment limitation of building OpenSSL's Configure-based build under
`zig cc` on this host, not a cpp-packaging rule finding. No MUST/SHOULD row
was contradicted by what ran; the partial run's real cost (9 packages built
serially with zero cache hits, several minutes) is itself the live version of
CMK-PKG-04's rationale for caching the install step.

## False positives and misses

### 1. `rules/cpp-packaging/vcpkg.md:110` (CMK-VCPKG-10) — false positive

**Command:** `grep -rn --include='CMakeLists.txt' --include='*.cmake' --include='*.json' --include='*.yml' --include='*.yaml' --include='*.sh' --include='*.ps1' --exclude-dir=vcpkg -e vcpkg-artifacts -e vcpkg-ce -e VCPKG_ARTIFACTS -e 'vcpkg activate' -e VCPKG_PREFER_SYSTEM_LIBS .`

**Project:** CesiumGS/cesium-native, `vcpkg-configuration.json`:

```json
"registries": [
  { "kind": "artifact",
    "location": "https://github.com/microsoft/vcpkg-ce-catalog/archive/refs/heads/main.zip",
    "name": "microsoft" }
],
```

**What it printed:** one hit, matched by the bare `-e vcpkg-ce` pattern against
the substring `vcpkg-ce-catalog` in the artifact-registry URL. Confirmed by
reading: cesium-native never runs `vcpkg activate` or any `x-vcpkg-artifacts`
command anywhere in the tree (`grep -rn -e 'vcpkg activate' -e
'x-vcpkg-artifacts' -e VCPKG_ARTIFACTS` — empty). This `"kind": "artifact"`
registry block is vcpkg's own default scaffold (the block `vcpkg new` writes
into every fresh `vcpkg-configuration.json`), inert unless something actually
calls `vcpkg activate` or the artifacts CLI. The rule's MUST is "never
introduce vcpkg-artifacts... into a consuming project" — declaring the
tool's own unmodified default registry is not introducing anything, and any
project that ran `vcpkg new` and never touched the result will trip this
MUST for a feature it never used.

**Proposed replacement text:** narrow the pattern from `-e vcpkg-ce` to a
word-bounded form that only matches the CLI/feature name, not URLs that
happen to contain it, e.g. `grep -rnw -e vcpkg-ce` plus an explicit carve-out:
"A `\"kind\": \"artifact\"` registry pointing at
`microsoft/vcpkg-ce-catalog` with no `vcpkg activate` / `x-vcpkg-artifacts`
invocation anywhere in the tree is vcpkg's own unmodified default scaffold,
not an introduction, and clears the row on inspection."

### 2. `rules/cpp-packaging/vcpkg.md:41` (CMK-VCPKG-02) — verification-cell defect

**Command as shipped:** `grep -rn --include='vcpkg.json' --include='vcpkg-configuration.json' -e '"overrides"' -e '"overlay-ports"' -e '"registries"' -e '"default-registry"' ports` (the row's own prose: "Over the directory that ships as a port or overlay (here `ports`)").

**Project:** CesiumGS/cesium-native. Its shipped overlay directory is
`extern/vcpkg/ports` (per `CMakeLists.txt:103`,
`list(APPEND VCPKG_OVERLAY_PORTS "${CMAKE_CURRENT_SOURCE_DIR}/extern/vcpkg/ports")`),
not a top-level `ports/`.

**What it printed**, run verbatim from the repo root:

```
/usr/sbin/grep: ports: No such file or directory
```

exit code 2, empty stdout. The row's text says "a missing directory means not
applicable," which is the right verdict here, but the command as literally
written can't be copy-pasted — the reader must already know to substitute the
project's real overlay path, and the failure mode on a real tree is a scary
`grep: … No such file or directory` on stderr, not a clean, silent "not
applicable." Running it correctly against `extern/vcpkg/ports` also passes
(no overrides/registries in the overlay), so the eventual verdict is the same
either way — but a drafter who runs the cell exactly as shown, sees stderr
noise, and doesn't already know the escape hatch, cannot tell a real "not
applicable" from a broken command.

**Proposed replacement text:** replace the literal `ports` argument with an
explicit instruction to substitute the project's actual `VCPKG_OVERLAY_PORTS`
target, and add `2>/dev/null` (or an explicit `[ -d "$OVERLAY_DIR" ] &&` guard)
so a missing directory prints nothing instead of a grep error, matching what
the prose already promises.

## Confirmed true findings (rule fired correctly on real code)

These are not defects in the rules — they are the ledger's other explicit
goal, a confirmation that the check earns its severity on real trees, not
just planted fixtures.

1. **CMK-CONAN-09 (MUST), openvino.** `conanfile.txt` ranges 9 requirements
   (`onetbb/[>=2021.2.1]` etc.); `conan.lock` is committed
   (`git ls-files conan.lock` → `conan.lock`) but is dead: no script, workflow
   or doc references it (`grep -rln -e conan.lock` outside `.git` → empty),
   and the one live `conan install` line
   (`.github/workflows/linux_riscv_conan.yml:201`) passes no `--lockfile` flag
   at all. On a project the size of OpenVINO this is exactly the drift the
   rule is written to catch.
2. **CMK-PKG-02 (SHOULD), cesium-native.** `.github/workflows/build.yml`
   (Linting and Documentation jobs) sets
   `VCPKG_ROOT=${VCPKG_INSTALLATION_ROOT}` — the GitHub-hosted runner's
   preinstalled vcpkg — instead of a project-pinned root, and that `VCPKG_ROOT`
   is what `doc/cmake-presets/CMakePresets.json` feeds to
   `CMAKE_TOOLCHAIN_FILE`.
3. **CMK-VCPKG-08 (SHOULD), cesium-native.** `VCPKG_BINARY_SOURCES:
   'clear;x-aws,s3://...'` in `build.yml`, no "experimental" comment anywhere
   nearby.
4. **CMK-CONAN-13 (SHOULD), spectator-cpp and jasp-desktop.** Both declare
   `generators = "CMakeDeps", "CMakeToolchain"` with no `layout()`/
   `cmake_layout()` method at all.
5. **CMK-CONAN-21 (SHOULD), all three Conan consumers.** None of
   BehaviorTree.CPP, spectator-cpp or jasp-desktop declares
   `required_conan_version` (fmt, the CCI recipe, does: `>=2.1`) — see the
   refinement candidate below.
6. **CMK-CONAN-10 (MUST), BehaviorTree.CPP** — live-reproduced end to end,
   see above.
7. **CMK-PKG-01 composability, jasp-desktop and openvino** — both correctly
   flagged as multi-mechanism trees; jasp-desktop's second mechanism
   (`FetchContent_Declare(freexl, GIT_TAG <full SHA>)`) turns out to already
   be properly pinned, a clean confirmation that the check adds real value
   without manufacturing noise when there is nothing to find.
8. **CCI recipe and vcpkg port, both clean.** `recipes/fmt` and
   `ports/zlib` pass every applicable row on read, not just on grep silence
   (`cmake_layout(self, src_folder="src")`, `required_conan_version = ">=2.1"`,
   modern `vcpkg_cmake_*` helpers, lowercase `SHA512`) — a true negative on
   two widely-used, well-maintained real artifacts.

## Candidate new failure modes

1. **A grep pattern meant for a CLI/feature name matches a URL that merely
   contains the string.** `CMK-VCPKG-10`'s `-e vcpkg-ce` fires on
   `vcpkg-ce-catalog`, which is vcpkg's own default artifact-registry
   scaffold, not a use of the deprecated CLI. Any bare, unbounded literal
   search for a short tool name is at risk of this on real trees that quote
   URLs, package names or comments containing it.
2. **A verification cell's example directory argument (`ports`) is not
   marked as a placeholder, but isn't a literal path either.** Per
   "Authoring notes §7," a pattern must never contain `<placeholder>` — but
   `CMK-VCPKG-02`'s cell embeds a literal directory name that is actually a
   stand-in for "wherever this project's overlay lives," which real
   projects name differently (`extern/vcpkg/ports`, `overlay-ports/`, etc.).
   The gap between "not a templated placeholder" and "still needs
   substitution per project" is exactly where a drafter or an agent
   mechanically running the cell gets a `grep: No such file or directory`
   instead of a clean pass.
3. **A blunt, whole-tree grep scales poorly on a large real monorepo even
   when it produces the right final answer.** `CMK-VCPKG-04`'s combined
   `-e 'set(VCPKG_' -e 'project('` cell, run across openvino (18k+ files),
   returned 29 lines, all but zero of them irrelevant `project(...)` matches
   from unrelated subdirectory `CMakeLists.txt` files with no `VCPKG_` write
   nearby. The correct verdict (no `VCPKG_` writes exist, hence pass) is
   reachable, but only after triaging noise the rule's own "empty output is
   the pass" framing doesn't anticipate for a tree this size.

## Candidate new MUST rows

1. **A tree that reaches all three acquisition mechanisms at once needs its
   own worked example.** openvino is a real instance of the case
   `CMK-PKG-01` describes only abstractly (Conan + vcpkg + FetchContent in
   one tree). Given how rare this combination is in the corpus so far and
   how directly the existing PKG-01 text already covers it (each mechanism
   gets its own owning check; nothing composes), this is better served as
   an added worked example under `CMK-PKG-01` than a new ID. **Not
   proposing a new MUST** — existing text already covers the case; recording
   it here because it's the first real specimen found.
2. **No new MUST row is proposed from this wave's static or live findings.**
   Both real defects found (CMK-VCPKG-10's substring match, CMK-VCPKG-02's
   unsubstituted directory) are fixes to existing verification cells' wording
   (see "Proposed replacement text" above), not gaps in rule coverage. The
   `CMK-CONAN-21` friction (SHOULD firing on 100% of real private-consumer
   conanfiles, whose rationale is written for published recipes) is a
   candidate **refinement**, not a new MUST: either scope the row's SHOULD
   language to recipes intended for redistribution, or explicitly note that a
   private application conanfile inherits it too but the rationale is
   weaker. Proposed text for the latter, appended to CMK-CONAN-21's row: "A
   private, unpublished application conanfile carries a weaker form of this
   rationale (it never meets an old client it doesn't control) but is not
   exempt — SHOULD still applies."

This wave found real MUST/SHOULD violations on real, actively-maintained
projects (openvino, cesium-native, BehaviorTree.CPP) and two genuine
verification-cell defects, but **no gap in rule coverage** — every failure
mode this wave surfaced is a wording/precision fix to an existing row, not a
missing rule. Combined with wave 4 (no new MUST, ten failure modes, eight
from single-real-tree runs), this is the second consecutive wave with no new
MUST row for `cpp-packaging`. One more convergence wave with the same result
(no new MUST, no new failure mode) would meet the program's stop condition
for this rule set.

## Reproduction

`/home/mherwig/.cache/cmake-measure-scratch/w5/packaging-real/run.sh` re-runs
every static verification cell in this ledger's table (it prints one section
per rule-ID per project) and documents, in comments, the exact commands for
the two live installs (Conan and vcpkg), since those mutate a real dependency
cache and are not safely re-run unattended. `run-output.txt` in the same
directory is the captured output this ledger's table is drawn from.

## Wave 5 applied (2026-09-26)

Applier re-checks live in `/home/mherwig/.cache/cmake-measure-scratch/w5/packaging-real/applier-run.sh` (output in `applier-run-output.txt`) plus four live sub-runs: `applier-conan10/run.sh`, `applier-conan07/run.sh`, `applier-conan09/run.sh` and `applier-conan21/run.sh`. Tools: CMake 3.31.12 and 4.4.2, Conan 2.32.0 and 1.66.0 via uvx, vcpkg-tool 2026-07-27-98d7cb0c (the triage-pm bootstrap at root 11ace808).

### Spot-checks

1. **CMK-CONAN-10 on BehaviorTree.CPP: reproduced.** The measurer's build tree and Conan cache were gone, so the check re-ran BehaviorTree.CPP's `CMakeLists.txt` lines 1 to 7 plus one target under a fresh Conan 2.32.0 `CMakeToolchain` with `-s compiler.cppstd=20`. Result: `conan_toolchain.cmake` holds `set(CMAKE_CXX_STANDARD 20)`, and the configure (`cmake --preset conan-release -Werror=author`, CMake 4.4.2) exited 0 and printed `... defined in conan_toolchain.cmake to 20 has been modified to 17 by .../CMakeLists.txt`. The build exited 0, and `compile_commands.json` shows `-std=c++17`.
2. **CMK-VCPKG-10 on cesium-native: the hit reproduced, but the explanation did not.** The cell prints `vcpkg-configuration.json:10` (`vcpkg-ce-catalog`), exit 0, and the tree has no `vcpkg activate`, `x-vcpkg-artifacts` or `VCPKG_ARTIFACTS` (exit 1). The measurer's configure logs contain 0 artifact or catalog lines. The claim that "`vcpkg new` writes this block into every fresh configuration" is false for the current tool: `vcpkg new --application` at vcpkg-tool 2026-07-27 wrote only `default-registry` (0 `artifact` lines). The block is a leftover from earlier `vcpkg new` releases. The proposed `grep -w` fix does not work, because `grep -rnw -e vcpkg-ce` still matches `vcpkg-ce-catalog` (`-` is not a word character, exit 0).
3. **CMK-VCPKG-02 on cesium-native: reproduced.** The cell run verbatim printed `grep: ports: No such file or directory`, exit 2. With `extern/vcpkg/ports` it exits 1 with empty output.
4. **CMK-CONAN-09 on openvino: the finding stands, but the reasoning was corrected.** Ranges, the tracked `conan.lock` and the one unflagged install line (`linux_riscv_conan.yml:201`) all reproduced. Two claims did not hold. First, `conan.lock` is referenced: `.github/labeler.yml:63` names it, though only as a PR-label path. Second, the lock is not dead. Conan 2.32.0 reads a `conan.lock` placed beside the conanfile even when `conan install <dir>/conanfile.txt` runs from another directory (`Using lockfile: '.../repo/conan.lock'`, exit 0). `--lockfile=` switched the lookup off. So openvino's RISC-V install does read the lock, but implicitly. The finding is still the missing explicit `--lockfile=conan.lock`.

### Misses found while spot-checking

- **CMK-CONAN-07 false pass on jasp-desktop (`ac15123`).** `Tools/CMake/Conan.cmake` runs `conan install` through `execute_process()` during the configure, on its Windows and macOS legs, and then runs `include(${CMAKE_BINARY_DIR}/_conan_build/conan_toolchain.cmake)` (line 148) after `project()` (`CMakeLists.txt:60`). The row's only grep (`conan_provider.cmake`) printed nothing, which the row reads as "explicit flow, a pass". Measured consequence on Conan 2.32.0 (`applier-conan07/run.sh`):
  - An `include()` after `project()` left `CMAKE_C_COMPILER_ID=GNU` while `rules.ninja` compiled with the profile's clang wrapper, configure exit 0 (`-Werror=dev` on 3.31.12, `-Werror=author` on 4.4.2).
  - The same file loaded through `--toolchain` reported `Clang`.
  - The new grep `-e 'include(.*conan_toolchain'` hits only jasp's line 148 across all five consumers. BehaviorTree.CPP, spectator-cpp, openvino and cesium-native all exit 1.
- **The jasp-desktop CMK-CONAN-10 row was misread.** jasp builds on Windows, macOS and Linux, so "Linux-only, not applicable" is wrong. `CMakeLists.txt:81` (`set(CMAKE_CXX_STANDARD 20)`) and `:119` (`set(CMAKE_MSVC_RUNTIME_LIBRARY ...)` inside `if(WIN32)`) are findings under the row's letter. Line 81 does not win in practice, because the toolchain is included later, which is the CONAN-07 miss above. Line 119 is a deliberate runtime override of the profile, and its comment says so. No rule change.

### Changed (IDs kept)

- **CMK-VCPKG-10:** the rule text now names a `"kind": "artifact"` registry and says to delete an inherited one. The verification treats a lone `vcpkg-ce-catalog` artifact registry in a tree with no `vcpkg activate` or `x-vcpkg-artifacts` as a SHOULD cleanup, not the MUST, with the 2026-07-27 `vcpkg new` measurement and the note that `-w` does not help. Re-check D3 now also asks whether such a registry is rejected once artifacts are removed.
- **CMK-VCPKG-02:** the directory is now `"${OVERLAY_PORTS_DIR:-ports}"`, found from `overlay-ports` or `VCPKG_OVERLAY_PORTS`. Exit 2 means the directory is wrong. The cesium-native `extern/vcpkg/ports` case is cited.
- **CMK-VCPKG-07 and CMK-VCPKG-15:** the same defect class with `triplets`. Both now use `"${OVERLAY_TRIPLETS_DIR:-triplets}"`. On cesium-native with `extern/vcpkg/triplets`, both VCPKG-07 commands gave empty output.
- **CMK-VCPKG-04:** the verification is split in two. The first command greps only `VCPKG_` writes, and empty output is the pass. The second locates `project(` only for top-level hits. openvino goes from 29 noise lines to 0, and cesium-native from 14 lines to 13 writes, all before `project(` at line 196.
- **CMK-CONAN-07:** added the ban on running `conan install` from `execute_process()` and then `include()`ing `conan_toolchain.cmake`, with the measurement above and a second grep. The Severity cell now reads `SHOULD (the include() clause is MUST, owned by CMK-TC-03)`.
- **CMK-CONAN-09:** the rationale now says "beside the conanfile", not "in the working directory" (measured). The verification adds that a lock no script names is still live. Failure mode 6 is reworded to match.
- **CMK-CONAN-10:** the rationale now records the real-tree reproduction on BehaviorTree.CPP `ca4edbf`, which was read-only-grounded before. The rule text is unchanged.
- **CMK-CONAN-21:** the rule now covers a consumer's unpublished `conanfile.py`. The rationale adds the Conan 1.66.0 measurement:
  - The floorless BehaviorTree.CPP file loads (`conan inspect` exit 0), then its install fails with `Unable to find 'flatbuffers/24.12.23' in remotes`.
  - With `>=2.0` the load itself fails with `does not satisfy the defined one (>=2.0)`.
- **CMK-PKG-02 (index):** the rationale adds that the pinned root also fixes the CMake used for port builds. Root 11ace808 downloaded CMake 4.4.3 although 4.4.2 was on `PATH` (`vcpkg-configure.log:9`).

### Added

- Failure mode 10 in `rules/cpp-packaging/conan.md`: running `conan install` from `execute_process()` during the configure (the Conan 1 `conan_cmake_run` shape), then `include()`ing `conan_toolchain.cmake` after `project()`.
- No new MUST row. The `include()` clause reuses CMK-TC-03's existing MUST.

### Rejected

- **Narrowing VCPKG-10 with `grep -w`:** measured not to narrow (see above).
- **"Weaker rationale" wording for CONAN-21:** the measurement shows the rationale applies to consumer conanfiles in full, so the scope was widened instead.
- **A worked openvino example under PKG-01:** a restatement. PKG-01's text already covers three mechanisms in one tree.
- **Candidate failure modes 1 to 3 (URL substring, unmarked directory argument, VCPKG-04 noise):** these are checker-precision defects, not agent mistakes. Each was fixed in its row's verification instead.
- **CONAN-13, CONAN-21, PKG-02 and VCPKG-08 confirmations:** confirmations need no change.

### Handback

- `rules/cmake-build/toolchains-and-providers.md` CMK-TC-03: B1 and B2 do not see a toolchain loaded by `include()` after `project()`. The applier's structured result gives the exact text to add.

Converged: no. The wave added no MUST row, but it added one failure mode (conan.md 10), which came from a real-tree false pass.

## Handbacks applied (2026-09-26)

Applier: opus. The structured handback text for CMK-TC-03 reached this applier
truncated, so the clause was written from this ledger's measurement. Re-run:
`applier-conan07/run.sh`, exit 0. On 3.31.12 and 4.4.2 the `include()` after
`project()` configures with exit 0 and `C_COMPILER_ID=GNU` while `rules.ninja`
runs `zig-cc.sh`, and `--toolchain` reports `Clang`.

- `rules/cmake-build/toolchains-and-providers.md` CMK-TC-03 (MUST, ID kept).
  Rule: "Load a toolchain file only as the toolchain, never through
  `include()` after `project()`." The rationale adds the measurement. The
  verification points at CMK-CONAN-07's second grep, with empty output = pass.
  CMK-CONAN-07's "owned by `CMK-TC-03`" now resolves. No new grep was minted.
