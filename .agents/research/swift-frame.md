---
title: Swift expertise (language, concurrency, SwiftPM, testing, tooling, platforms) — phase 0 frame
program: swift
date: 2026-10-10
method: research-lang (one language, its concurrency model, its package manager, its test and lint ecosystem, its cross-platform release story, and Bazel-for-Swift as a complement to bazel-quality)
status: active
branch: swift worktree (/home/mherwig/dev/grimoire-lore/.agents/worktrees/swift) — research lands on branch `swift`, not `main`
---

# Swift — the frame

Written before any worker was spawned. Everything below is a hypothesis the
grounding wave may overturn; corrections are appended at the bottom, never
edited into the body.

## The language and its era

The domain is **Swift as written in late 2026**, in five layers:

- **The language**: Swift 6 language mode, value vs reference semantics,
  protocols and generics (`some`/`any`, primary associated types,
  parameter packs), typed throws (SE-0413), noncopyable and nonescapable
  types (`~Copyable`, `~Escapable`, `consuming`/`borrowing`), `Span` /
  `InlineArray` (6.2), macros (freestanding and attached, swift-syntax
  dependency cost), result builders, access control and `package` access,
  `@frozen` / library evolution, `@inlinable`, API Design Guidelines.
- **Concurrency**: strict concurrency checking, `Sendable`, actors and
  global actors, region-based isolation (SE-0414), `sending`, task groups,
  cancellation, `AsyncSequence`, `Mutex` (Synchronization), the 6.2
  "approachable concurrency" settings (default `MainActor` isolation,
  `nonisolated(nonsending)` by default, `@concurrent`, isolated
  conformances), escape hatches (`@unchecked Sendable`,
  `nonisolated(unsafe)`, `@preconcurrency`, `assumeIsolated`), migration from
  GCD / completion handlers / Combine.
- **SwiftPM and the build**: `Package.swift` manifests and tools versions,
  `swiftLanguageModes`, `swiftSettings` (upcoming / experimental features,
  `unsafeFlags`), package traits (6.1), plugins (build and command), macros
  as packages, `Package.resolved`, versioning and semver, `package` access,
  registry support, Swift Build as SwiftPM's new engine, Xcode project
  generation (Tuist / XcodeGen) where apps exist.
- **Quality gates**: compiler diagnostics and warning groups
  (`-warnings-as-errors`, SE-0443 warning control), swift-format (bundled in
  the toolchain) vs SwiftFormat (nicklockwood) vs SwiftLint, Swift Testing vs
  XCTest, snapshot testing, coverage, sanitizers (TSan, ASan), DocC,
  API-breakage checks (`swift package diagnose-api-breaking-changes`).
- **Platforms and release**: Linux (glibc, static Linux SDK / musl),
  Windows, Wasm SDK, Android SDK, Embedded Swift, Foundation on Linux
  (swift-foundation / FoundationEssentials), Apple platforms (Xcode, SwiftUI,
  Observation, XCFrameworks, availability), cross-compilation SDKs,
  reproducible release binaries, Docker images, and Bazel (`rules_swift`).

Era to **verify, not assume** (the recent-shifts scout owns it): Swift 6.4.0
is current (released 2026-09-14, measured from
`https://www.swift.org/api/v1/install/releases.json`); 6.3.3 (2026-06-29) is
the prior line. 6.4.0 dropped the Android SDK from the published platform
list that 6.3.x carried — verify whether that is real or an API artifact.
SwiftLint 0.65.1 and SwiftFormat 0.63.1 are the latest GitHub releases
(2026-10-10).

## The codebases that will adopt the output

**The fleet has no Swift code of its own** (measured 2026-10-10: the only
`.swift` files under `/home/mherwig/dev` sit in a JVM exemplar scratch dir
and a Bazel repository cache; no `Package.swift` outside those). And the ocx
index carries no Swift toolchain (`ocx index list ocx.sh/swiftlang/swift` →
not found). So:

1. **External consumers of the published lore set** are the primary
   adopters: Swift packages, server and CLI code, and Apple-platform apps.
2. **Future fleet Swift code, by analogy with what the fleet already builds**:
   an OCX SDK for Swift mirroring `/home/mherwig/dev/ocx-sdk-python`; Swift
   CLIs in the ocx/grimoire mould (OCI registries, content-addressed stores,
   atomic writes, exit-code contracts — `apple/containerization` and
   `apple/swift-container-plugin` are Swift prior art for exactly this); and
   Swift toolchains as a package the ocx index could distribute.
