set(libfoo_ARCH "HOST")
add_library(libfoo::libfoo INTERFACE IMPORTED)
message(STATUS "libfooConfig.cmake: resolved ${libfoo_ARCH} libfoo from ${CMAKE_CURRENT_LIST_DIR}")
