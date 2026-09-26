cmake_minimum_required(VERSION 3.25)
project(t5 LANGUAGES NONE)
# Wrong form: a normal variable of the same name, not the directory property.
file(READ "${CMAKE_CURRENT_SOURCE_DIR}/watched.txt" watched)
list(APPEND CMAKE_CONFIGURE_DEPENDS "${CMAKE_CURRENT_SOURCE_DIR}/watched.txt")
string(STRIP "${watched}" watched)
message(STATUS "CONFIGURED watched=${watched}")
add_custom_target(noop ALL COMMAND ${CMAKE_COMMAND} -E true)
