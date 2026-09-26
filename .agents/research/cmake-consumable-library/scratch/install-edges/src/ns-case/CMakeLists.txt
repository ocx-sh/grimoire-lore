cmake_minimum_required(VERSION 3.20)
project(dep LANGUAGES C VERSION 1.2.0)

include(GNUInstallDirs)

find_package(base 1.0 CONFIG REQUIRED)

option(DEP_SHARED "Build dep as a shared library" ON)
if(DEP_SHARED)
    set(DEP_SHARED_KIND SHARED)
else()
    set(DEP_SHARED_KIND STATIC)
endif()

add_library(dep ${DEP_SHARED_KIND})
set_target_properties(dep PROPERTIES
    OUTPUT_NAME dep
    VERSION ${PROJECT_VERSION}
    SOVERSION 1
    POSITION_INDEPENDENT_CODE ON
)
target_sources(dep PRIVATE dep.c)
target_include_directories(dep PUBLIC
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}>
    $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>
)
target_link_libraries(dep PUBLIC base::base)

# M-F-12 probe: a non-configuration-dependent generator expression
# ($<COMPILE_LANGUAGE:C>) on a CPS-recognized interface property
# (INTERFACE_COMPILE_DEFINITIONS -> CPS "defines"), to see what
# CPS export does with a genex outside the documented
# configuration-dependent-only support.
option(DEP_GENEX "add the COMPILE_LANGUAGE genex" ON)
if(DEP_GENEX)
target_compile_definitions(dep INTERFACE
    "$<$<COMPILE_LANGUAGE:C>:DEP_C_ONLY_DEFINE>"
)
endif()

option(DEP_SET_RPATH "Set a relative $ORIGIN install RPATH" OFF)
if(DEP_SET_RPATH)
    set_target_properties(dep PROPERTIES
        INSTALL_RPATH "$ORIGIN/../${CMAKE_INSTALL_LIBDIR}"
        BUILD_WITH_INSTALL_RPATH FALSE
    )
endif()

install(TARGETS dep EXPORT depTargets
    LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR}
    ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR}
    RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
)
install(FILES dep.h DESTINATION ${CMAKE_INSTALL_INCLUDEDIR})
install(EXPORT depTargets
    NAMESPACE Dep::
    DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/dep
)

include(CMakePackageConfigHelpers)
configure_package_config_file(
    "${CMAKE_CURRENT_SOURCE_DIR}/depConfig.cmake.in"
    "${CMAKE_CURRENT_BINARY_DIR}/depConfig.cmake"
    INSTALL_DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/dep
)
write_basic_package_version_file(
    "${CMAKE_CURRENT_BINARY_DIR}/depConfigVersion.cmake"
    VERSION ${PROJECT_VERSION}
    COMPATIBILITY SameMajorVersion
)
install(FILES
    "${CMAKE_CURRENT_BINARY_DIR}/depConfig.cmake"
    "${CMAKE_CURRENT_BINARY_DIR}/depConfigVersion.cmake"
    DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/dep
)

# M-F-11/M-F-12/M-G-15 probe: CPS export beside the Config package, never
# instead of it, guarded on the version floor.
option(DEP_CPS "Also install(PACKAGE_INFO) beside the Config package" OFF)
set(DEP_CPS_SCHEMA "rpm" CACHE STRING "VERSION_SCHEMA passed to install(PACKAGE_INFO); empty = omit the option (CPS default: simple)")
if(DEP_CPS AND CMAKE_VERSION VERSION_GREATER_EQUAL 4.3)
    if(DEP_CPS_SCHEMA)
        install(PACKAGE_INFO dep
            EXPORT depTargets
            VERSION 1.2.0
            COMPAT_VERSION 1.0.0
            VERSION_SCHEMA ${DEP_CPS_SCHEMA}
        )
    else()
        install(PACKAGE_INFO dep
            EXPORT depTargets
            VERSION 1.2.0
            COMPAT_VERSION 1.0.0
        )
    endif()
endif()

# M-F-12 probe: build-tree CPS export, to confirm where it writes
# (row 14 of the CPS verifier ledger: cps/<package-name>/ since 4.3.3).
option(DEP_CPS_EXPORT "Also export(PACKAGE_INFO) the build tree" OFF)
if(DEP_CPS_EXPORT AND CMAKE_VERSION VERSION_GREATER_EQUAL 4.3)
    export(PACKAGE_INFO dep
        EXPORT depTargets
        VERSION 1.2.0
    )
endif()
