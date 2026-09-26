cmake_minimum_required(VERSION 3.25)
set(CMAKE_TOOLCHAIN_FILE ${CMAKE_CURRENT_SOURCE_DIR}/project-tc.cmake)
project(tcprobe NONE)
message(STATUS "TC_MARK=${TC_MARK}")
