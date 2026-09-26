#!/bin/sh
# Re-run from the lore worktree root: sh run.sh <proj dir> <build root>
P=$1; B=$2; unset CMAKE_BUILD_TYPE CMAKE_GENERATOR
NINJA=$(ocx package exec ninja-build/ninja -- sh -c 'command -v ninja')
MK="-DCMAKE_C_COMPILER=/usr/sbin/gcc -DCMAKE_MAKE_PROGRAM=/usr/sbin/make"
for v in 3.31 4.4; do
  echo "######## cmake $v"
  cm() { ocx package exec kitware/cmake:$v -- cmake "$@"; }
  echo "== C1 bt-noforce";  cm -G "Unix Makefiles" -S $P/bt-noforce -B $B/$v/btn $MK 2>&1 | grep -e AFTER; grep -e '^CMAKE_BUILD_TYPE:' $B/$v/btn/CMakeCache.txt
  echo "== C3 bt-force";    cm -G "Unix Makefiles" -S $P/bt-force -B $B/$v/btf $MK 2>&1 | grep -e AFTER
  echo "== C2 bt-sub";      cm -G "Unix Makefiles" -S $P/bt-sub -B $B/$v/bts $MK 2>&1 | grep -e PARENT_AFTER; grep -h -e 'C_FLAGS' $B/$v/bts/CMakeFiles/parentlib.dir/flags.make
  echo "== snippet single"; cm -G "Unix Makefiles" -S $P/bt-snippet -B $B/$v/snip1 $MK 2>&1 | grep -e SNIP
  echo "== snippet single -DCMAKE_BUILD_TYPE=Debug"; cm -G "Unix Makefiles" -S $P/bt-snippet -B $B/$v/snip2 $MK -DCMAKE_BUILD_TYPE=Debug 2>&1 | grep -e SNIP
  echo "== snippet NMC";    cm -S $P/bt-snippet -B $B/$v/snip3 -G "Ninja Multi-Config" -DCMAKE_C_COMPILER=/usr/sbin/gcc -DCMAKE_MAKE_PROGRAM=$NINJA 2>&1 | grep -e SNIP
  echo "== C4 mc-pre NMC";  cm -S $P/mc-pre -B $B/$v/mcpre -G "Ninja Multi-Config" -DCMAKE_MAKE_PROGRAM=$NINJA 2>&1 | grep -e PRE: -e POST:
  echo "== bsl-normal";     cm -G "Unix Makefiles" -S $P/bsl-normal -B $B/$v/bsln $MK 2>&1 | grep -e DEPA_TYPE -e 'Policy CMP0077'
  echo "== C5 bsl-scoped";  cm -G "Unix Makefiles" -S $P/bsl-scoped -B $B/$v/bsls $MK 2>&1 | grep -e DEPA_TYPE -e 'Policy CMP0077'
  echo "== C6 bsl-force -DBUILD_SHARED_LIBS=OFF"; cm -G "Unix Makefiles" -S $P/bsl-force -B $B/$v/bslf $MK -DBUILD_SHARED_LIBS=OFF 2>&1 | grep -e DEP_TYPE
  for mode in none var prop; do
    case $mode in none) X="";; var) X="-DCMAKE_POSITION_INDEPENDENT_CODE=ON";; prop) X="-DSTAT_PROP=ON";; esac
    echo "== PIC $mode"; cm -G "Unix Makefiles" -S $P/pic -B $B/$v/pic-$mode $MK -DCMAKE_EXPORT_COMPILE_COMMANDS=ON $X >/dev/null 2>&1
    cm --build $B/$v/pic-$mode 2>&1 | grep -o -m1 -e 'relocation R_X86_64_[A-Z0-9]* against [^;]*' ; echo "build exit (last grep status ignored)"; test -f $B/$v/pic-$mode/libshared.so && echo "libshared.so BUILT" || echo "libshared.so NOT built"
  done
  for ow in OFF ON; do
    echo "== TGT-04 OVERWRITE=$ow"; cm -G "Unix Makefiles" -S $P/pic-flags -B $B/$v/pf-$ow $MK -DCMAKE_TOOLCHAIN_FILE=$P/pic-flags/toolchain.cmake -DOVERWRITE=$ow >/dev/null 2>&1
    grep -h -e 'C_FLAGS' $B/$v/pf-$ow/CMakeFiles/stat.dir/flags.make
    cm --build $B/$v/pf-$ow >/dev/null 2>&1; test -f $B/$v/pf-$ow/libshared.so && echo "libshared.so BUILT" || echo "libshared.so NOT built"
  done
  for it in m pthread mispeled /usr/lib/libm.so.6 Threads::Threads; do
    echo "== ONLY_TARGETS ITEM=$it"; cm -S $P/ot -B $B/$v/ot-$(echo $it | tr '/:' '__') $MK "-DITEM=$it" > $B/$v/ot.log 2>&1; echo "exit=$?"
    grep -n -e 'Configuring done' -e 'not a target' -e 'Generating done' $B/$v/ot.log | head -4
  done
done
