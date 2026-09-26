#!/bin/sh
# Constraint-free manifest, no baseline, and overrides-without-baseline (vcpkg-tool 2026-09-26).
V=/home/mherwig/.cache/cmake-measure-scratch/verify-package-managers/vcpkg
export VCPKG_ROOT=$V/root VCPKG_DISABLE_METRICS=1 VCPKG_FORCE_SYSTEM_BINARIES=1
export PATH="$(dirname "$(ocx package exec ninja-build/ninja -- sh -c 'command -v ninja')"):$PATH"
mkdir -p $V/nobase2 $V/ovr && cd $V/nobase2
printf '{ "dependencies": [ "foo" ] }\n' > vcpkg.json
echo "--- no constraint, no baseline:"
ocx package exec kitware/cmake:3.31 -- $V/vcpkg-glibc install --dry-run --overlay-ports=$V/overlay --x-install-root=$V/nobase2/inst 2>&1 | grep -v '^$' | head -8
cd $V/ovr
printf '{ "dependencies": [ "foo" ], "overrides": [ { "name": "foo", "version": "0.5" } ] }\n' > vcpkg.json
echo "--- overrides, no baseline:"
ocx package exec kitware/cmake:3.31 -- $V/vcpkg-glibc install --dry-run --overlay-ports=$V/overlay --x-install-root=$V/ovr/inst 2>&1 | grep -v '^$' | head -4
