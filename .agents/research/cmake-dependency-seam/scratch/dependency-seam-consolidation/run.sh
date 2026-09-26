#!/bin/sh
# Re-run from the worktree root. S must hold a copy of this directory (paths in the
# CMakeLists are absolute to /home/mherwig/.cache/cmake-measure-scratch/dependency-seam-consolidation).
S=/home/mherwig/.cache/cmake-measure-scratch/dependency-seam-consolidation
for v in 3.31 4.4; do
  for p in selfset selfappend; do
    ocx package exec kitware/cmake:$v -- cmake -S $S/$p -B $S/build-$v-$p -DCMAKE_PROJECT_TOP_LEVEL_INCLUDES=$S/prov/user.cmake 2>&1 | grep -e provider
  done
  ocx package exec kitware/cmake:$v -- cmake -S $S/cmp0077-scoped -B $S/build-$v-cmp 2>&1 | grep -e '\[dep' -e CMP0077
done
# _ROOT re-point vs cached _DIR (rootswitch), the unset(_DIR CACHE) fix (rootswitch-fix),
# and a top-level find_program ignoring _ROOT (rootprog).
for v in 3.31 4.4; do
  for p in rootswitch rootswitch-fix; do
    ocx package exec kitware/cmake:$v -- cmake -S $S/$p -B $S/build-$v-$p -DWANT_ROOT=$S/pfx-A 2>&1 | grep -e '\[root'
    ocx package exec kitware/cmake:$v -- cmake -S $S/$p -B $S/build-$v-$p -DWANT_ROOT=$S/pfx-B 2>&1 | grep -e '\[root'
  done
  ocx package exec kitware/cmake:$v -- cmake -S $S/rootprog -B $S/build-$v-rootprog -DWANT_ROOT=$S/pfx-A 2>&1 | grep -e '\[root'
done
find $S -maxdepth 1 -name 'build-*' -type d -exec rm -rf {} +
# CPM.cmake include leaks CMAKE_POLICY_DEFAULT_CMP0077/0126/0135/0150=NEW into the includer's scope
# (cpmleak/cmake/CPM.cmake is cpm-cmake__CPM.cmake@01678cfe17:cmake/CPM.cmake verbatim).
for v in 3.31 4.4; do
  ocx package exec kitware/cmake:$v -- cmake -S $S/cpmleak -B $S/build-$v-cpmleak 2>&1 | grep -e '\[cpmleak'
done
find $S -maxdepth 1 -name 'build-*' -type d -exec rm -rf {} +
