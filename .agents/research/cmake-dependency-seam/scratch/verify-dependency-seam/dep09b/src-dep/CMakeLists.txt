cmake_minimum_required(VERSION 3.25)
project(dep VERSION 1.0 LANGUAGES NONE)
add_library(dep INTERFACE)
add_library(dep::dep ALIAS dep)
