#!/bin/bash
# Runs each rule's verification command verbatim (GNU grep, no rtk rewrite) in bad/ and good/.
C=/home/mherwig/.cache/cmake-measure-scratch/verify-package-managers/checks
chk() {  # id, command
  for d in bad good; do
    out=$(cd $C/$d && eval "$2" 2>&1)
    n=$(printf '%s' "$out" | grep -c .)
    printf '%-14s %-4s lines=%s\n' "$1" "$d" "$n"
    [ -n "$VERBOSE" ] && printf '%s\n' "$out" | sed 's/^/      /'
  done
}
chk CONAN-01 "grep -rn --include='conanfile.py' -e 'from conans' -e conan_basic_setup -e conanbuildinfo -e 'generators = \"cmake\"' ."
chk CONAN-02 "grep -rln --include='conanfile.py' -e 'cpp_info.names' -e 'cpp_info.filenames' . | xargs -r grep -L -e cmake_target_name -e cmake_file_name"
chk CONAN-03 "grep -rn --include='conanfile.py' --include='conanfile.txt' -e build_requires ."
chk CONAN-04 "grep -rn --include='conanfile.py' --include='conanfile.txt' -e CMakeConfigDeps ."
chk CONAN-05 "grep -rn --include='CMakeLists.txt' --include='*.cmake' -e 'find_package(.* MODULE' ."
chk CONAN-06 "grep -rn --include='conanfile.py' -e build_context_activated ."
chk CONAN-07 "grep -rn -e conan_provider.cmake ."
chk CONAN-08 "git ls-files CMakeUserPresets.json"
chk CONAN-09a "grep -rn --include='conanfile.py' --include='conanfile.txt' -e '/\[' ."
chk CONAN-09b "git ls-files conan.lock"
chk CONAN-09c "grep -rn -e '--lockfile=' .github"
chk CONAN-09d "grep -rn -e '--lockfile-partial' .github"
chk CONAN-10s "grep -rn --include='CMakeLists.txt' --include='*.cmake' -e 'set(CMAKE_CXX_STANDARD' -e 'set(CMAKE_MSVC_RUNTIME_LIBRARY' ."
chk CONAN-11 "grep -rn --include='conanfile.py' -e check_min_cppstd ."
chk CONAN-12 "grep -rn -e 'conan install' .github"
chk VCPKG-01 "grep -rL --include='vcpkg.json' --exclude-dir=vcpkg --exclude-dir=vcpkg_installed --exclude-dir=build -e '\"builtin-baseline\"' ."
chk VCPKG-02 "grep -rn --include='vcpkg.json' -e '\"overrides\"' ."
chk VCPKG-03 "grep -rn -A2 --include='vcpkg.json' -e '\"vcpkg-cmake' ."
chk VCPKG-04 "grep -rn --include='CMakeLists.txt' -e 'VCPKG_' -e 'project(' ."
chk VCPKG-05a "grep -rn --include='CMakePresets.json' --include='CMakeUserPresets.json' -e CMAKE_TOOLCHAIN_FILE -e toolchainFile ."
chk VCPKG-05b "grep -rn -e conan_toolchain.cmake ."
chk VCPKG-06a "grep -rn --include='CMakePresets.json' --include='*.yml' --include='*.yaml' -e 'windows-static\"' -e \"windows-static'\" -e 'VCPKG_CRT_LINKAGE static' ."
chk VCPKG-06b "grep -rn --include='CMakeLists.txt' --include='*.cmake' --include='CMakePresets.json' -e CMAKE_MSVC_RUNTIME_LIBRARY ."
chk VCPKG-07a "grep -rn --include='*.cmake' -e VCPKG_DISABLE_COMPILER_TRACKING triplets"
chk VCPKG-07b "grep -rln --include='*.cmake' -e 'include(' triplets | xargs -r grep -L -e VCPKG_HASH_ADDITIONAL_FILES"
chk VCPKG-08a "grep -rn -e x-gha .github"
chk VCPKG-08b "grep -rn -e x-azblob -e x-azcopy -e x-gcs -e x-aws -e x-cos -e x-az-universal .github"
chk VCPKG-09 "grep -rln -e X_VCPKG_ASSET_SOURCES .github | xargs -r grep -L -e x-block-origin"
chk VCPKG-10 "grep -rn --exclude-dir=vcpkg -e vcpkg-artifacts -e vcpkg-ce -e VCPKG_ARTIFACTS -e 'vcpkg activate' -e VCPKG_PREFER_SYSTEM_LIBS ."
chk VCPKG-11 "grep -rn -e vcpkg.lock -e 'vcpkg-lock' ."
echo "--- corrected commands"
chk CONAN-09c-fix "grep -rn -e '--lockfile[= ]' -e ' -l ' .github"
chk CONAN-09e-new "grep -rn -e '--lockfile=\"\"' -e \"--lockfile=''\" .github"
chk VCPKG-04-fix "grep -rn --include='CMakeLists.txt' -e 'set(VCPKG_' -e 'list(APPEND VCPKG_' -e 'project(' ."
chk VCPKG-06a-fix "grep -rn --include='CMakePresets.json' --include='CMakeLists.txt' --include='*.cmake' --include='*.yml' --include='*.yaml' --exclude-dir=vcpkg -e 'windows-static\$' -e 'windows-static[^-]' -e 'VCPKG_CRT_LINKAGE static' ."
