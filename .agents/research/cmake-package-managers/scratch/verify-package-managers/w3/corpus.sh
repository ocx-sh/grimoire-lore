V=/home/mherwig/.cache/research-lang/exemplars/cmake/microsoft__vcpkg
C=/home/mherwig/.cache/research-lang/exemplars/cmake/conan-io__conan-center-index
cd $V
echo "== deprecation messages in legacy helpers"
for f in vcpkg_apply_patches vcpkg_build_cmake vcpkg_configure_cmake vcpkg_extract_source_archive_ex vcpkg_fixup_cmake_targets vcpkg_install_cmake vcpkg_build_msbuild vcpkg_copy_tool_dependencies; do
  printf '%s: ' $f; test -f scripts/cmake/$f.cmake && grep -c -i -e deprecat scripts/cmake/$f.cmake || echo missing
done
grep -n -i -e deprecat scripts/cmake/vcpkg_apply_patches.cmake scripts/cmake/vcpkg_build_msbuild.cmake scripts/cmake/vcpkg_extract_source_archive_ex.cmake scripts/cmake/vcpkg_configure_cmake.cmake scripts/cmake/vcpkg_install_cmake.cmake scripts/cmake/vcpkg_build_cmake.cmake 2>/dev/null
echo "== vcpkg_copy_tool_dependencies users"; grep -rlw --include='portfile.cmake' -e vcpkg_copy_tool_dependencies ports | wc -l
echo "== vcpkg_cmake_configure 170-250"; sed -n 170,250p ports/vcpkg-cmake/vcpkg_cmake_configure.cmake
echo "== Werror in vcpkg_cmake_configure"; grep -n -e Werror ports/vcpkg-cmake/vcpkg_cmake_configure.cmake
echo "== windows.cmake 1-5"; sed -n 1,5p scripts/toolchains/windows.cmake
echo "== x64-windows-static"; cat triplets/x64-windows-static.cmake
echo "== vcpkg.cmake runtime refs"; wc -l < scripts/buildsystems/vcpkg.cmake; grep -c -e CMAKE_MSVC_RUNTIME_LIBRARY -e VCPKG_CRT_LINKAGE scripts/buildsystems/vcpkg.cmake
grep -c -e SET_DEPENDENCY_PROVIDER -e PACKAGE_INFO scripts/buildsystems/vcpkg.cmake
cd $C
echo "== CONAN-16 rule pattern"; grep -rn --include='conanfile.py' -e '^[^#]*info\.header_only()' recipes
echo "== README 30-35"; sed -n 30,35p README.md
echo "== changelog 1-6"; sed -n 1,6p docs/changelog.md
echo "== template get/sha"; grep -n -e 'get(' -e sha256 docs/package_templates/cmake_package/all/conanfile.py docs/package_templates/cmake_package/all/conandata.yml
echo "== conandata without sha256"; grep -rL --include='conandata.yml' -e sha256 recipes
echo "== CONAN-01 folder count"; grep -rl --include='conanfile.py' --exclude-dir=test_package --exclude-dir=test_v1_package -e 'from conans' recipes | wc -l
