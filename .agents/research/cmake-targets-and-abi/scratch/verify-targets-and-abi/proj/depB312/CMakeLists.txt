cmake_minimum_required(VERSION 3.12)
project(depB312 C)
option(BUILD_SHARED_LIBS "shared" OFF)
add_library(depB ${CMAKE_CURRENT_SOURCE_DIR}/../a.c)
