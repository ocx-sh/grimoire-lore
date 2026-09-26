#!/bin/bash
# install(RUNTIME_DEPENDENCY_SET) with filter regexes under a 3.25 floor on Linux:
# does CMP0207 (new in 4.3, "warns if not set") fire under the configure gate?
set -u
S=/home/mherwig/.cache/cmake-measure-scratch/consumable-library-rev3
cd /home/mherwig/dev/grimoire-lore/.agents/worktrees/java
for v in 3.31 4.3 4.4; do
  PB=$S/rt-base-$v P=$S/rt-pfx-$v; rm -rf $PB $P $S/rtb-$v $S/rta-$v
  ocx package exec kitware/cmake:$v -- cmake -S $S/src/base -B $S/rtb-$v -DCMAKE_C_COMPILER=gcc -DCMAKE_INSTALL_PREFIX=$PB >/dev/null
  ocx package exec kitware/cmake:$v -- cmake --build $S/rtb-$v >/dev/null && ocx package exec kitware/cmake:$v -- cmake --install $S/rtb-$v >/dev/null
  G=-Werror=dev; [ $v = 4.4 ] && G=-Werror=author
  ocx package exec kitware/cmake:$v -- cmake -S $S/src/rtdeps -B $S/rta-$v -DCMAKE_C_COMPILER=gcc -DCMAKE_PREFIX_PATH=$PB -DCMAKE_INSTALL_PREFIX=$P $G > $S/rta-$v.log 2>&1; e=$?
  echo "[$v $G] configure=$e CMP0207 mentions: $(grep -c CMP0207 $S/rta-$v.log)"
  ocx package exec kitware/cmake:$v -- cmake --build $S/rta-$v >/dev/null 2>&1
  ocx package exec kitware/cmake:$v -- cmake --install $S/rta-$v > $S/rta-install-$v.log 2>&1; e=$?
  echo "[$v] install=$e CMP0207 mentions: $(grep -c CMP0207 $S/rta-install-$v.log); installed libs:"; find $P -name 'libbase*' -printf '%P\n'
done
