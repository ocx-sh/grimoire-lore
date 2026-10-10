---
title: "Bazel for Swift (BZL-SWIFT): rules_swift 4.2.1 under Bazel, consolidated"
topic: "bazel/rules-swift (W3-10): rows M-O-01..M-O-07, M-O-09, M-O-10 (M-O-08 static and cross builds not researched)"
model: sonnet
id_family: BZL-SWIFT
consolidates:
  - swift-bazel/rules-swift.md
date: 2026-10-10
---

# Bazel for Swift (BZL-SWIFT), consolidated

Toolchains: Bazel 8.8.0 and 9.2.0 (from the ocx index, `~/.cache/research-lang/bazel-tools/bin`), Swift 6.4.0 (Docker `swift:6.4`, plus gcc for the CC rows); the dive also ran 6.3. `rules_swift` 4.2.1 (2026-10-09), `rules_swift_package_manager` 1.25.0 (2026-09-21). No macOS, no Xcode, no Windows: every Apple and Windows row is `unverified: read only`. Not run: Bazel 7, 9.3.0, 8.8.1, 10 (rolling).

Citation keys: **[RS]** = [rules-swift](swift-bazel/rules-swift.md) with its V/G ids; **[CN Rn]** = this consolidation's own runs (table at the end, fixtures under `~/.cache/research-lang/swift-tools/fixtures/swift-bazel/`); **[pkg]**, **[cfg]** = the packaging and config audits under [swift-audit](swift-audit/); **[eco]** = [ecosystem-tooling](swift-topic-map/ecosystem-tooling.md); **[SG]**, **[SP]**, **[ST]** = [swift-gates](swift-gates.md), [swift-package](swift-package.md), [swift-testing](swift-testing.md). Exemplar citations are `repo@sha12:path:line` against `~/.cache/research-lang/exemplars/swift/`. Every `grep` below is GNU grep with a directory operand, run from the repository root; the catalog's `grep` must not be a rewriting wrapper.

There is exactly one sub-artifact, so "where the sources disagreed" means the dive against the audits, the ecosystem scout, the settled SW-* rules and this consolidation's own runs.

## Verdict

1. **The file binds only if the repository already declares `bazel_dep(name = "rules_swift", ...)`** (BZL-SWIFT-01). Bazel is secondary for Swift: 5 of 40 exemplars carry Bazel files and only rules_swift builds with it as the main system [pkg axis 6]. An agent never adds `MODULE.bazel` or `BUILD.bazel` to a SwiftPM repository; SwiftPM and `Package.swift` stay the source of truth. Binds every code kind.
2. **Bazel 8.x or 9.x, bzlmod only, `rules_swift` 4.x declared in the root** (BZL-SWIFT-02). A root that declares only `rules_swift_package_manager` silently resolves `rules_swift@3.6.0`, the last Bazel-7 line [CN R8]. Bazel 10 is unverified.
3. **One toolchain source per repository.** A host toolchain needs `common:linux --repo_env=CC=clang` in the checked-in rc (MUST, 04); CI and release builds SHOULD use the hermetic exec toolchain pinned by `.swift-version` (05). A shell-level `CC=clang` is what SwiftLint and swift-syntax do on Linux and what the rule rejects [CN R2].
4. **Gate and feature promotions are scoped to first-party packages, not the workspace.** Decision against the dive (which put the gate in `build:ci --features=`): `package(features = SWIFT_FIRST_PARTY_FEATURES)` in each first-party BUILD file, the list defined once in a `.bzl` (07-11). Reason, measured: SwiftPM suppresses dependency warnings and its guards are root-only (SW-PKG-02 in [SP]), but rules_swift does not, so a workspace-wide `swift.treat_warnings_as_errors`, `swift.upcoming.InternalImportsByDefault` or `swift.werror.StrictLanguageFeatures` failed the build on a third-party rspm package (exit 1 on all three) while the package-scoped form built it and still failed the first-party plant [CN R4]. A repository with no external Swift code may keep the rc-level form. Binds library, SDK, CLI, server.
5. **Feature spellings are the trap, and several fail green.** The Swift gate is `swift.treat_warnings_as_errors`; the unprefixed `treat_warnings_as_errors` is the C++ feature and left a planted Swift warning at exit 0 (MUST, 07). Swift 6 mode is `swift.enable_v6`; without it rules_swift passes `-swift-version 5`, and an invented name (`swift.enable_swift6`) stays in mode 5 and builds green (MUST, 08). Upcoming features are `swift.upcoming.<Name>`, never one joined `copts` string (MUST for the SW-PKG-07 three, 09).
6. **`swift_test` runs Swift Testing**; the docs say XCTest only. New tests stay Swift Testing with `discover_tests` left on (MUST, 18). New finding: `Bundle.module` does not exist under rules_swift, so SW-TEST-21's fixture lookup needs a `data` plus `TEST_SRCDIR` seam (SHOULD, 19).
7. **Attributes that fail far from their cause**: set `module_name` on every `swift_library` (MUST, 14; the derived name of `//pkg/sub:thing` is `pkg_sub_thing`), name the entry file `main.swift` or use `@main` (16), share `package_name` for `package` access (17), run workers sandboxed so a missed dependency edge is a red build (06).
8. **rules_swift_package_manager is allowed and secondary**: `from_package` plus `bazel mod tidy`, and a CI diff gate on `Package.resolved`, because a stale lock builds green (MUST when used, 21).
9. **Where doc prose and generated behaviour disagree, behaviour wins** (15): `alwayslink` defaults to True, the hermetic quickstart registers the wrong pair, `swift.debug_module_path` is documented default-on for Xcode 27 and implemented opt-in, and enabling it on Linux 6.4 fails to load the stdlib (do not, 13).
10. **Severity**: 9 MUST (silent wrong results, or a clean checkout that cannot build), 13 SHOULD, 1 CONSIDER. Static and cross builds, macros, `swiftc_inputs` and Apple/Windows are not covered (Open questions).

### Where the sources disagreed, and how it was settled

