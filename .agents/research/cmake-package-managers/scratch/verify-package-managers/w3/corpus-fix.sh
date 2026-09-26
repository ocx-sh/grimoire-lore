#!/bin/bash
# Verify wave 3: the corrected commands on the real corpus (false-positive load). Run with bash.
V=/home/mherwig/.cache/research-lang/exemplars/cmake/microsoft__vcpkg
C=/home/mherwig/.cache/research-lang/exemplars/cmake/conan-io__conan-center-index
cd $V
echo "VCPKG-13 old extract overload (empty = pass):"; grep -rn --include='portfile.cmake' -e 'vcpkg_extract_source_archive( *["$]' . | wc -l
echo "VCPKG-15 read list (files with runtime and CRT linkage):"; grep -rl --include='portfile.cmake' -e CMAKE_MSVC_RUNTIME_LIBRARY . | xargs -r grep -l -e VCPKG_CRT_LINKAGE
cd $C
echo "CONAN-23 download/get-literal hits (read for sha256=):"; grep -rn --include='conanfile.py' -e 'download(self' -e 'get(self, "' -e "get(self, '" -e 'get(self, f"' recipes | wc -l
echo "CONAN-23 of those without sha256 on the line:"; grep -rn --include='conanfile.py' -e 'download(self' -e 'get(self, "' -e "get(self, '" -e 'get(self, f"' recipes | grep -v -e sha256 | wc -l
grep -rn --include='conanfile.py' -e 'download(self' -e 'get(self, "' -e "get(self, '" -e 'get(self, f"' recipes | grep -v -e sha256 | head -5
