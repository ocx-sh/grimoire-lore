cmake_minimum_required(VERSION 3.25...4.4)
project(prefix C)
option(MAP "prefix map" OFF)
add_library(lib STATIC lib.c)
target_compile_options(lib PRIVATE -g)
if(MAP AND CMAKE_C_COMPILER_ID MATCHES "GNU|Clang")
  target_compile_options(lib PRIVATE
    "-ffile-prefix-map=${CMAKE_SOURCE_DIR}=/src"
    "-ffile-prefix-map=${CMAKE_BINARY_DIR}=/build")
endif()
