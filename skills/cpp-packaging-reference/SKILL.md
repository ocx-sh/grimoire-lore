---
name: cpp-packaging-reference
description: Depth files and checks scripts behind the cpp-packaging rule, loaded on demand. Use when the cpp-packaging rule routes you to a depth file or a checks script, or when a task cites a rule ID the index only summarises.
license: Apache-2.0
metadata:
  summary: Depth files and checks scripts behind the cpp-packaging rule
  keywords: cpp,c++,cmake,conan,vcpkg,conan.lock,lockfile,reference
  claude.user-invocable: "false"
---

# cpp-packaging-reference

Depth for the `cpp-packaging` rule, installed with it. The rule index says which file fits the task. Read that one file; do not read the set.

| File | Holds |
|---|---|
| [conan.md](conan.md) | Conan 2 recipes, conanfile.txt, conan.lock, profiles, generators, CI install (CMK-CONAN) |
| [vcpkg.md](vcpkg.md) | vcpkg.json, vcpkg-configuration.json, triplets, portfiles, binary caching, tool pinning (CMK-VCPKG) |

## checks/

Scripts the rule's verification blocks run. Set `CHECKS=.claude/skills/cpp-packaging-reference/checks` (`$CLAUDE_CONFIG_DIR/skills/cpp-packaging-reference/checks` when installed globally).
