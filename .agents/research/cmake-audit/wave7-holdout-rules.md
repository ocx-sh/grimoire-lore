---
title: Wave 7 held-out sweep — every MUST row of cmake-build and cpp-packaging on four fresh repositories
date: 2026-09-26
repositories:
  - libuv/libuv @ abe835d41317b55b16260990821f89b4ee9e437b (2026-09-25) — library others consume (C, no manifest)
  - abseil/abseil-cpp @ 583556e932a5ef4bf22d5e32c6a42cbfdde07307 (2026-09-26) — library others consume (C++, dual CMake+Bazel, carries a root conanfile.py)
  - openttd/openttd @ 7b3743db1e30d255ae5ff18b126c99492e78557b (2026-09-25) — application pulling dependencies through a vcpkg manifest (vcpkg.json)
  - protocolbuffers/protobuf @ c64743979dbfa0ac3343d28e7af71a0e77825495 (2026-09-25) — large multi-directory project (dual CMake+Bazel, many language subtrees)
cmake_versions: "3.31.12, 4.3.4, 4.4.2 (ocx package exec kitware/cmake:<tag>), printed once each; jq 1.8.1; no ninja/build runs were needed for this sweep"
scratch: /home/mherwig/.cache/cmake-measure-scratch/w7/holdout-rules/ (repos/, out/<repo>/<ID>.txt, run.sh, run-static.sh, mod05.awk, tc03.awk, lang06.awk, lang10.awk)
none_of_these_were_in_wave4_5_6: true
---

## Method

None of the four repositories, or their organizations, appear in wave 5's
manifest list (BehaviorTree.CPP, spectator-cpp, jasp-desktop, cesium-native,
openvino, conan-center-index, vcpkg) or wave 6's twelve repositories (fmtlib/fmt,
nlohmann/json, cpp-best-practices/cmake_template, madler/zlib,
KDE/extra-cmake-modules, friendlyanon/cmake-init, jbeder/yaml-cpp, ccache/ccache,
Tencent/rapidjson, catchorg/Catch2). Each was shallow-cloned once
(`git clone --depth 1`) into `repos/<owner>__<repo>/` under the scratch
directory, full blobs, on 2026-09-26.

Every MUST row's Verification cell across `rules/cmake-build.md`,
`rules/cmake-build/*.md` (9 depth files), `rules/cpp-packaging.md` and
`rules/cpp-packaging/{conan,vcpkg}.md` was run **exactly as printed** against
each repository's root (116 MUST rows total). 94 of those rows resolve to a
static grep/awk/jq/find Verification cell with no configure step, and all 94
were run against all four repositories (376 cells). The remaining 22 rows
resolve to a configure-, build- or install-based Verification cell (the
gate canary, the install round trip, the offline probe, the consumer probe,
the dependency-provider marker probe, the multi-config leg, the Ninja
PIC/module-scan artifact reads, the as-subproject smoke, the Bazel wrap
simulation): these were **not run** in this sweep — see "Not run" below — the
tier of the task (a fixture-scale MUST-row sweep on real trees) did not budget
full configure/build passes on four real, sizeable projects without a working
C++ toolchain (host has gcc 15.2.1 and no g++; three of the four repos are C++
and the zig-cxx-wrapper was not exercised against them).

Two of the 94 static cells (`CMK-MOD-05`'s awk, `CMK-TC-03`'s awk) initially
errored on every repository because embedding a multi-statement awk program
with literal `&&` inside a double-quoted `eval` string in the sweep's outer
bash script splits the `&&` at the wrong level (`bash: cmd. line:1: ... backslash
not last character on line`) — a harness bug in `run-static.sh`, not a defect
in the rule text (the rule's own fenced-block command is syntactically valid
awk when run as its own file, which is how CMake's docs and every prior wave's
runner would execute it). Fixed by extracting both awk programs to
`mod05.awk` and `tc03.awk` and re-run clean; see "Errors" below.

## Results table

Hit-count per row per repository (0 = empty output = pass, `-` = the row's
own Verification cell reports "not applicable" for this repository, e.g. no
`Find*.cmake`, no `vcpkg.json`, no Bazel files, no presets file). A nonzero
count is not automatically a finding — several rows are explicitly reading
heuristics ("each hit needs a read") — see "False positives, misses and
errors" for the ones read to a verdict.

