# Reading the answers, mechanism by mechanism

Read this when the step 1 to 3 output in `SKILL.md` does not match a row of its
symptom table, or when a symptom row sends you here. It holds what each
resolution mechanism writes into the configure's records, and the output shape
that identifies it. It states no standard: every fix is a rule ID owned by the
`cmake-build` or `cpp-packaging` rule sets.

Measured 2026-09-26 on CMake 3.31.12, 4.3.4 and 4.4.2, Conan 2.32.0 with
cmake-conan `develop2` (as of 2026-09-26), and vcpkg-tool 2026-09-26, unless a
row says otherwise.

Contents: [Config mode](#config-mode-find_package) ·
[Module mode](#module-mode-find_package) ·
[FetchContent redirects](#fetchcontent-redirects) ·
[Dependency providers](#dependency-providers) ·
[Toolchain-injected paths](#toolchain-injected-paths) ·
[The Conan graph](#the-conan-graph) · [vcpkg](#vcpkg)

## Config mode `find_package`

The resolution order a plain `find_package(<X>)` follows, first match wins:

| Order | Source | Where it shows |
|---|---|---|
| 1 | A registered provider (`FIND_PACKAGE` method) | `--debug-find-pkg` prints `Package was found by the dependency provider` |
| 2 | `CMAKE_FIND_PACKAGE_REDIRECTS_DIR` (a FetchContent redirect) | `<X>_DIR` ends in `CMakeFiles/pkgRedirects` |
| 3 | A cached, valid, version-compatible `<X>_DIR`, used as is | The cache line itself. `--debug-find-pkg` lists only this one candidate |
| 4 | `<X>_ROOT`, then `CMAKE_PREFIX_PATH` (variable, then environment), then system paths | `--debug-find-pkg` on a `--fresh` configure lists every candidate |

Order 4 holds only while `CMAKE_FIND_ROOT_PATH` and `CMAKE_SYSROOT` are both
empty. Otherwise every category runs re-rooted first, so any rooted copy beats
a `_ROOT` hint (see [Toolchain-injected paths](#toolchain-injected-paths)).

- A version request makes CMake discard a cached `_DIR` whose package is
  incompatible. A bare `find_package(<X> CONFIG)` never does, which is why a
  stale `_DIR` survives (CMK-DEP-12, CMK-DEP-13).
- On CMake 4.3 and newer, each prefix also probes `cps/` locations. A valid
  `<X>.cps` beside `<X>Config.cmake` wins, and `<X>_DIR` then ends in
  `/cps/<x>` or `/cps`. A `.cps` that `find_package` rejects (any version
  schema but `simple` on an inexact request) falls through to the Config file
  with no diagnostic (CMK-DEP-11, CMK-INST-16). The `cps/` candidates in
  `--debug-find-pkg` output on 4.4.2 are noise, not misconfiguration.
- On 4.4.2 each `find_package-v1` event carries a `settings` block. Its
  `CMAKE_FIND_ROOT_PATH_MODE` line shows the package mode that was in force
  for that call.

## Module mode `find_package`

A Find module writes no `<X>_DIR` cache entry, so the step 1 grep prints
nothing for it on both lines. That is not "never looked up".

- `--debug-find-pkg=NAME` prints `find_package considered the following paths
  for Find<X>.cmake`, then `The file was found at` and the module's path.
- On 4.1 and newer the `find_package-v1` event shows the module's path, then
  `mode: "module"` on the next line.
- A stray `Find<X>.cmake` on `CMAKE_MODULE_PATH` answers a Config-only package
  before Config mode is tried. Stating `CONFIG` on the call removes that
  path (CMK-DEP-20).
- A removed module (`FindCUDA`, `FindPythonInterp`, `FindPythonLibs`) under a
  `...4.4` range is policy `NEW`. A `QUIET` call is then silent and
  `<X>_FOUND` stays empty (CMK-DEP-19). A bare `find_package(Boost)` instead
  falls through to the `BoostConfig.cmake` that Boost ships from 1.70.

## FetchContent redirects

| Output | Meaning | Rule |
|---|---|---|
| `<X>_DIR` = `<build>/CMakeFiles/pkgRedirects` | `OVERRIDE_FIND_PACKAGE`, or a `FIND_PACKAGE_ARGS` declare that fell through to a fetch, satisfied the call. The installed copy was never consulted, whatever `CMAKE_PREFIX_PATH` held | CMK-DEP-07, CMK-DEP-32 |
| `pkgRedirects/<x>-config-version.cmake` containing `Version not available` | The version-less stub. Every later `find_package(<X> <ver> EXACT)` succeeds with a blank `<X>_VERSION` | CMK-DEP-09 |
| A `FETCHCONTENT_SOURCE_DIR_<X>` cache entry | Resolution step 1: that directory is added directly. No provider and no `find_package` run, and the declare's `PATCH_COMMAND` is skipped | CMK-DEP-31 |
| Two `FetchContent_Declare` of one name in different files | The first declare processed wins. A newer pin in a subdirectory is ignored silently | CMK-DEP-10 |

To find which declare fired, grep the tree for the keyword, never trace by
file name. `--trace-source=CMakeLists.txt` traces only files of that name and
printed 0 lines for a declare kept in a `.cmake` module (4.4.2).

```sh
grep -rn -A2 --include='*.cmake' --include='CMakeLists.txt' -e 'FetchContent_Declare' -e 'CPMAddPackage' .
```

Empty output means the tree declares nothing through FetchContent or CPM, so
the copy came from elsewhere. Otherwise read the name in each hit (the `-A2`
lines cover a name split onto the next line). One name declared in more than
one file is a first-declare-wins question (CMK-DEP-10).

## Dependency providers

| Output | Meaning |
|---|---|
| `CMAKE_PROJECT_TOP_LEVEL_INCLUDES:UNINITIALIZED=...` in the step 1 grep | The user passed a top-level include. It is the provider of record only if nothing in the project sets or appends the variable (CMK-TC-04) |
| `Package was found by the dependency provider` in `--debug-find-pkg` output | The provider answered this call (both `CMakeDeps` and `CMakeConfigDeps`, 4.4.2) |
| cmake-conan under `CMakeDeps`: `<X>_DIR:PATH=<build>/conan` in the cache | The provider installed with Conan and answered the call. No `find_program`, `find_library` or `find_path` sees Conan content |
| cmake-conan under `CMakeConfigDeps`: no `<X>_DIR` cache line, and 4.4.2's configure log has no `find_package-v1` event for the package | Expected. The provider sets `<X>_DIR` as a normal variable from `conan_cmakedeps_paths.cmake` (measured 4.4.2 and 3.31.12). Read `--debug-find-pkg` instead |
| Console line `CMake-Conan: Loading conan_cmakedeps_paths.cmake file`, or the file `<build>/conan/conan_cmakedeps_paths.cmake` | `CMakeConfigDeps` is in use. From that call on, and in that directory scope and subdirectories added later, `CMAKE_PROGRAM_PATH`, `CMAKE_LIBRARY_PATH` and `CMAKE_INCLUDE_PATH` carry the package's `bin`, `lib` and `include`. `CMakeConfigureLog.yaml` never carries this line |
| `CMake-Conan: find_package(<X>) found, 'conan install' already ran` in a directory whose `find_program` is NOTFOUND | The first intercepted call ran in a subdirectory. The paths were set in that scope only (CMK-TC-05) |

`CMAKE_PREFIX_PATH` stays empty before and after the intercepted call under
both generators, so printing it proves nothing. `cmake_language(DEFER CALL
find_package ...)` runs at the end of the current directory, after every
non-deferred command in it, so it never makes an earlier `find_program` see
Conan. `cmake --help-command cmake_language` on the pinned binary lists the
closed method set a provider can intercept: `FIND_PACKAGE` and
`FETCHCONTENT_MAKEAVAILABLE_SERIAL`.

Per docs, not measured: `CMakeConfigDeps` under a multi-config generator, and
whether a build-context `tool_requires` binary reaches `CMAKE_PROGRAM_PATH`
through the same file.

## Toolchain-injected paths

The step 1 grep's `CMAKE_TOOLCHAIN_FILE` line names the one toolchain this
build tree loaded. A preset's `toolchainFile` beats its own
`cacheVariables.CMAKE_TOOLCHAIN_FILE`, and a command-line `-D` beats both. The
losing file is never read (CMK-TC-01).

| Output | Meaning | Rule |
|---|---|---|
| `<X>_DIR` under a manager's tree or a sysroot, while `<X>_ROOT` names another prefix, and the same after `--fresh` | A rooted copy won. vcpkg appends its installed triplet to `CMAKE_FIND_ROOT_PATH`, and any rooted candidate beats an unrooted `_ROOT` hint, cross build or not (measured with a one-line toolchain, 3.31.12 and 4.4.2). Pin the copy with `<X>_DIR` | CMK-DEP-21 |
| A Conan cross build finds a sysroot copy over Conan's package | Conan 2.32.0's `CMakeToolchain` rewrites every `CMAKE_FIND_ROOT_PATH_MODE_*` to `BOTH` in cross builds | CMK-TC-10 |
| A `VCPKG_*` or `CMAKE_TOOLCHAIN_FILE` value printed correctly, the other triplet's package found | The variable was set after the first `project()`. The printed value changed, the loaded file did not, and configure exits 0 | CMK-TC-03, CMK-VCPKG-04 |
| `vcpkg.cmake` and `conan_toolchain.cmake` both reach one configure leg | Two managers of record. The variable holds one path | CMK-TC-02 |

A `_ROOT` hint also never reaches a top-level `find_program` or
`find_library`. It reaches only `find_package(<X>)` and the `find_*` calls in
the Find module or Config file that call loads (CMK-DEP-14).

## The Conan graph

Run from the directory holding the consumer's `conanfile`, with the same
profiles, `-s`, `-o` and lockfile the build's `conan install` line uses.

```sh
conan graph info . --profile:host=default --profile:build=default
```

| Output line | Meaning |
|---|---|
| `gamma/1.0#<rrev> - Cache` under `Requirements` | The resolved reference and recipe revision, served from the local cache |
| `gamma/1.0#<rrev>:<package_id>#<prev> - Cache` | The binary that matches this profile exists |
| `... - Missing` | No binary matches this profile. `conan graph explain` names the closest one and the setting that differs |

`conan graph explain` answers "why does no existing binary match", not "what
resolved":

| Graph state | Exit | Output |
|---|---|---|
| Every binary present | 1 | `ERROR: There is no missing binary` |
| A binary missing | 0 | `Missing binary: <ref>`, the wanted `conaninfo.txt`, then `Closest binaries` with a `diff` block listing `expected:` and `existing:` settings |

The missing-binary run queried every configured remote before it reported
the local closest match (Conan 2.32.0).

A `conan.lock` in the working directory is picked up implicitly and pins
every ranged requirement it lists, with no flag. An empty `--lockfile=`
switches it off, and `--lockfile-partial` lets an unlisted requirement
resolve (CMK-CONAN-09). A version that "should have floated" and did not,
or floated in CI but not locally, starts there.

## vcpkg

vcpkg has no lockfile, no dependency provider and no CPS support
(CMK-VCPKG-11). Its version record is the manifest's `builtin-baseline` (or
a registry `baseline`) plus the vcpkg root commit CI checks out (CMK-VCPKG-01,
CMK-PKG-02).

| Tool | What it answers | What it does not |
|---|---|---|
| The step 1 grep's `VCPKG_INSTALLED_DIR` and `<X>_DIR` lines | Which installed tree this build tree resolved | Nothing else is needed for "which tree" |
| `VCPKG_TRACE_FIND_PACKAGE=ON` | That a `find_package` call happened. It is a macro override of `find_package` inside `vcpkg.cmake` | Which prefix answered. It logs every call, whoever satisfies it |
| `vcpkg depend-info` | What the manifest declares | Anything about a configure |
| `vcpkg x-update-baseline` | Nothing. It moves the baseline (`--add-initial-baseline` the first time), and the `x-` prefix marks it experimental | It is the only way to move a baseline, never a hand edit (CMK-VCPKG-01) |

Re-pointing `VCPKG_INSTALLED_DIR`, the triplet or the manifest root on a
reused build tree leaves `<X>_DIR` on the old tree, exactly like the plain
CMake case (measured 2026-09-26 with vcpkg-tool 2026-09-26 and two
overlay-port builds). The fix is CMK-DEP-13's: a fresh tree, `--fresh`, or
`-U <X>_DIR`.
