---
title: CMake and C++ package management — phase 0 frame
program: cmake
companion_to: bazel (see bazel-frame.md and bazel-topic-map.md, group 9 `bazel-cpp`)
date: 2026-09-05
method: research-lang (a build system, its package-manager ecosystem, and one interop seam — not a language)
status: active
---

# CMake and C++ package management — the frame

Written before any worker was spawned. Everything below is a hypothesis the
grounding wave may overturn; corrections are appended at the bottom, never
edited into the body.

## The domain and its era

CMake as the C and C++ build-system generator: the CMake language (scoping,
policies, cache, functions versus macros, script mode), target-based
buildsystem design (usage requirements, generator expressions, install and
export, Config packages versus Find modules), dependency acquisition
(`find_package`, `FetchContent`, `ExternalProject`, dependency providers),
presets and toolchain files, CTest and CPack, and the tooling around it
(`cmake-lint`, gersemi, `-Werror=dev`, compiler launchers, compile databases).

The package managers the requester named: **Conan 2**, **vcpkg**, **Hunter**
and its **cpp-pm** fork (`github.com/cpp-pm/hunter` is the maintained fork of
`ruslo/hunter`; the frame reads "cpp-pm" as that fork, and the scouts must also
weigh `CPM.cmake`, which the request did not name but which occupies the same
niche). Their interoperability with each other and with Bazel.

Era: September 2026. The fleet's own survey of Kitware's releases on 2026-07-29
lists CMake **4.4.1** as the newest release (`mirror-kitware/cmake/mirror.yml`,
verify the current one). CMake 4.0 (2025) removed compatibility with
`cmake_minimum_required` floors below 3.5, which breaks unmaintained
dependencies at configure time. `find_ocx` requires 3.19 (`string(JSON)`,
`file(ARCHIVE_EXTRACT)`) and its harness dogfoods the 3.31 and 4 lines as OCX
packages. Shifts to check rather than assume: C++20 named modules (3.28) and
`import std` (3.30, experimental), the Common Package Specification and
`install(PACKAGE_INFO)` in the 4.x line, presets schema versions, `cmake
--workflow`, `CMAKE_POLICY_VERSION_MINIMUM`, Conan 2's `conan_provider.cmake`
dependency provider and its Bazel generators (`BazelDeps`, `BazelToolchain`)
rewritten for Bzlmod, the experimental `CMakeConfigDeps` generator, vcpkg
registries and versioning, vcpkg's asset and binary caching, whether Hunter is
maintained at all in 2026, CPM.cmake's source cache and `CPM_USE_LOCAL_PACKAGES`,
the JetBrains and ISO C++ survey numbers on package-manager adoption, and pixi
or OCX-style tool provisioners entering the space.

## The codebases that will adopt the output

Measured 2026-09-05 with `find` under `/home/mherwig/dev`, excluding
`node_modules`, `.git`, `target`, `build`, `docs/.venv`.

**The fleet has one CMake codebase and zero C++ codebases.** `find_ocx` is
CMake support for OCX: two copy-and-own files that bootstrap a pinned,
sha256-verified `ocx` CLI and provision tools through it. It is the CMake
sibling of `rules_ocx`, whose own handover says `find_ocx` "mirrors that
design almost line for line" (`find_ocx/OCX-0.5-HANDOVER.md`).

| Measurement | Value | Command |
|---|---|---|
| `ocx.cmake` | 1,506 lines, 21 functions (16 private `__ocx_*`, 5 public: `ocx_bootstrap`, `ocx_project`, `ocx_package`, `ocx_index`, plus `__ocx_self_update` reachable in script mode) | `wc -l ocx.cmake; grep -oE '^(function\|macro)\([A-Za-z_]+' ocx.cmake` |
| `Findocx.cmake` | 90 lines, standalone on CMake 3.15, bootstrap fallback opt-in | `wc -l Findocx.cmake` |
| Process and network surface | 3 `execute_process`, 5 `file(DOWNLOAD)`, 17 `string(JSON)`, 8 `ENV{` reads, 37 `FATAL_ERROR` | `grep -c … ocx.cmake` |
| Scoping | 26 `PARENT_SCOPE`, 4 `CACHE` writes, 6 `cmake_parse_arguments` | same |
| Policies | `CMP0074` is the only policy named; `cmake_policy(PUSH)`/`VERSION 3.19` pins function definitions | `grep -oE 'CMP0[0-9]{3}' ocx.cmake Findocx.cmake` |
| Harness | `LANGUAGES NONE`; 10 test families run once per provisioned CMake line (3.31 and 4) via `ctest --build-and-test` with `-Werror=dev` | `CMakeLists.txt`, `tests/helpers.cmake` |
| CI | Lint, Docs (Sphinx CMake domain, `-W`), Test, Examples matrix, Offline-determinism job | `.github/workflows/ci.yml` |
| Working tree | **dirty**: 10 files, +145/−175, the ocx 0.5.2 adoption from the handover (namespaced catalog grammar, lock v3) | `git status --short; git diff --stat` |

The grounding audit must measure the working tree as it stands and say which
findings are about committed code and which about the in-flight change.

