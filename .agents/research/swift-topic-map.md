---
title: "Swift topic map — wave 1 consolidated and adjudicated, wave 2 commissioned, wave 3 staged"
phase: 3
model: opus
date: 2026-10-10
wave: "1 consolidated → 2 commissioned, 3 staged"
sources_surveyed: 12
candidates_deduplicated: 227
---

# Swift topic map (phase 3)

## How to read this

1. **Every row is a question**, not a subject. "Concurrency" is a wave.
   "When may a type be `@unchecked Sendable`, given that the compiler and SwiftLint are both silent on an unguarded body?" is a row.
   Each row is something a later rule answers with a named verification.

2. **Coverage is measured against the sibling lore sets, never against a fleet codebase. There is no fleet Swift code.**
   [cfg](swift-audit/config-inventory.md) inventoried every rule and skill in the catalog.
   Nothing targets Swift, with two exceptions.
   - `code-docs` already loads on `**/*.swift`, but has no Swift public-item detector (C1).
   - `docs-quality` conflicts with DocC (C7).

   So the coverage values mean:
   - `covered`: a sibling already owns the glob and the content.
   - `partial`: a sibling owns the *shape*, but none of the Swift mechanism. The shapes come from the Rust `cli-contract` and `durable-state` depth files, the Go `api-design` SDK rows (GO-API-18..20), and `bazel-quality`'s per-language depth files.
   - `uncovered`: the default, and the honest answer for almost every row.

   All evidence about practice comes from the 40-repo exemplar corpus at the SHAs in [frame](swift-frame.md) and `swift-audit/scratch/exemplar-shas.md`.

3. **Priority is judged against the consumers.**
   - **General adopters** of the catalog: packages, servers, CLIs and Apple apps.
   - **The future fleet**:
     - a **Swift SDK wrapping the `ocx` CLI**, the analogue of `ocx-sdk-python@80136dde4162` ([cfg](swift-audit/config-inventory.md) §4);
     - **Swift CLIs in the ocx/grimoire mould**: the pinned exit-code contract, atomic writes, content-addressed stores, TTY-aware output;
     - **OCI tooling in the `apple/containerization` mould**: registry clients, digest handling, archive extraction.

   A topic central to Swift in general but irrelevant to all of these drops to P2: SwiftUI view design, server-framework routing.
   The reverse also happens. `ExitCode(256)` exiting 0 (M-F-02) is invisible to most Swift writing and decisive for a fleet CLI.

4. **SURFACE legend.**
   - Language and errors: `lang` · `concurrency` · `errors`
   - Library and test code: `api` (public library surface) · `sdk` (a library that wraps a CLI) · `testing`
   - Runtime boundaries: `cli` · `io` (files, paths, processes, formats) · `net` · `security`
   - Platforms: `apple` (read-only here) · `platform` (Linux/Windows/Wasm/Android divergence)
   - Build and ship: `swiftpm` · `gate` (format, lint, warnings, CI) · `release` · `bazel-swift`
   - Other: `macros` · `perf` · `any`

5. **Exemplar-shape legend.** A repo may carry two letters; `all` binds every shape.
   - **A** = core library: swift-log, swift-argument-parser (library half), swift-async-algorithms, swift-collections, swift-nio, swift-system, swift-crypto, swift-foundation, swift-testing, swift-syntax, swift-protobuf, swift-distributed-tracing, swift-openapi-generator.
   - **B** = CLI, tool or OCI tooling: swiftly, container, containerization, swift-container-plugin, swift-format, SwiftLint, SwiftFormat, tuist, sourcekit-lsp, swift-package-manager, swift-build.
   - **C** = server or service: vapor, hummingbird, grpc-swift-2, async-http-client, swift-service-lifecycle, swift-aws-lambda-runtime.
   - **D** = community library: Alamofire, Nuke, swift-composable-architecture, swift-dependencies, swift-snapshot-testing.
   - **E** = Apple app: IceCubesApp, element-x-ios.
   - **F** = Bazel or another platform: rules_swift, swift-embedded-examples, JavaScriptKit (Wasm).

6. **Source keys.** All 12 wave-1 artifacts returned, and each was read in full.
   - Frame: [frame](swift-frame.md)
   - Audits: [cfg](swift-audit/config-inventory.md) · [conc](swift-audit/exemplar-concurrency.md) · [shape](swift-audit/exemplar-language-shape.md) · [pkg](swift-audit/exemplar-packaging-and-release.md) · [gates](swift-audit/exemplar-quality-gates.md)
   - Scouts: [canon](swift-topic-map/canonical.md) · [cod](swift-topic-map/codified.md) · [dom](swift-topic-map/domain.md) · [eco](swift-topic-map/ecosystem-tooling.md) · [fail](swift-topic-map/failure.md) · [prac](swift-topic-map/practitioner.md) · [shift](swift-topic-map/shifts.md)
   - **[map]**: a read-only measurement taken while writing this map, listed in point 9 with its command.

7. **Every P0 names a check** in its justification cell. The check is one of:
   - a compiler diagnostic or group;
   - a lint or formatter rule;
   - a grep;
   - a SwiftPM subcommand;
   - a named reading heuristic.

   A P0 that could not name one was demoted.

8. **Version-specific rows carry their version.** The toolchain and tool versions current on 2026-10-10:
   - Swift 6.4.0, released 2026-09-14 per `releases.json`; the blog post is dated 2026-09-15.
   - Swift 6.3.3, the prior line (2026-06-29).
   - swift-format 604 (bundled; `swift format --version` prints `main`).
   - SwiftLint 0.65.1 and SwiftFormat 0.63.1.
   - swift-subprocess 1.0.1 (2026-10-09), swift-log 1.16.1 and swift-service-lifecycle 2.12.1.
   - rules_swift 4.2.1.
   - `swiftlang/github-workflows` 0.0.15.

   Anything only in "Swift (next)" (6.5) is marked **not in 6.4**.

9. **Map-time measurements.** All are read-only, run over the exemplar root `~/.cache/research-lang/exemplars/swift`.
   - **M1 — config discovery names, from tool source.** Each name below is fixed by the tool's own source:

     | Name | Tool source |
     |---|---|
     | `Package.swift` | `Manifest.basename = "Package"` (`swift-package-manager@5546f44a3b52:Sources/PackageModel/Manifest/Manifest.swift:27`) |
     | `Package@swift-X[.Y[.Z]].swift` | the regex `^Package@swift-(\d+)(?:\.(\d+))?(?:\.(\d+))?.swift$` (`swift-package-manager@5546f44a3b52:Sources/PackageLoading/ToolsVersionParser.swift:654`) |
     | `Package.resolved` | `swift-package-manager@5546f44a3b52:Sources/Workspace/Workspace+Configuration.swift:221` |
     | `.swift-format` | `swift-format@b15dd59fad21:Sources/SwiftFormat/API/Configuration.swift:297` |
     | `.swiftlint.yml` | `SwiftLint@ec4691d9e813:Source/SwiftLintFramework/Configuration/Configuration.swift:14` |
     | `.swiftformat` | `SwiftFormat@fbc07aca5373:Sources/SwiftFormat.swift:39` |
     | `.swift-version` | swiftly reads it (`swiftly@c8cf2e35bfca:Sources/Swiftly/Use.swift:191,235`) |

     SwiftLint's default file name is `.swiftlint.yml` only; `.swiftlint.yaml` is not a discovery name and is in 0/40 repos ([cfg](swift-audit/config-inventory.md) §2.4).
   - **M2 — checker-root ranking.** The command is `for r in */; do … [ -e "$r/$f" ] …; done` over the eight swift-package names.
     The top scorers, each with five of the names: `apple__containerization` (Package.swift, Package.resolved, .swift-format, .swift-version, .spi.yml), `swiftlang__swiftly` and `swiftlang__swift-embedded-examples`.
     `Package@swift-*.swift` is live in `apple__swift-async-algorithms` (2) and Alamofire (4); `.swiftlint.yml` is live in tuist, SwiftLint and element-x-ios.

## Conflicts resolved

Twenty-four places where two wave-1 artifacts disagree, or where an artifact disagrees with the frame or hypotheses H1–H8.
Evidence is ranked:
1. **normative**: swift.org docs, SE proposals, the tool's own source or help;
2. **measured**: a corpus count, or a toolchain run on 6.4/6.3;
3. **codified**: a shipped linter default or rule catalogue;
4. **argued**: a named practitioner with a reason;
5. **asserted**: a claim with no source.

**1. Formatter and linter of record.** The decision has four parts.

- **Formatter of record: the toolchain's bundled swift-format,** with a shipped `.swift-format`.
- **The gate is the triple** `swift format format --in-place` → `swift format lint --strict` → `git diff --exit-code`.
- **SwiftLint is optional.** It is never the gate, and it exists only to carry `custom_rules` bans.
- **SwiftFormat is a tolerated incumbent,** never introduced and never chained with swift-format.

H4 and [eco](swift-topic-map/ecosystem-tooling.md) say "no formatter dominates". The measured numbers say otherwise.
- **Adoption.** swift-format is in 24/40 repos and SwiftFormat in 7: swift-format is 3.4× more common.
  - **All six server repos** use swift-format.
  - swift-format gates CI in 21 repos.
  - SwiftLint config is in only 4/40, and strictly gated in 1 ([gates](swift-audit/exemplar-quality-gates.md) Headline 1, 4).
- **Noise decides the config.** The config file is the product, not the tool ([cod](swift-topic-map/codified.md) Summary).
  - swift-format's defaults (2 spaces, 100 columns) give 3,381 `[Indentation]` hits on swift-log, 91.7% of its default findings; swift-log's shipped config gives 0.
  - SwiftLint defaults gave 2,300 findings on 6 repos, and **0 of 42 sampled hits were defects**; 158 of 161 `comment_spacing` hits are license banners ([gates](swift-audit/exemplar-quality-gates.md) Smell 8).
- **Chaining is destructive.** Chaining SwiftFormat after swift-format gave 2,795 findings against 0 ([eco](swift-topic-map/ecosystem-tooling.md) §10).
- **No linter sees the escape hatches.** SwiftLint 0.65.1 has no rule for `@unchecked Sendable`, `nonisolated(unsafe)`, `Task.detached`, `DispatchSemaphore` or `MainActor.run`.
  The only enforced ban in the corpus is Airbnb's `custom_rules` regex ([cod](swift-topic-map/codified.md) §12, [fail](swift-topic-map/failure.md) §2.14).

So the *linter of record* for concurrency is the compiler's diagnostic groups, plus a grep set the index carries.
SwiftLint `custom_rules` is the optional delivery vehicle for that grep set.
The wave-2 `gates/format-and-lint` dive picks the overrides; indentation and width go to owner Q2.

**2. `swift format lint` is not a gate on its own.** It exits 0 without `--strict`, even with 3,445 findings (12/12 runs).
`format` + `git diff` alone skips lint-only rules ([gates](swift-audit/exemplar-quality-gates.md) Smell 1).
**Resolved:** only the triple counts as a gate (M-M-02).

**3. Swift Testing vs XCTest, per test kind.**
H3 framed this as Apple vs community. The measured axis is **repo age**:
- core libraries are 37.9% Swift Testing, community libraries 66.8%, servers 64.5% and apps 92.4%;
- Apple's newest repos are 100% Swift Testing ([gates](swift-audit/exemplar-quality-gates.md) Axis 2, [shape](swift-audit/exemplar-language-shape.md) contradiction 2).

The 6.4 `swift package init` emits Swift Testing ([shift](swift-topic-map/shifts.md) §17), and ST-0021 (6.4) lets `XCTAssert` and `#expect` interoperate.
Interop is `limited` when the toolchain is ≥6.4 but tools <6.4, and `complete` when both are ≥6.4 ([prac](swift-topic-map/practitioner.md) Summary, [canon](swift-topic-map/canonical.md) Summary).

**Resolved, by test kind:**
- **New unit, integration, CLI end-to-end and crash tests: Swift Testing.** Crash tests use exit tests, `#expect(processExitsWith:)`, Swift ≥6.2.
- **XCTest only for XCUITest and `measure {}` performance tests,** both Apple-only, and for existing suites, which are not rewritten for their own sake.
- **Mixed trees are not a defect** (23 repos import both).

**4. Default isolation and `NonisolatedNonsendingByDefault`: libraries vs apps vs executables.**
The sources disagree in four directions.
- The approachable-concurrency vision (normative) says executables "start on the main actor" and libraries "default to `nonisolated`".
- WWDC25 268 scopes default MainActor to "your main app module and any modules that are focused on UI".
- Massicotte (argued) recommends against default MainActor everywhere.
- The 6.4 init template writes `.enableUpcomingFeature("ApproachableConcurrency")` into library *and* test targets, and sets no `defaultIsolation` ([prac](swift-topic-map/practitioner.md), [shift](swift-topic-map/shifts.md) §17, measured).

The corpus agrees with none of them fully.
- 0 published library manifests set `defaultIsolation`.
- IceCubesApp sets it in 9 of 13 app-internal packages, and element-x-ios in `compound-ios` ([conc](swift-audit/exemplar-concurrency.md) contradictions).
- `NonisolatedNonsendingByDefault` is enabled in 7/40 repos, and **broke 2 of 6** packages when it was flipped on (`swift-service-lifecycle@c55297914e26:Sources/UnixSignals/UnixSignalsSequence.swift:80`).

**Resolved, by target kind:**
- **Published libraries, the SDK, CLIs and servers:**
  - never set `defaultIsolation(MainActor.self)`;
  - must compile correctly under a *consumer's* default MainActor. `swift-protobuf@6c84c3dedac0:CompileTests/NonisolatedDeclarations/Package.swift:25` is the precedent for a compile test.
- **App targets and app-internal UI packages:** may set it, with explicit `.swiftLanguageMode(.v6)`.
- **`NonisolatedNonsendingByDefault` (or the `ApproachableConcurrency` bundle):**
  - recommended for *new* libraries and executables, since it removes the "`nonisolated async` hops off-actor" trap;
  - opt-in only with a build on both 6.3 and 6.4 in CI, because flipping it changes semantics;
  - never copied blindly from the template into an existing library.

CLIs default to no MainActor isolation (owner Q3), and wave 2 `concurrency/isolation-and-sendable` pins the text.

**5. Shared mutable state: actors vs `Mutex` vs global actors, and when `@unchecked Sendable` is acceptable.**
- **Dominance.** H2's dominance holds: 564 `@unchecked Sendable` sites in 33 repos.
- **Avoidability is overstated.** Only 12 of 25 sampled sites were avoidable, `Mutex` fit only 4, and 42% of all sites are one repo's open-class hierarchy ([conc](swift-audit/exemplar-concurrency.md) Axis 1).
- **Most hatches are not dangerous.** 82 sites visibly guard their state, and 194 have only `let` state ([shape](swift-audit/exemplar-language-shape.md) Headline).
- **Practitioners narrow the actor.** Massicotte (argued) tests an actor on three conditions and asks every actor to carry a "this is an actor because" comment ([prac](swift-topic-map/practitioner.md) §1).
- **Reviewers reject needless hatches.** SwiftPM reviewers (normative practice) reject `@unchecked` on `Mutex`-only classes, which compile as checked `Sendable` on 6.4 (measured, [fail](swift-topic-map/failure.md) §2.8).

**Resolved:**
- **`Mutex<State>` (Synchronization, 6.0) is the default for shared state inside a type.**
- **An `actor` holds service state with async operations,** and carries the reason comment.
- **`@MainActor` is for UI.**
- **A custom `@globalActor` is niche:** there are 3 in the corpus.
- **`NIOLockedValueBox` stays acceptable inside the NIO stack.**
- **`@unchecked Sendable` and `nonisolated(unsafe)` are acceptable only with both** a visible guard (a lock, an atomic, immutability, or event-loop confinement) and an in-code reason.
  This is never a ban; a ban would indict swift-nio (`swift-nio@e12881f2a691:Sources/NIOPosix/ThreadWindows.swift:26`).

**6. Typed throws: restraint vs adoption.**
SE-0413 (normative) keeps untyped `throws` "the better default" and allows typed throws in three cases:
- module-internal code;
- generic pass-through;
- constrained or Embedded code.

The corpus agrees: 879 forwarded `throws(E)` against 433 concrete, and the concrete ones sit in closed domains (crypto, `Errno`) ([shape](swift-audit/exemplar-language-shape.md) Headline).
[shift](swift-topic-map/shifts.md) notes that untyped throws allocates (`PerformanceHints::UntypedThrows`). That is a hot-path hint, not an API rule.
**Resolved:**
- **Public API throws untyped.**
- **Closure-taking APIs forward `throws(E)` generically.**
- **Concrete typed throws only for closed error domains** or Embedded targets.

**7. `Package.resolved` policy by package kind.**
H5 ("libraries ignore, executables commit") mostly holds, with exceptions both ways ([pkg](swift-audit/exemplar-packaging-and-release.md) Headline 2).
- Root lockfiles are tracked in 10 repos and gitignored in 23.
- Three libraries commit theirs (TCA, swift-dependencies, snapshot-testing), for Xcode workspaces.
- Six swiftlang tool repos ignore theirs.

Only tuist enforces its lockfile with `--force-resolved-versions`. The `originHash` mismatch triggers silent re-resolution (`Workspace+Dependencies.swift:314`, [eco](swift-topic-map/ecosystem-tooling.md) §5).
**Resolved:**
- **A repo that ships a binary, app or container image tracks `Package.resolved`,** and CI builds with `--force-resolved-versions`.
- **A library-only repo gitignores it.**
- **A library that commits it for its own workspace is not a defect.**

**8. Tools-version and language-mode floors (the H1 tension).**
The tools version is not the language mode: Alamofire declares tools 6.4 with `swiftLanguageModes: [.v5]` (`Alamofire@bda9ed57d729:Package.swift:1,52`).
- 25/40 repos are whole-package Swift 6, and 9 are Swift 5 mode, mostly swiftlang flagships ([conc](swift-audit/exemplar-concurrency.md) Axis 6).
- The modal tools version is 6.2 (16/38).
- Several fleet-relevant dependencies now *require* tools ≥6.2:
  - swift-subprocess 1.0;
  - swift-log 1.16;
  - swift-crypto 5.0;
  - service-lifecycle 2.12, which dropped 6.0.
- `unsafeFlags` blocks consumers only when the dependency's tools version is <6.2 (measured both ways, [fail](swift-topic-map/failure.md) §2.9, [pkg](swift-audit/exemplar-packaging-and-release.md) Headline 14).

**Resolved:**
- **Language mode:** every new target is in Swift 6 mode, stated explicitly.
- **A `.v5` opt-out is per-target only,** with a dated reason and a tracker (`swift-build@2187330e13e7:Package.swift:345`).
- **Libraries and the SDK** declare the lowest tools version that carries the features they use, and never below 6.2.
- **CLIs and servers** declare the current release.

The default numbers are owner Q1.

**9. Warnings-as-errors: SE-0443, SE-0480 and SE-0522.** Three control layers exist.
- `-Werror <Group>` on the command line (6.1).
- `.treatWarning` / `.treatAllWarnings` in the manifest (6.2).
- `@diagnose(Group, as:, reason:)` in source (6.4).

Measured facts:
- **12/40 repos gate on `-warnings-as-errors`** in CI, release toolchains only, with nightlies exempt (`swift-log@4038b6a4f74a:.github/workflows/pull_request.yml:22-26`).
- **1 repo sets `.treatAllWarnings(as: .error)` unconditionally** (`swift-aws-lambda-runtime@8abd464310c7:Package.swift:7`).
- **swift-testing documents why the manifest form fails:** SwiftPM suppresses dependency warnings, so the setting is useless for consumers (`swift-testing@c7d68ca20cd7:Package.swift:436-440`).
- **Blanket `-Xswiftc -warnings-as-errors` also fails on warnings inside *local path* dependencies** ([eco](swift-topic-map/ecosystem-tooling.md) §9 P4).

**Resolved, provisionally:**
- **CI-flag form on release toolchains.**
- **Manifest form only behind an environment switch.**
- **Selected groups promoted per group.**
- **`@diagnose(…, as: ignored)` only with `reason:`.**

Wave 2 `gates/warnings-and-ci` confirms which groups are promoted.

**10. StrictMemorySafety.**
- **Opt-in in every source.** SE-0458 makes it opt-in, and the memory-safety vision leaves "default?" open ([canon](swift-topic-map/canonical.md) Contested).
- **Rarely enabled.** 3/40 repos enable it: swift-collections, swift-testing and vapor ([cod](swift-topic-map/codified.md) Summary).
- **One unique benefit.** It is the only tool that flags a *use* of a `nonisolated(unsafe)` variable ([cod](swift-topic-map/codified.md) Summary).

**Resolved:** CONSIDER by default. SHOULD for packages that wrap C or parse untrusted bytes through unsafe pointers. Never a gate for ordinary code.

**11. Macros and the swift-syntax cost.**
The frame calls the cost compile time. [pkg](swift-audit/exemplar-packaging-and-release.md) shows prebuilts are on by default (`swift-package-manager@5546f44a3b52:Sources/CoreCommands/Options.swift:220-223`), so the cost is the **pin policy**.

There are five strategies across 13 repos. An `exact` prerelease pin (SwiftLint) or a `branch:` pin defeats prebuilts and breaks consumers.
Point-Free and the forum thread on macros in foundational libraries (argued) agree on two remedies:
- a wide range plus `#if canImport(SwiftSyntaxNNN)`;
- a macro-free product or trait for foundational libraries.

**Resolved:**
- **Fleet code does not author macros** unless a row demands one.
- **Consuming macro packages is fine.**
- **A macro package declares a multi-major range** with a `canImport` ladder, never `exact` or `branch`.

**12. Foundation vs FoundationEssentials.**
- **Real cost.** Size differs measurably: 10.3 MB stripped with FoundationEssentials against 55.6 MB with Foundation, static musl build ([eco](swift-topic-map/ecosystem-tooling.md) §9).
- **Uncommon.** Adoption is low: 388 files against 3,824 ([pkg](swift-audit/exemplar-packaging-and-release.md) Headline 9).
- **Not a portability split.** Foundation *is* swift-foundation on Linux since 6.0 ([prac](swift-topic-map/practitioner.md) §2).

**Resolved:**
- **Libraries import `FoundationEssentials`** under `#if canImport(FoundationEssentials)`, falling back to `Foundation`, when they need no internationalization or networking.
- **CLIs may import `Foundation`.**
- **Any `URLSession` use carries the `canImport(FoundationNetworking)` guard.** Omitting it is a measured Linux compile error.

**13. One `swift-quality` rule with depth files vs several rules.**
The house rule says a second rule exists only for a genuinely different glob ([cfg](swift-audit/config-inventory.md) Patterns 1).
- Concurrency, errors, CLI and IO all bind `**/*.swift`.
- Manifests and tool configs have their own required names.

**Resolved:** two rules.
- **`swift-quality`** on `**/*.swift`, with ten task-routed depth files.
- **`swift-package`** on the manifest and tool-config names, with two depth files.

There is no separate concurrency rule (same glob), and no separate Apple rule (same glob; read-only depth).

**14. Glob membership.** Apply "Narrow the Glob Only When It Cannot Miss" with the counts from [cfg](swift-audit/config-inventory.md) §2.4 and [map] M1.
- **Joins `swift-package`, because the tool requires the name:**
  - `Package.swift`: 39/677.
  - `Package@swift-*.swift`: 8/15, and missed by `**/Package.swift`, so it needs its own entry.
  - `Package.resolved`: 17/97.
  - `.swift-format`: 24.
  - `.swiftformat`: 7/19.
  - `.swiftlint.yml`: 4/26.
  - `.swift-version`: 6/10.
- **`.spi.yml` (31/40) joins too.** It is required by name by Swift Package Index, and it drives the soundness docs gate. Without it the gate is vacuous.
- **Excluded, and routed by task instead:**
  - CI workflows (39/287): never globbed (house convention, [cfg](swift-audit/config-inventory.md) C2).
  - `Dockerfile` (11/40).
  - `*.pbxproj` (13/30), `*.xcconfig` (3/22), `project.yml` and `Project.swift`/`Tuist.swift`: Apple-only, and `Project.swift` already matches `**/*.swift`.
  - `*.docc` catalogs (29/70): `code-docs` and `docs-quality` own docs.
  - `.sourcekit-lsp/config.json`: an explicitly unstable format.
  - `MODULE.bazel` and `BUILD.bazel`: `bazel-quality` owns them.
  - `Podfile` and `Cartfile`: 0/40.
  - `.swiftlint.yaml`: not a SwiftLint discovery name, 0/40.

**15. Era rows the shifts scout overturned.** Each correction below is measured or normative, and the stale form must not appear in a rule.
- **Android SDK was not dropped in 6.4.0.** `releases.json` lists it (NDK r30).
- **`FilePath` is not in the 6.4 stdlib.** The WWDC26 claim is contradicted: SE-0529 is accepted, and a 6.4 build fails with `cannot find 'FilePath' in scope`.
- **`CommandLine.executablePath` (SE-0513) and `withDeadline` (SE-0526) are not in 6.4.**
- **`defaultSwiftSettings:` (SE-0540) is not in 6.4.** It fails with "extra argument 'defaultSwiftSettings' in call".
- **The attribute is `@diagnose`, not `@warn`.**
- **Swift Build is the 6.4 default build system.** `native` and `xcode` are "(deprecated)".
- **The 6.4 init template sets `ApproachableConcurrency` on all targets and no `swiftLanguageModes`.** The 6.3 template wrote `[.v6]` and no features. Wals's and AvdLee's "no Approachable Concurrency in packages" is stale.
- **`unsafeFlags` blocks consumers only below tools 6.2.**
- **`nonisolated async` runs on the caller's actor under `NonisolatedNonsendingByDefault`.**
- **The upcoming-feature list is identical in 6.3 and 6.4.** Six features are `LanguageMode::future`, not part of Swift 6 mode.
- **Embedded is shipped as release SDKs,** although its user docs still say "public releases do not support" it ([canon](swift-topic-map/canonical.md) Contested).
- **`@specialize` vs `@specialized` is unresolved.** Compile before writing.

Sources: [shift](swift-topic-map/shifts.md) Summary, §17 and Contested; [prac](swift-topic-map/practitioner.md) §10; [eco](swift-topic-map/ecosystem-tooling.md) Summary.

**16. `--static-swift-stdlib` vs the static Linux SDK.**
- **[eco](swift-topic-map/ecosystem-tooling.md):** it fails under Swift Build with undefined `swift_unum*`, and links with `--build-system native`.
- **[pkg](swift-audit/exemplar-packaging-and-release.md) E8:** undefined `_MutexHandle`, and the static SDK links (E7).
- **[fail](swift-topic-map/failure.md):** missing `_FoundationICU` archives, tracked as swift-build#1764.
- **[canon](swift-topic-map/canonical.md):** "SDK for fully static, `--static-swift-stdlib` for Docker/glibc".

All four agree on the mechanism.

**Resolved, measured on 6.4.0:**
- **Release Linux binaries use the static Linux SDK** (`--swift-sdk x86_64-swift-linux-musl`).
- **`--static-swift-stdlib` is tolerated only with `--build-system native`,** a comment linking the issue, and a removal condition.

