set(dep_LAYOUT "share")
add_library(dep::dep INTERFACE IMPORTED)
message(STATUS "depConfig.cmake: resolved from share at ${CMAKE_CURRENT_LIST_DIR}")
