cmake_minimum_required(VERSION 3.25)
project(wraptest LANGUAGES C)

option(WRAPTEST_BUILD_SHARED "" OFF)
set(BUILD_SHARED_LIBS ${WRAPTEST_BUILD_SHARED})

add_library(wraptest widget.c)
add_library(wraptest::wraptest ALIAS wraptest)
target_include_directories(wraptest PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
  $<INSTALL_INTERFACE:include>)

include(GNUInstallDirs)
install(TARGETS wraptest EXPORT wraptestTargets
  ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR}
  LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR}
  RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR})
install(FILES include/widget.h DESTINATION ${CMAKE_INSTALL_INCLUDEDIR})
install(EXPORT wraptestTargets FILE wraptestTargets.cmake
  NAMESPACE wraptest:: DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/wraptest)

include(CMakePackageConfigHelpers)
configure_package_config_file(
  ${CMAKE_CURRENT_SOURCE_DIR}/wraptestConfig.cmake.in
  ${CMAKE_CURRENT_BINARY_DIR}/wraptestConfig.cmake
  INSTALL_DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/wraptest)
install(FILES ${CMAKE_CURRENT_BINARY_DIR}/wraptestConfig.cmake
  DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/wraptest)

message(STATUS "WRAPTEST_C_COMPILER=${CMAKE_C_COMPILER}")
message(STATUS "WRAPTEST_PIC=${CMAKE_POSITION_INDEPENDENT_CODE}")
message(STATUS "WRAPTEST_SHARED=${BUILD_SHARED_LIBS}")

# M-E-09 probe: link the static archive into a shared object, mimicking a
# consumer that ends up embedding a rules_foreign_cc-wrapped static lib into
# its own .so. Never built unless WRAPTEST_PROBE_CONSUMER is set.
if(WRAPTEST_PROBE_CONSUMER)
  add_library(wraptest_consumer SHARED consumer.c)
  target_link_libraries(wraptest_consumer PRIVATE wraptest::wraptest)
endif()
