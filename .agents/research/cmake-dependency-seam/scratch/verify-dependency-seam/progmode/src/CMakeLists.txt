cmake_minimum_required(VERSION 3.25...4.4)
project(pm LANGUAGES NONE)
find_program(DEPPROG depprog)
message(STATUS "MODE=[${CMAKE_FIND_ROOT_PATH_MODE_PROGRAM}] DEPPROG=${DEPPROG}")
