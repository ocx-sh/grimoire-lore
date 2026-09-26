cmake_minimum_required(VERSION 3.25)
project(visdemo CXX)
include(GenerateExportHeader)
add_library(mylib SHARED mylib.cpp)
generate_export_header(mylib)
target_include_directories(mylib PUBLIC ${CMAKE_CURRENT_BINARY_DIR})
if(HIDE_IT)
  set_target_properties(mylib PROPERTIES
    CXX_VISIBILITY_PRESET hidden
    VISIBILITY_INLINES_HIDDEN ON)
endif()
