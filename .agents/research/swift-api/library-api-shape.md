---
title: Library API shape - access and imports, Sendable intent, enum evolution, speculative protocols, library logging, deprecation
topic: swift / API and SDK shape (SW-API) - revised W3-2, rows M-D-01..M-D-06 and M-D-08 (M-D-03 library evolution folded in)
agent: research-lang worker "library-api-shape" (wave 3)
model: sonnet
date_researched: 2026-10-10
sources_count: 23
fixtures: /home/mherwig/.cache/research-lang/swift-tools/fixtures/library-api-shape/
scope: |
  Covers what a Swift library or SDK author decides about its public surface in Swift 6.3.3 and 6.4.0 at tools-version 6.2: import and access levels
  (InternalImportsByDefault, MemberImportVisibility, `public import`, `package`), when library evolution applies, public enum evolution
  (`@nonexhaustive` / `@frozen` / struct plus `Code`), the speculative-protocol heuristic, the library logging contract (swift-log 1.16.1) and the deprecation recipe.
  Imports, does not restate: SW-CONC-04 / SW-GATE-17 (explicit Sendable), SW-ERR-20 (public error = struct plus open Code), SW-PKG floors (library tools 6.2).
  Not covered: SDK-over-CLI rows M-D-09..M-D-12, naming (M-D-07, well known), DocC. Linux only: every Apple or Windows statement is marked "unverified: read only".
---

