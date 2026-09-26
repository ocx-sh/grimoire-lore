#!/bin/sh
# VCPKG-15: does a port OPTIONS -D beat the chainload toolchain's non-FORCE cache entry?
# Run from the lore worktree so `ocx package exec` resolves: sh run.sh
D=/home/mherwig/.cache/cmake-measure-scratch/verify-package-managers/w3/crt
for v in 3.31 4.3 4.4; do
  for m in none cli clityped; do
    B="$D/b-$v-$m"
    case $m in none) X= ;; cli) X=-DCMAKE_MSVC_RUNTIME_LIBRARY=CLI_VALUE ;; clityped) X=-DCMAKE_MSVC_RUNTIME_LIBRARY:STRING=CLI_VALUE ;; esac
    out=$(ocx package exec kitware/cmake:$v -- cmake -S "$D/proj" -B "$B" -DCMAKE_TOOLCHAIN_FILE="$D/tc.cmake" $X -Werror=dev 2>&1)
    rc=$?
    echo "cmake $v $m rc=$rc $(echo "$out" | grep -o 'RT=.*') warnings=$(echo "$out" | grep -c -i -e warning)"
    ocx package exec kitware/cmake:$v -- cmake -E rm -rf "$B"
  done
done
