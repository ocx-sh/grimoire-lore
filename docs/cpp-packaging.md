# cpp-packaging

One manager of record per configure, one lock of record per acquisition
mechanism, and every tool pinned where it is provisioned: sixteen
merge-blocking non-negotiables and two depth files, one per manager.

```sh
grim add ghcr.io/ocx-sh/lore/cpp-packaging
```

Loads on `**/conanfile.py`, `**/conanfile.txt`, `**/conandata.yml`,
`**/conan.lock`, `**/conanws.yml`, `**/conanws.py`, `**/vcpkg.json`,
`**/vcpkg-configuration.json` and `**/portfile.cmake`. The index is 189 lines
and always present. A depth file is read only when the work calls for it.

## It starts with what a green configure does not prove

Five things pass a Conan or vcpkg configure clean and look identical to a
correct one. A `VCPKG_TARGET_TRIPLET` set after `project()` is never read,
and the default triplet builds instead with no warning. The GitHub Actions
binary cache, named `x-gha` in `VCPKG_BINARY_SOURCES`, warns, exits 0 and
rebuilds everything from source. A `set(CMAKE_CXX_STANDARD 20)` written after
`conan_toolchain.cmake` loads wins over the profile's own standard, and the
only trace is one `STATUS` line neither gate spelling promotes to an error.
`conan install --lockfile-partial`, and an empty `--lockfile=`, both let
resolution drift while `conan install` still exits 0. And a static-CRT vcpkg
triplet only fails at the link step, never at configure.

## What is in it

The index carries the gate, sixteen non-negotiables, and four cross-cutting
rules it owns outright: the acquisition-strategy table, the lock-of-record
table, and the checks that tie a non-empty manifest to the lock its mechanism
requires. 46 rules in total, 21 of them merge-blocking, across two depth
files: Conan 2 and vcpkg.

A Conan profile has no fixed file name, so it loads no rule by glob at all.
The index is the only route to `conan.md` for one. The same is true of a
vcpkg triplet, except that one loads through `cmake-build`'s index instead,
because a triplet is a plain `.cmake` file and this set does not glob
`.cmake` at all.

## One manager, one lock, per mechanism

The gate never lets `vcpkg.cmake` and `conan_toolchain.cmake` reach one
configure, directly or chained through either one's own hook. But a tree can
still reach more than one acquisition mechanism at once, a Conan-managed
dependency beside a `FetchContent_Declare` for another, and each mechanism
then keeps its own lock-of-record entry, checked by its own rule. A pristine
`conan.lock` says nothing about a `GIT_TAG main` sitting beside it, so the
entries do not compose, and a secondary mechanism is where a pin goes missing
unnoticed.

## Pinned decisions

Conan 2 only: `from conan import ConanFile`, never `from conans` or
`conan_basic_setup`. The explicit `conan install` then `cmake --preset` flow
over the cmake-conan provider, and `CMakeDeps` over `CMakeConfigDeps` until a
Conan changelog calls the latter stable. vcpkg has no lockfile, no dependency
provider and no CPS of its own: reproducibility comes from `builtin-baseline`,
a registry baseline, or a vcpkg root pinned to a commit in CI, never from a
promise this set has no mechanism to back.

Each is a default an adopter overrides once, repository-wide, never per leg.
The one citable adoption figure is the ISO C++ 2024 survey, Conan at 19.34%
and vcpkg at 19.10%. The 2025 edition publishes no percentages, so this set
quotes none either.

## What it does not cover

Which CMake command consumes what the manager produced, `find_package`
resolution order, or a dependency provider's own registration. `cmake-build`
owns all of that on its own disjoint globs. Choosing FetchContent or CPM
instead of a manager for a tree with no organisational cache or SBOM need is
covered as a row in the index's own strategy table, not decided as a verdict.

## Siblings

`cmake-build`, the CMake side of every seam here: toolchains and providers,
targets, presets and CI, and the configure gate whose rows this set reuses
rather than restates. A `portfile.cmake` loads both rules on purpose, because
a vcpkg port script is CMake code and a packaging manifest at once.
`bazel-quality`, for a repository that also builds with Bazel and feeds Conan
or vcpkg packages across that seam. Bundled as `cmake-essentials` with
`cmake-build` and the two skills.
