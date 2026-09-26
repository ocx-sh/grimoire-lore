set(dep_LAYOUT "lib/aarch64-linux-gnu")
add_library(dep::dep INTERFACE IMPORTED)
message(STATUS "depConfig.cmake: resolved from lib/aarch64-linux-gnu at ${CMAKE_CURRENT_LIST_DIR}")
