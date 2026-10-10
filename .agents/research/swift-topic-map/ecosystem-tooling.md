---
title: Swift ecosystem and tooling landscape (SwiftPM, build, release, CI, platforms, Bazel, codegen, docs, observability)
corpus: ECOSYSTEM AND TOOLING
agent: landscape scout (research-lang swift)
model: sonnet
date_researched: 2026-10-10
sources_count: 46
scope: |
  SwiftPM 6.x and Swift Build, PackageDescription settings, compiler diagnostic groups, CI reusable workflows, release and distribution (static/Wasm/Android SDKs, SBOM, registry), formatters and linters, Bazel rules_swift, Tuist/XcodeGen, DocC, sourcekit-lsp, codegen plugins, logging/lifecycle/tracing, plus the boring runtime behaviours that bite CLIs and servers.
  Swift 6.4.0 (released 2026-09-14) is the baseline. Measured claims ran in the `swift:6.4` Docker image on Linux x86_64 (Ubuntu 26.04, glibc 2.43) on 2026-10-10. Apple-only items (Xcode 27, WWDC26) are read-only and flagged.
  Exemplar corpus: 40 repos, cited as `<repo>@<sha12>:<path>:<line>`.
---

# Swift ecosystem and tooling landscape

Date researched: 2026-10-10. Version-specific claims carry their version. "Measured" means I ran it in the `swift:6.4` container; "read" means I fetched the primary source.

## Table of contents

