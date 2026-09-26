#!/bin/bash
# Multi-config CPS: per-config @<config>.cps files on 4.3.4 and 4.4.2, and the
# absolute-path leak in the cross-package "requires.<pkg>.hints" field.
set -u
S=/home/mherwig/.cache/cmake-measure-scratch/install-edges
NINJA=$(ocx package exec ninja-build/ninja -- sh -c 'command -v ninja')
cd /home/mherwig/dev/grimoire-lore/.agents/worktrees/java

for v in 4.3 4.4; do
  P=$S/mc-pfx-$v
  ocx package exec kitware/cmake:$v -- cmake -S $S/src/base -B $S/mc-b-base-$v -G "Ninja Multi-Config" -DCMAKE_MAKE_PROGRAM=$NINJA -DCMAKE_C_COMPILER=gcc -DCMAKE_INSTALL_PREFIX=$P >/dev/null
  ocx package exec kitware/cmake:$v -- cmake --build $S/mc-b-base-$v --config Debug >/dev/null
  ocx package exec kitware/cmake:$v -- cmake --build $S/mc-b-base-$v --config Release >/dev/null
  ocx package exec kitware/cmake:$v -- cmake --install $S/mc-b-base-$v --config Debug >/dev/null
  ocx package exec kitware/cmake:$v -- cmake --install $S/mc-b-base-$v --config Release >/dev/null
  ocx package exec kitware/cmake:$v -- cmake -S $S/src/dep -B $S/mc-b-dep-$v -G "Ninja Multi-Config" -DCMAKE_MAKE_PROGRAM=$NINJA -DCMAKE_C_COMPILER=gcc -DCMAKE_INSTALL_PREFIX=$P -DCMAKE_PREFIX_PATH=$P -DDEP_CPS=ON -DDEP_CPS_SCHEMA= -DDEP_GENEX=OFF >/dev/null
  ocx package exec kitware/cmake:$v -- cmake --build $S/mc-b-dep-$v --config Debug >/dev/null
  ocx package exec kitware/cmake:$v -- cmake --build $S/mc-b-dep-$v --config Release >/dev/null
  ocx package exec kitware/cmake:$v -- cmake --install $S/mc-b-dep-$v --config Debug >/dev/null
  ocx package exec kitware/cmake:$v -- cmake --install $S/mc-b-dep-$v --config Release >/dev/null
  echo "[$v] cps files:"; find $P -iname '*.cps' | sort
  echo "[$v] leak check (CMK-INST-01 step a) against the un-moved prefix:"
  grep -rIl --exclude='*.pc' -e "$P" "$P" 2>/dev/null
done
