set(dep_LAYOUT "lib32")
add_library(dep::dep INTERFACE IMPORTED)
message(STATUS "depConfig.cmake: resolved from lib32 at ${CMAKE_CURRENT_LIST_DIR}")
