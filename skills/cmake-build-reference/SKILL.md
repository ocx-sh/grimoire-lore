---
name: cmake-build-reference
description: Depth files and checks scripts behind the cmake-build rule, loaded on demand. Use when the cmake-build rule routes you to a depth file or a checks script, or when a task cites a rule ID the index only summarises.
license: Apache-2.0
metadata:
  summary: Depth files and checks scripts behind the cmake-build rule
  keywords: cmake,cmakelists,cmake-presets,ctest,find_package,fetchcontent,toolchain,reference
  claude.user-invocable: "false"
---

# cmake-build-reference

Depth for the `cmake-build` rule, installed with it. The rule index says which file fits the task. Read that one file; do not read the set.

| File | Holds |
|---|---|
| [bazel-seam.md](bazel-seam.md) | rules_foreign_cc wrapping and keeping CMake and Bazel builds in step (CMK-BZL) |
| [dependencies.md](dependencies.md) | find_package, FetchContent, CPM, Hunter, vendoring, offline configure (CMK-DEP) |
| [install-and-export.md](install-and-export.md) | install() rules, Config templates, relocation, RPATH, .pc files, CPS export (CMK-INST) |
| [language.md](language.md) | Functions, macros, if(), cache variables, option(), return values (CMK-LANG) |
| [module-authoring.md](module-authoring.md) | Find modules, helper and provider .cmake files, configure-time downloads and processes (CMK-MOD) |
| [presets-and-ci.md](presets-and-ci.md) | CMakePresets.json, CMake pipelines, pinning the CMake a pipeline runs (CMK-CI) |
| [targets.md](targets.md) | Libraries and executables, link keywords, flags, language standard, MSVC runtime, visibility, PIC (CMK-TGT) |
| [testing.md](testing.md) | CTest, gating the test tree, testing CMake modules (CMK-TEST) |
| [toolchains-and-providers.md](toolchains-and-providers.md) | Toolchain files, dependency providers, top-level includes, cross-compiling (CMK-TC) |
| [versions-and-policies.md](versions-and-policies.md) | cmake_minimum_required, policies, experimental variables, CMake 4 compatibility (CMK-VER) |

## checks/

Scripts the rule's verification blocks run. Set `CHECKS=.claude/skills/cmake-build-reference/checks` (`$CLAUDE_CONFIG_DIR/skills/cmake-build-reference/checks` when installed globally).
