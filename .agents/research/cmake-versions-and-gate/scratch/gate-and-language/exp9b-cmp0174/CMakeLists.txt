cmake_minimum_required(VERSION 3.25)
project(cmp0174_test LANGUAGES NONE)
cmake_policy(SET CMP0174 NEW)

function(parse_argv_style)
  cmake_parse_arguments(PARSE_ARGV 0 ARG "" "VALUE" "")
  if(DEFINED ARG_VALUE)
    message(STATUS "CMP0174=NEW: ARG_VALUE is DEFINED, value='${ARG_VALUE}'")
  else()
    message(STATUS "CMP0174=NEW: ARG_VALUE is UNDEFINED")
  endif()
endfunction()

parse_argv_style(VALUE "")
