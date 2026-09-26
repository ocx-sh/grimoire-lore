#!/bin/bash
# Consumer linking acme::dep against a prefix holding both depConfig.cmake (acme:: namespace) and dep.cps.
# Needs run-cps-order.sh then run-cps-namespace.sh.
S=/home/mherwig/.cache/cmake-measure-scratch/consumable-library-consolidation
cd /home/mherwig/dev/grimoire-lore/.agents/worktrees/java
mkdir -p $S/nscons-src && cp $S/src/consumer/main.c $S/nscons-src/
sed 's/dep::dep/acme::dep/' $S/src/consumer/CMakeLists.txt > $S/nscons-src/CMakeLists.txt
for pv in 4.4; do
  for v in 3.31 4.3 4.4; do
    ocx package exec kitware/cmake:$v -- cmake -S $S/nscons-src -B $S/b-nscons-$v -G "Unix Makefiles" -DCMAKE_C_COMPILER=gcc "-DCMAKE_PREFIX_PATH=$S/pfx-ns-$pv;$S/pfx-$pv" > $S/nscons-$v.log 2>&1
    echo "[consumer $v, prefix built by $pv] exit=$? $(grep ^dep_DIR $S/b-nscons-$v/CMakeCache.txt)"; grep -A3 'CMake Error' $S/nscons-$v.log | head -5
  done
done