3. **The exemplar corpus** stands in for grounding: 40 upstream repositories
   of deliberately different shapes (Apple/swiftlang core libraries, server
   frameworks, community libraries, two SwiftUI apps, a Tuist-sized
   monorepo, Bazel rules, Wasm, Embedded), fetched 2026-10-10 as blob-less
   depth-1 clones with binary assets sparse-excluded under
   `~/.cache/research-lang/exemplars/swift/<owner>__<repo>`. Recreate with
   `swift-audit/scratch/fetch-exemplars.sh <dir>`. SHAs:
   `swift-audit/scratch/exemplar-shas.md`.
4. **A measurement toolchain** exists: the official `swift:6.4` (and
   `swift:6.3`) Docker images, wrapped by
   `~/.cache/research-lang/swift-tools/run.sh <cmd>` (cwd preserved; mounts
   the research cache and the lore worktrees at the same paths; SwiftLint
   0.65.1 and SwiftFormat 0.63.1 on PATH; `swift format` bundled; build with
   `--scratch-path "$SWIFT_SCRATCH/<name>"`). **No macOS, no Xcode**: Apple-only
   behaviour (SwiftUI, Xcode build settings, XCFrameworks, iOS runtime) is
   read-only research; verifications for it must be greps or reading
   heuristics and say so.

## Existing AI config that already touches this domain

None for Swift in the catalog. Adjacent sets a Swift topic must not
duplicate: `docs-quality` and `code-docs` (doc pages and doc comments in
general — DocC specifics are Swift's), `bazel-quality` (bzlmod, hermeticity,
caching, CI; a `swift.md` depth file slots in beside `go.md`), the Rust
`cli-contract` and `durable-state` depth files (the fleet's exit-code,
stream and atomic-write contract a Swift CLI should mirror), `cpp-packaging`
/ `cmake-build` (C interop seams).

## Orchestrator's hypotheses (to test, not to assume)

- **H1** Most active exemplars are in Swift 6 language mode
  (`swift-tools-version` ≥ 6.0 without `swiftLanguageModes: [.v5]`), but
  community libraries still ship 5.x tools versions for compatibility.
- **H2** `@unchecked Sendable` and `nonisolated(unsafe)` are the dominant
  concurrency escape hatches, and most uses are avoidable with `Mutex`,
  `sending`, or actor isolation.
- **H3** Swift Testing has overtaken XCTest for new tests in Apple/swiftlang
  repos but not in community libraries.
- **H4** swiftlang/apple repos use the bundled swift-format; community repos
  use SwiftLint and/or SwiftFormat; no single formatter dominates.
- **H5** `Package.resolved` is committed by apps and executables, not by
  libraries.
- **H6** Linux CI is common for server and core libraries; Windows CI is
  rare; static-Linux-SDK release binaries appear only in CLIs.
- **H7** Agents fail most on: GCD / completion handlers / Combine in new
  code, `ObservableObject` instead of `@Observable`, XCTest for new tests,
  unstructured `Task {}` and `Task.detached` with no cancellation path,
  `MainActor.run` hops, `@unchecked Sendable` to silence errors, force
  unwraps, and pre-6.0 manifest idioms.
- **H8** Default `MainActor` isolation (6.2) appears only in app targets,
  not packages; libraries should not enable it.

## Artifact set (what this program must converge to)

Hypothesis, revised by the map:

| Artifact | Kind | Scope |
|---|---|---|
| `swift-quality` | rule, glob `**/*.swift`, index + depth files | language, concurrency, errors, API design, testing, performance, security, platform |
| `swift-package` | rule, globs on `Package.swift`, `Package.resolved`, `.swift-format`, `.swiftlint.yml`, `.swiftformat`, CI workflows | manifests, tools version, settings, traits, plugins, gates, release |
| `swift-concurrency-migrate` | skill | move a target to Swift 6 language mode / strict concurrency without escape-hatch spam |
| `swift-diagnose` | skill | compiler, SwiftPM, linker and concurrency diagnostic catalog with fixes |
| a release skill | skill (if the map justifies it) | cross-platform release binaries, static SDK, XCFrameworks, tags |
| `swift-essentials` | bundle, untagged members | |
| `bazel-quality/swift.md` | depth file offered to the published set | rules_swift |

## Owner-question defaults (applied; the owner may overturn)