- **C1. Gate scope: the dive's rc-level `build:ci --features=swift.treat_warnings_as_errors` against third-party code.** The dive tested the global feature only against rules_swift's own tools and the Swift Testing runner [RS §6, V07]. Re-run with an rspm-built dependency: global gate exit 1 on 8.8.0 and 9.2.0, package-scoped gate exit 0 on the dependency and exit 1 on a first-party plant [CN R4]. Resolved: package scope (07), with the rc form kept for repositories without external Swift. The same measurement turned `InternalImportsByDefault` (09) and `StrictLanguageFeatures` (10) from rc-level into package-level rules; `swift.enable_v6` is the exception, because rspm writes `-swift-version 5` into each generated target's `copts` and the global feature changed nothing (exit 0) [CN R4].
- **C2. The dive's `grep -rL --include='.bazelrc'` presence checks (G5, G6, G9) against reality.** On a tree with no `.bazelrc` they print nothing (false pass); on a tree whose flags live in an imported `ci.bazelrc` they print `./.bazelrc` (false positive); G9 also fires on a hermetic repository that needs no `CC` [CN R3]. SwiftLint's own rc does `try-import %workspace%/ci.bazelrc` (`realm/SwiftLint@ec4691d9e813:.bazelrc:3`), so the case is real. Replaced by conditional greps over `.bazelrc` and `*.bazelrc` that fire only when `rules_swift` is declared (K4, K7, W1, W4, E6).
- **C3. Packaging audit and config inventory read `rules_swift@50450ed24dde:.bazelrc:27` (`build --features treat_warnings_as_errors`) as a Swift gate.** It is the C++ feature for the vendored C++ tools [RS §6 negative control]; re-run: unprefixed exit 0, prefixed exit 1, clean twin exit 0 [CN R5]. Resolved: the dive. The same audit says the doc example `swift_version = "6.2.4"` is stale against the pinned `6.4.0` [cfg §3]: `6.2.4` is in the bundled metadata (6.2.1 to 6.4.0), so the example is valid and the actual doc defect is the embedded-only registration [RS §4, V17].
- **C4. The ecosystem scout against the code.** [eco] says the hermetic platform list lacks "26.04, UBI10, Debian 13" and that build systems "pass `-debug-module-path`". The bundled `swift_release_metadata.json` at `rules_swift@50450ed24dde` lists `ubuntu26.04`, `debian13`, `ubi10` for 6.4.0 (re-read) and no `fedora39` or `amazonlinux2`; and `-debug-module-path` fails on Linux 6.4 [RS V22]. Resolved: metadata and run (05, 13).
- **C5. The frame and [cfg] C6 said Bazel could not be run, so rows could not be watched red.** Overturned: the dive installed 8.8.0 and 9.2.0 from the ocx index and ran 55 distinct red checks [RS Verification runs]. The topic map's "Bazel 8-10" is narrowed to 8 and 9 measured.
- **C6. SW-TEST-21's rationale says a Bazel sandbox breaks `#filePath` ("unverified: read only", [ST]).** Measured under rules_swift 4.2.1: `#filePath` is the workspace-relative `Tests/ShowPaths.swift` and the test cwd is `<runfiles>/_main`, so a `#filePath` lookup passes when the fixtures are in `data` [CN R6]. The ban on `#filePath` stands for SwiftPM (moved tree); the Bazel half of that sentence is wrong. What does break is `Bundle.module`: a compile error [CN R6]. Resolved into BZL-SWIFT-19.
- **C7. Severity.** The dive marks 12 rules MUST. Two are downgraded: the one-version-string rule (22) has no run, only a reading heuristic over files the set never globs; the `main.swift` rule (16) fails loudly with a named diagnostic. The dive's MUST for SW-PKG-07/08 together is split: the three SW-PKG-07 features MUST (09), the two SW-PKG-08 features SHOULD (11).
- **C8. Dropped.** `local_defines` vs `defines` (generic Bazel, loud failure) and the dive's separate pin rule (folded into 02). One fact kept as a note: `swiftc -DFLAG=1` defines nothing named `FLAG` (warning, then `#error` fires), but rules_swift accepts `local_defines = ["FLAG=1"]` [CN R7]; the portable spelling is the bare `FLAG`.

## The ruleset

Index (23 rules, 9 MUST): grep over checked-in Bazel files, 01-13; query or aquery, 14-15; build or test, 16-20; resolve and diff, 21; reading heuristics last, 22-23. IDs are stable; the order follows the catching check. Every entry says whether it was watched red; `RS` ids are the dive's, `CN` ids are this file's runs. `Binds` names the code kind; a rule that does not say binds every Swift target built by the Bazel workspace.

