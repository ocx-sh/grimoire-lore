cmake_minimum_required(VERSION 3.25)
project(consumer LANGUAGES C)

include(FetchContent)

set(DEP_GIT_REPO "file:///home/mherwig/.cache/cmake-measure-scratch/resolution-order/dep-gitsrc")
set(DEP_GIT_TAG "836a555d129e4abb9ae929272b0cfed18997c090")

set(_fc_args GIT_REPOSITORY ${DEP_GIT_REPO} GIT_TAG ${DEP_GIT_TAG})

option(SCEN_FIND_PACKAGE_ARGS "add FIND_PACKAGE_ARGS" OFF)
option(SCEN_OVERRIDE "add OVERRIDE_FIND_PACKAGE" OFF)
option(SCEN_DO_MAKEAVAILABLE "call FetchContent_MakeAvailable" ON)
option(SCEN_LATER_FIND_PACKAGE "call a later plain find_package(dep)" OFF)

if(SCEN_FIND_PACKAGE_ARGS)
  list(APPEND _fc_args FIND_PACKAGE_ARGS)
endif()
if(SCEN_OVERRIDE)
  list(APPEND _fc_args OVERRIDE_FIND_PACKAGE)
endif()

message(STATUS "[scenario] FetchContent_Declare(dep ${_fc_args})")
FetchContent_Declare(dep ${_fc_args})

if(SCEN_DO_MAKEAVAILABLE)
  FetchContent_MakeAvailable(dep)
endif()

if(SCEN_LATER_FIND_PACKAGE)
  find_package(dep CONFIG QUIET)
  message(STATUS "[scenario] later find_package: dep_FOUND=${dep_FOUND} dep_DIR=${dep_DIR} dep_VERSION=${dep_VERSION}")
endif()

if(TARGET dep)
  message(STATUS "[scenario] TARGET dep exists")
else()
  message(STATUS "[scenario] TARGET dep does NOT exist")
endif()
message(STATUS "[scenario] dep_SOURCE_DIR=${dep_SOURCE_DIR}")
message(STATUS "[scenario] dep_DIR=${dep_DIR}")
message(STATUS "[scenario] dep_VERSION=${dep_VERSION}")
message(STATUS "[scenario] dep_POPULATED=${dep_POPULATED}")
message(STATUS "[scenario] REDIRECTS_DIR=${CMAKE_FIND_PACKAGE_REDIRECTS_DIR}")
