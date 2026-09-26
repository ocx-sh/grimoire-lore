#!/bin/sh
set -e
BASE=/home/mherwig/.cache/cmake-measure-scratch/cmk-tgt-abi-wave3
cd /home/mherwig/dev/grimoire-lore/.agents/worktrees/java
rm -rf $BASE/build-20-off
ocx package exec kitware/cmake:4.4 -- cmake -S $BASE/proj -B $BASE/build-20-off -G Ninja \
  -DCMAKE_CXX_COMPILER=$BASE/zigxx.sh \
  -DCMAKE_MAKE_PROGRAM=/home/mherwig/.ocx/packages/ocx.sh/sha256/e2/ce13b31b82bc8549c97dc762e99514/content/ninja \
  -Wno-dev > $BASE/configure-20-off.log 2>&1
echo "exit $?"
grep -n -e 'app_unscanned' -e 'app_scanned' $BASE/build-20-off/build.ninja || true
