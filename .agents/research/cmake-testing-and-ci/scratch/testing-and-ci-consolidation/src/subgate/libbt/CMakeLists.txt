cmake_minimum_required(VERSION 3.25...4.4)
project(libbt LANGUAGES NONE)
include(CTest)
if(BUILD_TESTING) # guard on BUILD_TESTING alone: the consumer's value leaks in
  add_subdirectory(tests)
endif()
