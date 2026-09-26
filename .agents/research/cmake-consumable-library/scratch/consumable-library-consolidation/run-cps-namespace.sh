#!/bin/bash
# install(PACKAGE_INFO dep) when the export set's NAMESPACE is not dep:: (acme::), on 4.3.4 and 4.4.2.
# Needs pfx-<v> from run-cps-order.sh (base installed).
S=/home/mherwig/.cache/cmake-measure-scratch/consumable-library-consolidation
cd /home/mherwig/dev/grimoire-lore/.agents/worktrees/java
mkdir -p $S/ns-src && cp -r $S/src/dep/. $S/ns-src/
sed -i 's/NAMESPACE dep::/NAMESPACE acme::/' $S/ns-src/CMakeLists.txt
grep -n 'NAMESPACE' $S/ns-src/CMakeLists.txt
for v in 4.3 4.4; do
  ocx package exec kitware/cmake:$v -- cmake -S $S/ns-src -B $S/b-ns-$v -G "Unix Makefiles" -DCMAKE_C_COMPILER=gcc -DCMAKE_INSTALL_PREFIX=$S/pfx-ns-$v -DCMAKE_PREFIX_PATH=$S/pfx-$v -DDEP_CPS=ON -DDEP_CPS_SCHEMA= -DDEP_GENEX=OFF > $S/ns-$v.log 2>&1
  echo "[$v] configure exit=$?"; grep -v '^--' $S/ns-$v.log | head -8
  ocx package exec kitware/cmake:$v -- cmake --build $S/b-ns-$v > /dev/null 2>&1 && ocx package exec kitware/cmake:$v -- cmake --install $S/b-ns-$v 2>&1 | grep -e cps
  grep -h -e '"name"' -e 'components' $S/pfx-ns-$v/lib64/cps/dep/dep.cps 2>/dev/null | head -3
done
