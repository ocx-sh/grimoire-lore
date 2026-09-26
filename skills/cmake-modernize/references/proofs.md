# The proofs

Read this when running steps 5 to 9. It holds the scripts whose exit codes close
those steps, and the CI greps of step 8. Every script was run against a planted
passing project and a planted failing one on CMake 3.31.12, 4.3.4 and 4.4.2,
with gcc 15.2.1 and Ninja 1.13.2 (2026-09-26). Each configure carries the
program range `3.25...4.4` and the gate in `GATE`: `-Werror=author` on a 4.4 or
later binary, `-Werror=dev` on 4.3 and older (`CMK-CORE-01`).

Contents: [The gate canary](#the-gate-canary) ·
[The as-subproject smoke](#the-as-subproject-smoke) ·
[The offline subproject probe](#the-offline-subproject-probe) ·
[The gated round trip](#the-gated-round-trip) ·
[CI checks](#ci-checks) · [CPS and pkg-config](#cps-and-pkg-config)

## The gate canary

A three-line project. Configure it with a leg's exact binary and flags: exit 1
means the gate is live, exit 0 is the finding.

```cmake
cmake_minimum_required(VERSION 3.25...4.4)
project(gate_canary LANGUAGES NONE)
message(AUTHOR_WARNING "gate canary")
```

```sh
# W = scratch dir holding canary/CMakeLists.txt. Exit 1 = pass.
cmake -S "$W/canary" -B "$W/canary-build" "$GATE"
```

Measured: `-Werror=dev` exits 1 on all three lines. `-Werror=author` exits 1 on
4.4.2 and **0** on 3.31.12 and 4.3.4. When a CI leg takes its gate from a
preset, copy the project's `CMakePresets.json` beside the canary and run the
leg's preset instead. Exit 1 = pass. A preset with `"errors": {"dev": true}`
exits 1 on 3.31.12 and 4.4.2, and one with `"warnings": {"dev": false}` exits 0.

```sh
LEG=ci
cp CMakePresets.json "$W/canary/"
cmake -S "$W/canary" -B "$W/canary-build" --preset "$LEG" --fresh
```

## The as-subproject smoke

Step 7's exit check, and step 5's too. It proves the source tree, dropped in
with `add_subdirectory` under a parent that defines none of the library's
option names, defines no test and no developer-only target. The parent includes
`CTest` on purpose: that turns `BUILD_TESTING` on, which is the adversarial
case. Pass the plan file's configure options to each `cmake -S`.

```sh
# SRC = absolute library source, W = an empty scratch dir, GATE per binary.
mkdir -p "$W/asub"
printf '%s\n' 'cmake_minimum_required(VERSION 3.25...4.4)' 'project(asub LANGUAGES C)' \
  'include(CTest)' "add_subdirectory($SRC lib-build)" > "$W/asub/CMakeLists.txt"
cmake -S "$W/asub" -B "$W/asub-build" -G Ninja "$GATE"
ctest --test-dir "$W/asub-build" -N > "$W/asub-tests.txt"
grep -r --include='asub-tests.txt' -e 'Total Tests: 0' "$W"
cmake --build "$W/asub-build" --target help > "$W/asub-targets.txt"
NAME=mylib_unit_tests
grep -r --include='asub-targets.txt' -e "$NAME" "$W"
```

The first `grep` must print a line. Empty output = tests leaked (finding). Run
the second `grep` once per developer-only target name recorded from a top-level
configure of the same tree. Empty output = pass. Measured on all three lines: a
library guarded on `PROJECT_IS_TOP_LEVEL` prints `Total Tests: 0` and no
`mylib_unit_tests`, and the same library unguarded prints `Total Tests: 1` and
`mylib_unit_tests: phony`. The Ninja help format is `name: phony`. Never use a
`--directory` flag (it does not exist) or an `|| echo OK` ending, which prints OK
on any error. Declare the parent's language to match the library's, `C` or
`CXX`.

The second pass runs the same smoke under a parent that owns an option name the
library also declares. List the library's options first:

```sh
grep -rnE --include='CMakeLists.txt' --include='*.cmake' --exclude-dir='_deps' --exclude-dir='build*' \
  -e '^[[:space:]]*option[[:space:]]*\(' "$SRC"
```

Empty output = no options, so the second pass is not applicable. Run it once
per listed name that lacks the project's prefix:

```sh
# NAME as in the first pass, once per developer-only target name.
OPT=BUILD_EXAMPLES
mkdir -p "$W/asub2"
printf '%s\n' 'cmake_minimum_required(VERSION 3.25...4.4)' 'project(asub2 LANGUAGES C)' \
  'include(CTest)' "option($OPT \"parent option\" ON)" "add_subdirectory($SRC lib-build)" > "$W/asub2/CMakeLists.txt"
cmake -S "$W/asub2" -B "$W/asub2-build" -G Ninja "$GATE"
cmake --build "$W/asub2-build" --target help > "$W/asub2-targets.txt"
grep -r --include='asub2-targets.txt' -e "$NAME" "$W"
```

A non-zero configure exit is a finding, and so is any line from the grep. Empty
output = pass. `option()` never overrides a name the parent already set, so an
unprefixed `option(BUILD_EXAMPLES ... ${PROJECT_IS_TOP_LEVEL})` takes the
parent's `ON` (measured 2026-09-26 on 3.31.12 and 4.4.2: the example target
leaks, while the same library with `mylib_BUILD_EXAMPLES` prints nothing).
Chipmunk2D's unprefixed `BUILD_DEMOS` failed the parent's configure with
`Could NOT find OpenGL` on both lines.

## The offline subproject probe

When inventory `I7` listed an unguarded fetch, this is `CMK-DEP-07`'s check. The
dependency is installed, the network is cut off by
`FETCHCONTENT_FULLY_DISCONNECTED`, and a forced fetch fails.

```sh
# SRC = absolute library source, DEP_PREFIX = an install prefix holding the
# dependency, W and GATE as above. Exit 0 = pass.
mkdir -p "$W/dep07"
printf '%s\n' 'cmake_minimum_required(VERSION 3.25...4.4)' 'project(dep07 LANGUAGES C)' \
  "add_subdirectory($SRC lib-build)" > "$W/dep07/CMakeLists.txt"
cmake -S "$W/dep07" -B "$W/dep07-build" "$GATE" -DCMAKE_PREFIX_PATH="$DEP_PREFIX" \
  -DFETCHCONTENT_FULLY_DISCONNECTED=ON -DCMAKE_POLICY_DEFAULT_CMP0170=NEW
```

A non-zero exit from a forced fetch is the finding. Keep the CMP0170 default:
without it, a tree whose range stops below 3.30 configures a forced fetch
against an empty source directory and still exits 0. Measured on 3.31.12 and
4.4.2: an unconditional declare exits 1, and the same declare with
`FIND_PACKAGE_ARGS CONFIG` exits 0 against the installed copy.

## The gated round trip

Step 6's exit check (`CMK-INST-01`). It installs, greps the prefix for leaked
paths, moves the prefix, then configures, builds and links a separate compiled
consumer. The consumer is compiled on purpose: a missing `find_dependency`
stays green for a `LANGUAGES NONE` consumer.

```sh
# Run from an empty scratch dir, once per CMake line CI runs. Export first:
# PKG (find_package name), VER (a version it satisfies), TARGETS (its imported
# targets), SRC (absolute source dir), GATE (-Werror=author on 4.4 and later,
# -Werror=dev on 4.3 and older), and SYM_DECL and SYM_CALL: an include and a
# call of one exported function per target in TARGETS, for example:
#   export PKG=mylib VER=1.0 TARGETS=mylib::mylib SRC=/abs/path/to/project GATE=-Werror=dev
#   export SYM_DECL='#include <mylib/mylib.h>' SYM_CALL='mylib_version() != 0'
# CFG_ARGS (optional): the library's own -D options from the plan file, for example -DBUILD_DEMOS=OFF
# A dependency outside system paths goes in the environment: export CMAKE_PREFIX_PATH=/abs/dep/prefix
set -eu
: "${PKG:?}" "${VER:?}" "${TARGETS:?}" "${SRC:?}" "${GATE:?}" "${SYM_DECL:?}" "${SYM_CALL:?}"
W="$PWD"
cmake -S "$SRC" -B "$W/build" "$GATE" ${CFG_ARGS:-}
cmake --build "$W/build"
cmake --install "$W/build" --prefix "$W/prefix"
# (a) Text files in the prefix naming the source, build or install tree. Empty = pass.
grep -rIl --exclude='*.pc' -e "$SRC" -e "$W/build" -e "$W/prefix" "$W/prefix" > "$W/leaks.txt" || true
test ! -s "$W/leaks.txt"
# (b) An export file with a baked absolute import prefix. Empty = pass.
grep -rn --include='*.cmake' -e 'set(_IMPORT_PREFIX "/' "$W/prefix" > "$W/abs-import.txt" || true
test ! -s "$W/abs-import.txt"
# (c) Move the prefix, then configure, build and link a separate compiled consumer.
mv "$W/prefix" "$W/moved"
mkdir -p "$W/consumer"
printf '%s\n' "$SYM_DECL" "int main(void) { return $SYM_CALL; }" > "$W/consumer/main.c"
printf '%s\n' 'cmake_minimum_required(VERSION 3.25...4.4)' 'project(rt LANGUAGES C)' \
  "find_package($PKG $VER CONFIG REQUIRED)" 'add_executable(rt main.c)' \
  "target_link_libraries(rt PRIVATE $TARGETS)" > "$W/consumer/CMakeLists.txt"
cmake -S "$W/consumer" -B "$W/consumer-build" "$GATE" -DCMAKE_PREFIX_PATH="$W/moved"
cmake --build "$W/consumer-build"
grep -e "^${PKG}_DIR" "$W/consumer-build/CMakeCache.txt"
```

The script stops at the first failure, and any non-zero exit is a finding. The
last line shows which package file the moved consumer resolved. Measured on
all three lines: a complete package exits 0 and prints
`mylib_DIR:PATH=.../moved/lib64/cmake/mylib`, and the same package without
`write_basic_package_version_file` exits 1 with `version: unknown`
(`CMK-INST-04`). The consumer calls a function because an empty `main` pulls
no member out of a static archive: Chipmunk2D's static target, which never
linked `m`, passed with an empty `main` and exits 1 with
``undefined reference to `sincos'`` when `SYM_CALL` is `cpBodyNew(1, 1) != 0`
(both lines, 2026-09-26). One call pulls in only its own object file, so a gap
in another object stays hidden. The script runs a single-config generator, so multi-config
defects need `CMK-INST-22`'s leg. For a C++ library, the consumer declares
`LANGUAGES CXX` and writes `main.cpp` instead.

## CI checks

Step 8. Each command reads the tree from the root.

```sh
# CMK-CORE-01: a gate exists in the workflows. Empty output = no gate (finding), unless the leg's preset carries "errors": {"dev": true} and the preset canary exits 1.
# A Werror=author hit on a leg that can resolve CMake below 4.4 is also a finding.
grep -rn -e 'Werror=author' -e 'Werror=dev' .github/workflows
# A preset that switches the gate off. Empty output = pass.
grep -rn --include='CMakePresets.json' --include='CMakeUserPresets.json' -e '"dev"[[:space:]]*:[[:space:]]*false' -e '"deprecated"[[:space:]]*:[[:space:]]*false' .
# CMK-CORE-05: an early-exiting reader in a script. Empty output = pass. A hit in
# a file that also sets pipefail is the finding.
grep -rsnE -e '[|] *grep( +-[a-zA-Z]+)* +-[a-zA-Z]*[qm]' -e '[|] *rg( +-[a-zA-Z]+)* +-[a-zA-Z]*[qm]' -e '[|] *head' scripts .github
# CMK-CORE-04: a dead formatter. Empty output = pass. Any hit means migrate.
grep -rn --include='*.yml' --include='*.yaml' --include='*.txt' --include='*.toml' \
  -e 'cmake-format' -e 'cmake_format' -e 'cmake-lint' -e 'cmakelang' .
# CMK-CORE-02: schema 12 still carrying dev. "true" is the finding, "false" or no output passes.
find . -name CMakePresets.json -not -path '*/_deps/*' -print0 \
  | xargs -0 -r -n1 jq -e '.version >= 12 and ([.configurePresets[]? | (.warnings // {}), (.errors // {}) | has("dev")] | any)'
```

All five were run against a planted failing tree and a planted passing one. The
formatting gate is the index's gate line,
`git ls-files -z -- '*CMakeLists.txt' '*.cmake' | xargs -0 -r gersemi --check`,
with gersemi 0.29.1: exit 1 on an unformatted file, exit 0 on a formatted one.
Never `gersemi --check .`, which descends into build trees and fails on
generated files, and never `gersemi --diff`, which exited 0 on both (measured
2026-09-26) (`CMK-CORE-04`).

In a tree with no `.github/workflows` directory, the greps that name it exit 2
with "No such file or directory". That is neither a pass nor a hit: step 8 is
not applicable, and SKILL.md says what to report.

For `CMK-INST-18`, `grep -rn -e 'cmake --install' .github/workflows` lists the
install steps, and `grep -rn -e 'CMAKE_PREFIX_PATH' .github/workflows` must
show a consumer configure after each one. Hits from the first with empty
output from the second is the finding.

## CPS and pkg-config

Step 9, optional, only after the round trip is green without it. Add
`install(PACKAGE_INFO <pkg> EXPORT <set> VERSION ... COMPAT_VERSION ...)` inside
`if(CMAKE_VERSION VERSION_GREATER_EQUAL 4.3)`. Then re-run the round trip on a
3.31 line and on a 4.3 or later line. Both exit 0, and the last line ends in
`/cmake/<pkg>` on 3.31 and in `/cps/<pkg>` on 4.3 and later (measured on 3.31.12,
4.3.4 and 4.4.2), because a `.cps` in the same prefix wins from 4.3.

Before that run, three greps. For each, empty output = pass.

```sh
# CMK-INST-13: retired experimental gates and the distributor-only switch.
grep -rn --include='CMakeLists.txt' --include='*.cmake' -e 'CMAKE_EXPERIMENTAL_EXPORT_PACKAGE_INFO' \
  -e 'CMAKE_EXPERIMENTAL_FIND_CPS_PACKAGES' -e 'CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO' .
# CMK-INST-16: any schema other than simple. A hit is the finding.
grep -rn --include='CMakeLists.txt' --include='*.cmake' -e 'VERSION_SCHEMA' . | grep -v -e 'VERSION_SCHEMA simple'
```

`CMK-INST-15` is a reading check, and its output is a list:
`grep -rn --include='CMakeLists.txt' --include='*.cmake' -e 'install(PACKAGE_INFO' -e 'NAMESPACE' .`
prints both spellings. A `PACKAGE_INFO` name that differs in any character, case
included, from the `NAMESPACE` prefix of the export it names is the finding.
`CMK-INST-17` is the configure exit code with CPS enabled: non-zero is the
finding, and a log grep misses it because the message wraps across lines.

A pkg-config file writes `prefix=${pcfiledir}/<rel>` with `<rel>` computed by
`file(RELATIVE_PATH)`, never a fixed `../..` (`CMK-INST-12`, SHOULD). For new
files, `grep -rnF --include='*.pc.in' -e 'prefix=@CMAKE_INSTALL_PREFIX@' .` must
print nothing.
