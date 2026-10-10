---
title: "Swift on Apple platforms, read-only (SW-APPLE): consolidated ruleset"
topic: "Swift 6.4-era Apple app code read without macOS or Xcode: the build-setting map, default isolation per target kind, Observation vs ObservableObject, SwiftUI agent tells, availability and locks by deployment floor, Combine, generated projects"
model: sonnet
id_family: SW-APPLE
consolidates:
  - swift-apple/reading-heuristics.md
date: 2026-10-10
---

# Swift on Apple platforms, read-only (SW-APPLE): consolidated ruleset

Date 2026-10-10. Toolchains: Swift 6.4.0 and 6.3.3 on Linux x86_64 only; Xcode 26 = Swift 6.2, Xcode 27 = Swift 6.4 ([Xcode 27 release notes](https://developer.apple.com/documentation/xcode-release-notes/xcode-27-release-notes)). There is no macOS and no Xcode here (owner Q5): every Apple-only claim below is "unverified: read only" unless tagged. Evidence classes: **[Linux-run]** compiler behaviour watched on 6.4 and 6.3; **[grep-run]** a grep or awk watched red on a planted tree and green on its twin; **[source]** read from a primary document or the open-source swift-build; **[unverified: read only]** Apple-only. Citation tags: `RH-nn` and `CP-n` are the sub-artifact's runs (all re-run here, see "Verification runs added by this consolidation"); `AC-n` are this consolidation's own runs; `[conc]`, `[cfg]` are the audits under `swift-audit/`; exemplar cites are repo@sha12:path:line.

## Verdict

1. **A read-only depth file, 16 rules, 7 MUST** (`swift-quality/apple.md`, family SW-APPLE). It is the Apple-app half of SW-CONC-11/-12/-13 and SW-GATE-10's E12; it never restates their isolation semantics. Binds Apple apps and app-internal packages; library, SDK, CLI and server code is bound only by SW-APPLE-02 (manifest clause), -04 and -05 where it ships for Apple platforms.
2. **Read the setting, never infer it.** The effective `SWIFT_VERSION`, strict-concurrency level, default isolation and approachable flag are read from the target block, its xcconfig and the project block before any advice (SW-APPLE-14). An unset language mode is Swift 5 [Linux-run] (CP1: a racy global exits 0 silently), Apple's release notes never document the two Swift 6.2 settings, and "Xcode 27 projects default to Swift 5" has one source (Massicotte, 2026-06-10): treated as unverified.
3. **The oracle for setting names is swift-build's `Swift.xcspec`** (183 `SWIFT_*` names). A name outside it, or a SwiftPM spelling (`MainActor.self`, `main-actor`) or prose boolean (`Enabled`) in an xcconfig, is a hallucination (SW-APPLE-01).
4. **Default `MainActor` isolation is an app-target decision bound to Swift 6 mode** (SW-APPLE-02, -15): app target, UI-only packages and UI test targets; never libraries, SDKs, CLIs, daemons or servers (SW-CONC-11). A MainActor default under Swift 5 mode turns the isolation errors into warnings (CP2-mode5). Extensions follow their role: background work stays `nonisolated`, UI-only extensions may take the default.
5. **Approachable concurrency: apps set `SWIFT_APPROACHABLE_CONCURRENCY = YES`; manifests spell the members** (SW-APPLE-05). Settled by reading swift-build: the xcspec `Condition` gates only the setting's own command line, so in Swift 6 mode the YES still feeds NonisolatedNonsendingByDefault and InferIsolatedConformances.
6. **New observable state is `@Observable` in `@State private`**; `ObservableObject` is superseded, not deprecated, and survives only below the Observation floor (iOS 17 / macOS 14 / watchOS 10 / visionOS 1) or in a named incremental migration (SW-APPLE-06). `@ObservedObject` never takes an initial value (SW-APPLE-07). SwiftUI hygiene greps are SHOULD and scoped to new and touched code: the strict exemplars still carry 277 and 76 `.foregroundColor(` calls.
7. **The deployment floor is the truth for availability and locks.** `Mutex` iff every shipped iOS target is at least 18; `OSAllocatedUnfairLock.withLock` below it (SW-APPLE-04; closes the open question in swift-concurrency.md). A guard at or below the floor is dead code (SW-APPLE-11). Only the iOS floor is mechanical: the macOS clause was struck after it false-positived on element-x-ios.
8. **Combine is not deprecated.** New in-process state flow uses Observation or `AsyncSequence`; Combine stays at framework seams, bridged with `.values`; nothing is mass-migrated (SW-APPLE-13; answers M-J-10).
9. **A generated Xcode project is edited at its generator** (`project.yml`, `target.yml`, `Project.swift`), never in the `.pbxproj`; Xcode MCP write tools are forbidden there, read tools are fine (SW-APPLE-03, -16).
10. **Dropped:** the `print(` ban (project logging policy, not an Apple fact) and the candidate that duplicated SW-CONC-13 for apps. **Deferred** (unchanged from the map): M-J-06 to M-J-09 until an app consumer exists.

### Conflicts resolved

| # | Conflict | Resolution and reason |
|---|---|---|
| 1 | Sub-artifact SW-APPLE-02 (edit the generator; `element-x-ios` `AGENTS.md:384` forbids Xcode project-write tools) against its SW-APPLE-19 (use Xcode 27's MCP server to modify build settings instead of the pbxproj) | MCP read tools always; MCP write tools only on a hand-maintained project (SHOULD-level convenience, CONSIDER); on a generated project the generator wins. `AGENTS.md:384` names `UpdateTargetBuildSetting` and `AddEntitlement` as forbidden, and a regenerate overwrites their output. SW-APPLE-03 and -16. |
| 2 | Sub-artifact SW-APPLE-07 ("a manifest that mirrors an Xcode project spells the five members") against swift-concurrency.md SW-CONC-12 (exempts "a manifest that must mirror Xcode's SWIFT_APPROACHABLE_CONCURRENCY") and swift-package.md SW-PKG-16/-08 (the two members that matter) | No exemption is needed. A manifest spells exactly what the Xcode setting yields: the two members of SW-PKG-08 in a Swift 6 target, all five in a `.v5` target. The bundle name is accepted by the compiler (CP3) but hides what is on. |
| 3 | Sub-artifact §2: "whether `SWIFT_APPROACHABLE_CONCURRENCY` still feeds NNBD in Swift 6 mode is unverified" (its spec `Condition` limits it to Swift 4/4.2/5) | Resolved by source (AC-5): `swift-build@2187330e13e7:Sources/SWBCore/SpecImplementations/PropertyDomainSpec.swift:333` documents `condition` as the expression "which must be satisfied in order for the option to contribute arguments to a command line", applied at `:1404-1406`; the setting has no `CommandLineArgs`, and `Swift.xcspec:917,936` default NNBD and InferIsolatedConformances to `$(SWIFT_APPROACHABLE_CONCURRENCY)`. So YES stays effective in Swift 6 mode. Xcode's closed copy of the engine is unverified: read only. |
| 4 | Sub-artifact §0 says "`M-J-10` does not exist" in the Swift map and flags a dangling reference | Wrong: `swift-topic-map.md:615` defines M-J-10 ("Combine in apps: when is migrating to async sequences worth it?", P3). The flag is withdrawn; SW-APPLE-13 answers it. |
| 5 | Sub-artifact SW-APPLE-06 (`defaultIsolation` only in app-bound manifests, explicit `.v6`) against SW-CONC-11 and SW-PKG-19 (same text) | SW-CONC-11 owns the prohibition. This file adds only the Xcode-side pairing and the manifest grep SW-CONC-11 lacks, as a SHOULD clause of SW-APPLE-02: a manifest at tools 6.x is Swift 6 mode unless a `.v5` is set (swift-concurrency.md I-V20, measured at tools 6.4; swift-package.md SW-PKG-14; `element-x-ios` `compound-ios/Package.swift:27,40` is behaviourally Swift 6 without `.v6`). |
| 6 | Sub-artifact SW-APPLE-17 (unstructured `Task {}` in apps) against SW-CONC-13 (SHOULD for app code, same grep) | Duplicate; dropped. The view-side form (`.onAppear { Task }` to `.task`) stays in SW-APPLE-08. |
| 7 | Combine file count for `element-x-ios`: 468 (sub-artifact, all `.swift` incl. mocks and tests) against 387 (concurrency audit, production only) | Both re-measured (AC-4: 468 over all files; 378 by a path filter on `Mocks`/`Preview`/`Tests`, so the audit's classification differs by 9 files). Rules cite the audit's 387 as production, 468 as all-files, per the map's counting discipline (conflict 21). |
| 8 | Sub-artifact SW-APPLE-11 as MUST (UI `@Observable` carries `@MainActor` in a nonisolated-default target) | Downgraded to SHOULD: the grep cannot tell UI models from background models, and the compile evidence is narrower than the rule (it fails only through `Observations`, AC-5b). |
| 9 | swift-concurrency.md open question 1 (default "Mutex everywhere; lower floor uses OSAllocatedUnfairLock, labelled read-only") against the sub-artifact's pinned floors | Closed: floors pinned from DocC (AC-8); the rule is SW-APPLE-04. The macOS part of the sub-artifact's grep is struck: `element-x-ios` has `MACOSX_DEPLOYMENT_TARGET = 14.5` with `SUPPORTS_MACCATALYST = NO` (`ElementX.xcodeproj/project.pbxproj:10532,10539`), so the floor is not a build target. |
| 10 | Topic-map brief cites `element-x-ios` `AGENTS.md:288` for the isolation statement; `AGENTS.md:286` says three targets get MainActor; `target.yml` files set five | Line is 286 (`AGENTS.md:288` is the "Never `@unchecked Sendable`" line, contradicted by 5 and 16 sites in `[conc]`). Config beats prose: the two MapLibre shims (`Components/MapLibre/*/SupportingFiles/target.yml`) also carry it. |
| 11 | Sub-artifact exemplar table: `element-x-ios` has "18 `ObservableObject`, 19 `@Published`" (substring counts) against the concurrency audit's "`ObservableObject` 9, `@Published` 15" (`[conc]` Combine paragraph, production declarations) | Declarations win (map conflict 21, counting discipline). Re-measured (AC-7): the 18 lines hold 9 conformances (`: ObservableObject` or `, ObservableObject`), 8 uses of the type name `TypingMembersObservableObject` and 1 doc comment; the 19 `@Published` lines hold 15 attributes and 4 comments. `@ObservedObject` 53 and `@EnvironmentObject` 9 have no comment hits; `@StateObject` is 2. This file cites 9, 15, 53, 9, 2. |
| 12 | `element-x-ios` `AGENTS.md:286` "no redundant `@MainActor`" under the MainActor default (7 type-level `@MainActor` against 446 `nonisolated` opt-outs, `[conc]` Axis 6) against `IceCubesApp`, also MainActor-default, with 181 type-level `@MainActor` (`[conc]`; AC-7 re-measure: 184 own-line attributes before a type keyword plus 7 same-line) | The first is the reading of SE-0466 (the attribute adds nothing); the second is harmless redundancy that hides which types are deliberately UI. SW-APPLE-09 stays SHOULD and states the first as the rule; it is not a compile error, so no MUST. |

## The ruleset

### Reference data the rules cite

**Build-setting map** (Xcode `.pbxproj` / `.xcconfig` / XcodeGen YAML against SwiftPM against compiler; source: `swift-build@2187330e13e7:Sources/SWBUniversalPlatform/Specs/Swift.xcspec:576-583,626-669,732-936,993-1000`; answers M-J-05).

| Concern | Xcode setting and values | SwiftPM (tools 6.2+) | Compiler flag | Version |
|---|---|---|---|---|
| Language mode | `SWIFT_VERSION = 6` (`6`, `6.0`, `"6"` all appear) | `.swiftLanguageMode(.v6)` per target; `swiftLanguageModes: [.v6]` per package; `swiftLanguageVersions:` is deprecated (CP5: warning `[#DeprecatedDeclaration]`) | `-swift-version 6` | Swift 6.0 |
| Strict checking, Swift 5 mode | `SWIFT_STRICT_CONCURRENCY = minimal / targeted / complete` (ignored in Swift 6) | `.enableUpcomingFeature("StrictConcurrency")` | `-strict-concurrency=complete` (CP1: warning in mode 5, silent otherwise) | 5.x |
| Default isolation | `SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor` or `nonisolated` | `.defaultIsolation(MainActor.self)` or `.defaultIsolation(nil)` | `-default-isolation MainActor` (`=` form also accepted); `main-actor` and `MainActor.self` exit 1 (CP2-badv) | 6.2, SE-0466 |
| Approachable bundle | `SWIFT_APPROACHABLE_CONCURRENCY = YES` (Boolean by first character: `YES`, `true`, `1` enable; `Enabled`, `ON`, `NO` do not, `swift-build@2187330e13e7:Sources/SWBUtil/String.swift:60-68`) | none in SE-0466; spell members | five `-enable-upcoming-feature` flags: DisableOutwardActorInference, GlobalActorIsolatedTypesUsability, InferIsolatedConformances, InferSendableFromCaptures, NonisolatedNonsendingByDefault | 6.2 |
| One upcoming feature | `SWIFT_UPCOMING_FEATURE_<UPPER_SNAKE> = YES / MIGRATE / NO` | `.enableUpcomingFeature("<Name>")` | `-enable-upcoming-feature <Name>[:migrate]` | per feature |
| Deployment floor | `IPHONEOS_DEPLOYMENT_TARGET`, `MACOSX_DEPLOYMENT_TARGET`, ... | `platforms: [.iOS(.v18)]` | `-target arm64-apple-ios18.0` | n/a |

Tuist maps manifest API to the same settings (`tuist@2f6ac74754bf:cli/Sources/TuistLoader/SwiftPackageManager/SettingsMapper.swift:70-76,127-128`): `.defaultIsolation` becomes `SWIFT_DEFAULT_ACTOR_ISOLATION`, `.enableUpcomingFeature(X)` becomes an `OTHER_SWIFT_FLAGS` entry. Unknown upcoming-feature names are accepted silently by the compiler (CP3-typo: `ApproachableConcurency` exits 1 only because the planted error survives); the same silence for unknown `SWIFT_*` settings in a pbxproj is unverified: read only.

**Pinned availability floors** (DocC metadata fetched 2026-10-10 and re-fetched here, AC-8; Apple platforms; unverified: read only beyond the metadata).

| API | iOS | macOS | watchOS | visionOS |
|---|---|---|---|---|
| `Observable()` macro, `@Bindable` | 17.0 | 14.0 | 10.0 | 1.0 |
| `Observations` (SE-0475, Swift 6.2) | 26.0 | 26.0 | 26.0 | 26.0 |
| `Mutex` (`import Synchronization`) | 18.0 | 15.0 | 11.0 | 2.0 |
| `OSAllocatedUnfairLock` (`import os`) | 16.0 | 13.0 | 9.0 | none listed |
| `NavigationStack` | 16.0 | 13.0 | 9.0 | 1.0 |
| `Tab` | 18.0 | 15.0 | 11.0 | 2.0 |
| `.onChange(of:initial:_:)`; the `perform:` form is deprecated at the same number | 17.0 | 14.0 | 10.0 | 1.0 |
| `.tint(_:)`, `.foregroundStyle(_:)` | 15.0 | 12.0 | 8.0 | 1.0 |
| `.clipShape(.rect(cornerRadius:))` | 13.0 | 10.15 | 6.0 | 1.0 |

### SW-APPLE

Rows are grouped by the check that catches them: build configuration (greps and awk over `.pbxproj`, `.xcconfig`, generator YAML and manifests), Swift sources (greps), then named reading heuristics. Pipelines through `xargs -r` exit 0 or 123: judge by printed output. Shipped helper files go under `swift-quality/checks/` (house convention, as `rules/docs-quality/checks/`): `swift-settings-oracle.txt`, `pbx-blocks.awk`, `body-len.awk`.

#### Greps over build configuration

**SW-APPLE-01 (MUST). Every `SWIFT_*` name in a `.pbxproj`, `.xcconfig` or generator YAML exists in the oracle, and values are spelled exactly: `SWIFT_DEFAULT_ACTOR_ISOLATION` is `MainActor` or `nonisolated`, `SWIFT_APPROACHABLE_CONCURRENCY` is `YES` or `NO`; the SwiftPM spellings `MainActor.self`, `main-actor`, `.mainActor` and prose booleans `Enabled`, `ON`, `true` do not appear.**
- Why: a name or value that does nothing looks like a setting that works; the compiler rejects `main-actor` and `MainActor.self` (CP2-badv1/2, exit 1) and swift-build reads a Boolean by its first character, so `Enabled` is false.
- Verify (output is the violation; the oracle is `swiftlang/swift-build` names regenerated by `grep -rhow 'SWIFT_[A-Z0-9_]*' --include='*.xcspec' --include='BuiltinMacros.swift' Sources | sort -u | grep -v -x -e SWIFT_RESPONSE_FILE_PATH_ -e SWIFT_STRICT_CONCURRENCY_IN_SWIFT_VERSION` from a checkout, 183 names, reproduced byte-identical in AC-6):
  - names: `grep -rhow -e 'SWIFT_[A-Z0-9_]*' --include='*.pbxproj' --include='*.xcconfig' --include='project.yml' --include='target.yml' . | sort -u | grep -v -x -F -f swift-quality/checks/swift-settings-oracle.txt`
  - isolation: `grep -rnE -e 'SWIFT_DEFAULT_ACTOR_ISOLATION *[=:]' --include='*.pbxproj' --include='*.xcconfig' --include='project.yml' --include='target.yml' . | grep -vE -e '[=:] *"?(MainActor|nonisolated)"?[; ]*$'`
  - approachable: `grep -rnE -e 'SWIFT_APPROACHABLE_CONCURRENCY *[=:]' --include='*.pbxproj' --include='*.xcconfig' --include='project.yml' --include='target.yml' . | grep -vE -e '[=:] *"?(YES|NO)"?[; ]*$'`
- Run: RED/GREEN. RH-02 plant 3 names, RH-03a/b plant 1 line each, twin empty; the YAML-aware forms above AC-9: plant 3 lines (`SWIFT_APPROACHABLE_CONCURENCY`, `MainActor.self`, `Enabled`), twin empty, empty on element-x-ios and IceCubesApp.
- Known limits: the oracle is swift-build at 2187330e13e7, and Xcode's closed engine may add names, so a hit is "verify against current swift-build, then delete or add". The silent-acceptance claim for pbxproj names is unverified: read only.
- Binds: Apple apps. Floor: Xcode 26 names.

**SW-APPLE-02 (MUST). A target that sets `SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor` sets `SWIFT_VERSION` to 6 (`6` or `6.0`) in the same build-configuration block or in an xcconfig it references; `-swift-version` and `-language-mode` never appear in `OTHER_SWIFT_FLAGS`. (SHOULD clause for manifests: every manifest with `defaultIsolation` also spells `.swiftLanguageMode(.v6)` or `swiftLanguageModes: [.v6]`.)**
- Why: in Swift 5 mode the isolation errors become warnings and nothing enforces the default (CP2-mode5: exit 0 with `warning: main actor-isolated property ...`); swift-build warns "language mode was overridden by extra Swift flags" when `OTHER_SWIFT_FLAGS` sets it (`swift-build@2187330e13e7:Sources/SWBCore/SpecImplementations/Tools/SwiftCompiler.swift:1250-1256`). A manifest at tools 6.2 is already Swift 6 mode unless a `.v5` is set (SW-PKG-14), so that clause is house convention (map conflict 8), not a defect fix.
- Verify (output is the violation):
  - pbxproj, per block: `grep -rl -e 'SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor' --include='*.pbxproj' . | xargs -r awk '/isa = XCBuildConfiguration;/ {b=1; iso=0; ver=""} b && /SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor/ {iso=1} b && /SWIFT_VERSION = / {ver=$3} b && /^\t\t\t\};$/ {if (iso && ver !~ /^"?6(\.0)?"?;$/) print FILENAME ": MainActor default without SWIFT_VERSION 6, block ends line " FNR " (ver=" ver ")"; b=0}'`
  - xcconfig, per file: `grep -rl -e 'SWIFT_DEFAULT_ACTOR_ISOLATION *= *MainActor' --include='*.xcconfig' . | xargs -r grep -L -e 'SWIFT_VERSION *= *6'`
  - override: `grep -rn -e 'OTHER_SWIFT_FLAGS' --include='*.pbxproj' --include='*.xcconfig' . | grep -e '-swift-version' -e '-language-mode'`
  - manifests (SHOULD): `grep -rl -e 'defaultIsolation' --include='Package*.swift' . | xargs -r grep -L -e 'swiftLanguageMode(.v6)' -e 'swiftLanguageModes: \[.v6\]'`
- Run: RED/GREEN. RH-04a plant 1 line (`ver=5.0;`), RH-04b plant `./Config/Shared.xcconfig`, RH-04d plant 1 line, RH-05b plant `./Packages/NetKit/Package.swift`, all twins empty. Real trees: IceCubesApp empty on all four; element-x-ios prints 2 known false positives (`compound-ios/Inspector/Inspector.xcodeproj/project.pbxproj`: MainActor at project level `:321,379`, `SWIFT_VERSION = 6.0` at target level `:414,448`; read the target block) and 1 manifest hit (`compound-ios/Package.swift`, tools 6.2).
- Binds: Apple apps; the manifest clause also app-internal packages. Floor: Xcode 26, tools 6.2. The library/SDK/CLI/server ban on `defaultIsolation(MainActor.self)` is SW-CONC-11 and SW-PKG-19, not restated.

**SW-APPLE-03 (MUST). When a `project.yml`, `target.yml` or `Project.swift` sits beside an `.xcodeproj`, build settings, entitlements, Info.plist keys and targets change in the generator; a diff that changes a `.pbxproj` without changing a generator file is a violation, and Xcode MCP write tools (`UpdateTargetBuildSetting`, `AddEntitlement`, and kin) are not used on that project.**
- Why: the pbxproj is output that the next regenerate overwrites; `element-x-ios` `AGENTS.md:384` states the rule and names the forbidden tools.
- Verify (output is the violation; `BASE` is the merge base): `if [ -n "$(find . -maxdepth 3 \( -name project.yml -o -name target.yml -o -name Project.swift \) -not -path './.git/*' -print -quit)" ]; then git diff --name-only "$BASE" | awk '/\.pbxproj$/ {p=1} /(^|\/)(project\.yml|target\.yml|Project\.swift)$/ {g=1} END {if (p && !g) print "pbxproj changed without a generator change"}'; fi`. Routing aid: the `find` alone lists the generator files to edit (RH-10).
- Run: RED/GREEN, new here. AC-1: plant (pbxproj-only commit) prints `pbxproj changed without a generator change`; twin (both files) empty; hand-maintained project (no generator, pbxproj-only commit) empty.
- Binds: Apple apps with XcodeGen or Tuist (`element-x-ios`, `tuist`). Floor: any. The generated-then-committed case (element-x-ios commits `ElementX.xcodeproj`) is satisfied by the twin: both files change together.

**SW-APPLE-04 (MUST). A lock for mutable state in Apple-platform app code is `Mutex` only when every shipped target's iOS floor is at least 18 (macOS 15, watchOS 11, visionOS 2); below that it is `OSAllocatedUnfairLock` used through `withLock`, never `lock()`/`unlock()` across an `await`; `NSLock`, `os_unfair_lock` stay SW-GATE-10 E14 tells.**
- Why: `Mutex` needs iOS 18 and fails to compile below it (unverified: read only; Linux compiles it for every floor, so no Linux build catches this); Apple's unfair-lock text says `lock()`/`unlock()` are "unsafe to use ... across an `await` suspension point".
- Verify (output is the violation; iOS only, see conflict 9): `if grep -rq --include='*.swift' --exclude-dir='.build' -e 'import Synchronization' .; then grep -rnE --include='*.pbxproj' --include='*.xcconfig' -e 'IPHONEOS_DEPLOYMENT_TARGET = ([0-9]|1[0-7])[.;]' . ; grep -rnE --include='Package*.swift' --exclude-dir='.build' -e '\.iOS\((\.v([0-9]|1[0-7])\)|"([0-9]|1[0-7])[."])' . ; fi`. For macOS, watchOS and visionOS read the floor against the table: `MACOSX_DEPLOYMENT_TARGET` is meaningless when `SDKROOT` is `iphoneos` and `SUPPORTS_MACCATALYST = NO`. Then `grep -rn -e 'OSAllocatedUnfairLock' --include='*.swift' .` and read hits for `lock()`.
- Run: RED/GREEN, replaces RH-09. AC-2: plants (pbxproj floor 17.0, manifest `.iOS(.v16)`, pbxproj floor 9.0) print 1 line each, twin (floor 26.0 and `.v18`) empty, no-import twin (floor 17.0, no `Synchronization`) empty; IceCubesApp empty; element-x-ios prints 2 lines (`compound-ios/Inspector` project at `IPHONEOS_DEPLOYMENT_TARGET = 16.0`, a separate sample app: the guard is repo-wide, so run it from the app project's directory or read the hit). The unrun clauses: `OSAllocatedUnfairLock` read, and any compile error.
- Binds: Apple apps and app-internal packages; an Apple-platform library that sets `platforms:` below the floor and uses `Mutex` needs `@available` or the lock fallback. Floor: iOS 18 / macOS 15 / watchOS 11 / visionOS 2.

**SW-APPLE-05 (SHOULD). App targets set `SWIFT_APPROACHABLE_CONCURRENCY = YES`; manifests of every kind spell the members instead of the bundle (the two of SW-PKG-08 in a Swift 6 target, all five in a `.v5` target).**
- Why: Apple recommends the bundle for all projects ([WWDC25 268](https://developer.apple.com/videos/play/wwdc2025/268/)); in Swift 6 mode only NonisolatedNonsendingByDefault and InferIsolatedConformances add anything (swift-package.md C6), and the bundle name hides that. CP3 [Linux-run]: the bundle name and the member each turn `nnbd.swift` from exit 1 (`SendingRisksDataRace`) to exit 0 on 6.4 and 6.3; a typo'd name stays at exit 1.
- Verify: `grep -rn -e 'SWIFT_APPROACHABLE_CONCURRENCY' --include='*.pbxproj' --include='*.xcconfig' .` (each app target shows `YES`); manifests: `grep -rn -e 'ApproachableConcurrency' --include='Package*.swift' .` (output is the violation, SW-CONC-12 and SW-PKG-16).
- Run: partly. CP3 on both toolchains (AC-5); the grep shapes are SW-CONC-12's. Whether Xcode's closed engine matches swift-build is unverified: read only.
- Binds: apps (YES), manifests (spell members). Floor: Swift 6.2.

#### Greps over Swift sources

**SW-APPLE-06 (MUST). New observable model types are `@Observable`, held by `@State private` (or injected with `.environment(_:)` and read with `@Environment(Type.self)`), with `@Bindable` for bindings; `ObservableObject`, `@Published`, `@StateObject`, `@ObservedObject`, `@EnvironmentObject` appear only where the deployment floor is below iOS 17 / macOS 14 / watchOS 10 / visionOS 1, or in a documented incremental migration that names the type being migrated.**
- Why: Apple's migration guide; `@Observable` invalidates a view only for properties its `body` reads; SE-0395 says `ObservableObject` needs Combine and `@Published` on every observed property. `ObservableObject` is not deprecated (no `deprecatedAt` in DocC), so the exemption is a floor test, not a deprecation test; "superseded for new code" is the true statement.
- Verify: SW-GATE-10 E12 verbatim, on new and touched files: `grep -rn --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -F -e 'ObservableObject' -e '@Published' -e '@StateObject' -e '@ObservedObject' -e '@EnvironmentObject' .`; exemption test: the floor from `grep -rn -e 'IPHONEOS_DEPLOYMENT_TARGET' --include='*.pbxproj' --include='*.xcconfig' .` or `platforms:` is below 17.
- Run: RED/GREEN. RH-01 plant 5 lines, twin empty.
- Binds: Apple apps; new and touched code. Floor: iOS 17 / macOS 14 / watchOS 10 / visionOS 1.

**SW-APPLE-07 (MUST). `@ObservedObject` never carries an initial or default value; it marks an input the view is handed.**
- Why: Apple: "Don't specify a default or initial value for the observed object"; the view re-creating the object loses state on every parent redraw. Only reachable under SW-APPLE-06's exemptions, which is where agents copy the old tutorial shape.
- Verify: `grep -rn -e '@ObservedObject[^=]*= ' --include='*.swift' .` (output is the violation; known miss: the attribute on its own line).
- Run: RED/GREEN. RH-06b plant 1 line, twin empty.
- Binds: Apple apps. Floor: any.

**SW-APPLE-08 (SHOULD). `@State` is `private`; async work a view starts is `.task { ... }`, not `.onAppear { Task { ... } }`.**
- Why: Apple: "Declare state as private to prevent setting it in a memberwise initializer"; `.task` is cancelled with the view's lifetime, an `.onAppear` task is not.
- Verify (output is the violation): `grep -rn -e '@State var' -e '@State public var' -e '@State internal var' --include='*.swift' .` and `grep -rn -A1 -e '\.onAppear' --include='*.swift' . | grep -e 'Task[[:space:]]*{'`. Known misses: `@State` on its own line, `Task(priority:)` split across lines.
- Run: RED/GREEN. RH-06c and RH-06d plants 1 line each, twins empty. Real trees (AC-7): non-private `@State` 26 / 10 / 7 and `.onAppear { Task {` 5 / 0 / 0 on IceCubesApp / tuist / element-x-ios, so the greps fire on real code and the SHOULD level matches the measured debt.
- Binds: Apple apps. Floor: `.task` iOS 15.

**SW-APPLE-09 (SHOULD). In a target whose default isolation is `nonisolated`, a UI `@Observable` model and the functions that observe it carry `@MainActor`; in a MainActor-default target they carry no attribute (it is redundant).**
- Why: moving code from the app target into a nonisolated-default package flips the compile result. [Linux-run] AC-5b: an unannotated `@Observable final class Counter` read through `Observations { c.count }` exits 1 (`capture of 'c' with non-Sendable type 'Counter' in a '@Sendable' closure [#SendableClosureCaptures]`) under `-swift-version 6`, exits 0 under `-default-isolation MainActor`; a `@MainActor` model read from a nonisolated function exits 1 (`main actor-isolated property 'count' can not be referenced from a Sendable closure`, CP4-red), the `@MainActor` reader exits 0 (CP4-twin); all identical on 6.4 and 6.3. The SwiftUI view path is unverified: read only.
- Verify: `for d in Packages/DataKit/Sources; do grep -rl -e '@Observable' --include='*.swift' "$d" | xargs -r awk 'FNR==1 {prev=""} /@Observable/ && !/@MainActor/ && prev !~ /@MainActor/ {print FILENAME ":" FNR ": " $0} {prev=$0}'; done` with the `for` list set to the source directories of each nonisolated-default target (output is the violation to read: not every `@Observable` is UI-bound).
- Run: RED/GREEN. RH-06g plant 1 line (loop form re-run, AC-4), twin empty.
- Binds: Apple apps and app-internal packages. Floor: iOS 17 (macro), iOS 26 (`Observations`).

**SW-APPLE-10 (SHOULD). New and touched code does not use the superseded SwiftUI API: `NavigationView`, `.foregroundColor(`, `.cornerRadius(`, `.tabItem`, `.navigationBarItems`, `edgesIgnoringSafeArea`, `.accentColor(`, `UIScreen.main`, and the one-parameter `.onChange(of:) { value in }` or `perform:` form. Replacements: `NavigationStack`/`NavigationSplitView`, `.foregroundStyle`, `.clipShape(.rect(cornerRadius:))`, `Tab`, `.toolbar`, `ignoresSafeArea`, `.tint`, a trait or context screen, `{ old, new in }`.**
- Why: DocC lists `NavigationView`, `.foregroundColor`, `.cornerRadius`, `.tabItem`, `.accentColor`, `.navigationBarItems`, `.edgesIgnoringSafeArea`, `.alert(isPresented:content:)` at `deprecatedAt` 27.2 and `UIScreen.main` at 26.0, all still `deprecated: false` on 2026-10-10, so these greps are agent hygiene, not compiler-warning mirroring; `.onChange(of:perform:)` is firmly deprecated at iOS 17 (AC-8). Exemption: a floor below the replacement's introduction (NavigationStack 16, foregroundStyle 15, Tab 18); existing code is not rewritten wholesale.
- Verify (output is the violation): `grep -rn -e 'NavigationView' -e '\.foregroundColor(' -e '\.cornerRadius(' -e '\.tabItem' -e '\.navigationBarItems' -e 'edgesIgnoringSafeArea' -e '\.accentColor(' -e 'UIScreen\.main' --include='*.swift' .` and `grep -rn -e '\.onChange(of:[^{]*{[[:space:]]*[A-Za-z_][A-Za-z0-9_]*[[:space:]]*in' -e 'onChange(of:[^)]*perform:' --include='*.swift' .`.
- Run: RED/GREEN. RH-06e plant 4 lines, RH-06f plant 1 line, twins empty.
- Binds: Apple apps. Floor: see text.

**SW-APPLE-11 (SHOULD). Availability guards match the floor: no `#available(iOS N, *)` or `@available(iOS N, *)` with N at or below the minimum deployment target (the branch is dead code), and a guard's N comes from the pinned floor table or the SDK, never from memory; generated files (SwiftGen `Assets.swift`) are exempt.**
- Why: dead guards hide the real floor and keep an untested fallback branch; agents guess numbers (a view using `Observations` guarded at 17, `Tab` at 17). An unguarded newer API fails to compile in Xcode (unverified: read only).
- Verify: read the floor first (`grep -rn -e 'IPHONEOS_DEPLOYMENT_TARGET' --include='*.pbxproj' --include='*.xcconfig' .`, `grep -rn -e 'platforms' --include='Package*.swift' .`; the lowest value over targets that ship), then `grep -rn -e '#available(iOS [0-9]*' -e '@available(iOS [0-9]*' --include='*.swift' . | awk -F'iOS ' '{ split($2, a, /[^0-9]/); if (a[1] + 0 <= 17) print }'` with `17` replaced by the floor's major version (output is the violation; the awk compares the major number only).
- Run: RED/GREEN. RH-08 plant (floor 17) 1 line (`#available(iOS 15`); twin (floor 26, guard `iOS 27`) empty. On IceCubesApp at floor 18: the 6 `iOS 17.4` guards (AC-4); element-x-ios 10 hits, all in generated `ElementX/Sources/Generated/Assets.swift`.
- Binds: Apple apps. Floor: any.

**SW-APPLE-12 (SHOULD). `AnyView` appears only at type-erasure boundaries (a coordinator handing a view to UIKit hosting, `ImageRenderer<AnyView>`, stored erased content), not inside `body`, `ForEach` content or conditional builders; a `body` over 100 lines is a review prompt to extract subviews, not a violation.**
- Why: Apple: "Whenever the type of view used with an `AnyView` changes, the old hierarchy is destroyed and a new hierarchy is created". Measured `body` blocks: `element-x-ios` median 13, p99 75, 6 over 100; IceCubesApp median 29, p99 171, 16 over 100 (8.7%).
- Verify: `grep -rn -F -e 'AnyView' --include='*.swift' .` then read each hit (of 232 element-x-ios mentions 93 are the `toPresentable() -> AnyView` boundary); long bodies: `find . -name '*.swift' -not -path './.build/*' -print0 | xargs -0 awk -f swift-quality/checks/body-len.awk | awk '$2 > 100'` (prints `file:line lines`).
- Run: RED/GREEN. RH-06a plant 1 line, twin empty; body-len filter new here, AC-3: plant (122-line body) prints `body-plant/Big.swift:3 122`, twin (10 rows) empty.
- Binds: Apple apps. Floor: any.

**SW-APPLE-13 (SHOULD). New in-process state flow uses Observation (`Observations { ... }`, iOS 26) or `AsyncSequence`/`AsyncStream`, not Combine pipelines; Combine stays where an Apple API vends a `Publisher` (`NotificationCenter.publisher`, `URLSession.dataTaskPublisher`, KVO `publisher(for:)`), bridged with `.values` (iOS 15); existing Combine code is not migrated wholesale.**
- Why: Combine and `Published` carry no `deprecatedAt`; SE-0395 designed Observation to replace the `ObservableObject` use of Combine. `element-x-ios` runs 387 production files importing Combine (468 over all files) beside a newer Observation-based store; migrating one store at a time is the shape. `sink` closures in a Swift 6 target are an isolation hazard whose specifics need a macOS runner (unverified: read only).
- Verify: `grep -rn -e '\.sink' -e 'AnyCancellable' -e 'PassthroughSubject' -e 'CurrentValueSubject' --include='*.swift' .` on new and touched files; a census to read ("is this a framework seam?"), not an automatic failure.
- Run: RED/GREEN for the grep (RH-06h plant 3 lines, twin empty); the seam judgement is a reading heuristic.
- Binds: Apple apps. Floor: `Observations` iOS 26; `.values` iOS 15.

#### Named reading heuristics

**SW-APPLE-14 (MUST). Before changing or advising on concurrency settings in an Apple project, read and state the effective `SWIFT_VERSION`, `SWIFT_STRICT_CONCURRENCY`, `SWIFT_DEFAULT_ACTOR_ISOLATION` and `SWIFT_APPROACHABLE_CONCURRENCY` for the target in question (target block, then the xcconfig its `baseConfigurationReference` names, then the project block; for a generated project, the generator YAML); never infer them from the Xcode version, a template, or a blog post.**
- Why: an unset or blank language mode is Swift 5 (CP1) and the Xcode 27 default is single-source; the same code is a warning or an error depending on it. This is the Xcode-side instance of M-K-04 ("read the floor first").
- Verify: reading heuristic only, because no tool outside Xcode reports the effective value and the full precedence order is not asserted (unverified: read only). Aids: `grep -rn -e 'SWIFT_VERSION' -e 'SWIFT_STRICT_CONCURRENCY' -e 'SWIFT_DEFAULT_ACTOR_ISOLATION' -e 'SWIFT_APPROACHABLE_CONCURRENCY' --include='*.pbxproj' --include='*.xcconfig' --include='project.yml' --include='target.yml' .` and the per-block table `awk -f swift-quality/checks/pbx-blocks.awk App.xcodeproj/project.pbxproj` (id, name, bundle, ver, iso, appr, strict, ios). Project-level blank or `5.0` is not an alarm when the target block sets 6 (element-x-ios `project.pbxproj:10542,10625` against 20 of 26 blocks at 6).
- Run: aids ran on both app exemplars (block counts in the sub-artifact §5); CP1 [Linux-run] for the language-mode default.
- Binds: Apple apps and app-internal packages. Floor: Xcode 26.

**SW-APPLE-15 (SHOULD). Isolation by target kind: `MainActor` default on the app target, UI-only packages no other product consumes, and UI test targets; `nonisolated` on data, network, persistence and model targets and on extensions that do background work (notification service); a UI-only extension (widget views, share-sheet UI) may take the default; a type that must be used off the main actor is marked `nonisolated` under a MainActor default.**
- Why: Apple: main-actor-by-default is "primarily for your main app module and any modules that are focused on UI interactions" and "for libraries, it's best to provide a nonisolated API" ([WWDC25 268](https://developer.apple.com/videos/play/wwdc2025/268/)); CP2 [Linux-run]: with `-swift-version 6 -default-isolation MainActor` a `nonisolated func` reading an unannotated class exits 1, the `nonisolated final class` twin exits 0.
- Verify: reading heuristic: list the per-target `iso=` with `pbx-blocks.awk` or read the generator YAML, and compare against the target's role (`PRODUCT_BUNDLE_IDENTIFIER` suffix, product type). A judgement of role cannot be a grep.
- Run: compile half RED/GREEN (CP2-red, CP2-twin, CP2-mode5; AC-5); the role judgement is a reading heuristic.
- Binds: Apple apps. Floor: Swift 6.2.

**SW-APPLE-16 (CONSIDER). Where an Xcode 27 MCP server is attached to the session, ask it for effective build settings, compiler flags, entitlements and Info.plist keys instead of parsing a pbxproj; its write tools are used only on a hand-maintained project (SW-APPLE-03 forbids them on a generated one); where it is absent, fall back to SW-APPLE-14.**
- Why: the server resolves the effective value the greps only approximate (release-note item 176935844: "inspecting and modifying build settings, compiler flags, entitlements, and Info.plist keys"). Direction is complement, not replace: Apple-authored agent skills overlap this set (`xcrun agent skills export`, `element-x-ios` `AGENTS.md:380-384`).
- Verify: reading heuristic: does the session list an Xcode MCP tool? Release-notes claim, unverified: read only.
- Run: no.
- Binds: Xcode 27 sessions. Floor: Xcode 27.

#### Disposition of the sub-artifact's 19 candidates

| Sub-artifact | Final | Note |
|---|---|---|
| 01 | SW-APPLE-14 | named heuristic, kept MUST |
| 02 | SW-APPLE-03 | given a mechanical diff check (AC-1) |
| 03, 04 | SW-APPLE-01 | merged; YAML forms added (AC-9) |
| 05, 06 | SW-APPLE-02 | merged; manifest half SHOULD, prohibition left to SW-CONC-11 |
| 07 | SW-APPLE-05 | conflicts 2, 3 |
| 08 | SW-APPLE-15 | extension case decided |
| 09 | SW-APPLE-06 | |
| 10 | SW-APPLE-07, -08 | split by severity |
| 11 | SW-APPLE-09 | MUST to SHOULD, conflict 8 |
| 12 | SW-APPLE-10 | |
| 13 | SW-APPLE-12 | body-length awk now watched (AC-3) |
| 14 | SW-APPLE-11 | MUST to SHOULD: dead code is hygiene, the unguarded case is compile-enforced |
| 15 | SW-APPLE-04 | macOS clause struck, manifest clause added (AC-2) |
| 16 | SW-APPLE-13 | |
| 17 | dropped | duplicate of SW-CONC-13 |
| 18 | dropped | `print(` ban is project logging policy; CLIs print on purpose (SW-GATE-10) |
| 19 | SW-APPLE-16 | MUST-ish to CONSIDER, conflict 1 |

### Verification runs added by this consolidation

Fixture root: `/home/mherwig/.cache/research-lang/swift-tools/fixtures/apple-consolidation/` (never inside an exemplar). Red means non-empty output.

| ID | What | Command / result |
|---|---|---|
| AC-1 | generator diff check (SW-APPLE-03) | three throwaway git repos, `check-gen.sh <repo>` with `BASE=HEAD~1`: `gen-plant` prints `pbxproj changed without a generator change`; `gen-twin` empty; `gen-hand` (no generator file) empty; all exit 0 |
| AC-2 | iOS floor check (SW-APPLE-04) | `check-mx.sh <tree>`: `mx-plant-pbx` prints `IPHONEOS_DEPLOYMENT_TARGET = 17.0;`, `mx-plant-man` prints the `.iOS(.v16)` manifest line, `mx-plant-old` prints floor 9.0; `mx-twin` and `mx-twin-noimport` empty. Real trees: IceCubesApp empty; element-x-ios 2 lines in `compound-ios/Inspector/Inspector.xcodeproj/project.pbxproj:314,373` (a separate iOS 16 sample project; known repo-level false positive) |
| AC-3 | body-length filter (SW-APPLE-12) | `find <tree> -name '*.swift' -print0 \| xargs -0 awk -f body-len.awk \| awk '$2 > 100'`: `body-plant/Big.swift:3 122`; `body-twin` empty |
| AC-4 | re-run of all 24 RH-* greps on `reading-heuristics/{plant,twin}` | every plant exit and line count equals the sub-artifact's table (RH-01 5, RH-02 3, RH-03a/b 1, RH-04a 1, RH-04b exit 123 + 1, RH-06e 4, RH-09 3 ...); every twin empty; loop form of RH-06g plant 1 line, twin 0. Re-measured: IceCubesApp has exactly 6 `iOS 17.4` guards (`TranslationView.swift:11`, `StatusRowMediaPreviewView.swift:306`, `StatusRowViewModel.swift:417`, `MediaEditView.swift:43`, `AccountDetailContextMenu.swift:158`, `TranslationSettingsView.swift:71`) against `IPHONEOS_DEPLOYMENT_TARGET = 18.5` (`project.pbxproj:716`); Combine files element-x-ios 468 all, IceCubesApp 24 |
| AC-5 | compile probes CP1-4 on both toolchains, own copy of the sources | `SWIFT_VERSION={6.4,6.3} run.sh swiftc -emit-sil -o /dev/null -parse-as-library <flags> <file>`: CP1-red exit 1 `[#MutableGlobalVariable]`, CP1-mode5 exit 0 silent; CP2-red exit 1 `main actor-isolated property 'items' can not be referenced from a nonisolated context`, CP2-twin exit 0, CP2-mode5 exit 0 + warning, CP2-badv1 exit 1 `invalid value 'main-actor'`; CP3-red exit 1 (`[#RegionIsolation::SendingRisksDataRace]` on 6.4, `[#SendingRisksDataRace]` on 6.3), CP3-nnbd and CP3-appr exit 0, CP3-typo exit 1; CP4-red exit 1, CP4-twin exit 0. 24 of 24 lines match the recorded `run-compile.log` on probe id, toolchain and exit code (`cmp` of the three columns) |
| AC-5b | `Observations` under each default (SW-APPLE-09) | `obs-def.swift` (unannotated `@Observable` read in `Observations`): `-swift-version 6` exit 1 `capture of 'c' with non-Sendable type 'Counter' in a '@Sendable' closure [#SendableClosureCaptures]`; `-swift-version 6 -default-isolation MainActor` exit 0; both on 6.4 and 6.3 |
| AC-5c | source read of the xcspec `Condition` (conflict 3) | `swift-build@2187330e13e7:Sources/SWBCore/SpecImplementations/PropertyDomainSpec.swift:333,1404-1406`; `Swift.xcspec:576-583` (no `CommandLineArgs`), `:917,936` |
| AC-6 | oracle regeneration (SW-APPLE-01) | the regeneration pipeline over the swift-build clone gives 185 names; minus the two interpolation fragments `SWIFT_RESPONSE_FILE_PATH_` and `SWIFT_STRICT_CONCURRENCY_IN_SWIFT_VERSION` it is `cmp`-identical to the recorded 183-name file |
| AC-7 | exemplar re-measurement, read-only greps in the clones (conflicts 11, 12; violated rows) | `element-x-ios`: `grep -rn --include='*.swift' -E '[:,] *ObservableObject\b' .` 9 lines, `-F '@Published'` 19 lines of which 4 are `//` comments, `@ObservedObject` 53, `@EnvironmentObject` 9, `@StateObject` 2; `tuist`: 10 conformances (9 under `app/`), 11 `@Published`, 6 `@Observable`; `IceCubesApp`: 1 `@StateObject`, 0 other. SW-APPLE-07 grep (`@ObservedObject[^=]*= `): 0 on all three trees. SW-APPLE-08 greps: non-private `@State` 7 (element-x-ios), 26 (IceCubesApp), 10 (tuist); `.onAppear` then `Task {` 0, 5, 0. `.foregroundColor(` 76 and 277, `.cornerRadius(` 31 and 16 re-confirmed. 9 of 9 IceCubesApp manifests with `defaultIsolation` carry `.v6`. `@MainActor` hit lines (census grep, all files): IceCubesApp 247, element-x-ios 324; type-level split by awk over IceCubesApp: 184 own-line attribute before a type keyword, 22 before a member, 7 same-line. Citations spot-read at their line: swift-build (`Swift.xcspec`, `PropertyDomainSpec.swift`), IceCubesApp and element-x-ios pbxproj/`AGENTS.md`/manifests, tuist `SettingsMapper.swift`, `container` and `containerization` `Package.swift`, swift-collections `Shared.xcconfig`; all matched |
| AC-8 | DocC availability re-fetch (floors table) | `Mutex` iOS 18.0 / macOS 15.0 / watchOS 11.0 / visionOS 2.0; `OSAllocatedUnfairLock` 16.0 / 13.0 / 9.0 / none; `Observable()` and `Bindable` 17.0 / 14.0 / 10.0 / 1.0; `Observations` 26.0 everywhere; `Tab` 18.0 / 15.0 / 11.0 / 2.0; `NavigationStack` 16.0; `.onChange(of:perform:)` introduced 14.0, deprecated 17.0; `rect(cornerRadius:style:)` and `clipShape` 13.0; `tint(_:)` 15.0 |
| AC-9 | YAML-aware settings greps (SW-APPLE-01) | `check-yml.sh`: `yml-plant` (`target.yml`) prints `SWIFT_APPROACHABLE_CONCURENCY`, `SWIFT_DEFAULT_ACTOR_ISOLATION: MainActor.self`, `SWIFT_APPROACHABLE_CONCURRENCY: Enabled`; `yml-twin` empty; on `reading-heuristics/plant` 3 names + 1 + 1, twin empty; element-x-ios and IceCubesApp empty |

Not run, and so unverified: read only: every SwiftUI and Combine compile claim, every pbxproj semantic claim about Xcode (precedence order, what Xcode does with an unlisted enumeration value, silence on unknown `SWIFT_*` names), the `Mutex`/`OSAllocatedUnfairLock` floor errors, whether the iOS 27.2 SDK warns on the superseded SwiftUI API, the Xcode 27 template's language-mode default, and every Xcode MCP claim.

## Applied to the exemplars and the future consumers

**Satisfied by the strict exemplars**

| Rule | Exemplar evidence |
|---|---|
| SW-APPLE-01, -14 | `Dimillian/IceCubesApp@2ad6e6891258:IceCubesApp.xcodeproj/project.pbxproj:731-734` (`SWIFT_APPROACHABLE_CONCURRENCY = YES; SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor; SWIFT_VERSION = 6.0`); `element-hq/element-x-ios@14e33866ced2:ElementX.xcodeproj/project.pbxproj:10192-10194`; the name and value greps print nothing on either, nor on `tuist@2f6ac74754bf`, `swift-collections@935f696a549a:Xcode` or `compound-ios` |
| SW-APPLE-02 | IceCubesApp: 10 target blocks `6.0` + MainActor and 9 of 9 manifests with `defaultIsolation` also carry `.swiftLanguageMode(.v6)` (`Packages/Timeline/Package.swift:41-42`); element-x-ios `AGENTS.md:285` "All targets Swift 6" with 20 of 26 blocks at 6 |
| SW-APPLE-03 | element-x-ios generates `ElementX.xcodeproj` from `project.yml` plus per-target `target.yml` and says so at `AGENTS.md:384`; `tuist` builds Xcode projects from manifests |
| SW-APPLE-04 | `element-hq/element-x-ios@14e33866ced2:UnitTests/Sources/TestUtilities/WaitingConfirmation.swift:28` (`Mutex<Int>`, floor 18.5); the OCI-tooling mould: `apple/containerization@3e7bc39e66b3:Package.swift:26` (`platforms: [.macOS("15.0")]`) and `apple/container@f70ecbb926d9:Package.swift:30` (`.macOS("15")`) set the macOS floor at the `Mutex` number, and `container` imports `Synchronization` in `Sources/TerminalProgress/ProgressBar.swift`; IceCubesApp's `OSAllocatedUnfairLock<Critical>` (`Packages/NetworkClient/Sources/NetworkClient/MastodonClient.swift:50-53`) at floor 18.5 is permitted, not a violation |
| SW-APPLE-05 | element-x-ios 20 blocks and IceCubesApp 10 blocks `YES`; `swift-collections@935f696a549a:Xcode/Shared.xcconfig:73` uses the setting in a Swift-5-mode library (`SWIFT_VERSION = 5.10` at `:33`), the only place where the bundle adds all five |
| SW-APPLE-06 | IceCubesApp: 43 `@Observable`, 0 `ObservableObject`, 0 `@Published`; element-x-ios `StateStoreViewModelV2.swift` is the Observation-based store |
| SW-APPLE-07 | 0 initialised `@ObservedObject` in element-x-ios (53 uses), IceCubesApp and tuist (AC-7): the rule costs the strict exemplars nothing and still catches the tutorial shape |
| SW-APPLE-09 (first clause) | element-x-ios `AGENTS.md:286` ("no redundant `@MainActor`") with 7 type-level `@MainActor` under its MainActor default and 446 `nonisolated` opt-outs (`[conc]` Axis 6) |
| SW-APPLE-12 | element-x-ios `body` median 13, p99 75, enforces small screens; `.onChange(of:perform:)` 0, `NavigationView` 0, `.tabItem` 0 |
| SW-APPLE-15 | element-x-ios: app, UnitTests, PreviewTests and the two MapLibre UI shims MainActor; NSE, ShareExtension, UITests, AccessibilityTests, IntegrationTests `nonisolated` (`target.yml` files; `AGENTS.md:286`) |

**Violated by prominent exemplars** (all are existing code; the rules bind new and touched code, so these are the measured gap, not a demand to rewrite)

| Rule | Violation |
|---|---|
| SW-APPLE-06 | `element-x-ios`: 9 `ObservableObject` conformances, 15 `@Published`, 53 `@ObservedObject`, 9 `@EnvironmentObject`, 2 `@StateObject` at floor 18.5, so not floor-exempt; it is a documented incremental migration (`AGENTS.md:147-160`, `ElementX/Sources/Other/SwiftUI/ViewModel/StateStoreViewModel.swift:13`), which the rule admits when the migrating type is named (conflict 11 for the counts). `tuist@2f6ac74754bf`: 9 `ObservableObject` conformances under `app/` (e.g. `app/Sources/TuistMenuBar/Views/MenuBarView/MenuBarViewModel.swift:7`) beside 6 `@Observable`, at a macOS 15 floor (`app/Project.swift:271`), and no migration note, so neither the floor nor the migration exemption applies. IceCubesApp's one `@StateObject` (`Packages/StatusKit/Sources/StatusKit/Share/StatusRowShareAsImageView.swift:11`) wraps `ImageRenderer`, a framework type: legitimate |
| SW-APPLE-08 | Non-private `@State`: IceCubesApp 26 (e.g. `Packages/MediaUI/Sources/MediaUI/MediaUIAttachmentVideoView.swift:99-100`), tuist 10, element-x-ios 7 (`ElementX/Sources/Screens/EmojiPickerScreen/View/EmojiPickerScreen.swift:15`); `.onAppear { Task {` in IceCubesApp 5 (`Packages/StatusKit/Sources/StatusKit/Row/Subviews/StatusRowActionsView.swift:207-208`); the memberwise-initializer reason is Apple's text, so these are style debt, not defects (AC-7) |
| SW-APPLE-09 (second clause) | IceCubesApp, MainActor-default in every target, still writes 181 type-level `@MainActor` (`[conc]` Axis 6; conflict 12) where `element-x-ios` has 7 and 446 `nonisolated` opt-outs |
| SW-APPLE-11 | IceCubesApp: 6 dead `#available(iOS 17.4, *)` guards against the 18.5 floor, e.g. `Packages/Env/Sources/Env/Ext/TranslationView.swift:11` (the package floor is `.iOS(.v18)`, `Packages/Env/Package.swift:10`) |
| SW-APPLE-15 | IceCubesApp sets MainActor on all four extension targets (Notifications, Widgets, Share, Action; `project.pbxproj:731-734` pattern, one block pair per extension), where element-x-ios keeps extensions nonisolated: the rule's SHOULD and its UI-only-extension carve-out are the decision between them |
| SW-APPLE-10 | `.foregroundColor(`: IceCubesApp 76 in 45 files, element-x-ios 277 in 131 files; `.cornerRadius(`: 31 and 16 |
| SW-APPLE-12 | IceCubesApp: 16 `body` blocks over 100 lines, max 224 (`Packages/StatusKit/Sources/StatusKit/Row/StatusRowView.swift:43`) |
| SW-APPLE-13 | IceCubesApp `CLAUDE.md:144` says "Avoid Combine unless absolutely necessary" and has 24 Combine files; `element-x-ios` 387 production Combine files, 159 `AnyCancellable`, 476 subject mentions (declared legacy) |
| SW-APPLE-02 (manifest SHOULD) | `element-hq/element-x-ios@14e33866ced2:compound-ios/Package.swift:27,40`: `.defaultIsolation(MainActor.self)` at tools 6.2 without an explicit `.v6` (behaviourally Swift 6). Split config: `compound-ios/Inspector/Inspector.xcodeproj/project.pbxproj:321,379` MainActor at project level, `:414,448` `SWIFT_VERSION = 6.0` at target level |
| prose against config | element-x-ios `AGENTS.md:286` lists three MainActor targets; `Components/MapLibre/*/SupportingFiles/target.yml` sets two more (conflict 10) |
| SW-CONC-13 (app scope, not re-ruled here) | element-x-ios 416 and IceCubesApp 170 statement-position `Task {}`; SHOULD for apps, which is why the candidate was merged away |

**New commitments for the future fleet** (the fleet has no Swift code; these are by analogy with `ocx-sdk-python`, the Rust CLIs and `apple/containerization`)

- **Swift SDK wrapping the `ocx` CLI.** No SwiftUI, Observation or Xcode-setting rule binds it. Three Apple-adjacent commitments: it never sets `defaultIsolation(MainActor.self)` (SW-CONC-11, SW-PKG-19); if it declares `platforms:` and uses `Mutex`, the macOS floor is 15 (the `container` and `containerization` floor) and SW-APPLE-04's manifest grep is part of its gate; its manifest spells NNBD and InferIsolatedConformances by name, not the template's `ApproachableConcurrency` (SW-APPLE-05, SW-CONC-12). It spawns `ocx` through swift-subprocess, which cannot run on iOS (SW-IO scope), so it targets macOS and Linux only.
- **Swift CLIs in the ocx/grimoire mould.** SwiftPM-built, no `.xcodeproj`, hence SW-APPLE-01 to -03 and -14 never fire; SW-APPLE-04 binds only through a `platforms:` entry. The CLI contract stays in `rules/rust-quality/cli-contract.md` terms (SW-CLI).
- **OCI tooling in the `apple/containerization` mould.** macOS 15 floor and `Mutex` together are the precedent; a Linux leg is built beside it, so the Apple-only code path stays unverified: read only until a macOS runner exists.
- **General adopters (apps).** The whole SW-APPLE set, loaded on demand from the `swift-quality` index when a task touches SwiftUI, an `.xcodeproj`/`.xcconfig`, `platforms:` or Observation. The glob of `swift-package` deliberately omits `*.pbxproj` and `*.xcconfig` (map conflict 14), so the index routes by task keyword, not by file match.

## AI-agent failure modes

Ranked by how often they bite. The order is a judgement from exemplar frequency and the scouts' reports; no agent trace exists because the fleet has no Swift code.

| Rank | Failure | Mechanical check |
|---|---|---|
| 1 | New models written as `ObservableObject` + `@Published` + `@StateObject` (the pre-iOS-17 tutorial corpus) | SW-APPLE-06 (E12), floor test |
| 2 | Superseded SwiftUI API: `NavigationView`, `.foregroundColor`, `.cornerRadius`, `.tabItem`, one-parameter `.onChange` (277 and 76 uses in two strict apps) | SW-APPLE-10 greps |
| 3 | `.onAppear { Task { await ... } }`, non-private `@State`, `@ObservedObject var vm = ViewModel()` | SW-APPLE-07, -08 |
| 4 | Guessed availability numbers: `@available(iOS 17, *)` on a view using `Observations` (26) or `Tab` (18); dead guards at or below the floor (6 in IceCubesApp) | SW-APPLE-11 and the floor table |
| 5 | Sets `SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor` and leaves language mode 5, or "fixes" a red build by flipping `SWIFT_VERSION` back | SW-APPLE-02; CP2-mode5 is silent without it |
| 6 | Invents settings (`SWIFT_DEFAULT_ISOLATION`, `SWIFT_ENABLE_APPROACHABLE_CONCURRENCY`) or values (`MainActor.self`, `Enabled`, `true`); copies SwiftPM spellings into an xcconfig | SW-APPLE-01 |
| 7 | `Mutex` in an app at iOS 16/17; `OSAllocatedUnfairLock.lock()` ... `unlock()` around an `await` | SW-APPLE-04 |
| 8 | Edits the generated `.pbxproj`, or calls an Xcode MCP write tool, instead of `project.yml`/`target.yml` | SW-APPLE-03 |
| 9 | `.defaultIsolation(MainActor.self)` in a library or SDK, or without `.v6`; UI model moved into a package without `@MainActor` | SW-CONC-11 grep; SW-APPLE-02, -09 |
| 10 | `AnyView` to make an `if/else` type-check; 200-line `body` | SW-APPLE-12 |
| 11 | Combine pipelines for new in-process state; "Combine is deprecated" | SW-APPLE-13 |
| 12 | Stale claims copied from 2025 posts: `swiftLanguageVersions:`, "SwiftPM has no Approachable Concurrency", "`ObservableObject` is deprecated", "Xcode 27 projects default to Swift 6" | `grep -rn -e 'swiftLanguageVersions' --include='Package*.swift' .` (SW-PKG-20; CP5 shows the warning); SW-APPLE-14 forces a read |
| 13 | `@unchecked Sendable` or `nonisolated(unsafe)` on a model to quiet a MainActor-default error; `Task.detached` to "leave the main actor"; `DispatchQueue.main.async` in views | SW-GATE-10 E01-E04 (justification pass), SW-CONC-13/-14 |
| 14 | Assumes it can run `xcodebuild` or Previews, or reports an Apple-only change as built | no grep: say "unverified: read only"; Xcode MCP when attached (SW-APPLE-16) |
| 15 | `@MainActor` on every type inside a MainActor-default target (IceCubesApp: 181 type-level) | SW-APPLE-09 first clause; census: `grep -rn -e '@MainActor' --include='*.swift' <source dirs of each MainActor-default target>` (247 hit lines on all of IceCubesApp, 324 on element-x-ios, AC-7: a census, not a gate), read each: a hit is redundant unless it sits in a nonisolated-default target |

## Open questions

**Owner decisions (the default the program applies in brackets)**

1. Ship the three helper files (`swift-settings-oracle.txt`, `pbx-blocks.awk`, `body-len.awk`) under `swift-quality/checks/`, with the regeneration command beside the oracle. [Default: yes; the catalog already ships `checks/` beside rules, and the oracle is regenerated on each swift-build bump.]
2. Extension isolation: SHOULD `nonisolated` for background-work extensions, MainActor default allowed for UI-only extensions. [Default: as written in SW-APPLE-15; IceCubesApp's all-MainActor setup is tolerated.]
3. Scope of the `@Observable` MUST (SW-APPLE-06): new types only, or every touched file. [Default: new types and new files are MUST, touched legacy files SHOULD.]
4. Xcode 27 MCP write tools on a hand-maintained project. [Default: CONSIDER, never on a generated project.]
5. Whether to mirror or depend on Apple-authored Xcode agent skills. [Default: neither; complement only, revisit with a macOS runner.]
6. M-J-06 to M-J-09 (Tuist/XcodeGen authoring, Core Data/SwiftData, XCFrameworks, Keychain). [Default: stay deferred until an app consumer appears, as in the map.]

**Subareas that deserve another research round**

1. **Xcode build-system semantics (needs a macOS runner and Xcode).** Does an unknown `SWIFT_*` name or an unlisted enumeration value warn, error or vanish; what is the real precedence order target block, xcconfig, project block; does Xcode's closed engine match swift-build on the `Condition` reading in conflict 3; what does the Xcode 27 project template set for `SWIFT_VERSION` (the single-source Swift 5 claim)?
2. **Deployment-floor compile errors on Apple.** Does `Mutex` below iOS 18 fail in the way SW-APPLE-04 assumes, and does the iOS 27.2 SDK warn on `NavigationView`, `.foregroundColor`, `.cornerRadius` and `.tabItem` (DocC says `deprecatedAt` 27.2, `deprecated: false` today)? That decides whether SW-APPLE-10 can be gated by the compiler instead of grep.
3. **Combine and Observation under Swift 6 isolation.** Are `sink` closures a data-race hazard in a MainActor-default target, and does `Observations` match a Combine pipeline for non-SwiftUI consumers (shared with swift-concurrency.md's "Darwin libdispatch and the Apple runtime" round)?
4. **SwiftUI view shape in the wild.** The `body` length threshold (100) and the `AnyView` rule rest on two apps; a third app and a SwiftUI library (TCA's SwiftUI surface) would test them.

## Sub-artifacts

- [swift-apple/reading-heuristics.md](swift-apple/reading-heuristics.md): the build-setting oracle (`Swift.xcspec`) and map, default language mode, the app-target isolation statement, reading a `.pbxproj`, `@Observable` vs `ObservableObject`, SwiftUI tells with body-size census, availability and `Mutex` vs `OSAllocatedUnfairLock` floors, Combine, stale practitioner points, 19 candidate rules, 24 grep runs and 5 compile probes.

## Key sources

1. [WWDC25 session 268, Embracing Swift concurrency](https://developer.apple.com/videos/play/wwdc2025/268/): main-actor-by-default for app and UI modules, nonisolated libraries, Approachable Concurrency for all projects.
2. [Xcode 27 release notes](https://developer.apple.com/documentation/xcode-release-notes/xcode-27-release-notes): silent on the two settings and the language-mode default; Xcode MCP build-settings tools and agent skills.
3. [Xcode 26.4 release notes](https://developer.apple.com/documentation/xcode-release-notes/xcode-26_4-release-notes): the only mention of "projects that default to MainActor isolation".
4. [swift-build `Swift.xcspec` at 2187330e13e7](https://github.com/swiftlang/swift-build/blob/2187330e13e7/Sources/SWBUniversalPlatform/Specs/Swift.xcspec): the authoritative setting definitions, values and flag mapping.
5. [SE-0466 control default actor isolation](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0466-control-default-actor-isolation.md) (Swift 6.2): `-default-isolation`, `defaultIsolation`, the exemption list.
6. [Approachable data-race safety vision](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/visions/approachable-concurrency.md): executables against libraries.
7. [SE-0395 Observation](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0395-observability.md) (Swift 5.9): why `ObservableObject` and Combine were replaced.
8. [SE-0475 transactional observation, `Observations`](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0475-observed.md) (Swift 6.2).
9. [Migrating from the Observable Object protocol to the Observable macro](https://developer.apple.com/documentation/swiftui/migrating-from-the-observable-object-protocol-to-the-observable-macro): the replacement table and the incremental-migration permission.
10. [SwiftUI `State`](https://developer.apple.com/documentation/swiftui/state) and [`ObservedObject`](https://developer.apple.com/documentation/swiftui/observedobject): "declare state as private", "don't specify a default or initial value".
11. [`Mutex`](https://developer.apple.com/documentation/synchronization/mutex) and [`OSAllocatedUnfairLock`](https://developer.apple.com/documentation/os/osallocatedunfairlock): the availability floors and the "unsafe across `await`" text.
12. [Swift 6 migration guide, Enable data-race safety](https://raw.githubusercontent.com/swiftlang/swift-migration-guide/main/Guide.docc/EnableDataRaceSafety.md): `SWIFT_VERSION`, `SWIFT_STRICT_CONCURRENCY`, `swiftLanguageModes`.
13. [element-x-ios `AGENTS.md` at 14e33866ced2](https://github.com/element-hq/element-x-ios/blob/14e33866ced2/AGENTS.md): per-target isolation, the generator rule, Xcode 27 agent skills.
14. [Matt Massicotte, WWDC26 Q&A](https://massicotte.org/blog/wwdc26-unanswered-qa/) (2026-06-10): the only source for "Xcode 27 defaults to Swift 5" and the case against MainActor default.
15. [Tuist `SettingsMapper.swift` at 2f6ac74754bf](https://github.com/tuist/tuist/blob/2f6ac74754bf/cli/Sources/TuistLoader/SwiftPackageManager/SettingsMapper.swift): independent confirmation of the manifest-to-setting mapping.
