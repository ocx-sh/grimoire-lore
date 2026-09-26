#!/bin/bash
# Which MAP_IMPORTED_CONFIG value turns "config missing from the install" into
# an error without also rejecting a config that IS installed?
# Needs the prefixes run-multiconfig-postfix.sh leaves: pfx-$v-d (Debug+Release),
# pfx-$v-donly (Debug only).
set -u
S=/home/mherwig/.cache/cmake-measure-scratch/consumable-library-rev3
NINJA=$(ocx package exec ninja-build/ninja -- sh -c 'command -v ninja')
cd /home/mherwig/dev/grimoire-lore/.agents/worktrees/java
for v in 3.31 4.4; do
  for pfx in d donly; do
    for map in EMPTY Release; do
      M=""; [ $map = Release ] && M=Release
      C=$S/m-$v-$pfx-$map
      ocx package exec kitware/cmake:$v -- cmake -S $S/src/base-consumer -B $C -G "Ninja Multi-Config" -DCMAKE_MAKE_PROGRAM=$NINJA -DCMAKE_C_COMPILER=gcc -DCMAKE_PREFIX_PATH=$S/pfx-$v-$pfx "-DCMAKE_MAP_IMPORTED_CONFIG_RELEASE=$M" >/dev/null 2>&1; e1=$?
      e2=skip; [ $e1 = 0 ] && { ocx package exec kitware/cmake:$v -- cmake --build $C --config Release >/dev/null 2>&1; e2=$?; }
      echo "[$v install=$pfx MAP_RELEASE=$map] configure=$e1 build-Release=$e2"
    done
  done
done
