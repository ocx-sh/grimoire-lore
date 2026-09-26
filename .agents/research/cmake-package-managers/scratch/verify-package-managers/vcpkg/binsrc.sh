#!/bin/sh
# vcpkg-tool 2026-09-26 (51bf87ca6e): how VCPKG_BINARY_SOURCES tokens parse; artifacts presence.
V=/home/mherwig/.cache/cmake-measure-scratch/verify-package-managers/vcpkg
export VCPKG_ROOT=$V/root VCPKG_DISABLE_METRICS=1 VCPKG_FORCE_SYSTEM_BINARIES=1
mkdir -p $V/app && cd $V/app
printf '{ "dependencies": [] }\n' > vcpkg.json
for src in "clear;files,$V/cache,readwrite" "clear;x-gha,readwrite" "clear;bogus,readwrite"; do
  mkdir -p $V/cache
  VCPKG_BINARY_SOURCES="$src" $V/vcpkg-glibc install --x-install-root=$V/app/inst > $V/out.log 2>&1
  echo "sources=[$src] rc=$?"; grep -i -e 'x-gha' -e 'unknown binary' -e 'error' $V/out.log | head -3
done
echo "--- files created in app dir after install:"; ls -A $V/app
echo "--- artifacts commands:"; $V/vcpkg-glibc help activate 2>&1 | head -3
