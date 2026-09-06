---
title: Foreign builds, C++20 modules and C++ tooling
topic: foreign-builds-modules-and-cpp-tooling
group: bazel-cpp
family: BZL-CC
agent: research-lang wave-3b worker
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 22
primary_sources_count: 19
settles: [M-L-13, M-L-14, M-L-15, M-L-16, M-L-18]
builds_on: [BZL-HERM-07, BZL-HERM-08, BZL-HERM-09]
scope: >
  The three remaining C++ adoption blockers named by the map: wrapping a non-Bazel-native
  build (rules_foreign_cc's cost model), the current, dated status of native C++20 module
  support versus interim tooling, and IDE/editor support via compile_commands.json — plus
  Linux-to-Windows cross-compilation failures and symlinked-sandbox construction cost as
  named in the brief. Does not cover hermetic-toolchain selection (toolchains_llvm vs
  hermetic_cc_toolchain vs rules_cc) or layering_check's own mechanics and rollout — those
  are this group's other two dives, hermetic-cc-toolchain-choice.md and
  layering-check-includes-and-sanitizers.md. This file has NO FLEET CONSUMER: the fleet has
  one CMake probe directory and zero `cc_*`/`cc_binary`/`cc_library`/`cc_toolchain` targets
  anywhere, so everything here is grounded on upstream sources, not on fleet code.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [rules_foreign_cc's cost model: hand-declared inputs, hand-declared outputs](#1-rules_foreign_ccs-cost-model-hand-declared-inputs-hand-declared-outputs)
   2. [`layering_check` is force-disabled for every foreign_cc target, not merely off](#2-layering_check-is-force-disabled-for-every-foreign_cc-target-not-merely-off)
   3. [Platform-specific slowness: Windows-only symlink tree walks](#3-platform-specific-slowness-windows-only-symlink-tree-walks)
   4. [rules_foreign_cc's own stated scope: vendoring, not first-party builds](#4-rules_foreign_ccs-own-stated-scope-vendoring-not-first-party-builds)
   5. [Native C++20 modules: dated status, and a revert this era](#5-native-c20-modules-dated-status-and-a-revert-this-era)
   6. [compile_commands.json via `aquery`, and its staleness model](#6-compile_commandsjson-via-aquery-and-its-staleness-model)
   7. [Linux-to-Windows cross-compilation: the MSVC path-absoluteness bug](#7-linux-to-windows-cross-compilation-the-msvc-path-absoluteness-bug)
   8. [The general trap: a transition setting legacy flags is invisible to `--platforms`](#8-the-general-trap-a-transition-setting-legacy-flags-is-invisible-to---platforms)
   9. [Symlinked-sandbox construction cost](#9-symlinked-sandbox-construction-cost)
   10. [The "IDE integration ranks above modules" surprise, chased](#10-the-ide-integration-ranks-above-modules-surprise-chased)
3. [Decisions](#decisions)
4. [Normative guidance candidates](#normative-guidance-candidates)
5. [Fleet evidence](#fleet-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- Wrapping a CMake/Autotools/Make/Ninja/Boost project with `rules_foreign_cc` means the
  underlying build's discovery step (which files it reads, which libraries it produces) is
  invisible to Bazel — you enumerate both sides by hand via `lib_source`, `deps`, and the
  `out_*` attributes, or the sandboxed build fails or silently drops an output.
- `layering_check` is not merely unsupported for foreign_cc targets — the ruleset's own code
  hardcodes it into `FOREIGN_CC_DISABLED_FEATURES` and force-disables it when configuring the
  toolchain flags passed to the external build system, so a `features = ["layering_check"]`
  request on a dependent `cc_library` cannot reach it.
- `configure_make` on Windows has an open, unfixed, platform-specific slowness report from
  2021 traced to a directory-tree-walking symlink helper in the ruleset's own Windows path.
- rules_foreign_cc's own docs describe its purpose as wrapping projects that are "not fully
  under your control" (vendored, mature upstream C/C++) — not a first-party build strategy.
- Native C++20 module support in Bazel core exists only behind `--experimental_cpp_modules`
  (default `false`) plus a `module_interfaces` attribute on `cc_binary`/`cc_library`/`cc_test`,
  present unchanged in both Bazel 8.7.0 and 9.2.0 — and it ships with an explicit "no
  guarantees" warning in its own option help text.
- The harder case — multiple interdependent module interfaces on one `cc_library` — was
  merged 2025-12-10, reverted 2026-01-08 after a measured production performance regression,
  and its tracking issue (opened 2017) was reopened 2026-01-20 specifically because of that
  revert. As of 2026-09-05 there is no timeline for re-landing it.
- The de facto `compile_commands.json` generator (Hedron's extractor) asks Bazel `aquery`
  ("action query") for the exact compile commands it plans to issue — no full build required
  — because `aquery` is the only Bazel query mode that reports action-graph edges (the actual
  commands) rather than target-graph nodes.
- Staleness detection for `compile_commands.json` does not exist as an automated mechanism:
  the tool's own instructions are "every time you want tooling to see new BUILD-file changes,
  rerun the command" — it is a manual re-run, not a watch.
- Linux-to-Windows C++ cross-compilation has had an open, unfixed path-absoluteness bug since
  2023-08-09 (`bazelbuild/bazel#19208`): a Windows-style absolute path (`C:/...`) is
  interpreted as *relative* on a Linux host, so Bazel constructs a broken compiler invocation.
- A related but distinct Windows toolchain-resolution bug (`--platforms` for a non-host target
  silently failing to resolve, and an ARM64 host silently emitting x64) was auto-closed
  "not_planned" for inactivity on 2026-08-07 — unfixed, not resolved.
- A Starlark transition that sets legacy flags (`--cpu`, `--crosstool_top`) is invisible to
  any rule logic that reads `--platforms` instead — this is Bazel's own documented migration
  gap, not a bug, and `platform_mappings` is the only stated bridge.
- Symlinked-sandbox setup cost scales with input count and has been reported dominant around
  300K input files (`bazelbuild/bazel#16711`, open since 2022, still open as of 2025-11-23);
  it disproportionately hits foreign_cc-wrapped vendored trees, which are exactly the
  highest-file-count C++ targets a repo is likely to have.
- `--reuse_sandbox_directories` (the 2022 fix proposed in that same issue thread) now defaults
  `true` across Bazel 8.7.0 through 9.2.0, so warm rebuilds already get the mitigation; the
  open issue is specifically about first/cold sandbox construction.
- The single practitioner ranking that puts missing IDE integration above missing C++20
  modules and both above the learning curve is explicitly self-described by its own author as
  "no statistics... just my gut feeling" — a hypothesis, not a finding, per the brief's own
  framing, and this file treats it that way.
- That said, the ranking's #1 slot is corroborated indirectly: Hedron's compile_commands
  extractor is a mature, daily-use tool with no serious rival, while the two long-open
  cross-compilation and sandbox-cost issues above show C++-under-Bazel's tooling gaps are real
  and structural, not merely a training-data artifact.
- `cmake()`'s `generate_crosstool_file = True` attribute feeds Bazel's own resolved
  `cc_toolchain` into the CMake toolchain file — so whichever host-toolchain-autodetection or
  latent-override gap governs the wrapping repo ([BZL-HERM-07](../bazel-hermeticity-determinism.md), [BZL-HERM-08](../bazel-hermeticity-determinism.md)) propagates straight into the wrapped build too.
- This file's own **decision**: ship `rules_foreign_cc` as a last resort for vendored,
  upstream-owned C/C++ you will not rewrite as native `cc_*` — never as the default move for a
  first-party CMake/Autotools project, and never with an expectation that `layering_check` or
  full hermeticity will ever apply to it.
- This file's other **decision**: a C++ repo is not "Bazel-ready for daily development" until
  Hedron's `refresh_compile_commands` target is wired up and clangd is configured — that is
  the IDE floor, before symbolic macros, before RBE, before anything else in this family.

## Findings

### 1. rules_foreign_cc's cost model: hand-declared inputs, hand-declared outputs

Every `rules_foreign_cc` rule (`cmake`, `configure_make`, `make`, `ninja`, `boost_build`, …)
shares one attribute contract, generated by stardoc from the ruleset's own `framework.bzl` and
published at [`docs/README.md`](https://github.com/bazel-contrib/rules_foreign_cc/blob/main/docs/src/../README.md):

- **Inputs**: `lib_source` — "Label with source code to build. Typically a filegroup for the
  source of remote repository. Mandatory." — and `deps` — "those that the external build
  system will be looking for and paths to which are provided by the calling rule"
  ([`docs/README.md:40,56`](https://github.com/bazel-contrib/rules_foreign_cc/blob/main/README.md)).
  A CMake or Autotools project decides for itself, at configure time, which headers and source
  files it needs; Bazel cannot see that decision, so `lib_source` is normally a
  `filegroup(name = "all_srcs", srcs = glob(["**"]))` over the *entire* vendored tree. A
  narrower glob that misses one file the foreign build reads produces a missing-file error
  attributed to the wrapped tool, not to the glob.
- **Outputs**: `out_static_libs`, `out_shared_libs`, `out_interface_libs`, `out_binaries`,
  `out_include_dir`, `out_lib_dir`, `out_bin_dir`, `out_data_dirs`, `out_data_files` — all
  optional, all string/string-list attributes naming exactly what the underlying build will
  produce and where
  ([`foreign_cc/private/framework.bzl:190-238`](https://github.com/bazel-contrib/rules_foreign_cc/blob/main/foreign_cc/private/framework.bzl)).
  Bazel declares an output (`ctx.actions.declare_directory`/`declare_file`) for each name you
  list; a file the wrapped build genuinely produces but that you did not name in one of these
  attributes never becomes a Bazel output — it is invisible to every downstream target, with
  no error, because Bazel never expected it to exist.

This is the literal mechanism behind the brief's framing: a foreign build system auto-discovers
its own inputs and announces its own outputs; wrapping it under Bazel means both directions of
that discovery become the *caller's* enumeration problem.

### 2. `layering_check` is force-disabled for every foreign_cc target, not merely off

The ruleset's own toolchain-configuration code states the reason and hardcodes the effect:

```python
# Since we're calling an external build system we can't support some
# features that may be enabled on the toolchain - so we disable
# them here when configuring the toolchain flags to pass to the external
# build system.
FOREIGN_CC_DISABLED_FEATURES = [
    "fdo_instrument",
    "fdo_optimize",
    "layering_check",
    "module_maps",
    "thin_lto",
]
```
([`foreign_cc/private/cc_toolchain_util.bzl:45-55`](https://github.com/bazel-contrib/rules_foreign_cc/blob/main/foreign_cc/private/cc_toolchain_util.bzl))

`layering_check` is passed to `cc_common.configure_features(... unsupported_features =
disabled_features)`, so it is force-off at the toolchain-flags level the external build system
receives — a consuming `cc_library` cannot re-enable it for the edge to a foreign_cc
dependency by requesting the feature itself. A live user report confirms this from the
consumer's side: enabling `features = ["layering_check"]` on a `cc_library` depending on an
`openssl` built via `configure_make` fails with `module //src/crypto:crypto does not depend on
a module exporting 'openssl/evp.h'`, because the foreign_cc target never generated a module map
to depend on
([`bazel-contrib/rules_foreign_cc#1221`](https://github.com/bazel-contrib/rules_foreign_cc/issues/1221),
opened 2024-06-30, **open** as of 2026-09-05). The ruleset maintainer's own reply: "rules_foreign_cc
disables layering checks because the flags that this feature set are not safe to pass to a
third party build system," and the only workaround offered is splitting the `CcInfo` by hand
into a `cc_library` wrapper with `features = ["-layering_check"]` — i.e., opting the edge back
*out*, not in. `layering_check`'s own mechanics and per-package rollout are
`layering-check-includes-and-sanitizers.md`'s territory (M-L-06, M-L-07); this file settles
only that the mechanism cannot be turned on for a foreign_cc-wrapped dependency at all
(M-L-13).

### 3. Platform-specific slowness: Windows-only symlink tree walks

`configure_make` builds on Windows have an open, dated report of severe slowness traced to
`symlink_to_dir`, a helper in the ruleset's Windows-specific command path that walks and
recreates a directory tree via PowerShell rather than a native symlink
([`windows_commands.bzl:121-159`](https://github.com/bazelbuild/rules_foreign_cc/blob/821d1efd24f4605fc96dd7f3f8db31c44d017368/foreign_cc/private/framework/toolchains/windows_commands.bzl#L121-L159),
cited from
[`bazelbuild/rules_foreign_cc#720`](https://github.com/bazelbuild/rules_foreign_cc/issues/720),
opened 2021-07-13). The reporter's own capture shows the walk churning through a full GNU
`make` source tree (`ABOUT-NLS`, `configure`, `Makefile.in`, …) file by file. The issue has no
maintainer fix, was auto-marked stale twice (2022-01-10, 2022-07-10), and remains **open** with
no further activity since 2022-01-10 — over four years unaddressed as of 2026-09-05. This is
the "platform-specific slowness report" the brief asks to pin down: it is real, it is
Windows-specific (the same helper on Linux/macOS uses a real symlink), and it is unresolved,
not merely old.

### 4. rules_foreign_cc's own stated scope: vendoring, not first-party builds

The ruleset's own overview states its intended use case directly:

> "Rules ForeignCc is designed to help users build projects that are **not built by Bazel and
> also not fully under their control** (ie: large and mature open source software)."
([`docs/src/index.md`](https://github.com/bazel-contrib/rules_foreign_cc/blob/main/docs/src/index.md))

That framing — third-party, mature, not-under-your-control — combined with the two structural
costs above (hand-declared I/O, forced-off `layering_check`) and the two open, multi-year
issues, is the evidence behind this file's decision (below) to scope `rules_foreign_cc` to
vendored dependencies, not to a repo's own C++ code. The ruleset's own `README.md` corroborates
the vendoring framing with its version-compatibility policy, which tracks *distro* package
versions (Ubuntu, Fedora) for the wrapped tools rather than a single pinned version — the
posture of "whatever upstream ships," not "what this repo controls"
([`README.md`](https://github.com/bazel-contrib/rules_foreign_cc/blob/main/README.md)). Current
release: `0.15.1` (2025-06-24), the latest of three releases in the twelve months before this
research (`0.14.0` 2025-02-11, `0.15.0` 2025-06-05) — active but slow-moving maintenance, not
abandonment.

### 5. Native C++20 modules: dated status, and a revert this era

Bazel's core C++ rules carry `module_interfaces` — a list-of-labels attribute on `cc_binary`,
`cc_library`, and `cc_test` — gated behind an experimental flag, in **both** the fleet's pinned
version and the current Active LTS:

```
| `module_interfaces` | List of labels; default is `[]`. The list of files are regarded as
  C++20 Modules Interface. … The use is guarded by the flag `--experimental_cpp_modules`. |
```
(confirmed identical in
[`docs/versions/8.7.0/reference/be/c-cpp.mdx`](https://github.com/bazelbuild/bazel/blob/9.2.0/docs/versions/8.7.0/reference/be/c-cpp.mdx)
and
[`docs/versions/9.1.0/reference/be/c-cpp.mdx`](https://github.com/bazelbuild/bazel/blob/9.2.0/docs/versions/9.1.0/reference/be/c-cpp.mdx))

The flag itself, read from tagged source at both 8.7.0 and 9.2.0:

```java
@Option(
    name = "experimental_cpp_modules",
    defaultValue = "false",
    metadataTags = {OptionMetadataTag.EXPERIMENTAL},
    help = "Enables experimental C++20 modules support. Use it with `module_interfaces`
            attribute on `cc_binary` and `cc_library`. While the support is behind the
            experimental flag, there are no guarantees about incompatible changes to it or
            even keeping the support in the future. Consider those risks when using it.")
```
([`CppOptions.java`](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/rules/cpp/CppOptions.java))

That single-file-per-library form is the surviving fragment of a much larger effort. The
original XXL patch, [`bazelbuild/bazel#19940`](https://github.com/bazelbuild/bazel/pull/19940)
("support C++20 Modules", opened 2023-10-25, discussion at
[`bazelbuild/bazel#19939`](https://github.com/bazelbuild/bazel/discussions/19939)), was **closed
unmerged** (updated 2025-11-12) and split into smaller patches, the first of which
([`bazelbuild/bazel#22425`](https://github.com/bazelbuild/bazel/pull/22425)) landed
`module_interfaces` alone. The harder case — a `cc_library` with *multiple* `module_interfaces`
files that `import` each other, which is what a realistic C++20 module graph needs — was added
by [`bazelbuild/bazel#27927`](https://github.com/bazelbuild/bazel/pull/27927) (merged
2025-12-10), then **reverted nine days after the maintainer first flagged a problem** by
[`bazelbuild/bazel#28190`](https://github.com/bazelbuild/bazel/pull/28190) (merged 2026-01-08).
The revert reason, from the PR author directly: a measured internal-benchmark regression of
~425 seconds of extra CPU time, split roughly 302s in digest computation
(`MetadataDigestUtils.getDigest()`, `Fingerprint.addString()`) and ~120s in mandatory-input
iteration, caused by the action-cache key now hashing the module-interface DAG's mandatory
inputs twice
([`bazelbuild/bazel#27492` comment thread](https://github.com/bazelbuild/bazel/pull/27492)).
The tracking issue, [`bazelbuild/bazel#4005`](https://github.com/bazelbuild/bazel/issues/4005)
(opened 2017-11-01), was closed 2026-01-19 — apparently on the strength of the 2023 "support is
here" announcement — and **explicitly reopened 2026-01-20** at a contributor's request, citing
"significant limitations" and the just-reverted patch. As of 2026-09-05 there is no comment
proposing a re-landing timeline.

**Dated verdict**: native C++20 module support in Bazel, as of 2026-09-05, is a
single-module-interface-per-library experimental attribute with an explicit no-guarantees
warning, unchanged across the entire 8.x-through-9.2.0 range; the multi-module case needed for
non-trivial module graphs was merged and reverted within one month over four years after the
feature was first announced as "here." Interim options remain third-party: `rules_ll` (Clang
`std` module support), `rules_cc_module` (an independent, GCC-oriented implementation), neither
endorsed by upstream and both outside this file's scope to evaluate further (M-L-14).

### 6. compile_commands.json via `aquery`, and its staleness model

Hedron's `bazel-compile-commands-extractor` is the practitioner-cited de facto generator (map
row M-L-15, priority P1: "IDE support is the top-ranked C++ adoption blocker"). Its own
implementation notes state the mechanism and why it was chosen over the alternatives:

> "We ask Bazel which compile commands it plans to issue during build actions using [`aquery`
> ("action query")]... The key important features of `aquery` that make it the right choice are
> (1) that it operates over compile actions, so it directly gives us access to the configured
> compile invocations we need … and (2) that it's comparatively really fast because it doesn't
> do a full build."
([`ImplementationReadme.md:57,150`](https://github.com/hedronvision/bazel-compile-commands-extractor/blob/main/ImplementationReadme.md))

The same document quantifies the alternative it replaced: the previous implementation used
`action_listeners`, invoked only alongside a full build, making first generation "~30m instead
of `aquery`'s 30s," with warm-cache rebuilds still ~10 minutes for multi-target repos due to an
[unrelated Bazel cache-miss bug (`bazelbuild/bazel#13029`)](https://github.com/bazelbuild/bazel/issues/13029).
`query`/`cquery`/aspects were explicitly rejected too: they "crawl the graph of bazel targets…
rather than actually listening to the commands Bazel is going to invoke," so reproducing
per-toolchain, per-platform, per-transition command-line logic would mean re-implementing the
rule's own flag-assembly logic outside Bazel
([`ImplementationReadme.md:154`](https://github.com/hedronvision/bazel-compile-commands-extractor/blob/main/ImplementationReadme.md)).

**Staleness has no automated detection.** The user-facing README's model is explicit: "every
time you want tooling (like autocomplete) to see new `BUILD`-file changes, rerun the command
you chose below! Clangd will automatically pick up the changes"
([`README.md`](https://github.com/hedronvision/bazel-compile-commands-extractor/blob/main/README.md)).
There is no watch mode, no build-graph hook, no CI check bundled with the tool that fails when
`compile_commands.json` no longer matches the current `BUILD` files — freshness is entirely a
human habit, re-running `bazel run @hedron_compile_commands//:refresh_all` (or the
target-scoped `refresh_compile_commands` rule) by hand (M-L-15).

### 7. Linux-to-Windows cross-compilation: the MSVC path-absoluteness bug

Path absoluteness in Bazel's C++ toolchain configuration is resolved using the **host**
platform's rules, not the **target** platform's, which breaks Linux-to-Windows RBE and
cross-compilation:

> "the logic to determine whether a path is absolute is host-dependent, so a path like
> `C:/foo/bar` is considered relative on Linux (because it doesn't start with `/`) but absolute
> on Windows. The result is that a Bazel running on Linux will produce an **incorrect command
> line** for a C++ action executed on Windows" — producing, in the reporter's repro, a compiler
> invocation path of
> `third_party/toolchains/rbe_windows_.../C:/VS/VC/Tools/MSVC/.../cl.exe` (the toolchain
> package path wrongly prepended to what should be an absolute Windows path).
([`bazelbuild/bazel#19208`](https://github.com/bazelbuild/bazel/issues/19208), opened
2023-08-09, **open**, last activity 2024-04-29)

No fix has landed as of 2026-09-05 — over two years with no further comment after the
discussion converged on a preferred fix direction (resolve absoluteness using the *execution
platform*, not the host OS). A related, independently-reported bug shows the same root cause
in native (non-cross) Windows builds: `--platforms` targeting a non-host architecture silently
failed to select a toolchain, and an ARM64 Windows host silently emitted an x64 binary with no
platform constraints at all
([`bazelbuild/bazel#22164`](https://github.com/bazelbuild/bazel/issues/22164), opened
2024-04-27 on Bazel 7.1.1). A community diagnosis on that thread names the underlying
assumption directly: "The host toolchain is almost always made with the assumption that `host =
exec = target`, so cross-compilation is usually out of the scope of such a toolchain" — the
autodetected `@local_config_cc` toolchain gives a *false impression* of being multi-platform
when it is not. That issue was **auto-closed `not_planned` for inactivity on 2026-08-07** —
within the month before this research — unfixed, not resolved (M-L-16).

### 8. The general trap: a transition setting legacy flags is invisible to `--platforms`

Bazel's own "Migrating to Platforms" reference states the general rule the brief asks to
capture, unchanged in the current Active-LTS docs:

> "[Starlark transitions] change flags down parts of your build graph. If your project uses a
> transition that sets `--cpu`, `--crosstool_top`, or other legacy flags, rules that read
> `--platforms` won't see these changes.
>
> When migrating your project to platforms, you must either convert changes like `return {
> "//command_line_option:cpu": "arm" }` to `return { "//command_line_option:platforms":
> "//:my_arm_platform" }` or use platform mappings to support both styles during migration."
([`docs/versions/9.1.0/concepts/platforms.mdx#L235-L244`](https://github.com/bazelbuild/bazel/blob/master/docs/versions/9.1.0/concepts/platforms.mdx))

The same page states the mirror-image trap for `select()`: "`select`s on `--cpu`,
`--crosstool_top`, etc. don't understand `--platforms`" — same disjoint-flag-space problem, one
level up the configuration stack. `platform_mappings` (default file name `platform_mappings` at
the workspace root, or `--platform_mappings=//:my_custom_mapping`) is the only bridge Bazel
documents, and its own doc calls it "a temporary API… a blunt tool… expect to eventually
eliminate it." This directly explains a class of cross-compilation failure distinct from #7's
path bug: a custom transition written against the legacy flags (common in older, WORKSPACE-era
cross-compile setups, including many still-current fat-binary/multi-arch transitions) can
appear to succeed at the configuration level while the platform-based C++ toolchain resolution
silently keeps using the exec platform's toolchain, because it was never told the transition
happened (M-L-16).

### 9. Symlinked-sandbox construction cost

Bazel's symlinked sandbox — the default, cross-platform sandbox strategy — constructs a fresh
directory of symlinks per action from its full input set. The tracking issue states the scale
directly:

> "The symlinked sandbox is slow when there is a large number of input files (I have seen
> reports of actions with up to 300K)"
([`bazelbuild/bazel#16711`](https://github.com/bazelbuild/bazel/issues/16711), opened
2022-11-09, **open**, last activity 2025-11-23)

Five concrete mitigations are proposed in the issue body (multi-threaded construction,
fewer Java↔C++ boundary crossings, one symlink per tree artifact instead of per file, `io_uring`
on Linux, and directory reuse across actions); of these, only directory reuse shipped, as
`--reuse_sandbox_directories` (renamed from `--experimental_reuse_sandbox_directories`, alias
kept silently via `oldNameWarning = false`), and it now **defaults `true`** identically across
every tagged version from 8.7.0 through 9.2.0
([`SandboxOptions.java`](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/sandbox/SandboxOptions.java)).
The `io_uring` idea was explicitly abandoned after a maintainer found it carried "several bugs,
including security-critical ones." The reported real-world source of 300K-input actions is
large vendored C/C++ trees inside a single action (a ChromeOS/Kleaf build was cited by name) —
exactly the shape a `rules_foreign_cc`-wrapped dependency produces when its `lib_source`
filegroup covers an entire upstream repository. As of 2026-09-05 the issue remains open for
first/cold sandbox construction; the shipped default-on directory reuse addresses only warm
rebuilds of the same or a similar action (M-L-18, in scope of this file's fetch list; the map's
own deferral of M-L-17/M-L-18 to "no C++ consumer" stands for the fleet, but the finding itself
is answered here as commissioned).

### 10. The "IDE integration ranks above modules" surprise, chased

The brief's named source is explicit about its own epistemic status:

> "I have no statistics on this. It is just my gut feeling that I developed after talking with
> a handful of C++ developers and Bazel users."
([Vertexwahn, "What blocks C++ developers from using Bazel in 2024"](https://medium.com/@Vertexwahn/what-blocks-c-developers-from-using-bazel-in-2024-4774fbc4d356))

The full ranking, as given: (1) missing IDE integration (particularly Visual Studio), (2)
missing C++20 modules support, (3) missing out-of-the-box library support, (4) `rules_cc`
quirks, (5) fear of Google discontinuing Bazel support, (6) time investment/learning curve, (7)
Java Runtime unavailability on target platforms, (8) Bazel not written in C++/Rust. The author's
own caveat: "Maybe other important things are completely missing here on the list and I am
pretty sure that some people would prioritize the list differently." Per the brief's own
instruction, this file treats the ranking as a **hypothesis**, not a settled finding — and finds
partial, indirect corroboration rather than confirmation: Hedron's tool (finding 6, above) is a
mature, single, cross-platform, daily-driven project with no serious rival, which argues *against*
"no solution exists" and *for* "the existing solution has platform-specific rough edges"
(the author reports good results with `clangd`/CLion, poor results with Visual Studio) — a
narrower, more specific claim than the raw ranking implies. Combined with two multi-year-open,
unfixed cross-compilation/toolchain-resolution issues (#7 above) and a C++20-modules effort that
was merged and reverted within the last quarter (#5 above), the *general* pattern the ranking
points at — C++ tooling maturity trailing the core build model — is corroborated by dated,
primary evidence even though the specific #1-vs-#2 ordering rests on one person's impression.

## Decisions

**1. Does the shipped C++ file recommend `rules_foreign_cc`, or treat it as a last resort?**
**Decision: last resort, scoped to vendored/third-party C or C++ you do not own and will not
rewrite as native `cc_*`.** Evidence: the ruleset's own stated design scope ("not fully under
your control," finding 4); `layering_check` is structurally unreachable for any target it
produces (finding 2), which forecloses this group's other dive's hygiene story for that whole
dependency subtree; two multi-year-open, unfixed issues (Windows slowness since 2021, finding
3; the layering_check gap since 2024, finding 2) show no active push toward closing the gap.
**Assumption named**: the fleet has zero C++ targets and one CMake probe directory, so this
decision is a policy default grounded on upstream evidence, not on a measured in-fleet wrap; a
future adopter with an actual CMake-based first-party project should re-open this decision
against their own measured cost, not inherit it silently.

**2. What IDE setup does a C++ repo need before Bazel is usable day to day?**
**Decision: wire up Hedron's `bazel-compile-commands-extractor` (`refresh_compile_commands`
target, `aquery`-based) plus `clangd`, and document the manual-refresh staleness model
explicitly, before calling a C++ repo "Bazel-ready" for daily development.** Evidence: `aquery`
is ~60x faster than the historical `action_listener` alternative for first generation (30s vs
30m, finding 6); there is no cross-platform, cross-editor rival with comparable adoption
(finding 10); staleness is unavoidably manual, so a repo's own onboarding must say so rather
than let developers discover it as a mystery ("why is autocomplete wrong") (finding 6).
**Assumption named**: this is graded against the brief's named "IDE integration" adoption
blocker treated as a hypothesis (finding 10), not as an established, ranked fact — the decision
would be the same either way, since `aquery`-based compile-commands generation is independently
the only mechanically sound option regardless of how big a blocker IDE support turns out to be
in practice.

## Normative guidance candidates

1. **Never enable, or expect to enable, `features = ["layering_check"]` on a `cc_library`
   whose `deps` include a `rules_foreign_cc` target (`cmake`, `configure_make`, `make`,
   `ninja`, `boost_build`).**
   Rationale: the ruleset's own `FOREIGN_CC_DISABLED_FEATURES` list force-disables
   `layering_check` (and `module_maps`, `fdo_instrument`, `fdo_optimize`, `thin_lto`) when
   configuring the toolchain flags handed to the external build — the request cannot reach it.
   Verify: `grep -rln 'features = \[.*layering_check' --include=BUILD* --include=*.bzl .` then
   for each hit, check whether any `deps` entry resolves to a `cmake(`/`configure_make(`/
   `make(`/`ninja(`/`boost_build(` rule. EMPTY on the first grep = pass; a non-empty first grep
   whose target's deps include a foreign_cc rule = finding.
   Severity: MUST. Bazel: all majors; rules_foreign_cc `main` (0.15.1+, 2026-09). M-ID: M-L-13.
   Depends on: (none in BZL-HERM; the mechanism itself belongs to
   `layering-check-includes-and-sanitizers.md`, M-L-06/M-L-07, cited not restated.)

2. **Declare `lib_source` as a filegroup covering the wrapped project's entire source tree
   (typically `glob(["**"])`), never a curated subset.**
   Rationale: the foreign build system decides for itself which files it reads; a narrower
   glob silently drops a file it needs, and the failure surfaces deep inside the wrapped
   build's own error output, not as a Bazel-level "missing input" message pointing at the glob.
   Verify: for each `cmake(`/`configure_make(`/`make(`/`ninja(` target, `grep -B5` its
   `lib_source` value's `filegroup` definition and confirm the `srcs` glob has no exclusion
   pattern narrower than the whole package tree. EMPTY (no narrowing pattern found) = pass.
   Severity: SHOULD. Bazel: all; rules_foreign_cc 0.15.1+. M-ID: M-L-13.

3. **Enumerate every artifact the wrapped build actually produces via
   `out_static_libs`/`out_shared_libs`/`out_interface_libs`/`out_binaries`/`out_include_dir`/
   `out_data_dirs`/`out_data_files` — an unlisted artifact is invisible to Bazel, not an error.**
   Rationale: Bazel declares an output only for names present in these attributes; a produced
   file absent from all of them never becomes a Bazel-tracked output, so a downstream `deps`
   edge that needs it fails with "no such output" pointing at the *consumer*, not the cause.
   Verify: run the target once, then diff the wrapped build's own install/output directory
   listing against the attributes' declared names by hand (no generic Bazel query reaches
   inside a foreign build's own log) — a named reading heuristic, not a command. EMPTY diff
   (every produced file is named) = pass.
   Severity: SHOULD. Bazel: all; rules_foreign_cc 0.15.1+. M-ID: M-L-13.

4. **Treat `rules_foreign_cc` as the tool for vendoring a third-party C/C++ dependency you do
   not control, never as the long-term build strategy for a repo's own first-party CMake or
   Autotools project.**
   Rationale: the ruleset's own docs scope it to "large and mature open source software… not
   fully under your control"; a first-party project under active development pays the
   hand-declared-I/O tax (rules 2-3) and the forced-off `layering_check` cost (rule 1)
   indefinitely, for code the team could instead port to native `cc_library`/`cc_binary`.
   Verify: named reading heuristic — for every `cmake(`/`configure_make(`/`make(`/`ninja(`
   target, check whether `lib_source` resolves to a path under the same repo/workspace as the
   BUILD file invoking it (first-party) versus an external repository fetched via
   `http_archive`/a module extension (third-party, vendored). A first-party hit is a finding.
   Severity: CONSIDER (argued, per house standard for a source resting on the ruleset's stated
   intent rather than a hard technical constraint). Bazel: all; rules_foreign_cc 0.15.1+.
   M-ID: M-L-13.

5. **Budget materially more CI wall-clock time for `configure_make`/`make` targets on Windows
   specifically, and do not treat a Windows-only slowdown as an environment misconfiguration.**
   Rationale: the Windows-specific `symlink_to_dir` path walks and recreates the source tree
   via PowerShell rather than a native symlink, an open, unfixed report since 2021.
   Verify: compare wall-clock time for the same `configure_make`/`make` target's build action
   across a Windows CI leg and a Linux/macOS leg with `--profile` enabled on both; a
   disproportionate (order-of-magnitude) Windows slowdown localized to the wrapped-build action
   confirms the pattern rather than a flaky runner. EMPTY (comparable times) = pass.
   Severity: SHOULD. Bazel: all; rules_foreign_cc 0.15.1+ (unresolved as of this version).
   M-ID: M-L-13.

6. **Do not adopt `--experimental_cpp_modules`/`module_interfaces` for anything beyond an
   isolated, single-`cc_library`, single-module-interface experiment.**
   Rationale: the flag's own help text states "no guarantees about incompatible changes to it
   or even keeping the support in the future"; the multi-module-interface case (what a real
   module graph needs) was merged and reverted within one month over a measured performance
   regression, four years after the effort was first announced as production-ready.
   Verify: `grep -rn 'experimental_cpp_modules' .bazelrc* .github/workflows/*.yml` and
   `grep -rln 'module_interfaces' --include=BUILD* .`. EMPTY on both = pass (not in use, no
   finding); non-empty = confirm the repo has explicitly accepted the experimental-flag risk in
   writing (a comment or ADR), not merely inherited it from a copied example.
   Severity: MUST (do not use in a production dependency graph without an explicit, written
   risk acceptance). Bazel: 8.7.0 and 9.2.0 identically (flag unchanged). M-ID: M-L-14.

7. **Do not cite "Bazel supports C++20 modules" as a settled fact in any onboarding material
   without the date and the specific attribute/flag pair — treat `bazelbuild/bazel#4005`'s own
   history (closed as resolved 2026-01-19, reopened 2026-01-20) as the cautionary example.**
   Rationale: an earlier "the support is here" announcement (2023-10-25) did not hold across
   the four years to the tracking issue's most recent close-then-reopen cycle; a static claim
   goes stale in exactly the way this issue's own history demonstrates.
   Verify: named reading heuristic — any prose claim of C++20-module support must name
   `--experimental_cpp_modules`, the Bazel version(s) checked, and a date; a claim with none of
   the three is unverifiable and should be rejected in review. EMPTY (no bare claim found) =
   pass.
   Severity: SHOULD. Bazel: 8.7.0, 9.x (dated 2026-09-05). M-ID: M-L-14.

8. **Wire up Hedron's `bazel-compile-commands-extractor` (`refresh_compile_commands` +
   `clangd`) as the floor for "Bazel-ready" C++ development, and never build
   `compile_commands.json` via a full build or `action_listener`/`extra_action`.**
   Rationale: `aquery` reports the action graph's actual compile commands directly without a
   full build (~30s vs ~30m cold for the `action_listener` predecessor); `query`/`cquery`/
   aspects would require re-implementing the toolchain's own flag-assembly logic to get the
   same answer.
   Verify: `grep -rln 'action_listener\|extra_action' --include=BUILD* --include=*.bzl .` for
   any C++-tooling-adjacent target, and confirm `@hedron_compile_commands` (or an equivalent
   `aquery`-based generator) is present in `MODULE.bazel`/`WORKSPACE`. A hit on the first grep
   for compile-commands purposes, or absence of the second, is a finding.
   Severity: SHOULD. Bazel: all; `hedron_compile_commands` HEAD (`main`, 2026-09,
   commit `abb61a6`). M-ID: M-L-15.

9. **Document, in the repo's own onboarding, that `compile_commands.json` freshness is a
   manual re-run, not an automatic or CI-enforced property.**
   Rationale: the generator's own instructions are "every time you want tooling to see new
   BUILD-file changes, rerun the command" — there is no watch mode and no bundled CI check that
   fails on drift, so an un-warned developer will file "autocomplete is wrong" as a mystery bug.
   Verify: named reading heuristic — the repo's contributor docs/README must state the re-run
   command and when to use it. EMPTY (no such note found in onboarding docs) = finding.
   Severity: SHOULD. Bazel: all. M-ID: M-L-15.

10. **When using `--remote_download_toplevel` (Bazel's build-without-the-bytes default) with a
    compile-commands generator, also pass the generator-recommended `--remote_download_regex`
    for header and source outputs, or `clangd` will report errors on files never pulled to
    disk.**
    Rationale: the extractor's own README names this exact failure mode as a known rough edge
    once BwoB is in play for the build backing `compile_commands.json`.
    Verify: `grep -n 'remote_download_regex\|remote_download_toplevel' .bazelrc*` — if
    `remote_download_toplevel` (or BwoB's default) is set and the generator is used, the regex
    flag must also be present. EMPTY on the regex when BwoB is active = finding.
    Severity: CONSIDER. Bazel: all (BwoB `toplevel` is Bazel's long-standing default).
    M-ID: M-L-15.

11. **Never assume a Starlark transition that sets `--cpu`/`--crosstool_top` (or any other
    legacy configuration flag) is visible to a rule that reads `--platforms` — the two flag
    spaces are disjoint unless bridged by an explicit `platform_mappings` file.**
    Rationale: Bazel's own migration reference states this outright; a transition author who
    assumes otherwise gets a build that silently keeps compiling for the wrong (exec-platform)
    toolchain with no error.
    Verify: for every custom transition, `grep -A5 'def _.*_transition_impl'` its returned
    dict; a dict containing `//command_line_option:cpu` or `//command_line_option:crosstool_top`
    with no accompanying `//command_line_option:platforms` key, feeding a target whose toolchain
    resolution reads `ctx.toolchains`/`--platforms`, is a finding. EMPTY (no legacy-only
    transitions found) = pass.
    Severity: MUST. Bazel: all majors (documented since the platforms migration began; current
    text unchanged through 9.1.0). M-ID: M-L-16.

12. **Before relying on Linux-to-Windows C++ cross-compilation (including for RBE), confirm
    the toolchain's tool paths resolve correctly under the *execution* platform's
    path-absoluteness rules, not the host's — and track `bazelbuild/bazel#19208` as open, not
    assume it was fixed.**
    Rationale: a Windows-style absolute path (`C:/...`) is read as relative on a Linux host,
    producing a broken, silently-wrong compiler invocation with no clear error pointing at the
    root cause; the bug has been open, unfixed, since 2023-08-09.
    Verify: run the actual cross-compile action with `--subcommands` and inspect the emitted
    compiler command line for a path where the toolchain's package path has been prepended to
    what should already be an absolute Windows path (the `.../C:/...` pattern from the upstream
    repro). EMPTY (no such malformed path) = pass for this specific bug; presence = confirmed
    hit, no upstream fix to apply, exec-platform-specific `cc_toolchain_config` paths are the
    only documented workaround as of 2026-09-05.
    Severity: MUST (know the limitation before committing to this cross-compile path). Bazel:
    all majors (unfixed since Bazel built at/after commit `2f0948b`, ~2023). M-ID: M-L-16.

13. **Treat "native ARM64 Windows silently produces x64" and "cross-compiling from Linux to
    Windows silently mis-resolves the toolchain" as the same underlying autodetected-toolchain
    assumption, not two unrelated mysteries — the default `@local_config_cc` toolchain assumes
    `host = exec = target`.**
    Rationale: a community diagnosis on the independently-filed native-Windows bug names this
    exact assumption as the root cause of a symptom that looks unrelated to the Linux-to-Windows
    path bug; recognizing the shared cause prevents two separate, wasted debugging sessions.
    Verify: named reading heuristic — if a Windows or cross-Windows C++ build produces the wrong
    architecture or a malformed toolchain path, first check whether `@local_config_cc` (the
    autodetected toolchain) is in use at all (`bazel query
    'somepath(//your:target, @local_config_cc//...)'`) before debugging further. Non-empty
    query result (autodetected toolchain in the resolved graph) = the likely cause; register an
    explicit, platform-specific `cc_toolchain` instead.
    Severity: SHOULD. Bazel: all majors; the underlying issue (`bazelbuild/bazel#22164`) was
    auto-closed `not_planned` 2026-08-07, unfixed. M-ID: M-L-16.

14. **For a C++ target whose `lib_source`/input set exceeds roughly 100K files (a large vendored
    tree wrapped via `rules_foreign_cc`, or an equivalent first-party monorepo subtree), expect
    symlinked-sandbox construction to be a measurable fraction of wall-clock time on a cold
    build, and confirm `--reuse_sandbox_directories` is not explicitly disabled.**
    Rationale: sandbox construction cost is reported dominant around 300K input files and scales
    with input count; the one shipped mitigation (directory reuse across actions) only helps
    warm/repeated actions, and is on by default but can be turned off.
    Verify: `grep -n 'reuse_sandbox_directories' .bazelrc*` for an explicit `=false`; separately,
    `bazel build --profile=/tmp/profile.gz <large-input-target>` and inspect the profile for
    sandbox-creation time as a fraction of total action time. EMPTY on the grep (flag left at
    its `true` default) = pass; a large sandbox-creation fraction in the profile even with the
    default on = a real, currently-unmitigated cold-build cost, not a misconfiguration.
    Severity: CONSIDER. Bazel: 8.7.0-9.2.0 (flag default identical throughout).
    M-ID: M-L-18.

15. **Do not repeat a "gut feeling, no statistics" adoption-blocker ranking as if it were a
    measured survey result — corroborate each ranked item against dated, primary evidence
    before it informs a rule's severity.**
    Rationale: the practitioner ranking naming missing IDE integration as the #1 C++ adoption
    blocker is explicitly self-described by its author as ungrounded in data; treating it as
    settled would misattribute weight the author never claimed for it.
    Verify: named reading heuristic — any reference to this ranking (or a similarly-framed
    "practitioners say" claim) in shipped guidance must carry the "self-described gut feeling,
    no statistics" qualifier alongside it, or cite independent corroborating evidence instead
    (as this file does in finding 10). EMPTY (claim stated as settled fact, unqualified) =
    finding.
    Severity: SHOULD. Bazel: n/a (a sourcing-discipline rule, not a Bazel-version-specific one).
    M-ID: none directly (methodology guard for M-L-13 through M-L-16's practitioner citations).

16. **A `cmake()` target with `generate_crosstool_file = True` inherits whichever C++ toolchain
    Bazel itself resolved (autodetected or explicitly registered) into the generated CMake
    toolchain file — audit the wrapping repo's own toolchain hermeticity before trusting the
    wrapped CMake build's toolchain choice.**
    Rationale: the attribute's own doc states the CMake crosstool file is "generated from the
    toolchain values" Bazel already resolved; a repo relying on autodetection (governed by
    [BZL-HERM-07](../bazel-hermeticity-determinism.md)) or carrying an inert host-specific
    override (governed by [BZL-HERM-08](../bazel-hermeticity-determinism.md)) propagates that
    exact gap into every `cmake()` target using this attribute, silently.
    Verify: `grep -n 'generate_crosstool_file' --include=BUILD* --include=*.bzl -r .`; for each
    hit, cross-check against BZL-HERM-07/-08's own verification
    (`grep -n 'BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN\|CC=\|layering_check' .bazelrc*`). EMPTY on the
    first grep = not applicable, pass.
    Severity: SHOULD. Bazel: all; rules_foreign_cc 0.15.1+. M-ID: M-L-13.
    Depends on: BZL-HERM-07, BZL-HERM-08.

17. **Never assume `rules_foreign_cc`'s `configure_make`/`cmake` output is remote-cacheable at
    the same hit rate as a native `cc_library` without measuring it — a foreign build's own
    configure step frequently embeds absolute paths or timestamps outside Bazel's action-key
    contract.**
    Rationale: the wrapped build's own `configure`/`cmake` invocation is a black box to Bazel's
    action-key computation beyond its declared inputs and outputs; anything the underlying tool
    does internally (embedding `$(pwd)`, a timestamp, a discovered absolute toolchain path) that
    Bazel cannot see is a determinism gap this file's own rule set (1-3) does not close.
    Verify: build the same foreign_cc target twice from two distinct absolute checkout paths
    with remote caching enabled and diff the resulting artifacts (or their action keys via
    `bazel aquery` before/after) — a cache miss or a byte-level diff on the second build
    despite unchanged sources is the smell. EMPTY (identical outputs, cache hit) = pass, but
    this is a spot check, not a standing guarantee — re-run whenever the wrapped tool's version
    is bumped.
    Severity: CONSIDER. Bazel: all; rules_foreign_cc 0.15.1+. M-ID: M-L-13.

## Fleet evidence

The fleet defines **zero** `cc_binary`/`cc_library`/`cc_toolchain` targets anywhere
([`build-contracts-and-ci-posture.md:37`](../bazel-audit/build-contracts-and-ci-posture.md)),
so none of this file's rules have a target to check against today. The one adjacent fact the
fleet does exhibit: `rules_ocx`'s `.bazelrc.user:2-3` sets a host-specific `CC=` wrapper and
disables `layering_check`, entirely because Bazel's built-in C++ autodetection probe runs at
workspace setup "regardless of whether any `cc_*` target is ever requested"
([`build-contracts-and-ci-posture.md:220,297`](../bazel-audit/build-contracts-and-ci-posture.md)).
That is [BZL-HERM-07](../bazel-hermeticity-determinism.md)'s and
[BZL-HERM-08](../bazel-hermeticity-determinism.md)'s territory (autodetection avoidance and the
latent-trap framing), not this file's — but it is exactly the condition rule 16 above names:
were any future `cmake()` target in this repo to set `generate_crosstool_file = True`, it would
inherit that same override, live rather than latent. As instructed by both the map and the
addendum, this file records that connection and otherwise contributes no fleet-measured
evidence: the fleet's "one CMake probe directory" is not itself a Bazel target
([frame, "The codebases that will adopt the output"](../bazel-frame.md)) and was not re-examined
as part of this dive.

## AI-agent angle

- **Writing `cc_library(...)`/`cc_binary(...)` with no `load()` on a Bazel-9-targeted repo.**
  `--incompatible_autoload_externally` defaults to an empty allowlist starting at Bazel 9.0.0,
  so `cc_binary`/`cc_library`/`cc_test`/`cc_toolchain` are no longer autoloaded natives — every
  BUILD file needs an explicit `load("@rules_cc//cc:defs.bzl", "cc_library", ...)` (or the
  ruleset's own equivalent) ([bazel-frame.md, wave 1 correction 2](../bazel-frame.md)). A model
  trained on pre-2026 WORKSPACE-era examples reliably omits this. Mechanical check: for any
  `BUILD`/`BUILD.bazel` file targeting Bazel ≥9, `grep -L '^load(' <file>` combined with `grep
  -l 'cc_library(\|cc_binary(\|cc_test(\|cc_toolchain('` — a file matching the second but not
  the first is a hit.
- **Hallucinating `--experimental_cpp20_modules` instead of `--experimental_cpp_modules`.**
  Blog posts and the original 2023-2024 PR discussion used the "20" form; the flag that actually
  shipped and that ships in both 8.7.0 and 9.2.0 is `--experimental_cpp_modules` (finding 5).
  Mechanical check: `bazel build --experimental_cpp20_modules //...` returns "ERROR: Unrecognized
  option" — running the exact flag name a model proposes against the real binary is the cheapest
  verification.
- **Recommending `layering_check` be enabled on a `cc_library` wrapping a `rules_foreign_cc`
  dependency to "improve include hygiene."** It cannot reach the foreign_cc-produced module
  (finding 2); a model unaware of `FOREIGN_CC_DISABLED_FEATURES` will propose this as a
  plausible-sounding, untested fix. Mechanical check: rule 1's grep above.
- **Reaching for `rules_foreign_cc` as the default/first move for any non-Bazel-native C/C++
  dependency**, rather than checking the BCR for an existing native `cc_library`-based module
  first. Mechanical check: before adding a `cmake()`/`configure_make()` target, `bazel query`
  the BCR (or run `bazel mod show_repo`) for the same library name — a native module that
  already exists makes the foreign-build wrap unnecessary complexity.
- **Proposing an `action_listener`/`extra_action`-based `compile_commands.json` generator**,
  copied from a pre-2019 blog post or Stack Overflow answer, instead of the `aquery`-based
  approach every current source recommends (finding 6). Mechanical check: rule 8's grep for
  `action_listener`/`extra_action` in any newly-added C++-tooling BUILD/`.bzl` content.
- **Assuming a custom transition that flips `--cpu` for a fat-binary or multi-arch build is
  automatically compatible with `--platforms`-based toolchain resolution** (finding 8). A model
  that has seen many pre-platforms-migration transition examples in training data will not
  surface the gap on its own. Mechanical check: rule 11's grep over the transition's returned
  dict for a legacy-only key set.
- **Citing the Vertexwahn practitioner ranking (finding 10) as if it were measured data** rather
  than one person's stated impression — a model summarizing "why C++ teams avoid Bazel" from
  this or a similar source will often drop the "no statistics, gut feeling" qualifier when
  compressing the source. Mechanical check: rule 15's reading heuristic.

## Contested / evolving

- **`layering_check` for foreign-build-wrapped dependencies**: the one open issue
  (`bazel-contrib/rules_foreign_cc#1221`) has a maintainer-acknowledged workaround (split the
  `CcInfo`, opt the edge *out* of the check) but no stated plan to make foreign_cc targets
  themselves generate a real module map. Trending: unresolved, low apparent priority, as of
  2026-09-05.
- **Native C++20 modules**: actively regressing, not steadily progressing, this era — a
  merge-then-revert cycle inside a five-week window (2025-12-10 to 2026-01-08), and a tracking
  issue reopened 2026-01-20 after being treated as closed. The trend line since the original
  2023-10-25 "it's here" announcement is not monotonic; treat any point-in-time claim about
  module support (including this file's own, dated 2026-09-05) as provisional.
- **Linux-to-Windows and native-Windows C++ toolchain resolution**: three independently filed,
  multi-year-old issues (`#720` since 2021, `#19208` since 2023, `#22164` since 2024, the last
  auto-closed `not_planned` 2026-08-07) point at the same underlying autodetected-toolchain
  assumption without a unifying fix ever having shipped. Trending: stagnant — the pattern
  recurs faster than any individual instance gets closed with a real fix.
- **IDE integration**: the specific #1-ranking claim (finding 10) is a single, self-qualified
  practitioner opinion, actively contested by its own author's caveat that others would rank it
  differently. What is *not* contested: `clangd`+Hedron's extractor is the converged-on
  cross-platform answer, with per-platform gaps (Visual Studio specifically) rather than a
  missing solution overall.
- **Symlinked-sandbox cost**: the mitigation roadmap in `#16711` is four years old with one of
  five proposed fixes shipped (directory reuse, now default-on); `io_uring` was explicitly
  abandoned over its own security bugs. Trending: incremental, not a rewrite — expect the
  cold-build cost to persist for high-input-count actions for the foreseeable future.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [rules_foreign_cc `cc_toolchain_util.bzl`](https://github.com/bazel-contrib/rules_foreign_cc/blob/main/foreign_cc/private/cc_toolchain_util.bzl) | Ruleset source, `main` | fetched 2026-09-05 | `FOREIGN_CC_DISABLED_FEATURES` — primary proof `layering_check` is force-disabled |
| [rules_foreign_cc `framework.bzl`](https://github.com/bazel-contrib/rules_foreign_cc/blob/main/foreign_cc/private/framework.bzl) | Ruleset source, `main` | fetched 2026-09-05 | Exact `out_*`/`lib_source`/`deps` attribute names and doc strings |
| [rules_foreign_cc `docs/README.md`](https://github.com/bazel-contrib/rules_foreign_cc/blob/main/README.md) | Stardoc-generated attribute reference, `main` | fetched 2026-09-05 | Full attribute tables for `cmake`/`configure_make`/`make`/`ninja`/`boost_build` |
| [rules_foreign_cc `docs/src/index.md`](https://github.com/bazel-contrib/rules_foreign_cc/blob/main/docs/src/index.md) | Ruleset's own scope statement | fetched 2026-09-05 | The "not fully under your control" framing behind Decision 1 |
| [`bazel-contrib/rules_foreign_cc#1221`](https://github.com/bazel-contrib/rules_foreign_cc/issues/1221) | Issue, open | opened 2024-06-30 | Live user report + maintainer confirmation of the `layering_check` block |
| [`bazelbuild/rules_foreign_cc#720`](https://github.com/bazelbuild/rules_foreign_cc/issues/720) | Issue, open | opened 2021-07-13 | Windows `configure_make` slowness, root-caused to `symlink_to_dir` |
| [`bazelbuild/bazel#19940`](https://github.com/bazelbuild/bazel/pull/19940) | PR, closed unmerged | opened 2023-10-25, updated 2025-11-12 | The original C++20-modules XXL patch and its fate |
| [`bazelbuild/bazel#19939`](https://github.com/bazelbuild/bazel/discussions/19939) | Discussion | 2023-10-25 onward | Design-doc discussion thread for #19940 |
| [`bazelbuild/bazel#4005`](https://github.com/bazelbuild/bazel/issues/4005) | Tracking issue, reopened | opened 2017-11-01, closed 2026-01-19, reopened 2026-01-20 | Full history of the "is it here yet" cycle, including the 2026 revert-driven reopen |
| [`bazelbuild/bazel#27927`](https://github.com/bazelbuild/bazel/pull/27927) / [`#28190`](https://github.com/bazelbuild/bazel/pull/28190) / [`#27492`](https://github.com/bazelbuild/bazel/pull/27492) | PRs, merged then reverted | 2025-12-10 merge, 2026-01-08 revert | Primary source for the multi-module-interfaces regression and revert |
| [`CppOptions.java` @ 9.2.0](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/rules/cpp/CppOptions.java) | Tagged Bazel source | tag 9.2.0, fetched 2026-09-05 | `--experimental_cpp_modules` exact name, default, and warning text |
| [`docs/versions/9.1.0/reference/be/c-cpp.mdx`](https://github.com/bazelbuild/bazel/blob/master/docs/versions/9.1.0/reference/be/c-cpp.mdx) and the 8.7.0 equivalent | Build Encyclopedia, versioned docs | tag-pinned, fetched 2026-09-05 | `module_interfaces` attribute doc, identical across 8.7.0 and 9.1.0 |
| [`docs/versions/9.1.0/concepts/platforms.mdx`](https://github.com/bazelbuild/bazel/blob/master/docs/versions/9.1.0/concepts/platforms.mdx) | "Migrating to Platforms" reference | tag-pinned, fetched 2026-09-05 | Verbatim source for the transition/`--platforms` invisibility rule and `platform_mappings` |
| [`bazelbuild/bazel#19208`](https://github.com/bazelbuild/bazel/issues/19208) | Issue, open | opened 2023-08-09 | Primary source for the MSVC path-absoluteness cross-compile bug |
| [`bazelbuild/bazel#22164`](https://github.com/bazelbuild/bazel/issues/22164) | Issue, closed not_planned | opened 2024-04-27, closed 2026-08-07 | Corroborating native-Windows toolchain-resolution bug, same root cause |
| [`bazelbuild/bazel#16711`](https://github.com/bazelbuild/bazel/issues/16711) | Issue, open | opened 2022-11-09 | Primary source for symlinked-sandbox cost, the "300K" figure, and the mitigation history |
| [`SandboxOptions.java` @ 8.7.0-9.2.0](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/sandbox/SandboxOptions.java) | Tagged Bazel source | tag-pinned, fetched 2026-09-05 | `--reuse_sandbox_directories` exact name, default `true`, and its `oldName` alias |
| [Hedron's `bazel-compile-commands-extractor` README](https://github.com/hedronvision/bazel-compile-commands-extractor/blob/main/README.md) | Ruleset's own repo, `main` | HEAD `abb61a6`, fetched 2026-09-05 | Setup instructions and the explicit manual-refresh staleness model |
| [Hedron's `ImplementationReadme.md`](https://github.com/hedronvision/bazel-compile-commands-extractor/blob/main/ImplementationReadme.md) | Ruleset's own repo, `main` | fetched 2026-09-05 | `aquery`-vs-`action_listener`-vs-`query`/`cquery`/aspects design rationale, with timings |
| [Vertexwahn, "What blocks C++ developers from using Bazel in 2024"](https://medium.com/@Vertexwahn/what-blocks-c-developers-from-using-bazel-in-2024-4774fbc4d356) | Practitioner blog, self-described opinion | 2024 | The named "chase the surprise" ranking, with its own explicit no-statistics caveat |
| [`bazel-hermeticity-determinism.md`](../bazel-hermeticity-determinism.md) and its `sandbox-environment-and-toolchain-leakage.md` dive | Wave-2 consolidation (internal) | 2026-09-05 | Source of BZL-HERM-07/-08/-09, cited not restated, for the `generate_crosstool_file` connection |
| [`build-contracts-and-ci-posture.md`](../bazel-audit/build-contracts-and-ci-posture.md) | Fleet audit (internal) | 2026-09-05 | Fleet-evidence file:line citations (zero `cc_*` targets, `.bazelrc.user` override) |
