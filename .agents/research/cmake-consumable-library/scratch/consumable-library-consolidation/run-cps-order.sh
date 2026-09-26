#!/bin/bash
# Config vs CPS default selection with VERSION_SCHEMA simple (default), both installed.
set -u
S=/home/mherwig/.cache/cmake-measure-scratch/consumable-library-consolidation
cd /home/mherwig/dev/grimoire-lore/.agents/worktrees/java
for v in 4.3 4.4; do
  P=$S/pfx-$v
  C() { ocx package exec kitware/cmake:$v -- cmake "$@"; }
  rm -rf $S/b-*-$v $P
  C -S $S/src/base -B $S/b-base-$v -G "Unix Makefiles" -DCMAKE_C_COMPILER=gcc -DCMAKE_INSTALL_PREFIX=$P >/dev/null && C --build $S/b-base-$v >/dev/null && C --install $S/b-base-$v >/dev/null
  C -S $S/src/dep -B $S/b-dep-$v -G "Unix Makefiles" -DCMAKE_C_COMPILER=gcc -DCMAKE_INSTALL_PREFIX=$P -DCMAKE_PREFIX_PATH=$P -DDEP_CPS=ON -DDEP_CPS_SCHEMA= -DDEP_GENEX=OFF >/dev/null; echo "dep configure $v exit=$?"
  C --build $S/b-dep-$v >/dev/null && C --install $S/b-dep-$v | grep -e '\.cps' -e 'depConfig.cmake'
  grep -h version_schema $P/lib64/cps/dep/dep.cps || echo "no version_schema key (simple default)"
  for form in "dep 1.2 CONFIG REQUIRED" "dep 1.2 REQUIRED" "dep REQUIRED"; do
    mkdir -p $S/cons-src; sed "s/find_package(dep 1.2 CONFIG REQUIRED)/find_package($form)/" $S/src/consumer/CMakeLists.txt > $S/cons-src/CMakeLists.txt; cp $S/src/consumer/main.c $S/cons-src/
    rm -rf $S/b-cons-$v
    C -S $S/cons-src -B $S/b-cons-$v -G "Unix Makefiles" -DCMAKE_C_COMPILER=gcc -DCMAKE_PREFIX_PATH=$P >/dev/null 2>&1; echo "  [$v] find_package($form) exit=$? $(grep ^dep_DIR $S/b-cons-$v/CMakeCache.txt)"
  done
  C -S $S/cons-src -B $S/b-cons-dbg-$v -G "Unix Makefiles" -DCMAKE_C_COMPILER=gcc -DCMAKE_PREFIX_PATH=$P --debug-find-pkg=dep 2>&1 | grep -n -e "$P" | head -12
done
