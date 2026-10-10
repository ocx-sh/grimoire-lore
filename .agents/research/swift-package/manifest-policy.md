---
title: "Swift manifest policy: floors, language modes, upcoming features, versioned manifests and skeletons"
topic: "SwiftPM Package.swift policy (tools-version floors per package kind, Swift 6 mode and its exemptions, upcoming-feature list, shared settings, unsafeFlags, Package@swift-X.swift, platforms, manifest-editing commands)"
agent: "package/manifest-policy (research-lang swift program, wave 2, W2-6)"
model: sonnet
date_researched: 2026-10-10
sources_count: 38
fixtures: /home/mherwig/.cache/research-lang/swift-tools/fixtures/manifest-policy/
scope: |
  Covered: rows M-K-04, M-L-01, M-L-02, M-L-04, M-L-06, M-L-07, M-L-14, M-L-15, M-L-21 of the topic map. Floors per package kind, explicit Swift 6 mode and its .v5 exemptions, the upcoming-feature list, shared settings (no `defaultSwiftSettings` in 6.4), `swift package migrate`, the unsafeFlags consumer rule, versioned manifests, `platforms:`, `swift package add-*`, and verbatim library / CLI / SDK skeletons that build on swift:6.4 and swift:6.3.
  Not covered: dependency requirements, Package.resolved, traits and swift-syntax pins (W2-7); the ApproachableConcurrency/default-isolation semantics (concurrency dives; this file only fixes what the manifest may contain); `-warnings-as-errors` policy (warnings-and-ci); formatter config (format-and-lint). Everything Apple-only (platform deployment semantics, Xcode) is "unverified: read only"; Windows is unverified (owner Q7). No swift:6.2 image exists on this host, so the 6.2 floor is verified through the 6.3 manifest loader, not a 6.2 compiler.
---

