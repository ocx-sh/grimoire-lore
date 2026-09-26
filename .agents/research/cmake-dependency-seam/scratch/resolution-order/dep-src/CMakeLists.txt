cmake_minimum_required(VERSION 3.10)
if(NOT DEFINED DEP_VERSION)
  set(DEP_VERSION 1.0.0)
endif()
project(dep VERSION ${DEP_VERSION} LANGUAGES C)

if(NOT DEFINED DEP_TAG)
  set(DEP_TAG "base")
endif()

add_library(dep STATIC src/dep.c)
target_include_directories(dep PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
  $<INSTALL_INTERFACE:include>)
target_compile_definitions(dep PRIVATE DEP_TAG="${DEP_TAG}")
set_target_properties(dep PROPERTIES POSITION_INDEPENDENT_CODE ON)

include(GNUInstallDirs)
include(CMakePackageConfigHelpers)

install(TARGETS dep EXPORT depTargets
  ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR})
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
  VERSION ${PROJECT_VERSION}
  COMPATIBILITY AnyNewerVersion)
install(FILES
  ${CMAKE_CURRENT_BINARY_DIR}/depConfig.cmake
  ${CMAKE_CURRENT_BINARY_DIR}/depConfigVersion.cmake
  DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/dep)

if(DEP_ENABLE_TESTS)
  message(STATUS "DEP_ENABLE_TESTS is ON, would add tests here (PROJECT_IS_TOP_LEVEL=${PROJECT_IS_TOP_LEVEL})")
endif()
