#!/bin/bash
# export(PACKAGE) under a pre-3.15 floor (rapidjson's 3.5), default policies,
# throwaway HOME. Then the real rapidjson CMakeLists (corpus clone, out-of-source).
set -u
S=/home/mherwig/.cache/cmake-measure-scratch/consumable-library-rev3
RJ=/home/mherwig/.cache/research-lang/exemplars/cmake/Tencent__rapidjson
cd /home/mherwig/dev/grimoire-lore/.agents/worktrees/java
for v in 3.31 4.4; do
  H=$S/home-35-$v; rm -rf "$H" "$S/b-35-$v"; mkdir -p "$H"
  HOME=$H ocx package exec kitware/cmake:$v -- cmake -S $S/src/exportpkg35 -B $S/b-35-$v >/dev/null 2>&1; echo "[$v floor 3.5] configure exit=$?"
  echo "[$v floor 3.5] registry files:"; find "$H/.cmake" -type f 2>/dev/null
  H=$S/home-rj-$v; rm -rf "$H" "$S/b-rj-$v"; mkdir -p "$H"
  HOME=$H ocx package exec kitware/cmake:$v -- cmake -S $RJ -B $S/b-rj-$v -DCMAKE_CXX_COMPILER=$S/zigcxx \
    -DRAPIDJSON_BUILD_DOC=OFF -DRAPIDJSON_BUILD_EXAMPLES=OFF -DRAPIDJSON_BUILD_TESTS=OFF > $S/rj-$v.log 2>&1; echo "[$v rapidjson] configure exit=$?"
  echo "[$v rapidjson] registry files:"; find "$H/.cmake" -type f 2>/dev/null | sed "s|$H|\$HOME|"
done
