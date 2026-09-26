---
title: The consumable library — targets, install, export (consolidation)
topic: cmake-consumable-library
model: opus
id_family: CMK-INST, CMK-TGT
consolidates:
  - cmake-consumable-library/install-round-trip-and-cps.md
  - cmake-consumable-library/consumable-library-shape.md
  - cmake-consumable-library/usage-requirements-in-the-wild.md
  - cmake-consumable-library/install-edges-and-multiconfig.md
inputs_also_read:
  - cmake-frame.md (every Corrections block)
  - cmake-topic-map/era-recheck-2026-09-26.md
  - cmake-topic-map.md (conflicts 1, 5, 10, 11, 15; rows M-E-01..19, M-F-01..19)
  - cmake-audit/exemplar-cmake-shape.md, exemplar-deps-and-dual-build.md, find-ocx-cmake-shape-and-contracts.md, fleet-inventory-and-bazel-overlap.md
  - cmake-dependency-seam/cps-verification.md (rows 14, 19, 21, 22, 26, 27, 52)
date: 2026-09-26
verified: 2026-09-26
revised: 2026-09-26
measured_on: CMake 3.31.12, 4.3.4, 4.4.2 (ocx package exec kitware/cmake), gcc 15.2.1, Unix Makefiles and Ninja Multi-Config (ninja 1.13.2), pkg-config 2.3.0
---

# The consumable library: targets, install, export

This file consolidates three wave-2 dives and one wave-3 dive
(`install-edges-and-multiconfig.md`). It also records the measurements run
on 2026-09-26 to settle conflicts between them. The wave-2 scripts are in
[`cmake-consumable-library/scratch/consumable-library-consolidation/`](cmake-consumable-library/scratch/consumable-library-consolidation/).
Run them in this order: `run-cps-order.sh`, `run-nover.sh`,
`run-root-langnone.sh`, `run-cps-namespace.sh`,
`run-cps-namespace-consume.sh`. The wave-3 revision's scripts are in
[`cmake-consumable-library/scratch/consumable-library-rev3/`](cmake-consumable-library/scratch/consumable-library-rev3/):
`run-multiconfig-postfix.sh`, then `run-map-variants.sh` (it reuses the
prefixes the first one leaves), `run-export-package-floor.sh`,
`run-cps-hints.sh` and `run-rtdeps-cmp0207.sh`. Each one prints the results
quoted below.

## Verdict

1. **Prove that a package can be consumed by consuming it.** A green library
   build and `cmake --install` prove nothing. On 3.31.12 and 4.4.2, a missing
   `find_dependency()` shows up only when a separate consumer configures
   against the installed package. A CPS generator-expression failure passes
   `--build` and `--install` and fails only at configure. So the install →
   grep → move → consume script (CMK-INST-01) is the MUST verification for
   every edit to install or export rules. *Binds: library shipping a
   package; recipe or port author.*
2. **The Config package is the contract. Relocation depends on one line
   people overlook.** A relative `install(EXPORT … DESTINATION)` is what makes
   an install relocatable (measured). A `$<INSTALL_INTERFACE>` include path
   alone does not. `cmake-packages(7)`'s relocation example never says this.
   rapidjson ships a non-relocatable package for exactly this reason.
3. **The version file and the namespace are MUST. The choice of compatibility
   mode is SHOULD.** A package with no `ConfigVersion.cmake` fails every
   versioned `find_package` with "version: unknown" (measured on 3.31.12 and
   4.4.2). A namespace-less export turns a typo into a silent `-lname`
   (CMP0028).
4. **CPS stays SHOULD, and it is no longer "free to add".** The dive's finding
   "Config beats CPS" is **refuted**. That run used a `VERSION_SCHEMA rpm`
   file that `find_package` rejected, and the search then fell through to the
   Config file. With the default schema, `find_package` picks the `.cps`
   file on 4.3.4 and 4.4.2, with or without `CONFIG`. So on 4.3 and later the
   CPS file *is* what consumers load. Three MUST preconditions follow:
   namespace equals package name, the `simple` schema (or none), and only
   configuration-dependent generator expressions. A package with a
   mismatched namespace (`acme::dep`) that adds CPS breaks every ≥ 4.3
   consumer at configure time. 3.31.12 keeps working (measured). The match
   is exact, including case: `install(PACKAGE_INFO)` never reads the export
   `NAMESPACE`, so `Dep::` over package `dep` breaks the same way. It does
   honour `EXPORT_NAME`, which is the safe axis for renaming a published
   target (measured on 4.3.4 and 4.4.2). *Binds: library shipping a
   package.*
5. **An installable library declares its requirements on its targets. Top
   levels choose.** `target_link_libraries` names a scope keyword, and
   `target_compile_features(PUBLIC cxx_std_NN)` states the minimum standard.
   The library never sets `CMAKE_CXX_STANDARD` outside a top-level guard, and
   never adds an unconditional literal `-Werror` or `/WX`. Where
   `CMAKE_CXX_STANDARD` is set, it is paired with `_REQUIRED ON` (MUST,
   because the standard otherwise "decays") and `CMAKE_CXX_EXTENSIONS OFF`
   (SHOULD). *Binds: library shipping a package. An application may set
   these at its top level.*
6. **The dives' corpus-wide alarm numbers are retired from rule text.** "35 %
   bare `target_link_libraries`" becomes 13.3 % in a library's own core
   code. "0/46 `_EXTENSIONS OFF`" came from grepping a variable that does not
   exist. "0 of 7 install jobs traced to a consumer" becomes 3 of 5 when the
   scripts are actually read.
7. **find_ocx is vacuous for both families.** It installs nothing and has no
   compiled targets. One measured surprise binds it anyway: `<Pkg>_ROOT`, the
   seam `ocx_package(PULL)` exports, cannot find a Config package under
   `lib64` from a `project(… LANGUAGES NONE)` project. See the find_ocx
   section below.
