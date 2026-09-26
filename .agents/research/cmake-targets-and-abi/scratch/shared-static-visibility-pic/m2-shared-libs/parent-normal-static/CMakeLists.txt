cmake_minimum_required(VERSION 3.25)
project(parent_normal_static C)
include(FetchContent)
set(BUILD_SHARED_LIBS ON)
FetchContent_Declare(depstatic
  GIT_REPOSITORY file:///home/mherwig/.cache/cmake-measure-scratch/linkage/m2-shared-libs/local-repos/staticdep
  GIT_TAG main
)
FetchContent_MakeAvailable(depstatic)
get_target_property(_t dep TYPE)
message(STATUS "DEP_TARGET_TYPE=${_t}")
