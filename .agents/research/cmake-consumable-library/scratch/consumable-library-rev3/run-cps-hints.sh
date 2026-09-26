#!/bin/bash
# Where CPS requires.<dep>.hints points, how it is laid out, and whether the
# CMK-INST-01 step (a) leak grep fires: dependency in a separate prefix vs the same prefix.
set -u
S=/home/mherwig/.cache/cmake-measure-scratch/consumable-library-rev3
cd /home/mherwig/dev/grimoire-lore/.agents/worktrees/java
for v in 4.3 4.4; do
  for mode in sep same; do
    PB=$S/h-base-$v-$mode PD=$S/h-dep-$v-$mode
    [ "$mode" = same ] && PD=$PB
    rm -rf $PB $PD $S/hb-$v-$mode $S/hd-$v-$mode
    ocx package exec kitware/cmake:$v -- cmake -S $S/src/base -B $S/hb-$v-$mode -DCMAKE_C_COMPILER=gcc -DCMAKE_INSTALL_PREFIX=$PB >/dev/null
    ocx package exec kitware/cmake:$v -- cmake --build $S/hb-$v-$mode >/dev/null
    ocx package exec kitware/cmake:$v -- cmake --install $S/hb-$v-$mode >/dev/null
    ocx package exec kitware/cmake:$v -- cmake -S $S/src/dep -B $S/hd-$v-$mode -DCMAKE_C_COMPILER=gcc -DCMAKE_INSTALL_PREFIX=$PD -DCMAKE_PREFIX_PATH=$PB -DDEP_CPS=ON -DDEP_CPS_SCHEMA= -DDEP_GENEX=OFF >/dev/null
    ocx package exec kitware/cmake:$v -- cmake --build $S/hd-$v-$mode >/dev/null
    ocx package exec kitware/cmake:$v -- cmake --install $S/hd-$v-$mode >/dev/null
    echo "[$v $mode] hints lines in dep.cps:"; grep -n -A2 -e '"hints"' $PD/lib64/cps/dep/dep.cps | sed "s|$S|\$S|g"
    echo "[$v $mode] step (a) over dep's prefix (empty = pass):"
    grep -rIl --exclude='*.pc' -e "$S/src/dep" -e "$S/hd-$v-$mode" -e "$PD" "$PD" | sed "s|$S|\$S|g"
  done
done
