#!/bin/bash
# Versioned find_package against a Config package that ships no ConfigVersion file.
S=/home/mherwig/.cache/cmake-measure-scratch/consumable-library-consolidation
cd /home/mherwig/dev/grimoire-lore/.agents/worktrees/java
mkdir -p $S/pfx-nover && cp -r $S/pfx-4.4/. $S/pfx-nover/
rm -r $S/pfx-nover/lib64/cps $S/pfx-nover/lib64/cmake/dep/depConfigVersion.cmake
cp $S/src/consumer/CMakeLists.txt $S/cons-src/CMakeLists.txt
for v in 3.31 4.4; do
  ocx package exec kitware/cmake:$v -- cmake -S $S/cons-src -B $S/b-nover-$v -G "Unix Makefiles" -DCMAKE_C_COMPILER=gcc -DCMAKE_PREFIX_PATH=$S/pfx-nover > $S/nover-$v.log 2>&1
  echo "[$v] exit=$?"; grep -v '^--' $S/nover-$v.log | head -8
done
