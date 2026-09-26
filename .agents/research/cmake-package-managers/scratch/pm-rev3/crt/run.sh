#!/bin/sh
# Run from the lore worktree: sh <this dir>/run.sh
D=$(cd "$(dirname "$0")" && pwd)
for v in 3.31 4.4; do
  for m in cli none; do
    B="$D/build-$v-$m"
    if [ "$m" = cli ]; then X=-DCMAKE_MSVC_RUNTIME_LIBRARY=CLI_VALUE; else X=; fi
    out=$(ocx package exec kitware/cmake:$v -- cmake -S "$D/proj" -B "$B" -DCMAKE_TOOLCHAIN_FILE="$D/toolchain.cmake" $X -Werror=dev 2>&1)
    echo "$v $m rc=$? $(echo "$out" | grep -e 'RT=') warnings=$(echo "$out" | grep -c -i -e warning)"
    cmake -E rm -rf "$B" 2>/dev/null || ocx package exec kitware/cmake:$v -- cmake -E rm -rf "$B"
  done
done