Everything else in the fleet that touches the domain:

| Shape | Where | Measured |
|---|---|---|
| CMake toolchain as an OCX product | `mirror-kitware/cmake/mirror.yml` publishes Kitware's binaries as `ocx.sh/kitware/cmake` with a measured per-arch glibc floor; `ocx-contrib/mirror-ccache` exists | The provisioning side of the story |
| A CMake probe directory | `test/`: `cmake_minimum_required(VERSION 4.0)`, presets schema 8, no sources | Scratch, not a consumer |
| C or C++ sources | 4 header-ish files in `bob/playground`, 1 each in two Python SDKs (vendored) | No C++ build anywhere |
| `conanfile.*`, `vcpkg.json`, HunterGate, CPM | **zero** fleet-wide | The package-manager topics have no fleet consumer and ground on canonical sources and exemplar repositories |
| Existing AI config touching CMake | `find_ocx/.claude/rules/{dist-snapshot,mirror-auth}.md` (16 lines each), no `AGENTS.md`, no CMake language rule | Nothing normative about CMake itself exists in the fleet |

So the shipped set has two audiences, and the second is the larger one:

1. **Authors of CMake modules like `find_ocx`** — CMake-language hygiene for a
   1,500-line module that downloads, verifies, executes and exports.
2. **C++ projects that consume `find_ocx`** — they already use Conan, vcpkg or
   CPM for libraries; OCX competes with Conan `tool_requires` and vcpkg host
   dependencies for *tool* provisioning. How `find_package`, `<Pkg>_ROOT`
   (CMP0074), `CMAKE_PROGRAM_PATH`, toolchain files and dependency providers
   compose across two or three providers is the sharp question.

## The requester's hypothesis (to test, not to accept)

1. CMake plus its package-manager ecosystem is one coherent quality surface
   worth one rule set.
2. Conan 2, vcpkg and Hunter/cpp-pm are the package managers that matter, and
   their interoperability (with each other and with Bazel) is where the
   guidance is thin.
3. Bazel interop is *companion* scope: the Bazel side belongs to the Bazel
   program; this program covers the CMake side of the seam.

The scouts must find what this list does not name. Candidates the frame
suspects but did not verify: CPM.cmake and `FetchContent` as the de facto
"no package manager" package manager; dependency providers as the neutral
seam every manager plugs into; the `CMAKE_TOOLCHAIN_FILE` collision between
vcpkg's toolchain and Conan's `conan_toolchain.cmake`; two copies of one
library when `FetchContent` and `find_package` meet; ABI and `cppstd`
mismatches across managers; lockfiles (Conan lockfiles, vcpkg baselines, CPM
pins) and binary caches; the CMake policy list as a taxonomy of past mistakes;
the 4.0 compatibility floor; presets as the CI contract; install and export
correctness for relocatable Config packages; RPATH and Windows DLL handling;
C++20 modules; compile databases and compiler launchers; reproducible builds;
CTest sharding and `--test-dir`; distro packaging expectations
(`GNUInstallDirs`, multi-arch); what dual CMake-and-Bazel projects (abseil,
gRPC, protobuf, googletest) do to keep two build descriptions in sync.

## The companion contract with the Bazel program

The Bazel program (`bazel-frame.md`, `bazel-topic-map.md`) is in flight on the
main checkout; its group 9 `bazel-cpp` (family `BZL-CC`) owns rules_cc,
hermetic C++ toolchains, `layering_check`, sanitizers under Bazel,
`compile_commands.json` under Bazel, C++20 modules under Bazel, and
`rules_foreign_cc` *from the Bazel side* (its dive 9.3
`foreign-builds-modules-and-cpp-tooling`, row M-L-13). Nothing here re-treads
that.

This program owns the CMake side of the seam:

- What a CMake project must do to be wrappable by `rules_foreign_cc` or
  vendored into a Bazel repo: install rules, relocatable Config packages, no
  configure-time network, no absolute paths in exported targets, static versus
  shared discipline.
- Conan 2's Bazel generators and vcpkg under Bazel: whether a C++ dependency
  graph can have one source of truth across Conan Center, the vcpkg registry
  and the BCR, and what the two-lockfile problem looks like from this side.
- The dual-build-system exemplars and their sync mechanisms.
- The "should this C++ repo be CMake plus a package manager, or Bazel"
  question only as a decision branch, mirroring the Bazel program's rule that
  comparison sets are never a rule surface.

Links from this corpus to the Bazel corpus use sibling relative paths
(`bazel-topic-map.md`, `bazel-cpp/<slug>.md`); both trees land under
`.agents/research/` on merge, and the `bazel-cpp/` dives were not yet written
on 2026-09-05.

## The artifact set (hypothesis)

Per `research-lang/references/rule-distillation.md`: rules carry standards,
skills carry procedures, hex workers read rules not skills.

| Artifact | Kind | Carries |
|---|---|---|
| `cmake-quality` (working name) | Glob-scoped rule + support directory | CMake-language hygiene, target-based design, `find_package` and Config packages, dependency acquisition and providers, presets and toolchains, CTest, install and export, tooling, and one depth file for the Bazel seam |
| `cpp-packaging` (working name) | Second rule, **only if** the map confirms a genuinely different glob | Conan 2 and vcpkg manifests, lockfiles and baselines, registries, binary caching, `tool_requires` versus other tool provisioners |
| `cmake-essentials` | Bundle | The above, members untagged |

