---
title: "Read-only heuristics for Apple app code (SW-APPLE): build-setting map, Observation, SwiftUI tells, availability drift, Combine, app-target isolation"
topic: "apple/reading-heuristics (W3-9, revised after wave 2) -> swift-quality/apple.md; rows M-J-01..M-J-05; M-J-10 (see Findings 0) read as 'Combine guidance'"
agent: apple-reading-heuristics
model: sonnet
date_researched: 2026-10-10
sources_count: 27
fixtures: /home/mherwig/.cache/research-lang/swift-tools/fixtures/reading-heuristics/
scope: |
  Covers: the Xcode build settings that govern Swift concurrency and language mode (names, values, flag mapping, where they live), the app-target isolation statement, @Observable vs ObservableObject, SwiftUI agent tells, availability and deployment-floor drift (incl. Mutex vs OSAllocatedUnfairLock), Combine guidance.
  Does NOT cover: running or building anything on Apple platforms (no macOS, no Xcode: every Apple-only claim is marked "unverified: read only"), Tuist/XcodeGen authoring (M-J-06), SwiftData/Core Data (M-J-07), XCFrameworks (M-J-08), Keychain (M-J-09), the isolation semantics themselves (SW-CONC-01..29), the K-07 grep set (SW-GATE-10), SW-IO beyond its Apple scope line.
  Evidence classes used below: [Linux-run] watched on the 6.4 and 6.3 toolchains, [grep-run] watched red on a planted tree and green on its twin, [source] read from a primary document or source file, [unverified: read only] Apple-only.
---

# Read-only heuristics for Apple app code (SW-APPLE)

