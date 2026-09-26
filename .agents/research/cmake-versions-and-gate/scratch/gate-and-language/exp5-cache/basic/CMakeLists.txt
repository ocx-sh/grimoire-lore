cmake_minimum_required(VERSION 3.25)
project(cache_test LANGUAGES NONE)
set(X "${INPUT_VALUE}" CACHE STRING "d")
message(STATUS "X=${X}")
