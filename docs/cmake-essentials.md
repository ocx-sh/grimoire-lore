# cmake-essentials

The CMake and C++ packaging set in one install: two rules for the files you
edit, and two skills for the procedures you run occasionally.

```sh
grim add ghcr.io/ocx-sh/lore/cmake-essentials
```

| Member | Kind | Covers |
|---|---|---|
| `cmake-build` | rule | Eighteen non-negotiables and 159 rules across ten depth files: version floors and policies, the CMake language, module authoring, targets and linkage, install and export with CPS, dependency acquisition, toolchains and providers, testing, presets and CI, and the Bazel seam |
| `cpp-packaging` | rule | Sixteen non-negotiables and 46 rules across two depth files: Conan 2 recipes, profiles and lockfiles, and vcpkg manifests, baselines, ports and binary caching |
| `cmake-dependency-triage` | skill | Ten entry points for a dependency that resolved to the wrong copy, version or mechanism, keyed to the configure's own records rather than a trace or a green build |
| `cmake-modernize` | skill | A ten-step, once-per-repository procedure from directory-scoped CMake to targets, install and export, closed by a command at every step |

## Why two rules and not one

The globs genuinely differ, which is the only thing that justifies a second
rule file. A `CMakeLists.txt` edit is not a `conanfile.py` edit, and loading
the whole Conan depth file while you add a target is pure cost. The two
rules never load together except for one file on purpose: `portfile.cmake`
is a vcpkg port script and a CMake listfile at once, so it loads both.

## Why two skills and not two more rules

Both are procedures, not standards. One runs when a dependency resolves to
the wrong thing, the other runs once per repository on a legacy tree.
Neither has a reason to load on every edit, and either one loaded per edit
would be dead weight in the context budget. Each restates the merge-blocking
rows it enforces as findings with the rule IDs, so a review that runs the
procedure without the rule sets loaded still reports them correctly, and each
says explicitly that the rule text and its verification are settled in the
rule set, never in the skill.

## The premise

The research behind this set ran its contested claims on real CMake 3.31.12,
4.3.4 and 4.4.2 binaries, gersemi 0.29.1 and 46 upstream exemplar
repositories, and CMake's own gate has holes a green build never surfaces:
`-Werror=author` exits 0 on CMake 3.31 and 4.3, a preset's
`"warnings": {"deprecated": false}` beats a command-line `-Werror=dev`, and a
missing `find_dependency` fails only in a compiled consumer, never in the
exporter's own build.

## What is not in it

The Bazel side of a `rules_foreign_cc` wrap. `cmake-build`'s `bazel-seam.md`
file owns what the wrapped CMake project owes the contract, and
`bazel-quality`, which already owns `BUILD.bazel`, owns the wrapper's own
side: the `cmake()` attributes and when to reach for one at all. No two
rules glob the same build file.

The bundle names its members without a tag. It says these four belong
together. Your `grimoire.lock` is what freezes them.
