cmake_minimum_required(VERSION 3.25)
project(args_test LANGUAGES NONE)

function(argn_style)
  cmake_parse_arguments(ARG "" "VALUE" "" ${ARGN})
  message(STATUS "ARGN-style: VALUE='${ARG_VALUE}' unparsed='${ARG_UNPARSED_ARGUMENTS}' missing='${ARG_KEYWORDS_MISSING_VALUES}'")
endfunction()

function(parse_argv_style)
  cmake_parse_arguments(PARSE_ARGV 0 ARG "" "VALUE" "")
  message(STATUS "PARSE_ARGV-style: VALUE='${ARG_VALUE}' unparsed='${ARG_UNPARSED_ARGUMENTS}' missing='${ARG_KEYWORDS_MISSING_VALUES}'")
endfunction()

message(STATUS "--- empty value case: VALUE \"\" ---")
argn_style(VALUE "")
parse_argv_style(VALUE "")

message(STATUS "--- semicolon-bearing value case: VALUE \"a;b;c\" ---")
argn_style(VALUE "a;b;c")
parse_argv_style(VALUE "a;b;c")

message(STATUS "--- VALUE keyword given with NO following argument (missing value) ---")
argn_style(VALUE)
parse_argv_style(VALUE)
