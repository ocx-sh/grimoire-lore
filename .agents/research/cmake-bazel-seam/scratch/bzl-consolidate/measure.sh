#!/bin/sh
# Re-run the CMK-BZL consolidation measurements (2026-09-26).
# Run from the lore worktree root so `ocx package exec` resolves; S = this directory.
# Needs: ocx (kitware/cmake:3.31 and :4.4), make, gcc. Build trees land in $S/build.
S=${S:-$(cd "$(dirname "$0")" && pwd)}
B="$S/build"
printf 'set(CMAKE_C_COMPILER /usr/sbin/gcc)\nset(CMAKE_C_FLAGS_INIT "-fPIC")\n' >"$S/crosstool-like.cmake"
[ -d "$S/symfix/farm" ] || cp -rs "$S/symfix/src" "$S/symfix/farm"
for v in 3.31 4.4; do
  c() { ocx package exec "kitware/cmake:$v" -- cmake "$@"; }
  echo "=== CMake $v"
  echo "-- M1 guarded CPS";      c -S "$S/floor" -B "$B/floor-$v" 2>&1 | grep -e CPS
  echo "-- M1b floor 4.1";       c -S "$S/floor41" -B "$B/f41-$v" 2>&1 | grep -e 'required' || echo "configured"
  echo "-- M2 toolchain";        c -S "$S/tcfile" -B "$B/tc-$v" -DCMAKE_TOOLCHAIN_FILE="$S/caller-tc.cmake" 2>&1 | grep -e TC_MARK
  echo "-- M3 symlinked source"; c -S "$S/symlink" -B "$B/sym-$v" >/dev/null 2>&1
  c --install "$B/sym-$v" --prefix "$B/symp-$v" >/dev/null 2>&1; find "$B/symp-$v" -type l
  echo "-- M5 PIC OFF + -fPIC";  c -S "$S/pic" -B "$B/pic-$v" -G "Unix Makefiles" -DCMAKE_C_COMPILER=/usr/sbin/gcc -DCMAKE_C_FLAGS=-fPIC >/dev/null 2>&1
  c --build "$B/pic-$v" 2>&1 | grep -e relocation -e 'Built target c'
  echo "-- M6 set(CMAKE_C_FLAGS) vs _INIT"; c -S "$S/picflags" -B "$B/picf-$v" -G "Unix Makefiles" -DCMAKE_TOOLCHAIN_FILE="$S/crosstool-like.cmake" >/dev/null 2>&1
  c --build "$B/picf-$v" 2>&1 | grep -e relocation -e 'Built target c'
  echo "-- M7 symlink farm + REAL_PATH"; c -S "$S/symfix/farm" -B "$B/symfix-$v" >/dev/null 2>&1
  c --install "$B/symfix-$v" --prefix "$B/symfixp-$v" >/dev/null 2>&1; find "$B/symfixp-$v" -type l -lname '/*'
done
echo "=== M4 absolute DESTINATION, 4.4 only"
ocx package exec kitware/cmake:4.4 -- cmake -S "$S/absdest" -B "$B/abs-44" -Werror=install-absolute-destination 2>&1 | grep -e 'CMake Error'
echo "=== M8 no-network configure: fetch fails, FETCHCONTENT_SOURCE_DIR_DEP passes"
for v in 3.31 4.4; do
  unshare -rn ocx package exec "kitware/cmake:$v" -- cmake -S "$S/netprobe" -B "$B/net-$v" 2>&1 | grep -e 'Configuring'
  unshare -rn ocx package exec "kitware/cmake:$v" -- cmake -S "$S/netprobe" -B "$B/netok-$v" -DFETCHCONTENT_SOURCE_DIR_DEP="$S/localdep" 2>&1 | grep -e 'localdep' -e 'Configuring'
done
