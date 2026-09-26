cmake_minimum_required(VERSION 3.25)
project(depstatic C)
option(BUILD_SHARED_LIBS "Build shared" OFF)
add_library(dep STATIC dep.c)
