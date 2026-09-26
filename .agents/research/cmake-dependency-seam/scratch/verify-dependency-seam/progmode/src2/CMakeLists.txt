cmake_minimum_required(VERSION 3.25...4.4)
project(pm LANGUAGES NONE)
find_program(DEPPROG depprog NO_CMAKE_FIND_ROOT_PATH)
message(STATUS "NO_CMAKE_FIND_ROOT_PATH DEPPROG=${DEPPROG}")
