#!/bin/sh
set -e
cd /home/mherwig/dev/grimoire-lore/.agents/worktrees/java
BASE=/home/mherwig/.cache/cmake-measure-scratch/cmk-tgt-abi-wave3
for std in 17 20; do
  sed "s/@STD@/$std/" $BASE/proj/CMakeLists.txt.in > $BASE/proj/CMakeLists.txt
  rm -rf $BASE/build-$std
  ocx package exec kitware/cmake:4.4 -- cmake -S $BASE/proj -B $BASE/build-$std -G Ninja \
    -DCMAKE_CXX_COMPILER=$BASE/zigxx.sh \
    -DCMAKE_MAKE_PROGRAM=/home/mherwig/.ocx/packages/ocx.sh/sha256/e2/ce13b31b82bc8549c97dc762e99514/content/ninja \
    -Wno-dev > $BASE/configure-$std.log 2>&1
  echo "=== std=$std configure exit $? ==="
  grep -n -i -e 'scan' -e 'CMP0155' $BASE/configure-$std.log || true
  echo "-- build.ninja scan-related rules/build stmts (std=$std) --"
  grep -n -e 'dyndep' -e 'scan' -e 'CXX_DYNDEP' -e '\.ddi' -e '\.modmap' $BASE/build-$std/build.ninja | head -30 || true
done
