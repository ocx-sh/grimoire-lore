#!/bin/sh
# Reproduces the six deliberate failures behind dependency-triage-procedure.md.
# Run from this directory. Requires the shared fixtures built by wave 2's
# verify-package-managers dive: a Conan 2.32.0 venv, the vcpkg-tool 2026-09-26
# binary, and the zig-c++ wrapper. Set S to that directory.
set -e
S=/home/mherwig/.cache/cmake-measure-scratch/verify-package-managers
T=/home/mherwig/.cache/cmake-measure-scratch/triage   # scratch build trees go here, not under this repo
ZIGCXX=$S/cppstd/zigcxx.sh
NINJA=$(ocx package exec ninja-build/ninja -- sh -c "command -v ninja")
CMBIN=$(dirname "$(ocx package exec kitware/cmake:4.4 -- sh -c 'command -v cmake')")

echo "=== install two copies of dep (common/dep-src) for failures 1, 2, 4 ==="
ocx package exec kitware/cmake:4.4 -- cmake -S common/dep-src -B "$T/dep-build-A" -DCMAKE_INSTALL_PREFIX="$T/dep-A" -DDEP_MARKER=A
ocx package exec kitware/cmake:4.4 -- cmake --install "$T/dep-build-A"
ocx package exec kitware/cmake:4.4 -- cmake -S common/dep-src -B "$T/dep-build-B" -DCMAKE_INSTALL_PREFIX="$T/dep-B" -DDEP_MARKER=B
ocx package exec kitware/cmake:4.4 -- cmake --install "$T/dep-build-B"

echo "=== Failure 1: FetchContent silently substituted via OVERRIDE_FIND_PACKAGE ==="
for v in 3.31 4.4; do
  ocx package exec kitware/cmake:$v -- cmake -S f1-consumer -B "$T/f1-run-$v" --fresh \
    -DCMAKE_PREFIX_PATH="$T/dep-A" --debug-find-pkg=dep
  grep '^dep_DIR' "$T/f1-run-$v/CMakeCache.txt"   # -> CMakeFiles/pkgRedirects, not dep-A
done

echo "=== Failure 2: wrong of two installed copies via stale dep_DIR (measurement C4) ==="
for v in 3.31 4.4; do
  ocx package exec kitware/cmake:$v -- cmake -S f2-consumer -B "$T/f2-run-$v" --fresh -Ddep_ROOT="$T/dep-A"
  ocx package exec kitware/cmake:$v -- cmake -S f2-consumer -B "$T/f2-run-$v" -Ddep_ROOT="$T/dep-B" --debug-find-pkg=dep
  grep -e '^dep_DIR' -e '^dep_ROOT' "$T/f2-run-$v/CMakeCache.txt"   # dep_DIR still under dep-A
done

echo "=== Failure 2, vcpkg-manifest variant ==="
export VCPKG_ROOT=$S/root VCPKG_DISABLE_METRICS=1 VCPKG_FORCE_SYSTEM_BINARIES=1 CXX=$ZIGCXX
export PATH="$CMBIN:$(dirname "$NINJA"):$PATH"
"$S/vcpkg-glibc" install --x-manifest-root=f2-vcpkg/appA --overlay-ports=f2-vcpkg/overlay-A --x-install-root="$T/vcpkg-installed-A"
"$S/vcpkg-glibc" install --x-manifest-root=f2-vcpkg/appA --overlay-ports=f2-vcpkg/overlay-B --x-install-root="$T/vcpkg-installed-B"
ocx package exec kitware/cmake:4.4 -- cmake -S f2-vcpkg/consumer -B "$T/f2-vcpkg-run" --fresh \
  -DCMAKE_TOOLCHAIN_FILE=$S/root/scripts/buildsystems/vcpkg.cmake -DVCPKG_TARGET_TRIPLET=x64-linux \
  -DVCPKG_MANIFEST_MODE=OFF -DVCPKG_INSTALLED_DIR="$T/vcpkg-installed-A" -DVCPKG_TRACE_FIND_PACKAGE=ON
ocx package exec kitware/cmake:4.4 -- cmake -S f2-vcpkg/consumer -B "$T/f2-vcpkg-run" -DVCPKG_INSTALLED_DIR="$T/vcpkg-installed-B"
grep -e '^widget_DIR' -e '^VCPKG_INSTALLED_DIR' "$T/f2-vcpkg-run/CMakeCache.txt"   # widget_DIR still under installed-A
"$S/vcpkg-glibc" depend-info --x-manifest-root=f2-vcpkg/appA --overlay-ports=f2-vcpkg/overlay-A

