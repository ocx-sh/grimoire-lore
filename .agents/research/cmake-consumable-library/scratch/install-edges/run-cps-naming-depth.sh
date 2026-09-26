#!/bin/bash
# CPS naming: a case-only namespace mismatch (Dep:: vs dep) and an EXPORT_NAME
# differing from the target name, on 4.3.4 and 4.4.2.
set -u
S=/home/mherwig/.cache/cmake-measure-scratch/install-edges
cd /home/mherwig/dev/grimoire-lore/.agents/worktrees/java

echo "### case-only namespace: dep exported as Dep:: (package name stays 'dep') ###"
for v in 4.3 4.4; do
  P=$S/mc-pfx-$v
  ocx package exec kitware/cmake:$v -- cmake -S $S/src/ns-case -B $S/b-nscase-$v -G "Unix Makefiles" -DCMAKE_C_COMPILER=gcc -DCMAKE_INSTALL_PREFIX=$S/pfx-nscase-$v -DCMAKE_PREFIX_PATH=$P -DDEP_CPS=ON -DDEP_CPS_SCHEMA= -DDEP_GENEX=OFF >/dev/null
  ocx package exec kitware/cmake:$v -- cmake --build $S/b-nscase-$v >/dev/null
  ocx package exec kitware/cmake:$v -- cmake --install $S/b-nscase-$v >/dev/null
  echo "[$v] .cps components key:"; grep -A2 '"components"' $S/pfx-nscase-$v/lib64/cps/dep/dep.cps | head -4
  PP="$S/pfx-nscase-$v;$P"
  echo "[$v] consumer linking Dep::dep (matches install(EXPORT) NAMESPACE):"
  ocx package exec kitware/cmake:$v -- cmake -S $S/src/cons-Depdep -B $S/b-consDep2-$v -G "Unix Makefiles" -DCMAKE_C_COMPILER=gcc -DCMAKE_PREFIX_PATH="$PP" 2>&1 | tail -3
  echo "[$v] consumer linking dep::dep (matches CPS-defined name):"
  ocx package exec kitware/cmake:$v -- cmake -S $S/src/consumer -B $S/b-consdep2-$v -G "Unix Makefiles" -DCMAKE_C_COMPILER=gcc -DCMAKE_PREFIX_PATH="$PP" 2>&1 | tail -3
done

echo "### EXPORT_NAME depimpl (differs from the target name 'dep') ###"
for v in 4.3 4.4; do
  P=$S/mc-pfx-$v
  ocx package exec kitware/cmake:$v -- cmake -S $S/src/exportname -B $S/b-exportname-$v -G "Unix Makefiles" -DCMAKE_C_COMPILER=gcc -DCMAKE_INSTALL_PREFIX=$S/pfx-exportname-$v -DCMAKE_PREFIX_PATH=$P -DDEP_CPS=ON -DDEP_CPS_SCHEMA= -DDEP_GENEX=OFF >/dev/null
  ocx package exec kitware/cmake:$v -- cmake --build $S/b-exportname-$v >/dev/null
  ocx package exec kitware/cmake:$v -- cmake --install $S/b-exportname-$v >/dev/null
  grep -A3 '"components"' $S/pfx-exportname-$v/lib64/cps/dep/dep.cps | head -4
  grep 'add_library(' $S/pfx-exportname-$v/lib64/cmake/dep/depTargets.cmake
  PP="$S/pfx-exportname-$v;$P"
  echo "[$v] consumer linking dep::depimpl:"
  ocx package exec kitware/cmake:$v -- cmake -S $S/src/cons-depimpl -B $S/b-consdepimpl-$v -G "Unix Makefiles" -DCMAKE_C_COMPILER=gcc -DCMAKE_PREFIX_PATH="$PP" 2>&1 | tail -3
  ocx package exec kitware/cmake:$v -- cmake --build $S/b-consdepimpl-$v 2>&1 | tail -2
done

echo "### pkg-config depth: CMAKE_INSTALL_LIBDIR=lib/x86_64-linux-gnu ###"
for v in 3.31 4.4; do
  P=$S/pfx-multiarch-$v
  ocx package exec kitware/cmake:$v -- cmake -S $S/src/base -B $S/b-multiarch-$v -G "Unix Makefiles" -DCMAKE_C_COMPILER=gcc -DCMAKE_INSTALL_PREFIX=$P -DCMAKE_INSTALL_LIBDIR=lib/x86_64-linux-gnu >/dev/null
  ocx package exec kitware/cmake:$v -- cmake --build $S/b-multiarch-$v >/dev/null
  ocx package exec kitware/cmake:$v -- cmake --install $S/b-multiarch-$v >/dev/null
  echo "[$v] hard-coded ../.. base.pc.in, pkg-config --variable=prefix:"
  PKG_CONFIG_PATH=$P/lib/x86_64-linux-gnu/pkgconfig pkg-config --variable=prefix base
  echo "  (expected: $P)"

  P2=$S/pfx-relpath-multiarch-$v
  ocx package exec kitware/cmake:$v -- cmake -S $S/src/base-relpath -B $S/b-relpath-multiarch-$v -G "Unix Makefiles" -DCMAKE_C_COMPILER=gcc -DCMAKE_INSTALL_PREFIX=$P2 -DCMAKE_INSTALL_LIBDIR=lib/x86_64-linux-gnu >/dev/null
  ocx package exec kitware/cmake:$v -- cmake --build $S/b-relpath-multiarch-$v >/dev/null
  ocx package exec kitware/cmake:$v -- cmake --install $S/b-relpath-multiarch-$v >/dev/null
  echo "[$v] file(RELATIVE_PATH)-computed base.pc.in, pkg-config --variable=prefix:"
  PKG_CONFIG_PATH=$P2/lib/x86_64-linux-gnu/pkgconfig pkg-config --variable=prefix base
  echo "  (expected: $P2)"
done
