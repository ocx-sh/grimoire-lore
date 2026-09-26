cmake_minimum_required(VERSION 3.7)
project(old37 LANGUAGES NONE)
add_library(old37 INTERFACE)
add_library(old37::old37 ALIAS old37)
