cmake_minimum_required(VERSION 3.25)
project(dep2 LANGUAGES NONE)
find_package(dep CONFIG REQUIRED)
add_library(dep2 INTERFACE)
target_link_libraries(dep2 INTERFACE dep::dep)
add_library(dep2::dep2 ALIAS dep2)
install(TARGETS dep2 EXPORT dep2Targets)
install(EXPORT dep2Targets FILE dep2Targets.cmake NAMESPACE dep2:: DESTINATION lib/cmake/dep2)
# BUG under test: no find_dependency(dep) in the installed Config file.
file(WRITE "${CMAKE_CURRENT_BINARY_DIR}/dep2Config.cmake"
  "include(\"\${CMAKE_CURRENT_LIST_DIR}/dep2Targets.cmake\")\n")
install(FILES "${CMAKE_CURRENT_BINARY_DIR}/dep2Config.cmake" DESTINATION lib/cmake/dep2)
