#!/bin/sh
# Step-7 as-subproject smoke, verbatim from cmake-skills.md, run on a clean and a leaking library.
# Usage: smoke.sh <cmake-line> <lib-dir> <scratch-W>
v=$1; SRC=$2; W=$3
GATE=-Werror=dev; [ "$v" = 4.4 ] && GATE=-Werror=author
NINJA=$(ocx package exec ninja-build/ninja -- sh -c "command -v ninja")
export PATH="$(dirname "$NINJA"):$PATH"
cmk() { ocx package exec "kitware/cmake:$v" -- "$@"; }
mkdir -p "$W/asub"
printf '%s\n' 'cmake_minimum_required(VERSION 3.25...4.4)' 'project(asub LANGUAGES C)' \
  'include(CTest)' "add_subdirectory($SRC lib-build)" > "$W/asub/CMakeLists.txt"
cmk cmake -S "$W/asub" -B "$W/asub-build" -G Ninja "$GATE" > "$W/configure.log" 2>&1 || echo "CONFIGURE-FAILED"
cmk ctest --test-dir "$W/asub-build" -N > "$W/asub-tests.txt"
echo "tests grep: [$(grep -r --include='asub-tests.txt' -e 'Total Tests: 0' "$W")]"
cmk cmake --build "$W/asub-build" --target help > "$W/asub-targets.txt"
NAME=mylib_unit_tests
echo "target grep: [$(grep -r --include='asub-targets.txt' -e "$NAME" "$W")]"
