cmake_minimum_required(VERSION 3.25)
project(cache_internal_test LANGUAGES NONE)
set(Y "${INPUT_VALUE}" CACHE INTERNAL "d")
message(STATUS "Y=${Y}")