8. **A multi-config install is its own contract, and exit codes do not
   check it.** When Debug and Release go into one prefix under one file
   name, the second `cmake --install --config` overwrites the first. Both
   `<set>-debug.cmake` and `<set>-release.cmake` then point at the one
   surviving binary, and every step exits 0 (measured on 3.31.12 and
   4.4.2). Distinct per-config file names are MUST (CMK-INST-21). A
   multi-config leg of the round trip is SHOULD (CMK-INST-22). A consumer
   whose configuration is missing from the install silently links another
   one. That fallback is documented (`IMPORTED_LOCATION` at 4.4.2: "the name
   of any other configuration listed in the `IMPORTED_CONFIGURATIONS` …
   may be selected") and measured. The check maps each configuration to
   itself (`CMAKE_MAP_IMPORTED_CONFIG_RELEASE=Release`). It never uses an
   empty map, because the empty element means "the configuration-less
   location", which rejects correctly installed configurations too
   (measured). *Binds: library shipping a package that installs more than
   one configuration.*
9. **`export(PACKAGE)` is not dead code under an old floor.** It writes into
   the user's `~/.cmake/packages` at configure time whenever the project's
   floor is below 3.15, which leaves CMP0090 unset. That includes
   rapidjson's real `CMakeLists.txt` (floor 3.5) on both 3.31.12 and 4.4.2
   (measured). CMK-INST-24 makes the call a MUST-not.
10. **Documented gaps.** These are gaps, not answers. The rules state them.
    - *Windows.* There is no Windows host. CMK-INST-23 (a shared library's
      DLL is a `RUNTIME` artefact) rests on `install.rst` at 4.4.2 alone.
      Whether CMP0207's "warns if not set" fires under the configure gate
      for Windows-path filters is unmeasured. On Linux it does not fire
      (measured on 3.31.12, 4.3.4 and 4.4.2).
    - *CPS `hints`.* On 4.3.4 and 4.4.2, every cross-package `requires`
      entry in a `.cps` file carries the dependency's absolute
      `<dep>_DIR` from export time. No `install(PACKAGE_INFO)` option
      controls it. It is advisory: after a move, the consumer's own search
      still wins (measured in the dive). CMK-INST-01 step (a) flags it only
      when the dependency sits inside the tree under test (measured). That
      is a real finding there.
    - *What the duplicate scan cannot see.* CMK-INST-21's check catches two
      configurations claiming one file. It cannot tell whether a file under
      a distinct name holds the right configuration's binary.

## The ruleset

Floor convention (topic map, conflict 1): rules are written for
`cmake_minimum_required(VERSION 3.25...<max>)`. Any newer mechanism carries
its gate. Every "measured" claim ran on 3.31.12 and 4.4.2, plus 4.3.4 for CPS.
"The configure gate" means the CMK-CORE gate the versions-and-gate group
defines: `-Werror=dev` on 3.x and 4.3, `-Werror=author` on 4.4 and later.

### CMK-INST: install, export, consumability

#### Caught by the round-trip script

The script below is the verification for CMK-INST-01 to -06 and -15 to -17.
Run it from an empty scratch directory on each CMake line under test.

```sh
# CMK-INST-01 round trip. The caller exports PKG (find_package name), VER (a version
# the package satisfies), TARGETS (its imported targets) and SRC (absolute source dir),
# for example: export PKG=example VER=1.0 TARGETS=example::example SRC=/abs/path/to/project
set -eu
: "${PKG:?}" "${VER:?}" "${TARGETS:?}" "${SRC:?}"
W="$PWD"
cmake -S "$SRC" -B "$W/build"
cmake --build "$W/build"
cmake --install "$W/build" --prefix "$W/prefix"
# (a) Text files in the prefix naming the source, build or install tree. Empty output = pass.
grep -rIl --exclude='*.pc' -e "$SRC" -e "$W/build" -e "$W/prefix" "$W/prefix" > "$W/leaks.txt" || true
test ! -s "$W/leaks.txt"
# (b) An export file with a baked absolute import prefix. Empty output = pass.
grep -rn --include='*.cmake' -e 'set(_IMPORT_PREFIX "/' "$W/prefix" > "$W/abs-import.txt" || true
test ! -s "$W/abs-import.txt"
# (c) Move the prefix, then configure, build and link a separate consumer against it.
mv "$W/prefix" "$W/moved"
mkdir -p "$W/consumer"
printf 'int main(void) { return 0; }\n' > "$W/consumer/main.c"
printf '%s\n' 'cmake_minimum_required(VERSION 3.25)' 'project(rt LANGUAGES C)' \
  "find_package($PKG $VER CONFIG REQUIRED)" 'add_executable(rt main.c)' \
  "target_link_libraries(rt PRIVATE $TARGETS)" > "$W/consumer/CMakeLists.txt"
cmake -S "$W/consumer" -B "$W/consumer-build" -DCMAKE_PREFIX_PATH="$W/moved"
cmake --build "$W/consumer-build"
grep -e "^${PKG}_DIR" "$W/consumer-build/CMakeCache.txt"
```

The script stops at the first failure, and any non-zero exit is a finding.
The consumer declares a compiled language on purpose: a `LANGUAGES NONE`
project cannot see `lib64` (see the find_ocx section below). The last line
shows which file the consumer resolved. On ≥ 4.3, with CPS installed, it ends
in `/cps/<pkg>`.

The script runs a single-config generator and never passes `--config`. It
therefore cannot see the multi-config defects; CMK-INST-22 adds that leg.
Its dependencies come from outside `$W`, because `$W/prefix` does not exist
when the first configure runs. So a `.cps` file that step (a) lists points
at a dependency found inside the source, build or install tree under test,
through the `requires.<dep>.hints` entry CMake writes on 4.3.4 and 4.4.2.
That is a real finding. If step (a) is run by hand over a prefix into which
several packages were installed, a `.cps` hit whose only absolute string
sits in the `"hints"` array is expected and not a finding
(`run-cps-hints.sh`: a separate dependency prefix gives no hit, and the
same prefix gives one on both lines).

**CMK-INST-01. Whenever install, export, Config-template or dependency
wiring changes, prove the package can be consumed with the round-trip
script. Never treat a green build and install as proof.**
- Rationale: a missing `find_dependency` fails only in the downstream
  consumer's Generate step. The exporting project's own build and install
  stay green (measured, byte-identical on 3.31.12 and 4.4.2).
- Verification: the script above exits 0.
- Severity: MUST.
- Floor: any. Measured on 3.31.12, 4.3.4 and 4.4.2.

**CMK-INST-02. Give `install(EXPORT … DESTINATION)` a relative path built
from `GNUInstallDirs`, such as `${CMAKE_INSTALL_LIBDIR}/cmake/<pkg>` (or
`${CMAKE_INSTALL_DATADIR}/cmake/<pkg>` for arch-independent packages).
Never build it from `${CMAKE_INSTALL_PREFIX}` or any other absolute base.**
- Rationale: with an absolute destination, CMake writes a literal
  `set(_IMPORT_PREFIX "/…")` instead of the relocation chain of
  `get_filename_component()` calls. rapidjson's real package then fails once
  its prefix moves. nlohmann/json uses the same `$<INSTALL_INTERFACE>` idiom
  with a relative destination and survives the move (measured on 4.4.2, in
  the shape dive §7).
- Verification: step (b) of the script. Empty output = pass.
- Severity: MUST.
- Floor: any. Measured on 4.4.2.

**CMK-INST-03. In the Config template, redeclare every imported dependency
that sits on an exported target's PUBLIC or INTERFACE link line with
`find_dependency()` from `CMakeFindDependencyMacro`, under the same
condition the build used to add it. Never use a raw `find_package()`
there.**
- Rationale: CMake never generates these calls, and it never checks for
  them at export time (measured). `find_dependency` forwards the consumer's
  `QUIET` and `REQUIRED` (`cmake-packages(7)` at v4.4.2). A raw
  `find_package(Threads REQUIRED)` makes the dependency fatal even for
  `find_package(spdlog QUIET)`. curl guards each call on its `@HAVE_…@`
  condition, which is the model.
- Verification: the script catches a missing call. For raw calls:
  `grep -rn --include='*Config.cmake.in' --include='*config.cmake.in' --include='*config.in.cmake' --include='*Config.cmake' --include='*-config.cmake' --exclude='Find*.cmake' -e 'find_package[[:space:]]*(' .`
  Empty output = pass. Each hit is a finding unless a comment explains it,
  or the file is not installed as a package Config file (llvm's
  `lldb/cmake/modules/LLDBConfig.cmake` is an internal module). The
  lower-case `*config.cmake.in` glob is needed for nlohmann/json's and
  gflags's `cmake/config.cmake.in`. The `*Config.cmake` and `*-config.cmake`
  globs cover hand-written Config files installed without templating, such
  as cmake-init's `cmake/install-config.cmake` and arrow's
  `cpp/src/arrow/arrow-config.cmake`, whose raw `find_package(Arrow CONFIG)`
  the template-only globs missed. `--exclude='Find*.cmake'` keeps
  `FindPkgConfig.cmake` out.
- Severity: MUST.
- Floor: `find_dependency` since 3.0. Measured on 3.31.12 and 4.4.2.

**CMK-INST-04. Install a `<Pkg>ConfigVersion.cmake` next to the Config
file, generated by `write_basic_package_version_file()`.**
- Rationale: without it, *every* versioned request fails: "considered but
  not accepted … version: unknown" (measured on 3.31.12 and 4.4.2,
  `run-nover.sh`). rapidjson and gflags hand-roll the file instead.
- Verification: the script's `find_package($PKG $VER …)` fails with
  "version: unknown". That failure is the finding.
- Severity: MUST.
- Floor: any. Measured on 3.31.12 and 4.4.2.

**CMK-INST-05. Process a Config template that contains `@PACKAGE_INIT@`
with `configure_package_config_file()`, never with `configure_file()`. A
hand-written Config template does no prefix or path arithmetic of its
own.**
- Rationale: `configure_package_config_file()` alone defines
  `PACKAGE_INIT` (`CMakePackageConfigHelpers.cmake` at v4.4.2). Run through
  `configure_file(@ONLY)`, the token silently becomes an empty string, as in
  rapidjson. Hand-written templates are safe exactly when they leave paths to
  the generated Targets file (nlohmann/json, cmake-init) or compute a
  relative path themselves (gflags).
- Verification: list the templates with
  `grep -rln --include='*.cmake.in' --include='*.in.cmake' -e '@PACKAGE_INIT@' .`,
  then read each hit. Every template listed must appear as the input of a
  `configure_package_config_file(` call. A template that only
  `configure_file(` consumes is a finding. The `*.in.cmake` glob is needed
  for curl's `CMake/curl-config.in.cmake`.
- Severity: MUST.
- Floor: `configure_package_config_file` since 2.8.8. Normative, plus
  measured on 3.31.12, 4.3.4 and 4.4.2 (`configure_file(@ONLY)` leaves an
  empty line where the token was).

**CMK-INST-06. Give every `install(EXPORT)` and `export(EXPORT)` a
`NAMESPACE`, so each imported target is spelled `<Ns>::<name>`.**
- Rationale: under CMP0028 a name containing `::` must be a target, so a
  typo or a missing `find_package` fails at configure. A bare name falls
  back to a `-l<name>` link flag. glfw and rapidjson export without a
  namespace.
- Verification: after step (c) of the script, run
  `grep -rhn --include='*.cmake' -e 'add_library(' "$W/moved" | grep -v -e '::'`
  Empty output = pass.
- Severity: MUST.
- Floor: CMP0028 is NEW since 3.0.

**CMK-INST-07. Make the export namespace equal the package name that
consumers pass to `find_package`, spelled exactly.**
- Rationale: 12 of 12 namespaced flagship libraries already comply. CPS
  names imported targets `<package>::<component>`, and Kitware confirms that
  permanently (cps-verification row 52). A mismatch is a liability today
  and a breakage once CPS ships (see CMK-INST-15).
- Verification: reading heuristic. Compare each `NAMESPACE X::` with the
  directory name under `lib*/cmake/` or `share/cmake/` in the installed
  prefix.
- Severity: SHOULD.
- Floor: any.

**CMK-INST-08. Choose the `write_basic_package_version_file` `COMPATIBILITY`
mode to match the library's ABI promise. `ExactVersion` fits a library with
no ABI stability (abseil); `SameMajorVersion` fits semver. For a header-only
package, add `ARCH_INDEPENDENT` and install its Config files under
`${CMAKE_INSTALL_DATADIR}/cmake/<pkg>`.**
- Rationale: corpus practice is SameMajorVersion 33, AnyNewerVersion 27,
  ExactVersion 9, and the choice follows each project's ABI policy. A
  header-only package without `ARCH_INDEPENDENT` rejects consumers whose
  pointer size differs. A `share/` location is searched even by projects
  that enable no language, and `lib64` is not (measured, see find_ocx
  below).
- Verification: reading heuristic. Run
  `grep -rn -A4 --include='CMakeLists.txt' --include='*.cmake' -e 'write_basic_package_version_file' .`
  and read each call against the project's versioning statement.
- Severity: SHOULD.
- Floor: `ARCH_INDEPENDENT` since 3.14.

#### Caught by the multi-config leg

Run this leg after the CMK-INST-01 script, in the same directory. It reuses
that script's `PKG`, `VER`, `TARGETS`, `SRC` and `$W/consumer`. `NINJA`
names a ninja binary when none is on `PATH`, because `Ninja Multi-Config`
does not find one otherwise (measured on 3.31.12 and 4.4.2).

```sh
# CMK-INST-22 multi-config leg. Stops at the first failure; any non-zero exit is a finding.
set -eu
: "${PKG:?}" "${VER:?}" "${TARGETS:?}" "${SRC:?}"
W="$PWD"
cmake -S "$SRC" -B "$W/mc-build" -G "Ninja Multi-Config" ${NINJA:+-DCMAKE_MAKE_PROGRAM="$NINJA"}
for c in Debug Release; do
  cmake --build "$W/mc-build" --config "$c"
  cmake --install "$W/mc-build" --config "$c" --prefix "$W/mc-prefix"
done
# (d) An installed file claimed by two configurations. Empty output = pass.
grep -rhoE --include='*-*.cmake' -e 'IMPORTED_LOCATION_[A-Z_]+ "[^"]+"' -e 'IMPORTED_IMPLIB_[A-Z_]+ "[^"]+"' "$W/mc-prefix" \
  | sed -E 's/^[^ ]+ //' | sort | uniq -d > "$W/dup.txt"
test ! -s "$W/dup.txt"
# (e) Move, then consume each configuration with the map pinned to itself,
# so a configuration missing from the install fails instead of borrowing another.
mv "$W/mc-prefix" "$W/mc-moved"
cmake -S "$W/consumer" -B "$W/mc-consumer-build" -G "Ninja Multi-Config" ${NINJA:+-DCMAKE_MAKE_PROGRAM="$NINJA"} \
  -DCMAKE_PREFIX_PATH="$W/mc-moved" -DCMAKE_MAP_IMPORTED_CONFIG_DEBUG=Debug -DCMAKE_MAP_IMPORTED_CONFIG_RELEASE=Release
for c in Debug Release; do cmake --build "$W/mc-consumer-build" --config "$c"; done
```

