vcpkg_from_github(OUT_SOURCE_PATH SOURCE_PATH REPO o/baz REF v1 SHA512 0 HEAD_REF main)
if(VCPKG_CRT_LINKAGE STREQUAL "static")
    set(BAZ_STATIC_RT ON)
endif()
vcpkg_cmake_configure(SOURCE_PATH "${SOURCE_PATH}"
    OPTIONS -DBAZ_STATIC_RT=${BAZ_STATIC_RT} -DCMAKE_MSVC_RUNTIME_LIBRARY=MultiThreaded)
vcpkg_cmake_install()
vcpkg_cmake_config_fixup()