- **Q1 Apple app layer** in scope as depth content (SwiftUI, Observation,
  Xcode settings), verified by reading only; SwiftPM-first everywhere else.
- **Q2 Floors**: Swift 6.0 tools version and Swift 6 language mode for new
  code; current 6.4; 5.x guidance only as migration material.
- **Q3 Tests**: the map decides Swift Testing vs XCTest per test kind.
- **Q4 Formatter/linter**: the map decides; no pre-commitment.
- **Q5 Bazel**: a `rules_swift` depth file offered to `bazel-quality`
  (same shape as `go.md`), version bump on that set.
- **Q6 Gate host**: Linux via Docker is the measurable gate; macOS legs are
  listed as unverified wherever they matter.

## Corrections

(appended by later phases)

### From the map (2026-10-10, `swift-topic-map.md` › Frame corrections)

- Android SDK not dropped in 6.4.0 (releases.json lists it, NDK r30) [shift]
- H1: tools version != language mode; community libraries are not on 5.x tools (modal tools 6.2; Alamofire tools 6.4 + .v5) [pkg] [conc] Axis 6
- H2: @unchecked Sendable dominates (564/33) but only ~half is avoidable (12/25); Mutex fits only 4 [conc] Axis 1
- H3: the Swift Testing split is by repo age, not Apple vs community (community 66.8%, core 37.9%, newest Apple repos 100%) [gates] Axis 2
- H4: swift-format dominates (24 vs 7, 3.4x); SwiftPM itself uses SwiftFormat [gates] Headline 1
- H5 mostly holds: 3 libraries commit Package.resolved; 6 swiftlang tools ignore theirs [pkg] Headline 2
- H6: Windows is tested in about half the corpus (19-20/40); Wasm 15 and Android 11 legs are common [gates] [eco]
- H7: MainActor.run is rare in exemplars (23); it is an agent habit [conc]
- H8: default MainActor appears in app-internal packages, never in published libraries [conc]
- The frame's glob list missed Package@swift-*.swift and .spi.yml, and must not glob workflows [cfg] §2.4, [map] M1
- Swift is not absent from the catalog: code-docs already loads on **/*.swift, half-wired [cfg] C1
- The docs-quality declaration example breaks DocC --warnings-as-errors [cfg] C7
- Bazel is secondary for Swift (5/40) and no bazel binary is available for research [eco]
- The --static-swift-stdlib recipe fails under the default Swift Build; use the static Linux SDK [eco] [pkg] E7/E8
- The swift-syntax cost is pin policy, not compile time (prebuilts on by default) [pkg]
- FilePath, CommandLine.executablePath, withDeadline and defaultSwiftSettings are not in 6.4 despite WWDC26 claims [shift] [prac]
- The 6.4 init template adds ApproachableConcurrency to library and test targets (Wals/AvdLee guidance stale) [shift] §17
- rules_swift docs drift from its code (-debug-module-path) [eco]
- The Python SDK does not map signals, so 'mirror ocx-sdk-python' needs an owner decision (Q6) [cfg] C5

### Owner-question defaults applied by the map (Q1-Q8)

- Q1 Floors: libraries/SDK at tools 6.2 + explicit Swift 6 mode; CLIs/servers at the current release (6.4)? Default: yes; W2 manifest-policy may lower the library floor with evidence.
- Q2 Formatter: swift-format with a shipped .swift-format (4 spaces, 120 columns), SwiftLint only as an optional custom_rules vehicle? Default: yes (say if you want the tool defaults, 2 spaces/100 columns).
- Q3 CLIs and servers never set defaultIsolation(MainActor.self); apps may? Default: yes.
- Q4 Swift SDK depends only on stdlib + swift-subprocess, with 100% line coverage on Linux? Default: yes, matching ocx-sdk-python's bar.
- Q5 Apple depth file stays read-only (greps/heuristics, no compile checks)? Default: yes, until a macOS runner exists.
- Q6 Swift SDK maps a signal-killed child to 128+n like Go (Python keeps it raw)? Default: 128+n.
- Q7 May research dives verify Windows rows on the WSL Windows host via cmd.exe, or must they stay 'unverified: read only'? Default: unverified, because subagents do not touch the Windows host without your grant.
- Q8 Ship rules/bazel-quality/swift.md with a bazel-quality 0.3.0 -> 0.4.0 bump, framed as secondary? Default: yes.