No skill is assumed. A `cmake-modernize` procedure (legacy tree to target-based)
is the one candidate; the map decides whether it is a procedure anyone runs
twice or a section of a depth file.

Open glob question for the map. Names the build systems guarantee:
`**/CMakeLists.txt`, `**/*.cmake`, `**/CMakePresets.json`,
`**/CMakeUserPresets.json`, `**/conanfile.py`, `**/conanfile.txt`,
`**/conandata.yml`, `**/vcpkg.json`, `**/vcpkg-configuration.json`. Names
convention chooses and the map must justify or reject: `**/*.cmake.in`,
`**/conan.lock`, `**/CMakeUserPresets.json` (often gitignored), `**/CPM.cmake`
and `**/HunterGate.cmake` (both already `*.cmake`). Generated files
(`CMakeCache.txt`, `compile_commands.json`) are out.

## Constraints the shipped artifacts must meet

- Rule IDs `CMK-<FAMILY>-nn`. `CMK-` is free: zero hits across `rules/`,
  `skills/`, this corpus and the Bazel map on 2026-09-05. A prefix belongs to
  exactly one rule set.
- Index under 200 lines. Depth files carry a table of contents past 100 lines
  and never point at each other.
- Every rule carries a verification: a `cmake -Werror=dev` outcome, a
  `cmake-lint` or gersemi check name, a `cmake --trace-expand` or
  `cmake --graphviz` reading, a `ctest`, `conan` or `vcpkg` subcommand, a grep
  over `CMakeLists.txt` and `*.cmake`, or a named reading heuristic. Every
  verification states which way empty output reads. Every `rg` carries a path
  operand; `**` is quoted; `-e A -e B` is a union.
- Version-specific guidance names the CMake minor, the Conan or vcpkg era, and
  the date. The 4.0 floor removal is the first thing an agent trained on 3.x
  text gets wrong.
- Portable: no fleet paths, no OCX-internal names in the shipped files. The
  `find_ocx` mechanisms are worked examples of a pattern, never the pattern.
- House voice of the sibling sets: traps, not maps. Plain-English limits from
  `docs-quality` where they apply to prose.
- Budget: this session tripped the account limit once today. Waves stay at or
  under 9 workers; decision agents run on opus, surveys on sonnet; roughly 3M
  subagent tokens per hour is the ceiling.

## Corrections

Appended by later waves. Where a correction disagrees with the body above,
the correction wins.

## Exemplar corpus as fetched

### Wave 1 grounding and scouting (2026-09-06, 00:30 CEST)

Sources: `cmake-audit/find-ocx-cmake-shape-and-contracts.md`,
`cmake-audit/fleet-inventory-and-bazel-overlap.md`,
`cmake-audit/exemplar-cmake-shape.md`, `cmake-audit/exemplar-deps-and-dual-build.md`,
and the five scouts under `cmake-topic-map/`. 9 workers, 0 dropped, 150
sources across the scouts, 198 candidate rows before deduplication, 1.96M
subagent tokens, 28 minutes.

1. **The era is newer than the body says.** CMake 4.4 is current; 4.3
   (2026-03-17) made the Common Package Specification non-experimental
   (`install(PACKAGE_INFO)`, `find_package` reads `.cps`; `install(SBOM)` and
   the `install(EXPORT)`-based CPS variant stay experimental). CMake 4.4
   replaced `-Wdev`/`-Werror=dev`/`--warn-uninitialized` with a categorised
   diagnostics system (`cmake-diagnostics(7)`, `-Werror=author`,
   `-Wuninitialized`); the old spellings are deprecated synonyms. **The
   body's own verification convention (`-Werror=dev`) is therefore
   deprecated** and every shipped verification must name the 4.4 form with
   the 3.x fallback. Presets schema runs 5 (3.24) to 12 (4.4); schema 12
   renamed the `dev` warnings key to `author`. Conan 2.32.0 (2026-08-31),
   `CMakeConfigDeps` still experimental but recommended by cmake-conan,
   `build_requires` deprecated for `tool_requires` (~2.28), BazelDeps
   supports Bazel 9 (2.30), Workspaces graduated (2.31), `conan audit`
   (2.14). vcpkg removed the `x-gha` binary-cache provider and retires
   vcpkg-artifacts after 2026-07-01. CPM.cmake 0.43 (2026-07-06) now tells
   users to pin commit hashes. gersemi 0.28.1 (2026-08-19) is maintained;
   cmake-format/cmake-lint last released 2020-08-19.
2. **The 4.0 floor removal is a downstream risk, not an own-floor risk.** 0 of
   33 exemplars with a discoverable floor sit below 3.5. The live exposure is
   one hop away: vendored or fetched dependencies. Six repos inject
   `CMAKE_POLICY_VERSION_MINIMUM=3.5` for exactly that reason (arrow, hunter,
   vcpkg, qtbase, nlohmann/json CI), and arrow's save-set-restore around one
   `find_package` is the pattern to encode.
