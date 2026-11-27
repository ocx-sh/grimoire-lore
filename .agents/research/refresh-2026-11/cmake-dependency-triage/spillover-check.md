---
title: Spillover check for cmake-dependency-triage
target: cmake-dependency-triage
date_researched: 2026-11-27
model: sonnet
sources_fetched:
  - https://cmake.org/cmake/help/latest/policy/CMP0225.html
---

# Spillover check

## Item 1 (from cmake-build): CMP0225

Item: CMP0225 (CMake 4.5) makes the default ExternalProject_Add configure pass CMAKE_INSTALL_PREFIX=<INSTALL_DIR> and prepends that directory to CMAKE_SYSTEM_PREFIX_PATH, which can change which copy a later find_*() resolves.

Verdict: confirmed by primary source.

Source: https://cmake.org/cmake/help/latest/policy/CMP0225.html (official CMake policy page). It states "Added in version 4.5", that the NEW behavior sets CMAKE_INSTALL_PREFIX to the external project's INSTALL_DIR in the default configure command, that the prefix is prepended to CMAKE_SYSTEM_PREFIX_PATH, which "can change find_*() results", and that an unset policy warns and uses OLD. A prefix in CMAKE_ARGS or CMAKE_CACHE_ARGS still wins. The page carries no release date; the originating pair's notes cite the same v4.5 page. One nuance: the find_*() effect lands inside the external project's own configure, not in the outer project's later calls.

Evidence in the originating pair: recent-shifts.md line 49 and cmake-build.md lines 466 in .agents/research/refresh-2026-11/cmake-build/.

Affected text in the target: the target says nothing about CMP0225, INSTALL_DIR or CMAKE_SYSTEM_PREFIX_PATH. The nearest lines are in references/failure-modes.md:

- "| An ExternalProject configure beside the outer one | The inner tree's `CMakeCache.txt` | Its forwarded arguments. `CMAKE_ARGS` splits a list at `;`, so `-DCMAKE_PREFIX_PATH=${CMAKE_PREFIX_PATH}` passes the first entry only |"
- "| A nested configure's cache (ExternalProject `<name>-prefix/src/<name>-build`) | Its configure step, which keeps a cached `_DIR` when the forwarded arguments change | ..."

Smallest change: append to the first row's last cell: "Under CMake 4.5 with CMP0225 NEW, the default configure also passes `CMAKE_INSTALL_PREFIX=<INSTALL_DIR>` and prepends it to the inner tree's `CMAKE_SYSTEM_PREFIX_PATH`, which can change which copy its `find_*()` calls resolve; a prefix in `CMAKE_ARGS` still wins." The skill is pinned to 4.4.2 elsewhere, so mark it as a 4.5 note.
