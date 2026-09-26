cmake_minimum_required(VERSION 3.25)
project(dl_nostatus_test LANGUAGES NONE)
file(DOWNLOAD "file:///nonexistent/path/does-not-exist.txt" "${CMAKE_BINARY_DIR}/out.txt")
message(STATUS "REACHED AFTER DOWNLOAD (no STATUS arg) -- does configure continue?")
