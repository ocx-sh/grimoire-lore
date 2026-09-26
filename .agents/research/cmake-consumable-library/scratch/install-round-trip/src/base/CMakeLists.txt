cmake_minimum_required(VERSION 3.20)
project(base LANGUAGES C VERSION 1.0.0)

include(GNUInstallDirs)

option(BASE_SHARED "Build base as a shared library" ON)
if(BASE_SHARED)
    set(BASE_SHARED_KIND SHARED)
else()
    set(BASE_SHARED_KIND STATIC)
endif()

add_library(base ${BASE_SHARED_KIND})
set_target_properties(base PROPERTIES
    OUTPUT_NAME base
    VERSION ${PROJECT_VERSION}
    SOVERSION 1
    POSITION_INDEPENDENT_CODE ON
)
target_sources(base PRIVATE base.c)
target_include_directories(base PUBLIC
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}>
    $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>
)

# RPATH: build-tree and install-tree are separate; install RPATH is
# relative via $ORIGIN when BASE_SET_RPATH is set (measurement M-F-07).
option(BASE_SET_RPATH "Set a relative $ORIGIN install RPATH" OFF)
if(BASE_SET_RPATH)
    set_target_properties(base PROPERTIES
        INSTALL_RPATH "$ORIGIN/../${CMAKE_INSTALL_LIBDIR}"
        BUILD_WITH_INSTALL_RPATH FALSE
    )
endif()

install(TARGETS base EXPORT baseTargets
    LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR}
    ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR}
    RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
)
install(FILES base.h DESTINATION ${CMAKE_INSTALL_INCLUDEDIR})
install(EXPORT baseTargets
    NAMESPACE base::
    DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/base
)

include(CMakePackageConfigHelpers)
configure_package_config_file(
    "${CMAKE_CURRENT_SOURCE_DIR}/baseConfig.cmake.in"
    "${CMAKE_CURRENT_BINARY_DIR}/baseConfig.cmake"
    INSTALL_DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/base
)
write_basic_package_version_file(
    "${CMAKE_CURRENT_BINARY_DIR}/baseConfigVersion.cmake"
    VERSION ${PROJECT_VERSION}
    COMPATIBILITY SameMajorVersion
)
install(FILES
    "${CMAKE_CURRENT_BINARY_DIR}/baseConfig.cmake"
    "${CMAKE_CURRENT_BINARY_DIR}/baseConfigVersion.cmake"
    DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/base
)

# pkg-config file (M-F-14): generated from the same target data,
# relocatable via ${pcfiledir}.
configure_file(
    "${CMAKE_CURRENT_SOURCE_DIR}/base.pc.in"
    "${CMAKE_CURRENT_BINARY_DIR}/base.pc"
    @ONLY
)
install(FILES "${CMAKE_CURRENT_BINARY_DIR}/base.pc"
    DESTINATION ${CMAKE_INSTALL_LIBDIR}/pkgconfig
)