**CMK-INST-21. When more than one configuration is installed into one
prefix, give each configuration's binaries a distinct file name, with
`CMAKE_DEBUG_POSTFIX` or the `DEBUG_POSTFIX` property (for example
`if(NOT DEFINED CMAKE_DEBUG_POSTFIX)` then `set(CMAKE_DEBUG_POSTFIX d)`), or
install each configuration into its own prefix.**
- Rationale: with one `OUTPUT_NAME`, `cmake --install --config Release`
  overwrites the file `--config Debug` just wrote ("Installing:", not
  "Up-to-date:"). `IMPORTED_LOCATION_DEBUG` and `_RELEASE` then name the
  same path, which holds the Release binary, and a Debug consumer links it
  with no diagnostic (measured on 3.31.12 and 4.4.2, md5 in the dive; the
  step (d) scan prints the shared path). With `CMAKE_DEBUG_POSTFIX=d`, the
  prefix holds `libbased.so.1.0.0` and `libbase.so.1.0.0`, and the scan is
  empty (`run-multiconfig-postfix.sh`). 15 corpus repos outside Kitware and
  vcpkg mention `DEBUG_POSTFIX`. fmt
  (`fmtlib__fmt@522e2c12ab:CMakeLists.txt:112,271`) and yaml-cpp
  (`jbeder__yaml-cpp@1e0876c671:CMakeLists.txt:123-124`, the guarded `d`)
  set it. Conan and vcpkg
  keep configurations apart by package or by a `debug/` subtree, so this
  binds the project's own multi-config install path.
- Verification: step (d) of the multi-config leg. Empty output = pass. The
  scan cannot tell whether a distinctly named file holds the right binary
  (Verdict 10).
- Severity: MUST.
- Floor: any. `DEBUG_POSTFIX` applies to Ninja Multi-Config, Visual Studio
  and Xcode alike.

