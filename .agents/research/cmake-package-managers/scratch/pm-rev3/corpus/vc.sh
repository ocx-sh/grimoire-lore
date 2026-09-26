V=/home/mherwig/.cache/research-lang/exemplars/cmake/microsoft__vcpkg
cd $V
git log -1 --format='%h %cs'
echo "PIC files:"; grep -rl --include='portfile.cmake' -e CMAKE_POSITION_INDEPENDENT_CODE ports | wc -l
grep -rh --include='portfile.cmake' -e CMAKE_POSITION_INDEPENDENT_CODE ports | sed 's/^ *//' | sort | uniq -c | sort -rn | head -8
echo "RUNTIME files:"; grep -rl --include='portfile.cmake' -e CMAKE_MSVC_RUNTIME_LIBRARY ports | wc -l
grep -rn --include='portfile.cmake' -e CMAKE_MSVC_RUNTIME_LIBRARY ports | head -8
echo "copyright RENAME:"; grep -rl --include='portfile.cmake' -e 'RENAME copyright' ports | wc -l
echo "copyright literal share/\${PORT}/copyright:"; grep -rlF --include='portfile.cmake' -e 'share/${PORT}/copyright' ports | wc -l
echo "install_copyright:"; grep -rl --include='portfile.cmake' -e vcpkg_install_copyright ports | wc -l
echo "portfiles:"; find ports -name portfile.cmake | wc -l
echo "deprecated helper scripts:"; ls scripts/cmake | grep -e configure_cmake -e build_cmake -e install_cmake -e fixup_cmake -e extract_source_archive_ex -e apply_patches
echo "tool metadata:"; cat scripts/vcpkg-tool-metadata.txt 2>/dev/null | head -5
grep -n -e POSITION_INDEPENDENT scripts/toolchains/linux.cmake | head
