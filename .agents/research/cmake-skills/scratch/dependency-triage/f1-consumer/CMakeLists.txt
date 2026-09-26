cmake_minimum_required(VERSION 3.25)
project(consumer LANGUAGES NONE)
include(FetchContent)
FetchContent_Declare(dep
  SOURCE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../f1-fetched-dep"
  OVERRIDE_FIND_PACKAGE
)
FetchContent_MakeAvailable(dep)
find_package(dep CONFIG REQUIRED)
