---
title: Server package releases between 2026-10-10 and 2026-11-27
pair: swift-quality
date_researched: 2026-11-27
window_start: 2026-10-10
model: sonnet
sources_fetched: 21
---

# Server package releases, 2026-10-10 to 2026-11-27

This is a delta update of the 2026-10-10 baseline. It covers only the packages the pair pins. Release dates come from each repository's `releases.atom` feed (the GitHub API was rate-limited, so the feeds and raw source files at the cited tags were read instead). Every URL below was opened, not taken from a search snippet.

## Summary

- No pinned floor needs to move. Every stamped floor still resolves, and every newer release stays source compatible with the pair's Swift 6.2 floor leg.
- Two version stamps are now stale as "current": swift-subprocess 1.0.2, swift-system 1.9.0, swift-service-lifecycle 2.13.0, swift-log 1.17.2, swift-configuration 1.5.0, AHC 1.37.1, swift-nio-ssl 2.37.8. They are measured pins, not floors, so they stay "measured 2026-10-10" unless the owner wants a re-measure.
- swift-argument-parser (newest 1.8.2) and swift-async-algorithms (newest 1.1.7) had no release in the window.
- Every measured behaviour on the claims list is unchanged upstream. The one item that needs a re-measure is ocx: 0.6.6 folded exit codes 83 to 87 into the next-action codes.

## Findings per package

### swift-subprocess: newest 1.0.2 (2026-10-16)