3. **Hunter is maintained and unadopted.** cpp-pm/hunter shipped v0.26.11 on
   2026-08-27 and fixed the 4.0 floor break in June 2026; 0 of 45 other
   exemplars use HunterGate. Its practical weight in a 2026 rule set is one
   comparison row, not a depth file.
4. **Dependency providers are a one-implementation feature.** Exactly one
   manager implements `cmake_language(SET_DEPENDENCY_PROVIDER)` (Conan via
   cmake-conan); vcpkg does not; 1 of 46 exemplars uses one. Only one provider
   can be active, registration counts only inside `CMAKE_PROJECT_TOP_LEVEL_INCLUDES`
   during the first `project()`, and providers need CMake 3.24 (module-name
   form 3.29) so a 3.19-floor module cannot lean on them. "The neutral seam
   every manager plugs into" is overstated; CPS is the stronger candidate for
   that role and is the subject of the owner-commissioned dive.
5. **CPS and `cmake --workflow` have zero real adopters in the corpus.** Both
   appear only in Kitware/CMake's own tests and docs. A rule that expects
   either holds every real project to a standard none meets; the CPS
   consolidation must decide "prepare" versus "ship".
6. **The suspected duplication is real and has three sanctioned idioms.** 8
   exemplars reach one package via both `find_package` and
   `FetchContent`/CPM/ExternalProject in one build (arrow, ccache, grpc,
   protobuf, curl, spdlog, vcpkg-tool). arrow and protobuf resolve it with
   `OVERRIDE_FIND_PACKAGE` or try-find-then-fetch; ccache's `FindZstd.cmake`
   fetches on a MODULE miss, a hidden network dependency behind a local
   search. `find_package` carries a version in 3.2 percent of 6,957 calls and
   a range in 0.2 percent.
7. **CMake-authoring hygiene is unenforced where C++ hygiene is enforced.**
   `.clang-tidy` in 17 of 46, `.clang-format` in 23 of 46; gersemi or
   cmake-lint in pre-commit 0 of 46; `-Werror=dev` in CI 1 of 46 (find_ocx).
   35 percent of 8,453 `target_link_libraries` calls (2,980) use the bare
   legacy signature. Presets in 5 of 46. C++20 modules in production in 2 of
   46 (fmt, nlohmann/json), each as an opt-in extra target beside the
   classic build, never a replacement.
8. **11 of 46 exemplars are dual CMake-and-Bazel; 4 have no sync mechanism**
   (googletest, re2, yaml-cpp, zlib). rules_foreign_cc at f68b351c46
   (2026-06-26) bundles CMake 3.19.8 to 4.0.7 (default 3.31.12), blocks
   network by default (opt-out tag), and synthesises a CMake toolchain file
   unless the caller supplies `CMAKE_TOOLCHAIN_FILE`, which is the third party
   to the vcpkg/Conan toolchain-file collision. The Bazel corpus names CMake
   in exactly one map row (M-L-13) and one dive (9.3) and never mentions Conan
   or vcpkg; the seam is this program's alone.
9. **`find_ocx` is clean where the frame feared and broken where it did not
   look.** 0 unquoted variable references in 240 `if()` sites, 0 bare
   `foreach(x ${list})`. Real defects: `__ocx_set_result` (`ocx.cmake:609-611`)
   writes `CACHE INTERNAL` without `FORCE`, so every exported `OCX_<name>_*`
   value and the memo fingerprint go stale after the first invalidated
   reconfigure, and `tests/reconfigure_check.cmake` never exercises that
   path; `cmake_policy(POP)` sits at line 1383, not at EOF as the line-178
   comment claims, leaving `__ocx_self_update` outside the pinned policy
   scope; 0 of 5 `file(DOWNLOAD)` set `TLS_VERIFY` and 2 of 5 carry
   `EXPECTED_HASH`; `__ocx_default_hint` names 4 of ocx's ~14 sysexits where
   rules_ocx names 14; 5 of 10 test families skip `-Werror=dev` on their inner
   configure; CI's examples matrix omits `frozen_index` that the local gate
   runs. The dirty tree is two unrelated changes (the handover's 0.5.x
   adoption plus an undocumented PINS/PLATFORM removal) and is
   self-inconsistent: `ocx.lock` says ocx 0.5.6, `__OCX_PIN_VERSION` says
   0.3.11, rules_ocx requires 0.6.0.
10. **The body's fleet table was too generous in one direction and too
    narrow in another.** 657 fleet files mention CMake but only as an OCX
    worked example; true CMake guidance is 32 lines. The fleet's own docs
    never position find_ocx against Conan `tool_requires` or vcpkg host
    dependencies; that comparison is this frame's inference, not the fleet's
    claim. Four duplicate ocx clones inflate any fleet grep 3.49 times.
11. **PROJECT_IS_TOP_LEVEL needs a shim below 3.21.** A 3.19-floor module
    cannot use it natively; cmake-init ships the compat form.
