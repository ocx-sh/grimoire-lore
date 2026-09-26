---
title: CMake and C++ package management — practitioner and failure corpus
corpus: practitioner writing, conference talks, surveys, and the failure corpus (Stack Overflow, Hacker News, issue trackers)
agent: landscape-scout
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 28
scope: |
  Covers argued positions from named CMake/Conan/vcpkg practitioners and Kitware,
  the JetBrains and ISO C++ survey numbers, and a failure-corpus taxonomy from
  Stack Overflow, Hacker News, and the top-reaction/upvoted issues on
  gitlab.kitware.com/cmake/cmake, conan-io/conan, microsoft/vcpkg,
  cpm-cmake/CPM.cmake, cpp-pm/hunter, conan-io/cmake-conan, and
  bazel-contrib/rules_foreign_cc (CMake-side causes only).
  Does NOT cover: rules_cc, hermetic C++ toolchains under Bazel, layering_check,
  sanitizers under Bazel, compile_commands under Bazel, or C++20 modules under
  Bazel — all owned by the Bazel program's BZL-CC group (see companion contract
  in cmake-frame.md). Does not re-derive Cargo/pyproject/package.json packaging
  guidance already owned by the sibling Rust/Python/TypeScript lore rule sets.
---

## Table of contents

1. [Summary](#summary)
2. [Survey](#survey)
3. [Candidate topics](#candidate-topics)
4. [Recent shifts seen in this corpus](#recent-shifts-seen-in-this-corpus)
5. [Contested](#contested)
6. [Sources](#sources)

## Summary

- CMake 4.0 (2025-03-31) deleted, not deprecated, compatibility for
  `cmake_minimum_required`/`cmake_policy` values below 3.5 — projects that
  never bumped their floor now hard-error at configure time, and the fix
  (`CMAKE_POLICY_VERSION_MINIMUM`, settable as a variable or an environment
  variable) is a packager workaround, not a project fix.
- The floor removal is not hypothetical: the actively-maintained `cpp-pm/hunter`
  fork shipped a commit in June 2026 (`Protobuf: CMake 4+ support set
  CMAKE_POLICY_VERSION_MINIMUM=3.5 (#858)`) specifically to keep a vendored
  dependency buildable under CMake 4 — real evidence of the exact failure the
  frame's hypothesis names.
- CMake 3.24 turned "dependency provider" into the real seam every package
  manager should plug into: `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` sets one
  provider at the first `project()` call, and it can intercept both
  `find_package()` and `FetchContent_MakeAvailable()`. Conan's
  `conan_provider.cmake` already uses it; this is the mechanism, not
  `CMAKE_TOOLCHAIN_FILE` collisions, that the ecosystem is converging on.
- `FetchContent`/`find_package` "meeting" is now an intentional, documented
  feature (3.24+), not just a failure mode: `FIND_PACKAGE_ARGS` on
  `FetchContent_Declare` tries `find_package` first;
  `FETCHCONTENT_TRY_FIND_PACKAGE_MODE` (NEVER/OPT_IN/ALWAYS) controls it
  globally; `OVERRIDE_FIND_PACKAGE` redirects `find_package` calls *into*
  `FetchContent`. The old failure mode (two copies of one library, target-name
  clashes) is exactly what this feature exists to prevent, and it only helps
  if the project opts in.
- CMake 3.30 (2024) changed `FetchContent` to avoid a CMake sub-build/sub-process,
  a performance change credited to Craig Scott's Professional CMake 19th
  edition (Aug 2024) — this alone can be a large win for projects with many
  `FetchContent` dependencies and predates the corpus's July-2026 "vintage".
- The Common Package Specification (CPS) moved from a CppCon 2023 Kitware/
  Bloomberg keynote proposal to shipping CMake code fast: experimental
  `CMAKE_EXPERIMENTAL_FIND_CPS_PACKAGES` import support landed pre-4.3, and
  CMake 4.3 (2026) made it first-class — `install()`/`export()` gained a
  `PACKAGE_INFO` sub-command, `find_package()` searches for CPS packages
  directly, and `project()` gained `COMPAT_VERSION`/`SPDX_LICENSE` options that
  flow into CPS descriptions. No source in this corpus calls CPS experimental
  as of CMake 4.3.
- C++20 named modules got non-experimental CMake support in 3.28 (Oct 2023):
  `CMAKE_EXPERIMENTAL_CXX_MODULE_CMAKE_API` is no longer required, but
  `import std;` was explicitly **not** supported at that point per Kitware
  contributor Ben Boeckel ("No, `import std;` has not yet been implemented");
  the frame already flags 3.30 as when `import std` becomes experimental.
  Compiler floors for modules: MSVC 14.34 (VS 17.4+), Clang 16+, GCC 14+
  (post 2023-09-20 nightly).
- The gitlab.kitware.com CMake tracker's most-upvoted *open* issue relevant to
  this program is "presets: combinatorial explosion" (44 upvotes) — presets
  lack a real mixin/composition model, so N operating systems × M configs ×
  K compilers requires hand-written cross-product presets or brittle
  `inherits` chains.
- Stack Overflow's highest-voted CMake questions (663, 606, 561, 478, 452…
  upvotes) are not exotic — they are `include_directories` vs
  `target_include_directories`, Debug-vs-Release, activating a C++ standard,
  `find_package` failing to find OpenSSL, GLOB-vs-explicit-sources, and
  "what is CMake even doing with all these generated files". The failure
  corpus's center of mass is *target-based basics*, not packaging.
- `option()` silently doing nothing when a normal variable of the same name
  is already set was significant enough to need policy `CMP0077` (3.13); the
  quoting/dereference trap for `if()` was significant enough to need
  `CMP0054` (3.1) — and CMP0054's `OLD` behavior is one of the policies
  **removed outright** in CMake 4.0, so pre-3.1-style unquoted `if()` habits
  that survived on `OLD` for a decade now simply error.
- vcpkg's own issue tracker's top-voted item after nine years is still
  "Reconsider cross-platform stance" (92 reactions, opened as issue #57) —
  the tool's original Windows-first design decision remains contested by its
  own users. Its second-highest is literally "'Why not Conan?' FAQ section
  confuses and misrepresents" (67 reactions) — the two tools' own communities
  litigate the comparison in public trackers, not just blogs.
- CPM.cmake (4,115 GitHub stars, still pushed to July 2026) sets four CMake
  policies to `NEW` on load — `CMP0077`, `CMP0126`, `CMP0135`, `CMP0150` — a
  fact a consuming project must know before wondering why its own `option()`
  or `FetchContent` semantics changed after adding CPM.
- Conan's own issue tracker shows "Non-intrusive integration with CMake"
  (19 reactions, opened years ago, #2463) and "Add ability to force using
  system-installed dependency instead of Conan package" (19 reactions, #1330)
  as recurring asks — both point at the same seam CMake's own dependency
  providers and `CPM_USE_LOCAL_PACKAGES`/`find_package`-first patterns now
  address from the CMake side.
- `cmake-conan`'s (the `conan_provider.cmake` project, 930 stars, active to
  Aug 2026) top issue by reactions is MSVC-runtime-library detection
  (`conan_cmake_detect_vs_runtime` vs `MSVC_RUNTIME_LIBRARY`, #174, 17
  reactions) — the ABI/runtime-mismatch failure class named in the brief is
  not theoretical, it is the top complaint against the CMake-Conan bridge
  itself.
- `bazel-contrib/rules_foreign_cc`'s top issues describe exactly the CMake-side
  causes the frame asked to run down: parallel-build support gaps (#329, 38
  reactions), install-time behavior differences ("files installed from the
  source directory are only symlinked", #1129), and missing `-fPIC` when
  `--force_pic` is set (#421) — all failures in how a CMake project's own
  install/PIC discipline interacts with being wrapped, not Bazel-side bugs.
- Surveys disagree on package-manager adoption by population: JetBrains'
  "State of C" 2025 (≈900 respondents, C only) shows 51% of C developers using
  *no* dependency manager at all, vcpkg at 9%, Conan at 6%; the 2024 ISO C++
  "Lite" survey (<1,300 respondents, general C++ population, down from ~1,700
  in 2023) shows Conan at 19.34% (241 resp.) and vcpkg at 19.10% (238 resp.),
  and CMake itself at ~83% build-system share (+4pp year over year). The
  populations are not the same language, and the numbers should never be
  quoted interchangeably.
- "Managing third-party libraries" as a major pain point is trending down, not
  up, in the ISO C++ survey series: 45.43% (571 respondents) called it a major
  pain in 2024, a 3-percentage-point decline since 2021 — the ecosystem's own
  survey says the ecosystem is (slowly) getting better at this, which cuts
  against treating this program's whole premise as an emergency.
- The "is Hunter dead" question the frame flags as unverified has a concrete
  answer for the maintained fork: `cpp-pm/hunter` is not dead — 673 stars,
  35 open issues, commits as recently as 2026-08-23, and it is actively
  patching for the CMake 4.0 floor problem. The original `ruslo/hunter` (not
  the fork) is the one practitioners usually mean when they call Hunter dead;
  this corpus did not check that repository directly and the distinction
  matters for anything the shipped rules say about Hunter.

## Survey

### 1. CMake official docs — Using Dependencies Guide

[`Help/guide/using-dependencies/index.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/guide/using-dependencies/index.rst)
(raw source, `master` branch) is the canonical statement of the seam this
whole program studies. It names `find_package()` and `FetchContent` as the
two primary methods, explicitly excludes `FindPkgConfig` from further
discussion, and defines "dependency provider" as the third, cooperating
mechanism. Config mode ("the more reliable method... package details should
always be in sync with the package") is contrasted with Module mode ("a
heuristic implementation... not as reliable... likely to follow different
release schedules"). It documents `FIND_PACKAGE_ARGS`,
`FETCHCONTENT_TRY_FIND_PACKAGE_MODE` (`NEVER`/default opt-in/`ALWAYS`),
`OVERRIDE_FIND_PACKAGE`, and `CMAKE_FIND_PACKAGE_REDIRECTS_DIR` (all
versionadded 3.24) as the FetchContent+find_package integration surface, and
states plainly that "only one dependency provider can be set, and it can only
be set at a very specific point" (the first `project()` call, via
`CMAKE_PROJECT_TOP_LEVEL_INCLUDES`) — "this is the recommended approach for
package managers."

### 2. CMake official docs — cmake-presets(7) manual

[`Help/manual/cmake-presets.7.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-presets.7.rst)
confirms presets were `versionadded:: 3.19`, that `CMakePresets.json` and
`CMakeUserPresets.json` share one schema and live in the project root, and
that the `include` field for composing preset files across multiple JSON
files was itself only added at schema version 4 (a later CMake release than
presets themselves) — presets grew a composition mechanism well after
adoption began, which is relevant to any "presets vs CI scripts" guidance
written against pre-schema-4 examples.

### 3. CMake official docs — CMP0077 and CMP0054 policy pages

[`Help/policy/CMP0077.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/policy/CMP0077.rst):
`option()` used to silently delete a same-named normal variable set before it
was called ("for historical reasons in CMake 3.12 and below"); 3.13 made
`option()` honor a pre-existing normal variable instead. This is exactly the
`option()`-vs-normal-variable trap named in the brief, dated and sourced.
[`Help/policy/CMP0054.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/policy/CMP0054.rst):
`if()` no longer implicitly dereferences a quoted or bracketed argument as of
3.1; critically the page carries `REMOVED_IN_CMAKE_VERSION: 4.0` — the `OLD`
(pre-3.1) behavior is gone as of CMake 4.0, not merely deprecated.
[`Help/manual/cmake-policies.7.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-policies.7.rst)
shows entire version buckets retitled "Policies Introduced by CMake 3.0,
Removed by CMake 4.0", "...2.8, Removed by CMake 4.0", "...2.6, Removed by
CMake 4.0" — the 4.0 floor removal deleted whole eras of policy compatibility
at once, not one policy.

### 4. Kitware — "CMake 4.0.0 available for download"

[kitware.com/cmake-4-0-0-available-for-download](https://www.kitware.com/cmake-4-0-0-available-for-download/)
(2025-03-31 era). States the removed-floor rule directly: "calls to
`cmake_minimum_required()` or `cmake_policy()` that set the policy version to
an older value now issue an error" for anything below 3.5. Documents the
`<min>...<max>` version-range syntax for `VERSION` in both commands as the
forward-compatible way to declare a low floor while still picking up newer
policies on newer CMake, and introduces `CMAKE_POLICY_VERSION_MINIMUM`
(settable as a CMake variable or same-named environment variable) as the
packager/end-user escape hatch for projects that have not been updated.

### 5. Kitware — "Import CMake: The Experiment Is Over"

Found via search and confirmed by fetch (title paraphrased from the post's
own framing). CMake 3.28 (2023-10-18) ships C++20 named-modules support
without needing `CMAKE_EXPERIMENTAL_CXX_MODULE_CMAKE_API`. Compiler floors:
MSVC 14.34 toolset (VS 17.4+), Clang 16.0+, GCC 14 (post 2023-09-20 nightly
build). Contributor Ben Boeckel is quoted directly: "No, `import std;` has
not yet been implemented" — the plan is a compiler-provided `CMake::CXX23`
target carrying the info needed for a standard-library module.

### 6. Kitware — "Navigating CMake Dependencies with CPS"

[kitware.com/navigating-cmake-dependencies-with-cps](https://www.kitware.com/navigating-cmake-dependencies-with-cps/).
Frames CPS as solving transitive-dependency pain directly: "A project's
dependency graph isn't just a list of leaf nodes; spdlog depends on fmt,
libarchive depends on libz, liblzma and others." Documents the pre-4.3
experimental gate `CMAKE_EXPERIMENTAL_FIND_CPS_PACKAGES` (set to a specific
UUID to opt in), a "nested mode" internal `find_package` that resolves CPS
transitive deps automatically, and `package::component` as the CPS target
naming convention.

### 7. Kitware — CMake 4.3.0 release announcement

Via targeted fetch of kitware.com/cmake-4-3-0-available-for-download. CPS
import/export is no longer gated behind the experimental variable: "Support
for importing and exporting packages described using the Common Package
Specification (CPS) was added." `install()` and `export()` gained a
`PACKAGE_INFO` sub-command to generate CPS descriptions; `find_package()`
"now searches for and can import CPS packages"; `project()` gained
`COMPAT_VERSION` and `SPDX_LICENSE` options that "may be inherited when
creating a CPS package description." No experimental-status caveats appear
in the announcement text for these features.

### 8. Bret Brown & Bill Hoffman — CppCon 2023 keynote and C++Now 2025 follow-up

["2023 Keynote, Bret Brown and Bill Hoffman: A First Step Toward Standard
C++ Dependency Management"](https://cppcon.org/2023-keynote-bret-brown-bill-hoffman/).
Joint Kitware/Bloomberg proposal for metadata files describing prebuilt C++
libraries — the origin of CPS. A C++Now 2025 follow-up session (found via
search, not independently fetched) is reported to explore CMake 4.0's
then-experimental CPS support and its downstream effects on IDEs, package
managers, and SBOM generation. Bret Brown leads Bloomberg's C++ Infrastructure
team (build systems, packaging standards, toolchain support).

### 9. Alex Reinking — "How to Use CMake Without the Agonizing Pain," parts 1–2

[Part 1](https://alexreinking.com/blog/how-to-use-cmake-without-the-agonizing-pain-part-1.html):
argues the "always require an ancient CMake minimum" habit is cargo culting,
not a real constraint — the anti-patterns are declaring a version older than
the compiler in use, never actually testing the declared floor, and
accidentally relying on post-floor behavior (generator expressions, `lib64`
handling via manual `CMAKE_SIZEOF_VOID_P` checks that CMake 3.18+ made
unnecessary). Position: pick a modern floor (3.16+ acceptable for Ubuntu-LTS
reasons, 3.20+ preferred) and actually CI-test against exactly that version.
[Part 2](https://alexreinking.com/blog/how-to-use-cmake-without-the-agonizing-pain-part-2.html):
four concrete expectations for a "quality" CMake build — a vanilla build
needs no project-specific compiler flags to succeed; incremental builds must
work without a manual reconfigure; cache-variable behavior must be
predictable; standard CMake variables must not be mutated by project code.
Recommends `CMakePresets.json` for optional settings instead of hardcoding
them into `CMakeLists.txt`. Explicitly defers dependency-wrangling strategy
("bad CMake and non-CMake dependencies") to a promised Part 3 and says a
well-behaved `find_package`-based dependency "will largely take care of
itself" — i.e. the pain is concentrated in badly-behaved dependencies, not in
`find_package` as a mechanism.

### 10. Mathieu Ropert — "Modern CMake" / modular design (CppCon 2017)

Summarized via [mropert.github.io recap](https://mropert.github.io/2017/10/14/modern_cmake_video/).
Core argument: think of a build in terms of a dependency graph ("that stuff
depends on this stuff"), not a pile of compiler flags — the traditional
Make-inherited style hides architecture inside scripting. Anti-patterns named:
flag/`-I`-based thinking, circular dependencies ("circle of hell" that blocks
isolated unit testing and reuse), and implicit architecture that a build file
does not expose. Draws explicitly on John Lakos's *Large-Scale C++ Software
Design*. Still-current position: target-based CMake is the mechanism for
enforcing the dependency-graph discipline Lakos argues for; nothing in this
corpus contradicts it for 2026.

### 11. Daniel Pfeifer — "Effective CMake" (C++Now 2017)

Summarized via secondary write-ups of the talk (slides on the
[boostcon/cppnow_presentations_2017 GitHub repo](https://github.com/boostcon/cppnow_presentations_2017/blob/master/05-19-2017_friday/effective_cmake__daniel_pfeifer__cppnow_05-19-2017.pdf)).
The canonical "rules": use targets and properties, not custom variables, to
express what to build; use `target_link_libraries` (not manual
include/library-path variables) to express dependencies; use
`PRIVATE`/`PUBLIC`/`INTERFACE` on target properties to express usage
requirements precisely; deprecate custom commands/variables rather than
removing them outright; understand `function()` vs `macro()` scoping before
choosing between them. This talk predates target-based CMake being mainstream
and is the source most other "modern CMake" advocacy in this corpus traces
back to.

### 12. HSF (HEP Software Foundation) CMake training

[hsf-training.github.io/hsf-training-cmake-webpage](https://hsf-training.github.io/hsf-training-cmake-webpage/).
States its target is "CMake 3.15+" and frames "roughly 3.12+" as the "More
Modern" era, with CMake 3.21 current at time of writing. Because 3.15 and
3.21 both sit safely above the CMake-4.0 floor of 3.5, this training's version
guidance does not need correction for the 4.0 floor change itself — but its
presets coverage (episode content not independently verified past the landing
page) should be checked against schema-4 `include` support before being cited
as current. Targets episode ("Working with Targets") is listed as episode 4;
content depth beyond the landing page was not independently verified.

### 13. CPM.cmake — GitHub README (Lars Melchior)

[github.com/cpm-cmake/CPM.cmake](https://github.com/cpm-cmake/CPM.cmake).
States its own rationale directly: CMake has no built-in dependency manager,
and CPM wraps `FetchContent` to add "version control, caching, a simple API
and more" without requiring system-wide installs. Documents
`CPM_SOURCE_CACHE` (external download directory, enables offline
configuration, cache key defaults to a hash of `CPMAddPackage()` arguments,
overridable via `CUSTOM_CACHE_KEY`) and `CPM_USE_LOCAL_PACKAGES` (try
`find_package` before downloading; `CPM_LOCAL_PACKAGES_ONLY` makes that a hard
requirement) as its two headline integration points with system/manager
packages. States its limitations candidly: no prebuilt binaries (every
first-time build compiles from source), diamond-dependency conflicts resolve
by "first version loads" precedence, and many libraries' own CMakeLists are
not subdirectory-safe. Sets policies `CMP0077`, `CMP0126`, `CMP0135`,
`CMP0150` to `NEW` on load — undocumented in most tutorials, discoverable only
by reading the script.

### 14. Conan blog (blog.conan.io) — recent post index

Fetched the live index. Active cadence continuing through 2026: "Bringing
Package Management to Swift's C++ Interoperability" (2026-09-01),
"CUDA meets Windows on ARM64... with Conan" (2026-07-30), "Introducing
conan-py-build: Build Python Wheels with Conan" (2026-05-05), "Reproducible
and traceable configuration for Conan C and C++ package manager" (lockfile
reproducibility angle, 2026-02-17), "Conan 2 Essentials and Advanced Training
Now Complete on JFrog Academy" (2026-02-03). The blog's own framing places
CMakeDeps/CMakeToolchain generators and lockfile functionality as
continuously-covered topics, not one-off posts.

### 15. vcpkg / C++ Team Blog (devblogs.microsoft.com/cppblog) — recent post index

Fetched the tag index. Monthly "What's New in vcpkg" cadence unbroken through
2026 (Aug, Jul, Jun, May, Apr entries seen). Notable: "C++ Dependencies
Without the Headache: vcpkg + Copilot CLI" (2026-07-20) — vcpkg is actively
positioning itself for AI-agent-driven dependency work, directly relevant to
this program's stated audience. The June 2026 update specifically calls out
"a vcpkg-tool switch to skip installation when packages are already cached"
— a binary-cache/reproducibility-adjacent change.

### 16. JetBrains — "The State of C" 2025 (C only, not C++)

[lp.jetbrains.com/the-state-of-c-2025](https://lp.jetbrains.com/the-state-of-c-2025/).
Sample: "almost 900 C developers from 23 countries." Build systems: CMake
56%, Makefiles 37%, Visual Studio projects 29%, Ninja 12%, Xcode 5%, Meson
4%, custom 4%. Dependency managers: **none 51%**, system package manager 28%,
vcpkg 9%, Conan 6%, NuGet 6%, build2 5%, Hunter 2%. This is a C-language
survey, not a C++ one — quoting these numbers as "C++ adoption" would
misrepresent the source; note this explicitly if reused.

### 17. JetBrains — "The C++ Ecosystem in 2023"

[blog.jetbrains.com/clion/2024/01/the-cpp-ecosystem-in-2023](https://blog.jetbrains.com/clion/2024/01/the-cpp-ecosystem-in-2023/).
34,493 total Developer Ecosystem Survey 2023 respondents, 2,627 of whom named
C++ a top-three language. Text-level claims (charts were not independently
re-derived from the article's prose): "CMake stays at the top (despite a
slight drop since last year)... msbuild and Makefiles keep losing ground...
Ninja is growing"; "we see fewer people building libraries from sources"
(interpreted as growing package-manager adoption). Exact per-tool percentages
live only in the chart image / linked full report (`jb.gg/cpp_deveco_data`),
not extractable via this fetch — flag as a data gap for any wave that needs
the precise number.

### 18. ISO C++ Foundation — 2024 Annual C++ Developer Survey "Lite"

Numbers via [moderncppdevops.com/2024-survey-results](https://moderncppdevops.com/2024-survey-results/),
which quotes the ISO C++ PDF directly. Sample: "less than 1300 developers
compared to 1700 last year" (2023), a decline the site attributes partly to
export-control restrictions at some respondent employers. CMake: "used by
over 80% of respondents," 83% specifically, +4 percentage points year over
year. "Managing third-party libraries" as a major pain point: 45.43% (571
respondents), a 3-point decline since 2021. Package-manager use: Conan
19.34% (241 respondents), vcpkg 19.10% (238 respondents) — the two are
statistically neck-and-neck in this survey, not one dominant over the other.
The 2025 and 2026 editions exist (isocpp.org blog posts confirm publication)
but their numeric summaries were not independently extracted in this pass —
the source PDFs need `pdftotext`/`pdftoppm` (unavailable in this sandbox) or
a different reader; flag as a follow-up.

### 19. Stack Overflow — `cmake` tag, sorted by votes

Fetched via the Stack Exchange API (`api.stackexchange.com`, `tagged=cmake`,
`sort=votes`), top 25 read. This is the single clearest signal in the whole
corpus for "what people cannot do": the top questions by score (663, 606,
561, 478, 452, 452, 433, 379, 354, 328, 316, 305, 298, 288, 275, 273, 266,
252, 250, 238, 232, 222, 219, 218, 216) are, respectively: cleaning CMake
output, Debug-vs-Release, CMake-vs-Makefile conceptually, the
`configure --prefix` equivalent, defining a preprocessor macro,
`include_directories` vs `target_include_directories`, activating C++11,
seeing exact compiler commands, switching GCC/Clang, printing all variables,
adding a linker/compile flag, variable set/use syntax, Autotools/CMake/SCons
differences, output-into-`bin`, `include_directories` vs
`target_include_directories` (again, different phrasing — this pair of
near-duplicates being both top-25 is itself a signal), `find_package` failing
on OpenSSL, `cmake` and `libpthread`, what `find_package()` is for when you
still need `CMAKE_MODULE_PATH`, "why so many generated files", making a
shared library, the idiomatic way to add `-fPIC`, detecting Clang, creating a
directory, GLOB-vs-explicit-file-list, and auto-adding all files in a folder.
None of the top 25 are about Conan, vcpkg, or CPS — the failure corpus's
center of mass by pure vote count is target-based-CMake fundamentals, not
packaging.

### 20. Hacker News (via Algolia API) — CMake and package-manager stories

Fetched `hn.algolia.com/api/v1/search`. CMake stories over 100 points:
"Ray Tracing in pure CMake" (292 pts, 2021), "An Introduction to Modern
CMake" (267 pts, 2018; a second submission of the same content reached 131
pts in 2020), "Modern CMake short tutorial and best practice" (170 pts,
2018), "Everything You Never Wanted to Know About CMake" (138 pts, 2019).
The two highest-scoring CMake threads on HN are novelty ("ray tracing in pure
CMake" — CMake language as an accidental Turing-tarpit demo) and
"Modern CMake" explainer content, not packaging debates — HN's CMake
discourse skews toward "look what CMake's language can/can't do" rather than
ecosystem comparison. vcpkg-specific: "Announcing a single C++ library
manager for Linux, macOS and Windows: Vcpkg" (64 pts, 2018-04-24, the
original launch announcement) and "vcpkg: a tool to acquire and build C++
open source libraries on Windows" (38 pts, 2016-09-19, pre-cross-platform).
No Conan-specific HN story over 100 points was found in this pass.

### 21. gitlab.kitware.com/cmake/cmake — top-upvoted issues

Fetched via the GitLab API (`order_by=popularity`), top 25 read. Highest:
"C++ modules support?" (80 upvotes, closed — resolved by the 3.28 work
surveyed in source 5). Then, still **open**: "presets: combinatorial
explosion" (44 upvotes, #22538) — the exact presets-composition gap named in
the summary. "Use external/system includes feature from Visual Studio 15.6"
(43, closed). "CTest: forwarding command-line arguments to test executables"
(35, closed). "add_dependencies() for 'built-in cmake targets'" (35, open).
"Support for precompiled headers" (34, closed). Also open and relevant to
this program: "Introduce a declarative specification format" (18 upvotes,
#19891 — a direct CPS precursor request) and "Simplify exporting of CMake
Packages" (17 upvotes, #18634 — install/export ergonomics, still open).

### 22. conan-io/conan — top-reaction issues

Fetched via `gh api search/issues` sorted by reactions, top 25 read. Two
issues tie at 30 reactions and are both about ConanCenter connectivity
failures (#8788 certificate/redirect loop; #9695 "unable to connect to
conancenter") — infrastructure reliability, not design, is the single most-
reacted-to complaint. Design-relevant: "Non-intrusive integration with CMake"
(19, #2463), "Add ability to force using system-installed dependency instead
of Conan package" (19, #1330 — the same "prefer system package" need
`CPM_USE_LOCAL_PACKAGES` and CMake's own dependency providers address from
the CMake side), "[workspaces] Workspaces should be Super Builds" (18,
#5762), "Support for CMake multi-configuration (for Visual Studio projects)"
(15, #330), "[feature] Generator for Bazel" (14, #6235 — direct evidence of
cross-program interest in Conan's Bazel generators, companion-scope but
notable that Conan's own users ask for it), "[lock] Provide .lock mechanism
for version ranges" (12, #1042).

### 23. microsoft/vcpkg — top-reaction issues

Fetched via `gh api search/issues`, top 25 read. Highest by a wide margin:
"Reconsider cross-platform stance" (92 reactions, #57) — vcpkg's own
oldest and most-reacted issue is a challenge to its founding design choice.
Second: "'Why not Conan?' FAQ section confuses and misrepresents" (67,
#478) — the vcpkg-vs-Conan debate is litigated inside vcpkg's own tracker,
not only in blog posts. Then: "How to specify a version of a library" (58,
#1681), "Install x64 packages as default instead of x86" (49, #1254),
"Package versioning suggestions" (44, #11177 — precursor to today's
manifest/versioning system), "--editable does not work with manifest mode"
(25, #16874), "vcpkg manifest adds a long delay to builds even when nothing
changes" (24, #14025 — a caching/performance complaint directly relevant to
this program's "binary-cache keys" topic), "[liblzma] port uses compromised
version" (19, #37839 — the xz-utils supply-chain incident reaching vcpkg's
tracker), "[Feature] Default to x64-windows triplet on x64 Windows" (20,
#12357 — the triplet-mismatch failure class named in the brief, from the
tool's own users).

### 24. cpm-cmake/CPM.cmake, cpp-pm/hunter, conan-io/cmake-conan — issues and repo activity

Fetched via `gh api search/issues` (top issues per repo) and `gh api
repos/...` (activity/maintenance signals). CPM's top issue: "CPM should
implement as a 'Dependency Provider' as of CMake v3.24" (10 reactions, #415)
— CPM's own community is asking it to adopt the mechanism source 1 describes,
years after CMake shipped it; still open as of this pass. CPM: 4,115 stars,
last push 2026-07-06, 167 open issues. Hunter (`cpp-pm/hunter` fork): top
issue is a `hunter_add_package(GITHUB)` simplification proposal (9
reactions, #265); 673 stars, 35 open issues, **last push 2026-08-27**, with a
2026-06-11 commit titled "Protobuf: CMake 4+ support set
CMAKE_POLICY_VERSION_MINIMUM=3.5 (#858)" — direct, dated proof the fork is
both alive and actively absorbing the CMake-4.0-floor problem for its
vendored packages. `cmake-conan` (conan_provider.cmake): top issue is
`conan_cmake_detect_vs_runtime` vs `MSVC_RUNTIME_LIBRARY` detection (17
reactions, #174) — an MSVC-runtime/ABI mismatch at the CMake-Conan boundary,
exactly the failure class the brief names; 930 stars, last push 2026-08-26.

### 25. bazel-contrib/rules_foreign_cc — top-reaction issues (CMake-side causes only)

Fetched via `gh api search/issues`, top 20 read. "Parallel build support"
(38 reactions, #329) — a CMake/Ninja-generator-vs-Bazel-sandbox interaction.
"osx libtool parameter error" (15, #185). "cmake: file installed from the
source directory are only symlinked" (12, #1129) — an install()-relocatability
failure exactly matching the frame's "no absolute paths in exported targets"
concern. "rules_foreign_cc doesn't add -fPIC when --force_pic is specified"
(4, #421) — a CMake project not respecting an externally-supplied PIC
requirement. Per the companion contract, these are read for CMake-side root
cause only; the Bazel-side wrapping mechanism itself is BZL-CC's dive 9.3
(row M-L-13).

### 26. Reddit r/cpp — recurring-thread search

Attempted `old.reddit.com`/`www.reddit.com` JSON search for "why is CMake
like this", "CPM vs FetchContent", and "vcpkg vs Conan" threads; blocked
(HTTP 403, Reddit's anti-bot page) in this sandbox. General web search did
not surface specific high-signal r/cpp thread URLs beyond what the GitHub
issue trackers already cover more concretely. Recorded as a gap rather than
fabricated from search snippets.

### 27. Kitware/GitLab CMake policy index — 4.0 removal scope

[`Help/manual/cmake-policies.7.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-policies.7.rst)
(same fetch as source 3, listed separately because it answers a different
question): confirms the master-branch document already lists policies
"Introduced by CMake 4.5" — i.e. the live docs track upcoming, not-yet-
released policy work ahead of the 4.4.1 release the frame names as newest.
Any dated claim from this source about "current policies" should say
whether it means the released line (4.4.x per the frame) or `master`.

## Candidate topics

| # | Topic (a question) | Why it matters | Source | Covered? | Priority |
|---|---|---|---|---|---|
| 1 | When does a `FetchContent`-declared dependency silently shadow the system copy `find_package` would have found, and how do you detect it before it ships? | Named directly by the frame; the two-copies-of-a-library failure is CMake's most-cited packaging footgun and now has an opt-in fix (`FIND_PACKAGE_ARGS`) most projects don't use | [Using Dependencies Guide](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/guide/using-dependencies/index.rst) | partial — mechanism exists in CMake 3.24+ docs, no fleet/exemplar check yet | P0 |
| 2 | Does this project's `cmake_minimum_required` floor survive CMake 4.0, and if not, is `CMAKE_POLICY_VERSION_MINIMUM` a project fix or only a packager workaround? | The single most version-dated, mechanically-checkable trap in the whole corpus; hunter's own June-2026 commit proves it still bites | [CMake 4.0 announcement](https://www.kitware.com/cmake-4-0-0-available-for-download/); [hunter #858 evidence](https://github.com/cpp-pm/hunter) | no | P0 |
| 3 | Is a project relying on `if()`'s pre-3.1 auto-dereference of quoted/bracketed arguments (CMP0054 `OLD`), and does it still build after CMake 4.0 removed that behavior entirely? | Not a deprecation — an outright removal; a `grep` for quoted variable refs inside `if()` is a mechanical check | [CMP0054.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/policy/CMP0054.rst) | no | P0 |
| 4 | Does `option()` silently discard a normal variable set before it, and is CMP0077 set to `NEW`? | Directly named in the brief; has an exact policy number and a mechanical check (`cmake --trace-expand` around the `option()` call, or grep for pre-3.13 floors) | [CMP0077.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/policy/CMP0077.rst) | no | P0 |
| 5 | Does this project use a dependency provider (`CMAKE_PROJECT_TOP_LEVEL_INCLUDES`), and is more than one being set anywhere in the build? | CMake enforces exactly one provider; two package managers' setup scripts both trying to claim it is a real, undetected-until-runtime collision | [Using Dependencies Guide](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/guide/using-dependencies/index.rst) | no | P0 |
| 6 | Does `CMAKE_TOOLCHAIN_FILE` collide between vcpkg's toolchain and Conan's `conan_toolchain.cmake`, and is the chainload variable (`VCPKG_CHAINLOAD_TOOLCHAIN_FILE`) set correctly for both project-scope and triplet-scope meanings? | Named in the brief; vcpkg's own issue #36244 documents the variable has two different meanings depending on where it's set | [vcpkg #36244](https://github.com/microsoft/vcpkg/issues/36244), [conan #12341](https://github.com/conan-io/conan/issues/12341) | no | P0 |
| 7 | Does a Conan profile's `compiler.cppstd` match the consuming project's `CMAKE_CXX_STANDARD`/`target_compile_features`, and would a mismatch be an ABI break or just a warning? | Named in the brief as a specific failure class with real ABI consequences | Corpus inference from sources 1, 22; needs a dedicated depth-file check against current Conan docs | no | P0 |
| 8 | Does the vcpkg triplet in use match the consuming project's CRT/linkage choice (`x64-windows` vs `x64-windows-static`), and is that mismatch detected at configure time or only at link time? | Named in the brief; vcpkg issue #12357 (triplet-default request) shows users hit this by default, not by misconfiguration | [vcpkg #12357](https://github.com/microsoft/vcpkg/issues/12357) | no | P0 |
| 9 | Does `install()` set RPATH/RUNPATH correctly for a relocatable package on Linux and macOS, and does the exported Config file contain any absolute build-tree path? | Named in the brief and in the Bazel-companion contract as exactly what breaks `rules_foreign_cc` wrapping | [rules_foreign_cc #1129](https://github.com/bazel-contrib/rules_foreign_cc/issues/1129) | partial — BZL-CC covers the Bazel-side wrap (row M-L-13); this program owns the CMake-side install correctness | P0 |
| 10 | Does `BUILD_SHARED_LIBS` set in a top-level project leak into a `FetchContent`/`add_subdirectory`-included dependency and silently flip its link type? | Named in the brief; a classic CMake-scoping trap with no policy number, meaning it needs a documented grep/trace check instead | Corpus inference; no single primary source read directly on this in this pass | no | P1 |
| 11 | Does the project's presets file require an `inherits` cross-product for every OS × config × compiler combination, and would a smaller preset set plus CI matrix be less brittle? | The gitlab.kitware.com tracker's top *open* relevant issue (44 upvotes) is exactly this gap | [gitlab issue #22538](https://gitlab.kitware.com/cmake/cmake/-/issues/22538) | no | P1 |
| 12 | Does a preset assume a specific generator (e.g. Ninja Multi-Config) that breaks when a CI runner only has Visual Studio's generator available? | Named in the brief as "presets that only work with one generator" | [cmake-presets.7.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-presets.7.rst) | no | P1 |
| 13 | Is this project's `CMakePresets.json` using the schema-4 `include` field, and does its CI pin a CMake old enough that `include` silently fails? | Presets gained composition (`include`) years after presets themselves; a version mismatch here is invisible until CI | [cmake-presets.7.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-presets.7.rst) | no | P1 |
| 14 | Does this project's `find_package(Pkg CONFIG)` call risk silently falling back to a stale bundled Find-module (Module mode) instead of the package's own Config file? | The canonical guide calls Module mode "not as reliable... likely to be out of date"; SO's #20746936 (252 votes) is a user hitting exactly this confusion | [Using Dependencies Guide](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/guide/using-dependencies/index.rst); [SO #20746936](https://stackoverflow.com/questions/20746936) | no | P1 |
| 15 | If this project vendors CPM.cmake, does it know CPM silently sets `CMP0077`, `CMP0126`, `CMP0135`, `CMP0150` to `NEW` on load? | Undocumented outside the CPM source itself; changes `option()` and `FetchContent` semantics project-wide without an obvious diff | [CPM.cmake README](https://github.com/cpm-cmake/CPM.cmake) | no | P1 |
| 16 | Should a new C++ project use CPM.cmake, `FetchContent` directly, vcpkg, or Conan — and does the answer change once the project needs prebuilt binaries (CPM/FetchContent always compile from source)? | Central "contested" question of the whole corpus; CPM's own README states the prebuilt-binary limitation candidly | [CPM.cmake README](https://github.com/cpm-cmake/CPM.cmake); [ISO C++ 2024 survey](https://moderncppdevops.com/2024-survey-results/) | no | P0 |
| 17 | Is the CMake project safe to wrap with `rules_foreign_cc` — no configure-time network access, `CMAKE_INSTALL_PREFIX` respected, static/shared discipline explicit? | Direct companion-contract deliverable; this program owns the CMake-side checklist, BZL-CC owns the Bazel-side wrap | [companion contract, cmake-frame.md](../cmake-frame.md); [rules_foreign_cc issues](https://github.com/bazel-contrib/rules_foreign_cc/issues) | partial — BZL-CC's dive 9.3 (row M-L-13) covers the wrap itself | P0 |
| 18 | Does the project's `install(EXPORT ...)`/Config-file generation produce a relocatable package, or does it bake in `${CMAKE_INSTALL_PREFIX}` at configure time? | Named in the brief; the top gitlab issue "Simplify exporting of CMake Packages" (17 upvotes, still open) shows this remains genuinely hard | [gitlab issue #18634](https://gitlab.kitware.com/cmake/cmake/-/issues/18634) | no | P0 |
| 19 | Should this project adopt CPS (`install(PACKAGE_INFO)`) now that CMake 4.3 made it non-experimental, or is 4.3 too new for a 3.19-floor consumer to require? | Version-specific; directly tests the frame's suspicion about CPS and its interplay with the 3.19-floor fleet consumer | [CMake 4.3 announcement](https://www.kitware.com/cmake-4-3-0-available-for-download/) | no | P1 |
| 20 | Does the project attempt C++20 named modules, and if so does it also assume `import std;` works — which CMake version first supports that experimentally? | Frame explicitly flags this as a shift to verify; source 5's Boebkel quote is dated evidence for the "not yet" state at 3.28 | [Kitware C++20 modules post](https://www.kitware.com/import-cmake-the-experiment-is-over/) | partial — BZL-CC owns C++20 modules under Bazel; this program owns the CMake-native path | P1 |
| 21 | Does `execute_process()` anywhere in this module check `RESULT_VARIABLE`, or does a failed subprocess get silently ignored at configure time? | Named in the brief; mechanical check is a grep for `execute_process` calls lacking `RESULT_VARIABLE` | Corpus inference (not independently sourced to a specific talk/post in this pass) | no | P1 |
| 22 | Does a `GIT_TAG` in any `FetchContent_Declare`/`ExternalProject_Add` point at a branch name or a moving tag rather than a commit SHA? | Named in the brief; CPM's own issue #263 ("No automatic updates if GIT_TAG points to a branch") shows even the wrapper's users misunderstand this | [CPM.cmake #263](https://github.com/cpm-cmake/CPM.cmake/issues/263) | no | P0 |
| 23 | Does any `ExternalProject_Add`/network-touching command run at configure time rather than build time, breaking sandboxed/offline builds? | Named in the brief and directly implicated in the Bazel-wrap failure class (configure-time downloads break `rules_foreign_cc`) | [companion contract](../cmake-frame.md) | partial — BZL-CC covers the Bazel-side symptom | P0 |
| 24 | Does the project use `file(GLOB ...)` for source lists, and would a source addition silently fail to trigger a reconfigure? | SO's #1027247 (218 votes) and #3201154 (216 votes) show this is one of the most-asked CMake questions of all time | [SO #1027247](https://stackoverflow.com/questions/1027247), [SO #3201154](https://stackoverflow.com/questions/3201154) | no | P1 |
| 25 | Is `CMAKE_BUILD_TYPE` ever left empty for a single-config generator, producing an unoptimized, unflagged build with no warning? | SO's #7724569 (606 votes, "Debug vs Release in CMake") is the corpus's second-highest-voted CMake question outright | [SO #7724569](https://stackoverflow.com/questions/7724569) | no | P1 |
| 26 | Does the project mutate `CMAKE_CXX_FLAGS` globally instead of using target-scoped `target_compile_options`, and does that leak into every `FetchContent`/subdirectory dependency? | Direct corollary of the modular-design argument in sources 10–11; a global-flags grep is mechanical | [Ropert modular-design talk](https://mropert.github.io/2017/10/14/modern_cmake_video/) | no | P1 |
| 27 | Does a macro in this module rely on `ARGN` without accounting for argument flattening across nested macro calls? | Named in the brief as a specific CMake-language trap distinct from the function/macro scoping point in source 11 | Corpus inference; no independently-fetched primary source in this pass | no | P2 |
| 28 | Does a function rely on `PARENT_SCOPE` to return a value, and is the call site one level of scope away from where the caller expects it? | Named in the brief; `find_ocx`'s own `ocx.cmake` has 26 `PARENT_SCOPE` uses per the frame's measurement, making this a live pattern to get right | [cmake-frame.md](../cmake-frame.md) measurement of `ocx.cmake` | no | P1 |
| 29 | Are generator expressions in this project ever evaluated as if they were configure-time strings (e.g. inside `message()` or a `string()` call)? | Named in the brief as a specific, easy-to-miss confusion between configure-time and generate-time evaluation | Corpus inference | no | P1 |
| 30 | Does the project set `MSVC_RUNTIME_LIBRARY` explicitly, or does Conan's `conan_cmake_detect_vs_runtime` disagree with it? | `cmake-conan`'s own top issue by reactions (17, #174) is exactly this detection mismatch | [cmake-conan #174](https://github.com/conan-io/cmake-conan/issues/174) | no | P0 |
| 31 | Does this codebase's install layout follow `GNUInstallDirs` for multi-arch Linux distro packaging, or does it hardcode `lib`/`lib64`? | Directly named in the frame's "distro packaging expectations" list; connects to Reinking's `lib64`/`CMAKE_SIZEOF_VOID_P` anti-pattern | [Reinking part 1](https://alexreinking.com/blog/how-to-use-cmake-without-the-agonizing-pain-part-1.html) | no | P2 |
| 32 | Is the vcpkg binary cache or Conan's cache keyed in a way that's reproducible across CI runners, and does a cache-key mismatch silently rebuild everything? | vcpkg issue #14025 ("manifest adds a long delay to builds even when nothing changes", 24 reactions) is exactly this symptom | [vcpkg #14025](https://github.com/microsoft/vcpkg/issues/14025) | no | P1 |
| 33 | Does the project pin a Conan lockfile or vcpkg baseline/version-override, and is that lockfile format still current for Conan 2 (not carried over from Conan 1)? | Conan's own blog is actively publishing on lockfile reproducibility as of Feb 2026 — an active-development area, not settled | [Conan blog, "Reproducible and traceable configuration"](https://blog.conan.io/) | no | P1 |
| 34 | Is Hunter (the `cpp-pm/hunter` fork specifically, not `ruslo/hunter`) still a defensible choice for tool/library provisioning in a new project, given its ongoing CMake-4.0 patching? | Directly tests the frame's "is Hunter dead" open question; this pass found the fork is not dead but did not check `ruslo/hunter` | [hunter repo activity, this survey §24](https://github.com/cpp-pm/hunter) | no | P1 |
| 35 | Does a dual CMake-and-Bazel project (in the mold of abseil/gRPC/protobuf/googletest) drift between its two build descriptions, and what mechanism (if any) keeps them in sync? | Named in the brief as a specific failure class; this pass did not independently audit any of the four named exemplars' actual sync tooling | [companion contract](../cmake-frame.md) | no | P2 (needs its own dive; BZL-CC may already cover the Bazel-side half) |
| 36 | Does `target_sources()` used with relative paths in a subdirectory silently attach files to the wrong target scope on CMake versions before 3.20's relative-path fix? | Named in the frame's Craig Scott coverage list (`target_sources`); this pass could not directly fetch crascit.com (403) to confirm specifics | [crascit.com](https://crascit.com/) (fetch blocked, see Sources) | no | P2 |
| 37 | Does the project avoid an in-source build, and is that enforced with a `CMAKE_SOURCE_DIR STREQUAL CMAKE_BINARY_DIR` guard rather than just documented? | Named in the brief as a classic, mechanically-checkable trap | Corpus inference | no | P2 |
| 38 | Does CTest sharding/`--test-dir` usage in this project's CI match the current CTest resource-allocation model, or is it using an older serial-only pattern? | Named in the frame's artifact-set scope (CTest) as needing a check | Corpus inference; no primary CTest doc independently re-fetched in this pass | no | P2 |
| 39 | Does a compiler-launcher (`ccache`/`sccache`) or compile-database (`compile_commands.json`) setup interact correctly with presets, or does it require CLI flags presets can't express? | Named in the frame's artifact-set scope | Corpus inference | partial — BZL-CC covers compile_commands under Bazel | P2 |
| 40 | Windows: does the build tree's path length or the presence of spaces in `CMAKE_INSTALL_PREFIX`/dependency paths break any tool in the chain (vcpkg, Ninja, MSVC)? | Named in the brief as a specific, environment-dependent failure class | Corpus inference | no | P2 |

## Recent shifts seen in this corpus

- **CMake 4.0 (2025-03-31)**: removed, not deprecated, `cmake_minimum_required`/
  `cmake_policy` floors below 3.5, and removed entire policy-version buckets
  (2.6, 2.8, 3.0, and CMP0054 individually from 3.1) outright. Any pre-2025
  practitioner advice that assumes an `OLD`-policy escape hatch for these
  needs a version caveat now; `CMAKE_POLICY_VERSION_MINIMUM` is the
  packager-side mitigation, not a project-side fix.
- **CMake 3.24 (2022) → now mainstream, 2023-2026**: dependency providers
  (`CMAKE_PROJECT_TOP_LEVEL_INCLUDES`, `cmake_language(SET_DEPENDENCY_PROVIDER)`)
  and `FetchContent`/`find_package` integration (`FIND_PACKAGE_ARGS`,
  `FETCHCONTENT_TRY_FIND_PACKAGE_MODE`, `OVERRIDE_FIND_PACKAGE`) turned a
  years-old failure mode into an opt-in feature. Guidance written before 2023
  that only describes the failure, not the fix, is now incomplete rather than
  wrong.
- **CMake 3.28 (2023-10-18)**: C++20 named modules non-experimental; `import
  std` explicitly still unsupported at that point (per Kitware's own
  contributor). The frame's flag that 3.30 makes `import std` experimental
  should be checked against current (4.x) status in a dedicated modules dive.
- **CMake 3.30 (2024)**: `FetchContent` avoids a sub-build/sub-process,
  credited by Craig Scott (Professional CMake 19th edition, Aug 2024) as a
  potentially large performance win for dependency-heavy projects. Older
  advice that treats `FetchContent` as inherently slow compared to a package
  manager needs this caveat.
- **CMake 4.3 (2026)**: CPS import/export goes from an experimental,
  UUID-gated opt-in to a first-class, undocumented-as-experimental feature —
  `install(PACKAGE_INFO)`, `export(PACKAGE_INFO)`, `find_package()` CPS
  discovery, and `project(COMPAT_VERSION SPDX_LICENSE)`. This is the single
  biggest "practice this program should not describe from 2023-era sources"
  shift in the whole corpus; CPS went from a CppCon 2023 keynote proposal to
  shipping, non-experimental CMake code in three years.
- **2026, ongoing**: both Conan's and vcpkg's own blogs are actively
  publishing on AI-agent-facing integration (Conan's Swift/C++ interop and
  Python-wheel-building posts; vcpkg's "vcpkg + Copilot CLI" post,
  2026-07-20) — the package-manager ecosystem is already building for the
  audience this program's output targets, not treating it as hypothetical.
- **2026, cache/reproducibility**: vcpkg's June 2026 update added a
  skip-install-when-cached optimization; Conan's Feb 2026 blog post is
  specifically about "reproducible and traceable configuration" — both
  ecosystems are actively hardening the binary-cache-key correctness area the
  frame flags as a candidate topic, meaning any guidance here should be
  checked against the current (2026) tool version, not a 2023-era default.

## Contested

- **FetchContent/CPM vs a package manager (Conan/vcpkg)**: Reinking's Part 2
  says a well-behaved `find_package`-based dependency "will largely take care
  of itself," implicitly favoring package managers for anything nontrivial;
  CPM's own README is candid that it always compiles from source (no prebuilt
  binaries) and resolves diamond dependencies by first-version-wins. Trend:
  CMake's own 3.24+ machinery (dependency providers, `FIND_PACKAGE_ARGS`) is
  explicitly designed so a project need not choose exclusively — the same
  `find_package()` call can be satisfied by a system package, a Conan/vcpkg
  provider, or a `FetchContent` fallback depending on what's configured. The
  either/or framing common in 2019-2022 blog posts is becoming stale.
- **vcpkg vs Conan**: litigated inside both tools' own issue trackers (vcpkg
  #478 "Why not Conan? FAQ... confuses and misrepresents"; Conan #2463 "Non-
  intrusive integration with CMake," an implicit vcpkg-toolchain-style
  critique). The 2024 ISO C++ survey shows near-parity in adoption (Conan
  19.34% vs vcpkg 19.10% of ~1,300 respondents) — no clear winner in that
  population as of 2024; the JetBrains 2025 "State of C" numbers (vcpkg 9% vs
  Conan 6%) are a different, smaller, C-only population and should not be
  read as contradicting the ISO number.
- **Is Hunter dead?**: this pass found `cpp-pm/hunter` (the maintained fork)
  is not dead — active commits through 2026-08-23, including CMake-4.0-floor
  patches. Whether the *original* `ruslo/hunter` (unmaintained, per the
  frame's own framing of "cpp-pm" as the fork that matters) is dead was not
  independently checked in this pass; any shipped guidance must be explicit
  about which repository it means.
- **Config packages vs Find modules**: uncontested in this corpus — every
  primary source (CMake's own guide, Reinking, Pfeifer) treats Config mode as
  strictly preferred and Module mode as a necessary-evil fallback for
  non-CMake-aware packages. No source argued the reverse.
- **CPS's future**: Kitware's own posts describe CPS almost entirely in
  forward-looking, un-hedged language by 4.3 (2026); this pass found no
  practitioner pushback or skepticism about CPS specifically (as distinct
  from general "another spec to learn" fatigue, which was not directly
  sourced). Absence of visible contestation here may reflect this pass's
  search terms more than genuine consensus — worth a dedicated check.
- **Presets vs CI scripts**: not directly argued for/against in this pass's
  sources, but the gitlab "combinatorial explosion" issue (44 upvotes, open)
  is indirect evidence that presets alone don't yet fully replace
  hand-written CI matrix logic for large compiler/OS/config combinations.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [gitlab.kitware.com/.../guide/using-dependencies/index.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/guide/using-dependencies/index.rst) | CMake's own canonical guide (primary, official docs) | `master`, reflects through CMake 4.x | The definitive statement of find_package/FetchContent/dependency-provider seam |
| [gitlab.kitware.com/.../manual/cmake-presets.7.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-presets.7.rst) | CMake presets manual (primary, official docs) | presets added 3.19; `include` field schema 4 | Authoritative presets schema and versioning history |
| [gitlab.kitware.com/.../policy/CMP0077.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/policy/CMP0077.rst) | CMake policy doc (primary) | introduced 3.13 | Exact `option()`-vs-variable trap, dated |
| [gitlab.kitware.com/.../policy/CMP0054.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/policy/CMP0054.rst) | CMake policy doc (primary) | introduced 3.1, removed 4.0 | Proves a real policy removal in CMake 4.0, not just deprecation |
| [gitlab.kitware.com/.../manual/cmake-policies.7.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-policies.7.rst) | CMake policy index (primary) | tracks through 4.5-in-progress | Shows scope of policies removed by CMake 4.0 |
| [kitware.com/cmake-4-0-0-available-for-download](https://www.kitware.com/cmake-4-0-0-available-for-download/) | Kitware's own release announcement (primary) | 2025-03-31 | Authoritative statement of the 4.0 floor-removal rule and `CMAKE_POLICY_VERSION_MINIMUM` |
| [kitware.com/cmake-4-3-0-available-for-download](https://www.kitware.com/cmake-4-3-0-available-for-download/) | Kitware's own release announcement (primary) | 2026 | CPS goes non-experimental: `install(PACKAGE_INFO)`, `find_package` CPS import |
| [kitware.com/navigating-cmake-dependencies-with-cps](https://www.kitware.com/navigating-cmake-dependencies-with-cps/) | Kitware blog (primary, tool vendor) | pre-4.3 | Explains the CPS transitive-dependency motivation and pre-4.3 experimental gate |
| [Kitware C++20-modules post ("Import CMake: The Experiment Is Over")](https://www.kitware.com/import-cmake-the-experiment-is-over/) | Kitware blog (primary, tool vendor) | 2023-10-18 (CMake 3.28) | Dated compiler floors and `import std` status quote from a CMake contributor |
| [cppcon.org/2023-keynote-bret-brown-bill-hoffman](https://cppcon.org/2023-keynote-bret-brown-bill-hoffman/) | CppCon 2023 keynote page (primary, talk record) | 2023 | Origin of the Common Package Specification proposal |
| [alexreinking.com — pain part 1](https://alexreinking.com/blog/how-to-use-cmake-without-the-agonizing-pain-part-1.html) | Practitioner blog (primary) | undated, pre-2025 content, still current | Version-floor anti-pattern argument with specifics |
| [alexreinking.com — pain part 2](https://alexreinking.com/blog/how-to-use-cmake-without-the-agonizing-pain-part-2.html) | Practitioner blog (primary) | undated, pre-2025 content, still current | Four concrete "quality build" expectations |
| [mropert.github.io — Modern CMake video recap](https://mropert.github.io/2017/10/14/modern_cmake_video/) | Practitioner blog (primary, author's own recap of his CppCon 2017 talk) | 2017, talk still cited as current | Dependency-graph argument for target-based CMake |
| [github.com/cpm-cmake/CPM.cmake](https://github.com/cpm-cmake/CPM.cmake) | Tool's own repository README (primary) | actively maintained, pushed 2026-07-06 | Candid statement of CPM's rationale and limitations |
| [github.com/cpp-pm/hunter](https://github.com/cpp-pm/hunter) | Tool's own repository (primary, activity check via `gh api`) | pushed 2026-08-27 | Direct evidence Hunter (fork) is maintained and patching for CMake 4.0 |
| [github.com/conan-io/cmake-conan](https://github.com/conan-io/cmake-conan) | Tool's own repository (primary, activity check via `gh api`) | pushed 2026-08-26 | `conan_provider.cmake` maintenance status and top complaint |
| [blog.conan.io](https://blog.conan.io/) | Vendor blog index (primary) | live index, entries through 2026-09-01 | Current Conan-blog cadence and topics |
| [devblogs.microsoft.com/cppblog (vcpkg tag)](https://devblogs.microsoft.com/cppblog/tag/vcpkg/) | Vendor blog index (primary) | live index, entries through 2026-08-11 | Current vcpkg-blog cadence, monthly release notes |
| [lp.jetbrains.com/the-state-of-c-2025](https://lp.jetbrains.com/the-state-of-c-2025/) | Survey report, JetBrains (primary, with stated methodology: ~900 respondents, 23 countries) | 2025 | Build-system/dependency-manager numbers for the C (not C++) population |
| [blog.jetbrains.com/clion/2024/01/the-cpp-ecosystem-in-2023](https://blog.jetbrains.com/clion/2024/01/the-cpp-ecosystem-in-2023/) | Survey report, JetBrains (primary, methodology stated: 34,493 total, 2,627 C++) | covers 2023 | C++-specific ecosystem survey; exact chart percentages need the linked full report |
| [moderncppdevops.com/2024-survey-results](https://moderncppdevops.com/2024-survey-results/) | Independent analysis quoting the ISO C++ survey PDF verbatim (secondary, but quotes primary numbers with methodology) | covers 2024 survey (<1,300 respondents) | Only accessible route in this pass to the ISO C++ survey's exact percentages (PDF rendering tools unavailable) |
| [isocpp.org/blog/2025/05/results-summary-2025-annual-cpp-developer-survey-lite](https://isocpp.org/blog/2025/05/results-summary-2025-annual-cpp-developer-survey-lite) | Survey announcement, ISO C++ Foundation (primary) | 2025 | Confirms 2025 survey exists and was published; numeric summary requires the linked PDF |
| [Stack Exchange API, `tagged=cmake, sort=votes`](https://stackoverflow.com/questions/tagged/cmake?tab=Votes) | Failure-corpus taxonomy (primary — direct API query, not search snippets) | all-time, queried 2026-09-05 | The clearest signal for "what CMake users cannot do," ranked by vote |
| [hn.algolia.com/api/v1/search](https://hn.algolia.com/) | Failure/discourse corpus (primary — direct API query) | 2018-2026 | CMake and vcpkg discourse on Hacker News, ranked by points |
| [gitlab.kitware.com/cmake/cmake/-/issues](https://gitlab.kitware.com/cmake/cmake/-/issues) | Issue tracker, sorted by upvotes (primary — direct API query) | all-time, queried 2026-09-05 | CMake maintainers' own backlog of most-wanted features/fixes |
| [github.com/conan-io/conan/issues](https://github.com/conan-io/conan/issues) | Issue tracker, sorted by reactions (primary — direct API query) | all-time, queried 2026-09-05 | Conan's own most-reacted design and reliability complaints |
| [github.com/microsoft/vcpkg/issues](https://github.com/microsoft/vcpkg/issues) | Issue tracker, sorted by reactions (primary — direct API query) | all-time, queried 2026-09-05 | vcpkg's own most-reacted design complaints, including the vcpkg-vs-Conan FAQ dispute |
| [github.com/bazel-contrib/rules_foreign_cc/issues](https://github.com/bazel-contrib/rules_foreign_cc/issues) | Issue tracker, sorted by reactions (primary — direct API query) | all-time, queried 2026-09-05 | CMake-side causes of Bazel-wrap breakage (companion-contract scope) |

## Notes on access gaps (for the next wave)

- `crascit.com` returned HTTP 403 to both the WebFetch tool and a
  browser-UA `curl` in this sandbox; Craig Scott's specific posts on
  `target_sources`, install/export, and `cmake_minimum_required` guidance
  were not read directly — only recovered secondhand via web search (the
  Professional CMake 19th-edition release notes and the FetchContent
  sub-build change). A future wave should retry with a different network
  path or accept the secondary sourcing.
- The ISO C++ Foundation's own survey PDFs (2023-2026) could not be rendered
  in this sandbox (`pdftotext`/`pdftoppm` not installed); all ISO C++ survey
  figures in this document are sourced through `moderncppdevops.com`'s
  verbatim quotations, which is a credible secondary source but not the PDF
  itself.
- Reddit's r/cpp was not reachable via its public JSON search endpoint
  (HTTP 403, anti-bot page) from this sandbox; recurring r/cpp threads named
  in the brief ("why is CMake like this", CPM-vs-FetchContent,
  vcpkg-vs-Conan) are represented in this document only via the equivalent
  GitHub-issue-tracker and Stack Overflow evidence, not Reddit itself.
- Deniz Bahadir's "More Modern CMake"/"Oh No! More Modern CMake" talks,
  Jason Turner's cpp_starter_project, Jeff Trull, and the CPS specification
  authors' own talks (Woehlke, Kelly) were named in the brief but not
  independently fetched in this pass due to time budget — flagged as gaps
  rather than fabricated.
