set(libfoo_ARCH "TARGET-SYSROOT")
add_library(libfoo::libfoo INTERFACE IMPORTED)
message(STATUS "libfooConfig.cmake: resolved ${libfoo_ARCH} libfoo from ${CMAKE_CURRENT_LIST_DIR}")
