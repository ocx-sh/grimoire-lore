#!/bin/bash
# Verify wave 3: every MUST rule's verification command, verbatim from cmake-package-managers.md
# (revision 3), run with GNU grep in four fixtures: wave-2 bad/good and wave-3 bad2/good2.
# Run as `bash run.sh` (a script, so the host's rtk hook does not rewrite grep/find).
W2=/home/mherwig/.cache/cmake-measure-scratch/verify-package-managers/checks
W3=/home/mherwig/.cache/cmake-measure-scratch/verify-package-managers/w3/checks
chk() { # id, command
  for d in $W2/bad $W2/good $W3/bad2 $W3/good2; do
    out=$(cd "$d" && eval "$2" 2>&1)
    n=$(printf '%s' "$out" | grep -c .)
    printf '%-16s %-6s lines=%s\n' "$1" "$(basename "$d")" "$n"
    [ -n "$VERBOSE" ] && [ "$n" != 0 ] && printf '%s\n' "$out" | sed 's/^/      /'
  done
}
chk CONAN-01 "grep -rn --include='conanfile.py' -e 'from conans' -e conan_basic_setup -e conanbuildinfo -e 'generators = \"cmake\"' ."
chk CONAN-02 "grep -rln --include='conanfile.py' -e 'cpp_info.names' -e 'cpp_info.filenames' . | xargs -r grep -L -e cmake_target_name -e cmake_file_name"
chk CONAN-02-list "grep -rln --include='conanfile.py' -e 'cpp_info.names' -e 'cpp_info.filenames' ."
chk CONAN-03 "grep -rn --include='conanfile.py' --include='conanfile.txt' -e build_requires ."
chk CONAN-05 "grep -rn --include='CMakeLists.txt' --include='*.cmake' -e 'find_package(.* MODULE' ."
chk CONAN-06 "grep -rn --include='conanfile.py' -e build_context_activated ."
chk CONAN-09-range "grep -rn --include='conanfile.py' --include='conanfile.txt' -e '/\[' ."
chk CONAN-09-lock "git ls-files conan.lock"
chk CONAN-09-inst "grep -rn -e 'conan install' .github"
chk CONAN-09-pass "grep -rn -e '--lockfile[= ]' -e ' -l ' .github"
chk CONAN-09-off "grep -rn -e '--lockfile=\"\"' -e \"--lockfile=''\" -e '--lockfile-partial' .github"
chk CONAN-09-offFIX "grep -rn -e '--lockfile=\"\"' -e \"--lockfile=''\" -e '--lockfile= ' -e '--lockfile=\$' -e '--lockfile-partial' .github"
chk CONAN-10s "grep -rn --include='CMakeLists.txt' --include='*.cmake' -e 'set(CMAKE_CXX_STANDARD' -e 'set(CMAKE_MSVC_RUNTIME_LIBRARY' ."
chk CONAN-16 "grep -rn --include='conanfile.py' -e '^[^#]*info\.header_only()' ."
chk CONAN-23 "grep -rL --include='conandata.yml' -e sha256 ."
chk CONAN-23-dlFIX "grep -rn --include='conanfile.py' -e 'download(self' -e 'get(self, \"' -e \"get(self, '\" -e 'get(self, f\"' ."
chk VCPKG-01 "grep -rL --include='vcpkg.json' --exclude-dir=vcpkg --exclude-dir=vcpkg_installed --exclude-dir=build -e '\"builtin-baseline\"' ."
chk VCPKG-02 "grep -rn --include='vcpkg.json' --include='vcpkg-configuration.json' -e '\"overrides\"' -e '\"overlay-ports\"' ."
chk VCPKG-04 "grep -rn --include='CMakeLists.txt' -e 'set(VCPKG_' -e 'list(APPEND VCPKG_' -e 'project(' ."
chk VCPKG-05a "grep -rn --include='CMakePresets.json' --include='CMakeUserPresets.json' -e CMAKE_TOOLCHAIN_FILE -e toolchainFile ."
chk VCPKG-05b "grep -rn -e conan_toolchain.cmake ."
chk VCPKG-06a "grep -rn --include='CMakePresets.json' --include='CMakeLists.txt' --include='*.cmake' --include='*.yml' --include='*.yaml' --exclude-dir=vcpkg -e 'windows-static\$' -e 'windows-static[^-]' -e 'VCPKG_CRT_LINKAGE static' ."
chk VCPKG-06b "grep -rn --include='CMakeLists.txt' --include='*.cmake' --include='CMakePresets.json' -e CMAKE_MSVC_RUNTIME_LIBRARY ."
chk VCPKG-08a "grep -rn -e x-gha .github"
chk VCPKG-10 "grep -rn --exclude-dir=vcpkg -e vcpkg-artifacts -e vcpkg-ce -e VCPKG_ARTIFACTS -e 'vcpkg activate' -e VCPKG_PREFER_SYSTEM_LIBS ."
chk VCPKG-11 "grep -rn -e vcpkg.lock -e 'vcpkg-lock' ."
chk VCPKG-13 "grep -rlw --include='portfile.cmake' -e vcpkg_configure_cmake -e vcpkg_build_cmake -e vcpkg_install_cmake -e vcpkg_fixup_cmake_targets -e vcpkg_extract_source_archive_ex -e vcpkg_apply_patches -e vcpkg_build_msbuild ."
chk VCPKG-13-exFIX "grep -rn --include='portfile.cmake' -e 'vcpkg_extract_source_archive( *[\"\$]' ."
chk VCPKG-15 "grep -rl --include='portfile.cmake' -e CMAKE_MSVC_RUNTIME_LIBRARY . | xargs -r grep -L -e VCPKG_CRT_LINKAGE"
chk VCPKG-15-read "grep -rl --include='portfile.cmake' -e CMAKE_MSVC_RUNTIME_LIBRARY . | xargs -r grep -l -e VCPKG_CRT_LINKAGE"
chk PKG-01-conan "grep -rl --include='conanfile.py' --include='conanfile.txt' -e requires ."
chk PKG-01-vcpkg "grep -rl --include='vcpkg.json' -e dependencies ."
chk PKG-01-fetch "grep -rl --include='CMakeLists.txt' --include='*.cmake' -e FetchContent_Declare -e CPMAddPackage -e ExternalProject_Add -e HunterGate ."
