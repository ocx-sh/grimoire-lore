#!/bin/bash
# <Pkg>_ROOT (CMP0074, the seam find_ocx's ocx_package(PULL) exports) from a LANGUAGES NONE vs LANGUAGES C project,
# against a Config package installed under lib64/cmake/base (CPS-free prefix).
S=/home/mherwig/.cache/cmake-measure-scratch/consumable-library-consolidation
cd /home/mherwig/dev/grimoire-lore/.agents/worktrees/java
for lang in NONE C; do
  mkdir -p $S/root-$lang
  printf 'cmake_minimum_required(VERSION 3.19)\nproject(p LANGUAGES %s)\nfind_package(base CONFIG)\nmessage(STATUS "base_FOUND=${base_FOUND} base_DIR=${base_DIR}")\n' $lang > $S/root-$lang/CMakeLists.txt
  for v in 3.31 4.4; do
    ocx package exec kitware/cmake:$v -- cmake -S $S/root-$lang -B $S/b-root-$lang-$v -Dbase_ROOT=$S/pfx-nover 2>&1 | grep -e base_FOUND | sed "s#^#[$v LANGUAGES $lang] #"
  done
done
