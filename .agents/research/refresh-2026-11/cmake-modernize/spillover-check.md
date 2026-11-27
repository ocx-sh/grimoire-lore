---
title: cmake-modernize spillover check
target: cmake-modernize
date_researched: 2026-11-27
model: sonnet
sources_fetched:
  - https://cmake.org/cmake/help/v4.5/diagnostic/CMD_NON_TARGET_DIRECTIVE.html
  - https://raw.githubusercontent.com/Kitware/CMake/v4.5.1/Help/release/4.5.rst
---

# Spillover check for cmake-modernize

## Item 1 (from cmake-build): the 4.5 gate fails seven directory-scope commands

Item: "On CMake 4.5 the gate (via CMD_NON_TARGET_DIRECTIVE) fails include_directories, add_definitions, add_compile_options, add_compile_definitions, link_directories, link_libraries and add_link_options, so a 4.5 gated configure is a machine completion check for the directory-scope migration (measured 2026-11-27 on 4.5.1)."

Verdict: could not confirm the seven-command list from a primary source. The category itself is confirmed by primary source.

Evidence:
- Originating pair: `.agents/research/refresh-2026-11/cmake-build/cmake-releases-gate-presets-policies.md` records the exit-1 measurement on 4.5.1 under `-Werror=author` for all seven commands and exit 0 on 4.4.5. `.agents/research/refresh-2026-11/cmake-build/recent-shifts.md` states that the docs do not list the covered commands and that a measurement is needed. The decision file `cmake-build.md` carries the same measurement.
- Primary source 1: https://cmake.org/cmake/help/v4.5/diagnostic/CMD_NON_TARGET_DIRECTIVE.html (CMake 4.5.1 docs). It says "Added in version 4.5.", parent CMD_STRICT, default Ignore, and "Warn about use of non-target directives which alter the build environment." It names no command.
- Primary source 2: https://raw.githubusercontent.com/Kitware/CMake/v4.5.1/Help/release/4.5.rst says "The CMD_NON_TARGET_DIRECTIVE diagnostic category was added to". It names none of the seven commands. The page states no release date.
- My own measurement was not possible: `cmake` is not installed here, and `docker run kitware/cmake:4.5.1` exited 125 for every probe. The command list therefore rests on the originating pair's measurement alone, which is first-hand evidence but not a published source.

Affected text in the target: it says nothing about 4.5 or about this category. Verbatim, `skills/cmake-modernize/SKILL.md`:
- Gate table row: "| CMake 4.4 and later | `-Werror=author` |"
- Constants row: "| Gate spelling | `-Werror=author` on 4.4 and later, `-Werror=dev` on 4.3 and older and on a shared line |"
- Program floor row: "| `<max>` | The newest CMake CI runs, never the newest release. A tree with no CI, or whose CI takes CMake from the runner image without pinning a version (a `CMK-VER-03` finding), takes the program's pinned newest line (4.4) and records it in the plan file |"
- Step 2 exit check: "`I2`, scoped to that target's directory, is empty, the gated configure and build exit 0, and the flag-set diff for one source of that target is empty"

The gate spelling already holds on 4.5, so no line is false. The target does not mention that a 4.5 gated configure also fails any remaining directory-scope command.

Smallest change to make the target true on 2026-11-27: add one sentence to the step 2 exit check or to the step 1 gate paragraph in `SKILL.md`, for example "On CMake 4.5 the gated configure also fails any remaining `include_directories`, `add_definitions`, `add_compile_options`, `add_compile_definitions`, `link_directories`, `link_libraries` or `add_link_options` call (category `non-target-directive`), so a green 4.5 leg confirms step 2." Keep it only if the owner accepts the pair's measurement as sufficient, since no published page lists the commands. Two cautions for the wording: the 4.5 diagnostic is default Ignore and fails only through the `-Werror=author` parent chain, and `inventory.md` `I2` (grep) stays the check for CMake 4.4 and older legs.
