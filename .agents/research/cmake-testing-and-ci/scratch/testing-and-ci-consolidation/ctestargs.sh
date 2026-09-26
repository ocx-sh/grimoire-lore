#!/usr/bin/env bash
# Zero tests through the build system's `test` target, with and without
# CMAKE_CTEST_ARGUMENTS (3.17). Run from the lore worktree root; point SRC at
# this directory's src/. Expected on 3.31.12 and 4.4.2: rc=0 without, nonzero with.
set -u
SRC=${SRC:-$(dirname "$0")/src}
S=${S:-/home/mherwig/.cache/cmake-measure-scratch/testing-and-ci-consolidation}
N=$(ocx package exec ninja-build/ninja -- sh -c 'dirname "$(command -v ninja)"')
for v in 3.31 4.4; do
  X="ocx package exec kitware/cmake:$v --"
  PATH="$N:$PATH" $X cmake --fresh -G Ninja -S "$SRC/empty" -B "$S/build-ctestargs-$v-plain" >/dev/null 2>&1
  PATH="$N:$PATH" $X cmake --build "$S/build-ctestargs-$v-plain" --target test >/dev/null 2>&1
  echo "$v target test, no args rc=$?"
  PATH="$N:$PATH" $X cmake --fresh -G Ninja -S "$SRC/empty" -B "$S/build-ctestargs-$v-args" \
    "-DCMAKE_CTEST_ARGUMENTS=--no-tests=error;--output-on-failure" >/dev/null 2>&1
  PATH="$N:$PATH" $X cmake --build "$S/build-ctestargs-$v-args" --target test >/dev/null 2>&1
  echo "$v target test, CMAKE_CTEST_ARGUMENTS rc=$?"
done
