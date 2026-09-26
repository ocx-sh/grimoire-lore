cmake_minimum_required(VERSION 3.25)
project(rtdeps LANGUAGES C)
include(GNUInstallDirs)
find_package(base 1.0 CONFIG REQUIRED)
add_executable(app main.c)
target_link_libraries(app PRIVATE base::base)
install(TARGETS app RUNTIME_DEPENDENCY_SET appdeps)
install(RUNTIME_DEPENDENCY_SET appdeps
  PRE_EXCLUDE_REGEXES "^lib(c|m|dl|pthread|gcc_s)\\.so" "ld-linux"
  POST_EXCLUDE_REGEXES "^/lib" "^/usr/lib")
