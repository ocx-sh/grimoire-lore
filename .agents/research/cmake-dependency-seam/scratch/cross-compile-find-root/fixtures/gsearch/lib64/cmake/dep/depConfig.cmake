set(dep_LAYOUT "lib64")
add_library(dep::dep INTERFACE IMPORTED)
message(STATUS "depConfig.cmake: resolved from lib64 at ${CMAKE_CURRENT_LIST_DIR}")