1. [Summary](#summary)
2. [Survey](#survey)
3. [Candidate topics](#candidate-topics)
4. [Recent shifts seen in this corpus](#recent-shifts-seen-in-this-corpus)
5. [Contested](#contested)
6. [Sources](#sources)

## Summary

- ALREADY COVERED: nothing. No sibling lore set targets Swift. Generic docs/CI/Bazel-core topics sit in docs-quality, code-docs and bazel-quality, and are marked partial below.
- Swift 6.4.0 shipped 2026-09-14 (blog post dated 2026-09-15) with Xcode 27.0. Swift 6.3.3 shipped 2026-06-29, 6.3 on 2026-03-24, 6.2 on 2025-09-15. Pairing: 6.4 = Xcode 27, 6.3.x = Xcode 26.4-26.6, 6.2 = Xcode 26.
- The frame's claim "6.4.0 dropped the Android SDK" is FALSE. `releases.json` lists an Android SDK under 6.4.0 (built against NDK r30 LTS). It first appeared in the 6.3 platform list. 6.4 did drop Fedora 39 and Amazon Linux 2.
- SwiftPM 6.4 defaults to the Swift Build engine (`--build-system swiftbuild`; `native` and `xcode` are deprecated). Output paths move, so agents must use `swift build --show-bin-path`, never a hard-coded `.build/<triple>/release`.
- `--static-swift-stdlib` on glibc under Swift Build failed to link (undefined `swift_unum*`, `_FoundationCollections.BigString`) with FoundationEssentials; it linked with `--build-system native`. Measured 2026-10-10 on 6.4.
- `--explicit-target-dependency-import-check error` did NOT diagnose an undeclared transitive import under either engine (matches known issue swift-package-manager#9620). Do not write a rule that trusts it.
- `unsafeFlags` no longer blocks version-based consumption for tools-version >= 6.2 (`PackageBuilder.swift:1073`). The old "unsafeFlags makes a package unusable as a dependency" advice is invalidated for 6.2+ manifests. swift-log (tools 6.2) ships `-require-explicit-sendable` via unsafeFlags.
- Warning control moved into the manifest and language: `.treatAllWarnings(as:)` / `.treatWarning(_:as:)` (6.2, SE-0480), CLI `-Werror <Group>` (6.1, SE-0443), and `@diagnose(Group, as:, reason:)` (6.4, SE-0522). Blanket `-Xswiftc -warnings-as-errors` also fails on warnings inside local path dependencies (measured).
- The 6.4 `swift package init` template writes `// swift-tools-version: 6.4`, uses Swift Testing, and adds `.enableUpcomingFeature("ApproachableConcurrency")` to library, executable AND test targets. Zero of 40 exemplar manifests use `ApproachableConcurrency` or `defaultIsolation`; 20 use `MemberImportVisibility`, 15 `ExistentialAny`, 12 `InternalImportsByDefault`. Agents must not copy template defaults blindly into libraries.
- H5 mostly holds: of 38 manifests with a resolvable state, 10 track `Package.resolved`, 23 ignore it, 5 have none. The trackers are apps, CLIs and the pointfreeco libraries.
- H4 partly holds: `.swift-format` is in 24 of 40 repos, `.swiftformat` in 7, root `.swiftlint.yml` in 4. Running two formatters on the same tree fights: swift-format output then SwiftFormat then `swift format lint --strict` gave 2795 findings versus 0 (measured).
- H6 holds and is stronger than predicted: Windows CI in 20 of 40, static-SDK CI in 15, Wasm in 15, Android in 13. `swiftlang/github-workflows` (latest tag 0.0.15, 2026-08-24) is the shared gate in 22 repos.
- H8 supported at manifest level: `defaultIsolation` appears in 0 manifests. Default-MainActor is an application decision, and the template's `ApproachableConcurrency` sets library authors a trap.
- Release portability bites: a binary built in the 6.4 image (Ubuntu 26.04) needs `GLIBC_2.43` and fails on older hosts. The static musl SDK gave a 10.3 MB stripped FoundationEssentials hello and a 55.6 MB stripped Foundation+DateFormatter CLI (137 MB unstripped). Wasm hello 17 MB, Embedded wasm hello 42.6 KB.
- Boring runtime behaviours measured: SIGPIPE is not ignored (exit 141, cleanup skipped); `fatalError` exits 132 and redirected stdout was lost; Dictionary/Set order is per-process random unless `SWIFT_DETERMINISTIC_HASHING=1`; `JSONEncoder` default is unsorted and escapes `/`; `Locale.current` in containers is `en_001`.
- Registry/SBOM/signing exist but are young: `--sbom-spec` (CycloneDX 1.7, SPDX 3.0.1) writes under `out/Products/<cfg>/sboms/` (not where the help says) and is not reproducible. `--resolver-fingerprint-checking` defaults to strict; signing-entity checking defaults to warn.
- Bazel: rules_swift 4.2.1 (2026-10-09) targets Bazel 8-10 with bzlmod, has a hermetic `swift.toolchain(swift_version_file = ".swift-version")` extension, and build systems should drop `-modulewrap`/`-add_ast_path` and pass `-debug-module-path`.
- Stale docs are a hazard: swiftlang/github-workflows README lists Swift 5.9-6.2 while the workflow defaults run 6.1-6.4 plus nightlies; its Android NDK defaults (`r27d`, `r28c`) disagree with the swift.org page (NDK r30 LTS).
- Tuist's own `cli/AGENTS.md` tells agents to use `tuist generate` + `xcodebuild`, not `swift test`. Tuist is the only exemplar with a `skills/` directory of SKILL.md files.

## Survey

### 1. Release metadata: swift.org install API and blog

[`releases.json`](https://www.swift.org/api/v1/install/releases.json) (read 2026-10-10) is machine-readable and lists, per release, platforms and SDK checksums. 6.4.0: Ubuntu 22.04/24.04/26.04, Debian 12/13, Fedora 41, Amazon Linux 2023, UBI 9/10, Windows 10, Static SDK (0.1.0), Wasm SDK, Android SDK. swiftlang/github-workflows `install-and-build-with-sdk.sh` reads these checksums with `jq`. [Swift 6.4 released](https://www.swift.org/blog/swift-6.4-released/) (2026-09-15) names Embedded Swift generalization (`any`, untyped throws, metatypes), `@c`/`@implementation`, and Subprocess 1.0. Version-specific: Xcode pairing and dropped distros are 6.4 facts.

### 2. SwiftPM 6.x docs and source

Read from swift-package-manager@5546f44a3b52 (main, tools "6.5"): `Sources/PackageManagerDocs/Documentation.docc/ReleaseNotes/{6.3,6.4,6.5}.md`, `ContinuousIntegration.md`, `GeneratingSBOMs.md`, `PackageSecurity.md`, `Dependencies/PackageTraits.md`, `Plugins.md`, `CHANGELOG.md`.

- Engine: Swift Build is the 6.4 default (`--build-system swiftbuild`, forum announcement by Owen Voorhees, 2026-03-24, PR #9661). Release-note known issues: SDK-generator Linux SDKs ([#10006](https://github.com/swiftlang/swift-package-manager/issues/10006)), `--explicit-target-dependency-import-check` ([#9620](https://github.com/swiftlang/swift-package-manager/issues/9620)), swift-java + build plugins ([#10060](https://github.com/swiftlang/swift-package-manager/issues/10060)). Differences: different output location (`--show-bin-path`), one test runner per test target, stricter `--static-swift-stdlib`.
- Subcommands (6.4): `add-dependency`, `add-product`, `add-target`, `add-target-dependency`, `add-setting`, `add-target-plugin`, `migrate` (`--target`, `--to-feature`), `generate-sbom`, `diagnose-api-breaking-changes`, `dump-symbol-graph`, `dump-package`, `show-traits`, `show-dependencies`, `show-executables`, `tools-version`, `compute-checksum`, `archive-source`, `experimental-install`, `experimental-uninstall`, `config`, `edit`, `purge-cache`, `reset`, `resolve`, `update`, `describe`, `init`, `plugin`. `init --type` values: library, executable, tool, build-tool-plugin, command-plugin, macro, empty.
- Build flags: `--sanitize` (address, thread, undefined, scudo, fuzzer), `--traits`/`--enable-all-traits`/`--disable-default-traits`, `--sbom-spec` (cyclonedx, spdx, cyclonedx1, spdx3), `--sbom-output-dir`, `--static-swift-stdlib`, `--enable-experimental-strip-products`, `--force-resolved-versions`, `--resolver-fingerprint-checking` (default strict), `--resolver-signing-entity-checking` (default warn), `--enable-experimental-prebuilts` (prebuilt swift-syntax for macros).
- Test flags: `--parallel`, `--filter`, `--skip`, `--list-tests`, `--enable-code-coverage`, `--xunit-output`, `--attachments-path`, `--repeat-until` with `--maximum-repetitions`, `--debugger` (6.4), `--enable-xctest`/`--enable-swift-testing`. HTML coverage (SE-0501) is 6.5.
- `swift sdk`: `install` (`--checksum` required for remote URLs), `list`, `remove`, `configure`.

### 3. PackageDescription API

Read `Sources/Runtimes/PackageDescription/{BuildSettings,Target,Trait,PackageDependency,SupportedPlatforms}.swift`@5546f44a3b52.

- SwiftSetting: `define`, `unsafeFlags`, `enableUpcomingFeature` (5.8), `enableExperimentalFeature` (5.8), `strictMemorySafety` (6.2), `interoperabilityMode` (5.9), `swiftLanguageMode` (6.0; `swiftLanguageVersion` deprecated), `treatAllWarnings(as:)`/`treatWarning(_:as:)` (6.2, SE-0480), `defaultIsolation(MainActor.self | nil)` (6.2, SE-0466), `bridgingHeader(_:visibility:)` (6.5).
- `BuildSettingCondition.when(platforms:configuration:traits:)` (traits 6.1). `Package.swiftLanguageModes`, `Package.traits` (6.1). Platform constants `.v26`, `.v27` (27 added in 6.4).
- Dependency forms: `from`, `exact`, `branch`, `revision`, ranges, `path`, registry `id:`; each takes `traits: Set<Trait> = [.defaults]`.
- SE-0540 Default Target Settings (accepted with modifications): `defaultSwiftSettings`, `defaultCSettings`, `defaultCXXSettings`, `defaultLinkerSettings`, and a `.defaults` placeholder. Not in 6.4.
- Other proposals: SE-0500 templates (accepted), SE-0511 `add-target-plugin` (6.4), SE-0541 flexible Swift/C interop (Swift Next), SE-0542 conditional plugin (review), SE-0547 compilation caching (accepted w/ modifications), SE-0549 proxy configuration (review), SE-0534 exact literal version matching (rejected), SE-0536 registry search (accepted w/ modifications), SE-0554 `#if deploymentTargetAtLeast(...)` (review through 2026-10-12).

### 4. unsafeFlags relaxation

`PackageBuilder.swift:1073`: `usesUnsafeFlags: manifest.toolsVersion >= .v6_2 ? false : ...`. Forum pitch by Doug Schaefer (2025-06-26); Ecosystem Steering Group supported it 2025-07-08; security objections (e.g. arbitrary Clang plugin loading) were raised. Measured: a fixture consuming swift-log 1.16.1 by version resolved and built. 10 of 40 exemplar manifests use `unsafeFlags`.

### 5. Traits (SE-0450) and Package.resolved

`PackageTraits.md`: traits are strictly additive and unified across the graph; `traits:` on a dependency replaces the defaults, so add `.defaults`; `default`/`defaults` are reserved names; mutually exclusive traits need `#error` guards; libraries should leave trait selection to applications. swift-log@4038b6a4f74a `Package.swift:11-73` defines `MaxLogLevelDebug/Info/Notice/Warning/Error/Critical/None`. 14 of 40 manifests use traits.

`Package.resolved` is format version 3 with `originHash`; `ResolvedPackagesStore` computes the hash from the root manifest's dependencies (`Workspace+Dependencies.swift:314`), mismatch triggers re-resolution. `--force-resolved-versions` turns it into a lockfile. Exemplar tally above.

### 6. Compiler features and diagnostic groups

Measured `swiftc -print-supported-features` on 6.4: 21 upcoming, 56 experimental, 2 optional (StrictMemorySafety, LibraryEvolution). 15 upcoming features are on in Swift 6 mode. Six are slated for language mode 7: ExistentialAny, InternalImportsByDefault, MemberImportVisibility, InferIsolatedConformances, NonisolatedNonsendingByDefault, ImmutableWeakCaptures. `ApproachableConcurrency` is not in that list but `InitPackage.swift:320` emits it and `hasFeature` probing shows it implies NonisolatedNonsendingByDefault, InferIsolatedConformances, InferSendableFromCaptures, DisableOutwardActorInference, GlobalActorIsolatedTypesUsability (SE-0540 discusses). Groups used with `-Werror <Group>`/`-Wwarning <Group>`: DeprecatedDeclaration, PerformanceHints (off by default), EmbeddedRestrictions, UnknownWarningGroup, VariableNeverMutated, StrictMemorySafety, ExplicitSendableAnnotations, CompilationCaching. `:migrate` mode exists on upcoming features. Fixtures: `swift package migrate --to-feature ExistentialAny` applied fix-its but rewrote the manifest with ugly inline `swiftSettings`; an unknown group only warns (`UnknownWarningGroup`) unless warnings-as-errors is on.

### 7. swiftlang/github-workflows

[swiftlang/github-workflows](https://github.com/swiftlang/github-workflows) tag 0.0.15 (2026-08-24). Read `swift_package_test.yml` (defaults: Linux `["6.1","6.2","6.3","6.4","nightly-main","nightly-6.4.x"]`, `linux_os_versions ["jammy"]`, `windows-2022`, macOS `swift_6.1..swift_6.4`, Android triples `*-linux-android28`, NDK `["r27d","r28c"]`; flags `enable_linux_checks` true, `enable_windows_checks` true, `enable_macos_checks` false, `enable_static_sdk_build`, `enable_wasm_sdk_build`, `enable_embedded_wasm_sdk_build`, `enable_android_sdk_build`, `enable_freebsd_checks` false), `soundness.yml`, `pull_request.yml`. Soundness checks: api_breakage (`diagnose-api-breaking-changes`, container `swift:6.3-noble`), docs (`generate-documentation --warnings-as-errors --analyze`, driven by `.spi.yml` `documentation_targets`), unacceptable_language, license_header, broken_symlink, format (`swift-format format --in-place` then `lint --strict --parallel` then `git diff --exit-code`), shell, yamllint, python_lint. Windows steps wrap with `Invoke-Program swift test` because PowerShell does not abort on failing subcommands. The README is stale (lists 5.9-6.2). 22 exemplar repos use it, pinned like `@0.0.15`; 10 repos reference apple/swift-nio shared workflows at `@main`.

### 8. Platforms: static, Wasm, Android, Windows, Linux

- Static Linux SDK ([guide](https://www.swift.org/documentation/articles/static-linux-getting-started.html)): musl; no dynamic linking, not even `dlopen`; the toolchain version must match exactly; checksum required; triples `x86_64-swift-linux-musl`, `aarch64-swift-linux-musl`; `import Musl` under `canImport(Musl)`; ships libxml2, curl, zlib, boringssl and an SPDX SBOM.
- Wasm SDK: `swift-6.4.0-RELEASE_wasm` and `..._wasm-embedded`; `swift run` uses WasmKit; Windows hosts unsupported; configure `.sourcekit-lsp/config.json` `swiftPM.swiftSDK`.
- Android SDK ([page](https://www.swift.org/documentation/articles/swift-sdk-for-android-getting-started.html)): NDK r30 LTS, `ANDROID_NDK_HOME`, `--triple x86_64-unknown-linux-android23`, `--static-swift-stdlib`, bundle `libc++_shared.so`.
- Windows: `winget install --id Swift.Toolchain`, VS Build Tools, Docker `6.4.0-windowsservercore-ltsc2022` only. SwiftLint builds on Windows since 0.64.0 but requires `\n` line endings.
- swiftly 1.2.0 (2026-09-22): Linux and macOS only. `.swift-version` file (shared with rules_swift), `swiftly init --assume-yes --skip-install`, `--post-install-file`, env `SWIFTLY_HOME_DIR`, `SWIFTLY_BIN_DIR`.
- Docker Hub `swift` tags: 6.4.0 variants resolute (26.04), noble, jammy, bookworm, trixie, amazonlinux2023, rhel-ubi9, rhel-ubi10, each with `-slim`. `6.4-noble-slim` ~105 MB, full ~1.3 GB. amazonlinux2 stops at 6.3.x.
- Embedded Swift 6.4: `-enable-experimental-feature Embedded`; `.treatWarning("EmbeddedRestrictions", as: .warning)`; a `weak` class property yields "attribute 'weak' cannot be used in Embedded Swift [#EmbeddedRestrictions]".

### 9. Measured fixtures (2026-10-10, swift:6.4 image)

P1 `swift build`/`swift test` run both XCTest and Swift Testing. P3 import check silent (see Summary). P4 `-Xswiftc -warnings-as-errors` failed on a local path dependency; remote dependencies get `SUPPRESS_WARNINGS` (PIF builder, `PackagePIFBuilder.swift:636`); `.treatWarning("DeprecatedDeclaration", as: .error)` maps to `-Werror DeprecatedDeclaration`. P5 DocC `--analyze --warnings-as-errors` caught a broken symbol link, a nonexistent `Parameter`, and a missing parameter doc. P6 SBOM files are `cyclonedx1-1.7-<pkg>-unknown-all-<UTC>.json` and `spdx3-3.0.1-...json` under `out/Products/<cfg>/sboms/`, with a random UUID `serialNumber` and a timestamp. P7 glibc 2.43 floor. P8 static SDK sizes (installed SDK 1.1 GB). P9 static-stdlib link failure; pure `print("hello")` static-stdlib build 8.9 MB works. P10 Wasm/Embedded sizes. P11 `fflush(stdout)` in Swift 6 mode errors "reference to var 'stdout' is not concurrency-safe because it involves shared mutable state"; `fflush(nil)` works. P12-P17 runtime behaviours (Summary). P14: "e\u{301}🇩🇪👨‍👩‍👧" gives count 3, unicodeScalars 9, utf8 29, utf16 14; `"Å" == "A\u{30a}"` is true with utf8 counts 2 and 3. P15: buffered stdout lost on `fatalError` when redirected to a file (0 bytes, twice), kept via pipe (13 bytes). P17: `1234.5.formatted()` is "1,234.5"; with `de_DE` "1.234,5".

### 10. Formatters and linters

- swift-format (swiftlang, `swift format` ships in the toolchain): `swift format dump-configuration` 6.4 defaults lineLength 100, indentation 2 spaces, `NeverForceUnwrap` false, `NeverUseForceTry` false, `AllPublicDeclarationsHaveDocumentation` false, `ValidateDocumentationComments` false, `multilineTrailingCommaBehavior` keptAsWritten, `reflowMultilineStringLiterals` "never". `swift format --configuration /dev/null` errors with a permission problem; pass a dump file.
- SwiftLint 0.65.1: 256 rules, 154 opt-in, 94 correctable, 5 analyzer, 12 use SourceKit. Concurrency rules: only `async_without_await`, `incompatible_concurrency_annotation`, `redundant_sendable`, `unhandled_throwing_task`. No `@unchecked Sendable` rule; no Swift Testing rules. SwiftLintPlugins build-tool plugin is community-maintained (works down to 5.9). Measured: default config findings on swift-log went 78 to 79 after swift-format.
- SwiftFormat 0.63.1 (2026-09-30): ~156 rules (113 on, 37 off, 6 deprecated); `preferSwiftTesting` (off), `redundantSendable` (off), `--locale` for deterministic sorting, `--swiftversion`. Measured: `--lint` flags 7/8 files on original swift-log and 8/8 on swift-format output.
- SwiftPM itself uses nicklockwood SwiftFormat; swiftlang repos mostly use swift-format.

### 11. Bazel, Tuist, XcodeGen

- rules_swift 4.2.1 (2026-10-09): Bazel 8-10, bzlmod. `swift_library` attrs `alwayslink` (default True), `defines` (propagates) vs `local_defines`, `private_deps`, `package_name`, `library_evolution`, `generates_header`, `plugins`. Extension `swift.toolchain(swift_version | swift_version_file = ".swift-version")`, platform keys xcode, ubuntu22.04/24.04, debian12, fedora39, amazonlinux2, ubi9 (not yet 26.04, UBI10, Debian 13); `swift.android_sdk()`, `swift.wasm_sdk()`. Linux needs `CC=clang`. Features: `swift.enable_v6`, `swift.layering_check_swift`, `swift.layering_check_unused_deps`, `swift.treat_warnings_as_errors`, `swift.debug_module_path`, `swift.static_stdlib`, `swift.enable_embedded`, `swift.thin_lto`, `swift.full_lto`. [Module Tracking in Swift Debug Info](https://www.swift.org/blog/) advises third-party build systems to drop `-modulewrap`/`-add_ast_path` and pass `-debug-module-path`. cgrindel/rules_swift_package_manager v1.25.0 (2026-09-21) reads `Package.resolved` via `swift_deps.from_package(resolved=...)`.
- Tuist 4.207.1 (canary 4.213.0): `Project.swift`, `Tuist.swift`, `Tuist/Package.swift`. `cli/AGENTS.md`: use `tuist generate` + `xcodebuild`, not `swift test`. `skills/skills/*/SKILL.md` exist (migrate, fix-flaky-tests). XcodeGen 2.46.0 (2026-07-16).

### 12. Docs and editor tooling

swift-docc-plugin 1.5.0 (2026-04-27): `swift package generate-documentation`, `--analyze`, `--warnings-as-errors`, `--transform-for-static-hosting`, `--hosting-base-path`, `--disable-indexing`, `preview-documentation`; `--allow-writing-to-directory` required for the sandbox; plugin README says previews need `--disable-sandbox`. Swift Package Index `.spi.yml` (`builder.configs[].documentation_targets`; decoded by [SPIManifest](https://github.com/SwiftPackageIndex/SPIManifest)). sourcekit-lsp@c6ce93d5f8aa `.sourcekit-lsp/config.json`: `swiftPM.{configuration,scratchPath,swiftSDK,triple,traits,swiftCompilerFlags,forceResolvedVersions,disableSandbox,buildSystem: native|swiftbuild}`, `backgroundIndexing` (default since 6.1), `backgroundPreparationMode`, `logging`, `defaultWorkspaceType`; the format is explicitly not stable.

### 13. Codegen, observability, server

- swift-openapi-generator 1.14.0: `openapi-generator-config.yaml` (`generate: [types, client, server]`, `accessModifier`, `namingStrategy: defensive|idiomatic`, `additionalFileComments`, `filter`, `typeOverrides`, `featureFlags`). Recommends the build plugin with generated code NOT committed (generated file names unstable); command plugin `generate-code-from-openapi`.
- swift-protobuf 1.38.1: `protoc-gen-swift`, `FileNaming`, `Visibility` (Internal/Package/Public), `UseAccessLevelOnImports`. grpc-swift-2 2.4.3.
- swift-log 1.16.1 (2026-10-07): task-local `Logger.current` and `withLogger(...)`; libraries must not construct `Logger(label:)`; libraries log at info or below (warning+ only for one-time startup). `Docs.docc/BestPractices/{001-ChoosingLogLevels,003-AcceptingLoggers}.md`.
- swift-service-lifecycle 2.12.1: `ServiceGroup`, `Service`; `gracefulShutdownSignals` and `cancellationSignals` default to `[]` (`ServiceGroupConfiguration.swift:140-143`), so SIGTERM is not handled unless configured.
- swift-distributed-tracing: separate guides for applications, libraries, tracer implementers. package-benchmark 1.37.0: `swift package benchmark`, `Benchmarks/` directory; swift-log keeps nested packages `Benchmarks/NoTraits`, `MaxLogLevelWarning`. Swift AWS Lambda Runtime 3.0 added SwiftPM plugins (init, build, deploy). Vapor 5 is beta (removes EventLoopFutures).

### 14. Registry, SBOM, SSWG, WWDC26

Registry (SE-0292): `scope.name` identities; `swift package-registry` set/login/publish/unset/logout; TOFU fingerprints in `~/.swiftpm/security/fingerprints`. SBOM (SE-0509): CycloneDX 1.7 or SPDX 3.0.1. [SSWG incubation process](https://www.swift.org/sswg/incubation-process.html): minimal bar needs SwiftPM, Linux unit tests, CI on PRs and main, semver with pre-release, Apache-2/MIT/BSD license, API Design Guidelines, a formatter in CI, SSWG security practices. Graduation needs 1.0, support for new GA Swift within 30 days, CI on the two latest Swift versions, macOS and Linux tests, documented release method, GOVERNANCE.md and ADOPTERS.md. Technical bar: non-blocking async APIs, force unwrap only as a commented precondition, no `Unsafe` outside C interop, avoid `fatalError`. WWDC26 (read-only, Apple): session 258 (Xcode 27 what's new) and 259 (Xcode, agents, and you); coding agents arrived in Xcode 26.3; I found no AGENTS.md/CLAUDE.md/skills mention in the Apple material. `anyAppleOS` availability appears in WWDC26 coverage.

### 15. 6.4 language and library items touching tooling

SE-0521 optional some/any, SE-0522 `@diagnose`, SE-0491 module selectors `::`, SE-0493 async defer, SE-0504 `withTaskCancellationShield`, SE-0506 Observation, SE-0507 borrow accessors, SE-0516 Iterable, SE-0517 UniqueBox, SE-0519 Ref/MutableRef, SE-0524 `withTemporaryAllocation`, SE-0525 RawSpan safe loading, SE-0527 UniqueArray, SE-0532 Optional noncopyable. Swift Testing ST-0021 interop, 0022 CustomTestReflectable, 0023 Transferable attachments, 0024 per-test repetition, 0029 issue metadata. Subprocess 1.0.

### 16. Exemplar adoption scan (40 repos, `Package.swift` and repo markers)

Tools versions: 6.4 x5, 6.3 x2, 6.2 x16, 6.1 x6, 6.0 x6, 5.9 x2, 5.7 x1, none x2. Features in manifests: MemberImportVisibility 20, ExistentialAny 15, InternalImportsByDefault 12, NonisolatedNonsendingByDefault 7, InferIsolatedConformances 7, explicit StrictConcurrency 7, `defaultIsolation` 0, `ApproachableConcurrency` 0, `strictMemorySafety` 3, `treatAllWarnings` 3, traits 14, plugins 12, macros 7, binaryTarget 1, systemLibrary 3, `unsafeFlags` 10, `.v5` language mode somewhere 12. Repo markers: `.spi.yml` 31, DocC catalogs 25. Ownership of the 40 counts excludes worktrees and sibling clones. H1: 35 of 38 manifests at tools >= 6.0, but 12 still carry `.v5`.

Fleet note: counts are from `/home/mherwig/.cache/research-lang/exemplars/swift/`, not from `/home/mherwig/dev`.

## Candidate topics

Coverage column: sibling sets do not target Swift; "partial" means a generic rule in docs-quality, code-docs or bazel-quality overlaps.

| # | Topic (question) | Why it matters | Source URL | Already covered? | Surface bound | Priority |
|---|---|---|---|---|---|---|
| 1 | Which `swift-tools-version` and `swiftLanguageModes` should a new package declare, and what does `swift package tools-version` report? | Template says 6.4; 16 of 40 exemplars sit at 6.2; floor sets feature availability | https://github.com/swiftlang/swift-package-manager (ReleaseNotes/6.4.md) | no | SwiftPM manifest | P0 - every new package hits it |
| 2 | Should a library keep the 6.4 init template's `ApproachableConcurrency` and `defaultIsolation`? | Template adds it to library and test targets; 0 of 40 exemplars use it; changes semantics for clients | https://github.com/swiftlang/swift-package-manager (InitPackage.swift:320) | no | SwiftPM + compiler flags | P0 - template drift silently changes isolation |
| 3 | Which upcoming features (MemberImportVisibility, ExistentialAny, InternalImportsByDefault, NonisolatedNonsendingByDefault) belong in a manifest, and how does `swiftc -print-supported-features` verify names? | 20/15/12/7 exemplars; six slated for mode 7 | https://www.swift.org/blog/swift-6.4-released/ | no | compiler + SwiftPM | P0 - adoption gap with known targets |
| 4 | How are `swiftSettings` shared across targets today, and what changes with SE-0540 `defaultSwiftSettings` in 6.5? | Repetition drift in manifests; SE-0540 not in 6.4 | https://github.com/swiftlang/swift-evolution (SE-0540) | no | SwiftPM manifest | P2 - version-gated, 6.5 not yet shipped |
| 5 | When is `unsafeFlags` acceptable, and does tools-version >= 6.2 lift the consumer restriction? | Old advice invalidated; 10 of 40 use it | https://github.com/swiftlang/swift-package-manager (PackageBuilder.swift:1073) | no | SwiftPM manifest | P1 - stale advice agents repeat |
| 6 | Should warnings-as-errors use `.treatWarning(group, as:)` or `@diagnose` rather than `-Xswiftc -warnings-as-errors`? | Blanket flag fails on path dependencies (measured); groups are the supported scope | https://github.com/swiftlang/swift-evolution (SE-0480, SE-0522) | no | SwiftPM + compiler | P0 - CI gate correctness |
| 7 | How do traits get designed and consumed (additive, `.defaults` on dependency, `#error` for exclusives)? | `traits:` replaces defaults; libraries must not pick traits | https://github.com/swiftlang/swift-package-manager (PackageTraits.md) | no | SwiftPM manifest | P1 - 14 of 40 use traits, pitfalls are silent |
| 8 | Should `Package.resolved` be committed, and how do `originHash` and `--force-resolved-versions` interact? | 10 track / 23 ignore / 5 absent; libraries vs apps differ | https://github.com/swiftlang/swift-package-manager (Workspace+Dependencies.swift:314) | no | SwiftPM + git | P1 - policy disagreement across the fleet |
| 9 | What does the Swift Build default engine change (`--build-system native`, `--show-bin-path`, per-target test runners)? | 6.4 moves output dirs; hard-coded `.build/...` paths break | https://forums.swift.org (Swift Build default announcement, 2026-03-24) | no | SwiftPM CLI | P0 - breaks scripts and CI |
| 10 | Can `--explicit-target-dependency-import-check error` be trusted to catch undeclared imports? | Measured: silent under both engines; known issue #9620 | https://github.com/swiftlang/swift-package-manager/issues/9620 | no | SwiftPM CLI | P2 - rule should say "do not rely" |
| 11 | Why does `--static-swift-stdlib` fail to link on glibc under Swift Build, and what is the workaround? | Measured undefined `swift_unum*`; works with `--build-system native` | https://github.com/swiftlang/swift-package-manager (ReleaseNotes/6.4.md) | no | SwiftPM CLI | P1 - reproducible release-build failure |
| 12 | Which reusable workflows gate a Swift package (`swiftlang/github-workflows` tag pin vs `apple/swift-nio` `@main`)? | 22 repos use swiftlang pins; 10 reference `@main` | https://github.com/swiftlang/github-workflows | partial (generic CI pinning in other sets) | GitHub Actions | P1 - supply-chain pinning choice |
| 13 | What must the soundness job check (api_breakage, docs, license_header, format, unacceptable_language)? | Shared gate defines the fleet baseline | https://github.com/swiftlang/github-workflows (soundness.yml) | partial | GitHub Actions | P1 - concrete verifiable list |
| 14 | Which Swift versions and distros belong in the CI matrix (6.1-6.4, nightly-main, jammy, windows-2022), and where do docs disagree? | README stale; NDK r27d/r28c vs r30 | https://github.com/swiftlang/github-workflows (swift_package_test.yml) | no | GitHub Actions | P1 - stale docs mislead agents |
| 15 | How does Windows CI run Swift tests (`Invoke-Program`, windows-2022, winget, no Wasm host)? | PowerShell swallows failures; 20 of 40 have Windows CI | https://www.swift.org/install/windows/ | no | Windows CI | P1 - silent green builds |
| 16 | How is API breakage checked (`swift package diagnose-api-breaking-changes <baseline>` and allowlist)? | Library semver gate; soundness runs it in `swift:6.3-noble` | https://github.com/swiftlang/github-workflows (soundness.yml) | no | SwiftPM CLI + CI | P1 - library release safety |
| 17 | How should `swift package migrate --to-feature X` be run and its manifest rewrite reviewed? | Measured: fix-its apply but manifest formatting is ugly | https://github.com/swiftlang/swift-package-manager (ReleaseNotes/6.4.md) | no | SwiftPM CLI | P2 - useful, but outcome needs a diff review |
| 18 | Which test flags matter (`--parallel`, `--filter`, `--skip`, `--enable-code-coverage`, `--sanitize`, `--repeat-until`)? | Flake hunting and coverage; HTML coverage is 6.5 | https://github.com/swiftlang/swift-package-manager (ReleaseNotes/6.4.md) | no | SwiftPM CLI | P2 - reference facts, easy to verify |
| 19 | How do release binaries stay portable (glibc floor, `-slim` runtime images, static musl SDK)? | Measured `GLIBC_2.43 not found` from the 6.4 image; slim 105 MB vs 1.3 GB | https://hub.docker.com/_/swift | no | release + Docker | P0 - deploy-time crash |
| 20 | What does the static Linux SDK forbid and cost (no `dlopen`, `import Musl`, exact toolchain match, `--checksum`, 10.3 vs 55.6 MB, stripping)? | Measured sizes; 15 of 40 exemplars test it | https://www.swift.org/documentation/articles/static-linux-getting-started.html | no | SDK + build | P1 - common CLI distribution path |
| 21 | How is an SBOM generated and consumed (`--sbom-spec`, output dir, non-reproducible UUID/timestamp)? | Help text path wrong; output varies run to run | https://github.com/swiftlang/swift-package-manager (GeneratingSBOMs.md) | no | SwiftPM CLI | P2 - young feature, narrow audience |
| 22 | What do registry commands and fingerprint/signing checks default to (`strict` vs `warn`)? | Security-relevant defaults; TOFU store location | https://github.com/swiftlang/swift-package-manager (PackageSecurity.md) | no | SwiftPM CLI | P2 - few exemplars use registries |
| 23 | How is the toolchain pinned (`.swift-version`, swiftly 1.2.0, `swift.toolchain`, `swiftly init --assume-yes`)? | Shared file between swiftly and rules_swift; reproducible CI | https://github.com/swiftlang/swiftly | no | toolchain management | P1 - determines every other command |
| 24 | What sizes and limits apply to Wasm and Embedded Swift (17 MB vs 42.6 KB, WasmKit, no Windows host)? | Measured; Embedded needs experimental flag | https://www.swift.org/documentation/articles/wasm-getting-started.html | no | SDK | P2 - niche target |
| 25 | How is the Android SDK configured (NDK r30, `ANDROID_NDK_HOME`, `--triple ...android23`, `libc++_shared.so`)? | CI defaults r27d/r28c disagree with docs; 13 of 40 test it | https://www.swift.org/documentation/articles/swift-sdk-for-android-getting-started.html | no | SDK + CI | P2 - version mismatch trap |
| 26 | Which Embedded Swift restrictions apply (`EmbeddedRestrictions` group, no `weak`)? | 6.4 generalised features; diagnostic group is warnable | https://www.swift.org/blog/swift-6.4-released/ | no | compiler | P3 - embedded only |
| 27 | Where does Foundation differ on Linux (FoundationEssentials vs Foundation, Musl, `DateFormatter`) and how does it show in binary size? | 10.3 MB vs 55.6 MB measured; behaviour divergence bites tests | https://github.com/swiftlang/swift-foundation | no | stdlib/Foundation | P0 - common cross-platform bug source |
| 28 | How do `String`/`URL`/`FilePath` paths behave on Windows, and what line endings do tools require (SwiftLint `\n`)? | Separators, drive letters, CRLF break formatters | https://github.com/realm/SwiftLint (CHANGELOG 0.64.0) | no | Windows + stdlib | P1 - cross-platform CLI bug class |
| 29 | How should availability and deprecation be handled (`anyAppleOS`, `#if deploymentTargetAtLeast`, `.v27`)? | Xcode 27 era; SE-0554 under review through 2026-10-12 (Apple read-only) | https://developer.apple.com/wwdc26/ | no | availability | P2 - Apple-only, proposal not final |
| 30 | When should a project use Tuist/XcodeGen versus plain SwiftPM + `xcodebuild`? | Tuist AGENTS.md says `tuist generate` + `xcodebuild`, not `swift test` | https://github.com/tuist/tuist (cli/AGENTS.md) | no | Apple build tooling | P2 - Apple-only, contested |
| 31 | Which formatter is canonical (swift-format vs SwiftFormat vs SwiftLint) and can two coexist? | Measured: 2795 findings after chaining; 24/7/4 adoption | https://github.com/swiftlang/swift-format | no | formatting | P0 - agents will run both |
| 32 | What does SwiftLint miss for Swift 6 (no `@unchecked Sendable` rule, no Swift Testing rules, 4 concurrency rules)? | Gaps mean lint-green code can violate concurrency policy | https://github.com/realm/SwiftLint | no | linting | P1 - false assurance |
| 33 | How are `swift_library` attrs set (`alwayslink`, `defines` vs `local_defines`, `private_deps`, `library_evolution`)? | SwiftPM effectively always links; Bazel default differs | https://github.com/bazelbuild/rules_swift | partial (bazel-quality covers core) | Bazel | P1 - Bazel/Swift mismatch |
| 34 | How is Swift provisioned in Bazel (hermetic `swift.toolchain`, `.swift-version`, `CC=clang`, `-debug-module-path`)? | Platform keys lag 26.04/UBI10; `-modulewrap` removal | https://github.com/bazelbuild/rules_swift | partial | Bazel | P2 - narrow audience, clear checks |
| 35 | Should generated code (OpenAPI, protobuf) be committed or built by plugin, and how is it kept out of linters? | openapi-generator recommends plugin; file names unstable | https://github.com/apple/swift-openapi-generator | no | codegen | P1 - drift and lint noise |
| 36 | How is DocC gated in CI (`--analyze --warnings-as-errors`, `.spi.yml`, `--transform-for-static-hosting`)? | Measured: catches broken links and missing params | https://github.com/swiftlang/swift-docc-plugin | partial (docs-quality, code-docs) | docs build | P1 - 31 of 40 have `.spi.yml` |
| 37 | Which `.sourcekit-lsp/config.json` keys matter (`swiftPM.buildSystem`, `swiftSDK`, `backgroundIndexing`)? | Format explicitly not stable; Wasm/Android editor setup | https://github.com/swiftlang/sourcekit-lsp | no | editor | P3 - unstable surface |
| 38 | Where do benchmarks live (package-benchmark, nested packages per trait)? | swift-log isolates them from the main package graph | https://github.com/ordo-one/package-benchmark | no | performance | P3 - niche |
| 39 | How do libraries accept and propagate loggers (`Logger.current`, `withLogger`, no `Logger(label:)` in libs, level guidance, `MaxLogLevel*` traits)? | Library log hygiene; compile-time level removal | https://github.com/apple/swift-log | no | observability | P1 - widely violated convention |
| 40 | How does a service handle SIGTERM and shutdown (`ServiceGroup`, `gracefulShutdownSignals` default `[]`)? | Default does nothing on SIGTERM | https://github.com/swift-server/swift-service-lifecycle | no | server runtime | P0 - container shutdown bug |
| 41 | How should CLIs handle SIGPIPE and exit codes (`141`, `exit(3)` flushes, cleanup skipped)? | Measured: `B many \| head -1` gives 141; no post-loop cleanup | https://swiftpackageindex.com/apple/swift-argument-parser | no | CLI runtime | P0 - pipeline breakage |
| 42 | What happens to buffered stdout on `fatalError` (exit 132, lost when redirected), and why does `fflush(stdout)` fail in Swift 6 mode? | Measured; use `fflush(nil)` | https://developer.apple.com/documentation/swift/fatalerror(_:file:line:) | no | CLI runtime | P1 - lost diagnostics |
| 43 | How is output made deterministic (`SWIFT_DETERMINISTIC_HASHING`, `.sortedKeys`, `.withoutEscapingSlashes`)? | Measured per-process random order; `\/` escaping | https://developer.apple.com/documentation/foundation/jsonencoder | no | stdlib/Foundation | P0 - flaky tests and snapshot diffs |
| 44 | How do `count`, `unicodeScalars`, `utf8`, `utf16` differ for composed strings, and when is `==` canonical equivalence? | Measured 3/9/29/14; `"Å" == "A\u{30a}"` true | https://developer.apple.com/documentation/swift/string | no | stdlib | P0 - classic correctness bug |
| 45 | How does locale-dependent formatting behave (`Locale.current` = `en_001` in containers, `.formatted()`, `de_DE`)? | Measured; tests pass on laptop and fail in CI | https://developer.apple.com/documentation/foundation/locale | no | stdlib/Foundation | P1 - environment-dependent output |
| 46 | When do `ContinuousClock`, `SuspendingClock`, `Date` and `Duration` differ for timeouts and measurement? | Sleep/suspend semantics; pointer only, not fetched in this corpus | https://developer.apple.com/documentation/swift/continuousclock | no | stdlib | P1 - hand to language corpus |
| 47 | How should `Codable` payloads be versioned (unknown keys, defaults, enum evolution)? | Persistence compatibility; pointer only, not fetched | https://developer.apple.com/documentation/swift/codable | no | stdlib | P1 - hand to language corpus |
| 48 | How are files written atomically (`Data.write(options: .atomic)`, temp + rename) and what happens on Windows? | Corrupt config files; pointer only, not fetched | https://developer.apple.com/documentation/foundation/data/writingoptions | no | Foundation | P1 - hand to language corpus |
| 49 | How do cancellation, actor reentrancy and `deinit` cleanup interact (`withTaskCancellationShield`, async `defer`)? | SE-0504 and SE-0493 are new in 6.4 | https://github.com/swiftlang/swift-evolution (SE-0504, SE-0493) | no | concurrency | P1 - new APIs, old advice stale |
| 50 | When is `LibraryEvolution` / `library_evolution` and `@frozen` required, and what does the SSWG bar demand of libraries (1.0, CI on two latest Swift, 30-day GA support)? | Optional feature in 6.4; rules_swift attr; graduation criteria | https://www.swift.org/sswg/incubation-process.html | no | library release | P2 - binary-distribution only |

## Recent shifts seen in this corpus

- Swift 6.0 (2024): Swift 6 language mode, `swiftLanguageMode` replaces `swiftLanguageVersion`; Swift Testing arrives alongside XCTest. Older advice to use `swiftLanguageVersions: [.v5]` is deprecated; 12 of 40 exemplars still carry `.v5` somewhere.
- Swift 6.1 (2025-03): package traits (SE-0450), `BuildSettingCondition` traits, `-Werror <Group>` CLI (SE-0443), background indexing default in sourcekit-lsp, static SDK already present. Invalidates "all dependencies are always compiled with all of their code".
- Swift 6.2 (2025-09-15, Xcode 26): `treatAllWarnings`/`treatWarning` (SE-0480), `defaultIsolation` (SE-0466), `strictMemorySafety`, Wasm SDK on swift.org, and the `unsafeFlags` consumer restriction lifted for tools >= 6.2 (`PackageBuilder.swift:1073`). Invalidates "unsafeFlags blocks version dependencies".
- Swift 6.3 (2026-03-24, Xcode 26.4): Android SDK first appears in the swift.org platform list; Swift Build announced as the future default (forum post 2026-03-24); swiftly VS Code integration and Open VSX publication (2026-04-08). 6.3.3 shipped 2026-06-29.
- Swift 6.4 (2026-09-14, Xcode 27.0): Swift Build default engine; `@diagnose` (SE-0522); `swift package migrate`, `add-setting`, `generate-sbom`, `--debugger` for tests; `ApproachableConcurrency` in the init template; SE-0504, SE-0493, Subprocess 1.0, Observation changes; `.v27` platforms; Embedded generalisation. Fedora 39 and Amazon Linux 2 dropped. Invalidates hard-coded `.build/<triple>/<config>` paths and "swift-format config is enough" (see formatter conflict).
- Swift 6.5 (main, not released at 2026-10-10): SE-0540 default target settings, SE-0501 HTML coverage, `bridgingHeader` setting, `testTarget` `packageAccess`. Anything cited from main is flagged version-gated.
- Xcode 16 to 27: Xcode 26.3 added coding agents; Xcode 27 ships with Swift 6.4; WWDC26 sessions 258 and 259 cover agents and the toolchain (read-only; Apple materials show no AGENTS.md/CLAUDE.md/skills guidance).
- Tooling releases in range: SwiftLint 0.64.0 (Windows build), 0.65.1; SwiftFormat 0.63.1 (2026-09-30); swiftly 1.2.0 (2026-09-22); rules_swift 4.2.1 (2026-10-09); swift-log 1.16.1 (2026-10-07) with task-local `Logger.current`; swift-docc-plugin 1.5.0 (2026-04-27); Tuist 4.207.1; Vapor 5 beta; Swift AWS Lambda Runtime 3.0.
- CI: `swiftlang/github-workflows` reached 0.0.15 (2026-08-24); its README still lists Swift 5.9-6.2.

## Contested

- Formatter choice: swift-format (Apple/swiftlang/server repos, 24 of 40) vs SwiftFormat (7, SwiftPM itself) vs SwiftLint (4 at root). Chaining them is incompatible with default configs (2795 vs 0 findings). Trend: swift-format as toolchain-shipped default; SwiftLint kept for custom/analyzer rules.
- `xcodebuild` vs `swift test` for big Apple repos: Tuist's AGENTS.md prefers `tuist generate` + `xcodebuild`; SwiftPM-first repos run `swift test` in Linux/Windows matrices. Trend: both coexist; Linux/Windows CI stays on SwiftPM.
- Generated code: swift-openapi-generator recommends build plugin without committed output; other projects commit generated files (including swift-protobuf users). Trend: plugin for OpenAPI, committed for protobuf-heavy repos.
- Native vs Swift Build engine: Swift Build is the 6.4 default, `native` deprecated, yet `--static-swift-stdlib` and import-check bugs mean `native` is still the practical fallback for some release builds.
- Reusable workflows: pinned tags (`@0.0.15`) vs `@main` from apple/swift-nio. Trend: tagged pins for swiftlang workflows; nio workflows remain `@main` in 10 repos.
- `unsafeFlags` relaxation: ESG supported removing the gate; security objections (arbitrary Clang plugin loading) were not fully resolved. Trend: relaxed for tools >= 6.2.
- Package.resolved for libraries: SwiftPM docs and most Apple libraries ignore it; pointfreeco libraries commit it. Trend: ignore for libraries, track for apps/CLIs.
- Default isolation: template enables `ApproachableConcurrency` everywhere including libraries; exemplars do not. Trend: application-level opt-in, not library.
- Documentation drift: github-workflows README vs workflow defaults; NDK r27d/r28c vs docs r30; Static SDK pages vs `releases.json` platform keys. Trend: trust the workflow file and `releases.json` over prose.

## Sources

Primary = swift.org, swiftlang/apple/swift-server org repositories, or first-party tool repos read at a pinned SHA.

| # | URL | What it is | Date/era | Why worth reading | Primary |
|---|---|---|---|---|---|
| 1 | https://www.swift.org/api/v1/install/releases.json | Release/platform/SDK checksum metadata | 2026-10-10 fetch | Falsified the Android-dropped claim; machine-readable platforms | yes |
| 2 | https://www.swift.org/blog/swift-6.4-released/ | 6.4 release post | 2026-09-15 | Headline features and platform changes | yes |
| 3 | https://github.com/swiftlang/swift-package-manager (5546f44a3b52) | SwiftPM source and docs | main, 2026-10 | PackageDescription API, release notes, unsafeFlags gate | yes |
| 4 | https://github.com/swiftlang/swift-package-manager/issues/9620 | Import check known issue | 2026 | Matches measured silent failure | yes |
| 5 | https://forums.swift.org (Swift Build default, Owen Voorhees) | Engine switch announcement | 2026-03-24 | Rationale and caveats | yes |
| 6 | https://github.com/swiftlang/github-workflows | Reusable CI workflows | 0.0.15, 2026-08-24 | Fleet CI baseline | yes |
| 7 | https://www.swift.org/documentation/articles/static-linux-getting-started.html | Static Linux SDK guide | 6.4 era | Limits: no dlopen, exact toolchain match | yes |
| 8 | https://www.swift.org/documentation/articles/swift-sdk-for-android-getting-started.html | Android SDK guide | 6.4 era | NDK r30 requirement | yes |
| 9 | https://www.swift.org/documentation/articles/wasm-getting-started.html | Wasm SDK guide | 6.4 era | WasmKit, embedded variant | yes |
| 10 | https://www.swift.org/install/windows/ | Windows install page | 6.4 era | winget, Docker tags | yes |
| 11 | https://www.swift.org/install/linux/ | Linux install page | 6.4 era | Distro list | yes |
| 12 | https://hub.docker.com/_/swift | Official image tags | 2026-10-10 fetch | Slim/full sizes, distro variants | yes |
| 13 | https://github.com/swiftlang/swiftly | Toolchain manager | 1.2.0, 2026-09-22 | `.swift-version`, automated install | yes |
| 14 | https://github.com/swiftlang/swift-format | Formatter | b15dd59fad21 | Config keys and defaults | yes |
| 15 | https://github.com/swiftlang/swift-docc-plugin | DocC SwiftPM plugin | 1.5.0, 2026-04-27 | Flags and sandbox requirements | yes |
| 16 | https://github.com/swiftlang/sourcekit-lsp | Language server | c6ce93d5f8aa | Config file keys | yes |
| 17 | https://github.com/swiftlang/swift-evolution | Proposals SE-0443, 0450, 0466, 0480, 0504, 0509, 0522, 0540 | 2024-2026 | Design intent and status | yes |
| 18 | https://github.com/swiftlang/swift-build | New SwiftPM engine | 2187330e13e7 | Engine behaviour vs native | yes |
| 19 | https://www.swift.org/sswg/incubation-process.html | SSWG incubation criteria | 2026 | Library quality bar | yes |
| 20 | https://github.com/apple/swift-log | Logging API | 1.16.1, 2026-10-07 | Best-practice docs, traits | yes |
| 21 | https://github.com/swift-server/swift-service-lifecycle | Service lifecycle | 2.12.1 | Signal defaults | yes |
| 22 | https://github.com/apple/swift-openapi-generator | OpenAPI codegen | 1.14.0 | Plugin vs committed guidance | yes |
| 23 | https://github.com/apple/swift-protobuf | Protobuf codegen | 1.38.1 | Plugin options | yes |
| 24 | https://github.com/apple/swift-distributed-tracing | Tracing API | a5270bd1280a | App/library/tracer guides | yes |
| 25 | https://github.com/apple/swift-embedded-examples | Embedded samples | 119b29f83550 | Embedded build setup | yes |
| 26 | https://github.com/swiftlang/swift-foundation | Foundation core | 6.4 era | Linux divergence anchor | yes |
| 27 | https://github.com/bazelbuild/rules_swift | Bazel rules | 4.2.1, 2026-10-09 | Attrs, toolchain extension, features | yes |
| 28 | https://github.com/cgrindel/rules_swift_package_manager | Bazel + SwiftPM bridge | 1.25.0, 2026-09-21 | Reads `Package.resolved` | no |
| 29 | https://github.com/realm/SwiftLint | Linter | 0.65.1 (ec4691d9e813) | Rule inventory and Windows note | no |
| 30 | https://github.com/nicklockwood/SwiftFormat | Formatter | 0.63.1, 2026-09-30 (fbc07aca5373) | Rule inventory, `--lint` | no |
| 31 | https://github.com/tuist/tuist | Project generator | 4.207.1 (2f6ac74754bf) | AGENTS.md and skills precedent | no |
| 32 | https://github.com/yonaskolb/XcodeGen | Project generator | 2.46.0, 2026-07-16 | Alternative to Tuist | no |
| 33 | https://github.com/ordo-one/package-benchmark | Benchmark plugin | 1.37.0 | Benchmark layout | no |
| 34 | https://github.com/SwiftPackageIndex/SPIManifest | `.spi.yml` decoder | main | Manifest schema | no |
| 35 | https://swiftpackageindex.com | Swift Package Index | 2026-10 | Platform/version compatibility signal | no |
| 36 | https://github.com/swift-server/vapor | Server framework | Vapor 5 beta | Ecosystem direction | no |
| 37 | https://github.com/awslabs/swift-aws-lambda-runtime | Lambda runtime | 3.0 | SwiftPM plugins for deploy | no |
| 38 | https://github.com/grpc/grpc-swift-2 | gRPC for Swift | 2.4.3 | Codegen plugin | no |
| 39 | https://developer.apple.com/wwdc26/ (sessions 258, 259) | WWDC26 Xcode sessions | 2026-06 | Agent integration in Xcode 27 (read-only) | no |
| 40 | https://developer.apple.com/documentation/foundation/jsonencoder | JSONEncoder reference | current | Output formatting options | no |
| 41 | https://developer.apple.com/documentation/swift/string | String reference | current | Unicode views | no |
| 42 | https://developer.apple.com/documentation/foundation/locale | Locale reference | current | Locale formatting | no |
| 43 | https://developer.apple.com/documentation/swift/continuousclock | Clock reference | current | Clock semantics (pointer only) | no |
| 44 | https://developer.apple.com/documentation/foundation/data/writingoptions | Data write options | current | Atomic writes (pointer only) | no |
| 45 | https://developer.apple.com/documentation/swift/codable | Codable reference | current | Versioning pointer only | no |
| 46 | `/home/mherwig/.cache/research-lang/swift-tools/fixtures/eco/p1..p10, fmt` | Local fixtures run in `swift:6.4` | 2026-10-10 | Measured results behind P1-P18 | measured |

Primary sources counted: 27 (rows 1-27). sources_count: 46 including the fixture row.
