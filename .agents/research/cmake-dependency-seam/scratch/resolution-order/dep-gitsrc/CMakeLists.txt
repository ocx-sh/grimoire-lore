cmake_minimum_required(VERSION 3.5)
project(dep VERSION 3.0.0 LANGUAGES C)

if(NOT DEFINED PROJECT_IS_TOP_LEVEL)
  # 3.5 floor: no native PROJECT_IS_TOP_LEVEL (3.21); this is the M-E-06 shim
  string(COMPARE EQUAL "${CMAKE_SOURCE_DIR}" "${CMAKE_CURRENT_SOURCE_DIR}" PROJECT_IS_TOP_LEVEL)
endif()

option(DEP_TESTS "Build dep tests" ON)
message(STATUS "[dep] DEP_TESTS=${DEP_TESTS} at line ${CMAKE_CURRENT_LIST_LINE}")

add_library(dep STATIC src/dep.c)
target_include_directories(dep PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
  $<INSTALL_INTERFACE:include>)
target_compile_definitions(dep PRIVATE DEP_TAG="C-fetched")
set_target_properties(dep PROPERTIES POSITION_INDEPENDENT_CODE ON)

include(GNUInstallDirs)
include(CMakePackageConfigHelpers)
install(TARGETS dep EXPORT depTargets ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR})
install(FILES include/dep.h DESTINATION ${CMAKE_INSTALL_INCLUDEDIR})
install(EXPORT depTargets FILE depTargets.cmake NAMESPACE dep::
  DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/dep)
file(WRITE ${CMAKE_CURRENT_BINARY_DIR}/depConfig.cmake.in
"@PACKAGE_INIT@\ninclude(\"\${CMAKE_CURRENT_LIST_DIR}/depTargets.cmake\")\n")
configure_package_config_file(
  ${CMAKE_CURRENT_BINARY_DIR}/depConfig.cmake.in
  ${CMAKE_CURRENT_BINARY_DIR}/depConfig.cmake
  INSTALL_DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/dep)
write_basic_package_version_file(
  ${CMAKE_CURRENT_BINARY_DIR}/depConfigVersion.cmake
  VERSION ${PROJECT_VERSION} COMPATIBILITY AnyNewerVersion)
install(FILES
  ${CMAKE_CURRENT_BINARY_DIR}/depConfig.cmake
  ${CMAKE_CURRENT_BINARY_DIR}/depConfigVersion.cmake
  DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/dep)

option(DEP_GUARD_TESTS "Gate test subdir on PROJECT_IS_TOP_LEVEL" OFF)
if(DEP_TESTS)
  if(DEP_GUARD_TESTS AND NOT PROJECT_IS_TOP_LEVEL)
    message(STATUS "[dep] guarded: NOT top level, skipping add_subdirectory(tests)")
  else()
    include(CTest)
    if(BUILD_TESTING)
      enable_testing()
      add_subdirectory(tests)
    endif()
  endif()
endif()
