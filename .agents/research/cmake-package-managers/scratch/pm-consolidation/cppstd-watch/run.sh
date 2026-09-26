#!/bin/sh
# Re-run: sh run.sh  (from the lore worktree, so `ocx package exec` resolves)
S=/home/mherwig/.cache/cmake-measure-scratch/pm-consolidation/cppstd-watch
for v in 3.31 4.4; do
  for m in set20 set17 feature20 cli20; do
    extra=""
    mm=$m
    if [ "$m" = cli20 ]; then extra="-DCMAKE_CXX_STANDARD=20"; mm=none; fi
    B="$S/b-$v-$m"
    echo "=== cmake $v mode $m"
    ocx package exec kitware/cmake:$v -- cmake -S "$S/proj" -B "$B" -G Ninja \
      -DCMAKE_TOOLCHAIN_FILE="$S/proj/conan_toolchain_excerpt.cmake" \
      -DCMAKE_CXX_COMPILER="$S/zigcxx.sh" -DMODE=$mm $extra -Werror=dev > "$B.log" 2>&1
    echo "rc=$?"
    grep -e 'Warning' -e 'MODE=' -e 'Error' "$B.log"
    if [ -f "$B/build.ninja" ]; then grep -o -e '-std=[a-z+0-9]*' "$B/build.ninja" | sort -u; fi
  done
done
