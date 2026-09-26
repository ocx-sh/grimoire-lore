cmake_minimum_required(VERSION 3.25)
project(cppstd_precedence LANGUAGES CXX)
# Project sets its own standard AFTER project(), as many real CMakeLists.txt do
set(CMAKE_CXX_STANDARD 20)
message(STATUS "Effective CMAKE_CXX_STANDARD=${CMAKE_CXX_STANDARD}")
add_executable(app main.cpp)
