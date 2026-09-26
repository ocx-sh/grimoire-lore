cmake_minimum_required(VERSION 3.20)
project(roothint_conan_probe LANGUAGES NONE)

# Simulate a module (find_ocx-style) force-caching <Name>_ROOT as a hint,
# BEFORE find_package runs.
set(libfoo_ROOT "/home/mherwig/.cache/cmake-measure-scratch/cross/hintroot" CACHE PATH "hint module" FORCE)

message(STATUS "CMAKE_CROSSCOMPILING=${CMAKE_CROSSCOMPILING}")
message(STATUS "CMAKE_SYSROOT=${CMAKE_SYSROOT}")
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
