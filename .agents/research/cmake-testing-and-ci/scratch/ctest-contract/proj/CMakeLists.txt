cmake_minimum_required(VERSION 3.25)
project(ctesttest LANGUAGES NONE)
include(CTest)
add_test(NAME hello COMMAND ${CMAKE_COMMAND} -E true)
