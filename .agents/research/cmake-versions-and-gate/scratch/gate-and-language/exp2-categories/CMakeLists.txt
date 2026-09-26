cmake_minimum_required(VERSION 3.25)
project(cat_test LANGUAGES NONE)
message(STATUS "value: ${THIS_VAR_IS_NEVER_DEFINED}")
install(FILES "${CMAKE_CURRENT_LIST_FILE}" DESTINATION /opt/absolute/path)
