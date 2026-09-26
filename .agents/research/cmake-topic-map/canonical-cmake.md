---
title: CMake canonical corpus survey
program: cmake
agent: cmake-scout-canonical
model: sonnet
date_researched: 2026-09-05
sources_count: 32
scope: |
  CMake's own documentation (Help/ manuals, the full CMP0000-CMP0219 policy
  catalogue, dev/experimental.rst, Help/release/4.0-4.4 notes) plus the
  tables of contents of the canonical books and living guides. Does not
  cover Conan 2, vcpkg, Hunter/cpp-pm, or CPM.cmake (see the sibling
  `package-managers-canonical.md` in this same directory) or the Bazel-side
  C++ toolchain/rules_cc/layering_check/sanitizer/C++20-modules-under-Bazel
  work (BZL-CC family in the Bazel program).
---

# CMake canonical corpus survey

## Table of contents

1. [Summary](#summary)
2. [Survey](#survey)
3. [Candidate topics](#candidate-topics)
4. [Recent shifts seen in this corpus](#recent-shifts-seen-in-this-corpus)
5. [Contested](#contested)
6. [Sources](#sources)

## Summary

- CMake 4.4.1 is the latest stable release as of 2026-09-05; the raw docs on
  `master` already describe unreleased 4.5 content (presets schema 13,
  `cmake_language(PRINT_TARGETS)`, a `${configurePresetName}` macro) —
  anything tagged `versionadded:: 4.5` in this survey is flagged not-yet-shipped.
- CMake 4.4 (the current release) replaced the old `-Wdev`/`CMAKE_WARN_DEPRECATED`
  warning system with a brand-new `cmake-diagnostics(7)` manual, a
  `cmake_diagnostic()` command, and nine named diagnostic categories.
  `-W[no-][error=]dev` is now a **deprecated spelling** of `-W[no-][error=]author`.
  This directly affects any rule that names `cmake -Werror=dev` as its
  verification command.
- Policy numbers run CMP0000 through CMP0219 (220 policies total). 66 have had
  their OLD behavior deleted outright by CMake 4.0 (CMP0001-CMP0065, all
  originally introduced at 3.4 or earlier); 49 more are already forced to NEW
  by a `cmake_minimum_required(VERSION 3.19)` floor; **105 are genuinely live
  decisions** for a 3.19-floor project (everything introduced 3.20 through 4.4).
- CMake 4.0's headline break is textual and absolute: "Compatibility with
  versions of CMake older than 3.5 has been removed" — any
  `cmake_minimum_required`/`cmake_policy(VERSION ...)` call below 3.5,
  anywhere in the tree including a vendored dependency, now hard-errors at
  configure time instead of warning. `CMAKE_POLICY_VERSION_MINIMUM` (new in
  4.0) is the sanctioned escape hatch for packagers stuck with such a tree.
- `FetchContent`'s `OVERRIDE_FIND_PACKAGE` (3.24) and dependency providers
  (`cmake_language(SET_DEPENDENCY_PROVIDER)`, also 3.24) are two distinct,
  cooperating mechanisms for the same failure mode — a project silently
  getting a fetched copy instead of the system's `find_package` result — and
  the module's own docs draw the line explicitly: "`FIND_PACKAGE_ARGS` is
  intended for project control, whereas dependency providers allow users to
  override project behavior."
- `CMAKE_FIND_PACKAGE_REDIRECTS_DIR` is the literal mechanism `OVERRIDE_FIND_PACKAGE`
  uses to make a later `find_package(<name>)` call resolve to a
  `FetchContent`-populated tree — from the call site there is no way to tell
  the difference between "found on the system" and "silently substituted."
- CPS export (`install(EXPORT)` → Common Package Specification) and C++
  `import std` support are both still gated behind `CMAKE_EXPERIMENTAL_*`
  variables in 4.4, each requiring an exact UUID literal that the docs warn
  "will change over time to reinforce their experimental nature" — hardcoding
  one is a guaranteed future break.
- A new experimental `install(SBOM)`/`export(SBOM)` pair (gated by
  `CMAKE_EXPERIMENTAL_GENERATE_SBOM`) exists as of the current release,
  aimed at generating a Software Bill of Materials for a project's install tree.
- CMake Presets schema has reached version 12 (shipped in 4.4, which itself
  renamed the `dev` field to `author` in `configurePresets.warnings`/`errors`
  to track the diagnostics overhaul) with version 13 already drafted for 4.5.
- `cmake-modules(7)` currently lists FindBoost, FindCUDA, FindPythonInterp,
  FindPythonLibs, FindQt, FindwxWindows, FindITK, FindVTK, FindGDAL, FindDart,
  FindCABLE, FindGCCXML, and FindUnixCommands under "Deprecated Find Modules" —
  several of these (FindBoost, FindCUDA, FindPythonInterp/Libs) were *later*
  hard-removed by their own dedicated policies (CMP0167/CMP0146/CMP0148),
  so "deprecated" and "gone" are two different questions with two different sources.
- Professional CMake (Craig Scott) titles its own landing page "22nd Edition,"
  confirming it is continuously revised rather than a fixed historical text —
  but the page itself blocks automated fetches (Cloudflare challenge), so its
  chapter list here is reconstructed from search-indexed fragments, not read verbatim.
- Kitware maintains "Mastering CMake" as a living, versioned online book at
  `cmake.org/cmake/help/book/mastering-cmake/`, sharing chapters ("Using
  Dependencies Guide", "Importing and Exporting Guide") with the core
  `Help/guide/` tree — it tracks the current release, not a 2015 print edition.
- "An Introduction to Modern CMake" (cliutils) has been rebuilt on a MyST/JS
  stack; its live page list (confirmed via `sitemap.xml`, since the sidebar
  is client-rendered) still tracks a beginner-to-packaging arc: installing →
  basics → structure → features (incl. C++11, small projects, utilities) →
  modules → IDEs → debugging → FetchContent/git submodules → testing
  (googletest/Catch2) → install/export → packaging → domain add-ons (CUDA,
  OpenMP, Boost, MPI, ROOT).
- "Effective Modern CMake" (mbinna gist, 245 lines) is a flat checklist of
  ~35 do/don't rules whose section headers ARE the rule text verbatim (e.g.
  "Don't abuse usage requirements", "Don't use `file(GLOB)` in projects",
  "Treat warnings as errors") — every header is directly quotable as a
  candidate topic without paraphrase.
- CMake Cookbook (Bast & Di Remigio) is 15 chapters progressing from a single
  executable through cross-language projects, superbuilds, installers,
  packaging, docs, cross-compilation, and finally Chapter 15, "Porting a
  Project to CMake" — the closest canonical analogue to the frame's suspected
  `cmake-modernize` procedure.
- `cmake_language(SET_DEPENDENCY_PROVIDER)` can only be called from a file
  listed in `CMAKE_PROJECT_TOP_LEVEL_INCLUDES`, and only during the first
  `project()` call — the docs frame this as a deliberate guarantee: "The
  choice of dependency provider should always be under the user's control."
- CMake 4.2 added the `Visual Studio 18 2026` and `FASTBuild` generators —
  both dated inside this corpus's 18-24-month window and absent from any
  pre-4.2 guidance, book, or blog post.
- `cmake-toolchains(7)` still enumerates a long, fragmented, per-platform list
  of cross-compiling recipes (three distinct Android paths; iOS/tvOS/visionOS/
  watchOS with code signing and device/simulator switching; Emscripten; three
  Renesas compiler families) rather than one unified model — cross-compiling
  guidance is inherently per-platform, never a single rule.
- `dev/experimental.rst` documents five active experimental gates as of this
  release (Export Package Dependencies, CPS export, `import std`, build-database
  export, SBOM generation) plus Rust support, every one of them keyed off a
  version-specific UUID rather than a stable flag name.

## Survey

### 1. [cmake-buildsystem(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-buildsystem.7.rst)

37 sections covering binary target types (Executables, Static/Shared/Module/Object
Libraries, Apple Frameworks), "Build Specification and Usage Requirements"
(Target Commands, File Sets, Target Compile/Link Properties, Transitive
Compile/Link Properties, Compatible Interface Properties, Property Origin
Debugging), "Build Specification with Generator Expressions" (Include
Directories, Link Libraries, Output Artifacts — Runtime/Library/Archive),
Directory-Scoped Commands, Build Configurations (Case Sensitivity, Default
And Custom Configurations), and Pseudo Targets (Imported, Alias, Interface
Libraries and their allowed properties). This is the manual that defines
"usage requirements" as CMake's core abstraction: a target's `INTERFACE_*`
properties propagate to consumers via `target_link_libraries`, which is why
every `PUBLIC`/`PRIVATE`/`INTERFACE` keyword choice is load-bearing.

### 2. [cmake-packages(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-packages.7.rst)

Draws the Config-file-package vs. Find-module-package line explicitly: "A
config-file package is a set of files provided by upstreams for downstreams
to use... A find module is a file with a set of rules for finding the
required pieces of a dependency... Unlike a package configuration file, it
is not shipped with upstream." `<PackageName>_FOUND` is automatic for Config
packages, "by convention" only for Find modules. Documents
`CMAKE_DISABLE_FIND_PACKAGE_<PackageName>` / `CMAKE_REQUIRE_FIND_PACKAGE_<PackageName>`,
the full package-registry mechanism (user vs. system, `export(PACKAGE)`,
`CMAKE_FIND_PACKAGE_NO_PACKAGE_REGISTRY`), and a complete worked example of
building a relocatable Config package with `CMakePackageConfigHelpers`,
`GenerateExportHeader`, `write_basic_package_version_file`, and
`install(EXPORT ... NAMESPACE Upstream::)`. Notes the double-colon namespace
convention exists specifically so CMake can diagnose a missing dependency
rather than emit a bare linker error.

### 3. [cmake-policies(7)](https://cmake.org/cmake/help/latest/manual/cmake-policies.7.html) — the full CMP0000-CMP0219 catalogue

The rendered manual groups every policy under a "Policies Introduced by
CMake X.Y[, Removed by CMake 4.0]" heading, with each policy's own one-line
title serving as Kitware's own summary of what changed. Extracted
programmatically (`curl` + regex over the HTML, verified against the raw
`Help/policy/*.rst` naming), this yields 220 policies: **154 active, 66
removed-by-4.0**. Of the 154 active, 105 were introduced after 3.19 and are
therefore genuine per-project decisions for a 3.19-floor codebase; the
remaining 49 are already forced to NEW by that floor's implicit
`cmake_policy(VERSION 3.19)`. Full table:

Legend for "Live?": **yes** = introduced after 3.19, so a
`cmake_minimum_required(VERSION 3.19)` floor does NOT default it to NEW — a
real per-project decision. "no (already NEW)" = introduced at or before
3.19, already forced NEW by that floor. "n/a (OLD gone)" = one of the 66
policies whose OLD behavior CMake 4.0 deleted outright; it only bites when a
*dependency's* embedded `cmake_minimum_required` is below 3.5, which is now
a hard configure error rather than a policy warning.

| Policy | Introduced | One line on the mistake it fixes (Kitware's own wording, lightly trimmed) | Live for a 3.19 floor? | Governs |
|---|---|---|---|---|
| CMP0219 | 4.4 | Macro invocations preserve backslashes in arguments. | **yes** | — |
| CMP0218 | 4.4 | The CMAKE_WARN_DEPRECATED and CMAKE_ERROR_DEPRECATED variables are ignored. | **yes** | `CMAKE_WARN_DEPRECATED` |
| CMP0217 | 4.4 | The MACROS directory property does not exist anymore. | **yes** | `MACROS` |
| CMP0216 | 4.4 | Swift targets have a default project name. | **yes** | — |
| CMP0215 | 4.4 | Ninja generators emit Swift modules separately from compilation. | **yes** | — |
| CMP0214 | 4.4 | Honor CMAKE_EXE_LINKER_FLAGS for Swift executable targets. | **yes** | `CMAKE_EXE_LINKER_FLAGS` |
| CMP0213 | 4.4 | file(ARCHIVE_{CREATE,EXTRACT}) encode archive paths as UTF-8 by default. | **yes** | `ARCHIVE_` |
| CMP0212 | 4.4 | add_custom_command DEPENDS does not strip .exe suffixes. | **yes** | `DEPENDS` |
| CMP0211 | 4.4 | A file may belong to at most one non-HEADERS file set in a target. | **yes** | `HEADERS` |
| CMP0210 | 4.3 | CMAKE_<LANG>_LINK_FLAGS adds link flags to all target types. | **yes** | `CMAKE_` |
| CMP0209 | 4.3 | Verify interface header sets checks executables without exports. | **yes** | — |
| CMP0208 | 4.3 | export(EXPORT) does not allow empty arguments. | **yes** | `EXPORT` |
| CMP0207 | 4.3 | file(GET_RUNTIME_DEPENDENCIES) normalizes paths before matching. | **yes** | `GET_RUNTIME_DEPENDENCIES` |
| CMP0206 | 4.3 | The CPack Archive Generator defaults to UID 0 and GID 0. | **yes** | `UID` |
| CMP0205 | 4.3 | file(CREATE_LINK) with COPY_ON_ERROR copies directory content. | **yes** | `CREATE_LINK` |
| CMP0204 | 4.2 | A character set is always defined when targeting the MSVC ABI. | **yes** | `MSVC` |
| CMP0203 | 4.2 | _WINDLL is defined for shared libraries targeting the MSVC ABI. | **yes** | `MSVC` |
| CMP0202 | 4.2 | PDB file names always include their target's per-config POSTFIX. | **yes** | `PDB` |
| CMP0201 | 4.2 | Python::NumPy does not depend on Python::Development.Module. | **yes** | — |
| CMP0200 | 4.2 | Location and configuration selection for imported targets is more consistent. | **yes** | — |
| CMP0199 | 4.2 | $<CONFIG> does not match mapped configurations that are not selected. | **yes** | `CONFIG` |
| CMP0198 | 4.2 | CMAKE_PARENT_LIST_FILE is not defined in CMakeLists.txt. | **yes** | `CMAKE_PARENT_LIST_FILE` |
| CMP0197 | 4.1 | MSVC link -machine: flag is not in CMAKE_*_LINKER_FLAGS. | **yes** | `MSVC` |
| CMP0196 | 4.1 | The CMakeDetermineVSServicePack module is removed. | **yes** | — |
| CMP0195 | 4.1 | Swift modules in build trees use the Swift module directory structure. | **yes** | — |
| CMP0194 | 4.1 | MSVC is not an assembler for language ASM. | **yes** | `MSVC` |
| CMP0193 | 4.1 | GNUInstallDirs caches CMAKE_INSTALL_* with leading 'usr/' for install prefix '/'. | **yes** | `CMAKE_INSTALL_` |
| CMP0192 | 4.1 | GNUInstallDirs uses absolute SYSCONFDIR, LOCALSTATEDIR, and RUNSTATEDIR in special prefixes. | **yes** | `SYSCONFDIR` |
| CMP0191 | 4.1 | The FindCABLE module is removed. | **yes** | — |
| CMP0190 | 4.1 | FindPython enforce consistency in cross-compiling mode. | **yes** | — |
| CMP0189 | 4.1 | TARGET_PROPERTY evaluates LINK_LIBRARIES properties transitively. | **yes** | `TARGET_PROPERTY` |
| CMP0188 | 4.1 | The FindGCCXML module is removed. | **yes** | — |
| CMP0187 | 4.1 | Include source file without an extension after the same name with an extension. | **yes** | — |
| CMP0186 | 4.1 | Regular expressions match ^ at most once in repeated searches. | **yes** | — |
| CMP0185 | 4.0 | FindRuby no longer provides upper-case RUBY_* variables. | **yes** | `RUBY_` |
| CMP0184 | 4.0 | MSVC runtime checks flags are selected by an abstraction. | **yes** | `MSVC` |
| CMP0183 | 4.0 | add_feature_info() supports full Condition Syntax. | **yes** | `add_feature_info()` |
| CMP0182 | 4.0 | Create shared library archives by default on AIX. | **yes** | `AIX` |
| CMP0181 | 4.0 | Link command-line fragment variables are parsed and re-quoted. | **yes** | — |
| CMP0180 | 3.31 | project() always sets <PROJECT-NAME>_* as normal variables. | **yes** | `project()` |
| CMP0179 | 3.31 | De-duplication of static libraries on link lines keeps first occurrence. | **yes** | — |
| CMP0178 | 3.31 | Test command lines preserve empty arguments. | **yes** | — |
| CMP0177 | 3.31 | install() DESTINATION paths are normalized. | **yes** | `install()` |
| CMP0176 | 3.31 | execute_process() ENCODING is UTF-8 by default. | **yes** | `execute_process()` |
| CMP0175 | 3.31 | add_custom_command() rejects invalid arguments. | **yes** | `add_custom_command()` |
| CMP0174 | 3.31 | cmake_parse_arguments(PARSE_ARGV) defines a variable for an empty string after a single-value keyword. | **yes** | `PARSE_ARGV` |
| CMP0173 | 3.31 | The CMakeFindFrameworks module is removed. | **yes** | — |
| CMP0172 | 3.31 | The CPack module enables per-machine installation by default in the CPack WIX Generator. | **yes** | `WIX` |
| CMP0171 | 3.31 | 'codegen' is a reserved target name. | **yes** | — |
| CMP0170 | 3.30 | FETCHCONTENT_FULLY_DISCONNECTED requirements are enforced. | **yes** | `FETCHCONTENT_FULLY_DISCONNECTED` |
| CMP0169 | 3.30 | FetchContent_Populate(depName) single-argument signature is deprecated. | **yes** | `FetchContent_Populate` |
| CMP0168 | 3.30 | FetchContent implements steps directly instead of through a sub-build. | **yes** | — |
| CMP0167 | 3.30 | The FindBoost module is removed. | **yes** | — |
| CMP0166 | 3.30 | TARGET_PROPERTY evaluates link properties transitively over private dependencies of static libraries. | **yes** | `TARGET_PROPERTY` |
| CMP0165 | 3.30 | enable_language() must not be called before project(). | **yes** | `enable_language()` |
| CMP0164 | 3.30 | add_library() rejects SHARED libraries when not supported by the platform. | **yes** | `add_library()` |
| CMP0163 | 3.30 | The GENERATED source file property is now visible in all directories. | **yes** | `GENERATED` |
| CMP0162 | 3.30 | Visual Studio generators add UseDebugLibraries indicators by default. | **yes** | — |
| CMP0161 | 3.29 | CPACK_PRODUCTBUILD_DOMAINS defaults to true. | **yes** | `CPACK_PRODUCTBUILD_DOMAINS` |
| CMP0160 | 3.29 | More read-only target properties now error when trying to set them. | **yes** | — |
| CMP0159 | 3.29 | file(STRINGS) with REGEX updates CMAKE_MATCH_<n>. | **yes** | `STRINGS` |
| CMP0158 | 3.29 | add_test() honors CMAKE_CROSSCOMPILING_EMULATOR only when cross-compiling. | **yes** | `add_test()` |
| CMP0157 | 3.29 | Swift compilation mode is selected by an abstraction. | **yes** | — |
| CMP0156 | 3.29 | De-duplicate libraries on link lines based on linker capabilities. | **yes** | — |
| CMP0155 | 3.28 | C++ sources in targets with at least C++20 are scanned for imports when supported. | **yes** | — |
| CMP0154 | 3.28 | Generated files are private by default in targets using file sets. | **yes** | — |
| CMP0153 | 3.28 | The exec_program command should not be called. | **yes** | `exec_program` |
| CMP0152 | 3.28 | file(REAL_PATH) resolves symlinks before collapsing ../ components. | **yes** | `REAL_PATH` |
| CMP0151 | 3.27 | AUTOMOC include directory is a system include directory by default. | **yes** | `AUTOMOC` |
| CMP0150 | 3.27 | ExternalProject_Add and FetchContent_Declare treat relative git repository paths as being relative to parent project's remote. | **yes** | `ExternalProject_Add` |
| CMP0149 | 3.27 | Visual Studio generators select latest Windows SDK by default. | **yes** | `SDK` |
| CMP0148 | 3.27 | The FindPythonInterp and FindPythonLibs modules are removed. | **yes** | — |
| CMP0147 | 3.27 | Visual Studio generators build custom commands in parallel. | **yes** | — |
| CMP0146 | 3.27 | The FindCUDA module is removed. | **yes** | — |
| CMP0145 | 3.27 | The Dart and FindDart modules are removed. | **yes** | — |
| CMP0144 | 3.27 | find_package uses upper-case PACKAGENAME_ROOT variables. | **yes** | `PACKAGENAME_ROOT` |
| CMP0143 | 3.26 | USE_FOLDERS global property is treated as ON by default. | **yes** | `USE_FOLDERS` |
| CMP0142 | 3.25 | The Xcode generator does not append per-config suffixes to library search paths. | **yes** | — |
| CMP0141 | 3.25 | MSVC debug information format flags are selected by an abstraction. | **yes** | `MSVC` |
| CMP0140 | 3.25 | The return() command checks its arguments. | **yes** | `return()` |
| CMP0139 | 3.24 | The if() command supports path comparisons using PATH_EQUAL operator. | **yes** | `if()` |
| CMP0138 | 3.24 | CheckIPOSupported uses flags from calling project. | **yes** | — |
| CMP0137 | 3.24 | try_compile() passes platform variables in project mode. | **yes** | `try_compile()` |
| CMP0136 | 3.24 | Watcom runtime library flags are selected by an abstraction. | **yes** | — |
| CMP0135 | 3.24 | ExternalProject and FetchContent ignore timestamps in archives by default for the URL download method. | **yes** | `URL` |
| CMP0134 | 3.24 | Fallback to "HOST" Windows registry view when "TARGET" view is not usable. | **yes** | `HOST` |
| CMP0133 | 3.24 | The CPack module disables SLA by default in the CPack DragNDrop Generator. | **yes** | `SLA` |
| CMP0132 | 3.24 | Do not set compiler environment variables on first run. | **yes** | — |
| CMP0131 | 3.24 | LINK_LIBRARIES supports the LINK_ONLY generator expression. | **yes** | `LINK_LIBRARIES` |
| CMP0130 | 3.24 | while() diagnoses condition evaluation errors. | **yes** | `while()` |
| CMP0129 | 3.23 | Compiler id for MCST LCC compilers is now LCC, not GNU. | **yes** | `MCST` |
| CMP0128 | 3.22 | Selection of language standard and extension flags improved. | **yes** | — |
| CMP0127 | 3.22 | cmake_dependent_option() supports full Condition Syntax. | **yes** | `cmake_dependent_option()` |
| CMP0126 | 3.21 | set(CACHE) does not remove a normal variable of the same name. | **yes** | `CACHE` |
| CMP0125 | 3.21 | find_(path\|file\|library\|program) have consistent behavior for cache variables. | **yes** | — |
| CMP0124 | 3.21 | foreach() loop variables are only available in the loop scope. | **yes** | `foreach()` |
| CMP0123 | 3.21 | ARMClang cpu/arch compile and link flags must be set explicitly. | **yes** | — |
| CMP0122 | 3.21 | UseSWIG use standard library name conventions for csharp language. | **yes** | — |
| CMP0121 | 3.21 | The list command detects invalid indices. | **yes** | — |
| CMP0120 | 3.20 | The WriteCompilerDetectionHeader module is removed. | **yes** | — |
| CMP0119 | 3.20 | LANGUAGE source file property explicitly compiles as language. | **yes** | `LANGUAGE` |
| CMP0118 | 3.20 | GENERATED sources may be used across directories without manual marking. | **yes** | `GENERATED` |
| CMP0117 | 3.20 | MSVC RTTI flag /GR is not added to CMAKE_CXX_FLAGS by default. | **yes** | `MSVC` |
| CMP0116 | 3.20 | Ninja generators transform DEPFILEs from add_custom_command(). | **yes** | `add_custom_command()` |
| CMP0115 | 3.20 | Source file extensions must be explicit. | **yes** | — |
| CMP0114 | 3.19 | ExternalProject step targets fully adopt their steps. | no (already NEW) | — |
| CMP0113 | 3.19 | Makefile generators do not repeat custom commands from target dependencies. | no (already NEW) | — |
| CMP0112 | 3.19 | Target file component generator expressions do not add target dependencies. | no (already NEW) | — |
| CMP0111 | 3.19 | An imported target missing its location property fails during generation. | no (already NEW) | — |
| CMP0110 | 3.19 | add_test() supports arbitrary characters in test names. | no (already NEW) | `add_test()` |
| CMP0109 | 3.19 | find_program() requires permission to execute but not to read. | no (already NEW) | `find_program()` |
| CMP0108 | 3.18 | A target cannot link to itself through an alias. | no (already NEW) | — |
| CMP0107 | 3.18 | An ALIAS target cannot overwrite another target. | no (already NEW) | `ALIAS` |
| CMP0106 | 3.18 | The Documentation module is removed. | no (already NEW) | — |
| CMP0105 | 3.18 | Device link step uses the link options. | no (already NEW) | — |
| CMP0104 | 3.18 | CMAKE_CUDA_ARCHITECTURES now detected for NVCC, empty CUDA_ARCHITECTURES not allowed. | no (already NEW) | `CMAKE_CUDA_ARCHITECTURES` |
| CMP0103 | 3.18 | Multiple export() with same FILE without APPEND is not allowed. | no (already NEW) | `export()` |
| CMP0102 | 3.17 | mark_as_advanced() does nothing if a cache entry does not exist. | no (already NEW) | `mark_as_advanced()` |
| CMP0101 | 3.17 | target_compile_options honors BEFORE keyword in all scopes. | no (already NEW) | `BEFORE` |
| CMP0100 | 3.17 | Let AUTOMOC and AUTOUIC process .hh header files. | no (already NEW) | `AUTOMOC` |
| CMP0099 | 3.17 | Link properties are transitive over private dependencies of static libraries. | no (already NEW) | — |
| CMP0098 | 3.17 | FindFLEX runs flex in CMAKE_CURRENT_BINARY_DIR when executing. | no (already NEW) | `CMAKE_CURRENT_BINARY_DIR` |
| CMP0097 | 3.16 | ExternalProject_Add with GIT_SUBMODULES "" initializes no submodules. | no (already NEW) | `GIT_SUBMODULES` |
| CMP0096 | 3.16 | project() preserves leading zeros in version components. | no (already NEW) | `project()` |
| CMP0095 | 3.16 | RPATH entries are properly escaped in the intermediary CMake install script. | no (already NEW) | `RPATH` |
| CMP0094 | 3.15 | FindPython3, FindPython2 and FindPython use LOCATION for lookup strategy. | no (already NEW) | `LOCATION` |
| CMP0093 | 3.15 | FindBoost reports Boost_VERSION in x.y.z format. | no (already NEW) | `Boost_VERSION` |
| CMP0092 | 3.15 | MSVC warning flags are not in CMAKE_{C,CXX}_FLAGS by default. | no (already NEW) | `MSVC` |
| CMP0091 | 3.15 | MSVC runtime library flags are selected by an abstraction. | no (already NEW) | `MSVC` |
| CMP0090 | 3.15 | export(PACKAGE) does not populate package registry by default. | no (already NEW) | `PACKAGE` |
| CMP0089 | 3.15 | Compiler id for IBM Clang-based XL compilers is now XLClang. | no (already NEW) | `IBM` |
| CMP0088 | 3.14 | FindBISON runs bison in CMAKE_CURRENT_BINARY_DIR when executing. | no (already NEW) | `CMAKE_CURRENT_BINARY_DIR` |
| CMP0087 | 3.14 | install(SCRIPT \| CODE) supports generator expressions. | no (already NEW) | `SCRIPT` |
| CMP0086 | 3.14 | UseSWIG honors SWIG_MODULE_NAME via -module flag. | no (already NEW) | `SWIG_MODULE_NAME` |
| CMP0085 | 3.14 | IN_LIST generator expression handles empty list items. | no (already NEW) | `IN_LIST` |
| CMP0084 | 3.14 | The FindQt module does not exist for find_package(). | no (already NEW) | `find_package()` |
| CMP0083 | 3.14 | Add PIE options when linking executable. | no (already NEW) | `PIE` |
| CMP0082 | 3.14 | Install rules from add_subdirectory() are interleaved with those in caller. | no (already NEW) | `add_subdirectory()` |
| CMP0081 | 3.13 | Relative paths not allowed in LINK_DIRECTORIES target property. | no (already NEW) | `LINK_DIRECTORIES` |
| CMP0080 | 3.13 | BundleUtilities cannot be included at configure time. | no (already NEW) | — |
| CMP0079 | 3.13 | target_link_libraries allows use with targets in other directories. | no (already NEW) | `target_link_libraries` |
| CMP0078 | 3.13 | UseSWIG generates standard target names. | no (already NEW) | — |
| CMP0077 | 3.13 | option() honors normal variables. | no (already NEW) | `option()` |
| CMP0076 | 3.13 | target_sources() command converts relative paths to absolute. | no (already NEW) | `target_sources()` |
| CMP0075 | 3.12 | Include file check macros honor CMAKE_REQUIRED_LIBRARIES. | no (already NEW) | `CMAKE_REQUIRED_LIBRARIES` |
| CMP0074 | 3.12 | find_package uses PackageName_ROOT variables. | no (already NEW) | `find_package` |
| CMP0073 | 3.12 | Do not produce legacy _LIB_DEPENDS cache entries. | no (already NEW) | `_LIB_DEPENDS` |
| CMP0072 | 3.11 | FindOpenGL prefers GLVND by default when available. | no (already NEW) | `GLVND` |
| CMP0071 | 3.10 | Let AUTOMOC and AUTOUIC process GENERATED files. | no (already NEW) | `AUTOMOC` |
| CMP0070 | 3.10 | Define file(GENERATE) behavior for relative paths. | no (already NEW) | `GENERATE` |
| CMP0069 | 3.9 | INTERPROCEDURAL_OPTIMIZATION is enforced when enabled. | no (already NEW) | `INTERPROCEDURAL_OPTIMIZATION` |
| CMP0068 | 3.9 | RPATH settings on macOS do not affect install_name. | no (already NEW) | `RPATH` |
| CMP0067 | 3.8 | Honor language standard in try_compile() source-file signature. | no (already NEW) | `try_compile()` |
| CMP0066 | 3.7 | Honor per-config flags in try_compile() source-file signature. | no (already NEW) | `try_compile()` |
| CMP0065 | 3.4 | Do not add flags to export symbols from executables without the ENABLE_EXPORTS target property. | n/a (OLD gone) | `ENABLE_EXPORTS` |
| CMP0064 | 3.4 | Support new TEST if() operator. | n/a (OLD gone) | `if()` |
| CMP0063 | 3.3 | Honor visibility properties for all target types. | n/a (OLD gone) | — |
| CMP0062 | 3.3 | Disallow install() of export() result. | n/a (OLD gone) | `install()` |
| CMP0061 | 3.3 | CTest does not by default tell make to ignore errors (-i). | n/a (OLD gone) | — |
| CMP0060 | 3.3 | Link libraries by full path even in implicit directories. | n/a (OLD gone) | — |
| CMP0059 | 3.3 | Do not treat DEFINITIONS as a built-in directory property. | n/a (OLD gone) | `DEFINITIONS` |
| CMP0058 | 3.3 | Ninja requires custom command byproducts to be explicit. | n/a (OLD gone) | — |
| CMP0057 | 3.3 | Support new IN_LIST if() operator. | n/a (OLD gone) | `if()` |
| CMP0056 | 3.2 | Honor link flags in try_compile() source-file signature. | n/a (OLD gone) | `try_compile()` |
| CMP0055 | 3.2 | Strict checking for break() command. | n/a (OLD gone) | `break()` |
| CMP0054 | 3.1 | Only interpret if() arguments as variables or keywords when unquoted. | n/a (OLD gone) | `if()` |
| CMP0053 | 3.1 | Simplify variable reference and escape sequence evaluation. | n/a (OLD gone) | — |
| CMP0052 | 3.1 | Reject source and build dirs in installed INTERFACE_INCLUDE_DIRECTORIES. | n/a (OLD gone) | `INTERFACE_INCLUDE_DIRECTORIES` |
| CMP0051 | 3.1 | List TARGET_OBJECTS in SOURCES target property. | n/a (OLD gone) | `TARGET_OBJECTS` |
| CMP0050 | 3.0 | Disallow add_custom_command SOURCE signatures. | n/a (OLD gone) | `SOURCE` |
| CMP0049 | 3.0 | Do not expand variables in target source entries. | n/a (OLD gone) | — |
| CMP0048 | 3.0 | project() command manages VERSION variables. | n/a (OLD gone) | `project()` |
| CMP0047 | 3.0 | Use QCC compiler id for the qcc drivers on QNX. | n/a (OLD gone) | `QCC` |
| CMP0046 | 3.0 | Error on non-existent dependency in add_dependencies. | n/a (OLD gone) | `add_dependencies` |
| CMP0045 | 3.0 | Error on non-existent target in get_target_property. | n/a (OLD gone) | `get_target_property` |
| CMP0044 | 3.0 | Case sensitive Lang_COMPILER_ID generator expressions. | n/a (OLD gone) | `Lang_COMPILER_ID` |
| CMP0043 | 3.0 | Ignore COMPILE_DEFINITIONS_Config properties. | n/a (OLD gone) | `COMPILE_DEFINITIONS_Config` |
| CMP0042 | 3.0 | MACOSX_RPATH is enabled by default. | n/a (OLD gone) | `MACOSX_RPATH` |
| CMP0041 | 3.0 | Error on relative include with generator expression. | n/a (OLD gone) | — |
| CMP0040 | 3.0 | The target in the TARGET signature of add_custom_command() must exist. | n/a (OLD gone) | `add_custom_command()` |
| CMP0039 | 3.0 | Utility targets may not have link dependencies. | n/a (OLD gone) | — |
| CMP0038 | 3.0 | Targets may not link directly to themselves. | n/a (OLD gone) | — |
| CMP0037 | 3.0 | Target names should not be reserved and should match a validity pattern. | n/a (OLD gone) | — |
| CMP0036 | 3.0 | The build_name command should not be called. | n/a (OLD gone) | `build_name` |
| CMP0035 | 3.0 | The variable_requires command should not be called. | n/a (OLD gone) | `variable_requires` |
| CMP0034 | 3.0 | The utility_source command should not be called. | n/a (OLD gone) | `utility_source` |
| CMP0033 | 3.0 | The export_library_dependencies command should not be called. | n/a (OLD gone) | `export_library_dependencies` |
| CMP0032 | 3.0 | The output_required_files command should not be called. | n/a (OLD gone) | `output_required_files` |
| CMP0031 | 3.0 | The load_command command should not be called. | n/a (OLD gone) | `load_command` |
| CMP0030 | 3.0 | The use_mangled_mesa command should not be called. | n/a (OLD gone) | `use_mangled_mesa` |
| CMP0029 | 3.0 | The subdir_depends command should not be called. | n/a (OLD gone) | `subdir_depends` |
| CMP0028 | 3.0 | Double colon in target name means ALIAS or IMPORTED target. | n/a (OLD gone) | `ALIAS` |
| CMP0027 | 3.0 | Conditionally linked imported targets with missing include directories. | n/a (OLD gone) | — |
| CMP0026 | 3.0 | Disallow use of the LOCATION target property. | n/a (OLD gone) | `LOCATION` |
| CMP0025 | 3.0 | Compiler id for Apple Clang is now AppleClang. | n/a (OLD gone) | — |
| CMP0024 | 3.0 | Disallow include export result. | n/a (OLD gone) | — |
| CMP0023 | 2.8 | Plain and keyword target_link_libraries signatures cannot be mixed. | n/a (OLD gone) | `target_link_libraries` |
| CMP0022 | 2.8 | INTERFACE_LINK_LIBRARIES defines the link interface. | n/a (OLD gone) | `INTERFACE_LINK_LIBRARIES` |
| CMP0021 | 2.8 | Fatal error on relative paths in INCLUDE_DIRECTORIES target property. | n/a (OLD gone) | `INCLUDE_DIRECTORIES` |
| CMP0020 | 2.8 | Automatically link Qt executables to qtmain target on Windows. | n/a (OLD gone) | — |
| CMP0019 | 2.8 | Do not re-expand variables in include and link information. | n/a (OLD gone) | — |
| CMP0018 | 2.8 | Ignore CMAKE_SHARED_LIBRARY_Lang_FLAGS variable. | n/a (OLD gone) | `CMAKE_SHARED_LIBRARY_Lang_FLAGS` |
| CMP0017 | 2.8 | Prefer files from the CMake module directory when including from there. | n/a (OLD gone) | — |
| CMP0016 | 2.8 | target_link_libraries() reports error if its only argument is not a target. | n/a (OLD gone) | `target_link_libraries()` |
| CMP0015 | 2.8 | link_directories() treats paths relative to the source dir. | n/a (OLD gone) | `link_directories()` |
| CMP0014 | 2.8 | Input directories must have CMakeLists.txt. | n/a (OLD gone) | — |
| CMP0013 | 2.8 | Duplicate binary directories are not allowed. | n/a (OLD gone) | — |
| CMP0012 | 2.8 | if() recognizes numbers and boolean constants. | n/a (OLD gone) | `if()` |
| CMP0011 | 2.6 | Included scripts do automatic cmake_policy PUSH and POP. | n/a (OLD gone) | `PUSH` |
| CMP0010 | 2.6 | Bad variable reference syntax is an error. | n/a (OLD gone) | — |
| CMP0009 | 2.6 | FILE GLOB_RECURSE calls should not follow symlinks by default. | n/a (OLD gone) | `FILE` |
| CMP0008 | 2.6 | Libraries linked by full-path must have a valid library file name. | n/a (OLD gone) | — |
| CMP0007 | 2.6 | list command no longer ignores empty elements. | n/a (OLD gone) | — |
| CMP0006 | 2.6 | Installing MACOSX_BUNDLE targets requires a BUNDLE DESTINATION. | n/a (OLD gone) | `MACOSX_BUNDLE` |
| CMP0005 | 2.6 | Preprocessor definition values are now escaped automatically. | n/a (OLD gone) | — |
| CMP0004 | 2.6 | Libraries linked may not have leading or trailing whitespace. | n/a (OLD gone) | — |
| CMP0003 | 2.6 | Libraries linked via full path no longer produce linker search paths. | n/a (OLD gone) | — |
| CMP0002 | 2.6 | Logical target names must be globally unique. | n/a (OLD gone) | — |
| CMP0001 | 2.6 | CMAKE_BACKWARDS_COMPATIBILITY should no longer be used. | n/a (OLD gone) | `CMAKE_BACKWARDS_COMPATIBILITY` |
| CMP0000 | 2.6 | A minimum required CMake version must be specified. | n/a (OLD gone) | — |

### 4. [cmake-presets(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-presets.7.rst) — every schema version

Schema versions and what each added: **v1** (3.19) Configure Presets + Macro
Expansion. **v2** (3.20) Build and Test Presets. **v3** (3.21) `Condition`
objects; `installDir`/`toolchainFile` fields; `binaryDir`/`generator` become
optional; `hostSystemName` macro. **v4** (3.23) `include` (multi-file
presets); `resolvePackageReferences`; `fileDir` macro. **v5** (3.24)
`testOutputTruncation`; `pathListSep` macro. **v6** (3.25) Package Presets;
Workflow Presets; `outputJUnitFile`. **v7** (3.27) `configurePresets.trace`;
`$penv{}` in `include`. **v8** (3.28) root `$schema` field. **v9** (3.30)
more macro-expansion types in `include`. **v10** (3.31) `$comment`;
`configurePresets.graphviz`. **v11** (4.3) `testPresets.execution.jobs`
accepts empty string for `--parallel` with jobs omitted. **v12** (4.4) —
the `dev` field is **renamed to `author`** in
`configurePresets.warnings`/`errors`; `uninitialized`/`unusedCli` fields
added to `errors`; `installAbsoluteDestination` added to both;
`testPassthroughArguments` added. **v13** (4.5, **unreleased** — found only
on `master`) adds `strict`/`nonTargetDirective` fields and a
`${configurePresetName}` macro.

### 5. [cmake-toolchains(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-toolchains.7.rst)

27 sections: Languages, Variables and Properties, Toolchain Features, then
Cross Compiling broken out per platform — generic Linux, Cray Linux
Environment, Clang, QNX, three separate Windows CE/10-UWP/Store variants,
ADSP SHARC/Blackfin, **three** distinct Android paths (NDK, standalone
toolchain, NVIDIA Nsight Tegra VS Edition), **four** Apple platforms
(iOS/tvOS/visionOS/watchOS) with their own Code Signing and
device-vs-simulator subsections, Emscripten, and **three** separate Renesas
compiler families (CC-RX/CC-RL/CC-RH). There is no unified cross-compiling
story — each platform is its own recipe, and `CMAKE_SYSROOT` /
`CMAKE_FIND_ROOT_PATH_MODE_*` is the one mechanism common to nearly all of them.

### 6. [cmake-language(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-language.7.rst)

Organization (Directories/Scripts/Modules), Syntax (Encoding, Command
Invocations/Arguments — Bracket/Quoted/Unquoted, Escape Sequences, Variable
References, Bracket/Line Comments), Control Structures (Conditional Blocks,
Loops, Command Definitions), Variables, Environment Variables, Lists. This
is the manual that defines list semantics (a CMake list is just a
`;`-separated string) and quoting rules — the source of the "quoting and
list semantics" trap the frame names directly.

### 7. [cmake-variables(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-variables.7.rst)

16 top-level sections (Information/Behavior/System/Build/Languages/CTest/CPack,
each with a Deprecated counterpart, plus Variable Expansion Operators and
Internal Variables). Confirmed present and correctly named in the current
docs (not assumed from memory): `CMAKE_COMPILE_WARNING_AS_ERROR`,
`CMAKE_EXPORT_COMPILE_COMMANDS`, `CMAKE_<LANG>_COMPILER_LAUNCHER`,
`CMAKE_LINK_LIBRARIES_ONLY_TARGETS`, `CMAKE_POSITION_INDEPENDENT_CODE`,
`CMAKE_POLICY_VERSION_MINIMUM`, and the full `CMAKE_FIND_*` family
(`CMAKE_FIND_PACKAGE_REDIRECTS_DIR`, `CMAKE_FIND_PACKAGE_PREFER_CONFIG`,
`CMAKE_FIND_ROOT_PATH_MODE_{INCLUDE,LIBRARY,PACKAGE,PROGRAM}`, nine
`CMAKE_FIND_USE_*` toggles, `CMAKE_FIND_PACKAGE_NO[_SYSTEM]_PACKAGE_REGISTRY`).

### 8. [cmake-properties(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-properties.7.rst)

Properties bucketed by scope: Global, Directories, Targets, File Sets,
Tests, Source Files, Cache Entries, Installed Files, plus three Deprecated
buckets (Directories/Targets/Source Files). Target properties carrying
usage requirements live in the `INTERFACE_*` namespace and are exactly the
properties `cmake-buildsystem(7)` describes propagating through
`target_link_libraries`.

### 9. [cmake-modules(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-modules.7.rst) and module authoring

Four lifecycle buckets: Utility Modules, Find Modules, Deprecated Modules
(split into Deprecated Utility / Deprecated Find / Legacy CPack), and
Miscellaneous. Deprecated Find Modules currently listed: FindBoost,
FindCABLE, FindCUDA, FindDart, FindGCCXML, FindGDAL, FindITK,
FindPythonInterp, FindPythonLibs, FindQt, FindUnixCommands, FindVTK,
FindwxWindows. Cross-referencing the policy table: FindBoost is not just
deprecated but **removed** (CMP0167, 3.30, superseding an earlier 3.30
removal note in Help/release/4.0.rst that already called FindBoost-vs-Boost's-own-config
a resolved question); FindCUDA is removed (CMP0146, 3.27); FindPythonInterp/Libs
are removed (CMP0148, 3.27); FindCABLE (CMP0191, 4.1) and FindGCCXML
(CMP0188, 4.1) are removed too — meaning half the "deprecated" list is
already a hard `find_package()` failure on a current CMake. Module authoring
conventions live in
[cmake-developer(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-developer.7.rst)
("Standard Variable Names", "A Sample Find Module") and the repo's own
[Modules/readme.txt](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Modules/readme.txt),
which points authors at the same manual plus a wiki page for contributing
modules upstream.

Deep-dived
[FetchContent](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Modules/FetchContent.cmake)
(module docstring, 2506 lines) specifically for the shadowing question the
frame names: `FetchContent_Declare(... FIND_PACKAGE_ARGS args...)` (3.24)
makes `FetchContent_MakeAvailable` try `find_package(<name> <args>)` first,
falling back to fetching only on failure — "project control." Separately,
`FetchContent_Declare(... OVERRIDE_FIND_PACKAGE)` makes every later
`find_package(<name>)` in the whole tree transparently redirect to the
fetched copy via files written into `CMAKE_FIND_PACKAGE_REDIRECTS_DIR` — and
the two options are mutually exclusive on the same declare call.
`CMP0168` (3.30) changed `FetchContent` to implement its steps directly
instead of spawning an `ExternalProject`-style sub-build, and `CMP0135`
(3.24) made the URL-download method ignore archive timestamps by default —
both silently change re-configure behavior for anyone still assuming the
pre-3.24/3.30 mechanics.

### 10. [cmake-generator-expressions(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-generator-expressions.7.rst)

52 sections — by far the largest single manual surveyed. Organized as
Conditional (Logical/Comparison — Numeric/Version), String (Comparisons/
Queries/Generations/Transformations), List (Comparisons/Queries/
Transformations/Ordering/Bound Operands), Path (Comparisons/Queries/
Decomposition/Transformations/Shell Paths), Configuration, Toolchain And
Language (Platform/Compiler Version/Compiler ID/Compile Features/Compile
Context/Link Language/Link Features/Link Context/Linker ID), Source-
Dependent, FileSet-Dependent, Target-Dependent (Meta-Data/Properties/
Artifacts), Export And Install, Multi-level Evaluation, Escaped Characters,
and Deprecated Expressions. The sheer breadth here is itself a finding: a
generator-expression rule cannot be one clause: `$<CONFIG>` semantics
changed as recently as CMP0199 (4.2, "does not match mapped configurations
that are not selected").

### 11. [cmake-developer(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-developer.7.rst)

Short (8 sections): Windows Registry access (Query/Find Using), then Find
Modules (Standard Variable Names, A Sample Find Module). The canonical
authority for what a hand-written Find module — like `find_ocx`'s own
`Findocx.cmake` — is supposed to look like.

### 12. [cmake-file-api(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-file-api.7.rst)

v1 API: Shared/Client Stateless and Stateful Query Files, Reply Index File,
Reply File Reference, **Reply Error Index**, object kinds `codemodel`
(v2, currently at minor version 2.9 per Help/release/4.2.rst, gaining
`codemodelVersion`, `linkLibraries`, `interfaceLinkLibraries`,
`compileDependencies` fields and now including imported/interface-only
targets), `configureLog`, `cache`, `cmakeFiles`, `toolchains`. As of 4.1,
v1 "now writes partial replies when buildsystem generation fails with an
error" — a recent, IDE-tooling-relevant robustness fix.

### 13. [cmake-env-variables(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-env-variables.7.rst)

Short manual, five buckets: Environment Variables that Change Behavior,
that Control the Build, for Languages, for CTest, and for the curses
interface. The authoritative list of what CI can set without touching a
`CMakeCache.txt`.

### 14. [cmake-configure-log(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-configure-log.7.rst)

Log Structure (Versioning, Text Block Encoding), Event Kinds `message`,
`try_compile`, `try_run`, `find`, `find_package` (each with a versioned
`-v1` event schema). As of 4.1, the log "now reports events from
`find_package` (in `CONFIG` mode), `find_path`, `find_file`, `find_library`,
and `find_program`" — meaning `CMakeFiles/CMakeConfigureLog.yaml` is now a
genuinely useful place to look for *why* a dependency search picked the
path it did, not just a `try_compile` diagnostic dump.

### 15. [cmake-instrumentation(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-instrumentation.7.rst)

Overview, Data Collection, Indexing, Callbacks; Enabling Instrumentation
(Project-Level, User-Level, CDash Submissions); API v1 (Data Version, Query
Files, Data Files, Snippet File, Index File, CMake Content File, and a
**Google Trace File** output) — i.e., CMake can now emit Chrome/Perfetto-
compatible trace files for build-time profiling natively, as an alternative
to bespoke `--profiling-output` wrapper scripts.

### 16. [cmake-diagnostics(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-diagnostics.7.rst) — new in 4.4, not in the original survey brief

This manual did not exist before the current release (`.. versionadded:: 4.4`)
and supersedes the old `-Wdev` mental model entirely. Nine diagnostic
categories: `CMD_AUTHOR`, `CMD_DEPRECATED`, `CMD_EXPERIMENTAL`,
`CMD_INSTALL_ABSOLUTE_DESTINATION`, `CMD_NON_TARGET_DIRECTIVE`, `CMD_POLICY`,
`CMD_STRICT`, `CMD_UNINITIALIZED`, `CMD_UNUSED_CLI`. Each has an action
resolved from four sources in precedence order: the category's own default,
a cached variable, the preset `configurePresets.warnings`/`errors` fields,
then `-W[no-][error=]` command-line flags — with an explicit warning that
"some combinations of diagnostic arguments may result in later arguments
completely overwriting the action of earlier arguments." The
`cmake_diagnostic()` command (also new) queries/alters this state at
script-execution time; `block(DIAGNOSTICS)` (also new) scopes it.

### 17. [cmake(1)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake.1.rst)

Confirmed present as distinct `.. option::` entries: `--fresh`, `-L[A][H]`/
`-LR[A][H]`, `-N`, `--graphviz=<file>`, `--system-information`,
`--print-config-dir`, `--log-level`, `--log-context`, `--sarif-output`
(4.0), `--debug-trycompile`, `--debug-output`, `--debug-find[-pkg|-var]`,
`--trace[-expand|-format|-source|-redirect]`, `--warn-uninitialized`
(**deprecated in 4.4**, replaced by `-Wuninitialized`), `--warn-unused-vars`,
`--no-warn-unused-cli` (**deprecated in 4.4**, replaced by `-Wno-unused-cli`),
`--check-system-vars`, `--compile-no-warning-as-error`,
`--link-no-warning-as-error` (4.0), `--profiling-output`/`--profiling-format`,
`--preset`/`--presets-file`/`--list-presets`, `--debugger[-pipe|-dap-log]`
(the CMake DAP debugger), `--build`, `-j/--parallel`, `--install`,
`-P` (script mode), `-E` (the full command-line-tool subcommand list —
`bin2c`, `capabilities`, `cat`, `chdir`, `compare_files`, `copy*`, `env`,
hashing (`md5sum`…`sha512sum`), `rm`, `tar`, `time`, `touch`, Windows
registry helpers), `--find-package`, and `--workflow`. `-W[no-][error=]dev`
itself is **deprecated as of 4.4** in favor of `-W[no-][error=]author`
(`Help/release/4.4.rst`, quoted verbatim in Recent Shifts below) — its
option definition now lives under `cmake-diagnostics(7)`, not `cmake(1)`'s
own option list.

### 18. [ctest(1)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/ctest.1.rst)

30 sections: Run Tests, Label Matching, Label and Subproject Summary, Build
and Test Mode (`--build-and-test`), Dashboard Client (Steps/Modes/via
Command-Line/via Script), Dashboard Client Configuration (Start/Update/
Configure/Build/Test/Coverage/MemCheck/Submit steps), Show as JSON Object
Model, Resource Allocation (Resource Specification File, `RESOURCE_GROUPS`
property, environment variables, dynamically-generated resource spec),
**Job Server Integration** (new-ish — CTest can participate in a POSIX
jobserver protocol for coordinated parallelism across build+test). 4.4
added the `discover_tests` command specifically to generalize CTest's
test-discovery pattern (a user-provided discovery command whose output is
regex-captured into test names/args/properties) beyond the existing
per-framework `*_discover_tests` modules.

### 19. [cpack(1)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cpack.1.rst)

Short manual (Synopsis, Description, Options, See Also) — the generator-
specific behavior lives in each CPack generator module instead. Recent
generator-default policy changes worth flagging in CPack specifically:
CMP0206 (4.3, Archive generator UID/GID 0 by default), CMP0172 (3.31, WIX
per-machine install by default), CMP0161 (3.29, `CPACK_PRODUCTBUILD_DOMAINS`
true by default), CMP0133 (3.24, DragNDrop SLA disabled by default).

### 20. [dev/experimental.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/dev/experimental.rst)

Five feature gates live as of 4.4, each behind a `CMAKE_EXPERIMENTAL_*`
variable set to a specific UUID (the file states plainly: "the specific
values will change over time to reinforce their experimental nature"):
**Export Package Dependencies** (`CMAKE_EXPERIMENTAL_EXPORT_PACKAGE_DEPENDENCIES`,
UUID `1942b4fa-...`) — `install(EXPORT)`/`export(EXPORT)` gain an
`EXPORT_PACKAGE_DEPENDENCIES` argument to auto-generate `find_dependency`
calls. **CPS export** (`CMAKE_EXPERIMENTAL_MAPPED_PACKAGE_INFO`, UUID
`ababa1b5-...`) — `CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO` emits [Common
Package Specification](https://cps-org.github.io/cps/) files via
`install(EXPORT)`. **`import std`** (`CMAKE_EXPERIMENTAL_CXX_IMPORT_STD`,
UUID `25d6f6aa-...`) — must be set before the `CXX` toolchain is discovered
(usually inside `project()`); enables `import std;` in scanned C++23+
sources. **Build database export**
(`CMAKE_EXPERIMENTAL_EXPORT_BUILD_DATABASE`) — the `EXPORT_BUILD_DATABASE`
target property/variable/env-var. **SBOM** (`CMAKE_EXPERIMENTAL_GENERATE_SBOM`)
— experimental `export(SBOM)`/`install(SBOM)` commands. A sixth gate, Rust
Support (`CMAKE_EXPERIMENTAL_RUST`), exists but is out of scope for a C++ program.

### 21. [Help/release/4.0.rst through 4.4.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/release/) — the primary source for "Recent shifts," detailed below

### 22. [cmake_language](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/command/cmake_language.rst) — dependency providers, TRACE, PRINT_TARGETS

`SET_DEPENDENCY_PROVIDER` (3.24): one provider command handles `FIND_PACKAGE`
and/or `FETCHCONTENT_MAKEAVAILABLE_SERIAL` requests; can only be set from a
file named in `CMAKE_PROJECT_TOP_LEVEL_INCLUDES`, during the first
`project()` call — "Calling `cmake_language(SET_DEPENDENCY_PROVIDER)`
outside of that context will result in an error." `PROPAGATE_TOP_LEVEL_INCLUDES_TO_TRY_COMPILE`
(3.30) lets a provider also intercept whole-project `try_compile()` calls.
`TRACE`/`TRACE-OFF` subcommands (4.2) give programmatic, nestable control
over `--trace-expand`-equivalent output. `PRINT_TARGETS` (**4.5, unreleased**)
is drafted but not shipped.

### 23. [CMake Tutorial](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/guide/tutorial/index.rst)

12 numbered steps (Before You Begin → Getting Started → Language
Fundamentals → Configuration/Cache Variables → In-Depth Target Commands →
In-Depth Library Concepts → In-Depth System Introspection → Custom Commands
and Generated Files → Testing and CTest → Installation Commands and
Concepts → Finding Dependencies → Miscellaneous Features), with the older
per-topic page titles (A Basic Starting Point, Adding a Library, Adding
Usage Requirements, Adding Generator Expressions, Installing and Testing,
Testing Dashboard, System Introspection, Custom Command and Generated File,
Packaging an Installer, Static-or-Shared Selection, Export Configuration,
Debug/Release Packaging) kept as hidden forwarding pages for old URLs — a
small but telling sign of how seriously Kitware treats doc-link stability.

### 24. [Professional CMake: A Practical Guide](https://crascit.com/professional-cmake/) (Craig Scott)

The page itself returns HTTP 403 to automated fetches (Cloudflare bot
challenge); its own page title, surfaced through search indexing, reads
"Professional CMake: A Practical Guide - 22nd Edition." Search-indexed
fragments confirm the book's shape: the first five chapters form a
"Getting Started" guide (define/build/test/install/package a simple
project); a "Fundamentals" part follows, ending in a chapter titled
"Compiler And Linker Essentials" described as containing "some of the most
important material in the whole book"; later parts turn task-focused,
including a dedicated "Build Performance" chapter and material on advanced
linking, library structuring, cross-platform versioning, and Apple-specific
bundles/frameworks/code-signing. Because this was not read verbatim, no
chapter-numbered quote from it appears elsewhere in this survey — treat its
exact TOC as unverified until a human or an authenticated fetch confirms it.

### 25. [Modern CMake for C++, 2nd Edition](https://www.packtpub.com/en-us/product/modern-cmake-for-c-9781805121800) (Rafał Świdziński)

Also blocked to automated fetch (Packt, O'Reilly, and ebooks.com all
returned 403). The confirmed **1st-edition** (9781801070058) chapter list,
via search indexing: First Steps with CMake, The CMake Language, Setting Up
Your First CMake Project, Working with Targets, Compiling C++ Sources with
CMake, Linking with CMake, Managing Dependencies with CMake, Testing
Frameworks, Program Analysis Tools, Generating Documentation, Installing
and Packaging, Creating Your Professional Project, plus a Miscellaneous
Commands appendix. Publisher copy describes the 2nd edition as "significantly
rewritten, restructured and refreshed... such as support of C++20 Modules,"
adding three new chapters and "an additional appendix dedicated to CMake
presets" — but the exact new chapter titles could not be confirmed from any
accessible source in this pass.

### 26. [CMake Cookbook](https://raw.githubusercontent.com/dev-cafe/cmake-cookbook/master/README.md) (Bast & Di Remigio)

Fetched verbatim from the companion GitHub repo. 15 chapters: 1 From a
Simple Executable to Libraries, 2 Detecting the Environment, 3 Detecting
External Libraries and Programs, 4 Creating and Running Tests, 5
Configure-time and Build-time Operations, 6 Generating Source Code, 7
Structuring Projects, 8 The Superbuild Pattern, 9 Mixed-language Projects,
10 Writing an Installer, 11 Packaging Projects, 12 Building Documentation,
13 Alternative Generators and Cross-compilation, 14 Testing Dashboards, 15
Porting a Project to CMake. Each chapter maps to numbered "recipes" (e.g.
Chapter 1 has "1. Compiling a single source file into an executable" and
"2. Switching generators") with a working example directory — the closest
thing in this corpus to a runnable modernization playbook.

### 27. [An Introduction to Modern CMake](https://cliutils.gitlab.io/modern-cmake/) (cliutils / Henry Schreiner)

Rebuilt on a MyST/React-Router stack; the sidebar is client-rendered so
page titles had to be recovered from `sitemap.xml` rather than the HTML.
Confirmed page slugs, in site order: installing, running, dodonot (do's and
don'ts), newcmake, basics, variables, functions, comms, structure,
programs, example, features, cpp11, small, utilities, modules, ides, debug,
projects, submodule, download, fetch, testing, googletest, catch, install,
installing-1, exporting, packaging, packages, cuda, openmp, boost, mpi,
root. Links out to the HSF Training CMake webpage, the "It's Time To Do
CMake Right" blog post, and a "toeb/moderncmake" companion repo.

### 28. [Effective Modern CMake](https://gist.github.com/mbinna/c61dbb39bca0e4fb7d1f73b0d66a4fd1) (Manuel Binna, gist)

245-line flat checklist under six headers (General, Modules, Projects,
Targets and Properties, Functions and Macros, Arguments, Loops, Packages,
Cross Compiling, Warnings and Errors, Static Analysis). Every subsection
header is itself the rule, quotable verbatim: "Use at least CMake version
3.0.0" (now obviously stale against a 3.19+/4.0 floor — flagged historical
below), "Treat CMake code like production code," "Forget the commands
`add_compile_options`, `include_directories`, `link_directories`,
`link_libraries`," "Get your hands off `CMAKE_CXX_FLAGS`," "Don't abuse
usage requirements," "Use modern find modules that declare exported
targets," "Don't use `file(GLOB)` in projects," "Think in terms of targets
and properties," "Always explicitly declare properties `PUBLIC`, `PRIVATE`,
or `INTERFACE`," "Prefer functions over macros whenever reasonable," "Use
`cmake_parse_arguments` as the recommended way to handle complex
argument-based behaviors," "Treat warnings as errors," "Treat new warnings
as errors," "Use more than one supported analyzer."

### 29. [Mastering CMake](https://cmake.org/cmake/help/book/mastering-cmake/) (Kitware, living book)

Not the frozen 2015 print edition — a continuously-updated page in the same
`Help/` tree as the manuals. Current chapter list: Why CMake?, Getting
Started, Writing CMakeLists Files, CMake Cache, Key Concepts, Policies,
Modules, Installing Files, System Inspection, Finding Packages, Custom
Commands, Converting Existing Systems To CMake, Cross Compiling With CMake,
Packaging With CPack, Testing With CMake and CTest, CDash, then it folds in
the CMake Tutorial and three cross-referenced guides: **Using Dependencies
Guide**, **Importing and Exporting Guide**, **IDE Integration Guide** — all
three of which are separately linked from `FetchContent`'s own module docs
("The Using Dependencies Guide provides a high-level introduction to this
general topic").

## Candidate topics

| Topic | Why it matters | Source | Covered? | Priority |
|---|---|---|---|---|
| Does a project's declared `cmake_minimum_required` floor already default a given policy to NEW, or is it still a live per-project decision? | The single question the whole policy catalogue exists to answer; 105 of 220 policies are still live at a 3.19 floor. | [cmake-policies(7)](https://cmake.org/cmake/help/latest/manual/cmake-policies.7.html) | no | P0 — the frame names this exact confusion as what a 3.x-trained agent gets wrong first |
| Does a `cmake_minimum_required`/`cmake_policy(VERSION ...)` call below 3.5 exist anywhere in the tree, including a vendored dependency, and will it hard-error on CMake ≥4.0? | 4.0's headline break: "Compatibility with versions of CMake older than 3.5 has been removed." | [Help/release/4.0.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/release/4.0.rst) | no | P0 — breaks silently-inherited third-party CMakeLists.txt at configure time |
| Is `CMAKE_POLICY_VERSION_MINIMUM` used as a genuine floor-raise, or as a bypass that quietly re-admits removed-by-4.0 behavior? | The variable exists specifically to paper over the CMP0000-CMP0065 removal for packagers stuck with unmaintained trees. | [Help/release/4.0.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/release/4.0.rst) | no | P0 — easy to misuse as a silence-the-error switch instead of a real fix |
| Does a rule that names `cmake -Werror=dev` as its verification command still work, or has that flag been renamed? | `-W[no-][error=]dev` is deprecated as of 4.4 in favor of `-W[no-][error=]author`; `--warn-uninitialized` and `--no-warn-unused-cli` were renamed the same release. | [Help/release/4.4.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/release/4.4.rst) | no | P0 — directly falsifies the frame's own stated verification convention |
| Which of the nine `cmake-diagnostics(7)` categories should a project pin to ERROR (`CMD_AUTHOR`, `CMD_DEPRECATED`, `CMD_EXPERIMENTAL`, `CMD_INSTALL_ABSOLUTE_DESTINATION`, `CMD_NON_TARGET_DIRECTIVE`, `CMD_POLICY`, `CMD_STRICT`, `CMD_UNINITIALIZED`, `CMD_UNUSED_CLI`) and via which of the four precedence layers? | Brand-new (4.4) structured replacement for the entire ad hoc `-Wdev`/`CMAKE_WARN_DEPRECATED` system; no book or blog has caught up to it yet. | [cmake-diagnostics(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-diagnostics.7.rst) | no | P0 — the newest, least-documented-elsewhere surface in the whole corpus |
| Does a `CMakePresets.json` use the pre-4.4 `dev` key or the current `author` key in `warnings`/`errors`, and does its declared schema version match what the project's CMake floor can parse? | Presets schema jumped to v12 in 4.4 specifically to rename `dev`→`author`; v13 (unreleased) is already drafted for 4.5. | [cmake-presets(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-presets.7.rst) | no | P0 — schema/floor mismatch is a silent preset-parsing failure |
| When does a `FetchContent`-populated dependency silently shadow the system copy `find_package` would have found, and how is it detected? | The exact scenario the frame's hypothesis section names by name. | [FetchContent module docs](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Modules/FetchContent.cmake) | no | P0 |
| Does `OVERRIDE_FIND_PACKAGE` or a `cmake_language(SET_DEPENDENCY_PROVIDER)` provider win when both target the same package name? | The module's own docs draw the line ("project control" vs. "user override") but a project mixing both needs to know which applies. | [FetchContent.cmake](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Modules/FetchContent.cmake) / [cmake_language.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/command/cmake_language.rst) | no | P1 |
| Is `CMAKE_FIND_PACKAGE_REDIRECTS_DIR` ever inspected in CI to confirm which dependency `find_package(<name>)` actually resolved to? | It's the literal mechanism `OVERRIDE_FIND_PACKAGE` uses; a stale redirect file is invisible from the call site. | [FetchContent.cmake](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Modules/FetchContent.cmake) | no | P2 |
| Does `install(TARGETS ... EXPORT ...)` + `install(EXPORT ...)` actually produce a relocatable Config package, with no build-tree absolute paths leaking into `INTERFACE_INCLUDE_DIRECTORIES`? | Core worked example in cmake-packages(7); directly gates whether a project is `rules_foreign_cc`-wrappable per the companion contract. | [cmake-packages(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-packages.7.rst) | partial (BZL-CC owns the Bazel-side wrappability view; this owns the CMake-authoring side) | P0 |
| Should a new third-party dependency get a hand-written Find module, or is a Config package / `FindPkgConfig` passthrough always preferred now? | "Use modern find modules that declare exported targets" (Effective Modern CMake); cmake-packages(7) frames Find modules as the fallback case. | [cmake-packages(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-packages.7.rst), [Effective Modern CMake](https://gist.github.com/mbinna/c61dbb39bca0e4fb7d1f73b0d66a4fd1) | no | P1 |
| Is a given `Find<Pkg>.cmake` call safe, deprecated-but-working, or already hard-removed by a policy (FindBoost/CMP0167, FindCUDA/CMP0146, FindPythonInterp+Libs/CMP0148, FindCABLE/CMP0191, FindGCCXML/CMP0188)? | "Deprecated" (module list) and "removed" (policy) are two different sources that disagree in timing. | [cmake-modules(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-modules.7.rst) + policy table above | no | P1 |
| Is `CMAKE_<LANG>_STANDARD` paired with `_STANDARD_REQUIRED` and `_EXTENSIONS`, and is the requirement expressed per-target via `target_compile_features` rather than globally? | ABI/standard mismatch across managers is a named frame hypothesis; "Declare compile features with target_compile_features" (Effective Modern CMake). | [cmake-variables(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-variables.7.rst) | no | P0 |
| Does every `target_link_libraries`/`target_compile_definitions`/`target_include_directories` call explicitly state `PUBLIC`/`PRIVATE`/`INTERFACE`, or does it fall back to the pre-CMP0023 unkeyworded form? | CMP0023 (2.8, already removed-OLD-by-4.0) exists precisely because mixing keyworded and plain signatures is an error class. | [cmake-buildsystem(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-buildsystem.7.rst), policy table CMP0023 | no | P0 |
| Does the project use directory-scoped `include_directories()`/`link_directories()`/`add_definitions()`/`link_libraries()` instead of target-scoped equivalents? | "Forget the commands `add_compile_options`, `include_directories`, `link_directories`, `link_libraries`" (Effective Modern CMake, verbatim). | [Effective Modern CMake](https://gist.github.com/mbinna/c61dbb39bca0e4fb7d1f73b0d66a4fd1) | no | P1 |
| Is `file(GLOB)`/`file(GLOB_RECURSE)` used to collect a target's sources, silently failing to add new files on re-run without a re-configure? | "Don't use `file(GLOB)` in projects" — a configure-time-vs-build-time trap specific to CMake, distinct from the sibling sets' own glob guidance. | [Effective Modern CMake](https://gist.github.com/mbinna/c61dbb39bca0e4fb7d1f73b0d66a4fd1) | no | P1 |
| Does `CMAKE_TOOLCHAIN_FILE` collide between a package manager's toolchain (e.g. vcpkg's) and the project's own cross-compiling toolchain file? | Named directly in the frame's hypothesis list as the CMake-side half of the seam. | [cmake-toolchains(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-toolchains.7.rst) | partial (package-manager specifics live in the sibling `package-managers-canonical.md`; this file owns the collision mechanics) | P0 |
| Does a cross-compiling toolchain file set `CMAKE_SYSROOT`/`CMAKE_FIND_ROOT_PATH_MODE_*` correctly, or does `find_package` escape the sysroot and resolve host libraries instead of target ones? | Named directly in the frame's hypothesis list ("path handling," implicitly cross-compiling search scope). | [cmake-toolchains(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-toolchains.7.rst) | no | P1 |
| Is RPATH/`install_name` handling deliberate across the build tree vs. the install tree, with `CMAKE_INSTALL_RPATH_USE_LINK_PATH` set on purpose? | RPATH is named directly in the frame's hypothesis list; CMP0068 (macOS RPATH vs install_name) and CMP0095 (RPATH escaping) are both already-NEW-at-3.19 traps worth auditing for regressions. | [cmake-variables(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-variables.7.rst), policy table | no | P1 |
| Does a shared library on Windows actually export symbols (`CMAKE_WINDOWS_EXPORT_ALL_SYMBOLS`, `GenerateExportHeader`), or does it silently build with nothing exported? | Windows DLL handling is named directly in the frame's hypothesis list. | [GenerateExportHeader module](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Modules/GenerateExportHeader.cmake) | no | P1 |
| Is `CMAKE_EXPORT_COMPILE_COMMANDS` combined with a `CMAKE_<LANG>_COMPILER_LAUNCHER` in a form both ccache/sccache and IDE tooling can consume? | Compile databases and compiler launchers are both named directly in the frame's hypothesis list. | [cmake-variables(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-variables.7.rst) | partial (BZL-CC owns `compile_commands.json` under Bazel; this owns native CMake generation) | P1 |
| Does the project set `CMAKE_POSITION_INDEPENDENT_CODE` globally when only some targets need it, silently changing the ABI of a static library meant for both PIE and non-PIE consumers? | Named directly in the frame's must-cover variable list. | [cmake-variables(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-variables.7.rst) | no | P2 |
| Is `CMAKE_COMPILE_WARNING_AS_ERROR` (or per-target `COMPILE_WARNING_AS_ERROR`) set deliberately, with `--compile-no-warning-as-error` known as the CI override that can silently undo it? | "Treat warnings as errors" / "Treat new warnings as errors" (Effective Modern CMake); flag confirmed current in cmake.1. | [cmake(1)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake.1.rst) | no | P2 |
| Does `find_package(<Pkg> REQUIRED)` omit `CONFIG`/`MODULE`, letting CMake silently search both and produce a confusing "not found" message that hides which lookup mode actually failed? | cmake-packages(7): "Specifying the type of package explicitly improves the error message shown to the user if it is not found." | [cmake-packages(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-packages.7.rst) | no | P1 |
| Are `CMAKE_DISABLE_FIND_PACKAGE_<Pkg>` / `CMAKE_REQUIRE_FIND_PACKAGE_<Pkg>` used anywhere to force a deterministic, offline configure in CI? | Reproducibility and offline-determinism are named in the frame (find_ocx's own CI runs an "Offline-determinism job"). | [cmake-packages(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-packages.7.rst) | no | P2 |
| Does `install(EXPORT ... NAMESPACE Foo::)` use the double-colon convention, and would its absence downgrade a missing-dependency error into an unreadable plain linker failure? | cmake-packages(7): the namespace convention exists specifically so CMake can diagnose a missing dependency before linking. | [cmake-packages(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-packages.7.rst) | no | P2 |
| Is `write_basic_package_version_file`'s `COMPATIBILITY` mode (`AnyNewerVersion`/`SameMajorVersion`/`SameMinorVersion`/`ExactVersion`/`SameMinorVersion`) a deliberate choice, or left at whatever a template defaulted to? | Directly gates whether downstream `find_package(Pkg 2.0)` calls succeed or fail against an installed 3.x package. | [cmake-packages(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-packages.7.rst) | no | P2 |
| Does CTest actually use sharding/parallelism (`-j`, `--test-dir`, `RESOURCE_GROUPS`, a resource specification file), or does CI run one monolithic `ctest` invocation? | Named directly in the frame's must-cover list ("CTest sharding and `--test-dir`"). | [ctest(1)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/ctest.1.rst) | no | P2 |
| Does the project use the new `discover_tests` command (4.4) to generalize test discovery, or maintain a bespoke per-framework `*_discover_tests` wrapper that predates it? | Brand new in the current release; no existing guidance anywhere accounts for it. | [Help/release/4.4.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/release/4.4.rst) | no | P2 |
| Is raising `CXX_STANDARD` to 20 or higher understood to implicitly enable C++20 named-module import scanning (CMP0155), with consequences on generators lacking scanning support? | CMP0155 (3.28, live at a 3.19 floor) changes *scanning* behavior as a side effect of a standard bump many projects make for unrelated reasons. Companion note: C++20 modules *under Bazel* is BZL-CC's territory (row M-L-13-adjacent); this is the CMake-native side. | [cmake-buildsystem(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-buildsystem.7.rst), policy table CMP0155 | partial | P1 |
| Is `import std` support gated correctly — `CMAKE_EXPERIMENTAL_CXX_IMPORT_STD` set to the *exact current-version* UUID, and set before the CXX toolchain is discovered — and does the project avoid hardcoding a UUID that silently stops matching after an upgrade? | Named directly in the frame's shift-to-check list; the UUID literal is explicitly documented to change every version. | [dev/experimental.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/dev/experimental.rst) | no | P1 |
| Is Common Package Specification (CPS) export (`CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO`) a viable choice for a package meant for broad consumption while it remains experimental (`CMAKE_EXPERIMENTAL_MAPPED_PACKAGE_INFO`)? | Named directly in the frame's shift-to-check list. | [dev/experimental.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/dev/experimental.rst) | no | P2 |
| Does `install(SBOM)`/`export(SBOM)` (experimental) fit a fleet that already sha256-verifies a bootstrapped CLI, as a forward-looking option rather than a current adoption? | New this release; thematically resonant with `find_ocx`'s own verification posture per the frame, but still experimental. | [dev/experimental.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/dev/experimental.rst) | no | P2 |
| Are functions preferred over macros for anything beyond trivial caller-scope injection, given a macro leaks every variable it sets into the calling scope? | "Prefer functions over macros whenever reasonable" (Effective Modern CMake); directly auditable against `find_ocx` itself (16 of 21 functions private, 26 `PARENT_SCOPE` uses). | [Effective Modern CMake](https://gist.github.com/mbinna/c61dbb39bca0e4fb7d1f73b0d66a4fd1), [cmake-language(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-language.7.rst) | no | P1 |
| Does a function/macro argument go unquoted somewhere it could lose an empty-list element or be word-split unexpectedly? | Named directly in the frame's boring-but-biting list ("quoting and list semantics"); CMake lists are just `;`-joined strings under the hood. | [cmake-language(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-language.7.rst) | no | P0 |
| Does every function/macro taking more than one or two positional arguments use `cmake_parse_arguments`, and does it check for unparsed or missing keyword values? | "Use `cmake_parse_arguments` as the recommended way to handle complex argument-based behaviors" (Effective Modern CMake); `find_ocx` itself has 6 such calls to audit. | [Effective Modern CMake](https://gist.github.com/mbinna/c61dbb39bca0e4fb7d1f73b0d66a4fd1) | no | P1 |
| Does the project use `block()` (3.25) where it could replace a manual variable/policy push-pop pair, and is the scope it creates (variable, policy, or both) understood correctly? | New-ish primitive; misunderstanding its scope rules is an easy CMake-language mistake. | [command/block.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/command/block.rst) | no | P2 |
| Does any hand-rolled Find module in the tree follow `cmake-developer(7)`'s standard variable-naming convention (`<Pkg>_INCLUDE_DIR`, `<Pkg>_LIBRARY`, `FindPackageHandleStandardArgs`)? | Directly relevant since `find_ocx` ships its own hand-written `Findocx.cmake`. | [cmake-developer(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-developer.7.rst) | no | P1 |
| Does CI ever consult `CMakeFiles/CMakeConfigureLog.yaml` (the `cmake-configure-log(7)` `find`/`find_package`/`try_compile` events) to diagnose a silent tool-detection miss, instead of re-running with `--debug-find`? | The log gained `find_package`/`find_path`/`find_file`/`find_library`/`find_program` events as recently as 4.1. | [cmake-configure-log(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-configure-log.7.rst) | no | P2 |
| Does a `CMakeLists.txt` call `enable_language()` before `project()`, which CMP0165 (3.30, live at a 3.19 floor) now forbids outright? | A specific, mechanically-greppable ordering mistake with a named policy. | Policy table above, CMP0165 | no | P2 |
| Does packaging CI pin the CPack generator-default policies explicitly (CMP0206 Archive UID/GID, CMP0172 WIX per-machine, CMP0161 productbuild domains, CMP0133 DragNDrop SLA) instead of drifting with whatever CMake version the runner image happens to install? | All four are live-at-3.19-floor policy defaults that changed CPack's *output* across 3.24-4.3, invisible unless the generator's docs are re-read per bump. | Policy table above | no | P1 |
| Is CMake's native `cmake-instrumentation(7)` (Google Trace File output, project/user-level enabling) used for CI build-time regression tracking, in preference to a bespoke `--profiling-output` wrapper script? | New-ish, native, Chrome/Perfetto-compatible — directly competes with home-grown build-time tooling. | [cmake-instrumentation(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-instrumentation.7.rst) | no | P3 |
| Does any IDE/analysis integration pin a `cmake-file-api(7)` codemodel-v2 reply to a specific minor version, given the schema moved from 2.8 (4.0) to 2.9 (4.2) inside this survey's own window? | Schema drift between CMake versions is invisible to a consumer that doesn't check `version.minor`. | [cmake-file-api(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-file-api.7.rst) | no | P3 |
| Does a project's `CMakeLists.txt` still contain a `cmake_policy(VERSION <min>...<max>)` range, or a bare `<min>`, and does that choice match whether the project wants to opt into new-but-not-yet-required policies automatically? | The `<min>...<max>` range syntax is the one 4.0-sanctioned way to keep working on both an old CI image and CMake 4.x. | [Help/release/4.0.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/release/4.0.rst) | no | P1 |
| Does a preset file mix `warnings`/`errors` fields from schema versions the declared `"version"` doesn't actually support (e.g. `installAbsoluteDestination` needs v12/4.4)? | Each schema bump gates specific fields; using a field from a newer schema than declared is a silent no-op, not an error, on an older CMake. | [cmake-presets(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-presets.7.rst) | no | P1 |
| Is a project's install tree distro-packaging-correct per `GNUInstallDirs` (multi-arch `CMAKE_INSTALL_LIBDIR`, and the 4.1-changed `usr/`-prefixing and absolute `SYSCONFDIR`/`LOCALSTATEDIR`/`RUNSTATEDIR` behavior under CMP0192/CMP0193)? | Named directly in the frame's must-cover list ("distro packaging expectations, GNUInstallDirs, multi-arch"); both governing policies are live-at-3.19-floor and only 4.1-old. | [GNUInstallDirs module](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Modules/GNUInstallDirs.cmake), policy table CMP0192/CMP0193 | no | P1 |

## Recent shifts seen in this corpus

All dates approximate CMake's own roughly-quarterly cadence; exact release
dates were not independently verified beyond what the release notes imply.

- **CMake 4.0 (~Q1 2025)**: the compatibility floor below 3.5 was removed
  outright — quoted verbatim above — turning what used to be a policy
  *warning* into a hard configure *error* for any tree (including a
  dependency) declaring `cmake_minimum_required` below 3.5.
  `CMAKE_POLICY_VERSION_MINIMUM` was added the same release as the sanctioned
  bypass. This single change invalidates any pre-2025 guidance that treats
  "the project has *a* `cmake_minimum_required` line" as sufficient without
  checking its actual value.
- **CMake 4.1 (~mid-2025)**: `cmake-configure-log(7)` gained `find_package`/
  `find_path`/`find_file`/`find_library`/`find_program` events;
  `cmake-file-api(7)` v1 started writing partial replies on generation
  failure — both make tooling that reads CMake's own introspection output
  more reliable than it was a year earlier.
- **CMake 4.2 (~late 2025)**: the `Visual Studio 18 2026` and `FASTBuild`
  generators were added; `cmake_language(TRACE)` gave programmatic control
  over trace output. No book or blog post in this survey's corpus mentions
  either generator, since all predate this release.
- **CMake 4.3 (~early 2026)**: presets schema reached v11 (`testPresets.execution.jobs`
  empty-string meaning); CPack's Archive generator changed its default
  ownership (CMP0206) and `export(EXPORT)`/`file(GET_RUNTIME_DEPENDENCIES)`
  tightened their argument/path handling (CMP0208/CMP0207).
- **CMake 4.4 (current release, ~mid-2026)**: the single largest shift in
  this window — a full diagnostics-system rewrite. `cmake-diagnostics(7)`,
  `cmake_diagnostic()`, and nine named categories replace the old `-Wdev`/
  `CMAKE_WARN_DEPRECATED` model; presets schema v12 renamed `dev`→`author`
  to match; `-W[no-][error=]dev`, `--warn-uninitialized`, and
  `--no-warn-unused-cli` are all deprecated spellings as of this release.
  This obsoletes essentially every piece of "modern CMake" advice — every
  book and blog surveyed here — that names `-Werror=dev` as *the*
  verification command, because all of them predate this release by
  definition.
- **`master` / unreleased 4.5**: presets schema v13 (`strict`/`nonTargetDirective`
  fields, `${configurePresetName}` macro), `cmake_language(PRINT_TARGETS)` —
  explicitly flagged not-yet-shipped; do not cite these as current behavior.
- **Since 3.24 (slightly outside the strict 18-24-month window but still the
  active frontier)**: dependency providers and `FetchContent`'s
  `OVERRIDE_FIND_PACKAGE`/`FIND_PACKAGE_ARGS` remain, through 4.4, the
  state of the art for the "two copies of one library" problem the frame
  names — no newer or competing mechanism has appeared in this corpus to
  supersede them.

## Contested

- **Functions vs. macros**: Effective Modern CMake states flatly, "Prefer
  functions over macros whenever reasonable," and CMP0165/CMP0165-adjacent
  scoping fixes generally reward function-style isolation — but Kitware's
  own modules (and, per the frame's own audit, `find_ocx` itself: 16 of 21
  functions are private, plus 26 `PARENT_SCOPE` writes) still lean on macros
  specifically where caller-scope side effects are the entire point. The
  practical convergence across sources is "function unless you deliberately
  need to set a variable in the caller's scope," not a blanket rule either
  direction.
- **Try `find_package` first, or fetch unconditionally?** `FetchContent`'s
  own `FIND_PACKAGE_ARGS` option (3.24) operationalizes "always try
  `find_package` first, fetch only on miss" as an opt-in pattern the module
  authors clearly favor going forward — but plenty of tutorial material
  surveyed here (older mdBook-era pages, most blog posts referenced from
  cliutils' modern-cmake) still shows bare `FetchContent_Declare` +
  `FetchContent_MakeAvailable` with no `find_package` attempt at all, and a
  3.19-floor project cannot use `FIND_PACKAGE_ARGS` without first raising
  its policy version to 3.24. Trend: toward try-first, but adoption lags the
  mechanism by at least a floor bump.
- **`-Wdev`/`-Werror=dev` naming**: so new (4.4, this release) that every
  other source surveyed — every book, the cliutils site, the mbinna gist,
  Kitware's own Mastering CMake prose sections that predate the 4.4
  rewrite — still assumes the old flag spelling. Only the current-release
  manuals use the new one. This is not really "contested" so much as
  "not yet caught up," but an agent trained on any pre-2026 text will
  reach for the old spelling by default.
- **Is a "deprecated" Find module still safe to call?** `cmake-modules(7)`
  lists FindBoost, FindPythonInterp, FindPythonLibs, FindCUDA, FindCABLE,
  and FindGCCXML all under one "Deprecated Find Modules" heading with no
  distinction — but the policy catalogue shows several of these
  (FindBoost/CMP0167, FindPythonInterp+Libs/CMP0148, FindCUDA/CMP0146,
  FindCABLE/CMP0191, FindGCCXML/CMP0188) have already had their OLD
  find_package() behavior *removed*, while others on the same list merely
  redirect to a warning. The module list and the policy table disagree on
  granularity, and only the policy table tells you which is which.
- **Book cadence vs. release cadence**: Professional CMake (22nd edition)
  and Mastering CMake (a living Kitware page in the same repo as the
  manuals) are continuously revised; CMake Cookbook and Modern CMake for
  C++ are fixed print-cadence books (2nd editions, ~2023-era) that cannot
  reflect the 4.x diagnostics rewrite, the current policy set past their
  publication date, or the 4.2 generators. Any topic sourced only from the
  latter two needs a freshness check against the current manuals before
  being trusted as current practice.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [cmake-policies(7)](https://cmake.org/cmake/help/latest/manual/cmake-policies.7.html) | Rendered policy manual, full CMP0000-CMP0219 index with one-line titles | Current (4.4/master, fetched 2026-09-05) | Primary — the entire policy catalogue in one page |
| [Help/manual/cmake-buildsystem.7.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-buildsystem.7.rst) | Raw manual source, target-based buildsystem design | Current | Primary — usage requirements, the core CMake abstraction |
| [Help/manual/cmake-packages.7.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-packages.7.rst) | Raw manual source, Config vs Find packages | Current | Primary — package registry, relocatable Config package worked example |
| [Help/manual/cmake-presets.7.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-presets.7.rst) | Raw manual source, presets schema v1-v13 | Current (v13 unreleased) | Primary — the exact schema-version-to-CMake-version mapping |
| [Help/manual/cmake-toolchains.7.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-toolchains.7.rst) | Raw manual source, cross-compiling recipes | Current | Primary — per-platform toolchain guidance |
| [Help/manual/cmake-language.7.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-language.7.rst) | Raw manual source, syntax/quoting/scoping/lists | Current | Primary — the source of the quoting/list-semantics trap |
| [Help/manual/cmake-variables.7.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-variables.7.rst) | Raw manual source, `CMAKE_*` variable families | Current | Primary — confirms exact spelling of every named variable |
| [Help/manual/cmake-modules.7.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-modules.7.rst) | Raw manual source, module lifecycle buckets | Current | Primary — deprecated/removed Find module lists |
| [Modules/FetchContent.cmake](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Modules/FetchContent.cmake) | Raw module source (docstring is the rendered docs) | Current | Primary — `OVERRIDE_FIND_PACKAGE`, `FIND_PACKAGE_ARGS`, redirects dir, in full |
| [Help/command/cmake_language.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/command/cmake_language.rst) | Raw command doc | Current (incl. unreleased 4.5 bits) | Primary — dependency providers, TRACE, PRINT_TARGETS |
| [Help/manual/cmake-diagnostics.7.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-diagnostics.7.rst) | Raw manual source, brand-new in 4.4 | Current, `versionadded:: 4.4` | Primary — supersedes `-Wdev`; not in any book yet |
| [Help/dev/experimental.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/dev/experimental.rst) | Raw experimental-features guide | Current | Primary — CPS, `import std`, SBOM, build-database gates with exact UUIDs |
| [Help/release/4.0.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/release/4.0.rst) | Raw release notes | ~Q1 2025 | Primary — the exact wording of the 3.5 floor removal |
| [Help/release/4.1.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/release/4.1.rst) | Raw release notes | ~mid-2025 | Primary — configure-log and file-api improvements |
| [Help/release/4.2.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/release/4.2.rst) | Raw release notes | ~late 2025 | Primary — new generators, `cmake_language(TRACE)` |
| [Help/release/4.3.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/release/4.3.rst) | Raw release notes | ~early 2026 | Primary — presets v11, CPack default changes |
| [Help/release/4.4.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/release/4.4.rst) | Raw release notes | Current release, 2026 | Primary — the diagnostics-system rewrite, in full |
| [Help/manual/cmake.1.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake.1.rst) | Raw manual source, the `cmake` CLI | Current | Primary — every option name and its current/deprecated status |
| [Help/manual/ctest.1.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/ctest.1.rst) | Raw manual source, the `ctest` CLI | Current | Primary — resource allocation, job server integration |
| [Help/manual/cpack.1.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cpack.1.rst) | Raw manual source, the `cpack` CLI | Current | Primary |
| [Help/manual/cmake-file-api.7.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-file-api.7.rst) | Raw manual source, File API v1 | Current | Primary — codemodel versioning |
| [Help/manual/cmake-configure-log.7.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-configure-log.7.rst) | Raw manual source | Current | Primary |
| [Help/manual/cmake-instrumentation.7.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-instrumentation.7.rst) | Raw manual source | Current | Primary — Google Trace File output |
| [Help/manual/cmake-generator-expressions.7.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-generator-expressions.7.rst) | Raw manual source | Current | Primary — largest single manual, 52 sections |
| [Help/manual/cmake-developer.7.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-developer.7.rst) | Raw manual source, Find-module authoring | Current | Primary |
| [Help/guide/tutorial/index.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/guide/tutorial/index.rst) | Raw tutorial index | Current | Primary — 12-step official tutorial structure |
| [Mastering CMake](https://cmake.org/cmake/help/book/mastering-cmake/) | Kitware's living online book | Current, tracks `master` | Secondary-but-official — chapter list confirms it is not a frozen print edition |
| [CMake Cookbook README](https://raw.githubusercontent.com/dev-cafe/cmake-cookbook/master/README.md) | Companion repo for the Packt book | Book: 2019; repo still live | Secondary — 15-chapter TOC fetched verbatim |
| [An Introduction to Modern CMake](https://cliutils.gitlab.io/modern-cmake/) | Community teaching site (Henry Schreiner) | Rebuilt 2025-2026-era on MyST | Secondary — page list confirmed via `sitemap.xml` |
| [Effective Modern CMake gist](https://gist.github.com/mbinna/c61dbb39bca0e4fb7d1f73b0d66a4fd1) | Community checklist (Manuel Binna) | Long-running, dates to ~2017, still widely linked | Secondary — every heading is a directly quotable rule |
| [Professional CMake](https://crascit.com/professional-cmake/) | Craig Scott's book landing page | "22nd Edition" per page title | Secondary, unread — blocked by Cloudflare; chapter shape reconstructed from search snippets only |
| [Modern CMake for C++, 2nd ed.](https://www.packtpub.com/en-us/product/modern-cmake-for-c-9781805121800) | Rafał Świdziński's book (Packt) | 2nd ed. ~2023-2024 | Secondary, unread — blocked (Packt/O'Reilly/ebooks.com all 403'd); 1st-ed. TOC confirmed via search, 2nd-ed. deltas only described by publisher copy |

