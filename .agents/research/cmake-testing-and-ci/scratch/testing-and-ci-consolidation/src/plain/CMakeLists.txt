cmake_minimum_required(VERSION 3.25...4.4)
project(plain LANGUAGES NONE)
enable_testing()
add_test(NAME hang COMMAND ${CMAKE_COMMAND} -E sleep 3)
