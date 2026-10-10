---
# Read on demand through the index. This glob matches no file, so a client never auto-loads the file.
paths:
  - "**/.swift-quality-depth-on-demand"
title: Apple Platforms, Read-Only
summary: The SW-APPLE family. Xcode build-setting names and values, default isolation per target kind, generated projects, deployment-floor locks and availability, Observation against ObservableObject, SwiftUI and Combine hygiene, all read without macOS or Xcode
---

# Apple Platforms, Read-Only

Binds to Swift 6.4.0 and 6.3.3 on Linux x86_64 for compiler facts (measured 2026-10-10), swift-build at
`2187330e13e7` for setting definitions (read 2026-10-10), Xcode 26 (Swift 6.2) and Xcode 27 (Swift 6.4) per
Apple's [release notes](https://developer.apple.com/documentation/xcode-release-notes/xcode-27-release-notes)
(read 2026-10-10), and Apple's DocC availability metadata (read 2026-10-10).

Owns what an agent reads and writes in an Apple-platform app target: `SWIFT_*` names and values in
`.pbxproj`, `.xcconfig` and generator YAML, default isolation per target kind, generated Xcode projects,
the deployment floor for locks and availability guards, Observation, SwiftUI hygiene and Combine. **Pinned
default (owner Q5), the adopter may override by adding a macOS runner:** the family is read-only. There is
no macOS and no Xcode host, so every Apple-only behaviour below is marked `unverified: read only`, and an
Apple-only change is never reported as built. Not owned here: the ban on `defaultIsolation(MainActor.self)`
in a library, SDK, CLI or server is `SW-CONC-11` (manifest pointer `SW-PKG-19`), the manifest spelling of the
approachable members is `SW-CONC-12`, `SW-PKG-08` and `SW-PKG-16`, a manifest's language mode is `SW-PKG-14`,
unstructured `Task {}` is `SW-CONC-13`, and the escape-hatch tells (`@unchecked Sendable`,
`nonisolated(unsafe)`, `NSLock`) are `SW-GATE-10`. Library, SDK, CLI and server code is bound here only by
`SW-APPLE-02` (manifest clause), `SW-APPLE-04` and `SW-APPLE-05`, and only where it ships for an Apple
platform. A SwiftPM-built CLI with no `.xcodeproj` never triggers `SW-APPLE-01` to `SW-APPLE-03`.

