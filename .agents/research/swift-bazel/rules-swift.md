---
title: rules_swift 4.2.1 under Bazel (BZL-SWIFT) - research for the bazel-quality depth file
topic: bazel/rules-swift (W3-10, rows M-O-01..M-O-07, M-O-09, M-O-10)
agent: bazel-rules-swift
model: sonnet
date_researched: 2026-10-10
sources_count: 23
fixtures: /home/mherwig/.cache/research-lang/swift-tools/fixtures/rules-swift/
scope: >
  A real `bazel` was run (8.8.0 and 9.2.0 from the ocx index, installed to ~/.cache/research-lang/bazel-tools/bin) on Linux x86_64
  with Swift 6.4 and 6.3, so the rows below are measured, not read, except where a row says "unverified: read only" (Apple, Windows,
  Bazel 10, Bazel 7). Covers rules_swift 4.2.1 (2026-10-09): when to adopt, toolchain registration, CC=clang, swift_library attributes,
  the feature map to the settled SW-GATE / SW-PKG / SW-TEST rules, swift_test with Swift Testing, rules_swift_package_manager 1.25.0
  and the docs-versus-code drift. Does not cover static/cross builds (M-O-08, P3), rules_apple, Gazelle for Swift, or bzlmod,
  hermeticity, caching, CI and flag discipline (those stay with rules/bazel-quality).
---

