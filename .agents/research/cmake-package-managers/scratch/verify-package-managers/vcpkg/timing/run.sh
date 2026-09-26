#!/bin/sh
# vcpkg.cmake (vcpkg-tool 2026-09-26 bundle): does a VCPKG_TARGET_TRIPLET set after project() take effect?
V=/home/mherwig/.cache/cmake-measure-scratch/verify-package-managers/vcpkg
P=$V/timing
for v in 3.31 4.3 4.4; do for m in before after cli; do
  extra=""; [ $m = cli ] && extra="-DVCPKG_TARGET_TRIPLET=arm64-linux"
  rm -rf $P/b
  VCPKG_ROOT=$V/root ocx package exec kitware/cmake:$v -- cmake -S $P/src -B $P/b -DMODE=$m $extra \
    -DCMAKE_TOOLCHAIN_FILE=$V/root/scripts/buildsystems/vcpkg.cmake -DVCPKG_MANIFEST_MODE=OFF \
    -DVCPKG_INSTALLED_DIR=$P/inst > $P/log 2>&1
  echo "cmake $v rc=$? $(grep -o 'MODE=.*' $P/log)"
done; done
rm -rf $P/b
