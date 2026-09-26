# vcpkg-port-authoring scratch

## CRT-override measurement (M1)

Files: `toolchain.cmake`, `proj/CMakeLists.txt`. Reproduces
`scripts/toolchains/windows.cmake`'s non-`FORCE` `CACHE STRING` pattern for
`CMAKE_MSVC_RUNTIME_LIBRARY` and shows that a `-D` on the command line (which
is exactly how `vcpkg_cmake_configure`'s `OPTIONS` and a triplet's
`VCPKG_CMAKE_CONFIGURE_OPTIONS` reach the child `cmake` process — see
`ports/vcpkg-cmake/vcpkg_cmake_configure.cmake`, `arg_OPTIONS` appended to
`rel_command`/`dbg_command`) silently wins over the toolchain's value, with no
warning.

Run (from the lore worktree, CMake 4.4.2 via ocx):

```sh
ocx package exec kitware/cmake:4.4 -- cmake -S proj -B build_cli \
  -DCMAKE_TOOLCHAIN_FILE=toolchain.cmake -DCMAKE_MSVC_RUNTIME_LIBRARY=CLI_VALUE
# -- CMAKE_MSVC_RUNTIME_LIBRARY=CLI_VALUE   (the -D wins, no warning)

ocx package exec kitware/cmake:4.4 -- cmake -S proj -B build_noopt \
  -DCMAKE_TOOLCHAIN_FILE=toolchain.cmake
# -- CMAKE_MSVC_RUNTIME_LIBRARY=TOOLCHAIN_VALUE   (only the toolchain's set() applies when nothing else does)
```

## Corpus analysis (40-port sample and whole-corpus counts)

`analyze.py` runs over `sample_ports/<port>/portfile.cmake` (and `vcpkg.json`),
a deterministic sample of 40 ports (every 71st of the 2865 sorted directory
names under `ports/` in `microsoft__vcpkg@c4ee5a52d7`, N = 2865 // 40 = 71).
`sample_results.jsonl` is its output. `ports_sorted.txt` is the sorted
directory listing the sample was drawn from. Whole-corpus deprecated/current
helper, SHA512-case, `unofficial-`, usage-file, `CMAKE_POLICY_*` and
copyright-helper counts were run directly against the checked-out corpus tree
with `grep -rl --include='portfile.cmake' -e '<helper>' <ports-dir> | wc -l`
and are quoted inline in `vcpkg-port-authoring.md`, not reproduced as files
here (they need no fixture, only the corpus checkout already on disk at
`/home/mherwig/.cache/research-lang/exemplars/cmake/microsoft__vcpkg`).
