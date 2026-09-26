cmake_minimum_required(VERSION 3.25...4.4)
project(n LANGUAGES NONE)
find_package(foo CONFIG REQUIRED)
message(STATUS "WHICH=${FOO_WHICH}")