Contents: [Dates and Floors](#dates-and-floors) · [Build Configuration](#build-configuration) ·
[The Deployment Floor](#the-deployment-floor) · [SwiftUI and Observation Sources](#swiftui-and-observation-sources) ·
[Reading Heuristics](#reading-heuristics) · [What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Floors

- **Language mode.** An unset or blank `SWIFT_VERSION` is Swift 5 mode, and a racy global then exits 0
  silently (Swift 6.4.0 and 6.3.3, measured 2026-10-10). The Xcode 27 template's default has one source, a
  blog post, so it is `unverified: read only`. Never state it as fact. `SW-APPLE-14` forces a read instead.
- **Manifests.** Tools 6.2 or later is Swift 6 mode unless a target sets `.v5` (`SW-PKG-14`).
  `swiftLanguageVersions:` is deprecated and warns on 6.4.0 and 6.3.3 (measured 2026-10-10).
- **Setting oracle.** `swift-settings-oracle.txt` in `checks/` lists the 183 `SWIFT_*` names of swift-build's
  `Swift.xcspec` (read 2026-10-10), with its regeneration command beside it. Regenerate it on each
  swift-build bump.

Setting map (swift-build `Swift.xcspec:576-583,626-669,732-936` at `2187330e13e7`, read 2026-10-10).

| Concern | Xcode setting | SwiftPM, tools 6.2 or later | Compiler flag (Swift 6.4.0, 6.3.3) |
|---|---|---|---|
| Language mode | `SWIFT_VERSION = 6` (`6` and `6.0` both appear) | `.swiftLanguageMode(.v6)` per target, `swiftLanguageModes: [.v6]` per package | `-swift-version 6` |
| Strict checking, Swift 5 mode | `SWIFT_STRICT_CONCURRENCY = minimal`, `targeted` or `complete`, ignored in Swift 6 | `.enableUpcomingFeature("StrictConcurrency")` | `-strict-concurrency=complete` |
| Default isolation (SE-0466, 6.2) | `SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor` or `nonisolated` | `.defaultIsolation(MainActor.self)` or `.defaultIsolation(nil)` | `-default-isolation MainActor`. `main-actor` and `MainActor.self` exit 1 (measured 2026-10-10) |
| Approachable bundle (6.2) | `SWIFT_APPROACHABLE_CONCURRENCY = YES` | none in SE-0466, spell the members | five `-enable-upcoming-feature` flags: DisableOutwardActorInference, GlobalActorIsolatedTypesUsability, InferIsolatedConformances, InferSendableFromCaptures, NonisolatedNonsendingByDefault |
| One upcoming feature | `SWIFT_UPCOMING_FEATURE_` plus the upper-snake name, `YES`, `MIGRATE` or `NO` | `.enableUpcomingFeature("Name")` | `-enable-upcoming-feature Name` |
| Deployment floor | `IPHONEOS_DEPLOYMENT_TARGET`, `MACOSX_DEPLOYMENT_TARGET` | `platforms: [.iOS(.v18)]` | `-target arm64-apple-ios18.0` |

swift-build reads a Boolean setting by its first character: `YES`, `true` and `1` enable, `Enabled`, `ON`
and `NO` do not (`Sources/SWBUtil/String.swift:60-68`, read 2026-10-10). The compiler accepts an unknown
upcoming-feature name silently, so a typo'd name in a manifest or `OTHER_SWIFT_FLAGS` does nothing (Swift
6.4.0, measured 2026-10-10). The same silence for an unknown `SWIFT_*` name in a pbxproj is `unverified: read only`.

Availability floors (Apple DocC metadata, read 2026-10-10, all `unverified: read only` beyond the metadata).
Take every guard number from this table or the SDK, never from memory.

| API | iOS | macOS | watchOS | visionOS |
|---|---|---|---|---|
| `Observable()` macro, `@Bindable` | 17.0 | 14.0 | 10.0 | 1.0 |
| `Observations` (SE-0475, Swift 6.2) | 26.0 | 26.0 | 26.0 | 26.0 |
| `Mutex` (`import Synchronization`) | 18.0 | 15.0 | 11.0 | 2.0 |
| `OSAllocatedUnfairLock` (`import os`) | 16.0 | 13.0 | 9.0 | listed, no version |
| `NavigationStack` | 16.0 | 13.0 | 9.0 | 1.0 |
| `Tab` | 18.0 | 15.0 | 11.0 | 2.0 |
| `.onChange(of:initial:_:)` (the `perform:` form is deprecated at the same number) | 17.0 | 14.0 | 10.0 | 1.0 |
| `.tint(_:)`, `.foregroundStyle(_:)` | 15.0 | 12.0 | 8.0 | 1.0 |
| `.clipShape(.rect(cornerRadius:))` | 13.0 | 10.15 | 6.0 | 1.0 |

## Build Configuration

`CHECKS` is where this rule's `checks/` directory is installed (**pinned default**, the adopter adjusts the
path). Run from the repository root. Every command prints the violation, so empty output is the pass.
`xargs -r` exits 0 or 123, so judge by printed output. Path lists are NUL-separated (`grep -rlZ`, `xargs -0`)
because a project path may hold a space. A `BASE ... not found` line is a failure, never a pass.

```sh
# apple-config
CHECKS=.claude/rules/swift-quality/checks
# 01a names outside the oracle
grep -Rhow --exclude-dir='.build' -e 'SWIFT_[A-Z0-9_]*' --include='*.pbxproj' --include='*.xcconfig' --include='project.yml' --include='target.yml' . | sort -u | grep -v -x -F -f "$CHECKS/swift-settings-oracle.txt"
# 01b isolation values other than MainActor and nonisolated (a conditional key such as SWIFT_DEFAULT_ACTOR_ISOLATION[sdk=iphoneos*] counts)
grep -RnE --exclude-dir='.build' -e 'SWIFT_DEFAULT_ACTOR_ISOLATION(\[[^]]*\])? *[=:]' --include='*.pbxproj' --include='*.xcconfig' --include='project.yml' --include='target.yml' . | grep -vE -e '[=:] *"?MainActor"?[[:space:];]*(//.*)?$' -e '[=:] *"?nonisolated"?[[:space:];]*(//.*)?$' -e '[=:] *"?\$\(inherited\)"?[[:space:];]*(//.*)?$'
# 01c approachable values other than YES and NO
grep -RnE --exclude-dir='.build' -e 'SWIFT_APPROACHABLE_CONCURRENCY(\[[^]]*\])? *[=:]' --include='*.pbxproj' --include='*.xcconfig' --include='project.yml' --include='target.yml' . | grep -vE -e '[=:] *"?YES"?[[:space:];]*(//.*)?$' -e '[=:] *"?NO"?[[:space:];]*(//.*)?$' -e '[=:] *"?\$\(inherited\)"?[[:space:];]*(//.*)?$'
# 02a pbxproj: a MainActor default in a build-configuration block whose SWIFT_VERSION is not 6
grep -RlZ --exclude-dir='.build' -e 'SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor' --include='*.pbxproj' . | xargs -0 -r awk '/isa = XCBuildConfiguration;/ {b=1; iso=0; ver=""} b && /SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor/ {iso=1} b && /SWIFT_VERSION = / {ver=$3} b && /^\t\t\t\};$/ {if (iso && ver !~ /^"?6(\.0)?"?;$/) print FILENAME ": MainActor default without SWIFT_VERSION 6, block ends line " FNR " (ver=" ver ")"; b=0}'
# 02b xcconfig: a MainActor default in a file with no SWIFT_VERSION 6 (a listed file is the violation)
grep -RlZ --exclude-dir='.build' -e 'SWIFT_DEFAULT_ACTOR_ISOLATION *= *MainActor' --include='*.xcconfig' . | xargs -0 -r grep -L -e 'SWIFT_VERSION *= *6'
# 02c the language mode forced through extra flags (single-line, pbxproj array and YAML list forms)
grep -Rn --exclude-dir='.build' -e 'OTHER_SWIFT_FLAGS' -e '"-swift-version"' -e '"-language-mode"' --include='*.pbxproj' --include='*.xcconfig' --include='project.yml' --include='target.yml' . | grep -e '-swift-version' -e '-language-mode'
# 02d manifests (SHOULD): defaultIsolation without an explicit Swift 6 mode
grep -RlZ --exclude-dir='.build' -e 'defaultIsolation' --include='Package*.swift' . | xargs -0 -r grep -L -e 'swiftLanguageMode(.v6)' -e 'swiftLanguageModes: \[.v6\]'
# 03 generator: set BASE to the merge base. Each changed pbxproj is paired with a generator file in its own parent directory
BASE=origin/main
git rev-parse --verify -q "$BASE" >/dev/null || echo "BASE $BASE not found: a failure, not a pass"
git diff --name-only "$BASE" | awk '{n = split($0, s, "/"); b = s[n]; d = substr($0, 1, length($0) - length(b) - 1); if (d == "") d = "."; if (b == "project.pbxproj") {sub(/(^|\/)[^\/]*\.xcodeproj$/, "", d); if (d == "") d = "."; p[d] = 1} else if (b == "project.yml" || b == "target.yml" || b == "Project.swift") g[d] = 1} END {for (d in p) if (!(d in g)) print d}' | while IFS= read -r d; do for f in project.yml target.yml Project.swift; do [ -e "$d/$f" ] && echo "pbxproj changed without a generator change in $d"; done; done
# 05a each app target should list YES here (a reading aid, not a violation locator)
grep -Rn --exclude-dir='.build' -e 'SWIFT_APPROACHABLE_CONCURRENCY' --include='*.pbxproj' --include='*.xcconfig' .
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-APPLE-01 | Every `SWIFT_*` name in a `.pbxproj`, `.xcconfig` or generator YAML exists in the oracle. Spell values exactly: `SWIFT_DEFAULT_ACTOR_ISOLATION` is `MainActor` or `nonisolated`, `SWIFT_APPROACHABLE_CONCURRENCY` is `YES` or `NO`. The SwiftPM spelling `MainActor.self`, the invented values `main-actor` and `.mainActor`, and the prose booleans `Enabled`, `ON` and `true`, never appear. | A name or value that does nothing looks like a setting that works. The compiler rejects `main-actor` and `MainActor.self` with exit 1 (Swift 6.4.0 and 6.3.3, measured 2026-10-10), and swift-build reads `Enabled` as false. | Block `apple-config`, commands 01a, 01b, 01c. Empty output = pass. Watched red (measured 2026-10-10): three planted unknown names printed, and `MainActor.self` and `Enabled` printed in both pbxproj and YAML form, as did a conditional key with `main-actor` or `Enabled`. The twin was empty with an inherited-value reference, a trailing comment, a conditional key with a valid value and CRLF line ends. A hit on a name means check current swift-build, then fix the file or the oracle, because Xcode's closed engine may add names (`unverified: read only`). | MUST |
| SW-APPLE-02 | A target that sets `SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor` sets `SWIFT_VERSION` to `6` or `6.0` in the same build-configuration block or in an xcconfig it references. `-swift-version` and `-language-mode` never appear in `OTHER_SWIFT_FLAGS`. SHOULD for manifests: a manifest with `defaultIsolation` also spells `.swiftLanguageMode(.v6)` or `swiftLanguageModes: [.v6]`. | In Swift 5 mode the isolation errors become warnings and nothing enforces the default (exit 0 with `warning: main actor-isolated property`, Swift 6.4.0 and 6.3.3, measured 2026-10-10). swift-build warns when `OTHER_SWIFT_FLAGS` overrides the mode (`SwiftCompiler.swift:1250-1256`, read 2026-10-10). The manifest clause is house convention, since tools 6.2 is already Swift 6 mode (`SW-PKG-14`). | Block `apple-config`, commands 02a, 02b, 02c, 02d. Empty output = pass (02b lists a violating file, and a file that gets `SWIFT_VERSION` through an `#include` is a known false positive, so read the include). Watched red (measured 2026-10-10): one plant per command, each twin empty, 02a, 02b and 02d on a path with a space, 02c on the single-line, pbxproj array and YAML list forms. Generator YAML is read, not grepped. | MUST · SHOULD (manifests) |
| SW-APPLE-03 | When a `project.yml`, `target.yml` or `Project.swift` sits beside an `.xcodeproj`, change build settings, entitlements, Info.plist keys and targets in the generator. A diff that changes that project's `.pbxproj` without changing the generator file beside it is a violation. Xcode MCP write tools (`UpdateTargetBuildSetting`, `AddEntitlement` and kin) are not used on that project. | The pbxproj is output, and the next regenerate overwrites a hand edit. element-hq/element-x-ios@14e33866ced2:AGENTS.md:384 states the rule and names the forbidden tools. | Block `apple-config`, command 03. Empty output = pass, and it is also empty for a project with no generator file in its own parent directory, so a hand-maintained project is never flagged, even beside a generated one. Watched red (measured 2026-10-10): a pbxproj-only commit printed the directory, a commit changing both files was empty, a hand-maintained project beside a root generator was empty, and a missing BASE printed its message. The MCP half is a reading heuristic. A project that commits its generated `.xcodeproj` is satisfied when both files change together. | MUST |
| SW-APPLE-05 | App targets set `SWIFT_APPROACHABLE_CONCURRENCY = YES`. Manifests of every kind spell the members and never the bundle: the two of `SW-PKG-08` in a Swift 6 target, all five in a `.v5` target. | Apple recommends the bundle for every project ([WWDC25 268](https://developer.apple.com/videos/play/wwdc2025/268/)). In Swift 6 mode only NonisolatedNonsendingByDefault and InferIsolatedConformances add anything, and the bundle name hides that. The bundle name and the member each turn a `SendingRisksDataRace` exit 1 into exit 0, and a typo'd name stays at exit 1 (Swift 6.4.0 and 6.3.3, measured 2026-10-10). The xcspec `Condition` gates only the setting's own command line, so `YES` still feeds both members in Swift 6 mode (`PropertyDomainSpec.swift:333,1404-1406`, read 2026-10-10). That Xcode's closed engine matches is `unverified: read only`. | Block `apple-config`, command 05a lists each app target and every one shows `YES`, a missing line is the finding. The manifest half is the `SW-PKG-16` command (empty output = pass). Compile half watched on both toolchains (measured 2026-10-10). | SHOULD |

```yaml
# wrong: SwiftPM spellings and a prose boolean (a no-op), and a Swift 5 mode under a MainActor default
SWIFT_VERSION: "5.0"
SWIFT_DEFAULT_ACTOR_ISOLATION: MainActor.self
SWIFT_APPROACHABLE_CONCURRENCY: Enabled
# right
SWIFT_VERSION: "6.0"
SWIFT_DEFAULT_ACTOR_ISOLATION: MainActor
SWIFT_APPROACHABLE_CONCURRENCY: YES
```

Known limits of `SW-APPLE-02`: a project-level `MainActor` with a target-level `SWIFT_VERSION = 6.0` prints
a false positive (element-hq/element-x-ios@14e33866ced2:compound-ios/Inspector/Inspector.xcodeproj/project.pbxproj
lines 321 and 414), so read the target block. `SW-APPLE-14` governs the read.

## The Deployment Floor

Both rules are decided by the lowest shipped deployment target. Read it first, then run the block. Only the
iOS floor is mechanical. `MACOSX_DEPLOYMENT_TARGET` means nothing when `SDKROOT` is `iphoneos` and
`SUPPORTS_MACCATALYST = NO` (a macOS clause false-positived on element-x-ios, so it was struck). For macOS,
watchOS and visionOS, compare the floor to the availability table by reading.

```sh
# apple-floor
NOSHIP=(--exclude-dir='Demo*' --exclude-dir='Example*' --exclude-dir='*Example' --exclude-dir='Sample*' --exclude-dir='Docs' --exclude-dir='Fixtures' --exclude-dir='*TestUtils' --exclude-dir='*.playground')    # sample, doc, golden-fixture and test-support projects ship no target: add the repository's sample app directory, for example TerminalApp
# the floor: the lowest value over targets that ship
grep -Rn --exclude-dir='.build' "${NOSHIP[@]}" -e 'IPHONEOS_DEPLOYMENT_TARGET' --include='*.pbxproj' --include='*.xcconfig' .
grep -Rn "${NOSHIP[@]}" -e 'platforms' --include='Package*.swift' --exclude-dir='.build' .
# a generator keeps the floor in YAML, and a gitignored pbxproj makes the YAML the only source
grep -Rn "${NOSHIP[@]}" -A3 -e 'deploymentTarget' --include='project.yml' --include='target.yml' --include='Project.swift' --exclude-dir='.build' .
# 04a Mutex below iOS 18: run only in a tree that imports Synchronization
if grep -Rq "${NOSHIP[@]}" --include='*.swift' --exclude-dir='.build' -e 'import Synchronization' . ; then
  grep -Rn --exclude-dir='.build' "${NOSHIP[@]}" -e 'IPHONEOS_DEPLOYMENT_TARGET = [0-9][.;]' -e 'IPHONEOS_DEPLOYMENT_TARGET = 1[0-7][.;]' --include='*.pbxproj' --include='*.xcconfig' .
  grep -Rn "${NOSHIP[@]}" -e '\.iOS(\.v[0-9])' -e '\.iOS(\.v1[0-7])' -e '\.iOS("[0-9][."]' -e '\.iOS("1[0-7][."]' --include='Package*.swift' --exclude-dir='.build' .
  grep -Rn "${NOSHIP[@]}" -A3 -e 'deploymentTarget' --include='project.yml' --include='target.yml' --include='Project.swift' --exclude-dir='.build' . | grep -E -e 'iOS[^0-9]{0,6}([0-9]|1[0-7])([^0-9]|$)'
fi
# 04b every OSAllocatedUnfairLock site, read for lock() and unlock() around an await
grep -Rn "${NOSHIP[@]}" -e 'OSAllocatedUnfairLock' --include='*.swift' --exclude-dir='.build' .
# 11 guards at or below the floor: set floor to the lowest shipped iOS value with its minor (17.0), list generated directories to skip
grep -Rn "${NOSHIP[@]}" -e 'available([^)]*iOS [0-9]' --include='*.swift' --exclude-dir='.build' --exclude-dir='Generated' . | awk -v floor=17.0 'BEGIN {split(floor, f, "."); fm = f[1] + 0; fn = f[2] + 0} match($0, /available\([^)]*iOS [0-9]+(\.[0-9]+)?/) {s = substr($0, RSTART, RLENGTH); sub(/.*iOS /, "", s); split(s, a, "."); if (a[1] + 0 < fm || (a[1] + 0 == fm && a[2] + 0 <= fn)) print}'
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-APPLE-04 | A lock for mutable state in Apple-platform app code is `Mutex` only when every shipped target's iOS floor is at least 18 (macOS 15, watchOS 11, visionOS 2). Below that it is `OSAllocatedUnfairLock` through `withLock`, and `lock()` and `unlock()` never span an `await`. `NSLock` and `os_unfair_lock` stay `SW-GATE-10` tells. This row overrides any `Mutex` default of the `SW-CONC` family for Apple targets. A library or SDK whose Apple floor is below iOS 16 (or that also builds on Linux) cannot use `OSAllocatedUnfairLock` and must not scatter `NSLock`: write one `Locked<Value>` wrapper type, `Mutex` behind `#if canImport(Synchronization)` and `if #available(macOS 15, iOS 18, watchOS 11, visionOS 2, *)`, an `NSLock` fallback inside that one type, and the comment `// floor: iOS 14` (the real floor) on the `NSLock` line. `k07.sh` skips exactly that line and prints every other `NSLock`. | `Mutex` needs iOS 18 and fails to compile below it, but Linux compiles it for every floor, so no Linux build catches it (`unverified: read only`). Apple's unfair-lock text calls `lock()` and `unlock()` unsafe across an `await` suspension point (read 2026-10-10). The OCI-tooling precedent sets the macOS floor at the `Mutex` number (apple/containerization@3e7bc39e66b3:Package.swift:26). | Block `apple-floor`, commands 04a and 04b. Command 04a: empty output = pass (an empty result with no `import Synchronization` is also a pass). A gitignored pbxproj makes the generator YAML the only floor source. Watched red (measured 2026-10-10): floor 17.0, floor 9.0, `.iOS(.v16)`, a YAML `iOS: "16.0"` and a Tuist `.iOS("16.0")` each printed, floor 26.0, `.v18` and YAML `18.5` were empty, and floor 17.0 without the import was empty. Command 04b is a work list: read each hit for `lock()`. A `// floor:` line is skipped by `k07.sh` and a bare `NSLock` beside it printed (watched 2026-10-10). The compile error itself is `unverified: read only`. A repository with a separate sample project at a lower floor prints a hit: only a shipped target binds the floor, so the block skips `Demo*`, `Example*`, `Sample*` and `Docs` through `NOSHIP`, and you add the repository's sample app or tools directory to it. SwiftTerm's `TerminalApp` and `Tools` printed IPHONEOS 13.0 and 15.0 against a shipped iOS 14 until added, then only `Package.swift` printed (measured 2026-10-10). | MUST |
| SW-APPLE-11 | Availability guards match the floor. No `#available(iOS N, *)` or `@available(iOS N, *)` has N at or below the minimum deployment target, because the branch is dead code. A guard's N comes from the availability table or the SDK, never from memory. Generated files (SwiftGen `Assets.swift`) are exempt. | A dead guard hides the real floor and keeps an untested fallback branch. Agents guess numbers, such as a view using `Observations` guarded at 17 or `Tab` at 17. An unguarded newer API fails to compile in Xcode (`unverified: read only`). | Block `apple-floor`, command 11. Empty output = pass. Set `floor` first from the floor commands, as the lowest shipped value including the minor (`17.0`, `17.4`). The awk compares major, then minor, and reads an `iOS` entry in any position of the guard. Watched red (measured 2026-10-10): floor 17.0 printed `#available(iOS 17, *)`, `@available(macOS 14, iOS 17, *)` and `iOS 16.4`, and was empty for `iOS 17.4`. Floor 18.2 printed 18.2 and 18, and floor 17.0 on guards at 17.4, 18.2 and 18 was empty. | SHOULD |

## SwiftUI and Observation Sources

Greps over Swift sources, run from the repository root. `BASE` is the merge base. Every command prints the
hit, so empty output is the pass, except where a row says the output is a work list to read.

```sh
# apple-swiftui
NOSHIP=(--exclude-dir='Demo*' --exclude-dir='Example*' --exclude-dir='*Example' --exclude-dir='Sample*' --exclude-dir='Docs' --exclude-dir='Fixtures' --exclude-dir='*TestUtils' --exclude-dir='*.playground')    # sample, doc, golden-fixture and test-support projects ship no target: add the repository's sample app directory, for example TerminalApp
CHECKS=.claude/rules/swift-quality/checks
BASE=origin/main
git rev-parse --verify -q "$BASE" >/dev/null || echo "BASE $BASE not found: a failure, not a pass"
# 06a observable-object tells in new and touched files (SW-GATE-10 E12 on the diff)
git diff -z --name-only --diff-filter=AM "$BASE" -- '*.swift' ':(exclude)Tests' | xargs -0 -r grep -n -F -e 'ObservableObject' -e '@Published' -e '@StateObject' -e '@ObservedObject' -e '@EnvironmentObject'
# 06b the same census over the whole tree
grep -Rn "${NOSHIP[@]}" --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -F -e 'ObservableObject' -e '@Published' -e '@StateObject' -e '@ObservedObject' -e '@EnvironmentObject' .
# 07 an initial value on an observed object (misses the attribute on its own line)
grep -Rn "${NOSHIP[@]}" -e '@ObservedObject[^=]*= ' --include='*.swift' --exclude-dir='.build' .
# 08a non-private state
grep -Rn "${NOSHIP[@]}" -e '@State var' -e '@State public var' -e '@State internal var' --include='*.swift' --exclude-dir='.build' .
# 08b a Task opened inside onAppear (misses Task(priority:) split across lines)
grep -Rn "${NOSHIP[@]}" -A1 -e '\.onAppear' --include='*.swift' --exclude-dir='.build' . | grep -e 'Task[[:space:]]*{'
# 09 an @Observable without @MainActor on its line, the line before or the line after: rename Packages/DataKit/Sources to each nonisolated-default target directory
for d in Packages/DataKit/Sources; do [ -d "$d" ] || { echo "MISSING $d"; continue; }; grep -RlZ -e '@Observable' --include='*.swift' "$d" | xargs -0 -r awk 'FNR == 1 {if (pend != "") print pend; pend = ""; prev = ""} pend != "" {if ($0 !~ /@MainActor/) print pend; pend = ""} /@Observable([^A-Za-z0-9_]|$)/ && !/@MainActor/ && prev !~ /@MainActor/ {pend = FILENAME ":" FNR ": " $0} {prev = $0} END {if (pend != "") print pend}'; done
# 10a superseded SwiftUI API in new and touched files
git diff -z --name-only --diff-filter=AM "$BASE" -- '*.swift' | xargs -0 -r grep -n -e 'NavigationView' -e '\.foregroundColor(' -e '\.cornerRadius(' -e '\.tabItem' -e '\.navigationBarItems' -e 'edgesIgnoringSafeArea' -e '\.accentColor(' -e 'UIScreen\.main'
# 10b the one-parameter and perform: forms of onChange, in new and touched files
git diff -z --name-only --diff-filter=AM "$BASE" -- '*.swift' | xargs -0 -r grep -n -E -e '\.onChange\(of:[^{]*\{[[:space:]]*[A-Za-z_][A-Za-z0-9_]*[[:space:]]+in([[:space:]]|$)' -e 'onChange\(of:[^)]*perform:'
# 10c the 10a patterns over the whole tree, a labelled census that is never empty on a mature app
grep -Rn "${NOSHIP[@]}" --include='*.swift' --exclude-dir='.build' -e 'NavigationView' -e '\.foregroundColor(' -e '\.cornerRadius(' -e '\.tabItem' -e '\.navigationBarItems' -e 'edgesIgnoringSafeArea' -e '\.accentColor(' -e 'UIScreen\.main' .
# 12a AnyView sites, a work list
grep -Rn "${NOSHIP[@]}" -F -e 'AnyView' --include='*.swift' --exclude-dir='.build' .
# 12b body blocks over 100 lines, printed as file:line count
find -L . -name '*.swift' -not -path './.build/*' -print0 | xargs -0 -r awk -f "$CHECKS/body-len.awk" | awk '$2 > 100'
# 13 Combine census on new and touched files, a work list
git diff -z --name-only --diff-filter=AM "$BASE" -- '*.swift' | xargs -0 -r grep -n -e '\.sink' -e 'AnyCancellable' -e 'PassthroughSubject' -e 'CurrentValueSubject'
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-APPLE-06 | New observable model types are `@Observable`, held by `@State private` or injected with `.environment(_:)` and read with `@Environment(Type.self)`, with `@Bindable` for bindings. `ObservableObject`, `@Published`, `@StateObject`, `@ObservedObject` and `@EnvironmentObject` appear only where the deployment floor is below iOS 17, macOS 14, watchOS 10 and visionOS 1, or in a documented incremental migration that names the type being migrated. | `@Observable` invalidates a view only for properties its `body` reads, while `ObservableObject` needs Combine and `@Published` on every observed property (SE-0395, Swift 5.9). `ObservableObject` carries no `deprecatedAt` in DocC (read 2026-10-10), so the exemption is a floor test and never a deprecation test. "Superseded for new code" is the true statement. | Block `apple-swiftui`, command 06a on the diff, 06b as the census. Empty output = pass. The exemption test is the floor from block `apple-floor`. 06a and 06b are `-F` substring matches, so an identifier such as `TypingMembersObservableObject` is noise. Watched red (measured 2026-10-10): a plant with all five tells printed five lines, the twin was empty, and a changed file under a path with a space printed. Default: new types and new files are MUST, touched legacy files are SHOULD. | MUST (new) · SHOULD (touched) |
| SW-APPLE-07 | `@ObservedObject` never carries an initial or default value. It marks an input the view is handed. | Apple: "Don't specify a default or initial value for the observed object". The view re-creates the object on every parent redraw and loses state. Low value: only reachable under the `SW-APPLE-06` exemptions, where agents copy the old tutorial shape, and Apple's own text already forbids it (read 2026-10-10). Kept for its grep. | Block `apple-swiftui`, command 07. Empty output = pass, with the known miss of an attribute on its own line. Watched red (measured 2026-10-10): one plant printed, the twin was empty. | MUST |
| SW-APPLE-08 | `@State` is `private`, and async work a view starts is `.task { }`, never `.onAppear { Task { } }`. | Apple: "Declare state as private to prevent setting it in a memberwise initializer". `.task` is cancelled with the view's lifetime, an `.onAppear` task is not. | Block `apple-swiftui`, commands 08a and 08b. Empty output = pass. Watched red (measured 2026-10-10): one plant each printed, twins empty. The greps fire on real code, with 26 non-private `@State` in one strict app (measured 2026-10-10), so SHOULD matches the measured debt. | SHOULD |
| SW-APPLE-09 | In a target whose default isolation is `nonisolated`, a UI `@Observable` model and the functions that observe it carry `@MainActor`. In a MainActor-default target they carry no attribute (a style preference, not a defect). | Moving code from the app target into a nonisolated-default package flips the compile result. An unannotated `@Observable` class read through `Observations { }` exits 1 (`SendableClosureCaptures`) under `-swift-version 6` and exits 0 under `-default-isolation MainActor`. A `@MainActor` model read from a nonisolated function exits 1, the `@MainActor` reader exits 0 (Swift 6.4.0 and 6.3.3, measured 2026-10-10). The SwiftUI view path is `unverified: read only`. Under a MainActor default the attribute is redundant (element-hq/element-x-ios@14e33866ced2:AGENTS.md:286). | Block `apple-swiftui`, command 09, with the `for` list set to each nonisolated-default target's source directory. A missing directory prints `MISSING`, which is an error and never a pass. Output is a work list: not every `@Observable` is UI-bound, so read each hit. `@ObservableState` is not a hit. Watched red (measured 2026-10-10): a plant printed the bare `@Observable` and the same-line miss, and the twin with `@MainActor` on the line, before or after was empty, under a path with a space. Census for the second clause: `grep -Rn --exclude-dir='.build' -e '@MainActor' --include='*.swift' .` run inside a MainActor-default target, where a hit is a style choice. | SHOULD |
| SW-APPLE-10 | New and touched code does not use superseded SwiftUI API: `NavigationView`, `.foregroundColor(`, `.cornerRadius(`, `.tabItem`, `.navigationBarItems`, `edgesIgnoringSafeArea`, `.accentColor(`, `UIScreen.main`, and the one-parameter or `perform:` form of `.onChange(of:)`. Use `NavigationStack` or `NavigationSplitView`, `.foregroundStyle`, `.clipShape(.rect(cornerRadius:))`, `Tab`, `.toolbar`, `ignoresSafeArea`, `.tint`, a trait or context screen, and `{ old, new in }`. A floor below the replacement's introduction exempts the line (`NavigationStack` 16, `.foregroundStyle` 15, `Tab` 18). | DocC lists most of these at `deprecatedAt` 27.2 and `UIScreen.main` at 26.0, all still `deprecated: false` (read 2026-10-10), so these greps are agent hygiene and never a mirror of a compiler warning. `.onChange(of:perform:)` is deprecated at iOS 17. Two strict apps still carry 277 and 76 `.foregroundColor(` calls (measured 2026-10-10), so existing code is not rewritten wholesale. | Block `apple-swiftui`, commands 10a and 10b run on the diff, 10c is the whole-tree census to read. Empty output = pass for 10a and 10b. Watched red (measured 2026-10-10): four planted lines and the one-parameter, `_ in` and `perform:` `onChange` forms printed, and the twin with zero-parameter closures (`{ isLoading = false }`, `{ updateString() }`), a two-parameter closure and `{ isSearching = $1 }` was empty. Whether the iOS 27.2 SDK warns on these is `unverified: read only`. | SHOULD |
| SW-APPLE-12 | `AnyView` appears only at type-erasure boundaries (a coordinator handing a view to UIKit hosting, `ImageRenderer<AnyView>`, stored erased content), never inside `body`, `ForEach` content or conditional builders. A `body` over 100 lines is a review prompt to extract subviews and is never a violation by itself. | Apple: "Whenever the type of view used with an `AnyView` changes, the old hierarchy is destroyed and a new hierarchy is created". Measured `body` blocks (2026-10-10): one strict app has median 13, p99 75 and 6 over 100, another has median 29, p99 171 and 16 over 100. | Block `apple-swiftui`, command 12a is a work list (read each hit, since most are the one boundary, and expect noise from coordinator `toPresentable` boundaries and generated mocks) and 12b prints `file:line count` over 100. Empty output from 12b = pass, and 12b reads only `var body` with an optional `public`, `package`, `private` or `fileprivate` modifier, so a `static` or one-line `@ViewBuilder` spelling is missed. Watched red (measured 2026-10-10): a 122-line body printed, a 10-row twin was empty. | SHOULD |
| SW-APPLE-13 | New in-process state flow uses Observation (`Observations { }`, iOS 26) or `AsyncSequence` and `AsyncStream`, not Combine pipelines. Combine stays where an Apple API vends a `Publisher` (`NotificationCenter.publisher`, `URLSession.dataTaskPublisher`, KVO `publisher(for:)`), bridged with `.values` (iOS 15, read 2026-10-10). Existing Combine code is not migrated wholesale. | Combine is not deprecated (no `deprecatedAt`, read 2026-10-10). SE-0395 designed Observation to replace the `ObservableObject` use of Combine. A large production app has 468 files importing Combine (all `.swift`, measured 2026-10-10 at element-hq/element-x-ios@14e33866ced2), 378 outside Mocks, Preview and Tests paths, beside a newer Observation-based store, so migrate one store at a time. `sink` closures in a Swift 6 target are an isolation hazard whose specifics are `unverified: read only`. | Block `apple-swiftui`, command 13. A census to read ("is this a framework seam?"), never an automatic failure. The grep was watched red on three planted lines with the twin empty (measured 2026-10-10), the seam judgement is a reading heuristic. | SHOULD |

```swift
// wrong: the pre-iOS-17 tutorial shape, with an initial value on the observed object
final class CounterModel: ObservableObject {
    @Published var count = 0
}

struct CounterView: View {
    @ObservedObject var model = CounterModel()

    var body: some View {
        Button("\(model.count)") { model.count += 1 }
    }
}

// right: Observation, state private to the view
@Observable
final class CounterModel {
    var count = 0
}

struct CounterView: View {
    @State private var model = CounterModel()

    var body: some View {
        Button("\(model.count)") { model.count += 1 }
    }
}
```

## Reading Heuristics

No tool outside Xcode reports an effective setting or judges a target's role, so these rows are named
heuristics with aids. The aids print what to read and never a verdict.

```sh
# apple-read
CHECKS=.claude/rules/swift-quality/checks
# 14a every concurrency setting in the tree, with file and line
grep -Rn --exclude-dir='.build' -e 'SWIFT_VERSION' -e 'SWIFT_STRICT_CONCURRENCY' -e 'SWIFT_DEFAULT_ACTOR_ISOLATION' -e 'SWIFT_APPROACHABLE_CONCURRENCY' --include='*.pbxproj' --include='*.xcconfig' --include='project.yml' --include='target.yml' .
# 14b one line per build-configuration block: id, name, bundle, ver, iso, appr, strict, ios
find . -name project.pbxproj -not -path './.build/*' -not -path '*/Demo*/*' -not -path '*/Example*/*' -not -path '*/Sample*/*' -print0 | xargs -0 -r awk -f "$CHECKS/pbx-blocks.awk"
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-APPLE-14 | Before changing or advising on concurrency settings in an Apple project, read and state the effective `SWIFT_VERSION`, `SWIFT_STRICT_CONCURRENCY`, `SWIFT_DEFAULT_ACTOR_ISOLATION` and `SWIFT_APPROACHABLE_CONCURRENCY` for the target in question. Read the target block, then the xcconfig its `baseConfigurationReference` names, then the project block, and for a generated project the generator YAML. Never infer them from the Xcode version, a template or a blog post. | An unset language mode is Swift 5, and the same code is a warning or an error depending on it (Swift 6.4.0, measured 2026-10-10). Apple's release notes never document the two Swift 6.2 settings. Project-level blank or `5.0` is not an alarm when the target block sets 6. | Reading heuristic only: state the four values in the answer or the diff description. The full precedence order is not asserted (`unverified: read only`). Aids are `apple-read` commands 14a and 14b, and both ran on two real app projects (measured 2026-10-10). | MUST |
| SW-APPLE-15 | Isolation follows target kind. `MainActor` default on the app target, on UI-only packages no other product consumes, and on UI test targets. `nonisolated` on data, network, persistence and model targets and on extensions that do background work (a notification service). A UI-only extension (widget views, share-sheet UI) may take the default. A type that must be used off the main actor is marked `nonisolated` under a MainActor default. | Apple: main-actor-by-default is "primarily for your main app module and any modules that are focused on UI interactions", and for libraries "it's best to provide a nonisolated API" ([WWDC25 268](https://developer.apple.com/videos/play/wwdc2025/268/)). Under `-swift-version 6 -default-isolation MainActor`, a `nonisolated func` reading an unannotated class exits 1 and the `nonisolated final class` twin exits 0 (Swift 6.4.0 and 6.3.3, measured 2026-10-10). | Reading heuristic: list each target's isolation with `apple-read` command 14b or the generator YAML, then compare it with the target's role (the `PRODUCT_BUNDLE_IDENTIFIER` suffix and product type). A role judgement cannot be a grep. The compile half was watched red against its twin. | SHOULD |
| SW-APPLE-16 | Where an Xcode 27 MCP server is attached to the session, ask it for effective build settings, compiler flags, entitlements and Info.plist keys instead of parsing a pbxproj. Use its write tools only on a hand-maintained project, since `SW-APPLE-03` forbids them on a generated one. Where it is absent, fall back to `SW-APPLE-14`. | The Xcode 27 release note (item 176935844, read 2026-10-10) says the server inspects build settings, compiler flags, entitlements and Info.plist keys. It does not say whether values are resolved (`unverified: read only`). Direction is complement, never replace, since Apple-authored agent skills overlap this set. | Reading heuristic: does the session list an Xcode MCP tool? No command exists. | CONSIDER |

## What Agents Get Wrong Here

Ranked by how often they bite. The order is a judgement from exemplar frequency, because no agent trace of
Swift exists.

1. **New models as `ObservableObject` plus `@Published` plus `@StateObject`**, copied from the pre-iOS-17 tutorial corpus. Check the floor, then `SW-APPLE-06`.
2. **Superseded SwiftUI API**: `NavigationView`, `.foregroundColor`, `.cornerRadius`, `.tabItem`, the one-parameter `.onChange`. `SW-APPLE-10`.
3. **`.onAppear { Task { await ... } }`, non-private `@State`, `@ObservedObject var vm = ViewModel()`.** `SW-APPLE-07`, `SW-APPLE-08`.
4. **Guessed availability numbers**: `@available(iOS 17, *)` on a view using `Observations` (26) or `Tab` (18), and dead guards at or below the floor. `SW-APPLE-11` and the table.
5. **A MainActor default with language mode 5**, or "fixing" a red build by flipping `SWIFT_VERSION` back to 5. Mode 5 turns the errors into warnings and exits 0. `SW-APPLE-02`.
6. **Invented settings and values**: `SWIFT_DEFAULT_ISOLATION`, `SWIFT_ENABLE_APPROACHABLE_CONCURRENCY`, `MainActor.self`, `Enabled`, `true`, or a SwiftPM spelling copied into an xcconfig. `SW-APPLE-01`.
7. **`Mutex` in an app at iOS 16 or 17**, or `OSAllocatedUnfairLock.lock()` and `unlock()` around an `await`. `SW-APPLE-04`.
8. **Editing the generated `.pbxproj`**, or calling an Xcode MCP write tool, instead of `project.yml` or `target.yml`. `SW-APPLE-03`.
9. **`defaultIsolation(MainActor.self)` in a library or SDK**, or without `.v6`, and a UI model moved into a package without `@MainActor`. `SW-CONC-11`, `SW-APPLE-02`, `SW-APPLE-09`.
10. **`AnyView` to make an `if`/`else` type-check**, and a 200-line `body`. `SW-APPLE-12`.
11. **Combine pipelines for new in-process state**, or the claim "Combine is deprecated". `SW-APPLE-13`.
12. **Stale or unverified claims**: `swiftLanguageVersions:`, "SwiftPM has no Approachable Concurrency", "`ObservableObject` is deprecated", and a claim about what a new Xcode project defaults to, either way. `SW-PKG-20` for the first, and `SW-APPLE-14` forces a read of the rest.
13. **`@unchecked Sendable` or `nonisolated(unsafe)` on a model to quiet a MainActor-default error**, `Task.detached` to "leave the main actor", `DispatchQueue.main.async` in views. `SW-GATE-10`, `SW-CONC-13`.
14. **Assuming it can run `xcodebuild` or Previews**, or reporting an Apple-only change as built. No grep exists: say `unverified: read only`, and use the Xcode MCP server when attached (`SW-APPLE-16`).
15. **`@MainActor` on every type inside a MainActor-default target.** A style preference, not a defect: it hides which types are deliberately UI. `SW-APPLE-09`.
