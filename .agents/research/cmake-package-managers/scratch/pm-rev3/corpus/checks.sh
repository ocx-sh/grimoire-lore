V=/home/mherwig/.cache/research-lang/exemplars/cmake/microsoft__vcpkg
C=/home/mherwig/.cache/research-lang/exemplars/cmake/conan-io__conan-center-index
cd $V
echo "VCPKG-15:"; grep -rl --include='portfile.cmake' -e CMAKE_MSVC_RUNTIME_LIBRARY ports | xargs -r grep -L -e VCPKG_CRT_LINKAGE | wc -l
echo "VCPKG-15 triplets:"; grep -rl --include='*.cmake' -e VCPKG_CMAKE_CONFIGURE_OPTIONS triplets | xargs -r grep -l -e CMAKE_MSVC_RUNTIME_LIBRARY | wc -l
echo "VCPKG-13:"; grep -rlw --include='portfile.cmake' -e vcpkg_configure_cmake -e vcpkg_build_cmake -e vcpkg_install_cmake -e vcpkg_fixup_cmake_targets -e vcpkg_extract_source_archive_ex -e vcpkg_apply_patches -e vcpkg_build_msbuild ports | wc -l
cd $C
echo "CONAN-16:"; grep -rn --include='conanfile.py' -e 'info.header_only()' recipes | wc -l
echo "CONAN-15 auto_header_only+package_id:"; grep -rl --include='conanfile.py' -e auto_header_only recipes | xargs -r grep -l -e 'def package_id' | wc -l
echo "auto_header_only users:"; grep -rl --include='conanfile.py' -e auto_header_only recipes | wc -l
echo "auto_shared_fpic users:"; grep -rl --include='conanfile.py' -e auto_shared_fpic recipes | wc -l
echo "CONAN-14 auto_shared_fpic+config methods:"; grep -rl --include='conanfile.py' -e auto_shared_fpic recipes | xargs -r grep -l -e 'def config_options' -e 'def configure' | wc -l
echo "header-library without clear/auto:"; grep -rl --include='conanfile.py' --exclude-dir=test_package --exclude-dir=test_v1_package -e '"header-library"' recipes | xargs -r grep -L -e auto_header_only -e 'info.clear()' | wc -l
echo "header-library total:"; grep -rl --include='conanfile.py' --exclude-dir=test_package --exclude-dir=test_v1_package -e '"header-library"' recipes | wc -l
echo "conandata without sha256:"; grep -rL --include='conandata.yml' -e sha256 recipes | wc -l
echo "conandata total:"; grep -rl --include='conandata.yml' -e sources recipes | wc -l
echo "no required_conan_version:"; grep -rL --include='conanfile.py' --exclude-dir=test_package --exclude-dir=test_v1_package -e required_conan_version recipes | wc -l
