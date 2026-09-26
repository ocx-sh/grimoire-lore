cmake_minimum_required(VERSION 3.25...4.4)
project(sentinel LANGUAGES NONE)
enable_testing()
# ClickHouse idiom: a succeeding command inverted by WILL_FAIL
add_test(NAME inverted COMMAND ${CMAKE_COMMAND} -E echo "prerequisite missing")
set_tests_properties(inverted PROPERTIES WILL_FAIL ON)
# direct form: a command that fails, no inversion
add_test(NAME direct COMMAND ${CMAKE_COMMAND} -E false)