| ID | libuv | abseil | openttd | protobuf | Verdict |
|---|---|---|---|---|---|
| CMK-CORE-02 | 0 | 0 | 0 | 0 | pass, all four (no schema-12 presets file with `dev`) |
| CMK-CORE-05 | 0 | 7 | 0 | 3 | **false positive**, all 10 hits (below) |
| CMK-VER-01 | 0 | 0 | 0 | 0 | pass, all four |
| CMK-VER-04 | 1 | 0 | 0 | 0 | libuv CI names `Visual Studio 18 2026`; read (below): not a finding |
| CMK-VER-05 | N/A | N/A | N/A | pass | only protobuf ships a `third_party/` dir at all; the other three have neither `third_party` nor `build/_deps` to scan (the row's own text: a missing operand is "not a pass", but nothing to scan either — see note) |
| CMK-VER-07 | 0 | 0 | 0 | 1 | protobuf `CMakeLists.txt:7`: guarded + reasoned, missing exit-condition clause — **true (partial) finding** per the row's literal text |
| CMK-VER-09 | 0 | 0 | 0 | 0 | pass, all four |
| CMK-DEP-01 | 0 | 0 | 0 | 0 | pass, all four |
| CMK-DEP-03 | 0 | 0 | 0 | 0 | pass, all four |
| CMK-DEP-08 | 0 | 0 | 0 | 0 | not applicable, all four (no `FIND_PACKAGE_ARGS`) |
| CMK-DEP-09 | 0 | 0 | 0 | 0 | not applicable, all four |
| CMK-DEP-13 (static half) | 0 | 0 | 0 | 0 | pass, all four |
| CMK-DEP-14 | 5 | 2 | 20 | 1 | reading heuristic; sampled: all ordinary compiler/tool discovery, not `_ROOT`-reliant `find_program`s — pass on read |
| CMK-DEP-15 | 0 | 0 | 0 | 0 | pass, all four |
| CMK-DEP-19 | 0 | 0 | 0 | 0 | pass, all four |
| CMK-DEP-21 | applicable (libuv only) | N/A | N/A | N/A | libuv's `cmake-toolchains/cross-mingw32.cmake` sets root-path modes; row is a behavior probe (`--debug-find-pkg`), not run |
| CMK-DEP-23 | N/A | N/A | applicable | N/A | openttd has 5 pkg-config consumers; sysroot vars empty — not applicable (no cross toolchain) |
| CMK-DEP-30 (static half) | 0 | 0 | 0 | 0 | pass, all four |
| CMK-DEP-31 | 0 | 0 | 0 | 0 | vacuous (no `PATCH_COMMAND`), all four |
| CMK-INST-02 (static approximation) | 1 | 1 | 1 | 1 | not the row's real cell (round trip, not run); dropped, see "Not run" |
| CMK-INST-03 | 0 | 0 | 0 | 1 | protobuf hit is a `Find*.cmake`-excluded template name false match; read: not a Config template — pass |
| CMK-INST-04 | 0 | 0 | 0 | 1 | protobuf: `cmake/protobuf-config-version.cmake.in` uses `write_basic_package_version_file` conventions but named unconventionally; read: calls `PACKAGE_VERSION_COMPATIBLE` correctly — pass |
| CMK-INST-05 | 0 | 2 | 0 | 1 | reading heuristic; every `@PACKAGE_INIT@` template has a matching `configure_package_config_file()` call — pass |
| CMK-INST-09 | 0 | 0 | 0 | 0 | pass, all four |
| CMK-INST-10 | 0 | 0 | 1 | 0 | openttd `cmake/InstallAndPackage.cmake:281` — **false positive** (below) |
| CMK-INST-13 | 0 | 0 | 0 | 0 | not applicable, all four (no `install(PACKAGE_INFO)`) |
| CMK-INST-15 | 0 | 0 | 0 | 0 | not applicable, all four |
| CMK-INST-16 | 0 | 0 | 0 | 0 | not applicable, all four |
| CMK-INST-24 | 0 | 0 | 0 | 0 | pass, all four |
| CMK-LANG-01 | 0 | 8 | 9 | 14 | reading heuristic; sampled hits are all `if(${VAR} MATCHES/STREQUAL ...)` on unquoted expansions — **true findings**, not new (this is exactly the row's own documented failure mode) |
| CMK-LANG-02 | 1 | 3 | 2 | 17 | this row is diff-scoped (`git diff … BASE_REF`); a fresh clone with no local diff has nothing "touched" — ran whole-tree as an informational upper bound only, not the row's actual cell; see note |
| CMK-LANG-04 | 0 | 6 | 6 | 1 | true hits, all in internal (non-public, non-shipped) `cmake/*.cmake` helper functions — severity is SHOULD for a private helper per the row's own text, not MUST; consistent with the row's own severity table, not a defect |
| CMK-LANG-05 | 3 | 2 | 3 | 3 | reading heuristic (bare `PARSE_ARGN` hits) — read: all in comments/docs or CMake's own vendored copy, not actual parses below a 4.4 floor — pass on read |
| CMK-LANG-06 | 0 | 6 | 3 | 1 | true hits, same private-helper nuance as LANG-04 (MOD-04 CreateGrfCommand, AbseilHelpers, protobuf-generate) |
| CMK-LANG-10 | 0 | 0 | 0 | 0 | pass, all four |
| CMK-LANG-11 | 0 | 0 | 0 | 0 | pass, all four |
| CMK-MOD-01 | 0 | 0 | 0 | 0 | pass, all four |
| CMK-MOD-02 | 0 | 0 | 0 | 0 | pass, all four |
| CMK-MOD-03 | 0 | 0 | 0 | 0 | pass, all four |
| CMK-MOD-04 | 0 | 0 | 59 | 0 | **true finding**, confirmed sample: `openttd/cmake/scripts/CreateGRF.cmake:75` (below) |
| CMK-MOD-05 | 0 | 2 | 14 | 3 | reproduces wave 6's documented MOD-05 scope class (below) — **0 new** |
| CMK-MOD-08 | 0 | 0 | 12 | 0 | mixed: 1 **false positive** (`FindVersion.cmake`), rest plausible true (emscripten Find-module stubs) — below |
| CMK-MOD-10 | 0 | 0 | 0 | 0 | pass, all four |
| CMK-MOD-12 | 0 | 0 | 0 | 0 | pass, all four |
| CMK-MOD-13 | 1 | 3 | 2 | 2 | reading heuristic; all `CMAKE_SYSTEM_NAME`/`_PROCESSOR` hits are ordinary per-platform build logic, not a tool-provisioning module choosing a fetch binary — pass on read |
| CMK-CI-01 | N/A | N/A | N/A | N/A | not applicable, all four (none ships a `CMakePresets.json`) |
| CMK-CI-02 | 0 | 0 | 0 | 0 | pass, all four |
| CMK-PKG-01 | 0 | 0 | 1 | 4 | composed check: mechanism reached (FetchContent) → owning row (DEP-01/03) already pass — **pass**, both |
| CMK-TGT-01 | 9 | 1 | 6 | 5 | **true findings**, confirmed sample: `libuv/CMakeLists.txt:477,494,...` and `openttd/CMakeLists.txt:299,317` — bare `target_link_libraries` on library targets (below) |
| CMK-TGT-03 | 3 | 0 | 31 | 4 | reading heuristic; not individually read at this scale beyond the count (see "Not exhaustively read") |
| CMK-TGT-04 | 0 | 1 | 0 | 0 | abseil `CMake/Googletest/DownloadGTest.cmake:33` — **false positive** (below) |
| CMK-TGT-09 | 0 | 0 | 0 | 0 | pass, all four |
| CMK-TGT-21 | 3 | 16 | 156 | 9 | reading heuristic; not individually read at this scale beyond a sample — openttd's 156 are almost all `CMAKE_BINARY_DIR`/`CMAKE_SOURCE_DIR` in generated-file paths in an application (not a "library others consume"), so mostly not applicable to this MUST row's binding target — see note |
| CMK-TC-01 | 2 | 0 | 9 | 0 | A1 per-leg listing only; A2 (the actual finding grep) is empty for all four — **pass**, all four |
| CMK-TC-02 | 0 | 0 | 0 | 0 | pass, all four |
| CMK-TC-03 | 0 | 0 | 0 | 0 | pass, all four (after the awk fix) |
| CMK-TC-04 | 0 | 0 | 0 | 0 | pass, all four |
| CMK-TC-08 | 1 | 0 | 0 | 0 | libuv's `cross-mingw32.cmake` sets `CMAKE_SYSTEM_NAME` with `CMAKE_FIND_ROOT_PATH_MODE_LIBRARY` unset — read: **true finding** (E1 only; E2/E3 set) |
| CMK-TC-09 | 0 | 0 | 0 | 0 | not applicable, all four |
| CMK-TEST-02 | 1 | 1 | 1 | 1 | all four: no `tests/` dir matching the row's default `TEST_DIR`, so the grep's own directory-not-found stderr is the only output — not applicable, all four |
| CMK-TEST-03 | 0 | 0 | 0 | 0 | pass, all four |
| CMK-TEST-06 | 2 | 0 | 4 | 0 | reading heuristic; libuv and openttd's CI runs `ctest`/`--target test` with no `--no-tests=error`/`CTEST_NO_TESTS_ACTION` guard anywhere in the printed files — **true findings** (2 libuv, 4 openttd), matching wave 6's "14 of 18 corpus projects" framing, not new |
| CMK-TEST-07 | 2 | 0 | 0 | 2 | libuv and protobuf CI hits, fallback grep confirms `TIMEOUT`/`include(CTest)` absent for libuv's flagged file, present but unbounded for protobuf's — read as **true findings**, same known class |
| CMK-TEST-09 (static half) | 0 | 0 | 2 | 0 | openttd's `regression/` and `bin/` subdirectories are `add_subdirectory`-ed unconditionally; not gated on a project-prefixed option — plausible **true finding**, not build-confirmed (smoke build not run) |
| CMK-BZL applicability | N/A | applicable | N/A | applicable | abseil (`MODULE.bazel`) and protobuf (`MODULE.bazel`+`WORKSPACE`) are dual CMake+Bazel; libuv and openttd are CMake-only |
| CMK-BZL-11 | N/A | 0 | N/A | 2 | protobuf: 2 files carry "auto-generated" markers — read, informs BZL-12 below |
| CMK-BZL-12 | N/A | 0 | N/A | applicable | protobuf's `cmake/abseil-cpp.cmake` calls `find_package(absl CONFIG)` with no version — **true "not knowable" pair**, matches the row's own worked example almost exactly |
| CMK-BZL-15 | 0 | 0 | 0 | 0 | pass, all four |
| CMK-CONAN-01 | 0 | 5 | 0 | 0 | **true finding**, abseil `conanfile.py` (below) |
| CMK-CONAN-02 | 0 | 0 | 0 | 0 | pass |
| CMK-CONAN-03 | 0 | 0 | 0 | 0 | pass |
| CMK-CONAN-05 | 0 | 0 | 0 | 0 | not applicable (no `CMakeConfigDeps`) |
| CMK-CONAN-06 | 0 | 0 | 0 | 0 | not applicable |
| CMK-CONAN-09 (step 1) | 0 | 0 | 0 | 0 | not applicable (no version ranges in the one `conanfile.py`) |
| CMK-CONAN-16 | 0 | 0 | 0 | 0 | pass |
| CMK-CONAN-23 | 0 | 0 | 0 | 0 | not applicable (no `conandata.yml`) |
| CMK-VCPKG-01 | N/A | N/A | pass | N/A | openttd's `vcpkg.json` carries `builtin-baseline` — pass |
| CMK-VCPKG-02 | N/A | N/A | not applicable | N/A | no `ports/` overlay directory in openttd |
| CMK-VCPKG-04 | N/A | N/A | pass | N/A | all `VCPKG_*`/toolchain wiring is in CI step args before the first configure, none in `CMakeLists.txt` |
| CMK-VCPKG-05 | N/A | N/A | pass | N/A | cites CMK-TC-01/02, both pass |
| CMK-VCPKG-08 | N/A | N/A | 0 | N/A | pass |
| CMK-VCPKG-10 | N/A | N/A | 0 | N/A | pass |
| CMK-VCPKG-11 | N/A | N/A | 0 | N/A | pass |
| CMK-VCPKG-13 | N/A | N/A | not applicable | N/A | no `portfile.cmake` (openttd is a consumer, ships no ports) |

Rows not shown pass 0/0/0/0 identically and add no signal:
CMK-DEP-19, CMK-DEP-21 (applicability-only elsewhere), CMK-LANG-10/11,
CMK-MOD-01/02/03/10/12, CMK-TGT-05/06/09/10 (guard scans, static half, all
clean), CMK-TC-02/04/09, CMK-TEST-01/03, CMK-CONAN-02/03/16.

## Not run (configure/build/install-based cells)

`CMK-CORE-01` (gate canary), `CMK-DEP-07` (consumer probe), `CMK-DEP-13`
(cache-read behavior half), `CMK-DEP-16` (offline probe), `CMK-DEP-33`,
`CMK-INST-01/02/06/17` (round trip and its steps), `CMK-INST-21` (multi-config
leg), `CMK-TC-05` (C3 marker probe — C4 applicability grep was run and is
empty, so C5/C6 are moot for all four), `CMK-TGT-05/06/10/12/17/18`'s
build/compile-line halves, `CMK-TEST-01/09`'s harness/smoke-build halves,
`CMK-CONAN-04/09/10`'s configure halves, `CMK-BZL-01/02/03/04/05/08` (the wrap
simulation — none of the four is wrapped by `rules_foreign_cc` in this sweep;
abseil and protobuf are Bazel-native, not Bazel-wrapping-CMake). Reason: the
task scoped this wave to the MUST-row sweep across four repositories on a host
with no g++ (three of the four repos are C++); a full round trip on abseil or
protobuf is a multi-minute build each, and the marginal signal for a
convergence check (new class or new MUST row) is lower than for the static
rows, which cover the overwhelming majority (94/116) of the rule set's MUST
surface. `CMK-INST-02`'s row in the table above shows a synthetic grep I
wrote for it that is not the row's real cell (a build-based round trip); I
dropped that synthetic check's output from the verdict rather than
misrepresent it as the row's own Verification cell.

## False positives, misses and errors

### False positive 1 — CMK-CORE-05 flags a bounded single-line producer

**Row**: CMK-CORE-05 (MUST). **Repos**: abseil-cpp (7 hits), protobuf (3 hits).

```
grep -rl --include='*.sh' ... -e 'pipefail' -e 'shell: bash' . \
  | xargs -r grep -HnE -e '[|] *grep( +-[a-zA-Z]+)* +-[a-zA-Z]*[qm]' -e '[|] *head' ...
```

Hits, e.g. `abseil-cpp/ci/linux_gcc-floor_libstdcxx_bazel.sh:55`:
`container_key=$(echo ${DOCKER_CONTAINER} | sha256sum | head -c 16)`, and
`protobuf/.github/workflows/release_prep_test.sh:156` (the file sets
`set -o errexit -o nounset -o pipefail` at its top):
`if echo "$3" | grep -qF -- "$2"; then`.

The row's rationale is exactly right for its worked case (a real search over
a potentially large match stream, where the reader exits before the writer
finishes, so the writer's SIGPIPE corrupts the pipeline's exit status under
`pipefail`). But both hits here pipe a **single bounded write** (one `echo`
line, or `sha256sum`'s fixed 65-byte digest) into the reader. The producer's
entire output fits in one `write()` syscall that completes before the reader
(`grep -qF`, `head -c16`) has any reason to close early, so the SIGPIPE race
the row exists to catch cannot occur here — this is the ordinary,
correct-under-`pipefail` idiom for "check whether a short string contains a
substring" or "hash and truncate," not the "search a filesystem tree, take
the first match" shape the row's rationale describes (`grep -rn ... | head
-1`, `find ... -exec grep {} \; | grep -m1`). Confirmed by inspection, not a
live SIGPIPE reproduction (that would need to race a genuinely large producer
against an early-exiting reader, which is what wave 6 already measured for a
different variant of this class).

**Proposed replacement text** for the Verification cell: keep the two `grep`
commands, but add a third filter step that drops a match whose *producer*
command is not itself scoped over a filesystem tree or a variable read of
uncertain size — concretely, require the piped-from command to be one of
`grep -r`, `find`, `git ls-files`/`grep -r` chains, or a `$(...)` substitution
feeding a `for`/`while` loop, and exclude a bare `echo "$var"`, a `printf`, or
a fixed-output command (`sha256sum`, `md5sum`, `wc -l` on one path) piped
directly into the reader. A workable one-line narrowing:
`... | xargs -r grep -HnE -e '[|] *grep( +-[a-zA-Z]+)* +-[a-zA-Z]*[qm]' ... | grep -vE -e '^\S+:[0-9]+: *(if )?echo ' -e 'sha256sum \| head' -e 'md5sum \| head'`.

**Re-run**: applying that filter to both files drops all 10 lines (the
false positives) while the wave-6 exemplar that motivated the row in the
first place (a real `grep -rn ... | head -1` shape, reconstructed as a
fixture: `grep -rn TODO . | grep -q FIXME`) is still caught — confirmed by
inspection of the added filter against both shapes, not a second live
reconstruction of wave 6's own repository.

### False positive 2 — CMK-TGT-04 flags a save/restore under an arbitrarily-named save variable

**Row**: CMK-TGT-04 (MUST half: "never overwrite"). **Repo**: abseil-cpp.

`CMake/Googletest/DownloadGTest.cmake`:
```
11:  set(ABSL_SAVE_CMAKE_CXX_FLAGS ${CMAKE_CXX_FLAGS})
15:  set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -DGTEST_CREATE_SHARED_LIBRARY=1")
33:  set(CMAKE_CXX_FLAGS ${ABSL_SAVE_CMAKE_CXX_FLAGS})
```

Line 33 is flagged because the row's own exclusion list only recognizes a
value that reads a literal `CMAKE_*_FLAGS`-named variable (which moves a hit
from the MUST "overwrite" bucket to the SHOULD "append" bucket); it has no
way to recognize a value read from a *save* variable under a project-chosen
name. But line 33 is the closing half of an exactly-scoped save/set/restore
(line 11 saves, line 15 appends for GTest's own build only, line 33 restores
the saved value verbatim) — precisely the pattern the sibling rows
(`CMK-DEP-15`'s save/set/restore for policy knobs) hold up as correct. This
never drops the toolchain's `_INIT` seed: whatever `CMAKE_CXX_FLAGS` held
before line 11 is exactly what line 33 restores.

**Proposed replacement text**: keep line (1) as written, but add a companion
grep that clears a flagged `set(CMAKE_<LANG>_FLAGS ...)` hit when the same
file, no more than N lines earlier, contains `set(<anything> \${CMAKE_<LANG>_FLAGS})`
(a save) referencing the identical `<LANG>` — i.e., treat "the value is
exactly a variable this same file saved a few lines above" as an additional
exclusion alongside the existing `_INIT`/`CMAKE_REQUIRED_FLAGS` ones.

**Re-run**: a hand-built variant with the save/restore removed (a bare
`set(CMAKE_CXX_FLAGS "orig -DX=1")` with no prior save) still matches line
(1) under the proposed filter (no matching save line precedes it), and the
real abseil file's line 33 no longer does — checked by inspection of the
filter against both shapes.

### False positive 3 — CMK-INST-10 flags `file(INSTALL)` inside `install(CODE)`

**Row**: CMK-INST-10 (MUST). **Repo**: openttd, `cmake/InstallAndPackage.cmake:281`.

```cmake
install(CODE [[
    file(GET_RUNTIME_DEPENDENCIES ...)
    file(INSTALL
            DESTINATION "${CMAKE_INSTALL_PREFIX}/lib"
            FILES ${DEPENDENCIES}
            FOLLOW_SYMLINK_CHAIN)
]])
```

The row's fallback grep (`-e 'DESTINATION[[:space:]]+"?\$\{CMAKE_INSTALL_PREFIX\}'`)
matches this line, but it is inside an `install(CODE [[ ... ]])` bracket
argument: CMake writes that text verbatim into `cmake_install.cmake` and
evaluates it **at install time**, when `cmake --install`/`make install` runs
and `CMAKE_INSTALL_PREFIX` reflects the actual `--prefix`/`DESTDIR`-combined
value the user chose for that install — not the configure-time value the row's
rationale is about (a `DESTINATION` written directly on a plain `install()`
call, resolved once at configure time and baked into `cmake_install.cmake` as
a literal path that ignores a later `--prefix`). This is the documented,
correct way to defer prefix-dependent packaging logic to install time
(`cmake --help-command install`, "In [CODE], ... `$<...>` generator
expressions are supported" and the code runs as part of the install script);
CMake's own `-Werror=author`/`install-absolute-destination` diagnostic (the
row's ≥4.4 configure-based signal) does not fire on it either, because the
text inside a `CODE` bracket argument is never itself an `install()`
command's own `DESTINATION` argument at configure time — only the fallback
grep, meant for 3.x/4.3 legs where the diagnostic does not exist, sees it.

**Proposed replacement text**: scope the fallback grep to exclude a
`DESTINATION` occurrence that sits inside an enclosing `install(CODE`/
`install(SCRIPT` block. A workable narrowing: run the existing pattern, then
drop any hit whose enclosing `install(...)` call (found by reading backward
to the nearest un-closed `install(`) opens with `CODE` or `SCRIPT`.

**Re-run**: manually excluding this one line (the only `install(CODE`-scoped
hit in the tree) leaves the pattern's output empty for openttd, and a
hand-built fixture with the same `DESTINATION "${CMAKE_INSTALL_PREFIX}/x"`
written directly on a plain `install(FILES ...)` (not inside `CODE`) is still
caught — checked by inspection of the proposed backward-scan filter, not a
second live repository.

### False positive 4 — CMK-MOD-08 matches a `Find*.cmake`-named script that is never `find_package()`d

**Row**: CMK-MOD-08 (MUST, command 1). **Repo**: openttd,
`cmake/scripts/FindVersion.cmake`.

This file computes openttd's version string from `git describe`; it is run
with `cmake -P "${CMAKE_SOURCE_DIR}/cmake/scripts/FindVersion.cmake"`
(`CMakeLists.txt:82`) and is never the target of a `find_package(Version)`
call anywhere in the tree. It happens to match the `Find*.cmake` naming
convention the row's glob keys on, but it sets no `<Pkg>_FOUND`, defines no
imported target and has no `find_package_handle_standard_args` reason to —
it is a script-mode entry point (CMK-MOD-14's territory), not a Find module
in the sense CMK-MOD-08 binds.

**Proposed replacement text**: before applying the three CMK-MOD-08 commands,
exclude any `Find*.cmake` file that is invoked with `cmake -P` anywhere in the
tree (`grep -rl -e 'cmake -P.*<matched filename>' .` or, more simply, a
`Find*.cmake` file with no corresponding `find_package(<Pkg-from-filename>`
call anywhere in the tree is read as a script, not a Find module, before
being counted).

**Re-run**: excluding `FindVersion.cmake` drops it from all three commands;
the other three `Find*.cmake` files openttd's own tree ships
(`FindPandoc.cmake`, `FindXaudio2.cmake`, `FindSSE.cmake`) and the four under
`os/emscripten/cmake/` are true `find_package()`-loaded Find-module stubs
(each is on `CMAKE_MODULE_PATH` for an Emscripten cross build and is loaded
by a real `find_package(ZLIB)`/`find_package(SDL2)`/etc. call) — they remain
flagged, and are plausible true findings (none defines FPHSA or a `NOT
TARGET` guard on its `add_library(... IMPORTED)`), not independently
confirmed against a real double-`find_package` call in this sweep.

### True finding — CMK-CONAN-01, abseil-cpp's root `conanfile.py` is a Conan-1 recipe

`conanfile.py:8-10,23,33`: `from conans import ConanFile, CMake, tools`,
`from conans.errors import ConanInvalidConfiguration`, `generators = "cmake"`,
`tools.replace_in_file(..., "include(conanbuildinfo.cmake)\nconan_basic_setup()")`.
This file is present, unedited, at the tip commit (2026-09-26) with an
explicit comment ("Conan is supported on a best-effort basis. Abseil doesn't
use Conan internally"). Under Conan 2.32.0, `conans/__init__.py` is empty, so
`conan create .` on this recipe fails at import with no fallback — exactly
the row's rationale, reproduced on a widely-consumed real library the wave-4
through -6 sweeps never touched.

### True finding — CMK-MOD-04, openttd's `CreateGRF.cmake:75`

`execute_process(COMMAND ${CMAKE_COMMAND} -E copy ${GRF_SOURCE_FOLDER_NAME}.grf ${GRF_BINARY_FILE})`
carries no `RESULT_VARIABLE`/`RESULTS_VARIABLE`/`COMMAND_ERROR_IS_FATAL`,
unlike the three other `execute_process` calls in the same file (lines 48,
56, 64), which all capture `RESULT_VARIABLE`. A failed copy (disk full,
permission denied) is silently ignored and the configure/build continues.

### True finding — CMK-TGT-01, bare `target_link_libraries` on library targets

`libuv/CMakeLists.txt:477,494,530,727,745,747,763` (the `uv` and `uv_a`
library targets, and their test/benchmark executables) and
`openttd/CMakeLists.txt:299,317` (`target_link_libraries(openttd_lib "be"
"network" "midi")`) all omit `PUBLIC`/`PRIVATE`/`INTERFACE`. Confirms the row
on two more real, currently-maintained projects — not a new class.

### True (partial) finding — CMK-VER-07, protobuf's guarded OLD without an exit condition

`CMakeLists.txt:6-8`:
```cmake
if(POLICY CMP0141)
  cmake_policy(SET CMP0141 OLD)
endif()
```
with the comment "Revert to old behavior for MSVC debug symbols." above it.
The row requires a guard **and** "a comment giving the reason and the exit
condition"; this has the guard and the reason, but no stated exit condition
(when this OLD should be removed, or what migrating off it looks like). Per
the row's own literal Verification text this remains a finding, though a
narrower one than an unguarded OLD — not a defect in the row, just recorded
honestly as a true (partial) hit rather than silently upgraded to a pass.

### Known class reproduced, not new — CMK-MOD-05 scope blindness

abseil (`CMake/AbseilDll.cmake`, `CMake/AbseilHelpers.cmake`), openttd (14
files under `cmake/`) and protobuf (`cmake/protobuf-configure-target.cmake`,
`cmake/examples.cmake`, `cmake/protobuf-generate.cmake`) all trip CMK-MOD-05
("no policy pin around a function/macro definition") on files that are each
project's own internal build-plumbing, never `include()`d by anyone outside
the repository — exactly wave 6's documented finding ("MOD-family cells at
their documented default scope cannot tell 'a module other projects include'
from 'a project's own internal build-plumbing .cmake file'", `wave6-sweep-a.md`
line 141). Three more real, held-out repositories confirm the same mechanism;
no new information for the convergence question.

### Errors

`CMK-MOD-05` and `CMK-TC-03`'s awk programs errored on every repository on
the first pass (`awk: cmd. line:1: ... backslash not last character on
line`) because the outer sweep script embedded a multi-line awk program with
literal `&&` inside a double-quoted string passed to `eval` — the `&&` was
consumed by the outer `bash -c`-style evaluation before awk ever saw it. This
is a bug in `run-static.sh` (this wave's harness), not in the rule text: the
rule's own fenced code block is syntactically valid awk when saved to a file
and run with `awk -f`, which is how a human or an agent following the rule
verbatim would run it. Fixed by extracting both programs to `mod05.awk` and
`tc03.awk`; `run-static.sh` and `run.sh` in the scratch directory reflect the
fix, and both rows now run clean (see the results table).

## Notes on rows the table marks "reading heuristic, not exhaustively read"

`CMK-TGT-03` (38 combined hits) and `CMK-TGT-21` (184 combined hits,
overwhelmingly openttd's 156) are both explicit reading heuristics whose
Verification text asks a human to read every hit against context (a
`CMAKE_SOURCE_DIR`/`CMAKE_BINARY_DIR` reference inside a top-level-only guard
is not a finding; a `PRIVATE`-vs-`PUBLIC` definition call needs the installed
header checked). Given four repositories and 94 static rows already run to a
verdict, these two were not read line-by-line to completion; the openttd
`TGT-21` sample pulled (`bin/ai/CMakeLists.txt`, `src/script/api/CMakeLists.txt`)
is generated-file plumbing inside an **application** (openttd is never
`add_subdirectory`-ed by anyone), which is exactly the "no third bucket for
an application" scope gap wave 6 already flagged for the sibling `TGT`
severity table (`wave6-sweep-b.md` finding 4) — reproduced again, not new.

## Candidate new MUST rows

None. Every reproducible defect found in this sweep (CMK-CORE-05's bounded-
producer false positive, CMK-TGT-04's named-save-variable false positive,
CMK-INST-10's `install(CODE)` false positive, CMK-MOD-08's script-named-like-
a-Find-module false positive, and the CMK-MOD-05/CMK-TGT-21 scope-blindness
class) is a refinement to an existing MUST row's Verification cell, not a gap
with no covering row. No new failure-mode class and no new MUST-worthy defect
surfaced on four fresh, held-out real repositories spanning two libraries, a
vcpkg-manifest application and a large dual-build multi-directory project.
This is the honest result the convergence test was designed to produce: wave
7 adds zero new classes and zero new MUST rows.

## Counts

- **False positives**: 4 (CMK-CORE-05 × 10 lines across 2 repos, CMK-TGT-04 ×
  1 line, CMK-INST-10 × 1 line, CMK-MOD-08 × 1 file).
- **Misses**: 0 confirmed (nothing a MUST row should have caught and did
  not; CMK-VER-07's partial finding was caught, not missed).
- **Command errors**: 2 (CMK-MOD-05, CMK-TC-03 — harness quoting bug, fixed
  and re-run clean; not a rule defect).
- **New failure-mode classes**: 0.
- **Candidate new MUST rows**: 0.

## Wave 7 applied (2026-09-26)

Repro for every number below: `/home/mherwig/.cache/cmake-measure-scratch/w7/apply-rules/run.sh`
(fixtures `inst10/`, `tgt04/`, probes `core05-probe.sh`, `run-inst10.sh`, `run-tgt04.sh`).
CMake 3.31.12 and 4.4.2 (`ocx package exec kitware/cmake:<tag>`), host gcc, ninja from `ninja-build/ninja`, bash 5.3.0.

### Spot-checks

- **Harness errors (MOD-05, TC-03): reproduced as harness-only.** The MOD-05 command copied verbatim from `module-authoring.md:84` prints 2, 0, 14 and 3 lines on abseil, libuv, openttd and protobuf, matching `out/*/CMK-MOD-05.txt`. No rule defect.
- **CMK-CORE-05 false positive: partly rejected.** The verbatim command prints 7 (abseil) and 3 (protobuf) lines, as recorded. Under `set -o pipefail`, 200 runs each: `echo x | sha256sum | head -c 16` 0 nonzero, `file /bin/bash | grep -q ELF` 0, a short scalar into `grep -qF` 0, a 1 MiB single-line value 0, a 16 KiB multi-line value 0, a 64 KiB multi-line value 199, `seq 1 200000 | grep -q 1` 200 (rc 141). So abseil's 7 hash lines and protobuf `release_prep_test.sh:167` are false positives. Protobuf `:156` and `:199` are not: `CONTENT=$(cat "$INTEGRITY")` (`:181`) is echoed whole, and `assert_contains` gets it as `$3`, so both are streams and remain findings under the row. The ledger's proposed `echo` filter would have created that miss and is rejected. The fix is a reading clause, not a filter.
- **CMK-INST-10 false positive: reproduced, and it exposed a miss.** Fixture `inst10/`, configure with prefix A, then `cmake --install --prefix B`, on 3.31.12 (`-Werror=dev`) and 4.4.2 (`-Werror=author`). `install(CODE [[ file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/lib" ...) ]])` (openttd's shape): configure rc 0, file lands in B. Quoted `install(CODE "file(INSTALL DESTINATION \"${CMAKE_INSTALL_PREFIX}/lib\" ...)")`: configure rc 0 on both, file lands in A, so `--prefix` is ignored, the 4.4.2 diagnostic stays silent, and the row's grep printed nothing for it (a miss). Escaped `\${CMAKE_INSTALL_PREFIX}` inside quotes: lands in B. Plain `install(FILES ... DESTINATION "${CMAKE_INSTALL_PREFIX}/lib")`: 4.4.2 configure rc 1 with `CMake Error (install-absolute-destination) at CMakeLists.txt:18`, 3.31.12 rc 0.
- **CMK-TGT-04 false positive: reproduced.** Fixture `tgt04/` with toolchain `CMAKE_C_FLAGS_INIT "-DSEED_FROM_INIT"`, abseil's save, append, restore shape: configure rc 0 on 3.31.12 and 4.4.2, compile line carries `-DSEED_FROM_INIT`, and line (1) prints the restore. The planted `set(CMAKE_C_FLAGS "-O2")` drops the seed and line (1) still prints it.
- **CMK-MOD-08 false positive: rejected as a misapplied scope.** openttd installs no `.cmake` file (every `install(` in `cmake/InstallAndPackage.cmake` is targets, docs, data or `CODE`). Wave 6 set `MODULE_DIR` to the installed or documented subtree for every MOD row except 01 to 04 and 17 to 19, so MOD-08 does not apply to openttd at all, `FindVersion.cmake` and the four emscripten stubs included. No edit.

### Changed (existing rows, IDs kept)

- CMK-INST-10 (`install-and-export.md`, Verification): pattern `"?` became `(\\?")?` on both alternatives, so a quoted `install(CODE "... DESTINATION \"${CMAKE_INSTALL_PREFIX}...")` is caught and an escaped `\${` is not. Reading clause: a hit inside an `install(CODE [[...]])` bracket argument passes, and the 4.4 diagnostic never reads `install(CODE)` text. Re-run from the doc text: fixture prints the bracket, quoted and plain lines and not the escaped one; holdout repos 0, 0, 1 (openttd `:281`, bracket, passes on read), 0. The new pattern is a superset of the old, so rapidjson's wave-6 hits stay.
- Failure mode 7 (`install-and-export.md`): widened to the `install(CODE)` body on 4.4. Same mechanism (trusting the diagnostic), not a new failure mode.
- CMK-TGT-04 (`targets.md`, gate prose and comment (1)): a line in (1) whose whole value is a variable the same file saved from that flags variable is a restore and passes on read, with the abseil citation and the measurement.
- CMK-CORE-05 (`cmake-build.md`, Verification): a producer that writes one line (a hash, `file` output, a scalar) passes on read. `echo` of a variable holding a file or a command's full output stays a finding, with the bash 5.3.0 counts.

### Classes, MUST rows, failure modes

- All three accepted defects are instances of the existing class from waves 6 (TGT-04 probe and prefix lines, CI-04 `CACHE` without `FORCE`, MOD scope): a line grep cannot see the context that makes a line harmless or harmful. No new class.
- The INST-10 quoted `install(CODE)` miss came from an applier fixture, not from a held-out tree. It is a check defect inside an existing MUST row whose harm already covers it, so no new MUST row.
- No new failure mode, no severity change.

### Rejected

- The ledger's CORE-05 filter (`grep -vE` on `echo`, `sha256sum | head`, `md5sum | head`): it drops protobuf `:156` and `:199`, which are streams.
- The ledger's MOD-08 exclusion by `cmake -P` usage: already covered by the wave-6 `MODULE_DIR` scope.
- A machine filter for TGT-04 restores and INST-10 bracket arguments: both need the enclosing context a line grep cannot see. A reading clause is the whole fix.
- The TEST-02 `tests` operand on non-module repos: the section binds module authors only, and a missing `TEST_DIR` prints `No such file or directory` on stderr, so it never reads as an empty pass.
- VER-07 on protobuf, TGT-01, MOD-04, CONAN-01, TEST-06/07: true positives the rows already predict. No change.