Date: 2026-10-10. Toolchains: Swift 6.4 (`swift:6.4` image) and 6.3.3 (`SWIFT_VERSION=6.3`). Xcode 26 = Swift 6.2, Xcode 27 = Swift 6.4 ([Xcode 27 release notes](https://developer.apple.com/documentation/xcode-release-notes/xcode-27-release-notes), [Xcode 26 release notes](https://developer.apple.com/documentation/xcode-release-notes/xcode-26-release-notes)).

## Table of contents

0. Row bookkeeping (M-J-10 does not exist)
1. Where the build settings come from: the oracle is swift-build's `Swift.xcspec`
2. The build-setting map (Xcode name, SwiftPM name, compiler flag, values)
3. Default language mode and the Xcode 27 claim
4. The app-target isolation statement (SW-CONC-11 applied)
5. Reading a `.pbxproj`: project level vs target level, generated projects
6. `@Observable` vs `ObservableObject`
7. SwiftUI tells
8. Availability and deployment-floor drift
9. Mutex vs OSAllocatedUnfairLock floors
10. Combine guidance
11. Stale points in the practitioner sources
12. Decision: the shape of `apple.md`

## Summary

- Every claim in this file about Xcode, SwiftUI or Apple SDK behaviour is "unverified: read only" unless tagged [Linux-run]; the compiler-level semantics of the settings were watched on Linux, the Xcode plumbing was read from the open-source swift-build.
- The authoritative definition of the Xcode concurrency settings is swift-build's `Swift.xcspec` (`SWIFT_DEFAULT_ACTOR_ISOLATION` is an Enumeration of `nonisolated` and `MainActor`; `SWIFT_APPROACHABLE_CONCURRENCY` is a Boolean); the Xcode 26, 26.1-26.4 and 27 release notes never mention either setting.
- `SWIFT_APPROACHABLE_CONCURRENCY = YES` expands to exactly five upcoming features: DisableOutwardActorInference, GlobalActorIsolatedTypesUsability, InferIsolatedConformances, InferSendableFromCaptures, NonisolatedNonsendingByDefault.
- `SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor` is the flag `-default-isolation=MainActor`; `main-actor` and `MainActor.self` are rejected by the compiler (exit 1 on 6.4 and 6.3) and are SwiftPM/Tuist spellings, never xcconfig values.
- A typo in a `SWIFT_*` setting or in an `-enable-upcoming-feature` name is accepted silently (6.4 and 6.3 exit 0, no diagnostic); the settings-name oracle grep (RH-02) is the only mechanical catch and ran green on 5 real trees.
- An unset language mode is Swift 5 (raw `swiftc` on 6.4 and 6.3: a racy global exits 0 silently; `-swift-version 6` exits 1): an app that sets only `SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor` without `SWIFT_VERSION = 6` gets the isolation errors downgraded to warnings.
- "Xcode 27 projects default to Swift 5" has exactly one source (Massicotte, 2026-06-10); Apple's release notes are silent. Treat the language mode as something to read, never to assume.
- App-target isolation statement: `MainActor` default only in the app target, its UI-only packages and its UI test targets, always with `SWIFT_VERSION = 6` / `.swiftLanguageMode(.v6)`; extensions that do background work, data and network targets stay `nonisolated`.
- New observable state is `@Observable` held in `@State private`; `ObservableObject`/`@StateObject`/`@ObservedObject` are correct only below the Observation floor (iOS 17, macOS 14, watchOS 10, visionOS 1) or in an incremental migration; the E12 grep is the detector, the deployment floor is the exemption test.
- `ObservableObject` is not deprecated (DocC carries no `deprecatedAt`); calling it "deprecated" is wrong, "superseded for new code" is right.
- `@ObservedObject var x = Model()` is a bug (Apple: "Don't specify a default or initial value"), `@State var` should be `private`, `.onAppear { Task { ... } }` should be `.task`: three greps, each red/green.
- DocC metadata fetched 2026-10-10 lists `NavigationView`, `.foregroundColor`, `.cornerRadius`, `.tabItem`, `.alert(isPresented:content:)` as deprecated at 27.2 and `UIScreen.main` at 26.0; `.onChange(of:perform:)` is deprecated at 17.0 and is the form agents write.
- Deployment target is the floor: any `#available(iOS N, *)` with N at or below the target is dead code (IceCubesApp has 6 at `iOS 17.4` against a package floor of `.iOS(.v18)`); RH-08 finds them given the floor.
- `Mutex` needs iOS 18 / macOS 15 / watchOS 11 / visionOS 2; `OSAllocatedUnfairLock` needs iOS 16 / macOS 13 / watchOS 9; below the Mutex floor use `OSAllocatedUnfairLock.withLock`, never `lock()`/`unlock()` across an `await` (Apple doc).
- Combine is not deprecated; new in-process state flow uses Observation (`Observations`, iOS 26 / Swift 6.2) or `AsyncSequence`; Combine stays at framework seams that vend a `Publisher`, bridged with `.values`. Do not mass-migrate (element-x-ios: 468 files import Combine).
- Generated Xcode projects (XcodeGen `project.yml`/`target.yml`, Tuist `Project.swift`) are edited at the generator; element-x-ios says so in `AGENTS.md:384`.
- Xcode 27 ships an MCP server that can inspect and modify build settings, and Apple-authored agent skills; where it is attached, ask it for effective settings instead of parsing the pbxproj (release-notes claim, unverified: read only).

## Findings

### 0. Row bookkeeping

The brief lists rows M-J-01..M-J-05 and M-J-10. The Swift topic map defines M-J-01..M-J-09 only ([swift-topic-map.md](../swift-topic-map.md) rows M-J-01..M-J-09; M-J-06..M-J-09 are deferred). `M-J-10` exists only in the JVM and Bazel maps (`mvn verify`, `pypi` hub collision). This file therefore reads the sixth slot as the brief's own gloss, "Combine guidance" (section 10), and flags the number as a dangling reference for the orchestrator.

### 1. Where the build settings come from: the oracle is swift-build `Swift.xcspec`

The Xcode release notes do not document the settings. A scan of the Xcode 26 notes, 26.1, 26.2, 26.3, 26.4 and the Xcode 27 notes ([26](https://developer.apple.com/documentation/xcode-release-notes/xcode-26-release-notes), [26.4](https://developer.apple.com/documentation/xcode-release-notes/xcode-26_4-release-notes), [27](https://developer.apple.com/documentation/xcode-release-notes/xcode-27-release-notes)) for `SWIFT_DEFAULT_ACTOR_ISOLATION`, `SWIFT_APPROACHABLE_CONCURRENCY`, "Approachable" and any language-mode default found nothing. The only hit is one 26.4 fix: "Generated code for String Catalog symbol generation will no longer produce a compiler error for projects that default to MainActor isolation (165481673)".

The open-source build engine does define them. `swiftlang/swift-build@2187330e13e7`:

- `Sources/SWBUniversalPlatform/Specs/Swift.xcspec:576-583`: `SWIFT_APPROACHABLE_CONCURRENCY`, `Type = Boolean`, `DefaultValue = NO`, `Condition = "$(EFFECTIVE_SWIFT_VERSION) == '4' || ... == '5'"` (only meaningful in Swift 4/4.2/5 mode), description "Enables upcoming features ...: DisableOutwardActorInference, GlobalActorIsolatedTypesUsability, InferIsolatedConformances, InferSendableFromCaptures, and NonisolatedNonsendingByDefault."
- `Swift.xcspec:655-669`: `SWIFT_DEFAULT_ACTOR_ISOLATION`, `Type = Enumeration`, `Values = (nonisolated, MainActor)`, `DefaultValue = "nonisolated"`, `CommandLineArgs`: `MainActor = ( "-default-isolation=MainActor" )`, `nonisolated = ()`.
- `Swift.xcspec:626-645`: `SWIFT_STRICT_CONCURRENCY` Enumeration `minimal | targeted | complete`, same Swift-5-only `Condition`; the description says it is "always 'complete' when in the Swift 6 language mode".
- `Swift.xcspec:732, 774, 844, 910, 929`: the five bundle members are `SWIFT_UPCOMING_FEATURE_DISABLE_OUTWARD_ACTOR_ISOLATION` (spelled so in the spec), `..._INFER_SENDABLE_FROM_CAPTURES`, `..._GLOBAL_ACTOR_ISOLATED_TYPES_USABILITY`, `..._INFER_ISOLATED_CONFORMANCES`, `..._NONISOLATED_NONSENDING_BY_DEFAULT`; the last two default to `$(SWIFT_APPROACHABLE_CONCURRENCY)`.
- `Swift.xcspec:993-1000`: `SWIFT_VERSION`, `Type = String`, `DefaultValue = ""`.
- `Sources/SWBCore/Settings/Settings.swift:1771-1783` computes `EFFECTIVE_SWIFT_VERSION`; an unsupported value becomes `""`, and `Sources/SWBCore/SpecImplementations/Tools/SwiftCompiler.swift:1250-1256` then errors "SWIFT_VERSION '...' is unsupported", or, if `OTHER_SWIFT_FLAGS` contains `-swift-version` or `-language-mode`, warns "language mode was overridden by extra Swift flags and may be inconsistent with code generated during the build".
- `Sources/SWBUtil/String.swift:60-68`: a Boolean setting is true when its first character is `y`, `Y`, `t`, `T` or `1`-`9`, otherwise false. `YES`, `true` and `1` enable; `Enabled`, `ON` and `NO` do not.

Whether Xcode's own bundled build system matches swift-build line for line is unverified: read only (Xcode 26+ ships Swift Build as an option, the packaged Xcode copy is closed). The names agree with every real project in the corpus: a grep of all `SWIFT_*` tokens in 5 real trees against a name list extracted from swift-build (183 names) prints nothing (RH-02, section Verification runs).

### 2. The build-setting map

| Concern | Xcode (`.pbxproj` / `.xcconfig` / XcodeGen YAML) | SwiftPM (`Package.swift`, tools >= 6.2 for isolation) | Compiler flag | Version |
|---|---|---|---|---|
| Language mode | `SWIFT_VERSION = 6` (bare `6`, `6.0`, `"6"` all appear) | `.swiftLanguageMode(.v6)` per target, `swiftLanguageModes: [.v6]` per package; `swiftLanguageVersions:` is deprecated ([Linux-run] CP5: warning `DeprecatedDeclaration`, tools 6.2 manifest on 6.4 and 6.3) | `-swift-version 6` | Swift 6.0+ ([migration guide](https://raw.githubusercontent.com/swiftlang/swift-migration-guide/main/Guide.docc/EnableDataRaceSafety.md)) |
| Strict checking in Swift 5 mode | `SWIFT_STRICT_CONCURRENCY = minimal / targeted / complete` (ignored in Swift 6) | `.enableUpcomingFeature("StrictConcurrency")` / experimental spelling | `-strict-concurrency=complete` | [Linux-run] CP1: warning with `complete`, silent otherwise, error only with `-swift-version 6` |
| Default actor isolation | `SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor` or `nonisolated` | `.defaultIsolation(MainActor.self)` or `.defaultIsolation(nil)` | `-default-isolation MainActor` (the spec spells `-default-isolation=MainActor`, both accepted) | Swift 6.2, [SE-0466](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0466-control-default-actor-isolation.md) |
| Approachable bundle | `SWIFT_APPROACHABLE_CONCURRENCY = YES` | no bundle API in SE-0466; `.enableUpcomingFeature("ApproachableConcurrency")` is accepted and effective on 6.3 and 6.4 ([Linux-run] CP3), but the repo rule is to spell the members (SW-PKG-16, SW-CONC-12) | five `-enable-upcoming-feature <Member>` flags | Swift 6.2 |
| One upcoming feature | `SWIFT_UPCOMING_FEATURE_<UPPER_SNAKE> = YES / MIGRATE / NO` | `.enableUpcomingFeature("<Name>")` | `-enable-upcoming-feature <Name>[:migrate]` | per feature |
| Deployment floor | `IPHONEOS_DEPLOYMENT_TARGET`, `MACOSX_DEPLOYMENT_TARGET`, ... | `platforms: [.iOS(.v18)]` | `-target arm64-apple-ios18.0` | n/a |

Rules that fall out of the table:

- The xcconfig and `.pbxproj` values for `SWIFT_DEFAULT_ACTOR_ISOLATION` are the two words `MainActor` and `nonisolated`. The SwiftPM-flavoured spellings are rejected by the compiler: `-default-isolation main-actor` and `-default-isolation MainActor.self` each exit 1 with `invalid value ... in '-default-isolation ...'` on 6.4 and 6.3 ([Linux-run] CP2-badv1, CP2-badv2). A reader who writes them in an xcconfig gets, at best, a setting that matches no `CommandLineArgs` key; what Xcode does with an unlisted enumeration value is unverified: read only.
- Tuist maps the manifest API to the same setting: `cli/Sources/TuistLoader/SwiftPackageManager/SettingsMapper.swift:70-76` (`tuist/tuist@2f6ac74754bf`) turns `.defaultIsolation` values `nonisolated`/`nil` and `MainActor`/`MainActor.self`/`main-actor` into `SWIFT_DEFAULT_ACTOR_ISOLATION = nonisolated | MainActor`, and `:127-128` turns `.enableUpcomingFeature(X)` into `-enable-upcoming-feature "X"` in `OTHER_SWIFT_FLAGS`, not into `SWIFT_UPCOMING_FEATURE_*`.
- The upcoming-feature names are not validated: `-enable-upcoming-feature Totally_Bogus` and `ApproachableConcurency` exit 0 with no diagnostic on 6.4 and 6.3 (observed during CP3; the typo'd flag leaves the planted `SendingRisksDataRace` error in place, which is how the effect of the real name was told apart: CP3-appr green, CP3-typo red). The same silence applies to unknown `SWIFT_*` settings in a pbxproj (unverified: read only, since only the Linux compiler was run).
- `SWIFT_APPROACHABLE_CONCURRENCY` itself emits no flag: it only supplies the default of the five member settings, and its spec `Condition` restricts it to Swift 4/4.2/5 mode. Whether it still feeds the NNBD and InferIsolatedConformances defaults when `SWIFT_VERSION = 6` is unverified: read only; both exemplar apps set it to `YES` together with `SWIFT_VERSION = 6`, which implies the authors expect an effect. The compiler-level fact (swift-package.md C6) is that in Swift 6 mode only NonisolatedNonsendingByDefault and InferIsolatedConformances are not already on.
- Setting `-swift-version` or `-language-mode` in `OTHER_SWIFT_FLAGS` makes swift-build warn "language mode was overridden"; use `SWIFT_VERSION` (RH-04d).

Version-tag: all of this is Xcode 26 (Swift 6.2) onward; `SWIFT_DEFAULT_ACTOR_ISOLATION` and `SWIFT_APPROACHABLE_CONCURRENCY` are new in Xcode 26 per [WWDC25 session 268](https://developer.apple.com/videos/play/wwdc2025/268/) ("This mode is enabled by default for new app projects created with Xcode 26").

### 3. Default language mode and the Xcode 27 claim

- Compiler level [Linux-run] CP1: raw `swiftc` with no `-swift-version` is Swift 5 mode on 6.4 and 6.3: `var counter = 0` at file scope compiles with exit 0 and no output; `-swift-version 5 -strict-concurrency=complete` gives a `[#MutableGlobalVariable]` warning ("this is an error in the Swift 6 language mode"); `-swift-version 6` exits 1. Hence an Xcode project whose `SWIFT_VERSION` is blank or `5` is checked at the `minimal`/`targeted` level unless `SWIFT_STRICT_CONCURRENCY` says otherwise. (SwiftPM differs: tools-version 6.x implies Swift 6 mode, [swift-package.md](../swift-package.md) H1.)
- Practitioner level: [Massicotte, 2026-06-10](https://massicotte.org/blog/wwdc26-unanswered-qa/): "Why is the default for a new project Swift 5 in Xcode 27?" and the same author warns that turning on 6 mode surprises people with crashes from dynamic actor isolation. That is the only source in the corpus for the Xcode 27 default. The Xcode 27 release notes do not mention a template default. Verdict: "new Xcode 27 projects default to Swift 5" is single-source, plausible, unverified: read only.
- Real trees read both ways: element-x-ios sets `SWIFT_VERSION = 6` on 20 of 26 build-configuration blocks and `5.0` on its two project-level blocks (`element-hq/element-x-ios@14e33866ced2:ElementX.xcodeproj/project.pbxproj:10542,10625`), with `AGENTS.md:285` stating "All targets Swift 6 language mode (`SWIFT_VERSION: 6`)"; IceCubesApp sets `6.0` on 10 target blocks and `SWIFT_VERSION = ""` plus `SWIFT_STRICT_CONCURRENCY = complete` on both project-level blocks (`Dimillian/IceCubesApp@2ad6e6891258:IceCubesApp.xcodeproj/project.pbxproj:990-991,1051-1052`). Project-level blank/5.0 is therefore not a reason to alarm: the target block wins (section 5).

### 4. The app-target isolation statement

Apple's position: [WWDC25 268](https://developer.apple.com/videos/play/wwdc2025/268/): main-actor-by-default "primarily for your main app module and any modules that are focused on UI interactions"; "For libraries, it's best to provide a nonisolated API"; "We recommend that all projects adopt [Approachable Concurrency]". The [approachable-concurrency vision](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/visions/approachable-concurrency.md) says executables suit it and libraries should stay nonisolated (the repo rule goes further for CLIs, SW-CONC-11 and owner Q3). [SE-0466](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0466-control-default-actor-isolation.md) lists the exemptions: explicit isolation, inherited isolation, `actor` members, `typealias`/`import`/enum cases, `SendableMetatype` conformers, and types nested in a nonisolated type.

The statement for `apple.md` (applies SW-CONC-11 and SW-PKG-19; SW-CONC-13 app scope; SW-IO Apple scope):

1. `SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor` / `.defaultIsolation(MainActor.self)` may be set on the app target, on UI-only packages that no other product consumes, and on UI test targets (element-x-ios sets it on ElementX, UnitTests, PreviewTests and the two MapLibre UI shims: `ElementX/SupportingFiles/target.yml`, `UnitTests/SupportingFiles/target.yml`, `PreviewTests/SupportingFiles/target.yml`, `Components/MapLibre/*/SupportingFiles/target.yml`; `AGENTS.md:286` (the brief cites `:288`; in the clone at that SHA the line is 286) lists only the first three and says "Other targets (incl. app extensions) nonisolated", so the document undercounts the MapLibre shims by two).
2. Every such target sets the language mode to 6 in the same effective configuration: `SWIFT_VERSION = 6` or `.swiftLanguageMode(.v6)` (IceCubesApp: 9 of 9 manifests that set `defaultIsolation` also carry `.swiftLanguageMode(.v6)`, e.g. `Packages/Timeline/Package.swift:41-42`; counter-example: `element-hq/element-x-ios@14e33866ced2:compound-ios/Package.swift:27,40` sets it at tools 6.2 without the explicit `.v6`, behaviourally Swift 6 but non-conforming to the explicit-v6 clause).
3. Extensions (notification service, share, widgets), networking, persistence, model and algorithm targets are `nonisolated`. Counter-practice exists: IceCubesApp sets MainActor default on all five targets including four extension targets (Notifications, Widgets, Share, Action; pbxproj `:731-734` for the app and one block pair per extension). The extension case is a judgement call: the rule is a SHOULD for extensions and a MUST for libraries, SDKs, CLIs, daemons and servers.
4. Under a MainActor default, a type that must be callable off the main actor is marked `nonisolated` (the SE-0466 exemption list is the place to read why); the compile-level behaviour is [Linux-run] CP2: with `-swift-version 6 -default-isolation MainActor` a `nonisolated func` reading an unannotated class's property exits 1 (`main actor-isolated property 'items' can not be referenced from a nonisolated context`); marking the class `nonisolated` exits 0; the same file in `-swift-version 5` exits 0 with a warning only.
5. Unstructured `Task {}` in app code is a SHOULD under SW-CONC-13: stored, awaited, or written `_ = Task { ... } // fire-and-forget: <why safe>` (owner default 2); views use `.task` (section 7).
6. Apps are bound by SW-IO rules 01-02, 11-17, 28-29 ([swift-io.md:483](../swift-io.md)); they do not spawn processes on iOS, so the subprocess rules do not bind.

### 5. Reading a `.pbxproj`

- A `.pbxproj` has one `XCBuildConfiguration` block per (project or target) x (Debug, Release). Project-level blocks carry no `PRODUCT_BUNDLE_IDENTIFIER`; target blocks do. Measured with the fixture awk `pbx-blocks.awk`:
  - IceCubesApp: 12 blocks, 10 target-level blocks (app plus 4 extensions) all `ver=6.0 iso=MainActor appr=YES`, 2 project-level blocks `ver="" strict=complete`.
  - element-x-ios `ElementX.xcodeproj`: 26 blocks, 20 with `SWIFT_VERSION = 6` and `SWIFT_APPROACHABLE_CONCURRENCY = YES`, 10 with `SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor` (ElementX, UnitTests, PreviewTests, maplibre-interface, maplibre-shim, two configs each), 10 target blocks without it (NSE, share extension, UI, accessibility, integration tests), 2 project-level blocks with `SWIFT_VERSION = 5.0`.
- The effective value of a setting is the most specific block that sets it (target over project), with xcconfig layers in between (`baseConfigurationReference` in the block); evidence is observational (element-x-ios builds Swift 6 targets under project-level `5.0`). The full precedence order is not asserted here (unverified: read only).
- The compound-ios `Inspector.xcodeproj` shows the trap in the other direction: `SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor` sits at project level (`compound-ios/Inspector/Inspector.xcodeproj/project.pbxproj:321,379`) and `SWIFT_VERSION = 6.0` at target level (`:414,448`). The per-block check RH-04a prints both project-level blocks on that file: read the target blocks before judging.
- Generated projects: element-x-ios commits `ElementX.xcodeproj` but generates it from `project.yml` plus per-target `target.yml` with XcodeGen, and `AGENTS.md:384` says "Build settings, entitlements, Info.plist keys, targets -> `project.yml`/`target.yml` + `xcodegen`, never `.xcodeproj` or Xcode project-write tools". A `project.yml` or `Project.swift` beside the `.xcodeproj` means: edit there (RH-10).
- Xcode 27 can answer the question directly: "The Xcode MCP server has been updated with new tools that allow agents to ... inspecting and modifying build settings, compiler flags, entitlements, and Info.plist keys. (176935844)" ([Xcode 27 release notes](https://developer.apple.com/documentation/xcode-release-notes/xcode-27-release-notes)); the same notes add agent plug-ins with skills (178289210) and note "Apple-authored agent skills may not be available to Codex (179171480)"; element-x-ios's `AGENTS.md:380-384` documents `xcrun agent skills export --output-dir <agent skills dir>`. Unverified: read only (no Xcode here).

### 6. `@Observable` vs `ObservableObject`

Primary text, all [unverified: read only] beyond the Linux compile of the Observation module:

- [Observation](https://developer.apple.com/documentation/observation): the `Observable()` macro is available iOS 17 / macOS 14 / watchOS 10 / visionOS 1 (DocC metadata of `Observable()`, fetched 2026-10-10); [`Observations`](https://developer.apple.com/documentation/observation/observations) (the async sequence of transactional changes) iOS/macOS/watchOS/visionOS 26 (Swift 6.2, [SE-0475](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0475-observed.md) status "Implemented (Swift 6.2)"); a `withContinuousObservation(options:apply:)` page exists with availability 27.0 but no abstract in the fetched JSON, so its semantics are not claimed here.
- [Migrating from the Observable Object protocol to the Observable macro](https://developer.apple.com/documentation/swiftui/migrating-from-the-observable-object-protocol-to-the-observable-macro): replace `ObservableObject` with `@Observable`, drop `@Published`, replace `@StateObject` with `@State`, `.environmentObject(x)` with `.environment(x)`, `@EnvironmentObject` with `@Environment(Type.self)`, `@ObservedObject` removed (or `@Bindable` when a binding is needed); migration may be incremental ("Your app can mix data model types that use different observation systems"); behavioural difference: `@Observable` updates a view only when a property its `body` reads changes, `ObservableObject` on any `@Published` change.
- [State](https://developer.apple.com/documentation/swiftui/state): "Declare state as private to prevent setting it in a memberwise initializer"; observable objects created with `Observable()` are stored in `State`; "A `State` property always instantiates its default value when SwiftUI instantiates the view" so avoid expensive default objects there.
- [ObservedObject](https://developer.apple.com/documentation/swiftui/observedobject): "Don't specify a default or initial value for the observed object. Use the attribute only for a property that acts as an input for a view"; "Don't wrap objects conforming to the Observable protocol with `@ObservedObject`".
- `ObservableObject`, `@StateObject`, `@ObservedObject` and `@EnvironmentObject` carry no `deprecatedAt` in DocC metadata (iOS 13/14 introduction only), so "deprecated" is a false claim; the rule is "use `@Observable` for new code".
- History and rationale: [SE-0395](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0395-observability.md) (Swift 5.9): `ObservableObject` "requires using Combine, which is restricted to Darwin platforms and does not use current Swift concurrency features", and requires `@Published` on each observed property.
- [Linux-run] CP4 (6.4 and 6.3, `Observation` is in the Linux toolchain): `@MainActor @Observable final class Counter` read inside `Observations { c.count }` from a **nonisolated** `func watch` exits 1 (`main actor-isolated property 'count' can not be referenced from a Sendable closure`); the same function marked `@MainActor` exits 0; in a `-default-isolation MainActor` module both forms exit 0. So a UI `@Observable` model carries `@MainActor` in a nonisolated-default target, and needs none under a MainActor default (element-x-ios `AGENTS.md:286`: "no redundant `@MainActor`").
- Exemplars show the migration is incremental, not binary: element-x-ios keeps `StateStoreViewModel` on `ObservableObject` and adds `StateStoreViewModelV2` on `Observation` (`ElementX/Sources/Other/SwiftUI/ViewModel/StateStoreViewModel.swift:13,59`, `StateStoreViewModelV2.swift:1-30`; `AGENTS.md:147-160` "Some screens still use older `StateStoreViewModel.swift`"). IceCubesApp has 43 `@Observable` and 0 `ObservableObject` (1 `@StateObject` for `ImageRenderer`, a framework type).
- Reuse of E12: the grep is [SW-GATE-10's E12](../swift-gates.md) verbatim (not restated here beyond its role): run on new and touched code; a hit is a violation unless the deployment floor is below iOS 17 / macOS 14 / watchOS 10, or the file is in a documented incremental migration.

### 7. SwiftUI tells

Each tell has a grep (RH-06*) that was watched red on `plant/Sources/BadView.swift` and silent on `twin/Sources/GoodView.swift`. Compile-level claims about SwiftUI are unverified: read only (SwiftUI does not exist on Linux).

| Tell | Why it is wrong or smells | Correct shape | Detector |
|---|---|---|---|
| `@ObservedObject var vm = FeedModel()` | Apple: no default or initial value on `@ObservedObject` | `@State private var model = FeedModel()` with `@Observable`, or inject | RH-06b |
| `@State var query = ""` (not private) | Apple: declare state `private` (memberwise init conflict) | `@State private var query = ""` | RH-06c |
| `.onAppear { Task { await load() } }` | unstructured task not tied to the view's lifetime | `.task { await load() }` (SwiftUI cancels it) | RH-06d |
| `AnyView(...)` in `body` | [AnyView](https://developer.apple.com/documentation/swiftui/anyview): "Whenever the type of view used with an `AnyView` changes, the old hierarchy is destroyed and a new hierarchy is created" | `@ViewBuilder`, `Group`, `some View` generics | RH-06a, then read |
| `NavigationView`, `.foregroundColor(`, `.cornerRadius(`, `.tabItem`, `.navigationBarItems`, `edgesIgnoringSafeArea`, `.accentColor(`, `UIScreen.main` | superseded; DocC messages below | `NavigationStack`/`NavigationSplitView`, `.foregroundStyle`, `.clipShape(.rect(cornerRadius:))`, `Tab`, `.toolbar`, `ignoresSafeArea`, `.tint`, trait/context screen | RH-06e |
| `.onChange(of: x) { value in ... }` or `perform:` | one-parameter closure deprecated at iOS 17 / macOS 14 | `{ old, new in }` or `{ }` | RH-06f |
| UI `@Observable` without `@MainActor` in a nonisolated-default target | isolation mismatch (CP4) | `@MainActor @Observable` | RH-06g |
| `.sink`, `AnyCancellable`, `PassthroughSubject` in view-model code | Combine at a non-seam (section 10) | Observation / `AsyncSequence` | RH-06h (census, read) |
| `print(` in app code | an app logs through one logger | the project logger (element-x-ios bans `print` with a SwiftLint custom rule: `.swiftlint.yml:75-79`, `regex: "\\b(print)\\b"`, `severity: error`, message "MXLog should be used instead of print()") | RH-11 (CONSIDER; `print` is legitimate in CLIs) |

DocC deprecation metadata (fetched 2026-10-10, [NavigationView](https://developer.apple.com/documentation/swiftui/navigationview) and siblings via the DocC JSON): `NavigationView` deprecatedAt 27.2 ("use NavigationStack or NavigationSplitView instead"), `.foregroundColor(_:)` 27.2, `.cornerRadius(_:antialiased:)` 27.2 ("Use `clipShape` or `fill` instead"), `.tabItem(_:)` 27.2 ("Use `Tab(title:image:value:content:)`"), `.accentColor(_:)` 27.2 ("Use the asset catalog's accent color or View.tint(_:)"), `.navigationBarItems(leading:trailing:)` 27.2, `.edgesIgnoringSafeArea(_:)` 27.2, `.alert(isPresented:content:)` 27.2, `ActionSheet` 27.2, `.onChange(of:perform:)` 17.0 (macOS 14.0), `UIScreen.main` 26.0. All carry `deprecated: false` in the metadata, so on the iOS 26/27 SDKs the first group may not yet raise a compiler warning (unverified: read only); the greps are for agent hygiene, not for compiler-warning mirroring. `NavigationLink`, `.foregroundStyle` (iOS 15), `NavigationStack` (iOS 16), `Tab` (iOS 18) and `.onChange(of:initial:_:)` (iOS 17) are current.

Size of a view: a fixture awk (`body-len.awk`) over `var body: some View {` blocks, excluding generated files and mocks, gives:

| Corpus | `body` blocks | median | p90 | p99 | max | > 100 lines |
|---|---|---|---|---|---|---|
| IceCubesApp@2ad6e6891258 | 184 | 29 | 86 | 171 | 224 (`StatusRowView.swift:43`) | 16 (8.7%) |
| element-x-ios@14e33866ced2 | 379 | 13 | 34 | 75 | 165 (`DeveloperOptionsScreen.swift:25`) | 6 (1.6%) |

"Massive view" is therefore operationalised as a `body` over 100 lines: over the p99 of element-x-ios (which enforces small screen views) and the p90 of IceCubesApp. It is a review prompt for extraction into subviews, not a violation.

`AnyView` is not a ban: of 232 element-x-ios mentions, 93 are the coordinator boundary `func toPresentable() -> AnyView`; IceCubesApp has 8 (type-erased storage such as `ImageRenderer<AnyView>` at `StatusRowShareAsImageView.swift:11`). The tell is `AnyView` inside `body`, `ForEach` content or a conditional builder.

### 8. Availability and deployment-floor drift

- Source of truth: `@available(iOS 17, *)` and `#available(iOS 17, *)` in code ([TSPL Attributes](https://raw.githubusercontent.com/swiftlang/swift-book/main/TSPL.docc/ReferenceManual/Attributes.md), "available"); the floor is `IPHONEOS_DEPLOYMENT_TARGET` (pbxproj/xcconfig) or `platforms: [.iOS(.v18)]` (manifest).
- Three kinds of drift:
  1. Dead guard: `#available(iOS N, *)` where N is at or below the floor. IceCubesApp: target floor 18.5 (`project.pbxproj:716`), package floor `.iOS(.v18)` (`Packages/Env/Package.swift:10`), yet `Packages/Env/Sources/Env/Ext/TranslationView.swift:11` guards `iOS 17.4`; 6 such guards in 56 iOS availability mentions (RH-08 with floor 18). element-x-ios's 10 hits at floor 18 are all in `ElementX/Sources/Generated/Assets.swift` (SwiftGen output: exempt, never hand-edit).
  2. Unguarded newer API: compile error in Xcode ("... is only available in iOS N"). Unverified: read only; this is why the floor table below matters to a reader who cannot compile.
  3. Mismatched floors across targets and files: element-x-ios has project-level `IPHONEOS_DEPLOYMENT_TARGET = 18.5` and `MACOSX_DEPLOYMENT_TARGET = 14.5` (`project.yml:14-16`) but 26.0 on UnitTests/PreviewTests blocks (`project.pbxproj:10292,10430`). The reading step: take the minimum over target blocks that ship to users.
- Pinned floors (DocC metadata fetched 2026-10-10; Apple platforms only; unverified: read only):

| API | iOS | macOS | watchOS | visionOS | Note |
|---|---|---|---|---|---|
| `@Observable` (`Observable()`), `@Bindable` | 17.0 | 14.0 | 10.0 | 1.0 | Swift 5.9 |
| `Observations` | 26.0 | 26.0 | 26.0 | 26.0 | Swift 6.2 |
| `withContinuousObservation(options:apply:)` | 27.0 | 27.0 | 27.0 | 27.0 | page only, semantics not read |
| `Mutex` (`import Synchronization`) | 18.0 | 15.0 | 11.0 | 2.0 | |
| `OSAllocatedUnfairLock` (`import os`) | 16.0 | 13.0 | 9.0 | none listed | |
| `NavigationStack` | 16.0 | 13.0 | | | |
| `Tab` | 18.0 | 15.0 | | | |
| `.onChange(of:initial:_:)` | 17.0 | 14.0 | | | |
| `.foregroundStyle(_:)` | 15.0 | 12.0 | | | |
| `.ignoresSafeArea(_:edges:)` | 14.0 | 11.0 | | | |

- Agents guess these numbers. The usual error is writing `@available(iOS 17, *)` on a view that uses `Observations` (iOS 26) or `Tab` (iOS 18), or applying an `Observable` guard to code whose floor is already 17+.

### 9. `Mutex` vs `OSAllocatedUnfairLock` floors (concurrency owner default 1)

- The Swift 6.2 default in [swift-concurrency.md](../swift-concurrency.md) Open question 1 is "`Mutex` everywhere; an app with a lower floor uses `OSAllocatedUnfairLock`, labelled read-only". The floors are now pinned: `Mutex` iOS 18 / macOS 15 / watchOS 11 / visionOS 2 ([Mutex](https://developer.apple.com/documentation/synchronization/mutex)); `OSAllocatedUnfairLock` iOS 16 / macOS 13 / watchOS 9 ([OSAllocatedUnfairLock](https://developer.apple.com/documentation/os/osallocatedunfairlock)). Default retained: `Mutex` when every shipped target's floor is at or above those numbers; `OSAllocatedUnfairLock(initialState:)` plus `withLock` below that.
- Apple's own text for the unfair lock: use `OSAllocatedUnfairLock` instead of `os_unfair_lock` (a value type with no stable address); `lock()`/`unlock()` must be called from the same thread so they are "unsafe to use ... across an `await` suspension point"; "consider using an Actor".
- Exemplars: element-x-ios (floor 18.5) already uses `Mutex<Int>` in test helpers (`UnitTests/Sources/TestUtilities/WaitingConfirmation.swift:28`) and imports `Synchronization` in 14 files; IceCubesApp (floor 18.5) uses `OSAllocatedUnfairLock<Critical>` in `Packages/NetworkClient/Sources/NetworkClient/MastodonClient.swift:50-53`, a legitimate choice that predates or ignores the available `Mutex`.
- Linux is no oracle: `Mutex` compiles on Linux for every floor, so only RH-09 (grep) can warn about an Apple floor violation; the compile error itself is unverified: read only.

### 10. Combine guidance

- Combine is not deprecated: the Combine module and `Published` carry no `deprecatedAt` ([Combine](https://developer.apple.com/documentation/combine), [Published](https://developer.apple.com/documentation/combine/published)). Observation was designed to replace the `ObservableObject` use of Combine ([SE-0395](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0395-observability.md)).
- Guidance for new code (a SHOULD): in-process state is `@Observable`; a stream of state changes outside SwiftUI is `Observations { ... }` (iOS 26, Swift 6.2: "streaming transactional state changes", [Swift 6.2 release](https://www.swift.org/blog/swift-6.2-released/)) or an `AsyncStream`; Combine remains correct where an Apple API vends a `Publisher` (`NotificationCenter.publisher`, `URLSession.dataTaskPublisher`, KVO `publisher(for:)`), bridged to async with `.values` ([AsyncPublisher](https://developer.apple.com/documentation/combine/asyncpublisher), iOS 15).
- Do not mass-migrate. element-x-ios: 468 files import Combine, 476 `PassthroughSubject`/`CurrentValueSubject` mentions, 159 `AnyCancellable`, yet its newest state store is Observation-based. IceCubesApp: 24 files import Combine, 2 subject mentions, 0 `AnyCancellable`.
- Combine closures in a Swift 6 target are a concurrency hazard (`sink` closures are not `@MainActor`-isolated by default); the specifics need a macOS runner (unverified: read only; flagged for the follow-up named in swift-concurrency.md, "Darwin libdispatch and the Apple runtime").
- Detector: RH-06h prints `.sink`, `AnyCancellable`, `PassthroughSubject`, `CurrentValueSubject` lines; they are a census to read, not an automatic violation.

### 11. Stale points in the practitioner sources

[Donny Wals, 2025-09-11](https://www.donnywals.com/should-you-opt-in-to-swift-6-2s-main-actor-isolation/):

- Correct and still useful: "Global actor isolation is set to MainActor.self" and "Approachable concurrency is enabled" for new Xcode 26 projects; the only valid values for the SwiftPM API are `MainActor.self` and `nil`; `.defaultIsolation(MainActor.self)` in `swiftSettings`.
- Stale for the 6.4 template: "a newly created SPM Package will not have its defaultIsolation flag set ... won't have Approachable Concurrency turned on". `swift package init` on 6.4 writes `.enableUpcomingFeature("ApproachableConcurrency")` into library and test targets (measured in the prior waves; [practitioner.md](../swift-topic-map/practitioner.md) line 35; frame correction "The 6.4 init template adds ApproachableConcurrency").
- Mixed: "nil and MainActor.self" are SwiftPM spellings. In an xcconfig the values are `nonisolated` and `MainActor` (section 2).

[AvdLee Swift-Concurrency-Agent-Skill SKILL.md](https://raw.githubusercontent.com/AvdLee/Swift-Concurrency-Agent-Skill/main/skills/swift-concurrency/SKILL.md):

- Still right and adopted here: "Analyze `Package.swift` or `.pbxproj` to determine Swift language mode, strict concurrency level, default isolation, and upcoming features. Do this always"; treat Xcode 26 defaults as "likely defaults ..., not as confirmed settings".
- Stale: the table cell "Language mode | `swiftLanguageVersions` or `-swift-version`" (the manifest API is deprecated; use `swiftLanguageModes` / `.swiftLanguageMode`; [Linux-run] CP5: `swiftLanguageVersions` warns on 6.4 and 6.3); "Approachable Concurrency | SwiftPM: N/A (use individual upcoming features)" ( `ApproachableConcurrency` is accepted and effective as an upcoming-feature name, CP3, though the repo still spells members); "Strict concurrency | `.enableExperimentalFeature("StrictConcurrency=targeted")`" is the Swift 5 mode route only.
- Not stale, and worth flagging for correctness: `Task { @concurrent in ... }` compiles on 6.4 and 6.3 ([Linux-run] during probing: `swiftc -typecheck -parse-as-library -swift-version 6` exit 0 on both).

[Massicotte, 2026-06-10](https://massicotte.org/blog/wwdc26-unanswered-qa/): current; the two Q&As relevant here are the Swift 5 default for Xcode 27 projects and "Apple's de facto recommendation for new app targets is default MainActor, because that's what the Xcode template does. In my experience, this mode can be very challenging to use". Contested, see section "Contested / evolving".

## Normative guidance candidates

Family SW-APPLE. Every rule below is "unverified: read only" as to Xcode behaviour; the Run line says what was actually watched. Commands are quoted exactly as run (all from the tree root; empty output is a pass; a pipeline through `xargs -r` exits 0 or 123, judge by output).

**SW-APPLE-01 (MUST). Before changing or advising on concurrency settings, read the effective `SWIFT_VERSION`, `SWIFT_STRICT_CONCURRENCY`, `SWIFT_DEFAULT_ACTOR_ISOLATION` and `SWIFT_APPROACHABLE_CONCURRENCY` for the target in question (target block, then xcconfig, then project block) and state them; never infer them from the Xcode version.**
- Why: an unset language mode is Swift 5 (CP1) and the Xcode 27 default is single-source; the same code is a warning or an error depending on it.
- Verify: `grep -rn -e 'SWIFT_VERSION' -e 'SWIFT_STRICT_CONCURRENCY' -e 'SWIFT_DEFAULT_ACTOR_ISOLATION' -e 'SWIFT_APPROACHABLE_CONCURRENCY' --include='*.pbxproj' --include='*.xcconfig' .` and, for generated projects, the same names in `project.yml`/`target.yml`; named reading heuristic (project-level vs target-level blocks, section 5).
- Run: no for the read step (a reading heuristic); the per-setting checks below are run.
- Binds: apps, Apple-platform packages. Floor: Xcode 26.

**SW-APPLE-02 (MUST). A generated project is edited at its generator: when a `project.yml`, `target.yml` or `Project.swift` exists beside the `.xcodeproj`, build settings change there, never in the `.pbxproj`.**
- Why: the pbxproj is output; element-x-ios `AGENTS.md:384` forbids hand edits.
- Verify: `find . -maxdepth 3 -name 'project.yml' -o -name 'Project.swift' -o -name 'target.yml'` (informational: a hit means "edit this file"); reading heuristic.
- Run: yes for the command (RH-10 prints `./project.yml` on both trees); not a red/green check, a routing aid.
- Binds: apps with XcodeGen or Tuist (element-x-ios, tuist). Floor: any.

**SW-APPLE-03 (MUST). Build-setting names in `.pbxproj`/`.xcconfig` exist in swift-build's `Swift.xcspec`; a name outside the list is a typo or a hallucination.**
- Why: unknown `SWIFT_*` names and unknown upcoming-feature names are accepted silently (CP3-typo); a setting that does nothing looks like a setting that works.
- Verify: `grep -rhow -e 'SWIFT_[A-Z0-9_]*' --include='*.pbxproj' --include='*.xcconfig' . | sort -u | grep -v -x -F -f /home/mherwig/.cache/research-lang/swift-tools/fixtures/reading-heuristics/swift-settings-oracle.txt` (output is the violation; the oracle list is the 183 `SWIFT_*` names in swift-build's `.xcspec` files and `BuiltinMacros.swift`, regenerate it from a checkout of `swiftlang/swift-build`).
- Run: yes. RH-02 plant: exit 0, prints `SWIFT_APPROACHABLE_CONCURENCY`, `SWIFT_DEFAULT_ACTOR_ISOLATON`, `SWIFT_DEFAULT_ISOLATION`; twin: exit 1, empty; also empty (exit 1) on element-x-ios, compound-ios, IceCubesApp, swift-collections/Xcode, tuist.
- Binds: apps; grep needs the oracle file shipped beside the rule. Floor: Xcode 26 names.

**SW-APPLE-04 (MUST). Spell values exactly: `SWIFT_DEFAULT_ACTOR_ISOLATION` is `MainActor` or `nonisolated`; `SWIFT_APPROACHABLE_CONCURRENCY` is `YES` or `NO`; the SwiftPM spellings `MainActor.self`, `main-actor`, `.mainActor`, and prose booleans such as `Enabled`, `true`, `ON` do not belong in an xcconfig.**
- Why: the compiler rejects `main-actor` and `MainActor.self` (CP2-badv1/2, exit 1); swift-build treats a Boolean by its first character, so `Enabled` is false and `true` is true (`String.swift:60-68`), which is why only `YES`/`NO` are canonical.
- Verify: `grep -rn -e 'SWIFT_DEFAULT_ACTOR_ISOLATION' --include='*.pbxproj' --include='*.xcconfig' . | grep -v -e '= MainActor[; ]*$' -e '= nonisolated[; ]*$'` and `grep -rn -e 'SWIFT_APPROACHABLE_CONCURRENCY' --include='*.pbxproj' --include='*.xcconfig' . | grep -v -e '= YES[; ]*$' -e '= NO[; ]*$'` (output is the violation).
- Run: yes. RH-03a plant exit 0, 1 line (`MainActor.self`); RH-03b plant exit 0, 1 line (`Enabled`); both twin exit 1, empty; both empty on element-x-ios and IceCubesApp.
- Binds: apps. Floor: Xcode 26.

**SW-APPLE-05 (MUST). A target that sets `SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor` sets `SWIFT_VERSION` to 6 (`6` or `6.0`) in the same build-configuration block or an xcconfig it references; `-swift-version` and `-language-mode` never appear in `OTHER_SWIFT_FLAGS`.**
- Why: in Swift 5 mode the isolation errors become warnings (CP2-mode5 exit 0 with warning) and nothing enforces the default; swift-build warns when `OTHER_SWIFT_FLAGS` overrides the language mode (`SwiftCompiler.swift:1250-1256`).
- Verify (pbxproj, per block): `grep -rl -e 'SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor' --include='*.pbxproj' . | xargs -r awk '/isa = XCBuildConfiguration;/ {b=1; iso=0; ver=""} b && /SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor/ {iso=1} b && /SWIFT_VERSION = / {ver=$3} b && /^\t\t\t\};$/ {if (iso && ver !~ /^"?6(\.0)?"?;$/) print FILENAME ": MainActor default without SWIFT_VERSION 6, block ends line " FNR " (ver=" ver ")"; b=0}'`; (xcconfig, per file): `grep -rl -e 'SWIFT_DEFAULT_ACTOR_ISOLATION *= *MainActor' --include='*.xcconfig' . | xargs -r grep -L -e 'SWIFT_VERSION *= *6'`; (override): `grep -rn -e 'OTHER_SWIFT_FLAGS' --include='*.pbxproj' --include='*.xcconfig' . | grep -e '-swift-version' -e '-language-mode'`. Known false positive: MainActor at project level and `SWIFT_VERSION` at target level (compound-ios Inspector, 2 lines): read the target block.
- Run: yes. RH-04a plant: exit 0, 1 line (`ver=5.0;`); RH-04b plant: exit 123, `./Config/Shared.xcconfig`; RH-04d plant: exit 0, 1 line; twin: all empty. Real trees: IceCubesApp empty; element-x-ios 2 known false positives (Inspector).
- Binds: apps. Floor: Xcode 26.

**SW-APPLE-06 (MUST). `.defaultIsolation(MainActor.self)` appears only in app-target-bound manifests (UI-only packages no other product consumes, compile-test executables), and every manifest that has it also sets `.swiftLanguageMode(.v6)` (or `swiftLanguageModes: [.v6]`) explicitly.**
- Why: SW-CONC-11 / SW-PKG-19; a published library that sets it breaks nonisolated consumers; the explicit `.v6` keeps the manifest valid if tools-version defaults change.
- Verify: `grep -rn -e 'defaultIsolation' --include='Package*.swift' .` (every hit must be an app-internal manifest; a `.library` product consumed outside the app is a violation: read) and `grep -rl -e 'defaultIsolation' --include='Package*.swift' . | xargs -r grep -L -e 'swiftLanguageMode(.v6)' -e 'swiftLanguageModes: \[.v6\]'` (output is the violation).
- Run: yes. RH-05b plant: exit 123, prints `./Packages/NetKit/Package.swift`; twin: exit 0, empty. Real: IceCubesApp empty (9/9 compliant); element-x-ios prints `./compound-ios/Package.swift` (tools 6.2, behaviourally Swift 6). RH-05a is the unfiltered SW-CONC-11 grep (informational; hits on the twin's app-internal package by design).
- Binds: apps with local packages. Floor: tools 6.2 (SE-0466).

**SW-APPLE-07 (SHOULD). App targets set `SWIFT_APPROACHABLE_CONCURRENCY = YES`; Swift packages (any kind) spell the member features instead of listing the bundle, per SW-PKG-16 and SW-CONC-12; a manifest that mirrors an Xcode project spells the five members.**
- Why: Apple recommends the bundle for all projects ([WWDC25 268](https://developer.apple.com/videos/play/wwdc2025/268/)); the bundle name hides what it enables, and in Swift 6 mode only NonisolatedNonsendingByDefault and InferIsolatedConformances add anything (swift-package.md C6).
- Verify: `grep -rn -e 'SWIFT_APPROACHABLE_CONCURRENCY' --include='*.pbxproj' --include='*.xcconfig' .` (each app target should show `YES`); packages: `grep -rn -e 'ApproachableConcurrency' --include='Package*.swift' .` (SW-CONC-12).
- Run: partly: CP3 [Linux-run] shows the bundle name and `NonisolatedNonsendingByDefault` both turn `nnbd.swift` from exit 1 (`SendingRisksDataRace`) to exit 0 on 6.4 and 6.3, and a typo'd name stays at exit 1.
- Binds: apps (SHOULD), libraries (spell members). Floor: Swift 6.2.

**SW-APPLE-08 (SHOULD). Isolation by target kind: MainActor default on the app target, UI-only packages and UI test targets; `nonisolated` on extensions that do background work (notification service), data, network, persistence and model targets; a type that must be used off the main actor is marked `nonisolated` (SE-0466 exemption list).**
- Why: Apple: main-actor default is "primarily for your main app module and any modules that are focused on UI interactions"; libraries stay nonisolated; the vision document makes the same split.
- Verify: named reading heuristic: list target blocks and their `iso=` with the fixture awk `pbx-blocks.awk` (`awk -f pbx-blocks.awk App.xcodeproj/project.pbxproj`) or the generator YAML, and compare against the target's role (`PRODUCT_BUNDLE_IDENTIFIER` suffix, `productType`). Counter-practice: IceCubesApp sets MainActor on all 4 extension targets.
- Run: no for the judgement; the compile-level behaviour (nonisolated function against a MainActor-default class) is [Linux-run] CP2: red exit 1, twin (class marked `nonisolated`) exit 0, on 6.4 and 6.3.
- Binds: apps. Floor: Swift 6.2.

**SW-APPLE-09 (MUST). New observable model types use `@Observable` held by `@State private` (or injected via `.environment` / `@Environment(Type.self)`), with `@Bindable` for bindings; `ObservableObject`, `@Published`, `@StateObject`, `@ObservedObject`, `@EnvironmentObject` appear only in files whose deployment floor is below iOS 17 / macOS 14 / watchOS 10, or in an incremental migration with a named target type.**
- Why: Apple's migration guide; per-property tracking; SE-0395 on Combine's limits. `ObservableObject` is not deprecated, so the exemption is a floor test, not a deprecation test.
- Verify: the K-07 E12 grep (SW-GATE-10, verbatim): `grep -rn --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -F -e 'ObservableObject' -e '@Published' -e '@StateObject' -e '@ObservedObject' -e '@EnvironmentObject' .` on new and touched files; exemption test: `grep -rn -e 'IPHONEOS_DEPLOYMENT_TARGET' --include='*.pbxproj' --include='*.xcconfig' .` (or `platforms:` in manifests) must show a floor below 17.
- Run: yes. RH-01 plant: exit 0, 5 lines; twin: exit 1, empty.
- Binds: apps; new and touched code. Floor: iOS 17 / macOS 14 / watchOS 10 / visionOS 1.

**SW-APPLE-10 (MUST). `@ObservedObject` never carries an initial value; `@State` is `private`; async work started by a view uses `.task`, not `.onAppear { Task { ... } }`.**
- Why: Apple's `ObservedObject` and `State` documentation; `.task` ties the work to the view lifetime.
- Verify: `grep -rn -e '@ObservedObject[^=]*= ' --include='*.swift' .`; `grep -rn -e '@State var' -e '@State public var' -e '@State internal var' --include='*.swift' .`; `grep -rn -A1 -e '\.onAppear' --include='*.swift' . | grep -e 'Task[[:space:]]*{'` (output is the violation; known miss: `@State` on its own line, a `Task(priority:)` split over lines).
- Run: yes. RH-06b, RH-06c, RH-06d plant exit 0 with 1 line each; twin exit 1, empty.
- Binds: apps. Floor: any (b, c), iOS 15 for `.task`.

**SW-APPLE-11 (MUST). In a target whose default isolation is `nonisolated`, an `@Observable` class that a view reads carries `@MainActor`; in a MainActor-default target it does not (no redundant attribute).**
- Why: CP4: a MainActor `@Observable` read from a nonisolated function does not compile; the mismatch is the usual first error after an agent moves a model into a package.
- Verify: `grep -rl -e '@Observable' --include='*.swift' Packages/DataKit/Sources | xargs -r awk 'FNR==1 {prev=""} /@Observable/ && !/@MainActor/ && prev !~ /@MainActor/ {print FILENAME ":" FNR ": " $0} {prev=$0}'` run against each nonisolated-default target directory (substitute its source directory for `Packages/DataKit/Sources`); output is the violation.
- Run: yes. RH-06g plant: exit 0, 1 line; twin: exit 0, empty. CP4 [Linux-run]: `Observations { c.count }` in a nonisolated function exit 1, the `@MainActor` twin exit 0, on 6.4 and 6.3.
- Binds: apps and app-internal packages. Floor: iOS 17 (macro), iOS 26 (`Observations`).

**SW-APPLE-12 (SHOULD). Do not use the superseded SwiftUI API: `NavigationView`, `.foregroundColor(`, `.cornerRadius(`, `.tabItem`, `.navigationBarItems`, `edgesIgnoringSafeArea`, `.accentColor(`, `UIScreen.main`, and the one-parameter `.onChange(of:)`/`perform:` forms; each has a replacement at or below the app floor except `Tab` (iOS 18).**
- Why: DocC deprecation metadata (section 7); the one-parameter `onChange` is deprecated at iOS 17.
- Verify: `grep -rn -e 'NavigationView' -e '\.foregroundColor(' -e '\.cornerRadius(' -e '\.tabItem' -e '\.navigationBarItems' -e 'edgesIgnoringSafeArea' -e '\.accentColor(' -e 'UIScreen\.main' --include='*.swift' .` and `grep -rn -e '\.onChange(of:[^{]*{[[:space:]]*[A-Za-z_][A-Za-z0-9_]*[[:space:]]*in' -e 'onChange(of:[^)]*perform:' --include='*.swift' .` (output is the violation). Exemption: a floor below the replacement's introduction (NavigationStack iOS 16, foregroundStyle iOS 15, Tab iOS 18); existing code is not rewritten wholesale (IceCubesApp: 76 `.foregroundColor(`, 31 `.cornerRadius(`).
- Run: yes. RH-06e plant: exit 0, 4 lines; RH-06f plant: exit 0, 1 line; twin: exit 1, empty.
- Binds: apps; new and touched code. Floor: see text.

**SW-APPLE-13 (SHOULD). `AnyView` appears only at type-erasure boundaries (coordinator-to-UIKit hosting, `ImageRenderer<AnyView>`, stored erased content); not inside `body`, `ForEach` content or conditional builders. A `body` over 100 lines is split into subviews.**
- Why: Apple's AnyView text (hierarchy destroyed on type change); measured body sizes (median 13-29, p99 75-171).
- Verify: `grep -rn -F -e 'AnyView' --include='*.swift' .` then read each hit for context; body length with `awk -f body-len.awk <file>` (fixture script, prints `file:line lines`); named reading heuristic.
- Run: yes for the grep (RH-06a plant exit 0, 1 line; twin exit 1, empty); the body-length awk was run on both exemplars (table in section 7).
- Binds: apps. Floor: any.

**SW-APPLE-14 (MUST). Availability guards match the floor: no `#available(iOS N, *)` or `@available(iOS N, *)` with N at or below the minimum deployment target (the guard is dead code), and no newer API without a guard; generated files are exempt.**
- Why: dead guards hide the real floor and mislead agents; unguarded newer API fails to compile (unverified: read only).
- Verify: first read the floor (`grep -rn -e 'IPHONEOS_DEPLOYMENT_TARGET' --include='*.pbxproj' --include='*.xcconfig' .`, `grep -rn -e 'platforms' --include='Package*.swift' .`), then `grep -rn -e '#available(iOS [0-9]*' -e '@available(iOS [0-9]*' --include='*.swift' . | awk -F'iOS ' '{ split($2, a, /[^0-9]/); if (a[1] + 0 <= 17) print }'` with `17` replaced by the floor's major version; output is the violation.
- Run: yes. RH-08 plant (floor 17): exit 0, 1 line (`#available(iOS 15`); twin (floor 26, guard `iOS 27`): exit 0, empty. On IceCubesApp at floor 18: 6 dead `iOS 17.4` guards; element-x-ios: 10 hits, all in generated `Assets.swift`.
- Binds: apps. Floor: any. Known limit: the awk compares the major number only; a `17.4` guard against a `17.0` floor is correctly not flagged at floor 17 but flagged at floor 18.

**SW-APPLE-15 (MUST). A lock for mutable state in app code is `Mutex` when every shipped target's floor is at least iOS 18 / macOS 15 / watchOS 11 / visionOS 2, otherwise `OSAllocatedUnfairLock` used through `withLock`; `lock()`/`unlock()` is never used across an `await`; `NSLock`, `os_unfair_lock` are K-07 E14 tells.**
- Why: pinned floors (section 9); Apple's unfair-lock text on suspension points; closes the concurrency owner's default 1.
- Verify: `grep -rl -e 'import Synchronization' --include='*.swift' . | xargs -r -I{} grep -rn -e 'IPHONEOS_DEPLOYMENT_TARGET = 1[0-7]' --include='*.pbxproj' --include='*.xcconfig' .` (output is the violation: a floor below 18 in a project that imports `Synchronization`; macOS/watchOS analogues use `MACOSX_DEPLOYMENT_TARGET = 1[0-4]`, `WATCHOS_DEPLOYMENT_TARGET = ` below 11). Pair with SW-GATE-10 E14.
- Run: yes for the grep. RH-09 plant (floor 17.0, imports `Synchronization`): exit 0, 3 lines; twin (floor 26.0): exit 123, empty. The Apple-only compile error ("only available in iOS 18") is unverified: read only.
- Binds: apps. Floor: as stated.

**SW-APPLE-16 (SHOULD). New in-process state flow uses Observation or `AsyncSequence`, not Combine pipelines; Combine stays at framework seams that vend a `Publisher` and is bridged with `.values`; existing Combine code is not migrated wholesale.**
- Why: SE-0395; Combine is not deprecated (no `deprecatedAt`), so the rule is "new code", not "remove"; element-x-ios shows a codebase with 468 Combine files migrating one store at a time.
- Verify: `grep -rn -e '\.sink' -e 'AnyCancellable' -e 'PassthroughSubject' -e 'CurrentValueSubject' --include='*.swift' .` on new and touched files (a census to read, not an automatic failure).
- Run: yes (RH-06h plant exit 0, 3 lines; twin exit 1, empty); the judgement "is this a framework seam" is a reading heuristic.
- Binds: apps. Floor: `Observations` iOS 26; `.values` iOS 15.

**SW-APPLE-17 (SHOULD, app scope of SW-CONC-13). Unstructured `Task {}` in app code is stored and cancelled, awaited, or a callback bridge written `_ = Task { ... } // fire-and-forget: <why safe>`; a statement-position `Task {` is a violation; views use `.task`.**
- Why: owner default 2: SHOULD for app code (element-x-ios 416 and IceCubesApp 170 bare tasks per the concurrency audit).
- Verify: `grep -rn -e '^[[:space:]]*Task[[:space:]]*{' --include='*.swift' Sources` (output is the violation) and `grep -rl -e '_ = Task' --include='*.swift' Sources | xargs -r awk 'FNR==1 {prev=""} /_ = Task/ && $0 !~ /fire-and-forget:/ && prev !~ /fire-and-forget:/ {print FILENAME ":" FNR ": " $0} {prev=$0}'` (output is the violation).
- Run: yes. RH-07a plant exit 0, 1 line; RH-07b plant exit 0, 1 line; twin exit 1 / exit 0 with empty output.
- Binds: apps (SHOULD). Floor: Swift 5.5.

**SW-APPLE-18 (CONSIDER). An app declares its logger and bans `print(` with a lint custom rule or the grep below; `print(` stays legitimate in CLIs.**
- Why: element-x-ios bans `print` at error severity (`.swiftlint.yml:75-79`); SW-GATE-10 rejected a generic `print(` tell because CLIs print on purpose.
- Verify: `grep -rn -e '[^.A-Za-z_]print(' --include='*.swift' Sources` (output is the violation) or the SwiftLint `custom_rules` entry via `swiftlint-sk.sh` (the static binary skips `custom_rules`, SW-GATE-11).
- Run: yes for the grep (RH-11 plant exit 0, 4 lines; twin exit 1, empty); the SwiftLint form was not re-run here.
- Binds: apps (CONSIDER). Floor: any.

**SW-APPLE-19 (SHOULD). Where Xcode 27's MCP server is attached to the agent, read and change build settings through it (`inspect/modify build settings, compiler flags, entitlements, Info.plist keys`) rather than editing a pbxproj; fall back to SW-APPLE-01..05 otherwise.**
- Why: the server resolves the effective value that the greps can only approximate.
- Verify: named reading heuristic (does the session list an Xcode MCP tool?). Release-notes claim, unverified: read only.
- Run: no.
- Binds: Xcode 27 sessions. Floor: Xcode 27.

## Verification runs

Fixture root: `/home/mherwig/.cache/research-lang/swift-tools/fixtures/reading-heuristics/`. Generator `gen.py` writes `plant/` and `twin/`; `checks.sh <plant|twin> <ios-floor>` runs RH-*; logs `run-plant.log`, `run-twin.log`; `cp.sh` runs CP-* on 6.4 then 6.3 into `run-compile.log`. Red = non-empty output (the violation); green = empty output. `xargs -r` pipelines exit 123 when an inner grep finds nothing: judge by output.

### Grep and awk checks (RH-*), grep-run

| ID | Check (see SW-APPLE rule) | plant exit / lines | twin exit / lines | Output on plant |
|---|---|---|---|---|
| RH-01 | E12, SW-APPLE-09 | 0 / 5 | 1 / 0 | `BadView.swift:4 ObservableObject`, `:5 @Published`, `:12 @ObservedObject`, `:13 @StateObject`, `:14 @EnvironmentObject` |
| RH-02 | settings-name oracle, -03 | 0 / 3 | 1 / 0 | `SWIFT_APPROACHABLE_CONCURENCY`, `SWIFT_DEFAULT_ACTOR_ISOLATON`, `SWIFT_DEFAULT_ISOLATION` |
| RH-03a | isolation value, -04 | 0 / 1 | 1 / 0 | `project.pbxproj:43 SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor.self;` |
| RH-03b | approachable value, -04 | 0 / 1 | 1 / 0 | `project.pbxproj:42 SWIFT_APPROACHABLE_CONCURRENCY = Enabled;` |
| RH-04a | MainActor without v6, pbxproj, -05 | 0 / 1 | 0 / 0 | `MainActor default without SWIFT_VERSION 6, block ends line 23 (ver=5.0;)` |
| RH-04b | same, xcconfig | 123 / 1 | 0 / 0 | `./Config/Shared.xcconfig` |
| RH-04c | any `SWIFT_VERSION` 4 or 5 (informational list) | 0 / 2 | 1 / 0 | `project.pbxproj:22 SWIFT_VERSION = 5.0;`, `Shared.xcconfig:2 SWIFT_VERSION = 5` |
| RH-04d | `-swift-version` in `OTHER_SWIFT_FLAGS` | 0 / 1 | 1 / 0 | `Shared.xcconfig:6 OTHER_SWIFT_FLAGS = $(inherited) -swift-version 5 ...` |
| RH-05a | SW-CONC-11 raw grep (informational) | 0 / 1 | 0 / 1 (legit app-internal package) | `NetKit/Package.swift:7`, `UILib/Package.swift:8` |
| RH-05b | manifest lacks explicit v6, -06 | 123 / 1 | 0 / 0 | `./Packages/NetKit/Package.swift` |
| RH-06a | AnyView | 0 / 1 | 1 / 0 | `BadView.swift:19` |
| RH-06b | initialized `@ObservedObject` | 0 / 1 | 1 / 0 | `BadView.swift:12` |
| RH-06c | non-private `@State` | 0 / 1 | 1 / 0 | `BadView.swift:15` |
| RH-06d | `.onAppear { Task` | 0 / 1 | 1 / 0 | `BadView.swift:23` |
| RH-06e | superseded API | 0 / 4 | 1 / 0 | lines 17, 19, 20, 29 |
| RH-06f | one-parameter `onChange` | 0 / 1 | 1 / 0 | `BadView.swift:22` |
| RH-06g | `@Observable` without `@MainActor` (nonisolated target) | 0 / 1 | 0 / 0 | `DataKit/Model.swift:3` |
| RH-06h | Combine census | 0 / 3 | 1 / 0 | `AnyCancellable`, `PassthroughSubject`, `.sink` |
| RH-07a | statement-position `Task {` | 0 / 1 | 1 / 0 | `Fire.swift:2` |
| RH-07b | `_ = Task` without marker | 0 / 1 | 0 / 0 | `Fire.swift:3` |
| RH-08 | dead availability (floor 17 plant, 26 twin) | 0 / 1 | 0 / 0 | `BadView.swift:28 #available(iOS 15` |
| RH-09 | Mutex with floor < 18 | 0 / 3 | 123 / 0 | three `IPHONEOS_DEPLOYMENT_TARGET = 17.0;` lines |
| RH-10 | generator present (informational) | 0 / 1 | 0 / 1 | `./project.yml` |
| RH-11 | `print(` in app sources | 0 / 4 | 1 / 0 | `BadView.swift:8,22,27,28` |

Commands, verbatim (identical to the SW-APPLE rule text; the full list with the harness wrapper is `checks.sh`). RH-06e and RH-06f are the two `grep -rn` lines in SW-APPLE-12; RH-06b to RH-06d are in SW-APPLE-10; RH-04a/b/d in SW-APPLE-05; RH-07a/b in SW-APPLE-17.

Real-tree controls (read-only greps run in the exemplar clones): RH-02, RH-03a, RH-03b empty on element-x-ios and IceCubesApp; RH-04a empty on IceCubesApp, 2 known project-level false positives on element-x-ios (`compound-ios/Inspector/Inspector.xcodeproj/project.pbxproj`); RH-05b empty on IceCubesApp, 1 hit on element-x-ios (`compound-ios/Package.swift`); RH-02 empty on `apple/swift-collections@935f696a549a:Xcode`, `tuist/tuist@2f6ac74754bf`, `element-x-ios/compound-ios`. A first draft of RH-02 without `-w` reported `SWIFT_FLAGS` (a substring of `OTHER_SWIFT_FLAGS`), `SWIFT_ASSET_SYMBOL_EXTENSIONS` and `SWIFT_EXPLICIT_MODULES`; `-w` removed all three (3 false positives fixed).

### Compile-level probes (CP-*), Linux-run on swift:6.4 and swift:6.3

All as `swiftc -emit-sil -o /dev/null -parse-as-library <flags> <file>` (`-emit-sil` because region-isolation diagnostics run in SIL, so `-typecheck` misses them; CP-1 and CP-2 were also confirmed with `-typecheck`). Results are identical on both toolchains except the group spelling.

| ID | Flags | File | Exit | Output |
|---|---|---|---|---|
| CP1-red | `-swift-version 6` | `racy.swift` (`var counter = 0`) | 1 | `error: var 'counter' is not concurrency-safe ... [#MutableGlobalVariable]` |
| CP1-twin | `-swift-version 6` | `racy-twin.swift` (`let counter = 0`) | 0 | |
| CP1-mode5 | `-swift-version 5` | `racy.swift` | 0 | silent |
| CP1-m5cmp | `-swift-version 5 -strict-concurrency=complete` | `racy.swift` | 0 | `warning: ... this is an error in the Swift 6 language mode [#MutableGlobalVariable]` |
| CP2-red | `-swift-version 6 -default-isolation MainActor` | `isolated2.swift` | 1 | `error: main actor-isolated property 'items' can not be referenced from a nonisolated context` |
| CP2-eq | `-swift-version 6 -default-isolation=MainActor` | `isolated2.swift` | 1 | same (the xcspec spelling) |
| CP2-twin | `-swift-version 6 -default-isolation MainActor` | `isolated2-twin.swift` (`nonisolated final class Store`) | 0 | |
| CP2-mode5 | `-swift-version 5 -default-isolation MainActor` | `isolated2.swift` | 0 | `warning: main actor-isolated property ...` |
| CP2-badv1/2 | `-default-isolation main-actor` / `MainActor.self` | `isolated2-twin.swift` | 1 | `error: invalid value '...' in '-default-isolation ...'` |
| CP3-red | `-swift-version 6` | `nnbd.swift` | 1 | 6.4: `[#RegionIsolation::SendingRisksDataRace]`; 6.3: `[#SendingRisksDataRace]` |
| CP3-nnbd | `... -enable-upcoming-feature NonisolatedNonsendingByDefault` | `nnbd.swift` | 0 | |
| CP3-appr | `... -enable-upcoming-feature ApproachableConcurrency` | `nnbd.swift` | 0 | |
| CP3-typo | `... -enable-upcoming-feature ApproachableConcurency` | `nnbd.swift` | 1 | same error: unknown name silently ignored |
| CP4-red | `-swift-version 6` | `obs-main.swift` | 1 | `error: main actor-isolated property 'count' can not be referenced from a Sendable closure` |
| CP4-twin | `-swift-version 6` | `obs-main-twin.swift` (`@MainActor func watch`) | 0 | |
| CP5 | `swift package --package-path pkg-old dump-package` (manifest uses `swiftLanguageVersions: [.v6]`, tools 6.2) | `pkg-old/Package.swift` | 0 | `warning: 'init(...swiftLanguageVersions:...)' is deprecated: replaced by 'init(...swiftLanguageModes:...)' [#DeprecatedDeclaration]` |

Watched-red tally: 22 grep/awk checks (RH-01, 02, 03a, 03b, 04a, 04b, 04c, 04d, 05b, 06a to 06h, 07a, 07b, 08, 09, 11) went red on the plant and green on the twin, plus 5 compile-level pairs (CP1, CP2, CP3, CP4, CP5): 27. RH-05a and RH-10 are informational and not counted. Not run: every SwiftUI/Combine compile claim, every pbxproj semantic claim about Xcode, the Mutex/OSAllocatedUnfairLock floor errors (all unverified: read only).

## Exemplar evidence

| Rule | Satisfies | Violates / contradicts |
|---|---|---|
| SW-APPLE-01, 03, 04 | IceCubesApp@2ad6e6891258 `project.pbxproj:731-734` (`SWIFT_APPROACHABLE_CONCURRENCY = YES; SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor; SWIFT_VERSION = 6.0`); element-x-ios@14e33866ced2 `project.pbxproj:10192-10194`; RH-02/03 empty on both | none; `SWIFT_VERSION = ""` at IceCubesApp project level (`:991`) is an inherited blank overridden per target |
| SW-APPLE-02 | element-x-ios `project.yml`, `*/SupportingFiles/target.yml`, `AGENTS.md:384`; tuist builds Xcode projects from manifests (`SettingsMapper.swift:70-76`) | IceCubesApp has no generator (hand-maintained pbxproj, 12 blocks) |
| SW-APPLE-05 | IceCubesApp: 10 target blocks `6.0` + MainActor; element-x-ios `AGENTS.md:285` "All targets Swift 6" and 20 of 26 blocks `SWIFT_VERSION = 6` | element-x-ios project-level `SWIFT_VERSION = 5.0` (`:10542,10625`) is overridden per target, not a violation; compound-ios Inspector flagged by RH-04a is a split config (MainActor `:321,379`, 6.0 `:414,448`) |
| SW-APPLE-06 | IceCubesApp `Packages/Timeline/Package.swift:41-42` (`.swiftLanguageMode(.v6)`, `.defaultIsolation(MainActor.self)`); 9 of 9 manifests with `defaultIsolation` also carry `.v6` | `element-hq/element-x-ios@14e33866ced2:compound-ios/Package.swift:27,40` (tools 6.2, no explicit `.v6`) |
| SW-APPLE-07 | element-x-ios 20 blocks `SWIFT_APPROACHABLE_CONCURRENCY = YES`; IceCubesApp 10; `apple/swift-collections@935f696a549a:Xcode/Shared.xcconfig:73` (`SWIFT_APPROACHABLE_CONCURRENCY = YES` in a library's xcconfig next to `SWIFT_VERSION = 5.10` `:33`, a Swift-5-mode library using the bundle: the only place the setting matters) | none |
| SW-APPLE-08 | element-x-ios: app, UnitTests, PreviewTests, two MapLibre UI shims MainActor; NSE, ShareExtension, UITests, AccessibilityTests, IntegrationTests nonisolated (`target.yml` files; `AGENTS.md:286`) | IceCubesApp: MainActor on all 4 extension targets; `AGENTS.md:286` omits the two MapLibre shims (contradicted by `Components/MapLibre/*/SupportingFiles/target.yml`) |
| SW-APPLE-09 | IceCubesApp: 43 `@Observable`, 0 `ObservableObject`, 0 `@Published`; element-x-ios `StateStoreViewModelV2.swift` | element-x-ios: 18 `ObservableObject`, 19 `@Published`, 53 `@ObservedObject`, 9 `@EnvironmentObject` (floor 18.5, so not floor-exempt: a documented incremental migration, `AGENTS.md:160`); IceCubesApp 1 `@StateObject` (`StatusRowShareAsImageView.swift:11`, `ImageRenderer`, a framework type) |
| SW-APPLE-13 | element-x-ios body median 13, p99 75 | IceCubesApp 16 bodies over 100 lines (max 224); element-x-ios 232 `AnyView` mentions, 93 are the `toPresentable()` boundary (permitted) |
| SW-APPLE-12 | element-x-ios `.onChange(of:perform)` 0, `NavigationView` 0, `.tabItem` 0 | `.foregroundColor(`: IceCubesApp 76 in 45 files, element-x-ios 277 in 131 files; `.cornerRadius(`: 31 and 16 |
| SW-APPLE-14 | element-x-ios guards in hand-written code sit above the floor | IceCubesApp `Packages/Env/Sources/Env/Ext/TranslationView.swift:11` and 5 more `iOS 17.4` guards against floor 18 |
| SW-APPLE-15 | element-x-ios `WaitingConfirmation.swift:28` (`Mutex<Int>`, floor 18.5) | IceCubesApp `MastodonClient.swift:50-53` uses `OSAllocatedUnfairLock` at a floor that allows `Mutex` (acceptable, not a violation) |
| SW-APPLE-16 | IceCubesApp: 24 Combine files, 0 `AnyCancellable` | element-x-ios: 468 Combine files, 159 `AnyCancellable`, 476 subject mentions (declared legacy, `StateStoreViewModel.swift`) |
| SW-APPLE-17 | the concurrency audit's numbers: element-x-ios 416, IceCubesApp 170 bare tasks (SW-CONC-13 evidence) | both; SHOULD, not MUST, for exactly this reason |
| SW-APPLE-18 | element-x-ios `.swiftlint.yml:75-79` bans `print` (`severity: error`) | IceCubesApp has no such ban |

## AI-agent angle

| What an LLM characteristically gets wrong | Smallest mechanical check |
|---|---|
| Writes `ObservableObject` + `@Published` + `@StateObject` for new models (the corpus of pre-iOS-17 tutorials) | RH-01 (E12) |
| `@ObservedObject var vm = ViewModel()`; non-private `@State` | RH-06b, RH-06c |
| `.onAppear { Task { await ... } }` instead of `.task` | RH-06d |
| `NavigationView`, `.foregroundColor`, `.cornerRadius`, `.tabItem`, one-parameter `.onChange` | RH-06e, RH-06f |
| Wraps branches in `AnyView` to make `if/else` type-check | RH-06a, then read |
| Invents build settings (`SWIFT_DEFAULT_ISOLATION`, `SWIFT_ENABLE_APPROACHABLE_CONCURRENCY`) or values (`MainActor.self`, `Enabled`, `true`) | RH-02, RH-03a, RH-03b |
| Sets `SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor` and leaves the language mode at 5 (or "fixes" red builds by flipping `SWIFT_VERSION` back) | RH-04a/b; CP2-mode5 |
| Sets `.defaultIsolation(MainActor.self)` in a library or an extension package, or omits `.v6` | RH-05a, RH-05b |
| Edits the generated `.pbxproj` | RH-10 (and `git diff --name-only` showing a pbxproj without `project.yml`) |
| Uses `swiftLanguageVersions:` or says SwiftPM has no Approachable Concurrency (copying 2025 posts) | `grep -rn -e 'swiftLanguageVersions' --include='Package*.swift' .` (CP5 shows the warning) |
| Guards with `@available(iOS 17, *)` guesses: wrong version for `Observations` (26), `Tab` (18), `Mutex` (18) | the floor table in section 8; RH-08 for dead guards |
| Reaches for `Mutex` in an app whose floor is iOS 16/17 | RH-09 |
| Uses `OSAllocatedUnfairLock.lock()` ... `unlock()` around an `await` | `grep -rn -e 'OSAllocatedUnfairLock' --include='*.swift' .` then read for `lock()`; prefer `withLock` |
| `@unchecked Sendable` or `nonisolated(unsafe)` on a model to quiet a MainActor-default error; `Task.detached` to "leave the main actor" | SW-GATE-10 E01, E02, E03 (justification pass) |
| `DispatchQueue.main.async` inside views; `Task { }` statements | E04; RH-07a |
| Claims `ObservableObject` is deprecated, or that Xcode 27 projects default to Swift 6 | no grep; SW-APPLE-01 forces a read of the setting |
| Puts `@MainActor` on every type in a MainActor-default target (redundant) or none in a nonisolated one | RH-06g (the second case only) |
| Assumes it can run `xcodebuild` or Previews | unverified: read only; the Xcode 27 MCP server is the route when attached (SW-APPLE-19) |

## Contested / evolving

- **Default MainActor isolation for app targets (as of 2026-10).** Apple's template and WWDC25 268 say yes for the app module and UI modules; Wals says yes for apps, not necessarily packages; Massicotte (2026-06-10) says it is "very challenging to use, even for small projects" and recommends understanding `nonisolated` first. Trend: Apple's default wins for new app targets; the contest moves to library targets, where all sides say `nonisolated`. The repo decision (SW-CONC-11, owner Q3) is app-yes, library/CLI/server-no.
- **Xcode 27's default language mode (as of 2026-06).** Massicotte reports Swift 5. No Apple source says so; no Apple source says otherwise. Trend unknown; re-check when the Xcode 27 project template can be read.
- **`ObservableObject` retirement (as of 2026-10).** Apple's docs steer to Observation and the migration is incremental; nothing is formally deprecated. Large apps (element-x-ios) run both. Direction: `@Observable` for new code, `ObservableObject` as legacy.
- **`Observations` vs Combine for non-SwiftUI observation (Swift 6.2+).** `Observations` needs iOS 26, so apps with older floors keep Combine or `AsyncStream`; as floors rise this trends toward Observation.
- **Deprecation timing of `NavigationView`, `.foregroundColor`, `.cornerRadius`, `.tabItem`.** DocC lists `deprecatedAt = 27.2` with `deprecated: false` on 2026-10-10; whether the compiler warns on the shipping SDK is unknown from here. These pages change with SDK point releases.
- **MainActor default for app extensions.** element-x-ios says nonisolated (background work), IceCubesApp sets MainActor everywhere. The repo rule is a SHOULD for extensions.
- **Xcode agent integration.** Xcode 27 adds an MCP server, agent plug-ins, skills (`xcrun agent skills export`) and ACP support; Apple-authored skills overlap with this lore set. Direction: complement, not replace; revisit when a macOS runner exists.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://developer.apple.com/videos/play/wwdc2025/268/ | WWDC25 session 268, "Embracing Swift concurrency" (primary) | 2025-06, Xcode 26 | Apple's own words on main-actor-by-default for app modules, nonisolated libraries, "all projects adopt" Approachable Concurrency |
| https://developer.apple.com/documentation/xcode-release-notes/xcode-26-release-notes | Xcode 26 release notes (primary) | 2025-09, Swift 6.2 | Confirms the notes never document the two settings |
| https://developer.apple.com/documentation/xcode-release-notes/xcode-26_4-release-notes | Xcode 26.4 release notes (primary) | 2026 | The only mention of "projects that default to MainActor isolation" (String Catalog fix, 165481673) |
| https://developer.apple.com/documentation/xcode-release-notes/xcode-27-release-notes | Xcode 27 release notes (primary) | 2026-09, Swift 6.4 | Silent on language-mode default; MCP build-settings tool, agent plug-ins and skills |
| https://developer.apple.com/documentation/observation | Observation framework docs (primary) | Swift 5.9+ | `Observable()` macro, `Observations`, `withContinuousObservation`; platform availability |
| https://developer.apple.com/documentation/swiftui/migrating-from-the-observable-object-protocol-to-the-observable-macro | Apple migration article (primary) | iOS 17+ | The exact replacement table and the incremental-migration permission |
| https://developer.apple.com/documentation/swiftui/managing-model-data-in-your-app | SwiftUI model-data article (primary) | iOS 17+ | `@State`, `@Environment`, `@Bindable` patterns and per-property tracking |
| https://developer.apple.com/documentation/swiftui/state | `State` docs (primary) | current | "Declare state as private"; default-value instantiation warning |
| https://developer.apple.com/documentation/swiftui/observedobject | `ObservedObject` docs (primary) | current | "Don't specify a default or initial value"; do not wrap `Observable` objects |
| https://developer.apple.com/documentation/swiftui/anyview | `AnyView` docs (primary) | current | Hierarchy-destruction behaviour |
| https://developer.apple.com/documentation/swiftui/navigationview | `NavigationView` DocC page (primary; also the `foregroundColor`, `cornerRadius`, `tabItem`, `onChange(of:perform:)` pages) | fetched 2026-10-10 | Deprecation metadata (`deprecatedAt`, messages) used for the superseded-API list |
| https://developer.apple.com/documentation/synchronization/mutex | `Mutex` docs (primary) | Swift 6.0, iOS 18 | Availability floor |
| https://developer.apple.com/documentation/os/osallocatedunfairlock | `OSAllocatedUnfairLock` docs (primary) | iOS 16 | Floor and the "unsafe across await" text |
| https://developer.apple.com/documentation/combine | Combine docs (primary) | iOS 13+ | Not deprecated; `AsyncPublisher` bridge |
| https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0466-control-default-actor-isolation.md | SE-0466 (primary) | Swift 6.2 | `-default-isolation`, `defaultIsolation`, exemption list |
| https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0395-observability.md | SE-0395 (primary) | Swift 5.9 | Why `ObservableObject`/Combine were replaced |
| https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0475-observed.md | SE-0475 (primary) | Swift 6.2 | `Observations` semantics |
| https://raw.githubusercontent.com/swiftlang/swift-evolution/main/visions/approachable-concurrency.md | Approachable data-race safety vision (primary) | 2025 | Executables vs libraries default-isolation argument |
| https://raw.githubusercontent.com/swiftlang/swift-migration-guide/main/Guide.docc/EnableDataRaceSafety.md | Swift 6 migration guide, "Enable data-race safety" (primary) | 2024-2026 | `SWIFT_VERSION`, `SWIFT_STRICT_CONCURRENCY` in xcconfig; `swiftLanguageModes` |
| https://www.swift.org/blog/swift-6.2-released/ | Swift 6.2 release blog (primary) | 2025-09 | Single-threaded-by-default option, `Observations` |
| https://raw.githubusercontent.com/swiftlang/swift-book/main/TSPL.docc/ReferenceManual/Attributes.md | The Swift Programming Language, Attributes (primary) | current | `@available` grammar |
| https://github.com/swiftlang/swift-build/blob/2187330e13e7/Sources/SWBUniversalPlatform/Specs/Swift.xcspec | swift-build `Swift.xcspec` at the corpus SHA (primary: the tool's own repository) | 2026-10 clone | The authoritative setting definitions, values and flag mapping; also `SwiftCompiler.swift`, `Settings.swift`, `String.swift` as cited |
| https://github.com/tuist/tuist/blob/2f6ac74754bf/cli/Sources/TuistLoader/SwiftPackageManager/SettingsMapper.swift | Tuist SwiftPM-to-Xcode settings mapper | 2026-10 clone | Independent confirmation of the manifest-to-xcconfig mapping |
| https://www.donnywals.com/should-you-opt-in-to-swift-6-2s-main-actor-isolation/ | Donny Wals, default MainActor article | 2025-09-11 | Pro-default argument; stale SwiftPM claim flagged |
| https://raw.githubusercontent.com/AvdLee/Swift-Concurrency-Agent-Skill/main/skills/swift-concurrency/SKILL.md | Antoine van der Lee's agent skill | 2026 | Closest prior art; "read the settings first"; stale table cells flagged |
| https://massicotte.org/blog/wwdc26-unanswered-qa/ | Matt Massicotte, WWDC26 Q&A | 2026-06-10 | Only source for "Xcode 27 defaults to Swift 5"; case against MainActor default |
| https://github.com/element-hq/element-x-ios/blob/14e33866ced2/AGENTS.md | element-x-ios agent instructions (exemplar) | 2026-10 clone | Real app policy: per-target isolation, generator rule, Xcode 27 agent skills |
