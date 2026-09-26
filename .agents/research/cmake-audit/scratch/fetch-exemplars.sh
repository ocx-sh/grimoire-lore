#!/usr/bin/env bash
# Blob-less, depth-1 clones with a non-cone sparse checkout of build/config files only.
# Source blobs stay on the server and are fetched lazily by `git show HEAD:<path>`.
# Corpus chosen for shape diversity: header-only libs, compiled libs with Config
# packages, dual CMake+Bazel projects, Conan/vcpkg/CPM/Hunter consumers and the
# package managers' own repos, CMake-heavy frameworks, tool provisioners.
set -u
DEST="$1"; shift
REPOS=(
  fmtlib/fmt gabime/spdlog nlohmann/json catchorg/Catch2 google/googletest
  abseil/abseil-cpp grpc/grpc protocolbuffers/protobuf google/re2 google/benchmark
  boostorg/boost llvm/llvm-project KDE/extra-cmake-modules qt/qtbase
  microsoft/vcpkg conan-io/conan conan-io/conan-center-index cpp-pm/hunter cpm-cmake/CPM.cmake
  cpm-cmake/CPMLicenses.cmake friendlyanon/cmake-init cpp-best-practices/cmake_template
  aminya/project_options TheLartians/ModernCppStarter filipdutescu/modern-cpp-template
  bazel-contrib/rules_foreign_cc conan-io/cmake-conan microsoft/vcpkg-tool
  openssl/openssl madler/zlib curl/curl libuv/libuv nothings/stb
  Kitware/CMake ninja-build/ninja ccache/ccache mozilla/sccache
  duckdb/duckdb ClickHouse/ClickHouse ocornut/imgui glfw/glfw
  Tencent/rapidjson jbeder/yaml-cpp gflags/gflags apache/arrow
  ocx-sh/find_ocx
)
one() {
  local repo="$1" dir="$DEST/${1//\//__}"
  [ -d "$dir/.git" ] && { echo "skip $repo"; return; }
  git clone -q --filter=blob:none --depth 1 --no-checkout "https://github.com/$repo.git" "$dir" 2>&1 | tail -1
  git -C "$dir" sparse-checkout set --no-cone \
    '/*' '!/**/*.c' '!/**/*.cc' '!/**/*.cpp' '!/**/*.cxx' '!/**/*.h' '!/**/*.hpp' '!/**/*.hh' '!/**/*.inl' '!/**/*.ipp' \
    '!/**/*.md' '!/**/*.rst' '!/**/*.png' '!/**/*.svg' '!/**/*.jpg' '!/**/*.gif' '!/**/*.html' '!/**/*.css' '!/**/*.js' '!/**/*.ts' \
    '!/**/*.py' '!/**/*.pyi' '!/**/*.java' '!/**/*.kt' '!/**/*.go' '!/**/*.rs' '!/**/*.proto' '!/**/*.txt' '!/**/*.xml' '!/**/*.pdf' \
    '!/**/*.patch' '!/**/*.diff' '!/**/*.sql' '!/**/*.csv' '!/**/*.tsv' '!/**/*.dat' '!/**/*.bin' '!/**/*.a' '!/**/*.so' '!/**/*.dll' \
    '/**/CMakeLists.txt' '/**/*.cmake' '/**/*.cmake.in' '/**/CMakePresets.json' '/**/CMakeUserPresets.json' \
    '/**/conanfile.py' '/**/conanfile.txt' '/**/conandata.yml' '/**/conan.lock' '/**/vcpkg.json' '/**/vcpkg-configuration.json' \
    '/**/MODULE.bazel' '/**/MODULE.bazel.lock' '/**/BUILD' '/**/BUILD.bazel' '/**/*.bzl' '/**/WORKSPACE' '/**/WORKSPACE.bazel' '/.bazelrc' '/.bazelversion' \
    '/.github/**' '/.gitlab-ci.yml' '/.gitlab/**' '/cmake/**' '/CMake/**' '/ports/**' '/recipes/**' '/scripts/**' '/tools/**' '/ci/**' '/.ci/**' \
    '/**/.clang-tidy' '/**/.clang-format' '/**/.cmake-format*' '/**/.cmake-lint*' '/**/.gersemirc' '/**/cmake-format.yaml' '/**/.pre-commit-config.yaml' 2>/dev/null
  git -C "$dir" checkout -q 2>&1 | tail -1
  echo "ok   $repo $(git -C "$dir" rev-parse --short=10 HEAD) $(git -C "$dir" ls-tree -r --name-only HEAD | wc -l) tracked, $(find "$dir" -type f -not -path '*/.git/*' | wc -l) checked out"
}
export -f one; export DEST
printf '%s\n' "${REPOS[@]}" | xargs -P 6 -I{} bash -c 'one {}'
echo DONE
