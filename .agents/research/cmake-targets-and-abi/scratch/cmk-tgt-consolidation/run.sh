#!/bin/sh
# Re-run from the worktree root: sh <this dir>/run.sh <srcdir> <builddir-root>
SRC=$1; OUT=$2
CC="-DCMAKE_C_COMPILER=/usr/sbin/gcc -DCMAKE_MAKE_PROGRAM=/usr/sbin/make -G Unix Makefiles"
for v in 3.31 4.4; do
  echo "=== cmake $v"
  cm() { ocx package exec kitware/cmake:$v -- cmake "$@"; }
  cm -S $SRC/bt-noforce -B $OUT/$v/bt-noforce -DCMAKE_C_COMPILER=/usr/sbin/gcc -DCMAKE_MAKE_PROGRAM=/usr/sbin/make -G "Unix Makefiles" 2>&1 | grep -e BEFORE -e AFTER
  grep -e '^CMAKE_BUILD_TYPE' $OUT/$v/bt-noforce/CMakeCache.txt
  cm -S $SRC/bt-force-sub -B $OUT/$v/bt-force-sub -DCMAKE_C_COMPILER=/usr/sbin/gcc -DCMAKE_MAKE_PROGRAM=/usr/sbin/make -G "Unix Makefiles" 2>&1 | grep -e PARENT_AFTER
  grep -e '-O3' $OUT/$v/bt-force-sub/CMakeFiles/a.dir/flags.make || echo "parent target: no -O3"
  cm -S $SRC/bsl-scoped -B $OUT/$v/bsl-scoped -DCMAKE_C_COMPILER=/usr/sbin/gcc -DCMAKE_MAKE_PROGRAM=/usr/sbin/make -G "Unix Makefiles" 2>&1 | grep -e DEPA_TYPE -e 'Policy CMP0077'
  cm -S $SRC/bsl-force -B $OUT/$v/bsl-force -DBUILD_SHARED_LIBS=OFF -DCMAKE_C_COMPILER=/usr/sbin/gcc -DCMAKE_MAKE_PROGRAM=/usr/sbin/make -G "Unix Makefiles" 2>&1 | grep -e DEP_TYPE
done
for v in 3.31 4.4; do
  for p in bt-preproject bt-force; do
    printf '%s %s: ' "$v" "$p"
    ocx package exec kitware/cmake:$v -- cmake -S $SRC/$p -B $OUT/$v/$p -DCMAKE_C_COMPILER=/usr/sbin/gcc -DCMAKE_MAKE_PROGRAM=/usr/sbin/make -G "Unix Makefiles" 2>&1 | grep -e 'AFTER='
  done
  printf '%s bt-noforce Ninja Multi-Config: ' "$v"
  ocx package exec kitware/cmake:$v -- cmake -S $SRC/bt-noforce -B $OUT/$v/bt-nmc -G "Ninja Multi-Config" -DCMAKE_C_COMPILER=/usr/sbin/gcc -DCMAKE_MAKE_PROGRAM="$(ocx package exec ninja-build/ninja -- sh -c 'command -v ninja')" 2>&1 | grep -e 'AFTER=' -e 'Error'
done
for v in 3.31 4.4; do
  printf '%s mc-preproject Ninja Multi-Config:\n' "$v"
  ocx package exec kitware/cmake:$v -- cmake -S $SRC/mc-preproject -B $OUT/$v/mc-pre -G "Ninja Multi-Config" -DCMAKE_MAKE_PROGRAM="$(ocx package exec ninja-build/ninja -- sh -c 'command -v ninja')" 2>&1 | grep -e 'PRE:' -e 'POST:'
done
