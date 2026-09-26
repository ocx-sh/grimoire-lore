cmake_minimum_required(VERSION 3.12)
project(dep312 C)
option(BUILD_SHARED_LIBS "shared" OFF)
add_library(depA ${CMAKE_CURRENT_SOURCE_DIR}/../a.c)
