#!/bin/bash
# Multi-config round trip: Ninja Multi-Config, Debug+Release install of base,
# per-config export files, consume both configs, then move the prefix and
# re-consume. Also: a config absent from the install (Release request against
# a Debug-only install), default silent fallback vs
# CMAKE_MAP_IMPORTED_CONFIG_RELEASE= forcing a loud failure.
set -u
S=/home/mherwig/.cache/cmake-measure-scratch/install-edges
NINJA=$(ocx package exec ninja-build/ninja -- sh -c 'command -v ninja')
cd /home/mherwig/dev/grimoire-lore/.agents/worktrees/java

for v in 3.31 4.4; do
  P=$S/mc-pfx-$v
  ocx package exec kitware/cmake:$v -- cmake -S $S/src/base -B $S/mc-b-base-$v -G "Ninja Multi-Config" -DCMAKE_MAKE_PROGRAM=$NINJA -DCMAKE_C_COMPILER=gcc -DCMAKE_INSTALL_PREFIX=$P >/dev/null
  ocx package exec kitware/cmake:$v -- cmake --build $S/mc-b-base-$v --config Debug >/dev/null
  ocx package exec kitware/cmake:$v -- cmake --build $S/mc-b-base-$v --config Release >/dev/null
  ocx package exec kitware/cmake:$v -- cmake --install $S/mc-b-base-$v --config Debug >/dev/null
  ocx package exec kitware/cmake:$v -- cmake --install $S/mc-b-base-$v --config Release >/dev/null
  echo "[$v] export files:"; find $P/lib64/cmake/base -name '*.cmake' | sort
  echo "[$v] installed lib md5 vs each build config's own lib:"
  md5sum $P/lib64/libbase.so.1.0.0 $S/mc-b-base-$v/Debug/libbase.so.1.0.0 $S/mc-b-base-$v/Release/libbase.so.1.0.0
  echo "[$v] consume both configs:"
  ocx package exec kitware/cmake:$v -- cmake -S $S/src/base-consumer -B $S/mc-cons2-$v -G "Ninja Multi-Config" -DCMAKE_MAKE_PROGRAM=$NINJA -DCMAKE_C_COMPILER=gcc -DCMAKE_PREFIX_PATH=$P >/dev/null
  ocx package exec kitware/cmake:$v -- cmake --build $S/mc-cons2-$v --config Debug >/dev/null && $S/mc-cons2-$v/Debug/baseconsumer
  ocx package exec kitware/cmake:$v -- cmake --build $S/mc-cons2-$v --config Release >/dev/null && $S/mc-cons2-$v/Release/baseconsumer
done

# Debug-only install: default silent fallback vs forced failure.
v=4.4; P=$S/mc-pfx-debugonly-$v
ocx package exec kitware/cmake:$v -- cmake -S $S/src/base -B $S/mc-b-donly-$v -G "Ninja Multi-Config" -DCMAKE_MAKE_PROGRAM=$NINJA -DCMAKE_C_COMPILER=gcc -DCMAKE_INSTALL_PREFIX=$P >/dev/null
ocx package exec kitware/cmake:$v -- cmake --build $S/mc-b-donly-$v --config Debug >/dev/null
ocx package exec kitware/cmake:$v -- cmake --install $S/mc-b-donly-$v --config Debug >/dev/null
echo "[$v] default: Release request against Debug-only install (no MAP_IMPORTED_CONFIG)"
ocx package exec kitware/cmake:$v -- cmake -S $S/src/base-consumer -B $S/mc-cons-donly-$v -G "Ninja Multi-Config" -DCMAKE_MAKE_PROGRAM=$NINJA -DCMAKE_C_COMPILER=gcc -DCMAKE_PREFIX_PATH=$P >/dev/null
ocx package exec kitware/cmake:$v -- cmake --build $S/mc-cons-donly-$v --config Release; echo "exit=$?"
echo "[$v] CMAKE_MAP_IMPORTED_CONFIG_RELEASE= (empty, suppress fallback)"
ocx package exec kitware/cmake:$v -- cmake -S $S/src/base-consumer -B $S/mc-cons-nomap2-$v -G "Ninja Multi-Config" -DCMAKE_MAKE_PROGRAM=$NINJA -DCMAKE_C_COMPILER=gcc -DCMAKE_PREFIX_PATH=$P -DCMAKE_MAP_IMPORTED_CONFIG_RELEASE=
