cmake_minimum_required(VERSION 3.25...4.4)
project(m1 LANGUAGES NONE)
install(FILES "${CMAKE_CURRENT_LIST_FILE}" DESTINATION /opt/absolute/path)
message(STATUS "m1 reached end")