**CMK-INST-22. For a library that can be built with a multi-config
generator, run the multi-config leg above beside the single-config round
trip, in CI where CMK-INST-18 applies. When a consumer check must prove
that a configuration is present, pin `CMAKE_MAP_IMPORTED_CONFIG_<CONFIG>`
to that same configuration. Never set it to an empty value for this
purpose.**
- Rationale: with no map, a Release consumer against a Debug-only install
  configures, builds and runs with no warning (measured on 3.31.12 and
  4.4.2). The `IMPORTED_LOCATION` doc allows this fallback. Pinning the map
  to `Release` fails at configure when Release is missing and passes when
  it is present. An empty map fails in both cases ("IMPORTED_LOCATION or
  IMPORTED_IMPLIB not set … configuration "Release""), because an empty
  element names the configuration-less `IMPORTED_LOCATION`, which exports
  never set (`run-map-variants.sh`, 3.31.12 and 4.4.2). The error ends
  `cmake -S … -B …` with exit 1 under a multi-config generator too.
- Verification: the leg exits 0. As a negative control, install Debug
  only: step (e) must then exit non-zero at the consumer configure.
- Severity: SHOULD.
- Floor: any.

#### Caught by greps over the install rules and the configure gate

**CMK-INST-09. Take every install destination from `GNUInstallDirs`
variables, and derive RPATH suffixes and `.pc` paths from them. Never
hard-code `lib` or `lib64`, and never define or read `LIB_SUFFIX`,
`LIB_INSTALL_DIR`, `INCLUDE_INSTALL_DIR`, `SYSCONF_INSTALL_DIR` or
`SHARE_INSTALL_PREFIX`.**
- Rationale: `CMAKE_INSTALL_LIBDIR` resolved to `lib64` on this host
  (measured), and to `lib/<multiarch-tuple>` on Debian when the prefix is
  `/usr` (`GNUInstallDirs` doc at 4.4.2). Fedora 45's `%cmake` macro stops
  injecting the five legacy variables (change page updated 2026-03-10).
  gflags still documents two of them as public knobs.
- Verification:
  `grep -rn --include='CMakeLists.txt' --include='*.cmake' -e 'LIB_SUFFIX' -e 'LIB_INSTALL_DIR' -e 'INCLUDE_INSTALL_DIR' -e 'SYSCONF_INSTALL_DIR' -e 'SHARE_INSTALL_PREFIX' -e 'DESTINATION lib' -e 'DESTINATION "lib' -e 'ORIGIN/../lib' .`
  Empty output = pass. A hit is a finding unless it is a documented
  back-compat shim that only reads `GNUInstallDirs`. `DESTINATION lib`
  also matches `lib64`, `lib/…` and `libexec`, all of which are hard-coded
  directories.
- Severity: MUST.
- Floor: any.

**CMK-INST-10. Never write an absolute `DESTINATION` in `install()`.**
- Rationale: an absolute destination defeats `CMAKE_INSTALL_PREFIX`. With
  another prefix, install still writes the literal path and fails with
  "Maybe need administrative privileges". Only `DESTDIR` staging still
  works (measured).
- Verification, 4.4 and later: configure with
  `-Werror=install-absolute-destination`. A non-zero exit is the finding.
  The configure gate already does this on 4.4.2: `-Werror=author`, and
  `-Werror=dev` too, promote this child category of `CMD_AUTHOR` to an
  error (measured). On 3.31.12 and 4.3.4 all three flags are accepted
  silently and do nothing (measured), so every line also runs
  `grep -rnE --include='CMakeLists.txt' --include='*.cmake' -e 'DESTINATION[[:space:]]+"?/' -e 'DESTINATION[[:space:]]+"?\$\{CMAKE_INSTALL_PREFIX\}' .`
  Empty output = pass. The second pattern catches a destination built from
  `${CMAKE_INSTALL_PREFIX}`, which is absolute once expanded. The grep does
  not follow a variable: `set(D ${CMAKE_INSTALL_PREFIX}/…)` then
  `DESTINATION ${D}` gives no hit. The 4.4 diagnostic does fire on the
  expanded value, and on every line the CMK-INST-01 script's
  `cmake --install … --prefix "$W/prefix"` exits non-zero or leaks the
  configure-time prefix into step (a) (measured on 3.31.12, 4.3.4 and 4.4.2).
- Severity: MUST.
- Floor: the diagnostic `CMD_INSTALL_ABSOLUTE_DESTINATION` exists since 4.4
  and is ignored by default. The grep works on any version.

**CMK-INST-24. Never call `export(PACKAGE)`. To let another project use a
build tree without installing, point it at the `export(EXPORT)` file
through `<Pkg>_DIR` instead.**
- Rationale: whether the call writes depends on the project's floor, not on
  the CMake running it. Below 3.15, CMP0090 is unset, and the call writes
  `~/.cmake/packages/<Pkg>/<hash>` at configure time. That entry points
  into a build tree, and every later `find_package(<Pkg>)` on that machine
  may pick it up. Measured with a throwaway `HOME` on 3.31.12 and 4.4.2: a
  floor-3.5 fixture writes the entry, and so does rapidjson's real
  `CMakeLists.txt` (`Tencent__rapidjson@24b5e7a8b2:CMakeLists.txt:1,218`).
  With a floor of 3.15 or later, the default and `NEW` write nothing.
  `cmake_policy(SET CMP0090 OLD)` restores the write (measured in the
  dive), and so does `CMAKE_EXPORT_PACKAGE_REGISTRY=ON` (CMP0090 doc). Under the program's 3.25 floor the call is dead code, and on any
  older floor it has this side effect. A packager who must build such a
  project passes `-DCMAKE_EXPORT_NO_PACKAGE_REGISTRY=ON`, as vcpkg does
  (`microsoft__vcpkg@c4ee5a52d7:scripts/cmake/vcpkg_configure_cmake.cmake:205`).
  With a floor of 3.15 or later, `-DCMAKE_POLICY_DEFAULT_CMP0090=…` is
  reported as "not used", because the floor already set the policy.
- Verification:
  `grep -rniE --include='CMakeLists.txt' --include='*.cmake' -e 'export[[:space:]]*\([[:space:]]*package[[:space:])]' -e 'export[[:space:]]*\([[:space:]]*package$' .`
  Empty output = pass. The pattern stops at the word `PACKAGE`, so the
  4.3 build-tree CPS call `export(PACKAGE_INFO …)` is not a hit, and it
  allows a space before the parenthesis, as in gflags's opt-in
  `export (PACKAGE ${PACKAGE_NAME})`
  (`gflags__gflags@bdda022e7c:CMakeLists.txt:606`, floor 3.10).
- Severity: MUST.
- Floor: any. CMP0090 since 3.15.

#### Caught by inspecting the installed artefacts

**CMK-INST-11. For any installed executable or shared library that loads
another shared library from the same prefix, set `INSTALL_RPATH` to
`$ORIGIN/../${CMAKE_INSTALL_LIBDIR}` (`@loader_path/../…` on Apple) and
leave `BUILD_WITH_INSTALL_RPATH` off. The exception is a package that only
ever installs into a prefix on the loader's default path.**
- Rationale: at install time CMake prints "Set non-toolchain portion of
  runtime path … to """. The installed binary then has no RUNPATH and dies
  with "cannot open shared object file". With `$ORIGIN` it survives `mv`
  (measured on 4.4.2, Linux; the Apple spelling is documented, not
  measured). Never paper over this with `LD_LIBRARY_PATH`.
- Verification: `readelf -d "$W/moved/bin/app"`, then run the binary under
  `env -i PATH=/usr/bin:/bin` after the move. No RUNPATH, or a loader
  error, is the finding.
- Severity: SHOULD.
- Floor: any.

**CMK-INST-12. When shipping a pkg-config file, generate it with
`configure_file(… @ONLY)` from the same target data, install it to
`${CMAKE_INSTALL_LIBDIR}/pkgconfig` (use `DATADIR` for arch-independent
packages), and write `prefix=${pcfiledir}/<rel>`. Compute `<rel>` at
configure time with `file(RELATIVE_PATH)` from the pkgconfig directory to
the prefix, never as a hard-coded `../..`.**
- Rationale: a `${pcfiledir}`-relative `.pc` resolved correctly after the
  prefix moved (measured with pkg-config 2.3.0). A fixed `../..` is wrong
  for a three-level libdir. With
  `-DCMAKE_INSTALL_LIBDIR=lib/x86_64-linux-gnu` it resolves to
  `<prefix>/lib`, one level short. The computed form below writes
  `../../..` there and `../..` for `lib64`, and both resolve to the prefix
  (measured on 3.31.12 and 4.4.2 with pkg-config 2.3.0, dive §6). 0 of 12
  upstream `.pc.in` files use `${pcfiledir}`, and none computes the depth,
  so an existing absolute `prefix=` is not a MUST finding.

  ```cmake
  file(RELATIVE_PATH PC_PREFIX_RELPATH
    "${CMAKE_INSTALL_PREFIX}/${CMAKE_INSTALL_LIBDIR}/pkgconfig"
    "${CMAKE_INSTALL_PREFIX}")
  string(REGEX REPLACE "/$" "" PC_PREFIX_RELPATH "${PC_PREFIX_RELPATH}")
  # The .pc.in then says: prefix=${pcfiledir}/@PC_PREFIX_RELPATH@
  ```
- Verification: after the move, with `LIBDIR` set to the configured
  `CMAKE_INSTALL_LIBDIR` (`lib64` on this host, `lib/<tuple>` on Debian),
  `PKG_CONFIG_PATH="$W/moved/$LIBDIR/pkgconfig" pkg-config --variable=prefix "$PKG"`
  must print the moved prefix, after normalisation (measured on 3.31.12
  and 4.4.2: `…/moved/lib64/pkgconfig/../..`). pkg-config does not
  normalise the `..` segments, so resolve the printed path with `realpath`
  before comparing. Run it a second time with
  `-DCMAKE_INSTALL_LIBDIR=lib/x86_64-linux-gnu` to catch a hard-coded
  depth. For new files,
  `grep -rnF --include='*.pc.in' -e 'prefix=@CMAKE_INSTALL_PREFIX@' .`
  Empty output = pass.
- Severity: SHOULD.
- Floor: pkg-config's `pcfiledir`.

#### Caught by the CPS guard (CMake ≥ 4.3)

**CMK-INST-13. Never ship `install(PACKAGE_INFO)` without the paired
`install(EXPORT)` and Config package, and never enable it through a
retired experimental gate.**
- Rationale: CPS import exists only on 4.3 and later, so 3.x consumers
  cannot read a CPS-only package. The gates
  `CMAKE_EXPERIMENTAL_EXPORT_PACKAGE_INFO` and
  `CMAKE_EXPERIMENTAL_FIND_CPS_PACKAGES` were retired at 4.3.0
  (cps-verification Verdict; era re-check: unchanged).
- Verification:
  `grep -rn --include='CMakeLists.txt' --include='*.cmake' -e 'CMAKE_EXPERIMENTAL_EXPORT_PACKAGE_INFO' -e 'CMAKE_EXPERIMENTAL_FIND_CPS_PACKAGES' -e 'CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO' .`
  Empty output = pass. The last variable is for distributors only
  (cps-verification row 26). For CPS-only packages, reading heuristic:
  every file that `grep -rln -e 'install(PACKAGE_INFO' .` lists must belong
  to a project that also calls `install(EXPORT`.
- Severity: MUST.
- Floor: 4.3.

**CMK-INST-14. Beside an existing Config package, also emit CPS with
`install(PACKAGE_INFO <pkg> EXPORT <set> VERSION … COMPAT_VERSION …)`,
guarded by `if(CMAKE_VERSION VERSION_GREATER_EQUAL 4.3)`. Add it only after
CMK-INST-15 to -17 hold, and run the round trip on both 3.31 and ≥ 4.3.**
- Rationale: Kitware's recommendation is "in addition to" the Config
  package (cps-verification Verdict). On 4.3.4 and 4.4.2 `find_package`
  selects the `.cps` file over `depConfig.cmake` in the same prefix, with or
  without `CONFIG` (measured with `run-cps-order.sh`). CPS content therefore
  governs every consumer on 4.3 and later. 0 real adopters exist in the
  46-repo corpus.
- Verification: on the ≥ 4.3 run, the script's last line ends in
  `/cps/$PKG`. On 3.31 it ends in `/cmake/$PKG`. Both runs exit 0.
- Severity: SHOULD.
- Floor: 4.3. Measured on 4.3.4 and 4.4.2.

**CMK-INST-15. Before adding CPS, make the export `NAMESPACE` equal the
CPS package name (the first argument of `install(PACKAGE_INFO)`), exactly,
including case. To publish a target under another name, set its
`EXPORT_NAME`, never a different namespace.**
- Rationale: `install(PACKAGE_INFO dep)` over a set exported as `acme::`
  succeeds with no diagnostic. A consumer linking `acme::dep` then
  configures on 3.31.12, where the Config file wins, but fails on 4.3.4 and
  4.4.2, where the `.cps` wins and defines `dep::dep` instead (measured with
  `run-cps-namespace-consume.sh`). CPS never reads the `NAMESPACE`: over a
  `Dep::` export it still writes the component under package `dep`, and a
  consumer linking `Dep::dep` fails at Generate with "the target was not
  found" on 4.3.4 and 4.4.2. No case folding happens anywhere (dive §4).
  `EXPORT_NAME depimpl` gives `dep::depimpl` in the Config file and a
  `depimpl` component in the `.cps`, and a consumer of `dep::depimpl`
  builds on both lines (dive §5).
- Verification: the round trip on ≥ 4.3 with `TARGETS` set to the
  existing namespaced names. Before that, a reading check:
  `grep -rn --include='CMakeLists.txt' --include='*.cmake' -e 'install(PACKAGE_INFO' -e 'NAMESPACE' .`
  lists both spellings. A `PACKAGE_INFO` name that differs in any character,
  case included, from the `NAMESPACE` prefix of the export it names is the
  finding.
- Severity: MUST.
- Floor: 4.3.

**CMK-INST-16. On `install(PACKAGE_INFO)`, omit `VERSION_SCHEMA` or set it
to `simple`. Never use `custom`, `rpm`, `dpkg` or `pep440`.**
- Rationale: CMake writes any schema without validation. Its own
  `find_package` compares only `simple` by version order. `custom`, `rpm`,
  `dpkg` and `pep440` all behave alike: a request for exactly the version
  string (`1.2.0` against `1.2.0`) is accepted, and any other versioned
  request (`1.2` against `1.2.0`) is rejected (measured on 4.3.4 and 4.4.2;
  `find_package.rst` at 4.4.2 recognises only `simple` and `custom`, and
  says `custom` "must match exactly"). With a Config file also present, a
  rejected request silently falls through to it. That fall-through is what
  the dive misread as "Config wins".
- Verification:
  `grep -rn --include='CMakeLists.txt' --include='*.cmake' -e 'VERSION_SCHEMA' . | grep -v -e 'VERSION_SCHEMA simple'`
  Empty output = pass. A hit is a finding.
- Severity: MUST.
- Floor: 4.3.

**CMK-INST-17. A target exported through CPS carries only
configuration-dependent generator expressions in its `INTERFACE_*`
properties. Gate on the configure exit code as its own step.**
- Rationale: `$<COMPILE_LANGUAGE:C>` on `INTERFACE_COMPILE_DEFINITIONS` is
  a fatal configure error once `install(PACKAGE_INFO)` is present ("contains
  a generator expression. This is not allowed."). Yet `--build` and
  `--install` still exit 0, and they write a `.cps` with the property
  silently dropped (measured on 4.3.4 and 4.4.2). Because ≥ 4.3 consumers
  load that `.cps`, they lose the definition.
- Verification: `cmake -S … -B …` exits 0 with CPS enabled. A non-zero exit
  is the finding. Gate on the exit code, not on a log grep: CMake wraps the
  message across lines ("contains a" / "generator expression"), so a
  single-line grep for the phrase misses it (measured on 4.3.4 and 4.4.2).
- Severity: MUST.
- Floor: 4.3.

#### Caught by reading CI and helper modules

**CMK-INST-18. Keep the round trip in CI as its own step. That step
configures and builds a separate consumer against the just-installed
prefix, apart from the library's own tests.**
- Rationale: curl (`tests/cmake/test.sh`), yaml-cpp (`test/cmake`) and zlib
  (`contrib/minizip`) do this. libuv and cmake-init install but never
  consume the result (shape dive §13).
- Verification: reading heuristic. `grep -rn -e 'cmake --install' .github/workflows`
  lists the install steps. A second search,
  `grep -rn -e 'CMAKE_PREFIX_PATH' .github/workflows`, must show a
  consumer configure after each one. Empty output from the second search,
  with hits from the first, is the finding.
- Severity: SHOULD.
- Floor: any.

**CMK-INST-19. Generate the package in-tree with
`CMakePackageConfigHelpers`. Never do it through a packaging helper that
downloads code at configure time.**
- Rationale: cmake_template's `PackageProject.cmake` fetches two GitHub
  archives on every configure, with the direct `FetchContent_Populate(…
  URL …)` form, and delegates Config generation to a module it fetched.
  The cost is a network fetch on every configure and a packaging contract
  owned by a third party. CMP0169 (3.30) does *not* cover this form: it
  deprecates only the single-argument call with a declared name, and its
  doc says the full-details form "remains fully supported".
- Verification:
  `grep -rn --include='*.cmake' -e 'FetchContent_Populate(' -e 'file(DOWNLOAD' .`
  Read each hit. One inside an install or packaging helper is the finding.
- Severity: SHOULD.
- Floor: any.

**CMK-INST-20. For a new library whose floor is ≥ 3.23, consider installing
public headers with `target_sources(… FILE_SET HEADERS)` and
`install(TARGETS … FILE_SET HEADERS)`. Never convert an existing
`install(DIRECTORY)` unprompted.**
- Rationale: 0 of 14 flagship libraries use it, and fmt's only `FILE_SET` is
  for C++ modules. The mechanism is documented, but it is not practice.
- Verification: reading heuristic.
- Severity: CONSIDER.
- Floor: 3.23.

#### Read only: Windows DLL placement (no Windows host)

**CMK-INST-23. For a target that can be built `SHARED`, either give
`install(TARGETS)` no `RUNTIME` and no `ARCHIVE` destination, or name a
`RUNTIME DESTINATION` (`${CMAKE_INSTALL_BINDIR}`) whenever you name
`ARCHIVE`. Naming all three, as libuv and glfw do, is the clearest form.
Never rely on `LIBRARY DESTINATION` to place a Windows DLL.**
- Rationale: on DLL platforms the DLL is a `RUNTIME` artefact, and its
  import library is `ARCHIVE`. If either a `RUNTIME` or an `ARCHIVE`
  destination is given, "the other component is not installed"
  (`install.rst` at 4.4.2). So a Linux-shaped call with only `LIBRARY` and
  `ARCHIVE` ships no DLL on Windows. When neither a `RUNTIME` nor an
  `ARCHIVE` destination is given, which includes a `LIBRARY`-only call,
  both go to their `GNUInstallDirs` defaults (`bin`, `lib`); the same
  paragraph of `install.rst` says so. libuv
  (`libuv__libuv@abe835d413:CMakeLists.txt:814-817`) and glfw
  (`glfw__glfw@92dcf4ce74:src/CMakeLists.txt:340-344`) name all three. This
  is normative only: no Windows host exists to measure it. Third-party DLLs
  are a different question. For a self-contained application install,
  `install(TARGETS … RUNTIME_DEPENDENCY_SET <set>)` plus
  `install(RUNTIME_DEPENDENCY_SET <set> …)` (3.21) copies them. On Linux it
  copied `libbase.so` into `lib64`, and CMP0207 raised no warning under the
  configure gate on 3.31.12, 4.3.4 and 4.4.2 (`run-rtdeps-cmp0207.sh`). A
  library package consumed through Conan or vcpkg does not bundle its
  dependencies' DLLs; the manager places them. `$<TARGET_RUNTIME_DLLS>`
  (3.21) is a build-tree copy for tests and examples, not an install
  mechanism. It is empty on non-DLL platforms and an error on a target that
  is not an executable, `SHARED` or `MODULE` (generator-expressions manual
  at 4.4.2).
- Verification: reading heuristic.
  `grep -rn -A6 --include='CMakeLists.txt' --include='*.cmake' -e 'install(TARGETS' .`
  Read each hit. A call for a possibly-`SHARED` target that names
  `ARCHIVE DESTINATION` but no `RUNTIME DESTINATION` is the finding. A
  `LIBRARY`-only call is not.
- Severity: SHOULD. It rests on normative text only.
- Floor: any. `RUNTIME_DEPENDENCY_SET` and `$<TARGET_RUNTIME_DLLS>` since
  3.21, `$<TARGET_RUNTIME_DLL_DIRS>` since 3.27, CMP0207 since 4.3.

### CMK-TGT: targets and usage requirements (installable-library scope)

#### Caught by greps over a library's own non-test CMake files

**CMK-TGT-01. In every `target_link_libraries` call in an installable
library's own code, name `PUBLIC`, `PRIVATE` or `INTERFACE`. Default to
`PRIVATE` unless the dependency's types appear in the library's installed
headers.**
- Rationale: under the plain signature, "Library dependencies are
  transitive by default". Every private dependency then lands in the
  exported `INTERFACE_LINK_LIBRARIES` and needs a `find_dependency`
  (CMK-INST-03). The doc does not deprecate the keyword-less signature. It
  calls the `LINK_PUBLIC`/`LINK_PRIVATE` and `LINK_INTERFACE_LIBRARIES`
  legacy signatures "for compatibility only" (`target_link_libraries` doc
  at 4.4.2). The MUST rests on the transitive default. Bare calls are
  13.3 % of a repo's core code and 32.0 % of its test and example code.
- Verification: a multi-line scan, `usage-requirements-in-the-wild` §1's
  parser. Fix its bracket-comment and quote handling before trusting its
  counts. Spot check:
  `grep -rn -A2 --include='CMakeLists.txt' --include='*.cmake' -e 'target_link_libraries[[:space:]]*(' .`
  Read each hit. A call whose second token is not a keyword is the finding.
  The `[[:space:]]*` admits `target_link_libraries (`, which Kitware's own
  tree writes 194 times.
- Severity: MUST for library targets; SHOULD for test and example targets.
- Floor: keywords since 2.8.12.

**CMK-TGT-02. Give every installable library target a namespaced `ALIAS`
that matches its exported name (`add_library(Pkg::lib ALIAS lib)`), and
link through the alias inside the build.**
- Rationale: build-tree consumers (`add_subdirectory`, FetchContent) then
  spell the same name as install-tree consumers, and CMP0028 catches typos.
  Only 245 of 446 corpus aliases are namespaced.
- Verification: reading heuristic. Each `NAMESPACE X::` export has a
  matching `add_library(X::… ALIAS …)`.
- Severity: SHOULD.
- Floor: any.

**CMK-TGT-03. In a library you author or modernise, use the `target_*`
command instead of `include_directories`, `add_definitions`,
`add_compile_options`, `link_directories` or `link_libraries`. In an
untouched legacy tree, flag these; do not auto-rewrite them.**
- Rationale: directory scope leaks into sibling targets and into
  `add_subdirectory` code. It does not reach install-tree consumers,
  because only `INTERFACE_*` properties export. Hence SHOULD. The calls
  cluster in llvm-project and in vcpkg port recipes.
- Verification:
  `grep -rnE --include='CMakeLists.txt' --include='*.cmake' -e '^[[:space:]]*include_directories\(' -e '^[[:space:]]*add_definitions\(' -e '^[[:space:]]*add_compile_options\(' -e '^[[:space:]]*link_directories\(' -e '^[[:space:]]*link_libraries\(' .`
  Empty output = pass.
- Severity: SHOULD.
- Floor: any.

**CMK-TGT-04. Never `set()` or `string(APPEND)` `CMAKE_C_FLAGS` or
`CMAKE_CXX_FLAGS` in a library's CMake files. Use `target_compile_options`.
Global flags belong in a toolchain file, a preset or a manager profile.**
- Rationale: the variable is inherited by every subdirectory, including
  fetched dependencies. It overrides what a Conan or vcpkg toolchain
  injected, and it hard-codes one compiler's spelling. Seven repos carry
  90 % of the 434 non-toolchain hits.
- Verification:
  `grep -rn --include='CMakeLists.txt' --include='*.cmake' -e 'set(CMAKE_CXX_FLAGS' -e 'set(CMAKE_C_FLAGS' -e 'string(APPEND CMAKE_CXX_FLAGS' -e 'string(APPEND CMAKE_C_FLAGS' . | grep -v -e 'toolchain'`
  Empty output = pass.
- Severity: SHOULD.
- Floor: any.

**CMK-TGT-05. State an installable library's minimum language standard as
`target_compile_features(<t> PUBLIC cxx_std_NN)`. Never set
`CMAKE_CXX_STANDARD` in its CMake files except behind a top-level guard
(`PROJECT_IS_TOP_LEVEL`, or `NOT DEFINED CMAKE_CXX_STANDARD`).**
- Rationale: `target_compile_features` fills `INTERFACE_COMPILE_FEATURES`,
  which exports and propagates. `CMAKE_CXX_STANDARD` is a build
  specification that does not export. A normal `set()` also shadows the
  value a Conan profile's `compiler.cppstd` passes in through the toolchain
  (topic map, conflict 11). fmt, Catch2, nlohmann/json, googletest and
  protobuf follow this rule.
- Verification:
  `grep -rn --include='CMakeLists.txt' --include='*.cmake' -e 'CMAKE_CXX_STANDARD' .`
  Read each hit. One outside the top-level project, a preset or a
  toolchain, and without a guard, is the finding.
- Severity: MUST.
- Floor: `cxx_std_17` since 3.8, 20 since 3.12, 23 since 3.20, 26 since
  3.30. `CXX_STANDARD 26` is accepted from 3.25, but the `cxx_std_26`
  compile feature needs 3.30 (`CMAKE_CXX_KNOWN_FEATURES` at 4.4.2 and
  3.31.12), so it carries a gate under the 3.25 floor.

**CMK-TGT-06. Wherever `CMAKE_CXX_STANDARD` is set (a top level, a preset),
also set `CMAKE_CXX_STANDARD_REQUIRED ON`.**
- Rationale: otherwise the standard "is treated as optional and may
  'decay' to a previous standard" (`CXX_STANDARD_REQUIRED` doc at 4.4.2).
  Only 43 of 136 setter files pair it.
- Verification:
  `grep -rlE --include='CMakeLists.txt' --include='*.cmake' -e 'set[[:space:]]*\(CMAKE_CXX_STANDARD[[:space:]]' . | xargs -r grep -L -e 'CMAKE_CXX_STANDARD_REQUIRED'`
  Empty output = pass. Each file listed is a finding. The `[[:space:]]*`
  admits `set (CMAKE_CXX_STANDARD …)`. Without it the pipeline missed 10
  unpaired setter files in ClickHouse's `contrib/` and Hunter's
  `examples/`.
- Severity: MUST.
- Floor: 3.1.

**CMK-TGT-07. Beside `CMAKE_CXX_STANDARD`, set `CMAKE_CXX_EXTENSIONS OFF`.
The variable is `CMAKE_CXX_EXTENSIONS`. `CMAKE_CXX_STANDARD_EXTENSIONS`
does not exist.**
- Rationale: extensions default to ON, which gives `-std=gnu++NN`. The
  switch is set OFF on 34 lines in 17 repos (measured). A wrong name is a
  silent no-op.
- Verification: the same pipeline as CMK-TGT-06, with
  `-e 'CMAKE_CXX_EXTENSIONS'` as the `-L` pattern. For a wrong name,
  `grep -rn -e 'CMAKE_CXX_STANDARD_EXTENSIONS' .`
  Empty output = pass.
- Severity: SHOULD.
- Floor: 3.1.

**CMK-TGT-08. List target sources explicitly. `file(GLOB)` or
`GLOB_RECURSE` feeding `add_library`, `add_executable` or `target_sources`
is a finding. `CONFIGURE_DEPENDS` mitigates it but does not fix it.**
- Rationale: `file.rst` at 4.4.2 says "We do not recommend using GLOB to
  collect a list of source files" and that `CONFIGURE_DEPENDS` "may not work
  reliably on all generators". Adoption of `CONFIGURE_DEPENDS` is 2.9 %.
- Verification:
  `grep -rn --include='CMakeLists.txt' --include='*.cmake' -e 'file(GLOB' .`
  Read each hit. The same-file dataflow check can prove that a glob feeds a
  target, but never that it does not.
- Severity: SHOULD.
- Floor: `CONFIGURE_DEPENDS` since 3.12.

**CMK-TGT-09. Never put an unconditional literal `-Werror` or `/WX` in an
installable library. Warnings-as-errors comes from
`CMAKE_COMPILE_WARNING_AS_ERROR` in a preset or CI, or from a developer
option that defaults OFF.**
- Rationale: `cmake --compile-no-warning-as-error` (3.24) lets a packager
  disable the property, but it cannot remove a literal flag. The corpus
  "violators" are all opt-in: Catch2 gates the flag on
  `CATCH_DEVELOPMENT_BUILD`, and spdlog's `SPDLOG_BUILD_WARNINGS` is OFF.
  That is the sanctioned shape.
- Verification:
  `grep -rn --include='CMakeLists.txt' --include='*.cmake' -e '-Werror' -e '/WX' .`
  A hit outside a default-OFF developer option is the finding. Report
  `-Werror=<category>` separately.
- Severity: MUST.
- Floor: 3.24, for both the variable and the CLI override.

Not given IDs here, and handed off: the CMK-LANG rows this group's dive
measured (M-C-03, M-C-07, M-C-09), with their false-positive rates. See Open
questions. M-E-06 (`PROJECT_IS_TOP_LEVEL` gating) is measured in the
dependency-seam group. M-E-07/08/09/12-17 are wave-3 `targets-and-abi`.
Wave 3 `install-edges` placed M-F-08 in CMK-INST-23 and M-F-18 in
CMK-INST-24. M-F-13 stays with the CMK-INST-13 grep. M-F-17 (CPack) and
M-F-19 (SBOM) are deferred by the topic map, since no measured failure
depends on them. Components and a
`<name>_INSTALL_CMAKEDIR` cache variable (M-F-15) were dropped: they appear
only in templates (cmake-init) and in one flagship library's cache variable
(yaml-cpp), and no measured failure depends on them.

## Applied to find_ocx and the exemplars

| Rule | Satisfied by | Violated by | find_ocx |
|---|---|---|---|
| INST-01, INST-18 | `curl__curl@98519dac83:.github/workflows/distcheck.yml:319-374`; `jbeder__yaml-cpp@1e0876c671:.github/workflows/build.yml:91-103`; `madler__zlib@767c4c9478:.github/workflows/contribs.yml:88-96` | `libuv__libuv@abe835d413:.github/workflows/CI-sample.yml:1-30` (only a subproject build); `friendlyanon__cmake-init@7e0c52fc73:.github/workflows/ci.yml:113-120` (installs, never consumes) | n/a: installs nothing |
| INST-02 | 13 of 14 flagship libraries; `nlohmann__json@f422b753cc:CMakeLists.txt:78` | `Tencent__rapidjson@24b5e7a8b2:CMakeLists.txt:233,256` (measured non-relocatable on 4.4.2) | n/a |
| INST-03 | `curl__curl@98519dac83:CMake/curl-config.in.cmake:34-147` (guarded model) | `gabime__spdlog@5b63780337:cmake/spdlogConfig.cmake.in:6` (raw `find_package(Threads REQUIRED)`); `apache__arrow@3ad410b7b1:cpp/src/arrow/arrow-config.cmake:19` (untemplated compatibility shim) | n/a |
| INST-04 | 12 of 14 call `write_basic_package_version_file` | `Tencent__rapidjson@24b5e7a8b2:RapidJSONConfigVersion.cmake.in:1-9` and gflags (hand-rolled files; version file present, no mode discipline) | n/a |
| INST-05 | nlohmann/json, cmake-init (no path arithmetic); `gflags__gflags@bdda022e7c:CMakeLists.txt:526-527` (relative computation) | `Tencent__rapidjson@24b5e7a8b2:RapidJSONConfig.cmake.in:1` (`@PACKAGE_INIT@` through `configure_file`) | n/a |
| INST-06 | 12 of 14 | `glfw__glfw@92dcf4ce74:CMakeLists.txt:119-121`; `Tencent__rapidjson@24b5e7a8b2:CMakeLists.txt:256` | satisfies the intent: `Findocx.cmake:84-88` creates the namespaced `ocx::ocx` imported target, guarded by `NOT TARGET` |
| INST-09 | 12 of 14 include `GNUInstallDirs` | `gflags__gflags@bdda022e7c:CMakeLists.txt:68,435-438` (`LIB_SUFFIX`, `LIB_INSTALL_DIR`); `Tencent__rapidjson@24b5e7a8b2:CMakeLists.txt:147-149` | n/a |
| INST-10 | 0 real violations in curl, openssl, protobuf, grpc and qtbase | none; the one qtbase hit is `qt_add_wasm_preload`, not `install()` | n/a |
| INST-11 | `apache__arrow@3ad410b7b1:cpp/cmake_modules/BuildUtils.cmake:410-417` (`$ORIGIN` and `@loader_path`) | most of the corpus sets no install RPATH (`CMAKE_INSTALL_RPATH` 33 occurrences corpus-wide) | n/a |
| INST-12 | only vcpkg's own port templates (16 of 79 `.pc.in`) | not a violation: every upstream `.pc.in` sampled bakes `prefix=@CMAKE_INSTALL_PREFIX@` or an equivalent | n/a |
| INST-13 to 17 | Kitware's own tests only | 0 real adopters; none to violate | n/a |
| INST-19 | 13 of 14 | `cpp-best-practices__cmake_template@b86318abbf:cmake/PackageProject.cmake:158,179` | n/a |
| INST-21, INST-22 | `fmtlib__fmt@522e2c12ab:CMakeLists.txt:112,271`; `jbeder__yaml-cpp@1e0876c671:CMakeLists.txt:123-124` (debug postfix) | scratch fixture only; no flagship multi-config install was run | n/a: installs nothing |
| INST-23 | `libuv__libuv@abe835d413:CMakeLists.txt:814-817`; `glfw__glfw@92dcf4ce74:src/CMakeLists.txt:340-344` | not scanned corpus-wide; the check is a multi-line read | n/a |
| INST-24 | `apache__arrow@3ad410b7b1:cpp/CMakeLists.txt:66` (a comment noting the call does nothing by default; no call) | `Tencent__rapidjson@24b5e7a8b2:CMakeLists.txt:218` (measured writing the registry on 3.31.12 and 4.4.2); `gflags__gflags@bdda022e7c:CMakeLists.txt:606` (opt-in `REGISTER_BUILD_DIR`, default OFF); 6 vcpkg port `CMakeLists.txt` files | vacuous: no `export()` call |
| TGT-01 | `ClickHouse__ClickHouse@0995a518a8:CMakeLists.txt:848` (0.8 % bare in core); qtbase 3.7 % | `libuv__libuv@abe835d413:CMakeLists.txt:477,494` (9 of 9 core calls bare); duckdb 23 of 30; `Kitware__CMake@e8befb989b:Source/kwsys/CMakeLists.txt:766` | vacuous: 0 calls |
| TGT-05 | fmt, Catch2, nlohmann/json, googletest, protobuf (`target_compile_features`, no variable) | no flagship library sets the variable below its top level; vcpkg ports hold 71 of 228 setters | vacuous: `LANGUAGES NONE` |
| TGT-06 | 43 of 136 setter files | 93 of 136 setter files lack `_REQUIRED` | vacuous |
| TGT-09 | `catchorg__Catch2@222e233903:CMakeLists.txt:25` and `gabime__spdlog@5b63780337:CMakeLists.txt:93` (opt-in, default OFF) | no unconditional flagship hit found in the re-read sample | vacuous |

**The new commitment for find_ocx (measured, `run-root-langnone.sh`).** This
applies to `ocx_package(… PULL)`, which exports `<NAME>_ROOT`
(`ocx.cmake:1199-1202`). A later `find_package(<name> CONFIG)` from a
`project(… LANGUAGES NONE)` project does **not** find a Config package
installed under `lib64/cmake/<name>`. That holds even when `<name>_ROOT`
points at the prefix: `base_FOUND=0` on 3.31.12 and on 4.4.2. The identical
project with `LANGUAGES C` finds it. Every find_ocx example and fixture that
pulls a package declares `LANGUAGES NONE`
(`examples/package/CMakeLists.txt:13`, `tests/fixtures/package/CMakeLists.txt:10`).
The packages they pull today are programs (`jq`), which stay findable. A
provisioned compiled library laid out under `lib64` would not be. Under the
owner's default for question 2, no issue is filed. This goes into the
handoff note as a documentation caveat for the `PULL` example: enable a
compiled language before `find_package`.

## AI-agent failure modes

The list is ranked by how often each one bites, weighted by corpus frequency
and by how silent the failure is.

1. **Taking a green build and install as proof the package can be
   consumed.** Two measured cases are green upstream and broken downstream:
   a missing `find_dependency`, and a CPS property dropped during an
   ignored failed configure. *Check:* the CMK-INST-01 script, with
   configure gated as its own step.
2. **Writing bare `target_link_libraries(t a b)`.** It is still the dominant
   tutorial form, and CMake accepts it silently. *Check:* CMK-TGT-01's grep.
   Read the token after the target.
3. **Putting `set(CMAKE_CXX_STANDARD 17)` in a library.** Agents omit
   `_REQUIRED`, or invent `CMAKE_CXX_STANDARD_EXTENSIONS`. This program's
   own dive grepped that nonexistent name and reported "0/46 adoption".
   *Check:* `cmake --help-variable NAME` must succeed for every
   `CMAKE_`-prefixed variable an agent writes, plus CMK-TGT-05/06/07's
   greps.
4. **Fixing relocation in the wrong place.** The agent edits
   `$<INSTALL_INTERFACE:…>` because `cmake-packages(7)` shows it, and leaves
   an absolute `install(EXPORT … DESTINATION)`. *Check:* step (b) of the
   script (`set(_IMPORT_PREFIX "/`).
5. **Writing `LIB_SUFFIX`, a literal `lib`, or `$ORIGIN/../lib`.** These are
   "the lib64 fix" of older answers, and exactly what Fedora 45 stopped
   injecting. *Check:* CMK-INST-09's grep.
6. **Using raw `find_package(X REQUIRED)` in a Config template.** spdlog does
   this on one line and gets it right two lines later, so copying from a
   real project is a coin flip. *Check:* CMK-INST-03's grep.
7. **Adding `LD_LIBRARY_PATH` to a run script instead of `INSTALL_RPATH`.**
   *Check:* `readelf -d` on the *installed* binary after the move.
8. **Getting CPS wrong in one of two directions.** Either agents ignore it
   (pre-2026 training data) or treat it as a replacement: shipping CPS-only,
   leaving a retired `CMAKE_EXPERIMENTAL_*` gate, copying `VERSION_SCHEMA
   rpm` from distro packaging, or adding CPS to a `Vendor::` namespace
   (a case-only difference such as `Dep::` over `dep` breaks too, and
   nothing logs why). *Check:* CMK-INST-13/15/16 greps, plus the round trip
   on ≥ 4.3 showing `/cps/` in `<pkg>_DIR`. When a ≥ 4.3 consumer reports
   "target was not found", read the `.cps` file's `components` keys.
9. **Trusting `-Werror=install-absolute-destination` on a 3.x or 4.3 CI
   leg.** It is accepted silently and does nothing there. *Check:*
   CMK-INST-10's grep on every line.
10. **Writing a `LANGUAGES NONE` orchestrator that calls
    `find_package(CONFIG)`.** It cannot see `lib64`, even through
    `<Pkg>_ROOT`. *Check:* `--debug-find-pkg=NAME`. No `lib64` candidate
    appearing in the list is the finding.
11. **Vendoring a "best practices" packaging helper wholesale.** *Check:*
    CMK-INST-19's grep.
12. **Converting `install(DIRECTORY)` to `FILE_SET HEADERS` unprompted, or
    emitting `export(PACKAGE)`.** The latter is a registry write that is
    off by default only when the project's floor is 3.15 or later
    (CMP0090). rapidjson's floor is 3.5, so its call at
    `CMakeLists.txt:218` still writes `~/.cmake/packages` on 3.31.12 and
    4.4.2 (measured). *Check:* the diff review names CMK-INST-20. For the
    registry write, CMK-INST-24's grep.
13. **Adding `-G "Ninja Multi-Config"` and declaring victory when
    `--build --config Release` exits 0.** A shared file name makes the two
    installs overwrite each other, silently. *Check:* the CMK-INST-22 leg,
    step (d).
14. **Expecting CMake to refuse a configuration missing from the install,
    or forcing that with an empty `CMAKE_MAP_IMPORTED_CONFIG_<CONFIG>`.**
    The default borrows another configuration. The empty map also rejects
    configurations that are installed. *Check:* the map pinned to the
    configuration itself, as in step (e).
15. **Reaching for `-DCMAKE_POLICY_DEFAULT_CMP0090` to stop someone else's
    registry write.** With a floor of 3.15 or later there is nothing to
    stop, and CMake reports the variable as "not used". *Check:* pass
    `-DCMAKE_EXPORT_NO_PACKAGE_REGISTRY=ON`, as vcpkg does.

## Open questions

**Owner decisions** (defaults apply if unanswered):

1. Should the three silent CPS export gaps be reported to Kitware? The
   gaps: `install(PACKAGE_INFO)` accepts a namespace mismatch, case-only
   included, with no diagnostic and breaks ≥ 4.3 consumers. It writes
   `custom`, `rpm`, `dpkg` and `pep440` schemas that its own `find_package`
   compares only by exact string. And it bakes each dependency's absolute
   `<dep>_DIR` into `requires.<dep>.hints`. That is an external action.
   *Default:* no report. The rules guard the first two, and the third is
   documented in Verdict 10.
2. Should CMK-INST-18 (round trip in CI) be MUST for any library that claims
   to be consumable? *Default:* SHOULD, because 3 of 5 traced flagships do
   it and the evidence is measured need, not normative text.
3. The find_ocx `LANGUAGES NONE` plus `PULL` caveat. *Default:* it goes in
   the handoff note, and no issue is filed (owner question 2).

**Another research round**, with each question tied to its subarea:

- **dependency-seam (CMK-DEP), `LANGUAGES NONE`:** the measured blindness to
  `lib64`, `lib32` and `lib/<arch>`, including through `<Pkg>_ROOT` on
  3.31.12 and 4.4.2, needs a CMK-DEP row. This group has no ID for it.
- **Windows host (CMK-INST-23):** measure on a real Windows runner that a
  `LIBRARY`+`ARCHIVE`-only `install(TARGETS)` ships no DLL. Measure also
  whether CMP0207, unset under the 3.25 floor, warns (and so fails the
  configure gate) for `install(RUNTIME_DEPENDENCY_SET)` filters on
  Windows paths. Run the multi-config leg with the Visual Studio generator
  and MSVC's debug CRT.
- **CPS `hints` under a package manager (CMK-VCPKG, CMK-CONAN):** vcpkg's
  and Conan's relocation fix-ups rewrite `*Targets.cmake`. Does either one
  touch the absolute `requires.<dep>.hints` in a `.cps` file? And does a
  stale hint ever win once the consumer's own search misses the
  dependency?
- **language (CMK-LANG):** the parser behind the M-C-03 counts needs
  bracket-comment and quote-aware parenthesis fixes before any count becomes
  a threshold. M-C-07's grep had a 100 % false-positive rate (0 real
  instances), so ship it as a reading heuristic at most. M-C-09's option
  prefix check needs per-sub-project prefixes for monorepos.

## Sub-artifacts

- [install-round-trip-and-cps.md](cmake-consumable-library/install-round-trip-and-cps.md):
  measured install → export → consume on 3.31.12, 4.3.4 and 4.4.2. Covers
  missing `find_dependency`, RPATH stripping, absolute `DESTINATION`, CPS
  write locations and schemas, the genex drop, `pkg-config` relocation, and
  the `LANGUAGES NONE` surprise. Its §7 "Config beats CPS" is refuted above.
- [consumable-library-shape.md](cmake-consumable-library/consumable-library-shape.md):
  the install and export surface of 14 flagship libraries plus two
  templates. Covers rapidjson's measured non-relocatable package and its
  root cause, the namespace and version-file tables, `.pc` practice, and
  the CI round trips traced (3 of 5).
- [usage-requirements-in-the-wild.md](cmake-consumable-library/usage-requirements-in-the-wild.md):
  per-repo and per-bucket target-usage counts with a multi-line parser.
  Covers the 13.3 % core bare-link rate, flags and standard setters, GLOB,
  `-Werror`, and the CMK-LANG false-positive ledger. Its `_EXTENSIONS`
  finding is refuted above.
- [install-edges-and-multiconfig.md](cmake-consumable-library/install-edges-and-multiconfig.md):
  wave 3, measured on 3.31.12, 4.3.4 and 4.4.2. Covers the Ninja
  Multi-Config round trip and the shared-file-name overwrite, per-config
  CPS files (`<pkg>@<config>.cps`), the absolute CPS `hints`, the silent
  configuration fallback, CPS naming by case and by `EXPORT_NAME`, and
  pkg-config multiarch depth. It also covers `export(PACKAGE)` under
  CMP0090, and it reads the Windows DLL sources. Three of its claims are
  refuted above. The empty `MAP_IMPORTED_CONFIG` rejects installed
  configurations too. rapidjson's `export(PACKAGE)` is not a no-op. The
  configuration fallback is documented. Its candidate 9 (a `POST_BUILD`
  copy as the Windows install fix) is replaced by CMK-INST-23.

## Key sources

1. Measurement: `run-cps-order.sh`. CPS is selected over Config on 4.3.4 and
   4.4.2 with the default schema (`dep_DIR=…/lib64/cps/dep`, consumer prints
   `43`).
2. Measurement: `run-cps-namespace-consume.sh`. A mismatched namespace plus
   CPS works on 3.31.12 and fails on 4.3.4 and 4.4.2.
3. Measurement: `run-nover.sh`. With no ConfigVersion file, the result is
   "version: unknown" on 3.31.12 and 4.4.2.
4. Measurement: `run-root-langnone.sh`. `<Pkg>_ROOT` under `LANGUAGES NONE`
   misses `lib64` on 3.31.12 and 4.4.2.
5. Measurement: install-round-trip §2 (missing `find_dependency`, downstream
   only), §3 (RPATH stripped), §5 (the absolute-destination diagnostic is
   4.4-only), §6 (rpm schema and genex drop).
6. Measurement: consumable-library-shape §7 (a relative `install(EXPORT)`
   destination is the relocation discriminator; rapidjson against
   nlohmann/json).
7. [Help/manual/cmake-packages.7.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/cmake-packages.7.rst):
   `find_dependency` and the relocatable-package example that omits the
   export destination.
8. [Help/command/install.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/install.rst)
   and [find_package.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/find_package.rst):
   `PACKAGE_INFO`, the genex limit, CPS preference, and the language-gated
   `lib*` search.
9. [Modules/CMakePackageConfigHelpers.cmake @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Modules/CMakePackageConfigHelpers.cmake):
   `PACKAGE_INIT` is defined only by `configure_package_config_file`.
10. `cmake --help-command target_link_libraries`,
    `--help-property CXX_STANDARD_REQUIRED`, `--help-policy CMP0028` and
    `--help-variable CMAKE_CXX_STANDARD_EXTENSIONS` (the last is rejected)
    on 4.4.2 and 3.31.12, 2026-09-26.
11. [Fedora Changes/CMake_drop_install_vars](https://fedoraproject.org/wiki/Changes/CMake_drop_install_vars):
    Fedora 45; updated 2026-03-10.
12. [cmake-dependency-seam/cps-verification.md](cmake-dependency-seam/cps-verification.md):
    rows 14, 19, 21, 22, 26 and 52, and the Verdict (CPS SHOULD, in
    addition).
13. [CMake issue #26410](https://gitlab.kitware.com/cmake/cmake/-/issues/26410):
    the mixed CPS and Config directory case, reproduced.
14. [Effective Modern CMake](https://gist.github.com/mbinna/c61dbb39bca0e4fb7d1f73b0d66a4fd1):
    the codified source for CMK-TGT-03, -04 and -08.
15. [cmake-consumable-library/verification-wave2.md](cmake-consumable-library/verification-wave2.md):
    the verify-wave-2 ledger (opus, 2026-09-26) behind the revision log.
20. [cmake-consumable-library/verification-wave3.md](cmake-consumable-library/verification-wave3.md):
    the verify-wave-3 ledger (opus, 2026-09-26), with independent fixtures
    re-run on 3.31.12, 4.3.4 and 4.4.2.
16. Measurement: `run-multiconfig-postfix.sh` and `run-map-variants.sh`
    (3.31.12, 4.4.2, Ninja Multi-Config). These cover the shared-name
    overwrite, the step (d) scan, `CMAKE_DEBUG_POSTFIX`, the silent
    fallback, and self-map against empty map.
17. Measurement: `run-export-package-floor.sh`. A floor-3.5 fixture and
    rapidjson's real `CMakeLists.txt` write `~/.cmake/packages` on 3.31.12
    and 4.4.2.
18. Measurement: `run-cps-hints.sh` (4.3.4, 4.4.2) shows the absolute
    `hints` and when step (a) sees it. `run-rtdeps-cmp0207.sh` (3.31.12,
    4.3.4, 4.4.2) shows `RUNTIME_DEPENDENCY_SET` on Linux under the
    configure gate.
19. `cmake --help-property IMPORTED_LOCATION` and
    `--help-property MAP_IMPORTED_CONFIG_<CONFIG>`, plus
    `--help-command install`, `--help-manual cmake-generator-expressions`
    and `--help-policy CMP0207`, all on 4.4.2, 2026-09-26. They cover the
    documented fallback, the empty-element meaning, DLLs as `RUNTIME`
    artefacts, `TARGET_RUNTIME_DLLS` 3.21 and `TARGET_RUNTIME_DLL_DIRS`
    3.27.

## Revision log

- verify wave 2 (2026-09-26): CMK-INST-16 and Verdict 4: `custom` moved from
  allowed to forbidden, and "rejects even an exact match" corrected. All four
  non-`simple` schemas accept an exact version string and reject any other
  versioned request (measured on 4.3.4 and 4.4.2). The grep now flags any
  schema other than `simple`. Open question 1 was reworded to match.
- verify wave 2: CMK-INST-19 rationale and floor. CMP0169 deprecates only the
  single-argument `FetchContent_Populate(<name>)`. The direct URL form is
  "fully supported" (`--help-policy CMP0169` on 3.31.12 and 4.4.2). Floor is
  now "any".
- verify wave 2: CMK-TGT-05 floor. `cxx_std_26` has been available since 3.30,
  not 3.25; 3.25 added only `CXX_STANDARD 26`.
- verify wave 2: CMK-INST-05 floor. `configure_package_config_file` exists
  since 2.8.8 (`Modules/CMakePackageConfigHelpers.cmake` at v2.8.8), not
  2.8.12. The grep adds `--include='*.in.cmake'`, because it missed curl's
  template.
- verify wave 2: CMK-INST-03 grep. `*-config.cmake.in` was replaced with
  `*config.cmake.in`. The old globs missed nlohmann/json's and gflags's
  `cmake/config.cmake.in`, 8 of 163 corpus Config templates.
- verify wave 2: CMK-INST-09 grep. `DESTINATION lib64` became
  `DESTINATION lib` plus `DESTINATION "lib`, and `ORIGIN/../lib"` became
  `ORIGIN/../lib`. The old grep missed a planted `install(TARGETS … DESTINATION lib)`.
- verify wave 2: CMK-INST-10 grep. It adds a `${CMAKE_INSTALL_PREFIX}`
  destination pattern, which the old grep missed. The rule now notes that on
  4.4.2 `-Werror=author` and `-Werror=dev` already fail an absolute
  destination (measured).
- verify wave 2: CMK-INST-12 verification. The `lib64` path was replaced with
  the configured libdir, so the check does not fail on Debian multiarch
  layouts.
- verify wave 2: CMK-INST-17 verification. Gate on the exit code only. The
  error message wraps across lines, so a one-line log grep misses it.
- wave 3 revision (2026-09-26): new CMK-INST-21 (MUST). The rule requires
  distinct per-config file names when several configurations share a
  prefix. The multi-config overwrite was measured on 3.31.12 and 4.4.2. The
  dive's md5 check is replaced by a static duplicate-location scan over
  `<set>-<config>.cmake`, which was measured to fire and to go quiet.
- wave 3 revision: new CMK-INST-22 (SHOULD), the multi-config leg. The
  dive's candidate 3 used an **empty** `CMAKE_MAP_IMPORTED_CONFIG_<CONFIG>`.
  That is refuted: it also rejects configurations that are installed
  (measured, 3.31.12 and 4.4.2). The leg pins the map to the configuration
  itself instead.
- wave 3 revision: new CMK-INST-23 (SHOULD, normative only). It covers
  M-F-08. The dive's candidate 9 (a `POST_BUILD` `$<TARGET_RUNTIME_DLLS>`
  copy) was a build-tree mechanism. It is replaced by the `install.rst` rule
  that a DLL is a `RUNTIME` artefact. `RUNTIME_DEPENDENCY_SET` is kept as
  the self-contained-application note, measured on Linux only.
- wave 3 revision: new CMK-INST-24 (MUST), which covers M-F-18. The dive
  said rapidjson's `export(PACKAGE)` is a no-op. That is refuted: rapidjson's
  floor is 3.5, and it writes the user registry on 3.31.12 and 4.4.2
  (measured). The dive's `CMAKE_POLICY_DEFAULT_CMP0090` candidate 7 is
  folded in as failure mode 15, not made a rule.
- wave 3 revision: CMK-INST-15 text changed in place. "Exactly" now says
  "including case", and it names the `PACKAGE_INFO` argument. The rule adds
  `EXPORT_NAME` as the safe rename, with a reading check. The reason: CPS
  never reads `NAMESPACE`, and `EXPORT_NAME` is honoured by both generators
  (dive §4 and §5, 4.3.4 and 4.4.2). Verdict 4 was updated to match.
- wave 3 revision: CMK-INST-12's multiarch claim moved from derived to
  measured (dive §6). The `file(RELATIVE_PATH)` snippet, a `realpath` note
  and a `lib/x86_64-linux-gnu` verification run were added. Severity stays
  SHOULD.
- wave 3 revision: CMK-INST-01 gained notes on the CPS `hints` path and
  on step (a). Step (a) is unchanged. It flags the hint only when a
  dependency lives inside the tree under test, which is a true finding
  (`run-cps-hints.sh`). This resolves the apparent clash between
  CMK-INST-14 and step (a).
- wave 3 revision: Verdict items 8 to 10 were added. Item 10 documents three
  gaps: Windows unmeasured, the absolute CPS `hints`, and the scan's blind
  spot. The dive called the configuration fallback "undocumented". That is
  corrected: the `IMPORTED_LOCATION` doc allows it. The dive also said the
  error surfaces "in a later Generate step for multi-config". That is
  corrected too: `cmake -S -B` exits 1.
- wave 3 revision: Open questions. The install-edges, CPS-naming and
  pkg-config items were removed, because this round answered them. The PIC
  item was removed, because
  `cmake-targets-and-abi/shared-static-visibility-pic.md` §2 supplies the
  unconfounded measurement. The Windows-host and CPS-`hints`-under-a-manager
  items were added. Owner question 1 now names the `hints` gap.
- wave 3 revision: failure mode 12 was corrected ("off by default since
  3.15" was true only for floors of 3.15 or later), and failure modes 13
  to 15 were added.
- wave 3 revision: the dive's candidate 10 (the CMP0207 `[\\/]` filter
  regex) is not adopted, because it describes a smell, not a defect. The
  CMP0207 warning did not fire on Linux under the gate (measured).
- verify wave 3 (2026-09-26): CMK-INST-01 and CMK-INST-22 scripts. The
  placeholder line `PKG=example … SRC=/abs/path/to/project` overwrote the
  values the comment said the caller sets. Both scripts now require the
  exported variables with `: "${PKG:?}" …`.
- verify wave 3: CMK-INST-03 grep. It adds `*Config.cmake` and
  `*-config.cmake` (with `--exclude='Find*.cmake'`) and
  `find_package[[:space:]]*(`. The old globs missed a raw `find_package` in a
  hand-written, untemplated Config file (planted `install-config.cmake`;
  arrow's `arrow-config.cmake` in the corpus).
- verify wave 3: CMK-INST-10 verification. The grep does not follow a
  variable (planted `DESTINATION ${CFGDIR}` gave no hit). The rule now names
  the 4.4 diagnostic and the round trip's `--install --prefix` as the checks
  that catch it (measured on 3.31.12, 4.3.4 and 4.4.2).
- verify wave 3: CMK-INST-24 grep. `export( *package` with `-i` also matched
  `export(PACKAGE_INFO`, 67 corpus occurrences, and went red on a clean
  CPS build-tree export. It also missed `export (PACKAGE` (gflags). The new
  pattern ends at the word and allows the space. gflags was added to the
  Applied table.
- verify wave 3: CMK-INST-23 rule and verification. `install.rst` at 4.4.2
  installs both `RUNTIME` and `ARCHIVE` to their defaults when neither is
  named, so a `LIBRARY`-only call is safe. The finding is now `ARCHIVE`
  without `RUNTIME`, not `LIBRARY` without `RUNTIME`.
- verify wave 3: CMK-TGT-01 rationale. The "for compatibility only" quote
  belongs to the `LINK_PUBLIC`/`LINK_PRIVATE` and `LINK_INTERFACE_LIBRARIES`
  signatures, not the keyword-less one. The spot-check grep now allows
  `target_link_libraries (`.
- verify wave 3: CMK-TGT-06 pipeline (and CMK-TGT-07, which reuses it).
  `set\(CMAKE_CXX_STANDARD` became `set[[:space:]]*\(CMAKE_CXX_STANDARD`.
  The old pattern missed 10 unpaired corpus setter files written
  `set (CMAKE_CXX_STANDARD …)`.
