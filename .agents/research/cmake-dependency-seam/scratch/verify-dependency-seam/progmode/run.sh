#!/bin/sh
# Is the unset CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER or BOTH? depprog in <sysroot>/usr/bin (target) and host/bin on PATH (host).
# Run from the lore worktree root. Usage: sh run.sh
S=$(cd "$(dirname "$0")" && pwd)
for v in 3.31 4.3 4.4; do
  for m in unset NEVER BOTH; do
    rm -rf "$S/b"
    if [ "$m" = unset ]; then
      PATH="$S/host/bin:$PATH" ocx package exec "kitware/cmake:$v" -- cmake -S "$S/src" -B "$S/b" -G Ninja -DCMAKE_MAKE_PROGRAM=/bin/true "-DCMAKE_TOOLCHAIN_FILE=$S/tc.cmake" 2>&1 | grep -e 'DEPPROG=' | sed "s|$S|\$S|g; s/^/$v /"
    else
      PROGMODE=$m PATH="$S/host/bin:$PATH" ocx package exec "kitware/cmake:$v" -- cmake -S "$S/src" -B "$S/b" -G Ninja -DCMAKE_MAKE_PROGRAM=/bin/true "-DCMAKE_TOOLCHAIN_FILE=$S/tc.cmake" 2>&1 | grep -e 'DEPPROG=' | sed "s|$S|\$S|g; s/^/$v /"
    fi
  done
done
rm -rf "$S/b"
