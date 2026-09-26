cmake_minimum_required(VERSION 3.25)
project(t1 LANGUAGES NONE)
enable_testing()
# exit 0 but prints the expected diagnostic
add_test(NAME pre_exit0 COMMAND ${CMAKE_COMMAND} -E echo "run 'ocx lock'")
set_tests_properties(pre_exit0 PROPERTIES PASS_REGULAR_EXPRESSION "run 'ocx lock'")
# nonzero exit with unrelated output, WILL_FAIL alone
add_test(NAME willfail_unrelated COMMAND ${CMAKE_COMMAND} -E cat /nonexistent/file)
set_tests_properties(willfail_unrelated PROPERTIES WILL_FAIL TRUE)
# exit 0 with expected text, WILL_FAIL + PASS_REGULAR_EXPRESSION
add_test(NAME wf_pre_exit0 COMMAND ${CMAKE_COMMAND} -E echo "run 'ocx lock'")
set_tests_properties(wf_pre_exit0 PROPERTIES WILL_FAIL TRUE PASS_REGULAR_EXPRESSION "run 'ocx lock'")
# nonzero exit with expected text, WILL_FAIL + PASS_REGULAR_EXPRESSION
add_test(NAME wf_pre_exit1 COMMAND ${CMAKE_COMMAND} -P ${CMAKE_CURRENT_SOURCE_DIR}/fatal.cmake)
set_tests_properties(wf_pre_exit1 PROPERTIES WILL_FAIL TRUE PASS_REGULAR_EXPRESSION "run 'ocx lock'")
# nonzero exit with expected text, PASS_REGULAR_EXPRESSION alone
add_test(NAME pre_exit1 COMMAND ${CMAKE_COMMAND} -P ${CMAKE_CURRENT_SOURCE_DIR}/fatal.cmake)
set_tests_properties(pre_exit1 PROPERTIES PASS_REGULAR_EXPRESSION "run 'ocx lock'")
# script-mode fixture with AUTHOR_WARNING, gate on -P
add_test(NAME p_gate_dev COMMAND ${CMAKE_COMMAND} -Werror=dev -P ${CMAKE_CURRENT_SOURCE_DIR}/aw.cmake)
add_test(NAME p_gate_author COMMAND ${CMAKE_COMMAND} -Werror=author -P ${CMAKE_CURRENT_SOURCE_DIR}/aw.cmake)
add_test(NAME p_nogate COMMAND ${CMAKE_COMMAND} -P ${CMAKE_CURRENT_SOURCE_DIR}/aw.cmake)
