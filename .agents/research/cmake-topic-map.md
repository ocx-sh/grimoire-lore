---
title: "CMake and C++ package management topic map — wave 1 consolidated and adjudicated, wave 2 commissioned, wave 3 staged"
phase: 3
model: opus
date: 2026-09-26
wave: "1 consolidated → 2 commissioned, 3 staged"
sources_surveyed: 12
candidates_deduplicated: 164
---

# CMake and C++ package management topic map (phase 3)

## How to read this

1. **Every row is a question**, not a subject. "Dependency management" is a
   wave; "when does a `FetchContent`-declared dependency shadow the copy
   `find_package` would have found, and which of the three sanctioned idioms
   resolves it" is a row. A row a later rule cannot answer with a named
   verification was rewritten or dropped.

2. **Coverage is measured against three things, never against a C++ fleet
   codebase — there is none.** (a) The sibling lore sets: `rust-cargo`,
   `python-packaging`, `typescript-packaging`, `docs-quality`, `gradle-build`,
   `maven-build`, `java-quality`, `kotlin-quality`, `bazel-quality` glob no
   CMake, Conan or vcpkg file, and `CMK-` has zero hits in `rules/`
   ([fleet] §4, re-checked for this map). (b) The Bazel set's `BZL-CC` rows in
   [bzl-cc], which own rules_foreign_cc, `layering_check`, sanitizers and
   `compile_commands.json` **from the Bazel side**; a row this program shares
   with them is `partial` and cites the BZL-CC row. (c) The frame's inventory
   ([frame]): one CMake codebase (`find_ocx`), zero C++ builds, zero Conan,
   vcpkg, CPM or Hunter manifests ([fleet] headline). So `uncovered` is the
   honest default; `partial` means a sibling owns the shape or the other side
   of a seam; `covered` would mean a sibling already owns the content, and no
   row qualifies.

3. **Priority is against this program's two audiences, in this order.**
   Audience 1: **authors of CMake modules and CMake-heavy projects**, whose one
   fleet instance is `find_ocx` — a 1,506-line module that downloads, verifies,
   executes a pinned CLI and hands results to `find_package` ([ocx]).
   Audience 2: **C++ projects consuming libraries and tools** through Conan,
   vcpkg, CPM, FetchContent or system packages, who also want to be consumable
   and wrappable by others, Bazel's `rules_foreign_cc` included. P0 = a rule
   both audiences need and an agent demonstrably gets wrong; P1 = ship it;
   P2 = ship if the depth file has room; P3 = comparison row or defer.
   **Every P0 names its check** — a command, a CMake diagnostic, a gersemi
   check, a conan or vcpkg subcommand, a grep, or a named reading heuristic.

