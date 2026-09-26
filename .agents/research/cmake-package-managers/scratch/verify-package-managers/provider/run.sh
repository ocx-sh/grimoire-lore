#!/bin/sh
# cmake-conan provider (develop2 b1593849dd) with Conan 2.32.0 from the scratch venv, offline local cache.
S=/home/mherwig/.cache/cmake-measure-scratch/verify-package-managers
P=$S/provider
export CONAN_HOME=$S/conanhome PATH=$S/venv/bin:$PATH
NINJA=$(ocx package exec ninja-build/ninja -- sh -c "command -v ninja")
for gen in CMakeDeps CMakeConfigDeps; do
  printf '[requires]\npkgb/1.0\n[generators]\n%s\n' $gen > $P/src/conanfile.txt
  rm -rf $P/b-$gen
  ocx package exec kitware/cmake:4.4 -- cmake -S $P/src -B $P/b-$gen -G Ninja -DCMAKE_MAKE_PROGRAM=$NINJA \
    -DCMAKE_CXX_COMPILER=$S/cppstd/zigcxx.sh -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_PROJECT_TOP_LEVEL_INCLUDES=$P/conan_provider.cmake > $P/b-$gen.log 2>&1
  echo "gen=$gen rc=$?"; grep -e 'CMakeConfigDeps generator was not' -e HAVE_TARGET -e 'CMake Error' $P/b-$gen.log
done
