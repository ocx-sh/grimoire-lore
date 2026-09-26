#!/bin/sh
# Does a find_program/find_library placed AFTER the first find_package see a
# cmake-conan provider's package paths? Measured per generator (CMakeDeps vs
# CMakeConfigDeps) with Conan 2.32.0 and cmake-conan develop2 b1593849dd.
W=/home/mherwig/.cache/cmake-measure-scratch/skills-consolidation
S=/home/mherwig/.cache/cmake-measure-scratch/verify-package-managers
export CONAN_HOME=$W/conanhome PATH=$S/venv/bin:$PATH
NINJA=$(ocx package exec ninja-build/ninja -- sh -c "command -v ninja")
conan create "$W/recipe" > "$W/create.log" 2>&1 || { echo "create failed"; tail -20 "$W/create.log"; exit 1; }
for gen in CMakeDeps CMakeConfigDeps; do
  printf '[requires]\ngamma/1.0\n[generators]\n%s\nCMakeToolchain\n' "$gen" > "$W/app/conanfile.txt"
  ocx package exec kitware/cmake:4.4 -- cmake -S "$W/app" -B "$W/b-$gen" --fresh -G Ninja \
    -DCMAKE_MAKE_PROGRAM="$NINJA" -DCMAKE_CXX_COMPILER="$S/cppstd/zigcxx.sh" -DCMAKE_BUILD_TYPE=Release \
    -DCONAN_HOST_PROFILE=default -DCONAN_BUILD_PROFILE=default \
    -DCMAKE_PROJECT_TOP_LEVEL_INCLUDES="$S/provider/conan_provider.cmake" > "$W/b-$gen.log" 2>&1
  echo "gen=$gen rc=$?"
  grep -e '^-- \[' -e 'cmakedeps_paths' -e 'CMake Error' "$W/b-$gen.log"
done
# Scope: first intercepted find_package inside a subdirectory (CMakeConfigDeps).
ocx package exec kitware/cmake:4.4 -- cmake -S "$W/app2" -B "$W/b-scope" --fresh -G Ninja \
  -DCMAKE_MAKE_PROGRAM="$NINJA" -DCMAKE_CXX_COMPILER="$S/cppstd/zigcxx.sh" -DCMAKE_BUILD_TYPE=Release \
  -DCONAN_HOST_PROFILE=default -DCONAN_BUILD_PROFILE=default \
  -DCMAKE_PROJECT_TOP_LEVEL_INCLUDES="$S/provider/conan_provider.cmake" > "$W/b-scope.log" 2>&1
echo "scope rc=$?"; grep -e '^-- \[' "$W/b-scope.log"