12. **A measurement bug was found and fixed in this program's own scripts.**
    `set -o pipefail` with `grep -q` produced SIGPIPE false negatives that
    zeroed five presence cells in the first `exemplar-table.md` and every
    adoption column for Kitware/CMake; both files were regenerated. Same
    class as the Python program's `head -1` finding.

### Owner commission during wave 1 (2026-09-05, late evening)

The owner asked for a dedicated research pass on the Common Package
Specification, starting from Kitware's post
<https://www.kitware.com/navigating-cmake-dependencies-with-cps/>. Launched
as its own mini-wave ahead of the map: two sonnet dives with distinct lenses
(the spec and CMake's implementation; ecosystem adoption and interop) under
`cmake-dependency-seam/`, then an opus claim-verifier that re-fetches every
version and status claim and writes `cmake-dependency-seam/cps-verification.md`.
The map must treat `cmake-dependency-seam` as an existing group and CPS as
already dived, and must route the dependency-provider, `find_package`,
Conan/vcpkg-integration and Bazel-seam questions into that same group.

Fetched 2026-09-05 23:50 CEST by `cmake-audit/scratch/fetch-exemplars.sh` into the session scratchpad (`/tmp/claude-1000/-home-mherwig-dev-grimoire-lore--agents-worktrees-java/c4f22277-6831-442c-8bc3-1be41a79fdff/scratchpad/exemplars/<owner>__<repo>`). Blob-less depth-1 clones with a non-cone sparse checkout of build and configuration files: `git ls-tree -r --name-only HEAD` lists every tracked path, `git show HEAD:<path>` fetches any blob on demand. 46 repositories, 0 failed. Chosen for shape diversity: header-only and compiled libraries that ship Config packages, dual CMake-and-Bazel projects (abseil, gRPC, protobuf, googletest, re2, benchmark), the package managers' own repositories and registries (vcpkg, conan, conan-center-index, cpp-pm/hunter, CPM.cmake, cmake-conan, rules_foreign_cc), starter templates that codify opinions (cmake-init, cmake_template, project_options, ModernCppStarter, modern-cpp-template), C libraries with long CMake histories (zlib, curl, openssl, libuv), CMake-heavy frameworks (LLVM, Qt, KDE ECM, Boost), large mixed builds (ClickHouse, duckdb, arrow), build tools that build themselves (CMake, ninja, ccache, sccache), and `find_ocx` itself. Because the fleet has no C++, the C++-side grounding runs against this corpus, not the fleet; workers measure files only, never run a build, and cite `repo@sha:path:line`.

| repo | sha | tracked paths | checked-out files |
|---|---|---|---|
| abseil/abseil-cpp | `38f8c1535d` | 1601 | 718 |
| aminya/project_options | `d386a62c58` | 153 | 122 |
| apache/arrow | `e0cf4184dd` | 5322 | 2419 |
| bazel-contrib/rules_foreign_cc | `f68b351c46` | 567 | 419 |
| boostorg/boost | `cb94f33fcb` | 415 | 37 |
| catchorg/Catch2 | `897d8043eb` | 587 | 90 |
| ccache/ccache | `e256302fa6` | 438 | 190 |
| ClickHouse/ClickHouse | `5cbca3e099` | 76695 | 48358 |
| conan-io/cmake-conan | `b1593849dd` | 43 | 37 |
| conan-io/conan-center-index | `db3706004e` | 14534 | 14508 |
| conan-io/conan | `e42971dc29` | 1148 | 37 |
| cpm-cmake/CPM.cmake | `456cb6754d` | 137 | 95 |
| cpm-cmake/CPMLicenses.cmake | `ca42334d56` | 10 | 9 |
| cpp-best-practices/cmake_template | `b86318abbf` | 71 | 59 |
| cpp-pm/hunter | `708cab1c49` | 3001 | 1671 |
| curl/curl | `68ed69a5ab` | 4486 | 2464 |
| duckdb/duckdb | `e3946f2327` | 15640 | 8559 |
| filipdutescu/modern-cpp-template | `0fab2c3552` | 32 | 26 |
| fmtlib/fmt | `d90c33606c` | 145 | 52 |
| friendlyanon/cmake-init | `7e0c52fc73` | 88 | 50 |
| gabime/spdlog | `57cb5fb7a8` | 185 | 29 |
| gflags/gflags | `bdda022e7c` | 70 | 45 |
| glfw/glfw | `92dcf4ce74` | 165 | 35 |
| google/benchmark | `04b5f41ec7` | 223 | 84 |
| google/googletest | `283c17563f` | 252 | 32 |
| google/re2 | `972a15cedd` | 139 | 42 |
| grpc/grpc | `6e5ac36afe` | 10499 | 2908 |
| jbeder/yaml-cpp | `e5fe9f2cdd` | 401 | 55 |
| KDE/extra-cmake-modules | `b4c4ec9997` | 637 | 367 |
| Kitware/CMake | `1ef330f5ee` | 31577 | 15039 |
| libuv/libuv | `c2a11ca202` | 483 | 48 |
| llvm/llvm-project | `5115f32500` | 183592 | 104076 |
| madler/zlib | `e3dc0a85b7` | 271 | 167 |
| microsoft/vcpkg | `04a9d8e521` | 14284 | 14266 |
| microsoft/vcpkg-tool | `f9eb9c63d0` | 2042 | 740 |
| mozilla/sccache | `05aafc82b9` | 198 | 70 |
| ninja-build/ninja | `de0898246f` | 194 | 47 |
| nlohmann/json | `09b6b6b5ba` | 1230 | 415 |
| nothings/stb | `2c980bb598` | 431 | 47 |
| ocornut/imgui | `96b6eb7728` | 304 | 173 |
| ocx-sh/find_ocx | `ac2a759cd0` | 59 | 49 |
| openssl/openssl | `1935d215b5` | 6116 | 3561 |
| protocolbuffers/protobuf | `e816e3cbab` | 3546 | 1062 |
| qt/qtbase | `d95af8296a` | 23634 | 9114 |
| Tencent/rapidjson | `24b5e7a8b2` | 314 | 167 |
| TheLartians/ModernCppStarter | `72b8957f9e` | 28 | 21 |

### CPS mini-wave result (2026-09-06, 01:10 CEST)

`wf_738adcf6-b53`: 3 agents, 0.61M tokens, 35 minutes. Two dives
(`cmake-dependency-seam/cps-spec-and-cmake-implementation.md`, 27 sources;
`cps-ecosystem-adoption-and-interop.md`, 29 sources) and an opus verifier
(`cps-verification.md`: 63 claims re-fetched, 52 confirmed, 9 refuted, 6
unverifiable, 5 conflicts resolved). **Verdict: CPS is SHOULD-grade, not
MUST.** Safe to build on: CPS export gate `CMAKE_EXPERIMENTAL_EXPORT_PACKAGE_INFO`
from 3.31 and import gate `CMAKE_EXPERIMENTAL_FIND_CPS_PACKAGES` from 4.0, both
retired at **4.3.0 (2026-03-17)** where `install(PACKAGE_INFO)`,
`export(PACKAGE_INFO)` and `find_package` CPS search became stable; the 4.3.3
build-tree path change to `cps/<pkg>/`; `CONFIGS` suppressing CPS search;
import limited to `simple`/`custom` version schemas while export writes
`rpm`/`dpkg`/`pep440` unvalidated; configuration-dependent generator
expressions only; export namespace must equal package name (permanent,
Kitware-confirmed, so `Vendor::Product` namespaces are a forward-compat
liability in non-CPS code); `CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO` is
distributor-only and still gated (`CMAKE_EXPERIMENTAL_MAPPED_PACKAGE_INFO`,
present since 4.3, not 4.4); Conan produces CPS two ways (`CMakeConfigDeps`
round trip 2.25.0, `-g CPSDeps` undocumented but present at 2.32.0), still
experimental. Clean zeros in vcpkg, Meson, pkgconf, build2, xmake, Bazel
(rules_foreign_cc, BCR). WG21 P2656 (Ecosystem IS) was **withdrawn** in
P2656R4 (2024-12-15). cps-config dormant since 2025-04-28. Refuted by the
verifier and not to be repeated: `export(PACKAGE_INFO)` in 3.31 (it is 4.1 as
`export(EXPORT … PACKAGE_INFO)`, respelled 4.3); a "new 4.4 gate"; "CMake
rejects rpm/dpkg"; a live ISO effort; code-search adoption counts. The one
rule with a live consumer, in Kitware's words: generate CPS *in addition to*
CMake-script package descriptions, guarded on 4.3.

### Era re-check after the three-week pause (2026-09-26)

Source: `cmake-topic-map/era-recheck-2026-09-26.md` (sonnet, release APIs
fetched). Current: CMake 4.4.3 (2026-08-25; local mirror serves 4.4.2, no 4.5,
presets schema still 12, the experimental gates and UUIDs unchanged), Conan
2.32.0, vcpkg 2026.07.29 / vcpkg-tool 2026-07-27, CPM.cmake **v0.43.2**
(2026-09-24), gersemi **0.29.1** (2026-09-14), cpp-pm/hunter **v0.26.12**
(2026-09-22), Bazel 9.2.0 stable with 9.3.0rc3, and **rules_foreign_cc 0.16.0**
(2026-09-15), its first tag since 0.15.1: the bundled-CMake model moved to BCR
"spoke" registration (`cmake_source_spokes`) with no fixed default version, so
correction 8's "bundles 3.19.8 to 4.0.7, default 3.31.12" is stale and the
seam dive must re-read 0.16.0. Every other wave-1 era claim holds.

### Map corrections (2026-09-26)

Source: `cmake-topic-map.md` (opus, 164 deduplicated rows), which measured
several claims on the host before deciding. Owner defaults apply (the owner
set the program to continue autonomously): floor 3.25 with per-rule gates,
no find_ocx issue filed, cpp-packaging ships without a fleet consumer, both
skills, a proposed one-line pointer patch for bazel-quality, gersemi SHOULD,
bundle `cmake-essentials`, distro recipes out of scope.

1. Correction 9's headline find_ocx defect (__ocx_set_result without FORCE) is refuted: CACHE INTERNAL implies FORCE on 3.31.12 and 4.4.2 [host H4]
2. Correction 9's '0 of 5 file(DOWNLOAD) set TLS_VERIFY' needs its version: TLS verification defaults on since 3.31, exposure is the 3.19-3.30 range or CMAKE_TLS_VERIFY=0 [host H5]
3. CMake 4.4 ships seven diagnostic categories, not nine; CMD_STRICT and CMD_NON_TARGET_DIRECTIVE are 4.5/master only [host H2]
4. 4.4 is released (4.4.0 2026-07-09, 4.4.3 2026-08-25) and 4.4.2 runs on the host; lint's 'not yet tagged' is wrong [cps-v row 1, host H1]
5. The 'cmake-lint check name' verification kind is struck: no maintained semantic CMake linter to cite; gersemi formats only [lint §1-2]
6. Working rule name cmake-quality becomes cmake-build; hypothesis 1 (one rule set) becomes two rules by the glob test
7. The 'neutral seam' framing for dependency providers is retired from shipped wording: user-owned single slot [canon Summary, deps §7]
8. Correction 6's 'eight repos' duplicating a package is seven named, three first-class (arrow, protobuf, ccache) [deps headline 2, §1]
9. Correction 8's 'four with no sync' rests on an audit naming five vs four and never reading the CI files [deps headline 5 vs §8]; commissioned
10. find_ocx's 3.19 floor (and Findocx.cmake's 3.15) is never tested below 3.31 [ocx §3, §10]
11. The 'measure files only, never run a build' constraint is obsolete: 3.31.12, 4.3.4, 4.4.2 and ninja 1.13.2 run on the host; measurement is now the top evidence tier [host H1]
12. Exemplar corpus moved to /home/mherwig/.cache/research-lang/exemplars/cmake, re-fetched 2026-09-26; 33 of 46 SHAs changed, frame SHA table is historical [host H8]
13. Open glob list decided: conan.lock and CMakeUserPresets.json IN; Conan profiles have no fixed name and cannot be globbed; *.cmake.in, CMakeLists.txt.in, *.pc.in IN on corpus counts; CPM.cmake and HunterGate.cmake need no entry [host H7]
14. Hypothesis 2's 'package managers that matter' drops Hunter to one row and raises FetchContent and CPM to equal standing with Conan and vcpkg [deps §2-3, §6]
15. recent-shifts' use of JetBrains' C-only survey as C++ evidence is invalid; ISO C++ 2024 numbers are the citable ones [prac §16-18]

