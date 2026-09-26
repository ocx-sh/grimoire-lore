cmake_minimum_required(VERSION 3.20)
project(roothint_probe LANGUAGES NONE)

# Simulate a manager (vcpkg/Conan) injecting its own installed-package
# location onto CMAKE_PREFIX_PATH and CMAKE_FIND_ROOT_PATH -- this mirrors
# vcpkg.cmake's z_vcpkg_add_vcpkg_to_cmake_path (both variables, same path;
# microsoft__vcpkg@c4ee5a52d7:scripts/buildsystems/vcpkg.cmake:452,454)
# and Conan 2's CMakeDeps-populated CMAKE_PREFIX_PATH.
set(CMAKE_PREFIX_PATH "/home/mherwig/.cache/cmake-measure-scratch/cross/managerpath")
list(APPEND CMAKE_FIND_ROOT_PATH "/home/mherwig/.cache/cmake-measure-scratch/cross/managerpath")

# vcpkg's own workaround for MODE_PACKAGE=ONLY: append "/" to CMAKE_PREFIX_PATH
# so its non-sysroot install dir is still reachable after re-rooting.
# (vcpkg.cmake:463-469). Toggle with VCPKG_STYLE_SLASH_HACK=ON.
if(VCPKG_STYLE_SLASH_HACK)
  list(APPEND CMAKE_PREFIX_PATH "/")
endif()

# Simulate a module (find_ocx-style) that force-caches <Name>_ROOT as a hint,
# BEFORE find_package runs -- the CMK-MOD-12 / CMK-DEP-13/14 pattern.
set(libfoo_ROOT "/home/mherwig/.cache/cmake-measure-scratch/cross/hintroot" CACHE PATH "hint module" FORCE)

if(DEFINED ENV{TEST_MODE_PACKAGE})
  set(CMAKE_FIND_ROOT_PATH_MODE_PACKAGE "$ENV{TEST_MODE_PACKAGE}")
endif()

message(STATUS "CMAKE_CROSSCOMPILING=${CMAKE_CROSSCOMPILING}")
message(STATUS "CMAKE_FIND_ROOT_PATH=${CMAKE_FIND_ROOT_PATH}")
message(STATUS "CMAKE_PREFIX_PATH=${CMAKE_PREFIX_PATH}")
message(STATUS "MODE_PACKAGE=${CMAKE_FIND_ROOT_PATH_MODE_PACKAGE}")
message(STATUS "libfoo_ROOT=${libfoo_ROOT}")

find_package(libfoo CONFIG QUIET)
if(libfoo_FOUND)
  message(STATUS "RESULT find_package(libfoo) -> ${libfoo_ARCH} (libfoo_DIR=${libfoo_DIR})")
else()
  message(STATUS "RESULT find_package(libfoo) -> NOTFOUND")
endif()
