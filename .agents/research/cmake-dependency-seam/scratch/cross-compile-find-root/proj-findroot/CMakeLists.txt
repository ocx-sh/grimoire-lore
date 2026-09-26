cmake_minimum_required(VERSION 3.20)
project(findroot_probe LANGUAGES NONE)

message(STATUS "CMAKE_CROSSCOMPILING=${CMAKE_CROSSCOMPILING}")
message(STATUS "CMAKE_SYSROOT=${CMAKE_SYSROOT}")
message(STATUS "CMAKE_FIND_ROOT_PATH=${CMAKE_FIND_ROOT_PATH}")
message(STATUS "MODE_PROGRAM=${CMAKE_FIND_ROOT_PATH_MODE_PROGRAM}")
message(STATUS "MODE_LIBRARY=${CMAKE_FIND_ROOT_PATH_MODE_LIBRARY}")
message(STATUS "MODE_INCLUDE=${CMAKE_FIND_ROOT_PATH_MODE_INCLUDE}")
message(STATUS "MODE_PACKAGE=${CMAKE_FIND_ROOT_PATH_MODE_PACKAGE}")

set(CMAKE_PREFIX_PATH "/home/mherwig/.cache/cmake-measure-scratch/cross/host/usr")

find_package(libfoo CONFIG QUIET)
if(libfoo_FOUND)
  message(STATUS "RESULT find_package(libfoo) -> ${libfoo_ARCH} (libfoo_DIR=${libfoo_DIR})")
else()
  message(STATUS "RESULT find_package(libfoo) -> NOTFOUND")
endif()

find_library(LIBFOO_A NAMES libfoo.a foo)
if(LIBFOO_A)
  message(STATUS "RESULT find_library(libfoo) -> ${LIBFOO_A}")
else()
  message(STATUS "RESULT find_library(libfoo) -> NOTFOUND")
endif()

# onlyhost exists ONLY under the host prefix, never under the sysroot -- this
# isolates whether the DEFAULT (unset) CMAKE_FIND_ROOT_PATH_MODE_PACKAGE
# behaves as ONLY (never reaches the host copy) or BOTH (falls through to it).
find_package(onlyhost CONFIG QUIET)
if(onlyhost_FOUND)
  message(STATUS "RESULT find_package(onlyhost) -> FOUND (onlyhost_DIR=${onlyhost_DIR})")
else()
  message(STATUS "RESULT find_package(onlyhost) -> NOTFOUND")
endif()