Commands marked `P`, `B`, `L`, `K`, `H`, `W`, `E`, `U`, `I`, `D` are the exact strings of [CN R1] (the dive's `V01`-`V25` and `G1`-`G17` are cited only as [RS ...]). **Empty output is the pass** for every one except P1, where a hit means the file binds. K4, K7, W1, W4 and E6 print one sentence when they fire.

### Caught by grep over checked-in Bazel files (no Bazel run needed)

**BZL-SWIFT-01 (MUST, scope).** This file applies only when the repository declares `bazel_dep(name = "rules_swift", ...)` in a `MODULE.bazel`; in any other Swift repository build and test with SwiftPM, and add no `MODULE.bazel`, `BUILD.bazel` or `.bazelrc`.
- Why: Bazel is secondary for Swift (5 of 40 exemplars, one Bazel-first); adopting it is `bazel-adopt`'s call, and the default answer for Swift is no.
- Check: probe P1 `grep -rn --include='MODULE.bazel' -e 'name *= *"rules_swift"' .` (a hit means this file binds; exit 1 and no output means it does not). Whether to adopt Bazel is a reading heuristic by nature.
- Red: probe yes, [CN R1] hit on the seven Bazel trees, exit 1 empty on the SwiftPM-only tree; on the exemplars it hits rules_swift, SwiftLint, tuist/swifterpm and swift-syntax and misses swift-protobuf, which has BUILD files and no `MODULE.bazel` [CN R2]. Source: [RS §2], [pkg axis 6].
- Floor: none. Binds: every kind.

**BZL-SWIFT-02 (MUST).** Configure rules_swift through `MODULE.bazel` only, on Bazel 8.x or 9.x: declare `bazel_dep(name = "rules_swift", version = "4.x")` in the root module even when `rules_swift_package_manager` is declared, keep no `WORKSPACE*` file that mentions `rules_swift`, and use no `rules_spm`.
- Why: 4.2.1 is bzlmod-only (`bazel_compatibility = [">=8.0.0"]`, `rules_swift@50450ed24dde:MODULE.bazel:3-8`) and ships no `repositories.bzl`; a root that omits the dependency resolves rspm's `rules_swift@3.6.0`, the Bazel-7 line, with no error.
- Check: `B1` `grep -rn -e '^[67]\.' --include='.bazelversion' .`; `B2` `grep -rn --include='WORKSPACE' --include='WORKSPACE.bazel' --include='WORKSPACE.bzlmod' -e 'rules_swift' .`; `B3` `grep -rn --include='MODULE.bazel' --include='BUILD.bazel' --include='BUILD' --include='*.bzl' -e 'rules_spm' .`; and `bazel mod graph --depth=1 | grep -e 'rules_swift@4\.'` (empty output means the root does not declare 4.x).
- Red: yes. [CN R1] B1 `./.bazelversion:1:7.7.1`, B2 `./WORKSPACE:1:http_archive(name = "build_bazel_rules_swift", ...)`, B3 a `rules_spm` hit, each empty on the compliant trees; [CN R8] `mod graph` check hit with the root dependency, empty without it; [RS V19] a WORKSPACE-era load exit 1.
- Floor: Bazel 8.0. Bazel 10 is `unverified`; a Bazel-7 repository can stay on `rules_swift` 3.6.1 only until Bazel 7 ends (Dec 2026, [RS Sources], bazel.build/release).

**BZL-SWIFT-03 (SHOULD).** Load each rule from the file that defines it (`@rules_swift//swift:swift_library.bzl`, `swift_binary.bzl`, `swift_test.bzl`); never the deprecated aggregate `swift:swift.bzl`, never anything under `swift/internal`, and use `@build_bazel_rules_swift` only when the `bazel_dep` sets `repo_name = "build_bazel_rules_swift"`.
- Why: the aggregate still loads (exit 0) but is marked deprecated; the WORKSPACE-era repo name is invisible otherwise (`No repository visible as '@build_bazel_rules_swift'`, exit 1).
- Check: `L1a` `grep -rn --include='BUILD.bazel' --include='BUILD' --include='*.bzl' -e 'swift:swift.bzl' -e 'rules_swift//swift/internal' .`; `L1b` `grep -rq --include='BUILD.bazel' --include='BUILD' --include='*.bzl' -e '@build_bazel_rules_swift' . && ! grep -rq --include='MODULE.bazel' -e 'repo_name *= *"build_bazel_rules_swift"' . && echo 'WORKSPACE-era repo name without repo_name'`. Never run L1a on rules_swift itself: its own `swift/internal` loads are legitimate.
- Red: yes. [CN R1] L1a 2 lines on `bad`, L1b fires on `bad` and is empty on `repo_named` (the same load with `repo_name = "build_bazel_rules_swift"` set), both empty elsewhere; [RS V19].
- Binds: BUILD and `.bzl` authors.

**BZL-SWIFT-04 (MUST).** With a host Swift toolchain on Linux, the checked-in rc carries `common:linux --repo_env=CC=clang` and `build --enable_platform_specific_config`; a `CC=clang` exported by a CI step or a developer's shell does not count.
- Why: gcc is Bazel's default C++ toolchain and `swift_binary` and `swift_test` fail analysis with `Swift requires the configured CC toolchain use clang`; a shell export makes CI green and the next clean checkout red.
- Check: `K4` `grep -rq --include='MODULE.bazel' -e 'name *= *"rules_swift"' . && ! grep -rq --include='MODULE.bazel' -e 'swift\.toolchain(' . && ! grep -rqE --include='.bazelrc' --include='*.bazelrc' -e 'repo_env[= ]CC=clang' . && echo 'host toolchain without repo_env=CC=clang'`. Effect: unset `CC`, `bazel build //...` exits 0.
- Red: yes. [RS V01, V02] exit 1 without, 0 with, four Bazel/Swift combinations; [CN R1] K4 fires on `bad` and on `norc` (no rc file at all), empty on `good`, `good2` (flags in an imported rc), `hermetic` (no `CC` needed).
- Binds: Linux CI and developer machines; macOS needs no `CC`. Exemplar split in Applied.

**BZL-SWIFT-05 (SHOULD, for CI and release builds).** Use the hermetic toolchain in the root module: `swift.toolchain(name = "swift_toolchain", swift_version_file = "//:.swift-version")`, `use_repo` of `swift_toolchain` and one `swift_toolchain_<platform>` per build platform named in the bundled metadata of that version, and `register_toolchains` of both `@swift_toolchain//:cc_toolchain_exec_<platform>` and `@swift_toolchain//:swift_toolchain_exec_<platform>`; never only the `*_embedded_*` pair from `doc/standalone_toolchain.md`; prefer the version file to an inline `swift_version = "..."` so swiftly, CI and Bazel read one string (22).
- Why: one pinned compiler on every machine, no `CC`, no `--action_env=PATH`; embedded-only or unregistered setups fail `target 'linux-toolchain' not declared`; a version outside the bundled list (4.2.1: 6.2.1 to 6.4.0) fails at extension evaluation (`6.4.1` exit 1).
- Check: `H1` `grep -rn --include='MODULE.bazel' -e 'swift_version = ' .` (a hit is an inline version; allowed only when the CI image tag is the same string, rule 22); `H2` `grep -rl --include='MODULE.bazel' -e 'swift.toolchain(' . | xargs -r grep -L -e 'swift_toolchain_exec_'` (a listed file declares the toolchain without the exec registration; `xargs` exits 123 when it lists one).
- Red: yes. [RS V17] embedded-only exit 1, unregistered exit 1, exec pair exit 0 on 8.8.0 and 9.2.0; [CN R1] H1 fires on `hermetic_bad` only, H2 prints `./MODULE.bazel` (exit 123) on `hermetic_bad` only; [CN R2] on the exemplars H1 fires on rules_swift itself (`MODULE.bazel:259`) and H2 is empty everywhere.
- Caveat the docs omit: a bare Ubuntu 24.04 needs `libxml2`, `libncurses6`, `libsqlite3-0` before the toolchain runs [RS V17]. The extension is root-module only (`dev_dependency = True` for a library that needs it only for its own tests, as rules_swift does at `MODULE.bazel:256`). Binds CI and release; local development may stay on 04's host form on one pinned image.

**BZL-SWIFT-06 (SHOULD).** The checked-in rc sets `build --worker_sandboxing` (`build:windows --noworker_sandboxing` for a Windows leg).
- Why: the default worker strategy is unsandboxed, so a `private_deps` leak and any undeclared input compile green; sandboxed, the same target fails `no such module 'Lib'`.
- Check: `K7` `grep -rq --include='MODULE.bazel' -e 'name *= *"rules_swift"' . && ! grep -rq --include='.bazelrc' --include='*.bazelrc' -e '--worker_sandboxing' . && echo 'rules_swift without --worker_sandboxing'` (the pattern `--worker_sandboxing` does not match `--noworker_sandboxing`).
- Red: yes. [RS V18] unsandboxed leak exit 0, sandboxed exit 1; [CN R1] K7 fires on `bad` and `norc`. Windows leg: `unverified: read only`.

**BZL-SWIFT-07 (MUST; maps SW-GATE-13).** The Swift warnings gate is the feature `swift.treat_warnings_as_errors` (or `-warnings-as-errors` in a shared `copts` list) applied to first-party packages through `package(features = SWIFT_FIRST_PARTY_FEATURES)`, the list loaded from one `.bzl`; never the unprefixed `treat_warnings_as_errors`, and not a workspace-wide `--features=` in any workspace that compiles external Swift code (rules_swift_package_manager).
- Why: the unprefixed name is the C++ feature and leaves a planted Swift warning at exit 0; under SwiftPM dependency diagnostics are suppressed, under Bazel they are not, so a workspace-wide gate turned a third-party warning into a build error.
- Check: `W1` `grep -rq --include='MODULE.bazel' -e 'name *= *"rules_swift"' . && ! grep -rqE --include='.bazelrc' --include='*.bazelrc' --include='BUILD.bazel' --include='BUILD' --include='*.bzl' -e 'swift\.treat_warnings_as_errors' -e '"-warnings-as-errors"' . && echo 'rules_swift without a Swift warnings gate'`; `W2` `grep -rnE --include='.bazelrc' --include='*.bazelrc' --include='BUILD.bazel' --include='BUILD' --include='*.bzl' -e '(--features[= ]|")treat_warnings_as_errors' .` (a hit is the C++ spelling; legitimate only beside a C++ target, and then a Swift gate must exist too); canary: a planted unused `var` in a first-party target exits non-zero, and `bazel build //...` exits 0 with a third-party warning present.
- Red: yes. [CN R5] plain exit 0, unprefixed `--features=treat_warnings_as_errors` exit 0 (the false green), prefixed exit 1, clean twin exit 0; [CN R4] workspace-wide gate on the rspm dependency exit 1 (8.8.0 and 9.2.0), `package(features = ...)` gate: first-party plant exit 1, clean twin and dependency exit 0; [CN R1] W1 fires on `bad` and `norc`, W2 on `bad` (rc form) and `hermetic_bad` (BUILD form); [RS V05, V06, V07].
- Floor: any toolchain for the blanket flag. SW-GATE-13's nightly-leg exemption has no Bazel analogue because the toolchain is pinned; a repository with a floating-toolchain leg and no external Swift puts `build:ci --features=swift.treat_warnings_as_errors` in the rc instead. Binds library, SDK, CLI, server; apps likewise.

**BZL-SWIFT-08 (MUST; maps SW-PKG-13, SW-PKG-14).** Every first-party Swift target is in Swift 6 mode: `swift.enable_v6` is in `SWIFT_FIRST_PARTY_FEATURES` (or `features = ["swift.enable_v6"]` per target); a target kept in mode 5 carries a dated comment and removal condition (SW-PKG-15).
- Why: without the feature rules_swift passes `-swift-version 5`, so Bazel's default is mode 5; `swift.enable_v6` also enables the full Swift 6 upcoming set (`swift/internal/feature_names.bzl:36-39`); an invented name stays in mode 5 and builds green.
- Check: presence `E6` `grep -rq --include='MODULE.bazel' -e 'name *= *"rules_swift"' . && ! grep -rq --include='.bazelrc' --include='*.bazelrc' --include='BUILD.bazel' --include='BUILD' --include='*.bzl' -e 'swift\.enable_v6' . && echo 'rules_swift without swift.enable_v6'`; effect `bazel aquery "mnemonic('SwiftCompile', //...)" --output=text | awk '/^    -swift-version/ { getline; if ($1 == "5") print "swift-version 5" }'` (each printed line is a mode-5 compile).
- Red: yes. [CN R5] aquery on `swift.enable_v6` target 0 lines, on the `swift.enable_swift6` typo target 1, on `//...` 15 of 16 compiles, with `--features=swift.enable_v6` 0; [CN R4] aquery on a package-scoped list 0 of 3 and on the unscoped package 2 of 2; a mutable global fails `[#MutableGlobalVariable]` exit 1 inside the scoped list; [RS V04, V25]; E6 fires on `bad` and `norc` [CN R1].
- Scope fact: the aquery check covers first-party targets only. A global `--features=swift.enable_v6` did not change an rspm package, which carries `-swift-version 5` in its generated `copts` (manifest tools 5.9; a tools-6 manifest was not measured) [CN R4].
- Floor: Swift 6.0. Binds library, SDK, CLI, server; Apple app targets `unverified: read only`.

**BZL-SWIFT-09 (MUST; maps SW-PKG-07).** First-party targets enable `ExistentialAny`, `MemberImportVisibility` and `InternalImportsByDefault` as `swift.upcoming.<Name>` features in `SWIFT_FIRST_PARTY_FEATURES` (or as two-element `copts`: `"-enable-upcoming-feature", "<Name>"`); never one joined string; a dependency used in public API is then `public import`.
- Why: a joined `copts` string is one argv element and fails (`unknown argument`); the feature form is the one the guard in 10 can audit; workspace-wide `InternalImportsByDefault` failed to compile a third-party package whose public function returned a type from an internally imported module.
- Check: `U1` `grep -rn --include='BUILD.bazel' --include='BUILD' --include='*.bzl' -e '"-enable-upcoming-feature [A-Za-z]' -e '"-enable-experimental-feature [A-Za-z]' .`; effect: `bazel build //...` under the scoped list.
- Red: yes. [CN R5] `MemberImportVisibility` plant: off exit 0, on exit 1 `instance method 'ext()' is not available due to missing import of defining module 'Ext' [#MemberImportVisibility]`, explicit-import twin exit 0; `InternalImportsByDefault` plant: off 0, on 1 `function cannot be declared public because its result uses an internal type`, `public import` twin 0; [CN R4] workspace-wide `InternalImportsByDefault` on the rspm dependency exit 1, package-scoped exit 0 with the first-party plant exit 1; [RS V10, V14] joined string exit 1; U1 fires on `bad` [CN R1]. The dive ran only `ExistentialAny`; the other two names are now watched.
- Floor: Swift 6.2 (SW-PKG-07's tools floor); measured on 6.4 only. Binds library, SDK, CLI, server.

**BZL-SWIFT-10 (SHOULD; maps SW-GATE-15, SW-GATE-16, SW-PKG-02).** A package that sets any `swift.upcoming.*` or `swift.experimental.*` also lists `swift.werror.StrictLanguageFeatures` in the same package-scoped list, and `swift.werror.UnknownWarningGroup` whenever it promotes a `swift.werror.<Group>`; group names start upper case; a group absent from the oldest toolchain leg is not promoted.
- Why: a misspelt upcoming name exits 0 (the compiler accepts it, even with `-warnings-as-errors`); a lowercase group is dropped silently; `NoUsage` exists in 6.4, not in 6.3. Under Bazel the guard is not root-only: workspace-wide, a third-party manifest's unknown feature name (`'NoSuchFeatureX' is not a recognized upcoming feature`) failed the build.
- Check: `W3` `grep -rnE --include='BUILD.bazel' --include='BUILD' --include='*.bzl' --include='.bazelrc' --include='*.bazelrc' -e 'swift\.werror\.[a-z]' .`; `W4` `grep -rqE --include='BUILD.bazel' --include='BUILD' --include='*.bzl' --include='.bazelrc' --include='*.bazelrc' -e 'swift\.(upcoming|experimental)\.' -e 'enable-(upcoming|experimental)-feature' . && ! grep -rq --include='BUILD.bazel' --include='BUILD' --include='*.bzl' --include='.bazelrc' --include='*.bazelrc' -e 'swift\.werror\.StrictLanguageFeatures' . && echo 'upcoming features without StrictLanguageFeatures'`. W4 matches rules_swift's own sources; do not run it there.
- Red: yes. [CN R4] typo `ExistentialAnyy` with the package guard exit 1 `[#StrictLanguageFeatures::UnrecognizedStrictLanguageFeatures]`, correct name and dependency exit 0, same typo without the guard exit 0; workspace-wide guard against the dependency's dead name exit 1; [CN R1] W3 and W4 fire on `bad`; [RS V08, V09, V10].
- Floor: Swift 6.1 (SE-0443 warning control). Binds library, SDK, CLI, server.

**BZL-SWIFT-11 (SHOULD; maps SW-PKG-08, SW-PKG-16).** New first-party code also enables `swift.upcoming.NonisolatedNonsendingByDefault` and `swift.upcoming.InferIsolatedConformances`; no target lists `swift.upcoming.ApproachableConcurrency`.
- Why: the bundle name compiles on 6.3 and 6.4, so only a rule stops it; with the two members off, a `nonisolated async` call with a MainActor value fails `[#RegionIsolation::SendingRisksDataRace]`, with the first on it passes.
- Check: `U2` `grep -rn --include='BUILD.bazel' --include='BUILD' --include='*.bzl' --include='.bazelrc' --include='*.bazelrc' -e 'swift.upcoming.ApproachableConcurrency' .`.
- Red: yes. [RS V10, V12] (`NonisolatedNonsendingByDefault` off exit 1, on exit 0 on 6.4 and 6.3; `InferIsolatedConformances` compiled, no behavioural flip planted); [CN R1] U2 fires on `bad`.
- Floor: Swift 6.2 (SE-0461). Binds library, SDK, CLI, server.

**BZL-SWIFT-12 (SHOULD; maps SW-PKG-19).** `copts = ["-default-isolation", "MainActor"]` appears only on app targets, never on a library, SDK, CLI or server target.
- Why: it changes the isolation of every declaration (a mutable global that fails Swift 6 mode passes under it).
- Check: `I1` `grep -rn --include='BUILD.bazel' --include='BUILD' --include='*.bzl' -e '"MainActor"' .`; every hit must sit on an app target (reading heuristic for the target kind).
- Red: the hit yes ([CN R1] I1 fires on `bad`, [RS V13] off exit 1 / on exit 0); the app-versus-library judgement is a reading heuristic. Floor: Swift 6.2 (SE-0466).

**BZL-SWIFT-13 (SHOULD).** Do not enable `swift.debug_module_path`, nor the `swift.use_c_modules` plus `swift.use_explicit_swift_module_map` pair, on a Linux workspace.
- Why: the docs call it default-on for Xcode 27, the 4.2.1 code never enables it by default, and on Linux 6.4 `-c dbg` with the three features fails `unable to load standard library for target 'x86_64-unknown-linux-gnu'` (exit 1) while the plain target builds. The Apple behaviour is `unverified: read only`.
- Check: `D1` `grep -rn --include='BUILD.bazel' --include='BUILD' --include='*.bzl' --include='.bazelrc' --include='*.bazelrc' -e 'swift.debug_module_path' .`.
- Red: yes. [RS V22]; [CN R1] D1 fires on `bad`. Do not remove `-modulewrap` by hand (the worker special-cases it).

### Caught by a Bazel query or aquery

**BZL-SWIFT-14 (MUST).** Every `swift_library` sets `module_name` to the `UpperCamelCase` name its dependents `import`.
- Why: the derived name replaces non-identifier characters (`//:my-lib` is `my_lib`, `//pkg/sub:thing` is `pkg_sub_thing`), so the dependent fails `no such module 'thing'` in a different target than the cause.
- Check: `bazel query "attr(module_name, '^$', kind(swift_library, //...))"` (each listed target lacks the attribute; empty is the pass).
- Red: yes. [CN R9] listed `//:unset-name`, nothing on an explicit target; [RS V18, V24] (`import MyLib` against `//:my-lib` exit 1, explicit `module_name` exit 0).

**BZL-SWIFT-15 (SHOULD).** Before relying on a rules_swift attribute default, feature or doc example, read the generated behaviour (`bazel query --output=xml --xml:default_values //:target`, `aquery` on `SwiftCompile`, or the 4.2.1 source); where prose and behaviour disagree, behaviour wins. Leave `alwayslink` at its default (True); an `alwayslink = False` carries a comment naming the size measurement and the conformance-registration check.
- Why: five measured drifts: `alwayslink` is True in code and the generated table says False; the hermetic quickstart registers the `*_embedded_*` pair a host build cannot use; `swift_test` is documented as XCTest-only and runs Swift Testing; `swift.debug_module_path` is documented default-on and is opt-in; the doc platform list (`fedora39`, `amazonlinux2`) is not the 6.4.0 metadata [RS §9].
- Check: `bazel query "attr(alwayslink, 0, kind(swift_library, //...))"` (empty is the pass).
- Red: yes. [CN R9] listed the planted `//:no_always`; [RS V24]. The runtime loss from `alwayslink = False` is a reading heuristic from the rule docs, not run.

### Caught by building or testing

**BZL-SWIFT-16 (SHOULD).** Top-level code lives in a file named exactly `main.swift`; a single source of any other name must use `@main`.
- Why: one Swift source not named `main.swift` is built with `-parse-as-library` (`swift/swift_binary.bzl:69-90`), so top-level code fails `expressions are not allowed at the top level`.
- Check: `bazel build //...` exits 0. Red: yes, [RS V21] `Main.swift` exit 1, `main.swift` exit 0. Downgraded from the dive's MUST because the failure is loud and named (C7).

**BZL-SWIFT-17 (SHOULD).** Implementation-only imports go in `private_deps`; targets that share `package`-level API share one `package_name`; build under BZL-SWIFT-06 so a missed edge is a red build.
- Why: unsandboxed workers let a missing dependency pass; a different or absent `package_name` makes `package` API invisible (`cannot find 'pkgFn' in scope`).
- Check: `bazel build //...` under the rc with `--worker_sandboxing`. Red: yes, [RS V18] (`package_name` same exit 0, different 1, absent 1; private leak exit 0 unsandboxed, 1 sandboxed).

**BZL-SWIFT-18 (MUST; maps SW-TEST-01).** New tests are `swift_test` targets whose sources are Swift Testing files, with `discover_tests` left at True; `discover_tests = False` appears only on a target that owns `main` and exits non-zero on failure; do not write XCTest for new code because the rule docs mention only XCTest.
- Why: the generated runner runs XCTest and then Swift Testing, a failing `#expect` exits 3, a target with no tests exits 3 (`No tests were discovered.`), and `discover_tests = False` without a `main` fails to link.
- Check: `bazel test //...` exits 0; `bazel query "attr(discover_tests, 0, kind(swift_test, //...))"` (each listed target must justify its own `main`; empty is the pass); the SW-TEST-01 diff grep over new test files is unchanged ([ST]).
- Red: yes. [RS V16, V24] pass 0, fail 3, empty 3, no-main link 1, mixed XCTest plus Swift Testing 0, on 6.4 and 6.3; [CN R9] the query listed the planted `//:nodiscover`.
- Floor: measured on Swift 6.3 and 6.4 [RS V16]. Binds test code of every kind. Test sizing, timeouts and coverage reading stay with BZL-TEST.

**BZL-SWIFT-19 (SHOULD; amends SW-TEST-21 for Bazel).** A `swift_test` that reads recorded fixtures lists them in `data` and finds them through one helper: `$TEST_SRCDIR/$TEST_WORKSPACE/<path>` under `#if BAZEL_BUILD` (the define is set with `local_defines = ["BAZEL_BUILD"]` on the target) and `Bundle.module` otherwise; a test that uses `Bundle.module` alone is built only by SwiftPM.
- Why: rules_swift does not synthesize `Bundle.module` (`type 'Bundle' has no member 'module'`); a cwd-relative path works only when the files are in `data` (exit 3 `NSCocoaErrorDomain Code=260` without); `#filePath` passes only because it is workspace-relative and the test cwd is the runfiles root, while the `TEST_SRCDIR` pair depends on neither.
- Check: `bazel test //...` exits 0; `grep -rn --include='*.swift' -e 'Bundle\.module' Tests` (each hit must sit in the `#else` arm of `#if BAZEL_BUILD`; reading heuristic for the conditional).
- Red: yes, build-level. [CN R6] `Bundle.module` alone exit 1 on 8.8.0 and 9.2.0; helper with the define exit 0 on both; helper without the define exit 1 (the define is not predefined); cwd-relative with `data` exit 0, without exit 3; `TEST_SRCDIR` lookup exit 0; `#filePath` exit 0 (workspace-relative path resolved from the runfiles cwd).
- Not covered: a spawned fake CLI in `data` (SW-TEST-15, SW-TEST-20) was not run (Open questions). Binds the SDK's and CLIs' test code when the same tests also build under SwiftPM.

**BZL-SWIFT-20 (CONSIDER).** Enable `swift.layering_check_swift` (and `swift.layering_check_unused_deps` once the graph is clean) for first-party packages.
- Why: a Bazel-only gain with no SwiftPM twin: importing a module without a direct `deps` edge, or declaring a `deps` edge that is never imported, is a build error.
- Check: `bazel build //...` exits 0 under the feature. Red: yes. [CN R5] off exit 0, on exit 1 `error: Layering violation in @@//:layer_viol`; [CN R4] the workspace-wide flags built an rspm package at exit 0 (no third-party failure seen on a two-module vendored package); [RS V15] unused dependency exit 1.

### Caught by resolve and diff (rules_swift_package_manager)

**BZL-SWIFT-21 (MUST, when `rules_swift_package_manager` is used).** The SwiftPM bridge is `swift_deps.from_package(resolved = "//:Package.resolved", swift = "//:Package.swift")` with the `use_repo` list written by `bazel mod tidy`, and CI fails when `swift package resolve` or `bazel mod tidy` changes a tracked file.
- Why: a stale `Package.resolved` builds green and silently omits a newly added dependency; without the `use_repo` names the build fails `No repository visible as '@swiftpkg_<name>'`.
- Check: `swift package resolve && git diff --exit-code -- Package.resolved`, then `bazel mod tidy && git diff --exit-code -- MODULE.bazel` (non-zero is the finding).
- Red: yes. [RS V20] extra manifest dependency: `bazel build` exit 0 (false green), resolve diff exit 1; unchanged manifest diff exit 0; missing `use_repo` exit 1, after `bazel mod tidy` exit 0 on 8.8.0 and 9.2.0. Third-party packages arrive with their own manifest's `-swift-version` and are outside rules 07-10 [CN R4].
- Floor: rspm 1.25.0 on rules_swift 4.2.1. rspm is a separate project, outside the ruleset; `rules_swift` 4.x resolves against rspm's `max_compatibility_level = 3` because 4.2.1 is level 3 [RS §3].

### Reading heuristics

**BZL-SWIFT-22 (SHOULD, reading heuristic).** `.swift-version`, the registered toolchain version and the CI image tag are one string (SW-GATE-08 pins the formatter and compiler the same way).
- Why: diagnostics differ per compiler (`NoUsage` is a group in 6.4 and unknown in 6.3), so a host drifting from CI changes what is red.
- Check: reading heuristic, compare `cat .swift-version` with the image tag in the workflow or Dockerfile; H1 above catches the inline-version form. Not run: the tag lives in files the set never globs, so no single grep exists. Downgraded from the dive's MUST (C7).

**BZL-SWIFT-23 (SHOULD, reading heuristic).** Apple-platform targets build through `rules_apple` (`ios_*` and siblings), not by building a `swift_library` directly for iOS; this file asserts nothing about Windows legs.
- Why: a directly built `swift_library` imports host frameworks (`error: no such module 'UIKit'`, rules_swift FAQ). Check: reading heuristic; `unverified: read only` (no macOS, no Windows host).

## Applied to the exemplars and the future consumers

Mechanical results are [CN R2] (the command strings above, read-only, over the five clones that carry Bazel files) plus the dive's exemplar table [RS Exemplar evidence].

**Satisfied**

| Rule | Exemplar |
|---|---|
| 02 bzlmod, Bazel 8+ | `bazelbuild/rules_swift@50450ed24dde:MODULE.bazel:3-8` (`>=8.0.0`, compatibility level 3) |
| 04 `CC=clang` in the rc | `rules_swift@50450ed24dde:.bazelrc:47` (`common:linux --repo_env=CC=clang`); K4 empty |
| 05 hermetic, both families registered | `rules_swift@50450ed24dde:MODULE.bazel:257-260,269-287`, as `dev_dependency` (`:256`); H2 empty. It pins inline (`:259`, `swift_version = "6.4.0"`), so H1 fires and the repo ships no `.swift-version` |
| 06 worker sandboxing | `rules_swift@50450ed24dde:.bazelrc:31`, Windows exception `:54`; K7 empty |
| 07 first-party scoped gate (equivalent form) | `realm/SwiftLint@ec4691d9e813:bazel/copts.bzl:5` (`-warnings-as-errors` in a per-target `COPTS` list, so third-party modules are untouched); W1 empty |
| 09 two-element `copts` | `SwiftLint@ec4691d9e813:bazel/copts.bzl:4-26` (`ExistentialAny`, `MemberImportVisibility`, `InferIsolatedConformances` among 9 features); U1 empty |
| 18 Swift Testing under `swift_test` | `rules_swift@50450ed24dde:test/fixtures/xctest_runner/BUILD:87-103`, `tools/test_discoverer/TestDiscoverer.swift:120-137` |
| 21 rspm bridge | `tuist/tuist@2f6ac74754bf:swifterpm/MODULE.bazel:27-37` (`from_package(declare_swift_package = False, resolved = "//third_party/nio:Package.resolved", ...)` at `:27-31`); it builds `swiftpkg_swift_subprocess`, `swiftpkg_path` and `swiftpkg_filesystem` through rspm |

**Violated (prominent)**

| Rule | Exemplar and line | Check |
|---|---|---|
| 04 shell-level `CC` | `SwiftLint@ec4691d9e813:.github/actions/bazel-linux/action.yml:30` (`echo "CC=clang" >> $GITHUB_ENV`) and `.github/workflows/release.yml:156`; `swiftlang/swift-syntax@be549876fe91:.github/workflows/pull_request.yml:42` | K4 fires on SwiftLint and swift-syntax; it also fires on tuist `swifterpm`, an Apple-host build (`apple_cc_configure`, `MODULE.bazel:17-21`), where the rule binds only if it builds on Linux |
| 06 no worker sandboxing | SwiftLint (`.bazelrc` 715 B, no flag), swifterpm, swift-syntax | K7 fires on all three; only rules_swift sets it |
| 02 `rules_swift` below 4.x | SwiftLint `MODULE.bazel:15` (3.6.1, `max_compatibility_level = 3`) with `bazel_compatibility = [">=7.0.0"]` at `:6` while `.bazelversion` is 9.x; swifterpm `MODULE.bazel:9,11-15` (rspm 1.18.1, rules_swift 3.6.1, `.bazelversion` 8.7.0) | reading; works only because 4.2.1 keeps compatibility level 3 |
| 03 deprecated aggregate load | `SwiftLint@ec4691d9e813:BUILD:5` (5 hits); `tuist@2f6ac74754bf:swifterpm/BUILD.bazel:1`; `swift-syntax@be549876fe91:utils/bazel/opt_wrapper.bzl:20` (2 hits); the ruleset's own examples a consumer copies: `rules_swift@50450ed24dde:examples/embedded/BUILD.bazel:2`, `examples/runfiles/BUILD:1`, `test/linux_static_stdlib/BUILD:3` | L1a; the dive's "rules_swift's own targets load per-rule files" holds for the rules and not for `examples/` and `test/` |
| 07 no Swift warnings gate | `rules_swift@50450ed24dde:.bazelrc:27` is the C++ feature (right for its vendored C++ tools); no exemplar sets `swift.treat_warnings_as_errors`; swifterpm and swift-syntax have no Swift gate at all | W2 hits rules_swift; W1 fires on swifterpm and swift-syntax |
| 08 mode 5 everywhere | no consumer exemplar sets `swift.enable_v6` (SwiftLint, swifterpm, swift-syntax) | E6 fires on all three |
| 10 no `StrictLanguageFeatures` | SwiftLint `bazel/copts.bzl:4-26` lists 9 upcoming features and no guard, so a misspelt name would be silent | W4 fires on SwiftLint |
| 05 doc contradicts its repo | `doc/standalone_toolchain.md` quickstart registers `*_embedded_*` only; the repo's own `MODULE.bazel:269-287` registers both | [RS §4] |

**New commitments for the future fleet** (no fleet repository declares `rules_swift`; the fleet has no Swift code, so BZL-SWIFT-01 makes SwiftPM the default for all three consumers):

- *Swift SDK wrapping `ocx`.* If a Bazel build is ever added, the core is a `swift_library` with `module_name`, `package(features = SWIFT_FIRST_PARTY_FEATURES)` and a `swift_test` of Swift Testing files; the recorded-fixture directory goes in `data` and is read through the 19 helper; the swift-subprocess dependency comes through rspm (tuist builds exactly that closure, `swifterpm/MODULE.bazel:27-37`). The fake-CLI-in-`data` path is the open item.
- *Swift CLIs in the ocx/grimoire mould.* `swift_binary` with `main.swift`; the exit-code and stream contract is SW-CLI and stays with SwiftPM tests. Static musl and cross builds are not covered here (M-O-08): release stays the SwiftPM static Linux SDK recipe in `swift-package`'s release depth file.
- *OCI tooling in the `apple/containerization` mould.* No Bazel in the exemplar; nothing new.
- *General adopters of the published set.* The `bazel-quality` depth file `swift.md` ships framed "if you adopt Bazel for Swift", never a bundle member, with a routing row and keywords `rules_swift`, `swift_library`, `swift_binary`, `swift_test`, `swift.toolchain`, `rules_swift_package_manager`, `swift_deps`, `swiftpkg`, `swift.enable_v6` [RS §10]; `publish.toml [rules.bazel-quality]` 0.3.0 to 0.4.0 (owner Q8 default). Authoring edits the dive listed and this pass re-read: routing row in `rules/bazel-quality.md`, the Siblings line (add `swift-quality`), `docs/bazel-quality.md` count ("fourteen" at `docs/bazel-quality.md:4`, 14 files in the directory, so fifteen), and the stale comment at `publish.toml:248-258` ("twelve depth files ... four by language"). The depth files do not point at each other, so BZL-SWIFT cites SW-* and the core BZL-* families, not `cpp.md`; `cpp.md` already uses `package(features = ["layering_check"])` as a per-package rollout (BZL-CC-11), the precedent for 07-11.

## AI-agent failure modes

Ranked by how often an agent is likely to hit them, each with its mechanical check. The first five are the ones to put in the depth file's "What Agents Get Wrong Here".

1. **Writes a WORKSPACE** with `http_archive(name = "build_bazel_rules_swift", ...)`, `swift_rules_dependencies()`, or loads `@build_bazel_rules_swift//swift:swift.bzl`. Training data predates bzlmod. Check: B2, B3, L1a, L1b (02, 03); `bazel build --nobuild //...`.
2. **Forgets `CC=clang` on Linux, or exports it in a CI step only.** Check: K4 (04); the clean-checkout build with `CC` unset.
3. **Promotes warnings or features workspace-wide** (`build --features=...`, as the dive recommended) and then breaks every rspm dependency; or uses the unprefixed C++ feature and gets a false green. Check: W1, W2, and the canary with a third-party warning present (07, 09, 10).
4. **Invents feature names** (`swift.enable_swift6`, `swift.strict_concurrency`, `swift.warnings_as_errors`): ignored silently, target stays in mode 5. Check: E6 and the aquery awk (08).
5. **Copies the doc quickstart**: registers the `*_embedded_*` toolchains, writes `swift_version = "6.2.4"` or a patch version outside the bundled list. Check: H1, H2 (05).
6. **Omits `module_name`** and imports the target name. Check: the `attr(module_name, '^$', ...)` query (14).
7. **Uses `Bundle.module` or `resources:` in a `swift_test`**, or sets `discover_tests = False` to silence a "no tests discovered" error. Check: `bazel test //...`; the `attr(discover_tests, 0, ...)` query (18, 19).
8. **Writes XCTest for new tests** because the rule docs describe XCTest only. Check: the SW-TEST-01 diff grep; `swift_test` runs Swift Testing (18).
9. **Edits `Package.swift` and runs only `bazel build`**; the stale `Package.resolved` builds green. Check: `swift package resolve` plus `git diff --exit-code` (21).
10. **Adds Bazel files to a SwiftPM-only repository** to be helpful. Check: P1 returns nothing before the change (01).
11. **Joins flags in `copts`** (`"-enable-upcoming-feature ExistentialAny"`). Check: U1 (09).
12. **Names the entry file `Main.swift` or `App.swift`** with top-level code. Check: `bazel build //...` (16).
13. **Treats a green `bazel build //...` as proof tests ran**; `swift_test` runs only under `bazel test` (BZL-TEST).
14. **Hand-writes a `genrule` running `swiftc`/`swift build`**, or feeds Swift sources to `cc_binary`. Check (reading heuristic, not run): `grep -rn --include='BUILD.bazel' --include='BUILD' -e 'swiftc' -e 'swift build' .`.
15. **Enables `swift.debug_module_path` "to speed up debugging"** on Linux. Check: D1 (13).
16. **Builds a `swift_library` directly for iOS** or assumes Linux CI covers Apple targets (23, `unverified: read only`).
17. **Runs `bazel` with a different `swift` on PATH than CI** (host toolchain drift). Check: reading heuristic (22).

## Open questions

**Owner decisions** (the program applies the default until told otherwise):

- **Q-B1. Gate scope.** Default: package-scoped `SWIFT_FIRST_PARTY_FEATURES` (07-11); the rc-level `build:ci --features=` form only for a workspace with no external Swift code. This overrules the dive's recommendation (C1). The cost: every first-party BUILD file carries one `package(features = ...)` line.
- **Q-B2. Does the fleet adopt Bazel for a Swift SDK or CLI?** Default: no; SwiftPM and `Package.swift`, with this file binding only on opt-in (01).
- **Q-B3. Bazel range.** Default: rule text says 8.x or 9.x; Bazel 10, 9.3.0 and 8.8.1 are named `unverified`, not forbidden.
- **Q-B4. Publish plumbing.** Default (owner Q8): ship `rules/bazel-quality/swift.md`, bump `publish.toml [rules.bazel-quality]` 0.3.0 to 0.4.0, fix the stale "twelve depth files" comment and the docs count while there.
- **Q-B5. Windows `--noworker_sandboxing` leg.** Default (owner Q7): `unverified: read only`.

**Subareas that deserve another round**

1. **rules_swift_package_manager against a realistic closure** (highest value): swift-argument-parser, swift-subprocess, swift-log, swift-nio (C targets, plugins), with tools-6 manifests. Question: which `-swift-version` and features does the generator emit for a tools-6.x manifest, does the package-scope policy of 07-10 still isolate them, and which packages need `configure_package` patches. Only a tools-5.9 path dependency and swift-log were built here.
2. **Static and cross builds (M-O-08).** Question: can `swift_binary` produce the static musl Linux CLI that the SwiftPM static Linux SDK recipe ships, using the hermetic extension's SDK tags (`swift.wasm_sdk()`, `swift.android_sdk()`), and what does `swift.static_stdlib` do under `swift_test`?
3. **Macros and compiler plugins.** Question: `swift_compiler_plugin` with swift-syntax through rspm (prebuilts, pin policy), and whether the rules above hold for plugin targets.
4. **Attributes the topic map named but the dive did not run**: `swiftc_inputs` and `$(location)` expansion in `copts`, `swift_import`, `swift_interop_hint`, `mixed_language_library`, `swift_proto_library`.
5. **Test runtime under Bazel.** Question: a spawned fake CLI in `data` found through runfiles (SW-TEST-15, SW-TEST-20), `--test_filter` for Swift Testing ids, sharding, coverage reading and sanitizers; only fixture-file lookup was measured.

## Sub-artifacts

- [swift-bazel/rules-swift.md](swift-bazel/rules-swift.md) - rules_swift 4.2.1 under Bazel: when to adopt, versions, toolchain registration and `CC=clang`, `swift_library` attributes, the feature map to SW-GATE/SW-PKG/SW-TEST, `swift_test` with Swift Testing, rules_swift_package_manager, docs-versus-code drift, 25 candidate rules and verification runs V01-V25 and G1-G17, measured on Bazel 8.8.0 and 9.2.0 with Swift 6.4 and 6.3.

## Key sources

1. https://raw.githubusercontent.com/bazelbuild/rules_swift/4.2.1/README.md - supported Bazel table, `CC=clang`, rspm pointer.
2. https://raw.githubusercontent.com/bazelbuild/rules_swift/4.2.1/MODULE.bazel - `bazel_compatibility`, `compatibility_level`, the ruleset's own toolchain registrations.
3. https://raw.githubusercontent.com/bazelbuild/rules_swift/4.2.1/doc/standalone_toolchain.md - the hermetic `swift.toolchain` guide (the quickstart is the stale part).
4. https://raw.githubusercontent.com/bazelbuild/rules_swift/4.2.1/doc/rules.md - generated rule reference (`alwayslink` default drift).
5. https://raw.githubusercontent.com/bazelbuild/rules_swift/4.2.1/.bazelrc - CC, worker sandboxing, the C++ `treat_warnings_as_errors`.
6. https://github.com/bazelbuild/rules_swift/releases/tag/4.2.1 - "compatible with Bazel 8.x LTS, 9.x LTS, and rolling releases".
7. https://raw.githubusercontent.com/bazelbuild/bazel-central-registry/main/modules/rules_swift/4.2.1/presubmit.yml - the BCR matrix (8.x, 9.x, rolling; `CC: clang`).
8. https://raw.githubusercontent.com/bazelbuild/bazel-central-registry/main/modules/rules_swift/metadata.json - version list, 4.2.1 latest.
9. https://raw.githubusercontent.com/cgrindel/rules_swift_package_manager/main/README.md - rspm quickstart and Linux notes (1.25.0).
10. https://raw.githubusercontent.com/cgrindel/rules_swift_package_manager/main/MODULE.bazel - rspm declares `rules_swift` 3.6.0 with `max_compatibility_level = 3`.
11. https://www.swift.org/blog/module-tracking-in-debug-info/ - `-debug-module-path`, what build systems may drop in 6.4.
12. https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0443-warning-control-flags.md - SE-0443, basis of `swift.werror.*`.
13. https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0461-async-function-isolation.md - SE-0461, `NonisolatedNonsendingByDefault`.
14. https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0466-control-default-actor-isolation.md - SE-0466, `-default-isolation MainActor`.
15. https://raw.githubusercontent.com/swiftlang/swift-testing/main/Documentation/ABI/JSON.md - the JSON ABI `SwiftTestingRunner` drives.

## Consolidation runs

All under `~/.cache/research-lang/swift-tools/fixtures/swift-bazel/`; logs in `logs/`. Wrapper `run.sh <bazel> <dir> -- <bazel args>` runs Bazel inside `rs-fixture-swift-gcc:6.4` (Swift 6.4 plus gcc, `CC=clang`) with output root `~/.cache/research-lang/swift-tools/build/swift-bazel-6.4`; `b.sh <bazel> <dir> <label> [flags] -- <targets>` is `bazel build` with the label as log name; `t.sh` is the same for `bazel test --test_output=errors`. "Red" = the violation, "Green" = the compliant twin. Bazel exit codes (1 build failure, 3 test failure). Swift 6.4 only; 9.2.0 where marked. The `local/` fixture accumulated edits in the order listed, so a re-run must follow that order (its `Vendored/Package.swift` ends with the dead feature name used by R4's strict rows).

| ID | Command (verbatim shape) | Result |
|---|---|---|
| R1 | `greps/run.sh` (19 command strings above x 8 trees: `bad` all violations, `good` host-toolchain compliant, `good2` same flags in an imported `ci.bazelrc`, `hermetic`, `hermetic_bad` inline version plus embedded-only plus unprefixed BUILD feature, `repo_named` WORKSPACE-era load with `repo_name` set, `norc` rules_swift and no rc file, `none` SwiftPM-only), `greps/mk.sh` builds the trees | Red (hit or sentence) on `bad` for P1 B1 B2 B3 L1a L1b K4 K7 W1 W2 W3 E6 W4 U1 U2 I1 D1; `hermetic_bad` for H1 H2 (exit 123) W2; `norc` for K4 K7 W1 E6; empty on `good`, `good2`, `hermetic`, `repo_named` for every check except P1 (which hits on every tree that declares rules_swift); P1 exit 1 on `none`. `logs/greps-run.txt` |
| R2 | `greps/exemplars.sh`: the same strings over `rules_swift`, `SwiftLint`, `tuist/swifterpm`, `swift-syntax`, `swift-protobuf` | see Applied; swift-protobuf all empty (no `MODULE.bazel`); rules_swift hits P1 (a nested test module), L1a (14 lines), W2 `.bazelrc:27`, and W4 on its own sources. `logs/exemplars-run.txt` |
| R3 | the dive's `grep -rL --include='.bazelrc' -e 'worker_sandboxing'` (G5), `-e 'CC=clang'` (G9), `-e 'swift.werror.StrictLanguageFeatures'` (G6) over the same trees | `norc`: exit 1, no output for all three (false pass); `good2`: prints `./.bazelrc` for all three (false positive); G9 on `hermetic`: prints `./.bazelrc` (false positive) |
| R4 | `local/` (rspm path dependency `Vendored` with a never-mutated `var`, a mutable global, a `public` function exposing a type from an internal import, a dead upcoming-feature name; first-party `fp`, `fp2`, `fp3`, `fp4` packages): `b.sh 8.8.0 local <label> [flags] -- <targets>` | `plain //:app` 0 (dependency warning stays a warning). `--features=swift.treat_warnings_as_errors //:app` **1** (8.8.0 and 9.2.0) `Vend.swift:2:9: error: variable 'x' was never mutated`. `//fp:fp` (package gate) 1, `//fp:fp_clean` 0, `//fp:fp_clean //:app` 0 (both versions). `--features=swift.enable_v6 //:app` 0; generated `copts = [..., "-swift-version", "5"]`. `--features=swift.upcoming.InternalImportsByDefault //:app` **1** `error: function cannot be declared public because its result uses an internal type`; `//fp2:bad` (package-scoped) 1, `//fp2:good //:app` 0. `--features=swift.werror.StrictLanguageFeatures //:app` **1** `'NoSuchFeatureX' is not a recognized upcoming feature`; `//fp3:typo` (package guard, `ExistentialAnyy`) 1, `//fp3:right //:app` 0, same typo without the guard 0. Shared list in `features.bzl`: `//fp4:warn` 1, `//fp4:mutable_global` 1 `[#MutableGlobalVariable]`, `//fp4:clean //:app` 0. Global `--features=swift.layering_check_swift` and `swift.layering_check_unused_deps` on `//:app` 0. aquery mode-5 count: `//fp4/...` 0 of 3, `//fp/...` 2 of 2 |
| R5 | `feat/` (rules_swift only): `b.sh 8.8.0 feat <label> [flags] -- //:<target>` | `leaky_plain` 0, `leaky_miv` **1** `instance method 'ext()' is not available due to missing import of defining module 'Ext' [#MemberImportVisibility]`, `ok_miv` 0; `api_plain` 0, `api_iibd` **1**, `api_iibd_ok` 0; `warn_plain` 0, `--features=treat_warnings_as_errors` 0 (false green), `--features=swift.treat_warnings_as_errors` 1, clean twin 0; `layer_viol` off 0, `--features=swift.layering_check_swift` 1 `Layering violation in @@//:layer_viol`; aquery mode-5: `//:v6_ok` 0, `//:v6_typo` 1, `//...` 15 of 16, `--features=swift.enable_v6` 0 |
| R6 | `res/` (`swift_test` of Swift Testing files, fixture `Fixtures/cli/case1/stdout`): `t.sh 8.8.0 res <label> -- //:<target>` (and 9.2.0) | `bundle_module` **1** `type 'Bundle' has no member 'module'` (both versions); `cwd_rel` (with `data`) 0; `cwd_rel_nodata` 3 `NSCocoaErrorDomain Code=260`; `filepath` 0; `runfiles_env` 0; `showpaths` 0, prints `FILEPATH=Tests/ShowPaths.swift`, `CWD=.../showpaths.runfiles/_main`, `TEST_WORKSPACE=_main`; `dual_defined` (`local_defines = ["BAZEL_BUILD"]`) 0 (both versions); `dual_undefined` 1 `Bundle.module` |
| R7 | `run.sh swiftc -typecheck <define> G.swift` (`#if !FLAG` / `#error`); `b.sh 8.8.0 feat def_*` | `-DFLAG` 0; `-DFLAG=1` 1 (`warning: conditional compilation flags do not have values in Swift`, then `FLAG not defined`); no define 1; rules_swift `local_defines = ["FLAG"]` 0, `["FLAG=1"]` 0, none 1 |
| R8 | `run.sh 8.8.0 local -- mod graph --depth=1 \| grep -e 'rules_swift@4\.'`; the same on `local2` (root without the `rules_swift` dependency; `--depth=2` for the tree) | `local`: `├───rules_swift@4.2.1` (hit); `local2`: empty, and the depth-2 tree shows `rules_swift_package_manager@1.25.0` then `rules_swift@3.6.0` |
| R9 | `run.sh 8.8.0 feat -- query "attr(module_name, '^$', kind(swift_library, //...))"`; `attr(alwayslink, 0, ...)`; `run.sh 8.8.0 res -- query "attr(discover_tests, 0, kind(swift_test, //...))"` | `//:unset-name`; `//:no_always`; `//:nodiscover`; control on `//:Base` 0 lines |

Re-read, not run: `swift_release_metadata.json` platform keys for 6.4.0; the rules_swift line citations in Applied (`.bazelrc:27,31,47,54`, `MODULE.bazel:3-8,255-260`, `swift_binary.bzl:69-90`, `features.bzl:343-382`, `compile_config.bzl:1385-1400`, `swift_toolchain.bzl:694`).
