# module.cmake: pins policies at definition, POP before defining a second function
cmake_policy(PUSH)
cmake_policy(VERSION 3.19)

function(inside_pin)
  # CMP0054-NEW (3.1): quoted strings in if() are not dereferenced as variables
  set(CMP0054_test "CMP0054")
  if("CMP0054_test" STREQUAL "CMP0054_test")
    message(STATUS "inside_pin: quoted-literal if() branch taken (expected under any policy >= 3.1 NEW)")
  endif()
  cmake_policy(GET CMP0054 pol)
  message(STATUS "inside_pin: CMP0054 policy as seen inside the pinned function = ${pol}")
endfunction()

cmake_policy(POP)

function(outside_pin)
  cmake_policy(GET CMP0054 pol)
  message(STATUS "outside_pin: CMP0054 policy as seen inside the function defined AFTER POP = ${pol}")
endfunction()
