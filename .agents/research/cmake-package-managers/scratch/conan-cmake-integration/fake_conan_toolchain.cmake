# Simulates the relevant part of a Conan-generated conan_toolchain.cmake
message(STATUS "conan_toolchain.cmake: setting CMAKE_CXX_STANDARD to 17 (profile compiler.cppstd=17)")
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
