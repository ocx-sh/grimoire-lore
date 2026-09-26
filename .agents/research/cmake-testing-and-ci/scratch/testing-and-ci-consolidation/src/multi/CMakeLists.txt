cmake_minimum_required(VERSION 3.25...4.4)
project(multi LANGUAGES NONE)
enable_testing()
add_test(NAME ok COMMAND ${CMAKE_COMMAND} -E true)
