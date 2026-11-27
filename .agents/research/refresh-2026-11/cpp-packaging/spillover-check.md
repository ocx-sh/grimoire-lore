---
title: Spillover check for cpp-packaging (from cmake-build)
target: cpp-packaging
date_researched: 2026-11-27
model: sonnet
sources_fetched:
  - https://docs.conan.io/2/changelog.html
  - https://docs.conan.io/2/reference/tools/cmake/cmakeconfigdeps.html
  - https://raw.githubusercontent.com/conan-io/conan/2.34.0/conan/tools/cmake/toolchain/blocks.py
  - https://raw.githubusercontent.com/conan-io/conan/2.32.0/conan/tools/cmake/toolchain/blocks.py
  - https://raw.githubusercontent.com/conan-io/conan/2.34.0/conan/tools/cmake/__init__.py
  - https://raw.githubusercontent.com/microsoft/vcpkg/2026.10.16/scripts/buildsystems/vcpkg.cmake
  - https://raw.githubusercontent.com/microsoft/vcpkg/2026.07.29/scripts/buildsystems/vcpkg.cmake
---

# Spillover check

Origin: cmake-build, evidence in `.agents/research/refresh-2026-11/cmake-build/conan-vcpkg-facts-at-the-cmake-seam.md`.

## Item: Conan 2.34.0 facts and vcpkg 2026.10.16 unchanged

Item text: Conan 2.34.0 (2026-10-28) keeps CMakeConfigDeps experimental and adds a CMAKE_PREFIX_PATH fallback (conan#20420); FindFiles in blocks.py starts at line 579 at 2.34.0 (580 at 2.32.0); vcpkg 2026.10.16 vcpkg.cmake is byte-identical to 2026.07.29; restamp only where cpp-packaging cites those tags or line ranges.

Verdict: confirmed by primary source, and target already correct.

Primary evidence:
- Conan changelog, https://docs.conan.io/2/changelog.html: 2.34.0 release date 28-Oct-2026; entry "Feature: Add `CMAKE_PREFIX_PATH` as fallback to `CMakeConfigDeps` for cases beyond the `<pkg>_DIR` variable." linking PR 20420.
- CMakeConfigDeps reference page: banner "This feature is experimental and subject to breaking changes." Also `conan/tools/cmake/__init__.py` at 2.34.0 states "CMakeConfigDeps is now experimental".
- Raw `blocks.py`: `class FindFiles(Block):` is at line 579 at 2.34.0 and line 580 at 2.32.0 (grep run on both tags).
- Raw `vcpkg.cmake` at 2026.10.16 and 2026.07.29: both md5 9adf31195675d77146e55dbff9b9436d.

Affected text in target:
- `/home/mherwig/dev/ocx-sh/grimoire-lore/rules/cpp-packaging.md`: "Conan 2.34.0 and vcpkg-tool 2026-10-29 were source-diffed on 2026-11-27 and change no rule here, but are not re-measured."
- `/home/mherwig/dev/ocx-sh/grimoire-lore/skills/cpp-packaging-reference/conan.md`: "source-checked against Conan 2.34.0 (released 2026-10-28) on 2026-11-27"; CMK-CONAN-04 "its reference page still carries the experimental banner at 2.34.0"; D2 "verified experimental at Conan 2.34.0, 2026-11-27".
- `/home/mherwig/dev/ocx-sh/grimoire-lore/skills/cpp-packaging-reference/vcpkg.md`: "the registry as of 2026-11-26 (last release 2026.10.16)".
- The target does not cite `blocks.py` line ranges, the tag 2026.07.29, `FindFiles`, or the CMAKE_PREFIX_PATH fallback (grep over rule and all skill files found none). It says nothing on those points.

Smallest change: none. Optional only: add one sentence to conan.md that 2.34.0 adds a CMAKE_PREFIX_PATH fallback to CMakeConfigDeps; no rule depends on it.
