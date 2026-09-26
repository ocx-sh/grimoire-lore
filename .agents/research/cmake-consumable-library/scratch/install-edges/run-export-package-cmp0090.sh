#!/bin/bash
# export(PACKAGE) and CMP0090, with a throwaway HOME, on 3.31.12 and 4.4.2,
# with the policy explicitly NEW and explicitly OLD (the project's own
# cmake_minimum_required(VERSION 3.20) already implies NEW, so testing OLD
# needs an explicit cmake_policy(SET CMP0090 OLD) in the test CMakeLists).
set -u
S=/home/mherwig/.cache/cmake-measure-scratch/install-edges
cd /home/mherwig/dev/grimoire-lore/.agents/worktrees/java

for v in 3.31 4.4; do
  for pol in DEFAULT NEW OLD; do
    HOMEDIR=$S/home2-$v-$pol
    mkdir -p "$HOMEDIR"
    B=$S/b-exportpkg2-$v-$pol
    TP=""; [ "$pol" != "DEFAULT" ] && TP="$pol"
    HOME=$HOMEDIR ocx package exec kitware/cmake:$v -- cmake -S $S/src/exportpkg -B $B -G "Unix Makefiles" -DCMAKE_C_COMPILER=gcc -DTESTPOL=$TP >/dev/null 2>&1
    echo "[$v policy=$pol] \$HOME/.cmake/packages:"
    find "$HOMEDIR/.cmake" -type f 2>/dev/null | sort
  done
done
