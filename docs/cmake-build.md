# cmake-build

Standards for what a CMake build claims about itself in files no compiler
checks: the gate, eighteen merge-blocking non-negotiables, and ten depth
files routed to by task.

```sh
grim add ghcr.io/ocx-sh/lore/cmake-build
```

Loads on `**/CMakeLists.txt`, `**/*.cmake`, `**/*.cmake.in`,
`**/CMakeLists.txt.in`, `**/CMakePresets.json`, `**/CMakeUserPresets.json`,
`**/*.pc.in`, `**/.gersemirc` and `**/.cmake-format*`. The index is 180 lines
and always present. A depth file is read only when the work calls for it.

## It starts with what a green configure does not prove

Ten separate claims pass a green `cmake --preset ci` clean and look exactly
like a pass. `-Werror=author` is silently ignored on CMake 3.31 and 4.3, so it
proves nothing about the gate on either binary, and a preset's
`"warnings": {"deprecated": false}` beats a command-line `-Werror=dev`
outright. A version range with two dots, `3.15..4.3`, is one literal that
collapses to `3.15` with no diagnostic. A FetchContent redirect answers every
later `find_package` as compatible with any requested version, and
re-pointing `<Pkg>_ROOT` or `CMAKE_PREFIX_PATH` leaves the old `<Pkg>_DIR` in
force while the hint prints the new value. A missing `find_dependency` in a
Config template stays green through the exporter's own build and install, and
even through a `LANGUAGES NONE` consumer, failing only when a compiled
consumer runs its own Generate step.

The gate exists to catch what a plain build cannot, run narrowest first: two
canaries whose exit 1 is the pass, formatting, then configure, build and
test.

## What is in it

The index carries the gate, eighteen non-negotiables, and five cross-cutting
rules it owns outright. 159 rules in total, 92 of them merge-blocking, spread
over ten depth files: version floors and policies, the CMake language itself,
module authoring, targets and linkage, install and export, dependency
acquisition, toolchains and providers, testing, presets and CI, and the Bazel
seam.

One routing-table line reaches no glob at all: an `include`d presets file, one
passed by `--presets-file`, and every pipeline file under `.github/workflows/`
are each read only because the index's own line names `presets-and-ci.md`,
never because a path pattern matched. A Config template with an unusual
suffix is the same story one level down, routed from the `CMakeLists.txt`
that wires it rather than matched by name. A vcpkg triplet is a `.cmake` file
too, but it loads only this rule, which then routes it sideways into
`cpp-packaging/vcpkg.md`.

## One dependency provider exists

`CMAKE_PROJECT_TOP_LEVEL_INCLUDES` only holds one dependency-provider
registration that matters: list two provider files and the second one's
registration silently replaces the first, with no error either time.
cmake-conan is the only real implementation behind the interface, and vcpkg
ships none. A provider also never sees `find_program`, `find_library` or
`find_path`, only `find_package` and `FetchContent_MakeAvailable`, so a
project cannot lean on it to widen a search path the way a toolchain file
does. The slot belongs to the user: project or module code never sets or
appends the variable, and the one file that does gets listed by the person
consuming the build, not shipped turned on.

## Pinned decisions

The floor is written with three literal dots, `VERSION 3.25...4.4`, because
two dots parse as one version number and set nothing. The configure gate is
spelled per binary: `-Werror=author` on CMake 4.4 and newer, `-Werror=dev` on
4.3 and older, and `-Werror=dev` on any command line that has to serve both,
which CMake 4.4 still honours with a one-line deprecation notice. CPS import
is stable from CMake 4.3, and a valid `.cps` beats an `XConfig.cmake` sitting
in the same prefix there, with the fallback to Config silent whenever the
`.cps` is rejected. gersemi is SHOULD, and cmake-lint and cmake-format are
dead: both last released in 2020, and no maintained semantic linter has taken
their place.

Each is a default an adopter overrides once, repository-wide, never per leg.
Overriding one is a decision. Ignoring one is a violation.

## What it does not cover

Choosing or pinning the package manager, a Conan recipe or profile, or a
vcpkg manifest, triplet or port. That is `cpp-packaging`'s, on globs this set
deliberately does not touch. The one exception is `portfile.cmake`, which is
CMake code and a packaging manifest at once, and loads both rules on purpose.

It also does not cover the Bazel half of a `rules_foreign_cc` wrap. This
set's `bazel-seam.md` file owns what the wrapped CMake project owes the
contract: the network-free configure, the toolchain the wrapper synthesises,
PIC arriving as a flag instead of a variable. The wrapper's own side, the
`cmake()` attributes and when to reach for one at all, belongs to
`bazel-quality`.

## Siblings

`cpp-packaging` for Conan 2 and vcpkg, loading on `conanfile.*`,
`conandata.yml`, `conan.lock` and the vcpkg manifests, globs disjoint from
this set's own. `bazel-quality`, for the wrapper side of the seam described
above. The `cmake-dependency-triage` skill for diagnosing which copy a
configure actually resolved, and `cmake-modernize` for moving a legacy tree
to targets. Bundled as `cmake-essentials` with both skills and
`cpp-packaging`.
