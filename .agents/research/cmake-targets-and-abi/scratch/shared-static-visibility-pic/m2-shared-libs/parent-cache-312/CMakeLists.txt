cmake_minimum_required(VERSION 3.25)
project(parent_cache_312 C)
include(FetchContent)
FetchContent_Declare(depnotype
  GIT_REPOSITORY file:///home/mherwig/.cache/cmake-measure-scratch/linkage/m2-shared-libs/local-repos/notype312
  GIT_TAG main
)
FetchContent_MakeAvailable(depnotype)
get_target_property(_t dep TYPE)
message(STATUS "DEP_TARGET_TYPE=${_t}")
