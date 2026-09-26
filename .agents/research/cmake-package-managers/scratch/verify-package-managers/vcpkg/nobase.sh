#!/bin/sh
# Manifest with a version>= constraint and no builtin-baseline (vcpkg-tool 2026-09-26).
V=/home/mherwig/.cache/cmake-measure-scratch/verify-package-managers/vcpkg
export VCPKG_ROOT=$V/root VCPKG_DISABLE_METRICS=1 VCPKG_FORCE_SYSTEM_BINARIES=1
cd $V/nobase
$V/vcpkg-glibc install --dry-run --overlay-ports=$V/overlay --x-install-root=$V/nobase/inst 2>&1 | head -8
echo "rc=$?"
printf '{ "dependencies": [ "foo" ] }\n' > vcpkg.json
echo "--- no constraint, no baseline:"
$V/vcpkg-glibc install --dry-run --overlay-ports=$V/overlay --x-install-root=$V/nobase/inst 2>&1 | head -8
printf '{ "dependencies": [ { "name": "foo", "version>=": "1.0" } ] }\n' > vcpkg.json
