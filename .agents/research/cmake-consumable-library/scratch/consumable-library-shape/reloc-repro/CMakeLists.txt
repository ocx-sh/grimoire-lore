cmake_minimum_required(VERSION 3.20)
project(reloctest CXX)
set(ABS_CMAKE_DIR "${CMAKE_INSTALL_PREFIX}/lib/cmake/reloctest")

add_library(absdest INTERFACE)
target_include_directories(absdest INTERFACE
  $<INSTALL_INTERFACE:include>
)
install(TARGETS absdest EXPORT absdestTargets)
install(EXPORT absdestTargets DESTINATION "${ABS_CMAKE_DIR}")
