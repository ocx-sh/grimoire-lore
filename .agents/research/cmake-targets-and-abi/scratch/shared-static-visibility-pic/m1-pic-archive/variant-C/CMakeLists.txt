cmake_minimum_required(VERSION 3.25)
project(picarchive_c C)
include(FetchContent)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)
FetchContent_Declare(statdep
  GIT_REPOSITORY file:///home/mherwig/.cache/cmake-measure-scratch/linkage/m1-pic-archive/local-repo
  GIT_TAG main
)
FetchContent_MakeAvailable(statdep)
add_library(shared SHARED ../shared.c)
target_link_libraries(shared PRIVATE stat)
