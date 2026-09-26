#!/bin/sh
# TC-08: unset package mode behaves as BOTH in a cross toolchain; TC-09: PROGRAM ONLY vs build-program search.
# Run from the lore worktree root. Usage: sh run.sh
S=$(cd "$(dirname "$0")" && pwd)
for v in 3.31 4.3 4.4; do
  for pm in unset ONLY; do
    rm -rf "$S/b"
    if [ "$pm" = unset ]; then E=""; else E="PKGMODE=$pm"; fi
    env $E ocx package exec "kitware/cmake:$v" -- cmake -S "$S/src" -B "$S/b" -G Ninja -DCMAKE_MAKE_PROGRAM=/bin/true \
      "-DCMAKE_TOOLCHAIN_FILE=$S/tc.cmake" "-DCMAKE_PREFIX_PATH=$S/host" 2>&1 | grep -e 'CROSS=' -e 'foo_FOUND' | sed "s/^/$v pkg=$pm /"
  done
  for gm in unset ONLY BOTH; do
    rm -rf "$S/b"
    if [ "$gm" = unset ]; then E=""; else E="PROGMODE=$gm"; fi
    env $E ocx package exec "kitware/cmake:$v" -- cmake -S "$S/src" -B "$S/b" -G "Unix Makefiles" \
      "-DCMAKE_TOOLCHAIN_FILE=$S/tc.cmake" >"$S/out.txt" 2>&1
    echo "$v prog=$gm exit=$? $(grep -m1 -e 'unable to find a build program' -e 'MAKE=' "$S/out.txt")"
  done
done
rm -rf "$S/b" "$S/out.txt"
