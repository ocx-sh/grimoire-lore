cmake_minimum_required(VERSION 3.25)
project(t3 LANGUAGES NONE)
enable_testing()
set(d ${CMAKE_CURRENT_SOURCE_DIR})
# Negative test pinned to severity + text: must pass for FATAL_ERROR ...
add_test(NAME sev_fatal COMMAND ${CMAKE_COMMAND} -P ${d}/fatal.cmake)
set_tests_properties(sev_fatal PROPERTIES PASS_REGULAR_EXPRESSION "CMake Error at [^\n]*\\(message\\):\n  module: stale lock - run 'ocx lock'")
# ... and must fail when the module regresses to a WARNING with the same text
add_test(NAME sev_warn COMMAND ${CMAKE_COMMAND} -P ${d}/warn.cmake)
set_tests_properties(sev_warn PROPERTIES PASS_REGULAR_EXPRESSION "CMake Error at [^\n]*\\(message\\):\n  module: stale lock - run 'ocx lock'")
# Script-mode positive test with a substitute gate: fail on any CMake warning text
add_test(NAME p_failregex COMMAND ${CMAKE_COMMAND} -P ${d}/aw.cmake)
set_tests_properties(p_failregex PROPERTIES FAIL_REGULAR_EXPRESSION "CMake Warning;CMake Deprecation Warning")
add_test(NAME p_failregex_clean COMMAND ${CMAKE_COMMAND} -P ${d}/clean.cmake)
set_tests_properties(p_failregex_clean PROPERTIES FAIL_REGULAR_EXPRESSION "CMake Warning;CMake Deprecation Warning")
