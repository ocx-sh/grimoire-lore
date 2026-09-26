# cmake-dependency-triage

Ten named entry points for a CMake dependency that resolved to the wrong
copy, version or mechanism, with the exact cache, configure-log, Conan and
vcpkg reads and what each output shape means. A diagnosis, not a library
recommendation.

```sh
grim add ghcr.io/ocx-sh/lore/cmake-dependency-triage
```

Reach for it when a re-pointed `_ROOT` or `CMAKE_PREFIX_PATH` hint has no
visible effect, when a fetched copy builds although an installed one sits on
the path, when a dependency provider or cmake-conan never supplies a package,
when a consumer fails with "the link interface of target ... not found", or
when CMake 4 stops the gate on a floor below 3.10 or below 3.5.

## The stop condition is three named things

It stops when the triage names all three: which copy answered, which
mechanism put it there, and the rule that fixes it applied at the layer that
actually decided. "It resolved to X" names none of them. A fix at a layer
that did not decide has no effect and passes review anyway, because the
configure that follows still exits 0.

## Read the configure's own records, never a trace

Provenance comes only from `CMakeCache.txt` read by `grep`, never `cmake -L`,
which omits every `UNINITIALIZED` entry, and that is exactly the type a plain
`-Ddep_ROOT=...` creates. It comes from the `pkgRedirects` directory a
FetchContent override writes, from `CMakeConfigureLog.yaml`'s
`find_package-v1` events on CMake 4.1 and newer only, and from
`--debug-find-pkg`, but only on a `--fresh` configure, because a reused tree
prints the old answer with no warning. It never comes from a green configure,
a manager's own trace (`VCPKG_TRACE_FIND_PACKAGE`, `vcpkg depend-info`), or
`cmake --graphviz`, which draws the target graph and renders only its legend
on a `find_package`-only project.

## Ten entry points, one first read each

Wrong copy or a re-pointed hint with no effect, an installed copy ignored in
favour of a fetched one, cmake-conan active with a `find_program` stuck
NOTFOUND, a consumer failing right after `Configuring done`, CMake 4 refusing
a floor below 3.5 or below 3.10, an online configure passing while an offline
one fails, "which version did Conan pick", a vcpkg tree resolving to the
wrong version, and a provider that registered but was never called. Each maps
to a first command and the rule that owns the fix, never a version number
recalled from memory or a changelog. A provider intercepts only
`find_package` and `FetchContent_MakeAvailable`: with cmake-conan under
`CMakeConfigDeps`, `find_program` and `find_library` see its content only
after the first intercepted `find_package`, in that call's directory and
below, so a subdirectory's first call leaves the top level NOTFOUND even
after its own later call resolves.

## What it refuses to do

Four moves stay out of scope in every case, each one turning a diagnosis into
a new defect: fixing a floor error with a global `CMAKE_POLICY_VERSION_MINIMUM`
or a warning switch, wiping the build tree before recording which `_DIR` was
stale, hand-editing a Conan lockfile, and offering `cmake_language(DEFER)` as
an ordering fix, because a deferred call runs later in the same directory,
not earlier.

## Pinned defaults

The floor of every shipped probe is
`cmake_minimum_required(VERSION 3.25...4.4)`. The gate is spelled
`-Werror=author` on CMake 4.4 and newer and `-Werror=dev` on 4.3 and older,
with `-Werror=dev` on a shared command line. `CMAKE_POLICY_VERSION_MINIMUM`
is 3.10, scoped to the one call that needs it, except 3.5 inside a vcpkg port
build. The Conan flow stays the explicit `conan install` then
`cmake --preset`, never the provider by default.

## Siblings

`cmake-build` and `cpp-packaging` for the rule text, rationale and full
verification behind every fixing rule this skill names. A disputed reading
is settled there, never here. `cmake-modernize` for turning a tree that
triages clean into a target-based, consumable one. Bundled as
`cmake-essentials` with both rules and `cmake-modernize`.
