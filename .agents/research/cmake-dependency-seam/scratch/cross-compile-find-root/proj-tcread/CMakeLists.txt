cmake_minimum_required(VERSION 3.24)
project(tcread_probe LANGUAGES C)

# Whole-project try_compile signature (the one CMP0137/3.24 governs: it runs
# a full nested project() and therefore re-reads CMAKE_TOOLCHAIN_FILE).
try_compile(TC1_OK "${CMAKE_BINARY_DIR}/tc1-bin" "${CMAKE_CURRENT_SOURCE_DIR}/wholeproj" tcwhole)
message(STATUS "TC1_OK=${TC1_OK}")

try_compile(TC2_OK "${CMAKE_BINARY_DIR}/tc2-bin" "${CMAKE_CURRENT_SOURCE_DIR}/wholeproj" tcwhole)
message(STATUS "TC2_OK=${TC2_OK}")
