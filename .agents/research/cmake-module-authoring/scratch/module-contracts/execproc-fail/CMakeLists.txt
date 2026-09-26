cmake_minimum_required(VERSION 3.19)
project(ep_fail NONE)

# Case A: no RESULT_VARIABLE, no COMMAND_ERROR_IS_FATAL, command fails
execute_process(COMMAND false)
message(STATUS "case-A: configure did NOT abort after an unchecked failing execute_process")

# Case B: COMMAND_ERROR_IS_FATAL ANY, command fails -> should abort configure
execute_process(COMMAND false COMMAND_ERROR_IS_FATAL ANY)
message(STATUS "case-B: this line should be UNREACHABLE")
