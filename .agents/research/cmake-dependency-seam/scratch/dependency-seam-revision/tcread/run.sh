#!/bin/sh
# Count toolchain-file reads per try_compile signature on 3.31 and 4.4.
# Run from the lore worktree root (ocx needs it). Usage: sh run.sh
S=$(cd "$(dirname "$0")" && pwd)
NINJA=$(ocx package exec ninja-build/ninja -- sh -c 'command -v ninja' 2>/dev/null | tail -n 1)
for v in 3.31 4.4; do
  for m in none check sources whole; do
    rm -rf "$S/b" "$S/log"
    TC_READ_LOG="$S/log" ocx package exec "kitware/cmake:$v" -- cmake -S "$S" -B "$S/b" -G Ninja \
      "-DCMAKE_MAKE_PROGRAM=$NINJA" "-DCMAKE_TOOLCHAIN_FILE=$S/tc.cmake" "-DMODE=$m" >"$S/out.txt" 2>&1
    echo "$v $m reads=$(wc -l <"$S/log") $(grep -e 'MODE=' "$S/out.txt")"
  done
done
rm -rf "$S/b" "$S/log" "$S/out.txt"
