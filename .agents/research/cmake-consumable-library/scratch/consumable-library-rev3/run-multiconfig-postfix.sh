#!/bin/bash
# Multi-config install of both configs into one prefix: collision without a
# postfix, distinct files with CMAKE_DEBUG_POSTFIX=d; the static duplicate-
# location check over the per-config export files; the empty
# CMAKE_MAP_IMPORTED_CONFIG_RELEASE check against a Debug-only install.
set -u
S=/home/mherwig/.cache/cmake-measure-scratch/consumable-library-rev3
NINJA=$(ocx package exec ninja-build/ninja -- sh -c 'command -v ninja')
cd /home/mherwig/dev/grimoire-lore/.agents/worktrees/java
dupcheck() {
  grep -rhoE --include='*-*.cmake' -e 'IMPORTED_LOCATION_[A-Z_]+ "[^"]+"' "$1" | sed -E 's/^[^ ]+ //' | sort | uniq -d
}
for v in 3.31 4.4; do
  for pf in none d; do
    P=$S/pfx-$v-$pf B=$S/b-$v-$pf; rm -rf "$P" "$B"
    X=""; [ "$pf" = d ] && X="-DCMAKE_DEBUG_POSTFIX=d"
    ocx package exec kitware/cmake:$v -- cmake -S $S/src/base -B $B -G "Ninja Multi-Config" -DCMAKE_MAKE_PROGRAM=$NINJA -DCMAKE_C_COMPILER=gcc -DCMAKE_INSTALL_PREFIX=$P $X >/dev/null
    for c in Debug Release; do
      ocx package exec kitware/cmake:$v -- cmake --build $B --config $c >/dev/null
      ocx package exec kitware/cmake:$v -- cmake --install $B --config $c >/dev/null
    done
    echo "[$v postfix=$pf] installed libs:"; find $P/lib64 -maxdepth 1 -name 'libbase*' -type f -printf '%f\n' | sort
    echo "[$v postfix=$pf] duplicate IMPORTED_LOCATION across configs (empty = pass):"; dupcheck $P
  done
  # Debug-only install, Release consumer: default vs empty map.
  P=$S/pfx-$v-donly B=$S/b-$v-donly; rm -rf "$P" "$B"
  ocx package exec kitware/cmake:$v -- cmake -S $S/src/base -B $B -G "Ninja Multi-Config" -DCMAKE_MAKE_PROGRAM=$NINJA -DCMAKE_C_COMPILER=gcc -DCMAKE_INSTALL_PREFIX=$P >/dev/null
  ocx package exec kitware/cmake:$v -- cmake --build $B --config Debug >/dev/null
  ocx package exec kitware/cmake:$v -- cmake --install $B --config Debug >/dev/null
  C=$S/c-$v-default; rm -rf $C
  ocx package exec kitware/cmake:$v -- cmake -S $S/src/base-consumer -B $C -G "Ninja Multi-Config" -DCMAKE_MAKE_PROGRAM=$NINJA -DCMAKE_C_COMPILER=gcc -DCMAKE_PREFIX_PATH=$P >/dev/null 2>&1; e1=$?
  ocx package exec kitware/cmake:$v -- cmake --build $C --config Release >/dev/null 2>&1; e2=$?
  echo "[$v Debug-only, Release consumer, default] configure=$e1 build=$e2"
  C=$S/c-$v-emptymap; rm -rf $C
  ocx package exec kitware/cmake:$v -- cmake -S $S/src/base-consumer -B $C -G "Ninja Multi-Config" -DCMAKE_MAKE_PROGRAM=$NINJA -DCMAKE_C_COMPILER=gcc -DCMAKE_PREFIX_PATH=$P -DCMAKE_MAP_IMPORTED_CONFIG_RELEASE= > $S/emptymap-$v.log 2>&1; e1=$?
  echo "[$v Debug-only, empty CMAKE_MAP_IMPORTED_CONFIG_RELEASE] configure=$e1"; grep -e 'IMPORTED_LOCATION or' -e 'Generate step failed' $S/emptymap-$v.log
done
