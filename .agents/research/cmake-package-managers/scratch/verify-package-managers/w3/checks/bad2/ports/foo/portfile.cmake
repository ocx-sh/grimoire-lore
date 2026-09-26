vcpkg_from_github(OUT_SOURCE_PATH SOURCE_PATH REPO o/foo REF v1 SHA512 0 HEAD_REF main)
vcpkg_configure_cmake(SOURCE_PATH "${SOURCE_PATH}" PREFER_NINJA
    OPTIONS -DCMAKE_MSVC_RUNTIME_LIBRARY=MultiThreaded)
vcpkg_install_cmake()
vcpkg_fixup_cmake_targets()