### Wave 2 harvest corrections (2026-09-26)

Source: `cmake-topic-map.md` › "Wave 2 landed"; six consolidations, 127 IDs,
77 MUST, 70 verifier corrections. Later wins over every block above.

1. CPS mini-wave: 'import limited to simple/custom schemas' is wrong. custom, rpm, dpkg and pep440 all accept only the exact version string; only simple compares by order (CMK-INST-16, measured on 4.3.4 and 4.4.2).
2. CPS mini-wave and map conflict 5: a valid X.cps beside XConfig.cmake is what find_package loads on 4.3+. A rejected .cps falls through silently (CMK-DEP-11, CMK-INST-14).
3. Era re-check: 'rules_foreign_cc 0.16.0 has no fixed default CMake' is wrong. Tag commit 931cb33cf8 defaults to 3.31.12 with a 3.19.8-4.0.7 table (CMK-BZL-08).
4. Era re-check: vcpkg-tool 2026-09-26 is current, not 2026-07-27. 4 of 6 experimental-gate UUIDs rotated between 4.3.4 and 4.4.2, so 'unchanged' is wrong (CMK-VER-09, M5).
5. Correction 1: vcpkg-artifacts removal was announced, not executed; it is still in vcpkg-tool at 2026-09-26 (CMK-VCPKG-10). x-gha now warns and exits 0, so the cache is lost silently (CMK-VCPKG-08).
6. Correction 1 and map conflict 22: Conan workspaces are qualified. incubating.rst still says 'generally available as experimental', and 2.29-2.31 changed the conanws.py contract.
7. Correction 7: 35 percent bare target_link_libraries becomes 13.3 percent in library core code and 32.0 percent in scaffolding (CMK-TGT-01).
8. Correction 8 and map conflict 20: 2 dual repos have no sync (zlib, nlohmann/json), not 4. Generation runs in both directions (CMK-BZL-09, -11). The audit's '7 install jobs, none traced' is 3 of 5 traced (CMK-INST-18).
9. Map M-K-01 brief: rules_foreign_cc toolchain synthesis and _INIT seeding live in foreign_cc/private/cmake_script.bzl. framework.bzl keeps only block-network (:589-591).
10. Correction 2 and map conflict 18: CMAKE_POLICY_VERSION_MINIMUM is 4.0+ and unknown to 3.31.12. A value of 3.5 clears only the hard error, and 3.5-3.9 is still a gate error on 3.31 and 4.4, so the value that clears both is 3.10 (versions-and-gate M8, M9).
11. Map conflict 17 and M-G-11: CMAKE_POLICY_DEFAULT_CMP0077=NEW is the fix only as a set/restore around one add; the global form masks every later dependency (CMK-DEP-15, C3).
12. Correction 4: project code can also set or append CMAKE_PROJECT_TOP_LEVEL_INCLUDES before project(). Doing so hides or displaces the user's provider (C1, C2), and CMK-TC-04 forbids it.
13. Map conflict 8 and M-G-12: CPM leaves the includer's policies untouched, but CMAKE_POLICY_DEFAULT_CMP0077/0126/0135/0150 leak into every later subproject (C6, CMK-DEP-05).
14. Map 'Explicitly not a defect', 'Conan-1 imports in CCI 0/40', is refuted by a whole-tree count: 40 'from conans', 35 build_requires and 24 names-only recipes in 2,002 folders.
15. Map conflict 9 and M-G-13: Hunter's CMake-4 fixes shipped per package across v0.26.7, .9 and .10. The pin floor is v0.26.10, not '#858 the floor fix'.
16. The find_ocx audit (section 9) and find_ocx's docs claim '<X>_ROOT feeds a following find_program/find_library'. Measurement C5 refutes this (CMK-DEP-14).
17. Frame body: the harness gate does nothing under cmake -P on 3.31.12 and 4.3.4, so find_ocx's four -P families run ungated there (C5, CMK-TEST-02).

