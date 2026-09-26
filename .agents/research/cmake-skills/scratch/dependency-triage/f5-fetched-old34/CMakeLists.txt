cmake_minimum_required(VERSION 3.4)
project(old34 LANGUAGES NONE)
add_library(old34 INTERFACE)
add_library(old34::old34 ALIAS old34)
