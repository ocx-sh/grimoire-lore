cmake_minimum_required(VERSION 3.19)
project(policy_pin_test NONE)
# includer sets an OLD policy explicitly before including the module,
# to see whether the module's PUSH/VERSION 3.19 pin actually isolates it
cmake_policy(SET CMP0054 OLD)
cmake_policy(GET CMP0054 includer_pol_before)
message(STATUS "includer: CMP0054 before include() = ${includer_pol_before}")
include("${CMAKE_CURRENT_SOURCE_DIR}/module.cmake")
inside_pin()
outside_pin()
cmake_policy(GET CMP0054 includer_pol_after)
message(STATUS "includer: CMP0054 after include() = ${includer_pol_after}")