- 1.0.1 was published 2026-10-09, one day before the baseline, so the stamp "1.0.1" is the baseline release itself. [1.0.1 notes](https://github.com/swiftlang/swift-subprocess/releases/tag/1.0.1): posix_spawn on every Unix, `.sequence` pipe fd leak fixed, atomic close-on-exec, `supplementaryGroups: []` now calls `setgroups()` and fails `.spawnFailed` (EPERM) for an unprivileged process.
- [1.0.2 notes](https://github.com/swiftlang/swift-subprocess/releases/tag/1.0.2) (2026-10-16): "bug fix release with no API changes", one armv7 Android build fix ([#387](https://github.com/swiftlang/swift-subprocess/pull/387)).
- Floor `from: "1.0.1"` (io.md SW-IO-06, SW-API-12): unchanged. 1.0.2 satisfies it.
- Stale spellings (`.sendSignal`, `runDetached`, `exact: "1.0.0"`): unchanged. The [1.0.2 README](https://raw.githubusercontent.com/swiftlang/swift-subprocess/1.0.2/README.md) still shows `.upToNextMinor(from: "0.4.0")`, still lists `SubprocessFoundation` as an enabled-by-default trait, and still says 0.5.x and 1.0.x need Swift 6.2.
- Open question "Build only" on musl: unchanged in wording. The README's platform table lists "Static Linux SDK" as "Build only" and never names musl, so the claim holds as an inference only.

### swift-system: newest 1.9.0 (2026-11-12)

- [1.9.0 notes](https://github.com/apple/swift-system/releases/tag/1.9.0): StatFS, IORing `pollAdd`, `Errno.description` now thread-safe through `strerror_r`, a FilePath fix for trailing separators when replacing a `ComponentView` suffix ([#412](https://github.com/apple/swift-system/pull/412)), and "Require Swift 6.2" ([#413](https://github.com/apple/swift-system/pull/413)).
- Floor "1.5.0 or newer" (io.md SW-IO-01): unchanged. The Swift 6.2 requirement matches the pair's 6.2 floor leg and `// swift-tools-version: 6.2`. It does mean a resolver picking 1.9.0 excludes toolchains below 6.2, which the pair already excludes.
- io.md uses `removingLastComponent()` and `appending`, not `ComponentView` suffix replacement, so #412 touches no listed claim.

### swift-argument-parser: newest 1.8.2 (2026-06-04), nothing in the window

- The [tag list](https://github.com/apple/swift-argument-parser/tags) ends at 1.8.2, and the [releases feed](https://github.com/apple/swift-argument-parser/releases.atom) has no entry after 2026-07-08 (a 1.7.2 backport). Stamps "1.8.x" and "1.8.2": unchanged.

### swift-service-lifecycle: newest 2.13.0 (2026-10-14)

- [2.13.0](https://github.com/swift-server/swift-service-lifecycle/releases/tag/2.13.0): "minimal Swift tools version to 6.2" ([#261](https://github.com/swift-server/swift-service-lifecycle/pull/261)), macOS tests dropped from CI.
- [2.12.1](https://github.com/swift-server/swift-service-lifecycle/releases/tag/2.12.1) (2026-10-05): dispatch source leaks in `UnixSignalsSequence` fixed. Before the baseline.
- Floor "2.x" (SW-CLI-20, SW-CLI-21): stays, with one note. 2.13.0 needs tools 6.2, while cli-contract.md line 32 says "swift-service-lifecycle 2.x needs tools 6.1". That sentence is true for 2.12.1 and false for 2.13.0 and later. Change it to "2.13 and newer need tools 6.2".
- `gracefulShutdownSignals` default: unchanged. [ServiceGroupConfiguration.swift at 2.13.0](https://raw.githubusercontent.com/swift-server/swift-service-lifecycle/2.13.0/Sources/ServiceLifecycle/ServiceGroupConfiguration.swift) still has `gracefulShutdownSignals: [UnixSignal] = []`.
- SW-CONC-33 "ends in a `fatalError`": unchanged. The 2.13.0 doc says "task cancellation will be escalated to a `fatalError`", and [ServiceGroup.swift](https://raw.githubusercontent.com/swift-server/swift-service-lifecycle/2.13.0/Sources/ServiceLifecycle/ServiceGroup.swift) still calls `fatalError("Cancellation took longer than allowed by the configuration.")`.

### swift-log: newest 1.17.2 (2026-11-17)

- [1.16.2](https://github.com/apple/swift-log/releases/tag/1.16.2) (2026-10-22): handler mutated in place on metadata writes ([#529](https://github.com/apple/swift-log/pull/529)).
- [1.17.0](https://github.com/apple/swift-log/releases/tag/1.17.0) (2026-11-04): opt-in millisecond timestamps in `StreamLogHandler` ([#483](https://github.com/apple/swift-log/pull/483)), `MultiplexLogHandler.metadata` priority fix ([#530](https://github.com/apple/swift-log/pull/530)).
- [1.17.1](https://github.com/apple/swift-log/releases/tag/1.17.1) and [1.17.2](https://github.com/apple/swift-log/releases/tag/1.17.2) (both 2026-11-17): raw-identifier module names in `Logger.currentModule`, `MultiplexLogHandler.metadataProvider` setter fix ([#537](https://github.com/apple/swift-log/pull/537)).
- Floor 1.16.1 (SW-API-08, `InMemoryLogHandler` at 1.16.1): unchanged. Source at [1.17.2](https://raw.githubusercontent.com/apple/swift-log/1.17.2/Sources/InMemoryLogging/InMemoryLogHandler.swift) still declares `public struct InMemoryLogHandler: LogHandler` with `entries`. The default `StreamLogHandler` timestamp format is unchanged (ms precision is opt-in).

### swift-configuration: newest 1.5.0 (2026-11-05)

- [1.3.0](https://github.com/apple/swift-configuration/releases/tag/1.3.0) (2026-10-20): `CustomStringConvertible` audit, Windows CI, a swift-argument-parser integration doc. [1.4.0](https://github.com/apple/swift-configuration/releases/tag/1.4.0): `BinaryInteger` raw conversions. [1.5.0](https://github.com/apple/swift-configuration/releases/tag/1.5.0): batch updates for `MutableInMemoryProvider`.
- [1.2.2](https://github.com/apple/swift-configuration/releases/tag/1.2.2) (2026-10-05, before baseline) already kept empty values in env files.
- SW-CLI-19 "treats an empty variable as set": unchanged. [EnvironmentVariablesProvider.swift at 1.5.0](https://raw.githubusercontent.com/apple/swift-configuration/1.5.0/Sources/Configuration/Providers/EnvironmentVariables/EnvironmentVariablesProvider.swift) has no `isEmpty` check, so an empty value is returned as a string. No release line changes it.
- Floor 1.2.2: stays.

### swift-async-algorithms: newest 1.1.7 (2026-09-30), nothing in the window

- `AsyncChannel.send` swallowing cancellation: unchanged. [AsyncChannel.swift at 1.1.7](https://raw.githubusercontent.com/apple/swift-async-algorithms/1.1.7/Sources/AsyncAlgorithms/Channels/AsyncChannel.swift) says "If the task is cancelled, this function will resume without sending the element."
- Traits: [Package.swift at 1.1.7](https://raw.githubusercontent.com/apple/swift-async-algorithms/1.1.7/Package.swift) declares one trait, `UnstableAsyncStreaming`, off by default, which gates the `AsyncStreaming` module. The page read declared no trait for the multi-producer channel, and concurrency.md SW-CONC-35 does not claim one in its text. The claim "multi-producer channel behind a trait" is therefore could not determine from this fetch (the summariser may have truncated the file). `AsyncStreaming` behind a trait: unchanged.

### AsyncHTTPClient: newest 1.37.1 (2026-11-23)

- [1.37.0](https://github.com/swift-server/async-http-client/releases/tag/1.37.0) (2026-11-02): minimum Swift 6.2 ([#935](https://github.com/swift-server/async-http-client/pull/935)), debug crash fix when a request body stream finishes after a >= 300 response head ([#934](https://github.com/swift-server/async-http-client/pull/934)), `@unchecked` dropped. [1.37.1](https://github.com/swift-server/async-http-client/releases/tag/1.37.1): locale include refactor, NIOTS trust-evaluation failures logged.
- Floor 1.36.2 (network.md): stays, but 1.37.0 and newer need Swift 6.2. network.md already uses 6.2 as its Swift floor, so no conflict.
- README redirect sentence: unchanged and still stale. The [1.37.1 README](https://raw.githubusercontent.com/swift-server/async-http-client/1.37.1/README.md) still says "If you create your own `HTTPClient`, you can enable the follow-redirects behavior". [HTTPClient.swift](https://raw.githubusercontent.com/swift-server/async-http-client/1.37.1/Sources/AsyncHTTPClient/HTTPClient.swift) still has `redirectConfiguration ?? RedirectConfiguration()` with `.follow(max: 5)`. The window's #934 touches body streaming after a redirect-class response in debug builds only. It does not change the default.
- "AHC sets no User-Agent": unchanged. The 1.37.1 source never mentions "User-Agent". This is a negative from one file, so SW-NET-19's heuristic stays.

### swift-nio-ssl: newest 2.37.8 (2026-11-26)

- [2.37.6](https://github.com/apple/swift-nio-ssl/releases/tag/2.37.6): BoringSSL update, no flush of buffered writes on closed TLS channels. [2.37.7](https://github.com/apple/swift-nio-ssl/releases/tag/2.37.7): `Security.framework` guarded with `canImport(Security)`. [2.37.8](https://github.com/apple/swift-nio-ssl/releases/tag/2.37.8): CMake support, crash on non-ASCII passphrases fixed.
- Floor 2.30 (`additionalTrustRoots`): stays. No release line in the window touches trust roots. Releases 2.31 to 2.37.5 predate the window and were not read.

### ocx (api-design.md "ocx 0.6.5"): newest 0.6.8 (2026-11-15)

- [0.6.6](https://github.com/ocx-sh/ocx/releases/tag/v0.6.6) (2026-11-12): "OCX machine-interface contract, the ocx-sdkgen Rust SDK generator, and exit codes 83-87 folded into the next-action codes" (BREAKING). Also "Keep the reports and errors contracts at v1 while the interface hardens", "A transient GitHub OIDC token fetch failure exits 75", and "Every CLI-level refusal names its cause in `error.detail`".
- [0.6.7](https://github.com/ocx-sh/ocx/releases/tag/v0.6.7) (2026-11-15): several BREAKING CLI changes (`package verify` and `sbom` default to the host platform, `--no-verify` refused under a locked config, `announce --tags-from-registry` indexes version tags only). No exit codes or schema versions named. [0.6.8](https://github.com/ocx-sh/ocx/releases/tag/v0.6.8): cascade repair fix.
- Verdict: exit codes 83 to 87 changed. The release notes do not say what they fold into, so the new mapping is could not determine. The report schema is stated as staying at v1.

## Claim table

| Claim | Status | Source and date |
|---|---|---|
| swift-subprocess 1.0.1 stamp and floor | unchanged (1.0.2 is a bug-fix, no API change) | [1.0.2](https://github.com/swiftlang/swift-subprocess/releases/tag/1.0.2), 2026-10-16 |
| io.md stale spellings and "Build only" on musl | unchanged | [README at 1.0.2](https://raw.githubusercontent.com/swiftlang/swift-subprocess/1.0.2/README.md) |
| swift-system 1.5.0 or newer | unchanged; 1.9.0 requires Swift 6.2 | [1.9.0](https://github.com/apple/swift-system/releases/tag/1.9.0), 2026-11-12 |
| swift-argument-parser 1.8.x and 1.8.2 | unchanged, no release | tags page |
| swift-service-lifecycle 2.12.1 stamp, default `[]`, `fatalError` | behaviour unchanged; "2.x needs tools 6.1" is stale for 2.13.0 | [2.13.0](https://github.com/swift-server/swift-service-lifecycle/releases/tag/2.13.0), 2026-10-14 |
| swift-log 1.16.1, `InMemoryLogHandler` | unchanged | [1.17.2](https://github.com/apple/swift-log/releases/tag/1.17.2), 2026-11-17 |
| swift-configuration 1.2.2 and empty-variable-is-set | unchanged, no upstream fix | provider source at 1.5.0 |
| swift-async-algorithms 1.1.7, `send` swallows cancellation | unchanged | source at 1.1.7 |
| multi-producer channel behind a trait | could not determine | Package.swift at 1.1.7 shows only `UnstableAsyncStreaming` |
| AHC 1.36.2, stale README, no User-Agent | unchanged | [1.37.1](https://github.com/swift-server/async-http-client/releases/tag/1.37.1), 2026-11-23 |
| swift-nio-ssl 2.30 | unchanged | [2.37.8](https://github.com/apple/swift-nio-ssl/releases/tag/2.37.8), 2026-11-26 |
| ocx 0.6.5, exit codes 82 to 87 | changed: needs a re-measure | [0.6.6](https://github.com/ocx-sh/ocx/releases/tag/v0.6.6), 2026-11-12 |

## Normative guidance candidates

1. Rewrite the manifest-gated sentence in cli-contract.md line 32 to "swift-service-lifecycle 2.12 needs tools 6.1, 2.13 and newer need tools 6.2". Rationale: 2.13.0 raised the minimum ([#261](https://github.com/swift-server/swift-service-lifecycle/pull/261)). Verification: `grep -n "swift-tools-version" Package.swift` from the tag `2.13.0`.
2. Re-measure ocx 83 to 87 against ocx 0.6.8 before any rule keeps "ocx uses 82 to 87" (cli-contract.md line 97) or the `Status` table of SW-CLI-01 and SW-API-16 range statements. Rationale: 0.6.6 is a BREAKING fold of those codes. Verification: run each failing command of the contract tier (SW-API-23, `OCX_SDK_EXE`) and compare `$?` with the table.
3. Optional: note "swift-system 1.9 and newer need Swift 6.2" beside SW-IO-01. Rationale: it explains why the floor leg cannot drop below 6.2. Verification: `swift build` on the 6.2.0 leg with `from: "1.5.0"` resolving to 1.9.0.

## AI-agent angle

- An agent will copy the swift-subprocess README's `.upToNextMinor(from: "0.4.0")`, which still resolves to a 0.4 release. Check: `grep -n "upToNextMinor" Package.swift`.
- An agent will write "2.x needs tools 6.1" for swift-service-lifecycle from the old sentence. Check: the tools-version of the pinned tag.

## Contested / evolving

- The 6.2-only trend is clear as of 2026-11: swift-log 1.16.0, swift-service-lifecycle 2.13.0, AHC 1.37.0 and swift-system 1.9.0 each lifted their minimum to 6.2 in 2026-10 to 2026-11. The pair's Swift 6.2 floor leg now matches the ecosystem minimum, so a future 6.1 leg is no longer viable.
- ocx exit codes are still hardening ("while the interface hardens"). Expect further change.

## Sources

| URL | What it is | Date |
|---|---|---|
| https://github.com/swiftlang/swift-subprocess/releases.atom | releases feed, 1.0.0 to 1.0.2 | 2026-10-16 |
| https://raw.githubusercontent.com/swiftlang/swift-subprocess/1.0.2/README.md | README at 1.0.2 | 2026-10-16 |
| https://github.com/apple/swift-system/releases.atom | releases feed, 1.9.0 | 2026-11-12 |
| https://github.com/apple/swift-argument-parser/releases.atom | feed, no window release | 2026-07-08 |
| https://github.com/swift-server/swift-service-lifecycle/releases.atom | feed, 2.12.1 and 2.13.0 | 2026-10-14 |
| https://raw.githubusercontent.com/swift-server/swift-service-lifecycle/2.13.0/Sources/ServiceLifecycle/ServiceGroupConfiguration.swift | source at 2.13.0 | 2026-10-14 |
| https://raw.githubusercontent.com/swift-server/swift-service-lifecycle/2.13.0/Sources/ServiceLifecycle/ServiceGroup.swift | source at 2.13.0 | 2026-10-14 |
| https://github.com/apple/swift-log/releases.atom | feed, 1.16.1 to 1.17.2 | 2026-11-17 |
| https://raw.githubusercontent.com/apple/swift-log/1.17.2/Sources/InMemoryLogging/InMemoryLogHandler.swift | source at 1.17.2 | 2026-11-17 |
| https://github.com/apple/swift-configuration/releases.atom | feed, 1.2.2 to 1.5.0 | 2026-11-05 |
| https://raw.githubusercontent.com/apple/swift-configuration/1.5.0/Sources/Configuration/Providers/EnvironmentVariables/EnvironmentVariablesProvider.swift | provider source at 1.5.0 | 2026-11-05 |
| https://github.com/apple/swift-async-algorithms/releases.atom | feed, newest 1.1.7 | 2026-09-30 |
| https://raw.githubusercontent.com/apple/swift-async-algorithms/1.1.7/Package.swift | traits at 1.1.7 | 2026-09-30 |
| https://raw.githubusercontent.com/apple/swift-async-algorithms/1.1.7/Sources/AsyncAlgorithms/Channels/AsyncChannel.swift | send doc at 1.1.7 | 2026-09-30 |
| https://github.com/swift-server/async-http-client/releases.atom | feed, 1.37.0 and 1.37.1 | 2026-11-23 |
| https://raw.githubusercontent.com/swift-server/async-http-client/1.37.1/README.md | README at 1.37.1 | 2026-11-23 |
| https://raw.githubusercontent.com/swift-server/async-http-client/1.37.1/Sources/AsyncHTTPClient/HTTPClient.swift | source at 1.37.1 | 2026-11-23 |
| https://github.com/apple/swift-nio-ssl/releases.atom | feed, 2.37.6 to 2.37.8 | 2026-11-26 |
| https://github.com/ocx-sh/ocx/releases.atom | feed, 0.6.5 to 0.6.8 | 2026-11-15 |
| https://github.com/ocx-sh/ocx/releases/tag/v0.6.6 | 0.6.6 release page | 2026-11-12 |
| https://raw.githubusercontent.com/ocx-sh/ocx/v0.6.8/CHANGELOG.md | changelog at 0.6.8 | 2026-11-15 |

Fewer than 12 primary sources per package was not needed: this is a delta, and all sources above are primary.
