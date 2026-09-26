cmake_minimum_required(VERSION 3.20)
project(findprogram_probe LANGUAGES C)
enable_testing()

add_executable(real_target_exe main.c)
add_test(NAME run_real_target COMMAND real_target_exe)

set(CMAKE_PREFIX_PATH "/home/mherwig/.cache/cmake-measure-scratch/cross/host/usr")

message(STATUS "MODE_PROGRAM=${CMAKE_FIND_ROOT_PATH_MODE_PROGRAM}")

find_program(GEN_SANDBOXED NAMES gen)
if(GEN_SANDBOXED)
  message(STATUS "RESULT find_program(gen) sandboxed -> ${GEN_SANDBOXED}")
else()
  message(STATUS "RESULT find_program(gen) sandboxed -> NOTFOUND")
endif()

find_program(GEN_UNSANDBOXED NAMES gen NO_CMAKE_FIND_ROOT_PATH)
if(GEN_UNSANDBOXED)
  message(STATUS "RESULT find_program(gen) NO_CMAKE_FIND_ROOT_PATH -> ${GEN_UNSANDBOXED}")
else()
  message(STATUS "RESULT find_program(gen) NO_CMAKE_FIND_ROOT_PATH -> NOTFOUND")
endif()

if(DEFINED CMAKE_CROSSCOMPILING_EMULATOR)
  message(STATUS "RESULT CMAKE_CROSSCOMPILING_EMULATOR=${CMAKE_CROSSCOMPILING_EMULATOR}")
endif()

# Simulate a target-arch "executable" as a plain script (no real cross-linked
# binary needed to observe how add_test wires the emulator).
set(FAKE_TARGET_EXE "${CMAKE_CURRENT_SOURCE_DIR}/fake_target_exe.sh")
add_test(NAME run_fake_target_exe COMMAND "${FAKE_TARGET_EXE}" hello)
if(CMAKE_CROSSCOMPILING_EMULATOR)
  set_tests_properties(run_fake_target_exe PROPERTIES
    CROSSCOMPILING_EMULATOR "${CMAKE_CROSSCOMPILING_EMULATOR}")
endif()

# Print the generated test command by dumping CTestTestfile.cmake content is
# out of scope here; instead expose the property back for a --debug print.
get_test_property(run_fake_target_exe CROSSCOMPILING_EMULATOR CTE_PROP)
message(STATUS "RESULT test CROSSCOMPILING_EMULATOR property = ${CTE_PROP}")
