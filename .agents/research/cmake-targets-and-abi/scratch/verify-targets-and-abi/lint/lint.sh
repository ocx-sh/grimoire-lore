#!/bin/sh
# sh lint.sh <lint dir>: count output lines of each verification command on red/ and green/
L=$1
chk() { printf '%-40s red=%-3s green=%s\n' "$1" "$(cd $L/red && eval "$2" | wc -l)" "$(cd $L/green && eval "$2" | wc -l)"; }
chk "TGT-04 (BZL-03 -i -F form)" "grep -rn -i -F -e 'set(CMAKE_C_FLAGS' -e 'set(CMAKE_CXX_FLAGS' -e 'set(CMAKE_EXE_LINKER_FLAGS' -e 'set(CMAKE_SHARED_LINKER_FLAGS' -e 'set(CMAKE_STATIC_LINKER_FLAGS' -e 'set(CMAKE_MODULE_LINKER_FLAGS' --include='*.cmake' --include='CMakeLists.txt' ."
chk "TGT-05 CMAKE_CXX_STANDARD read" "grep -rn --include='CMakeLists.txt' --include='*.cmake' -e 'CMAKE_CXX_STANDARD' ."
chk "TGT-06 REQUIRED pipeline" "grep -rlE --include='CMakeLists.txt' --include='*.cmake' -e 'set\(CMAKE_CXX_STANDARD[[:space:]]' . | xargs -r grep -L -e 'CMAKE_CXX_STANDARD_REQUIRED'"
chk "TGT-07 EXTENSIONS pipeline" "grep -rlE --include='CMakeLists.txt' --include='*.cmake' -e 'set\(CMAKE_CXX_STANDARD[[:space:]]' . | xargs -r grep -L -e 'CMAKE_CXX_EXTENSIONS'"
chk "TGT-09 -Werror" "grep -rn --include='CMakeLists.txt' --include='*.cmake' -e '-Werror' -e '/WX' ."
chk "TGT-10 BUILD_SHARED_LIBS" "grep -rn -i --include='CMakeLists.txt' --include='*.cmake' -e 'BUILD_SHARED_LIBS' ."
chk "TGT-11 hard-coded type" "grep -rn -i --include='CMakeLists.txt' --include='*.cmake' -e 'add_library([^ )]* STATIC' -e 'add_library([^ )]* SHARED' ."
chk "TGT-13 presence (empty=finding)" "grep -rn --include='CMakeLists.txt' --include='*.cmake' -e 'VISIBILITY_PRESET' -e 'generate_export_header' ."
chk "TGT-14 link items" "grep -rn -A3 --include='CMakeLists.txt' --include='*.cmake' -e 'target_link_libraries(' ."
chk "TGT-16 as written" "grep -rn -i --include='CMakeLists.txt' --include='*.cmake' -e 'CMAKE_MSVC_RUNTIME_LIBRARY' -e '/MT' -e '/MD' ."
chk "TGT-16 flag half, as written" "grep -rn -i --include='CMakeLists.txt' --include='*.cmake' -e '/MT' -e '/MD' ."
chk "TGT-16 flag half, corrected" "grep -rn -E --include='CMakeLists.txt' --include='*.cmake' -e '[/-]M[TD]d?([^A-Za-z]|\$)' ."
chk "TGT-17 as written" "grep -rn -i --include='CMakeLists.txt' --include='*.cmake' -e 'set(CMAKE_BUILD_TYPE' ."
chk "TGT-17 corrected" "grep -rn -i -E --include='CMakeLists.txt' --include='*.cmake' -e 'set[[:space:]]*\([[:space:]]*CMAKE_BUILD_TYPE' ."
chk "TGT-19 modules" "grep -rn --include='CMakeLists.txt' --include='*.cmake' -e 'CXX_MODULES' -e 'CMAKE_EXPERIMENTAL_CXX_IMPORT_STD' ."
chk "TGT-20 sanitizers" "grep -rn --include='CMakeLists.txt' --include='*.cmake' --include='CMakePresets.json' -e '-fsanitize=' ."
