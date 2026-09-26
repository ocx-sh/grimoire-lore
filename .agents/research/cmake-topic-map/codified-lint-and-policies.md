---
title: Codified CMake lint and policy corpus — landscape scout
corpus: codified-lint-and-policies
agent: cmake-scout-codified
model: sonnet
date_researched: 2026-09-05
sources_count: 40
primary_sources_count: 39
scope: |
  Covers: the cmakelang (cmake-lint/cmake-format) catalogue and gersemi;
  CMake's own developer-warning and (brand-new, 4.4) diagnostics-category
  system; organisational CMake style guides (LLVM, KDE ECM, Qt6, Boost,
  Kitware's own Modules conventions); vcpkg's and Conan Center's codified
  port/recipe rules; cpp-best-practices and cmake-init project scaffolds;
  distro packaging guidance (Debian, Fedora, Homebrew, conda-forge); supply-
  chain and reproducibility codification (OpenSSF Scorecard, reproducible-
  builds.org, OSS-Fuzz, CISA); and the CMake-facing surface of
  rules_foreign_cc's `cmake()` rule.
  Does not cover: Bazel-side C++ toolchain, layering_check, sanitizer or
  C++20-modules mechanics (owned by the Bazel program's BZL-CC family, dives
  9.1–9.3); Conan/vcpkg language-level API design or CPM.cmake internals
  (other cmake-program workers' briefs); anything requiring a live `cmake`,
  `conan`, or `vcpkg` invocation (read-only sources only).
---

## Table of contents

1. [Summary](#summary)
2. [Survey](#survey)
   1. [cmake-lint / cmake-format (cmakelang)](#1-cmake-lint--cmake-format-cmakelang)
   2. [gersemi](#2-gersemi)
   3. [CMake's own developer warnings and the new 4.4 diagnostics system](#3-cmakes-own-developer-warnings-and-the-new-44-diagnostics-system)
   4. [LLVM CMake Primer and conventions](#4-llvm-cmake-primer-and-conventions)
   5. [KDE Extra CMake Modules](#5-kde-extra-cmake-modules)
   6. [Qt 6 CMake policies](#6-qt-6-cmake-policies)
   7. [Boost's CMake build](#7-boosts-cmake-build)
   8. [Kitware's own source-tree and Find-module conventions](#8-kitwares-own-source-tree-and-find-module-conventions)
   9. [vcpkg maintainer guide](#9-vcpkg-maintainer-guide)
   10. [Conan Center hooks (archived) and the current Conan 2 template](#10-conan-center-hooks-archived-and-the-current-conan-2-template)
   11. [cpp-best-practices cmake_template and project_options](#11-cpp-best-practices-cmake_template-and-project_options)
   12. [friendlyanon/cmake-init](#12-friendlyanoncmake-init)
   13. [Distro packaging: Debian, Fedora, Homebrew, conda-forge](#13-distro-packaging-debian-fedora-homebrew-conda-forge)
   14. [Supply-chain and reproducibility codification](#14-supply-chain-and-reproducibility-codification)
   15. [rules_foreign_cc's `cmake()` rule — the CMake-facing requirements](#15-rules_foreign_ccs-cmake-rule--the-cmake-facing-requirements)
3. [Candidate topics](#candidate-topics)
4. [Recent shifts seen in this corpus](#recent-shifts-seen-in-this-corpus)
5. [Contested](#contested)
6. [Sources](#sources)

## Summary

- CMake 4.4 (in-development on `master` as of this research; version file reads
  `4.4.20260905`, a dev snapshot, not yet a tagged release) replaces the entire
  `-Wdev`/`-Werror=dev` developer-warning mechanism with a categorised
  diagnostics system (`cmake-diagnostics(7)`, the `cmake_diagnostic` command,
  `-W<category>`/`-Werror=<category>`); `-Wdev`, `-Wno-dev`,
  `--warn-uninitialized`, and `--no-warn-unused-cli` are now deprecated compat
  synonyms, and `--warn-unused-vars` has done nothing since CMake 3.19.
- The frame's speculative "`CMAKE_DEBUG_PREFIX_MAP` if present" resolves to
  **no such variable exists** — CMake has no first-class build-path-mapping
  abstraction; projects must inject `-ffile-prefix-map` themselves via
  `CMAKE_<LANG>_FLAGS`.
- `cmake-lint`/`cmake-format` (cheshirekow/cmake_format) has had **no release
  since v0.6.13 (2020-08-19)** and no repository push since 2024-05-01; its
  ~35 implemented lint codes (C0xxx/E0xxx/R0xxx/W0xxx) and its "planned"
  column (deprecated-command detection W0104/W0105/W0106, redefined-builtin
  W0622, deprecated-find-module W0402) are frozen at pre-3.19 CMake semantics.
  This is the "no — not enforced anywhere" finding for the whole catalogue-
  sweep item.
- `gersemi` is the opposite case: actively released (v0.28.1, 2026-08-19, one
  release every 2–4 weeks) and the tool an agent should actually recommend.
  It refuses to guess formatting for unknown custom commands (falls back to
  lower-case name, emits a suppressible warning) unless given a
  `--definitions` file whose function uses `cmake_parse_arguments` "in an
  obvious manner."
- Conan Center's linting hooks repository (`conan-io/hooks`) is **archived**
  (last push 2026-03-24) with an explicit banner: "This hooks repository was
  for Conan 1.X and it is not longer maintained." Its KB-H040 rule (forbidding
  `cpp_info.names`/`filenames` overrides) is now moot: Conan 2's own
  `cmake_package` template uses `cpp_info.set_property("cmake_target_name", …)`
  instead, and strips upstream CMake config files from the package
  (`rmdir(package_folder/lib/cmake)`) so `CMakeDeps` is the sole source of
  `find_package` support.
- OpenSSF Scorecard's Pinned-Dependencies check **does not examine CMake
  `FetchContent`/`ExternalProject` at all** — it only inspects Dockerfiles,
  shell scripts, and GitHub Actions workflows on GitHub-hosted repos. A
  `FetchContent_Declare` pinned to a branch name scores exactly the same as
  one pinned to a commit SHA in Scorecard's eyes.
- reproducible-builds.org's build-path guidance never mentions CMake by name;
  its advice (`-fdebug-prefix-map`, `-fmacro-prefix-map`, `-ffile-prefix-map`,
  Debian's `dpkg` 1.19.1+ `fixfilepath` flag) is generic-compiler guidance a
  CMake project must apply itself.
- CISA's Secure-by-Design guidance does not name CMake, or any specific build
  system, at all — the "no" finding item 4 predicted.
- Fedora is mid-migration (Change targeting **Fedora Linux 45**, updated
  **2026-03-10**): the `%cmake` RPM macro is dropping
  `-DINCLUDE_INSTALL_DIR`, `-DLIB_INSTALL_DIR`, `-DSYSCONF_INSTALL_DIR`,
  `-DSHARE_INSTALL_PREFIX`, and `-DLIB_SUFFIX` because none of them were ever
  standardized by CMake; the prescribed replacement is `GNUInstallDirs`
  (CMake 3.0+).
- vcpkg's maintainer guide is unusually concrete and machine-checkable: ports
  "must not" install files/symbols owned by another port, must not be
  path-dependent on other installed ports, must add any non-upstream CMake
  export under an `unofficial-<port>` namespace with `unofficial::<port>::`
  targets, and must not add `CMAKE_WINDOWS_EXPORT_ALL_SYMBOLS`.
  `vcpkg_fixup_cmake_targets` is itself deprecated in favour of
  `vcpkg_cmake_config_fixup`.
- KDE's `KDE_COMPILERSETTINGS_LEVEL` is a versioned strictness dial (an ECM
  version number, e.g. `5.85`, `6.13`) rather than a boolean — a pattern
  (versioned, monotonically-stricter opt-in) worth naming as a design option
  in the rule set's own guidance, distinct from CMake policies' OLD/NEW dial.
- Qt 6's `QTP000n` policies are enabled in bulk via
  `qt_standard_project_setup()`/`REQUIRES 6.8`-style version gates, mirroring
  CMake's own `cmake_minimum_required` implicit-policy-version mechanic one
  layer up the stack — two independent "declare a version, get a policy bundle"
  systems a project using both must reconcile.
- `friendlyanon/cmake-init`'s generated `cmake/project-is-top-level.cmake` is
  a **compat shim**: it computes `PROJECT_IS_TOP_LEVEL` by string-comparing
  `CMAKE_SOURCE_DIR` to `PROJECT_SOURCE_DIR`, because the native variable of
  that name only exists from CMake 3.21 — visible proof the project still
  targets a pre-3.21 floor (its README claims "modern CMake (3.14+)").
  Install rules are entirely gated on that variable: CPack, the
  versioned-include-dir default, and the dev-mode subdirectory only fire for
  the top-level build.
- `rules_foreign_cc`'s `cmake()` rule sets Bazel's `block-network` execution
  requirement **by default** (opt out only via a `requires-network` tag),
  making "no configure-time network access" a literal sandbox-enforced
  requirement on any CMake project it wraps — not merely a style preference.
- The same rule's `generate_crosstool_file` (default `True`) synthesizes a
  CMake toolchain file from Bazel's `cc_toolchain` unless the caller supplies
  its own `CMAKE_TOOLCHAIN_FILE` cache entry — the collision point with
  vcpkg's and Conan's own toolchain-file injection the frame's hypothesis
  named, confirmed present from the Bazel side too.
- Homebrew's `std_cmake_args` still emits `-Wno-dev` by convention — a flag
  CMake 4.4 now treats as a deprecated compat synonym for `-Wno-author`; every
  packaging recipe baking in the old spelling is a forward-compat trap once
  4.4 actually ships.
- Debian's own current CMake wiki content is thinner than expected: it
  documents `CMAKE_LIBRARY_ARCHITECTURE` for multiarch install paths but does
  not mention `GNUInstallDirs` at all on the page that should be the
  canonical multiarch reference — a documentation gap, not a policy absence
  (CMake's own `GNUInstallDirs` module has detected Debian multiarch since a
  dedicated commit years ago).
- conda-forge's one hard footgun is syntactic, not semantic: `${CMAKE_ARGS}`
  (the compiler-activation-supplied argument list) must be passed **unquoted**
  to `cmake` — quoting it collapses a space-separated option list into one
  malformed argument.
- OSS-Fuzz's CMake convention set (`$CXX` as linker even for C-only projects,
  binaries only in `$OUT`, link `$LIB_FUZZING_ENGINE` rather than assuming
  libFuzzer, never delete sources) has no CMake-specific carve-out in its own
  docs — it is the same generic `build.sh` contract regardless of build
  system, which itself is a finding: OSS-Fuzz does not treat CMake as a
  first-class integration path with dedicated guidance.
- Kitware's own maintainer process (`Help/dev/maint.rst`) is enforced by a
  GitLab bot gate (`Do: merge`) and an exact-string commit-message and
  tag-name convention (`CMake $fullver`, `v$fullver`) — useful precedent for
  "how do you actually make a rule checkable" even though it targets CMake's
  own contributors, not consumers.

## Survey

### 1. cmake-lint / cmake-format (cmakelang)

[`cmakelang/lint/lintdb.py`](https://raw.githubusercontent.com/cheshirekow/cmake_format/master/cmakelang/lint/lintdb.py)
is the literal database backing `cmake-lint`. Implemented codes, one line
each, grouped by pylint-style category (`Categories mirror pylint`):

| Code | Message | Still correct on 4.x? | Notes |
|---|---|---|---|
| C0102 | Black listed name | yes (generic) | user-configurable `bad-names` |
| C0103 | Invalid `{type}` name doesn't match `{regex}` | yes (generic) | naming-convention regex per identifier kind |
| C0111 | Missing docstring on function/macro | yes (generic) | |
| C0112 | Empty docstring on function/macro | yes (generic) | |
| C0113 | Missing `{X}` in statement which allows it | yes (generic) | |
| C0114 | Form discriminator hidden behind variable dereference | yes (generic) | e.g. `file()`'s mode keyword held in a variable |
| C0201 | Consider replacing custom parser logic with `cmake_parse_arguments` | yes | |
| C0202 | Argument name differs from existing only in case | yes | |
| C0301 | Line too long (default 80) | yes (config) | |
| C0303 | Trailing whitespace | yes | |
| C0304 | Final newline missing | yes | |
| C0305 | `{N}` newlines between statements | yes | |
| C0306 | Tab-policy violation | yes | |
| C0307 | Bad indentation | yes | |
| C0321 | Multiple statements on a single line | yes | |
| C0327 | Wrong line ending | yes | |
| E0011 | Unrecognized file option (bad inline pragma) | yes | tool-specific, not CMake |
| E0012 | Bad option value (bad inline pragma) | yes | tool-specific |
| E0103 | `break()`/`continue()` outside of loop | yes | |
| E0108 | Duplicate argument name in function/macro def | yes | |
| E0109 | Invalid argument name in function/macro def | yes | |
| E1120 | Missing required positional argument | yes | |
| E1121 | Too many positional arguments | yes | |
| E1122 | Duplicate keyword argument | yes | |
| E1125 | Missing required keyword argument | yes | |
| E1126 | Invalid form discriminator | yes | |
| R0911–R0915 | Too many returns/branches/named-args/locals/statements | yes (config) | default thresholds 6/12/5/15/50 |
| W0101 | Unreachable code | yes | |
| W0104 | Use of deprecated command | **stale** | deprecated-command list not updated since 2020 |
| W0105 | Variable matches a builtin except for case | yes | e.g. `cmake_cxx_standard` vs `CMAKE_CXX_STANDARD` |
| W0106 | String looks like a variable reference missing a tag | yes | |

The ["Planned" table](https://raw.githubusercontent.com/cheshirekow/cmake_format/master/cmakelang/doc/lint-summary.rst)
lists checks that were **never implemented**: `R0201` "Macro could be a
function", `W0402` "Uses of a deprecated find module", `W0622` "Redefining
built-in", `C0203`–`C0205` (spelling/keyword-order/bad-idea-command checks),
`E1123` (unexpected keyword argument). These stay planned forever — the
project's [PyPI release history](https://pypi.org/pypi/cmake-format/json)
tops out at **0.6.13, released 2020-08-19**, and the GitHub repo's
`pushed_at` is **2024-05-01** with zero tags after 0.6.13. `cmake-lint` is,
in the corpus's own terms, unmaintained — its naming-convention defaults were
derived by analyzing **CMake 3.10** listfiles
([lint-notes.rst](https://raw.githubusercontent.com/cheshirekow/cmake_format/master/cmakelang/doc/lint-notes.rst)),
sixteen CMake minors behind current.

`cmake-format`'s configuration knobs
([`cmakelang/configuration.py`](https://raw.githubusercontent.com/cheshirekow/cmake_format/master/cmakelang/configuration.py))
are organized into `parse` (markup: `bullet_char`, `enum_char`,
`literal_comment_pattern`, `fence_pattern`, `ruler_pattern`,
`hashruler_min_length`; encoding: `emit_byteorder_mark`, `input_encoding`,
`output_encoding`; lint: `function_pattern`, `macro_pattern`,
`global_var_pattern`, `local_var_pattern`, `keyword_pattern`,
`max_returns=6`, `max_branches=12`, `max_arguments=5`, `max_localvars=15`,
`max_statements=50` — the same defaults the lint R09xx codes above use),
`format` (`line_width` default 80, `tab_size`, `dangle_parens`,
`dangle_align`, `command_case`, `keyword_case`, `always_wrap`, `autosort`,
`layout_passes`), and `misc` (`additional_commands`, `override_spec`,
`vartags`, `proptags`).

### 2. gersemi

[The README](https://raw.githubusercontent.com/BlankSpruce/gersemi/master/README.md)
documents what it formats (`CMakeLists.txt`, `CMakeLists.txt.in`,
`*.cmake`/`*.cmake.in`, auto-discovered under a directory argument) and what
it explicitly refuses: full semantic understanding of arbitrary custom
commands. Its `--definitions src [src...]` mechanism generates a specialized
formatter for a custom function/macro **only if** that command's definition
uses `cmake_parse_arguments` "in an obvious manner" — otherwise gersemi warns
about the unknown command (suppressible with
`--no-warn-about-unknown-commands`) and falls back to lower-case canonical
naming. Per-command formatting hints are supplied via inline pragma comments
inside the definition: `# gersemi: hints` (YAML keyword→layout pairs),
`# gersemi: ignore` (skip specialization), `# gersemi: block_end <name>`
(pair with a closing command like `function`/`endfunction`). Configuration
resolves via a `.gersemirc` file discovered from the source file's directory
upward (closest wins), overridable per-argument from the CLI.
[Release history](https://api.github.com/repos/BlankSpruce/gersemi/releases)
shows **v0.28.1 on 2026-08-19** with a release roughly every 2–4 weeks —
active, current-era tooling, the opposite maintenance state from cmake-lint.

### 3. CMake's own developer warnings and the new 4.4 diagnostics system

The frame asked to find where `-Wdev`/`-Werror=dev`/`--warn-uninitialized`/
`--warn-unused-vars` are documented and what they trigger. The answer, from
[`cmake.1.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake.1.rst)
and [`OPTIONS_BUILD.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/include/OPTIONS_BUILD.rst),
is that **all four are now deprecated or dead**, replaced by a new system
introduced in CMake 4.4:

- `--warn-unused-vars`: "Deprecated since version 3.19 — Does nothing."
- `--warn-uninitialized`: "Deprecated since version 4.4 — Compatibility
  synonym for `-Wuninitialized`."
- `--no-warn-unused-cli`: "Deprecated since version 4.4 — Compatibility
  synonym for `-Wno-unused-cli`."
- `-Wdev, -Wno-dev`: "Deprecated since version 4.4 — Compatibility synonyms
  for `-Wauthor` / `-Wno-author`."

The replacement, documented in the new
[`cmake-diagnostics(7)`](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-diagnostics.7.rst)
manual, is a **categorized diagnostic state stack** analogous to CMake's
policy stack: `-W<category>`, `-Wno-<category>`, `-Werror=<category>`,
`-Wno-error=<category>` on the command line; `configurePresets.warnings` and
`configurePresets.errors` fields in CMake Presets (schema version 12, added
in 4.4 per the
[4.4 release notes](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/release/4.4.rst));
and a new `cmake_diagnostic` command for querying/altering state from within
a script. Precedence order (highest first): CLI arguments >
`configurePresets` (evaluated ancestor-to-descendant) > the cached variable
persisting the last run's state > the category's compiled-in default.

Documented categories (fetched individually from
`Help/diagnostic/<CATEGORY>.rst`), each with a `:default:` action and
optional `:parent:`:

| Category | Default | Parent | Added | Triggers on |
|---|---|---|---|---|
| `CMD_AUTHOR` | warn | — | 4.4 | `message(AUTHOR_WARNING)`; ancestor of most other categories |
| `CMD_DEPRECATED` | warn | CMD_AUTHOR | 4.4 | `message(DEPRECATION)` |
| `CMD_EXPERIMENTAL` | warn | CMD_AUTHOR | 4.4 | use of an experimental feature, or a bad gate-variable value |
| `CMD_POLICY` | warn | CMD_AUTHOR | 4.4 | build depends on a policy's `OLD` behavior |
| `CMD_STRICT` | ignore | CMD_AUTHOR | 4.5 | umbrella for "allowed but disrecommended" usage |
| `CMD_INSTALL_ABSOLUTE_DESTINATION` | ignore | CMD_STRICT | 4.4 | `install(... DESTINATION <absolute path>)` |
| `CMD_NON_TARGET_DIRECTIVE` | ignore | CMD_STRICT | 4.5 | directory-wide (non-target) build-environment mutation |
| `CMD_UNINITIALIZED` | ignore | — | 4.4 | dereference of an uninitialized variable |
| `CMD_UNUSED_CLI` | ignore | — | 4.4 | `-D` variable set on the command line but never read; evaluated outside configure/generate |

**Caveat that matters for dating this correctly**: the fetched
`Source/CMakeVersion.cmake` on `master` reads
`CMake_VERSION_MAJOR=4`, `CMake_VERSION_MINOR=4`,
`CMake_VERSION_PATCH=20260905` — the date-stamped patch level CMake uses for
**unreleased development snapshots** (`CMake_VERSION_IS_RELEASE` is false
whenever the patch component is a date). `Help/release/4.5.rst` does not yet
exist on `master` (404). So as of this research date, everything above is
committed to `master` and slated for CMake 4.4, but **4.4.0 had not yet
tagged**, and two of the categories (`CMD_STRICT`, `CMD_NON_TARGET_DIRECTIVE`)
carry `versionadded:: 4.5` tags even though no 4.5 release-notes file exists
yet — this is bleeding-edge, in-flight documentation, not a shipped feature
an agent can assume is in whatever CMake a user has installed today.

### 4. LLVM CMake Primer and conventions

[The primer](https://llvm.org/docs/CMakePrimer.html) documents LLVM's naming
convention directly: functions prefixed `llvm_` are internal building blocks
only; consumer-facing wrappers put the project name in the middle
(`add_llvm_executable`, `add_llvm_library`, defined in `AddLLVM.cmake`).
Guidance stated in the primer: avoid semicolons inside CMake lists ("it
doesn't go smoothly"); prefer `function()` over `macro()` "whenever
reasonable" because macros don't introduce a new variable scope;
`cmake_parse_arguments` "became a native command as of CMake 3.5" (worth
knowing when auditing whether a module still hand-rolls its own version); the
primer's own example pins `cmake_minimum_required(VERSION 3.20.0)`.

### 5. KDE Extra CMake Modules

Fetched the module sources directly rather than the (thin) `api.kde.org`
index page, since the latter carries only a manual-page list with no body
text.
[`KDECompilerSettings.cmake`](https://invent.kde.org/frameworks/extra-cmake-modules/-/raw/master/kde-modules/KDECompilerSettings.cmake)
documents `KDE_COMPILERSETTINGS_LEVEL` as an **ECM-version-valued** strictness
dial, not a boolean: setting it to `5.85` or `6.13` unlocks progressively
stricter defaults, and the module hard-errors
(`KDE_COMPILERSETTINGS_LEVEL (…) cannot be newer than the min. required ECM
version`) if a project requests a level newer than the ECM version it
actually depends on — a self-consistency check baked into the mechanism
itself. The module also warns it deliberately does not set `cmake_policy` at
its own scope because it expects to run in the includer's policy scope
(`NO_POLICY_SCOPE` recommended).
[`KDECMakeSettings.cmake`](https://invent.kde.org/frameworks/extra-cmake-modules/-/raw/master/kde-modules/KDECMakeSettings.cmake)
is split into three independently-disable-able parts: **Runtime Paths**
(requires `LIB_INSTALL_DIR`/`KDE_INSTALL_LIBDIR` set before include; disable
via `KDE_SKIP_RPATH_SETTINGS`), **Testing** (`BUILD_TESTING` option wired to
CTest; disable via `KDE_SKIP_TEST_SETTINGS`), and **Build Settings** (search
source/build dirs first for includes, AUTOMOC on by default; and, once
`find_package(ECM 5.38)` or newer is in effect, a flattened build-dir output
layout so uninstalled executables can find uninstalled plugins registered via
`kcoreaddons_add_plugin()`).

### 6. Qt 6 CMake policies

[The Qt CMake policies page](https://doc.qt.io/qt-6/qt-cmake-policies.html)
lists five policies as of Qt 6.11/6.10: `QTP0001` (QML modules default their
resource prefix to `/qt/qml/` instead of `/`), `QTP0002` (Android-specific
target-property paths may contain generator expressions), `QTP0003`
(consider `BUILD_SHARED_LIBS` when creating Qt libraries), `QTP0004` (extra
directories with QML files need their own `qmldir` files), `QTP0005`
(`qt_add_qml_module()` dependency keywords accept CMake targets, not just
module names). Per search-confirmed detail on the
[`QTP0001` page](https://doc.qt.io/qt-6/qt-cmake-policy-qtp0001.html),
`QTP0001` was introduced in Qt 6.5, and specifying `REQUIRES 6.8` in a
project's `qt_standard_project_setup()`/policy call enables `QTP0001` through
`QTP0005` as a bundle — the same "declare a version, inherit a policy set"
mechanic CMake itself uses for `cmake_policy(VERSION …)`, layered a second
time inside Qt's own build API.

### 7. Boost's CMake build

[`boostorg/cmake`](https://github.com/boostorg/cmake) is explicit that "the
officially supported way to build Boost remains b2" — CMake support is
secondary, submoduled as `tools/cmake`. It exposes `Boost::boost` and
`Boost::headers` compatibility targets (added Boost 1.82) so `find_package
(Boost)` consumers work identically to the b2-produced tree.
`BOOST_INCLUDE_LIBRARIES`/`BOOST_EXCLUDE_LIBRARIES` select which libraries
build. Three binary-naming layouts are supported — `system`, `tagged`,
`versioned` — the last producing decorated names like
`libboost_timer-vc143-mt-gd-x64-1_82.lib`, a naming-collision hazard worth a
rule row for any CMake project that vendors or links Boost across toolsets.

### 8. Kitware's own source-tree and Find-module conventions

[`cmake-developer(7)`](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-developer.7.rst)
codifies the Find-module contract every `Find<Package>.cmake` should meet:
set `<PackageName>_FOUND`; respect `<Pkg>_FIND_QUIETLY` (suppress all
messages) and `<Pkg>_FIND_REQUIRED` (issue `FATAL_ERROR` if not found, else a
non-fatal message); prefer the "modern approach" of exposing imported
targets (propagates usage requirements) over the "traditional approach" of
only setting variables; and maintain backward compatibility with any prior
variable-based interface a module previously exposed. Most modules delegate
the common bookkeeping to `FindPackageHandleStandardArgs`.
[`Modules/readme.txt`](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Modules/readme.txt)
is four lines and simply redirects to the manual page and to the
Module-Maintainers wiki.
[`Help/dev/maint.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/dev/maint.rst)
documents that CMake "has no formal governance body" but every merge is
gated by a GitLab bot command (`Do: merge`), and release commits/tags must
use the **exact** strings `CMake $fullver` and `v$fullver` — a concrete
example of a convention enforced entirely by a bot checking a literal string,
worth citing as precedent for how mechanical a "rule" can be.

### 9. vcpkg maintainer guide

[The full guide](https://raw.githubusercontent.com/MicrosoftDocs/vcpkg-docs/main/vcpkg/contributing/maintainer-guide.md)
(772 lines, fetched from its actual home in `MicrosoftDocs/vcpkg-docs` — it
is **not** in the `microsoft/vcpkg` repo itself) states, under "Ports must
install simultaneously," that a port must not: install files that conflict
with another port; install symbols/definitions owned by another package; or
test for the presence/absence of another port except through a declared
dependency. Under "Add CMake exports in an unofficial- namespace": any CMake
config a port exports that upstream doesn't already provide must be named
`unofficial-<port>`, with targets in the `unofficial::<port>::` namespace —
explicitly to avoid vcpkg creating "lock-in" that would make a system install
and a vcpkg install of the same library behave differently to a consumer's
`find_package`. Under "Avoid deprecated helper functions":
`vcpkg_fixup_cmake_targets` "should be replaced by
[`vcpkg_cmake_config_fixup`]." Under "Build techniques": "Do not use vendored
dependencies," "Choose either static or shared binaries" (not both in one
triplet), "Do not add `CMAKE_WINDOWS_EXPORT_ALL_SYMBOLS`," "Do not rename
binaries outside the names given by upstream." Portfiles "are run in Script
Mode" — i.e. `cmake -P` semantics, no `project()` call, which shapes what a
portfile is allowed to assume.

### 10. Conan Center hooks (archived) and the current Conan 2 template

[`conan-io/hooks`](https://raw.githubusercontent.com/conan-io/hooks/master/hooks/conan-center.py)
implements ~65 `KB-Hxxx` checks (`KB-H001`–`KB-H069`, with gaps).
CMake-relevant ones: `KB-H016` (CMake modules/config files placement),
`KB-H019` (CMake file not in build folders), `KB-H028` (every
`CMakeLists.txt`/`*.cmake` must open with `cmake_minimum_required(VERSION …)`
before any non-comment content), `KB-H046` (forbids
`set(CMAKE_VERBOSE_MAKEFILE ON)`), `KB-H048` (test_package needs CMake
≥3.1), `KB-H049` (`CMAKE_WINDOWS_EXPORT_ALL_SYMBOLS` needs CMake ≥3.4),
`KB-H040` (forbids `self.cpp_info.name`/`filename` and
`cpp_info.names/filenames["cmake"]` overrides — Conan-1-era API). The repo's
[own README banner](https://raw.githubusercontent.com/conan-io/hooks/master/README.md)
states: "This hooks repository was for Conan 1.X and it is not longer
maintained, it is archived" — confirmed by GitHub's repo metadata
(`archived: true`, `pushed_at: 2026-03-24`). The current Conan 2 replacement
convention lives in
[`conan-center-index`'s own `cmake_package` template](https://raw.githubusercontent.com/conan-io/conan-center-index/master/docs/package_templates/cmake_package/all/conanfile.py):
`CMakeToolchain`/`CMakeDeps`/`cmake_layout(self, src_folder="src")`,
`tool_requires("cmake/[>=3.16 <4]")` (Conan 2's version-range syntax),
`rmdir(package_folder/lib/cmake)` in `package()` to strip any upstream CMake
config so `CMakeDeps` is the sole `find_package` provider, and
`cpp_info.set_property("cmake_target_name", "package::package")` /
`cmake_file_name` / `cmake_module_file_name` / `cmake_module_target_name` /
`pkg_config_name` — a property-based naming API that directly supersedes what
`KB-H040` used to forbid the old dict-based way of doing. No committed
GitHub Actions linter enforces the current rules visibly (`.github/workflows`
in `conan-center-index` holds only `stale.yml`); CI runs on Kitware/Conan's
own Jenkins (`ci.conan.io`), not inspectable from this corpus — flag as an
enforcement mechanism this research could not directly verify.

### 11. cpp-best-practices cmake_template and project_options

[`cmake_template`](https://raw.githubusercontent.com/cpp-best-practices/cmake_template/main/README.md)'s
stated top-level (only-if-top-level-project) defaults: Address Sanitizer and
UBSan enabled where possible, warnings-as-errors, clang-tidy and cppcheck
static analysis, CPM for dependencies, plus a WebAssembly build with
automatic GitHub Pages deployment.
[`project_options`](https://raw.githubusercontent.com/aminya/project_options/main/README.md)
is the library `cmake_template` builds on: its toggle surface includes
`ENABLE_CACHE`, `ENABLE_CPPCHECK`, `ENABLE_CLANG_TIDY`, `ENABLE_VS_ANALYSIS`,
`ENABLE_INTERPROCEDURAL_OPTIMIZATION`, `ENABLE_NATIVE_OPTIMIZATION`,
`ENABLE_DOXYGEN`, `ENABLE_COVERAGE`,
`ENABLE_SANITIZER_ADDRESS`/`UNDEFINED`/`THREAD`/`MEMORY`,
`ENABLE_SANITIZER_POINTER_COMPARE`/`SUBTRACT`, `ENABLE_CONTROL_FLOW_PROTECTION`,
`ENABLE_STACK_PROTECTION`, `ENABLE_OVERFLOW_PROTECTION`,
`ENABLE_ELF_PROTECTION`, `ENABLE_RUNTIME_SYMBOLS_RESOLUTION`,
`ENABLE_COMPILE_COMMANDS_SYMLINK`, `ENABLE_PCH`, `WARNINGS_AS_ERRORS`,
`ENABLE_INCLUDE_WHAT_YOU_USE`, `ENABLE_GCC_ANALYZER`,
`ENABLE_BUILD_WITH_TIME_TRACE`, `ENABLE_UNITY`. `run_vcpkg`/`run_conan`
functions auto-bootstrap either package manager before `project()`. The
README documents concrete Windows sanitizer traps: ASan crashes on entering a
`catch` handler that reads the exception object; UBSan needs ASan alongside
it or a static CRT; ASan ships as a DLL on Windows, requiring
`install_sanitizer_runtime()` to place it next to built binaries.

### 12. friendlyanon/cmake-init

[The README](https://raw.githubusercontent.com/friendlyanon/cmake-init/master/README.md)
states its goals: `FetchContent`-ready projects, "cleanly separate developer
and consumer targets," modern CMake "3.14+." Its generated
[`cmake/project-is-top-level.cmake`](https://raw.githubusercontent.com/friendlyanon/cmake-init/master/cmake-init/templates/common/cmake/project-is-top-level.cmake)
is a two-line compat shim (`string(COMPARE EQUAL "${CMAKE_SOURCE_DIR}"
"${PROJECT_SOURCE_DIR}" PROJECT_IS_TOP_LEVEL)`) explicitly commented "This
variable is set by `project()` in CMake 3.21+" — proof the template still
targets a pre-3.21 floor despite calling itself "modern." Everything
developer-facing routes through that variable:
[`cmake/dev-mode.cmake`](https://raw.githubusercontent.com/friendlyanon/cmake-init/master/cmake-init/templates/common/cmake/dev-mode.cmake)
(CTest + `add_subdirectory(test)` gated on `BUILD_TESTING`, lint/spell
targets, optional Doxygen+m.css docs, optional coverage) is only included
when top-level.
[`cmake/install-rules.cmake`](https://raw.githubusercontent.com/friendlyanon/cmake-init/master/cmake-init/templates/common/cmake/install-rules.cmake)
shows component-based installs (`<name>_Runtime`/`<name>_Development`),
`write_basic_package_version_file(… COMPATIBILITY SameMajorVersion)` (plus
`ARCH_INDEPENDENT` for header-only libraries), a `<name>_INSTALL_CMAKEDIR`
cache variable marked `advanced` so downstream packagers can relocate the
installed Config file, `install(EXPORT <name>Targets NAMESPACE <name>::)`,
and `include(CPack)` gated on `PROJECT_IS_TOP_LEVEL` — install-tree
correctness and CPack are treated as strictly top-level-project concerns.

### 13. Distro packaging: Debian, Fedora, Homebrew, conda-forge

**Debian**: the current
[Multiarch/Compiling wiki page](https://wiki.debian.org/Multiarch/Compiling)
documents `CMAKE_LIBRARY_ARCHITECTURE` ("set by cmake to the suitable
multiarch folder name (i386-linux-gnu, x86_64-linux-gnu…)") with the example
`install(TARGETS foo DESTINATION lib/${CMAKE_LIBRARY_ARCHITECTURE})`, but
**does not mention `GNUInstallDirs`** — a documentation gap on Debian's own
wiki, even though CMake's `GNUInstallDirs` module has detected Debian
multiarch paths since a dedicated upstream commit
([`GNUInstallDirs: add support for Debian multiarch`](https://gitlab.kitware.com/cmake/cmake/-/commit/43f83d2ee523a38648322f629559694c71d5bb52)).

**Fedora**: [`Packaging:Cmake`](https://fedoraproject.org/wiki/Packaging:Cmake)
documents the `%cmake`/`%make_build`/`%make_install`/`ctest -V` spec-file
pattern and warns that `-DCMAKE_SKIP_RPATH:BOOL=ON` can make a build link
against system libraries instead of the freshly built ones — prefer
`install(TARGETS …)` over `install(FILES … RENAME …)` to preserve correct
RPATH stripping-on-install. The active
[`Changes/CMake_drop_install_vars`](https://fedoraproject.org/wiki/Changes/CMake_drop_install_vars)
proposal (target: **Fedora Linux 45**, last updated **2026-03-10**) drops
`-DINCLUDE_INSTALL_DIR`, `-DLIB_INSTALL_DIR`, `-DSYSCONF_INSTALL_DIR`,
`-DSHARE_INSTALL_PREFIX`, `-DLIB_SUFFIX` from the `%cmake` macro's default
invocation because "these variables have never been standardized by CMake";
projects should use `GNUInstallDirs` (available since CMake 3.0) instead.

**Homebrew**: [`std_cmake_args`](https://docs.brew.sh/rubydoc/Formula.html)
has the signature `std_cmake_args(install_prefix: prefix, install_libdir:
"lib", find_framework: "LAST")` and (per Homebrew's own documented behavior)
passes `-DCMAKE_INSTALL_PREFIX=`, `-DCMAKE_INSTALL_LIBDIR=`,
`-DCMAKE_BUILD_TYPE=Release`, `-DCMAKE_FIND_FRAMEWORK=`, and `-Wno-dev`
among its standard arguments — the last one a flag CMake 4.4 now deprecates
in favor of `-Wno-author`.

**conda-forge**: [the CMake how-to page](https://conda-forge.org/docs/how-to/basics/cmake/)
states the one sharp footgun explicitly: `${CMAKE_ARGS}` — the space-
separated argument list conda-forge's compiler-activation scripts export —
"needs to be passed without quoting," because quoting collapses it into one
malformed argument. Also documents `-DCMAKE_FIND_FRAMEWORK=NEVER` and
`-DCMAKE_FIND_APPBUNDLE=NEVER` to stop CMake from silently picking up
macOS system frameworks/app bundles instead of conda-provided ones, and
`-DPython_EXECUTABLE=$PYTHON` for Python-embedding CMake projects. No
mention of `GNUInstallDirs` or a "cmake-conda-toolchain" concept on this
page.

### 14. Supply-chain and reproducibility codification

[OpenSSF Scorecard's Pinned-Dependencies check](https://github.com/ossf/scorecard/blob/main/docs/checks.md)
is scoped to "Dockerfiles, shell scripts, and GitHub workflows" on
GitHub-hosted repositories only; the documentation makes no mention of
CMake's `FetchContent`/`ExternalProject` mechanisms at all — they are simply
outside what this widely-used scorecard measures.
[reproducible-builds.org's build-path page](https://reproducible-builds.org/docs/build-path/)
likewise never names CMake; its guidance is purely at the compiler-flag
level — `-fdebug-prefix-map=OLD=NEW` (all GCC, Clang 3.8+),
`-fmacro-prefix-map` (GCC 8+/Clang 10+, for `__FILE__` macros),
`-ffile-prefix-map` (the GCC 8+/Clang 10+ alias combining both), and
Debian's `dpkg` ≥1.19.1 (Buster) `fixfilepath` build-flag switch. CMake
itself provides `CMAKE_BUILD_RPATH` (3.8+, [`Help/variable/CMAKE_BUILD_RPATH.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/variable/CMAKE_BUILD_RPATH.rst)),
explicitly scoped to build-tree binaries only ("will *not* be used for
binaries in the install tree" — that's `CMAKE_INSTALL_RPATH`'s job) — but
**no `CMAKE_DEBUG_PREFIX_MAP` variable exists** (confirmed: the corresponding
`Help/variable/` doc path 404s). A CMake project wanting reproducible builds
must wire the compiler flags into `CMAKE_<LANG>_FLAGS` itself; there is no
CMake-native abstraction.
[OSS-Fuzz's new-project guide](https://google.github.io/oss-fuzz/getting-started/new-project-guide/)
has no CMake-specific section; its universal `build.sh` contract (use
`$CXX` as the linker "even if your project is written in pure C," link
`$LIB_FUZZING_ENGINE` rather than assuming libFuzzer, put binaries in `$OUT`,
never delete source files because "they are needed for code coverage")
applies identically regardless of build system — itself the finding: OSS-Fuzz
treats CMake as just another build system to shell out to, not a privileged
integration path. CISA's Secure-by-Design materials
([cisa.gov/securebydesign](https://www.cisa.gov/securebydesign)) do not name
CMake or any specific build tool.

### 15. rules_foreign_cc's `cmake()` rule — the CMake-facing requirements

Fetched the rule implementation directly
([`foreign_cc/cmake.bzl`](https://raw.githubusercontent.com/bazel-contrib/rules_foreign_cc/main/foreign_cc/cmake.bzl),
[`foreign_cc/private/framework.bzl`](https://raw.githubusercontent.com/bazel-contrib/rules_foreign_cc/main/foreign_cc/private/framework.bzl))
rather than a docs page, since `docs/cmake.md` does not exist at that path in
the `main` branch (the rendered docs are stardoc-generated from these
docstrings into `docs/src/rules.md`). Requirements the rule places **on the
wrapped CMake project**: `lib_source` (mandatory — a label, typically a
`filegroup`, pointing at the project's source); `cache_entries` (a
`string_dict` passed as `-Dkey=value`, with toolchain-injected values
prepended); `generate_args` (defaults to Unix Makefiles on Linux/macOS,
Ninja on Windows, unless `-G` is supplied); `generate_crosstool_file`
(default `True` — synthesizes a CMake toolchain file from Bazel's
`cc_toolchain` unless the caller passes its own `CMAKE_TOOLCHAIN_FILE` cache
entry, in which case that one wins; cross-compiling this way additionally
requires `CMAKE_SYSTEM_NAME` in `cache_entries`); `install` (default `True`
— runs `cmake --install`); `working_directory` (defaults to the top of
`lib_source`); and the output-declaration attributes the project's install
step must actually produce: `out_static_libs`/`out_shared_libs`/
`out_binaries`/`out_interface_libs` (named artifacts expected after install;
if none of these plus `out_headers_only` are set, the rule assumes a single
`lib_name.a`/`.lib`), `out_include_dir` (default `include`), `out_lib_dir`
(default `lib`), `out_bin_dir`/`out_dll_dir` (default `bin`),
`out_data_dirs`/`out_data_files`. The **network and working-directory
constraint** the frame asked about is enforced, not advisory: the rule's
execution requirements set `execution_requirements["block-network"] = ""`
**unless** the target's own `tags` include `requires-network` — so a
wrapped CMake project that reaches out to the network during configure or
build fails inside Bazel's sandbox by default. The same file also documents
an optional `-ffile-prefix-map=$EXT_BUILD_ROOT=.` sandbox-path-stripping
flag, tying this rule directly to the reproducibility cluster in §14.

## Candidate topics

| Topic | Why it matters | Source | Covered? | Priority |
|---|---|---|---|---|
| Is `cmake-lint`'s deprecated-command list (W0104) still accurate for CMake 4.x, or does it miss everything deprecated since 2020? | The tool hasn't released since 2020-08-19; any rule that cites its findings as authoritative is citing stale data | [lintdb.py](https://raw.githubusercontent.com/cheshirekow/cmake_format/master/cmakelang/lint/lintdb.py) | no | P1 — the catalogue sweep's headline "no" finding, must be stated plainly in the shipped rule set |
| Does gersemi's `--definitions`/`cmake_parse_arguments`-detection mechanism correctly format a project's own custom `function()`s without hand-authoring a formatter? | Direct verification command (`gersemi --check`) exists; the "obvious manner" requirement is a real trap | [gersemi README](https://raw.githubusercontent.com/BlankSpruce/gersemi/master/README.md) | no | P1 — gersemi is the actively maintained tool an agent should actually run |
| Does the project's CI still invoke `-Wdev`/`-Werror=dev`/`--warn-uninitialized`, and does that still work once CMake 4.4 ships? | All four spellings are now deprecated compat synonyms; a rule written today should teach the new `-W<category>` spelling, not the deprecated one | [OPTIONS_BUILD.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/include/OPTIONS_BUILD.rst) | no | P0 — directly in the frame's own named topic list, and about to break silently |
| Which `cmake-diagnostics(7)` category should CI promote to `SEND_ERROR`, and which should stay `ignore` (e.g. `CMD_INSTALL_ABSOLUTE_DESTINATION`, default-ignore)? | New (4.4) system; defaults are intentionally lenient (most new categories default to `ignore`), so "clean cmake output" no longer implies "no absolute-install-destination problems" | [cmake-diagnostics(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-diagnostics.7.rst) | no | P1 — but explicitly version-gate to CMake ≥4.4, unreleased at research time |
| Does `find_ocx` (or any consuming project) rely on the pre-3.21 `PROJECT_IS_TOP_LEVEL` shim pattern, or does it assume the native variable and silently misbehave under 3.19–3.20? | `find_ocx` targets a 3.19 floor per the frame; cmake-init's own shim proves this is a live compatibility question, not academic | [project-is-top-level.cmake](https://raw.githubusercontent.com/friendlyanon/cmake-init/master/cmake-init/templates/common/cmake/project-is-top-level.cmake) | no | P0 — directly touches the fleet's one CMake codebase's stated floor |
| Does the project's `install(EXPORT …)` / Config-package output stay relocatable (no absolute paths) once installed to a non-default prefix, especially under DESTDIR staging? | This is exactly what `CMD_INSTALL_ABSOLUTE_DESTINATION` (new diagnostic, default ignore) and Fedora's/Debian's packaging guidance both independently flag | [CMD_INSTALL_ABSOLUTE_DESTINATION](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/diagnostic/CMD_INSTALL_ABSOLUTE_DESTINATION.rst), [vcpkg maintainer guide](https://raw.githubusercontent.com/MicrosoftDocs/vcpkg-docs/main/vcpkg/contributing/maintainer-guide.md) | no | P0 — install/export correctness is named explicitly in the frame |
| Should a shipped rule set name `GNUInstallDirs` as mandatory, and flag any hand-rolled `CMAKE_INSTALL_LIBDIR`/`LIB_SUFFIX` logic as a smell? | Fedora is actively deleting non-standard install-dir variables from its own macro (2026-03-10 change) precisely because projects hand-roll this incorrectly | [Changes/CMake_drop_install_vars](https://fedoraproject.org/wiki/Changes/CMake_drop_install_vars) | no | P0 — dated, current, and mechanically checkable (`grep -n "LIB_INSTALL_DIR\|LIB_SUFFIX" CMakeLists.txt`) |
| Does a CMake project vendoring or exposing a package-manager-facing CMake config use the `unofficial-<name>`/`unofficial::<name>::` convention when it isn't upstream's own export, to avoid vcpkg/system-install ambiguity? | Concrete, checkable naming rule from vcpkg's maintainer guide; generalizes past vcpkg itself to any project that layers a non-upstream Config package on top of a third-party library | [vcpkg maintainer guide](https://raw.githubusercontent.com/MicrosoftDocs/vcpkg-docs/main/vcpkg/contributing/maintainer-guide.md) | no | P1 |
| Does the project set `CMAKE_WINDOWS_EXPORT_ALL_SYMBOLS`, and is that actually appropriate, or is it papering over missing `__declspec(dllexport)` annotations upstream refuses to add? | Both vcpkg ("Do not add") and Conan Center's now-archived hook (`KB-H049`, CMake ≥3.4 requirement) independently flag this exact variable | [vcpkg maintainer guide](https://raw.githubusercontent.com/MicrosoftDocs/vcpkg-docs/main/vcpkg/contributing/maintainer-guide.md), [cci_hook.py](https://raw.githubusercontent.com/conan-io/hooks/master/hooks/conan-center.py) | no | P2 — Windows-DLL-specific, narrower audience but a real trap |
| Is a Conan 2 recipe's `cpp_info` naming done via `set_property("cmake_target_name", …)` (current) or via the dict-based `cpp_info.names["cmake"]` (Conan-1-era, now unenforced but still copy-pasted from old examples)? | The enforcing hook that used to catch this is archived; nothing catches it now except human review or a new rule | [cmake_package template conanfile.py](https://raw.githubusercontent.com/conan-io/conan-center-index/master/docs/package_templates/cmake_package/all/conanfile.py), [hooks README](https://raw.githubusercontent.com/conan-io/hooks/master/README.md) | no | P0 — the sharpest "the automated check went away, a written rule must replace it" finding |
| Does the project's `cmake_minimum_required(VERSION …)` line appear before any other non-comment content in every `CMakeLists.txt`/`*.cmake` file? | KB-H028's exact rule, mechanical and grep-able, and still true regardless of the hook's archived status | [cci_hook.py](https://raw.githubusercontent.com/conan-io/hooks/master/hooks/conan-center.py) | no | P2 |
| Does any `CMakeLists.txt` still set `CMAKE_VERBOSE_MAKEFILE ON` unconditionally, defeating quiet-by-default CI logs? | KB-H046's exact rule; trivially checkable | [cci_hook.py](https://raw.githubusercontent.com/conan-io/hooks/master/hooks/conan-center.py) | no | P3 — low severity, easy to detect and fix |
| Does the project's CMake floor (`cmake_minimum_required`) match what its own feature usage requires — e.g. `CXX_STANDARD` (needs ≥3.1), `CMAKE_WINDOWS_EXPORT_ALL_SYMBOLS` (needs ≥3.4), `string(JSON)`/`file(ARCHIVE_EXTRACT)` (needs ≥3.19)? | Generalizes KB-H048/KB-H049's version-floor checks past Conan Center's specific list; directly relevant to `find_ocx`'s stated 3.19 floor | [cci_hook.py](https://raw.githubusercontent.com/conan-io/hooks/master/hooks/conan-center.py) | partial (find_ocx already pins 3.19 deliberately) | P1 |
| Does a project targeting CMake ≥4.0 still carry a `cmake_minimum_required(VERSION 2.x)` or 3.0–3.4 floor that will hard-fail at configure time? | CMake 4.0 removed compatibility with floors below 3.5 — the frame's headline shift; every one of these historic version-floor checks (`>=3.1`, `>=3.4`) becomes a hard configure error, not a lint warning, once the *consuming* CMake is 4.0+ | frame (`cmake-frame.md`), corroborated by [4.4 version scheme in `CMakeVersion.cmake`](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Source/CMakeVersion.cmake) | partial (frame names the shift; this corpus supplies concrete old-floor values that now break) | P0 |
| Is `KDE_COMPILERSETTINGS_LEVEL`-style versioned strictness (vs. a boolean `ENABLE_STRICT`) a pattern worth recommending for a project's own opt-in hardening flags? | A genuinely different design than CMake's own OLD/NEW policy dial or a plain boolean; worth a design note even outside KDE | [KDECompilerSettings.cmake](https://invent.kde.org/frameworks/extra-cmake-modules/-/raw/master/kde-modules/KDECompilerSettings.cmake) | no | P3 — design-guidance topic, not a checkable rule |
| Do two independently-versioned "declare a version, inherit a policy bundle" systems (CMake's own `cmake_minimum_required`/policies, and Qt's `REQUIRES 6.8`/`QTPnnnn`) interact safely, or can raising one silently change the other's assumed defaults? | Qt's policy-bundling mechanic is a second, independent instance of the same design CMake itself uses one layer down — a project using both needs to reason about both dials | [Qt CMake policies](https://doc.qt.io/qt-6/qt-cmake-policies.html) | no | P3 — narrow to Qt-consuming projects |
| Does a project's `FetchContent`-vendored dependency risk shadowing a system copy `find_package` would otherwise have found, and is `FIND_PACKAGE_ARGS`/`CMP0169`/override-ordering understood? | Named directly in the frame's suspected-candidates list; this corpus's sources (cmake-init's `FetchContent`-forward goal, cpp-best-practices' CPM defaults) all assume FetchContent-first without addressing the shadow risk | frame (`cmake-frame.md`), [cmake-init README](https://raw.githubusercontent.com/friendlyanon/cmake-init/master/README.md) | no | P0 — the frame's own top-billed hypothesis candidate; this corpus found no source that actually resolves it, meaning it's a genuine gap for a design worker, not a survey worker |
| Does the project pin `FetchContent_Declare`/`ExternalProject_Add` sources to a commit SHA (or content hash) rather than a branch or tag, and does anything actually check this? | OpenSSF Scorecard's Pinned-Dependencies check explicitly does **not** look at CMake `FetchContent`/`ExternalProject` — nothing automated verifies this today | [OpenSSF Scorecard checks.md](https://github.com/ossf/scorecard/blob/main/docs/checks.md) | no | P0 — clean "nothing enforces this" finding, directly answers item 4's supply-chain ask |
| Does the project inject `-ffile-prefix-map`/`-fdebug-prefix-map`/`SOURCE_DATE_EPOCH` handling itself, given CMake has no built-in abstraction (no `CMAKE_DEBUG_PREFIX_MAP`) for reproducible builds? | Resolves the frame's speculative candidate to a clean "no such variable"; a rule must show the manual `CMAKE_<LANG>_FLAGS` wiring | [reproducible-builds.org build-path](https://reproducible-builds.org/docs/build-path/), CMake `Help/variable/` (404 check) | no | P1 |
| Is `CMAKE_BUILD_RPATH` (build-tree only) being confused with `CMAKE_INSTALL_RPATH` (install-tree) anywhere in the project, causing install-tree binaries to either miss dependencies or leak build-tree paths? | The two variables are easy to conflate and serve opposite trees; both are named directly in the frame | [CMAKE_BUILD_RPATH.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/variable/CMAKE_BUILD_RPATH.rst) | no | P1 |
| Does an OSS-Fuzz integration for this project rely on any CMake-specific carve-out that doesn't actually exist, or does it correctly treat CMake as just another `build.sh`-driven build? | OSS-Fuzz's own docs have no CMake-specific section — a project author assuming special CMake handling (e.g. automatic sanitizer flag injection) is assuming something that isn't there | [OSS-Fuzz new-project-guide](https://google.github.io/oss-fuzz/getting-started/new-project-guide/) | no | P3 — narrow audience |
| Does the project's distro packaging story assume `CMAKE_INSTALL_LIBDIR`/`LIB_SUFFIX` are set for it by the packaging tool (rpm `%cmake`, Debian's `dh_auto_configure`), a habit about to break on Fedora 45? | Direct consequence of the Fedora change; a project's own `CMakeLists.txt` must call `include(GNUInstallDirs)` rather than assume the packaging macro injects these | [Changes/CMake_drop_install_vars](https://fedoraproject.org/wiki/Changes/CMake_drop_install_vars) | no | P0 |
| Does the project's Homebrew formula (or any packaging recipe) pass `-Wno-dev`, and will that keep working once `-Wno-dev` is fully removed rather than merely deprecated? | Homebrew's own `std_cmake_args` bakes in the now-deprecated spelling; this is a forward-compat trap this corpus found concretely, not hypothetically | [docs.brew.sh Formula.html](https://docs.brew.sh/rubydoc/Formula.html), [OPTIONS_BUILD.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/include/OPTIONS_BUILD.rst) | no | P2 |
| Is `${CMAKE_ARGS}` (conda-forge's compiler-activation-supplied argument list) ever passed quoted in a conda-forge recipe's `build.sh`, silently collapsing into one malformed argument? | conda-forge's own docs flag this as the one sharp footgun; mechanically checkable with a `grep -n '"\${CMAKE_ARGS}"' build.sh` | [conda-forge cmake how-to](https://conda-forge.org/docs/how-to/basics/cmake/) | no | P2 — narrow to conda-forge-packaged projects |
| Does the project's CMake config correctly detect and use `CMAKE_LIBRARY_ARCHITECTURE` for Debian multiarch install paths, or hard-code `lib`/`lib64`? | Named directly in item 3 of the brief; Debian's own wiki under-documents `GNUInstallDirs`'s multiarch awareness, so this is exactly the kind of gap an agent needs told explicitly | [Multiarch/Compiling](https://wiki.debian.org/Multiarch/Compiling), [GNUInstallDirs multiarch commit](https://gitlab.kitware.com/cmake/cmake/-/commit/43f83d2ee523a38648322f629559694c71d5bb52) | no | P2 |
| When a project is wrapped by `rules_foreign_cc`'s `cmake()` rule, does its configure or build step ever reach the network, given Bazel's default `block-network` execution requirement will fail it silently rather than explain why? | Directly the Bazel-seam question the frame assigns to this program; concrete, checkable via a `--sandbox_debug` rebuild | [foreign_cc/private/framework.bzl](https://raw.githubusercontent.com/bazel-contrib/rules_foreign_cc/main/foreign_cc/private/framework.bzl) | partial (Bazel-side "why this is hard" owned by BZL-CC dive 9.3 / row M-L-13, [bazel-topic-map.md](../bazel-topic-map.md); the CMake-project-facing requirement itself is this program's to state) | P0 |
| Does a CMake project intended to be wrapped by `rules_foreign_cc` declare an actual `install()` target with predictable `out_static_libs`/`out_shared_libs`/`out_include_dir` names, or does it rely on ambient build-directory layout Bazel's rule cannot see? | The rule's attribute contract (`out_*` names) requires the wrapped project to have deterministic, name-stable install output; an ad hoc or configuration-dependent install layout silently breaks the wrapper | [foreign_cc/cmake.bzl](https://raw.githubusercontent.com/bazel-contrib/rules_foreign_cc/main/foreign_cc/cmake.bzl) | partial (BZL-CC dive 9.3 not yet written; this corpus supplies the concrete attribute contract) | P1 |
| Does the project's own `CMAKE_TOOLCHAIN_FILE` usage collide with a wrapping build system's auto-generated one (Bazel's `generate_crosstool_file`, vcpkg's toolchain, Conan's `conan_toolchain.cmake`)? | `rules_foreign_cc` explicitly says its generated crosstool file is skipped only if the caller supplies its own `CMAKE_TOOLCHAIN_FILE` — confirms the frame's named collision point exists from the Bazel side too, not just between package managers | [foreign_cc/cmake.bzl](https://raw.githubusercontent.com/bazel-contrib/rules_foreign_cc/main/foreign_cc/cmake.bzl) | no | P0 — the frame's named "sharpest question," now confirmed to have a third contender (Bazel) beyond vcpkg/Conan |
| Does the project's `find_package(Foo)` fall back correctly when neither a Config package nor a Find module ships, and is the module hand-written to the `cmake-developer(7)` contract (respects `QUIET`/`REQUIRED`, exposes imported targets, keeps variable-based backward compatibility)? | Direct, checkable contract from Kitware's own developer manual; most hand-rolled find modules in the wild violate at least one clause | [cmake-developer(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-developer.7.rst) | no | P1 |
| Is a project's naming convention for functions/macros/variables checked at all, given `cmake-lint`'s naming-convention defaults were derived from CMake **3.10** listfiles and haven't been revisited since? | Directly explains *why* `cmake-lint`'s default regexes may reject perfectly idiomatic modern-CMake style (e.g. newer target-based patterns not present in the 2018-era CMake source it was trained against) | [lint-notes.rst](https://raw.githubusercontent.com/cheshirekow/cmake_format/master/cmakelang/doc/lint-notes.rst) | no | P2 |
| Does a project use `function()` where `macro()`'s scope leakage would cause a bug, per LLVM's stated preference and the general variable-shadowing hazard macros introduce? | Named directly in LLVM's primer; a common, checkable-by-grep antipattern (`macro(` where no macro-specific behavior — like early `return()` propagation to caller — is actually needed) | [LLVM CMake Primer](https://llvm.org/docs/CMakePrimer.html) | no | P1 |
| Does the project avoid semicolons inside CMake list values (the classic `set(X "a;b")` footgun LLVM's primer calls out), and is `list(APPEND)`/`separate_arguments()` used instead where real lists are needed? | Concrete quoting/list-semantics trap named directly in the frame's list of boring-but-biting topics | [LLVM CMake Primer](https://llvm.org/docs/CMakePrimer.html) | no | P1 |
| Does the project's sanitizer configuration correctly account for the documented Windows-specific ASan/UBSan traps (catch-handler crash, debug-CRT incompatibility, DLL runtime placement) rather than assuming Linux-only sanitizer behavior? | Concrete, dated (project_options' own README), and a real trap for any Windows-targeting CMake+sanitizer setup | [project_options README](https://raw.githubusercontent.com/aminya/project_options/main/README.md) | no | P2 |
| Does a project's install rules correctly gate CPack, versioned-include-dir defaults, and dev-only subdirectories on `PROJECT_IS_TOP_LEVEL` (or its pre-3.21 compat shim), so consumers who `add_subdirectory()`/`FetchContent` it don't inherit developer-only build machinery? | cmake-init's entire dev/consumer separation goal hinges on exactly this gate; a project that gets it wrong forces every consumer to build its tests, docs, and CPack packaging too | [install-rules.cmake](https://raw.githubusercontent.com/friendlyanon/cmake-init/master/cmake-init/templates/common/cmake/install-rules.cmake), [dev-mode.cmake](https://raw.githubusercontent.com/friendlyanon/cmake-init/master/cmake-init/templates/common/cmake/dev-mode.cmake) | no | P0 — central to the "CMake-language hygiene for a copy-and-own module" audience the frame names first |
| Is there a live, maintained automated linter that a project targeting Conan Center can actually run locally today, now that `conan-io/hooks` is archived? | A genuine capability gap this corpus surfaces: the enforcement mechanism the frame asked about (item 2, "each check is a codified rule") no longer exists as runnable tooling for Conan 2 | [hooks README](https://raw.githubusercontent.com/conan-io/hooks/master/README.md) | no | P1 — worth flagging in the rule set itself as "review-only, no automated gate" rather than implying one exists |
| Does the project's `install()` calls correctly separate `Runtime`/`Development`/`Headers` install components, enabling minimal (runtime-only) install trees for downstream packaging? | cmake-init's install-rules.cmake demonstrates the concrete pattern (`<name>_Runtime`, `<name>_Development` components); many hand-written CMakeLists skip components entirely | [install-rules.cmake](https://raw.githubusercontent.com/friendlyanon/cmake-init/master/cmake-init/templates/common/cmake/install-rules.cmake) | no | P2 |
| Does a project exporting a versioned Config package use `write_basic_package_version_file(... COMPATIBILITY SameMajorVersion)` (or an explicitly justified alternative), and is `ARCH_INDEPENDENT` set correctly for header-only libraries? | Concrete, checkable API usage directly from cmake-init's install template; wrong `COMPATIBILITY` choice silently breaks consumers' version constraints | [install-rules.cmake](https://raw.githubusercontent.com/friendlyanon/cmake-init/master/cmake-init/templates/common/cmake/install-rules.cmake) | no | P2 |
| Does the project's `BUILD_TESTING`/test-subdirectory inclusion actually get suppressed when consumed via `FetchContent`/`add_subdirectory()` by a parent project, or does it force the parent to build (and possibly fail) this project's own test suite? | Distro-packaging guidance (implicitly, via "BUILD_TESTING opt-out" named in item 3) and cmake-init's `dev-mode.cmake` both gate this on top-level-ness; a project that doesn't will break every consumer's build the moment tests are enabled globally | [dev-mode.cmake](https://raw.githubusercontent.com/friendlyanon/cmake-init/master/cmake-init/templates/common/cmake/dev-mode.cmake) | no | P0 |
| Does CISA, SLSA, or any named national-agency guidance actually say anything CMake-specific that a rule could cite, or is "secure CMake" purely a synthesis this program must do itself with no authoritative source to point to? | Explicit "no" finding: neither CISA nor (per this pass) SLSA names CMake; a shipped rule must be honest that it is original synthesis, not a citation of outside authority | [cisa.gov/securebydesign](https://www.cisa.gov/securebydesign) | no | P3 — mostly a documentation-honesty note, not a technical rule |
| Does the project's `cmake --workflow`/CMakePresets.json (schema ≥8, per the fleet's own probe directory) use the new (4.4, schema 12) `configurePresets.warnings`/`.errors` fields, or does it still rely on command-line `-Wdev` flags that presets can't express as cleanly? | Direct consequence of the 4.4 diagnostics overhaul; presets are explicitly named as the CI contract in the frame | [4.4 release notes](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/release/4.4.rst) | no | P1 — version-gate hard to CMake ≥4.4 |
| Is a copy-and-own CMake module (like `find_ocx`) itself following the Find-module contract (imported targets, `QUIET`/`REQUIRED` handling) even though it isn't a traditional `Find<X>.cmake` — and if not, should it be, or is that contract inapplicable to a tool-bootstrapping module? | Directly asks whether Kitware's own Find-module conventions generalize to the fleet's actual consumer shape (a bootstrap/provisioning module, not a library finder) | [cmake-developer(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-developer.7.rst), frame (`cmake-frame.md`) | partial (frame names `find_ocx` as the worked example; this corpus supplies the contract to check it against) | P1 |

## Recent shifts seen in this corpus

- **CMake 4.4 (in development; not tagged as of 2026-09-05) replaces the
  entire `-Wdev`/`-Werror=dev` mechanism** with a categorized diagnostics
  system (`cmake-diagnostics(7)`, `cmake_diagnostic` command, `-W<category>`).
  `-Wdev`/`-Wno-dev` become compat synonyms for `-Wauthor`/`-Wno-author`;
  `--warn-uninitialized` becomes a compat synonym for `-Wuninitialized`;
  `--no-warn-unused-cli` becomes a compat synonym for `-Wno-unused-cli`. Any
  rule text written against 3.x/early-4.x conventions that says "run with
  `-Wdev -Werror=dev`" needs an explicit version note the moment 4.4 ships,
  and the new categories (`CMD_UNINITIALIZED`, `CMD_UNUSED_CLI`,
  `CMD_INSTALL_ABSOLUTE_DESTINATION`) all default to `ignore`, so upgrading
  to 4.4 with no config change silences warnings some projects previously
  saw via `-Wdev`.
- **Fedora is dropping non-standard install-path variables from its `%cmake`
  macro**, targeting Fedora Linux 45, change last updated 2026-03-10.
  `-DINCLUDE_INSTALL_DIR`, `-DLIB_INSTALL_DIR`, `-DSYSCONF_INSTALL_DIR`,
  `-DSHARE_INSTALL_PREFIX`, `-DLIB_SUFFIX` stop being injected; a project that
  relied on the macro setting these for it now needs `GNUInstallDirs`
  explicitly.
- **`conan-io/hooks` was archived** (last push 2026-03-24), ending the only
  automated, publicly-inspectable lint gate Conan Center ever had. Its rules
  (cmake_minimum_required placement, verbose-makefile ban, legacy
  `cpp_info.names` ban) are not wrong, but nothing runs them anymore; Conan 2's
  `cmake_package` template has independently moved to `set_property()`-based
  naming, which happens to obsolete the specific rule (`KB-H040`) the old hook
  enforced, but that's coincidence, not a replacement mechanism.
- **gersemi has overtaken cmake-format/cmake-lint as the actively developed
  formatter** — v0.28.1 shipped 2026-08-19, a release every 2–4 weeks,
  against cmake-lint's last release in 2020. Any rule recommending a CMake
  formatter/linter combination written before ~2023 likely still names
  cmake-format by default; that default should flip.
- **CMake's diagnostics categories `CMD_STRICT` and `CMD_NON_TARGET_DIRECTIVE`
  are tagged `versionadded:: 4.5`** in the current documentation source, while
  no `Help/release/4.5.rst` exists yet — meaning even CMake's own
  in-development docs are ahead of CMake's own in-development release-notes
  file. Treat anything tagged 4.5 in this corpus as more speculative than the
  4.4-tagged material, which is itself unreleased.

## Contested

- **Whether `CMAKE_BUILD_TYPE=None` is actually current Debian packaging
  guidance**, as the frame's hypothesis phrasing suggested, versus a pattern
  this research confirmed only for **OSS-Fuzz** projects (which use it
  precisely to prevent CMake's default `Release`-flag injection from
  fighting sanitizer instrumentation flags). The Debian wiki content fetched
  in this pass (`Multiarch/Compiling`) says nothing about build types at all,
  and the `Packaging:Cmake` page's fetched content likewise did not surface
  it. This is an open item for a follow-up pass to either confirm against
  `dh_auto_configure`'s actual default flags or drop from the rule set as
  unconfirmed.
- **Whether an agent-facing rule should recommend `cmake-lint` at all.**
  One reading: still worth running for its purely syntactic checks (line
  length, trailing whitespace, argument-count thresholds) since those don't
  go stale with CMake's own evolution. The opposing reading: recommending an
  unmaintained tool as part of a 2026 quality bar sends the wrong signal
  regardless of which checks still fire correctly, and gersemi's own
  formatting checks (`--check`) cover the overlap. This corpus leans toward
  the second reading (see Summary) but does not resolve it — that's a design
  decision for the rule-authoring wave, not a survey finding.
- **Whether `-Wno-dev` should be treated as a hard anti-pattern or a legitimate
  choice for consuming an intentionally-legacy dependency.** Homebrew's own
  `std_cmake_args` bakes it in by convention (to silence upstream formula
  noise a packager can't fix), while a rule aimed at *authors* of CMake code
  would reasonably forbid ever suppressing author warnings on one's own
  project. The two audiences this program serves (module authors vs. module
  consumers, per the frame) genuinely want opposite defaults here.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [cmakelang/lint/lintdb.py](https://raw.githubusercontent.com/cheshirekow/cmake_format/master/cmakelang/lint/lintdb.py) | cmake-lint's literal check database, source | repo pushed_at 2024-05-01, last release 2020-08-19 | Primary — the full C/E/R/W code catalogue |
| [cmakelang/doc/lint-summary.rst](https://raw.githubusercontent.com/cheshirekow/cmake_format/master/cmakelang/doc/lint-summary.rst) | Implemented + "Planned" lint check tables | same repo | Primary — shows which planned checks never shipped |
| [cmakelang/doc/lint-notes.rst](https://raw.githubusercontent.com/cheshirekow/cmake_format/master/cmakelang/doc/lint-notes.rst) | Naming-convention derivation methodology | same repo, methodology dated to CMake 3.10 | Primary — dates the tool's assumptions precisely |
| [cmakelang/configuration.py](https://raw.githubusercontent.com/cheshirekow/cmake_format/master/cmakelang/configuration.py) | cmake-format's full configuration schema, source | same repo | Primary — every format/lint/misc knob |
| [PyPI cmake-format release JSON](https://pypi.org/pypi/cmake-format/json) | Package index release history | queried 2026-09-05 | Primary — confirms last release 0.6.13/2020-08-19 |
| [gersemi README](https://raw.githubusercontent.com/BlankSpruce/gersemi/master/README.md) | Full CLI/config/definitions-file documentation | fetched 2026-09-05, describes v0.28.x | Primary — the "what it refuses" and definitions mechanism |
| [gersemi releases API](https://api.github.com/repos/BlankSpruce/gersemi/releases) | Release history | v0.28.1 = 2026-08-19 | Primary — confirms active maintenance cadence |
| [CMake `cmake.1.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake.1.rst) | Official cmake(1) manual source | `master`, dev-4.4 era | Primary — verbatim option docs incl. deprecation notices |
| [CMake `OPTIONS_BUILD.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/include/OPTIONS_BUILD.rst) | Shared option include for cmake(1) | `master` | Primary — the actual `-W<category>`/`-Wdev` deprecation text |
| [CMake `cmake-diagnostics(7)`](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-diagnostics.7.rst) | New (4.4) diagnostics manual | `master`, versionadded 4.4 | Primary — the entire replacement mechanism for `-Wdev` |
| [CMake diagnostic category docs](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/diagnostic/CMD_AUTHOR.rst) (and siblings `CMD_DEPRECATED`, `CMD_EXPERIMENTAL`, `CMD_INSTALL_ABSOLUTE_DESTINATION`, `CMD_NON_TARGET_DIRECTIVE`, `CMD_POLICY`, `CMD_STRICT`, `CMD_UNINITIALIZED`, `CMD_UNUSED_CLI`) | Per-category diagnostic docs | `master` | Primary — exact default/parent/trigger per category |
| [CMake 4.4 release notes](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/release/4.4.rst) | Official release notes | `master`, unreleased as of research date | Primary — dates the diagnostics overhaul and presets schema 12 |
| [CMake `Source/CMakeVersion.cmake`](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Source/CMakeVersion.cmake) | Version-numbering source | fetched 2026-09-05, reads 4.4.20260905-dev | Primary — proves 4.4 is unreleased as of this research |
| [CMake `cmake-developer(7)`](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-developer.7.rst) | Find-module and developer manual | `master` | Primary — the Find-module contract |
| [CMake `Help/dev/maint.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/dev/maint.rst) | Kitware's own maintainer process | `master` | Primary — precedent for mechanically-enforced conventions |
| [CMake `CMAKE_BUILD_RPATH.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/variable/CMAKE_BUILD_RPATH.rst) | Variable doc | `master`, versionadded 3.8 | Primary — build-tree-only RPATH scope, confirms no DEBUG_PREFIX_MAP exists |
| [LLVM CMake Primer](https://llvm.org/docs/CMakePrimer.html) | Official LLVM CMake style doc | current | Primary — org style guide with exact naming/scoping rules |
| [KDE `KDECompilerSettings.cmake`](https://invent.kde.org/frameworks/extra-cmake-modules/-/raw/master/kde-modules/KDECompilerSettings.cmake) | ECM module source with embedded `.rst` docs | KDE `master` | Primary — the `KDE_COMPILERSETTINGS_LEVEL` mechanism verbatim |
| [KDE `KDECMakeSettings.cmake`](https://invent.kde.org/frameworks/extra-cmake-modules/-/raw/master/kde-modules/KDECMakeSettings.cmake) | ECM module source | KDE `master` | Primary — the three independently-disable-able settings groups |
| [Qt CMake policies](https://doc.qt.io/qt-6/qt-cmake-policies.html) | Official Qt 6 doc | Qt 6.10/6.11-era | Primary — the QTPnnnn policy list |
| [Boost `boostorg/cmake`](https://github.com/boostorg/cmake) | Official repo README | current | Primary — Boost's stated CMake-vs-b2 support posture |
| [vcpkg maintainer guide](https://raw.githubusercontent.com/MicrosoftDocs/vcpkg-docs/main/vcpkg/contributing/maintainer-guide.md) | Official vcpkg docs (in `vcpkg-docs`, not `vcpkg` itself) | current | Primary — the richest MUST/SHOULD list in this corpus |
| [Conan Center hooks source](https://raw.githubusercontent.com/conan-io/hooks/master/hooks/conan-center.py) | `conan-io/hooks` implementation | archived, last push 2026-03-24 | Primary — full KB-Hxxx rule set, now unenforced |
| [Conan Center hooks README](https://raw.githubusercontent.com/conan-io/hooks/master/README.md) | Repo README with archival banner | archived | Primary — explicit "not longer maintained" statement |
| [Conan Center `cmake_package` template](https://raw.githubusercontent.com/conan-io/conan-center-index/master/docs/package_templates/cmake_package/all/conanfile.py) | Official current recipe template | Conan 2 era | Primary — the replacement convention for the archived hook's rules |
| [cpp-best-practices `cmake_template` README](https://raw.githubusercontent.com/cpp-best-practices/cmake_template/main/README.md) | Official README | current | Primary — stated defaults (sanitizers, warnings-as-errors, CPM) |
| [aminya `project_options` README](https://raw.githubusercontent.com/aminya/project_options/main/README.md) | Official README | current | Primary — full `ENABLE_*` surface and Windows sanitizer caveats |
| [friendlyanon `cmake-init` README](https://raw.githubusercontent.com/friendlyanon/cmake-init/master/README.md) + [templates](https://raw.githubusercontent.com/friendlyanon/cmake-init/master/cmake-init/templates/common/cmake/install-rules.cmake) | Official README and generated templates | current | Primary — dev/consumer separation, PROJECT_IS_TOP_LEVEL shim, install-tree pattern |
| [Fedora `Changes/CMake_drop_install_vars`](https://fedoraproject.org/wiki/Changes/CMake_drop_install_vars) | Official Fedora Change proposal | target Fedora 45, updated 2026-03-10 | Primary — dated, current distro-packaging shift |
| [Fedora `Packaging:Cmake`](https://fedoraproject.org/wiki/Packaging:Cmake) | Official Fedora packaging wiki | current | Primary — RPATH/`%cmake` macro guidance |
| [Debian `Multiarch/Compiling`](https://wiki.debian.org/Multiarch/Compiling) | Official Debian wiki | current | Primary — `CMAKE_LIBRARY_ARCHITECTURE`, and its `GNUInstallDirs` gap |
| [Homebrew `docs.brew.sh/rubydoc/Formula.html`](https://docs.brew.sh/rubydoc/Formula.html) | Official Homebrew Ruby API docs | current | Primary — `std_cmake_args` signature and flags |
| [conda-forge CMake how-to](https://conda-forge.org/docs/how-to/basics/cmake/) | Official conda-forge docs | current | Primary — `${CMAKE_ARGS}` quoting footgun |
| [OpenSSF Scorecard checks.md](https://github.com/ossf/scorecard/blob/main/docs/checks.md) | Official Scorecard documentation | current | Primary — confirms no CMake FetchContent/ExternalProject coverage |
| [reproducible-builds.org build-path](https://reproducible-builds.org/docs/build-path/) | Official project documentation | current | Primary — generic compiler-flag guidance, no CMake mention |
| [OSS-Fuzz new-project-guide](https://google.github.io/oss-fuzz/getting-started/new-project-guide/) | Official OSS-Fuzz docs | current | Primary — confirms no CMake-specific integration path |
| [CISA Secure by Design](https://www.cisa.gov/securebydesign) | Official CISA program page | current | Primary — confirms no build-system-specific naming |
| [rules_foreign_cc `cmake.bzl`](https://raw.githubusercontent.com/bazel-contrib/rules_foreign_cc/main/foreign_cc/cmake.bzl) | Rule implementation and embedded docstring | `main` | Primary — full attribute contract on the wrapped CMake project |
| [rules_foreign_cc `framework.bzl`](https://raw.githubusercontent.com/bazel-contrib/rules_foreign_cc/main/foreign_cc/private/framework.bzl) | Shared rule framework implementation | `main` | Primary — `block-network` execution requirement, `out_*` attribute defaults |
| [Bazel topic map, row M-L-13](../bazel-topic-map.md) | Companion program's topic map (read-only) | dated 2026-09-05 wave | Secondary (context) — confirms the Bazel-side ownership boundary for rules_foreign_cc |
