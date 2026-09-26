cmake_minimum_required(VERSION 3.25...4.4)
project(launcher LANGUAGES C)
option(SHADOW "unconditional set()" ON)
if(SHADOW)
  set(CMAKE_C_COMPILER_LAUNCHER projlauncher) # unconditional: shadows the caller's -D
else()
  if(NOT DEFINED CMAKE_C_COMPILER_LAUNCHER) # guarded: the caller wins
    set(CMAKE_C_COMPILER_LAUNCHER projlauncher)
  endif()
endif()
file(WRITE ${CMAKE_BINARY_DIR}/m.c "int main(void){return 0;}\n")
add_executable(m ${CMAKE_BINARY_DIR}/m.c)