# Library API shape (SW-API), 2026-10-10

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   - 2.1 [Import access: InternalImportsByDefault, public import, MemberImportVisibility](#21-import-access)
   - 2.2 [package access and who may be `public`](#22-package-access)
   - 2.3 [When library evolution applies to a SwiftPM library](#23-library-evolution)
   - 2.4 [Sendable intent on public types (import, plus the consumer view)](#24-sendable-intent)
   - 2.5 [Public enum evolution, reconciled with SW-ERR-20](#25-enum-evolution)
   - 2.6 [The API-breakage digester and `@nonexhaustive`](#26-digester)
   - 2.7 [The speculative-protocol heuristic](#27-speculative-protocols)
   - 2.8 [Library logging: swift-log 1.16.1](#28-library-logging)
   - 2.9 [Deprecation recipe](#29-deprecation)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- Turn on `InternalImportsByDefault` and `MemberImportVisibility` (`.enableUpcomingFeature`, both build on 6.3.3 and 6.4.0 at tools 6.2) in every library target; in Swift 6 mode a bare `import` is still `public` without the flag (d-off: rc 0).
- Under `InternalImportsByDefault` a public signature that names a type from a bare `import` fails: `error: function cannot be declared public because its parameter uses an internal type` plus `note: struct 'DepType' imported as 'internal' from 'Dep' here`; the fix is `public import Dep` (rc 1 to rc 0 on both toolchains).
- `package import Dep` does NOT help: `error: ... its parameter uses a package type`. Use `public import` only for modules whose types appear in a public signature.
- `swift package migrate --to-feature InternalImportsByDefault` does not exist (`error: Feature 'InternalImportsByDefault' is not migratable`, rc 64 on 6.4); `--to-feature MemberImportVisibility` works and writes the missing imports plus the manifest setting.
- Never write `@_exported import` in a library (SE-0409 confines it to overlays); grep for it.
- Cross-target helpers inside one package are `package`, not `public`; a consumer package cannot see them (`cannot find 'helper' in scope`, rc 1).
- Do not enable library evolution (`-enable-library-evolution`) on a source-distributed SwiftPM library: the swift.org blog says SwiftPM packages "should not be built with library evolution support". There is no first-class SwiftPM setting, only `.unsafeFlags`; tools below 6.2 reject that in a versioned dependency (rc 1 on 6.3/6.4 with tools 6.1), tools 6.2 silently stopped checking.
- A public enum is `@frozen` (closed domain) or it is not an enum. Adding a case to a plain public enum breaks every exhaustive consumer (`error: switch must be exhaustive`, rc 1); a struct with static members does not (rc 0).
- `@nonexhaustive` (SE-0487) is implemented in Swift 6.2.3; it compiles at tools 6.2 on 6.3.3 and 6.4.0 but is `error: unknown attribute 'nonexhaustive'` on 6.1.3. Guard it with `#if hasAttribute(nonexhaustive)` (rc 0 on 6.1.3, applied on 6.4: rc 1 when combined with `@frozen`) if the floor admits 6.2.0 to 6.2.2.
- Never add `@nonexhaustive` to an enum that already shipped: `swift package diagnose-api-breaking-changes` reports `enum Status is now with @nonexhaustive` (rc 1) and the old consumer stops compiling.
- Known tool gap: on 6.3.3 and 6.4.0 `diagnose-api-breaking-changes` still reports "added as a new enum case" (rc 1) for an `@nonexhaustive` enum, which SE-0487 says it should understand; suppress that one line with `--breakage-allowlist-path` (rc 0).
- A missing Sendable statement on a public type is invisible in the library and red in the consumer: `stored property 'config' of 'Sendable'-conforming struct 'Job' has non-Sendable type 'Config'` and `capture of 'c' ... in a '@Sendable' closure [#SendableClosureCaptures]`. A `Task {}` in `main.swift` does NOT show it (MainActor-isolated, rc 0), so consumer-side checks need a Sendable struct property.
- A protocol is speculative when it is non-public, has exactly one conformer across Sources and Tests, and no hand-written test double; the 40-repo corpus has 427 such protocols (audit) and the scan in this file flags them (red 1 line, green 0).
- A library never calls `LoggingSystem.bootstrap` and never builds `Logger(label:)`: it takes `logger: Logger` or defaults to `Logger.current` (task-local logger, swift-log 1.14.0 released 2026-06-24; 1.16.0 raised swift-log's own tools floor to 6.2). A second `bootstrap` traps: `Precondition failed: logging system can only be initialized once per process.` rc 132, also in `-c release`.
- `Logger.current` is a task-local captured at first touch: touching it before `bootstrap` makes the later bootstrap invisible to it (output stays on the default `[Lib] working` stream handler), and `Task.detached` does not inherit the bound logger's metadata.
- Library tests use `InMemoryLogHandler` with `Logger(label:factory:)` (product `InMemoryLogging`); bootstrapping in two tests crashes the test process (rc 1, signal 4).
- Deprecate in two steps: `@available(*, deprecated, renamed: "fetch(url:)", message: "removed in 3.0")` plus `@available(*, deprecated, renamed:)` on a `typealias` for renamed types (digester: no breaking changes, rc 0); the removal or `unavailable` step is a breaking change (rc 1) and belongs to the next major.
- No SwiftLint 0.65.1 or swift-format 6.4 rule covers any of this (rule lists read: only `explicit_acl`, `unused_import` analyzer, `sorted_imports`, `AllPublicDeclarationsHaveDocumentation` off by default); every gate here is a compiler build, the digester, or a grep or perl scan.

## Findings

### 2.1 Import access

**InternalImportsByDefault (SE-0409, Implemented 6.0, upcoming flag `InternalImportsByDefault`).** Without the flag an import has implicit access `public` "in Swift 5 and Swift 6" and will be `internal` "in a future language mode" ([SE-0409](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0409-access-level-on-imports.md), Default import access level). Measured on 6.4.0 and 6.3.3 with `.swiftLanguageMode(.v6)`: the same source `import Dep` plus `public func make(_ d: DepType) -> Int` compiles with the flag off (rc 0, `d-off`) and fails with it on (rc 1, `d-red`).

Incorrect (flag on):

```swift
import Dep                                   // internal under InternalImportsByDefault
public func make(_ d: DepType) -> Int { d.n } // error: function cannot be declared public because its parameter uses an internal type
                                              // note: struct 'DepType' imported as 'internal' from 'Dep' here
```

Correct:

```swift
public import Dep                              // Dep's types appear in a public signature
public func make(_ d: DepType) -> Int { d.n }  // rc 0
```

Not a fix: `package import Dep` gives `error: function cannot be declared public because its parameter uses a package type` (rc 1, `d-package`). `import Dep` used only in internal code compiles (`d-internal-use`, rc 0): that is the point of the flag, since the dependency is not re-exported and a client need not load it. `@_exported` "is accepted only on public import declarations" and SE-0409 rejects making it official ("Use `open import` as an official `@_exported import`" under Alternatives).

**Migration tooling.** `swift package migrate --to-feature InternalImportsByDefault` fails with `error: Feature 'InternalImportsByDefault' is not migratable` (rc 64, 6.4.0; `d/run-dm2.sh`), and `-enable-upcoming-feature InternalImportsByDefault:migrate` printed nothing on the plant (rc 0, `d-migrate`). So the migration is manual: turn the flag on, let the compiler list each leaking signature, add `public import` to exactly those files. `swift package migrate --to-feature MemberImportVisibility` does work: it applied 1 fix-it (`internal import Dep` added to the file using a transitively visible extension member) and added `.enableUpcomingFeature("MemberImportVisibility")` to every target (`d/run-dm3.sh`).

**MemberImportVisibility (SE-0444, Implemented 6.1, flag `MemberImportVisibility`).** Members (extension methods) are visible only through a direct import. Plant `m-red`: Lib imports `Mid` which `public import Dep`; `mid().twice()` fails with `error: instance method 'twice()' is not available due to missing import of defining module 'Dep' [#MemberImportVisibility]` (rc 1); adding `import Dep` is green (`m-green`, rc 0). Both flags together is what swift-log and Vapor ship ([swift-log@4038b6a4f74a:Package.swift:62-65](https://github.com/apple/swift-log/blob/main/Package.swift), `vapor@bf77fc69b142:Package.swift:249-250`).

**Package-graph hygiene.** `swift build --explicit-target-dependency-import-check error` did NOT go red on the plant that imports a module available only transitively (rc 0 on both toolchains; the transitive module was reachable through a `public import`, so the plant was not a true violation). Not recommended as a gate here; it stays "not run to red".

### 2.2 package access

`package` (SE-0386, Implemented 5.9) is visible to every module of the same SwiftPM package and to nothing outside. Plant `g`: `package func helper()` in `Core` is callable from sibling target `Lib` (rc 0) and invisible to a consumer package that `import Core` (`error: cannot find 'helper' in scope`, rc 1, `cons-pkg-red`; the transitive `import Core` itself compiled). Use it for cross-target internals instead of `public`: a `public` symbol is API you must version. Corpus density (per 10k production LOC, audit): swift-collections 143.1, swift-log 28.3, swift-argument-parser 0.0 ([exemplar-language-shape.md](../swift-audit/exemplar-language-shape.md) Axis 3 table). A `package`-level `import` is never enough for a public signature (2.1).

### 2.3 Library evolution

M-D-03. Primary guidance: "Frameworks that are always built and distributed together, such as Swift Package Manager packages or binary frameworks that are internal to your app, should not be built with library evolution support. Library evolution support should only be used when a framework is going to be built and updated separately from its clients" and enabling it "introduces a source-incompatible language change with the exhaustiveness of `switch` over enums" ([swift.org: Library Evolution in Swift](https://www.swift.org/blog/library-evolution/), 2020-02-13; still the canonical text). Measured: with the flag a plain public enum forces consumers to write `@unknown default` (`error: switch covers known cases, but 'Status' may have additional unknown values`, rc 1, 6.4.0 and 6.3.3, `le/cons-le-plain`) while `@frozen` does not (rc 0, `cons-le-frozen`).

How a SwiftPM package turns it on: there is no `SwiftSetting` for it, only `.unsafeFlags(["-enable-library-evolution"])` (`swift-package-manager@5546f44a3b52:Fixtures/Miscellaneous/LibraryEvolution/Package.swift:9`, and swift-testing wraps the same flag in a helper at `swift-testing@c7d68ca20cd7:Package.swift:520-531`). Whether such a package can be a versioned dependency depends on tools version: SwiftPM's rule `the target 'X' in product 'Y' contains unsafe build flags` is real at tools 6.1 (rc 1 on 6.4.0 and 6.3.3, `cons-le-remote61`) but "unsafe flags check disabled in 6.2" (`swift-package-manager@5546f44a3b52:Sources/PackageLoading/PackageBuilder.swift:1073-1074`, `usesUnsafeFlags: manifest.toolsVersion >= .v6_2 ? false : ...`; the check itself at `Sources/PackageGraph/ModulesGraph+Loading.swift:1530`, exemptions in `Sources/Workspace/Workspace+Manifests.swift:146-170`). At tools 6.2 the same dependency built (`cons-le-remote`, enum error rc 1 only because of the exhaustive switch). Only two corpus repos enable it, both because they ship ABI-stable binaries: swift-testing (`:530`) and SwiftPM's own runtime frameworks (`swift-package-manager@5546f44a3b52:Package.swift:231`, `:777`, `:791`, `:805`). Apple-framework side (`BUILD_LIBRARY_FOR_DISTRIBUTION`, XCFrameworks): unverified: read only.

### 2.4 Sendable intent

SW-CONC-04 owns the rule ("Every public type of a library or SDK states `Sendable`, an unavailable `Sendable`, or on 6.4 `~Sendable`") and SW-GATE-17 its gate (`-Xfrontend -require-explicit-sendable`, a warning in the build log, never an exit code); [swift-concurrency.md](../swift-concurrency.md) line 150. Not restated. What this dive adds is the consumer view and two re-measurements:

- Only non-public types get Sendable inferred. Plant `c/infer`: `struct Hidden { var n: Int }` captured in `@Sendable` closure compiles; `public struct Shown { public var n: Int }` in the same module fails `capture of 's' with non-Sendable type 'Shown' in a '@Sendable' closure [#SendableClosureCaptures]` (rc 1, 6.4.0).
- Consumer-side red (rc 1, 6.4.0 and 6.3.3): a public `Config` with no statement, used by another package as a stored property of a `Sendable` struct and in a `@Sendable` closure. Diagnostics (verbatim): `error: stored property 'config' of 'Sendable'-conforming struct 'Job' has non-Sendable type 'Config'` and `error: capture of 'c' with non-Sendable type 'Config' in a '@Sendable' closure [#SendableClosureCaptures]`. Green: `public struct Config: Sendable` (rc 0).
- `@available(*, unavailable) extension Config: Sendable {}` is accepted by `-require-explicit-sendable` (no warning, rc 0) and keeps the consumer red: that is the correct "deliberately not Sendable" statement (`lib-c-unavail`, `cons-c-unavail`).
- The library-side gate prints `warning: public struct 'Config' does not specify whether it is 'Sendable' or not [#ExplicitSendable]` with exit 0 (`lib-c-flagged`; green twin prints nothing). Reported as "not red by exit code", as SW-CONC-04 already records.
- Trap in test design: `let c = Config(...); Task { print(c.name) }` in `main.swift` compiled (rc 0) because the top-level code and the `Task` are MainActor-isolated, so no isolation boundary is crossed. A consumer fixture must cross a boundary (stored property of a `Sendable` type, actor argument used afterwards, `@Sendable` capture).

### 2.5 Enum evolution

M-D-04, reconciled with SW-ERR-20 ([swift-errors.md](../swift-errors.md) line 168: public error = `struct XError: Error, Sendable` with open `struct Code`; an enum error "only as `@nonexhaustive` from its first release, or as a `@frozen` registered closed domain").

Facts, all `swift build` in a consumer package (outside the library package; same-package consumers are treated as one unit and never see the problem, per [SE-0487](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0487-extensible-enums.md) "Exhaustive switching inside same module/package"):

| library | consumer switch | result 6.4.0 / 6.3.3 |
|---|---|---|
| plain `public enum Status { ok, failed }` v1 | exhaustive | rc 0 |
| same enum v2 (adds `timedOut`) | exhaustive | rc 1 `error: switch must be exhaustive` |
| `@nonexhaustive` v1 | exhaustive, no default | rc 1 `error: switch covers known cases, but 'Status' may have additional unknown values, possibly added in future versions` |
| `@nonexhaustive` v1 | `@unknown default` | rc 0 |
| `@nonexhaustive` v2 (adds case) | `@unknown default`, new case unhandled | rc 0 with `warning: switch must be exhaustive` |
| plain v1, then `@nonexhaustive` added later, no new case | exhaustive | rc 1 (same message as row 3): retrofit is source-breaking |
| `struct Status: RawRepresentable` with static members, v2 adds a static | `default:` | rc 0 |
| `@frozen public enum` (non-resilient package) | exhaustive | rc 0 |

SE-0487 text: "For non-resilient libraries, adding a case is a source-breaking API change"; "Adding the `@nonexhaustive` attribute is an API breaking change. Removing ... is API stable"; `@nonexhaustive(warn)` stages the migration (error downgraded to warning; "Package A decides to extend the enum and releases a new major version"); `@nonexhaustive` and `@frozen` cannot combine (`error: cannot use '@nonexhaustive' together with '@frozen'`, reproduced). Status "Implemented (Swift 6.2.3)", accepted by the language steering group ([acceptance post, Ben Cohen, 2025-08-05](https://forums.swift.org/t/accepted-se-0487-nonexhaustive-enums/81508)).

Availability, measured with `swiftc -typecheck -swift-version 6` on the official images: Swift 6.1.3 `error: unknown attribute 'nonexhaustive'` (rc 1); 6.3.3 and 6.4.0 rc 0; and at tools-version 6.2 SwiftPM builds on 6.3.3 and 6.4.0. A manifest at tools 6.2 admits compilers 6.2.0 to 6.2.2 that predate the attribute (cannot be run here: no 6.2 image; read from the SE status line). The compatible spelling, run on 6.1.3 (attribute skipped, rc 0) and 6.4.0 (attribute applied, proven by the `@frozen` clash, rc 1):

```swift
#if hasAttribute(nonexhaustive)
@nonexhaustive
#endif
public enum Status: Sendable { case ok, failed }
```

Reconciliation, stated as the decision:

1. Errors: struct plus open `Code` (SW-ERR-20) is the default, because a struct is evolvable on every compiler and `catch` can still discriminate through `Code`. SE-0487's own motivation lists this: "Using enumerations to represent `Error`s is inadvisable"; "fake enumerations ... do not work with the nice `Error` pattern-match logic in catch blocks, requiring type casts".
2. Non-error public enums: `@frozen` when the domain is closed by construction (`Optional`-like; the corpus uses it in swift-collections, swift-system, swift-async-algorithms), `@nonexhaustive` (guarded) when pattern matching is the point and cases will grow, otherwise a struct with static members.
3. An already-shipped plain enum cannot be fixed without a break: use `@nonexhaustive(warn)` in a minor, add cases in the next major.
4. Public `Error` enums: the one exception SW-ERR-20 allows is the same `@nonexhaustive` from the first release. Vapor does exactly this: `vapor@bf77fc69b142:Sources/Vapor/Server/ServerError.swift:2` and `Application+AddressConfiguration.swift:36` (correcting [swift-errors.md](../swift-errors.md) line 328, which counted only swift-protobuf: the clone has `@nonexhaustive` in swift-crypto (33 lines, e.g. `swift-crypto@1c80d3aff53f:Sources/Crypto/PRF/AES.swift:19`, tools 6.2), Vapor (2) and swift-protobuf (2, generator output)).

Corpus reality (17 library-shaped repos, `Sources/` only): 363 `public enum` declarations, 310 (85%) carry neither `@frozen` nor `@nonexhaustive` (per-repo table in 5); `perl pubenum.pl` in Verification runs is the scan.

### 2.6 Digester

`swift package diagnose-api-breaking-changes <baseline>` (SE-0487 says it "is also updated to understand the new `@nonexhaustive` attribute") is the only tool that turns these rules into an exit code. Plants (`dg/`, git repos tagged `1.0.0`, HEAD = v2):

| change since 1.0.0 | 6.4.0 | 6.3.3 |
|---|---|---|
| plain enum: add case | rc 1 `enumelement Status.timedOut has been added as a new enum case` | same |
| struct plus static members: add static | rc 0 `No breaking changes detected in Lib` | same |
| `@nonexhaustive` enum: add case | rc 1 same message (false positive: consumers with `@unknown default` are unaffected) | same |
| plain enum becomes `@nonexhaustive` | rc 1 `enum Status is now with @nonexhaustive` (true positive) | same |
| `@nonexhaustive` add case with `--breakage-allowlist-path ../allow.txt` containing that message | rc 0 | not run |

So the digester is the correct red for enum changes and for retrofitting; for `@nonexhaustive` additive cases an allowlist entry (one message line) is currently required. Treat the third row as a tool bug, not a rule.

### 2.7 Speculative protocols

M-D-05. Corpus facts ([exemplar-language-shape.md](../swift-audit/exemplar-language-shape.md) lines 304-316, protocol-conformer table): 1,752 production protocols; 690 (39%) exactly one conformer; 85 none; 427 "pure single-prod-conformer" with no test, mock or generated conformer (internal 238, public 158, private 18, package 13); leaders element-x-ios 112 and tuist 111, spot-read as one-protocol-per-class dependency-injection conventions "not library extension points"; 240 more single-conformer protocols exist only because a mock generator (Sourcery or `@Mockable`) produces the second conformer.

Heuristic decided (a protocol is speculative, and is deleted or replaced by the concrete type, when ALL hold):

1. It is not `public` or `open` (public protocols are downstream extension points; judge them by whether the doc comment names who conforms);
2. exactly one type conforms across `Sources/` and `Tests/` (one-line headers; extensions count);
3. no hand-written test double conforms (a generated mock does not count; the protocol exists for the generator, not the design);
4. it has no second planned conformer named in the same change.

The second conformer that justifies it is a real alternative implementation or a hand-written spy in `Tests/`. Cheaper seams first: a stored closure (`var send: @Sendable (String) async throws -> Void`) or a struct of closures replaces a one-method protocol and needs no `any`. Run on this corpus the scan (Verification runs, `proto1.pl`) flags 0 in vapor, 1 in swift-log (a test-local `History`), 1 in containerization, 8 in SwiftPM, 15 in swift-build, 131 in tuist and 145 in element-x-ios; tuist's figure includes `@Mockable` protocols where the generated mock is invisible to a one-line scan, so macro-generated doubles must be treated as "not a second conformer", exactly as the audit does. Red/green on the plant: `red` (internal `MailSending` plus `SMTPMailer`, test uses the concrete type) prints 1 line; `green` (same plus hand-written `SpyMailer` in Tests) prints 0; a public protocol with one conformer is not flagged (`pub`).

### 2.8 Library logging

M-D-06, swift-log 1.16.1 (released 2026-10-07, [release notes](https://api.github.com/repos/apple/swift-log/releases?per_page=12); 1.16.0 "Bump minimal Swift tools version to 6.2"; the task-local logger of SLG-0006 landed earlier, in 1.14.0 on 2026-06-24).

- Contract text (swift-log docs, [003-AcceptingLoggers.md](https://github.com/apple/swift-log/blob/main/Sources/Logging/Docs.docc/BestPractices/003-AcceptingLoggers.md), read at `swift-log@4038b6a4f74a`): "Propagate caller context by accepting a `Logger` parameter or reading the task-local `Logger.current` - never by constructing your own logger." `Logger(label:)` "is for the application - typically at `@main` paired with `.withLogger()`". The README today carries no libraries-versus-applications section (read in full 2026-10-10); this best-practice page is the contract.
- `LoggingSystem` docs: "`bootstrap` can be called at maximum once in any given program, calling it more than once will lead to undefined behavior, most likely a crash" (`swift-log@4038b6a4f74a:Sources/Logging/LoggingSystem.swift:44-46`); the implementation is `precondition(!validate || !self.initialized, ...)` (`:165`).
- **The double-bootstrap trap, run (b1):** a library `configure()` calls `LoggingSystem.bootstrap(StreamLogHandler.standardError)` and the app already bootstrapped: `Logging/LoggingSystem.swift:165: Precondition failed: logging system can only be initialized once per process.`, `Illegal instruction`, rc 132; identical in `-c release` (rc 132) and on 6.3.3. Twin (b2): the library takes `logger: Logger`, the app bootstraps once, rc 0, output `CUSTOM: working [:]`.
- **`Logger.current` trap, run (b3/b4):** swift-log docs: the unbound default "is captured at first access, `LoggingSystem.bootstrap(_:)` must be called before any task-local logger API is exercised" (`Logger.swift:1486-1530`). Plant b3 calls `Svc.work()` (reads `Logger.current`) then bootstraps a custom handler then calls it again: both lines print through the default stream handler (`info: [Lib] working`), `CUSTOM` never appears, rc 0 (silent misrouting, not a crash). Twin b4 bootstraps first: `CUSTOM: working [:]`.
- **Propagation boundary, run (b5):** inside `withLogger(bound)` a child `Task {}` sees `CUSTOM: child-task ["req": 42]` and `Task.detached` sees `CUSTOM: detached [:]` (the process-wide fallback, no request metadata). The docs also list GCD, `URLSession` completion handlers, delegates, `NotificationCenter` and C callbacks as boundaries that see the fallback. Apple-only types here: unverified: read only.
- **Test trap, run (b6/b7):** two Swift Testing tests that each call `LoggingSystem.bootstrap`: `swift test` rc 1, `Precondition failed ...` then signal 4 (6.4.0 and 6.3.3). Twin with `InMemoryLogHandler` and `Logger(label:factory:)` (product `InMemoryLogging`, [004-TestingLogging.md](https://github.com/apple/swift-log/blob/main/Sources/Logging/Docs.docc/BestPractices/004-TestingLogging.md)): both tests pass, rc 0. The docs say: "Don't use `LoggingSystem.bootstrap(_:)` in a test, it sets one process-wide backend and traps if called twice."
- `Logger.current` and `withLogger` come from SLG-0006 ("Approved", implemented in swift-log 1.14.0; `swift-log@4038b6a4f74a:Sources/Logging/Docs.docc/Proposals/SLG-0006-task-local-logger.md`), available at runtime from `@available(macOS 10.15, iOS 13.0, ...)` (`Logger.swift:1474`; Apple deployment behaviour: unverified: read only). Consumers of the idiom: `swift-aws-lambda-runtime@8abd464310c7:Sources/AWSLambdaRuntime/Logging/LoggingConfiguration.swift:41` and `FoundationSupport/LambdaRuntime+JSON.swift:139` (`logger: Logger = Logger.current`).
- Real libraries mostly take a parameter: `swift-server/async-http-client@017115279d09:Sources/AsyncHTTPClient/HTTPClient.swift:390` (`logger: Logger`); containerization uses the hybrid `logger ?? Logger(label: "com.apple.containerization.bridge")` (`apple/containerization@3e7bc39e66b3:Sources/Containerization/BridgeManager.swift:90`), which the swift-log page calls "Avoid" because the fallback ignores the application's metadata.
- Who bootstraps: executables only (`containerization@3e7bc39e66b3:Sources/cctl/cctl.swift:24`); one library-shaped violation: tuist's `TuistLogging` module bootstraps in `ApplicationLogStore.swift:44-51` (`tuist@2f6ac74754bf`), acceptable only because that module is application-internal.

### 2.9 Deprecation

M-D-08. Plants (`f/`, library v1 has `get(_:)` and `OldName`):

- Step 1 (minor release, additive): keep the old API, add the new, annotate: `@available(*, deprecated, renamed: "fetch(url:)", message: "removed in 3.0")` on the method and `@available(*, deprecated, renamed: "NewName") public typealias OldName = NewName`. Consumer diagnostics (rc 0 on 6.4.0 and 6.3.3): `warning: 'get' is deprecated: removed in 3.0 [#DeprecatedDeclaration]`, `warning: 'OldName' is deprecated: renamed to 'NewName' [#DeprecatedDeclaration]`. Digester vs 1.0.0: `No breaking changes detected in Lib` (rc 0). [TSPL Attributes](https://raw.githubusercontent.com/swiftlang/swift-book/main/TSPL.docc/ReferenceManual/Attributes.md) lines 307-324: `renamed` gives "a textual message that indicates the new name"; with `unavailable` the compiler emits the rename error.
- Bare `@available(*, deprecated)` is a defect: `warning: 'get' is deprecated [#DeprecatedDeclaration]`, no replacement named, no timeline (rc 0; caught by a grep).
- Consumers enforce it with a group error rather than blanket warnings-as-errors: `.treatWarning("DeprecatedDeclaration", as: .error)` gives `error: 'get' is deprecated: removed in 3.0 [#DeprecatedDeclaration]` (rc 1); `.treatAllWarnings(as: .error)` also red (rc 1, `cons-f-dep-werror`).
- Step 2 (next major): `@available(*, unavailable, renamed: "fetch(url:)")` yields `error: 'get' has been renamed to 'fetch(url:)'` (rc 1 for callers) and the digester reports `func Client.get(_:) has been removed` and `struct OldName has been removed` (rc 1): a major-version change. Plain removal is the same red. Keeping a renamed `typealias` deprecated through the whole major line is free (digester green); only delete after the deprecation shipped in at least one full minor release.
- Timeline rule (decided; no Swift source mandates a duration): deprecate in release N.x with the removal major named in `message:`, keep it through all N.y, remove or mark `unavailable` at (N+1).0. Apple-platform `@available(iOS ...)` availability and Xcode's rename fix-it presentation: unverified: read only (the CLI prints the rename in the message; the fix-it application is an IDE feature).

## Normative guidance candidates

Numbering is local to this dive (SW-API-nn); the consolidation will renumber. "Ran" says whether the verification was watched red on a planted violation and green on a compliant twin (fixture root `/home/mherwig/.cache/research-lang/swift-tools/fixtures/library-api-shape/`, abbreviated `F/`). Every command below is read so that its OUTPUT is the violation (empty output means pass) unless it is a `swift build`/`swift package` whose exit code is the signal.

1. **SW-API-01 (MUST for libraries and SDKs, tools 6.2).** Enable `.enableUpcomingFeature("InternalImportsByDefault")` and `.enableUpcomingFeature("MemberImportVisibility")` on every library and SDK target, inside the same `swiftSettings` as `.swiftLanguageMode(.v6)`. Why: otherwise a bare `import` silently re-exports the dependency to every client (public by default in Swift 6 mode, SE-0409) and transitive extension members leak (SE-0444). Verify: `grep -L -e 'InternalImportsByDefault' Package.swift` prints the manifest when the feature is missing (empty = pass); run the same for `MemberImportVisibility`; then `swift build` with exit 0. Ran: yes, `F/d/d-off/Package.swift` printed (red), `F/d/d-red/Package.swift` silent (green); the `swift build` effect is SW-API-02.
2. **SW-API-02 (MUST).** A module gets `public import` only if one of its types appears in a public or `@inlinable` signature of that file; every other import is bare (internal under SW-API-01). Do not use `package import` to satisfy a public signature. Why: `public import` is a public dependency promise; the compiler already proves the necessary direction (`error: ... parameter uses an internal type`), the sufficient direction (no over-public import) is a reading task. Verify: `swift build` (rc 1 names the leaking declaration and the note names the import); over-publicity: `grep -rn -e '^public import' --include='*.swift' Sources` and ask for each hit "does this module's type appear in a public signature of this file?". Ran: yes for the compiler direction (`F/d/d-red` rc 1 on 6.4.0 and 6.3.3, twins `d-public` and `d-internal-use` rc 0, `d-package` rc 1); no (reading heuristic) for the over-public direction.
3. **SW-API-03 (MUST).** No `@_exported import` in a library target outside a deliberate overlay module. Why: SE-0409 allows it only on public imports and treats it as a different mechanism from public dependency; it defeats SW-API-01. Verify: `grep -rn -e '@_exported' --include='*.swift' Sources` (output = violation). Ran: yes (`F/d/d-off/Sources/Lib/Ex.swift` hit, `d-red/Sources` silent).
4. **SW-API-04 (SHOULD).** Declarations used only by sibling targets of the same package are `package`, not `public`. Why: every `public` symbol is versioned API; `package` is invisible outside the package (SE-0386). Verify: `swift build` in a consumer package that calls the symbol (rc 1 `cannot find ... in scope`); reading heuristic for existing code: list `public` declarations whose only referrers are in the same package. Ran: yes for the visibility fact (`F/g/cons-pkg-red` rc 1, `cons-pkg-ok` rc 0); no for the referrer heuristic.
5. **SW-API-05 (MUST NOT without a binary-distribution need).** Do not pass `-enable-library-evolution` for a source-distributed SwiftPM library; enable it only for a binary framework built apart from its clients, from its first release, and then every public non-`@frozen` enum needs consumers to write `@unknown default`. Why: swift.org says SwiftPM packages "should not be built with library evolution support" and it changes performance and enum source compatibility. Verify: `grep -rn -e 'enable-library-evolution' --include='Package*.swift' .` (every hit needs a binary-framework justification in the PR); on tools 6.1 and below the flag in a versioned dependency also fails resolution. Ran: yes for both facts (`F/le/cons-le-plain` rc 1 and `cons-le-frozen` rc 0; `cons-le-remote61` rc 1 `contains unsafe build flags`, `cons-le-remote` at tools 6.2 builds); the grep itself was run on the corpus (hits only in swift-testing and SwiftPM).
6. **SW-API-06 (SHOULD, imports SW-CONC-04 and SW-GATE-17).** Add a consumer-compile twin to the Sendable statement: the library's test or example package (a separate package, not a target of the library package) stores each public type in a `Sendable` struct property and captures it in a `@Sendable` closure; deliberate non-Sendable uses `@available(*, unavailable) extension T: Sendable {}`. Why: the library-side gate prints a warning with exit 0 and a `Task {}` in `main.swift` hides the defect. Verify: `swift build` of that consumer package (rc 1 on `stored property ... has non-Sendable type`). Ran: yes (`F/c/cons-c-bare` rc 1, `cons-c-stated` rc 0 on 6.4.0 and 6.3.3; `cons-c-unavail` rc 1 as intended; library flag `lib-c-flagged` warning only, rc 0 = not red by exit code).
7. **SW-API-07 (MUST for new public API).** A public enum is `@frozen` (closed domain) or `@nonexhaustive` from its first release, or it is a struct with static members; public error types follow SW-ERR-20 (struct plus open `Code`). When the declared floor admits compilers before 6.2.3, write `#if hasAttribute(nonexhaustive)` / `@nonexhaustive` / `#endif`. Never add `@nonexhaustive` to a shipped enum (use `@nonexhaustive(warn)`, then add cases in the next major). Why: adding a case breaks every external exhaustive switch; the retrofit is itself breaking. Verify: `find Sources -name '*.swift' | xargs -r perl pubenum.pl` (script under Verification runs; output = each unmarked public enum) and `swift package diagnose-api-breaking-changes <last-tag>` (rc 1). Ran: yes (`F/a/pubenum.pl` prints 1 line on `lib-enum-v2`, 0 on `lib-nonex-v2`, `lib-struct-v2`, `lib-frozen-v1`; consumer builds `F/a/cons-exh-enum-v2` rc 1 versus `cons-unk-nonex-v2` rc 0 and `cons-str-v2` rc 0 on both toolchains; `swiftc -typecheck` of `@nonexhaustive` rc 1 on 6.1.3, rc 0 on 6.3.3 and 6.4.0).
8. **SW-API-08 (MUST for libraries with releases).** CI runs `swift package diagnose-api-breaking-changes <previous-release-tag>` on every PR; a non-major PR must exit 0; the known `@nonexhaustive`-added-case false positive is recorded in an allowlist file passed with `--breakage-allowlist-path`, one message per line, reviewed on each toolchain bump. Why: it is the only automated red for enum, deprecation and removal rules. Verify: the command itself. Ran: yes (`F/dg`: enum rc 1, struct rc 0, adopt-later rc 1, `@nonexhaustive` add-case rc 1 on 6.4.0 and 6.3.3, allowlisted rc 0 on 6.4.0).
9. **SW-API-09 (SHOULD).** Delete a speculative protocol: non-public, one conformer across Sources and Tests, no hand-written test double, no named second conformer; use the concrete type, a stored closure, or a struct of closures. A protocol is added when the second real conformer or the first hand-written spy exists. Why: 39% of corpus protocols have one conformer; each is an `any` existential or generic parameter and a mock-generator dependency without a design reason. Verify: `find Sources Tests -name '*.swift' | xargs -r perl proto1.pl` (script under Verification runs; output = candidate, then apply the four-point test by reading). Ran: yes (`F/e/red` 1 line, `F/e/green` 0 lines, `pub` 0 lines; corpus spot runs in 5); the judgement of "named second conformer" is a reading heuristic.
10. **SW-API-10 (MUST for library and SDK targets).** A non-executable target never calls `LoggingSystem.bootstrap` and never constructs `Logger(label:)`; it takes `logger: Logger` (or defaults a parameter to `Logger.current` when the floor is swift-log 1.14.0 or later) and passes it down. Why: bootstrap is once per process and traps (rc 132); a self-made logger discards the caller's handler, level and metadata. Verify: `grep -rn -e 'LoggingSystem\.bootstrap' --include='*.swift' Sources` and `grep -rn -e 'Logger(label:' --include='*.swift' Sources` run against the library target directories (output = violation; the executable target's directory is excluded by naming only library directories). Ran: yes (`F/b/b1-lib-bootstraps/Sources/Lib` prints the `bootstrap` and `Logger(label:)` lines, `b2-lib-takes-logger/Sources/Lib` prints nothing; runtime: `F/b/b1` rc 132 on 6.4.0, 6.3.3 and `-c release`).
11. **SW-API-11 (MUST for executables and servers).** `LoggingSystem.bootstrap` is called exactly once, before the first read of `Logger.current` or construction of any `Logger`; a boundary that is not a Swift task (GCD, completion handler, delegate) or `Task.detached` re-binds explicitly with `withLogger(captured)`. Why: `Logger.current`'s fallback is captured at first touch and a later bootstrap is invisible to it (silent misrouting, rc 0). Verify: a smoke run that logs through `Logger.current` and asserts the custom handler's marker appears in output; `grep -rn -e 'Task\.detached' --include='*.swift' Sources` lists detach points to inspect. Ran: yes (`F/b/b3-current-before-bootstrap` shows `[Lib] working` and no `CUSTOM`, `b4-current-after-bootstrap` shows `CUSTOM: working`, `b5-current-detached` shows the metadata missing in the detached task; both toolchains rc 0 for all three, so the red is the output, not the exit code).
12. **SW-API-12 (MUST).** Library tests never call `LoggingSystem.bootstrap`; they build a `Logger(label:factory:)` over `InMemoryLogHandler` (product `InMemoryLogging`) and assert on `entries`. Why: a second bootstrap in the same test process crashes it. Verify: `grep -rn -e 'LoggingSystem\.bootstrap' --include='*.swift' Tests` (output = violation) and `swift test`. Ran: yes (`F/b/b6-test-bootstrap-twice` grep prints 2 lines and `swift test` rc 1 with signal 4; `b7-test-inmemory` grep silent and `swift test` rc 0, 6.4.0 and 6.3.3).
13. **SW-API-13 (MUST for public API changes).** Deprecate before removing: `@available(*, deprecated, renamed: "<new signature>", message: "removed in <next major>")`; a renamed type keeps a deprecated `typealias`; removal or `unavailable` only in the next major. Never write bare `@available(*, deprecated)`. Why: the digester treats removal as breaking, and a deprecation without replacement and date gives the consumer nothing to act on. Verify: `grep -rn -F -e '@available(*, deprecated)' --include='*.swift' Sources` (output = violation) and the SW-API-08 digester run. Ran: yes (`F/f/lib-f-v2bare/Sources` prints the line, `lib-f-v2dep/Sources` silent; digester: deprecated rc 0, unavailable rc 1, removed rc 1 on 6.4.0 and 6.3.3).
14. **SW-API-14 (SHOULD for consumers of a library you own, and for the library's own examples).** Turn `DeprecatedDeclaration` into an error in code that must be current: `.treatWarning("DeprecatedDeclaration", as: .error)` in `swiftSettings`. Why: deprecations are otherwise invisible in a build that exits 0. Verify: `swift build` exit code on a caller of a deprecated symbol. Ran: yes (`F/f/cons-f-dep-group` rc 1 with `error: 'get' is deprecated ... [#DeprecatedDeclaration]`; `cons-f-dep` rc 0 as the green baseline of the same source).

## Verification runs

All builds through `/home/mherwig/.cache/research-lang/swift-tools/run.sh` (image `swift:6.4`, `SWIFT_VERSION=6.3` for the prior line; runner `F/chk.sh <tag> <dir>` = `swift build --scratch-path "$SWIFT_SCRATCH/library-api-shape/<tag>-<dir>-<version>"`, prints `RC=`). Both 6.4.0 and 6.3.3 gave identical exit codes unless noted. Exit-code columns are the process exit code of the stated command.

| # | fixture (under `F/`) | command | violation rc / output | compliant twin rc / output |
|---|---|---|---|---|
| V1 | `a/cons-exh-enum-v2` vs `cons-unk-nonex-v2`, `cons-str-v2` | `swift build` in consumer package | 1 `error: switch must be exhaustive` | 0 (`@unknown default`; unhandled new case prints `warning: switch must be exhaustive`); 0 (struct, `default:`) |
| V2 | `a/cons-exh-nonex-v1` vs `cons-unk-nonex-v1` | same | 1 `error: switch covers known cases, but 'Status' may have additional unknown values, possibly added in future versions` | 0 |
| V3 | `a/cons-exh-enum-then-nonex` | same (consumer written for plain enum, library adds `@nonexhaustive`) | 1 (same message as V2) | n/a (this is the retrofit trap) |
| V4 | `a/cons-exh-frozen-v1` | same | n/a | 0 (`@frozen public enum`, exhaustive switch) |
| V5 | `a/swiftc/NE.swift` | `swiftc -typecheck -parse-as-library -swift-version 6 NE.swift` (`SWIFT_VERSION=6.1`, `6.3`, `6.4`) | 6.1.3: 1 `error: unknown attribute 'nonexhaustive'` | 6.3.3: 0; 6.4.0: 0 |
| V6 | `a/swiftc/NE2.swift`, `NE3.swift` | same, guarded by `#if hasAttribute(nonexhaustive)` | NE3 (`@frozen` added) on 6.4.0: 1 `error: cannot use '@nonexhaustive' together with '@frozen'` | NE2 on 6.1.3: 0 (skipped); NE2 on 6.4.0: 0; NE3 on 6.1.3: 0 |
| V7 | `a/lib-enum-v2`, `lib-nonex-v2`, `lib-struct-v2`, `lib-frozen-v1` | `find Sources -name '*.swift' \| xargs -r perl ../pubenum.pl` | `lib-enum-v2/Sources/Lib/Lib.swift:1: public enum Status lacks @nonexhaustive or @frozen` | empty for the other three (and for a `@available` plus `@nonexhaustive` multi-line attribute stack) |
| V8 | `dg/enum`, `dg/struct`, `dg/adopt`, `dg/nonex` | `swift package diagnose-api-breaking-changes 1.0.0` in each repo | enum 1 `enumelement Status.timedOut has been added as a new enum case`; adopt 1 `enum Status is now with @nonexhaustive`; nonex 1 (same as enum: false positive) | struct 0 `No breaking changes detected in Lib` |
| V9 | `dg/nonex` | `swift package diagnose-api-breaking-changes 1.0.0 --breakage-allowlist-path ../allow.txt` | n/a | 0 `No breaking changes detected in Lib` (6.4.0; not run on 6.3.3) |
| V10 | `le/cons-le-plain` vs `cons-le-frozen` | `swift build` (library `.unsafeFlags(["-enable-library-evolution"])`, path dependency) | 1 `error: switch covers known cases, but 'Status' may have additional unknown values` | 0 |
| V11 | `le/cons-le-remote61` vs `cons-le-remote` | `swift build` (library git tag 1.0.0, `from: "1.0.0"`, tools 6.1 vs 6.2) | tools 6.1: 1 `error: 'cons-le-remote61': the target 'Lib' in product 'Lib' contains unsafe build flags` | tools 6.2: no such error (build proceeds; fails only on the enum switch, rc 1) |
| V12 | `c/cons-c-bare` vs `cons-c-stated`, `cons-c-unavail` | `swift build` in consumer package | bare: 1 `error: stored property 'config' of 'Sendable'-conforming struct 'Job' has non-Sendable type 'Config'` and `error: capture of 'c' with non-Sendable type 'Config' in a '@Sendable' closure [#SendableClosureCaptures]`; unavail: 1 (intended) | stated: 0 |
| V13 | `c/lib-c-flagged` vs `lib-c-flagged-ok`, `lib-c-unavail` | `swift build` with `.unsafeFlags(["-Xfrontend", "-require-explicit-sendable"])` | **not red by exit code**: 0 with `warning: public struct 'Config' does not specify whether it is 'Sendable' or not [#ExplicitSendable]` | 0, no warning (both toolchains) |
| V14 | `c/infer` | `swift build` | 1 `capture of 's' with non-Sendable type 'Shown'` (public struct) | line 3, internal `Hidden`, accepted |
| V15 | `d/d-red` vs `d-public`, `d-internal-use`, `d-off`; `d-package` | `swift build` (`InternalImportsByDefault` on, Swift 6 mode) | d-red: 1 `Lib.swift:2:13: error: function cannot be declared public because its parameter uses an internal type` + `note: struct 'DepType' imported as 'internal' from 'Dep' here`; d-package: 1 `... uses a package type` | d-public 0, d-internal-use 0, d-off (flag off) 0 |
| V16 | `d/m-red` vs `m-green` | `swift build` (`MemberImportVisibility` on) | 1 `error: instance method 'twice()' is not available due to missing import of defining module 'Dep' [#MemberImportVisibility]` | 0 |
| V17 | `d/d-mig2`, `d/m-mig` | `swift package migrate --to-feature InternalImportsByDefault`; `... MemberImportVisibility` | IIBD: 64 `error: Feature 'InternalImportsByDefault' is not migratable` | MemberImportVisibility: 0, `Applied 1 fix-it in 1 file`, manifest updated |
| V18 | `d/m-mig`, `d/m-green` | `swift build --explicit-target-dependency-import-check error` | **did not go red** (rc 0): the plant's transitive module was reachable via a `public import`, so it was not a violation | 0 |
| V19 | `b/b1-lib-bootstraps` vs `b2-lib-takes-logger` | build, then run `.../debug/App` | 132 `Logging/LoggingSystem.swift:165: Precondition failed: logging system can only be initialized once per process.` `Illegal instruction` (also `-c release`: 132) | 0 `CUSTOM: working [:]` |
| V20 | `b/b3-current-before-bootstrap` vs `b4-current-after-bootstrap` | build and run | 0 but output `2026-10-10T10:55:35+0000 info: [Lib] working` twice and no `CUSTOM` (red by output) | 0 `CUSTOM: working [:]` |
| V21 | `b/b5-current-detached` | build and run | n/a | 0 `CUSTOM: child-task ["req": 42]`, `CUSTOM: detached [:]` (metadata lost across `Task.detached`) |
| V22 | `b/b6-test-bootstrap-twice` vs `b7-test-inmemory` | `swift test --scratch-path ...` | 1 `Precondition failed: logging system can only be initialized once per process.`, `error: Process '...xctest ... --testing-library swift-testing' exited with unexpected signal code 4` | 0 `Test run with 2 tests in 0 suites passed` |
| V23 | `b/b1-lib-bootstraps/Sources/Lib`, `b2-lib-takes-logger/Sources/Lib` | `grep -rn -e 'LoggingSystem\.bootstrap' --include='*.swift' b/b1-lib-bootstraps/Sources/Lib` and `grep -rn -e 'Logger(label:' --include='*.swift' <same dir>` | grep rc 0, output `Lib.swift:3: public static func configure() { LoggingSystem.bootstrap(StreamLogHandler.standardError) }` and `Lib.swift:4: ... Logger(label: "lib").info("working")` | grep rc 1, empty |
| V24 | `b/b6-test-bootstrap-twice/Tests`, `b7-test-inmemory/Tests` | `grep -rn -e 'LoggingSystem\.bootstrap' --include='*.swift' <dir>` | rc 0, 2 lines | rc 1, empty |
| V25 | `f/cons-f-dep`, `cons-f-dep-werror`, `cons-f-dep-group`, `cons-f-bare`, `cons-f-un` | `swift build` | `cons-f-dep-werror` and `cons-f-dep-group`: 1 `error: 'get' is deprecated: removed in 3.0 [#DeprecatedDeclaration]`; `cons-f-un`: 1 `error: 'get' has been renamed to 'fetch(url:)'` | `cons-f-dep`: 0 with 2 `[#DeprecatedDeclaration]` warnings; `cons-f-bare`: 0 `warning: 'get' is deprecated` (no replacement named) |
| V26 | `f/dg-v2dep`, `dg-v2bare`, `dg-v3un`, `dg-v2removed` | `swift package diagnose-api-breaking-changes 1.0.0` | v3un: 1 `func Client.get(_:) has been removed`, `struct OldName has been removed`; v2removed: 1 `func Client.get(_:) has been removed` (typealias kept: no complaint) | v2dep: 0; v2bare: 0 |
| V27 | `f/lib-f-v2bare/Sources`, `lib-f-v2dep/Sources` | `grep -rn -F -e '@available(*, deprecated)' --include='*.swift' <dir>` | rc 0, `Lib.swift:4:    @available(*, deprecated)` | rc 1, empty |
| V28 | `d/d-off`, `d/d-red` | `grep -L -e 'InternalImportsByDefault' <dir>/Package.swift` | prints `d/d-off/Package.swift` | prints nothing (`grep -L` exits 0 either way: the output is the signal) |
| V29 | `d/d-off/Sources`, `d/d-red/Sources` | `grep -rn -e '@_exported' --include='*.swift' <dir>` | `Ex.swift:1:@_exported import Dep` (planted, removed after) | rc 1, empty |
| V30 | `g/pkg-lib`, `cons-pkg-ok`, `cons-pkg-red` | `swift build` | cons-pkg-red: 1 `error: cannot find 'helper' in scope` | pkg-lib 0, cons-pkg-ok 0 |
| V31 | `e/red`, `e/green`, `e/pub` | `find red/Sources red/Tests -name '*.swift' \| xargs -r perl proto1.pl` | `red/Sources/App/Mail.swift:1: protocol MailSending has one conformer (SMTPMailer)` | green (hand-written `SpyMailer` in Tests): empty; pub (public protocol): empty |

Scripts used (verbatim, both fixture-tested):

`F/a/pubenum.pl` (V7):

```perl
#!/usr/bin/perl
# usage: find Sources -name '*.swift' | xargs -r perl pubenum.pl
# Prints each public enum NOT carrying @nonexhaustive or @frozen (same line, or on attribute-only lines directly above).
use strict; use warnings;
for my $f (@ARGV) {
  open my $h, '<', $f or next; my ($n, $attrs) = (0, '');
  while (my $l = <$h>) { $n++;
    if ($l =~ /^\s*((?:@[\w()., :]+\s+)*)public\s+(?:indirect\s+)?enum\s+(\w+)/) {
      my ($same, $name) = ($1, $2); my $all = $attrs . $same;
      print "$f:$n: public enum $name lacks \@nonexhaustive or \@frozen\n" unless $all =~ /\@(?:nonexhaustive|frozen)\b/;
      $attrs = ''; next; }
    if ($l =~ /^\s*(@[\w()., :]+)\s*$/) { $attrs .= " $1"; } elsif ($l !~ /^\s*(\/\/|$)/) { $attrs = ''; }
  } }
```

`F/e/proto1.pl` (V31):

```perl
#!/usr/bin/perl
# usage: find Sources Tests -name '*.swift' | xargs -r perl proto1.pl
# Prints each NON-public protocol (internal, package, private, fileprivate, default) with exactly ONE conformer across all files given.
use strict; use warnings;
my (%decl, %conf);
for my $f (@ARGV) {
  open my $h, '<', $f or next; my $n = 0;
  while (my $l = <$h>) { $n++;
    if ($l =~ /^\s*(?:(?:package|internal|private|fileprivate)\s+)?protocol\s+(\w+)/) { $decl{$1} = "$f:$n"; }
    if ($l =~ /^\s*(?:@\w+(?:\([^)]*\))?\s+)*(?:(?:public|package|internal|private|fileprivate|final)\s+)*(?:struct|class|actor|enum|extension)\s+([\w.]+)\s*(?:<[^>]*>)?\s*:\s*([^{]*)/) {
      my ($ty, $inh) = ($1, $2); $inh =~ s/\bwhere\b.*//;
      $conf{$_}{$ty} = 1 for ($inh =~ /(\w+)/g);
    } } }
for my $p (sort keys %decl) { my @c = sort keys %{ $conf{$p} || {} };
  print "$decl{$p}: protocol $p has one conformer ($c[0])\n" if @c == 1; }
```

Limits of V31: one-line type headers only; multi-line conformance lists and macro-generated doubles are invisible (the latter is intended). The Swift checker constraints in the brief (explicit directory operands, one `-e` per alternative, quoted `--include`, `xargs -r`, no command substitution) are followed in every grep above.

## Exemplar evidence

| candidate | satisfies | violates / contradicts |
|---|---|---|
| SW-API-01 | `swift-log@4038b6a4f74a:Package.swift:62,65` (both flags, comment links SE-0409/0444); `vapor@bf77fc69b142:Package.swift:249-250`; 13 repos set `InternalImportsByDefault` (async-algorithms `Package.swift:83`, openapi-generator `:172`, grpc-swift-2 `:67`, hummingbird `:14` @1bd3b407fb47, swift-dependencies `:146`, sourcekit-lsp `:708`, swift-build `:52`, swift-testing `:464`, lambda-runtime `:21`; SwiftPM uses `.enableExperimentalFeature("InternalImportsByDefault")` at `Package.swift:262`); 22 repos set `MemberImportVisibility` (grep of `Package*.swift`, 2026-10-10) | 27 of 40 do not set `InternalImportsByDefault`, including swift-nio, swift-collections, swift-system, swift-crypto, async-http-client, containerization |
| SW-API-02 / 03 | audit Axis 3 table: swift-log 4.0 `public import` per 10k LOC, async-algorithms 11.7, swift-argument-parser 9.0 `internal import` | `@_exported import CryptoKit` in `swift-crypto@1c80d3aff53f:Sources/Crypto/PRF/AES.swift` (a deliberate platform overlay: the allowed exception) |
| SW-API-04 | swift-collections 143.1 and swift-log 28.3 `package` uses per 10k LOC (audit) | swift-argument-parser 0.0 (single-module style) |
| SW-API-05 | swift-testing `Package.swift:520-531` and SwiftPM `Package.swift:231, 777` enable it for ABI-stable frameworks only (`:231` conditioned on `.macOS`) | nothing else in the corpus enables it |
| SW-API-06 | `swift-log@4038b6a4f74a:Package.swift:71` and async-http-client set `-require-explicit-sendable` (2 of 40) | the other 38 do not |
| SW-API-07 | `swift-crypto@1c80d3aff53f:Sources/Crypto/PRF/AES.swift:19` (33 `@nonexhaustive`, tools 6.2); `vapor@bf77fc69b142:Sources/Vapor/Server/ServerError.swift:2` and `Application+AddressConfiguration.swift:36` (error enums); `@frozen` in swift-collections (109 lines), swift-system (22), swift-async-algorithms (26), Nuke (13); `containerization@3e7bc39e66b3:Sources/ContainerizationError/ContainerizationError.swift:23-29` (struct error) | `vapor@bf77fc69b142:Sources/Vapor/Application+State.swift:5` (`public enum State`, 7 cases, no attribute, next to a struct `LifecycleError` at `:36`); 310 of 363 public enums in 17 library-shaped repos unmarked: swift-log 3/3, swift-nio 71/71, async-http-client 2/2, hummingbird 12/12, containerization 110/112, swift-protobuf 24/24, swift-dependencies 9/9, vapor 23/25, swift-crypto 18/51, Nuke 17/30, swift-system 5/6, swift-argument-parser 4/4, swift-distributed-tracing 4/4, grpc-swift-2 4/5, async-algorithms 3/4, service-lifecycle 1/1, swift-collections 0/0 (counts: 2026-10-10 `pubenum.pl` over `Sources/` minus Tests, Fixtures, Examples, Benchmarks, Plugins) |
| SW-API-08 | SE-0487 names the digester; no corpus CI step found for it in the audits (not re-measured) | unverified in corpus |
| SW-API-09 | `vapor`: 0 flagged by `proto1.pl`; containerization 1; swift-log 1 (test-local `History`, `Tests/LoggingTests/TestLogger.swift:222`) | tuist 131 and element-x-ios 145 flagged (`tuist@2f6ac74754bf:cli/Sources/Rosalind/AndroidBundleMetadataService.swift:33` is a `*Servicing` protocol with one conformer; `@Mockable` generator doubles invisible to the scan); SwiftPM 8 (e.g. `Sources/Basics/ImportScanning.swift:25` `ImportScanner`), swift-build 15; audit: 427 pure single-conformer protocols, 238 of them internal |
| SW-API-10 / 11 | `apple/swift-log` is the contract; `containerization@3e7bc39e66b3:Sources/cctl/cctl.swift:24` bootstraps in the executable; async-http-client `HTTPClient.swift:390` takes `logger: Logger`; lambda-runtime defaults to `Logger.current` | hybrid `logger ?? Logger(label:)` in `containerization@3e7bc39e66b3:Sources/Containerization/BridgeManager.swift:90` and `Sources/ContainerizationNetlink/NetlinkSession.swift:35`; tuist `cli/Sources/TuistLogging/ApplicationLogStore.swift:44-51` bootstraps from a library-shaped module; `Logger(label:)` appears in non-test non-example Sources of vapor (3 files), hummingbird (3), lambda-runtime (3), apple/container (13) |
| SW-API-12 | swift-log ships `InMemoryLogging` (docs 004) | not measured elsewhere |
| SW-API-13 / 14 | none measured: the corpus has `@available` at 378.3 per 10k LOC in swift-system and 231.8 in async-algorithms (audit), mostly platform availability | deprecation-with-`renamed:` density not counted |

## AI-agent angle

What an LLM gets wrong here, with the smallest mechanical check:

1. **`public enum FooError: Error { case a, b }` as the library error, or any new public enum with no attribute.** Compiles; breaks consumers on the next case. Check: SW-API-07 `pubenum.pl`; for errors also the N1 scan in SW-ERR-20.
2. **Invented spellings.** `@nonExhaustive`, `@extensible` (the earlier pitch name), `@NonExhaustive`, `@frozen(exhaustive:)`. Check: `swiftc -typecheck` is the red (`unknown attribute`); the hallucination is cheap to see because it is a compile error on every toolchain that matters.
3. **`@nonexhaustive` pasted into a manifest-tools-6.2 library with no guard** (the model knows only that it exists). Fails on 6.2.0 to 6.2.2 and 6.1. Check: `grep -rn -e '@nonexhaustive' --include='*.swift' Sources` then verify each is guarded or the floor is stated (reading heuristic).
4. **Adds a case to a shipped enum "because the compiler will find the switches".** True only inside one package. Check: SW-API-08 digester.
5. **`LoggingSystem.bootstrap(...)` inside a library `init`, a `static let`, a test `init`, or "for convenience" in each `@Test`**, and `private let logger = Logger(label: "MyLib")`. Check: SW-API-10 and SW-API-12 greps.
6. **Assumes `Logger.current` works in GCD callbacks, `Task.detached` and before bootstrap.** Compiles, runs, logs to the wrong sink. Check: SW-API-11 smoke test asserting the marker.
7. **Bare `import X` everywhere plus `public func f(_: X.Type)`** (works until the flag turns on) and, when the flag errors, **"fixes" it with `@_exported import` or `package import`.** Check: SW-API-01 build, SW-API-03 grep, `package import` stays red.
8. **"Fixes" a consumer-side Sendable error with `extension Config: @retroactive @unchecked Sendable`** instead of adding the statement in the library. Check: `grep -rn -e '@retroactive' -e '@unchecked Sendable' --include='*.swift' Sources` (reading: each hit on a type the repo does not own is a smell; SW-CONC owns the escape-hatch rules).
9. **Adds `-enable-library-evolution` to every package** because Apple framework guides mention it, or `@frozen` on structs "for performance". Check: SW-API-05 grep.
10. **Protocol-plus-mock for every service (`FooServicing`, `MockFoo`, `@Mockable`).** Pre-Swift-concurrency DI habit that the corpus shows in tuist and element-x. Check: SW-API-09 scan; a stored closure replaces the single method.
11. **Deletes the old API in the same change as adding the new one**, or writes bare `@available(*, deprecated)`, or `renamed:` with a string that is not the new declaration's full name (`renamed: "fetch"` instead of `"fetch(url:)"`). Check: SW-API-13 grep and digester; the wrong `renamed:` string is a reading check (not run).
12. **`Task {}` in `main.swift` as the Sendable proof.** Passes without a boundary (rc 0); the consumer-twin must store the type in a `Sendable` struct (SW-API-06).
13. **GCD/completion-handler style logging wrappers around `os_log`** in new libraries: out of this file's scope (Apple-only, unverified: read only); the swift-log page says pass `Logger` explicitly when a callback API cannot carry task-locals.

## Contested / evolving

- **Enum evolution: `@nonexhaustive` versus struct plus `Code`.** As of 2026-10-10 the language gives both; crypto 5.x and Vapor 5 adopted `@nonexhaustive` on tools 6.2 and 6.4, containerization and the earlier ecosystem use the struct. SE-0487's Future Directions mention `@unknown catch` and aligning dialects (a future language mode could make non-exhaustive the default for non-resilient libraries). Trend: toward `@nonexhaustive` as the default spelling once the floor is 6.2.3; the struct stays correct for errors that need a stable `Code` for process exit mapping.
- **Digester and `@nonexhaustive`.** SE-0487 states the digester understands the attribute; 6.3.3 and 6.4.0 still flag an added case (V8). Expect this to be fixed in a later patch; re-run the plant `dg/nonex` on each toolchain bump and delete the allowlist entry when it goes green.
- **`InternalImportsByDefault` default.** SE-0409: "It will be `internal` in a future language mode"; no mode ships it as of 6.4.0 (V15 `d-off`). Trend: libraries adopt the flag now (13 of 40 corpus repos), the flip will be source-breaking only for code that still relies on implicit re-export. `@usableFromInline import` is described in SE-0409 as "yet to be implemented"; not tested.
- **`Logger.current` versus a `logger:` parameter.** swift-log 1.14.0 (2026-06-24) added the task-local logger and the current best-practice page makes it a documented first choice next to the parameter; before 1.14 the only sanctioned library pattern was the parameter. A library that must support swift-log below 1.14 still needs the parameter (swift-log 1.16.0 itself needs tools 6.2). Containerization's `Logger? = nil` hybrid sits between and is documented as "Avoid".
- **Library evolution on SwiftPM libraries.** swift.org (2020) says no; the corpus agrees (2 of 40, both binary-distribution cases). SwiftPM stopped checking `unsafeFlags` for dependents at tools 6.2, which makes it easier to ship and easier to do by accident; trend: still discouraged, but the 6.2 change removes the guardrail.
- **Protocol-per-service dependency injection.** Not contested in the compiler, contested in practice: the generated-mock ecosystem (`@Mockable`, Sourcery) keeps single-conformer protocols alive in app repos (tuist, element-x); Apple server and OCI libraries (vapor, containerization, swift-log) almost never have one. The heuristic here sides with the second group for libraries and SDKs; for application layers it is a SHOULD with the mock-generation exception stated.
- **Deprecation timeline.** No Swift source fixes a duration; the one-major rule in SW-API-13 is a policy decision, not a measured fact.

## Sources

| URL | what it is | date/era | why worth reading |
|---|---|---|---|
| https://www.swift.org/documentation/api-design-guidelines/ | Swift API Design Guidelines (read in full; protocol naming "Protocols that describe what something is should read as nouns", fluent usage) | evergreen, current 2026-10-10 | the naming and documentation baseline (M-D-07 stays "well known") |
| https://www.swift.org/blog/library-evolution/ | swift.org: Library Evolution in Swift | 2020-02-13 | the canonical statement that SwiftPM packages should not enable library evolution; `@frozen`, `@inlinable` semantics |
| https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0487-extensible-enums.md | SE-0487 Nonexhaustive enums, "Implemented (Swift 6.2.3)" | accepted 2025-08, implemented 6.2.3 | the attribute, `@nonexhaustive(warn)`, source-compat table, digester sentence |
| https://forums.swift.org/t/accepted-se-0487-nonexhaustive-enums/81508 | Ben Cohen's acceptance post | 2025-08-05 | review manager's rationale (ecosystem health for non-ABI-stable packages) |
| https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0409-access-level-on-imports.md | SE-0409 access-level modifiers on imports, flag `InternalImportsByDefault` | Implemented 6.0 | import defaults, leak diagnostics, `@_exported` stance |
| https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0444-member-import-visibility.md | SE-0444 member import visibility, flag `MemberImportVisibility` | Implemented 6.1 | transitive extension-member leak and its fix |
| https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0386-package-access-modifier.md | SE-0386 `package` access modifier | Implemented 5.9 | scope of `package`, interaction with imports |
| https://raw.githubusercontent.com/swiftlang/swift/main/userdocs/diagnostics/member-import-visibility.md | compiler diagnostic page for `MemberImportVisibility`, including `:migrate` | main, 2026 | the migration spelling |
| https://raw.githubusercontent.com/swiftlang/swift/main/userdocs/diagnostics/explicit-sendable-annotations.md | diagnostic page for `ExplicitSendable` (`-require-explicit-sendable`) | main, 2026 | gate for SW-CONC-04 / SW-GATE-17 (cited, not restated) |
| https://raw.githubusercontent.com/swiftlang/swift/main/userdocs/diagnostics/deprecated-declaration.md | diagnostic group `DeprecatedDeclaration` | main, 2026 | group name for `.treatWarning` |
| https://raw.githubusercontent.com/swiftlang/swift-book/main/TSPL.docc/ReferenceManual/Attributes.md | The Swift Programming Language, Attributes (`@available`, `renamed`, `unavailable`) | main, 2026 | exact semantics of `renamed:` and `unavailable` |
| https://raw.githubusercontent.com/swiftlang/swift-book/main/TSPL.docc/LanguageGuide/AccessControl.md | TSPL Access Control (package definition) | main, 2026 | access-level vocabulary |
| https://github.com/apple/swift-log/blob/main/Sources/Logging/Docs.docc/BestPractices/003-AcceptingLoggers.md | swift-log best practice 003, "Logger propagation in libraries" | read at 4038b6a4f74a (1.16.1) | the library logging contract; "Avoid" list; `Logger.current` boundaries |
| https://github.com/apple/swift-log/blob/main/Sources/Logging/Docs.docc/BestPractices/004-TestingLogging.md | swift-log best practice 004, testing code that logs | 1.16.1 | `InMemoryLogHandler`, no bootstrap in tests |
| https://github.com/apple/swift-log/blob/main/Sources/Logging/Docs.docc/Proposals/SLG-0006-task-local-logger.md | SLG-0006 task-local logger | Approved, shipped 1.16 | why `Logger.current` exists, rejected alternatives |
| https://api.github.com/repos/apple/swift-log/releases?per_page=12 | swift-log release notes 1.16.1, 1.16.0, 1.14.0 | 2026-10-07, 2026-06-24 | version pinning: task-local logger in 1.14.0, tools 6.2 floor in 1.16.0 |
| https://raw.githubusercontent.com/apple/swift-log/main/README.md | swift-log README (no libraries/apps section today) | 2026-10-10 | confirms the README is not the contract any more |
| swiftlang/swift-package-manager@5546f44a3b52: Sources/PackageLoading/PackageBuilder.swift:1073-1074; Sources/PackageGraph/ModulesGraph+Loading.swift:1530; Sources/Workspace/Workspace+Manifests.swift:146-170; Fixtures/Miscellaneous/LibraryEvolution/Package.swift:9 | SwiftPM source (corpus clone) | main at 2026-10-10 | the unsafe-flags rule and its 6.2 relaxation |
| swiftlang/swift-testing@c7d68ca20cd7: Package.swift:520-531 | swift-testing's `enableLibraryEvolution` helper | main at 2026-10-10 | how a real project wraps the unsafe flag |
| vapor/vapor@bf77fc69b142: Package.swift:246-252, Sources/Vapor/Server/ServerError.swift:2, Sources/Vapor/Application+State.swift:5,36 | Vapor 5 manifest and public enum/error shapes | main at 2026-10-10 | one repo that mixes `@nonexhaustive` errors with an unmarked public enum |
| apple/swift-crypto@1c80d3aff53f: Sources/Crypto/PRF/AES.swift:19 | `@nonexhaustive` in a shipped 5.x library at tools 6.2 | main at 2026-10-10 | the largest production adopter (33 uses) |
| /home/mherwig/dev/grimoire-lore/.agents/worktrees/swift/.agents/research/swift-audit/exemplar-language-shape.md | wave-1 language-shape audit (protocol conformers, import and package densities) | 2026-10-10 | the 427 pure single-conformer protocols and per-repo densities |
| /home/mherwig/dev/grimoire-lore/.agents/worktrees/swift/.agents/research/swift-concurrency.md (SW-CONC-04), swift-errors.md (SW-ERR-20), swift-gates.md (SW-GATE-17), swift-package.md | sibling consolidations imported without restatement | 2026-10-10 | rule IDs this file builds on |
