cmake_minimum_required(VERSION 3.25...4.4)
project(f2 LANGUAGES NONE)
find_package(dep REQUIRED)
message(STATUS "dep_DIR=${dep_DIR}")
