#!/bin/sh
# Re-run from the lore worktree root: sh run2.sh <proj dir> <build root>
P=$1; B=$2; unset CMAKE_BUILD_TYPE CMAKE_GENERATOR
NINJA=$(ocx package exec ninja-build/ninja -- sh -c 'command -v ninja')
for v in 3.31 4.4; do
  echo "######## cmake $v"
  cm() { ocx package exec kitware/cmake:$v -- cmake "$@"; }
  for h in OFF ON; do
    echo "== VIS HIDE=$h"; cm -G Ninja -S $P/vis -B $B/$v/vis-$h -DCMAKE_MAKE_PROGRAM=$NINJA -DCMAKE_CXX_COMPILER=$P/zigxx.sh -DHIDE=$h >/dev/null 2>&1
    cm --build $B/$v/vis-$h >/dev/null 2>&1; nm -D --defined-only -C $B/$v/vis-$h/libapi.so | grep -e api_fn -e internal_helper -e header_inline
  done
  for d in dirA dirB_longer; do
    for m in OFF ON; do
      mkdir -p $B/$v/$d; cp -r $P/prefix $B/$v/$d/src-$m
      cm -G "Unix Makefiles" -S $B/$v/$d/src-$m -B $B/$v/$d/src-$m/build -DCMAKE_C_COMPILER=/usr/sbin/gcc -DCMAKE_MAKE_PROGRAM=/usr/sbin/make -DMAP=$m >/dev/null 2>&1
      cm --build $B/$v/$d/src-$m/build >/dev/null 2>&1
    done
  done
  for m in OFF ON; do
    printf '== PREFIX MAP=%s cmp: ' $m
    cmp $B/$v/dirA/src-$m/build/CMakeFiles/lib.dir/lib.c.o $B/$v/dirB_longer/src-$m/build/CMakeFiles/lib.dir/lib.c.o && echo identical
    SRC_DIR=$B/$v/dirA/src-$m; printf 'files embedding SRC_DIR: '; grep -rlF --include='*.o' -e "$SRC_DIR" $B/$v/dirA/src-$m/build | wc -l
  done
  for g in Ninja "Unix Makefiles"; do
    for cfg in "STD=17" "STD=20" "STD=20 NOSCAN=ON"; do
      set -- $cfg; D=$(echo "$g-$cfg" | tr ' =' '__')
      echo "== SCAN $g $cfg"
      if [ "$g" = Ninja ]; then MP=$NINJA; else MP=/usr/sbin/make; fi
      cm -G "$g" -S $P/scan -B $B/$v/$D -DCMAKE_MAKE_PROGRAM=$MP -DCMAKE_CXX_COMPILER=$P/zigxx.sh -D$1 ${2:+-D$2} > $B/$v/$D.cfg.log 2>&1; echo "configure exit=$?"
      grep -e 'CMP0155=' -e 'Error' $B/$v/$D.cfg.log | head -3
      grep -rc --include='build.ninja' -e 'CXX_SCAN__' -e 'CXX_DYNDEP__' $B/$v/$D 2>/dev/null
      grep -rl --include='*.make' -e 'ddi' $B/$v/$D 2>/dev/null | head -2
      cm --build $B/$v/$D > $B/$v/$D.build.log 2>&1; echo "build exit=$?"; grep -m2 -i -e 'error' -e 'not found' $B/$v/$D.build.log
    done
  done
  grep -e 'CMAKE_CXX_COMPILER_CLANG_SCAN_DEPS' -e 'CMAKE_CXX_COMPILER_ID:' -e 'CMAKE_CXX_COMPILER_VERSION' $B/$v/Ninja-STD_20/CMakeCache.txt $B/$v/Ninja-STD_20/CMakeFiles/*/CMakeCXXCompiler.cmake 2>/dev/null | head -5
done
