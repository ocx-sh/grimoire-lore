cmake_minimum_required(VERSION 3.27)
message(STATUS "[h02] before project(): CMAKE_TOOLCHAIN_FILE=${CMAKE_TOOLCHAIN_FILE}")
project(h02test LANGUAGES C)
message(STATUS "[h02] after project(): CMAKE_TOOLCHAIN_FILE(effective)=${CMAKE_TOOLCHAIN_FILE}")
# Attempt to set it AFTER project() -- should be too late
set(CMAKE_TOOLCHAIN_FILE "/home/mherwig/.cache/cmake-measure-scratch/resolution-order/h02-toolchain/marker-toolchain.cmake" CACHE FILEPATH "" FORCE)
message(STATUS "[h02] after late set(): CMAKE_TOOLCHAIN_FILE=${CMAKE_TOOLCHAIN_FILE}")
message(STATUS "[h02] H02_TOOLCHAIN_READ=${H02_TOOLCHAIN_READ}")
