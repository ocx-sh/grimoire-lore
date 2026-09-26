cmake_minimum_required(VERSION 3.25)
project(t4 LANGUAGES NONE)
# A module reading a project-local file at configure time.
file(READ "${CMAKE_CURRENT_SOURCE_DIR}/watched.txt" watched)
file(READ "${CMAKE_CURRENT_SOURCE_DIR}/unwatched.txt" unwatched)
set_property(DIRECTORY APPEND PROPERTY CMAKE_CONFIGURE_DEPENDS
  "${CMAKE_CURRENT_SOURCE_DIR}/watched.txt"
  "${CMAKE_CURRENT_SOURCE_DIR}/later.txt")
string(STRIP "${watched}" watched)
string(STRIP "${unwatched}" unwatched)
message(STATUS "CONFIGURED watched=${watched} unwatched=${unwatched}")
add_custom_target(noop ALL COMMAND ${CMAKE_COMMAND} -E true)
