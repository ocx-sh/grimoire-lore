#!/bin/sh
# Which toolchain wins: preset toolchainFile vs cacheVariables.CMAKE_TOOLCHAIN_FILE vs -D.
P=/home/mherwig/.cache/cmake-measure-scratch/verify-package-managers/tcprec
cd $P
for v in 3.31 4.3 4.4; do
  rm -rf $P/b1 $P/b2
  echo "cmake $v both:  $(ocx package exec kitware/cmake:$v -- cmake --preset both 2>&1 | grep -o 'LOADED toolchain [AB]' | sort -u | tr '\n' ' ')"
  echo "cmake $v cv+-D: $(ocx package exec kitware/cmake:$v -- cmake --preset cv -DCMAKE_TOOLCHAIN_FILE=$P/b.cmake 2>&1 | grep -o 'LOADED toolchain [AB]' | sort -u | tr '\n' ' ')"
done
rm -rf $P/b1 $P/b2
