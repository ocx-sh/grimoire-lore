---
title: Refresh 2026-11 spillover round for cmake-dependency-triage
target: cmake-dependency-triage
date: 2026-11-27
model: opus
consolidates: /home/mherwig/dev/ocx-sh/grimoire-lore/.agents/research/refresh-2026-11/cmake-dependency-triage/spillover-check.md
---

# cmake-dependency-triage: spillover round

## Verdict

One edit. The spillover check confirmed one item from the cmake-build pair against a primary source: policy CMP0225, added in CMake 4.5, changes the default `ExternalProject_Add` configure. The skill says nothing about it today, and its nearest text is the ExternalProject row of the "second lookup" table in `references/failure-modes.md`. That row gains one sentence, marked as a 4.5 note because the skill's measurements are pinned to 4.4.2. No rule or step ID changes, and no new ID is added. The first round of this refresh left the target's files unchanged, so nothing here builds on or contradicts an earlier edit.

## Changed statements

- `references/failure-modes.md`, second-lookup table, row "An ExternalProject configure beside the outer one": the last cell keeps its current text and gains a note that under CMake 4.5 with CMP0225 set to NEW, the default configure passes `CMAKE_INSTALL_PREFIX=<INSTALL_DIR>` and prepends that directory to the inner tree's `CMAKE_SYSTEM_PREFIX_PATH`, which can change which copy the inner `find_*()` calls resolve, and that a prefix given in `CMAKE_ARGS` or `CMAKE_CACHE_ARGS` still wins. The note places the effect in the inner configure, as the primary source does, and not in the outer project's later calls.

Verification: when the policy is NEW on 4.5 or newer, the inner tree's `CMakeCache.txt` holds `CMAKE_INSTALL_PREFIX` equal to the external project's `INSTALL_DIR`, and a `--debug-find-pkg` run of the inner configure lists that directory among the system prefixes searched. When the policy is unset, the configure warns and uses OLD behaviour.

## New rules

None. The item is a fact about a mechanism the triage reads, not a new standard. The existing CMK-DEP-34 row (step 13 of the SKILL.md rule list) keeps its number and meaning.

## Declined

None. The spillover check listed no unconfirmed or already-correct items.

## Sources

- CMake documentation, policy CMP0225: https://cmake.org/cmake/help/latest/policy/CMP0225.html. It states "Added in version 4.5", the NEW behaviour for the default configure command, the prepend to `CMAKE_SYSTEM_PREFIX_PATH` that "can change find_*() results", the warning and OLD behaviour when the policy is unset, and that a prefix given in `CMAKE_ARGS` or `CMAKE_CACHE_ARGS` takes precedence.

## Revision log

- 2026-11-27: spillover round. One table cell extended in `references/failure-modes.md`. The file stays at 301 lines and keeps its table of contents. No ID changes.

### Edit list (spillover round)

1. File: `skills/cmake-dependency-triage/references/failure-modes.md`

   Find:

   ```
   | An ExternalProject configure beside the outer one | The inner tree's `CMakeCache.txt` | Its forwarded arguments. `CMAKE_ARGS` splits a list at `;`, so `-DCMAKE_PREFIX_PATH=${CMAKE_PREFIX_PATH}` passes the first entry only |
   ```

   Replace with:

   ```
   | An ExternalProject configure beside the outer one | The inner tree's `CMakeCache.txt` | Its forwarded arguments. `CMAKE_ARGS` splits a list at `;`, so `-DCMAKE_PREFIX_PATH=${CMAKE_PREFIX_PATH}` passes the first entry only. CMake 4.5 note: with CMP0225 NEW, the default configure also passes `CMAKE_INSTALL_PREFIX=<INSTALL_DIR>` and prepends that directory to the inner tree's `CMAKE_SYSTEM_PREFIX_PATH`, which can change which copy its `find_*()` calls resolve. A prefix in `CMAKE_ARGS` or `CMAKE_CACHE_ARGS` still wins |
   ```
