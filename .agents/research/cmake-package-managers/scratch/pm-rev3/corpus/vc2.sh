V=/home/mherwig/.cache/research-lang/exemplars/cmake/microsoft__vcpkg
cd $V
sed -n 55,66p ports/llfio/portfile.cmake; echo ---; sed -n 27,36p ports/zyre/portfile.cmake; echo ---
head -12 scripts/cmake/vcpkg_configure_cmake.cmake; echo ---
head -8 scripts/cmake/vcpkg_fixup_cmake_targets.cmake; echo ---
grep -rn -e POSITION_INDEPENDENT scripts/toolchains scripts/cmake ports/vcpkg-cmake | head -5; echo ---
echo "RENAME copyright w/o helper:"; grep -rl --include='portfile.cmake' -e 'RENAME copyright' ports | xargs -r grep -L -e vcpkg_install_copyright | wc -l
echo "any hand-rolled (either form) w/o helper:"; grep -rl --include='portfile.cmake' -e 'RENAME copyright' -e 'share/${PORT}/copyright' ports | xargs -r grep -L -e vcpkg_install_copyright | wc -l
echo "SHA512 files:"; grep -rl --include='portfile.cmake' -e SHA512 ports | wc -l
echo "uppercase SHA512:"; grep -rlP --include='portfile.cmake' -e 'SHA512\s+[0-9a-fA-F]*[A-F][0-9a-fA-F]*' ports | wc -l
echo "unofficial PACKAGE_NAME:"; grep -rl --include='portfile.cmake' -e 'PACKAGE_NAME unofficial-' -e 'PACKAGE_NAME "unofficial-' ports | wc -l
echo "usage files:"; find ports -maxdepth 2 -name usage | wc -l
echo "check_linkage:"; grep -rl --include='portfile.cmake' -e vcpkg_check_linkage ports | wc -l
echo "EMPTY_PACKAGE in test_ports:"; grep -rl -e 'VCPKG_POLICY_EMPTY_PACKAGE' scripts/test_ports | wc -l
sed -n 50,60p scripts/buildsystems/vcpkg.cmake
sed -n 1,10p scripts/ports.cmake
