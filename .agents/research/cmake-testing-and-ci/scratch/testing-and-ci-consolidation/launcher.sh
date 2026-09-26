#!/usr/bin/env bash
# Does a project-level set(CMAKE_C_COMPILER_LAUNCHER ...) shadow the caller's -D?
# Run from the lore worktree root. Build trees go to $S/build-launcher-<v>-<shadow>.
set -u
S=${S:-/home/mherwig/.cache/cmake-measure-scratch/testing-and-ci-consolidation}
N=$(ocx package exec ninja-build/ninja -- sh -c 'dirname "$(command -v ninja)"')
for v in 3.31 4.4; do
  for sh in ON OFF; do
    B="$S/build-launcher-$v-$sh"
    PATH="$N:$PATH" ocx package exec "kitware/cmake:$v" -- cmake --fresh -G Ninja -S "$S/src/launcher" -B "$B" \
      -DSHADOW="$sh" -DCMAKE_C_COMPILER=gcc -DCMAKE_C_COMPILER_LAUNCHER=userlauncher >/dev/null 2>&1
    echo "$v SHADOW=$sh: $(grep -o -m1 -e userlauncher -e projlauncher "$B/build.ninja")"
  done
done
