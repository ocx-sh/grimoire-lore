function(argn_fn)
  cmake_parse_arguments(arg "" "NAME" "COMMAND" ${ARGN})
endfunction()

function(parseargv_fn)
  # gersemi: hints { COMMAND: command_line }
  cmake_parse_arguments(PARSE_ARGV 0 arg "" "NAME" "COMMAND")
endfunction()

function(parseargv_nohint_fn)
  cmake_parse_arguments(PARSE_ARGV 0 arg "" "NAME" "COMMAND")
endfunction()