### Wave 3 convergence corrections (2026-09-26)

Source: `cmake-topic-map.md` › "Wave 3 landed". Verdict **ready-to-draft**: 205
IDs, 112 MUST, 14 families across ten consolidations. Later wins.

1. W3-1 Map M-H-05: find-root modes default to BOTH, and CMAKE_FIND_ROOT_PATH_MODE_PROGRAM unset also behaves as BOTH, not NEVER (CMK-TC-08/09).
2. W3-2 CMP0054 set to OLD is a hard error from 4.0, not 4.3.
3. W3-3 cmake_parse_arguments(PARSE_ARGV) arrived in 3.7, not 3.5 (MOD-16, LANG-04).
4. W3-4 ctest --no-tests=error and CMAKE_CTEST_ARGUMENTS are 3.17, not 3.26. CTEST_TEST_TIMEOUT in the environment is inert (TEST-06/07).
5. W3-5 'Config beats CPS' is refuted: a valid .cps wins on 4.3+ (INST-16, DEP-12).
6. W3-6 CMAKE_WARN_DEPRECATED=OFF survives -Werror=dev on 3.31.12 (skills F6). This refutes VER-06's [M9] clause.
7. W3-7 gtest_discover_tests DISCOVERY_MODE is 3.18.
8. W3-8 The 2025 ISO C++ survey has no percentage table, so the 2024 Q9/Q10 line stays the citable one. Conan 2.27.0 added CVE info to conan audit.
9. W3-9 Conan `implements` arrived in 2.0.9. The CCI Conan-1 remote froze on 2024-11-04.
10. W3-10 rapidjson's export(PACKAGE) writes to the user package registry (floor 3.5).
11. W3-11 An empty CMAKE_MAP_IMPORTED_CONFIG_<CFG> also rejects installed configurations.
12. W3-12 libuv has 7 of 7 bare target_link_libraries calls, not 9 of 9.
13. W3-13 The CMake tutorial was restructured at 4.4. Cite command and manual pages, not tutorial steps.
14. W3-14 try_compile re-reads the toolchain for both signatures (TC-06).
15. W3-15 TGT-18: clang without clang-scan-deps breaks a C++20 build with scanning on.
16. W3-16 18 corpus repos run ctest from a workflow; 1 passes --timeout and 4 pass --no-tests=error.
17. W3-17 CMAKE_POLICY_VERSION_MINIMUM: 100% of corpus writes use 3.5 and only Qt uses 3.10. DEP-15 keeps 3.10 for gated consumers; 3.5 suffices only in vcpkg port builds.
18. W3-18 (measured this phase) PARSE_ARGV keeps a caller's quoted list as one escaped element, and an unquoted forward passes it as one argument. 'PARSE_ARGV is strictly safer' is a behaviour change for callers that relied on splitting.

### Phase 8 validation corrections (2026-09-26)

Source: `cmake-topic-map/scratch/review-receipt.json` (4 opus reviewers, 88
verifications exercised on planted fixtures). All applied to the shipped
artifacts. The ones that change a reading of the corpus:

1. `gersemi --check .` descends into an in-tree build directory and fails on generated files (0.29.1, 4.4.2). The only gate form is tracked files through `git ls-files -z ... | xargs -0 -r gersemi --check` (CMK-CORE-04).
2. `-Werror=dev` still fails the configure on 4.4.2 exactly as `-Werror=author` does. The real trap is the reverse: `-Werror=author` on 3.31 or 4.3 is accepted and does nothing.
3. A guarded `set(CMAKE_MSVC_RUNTIME_LIBRARY)` after `project()` is legal under CMK-TGT-16, but on a static-CRT vcpkg leg nothing defines the variable first, so CMK-VCPKG-06 narrows the placement to a preset or before the first `project()`.
4. A consumed library's test tree is gated on a project-prefixed option that defaults to `PROJECT_IS_TOP_LEVEL`, never on `PROJECT_IS_TOP_LEVEL` directly (CMK-TEST-09).