4. **Evidence ranking used in every resolution** (as commissioned):
   **measured** (a real binary or a counted corpus, command inline) >
   **normative** (the tool's own manual or release notes at a tag) >
   **codified** (a shipped tool default or rule catalogue) > **argued** (a named
   practitioner with a reason) > **asserted**. A measurement this map
   commissions counts as *pending measurement* and names the dive that settles
   it.

5. **Dating.** Every version fact is as of **2026-09-26** unless the row says
   otherwise. Host binaries were measured today (see [Host checks](#host-checks-run-for-this-map));
   scout and audit facts are dated 2026-09-05. A sibling worker is re-checking
   the era and will write `cmake-topic-map/era-recheck-2026-09-26.md`; where it
   contradicts a version cell here, it wins, and wave-2 briefs tell workers to
   read it first if it exists.

6. **SURFACE legend** — `cmake-language` (scope, cache, policies, floors,
   quoting, lists) · `targets` (usage requirements, flags, standards, linkage) ·
   `install-export` (install rules, Config packages, relocation, pkg-config) ·
   `find-package` · `fetchcontent` (FetchContent, ExternalProject, vendoring) ·
   `providers` (everything injected before the first `project()`: toolchain
   files, `CMAKE_PROJECT_TOP_LEVEL_INCLUDES`, dependency providers,
   cross-compiling) · `cps` · `presets` · `ctest` · `conan` · `vcpkg` · `cpm` ·
   `hunter` · `bazel-seam` · `module-authoring` · `tooling` (the configure gate,
   formatter, CI invocation) · `any`.

7. **Exemplar-shape legend** (named from [shape] and [deps], corpus of 46):
   **HO** header-only library (nlohmann/json, rapidjson, stb) ·
   **CL** compiled library shipping a Config package (fmt, spdlog, zlib, curl,
   libuv, yaml-cpp, gflags, glfw) ·
   **DB** dual CMake-and-Bazel project (the 11: abseil, Catch2, gflags,
   benchmark, googletest, re2, grpc, yaml-cpp, zlib, nlohmann/json, protobuf) ·
   **PM** package-manager registry, recipe or tool (vcpkg, vcpkg-tool, conan,
   conan-center-index, cmake-conan, CPM.cmake, CPMLicenses, hunter,
   rules_foreign_cc) ·
   **FW** CMake-heavy framework (LLVM, Qt, KDE ECM, Boost, Kitware/CMake) ·
   **LM** large mixed build (ClickHouse, duckdb, arrow, grpc) ·
   **TS** template/starter (cmake-init, cmake_template, project_options,
   ModernCppStarter, modern-cpp-template) ·
   **MOD** CMake module like find_ocx (find_ocx; also CPM.cmake,
   `conan_provider.cmake`, project_options as module libraries) ·
   **TOOL** build tool that builds itself (CMake, ninja, ccache, sccache) ·
   `all`.

8. **Source keys** (12 of 12 wave-1 files, plus the frame, the Bazel sibling
   and this map's own host checks). In every table cell a bare key is a link:
   [frame] · [ocx] · [fleet] · [shape] · [deps] · [canon] · [lint] · [pm] ·
   [prac] · [shift] · [cps-s] · [cps-e] · [cps-v] · [bzl-cc] · [host].

   | Key | File | What it is |
   |---|---|---|
   | [frame] | `cmake-frame.md` | The phase-0 frame, including its Corrections blocks |
   | [ocx] | `cmake-audit/find-ocx-cmake-shape-and-contracts.md` | find_ocx shape, contracts, runtime posture |
   | [fleet] | `cmake-audit/fleet-inventory-and-bazel-overlap.md` | Fleet footprint, sibling globs, Bazel coverage ledger |
   | [shape] | `cmake-audit/exemplar-cmake-shape.md` | Corpus CMake-language and buildsystem counts |
   | [deps] | `cmake-audit/exemplar-deps-and-dual-build.md` | Corpus dependency acquisition, dual builds, CI |
   | [canon] | `cmake-topic-map/canonical-cmake.md` | CMake manuals, policy catalogue, books |
   | [lint] | `cmake-topic-map/codified-lint-and-policies.md` | cmake-lint, gersemi, diagnostics, org guides, distros, rules_foreign_cc |
   | [pm] | `cmake-topic-map/package-managers-canonical.md` | Conan 2, vcpkg, Hunter, CPM, providers, comparison set |
   | [prac] | `cmake-topic-map/practitioner-and-failure.md` | Practitioners, surveys, SO/HN/issue-tracker failure corpus |
   | [shift] | `cmake-topic-map/recent-shifts.md` | CMake 3.24–4.4, Conan 2.x, vcpkg 2024–2026 shifts |
   | [cps-s] | `cmake-dependency-seam/cps-spec-and-cmake-implementation.md` | CPS dive: spec and CMake's implementation |
   | [cps-e] | `cmake-dependency-seam/cps-ecosystem-adoption-and-interop.md` | CPS dive: adoption and interop |
   | [cps-v] | `cmake-dependency-seam/cps-verification.md` | Opus verifier; its Ledger and Verdict override both CPS dives |
   | [bzl-cc] | `../../rules/bazel-quality/cpp.md` | The shipped Bazel C++ depth file (BZL-CC) |
   | [host] | [below](#host-checks-run-for-this-map) | Read-only checks this map ran on 2026-09-26 |

[frame]: cmake-frame.md
[ocx]: cmake-audit/find-ocx-cmake-shape-and-contracts.md
[fleet]: cmake-audit/fleet-inventory-and-bazel-overlap.md
[shape]: cmake-audit/exemplar-cmake-shape.md
[deps]: cmake-audit/exemplar-deps-and-dual-build.md
[canon]: cmake-topic-map/canonical-cmake.md
[lint]: cmake-topic-map/codified-lint-and-policies.md
[pm]: cmake-topic-map/package-managers-canonical.md
[prac]: cmake-topic-map/practitioner-and-failure.md
[shift]: cmake-topic-map/recent-shifts.md
[cps-s]: cmake-dependency-seam/cps-spec-and-cmake-implementation.md
[cps-e]: cmake-dependency-seam/cps-ecosystem-adoption-and-interop.md
[cps-v]: cmake-dependency-seam/cps-verification.md
[bzl-cc]: ../../rules/bazel-quality/cpp.md
[host]: #host-checks-run-for-this-map

### Host checks run for this map

Read-only, 2026-09-26. They are the only evidence this map adds; everything
else is adjudication of the 12 wave-1 files.

| # | Command | Result |
|---|---|---|
| H1 | `ocx package exec kitware/cmake:{3.31,4.3,4.4} -- cmake --version`; `ocx package exec ninja-build/ninja -- ninja --version` | **3.31.12, 4.3.4, 4.4.2**; ninja **1.13.2**. (Newest 4.4 tag upstream is 4.4.3, 2026-08-25 — [cps-v] row 1; the OCX mirror lags one patch.) |
| H2 | `cmake --help-manual cmake-diagnostics` on 4.4.2, grep category headings | **7 categories**: `CMD_AUTHOR`, `CMD_DEPRECATED`, `CMD_EXPERIMENTAL`, `CMD_INSTALL_ABSOLUTE_DESTINATION`, `CMD_POLICY`, `CMD_UNINITIALIZED`, `CMD_UNUSED_CLI`, each `versionadded:: 4.4`. `CMD_STRICT` and `CMD_NON_TARGET_DIRECTIVE` are **absent** — they exist only on `master` (4.5). |
| H3 | `cmake --help-manual cmake-presets` on 4.4.2 | Highest schema listed is **12**. |
| H4 | `cmake --help-command set` on 3.31.12 and 4.4.2 | Both: `INTERNAL` "… Use of this type implies ``FORCE``." |
| H5 | `cmake --help-variable CMAKE_TLS_VERIFY` on 3.31.12 and 4.4.2 | "If neither is set, the default is *on*. .. versionchanged:: 3.31 The default is on. Previously, the default was off." The env var `CMAKE_TLS_VERIFY=0` restores off. Applies to FetchContent and ExternalProject downloads too. |
| H6 | `sed -n '609,611p;175-180p;1383p' /home/mherwig/dev/find_ocx/ocx.cmake` | `__ocx_set_result` writes `set(${var} "${ARGN}" CACHE INTERNAL …)`; `cmake_policy(PUSH)`/`VERSION 3.19` at :179-180, `POP` at :1383; `rg -c TLS_VERIFY ocx.cmake` → 0. Working tree still dirty (10 modified files, two untracked handovers). |
| H7 | `find <corpus> -path '*/.git' -prune -o -type f -name <pat> -print` for each glob candidate | `*.cmake.in` 542 files/26 repos · `*.pc.in` 79/22 · `CMakeLists.txt.in` 60/6 · `CMakePresets.json` 19/7 · `CMakeUserPresets.json` 1/1 · `.cmake-format*` 8/7 · `.gersemirc*` 0 · `conanfile.py` 4,086/5 · `conanfile.txt` 11/2 · `conandata.yml` 1,997/1 · `conan.lock` 0 · `conanws.*` 0 · `vcpkg.json` 3,248/5 · `vcpkg-configuration.json` 8/1 · `portfile.cmake` 3,230/2 · `usage` 546/2 · `*.cps` 94/1 (Kitware tests). |
| H8 | `git -C <repo> rev-parse --short=10 HEAD` over `/home/mherwig/.cache/research-lang/exemplars/cmake` | The corpus was re-fetched on 2026-09-26; new SHAs below. **Dives cite these**, not the frame table's. |

Corpus SHAs as of 2026-09-26 (the frame table's 2026-09-05 SHA in brackets
where it moved):

| repo | sha | repo | sha |
|---|---|---|---|
| abseil__abseil-cpp | `61d073d671` [38f8c1535d] | google__benchmark | `ac13143d96` [04b5f41ec7] |
| aminya__project_options | `412045e1f1` [d386a62c58] | google__googletest | `4267679b68` [283c17563f] |
| apache__arrow | `3ad410b7b1` [e0cf4184dd] | google__re2 | `972a15cedd` |
| bazel-contrib__rules_foreign_cc | `bb2f3e5d72` [f68b351c46] | grpc__grpc | `0f8d72ed71` [6e5ac36afe] |
| boostorg__boost | `a61cfa03ba` [cb94f33fcb] | jbeder__yaml-cpp | `1e0876c671` [e5fe9f2cdd] |
| catchorg__Catch2 | `222e233903` [897d8043eb] | KDE__extra-cmake-modules | `b4c4ec9997` |
| ccache__ccache | `b471bbde29` [e256302fa6] | Kitware__CMake | `e8befb989b` [1ef330f5ee] |
| ClickHouse__ClickHouse | `0995a518a8` [5cbca3e099] | libuv__libuv | `abe835d413` [c2a11ca202] |
| conan-io__cmake-conan | `b1593849dd` | llvm__llvm-project | `e0316c1b47` [5115f32500] |
| conan-io__conan-center-index | `07389b8fa0` [db3706004e] | madler__zlib | `767c4c9478` [e3dc0a85b7] |
| conan-io__conan | `39898afdfb` [e42971dc29] | microsoft__vcpkg | `c4ee5a52d7` [04a9d8e521] |
| cpm-cmake__CPM.cmake | `01678cfe17` [456cb6754d] | microsoft__vcpkg-tool | `51bf87ca6e` [f9eb9c63d0] |
| cpm-cmake__CPMLicenses.cmake | `ca42334d56` | mozilla__sccache | `8396f0209d` [05aafc82b9] |
| cpp-best-practices__cmake_template | `b86318abbf` | ninja-build__ninja | `4e4df1e567` [de0898246f] |
| cpp-pm__hunter | `997fab148b` [708cab1c49] | nlohmann__json | `f422b753cc` [09b6b6b5ba] |
| curl__curl | `98519dac83` [68ed69a5ab] | nothings__stb | `2c980bb598` |
| duckdb__duckdb | `d8a1bd4f4f` [e3946f2327] | ocornut__imgui | `aa0181478b` [96b6eb7728] |
| filipdutescu__modern-cpp-template | `0fab2c3552` | ocx-sh__find_ocx | `ac2a759cd0` |
| fmtlib__fmt | `522e2c12ab` [d90c33606c] | openssl__openssl | `e13af7e602` [1935d215b5] |
| friendlyanon__cmake-init | `7e0c52fc73` | protocolbuffers__protobuf | `c64743979d` [e816e3cbab] |
| gabime__spdlog | `5b63780337` [57cb5fb7a8] | qt__qtbase | `0ef5a8e9ca` [d95af8296a] |
| gflags__gflags | `bdda022e7c` | Tencent__rapidjson | `24b5e7a8b2` |
| glfw__glfw | `92dcf4ce74` | TheLartians__ModernCppStarter | `72b8957f9e` |

## Conflicts resolved

Twenty-four places where two wave-1 artifacts disagree, or where an artifact
disagrees with the frame or with the requester's hypotheses. Each names what
decided it.

**1. The CMake floor the rule set assumes: 3.25, with per-rule gates; tested
on 3.31.12 and 4.4.2.** Candidates were 3.19 (find_ocx's floor, [ocx] §3),
3.24 (providers, `FIND_PACKAGE_ARGS`, `OVERRIDE_FIND_PACKAGE`,
`CMAKE_COMPILE_WARNING_AS_ERROR`, `--fresh` — [shift] §1), 3.25 (`block()`,
`return(PROPAGATE)`, FetchContent `SYSTEM`, presets schema 6 — [shift] §1),
3.28 (named modules, [shift] §1) and 4.3 (CPS ungated, [cps-v] row 10).
Measured practice: 33 exemplar floors run 3.5–3.29 with most between 3.14 and
3.22 ([shape] §1); rules_foreign_cc bundles 3.19.8–4.0.7, default 3.31.12
([deps] headline 13). Argued: pick a floor you actually test, 3.20+ preferred
([prac] §9, Reinking). **Decided (argued plus measured, one check pending):**
rules are *written* for `cmake_minimum_required(VERSION 3.25...<max>)` because
3.25 is the lowest release that carries the whole modern dependency and
scoping toolkit; every rule whose mechanism is newer carries its gate in the
Rule cell as a trailing `(CMake ≥ X.Y)`, and its verification says how it reads
below the gate. A project below the assumed floor — find_ocx at 3.19 — is
legal: rows it trips name the fallback (the `PROJECT_IS_TOP_LEVEL` shim, no
providers, no `FIND_PACKAGE_ARGS`, no `block()`), never "raise your floor".
Verification commands run on **3.31.12** (the last 3.x, rules_foreign_cc's
default) and **4.4.2**; a row whose behaviour differs states both. *Pending*:
the distro table in dive `versions-and-gate/floors-policies-and-era` may move
the assumed floor to 3.24 or 3.28; Owner question 1 carries the default.

**2. The verification convention: one named "configure gate", spelled per
line; `-Werror=dev` is the ≤4.3 spelling, not the convention.** The frame's
body makes `cmake -Werror=dev` the universal check ([frame]); its correction 1
says 4.4 deprecated it. [canon] says 4.4 has **nine** diagnostic categories;
[lint] says 4.4 was **unreleased** on 2026-09-05 and two categories are
4.5-only; [shift] lists 4.4.0 as released 2026-07-09 but never mentions the
diagnostics rewrite. **Decided (measured):** 4.4 is released (4.4.0 2026-07-09,
4.4.3 2026-08-25, [cps-v] row 1) and runs on this host as 4.4.2 ([host] H1),
and 4.4.2 ships exactly **seven** categories ([host] H2) — [canon] is wrong on
the count, [lint] on the release status. The cmake-build index defines the
gate once, as two lines (3.x/≤4.3 and 4.4+), and every row cites "the configure
gate" rather than re-spelling it. Whether 4.4.2 still honours `-Werror=dev` as
a synonym, and whether using it raises its own deprecation diagnostic, is
*pending measurement* in `versions-and-gate/gate-and-language-semantics`.

**3. Which CMake is current.** Frame body: 4.4.1 (2026-07-29 mirror survey);
[canon]: 4.4.1; [shift] and [cps-v]: 4.4.3 (2026-08-25); [lint]: "4.4
unreleased"; host mirror: 4.4.2. **Decided (normative tag data plus
measurement):** newest upstream is 4.4.3; rows are measured against 4.4.2 and
say so; anything tagged `versionadded:: 4.5` on `master` (presets schema 13,
`CMD_STRICT`, `CMD_NON_TARGET_DIRECTIVE`, `cmake_language(PRINT_TARGETS)`) is
not current and never cited as such (row M-B-10).

**4. Formatter and linter of record: gersemi formats; nothing lints; CMake's
own diagnostics plus named greps do the lint job.** The frame's constraints
list "a `cmake-lint` or gersemi check name" as a verification kind ([frame]).
[lint] §1 and [shift] §14: cmake-format/cmake-lint's last release is 0.6.13 on
2020-08-19, its naming defaults were derived from CMake 3.10 listfiles, its
deprecated-command list is frozen; gersemi 0.28.1 shipped 2026-08-19 on a
2–4-week cadence. Adoption: `.gersemirc` 0/46, cmake-format configs 7/46,
`.clang-format` 23/46 ([shape] §11; [host] H7 re-counts `.gersemirc*` 0 and
`.cmake-format*` 8 files in 7 repos). **Decided (codified plus measured):**
gersemi is the formatter of record (`gersemi --check`, SHOULD, not MUST, given
0/46 adoption); no shipped verification cites cmake-lint; a `.cmake-format*`
config is recognise-and-migrate. Whether *any* maintained semantic CMake linter
exists is closed in `versions-and-gate/floors-policies-and-era`; until then the
lint role is the configure gate (item 2) plus greps.

**5. CPS: ship in addition, SHOULD-grade, guarded on 4.3 — not "wait" and not
MUST.** The two CPS dives disagree on five facts and the verifier settles all
of them ([cps-v] "Conflicts between the dives"): `export(PACKAGE_INFO)` did
not exist in 3.31 (it is 4.1 as `export(EXPORT … PACKAGE_INFO)`, respelled
4.3); `CMAKE_EXPERIMENTAL_MAPPED_PACKAGE_INFO` arrived in 4.3.0, not 4.4.0;
CMake *writes* `rpm`/`dpkg`/`pep440` version schemas unvalidated but compares
only `simple`/`custom`; WG21 P2656 was withdrawn (R4, 2024-12-15); Conan
issue #19589 is closed and the live thread is `cps-org/cps#111`. [shape] §8
measured 0 real `install(PACKAGE_INFO)` adopters in 46 repos (54 hits, all in
Kitware's own tree); [cps-e] found two real adopters outside the corpus, both
gated. **Decided (normative, verifier's verdict):** add
`install(PACKAGE_INFO)` beside an existing `install(EXPORT)`, guarded by
`CMAKE_VERSION VERSION_GREATER_EQUAL 4.3`, never instead, never behind a
retired gate — Kitware's own words ("generate CPS **in addition to**
CMake-script package descriptions", [cps-v] "Corrections…"). The one CPS fact
that changes advice for non-CPS code — export namespace must equal the package
name, permanently — becomes its own row (M-F-10). The round trip on 4.3.4 and
4.4.2 is *pending measurement* in `consumable-library/install-round-trip-and-cps`.

**6. Dependency providers are a user-owned single slot with one real
implementation, not "the neutral seam every manager plugs into".** [pm]
Summary calls `SET_DEPENDENCY_PROVIDER` "the neutral seam every provider
(Conan, vcpkg) plugs into"; [prac] Summary says the ecosystem "is converging
on" it; the frame body suspected the same. [deps] §7 measured 1 real adopter
in 46 (`conan-io__cmake-conan`), 3 more in CMake's own tests, and **none in
vcpkg**; CPM's own tracker still asks to become one (#415, [prac] §24); frame
correction 4 already records this. **Decided (measured over asserted):**
rules treat a provider as a slot that belongs to the *user* (Kitware: "the
choice of dependency provider should always be under the user's control",
[canon] Summary): a project must never register one from its own
CMakeLists, must keep its `find_package` calls interceptable, and no rule text
calls providers the ecosystem's seam (M-H-03, M-H-08). The two-provider
behaviour is *pending measurement* in `dependency-seam/resolution-order-and-providers`.

**7. FetchContent versus a package manager as the default for a library: a
library never forces acquisition.** [prac] Contested reads CMake 3.24+ as
dissolving the either/or; [pm] and [prac] cite CPM's candour (source builds
only, diamond "first version wins"); [shift] uses JetBrains' 2025 survey (51 %
use no dependency manager) as evidence for FetchContent as the de facto
manager, while [prac] §16 warns that survey is **C-only** (~900 respondents)
and must never be quoted as C++. [deps] §2 measured FetchContent in 14 real
repos (56 declares), "a documented option most projects don't reach for".
**Decided (normative plus measured):** CMake's Using Dependencies guide draws
the line — `FIND_PACKAGE_ARGS` is "project control", providers are "user
override" ([canon] Summary). An installable library calls `find_package` and
lets the consumer's prefix path, toolchain or provider decide; FetchContent is
for the top-level build, for a library's own test dependencies, or with
`FIND_PACKAGE_ARGS` so a found copy wins (M-G-06). The JetBrains C numbers are
not cited for C++; the ISO C++ 2024 numbers (Conan 19.34 %, vcpkg 19.10 %,
CMake 83 %, [prac] §18) are the citable ones (M-L-08).

**8. CPM gets rows inside `dependencies.md`, not a file.** 4/46 vendor
`CPM.cmake`, two of them CPM's own family ([deps] §3); CPM is "a thin wrapper
around FetchContent" ([pm] §19). What an agent gets wrong is specific and
checkable: CPM's own docs say pin commit hashes ([pm] §19, [shift] 0.43.x), and
CPM silently sets CMP0077, CMP0126, CMP0135 and CMP0150 to NEW on load ([prac]
§13). **Decided (codified):** one CPM row (M-G-12) plus CPM clauses in the
pinning and offline rows.

**9. Hunter gets one recognition row, P3.** The frame asked whether Hunter is
maintained; [pm] §18, [prac] §24 and [shift] §13 all show `cpp-pm/hunter` alive
(v0.26.11, 2026-08-27; a June-2026 commit fixing its Protobuf recipe for the
CMake-4 floor); [deps] §6 measured **0 adopters among the other 45 exemplars**
(one docs example in nlohmann/json) and found `HunterGate.cmake` moved into a
`cpp-pm/gate` submodule. JetBrains' C survey puts it at 2 %. **Decided
(measured):** "maintained but not chosen"; a Hunter depth file would bind
nobody. Row M-G-13 recognises a HunterGate call and checks its pin postdates
the CMake-4 fix. This reshapes requester hypothesis 2 ("Conan 2, vcpkg and
Hunter/cpp-pm are the package managers that matter"): Conan and vcpkg yes,
Hunter no, and FetchContent/CPM matter as much as either.

**10. Find modules versus Config packages: uncontested — install a Config
package; write a Find module only for a non-CMake upstream, to the
`cmake-developer(7)` contract.** [prac] Contested reports no source arguing the
reverse; [canon] §2 and the Using Dependencies guide call Module mode "a
heuristic implementation". The nuances decide the rows, not the direction:
`ccache__ccache@e256302fa6:cmake/FindZstd.cmake:49` fetches on a miss, a hidden
network dependency behind a local search ([deps] smell 4); Conan's
`CMakeConfigDeps` never emits Find modules, so `find_package(... MODULE)`
consumers of Conan packages break on migration ([pm] §3); find_ocx's
`Findocx.cmake` legitimately finds a *program* ([ocx] §9). **Decided
(normative):** M-F-01 is MUST for anything installable; M-D-03 and M-D-04 are
the Find-module rows.

**11. `CMAKE_CXX_STANDARD` globally versus `target_compile_features`:
libraries declare, top levels choose.** [shape] §3: `cxx_std_NN` 1,716 uses vs
`CMAKE_CXX_STANDARD` 454, and fewer than half of the 454 setters pin
`_REQUIRED ON` (67). [canon] cites both forms as current. A Conan profile's
`compiler.cppstd` reaches CMake as `CMAKE_CXX_STANDARD` through the generated
toolchain ([pm] §2), so a library that hard-codes the variable fights the
consumer's profile. **Decided (normative plus measured):** an installable
library states its minimum as `target_compile_features(<t> PUBLIC cxx_std_NN)`
(it propagates and exports); `CMAKE_CXX_STANDARD` belongs to the top-level
project, a preset or a manager profile, paired with `_REQUIRED ON` and
`_EXTENSIONS OFF` (M-E-04). Whether a profile/project mismatch is detectable at
configure time is *pending* (M-L-05, wave 3).

**12. Presets are the local reproduction of CI, SHOULD — not the CI contract,
not MUST.** The frame suspected "presets as the CI contract". Measured: 5/46
repos have a real root `CMakePresets.json`, 3/46 invoke `cmake --preset` in CI,
0/46 use workflow presets ([shape] §10, [deps] §9); the top open presets issue
is the OS × config × compiler cross-product (#22538, 44 upvotes, [prac] §21).
**Decided (measured):** one configure preset per CI leg invoked by name is
SHOULD; workflow presets CONSIDER at most; the P0 is narrower and checkable —
the declared schema `version` must be one the floor CMake parses, and
`CMakeUserPresets.json` is never committed (M-J-01, M-J-03). Rejection
behaviour is *pending measurement* in `versions-and-gate/gate-and-language-semantics`.

**13. One rule set or two: two, by the glob test.** Requester hypothesis 1 and
the frame's working plan put everything in one rule with an optional second
"only if the map confirms a genuinely different glob". [deps] Contradictions
found the Conan/vcpkg manifest surface touches a near-disjoint set of repos
from the CMake-language surface (3 of 46 have both). The globs are genuinely
different and tool-required (conflict 14 and the Artifact set decision).
**Decided (codified bar, measured overlap):** `cmake-build` and
`cpp-packaging`. Two double-loads are accepted and bounded: `conanfile.py` also
matches `python-quality`'s `**/*.py`, and `portfile.cmake` loads both
`cmake-build` (`**/*.cmake`) and `cpp-packaging` (named on purpose), the same
kind of intentional double-load the JVM set accepted for `*.gradle.kts`.

**14. Rule names: `cmake-build` and `cpp-packaging`.** The frame's working name
is `cmake-quality`. The house names build systems `<tool>-build`
(`gradle-build`, `maven-build`) and manifest rules `<lang>-packaging`
(`python-packaging`, `typescript-packaging`); `bazel-quality` is the exception
because Bazel is a whole build platform with language rules inside it.
**Decided (codified house convention):** `cmake-build` for CMake;
`cpp-packaging` for Conan and vcpkg manifests (not `conan-vcpkg`, which names
tools and dates badly, and not "none", which conflict 13 rules out).

**15. Skills: two procedures — `cmake-dependency-triage` and
`cmake-modernize`; "make my project consumable" is a rule's verification, not a
skill.** Three candidates. *Triage* is a diagnosis procedure run occasionally
with ordered steps across `--debug-find-pkg`, the configure log, the redirects
directory, `conan graph explain` and `VCPKG_TRACE_FIND_PACKAGE`; the house
already ships `jvm-dependency-triage` and `bazel-diagnose`. *Modernize* is a
once-per-repository adoption procedure (inventory, floor, targets, keywords,
install/export, round trip, CI gate) whose steps must happen in order; the
house precedent is `bazel-adopt`, also run once per repository, and the
canonical analogue is CMake Cookbook ch. 15 "Porting a Project to CMake"
([canon] §26). *Make-consumable* fails the procedure test: its content is the
CMK-INST standard, and its only procedural part — install to a prefix, move it,
consume it — is that rule's verification, shipped as a script in
`install-and-export.md` (rule-distillation: "rules carry standards, skills
carry procedures"). **Decided (codified bar).** The modernize skill's end state
is "target-based and consumable", absorbing the third candidate's intent.

**16. find_ocx's defects: anonymised worked examples, never the pattern — and
its headline defect is withdrawn.** [ocx] smell 1 and frame correction 9 name
`__ocx_set_result` (`ocx.cmake:609-611`) writing `CACHE INTERNAL` without
`FORCE` as the highest-value defect; the audit's own Gaps admit it was "a
logic deduction … not an executed repro". The `set()` manual on both tested
binaries says `INTERNAL` "implies `FORCE`" ([host] H4). **Decided
(normative):** the memo defect is refuted; behavioural confirmation (three
reconfigures of the verbatim helper under `cmake_policy(VERSION 3.19)`) is
*pending measurement* in `versions-and-gate/gate-and-language-semantics`. The
TLS finding is re-scoped by version: `file(DOWNLOAD)` verifies TLS by default
**since 3.31** ([host] H5), so find_ocx's two unhashed trust-root downloads are
unverified only on 3.19–3.30 (inside its declared floor) or when
`CMAKE_TLS_VERIFY=0` is in the environment — which still makes an explicit
`TLS_VERIFY ON` the right rule for any module whose floor admits 3.19–3.30
(M-D-05). The `cmake_policy(POP)` placement (`:1383`, leaving
`__ocx_self_update` outside the pin) stands at low severity. Shipped rules name
no fleet path and no OCX function; whether the defects become issues is Owner
question 2.

**17. CMP0054 and CMP0077 as P0 ([prac] #3, #4): one is moot, one is
re-targeted.** CMP0054 (3.1) is NEW at every floor ≥3.5, and 33/33 exemplar
floors clear 3.5 ([shape] §1); its OLD behaviour is removed in 4.0, so
`cmake_policy(SET CMP0054 OLD)` errors rather than silently misbehaving.
**Decided (normative plus measured):** CMP0054 drops to P3 (M-B-09). CMP0077's
trap is live only where a *fetched dependency's* floor is below 3.13 — its
`option()` then discards the parent's pre-set normal variable — so the row is
about dependencies (M-G-11), with `CMAKE_POLICY_DEFAULT_CMP0077=NEW` as the fix
(the reason CPM forces it, conflict 8). *Pending measurement* in
`dependency-seam/resolution-order-and-providers`.

**18. The 4.0 floor removal: a dependency risk, not an own-floor risk.** The
frame body and [canon]'s P0 frame it around "your project's floor". [shape] §1
measured 0/33 own floors below 3.5 and 6 repos injecting
`CMAKE_POLICY_VERSION_MINIMUM=3.5` for vendored or fetched code
(`apache__arrow@e0cf4184dd:cpp/cmake_modules/FindRapidJSONAlt.cmake:29-32`
save/set/restore); frame correction 2 agrees. **Decided (measured):** the P0
rows scan fetched and vendored trees (M-B-04) and bound the escape hatch's
scope (M-B-05); the variable's exact scope is *pending measurement*.

**19. Conan's Bazel generators under Bzlmod: open, commissioned.** [pm] §9:
Conan 2.32's Bazel page documents only `WORKSPACE`/`dependencies.bzl` wiring
and never states Bzlmod support. [shift] §6 and frame correction 1: 2.30.0
(2026-06-29) added "Bazel 9.x support" to `BazelDeps`. Bazel 9 removed
`WORKSPACE` (the Bazel set owns that fact). Both cannot be fully true as
written. **Decided: pending** — `bazel-seam/dual-build-sync-and-conan-bazel`
reads Conan's source at 2.32.0 and decides what a team can do today (M-K-05).

**20. Dual builds with "no sync mechanism": the audit is internally
inconsistent, commissioned.** [deps] headline 5 names five repos (benchmark,
googletest, re2, yaml-cpp, zlib); §8 names four, dropping benchmark; both count
CI files that mention `bazel` (re2 6, benchmark 3, yaml-cpp 2, googletest 1) as
"incidental" without reading them; frame correction 8 repeats the four.
**Decided: pending** — `bazel-seam/dual-build-sync-and-conan-bazel` reads every
CI job; building both descriptions in CI *is* a sync mechanism if it happens
(M-K-03).

**21. `CMakeConfigDeps` status: experimental, and the rule says why.** Conan's
own pages disagree at 2.32.0: `incubating.rst` says "generally available", the
generator's reference page still carries the experimental box ([cps-v] row 43,
confirmed); cmake-conan's README recommends it ([shift] §7). **Decided
(normative, conservative page governs — [cps-e] rule 5):** "cmake-conan's
current recommendation, still experimental, never emits Find modules" (M-M-01).

**22. Conan workspaces: GA since 2.31.0.** [pm] §8 calls them "incubating";
[shift] §6 dates "Get Workspace feature out of incubating" to 2.31.0,
2026-07-23. **Decided (normative, dated changelog is newer):** GA (M-M-10).

**23. vcpkg and dependency providers or CPS: none.** [pm] Summary implies vcpkg
plugs into providers; [deps] §7 measured none, and [cps-e] §4 plus [cps-v] row
46 found zero CPS code, docs or issues in vcpkg and vcpkg-tool. **Decided
(measured):** no row may claim either; dive `package-managers/vcpkg-manifests-and-caching`
re-checks vcpkg-tool's source once.

**24. "find_ocx competes with Conan `tool_requires` and vcpkg host
dependencies" is this program's synthesis, not the fleet's claim.** Frame line
89 states it; [fleet] §7 found 0 mentions of Conan, vcpkg or `tool_requires` in
find_ocx's or OCX's docs; [shift] made it a P0 "differentiator". **Decided
(measured):** the tool-provisioning question (how a C++ build gets `cmake`,
`ninja`, `protoc`, `ccache`) is a real P1 for audience 2 (M-L-04), answered in
portable terms with no OCX product named in shipped text; nothing cites
find_ocx's docs as drawing the contrast.

## The map

164 rows after deduplication, from about 289 raw candidates: 214 scout rows
(canonical 46, codified 41, package managers 45, practitioner 40, recent shifts
42 — counted from each Candidate-topics table), 17 CPS normative-guidance
candidates, and 58 audit smells and patterns. Merged rows say what they merged
where the merge is not obvious. Sections are lettered by the depth file that
will own them; the Artifact set decision names the file for each letter.
Evidence column: what the *next* worker needs — `web` (primary-source reading),
`exemplar` (counting across the corpus), `measure` (running real binaries).

### A. The configure gate, formatting and verification hygiene — 7 rows (`cmake-build` index, CMK-CORE)

| ID | question | surface | shapes | coverage | priority | family | evidence |
|---|---|---|---|---|---|---|---|
| M-A-01 | Which spelling of the configure gate works on each tested line — `-Werror=dev` on 3.31/≤4.3, `-Werror=author` on 4.4 — does 4.4.2 still honour `-Werror=dev` as a synonym, and does the deprecated spelling itself raise a `CMD_DEPRECATED` diagnostic a stricter gate would fail on? | tooling | all | uncovered [canon] [lint] §3 [host] H2 | P0 — every CMK row cites the gate; settled by the exit code of a scratch configure emitting `message(AUTHOR_WARNING)` under each spelling on 3.31.12/4.3.4/4.4.2 | CMK-CORE | measure |
| M-A-02 | Which of the seven categories 4.4.2 ships should a CI gate promote to error, given `CMD_INSTALL_ABSOLUTE_DESTINATION`, `CMD_UNINITIALIZED` and `CMD_UNUSED_CLI` default to ignore and `--warn-uninitialized`/`-Wuninitialized` is in CI in 0/46 exemplars? | tooling | all | uncovered [lint] §3 [canon] §16 [shape] §11 [host] H2 | P1 — decides the gate's second line; `cmake --help-manual cmake-diagnostics` on the pinned binary plus a noise count | CMK-CORE | measure |
| M-A-03 | Is gersemi 0.28.x the formatter of record (`gersemi --check`), and how does it treat a module's own commands — `--definitions`, the "obvious" `cmake_parse_arguments` requirement, `# gersemi: hints` — given 0/46 exemplars run it? | tooling, module-authoring | MOD, all | uncovered [lint] §2 [shift] §14 [shape] §11 | P1 — `gersemi --check <paths>` exit code; needs one run over a find_ocx-shaped module | CMK-CORE | exemplar |
| M-A-04 | May any shipped verification cite cmake-lint/cmake-format (last release 0.6.13, 2020-08-19; naming defaults from CMake 3.10 listfiles), and what does encountering a `.cmake-format*` config tell an agent to do? | tooling | TS, CL | uncovered [lint] §1 [shift] §14 | P1 — decision row: no; `find . -name '.cmake-format*'` hit = recognise-and-migrate, never extend | CMK-CORE | web |
| M-A-05 | Does any maintained *semantic* CMake linter exist in 2026, or is the lint role CMake's own diagnostics plus named greps? | tooling | all | uncovered [lint] §1-3 | P1 — decides whether any row may say "the linter catches this" | CMK-CORE | web |
| M-A-06 | Does every shipped verification avoid the `pipefail` + `grep -q` SIGPIPE false negative that zeroed this program's first exemplar table, and scope out vendored and generated trees (`contrib/`, `third_party/`, `_deps/`, grpc's 56,456-line generated list)? | tooling | all | uncovered [shape] M4, §12 [deps] §7 [frame] correction 12 | P1 — authoring constraint; re-run each shipped grep on one large repo with and without `pipefail` | CMK-CORE | exemplar |
| M-A-07 | Which silent passes must the index name before any rule — a green configure with new categories defaulting to ignore, a FetchContent substitution invisible from the `find_package` call site, a provider that never registered, a retired experimental gate that no-ops? | any | all | uncovered [canon] [pm] [cps-e] | P1 — authoring row for the index's opening paragraph; each named pass cites the row that catches it | CMK-CORE | web |

### B. Versions, floors, policies and experimental gates — 11 rows (`cmake-build/versions-and-policies.md`, CMK-VER)

| ID | question | surface | shapes | coverage | priority | family | evidence |
|---|---|---|---|---|---|---|---|
| M-B-01 | Which floor does the rule set assume and how does a rule state its gate (conflict 1: 3.25 assumed, 3.31.12 and 4.4.2 tested, `(CMake ≥ X.Y)` on the rule), and what do current distros and CI images ship? | cmake-language | all | uncovered [frame] [shape] §1 [prac] §9 | P0 — every row inherits it; check `grep -n cmake_minimum_required CMakeLists.txt` against the stated gate | CMK-VER | web |
| M-B-02 | Is the declared floor exercised by a real binary of that version in CI — find_ocx declares 3.19 and tests only 3.31/4.x; `Findocx.cmake` claims 3.15, untested? | cmake-language, module-authoring | MOD, all | uncovered [ocx] §3, §10 [prac] §9 | P0 — the CI matrix contains the floor version; absent = the floor is a claim, not a contract | CMK-VER | exemplar |
| M-B-03 | Does every command or keyword used exist at the declared floor (`string(JSON)` 3.19, `PROJECT_IS_TOP_LEVEL` 3.21, `FILE_SET` 3.23, `FIND_PACKAGE_ARGS` 3.24, `block()` 3.25, `CXX_MODULES` 3.28, ungated `install(PACKAGE_INFO)` 4.3)? | cmake-language | all | uncovered [lint] §10 (KB-H048/49) [canon] [cps-v] row 10 | P1 — a `versionadded` table the rule cites; configure on the floor binary where available | CMK-VER | web |
| M-B-04 | Does any `cmake_minimum_required`/`cmake_policy(VERSION)` below 3.5 exist in the tree **or in a fetched or vendored dependency**, a hard configure error on ≥4.0? | cmake-language, fetchcontent | LM, all | uncovered [canon] Summary [prac] §4 [shift] §1 [shape] §1 | P0 — `rg -n -e 'VERSION 2\.' -e 'VERSION 3\.[0-4][^0-9]' -g CMakeLists.txt -g '*.cmake' . build/_deps` (hit = breaks on 4.x); error text confirmed on 4.4.2 | CMK-VER | measure |
| M-B-05 | What is `CMAKE_POLICY_VERSION_MINIMUM`'s real scope — does arrow's save/set/restore around one `find_package` leak into the parent's later policies, does the environment form reach ExternalProject sub-builds, and is a global or preset value a silent re-admission of removed behaviour? | cmake-language, fetchcontent | LM, PM | uncovered [shape] §1 (6 repos inject it) [shift] [canon] | P0 — `rg -n CMAKE_POLICY_VERSION_MINIMUM` outside a save/restore pair = finding; scope settled by measurement | CMK-VER | measure |
| M-B-06 | Does `cmake_minimum_required(VERSION <min>...<max>)` do what authors think on 4.4, and what does the two-dot `3.15..4.3` in `jbeder__yaml-cpp@e5fe9f2cdd:CMakeLists.txt:1` parse as? | cmake-language | CL | uncovered [shape] §1 note 3 [canon] | P1 — 12/33 floors are ranges; configure the literal line on 3.31.12 and 4.4.2 and read the effective policy version | CMK-VER | measure |
| M-B-07 | Which policies introduced after the assumed floor need a stated decision, and which are "bump the floor instead"? | cmake-language | all | uncovered [canon] §3 (105 live at a 3.19 floor) | P1 — generated from `cmake --help-policies`; `if(POLICY CMPxxxx)` is the guard (20/43 repos, [shape] §1) | CMK-VER | web |
| M-B-08 | Is a retired `CMAKE_EXPERIMENTAL_*` gate still set (`EXPORT_PACKAGE_INFO`, `FIND_CPS_PACKAGES`, retired at 4.3.0), or a live gate set with a UUID copied from another minor (`MAPPED_PACKAGE_INFO` `ababa1b5-…` identical 4.3.0→4.4.3; `CXX_IMPORT_STD`; `EXPORT_PACKAGE_DEPENDENCIES`; `EXPORT_BUILD_DATABASE`; `GENERATE_SBOM`)? | cmake-language, cps | all | uncovered [cps-v] R2, rows 9, 16 [cps-s] rules 2-3 [shift] §2 | P0 — `rg -n CMAKE_EXPERIMENTAL_ -g CMakeLists.txt -g '*.cmake'`; each hit compared with `Help/dev/experimental.rst` at the pinned tag; a retired gate on a ≥4.3 floor is dead code | CMK-VER | web |
| M-B-09 | Does any code set a removed policy (CMP0000–CMP0065) to OLD or rely on CMP0054-OLD `if()` dereferencing? | cmake-language | all | uncovered [prac] #3 [canon] §3 | P3 — moot at every floor ≥3.5 (33/33 exemplars); 4.x errors on the `SET … OLD` itself (conflict 17) | CMK-VER | web |
| M-B-10 | Does any row, example or preset cite a 4.5/master-only feature (presets schema 13, `CMD_STRICT`, `CMD_NON_TARGET_DIRECTIVE`, `PRINT_TARGETS`) as current, and which 4.4 patch is current (4.4.3 upstream, 4.4.2 on this host)? | cmake-language | all | uncovered [canon] Summary [lint] §3 [cps-v] row 1 [host] H1-H2 | P1 — `cmake --help-manual <m>` on the pinned binary is the arbiter; `master` docs are not | CMK-VER | web |
| M-B-11 | Are removed generator names (Visual Studio 9/10/11/12) hard-coded, and does anything assume a 4.2-only generator (VS 18 2026, FASTBuild)? | cmake-language, presets | all | uncovered [shift] Summary [canon] Summary | P2 — `rg -n -e 'Visual Studio 9' -e 'Visual Studio 1[0-2] '` in presets and CI | CMK-VER | web |

### C. The CMake language — 9 rows (`cmake-build/language.md`, CMK-LANG)

| ID | question | surface | shapes | coverage | priority | family | evidence |
|---|---|---|---|---|---|---|---|
| M-C-01 | When does `set(<v> <x> CACHE <type> <doc>)` without `FORCE` leave an existing entry unchanged, does `CACHE INTERNAL` imply `FORCE` as the manual says, and how does CMP0126 (3.21) change whether a same-named normal variable is removed — under a module pinned to `cmake_policy(VERSION 3.19)`? | cmake-language | MOD, all | uncovered [ocx] §7 (refuted by [host] H4) | P0 — reconfigure a scratch project with a changed input and read `CMakeCache.txt`; decides find_ocx's headline "defect" (conflict 16) | CMK-LANG | measure |
| M-C-02 | What is the precedence among `-D`, an existing cache entry, a normal variable, `option()` (CMP0077) and a preset's `cacheVariables`, and which survive a reconfigure? | cmake-language, presets | all | uncovered [prac] #4 [canon] | P1 — scratch measurement; the classic "my `-D` did not take" failure | CMK-LANG | measure |
| M-C-03 | Are variables quoted in every `if()` comparison, lists iterated with `foreach(... IN LISTS)`, scalars quoted and argv lists unquoted when forwarded to `COMMAND`? | cmake-language | all | uncovered [ocx] §4 (0/240 unquoted in find_ocx) [canon] §6 [lint] §4 | P1 — [ocx] §4's two regexes; a corpus count decides whether the trap still occurs in practice | CMK-LANG | exemplar |
| M-C-04 | Function or macro: when does a macro's caller-scope leakage, `ARGN` re-expansion across nested macros, or `return()` behaviour (CMP0140, 3.25) make it wrong where a function was meant? (merges [prac] #27 and the scouts' function/macro rows) | cmake-language, module-authoring | all | uncovered [canon] Contested [lint] §4 [shape] §7 (4:1 function:macro) | P1 — `rg -n '^\s*macro\('` then read each for a caller-scope need; the default is function | CMK-LANG | exemplar |
| M-C-05 | How does a function return a value — `PARENT_SCOPE` (one level only, lost through a nested helper) or `return(PROPAGATE)` (3.25) — and how do `block()` scopes (3.25) interact with both? | cmake-language, module-authoring | MOD, all | uncovered [prac] #28 [canon] block.rst [ocx] (26 `PARENT_SCOPE`) | P1 — scratch measurement of nested-helper propagation | CMK-LANG | measure |
| M-C-06 | Does every `cmake_parse_arguments` use `PARSE_ARGV` (correct for empty and `;`-bearing arguments; CMP0174, 3.31) and check `_UNPARSED_ARGUMENTS` and `_KEYWORDS_MISSING_VALUES`? | cmake-language, module-authoring | MOD, all | uncovered [shape] §7 (480 `PARSE_ARGV` vs 322 `ARGN`) [ocx] headline 4 (6/6 `ARGN`) | P1 — grep for the non-`PARSE_ARGV` form then read for the UNPARSED check; empty-argument behaviour measured 3.31 vs 4.4 | CMK-LANG | measure |
| M-C-07 | Is a generator expression ever consumed at configure time (`message()`, `string()`, `if()`, `file(WRITE)`) where it is still literal text? | cmake-language | all | uncovered [prac] #29 | P1 — `rg -n -e 'message\(.*\$<' -e 'if\(.*\$<' -e 'string\(.*\$<'` hit = finding (use `file(GENERATE)`) | CMK-LANG | exemplar |
| M-C-08 | Are list values built with `list(APPEND)` rather than hand-joined `"a;b"` strings, and is `separate_arguments(... NATIVE_COMMAND)` used when a shell string must become argv? | cmake-language | all | uncovered [lint] §4 (LLVM primer) | P2 — reading heuristic | CMK-LANG | web |
| M-C-09 | Do option and cache-variable names carry the project prefix, never `CMAKE_` and never a case-only variant of a builtin (cmake-lint W0105's still-valid check)? (merges the option-prefix rows) | cmake-language | all | uncovered [shape] §6 (7/11 sampled ≥75 % prefixed; ClickHouse `ENABLE_` 77 %) [lint] §1 | P1 — an unprefixed option collides with every consumer that `add_subdirectory`s the project; heuristic with the vendoring caveat | CMK-LANG | exemplar |

### D. Shipping a reusable CMake module — 15 rows (`cmake-build/module-authoring.md`, CMK-MOD)

| ID | question | surface | shapes | coverage | priority | family | evidence |
|---|---|---|---|---|---|---|---|
| M-D-01 | Does a shipped module pin the policies its functions capture at definition — `cmake_policy(PUSH)`/`VERSION <floor>` … `POP` covering every definition (find_ocx's POP at `ocx.cmake:1383` leaves one function outside), or `block(SCOPE_FOR POLICIES)` on ≥3.25 — and does a function defined after the POP really see the includer's policies? | module-authoring | MOD | uncovered [ocx] §3 | P0 — `rg -n -e 'cmake_policy\(PUSH' -e 'cmake_policy\(POP'` and compare the POP line with the last `endfunction`; capture-at-definition confirmed by measurement | CMK-MOD | measure |
| M-D-02 | How does a copy-and-own module behave when two subprojects vendor different versions of it into one build (`include_guard(GLOBAL)` first-wins, silently), and should it assert its own version? | module-authoring | MOD | uncovered [ocx] §3 [frame] | P1 — chase-the-surprise; scratch measurement of two vendored copies | CMK-MOD | measure |
| M-D-03 | Does a Find module meet the `cmake-developer(7)` contract — `<Pkg>_FOUND` via `find_package_handle_standard_args`, honours `_FIND_QUIETLY`/`_FIND_REQUIRED`/`_FIND_VERSION`, creates imported targets under `if(NOT TARGET …)`, keeps legacy result variables — including a module that finds a program? | module-authoring, find-package | MOD, CL | uncovered [canon] §11 [lint] §8 [ocx] §9 | P1 — read each `Find*.cmake` for FPHSA and the `NOT TARGET` guard | CMK-MOD | exemplar |
| M-D-04 | Does any Find module download on a miss (`ccache__ccache@e256302fa6:cmake/FindZstd.cmake:49`), hiding a network dependency behind a local search? | module-authoring, find-package | MOD, TOOL | uncovered [deps] §1, smell 4 | P1 — `rg -n -e FetchContent -e 'file(DOWNLOAD' -e ExternalProject -g 'Find*.cmake'` hit = finding unless documented and switchable off | CMK-MOD | exemplar |
| M-D-05 | Does every `file(DOWNLOAD)` check `STATUS` (a failed download does not stop configure by itself), carry `EXPECTED_HASH` for executable content, pass `TLS_VERIFY ON` explicitly when the floor admits 3.19–3.30 (default off before 3.31; `CMAKE_TLS_VERIFY=0` still disables it), and bound time with `TIMEOUT`/`INACTIVITY_TIMEOUT`? | module-authoring | MOD | uncovered [ocx] §5 (2/5 hashed, 0/5 `TLS_VERIFY`) [host] H5 | P0 — `rg -n -A8 'file(DOWNLOAD'` each block carries `STATUS` and either `EXPECTED_HASH` or a documented trust-root note with `TLS_VERIFY ON`; `STATUS` behaviour measured against a missing `file://` URL | CMK-MOD | measure |
| M-D-06 | Does every `execute_process` fail loudly — `RESULT_VARIABLE` checked or `COMMAND_ERROR_IS_FATAL ANY` (3.19) — with `OUTPUT_STRIP_TRAILING_WHITESPACE`, list-form argv, and `ENCODING` stated where output is parsed (CMP0176, 3.31)? | module-authoring | MOD, LM | uncovered [ocx] §5 [prac] #21 [canon] CMP0176 | P0 — `rg -n -A10 'execute_process('` each block contains `RESULT_VARIABLE` or `COMMAND_ERROR_IS_FATAL`; empty = pass | CMK-MOD | exemplar |
| M-D-07 | Does a module parsing tool output with `string(JSON)` pass `ERROR_VARIABLE`, so malformed output yields the module's own message rather than CMake's generic parse error? | module-authoring | MOD | uncovered [ocx] §5 (1/17 do) | P2 — `rg -n 'string(JSON'` without `ERROR_VARIABLE` | CMK-MOD | web |
| M-D-08 | Does every diagnostic carry the module prefix and a fix hint, at the right severity (`FATAL_ERROR`/`SEND_ERROR`/`WARNING`/`AUTHOR_WARNING`/`DEPRECATION`; `CMAKE_MESSAGE_CONTEXT`, 11 corpus uses)? | module-authoring | MOD | uncovered [ocx] §6 [shape] §7 | P2 — reading heuristic; find_ocx's 100 %-prefixed messages are the worked example | CMK-MOD | web |
| M-D-09 | Does a module that runs tools at configure time declare its re-run inputs with `CMAKE_CONFIGURE_DEPENDS`, memoize by fingerprint, and document what it cannot watch (a file created later)? | module-authoring | MOD | uncovered [ocx] §7 | P2 — `rg -n CMAKE_CONFIGURE_DEPENDS`; read the memo invalidation path | CMK-MOD | web |
| M-D-10 | Are environment knobs snapshotted into the cache on first configure with the exceptions stated per knob, and are credentials never written to `CMakeCache.txt` or echoed from a child's stderr? | module-authoring | MOD | uncovered [ocx] §6-7 [fleet] env-class pattern | P1 — `grep -E 'TOKEN\|PASSWORD\|SECRET' build/CMakeCache.txt` after a configure with a dummy credential: empty = pass | CMK-MOD | measure |
| M-D-11 | Does the module work in script mode (`cmake -P`) where it claims to — guarding `CMAKE_SCRIPT_MODE_FILE`, avoiding `project()`-only commands and `cmake_language(DEFER)` — and is its public/private naming honest? | module-authoring | MOD | uncovered [ocx] §2, smell 5 | P2 — `cmake -P module.cmake` smoke plus a naming read | CMK-MOD | web |
| M-D-12 | How does a module hand off to `find_package` — `<Name>_ROOT` (CMP0074) as `CACHE PATH … FORCE`, and must it also set upper-case `<NAME>_ROOT` (CMP0144, 3.27)? How does that hint rank against `CMAKE_PREFIX_PATH` and a manager toolchain's injected paths? | module-authoring, find-package | MOD | uncovered [ocx] §9 [canon] CMP0144 [shift] | P1 — scratch measurement of hint precedence (shared with M-G-09) | CMK-MOD | measure |
| M-D-13 | Is a module's reference documentation extracted from its own `.rst:` bracket comments (`sphinxcontrib-moderncmakedomain`), so it cannot drift while hand-written tables elsewhere can? | module-authoring | MOD | partial [ocx] §11 (docs-quality owns the prose) | P3 — mechanism note only | CMK-MOD | web |
| M-D-14 | Does a self-updating or copy-and-own module verify its replacement (sums file with a hash per artefact, atomic rename) and carry a version a consumer can read? | module-authoring | MOD | uncovered [ocx] §5 | P2 — reading heuristic | CMK-MOD | web |
| M-D-15 | For a tool-provisioning module, does host detection use `CMAKE_HOST_SYSTEM_*` rather than target `CMAKE_SYSTEM_*` in a cross build, and are offline and mirror knobs offered? | module-authoring, providers | MOD | uncovered [ocx] §8 [canon] §5 | P2 — reading heuristic | CMK-MOD | web |

### E. Targets and usage requirements — 19 rows (`cmake-build/targets.md`, CMK-TGT)

| ID | question | surface | shapes | coverage | priority | family | evidence |
|---|---|---|---|---|---|---|---|
| M-E-01 | Does every `target_link_libraries` name `PUBLIC`/`PRIVATE`/`INTERFACE` (2,980 of 8,453 corpus calls are bare), is the keyword right (a dependency visible in a public header is PUBLIC), and where are bare calls concentrated per repo? | targets | all | uncovered [shape] §4 [canon] §1 | P0 — a multi-line-aware scan for calls whose second token is not a keyword; hit = finding | CMK-TGT | exemplar |
| M-E-02 | Are directory-scoped `include_directories`/`add_definitions`/`add_compile_options`/`link_directories`/`link_libraries` (653/677/137/36/50) used where a `target_*` command belongs? | targets | FW, LM | uncovered [shape] §4 [canon] §28 | P1 — `rg -n -e '^\s*include_directories\(' -e '^\s*add_definitions\(' -e '^\s*link_libraries\('` outside toolchain files | CMK-TGT | exemplar |
| M-E-03 | Does project code mutate `CMAKE_<LANG>_FLAGS` (482 calls), leaking flags into every subdirectory and fetched dependency? | targets | all | uncovered [shape] §4 [prac] #26 | P1 — `rg -n -e 'set(CMAKE_CXX_FLAGS' -e 'APPEND CMAKE_CXX_FLAGS'` outside toolchain files and top-level guards | CMK-TGT | exemplar |
| M-E-04 | Does an installable library state its minimum as `target_compile_features(<t> PUBLIC cxx_std_NN)` and leave `CMAKE_CXX_STANDARD` to the top level, a preset or a manager profile — and where the variable is set, is it paired with `_REQUIRED ON` (67/454) and `_EXTENSIONS OFF`? | targets | CL, HO | uncovered [shape] §3 [canon] | P0 — `rg -n 'CMAKE_CXX_STANDARD\b'` in a library's non-top-level CMakeLists = finding; a setter without `_REQUIRED` = finding (conflict 11) | CMK-TGT | exemplar |
| M-E-05 | Does every library a consumer can link have a namespaced `ALIAS` (`Pkg::lib`; 245 of 446 aliases are namespaced), so a build-tree and an install-tree consumer spell one name? | targets, install-export | CL, HO | uncovered [shape] §4 [canon] §2 | P1 — every `install(EXPORT … NAMESPACE X::)` target has a matching `add_library(X::t ALIAS t)` | CMK-TGT | exemplar |
| M-E-06 | Is `PROJECT_IS_TOP_LEVEL` (3.21; shimmed below, `friendlyanon__cmake-init@7e0c52fc73:cmake-init/templates/common/cmake/project-is-top-level.cmake`) used to keep tests, warnings-as-errors, CPack and developer targets out of a consumer's build — and what does a parent inherit from a project that gates nothing (35/43 gate only on `BUILD_TESTING`)? | targets, fetchcontent | all | uncovered [shape] §2 [lint] §12 [frame] correction 11 | P0 — `rg -n -e PROJECT_IS_TOP_LEVEL -e _IS_TOP_LEVEL -e 'CMAKE_SOURCE_DIR STREQUAL'`; the verification is a FetchContent-as-subproject smoke build | CMK-TGT | measure |
| M-E-07 | Does a library respect `BUILD_SHARED_LIBS` (1,284 references) instead of hard-coding `STATIC`/`SHARED`, and does a parent's value flip a fetched dependency's type? | targets, fetchcontent | CL | uncovered [prac] #10 [shape] §4 | P1 — measured with a two-level scratch build | CMK-TGT | measure |
| M-E-08 | Are symbols exported deliberately — `GenerateExportHeader` (9/43), `CXX_VISIBILITY_PRESET hidden` + `VISIBILITY_INLINES_HIDDEN` — rather than papered over with `CMAKE_WINDOWS_EXPORT_ALL_SYMBOLS` (vcpkg: "do not add"; KB-H049)? | targets | CL | uncovered [canon] [lint] §9-10 [pm] §17 | P1 — `rg -n WINDOWS_EXPORT_ALL_SYMBOLS` in a library = finding unless upstream relies on it | CMK-TGT | measure |
| M-E-09 | Is PIC requested on the target when a static library may end up in a shared object, and does the build honour an externally supplied PIC request (`rules_foreign_cc#421`)? | targets, bazel-seam | CL | uncovered [canon] [prac] §25 | P1 — global `CMAKE_POSITION_INDEPENDENT_CODE` vs per-target; relocation check on the archive | CMK-TGT | measure |
| M-E-10 | Are target sources listed explicitly, or collected with `file(GLOB)`/`GLOB_RECURSE` (1,474 calls; `CONFIGURE_DEPENDS` on 2.2 %) that miss new files until a reconfigure? | targets | all | uncovered [shape] §5 [canon] §28 [prac] #24 | P1 — `rg -n 'file(GLOB'` feeding `add_library`/`target_sources` = SHOULD finding | CMK-TGT | exemplar |
| M-E-11 | Is warnings-as-errors set where it cannot break a consumer — `CMAKE_COMPILE_WARNING_AS_ERROR` (3.24) in a preset or CI — never a raw `-Werror` (187 literal uses vs 16) in an installable library's CMakeLists? | targets | CL, HO | uncovered [shape] §8 [canon] [lint] §11 | P1 — `rg -n -e '-Werror\b' -e '/WX\b' -g CMakeLists.txt` in a library = finding | CMK-TGT | exemplar |
| M-E-12 | Is the MSVC runtime chosen through `CMAKE_MSVC_RUNTIME_LIBRARY` (CMP0091, 109 uses) rather than `/MD`/`/MT` surgery, and does it agree with the manager's triplet or profile (cmake-conan#174)? | targets, conan, vcpkg | CL | uncovered [shape] §8 [prac] #30 | P1 — `rg -n -e '/MD\b' -e '/MT\b'` in flags = finding; no Windows host, so docs-grounded | CMK-TGT | web |
| M-E-13 | Where C++20 named modules ship, is it an opt-in extra target (`FILE_SET CXX_MODULES`: `fmtlib__fmt@d90c33606c:CMakeLists.txt:365`, nlohmann/json) with the generator and compiler gate stated (Ninja ≥1.11 or VS 17.4+, Clang 16+, GCC 14+), and does bumping `CXX_STANDARD` to 20 silently switch on scanning (CMP0155)? `import std` stays experimental in 4.4. | targets | CL | partial [bzl-cc] owns modules under Bazel; [shape] §5 [shift] §3 [prac] §5 | P2 — 2/46 production adopters; a gate table, not a mandate | CMK-TGT | web |
| M-E-14 | Is `CMAKE_BUILD_TYPE` defaulted only by the top-level project and only for single-config generators, never forced by a library? | targets, presets | all | uncovered [prac] #25 (SO #7724569, 606 votes) | P1 — `rg -n 'set(CMAKE_BUILD_TYPE'` outside a top-level guard and a `NOT CMAKE_CONFIGURATION_TYPES` check | CMK-TGT | web |
| M-E-15 | Does `CMAKE_LINK_LIBRARIES_ONLY_TARGETS` (3.23) catch misspelled or bare-name link items, and which legitimate forms does it break? | targets | all | uncovered [shift] §row [canon] §7 | P2 — scratch measurement | CMK-TGT | measure |
| M-E-16 | How are sanitizer and hardening builds expressed natively (options vs presets; 25/46 carry `-fsanitize=`), and which Windows ASan traps apply? | targets | TS, all | partial [bzl-cc] owns sanitizers under Bazel; [deps] §9 [lint] §11 | P2 — presets-first; one table | CMK-TGT | web |
| M-E-17 | Does a reproducible build wire `-ffile-prefix-map` itself (no `CMAKE_DEBUG_PREFIX_MAP` exists) and embed no absolute path? | targets | all | uncovered [lint] §14 | P2 — build twice from two directories, compare with `cmp` and `strings` | CMK-TGT | measure |
| M-E-18 | Is an in-source build refused, and is `enable_language()` never called before `project()` (CMP0165, 3.30)? | targets | all | uncovered [prac] #37 [canon] §3 | P3 — one-line guards | CMK-TGT | web |
| M-E-19 | IPO/LTO (`CheckIPOSupported`, 8/43), unity builds (5/43), precompiled headers (6/43): any correctness rule? | targets | LM | uncovered [shape] §8 | P3 — performance knobs only | CMK-TGT | web |

### F. Install, export and consumability — 19 rows (`cmake-build/install-and-export.md`, CMK-INST)

| ID | question | surface | shapes | coverage | priority | family | evidence |
|---|---|---|---|---|---|---|---|
| M-F-01 | Does a reusable library install a Config package — `install(TARGETS … EXPORT)`, `install(EXPORT … NAMESPACE)`, `configure_package_config_file` — that a separate five-line consumer can `find_package(<name> CONFIG REQUIRED)` from the install prefix (19/43 export; 7/46 run `cmake --install` in CI, none traced to a consumer; CCI's `test_package` in 38/40 is the model)? (merges the consumer-test rows) | install-export | CL, HO | uncovered [shape] §8 [deps] §4, §9 [cps-e] rule 6 | P0 — the round trip: `cmake --install b --prefix $P`, then configure and build a consumer with `-DCMAKE_PREFIX_PATH=$P`; non-zero = finding | CMK-INST | measure |
| M-F-02 | Is the installed package relocatable — no absolute build, source or install paths in `*Targets*.cmake`, `*Config.cmake` or `.pc`, `$<INSTALL_INTERFACE:…>` relative, `PACKAGE_PREFIX_DIR` used — proven by moving the prefix and consuming again? | install-export, bazel-seam | CL, HO, DB | uncovered [canon] §2 [prac] #18 [lint] [prac] §25 (rules_foreign_cc#1129) | P0 — `grep -rn "$PWD" $P` empty, then `mv $P $P2` and repeat M-F-01's consumer against `$P2` | CMK-INST | measure |
| M-F-03 | Does the Config file call `find_dependency()` for every PUBLIC/INTERFACE dependency with matching arguments, or rely on 3.29's still-experimental `EXPORT_PACKAGE_DEPENDENCIES`? | install-export | CL | uncovered [canon] §20 [cps-s] §2 | P0 — every `PUBLIC ns::x` on an exported target has a `find_dependency(x)` in `*Config.cmake.in`; the round trip fails otherwise | CMK-INST | measure |
| M-F-04 | Is `write_basic_package_version_file(... COMPATIBILITY …)` chosen deliberately (SameMajorVersion 33/70, AnyNewerVersion 27, ExactVersion 9) with `ARCH_INDEPENDENT` for header-only packages? | install-export | CL, HO | uncovered [shape] §8 [lint] §12 | P1 — reading heuristic against the project's versioning promise | CMK-INST | exemplar |
| M-F-05 | Does every install destination come from `GNUInstallDirs` (296 includes) — never a hand-rolled `lib64`, `LIB_SUFFIX` or `LIB_INSTALL_DIR`, which Fedora 45's `%cmake` stops injecting (change updated 2026-03-10) — with CMP0192/CMP0193 (4.1) prefix behaviour understood? | install-export | all | uncovered [lint] §13 [prac] #31 | P0 — `rg -n -e LIB_SUFFIX -e LIB_INSTALL_DIR -e INCLUDE_INSTALL_DIR -e 'DESTINATION lib64'` hit = finding | CMK-INST | exemplar |
| M-F-06 | Is any install `DESTINATION` absolute, defeating `DESTDIR` staging and relocation, and does 4.4's `CMD_INSTALL_ABSOLUTE_DESTINATION` (default ignore) catch it when promoted? | install-export | all | uncovered [lint] §3 [host] H2 | P1 — measure the category's CLI spelling on 4.4.2 against a scratch absolute install | CMK-INST | measure |
| M-F-07 | Are build-tree and install-tree RPATHs separate and relative (`CMAKE_BUILD_RPATH` vs `CMAKE_INSTALL_RPATH` with `$ORIGIN`/`@loader_path`; `INSTALL_RPATH_USE_LINK_PATH` deliberate), so an installed binary finds its libraries after relocation? | install-export | CL | uncovered [canon] [lint] §13-14 [prac] #9 | P1 — `readelf -d <installed>` RUNPATH has no build path and resolves after `mv` | CMK-INST | measure |
| M-F-08 | On Windows, are runtime DLLs installed beside executables (`RUNTIME DESTINATION`, `$<TARGET_RUNTIME_DLLS>` 3.21, `install(RUNTIME_DEPENDENCY_SET)`)? | install-export | CL | uncovered [canon] [fleet] Gaps | P2 — no Windows host; web only, and the row says so | CMK-INST | web |
| M-F-09 | Are public headers installed through `FILE_SET HEADERS` (3.23; 141+ single-line uses) or `install(DIRECTORY)`, with `$<BUILD_INTERFACE>`/`$<INSTALL_INTERFACE>` include directories and no source-tree path in the exported interface (CMP0052)? | install-export | CL, HO | uncovered [shape] §5 [canon] §3 | P1 — M-F-02's grep covers the leak; FILE_SET vs DIRECTORY is SHOULD | CMK-INST | exemplar |
| M-F-10 | Does the export namespace equal the package name? CPS forbids `Vendor::Product` when the package is `product` (Kitware-confirmed permanent, `discourse.cmake.org/t/15720`), so today's namespace choice in a non-CPS project is a forward-compatibility liability. | install-export, cps | CL | uncovered [cps-e] §14 [cps-v] row 52, Verdict | P1 — compare each `NAMESPACE X::` with the package name case-insensitively; mismatch = SHOULD finding | CMK-INST | exemplar |
| M-F-11 | Does a project that installs a Config package also emit CPS with `install(PACKAGE_INFO …)` guarded by `CMAKE_VERSION VERSION_GREATER_EQUAL 4.3`, never instead of the Config file, never behind a retired gate? | install-export, cps | CL, HO | uncovered [cps-v] Verdict [cps-s] rules 1-2 [cps-e] rules 1, 6 | P1 — SHOULD per the verifier; grep pair plus the round trip on 4.3.4 and 4.4.2 (conflict 5) | CMK-INST | measure |
| M-F-12 | What does CPS export lose (non-configuration generator expressions, custom `INTERFACE_*` properties), what does it write that CMake cannot read back (`VERSION_SCHEMA rpm/dpkg/pep440` accepted unvalidated; only `simple`/`custom` compared), and where does `export(PACKAGE_INFO)` write since 4.3.3 (`cps/<pkg>/`)? | install-export, cps | CL | uncovered [cps-v] R3, row 14 [cps-s] §7-8 | P2 — round trip with a `$<COMPILE_LANGUAGE:C>` interface property and an `rpm` schema | CMK-INST | measure |
| M-F-13 | Is `CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO` (gated by `CMAKE_EXPERIMENTAL_MAPPED_PACKAGE_INFO` since 4.3; its doc still names `CMAKE_EXPERIMENTAL_FIXME`) kept out of upstream CMakeLists as a distributor-only switch? | install-export, cps | CL | uncovered [cps-v] R2, rows 26-27 [cps-s] rule 8 | P2 — `rg -n CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO -g CMakeLists.txt` hit = finding | CMK-INST | web |
| M-F-14 | Is a pkg-config `.pc` generated from the same target data (79 `*.pc.in` files in 22 repos), relocatable via `${pcfiledir}`, and installed to `${CMAKE_INSTALL_LIBDIR}/pkgconfig`, so Meson, pkg-config-only consumers and wrappers can link the library? | install-export | CL | uncovered [cps-e] §15, rule 6 [host] H7 | P1 — exemplar comparison of generation styles plus a relocation check | CMK-INST | exemplar |
| M-F-15 | Does the install use components (`<name>_Runtime`/`_Development`) and a packager-overridable `<name>_INSTALL_CMAKEDIR` (the cmake-init pattern)? | install-export | CL, TS | uncovered [lint] §12 | P2 — reading heuristic | CMK-INST | exemplar |
| M-F-16 | When writing a Config package for someone else's library, is it named `unofficial-<name>` with `unofficial::<name>::` targets (40/40 vcpkg lower-case config templates), so a later upstream config cannot collide? | install-export, vcpkg | PM, CL | uncovered [shape] §8 [lint] §9 | P2 — naming check | CMK-INST | exemplar |
| M-F-17 | Is CPack wired only by the top-level project (11/43 do), and do packaging legs pin the generator-default policies that changed output (CMP0206 4.3, CMP0172 3.31, CMP0161 3.29, CMP0133 3.24)? | install-export | all | uncovered [shape] §9 [canon] §19 [lint] §12 | P2 — `rg -n 'include(CPack)'` under a top-level guard | CMK-INST | web |
| M-F-18 | Should a project `export()` its build tree or populate the package registry (CMP0090, off by default)? | install-export | all | uncovered [canon] §2 | P3 — almost never; one line | CMK-INST | web |
| M-F-19 | Which SBOM does an installed tree carry — CMake's experimental `install(SBOM)` (4.3), Conan's CycloneDX/SPDX deployers, vcpkg's SPDX — and can a project end up with zero or three? | install-export, conan, vcpkg | all | uncovered [canon] §20 [shift] §6, §9 | P3 — experimental on the CMake side | CMK-INST | web |

### G. Consuming dependencies — 20 rows (`cmake-build/dependencies.md`, CMK-DEP)

| ID | question | surface | shapes | coverage | priority | family | evidence |
|---|---|---|---|---|---|---|---|
| M-G-01 | When does a FetchContent-declared dependency shadow or duplicate the copy `find_package` would find, and which sanctioned idiom resolves it — `OVERRIDE_FIND_PACKAGE` (`apache__arrow@e0cf4184dd:cpp/cmake_modules/ThirdpartyToolchain.cmake:2073`), try-find-then-fetch (`protocolbuffers__protobuf@e816e3cbab:cmake/abseil-cpp.cmake:16-43`), or `FIND_PACKAGE_ARGS`? (merges the five scouts' "two copies" rows) | fetchcontent, find-package | LM, CL | uncovered [deps] §1 [canon] §9 [prac] #1 [pm] #19 | P0 — `rg -n -A10 FetchContent_Declare` for `FIND_PACKAGE_ARGS`/`OVERRIDE_FIND_PACKAGE`; configure with `--debug-find-pkg=<name>` and read which path won | CMK-DEP | measure |
| M-G-02 | What is the real resolution order when `FIND_PACKAGE_ARGS`, `OVERRIDE_FIND_PACKAGE`, `FETCHCONTENT_TRY_FIND_PACKAGE_MODE` (NEVER/OPT_IN/ALWAYS), `FETCHCONTENT_SOURCE_DIR_<X>`, `CMAKE_FIND_PACKAGE_REDIRECTS_DIR` and a provider meet on one name, and are the two keywords really mutually exclusive? | fetchcontent, providers | all | uncovered [canon] §9 [shift] §1 [prac] §1 | P0 — only a scratch matrix on 3.31.12 and 4.4.2 answers it | CMK-DEP | measure |
| M-G-03 | Is every fetched source content-pinned — a full 40-hex `GIT_TAG`, or `URL` + `URL_HASH` — rather than a branch (4 of 34 git declares) or an opaque variable (14 of 34), given OpenSSF Scorecard does not inspect FetchContent at all? | fetchcontent, cpm | all | uncovered [deps] §2, §10 [lint] §14 [prac] #22 | P0 — `rg -n -e 'GIT_TAG +"?main' -e 'GIT_TAG +"?master' -e 'GIT_TAG +"?develop'` hit = MUST finding; a tag = SHOULD; `URL` without `URL_HASH` = MUST | CMK-DEP | exemplar |
| M-G-04 | Can the configure run with no network — `FETCHCONTENT_FULLY_DISCONNECTED` (enforced by CMP0170, 3.30), `FETCHCONTENT_SOURCE_DIR_<X>`, `CPM_SOURCE_CACHE`, a populated `_deps` — and does it fail loudly or re-fetch silently? | fetchcontent, cpm | all | uncovered [canon] §3 [pm] §19 [deps] §2 (10 files set SOURCE_DIR) | P1 — `unshare -rn cmake -S . -B b -DFETCHCONTENT_FULLY_DISCONNECTED=ON` on a pre-populated tree | CMK-DEP | exemplar |
| M-G-05 | Which FetchContent behaviours changed silently across 3.24–3.30 — CMP0135 (URL timestamps), CMP0150 (relative git URLs), CMP0168 (direct population), CMP0169 (one-argument `FetchContent_Populate` deprecated; 66 legacy calls) — and what are `SYSTEM` (3.25) and `EXCLUDE_FROM_ALL` (3.28) for? | fetchcontent | all | uncovered [canon] §9 [shift] §1 [deps] §2 | P1 — a one-argument `FetchContent_Populate(name)` hit = finding | CMK-DEP | exemplar |
| M-G-06 | Does an installable library force its own acquisition (unconditional `FetchContent_MakeAvailable` in non-test code), or call `find_package` and leave the choice to the consumer — the Using Dependencies guide's "project control vs user override" line (conflict 7)? | fetchcontent, find-package | CL, HO | uncovered [canon] Summary [prac] Contested [deps] §2 | P0 — `FetchContent_MakeAvailable` in a library outside a top-level guard and without `FIND_PACKAGE_ARGS` = finding | CMK-DEP | exemplar |
| M-G-07 | When must `find_package` carry a version or a range (222 of 6,957 carry one; 13 a range), and given only CPS packages honour ranges end to end, what does a range buy against a Config package? | find-package | all | uncovered [deps] §1 [cps-s] §5 [cps-v] row 22 | P1 — reading heuristic: a dependency with a known breaking major carries a minimum | CMK-DEP | exemplar |
| M-G-08 | Is `CONFIG` or `MODULE` stated in `find_package` (41 % / 1.7 %), and is `CMAKE_FIND_PACKAGE_PREFER_CONFIG` (8 files, all test-adjacent) ever the right global? | find-package | all | uncovered [canon] §2 [deps] §1 [prac] #14 | P1 — explicit mode improves the not-found message; grep for calls with neither | CMK-DEP | exemplar |
| M-G-09 | Which location hint wins and which sticks in the cache — `<Pkg>_DIR`, `<Pkg>_ROOT`/`<PKG>_ROOT` (CMP0074/CMP0144), `CMAKE_PREFIX_PATH` (variable and environment), `CMAKE_FIND_ROOT_PATH`, a manager toolchain's injected paths? (merges [shift]'s `<Pkg>_ROOT` + toolchain row) | find-package, providers | all | uncovered [deps] §1 [ocx] §9 [canon] §7 [shift] | P1 — scratch measurement with two installed copies of one package | CMK-DEP | measure |
| M-G-10 | Are optional dependencies made deterministic in CI with `CMAKE_DISABLE_FIND_PACKAGE_<Pkg>`/`CMAKE_REQUIRE_FIND_PACKAGE_<Pkg>`, not toggled by whatever the runner has? | find-package, tooling | all | uncovered [canon] §2 | P1 — presets or CI carry one of the two for each non-`REQUIRED` `find_package` | CMK-DEP | web |
| M-G-11 | Does a fetched dependency whose floor is below 3.13 silently discard the parent's pre-set normal variable in its `option()` (CMP0077 OLD in the dependency's scope), and is `CMAKE_POLICY_DEFAULT_CMP0077=NEW` the fix (conflict 17)? | fetchcontent | all | uncovered [prac] #4 [canon] §3 | P1 — scratch measurement | CMK-DEP | measure |
| M-G-12 | For CPM: is every `CPMAddPackage` pinned by commit (`gh:user/repo#<commit>@<version>`), is the vendored `CPM.cmake` pinned and hash-checked (0.42.1 and 0.42.3 in the two templates), does the consumer know CPM sets CMP0077/CMP0126/CMP0135/CMP0150 to NEW on load, and when is `CPM_USE_LOCAL_PACKAGES`/`CPMFindPackage` right? | cpm | TS | uncovered [pm] §19 [prac] §13 [deps] §3 | P1 — shorthand `CPMAddPackage` without a 40-hex `#<commit>` = finding | CMK-DEP | exemplar |
| M-G-13 | What does a `HunterGate` call pin (URL + SHA1), where does `HunterGate.cmake` live now (`cpp-pm/gate` submodule at `920507363b…`), and does the pin postdate the June-2026 CMake-4 fix (#858)? | hunter | PM | uncovered [deps] §6 [shift] §13 [pm] §18 | P3 — maintained, adopted by 0 of 45 other exemplars (conflict 9); one recognition row | CMK-DEP | exemplar |
| M-G-14 | Are vendored directories (10/46: `contrib`, `third_party`, `third-party`, `deps`) marked with their upstream version and patches, and do submodules float via `branch =`? | fetchcontent | LM, FW | uncovered [deps] §7, §10 | P2 — `git config -f .gitmodules --get-regexp branch` hit = floating | CMK-DEP | exemplar |
| M-G-15 | When both `X.cps` and `XConfig.cmake` are installed, which does `find_package(X)` pick on 4.3+, does `CONFIGS` really suppress CPS, does `<X>_DIR` pointing at a mixed directory change it (open issue #26410), and does CMake ignore `CPS_PATH`/`CPS_PREFIX_PATH`? | find-package, cps | all | uncovered [cps-s] §4 [cps-v] rows 20-21 | P1 — scratch measurement on 4.3.4 and 4.4.2 | CMK-DEP | measure |
| M-G-16 | Is a policy-removed Find module still called (FindBoost CMP0167 3.30, FindCUDA CMP0146 3.27, FindPythonInterp/Libs CMP0148 3.27, FindCABLE and FindGCCXML 4.1), and what replaces each (Boost's own config with `Boost::headers` since 1.82, FindPython, CUDAToolkit)? | find-package | all | uncovered [canon] §9 [lint] §7 | P1 — `rg -n -e 'find_package(Boost' -e 'find_package(CUDA' -e 'find_package(PythonInterp'` against a floor at or past the removal | CMK-DEP | web |
| M-G-17 | Which native tools answer "why was this copy found" — `--debug-find-pkg=<name>`, `CMakeConfigureLog.yaml` find events (CONFIG mode since 4.1), `<Pkg>_DIR` in the cache, the redirects directory, `VCPKG_TRACE_FIND_PACKAGE`, `conan graph explain`? | find-package | all | uncovered [canon] §14 [pm] §8, §11 | P1 — feeds `cmake-dependency-triage`; measured on the M-G-01 scratch cases | CMK-DEP | measure |
| M-G-18 | Is any network reached at configure time — `FetchContent_MakeAvailable`, `file(DOWNLOAD)`, configure-time `ExternalProject`, `CPMAddPackage`, `HunterGate`, a cmake-conan provider — and is that enumerated and switchable off? | fetchcontent, bazel-seam | all | uncovered [prac] #23 [lint] §15 | P0 — one enumeration grep plus an `unshare -rn` configure; an undeclared network touch = finding | CMK-DEP | measure |
| M-G-19 | Is pkg-config consumed through `pkg_check_modules(... IMPORTED_TARGET)` (322 calls) or `cmake_pkg_config` (3.31 `EXTRACT`; 4.1 `IMPORT`/`POPULATE`), and does `PKG_CONFIG_PATH` respect the sysroot in a cross build? | find-package | all | uncovered [deps] §7 [shift] §1 | P2 — `pkg_check_modules` without `IMPORTED_TARGET` = SHOULD finding | CMK-DEP | measure |
| M-G-20 | When is build-time `ExternalProject_Add` (a superbuild) right instead of FetchContent — a non-CMake dependency, a different toolchain — given the 184 corpus calls are mostly CMake's own tests? | fetchcontent | LM, FW | uncovered [deps] §2 [canon] §26 | P2 — decision row | CMK-DEP | exemplar |

### H. Toolchains, top-level includes and dependency providers — 8 rows (`cmake-build/toolchains-and-providers.md`, CMK-TC)

| ID | question | surface | shapes | coverage | priority | family | evidence |
|---|---|---|---|---|---|---|---|
| M-H-01 | `CMAKE_TOOLCHAIN_FILE` takes one path: when vcpkg's `scripts/buildsystems/vcpkg.cmake`, Conan's `conan_toolchain.cmake`, rules_foreign_cc's generated crosstool file and a project cross toolchain all want it, which composition does each support (`VCPKG_CHAINLOAD_TOOLCHAIN_FILE` and its two meanings, vcpkg#36244; Conan `tools.cmake.cmaketoolchain:user_toolchain`; rules_foreign_cc skipping generation when the caller supplies the entry)? | providers, conan, vcpkg, bazel-seam | all | uncovered [pm] #28 [prac] #6 [lint] §15 | P0 — per configure leg, count distinct toolchain sources in presets, CI and cache (`rg -n CMAKE_TOOLCHAIN_FILE`); more than one without a chainload = finding | CMK-TC | web |
| M-H-02 | Is anything that must precede the first `project()` — `CMAKE_TOOLCHAIN_FILE`, `CMAKE_PROJECT_TOP_LEVEL_INCLUDES`, `VCPKG_TARGET_TRIPLET`/`VCPKG_MANIFEST_FEATURES`/overlays, the `import std` gate — set after it, where it silently does nothing? | providers, vcpkg | all | uncovered [pm] #4 [canon] §20 | P0 — ordering check: the first `project(` line vs every such `set(`; the silent no-op measured | CMK-TC | measure |
| M-H-03 | Is a dependency provider registered only from a file in `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` during the first `project()` (3.24; module-name form 3.29), never from the project's own CMakeLists — and what happens when two top-level includes both call `SET_DEPENDENCY_PROVIDER`? | providers | all | uncovered [canon] §22 [pm] #1-2, #35 [prac] #5 [deps] §7 (1/46) | P0 — `rg -n SET_DEPENDENCY_PROVIDER` outside a top-level-include file = finding; the two-provider outcome measured | CMK-TC | measure |
| M-H-04 | What does a provider not see — `find_program`/`find_library`/`find_path` before the first `find_package` (cmake-conan's stated limitation), anything but `FIND_PACKAGE` and `FETCHCONTENT_MAKEAVAILABLE_SERIAL`, `try_compile` unless `PROPAGATE_TOP_LEVEL_INCLUDES_TO_TRY_COMPILE` (3.30)? | providers | all | uncovered [pm] §4 [shift] §7 [canon] §22 | P1 — a scratch provider that logs every call | CMK-TC | measure |
| M-H-05 | Does a cross toolchain set `CMAKE_SYSTEM_NAME`, `CMAKE_SYSROOT` and `CMAKE_FIND_ROOT_PATH_MODE_*` (PROGRAM NEVER; LIBRARY, INCLUDE, PACKAGE ONLY) so `find_package` cannot resolve host libraries (29 cross toolchains in the corpus)? | providers | all | uncovered [canon] §5 [deps] §7 | P1 — scratch cross build with `zig cc -target aarch64-linux-gnu` and a fake sysroot | CMK-TC | measure |
| M-H-06 | Are code generators found for the **host** in a cross build — `find_program` with `NO_CMAKE_FIND_ROOT_PATH`, Conan `tool_requires` build context, vcpkg `"host": true`, `CMAKE_CROSSCOMPILING_EMULATOR`? | providers, conan, vcpkg | all | uncovered [pm] §6, §12 [canon] §5 | P1 — reading heuristic plus the M-H-05 scratch | CMK-TC | web |
| M-H-07 | Is a toolchain file idempotent and free of project-level commands, given it is re-read for every `try_compile` (CMP0137, 3.24)? | providers | all | uncovered [canon] §3 | P2 — reading heuristic; count reads in the M-H-05 scratch | CMK-TC | measure |
| M-H-08 | Does any rule text treat dependency providers as a mature neutral seam? (No: one implementation, cmake-conan; vcpkg none; CPM's tracker asks for one, #415 — conflict 6.) | providers | PM | uncovered [deps] §7 [prac] §24 [frame] correction 4 | P1 — wording discipline on every provider row | CMK-TC | web |

### I. Testing — 6 rows (`cmake-build/testing.md`, CMK-TEST)

| ID | question | surface | shapes | coverage | priority | family | evidence |
|---|---|---|---|---|---|---|---|
| M-I-01 | Is the test subtree gated so a consumer that `add_subdirectory`s or FetchContents the project with `BUILD_TESTING=ON` does not build its tests (`include(CTest)` 16 vs `enable_testing()` 29; `BUILD_TESTING` 519 references)? | ctest, fetchcontent | all | uncovered [shape] §2 [lint] §12 | P0 — the M-E-06 subproject smoke build: the parent's `ctest -N` count must not include the child's tests | CMK-TEST | measure |
| M-I-02 | Does CI run `ctest --test-dir <b> --output-on-failure --no-tests=error -j <n>` (and `-C <cfg>` on multi-config) rather than a bare `ctest` that passes with zero tests? | ctest, tooling | all | uncovered [canon] §18 [shift] §1 [fleet] Gaps (`--test-dir` once) | P1 — CI line check; `--no-tests=error` absent = finding | CMK-TEST | exemplar |
| M-I-03 | Which test properties make a suite reliable in CI — `TIMEOUT` (17 single-line uses), `LABELS` (208), `FIXTURES_*` (202), `RESOURCE_LOCK`, `RESOURCE_GROUPS`, `WILL_FAIL` vs `PASS_REGULAR_EXPRESSION` — and is `--repeat until-pass` hiding flakes? | ctest | all | uncovered [shape] §9 [canon] §18 | P1 — every `add_test` has a `TIMEOUT` or a global `CTEST_TEST_TIMEOUT` | CMK-TEST | exemplar |
| M-I-04 | How is a CMake module tested — per-CMake-line `ctest --build-and-test` fixtures, negative tests asserting the diagnostic, the configure gate on every inner configure (find_ocx applies it in 5 of 10 families), reconfigure tests that change an input (find_ocx's memo test never does)? | ctest, module-authoring | MOD | uncovered [ocx] §10 [canon] RunCMake | P1 — every inner `cmake` invocation in the test scripts carries the gate | CMK-TEST | exemplar |
| M-I-05 | Should discovery use `gtest_discover_tests`/`catch_discover_tests` (essentially unused: googletest and Catch2 themselves use `add_test`) or 4.4's `discover_tests`, with `DISCOVERY_MODE PRE_TEST` when cross-compiling? | ctest | all | uncovered [shape] §9 [canon] §18 | P2 — decision row | CMK-TEST | web |
| M-I-06 | Do test command lines survive empty arguments (CMP0178, 3.31) and cross-compiling emulators (CMP0158, 3.29)? | ctest | all | uncovered [canon] §3 | P3 — policy notes | CMK-TEST | web |

### J. Presets and CI — 11 rows (`cmake-build/presets-and-ci.md`, CMK-CI)

| ID | question | surface | shapes | coverage | priority | family | evidence |
|---|---|---|---|---|---|---|---|
| M-J-01 | What does each CMake do with a presets file whose `version` it does not know (schema 12 on 3.31.12), with a v12-only field under a lower declared version, and with `dev` vs `author` in `warnings`/`errors` (renamed at schema 12)? | presets | all | uncovered [canon] §4 [shift] §1 [prac] #13 [host] H3 | P0 — `jq .version CMakePresets.json` ≤ the floor's maximum schema (v6 3.25, v10 3.31, v11 4.3, v12 4.4); rejection behaviour measured | CMK-CI | measure |
| M-J-02 | Are presets the local reproduction of CI — one configure preset per leg, CI invoking `cmake --preset`/`ctest --preset` (5/46 have presets; 3/46 invoke them) — or decorative beside a CI script that is the real source of truth? | presets, tooling | all | uncovered [shape] §10 [deps] §9 [prac] Contested | P1 — `rg -n -e 'cmake --preset' -e 'ctest --preset' .github/workflows` vs preset names (conflict 12) | CMK-CI | exemplar |
| M-J-03 | Is `CMakeUserPresets.json` kept out of version control (0/5 tracked, 4/5 gitignored), including the one Conan's `CMakeToolchain` writes? | presets, conan | all | uncovered [shape] §10 [pm] §2 | P1 — `git ls-files CMakeUserPresets.json` empty = pass | CMK-CI | exemplar |
| M-J-04 | Does CI pin the CMake (and Ninja, Conan, vcpkg-tool) versions it validates rather than inheriting the runner image (35/46 install nothing)? | tooling | all | uncovered [deps] §9 [shift] §row | P0 — `rg -n -e get-cmake -e actions-setup-cmake -e 'pip install cmake=='` in workflows; empty = floating | CMK-CI | exemplar |
| M-J-05 | How should presets avoid the OS × compiler × config cross-product (issue #22538, 44 upvotes) — hidden bases, `inherits`, `condition`, `include` (schema 4) — while the matrix stays in CI? | presets | all | uncovered [prac] #11, §21 | P2 — design note | CMK-CI | exemplar |
| M-J-06 | Which generator does each leg use (Ninja; Ninja Multi-Config 3/46; Visual Studio 6/46; NMake needs a developer shell), and is `CMAKE_BUILD_TYPE` set on every single-config leg? | presets, tooling | all | uncovered [deps] §9 [ocx] §8 | P1 — per-leg read | CMK-CI | exemplar |
| M-J-07 | Is `compile_commands.json` produced natively (`CMAKE_EXPORT_COMPILE_COMMANDS`, 49 uses; Makefile and Ninja generators only) and surfaced for tooling? | presets | all | partial [bzl-cc] BZL-CC-28 owns it under Bazel; [shape] §8 | P2 — a preset or cache entry sets it | CMK-CI | exemplar |
| M-J-08 | Are compiler launchers (`CMAKE_<LANG>_COMPILER_LAUNCHER`, 11/43) set in exactly one place, not chained by a toolchain file and a preset (`sccache;ccache`)? | presets, providers | all | uncovered [shape] §8 [shift] §row | P2 — `rg -n COMPILER_LAUNCHER` across presets, toolchains and CI | CMK-CI | exemplar |
| M-J-09 | Are workflow presets (`cmake --workflow`, schema 6 / 3.25) worth any row when 0/46 use them? | presets | all | uncovered [shape] §9-10 [shift] §1 | P3 — CONSIDER at most | CMK-CI | exemplar |
| M-J-10 | Does CI run the install-and-consume round trip (M-F-01/02) and the as-subproject smoke build (M-E-06) as jobs? | tooling, install-export | CL, HO | uncovered [deps] §9 | P1 — job names in the workflow | CMK-CI | exemplar |
| M-J-11 | Is `cmake-instrumentation(7)` (4.3) or file-API tooling worth any rule? | tooling | LM | uncovered [canon] §12, §15 | P3 — no | CMK-CI | web |

### K. The Bazel seam and dual builds — 8 rows (`cmake-build/bazel-seam.md`, CMK-BZL)

| ID | question | surface | shapes | coverage | priority | family | evidence |
|---|---|---|---|---|---|---|---|
| M-K-01 | What must a CMake project satisfy to be wrapped by rules_foreign_cc's `cmake()` — no network at configure or build (`block-network` by default), an `install()` producing stable names that match `out_*` attributes, honouring `CMAKE_INSTALL_PREFIX` and a supplied `CMAKE_TOOLCHAIN_FILE`, explicit static/shared, PIC on request (#421), a parallel-safe build (#329), no source-tree symlinks in the install (#1129) — stated as the project's side of BZL-CC-22/23/24, cited, never restated? | bazel-seam | CL, HO | partial [bzl-cc] owns the Bazel side; [lint] §15 [prac] §25 [fleet] §5 | P0 — simulate the wrap without Bazel: `unshare -rn` configure with an external toolchain file, build `-j`, install to a fresh prefix, diff the listing against the declared outputs | CMK-BZL | measure |
| M-K-02 | Which CMake does rules_foreign_cc run at `bazel-contrib__rules_foreign_cc@bb2f3e5d72` (3.19.8–4.0.7, default 3.31.12, at `f68b351c46`), so what floor and features may a wrapped project assume — can a 4.3-only feature (CPS) ever run under the default? | bazel-seam | DB, CL | uncovered [deps] §8 [shift] §16 | P1 — `foreign_cc/repositories.bzl` and `toolchains/private/cmake_versions.bzl` at the new SHA | CMK-BZL | exemplar |
| M-K-03 | What keeps a dual project's two descriptions in step (11/46 are dual; none generates one from the other) — does CI build both (re2 6, benchmark 3, yaml-cpp 2, googletest 1 CI files mention bazel), do exported names map (`absl::strings` vs `@abseil-cpp//absl/strings`), and which have no mechanism at all (conflict 20)? | bazel-seam | DB | uncovered [deps] §8 [pm] #41 [frame] correction 8 | P1 — read each dual repo's CI jobs at the new SHAs | CMK-BZL | exemplar |
| M-K-04 | Do the two dependency graphs drift — a `bazel_dep` version vs the CMake side's FetchContent tag, Conan requirement or vcpkg baseline for the same package (benchmark's googletest `dev_dependency` vs its own FetchContent)? | bazel-seam | DB | uncovered [deps] §8 Gap [shift] §row | P1 — per-pair drift table over the 11 | CMK-BZL | exemplar |
| M-K-05 | Do Conan's `BazelDeps`/`BazelToolchain` work under Bzlmod, when the docs show only `WORKSPACE`/`dependencies.bzl` wiring, 2.30.0 claims Bazel 9 support, and Bazel 9 removed `WORKSPACE` (conflict 19)? | bazel-seam, conan | DB | uncovered [pm] §9 [shift] §6 [frame] correction 1 | P1 — chase-the-surprise; Conan source at 2.32.0 | CMK-BZL | web |
| M-K-06 | Is there any vcpkg-to-Bazel path (none documented), and what does a team with a vcpkg manifest and a Bazel build do? | bazel-seam, vcpkg | DB | uncovered [fleet] §5 [frame] | P2 — negative-evidence row | CMK-BZL | web |
| M-K-07 | Should a first-party C++ repository be CMake plus a manager, or Bazel? | bazel-seam | all | partial [bzl-cc] BZL-CC-24; [frame] companion contract | P3 — decision branch only; comparison sets are never a rule surface | CMK-BZL | web |
| M-K-08 | What does this program hand back to `bazel-quality` — a pointer from BZL-CC's Wrapped Foreign Builds section to CMK-BZL, and the CPS negative (0 hits in rules_foreign_cc and the BCR) so the Bazel program does not re-search? | bazel-seam | all | partial [bzl-cc] [cps-v] Verdict | P2 — decided in the Artifact set decision | CMK-BZL | exemplar |

### L. `cpp-packaging` index — choosing, combining, provisioning, the lock of record — 10 rows (CMK-PKG)

| ID | question | surface | shapes | coverage | priority | family | evidence |
|---|---|---|---|---|---|---|---|
| M-L-01 | Which acquisition strategy fits a new C++ project — system packages, FetchContent, CPM, Conan, vcpkg — and what flips the answer (prebuilt binaries, cross-compiling, a registry of record, an organisation standard)? | any | all | uncovered [prac] #16, Contested [pm] §22 [deps] | P1 — decision table, not a rule; no mandate | CMK-PKG | web |
| M-L-02 | Is there one package manager of record per configure — never vcpkg's and Conan's toolchains together — and how does a project consume a library only the other manager has (overlay port, Conan recipe, FetchContent fallback)? | conan, vcpkg | all | uncovered [pm] #28 [prac] #6 | P0 — `rg -n -e vcpkg.cmake -e conan_toolchain.cmake` both present for one configure in presets or CI = finding | CMK-PKG | web |
| M-L-03 | Is every dependency source covered by a lock of record verified in CI — `conan.lock` with `--lockfile` (0/46 ship one), vcpkg `builtin-baseline` (6/209 manifests) plus registry baselines, CPM/FetchContent SHAs — and does CI fail on drift? | conan, vcpkg, cpm | all | partial — python-packaging PY-PKG-05 owns the principle for Python; [deps] §10 [pm] §7 | P0 — presence check per manager plus the CI flag (`conan install --lockfile=conan.lock`; a manifest baseline present) | CMK-PKG | web |
| M-L-04 | How are build **tools** provisioned — `cmake`, `ninja`, `protoc`, `ccache` — via Conan `tool_requires` (build context), vcpkg `"host": true`, an external hash-verified provisioner, or the runner image, and what do lock, hash, mirror and offline look like for each (conflict 24)? | conan, vcpkg | all | uncovered [pm] #37 [shift] [fleet] §7 | P1 — decision table; portable wording only | CMK-PKG | web |
| M-L-05 | Is the graph ABI-consistent — Conan `compiler.cppstd`/`compiler.runtime` vs the project's `cxx_std`/`MSVC_RUNTIME_LIBRARY`; the vcpkg triplet's CRT and linkage (`x64-windows` vs `-static`, vcpkg#12357) vs the project — and is a mismatch caught at configure or only at link? | conan, vcpkg, targets | CL | uncovered [prac] #7, #8, #30 [deps] Contradictions (no evidence either way) | P1 — the dives decide whether a checkable rule exists | CMK-PKG | web |
| M-L-06 | Are manager caches keyed so CI cannot restore a stale or foreign binary (Conan `package_id`, the vcpkg ABI hash with compiler identity, `VCPKG_DISABLE_COMPILER_TRACKING`), and cached at all (0 corpus `actions/cache` keyed on `vcpkg.json` or `conan.lock`)? | conan, vcpkg, tooling | all | uncovered [pm] §15 [shift] §row [deps] §9 | P2 — design note | CMK-PKG | web |
| M-L-07 | Which supply-chain gates exist — `conan audit` (2.14, experimental; CVE info 2.32), vcpkg SBOM (SPDX-PURL, registry 2026.07.29), CMake `install(SBOM)` (experimental) — and may a rule require any? | conan, vcpkg | all | uncovered [pm] §8 [shift] §6, §9 [prac] §23 (liblzma) | P2 — none is stable enough for MUST | CMK-PKG | web |
| M-L-08 | Which adoption numbers may shipped text cite — ISO C++ 2024 (Conan 19.34 %, vcpkg 19.10 %, CMake 83 %) — and never JetBrains' C-only 2025 survey as C++ evidence (conflict 7)? | any | all | uncovered [prac] §16-18 [shift] Summary | P3 — citation hygiene | CMK-PKG | web |
| M-L-09 | The comparison set — Meson wrapdb, build2, xmake/xrepo (`xrepo-cmake`), pixi/conda-forge, Spack, Nix: which integration model each uses with CMake (mostly `CMAKE_PREFIX_PATH` injection), so no rule keyed to generated Config files misfires on them. | any | all | uncovered [pm] §21-22 | P3 — comparison row, never a rule surface | CMK-PKG | web |
| M-L-10 | Distro recipes — Homebrew's `std_cmake_args` still passes deprecated `-Wno-dev`; conda-forge's `${CMAKE_ARGS}` must stay unquoted; Debian `CMAKE_BUILD_TYPE=None` unconfirmed — in scope? | any | all | uncovered [lint] §13, Contested | P3 — out of scope beyond M-F-05/M-F-02 | CMK-PKG | web |

### M. Conan 2 — 12 rows (`cpp-packaging/conan.md`, CMK-CONAN)

| ID | question | surface | shapes | coverage | priority | family | evidence |
|---|---|---|---|---|---|---|---|
| M-M-01 | Which CMake generator does a consumer use at Conan 2.32 — `CMakeToolchain` + `CMakeDeps`, or `CMakeConfigDeps` (incubating 2.13.0 → experimental 2.25.0; Conan's pages disagree at 2.32; cmake-conan recommends it; never emits `Find*.cmake`, so `find_package(... MODULE)` consumers break)? | conan | all | uncovered [pm] §3, #3, #42 [shift] §6 [cps-v] row 43 | P0 — `rg -n -e CMakeConfigDeps -e 'cmakedeps:new'` plus any `find_package(<conan dep> MODULE)` = finding (conflict 21) | CMK-CONAN | web |
| M-M-02 | Explicit `conan install` before `cmake` (Conan's "preferred … for most cases"), or the cmake-conan provider (not 1.0; auto-detects only the MSVC/gcc/clang trio; single-config needs `CMAKE_BUILD_TYPE`; early `find_*` calls missed)? | conan, providers | all | uncovered [pm] §4 [shift] §7 | P1 — decision row whose limitations are its checks | CMK-CONAN | web |
| M-M-03 | Is `build_requires` (deprecated ~2.28) or a host `requires` used where `tool_requires` in the build context belongs, and are both profiles (`-pr:b`/`-pr:h`) set for cross builds? | conan | all | uncovered [shift] §6 [pm] §6 | P1 — `rg -n build_requires -g 'conanfile.*'` hit = finding | CMK-CONAN | web |
| M-M-04 | Is `conan.lock` used deliberately — implicit pickup from the working directory, recipe and package revisions, `--lockfile-partial`/`--lockfile-out`/`--lockfile-clean` — and are version ranges in `requires` (17/42 in the CCI sample; `abseil/[*]`) paired with a lock? | conan | all | uncovered [pm] §7, #11 [deps] §4 | P0 — a range in `conanfile.*` without a committed `conan.lock` and a CI `--lockfile` = finding | CMK-CONAN | web |
| M-M-05 | Does the profile's `compiler.cppstd`/`build_type`/`[conf]` agree with the project's CMake settings, and how are profiles shared when they have no fixed file name (the glob cannot see them)? | conan | all | uncovered [pm] §6 [prac] #7 | P1 — cross-check a profile against the preset | CMK-CONAN | web |
| M-M-06 | For a recipe you publish: `layout()` (40/40) + `cmake_layout`, `package_info()` via `set_property("cmake_target_name"/"cmake_file_name")` not Conan-1 `names`, `rmdir(lib/cmake)` so the generator is the only config, `package_id()` without compiler settings for header-only, `validate()`/`compatibility()`, `implements = ["auto_shared_fpic"]`, a `test_package` — with no automated recipe linter since `conan-io/hooks` was archived (2026-03-24)? | conan | PM, CL | uncovered [pm] §10 [lint] §10 [deps] §4 | P1 — CCI template diff at the new SHA | CMK-CONAN | exemplar |
| M-M-07 | Does Conan-1 residue survive — `from conans import ConanFile` (1/11 non-CCI), Conan-1 remotes (CCI froze Conan-1 publishing 2024-11-04), `cpp_info.names`? | conan | all | uncovered [shift] §8 [lint] §10 [deps] §4 | P0 — `rg -n -e 'from conans import' -e 'cpp_info.names' -g conanfile.py` hit = finding | CMK-CONAN | web |
| M-M-08 | Do the presets `CMakeToolchain` writes (`CMakePresets.json` schema 3, `CMakeUserPresets.json` schema 4, skipped if a non-Conan one exists) collide with the project's own? | conan, presets | all | uncovered [pm] §2 | P1 — docs and source; no Conan on this host | CMK-CONAN | web |
| M-M-09 | Which CPS paths does Conan offer — the `CMakeConfigDeps` round trip (2.25.0), the undocumented `-g CPSDeps` (source only at 2.32.0), `CPS.load(...).to_conan()` (import path `conan.cps`)? | conan, cps | all | uncovered [cps-v] rows 41-45 | P2 — cite source, never a docs URL that does not exist | CMK-CONAN | exemplar |
| M-M-10 | Are Conan workspaces (`conanws.yml`/`conanws.py`) treated as GA (2.31.0, 2026-07-23), not incubating (conflict 22)? | conan | LM | uncovered [shift] §6 [pm] §8 | P2 | CMK-CONAN | web |
| M-M-11 | Which command answers "why this binary or version" — `conan graph explain`, `conan graph info`, `conan list --graph`? | conan | all | uncovered [pm] §8 | P1 — feeds the triage skill | CMK-CONAN | web |
| M-M-12 | Does `[replace_requires]`/`[platform_requires]` (experimental) satisfy "use the system copy instead of Conan's" (conan#1330)? | conan | all | uncovered [pm] §6 [prac] §22 | P2 | CMK-CONAN | exemplar |

### N. vcpkg — 9 rows (`cpp-packaging/vcpkg.md`, CMK-VCPKG)

| ID | question | surface | shapes | coverage | priority | family | evidence |
|---|---|---|---|---|---|---|---|
| M-N-01 | Is a manifest reproducible — `builtin-baseline` or a `default-registry` baseline SHA present (6/209 manifests set `builtin-baseline`), `overrides` only in the top-level manifest (transitive overrides are ignored), `version>=` where a floor matters — and which command moves them (`vcpkg x-update-baseline` for consumers, `x-add-version` for port authors)? | vcpkg | all | uncovered [pm] §12-13, #12, #45 [deps] §5 | P0 — `jq 'has("builtin-baseline")' vcpkg.json` false with no configuration baseline = finding | CMK-VCPKG | web |
| M-N-02 | Is the vcpkg toolchain wired through a preset (`toolchainFile` / `CMAKE_TOOLCHAIN_FILE`) with every `VCPKG_*` set before `project()`, and is `VCPKG_MANIFEST_MODE` (auto-on beside `vcpkg.json`) understood? | vcpkg, presets | all | uncovered [pm] §11 [deps] §5 (11 files wire it) | P1 — ordering is M-H-02 | CMK-VCPKG | web |
| M-N-03 | Do triplets match the project — target vs host, static vs dynamic, CRT linkage — and do custom triplets register extra inputs in `VCPKG_HASH_ADDITIONAL_FILES` and avoid `VCPKG_DISABLE_COMPILER_TRACKING`? | vcpkg | all | uncovered [pm] §14, #15-16 [prac] #8 | P1 | CMK-VCPKG | web |
| M-N-04 | Does any CI still use `x-gha` (removed) or rely on an `x-`-prefixed binary-cache provider ("will change or be removed without warning") without saying so, or fall back to the local `files` default after a typo? | vcpkg, tooling | all | uncovered [pm] §15, #13-14, #43 [shift] §10 | P0 — `rg -n x-gha .github` hit = finding | CMK-VCPKG | web |
| M-N-05 | Does an offline CI set `X_VCPKG_ASSET_SOURCES` with `x-block-origin`, so a cache miss cannot fall through to the upstream URL? | vcpkg | all | uncovered [pm] §16, #30 | P1 | CMK-VCPKG | web |
| M-N-06 | Does anything still reference vcpkg-artifacts/`vcpkg-ce` (removal announced for after 2026-07-01)? | vcpkg | all | uncovered [shift] §9 | P1 — `rg -n -e vcpkg-artifacts -e vcpkg-ce` hit = finding | CMK-VCPKG | web |
| M-N-07 | For a port you author (the maintainer guide lives in `MicrosoftDocs/vcpkg-docs`): no deprecated helpers (`vcpkg_configure_cmake`, `vcpkg_fixup_cmake_targets`, …), lower-case `SHA512` (40/40 sampled), no vendored dependencies, `unofficial-<port>` configs, `vcpkg_cmake_config_fixup`, one linkage, no `CMAKE_WINDOWS_EXPORT_ALL_SYMBOLS`, no file conflicts, a `usage` file, script-mode assumptions? | vcpkg | PM | uncovered [pm] §17 [lint] §9 [deps] §5 | P1 — `rg -n -e vcpkg_configure_cmake -e vcpkg_fixup_cmake_targets portfile.cmake` hit = finding | CMK-VCPKG | exemplar |
| M-N-08 | Does a library's own `vcpkg.json` use `features`/`default-features`/`supports` platform expressions correctly and a valid SPDX `license`? | vcpkg | CL | uncovered [pm] §12 [shift] §11 | P2 | CMK-VCPKG | web |
| M-N-09 | Is `VCPKG_PREFER_SYSTEM_LIBS` (deprecated in favour of empty overlay ports) still used? | vcpkg | all | uncovered [pm] §11, #36 | P3 | CMK-VCPKG | exemplar |

## Artifact set decision

Decisions, not options. Each names the assumption it rests on.

### The rules and their glob lists

Two rules, each with a support directory. Every glob is measured against
rule-distillation's bar — *narrow the glob only when it cannot miss* — using
the corpus counts in [host] H7 and [shape].

```yaml
# rules/cmake-build.md
paths:
  - "**/CMakeLists.txt"
  - "**/*.cmake"
  - "**/*.cmake.in"
  - "**/CMakeLists.txt.in"
  - "**/CMakePresets.json"
  - "**/CMakeUserPresets.json"
  - "**/*.pc.in"
  - "**/.gersemirc"
  - "**/.cmake-format*"

# rules/cpp-packaging.md
paths:
  - "**/conanfile.py"
  - "**/conanfile.txt"
  - "**/conandata.yml"
  - "**/conan.lock"
  - "**/conanws.yml"
  - "**/conanws.py"
  - "**/vcpkg.json"
  - "**/vcpkg-configuration.json"
  - "**/portfile.cmake"
```

Which names the tools **require**, and therefore cannot miss:

- **`**/CMakeLists.txt`, `**/*.cmake`** — CMake's own contract: `add_subdirectory`
  requires the first name, `include()`/`find_package` resolve the extension.
  `*.cmake` subsumes Find modules, `*Config.cmake`, toolchain files,
  `CTestConfig.cmake`, `CPM.cmake`, `HunterGate.cmake`, `conan_provider.cmake`,
  vcpkg triplets and `vcpkg-port-config.cmake`, so none is listed separately.
  Generated `*.cmake` under build trees also match; nobody edits them, and the
  load is harmless.
- **`**/CMakePresets.json`, `**/CMakeUserPresets.json`** — the only two names
  `--preset` reads. The user file is gitignored in 4/5 preset repos and tracked
  in 1 corpus file, and Conan's `CMakeToolchain` writes one ([pm] §2); an agent
  opening it is exactly when M-J-03 must fire.
- **`**/*.cmake.in`, `**/CMakeLists.txt.in`, `**/*.pc.in`** — not required by
  CMake (`configure_file` takes any name) but the convention is overwhelming:
  542 `*.cmake.in` files in 26 repos, 60 `CMakeLists.txt.in` in 6, 79 `*.pc.in`
  in 22 ([host] H7). This *widens* rather than narrows, and the files it catches
  — `*Config.cmake.in`, `.pc.in` — are the most load-bearing install files in a
  project (M-F-01..03, M-F-14). **Residual miss, named:** a Config template with
  an unconventional suffix (`FooConfig.in`); covered by routing, because it is
  wired from a `CMakeLists.txt` that always loads the index.
- **`**/.gersemirc`** — gersemi's discovery name. 0 corpus files; in for the
  same reason `bazel-quality` keeps `WORKSPACE`: a glob that never matches costs
  nothing and a glob that matches once catches the moment that matters. Wave-2
  dive `module-authoring/module-testing-and-formatting` confirms whether gersemi
  reads any other config name.
- **`**/.cmake-format*`** — 8 files in 7 repos. **Encountering it is the
  finding** (M-A-04): the tool has not released since 2020, and the index's
  first line for that file is "recognise and migrate, never extend". `cmake-format.*`
  without the dot is dropped: 0 files.
- **`**/conanfile.py`, `**/conanfile.txt`, `**/conandata.yml`** — Conan's
  default recipe and data names; `conan install .`/`conan create .` look for
  exactly these (4,086 / 11 / 1,997 corpus files, almost all in CCI).
  `conanfile.py` also loads `python-quality` (`**/*.py`); accepted, bounded
  (conflict 13).
- **`**/conan.lock`** — the name `conan install` picks up *implicitly* from the
  working directory ([pm] §7). 0 corpus files; that is the argument for it, as
  with Gradle's lockfile globs in the JVM set: the one moment someone opens a
  lockfile is the moment the intuitive hand-edit destroys it (M-M-04).
- **`**/conanws.yml`, `**/conanws.py`** — the workspace names, GA since 2.31.0
  (M-M-10). 0 corpus files; same argument.
- **`**/vcpkg.json`, `**/vcpkg-configuration.json`** — vcpkg's required
  manifest names (3,248 and 8 corpus files, almost all ports and fixtures).
- **`**/portfile.cmake`** — required by vcpkg for a port (3,230 files in the two
  vcpkg repos). It already matches `cmake-build` through `*.cmake`; it is named
  on `cpp-packaging` on purpose so a port author also gets the vcpkg rows — the
  bounded, intentional double-load of conflict 13.

Deliberately **out**, each with its reason:

- **Conan profiles** — **no fixed name**. Profiles live in
  `<CONAN_HOME>/profiles/<any-name>` or at any path passed to `-pr`; a repo
  convention such as `profiles/linux-gcc` is a guess, and `**/profiles/**` would
  load on unrelated trees. `global.conf` and `settings_user.yml` are also out:
  generic enough to misfire outside Conan. **Residual miss, named:** editing a
  profile loads no rule. Covered by routing: the cpp-packaging index (loaded by
  any `conanfile.*`) says "writing or changing a Conan profile → `conan.md`".
- **vcpkg `usage` files** — 546 corpus files, but `**/usage` would match
  unrelated files everywhere; a port's `usage` sits beside its
  `portfile.cmake`, which already loads both rules.
- **`**/*.cps`** — generated by CMake or Conan into build and install trees, not
  hand-edited ([cps-e] §13); and the extension collides with CNC and emulator
  sources on GitHub ([cps-e] §13). 94 corpus files, all Kitware tests.
- **`CMakeCache.txt`, `compile_commands.json`, `CMakeConfigureLog.yaml`** —
  generated; the frame already excluded them.
- **`**/BUILD.bazel`, `**/*.bzl`, `**/MODULE.bazel`** — owned by
  `bazel-quality`; two rules on one glob double-load a whole foreign index.
- **`.github/workflows/*.yml`** — owned by no language set; CI rows load
  through the CMake index when CMake files are edited.

### Rule names

**`cmake-build`** and **`cpp-packaging`** (conflict 14). Assumption: the house
naming convention is `<tool>-build` for build systems and `<lang>-packaging`
for manifest rules, and a future C++-language set would be `cpp-quality`.

### Depth files, one line each, routed by task

Twelve depth files across two support directories, one ID family per file.
Every line is the routing table's left column — the task, never the topic.

**`rules/cmake-build/`** — index family `CMK-CORE` (the gate, the
non-negotiables, the silent-pass paragraph, routing)

| File | Family | Doing this → read this |
|---|---|---|
| `versions-and-policies.md` | `CMK-VER` | Choosing or raising `cmake_minimum_required`, setting a policy, touching a `CMAKE_EXPERIMENTAL_*` variable, or making an old dependency configure on CMake 4 |
| `language.md` | `CMK-LANG` | Writing any function, macro, `if()`, loop, cache variable or option; returning a value from a function; chasing "my `-D` did not take" |
| `module-authoring.md` | `CMK-MOD` | Writing a `.cmake` file other projects include: a Find module, a helper module, anything that downloads, runs a process at configure time, or ships copy-and-own |
| `targets.md` | `CMK-TGT` | Adding or changing a library or executable, linking anything, setting a flag, a language standard, visibility, PIC, or shared/static |
| `install-and-export.md` | `CMK-INST` | Making the project installable or consumable: install rules, the Config package, CPS, pkg-config, RPATH, the package version file |
| `dependencies.md` | `CMK-DEP` | Adding, pinning or replacing a dependency — `find_package`, FetchContent, CPM, Hunter, vendoring — or finding out which copy was used |
| `toolchains-and-providers.md` | `CMK-TC` | Wiring a toolchain file, a package manager's toolchain, `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` or a dependency provider; cross-compiling |
| `testing.md` | `CMK-TEST` | Adding tests, gating the test tree, running CTest in CI, or testing a CMake module itself |
| `presets-and-ci.md` | `CMK-CI` | Editing `CMakePresets.json`, standing up or changing a pipeline that runs CMake, or pinning the CMake a pipeline uses |
| `bazel-seam.md` | `CMK-BZL` | Making the project wrappable by `rules_foreign_cc`, or keeping a CMake build and a Bazel build of the same code in step |

**`rules/cpp-packaging/`** — index family `CMK-PKG` (the decision table,
one manager of record, the lock of record, tool provisioning, ABI consistency)

| File | Family | Doing this → read this |
|---|---|---|
| `conan.md` | `CMK-CONAN` | Editing a `conanfile`, a Conan profile or `conan.lock`; wiring Conan into CMake; publishing a recipe |
| `vcpkg.md` | `CMK-VCPKG` | Editing `vcpkg.json` or `vcpkg-configuration.json`, a triplet or a `portfile.cmake`; wiring vcpkg into CMake; caching its binaries in CI |

Deliberately **not** depth files: no `cps.md` — CPS is a seam topic, as the
verifier said ([cps-v] Verdict), so export rows sit in `install-and-export.md`
and import rows in `dependencies.md`, both seam files, never in `language.md`;
no `cpm.md` or `hunter.md` (sections of `dependencies.md`, conflicts 8-9); no
`cross-compiling.md` (a section of `toolchains-and-providers.md`); no
`modules.md` (a gated section of `targets.md`, M-E-13); no `cpack.md` (two rows
in `install-and-export.md`); no `migration.md` (that is the `cmake-modernize`
skill).

### ID-family allocation

`CMK-` is free: zero hits in `rules/` (re-checked for this map against the
catalog's in-use prefixes `BZL-*`, `CSS-*`, `DATA-*`, `DOC-*`, `GRADLE-*`,
`JAVA-*`, `KT-*`, `MVN-*`, `PY-*`, `TS-*`) and in the Bazel map. One prefix
spans both rules, as `TS-` spans `typescript-quality` and
`typescript-packaging` and `PY-` spans `python-quality` and `python-packaging`.
Fourteen families: `CMK-CORE`, `CMK-VER`, `CMK-LANG`, `CMK-MOD`, `CMK-TGT`,
`CMK-INST`, `CMK-DEP`, `CMK-TC`, `CMK-TEST`, `CMK-CI`, `CMK-BZL` (cmake-build);
`CMK-PKG`, `CMK-CONAN`, `CMK-VCPKG` (cpp-packaging). No artefact this program
publishes ever emits a `BZL-` ID; it cites them.

### The CMake side of the Bazel seam

**What ships:** `rules/cmake-build/bazel-seam.md` (`CMK-BZL`). It carries the
wrapped project's side of the contract — no configure or build network,
complete and name-stable `install()`, honouring a supplied toolchain file,
PIC and linkage on request, relocatable exports, the CMake version the wrapper
actually runs — plus dual-build sync, dependency-graph drift, and a dated
statement on Conan's Bazel generators under Bzlmod. Every Bazel-side fact is
cited by ID (`BZL-CC-22`, `-23`, `-24`, `-28`) and never restated; this matches
the companion contract in [frame] and the Bazel set's own boundary in
[bzl-cc] ("does not own … cited by ID once and never restated").

**What is offered back to `bazel-quality`:** two things, as a proposed patch its
owner applies, never an edit by this program. (1) One pointer line at the top
of [bzl-cc]'s *Wrapped Foreign Builds* section: "the wrapped project's side of
this contract is `CMK-BZL` in `cmake-build/bazel-seam.md`". (2) The CPS
negative: zero CPS hits in rules_foreign_cc and the BCR ([cps-v] row 51,
re-checked at `bb2f3e5d72` by dive `bazel-seam/wrappable-cmake-contract`), so
the Bazel program never re-runs that search. No `BZL-CC` row is authored,
renumbered or reworded here. Assumption: the Bazel set's owner accepts a
one-line cross-reference, as the house `Siblings` sections already do.

### Skills (two)

- **`cmake-dependency-triage`** — "which copy, which version, which mechanism
  resolved this dependency, and why not the one I expected": symptom → first
  command → how to read it → the rule that fixes it, across `find_package`
  modes, FetchContent redirects, providers, toolchain-injected paths, the Conan
  graph and vcpkg traces. House precedent: `jvm-dependency-triage`,
  `bazel-diagnose`. Built from `CMK-DEP`, `CMK-TC`, `CMK-CONAN`, `CMK-VCPKG`
  and wave-3 dive `skills/dependency-triage-procedure`.
- **`cmake-modernize`** — a legacy tree to target-based **and consumable**, in
  order: inventory, floor, targets, link keywords, flags and standards to
  targets or presets, top-level gating, install/export with a consumer round
  trip, as-subproject smoke, the configure gate and gersemi in CI, optional CPS
  and pkg-config. House precedent: `bazel-adopt` (once per repository). Built
  from `CMK-TGT`, `CMK-INST`, `CMK-VER` and wave-3 dive `skills/modernize-procedure`.

Both repeat the handful of MUST rows they depend on (bounded duplication, per
rule-distillation's review-skill hedge); neither carries depth. The third
candidate, "make my project consumable", is not a skill (conflict 15).

### Bundle

**`cmake-essentials`** — members `cmake-build`, `cpp-packaging`,
`cmake-dependency-triage`, `cmake-modernize`, **untagged** (bundles never pin).
Not `cpp-essentials`: that name belongs to a future C++-language set.

### Explicitly not in scope

- **C++ the language** — idioms, concurrency, memory safety, API design. A
  future `cpp-quality` owns it; this set covers the build description and the
  dependency graph only (program context).
- **Meson, build2, xmake, Premake, SCons, Autotools as build systems** — one
  comparison row each in M-L-09; the rules cannot load on their files and would
  only describe them.
- **IDE integration beyond `compile_commands.json`** — file API, CLion, VS
  Code, Visual Studio project generation: tooling surface, no correctness rule
  (M-J-11, M-J-07).
- **Android NDK and iOS/tvOS/visionOS/watchOS toolchains** — `cmake-toolchains(7)`
  documents them as separate per-platform recipes with signing and simulator
  sub-cases ([canon] §5); there is no single rule, no consumer, and no host to
  measure them. Generic cross-compiling (sysroot, find-root modes, host tools)
  stays in (M-H-05..07).
- **CUDA, Fortran, Swift, Rust language support in CMake** — out of the C/C++
  build-description scope; Rust is an experimental gate anyway ([canon] §20).
- **Qt's QTP policies and AUTOMOC, CDash dashboards, OSS-Fuzz integration,
  distro recipe authoring** (Debian `rules`, RPM specs, Homebrew formulas,
  conda recipes) — narrow audiences with their own maintainers' docs; the
  install rows (GNUInstallDirs, relocation) are what a distro needs from a
  project (M-L-10).
- **SBOM mandates** — CMake's `install(SBOM)` is experimental; one dated
  CONSIDER note at most (M-F-19).
- **Windows-specific behaviour beyond documented rows** — no Windows host; rows
  M-F-08 and M-E-12 are read-only-grounded and say so.

## Selected for wave 2

Six groups, fourteen dives, three of them `measure`. Chosen in the phase-3
order: uncovered first (every row is — conflict-free fact of this corpus),
then leverage for the two audiences, then "where agents demonstrably get it
wrong" (the 4.0 floor, the 4.4 diagnostics rewrite, 4.3 CPS, retired
experimental gates, removed vcpkg providers, the neutral-seam overclaim), then
"a rule could check this". The requester named CMake, the package-manager
ecosystem and interoperability including Bazel; the owner added CPS. Wave 2
opens every one of them: CMake (groups 1, 3, 4), the dependency seam and CPS
(group 2 — CPS already dived, its consolidation folds the three CPS files in),
Conan 2 and vcpkg (group 5; Hunter and cpp-pm get their single row inside
group 2's pinning dive, which is all the evidence supports), and the Bazel
seam (group 6). Cross-cutting decisions come first: the gate and the floor
(group 1) are cited by every other group.

**Measure budget.** The three `measure` dives each run a matrix of 20-line
scratch projects on the host's real binaries: dive 1 settles the gate,
presets rejection, floors, cache, policy scope and argument semantics; dive 3
settles dependency resolution order, providers and `CMAKE_POLICY_VERSION_MINIMUM`
scope; dive 6 settles install, relocation, CPS round trips and a Bazel-free
simulation of the rules_foreign_cc contract. Every contested claim the program
context listed as measurable is assigned to one of the three.

**Chase-the-surprise items named in the briefs**, each unanticipated by the
frame and load-bearing:

- find_ocx's headline "defect" contradicted by the `set()` manual on both
  binaries (dive 1, experiment 6).
- `TLS_VERIFY` defaulting ON only since 3.31, so a 3.19-floor module is
  unverified on nine minors of its own range (dive 9).
- 4.4.2 shipping seven diagnostic categories where a scout counted nine, and
  whether it still honours `-Werror=dev` (dive 1).
- yaml-cpp's two-dot `3.15..4.3` floor in a flagship library (dive 1).
- CPM silently setting four policies NEW on load (dive 4).
- A Find module that fetches on a miss (dives 3 and 9).
- CPS export writing version schemas the same binary cannot compare (dive 6).
- rules_foreign_cc's default bundled CMake predating the floor a modern project
  declares (dive 13).
- Conan's `BazelDeps` claiming Bazel 9 support while documenting only
  `WORKSPACE`, which Bazel 9 removed (dive 14).
- Conan's two documentation pages disagreeing about `CMakeConfigDeps` (dive 11).

### 1. `versions-and-gate` — Versions, floors and the configure gate

**Dive `gate-and-language-semantics`** · family `CMK-CORE` · kind `measure` · label "The configure gate and CMake-language semantics, measured on 3.31.12, 4.3.4 and 4.4.2"

```
Settle by running real binaries, not by reading docs, the gate and language claims every later CMK rule leans on. Binaries: `ocx package exec kitware/cmake:<3.31|4.3|4.4> -- cmake` (host has 3.31.12, 4.3.4, 4.4.2; record `cmake --version`). Scratch root /home/mherwig/.cache/cmake-measure-scratch/gate-and-language/ (never /tmp). Use `project(x LANGUAGES NONE)` unless a compiler is unavoidable (gcc 15.2 for C). No network.
Run every experiment on all three binaries; tabulate exit code and the first diagnostic line.
 1. Gate spelling (M-A-01): a project emitting message(AUTHOR_WARNING), configured with -Werror=dev, -Werror=author, both; does 4.4.2 accept -Werror=dev and does it emit its own deprecation diagnostic? Same for -Werror=deprecated with message(DEPRECATION).
 2. Categories (M-A-02, M-F-06): confirm the seven categories in `cmake --help-manual cmake-diagnostics` on 4.4.2; find the CLI spelling that promotes CMD_UNINITIALIZED and CMD_INSTALL_ABSOLUTE_DESTINATION to error and trigger each with a three-line project.
 3. Presets (M-J-01): one CMakePresets.json at schema 12 with warnings.author, at schema 11 with warnings.dev, and at schema 12 carrying dev: which binary rejects which, with what message.
 4. Floors (M-B-04, M-B-06): cmake_minimum_required(VERSION 3.4), (VERSION 3.5), (VERSION 3.15...4.3) and the literal two-dot line from jbeder__yaml-cpp@e5fe9f2cdd:CMakeLists.txt:1 (VERSION 3.15..4.3); report the effective policy version with cmake_policy(GET) on CMP0126 and CMP0140.
 5. Cache (M-C-01, M-C-02): set(X a CACHE STRING d), reconfigure with the source changed to b, no FORCE; the same with CACHE INTERNAL (the set() manual says INTERNAL implies FORCE: prove or refute by behaviour); CMP0126 OLD vs NEW with a same-named normal variable; precedence among -D, preset cacheVariables, option() and set().
 6. Copy __ocx_set_result, __ocx_memo_store and __ocx_memo_hit verbatim from /home/mherwig/dev/find_ocx/ocx.cmake:609-636 under cmake_policy(VERSION 3.19); configure three times, changing the fingerprint on run 2; is run 3 a memo hit? This decides whether the audit's top-ranked defect exists.
 7. Policy capture (M-D-01): a module with cmake_policy(PUSH)/VERSION 3.19/POP defining f1 inside and f2 after POP, included from a project at VERSION 3.31; show which policy each body sees (CMP0124 or CMP0140 as the observable).
 8. Returns (M-C-05): PARENT_SCOPE through a nested helper, return(PROPAGATE), block(SCOPE_FOR VARIABLES).
 9. Arguments (M-C-06): cmake_parse_arguments in ARGN form vs PARSE_ARGV with an empty value and a value containing a semicolon; CMP0174 on 3.31+.
10. Downloads and guards (M-D-05, M-D-02): file(DOWNLOAD file:///nonexistent ...) with and without STATUS: does configure continue? Two copies of a module with include_guard(GLOBAL) and different version variables included from two subdirectories: which wins, is anything reported?
DECIDE: the exact two-line gate the cmake-build index prints for 3.x/4.3 and 4.4; whether find_ocx's memo defect is real, with the run log; the presets-version rule's wording; which behaviours differ across the three binaries (each such row carries a version gate). Chase the surprise: 4.4.2 treating -Werror=dev differently from 4.3.4.
```

**Dive `floors-policies-and-era`** · family `CMK-VER` · kind `web` · label "Floors, policy decisions and experimental gates as of 2026-09-26"

```
Produce the version tables versions-and-policies.md will cite, dated 2026-09-26, and decide the assumed floor.
If .agents/research/cmake-topic-map/era-recheck-2026-09-26.md exists, read it first and reuse its version facts instead of re-deriving them.
Fetch primary only: cmake.org/cmake/help/latest/manual/cmake-policies.7.html; gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/dev/experimental.rst and the same file at v4.3.4 and v3.31.12 (tags, never master); Help/release/3.24.rst through 4.4.rst; the GitLab tags API for the newest 4.4.x and 4.3.x patch; repology.org/project/cmake/versions and the distro package pages for Debian 12 and 13, Ubuntu 22.04 and 24.04, RHEL/Alma 9 and 10, Alpine 3.22, Homebrew, plus the CMake preinstalled on GitHub Actions ubuntu-24.04, windows-2025 and macos-15 images; PyPI JSON for cmake-format (last 0.6.13, 2020-08-19) and gersemi.
Pin down: (a) the CMake each platform above ships; (b) for a 3.25 floor, the live policy list (introduced after 3.25) with Kitware's one-line title and a keep-NEW or decide verdict per policy, and the diff for a 3.19 floor (find_ocx); (c) a versionadded table: string(JSON) 3.19, PROJECT_IS_TOP_LEVEL 3.21, FILE_SET 3.23, providers, FIND_PACKAGE_ARGS, OVERRIDE_FIND_PACKAGE and CMAKE_COMPILE_WARNING_AS_ERROR 3.24, block(), return(PROPAGATE), FetchContent SYSTEM and presets v6 3.25, CXX_MODULES 3.28, ungated install(PACKAGE_INFO) 4.3; (d) every CMAKE_EXPERIMENTAL_* gate and UUID at v4.3.4 and v4.4.2 (retired at 4.3.0: EXPORT_PACKAGE_INFO, FIND_CPS_PACKAGES); (e) removed Find modules and their policies (CMP0167, 0146, 0148, 0191, 0188) and their replacements; (f) removed Visual Studio generators; (g) whether any maintained semantic CMake linter exists in 2026 (name what you searched).
Test against the corpus at /home/mherwig/.cache/research-lang/exemplars/cmake (re-fetched 2026-09-26; cite repo@newsha:path:line): re-run .agents/research/cmake-audit/scratch/shape-versionfloor.sh and report every root floor that moved since the 2026-09-05 SHAs, and every CMAKE_EXPERIMENTAL_ use outside Kitware__CMake.
Answer M-B-01, M-B-03, M-B-07, M-B-08, M-B-10, M-B-11, M-A-05, M-G-16.
DECIDE: the floor the rule set assumes (the map's provisional answer is 3.25: confirm, lower to 3.24, or raise to 3.28, with the distro table as the reason); the one-sentence gate syntax every version-bound rule uses; whether any row may name cmake-lint; the policy table the depth file ships. Chase the surprise: a mainstream LTS distro or CI image still shipping below the chosen floor.
```

### 2. `dependency-seam` — The dependency seam: find_package, FetchContent, providers, toolchains and CPS

Existing group: the three CPS files stay, and the consolidation
`cmake-dependency-seam.md` folds them in beside the three dives below.

**Dive `resolution-order-and-providers`** · family `CMK-DEP` · kind `measure` · label "Who wins a dependency: FetchContent, find_package, hints and providers, measured"

```
Measure how CMake resolves one dependency name when several mechanisms can supply it, on 3.31.12 and 4.4.2 (4.3.4 where behaviour differs), via `ocx package exec kitware/cmake:<v> -- cmake`. Scratch root /home/mherwig/.cache/cmake-measure-scratch/resolution-order/. Build a tiny C library dep (gcc 15.2) with an install(EXPORT) Config package; install two copies to two prefixes with distinguishable versions; make a local git repo of its source for FetchContent over file://. No network.
Each experiment is a results row: binary, setup, which copy won, the evidence line from --debug-find-pkg=dep and CMakeFiles/CMakeConfigureLog.yaml.
 1. (M-G-01, M-G-02) FetchContent_Declare with FIND_PACKAGE_ARGS; with OVERRIDE_FIND_PACKAGE; with both (error?); FETCHCONTENT_TRY_FIND_PACKAGE_MODE NEVER, OPT_IN, ALWAYS; FETCHCONTENT_SOURCE_DIR_DEP; then a later plain find_package(dep) — record the contents of CMAKE_FIND_PACKAGE_REDIRECTS_DIR each time.
 2. (M-G-09, M-D-12) dep_ROOT vs DEP_ROOT (CMP0144) vs dep_DIR vs CMAKE_PREFIX_PATH as variable and as environment; which sticks in the cache after the hint is removed and you reconfigure.
 3. (M-H-03, M-H-04) a dependency provider from a CMAKE_PROJECT_TOP_LEVEL_INCLUDES file that logs every call; two top-level include files both calling SET_DEPENDENCY_PROVIDER; SET_DEPENDENCY_PROVIDER from the project's own CMakeLists; find_library before the first find_package. Record errors verbatim.
 4. (M-H-02) CMAKE_PROJECT_TOP_LEVEL_INCLUDES and a toolchain-read variable set after project(): silent or diagnosed?
 5. (M-B-05) a fetched dependency declaring cmake_minimum_required(VERSION 3.4): the 4.4.2 error; then CMAKE_POLICY_VERSION_MINIMUM=3.5 set (a) as a normal variable saved and restored around FetchContent_MakeAvailable as apache__arrow@e0cf4184dd:cpp/cmake_modules/FindRapidJSONAlt.cmake:29-32 does, (b) globally, (c) in the environment; does the parent's own policy version change in any case?
 6. (M-G-11) the fetched dependency declares option(DEP_TESTS ON) under a 3.12 floor after the parent set(DEP_TESTS OFF); then again with CMAKE_POLICY_DEFAULT_CMP0077 NEW.
 7. (M-E-06, M-I-01) the parent FetchContents a project that calls include(CTest) and add_subdirectory(tests) with and without a PROJECT_IS_TOP_LEVEL guard; count tests from the parent's ctest -N.
Test against (note their new SHAs in the corpus): protocolbuffers__protobuf@e816e3cbab:cmake/abseil-cpp.cmake:16-43 (try-find-then-fetch) and ccache__ccache@e256302fa6:cmake/FindZstd.cmake:49 (fetch on miss).
DECIDE: the one resolution-order table dependencies.md ships; whether FIND_PACKAGE_ARGS and OVERRIDE_FIND_PACKAGE are mutually exclusive in practice; the scope rule for CMAKE_POLICY_VERSION_MINIMUM; the provider rows' wording (what errors, what is silent); which native command a triager reads first (M-G-17). Chase the surprise: any substitution invisible to --debug-find-pkg.
```

**Dive `pinning-offline-and-cpm`** · family `CMK-DEP` · kind `exemplar` · label "How fetched dependencies are pinned, cached and taken offline across the corpus"

```
Re-measure and extend the dependency-pinning evidence at the re-fetched corpus (/home/mherwig/.cache/research-lang/exemplars/cmake, 2026-09-26; cite repo@newsha:path:line). Reuse .agents/research/cmake-audit/scratch/deps-cmake-calls.py and the deps-fetchcontent.sh, deps-cpm.sh, deps-hunter.sh scripts; never pipe into grep -q under pipefail (the audit's SIGPIPE trap, exemplar-cmake-shape.md method note M4).
Tabulate per repo every FetchContent_Declare, ExternalProject_Add and CPMAddPackage outside Kitware__CMake/Tests: pin shape (40-hex GIT_TAG, tag, branch, or variable — resolve each variable by reading its definition; the audit left 14 opaque), URL with or without URL_HASH, SYSTEM, EXCLUDE_FROM_ALL, FIND_PACKAGE_ARGS, OVERRIDE_FIND_PACKAGE, one-argument FetchContent_Populate (CMP0169), GIT_SHALLOW; every find_package version and range and every CONFIG or MODULE keyword (the audit's 222/6,957 and 41 percent, re-counted at new SHAs).
Then: which repos set FETCHCONTENT_FULLY_DISCONNECTED, FETCHCONTENT_UPDATES_DISCONNECTED, FETCHCONTENT_SOURCE_DIR_<X>, CPM_SOURCE_CACHE, CPM_USE_LOCAL_PACKAGES, CPM_DOWNLOAD_ALL, CPMUsePackageLock or package-lock.cmake; which vendor CPM.cmake, at what version, and whether its bootstrap download is hash-checked (cpp-best-practices__cmake_template, TheLartians__ModernCppStarter); confirm by reading cpm-cmake__CPM.cmake@newsha:cmake/CPM.cmake the four policies CPM sets NEW on load (CMP0077, CMP0126, CMP0135, CMP0150); HunterGate pin shape and the cpp-pm/gate submodule at cpp-pm__hunter@newsha (was 708cab1c49); vendored-directory provenance markers and .gitmodules branch= keys in the 9 submodule repos; which installable libraries FetchContent unconditionally in non-test code (M-G-06).
Fetch for normative grounding: Modules/FetchContent.cmake at tag v4.4.2 (gitlab.kitware.com raw), Help/guide/using-dependencies/index.rst at v4.4.2, raw.githubusercontent.com/cpm-cmake/CPM.cmake/master/README.md, github.com/ossf/scorecard/blob/main/docs/checks.md (does Pinned-Dependencies still ignore CMake?).
Answer M-G-03 through M-G-08, M-G-12, M-G-13, M-G-14, M-G-20, and the grep half of M-G-18.
DECIDE: the pinning severities (branch = MUST finding, tag = SHOULD, URL without hash = MUST) against what real projects do; whether CPM gets one row or several; Hunter's single row; the grep that enumerates every configure-time network touch and its false-positive rate on this corpus. Chase the surprise: a 40-hex GIT_TAG that cannot be verified offline — say so rather than guess.
```

**Dive `toolchain-composition`** · family `CMK-TC` · kind `web` · label "One CMAKE_TOOLCHAIN_FILE, four claimants: vcpkg, Conan, rules_foreign_cc and your cross toolchain"

```
Decide how a configure involving a package manager, a cross toolchain and possibly a Bazel wrapper composes toolchain files, and write the rows.
Fetch primary only: learn.microsoft.com/en-us/vcpkg/users/buildsystems/cmake-integration and /users/triplets (VCPKG_CHAINLOAD_TOOLCHAIN_FILE; github.com/microsoft/vcpkg/issues/36244 on its two meanings); scripts/buildsystems/vcpkg.cmake at microsoft__vcpkg@newsha in /home/mherwig/.cache/research-lang/exemplars/cmake; docs.conan.io/2/reference/tools/cmake/cmaketoolchain.html (tools.cmake.cmaketoolchain:toolchain_file vs :user_toolchain, blocks, generated presets); github.com/conan-io/conan/issues/12341; foreign_cc/cmake.bzl and foreign_cc/private/framework.bzl at bazel-contrib__rules_foreign_cc@bb2f3e5d72 (generate_crosstool_file; when a caller-supplied CMAKE_TOOLCHAIN_FILE wins); Help/manual/cmake-toolchains.7.rst, Help/variable/CMAKE_TOOLCHAIN_FILE.rst (environment form since 3.21), Help/variable/CMAKE_PROJECT_TOP_LEVEL_INCLUDES.rst and Help/command/cmake_language.rst at tag v4.4.2; the raw cmake-conan develop2 README for how conan_provider.cmake coexists with a user toolchain.
Pin down, per claimant: how its file gets in (-D, preset toolchainFile, environment), what it does when another toolchain is already set, its sanctioned chaining hook, and what must be set before project(). Include CMAKE_PROJECT_TOP_LEVEL_INCLUDES (3.24; module-name form 3.29) and the single-provider rule. Find a primary statement for or against running vcpkg and Conan in one configure (the map's M-L-02 says never).
Test against: re-run the toolchain inventory in .agents/research/cmake-audit/scratch/deps-toolchain-files.tsv at the new SHAs (97 files referencing CMAKE_TOOLCHAIN_FILE, 29 cross toolchains on 2026-09-05); aminya__project_options src/Conan.cmake and its vcpkg wiring; microsoft__vcpkg-tool@newsha CMakePresets.json (the one corpus preset with toolchainFile).
Answer M-H-01, M-H-06, M-H-07, M-H-08, M-L-02, M-N-02.
DECIDE: the composition table (claimant × entry mechanism × chain hook × before-project() inputs) the depth file ships; whether one manager of record per configure is MUST; the exact wording that providers are a user-owned single slot, not an ecosystem seam; the list of claims wave-3 dive toolchains-and-cross/cross-compile-find-root must still run.
```

### 3. `consumable-library` — The consumable library: targets, install, export

**Dive `install-round-trip-and-cps`** · family `CMK-INST` · kind `measure` · label "Install, relocate, consume: Config packages and CPS round trips, measured"

```
Measure what makes an installed CMake package consumable and relocatable, and settle the CPS export rows by running them. Binaries 3.31.12, 4.3.4, 4.4.2 via `ocx package exec kitware/cmake:<v> -- cmake`; scratch /home/mherwig/.cache/cmake-measure-scratch/install-round-trip/; a C library dep built with gcc 15.2 in shared and static variants, with one PUBLIC dependency on a second tiny library base that also installs a Config package. No network.
 1. (M-F-01, M-F-03) install(TARGETS EXPORT) + install(EXPORT NAMESPACE) + configure_package_config_file; a separate five-line consumer finds and links it via CMAKE_PREFIX_PATH. Then delete find_dependency(base) from the Config file and record the consumer's exact failure and phase.
 2. (M-F-02, M-F-07) grep the installed tree for the build and source directories; mv the prefix; consume again; readelf -d the installed shared library and an installed executable for RUNPATH, with and without CMAKE_INSTALL_RPATH set to $ORIGIN/../lib.
 3. (M-F-06) install(FILES ... DESTINATION /abs/path) under DESTDIR, and whether 4.4.2 catches it with CMD_INSTALL_ABSOLUTE_DESTINATION promoted to error.
 4. (M-F-11, M-F-12, M-G-15) add install(PACKAGE_INFO dep EXPORT depTargets VERSION 1.2.0 COMPAT_VERSION 1.0.0) under if(CMAKE_VERSION VERSION_GREATER_EQUAL 4.3). On 4.3.4 and 4.4.2: with both .cps and Config installed, which does find_package(dep) pick; does CONFIGS depConfig.cmake suppress CPS; does a version range work only against the .cps; point dep_DIR at a directory holding both (CMake issue 26410). Add an INTERFACE property using $<COMPILE_LANGUAGE:C> and VERSION_SCHEMA rpm: what lands in the .cps and can the consumer read it back? Where does export(PACKAGE_INFO) write on 4.3.4 vs 4.4.2 (the 4.3.3 move to cps/<pkg>/)?
 5. (M-F-14) generate a .pc from target data with configure_file and ${pcfiledir}-relative paths; confirm pkg-config --cflags --libs resolves after the prefix move.
 6. (M-K-01, M-G-18) simulate a rules_foreign_cc wrap without Bazel: `unshare -rn` configure, build -j, install to a fresh prefix with an external CMAKE_TOOLCHAIN_FILE and -DCMAKE_POSITION_INDEPENDENT_CODE=ON; record any network need, the install listing, and whether PIC reached the static archive.
Primary sources to cite: Help/command/install.rst and find_package.rst at tag v4.4.2; the CPS verifier's ledger in .agents/research/cmake-dependency-seam/cps-verification.md rows 19-26, which your runs confirm or overturn.
DECIDE: the round-trip script install-and-export.md ships as its verification (exact commands and which way output reads); CPS export severity (the verifier said SHOULD: does anything measured change that); whether a missing find_dependency is caught only at consume time; the relocation check an agent runs. Chase the surprise: anything install(PACKAGE_INFO) writes that the same binary then refuses to read.
```

**Dive `consumable-library-shape`** · family `CMK-INST` · kind `exemplar` · label "How consumable libraries in the corpus actually install"

```
Compare the install and export surface of the corpus libraries other people consume, at the re-fetched SHAs (/home/mherwig/.cache/research-lang/exemplars/cmake; cite repo@newsha:path:line), to decide which install rules are practice and which are aspiration.
Repos: fmtlib__fmt, gabime__spdlog, madler__zlib, curl__curl, libuv__libuv, jbeder__yaml-cpp, gflags__gflags, glfw__glfw, google__benchmark, google__googletest, nlohmann__json, Tencent__rapidjson, catchorg__Catch2, abseil__abseil-cpp, and as targets of the pattern friendlyanon__cmake-init and cpp-best-practices__cmake_template.
For each, tabulate: install(TARGETS ... EXPORT) and install(EXPORT NAMESPACE); namespace vs package name (does the namespace equal the find_package name? cps-verification.md row 52 makes a mismatch a forward-compatibility liability); Config file generated by configure_package_config_file or hand-written; find_dependency calls vs PUBLIC link dependencies of exported targets; write_basic_package_version_file COMPATIBILITY and ARCH_INDEPENDENT; GNUInstallDirs and any hand-rolled lib64, LIB_SUFFIX or LIB_INSTALL_DIR; FILE_SET HEADERS vs install(DIRECTORY); BUILD_INTERFACE and INSTALL_INTERFACE include directories; namespaced ALIAS targets; install components and a <name>_INSTALL_CMAKEDIR cache variable; .pc generation (79 *.pc.in in 22 repos corpus-wide: how generated, relocatable or not); install gated on PROJECT_IS_TOP_LEVEL or an option; CPack gating; and whether CI runs cmake --install and then consumes the result (the audit found 7 repos with an install step and traced none to a consumer — trace them).
Fetch for grounding: Help/manual/cmake-packages.7.rst and Help/module/CMakePackageConfigHelpers.rst at tag v4.4.2; fedoraproject.org/wiki/Changes/CMake_drop_install_vars; the cmake-init template cmake-init/templates/common/cmake/install-rules.cmake.
Answer M-F-04, M-F-05, M-F-09, M-F-10, M-F-14, M-F-15, M-E-05, M-J-10.
DECIDE: the must-have install set for a consumable library (MUST rows) versus SHOULD; the namespace rule's wording and severity given how many flagship libraries already differ from their package name; which .pc generation pattern the depth file shows as right. Chase the surprise: a flagship library whose installed Config file is not relocatable.
```

**Dive `usage-requirements-in-the-wild`** · family `CMK-TGT` · kind `exemplar` · label "Where legacy target usage actually lives, and what a library must never set"

```
Turn the audit's corpus-wide target counts into per-repo, per-subtree evidence so targets.md can say where the traps live and what an installable library must never do. Corpus /home/mherwig/.cache/research-lang/exemplars/cmake at the 2026-09-26 SHAs; cite repo@newsha:path:line. Exclude Kitware__CMake/Tests and Help, vendored trees (contrib/, third_party/, third-party/, deps/, _deps/) and generated files (detect banners such as grpc__grpc's 'automatically generated' header) and report those separately.
Extend .agents/research/cmake-audit/scratch/deps-cmake-calls.py (paren-balanced, comment-stripped) into one multi-line-aware parser and measure per repo:
 - target_link_libraries calls without PUBLIC, PRIVATE or INTERFACE (audit: 2,980 of 8,453 corpus-wide), first-party vs vendored (M-E-01);
 - directory-scoped include_directories, add_definitions, add_compile_options, link_directories, link_libraries (M-E-02);
 - set or string(APPEND) on CMAKE_C_FLAGS and CMAKE_CXX_FLAGS outside toolchain files (M-E-03);
 - CMAKE_CXX_STANDARD set in an installable library, with and without _REQUIRED and _EXTENSIONS, versus target_compile_features cxx_std_NN PUBLIC (M-E-04);
 - file(GLOB or GLOB_RECURSE) feeding add_library, add_executable or target_sources, with or without CONFIGURE_DEPENDS (M-E-10);
 - literal -Werror or /WX in an installable library's CMakeLists vs CMAKE_COMPILE_WARNING_AS_ERROR (M-E-11);
 - an unquoted variable in an if() comparison and a bare foreach(x ${list}), using the two regexes in .agents/research/cmake-audit/find-ocx-cmake-shape-and-contracts.md section 4 (M-C-03); generator expressions consumed at configure time in message(), if() or string() (M-C-07);
 - option() names without a project prefix and user variables named CMAKE_* (M-C-09), with the vendoring caveat the shape audit found in LLVM and Kitware.
Fetch for grounding: Help/manual/cmake-buildsystem.7.rst at tag v4.4.2 and the Effective Modern CMake checklist (gist.github.com/mbinna/c61dbb39bca0e4fb7d1f73b0d66a4fd1).
DECIDE: which of these become MUST vs SHOULD for an installable library versus a top-level application; the exact grep or parser invocation each row ships and its false-positive rate on this corpus; the order in which the cmake-modernize skill converts them (what must change first). Chase the surprise: if the legacy share sits in a few vendored subtrees, the 35 percent headline is wrong and the rules must say so.
```

### 4. `module-authoring` — Authoring, testing and formatting CMake modules

**Dive `module-contracts`** · family `CMK-MOD` · kind `exemplar` · label "The contract a shipped CMake module keeps"

```
Decide what a reusable shipped CMake module — a Find module, a helper module, a copy-and-own tool bootstrapper like find_ocx — must guarantee, grounded on Kitware's conventions and on real modules. Language and gate behaviour is measured in versions-and-gate/gate-and-language-semantics: cite its results if landed, never re-measure.
Fetch at tag v4.4.2 (gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/...): Help/manual/cmake-developer.7.rst, Modules/FindPackageHandleStandardArgs.cmake, Help/command/file.rst (DOWNLOAD: STATUS, EXPECTED_HASH, TLS_VERIFY, TIMEOUT, INACTIVITY_TIMEOUT), Help/command/execute_process.rst (COMMAND_ERROR_IS_FATAL, ENCODING, CMP0176), Help/variable/CMAKE_TLS_VERIFY.rst (default on since 3.31), Help/command/include_guard.rst, Help/command/cmake_policy.rst, Help/variable/CMAKE_MESSAGE_CONTEXT.rst; llvm.org/docs/CMakePrimer.html for naming; the sphinxcontrib-moderncmakedomain README for reference extraction.
Read as evidence (corpus at /home/mherwig/.cache/research-lang/exemplars/cmake; cite repo@newsha:path:line): /home/mherwig/dev/find_ocx/ocx.cmake and Findocx.cmake, re-checking the audit's line numbers against the working tree (audit: .agents/research/cmake-audit/find-ocx-cmake-shape-and-contracts.md); Kitware__CMake Modules/FindPython/Support.cmake and two small Find modules; cpm-cmake__CPM.cmake cmake/CPM.cmake; conan-io__cmake-conan conan_provider.cmake; aminya__project_options src/*.cmake; KDE__extra-cmake-modules find-modules/; ccache__ccache cmake/FindZstd.cmake; apache__arrow cpp/cmake_modules/ThirdpartyToolchain.cmake.
Per module, tabulate: policy pinning (PUSH/VERSION/POP or block) and whether every function sits inside it; include_guard scope; public and private naming; FPHSA use, _FIND_QUIETLY/_FIND_REQUIRED/_FIND_VERSION handling, NOT TARGET guards; every file(DOWNLOAD) with STATUS, EXPECTED_HASH, TLS_VERIFY, timeouts; every execute_process with RESULT_VARIABLE or COMMAND_ERROR_IS_FATAL; string(JSON) ERROR_VARIABLE; message prefix and severity; CMAKE_CONFIGURE_DEPENDS; environment snapshotting and any credential in the cache; script-mode support; the find_package hand-off (<Name>_ROOT and the CMP0144 upper-case form).
Answer M-D-03 through M-D-15, M-C-04, M-C-08.
DECIDE: the MUST list for any module that downloads or executes (the map proposes: STATUS checked, a hash for executable content, explicit TLS_VERIFY ON when the floor admits 3.19-3.30, every execute_process result checked); the Find-module contract rows; which find_ocx facts become anonymised worked examples and which audit findings are withdrawn (the memo FORCE finding, per the map's conflict 16). Chase the surprise: a Kitware-shipped module that breaks its own cmake-developer(7) contract.
```

**Dive `module-testing-and-formatting`** · family `CMK-TEST` · kind `exemplar` · label "Testing and formatting CMake code: RunCMake, build-and-test harnesses, gersemi"

```
Decide how CMake code itself is tested and formatted, given 0 of 46 exemplars run gersemi and CMake-hygiene CI is near absent while C++ hygiene is common (clang-format 23/46).
Testing: read Kitware__CMake@newsha Tests/RunCMake/RunCMake.cmake and two RunCMake case directories (expected -result.txt and -stderr.txt) as the reference harness; /home/mherwig/dev/find_ocx/CMakeLists.txt, tests/helpers.cmake and tests/reconfigure_check.cmake (10 families; 5 skip -Werror=dev on their inner configure; the memo test never changes an input); cpm-cmake__CPM.cmake test/ and conan-io__cmake-conan tests/ for how module projects test across CMake versions (corpus /home/mherwig/.cache/research-lang/exemplars/cmake, cite repo@newsha:path:line); fetch Help/manual/ctest.1.rst (--build-and-test) at tag v4.4.2. Per harness: how it runs several CMake versions, negative-test style (WILL_FAIL vs PASS_REGULAR_EXPRESSION vs expected-stderr files), whether the configure gate reaches every inner configure, reconfigure-with-changed-input coverage.
Formatting: check whether `uvx gersemi==0.28.1 --version` (or pipx) runs on this host. If it does, run gersemi --check over find_ocx's ocx.cmake, CPM.cmake, conan_provider.cmake and three corpus CMakeLists.txt, with and without --definitions pointing at the module, and record what it would rewrite and which custom commands it warns about (the README's 'obvious manner' cmake_parse_arguments condition: find_ocx uses the ARGN form in 6 places). If it cannot be installed, read the definitions detector in github.com/BlankSpruce/gersemi source and mark the run pending. Confirm which config file names gersemi discovers (the map globs only .gersemirc). List the 7 corpus repos with a .cmake-format config and whether their CI runs it.
Verification hygiene: run two shipped-style greps under set -o pipefail with grep -q, and without, on one large repo, documenting the SIGPIPE false negative for the index (audit method note M4).
Answer M-I-04, M-A-03, M-A-04, M-A-06, M-B-02.
DECIDE: the module-test pattern testing.md ships (commands and pass criteria); whether gersemi --check is a SHOULD gate and what configuration a module project needs; the authoring constraints every verification grep obeys. Chase the surprise: gersemi mangling a module's own commands when run without --definitions.
```

### 5. `package-managers` — Conan 2 and vcpkg

**Dive `conan-cmake-integration`** · family `CMK-CONAN` · kind `web` · label "Conan 2.32 and CMake: generators, flows, lockfiles and profiles"

```
Write the Conan-to-CMake rows a consumer needs at Conan 2.32 (2026-08-31), dated, with every experimental label carried forward.
Fetch primary only: docs.conan.io/2/changelog.html (2.13.0 through 2.32.0, and anything newer); raw conan-io/docs develop2 files reference/tools/cmake/cmaketoolchain.rst, cmakedeps.rst, cmakeconfigdeps.rst, incubating.rst, tutorial/versioning/lockfiles.rst, reference/config_files/profiles.rst, integrations/cmake.rst, reference/commands/graph.rst; the raw cmake-conan develop2 README; conan-io/conan source at tag 2.32.0 for anything the docs do not state (conan/tools/cmake/, conan/tools/cps/cps_deps.py). Issue context: github.com/conan-io/cmake-conan/issues/174 (MSVC runtime), github.com/conan-io/conan/issues/1330 and 2463.
Pin down: CMakeDeps vs CMakeConfigDeps (status on each page, what each emits, Find-module generation, target kinds, build-context handling); the explicit conan install flow vs the cmake-conan provider and its limits; tool_requires vs requires vs deprecated build_requires and the two-profile model; conan.lock semantics (implicit pickup, revisions, --lockfile-partial, --lockfile-out, --lockfile-clean, strict use in CI) and version ranges; profile compiler.cppstd and [conf] tools.cmake.* vs a project that sets CMAKE_CXX_STANDARD or cxx_std — which wins and whether a mismatch is diagnosed; the presets CMakeToolchain writes (schema, the CMakeUserPresets.json skip rule); Conan-1 residue detection; conan graph explain and graph info for triage; workspaces GA at 2.31.0.
Test against the corpus (/home/mherwig/.cache/research-lang/exemplars/cmake; cite repo@newsha:path:line): the 11 non-CCI conanfiles in aminya__project_options, catchorg__Catch2, conan-io__cmake-conan, friendlyanon__cmake-init, abseil__abseil-cpp, and conan-io__conan-center-index docs/package_templates/cmake_package/all/conanfile.py.
Answer M-M-01 through M-M-05, M-M-07, M-M-08, M-M-10, M-M-11, and the Conan halves of M-L-03 and M-L-05.
DECIDE: which generator the rule recommends and with what caveat; the default flow; the lockfile MUSTs; whether a cppstd or runtime mismatch is checkable at configure time (if yes the check, if no say so). Chase the surprise: Conan's own two pages disagreeing on CMakeConfigDeps status at 2.32.0 — report which one the newest changelog entry supports.
```

**Dive `vcpkg-manifests-and-caching`** · family `CMK-VCPKG` · kind `web` · label "vcpkg in 2026: manifests, baselines, triplets and caches"

```
Write the vcpkg rows a consumer needs, dated against the newest vcpkg registry and vcpkg-tool releases (the scouts saw registry 2026.07.29 and tool 2026-07-27; check for newer).
Fetch primary only: learn.microsoft.com/en-us/vcpkg/reference/vcpkg-json, /reference/vcpkg-configuration-json, /users/versioning and the versioning reference (builtin-baseline, version>=, overrides, minimum-version resolution), /users/triplets, /users/buildsystems/cmake-integration, /reference/binarycaching, /users/binarycaching, /users/assetcaching, /commands/x-update-baseline, /commands/install; github.com/microsoft/vcpkg-tool/releases (the artifacts-removal note in 2026-05-27 and anything after); github.com/microsoft/vcpkg/issues/12357 (triplet default) and 14025 (manifest delay).
Pin down: exactly which fields and files make a manifest reproducible and which command moves each; that transitive overrides are ignored; host dependencies; the triplet variables that change ABI (VCPKG_CRT_LINKAGE, VCPKG_LIBRARY_LINKAGE, VCPKG_HASH_ADDITIONAL_FILES, VCPKG_DISABLE_COMPILER_TRACKING) and how a project's CMAKE_MSVC_RUNTIME_LIBRARY must match; the binary-cache provider table with stable, experimental and removed status (x-gha removed) and what happens on a malformed VCPKG_BINARY_SOURCES; asset caching with x-block-origin; vcpkg-artifacts status today; whether vcpkg offers any dependency provider or any CPS support (the corpus audit and the CPS verifier found none: confirm by searching vcpkg-tool source at its newest tag).
Test against the corpus (/home/mherwig/.cache/research-lang/exemplars/cmake; cite repo@newsha:path:line): consumer manifests in apache__arrow (cpp/vcpkg.json, ci/vcpkg/vcpkg.json), aminya__project_options tests, friendlyanon__cmake-init's template; microsoft__vcpkg-tool CMakePresets.json; recount builtin-baseline presence at the new SHAs.
Answer M-N-01 through M-N-06, M-N-08, and the vcpkg halves of M-L-03 and M-L-05.
DECIDE: the manifest MUSTs; the CI caching rows (which provider string a rule may recommend without an experimental caveat); whether a triplet or runtime mismatch is detectable at configure time. Chase the surprise: a vcpkg-tool release after 2026-07-27 that changes a default these rows depend on.
```

### 6. `bazel-seam` — The Bazel seam and dual builds

**Dive `wrappable-cmake-contract`** · family `CMK-BZL` · kind `exemplar` · label "What a CMake project owes rules_foreign_cc"

```
State the CMake project's side of being wrapped by rules_foreign_cc, as rows that cite bazel-quality's BZL-CC-22, -23, -24 and -28 by ID and never restate them. Read rules/bazel-quality/cpp.md, section Wrapped Foreign Builds, first.
Read at bazel-contrib__rules_foreign_cc@bb2f3e5d72 in /home/mherwig/.cache/research-lang/exemplars/cmake (was f68b351c46 on 2026-09-05; cite repo@sha:path:line): foreign_cc/cmake.bzl (lib_source, cache_entries, generate_args, generate_crosstool_file, install, out_* names, working_directory); foreign_cc/private/framework.bzl (the block-network execution requirement unless tagged requires-network; -ffile-prefix-map handling); foreign_cc/repositories.bzl DEFAULT_TOOL_VERSIONS and toolchains/private/cmake_versions.bzl (3.19.8 to 4.0.7, default 3.31.12 on 2026-09-05: has it moved to 4.x?); examples/ that wrap a CMake project. Fetch github.com/bazel-contrib/rules_foreign_cc/issues/329 (parallel builds), 1129 (installs from the source dir only symlinked) and 421 (-fPIC with --force_pic), and the latest release tag from the GitHub API.
Pin down every property of the wrapped CMake project the rule depends on: no network at configure or build; an install() producing the named artefacts at stable paths under include, lib and bin; CMAKE_INSTALL_PREFIX honoured; a caller-supplied CMAKE_TOOLCHAIN_FILE honoured, and what the synthesised one sets; CMAKE_POSITION_INDEPENDENT_CODE honoured; static or shared chosen by a cache entry; a parallel-safe build; no absolute paths in installed Config or .pc files; CMake-version assumptions under the default bundled CMake (can a 4.3-only feature such as CPS ever run?). Where consumable-library/install-round-trip-and-cps has landed its no-network wrap simulation, use its results; otherwise mark those rows pending.
Answer M-K-01, M-K-02, M-K-08, M-E-09, M-G-18.
DECIDE: the CMK-BZL rows (MUST or SHOULD) each with a verification an agent can run without Bazel installed; the exact one-line pointer offered back to bazel-quality's Wrapped Foreign Builds section; the CPS negative note for the Bazel program (zero CPS hits in rules_foreign_cc and the BCR per cps-verification.md row 51 — re-check at the new SHA). Chase the surprise: a default bundled CMake old enough that a modern project's floor fails inside the wrap.
```

**Dive `dual-build-sync-and-conan-bazel`** · family `CMK-BZL` · kind `exemplar` · label "Dual CMake+Bazel builds: sync, drift, and Conan's Bazel generators under Bzlmod"

```
Resolve the two open seam questions: how dual CMake+Bazel projects keep their builds in step, and whether Conan's Bazel generators work in a Bzlmod world.
Dual builds: for the 11 dual repos at the 2026-09-26 SHAs in /home/mherwig/.cache/research-lang/exemplars/cmake (abseil__abseil-cpp, catchorg__Catch2, gflags__gflags, google__benchmark, google__googletest, google__re2, grpc__grpc, jbeder__yaml-cpp, madler__zlib, nlohmann__json, protocolbuffers__protobuf; cite repo@newsha:path:line), read every .github/workflows file that mentions bazel or cmake and record whether CI builds both descriptions, tests both, or checks parity. The audit's headline named 5 repos with no sync and its body 4, without reading the CI files: settle it. Map exported target names between the two (absl::strings vs @abseil-cpp//absl/strings; protobuf::libprotobuf vs @protobuf//:protobuf) and note mismatches a consumer switching builds would hit. Build a per-pair drift table: each dependency in MODULE.bazel (bazel_dep, including dev_dependency) against what the CMake side fetches or finds (FetchContent GIT_TAG, find_package version, a vendored copy) — same, different, or not knowable statically. Note any repo generating one description from the other (grpc generates CMakeLists.txt from templates; does it also generate BUILD files?).
Conan and Bazel: fetch docs.conan.io/2/integrations/bazel.html, the raw conan-io/docs develop2 reference pages for BazelDeps and BazelToolchain, and conan-io/conan source at tag 2.32.0 (conan/tools/google/); read the 2.30.0 changelog entry claiming Bazel 9 support (PR 20042). Bazel 9 removed WORKSPACE (bazel-quality's flags file owns that fact: cite it). Decide whether BazelDeps output is usable from MODULE.bazel (a module extension, local_path_override, or not at all) and what a team must do today. Confirm vcpkg has no Bazel integration.
Answer M-K-03, M-K-04, M-K-05, M-K-06.
DECIDE: whether CI building both descriptions is SHOULD for dual projects and how an agent verifies it; the drift check an agent can run; the Conan-under-Bzlmod statement bazel-seam.md ships, dated to Conan 2.32.0. Chase the surprise: a dual repo whose Bazel and CMake builds pin different major versions of the same dependency.
```

## Staged for wave 3

Six groups, eleven dives, three of them `measure`. Launch mechanically once
wave 2 lands; every brief marked **REVISE AFTER WAVE 2** must have that line
acted on first (folding in the named wave-2 results and dropping experiments
they already settled). `package-managers` is an existing group from wave 2, so
its consolidation becomes a revision (hold existing CMK-CONAN/CMK-VCPKG IDs
stable, append a revision log).

### 1. `targets-and-abi` — Targets, linkage and ABI

**Dive `shared-static-visibility-pic`** · family `CMK-TGT` · kind `measure` · label "Shared, static, visible and position-independent: linkage traps, measured" · **revise after wave 2**

```
REVISE AFTER WAVE 2: fold in consumable-library/install-round-trip-and-cps (PIC under the wrap simulation) and dependency-seam/resolution-order-and-providers (as-subproject results); drop any experiment they already settled.
Measure on 3.31.12 and 4.4.2 (`ocx package exec kitware/cmake:<v> -- cmake`), gcc 15.2 for C and a two-line wrapper script around /opt/zig/zig c++ where C++ is unavoidable, the linkage behaviours targets.md must state. Scratch /home/mherwig/.cache/cmake-measure-scratch/linkage/. No network; fetched dependencies come from a local file:// git repo.
 1. (M-E-07) the parent sets BUILD_SHARED_LIBS ON (normal variable, then cache variable) and FetchContents a dependency whose add_library has no type; record the dependency's type; repeat with the dependency hard-coding STATIC.
 2. (M-E-09) a static library linked into a shared one, with and without POSITION_INDEPENDENT_CODE on the static target and with CMAKE_POSITION_INDEPENDENT_CODE set globally; show the link error or the readelf relocation evidence.
 3. (M-E-08) CXX_VISIBILITY_PRESET hidden plus VISIBILITY_INLINES_HIDDEN with GenerateExportHeader: nm -D before and after. CMAKE_WINDOWS_EXPORT_ALL_SYMBOLS is Windows-only: read Help/prop_tgt/WINDOWS_EXPORT_ALL_SYMBOLS.rst at v4.4.2 instead of measuring.
 4. (M-E-15) CMAKE_LINK_LIBRARIES_ONLY_TARGETS ON with a misspelled target, a bare system name (m, pthread), an absolute path and Threads::Threads: which are diagnosed, which pass.
 5. (M-E-17) build one library from two different absolute source directories; compare artefacts with cmp and strings for embedded paths; add -ffile-prefix-map through target_compile_options and repeat.
 6. (M-E-12) read Help/variable/CMAKE_MSVC_RUNTIME_LIBRARY.rst and CMP0091 at v4.4.2; record the abstraction's values and how a vcpkg static-CRT triplet or a Conan compiler.runtime setting must match it (no Windows host: document, never claim a measurement).
Evidence: shape-audit counts (BUILD_SHARED_LIBS 1,284 references; the PIC variable 34; GenerateExportHeader 9/43; CMAKE_MSVC_RUNTIME_LIBRARY 109) and rules_foreign_cc issue 421.
DECIDE: the linkage MUST and SHOULD rows in targets.md with the command that proves each; whether a library may ever set BUILD_SHARED_LIBS itself; the reproducibility row's wording (the flag is manual; CMake has no CMAKE_DEBUG_PREFIX_MAP).
```

**Dive `standards-modules-and-abi`** · family `CMK-TGT` · kind `web` · label "Language standard, C++20 modules and ABI consistency across a managed graph" · **revise after wave 2**

```
REVISE AFTER WAVE 2: start from consumable-library/usage-requirements-in-the-wild (how the corpus sets standards) and from package-managers/conan-cmake-integration and vcpkg-manifests-and-caching (whether a cppstd or runtime mismatch is detectable); do not re-fetch what they cite.
Fetch at tag v4.4.2: Help/manual/cmake-compile-features.7.rst, Help/policy/CMP0128.rst, Help/variable/CMAKE_CXX_STANDARD.rst and its _REQUIRED and _EXTENSIONS siblings, Help/manual/cmake-cxxmodules.7.rst (named-module and import std toolchain matrix, generator support, Ninja 1.11+), Help/policy/CMP0155.rst, Help/dev/experimental.rst (the CXX_IMPORT_STD UUID at v4.4.2); kitware.com/import-cmake-the-experiment-is-over; the project_options README's sanitizer section and Windows ASan caveats.
Evidence (corpus /home/mherwig/.cache/research-lang/exemplars/cmake; cite repo@newsha:path:line): fmtlib__fmt's FILE_SET CXX_MODULES target (was d90c33606c:CMakeLists.txt:365) and nlohmann__json src/modules/CMakeLists.txt; cpp-best-practices__cmake_template and aminya__project_options sanitizer options; the 25/46 repos carrying -fsanitize.
Pin down: what CMake does when a library says target_compile_features(PUBLIC cxx_std_17) and the top level sets CMAKE_CXX_STANDARD 20, and when a Conan profile's compiler.cppstd or a vcpkg triplet disagrees; which mismatches break ABI (libstdc++ dual ABI, MSVC runtime) versus harmless flag differences; the exact gate for shipping a C++20 module target as an opt-in extra; whether raising CXX_STANDARD to 20 on 4.4.2 turns on scanning and what that costs on a generator without support; CMAKE_BUILD_TYPE defaulting only at top level for single-config generators; sanitizer builds via presets.
Answer M-E-04 (second pass), M-E-13, M-E-14, M-E-16, M-L-05.
DECIDE: the standard-selection MUST for installable libraries; whether modules get any row beyond a gate table; whether an ABI-consistency row is checkable (if not, it ships as a reading heuristic naming the failure).
```

### 2. `testing-and-ci` — CTest, presets and CI

**Dive `ctest-contract`** · family `CMK-TEST` · kind `web` · label "What a CTest run in CI must prove" · **revise after wave 2**

```
REVISE AFTER WAVE 2: take the as-subproject test-gating result from dependency-seam/resolution-order-and-providers and the module-harness pattern from module-authoring/module-testing-and-formatting as settled.
Fetch at tag v4.4.2: Help/manual/ctest.1.rst (Run Tests, Label Matching, Resource Allocation, Job Server Integration, --no-tests, --output-on-failure, --repeat, --schedule-random, --test-dir), Help/prop_test/TIMEOUT.rst, FIXTURES_SETUP, FIXTURES_CLEANUP, FIXTURES_REQUIRED, RESOURCE_LOCK, RESOURCE_GROUPS, WILL_FAIL, PASS_REGULAR_EXPRESSION, Help/envvar/CTEST_NO_TESTS_ACTION.rst (3.26), Help/module/GoogleTest.rst (DISCOVERY_MODE), the 4.4 discover_tests command doc, Help/policy/CMP0178.rst and CMP0158.rst, Help/variable/CMAKE_DISABLE_FIND_PACKAGE_PackageName.rst and CMAKE_REQUIRE_FIND_PACKAGE_PackageName.rst.
Evidence (corpus /home/mherwig/.cache/research-lang/exemplars/cmake; cite repo@newsha:path:line): every ctest invocation in .github/workflows across the 46 repos — flags used, -C on multi-config, --test-dir (find_ocx uses it once); gtest_discover_tests and catch_discover_tests users (the audit found only Kitware uses the former); TIMEOUT settings counted multi-line-aware (the audit's 17 is a single-line floor).
Answer M-I-02, M-I-03, M-I-05, M-I-06, M-G-10.
DECIDE: the CI ctest line testing.md prints; which test properties are MUST for a suite that runs in CI (TIMEOUT is the candidate); whether --repeat until-pass is ever acceptable; how optional dependencies are pinned on or off in CI.
```

**Dive `presets-and-ci-shape`** · family `CMK-CI` · kind `exemplar` · label "Presets as the reproduction of CI, and CI that pins its CMake" · **revise after wave 2**

```
REVISE AFTER WAVE 2: take the schema-rejection behaviour from versions-and-gate/gate-and-language-semantics and the floor from versions-and-gate/floors-policies-and-era as given; this dive measures practice only.
Corpus /home/mherwig/.cache/research-lang/exemplars/cmake at the 2026-09-26 SHAs (19 CMakePresets.json in 7 repos by this map's count; cite repo@newsha:path:line). For each repo with presets, correlate every configure preset with its CI jobs: does CI run cmake --preset, ctest --preset or --workflow, or re-implement the flags; declared schema vs the CMake the CI installs; hidden bases, inherits depth, condition and include use; the generator per leg and CMAKE_BUILD_TYPE on single-config legs; toolchainFile; warnings and errors fields; whether CMakeUserPresets.json is tracked or gitignored.
Across all 46 repos: how CI obtains CMake (lukka/get-cmake, jwlawson/actions-setup-cmake, pip, apt, runner default — the audit found 35/46 install nothing) and whether a version is pinned; compiler-launcher wiring (CMAKE_C_COMPILER_LAUNCHER or CMAKE_CXX_COMPILER_LAUNCHER in presets, toolchains or CI; any chaining); where CMAKE_EXPORT_COMPILE_COMMANDS is set; any install-then-consume job and any as-subproject smoke job.
Fetch: Help/manual/cmake-presets.7.rst at tag v4.4.2; gitlab.kitware.com/cmake/cmake/-/issues/22538 (combinatorial explosion) for its current state; the lukka/get-cmake README for its pinning inputs.
Answer M-J-02 through M-J-09, the CI-presence half of M-J-10, and M-A-07 (the silent-pass list, from what CI actually checks).
DECIDE: whether presets per CI leg is SHOULD or CONSIDER given adoption; the CI CMake-pinning MUST and its check; the launcher rule; whether workflow presets get any row.
```

### 3. `toolchains-and-cross` — Cross-compiling and host tools

**Dive `cross-compile-find-root`** · family `CMK-TC` · kind `measure` · label "Cross-compiling: sysroot, find-root modes and host tools, measured" · **revise after wave 2**

```
REVISE AFTER WAVE 2: dependency-seam/toolchain-composition lists the composition claims it could not settle from docs; run those here first.
Measure on 3.31.12 and 4.4.2 (`ocx package exec kitware/cmake:<v> -- cmake`) with /opt/zig/zig as the cross compiler (zig cc -target aarch64-linux-gnu, wrapped in two-line scripts) in /home/mherwig/.cache/cmake-measure-scratch/cross/. Build a fake sysroot holding a target-arch libfoo with a Config package and a .pc file; install a host-arch libfoo and a host tool gen elsewhere on CMAKE_PREFIX_PATH. No network.
 1. (M-H-05) a toolchain file with CMAKE_SYSTEM_NAME, CMAKE_SYSROOT and each combination of CMAKE_FIND_ROOT_PATH_MODE_PROGRAM, _LIBRARY, _INCLUDE and _PACKAGE: which libfoo find_package and find_library resolve; the defaults when the toolchain sets none.
 2. (M-H-06) find_program(gen) for a code generator in the cross build with and without NO_CMAKE_FIND_ROOT_PATH; CMAKE_CROSSCOMPILING_EMULATOR on add_test.
 3. (M-H-07) count how often the toolchain file is read in one configure with two try_compile checks (a message() inside it); what breaks when it calls project-level commands.
 4. (M-G-19) pkg_check_modules against the sysroot with PKG_CONFIG_SYSROOT_DIR and PKG_CONFIG_LIBDIR set and unset: which .pc wins.
 5. Chain a second toolchain file through the include pattern vcpkg.cmake uses for VCPKG_CHAINLOAD_TOOLCHAIN_FILE (read microsoft__vcpkg@newsha:scripts/buildsystems/vcpkg.cmake; reproduce without vcpkg) and record variable precedence.
Evidence: the 29 cross toolchains in .agents/research/cmake-audit/scratch/deps-toolchain-files.tsv re-run at new SHAs; Help/manual/cmake-toolchains.7.rst at tag v4.4.2.
DECIDE: the cross-toolchain MUST rows (find-root modes, sysroot) with this scratch as the shipped verification; the host-tool rule; whether toolchain idempotence is a rule or a note.
```

### 4. `package-managers` — Conan 2 and vcpkg (revision)

**Dive `conan-recipe-authoring`** · family `CMK-CONAN` · kind `exemplar` · label "Authoring a Conan 2 recipe for a CMake library" · **revise after wave 2**

```
REVISE AFTER WAVE 2: start from package-managers/conan-cmake-integration's generator and lockfile verdicts; this dive covers the producer side only.
Corpus: conan-io__conan-center-index at its 2026-09-26 SHA in /home/mherwig/.cache/research-lang/exemplars/cmake (was db3706004e; cite repo@newsha:path:line). Draw a deterministic 40-recipe sample spread across the alphabet (sort recipes/ and take every Nth; the audit took the first 40) and tabulate: layout() and cmake_layout; generate() with CMakeToolchain plus CMakeDeps or CMakeConfigDeps; package_info() naming via set_property with cmake_target_name, cmake_file_name and cmake_find_mode vs any cpp_info.names residue; rmdir of lib/cmake and lib/pkgconfig in package(); package_id() for header-only; validate() and compatibility(); implements = ['auto_shared_fpic'] or explicit shared and fPIC defaults; requires pins (exact vs range; the audit saw 24 exact, 17 range and abseil/[*]); tool_requires use; the test_package/CMakeLists.txt shape; conandata.yml sources with sha256.
Fetch: the raw conan-center-index docs/adding_packages/*.md and docs/package_templates/cmake_package/all/conanfile.py; the docs.conan.io/2 reference pages for package_info properties, package_id and compatibility; the conan-io/hooks README (archived 2026-03-24) to list the KB-H rules that no longer run anywhere.
Answer M-M-06, M-M-09 (the CPS round trip from the producer side; cite source), M-M-12.
DECIDE: the recipe-author rows (MUST or SHOULD) each with a grep; which archived KB-H rules survive as written rows because nothing enforces them now; whether cpp-packaging/conan.md splits consumer and producer sections.
```

**Dive `vcpkg-port-authoring`** · family `CMK-VCPKG` · kind `exemplar` · label "Authoring a vcpkg port and an overlay for a CMake library" · **revise after wave 2**

```
REVISE AFTER WAVE 2: start from package-managers/vcpkg-manifests-and-caching for the consumer rules; this dive covers ports and overlays.
Corpus: microsoft__vcpkg at its 2026-09-26 SHA in /home/mherwig/.cache/research-lang/exemplars/cmake (was 04a9d8e521; cite repo@newsha:path:line). Deterministic sample of 40 ports spread across the alphabet (every Nth of ports/); tabulate vcpkg_from_github with a lower-case SHA512; vcpkg_cmake_configure, vcpkg_cmake_install and vcpkg_cmake_config_fixup vs the deprecated vcpkg_configure_cmake, vcpkg_build_cmake, vcpkg_install_cmake, vcpkg_fixup_cmake_targets, vcpkg_extract_source_archive_ex, vcpkg_apply_patches; OPTIONS -D forwarding; vcpkg_check_linkage; unofficial-<port> configs (the audit found all 40 lower-case -config.cmake.in templates follow it); usage files (546 in 2 repos corpus-wide); CMAKE_POLICY_VERSION_MINIMUM or CMAKE_POLICY_DEFAULT_CMP overrides for old upstream floors (scripts/ports.cmake was the global default); copyright handling; port-version bumps and versions/ database entries.
Fetch: raw.githubusercontent.com/MicrosoftDocs/vcpkg-docs/main/vcpkg/contributing/maintainer-guide.md, the portfile function reference pages and the overlay-ports doc on learn.microsoft.com; confirm whether VCPKG_PREFER_SYSTEM_LIBS is still deprecated.
Answer M-N-07, M-N-09, M-F-16.
DECIDE: the port-author rows each with a grep; the overlay-port recipe for consuming a library vcpkg lacks; whether any port-author rule belongs in install-and-export.md instead (the unofficial- naming generalises beyond vcpkg).
```

**Dive `tool-provisioning-and-supply-chain`** · family `CMK-PKG` · kind `web` · label "Choosing a manager, provisioning build tools, and the supply-chain gates each offers" · **revise after wave 2**

```
REVISE AFTER WAVE 2: take the generator, lockfile and caching verdicts from package-managers/conan-cmake-integration and vcpkg-manifests-and-caching, and the composition table from dependency-seam/toolchain-composition, as settled inputs.
Fetch primary only: docs.conan.io/2 pages for tool_requires, the build context and the profiles [tool_requires] section; learn.microsoft.com vcpkg pages on host dependencies and host triplets; the CPM README limitations section; one integration-model page each for pixi-build CMake (prefix.dev), Spack CMakePackage, the nixpkgs cmake setup hook, xrepo-cmake and Meson's wrap manual; docs.conan.io/2/reference/commands/audit.html and the 2.32.0 changelog CVE entry; the vcpkg 2026.07.29 registry release SBOM notes; the ISO C++ developer survey 2025 and 2026 summaries on isocpp.org (extract package-manager and build-system percentages if the PDFs can be read; otherwise say so).
Pin down: a decision table for acquiring libraries (system, FetchContent, CPM, Conan, vcpkg) keyed on prebuilt binaries, cross-compiling, a registry of record and offline needs; a table for provisioning build tools (Conan tool_requires, vcpkg host, an external hash-verified provisioner, the runner image) with lock, hash, mirror and offline properties, in portable wording that names no fleet product; binary-cache key correctness across Conan package_id, the vcpkg ABI hash and ccache or sccache; which supply-chain gates are stable enough for a SHOULD.
Answer M-L-01, M-L-04, M-L-06, M-L-07, M-L-08, M-L-09.
DECIDE: what the cpp-packaging index says in its decision section (tables, no mandate); the one survey citation shipped text may use; whether any supply-chain row rises above CONSIDER.
```

### 5. `skills` — Procedures behind the two skills

**Dive `dependency-triage-procedure`** · family `CMK-DEP` · kind `measure` · label "The cmake-dependency-triage procedure: from symptom to the resolving mechanism" · **revise after wave 2**

```
REVISE AFTER WAVE 2: reuse the scratch projects and resolution-order table from dependency-seam/resolution-order-and-providers; this dive turns them into a procedure and does not re-measure resolution.
Build or reuse, in /home/mherwig/.cache/cmake-measure-scratch/triage/, five deliberate failures on 4.4.2 and 3.31.12 (`ocx package exec kitware/cmake:<v> -- cmake`): (1) FetchContent silently substituted for an installed copy via OVERRIDE_FIND_PACKAGE; (2) the wrong one of two installed copies found because of a stale dep_DIR in the cache; (3) a provider registered but never consulted because find_library ran first; (4) a Config file missing find_dependency so the consumer fails; (5) a fetched dependency with a pre-3.5 floor failing on 4.4.2. For each, run every native diagnostic and record which names the cause first and how: --debug-find-pkg=<name>, --debug-find, --trace-expand with --trace-source, CMakeFiles/CMakeConfigureLog.yaml find_package events (CONFIG mode since 4.1), cmake -L and the <Pkg>_DIR cache entry, the redirects directory, cmake --graphviz.
From docs only (no Conan or vcpkg on this host): which conan graph explain, conan graph info and conan list --graph output, and which VCPKG_TRACE_FIND_PACKAGE and vcpkg depend-info output, answer the same questions; cite docs.conan.io and learn.microsoft.com pages.
House shape: read skills/jvm-dependency-triage/ and skills/bazel-diagnose/ in this repository for the procedure format the skill must follow.
DECIDE: the ordered triage procedure (symptom, first command, how to read its output, the rule ID that fixes it); the rule IDs it cites; the bounded list of MUST rows it repeats; mark any step the measurement could not demonstrate.
```

**Dive `modernize-procedure`** · family `CMK-TGT` · kind `exemplar` · label "The cmake-modernize procedure: a legacy tree to target-based and consumable" · **revise after wave 2**

```
REVISE AFTER WAVE 2: the conversion order comes from consumable-library/usage-requirements-in-the-wild and the end state from consumable-library/install-round-trip-and-cps and consumable-library-shape; do not start before those three land.
Sources: CMake Cookbook chapter 15 'Porting a Project to CMake' (raw README of dev-cafe/cmake-cookbook and the chapter's recipe directories); Mastering CMake 'Converting Existing Systems To CMake' (cmake.org/cmake/help/book/mastering-cmake/); the CMake Tutorial steps at tag v4.4.2; Effective Modern CMake (gist mbinna); this repository's skills/bazel-adopt/ for the house shape of a once-per-repository adoption procedure.
Corpus evidence (/home/mherwig/.cache/research-lang/exemplars/cmake; cite repo@newsha:path:line): the repos where usage-requirements-in-the-wild found legacy concentrations; madler__zlib, curl__curl and libuv__libuv as long-history C projects carrying old and new forms side by side; friendlyanon__cmake-init as the target end state.
Pin down each step with its entry check and exit check: inventory (the greps from M-E-01 to M-E-03, M-B-04, M-C-03); choosing the floor (M-B-01); converting directory-scoped state to targets in dependency order; fixing link keywords; moving flags and standards to targets or presets; gating developer-only machinery on PROJECT_IS_TOP_LEVEL; adding install and export with a consumer round trip; the as-subproject smoke build; the configure gate and gersemi in CI; optional CPS and pkg-config; and what must never happen in one diff (the reviewable-unit limit).
DECIDE: the procedure cmake-modernize ships (steps, checks, stop conditions); the rule IDs each step cites; what the skill refuses to do automatically.
```

### 6. `install-edges` — Packaging edges: Windows, CPack, SBOM, distros

**Dive `packaging-edges`** · family `CMK-INST` · kind `web` · label "Packaging edges: Windows runtime DLLs, CPack defaults, SBOMs and distro recipes"

```
Close the install-and-export rows wave 2 did not reach. There is no Windows host: every Windows row is read, not measured, and must say so.
Fetch at tag v4.4.2: Help/command/install.rst (RUNTIME_DEPENDENCY_SET, IMPORTED_RUNTIME_ARTIFACTS), Help/manual/cmake-generator-expressions.7.rst (TARGET_RUNTIME_DLLS), Help/command/file.rst (GET_RUNTIME_DEPENDENCIES) and CMP0207; Help/manual/cpack-generators.7.rst plus CMP0206, CMP0172, CMP0161, CMP0133; Help/command/export.rst for export(EXPORT) and the package registry (CMP0090); Help/dev/experimental.rst for GENERATE_SBOM and the install(SBOM) signature; Help/variable/CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO.rst (is the CMAKE_EXPERIMENTAL_FIXME placeholder still there at v4.4.2?). Distro side: fedoraproject.org/wiki/Packaging:Cmake and Changes/CMake_drop_install_vars, wiki.debian.org/Multiarch/Compiling, docs.brew.sh Formula std_cmake_args, conda-forge.org/docs/how-to/basics/cmake/.
Evidence (corpus /home/mherwig/.cache/research-lang/exemplars/cmake; cite repo@newsha:path:line): the 11 repos that include(CPack), gflags__gflags and gabime__spdlog CPack files, any repo using TARGET_RUNTIME_DLLS.
Answer M-F-08, M-F-13, M-F-17, M-F-18, M-F-19, M-L-10.
DECIDE: which of these become rows (expected: the Windows DLL row as SHOULD grounded read-only, CPack gating as SHOULD, SBOM as a dated CONSIDER note, distro recipes out of scope with one sentence naming the traps), and the wording that keeps them out of the index.
```

## Deferred

Six rows reach neither wave. Everything else is assigned to a wave-2 or
wave-3 brief by its M-ID.

| ID | Why deferred | What would promote it |
|---|---|---|
| M-A-07 | An authoring decision, not research: the silent-pass paragraph is written from the rows that catch each pass, and wave-3 `presets-and-ci-shape` supplies what CI actually checks | Nothing to research; it is written at authoring time |
| M-B-09 | Moot: every floor ≥3.5 already sets the removed policies NEW, 33/33 exemplars clear 3.5, and 4.x errors on the `SET … OLD` itself (conflict 17) | A consumer found relying on a pre-3.5 policy through `CMAKE_POLICY_VERSION_MINIMUM` |
| M-E-18 | Two one-line guards with normative text already in hand (CMP0165); no measurement or corpus count changes the row | An agent failure observed in review |
| M-E-19 | IPO, unity builds and PCH are performance knobs with no correctness rule; 8/43, 5/43, 6/43 adoption | A consumer with a build-time budget, or a correctness bug traced to one of them |
| M-J-11 | File API and `cmake-instrumentation(7)` have no rule surface for either audience | An IDE-integration or build-profiling consumer |
| M-K-07 | "CMake plus a manager, or Bazel?" is a decision branch; comparison sets are never a rule surface (companion contract, [frame]), and BZL-CC-24 already covers the rules_foreign_cc half | Never as a rule; one decision-table line at authoring |

## Questions for the owner

Only decisions no research can settle. The program continues autonomously, so
each default **will** apply if unanswered.

1. **Which CMake floor does the published set assume?** Research can report
   distro versions (wave-2 dive `floors-policies-and-era`), but choosing whom to
   leave behind is yours. **Default:** rules are written for 3.25, verified on
   3.31.12 and 4.4.2, with a `(CMake ≥ X.Y)` gate on every newer mechanism;
   find_ocx's 3.19 stays legal and below-floor rows name the fallback. The dive
   may move this to 3.24 or 3.28 only on distro evidence, and says so.
2. **Are find_ocx's measured defects filed as issues on `ocx-sh/find_ocx`?**
   **Default:** no issue is filed by this program. The consolidation writes a
   short handoff note listing what stands (the `cmake_policy(POP)` placement;
   explicit `TLS_VERIFY ON` for the 3.19–3.30 range; half the test families
   skipping the configure gate; the CI examples matrix missing `frozen_index`)
   and what is withdrawn (the memo `FORCE` defect, conflict 16).
3. **Does `cpp-packaging` ship with no fleet consumer?** The fleet has zero
   Conan and vcpkg manifests ([fleet] headline). **Default:** yes, grounded on
   upstream sources and the corpus, as the Bazel program shipped its C++ file.
4. **Do both skills ship, or only triage?** **Default:** both —
   `cmake-dependency-triage` first; `cmake-modernize` is the one dropped if the
   budget bites.
5. **May this program propose a one-line pointer into `rules/bazel-quality/cpp.md`
   (Wrapped Foreign Builds → `CMK-BZL`) and the CPS-negative note?**
   **Default:** yes, as a proposed patch in the authoring PR; no `BZL-CC` row is
   written or changed.
6. **Is gersemi formatting a gate?** Research shows it is the only maintained
   formatter and that 0/46 exemplars run it. **Default:** SHOULD (`gersemi
   --check` in the index's gate block), never MUST, and no rule demands a
   `.gersemirc`.
7. **Bundle name: `cmake-essentials` or `cpp-essentials`?** **Default:**
   `cmake-essentials`, reserving `cpp-essentials` for a future C++-language set.
8. **Are distro and downstream packaging recipes in scope?** **Default:** no.
   The set ships what a distro needs *from* a project (GNUInstallDirs, relocatable
   exports, no absolute destinations) and one sentence naming the recipe traps
   (Homebrew `-Wno-dev`, conda-forge's unquoted `${CMAKE_ARGS}`).

## Explicitly not a defect

Frame suspicions and audit findings the evidence cleared. Nobody re-investigates
these.

- **find_ocx's quoting and list discipline.** 0 unquoted variables in 240
  `if()`-family comparisons, 0 bare `foreach(x ${list})` in 13 loops, every
  user-supplied `COMMAND` value quoted ([ocx] §4). The frame's fear that a
  1,500-line copy-and-own module would be sloppy on quoting does not hold.
- **find_ocx's unquoted argv-list forwarding** (`${platform_args}`,
  `${groups_args}`) — correct: each element must become its own argument
  ([ocx] §4).
- **`__ocx_set_result` writing `CACHE INTERNAL` without `FORCE`.** `INTERNAL`
  implies `FORCE` per the `set()` manual on 3.31.12 and 4.4.2 ([host] H4);
  behavioural confirmation is dive 1, experiment 6 (conflict 16).
- **`__ocx_snapshot_env`'s non-`FORCE` `CACHE STRING`** — the documented
  first-configure-wins contract, not a bug ([ocx] §2).
- **find_ocx's two unhashed trust-root downloads** (dist manifest,
  `SHA256SUMS`) — the chicken-and-egg shape every bootstrapper has ([ocx] §5).
  The finding that survives is narrower: no explicit `TLS_VERIFY ON` while the
  floor admits 3.19–3.30, where the default was off ([host] H5).
- **find_ocx mapping every Linux host to the musl release** — deliberate
  portability, matching rules_ocx ([ocx] §8).
- **`Findocx.cmake` without `include_guard`** — redundant work only; the
  `NOT TARGET ocx::ocx` guard protects the one operation that would fail
  ([ocx] §9).
- **Projects' *own* floors below 3.5** — 0 of 33 exemplars ([shape] §1). The
  4.0 break is a dependency risk (conflict 18).
- **Configure-time `ExternalProject` superbuild recursion** — none found in the
  corpus ([deps] §2).
- **"Hunter is dead"** — maintained; unadopted is the finding (conflict 9).
- **vcpkg port source pinning** — 40/40 sampled github-sourced ports carry
  `SHA512` ([deps] §5); no row needed beyond the port-author list.
- **Conan-1 imports in Conan Center** — 0/40 sampled recipes ([deps] §4); the
  residue row (M-M-07) targets consumer repositories, not CCI.
- **cmake-init's `PROJECT_IS_TOP_LEVEL` string comparison** — an intentional
  compat shim for pre-3.21 floors ([lint] §12), the pattern M-E-06 recommends
  below the gate.
- **The fleet's `test/`, `.tmp-cmake/` and `.probe-published/` trees** — probes
  and scratch, not consumers ([fleet] §1).
- **`cmake_policy(POP)` placement's practical severity** — real but low: the
  one function outside the pin runs only in script mode, where no includer's
  policy stack exists ([ocx] §3).

## Frame corrections

Frame premises the wave-1 evidence (and this map's host checks) overturned that
the frame's Corrections blocks do not already carry. One line each.

1. Correction 9's headline defect — `__ocx_set_result` lacking `FORCE` — is refuted: `CACHE INTERNAL` implies `FORCE` on 3.31.12 and 4.4.2 ([host] H4; [ocx] Gaps admitted no repro).
2. Correction 9's "0 of 5 `file(DOWNLOAD)` set `TLS_VERIFY`" needs its version: TLS verification defaults on since 3.31, so the exposure is find_ocx's 3.19–3.30 range plus an environment override ([host] H5).
3. Correction 1 and [canon]: CMake 4.4 ships **seven** diagnostic categories, not nine; `CMD_STRICT` and `CMD_NON_TARGET_DIRECTIVE` are 4.5/`master` only ([host] H2).
4. [lint]'s "4.4 not yet tagged" is wrong: 4.4.0 was tagged 2026-07-09, 4.4.3 on 2026-08-25 ([cps-v] row 1), and 4.4.2 runs on this host ([host] H1).
5. The body's verification kinds list "a `cmake-lint` … check name": struck — no maintained semantic CMake linter exists to cite; gersemi formats, it does not lint ([lint] §1-2, conflict 4).
6. The body's working rule name `cmake-quality` becomes `cmake-build` (house convention, conflict 14); hypothesis 1 ("one rule set") becomes two rules by the glob test (conflict 13).
7. The body's "neutral seam" framing for dependency providers is retired in shipped wording, not just demoted: providers are a user-owned single slot (conflict 6; [canon] Summary).
8. Correction 6 says eight repos duplicate one package across `find_package` and a fetch; the audit's own row names seven, and only three (arrow, protobuf, ccache) are first-class evidence ([deps] headline 2, §1).
9. Correction 8's "4 have no sync mechanism" rests on an audit that names five in its headline and four in its body and never read the CI files that mention bazel ([deps] headline 5 vs §8); pending dive 14.
10. The body says find_ocx "requires 3.19" as if that floor were exercised; it is never tested below 3.31, and `Findocx.cmake`'s 3.15 claim is untested too ([ocx] §3, §10).
11. The body's constraint that workers "measure files only, never run a build" is obsolete: real CMake 3.31.12, 4.3.4 and 4.4.2 and ninja 1.13.2 run on this host, and measurement is now the strongest evidence tier ([host] H1).
12. The exemplar corpus moved from the session scratchpad to `/home/mherwig/.cache/research-lang/exemplars/cmake` and was re-fetched on 2026-09-26; 33 of 46 SHAs changed, so the frame's SHA table is historical ([host] H8).
13. The body's open glob list is decided: `conan.lock` and `CMakeUserPresets.json` are IN; Conan profiles have **no fixed name** and cannot be globbed; `*.cmake.in`, `CMakeLists.txt.in` and `*.pc.in` are IN on corpus counts; `CPM.cmake` and `HunterGate.cmake` need no entry (Artifact set decision).
14. The frame's list of "package managers that matter" (hypothesis 2) drops Hunter to one row and raises FetchContent and CPM to equal standing with Conan and vcpkg (conflicts 7-9).
15. [shift]'s use of JetBrains' "State of C" 2025 as evidence for the FetchContent hypothesis is invalid for a C++ rule set: that survey is C-only; the ISO C++ 2024 numbers are the citable ones ([prac] §16-18).

## Wave 2 landed (2026-09-26)

Phase 6 (iterate), opus. Inputs: the six consolidations and their six
`verification-wave2.md` ledgers, the 14 wave-2 dives (opened only where a
surprise or a conflict needed it), the frame's Corrections blocks and this
map. Nothing below edits a consolidation; where two consolidations disagree,
the resolution here binds phase 7 and the wave-3 revisers.

**Verdict: next wave.** Wave 2 produced 77 MUST rules and roughly 70 ranked
agent failure modes, so the convergence test (no new MUST, no new failure
mode, no load-bearing open question) is not met. Three planned families have
no rules at all (`CMK-LANG`, `CMK-CI`, `CMK-PKG`), and seven load-bearing
questions remain open: a real cmake-conan provider behind MUST `CMK-TC-05`,
`<Name>_ROOT` against manager-injected paths, the `LANGUAGES NONE` blindness
to `lib64`, PIC through `CMAKE_POSITION_INDEPENDENT_CODE`, a multi-config
round trip for MUST `CMK-INST-01`, whether download timeouts become a MUST,
and whether `unshare -rn` (the verification of MUSTs `CMK-DEP-16` and
`CMK-BZL-01`) runs on a stock CI runner.

**Owner defaults.** No wave-2 evidence changes any of the eight "Questions for
the owner" defaults. Q1: the floor stays 3.25, confirmed by the distro table
(Debian 12 ships 3.25.1; Ubuntu 22.04's apt 3.22.1 is below every candidate,
so lowering the floor would not help; `cmake-versions-and-gate.md` conflict 8).
Q2: no issue is filed, and the find_ocx handoff note grows (listed under
Owner decisions below). Q5 stays the pointer plus the CPS negative; the two
extra caller-side rows (#329, #1129) are offered to the Bazel owner, not
applied (`cmake-bazel-seam.md` Open questions 1). Q6: gersemi stays SHOULD
(`CMK-CORE-04`, `CMK-MOD-15`). Q3, Q4, Q7 and Q8 are untouched.

### (a) Per group

| Group | Consolidation | IDs | MUST | Conflicts resolved | Verifier: checked / confirmed / corrected / unverifiable | Follow-ups named |
|---|---|---|---|---|---|---|
| package-managers | `cmake-package-managers.md` | 23 (CONAN 12, VCPKG 11) | 15 | 11 | 54 / 40 / 12 / 2 | 5: conan-measured-flows (narrowed to the provider's four unmeasured limits), windows-abi-measurement, conan-recipe-authoring, vcpkg-port-authoring, manager-ci-caching |
| bazel-seam | `cmake-bazel-seam.md` | 15 (BZL) | 10 | 15 | 57 / 37 / 14 / 6 | 4: rules_foreign_cc under real Bazel, `unshare -rn` on CI runners, BazelDeps end to end, the absolute-destination diagnostic (resolved in verify wave 2, M4x) |
| module-authoring | `cmake-module-authoring.md` | 21 (MOD 16, TEST 5) | 13 | 10 | 44 / 31 / 13 / 4 | 4: download timeouts, Windows `ENCODING`, hint precedence against manager toolchains, the corpus `WILL_FAIL` classification |
| versions-and-gate | `cmake-versions-and-gate.md` | 14 (CORE 5, VER 9) | 9 | 10 | 51 / 37 / 8 / 6 | 3: `-Werror=uninitialized` noise, `-Werror=dev` in 4.5, the 3.x remedy for 3.5–3.9 dependencies |
| dependency-seam | `cmake-dependency-seam.md` | 25 (DEP 18, TC 7) | 14 | 13 | 62 / 45 / 13 / 4 | 4: CPS import order (answered in verify wave 2), a real cmake-conan provider, toolchains-and-cross, corpus scope classification |
| consumable-library | `cmake-consumable-library.md` | 29 (INST 20, TGT 9) | 16 | 14 | 34 / 23 / 10 / 4 | 6: PIC through the variable, a CMK-DEP row for `LANGUAGES NONE`, multi-config and Windows install edges, CPS naming, pkg-config multiarch depth, the language parser |
| **Total** | 6 files | **127** in 11 families | **77** | **73** | **302 / 213 / 70 / 26** | 26 named, 2 already answered |

Families still without a ruleset: `CMK-LANG` (language.md), `CMK-CI`
(presets-and-ci.md) and `CMK-PKG` (the cpp-packaging index). The MUST share is
61 % (77 of 127), far above what rule-distillation's Severity section calls
"genuinely unusual"; six MUSTs are duplicates that collapse under (e) below.

### (b) Surprises

Verdicts: **promote** (a wave-3 dive owns it), **fold** (a named wave-3 brief
carries it as an item), **defer** (an M-ID holds it), **reject** (settled by a
wave-2 rule or refuted; no further research).

| # | Dive | Surprise | Verdict | Reason |
|---|---|---|---|---|
| 1 | module-testing-and-formatting | gersemi without `--definitions` silently keeps the original layout | reject | Settled: `CMK-MOD-15` (C14 measured) |
| 2 | module-testing-and-formatting | a forwarded COMMAND keyword explodes one token per line without a hint | reject | Settled: `CMK-MOD-16` hint clause (C12) |
| 3 | module-testing-and-formatting | `--definitions` is file-scoped; `tests/helpers.cmake` was never named | reject | Settled: `CMK-MOD-15` says "every file or directory" |
| 4 | module-testing-and-formatting | `ocx.cmake:1327` uses a reassigned `args` list, defeating detection | reject | Corrected by verify wave 2: the cause is nesting in `if()` (`CMK-MOD-16`) |
| 5 | module-testing-and-formatting | cmake-conan tests one pinned CMake (3.31.7), not a matrix | reject | Recorded as a `CMK-TEST-01` violator row |
| 6 | module-testing-and-formatting | 3 of 7 repos with a `.cmake-format` config still run it in CI | reject | Recorded under `CMK-CORE-04` Violated |
| 7 | conan-cmake-integration | abseil's `conanfile.py` is Conan-1 and cannot run under Conan 2 | reject | `CMK-CONAN-01` violator row; filing upstream is an owner call (default: no) |
| 8 | conan-cmake-integration | Conan's two pages disagree on `CMakeConfigDeps` status | reject | Settled: experimental (`cmake-package-managers.md` conflict 1); re-check trigger is owner decision 1 |
| 9 | conan-cmake-integration | `incubating.rst` calls Workspaces "generally available as experimental" | defer M-M-10 | 0 corpus adopters, P2; corrects map conflict 22 (frame correction 7 below) |
| 10 | conan-cmake-integration | cmake-conan#174: the MSVC runtime genex gap is open since 2019 | fold | `targets-and-abi/standards-modules-and-abi` (M-E-12, M-L-05) |
| 11 | conan-cmake-integration | `CMakeConfigDeps` needs no `build_context_activated` | reject | Encoded in `CMK-CONAN-06` rationale |
| 12 | conan-cmake-integration | CCI's template still teaches `CMakeDeps` | fold | `package-managers/conan-recipe-authoring` decides the producer-side generator |
| 13 | vcpkg-manifests-and-caching | vcpkg-tool 2026-09-26 released on the day | reject | Pinned in `cmake-package-managers.md`; frame correction 4 |
| 14 | vcpkg-manifests-and-caching | vcpkg-artifacts still present after the announced removal | reject | Settled: `CMK-VCPKG-10` "announced, not executed", re-check per tag |
| 15 | vcpkg-manifests-and-caching | `windows.cmake`'s non-FORCE runtime cache entry | fold | Mechanism refuted for consumers (`CMK-VCPKG-06`); the port-build half goes to `package-managers/vcpkg-port-authoring` |
| 16 | vcpkg-manifests-and-caching | an unknown binary-source token is a hard parse error | reject | Settled: `CMK-VCPKG-08` |
| 17 | vcpkg-manifests-and-caching | zero provider or CPS support anywhere in vcpkg-tool | reject | Settled: `CMK-VCPKG-11` |
| 18 | vcpkg-manifests-and-caching | vcpkg-tool and the registry release on separate trains | fold | `package-managers/tool-provisioning-and-supply-chain` (lock-of-record row pins both) |
| 19 | toolchain-composition | two top-level includes both registering a provider: last wins silently | reject | Settled: `CMK-TC-04` |
| 20 | toolchain-composition | `framework.bzl` no longer holds the toolchain logic | reject | Frame correction 10; `cmake-bazel-seam.md` cites `cmake_script.bzl` |
| 21 | toolchain-composition | `vcpkg.cmake` self-guards with `VCPKG_TOOLCHAIN` | reject | `CMK-TC-06` rationale |
| 22 | toolchain-composition | the cmake-conan provider never touches `CMAKE_TOOLCHAIN_FILE` | fold | `skills/dependency-triage-procedure` runs the real provider (failure 3) |
| 23 | toolchain-composition | conan#12341: Conan declined a generic chainload toolchain | reject | Mischaracterised; corrected by verify wave 2 (`CMK-TC-02`) |
| 24 | toolchain-composition | aminya hand-rolled the top-level-includes append plus `DEFER` | reject | `CMK-TC-04` violator, `CMK-TC-05` positive |
| 25 | pinning-offline-and-cpm | curl's harness defaults `FROM_GIT_TAG` to `"master"` | reject | `CMK-DEP-01` violator row |
| 26 | pinning-offline-and-cpm | grpc's example pins a placeholder that is not a ref | reject | `CMK-DEP-01` violator row |
| 27 | pinning-offline-and-cpm | duckdb's opaque parameter resolves to 40-hex at 23/23 sites | reject | `CMK-DEP-01` "resolve every variable" clause |
| 28 | pinning-offline-and-cpm | arrow's 46 pins live in `versions.txt`, not `.cmake` | reject | `CMK-DEP-01` verify greps without an `--include` filter |
| 29 | pinning-offline-and-cpm | OpenSSF Scorecard still ignores CMake | reject | `CMK-DEP-01` rationale |
| 30 | pinning-offline-and-cpm | glfw's `file(DOWNLOAD)` runs at build time only | reject | `CMK-DEP-16` rationale; `unshare -rn` is the check |
| 31 | dual-build-sync-and-conan-bazel | abseil and googletest sync through Kokoro `ci/*.sh` | reject | `CMK-BZL-09` grep reads `ci/` and `tools/internal_ci/` |
| 32 | dual-build-sync-and-conan-bazel | the true "no sync" count is 3 | reject | Superseded by verify wave 2: 2 (zlib, nlohmann/json) |
| 33 | dual-build-sync-and-conan-bazel | protobuf generates its CMake pins from `MODULE.bazel` | reject | `CMK-BZL-10` |
| 34 | dual-build-sync-and-conan-bazel | grpc generates `CMakeLists.txt` from Bazel metadata | reject | `CMK-BZL-11` (verify wave 2 adds the reverse direction) |
| 35 | dual-build-sync-and-conan-bazel | `BazelDeps` works under Bzlmod through `include()` | defer M-K-05 | End-to-end run needs Bazel 9.2; `which bazel bazelisk` finds neither on this host (2026-09-26); SHOULD row, 0 adopters |
| 36 | dual-build-sync-and-conan-bazel | drift is minor-version only (yaml-cpp, benchmark) | reject | `CMK-BZL-10` applied row |
| 37 | gate-and-language-semantics | 4.4.2 accepts `-Werror=dev` with an ungateable notice | reject | Settled: `CMK-CORE-01` |
| 38 | gate-and-language-semantics | yaml-cpp's `3.15..4.3` collapses silently to 3.15 | reject | Settled: `CMK-VER-01` |
| 39 | gate-and-language-semantics | unquoted `ARGN` forwarding erases an explicit empty argument | promote | `language/language-rules` (M-C-06, extended) |
| 40 | gate-and-language-semantics | `return(PROPAGATE)` in a top-level `block()` truncates the listfile | promote | `language/language-rules` (M-C-05, extended) |
| 41 | gate-and-language-semantics | two vendored copies behind `include_guard(GLOBAL)` both run | reject | Settled: `CMK-MOD-07` |
| 42 | gate-and-language-semantics | `option()` coerces only the TYPE of an existing entry | promote | `language/language-rules` (new row M-C-10) |
| 43 | wrappable-cmake-contract | rules_foreign_cc 0.16.0 kept default 3.31.12, ceiling 4.0.7 | reject | Settled: `CMK-BZL-08`; frame correction 3 |
| 44 | wrappable-cmake-contract | CPS can never run under the wrapper's own CMake | reject | Settled: `CMK-BZL-08` |
| 45 | wrappable-cmake-contract | PIC arrives as a flag (PR #1440); #421 still open | fold | `targets-and-abi/shared-static-visibility-pic` item 1 |
| 46 | wrappable-cmake-contract | #329 and #1129 open with no movement | defer M-K-01 | Bazel-side handback rows; owner question 1 of `cmake-bazel-seam.md` |
| 47 | wrappable-cmake-contract | `experimental_validate_outputs_in_action` (default True) in 0.16.0 | defer M-K-08 | Bazel-side (`BZL-CC-23`); goes in the handback note, not a CMK row |
| 48 | wrappable-cmake-contract | rules_foreign_cc's own example wraps a 2.8.4 floor | reject | `CMK-BZL-04..07` applied row |
| 49 | module-contracts | CPM mutates four policy defaults with no PUSH/POP | reject | `CMK-MOD-06` and `CMK-DEP-05` (measured C6) |
| 50 | module-contracts | `<Name>_ROOT` acts only inside `find_package` | reject | `CMK-DEP-14` (measured C5; widened to Config files in verify wave 2) |
| 51 | module-contracts | upper-case `<NAME>_ROOT` is the consumer's opt-in | reject | `CMK-MOD-12` |
| 52 | module-contracts | `conan_provider.cmake` has one unchecked `xcrun` probe | reject | `CMK-MOD-04` applied row |
| 53 | module-contracts | ccache's `FindZstd.cmake` breaks three conventions | reject | `CMK-MOD-08`/`-09` violator rows |
| 54 | module-contracts | the audit's memo `FORCE` defect was already refuted | reject | Map conflict 16 closed by `[gate]` §6 |
| 55 | resolution-order-and-providers | a Config-found `MakeAvailable` creates no bare target | reject | `CMK-DEP-08` |
| 56 | resolution-order-and-providers | the `OVERRIDE_FIND_PACKAGE` stub passes any version gate | reject | `CMK-DEP-09` |
| 57 | resolution-order-and-providers | CMP0077 defeats a dependency's own test-guard toggle | fold | `testing-and-ci/ctest-contract` (M-I-01 row) |
| 58 | resolution-order-and-providers | top-level includes can be set by a plain `set()` before `project()` | reject | `CMK-TC-04` forbids it (C1); frame correction 13 |
| 59 | resolution-order-and-providers | `CMAKE_TOOLCHAIN_FILE ... FORCE` after `project()` is a silent no-op | reject | `CMK-TC-03` |
| 60 | resolution-order-and-providers | 4.4.2 probes `cps/` paths on every CONFIG search | reject | `CMK-DEP-11` names it as noise |
| 61 | floors-policies-and-era | Ubuntu 22.04 ships 3.22.1 | reject | `CMK-VER-03` (provision, do not lower the floor) |
| 62 | floors-policies-and-era | experimental UUIDs rotate between minors | reject | `CMK-VER-09` |
| 63 | floors-policies-and-era | `master` carries a third UUID generation | reject | `CMK-VER-09` (tag, never master) |
| 64 | floors-policies-and-era | a stale UUID is silent on 4.4.2 | reject | Corrected by verify wave 2: a Makefiles-generator artefact (`CMK-VER-09`) |
| 65 | floors-policies-and-era | "removed" Find modules still ship behind their policy's OLD | promote | `dependency-seam/scope-classification-and-find-module-migration` (M-G-16 has no owner) |
| 66 | floors-policies-and-era | VS 10 2010 was removed exactly at 3.25 | reject | `CMK-VER-04` table |
| 67 | usage-requirements-in-the-wild | 35 % bare links becomes 13.3 % in library core code | reject | `CMK-TGT-01`; frame correction 8 |
| 68 | usage-requirements-in-the-wild | M-C-07 has 0 real instances in 46 repos | defer M-C-07 | Re-prioritised P1 → P3; a reading heuristic at most |
| 69 | usage-requirements-in-the-wild | grpc's 56k-line generated list would dominate counts | reject | `CMK-CORE-05` scope clause |
| 70 | usage-requirements-in-the-wild | one regex fix cuts Kitware's unquoted-if hits 501 → 128 | fold | `language/language-rules` (M-C-03) |
| 71 | usage-requirements-in-the-wild | `CMAKE_CXX_STANDARD_EXTENSIONS` has 0 uses because it does not exist | reject | `CMK-TGT-07` failure mode |
| 72 | usage-requirements-in-the-wild | two parser bugs (bracket comments, quoted parens) | fold | `language/language-rules` fixes `parse.py` first |
| 73 | consumable-library-shape | an absolute `install(EXPORT)` destination bakes `_IMPORT_PREFIX` | reject | `CMK-INST-02` |
| 74 | consumable-library-shape | rapidjson ships a non-relocatable, unnamespaced package | reject | `CMK-INST-02/05/06` violator rows |
| 75 | consumable-library-shape | cmake_template's packaging helper fetches at configure | reject | `CMK-INST-19`, `CMK-DEP-03` |
| 76 | consumable-library-shape | the audit's "no consumer traced" came from a CI-YAML-only grep | reject | `CMK-INST-18`; frame correction 9 |
| 77 | consumable-library-shape | glfw exports with no NAMESPACE at all | reject | `CMK-INST-06` |
| 78 | consumable-library-shape | nlohmann/json is relocatable with rapidjson's idiom | reject | `CMK-INST-02` (the discriminator) |
| 79 | install-round-trip-and-cps | "Config beats CPS by default" | reject | Refuted by the consolidation and two verifiers (`CMK-DEP-11`, `CMK-INST-14`) |
| 80 | install-round-trip-and-cps | `VERSION_SCHEMA rpm` refuses every request | reject | Corrected: an exact string is accepted (`CMK-INST-16`) |
| 81 | install-round-trip-and-cps | a CPS genex error fails configure while build and install pass | reject | `CMK-INST-17` |
| 82 | install-round-trip-and-cps | `LANGUAGES NONE` makes `find_package(CONFIG)` blind to `lib64` | promote | `dependency-seam/cross-compile-find-root` item 4 (new row M-G-21) |
| 83 | install-round-trip-and-cps | `-Werror=install-absolute-destination` is silently accepted before 4.4 | reject | `CMK-INST-10`, `CMK-BZL-04` |
| 84 | install-round-trip-and-cps | an absolute `DESTINATION` cannot be relocated even by reconfigure | reject | `CMK-INST-10` |

Tally: 5 promote, 9 fold, 5 defer, 65 reject. The rejects are mostly surprises
that a wave-2 rule already encodes, which is the expected shape at this point.

### (c) Map rows affected

**Covered by an ID** (row → rule):
- A: M-A-01 → CORE-01 · M-A-02 → CORE-01 (children), CORE-03 · M-A-03 → CORE-04, MOD-15, MOD-16 · M-A-04, M-A-05 → CORE-04 · M-A-06 → CORE-05.
- B: M-B-01 → VER-02, VER-03 (floor 3.25 decided) · M-B-02 → VER-03, TEST-01 · M-B-03, M-B-10, M-B-11 → VER-04 · M-B-04 → VER-05 · M-B-05 → DEP-15 (text) and VER-06 (see (e) 1) · M-B-06 → VER-01, VER-02 · M-B-07 → VER-08 · M-B-08 → VER-09.
- D: M-D-01 → MOD-05 · M-D-02 → MOD-07 · M-D-03 → MOD-08 · M-D-04 → MOD-09 · M-D-05 → MOD-01..03 · M-D-06 → MOD-04 · M-D-09 → MOD-10 · M-D-10 → MOD-11 · M-D-11 → MOD-14 · M-D-12 → MOD-12 · M-D-14 → MOD-02, MOD-07 · M-D-15 → MOD-13.
- E: M-E-01 → TGT-01 · M-E-02 → TGT-03 · M-E-03 → TGT-04 · M-E-04 → TGT-05..07, CONAN-10 · M-E-05 → TGT-02 · M-E-10 → TGT-08 · M-E-11 → TGT-09.
- F: M-F-01 → INST-01 · M-F-02 → INST-01, INST-02, BZL-05 · M-F-03 → INST-03 · M-F-04 → INST-04, INST-08 · M-F-05 → INST-09 · M-F-06 → INST-10 · M-F-07 → INST-11 · M-F-09 → INST-20 · M-F-11 → INST-13, INST-14 · M-F-12 → INST-16, INST-17 · M-F-13 → INST-13 (grep) · M-F-14 → INST-12.
- G: M-G-01 → DEP-08, DEP-09 · M-G-02 → the resolution table (no ID, ships as a table) · M-G-03 → DEP-01..03 · M-G-04 → DEP-16 · M-G-05 → DEP-04 · M-G-06 → DEP-07 · M-G-07 → DEP-12 · M-G-09 → DEP-13, DEP-14 · M-G-10 → DEP-18 · M-G-11 → DEP-15 · M-G-12 → DEP-02, DEP-05 · M-G-13 → DEP-06 · M-G-15 → DEP-11 · M-G-17 → DEP-17 · M-G-18 → DEP-16, BZL-01.
- H: M-H-01 → TC-01 · M-H-02 → TC-03 · M-H-03 → TC-04 · M-H-04 → TC-05 · M-H-06 → TC-07 · M-H-07 → TC-06 · M-H-08 → TC-04 wording.
- I: M-I-04 → TEST-01..05. K: M-K-01 → BZL-01..07 · M-K-02 → BZL-08 · M-K-03 → BZL-09, BZL-11 · M-K-04 → BZL-10, BZL-12, BZL-13 · M-K-05 → BZL-14 · M-K-06 → BZL-15 · M-K-08 → Verdict 8 handback.
- L: M-L-02 → TC-02 · M-L-03 → CONAN-09, VCPKG-01, DEP-01..03 (the cross-manager index row is still unwritten) · M-L-05 → CONAN-10, VCPKG-06 (Windows link unmeasured).
- M: M-M-01 → CONAN-04, CONAN-05 · M-M-02 → CONAN-07 · M-M-03 → CONAN-03, CONAN-12 · M-M-04 → CONAN-09 · M-M-05 → CONAN-10 · M-M-07 → CONAN-01, CONAN-02 · M-M-08 → CONAN-08 · M-M-11 → the triage skill.
- N: M-N-01 → VCPKG-01, VCPKG-02 · M-N-02 → VCPKG-04 · M-N-03 → VCPKG-06, VCPKG-07 · M-N-04 → VCPKG-08 · M-N-05 → VCPKG-09 · M-N-06, M-N-09 → VCPKG-10 · M-N-08 → VCPKG-03.

**Split:** M-F-10 into INST-06 (namespace present, MUST), INST-07 (equals the
package name, SHOULD) and INST-15 (equal before CPS, MUST, measured break).
M-D-05 loses its timeout clause to new row M-D-16 (timeouts, wave 3). M-C-05
and M-C-06 gain the measured truncation and empty-argument traps.

**Merged:** M-B-05 and M-G-11 into one injection-scope rule (`CMK-DEP-15`).
M-L-02 into `CMK-TC-02` (one ban), with `CMK-VCPKG-05` as its vcpkg trigger.
M-E-09's wrap half into the `CMK-BZL-03` probe.

**New rows:**

| ID | Question | Priority | Owner (wave 3) |
|---|---|---|---|
| M-C-10 | Does `option()` over an existing cache entry keep a non-boolean value under a BOOL type, and what must a project check? | P2 | `language/language-rules` |
| M-D-16 | Does a module download with no `TIMEOUT` or `INACTIVITY_TIMEOUT` block configure forever on a stalled server, and is either a MUST? | P1 | `module-authoring/network-timeouts-and-platform-edges` |
| M-G-21 | Is `find_package(CONFIG)` in a `LANGUAGES NONE` project blind to `lib64`, `lib32` and `lib/<tuple>` (measured on 3.31.12 and 4.4.2 for `lib64`, also through `<Pkg>_ROOT`), and what is the fix? | P1 | `dependency-seam/cross-compile-find-root` |

**Re-prioritised:** M-C-07 P1 → P3 (0 real instances in 46 repos). M-E-01
stays P0, but MUST only for library targets (13.3 % core, 32.0 % scaffold).
M-G-14 closed as not a defect (`branch =` in `.gitmodules` does not float a
gitlink; `cmake-dependency-seam.md` failure mode 13). M-D-07, M-D-08, M-D-13
and M-F-15 dropped by their consolidations (argued only, or no measured
failure). M-M-10 drops to a verdict line (0 adopters).

**Orphans found:** M-G-16 (`CMK-VER-07` hands the replacement table to
CMK-DEP, which has no row); M-G-08 (no rule, no drop); M-E-06 and M-I-01
(measured in `resolution-order-and-providers.md` §7, no ID). All four are in
wave-3 briefs below.

**Deferred after wave 2** (joins the map's Deferred table):

| ID | Why deferred | What would promote it |
|---|---|---|
| M-K-01 (real Bazel run) | No Bazel on the host; `CMK-BZL-06` stays SHOULD on the simulation | A Bazel 9.2 binary on the host, or a consumer reporting #1129 |
| M-K-05 (BazelDeps end to end) | Same; SHOULD row with 0 adopters | Same |
| M-A-02 (`-Werror=uninitialized` noise) | `CMK-CORE-03` is CONSIDER; the count needs full clones | Owner asks to raise CORE-03 |
| `CMK-CORE-01` under 4.5 | 4.5.0 is not released | Re-measure `-Werror=dev` on 4.5.0 the day it ships |
| M-L-05 (Windows LNK2038 run) | No Windows host; wave 3 gathers issue-tracker evidence only | A Windows runner |
| M-M-02 (provider limits beyond sequencing) | `CMK-CONAN-07` is SHOULD and the provider is opt-in; sequencing moves to the triage dive | A consumer that makes the provider its default |
| M-F-17, M-F-19, M-L-10 | P2/P3; CPack, SBOM and distro recipes bind no measured failure | A packaging consumer |
| M-M-10 | 0 adopters; `incubating.rst` still says "experimental" | A consumer using workspaces |

### (d) Frame corrections

1. CPS mini-wave result, "import limited to `simple`/`custom` version schemas": `custom`, `rpm`, `dpkg` and `pep440` all accept only the exact version string; only `simple` compares by order (`CMK-INST-16`, measured on 4.3.4 and 4.4.2 in verify wave 2).
2. CPS mini-wave and map conflict 5: a valid `X.cps` beside `XConfig.cmake` is what `find_package` loads on 4.3+, and a rejected `.cps` falls through silently (`CMK-DEP-11`, `CMK-INST-14`).
3. Era re-check, "rules_foreign_cc 0.16.0 has no fixed default CMake": the tag commit `931cb33cf8` defaults to 3.31.12 with a 3.19.8–4.0.7 table; frame correction 8's numbers stand (`CMK-BZL-08`).
4. Era re-check, "vcpkg-tool 2026-07-27" and "experimental gates and UUIDs unchanged": vcpkg-tool 2026-09-26 is current, and 4 of 6 gate UUIDs rotated between 4.3.4 and 4.4.2 (`CMK-VER-09`, M5).
5. Correction 1, "vcpkg retires vcpkg-artifacts after 2026-07-01": announced, not executed; still in vcpkg-tool at 2026-09-26 (`CMK-VCPKG-10`).
6. Correction 1, "`x-gha` removed": it now warns and exits 0, so a CI that names it loses its cache silently (`CMK-VCPKG-08`).
7. Correction 1 and map conflict 22, "Workspaces graduated at 2.31": `incubating.rst` still says "generally available as experimental", and 2.29–2.31 changed the `conanws.py` contract.
8. Correction 7, "35 percent of target_link_libraries calls are bare": 13.3 % in library core code, 32.0 % in tests and examples (`CMK-TGT-01`).
9. Correction 8 and map conflict 20, "4 dual repos have no sync": 2 (zlib, nlohmann/json); 7 build and test both, Catch2 and gflags build Bazel only, and generation runs both ways (`CMK-BZL-09`, `-11`). The deps audit's "7 install jobs, none traced to a consumer" is 3 of 5 traced (`CMK-INST-18`).
10. Map M-K-01 brief: rules_foreign_cc's toolchain synthesis and `_INIT` seeding live in `foreign_cc/private/cmake_script.bzl`; `framework.bzl` keeps only the `block-network` requirement (`:589-591`).
11. Correction 2 and map conflict 18, "inject `CMAKE_POLICY_VERSION_MINIMUM=3.5`": the variable is 4.0+ (unknown to 3.31.12), and 3.5 clears only the hard error; 3.5–3.9 is still a gate error on 3.31 and 4.4, so the value that clears both tiers is 3.10 (`cmake-versions-and-gate.md` M8, M9).
12. Map conflict 17 and M-G-11, "`CMAKE_POLICY_DEFAULT_CMP0077=NEW` is the fix": only as a set/restore around the one add; the global form masks every later dependency (`CMK-DEP-15`, C3).
13. Correction 4, "registration counts only inside `CMAKE_PROJECT_TOP_LEVEL_INCLUDES`": project code can also set or append that variable before `project()`, which hides or displaces the user's provider (C1, C2); `CMK-TC-04` forbids it.
14. Map conflict 8 and M-G-12, "CPM sets four policies NEW on load": the includer's policies are untouched; `CMAKE_POLICY_DEFAULT_CMP0077/0126/0135/0150` leak into every later subproject (C6, `CMK-DEP-05`).
15. Map "Explicitly not a defect", "Conan-1 imports in Conan Center 0/40": a whole-tree count finds 40 `from conans`, 35 `build_requires` and 24 names-only recipes in 2,002 folders (`CMK-CONAN-01..03`).
16. Map conflict 9 and M-G-13, "#858 is the June-2026 CMake-4 floor fix": CMake-4 fixes shipped per package across v0.26.7, v0.26.9 and v0.26.10; the pin floor is v0.26.10 (`CMK-DEP-06`).
17. The find_ocx audit (§9) and find_ocx's own docs, "`<X>_ROOT` feeds a following `find_program`/`find_library`": refuted (C5, `CMK-DEP-14`).
18. Body, "the harness dogfoods ... with `-Werror=dev`": the gate does nothing under `cmake -P` on 3.31.12 and 4.3.4, so find_ocx's four `-P` families are ungated there (C5, `CMK-TEST-02`).

### (e) Cross-consolidation contradictions so far

Each names the rule that keeps the text; the other ID stays stable and
becomes a one-line citation, per wave-plan's revision contract.

1. **`CMK-VER-06` vs `CMK-DEP-15` — both own the injection scope of `CMAKE_POLICY_VERSION_MINIMUM`, and they disagree on the value and the wrapped calls.** VER-06 says "3.10 clears both tiers" and names only `add_subdirectory`/`FetchContent_MakeAvailable`; DEP-15 adds `find_package` (verify wave 2) and cites arrow's 3.5 as its exemplar, which still fails the gate for a 3.5–3.9 dependency on 3.31 and 4.4 [M8]. **Resolved:** `CMK-DEP-15` keeps the text (it covers both knobs and all three calls), gains VER-06's port-tool exception and the value 3.10; arrow stays the *shape* exemplar with its value flagged. `CMK-VER-06` becomes a citation plus its 3.x clause, whose remedy the triage dive measures.
2. **`CMK-INST-10` vs `CMK-BZL-04` — one rule (no absolute install `DESTINATION`), two MUSTs, two greps.** INST-10's grep lacks the `--exclude='cmake_install.cmake'` that verify wave 2 showed is needed, or any configured in-source build tree reads red. **Resolved:** `CMK-INST-10` keeps the text (M-F-06 is its row) and adopts BZL-04's excludes; `CMK-BZL-04` keeps only the wrap rationale and cites INST-10.
3. **`CMK-TGT-04` (SHOULD, "never set or `string(APPEND)` the flags") vs `CMK-BZL-03` (MUST, "never overwrite; appending is fine").** Both bind the same population, a library shipping a package. The measured harm (M6) is overwriting: `set(CMAKE_C_FLAGS "-O2")` drops the toolchain's `_INIT` `-fPIC`. **Resolved:** `CMK-TGT-04` keeps the text and splits its severity in place: overwrite = MUST (M6), append = SHOULD; it adopts BZL-03's case-insensitive grep and the `MODULE` linker variable. `CMK-BZL-03` keeps only the `WRAP_SEED` probe and its "never make PIC depend on the variable" clause. The shared-static dive re-confirms the append case (item 6).
4. **`CMK-DEP-16` vs `CMK-BZL-01` — two corrected offline probes.** BZL-01 bans `FETCHCONTENT_FULLY_DISCONNECTED` from its probe (it masked a planted fetch); DEP-16 keeps it but adds `-DCMAKE_POLICY_DEFAULT_CMP0170=NEW`, which makes it strict. Both are measured and both are right for their question. **Resolved:** `CMK-DEP-16` keeps the general offline rule; every shipped probe carries the CMP0170 default; `CMK-BZL-01` keeps the wrap-specific form (no `FULLY_DISCONNECTED`, because the wrapper passes none) and cites DEP-16. The runner-portability of `unshare -rn` is in `testing-and-ci/presets-and-ci-shape`.
5. **`CMK-MOD-12` vs `CMK-DEP-13` — the same find_ocx line (`ocx.cmake:1200-1201`) is "holds" under MOD-12 and "violated" under DEP-13.** MOD-12 prescribes `<Name>_ROOT` as `CACHE PATH ... FORCE`; DEP-13 measured that re-pointing it leaves the old `<Pkg>_DIR` in force (C4). **Resolved:** `CMK-DEP-13` keeps the stickiness text; `CMK-MOD-12` gains one clause ("and `unset(<Name>_DIR CACHE)` when the value changes") and its find_ocx row flips to violated. Whether the hand-off still wins against manager-injected paths is `cross-compile-find-root` item 3.
6. **`CMK-TGT-05` vs `CMK-CONAN-10` — the top-level guard for `CMAKE_CXX_STANDARD`.** TGT-05 accepts `PROJECT_IS_TOP_LEVEL` or `NOT DEFINED`; CONAN-10 measured that any later top-level `set()` overrides the Conan profile with only a STATUS line. **Resolved:** the guard is `if(NOT DEFINED CMAKE_CXX_STANDARD)`; `PROJECT_IS_TOP_LEVEL` alone is not enough when a manager toolchain supplies the value. `CMK-TGT-05` keeps the text and changes in place; `standards-modules-and-abi` confirms from sources.
7. **`CMK-VCPKG-06` vs `CMK-CONAN-10` — where a project writes `CMAKE_MSVC_RUNTIME_LIBRARY`.** VCPKG-06 requires the project to set it for a static-CRT triplet but does not say where; CONAN-10's static grep flags every such `set()` after `project()`. **Resolved:** CONAN-10's grep runs only on legs that load `conan_toolchain.cmake` (they never meet, `CMK-TC-02`), and VCPKG-06 gains "in the preset's `cacheVariables` or before the first `project()`". Both keep their text; `standards-modules-and-abi` confirms placement.
8. **`CMK-TC-01`/`-03` vs `CMK-BZL-02` — an unguarded `set(CMAKE_TOOLCHAIN_FILE ...)` *before* `project()` passes TC-03's line-order grep but silently beats the caller's `-D` (M2).** **Resolved:** the "project code never sets it, except under `if(NOT DEFINED CMAKE_TOOLCHAIN_FILE)` or by chainloading the caller's value" clause moves into `CMK-TC-01`, which keeps the text; `CMK-BZL-02` keeps only the `CALLER_TOOLCHAIN_LOADED` probe. TC-01 and TC-03 adopt `-i` and `list(APPEND VCPKG_` from BZL-02 and VCPKG-04.
9. **`CMK-TC-02`, `CMK-VCPKG-05` and the unwritten CMK-PKG index row (M-L-02) — one ban stated three times.** **Resolved:** `CMK-TC-02` keeps the text; `CMK-VCPKG-05` keeps the vcpkg chainload trigger only; the CMK-PKG index cites TC-02 and owns only the manager-of-record choice (as `cmake-dependency-seam.md` Open question 2 proposed). `CMK-VCPKG-04` likewise stays as the vcpkg trigger of `CMK-TC-03`.
10. **`CMK-TEST-01` (MUST, module authors) vs `CMK-VER-03` (SHOULD, every project) — a CI leg at the declared floor.** Not a conflict of fact, a scope split. **Resolved:** both keep their text; VER-03 cites TEST-01 for modules, and neither restates the other.
11. **`CMK-CORE-01` cites "CMK-MOD's row (module-testing rule 2)" for harness inner configures.** That row shipped as `CMK-TEST-02`. **Resolved:** the citation becomes `CMK-TEST-02`; the same fix applies to `cmake-versions-and-gate.md`'s Violated list.
12. **`CMK-DEP-12` says "CPS always" honours a range; `CMK-INST-16` measured that any schema but `simple` rejects every inexact request.** **Resolved:** DEP-12 reads "CPS with the `simple` schema (or none)"; `CMK-INST-16` keeps the schema text.
13. **`CMK-CORE-04` names `gersemi --check` as the gate but not the `--diff` trap; `CMK-MOD-15` measured `--diff` exits 0.** **Resolved:** CORE-04 keeps the gate line and adds "never `--diff`"; MOD-15 keeps the `.gersemirc` configuration text.
14. **The shipped verification scripts do not follow the gate and floor rules they sit beside.** The `CMK-INST-01` round-trip consumer writes a bare `cmake_minimum_required(VERSION 3.25)` (a `CMK-VER-02` finding) and, like the `CMK-BZL` wrap simulation, configures without the configure gate (`CMK-CORE-01`). **Resolved:** shipped scripts use `3.25...4.4` and the gate spelled per binary; the rules keep their text.

### Owner decisions outstanding

Defaults apply if unanswered; none is changed by wave-2 evidence.

1. `CMK-CONAN-04` re-check trigger: flip the recommendation to `CMakeConfigDeps` on the first Conan changelog line that calls it stable. Default: yes, as a dated edit.
2. Upstream reports (abseil's Conan-1 recipe, 24 names-only CCI recipes, Kitware's two silent CPS export gaps). Default: none filed.
3. The bazel-quality handback: pointer line and CPS negative only; the `#329` and `#1129` rows and the `experimental_validate_outputs_in_action` note are offered, not applied. Default: as stated.
4. `CMK-BZL-09` stays SHOULD; `CMK-INST-18` stays SHOULD; `CMK-CORE-03` stays CONSIDER. Default: all three as stated.
5. The find_ocx handoff note (no issue filed) now lists: `CMK-DEP-13` (unset `<name>_DIR` on a changed root; code), `CMK-DEP-14` (docs claim), `CMK-MOD-03`, `-05`, `-14`, `-16`, `CMK-TEST-01..05`, `CMK-VER-02` (bare floors), the disabled 3.19 leg (default: relabel the floor untested), and the `LANGUAGES NONE` plus `PULL` caveat (M-G-21).
6. Family boundaries drawn in (e) 1, 8 and 9 (`CMK-DEP-15` over `CMK-VER-06`; `CMK-TC-01` over `CMK-BZL-02`; `CMK-TC-02` over the CMK-PKG index). Default: as resolved in (e).

### Commissioned for wave 3

Fourteen dives, four `measure`. Group slugs reuse an existing consolidation
where the dive deepens it (`dependency-seam`, `package-managers`,
`consumable-library`, `module-authoring` are revisions that hold every
existing ID stable and append a revision log); `targets-and-abi`,
`testing-and-ci`, `skills` and `language` create consolidations. The staged
groups `toolchains-and-cross` and `install-edges` are dissolved into
`dependency-seam` and `consumable-library`, because CMK-TC and CMK-INST
already live there. `versions-and-gate` and `bazel-seam` get no dive: their
open items are deferred (above) or folded (the 3.x remedy into triage,
`unshare -rn` into presets-and-ci-shape). Full briefs are in the phase-6
receipt; one line each:

1. `targets-and-abi/shared-static-visibility-pic` · CMK-TGT · **measure** — PIC through the variable on a property-less static target, `BUILD_SHARED_LIBS` flipping a fetched dependency, visibility, `CMAKE_LINK_LIBRARIES_ONLY_TARGETS`, prefix maps, and flag append vs overwrite ((e) 3).
2. `targets-and-abi/standards-modules-and-abi` · CMK-TGT · web — C++20 modules gate, `CMAKE_BUILD_TYPE`, sanitizers, the `CMAKE_CXX_STANDARD` guard ((e) 6), runtime placement ((e) 7) and issue-tracker LNK2038 evidence.
3. `testing-and-ci/ctest-contract` · CMK-TEST · web — the CI ctest line, required test properties, the 39-`WILL_FAIL` classification, and ID-bearing rows for M-I-01 and M-G-10.
4. `testing-and-ci/presets-and-ci-shape` · CMK-CI · exemplar — presets against CI jobs, launchers, compile databases, and whether `unshare -rn` runs on a stock ubuntu-24.04 runner.
5. `dependency-seam/cross-compile-find-root` · CMK-TC, CMK-DEP · **measure** — find-root modes, host tools, `<Name>_ROOT` against manager-injected paths, M-G-21 (`LANGUAGES NONE`), pkg-config sysroot, chainload precedence.
6. `dependency-seam/scope-classification-and-find-module-migration` · CMK-DEP · exemplar — violator rows for `CMK-DEP-07` and `-15`, the M-G-16 migration row, M-G-08's fate, corpus 3.x practice.
7. `package-managers/conan-recipe-authoring` · CMK-CONAN · exemplar — the producer-side rows over a 40-recipe CCI sample.
8. `package-managers/vcpkg-port-authoring` · CMK-VCPKG · exemplar — the port-author rows over a 40-port sample, the empty-overlay-port recipe, the port-build runtime override.
9. `package-managers/tool-provisioning-and-supply-chain` · CMK-PKG · web — the cpp-packaging index: decision tables, tool provisioning, per-manager CI cache keys (M-L-06), supply-chain gates, the one citable survey.
10. `skills/dependency-triage-procedure` · CMK-DEP · **measure** — six deliberate failures, including the real cmake-conan provider (`CMK-TC-05`) and the measured 3.x remedy for a 3.5–3.9 dependency.
11. `skills/modernize-procedure` · CMK-TGT · exemplar — the ordered cmake-modernize procedure with worked step lists for libuv and rapidjson.
12. `consumable-library/install-edges-and-multiconfig` · CMK-INST · **measure** — a multi-config round trip, CPS naming by case and `EXPORT_NAME`, pkg-config multiarch depth, `export(PACKAGE)`; Windows DLL rows read-only.
13. `language/language-rules` · CMK-LANG · exemplar — the CMK-LANG family: fix the parser, count M-C-03/04/06/08/09 with false-positive rates, fold the gate dive's measurements, add M-C-10.
14. `module-authoring/network-timeouts-and-platform-edges` · CMK-MOD · exemplar — download timeout defaults from source (M-D-16), Windows `ENCODING`, and the script-mode command list for `CMK-MOD-14`.


## Wave 3 landed (2026-09-26)

Phase 6 after wave 3. This section only appends; every earlier section stands
as written. Nothing here edits a consolidation. Where two consolidations
disagree, this section records the resolution and names the ID whose text the
drafters keep; the drafters apply it when they write the depth files.

Counting method, for every number below: a rule is a bolded definition line
(`**CMK-<FAM>-NN …`, or `- **CMK-<FAM>-NN · <SEV> ·` in versions-and-gate).
Its severity is the first MUST, SHOULD or CONSIDER on the rule's `Severity`
line. Reserved placeholders with no severity are excluded (CONAN-19,
VCPKG-19, PKG-05). Script:
`/home/mherwig/.cache/cmake-measure-scratch/rule-count/count.py`. It is not a
deliverable. CMK-TGT-04
counts as MUST because the overwrite half was split into a MUST
(targets-and-abi, carried table row TGT-04; wave-2 (e)3).

### (a) Per group

| Group | Path | IDs (live) | MUST | Conflicts resolved | Verifier corrections (wave 3) | Follow-ups |
|---|---|---|---|---|---|---|
| versions-and-gate (wave 2, not revised in wave 3) | `cmake-versions-and-gate.md` | 14 (CORE-01..05, VER-01..09) | 9 | 10 | 0 (not re-verified; wave-2 ledger stands) | Handbacks (d)5, (d)15, (d)16 and (d)18 are applied at authoring |
| bazel-seam (wave 2, not revised) | `cmake-bazel-seam.md` | 15 (BZL-01..15) | 10 | 15 | 0 | (d)13 and (d)14 applied at authoring; 6 open questions, all host-cannot or dated |
| module-authoring (revised) | `cmake-module-authoring.md` | 25 (MOD-01..20, TEST-01..05) | 15 | 16 | 4 revision-log lines | MOD-12 clause, (d)6 |
| consumable-library (revised) | `cmake-consumable-library.md` | 24 INST-01..24 (plus a superseded copy of TGT-01..09) | 14 INST (18 counting the copy) | in the Verdict list; no separate section | 7 | INST-01 and INST-22 script floors, (d)13; Windows rows read-only |
| targets-and-abi (new) | `cmake-targets-and-abi.md` | 20 TGT (01..09 carried and amended, 10..20 new) | 11 | 12 | 17 | TGT-18 applied row, (d)2; 7 open questions (Windows, dual ABI, default-PIE) |
| language (new) | `cmake-language.md` | 15 (LANG-01..15) | 7 | 11 | 15 | LANG-04 migration clause, settled in this phase ((e) M-W3-P); LANG-11 lookup (d)10; LANG-02 base ref (d)24 |
| package-managers (revised, rev 3) | `cmake-package-managers.md` | 46 (CONAN 23, VCPKG 19, PKG 4) | 20 | 28 | 5 | CONAN-08 and CONAN-10 citations (d)8 and (d)9; 4 "another round" items classified in (e) |
| testing-and-ci (new) | `cmake-testing-and-ci.md` | 10 (TEST-06..10, CI-01..05) | 5 | 15 | 11 | TEST-03 placement, (d)17; CI-05 hosted-runner form |
| skills (new) | `cmake-skills.md` | 3 new (DEP-30..32), plus amendments to DEP-13, DEP-15, DEP-17 and TC-05 | 2 new (DEP-30, DEP-31) | 12 | 16 | (d)3, (d)4, (d)5, (d)11 and (d)12 |
| dependency-seam (revised) | `cmake-dependency-seam.md` | 33 (DEP-01..23, TC-01..10) | 19 | 22 | 11 | TC-05 and DEP-17 take the skills amendments; DEP-12 wording (d)7 |

**Unique totals, all consolidations:** 205 live IDs, 112 MUST, 14 families.

- The superseded TGT-01..09 copy is counted once.
- DEP-30..32 are counted once.
- Per family (IDs/MUST): CORE 5/3, VER 9/6, LANG 15/7, MOD 20/12, TGT 20/11, INST 24/14, DEP 26/14, TC 10/7, TEST 10/6, CI 5/2, BZL 15/10, PKG 4/1, CONAN 23/9, VCPKG 19/10.
- CONSIDER rows: CORE-03, INST-20, TGT-20, DEP-06 and DEP-18.
- Compared with wave 2 (127 IDs, 77 MUST): +78 IDs and +35 MUST, all in families that wave 3 opened or deepened.

### (b) Surprises

Verdicts:
- **promote**: new rule text or a new clause.
- **fold**: already a rule; add the fact to its rationale or verify.
- **defer**: needs a host or a date.
- **reject**: no rule surface.

1. **`PARSE_ARGV` keeps `;` inside one multi-value element, and an unquoted forward passes it as a single argument.**
   - Evidence: `Kitware__CMake/Tests/RunCMake/cmake_parse_arguments/CornerCasesArgvN.cmake` (`test2`), and M-W3-P1/P2 in (e).
   - `cmake --help-command cmake_parse_arguments` (4.4.2) says only that PARSE_ARGV "allows for the values to have special characters like ; in them".
   - Verdict: **promote**, as the LANG-04 migration clause (Authoring notes, pinned decision 7).
2. **Wrong-prefix `FATAL_ERROR` in shipped modules** (`qt__qtbase … Qt6CoreMacros.cmake:3786`, hunter `:21`). **fold** into LANG-06, which already carries it. The upstream report is an owner decision (outstanding 2).
3. **`find_dependency()` forwards `${ARGN}` unquoted** (`CMakeFindDependencyMacro.cmake:93`). **fold**: LANG-04's rationale already carries it.
4. **The `unshare -rn` runner PR (#11489) closed unmerged.** **fold** into CI-05; the hosted form is docker `--network none` ((d)14).
5. **`--presets-file` (4.4) has 0 corpus adopters.** **defer**: the glob assumption holds for the two fixed names. A routing line in `presets-and-ci.md` names the residual miss.
6. **llvm's presets are all hidden.** **fold**: CI-03 allows this, so it is not a finding.
7. **Conan's `CPSDeps` generator is undocumented** (Conan 2.32.0 `conan/internal/api/install/generators.py:39`). **fold** into CONAN-24 as a dated note.
8. **Unbounded `actions/cache` keys, and boost's constant key.** **fold** into PKG-04, which stays SHOULD: whether restore rebuilds is residue R6.
9. **The PIC reproducer needs `R_X86_64_32S`.** **fold** into TGT-12's verify.
10. **`CMAKE_LINK_LIBRARIES_ONLY_TARGETS` fires at generate time, not configure time.** **fold** into TGT-14. The canary must run generate, which a plain configure does.
11. **The test property `CROSSCOMPILING_EMULATOR` is inert.** **fold**: TC-07 stays SHOULD (dependency-seam conflict 16).
12. **try_compile output capture.** **fold** into TC-06.
13. **try_compile re-reads the toolchain for both signatures (2+L+N reads).** **fold** into TC-06's rationale.
14. **FindPkgConfig has no sysroot handling.** **fold** into DEP-23.
    - `cmake_pkg_config` (3.31, `versionadded:: 3.31`) documents `PC_SYSROOT_DIR` and `CMAKE_PKG_CONFIG_SYSROOT_DIR`: `cmake --help-command cmake_pkg_config` on 3.31.12 and 4.4.2, read 2026-09-26.
    - DEP-23 may name it as the ≥3.31 remedy with a `(CMake ≥ 3.31)` gate. `IMPORT` and `POPULATE` are 4.1 (dependency-seam line 526).
15. **Git fetch timeouts are inert.** **fold** into MOD-18.
16. **CMP0176's default is accidental.** **fold** into MOD-19.
17. **`cmake_language` scope.** **fold** into MOD-20.
18. **ExternalProject passes `ENCODING UTF-8` explicitly.** **fold**: MOD-19 cites it as the precedent.
19. **FetchContent doc-comment overcount.** **reject**: it affects a census number, not a rule. The corrected count is in module-authoring's ledger.
20. **The "config beats CPS" order is refuted: a valid `.cps` wins on 4.3+.** **fold**: already in DEP-12 and INST-16 (frame correction W3-5).
21. **`CMAKE_WARN_DEPRECATED=OFF` survives `-Werror=dev` on 3.31.12.** **fold**: it refutes VER-06's rationale ((d)5). DEP-30 remains the remedy because OFF also hides the warning the gate exists for.
22. **A preset's `"warnings": {"deprecated": false}` beats CLI `-Werror=dev` on 3.31.12.** **promote**, as a CORE-01 clause ((d)18).
23. **`rapidjson`'s `export(PACKAGE)` writes to the user package registry** (floor 3.5). **fold** into the INST rule that bans it.
24. **An empty `CMAKE_MAP_IMPORTED_CONFIG_<CFG>` also rejects installed configurations.** **fold** into the INST multi-config section.
25. **The CMake tutorial was restructured at 4.4.** **reject**: it changes citations, not rules. Drafters cite `cmake-buildsystem(7)` or the command page, never tutorial step numbers.
26. **`--no-tests` is 3.17, and `CTEST_TEST_TIMEOUT` in the environment is inert.** **fold** into TEST-06 and TEST-07 (frame correction W3-4).
27. **Conan `implements` arrived in 2.0.9.** **fold** into the CONAN recipe rows' floors.
28. **The CCI Conan-1 remote froze on 2024-11-04.** **fold** into CONAN-01's rationale as dated.
29. **The 2025 ISO C++ survey has no percentage table.** **defer**: dated re-check D6.
30. **The corpus writes `CMAKE_POLICY_VERSION_MINIMUM=3.5` in 100 % of its writes; only Qt uses 3.10.** **fold** into DEP-15.
    - The value stays 3.10 for gated 3.x consumers, because 3.5 still fails the gate for a 3.5–3.9 dependency (wave-2 (e)1).
    - vcpkg port builds run no gate, so 3.5 suffices there. This is the port-tool exception DEP-15 already carries.
31. **Only one Config template in the corpus escapes the globs:** `microsoft__vcpkg/ports/lmdb/cmake/unofficial-lmdb-config.cmakein`.
    - Measured 2026-09-26: 179 files contain `@PACKAGE_INIT@`. Every other hit matches `*.cmake.in` or `*.cmake`, or is a `.patch`/`.diff`.
    - **reject** a `*.cmakein` glob: one file, and its port directory's `portfile.cmake` loads both rules.
32. **No corpus `CMakePresets.json` uses `include`.** JSON files that carry `configurePresets` under other names are only Kitware `Help/` and `Tests/` fixtures (measured 2026-09-26). **reject**: no glob change.

### (c) Frame corrections (wave-3 harvest)

Each corrects a statement in `cmake-frame.md` or in this map. The frame file is not edited; drafters use the corrected fact.

1. **W3-1, map row M-H-05.** The find-root modes default to `BOTH`, and `CMAKE_FIND_ROOT_PATH_MODE_PROGRAM` unset also behaves as `BOTH`, not `NEVER` (TC-08, TC-09; measured on 3.31.12 and 4.4.2).
2. **W3-2.** `CMP0054` set to OLD is a hard error from 4.0, not 4.3 (language, frame harvest).
3. **W3-3.** `cmake_parse_arguments(PARSE_ARGV)` arrived in 3.7, not 3.5. 3.5 is when the command became built in (MOD-16 floor; LANG-04).
4. **W3-4, ctest.**
   - `ctest --no-tests=error` is 3.17, not 3.26.
   - `CMAKE_CTEST_ARGUMENTS` exists from 3.17.
   - `CTEST_TEST_TIMEOUT` set in the environment is inert (TEST-06, TEST-07).
5. **W3-5.** "Config beats CPS" is refuted: a valid `.cps` wins on 4.3+ (INST-16, DEP-12).
6. **W3-6.** `CMAKE_WARN_DEPRECATED=OFF` survives `-Werror=dev` on 3.31.12 (skills F6). This refutes VER-06's "[M9]" clause.
7. **W3-7.** `gtest_discover_tests(DISCOVERY_MODE)` is 3.18.
8. **W3-8, supply chain.**
   - The 2025 ISO C++ survey publishes no percentages; the 2024 Q9/Q10 line stays the citable one.
   - Conan 2.27.0 added CVE info to `conan audit`, which corrects the brief.
9. **W3-9, Conan.**
   - `implements` arrived in Conan 2.0.9 (#14320).
   - CCI's Conan-1 remote froze on 2024-11-04 (CCI `README.md:32-34`).
10. **W3-10.** `rapidjson`'s `export(PACKAGE)` writes to the user registry (floor 3.5).
11. **W3-11.** An empty `CMAKE_MAP_IMPORTED_CONFIG_<CFG>` rejects installed configurations as well as missing ones.
12. **W3-12.** libuv has 7 of 7 bare `target_link_libraries` calls, not 9 of 9 (skills modernize worked list).
13. **W3-13.** The CMake tutorial was restructured at 4.4. Cite command and manual pages, not tutorial steps.
14. **W3-14.** `try_compile` re-reads the toolchain for both signatures (TC-06).
15. **W3-15.** TGT-18: under clang without `clang-scan-deps`, a C++20 floor with scanning on breaks the build.
16. **W3-16.** Of the corpus repos, 18 run `ctest` from a workflow. Of those, 1 passes `--timeout` and 4 pass `--no-tests=error` (testing-and-ci T9).
17. **W3-17.** For the `CMAKE_POLICY_VERSION_MINIMUM` value, see (b)30. DEP-15 keeps 3.10 as its value.
18. **W3-18, new in this phase.** `cmake_parse_arguments(PARSE_ARGV)` preserves a caller's quoted list as one escaped element. An unquoted `${prefix_KW}` then forwards it as one argument.
    - Measured M-W3-P1/P2 on 3.31.12, 4.3.4 and 4.4.2. Identical on all three lines.
    - The frame's "PARSE_ARGV is strictly safer" framing (gate §9) holds for the values it protects. It is a behaviour change for callers that relied on splitting.

### (d) Cross-consolidation contradictions

Wave-2 (e)1–14 stand. Each item below names the ID that **keeps the text**; the other stays stable and becomes a one-line citation. Items 1–24 are new in wave 3.

1. **TGT-01..09 is carried in two files.**
   - `cmake-consumable-library.md` holds the pre-amendment text: TGT-04 is SHOULD; TGT-05's guard is "`PROJECT_IS_TOP_LEVEL` or `NOT DEFINED`".
   - `cmake-targets-and-abi.md` amended them:
     - TGT-04: overwrite MUST, append SHOULD.
     - TGT-05: `if(NOT DEFINED CMAKE_CXX_STANDARD)`, with `PROJECT_IS_TOP_LEVEL` only as an extra AND.
     - TGT-06 and TGT-07: the same guard treatment.
   - **Keeps:** targets-and-abi.
   - It adopts two verify commands from consumable-library's verify-wave-3 changes: the `target_link_libraries (`-tolerant grep and the `set[[:space:]]*\(CMAKE_CXX_STANDARD` pipeline.
   - The consumable-library copy is dropped (Authoring notes, DROP 1).
2. **TGT-18's applied table marks cmake_template's `cmake_policy(SET CMP0155 OLD)` as satisfied; VER-07 marks it violated** (MUST: never `SET … OLD` without a guard, a reason and an exit).
   - **Keeps:** VER-07.
   - TGT-18's row reads "remedy is `CMAKE_CXX_SCAN_FOR_MODULES OFF`; the `SET OLD` form violates CMK-VER-07".
   - TGT-18 failure mode 5's "build.ninja count" becomes the `*.ninja` grep.
3. **TC-05 (dependency-seam) prescribes `DEFER` for the Conan provider. Skills measured M-P and M-S.** `find_*` sees Conan paths only under `CMakeConfigDeps`, only after the first `find_package`, and only in that directory scope. `DEFER` does not fix it.
   - **Keeps:** TC-05, with the skills amendment (`cmake-skills.md` "Amendments to existing CMK-DEP rows") replacing the DEFER remedy. The ID stays.
4. **DEP-17's read order.**
   - Dependency-seam leads with `--debug-find-pkg`.
   - Skills measured the cache grep first (`<Pkg>_DIR` in `CMakeCache.txt`). The procedure uses `--fresh` only, and never `-L` or `--graphviz`.
   - **Keeps:** DEP-17 with the skills order.
5. **VER-06's rationale says `CMAKE_WARN_DEPRECATED OFF` does not survive `-Werror=dev` [M9]. Skills F6 refuted this on 3.31.12.**
   - **Keeps:** DEP-15 owns scope and value (wave-2 (e)1) and rewrites that rationale sentence.
   - VER-06 becomes a citation. Its 3.x clause reads "see CMK-DEP-30".
6. **MOD-12 has not applied wave-2 (e)5.**
   - The clause "and `unset(<Name>_DIR CACHE)` when the value changes" is missing, as is the DEP-21 citation.
   - Its find_ocx row still says "holds" where DEP-13 says violated.
   - **Keeps:** DEP-13 and DEP-21 their texts. MOD-12 gains the clause and the citation, and its row flips.
   - MOD-12's "outranks `CMAKE_PREFIX_PATH`" holds only when `CMAKE_FIND_ROOT_PATH` is empty (TC-08). Add that qualifier.
7. **DEP-12 still says "CPS always" honours a range** (wave-2 (e)12 is unapplied).
   - **Keeps:** INST-16 (schema text).
   - DEP-12 reads "CPS with the `simple` schema, or none".
8. **CONAN-08 (SHOULD) vs CI-02 (MUST) on `CMakeUserPresets.json`.**
   - **Keeps:** CI-02.
   - CONAN-08 becomes a citation plus its Conan consequence (the `vendor.conan` skip) (testing-and-ci conflict 15).
9. **CONAN-10 ("never `set()` after `project()`") vs TGT-05 and TGT-16 (a guarded `set` after `project()` is legal).**
   - **Keeps:** TGT-05 and TGT-16 own the guard.
   - CONAN-10 keeps the configure-output grep for "has been modified to".
   - Its static grep flags only unguarded sets, spelled whitespace-tolerant as `set[[:space:]]*\(`.
   - Wave-2 (e)7 (the grep runs on Conan legs only) still applies.
10. **LANG-11's lookup uses a raw `cmake --help-variable-list | grep -c -x`, which gives a false positive on `<LANG>`/`<CONFIG>` placeholder names** (skills failure mode 8).
    - **Keeps:** LANG-11, which adopts the placeholder-expanded check. The skills text cites LANG-11.
11. **Skills step 7 cites "ctest-contract candidate 4 (CMK-TEST, ID pending)".** That rule is now TEST-09.
    - **Keeps:** TEST-09 the rule. The skill keeps its smoke block as procedure and cites TEST-09.
12. **Skills Applied quotes "87 of 101 … unguarded"; testing-and-ci conflict 5 forbids quoting that upper bound.**
    - **Keeps:** testing-and-ci. Drafters never quote the figure.
13. **The INST-01 and INST-22 consumer scripts and the BZL wrap simulation still write a bare `cmake_minimum_required(VERSION 3.25)` without the gate.** Wave-2 (e)14 is unapplied.
    - **Keeps:** VER-02 and CORE-01.
    - Shipped scripts write `3.25...4.4` and the gate spelled per binary.
14. **DEP-16 and BZL-01 (`unshare -rn`) vs CI-05.**
    - **Keeps:** DEP-16 the offline rule. On hosted `ubuntu-24.04` the CI form is docker `--network none`, which CI-05 owns and DEP-16 cites.
    - Every probe keeps `-DCMAKE_POLICY_DEFAULT_CMP0170=NEW` (wave-2 (e)4).
15. **VER-03's grep gives a false positive on a lockfile-pinned provisioner** (a tool pinned by a lock file, e.g. the find_ocx `ocx.lock` shape). This is a testing-and-ci handback.
    - **Keeps:** VER-03, which gains "a CMake version pinned by a committed tool lock counts as pinned".
16. **CORE-01 cites "CMK-MOD row (module-testing rule 2)".** Wave-2 (e)11 is unapplied in versions-and-gate, including its Violated list.
    - **Keeps:** CORE-01. The citation becomes CMK-TEST-02.
17. **TEST-03's scope is widened to all suites and placed in the index non-negotiables.**
    - **Keeps:** module-authoring (TEST-03's text).
    - Testing-and-ci decides placement: the index cites TEST-03 and does not restate it.
18. **CORE-01 has a preset gap: a preset's `"warnings": {"deprecated": false}` beats CLI `-Werror=dev` on 3.31.12** (skills; (b)22).
    - **Keeps:** CORE-01, which gains a clause and a grep:
      - "run the canary through the leg's own `--preset`"
      - `grep -rn --include='CMakePresets.json' --include='CMakeUserPresets.json' -e '"dev": false' -e '"deprecated": false' .` Empty output passes.
19. **TGT-11 (MUST for `FORCE`, SHOULD for a hard-coded type) vs BZL-07 (SHOULD).** Consistent. **Keeps:** TGT-11. BZL-07 keeps only the wrap rationale and cites TGT-11.
20. **TGT-12 vs BZL-03.** Already consistent: the property is for own targets, the variable for others' targets, the flag for the wrapper. **Keeps:** TGT-12 the PIC text. BZL-03 cites it.
21. **VER-02's range vs BZL-08's floor at or below the wrapper's 3.31.12.** Consistent. **Keeps:** VER-02. BZL-08 cites it.
22. **MOD-17 (download timeouts) and DEP-03 (`URL_HASH`) both bind FetchContent URL declares.** They complement each other. **Keeps:** DEP-03 the hash. It cites MOD-17 for timeouts.
23. **LANG-04 (signature) vs MOD-16 (one top-level parse, gersemi hints).** Already split. Both floors read 3.7 (W3-3). **Keeps:** LANG-04 the signature and the new migration clause, MOD-16 the shape.
24. **LANG-02's verify hard-codes `origin/main`.** **Keeps:** LANG-02, with the base ref parameterised as `"${BASE_REF:-origin/main}"`. This is a variable, not `$(…)`, so it passes the shape rule.
25. **MOD-15 ("Commit a `.gersemirc`", SHOULD) vs owner default 6 ("no rule demands a `.gersemirc`").** Not a conflict of severity: MOD-15 is SHOULD and conditional.
    - **Keeps:** MOD-15, scoped to "a module project that runs gersemi". CORE-04 keeps the `--check`-never-`--diff` gate line and says no `.gersemirc` is required.

### (e) Convergence

Every open question in the ten consolidations and in this map's owner list, classified. "Load-bearing" means the answer changes a MUST's text, its severity, or a skill step.

**Answerable now and load-bearing: one, answered in this phase.**

- **M-W3-P, `language` open question 2: migrating `${ARGN}` to `PARSE_ARGV`.**
  - Why load-bearing: LANG-04 is MUST for public commands, and `cmake-modernize` would apply it mechanically.
  - Measured 2026-09-26 on 3.31.12, 4.3.4 and 4.4.2 with `cmake -P`. Scratch is at `/home/mherwig/.cache/cmake-measure-scratch/parse-argv-migration/` (`m.cmake`, `fwd.cmake`, `norm.cmake`). Output is identical on all three lines:

    | Call shape | `${ARGN}` legacy | `PARSE_ARGV` |
    |---|---|---|
    | `MULTI "a;b" c` | 3 elements `[a][b][c]` | 2 elements `[a;b][c]` |
    | `ONE "a;b"` | `ONE=a`, `UNPARSED=b` | `ONE=a;b`, nothing unparsed |
    | `MULTI ${L}` (L = `x;y`) | 2 elements | 2 elements (no change) |
    | `MULTI "${L}"` | 2 elements | 1 element `[x;y]` |

  - M-W3-P2: forwarding that `PARSE_ARGV` element unquoted (`sink(${a_MULTI})`) passes **one** argument `x;y` (ARGC=1). `foreach(x ${a_MULTI})` iterates once.
  - M-W3-P3: `set(a_MULTI ${a_MULTI})` directly after the parse re-flattens to legacy splitting (`"${L}" z` goes from 2 elements to 3).
  - Corpus context: 202 files use `PARSE_ARGV`, against 1,127 `cmake_parse_arguments(` lines. The self-assignment idiom is not a post-parse flatten anywhere in the sampled hits, so the clause is a new commitment.
  - The one-value change is a fix: legacy left `b` unparsed, which LANG-06 would already stop on.
  - Decision: pinned decision 7 in the Authoring notes. It stays inside CMK-LANG-04 and mints no new ID.

**Answerable now, not load-bearing: residue.** These are wording or census items, and none changes a MUST.

- R1. LANG-10 in an `include()`d file or a `cmake -P` script (language OQ 1). The corpus has 0 uses in any forbidden shape (LANG-10 corpus line). Authoring note: the awk runs on the top-level file, and the depth file says "an `include()`d file shares its includer's scope; read it the same way".
- R2. LANG-06's awk false-positive rate over 30 hits (language OQ 3). This is verify wording only.
- R3. CMP0174 under a 3.25 floor (language OQ 4). LANG-07 keeps its text. Write the `if(POLICY CMP0174)` form as an example, not a rule.
- R4. TC-05's build-context tools, the provider's four limits, `conan graph explain`, and `pkg_check_modules` without `IMPORTED_TARGET` (322 calls, dependency-seam line 526). These are rationale details only.
- R5. `PREFER_CONFIG` and a census of TC-06 per-language reads.
- R6. PKG-04 cache restore (package-managers "another round" 3). PKG-04 stays SHOULD.
- R7. Dual-mechanism locks (package-managers "another round" 4). These are exemplars for PKG-01, whose text is fixed.
- R8. Censuses: the 101 TEST-09 sites, TGT violator lists, and CI scripts outside `.github`. They add exemplar rows only.
- R9. Conan measured flows (package-managers "another round" 1). Mostly done by verify wave 2 on Conan 2.32.0.
- R10. A dry run of `cmake-modernize` on a third tree. The procedure already has two worked lists (libuv, rapidjson).

**This host cannot measure** (no Windows, no hosted runner, no Bazel install, no g++, no 4.0–4.2 binaries). Each row stays read-only-grounded and says so:

- Windows: INST-23, TGT-13, TGT-16, TGT-20, VCPKG-06, VCPKG-15 and MOD-19's decoding half. The package-managers `windows-abi-measurement` item.
- A hosted ubuntu-24.04 runner and `unshare` (CI-05).
- A real Bazel with `rules_foreign_cc`, and Conan's `BazelDeps` under Bzlmod (bazel-seam OQs).
- Debian `lib/<tuple>` multiarch depth under a real distro (DEP-22).
- libstdc++ dual ABI (no g++ on host), default-PIE toolchains, and CMake 4.0–4.2 binaries.

**Dated re-checks.** Each ships as a "Re-check:" line in its depth file:

- D1: CMake 4.5 and the `-Werror=dev` spelling (CORE-01).
- D2: CONAN-04's flip to `CMakeConfigDeps` (owner decision 1).
- D3: vcpkg-artifacts removal (package-managers Verdict 9).
- D4: Conan and vcpkg-tool release tags.
- D5: the `rules_foreign_cc` version table (BZL-08).
- D6: the ISO C++ 2026 survey.
- D7: the CPS UUID rotation.
- D8: gersemi releases after 0.29.1.

**Owner decisions:** see "Owner decisions outstanding" below. Every default stands, and no wave-3 evidence changes one.

**Verdict: ready-to-draft.**
- The single question that was load-bearing and answerable here was measured in this phase, and its answer is pinned below.
- Every other open item is residue, host-bound, dated or an owner default.
- The wave-plan stop condition, as the task overrides it, holds: no open question is both load-bearing and answerable on this host.

### (f) Residue

- R1–R10 above. The drafters absorb them as wording. None blocks.
- Carried open because this host cannot measure them: every host-cannot row in (e). Each rule's text says "read-only on <platform>" and gives the documented source.
- The find_ocx handoff note (owner decision 2) gains LANG-04 and LANG-06 (language owner Q1 default). It stays a note in the research tree, never in a shipped file.
- Upstream reports (Qt and Hunter prefix mismatches, abseil's Conan-1 recipe, 24 names-only CCI recipes, 7 `header_only()` recipes, Kitware's two silent CPS export gaps): none filed (default).

### Owner decisions outstanding (wave 3)

Each default applies if unanswered.

1. CONAN-04 auto-flip on the first Conan changelog line that calls `CMakeConfigDeps` stable. **Default:** flip, as a dated edit.
2. Upstream reports ((f)). **Default:** none filed.
3. The find_ocx handoff note, not an issue (map Q2). **Default:** a note listing the wave-2 set plus LANG-04, LANG-06, MOD-12's `_DIR` clause and TGT-18's CMP0155 row.
4. CORE-03 stays CONSIDER. INST-18 and BZL-09 stay SHOULD. **Default:** as stated.
5. TGT-16 stays MUST without a Windows host to measure it. **Default:** keep MUST, grounded read-only on the documented behaviour.
6. ID holes: CONAN-19, VCPKG-19, VCPKG-20 and PKG-05..07 stay reserved and never emitted. DEP-24..29 stay unallocated (DEP-30..32 were allocated by skills). TGT-10..20 as allocated by targets-and-abi. **Default:** as stated.
7. bazel-quality handback: the pointer line and the CPS negative only. The `#329` and `#1129` rows and the `experimental_validate_outputs_in_action` note are offered, not applied (map Q5). **Default:** as stated.
8. `unofficial-<name>` cross-reference beside INST-06/-07 (package-managers owner Q3). **Default:** add one citation line to CMK-VCPKG. INST-06/-07 are not reworded.
9. `cmake-modernize` never raises `cmake_minimum_required` on its own. It reports and asks. **Default:** as stated (skills).
10. Family boundaries per wave-2 (e)1, 8 and 9 and wave-3 (d)1–25. **Default:** as resolved.
11. Floor 3.25 (Q1), `cpp-packaging` ships without a fleet consumer (Q3), both skills ship (Q4), gersemi is SHOULD (Q6), `cmake-essentials` (Q7), distro recipes out of scope (Q8). **Default:** all stand.

## Authoring notes (binding on the drafters)

These notes bind the phase-7 drafters. Where a note and a consolidation disagree, the note wins. Where the note is silent, the consolidation named in the depth-file table is the source.

### 1. Globs, re-checked against the cannot-miss bar

The globs are unchanged from "Artifact set decision". Corpus counts were re-measured 2026-09-26 at the exemplar corpus (46 repos) and match H7:

| Glob | Rule | Files | Repos |
|---|---|---|---|
| `**/CMakeLists.txt` | cmake-build | 10,352 | 43 |
| `**/*.cmake` | cmake-build | 16,525 | 37 |
| `**/*.cmake.in` | cmake-build | 542 | 26 |
| `**/CMakeLists.txt.in` | cmake-build | 60 | 6 |
| `**/CMakePresets.json` | cmake-build | 19 | 7 |
| `**/CMakeUserPresets.json` | cmake-build | 1 | 1 |
| `**/*.pc.in` | cmake-build | 79 | 22 |
| `**/.gersemirc` | cmake-build | 0 | 0 |
| `**/.cmake-format*` | cmake-build | 8 | 7 |
| `**/conanfile.py` | cpp-packaging | 4,086 | 5 |
| `**/conanfile.txt` | cpp-packaging | 11 | 2 |
| `**/conandata.yml` | cpp-packaging | 1,997 | 1 |
| `**/conan.lock` | cpp-packaging | 0 | 0 |
| `**/conanws.yml`, `**/conanws.py` | cpp-packaging | 0 | 0 |
| `**/vcpkg.json` | cpp-packaging | 3,248 | 5 |
| `**/vcpkg-configuration.json` | cpp-packaging | 8 | 1 |
| `**/portfile.cmake` | cpp-packaging (and cmake-build via `*.cmake`) | 3,230 | 2 |

- The concept check found 179 files containing `@PACKAGE_INIT@`. Exactly one non-patch file escapes the globs ((b)31), and its sibling `portfile.cmake` loads both rules. No glob is added.
- `*.in.cmake` (12 files, 4 repos) is already covered by `*.cmake`.
- Four residual misses. Each is named in the index's routing table with a routing line:
  - Conan profiles (no fixed name) → `cpp-packaging/conan.md`
  - vcpkg triplet edits load `cmake-build` only → the cmake-build index routes "editing a vcpkg triplet → `cpp-packaging/vcpkg.md`"
  - `cmake --presets-file` (4.4, 0 adopters) → `presets-and-ci.md`
  - Config templates with unconventional suffixes → install-and-export via the `CMakeLists.txt` that wires them

### 2. Depth files, families, and sources

| File | Family | Source sections (drafters copy from here) |
|---|---|---|
| `rules/cmake-build.md` (index) | **CMK-CORE** (index-owned) | `cmake-versions-and-gate.md` "CMK-CORE", plus (d)16 and (d)18. Its non-negotiables list cites MUST rows by ID and never restates them. It includes TEST-03 ((d)17), and the drafters choose the rest from the MUST set |
| `cmake-build/versions-and-policies.md` | CMK-VER | `cmake-versions-and-gate.md` "CMK-VER", with VER-06 cut to a citation ((d)5) and VER-03's lock clause ((d)15) |
| `cmake-build/language.md` | CMK-LANG | `cmake-language.md` ruleset, plus pinned decision 7, (d)10 and (d)24 |
| `cmake-build/module-authoring.md` | CMK-MOD | `cmake-module-authoring.md` "CMK-MOD", plus (d)6 |
| `cmake-build/targets.md` | CMK-TGT | `cmake-targets-and-abi.md`: TGT-01..09 from its "Carried" table, applied to consumable-library's row text, then TGT-10..20. Plus (d)1 and (d)2 |
| `cmake-build/install-and-export.md` | CMK-INST | `cmake-consumable-library.md` "CMK-INST" only (never its TGT section), plus (d)13 |
| `cmake-build/dependencies.md` | CMK-DEP | `cmake-dependency-seam.md` DEP-01..23, plus `cmake-skills.md` DEP-30..32 and the amendments, plus (d)4, (d)5 and (d)7 |
| `cmake-build/toolchains-and-providers.md` | CMK-TC | `cmake-dependency-seam.md` TC-01..10, with TC-05 per (d)3 |
| `cmake-build/testing.md` | CMK-TEST | `cmake-module-authoring.md` TEST-01..05, plus `cmake-testing-and-ci.md` TEST-06..10 and (d)11 |
| `cmake-build/presets-and-ci.md` | CMK-CI | `cmake-testing-and-ci.md` "CMK-CI", plus (d)8 and (d)14 |
| `cmake-build/bazel-seam.md` | CMK-BZL | `cmake-bazel-seam.md`, with BZL-02/-03/-04/-07/-08 cut per wave-2 (e) and (d)19–21 |
| `rules/cpp-packaging.md` (index) | **CMK-PKG** (index-owned) | `cmake-package-managers.md` "CMK-PKG". It cites TC-02 for the one-manager ban (wave-2 (e)9) |
| `cpp-packaging/conan.md` | CMK-CONAN | `cmake-package-managers.md` "CMK-CONAN", plus (d)8 and (d)9 |
| `cpp-packaging/vcpkg.md` | CMK-VCPKG | `cmake-package-managers.md` "CMK-VCPKG", plus owner decision 8 |

- The two index families are CORE and PKG. All other families are depth-owned.
- Each index carries:
  - the gate block: CORE-01 per-binary spelling, and `gersemi --check` as SHOULD
  - the silent-pass paragraph (M-A-07, written now from the rows that catch each pass)
  - the non-negotiables as ID citations
  - the task-routed table from "Depth files, one line each"

### 3. Bounded duplication (the complete list; nothing else is repeated)

1. **The skills repeat the MUST rows their steps cite, and only those, in a `| # | Finding | Rule |` table.**
   - `cmake-dependency-triage` repeats the MUST rows its procedure cites (`cmake-skills.md` "The cmake-dependency-triage procedure"): CONAN-09, DEP-07, DEP-13, DEP-15, DEP-16, DEP-30, DEP-31, DEP-33, INST-01, INST-03, TC-04 and TC-05 (12 rows, DEP-33 added in wave 6, 2026-09-26).
   - `cmake-modernize` repeats the MUST rows its procedure cites ("The cmake-modernize procedure"): CORE-01, CORE-05, DEP-07, DEP-15, INST-01, LANG-11, TGT-01, TGT-04 (overwrite half), TGT-17, VER-01 and VER-05. It adds LANG-04 with its migration clause (12 rows). Wave 5 (2026-09-26) adds the MUST halves of TGT-03, TGT-11 and TGT-21 and INST-06 with its migration clause, which steps 2, 5, 6 and 7 now cite (16 rows).
   - Measured with the rule-count script above, 2026-09-26.
2. **`portfile.cmake`** loads both rules. **`conanfile.py`** also loads `python-quality` (conflict 13).
3. **CPS rows are split by direction:** export in `install-and-export.md`, import in `dependencies.md`. Each cites the other, and neither restates it.
4. **Bazel-side facts** are cited as `BZL-CC-22`, `-23`, `-24` and `-28` and never restated.
5. **Shipped verification scripts** (INST-01, INST-22, the BZL simulation, the TEST smoke) each spell the floor and gate inline. These are scripts, not rule text ((d)13).

### 4. Pinned decisions

1. **Floor.**
   - Rules are written for CMake 3.25.
   - Every `cmake_minimum_required` in shipped text reads `VERSION 3.25...4.4` (VER-02).
   - Every newer mechanism carries a `(CMake ≥ X.Y)` gate.
   - Verified on 3.31.12, 4.3.4 and 4.4.2 (2026-09-26).
2. **Gate spelling per line:**
   - `-Werror=author` on CMake ≥ 4.4
   - `-Werror=dev` on ≤ 4.3
   - `-Werror=dev` when one command line serves both sides (CORE-01)
   - The canary runs through the leg's preset ((d)18).
3. **gersemi:**
   - `gersemi --check` is SHOULD in the gate block, never MUST, and never `--diff` (CORE-04, MOD-15). Floor: gersemi 0.29.1 (2026-09-14).
   - `.gersemirc` is required only where gersemi runs on a module project ((d)25).
   - A `.cmake-format*` file means "migrate, never extend".
4. **CPS stance:**
   - CPS is a seam topic, so there is no `cps.md` and no `*.cps` glob.
   - Export rows are gated `(CMake ≥ 4.3)`. The retired experimental gates are deleted.
   - Import: a valid `.cps` wins on 4.3+ (W3-5), and ranges are honoured only with the `simple` schema ((d)7).
5. **Provider stance:**
   - One manager of record (PKG-01; TC-02 owns the ban).
   - vcpkg wires in through the toolchain before the first `project()` (TC-03, VCPKG-04).
   - For Conan, the explicit flow is recommended. The `cmake-conan` provider is legal, with TC-05's measured limits (`CMakeConfigDeps` only, after the first `find_package`, that directory scope), and `DEFER` is never offered as a fix.
   - CONAN-04 stays SHOULD `CMakeDeps` until D2 fires.
6. **`CMAKE_POLICY_VERSION_MINIMUM`:**
   - Value 3.10 in a gated 3.x/4.x consumer (DEP-15).
   - 3.5 is acceptable only in a vcpkg port build (port-tool exception).
   - On 3.x the remedy is DEP-30's re-pin or patch, never a warning switch.
7. **LANG-04 migration clause (from M-W3-P).** Append to CMK-LANG-04 as a bullet:
   - "Migrating an existing public command from `${ARGN}` changes what its callers get.
     - A quoted list (`"${SRCS}"`, `"a;b"`) given to a multi-value keyword arrives as one element with an escaped `;`, and an unquoted forward passes it on as one argument.
     - A quoted list given to a one-value keyword now arrives whole.
   - For each multi-value keyword whose values are lists of files, targets or paths, add `set(<prefix>_<KW> ${<prefix>_<KW>})` directly after the parse. That keeps the old splitting.
   - Severity:
     - MUST for new public commands.
     - For migrating an existing public command, MUST with the flatten line, or with a changelog entry naming the behaviour change.
     - SHOULD for private helpers (unchanged)."
   - `cmake-modernize` lists every existing parse as a finding with the flatten line in the fix. It never rewrites a public command's parse without it. It never raises a minimum (skills modernize "never" list).

### 5. Rules to DROP (never emitted as rule text)

1. The TGT-01..09 section of `cmake-consumable-library.md` is dropped as a copy. `targets.md` uses the amended rows, and the IDs are unchanged.
2. Reserved IDs CONAN-19, VCPKG-19, VCPKG-20 and PKG-05..07 are never emitted and never reused.
3. These bodies are reduced to citations (the ID stays, as one line naming the owner):
   - VER-06 → DEP-15 and DEP-30
   - CONAN-08 → CI-02
   - BZL-02 → TC-01 (probe only)
   - BZL-03 → TGT-04 and TGT-12 (`WRAP_SEED` probe only)
   - BZL-04 → INST-10
   - BZL-07 → TGT-11
   - VCPKG-05 → TC-02 (chainload trigger only)
4. Candidates the consolidations already dropped stay dropped:
   - hand-joined `"a;b"` lists (M-C-08)
   - a separate CMP0054-OLD rule (VER-07 covers it)
   - ctest resource-spec and `--schedule-random` rows (0 adopters)
   - a second CI CMake-pinning rule (VER-03 owns it)
   - the `cmake-format.*` no-dot glob
   - the "parse must end in literal `${ARGN}`" rule (withdrawn, module-authoring)
   - the find_ocx memo `FORCE` defect (withdrawn)
   - corpus alarm percentages in rule text (consumable-library Verdict 6; (d)12)
5. The deferred rows M-B-09, M-E-18, M-E-19 and M-J-11 get no rule. M-K-07 is one decision-table line in the cpp-packaging index, citing BZL-CC-24.

### 6. Version dating

- Every rule has a `Floor:` field giving the CMake (or Conan, vcpkg-tool or gersemi) version it needs.
- Every volatile fact carries "(as of 2026-09-26)" or "(measured 2026-09-26 on 3.31.12 and 4.4.2)".
- Tool versions are named exactly: Conan 2.32.0, gersemi 0.29.1, and vcpkg-tool by its dated tag.
- Each depth file ends with a `Re-check:` list naming its D-items from (e). There is no floating "latest" and no "recently".

### 7. Verification-command shape (every command in shipped text)

- `grep -r` always takes an explicit directory operand (`.` or a named dir), never stdin or an implicit path.
- `--include` globs are quoted: `--include='*.cmake'`.
- There is one `-e` per alternative. A pattern never contains `\|`.
- A table cell never contains an unescaped `|`. Commands with a pipe go in a fenced block, not a table.
- A pattern never contains `<placeholder>`. Name a real token, or use a shell variable with a stated default (`"${BASE_REF:-origin/main}"`).
- There are no `$(…)` command-substitution operands.
- A list fed to another command goes through `| xargs -r`.
- Each command states what empty output means: pass, or not applicable.
- Configure probes in shipped text carry `3.25...4.4`, the per-binary gate, and `-DCMAKE_POLICY_DEFAULT_CMP0170=NEW` where they touch FetchContent.

### 8. Fenced blocks

- Every fence is tagged: `sh`, `cmake`, `json`, `yaml`, `python`, `toml` or `text`.
- `python` blocks (conanfile recipes) pass `ruff format --check` under the repository's `ruff.toml`.
- `cmake` blocks use gersemi 0.29.1 layout: lower-case commands, no space before `(`.
- `json` blocks are valid JSON, checked with `jq empty`.

### 9. Portability

- Shipped files carry no fleet paths: no `/home/…`, no `~/.cache/research-lang`, and no `owner__repo` exemplar directory names. Cite upstream as `owner/repo` at a tag or commit, plus the path.
- Shipped files carry no OCX names (`ocx`, `ocx-sh`, `find_ocx`, `ocx.lock`). The find_ocx evidence appears only anonymised: "a copy-and-own tool-bootstrap module".
- `cmake-essentials`' description does not borrow the bazel bundle's "the way the OCX family does".

### 10. Skill scope

- `cmake-dependency-triage` and `cmake-modernize` are procedures only. They mint no IDs (skills Verdict 1) and carry no depth.
- Each ends with a `| # | Finding | Rule |` table repeating only the MUST rows listed in note 3.1, by ID and one-line text.
- Triage uses the measured read order ((d)4). Modernize never raises a floor on its own (owner decision 9).

### 11. bazel-quality pointer patch (proposed, not applied)

The authoring PR carries this as a proposed diff in its description. The file is not edited.

1. One line at the top of `rules/bazel-quality/cpp.md` "Wrapped Foreign Builds": "The wrapped project's side of this contract is CMK-BZL in `cmake-build/bazel-seam.md`."
2. The CPS negative: 0 CPS hits in rules_foreign_cc and the BCR, re-checked at `bb2f3e5d72`.

No `BZL-CC` row is authored, renumbered or reworded.

### 12. Docs companion and bundle

- Docs pages follow the existing `docs/<name>.md` shape (see `docs/bazel-essentials.md`): `docs/cmake-build.md`, `docs/cpp-packaging.md`, `docs/cmake-dependency-triage.md`, `docs/cmake-modernize.md` and `docs/cmake-essentials.md`.
- Bundle `bundles/cmake-essentials.toml`:
  - Members are `./cmake-build`, `./cpp-packaging`, `./cmake-dependency-triage` and `./cmake-modernize`.
  - Members are **untagged**. Not a digest, a version, a floating major or `latest`.
  - `publish.toml` gets a `[bundles.cmake-essentials]` entry with `description = { readme = "docs/cmake-essentials.md", … }`. It is never released with `--pin`.
- The name is not `cpp-essentials` (Q7).
