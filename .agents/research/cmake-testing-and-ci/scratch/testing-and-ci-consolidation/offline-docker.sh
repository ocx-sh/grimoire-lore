#!/usr/bin/env bash
# The offline probe as a --network none container: checkout and the pinned
# CMake/Ninja mounted read-only. Needs Docker and the bitnami/git image (any
# glibc image works; it only has to be present locally). Run from the lore
# worktree root. Expected: empty -> rc 0, netfetch -> rc 1 "Could not resolve hostname".
set -u
S=${S:-/home/mherwig/.cache/cmake-measure-scratch/testing-and-ci-consolidation}
R=$(ocx package exec kitware/cmake:4.4 -- sh -c 'dirname "$(dirname "$(command -v cmake)")"')
N=$(ocx package exec ninja-build/ninja -- sh -c 'dirname "$(command -v ninja)"')
for p in empty netfetch; do
  docker run --rm --network none \
    -v "$R:/opt/cmake:ro" -v "$N:/opt/ninja:ro" -v "$S/src:/src:ro" \
    --entrypoint /opt/cmake/bin/cmake bitnami/git:latest \
    -G Ninja -DCMAKE_MAKE_PROGRAM=/opt/ninja/ninja -S "/src/$p" -B /tmp/b >"$S/offline-$p.log" 2>&1
  echo "$p rc=$? $(grep -m1 -o -e 'Could not resolve hostname' "$S/offline-$p.log")"
done
