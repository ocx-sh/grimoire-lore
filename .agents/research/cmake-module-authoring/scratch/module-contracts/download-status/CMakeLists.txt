cmake_minimum_required(VERSION 3.19)
project(dl_status NONE)

# Case A: no STATUS, missing URL, no file target either -> does configure fail?
file(DOWNLOAD "file:///nonexistent/path/does-not-exist.bin" "${CMAKE_BINARY_DIR}/out_nostatus.bin")
message(STATUS "case-A: configure did NOT abort after a STATUS-less failed file(DOWNLOAD)")

# Case B: with STATUS, check it manually
file(DOWNLOAD "file:///nonexistent/path/does-not-exist.bin" "${CMAKE_BINARY_DIR}/out_status.bin" STATUS dl_status)
list(GET dl_status 0 dl_code)
list(GET dl_status 1 dl_msg)
message(STATUS "case-B: STATUS code=${dl_code} msg=${dl_msg}")