# Swift manifest policy (researched 2026-10-10, Swift 6.4 era)

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
  - [1. Reading the floor: tools version, declared and effective language mode (M-K-04, M-L-01)](#1-reading-the-floor-tools-version-declared-and-effective-language-mode-m-k-04-m-l-01)
  - [2. Three different numbers: tools version, toolchain, language mode](#2-three-different-numbers-tools-version-toolchain-language-mode)
  - [3. Floors per package kind (M-L-01)](#3-floors-per-package-kind-m-l-01)
  - [4. Language mode and the `.v5` exemption (M-L-02)](#4-language-mode-and-the-v5-exemption-m-l-02)
  - [5. The upcoming-feature list (M-L-04)](#5-the-upcoming-feature-list-m-l-04)
  - [6. Typos, stale names and StrictLanguageFeatures](#6-typos-stale-names-and-strictlanguagefeatures)
  - [7. Experimental features](#7-experimental-features)
  - [8. Shared settings and the missing `defaultSwiftSettings` (M-L-06)](#8-shared-settings-and-the-missing-defaultswiftsettings-m-l-06)
  - [9. `swift package migrate` when settings sit in a variable (M-L-06)](#9-swift-package-migrate-when-settings-sit-in-a-variable-m-l-06)
  - [10. unsafeFlags and consumers (M-L-07)](#10-unsafeflags-and-consumers-m-l-07)
  - [11. Versioned manifests (M-L-15)](#11-versioned-manifests-m-l-15)
  - [12. `platforms:` and Linux-only packages (M-L-14)](#12-platforms-and-linux-only-packages-m-l-14)
  - [13. Manifest-editing commands (M-L-21)](#13-manifest-editing-commands-m-l-21)
  - [14. Skeletons (library, CLI, SDK)](#14-skeletons-library-cli-sdk)
  - [15. Corrections to earlier artifacts](#15-corrections-to-earlier-artifacts)
- [Normative guidance candidates](#normative-guidance-candidates)
- [Verification runs](#verification-runs)
- [Exemplar evidence](#exemplar-evidence)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

- Read the floor before editing: run `swift package tools-version`, then `swift package dump-package | jq`; never `head -1 Package.swift` (the tools-version comment may sit on a later line since 6.0; `vapor@bf77fc69b142:Package.swift:2`).
- The `dump-package` JSON key for package-level language modes is `swiftLanguageVersions`, not `swiftLanguageModes`; the map's M-L-01 check (`jq '.toolsVersion, .swiftLanguageModes'`) prints `null` even when modes are declared (watched red). The version sits at `.toolsVersion._version`.
- Floors: libraries and the SDK declare tools `6.2` (the lowest version that carries `treatWarning`, `strictMemorySafety`, `defaultIsolation` and the relaxed unsafeFlags rule); CLIs and servers declare the current release `6.4`; nothing new goes below `6.2`. Tools 6.3 and 6.4 add almost no manifest API, so raising a library to 6.4 only strands consumers (every 6.4-tools library in the corpus needs `Package@swift-X.swift` fallbacks).
- Every manifest states Swift 6 mode explicitly with `swiftLanguageModes: [.v6]`. The 6.4 `swift package init` template does not (the 6.3 one did), and it also writes tools 6.4 into a library.
- A `.v5` opt-out is per target, on one line with a dated reason and tracker (`swift-build@2187330e13e7:Package.swift:345`); package-level `swiftLanguageModes: [.v5]` is a defect (Alamofire, `Alamofire@bda9ed57d729:Package.swift:52`). A per-target mode beats the package-level mode in both directions (measured).
- Upcoming features for new packages, spelled out, never bundled: `ExistentialAny`, `MemberImportVisibility`, `InternalImportsByDefault`, `NonisolatedNonsendingByDefault`, `InferIsolatedConformances`. All five exist at the 6.2 floor. Do not list `ImmutableWeakCaptures` (needs 6.3, SE-0481) or any of the 15 Swift-6-group names in a Swift 6 target (compiler warns "already enabled as of the Swift 6 language mode"; fatal under `.treatAllWarnings(as: .error)`).
- The set of upcoming-feature names is identical on 6.3.3 and 6.4.0 (15 `LanguageMode::v6` plus 6 `LanguageMode::future`, plus the `ApproachableConcurrency` pseudo-feature); compiled one by one under `-Werror StrictLanguageFeatures`.
- Unknown or misspelt names are silently ignored by default (`NonIsolatedNonsendingByDefault` built green). Put `.treatWarning("StrictLanguageFeatures", as: .error)` in the root manifest: it failed the typo build on both images, and it is root-only (a consumer of the same package built green), so it cannot break dependents.
- Two exemplars carry dead flags the compiler never complained about: `.enableUpcomingFeature("LifetimeDependence")` (`vapor@bf77fc69b142:Package.swift:257`, `swift-async-algorithms@cbde9aed744b:Package.swift:78,154`) is not an upcoming feature, and `SuppressedAssociatedTypesWithDefaults` is unrecognised as experimental on 6.3 and 6.4.
- `defaultSwiftSettings:` and `.defaults` (SE-0540, accepted with modifications 2026-09-06, implementation PR still open) are a manifest compile error on 6.4 (`extra argument 'defaultSwiftSettings' in call`). Apply shared settings with one post-definition loop (`for target in package.targets where [...]`), which `swift package migrate` handles.
- `swift package migrate --to-feature X` fails with exit 1 on a bare `swiftSettings: sharedVar` (`unable to find array literal for 'swiftSettings' argument`) after it has already rewritten the sources; the inline literal, `shared + [...]` and the loop all migrate (exit 0 on 6.3 and 6.4).
- `unsafeFlags` blocks a consumer only when the dependency's tools version is below 6.2 and the dependency is resolved from a version tag: dep at 6.1 exit 1, same file at 6.2 exit 0, branch and path dependencies exit 0, on both images. Allowed packages are the root, branch/revision checkouts and edited/local ones (`Workspace+Manifests.swift:146-175`).
- Versioned manifests: an exact `@swift-X.Y.Z` / `@swift-X.Y` / `@swift-X` marker for the running toolchain wins unconditionally, even over a newer `Package.swift` (`Package@swift-6.swift` at tools 6.0 beat `Package.swift` at 6.4 on both images). A versioned file with a higher tools version than `Package.swift` shadows it. Default policy: none; if one is unavoidable it is `Package@swift-MAJOR.MINOR.swift` with a strictly lower tools version.
- Prefer one manifest plus `#if compiler(>=6.4)` for settings that differ by compiler (measured: one Package.swift gave different settings on 6.3 and 6.4); versioned files are only for manifest-API differences gated by tools version (`.macOS(.v27)` needs tools 6.4: `'v27' was introduced in PackageDescription 6.4`).
- `platforms:` is Apple-only: `.macOS("26.2")` loads on Linux, `.linux` does not exist (`type 'SupportedPlatform' has no member 'linux'`), and a Linux-only package simply omits the argument. Corpus: 24 of 38 manifests declare it; Alamofire and swift-dependencies keep different floors in different versioned manifests.
- Resolution depends on the toolchain: a tag whose manifest needs a newer tools version is ignored silently under `from:` (6.3 resolved 1.0.0 where 6.4 resolved 1.1.0) and fatal under `exact:`. Raise a library floor only in a release you are willing to strand 6.3 consumers on.
- `swift package add-dependency|add-target|add-target-dependency|add-product|add-setting|migrate` work against the loop-style manifest on both images but emit unformatted code (`dependencies: [` jammed onto the target line); run the formatter and re-run the floor read after each.

## Findings

### 1. Reading the floor: tools version, declared and effective language mode (M-K-04, M-L-01)

**Where the tools-version comment may sit.** The SwiftPM docs: the comment "conventionally appears on the first line … and must do so when the specified version is earlier than 6.0; from Swift 6.0 onward it may instead appear on a later line" ([SettingSwiftToolsVersion](https://docs.swift.org/swiftpm/documentation/packagemanagerdocs/settingswifttoolsversion)). Measured on 6.4 and 6.3: tools 6.2 on line 3 loads and `swift package tools-version` prints `6.2.0`; tools 5.9 on line 3 fails with `the manifest is backward-incompatible with Swift < 6.0 because the tools-version was specified in a subsequent line of the manifest, not the first line` (`ToolsVersionParser.swift:620` region; fixtures `c-versioned/c9-*`, `c10-*`). In the corpus 37 of 38 root manifests have it on line 1; `vapor@bf77fc69b142:Package.swift:1` is `import CompilerPluginSupport` and the comment is on line 2. So `head -1 Package.swift` returned `// Copyright header` on the planted line-3 fixture (red) while `grep -n -m1 -e 'swift-tools-version' Package.swift` and `swift package tools-version` returned the right answer.

**`swift package tools-version` is the cheapest correct read, and it survives an older toolchain.** On swift:6.3 against a tools-6.4 manifest it still prints `6.4.0` (exit 0) whereas `dump-package` fails with `package 'cli' is using Swift tools version 6.4.0 but the installed version is 6.3.3` (exit 1). It also reports the manifest SwiftPM would actually load: with `Package.swift` at 6.2 and a stray `Package@swift-6.3.swift`, it prints `6.3.0` on 6.4 (see section 11).

**`dump-package` field names (swift:6.4 and 6.3, fixture `p0-dump/`).**

| Fact | JSON path | Notes |
|---|---|---|
| tools version | `.toolsVersion._version` | string such as `"6.2.0"` |
| package-level language modes | `.swiftLanguageVersions` | array of strings (`["6"]`, `["6","5"]`); `null` when not declared. There is no `swiftLanguageModes` key. |
| per-target mode | `.targets[].settings[].kind.swiftLanguageMode._0` | `"5"` or `"6"` |
| upcoming feature | `.targets[].settings[].kind.enableUpcomingFeature._0` | the string passed to `.enableUpcomingFeature` |
| experimental feature | `.targets[].settings[].kind.enableExperimentalFeature._0` | |
| default isolation | `.targets[].settings[].kind.defaultIsolation._0` | `"nonisolated"` or `"MainActor"` |
| strict memory safety | `.targets[].settings[].kind.strictMemorySafety` | empty object |
| target type | `.targets[].type` | `regular`, `executable`, `test`, `macro`, `plugin`, `system`, `binary` |

Settings added in a post-definition loop appear in the dump (the loop runs when the manifest is evaluated), which is why the dump, not a grep, is the reliable view of effective settings.

**Declared versus effective language mode (fixtures `p1-modes/m1..m8`, `swift build -v`, compile command of the target, both images).**

| Manifest | `.swiftLanguageVersions` | Effective `-swift-version` |
|---|---|---|
| tools 6.2, nothing declared | `null` | 6 |
| tools 6.2, `swiftLanguageModes: [.v5]` | `["5"]` | 5 |
| tools 6.2, `swiftLanguageModes: [.v6, .v5]` | `["6","5"]` | 6 |
| tools 6.2, target `.swiftLanguageMode(.v5)` | `null` | 5 |
| tools 5.9, nothing declared | `null` | 5 |
| tools 6.2, package `[.v5]`, target `.swiftLanguageMode(.v6)` | `["5"]` | 6 |
| tools 6.2, package `[.v6]`, target `.swiftLanguageMode(.v5)` | `["6"]` | 5 |
| tools 6.4, nothing declared | `null` | 6 (6.4 image only; 6.3 rejects the manifest) |

So a `null` package-level list on tools 6.x means "mode 6 by default" ([migration guide](https://www.swift.org/migration/data/documentation/swift-6-concurrency-migration-guide/enabledataracesafety.json): "A `Package.swift` file that uses `swift-tools-version` of `6.0` enables the Swift 6 language mode for all targets"), and the per-target setting wins in both directions. The target-level override exists since tools 6.0 (`CHANGELOG.md` line 22, "Starting from tools-version 6.0, `swiftLanguageMode` can be specified at the target level").

**The verbatim read-the-floor-first command (M-K-04).** Run from the package root, before editing `Package.swift`:

```sh
swift --version && ls Package*.swift && swift package tools-version && swift package dump-package | jq -c '{tools: .toolsVersion._version, packageModes: .swiftLanguageVersions, targets: [.targets[] | select(.type == "regular" or .type == "executable" or .type == "test") | {name, features: [.settings[].kind | to_entries[] | "\(.key)=\(.value._0 // "")"]}]}'
```

Run on the library skeleton it printed `6.2.0` and `{"tools":"6.2.0","packageModes":["6"],"targets":[{"name":"ExampleKit","features":["enableUpcomingFeature=ExistentialAny", …,"treatWarning=StrictLanguageFeatures"]}, …]}`; on the 6.4 init template it printed `{"tools":"6.4.0","packageModes":null,"targets":[{"name":"Tmpl","features":["enableUpcomingFeature=ApproachableConcurrency"]}, …]}`; on a directory with a shadowing versioned manifest it printed both `Package.swift` and `Package@swift-6.3.swift` from `ls` and `6.3.0` from `tools-version`. Read three things off it: (1) the tools version (the floor you may not silently raise or lower), (2) `packageModes` and any `swiftLanguageMode=5` entries (the mode), (3) the feature list (what is already on). If `ls` shows a `Package@swift-*` file, stop and read section 11 before editing. If `jq` is missing, the `swift package tools-version` line plus `grep -n -e 'swiftLanguageMode' -e 'enableUpcomingFeature' Package.swift` is the fallback (blind to loops).

### 2. Three different numbers: tools version, toolchain, language mode

- The **tools version** is a floor on the toolchain that may load the manifest and selects PackageDescription API availability; it is not a language mode. Alamofire is tools 6.4 with `swiftLanguageModes: [.v5]` (`Alamofire@bda9ed57d729:Package.swift:1,52`).
- A manifest whose tools version exceeds the installed toolchain does not load: `error: 'cli': package 'cli' is using Swift tools version 6.4.0 but the installed version is 6.3.3` (build and `dump-package` both exit 1 on swift:6.3).
- **Dependency resolution filters by tools version** ([SettingSwiftToolsVersion](https://docs.swift.org/swiftpm/documentation/packagemanagerdocs/settingswifttoolsversion): "if the tools version of a dependency is greater than the version in use, that version of the dependency is ineligible"). Measured (fixture `i-resolve/`, dep tags `1.0.0` tools 6.2 and `1.1.0` tools 6.4, consumer `from: "1.0.0"`): swift:6.4 resolved 1.1.0; swift:6.3 resolved 1.0.0 with exit 0 and no warning. With `exact: "1.1.0"`, swift:6.3 exits 1: `Dependencies could not be resolved because 'dep-multi' 1.1.0 contains incompatible tools version (6.4.0) and root depends on 'dep-multi' 1.1.0.` Consequence for floors: raising a library's tools version silently freezes consumers on older toolchains at the older release, and a `Package.resolved` produced on a 6.4 machine can pin a version the 6.3 CI cannot load.
- SwiftPM's own source gates behaviour on the tools version in only a few places that matter here: unsafeFlags relaxed at `>= .v6_2` (`PackageBuilder.swift:1073-1074`), XCTest/Swift Testing interop default `complete` at `>= .v6_4` (`TestingSupport.swift:388-391`), header-only C and imported module maps at `.v6_5` (`PackageBuilder.swift:1033`, `PackagePIFProjectBuilder+Modules.swift:351`), and PackageDescription API gating by `@available(_PackageDescription, introduced: N)`.

### 3. Floors per package kind (M-L-01)

**What each tools version buys in the manifest (PackageDescription API, read from `swift-package-manager@5546f44a3b52`).**

| Tools | New manifest capability | Source |
|---|---|---|
| 6.0 | per-target `.swiftLanguageMode(_:)`; `swiftLanguageModes:` replaces `swiftLanguageVersions:` (deprecated, renamed); tools-version may be on a later line | `Sources/Runtimes/PackageDescription/BuildSettings.swift:283-284`; `PackageDescription.swift:111,263`; `CHANGELOG.md:22,58` |
| 6.1 | package traits (SE-0450, Implemented 6.1) | [SE-0450](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0450-swiftpm-package-traits.md) |
| 6.2 | `.treatWarning`, `.treatAllWarnings`, `.enableWarning`, `.disableWarning`, `.strictMemorySafety()`, `.defaultIsolation(_:)`; unsafeFlags no longer blocks consumers | `BuildSettings.swift:391-420,570-590,732`; `PackageBuilder.swift:1073-1074`; `CHANGELOG.md:11,15` |
| 6.3 | no manifest API found; `// swift-tools-version: 6.3;(experimentalCGen)` tag; `swift package show-traits` command | `ToolsVersion.swift:93-105`; [6.3 release notes](https://github.com/swiftlang/swift-package-manager/blob/5546f44a3b524e2b57c05ba5185094aa8adc0bde/Sources/PackageManagerDocs/Documentation.docc/ReleaseNotes/6.3.md) |
| 6.4 | `.v27` Apple platform constants; XCTest/Swift Testing interop default `complete`; `init` template defaults. Swift Build becomes the default build system (a toolchain change, not a tools-version one) | `SupportedPlatforms.swift:403`; `TestingSupport.swift:388-391`; [6.4 release notes](https://github.com/swiftlang/swift-package-manager/blob/5546f44a3b524e2b57c05ba5185094aa8adc0bde/Sources/PackageManagerDocs/Documentation.docc/ReleaseNotes/6.4.md) |
| 6.5 (main, unreleased) | `bridgingHeader`, header-only C modules; `defaultSwiftSettings` not merged | `BuildSettings.swift:231-249`; [SE-0540](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0540-default-target-settings.md) |

`.treatWarning` at tools 6.1 is a manifest compile error (`'treatWarning(_:as:_:)' is unavailable`, fixture `k-checks/build/treatwarning-tools61`, exit 1 on both images), and `.macOS(.v27)` at tools 6.3 is `'v27' is unavailable` / `'v27' was introduced in PackageDescription 6.4` (exit 1 on 6.4).

**Dependency floors seen in 2026-10 (release tags read, not only main).**

| Package | Tools version at release | Evidence |
|---|---|---|
| swift-subprocess 1.0.0, 1.0.1 | 6.2 | [Package.swift@1.0.1](https://raw.githubusercontent.com/swiftlang/swift-subprocess/1.0.1/Package.swift) line 1 |
| swift-crypto 5.0.0 (4.0.0 was 6.0) | 6.2 | [Package.swift@5.0.0](https://raw.githubusercontent.com/apple/swift-crypto/5.0.0/Package.swift) |
| swift-log 1.15.0 and 1.16.1 | 6.2 | [Package.swift@1.16.1](https://raw.githubusercontent.com/apple/swift-log/1.16.1/Package.swift) |
| swift-service-lifecycle 2.12.0, 2.12.1 (2.11.0 was 6.0) | **6.1**, not 6.2 | [Package.swift@2.12.1](https://raw.githubusercontent.com/swift-server/swift-service-lifecycle/2.12.1/Package.swift) |
| swift-argument-parser (HEAD) | 6.0 | `swift-argument-parser@efd239f0055b:Package.swift:1` |

Corpus tools versions (38 root manifests, re-measured): 6.2 in 16, 6.0 in 6, 6.1 in 6, 6.4 in 5, 6.3 in 2, 5.9 in 2, 5.7 in 1.

**Decision (owner Q1, evidence applied).**

| Kind | Tools version | Why |
|---|---|---|
| Library (published, consumed as a dependency) | `6.2` | lowest version carrying the skeleton's `treatWarning` guard, `strictMemorySafety`, `defaultIsolation` and the relaxed unsafeFlags rule; the modal corpus version (16/38) and the floor of the libraries the fleet will depend on; 6.3 and 6.4 add nothing a library needs |
| SDK wrapping the ocx CLI | `6.2` | it depends on swift-subprocess, whose every 1.x release is tools 6.2, so it cannot be lower; and it is a library |
| CLI or server (leaf package, shipped as binary or container) | `6.4` (current release) | nothing else consumes the manifest, CI pins swift:6.4, the 6.4 template writes it, and 6.4 is the first tools version with `complete` XCTest/Swift Testing interop; lower it to 6.2 only if the repo also exports a reusable library product (then split the library out) |
| Apple app-internal package | current release | unverified: read only (no Xcode here) |

The library floor was **not** lowered below 6.2: every tools version under 6.2 loses `treatWarning` (so no typo guard), and a 6.0/6.1 library that needs `-require-explicit-sendable` must either hide `unsafeFlags` behind a CI-only `#if` (`swift-system@486d48c80fce:Package.swift:69-72`, `async-http-client@017115279d09:Package.swift:18-26`) or become unconsumable (section 10). The libraries that sit at tools 6.4 are exactly the ones that carry versioned fallback manifests (section 11): raising the floor to "current" costs a manifest per older toolchain.

**Limit.** Only swift:6.4 and swift:6.3 images exist here. The skeleton at tools 6.2 builds and tests green on both (the 6.3 loader enforces the same API gating), but no 6.2 compiler ran it; the CI floor leg (`swift:6.2`) is the real check and stays "unverified: not run".

### 4. Language mode and the `.v5` exemption (M-L-02)

- Explicit beats implicit: the 6.3 template wrote `swiftLanguageModes: [.v6]`; the 6.4 template wrote tools 6.4 and no mode (fixtures `h-init/t63`, `h-init/t64`). Both are mode 6 effectively, but only the first states it, which is what the K-04 read and a reviewer grep need. `swift-subprocess@55d30558b8b1:Package.swift:24-27` states `.swiftLanguageMode(.v6)` inside its shared settings array.
- Corpus (38 root manifests): 7 declare `swiftLanguageModes` including `.v6`; 5 declare package-level `[.v5]` (Alamofire, swift-snapshot-testing, swift-format, SwiftPM, tuist); 6 set a per-target `.swiftLanguageMode(.v5)` (collections, container-plugin, TCA, service-lifecycle, swift-build, foundation).
- The two good per-target examples carry the reason on the line or the line above: `swift-build@2187330e13e7:Package.swift:345` ("Temporarily downgraded from Swift 6 mode due to a source break in 1/31/26 nightly snapshot (rdar://169461269)") and `swift-collections@935f696a549a:Package.swift:324-325` ("FIXME: _modify accessors in RopeModule seem to be broken in Swift 6 mode"). The tracker in the first is an Apple-internal radar, so a published rule should require a public issue URL or a dated condition.
- `swift-service-lifecycle@c55297914e26:Package.swift:76-84` shows the compiler-conditional alternative: `#if compiler(<6.2)` appends `.swiftLanguageMode(.v5)` for old compilers only.
- Package-level `[.v5]` hides every target from the 6 checks. When the whole package must stay in 5 mode (a migration in progress), the migration guide's per-target pattern is the sanctioned shape ([EnableDataRaceSafety](https://www.swift.org/migration/data/documentation/swift-6-concurrency-migration-guide/enabledataracesafety.json)).
- A mode-5 target still takes the Swift-6-group upcoming features individually (`StrictConcurrency`, `GlobalConcurrency`, …): that is the migration path, and `swift-build` does exactly that for its `.v5` targets (`swift-build@2187330e13e7:Package.swift:30-54`).

### 5. The upcoming-feature list (M-L-04)

**Registry (compiler source).** `include/swift/Basic/Features.def` at `release/6.4.0` and `release/6.3` list the same upcoming features: 15 `LanguageMode::v6` (6.3 spells the group `6`) and 6 `LanguageMode::future` (spelled `7` in 6.3), lines 302-327 of the 6.4.0 file ([release/6.4.0](https://raw.githubusercontent.com/swiftlang/swift/release/6.4.0/include/swift/Basic/Features.def), [release/6.3](https://raw.githubusercontent.com/swiftlang/swift/release/6.3/include/swift/Basic/Features.def)).

| Group | Names (SE) |
|---|---|
| `v6` (already on in Swift 6 mode) | `ConciseMagicFile` (274), `ForwardTrailingClosures` (286), `StrictConcurrency` (337), `BareSlashRegexLiterals` (354), `DeprecateApplicationMain` (383), `ImportObjcForwardDeclarations` (384), `DisableOutwardActorInference` (401), `IsolatedDefaultValues` (411), `GlobalConcurrency` (412), `InferSendableFromCaptures` (418), `ImplicitOpenExistentials` (352), `RegionBasedIsolation` (414), `DynamicActorIsolation` (423), `NonfrozenEnumExhaustivity` (192), `GlobalActorIsolatedTypesUsability` (434) |
| `future` | `ExistentialAny` (335; Implemented 5.6, flag 5.8), `InternalImportsByDefault` (409; Implemented 6.0), `MemberImportVisibility` (444; Implemented 6.1), `InferIsolatedConformances` (470; Implemented 6.2), `NonisolatedNonsendingByDefault` (461; Implemented 6.2), `ImmutableWeakCaptures` (481; **Implemented 6.3**) |
| pseudo | `ApproachableConcurrency` = `DisableOutwardActorInference` + `GlobalActorIsolatedTypesUsability` + `InferIsolatedConformances` + `InferSendableFromCaptures` + `NonisolatedNonsendingByDefault` (`lib/Frontend/CompilerInvocation.cpp:887-891,1009-1015` at release/6.4.0) |

**Compiled, not just read** (fixture `e-features/run.sh`, `swiftc -typecheck -swift-version 6 -Werror StrictLanguageFeatures -enable-upcoming-feature NAME`): all 21 names plus `ApproachableConcurrency` exit 0 on swift:6.4 and swift:6.3.3, with identical results (diff of the two logs empty apart from the version line). `NonIsolatedNonsendingByDefault` (capital I), `StrictMemorySafety` and `FlowSensitiveConcurrencyCaptures` exit 1 (`'NAME' is not a recognized upcoming feature`). The 15 `v6` names exit 0 but emit `warning: upcoming feature 'X' already enabled as of the Swift 6 language mode` (not `StrictConcurrency`, which is silent). `-swift-version 5` accepts all of them without a warning.

**The redundancy warning is a build break with warnings-as-errors** (fixture `k-checks/build/redundant-v6-mode6` vs `redundant-v6-mode5`): a Swift 6 target with `.enableUpcomingFeature("GlobalConcurrency")` and `.treatAllWarnings(as: .error)` exits 1 on both images (`error: upcoming feature 'GlobalConcurrency' already enabled as of the Swift 6 language mode`), the same manifest with `swiftLanguageModes: [.v5]` exits 0.

**`ApproachableConcurrency` in a Swift 6 target adds only two features.** Three of its five members are `v6`-group and already on; the bundle compiled silently in 6 mode. So `NonisolatedNonsendingByDefault` + `InferIsolatedConformances` spelled out is equivalent, greppable, and avoids hiding semantics behind a pseudo-name (the 6.4 template writes the bundle into library and test targets; M-L-03 owns that decision, this file only fixes what the manifest lists).

**Decision for new packages (library, SDK, CLI, server; every `.regular`, `.executable` and `.test` target):**

| Feature | Verdict | Reason |
|---|---|---|
| `ExistentialAny` | required | catches bare protocol types (the commonest pre-6 idiom an agent writes); no semantic change; 15/38 corpus manifests |
| `MemberImportVisibility` | required | member lookup honours imports; 19/38, the most adopted |
| `InternalImportsByDefault` | required | stops dependency leakage through public API; 11/38; needs `public import` where API exposes a dependency (the SDK skeleton does: `public import Subprocess`) |
| `NonisolatedNonsendingByDefault` | required for **new** packages | removes the "nonisolated async hops off-actor" trap; semantic change, so existing packages adopt it with `swift package migrate` and a build on both 6.3 and 6.4 (map conflict 4: it broke 2 of 6 packages when flipped) |
| `InferIsolatedConformances` | required for **new** packages | the other half of the approachable bundle; inert without global-actor types |
| `ImmutableWeakCaptures` | not listed | needs a 6.3 compiler (SE-0481 Implemented 6.3), so on a 6.2-floor package it is ignored silently, or fatal under the strict guard on a 6.2 compiler; 3/38 |
| the 15 `v6`-group names | never in a Swift 6 target | redundant and warned; allowed only in a `.v5` target during migration |
| `StrictMemorySafety` | not an upcoming feature | use `.strictMemorySafety()` (tools 6.2); adoption belongs to the security dive (3/38) |

All five required names exist in the 6.2 compiler (SE statuses above), so the same list is valid at the library floor. Corpus counts for the five: 19, 15, 11, 7, 7 (re-measured over root manifests, comments stripped).

### 6. Typos, stale names and StrictLanguageFeatures

- The documented default is silence: "By default, if an unrecognized feature name is specified with the `-enable-upcoming-feature` or `-enable-experimental-feature` flags, the compiler will ignore it without emitting a diagnostic since some projects must be simultaneously compatible with multiple versions of the language and toolchain" ([strict-language-features.md@release/6.4.0](https://raw.githubusercontent.com/swiftlang/swift/release/6.4.0/userdocs/diagnostics/strict-language-features.md)); and for SwiftPM, "Targets will ignore any unknown upcoming features" ([enableUpcomingFeature](https://docs.swift.org/swiftpm/data/documentation/packagedescription/swiftsetting/enableupcomingfeature(_:_:).json)).
- `StrictLanguageFeatures` is a **diagnostic group**, not a feature (it is not in `Features.def`); make it an error with `.treatWarning("StrictLanguageFeatures", as: .error)` (tools 6.2) or `-Werror StrictLanguageFeatures`. Group ids differ by toolchain: 6.4 prints `[#StrictLanguageFeatures::UnrecognizedStrictLanguageFeatures]`, 6.3 prints `[#UnrecognizedStrictLanguageFeatures]`; the group flag works on both.
- Watched: `typo-lax` (typo, no guard) exit 0 on both images; `typo-strict` (same typo + guard) exit 1: `'NonIsolatedNonsendingByDefault' is not a recognized upcoming feature`; `typo-correct-strict` exit 0.
- **The guard is root-only.** A version dependency whose manifest has the typo and the guard built green for its consumer (fixture `g-strict`, `consumer-of-strict` exit 0 on 6.4 and 6.3) while building the dependency itself as root exit 1. `swift build -v` shows why: the dependency's compile command keeps `-enable-upcoming-feature NonIsolatedNonsendingByDefault` and gains `-suppress-warnings`, and the `-Werror StrictLanguageFeatures` pair is dropped. swift-testing documents the same behaviour: "treatWarning(..., as: .warning) cannot be used in packages which are used as dependencies, since the package manager suppresses all warnings for dependencies" (`swift-testing@c7d68ca20cd7:Package.swift:436-438`). Therefore the guard cannot break dependents, and a library that wants warnings-as-errors for its own CI keeps it in the manifest, not in `unsafeFlags`.
- **Names the compiler ignores in real manifests** (`StrictLanguageFeatures` run, both images): `LifetimeDependence` is not an upcoming feature (`vapor@bf77fc69b142:Package.swift:257`, `swift-async-algorithms@cbde9aed744b:Package.swift:78,154`); `Lifetimes` and `BuiltinModule` are not upcoming features (they are experimental and recognised as such); `SuppressedAssociatedTypesWithDefaults` is recognised as neither upcoming nor experimental on 6.3 or 6.4 (`vapor@bf77fc69b142:Package.swift:254`, `swift-collections@935f696a549a:Package.swift:118`, async-algorithms `:75,:151`) because SE-0503 is now a built-in language feature in `Features.def`.
- Do not pair the guard with a name introduced after the package's floor compiler: a 6.2 compiler would reject `ImmutableWeakCaptures` under the guard.

### 7. Experimental features

`enableExperimentalFeature` is in 15 of the 38 root manifests, mostly `Lifetimes`, `StrictConcurrency` (the 5.9/5.10 idiom; in tools 6.x it is `enableUpcomingFeature("StrictConcurrency")` per the migration guide, or simply Swift 6 mode), `AvailabilityMacro=…`, `SuppressedAssociatedTypesWithDefaults`. Experimental features may be removed or promoted without notice (section 6: one is already unrecognised). The one legitimate manifest use with no alternative is `AvailabilityMacro=Name 1.0:macOS 15.0,…` (compiler special-case, `CompilerInvocation.cpp:1024-1026`; `swift-collections@935f696a549a:Package.swift:105-107` uses the form). Policy: ban the rest in fleet code; allow with a same-line reason naming the SE or issue (Embedded targets, Lifetimes for `Span` APIs).

### 8. Shared settings and the missing `defaultSwiftSettings` (M-L-06)

- **Status.** SE-0540 "Default Target Settings" is **Accepted with modifications** (forum announcement 2026-09-06; review 2026-08-03..17); implementation [swiftlang/swift-package-manager#10033](https://github.com/swiftlang/swift-package-manager/pull/10033) was open (`mergeable_state: blocked`, updated 2026-10-08) on 2026-10-10, and `defaultSwiftSettings` is absent from `PackageDescription.swift` at `5546f44a3b52` ([SE-0540](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0540-default-target-settings.md), [acceptance](https://forums.swift.org/t/accepted-with-modifications-se-0540-default-package-settings/89398)). The acceptance post names no release.
- **Measured.** `Package(name:, defaultSwiftSettings: [...], targets: [...])` at tools 6.4 on swift:6.4: `Package.swift:5:27: error: extra argument 'defaultSwiftSettings' in call` and `type 'Any' has no member 'enableUpcomingFeature'` (exit 1); on swift:6.3 it never gets that far (`tools version 6.4.0 but the installed version is 6.3.3`).
- **Patterns in the corpus** (all legal today):
  1. Post-definition loop: `swift-log@4038b6a4f74a:Package.swift:51-73` (`for target in package.targets where [.executable, .test, .regular].contains(target.type)`), `swift-dependencies@b476cc576105:Package.swift:140-143`, `swift-service-lifecycle@c55297914e26:Package.swift:76-84`; 11 of 38 manifests loop over `package.targets`.
  2. Shared array plus `+`: `swift-subprocess@55d30558b8b1:Package.swift:20-27,49-53` (`] + packageSwiftSettings`), `swift-collections@935f696a549a:Package.swift:324-325` (`_settings + [...]`).
  3. Computed variable or function: `vapor@bf77fc69b142:Package.swift:245-262` (`var swiftSettings: [SwiftSetting]` applied at `:140,:153,:163`), `swift-build@2187330e13e7:Package.swift:30-54` (`func swiftSettings(languageMode:)`), `swift-testing@c7d68ca20cd7:Package.swift:430-440` (an `Array<SwiftSetting>` extension).
- **Choice for the skeletons: pattern 1, one loop at the bottom, filtered by target type.** It cannot be forgotten on a new target, it excludes `.macro` and `.plugin` targets (which are not given Swift settings), it is `swift package migrate`-compatible (section 9), and `dump-package` shows its result (section 1). SE-0540 will replace the loop with `defaultSwiftSettings`; the loop body then moves into the argument unchanged.

### 9. `swift package migrate` when settings sit in a variable (M-L-06)

The official text: "In some cases, the automated application of upcoming features to a target in the package manifest can fail for more complicated packages, e.g., if settings have been factored out into a variable that's then applied to multiple targets" ([FeatureMigration](https://www.swift.org/migration/data/documentation/swift-6-concurrency-migration-guide/featuremigration.json)); "Make sure to start with a clean working tree … applying the fix-its requires there to be no build errors and will modify files in the package in place". The command is `swift package migrate [--targets T] --to-feature F` (`Migrate.swift:47`; [PackageMigrate](https://docs.swift.org/swiftpm/data/documentation/packagemanagerdocs/packagemigrate.json)).

Measured on swift:6.4 and 6.3.3 (fixture `b-migrate/`, feature `ExistentialAny`, source with a bare protocol type; the logs are identical on both images):

| Manifest shape | Exit | Manifest edited | Sources edited |
|---|---|---|---|
| `swiftSettings: sharedVar` (bare identifier) | **1** | no | **yes** (2 fix-its applied) |
| `swiftSettings: common + [.strictMemorySafety()]` | 0 | yes, appended inside the `[...]` | yes |
| `swiftSettings: common + []` | 0 | yes, inside the empty literal | yes |
| inline `swiftSettings: [ .swiftLanguageMode(.v6), ]` | 0 | yes | yes |
| target with no `swiftSettings` argument | 0 | yes, argument added (`.enableUpcomingFeature("ExistentialAny"),]),`) | yes |
| post-definition loop (skeleton shape) | 0 | yes, argument added to the target literal | yes |

The failure line: `error: Could not update manifest to enable requested features for target 'Lib' (unable to find array literal for 'swiftSettings' argument). Please enable them manually by adding the following Swift settings to the target: '.enableUpcomingFeature("ExistentialAny")'` (`Migrate.swift:281`). Trace on that run: `> Starting the build` / `> Applying fix-its` / `> Applied 2 fix-its in 1 file` / `> Updating manifest` then the error. **The sources are already rewritten** (`public var shape: any Shape`) when the manifest step fails, so a failed migrate leaves the tree half-migrated: start from a clean tree and `git diff` before retrying. The docs' sample message ("Could not update manifest for 'TargetA' …") differs from the shipped text. Edited manifests are not formatter-clean (`,]),` jammed on one line); run the formatter. Note the loop shape means the feature is added to the target *and* the loop, which is harmless; remove the per-target duplicate by hand.

### 10. unsafeFlags and consumers (M-L-07)

- **Docs.** "the use of unsafe flags makes the products containing this target ineligible for use by other packages" ([unsafeFlags](https://docs.swift.org/swiftpm/data/documentation/packagedescription/swiftsetting/unsafeflags(_:_:).json)).
- **Source.** The consumer error is `the target 'X' in product 'Y' contains unsafe build flags` (`Diagnostics.swift:21`), raised by `ResolvedProduct.diagnoseInvalidUseOfUnsafeFlags` (`ResolvedProduct.swift:175-182`) unless the package `isAllowedToVendUnsafeProducts` (`ModulesGraph+Loading.swift:402,1530-1532`). The allowed set (`Workspace+Manifests.swift:146-175`) is: the root package(s), branch- or revision-based source-control checkouts, file-system and edited packages, plus `swift-corelibs-foundation`; registry downloads are not allowed. The flag is switched off wholesale by `manifest.toolsVersion >= .v6_2 ? false : manifestTarget.usesUnsafeFlags` (`PackageBuilder.swift:1073-1074`, `:1121`).
- **Measured** (fixture `a-unsafeflags/`; `dep61` and `dep62` differ only on line 1; both carry `.unsafeFlags(["-Xfrontend","-require-explicit-sendable"])`, tag `1.0.0`; the consumers are tools 6.2):

| Consumer depends on | swift:6.4 | swift:6.3.3 |
|---|---|---|
| `dep61` by tag `from: "1.0.0"` | exit 1: `error: 'consumer-on-dep61': the target 'Dep' in product 'Dep' contains unsafe build flags` | same |
| `dep62` by tag | `Build complete!` exit 0 | same |
| `dep61` by `branch: "main"` | exit 0 | exit 0 |
| `dep61` by `path: "../dep61"` | exit 0 | exit 0 |

- The consumer's own tools version does not matter; only the dependency manifest's.
- **After 6.2 the safety net is gone, so the author must keep the flags harmless.** Corpus uses are diagnostic-only: `-require-explicit-sendable` (`swift-log@4038b6a4f74a:Package.swift:71`), `-require-explicit-availability=error` (`swift-system@486d48c80fce:Package.swift:71`), `-fno-modules` (`containerization@3e7bc39e66b3:Package.swift:179`). For anything the typed API now covers (warnings, features, isolation, memory safety), use the typed setting. Tools below 6.2 may still carry dev-only flags behind a compile-time or constant toggle that is off for consumers: `#if SYSTEM_CI` (`swift-system@486d48c80fce:Package.swift:69-72`) and `strictConcurrencyDevelopment = false` (`async-http-client@017115279d09:Package.swift:18-26`, which at tools 6.2 does not need it).
- Ten of 38 corpus manifests contain `unsafeFlags` (re-measured), all at tools >= 6.1 or behind a toggle.

### 11. Versioned manifests (M-L-15)

**The documented rule.** `Package@swift-6.1.1`, then `Package@swift-6.1`, then `Package@swift-6`; if none matches, "the package manager picks the manifest with the most compatible tools version"; "It is a best practice to have `Package.swift` declare the newest-supported tools version and for versioned manifest files to only specify older versions"; the mechanism is for "a substantively different manifest file … due to changes in the manifest API" ([SwiftVersionSpecificPackaging](https://docs.swift.org/swiftpm/data/documentation/packagemanagerdocs/swiftversionspecificpackaging.json)).

**The implemented rule** (`ToolsVersionParser.swift:638-720`, `ToolsVersion.swift:245-251`): (1) for the running `ToolsVersion.current` try the exact keys `@swift-MAJOR.MINOR.PATCH`, `@swift-MAJOR.MINOR`, `@swift-MAJOR`, and the first existing file **wins unconditionally**; (2) otherwise take the newest versioned manifest whose version is `<=` current; use it only if its tools version is **greater** than `Package.swift`'s; (3) else use `Package.swift` if its tools version is loadable; (4) else the versioned one.

**Which manifest each image picks** (fixture `c-versioned/`, `swift package dump-package` and `tools-version`, `name:` identifies the file; runs on swift:6.4.0 and swift:6.3.3):

| Case (Package.swift tools / versioned file and its tools) | swift:6.4 picks | swift:6.3.3 picks |
|---|---|---|
| c1: 6.4 / `@swift-6.3` (6.3) | **Package.swift** (6.4) | `@swift-6.3` |
| c2: 6.2 / `@swift-6.3` (6.3) | **`@swift-6.3`** (shadows Package.swift; `tools-version` prints 6.3.0) | `@swift-6.3` |
| c3: 6.4 / `@swift-6.2` (6.2) | Package.swift | `@swift-6.2` (Package.swift unloadable) |
| c4: 6.4 / `@swift-6` (6.0) | **`@swift-6`** (major marker beats the newer Package.swift) | **`@swift-6`** |
| c5: 6.2 / `@swift-6.4` (6.4) | `@swift-6.4` | Package.swift (6.4 not loadable) |
| c6: 6.2 / `@swift-7` | Package.swift (ignored) | Package.swift |
| c7: 6.2 / `@swift-6.3.3` (6.2) | Package.swift (patch marker does not match 6.4.0) | **`@swift-6.3.3`** |
| c8: no versioned file | Package.swift | Package.swift |

Reading the table: edits to `Package.swift` have no effect on any toolchain a versioned file shadows (c2 on 6.4, c4 everywhere, c7 on 6.3.3), and a major-only or patch marker is chosen on toolchains the author never meant. The commands `ls Package*.swift` and `swift package tools-version` (does the printed version equal the comment in `Package.swift`?) expose this in two seconds.

**Drift is real and measured** (fixture `j-drift/`, each corpus manifest copied as a bare `Package.swift` and dumped on swift:6.4):
- `Alamofire@bda9ed57d729`: `Package.swift` (6.4) platforms `macOS 12, iOS 15, tvOS 15, watchOS 9`; the four `Package@swift-6.0/6.1/6.2/6.3.swift` all `macOS 10.13, iOS 12, tvOS 12, watchOS 4`. A consumer on Swift 6.3 gets a different deployment floor from one on 6.4 for the same release. Each of the four files differs from `Package.swift` by 12 lines (tools line, copyright year, platforms).
- `swift-dependencies@b476cc576105`: `Package.swift` (6.4) platforms `macOS 12 / iOS 15`; `@swift-6.0` and `@swift-6.3` `macOS 10.15 / iOS 13`; the 6.3 and 6.0 files depend on `xctest-dynamic-overlay` where `Package.swift` depends on `swift-issue-reporting`; the 6.0 file drops the traits.
- `swift-collections@935f696a549a`: `Package@swift-6.2.swift` differs by two lines (tools 6.2 and `//.strictMemorySafety(),` commented out at line 111); it is also what a 6.3 toolchain loads, because rule (2) applies. So 6.3 users of collections build without strict memory safety while 6.4 users get it.
- All 15 versioned files in the corpus use `MAJOR.MINOR` markers; none uses a major-only or patch marker (8 repos incl. one SwiftPM fixture). The four libraries at tools 6.4 (Alamofire 4 files, collections 1, TCA 1, dependencies 2) all carry fallbacks; libraries at 6.2 carry only legacy 5.x/6.1 ones (async-algorithms `@swift-5.7`, `@swift-5.8`; protobuf `@swift-6.1`).

**The alternative to a versioned file is usually a conditional in one manifest.** A single `Package.swift` at tools 6.2 with `#if compiler(>=6.4)` around a settings entry yielded `[{"enableUpcomingFeature":{"_0":"ImmutableWeakCaptures"}}]` on swift:6.4 and `[]` on swift:6.3.3 (fixture `l-compiler-if/`); `swift-service-lifecycle@c55297914e26:Package.swift:76-84` uses `#if compiler(<6.2)`. Because unknown settings strings are ignored (section 6), most "different settings per compiler" needs no second file. A versioned file is warranted only when the manifest *API* differs (a symbol gated by `@available(_PackageDescription, introduced: N)`, e.g. `.macOS(.v27)` at 6.4), or when old toolchains must be given different dependencies.

### 12. `platforms:` and Linux-only packages (M-L-14)

- 24 of 38 corpus manifests declare `platforms:` (re-measured): 14 do not (argument-parser, async-algorithms, collections, crypto, distributed-tracing, log, nio, system, grpc-swift-2, SwiftFormat, async-http-client, service-lifecycle, embedded-examples, testing). Forms: `.macOS(.v13)` enum constants (most), and the string form `.macOS("26.2")` (`vapor@bf77fc69b142:Package.swift:6-11`, `swift-foundation` `"26"`, `swift-format` `"13.0"`).
- The parameter is Apple-only: `.linux` does not exist (`Package.swift:3:47: error: type 'SupportedPlatform' has no member 'linux'`, exit 1 on both images, fixture `k-checks/build/plat-linux-hallucinated`). `platforms: [.macOS("26.2"), .iOS("26.2")]` at tools 6.2 loads and builds on Linux (exit 0, both images): Linux ignores it. A Linux-only or Linux-and-server package omits `platforms:` and gates code with `#if os(Linux)` or `condition: .when(platforms: [.linux])` on dependencies (`swift-subprocess@55d30558b8b1:Package.swift:15-19`, which also sets `.iOS("99.0")` to mark iOS as effectively unsupported).
- Constants are tools-gated: `.macOS(.v27)` needs tools 6.4 (`SupportedPlatforms.swift:403`; fixtures `plat-v27-tools63` exit 1 on 6.4 with `'v27' is unavailable`, `plat-v27-tools64` exit 0 on 6.4).
- Which floor an Apple consumer sees, how `Mutex`/`Synchronization` availability interacts with the default deployment target, and Xcode behaviour are **unverified: read only**. What is verified is that the floor may differ between manifests of the same release (section 11).

### 13. Manifest-editing commands (M-L-21)

Subcommands exist on both images: `add-dependency <url-or-path> [--exact|--revision|--branch|--from|--up-to-next-minor-from|--to] [--type url|path|registry]`, `add-target <name> [--type library|executable|test|macro] [--dependencies …] [--testing-library xctest|swift-testing|none]`, `add-target-dependency`, `add-product`, `add-setting --target T --swift upcomingFeature=X|experimentalFeature=X|languageMode=N|StrictMemorySafety` ([PackageAddSetting](https://docs.swift.org/swiftpm/data/documentation/packagemanagerdocs/packageaddsetting.json), `--help` on both images). Run against a copy of the library skeleton (`f-edit/`), all six commands exit 0 on 6.4 and 6.3.3 with identical diffs: `add-dependency file://…/dep62 --from 1.0.0` inserts a `dependencies:` block; `add-target Extras --type library` also creates `Sources/Extras/Extras.swift`; `add-setting` is silent on success and wrote `.enableUpcomingFeature("ImmutableWeakCaptures"),` and `.swiftLanguageMode(.v5),` into the target literal. The output is not formatter-clean: `.target(name: "ExampleKit",dependencies: [` and `.product(…),],swiftSettings: [` on one line; `add-setting --swift languageMode=5` accepted `5` without a word about the package-level 6 mode, and the target then showed up in the `targets-in-v5` jq (a reviewer-visible change, so the `.v5` rule applies to command-made edits too). Use the commands for mechanical edits (they cannot mistype a product name or a URL scheme), then run the formatter and the section-1 read.

### 14. Skeletons (library, CLI, SDK)

All three are formatted with `swift format … --configuration '{"version":1,"indentation":{"spaces":4},"lineLength":120}'` (owner Q2 default), `swift format lint --strict -r` exits 0 on each, and each passed `swift build` and `swift test` (one Swift Testing test) on swift:6.4 and 6.3.3, except the CLI on 6.3.3, which is red by design (tools 6.4). Fixtures: `d-skeletons/{library,cli,sdk}/`. Source files are minimal (a protocol plus a function; an `AsyncParsableCommand`; an `OCX` struct calling `Subprocess.run`) and are not part of the policy.

**Library, tools 6.2** (`d-skeletons/library/Package.swift`):

```swift
// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "ExampleKit",
    products: [
        .library(name: "ExampleKit", targets: ["ExampleKit"])
    ],
    targets: [
        .target(name: "ExampleKit"),
        .testTarget(name: "ExampleKitTests", dependencies: ["ExampleKit"]),
    ],
    swiftLanguageModes: [.v6]
)

// Swift 6.4 has no per-package default settings (SE-0540 is accepted, not shipped): one loop sets them for every target.
for target in package.targets where [.regular, .executable, .test].contains(target.type) {
    target.swiftSettings =
        (target.swiftSettings ?? []) + [
            .enableUpcomingFeature("ExistentialAny"),
            .enableUpcomingFeature("MemberImportVisibility"),
            .enableUpcomingFeature("InternalImportsByDefault"),
            .enableUpcomingFeature("NonisolatedNonsendingByDefault"),
            .enableUpcomingFeature("InferIsolatedConformances"),
            .treatWarning("StrictLanguageFeatures", as: .error),
        ]
}
```

**CLI, tools 6.4** (`d-skeletons/cli/Package.swift`): the same loop and `swiftLanguageModes: [.v6]`, with this head (thin `example` executable over an `ExampleCore` library so the logic is testable; no `defaultIsolation`, owner Q3):

```swift
// swift-tools-version: 6.4
import PackageDescription

let package = Package(
    name: "example",
    products: [
        .executable(name: "example", targets: ["example"])
    ],
    dependencies: [
        .package(url: "https://github.com/apple/swift-argument-parser", from: "1.8.0")
    ],
    targets: [
        .executableTarget(
            name: "example",
            dependencies: [
                "ExampleCore",
                .product(name: "ArgumentParser", package: "swift-argument-parser"),
            ]
        ),
        .target(name: "ExampleCore"),
        .testTarget(name: "ExampleCoreTests", dependencies: ["ExampleCore"]),
    ],
    swiftLanguageModes: [.v6]
)
// … followed by the identical `for target in package.targets where …` loop shown above.
```

**SDK, tools 6.2** (`d-skeletons/sdk/Package.swift`): dependency on swift-subprocess (1.0.1 is the latest tag; tools 6.2), library product `OCXKit`, same loop. The source must `public import Subprocess` because `InternalImportsByDefault` is on and `OCX` exposes `Subprocess.Executable`:

```swift
// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "ocx-sdk-swift",
    products: [
        .library(name: "OCXKit", targets: ["OCXKit"])
    ],
    dependencies: [
        .package(url: "https://github.com/swiftlang/swift-subprocess", from: "1.0.0")
    ],
    targets: [
        .target(
            name: "OCXKit",
            dependencies: [.product(name: "Subprocess", package: "swift-subprocess")]
        ),
        .testTarget(name: "OCXKitTests", dependencies: ["OCXKit"]),
    ],
    swiftLanguageModes: [.v6]
)
// … followed by the identical loop.
```

An earlier draft of the SDK source used `.trimmingCharacters` without `import Foundation` and failed with `has no member 'trimmingCharacters'` (and, in the next draft, `?? ""` on a non-optional `standardOutput` warned): `MemberImportVisibility` is working, and swift-subprocess 1.0.1's `CollectedResult.standardOutput` is `String` for `.string(limit:)` output.

### 15. Corrections to earlier artifacts

- Map M-L-01's check `jq '.toolsVersion, .swiftLanguageModes'` returns `null` for modes (section 1): use `.toolsVersion._version, .swiftLanguageVersions`.
- Map conflict 8 lists "service-lifecycle 2.12" among dependencies that "require tools >= 6.2"; 2.12.0 and 2.12.1 declare **6.1** (`swift-service-lifecycle@c55297914e26:Package.swift:1`; release-tag manifests read). swift-log reached 6.2 by 1.15.0, not 1.16.
- The shifts scout dated the 6.4 release 2026-09-14 (releases.json); the release post is dated September 15, 2026 ([swift.org](https://www.swift.org/blog/swift-6.4-released/)).
- Shifts §17 says the 6.3 template wrote `swiftLanguageModes: [.v6]` and 6.4 does not: confirmed, plus the 6.4 template's tools version is 6.4 (over-floor for a library).

## Normative guidance candidates

IDs are working names (`MP-nn`); consolidation assigns final `SW-PKG-nn`. "Run" says whether the verification was watched go red on a planted violation and green on a compliant twin (fixtures under `~/.cache/research-lang/swift-tools/fixtures/manifest-policy/`, results in `results/`). For every grep or find below, **the output is the violation; empty output is a pass** (ignore the exit status of `grep -L`). Commands run from the package or repository root.

**MP-01. Read the floor first (M-K-04).** Before editing a manifest, run the section-1 command: `swift --version && ls Package*.swift && swift package tools-version && swift package dump-package | jq -c '{tools: .toolsVersion._version, packageModes: .swiftLanguageVersions, targets: [.targets[] | select(.type == "regular" or .type == "executable" or .type == "test") | {name, features: [.settings[].kind | to_entries[] | "\(.key)=\(.value._0 // "")"]}]}'`. Never `head -1 Package.swift`; never `.swiftLanguageModes`.
Rationale: the tools-version comment may be on line 2 or 3; the dump key is `swiftLanguageVersions`; a versioned file may be what loads.
Verify: the command itself; the wrong forms go red: `head -1 Package.swift` printed `// Copyright header` for a tools-6.2-on-line-3 manifest, and `jq -c '[.toolsVersion._version, .swiftLanguageModes]'` printed `["6.2.0",null]` for a package with `swiftLanguageModes: [.v5]` (the right key printed `["6.2.0",["5"]]`).
Run: yes (V08-V10).

**MP-02. Floors by kind (M-L-01).** Library and SDK manifests declare `// swift-tools-version: 6.2`; CLI and server manifests declare the current release (`6.4`); no new manifest declares less than 6.2; a library is not raised above 6.2 without a feature or dependency that requires it, recorded in the commit message.
Rationale: 6.2 is the first tools version with `treatWarning`, `strictMemorySafety`, `defaultIsolation` and the relaxed unsafeFlags rule; tools 6.3/6.4 add nothing a library needs but strand 6.3 consumers silently (sections 2, 3).
Verify: (a) below the floor, any package: `grep -rL -e 'swift-tools-version: *6\.[2-9]' -e 'swift-tools-version: *6\.[1-9][0-9]' -e 'swift-tools-version: *[7-9]\.' --include='Package.swift' .` (lists manifests below 6.2); (b) a library above its floor, run on library paths only: `grep -rL -e 'swift-tools-version: *6\.2' --include='Package.swift' LIBRARY_DIR` replaced by the library's actual directory (lists libraries not at 6.2); (c) CI leg on the floor image (swift:6.2) and the current image.
Run: (a) yes, listed `floor/lib-61/Package.swift`, silent on 6.2/6.2.1/6.4; (b) yes, listed the 6.4 template and a 6.4 library, silent on the 6.2 library, SDK and library skeletons; (c) no, no swift:6.2 image on this host (6.3 stood in: library and SDK skeletons green, CLI red by design).

**MP-03. Swift 6 mode is stated.** Every manifest has `swiftLanguageModes: [.v6]` (package level) or `.swiftLanguageMode(.v6)` in its shared settings.
Rationale: tools 6.x defaults to mode 6 but the 6.4 template omits it; an explicit statement is what readers and greps see.
Verify: `grep -rL -e 'swiftLanguageModes: *\[\.v6' -e 'swiftLanguageMode(\.v6)' --include='Package.swift' .` (lists manifests that never state mode 6).
Run: yes: listed the 6.4 `init` template and a `[.v5]` manifest; silent on the 6.3 template and the three skeletons.

**MP-04. `.v5` is per target with a same-line reason and tracker (M-L-02).** Package-level `swiftLanguageModes: [.v5]` (or the deprecated `swiftLanguageVersions: [.v5]`) is forbidden; `.swiftLanguageMode(.v5)` appears only on a line that also carries a `//` comment with a date and a public tracker or removal condition.
Rationale: a package-level 5 hides every target from the 6 checks (Alamofire); a per-target exemption is a visible, dated debt (`swift-build@2187330e13e7:Package.swift:345`).
Verify: package level: `grep -rnE -e 'swiftLanguageModes: *\[\.v5' -e 'swiftLanguageVersions: *\[\.v5' --include='Package*.swift' .`; no reason: `grep -rnE 'swiftLanguageMode\(\.v5\)[^/]*$' --include='Package*.swift' .`; inventory of 5-mode targets: `swift package dump-package | jq -r '.targets[] | select([.settings[].kind.swiftLanguageMode._0] | index("5")) | .name'`.
Run: yes: all three red on planted manifests (package-level, uncommented target, a target made by `add-setting --swift languageMode=5`), all silent on the commented-target twin and the skeletons.

**MP-05. Upcoming features, spelled out (M-L-04).** Every `.regular`, `.executable` and `.test` target of a new package enables exactly the five names `ExistentialAny`, `MemberImportVisibility`, `InternalImportsByDefault`, `NonisolatedNonsendingByDefault`, `InferIsolatedConformances`, as `.enableUpcomingFeature("…")` entries (via the loop of MP-09); the pseudo-feature `ApproachableConcurrency` is not used in its place; `ImmutableWeakCaptures` is not added to a package whose floor is below 6.3.
Rationale: section 5; the five exist at the 6.2 floor, are greppable, and the bundle adds only two features in a Swift 6 target.
Verify: effective per-target audit, output = missing features: `swift package dump-package | jq -r --argjson need '["ExistentialAny","MemberImportVisibility","InternalImportsByDefault","NonisolatedNonsendingByDefault","InferIsolatedConformances"]' '.targets[] | select(.type == "regular" or .type == "executable" or .type == "test") | .name as $n | ([.settings[].kind.enableUpcomingFeature._0 // empty]) as $have | ($need - $have) | select(length > 0) | "\($n): missing \(join(","))"'`.
Run: yes: red on the 6.4 `init` template (`Tmpl: missing ExistentialAny,MemberImportVisibility,InternalImportsByDefault,NonisolatedNonsendingByDefault,InferIsolatedConformances`, same for `TmplTests`) and on an inline manifest with no features; silent on the library, CLI (6.4 image) and SDK skeletons. Existing packages adopt one feature at a time with `swift package migrate` (MP-10) and a build on both images; this rule is for new packages and for packages whose migration finished.

**MP-06. No Swift-6-group names in a Swift 6 target.** None of the 15 names `ConciseMagicFile`, `ForwardTrailingClosures`, `StrictConcurrency`, `BareSlashRegexLiterals`, `DeprecateApplicationMain`, `ImportObjcForwardDeclarations`, `DisableOutwardActorInference`, `IsolatedDefaultValues`, `GlobalConcurrency`, `InferSendableFromCaptures`, `ImplicitOpenExistentials`, `RegionBasedIsolation`, `DynamicActorIsolation`, `NonfrozenEnumExhaustivity`, `GlobalActorIsolatedTypesUsability` appears in `enableUpcomingFeature` except in a target pinned to `.swiftLanguageMode(.v5)`.
Rationale: warned as redundant on 6.3 and 6.4; an error under `.treatAllWarnings(as: .error)`.
Verify: `grep -rn -e 'enableUpcomingFeature("ConciseMagicFile")' -e 'enableUpcomingFeature("ForwardTrailingClosures")' -e 'enableUpcomingFeature("StrictConcurrency")' -e 'enableUpcomingFeature("BareSlashRegexLiterals")' -e 'enableUpcomingFeature("DeprecateApplicationMain")' -e 'enableUpcomingFeature("ImportObjcForwardDeclarations")' -e 'enableUpcomingFeature("DisableOutwardActorInference")' -e 'enableUpcomingFeature("IsolatedDefaultValues")' -e 'enableUpcomingFeature("GlobalConcurrency")' -e 'enableUpcomingFeature("InferSendableFromCaptures")' -e 'enableUpcomingFeature("ImplicitOpenExistentials")' -e 'enableUpcomingFeature("RegionBasedIsolation")' -e 'enableUpcomingFeature("DynamicActorIsolation")' -e 'enableUpcomingFeature("NonfrozenEnumExhaustivity")' -e 'enableUpcomingFeature("GlobalActorIsolatedTypesUsability")' --include='Package.swift' .` (each hit must sit in a 5-mode target; the MP-04 inventory lists those).
Run: yes: grep listed `GlobalConcurrency` and `StrictConcurrency` lines in the planted manifest and nothing in the skeletons; build: Swift 6 target + `.treatAllWarnings(as: .error)` exit 1 on both images, the `.v5` twin exit 0.

**MP-07. Guard feature names (M-L-04).** Root manifests of libraries, SDKs and CLIs include `.treatWarning("StrictLanguageFeatures", as: .error)` in the shared settings and every build runs on a toolchain that knows all listed names.
Rationale: unknown names are otherwise ignored silently; the guard is root-only, so it cannot fail a dependent's build; vapor and async-algorithms ship dead names.
Verify: `swift build` fails with `is not a recognized upcoming feature [#StrictLanguageFeatures::UnrecognizedStrictLanguageFeatures]` (6.4) or `[#UnrecognizedStrictLanguageFeatures]` (6.3); presence check, output = manifests without the guard: `grep -rL -e 'treatWarning("StrictLanguageFeatures", as: .error)' --include='Package.swift' .`.
Run: yes: `typo-strict` exit 1 and `typo-lax` exit 0 on both images; consumer of a package with the typo and the guard exit 0; skeletons carry the guard and build green.

**MP-08. No experimental features except `AvailabilityMacro=`.** `.enableExperimentalFeature(...)` is absent from fleet manifests; the exception is `AvailabilityMacro=…`, and any other use carries a same-line reason naming the SE or issue.
Rationale: experimental names are removed or promoted without notice (`SuppressedAssociatedTypesWithDefaults` is already unrecognised).
Verify: `grep -rnP 'enableExperimentalFeature\((?!"AvailabilityMacro=)' --include='Package*.swift' .`.
Run: yes: listed two lines in a planted manifest; silent on the AvailabilityMacro twin and the skeletons.

**MP-09. Shared settings: one post-definition loop; no bare variable; no `defaultSwiftSettings` (M-L-06).** Settings common to all targets are applied by one `for target in package.targets where [.regular, .executable, .test].contains(target.type)` loop after `Package(...)`; per-target extras go inline; `swiftSettings: someVariable` (a bare identifier) and `defaultSwiftSettings:` / `.defaults` do not appear.
Rationale: SE-0540 is unshipped (manifest compile error on 6.4); a bare variable defeats `swift package migrate`; the loop is migrate-compatible and visible in `dump-package`.
Verify: `grep -rn -e '^[^/]*defaultSwiftSettings' -e '^[^/]*\.defaults\b' --include='Package.swift' .`; `grep -rnE 'swiftSettings: *[A-Za-z_][A-Za-z0-9_]*,? *\)?,? *$' --include='Package.swift' .` (finds `swiftSettings: swiftSettings,` and `: common`; does not match `swiftSettings(languageMode:)` calls or `common + [...]`).
Run: yes: both red on planted manifests (and the manifest itself fails to compile, exit 1), both silent on the skeletons, the loop, inline and `common + [...]` forms. When SE-0540 ships (watch #10033), re-run this section and move the loop body into `defaultSwiftSettings`.

**MP-10. Adopt features with `swift package migrate`, from a clean tree (M-L-21).** Enable a new upcoming feature on an existing package with `swift package migrate --to-feature NAME [--targets T]` from a clean working tree, never by editing the list first; if it exits 1, `git diff` and `git checkout -- Sources` (the sources were already rewritten), restructure the manifest per MP-09, and retry.
Rationale: the tool applies source fix-its that preserve behaviour; it fails closed on a bare variable but only after touching sources.
Verify: exit status and `git status --short` after the command (manifest and sources both modified on success; sources-only modified means it failed).
Run: yes: bare variable exit 1 with sources modified and manifest untouched; inline, `common + [...]`, `common + []`, no-settings and loop manifests exit 0 on both images.

**MP-11. unsafeFlags only at tools >= 6.2, harmless, or off for consumers (M-L-07).** A manifest containing `unsafeFlags` declares tools 6.2 or later; its flags are diagnostic-only (the corpus set: `-require-explicit-sendable`, `-require-explicit-availability=error`); a package that must stay below 6.2 gates the flag behind a CI-only compile condition; anything a typed `SwiftSetting` covers uses the typed setting.
Rationale: below 6.2 a version-pinned consumer's build fails; at 6.2+ SwiftPM no longer protects consumers from the flag.
Verify: `grep -rl -e 'unsafeFlags' --include='Package.swift' . | xargs -r grep -L -e 'swift-tools-version: *6\.[2-9]' -e 'swift-tools-version: *6\.[1-9][0-9]' -e 'swift-tools-version: *[7-9]\.'` (lists manifests with unsafeFlags below 6.2); review list: `grep -rn -e 'unsafeFlags' --include='Package*.swift' .`.
Run: yes: grep red on the tools-6.1 dependency, silent on its tools-6.2 twin; builds: consumer of the 6.1 dependency exit 1 with `contains unsafe build flags`, of the 6.2 twin exit 0, of the 6.1 dependency by branch and by path exit 0 (6.4 and 6.3.3).

**MP-12. No versioned manifests by default; if one exists it is older, `MAJOR.MINOR`, and in sync (M-L-15).** Do not create `Package@swift-X.swift`. When a package must serve a toolchain older than its `Package.swift` tools version, the versioned file (a) is named `Package@swift-MAJOR.MINOR.swift`, never `@swift-MAJOR` or `@swift-MAJOR.MINOR.PATCH`, (b) has a strictly lower tools version than `Package.swift`, (c) keeps identical products, targets, dependencies and platform floors, and (d) is covered by a CI leg on its toolchain. Before editing any manifest in a directory that has one, run `ls Package*.swift` and `swift package tools-version`: if the printed version is not the one in the `Package.swift` comment, a versioned file shadows it.
Rationale: an exact marker wins over a newer `Package.swift` (c4, c7); a versioned file with a higher tools version shadows (c2); real packages drifted on platforms, dependency URLs and traits (section 11).
Verify: names: `find . -name 'Package@swift-[0-9].swift' -o -name 'Package@swift-[0-9]*.[0-9]*.[0-9]*.swift'` (lists major-only and patch markers); tools-version table: `grep -rn -e 'swift-tools-version' --include='Package*.swift' .` (every `Package@swift-*` line must be lower than the `Package.swift` line of the same directory; named reading heuristic); shadow check: `swift package tools-version` against the `Package.swift` comment.
Run: yes for the find (red on `Package@swift-6.swift` and `Package@swift-6.3.3.swift`, silent on `@swift-6.3`/`@swift-6.2` twins), yes for the shadow check (6.3.0 printed against a 6.2 comment); the tools-version table comparison is a reading heuristic.

**MP-13. Prefer `#if compiler(...)` in one manifest to a second manifest.** Settings that differ by compiler are gated with `#if compiler(>=6.4)` inside the loop; a versioned file is justified only by PackageDescription API that the older tools version lacks.
Rationale: one file cannot drift; measured: the same Package.swift produced `ImmutableWeakCaptures` on 6.4 and nothing on 6.3.
Verify: reading heuristic: any `Package@swift-*.swift` diff vs `Package.swift` must contain a tools-gated API symbol (compare with `swift package dump-package` of both copied to bare directories, as in `j-drift/run.sh`).
Run: yes for the mechanism (`l-compiler-if/`); the diff heuristic is a reading heuristic.

**MP-14. `platforms:` is Apple-only and declared once (M-L-14).** Declare `platforms:` only for the Apple floors the code needs; never write `.linux` or any non-Apple constant; use `.vNN` constants no newer than the manifest's tools version; a Linux-only package omits the argument; if versioned manifests exist, every one carries the same `platforms:`.
Rationale: `.linux` is a manifest compile error; `.v27` needs tools 6.4; Linux ignores the list; floors drifted between Alamofire's manifests.
Verify: `swift package dump-package | jq -c '[.platforms[] | "\(.platformName)\(.version)"]'` and `grep -rn -e 'platforms:' --include='Package*.swift' .` for review; compile: `swift build` (red as listed).
Run: yes for the compile failures (`plat-linux-hallucinated` exit 1 on both, `plat-v27-tools63` exit 1 on 6.4, `plat-string-tools62` exit 0 on both) and the cross-manifest comparison (`j-drift`); the Apple deployment semantics are unverified: read only.

**MP-15. Mechanical edits go through `swift package add-*`/`migrate`, then format and re-read (M-L-21).** Use `swift package add-dependency`, `add-target`, `add-target-dependency`, `add-product`, `add-setting` for edits they cover; follow with `swift format format --in-place Package.swift` under the repo's `.swift-format` and MP-01.
Rationale: no typo in product or URL syntax; but the output is unformatted and `add-setting languageMode=5` silently adds a `.v5` target.
Verify: MP-01 before and after; `swift format lint --strict Package.swift` after.
Run: partly: the commands exit 0 on both images (no red exists for "should have used the command"); the format lint went red on the raw output of the default 2-space config and green with the 4-space/120 config on the skeletons.

**MP-16. No default MainActor isolation in libraries, SDKs, CLIs, servers (owner Q3).** `defaultIsolation(MainActor.self)` appears only in app targets.
Rationale: consumers compile library code under their own default isolation; the corpus has 0 root manifests with it.
Verify: `grep -rn -e 'defaultIsolation(MainActor' --include='Package*.swift' .` (each hit must be an app target).
Run: yes: red on a planted library manifest, silent on the skeletons.

**MP-17. No pre-6 manifest idioms.** No `swiftLanguageVersions:`, no `.enableExperimentalFeature("StrictConcurrency")`, no `-strict-concurrency` flag, no `// swift-tools-version:5.x` in new packages.
Rationale: deprecated or superseded since 6.0; they compile and mislead (`swiftLanguageVersions` warns `replaced by 'init(...swiftLanguageModes:...)'`, the experimental form builds green and does nothing the mode does not).
Verify: `grep -rn -e 'swiftLanguageVersions:' -e 'enableExperimentalFeature("StrictConcurrency' -e 'strict-concurrency' --include='Package*.swift' .`.
Run: yes: red on both planted idioms, silent on the skeletons.

**MP-18. Raise a floor only deliberately.** Raising `swift-tools-version` of a published library is a release-note event: confirm with a `swift package resolve` on the previous toolchain image that consumers there still resolve what you intend, and do not commit a `Package.resolved` made on a newer toolchain than the CI floor.
Rationale: `from:` consumers on older toolchains silently stay on the old release; `exact:` consumers fail (section 2).
Verify: CI job on the floor image: `swift package resolve && swift build`; named reading heuristic for the release note.
Run: yes for the behaviour (6.4 resolved 1.1.0, 6.3.3 resolved 1.0.0 exit 0, `exact: 1.1.0` exit 1 on 6.3.3); the CI-job form is not run (no 6.2 image).

## Verification runs

Logs for every run are in `fixtures/manifest-policy/results/` (`a-64.txt`, `a-63.txt`, …); each fixture directory has its `run.sh`, run inside the image with `~/.cache/research-lang/swift-tools/run.sh bash <fixture>/run.sh` (`SWIFT_VERSION=6.3` for the second image); all builds use `--scratch-path "$SWIFT_SCRATCH/manifest-policy/<name>"`. Exit codes are for swift:6.4 / swift:6.3.3 when they differ. "Red" = watched failing on the violation.

| # | Fixture | Command (abridged) | Violation (red) | Compliant twin (green) | Key output |
|---|---|---|---|---|---|
| V01 | `a-unsafeflags/` | `swift build --package-path consumer-on-dep61 --scratch-path "$SWIFT_SCRATCH/manifest-policy/a-…"` | dep at tools 6.1: exit 1 / 1 | dep at 6.2: exit 0 / 0; dep61 by `branch:` exit 0 / 0; by `path:` exit 0 / 0 | `error: 'consumer-on-dep61': the target 'Dep' in product 'Dep' contains unsafe build flags` |
| V02 | `k-checks/` | `grep -rl -e 'unsafeFlags' --include='Package.swift' DIR \| xargs -r grep -L -e 'swift-tools-version: *6\.[2-9]' -e …` | lists `../a-unsafeflags/dep61/Package.swift` (pipeline exit 123) | silent on dep62 (exit 0) | one line |
| V03 | `b-migrate/` | `swift package --package-path work-V/shared-var --scratch-path … migrate --to-feature ExistentialAny` | bare variable: exit 1 / 1 | `plus-empty`, `plus-expr`, `loop`, `inline`, `inline-nosettings`: exit 0 / 0 | `error: Could not update manifest to enable requested features for target 'Lib' (unable to find array literal for 'swiftSettings' argument) …`; sources `any Shape` already written, manifest unchanged |
| V04 | `k-checks/` | `grep -rnE 'swiftSettings: *[A-Za-z_][A-Za-z0-9_]*,? *\)?,? *$' --include='Package.swift' DIR` | `../b-migrate/shared-var/Package.swift:12:` (exit 0) | silent on loop, inline, plus-expr, skeletons (exit 1) | |
| V05 | `c-versioned/` | `swift package --package-path cN dump-package` + `tools-version` | c2 on 6.4 picks the shadowing `@swift-6.3` (`v63-file`, `6.3.0`); c4 picks `@swift-6` on both images | c1 on 6.4 picks Package.swift; c8 picks Package.swift | matrix in section 11 |
| V06 | `k-checks/` | `find DIR -name 'Package@swift-[0-9].swift' -o -name 'Package@swift-[0-9]*.[0-9]*.[0-9]*.swift'` | lists `Package@swift-6.swift`, `Package@swift-6.3.3.swift` | silent on c1, c3 | |
| V07 | `c-versioned/` | `swift package --package-path c10-… dump-package` | tools 5.9 on line 3: exit 1 / 1 | tools 6.2 on line 3: exit 0 / 0 | `the manifest is backward-incompatible with Swift < 6.0 because the tools-version was specified in a subsequent line of the manifest, not the first line` |
| V08 | `k-checks/` | `head -1 …/c9-header-line3-62/Package.swift` | prints `// Copyright header` | `grep -n -m1 -e 'swift-tools-version' …` prints `3:// swift-tools-version: 6.2`; `swift package tools-version` prints `6.2.0` | |
| V09 | `k-checks/` | `swift package … dump-package \| jq -c '[.toolsVersion._version, .swiftLanguageModes]'` | `["6.2.0",null]` | `.swiftLanguageVersions` gives `["6.2.0",["5"]]` | |
| V10 | `k-checks/` | the MP-01 command in the library, 6.4-template and shadowed directories | not a red/green check | prints the dump views quoted in section 1 | NOT watched red (a read command, not a gate) |
| V11 | `p1-modes/` | `swift build -v … \| grep -e '-module-name Lib' \| grep -o -e '-swift-version [0-9]' \| sort -u` | n/a (observational table) | m1..m8 as in section 1 | |
| V12 | `k-checks/` | `grep -rL -e 'swift-tools-version: *6\.[2-9]' -e 'swift-tools-version: *6\.[1-9][0-9]' -e 'swift-tools-version: *[7-9]\.' --include='Package.swift' DIR` | lists `floor/lib-61/Package.swift` | silent on 6.2, `6.2.1`, 6.4 | |
| V13 | `k-checks/` | `grep -rL -e 'swift-tools-version: *6\.2' --include='Package.swift' DIR` | lists `floor/lib-64` and `../h-init/t64` | silent on `floor/lib-62`, library and SDK skeletons | |
| V14 | `k-checks/` | `grep -rL -e 'swiftLanguageModes: *\[\.v6' -e 'swiftLanguageMode(\.v6)' --include='Package.swift' DIR` | lists `../h-init/t64` and `v5/pkg-level` | silent on `h-init/t63` and the three skeletons | |
| V15 | `k-checks/` | `grep -rnE -e 'swiftLanguageModes: *\[\.v5' -e 'swiftLanguageVersions: *\[\.v5' --include='Package*.swift' DIR` | `v5/pkg-level/Package.swift:3` | silent | |
| V16 | `k-checks/` | `grep -rnE 'swiftLanguageMode\(\.v5\)[^/]*$' --include='Package*.swift' DIR` | `v5/target-nocomment/Package.swift:4` | silent on `v5/target-commented` | |
| V17 | `k-checks/` | the 15-`-e` grep of MP-06 on `feat` | `feat/v6group/Package.swift:6,7` | silent on `../d-skeletons` | |
| V18 | `k-checks/build/` | `swift build --package-path build/redundant-v6-mode6 …` | exit 1 / 1: `upcoming feature 'GlobalConcurrency' already enabled as of the Swift 6 language mode` | `redundant-v6-mode5` exit 0 / 0 | |
| V19 | `e-features/` | `swiftc -typecheck -swift-version 6 -Werror StrictLanguageFeatures -enable-upcoming-feature NAME f.swift` | `NonIsolatedNonsendingByDefault`, `StrictMemorySafety`, `FlowSensitiveConcurrencyCaptures`: exit 1 / 1; `LifetimeDependence`, `Lifetimes`, `SuppressedAssociatedTypesWithDefaults`, `BuiltinModule` as upcoming: exit 1 | 21 names + `ApproachableConcurrency`: exit 0 / 0 (the 15 `v6` names with the redundancy warning) | identical on both images |
| V20 | `k-checks/build/` | `swift build` | `typo-strict`: exit 1 / 1: `'NonIsolatedNonsendingByDefault' is not a recognized upcoming feature [#StrictLanguageFeatures::UnrecognizedStrictLanguageFeatures]` | `typo-lax` exit 0 / 0 (silent); `typo-correct-strict` exit 0 / 0 | |
| V21 | `g-strict/` | `swift build --package-path consumer-of-strict …` | dependency with the typo and guard, built as root: exit 1 / 1 | the same dependency as a version dependency of a consumer: exit 0 / 0 | consumer compile line has `-suppress-warnings` and no `-Werror StrictLanguageFeatures` |
| V22 | `k-checks/` | `grep -rnP 'enableExperimentalFeature\((?!"AvailabilityMacro=)' --include='Package*.swift' DIR` | `exp/stale/Package.swift:5,6` | silent on `exp/availability-macro`, skeletons | |
| V23 | `k-checks/` | the MP-05 `jq` audit | 6.4 template: both targets missing all five (exit 0, 2 lines); inline manifest: `Lib: missing …` | library, CLI, SDK skeletons: no output | CLI skeleton audit needs the 6.4 image |
| V24 | `k-checks/` | `swift package … dump-package \| jq -r '.targets[] \| select([.settings[].kind.swiftLanguageMode._0] \| index("5")) \| .name'` | lists `ExampleKit` (target made `.v5` by `add-setting`) | library skeleton: none | |
| V25 | `k-checks/` | `grep -rn -e '^[^/]*defaultSwiftSettings' -e '^[^/]*\.defaults\b' --include='Package.swift' DIR`; `swift build --package-path build/default-settings-6.4` | grep lists `default/uses-default/Package.swift:5,6`; build exit 1 on 6.4: `extra argument 'defaultSwiftSettings' in call` | skeletons silent | the first grep draft matched a comment in the skeletons (false positive), fixed with `^[^/]*` |
| V26 | `k-checks/` | `grep -rn -e 'defaultIsolation(MainActor' --include='Package*.swift' DIR` | `iso/mainactor-lib/Package.swift:4` | skeletons silent | |
| V27 | `k-checks/` | `grep -rn -e 'swiftLanguageVersions:' -e 'enableExperimentalFeature("StrictConcurrency' -e 'strict-concurrency' --include='Package*.swift' DIR` | `old/bad`, `old/bad2` | skeletons silent | `swiftLanguageVersions` also builds with a deprecation warning, exit 0 |
| V28 | `k-checks/build/` | `swift build` on `plat-*` | `plat-linux-hallucinated` exit 1 / 1 (`type 'SupportedPlatform' has no member 'linux'`); `plat-v27-tools63` exit 1 on 6.4 (`'v27' is unavailable`, note `introduced in PackageDescription 6.4`); `treatwarning-tools61` exit 1 / 1 (`'treatWarning(_:as:_:)' is unavailable`) | `plat-string-tools62` exit 0 / 0; `plat-v27-tools64` exit 0 on 6.4 | |
| V29 | `d-skeletons/` | `swift build` and `swift test --package-path D --scratch-path …` | CLI (tools 6.4) on 6.3.3: exit 1 / 1: `package 'cli' is using Swift tools version 6.4.0 but the installed version is 6.3.3` | library, CLI (6.4), SDK: build 0, test 0; library and SDK also 0 / 0 on 6.3.3 | Swift Testing: `Test run with 1 test in 0 suites passed` |
| V30 | `i-resolve/` | `swift package --package-path work-V/consumer-exact … resolve` | `exact: "1.1.0"` on 6.3.3: exit 1: `Dependencies could not be resolved because 'dep-multi' 1.1.0 contains incompatible tools version (6.4.0)` | `from: "1.0.0"`: 6.4 resolves 1.1.0, 6.3.3 resolves 1.0.0 (exit 0) | |
| V31 | `f-edit/` | six `swift package add-*` commands | none (observational) | all exit 0 on both images, identical manifest diff | NOT watched red: no violation to plant for "should have used a command" |
| V32 | `d-skeletons/` | `swift format lint --strict --configuration '{"version":1,"indentation":{"spaces":4},"lineLength":120}' -r Package.swift Sources Tests` | raw `add-*` output and the default 2-space config: findings (`[TrailingComma]`, `[Indentation]`, exit non-zero) | the skeletons after `format --in-place`: exit 0 | |
| V33 | `l-compiler-if/` | `swift package dump-package \| jq -c '[.targets[].settings[].kind]'` | n/a | 6.4: one `enableUpcomingFeature` entry; 6.3.3: `[]` from the same file | |
| V34 | `j-drift/` | each corpus manifest copied to its own dir; `swift package dump-package \| jq …` | Alamofire: `Package.swift` platforms `macos12.0 ios15.0 tvos15.0 watchos9.0` vs four versioned files `macos10.13 ios12.0 tvos12.0 watchos4.0` | collections: `@swift-6.2` identical platforms and traits | |

Watched red: 26 of the 34 runs (V01-V09, V12-V20, V22-V30; V21 was red only for the dependency built as root, and V10, V11, V31, V33, V34 are observational or read-only). Not run at all: any swift:6.2 compile; any macOS, Xcode or Windows behaviour.

## Exemplar evidence

All SHAs are 12-character prefixes of the exemplar corpus clones (`swift-audit/scratch/exemplar-shas.md`) except `swift-subprocess@55d30558b8b1`, which is outside the corpus and was read from GitHub (main and tags 1.0.0 / 1.0.1) because it is the SDK's dependency.

| Rule | Satisfies | Violates or contradicts |
|---|---|---|
| MP-01 | 37 of 38 root manifests have the tools-version comment on line 1 | `vapor@bf77fc69b142:Package.swift:1-2`: line 1 is `import CompilerPluginSupport`, tools-version on line 2; `head -1` misreads it |
| MP-02 | 16/38 at 6.2 incl. `swift-log@4038b6a4f74a:Package.swift:1`, `swift-crypto@1c80d3aff53f:Package.swift:1`, `swift-async-algorithms@cbde9aed744b:Package.swift:1`, `swift-subprocess@55d30558b8b1:Package.swift:1` | libraries at 6.4: `Alamofire@bda9ed57d729:Package.swift:1`, `swift-collections@935f696a549a:Package.swift:1`, `swift-dependencies@b476cc576105:Package.swift:1`, `swift-composable-architecture@bc2db5ba8ad3` (all need versioned fallbacks); libraries below 6.2: `swift-nio@e12881f2a691:Package.swift:1` (6.1), `swift-system@486d48c80fce:Package.swift:1` (6.1), `swift-argument-parser@efd239f0055b:Package.swift:1` (6.0) (they cannot use `treatWarning`; swift-system and async-http-client gate their unsafeFlags) |
| MP-03 | `swift-subprocess@55d30558b8b1:Package.swift:27` (`.swiftLanguageMode(.v6)` in shared settings); 7 manifests with `swiftLanguageModes` incl. `.v6` (container-plugin, protobuf, system, TCA, dependencies, sourcekit-lsp, swift-build) | 6.4 `swift package init` template (`h-init/t64`); most 6.2 manifests state nothing and rely on the default |
| MP-04 | `swift-build@2187330e13e7:Package.swift:345` (dated, radar), `swift-collections@935f696a549a:Package.swift:324-325` (FIXME with symptom), `swift-service-lifecycle@c55297914e26:Package.swift:76-84` (`#if compiler(<6.2)` with reason) | `Alamofire@bda9ed57d729:Package.swift:52` (`swiftLanguageModes: [.v5]` at tools 6.4, no reason); swift-snapshot-testing, swift-format, SwiftPM and tuist also declare package-level `[.v5]` |
| MP-05 | `vapor@bf77fc69b142:Package.swift:246-260` lists the five (plus `ImmutableWeakCaptures`); `swift-subprocess@55d30558b8b1:Package.swift:20-27,49-53` lists `ExistentialAny`, `MemberImportVisibility`, `InternalImportsByDefault`, and `NonisolatedNonsendingByDefault` on the library target; `swift-async-algorithms@cbde9aed744b:Package.swift:79-83,155-159` lists the five | counts over 38 manifests: `MemberImportVisibility` 19, `ExistentialAny` 15, `InternalImportsByDefault` 11, `NonisolatedNonsendingByDefault` 7, `InferIsolatedConformances` 7, `ImmutableWeakCaptures` 3; the rest of the corpus lists none |
| MP-06 | most manifests | `swift-build@2187330e13e7:Package.swift:30-54` lists the v6 group, but only for its `.v5` targets (the right use); `StrictConcurrency` etc. appear in 4 more manifests (`InferSendableFromCaptures` 4, `ConciseMagicFile` 2, …) whose modes were not checked per target |
| MP-07 | none uses the guard (0/38 contain `StrictLanguageFeatures`) | dead names: `vapor@bf77fc69b142:Package.swift:254,257`, `swift-async-algorithms@cbde9aed744b:Package.swift:75,78,151,154`, `swift-collections@935f696a549a:Package.swift:118`; `swift-testing@c7d68ca20cd7:Package.swift:436-438` documents that dependency warnings are suppressed |
| MP-08 | `swift-collections@935f696a549a:Package.swift:105-107` (AvailabilityMacro) | `Lifetimes` in 8/38, `StrictConcurrency` as experimental in 7/38, `SuppressedAssociatedTypesWithDefaults` in 3/38 |
| MP-09 | loop: `swift-log@4038b6a4f74a:Package.swift:51-73`, `swift-dependencies@b476cc576105:Package.swift:140-143` (11/38 loop); `+` form: `swift-subprocess@55d30558b8b1:Package.swift:49-53` | bare `swiftSettings: swiftSettings` at `vapor@bf77fc69b142:Package.swift:140,153,163` (a computed var, `migrate` would fail); helper function `swift-build@2187330e13e7:Package.swift:30` |
| MP-10 | n/a (workflow) | n/a |
| MP-11 | `swift-log@4038b6a4f74a:Package.swift:1,71` (6.2 + `-require-explicit-sendable`); gated at lower tools: `swift-system@486d48c80fce:Package.swift:69-72`, `async-http-client@017115279d09:Package.swift:18-26` | no corpus package ships ungated unsafeFlags below 6.2 (10/38 contain the token) |
| MP-12 | `swift-protobuf` and `swift-async-algorithms` carry only older files, all `MAJOR.MINOR` | 15 files in 8 repos, none major-only; drift: `Alamofire@bda9ed57d729` (platforms), `swift-dependencies@b476cc576105` (platforms, dependency URL, traits), `swift-collections@935f696a549a:Package@swift-6.2.swift:111` (strictMemorySafety commented out) |
| MP-13 | `swift-service-lifecycle@c55297914e26:Package.swift:76-84` | the four 6.4 libraries use files instead |
| MP-14 | `vapor@bf77fc69b142:Package.swift:6-11` (string form), 14/38 omit `platforms:` | `Alamofire@bda9ed57d729:Package.swift` vs its four versioned files (macOS 12 vs 10.13) |
| MP-16 | 0/38 root manifests set `defaultIsolation` (map conflict 4 records 9 app-internal packages in IceCubesApp outside the root scan) | n/a |
| MP-17 | most manifests | `swift-snapshot-testing`, `swift-protobuf` and others still use `swiftLanguageModes: [.v5, .v6]` mixtures; the experimental `StrictConcurrency` form appears in 7/38 (async-algorithms `:63,:90,:98,:139`) |

## AI-agent angle

| What an LLM characteristically does | Why it is wrong | Smallest mechanical check |
|---|---|---|
| Reads the floor with `head -1 Package.swift` or `jq .swiftLanguageModes` and concludes "no language mode declared" | tools-version can be on line 2 or 3; the dump key is `swiftLanguageVersions` | MP-01 command (red runs V08, V09) |
| Writes `defaultSwiftSettings:` / `.defaults` after reading WWDC26 or SE-0540 text | accepted, not shipped; manifest compile error on 6.4 | MP-09 grep; `swift package dump-package` exit 1 (V25) |
| Copies a 5.x-era manifest: `swiftLanguageVersions: [.v5]`, `.enableExperimentalFeature("StrictConcurrency")`, `-strict-concurrency=complete` in `unsafeFlags` | deprecated or superseded; unsafeFlags at tools < 6.2 blocks consumers | MP-17 grep (V27), MP-11 (V02) |
| Keeps `swift package init`'s template: tools 6.4 on a library, `ApproachableConcurrency` bundle, no `swiftLanguageModes` | over-floor, bundle hides two real features, mode not stated | MP-02(b), MP-03, MP-05 (V13, V14, V23) |
| Lists the whole feature zoo (all 15 `v6` names) "to be safe", or the pseudo `ApproachableConcurrency` plus its members | redundant warning; errors with `-warnings-as-errors` | MP-06 grep and build (V17, V18) |
| Misspells or invents a feature (`NonIsolatedNonsendingByDefault`, `LifetimeDependence` as upcoming, `ExistentialAnyV2`) and sees a green build | unknown names are ignored silently | `.treatWarning("StrictLanguageFeatures", as: .error)` build failure (V19, V20) |
| Sets `swiftLanguageModes: [.v5]` at package level "to get it compiling" | hides every target from the 6 checks | MP-04 greps (V15, V16) |
| Puts settings in a `let swiftSettings` variable per target, then runs `swift package migrate` | fails after rewriting sources | MP-09 grep (V04), MP-10 exit status (V03) |
| Adds `unsafeFlags(["-warnings-as-errors"])` or `-Xfrontend` flags to a published library at tools 6.1 | consumers cannot build it; at 6.2+ it can silently break them | MP-11 grep (V02), build (V01) |
| Creates `Package@swift-6.swift` or `Package@swift-6.3.3.swift`, or a versioned file newer than `Package.swift`, "for compatibility", then edits only `Package.swift` | the versioned file wins on matching toolchains; the edit has no effect | MP-12 find and `tools-version` mismatch (V05, V06) |
| Adds `platforms: [.linux]` or raises `.macOS(.v14)` to fix a Linux build; uses `.v27` at tools 6.3 | `.linux` does not exist; Linux ignores the list; `.v27` is tools-gated | `swift build` manifest error (V28) |
| Pins `from:` against a dependency and assumes every toolchain gets the same release | resolution silently differs by tools version | `swift package resolve` on the floor image (V30) |
| Hand-edits `Package.swift` for adds, producing a bad URL or wrong product name | commands exist and validate | MP-15, then MP-01 |

## Contested / evolving

- **Floor philosophy.** "Lowest version that carries the features used" (swift-log, swift-crypto, swift-subprocess at 6.2; swift-argument-parser at 6.0) against "the current release" (Alamofire, swift-collections, TCA, swift-dependencies, vapor at 6.4). The first needs no versioned manifests; the second needed 8 fallback files in four libraries. As of 2026-10-10 the corpus's modal choice is 6.2 (16/38), and the most-depended-on Apple libraries are moving to 6.2, not 6.4. Which way it trends: toward 6.2 as the 6.0/6.1 population shrinks; the 6.2 floor will rise to 6.3/6.4 only when a manifest API needs it, and 6.3/6.4 added almost none.
- **CLI floor.** The owner default (current release) is not forced by any manifest API; it is a convenience (template, interop mode `complete` at 6.4). A repo may reasonably keep a CLI at 6.2 for contributor reach. This file keeps the owner default and records that the choice has no technical forcing function.
- **Spelled-out features versus `ApproachableConcurrency`.** The 6.4 template and Apple's direction favour the bundle; the corpus favours individual names (7/38 spell `NonisolatedNonsendingByDefault`, none of the 38 root manifests uses the bundle). In Swift 6 mode the bundle is only two features, so spelling them is lossless. If the bundle grows a member, the spelled list needs updating by hand; the `jq` audit makes the gap visible.
- **`InternalImportsByDefault` for CLIs.** It protects public API; a leaf CLI has none. The skeleton still enables it for uniformity (one list, one audit); a reviewer who sees friction in a CLI may drop it without breaking MP-05 if the audit's `$need` list is per kind.
- **`ImmutableWeakCaptures`.** Source-breaking only for code that mutates a captured weak variable; adopted by 3/38. Left out because it needs a 6.3 compiler; may join the list when the library floor reaches 6.3.
- **Shared-settings shape.** Loop (swift-log, dependencies), `+` array (subprocess, collections), function/variable (swift-build, vapor). SE-0540 `defaultSwiftSettings` is accepted-with-modifications (2026-09-06) and not shipped; the PR was `blocked` on 2026-10-08. Trend: all three converge on SE-0540 once it lands (no release stated); re-check `PackageDescription.swift` for `defaultSwiftSettings` then.
- **Versioned manifests versus `#if compiler`.** Docs call versioned files a best-practice fallback for manifest-API differences; the corpus uses them as general compatibility copies (Alamofire, dependencies) and they drift. The measured `#if compiler(>=6.4)` mechanism handles setting differences in one file. SwiftPM itself keeps the feature; no deprecation is announced.
- **`unsafeFlags` after 6.2.** The ban for consumers is gone; SwiftPM no longer protects consumers from a bad flag. Trend: typed `SwiftSetting`s absorb the common cases (`treatWarning`, `strictMemorySafety`, `defaultIsolation`); the remaining legitimate flag in the corpus is `-require-explicit-sendable`.
- **Swift 6.5 (`main`).** PackageDescription 6.5 adds `bridgingHeader` and C interop changes; none touches this policy. The `future` group of upcoming features is the likely staging area for a next language mode ("Swift 7" is the label in 6.3's `Features.def`, `LanguageMode::future` in 6.4); recommendation stays individual names.
- **Unverified (read only).** Everything about deployment floors on Apple platforms, Xcode's treatment of the same manifest, Swift Package Index behaviour, and Windows.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://docs.swift.org/swiftpm/documentation/packagemanagerdocs/settingswifttoolsversion | SwiftPM docs: tools version, later-line rule, resolution filter | 6.4-era docs, read 2026-10-10 | the authority for "ineligible" dependency versions and for the 6.0 first-line relaxation |
| https://docs.swift.org/swiftpm/documentation/packagemanagerdocs/swiftversionspecificpackaging | SwiftPM docs: `Package@swift-X.swift`, version-specific tags | 6.4-era | selection order and the "newest tools version in Package.swift" best practice |
| https://docs.swift.org/swiftpm/documentation/packagemanagerdocs/addingdependencies | SwiftPM docs: dependency requirements and traits | 6.4-era | trait and requirement context for floors |
| https://docs.swift.org/swiftpm/documentation/packagemanagerdocs/packagemigrate | `swift package migrate` reference | 6.4-era | option list (`--to-feature`, `--targets`) |
| https://docs.swift.org/swiftpm/documentation/packagemanagerdocs/packageaddsetting | `swift package add-setting` reference | 6.4-era | supported settings list |
| https://docs.swift.org/swiftpm/documentation/packagemanagerdocs/packageadddependency | `swift package add-dependency` reference | 6.4-era | requirement flags |
| https://docs.swift.org/swiftpm/documentation/packagedescription/swiftsetting/unsafeflags(_:_:) | PackageDescription: unsafeFlags | PD 5.0+, read 2026-10 | the "ineligible for use by other packages" sentence |
| https://docs.swift.org/swiftpm/documentation/packagedescription/swiftsetting/enableupcomingfeature(_:_:) | PackageDescription: enableUpcomingFeature | PD 5.8+ | "Targets will ignore any unknown upcoming features" |
| https://docs.swift.org/swiftpm/documentation/packagedescription/swiftsetting/treatwarning(_:as:_:) | PackageDescription: treatWarning | PD 6.2 | confirms the 6.2 floor for the guard |
| https://docs.swift.org/swiftpm/documentation/packagedescription/swiftsetting/swiftlanguagemode(_:_:) | PackageDescription: swiftLanguageMode | PD 6.0 | per-target mode API |
| https://www.swift.org/migration/documentation/migrationguide/featuremigration | Swift 6 migration guide: migrating to upcoming features with SwiftPM | 6.2-era, read 2026-10 | documents `swift package migrate` and its variable-settings failure |
| https://www.swift.org/migration/documentation/migrationguide/enabledataracesafety | Swift 6 migration guide: enabling Swift 6 mode, per-target mode, versioned-manifest example | 6.0-era | official statement that tools 6.0 enables mode 6 and how to keep `.v5` per target |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0540-default-target-settings.md | SE-0540 Default Target Settings | Accepted with modifications 2026-09-06 | why shared settings are awkward and what `defaultSwiftSettings` will be |
| https://forums.swift.org/t/accepted-with-modifications-se-0540-default-package-settings/89398 | Ecosystem Steering Group acceptance post | 2026-09-06 | status and date; names no release |
| https://github.com/swiftlang/swift-package-manager/pull/10033 | SE-0540 implementation PR | open, blocked, updated 2026-10-08 | tells you when the API actually ships |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0335-existential-any.md | SE-0335 `any` | Implemented 5.6, flag 5.8 | basis for `ExistentialAny` |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0409-access-level-on-imports.md | SE-0409 access levels on imports | Implemented 6.0 | basis for `InternalImportsByDefault` |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0444-member-import-visibility.md | SE-0444 member import visibility | Implemented 6.1 | basis for `MemberImportVisibility` |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0461-async-function-isolation.md | SE-0461 nonisolated(nonsending) | Implemented 6.2 | semantics and migration of `NonisolatedNonsendingByDefault` |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0470-isolated-conformances.md | SE-0470 isolated conformances | Implemented 6.2 | `InferIsolatedConformances` |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0481-weak-let.md | SE-0481 `weak let` | Implemented 6.3 | why `ImmutableWeakCaptures` is excluded at a 6.2 floor |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0450-swiftpm-package-traits.md | SE-0450 package traits | Implemented 6.1 | tools 6.1 capability |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0443-warning-control-flags.md | SE-0443 warning control | Implemented 6.1 | diagnostic groups, `-Werror GROUP` |
| https://raw.githubusercontent.com/swiftlang/swift/release/6.4.0/include/swift/Basic/Features.def | compiler feature registry at 6.4.0 | 2026-09 | the 15 + 6 upcoming features and their language-mode groups |
| https://raw.githubusercontent.com/swiftlang/swift/release/6.3/include/swift/Basic/Features.def | the same at 6.3 | 2026-03 | proves the list did not change between 6.3 and 6.4 |
| https://raw.githubusercontent.com/swiftlang/swift/release/6.4.0/lib/Frontend/CompilerInvocation.cpp | feature-flag parsing | 6.4.0 | `ApproachableConcurrency` expansion, unrecognised-name diagnostic, `AvailabilityMacro=` |
| https://raw.githubusercontent.com/swiftlang/swift/release/6.4.0/userdocs/diagnostics/strict-language-features.md | `StrictLanguageFeatures` group doc | 6.4.0 | the silent-default rationale |
| https://raw.githubusercontent.com/swiftlang/swift/release/6.4.0/userdocs/diagnostics/upcoming-language-features.md | upcoming-features index | 6.4.0 | `-enable-upcoming-feature <feature>:migrate` mode |
| https://github.com/swiftlang/swift-package-manager/blob/5546f44a3b524e2b57c05ba5185094aa8adc0bde/Sources/PackageLoading/ToolsVersionParser.swift | manifest selection and tools-version parsing | main, 2026-10 | the versioned-manifest algorithm |
| https://github.com/swiftlang/swift-package-manager/blob/5546f44a3b524e2b57c05ba5185094aa8adc0bde/Sources/Workspace/Workspace%2BManifests.swift | unsafe-allowed package set | main, 2026-10 | which dependencies may vend unsafeFlags |
| https://github.com/swiftlang/swift-package-manager/blob/5546f44a3b524e2b57c05ba5185094aa8adc0bde/Sources/PackageLoading/PackageBuilder.swift | unsafeFlags tools-version cut-off | main, 2026-10 | lines 1073-1074 |
| https://github.com/swiftlang/swift-package-manager/blob/5546f44a3b524e2b57c05ba5185094aa8adc0bde/Sources/Commands/PackageCommands/Migrate.swift | `swift package migrate` | main, 2026-10 | the failure message source |
| https://github.com/swiftlang/swift-package-manager/blob/5546f44a3b524e2b57c05ba5185094aa8adc0bde/Sources/Runtimes/PackageDescription/BuildSettings.swift | PackageDescription settings API | main, 2026-10 | the `@available(_PackageDescription, introduced:)` table |
| https://github.com/swiftlang/swift-package-manager/blob/5546f44a3b524e2b57c05ba5185094aa8adc0bde/Sources/PackageManagerDocs/Documentation.docc/ReleaseNotes/6.4.md | SwiftPM 6.4 release notes | 2026-09 | Swift Build default, no manifest API |
| https://github.com/swiftlang/swift-package-manager/blob/5546f44a3b524e2b57c05ba5185094aa8adc0bde/CHANGELOG.md | SwiftPM CHANGELOG | to 6.2 | per-target mode, later-line tools-version, strictMemorySafety/defaultIsolation tools gates |
| https://raw.githubusercontent.com/swiftlang/swift-subprocess/1.0.1/Package.swift | swift-subprocess 1.0.1 manifest | 2026 | tools 6.2, shared-array pattern, the SDK's only dependency |
| https://www.swift.org/blog/swift-6.4-released/ | Swift 6.4 release post | 2026-09-15 | release date; Swift Build default; ST-0021 interop |
| https://www.swift.org/blog/swift-6.2-released/ | Swift 6.2 release post | 2025 | `treatWarning`/`treatAllWarnings` and migration tooling announcement |
| https://www.swift.org/blog/swift-6.3-released/ | Swift 6.3 release post | 2026-03-24 | Swift Build preview, `show-traits` |
| `swift-audit/exemplar-packaging-and-release.md` (repo) | wave-1 packaging audit of the 40-repo corpus | 2026-10-10 | tools-version histogram, unsafeFlags experiment E4 |