**17. swift-subprocess vs `Foundation.Process`, and the pin.**
- **swiftly pins `exact: "1.0.0"`,** which leaks an fd per early-break `.sequence`; 1.0.1 fixed it on 2026-10-09 ([dom](swift-topic-map/domain.md) #4).
- **`Process` hangs on large output** when read after `waitUntilExit` (measured at 256 MiB).

**Resolved:**
- **New code uses swift-subprocess `from: "1.0.1"`,** which implies tools ≥6.2.
- **`Process` survives only in existing code,** and follows the read-both-pipes-first rule.

**18. URLSession vs AsyncHTTPClient.**
On Linux, `URLSession` forwards `Authorization` to a cross-origin redirect target (measured).
AHC strips it (`async-http-client@017115279d09:Sources/AsyncHTTPClient/RedirectState.swift:139-143`, [dom](swift-topic-map/domain.md) #17).
**Resolved:** AHC for anything that carries credentials or large streamed bodies. `URLSession` only with a redirect delegate that drops credentials.

**19. GCD in new code.** The sources disagree.
- "Never use old-style GCD": Hudson AGENTS.md, asserted.
- "GCD is still here and you should not be afraid to use it" for blocking work: Massicotte 2026-05, argued.
- The exemplars use GCD mostly as API-compat surface ([conc](swift-audit/exemplar-concurrency.md) contradictions).

**Resolved:**
- **No new `DispatchQueue` for state protection or main-thread hops:** use `Mutex` or isolation instead.
- **No `DispatchSemaphore.wait()` inside async code.**
- **A dedicated queue wrapped in a continuation stays acceptable** for long blocking C calls.

**20. Exit code for usage errors and for signal-killed children.**
- **Usage errors.** ArgumentParser uses 64 on Unix, `ERROR_BAD_ARGUMENTS` (160) on Windows and 1 on WASI (`swift-argument-parser@efd239f0055b:Sources/ArgumentParser/Utilities/Platform.swift:155-163`).
  The fleet contract and `ocx-sdk-python` also use 64.
- **Signal-killed children.** `ocx-sdk-python` keeps them raw; Go GO-API-19 maps them to 128+n; swiftly maps `.signaled` to 1 ([cfg](swift-audit/config-inventory.md) C5, Smell 8).

**Resolved:**
- **Keep 64**, and document the Windows divergence.
- **The Swift SDK maps `.signaled(n)` to 128+n,** like Go (owner Q6).

**21. Counting discipline for escape hatches and tests.** The scouts' raw numbers differ by up to 5×:
- `@unchecked Sendable`: 564 non-test production sites ([conc](swift-audit/exemplar-concurrency.md)), 552 ([shape](swift-audit/exemplar-language-shape.md)), 862–867 over `Sources/` including generated code ([fail](swift-topic-map/failure.md), [cod](swift-topic-map/codified.md)), and 1,131 over all files including fixtures ([shift](swift-topic-map/shifts.md)).
- `nonisolated(unsafe)`: 191 against 2,492, of which 2,006 are generated code in one app.

**Resolved:** rules cite the audit numbers, which exclude tests, fixtures, examples and generated code. Scout totals give direction only.
The test share has the same pattern: 48.6% by test function ([gates](swift-audit/exemplar-quality-gates.md)) against 45% by case ([shape](swift-audit/exemplar-language-shape.md)).

**22. Windows prevalence (H6).**
- The scouts count 19/40 ([gates](swift-audit/exemplar-quality-gates.md)), 20/40 ([eco](swift-topic-map/ecosystem-tooling.md)) and 13/39 ([shape](swift-audit/exemplar-language-shape.md), named legs only, without following reusable workflows).
- Wasm (15), static SDK (13–14) and Android (11) legs are as common as Windows.

**Resolved:**
- **Windows is not rare.** About half the corpus tests it.
- **Rules treat it as first-class:**
  - the exit-code divergence;
  - rename semantics;
  - no `UnixSignals`;
  - `FilePath` "Unstable".
- **Local verification depends on owner Q7.**

**23. Where the DocC gate lives.**
- [cfg](swift-audit/config-inventory.md) shows that `docs-quality`'s declaration example, placed above the `#` title, breaks `docc convert --warnings-as-errors` (exit 1). 20/20 ArgumentParser DocC pages fail `DOC-TYPE-01`.
- `code-docs` loads on Swift but lacks a `_public` detector and DocC `- Parameter/Returns/Throws` handling. Under it, 1,168 of 3,486 over-cap blocks would pass.

**Resolved:**
- **The *gate* (`generate-documentation --analyze --warnings-as-errors`, with `.spi.yml`) is SW-GATE.**
- **Doc-comment content stays with `code-docs`.**
- **The two sibling defects are reported to those sets,** not patched here (Deferred, "covered by a sibling").

**24. H7's `MainActor.run` premise.**
- **Rare in the corpus.** The exemplars use `MainActor.run` 23 times, against 614 `@MainActor` annotations and 76 `DispatchQueue.main.async` ([conc](swift-audit/exemplar-concurrency.md) contradictions).
- **An agent habit.** The fixture shows nobody catches it ([cod](swift-topic-map/codified.md) §12).

**Resolved:** the rule targets annotation placement (isolate the function or type), with a grep for `MainActor.run` as a tell, not a ban.

## The map

227 rows, sorted into lettered sections. Each section feeds one future depth file: section A becomes `swift-quality/language.md`, and so on. Section K becomes the `swift-quality` index and section L the `swift-package` index. Section O becomes `rules/bazel-quality/swift.md`, and section P becomes the skills.

IDs are stable; a later wave appends rows and never renumbers. "Coverage" defaults to `uncovered`. `partial (sibling)` names the sibling whose *shape* transfers.

### A. Language idioms → `swift-quality/language.md` (SW-LANG)

| ID | Question | Surface | Shapes | Coverage · source | Priority | Family |
|---|---|---|---|---|---|---|
| M-A-01 | Which pre-Swift-6 idioms mark stale or agent-written code: `ObservableObject` in new non-UI code, `DispatchQueue.main.async`, completion handlers beside async APIs, `NSLock` over `Mutex`? Which grep catches each? | lang | all | uncovered · [fail](swift-topic-map/failure.md) §2.14, [prac](swift-topic-map/practitioner.md) §6, [shift](swift-topic-map/shifts.md) "Use X not Y" | P0: the most frequent agent failure; check: K-07 grep set plus `swift build` diagnostics | SW-LANG |
| M-A-02 | When should code use `some P`, `any P` or a generic parameter, and when is an existential in a public signature a performance or ABI defect? | lang | A,D | uncovered · [shape](swift-audit/exemplar-language-shape.md) Axis 3 | P1: common API choice | SW-LANG |
| M-A-03 | Which `String` view is correct for byte, scalar and grapheme comparisons, and where do grapheme semantics change a protocol result? `"e\u{301}x".hasPrefix("e")` is false. | lang | B,C | uncovered · [fail](swift-topic-map/failure.md) §2.12 | P0: digest and reference parsing; check: planted test plus grep `hasPrefix\|split(separator:` in parsers | SW-LANG |
| M-A-04 | Where does `Dictionary`/`Set` iteration order (seeded per process) leak into output or tests, and what is the deterministic replacement? | lang | all | uncovered · [fail](swift-topic-map/failure.md) §2.11 | P0: nondeterministic CLI JSON; check: run twice, `diff` the output | SW-LANG |
| M-A-05 | When should code use `ContinuousClock`, `SuspendingClock` or `Date` for timeouts, durations and timestamps? | lang | B,C | uncovered · [dom](swift-topic-map/domain.md) §15 | P1 | SW-LANG |
| M-A-06 | When are `Span`, `InlineArray`, `~Copyable` and `borrowing`/`consuming` warranted, and when is using them agent over-application? | lang,perf | A | uncovered · [shift](swift-topic-map/shifts.md), [prac](swift-topic-map/practitioner.md) | P2: rare in fleet code | SW-LANG |
| M-A-07 | Which 6.2–6.4 syntax silently raises the real floor above the declared tools version: `weak let` (6.3), `~Sendable` (6.4), `@diagnose` (6.4), raw identifiers? | lang,swiftpm | A,D | uncovered · [shift](swift-topic-map/shifts.md) 6.3/6.4 tables | P1: breaks older consumers | SW-LANG |
| M-A-08 | When are `@specialize`/`@specialized` and `@inlinable`/`@usableFromInline` justified? | perf | A | uncovered · [shift](swift-topic-map/shifts.md) Contested | P3 | SW-LANG |
| M-A-09 | Which expression shapes trigger "unable to type-check this expression in reasonable time", and what is the fix pattern? | lang | all | uncovered · [fail](swift-topic-map/failure.md) §2.10 (reproduced on 6.3 and 6.4) | P2 | SW-LANG |
| M-A-10 | struct vs class, copy-on-write and value semantics for models? | lang | all | uncovered · [canon](swift-topic-map/canonical.md) | P3: well known | SW-LANG |
| M-A-11 | When must a class be `final` (checked `Sendable` requires it), and when is `open` justified? | lang,api | A,D | uncovered · [conc](swift-audit/exemplar-concurrency.md) Axis 1 (42% of hatches sit in one open-class hierarchy) | P2 | SW-LANG |
| M-A-12 | When is `[weak self]` required and when is it cargo cult, and what does a `Task {}` closure capture and retain? | lang,concurrency | all | uncovered · [fail](swift-topic-map/failure.md), [prac](swift-topic-map/practitioner.md) | P1 | SW-LANG |
| M-A-13 | File size, type splitting and extension organisation? | lang | all | uncovered · [shape](swift-audit/exemplar-language-shape.md) | P3 | SW-LANG |
| M-A-14 | Combine is absent on Linux and Observation behaves differently off the UI. Which non-UI code breaks the Linux build? | lang,platform | B,C,D | uncovered · [dom](swift-topic-map/domain.md), [eco](swift-topic-map/ecosystem-tooling.md) | P1: Linux compile failure | SW-LANG |
| M-A-15 | Consumer-side macro use (`@Observable`, `#Preview`, third-party macros) in library code? | macros | D,E | uncovered · [pkg](swift-audit/exemplar-packaging-and-release.md) | P3 | SW-LANG |

### B. Concurrency → `swift-quality/concurrency.md` (SW-CONC)

| ID | Question | Surface | Shapes | Coverage · source | Priority | Family |
|---|---|---|---|---|---|---|
| M-B-01 | When is `@unchecked Sendable` acceptable, and which visible guard and in-code reason must accompany it? | concurrency | all | uncovered · [conc](swift-audit/exemplar-concurrency.md) Axis 1 (564/33 repos), [shape](swift-audit/exemplar-language-shape.md) (82 guarded, 194 let-only), [fail](swift-topic-map/failure.md) §2.8 (compiler and lint silent) | P0: dominant hatch, silent; check: grep `@unchecked Sendable` and read the body for a lock, atomic or `let`, plus a reason comment | SW-CONC |
| M-B-02 | When is `nonisolated(unsafe)` acceptable: `let` vs `var`, generated statics, test globals? | concurrency | all | uncovered · [conc](swift-audit/exemplar-concurrency.md) Axis 2 (191), [cod](swift-topic-map/codified.md) Summary | P0: check: grep `nonisolated(unsafe) var`; StrictMemorySafety flags each use | SW-CONC |
| M-B-03 | What is the fix ladder for a Sendable or isolation diagnostic: isolate, `sending`, value type, `Mutex`, actor, `@preconcurrency`, and only then a hatch? | concurrency | all | uncovered · [fail](swift-topic-map/failure.md) §2.1, [prac](swift-topic-map/practitioner.md) §1 | P0: agents jump straight to the hatch; check: reading heuristic "hatch added in diff while a lower rung applies" plus `git diff` grep | SW-CONC |
| M-B-04 | Shared state: `Mutex<State>` vs actor vs `@globalActor` vs `NIOLockedValueBox`? | concurrency | all | uncovered · [conc](swift-audit/exemplar-concurrency.md) Axis 3, [prac](swift-topic-map/practitioner.md) §1 | P0: check: grep `actor ` without a "this is an actor because" comment; grep `NSLock\|os_unfair_lock` outside the NIO stack | SW-CONC |
| M-B-05 | Does a `final class` whose only stored state is `let m: Mutex<…>` compile as checked `Sendable` on both 6.3 and 6.4? | concurrency | all | uncovered · [fail](swift-topic-map/failure.md) §2.8 (6.4 measured; SwiftPM#10425) | P1 | SW-CONC |
| M-B-06 | What must never happen under a lock: `await`, calls out to user code, continuation resume, logging? | concurrency | all | uncovered · [fail](swift-topic-map/failure.md) §2.8 (SwiftPM#10405, #10403) | P1 | SW-CONC |
| M-B-07 | In which target kinds is `defaultIsolation(MainActor.self)` allowed? | concurrency,swiftpm | all | uncovered · conflict 4, [conc](swift-audit/exemplar-concurrency.md) contradictions | P0: check: grep `defaultIsolation` in manifests whose products are libraries | SW-CONC |
| M-B-08 | How does a library prove it compiles under a consumer's default MainActor and NNbD? | concurrency,testing | A,D | uncovered · `swift-protobuf@6c84c3dedac0:CompileTests/NonisolatedDeclarations/Package.swift:25` | P1 | SW-CONC |
| M-B-09 | `nonisolated(nonsending)` vs `@concurrent`: which goes where, and what changes silently when `NonisolatedNonsendingByDefault` flips? | concurrency | all | uncovered · [shift](swift-topic-map/shifts.md), [conc](swift-audit/exemplar-concurrency.md) Axis 6, `swift-service-lifecycle@c55297914e26:Sources/UnixSignals/UnixSignalsSequence.swift:80` | P0: semantics change without a diagnostic; check: build the fixture with and without the feature, plus a runtime isolation assert | SW-CONC |
| M-B-10 | When must an async API that takes a closure accept `isolation: isolated (any Actor)? = #isolation`? | concurrency,api | A | uncovered · [conc](swift-audit/exemplar-concurrency.md) | P2 | SW-CONC |
| M-B-11 | When is an unstructured `Task {}` acceptable, who owns and cancels it, and what do `unhandled_throwing_task` and the 6.4 `NoUseUnstructuredThrowingTask` catch? | concurrency | all | uncovered · [fail](swift-topic-map/failure.md) §2.14, [eco](swift-topic-map/ecosystem-tooling.md) | P0: check: SwiftLint `unhandled_throwing_task` plus grep `Task {` with no stored handle | SW-CONC |
| M-B-12 | Is `Task.detached` ever right in fleet code? | concurrency | all | uncovered · [fail](swift-topic-map/failure.md) lint table (not caught) | P1 | SW-CONC |
| M-B-13 | When is `Task.immediate` (SE-0472) right? | concurrency | E | uncovered · [shift](swift-topic-map/shifts.md) | P3 | SW-CONC |
| M-B-14 | Where must `checkCancellation`/`withTaskCancellationHandler` appear, and which blocking calls ignore cancellation? | concurrency | B,C | uncovered · [dom](swift-topic-map/domain.md) §15, `containerization@3e7bc39e66b3:Sources/ContainerizationExtras/Timeout.swift` | P1 | SW-CONC |
| M-B-15 | `defer` cannot `await`. How is cleanup guaranteed after cancellation: an explicit close, a shielded scope, or `run`/`shutdown` pairs? | concurrency | B,C | uncovered · [dom](swift-topic-map/domain.md), [shift](swift-topic-map/shifts.md) | P1 | SW-CONC |
| M-B-16 | Continuations: exactly-once resume, checked vs unsafe. A leak hangs (exit 124) and a double resume is fatal. | concurrency | all | uncovered · [fail](swift-topic-map/failure.md) §2.5 | P1 | SW-CONC |
| M-B-17 | `withDeadline` (SE-0526) is not in 6.4. What is the correct task-group timeout race, and what does it fail to stop? | concurrency | B,C | uncovered · [dom](swift-topic-map/domain.md) §15, `containerization@3e7bc39e66b3:Sources/ContainerizationExtras/Timeout.swift` | P1 | SW-CONC |
| M-B-18 | `AsyncStream` buffering policy, backpressure and the unbounded default? | concurrency | B,C | uncovered · [dom](swift-topic-map/domain.md), [fail](swift-topic-map/failure.md) | P1 | SW-CONC |
| M-B-19 | Actor reentrancy: which invariants must be re-checked after each `await`? | concurrency | all | uncovered · [prac](swift-topic-map/practitioner.md), [fail](swift-topic-map/failure.md) | P1 | SW-CONC |
| M-B-20 | GCD in async code: `DispatchSemaphore.wait`, `MainActor.run`, `DispatchQueue.main.async`, `Thread.sleep`? | concurrency | all | uncovered · conflicts 19 and 24, [fail](swift-topic-map/failure.md) lint table | P0: check: grep `DispatchSemaphore\|MainActor.run\|DispatchQueue.main\|Thread.sleep` (SwiftLint misses all four) | SW-CONC |
| M-B-21 | Bridging completion-handler APIs: continuation wrappers vs the async overloads that already exist? | concurrency | D,E | uncovered · [conc](swift-audit/exemplar-concurrency.md) | P2 | SW-CONC |
| M-B-22 | When is `@preconcurrency import` acceptable (libc shims) and when does it hide a real race? | concurrency | all | uncovered · [conc](swift-audit/exemplar-concurrency.md) (347 libc shims) | P1 | SW-CONC |
| M-B-23 | Runtime isolation traps (exit 132, `_dispatch_assert_queue_fail`) at Swift 5/6 and ObjC callback boundaries? | concurrency | B,E | uncovered · [fail](swift-topic-map/failure.md) §2.3 | P1 | SW-CONC |
| M-B-24 | `sending` parameters and region isolation: when does `sending` replace a `Sendable` requirement? | concurrency | A | uncovered · [canon](swift-topic-map/canonical.md) (SE-0430, SE-0414) | P1 | SW-CONC |
| M-B-25 | Isolated conformances (SE-0470) for MainActor types adopting non-isolated protocols? | concurrency | E | uncovered · [shift](swift-topic-map/shifts.md) | P2 | SW-CONC |
| M-B-26 | Isolated `deinit` vs an explicit async `close()`/`shutdown()` for resources such as HTTPClient and file handles? | concurrency | B,C | uncovered · [dom](swift-topic-map/domain.md), [conc](swift-audit/exemplar-concurrency.md) | P1 | SW-CONC |
| M-B-27 | Task-group throttling, `withDiscardingTaskGroup` for servers, and unbounded child spawning? | concurrency | B,C | uncovered · [conc](swift-audit/exemplar-concurrency.md) | P2 | SW-CONC |
| M-B-28 | `~Sendable` (6.4) and `weak let` (6.3): when do they replace an `@unchecked`? | concurrency | A,D | uncovered · [shift](swift-topic-map/shifts.md) | P2 | SW-CONC |
| M-B-29 | When must long synchronous CPU or blocking IO move off the cooperative pool, and to what (dedicated thread, NIOThreadPool, wrapped queue)? | concurrency | B,C | uncovered · [prac](swift-topic-map/practitioner.md) (Massicotte on GCD), `swift-nio@e12881f2a691:Sources/NIOPosix/StructuredConcurrencyHelpers.swift:34` | P2 | SW-CONC |

### C. Errors → `swift-quality/errors.md` (SW-ERR)

| ID | Question | Surface | Shapes | Coverage · source | Priority | Family |
|---|---|---|---|---|---|---|
| M-C-01 | Typed throws: untyped in public API, generic forwarding, concrete only for closed domains? | errors | all | uncovered · conflict 6, [shape](swift-audit/exemplar-language-shape.md) (879 forwarded / 433 concrete) | P1 | SW-ERR |
| M-C-02 | Error shape: enum vs struct with code and context, and how is the underlying cause chained? | errors | all | uncovered · [shape](swift-audit/exemplar-language-shape.md) Axis 4 | P1 | SW-ERR |
| M-C-03 | User-facing error text: `LocalizedError` vs `CustomStringConvertible`, and what ArgumentParser prints? | errors,cli | B | uncovered · [dom](swift-topic-map/domain.md) | P1 | SW-ERR |
| M-C-04 | When does `try?` or an empty `catch` swallow a defect, for example on writes, removes and decoding? | errors | all | uncovered · [fail](swift-topic-map/failure.md) | P0: check: grep `try? .*\(write\|remove\|move\|decode\)` and `catch \{ *\}` | SW-ERR |
| M-C-05 | Force unwrap, `try!`, `as!` and IUOs in non-test code? | errors | all | uncovered · [fail](swift-topic-map/failure.md) lint table | P0: check: SwiftLint `force_cast`/`force_try`, the opt-in `force_unwrapping`, or swift-format `NeverForceUnwrap` | SW-ERR |
| M-C-06 | `fatalError`/`precondition` vs `throw`: which conditions may crash (codes 132/134), and which must be recoverable? | errors | all | uncovered · [fail](swift-topic-map/failure.md) §2.13 | P1 | SW-ERR |
| M-C-07 | Does `Result` still have a role in the async era? | errors | D | uncovered · [canon](swift-topic-map/canonical.md) | P3 | SW-ERR |
| M-C-08 | `rethrows` vs `throws(E)` forwarding, and how do errors propagate from `async let` and task groups? | errors | A | uncovered · [canon](swift-topic-map/canonical.md) | P2 | SW-ERR |
| M-C-09 | Log-and-rethrow duplication: which layer logs an error? | errors | B,C | uncovered · [dom](swift-topic-map/domain.md) §16 | P2 | SW-ERR |

### D. API and SDK shape → `swift-quality/api-design.md` (SW-API)

| ID | Question | Surface | Shapes | Coverage · source | Priority | Family |
|---|---|---|---|---|---|---|
| M-D-01 | Access control and import visibility: `InternalImportsByDefault`, `public import`, `package` access? | api | A,D | uncovered · [shape](swift-audit/exemplar-language-shape.md), [prac](swift-topic-map/practitioner.md) (Vapor 5) | P1 | SW-API |
| M-D-02 | Must public types declare `Sendable` explicitly? Only non-public types get it inferred. | api,concurrency | A,D | uncovered · [conc](swift-audit/exemplar-concurrency.md) | P1 | SW-API |
| M-D-03 | When does library evolution (`-enable-library-evolution`, `@frozen`) apply to a SwiftPM library? | api | A | uncovered · `swift-package-manager@5546f44a3b52:Fixtures/Miscellaneous/LibraryEvolution/Package.swift:9` | P2 | SW-API |
| M-D-04 | Public enum evolution: adding a case is source-breaking. What is the extensible-enum story in 6.4, and how should error enums evolve? | api,errors | A,D | uncovered · [shift](swift-topic-map/shifts.md) | P1 | SW-API |
| M-D-05 | Single-conformer protocols and dependency-injection patterns: when is a protocol speculative? | api | all | uncovered · [shape](swift-audit/exemplar-language-shape.md) | P2 | SW-API |
| M-D-06 | Library logging: take a `Logger` parameter, never bootstrap `LoggingSystem`. swift-log 1.16.1 crashes on a second bootstrap. | api | A,D | uncovered · [dom](swift-topic-map/domain.md) §16 | P1 | SW-API |
| M-D-07 | API design guideline naming? | api | all | uncovered · [canon](swift-topic-map/canonical.md) | P3: well known | SW-API |
| M-D-08 | Deprecation: `@available(*, deprecated, renamed:)` and its timeline? | api | A,D | uncovered · [canon](swift-topic-map/canonical.md) | P2 | SW-API |
| M-D-09 | SDK wrapping the `ocx` CLI: binary discovery, argument building, environment, JSON parsing. Does it mirror `ocx-sdk-python`? | sdk | B | partial (Go GO-API-18..20) · [cfg](swift-audit/config-inventory.md) §4 (`ocx-sdk-python@80136dde4162`) | P0: the fleet's named consumer; check: SDK tests against a fake-CLI fixture; grep `Process(` in the SDK | SW-API |
| M-D-10 | SDK exit-code and signal mapping: `TerminationStatus.exited(n)` passed through, `.signaled(n)` mapped to 128+n; Windows has no `.signaled`. | sdk | B | partial (Go GO-API-19) · conflict 20, [cfg](swift-audit/config-inventory.md) C5, [dom](swift-topic-map/domain.md) §18 | P0: check: unit test over every `TerminationStatus` case | SW-API |
| M-D-11 | SDK JSON envelope: decoding, tolerating unknown fields, version checks? | sdk | B | partial (Go GO-API-20) · [cfg](swift-audit/config-inventory.md) §4 | P1 | SW-API |
| M-D-12 | SDK dependency budget (stdlib plus swift-subprocess) and its coverage target? | sdk | B | uncovered · [cfg](swift-audit/config-inventory.md) §4 | P1 | SW-API |
| M-D-13 | Retroactive conformances (`@retroactive`)? | api | A | uncovered · [canon](swift-topic-map/canonical.md) | P3 | SW-API |
| M-D-14 | Module and target split for a library? | api | A,D | uncovered · [pkg](swift-audit/exemplar-packaging-and-release.md) | P3 | SW-API |

### E. Testing → `swift-quality/testing.md` (SW-TEST)

| ID | Question | Surface | Shapes | Coverage · source | Priority | Family |
|---|---|---|---|---|---|---|
| M-E-01 | Swift Testing vs XCTest, per test kind? | testing | all | uncovered · conflict 3, [gates](swift-audit/exemplar-quality-gates.md) Axis 2 | P0: check: grep `import XCTest` in test files a diff adds | SW-TEST |
| M-E-02 | XCTest/Swift Testing interop mode (`limited`/`complete`) by toolchain and tools version? | testing | all | uncovered · [prac](swift-topic-map/practitioner.md), [canon](swift-topic-map/canonical.md) (ST-0021) | P1 | SW-TEST |
| M-E-03 | Swift Testing runs tests in parallel in one process. How is shared global state isolated, and when is `.serialized` correct? | testing | all | uncovered · [fail](swift-topic-map/failure.md) | P1 | SW-TEST |
| M-E-04 | No `Task.sleep` or fixed sleeps for synchronisation. What replaces them: `confirmation()`, injected clocks, async streams? | testing | all | uncovered · [prac](swift-topic-map/practitioner.md) (raska.io: agents write `Task.sleep`) | P0: check: grep `Task.sleep\|usleep\|sleep(` under `Tests/` | SW-TEST |
| M-E-05 | Exit tests (Swift 6.2+) for crash and precondition paths? | testing | B | uncovered · [dom](swift-topic-map/domain.md) (5 platforms) | P1 | SW-TEST |
| M-E-06 | CLI end-to-end tests: run the built executable and assert stdout, stderr and exit code? | testing,cli | B | partial (Rust cli-contract) · `swift-argument-parser@efd239f0055b:Sources/ArgumentParserTestHelpers/TestHelpers.swift:401-428` | P1 | SW-TEST |
| M-E-07 | When should tests be parameterized with `@Test(arguments:)`, and what are the pitfalls of the arguments? | testing | all | uncovered · [canon](swift-topic-map/canonical.md) | P2 | SW-TEST |
| M-E-08 | Porting `setUp`/`tearDown` to `init`/`deinit` and test-scoping traits? | testing | all | uncovered · [canon](swift-topic-map/canonical.md) | P2 | SW-TEST |
| M-E-09 | `#require` vs `#expect` vs `XCTUnwrap`? | testing | all | uncovered · [canon](swift-topic-map/canonical.md) | P2 | SW-TEST |
| M-E-10 | Flaky-test triage: repetition, turning off parallelism, ordering? | testing | all | uncovered · [fail](swift-topic-map/failure.md) | P2 | SW-TEST |
| M-E-11 | Coverage on Linux: `--enable-code-coverage`, `llvm-cov export`, exclusions? | testing | all | uncovered · [gates](swift-audit/exemplar-quality-gates.md) | P1 | SW-TEST |
| M-E-12 | Sanitizers on Linux (`--sanitize=thread\|address`): which suites run them? | testing | all | uncovered · [fail](swift-topic-map/failure.md), [gates](swift-audit/exemplar-quality-gates.md) | P1 | SW-TEST |
| M-E-13 | Platform skips: `.enabled(if:)` vs `#if os` vs runtime checks? | testing,platform | all | uncovered · [shape](swift-audit/exemplar-language-shape.md) | P2 | SW-TEST |
| M-E-14 | Snapshot testing? | testing | D,E | uncovered · [shape](swift-audit/exemplar-language-shape.md) | P3 | SW-TEST |
| M-E-15 | Mocking strategy? | testing | all | uncovered | P3 | SW-TEST |
| M-E-16 | Test target layout and `@testable import`? | testing | all | uncovered | P3 | SW-TEST |

### F. CLI contract → `swift-quality/cli-contract.md` (SW-CLI)

| ID | Question | Surface | Shapes | Coverage · source | Priority | Family |
|---|---|---|---|---|---|---|
| M-F-01 | Entry point: `@main AsyncParsableCommand` vs top-level code. Does a top-level `await main()` exit 1? | cli | B | partial (Rust cli-contract) · [dom](swift-topic-map/domain.md) | P0: check: planted fixture's exit code; grep `main.swift` | SW-CLI |
| M-F-02 | Exit codes: `ExitCode(256)` exits 0 (mod 256), usage errors are 64, and Windows uses 160. | cli | B | partial (Rust cli-contract) · conflict 20, `swift-argument-parser@efd239f0055b:Sources/ArgumentParser/Utilities/Platform.swift:155-163` | P0: check: fixture exit-code test; grep `ExitCode(` with values above 255 | SW-CLI |
| M-F-03 | `exit()` and `fatalError` in command code skip `defer` and flushing. When are they allowed? | cli | B | uncovered · [fail](swift-topic-map/failure.md) | P1 | SW-CLI |
| M-F-04 | SIGPIPE: piped into `head`, the CLI dies with 141. Ignore it, or handle EPIPE? | cli | B | partial (Rust cli-contract) · [fail](swift-topic-map/failure.md) §2.13 | P0: check: `cli \| head -1; echo ${PIPESTATUS[0]}` | SW-CLI |
| M-F-05 | stdout buffering: `print` to `/dev/full` loses output and exits 0, and output piped before a trap is lost. | cli | B | uncovered · [fail](swift-topic-map/failure.md) §2.13 | P0: check: `cli >/dev/full; echo $?` must be non-zero | SW-CLI |
| M-F-06 | Stream contract: data on stdout, diagnostics on stderr, a JSON mode? | cli | B | partial (Rust cli-contract) · [dom](swift-topic-map/domain.md) | P1 | SW-CLI |
| M-F-07 | SIGINT/SIGTERM handling: `UnixSignals`, `DispatchSource` or `AsyncSignalHandler`? | cli | B,C | uncovered · `containerization@3e7bc39e66b3:Sources/ContainerizationOS/AsyncSignalHandler.swift` | P1 | SW-CLI |
| M-F-08 | TTY detection and `NO_COLOR` (no exemplar reads it)? | cli | B | partial (Rust cli-contract) · `container@f70ecbb926d9:Sources/ContainerCommands/Application.swift:104-111`, [dom](swift-topic-map/domain.md) | P2 | SW-CLI |
| M-F-09 | Log bootstrap: exactly once, in the executable only, with the level from flags and environment? | cli | B,C | uncovered · `container@f70ecbb926d9:Sources/ContainerCommands/Application.swift:30` | P1 | SW-CLI |
| M-F-10 | Configuration precedence (flag > env > file) and XDG locations? | cli | B | partial (Rust cli-contract) · [dom](swift-topic-map/domain.md) | P1 | SW-CLI |
| M-F-11 | Crash codes (132/134/139) must stay outside the documented contract. Which codes are reserved? | cli | B | uncovered · [fail](swift-topic-map/failure.md) §2.13 | P1 | SW-CLI |
| M-F-12 | Shell completions? | cli | B | uncovered | P3 | SW-CLI |
| M-F-13 | Two-stage Ctrl-C: graceful first, then forced? | cli | B | uncovered · [dom](swift-topic-map/domain.md) | P2 | SW-CLI |
| M-F-14 | `ServiceGroup`'s `gracefulShutdownSignals` defaults to `[]`, and `UnixSignals` is compiled out on Windows. | cli | C | uncovered · [dom](swift-topic-map/domain.md) (ServiceGroupConfiguration.swift:140-143) | P1 | SW-CLI |
| M-F-15 | Interactive prompts? | cli | B | uncovered | P3 | SW-CLI |

### G. Files, processes, formats → `swift-quality/io.md` (SW-IO)

| ID | Question | Surface | Shapes | Coverage · source | Priority | Family |
|---|---|---|---|---|---|---|
| M-G-01 | `Data.write(options: .atomic)` does no directory fsync. What is the durable replace pattern? | io | B | partial (Rust durable-state) · `swift-foundation@aadd9259be07:Sources/FoundationEssentials/Data/Data+Writing.swift:403,669` | P0: check: grep `.atomic` in store code, plus `strace -f -e fsync` on the fixture | SW-IO |
| M-G-02 | Content-addressed write: temp file, hash while writing, verify, rename, and no partial blob on mismatch? | io | B | partial (Rust durable-state) · `containerization@3e7bc39e66b3:Sources/ContainerizationOCI/Content/ContentWriter.swift:50` | P0: check: fixture with a bad digest must leave no blob | SW-IO |
| M-G-03 | Windows replace semantics (`ReplaceFileW`/`MoveFileEx`) vs POSIX rename? | io,platform | B | partial (Rust durable-state) · `swift-nio@e12881f2a691:Sources/_NIOFileSystem/FileSystem.swift:574` | P1 | SW-IO |
| M-G-04 | Path type: `String` vs `URL` vs swift-system `FilePath`. `FilePath` is not in the 6.4 stdlib. | io | all | uncovered · conflict 15, [shift](swift-topic-map/shifts.md) | P0: check: grep `URL(fileURLWithPath` and string concatenation with `"/"`; Linux build | SW-IO |
| M-G-05 | Lock files for concurrent CLI invocations? | io | B | uncovered · `swiftly@c8cf2e35bfca:Sources/SwiftlyCore/FileLock.swift:34` | P2 | SW-IO |
| M-G-06 | swift-subprocess `from: "1.0.1"` vs `Foundation.Process`? | io | B | uncovered · conflict 17, [dom](swift-topic-map/domain.md) #4 | P0: check: grep `Process()` in new code, and `subprocess.*exact: "1.0.0"` in manifests | SW-IO |
| M-G-07 | Output limits in Subprocess 1.0 (a required limit) and the behaviour on overflow? | io | B | uncovered · [shift](swift-topic-map/shifts.md) | P1 | SW-IO |
| M-G-08 | Child teardown when the parent task is cancelled (terminate, then kill)? | io | B | uncovered · [dom](swift-topic-map/domain.md) | P1 | SW-IO |
| M-G-09 | `Process` pipe rules: drain both pipes before `waitUntilExit`, or deadlock (measured at 256 MiB). | io | B | uncovered · [dom](swift-topic-map/domain.md) | P1 | SW-IO |
| M-G-10 | Foundation on Linux: `FoundationNetworking`, missing APIs, behaviour divergence? | io,platform | all | uncovered · [fail](swift-topic-map/failure.md) | P0: check: Linux `swift build`; grep `URLSession` without `canImport(FoundationNetworking)` | SW-IO |
| M-G-11 | `FoundationEssentials` for libraries (10.3 MB vs 55.6 MB static)? | io,release | A,D | uncovered · conflict 12 | P1 | SW-IO |
| M-G-12 | JSON determinism: `.sortedKeys`, slash escaping, canonical bytes for digests? | io | B | uncovered · `swift-foundation@aadd9259be07:Sources/FoundationEssentials/JSON/JSONWriter.swift:274-306` | P0: check: encode twice and diff; grep `JSONEncoder()` with no `outputFormatting` in digest code | SW-IO |
| M-G-13 | `Date` encoding strategies (the default is a reference-date double, -978307200)? | io | all | uncovered · [fail](swift-topic-map/failure.md) | P1 | SW-IO |
| M-G-14 | Codable versioning: unknown keys, `decodeIfPresent`, defaults? | io | all | uncovered · [dom](swift-topic-map/domain.md) | P1 | SW-IO |
| M-G-15 | Locale-sensitive formatting and parsing in machine output? | io | B | uncovered · [fail](swift-topic-map/failure.md) | P1 | SW-IO |
| M-G-16 | Directory listing order is unspecified. Where is sorting needed? | io | B | uncovered · [fail](swift-topic-map/failure.md) | P2 | SW-IO |
| M-G-17 | Temporary files and directories: location, cleanup, same-filesystem rename? | io | B | uncovered · [dom](swift-topic-map/domain.md) | P2 | SW-IO |
| M-G-18 | File permissions and umask on created files? | io | B | uncovered · [dom](swift-topic-map/domain.md) | P2 | SW-IO |
| M-G-19 | Windows paths: separators, drive letters, long paths? | io,platform | B | uncovered · [dom](swift-topic-map/domain.md) §18 | P1 | SW-IO |
| M-G-20 | Streaming large files without loading them into `Data`? | io,perf | B | uncovered | P3 | SW-IO |

### H. Network and registry clients → `swift-quality/network.md` (SW-NET)

| ID | Question | Surface | Shapes | Coverage · source | Priority | Family |
|---|---|---|---|---|---|---|
| M-H-01 | HTTP client choice: AsyncHTTPClient vs `URLSession` on Linux? | net | B,C | uncovered · conflict 18 | P1 | SW-NET |
| M-H-02 | Credentials on redirect: `URLSession` forwards `Authorization` cross-origin on Linux. | net,security | B | uncovered · `async-http-client@017115279d09:Sources/AsyncHTTPClient/RedirectState.swift:139-143` | P0: check: fixture redirect server; grep `URLSession` near `Authorization` | SW-NET |
| M-H-03 | Timeouts and retries: connect vs read vs total, idempotency? | net | B,C | uncovered · [dom](swift-topic-map/domain.md) | P1 | SW-NET |
| M-H-04 | Registry bearer-token challenge flow and token caching? | net | B | uncovered · `containerization@3e7bc39e66b3:Sources/ContainerizationOCI/Client/RegistryClient.swift:48-54` | P1 | SW-NET |
| M-H-05 | `HTTPClient` lifetime: shared singleton vs owned, and `shutdown()`? | net | B,C | uncovered · [dom](swift-topic-map/domain.md) | P1 | SW-NET |
| M-H-06 | Verifying the digest of a streamed download before committing it? | net,io | B | uncovered · [dom](swift-topic-map/domain.md) | P1 | SW-NET |
| M-H-07 | Proxy environment variables (`HTTPS_PROXY`, `NO_PROXY`)? | net | B | uncovered | P2 | SW-NET |
| M-H-08 | TLS configuration and custom CAs? | net | B,C | uncovered | P2 | SW-NET |
| M-H-09 | `Docker-Content-Digest` and the OCI manifest media-type negotiation? | net | B | uncovered · `containerization@3e7bc39e66b3:Sources/ContainerizationOCI/Client/RegistryClient.swift:202` | P1 | SW-NET |
| M-H-10 | Request cancellation propagation? | net,concurrency | B,C | uncovered | P2 | SW-NET |

### I. Untrusted input → `swift-quality/security.md` (SW-SEC)

| ID | Question | Surface | Shapes | Coverage · source | Priority | Family |
|---|---|---|---|---|---|---|
| M-I-01 | Trapping integer conversions on untrusted input: `Int(exactly:)` vs `Int(_:)` (CVE-2026-43678)? | security | B,C | uncovered · [fail](swift-topic-map/failure.md) (2026 CVEs) | P0: check: grep `Int\(\|UInt32\(` on parsed fields; fixture with oversized input | SW-SEC |
| M-I-02 | `truncatingIfNeeded` silent truncation leading to an out-of-bounds write (CVE-2026-43671)? | security | A,C | uncovered · [fail](swift-topic-map/failure.md) | P1 | SW-SEC |
| M-I-03 | Recursion and size limits on parsers (Hummingbird CVE-2026-97696)? | security | C | uncovered · [fail](swift-topic-map/failure.md) | P2 | SW-SEC |
| M-I-04 | Path traversal and symlinks on archive extraction (`../`, absolute paths, `O_NOFOLLOW`)? | security,io | B | uncovered · `containerization@3e7bc39e66b3:Sources/ContainerizationArchive/ArchiveReader.swift:260-400` | P0: check: fixture tar with `../x` and a symlink entry | SW-SEC |
| M-I-05 | Digest parsing and comparison: algorithm allow-list, lowercase hex, length, comparison on bytes rather than `Character`? | security | B | uncovered · `containerization@3e7bc39e66b3:Sources/ContainerizationOCI/Content/Digest.swift:80-91`, `swift-container-plugin@a9646b8d4dca:Sources/ContainerRegistry/ImageReference+Digest.swift:36-45` | P0: check: a test with a combining-mark digest; grep `==` on digest strings | SW-SEC |
| M-I-06 | Command injection: argument arrays only, never `sh -c` with interpolated input? | security,io | B | uncovered · [dom](swift-topic-map/domain.md) | P1 | SW-SEC |
| M-I-07 | StrictMemorySafety in C-wrapping and pointer code? | security | A | uncovered · conflict 10 | P2 | SW-SEC |
| M-I-08 | C seams: `withUnsafe*` pointer lifetime and escaping pointers? | security | A | uncovered · `sourcekit-lsp@c6ce93d5f8aa:Sources/SourceKitD/SKDRequestDictionary.swift:57` | P2 | SW-SEC |
| M-I-09 | Secrets in logs: redaction and `Logger.MetadataValue` privacy? | security | B,C | uncovered | P2 | SW-SEC |
| M-I-10 | Crypto and randomness: swift-crypto vs CryptoKit, `SystemRandomNumberGenerator`? | security | all | uncovered · [pkg](swift-audit/exemplar-packaging-and-release.md) | P2 | SW-SEC |
| M-I-11 | HTTP header validation? | security,net | C | uncovered | P3 | SW-SEC |
| M-I-12 | Vulnerability scanning for SwiftPM dependencies (GHSA; there is no `swift package audit`)? | security,swiftpm | all | uncovered · [eco](swift-topic-map/ecosystem-tooling.md) | P2 | SW-SEC |

### J. Apple platforms → `swift-quality/apple.md`, read-only (SW-APPLE)

| ID | Question | Surface | Shapes | Coverage · source | Priority | Family |
|---|---|---|---|---|---|---|
| M-J-01 | `SWIFT_DEFAULT_ACTOR_ISOLATION` and `SWIFT_APPROACHABLE_CONCURRENCY` build settings. Xcode 27 projects default to Swift 5 mode. | apple | E | uncovered · [prac](swift-topic-map/practitioner.md) (read-only) | P1 | SW-APPLE |
| M-J-02 | `@Observable` vs `ObservableObject` in app code? | apple | E | uncovered · [prac](swift-topic-map/practitioner.md) | P1 | SW-APPLE |
| M-J-03 | SwiftUI agent tells (massive views, `AnyView`, misplaced `@State`)? | apple | E | uncovered · [prac](swift-topic-map/practitioner.md) | P2 | SW-APPLE |
| M-J-04 | Availability annotations and minimum-OS drift? | apple | D,E | uncovered · [shift](swift-topic-map/shifts.md) | P2 | SW-APPLE |
| M-J-05 | How do Xcode build-setting names map to SwiftPM settings? | apple | E | uncovered · [cfg](swift-audit/config-inventory.md) §2.4 | P2 | SW-APPLE |
| M-J-06 | Tuist and XcodeGen project generation? | apple | B,E | uncovered | P3 | SW-APPLE |
| M-J-07 | Core Data and SwiftData concurrency? | apple | E | uncovered | P3 | SW-APPLE |
| M-J-08 | XCFramework distribution? | apple | D | uncovered | P3 | SW-APPLE |
| M-J-09 | Keychain and entitlements? | apple | E | uncovered | P3 | SW-APPLE |
| M-J-10 | Combine in apps: when is migrating to async sequences worth it? | apple | E | uncovered · [prac](swift-topic-map/practitioner.md) | P3 | SW-APPLE |

### K. Cross-cutting core → `swift-quality` index (SW-CORE)

| ID | Question | Surface | Shapes | Coverage · source | Priority | Family |
|---|---|---|---|---|---|---|
| M-K-01 | What is the gate block: the build, test, format and lint commands, in order, with their exit semantics? | gate | all | partial (rust/go quality index) · [gates](swift-audit/exemplar-quality-gates.md) | P0: check: the gate block itself, run at the containerization root | SW-CORE |
| M-K-02 | Never weaken a check: lowering the language mode, adding `@preconcurrency`, or an `@diagnose(..., as: ignored)` with no reason. | any | all | partial (house CORE-01) · [cfg](swift-audit/config-inventory.md) | P1 | SW-CORE |
| M-K-03 | Watched red: every new check is seen failing on a plant. | any | all | partial (house CORE-02) | P1 | SW-CORE |
| M-K-04 | Read the floor first: tools version, language mode and enabled features before editing. | swiftpm | all | uncovered · conflict 8 | P0: check: `head -1 Package.swift` and `swift package dump-package` | SW-CORE |
| M-K-05 | Generated-code exclusions (protobuf, OpenAPI, plugin output)? | any | A,C | uncovered · [conc](swift-audit/exemplar-concurrency.md) (2,006 generated hatches) | P1 | SW-CORE |
| M-K-06 | Empty-output semantics: a grep with no hits proves nothing unless the glob matched files. | any | all | partial (house CORE-03) | P1 | SW-CORE |
| M-K-07 | What is the agent-tell grep set (hatches, GCD, sleeps, force ops, `Process()`), and is every entry watched red? | any | all | uncovered · [fail](swift-topic-map/failure.md) §2.14, [cod](swift-topic-map/codified.md) §12 | P0: check: the grep set itself, run on a planted fixture | SW-CORE |
| M-K-08 | Routing table and conflicts with siblings (`code-docs`, `docs-quality`, `bazel-quality`)? | any | all | uncovered · [cfg](swift-audit/config-inventory.md) | P1 | SW-CORE |

### L. Manifest and dependencies → `swift-package` index (SW-PKG)

| ID | Question | Surface | Shapes | Coverage · source | Priority | Family |
|---|---|---|---|---|---|---|
| M-L-01 | Tools version vs language mode, and the floor by package kind? | swiftpm | all | uncovered · conflict 8, [pkg](swift-audit/exemplar-packaging-and-release.md) | P0: check: `swift package dump-package \| jq '.toolsVersion, .swiftLanguageModes'` | SW-PKG |
| M-L-02 | Per-target `.swiftLanguageMode(.v5)`: allowed only with a dated reason and a tracker. | swiftpm | all | uncovered · `swift-build@2187330e13e7:Package.swift:345` | P1 | SW-PKG |
| M-L-03 | The 6.4 init template puts `ApproachableConcurrency` into library targets. Keep it or strip it? | swiftpm,concurrency | all | uncovered · [shift](swift-topic-map/shifts.md) §17, [prac](swift-topic-map/practitioner.md) | P0: check: grep `ApproachableConcurrency` in the library targets of published packages | SW-PKG |
| M-L-04 | Which upcoming features to enable, including the six `LanguageMode::future` ones? | swiftpm | all | uncovered · [shift](swift-topic-map/shifts.md) | P0: check: grep `enableUpcomingFeature` against the decided list | SW-PKG |
| M-L-05 | `StrictLanguageFeatures` and unknown-feature-name errors? | swiftpm | all | uncovered · [shift](swift-topic-map/shifts.md) | P1 | SW-PKG |
| M-L-06 | Shared settings arrays and target loops (there is no `defaultSwiftSettings` in 6.4), and `migrate` failing when settings sit in a variable? | swiftpm | all | uncovered · [prac](swift-topic-map/practitioner.md), [shift](swift-topic-map/shifts.md) | P1 | SW-PKG |
| M-L-07 | `unsafeFlags` blocks consumers only below tools 6.2. | swiftpm | A,D | uncovered · [fail](swift-topic-map/failure.md) §2.9 | P1 | SW-PKG |
| M-L-08 | Dependency requirement style: `from:` vs `exact:` vs `branch:` vs `revision:`? | swiftpm | all | uncovered · [pkg](swift-audit/exemplar-packaging-and-release.md) | P1 | SW-PKG |
| M-L-09 | `Package.resolved` tracking and `--force-resolved-versions`? | swiftpm | all | uncovered · conflict 7 | P1 | SW-PKG |
| M-L-10 | Package traits: when to define them, and default traits? | swiftpm | A | uncovered · [pkg](swift-audit/exemplar-packaging-and-release.md) | P1 | SW-PKG |
| M-L-11 | swift-syntax version range for macro packages? | swiftpm,macros | A,D | uncovered · conflict 11 | P1 | SW-PKG |
| M-L-12 | Authoring macros (fleet: no)? | macros | A | uncovered · conflict 11 | P2 | SW-PKG |
| M-L-13 | Build plugins and checked-in generated code? | swiftpm | A,C | uncovered · [pkg](swift-audit/exemplar-packaging-and-release.md) | P2 | SW-PKG |
| M-L-14 | The `platforms:` floor and Linux-only packages? | swiftpm | all | uncovered · [pkg](swift-audit/exemplar-packaging-and-release.md) | P2 | SW-PKG |
| M-L-15 | `Package@swift-X.swift` versioned manifests: when they are needed, and their drift risk? | swiftpm | A,D | uncovered · [map] M1, [prac](swift-topic-map/practitioner.md) | P2 | SW-PKG |
| M-L-16 | Depending on underscored products, and the swift-crypto major range (`"1.0.0"..<"5.0.0"`)? | swiftpm | all | uncovered · [pkg](swift-audit/exemplar-packaging-and-release.md) | P1 | SW-PKG |
| M-L-17 | Binary targets? | swiftpm | D | uncovered | P3 | SW-PKG |
| M-L-18 | Package registries? | swiftpm | all | uncovered | P3 | SW-PKG |
| M-L-19 | Test-target-only settings? | swiftpm | all | uncovered | P3 | SW-PKG |
| M-L-20 | Local path dependencies? | swiftpm | all | uncovered · [eco](swift-topic-map/ecosystem-tooling.md) | P3 | SW-PKG |
| M-L-21 | `swift package add-dependency`/`add-target`/`migrate` instead of hand edits? | swiftpm | all | uncovered · [shift](swift-topic-map/shifts.md) | P2 | SW-PKG |

### M. Gates and CI → `swift-package/gates.md` (SW-GATE)

| ID | Question | Surface | Shapes | Coverage · source | Priority | Family |
|---|---|---|---|---|---|---|
| M-M-01 | Formatter config of record: `.swift-format` contents (indent, width, rule overrides)? | gate | all | uncovered · conflict 1, [cod](swift-topic-map/codified.md) | P0: check: `.swift-format` present plus `swift format lint --strict -r .` | SW-GATE |
| M-M-02 | The triple: `format --in-place`, then `lint --strict`, then `git diff --exit-code`. | gate | all | uncovered · conflict 2 | P0: check: the triple's exit codes, watched red | SW-GATE |
| M-M-03 | Never chain swift-format with SwiftFormat. | gate | all | uncovered · [eco](swift-topic-map/ecosystem-tooling.md) §10 | P1 | SW-GATE |
| M-M-04 | SwiftLint's role: optional, `custom_rules` only? | gate | all | uncovered · [gates](swift-audit/exemplar-quality-gates.md) Smell 8 | P1 | SW-GATE |
| M-M-05 | Which swift-format rules that are off by default (`Never*`, `AllPublicDeclarationsHaveDocumentation`) to enable? | gate | all | uncovered · [cod](swift-topic-map/codified.md) | P1 | SW-GATE |
| M-M-06 | Warnings policy: the CI flag on release toolchains, with nightlies exempt? | gate | all | uncovered · conflict 9 | P0: check: grep `warnings-as-errors` in CI; build a fixture that has a warning | SW-GATE |
| M-M-07 | Which diagnostic groups to promote to errors, and `@diagnose` with `reason:`? | gate | all | uncovered · [shift](swift-topic-map/shifts.md) | P1 | SW-GATE |
| M-M-08 | `--explicit-target-dependency-import-check` is silent (#9620). | gate | all | uncovered · [eco](swift-topic-map/ecosystem-tooling.md) | P2 | SW-GATE |
| M-M-09 | Soundness checks from `swiftlang/github-workflows` (license header, language, shellcheck)? | gate | A,B | uncovered · [eco](swift-topic-map/ecosystem-tooling.md) | P2 | SW-GATE |
| M-M-10 | API-breakage gate: `swift package diagnose-api-breaking-changes <ref>`? | gate | A,D | uncovered · [gates](swift-audit/exemplar-quality-gates.md) | P1 | SW-GATE |
| M-M-11 | DocC gate and `.spi.yml`: vacuous without the file? | gate | A,D | uncovered · [cfg](swift-audit/config-inventory.md) §6.2 | P1 | SW-GATE |
| M-M-12 | Workflow and action pinning (`swiftlang/github-workflows` 0.0.15)? | gate | all | uncovered · [eco](swift-topic-map/ecosystem-tooling.md) | P1 | SW-GATE |
| M-M-13 | CI matrix (6.3, 6.4, nightly; Linux, Windows, static, Wasm) and Windows `Invoke-Program`? | gate | all | uncovered · [gates](swift-audit/exemplar-quality-gates.md) | P1 | SW-GATE |
| M-M-14 | Pinning SwiftLint and SwiftFormat versions in CI? | gate | all | uncovered · [gates](swift-audit/exemplar-quality-gates.md) | P1 | SW-GATE |
| M-M-15 | Config drift between packages in one repo? | gate | all | uncovered · [cfg](swift-audit/config-inventory.md) | P2 | SW-GATE |
| M-M-16 | Diff gate for generated artifacts? | gate | A,C | uncovered | P3 | SW-GATE |
| M-M-17 | `code-docs` loads on Swift but has no `_public` detector or DocC tag handling. | gate | all | covered-elsewhere (sibling defect) · [cfg](swift-audit/config-inventory.md) C1 | P1 | SW-GATE |
| M-M-18 | The `docs-quality` declaration example breaks DocC (`DOC-TYPE-01`). | gate | all | covered-elsewhere (sibling defect) · [cfg](swift-audit/config-inventory.md) C7 | P1 | SW-GATE |

### N. Release → `swift-package/release.md` (SW-REL)

| ID | Question | Surface | Shapes | Coverage · source | Priority | Family |
|---|---|---|---|---|---|---|
| M-N-01 | Static Linux SDK (`--swift-sdk x86_64-swift-linux-musl`) for release binaries? | release | B | partial (go-release) · conflict 16, [eco](swift-topic-map/ecosystem-tooling.md) | P0: check: `file bin` reports "statically linked" | SW-REL |
| M-N-02 | `--static-swift-stdlib` only with `--build-system native` plus an issue link? | release | B,C | uncovered · conflict 16 | P1 | SW-REL |
| M-N-03 | glibc floor: binaries built in the 6.4 image need glibc 2.43. | release | B,C | uncovered · [eco](swift-topic-map/ecosystem-tooling.md) | P0: check: `objdump -T bin \| grep -o 'GLIBC_[0-9.]*' \| sort -V \| tail -1` | SW-REL |
| M-N-04 | Swift Build output paths: use `--show-bin-path`, never a hardcoded `.build/release`. | release | all | uncovered · [eco](swift-topic-map/ecosystem-tooling.md) | P0: check: grep `\.build/(release\|debug)/` in scripts and workflows | SW-REL |
| M-N-05 | Toolchain pin: `.swift-version` and image tag or digest? | release | all | uncovered · [map] M1 | P1 | SW-REL |
| M-N-06 | Artifacts, checksums, SBOM (CycloneDX 1.7/SPDX 3.0.1, not reproducible) and signing? | release | B | partial (go-release) · [eco](swift-topic-map/ecosystem-tooling.md) | P1 | SW-REL |
| M-N-07 | Stamping the version into the binary? | release | B | partial (go-release) · [pkg](swift-audit/exemplar-packaging-and-release.md) | P2 | SW-REL |
| M-N-08 | Build reproducibility? | release | B | uncovered · [eco](swift-topic-map/ecosystem-tooling.md) | P2 | SW-REL |
| M-N-09 | Universal macOS binaries? | release,apple | B | uncovered | P3 | SW-REL |
| M-N-10 | Wasm SDK builds? | release,platform | A,F | uncovered · [eco](swift-topic-map/ecosystem-tooling.md) | P2 | SW-REL |
| M-N-11 | Android SDK? | release,platform | A | uncovered · [shift](swift-topic-map/shifts.md) | P3 | SW-REL |
| M-N-12 | Windows builds, verified locally? | release,platform | B | uncovered · conflict 22 | P1 | SW-REL |
| M-N-13 | Embedded Swift? | release | F | uncovered · [canon](swift-topic-map/canonical.md) | P3 | SW-REL |
| M-N-14 | Docker images (slim runtime vs static scratch)? | release | B,C | uncovered · [pkg](swift-audit/exemplar-packaging-and-release.md) | P2 | SW-REL |
| M-N-15 | Library tagging, semver and SSWG maturity? | release | A,D | uncovered · [pkg](swift-audit/exemplar-packaging-and-release.md) | P2 | SW-REL |
| M-N-16 | Linux distribution test matrix? | release | C | uncovered | P3 | SW-REL |

### O. Bazel for Swift → `rules/bazel-quality/swift.md` (BZL-SWIFT)

| ID | Question | Surface | Shapes | Coverage · source | Priority | Family |
|---|---|---|---|---|---|---|
| M-O-01 | When is Bazel for Swift justified at all (5/40 repos)? | bazel-swift | F | partial (bazel-quality) · [eco](swift-topic-map/ecosystem-tooling.md) | P1 | BZL-SWIFT |
| M-O-02 | Hermetic toolchain registration for rules_swift 4.2.1? | bazel-swift | F | partial (bazel-quality) · [eco](swift-topic-map/ecosystem-tooling.md) | P1 | BZL-SWIFT |
| M-O-03 | `CC=clang` requirement on Linux? | bazel-swift | F | uncovered · [eco](swift-topic-map/ecosystem-tooling.md) | P1 | BZL-SWIFT |
| M-O-04 | `swift_library` attributes (`module_name`, `copts`, `swiftc_inputs`)? | bazel-swift | F | uncovered · [eco](swift-topic-map/ecosystem-tooling.md) | P1 | BZL-SWIFT |
| M-O-05 | Features (`swift.enable_v6`, …) and the `-debug-module-path` doc drift? | bazel-swift | F | uncovered · [eco](swift-topic-map/ecosystem-tooling.md) | P1 | BZL-SWIFT |
| M-O-06 | rules_swift_package_manager for SwiftPM dependencies? | bazel-swift | F | uncovered · [eco](swift-topic-map/ecosystem-tooling.md) | P2 | BZL-SWIFT |
| M-O-07 | `swift_test` with Swift Testing? | bazel-swift | F | uncovered | P2 | BZL-SWIFT |
| M-O-08 | Static and cross builds under Bazel? | bazel-swift | F | uncovered | P3 | BZL-SWIFT |
| M-O-09 | Drift between the rules_swift docs and the code? | bazel-swift | F | uncovered · [eco](swift-topic-map/ecosystem-tooling.md) | P2 | BZL-SWIFT |
| M-O-10 | Compatibility levels (Bazel 8–10)? | bazel-swift | F | partial (bazel-quality) · [eco](swift-topic-map/ecosystem-tooling.md) | P2 | BZL-SWIFT |

### P. Procedures → skills

| ID | Question | Surface | Shapes | Coverage · source | Priority | Family |
|---|---|---|---|---|---|---|
| M-P-01 | `swift-upgrade`: Swift 6 mode, upcoming features, toolchain bump, the fix ladder, `swift package migrate`. | swiftpm,concurrency | all | partial (go-upgrade) · [fail](swift-topic-map/failure.md) §2.1, [shift](swift-topic-map/shifts.md) | P1 | SW-CORE |
| M-P-02 | `swift-diagnose`: the crash and hang runbook (exit codes 132/134/139/141, backtracer, continuation leaks, TSan/ASan, type-checker timeouts). | any | all | partial (go-diagnose) · [fail](swift-topic-map/failure.md) §2.13 | P1 | SW-CORE |
| M-P-03 | `swift-release`: static SDK, checksums, SBOM, API-breakage check, stamping. | release | B | partial (go-release) · [eco](swift-topic-map/ecosystem-tooling.md) | P1 | SW-CORE |
| M-P-04 | Review skill? | any | all | uncovered | P3 | SW-CORE |

## Artifact set decision

### Rules (two)

**`swift-quality`**, glob `["**/*.swift"]`.
- **Why the bare extension is safe.** It cannot miss: 18,886 files across 40/40 repos ([cfg](swift-audit/config-inventory.md) §2.4). Every Swift source has the extension, and `Package.swift` and `Project.swift` also match, which is harmless.
- **Index (family SW-CORE).** The index carries:
  - the gate block (M-K-01);
  - the read-the-floor-first step (M-K-04);
  - the agent-tell grep set (M-K-07);
  - never-weaken, watched-red and empty-output (the CORE trio);
  - the routing table and the sibling map.
- **Depth files** are routed by task, and each gets a never-matching glob, as in the code-docs precedent `paths: ["**/.swift-quality-depth-on-demand"]`:

  | Depth file | Family |
  |---|---|
  | `language.md` | SW-LANG |
  | `concurrency.md` | SW-CONC |
  | `errors.md` | SW-ERR |
  | `api-design.md` | SW-API, including the SDK-wraps-CLI rows |
  | `testing.md` | SW-TEST |
  | `cli-contract.md` | SW-CLI |
  | `io.md` | SW-IO |
  | `network.md` | SW-NET |
  | `security.md` | SW-SEC |
  | `apple.md` | SW-APPLE, read-only reading heuristics |

**`swift-package`** has a glob list in which every name except `.spi.yml` is required by a tool ([map] M1):
- `**/Package.swift` (39/677 files). Manifest basename, SwiftPM `Manifest.swift:27`.
- `**/Package@swift-*.swift` (8/15). SwiftPM regex `ToolsVersionParser.swift:654`; the previous glob misses these.
- `**/Package.resolved` (17/97). `Workspace+Configuration.swift:221`.
- `**/.swift-format` (24). swift-format `Configuration.swift:297`.
- `**/.swiftformat` (7/19). SwiftFormat `SwiftFormat.swift:39`.
- `**/.swiftlint.yml` (4/26). SwiftLint `Configuration.swift:14`.
- `**/.swift-version` (6/10). swiftly `Use.swift:191`.
- `**/.spi.yml` (31). Swift Package Index requires the name; it drives the DocC gate.

The `swift-package` index (family SW-PKG) has two depth files:
- `gates.md` (SW-GATE);
- `release.md` (SW-REL).

The checker root is `containerization`, with `--allow-absent` for `.swiftformat`, `.swiftlint.yml` and `Package@swift-*.swift`. Those three are live in swiftly, tuist and async-algorithms ([map] M2).

**Never globbed** (conflict 14):
- CI workflows;
- `Dockerfile`;
- `*.pbxproj` and `*.xcconfig`;
- `*.docc`;
- `MODULE.bazel` and `BUILD.bazel`, which `bazel-quality` owns;
- `.swiftlint.yaml`.

### ID families (15)

| Family | Covers |
|---|---|
| SW-CORE | the `swift-quality` index, opening with the CORE trio (-01 weaken-check, -02 watched-red, -03 empty-output) |
| SW-LANG, SW-CONC, SW-ERR, SW-API, SW-TEST, SW-CLI, SW-IO, SW-NET, SW-SEC, SW-APPLE | the `swift-quality` depth files |
| SW-PKG | the `swift-package` index |
| SW-GATE, SW-REL | the `swift-package` depth files |
| BZL-SWIFT | the bazel-quality depth file |

A grep of the catalog finds 0 existing `SW-` or `SWIFT-` IDs.
[cfg](swift-audit/config-inventory.md) proposed `SWIFT-`; the task fixes `SW-`.

### Bazel handoff

The wave-3 dive `bazel/rules-swift` writes to `swift-bazel/`.

At authoring time:
- draft `rules/bazel-quality/swift.md` (BZL-SWIFT) inside the **published `bazel-quality` set**;
- add a routing row to the bazel-quality index, with the keywords `rules_swift`, `swift_library`, `swift_binary`, `swift.toolchain`;
- update the bazel-quality Siblings line to name `swift-quality`;
- bump `publish.toml [rules.bazel-quality]` from 0.3.0 to 0.4.0;
- update `docs/bazel-quality.md`.

The file is framed "if you adopt Bazel for Swift". Bazel is secondary for Swift: 5/40 repos.
Bazel is not available under `~/.cache/research-lang`. The dive installs it from the ocx index into `~/.cache/research-lang/bazel-tools`, or marks every row `unverified: read only`.
The depth file is never a bundle member.

### Skills (three procedures)

| Skill | Procedure | References |
|---|---|---|
| `swift-upgrade` | Swift 6 language mode, upcoming features, toolchain bump, fix ladder, `swift package migrate`. The description must say "Swift 6 concurrency migration". | — |
| `swift-diagnose` | Crash and hang runbook: exit codes 132/134/139/141, the backtracer, continuation leaks, TSan/ASan, type-checker timeouts. | `references/` from the start |
| `swift-release` | Static SDK build, glibc floor check, checksums, SBOM, API-breakage gate, version stamping. | — |

A review skill is deferred (M-P-04).

### Bundle

`swift-essentials` contains these untagged members:
- `./swift-quality`
- `./swift-package`
- `./swift-upgrade`
- `./swift-diagnose`
- `./swift-release`
- `./code-docs`
- `./code-docs-cleanup`

### Plumbing at authoring

- `docs/<artifact>.md` for each artifact;
- `assets/glyphs/swift.svg` and `lore-swift.svg`;
- `publish.toml` entries;
- the `SWIFT_CONSUMER` taskfile variable.

### Not in scope

- SwiftUI design;
- server-framework routing;
- Xcode project authoring;
- CocoaPods and Carthage (0/40);
- Objective-C;
- DocC content, which `code-docs` and `docs-quality` own (M-M-17 and M-M-18 are reported there).

## Selected for wave 2

Seven groups and 13 dives, chosen in this order:
1. **Cross-cutting decisions:** concurrency (isolation and the escape hatches) and gates (formatter and warnings). The index and every other depth file depend on them.
2. **Fleet leverage:** cli, io and package.
3. **Agent failure frequency:** testing and errors.

Every row is uncovered. Each brief plants fixtures that are watched red on the plant and green on its twin.

**Chase the surprise.** Each of these is assigned to a dive. If one does not reproduce, the dive says so and does not paper over it.

| Surprise | Dive |
|---|---|
| `URLSession` forwards credentials across a redirect on Linux | wave 3, `network` |
| `ExitCode(256)` exits 0 | `cli/exit-codes-and-streams` |
| A top-level `await main()` exits 1 | `cli/exit-codes-and-streams` |
| `print` to `/dev/full` exits 0; SIGPIPE gives 141 | `cli/exit-codes-and-streams` |
| The `Process` pipe deadlock | `io/subprocess-contract` |
| swiftly drops environment overrides | `io/subprocess-contract` |
| `swift format lint` exits 0 without `--strict` | `gates/format-and-lint` |
| The DocC gate is vacuous without `.spi.yml` | `gates/warnings-and-ci` |
| The `unsafeFlags` rule at tools 6.2 | `package/manifest-policy` |
| The 6.4 template adds `ApproachableConcurrency` to library targets | `concurrency/isolation-and-sendable` |
| `NonisolatedNonsendingByDefault` breaks builds | `concurrency/isolation-and-sendable` |
| `Data.write(.atomic)` does no directory fsync | `io/files-and-paths` |
| A `Character`-based digest comparison accepts combining marks | `io/formats-and-determinism` |
| `--static-swift-stdlib` fails to link | wave 3, `release` |

**Shared Env footer.** Every brief ends with it, and wave-2 consolidations cite it.

```text
Env: ~/.cache/research-lang/swift-tools/run.sh (docker swift:6.4; rerun every plant with SWIFT_VERSION=6.3).
Every swift build/test/run uses --scratch-path "$SWIFT_SCRATCH/<slug>"; never build inside an exemplar.
Fixtures live only under ~/.cache/research-lang/swift-tools/fixtures/<slug>/, never /tmp.
Linux only: there is no macOS and no Xcode. Apple and Windows claims are marked "unverified: read only" unless owner Q7 grants the Windows host.
Every check is quoted verbatim, with the exit code seen red on the plant and green on its twin.
```

### Group `concurrency`: Concurrency (SW-CONC) → `swift-concurrency.md`

#### W2-1 `concurrency/isolation-and-sendable`: Isolation, Sendable and the escape hatches

```text
Rows: M-B-01..M-B-10, M-B-22, M-B-23, M-B-24, M-B-25, M-B-28, M-L-03.
Fetch: SE-0466 https://github.com/swiftlang/swift-evolution/blob/main/proposals/0466-control-default-actor-isolation.md ; SE-0461 .../proposals/0461-async-function-isolation.md ;
  SE-0433 .../proposals/0433-mutex.md ; SE-0430 .../proposals/0430-transferring-parameters-and-results.md ; SE-0470 .../proposals/0470-isolated-conformances.md ;
  vision https://github.com/swiftlang/swift-evolution/blob/main/visions/approachable-concurrency.md ; https://www.swift.org/migration/documentation/migrationguide/ ;
  the Massicotte and Wals URLs in [prac] §1.
Pin: what ApproachableConcurrency expands to on 6.3 and 6.4 ([shift] cites CompilerInvocation.cpp:1068); the diagnostic group names for Sendable and isolation errors
  (https://docs.swift.org/compiler/documentation/diagnostics/); whether a final class with only `let m: Mutex<S>` is checked Sendable on 6.3 as well as 6.4.
Exemplar: swift-nio@e12881f2a691:Sources/NIOPosix/ThreadWindows.swift:26 (guarded hatch); async-http-client@017115279d09:Sources/AsyncHTTPClient/HTTPHandler.swift:548;
  swift-protobuf@6c84c3dedac0:CompileTests/NonisolatedDeclarations/Package.swift:25; swift-service-lifecycle@c55297914e26:Sources/UnixSignals/UnixSignalsSequence.swift:80 (NNbD break);
  IceCubesApp@2ad6e6891258:Packages/Timeline/Package.swift:41-42; Nuke@d5548dd61395:Sources/Nuke/Internal/RateLimiter.swift:55; re-sample 25 hatches from [conc] Axis 1.
Plant in fixtures/isolation-and-sendable/:
  (a) `final class C: @unchecked Sendable { var n = 0 }` mutated from a TaskGroup. Record that swiftc is silent; `swift test --sanitize=thread` is red; the Mutex<State> twin is green.
  (b) a Mutex-only final class without @unchecked builds on 6.4 and on 6.3. Record any difference.
  (c) a library target with defaultIsolation(MainActor.self) used from a nonisolated executable. Record the diagnostics the consumer sees.
  (d) `nonisolated func f() async` asserting caller isolation, built with and without NonisolatedNonsendingByDefault. Red on one, green on the other.
  (e) `swift package init --type library` on 6.4. Diff the manifest against 6.3's.
Decide: the verbatim acceptance test for @unchecked Sendable and nonisolated(unsafe): guard plus reason, as a grep plus a reading heuristic.
  Also decide the fix-ladder order, the Mutex/actor/@globalActor/NIOLockedValueBox table, and defaultIsolation and NNbD per target kind (confirm or overturn conflict 4).
  Also decide whether to keep or strip the template's ApproachableConcurrency in libraries, and give the consumer-default compile-test recipe.
Chase: if TSan on Linux misses plant (a), say so and name what does catch it.
Env: ~/.cache/research-lang/swift-tools/run.sh (swift:6.4; rerun each plant with SWIFT_VERSION=6.3); every build/test/run uses --scratch-path "$SWIFT_SCRATCH/isolation-and-sendable"; fixtures only under ~/.cache/research-lang/swift-tools/fixtures/isolation-and-sendable/ (never /tmp); never build inside an exemplar; Linux only, so Apple/Windows claims are marked "unverified: read only" (owner Q7); quote each check verbatim with its red and green exit codes.
```

#### W2-2 `concurrency/tasks-and-cancellation`: Tasks, cancellation, continuations and GCD in async code

```text
Rows: M-B-11, M-B-12, M-B-14..M-B-21, M-B-26, M-B-27, M-B-29.
Fetch: SE-0304 https://github.com/swiftlang/swift-evolution/blob/main/proposals/0304-structured-concurrency.md ; SE-0526 (withDeadline: accepted, not in 6.4) via [dom] §15 ;
  https://realm.github.io/SwiftLint/unhandled_throwing_task.html ; https://github.com/swiftlang/swift/blob/main/docs/Backtracing.rst ; the GCD guidance in [prac] §1.
Pin: the NoUseUnstructuredThrowingTask group name and release (6.4 only per [fail]); AsyncStream's default buffering policy; whether Task.sleep and blocking reads
  observe cancellation; how LIBDISPATCH_COOPERATIVE_POOL_STRICT=1 behaves on Linux.
Exemplar: containerization@3e7bc39e66b3:Sources/ContainerizationExtras/Timeout.swift and Sources/ContainerizationExtras/AsyncLock.swift (waiters cannot be cancelled);
  hummingbird@1bd3b407fb47:Sources/HummingbirdCore/Server/Server.swift:117; swift-async-algorithms@cbde9aed744b:Sources/AsyncStreaming/DuplexChannel/DuplexAsyncChannel.swift:354;
  swift-nio@e12881f2a691:Sources/NIOPosix/StructuredConcurrencyHelpers.swift:34; Nuke@d5548dd61395:Sources/Nuke/Pipeline/TaskQueue.swift:174.
Plant in fixtures/tasks-and-cancellation/:
  (a) a continuation that is never resumed. `timeout 20 swift run` exits 124 (red); the resumed twin exits 0 (green).
  (b) a double resume. Record the trap's signal and exit code on x86_64.
  (c) DispatchSemaphore.wait() inside async code under LIBDISPATCH_COOPERATIVE_POOL_STRICT=1 deadlocks (red); the continuation twin completes (green).
  (d) a task-group timeout race around a blocking read. Show that non-cooperative work keeps running after the "timeout".
  (e) an unbounded AsyncStream with a slow consumer. Measure peak RSS; the .bufferingNewest(n) twin is flat.
  (f) `Task { try await f() }`. Record whether swiftc 6.4 and SwiftLint 0.65.1 each fire.
Decide: the ownership rule for unstructured tasks, and its check; the recommended timeout pattern while withDeadline is absent; the continuation rules;
  the verbatim GCD-in-async grep; the off-pool pattern for blocking work; the AsyncStream policy; the close()/shutdown contract for resources.
Env: ~/.cache/research-lang/swift-tools/run.sh (swift:6.4; rerun each plant with SWIFT_VERSION=6.3); every build/test/run uses --scratch-path "$SWIFT_SCRATCH/tasks-and-cancellation"; fixtures only under ~/.cache/research-lang/swift-tools/fixtures/tasks-and-cancellation/ (never /tmp); never build inside an exemplar; Linux only, so Apple/Windows claims are marked "unverified: read only" (owner Q7); quote each check verbatim with its red and green exit codes.
```

### Group `gates`: Gates and CI (SW-GATE) → `swift-gates.md`

#### W2-3 `gates/format-and-lint`: Formatter of record, lint role and the agent-tell grep set

```text
Rows: M-M-01..M-M-05, M-M-14, M-M-15, M-K-07.
Fetch: https://github.com/swiftlang/swift-format/blob/main/Documentation/Configuration.md and .../Documentation/RuleDocumentation.md ;
  https://realm.github.io/SwiftLint/rule-directory.html (and the custom_rules section of the README) ; https://github.com/nicklockwood/SwiftFormat#rules .
Pin: the swift-format version bundled in the 6.3 and 6.4 images (`swift format --version` prints "main", so recover the real tag);
  `swift format dump-configuration` defaults; lint exit codes with and without --strict; SwiftLint 0.65.1 ids for force_cast, force_try, force_unwrapping
  and unhandled_throwing_task; custom_rules regex and match_kinds semantics.
Exemplar: swift-log@4038b6a4f74a:.swift-format (0 findings with it, 3,381 with defaults); containerization@3e7bc39e66b3:.swift-format; swiftly@c8cf2e35bfca:.swiftformat;
  element-x-ios@14e33866ced2:.swiftlint.yml:75 (custom rule); [gates] Smells 1 and 8; [cod] §12 (Airbnb custom_rules).
Plant in fixtures/format-and-lint/: a package with one misformatted file and one lint-only violation.
  `swift format lint -r Sources` exits 0 (red: the gate misses it); `swift format lint --strict -r Sources` exits non-zero (green).
  The triple `swift format format --in-place -r Sources && swift format lint --strict -r Sources && git diff --exit-code` is red on the plant and green on the twin.
  SwiftFormat chained after swift-format reproduces diff churn (red); swift-format alone is stable (green).
  Each K-07 grep entry hits its planted tell (red), returns zero hits on the clean twin, and is proven to have matched files.
Decide: the shipped .swift-format content (indentation and width follow owner Q2) and which Never* rules are on; the verbatim gate triple;
  the optional SwiftLint custom_rules file that carries the grep set; how tool versions are pinned in CI.
  Also decide the verbatim K-07 grep set, with each entry's false-positive count on containerization, swiftly, vapor, swift-nio and Nuke.
Env: ~/.cache/research-lang/swift-tools/run.sh (swift:6.4; rerun each plant with SWIFT_VERSION=6.3); every build/test/run uses --scratch-path "$SWIFT_SCRATCH/format-and-lint"; fixtures only under ~/.cache/research-lang/swift-tools/fixtures/format-and-lint/ (never /tmp); never build inside an exemplar; Linux only, so Apple/Windows claims are marked "unverified: read only" (owner Q7); quote each check verbatim with its red and green exit codes.
```

#### W2-4 `gates/warnings-and-ci`: Gate block, warnings-as-errors, API breakage, DocC and CI matrix

```text
Rows: M-K-01, M-M-06..M-M-13, M-L-05.
Fetch: SE-0443 https://github.com/swiftlang/swift-evolution/blob/main/proposals/0443-warning-control-flags.md ; SE-0480 .../proposals/0480-swiftpm-warning-control.md ;
  the @diagnose proposal named in [shift] ; https://docs.swift.org/compiler/documentation/diagnostics/ ; https://github.com/swiftlang/github-workflows (tag 0.0.15) ;
  https://swiftlang.github.io/swift-docc-plugin/documentation/swiftdocc/ ; the Swift Package Index .spi.yml docs.
Pin: the `-Werror <Group>` spelling; the `.treatWarning("Group", as: .error)` and `.treatAllWarnings(as:)` spellings; @diagnose syntax and whether reason: is required on 6.4;
  whether SwiftPM suppresses dependency warnings; diagnose-api-breaking-changes under Swift Build on Linux; StrictLanguageFeatures on an unknown feature name.
Exemplar: swift-log@4038b6a4f74a:.github/workflows/pull_request.yml:22-26; swift-aws-lambda-runtime@8abd464310c7:Package.swift:7;
  swift-testing@c7d68ca20cd7:Package.swift:436-440; swift-nio@e12881f2a691:.github/workflows/main.yml:18; swift-protobuf@6c84c3dedac0:.github/workflows/build.yml:121,141-146.
Plant in fixtures/warnings-and-ci/:
  (a) a root package plus a local path dependency that emits a deprecation warning. `swift build -Xswiftc -warnings-as-errors` fails on the dependency (record);
      `.treatAllWarnings(as: .error)` set in the root only passes.
  (b) @diagnose(..., as: ignored) with and without reason:. Record what the compiler accepts.
  (c) tag v1, then remove a public func. `swift package diagnose-api-breaking-changes v1` is red; the additive twin is green.
  (d) a DocC symbol link that does not resolve. `--warnings-as-errors` is red; fixed, it is green. Without .spi.yml, show what the soundness docs check runs.
  (e) an unknown upcoming-feature name with and without StrictLanguageFeatures.
Decide: the verbatim gate block (K-01), in order; the warnings policy and the list of promoted groups; the minimum CI matrix; the workflow pinning rule; where the DocC gate lives.
Env: ~/.cache/research-lang/swift-tools/run.sh (swift:6.4; rerun each plant with SWIFT_VERSION=6.3); every build/test/run uses --scratch-path "$SWIFT_SCRATCH/warnings-and-ci"; fixtures only under ~/.cache/research-lang/swift-tools/fixtures/warnings-and-ci/ (never /tmp); never build inside an exemplar; Linux only, so Apple/Windows claims are marked "unverified: read only" (owner Q7); quote each check verbatim with its red and green exit codes.
```

### Group `testing`: Testing (SW-TEST) → `swift-testing.md`

#### W2-5 `testing/test-style`: Framework per test kind, parallelism, sleeps, exit tests and CLI end-to-end tests

```text
Rows: M-E-01..M-E-13.
Fetch: https://developer.apple.com/documentation/testing ; https://github.com/swiftlang/swift-testing/tree/main/Documentation ;
  the Swift Testing proposals at https://github.com/swiftlang/swift-evolution/tree/main/proposals/testing (ST-0021 interop, exit tests) ;
  https://developer.apple.com/documentation/testing/migratingfromxctest .
Pin: the interop mode default per toolchain and tools version, and its environment override; the exit-test API spelling and its platforms;
  `swift test --enable-code-coverage` and `--show-codecov-path`; whether `--sanitize=thread` works with Swift Testing on Linux; the repetition and serial flags.
Exemplar: swift-argument-parser@efd239f0055b:Sources/ArgumentParserTestHelpers/TestHelpers.swift:401-428 and :56; the per-repo shares in [gates] Axis 2;
  swift-testing@c7d68ca20cd7 (its own tests); Nuke@d5548dd61395 (a mixed tree).
Plant in fixtures/test-style/:
  (a) two @Test functions that share a static var. Flaky under repetition (red); the .serialized or instance-state twin is green.
  (b) an async test synchronised with Task.sleep. Fails under load (red, via `taskset -c 0`); the confirmation() twin is green.
  (c) an exit test asserting that a precondition fails.
  (d) a CLI end-to-end test that runs the built product and asserts stdout, stderr and exit code.
  (e) XCTAssert inside @Test with tools 6.3 and with tools 6.4. Record the interop behaviour.
Decide: the framework rule per test kind; the CLI end-to-end harness recipe; the sleep ban and its grep; coverage commands and threshold mechanics;
  the sanitizer leg; .serialized guidance.
Env: ~/.cache/research-lang/swift-tools/run.sh (swift:6.4; rerun each plant with SWIFT_VERSION=6.3); every build/test/run uses --scratch-path "$SWIFT_SCRATCH/test-style"; fixtures only under ~/.cache/research-lang/swift-tools/fixtures/test-style/ (never /tmp); never build inside an exemplar; Linux only, so Apple/Windows claims are marked "unverified: read only" (owner Q7); quote each check verbatim with its red and green exit codes.
```

### Group `package`: Manifest and dependencies (SW-PKG) → `swift-package.md`

#### W2-6 `package/manifest-policy`: Floors, language modes, upcoming features and manifest skeletons

```text
Rows: M-K-04, M-L-01, M-L-02, M-L-04, M-L-06, M-L-07, M-L-14, M-L-15, M-L-21.
Fetch: https://docs.swift.org/swiftpm/documentation/packagemanagerdocs/ ; https://docs.swift.org/swiftpm/documentation/packagedescription/ ;
  https://www.swift.org/migration/documentation/migrationguide/ (swift package migrate) ; the SE-0540 status page (defaultSwiftSettings, not in 6.4) ;
  the upcoming-feature table in [shift].
Pin: the `swift package dump-package` JSON fields for toolsVersion, swiftLanguageModes and settings; the upcoming-feature lists on 6.3 and 6.4, by compiling
  each name under StrictLanguageFeatures; the unsafeFlags rule for a dependency at tools 6.1 vs 6.2; `swift package migrate` when settings sit in a variable.
Exemplar: Alamofire@bda9ed57d729:Package.swift:1,52; swift-build@2187330e13e7:Package.swift:345; vapor@bf77fc69b142:Package.swift:246-252;
  swift-collections@935f696a549a:Package.swift:111,324-325; swift-log@4038b6a4f74a:Package.swift:55-73; the two Package@swift-*.swift files in swift-async-algorithms@cbde9aed744b.
Plant in fixtures/manifest-policy/:
  (a) a dependency at tools 6.1 that uses unsafeFlags. Its consumer fails (red); the dependency at tools 6.2 builds (green).
  (b) settings in a shared array variable. Record the `swift package migrate --to-feature` failure; the inline twin migrates.
  (c) Package@swift-6.3.swift beside Package.swift. Show which manifest each image picks.
  (d) minimal library, CLI and SDK manifests at the chosen floors, building on both images.
Decide: the floor numbers per package kind (default in owner Q1); the upcoming-feature list; verbatim manifest skeletons for a library, a CLI and the SDK;
  the versioned-manifest policy; the verbatim K-04 read-floor-first command.
Env: ~/.cache/research-lang/swift-tools/run.sh (swift:6.4; rerun each plant with SWIFT_VERSION=6.3); every build/test/run uses --scratch-path "$SWIFT_SCRATCH/manifest-policy"; fixtures only under ~/.cache/research-lang/swift-tools/fixtures/manifest-policy/ (never /tmp); never build inside an exemplar; Linux only, so Apple/Windows claims are marked "unverified: read only" (owner Q7); quote each check verbatim with its red and green exit codes.
```

#### W2-7 `package/dependencies-and-resolution`: Requirements, Package.resolved, traits and swift-syntax

```text
Rows: M-L-08..M-L-13, M-L-16.
Fetch: SE-0450 https://github.com/swiftlang/swift-evolution/blob/main/proposals/0450-swiftpm-package-traits.md ; the SwiftPM resolution docs at docs.swift.org/swiftpm ;
  the swift-syntax prebuilts thread and the Point-Free macro guidance in [pkg] and [prac].
Pin: `--force-resolved-versions` semantics and the originHash re-resolution path; the prebuilts default (swift-package-manager@5546f44a3b52:Sources/CoreCommands/Options.swift:220-223);
  trait syntax and default traits on 6.4; how swift-syntax major ranges resolve against an exact prerelease pin.
Exemplar: swift-package-manager@5546f44a3b52:Sources/Workspace/Workspace+Dependencies.swift:314; tuist (its --force-resolved-versions CI step, located via [pkg] E3);
  SwiftLint@ec4691d9e813:Package.swift (exact swift-syntax pin); the committed Package.resolved in swift-composable-architecture; the swift-crypto ranges in [pkg].
Plant in fixtures/dependencies-and-resolution/:
  (a) an executable with Package.resolved, then a manifest edit. A plain build re-resolves silently (red); `--force-resolved-versions` errors (green).
  (b) two macro packages, one with an exact prerelease swift-syntax pin and one with a range. Record the resolution conflict and the range-only twin resolving.
  (c) a trait-gated optional dependency, enabled and disabled.
  (d) a dependency on an underscored product. Record what breaks on a minor bump.
Decide: Package.resolved policy per kind (confirm conflict 7); the requirement-style rule; the swift-syntax range and canImport ladder; traits guidance;
  the underscored-product ban; the swift-crypto range form.
Env: ~/.cache/research-lang/swift-tools/run.sh (swift:6.4; rerun each plant with SWIFT_VERSION=6.3); every build/test/run uses --scratch-path "$SWIFT_SCRATCH/dependencies-and-resolution"; fixtures only under ~/.cache/research-lang/swift-tools/fixtures/dependencies-and-resolution/ (never /tmp); never build inside an exemplar; Linux only, so Apple/Windows claims are marked "unverified: read only" (owner Q7); quote each check verbatim with its red and green exit codes.
```

### Group `errors`: Errors and traps (SW-ERR) → `swift-errors.md`

#### W2-8 `errors/error-contracts`: Typed throws, error shape, user-facing text and swallowed errors

```text
Rows: M-C-01..M-C-04, M-C-08, M-C-09.
Fetch: SE-0413 https://github.com/swiftlang/swift-evolution/blob/main/proposals/0413-typed-throws.md ; https://www.swift.org/documentation/api-design-guidelines/ ;
  the swift-log docs on logging errors (https://github.com/apple/swift-log).
Pin: closure typed-throws inference on 6.4 (FullTypedThrows status); the PerformanceHints::UntypedThrows diagnostic named in [shift]; typed errors through async let and task groups.
Exemplar: the Axis 4 examples in [shape]; swift-system Errno; the typed throws in swift-crypto; container@f70ecbb926d9:Sources/ContainerCommands/Application.swift:136
  (control flow by matching error strings) and :150.
Plant in fixtures/error-contracts/:
  (a) a public API with a concrete typed throws, then a new error type added. Record the consumer source break (red); the untyped twin is green.
  (b) `try? data.write(to:)` to /dev/full swallows ENOSPC (red); the propagated twin exits non-zero (green).
  (c) `catch {}` and `catch { print(error) }`. The verbatim grep hits both (red) and stays silent on the rethrow twin.
  (d) an error logged at three layers. Record the duplicate output.
Decide: the typed-throws rule (confirm conflict 6); the error type template with cause chaining; the user-facing description protocol and what ArgumentParser prints;
  the try? and empty-catch grep with its allow-list; which layer logs.
Env: ~/.cache/research-lang/swift-tools/run.sh (swift:6.4; rerun each plant with SWIFT_VERSION=6.3); every build/test/run uses --scratch-path "$SWIFT_SCRATCH/error-contracts"; fixtures only under ~/.cache/research-lang/swift-tools/fixtures/error-contracts/ (never /tmp); never build inside an exemplar; Linux only, so Apple/Windows claims are marked "unverified: read only" (owner Q7); quote each check verbatim with its red and green exit codes.
```

#### W2-9 `errors/traps-and-unwraps`: Force operations, preconditions and trapping conversions (with SW-SEC rows)

```text
Rows: M-C-05, M-C-06, M-I-01, M-I-02.
Fetch: the GitHub advisories for swift-nio CVE-2026-43678 and CVE-2026-43671 and for Hummingbird CVE-2026-97697 (the links are in [fail]) ;
  https://github.com/swiftlang/swift/blob/main/docs/Backtracing.rst .
Pin: the SwiftLint ids force_cast, force_try and force_unwrapping (opt-in); swift-format NeverForceUnwrap, NeverUseForceTry and NeverUseImplicitlyUnwrappedOptionals;
  the signal and exit code for precondition failure, overflow and fatalError on x86_64 Linux, and on aarch64 if the image runs there.
Exemplar: the swift-nio fix commits for both CVEs (resolve their SHAs); the lint table in [fail] §2.14;
  element-x-ios@14e33866ced2:ElementX/Sources/Screens/JoinRoomScreen/JoinRoomScreenViewModel.swift:413.
Plant in fixtures/traps-and-unwraps/:
  (a) a UInt64 length header of 2^63 parsed with Int(_:) traps (red); the Int(exactly:) twin rejects it with an error (green).
  (b) truncatingIfNeeded used to compute a buffer index. Show the wrong-index write (red, ASan); the checked twin is green.
  (c) a force unwrap of a decoded optional. The SwiftLint and swift-format rules fire (red) and are silent on the guard-let twin.
  (d) a precondition vs a throw on bad CLI input. Record the exit codes.
Decide: the force-operation policy (including whether tests are exempt); the precondition-vs-throw rule; the conversion rule for untrusted integers, with a grep;
  whether this lands in errors.md or security.md (row ownership).
Env: ~/.cache/research-lang/swift-tools/run.sh (swift:6.4; rerun each plant with SWIFT_VERSION=6.3); every build/test/run uses --scratch-path "$SWIFT_SCRATCH/traps-and-unwraps"; fixtures only under ~/.cache/research-lang/swift-tools/fixtures/traps-and-unwraps/ (never /tmp); never build inside an exemplar; Linux only, so Apple/Windows claims are marked "unverified: read only" (owner Q7); quote each check verbatim with its red and green exit codes.
```

### Group `cli`: CLI contract (SW-CLI) → `swift-cli.md`

#### W2-10 `cli/exit-codes-and-streams`: Entry point, exit codes, SIGPIPE, buffering and the stream contract

```text
Rows: M-F-01..M-F-08, M-F-11, M-F-13.
Fetch: https://swiftpackageindex.com/apple/swift-argument-parser/documentation/argumentparser (ExitCode, AsyncParsableCommand) ; https://no-color.org ;
  sysexits(3) ; [dom] §17-19 ; this repo's Rust cli-contract depth file (locate it under rules/rust-quality/).
Pin: the width of ExitCode and the exit path ArgumentParser takes (exit() vs return); the validation-error code per platform; stdout buffering when piped;
  the default SIGPIPE disposition in the Swift runtime on Linux.
Exemplar: swift-argument-parser@efd239f0055b:Sources/ArgumentParser/Utilities/Platform.swift:155-163;
  container@f70ecbb926d9:Sources/ContainerCommands/Application.swift:30,104-111,136,150; swiftly@c8cf2e35bfca:Sources/SwiftlyCore/ModeledCommandLine.swift:64,67,71.
Plant in fixtures/exit-codes-and-streams/ (one CLI target, variants behind flags):
  (a) `throw ExitCode(256)` gives `echo $?` 0 (red); the contract-table twin returns 1 (green).
  (b) `cli big | head -1; echo ${PIPESTATUS[0]}` gives 141 (red); the SIG_IGN plus EPIPE-handling twin exits with the contract code (green).
  (c) `cli >/dev/full; echo $?` gives 0 (red); the fflush plus ferror twin exits non-zero (green).
  (d) a top-level `await main()` that throws. Record the exit code against the @main twin.
  (e) print, then fatalError, piped to a file. Record whether the printed line is lost.
  (f) Ctrl-C delivered twice (`kill -INT` twice). Record the two-stage behaviour.
Decide: the Swift CLI exit-code table (the fleet contract, usage 64, Windows 160 noted); the SIGPIPE stance; the flush-and-ferror rule; the stream contract;
  the TTY and NO_COLOR helper; the reserved crash codes.
Env: ~/.cache/research-lang/swift-tools/run.sh (swift:6.4; rerun each plant with SWIFT_VERSION=6.3); every build/test/run uses --scratch-path "$SWIFT_SCRATCH/exit-codes-and-streams"; fixtures only under ~/.cache/research-lang/swift-tools/fixtures/exit-codes-and-streams/ (never /tmp); never build inside an exemplar; Linux only, so Apple/Windows claims are marked "unverified: read only" (owner Q7); quote each check verbatim with its red and green exit codes.
```

### Group `io`: Files, processes and formats (SW-IO) → `swift-io.md`

#### W2-11 `io/subprocess-contract`: swift-subprocess 1.0.1, Process pitfalls and child teardown

```text
Rows: M-G-06..M-G-09, M-I-06.
Fetch: https://github.com/swiftlang/swift-subprocess (README and the 1.0.0 and 1.0.1 release notes) ; the Subprocess Foundation proposal linked from that README ;
  https://developer.apple.com/documentation/foundation/process .
Pin: the 1.0.1 API: run() overloads, output-limit types, TerminationStatus cases per platform, the teardown sequence, platform options; the tools-version requirement (6.2).
Exemplar: swiftly@c8cf2e35bfca:Package.swift (exact 1.0.0 pin) and Sources/SwiftlyCore/ModeledCommandLine.swift:64-71 (environment overrides dropped);
  container@f70ecbb926d9 (process launch paths, located by grep); ocx-sdk-python@80136dde4162 (its process wrapper, per [cfg] §4).
Plant in fixtures/subprocess-contract/:
  (a) an early break from `.sequence` output on 1.0.0 vs 1.0.1. Count /proc/self/fd: the leak is red on 1.0.0 and green on 1.0.1.
  (b) Foundation.Process with 256 MiB of stdout read after waitUntilExit. It hangs, and `timeout 60` gives 124 (red); the concurrent-drain twin is green.
  (c) cancel the parent task while the child runs. `pgrep` still finds the child (red); the teardown twin leaves none (green).
  (d) output beyond the configured limit. Record the error.
  (e) the swiftly environment-override pattern. Show whether the overrides reach the child.
  (f) `sh -c` with interpolated input vs an argument array. The injection succeeds (red); the array twin is inert (green).
Decide: the requirement line for swift-subprocess; the wrapper shape the SDK will use (feeds wave 3 api/sdk-shape); the Process rules for legacy code;
  the injection rule and its grep.
Env: ~/.cache/research-lang/swift-tools/run.sh (swift:6.4; rerun each plant with SWIFT_VERSION=6.3); every build/test/run uses --scratch-path "$SWIFT_SCRATCH/subprocess-contract"; fixtures only under ~/.cache/research-lang/swift-tools/fixtures/subprocess-contract/ (never /tmp); never build inside an exemplar; Linux only, so Apple/Windows claims are marked "unverified: read only" (owner Q7); quote each check verbatim with its red and green exit codes.
```

#### W2-12 `io/files-and-paths`: Durable writes, content-addressed stores, path types and traversal

```text
Rows: M-G-01..M-G-05, M-G-17, M-G-18, M-G-19, M-I-04.
Fetch: https://github.com/apple/swift-system (FilePath) ; SE-0529 (FilePath in the stdlib: accepted, not in 6.4) via [shift] ; the swift-nio NIOFS docs ;
  this repo's Rust durable-state depth file.
Pin: how Data.write(.atomic) works on Linux (temp, rename, and no directory fsync); FileManager.replaceItemAt on Linux; NIOFS replaceItem;
  the availability of swift-system FilePath on 6.4 Linux; openat and O_NOFOLLOW through swift-system.
Exemplar: swift-foundation@aadd9259be07:Sources/FoundationEssentials/Data/Data+Writing.swift:403,560-585,669;
  containerization@3e7bc39e66b3:Sources/ContainerizationOCI/Content/ContentWriter.swift:50 and Sources/ContainerizationArchive/ArchiveReader.swift:260-400;
  swift-nio@e12881f2a691:Sources/NIOFS/FileSystem.swift (replaceItem) and Sources/_NIOFileSystem/FileSystem.swift:574; swiftly@c8cf2e35bfca:Sources/SwiftlyCore/FileLock.swift:34.
Plant in fixtures/files-and-paths/:
  (a) `strace -f -e trace=fsync,fdatasync,rename,renameat2` over a .atomic write. No fsync of the directory (red); the durable-helper twin fsyncs it (green).
  (b) a CAS write with a mismatching digest. A blob is left behind (red); the verify-then-rename twin leaves none (green).
  (c) a tar containing `../evil` and a symlink-then-file pair. Extraction writes outside the root (red); the guarded twin refuses (green).
  (d) `FilePath` without and with `import SystemPackage` on 6.4. Record the error text.
  (e) the file mode of a created file under umask 077 vs 022.
Decide: a verbatim durable-write helper of about 20 lines; the CAS write recipe; the path-type rule; the traversal guard; temp-file and permission rules;
  a Windows section marked unverified unless owner Q7 grants the host.
Env: ~/.cache/research-lang/swift-tools/run.sh (swift:6.4; rerun each plant with SWIFT_VERSION=6.3); every build/test/run uses --scratch-path "$SWIFT_SCRATCH/files-and-paths"; fixtures only under ~/.cache/research-lang/swift-tools/fixtures/files-and-paths/ (never /tmp); never build inside an exemplar; Linux only, so Apple/Windows claims are marked "unverified: read only" (owner Q7); quote each check verbatim with its red and green exit codes.
```

#### W2-13 `io/formats-and-determinism`: JSON determinism, digests, Foundation on Linux, clocks and String views

```text
Rows: M-A-03, M-A-04, M-A-05, M-G-10..M-G-16, M-I-05.
Fetch: https://github.com/opencontainers/image-spec/blob/main/descriptor.md (digest grammar) ; https://github.com/swiftlang/swift-foundation (JSONEncoder, FoundationEssentials) ;
  https://developer.apple.com/documentation/swift/string (Unicode canonical equivalence).
Pin: JSONEncoder outputFormatting on Linux 6.4 (.sortedKeys, .withoutEscapingSlashes) and its default date strategy; what FoundationEssentials provides;
  SWIFT_DETERMINISTIC_HASHING; the exact Linux error when FoundationNetworking is not imported.
Exemplar: swift-foundation@aadd9259be07:Sources/FoundationEssentials/JSON/JSONWriter.swift:274-306 and Package.swift:41-45;
  containerization@3e7bc39e66b3:Sources/ContainerizationOCI/Content/Digest.swift:80-91,119-131;
  swift-container-plugin@a9646b8d4dca:Sources/ContainerRegistry/ImageReference+Digest.swift:36-45 and Sources/containertool/gzip.swift:38-61.
Plant in fixtures/formats-and-determinism/:
  (a) JSON emitted by iterating a Dictionary differs between two runs, shown by cmp (red); the .sortedKeys twin is identical (green).
  (b) a digest carrying a combining mark is accepted by a String or Character comparison (red); the utf8 grammar-check twin rejects it (green).
  (c) Date with the default strategy encodes a reference-date double (record the value). The .iso8601 twin is stable.
  (d) URLSession without the FoundationNetworking guard fails on Linux (red); the guarded twin builds (green).
  (e) number formatting under LANG=de_DE.UTF-8 changes the machine output (red); the POSIX-locale twin is stable (green).
Decide: the canonical JSON recipe; a verbatim digest parse-and-compare function; the Foundation import rule (confirm conflict 12); the Date and Codable policy;
  the clock-choice table; the String-view rule for protocol parsing.
Env: ~/.cache/research-lang/swift-tools/run.sh (swift:6.4; rerun each plant with SWIFT_VERSION=6.3); every build/test/run uses --scratch-path "$SWIFT_SCRATCH/formats-and-determinism"; fixtures only under ~/.cache/research-lang/swift-tools/fixtures/formats-and-determinism/ (never /tmp); never build inside an exemplar; Linux only, so Apple/Windows claims are marked "unverified: read only" (owner Q7); quote each check verbatim with its red and green exit codes.
```

## Staged for wave 3

Twelve dives. Every brief marked `REVISE AFTER WAVE 2` names the wave-2 outputs it must re-read first; revise it before launch. A brief without the mark can run as written.
Both wave-3 `cli` and wave-2 `cli` dives consolidate into `swift-cli.md`.

#### W3-1 `language/era-and-idioms` (SW-LANG): stale idioms, existentials, floor-raising syntax and Linux-only breaks. REVISE AFTER WAVE 2

```text
REVISE AFTER WAVE 2: import the verbatim K-07 grep set from gates/format-and-lint, and the hatch rules from concurrency/isolation-and-sendable.
Rows: M-A-01, M-A-02, M-A-06, M-A-07, M-A-09, M-A-11, M-A-12, M-A-14.
Fetch: the "Use X not Y" table in [shift]; the Gallagher and SwiftFairy sources in [prac] §6; https://www.swift.org/documentation/api-design-guidelines/ ;
  the 6.3 and 6.4 release notes at https://www.swift.org/blog/ .
Pin: the release that introduced each syntax form (weak let, ~Sendable, @diagnose, raw identifiers, InlineArray literals), confirmed by compiling each form on 6.3 and 6.4.
Exemplar: [shape] Axes 1-3; Nuke@d5548dd61395:Sources/Nuke/ImageContainer.swift:147; IceCubesApp@2ad6e6891258:Packages/Timeline/Sources/Timeline/actors/TimelineCache.swift:59;
  swift-collections@935f696a549a:Sources/DequeModule/Deque/Deque+Collection.swift:170.
Plant in fixtures/era-and-idioms/:
  (a) one file of pre-6.0 tells. The grep set hits each one (red) and is silent on the modern twin (green).
  (b) a package at tools 6.2 that uses ~Sendable. It fails on 6.3 (red); the twin without it is green.
  (c) `import Combine` in a Linux target. Record the build error.
  (d) the type-checker-timeout expression from [fail] §2.10, with its split-expression twin.
Decide: the stale-idiom table with greps; the some/any/generic rule; the floor-raising syntax list; the final/open rule; the [weak self] rule;
  the Linux-unavailable module list.
Env: ~/.cache/research-lang/swift-tools/run.sh (swift:6.4; rerun each plant with SWIFT_VERSION=6.3); every build/test/run uses --scratch-path "$SWIFT_SCRATCH/era-and-idioms"; fixtures only under ~/.cache/research-lang/swift-tools/fixtures/era-and-idioms/ (never /tmp); never build inside an exemplar; Linux only, so Apple/Windows claims are marked "unverified: read only" (owner Q7); quote each check verbatim with its red and green exit codes.
```

#### W3-2 `api/library-api-shape` (SW-API): access, Sendable intent, evolution, protocols and library logging. REVISE AFTER WAVE 2

```text
REVISE AFTER WAVE 2: take the Sendable rules from concurrency/isolation-and-sendable and the typed-throws rule from errors/error-contracts.
Rows: M-D-01..M-D-06, M-D-08.
Fetch: https://www.swift.org/documentation/api-design-guidelines/ ; SE-0409 (access-level imports) https://github.com/swiftlang/swift-evolution/blob/main/proposals/0409-access-level-on-imports.md ;
  the extensible-enums proposal status in [shift] ; https://www.swift.org/blog/library-evolution/ ; the swift-log README on libraries vs applications.
Pin: InternalImportsByDefault behaviour on 6.4; whether `@nonexhaustive` or an equivalent ships in 6.4 (compile it); swift-log 1.16.1 Logger.current and the double-bootstrap crash.
Exemplar: vapor@bf77fc69b142:Package.swift:246-252 (Vapor 5 features) and Sources/Vapor/Application+State.swift:55;
  swift-package-manager@5546f44a3b52:Fixtures/Miscellaneous/LibraryEvolution/Package.swift:9; swift-log@4038b6a4f74a:Package.swift:66-71.
Plant in fixtures/library-api-shape/:
  (a) add a case to a public enum. A consumer's exhaustive switch breaks (red); the extensible twin builds (green).
  (b) call LoggingSystem.bootstrap twice. Record the trap; the Logger-parameter twin runs clean.
  (c) a public type used across modules without a Sendable annotation. Record the diagnostic.
Decide: access and import rules; explicit Sendable on public types; the enum evolution rule; the speculative-protocol heuristic; the library logging rule;
  the deprecation recipe.
Env: ~/.cache/research-lang/swift-tools/run.sh (swift:6.4; rerun each plant with SWIFT_VERSION=6.3); every build/test/run uses --scratch-path "$SWIFT_SCRATCH/library-api-shape"; fixtures only under ~/.cache/research-lang/swift-tools/fixtures/library-api-shape/ (never /tmp); never build inside an exemplar; Linux only, so Apple/Windows claims are marked "unverified: read only" (owner Q7); quote each check verbatim with its red and green exit codes.
```

#### W3-3 `api/sdk-shape` (SW-API): Swift SDK wrapping the ocx CLI. REVISE AFTER WAVE 2

```text
REVISE AFTER WAVE 2: build on cli/exit-codes-and-streams (the exit table) and io/subprocess-contract (the wrapper shape and TerminationStatus).
Rows: M-D-09..M-D-12.
Fetch: ocx-sdk-python@80136dde4162 (its process wrapper, error types and JSON envelope, per [cfg] §4); this repo's Go api-design rows GO-API-18..20;
  https://github.com/swiftlang/swift-subprocess .
Pin: the ocx JSON envelope fields the Python SDK decodes; the TerminationStatus cases on Linux and Windows; the coverage command from testing/test-style.
Exemplar: ocx-sdk-python@80136dde4162 (cite file:line for discovery, run and decode); swiftly@c8cf2e35bfca:Sources/SwiftlyCore/ModeledCommandLine.swift:64-71.
Plant in fixtures/sdk-shape/: a fake `ocx` shell script that emits an envelope, exits with codes 0, 1, 64 and 256-wrapped values, and kills itself with SIGTERM.
  The SDK test maps each case; the raw passthrough of `.signaled` is red, and 128+n is green (pending owner Q6).
  Unknown envelope fields are tolerated; a missing required field gives a typed error.
Decide: the SDK module layout; binary discovery (PATH, an env override, an explicit path); the error type; the exit and signal mapping;
  the dependency budget and coverage gate (owner Q4).
Env: ~/.cache/research-lang/swift-tools/run.sh (swift:6.4; rerun each plant with SWIFT_VERSION=6.3); every build/test/run uses --scratch-path "$SWIFT_SCRATCH/sdk-shape"; fixtures only under ~/.cache/research-lang/swift-tools/fixtures/sdk-shape/ (never /tmp); never build inside an exemplar; Linux only, so Apple/Windows claims are marked "unverified: read only" (owner Q7); quote each check verbatim with its red and green exit codes.
```

#### W3-4 `network/registry-clients` (SW-NET): HTTP client choice, credentials, timeouts and OCI registry flows. REVISE AFTER WAVE 2

```text
REVISE AFTER WAVE 2: take the timeout pattern from concurrency/tasks-and-cancellation and the digest function from io/formats-and-determinism.
Rows: M-H-01..M-H-10.
Fetch: https://github.com/swift-server/async-http-client ; https://github.com/opencontainers/distribution-spec/blob/main/spec.md ;
  https://distribution.github.io/distribution/spec/auth/token/ ; the URLSession on Linux material in [dom] #17.
Pin: AHC timeout configuration fields, redirect configuration and shutdown API; how URLSession redirects behave on Linux 6.4; proxy environment support in AHC.
Exemplar: async-http-client@017115279d09:Sources/AsyncHTTPClient/RedirectState.swift:139-143;
  containerization@3e7bc39e66b3:Sources/ContainerizationOCI/Client/RegistryClient.swift:48-54,60,141-143,202,208; swift-container-plugin@a9646b8d4dca:Sources/ContainerRegistry.
Plant in fixtures/registry-clients/: a local registry:2 container plus a redirecting HTTP server (Python http.server is fine).
  (a) URLSession follows a cross-origin redirect and sends Authorization (red); AHC strips it (green). This is the chase-the-surprise item.
  (b) a streamed blob whose digest mismatches is committed (red); the verify-before-commit twin refuses it (green).
  (c) an HTTPClient that is never shut down. Record the deinit precondition.
Decide: the client choice; the credential rule; the timeout and retry defaults; the token-auth flow; the HTTPClient lifetime; streamed verification;
  proxy and TLS notes.
Env: ~/.cache/research-lang/swift-tools/run.sh (swift:6.4; rerun each plant with SWIFT_VERSION=6.3); every build/test/run uses --scratch-path "$SWIFT_SCRATCH/registry-clients"; fixtures only under ~/.cache/research-lang/swift-tools/fixtures/registry-clients/ (never /tmp); never build inside an exemplar; Linux only, so Apple/Windows claims are marked "unverified: read only" (owner Q7); quote each check verbatim with its red and green exit codes.
```

#### W3-5 `security/untrusted-input` (SW-SEC): parser limits, memory safety, C seams, secrets and scanning. REVISE AFTER WAVE 2

```text
REVISE AFTER WAVE 2: take the conversion rule from errors/traps-and-unwraps and the traversal guard from io/files-and-paths, so neither is repeated.
Rows: M-I-03, M-I-07, M-I-08, M-I-09, M-I-10, M-I-12.
Fetch: SE-0458 https://github.com/swiftlang/swift-evolution/blob/main/proposals/0458-strict-memory-safety.md ; the Hummingbird and swift-crypto advisories in [fail] ;
  https://github.com/apple/swift-crypto ; GitHub Advisory Database support for the Swift ecosystem.
Pin: the diagnostics that .strictMemorySafety() emits on 6.4, and the `unsafe` expression syntax; which scanners understand Package.resolved.
Exemplar: swift-collections@935f696a549a:Package.swift:111 (StrictMemorySafety); sourcekit-lsp@c6ce93d5f8aa:Sources/SourceKitD/SKDRequestDictionary.swift:57 and SourceKitDCore.swift:82;
  vapor@bf77fc69b142:Package.swift:246-252.
Plant in fixtures/untrusted-input/:
  (a) a recursive JSON decoder fed nesting 100k deep overflows the stack (red); the depth-limited twin is green.
  (b) withUnsafeBytes escaping a pointer. StrictMemorySafety flags it (red) and is silent on the scoped twin (green).
  (c) a Logger with an Authorization header in its metadata. The redaction grep hits it (red) and is silent on the redacted twin.
Decide: the size and recursion limits; when StrictMemorySafety is enabled (confirm conflict 10); the C-seam rules; secret redaction; the crypto and random rule;
  the scanning recommendation.
Env: ~/.cache/research-lang/swift-tools/run.sh (swift:6.4; rerun each plant with SWIFT_VERSION=6.3); every build/test/run uses --scratch-path "$SWIFT_SCRATCH/untrusted-input"; fixtures only under ~/.cache/research-lang/swift-tools/fixtures/untrusted-input/ (never /tmp); never build inside an exemplar; Linux only, so Apple/Windows claims are marked "unverified: read only" (owner Q7); quote each check verbatim with its red and green exit codes.
```

#### W3-6 `release/binaries-and-platforms` (SW-REL): static SDK, glibc floor, Swift Build paths, Wasm and Windows. REVISE AFTER WAVE 2

```text
REVISE AFTER WAVE 2: take the CI matrix from gates/warnings-and-ci.
Rows: M-N-01..M-N-04, M-N-10, M-N-12.
Fetch: https://www.swift.org/documentation/articles/static-linux-getting-started.html ; https://www.swift.org/documentation/articles/wasm-getting-started.html ;
  swift-build issue #1764 ; https://github.com/swiftlang/swift-build .
Pin: the SDK ids installed under ~/.cache/research-lang/swift-tools/sdks (`swift sdk list`); `--show-bin-path` under Swift Build; the glibc symbol floor of binaries built in the 6.4 image.
Exemplar: [eco] §9 (sizes and the static link) and [pkg] E7/E8; swift-aws-lambda-runtime@8abd464310c7 (its static build); swiftly@c8cf2e35bfca (its release workflow, located by grep).
Plant in fixtures/binaries-and-platforms/: one CLI.
  (a) `--static-swift-stdlib` under the default build system fails to link (red, chase-the-surprise); the `--build-system native` twin links (record).
  (b) `--swift-sdk x86_64-swift-linux-musl` gives a binary that `file` reports as statically linked (green).
  (c) `objdump -T` shows a GLIBC_2.43-or-later symbol on the dynamic build (red against a floor of 2.35).
  (d) a script that hardcodes .build/release. It misses the Swift Build output path (red); the `--show-bin-path` twin works (green).
  (e) a Wasm build of a pure library.
Decide: the Linux release recipe; the glibc floor check; the path rule; Wasm guidance; the Windows section (unverified unless owner Q7).
Env: ~/.cache/research-lang/swift-tools/run.sh (swift:6.4; rerun each plant with SWIFT_VERSION=6.3); every build/test/run uses --scratch-path "$SWIFT_SCRATCH/binaries-and-platforms"; fixtures only under ~/.cache/research-lang/swift-tools/fixtures/binaries-and-platforms/ (never /tmp); never build inside an exemplar; Linux only, so Apple/Windows claims are marked "unverified: read only" (owner Q7); quote each check verbatim with its red and green exit codes.
```

#### W3-7 `release/release-pipeline` (SW-REL): toolchain pin, artifacts, SBOM, stamping, images and library tags. REVISE AFTER WAVE 2

```text
REVISE AFTER WAVE 2: build on binaries-and-platforms (wave 3, same group) and on the API-breakage gate from gates/warnings-and-ci.
Rows: M-N-05..M-N-08, M-N-14, M-N-15, M-P-03.
Fetch: this repo's go-release skill (the shape to mirror); https://www.swift.org/sswg/incubation-process.html ; the Swift Build SBOM output described in [eco] §9.
Pin: the SBOM flags and output path (out/Products/<cfg>/sboms/, CycloneDX 1.7 or SPDX 3.0.1); whether two clean builds are byte-identical;
  the .swift-version semantics in swiftly.
Exemplar: swiftly@c8cf2e35bfca:Sources/Swiftly/Use.swift:191,235; containerization@3e7bc39e66b3:.swift-version; [pkg] E3/E4 (tagging and stamping).
Plant in fixtures/release-pipeline/:
  (a) build twice and compare the sha256 of the binary and the SBOM. Record the differences.
  (b) a version stamped through a generated file or a plugin. Show that `cli --version` matches the tag.
  (c) a two-stage static Dockerfile (scratch). Show the image runs.
Decide: the release artifact set and naming; checksums; the SBOM recommendation; the stamping recipe; the toolchain pin; the library tagging rules;
  and the swift-release skill's procedure outline (M-P-03).
Env: ~/.cache/research-lang/swift-tools/run.sh (swift:6.4; rerun each plant with SWIFT_VERSION=6.3); every build/test/run uses --scratch-path "$SWIFT_SCRATCH/release-pipeline"; fixtures only under ~/.cache/research-lang/swift-tools/fixtures/release-pipeline/ (never /tmp); never build inside an exemplar; Linux only, so Apple/Windows claims are marked "unverified: read only" (owner Q7); quote each check verbatim with its red and green exit codes.
```

#### W3-8 `cli/services-and-config` (SW-CLI): log bootstrap, configuration precedence and ServiceGroup signals. REVISE AFTER WAVE 2

```text
REVISE AFTER WAVE 2: align with the stream contract and exit table from cli/exit-codes-and-streams.
Rows: M-F-09, M-F-10, M-F-14.
Fetch: https://github.com/swift-server/swift-service-lifecycle (2.12.1) ; https://github.com/apple/swift-log (1.16.1) ; https://github.com/apple/swift-configuration if [dom] lists it ;
  https://specifications.freedesktop.org/basedir-spec/latest/ .
Pin: the ServiceGroupConfiguration defaults (gracefulShutdownSignals and cancellationSignals are [] per [dom], ServiceGroupConfiguration.swift:140-143);
  what UnixSignals provides on Windows; the semantics of LoggingSystem.bootstrap.
Exemplar: container@f70ecbb926d9:Sources/ContainerCommands/Application.swift:30; swift-service-lifecycle@c55297914e26:Package.swift:77-84 and Sources/UnixSignals/UnixSignalsSequence.swift:151;
  hummingbird@1bd3b407fb47:Sources/HummingbirdCore/Server/Server.swift:117.
Plant in fixtures/services-and-config/:
  (a) a ServiceGroup with default config. SIGTERM does not trigger a graceful shutdown (red); the twin with [.sigterm] does (green).
  (b) a config value set by flag, env and file. A precedence test pins the order.
Decide: the log bootstrap rule; the configuration precedence and XDG paths; the ServiceGroup signal rule.
Env: ~/.cache/research-lang/swift-tools/run.sh (swift:6.4; rerun each plant with SWIFT_VERSION=6.3); every build/test/run uses --scratch-path "$SWIFT_SCRATCH/services-and-config"; fixtures only under ~/.cache/research-lang/swift-tools/fixtures/services-and-config/ (never /tmp); never build inside an exemplar; Linux only, so Apple/Windows claims are marked "unverified: read only" (owner Q7); quote each check verbatim with its red and green exit codes.
```

#### W3-9 `apple/reading-heuristics` (SW-APPLE): read-only heuristics for Apple app code. REVISE AFTER WAVE 2

```text
REVISE AFTER WAVE 2: apply the defaultIsolation decision from concurrency/isolation-and-sendable to app targets.
Rows: M-J-01..M-J-05, M-J-10.
Apple-only: there is no macOS and no Xcode, so every deliverable is a grep or a reading heuristic and says so; every row is marked "unverified: read only".
Fetch: WWDC25 session 268 ; the Xcode 26/27 release notes on SWIFT_DEFAULT_ACTOR_ISOLATION and SWIFT_APPROACHABLE_CONCURRENCY ;
  https://developer.apple.com/documentation/observation ; the Wals and AvdLee sources in [prac] (stale points flagged).
Pin: the build-setting names and values in .pbxproj and .xcconfig; the default language mode of Xcode 27 projects ([prac]: Swift 5).
Exemplar: element-x-ios@14e33866ced2:AGENTS.md:288 and .swiftlint.yml:75; IceCubesApp@2ad6e6891258:Packages/Timeline/Package.swift:41-42; the pbxproj settings counted in [cfg] §2.4.
Plant in fixtures/reading-heuristics/: a pbxproj excerpt and SwiftUI files carrying the tells. Each grep hits its tell (red) and is silent on the clean twin (green).
  Compile-level claims stay unverified.
Decide: the read-only depth file: the build-setting map, @Observable vs ObservableObject, the SwiftUI tells, availability drift, Combine guidance.
Env: ~/.cache/research-lang/swift-tools/run.sh (swift:6.4; rerun each plant with SWIFT_VERSION=6.3); every build/test/run uses --scratch-path "$SWIFT_SCRATCH/reading-heuristics"; fixtures only under ~/.cache/research-lang/swift-tools/fixtures/reading-heuristics/ (never /tmp); never build inside an exemplar; Linux only, so Apple/Windows claims are marked "unverified: read only" (owner Q7); quote each check verbatim with its red and green exit codes.
```

#### W3-10 `bazel/rules-swift` (BZL-SWIFT): rules_swift 4.2.1 for the bazel-quality depth file

```text
Rows: M-O-01..M-O-07, M-O-09, M-O-10.
Fetch: https://github.com/bazelbuild/rules_swift (tag 4.2.1, doc/ and MODULE.bazel) ; https://github.com/cgrindel/rules_swift_package_manager ;
  this repo's rules/bazel-quality index and its other per-language depth files (the shape to match).
Pin: the supported Bazel range (8-10 per [eco]); swift toolchain registration on Linux; the CC=clang requirement; the feature names (swift.enable_v6 and the others);
  the -debug-module-path drift between docs and code.
Exemplar: rules_swift@<sha from swift-audit/scratch/exemplar-shas.md>:MODULE.bazel and .swift-version; the other Bazel-using repos among the 5/40 in [eco].
Toolchain: there is no bazel under ~/.cache/research-lang. Install it from the ocx index into ~/.cache/research-lang/bazel-tools.
  If that fails, mark every row "unverified: read only" and say so in the first line.
Plant in fixtures/rules-swift/: a swift_library plus a swift_binary plus a swift_test (Swift Testing).
  The build without CC=clang fails (red; record the error); with it the build is green. swift.enable_v6 turns on a Swift 6 diagnostic.
Decide: the "if you adopt Bazel for Swift" framing; toolchain registration; the swift_library attribute rules; the feature map; rules_swift_package_manager guidance;
  routing keywords for the bazel-quality index; the publish.toml bump to 0.4.0.
Env: ~/.cache/research-lang/swift-tools/run.sh (swift:6.4; rerun each plant with SWIFT_VERSION=6.3); every build/test/run uses --scratch-path "$SWIFT_SCRATCH/rules-swift"; fixtures only under ~/.cache/research-lang/swift-tools/fixtures/rules-swift/ (never /tmp); never build inside an exemplar; Linux only, so Apple/Windows claims are marked "unverified: read only" (owner Q7); quote each check verbatim with its red and green exit codes.
```

#### W3-11 `procedures/upgrade-procedure` (SW-CORE): the swift-upgrade skill procedure. REVISE AFTER WAVE 2

```text
REVISE AFTER WAVE 2: built from concurrency/isolation-and-sendable (fix ladder), package/manifest-policy (floors, features) and gates/warnings-and-ci.
Rows: M-P-01.
Fetch: https://www.swift.org/migration/documentation/migrationguide/ ; the `swift package migrate` docs ; this repo's go-upgrade skill (the shape to mirror) ;
  the skill prior art in [prac] (AvdLee, with stale points flagged).
Pin: the `swift package migrate --to-feature` behaviour on 6.4; the order of enabling upcoming features before the switch to Swift 6 mode; the toolchain bump steps via .swift-version and the CI image.
Exemplar: a Swift 5-mode exemplar from [conc] Axis 6 (choose one with fewer than 50 files) as a dry run, copied into the fixtures dir. Never build inside the exemplar.
Plant in fixtures/upgrade-procedure/: copy the chosen package and run the procedure step by step on 6.4. Record each step's diagnostics count.
  The final state builds in Swift 6 mode with zero new hatches (red if a hatch was added).
Decide: the step list, with each step's verification command; the skill description, naming "Swift 6 concurrency migration"; the stop conditions; what goes in references/.
Env: ~/.cache/research-lang/swift-tools/run.sh (swift:6.4; rerun each plant with SWIFT_VERSION=6.3); every build/test/run uses --scratch-path "$SWIFT_SCRATCH/upgrade-procedure"; fixtures only under ~/.cache/research-lang/swift-tools/fixtures/upgrade-procedure/ (never /tmp); never build inside an exemplar; Linux only, so Apple/Windows claims are marked "unverified: read only" (owner Q7); quote each check verbatim with its red and green exit codes.
```

#### W3-12 `procedures/diagnose-runbook` (SW-CORE): the swift-diagnose skill runbook. REVISE AFTER WAVE 2

```text
REVISE AFTER WAVE 2: reuse the crash codes measured in errors/traps-and-unwraps and the hang plants from concurrency/tasks-and-cancellation.
Rows: M-P-02.
Fetch: https://github.com/swiftlang/swift/blob/main/docs/Backtracing.rst ; the swift-testing docs on exit tests ; this repo's go-diagnose skill (the shape to mirror).
Pin: SWIFT_BACKTRACE settings on Linux (enable, interactive=no, output format); the TSan and ASan invocation; how to capture a hang (backtrace on SIGQUIT? verify);
  the type-checker diagnostics flags (-Xfrontend -warn-long-expression-type-checking=<ms>).
Exemplar: [fail] §2.3, §2.5, §2.10 and §2.13; swift-nio@e12881f2a691:Sources/NIOCore/AsyncAwaitSupport.swift:28.
Plant in fixtures/diagnose-runbook/: one binary with a subcommand per failure: precondition (132 or 134), force unwrap, segfault in a C call (139), SIGPIPE (141),
  continuation leak (hang, 124 under timeout), data race (TSan), and a slow type-check.
  Each runbook step identifies its failure from the symptom alone. Red: the wrong branch is taken; green: the right one.
Decide: the runbook's decision tree; the references/ split; the description's trigger phrases.
Env: ~/.cache/research-lang/swift-tools/run.sh (swift:6.4; rerun each plant with SWIFT_VERSION=6.3); every build/test/run uses --scratch-path "$SWIFT_SCRATCH/diagnose-runbook"; fixtures only under ~/.cache/research-lang/swift-tools/fixtures/diagnose-runbook/ (never /tmp); never build inside an exemplar; Linux only, so Apple/Windows claims are marked "unverified: read only" (owner Q7); quote each check verbatim with its red and green exit codes.
```

## Deferred

Thirty-eight rows: no dive is commissioned for them in waves 2 or 3.

### Ready to author: no research needed

| M-ID | Why | Promotion |
|---|---|---|
| M-K-02 | Never-weaken is the house CORE-01. The Swift-specific weakenings (lowering the mode, `@preconcurrency`, an `@diagnose` with no reason) are listed in conflicts 4, 8 and 9. | Written at authoring time. |
| M-K-03 | Watched-red is the house CORE-02. | Written at authoring time. |
| M-K-05 | Generated-code exclusion paths are known: protobuf `*.pb.swift`, OpenAPI `Generated/`, plugin work dirs ([conc](swift-audit/exemplar-concurrency.md)). | Written at authoring time. |
| M-K-06 | Empty-output semantics are the house CORE-03. | Written at authoring time. |
| M-K-08 | Routing follows from this map's artifact decision and the sibling list in [cfg](swift-audit/config-inventory.md). | Written at authoring time. |

### Covered by a sibling: owner action needed

| M-ID | Why | Promotion |
|---|---|---|
| M-M-17 | `code-docs` already loads on `**/*.swift`, but has no `_public` detector or DocC tag handling ([cfg](swift-audit/config-inventory.md) C1). | Owner files an issue against `code-docs`. |
| M-M-18 | The `docs-quality` declaration example breaks `docc convert --warnings-as-errors` ([cfg](swift-audit/config-inventory.md) C7). | Owner files an issue against `docs-quality`. |

### Genuinely deferred

| M-ID | Why | Promotion |
|---|---|---|
| M-A-08 | `@specialize` spelling is unresolved and perf-only. | A fleet hot path appears. |
| M-A-10 | Value semantics are well known; agents rarely fail here. | Review finds class-for-model drift. |
| M-A-13 | File organisation is style only. | Never, unless reviews complain. |
| M-A-15 | Consumer macro use is low-risk. | The fleet adopts macro-heavy dependencies. |
| M-B-13 | `Task.immediate` is UI-oriented. | An app consumer appears. |
| M-C-07 | `Result` in async code is rare. | Never. |
| M-D-07 | Naming is covered by the API guidelines. | Never. |
| M-D-13 | `@retroactive` is rare. | A library hits it. |
| M-D-14 | Module split is case by case. | The SDK grows past one module. |
| M-E-14 | Snapshot testing is app-centric. | An app consumer appears. |
| M-E-15 | Mocking strategy is case by case. | Reviews show mock sprawl. |
| M-E-16 | Test layout is conventional. | Never. |
| M-F-12 | Completions are an ArgumentParser built-in. | A fleet CLI ships completions. |
| M-F-15 | Prompts are rare in fleet CLIs. | An interactive CLI appears. |
| M-G-20 | Large-file streaming is niche. | The OCI blob path needs it (then promote with M-H-06). |
| M-I-11 | Header validation is server-only. | A server consumer appears. |
| M-J-06 | Tuist and XcodeGen are app tooling. | An app consumer appears. |
| M-J-07 | Core Data and SwiftData are app-only. | An app consumer appears. |
| M-J-08 | XCFrameworks are Apple distribution. | An Apple binary SDK is needed. |
| M-J-09 | Keychain and entitlements are app-only. | An app consumer appears. |
| M-L-17 | Binary targets are rare (Apple). | Needed for a binary SDK. |
| M-L-18 | Registries are unused in the corpus. | Registry adoption. |
| M-L-19 | Test-only settings are minor. | Never. |
| M-L-20 | Local path dependencies are partly covered in W2-4 plant (a). | A monorepo consumer appears. |
| M-M-16 | Generated-artifact diff gates are niche. | A plugin-generated API appears. |
| M-N-09 | Universal macOS binaries need macOS. | A macOS runner is available. |
| M-N-11 | The Android SDK is unused by the fleet. | An Android consumer appears. |
| M-N-13 | Embedded Swift is out of scope. | An embedded consumer appears. |
| M-N-16 | The distro matrix is covered by the static SDK. | A dynamic-linking need appears. |
| M-O-08 | Static and cross builds under Bazel are a secondary of a secondary. | A Bazel Swift consumer appears. |
| M-P-04 | A review skill duplicates the rules. | The rules prove insufficient in review. |

## Questions for the owner

1. **Floors.** Libraries and the SDK: tools 6.2 and explicit Swift 6 mode. CLIs and servers: the current release (6.4).
   *Default:* as stated; wave 2 `package/manifest-policy` may lower the library floor with evidence.
2. **Formatter.** swift-format with a shipped `.swift-format` (4 spaces, 120 columns), and SwiftLint only as an optional `custom_rules` vehicle.
   *Default:* yes. Say if you want 2 spaces and 100 columns, the tool's defaults.
3. **CLIs and servers never set `defaultIsolation(MainActor.self)`.** Apps may.
   *Default:* yes.
4. **SDK budget.** The SDK depends only on the stdlib plus swift-subprocess, with 100% line coverage on Linux.
   *Default:* yes, matching `ocx-sdk-python`'s bar.
5. **Apple depth file stays read-only** (greps and heuristics, no compile checks).
   *Default:* yes, until a macOS runner is available.
6. **Signals.** The Swift SDK maps a signal-killed child to 128+n, as Go does; Python keeps it raw.
   *Default:* 128+n.
7. **Windows is first-class in the rules.** May dives verify on the WSL Windows host (`cmd.exe`), or stay "unverified: read only"?
   *Default:* unverified, because subagents do not touch the Windows host without your grant.
8. **Bazel.** Ship `rules/bazel-quality/swift.md` with a bump to bazel-quality 0.4.0, framed as secondary.
   *Default:* yes.

## Explicitly not a defect

- `nonisolated(unsafe) let` on generated protobuf statics, with a generator comment (`swift-protobuf@6c84c3dedac0:Sources/protoc-gen-swift/MessageStorageClassGenerator.swift:56`).
- `@preconcurrency import` of libc shims (Glibc, Musl, WinSDK): 347 sites ([conc](swift-audit/exemplar-concurrency.md)).
- `NIOLockedValueBox` and event-loop confinement inside the NIO stack (`async-http-client@017115279d09:Sources/AsyncHTTPClient/HTTPHandler.swift:548`).
- `@unchecked Sendable` on a visibly guarded type with a reason, and on conditional-Sendable containers (`swift-nio@e12881f2a691:Sources/NIOPosix/ThreadWindows.swift:26`).
- No formatter config in swift-foundation, swift-system or swift-testing: they follow upstream style by review ([gates](swift-audit/exemplar-quality-gates.md)).
- SwiftLint being absent (36/40 repos).
- swift-log's `unsafeFlags` on tools ≥6.2 (`swift-log@4038b6a4f74a:Package.swift:66-68`).
- `branch:` swift-syntax pins inside swiftlang's own repos, which co-release.
- XCTest in existing suites, and mixed XCTest plus Swift Testing trees.
- Dispatch used as an API-compatibility surface or for blocking C calls.
- `Package.resolved` committed by Point-Free libraries for their Xcode workspaces.
- A per-target `.swiftLanguageMode(.v5)` with a dated reason (`swift-build@2187330e13e7:Package.swift:345`).
- A `--build-system native` pin carrying an issue link and a removal condition.

## Frame corrections

- **Android was not dropped in 6.4.0.** `releases.json` lists the SDK with NDK r30. [shift](swift-topic-map/shifts.md)
- **H1: the tools version is not the language mode.** Community libraries are not on 5.x tools: the modal tools version is 6.2, and Alamofire pairs tools 6.4 with `.v5`. [pkg](swift-audit/exemplar-packaging-and-release.md), [conc](swift-audit/exemplar-concurrency.md) Axis 6
- **H2: `@unchecked Sendable` dominates (564/33), but only about half is avoidable** (12/25), and `Mutex` fits only 4. [conc](swift-audit/exemplar-concurrency.md) Axis 1
- **H3: the Swift Testing split is by repo age, not Apple vs community.** Community 66.8%, core 37.9%, Apple's newest repos 100%. [gates](swift-audit/exemplar-quality-gates.md) Axis 2
- **H4: swift-format dominates** (24 vs 7, 3.4×), and SwiftPM itself uses SwiftFormat. [gates](swift-audit/exemplar-quality-gates.md) Headline 1
- **H5 holds mostly.** Three libraries commit `Package.resolved` and six swiftlang tools ignore theirs. [pkg](swift-audit/exemplar-packaging-and-release.md) Headline 2
- **H6: Windows is tested in about half the corpus** (19–20/40), and Wasm (15) and Android (11) legs are common. [gates](swift-audit/exemplar-quality-gates.md), [eco](swift-topic-map/ecosystem-tooling.md)
- **H7: `MainActor.run` is rare in exemplars** (23 sites). It is an agent habit, not corpus practice. [conc](swift-audit/exemplar-concurrency.md)
- **H8: default MainActor is used by app-internal packages, never by published libraries.** [conc](swift-audit/exemplar-concurrency.md)
- **The frame's glob list missed `Package@swift-*.swift` and `.spi.yml`, and must not glob workflows.** [cfg](swift-audit/config-inventory.md) §2.4, [map] M1
- **Swift is not absent from the catalog.** `code-docs` already loads on `**/*.swift`, half-wired. [cfg](swift-audit/config-inventory.md) C1
- **The `docs-quality` declaration example conflicts with DocC.** [cfg](swift-audit/config-inventory.md) C7
- **Bazel is secondary for Swift** (5/40), and no bazel binary is available for research. [eco](swift-topic-map/ecosystem-tooling.md)
- **The `--static-swift-stdlib` recipe fails under the default Swift Build.** Use the static Linux SDK. [eco](swift-topic-map/ecosystem-tooling.md), [pkg](swift-audit/exemplar-packaging-and-release.md) E7/E8
- **The swift-syntax cost is pin policy, not compile time,** because prebuilts are on by default. [pkg](swift-audit/exemplar-packaging-and-release.md)
- **`FilePath`, `CommandLine.executablePath`, `withDeadline` and `defaultSwiftSettings` are not in 6.4,** despite WWDC26 claims. [shift](swift-topic-map/shifts.md), [prac](swift-topic-map/practitioner.md)
- **The 6.4 init template adds `ApproachableConcurrency` to library and test targets,** contrary to Wals and AvdLee. [shift](swift-topic-map/shifts.md) §17
- **rules_swift docs drift from its code** (`-debug-module-path`). [eco](swift-topic-map/ecosystem-tooling.md)
- **The Python SDK does not map signals,** so the "mirror ocx-sdk-python" premise needs owner Q6. [cfg](swift-audit/config-inventory.md) C5

## Wave 2 landed (2026-10-10)

Phase 6 harvest of wave 2: 13 dives, 7 consolidations, each read in full. Source keys for this section: [conc](swift-concurrency.md) · [gates](swift-gates.md) · [testing](swift-testing.md) · [package](swift-package.md) · [errors](swift-errors.md) · [cli](swift-cli.md) · [io](swift-io.md). Rule IDs are cited as the consolidations number them. Nothing below edits a consolidation; where two disagree, (e) names the ID whose text the drafters keep.

Orchestrator measurements made after the consolidations, binding on everything below:
- **[orch-SL]** SwiftLint `custom_rules` work on Linux with the SourceKit-enabled official image `ghcr.io/realm/swiftlint:0.65.1`, wrapper `~/.cache/research-lang/swift-tools/swiftlint-sk.sh lint --no-cache ...`: a planted `DispatchSemaphore(` custom rule exit 2, twin exit 0 (fixture `~/.cache/research-lang/swift-tools/fixtures/orch-swiftlint/`). The static binary on `run.sh`'s PATH skips `custom_rules` and every SourceKit rule with only a warning and exit 0. What is left open is advisory vs gate, not whether it works.
- **[orch-TSan]** `run.sh` now passes `--security-opt seccomp=unconfined` (`run.sh:6,14`), so `swift test --sanitize=thread` runs; the `Mutex` false-positive question is answerable now.
- **[orch-env]** No macOS host, no Windows Swift toolchain, no `swift:6.2` image. Questions that need one are measurement the corpus cannot supply (owner Q7 default: `unverified: read only`).

### (a) Per group

| Group | Consolidation | IDs | MUST | Conflicts resolved | Follow-ups named |
|---|---|---|---|---|---|
| concurrency | [swift-concurrency.md](swift-concurrency.md) | 29 (SW-CONC-01..29) | 13 | 16 | Darwin libdispatch; TSan on `Mutex` code; backpressure (`AsyncChannel`); accept-loop caps; 6.5 re-check (`withDeadline`); testing concurrent code (to SW-TEST) |
| gates | [swift-gates.md](swift-gates.md) | 25 (SW-GATE-01..25) | 10 | 12 | coverage gate (already answered by SW-TEST-16); `Never*` on changed files only; sanitizer and benchmark legs; `swift_flags` fall-through (needs a real Actions run); M-M-16, M-M-09 |
| testing | [swift-testing.md](swift-testing.md) | 17 (SW-TEST-01..17) | 9 | 11 | test-environment isolation (`setenv`/`chdir`); SDK seams and recorded fixtures (M-E-15/16); coverage exclusion; TSan suppression; unverified platforms |
| package | [swift-package.md](swift-package.md) | 38 (SW-PKG-01..38) | 12 | 17 | `swift:6.2` compiler; swift-syntax prebuilts on a listed distro; M-L-17..20; Xcode; SE-0540 and swift-syntax `lo`/`hi` re-checks |
| errors | [swift-errors.md](swift-errors.md) | 21 (SW-ERR-01..21) | 10 | 10 | SwiftLint carrier (closed by [orch-SL]); `render(_:)` for `URLError`; aggregate errors and the control/bidi sanitiser; `Result` and `- Throws:` docs; Embedded and arm64 trap codes; credentials in error text (M-I-09) |
| cli | [swift-cli.md](swift-cli.md) | 14 (SW-CLI-01..14) | 10 | 10 | `cli/services-and-config` (W3-8) plus unrowed Rust CLI-03/04/08/09/10/14; root-level `main()` hook; Windows/WASI exit path; handled SIGTERM with structured cleanup; SwiftLint on a dynamic binary (closed by [orch-SL]); swift-subprocess 1.0.1 child reset and arm64 |
| io | [swift-io.md](swift-io.md) | 32 (SW-IO-01..32) | 22 | 13 | Windows leg; macOS runner; static Linux SDK (musl); SDK wrapper completion (`CancellationError`, timeout precedence); SwiftLint with SourceKit (closed by [orch-SL]); crash injection; M-G-20 streaming, M-G-11 size |
| **total** | 7 files | **176** | **86** | **89** | 38 |

MUST tallies, recounted from the headings: conc 01, 02, 07, 08, 09, 10, 11, 13 (library/SDK/CLI/server), 15, 17, 21, 22, 28; gates 01, 02, 05, 06, 09, 10, 12, 13, 14, 20; testing 01, 02, 03, 04, 05, 10 (library/SDK), 11, 15, 16 (SDK); package 01, 04, 06, 07, 09, 10, 11, 14, 24, 26, 28, 29; errors 05, 06, 08, 09, 10, 11, 14, 16, 17, 20 (library/SDK); cli 01, 02, 03, 04, 05, 07, 08, 09, 10, 14; io 01, 02, 03, 05, 06, 07, 08, 09, 10, 12, 13, 14, 15, 18, 19, 20, 21, 23, 24, 25, 26, 30.

### (b) Surprises, each with a verdict

Verdict keys: **promote** (a next-wave dive chases it), **fold** (a staged brief or a group revision absorbs it), **defer** (recorded against an M-ID), **reject** (already a rule, or wrong). "Folded-in-wave-2" means the consolidation already turned it into a rule.

**concurrency**
- `.treatWarning("ExplicitSendable", as: .error)` and `-warnings-as-errors` leave the build at exit 0 (I-V18, SW-CONC-04) while `swiftc -Werror ExplicitSendable` exits 1 (WC R20, SW-GATE-17). **Promote** into `gates/lint-carriers-and-sanitizers`: two consolidations give opposite gate verdicts (contradiction 1).
- A correct `Mutex` class reports one `Swift access race` under TSan on 6.3 and 6.4 ([conc] conflict 8). **Promote** into `gates/lint-carriers-and-sanitizers`: [orch-TSan] makes suppression answerable now, and SW-CONC-27, SW-TEST-17 and Q-T2 all wait on it.
- `LIBDISPATCH_COOPERATIVE_POOL_STRICT=1` is a no-op on Linux ([conc] conflict 9). Reject (folded-in-wave-2: SW-CONC-21).
- `DispatchQueue.global()` is width-limited on Linux and the semaphore plant hangs between 48 and 56 concurrent waits (R7, [conc] conflict 4). Reject (folded-in-wave-2: SW-CONC-21 and the E04 grep). The Darwin half is residue.
- The 6.4 init template writes `ApproachableConcurrency` into library and test targets ([conc] conflict 14). Reject (folded: SW-CONC-12, SW-PKG-16).
- `NonisolatedNonsendingByDefault` changes behaviour on existing code (SW-CONC-07, "never paste into existing code"). Reject (folded). Its effect on test helpers: **fold** into `testing/isolation-and-seams`.
- A typed-throws `Task { () throws(E) in … }` crashes swift-frontend in IRGen on 6.3 and 6.4 (T-V42, SW-CONC-03). **Fold** into `procedures/upgrade-and-diagnose` as a known-crash entry; dated re-check at each toolchain bump.
- 586 bare tasks in two apps make SW-CONC-13 unusable as an app MUST ([conc] conflict 15). Reject (folded: MUST for library/SDK/CLI/server, SHOULD with `fire-and-forget:` for apps, owner default 2).

**gates**
- `swift format lint` exits 0 on findings without `--strict`. Reject (folded-in-wave-2: SW-GATE-01 step 1).
- The DocC gate is vacuous without `.spi.yml`. Reject (folded: SW-GATE-01 step 5 and the `.spi.yml` glob).
- `-Werror $GROUP` enables a default-suppressed group ([gates] R20). Reject (folded: SW-GATE-17). The SwiftPM spelling of the same is **promoted** with the ExplicitSendable item above.
- The K-07 sleep entry E08 misses `usleep`, `clock.sleep` and bare `sleep(1)` (testing C3: 4 of 7). **Fold** into `gates/lint-carriers-and-sanitizers`: the gate block takes SW-TEST-03's combined grep (contradiction 7).
- The K-07 exit entry E16 (`[^.A-Za-z_]exit(`) misses `Glibc.exit(`, `Darwin.exit(` and `_exit(`, the exact forms SW-CLI-03 found in `container@f70ecbb926d9:Sources/ContainerCommands/Container/ContainerRun.swift:168`. **Fold** into `gates/lint-carriers-and-sanitizers` (contradiction 8).
- [orch-SL]: `custom_rules` work in the SourceKit image; the static binary is a silent green. **Promote** into `gates/lint-carriers-and-sanitizers`: decide advisory vs gate, and make "the log says `Skipping enabled rule`" a failing check (a rule candidate for SW-GATE).

**testing**
- Nuke is not a mixed XCTest/Testing tree: 0 XCTest files, 153 Testing files (testing C4 row). Reject (a map error; see Frame corrections).
- `env SWIFT_TESTING_XCTEST_INTEROP_MODE=complete` turns gate step 3 red where `limited` was green with two warnings (testing C1/C2, SW-TEST-10). **Fold** into `gates/lint-carriers-and-sanitizers`: the gate block carries the prefix (contradiction 12).
- Lines reachable only through a trapping child never count toward coverage (testing C6). Defer against M-E-14 (owner Q-T1 default: no trap-only lines in the SDK; whole-file exclusion in the jq filter). The line-exclusion question is **folded** into `testing/isolation-and-seams`.
- `setenv`/`unsetenv` appear in test files of 9 repos, and the Rust set bans them (TEST-05..09). **Promote** as `testing/isolation-and-seams`: a parallel Swift Testing run may race or crash, and SW-TEST-04 says nothing about process-global state.
- `.serialized(for:)` is SPI. **Fold** into `testing/isolation-and-seams`.

**package**
- The `swift:6.4` image is Ubuntu `resolute`, which SwiftPM's prebuilts list does not include, so "an exact prerelease pin defeats prebuilts" is an inference ([package] open 2). **Fold** into `release/binaries-and-platforms` (try `swift:6.4-noble`; if no listed-distro image pulls, it is residue).
- `swift package dump-package` names the key `swiftLanguageVersions`, and the map's M-L-01 jq is wrong. Reject (folded: SW-PKG section B filters).
- swift-service-lifecycle is at tools 6.1. Reject (folded); `cli/services-and-config` must not assume 6.2 manifest APIs in it.
- `unsafeFlags` at tools 6.2 no longer fails a consumer (WC R25/R26, SW-PKG-04, SW-GATE-14). Reject (folded).
- `StrictLanguageFeatures` is root-only and silent on a consumer (consumer exit 0, dependency-as-root exit 1, SW-PKG-02). Reject (folded); it also settles contradiction 15.

**errors**
- A trap exits 132 (SIGILL) on Linux x86_64, not 134; arm64 reports 133 in cited threads (SW-ERR-08, SW-CLI-02). Reject (folded); arm64 is residue.
- `URLError` renders as `(NSURLErrorDomain error -1001.)` through `localizedDescription` on Linux ([errors] open 2). **Fold** into `network/registry-clients`: the network family owns the error rendering of its client.
- swift-log contains 8 `throw error as! Failure` ([errors] C2). Reject (folded: SW-ERR-05 scoping).
- Marker comments (`swallow-ok:`, `invariant:`, `truncate-ok:`, `wrap-ok:`) have 0 corpus adoption. Defer to the SW-CORE index author (owner default 1: adopt and document).

**cli**
- `ExitCode(256)` exits 0 and `ExitCode(300)` exits 44. Reject (folded-in-wave-2: SW-CLI-01).
- An uncaught throw from top-level code or `main() async throws` exits 132 with an 88-line backtrace, not 1 as the map's chase list assumed. Reject (folded: SW-CLI-02); recorded in Frame corrections.
- `raise(sig)` from a cooperative-pool thread is dropped because libdispatch masks signals on workers (SW-CLI-10). Reject (folded).
- `@preconcurrency import Glibc` must come before `import Foundation`; the reverse order fails (t3 exit 0, t4 exit 1). Reject (folded: SW-CLI-07, which corrects its own dive).
- `Foundation.Process` children inherit `SIG_IGN` for SIGPIPE (SW-CLI-13). Reject (folded).
- The exit table drifts three ways (`ocx` 82-87, Python SDK 83-86, `grim` stops at 81, lore Rust file "83-99 unassigned"). Defer to owner D2 (report to the Rust set; not patched by this program).
- The root `static func main() async` override that sets SIG_IGN and runs the flush check is read from source, not run, including `--help` (`CleanExit`) and `>&-`. **Fold** into `cli/services-and-config`.

**io**
- `Data.write(.atomic)` loses a 0600 mode on Linux 6.3.3 and 6.4.0 and never fsyncs the directory (SW-IO-09, [io] C8). Reject (folded).
- `FileManager.replaceItemAt` destroys the new content on 6.3.3 (SW-IO-09). Reject (folded); also a frame correction.
- NIOFS `replaceItem` is `unlink` then `rename` despite its `rename(2)` docstring (SW-IO-09). Reject (folded).
- swift-subprocess 1.0.0 leaks one fd per early-break `.sequence` (+50 in 50 runs) and every pin in the corpus is wrong (SW-IO-06). Reject (folded).
- `Locale.current` is hard-wired `en_001` on Linux, so `LANG` is not a test lever ([io] C7). Reject (folded: SW-IO-15).
- A cancelled `run()` returns normally with `.signaled(9)` (SW-IO-27). **Promote** into `api/sdk-shape`: the SDK's `CancellationError` path and the timeout-vs-cancel precedence (Q-IO-3) are unimplemented and untested.
- The best CAS exemplar writes the digest-named path directly (`containerization@3e7bc39e66b3:Sources/ContainerizationOCI/Content/ContentWriter.swift:50`) and re-encodes an OCI index before hashing (`ImageStore+Export.swift:130`). Reject (folded: SW-IO-19, SW-IO-30); `network/registry-clients` reuses both recipes.
- M-G-20 (streaming large files without `Data`) was researched by no dive. **Fold** into `network/registry-clients` (blob download is the consumer that needs it).

### (c) Map rows affected

- **Covered and consolidated (sections B, C, E, F, G, L, M):** every row the wave-2 briefs listed now has an ID in one of the seven families. The map's checks are superseded by the consolidations' verbatim checks wherever they differ.
- **Premise corrected:** M-G-15 (`LANG` changes machine output: refuted on Linux, [io] C7; the rule survives as SW-IO-15); M-B-04 (`NSLock|os_unfair_lock` check replaced by the removal test, [conc] conflict 10); M-B-02 (StrictMemorySafety flags `nonisolated(unsafe)` uses, not every hatch, [conc] conflict 11); M-L-01 (jq key is `swiftLanguageVersions`); M-F-01..08 (top-level throw is 132, not 1).
- **Still uncovered, routed to wave 3:** M-F-09, M-F-10, M-F-14 plus M-F-12 and M-F-15 (`cli/services-and-config`); M-E-15, M-E-16 (`testing/isolation-and-seams`); M-G-20 (`network/registry-clients`); M-G-11 binary size (`release/binaries-and-platforms`); M-I-09 credentials in error text (`security/untrusted-input`); M-C-07 `Result` (defer, P3: the wave-2 typed-throws rules already define `Result`'s only required use across task boundaries).
- **Residue (no host):** M-G-03 and M-G-19 (Windows io), the macOS halves of M-B rows, Xcode rows of section L.
- **Still deferred:** M-M-16 (generated-artifact diff gate) and M-M-09 (license headers, shell checks), both P3; M-L-17..20 (binary targets, registries, test-only settings, `path:` dependencies), folded as a single question into `release/release-pipeline` for `path:` dependencies only, the rest P3.

### (d) Frame corrections

- SwiftLint `custom_rules` are not unusable on Linux: they work in the SourceKit image and fail open only on the static binary ([orch-SL]). The Q2 default ("SwiftLint only as an optional custom_rules vehicle") stands, amended to name the image and the `Skipping enabled rule` failure check (SW-GATE-11).
- The gates consolidation's "coverage gate unresearched" is wrong: SW-TEST-16 is a watched jq gate over `Sources/` lines.
- `Data.write(.atomic)` does not preserve the file mode on Linux 6.3.3 and 6.4.0, contrary to the domain scout (SW-IO-09, [io] C8).
- `FileManager.replaceItemAt` destroys the new content on Linux 6.3.3 (SW-IO-09); tools version does not matter, the toolchain's corelibs do ([io] C11).
- swift-service-lifecycle is at tools 6.1, not 6.2 ([package]).
- The `dump-package` key is `swiftLanguageVersions`; the map's M-L-01 jq reads a key that does not exist ([package]).
- `LIBDISPATCH_COOPERATIVE_POOL_STRICT` is a no-op on Linux, and `DispatchQueue.global()` is width-limited there ([conc] conflicts 4, 9).
- `Locale.current` is `en_001` on Linux regardless of `LANG` ([io] C7).
- NIOFS is not a product name to depend on; the file system module is `_NIOFileSystem` (SW-PKG underscored-product rule, owner default 5).
- The research image `swift:6.4` is Ubuntu `resolute`, so swift-syntax prebuilts are inactive in every wave-2 measurement ([package] open 2).
- "originHash makes SwiftPM re-resolve silently" (map, SW-GATE-03 rationale) overstates it; SW-PKG-26/28/29 hold the measured behaviour ([package] C3).
- Nuke is a Swift-Testing-only tree, not a mixed one ([testing]).
- "No exemplar reads `NO_COLOR`" (domain scout) is wrong: 7 read sites in 5 repos, 6 of them wrong ([cli] conflict NO_COLOR).
- A throw out of top-level code exits 132, not 1 ([cli] SW-CLI-02).
- Promoting `ExplicitSendable` to an error does not behave the same through SwiftPM (I-V18, exit 0) and `swiftc` (WC R20, exit 1); until measured, only the `swiftc` form is verified.

### (e) Cross-consolidation contradictions

Every ruleset was read against every other. Each pair below conflicts or overlaps; the resolution names which ID's text the drafters keep.

1. **SW-CONC-04 ("ExplicitSendable is a log audit, never a gate", I-V18) vs SW-GATE-17 ("promote via `-Xswiftc -Werror -Xswiftc ExplicitSendable` or `.treatWarning`", WC R20 on `swiftc` only).** **Resolution (provisional):** SW-GATE-17 keeps the text for the `-Xswiftc -Werror -Xswiftc ExplicitSendable` form only, marked "verified with `swiftc`"; the `.treatWarning` alternative is struck until measured. SW-CONC-04 keeps the annotation rule and its log audit, and its "never a gate" clause becomes a pointer to SW-GATE-17. `gates/lint-carriers-and-sanitizers` measures the SwiftPM forms; whichever exits non-zero becomes SW-GATE-17's check.
2. **SW-CONC-03 (CLI flag `-Xswiftc -Werror -Xswiftc NoUseUnstructuredThrowingTask` on 6.4 legs) vs SW-GATE-15 and [gates] C3 (name only groups present on the oldest leg; nothing further after the blanket flag).** **Resolution:** SW-GATE-15 keeps the text. The group is a default-on warning on 6.4, so SW-GATE-13's blanket flag already errors on it on 6.4 legs, and naming it fails the 6.3 leg with `unknown warning group`. SW-CONC-03 keeps its ID and its "what the group catches and misses" text, loses its own command, and points to SW-GATE-13 and to SW-CONC-13 as the floor-independent gate.
3. **SW-CONC-21, [errors] C8, [io] C4 and verdict 9, [cli] conflict "SwiftLint custom_rules" ("custom_rules cannot carry bans on Linux") vs SW-GATE-11 (optional `.swiftlint.yml` from the image or a dynamic binary, `Skipping enabled rule` = failed gate) vs [orch-SL].** **Resolution:** the greps of SW-GATE-10 stay the gate. SW-GATE-11 keeps the text; it was already right. SW-CONC-21's SwiftLint clause is reworded to "the static Linux binary skips `custom_rules` silently; use the SourceKit image (SW-GATE-11)", and the other three files' statements are read as describing the static binary only. Whether SW-GATE-11 graduates from advisory is decided in `gates/lint-carriers-and-sanitizers`.
4. **SW-CONC-12 (`InferIsolatedConformances` only for modules with global-actor public types or MainActor-default consumers) vs SW-PKG-08 (enable it with NNBD in every new package).** **Resolution:** SW-PKG-08 keeps the manifest text (one feature list for all new packages; in a module without global-actor-isolated conformances the feature changes nothing, which is reasoned from SE-0470, not measured). SW-CONC-12 keeps NNBD, `@concurrent` and the template-bundle clauses; its `InferIsolatedConformances` clause becomes a pointer to SW-PKG-08. `language/era-and-idioms` compiles one no-global-actor module with and without it on 6.3 and 6.4 to confirm the no-op.
5. **Duplicate ownership of manifest settings.**
   - `defaultIsolation`: SW-CONC-11 (MUST) keeps the text; SW-PKG-19 (SHOULD) becomes the manifest-grep pointer at the same severity as SW-CONC-11.
   - `ApproachableConcurrency`: SW-PKG-16 keeps the text; SW-CONC-12's template clause cites it.
   - `StrictLanguageFeatures`: SW-PKG-02 keeps the manifest form; SW-GATE-16 keeps the CI-flag form and cites SW-PKG-02.
   - `unsafeFlags` at tools 6.2: SW-PKG-04 and SW-GATE-14 agree. SW-PKG-04 keeps the manifest rule; SW-GATE-14 keeps the warning-flag rule.
6. **SW-GATE-03 rationale ("originHash re-resolves silently") vs SW-PKG-26/28/29 (the three-part lock gate, measured).** **Resolution:** SW-PKG-26/28/29 keep the lock policy and its rationale. SW-GATE-03 keeps only the CI wiring (`--force-resolved-versions` exactly when `Package.resolved` is tracked); its rationale sentence is replaced by a citation of SW-PKG-28.
7. **SW-GATE-10 E08 (`Task\.sleep`, `Thread\.sleep` over `Tests`) vs SW-TEST-03 (the combined `(^|[^[:alnum:]_])(usleep|nanosleep|sleep)\(` grep plus the `Task.sleep`/`clock.sleep` forms, 7 of 7 red).** **Resolution:** SW-TEST-03 keeps the text and the grep; E08 in the K-07 block is replaced verbatim by SW-TEST-03's grep (testing C3).
8. **SW-GATE-10 E16 (`[^.A-Za-z_]exit(`) vs SW-CLI-03 (`(^|[^.[:alnum:]_])exit\(` plus `\b(Glibc|Darwin|Musl|Foundation|ucrt)\.exit\(` plus `\b_exit\(`).** E16 misses qualified forms, `_exit(` and a call at column 1. **Resolution:** SW-CLI-03 keeps the text; E16 is replaced by SW-CLI-03's first grep verbatim, keeping E16's `--exclude-dir` operands.
9. **`Task.sleep(nanoseconds` has three owners:** SW-GATE-10 E07 (production code), SW-IO-16 (clock choice), [conc] failure mode 16. **Resolution:** SW-IO-16 keeps the rule text; E07 stays the gate invocation and cites SW-IO-16; the SW-CONC failure-mode row points to SW-IO-16. Same pattern for **E11 vs SW-IO-05** (`Process()`): SW-IO-05 keeps the rule, E11's wider alternatives (`NSTask`, `.launchPath`) stay the gate grep, and SW-IO-05's check cell cites E11.
10. **SW-GATE-10 E14 (`NSLock`, `os_unfair_lock`, `pthread_mutex`) vs [conc] conflict 10 (the map's lock grep replaced by the removal test).** **Resolution:** consistent once E14 is read as gates already labels the set: a review prompt on new code, not a ban. SW-CONC keeps the policy (the removal test and the guard check); E14 keeps its line.
11. **SW-GATE-01 step 3 (`swift test -Xswiftc -warnings-as-errors`) vs SW-TEST-10 (on 6.4+ legs with tools below 6.4, `env SWIFT_TESTING_XCTEST_INTEROP_MODE=complete swift test -Xswiftc -warnings-as-errors`).** **Resolution:** SW-TEST-10 keeps the text; SW-GATE-01's block shows step 3 with the prefix and cites SW-TEST-10.
12. **SW-ERR-05's check (`swift format lint --strict --configuration .swift-format -r Sources`) vs SW-GATE-02's file list.** **Resolution:** SW-GATE-02 keeps the invocation ([gates] C10 hand-off); SW-ERR-05 keeps the rule and the `Never*` configuration and calls the SW-GATE-02 command.
13. **SW-ERR-04 (`-Werror UntypedThrows`, CONSIDER, 6.4-only group) vs SW-GATE-15 (never name a group absent on the oldest leg).** **Resolution:** SW-GATE-15 keeps the text. SW-ERR-04 keeps its ID with the clause "only where the oldest CI leg is 6.4 or later, or through `@diagnose` in the one module", which its own "behind a toolchain check" wording already implies.
14. **SW-ERR-03 (never list `FullTypedThrows`) vs SW-PKG-02 (the `StrictLanguageFeatures` guard turns an unknown name into an error).** **Resolution:** both stay. SW-PKG-02 makes a listed `FullTypedThrows` a build error on 6.3/6.4, so SW-ERR-03 needs no grep of its own; its text keeps the reason (the name is not an upcoming feature) and cites SW-PKG-02 as the check.
15. **SW-PKG-02 (unconditional manifest `.treatWarning("StrictLanguageFeatures", as: .error)` for libraries) vs SW-GATE-14 (a library sets manifest warning control only behind an environment switch) and [conc] owner default 4 (no manifest `.treatWarning` in published libraries).** **Resolution:** SW-PKG-02 keeps the text as a named exception. The group fires only on an unknown feature name, it is root-only (consumer exit 0, MP §6), and failing the package's own build on a toolchain that lacks a listed name is its purpose. SW-GATE-14's text gains "except `StrictLanguageFeatures` (SW-PKG-02)"; SW-CONC's default 4 is about `NoUseUnstructuredThrowingTask`, which contradiction 2 already removes.
16. **Exit tests have three owners:** SW-ERR-19 (trap and throw tests), SW-TEST-11 (`processExitsWith: .failure` for traps, `.exitCode(n)` for defined exits), SW-CLI-14 (one test per `Status` case, `checked(256)` locked). **Resolution:** SW-TEST-11 keeps the mechanism text; SW-CLI-14 keeps the per-`Status` contract; SW-ERR-19 keeps "every documented trap and throw is tested" and cites SW-TEST-11 for the form. [testing]'s citation "SW-CLI-17" means SW-CLI-14.
17. **SW-ERR-17 (CLI usage 64, data 65, trap 132) vs SW-CLI-01 and SW-CLI-12 (the table, the per-platform usage code).** **Resolution:** SW-CLI-01/12 keep the table and the platform caveat; SW-ERR-17 keeps "throw a typed error, never trap, for operational failure" and cites SW-CLI-01 for the numbers. Its Windows remark defers to SW-CLI-12 (errors owner default 5 agrees).
18. **SW-CONC-27 vs SW-TEST-17 (TSan advisory, both with the seccomp and `Mutex` facts).** **Resolution:** SW-TEST-17 keeps the CI recipe; SW-CONC-27 keeps "a deterministic count assertion for every hatch-guarded type" and cites SW-TEST-17 for the leg. Both are revised together if `gates/lint-carriers-and-sanitizers` finds a usable suppression. [testing]'s citation "SW-CONC-16" means SW-CONC-27.
19. **SW-TEST-15 vs SW-IO-25 (draining pipes of a spawned process).** **Resolution:** SW-IO-25 keeps the pipe rule; SW-TEST-15 keeps the three-facts end-to-end contract and the harness. [testing]'s citation "SW-IO-P12" means SW-IO-25.
20. **[gates] open question "coverage gate unresearched" vs SW-TEST-16.** **Resolution:** SW-TEST-16 answers it; the gates open item is closed, and SW-GATE has no coverage row of its own.
21. **SW-IO-26 and Q-IO-3 (the SDK throws `CancellationError` on cancel, `timedOut` wins when the timer fired) vs SW-CONC-24 (a timeout returns `TimeoutError`, never `CancellationError`).** **Resolution:** consistent; overlap only. SW-CONC-24 keeps the general race rule; SW-IO-26 keeps the SDK specialisation (`ProcessFailure.timedOut`). `api/sdk-shape` pins the precedence with a test.
22. **SW-CLI-13 vs SW-IO-05 (spawn with swift-subprocess).** **Resolution:** consistent. SW-IO-05 keeps the spawn rule; SW-CLI-13 keeps the SIGPIPE-disposition reason and cites SW-IO-05.
23. **SW-CLI-07 (`@preconcurrency import Glibc` first) vs SW-IO-04 and [io] R3 (Essentials-only files need `Glibc`/`Musl`/`Darwin` for `exit`).** **Resolution:** consistent. SW-CLI-07 keeps the ordering rule for the stdio file; SW-IO-04 keeps the import rule. Whether the ordering also matters after `import FoundationEssentials` is unmeasured; `cli/services-and-config` runs t3/t4 with Essentials.
24. **SW-CLI-03's `fatalError` tell vs SW-ERR trap policy (SW-ERR-08 onward).** **Resolution:** consistent. SW-ERR keeps trap policy; SW-CLI-03 keeps only "operational failure is thrown, never trapped" and its grep stays a tell.
25. **SW-IO-06 (`from: "1.0.1"`, never `exact:`) vs SW-PKG pin policy and [testing]'s "the harness uses the product's own pin".** **Resolution:** consistent; SW-IO-06 keeps the swift-subprocess pin text, SW-PKG keeps the general rule.

### (f) Convergence

**Verdict: not converged. Needs another round.** The stop condition in the wave plan (a held-out round with no new MUST, no new failure class and no load-bearing open question) fails on every clause:
- Wave 2 added 86 MUST rules in seven freshly opened families, plus ranked agent failure modes that are new (for example, "`toProcessGroup: true` without `createSession`", "`@preconcurrency import Glibc` after `import Foundation`", "`custom_rules` green on the static binary").
- Eight of the fifteen ID families have no consolidation: SW-LANG, SW-API, SW-NET, SW-SEC, SW-REL, SW-APPLE, SW-CORE and BZL-SWIFT. All three skills are unresearched (M-P-01..03).
- Contradictions 1 and 15 mean the drafters would copy a check that was not measured in the form written.

Every open question from the seven consolidations, classified:

| Class | Questions | Disposition |
|---|---|---|
| **Owner decision, default applied** | Q1 floors (library/SDK tools 6.2, CLI/server current); Q2 4 spaces/120 columns; Q3 no `defaultIsolation` outside apps; Q4 SDK on stdlib plus swift-subprocess, 100% Linux line coverage (Q-T1: no trap-only lines, whole-file exclusions listed); Q6 128+n; [conc] 1-7 (`Mutex` everywhere, SW-CONC-13 MUST except apps, NNBD SHOULD, no manifest `.treatWarning` for published libraries apart from contradiction 15, no `unhandled_throwing_task` in the shipped config, `#if compiler` splits only below 6.4, no `CompileTests/` template); [gates] 1-7; [testing] Q-T2..Q-T6; [package] 1-8; [errors] 1-6; [cli] D1-D6; [io] Q-IO-1..10 | Applied; the drafters state each as a default the adopter may override |
| **Measurement the corpus cannot supply** | Darwin libdispatch and Apple runtime traps; `Mutex` floor on Apple; Windows exit path, `ucrt._exit` flushing, usage code 160, Windows io (rename, `createSession`, `FilePath` anchors), Windows test harness; WASI usage code; macOS `F_FULLFSYNC`, `.atomic` mode, pipe size, `System.FilePath` vs `SystemPackage.FilePath`; Xcode manifests and interop defaults; `swift:6.2` compiler for the skeletons and the feature guard; arm64 trap code (133); Embedded Swift; `swift_flags` fall-through in a real Actions run; crash injection for the durable helper; `measure {}` baselines | Residue ([orch-env]); rows stay `unverified: read only` |
| **Dated re-check** | SE-0526 `withDeadline` (6.5); SE-0540 / PR #10033; SwiftPM multiple majors (forum 86317); swift-syntax `lo`/`hi` constants per release; SE-0529 stdlib `FilePath`; SwiftLint image bumps; T-V42 typed-throws `Task` crash; swift-subprocess releases | Steps of the `swift-upgrade` skill |
| **Answerable now, load-bearing** | ExplicitSendable through SwiftPM (contradiction 1); SwiftLint image as advisory or gate, and the static-binary check ([orch-SL]); TSan suppression for `Mutex` ([orch-TSan]); `Never*` on changed files; `setenv`/`chdir` under parallel Swift Testing; SDK test seams and recorded fixtures (M-E-15/16); coverage exclusion; NNBD on test targets; backpressure and accept-loop caps; cancellation-shield cleanup (SE-0504, SE-0493); SDK `CancellationError` and timeout precedence, capture limits (Q-IO-2); root `main()` hook on `--help` and `>&-`; aggregate errors; control/bidi sanitiser at the stderr boundary; credentials in error text (M-I-09); `URLError` rendering; M-G-20 streaming; musl static SDK for swift-subprocess and the durable helper; swift-subprocess 1.0.1 child reset; prebuilts on a listed distro (if an image pulls); `path:` dependencies (M-L-20) | Commissioned in (g) |
| **Answerable now, not load-bearing** | M-M-16 generated-artifact diff gate; M-M-09 license-header and shell checks; M-L-17..19; `Result` role and `- Throws:` docs (M-C-07, P3) | Deferred P3; not commissioned |

### (g) Next wave

Fourteen dives. Three revisions of existing groups go first, because they settle gate text and test mechanics the other families consume; then the eleven staged dives, revised. W3-11 and W3-12 are merged into one `procedures` dive (both write skills from settled rules), and the errors follow-ups are folded into network, security and cli rather than a fourth revision.

1. `gates/lint-carriers-and-sanitizers` (SW-GATE, revision). ExplicitSendable via SwiftPM, the SwiftLint image as carrier and the static-binary check, TSan suppression for `Mutex`, `Never*` on changed files, and the amended gate block (E08, E16, step 3). Why: contradictions 1, 3, 7, 8, 11 and three families wait on the TSan answer.
2. `testing/isolation-and-seams` (SW-TEST, revision). Process-global state under parallel Swift Testing, SDK seams and recorded fixtures, coverage exclusion, NNBD on test targets. Why: SW-TEST-04 is MUST and silent on `setenv`/`chdir`; M-E-15/16 gate the SDK's 100% line.
3. `concurrency/backpressure-and-cleanup` (SW-CONC, revision). Bounded streams, accept-loop caps, and cleanup under cancellation with the 6.4 shield and async `defer`. Why: servers and the CLI's SIGTERM path need a measured cleanup and memory bound.
4. `language/era-and-idioms` (SW-LANG, revised W3-1). Why: M-A rows, and the stale-idiom table feeds every depth file.
5. `api/library-api-shape` (SW-API, revised W3-2). Why: M-D-01..06, and SW-ERR-20's struct-plus-`Code` and SW-CONC-04's Sendable statement need a home.
6. `api/sdk-shape` (SW-API, revised W3-3). Why: the first named consumer; the SDK's cancellation path is unimplemented.
7. `network/registry-clients` (SW-NET, revised W3-4). Why: M-H P0 rows, M-G-20, `URLError` rendering.
8. `security/untrusted-input` (SW-SEC, revised W3-5). Why: M-I rows, SW-ERR's carried S1-S6, credentials and control-character sanitising.
9. `cli/services-and-config` (SW-CLI, revised W3-8). Why: M-F-09/10/14/12/15, the unrun root hook, aggregate errors.
10. `release/binaries-and-platforms` (SW-REL, revised W3-6). Why: static SDK recipe (SW-GATE-25 requires the leg), musl subprocess, prebuilts.
11. `release/release-pipeline` (SW-REL, revised W3-7). Why: the `swift-release` skill (M-P-03) and the library tagging rules.
12. `apple/reading-heuristics` (SW-APPLE, revised W3-9). Why: the read-only Apple depth file; app-target isolation settled by SW-CONC-11.
13. `bazel/rules-swift` (BZL-SWIFT, W3-10, lightly revised). Why: owner Q8 (bazel-quality 0.4.0).
14. `procedures/upgrade-and-diagnose` (SW-CORE, merged W3-11 and W3-12). Why: the `swift-upgrade` and `swift-diagnose` skills (M-P-01, M-P-02).

## Wave 3 landed (2026-10-10)

This is the phase 6 harvest of wave 3: 14 dives and 12 consolidations. Eight families are new: SW-LANG, SW-API, SW-NET, SW-SEC, SW-REL, SW-APPLE, BZL-SWIFT and SW-CORE. Four families are revisions: SW-GATE, SW-TEST, SW-CONC and SW-CLI. SW-PKG, SW-ERR and SW-IO are unchanged since wave 2.

Every consolidation on disk was read for its Verdict, ruleset headings, conflicts, failure modes and Open questions.

Source keys:
- [conc](swift-concurrency.md), [gates](swift-gates.md), [testing](swift-testing.md), [package](swift-package.md), [errors](swift-errors.md), [cli](swift-cli.md), [io](swift-io.md)
- [language](swift-language.md), [api](swift-api.md), [network](swift-network.md), [security](swift-security.md), [release](swift-release.md), [apple](swift-apple.md), [bazel](swift-bazel.md), [procedures](swift-procedures.md)
- the wave receipt, `swift-topic-map/scratch/wave3-receipt.json`

Nothing below edits a consolidation. Where two consolidations disagree, (e) names the ID whose text the drafters keep.

Counting method. A rule is a bold heading `**SW-…-NN` or `**BZL-SWIFT-NN`. Severity is the first `MUST`, `SHOULD` or `CONSIDER` in the heading, otherwise the first `Severity` line under it. "MUST NOT" counts as MUST: SW-REL-03 and SW-REL-19 are MUST NOT. SW-CLI-27 was never issued and is not counted.

### (a) Per group

| Group | Consolidation | IDs | MUST | Conflicts resolved | Follow-ups named |
|---|---|---|---|---|---|
| gates (revision) | [swift-gates.md](swift-gates.md) | 29 (SW-GATE-01..29) | 11 | 8 (C13-C20) | 2: benchmark legs (M-P-02); generated-artifact and soundness gates (M-M-16, M-M-09) |
| testing (revision) | [swift-testing.md](swift-testing.md) | 24 (SW-TEST-01..24) | 14 | 13 | 5: residual process-global state; Q-T8 replay tier; coverage ceiling, second half; TSan filter limits; unverified platforms |
| concurrency (revision) | [swift-concurrency.md](swift-concurrency.md) | 35 (SW-CONC-01..35) | 19 | 11 | 7: Darwin libdispatch; `Mutex` race detection; listener limits; library awaits under cancel; 6.5 re-check; testing concurrent code; exit 132 for other traps (gap f) |
| cli (revision) | [swift-cli.md](swift-cli.md) | 31 (SW-CLI-01..32, 27 not issued) | 17 | 23 | 6: Windows and WASI; SwiftLint port of the greps; `Status` test suite; swift-subprocess 1.0.1 and arm64; `ServiceGroup` under a real runtime; D7 and D10 |
| language | [swift-language.md](swift-language.md) | 13 (SW-LANG-01..13) | 7 | 18 | 4: patch-release syntax; `[weak self]` base rate; non-Linux portability; M-A-08 and M-A-15 |
| api | [swift-api.md](swift-api.md) | 27 (SW-API-01..27) | 20 | 12 (K1-K12) | 5: SDK breadth and schema drift; mutating calls under cancel; SDK on Windows and macOS; capture ceiling; module and import edges |
| network | [swift-network.md](swift-network.md) | 19 (SW-NET-01..19) | 14 | 9 plus the verification fixes | 5: push flows; proxy over CONNECT; real registries; static musl trust store; Darwin and Windows |
| security | [swift-security.md](swift-security.md) | 24 (SW-SEC-01..24) | 18 | 11 | 6: archive bombs; name-grammar fixture; small-stack recursion; SDK child-output scrubbing; header validation (M-I-11); Apple privacy |
| release | [swift-release.md](swift-release.md) | 22 (SW-REL-01..22) | 16 | 11 | 5: static musl trust store; Windows releases; GitHub-hosted legs; `--static-swift-stdlib` retest; arm64 and macOS |
| apple | [swift-apple.md](swift-apple.md) | 16 (SW-APPLE-01..16) | 7 | 12 | 4: Xcode build-system semantics; Apple deployment floors; Combine and Observation; SwiftUI view shape |
| bazel | [swift-bazel.md](swift-bazel.md) | 23 (BZL-SWIFT-01..23) | 9 | 8 (C1-C8) | 5: rspm closure; static and cross builds (M-O-08); macros; unrun attributes; test runtime |
| procedures | [swift-procedures.md](swift-procedures.md) | 21 (SW-CORE-01..21) | 8 | 11 | 6: Apple diagnosis; static-SDK diagnosis; test-runner reaping; migrate on versioned manifests; computed-static-var ABI; type-check budget in CI |
| **wave-3 subtotal** | 12 files | **284** | **160** | **147** | **60** |
| package, errors, io (unchanged) | [package](swift-package.md), [errors](swift-errors.md), [io](swift-io.md) | 38 + 21 + 32 = 91 | 12 + 10 + 22 = 44 | (wave 2) | (wave 2 (f)) |
| **all 15 families on disk** | 15 files | **375** | **204** | | |

MUST IDs, recounted from the headings:

| Family | MUST rules |
|---|---|
| api | 01, 03, 04, 05, 07-21, 24 |
| apple | 01, 02, 03, 04, 06, 07, 14 |
| bazel | 01, 02, 04, 07, 08, 09, 14, 18, 21 |
| cli | 01, 02, 03, 04, 05, 07, 08, 09, 10, 14, 15, 17, 20, 22, 23, 28, 31 |
| conc | 01, 02, 07, 08, 09, 10, 11, 13, 15, 17, 18, 21, 22, 28, 30, 31, 32, 33, 34 |
| gates | 01, 02, 05, 06, 09, 10, 12, 13, 14, 20, 26 |
| language | 01, 02, 03, 04, 05, 06, 08 |
| network | 01-14 |
| procedures | 01, 02, 03, 04, 05, 10, 16, 17 |
| release | 01-07, 10, 11, 12, 13, 15, 17, 18, 19, 20 |
| security | 01-10, 13-20 |
| testing | 01, 02, 03, 04, 05, 10, 11, 15, 16, 18, 19, 20, 21, 22 |

Several MUST rules carry a scope:
- SW-CONC-13 is MUST for library, SDK, CLI and server code, and SW-CONC-31 for servers and daemons.
- SW-TEST-10 and SW-TEST-16 bind the SDK or libraries; SW-TEST-22's scope is narrowed by (e) 14.
- SW-API-09 to SW-API-24 bind the SDK.
- SW-NET-06 and SW-NET-09 are scoped; SW-SEC-06, SW-SEC-08 and SW-SEC-17 are scoped.
- SW-REL-06, SW-REL-10, SW-REL-15 and SW-REL-20 are conditional.
- BZL-SWIFT-01 is the file's scope rule.

### (b) Surprises, each with a verdict

The verdict keys are the same as in wave 2:
- **promote**: a next-wave dive chases it;
- **fold**: an authoring note or a revision absorbs it;
- **defer**: recorded against an M-ID;
- **reject**: already a rule, or wrong. "Folded-in-wave-3" means a consolidation already turned it into a rule.

Nothing is promoted.

**gates**
- ExplicitSendable never failed before. `-Xfrontend -require-explicit-sendable` demotes the group, and `-Xswiftc -require-explicit-sendable` is a no-op. **Reject** (folded-in-wave-3: SW-GATE-17, SW-GATE-29, [api] K12). SW-CONC-04's stale text is fixed by (e) 1.
- Path dependencies receive a library's manifest warning control (exit 1); git and registry consumers do not (exit 0). **Reject** (folded: SW-GATE-29 and the SW-GATE-14 exemption, [gates] C18).
- The `Mutex` false positive under TSan is only the `Swift access race` report kind. **Reject** (folded: SW-GATE-27 and SW-TEST-17). The filter's blind spot is **deferred** against M-E-12 as a documented gap.
- SwiftLint findings:
  - `custom_rules` default to SourceKit mode;
  - the static binary exits 0 or 134;
  - a same-line `disable:this` defeats the carrier;
  - the research `swiftlint-sk.sh` passes a stray `swiftlint` word.
  **Reject** (folded: SW-GATE-11, SW-GATE-26 and E15). The wrapper bug is **folded** into Authoring note N-8.
- Further gate findings:
  - flag order matters;
  - file-granular `Never*` checks cost 42% of swift-nio;
  - swift-protobuf pins its TSan job to 6.3.
  **Reject** (folded: SW-GATE-13 and SW-GATE-15 ordering, SW-GATE-28). The swift-protobuf 6.4 failure is **deferred** against M-E-12 as a dated re-check.
- The `&&` canary let an empty tree pass. **Reject** (folded: SW-CORE-03 and the SW-GATE-01 block). DocC on 6.3 is **deferred** against M-M-11 (host load).

**testing**
- The `setenv`/`getenv` race crashes on glibc 2.39 but not on 2.43. **Reject** (folded: SW-TEST-18). The libc attribution is **deferred** against M-E-03; it is only "consistent with" glibc commit `7a61e7f557a9`.
- A lines-only gate is blind to a deleted recorded case. **Reject** (folded: SW-TEST-22). Its SDK scope is settled by (e) 14.
- The static SwiftLint skips `custom_rules`. **Reject** (duplicate of the gates item).
- Swift has no analogue of Rust's `unsafe set_var`. A trailing `//` comment on a `@TaskLocal` line breaks macro expansion on 6.4. **Reject** (folded: the SW-TEST-18 grep is the gate). The macro bug is **deferred** against M-E-03 as a dated re-check.
- `.process("Fixtures")` fails on duplicate file names. **Reject** (folded: SW-TEST-21 uses `.copy`).
- No exemplar has a replay layout, and LLVM PR 203723 was closed unmerged. **Reject** (folded: documented gap; SW-TEST-22 is re-checked at 6.5).

**concurrency**
- swift-subprocess `run()` in a cancelled cleanup is SIGKILLed. **Reject** (folded: SW-CONC-32, "a cleanup that spawns a subprocess is always shielded").
- `AsyncChannel.send` swallows cancellation. **Reject** (folded: SW-CONC-35 and [conc] conflict 22).
- The multi-producer channel 1.1.7 offers only `.watermark`, and its `~Copyable` source cannot be captured. **Reject** (folded: SW-CONC-35 and gap (b)). The 6.5 re-check is **deferred** against M-B-18.
- A `DispatchSource` handler in `main.swift` traps. **Reject** (folded: SW-CONC-34; SW-CLI-11 already amended).
- Vapor ships awaited `defer`s, and 0 of 40 clones use the shield. **Reject** (folded: evidence for SW-CONC-32).
- A discarding task group has no `next()`. **Reject** (folded: SW-CONC-19, SW-CONC-31 and [conc] conflict 18).

**language**
- The shift table and release notes drift from the compiler: `@specialize(where:)`, `mapKeyedValues` and `anyAppleOS` on 6.1. **Reject** (folded: SW-LANG-05). The "shift-table correction round" is not commissioned, because SW-LANG-05 makes every claim compile first. M-A-08 stays deferred (P3).
- `hasFeature(ImmutableWeakCaptures)` is false everywhere, and a tools version does not gate syntax. **Reject** (folded: SW-LANG-03, SW-LANG-04 and (e) 40).
- `InlineArray` was no faster, and `any` was 4.4x to 9x slower. **Reject** (folded: SW-LANG-10, SW-LANG-12).
- `withObservationTracking` fires once on Linux. **Reject** (folded: SW-LANG-09 and SW-APPLE-13, `Observations`). The Darwin half is **deferred** against M-A-14 (no host).
- The `ImplicitStrongCapture` group exists on 6.4 only. **Reject** (folded: SW-LANG-08; SW-GATE-15 forbids naming it on a 6.3 leg).
- "No swift:6.0 or 6.2 image" (a dive note). **Reject**: [language] R6 and R11 ran `swift:6.2.0` through `6.2.4`. See frame correction 1.

**api**
- `migrate --to-feature InternalImportsByDefault` does not exist. **Reject** (folded: the SW-CORE-12 list of five migratable names; SW-API-01 is a manual migration).
- The digester flags a case added to a `@nonexhaustive` enum. **Reject** (folded: SW-API-11 allowlist line, SW-GATE-20).
- `package import` does not satisfy a public signature. **Reject** (folded: SW-API-01).
- Tools 6.2 stopped enforcing `unsafeFlags` for dependents. **Reject** (folded: SW-API-04, SW-PKG-04).
- `Logger.current` captures its fallback at first touch, and `Task.detached` drops metadata. **Reject** (folded: SW-API-07, SW-API-27).
- A `Task {}` in `main.swift` hides a missing `Sendable`. **Reject** (folded: SW-API-02; the consumer fixture crosses a real boundary).
- A transitive `import Subprocess` is accepted. **Reject** (folded: the SW-API-09 grep).
- `allKeys` on a `CodingKeys` container hides unknown keys. **Reject** (folded: SW-API-21 and K2). The SW-IO-28 recipe is amended by (e) 33.
- The Python SDK's ExitCode table stops at 86. **Reject** (folded: SW-API-24, SW-CLI-01).
- `package import` is needed for a seam initializer under InternalImportsByDefault. **Reject** (folded: SW-API-01, SW-API-25).
- `--repeat-until` is unknown on 6.3.3. **Reject** (folded: the parameterized pin). SW-TEST-14 is dated by (e) 34.
- The SDK binary links only libFoundationEssentials. **Reject** (folded: SW-API-12).

**network**
- `timeoutIntervalForResource` is a no-op on Linux. **Reject** (folded: SW-NET-05). Darwin is **deferred** against M-H-03.
- AHC `deadline:` bounds only the response head. **Reject** (folded: SW-NET-05).
- `HTTPClient.shared` decodes gzip. **Reject** (folded: SW-NET-06).
- Neither client trusts a CA through the environment. **Reject** (folded: SW-NET-08). The trust store of a static image is **deferred** against M-H-08 and M-N-14 (Residue; N-8).
- The per-task delegate is never called for a redirect, and `httpAdditionalHeaders` leaks. **Reject** (folded: SW-NET-03).
- Three findings fold into SW-NET-10 and SW-NET-11:
  - containerization's `validateRealm`;
  - swift-container-plugin's unchecked realm;
  - registry:2 returns 404, not 406.
  **Reject** (folded: SW-NET-10, SW-NET-11).

**security**
- StrictMemorySafety is silent on a pointer escape on 6.4. **Reject** (folded: SW-SEC-09, and SW-SEC-11 at SHOULD).
- `-Werror TemporaryPointers` exits 0 on 6.4. **Defer** against M-I-08 as a dated re-check; the upstream issue is unchecked.
- GitHub's advisory API returns nothing for six 2026 CVEs, and swift-nio is scanner-green inside a CVE range. **Reject** (folded: SW-SEC-20 floors, SW-SEC-21).
- A tree of `[Node]` children overflows the stack in `deinit`. **Reject** (folded: SW-SEC-02).
- `HTTPClient.Authorization` prints its token, and an interpolated `URLError` prints presigned queries. **Reject** (folded: SW-SEC-13, SW-SEC-14).
- Further security findings:
  - 0 of 40 exemplars sanitise terminal output;
  - unsafe code carries 0 `SAFETY` comments;
  - `debugDescription` leaves bidi characters raw;
  - `swift package audit` does not exist.
  **Reject** (folded: SW-SEC-17, SW-SEC-12, SW-SEC-20, SW-REL-11).

**cli**
- The simple root hook misses `--help`, `--version` and completions. **Reject** (folded: SW-CLI-23; SW-CLI-08 and SW-CLI-09 corrected in place).
- `>&-` gives EINVAL, not EBADF. **Reject** (folded: SW-CLI-09, D7 default 74).
- swift-configuration treats an empty variable as set. **Reject** (folded: SW-CLI-19).
- `.shutdownGracefully` does not exist, and overlapping signals trap. **Reject** (folded: SW-CLI-20, SW-CLI-22).
- ArgumentParser echoes ESC. **Reject** (folded: SW-CLI-25, which now applies SW-SEC-17 per (e) 13).
- The ocx envelope disagrees with the lore Rust `cli-contract.md`. **Defer** to owner D2: report it to the `rust-quality` set; it is not patched here.

**release**
- GLIBC_2.43 appears only in static-stdlib executables and in `libswiftCore.so`. **Reject** (folded: SW-REL-06; the M-N-03 premise is corrected).
- swift-subprocess works in a static musl binary. **Reject** (folded: SW-REL-07).
- Task threads under musl get a 128 KiB stack. **Reject** (folded: SW-REL-09 and the SW-SEC-01 test size). NIO threads on real musl are **deferred** against M-I-03.
- FoundationEssentials and Foundation produce byte-identical binaries; the 45 MB is ICU. **Reject** (folded: SW-REL-08; M-G-11 is corrected; (e) 25).
- The `--static-swift-stdlib` fix is merged, but 6.4.0 is the only 6.4 tag. **Defer** against M-N-02 as a dated re-check at 6.4.1, which is SW-REL-03's removal condition.
- Prebuilts hit only on released tags. **Reject** (folded: SW-REL-22; N-12).
- These release findings are each already a rule:

  | Finding | Folded into |
  |---|---|
  | The SBOM name is the checkout directory | SW-REL-11 |
  | Two-component tags resolve | SW-REL-18 |
  | 0.x gets no special SemVer handling | SW-REL-21 |
  | Swift Build drops the environment for plugins | SW-REL-12 |
  | SDK mtimes break reproducibility | SW-REL-14 |
  | The soundness job uses the PR base as its baseline and floats its image | SW-REL-20, SW-GATE-24, SW-REL-01 |

  **Reject** (folded-in-wave-3).

**apple**
- "Xcode 27 defaults to Swift 5" has a single source. **Reject** (folded: SW-APPLE-14, read the setting).
- A misspelled `SWIFT_*` name is accepted silently. **Reject** (folded: the SW-APPLE-01 oracle).
- The `SWIFT_APPROACHABLE_CONCURRENCY` Condition. **Reject** (folded: SW-APPLE-05, [apple] conflict 3).
- `swiftc` rejects `MainActor.self`. **Reject** (folded: SW-APPLE-01, SW-APPLE-02).
- DocC shows `deprecatedAt` 27.2 with `deprecated` false. **Reject** (folded: the SW-APPLE-10 grep). Compiler gating is **deferred** against M-J-03 (macOS).
- Xcode 27 ships an MCP server and Apple-authored skills. **Defer** against M-J-05 (macOS runner; [apple] owner default 5: complement only). SW-APPLE-16 is CONSIDER.

**bazel**
- The artifact already existed. **Reject** (a process note).
- The unprefixed `treat_warnings_as_errors` is the C++ feature. **Reject** (folded: BZL-SWIFT-07).
- `swift_test` runs Swift Testing. **Reject** (folded: BZL-SWIFT-18).
- The hermetic quickstart registers the wrong toolchain pair. **Reject** (folded: BZL-SWIFT-05, BZL-SWIFT-15).
- `swift.debug_module_path` fails on Linux. **Reject** (folded: BZL-SWIFT-13).
- `publish.toml` says "twelve" depth files and the docs say "fourteen". **Fold** into N-13.

**procedures**
- The flag is `--target`, and `migrate` accepts `--scratch-path`. **Reject** (folded: SW-CORE-12; (e) 3, (e) 4).
- `migrate`'s fix-it on 6.4 adds two deprecation warnings. **Reject** (folded: the SW-CORE-11 and SW-CORE-12 done test on both toolchains; N-12).
- A bare `&` leaves SIGINT and SIGQUIT ignored. **Reject** (folded: SW-CORE-18 `set -m`, the SW-CLI-11 check).
- TSan exits 66 on correct `Mutex` code. **Reject** (folded: SW-CORE-19 reads the report kind first; (e) 2).
- The type-check message can hide the real error. **Reject** (folded: SW-CORE-20).
- The whole-tree justification pass is unusable on adopted trees. **Reject** (folded: the SW-CORE-10 added-lines delta).

### (c) Map rows affected

- **Covered and consolidated in wave 3:**

  | Section | Rows | Consolidation |
  |---|---|---|
  | M-A | rows other than M-A-08 and M-A-15 | [language] |
  | M-D | M-D-01..06 and M-D-08..12 | [api] |
  | M-H | M-H-01..10 | [network] |
  | M-I | M-I-01..10 and M-I-12 | [security] |
  | M-J | M-J-01..05 and M-J-10 | [apple] |
  | M-K | M-K-01..08 | [gates], [procedures] |
  | M-N | M-N-01..08, M-N-10, M-N-14..16 | [release] |
  | M-O | M-O-01..07, M-O-09, M-O-10 | [bazel] |
  | M-P | M-P-01..03 | [procedures], [release] |

- **Wave-2 carry-overs, now covered:**
  - M-F-09, -10, -12, -14 and -15 by [cli];
  - M-E-15 and M-E-16 by [testing], SW-TEST-20..24;
  - M-G-20 by [network], SW-NET-07 and SW-NET-12;
  - M-I-09 by [security], SW-SEC-13, -14 and -16;
  - M-L-20 by [release], SW-REL-17.
- **Premise corrected:**
  - M-N-03: GLIBC_2.43 holds per build type.
  - M-G-11: the size difference is ICU, not FoundationEssentials.
  - M-A-07: `weak let` arrives in 6.2.3.
  - M-H-02: only a session-level delegate sees a redirect.
  - M-H-03: `timeoutIntervalForResource` is a no-op; AHC `deadline:` bounds only the head.
  - M-H-08: `SSL_CERT_FILE` is ignored.
  - M-I-07: strict mode is silent on escapes.
  - M-I-12: no `swift package audit`, and the advisory API is incomplete.
  - M-K-04: the SW-PKG-06 command replaces `head -1`.
  - M-K-05: generated code needs two layers.
  - M-L-21: the flag is `--target`, and `migrate` edits a dead `Package.swift`.
  - M-M-04: SwiftLint runs in the SourceKit image.
  - M-E-12: TSan is judged by report kind.
  - M-F-07: the signal handler's isolation inference.
  - M-O-05: `debug_module_path`.
  - M-O-10: Bazel 8 and 9 measured, 10 unverified.
- **Still uncovered, deferred:**
  - M-A-08 and M-A-15 (P3).
  - M-D-07 (naming), M-D-13 (`@retroactive`), M-D-14 (module split).
  - M-I-11, header validation (P3).
  - M-J-06..09 (no app consumer).
  - M-L-17..19 (P3).
  - M-M-09 and M-M-16 (P3).
  - M-C-07 (P3).
  - M-O-08, static and cross builds under Bazel.
  - M-P-04, the review skill (not authored).
- **Residue (no host):**
  - M-N-09 (macOS universal binaries), M-N-11 (Android), M-N-12 (Windows), M-N-13 (Embedded);
  - the macOS halves of M-B, M-H and M-J;
  - every Windows row (owner Q7).

### (d) Frame corrections

1. **`swift:6.2.x` images run.** [orch-env] in wave 2 said there was no `swift:6.2` image. [language] R6 and R11 ran 6.2.0, 6.2.2, 6.2.3 and 6.2.4, and the floor leg `swift:6.2.0` is measurable. Only `swift:6.0` is unmeasured.
2. **Bazel runs.** Bazel 8.8.0 and 9.2.0 were installed from the ocx index ([bazel] C5). The map's "Bazel not available" and "Bazel 8-10" narrow to "8 and 9 measured; 10, 9.3.0 and 8.8.1 unverified".
3. **ExplicitSendable through SwiftPM gates.** `.treatWarning("ExplicitSendable", as: .error)` exits 1, and every `-require-explicit-sendable` spelling is inert ([gates] C13, [api] K12). This supersedes the wave-2 frame correction that "only the `swiftc` form is verified".
4. **A trap is not always exit 132.** Under the default backtracer, a trap on a non-main thread while the main thread sleeps prints `Program crashed:` and the process exits 0 (9 of 9 runs). With `SWIFT_BACKTRACE=enable=no`, or a parked main thread, it exits 132 ([conc] R14, gap f).
5. **`weak let` compiles from 6.2.3**, not 6.3 as SE-0481 says. `hasFeature(ImmutableWeakCaptures)` is false on every toolchain ([language] R6, R11).
6. **Foundation on Linux:**
   - `URLSession.bytes(for:)` does not exist;
   - `timeoutIntervalForResource` is a no-op;
   - the per-task redirect delegate is never called;
   - `SSL_CERT_FILE` is ignored ([network]).
7. **Release premises:**
   - GLIBC_2.43 is per build type, not per image;
   - FoundationEssentials does not shrink a binary; ICU does the growing;
   - swift-subprocess works fully in a static musl binary;
   - musl gives Task threads a 128 KiB stack ([release]).
8. **Toolchain CLI facts:**
   - `swift package migrate` takes `--target`, not `--targets`, and accepts `--scratch-path`;
   - `swift package audit` does not exist;
   - `--sbom-spec` is new in 6.4;
   - Swift Build drops the environment for plugin commands ([procedures], [release]).
9. **rules_swift:** `.bazelrc:27` is the C++ feature, and the Swift gate is `swift.treat_warnings_as_errors` ([bazel] C3).
10. **The Xcode language mode is read, never assumed**: "Xcode 27 defaults to Swift 5" has one blog source ([apple]).

### (e) Cross-consolidation contradictions

Every ruleset was read against every other. Each item below is a conflicting or overlapping pair, with its resolution and the ID whose text the drafters keep. Items marked *overlap* need no text change beyond a citation.

1. **SW-CONC-04 Verify vs SW-GATE-17 and SW-API-02.**
   - SW-CONC-04 says "a log-reading audit, never a gate" and recommends `-Xfrontend -require-explicit-sendable`.
   - SW-GATE-17 and SW-API-02 report exit 1 through `.treatWarning`; [gates] C13 and [api] K12 re-ran it on 6.4.0 and 6.3.3.
   - **Keep SW-GATE-17** for the gate and **SW-API-02** for the consumer-package proof.
   - SW-CONC-04 keeps the annotation rule. Its Verify becomes a citation of SW-GATE-17, and the `-require-explicit-sendable` advice is deleted.
   - This replaces the provisional wave-2 (e) 1.
2. **TSan in CI.** SW-CONC-27 says "advisory CI leg only, expect a false positive", and SW-CORE-19 says "advisory in CI". SW-GATE-27 and SW-TEST-17 gate on the `data race` report kind.
   - **Keep SW-GATE-27** for the job and `tsan-check.sh`, and **SW-TEST-17** for the test-leg recipe.
   - SW-CONC-27 keeps only the deterministic count assertion.
   - SW-CORE-19 keeps the diagnosis reading (report kind first, five-run fallback); its "advisory in CI" clause becomes a citation of SW-GATE-27.
   - This settles wave-2 (e) 18.
3. **SW-CONC-07 vs SW-CORE-12.** SW-CONC-07 says "`swift package migrate` takes no `--scratch-path`"; every [procedures] migrate run used one and exited 0. **Keep SW-CORE-12**; delete the clause from SW-CONC-07.
4. **SW-PKG-32 vs SW-CORE-12.** SW-PKG-32 writes `--targets T`; `--targets` exits 64. **Keep SW-CORE-12** (`--target`). SW-PKG-32 keeps its rule with the spelling fixed.
5. **SW-CONC-12 vs SW-PKG-08 on `InferIsolatedConformances`.** **Keep SW-PKG-08.** [language] measured the feature as a no-op without global-actor conformers. SW-CONC-12's clause becomes a pointer, which settles wave-2 (e) 4.
6. **SW-CLI-07 vs SW-LANG-02.**
   - SW-CLI-07's literal: "first import is `@preconcurrency import Glibc`".
   - SW-LANG-02: a `canImport` chain of Glibc, Musl and Darwin, `@preconcurrency` on each arm, before `import Foundation`. The literal fails the static Linux SDK ([language] R1).
   - **Keep SW-LANG-02.** SW-CLI-07 keeps "exactly one file names `stdout` and `stderr`" and says that its libc imports are the SW-LANG-02 chain.
   - This supersedes wave-2 (e) 23.
7. **SW-LANG-04 vs SW-API-05 ([api] K8).** SW-LANG-04 guards newer forms with `#if compiler(>=N)`; SW-API-05 uses `#if hasAttribute(nonexhaustive)`. **Keep SW-API-05.** SW-LANG-04 gains: "an attribute is guarded with `#if hasAttribute(X)` (SW-API-05)".
8. **The type-check limit.** SW-LANG-07 sets `-warn-long-expression-type-checking=200`; SW-CORE-20 sets `=100`.
   - **Keep SW-LANG-07** for the gate flag at 200 ([language] owner default 8).
   - SW-CORE-20 keeps the diagnosis step (split the expression, read the first real error, never raise a solver limit) and cites SW-LANG-07 for the gate.
9. **Toolchain pins.** Four rules disagree on literal versus derived image tags:
   - SW-REL-01: every `swift:` tag in Dockerfiles and workflows equals `.swift-version`, and an `ARG`-built tag is a false positive, so write the literal.
   - SW-CORE-09: the primary CI image derives from `.swift-version`, and a literal is allowed only on a deliberate leg.
   - SW-LANG-03 and SW-GATE-25: the floor leg `swift:6.2.0` and the matrix.

   Resolved by scope, each rule keeping its own text:
   - **SW-REL-01** binds release jobs and the shipped `Dockerfile*`. Its check (b) is narrowed to those operands.
   - **SW-CORE-09** binds the CI test matrix.
   - The SW-LANG-03 and SW-GATE-25 legs are its deliberate literals.
   - **SW-GATE-08** keeps the format-step pin and the existence check.
   - BZL-SWIFT-22 is *overlap*.
10. **SW-SEC-03 vs SW-NET-01.** SW-SEC-03 offers `URLSession.bytes(for:)` as the chunked read; it does not compile on Linux ([network] NC-1). **Keep SW-NET-01.** SW-SEC-03's network branch names AHC `for try await buffer in response.body` with a running total, or `collect(upTo:)` with SW-NET-07's limits.
11. **SW-ERR-18 and SW-ERR-20 vs SW-NET-14.** The errors rules render `URLError` through `localizedDescription`. **Keep SW-NET-14** for network error types. The `URLError` branch of SW-ERR-18 and SW-ERR-20 points to SW-NET-14 and to its widened check ([network] C3).
12. **SW-SEC-13 and SW-SEC-14 (secret type, URL redaction) vs SW-NET-14 (`render`)**, *overlap*. SW-SEC-14 owns `redacted(_:)`; SW-NET-14's `render` calls it. Neither restates the other.
13. **SW-SEC-17 vs SW-CLI-25.**
    - SW-SEC-17 is MUST for CLIs and escapes characters as `\u{HEX}`.
    - SW-CLI-25 is SHOULD under owner D9 and drops C0, C1 and bidi characters.
    - **Keep SW-SEC-17** for the text and the severity. [security] decided escape over strip, which is its owner default 5.
    - SW-CLI-25 shrinks to "the root hook applies SW-SEC-17's `sanitizeForTerminal` to `fullMessage(for:)`" and keeps its ESC-count check as a second watched check.
    - D9 stays the default for SW-CLI-29 and SW-CLI-30 only.
14. **The SDK test design (Q-T8).**
    - SW-API-13 (MUST for the SDK): a fake CLI out of process, 100% lines, nothing excluded.
    - SW-TEST-20, SW-TEST-21 and SW-TEST-22 (MUST for the SDK): a replay seam, an excluded adapter, 100% lines and regions.

    Resolution, the owner default:
    - **SW-API-13 keeps the SDK.** SW-TEST-20, -21 and -22 bind CLI cores and any SDK that keeps a replacing runner.
    - SW-TEST-22's "MUST for the SDK" becomes "MUST where a replay seam exists".
    - Regions are reported, not gated, for an SW-API-13 SDK until the Q-T7 ratchet exists (179/182 measured).
15. **SW-TEST-21 vs BZL-SWIFT-19 ([bazel] C6).** SW-TEST-21 says `#filePath` breaks under Bazel. Under Bazel `#filePath` is workspace-relative, and `Bundle.module` is what fails to compile. **Keep BZL-SWIFT-19** for Bazel. SW-TEST-21 drops the Bazel sentence and keeps its SwiftPM rule, as does SW-API-13's fixture lookup.
16. **SW-GATE-10's `k07.sh` vs SW-CORE-03 and SW-CORE-06.**
    - SW-GATE-10's import-based canary exits 1 on an import-free tree, and it scans generated files: 507 raw hits in swift-protobuf, 7 after exclusion.
    - **Keep SW-GATE-10** as the rule, shipped with the `k07.sh` that SW-CORE-06 amends (a `GEN` exclusion array and the `find` canary).
    - **SW-CORE-03** owns the canary text.
17. **SW-GATE-12 vs SW-CORE-01**, both MUST weaken-checks. **Keep SW-CORE-01** for the general list and `weaken-check.sh`. SW-GATE-12 keeps only its gate-specific items (the breakage allowlist file, TSan suppression files, SwiftLint self-suppression through E15) and cites SW-CORE-01.
18. **`SWIFT_BACKTRACE=enable=no`.** SW-CORE-17 and SW-CORE-18 forbid it in a Dockerfile, unit or CI file, and SW-CORE-01 flags it. SW-CONC-34 check (3) and the SW-CONC-26 Verify run with it to get a reliable 132.
    - **Both keep their text.** SW-CORE-18 gains a carve-out: "except as a per-command prefix in a test that asserts a trap's exit code (SW-CONC-34, SW-CONC-26)".
    - A CI line that carries it lists that reason under SW-CORE-01.
19. **SW-CORE-16 (route by exit code plus first line) vs [conc] gap f.** Under the default backtracer, a worker-thread trap can exit 0 with `Program crashed:` on stderr (R14). **Keep SW-CORE-16** and add one route row: exit 0 plus `Program crashed:` means a trap on a non-main thread; rerun with `SWIFT_BACKTRACE=enable=no`.
20. **[conc] owner default 4 vs SW-GATE-29, SW-GATE-17 and SW-PKG-02.** The default says "no manifest `.treatWarning` for published libraries"; the gates rules make a library set `StrictLanguageFeatures` and `ExplicitSendable` unconditionally. **Keep SW-GATE-29.** The [conc] default covers only growing groups (`NoUseUnstructuredThrowingTask`), as wave-2 (e) 15 said.
21. **SW-NET-02 vs SW-CONC-32.** SW-NET-02 says "the entry point awaits `close()` on … cancellation"; SW-CONC-32 measured that a plain `await` on the cancel path aborts. **Keep SW-NET-02** for client lifetime and **SW-CONC-32** for the cancel-path form, a shielded `defer` on 6.4. The awaited green twin of [network] G3b is the shielded form.
22. **SW-CONC-34 vs SW-CLI-11**, *overlap*. SW-CONC-34 owns placement; SW-CLI-11 already cites it.
23. **SW-CONC-33 vs SW-CLI-21**, *overlap*. SW-CONC-33 owns the shield deadline; SW-CLI-21 owns the `ServiceGroup` durations.
24. **SW-REL-09 vs SW-SEC-01**, *overlap*. The 128 KiB musl stack is consistent with the 64-depth default. SW-SEC-01 owns parser depth; SW-REL-09 owns the static-leg probe and the linker flag.
25. **SW-REL-08 vs SW-IO-04 rationale, map M-G-11 and [io] open question 3.** **Keep SW-REL-08**: FoundationEssentials is a compile-time guard, and the 45 MB is ICU. SW-IO-04's rationale names ICU-dependent API, not size.
26. **SW-REL-17 vs SW-PKG-09**, *overlap*. SW-PKG-09 owns how a dependency is declared; SW-REL-17 adds `path:` dependencies that a tag can reach.
27. **SW-REL-20 vs SW-GATE-20**, *overlap*. SW-GATE-20 owns the gate; SW-REL-20 owns only the baseline (the last release tag).
28. **SW-SEC-20 vs SW-PKG-27**, *overlap*. **Keep SW-PKG-27**: libraries do not commit the lock. SW-SEC-20 binds roots that ship; libraries scan a lock produced in CI.
29. **SW-SEC-15 vs SW-CLI-17.** SW-SEC-15 says no secret in an `@Option`; SW-CLI-17 sets the precedence flag > env > file. **Keep SW-SEC-15.** Secrets stay outside SW-CLI-17's precedence: stdin, a 0600 file, or env only as the documented CI channel.
30. **SW-API-17 vs SW-ERR-20 ([api] K11).** **Keep both.** SW-ERR-20 allows an `@nonexhaustive` enum error in general; the SDK is stricter: one struct with an open `Code` keyed on the exit status.
31. **SW-API-07 vs SW-CLI-15**, *overlap* (K9). Libraries take a `Logger`; only the executable bootstraps.
32. **SW-API-16 vs SW-IO-26 vs SW-CLI D6**, *overlap*. SW-API-16 owns the SDK's 128+s mapping text.
33. **SW-API-09, SW-API-17, SW-API-20 and SW-API-21 vs SW-IO-26 and SW-IO-28 ([api] K1 and K2).**
    - The working SDK package wins: `ProcessFailure` is `package`, the public error is the SW-ERR-20 struct, and capture is one symmetric 4 MiB limit.
    - SW-IO-26 keeps the one-spawn-module invariant.
    - SW-IO-28's strict-key recipe uses a raw-key `AnyKey` container.
    - The SW-PKG one-target `OCXKit` skeleton is replaced by SW-API-09's two targets with `Ocx*` names ([api] K3 and owner default 4).
34. **SW-TEST-14 vs [api] R (`--repeat-until` unknown on 6.3.3).** **Keep SW-TEST-14**, dated "6.4; on 6.3.3 use a parameterized repeat".
35. **SW-APPLE-04 vs [conc] owner default 1 ("Mutex everywhere").** **Keep SW-APPLE-04**: `Mutex` only when every iOS floor is at least 18, `OSAllocatedUnfairLock` below that. This closes [conc] Q1.
36. **`defaultIsolation` owners**, *overlap*. **SW-CONC-11** owns the prohibition. SW-APPLE-02 and SW-APPLE-15 (Xcode pairing), SW-PKG-19 and BZL-SWIFT-12 are surface-specific pointers.
37. **SW-APPLE-05 vs SW-PKG-16, SW-PKG-08 and SW-CONC-12** ([apple] C2), *overlap*. A manifest spells exactly the members, and no exemption is needed.
38. **SW-LANG-08 vs SW-CONC-13 and SW-CONC-20.** Both designs are sound. SW-LANG-08 owns the capture rule and SW-CONC-13 owns task ownership.
39. **SW-LANG-09 (no `Thread`) vs SW-CONC-23 (a dedicated `Thread` bridge).** `Thread` is allowed only as the SW-CONC-23 bridge.
40. **SW-LANG-03 ("`weak let` is 6.2.3") vs SW-CONC-04 and SW-PKG-08 ("6.3").** The declared floor stays 6.3 behind `#if compiler(>=6.3)`, and the measured introduction 6.2.3 is recorded. SW-LANG-03 and SW-LANG-04 own the guard text.
41. **SW-GATE-26 vs the research wrapper** (the stray `swiftlint` word). **Keep SW-GATE-26.** The shipped wrapper follows N-8.
42. **BZL-SWIFT-07..11 vs SW-PKG-07, SW-PKG-08, SW-PKG-13, SW-PKG-14 and SW-GATE-13, -15, -16**, *overlap* (they map). [bazel] C7's split stands: BZL-SWIFT-09 is MUST for the SW-PKG-07 features, and BZL-SWIFT-11 is SHOULD for SW-PKG-08.
43. **SW-CORE-04 vs SW-PKG-06 and SW-PKG-21.** **Keep SW-PKG-06's command.** SW-CORE-04 adds the baseline and the post-edit `dump-package` proof. SW-PKG-21 gains "`migrate` edits the dead `Package.swift` when a `Package@swift-X.swift` is in effect, and exits 0".
44. **SW-CORE-13 vs SW-PKG-18.** **Keep SW-PKG-18** for the loop rule. SW-CORE-13's loop-boundary awk replaces SW-PKG-18's over-broad `swiftSettings` grep.
45. **SW-ERR-05 vs SW-GATE-02 and SW-GATE-28** (a [gates] hand-off). SW-ERR-05's check calls SW-GATE-02's file list. An adopted repository whose `.swift-format` keeps `Never*` off cites SW-GATE-28.
46. **SW-TEST-18's production half vs SW-IO-24 and SW-IO-25.** This was settled in [testing] as a SHOULD reading heuristic. **Keep SW-IO-24 and SW-IO-25.**
47. **Not conflicts, confirmed:**
    - [swift-build#1764](https://github.com/swiftlang/swift-build/issues/1764) is the issue and #1763 the fix (SW-REL-03).
    - SW-NET-18's mapping to 69, 75, 79, 80 and 65 matches the SW-CLI-01 table.
    - SW-API-24 agrees with ocx 82-87.
48. **Cross-set:** SW-CLI-29's envelope and the exit-table drift against `rules/rust-quality/cli-contract.md`. Report this to the Rust set (owner D2); do not patch it here.

### (f) Convergence

**Verdict: ready to draft.** The held-out round of the wave plan is phase 8: real-tree runs, which this phase does not commission. The two questions the orchestrator set for this phase both answer no:
- The revised families produced no new failure class.
- No open question that is answerable now would change the text or the verification of a MUST rule.

**Failure classes by mechanism.** Every ranked failure mode in all 15 consolidations falls into one of nine classes:

| Class | Mechanism | The check that catches it | Wave-3 instances in the revised families (GATE, TEST, CONC, CLI) | New in wave 3? |
|---|---|---|---|---|
| K1 Fail-open check | An inert spelling, wrong binary, wrong operand, wrong order or wrong mode makes a violation exit 0 | SW-CORE-02 (plant and twin), SW-CORE-03 (canary), the SW-GATE-26 `Skipping` canary | ExplicitSendable spellings; flag order; the `&&` canary; two-dot and `HEAD` diff bases; the static SwiftLint; lines-only coverage; the file-level exit-test exemption; TSan report kind; default-backtracer exit 0 (R14); the SW-CLI-23 grep green on a bare root; SW-CLI-20 green on an explicit `[]` | No. Wave 2 had `lint` without `--strict`, `-Werror ExistentialAny` and the static SwiftLint |
| K2 Documented API that does not exist | Docs, release notes or training name a missing API or flag | SW-LANG-05: compile on the floor and on current | `.shutdownGracefully`; `--targets`; `--repeat-until` on 6.3; `.serialized(for:)` | No. Wave 2 had `defaultSwiftSettings:` and stdlib `FilePath` |
| K3 Linux Foundation divergence | corelibs behave silently differently | SW-LANG-01: build and run on the Linux image | `>&-` gives EINVAL; `setenv` crashes on glibc 2.39 | No. Wave 2 had `.atomic` mode and `Locale` |
| K4 Process-global and runtime state | signals, environment, cwd, file descriptors, stack size, inferred isolation | a behavioural run of the built binary (`set -m`), exit tests | the MainActor-inferred signal handler; `setenv` and `chdir` under parallel tests; `&` ignoring SIGINT; an empty environment value | No. Wave 2 had SIGPIPE and the dropped `raise()` |
| K5 Cancellation drops work silently | The cancel path returns normally or kills the child | a cancellation fixture that asserts a side effect | `AsyncChannel.send`; subprocess SIGKILL in cleanup; an unshielded `defer` await | No. Wave 2 had SW-IO-27 and SW-CONC-20 |
| K6 Unbounded resource | No cap on memory, time, depth or concurrency | a hostile-input run, a cap grep | the accept-loop window; unannotated `.unbounded` | No. Wave 2 had SW-IO-03 |
| K7 Toolchain and patch drift | Behaviour differs across 6.3, 6.4 or patch releases | floor and current legs (SW-GATE-25, SW-LANG-03), SW-CORE-14 probes | `limited` interop on 6.4; `ImplicitStrongCapture` only on 6.4; `migrate` fix-it deprecations | No. Wave 2 had `unknown warning group` |
| K8 Untrusted text or a credential reaches output | raw bytes, interpolated secrets | SW-SEC-16 canary, SW-SEC-17 byte count | ArgumentParser echoes ESC | No. Wave 2 had the M-I-09 follow-up and the sanitiser |
| K9 Two owners of one contract drift | the exit table or envelope owned twice | ID routing, (e) | exit table and envelope (cli); three TSan owners | No |

**Classification of the gap (f) instance.** Default-backtracer exit 0 looks new, but it is K1: the measured signal (the exit code) does not reflect the violation. The catching check already exists: SW-CONC-34 (3) runs with `enable=no` and asserts a side effect. (e) 19 adds the diagnose route row.

**Fresh families.** The fresh families' failure modes map onto the same nine classes:

| Failure mode | Family | Class |
|---|---|---|
| Unprefixed feature or misspelled `SWIFT_*` | BZL, APPLE | K1 |
| Scanner green on a vulnerable tree | SEC | K1 |
| `allKeys` hides unknown keys | API | K1 |
| `timeoutIntervalForResource` is a no-op | NET | K3 |
| `deadline:` bounds only the response head | NET | K6 |
| Swift Build drops the plugin environment | REL | K7 |
| `weak let` arrives in a patch release | LANG | K7 |
| Token in the `Authorization` description | SEC | K8 |

**Open questions, classified.** All 60 follow-ups from (a), plus the owner-decision lists:

| Class | Questions | Disposition |
|---|---|---|
| **Owner decision (default applied)** | See the defaults list below the table | The drafters state each as "default; the adopter may override" |
| **Measurement the corpus cannot supply** | See the no-host list below the table | Residue; the rows stay `unverified: read only` |
| **Dated re-check** | See the re-check list below the table | Steps of `swift-upgrade` (N-12) |
| **Answerable now, not load-bearing for a MUST** | See the not-commissioned list below the table | Not commissioned; Residue in (g) |
| **Answerable now, load-bearing for a MUST** | None | — |

The owner-decision defaults, by source:
- frame Q1-Q8;
- [gates] 1-8; [conc] 1-9, with 1 closed by SW-APPLE-04 and 4 scoped by (e) 20;
- [testing] Q-T3..Q-T8, with Q-T8 settled by (e) 14;
- [cli] D1-D10, with D9 narrowed by (e) 13;
- [language] 1-10; [api] 1-7; [network] Q-N1..Q-N5; [security] 1-7; [release] Q-REL-1..7;
- [apple] 1-6; [bazel] Q-B1..Q-B5; [procedures] 1-5;
- the unchanged wave-2 [package], [errors] and [io] lists, as classified in wave 2 (f).

The measurement the corpus cannot supply:
- macOS and Xcode: [conc] Darwin libdispatch; [apple] 1-3; [procedures] Apple diagnosis; [security] Apple privacy.
- Windows (Q7): [cli] Windows and WASI; [release] Windows releases; [api] the SDK on Windows and macOS; [testing] unverified platforms; [network] Darwin and Windows.
- arm64: the 133 trap code; arm64 static builds.
- GitHub-hosted runners: attestation and the shared API-breakage job.
- Real registries and a real ocx store: [network] real registries; [api] mutating calls under cancel.
- A real orchestrator: [cli] `ServiceGroup` under a container runtime.
- [testing] coverage merge on Windows and macOS.

The dated re-checks:
- 6.5: SE-0526 `withDeadline` and the MPSC and AsyncStreaming traits ([conc]).
- 6.4.1: `--static-swift-stdlib` ([release]).
- Patch-release syntax forms ([language]).
- `-Werror TemporaryPointers` on 6.4 ([security]).
- The LLVM coverage exclusion, and `.serialized(for:)` and `.taskLocal` ([testing]).
- swift-protobuf's 6.4 TSan job.
- swift-syntax prebuilt manifests.
- `migrate` fix-it deprecations.
- SwiftLint image bumps.
- Advisory floors (SW-SEC-20).

Answerable now but not load-bearing for a MUST, with the reason each was not commissioned:
- **The static musl trust store** ([network] 4, [release] 1). SW-REL-15 binds only images the owner asks for. Q-N1 keeps the SDK off the network, and no named fleet consumer ships a TLS-opening scratch image. N-8 adds a SHOULD clause plus a self-verifying `swift-release` step.
- **The TSan blind spot** ([testing] 4, [conc] 2). SW-GATE-27 is SHOULD, and the gap is documented.
- **Type-check flapping** ([procedures]). SW-LANG-07 and SW-CORE-20 are SHOULD.
- **The name-grammar fixture** ([security] 2). SW-SEC-24 is SHOULD.
- **SDK child-output scrubbing** ([security] 4). The SDK clause of SW-SEC-16 is SHOULD.
- **Small-stack recursion on real musl** ([security] 3). [release] measured the 128 KiB number that SW-SEC-01 already tests against.
- **Exit 132 for other traps** ([conc] 7). SW-CONC-22 verifies by `timeout` 124 and a grep, and 132 is only its rationale. SW-CONC-26 is SHOULD. SW-CORE-16 gains the R14 row ((e) 19).
- **Computed-static-var ABI** ([procedures]). It matters only for binary frameworks, which SW-API-04 restricts and the fleet has none of.
- Other [procedures] items:
  - test-runner reaping (SW-TEST-13 is SHOULD);
  - `migrate` on versioned manifests (an upstream report);
  - static-SDK diagnosis (SW-CORE-18 is SHOULD; [release] already measured `<unknown>` frames).
- Further [cli] and [language] items:
  - the [cli] SwiftLint port (an advisory carrier);
  - the [cli] `Status` suite (the mechanism is watched; the first fleet CLI writes it);
  - the [language] `[weak self]` base rate (a frequency, not text);
  - the non-Linux SDKs for [language].
- Further [api] items:
  - schema drift and SDK breadth: SW-API-21's tolerant decode holds, and generation from ocx's schema is the SDK repository's decision;
  - the capture ceiling: SW-API-20 is configurable as written;
  - import-level edges (SE-0409 is not implemented).
- Further [network] and [security] items:
  - push flows: no Swift pusher exists, deferred against M-H;
  - proxy over CONNECT: the SW-NET-09 config rule stands, and the https behaviour is deferred against M-H-07;
  - archive bombs: deferred against M-I-04;
  - header validation (M-I-11, P3).
- Further [bazel], [apple] and [gates] items:
  - [bazel] 1-5 (M-O-06 and M-O-08; BZL-SWIFT binds only on opt-in, Q-B2);
  - [apple] 4 (SwiftUI shape, SHOULD);
  - [gates] benchmark legs (M-P-02) and M-M-16 and M-M-09 (P3).

**What the stop condition still lacks.** It needs a held-out round on fresh trees with no new MUST and no new class. That is phase 8's job, which runs the drafted set against real trees. Wave 3 added 160 MUST rules in eight freshly opened families plus four revisions. That does not count against convergence by the orchestrator's rule: it is judged on classes, and no class is new.

### (g) Residue

There is no next wave. These items are carried as dated or no-host residue:

| Item | Where it lands |
|---|---|
| Static musl trust store (M-H-08, M-N-14) | N-8; phase 8 or the first image release |
| TSan blind spot and swift-protobuf 6.4 (M-E-12) | Documented gap; dated |
| Patch-release syntax forms (M-A-07) | Dated; N-12 |
| `--static-swift-stdlib` at 6.4.1 (M-N-02) | Dated; N-12 |
| `TemporaryPointers` on 6.4 (M-I-08) | Dated; N-12 |
| Exit 132 under the default backtracer for other traps (gap f) | Covered by the (e) 19 route row; phase 8 |
| Darwin, Xcode, Windows, arm64, Android and Embedded rows | No host (Q7); `unverified: read only` |
| Real-registry, real-ocx-store and real-orchestrator questions | Phase 8 |
| M-A-08, M-A-15, M-D-07, M-D-13, M-D-14, M-I-11, M-J-06..09, M-L-17..19, M-M-09, M-M-16, M-C-07, M-O-08, M-P-04 | Deferred (P3 or no consumer) |
| Sibling defects M-M-17 (`code-docs` on Swift) and M-M-18 (the `docs-quality` DocC example) | Reported, not patched |
| Drift between `rules/rust-quality/cli-contract.md` and ocx | Reported to the Rust set (owner D2) |
| The reference SDK package (467 source lines, research cache only) | Not shipped; kept for a future `ocx-sdk-swift` template (N-5) |

## Authoring notes (binding on the drafters)

These notes bind the phase-7 drafters. Where a note and a consolidation disagree, the note wins, because it records a resolution from (e) of a wave section above. Where a note is silent, the consolidation's own text is final, read together with the Wave 2 (e) and Wave 3 (e) resolutions.

### N-1. Rules and exact glob lists

- **`swift-quality`**, `paths: ["**/*.swift"]`.
  - Keywords: `swift,swiftpm,quality,concurrency,sendable,errors,testing,cli,subprocess,networking,security,swiftui`.
  - The index `rules/swift-quality.md` body stays under 200 lines.
- **`swift-package`**, with these `paths` in this order, 8 entries, all double-quoted:
  - `"**/Package.swift"`, `"**/Package@swift-*.swift"`, `"**/Package.resolved"`
  - `"**/.swift-format"`, `"**/.swiftformat"`, `"**/.swiftlint.yml"`
  - `"**/.swift-version"`, `"**/.spi.yml"`
  - Keywords: `swift,swiftpm,package,manifest,swift-format,swiftlint,toolchain,release,ci`.
- No brace globs. Dotted names stay explicit. `.swiftlint.yaml`, CI workflows, `Dockerfile`, `*.pbxproj`, `*.xcconfig`, `*.docc`, `MODULE.bazel` and `BUILD.bazel` are never globbed. The `swift-quality` index routes those tasks by keyword.
- Checker, behind an `if [ -d … ]` guard:

  ```
  python3 -I .claude/skills/research-lang/scripts/check-artifacts.py \
    rules/swift-quality.md rules/swift-package.md \
    skills/swift-upgrade skills/swift-diagnose skills/swift-release \
    --root /home/mherwig/.cache/research-lang/exemplars/swift/apple__containerization \
    --allow-absent '**/.swiftformat' --allow-absent '**/.swiftlint.yml' \
    --allow-absent '**/Package@swift-*.swift' \
    --forbid /home/ --forbid .cache/research-lang --forbid swiftlint-sk.sh
  ```

  containerization has 4 `Package.swift`, 4 `Package.resolved`, and 1 each of `.swift-format`, `.swift-version` and `.spi.yml`. It has 0 of the three allowed-absent names, which are live in swiftly, tuist and async-algorithms ([map] M2).
- Run the checker a second time over `rules/bazel-quality.md` after the N-13 edit.
- Each index says which glob it expects to be installed with, and that the other index ships beside it in `swift-essentials`.

### N-2. Depth files, owned family, and source sections

One family per file. A prefix belongs to one file forever. Depth files never point at other depth files. A cross-family reference cites the rule ID only, and the index routing table resolves where that ID lives.

Every rule is a table row whose first cell is the ID (`| SW-CONC-01 | … |`), with a filled Verification column. The checker treats only rows that start with an ID as definitions and reports a cited ID that no row defines.

| File | Family | Draw from |
|---|---|---|
| `rules/swift-quality/language.md` | SW-LANG | [language]: Ruleset 01-13, Verdict 1-11, failure modes 1-12, the T01-T17 bands ([language] owner default 7), conflicts; plus the (e) 7, 8, 38, 39 and 40 edits |
| `rules/swift-quality/concurrency.md` | SW-CONC | [conc]: Ruleset 01-35, Verdict 1-13 including gaps (a)-(f), scripts S1-S9 as fenced blocks, conflicts 1-23; plus the (e) 1, 2, 3 and 5 edits and wave-2 (e) 2 |
| `rules/swift-quality/errors.md` | SW-ERR | [errors], all sections; plus the (e) 11 and 45 edits and wave-2 (e) 12-14 and 16-17; drop line 328's "no production `@nonexhaustive`" ([api] K6) |
| `rules/swift-quality/api-design.md` | SW-API | [api]: Ruleset 01-27, Verdict 1-10, K1-K12; plus (e) 14 and 33 |
| `rules/swift-quality/testing.md` | SW-TEST | [testing]: Ruleset 01-24, Verdict 1-9, Documented gaps, conflicts; plus (e) 14, 15 and 34 |
| `rules/swift-quality/cli-contract.md` | SW-CLI | [cli], including the revision log, Documented gaps and rules 01-32 (27 shown as retired); plus (e) 6 and 13 |
| `rules/swift-quality/io.md` | SW-IO | [io]; plus (e) 25 and 33 and wave-2 (e) 9, 19, 21 and 22 |
| `rules/swift-quality/network.md` | SW-NET | [network]: Ruleset 01-19, Verdict 1-10, C1-C9 and the G checks; plus (e) 21 |
| `rules/swift-quality/security.md` | SW-SEC | [security]: Ruleset 01-24, Verdict 1-9, `sanitizeForTerminal` and its 19-row corpus, the SW-SEC-20 floor script; plus (e) 10 and 13 |
| `rules/swift-quality/apple.md` | SW-APPLE | [apple]: Ruleset 01-16, Verdict 1-10, conflicts 1-12; framed read-only (owner Q5), with every macOS behaviour `unverified: read only` |
| `rules/swift-package/gates.md` | SW-GATE | [gates]: Ruleset 01-29, the SW-GATE-01 block, the 43-rule `.swift-format`, the SW-GATE-11 `.swiftlint.yml`, C1-C20, Documented gaps; plus (e) 16, 17, 20 and 41 |
| `rules/swift-package/release.md` | SW-REL | [release]: Ruleset 01-22, Verdict 1-10, conflicts 1-11; plus (e) 9 and N-8 |
| `rules/bazel-quality/swift.md` | BZL-SWIFT | [bazel]: BZL-SWIFT-01..23, the header versions, C1-C8; see N-13 |

SW-PKG lives in the `rules/swift-package.md` index, drawn from [package] SW-PKG-01..38 plus the (e) 4, 43 and 44 edits. SW-CORE lives in the `rules/swift-quality.md` index (N-3).

**Shipped scripts and data** go under `rules/swift-quality/checks/`, the house convention of `rules/docs-quality/checks/`:
- [gates]: `k07.sh` in its SW-CORE-06 form, `never-gate.sh`, `swiftlint-gate.sh` (N-8) and `tsan-check.sh`.
- [procedures]: `weaken-check.sh`, `canary.sh`, `generated-touch.sh`, `silence-check.sh` and `fold-check.sh`.
- [apple]: `swift-settings-oracle.txt`, `pbx-blocks.awk` and `body-len.awk`, with the oracle's regeneration command beside it.

`gates.md` names these scripts by installed path in prose, not as Markdown links. `routing-check.sh` is not shipped; it runs at authoring (N-6). No `.md` file goes in `checks/`.

### N-3. Index-owned versus depth-owned

- **The `swift-quality` index owns SW-CORE outright** as one-line table rows:
  - 01..03: never weaken a check; watch it red; never trust empty output;
  - 04: read the floor and record a baseline, citing SW-PKG-06 for the command;
  - 05..06: generated code;
  - 09..15: the upgrade order, the no-hatch delta, `migrate --target`, the fold-check, dated probes and stop conditions;
  - 16..21: route by exit code plus first line (with the (e) 19 row), never fix by changing the measurement, capture before kill (with the (e) 18 carve-out), TSan in diagnosis, the type-check split (citing SW-LANG-07), the receipt.
  - SW-CORE-07 and SW-CORE-08 are retired (N-6).
- **The index also holds:**
  - the gate block, with commands only and citing SW-GATE-01: step 1 is the triple; 1b `never-gate.sh`; 1c `k07.sh`; 2 build with `-Xswiftc -warnings-as-errors`; 3 with the `SWIFT_TESTING_XCTEST_INTEROP_MODE=complete` prefix; 4 the API-breakage check; 5 DocC;
  - a non-negotiables list of at most 25 lines;
  - a routing table with one row per family it does not carry, keyed by task words:
    - SW-LANG, SW-CONC, SW-ERR, SW-API, SW-TEST, SW-CLI, SW-IO, SW-NET, SW-SEC and SW-APPLE route to the depth files;
    - SW-PKG, SW-GATE and SW-REL route to `swift-package`;
    - BZL-SWIFT routes to `bazel-quality`;
  - Siblings: `swift-package`, `code-docs` (doc comments, with M-M-17 named as its gap), `docs-quality` and `bazel-quality`;
  - the owner defaults Q1-Q8 in one line each.
- **The non-negotiables list is a curated subset**, each line ending in its rule ID. It is not the 204-row MUST inventory. It includes at least:
  - SW-CORE-01, SW-CORE-02, SW-CORE-03;
  - SW-GATE-01, SW-GATE-13;
  - SW-LANG-01, SW-LANG-02, SW-LANG-05;
  - SW-CONC-01, SW-CONC-13, SW-CONC-22, SW-CONC-32;
  - SW-ERR-14;
  - SW-API-01;
  - SW-TEST-01, SW-TEST-03, SW-TEST-18;
  - SW-CLI-02, SW-CLI-09;
  - SW-IO-05, SW-IO-09;
  - SW-NET-03;
  - SW-SEC-01, SW-SEC-13;
  - SW-PKG-06.
- **The `swift-package` index owns SW-PKG-01..38 outright.** It holds the manifest skeleton (SW-API-09's two-target shape for an SDK, (e) 33), the owner default Q1, and routes to `gates.md` and `release.md`.

### N-4. Bounded duplication

- A rule's text appears once, in its owning file.
- Allowed duplication is limited to:
  - the index non-negotiables line (one line, ending in the ID);
  - the index copy of the gate block's commands (citing SW-GATE-01);
  - skill tables (N-11).
- These appear in one file only:

  | Content | Only in |
  |---|---|
  | K-07 greps | `checks/k07.sh` |
  | `.swift-format` and `.swiftlint.yml` bodies | `gates.md` |
  | `sanitizeForTerminal` | `security.md` |
  | The exit-status table | `cli-contract.md` (SW-CLI-01); SW-NET-18 and SW-API-16 cite it |
  | The TSan job | SW-GATE-27; SW-TEST-17, SW-CONC-27 and SW-CORE-19 cite it |
  | The weaken list | SW-CORE-01; SW-GATE-12 lists only its extras ((e) 17) |

### N-5. Pinned decisions and defaults

- **Toolchain and tools**, each dated "measured 2026-10-10":

  | Tool | Pinned |
  |---|---|
  | Swift | 6.4.0 current, 6.3.3 previous, `swift:6.2.0` floor leg for libraries and the SDK |
  | swift-format | from the 6.4.0 toolchain |
  | SwiftLint | 0.65.1, image `ghcr.io/realm/swiftlint:0.65.1` |
  | swift-subprocess | 1.0.1 |
  | swift-argument-parser | 1.8.x |
  | swift-log | 1.16.x (1.14.0 for `Logger.current`) |
  | swift-service-lifecycle | 2.x |
  | swift-configuration | 1.2.2 |
  | AsyncHTTPClient | 1.36.2 |
  | swift-nio-ssl | floor 2.30, advisory floor 2.37.2 |
  | Static Linux SDK | 0.1.0 |
  | Bazel | 8.8.0 and 9.2.0 |
  | rules_swift | 4.2.1 |
  | rules_swift_package_manager | 1.25.0 |

- **Owner defaults Q1-Q8**, as in swift-frame.md:
  - Q1: libraries and the SDK use tools 6.2 and Swift 6 mode; CLIs and servers use 6.4.
  - Q2: swift-format, 4 spaces, 120 columns.
  - Q3: no `defaultIsolation` outside apps.
  - Q4: the SDK uses only the stdlib plus swift-subprocess, with 100% Linux lines.
  - Q5: the Apple depth file is read-only.
  - Q6: signals map to 128+n.
  - Q7: Windows is `unverified: read only`.
  - Q8: `bazel-quality` 0.4.0.
- **Decisions pinned by this harvest:**
  - Q-T8 goes to SW-API-13 ((e) 14).
  - The type-check limit is 200 ((e) 8).
  - Terminal text is escaped, not stripped ((e) 13).
  - D7 and D10: exit 74.
  - D9: SW-CLI-29 and SW-CLI-30 are SHOULD.
  - The SDK has no logger and no downloader ([api] 2, [network] Q-N1).
  - Proxy variables are read upper case first.
  - Timeouts are 30 s connect and 120 s idle read.
  - Tags are `vX.Y.Z`.
  - Binaries are stripped, with an unstripped twin kept as a CI artifact.
  - The SBOM is CycloneDX only.
  - Images are built only when the owner asks.
  - `Ocx*` names ([api] 4).
- **The reference SDK package is not shipped in this set.** No skill owns it. `api-design.md` gives its shape in rows, and the package stays in the research cache for a future `ocx-sdk-swift` template. This overrides [api] owner default 5.
- Every default is written as "default; the adopter may override". Fleet names (`ocx`, `OCX_SDK_EXE`, `OcxSDK`) are presented as examples the adopter renames, following the Portability section of rule-distillation.

### N-6. Drop at authoring

- **SW-CORE-07 and SW-CORE-08** are authoring-time checks on the lore artifacts themselves, not consumer rules. The checker and `routing-check.sh` enforce them at authoring. The index carries one line: "SW-CORE-07 and SW-CORE-08 are retired, not reused".
- **SW-CLI-27** was never issued. `cli-contract.md` carries one retired line.
- **These clauses are deleted or replaced as (e) directs:**
  - SW-CONC-04's "never a gate" and `-require-explicit-sendable` (1);
  - SW-CONC-27's "advisory only" and SW-CORE-19's "advisory in CI" (2);
  - SW-CONC-07's `--scratch-path` claim (3);
  - SW-PKG-32's `--targets` (4);
  - SW-CONC-12's `InferIsolatedConformances` clause (5);
  - SW-CLI-07's literal first import (6);
  - SW-CORE-20's `=100` gate (8);
  - SW-REL-01 (b)'s all-YAML operand (9);
  - SW-SEC-03's `bytes(for:)` branch (10);
  - the `URLError` branch of SW-ERR-18 and SW-ERR-20 (11);
  - SW-CLI-25's strip filter (13);
  - SW-TEST-22's unconditional SDK scope (14);
  - SW-TEST-21's Bazel sentence (15);
  - SW-GATE-10's import canary (16);
  - SW-GATE-12's general items (17);
  - SW-CONC-03's own CLI flag (wave-2 (e) 2).
- **Research-host specifics appear nowhere in shipped text:**
  - `run.sh` and `swiftlint-sk.sh`;
  - `~/.cache/research-lang` paths;
  - fixture names (`fx`, `crashy`, `deepred`, `sigmain`);
  - run IDs (R14, V17, CR6, …).

  A row says "watched red (measured 2026-10-10)". Exemplar citations keep the `repo@sha:path:line` form.
- **Rejected claims appear nowhere:**
  - `@specialize(where:)`, `mapKeyedValues`, `anyAppleOS` on 6.1;
  - `.shutdownGracefully`, `swift package audit`, `migrate --to-feature InternalImportsByDefault`;
  - "every 6.4 binary needs GLIBC_2.43" and "FoundationEssentials saves 45 MB";
  - the unprefixed `treat_warnings_as_errors` as a Swift gate, and `swift.debug_module_path` as default-on;
  - "`#filePath` breaks under Bazel" and "Xcode 27 defaults to Swift 5" stated as fact;
  - strict mode flagging a returned pointer, and a depth ceiling of 512.
- **Answered open questions** are not carried into any file:
  - Q-T1 and Q-T2;
  - [conc] Q1;
  - [gates] "coverage unresearched";
  - [io] open question 3.

### N-7. Exit codes under the backtracer (SW-CORE-16, SW-CORE-18, SW-CONC-34)

- SW-CORE-16's route table gains one row. Exit 0 with `Program crashed:` on stderr means a trap on a non-main thread while the main thread kept running. Rerun the same input with `SWIFT_BACKTRACE=enable=no` and expect 132.
- SW-CORE-18 keeps "never `enable=no` in a Dockerfile, unit or CI file". It adds the carve-out "except as a per-command prefix in a test that asserts a trap's exit code (SW-CONC-34, SW-CONC-26)".
- Every exit-132 assertion in a depth file states which backtracer setting it was measured under.

### N-8. Two release and gate fixes the consolidations left open

- **SW-GATE-26's shipped wrapper (`checks/swiftlint-gate.sh`).** The image's entrypoint is already `swiftlint`, so the wrapper passes `lint …` with no second `swiftlint` word. It still exits 70 on `Skipping enabled rule`. Watch it red once before shipping (SW-CORE-02).
- **SW-REL-15 and the CA bundle.** Keep the measured MUST clauses as they are. Add a SHOULD: "a binary that opens TLS copies a CA bundle into the scratch image, and the release leg makes one HTTPS request from the image". Mark the clause `unverified: read only`. `swift-release` carries it as a step whose own run is the check.
- SW-NET-08's note on `SSL_CERT_FILE` stays as written.

### N-9. Version-dating convention

- Every version-specific claim carries the tool and version, and either "(measured 2026-10-10)" or "(read 2026-10-10)". All 15 consolidations are dated 2026-10-10.
- Floors say which mechanism gates them:
  - the manifest tools version (manifest-gated);
  - the compiler (`#if compiler`, and patch-gated: `weak let` 6.2.3);
  - toolchain corelibs behaviour (`replaceItemAt` on 6.3.3).
- Each depth file opens with one line naming the versions it binds to, in the style of [bazel]'s header.
- Gaps that depend on upstream link the item and give its state on 2026-10-10:
  - [llvm-project#33625](https://github.com/llvm/llvm-project/issues/33625): open since 2017;
  - [swift-build#1764](https://github.com/swiftlang/swift-build/issues/1764): the fix #1763 is merged to main and 6.4.x, and 6.4.0 is the only 6.4 tag;
  - SE-0406: returned for revision;
  - SE-0526: not in 6.4;
  - LLVM PR 203723: closed unmerged on 2026-06-13;
  - the Swift Forums `Mutex` TSan thread 84801: cite it as [conc] does.

### N-10. Verification-command shape (every checker cell)

The lints that `check-artifacts.py` enforces:
- A description is present, at most 1024 characters, on one line, in the third person, and has a "Use when" clause.
- A rule index body is at most 200 lines. A SKILL.md body is at most 500 lines.
- A file of more than 100 lines has a contents line in its first 40 lines, or an index routing table.
- No broken relative links.
- Every support `.md` file is named in its index.
- File stems match `^[a-z0-9]+([.-][a-z0-9]+)*$`.
- `summary`, `keywords` and `repository` sit at the top level of the frontmatter.
- No glob is dead under `--root`.
- No ID is defined in two files. A cited ID that no table row defines is reported.
- No empty verification cell.
- A table row has the same number of unescaped `|` as its header.
- No `--forbid` string appears.

Inside code spans, the checker flags:
- `rg` with no path operand;
- `rg -L`;
- `-tn`;
- an escaped `\|` inside an `rg` or `grep -E` pattern in a table cell;
- an unquoted `**` in a `grep`, `rg`, `git grep` or `find` command;
- a `<template>` inside a quoted search pattern;
- `$(` command substitution;
- a bare `dir/*` path operand;
- an unquoted glob after `--include=` or `--exclude-dir=`.

The house shape of every command cell:
- Always give an explicit directory operand: `Sources`, `Tests` or `.`. Never rely on grep's implicit stdin.
- Use one `-e` per alternative. No `\|`, and no `-E 'a|b'` in a table cell. A PCRE pattern that needs `<` or `>` writes `\x3C` and `\x3E`, as [conc] S7 does.
- Quote `--include='*.swift'` and `--exclude-dir=.build` style operands. No unquoted `**`, and no `$(...)`. `V=$(cat .swift-version)` becomes `read -r V < .swift-version` inside a fenced block.
- No angle-bracket placeholders inside a pattern. Write a concrete example name (`OcxSdk`, `fx`) and say "rename".
- Use `xargs -r`, or `xargs -0 -r` after `find -print0`. Say that `xargs` exits 123 when `grep -L` lists a file.
- No unescaped `|` inside a table cell. A command that needs a pipe goes in a fenced block under the table, and the cell cites it by name. This applies to SW-REL-01 (b) and (c), SW-SEC-17 (b), the SW-TEST-22 loop, SW-CORE-01 and SW-NET-08's behavioural check.
- Each cell states what empty output means. For a violation locator, "empty output = pass" (grep exits 1). For a presence check (`grep -L`, `find … | awk 'END…'`), empty output means fail, and the cell says so.
- A cell with an exit-code contract names the code:

  | Command | Exit code |
  |---|---|
  | `swift format lint` without `--strict` | 0 on findings |
  | `diagnose-api-breaking-changes` | 1 on a break |
  | TSan | 66 |
  | `tsan-check.sh` | 1 on a race, 70 on no passing run line |
  | `swiftlint-gate.sh` | 70 |
  | `never-gate.sh` | 65 and 66 |
  | `canary.sh` | 1 on an empty tree |
  | `migrate --targets` | 64 |
  | `timeout` | 124 |

- Signal checks run in bash with `set -m`.
- Every check in a shipped file has a plant and a twin on record (SW-CORE-02). A check the consolidations did not watch red is labelled a reading heuristic.

### N-11. Skill scope

- **`swift-upgrade`, `swift-diagnose` and `swift-release` are procedures only:** numbered steps, each citing the rule IDs it enforces.
  - `swift-upgrade`: SW-CORE-04 and SW-CORE-09..15, steps U0..U10. Its description says "Swift 6 concurrency migration".
  - `swift-diagnose`: SW-CORE-16..21, with `references/` from the start for crash signatures (including the N-7 row), hang capture, backtrace settings and the type-check split.
  - `swift-release`: SW-REL-01..22, SW-GATE-20 and the N-8 CA step.
- **A skill never restates rule text.** Any MUST it repeats appears in a `| # | Finding | Rule |` table: the finding in plain words, the rule ID last. Never as a row that starts with the rule ID, because the checker would read that as a second definition.
- Each SKILL.md body is at most 500 lines.
- Each description is at most 1024 characters, in the third person, with a "Use when" clause, the exact symptom phrases (`Illegal instruction`, "exit code 132", `unable to type-check this expression in reasonable time`) and negative triggers.
- Every run ends with the SW-CORE-21 receipt.

### N-12. swift-upgrade dated re-checks

Each re-check is one numbered step that cites its source:

| Re-check | Rule |
|---|---|
| SE-0526 `withDeadline` | SW-CONC-33, SW-CORE-14 |
| SE-0540 and SE-0529 stdlib `FilePath` | SW-CORE-14, SW-IO-01 |
| The T-V42 typed-throws `Task` IRGen crash | SW-CORE-14 |
| `--static-swift-stdlib` at 6.4.1 or later | SW-REL-03 |
| swift-syntax prebuilt manifests | SW-REL-22 |
| Patch-release syntax forms | SW-LANG-03 |
| `-Werror TemporaryPointers` on 6.4 | SW-SEC-11 |
| `ImplicitStrongCapture` on the oldest leg | SW-LANG-08, SW-GATE-15 |
| The `Skipping enabled rule` canary on each SwiftLint image bump | SW-GATE-26 |
| LLVM coverage exclusion at 6.5 | SW-TEST-22 |
| `.serialized(for:)` and `.taskLocal` at 6.5 | SW-TEST-05 |
| The multi-producer channel's `.unbounded` and `~Copyable` capture | SW-CONC-35 |
| `migrate` `@concurrent` fix-it deprecations | SW-CORE-12 |
| Advisory floors | SW-SEC-20 |
| swift-subprocess releases | SW-IO-06 |
| The type-check limit on a loaded runner | SW-LANG-07 |
| The swift-protobuf 6.4 TSan failure | SW-GATE-27 |

### N-13. bazel-quality `swift.md` handoff shape

- `rules/bazel-quality/swift.md` is 200 lines or fewer, in the shape of `rules/bazel-quality/java.md`:
  - frontmatter `title` and `summary`;
  - an "Owns `BZL-SWIFT`" paragraph that names what it does not own: `*.swift`, `Package.swift` and `Package.resolved` belong to swift-quality and swift-package;
  - sibling families cited, never restated (BZL-MOD, BZL-HERM, BZL-CACHE, BZL-TEST, BZL-FLAG, BZL-ARCH, BZL-LARK, BZL-CI);
  - a Contents line;
  - the measurement disclosure: "Measured 2026-10-10 against Bazel 8.8.0 and 9.2.0, rules_swift 4.2.1, rules_swift_package_manager 1.25.0, Swift 6.4.0";
  - Gaps: M-O-08 static and cross builds, macros, the unrun attributes, test runtime, Apple, Windows, and Bazel 10, 9.3.0 and 8.8.1;
  - "What agents get wrong here".
- It is framed "if you adopt Bazel for Swift" (5 of 40 exemplars). BZL-SWIFT-01 is its scope rule, and Q-B2 says the fleet does not adopt it.
- It has no glob of its own.
- In the same change:
  - add one routing row to `rules/bazel-quality.md`: "Writing a `swift_*` target, configuring rules_swift features or toolchains, or bridging SwiftPM dependencies with rules_swift_package_manager";
  - add the keywords `rules_swift`, `swift_library`, `swift_binary`, `swift_test`, `swift.toolchain` and `rules_swift_package_manager`;
  - add `swift-quality` and `swift-package` to Siblings, and `*.swift` to its "never loads on" line;
  - bump `publish.toml` `[rules.bazel-quality]` `version` from `0.3.0` to `0.4.0`;
  - fix the `publish.toml` comment from "twelve depth files … four by language (Rust, Python, TypeScript, C++)" to fifteen depth files, eight by concern and seven by language (Rust, Python, TypeScript, C++, Go, Java/Kotlin, Swift). The directory holds 14 files today;
  - change "fourteen" to "fifteen" at `docs/bazel-quality.md:4` and `:52`, and update its body.

### N-14. Bundle and plumbing

- `swift-essentials` has these members: `swift-quality`, `swift-package`, `swift-upgrade`, `swift-diagnose`, `swift-release`, `code-docs` and `code-docs-cleanup`.
- Every member is untagged: no tag at all, and `latest` counts as a pin.
- `bazel-quality/swift.md` ships inside `bazel-quality`, not in the bundle.
- Plumbing:
  - `docs/<artifact>.md` for each of the six artifacts and the bundle;
  - `assets/glyphs/swift.svg` and `lore-swift.svg`;
  - the `publish.toml` entries;
  - the `SWIFT_CONSUMER` taskfile variable.
- M-M-17 and M-M-18 are named as sibling gaps in the Siblings line. They are not patched in this change.
