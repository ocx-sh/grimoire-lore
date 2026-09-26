cmake_policy(PUSH)
cmake_policy(VERSION 3.19)

function(f1_inside_push)
  cmake_policy(GET CMP0124 p0124)
  cmake_policy(GET CMP0140 p0140)
  message(STATUS "f1 (defined inside PUSH/VERSION 3.19): CMP0124=${p0124} CMP0140=${p0140}")
endfunction()

cmake_policy(POP)

function(f2_after_pop)
  cmake_policy(GET CMP0124 p0124)
  cmake_policy(GET CMP0140 p0140)
  message(STATUS "f2 (defined after POP): CMP0124=${p0124} CMP0140=${p0140}")
endfunction()