# rules_swift 4.2.1 under Bazel

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Measurement set-up and what was and was not run](#1-measurement-set-up)
   2. [When Bazel for Swift is justified (M-O-01)](#2-when-bazel-for-swift-is-justified-m-o-01)
   3. [Versions: Bazel 8-10, rules_swift 4.2.1, compatibility level (M-O-10)](#3-versions-m-o-10)
   4. [Toolchain: host Swift plus CC=clang, or the hermetic extension (M-O-02, M-O-03)](#4-toolchain-m-o-02-m-o-03)
   5. [swift_library, swift_binary, swift_test attributes (M-O-04)](#5-attribute-rules-m-o-04)
   6. [Features: the map to SW-GATE / SW-PKG (M-O-05)](#6-the-feature-map-m-o-05)
   7. [swift_test and Swift Testing (M-O-07)](#7-swift_test-and-swift-testing-m-o-07)
   8. [rules_swift_package_manager (M-O-06)](#8-rules_swift_package_manager-m-o-06)
   9. [Docs versus code drift (M-O-09)](#9-docs-versus-code-drift-m-o-09)
   10. [Decisions: framing, routing keywords, publish.toml](#10-decisions)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- Bazel was run, not just read: Bazel 8.8.0 and 9.2.0 against Swift 6.4 and 6.3 on Linux, 38 checks per combination, 0 unexpected results on 6.4 and 1 on 6.3 (the `NoUsage` warning group does not exist in 6.3). Apple and Windows rows are "unverified: read only".
- Frame the file "if you adopt Bazel for Swift": Bazel is secondary here (5 of 40 exemplars carry Bazel files, only rules_swift itself builds with it as the main system); a new Swift package keeps SwiftPM and `Package.swift` as its source of truth.
- rules_swift 4.2.1 is bzlmod-only (`bazel_compatibility = [">=8.0.0"]`, `compatibility_level = 3`) and the release is "compatible with Bazel 8.x LTS, 9.x LTS, and rolling releases"; the BCR presubmit tests 8.x, 9.x and rolling. Bazel 10 and Bazel 7 were not run.
- On Linux the default C++ toolchain is gcc and `swift_binary` / `swift_test` refuse it: the red is `Swift requires the configured CC toolchain use clang`. Fix: `common:linux --repo_env=CC=clang` in `.bazelrc` (green on 8.8.0, 9.2.0, Swift 6.4, 6.3), or register the hermetic toolchain, which needs no CC at all.
- Prefer the hermetic toolchain for CI and release: `swift.toolchain(swift_version_file = "//:.swift-version")`, one `use_repo` entry per platform, and register the `cc_toolchain_exec_<platform>` and `swift_toolchain_exec_<platform>` pair. The documented quickstart registers the `*_embedded_*` pair instead and a host build then fails (`target 'linux-toolchain' not declared`).
- A hermetic toolchain is not self-contained: on bare Ubuntu 24.04 it needed `libxml2`, `libncurses6` and `libsqlite3-0` from the host before it ran. `.swift-version` must name a release in rules_swift's bundled metadata (4.2.1: 6.2.1 to 6.4.0); `6.4.1` fails with a list of valid versions.
- `swift_library` rules that bit: set `module_name` explicitly (the derived name of `//pkg/sub:thing` is `pkg_sub_thing`, so `import thing` fails); `defines` propagates and `local_defines` does not; `alwayslink` defaults to True in code while the generated table says False; `package_name` is what unlocks `package` access across targets; a single non-`main.swift` source in a `swift_binary` is parsed as a library.
- Add `--worker_sandboxing` to the rc file: without it a `private_deps` leak compiles green (`user_of_private` exit 0) and with it the same target fails with `no such module 'Lib'`.
- SW-GATE-13 maps to the feature `swift.treat_warnings_as_errors` (passes `-warnings-as-errors`). The unprefixed `--features=treat_warnings_as_errors` is the C++ feature: it left a planted Swift warning green (exit 0). rules_swift's own `.bazelrc:27` uses that unprefixed name for its C++ tools.
- SW-GATE-15/16 map to `swift.werror.<Group>` (capitalised group, lowercase is silently dropped) plus `swift.werror.UnknownWarningGroup` and `swift.werror.StrictLanguageFeatures`; a misspelt `swift.upcoming.ExistentialAnyy` exits 0 silently and only the StrictLanguageFeatures promotion turns it red.
- SW-PKG-07/08 map to `swift.upcoming.<Name>` features (or `copts` with one flag per list element); `swift.enable_v6` adds `-swift-version 6` and the full Swift 6 set, otherwise rules_swift passes `-swift-version 5` explicitly, so Swift 5 mode is the default under Bazel. SW-PKG-16 stands: `swift.upcoming.ApproachableConcurrency` compiles, but spell the two members.
- `swift_test` already runs Swift Testing: the generated `main` runs `XCTestRunner` and then `SwiftTestingRunner`, mixed XCTest plus Swift Testing in one target passes, a failing `#expect` exits 3, and a target with zero tests exits 3 with `No tests were discovered.` The rule docs describe XCTest only.
- `swift.layering_check_swift` (red on a transitive import) and `swift.layering_check_unused_deps` (red on an unused `deps` entry) are Bazel-only gains with no SwiftPM twin; enable them globally with `--features=`.
- rules_swift_package_manager 1.25.0 works with rules_swift 4.2.1 on Bazel 8.8.0 and 9.2.0: `swift_deps.from_package(resolved=, swift=)`, `bazel mod tidy` fills `use_repo`, deps are `@swiftpkg_<identity>//:<Product>`. A stale `Package.resolved` builds green (false green), so gate it with `swift package resolve` plus a diff.
- `swift.debug_module_path` is documented as on by default for Xcode 27; no code in 4.2.1 enables it by default, and on Linux 6.4 enabling it with the explicit-module features fails with `unable to load standard library`. Treat it as Apple-only and unverified.
- Ship `rules/bazel-quality/swift.md` with `publish.toml [rules.bazel-quality]` 0.3.0 to 0.4.0, a routing row, the Siblings line and the docs count; the file is never a bundle member. Note `publish.toml:248-258` says "twelve depth files" and `docs/bazel-quality.md:4` says "fourteen" while the directory holds 14 before this one.

## Findings

### 1. Measurement set-up

- **Bazel** came from the ocx index: `ocx package install ocx.sh/bazelbuild/bazel:8.8.0` and `:9.2.0`, copied to `/home/mherwig/.cache/research-lang/bazel-tools/bin/bazel-8.8.0` and `bazel-9.2.0`. The ocx index tops out at those minors; [bazel.build/release](https://bazel.build/release) lists 9.3.0 (active, end of support Dec 2028), 8.8.1 (maintenance, Dec 2027) and Bazel 10 as rolling (2026-10-10). 9.3.0, 8.8.1 and 10 were not run.
- **Runtime**: `swift:6.4` / `swift:6.3` images; for the CC rows a derived image `rs-fixture-swift-gcc:<ver>` (`swift:<ver>` plus `gcc g++`, `fixtures/rules-swift/image/Dockerfile`) because the stock image has no gcc and Bazel's autoconfig then fails earlier with a different message. The hermetic rows run in `rs-fixture-ubuntu:24.04` (bare Ubuntu 24.04 plus `ca-certificates gcc g++ git libxml2 libncurses6 libedit2 libsqlite3-0 libcurl4t64 tzdata`, no Swift, no clang).
- **Wrappers** (all in the fixture directory): `loop.sh <bazel> <dir> <targets>` runs `bazel --output_user_root=... build //:<target>` per target inside the image with `CC=clang` (set `NOCC=1` to omit, `GCC=1` for the gcc image); `loop2.sh` is the same for `build`/`test` of explicit labels; `hb.sh` is the bare-Ubuntu variant; `aq.sh` prints a `SwiftCompile` command line; `inbz.sh <dir> '<pipeline>'` runs a shell pipeline with `bazel` on PATH; `matrix.sh <bazel> <swift>` replays 38 checks.
- **Matrix result**: [8.8.0/6.4] 38 OK, [9.2.0/6.4] 38 OK, [8.8.0/6.3] 37 OK + 1 expected-differs, [9.2.0/6.3] 37 OK + 1 (`nousage_group`, see 6.3 in section 6). Logs: `fixtures/rules-swift/logs/matrix-*.txt`.
- rules_swift evidence below cites the exemplar clone `bazelbuild/rules_swift@50450ed24dde` (HEAD 2026-10-09, `MODULE.bazel` byte-identical to the [4.2.1 tag](https://raw.githubusercontent.com/bazelbuild/rules_swift/4.2.1/MODULE.bazel)) and the 4.2.1 tag files.

### 2. When Bazel for Swift is justified (M-O-01)

Corpus: Bazel files in 5 of 40 repos; only rules_swift itself is Bazel-first. SwiftLint uses `rules_swift 3.6.1` for a macOS universal release binary with SwiftPM as the dev build (`realm/SwiftLint@ec4691d9e813:MODULE.bazel:15`, `.bazelversion` 9.x), tuist carries Bazel in the `swifterpm` sub-project with `rules_swift_package_manager 1.18.1` (`tuist/tuist@2f6ac74754bf:swifterpm/MODULE.bazel:9-33`), swift-syntax keeps a Bazel job as an alternative consumer path, swift-protobuf has BUILD files only [audit: exemplar-packaging-and-release.md, "Bazel for Swift (axis 6)"]. So the honest framing is the one `go.md` uses: the file binds **only if the repository already declares `bazel_dep(name = "rules_swift", ...)`**; adopting Bazel at all is `bazel-adopt`'s decision, and for Swift the default answer is "not unless the repository is already a Bazel monorepo (a polyglot build, a remote-cache requirement, a universal macOS release artifact)".

Reasons to stay on SwiftPM (each grounded below): Swift Testing under Bazel needs `swift_test` and the generated runner (section 7); every SwiftPM dependency goes through a second bridge (section 8) that can drift silently; Apple platforms need `rules_apple` on top (`README.md:24-26`, unverified: read only); Windows is in rules_swift's own CI but the presubmit builds only a subset (unverified: read only).

### 3. Versions (M-O-10)

- `rules_swift` 4.2.1 (2026-10-09): `bazel_compatibility = [">=8.0.0"]`, `compatibility_level = 3` (`bazelbuild/rules_swift@50450ed24dde:MODULE.bazel:3-8`, [MODULE.bazel at 4.2.1](https://raw.githubusercontent.com/bazelbuild/rules_swift/4.2.1/MODULE.bazel)). A Bazel 7 module resolution cannot select it; the README table gives Bazel 7.x a final rules version of 3.6.1 ([README, "Supported bazel versions"](https://raw.githubusercontent.com/bazelbuild/rules_swift/4.2.1/README.md), `README.md:136-155`): 10.x and 9.x from 3.5.0, 8.x from 1.14.0. unverified: read only for Bazel 7 and 10.
- The release notes say "compatible with Bazel 8.x LTS, 9.x LTS, and rolling releases" ([release 4.2.1](https://github.com/bazelbuild/rules_swift/releases/tag/4.2.1)) and the [BCR presubmit](https://raw.githubusercontent.com/bazelbuild/bazel-central-registry/main/modules/rules_swift/4.2.1/presubmit.yml) matrix is `bazel: [8.x, 9.x, rolling]` on `ubuntu2004` with `CC: clang`, `SWIFT_VERSION: 6.0.3` and `--action_env=PATH`. Measured here: 8.8.0 and 9.2.0 both green (matrix).
- Consumers of 3.x pin `max_compatibility_level = 3`: SwiftLint (`MODULE.bazel:15`) and rules_swift_package_manager 1.25.0, which declares `rules_swift` 3.6.0 with `max_compatibility_level = 3` ([rspm MODULE.bazel](https://raw.githubusercontent.com/cgrindel/rules_swift_package_manager/main/MODULE.bazel)); because 4.2.1 is level 3 as well, a root that declares 4.2.1 resolves it (rspm fixture builds green, V20).
- Swift versions: the hermetic extension's bundled release metadata for 4.2.1 holds 6.2.1, 6.2.2, 6.2.3, 6.2.4, 6.3, 6.3.1, 6.3.2, 6.3.3, 6.4.0 (`swift/internal/extensions/swift_release_metadata.json`). rules_swift's own MODULE pins `6.4.0` (`MODULE.bazel:257-260`), its BCR presubmit still builds against 6.0.3. Measured with the host toolchain 6.4 and 6.3 (matrix).
- `WORKSPACE` is gone for this ruleset: no `swift/repositories.bzl` exists at 4.2.1, the README says "Copy the `MODULE.bazel` snippet". WORKSPACE-era loads fail (V19).

### 4. Toolchain (M-O-02, M-O-03)

**The CC=clang requirement is real and measured.** README: "`swift_binary` and `swift_test` rules expect to use `clang` as the driver for linking ... By default, the C++ toolchain used by Bazel is `gcc`, so Swift users on Linux need to override this by setting the environment variable `CC=clang`" (`README.md:69-76`). The check is a `fail()` in the toolchain rule (`swift/toolchains/swift_toolchain.bzl:694`). Planted run (V01), `gcc` present, no `CC`:

```
Error in fail: Swift requires the configured CC toolchain use clang. Either use the locally installed LLVM by setting `CC=clang` in your environment before invoking Bazel, or configure a Bazel LLVM CC toolchain. The current CC toolchain is configured to use 'gcc'.
```

With `CC=clang` the same targets build, run and test. Without any gcc in the image the failure moves earlier: `Auto-Configuration Error: Cannot find gcc or CC; either correct your path or set the CC environment variable`. The rc-file spelling that rules_swift itself uses works and needs no shell variable:

```
# .bazelrc  (rules_swift@50450ed24dde:.bazelrc:47 spells it common:linux)
common:linux --repo_env=CC=clang
build --enable_platform_specific_config
```

`build --repo_env=CC=clang` (no platform config) also built green with `CC` unset (V02). Only the autoconfig toolchain needs this; the hermetic registration below made it unnecessary (V17).

**Two ways to get a Swift toolchain on Linux.**

| | host `swift` on PATH | hermetic `swift.toolchain` |
|---|---|---|
| source | whatever `swift` is first on PATH (`README.md:104`) | swift.org archive, version from `.swift-version` |
| needs `CC=clang` | yes | no (measured: gcc image, `CC` unset, exit 0) |
| needs `--action_env=PATH` | not for rules_swift (measured: rc without it, exit 0); rspm's README asks for it | no (measured: rc without it, exit 0) |
| host libs | whatever the Swift install brought | `libxml2`, `libncurses6`, `libsqlite3-0` at least (bare Ubuntu 24.04 red until installed) |
| version drift | silent: host 6.3 vs 6.4 changes diagnostics | pinned by file |

Hermetic registration, the form that was measured green on Bazel 8.8.0 and 9.2.0 (V17):

```python
# MODULE.bazel  (root module; use dev_dependency = True on the extension if a library module only needs it for its own tests)
swift = use_extension("@rules_swift//swift:extensions.bzl", "swift")
swift.toolchain(
    name = "swift_toolchain",
    swift_version_file = "//:.swift-version",   # same file swiftly reads; contents "6.4.0"
)
use_repo(swift, "swift_toolchain", "swift_toolchain_ubuntu24.04")
register_toolchains(
    "@swift_toolchain//:cc_toolchain_exec_ubuntu24.04",
    "@swift_toolchain//:swift_toolchain_exec_ubuntu24.04",
)
```

```python
# INCORRECT, the quickstart in doc/standalone_toolchain.md: registers the embedded pair only
register_toolchains(
    "@swift_toolchain//:cc_toolchain_embedded_ubuntu24.04",
    "@swift_toolchain//:swift_toolchain_embedded_ubuntu24.04",
)
# measured (V17, hermetic-doc): host build of //:cli exits 1:
#   ERROR: ... Target '//:cli' depends on toolchain '@@rules_swift++_repo_rules+rules_swift_local_config//:linux-toolchain',
#   which cannot be found: no such target '@@rules_swift++_repo_rules+rules_swift_local_config//:linux-toolchain'
# declaring the extension and not registering anything fails the same way (hermetic-unreg).
```

rules_swift's own MODULE registers both families (`MODULE.bazel:269-287`: `cc_toolchain_embedded_*`, `cc_toolchain_exec_*`, `swift_toolchain_embedded_*`, `swift_toolchain_exec_*`) and carries a comment that the list must be edited whenever CI's distribution changes. The extension "is intended for the root module" and fails from a non-root module ([standalone_toolchain.md](https://raw.githubusercontent.com/bazelbuild/rules_swift/4.2.1/doc/standalone_toolchain.md)); use `dev_dependency = True` when a library module wants it only locally. Platform keys are per Swift version: the doc lists `ubuntu22.04`, `ubuntu24.04`, `debian12`, `fedora39`, `amazonlinux2`, `ubi9`, but the 6.4.0 metadata holds `amazonlinux2023`, `debian12`, `debian13`, `fedora41`, `ubi9`, `ubi10`, `ubuntu22.04`, `ubuntu24.04`, `ubuntu26.04`, `xcode` (each with an `-aarch64` twin except `xcode`), so `use_repo` must name `swift_toolchain_<platform>` for the platform in the metadata of the chosen version. A version outside the bundled list fails at extension evaluation (V17): ``Version `6.4.1` is not supported by this version of rules_swift. Please choose one of: ["6.2.1", ..., "6.4.0"]``; supply `platform_sha256` for others (`bazel run @rules_swift//tools/swift-releases -- list <version>`). The `xcode` archive is a `.pkg` and "can only be extracted on a macOS host" (unverified: read only). Android and Wasm SDKs are separate tags (`swift.android_sdk()`, `swift.wasm_sdk()`); static and cross builds are M-O-08 and out of scope here.

### 5. Attribute rules (M-O-04)

Everything in this section was planted and watched (V18) unless marked. Docs: [rules.md](https://raw.githubusercontent.com/bazelbuild/rules_swift/4.2.1/doc/rules.md) `swift_library` (`doc/rules.md:459-500`).

- **`module_name`**. If empty, derived from the label by stripping `//` and replacing non-identifier characters with underscores; so `//:my-lib` is `my_lib` and `//pkg/sub:thing` is `pkg_sub_thing`. Correct and incorrect:

  ```python
  swift_library(name = "explicit_mod", srcs = ["Lib.swift"], module_name = "MyLib")   # import MyLib   -> exit 0
  swift_library(name = "my-lib",       srcs = ["Lib.swift"])                           # import MyLib   -> exit 1  error: no such module 'MyLib'
  swift_library(name = "thing")  # in //pkg/sub                                       # import thing   -> exit 1  error: no such module 'thing' (use import pkg_sub_thing)
  ```

  Set it on every target, `UpperCamelCase`, equal to what Swift sources `import`. Query for the unset ones: `attr(module_name, "^$", kind(swift_library, //...))` listed exactly `//:my-lib` and `//pkg/sub:thing`.
- **`defines` vs `local_defines`**. `defines` propagates to every dependent; `local_defines` stays local. A dependent that needs the flag via `#if` compiled against `defines` (exit 0) and failed against `local_defines` (`error: LOCAL define did not reach the dependent`, exit 1). The docs: "Prefer `local_defines` unless a library needs to propagate a symbol to its dependents." Swift defines carry no values (`FLAG`, not `FLAG=1`).
- **`copts`**: `swiftc` flags, one flag or one value per list element. `copts = ["-enable-upcoming-feature ExistentialAny"]` exits 1 with `error: unknown argument: '-enable-upcoming-feature ExistentialAny'`; `["-enable-upcoming-feature", "ExistentialAny"]` is correct. Global flags go through `--@rules_swift//swift:copt=...` (the `--swiftcopt` alias lives in rules_swift's own `.bazelrc:11`, so `--swiftcopt=...` in a consumer fails with `Unrecognized option`, exit 2, V07).
- **`private_deps`** vs `deps`: private deps link but their `.swiftmodule` does not propagate. With the default non-sandboxed worker the leak was invisible: a dependent importing a module only reachable through `private_deps` compiled green (exit 0). With `--worker_sandboxing` the same target fails `src/UsesPrivate.swift:1:8: error: no such module 'Lib'` (exit 1), while the same import through a public `deps` edge stays green. rules_swift's own rc sets `--worker_sandboxing` with the comment that the default worker strategy "has sandboxing disabled by default, which can hide issues with non-hermetic bugs" (`.bazelrc:29-31`) and turns it off on Windows (`:54`, unverified: read only).
- **`package_name`**: "Targets with the same package_name can access APIs using the 'package' access control modifier". Measured: same name exit 0; different or absent exit 1 (`error: cannot find 'pkgFn' in scope`).
- **`alwayslink`**: the code default is `True` (`swift/internal/attrs.bzl:317-318`, and `bazel query --output=xml --xml:default_values //:Lib` printed `alwayslink value="true"`), overridden to False when `swift.enable_embedded` is on (`swift/swift_library.bzl:213-221`); the generated table in `doc/rules.md` prints the default as `False`. Why `True`: Swift protocol conformances and ObjC metadata create no linker references, "Swift Package Manager always passes the individual `.o` files to the linker ... so it effectively is the same as `alwayslink = True`". Setting False is an optimisation that can silently drop registered conformances; reading heuristic, not run for runtime loss. Query for opt-outs: `attr(alwayslink, 0, kind(swift_library, //...))`.
- **`library_evolution = True`** adds `-library-evolution` and emits `Evo.swiftinterface` and `Evo.private.swiftinterface` (measured with `cquery --output=files`); use only for binary-distributed modules. `generates_header` only for Objective-C consumers. `testonly = True` is not required for `import Testing` in a helper library on Linux (`helper_plain` exit 0); the `always_include_developer_search_paths` doc ties `testonly` to XCTest on Apple (unverified: read only).
- **`swift_binary` entry file**: a single Swift source not named `main.swift` gets `-parse-as-library` (`swift/swift_binary.bzl:70-90`). Planted: `src/Main.swift` with top-level code exits 1 (`error: expressions are not allowed at the top level`), renamed `main.swift` exits 0 (V21). Use `main.swift` for top-level code or `@main`.
- **A source file belongs to one `swift_*` target** ("Adding the same source file to multiple `swift_*` targets can lead to binary bloat and/or symbol collisions"); a `glob` that feeds the same file to a library and a test is the usual cause (reading heuristic, not run).
- **Loads**: `load("@rules_swift//swift:swift_library.bzl", "swift_library")` per rule. The aggregate `@rules_swift//swift:swift.bzl` is deprecated ("users should import each rule ... from the `.bzl` file that defines it") but works (exit 0); `swift/internal/*` is private; the WORKSPACE-era repo name `@build_bazel_rules_swift` fails in a root that did not set `repo_name` (V19: `No repository visible as '@build_bazel_rules_swift'`). SwiftLint and rspm set `repo_name = "build_bazel_rules_swift"` on purpose; a load must match the `bazel_dep`.

### 6. The feature map (M-O-05)

How features reach the compiler: `swift.treat_warnings_as_errors` adds `-warnings-as-errors` (`swift/toolchains/config/compile_config.bzl:488-495`); `swift.upcoming.<N>` and `swift.experimental.<N>` become `-enable-upcoming-feature <N>` and `-enable-experimental-feature <N>` (`swift/internal/features.bzl:343-365`); `swift.werror.<Group>` becomes `-Werror <Group>` and only names whose first character is upper case are kept (`features.bzl:366-382`); `swift.enable_v6` adds `-swift-version 6` and its absence adds `-swift-version 5` (`compile_config.bzl:1380-1400`). Features go on a target (`features = [...]`) or on the command line (`--features=swift.xxx`; `--host_features=` for tools). Every row of the table below was watched, both compilers (6.4 and 6.3), both Bazels, unless noted.

| Settled rule | Bazel spelling in rules_swift 4.2.1 | Measured (swift 6.4, Bazel 8.8.0 and 9.2.0) |
|---|---|---|
| SW-GATE-13 warnings are errors (blanket, release legs) | `features = ["swift.treat_warnings_as_errors"]`, or `build --features=swift.treat_warnings_as_errors` in the rc; equivalent `copts = ["-warnings-as-errors"]`; global `--@rules_swift//swift:copt=-warnings-as-errors` | planted `var x = 1` never mutated: plain exit 0, feature exit 1 `error: variable 'x' was never mutated ... [#VariableNeverMutated]`, `copts` exit 1, compliant twin exit 0. Global feature and global copt both left rules_swift's own tools and the Swift Testing runner building (exit 0). **Negative control:** `--features=treat_warnings_as_errors` (no `swift.`) exit 0 on the same planted warning |
| SW-GATE-15 per-group promotion travels with `UnknownWarningGroup` | `swift.werror.NoUsage` + `swift.werror.UnknownWarningGroup` | 6.4: unused-result plant exit 1 `[#NoUsage]`; `swift.werror.DeprecatedDeclaration` exit 0. **6.3: `NoUsage` is an unknown group**, plain `swift.werror.NoUsage` exits 0 with `warning: unknown warning group: 'NoUsage'`, the guarded pair exits 1 |
| SW-GATE-16 / SW-PKG-02 `StrictLanguageFeatures` | `swift.werror.StrictLanguageFeatures` | `swift.upcoming.ExistentialAnyy` alone exit 0 (silent), with the promotion exit 1 `'ExistentialAnyy' is not a recognized upcoming feature [#StrictLanguageFeatures::UnrecognizedStrictLanguageFeatures]`; correct name exit 0 |
| (new) lowercase / unknown group | `swift.werror.nosuchgroup` | exit 0, silently dropped (`features.bzl:379`); `swift.werror.NoSuchGroupX` with `UnknownWarningGroup` exit 1 |
| SW-PKG-13 Swift 6 mode | `swift.enable_v6` | `public var counter = 0`: plain exit 0, feature exit 1 `var 'counter' is not concurrency-safe because it is nonisolated global shared mutable state [#MutableGlobalVariable]`, immutable twin exit 0. Hallucinated `swift.enable_swift6` exit 0 and stays in mode 5 |
| SW-PKG-07 `ExistentialAny`, `MemberImportVisibility`, `InternalImportsByDefault` | `features = ["swift.upcoming.ExistentialAny", ...]` or `copts = ["-enable-upcoming-feature", "ExistentialAny"]` | bare protocol type: `warning: use of protocol 'P' as a type must be written 'any P' [#ExistentialAny]` (exit 0, it is a warning until the future mode); `any P` twin silent. Only `ExistentialAny` was exercised; the other two names were not run |
| SW-PKG-08 `NonisolatedNonsendingByDefault`, `InferIsolatedConformances` | `swift.upcoming.NonisolatedNonsendingByDefault`, `swift.upcoming.InferIsolatedConformances` | Swift 6 mode + `nonisolated async` call with a MainActor value: off exit 1 `sending value of non-Sendable type 'NS' risks causing data races [#RegionIsolation::SendingRisksDataRace]`, on exit 0 (feature and copts forms; 6.4 and 6.3). `InferIsolatedConformances` compiled, no behavioural flip planted |
| SW-PKG-16 no `ApproachableConcurrency` | do not list `swift.upcoming.ApproachableConcurrency` | the bundle name *works* in 6.4 and 6.3 (the NNBD plant went green with it), so only a rule, not the compiler, stops it; list the two members instead |
| SW-PKG-19 `defaultIsolation(MainActor.self)` apps only | `copts = ["-default-isolation", "MainActor"]` | plain global var in Swift 6 mode: off exit 1, on exit 0 (SE-0466, Implemented 6.2) |
| SW-PKG-14 no package-level mode 5 | no target in `-swift-version 5` | `aquery` over `SwiftCompile` prints the `5` argument for every target without `swift.enable_v6` (21 of the planted set), none for a v6 target |
| (Bazel-only) layering | `swift.layering_check_swift`, `swift.layering_check_unused_deps` | importing a transitive module: off exit 0, on exit 1 `error: Layering violation ... C (//:C)`; unused dep exit 1 `Unused dependencies ... C`; an unused `import` of a declared dep stays green; global `--features=swift.layering_check_swift` also exit 1/0 correctly and kept rules_swift's tooling green |
| (Linux + explicit modules) `swift.debug_module_path` | do not enable | see section 9 |

`swift.enable_v6` is more than strict concurrency: its comment says it enables "the set of upcoming features that will be on by default in Swift 6" (`swift/internal/feature_names.bzl:36-39`). A default `swift.experimental.AccessLevelOnImport` is on for every target (`features.bzl:316`). Nightly-leg exemption in SW-GATE-13 has a Bazel shape: put the blanket feature behind a `--config=ci` stanza (`build:ci --features=swift.treat_warnings_as_errors`) rather than a global line, reading heuristic.

### 7. swift_test and Swift Testing (M-O-07)

- The documented story is XCTest only ("this rule performs _test discovery_ that finds tests written with the `XCTest` framework", `swift/swift_test.bzl:668-680`), but the generated `main` runs both frameworks: `XCTestRunner.run(__allDiscoveredXCTests())`, then `SwiftTestingRunner.run()` over the Swift Testing JSON ABI, then fails with `ERROR: No tests were discovered.` if nothing ran (`tools/test_discoverer/TestDiscoverer.swift:120-137`; the runner is `tools/test_observer/SwiftTestingRunner.swift`, built on the [swift-testing JSON ABI](https://raw.githubusercontent.com/swiftlang/swift-testing/main/Documentation/ABI/JSON.md); rationale in [Swift Forums t/74010](https://forums.swift.org/t/74010)). rules_swift's own fixtures include Swift Testing targets (`test/fixtures/xctest_runner/BUILD:87-103`).
- `swift_test` also pins the dynamic Swift runtime: "XCTest and Swift Testing are shared libraries whose dependencies use the dynamic Swift runtime", so `swift.static_stdlib` is removed on a `swift_test` (`swift/swift_test.bzl:299-302`).
- Measured on Swift 6.4 and 6.3, Bazel 8.8.0 and 9.2.0 (V16):

  ```python
  swift_test(name = "pass_st",  srcs = ["Pass.swift"],  deps = [":Greeter"])   # import Testing; @Test func ...   exit 0 PASSED
  swift_test(name = "fail_st",  srcs = ["Fail.swift"],  deps = [":Greeter"])   # #expect false                   exit 3  ✘ Test fails() recorded an issue ... Expectation failed
  swift_test(name = "empty_st", srcs = ["NoTests.swift"], deps = [":Greeter"]) # helper only                     exit 3  ERROR: No tests were discovered.
  swift_test(name = "mixed",    srcs = ["Mix.swift"],   deps = [":Greeter"])   # XCTestCase + @Test in one file  exit 0
  swift_test(name = "nodiscover", srcs = ["Own.swift", "OwnMain.swift"], deps = [":Greeter"], discover_tests = False)   # own @main   exit 0
  swift_test(name = "nodiscover_nomain", srcs = ["Own.swift"], deps = [":Greeter"], discover_tests = False)             # no main    exit 1  ld.lld: error: undefined symbol: main
  ```

- So SW-TEST-01 (new tests are Swift Testing) holds under Bazel with the default `discover_tests = True`; keep XCTest only for the cases SW-TEST names. `discover_tests = False` is for a custom runner that owns `main` and exits non-zero on failure; list such targets with `attr(discover_tests, 0, kind(swift_test, //...))`. Test sizing, timeouts and coverage reading stay with BZL-TEST (`testing.md`); `--test_filter` takes `ClassName/MethodName` for XCTest (`swift_test.bzl` docs) and a Swift Testing test id is `Module.` stripped (`SwiftTestingRunner.swift:31-39`), neither was run.

### 8. rules_swift_package_manager (M-O-06)

- [cgrindel/rules_swift_package_manager](https://github.com/cgrindel/rules_swift_package_manager) 1.25.0 (2026-09-21, BCR `versions` ends `1.25.0`) "can be used to download, build, and consume Swift packages ... using rules_swift, rules_apple and native C/C++ rulesets"; it replaces `rules_spm`. rules_swift's README points to it for SwiftPM dependencies (`README.md:119`). It is a separate project, not part of the ruleset; the Swift Gazelle plugin lives in `cgrindel/swift_gazelle_plugin` ([FAQ](https://raw.githubusercontent.com/cgrindel/rules_swift_package_manager/main/docs/faq.md)).
- Measured flow on Bazel 8.8.0 and 9.2.0, Swift 6.4, `rules_swift 4.2.1` (V20, fixture `rspm/`): minimal `Package.swift` (`.package(url: "https://github.com/apple/swift-log", from: "1.6.0")`), `swift package resolve` writes `Package.resolved` (swift-log 1.16.1), then

  ```python
  bazel_dep(name = "rules_swift", version = "4.2.1")
  bazel_dep(name = "rules_swift_package_manager", version = "1.25.0")
  swift_deps = use_extension("@rules_swift_package_manager//:extensions.bzl", "swift_deps")
  swift_deps.from_package(resolved = "//:Package.resolved", swift = "//:Package.swift")
  use_repo(swift_deps, "swift_package", "swiftpkg_swift_log")   # written by `bazel mod tidy`
  # BUILD.bazel: deps = ["@swiftpkg_swift_log//:Logging"]
  ```

  Without the `use_repo` names the build exits 1 (`No repository visible as '@swiftpkg_swift_log' from main repository`); after `bazel mod tidy` (`Updated use_repo calls for ...swift_deps`) `//:app` exits 0 and `bazel run //:app` prints the log line. The repository name is `swiftpkg_<identity>` with punctuation as underscores.
- **False green**: adding `.package(url: "https://github.com/apple/swift-collections", from: "1.1.0")` to `Package.swift` without re-resolving left `bazel build //:app` at exit 0, the lock simply did not know about it. The gate is SwiftPM's: `swift package resolve` then `cmp`/`git diff --exit-code Package.resolved` (red 1 on the extra dependency, green 0 on the unchanged manifest), plus `bazel mod tidy` then a diff on `MODULE.bazel`, plus `bazel mod deps --lockfile_mode=error` from BZL-MOD.
- Linux notes from its README: set `CC=clang`, and "ensure a `PATH` that includes the Swift binary is available in the Bazel actions" via `build --action_env=PATH`; neither `--action_env=PATH` nor a hermetic toolchain was needed on the measured host (Swift in `/usr/bin`), so treat the README line as host-dependent. rspm needs a Go toolchain (`rules_go`, `gazelle`) only for its own tools; it also builds on rules_apple which a Linux-only workspace never declares.
- tuist's `swifterpm` shows the multi-manifest shape: a second `swift_deps` extension tag per directory with `declare_swift_package = False` (`tuist/tuist@2f6ac74754bf:swifterpm/MODULE.bazel:27-33`). Keep one `Package.swift` listing only direct dependencies; "the name of the package ... is not used by rules_swift_package_manager" ([README](https://raw.githubusercontent.com/cgrindel/rules_swift_package_manager/main/README.md)).
- A package that will not build under Bazel is fixed by patching it (`docs/patch_swift_package.md`) or with the `swift_deps.configure_package` / `bazel_target_set_*` tags; the FAQ names the `Unable to resolve byName reference` failure for packages using pre-Swift-5.2 by-name product references. Not run.

### 9. Docs versus code drift (M-O-09)

| Claim | Where | What the code / run shows |
|---|---|---|
| "`-debug-module-path` ... `swift.debug_module_path` is enabled by default for Xcode toolchains" with Swift 6.4 / Xcode 27 | `doc/explicit_modules.md:60-69`, comment at `swift/internal/feature_names.bzl:241-245` ("Enabled by default for Xcode 27 and newer") | no file under `swift/` adds the feature to a default list: `grep -rn 'DEBUG_MODULE_PATH' swift` finds only the constant, the export list and `compile_config.bzl:300-312`, which adds `-debug-module-path <swiftmodule>` only when the feature **and** `swift.use_c_modules` **and** `swift.use_explicit_swift_module_map` **and** one of `swift.dbg`, `swift.fastbuild`, `swift.full_debug_info` are on. Measured on Linux 6.4: `aquery` shows the flag only with `-c dbg` and the three features; `-c opt` shows none; **the build then fails** `<unknown>:0: error: unable to load standard library for target 'x86_64-unknown-linux-gnu'` (exit 1) while the plain target is green. Apple behaviour unverified: read only |
| The Swift blog says build systems may drop `-modulewrap` / `-add_ast_path` "beginning in Swift 6.4" and that the 6.3 compiler already stores the path | [blog, 2026-09-11 era](https://www.swift.org/blog/module-tracking-in-debug-info/) | rules_swift gates its feature to "Swift 6.4 or newer for the compiler and debugger support" (`feature_names.bzl:243`); `use_module_wrap` is still the Linux default (`swift_autoconfiguration.bzl:230`) and the worker still special-cases `-modulewrap` (`tools/worker/swift_runner.cc:400`). Do not remove modulewrap by hand |
| `swift_library.alwayslink` default `False` | table in `doc/rules.md` | `True` in code (`attrs.bzl:317-318`, query default) and in the doc text itself ("by default, this value will default to True") |
| Hermetic quickstart registers `*_embedded_*` | `doc/standalone_toolchain.md` | host builds need `*_exec_*` (section 4, red) |
| Example `swift_version = "6.2.4"` and platform list `ubuntu22.04, debian12, fedora39, amazonlinux2, ubi9` | `doc/standalone_toolchain.md:24`, "Supported platforms" | `MODULE.bazel:259` pins `6.4.0`; the 6.4.0 metadata has `fedora41`, `amazonlinux2023`, `debian13`, `ubi10`, `ubuntu26.04` and no `fedora39` / `amazonlinux2` |
| "ubuntu22.04, ubuntu24.04 ... (not yet 26.04, UBI10, Debian 13)" in the ecosystem scout | [eco](../swift-topic-map/ecosystem-tooling.md) line 45/114 | contradicted for 6.4.0: all three are present in the bundled metadata and `MODULE.bazel:24-46` builds `swift_ubuntu26.04_*_sysroot` |
| `swift_test` finds `XCTest`-style tests only | `swift/swift_test.bzl:620-680`, `doc/rules.md` | also runs Swift Testing (section 7) |
| README: "build Swift ... for macOS and Linux" | `README.md:6` | presubmit and README line 17 include Windows (`.bazelci/presubmit.yml`); unverified: read only |
| The task brief names the feature "treat_warnings_as_errors" for the C++ tools | `.bazelrc:27` | that is the **cc** feature; the Swift one is `swift.treat_warnings_as_errors` (negative control, section 6) |

Rule of thumb for the authored file: where doc and code disagree, the generated build behaviour (an `aquery`, a planted build) wins, then `MODULE.bazel` and the BCR presubmit, then the prose docs.

### 10. Decisions

1. **Framing**: "binds only if you adopt Bazel for Swift", opening sentence after `go.md:8`, with the secondary-status line (5 of 40) and the default "stay on SwiftPM" pointer to `bazel-adopt`.
2. **Toolchain registration**: hermetic extension for CI and release, root module only, `swift_version_file`, per-platform `use_repo`, exec pair registered; host Swift + `--repo_env=CC=clang` accepted for local development on one pinned image; one of the two per repository.
3. **Attribute rules**: explicit `module_name`; `local_defines`; `private_deps` only with `--worker_sandboxing`; `package_name` for shared `package` APIs; leave `alwayslink`; `library_evolution` only for distributed binaries; `main.swift`.
4. **Feature map**: table in section 6; blanket `swift.treat_warnings_as_errors`, `swift.enable_v6`, the five named upcoming features, `swift.werror.StrictLanguageFeatures` and `swift.werror.UnknownWarningGroup`, layering checks.
5. **rspm**: allowed, secondary to SwiftPM; gates on `Package.resolved` freshness and `bazel mod tidy`.
6. **Routing keywords** for the `bazel-quality` index (`keywords:` line and the routing row): `rules_swift`, `swift_library`, `swift_binary`, `swift_test`, `swift.toolchain`, `rules_swift_package_manager`, `swift_deps`, `swiftpkg`, `swift.enable_v6`. Routing row text: "Writing a `swift_*` target, registering `swift.toolchain`, setting `CC=clang`, a `swift.*` feature, or wiring `rules_swift_package_manager`". The brief's four keywords are kept; the other five were added because they are the names an agent types when the failure occurs.
7. **`publish.toml`**: yes, `[rules.bazel-quality]` `0.3.0` to `0.4.0`, one minor per language depth file (`423ecee` 0.3.0 Go, `e041992` 0.2.0 Java/Kotlin per the config audit), owner Q8 default confirmed. Also edit: routing row in `rules/bazel-quality.md`, the Siblings line (add `swift-quality`), `docs/bazel-quality.md` count (fourteen to fifteen, and its by-language list), and the stale comment at `publish.toml:248-258` ("twelve depth files ... four by language"). The depth file is not a member of `swift-essentials`, and the depth files "do not point at each other" (`docs/bazel-quality.md:62`), so BZL-SWIFT cites SW-* IDs from the Swift sets but not BZL-GO.

## Normative guidance candidates

Severity MUST / SHOULD / CONSIDER. "RUN" says whether the verification went red on a planted violation and stayed green on the twin; V-numbers point into [Verification runs](#verification-runs). Every grep below prints the violation: **empty output is the pass**. Run each from the repository root.

1. **BZL-SWIFT-01 (MUST, scope).** This file binds only when the repository declares `bazel_dep(name = "rules_swift", ...)`; otherwise Swift builds and tests stay on SwiftPM and `Package.swift`.
   - Why: Bazel is secondary for Swift (5 of 40 exemplars, 1 Bazel-first); adopting it is `bazel-adopt`'s call.
   - Verify: reading heuristic, applicability probe `grep -rn --include='MODULE.bazel' -e 'rules_swift' .` (a hit means this file binds). RUN: no, reading heuristic only.
2. **BZL-SWIFT-02 (MUST).** Pin Bazel 8.x or 9.x in `.bazelversion` and declare `rules_swift` from the BCR at 4.x; Bazel 6 and 7 cannot resolve it, and Bazel 10 is unverified: read only.
   - Why: `bazel_compatibility = [">=8.0.0"]`; the 3.6.1 line is the last for Bazel 7.
   - Verify: `grep -rn -e '^[67]\.' --include='.bazelversion' .` (output = violating pin). RUN: yes, G10 (`.bazelversion` 7.7.1 hit, 8.8.0 empty).
3. **BZL-SWIFT-03 (MUST).** Configure rules_swift through `MODULE.bazel` only; no `WORKSPACE*` file mentions `rules_swift`, no `rules_spm`, and every load names the repo the `bazel_dep` created (default `@rules_swift`).
   - Why: 4.2.1 has no `repositories.bzl`; `@build_bazel_rules_swift` is invisible unless `repo_name` was set.
   - Verify: `grep -rn --include='WORKSPACE' --include='WORKSPACE.bazel' --include='WORKSPACE.bzlmod' -e 'rules_swift' .` and `grep -rn --include='MODULE.bazel' --include='BUILD.bazel' --include='*.bzl' -e 'rules_spm' .`, then `bazel build --nobuild //...` exit 0 (BZL-FLAG's loading-phase gate). RUN: yes, G16, G17 and V19 (`@build_bazel_rules_swift` load exit 1, `@rules_swift` load exit 0).
4. **BZL-SWIFT-04 (SHOULD).** Load each rule from its own file (`@rules_swift//swift:swift_library.bzl`, `swift_binary.bzl`, `swift_test.bzl`); never `@rules_swift//swift:swift.bzl` and never anything under `swift/internal`.
   - Why: the aggregate is marked deprecated; `internal` is "meant for build rule use only".
   - Verify: `grep -rn --include='BUILD.bazel' --include='BUILD' --include='*.bzl' -e 'swift:swift.bzl' -e '@build_bazel_rules_swift' .` and `grep -rn --include='BUILD.bazel' --include='BUILD' --include='*.bzl' -e 'rules_swift//swift/internal' .` (empty = pass). RUN: yes, G3, G8 (bad hit, good empty).
5. **BZL-SWIFT-05 (MUST).** On Linux with the host toolchain, set `common:linux --repo_env=CC=clang` (with `build --enable_platform_specific_config`) in the checked-in `.bazelrc`, or register the hermetic toolchain (BZL-SWIFT-06); never rely on a developer's shell exporting `CC`.
   - Why: gcc is Bazel's default and `swift_binary` / `swift_test` fail analysis with `Swift requires the configured CC toolchain use clang`.
   - Verify: `grep -rL --include='.bazelrc' -e 'CC=clang' .` (lists rc files lacking it; only meaningful when no hermetic toolchain is registered) plus the build itself: unset `CC`, `bazel build //...` must exit 0. RUN: yes, V01/V02 (red exit 1 without, green 0 with, 4 Bazel/Swift combinations), G9.
6. **BZL-SWIFT-06 (SHOULD for CI and release builds).** Use the hermetic toolchain: `swift.toolchain(name = "swift_toolchain", swift_version_file = "//:.swift-version")` in the root module, `use_repo` of `swift_toolchain` and one `swift_toolchain_<platform>` per build platform, and register both `cc_toolchain_exec_<platform>` and `swift_toolchain_exec_<platform>`. Do not register only the `*_embedded_*` pair from the doc quickstart. The version in `.swift-version` is a release in the bundled metadata (4.2.1: 6.2.1 to 6.4.0), and the CI image carries `libxml2`, `libncurses6` and `libsqlite3-0`.
   - Why: one pinned compiler for every machine; measured green without `CC` or `--action_env=PATH`; embedded-only and unregistered setups fail with `target 'linux-toolchain' not declared`.
   - Verify: `grep -rn --include='MODULE.bazel' -e 'swift_version = ' .` (an inline version instead of the file; empty = pass) and `grep -rl --include='MODULE.bazel' -e 'swift.toolchain(' . | xargs -r grep -L -e 'swift_toolchain_exec_'` (MODULE files declaring the toolchain without the exec registration). RUN: yes, G2, G4 and V17 (embedded-only exit 1, unregistered exit 1, exec exit 0 on 8.8.0 and 9.2.0, `6.4.1` exit 1).
7. **BZL-SWIFT-07 (MUST).** Pick the host toolchain or the hermetic one per repository; if both exist, `.swift-version`, the CI image tag and the registered version are the same string (SW-GATE-08 pins the formatter and compiler the same way).
   - Why: the diagnostics in section 6 differ per compiler (`NoUsage` exists in 6.4, not 6.3).
   - Verify: reading heuristic, compare `cat .swift-version` with the image tag. RUN: no, reading heuristic only.
8. **BZL-SWIFT-08 (SHOULD).** Put `build --worker_sandboxing` in the checked-in rc (Windows leg `build:windows --noworker_sandboxing`).
   - Why: the default worker strategy is unsandboxed; a `private_deps` leak and any undeclared input compile green.
   - Verify: `grep -rL --include='.bazelrc' -e 'worker_sandboxing' .` (rc files lacking it). RUN: yes, G5 and V18 (`user_of_private` exit 0 unsandboxed, exit 1 with the flag). Windows leg: unverified: read only.
9. **BZL-SWIFT-09 (MUST; maps SW-GATE-13).** The blanket warnings gate on release-toolchain CI legs is the feature `swift.treat_warnings_as_errors`, on targets or as `build:ci --features=swift.treat_warnings_as_errors`; never the unprefixed `--features=treat_warnings_as_errors`, which is the C++ feature and leaves Swift warnings green. Nightly legs omit it.
   - Why: negative control: unprefixed spelling, planted Swift warning, exit 0.
   - Verify: `grep -rn --include='*.bazelrc' --include='.bazelrc' -e '--features[= ]treat_warnings_as_errors' .` (a hit is the unprefixed form), plus a canary: `bazel build` of a planted unused-`var` target under the CI config must exit non-zero. RUN: yes, G1 and V05/V06 (planted warning: feature exit 1, unprefixed exit 0, twin exit 0).
10. **BZL-SWIFT-10 (SHOULD; maps SW-GATE-15 and SW-GATE-16, SW-PKG-02).** A per-group promotion is `swift.werror.<Group>` with an upper-case first letter and always travels with `swift.werror.UnknownWarningGroup`; any build that sets `swift.upcoming.*` or `swift.experimental.*` also sets `swift.werror.StrictLanguageFeatures` in the checked-in rc.
   - Why: lowercase names are dropped silently, a misspelt feature name exits 0, and a group missing from the oldest toolchain (`NoUsage` on 6.3) is only a warning.
   - Verify: `grep -rn --include='BUILD.bazel' --include='*.bzl' --include='.bazelrc' -e 'swift\.werror\.[a-z]' .` (lowercase group) and `grep -rL --include='.bazelrc' -e 'swift.werror.StrictLanguageFeatures' .` (rc files lacking the promotion). RUN: yes, G6, G7 and V09/V10/V11 (typo: exit 0 alone, exit 1 with the promotion; 6.3 `NoUsage`: exit 0 alone, exit 1 guarded).
11. **BZL-SWIFT-11 (MUST; maps SW-PKG-13 and SW-PKG-14).** Every compiled target is in Swift 6 mode: `build --features=swift.enable_v6` in the rc (or `features = ["swift.enable_v6"]` per target), because without it rules_swift passes `-swift-version 5`; a mode-5 target carries a dated comment and removal condition (SW-PKG-15).
   - Why: `swift.enable_v6` is the only switch to `-swift-version 6` and the full Swift 6 upcoming set; a misspelt feature name stays in mode 5 and builds green.
   - Verify: `bazel aquery "mnemonic('SwiftCompile', //...)" --output=text | awk '/^    -swift-version/ { getline; if ($1 == "5") print "swift-version 5" }'` (each printed line is a mode-5 compile; empty = pass). RUN: yes, V25 (21 lines on the planted set including the `swift.enable_swift6` typo; empty on a `swift.enable_v6` target).
12. **BZL-SWIFT-12 (MUST; maps SW-PKG-07, SW-PKG-08).** Upcoming features are enabled as `swift.upcoming.<Name>` features or as two-element `copts` (`"-enable-upcoming-feature", "<Name>"`), never as one joined string, and the set is `ExistentialAny`, `MemberImportVisibility`, `InternalImportsByDefault` plus, for new code, `NonisolatedNonsendingByDefault` and `InferIsolatedConformances`.
   - Why: a joined `copts` string is `unknown argument` (exit 1); the feature form is greppable and is the one `swift.werror.StrictLanguageFeatures` can audit.
   - Verify: `grep -rn --include='BUILD.bazel' --include='*.bzl' -e '"-enable-upcoming-feature [A-Za-z]' -e '"-enable-experimental-feature [A-Za-z]' .` (empty = pass). RUN: yes, G12 and V14 (joined string exit 1). Behavioural flip run for `ExistentialAny` and `NonisolatedNonsendingByDefault` only (V11, V12); the other three names: unverified, not planted.
13. **BZL-SWIFT-13 (SHOULD; maps SW-PKG-16).** Do not list `swift.upcoming.ApproachableConcurrency`; spell `swift.upcoming.NonisolatedNonsendingByDefault` and `swift.upcoming.InferIsolatedConformances`.
   - Why: the bundle compiles, so the compiler will not stop it; SW-PKG-16 fixes the spelling.
   - Verify: `grep -rn --include='BUILD.bazel' --include='*.bzl' --include='.bazelrc' -e 'swift.upcoming.ApproachableConcurrency' .` (empty = pass). RUN: yes, G11, V12.
14. **BZL-SWIFT-14 (SHOULD; maps SW-PKG-19).** `copts = ["-default-isolation", "MainActor"]` appears only on app targets, never on a library, SDK, CLI or server target.
   - Why: it changes the isolation of every declaration (a mutable global that fails Swift 6 mode passes under it).
   - Verify: `grep -rn --include='BUILD.bazel' --include='*.bzl' -e '"MainActor"' .` (each hit must sit on an app target; reading heuristic for the target kind). RUN: yes for the hit, G13/V13; the app/library judgement is a reading heuristic.
15. **BZL-SWIFT-15 (MUST; maps SW-TEST-01).** New tests are `swift_test` targets whose `srcs` are the Swift Testing files, with the default `discover_tests = True`; `discover_tests = False` appears only on a target that owns `main` and exits non-zero on failure.
   - Why: the generated runner runs XCTest and then Swift Testing; `discover_tests = False` without a `main` fails to link, and a target with no tests exits 3.
   - Verify: `bazel test //...` exit 0, and `bazel query "attr(discover_tests, 0, kind(swift_test, //...))"` (each listed target must justify its own `main`; empty = pass). The SW-TEST-01 diff grep over new files is unchanged. RUN: yes, V16, V24 (pass 0, fail 3, empty 3, no-main link 1, mixed 0; the query listed both planted `discover_tests = False` targets).
16. **BZL-SWIFT-16 (MUST).** `swift_binary` / `swift_test` entry code is in a file named exactly `main.swift`, or the single source uses `@main`.
   - Why: one source not named `main.swift` is built with `-parse-as-library`; top-level code then fails.
   - Verify: `bazel build //...` exit 0. RUN: yes, V21 (`Main.swift` exit 1 `expressions are not allowed at the top level`, `main.swift` exit 0).
17. **BZL-SWIFT-17 (MUST).** Every `swift_library` sets `module_name` to the `UpperCamelCase` name its dependents `import`.
   - Why: the derived name for `//pkg/sub:thing` is `pkg_sub_thing`; the dependent's `import thing` is `no such module`.
   - Verify: `bazel query "attr(module_name, '^$', kind(swift_library, //...))"` (each listed target lacks the attribute; empty = pass). RUN: yes, V18/V24 (listed the two unset targets, not the explicit ones).
18. **BZL-SWIFT-18 (SHOULD).** Use `local_defines` for compile-time flags; `defines` only when dependents' `#if` needs the symbol, with a comment saying which dependent.
   - Why: `defines` leaks into every dependent and into their cache keys.
   - Verify: `grep -rn --include='BUILD.bazel' --include='*.bzl' -e '[^_]defines = ' .` (each hit needs the comment). RUN: yes, G15 and V18 (dependent sees `defines` exit 0, `local_defines` exit 1).
19. **BZL-SWIFT-19 (SHOULD).** Implementation-only imports go in `private_deps`; targets that share `package`-level APIs share one `package_name`; the build runs with BZL-SWIFT-08 so a missed edge is a red build.
   - Why: unsandboxed workers let a missing dependency pass; different `package_name` makes `package` API invisible.
   - Verify: `bazel build //...` under the rc with `--worker_sandboxing`. RUN: yes, V18 (private leak exit 0 vs 1, `package_name` same 0 / different 1 / absent 1).
20. **BZL-SWIFT-20 (SHOULD).** Leave `alwayslink` at its default (True); every `alwayslink = False` carries a comment naming the binary-size measurement and the conformance-registration check.
   - Why: Swift conformances and ObjC metadata create no linker references; SwiftPM links all objects, so True matches SwiftPM.
   - Verify: `bazel query "attr(alwayslink, 0, kind(swift_library, //...))"` (empty = pass). RUN: yes, V24 (listed the planted `no_always`, empty before). The runtime loss itself: reading heuristic from the rule docs, not run.
21. **BZL-SWIFT-21 (CONSIDER).** Enable `--features=swift.layering_check_swift` (and `swift.layering_check_unused_deps` once the graph is clean) for the whole workspace.
   - Why: Bazel-only gain: a module imported without a direct `deps` edge, or a `deps` edge never imported, is a build error.
   - Verify: `bazel build //...` exit 0 under `--features=swift.layering_check_swift`. RUN: yes, V15 (transitive import exit 1 / exit 0 once declared; unused dep exit 1; global flag exit 1 on the plant, 0 on twin and on rules_swift's own tools).
22. **BZL-SWIFT-22 (MUST, when rules_swift_package_manager is used).** The dependency bridge is `swift_deps.from_package(resolved = "//:Package.resolved", swift = "//:Package.swift")` with `use_repo` written by `bazel mod tidy`; CI fails when `swift package resolve` or `bazel mod tidy` changes a tracked file.
   - Why: a stale `Package.resolved` builds green and silently omits the new dependency.
   - Verify: `swift package resolve` followed by `git diff --exit-code Package.resolved MODULE.bazel` after `bazel mod tidy` (output or non-zero = finding). RUN: yes, V20 (extra manifest dependency: build exit 0, resolve-diff exit 1; unchanged manifest: diff exit 0).
23. **BZL-SWIFT-23 (SHOULD).** Pin rules_swift and rules_swift_package_manager explicitly in the root `MODULE.bazel` (4.2.1 and 1.25.0 as of 2026-10-10) and read their current versions from the BCR `metadata.json`; rspm's declared `rules_swift` 3.6.0 is not a statement about what you build against.
   - Why: BZL-FLAG-28 sources ruleset versions from the registry; both pairs were green together on Bazel 8.8.0 and 9.2.0.
   - Verify: `bazel mod graph` shows the resolved `rules_swift@4.2.1`. RUN: yes (rspm fixture built on the resolved 4.2.1); the command output itself was not captured separately.
24. **BZL-SWIFT-24 (SHOULD).** Do not enable `swift.debug_module_path` (or the `swift.use_c_modules` / `swift.use_explicit_swift_module_map` pair) on Linux; treat the documented default-on for Xcode 27 as unverified: read only.
   - Why: on Linux 6.4 the explicit-module combination fails with `unable to load standard library`.
   - Verify: `grep -rn --include='BUILD.bazel' --include='*.bzl' -e 'swift.debug_module_path' .` (empty = pass on a Linux workspace). RUN: yes, G14 and V22.
25. **BZL-SWIFT-25 (SHOULD).** Apple-platform targets build through `rules_apple` (`ios_*`), not by building a `swift_library` directly for iOS; Windows legs are not asserted by this file.
   - Why: a directly built `swift_library` imports host frameworks (`error: no such module 'UIKit'`, FAQ).
   - Verify: reading heuristic. RUN: no, unverified: read only (no macOS, no Windows host).

## Verification runs

Common shape. Image `rs-fixture-swift-gcc:6.4` (= `swift:6.4` + `gcc g++`; `6.3` for the second compiler) with `HOME=/home/mherwig/.cache/research-lang/swift-tools/home` and `CC=clang`, repository root `/home/mherwig/.cache/research-lang/swift-tools/fixtures/rules-swift/<dir>/`. The wrapper line expands, per target, to

```
bazel --output_user_root=/home/mherwig/.cache/research-lang/swift-tools/build/rules-swift-bazel-6.4 build //:<target>
```

`GCC=1 ./loop.sh 8.8.0 <dir> <targets>` prints `<target> exit N` for each; `matrix.sh` replays the first 38 checks for each of `8.8.0/6.4`, `9.2.0/6.4`, `8.8.0/6.3`, `9.2.0/6.3` (`logs/matrix-*.txt`, all four ran to the end). "Red" = the violation, "Green" = the compliant twin. Exit codes are bazel's (1 build failure, 3 test failure, 2 command-line error). Source logs are under each `<dir>/logs/`.

| ID | Fixture and command (verbatim) | Red | Green | Relevant output lines |
|---|---|---|---|---|
| V01 | `green/`: `NOCC=1 GCC=1 ./loop.sh 8.8.0 green cli` then `GCC=1 ./loop.sh 8.8.0 green cli GreeterTests` (also 9.2.0, SWIFT_VERSION=6.3) | 1 | 0, 0 | `Error in fail: Swift requires the configured CC toolchain use clang. ... The current CC toolchain is configured to use 'gcc'.` Image without gcc: `NOCC=1 ./bz.sh 8.8.0 green -- build //:cli` exit 1 `Auto-Configuration Error: Cannot find gcc or CC` (`logs/nocc-8.8.0.log`) |
| V02 | `rc/` with `common:linux --repo_env=CC=clang` + `build --enable_platform_specific_config`, then `build --repo_env=CC=clang`: `NOCC=1 GCC=1 ./loop.sh 8.8.0 rc cli` | n/a | 0, 0 | `INFO: Build completed successfully, 235 total actions`; also green with `--action_env=PATH` removed |
| V03 | `green/`: `GCC=1 ./bz.sh 8.8.0 green CC=clang -- run //:cli`; `... -- test //:GreeterTests --test_output=all` | n/a | 0, 0 | `Hello, bazel`; `◇ Test greetsByName() started.` ... `✔ Test greetsByName() passed`; `//:GreeterTests PASSED in 0.2s` |
| V04 | `feat/`: `GCC=1 ./loop.sh 8.8.0 feat v5_global v6_global v6_clean` | `v6_global` 1 | `v5_global` 0, `v6_clean` 0 | `error: var 'counter' is not concurrency-safe because it is nonisolated global shared mutable state [#MutableGlobalVariable]` |
| V05 | `feat/`: `GCC=1 ./loop.sh 8.8.0 feat warn_plain warn_werror warn_clean_werror warn_copt` | `warn_werror` 1, `warn_copt` 1 | `warn_plain` 0, `warn_clean_werror` 0 | `error: variable 'x' was never mutated; consider changing to 'let' constant [#VariableNeverMutated]` |
| V06 | `EXTRA_FLAGS='--features=treat_warnings_as_errors' GCC=1 ./loop.sh 8.8.0 feat warn_plain` vs `EXTRA_FLAGS='--features=swift.treat_warnings_as_errors' ...` | **did not go red**: unprefixed 0 | prefixed 1 (red) | the cc feature name leaves the Swift warning a warning: false green. Also `v6_typo` (`swift.enable_swift6`) exit 0, see V25 |
| V07 | `EXTRA_FLAGS='--swiftcopt=-warnings-as-errors' ...` then `EXTRA_FLAGS='--@rules_swift//swift:copt=-warnings-as-errors' GCC=1 ./loop.sh 8.8.0 feat warn_plain warn_clean_werror` | `--swiftcopt` 2 (`Unrecognized option`); `--@rules_swift//swift:copt` on `warn_plain` 1 | `warn_clean_werror` 0 | global feature and global copt on `green` (`//:cli //:GreeterTests`): 0, 0 |
| V08 | `feat/`: `GCC=1 ./loop.sh 8.8.0 feat nousage_plain nousage_group nousage_group_other nousage_group_guarded` (6.4), repeated with `SWIFT_VERSION=6.3` | 6.4 `nousage_group` 1; 6.3 `nousage_group_guarded` 1 | 6.4 plain 0, other 0, guarded 0; 6.3 `nousage_group` **0** (unknown group warning) | 6.4 `result of call to 'createFile(atPath:contents:attributes:)' is unused [#NoUsage]`; 6.3 `warning: unknown warning group: 'NoUsage' [#UnknownWarningGroup]`, guarded `error: unknown warning group: 'NoUsage'` |
| V09 | `feat/`: `GCC=1 ./loop.sh 8.8.0 feat unknown_group unknown_group_lower` | `unknown_group` 1 | `unknown_group_lower` 0 (silently dropped) | `error: unknown warning group: 'NoSuchGroupX' [#UnknownWarningGroup]` |
| V10 | `feat/`: `GCC=1 ./loop.sh 8.8.0 feat ea_plain ea_feature ea_copts ea_unknown ea_unknown_strict ea_ok_strict approachable` | `ea_unknown_strict` 1 | rest 0 | `'ExistentialAnyy' is not a recognized upcoming feature [#StrictLanguageFeatures::UnrecognizedStrictLanguageFeatures]`; `warning: use of protocol 'P' as a type must be written 'any P'; this will be an error in a future Swift language mode [#ExistentialAny]` |
| V11 | `swiftc -typecheck -enable-upcoming-feature ExistentialAnyy src/ExistentialAny.swift` via `run.sh` (feat/) | n/a | 0 | the compiler itself accepts an unknown upcoming feature silently, even with `-warnings-as-errors` |
| V12 | `feat/`: `GCC=1 ./loop.sh 8.8.0 feat nnbd_off nnbd_on nnbd_copts approachable_nnbd members_nnbd` (6.4 and 6.3) | `nnbd_off` 1 | other four 0 | `error: sending value of non-Sendable type 'NS' risks causing data races [#RegionIsolation::SendingRisksDataRace]` |
| V13 | `feat/`: `GCC=1 ./loop.sh 8.8.0 feat iso_default_off iso_default_on` (6.4 and 6.3) | off 1 | on 0 | `copts = ["-default-isolation", "MainActor"]` |
| V14 | `feat/`: `GCC=1 ./loop.sh 8.8.0 feat copts_joined` | 1 | (`ea_copts` 0) | `error: unknown argument: '-enable-upcoming-feature ExistentialAny'` |
| V15 | `layer/`: `GCC=1 ./loop.sh 8.8.0 layer A_plain A_layer A_layer_ok A_clean A_unused A_unused_import`; global: `EXTRA_FLAGS='--features=swift.layering_check_swift' GCC=1 ./loop.sh 8.8.0 layer A_plain A_clean` | `A_layer` 1, `A_unused` 1, global `A_plain` 1 | `A_plain` 0 (no check), `A_layer_ok` 0, `A_clean` 0, `A_unused_import` 0, global `A_clean` 0 | `error: Layering violation in @@//:A_layer ... C (//:C)`; `error: Unused dependencies in @@//:A_unused ... C` |
| V16 | `tests/`: `ACT=test LOGNAME_=t GCC=1 EXTRA_FLAGS='--test_output=errors' ./loop2.sh 8.8.0 tests //:pass_st` (and `fail_st`, `empty_st`, `xctest`, `mixed`, `nodiscover`, `nodiscover_nomain`) | `fail_st` 3, `empty_st` 3, `nodiscover_nomain` 1 | `pass_st` 0, `xctest` 0, `mixed` 0, `nodiscover` 0 | `✘ Test fails() recorded an issue at Fail.swift:3:22: Expectation failed: greet("a") == "Hello, b"`; `ERROR: No tests were discovered.`; `ld.lld: error: undefined symbol: main` |
| V17 | `hermetic/`: `./hb.sh 8.8.0 hermetic -- build //:cli //:GreeterTests` in `rs-fixture-ubuntu:24.04`; variants `hermetic-doc` (embedded pair), `hermetic-unreg` (no `register_toolchains`), `hermetic-file` (`swift_version_file`) | missing libs: first run exit 1 `ld.lld: error while loading shared libraries: libxml2.so.2`, then `libncurses.so.6`, then `libsqlite3.so.0` (`logs/hermetic-missing-libxml2.log`); `hermetic-doc` 1, `hermetic-unreg` 1 (both `target 'linux-toolchain' not declared`); `.swift-version` `6.4.1` 1 | `hermetic` 0 (build, test PASSED, run `Hello, bazel`) on 8.8.0 and 9.2.0, no `CC`, no `--action_env=PATH`; file `6.4.0` 0, `6.3.3` 0 | ``Version `6.4.1` is not supported by this version of rules_swift. Please choose one of: ["6.2.1", "6.2.2", "6.2.3", "6.2.4", "6.3", "6.3.1", "6.3.2", "6.3.3", "6.4.0"]``; toolchain `Swift version 6.4 (swift-6.4-RELEASE)` |
| V18 | `attrs/`: `GCC=1 ./loop.sh 8.8.0 attrs wrong-import right-import dep_sees_defines dep_sees_local user_of_private user_of_public pkg_b_same pkg_b_other pkg_b_none evo helper_plain helper_testonly u_derived u_name`; then `EXTRA_FLAGS='--worker_sandboxing' GCC=1 ./loop.sh 8.8.0 attrs user_of_private user_of_public` | `wrong-import` 1, `dep_sees_local` 1, `pkg_b_other` 1, `pkg_b_none` 1, `u_name` 1, sandboxed `user_of_private` 1 | `right-import` 0, `dep_sees_defines` 0, `pkg_b_same` 0, `u_derived` 0, `evo` 0, `helper_*` 0, unsandboxed `user_of_private` **0**, `user_of_public` 0 in both modes | `error: no such module 'MyLib'`; `error: LOCAL define did not reach the dependent`; `error: cannot find 'pkgFn' in scope`; `error: no such module 'thing'`; `src/UsesPrivate.swift:1:8: error: no such module 'Lib'`; `cquery --output=files //:evo` lists `Evo.swiftinterface` and `Evo.private.swiftinterface` |
| V19 | `loads/`: `GCC=1 LOGNAME_=l ./loop2.sh 8.8.0 loads //old:g` (and `//agg:g`, `//good:g`) | `//old:g` 1 (`@build_bazel_rules_swift`) | `//agg:g` 0 (deprecated aggregate), `//good:g` 0 | `No repository visible as '@build_bazel_rules_swift' from main repository` |
| V20 | `rspm/`: `GCC=1 ./loop.sh 8.8.0 rspm app` (before `bazel mod tidy`; after; 9.2.0); stale lock: extra `.package(...swift-collections...)` then `app` and `swift package resolve`+`cmp` | missing `use_repo` 1; `cmp Package.resolved` 1 on the extra dependency | after `bazel mod tidy` 0 (8.8.0 and 9.2.0); unchanged-manifest `cmp` 0; stale-lock build **0** (false green) | `No repository visible as '@swiftpkg_swift_log'`; `Updated use_repo calls for @rules_swift_package_manager//:extensions.bzl%swift_deps`; `info rspm-fixture: [app] hello from rules_swift_package_manager` |
| V21 | `rspm/`: `src/Main.swift` vs `src/main.swift` with top-level code, `GCC=1 ./loop.sh 8.8.0 rspm app` | `Main.swift` 1 | `main.swift` 0 | `src/Main.swift:4:1: error: expressions are not allowed at the top level` |
| V22 | `dbg/`: `GCC=1 EXTRA_FLAGS='-c dbg' ./aq.sh 8.8.0 dbg dmp` (count of `-debug-module-path`), `-c opt`, and `EXTRA_FLAGS='-c dbg' GCC=1 ./loop.sh 8.8.0 dbg dmp plain` | `dmp` build 1 | `plain` 0; flag present only for `dmp` + `-c dbg`; absent with `-c opt` | `<unknown>:0: error: unable to load standard library for target 'x86_64-unknown-linux-gnu'` |
| V23 | `greps/`: `./greps/run.sh` (17 checks G1 to G17, each run in `bad/` and `good/`; `logs/greps-run.txt`) | all 17 print a violation in `bad/` | all 17 empty in `good/` | table below |
| V24 | `attrs/`, `tests/`: `./q.sh 8.8.0 attrs 'attr(module_name, "^$", kind(swift_library, //...))'`; `... 'attr(alwayslink, 0, kind(swift_library, //...))'`; `./q.sh 8.8.0 tests 'attr(discover_tests, 0, kind(swift_test, //...))'` | module_name lists `//:my-lib`, `//pkg/sub:thing`; alwayslink lists `//:no_always` (after planting); discover lists `//:nodiscover`, `//:nodiscover_nomain` | alwayslink empty before the plant | `--xml:default_values` printed `alwayslink value="true"` |
| V25 | `feat/`: `./inbz.sh feat "bazel aquery \"mnemonic('SwiftCompile', //...)\" --output=text 2>/dev/null \| awk '/^    -swift-version/ { getline; if (\$1 == \"5\") print \"swift-version 5\" }'"` (and `//:v6_clean`, `//:v6_typo`) | `//...` prints 21 lines; `//:v6_typo` prints 1 | `//:v6_clean` empty | `swift.enable_swift6` (invented) stays at `-swift-version 5`, build exit 0 |

V23 detail (`grep` is `/usr/bin/grep`; each command has an explicit directory operand `.`):

| ID | Command | bad/ | good/ |
|---|---|---|---|
| G1 | `grep -rn --include='*.bazelrc' --include='.bazelrc' -e '--features[= ]treat_warnings_as_errors' .` | `./.bazelrc:2:build --features=treat_warnings_as_errors` | empty |
| G2 | `grep -rn --include='MODULE.bazel' -e 'swift_version = ' .` | `swift_version = "6.4.0"` line | empty |
| G3 | `grep -rn --include='BUILD.bazel' --include='BUILD' --include='*.bzl' -e 'swift:swift.bzl' -e '@build_bazel_rules_swift' .` | `./BUILD.bazel:1:load("@rules_swift//swift:swift.bzl", ...)` | empty |
| G4 | `grep -rl --include='MODULE.bazel' -e 'swift.toolchain(' . \| xargs -r grep -L -e 'swift_toolchain_exec_'` | `./MODULE.bazel` | empty |
| G5 | `grep -rL --include='.bazelrc' -e 'worker_sandboxing' .` | `./.bazelrc` | empty |
| G6 | `grep -rL --include='.bazelrc' -e 'swift.werror.StrictLanguageFeatures' .` | `./.bazelrc` | empty |
| G7 | `grep -rn --include='BUILD.bazel' --include='*.bzl' --include='.bazelrc' -e 'swift\.werror\.[a-z]' .` | `features = ["swift.werror.noUsage"]` line | empty |
| G8 | `grep -rn --include='BUILD.bazel' --include='BUILD' --include='*.bzl' -e 'rules_swift//swift/internal' .` | `load("@rules_swift//swift/internal:attrs.bzl", ...)` | empty |
| G9 | `grep -rL --include='.bazelrc' -e 'CC=clang' .` | `./.bazelrc` | empty |
| G10 | `grep -rn -e '^[67]\.' --include='.bazelversion' .` | `./.bazelversion:1:7.7.1` | empty |
| G11 | `grep -rn --include='BUILD.bazel' --include='*.bzl' --include='.bazelrc' -e 'swift.upcoming.ApproachableConcurrency' .` | hit | empty |
| G12 | `grep -rn --include='BUILD.bazel' --include='*.bzl' -e '"-enable-upcoming-feature [A-Za-z]' -e '"-enable-experimental-feature [A-Za-z]' .` | hit | empty |
| G13 | `grep -rn --include='BUILD.bazel' --include='*.bzl' -e '"MainActor"' .` | hit | empty |
| G14 | `grep -rn --include='BUILD.bazel' --include='*.bzl' -e 'swift.debug_module_path' .` | hit | empty |
| G15 | `grep -rn --include='BUILD.bazel' --include='*.bzl' -e '[^_]defines = ' .` | `defines = ["FLAG"]` line | empty (`local_defines` not matched) |
| G16 | `grep -rn --include='WORKSPACE' --include='WORKSPACE.bazel' --include='WORKSPACE.bzlmod' -e 'rules_swift' .` | `http_archive(name = "build_bazel_rules_swift", ...1.18.0...)` | empty |
| G17 | `grep -rn --include='MODULE.bazel' --include='BUILD.bazel' --include='*.bzl' -e 'rules_spm' .` | `bazel_dep(name = "rules_spm", ...)` | empty |

Verifications that did not go red: V06 (unprefixed `--features=treat_warnings_as_errors`: planted warning stays exit 0, that is the finding), V11 and the `ea_unknown` row of V10 (misspelt upcoming feature exits 0, red only with `StrictLanguageFeatures`), unsandboxed `user_of_private` in V18 (exit 0 until `--worker_sandboxing`), the stale-lock build in V20 (exit 0 until the `cmp` gate), `v6_typo` in V25. Watched red on a planted violation, counting each distinct check once: **55** (V01 x2 variants, V04, V05 x2, V07 x1, V08 x2, V09, V10, V12, V13, V14, V15 x3, V16 x3, V17 x4, V18 x6, V19, V20 x2, V21, V22, G1 to G17, V24 x3, V25 x1). Not run: Bazel 7, 10, 9.3.0, 8.8.1; macOS, Xcode, Windows; Wasm, Android, static stdlib (M-O-08).

## Exemplar evidence

| Rule | Satisfies | Violates / contradicts |
|---|---|---|
| BZL-SWIFT-01 scope | `realm/SwiftLint@ec4691d9e813:MODULE.bazel:15` (Bazel for the macOS universal release only, SwiftPM is the dev build); `tuist/tuist@2f6ac74754bf:swifterpm/MODULE.bazel:9-33` (sub-project); 35 of 40 repos carry no Bazel [audit exemplar-packaging-and-release.md axis 6] | `bazelbuild/rules_swift@50450ed24dde` is the one Bazel-first repo and is the ruleset itself |
| BZL-SWIFT-02 versions | `bazelbuild/rules_swift@50450ed24dde:MODULE.bazel:6` (`>=8.0.0`); SwiftLint `.bazelversion` 9.x with `rules_swift 3.6.1` (final Bazel-7 line) | SwiftLint `MODULE.bazel:6` declares `bazel_compatibility = [">=7.0.0"]` while `.bazelversion` is 9.x: its floor is lower than what it tests |
| BZL-SWIFT-03/04 module loads | rules_swift's own targets load per-rule files; rspm and SwiftLint use `repo_name = "build_bazel_rules_swift"` consistently with their loads (SwiftLint `MODULE.bazel:15`, tuist `swifterpm/MODULE.bazel:15`) | `rules_swift/swift/swift.bzl` itself is the deprecated aggregate |
| BZL-SWIFT-05 CC=clang | `rules_swift@50450ed24dde:.bazelrc:47` (`common:linux --repo_env=CC=clang`); SwiftLint `.github/actions/bazel-linux/action.yml:30` (`echo "CC=clang" >> $GITHUB_ENV`, a shell-level form) | none found without it |
| BZL-SWIFT-06 hermetic | `rules_swift@50450ed24dde:MODULE.bazel:257-260,269-287` (hermetic 6.4.0, exec and embedded registered, ubuntu22.04, comment that the list must follow CI) | the only exemplar that uses the hermetic extension, and a dev dependency (`dev_dependency = True`, `:255`); the doc quickstart contradicts its own repo by registering embedded only |
| BZL-SWIFT-08 worker sandboxing | `rules_swift@50450ed24dde:.bazelrc:29-31` (`build --worker_sandboxing`), `:54` Windows exception | SwiftLint's rc was not read for it (unverified) |
| BZL-SWIFT-09/10 warnings | SwiftLint `bazel/copts.bzl:5` (`-warnings-as-errors` as a per-target copt, plus a long `-enable-upcoming-feature` list); BCR patch strips it for consumers [audit exemplar-quality-gates.md] | `rules_swift@50450ed24dde:.bazelrc:27` uses the **cc** feature name `treat_warnings_as_errors` (correct for its vendored C++ tools, wrong for Swift code); no exemplar uses `swift.werror.*` or `swift.treat_warnings_as_errors` |
| BZL-SWIFT-11/12 modes and features | SwiftLint `copts.bzl` enables 15+ upcoming features through joined-free two-element copts | no exemplar sets `swift.enable_v6` or any `swift.upcoming.*` feature (grep over the 5 Bazel repos found none) |
| BZL-SWIFT-15 Swift Testing | `rules_swift@50450ed24dde:test/fixtures/xctest_runner/BUILD:87-103` (three Swift Testing targets), `tools/test_discoverer/TestDiscoverer.swift:120-137` | rules_swift `doc/rules.md` and `swift_test.bzl:668-680` still describe XCTest only |
| BZL-SWIFT-20 alwayslink | rules_swift sets it only in the embedded override (`swift/swift_library.bzl:213-221`) | none |
| BZL-SWIFT-22 rspm | `tuist/tuist@2f6ac74754bf:swifterpm/MODULE.bazel:27-33` (`from_package(declare_swift_package = False, resolved = ..., swift = ...)` against `third_party/nio/Package.resolved`) | tuist pins rspm 1.18.1 against `rules_swift 3.6.1`, seven minors behind 1.25.0 and a major behind 4.2.1 |

## AI-agent angle

What an LLM characteristically gets wrong here, and the smallest mechanical check:

| Mistake | Why it is wrong | Check (run) |
|---|---|---|
| Writes a `WORKSPACE` with `http_archive(name = "build_bazel_rules_swift", ... 1.x ...)` and `swift_rules_dependencies()` | no `repositories.bzl` in 4.2.1, bzlmod only | G16 (bad hit, good empty); `bazel build --nobuild //...` |
| `load("@build_bazel_rules_swift//swift:swift.bzl", ...)` | WORKSPACE-era repo name; aggregate deprecated | G3 and V19 (exit 1) |
| Forgets `CC=clang` on Linux, or exports it in CI only | gcc default; analysis fails | G9, V01 |
| Copies the doc quickstart and registers `*_embedded_*` toolchains | host build has no matching toolchain | G4, V17 |
| Writes `swift_version = "6.2.4"` from the docs, or a newer patch not in the metadata | stale example; unsupported version fails the extension | G2, V17 (`6.4.1` exit 1) |
| `--features=treat_warnings_as_errors` for Swift | the cc feature; Swift warnings stay green | G1, V06 (false green) |
| Joins flags in `copts`: `"-enable-upcoming-feature ExistentialAny"` | one argv element | G12, V14 |
| Invents feature names (`swift.enable_swift6`, `swift.strict_concurrency`, `swift.warnings_as_errors`) | unknown features are silently ignored | aquery awk check V25 |
| Uses `swift.upcoming.ApproachableConcurrency` or the SwiftPM spelling `.enableUpcomingFeature(...)` in a BUILD file | bundle contradicts SW-PKG-16; API belongs to Package.swift | G11 |
| Omits `module_name` and imports the target name | derived name differs | V18, V24 query |
| Names the entry file `Main.swift` or `App.swift` with top-level code | `-parse-as-library` | V21 |
| Uses `defines` where `local_defines` is meant | leaks to dependents | G15 |
| Puts `import` of a transitive module into a file without a `deps` edge, expects Bazel to catch it | catches only with layering check | V15, BZL-SWIFT-21 |
| Writes XCTest for new Swift code and believes `swift_test` supports only that | habit, plus stale docs | SW-TEST-01 diff grep; V16 shows Swift Testing runs |
| Sets `discover_tests = False` to "fix" a no-tests error | link fails without `main`; the right fix is a test | V24 query, V16 |
| Treats a green `bazel build //...` as proof tests ran | `swift_test` runs only under `bazel test` (BZL-TEST) | `bazel test //...` (BZL-TEST) |
| Hand-writes `genrule`s that run `swiftc` / `swift build`, or uses `cc_binary` with Swift sources | bypasses the toolchain, sandboxing and caching | reading heuristic: `grep -rn --include='BUILD.bazel' -e 'swiftc' -e 'swift build' .` (not run) |
| Adds SwiftPM dependencies by `http_archive` or `rules_spm` | legacy; rspm replaces it | G17 |
| Edits `Package.swift` and runs only `bazel build` | stale `Package.resolved` builds green | `swift package resolve` + diff (V20) |
| Builds a `swift_library` directly for iOS or assumes Linux CI covers it | needs `rules_apple`; unverified: read only | reading heuristic |
| Runs `bazel` from a shell with a different `swift` on PATH than CI | host toolchain drift | BZL-SWIFT-07 reading heuristic |
| Enables `swift.debug_module_path` "to speed up debugging" on Linux | fails to load the stdlib | G14, V22 |

## Contested / evolving

- **Hermetic vs host toolchain.** rules_swift's own README still leads with "install Swift, set CC=clang" and its quickstart doc registers embedded toolchains that a host build cannot use; its own repo registers hermetic exec toolchains. Trend (2026-10-10, 4.x line): hermetic + `.swift-version`, with the doc lagging the code. The host libraries a hermetic toolchain needs are not documented.
- **Swift Testing under `swift_test`.** Supported in code since the observer/discoverer rewrite (forum thread 74010 era, 2024-25); docs and the `discover_tests` text have not caught up as of 4.2.1. Expect the docs to change; the behaviour measured here (both frameworks, exit 3 on failure, `No tests were discovered` guard) is the contract to rely on.
- **`swift.debug_module_path`.** The Swift blog (2026-09-11) says the 6.3 compiler can record the path and 6.4 lets build systems drop `-modulewrap` / `-add_ast_path`; rules_swift 4.2.1 documents default-on for Xcode 27 but implements opt-in, and the explicit-module path fails on Linux 6.4. Trend: Apple-first; Linux explicit modules are not ready. Revisit on 4.3.
- **`swift.treat_warnings_as_errors` vs `swift.werror.<Group>`.** The group form needs the compiler to know the group (Swift 6.1+, SE-0443); `NoUsage`-style groups appear per release (6.4 has it, 6.3 does not), so the guard feature `UnknownWarningGroup` is part of the rule, not an add-on.
- **rules_swift 3.x vs 4.x consumers.** SwiftLint, rspm and tuist still resolve 3.6.x because `compatibility_level` is unchanged; a root that wants 4.2.1 must declare it. Whether rspm will raise its own floor is unknown.
- **Bazel 10.** README and BCR claim rolling support (min 3.5.0 for 10.x); not run here. 9.3.0 and 8.8.1 are current LTS patches (2026-10-10) and also not run.
- **Windows.** rules_swift runs Windows tasks in CI and its rc has a Windows worker exception; this file asserts nothing about Windows (owner Q7: unverified: read only).

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://raw.githubusercontent.com/bazelbuild/rules_swift/4.2.1/README.md | rules_swift README at the 4.2.1 tag (primary) | 2026-10-09 | CC=clang requirement, supported Bazel table, rspm pointer |
| https://raw.githubusercontent.com/bazelbuild/rules_swift/4.2.1/doc/standalone_toolchain.md | hermetic `swift.toolchain` guide (primary) | 4.2.1 | extension attrs, `.swift-version`, platform keys; stale quickstart |
| https://raw.githubusercontent.com/bazelbuild/rules_swift/4.2.1/doc/rules.md | generated rule reference (primary) | 4.2.1 | `swift_library`, `swift_test` attributes; alwayslink table drift |
| https://raw.githubusercontent.com/bazelbuild/rules_swift/4.2.1/MODULE.bazel | module file (primary) | 4.2.1 | `bazel_compatibility`, `compatibility_level`, own toolchain and registrations |
| https://raw.githubusercontent.com/bazelbuild/rules_swift/4.2.1/.bazelrc | the ruleset's own rc (primary) | 4.2.1 | CC=clang, worker sandboxing, the cc `treat_warnings_as_errors` |
| https://github.com/bazelbuild/rules_swift/releases/tag/4.2.1 | release notes (primary) | 2026-10-09 | "compatible with Bazel 8.x LTS, 9.x LTS, and rolling" |
| https://raw.githubusercontent.com/bazelbuild/bazel-central-registry/main/modules/rules_swift/4.2.1/presubmit.yml | BCR presubmit for 4.2.1 (primary registry) | 2026-10 | Bazel 8.x/9.x/rolling matrix, CC=clang, `--action_env=PATH` |
| https://raw.githubusercontent.com/bazelbuild/bazel-central-registry/main/modules/rules_swift/metadata.json | BCR version list (primary registry) | 2026-10-10 | confirms 4.2.1 is latest; yanked 3.0.0 |
| https://raw.githubusercontent.com/cgrindel/rules_swift_package_manager/main/README.md | rspm README (primary, tool repo) | v1.25.0, 2026-09-21 | quickstart, Linux notes, target-edit tags |
| https://raw.githubusercontent.com/cgrindel/rules_swift_package_manager/main/MODULE.bazel | rspm module file (primary) | 1.25.0 | declares rules_swift 3.6.0 with `max_compatibility_level = 3` |
| https://raw.githubusercontent.com/cgrindel/rules_swift_package_manager/main/docs/faq.md | rspm FAQ (primary) | 2026 | rules_spm replacement, byName error |
| https://raw.githubusercontent.com/bazelbuild/bazel-central-registry/main/modules/rules_swift_package_manager/metadata.json | BCR version list for rspm | 2026-10-10 | 1.25.0 is latest |
| https://www.swift.org/blog/module-tracking-in-debug-info/ | swift.org blog, Adrian Prantl (primary) | 2026-09-11 | `-debug-module-path`, what build systems may drop in 6.4 |
| https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0443-warning-control-flags.md | SE-0443 (primary) | Implemented 6.1 | `-Werror <group>`, `-warnings-as-errors`, the basis for `swift.werror.*` |
| https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0461-async-function-isolation.md | SE-0461 (primary) | Implemented 6.2 | `NonisolatedNonsendingByDefault` |
| https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0466-control-default-actor-isolation.md | SE-0466 (primary) | Implemented 6.2 | `-default-isolation MainActor` |
| https://raw.githubusercontent.com/swiftlang/swift-testing/main/Documentation/ABI/JSON.md | swift-testing JSON ABI (primary, swiftlang repo) | 2026 | the interface `SwiftTestingRunner` drives |
| https://forums.swift.org/t/74010 | Swift Forums thread cited in `TestDiscoverer.swift:106-109` (primary) | 2024 | why XCTest and Swift Testing are run from one `main` |
| https://www.swift.org/install/linux/ | swift.org Linux install page (primary) | 6.4.0 | host dependencies and swiftly |
| https://bazel.build/release | Bazel release model and support matrix (primary) | 2026-10-10 | 10 rolling, 9 active (9.3.0), 8 maintenance (8.8.1), 7 end Dec 2026 |
| `realm/SwiftLint@ec4691d9e813:MODULE.bazel` (exemplar corpus) | a Bazel consumer of rules_swift 3.6.1 | 0.65.1 | `max_compatibility_level`, release-only Bazel |
| `tuist/tuist@2f6ac74754bf:swifterpm/MODULE.bazel` (exemplar corpus) | a rspm consumer | 2026 | `swift_deps.from_package` shape |
| `bazelbuild/rules_swift@50450ed24dde` (exemplar corpus): `swift/toolchains/swift_toolchain.bzl`, `swift/internal/{attrs,features,feature_names}.bzl`, `swift/toolchains/config/compile_config.bzl`, `tools/test_discoverer/TestDiscoverer.swift` | the code the docs describe | 2026-10-09 | ground truth where docs drift |
| `/home/mherwig/dev/grimoire-lore/.agents/worktrees/swift/.agents/research/swift-audit/exemplar-packaging-and-release.md`, `config-inventory.md`, `swift-gates.md`, `swift-package.md`, `swift-testing.md` | the audits and settled rule files this file maps from | 2026-10-10 | SW-GATE-13/15/16, SW-PKG-02/07/08/13/14/16/19, SW-TEST-01 |