echo "=== Failure 3: the real cmake-conan provider, sequencing (CMK-TC-05) ==="
export CONAN_HOME=$S/conanhome PATH=$S/venv/bin:$PATH
ocx package exec kitware/cmake:4.4 -- cmake -S f3-provider -B "$T/f3-run" --fresh -G Ninja \
  -DCMAKE_MAKE_PROGRAM=$NINJA -DCMAKE_CXX_COMPILER=$ZIGCXX -DCMAKE_BUILD_TYPE=Release \
  -DCONAN_HOST_PROFILE=default -DCMAKE_PROJECT_TOP_LEVEL_INCLUDES=$S/provider/conan_provider.cmake
# f3-provider-defer/CMakeLists.txt: cmake_language(DEFER CALL find_package Beta REQUIRED) -- same flags
conan graph info f3-provider --profile:host=default --profile:build=default -s build_type=Release
conan graph explain f3-provider --profile:host=default --profile:build=default -s build_type=Release --format=text

echo "=== Failure 4: a Config missing find_dependency ==="
ocx package exec kitware/cmake:4.4 -- cmake -S f4-dep2-src -B "$T/f4-build" --fresh \
  -DCMAKE_INSTALL_PREFIX="$T/f4-prefix" -Ddep_DIR="$T/dep-A/lib/cmake/dep"
ocx package exec kitware/cmake:4.4 -- cmake --install "$T/f4-build"
# f4-consumer (LANGUAGES NONE, interface-only): configures clean -- the defect is invisible here.
ocx package exec kitware/cmake:4.4 -- cmake -S f4-consumer -B "$T/f4-run-none" --fresh -DCMAKE_PREFIX_PATH="$T/f4-prefix"
# f4-consumer2 (LANGUAGES CXX, a real add_executable): fails at Generate.
for v in 3.31 4.4; do
  ocx package exec kitware/cmake:$v -- cmake -S f4-consumer2 -B "$T/f4-run2-$v" --fresh -G Ninja \
    -DCMAKE_MAKE_PROGRAM=$NINJA -DCMAKE_CXX_COMPILER=$ZIGCXX -DCMAKE_PREFIX_PATH="$T/f4-prefix"
done

echo "=== Failure 5: a fetched dependency with a 3.4 floor, on 4.4.2 ==="
ocx package exec kitware/cmake:4.4 -- cmake -S f5-consumer -B "$T/f5-run" --fresh   # hard error
# f5-consumer with set(CMAKE_POLICY_VERSION_MINIMUM 3.10) around FetchContent_MakeAvailable: clean, zero warnings.

echo "=== Failure 6: a fetched dependency with a 3.7 floor, -Werror=dev on 3.31.12 ==="
ocx package exec kitware/cmake:3.31 -- cmake -S f6-consumer -B "$T/f6-baseline" --fresh -Werror=dev   # errors
# Remedy 1 -- PATCH_COMMAND rewriting the floor (needs a real git remote; see f6-fetched-old37's history):
ocx package exec kitware/cmake:3.31 -- cmake -S f6-remedy1-patch -B "$T/f6-remedy1" --fresh -Werror=dev
# Remedy 2 -- -Wno-error=deprecated alongside -Werror=dev: still errors, -Werror=dev wins independently.
ocx package exec kitware/cmake:3.31 -- cmake -S f6-consumer -B "$T/f6-remedy2" --fresh -Werror=dev -Wno-error=deprecated
# Remedy 3 -- CMAKE_WARN_DEPRECATED OFF: clears the gate, but also silences a real deprecation in the
# project's OWN code (see f6-owncode/CMakeLists.txt) -- it does not "keep the gate live".
ocx package exec kitware/cmake:3.31 -- cmake -S f6-consumer -B "$T/f6-remedy3" --fresh -Werror=dev -DCMAKE_WARN_DEPRECATED=OFF
ocx package exec kitware/cmake:3.31 -- cmake -S f6-owncode -B "$T/f6-owncode-suppressed" --fresh -Werror=dev -DCMAKE_WARN_DEPRECATED=OFF
# Remedy 4 -- re-pin to a version whose floor is already >= 3.10 (see f6-remedy4-repin):
ocx package exec kitware/cmake:3.31 -- cmake -S f6-remedy4-repin -B "$T/f6-remedy4" --fresh -Werror=dev
