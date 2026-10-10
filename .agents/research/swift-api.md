---
title: API and SDK shape (SW-API) - consolidation
topic: swift / API and SDK shape - public surface of a library or SDK, and the Swift SDK that wraps the ocx CLI
model: sonnet
id_family: SW-API
consolidates:
  - swift-api/library-api-shape.md
  - swift-api/sdk-shape.md
date: 2026-10-10
---

# API and SDK shape (SW-API), consolidated 2026-10-10

Authoritative input for `swift-quality/api-design.md` (map section D, rows M-D-01..M-D-06, -08..-12). Toolchains measured: Swift 6.4.0 and 6.3.3 on Linux x86_64 (Docker); swift-log 1.16.1, swift-subprocess 1.0.1, ocx 0.6.5. Every Apple-platform or Windows statement is "unverified: read only" (owner Q7). Tags: `[LIB]` = [library-api-shape.md](swift-api/library-api-shape.md), `[SDK]` = [sdk-shape.md](swift-api/sdk-shape.md), `V#` = that dive's Verification-runs row, `R#` = a run added by this consolidation (table at the end of the ruleset), `K#` = a conflict resolved below.

## Verdict

1. **The public surface is compiler-enforced, not reviewed.** Library and SDK targets run `InternalImportsByDefault` and `MemberImportVisibility` (SW-PKG-07 turns them on); a file says `public import M` only where a public signature names M's type, never `@_exported` outside a platform overlay, `package` (not `public`) for cross-target helpers, and no `-enable-library-evolution` on a source-distributed package. Binds library and SDK.
2. **Public enums are closed on purpose or open by construction.** A public error is the SW-ERR-20 struct with an open `Code` (the SDK admits no enum-error exception); any other new public enum is `@frozen`, `@nonexhaustive` from its first release (guarded by `#if hasAttribute(nonexhaustive)` while the floor admits Swift 6.2.0 to 6.2.2), or a struct with static members. Adding a case or retrofitting `@nonexhaustive` is a major; `swift package diagnose-api-breaking-changes` is the only exit-code red and takes two allowlist lines (K10).
3. **Sendable intent is stated in the library, gated by SW-GATE-17's `.treatWarning("ExplicitSendable", as: .error)` (exit 1; every `-require-explicit-sendable` spelling is inert) and proved from a consumer package** (extends SW-CONC-04/-06; K12 retires the "not red by exit code" reading in [LIB] and SW-CONC-04).
4. **Logging: a library takes `logger: Logger` (or defaults it to `Logger.current` at swift-log 1.14.0 or later) and never bootstraps or builds `Logger(label:)`; tests use `InMemoryLogHandler`; only an executable bootstraps, once.** The `logger ?? Logger(label:)` hybrid is banned. The SDK itself has no logger in v1: swift-log would break the one-dependency budget (K5).
5. **A protocol with one non-public conformer, no hand-written double and no named second conformer is deleted**; a stored closure or a struct of closures is the cheaper seam. Binds library, SDK, CLI, server; an app that depends on a mock generator keeps the exception it already has.
6. **Deprecate in a minor, remove in the next major**, with `renamed:` and a dated `message:`; a bare `@available(*, deprecated)` is a defect. The one-major timeline is a decided policy, not a measured fact.
7. **The Swift SDK over ocx is two targets and one dependency**: the public library plus a non-product spawn target (the only importer of `Subprocess`), `swift-subprocess` `from: "1.0.1"` as the only direct dependency. Exit mapping: `.exited(n)` to `n`, `.signaled(s)` to `128 + s` with `s` kept (owner Q6 default applied); one struct error with open `Code` keyed on the exit status alone; cancellation is `CancellationError`; a timeout that fires before the child ends beats a later cancel; one symmetric 4 MiB capture limit; tolerant decoding; the fake CLI runs out of process and the line gate is 100.
8. **Where the sub-researchers and the earlier consolidations disagreed, the working SDK package won** (K1-K5): it is the only artifact in which the timeout race, cancellation and kill ladder were exercised against real children (22 verifications watched red; this consolidation re-ran 3 mutations, the 6 greps and the budget jq, all red as recorded), and it contradicts the earlier sketches on public error vocabulary, single-importer enforcement, capture defaults, the spawn seam and the manifest skeleton.
9. **No SwiftLint 0.65.1 or swift-format 6.4 rule covers any of this** ([LIB] summary); every gate is a compiler build, the digester, a grep or perl scan, a test, or the coverage jq. A SwiftLint `custom_rules` regex is only a delivery vehicle for the greps (SW-GATE family).
10. **Not researched here**: naming (M-D-07, the API Design Guidelines are well known), `@retroactive` (M-D-13), and library module splits beyond the SDK's two-target answer (M-D-14).

## The ruleset

Severity: MUST needs a normative or measured source plus a verification that was watched red on a planted violation and green on its twin, or an explicit statement why it can only be a reading heuristic. "Run" lists the evidence. All grep operands name a directory; "output = violation" means empty output passes.

### SW-API - API and SDK shape

#### Caught by `swift build` (compiler)

**SW-API-01 (MUST). Import with the access level the declaration needs.** With `InternalImportsByDefault` on (SW-PKG-07), write `public import M` in a file only when a type of M appears in a `public`, `open` or `@inlinable` signature there, `package import M` when it appears only in a `package` signature, and a bare `import M` otherwise; `package import` never satisfies a `public` signature.
- Why: in Swift 6 mode a bare `import` is still public (SE-0409 makes it internal only "in a future language mode"), so every dependency is silently re-exported to clients; with the flag the compiler names each leaking signature.
- Verify: `swift build`. Public leak: exit 1 `error: function cannot be declared public because its parameter uses an internal type` plus `note: struct 'DepType' imported as 'internal' from 'Dep' here`. `package import` on a public signature: exit 1 `... uses a package type`. A `package` seam: `error: initializer cannot be declared package because its parameter uses an internal type`. Missing direct import under `MemberImportVisibility`: `error: instance method 'twice()' is not available due to missing import of defining module 'Dep' [#MemberImportVisibility]`. Migration: `swift package migrate --to-feature MemberImportVisibility` works (1 fix-it applied); `--to-feature InternalImportsByDefault` is `error: Feature 'InternalImportsByDefault' is not migratable` (exit 64), so adopt that flag by hand: enable it, let the compiler list the leaks, add `public import` to exactly those files. The reverse direction (a `public import` no public signature needs) has no diagnostic: `grep -rn -e '^public import' --include='*.swift' Sources`, then ask per hit whether the module's type appears in a public signature there.
- Run: yes. R1 (6.4.0: leak rc 1, `package import` rc 1, `public import` rc 0, internal-only use rc 0, flag off rc 0); [LIB] V15-V17 on 6.4.0 and 6.3.3; [SDK] `red-n` rc 1. The over-public direction is a reading heuristic (no diagnostic exists). `swift build --explicit-target-dependency-import-check error` did not go red on the plant (rc 0, [LIB] V18): not an admissible gate.
- Binds: library, SDK. Floor: Swift 6.0 (SE-0409), 6.1 (SE-0444); tools 6.2.

**SW-API-02 (SHOULD). Every public type states its Sendable intent, the library gate is SW-GATE-17's group promotion, and a consumer package proves the statement from outside.** Library side: `.treatWarning("ExplicitSendable", as: .error)` in the library target's `swiftSettings` (SW-GATE-17 owns the wiring and the ban on every `-require-explicit-sendable` spelling). Consumer side: the `CompileTests/` package of SW-CONC-06 (a separate package depending on the library by path) stores each public type in a `Sendable` struct property and captures one in a `@Sendable` closure; a type that is deliberately not Sendable says `@available(*, unavailable) extension T: Sendable {}` and its consumer line is the expected failure.
- Why: only non-public types get `Sendable` inferred, so a public type with no statement compiles in its own package and is red in every consumer; `Task {}` in `main.swift` crosses no isolation boundary (MainActor) and proves nothing. The group gate answers "is there a statement"; the consumer package answers "does the statement behave as intended" (the unavailable extension passes the group gate and must stay red for the consumer), and it covers types the group does not flag (SW-GATE-17: not actors, protocols, typealiases or internal types).
- Verify: library side, `swift build` exits 1 with `error: public struct 'Config' does not specify whether it is 'Sendable' or not [#ExplicitSendable]` on 6.4.0 and 6.3.3 (R13); exit 0 with `public struct Config: Sendable`. Consumer side, `swift build` in the consumer package: exit 1 `error: stored property 'config' of 'Sendable'-conforming struct 'Job' has non-Sendable type 'Config'` and `error: capture of 'c' with non-Sendable type 'Config' in a '@Sendable' closure [#SendableClosureCaptures]` on a public type with no statement; exit 0 with `public struct Config: Sendable`.
- Run: yes. R13 (library gate: promotion alone rc 1 on 6.4.0 and 6.3.3, stated twin rc 0; the same promotion beside `-Xfrontend -require-explicit-sendable` rc 0 with two warnings; no setting rc 0 silently); [LIB] V12 (consumer: bare rc 1, stated rc 0, unavailable rc 1 as intended, 6.4.0 and 6.3.3) and V14 (`infer`: public struct rc 1, internal struct accepted). [LIB] V13 and SW-CONC-04's "not red by exit code" were measured with the inert frontend spelling (K12). No corpus repo promotes the group to an error (K7).
- Binds: library, SDK. Floor: SW-CONC-04's (`~Sendable` needs 6.4; below it use the unavailable extension); group promotion Swift 6.1, manifest form tools 6.2.

#### Caught by grep or script (output = violation)

**SW-API-03 (MUST). No `@_exported import` in a library or SDK target.** The one exception is a deliberate platform overlay module, with a comment naming it (`swift-crypto@1c80d3aff53f:Sources/Crypto/PRF/AES.swift`, `@_exported import CryptoKit`).
- Why: SE-0409 accepts `@_exported` only on `public import` and rejects blessing it as a public-dependency feature; re-export defeats SW-API-01 and ties clients to the dependency. A bare `@_exported import Foundation`-style convenience (Alamofire) is the agent's usual "fix" for a leak error; [swift-language.md](swift-language.md) Open question 6 already defaults SW-API-03's ban to win for libraries while SW-IO-02's per-file `FoundationNetworking` guard stays.
- Verify: `grep -rn -e '@_exported' --include='*.swift' Sources`.
- Run: yes, [LIB] V29 (plant hit `Ex.swift:1:@_exported import Dep`, twin empty).
- Binds: library, SDK. Floor: any.

**SW-API-04 (MUST). Never pass `-enable-library-evolution` for a source-distributed SwiftPM library.** Enable it only for a binary framework built apart from its clients, from its first release, and then every public non-`@frozen` enum forces `@unknown default` on consumers.
- Why: swift.org says SwiftPM packages "should not be built with library evolution support"; the flag has no `SwiftSetting`, only `.unsafeFlags`, which a dependency may not carry below tools 6.2 (`error: ... the target 'Lib' in product 'Lib' contains unsafe build flags`, rc 1) and which tools 6.2 stopped checking, so it now ships by accident.
- Verify: `grep -rn -e 'enable-library-evolution' --include='Package*.swift' .` (every hit needs a binary-distribution justification in the change).
- Run: yes, [LIB] V10 (plain enum consumer rc 1 `error: switch covers known cases, but 'Status' may have additional unknown values`, `@frozen` rc 0) and V11 (tools 6.1 rc 1, tools 6.2 builds). Corpus re-grep (R12): hits only in swift-testing `Package.swift:530` and SwiftPM `Package.swift:231,777,791,805`, both ABI-stable binaries. Apple `BUILD_LIBRARY_FOR_DISTRIBUTION` and XCFrameworks: unverified: read only.
- Binds: library, SDK. Floor: tools 6.2 for the unsafeFlags relaxation.

**SW-API-05 (MUST). Every new public enum of a library or SDK is `@frozen`, `@nonexhaustive` or a struct.** `@frozen` for a domain closed by construction; `@nonexhaustive` (SE-0487) from the first release where `switch` is the point and cases will grow; otherwise a `struct` with `static` members. A public error type is SW-ERR-20's struct and is not an enum at all in an SDK (K11). While the declared floor admits Swift 6.2.0 to 6.2.2 write `#if hasAttribute(nonexhaustive)` / `@nonexhaustive` / `#endif`. Never write `@nonexhaustive` together with `@frozen` and never invent a spelling (`@nonExhaustive`, `@extensible`).
- Why: a case added to a plain public enum is `error: switch must be exhaustive` in every external consumer (same-package consumers never see it); retrofitting `@nonexhaustive` later is itself source-breaking. `@frozen` changes nothing mechanically in a source package (rc 0 for an exhaustive switch): it records a promise the digester then enforces.
- Verify: `find Sources -name '*.swift' | xargs -r perl pubenum.pl` (script under Check scripts; output = each unmarked public enum), plus SW-API-11. Attribute availability: `swiftc -typecheck -parse-as-library -swift-version 6` is `error: unknown attribute 'nonexhaustive'` on 6.1.3 and rc 0 on 6.3.3 and 6.4.0.
- Run: yes. R3 (`pubenum.pl` prints 1 line for `lib-enum-v2`, nothing for `@nonexhaustive`, struct and `@frozen` twins); [LIB] V1-V7 (consumer rc 1 for `enum-v2`, rc 0 for `@unknown default`, struct and `@frozen`; `@nonexhaustive` + `@frozen` rc 1 `cannot use '@nonexhaustive' together with '@frozen'`); R6 (guarded library on 6.1: consumers with and without `@unknown default` rc 0, attribute skipped; on 6.4: `@unknown default` rc 0, exhaustive switch rc 1, so one consumer source builds on both).
- Binds: library, SDK with external consumers. Floor: `@nonexhaustive` Swift 6.2.3 (SE-0487), guard below it; `@frozen` any.

**SW-API-06 (SHOULD). Deprecate with a replacement and a removal major.** `@available(*, deprecated, renamed: "fetch(url:)", message: "removed in 3.0")` on the member; a renamed type keeps `@available(*, deprecated, renamed: "NewName") public typealias OldName = NewName`; never a bare `@available(*, deprecated)`. Removal or `unavailable` happens in the next major only (SW-API-11).
- Why: a bare deprecation names no replacement and no date (`warning: 'get' is deprecated [#DeprecatedDeclaration]`); the digester treats removal as breaking. The one-major timeline is a decided policy: no Swift source fixes a duration.
- Verify: `grep -rn -F -e '@available(*, deprecated)' --include='*.swift' Sources` (output = violation). Consumer view: `warning: 'get' is deprecated: removed in 3.0 [#DeprecatedDeclaration]`, which `.treatWarning("DeprecatedDeclaration", as: .error)` turns into exit 1 for code that must stay current (SW-GATE-15: promote `UnknownWarningGroup` beside any group; CLIs, servers and apps already get deprecations from the blanket flag). A `renamed:` string that is not the new declaration's full name (`"fetch"` for `fetch(url:)`) is a reading check, not run.
- Run: yes, [LIB] V25-V27 (bare grep hit vs empty; deprecated step: digester rc 0; `unavailable`: rc 1 `func Client.get(_:) has been removed`; group error rc 1).
- Binds: library, SDK. Floor: any.

**SW-API-07 (MUST). A non-executable target never bootstraps swift-log and never builds its own logger.** A public API that logs takes `logger: Logger` or, at swift-log 1.14.0 or later, defaults that parameter to `Logger.current`; `logger ?? Logger(label: "...")` is banned.
- Why: `LoggingSystem.bootstrap` is once per process: `Logging/LoggingSystem.swift:165: Precondition failed: logging system can only be initialized once per process.`, exit 132, also with `-c release`; a self-made `Logger(label:)` discards the caller's handler, level and metadata (the swift-log page lists the hybrid under "Avoid").
- Verify: `grep -rn -e 'LoggingSystem\.bootstrap' --include='*.swift' Sources/Lib` and `grep -rn -e 'Logger(label:' --include='*.swift' Sources/Lib`, run over each library target directory (`Lib` is the example; the executable target's directory is never an operand). The executable side is SW-CLI-15.
- Run: yes. R2 (6.4.0: library that bootstraps rc 132 with both greps printing a line; twin that takes `logger:` rc 0 `CUSTOM: working [:]`, greps empty); [LIB] V19, V23 (also `-c release` rc 132, and 6.3.3).
- Binds: library, any non-executable target; the SDK only if it logs (K5). Floor: swift-log 1.14.0 for `Logger.current` (1.16.0 raised swift-log's own tools floor to 6.2).

**SW-API-08 (MUST). Library tests never call `LoggingSystem.bootstrap`.** They build `Logger(label:factory:)` over `InMemoryLogHandler` (product `InMemoryLogging`) and assert on `entries`.
- Why: two tests that each bootstrap crash the test process: `Precondition failed: ...`, `error: Process '...' exited with unexpected signal code 4`, `swift test` rc 1.
- Verify: `grep -rn -e 'LoggingSystem\.bootstrap' --include='*.swift' Tests` (output = violation) and `swift test`.
- Run: yes, [LIB] V22, V24 (grep 2 lines and rc 1 vs empty and rc 0, 6.4.0 and 6.3.3). Not re-run.
- Binds: library, SDK, test code. Floor: swift-log 1.16.1 (best practice 004).

**SW-API-09 (MUST). The SDK has exactly one public library target and one non-product spawn target, and only the spawn target imports `Subprocess`.** Cross-target API is `package`, never `public`; no `SubprocessError`, `TerminationStatus`, `Execution` or `PlatformOptions` appears in a `public` or `package` signature outside the spawn target (a seam initializer that mentions `ProcessRunner` is `package import OcxSpawn`, SW-API-01).
- Why: one place owns limits, grace, environment and exit mapping (SW-IO-26). SwiftPM does not enforce the single importer: `import Subprocess` added to the public target built and passed on 6.4 and 6.3 with both import flags on, so the grep is the enforcement.
- Verify: `grep -rl --include='*.swift' --exclude-dir=OcxSpawn -e 'import Subprocess' -e 'import SystemPackage' Sources` (rename the excluded directory to the spawn target's; output = violation) and `grep -rn --include='*.swift' -e 'public .*SubprocessError' -e 'package .*SubprocessError' -e 'public .*TerminationStatus' -e 'package .*TerminationStatus' -e 'public .*Execution' -e 'package .*PlatformOptions' Sources` (output = violation).
- Run: yes. R9 (G1 prints `Sources/OcxSDK/Bad.swift` on the red plant, empty on green and on the package; G6 prints 2 lines on red); [SDK] `red-g` exit 0 (not red by design) proves the manifest is no gate.
- Binds: SDK. Floor: swift-subprocess 1.0.1, tools 6.2.

**SW-API-10 (MUST). The SDK `Sources/` pass the SDK tell grep.** No `exit(`, `fatalError(`, `preconditionFailure(`, `Process()` or `Foundation.Process`, and no `@unchecked Sendable`, `nonisolated(unsafe)` or `Task.detached`.
- Why: a library reports failure by throwing (SW-CLI-03, SW-ERR-15); the spawn goes through Subprocess (SW-IO-05); escape hatches are SW-CONC-01/-09 territory and an SDK has no reason for them. This rule is the aggregate gate for the SDK kind; the owners keep their own severities elsewhere.
- Verify: `grep -rn --include='*.swift' -e 'Process()' -e 'Foundation.Process' -e ' exit(' -e 'fatalError(' -e 'preconditionFailure(' Sources` and `grep -rn --include='*.swift' -e '@unchecked Sendable' -e 'nonisolated(unsafe)' -e 'Task.detached' Sources` (output = violation).
- Run: yes. R9 (G2 prints `Bad.swift:9`, `:11`, `:12`; G5 prints `:7`, `:11`; green and package empty).
- Binds: SDK. Floor: any.

#### Caught by a release, manifest or coverage command

**SW-API-11 (MUST). A minor release only adds API.** No removed or renamed declaration, no new case on a plain public enum, no `@nonexhaustive` added to a shipped enum. Stage a shipped plain enum with `@nonexhaustive(warn)` in a minor and add cases in the next major. CI wiring is SW-GATE-20; this rule adds what the allowlist may contain.
- Why: the digester is the only tool that turns the enum, retrofit and removal rules into an exit code. Plain enum plus a case: exit 1 `enumelement Status.timedOut has been added as a new enum case`; struct plus a static: exit 0; plain to `@nonexhaustive`: exit 1 `enum Status is now with @nonexhaustive`; removed API: exit 1 `func Client.get(_:) has been removed`.
- Verify: `swift package diagnose-api-breaking-changes "$BASELINE"` (SW-GATE-20: full history and tags fetched). Two allowlist lines are legitimate, each a reviewed policy change (SW-GATE-12), passed with `--breakage-allowlist-path api-allow.txt`: (a) tool gap, an added case on an already `@nonexhaustive` enum is still reported as `API breakage: enumelement Status.timedOut has been added as a new enum case` on 6.3.3 and 6.4.0 although SE-0487 says the digester understands the attribute; re-run the plant on every toolchain bump and delete the line when it goes green; (b) the one-time staging line `API breakage: enum Status is now with @nonexhaustive` for the `(warn)` minor.
- Run: yes. [LIB] V8-V9 (enum, adopt, `@nonexhaustive` add-case rc 1 on both toolchains, struct rc 0, allowlisted rc 0 on 6.4.0); R4 (the `(warn)` retrofit is source-compatible: consumer's exhaustive switch rc 0 with `warning: switch covers known cases, but 'Status' may have additional unknown values, possibly added in future versions; this will be an error in a future Swift language mode`; a later added case is `error: switch must be exhaustive` rc 1, rc 0 with `@unknown default`); R5 (the digester still reports the `(warn)` retrofit, rc 1 on 6.4.0 and 6.3.3, and the allowlist line makes it rc 0).
- Binds: library, SDK with tagged releases. Floor: Swift 6.2.3 for `@nonexhaustive`.

**SW-API-12 (MUST). The SDK's direct dependencies are exactly `swift-subprocess`.** Floor `from: "1.0.1"`; `swift-system` arrives transitively; only `Synchronization` and `FoundationEssentials` from the toolchain; no unguarded `import Foundation` in `Sources/` (SW-IO-04).
- Why: owner Q4 budget; measured link footprint is `libFoundationEssentials` only, with the default `SubprocessFoundation` trait on or off (3,818,816 vs 3,749,280 bytes), so there is no reason to turn the trait off. 1.0.0 leaks one descriptor per early-break `.sequence` (SW-IO-06).
- Verify: `swift package dump-package | jq -e '[.dependencies[] | .sourceControl[0].location.remote[0].urlString] == ["https://github.com/swiftlang/swift-subprocess"]'` (exit 1 = violation) and `grep -rl --include='*.swift' -e '^import Foundation$' Sources | xargs -r grep -L -e 'canImport(FoundationEssentials)'` (output = violation).
- Run: yes. R10 (package: `true`, exit 0; plant adding swift-log: `false`, exit 1); [SDK] ldd and size runs. The `import Foundation` grep is SW-IO-04's and was not re-run.
- Binds: SDK. Floor: tools 6.2.

**SW-API-13 (MUST). SDK tests run a fake CLI out of process and gate line coverage of `Sources/` at 100 on the Linux leg.** The fake is a script found through `Bundle.module` `.copy` resources (never `#filePath`), selected per test by an environment variable so the SDK's own argv stays untouched; seams are stored values (`captureLimit`, `killGrace`, an injectable `sleep`) and pure `static` functions for branches no real child can reach, not a protocol; the public initializer is exercised end to end once.
- Why: the timeout race, cancellation and kill ladder (SW-API-18, -19) fail only against real children: an injected `run` closure (SW-TEST-20) cannot catch them (K4). The earlier 282/283 miss was the public `init`'s default closure, which only the production entry point executes.
- Verify: `swift test --enable-code-coverage` then `swift test --show-codecov-path | tail -1 | xargs -r jq -e --arg root "$PWD" --argjson min 100 '[.data[0].files[] | select(.filename | startswith($root + "/Sources/"))] | ((map(.summary.lines.covered) | add) / (map(.summary.lines.count) | add) * 100) as $pct | ($pct >= $min)'` (exit 1 or 123 = violation; SW-TEST-16 verbatim plus `tail -1`). Reading heuristic for the seam: `grep -rn --include='*.swift' -e 'protocol [A-Za-z]*Runn' -e 'protocol [A-Za-z]*Spawn' Sources` (empty on the package).
- Run: yes. R11 (package: lines 283/283, gate exit 0; regions 179/182, a regions gate at 100 exits 1); [SDK] `covgate.sh pkg-red 100` exit 123 at 259/283 after deleting one test file, exit 0 at a floor of 90; 38 tests in 3.3 s on both toolchains (R8).
- Binds: SDK. Floor: Swift Testing; regions are reported, not gated (K4, Open question 3).

#### Caught by the SDK test suite (each watched red by mutating one line)

**SW-API-14 (MUST). Resolve the binary once, at `init`, in a fixed order from an environment snapshot.** Explicit path, then `OCX_SDK_EXE`, then `PATH` entries that are absolute and whose parent directory is neither group- nor other-writable, then `$OCX_HOME` or `$HOME/.ocx` + `/symlinks/ocx.sh/ocx/cli/current/content/bin/ocx`. The resolver takes `[String: String]`, never reads `ProcessInfo` itself and never shells out to `which`; a resolved absolute path goes to `.path`, never `.name`.
- Why: a relative `PATH` entry is the working directory in disguise and a writable directory is a planted binary (CWE-426); mirrors `ocx-sdk-python@80136dde4162:src/ocx_sdk/_bootstrap.py:245-292` and the trust rules at `:430-460`.
- Verify: a test with a relative entry and a world-writable directory on `PATH` must resolve neither; `grep -rn --include='*.swift' -e '"which"' -e '/usr/bin/which' Sources` (output = violation; reading heuristic, not run).
- Run: yes, [SDK] `red-l` (trust guard neutralised) rc 1 on 6.4.0 and 6.3.3: `an error was expected but none was thrown and ".../writable/ocx" was returned`. Windows `.exe` suffix and cwd exclusion: unverified: read only.
- Binds: SDK. Floor: any.

**SW-API-15 (MUST). argv is `--format json --color never`, then global flags, command, positionals; a positional that starts with `-` throws before any spawn.**
- Why: ocx's grammar takes globals first and a leading-dash positional is option injection (CWE-88); `_client.py:119` and `_process.py:157-196` are the Python precedent.
- Verify: a test running the fake in `argv` mode and comparing every line; a test that a `-x` positional throws `invalidArgument` and spawns nothing.
- Run: yes, [SDK] `red-m` (guard neutralised) rc 1 on both toolchains. Environment overrides reach the child: SW-IO-24 unchanged (sentinel test; [SDK] `red-i` rc 1).
- Binds: SDK. Floor: any.

**SW-API-16 (MUST). `.exited(n)` maps to `n`, `.signaled(s)` maps to `128 + s` with `s` kept in a `signal` field; a status of 128 or more, or negative, is `crashed`.** Statuses 2-63 and 88-127 are `unknownStatus`. The mapping is one pure `static` function over `TerminationStatus`, with the `.signaled` arm under `#if !os(Windows)`.
- Why: owner Q6 default. A raw pass-through files a SIGTERM-killed child as ocx status 15 and the error as `unknownStatus`; ocx never assigns 128 or more (`exit_code.rs:8`), a Swift trap exits 132 on Linux x86_64 (SW-CLI), a signal death is `128 + s`.
- Verify: a test over every `TerminationStatus` case (`.signaled(15)` gives `(143, 15)`, `.signaled(9)` gives `(137, 9)`) and nine real children (`exit1`, `64`, `75`, `79`, `87`, `99`, `132`, `sigterm` giving 143 with signal 15, `sigkill` giving 137 with signal 9). Review heuristic: `grep -rn --include='*.swift' -e 'case .signaled' Sources` lists exactly one site and it contains `128 +`.
- Run: yes. R8 (`red-a` rc 1, 6 issues: `Expectation failed: ProcessRunner.status(.signaled(15)) == (143, 15)`, sigterm `error.exitStatus -> 15` against 143); [SDK] `red-a` on both toolchains. Windows: `TerminationStatus` has only `.exited(DWORD)`; a negative status after `Int32(truncatingIfNeeded:)` is `crashed` and the Linux test proves the branch, not the platform (unverified: read only).
- Binds: SDK; CLIs forwarding a child status reuse the function. Floor: swift-subprocess 1.0.1.

**SW-API-17 (MUST). The SDK's one public error is the SW-ERR-20 struct, `Code` is a function of the exit status alone, and cancellation is `CancellationError`.** `struct OcxError: Error, Sendable` with an open `Code`, `exitStatus`, `signal`, `stderr`, `envelope`, `cause`; no `public enum ...: Error`, no `@nonexhaustive` enum exception; the internal `ProcessFailure` enum stays `package`. The stdout failure envelope is attached with `try?` as optional data and never classifies the error; no code path that builds an error may throw.
- Why: a status a newer ocx adds becomes a new `Code`, never a source break (ocx's own `ExitCode` is `#[non_exhaustive]`, `exit_code.rs:10`); real ocx 0.6.5 labels exit 81 (`policyBlocked`) with `kind: "permission_denied"`, so the envelope is for people. SE-0413 keeps untyped `throws` the public default (SW-ERR-08).
- Verify: `grep -rn --include='*.swift' -e 'public enum [A-Za-z]*: Error' -e 'public enum [A-Za-z]*: Swift.Error' -e 'public enum [A-Za-z]*: .*, Error' Sources` (output = violation) and the test that exit 81 gives `.policyBlocked` while `envelope.kind == "permission_denied"`, plus one that a non-JSON stdout still yields an `OcxError`.
- Run: yes. R9 (G3 prints `Bad.swift:4`, `:5` on red, empty on green and package); [SDK] `red-k` (`try?` to `try`) rc 1 on both toolchains: every non-JSON failure becomes a thrown `DecodingError`.
- Binds: SDK; other libraries use SW-ERR-20 and SW-API-05 (K11). Floor: Swift 6.0.

**SW-API-18 (MUST). After the spawn returns, a cancelled caller gets `CancellationError`, never a result.** `if Task.isCancelled { throw .cancelled }` follows the spawn and the SDK maps it to `CancellationError`; teardown is Subprocess's job via SW-IO-23 (`createSession = true` and a `teardownSequence` with `toProcessGroup: true`, 5 s grace). Document on mutating calls (`install`, `pull`) that a cancelled call means "outcome unknown, re-query".
- Why: swift-subprocess does not throw on cancel; it starts the teardown and `run` returns the dead child's `terminationStatus` (SW-IO-27), here `.signaled(15)`, status 143 with the SIGTERM-first sequence. If the child finished on its own at the instant of cancellation the result is discarded too; the check cannot tell. SE-0504 `withTaskCancellationShield` is for cleanup bodies and does not change this.
- Verify: a cancel test that expects `CancellationError`; after `swift test`, `pgrep -af "sleep 300[01]"` in the same container exits 1 ("no survivor").
- Run: yes. R8 (`red-b` rc 1, 3 issues: `expected error of type CancellationError, but "crashed: ocx x exited 143" of type OcxError was thrown instead`); [SDK] `red-b` and `red-h` (teardown removed: 97 `sleep` survivors, `pgrep` exit 0) on both toolchains.
- Binds: SDK; any wrapper of a child process. Floor: swift-subprocess 1.0.1.

**SW-API-19 (MUST). A timeout is a task-group race against an injectable timer, and `timedOut` wins over a later cancel.** `timedOut` is thrown iff the timer completed before the child finished; the throw happens only after the child's process group is dead; a late timer cannot turn a finished child into a timeout. The checks run in this order: timer, then `Task.isCancelled`.
- Why: Q-IO-3 and the Go sibling (GO-API-20) reach the same ordering; the reversed order reports a timeout as a cancellation.
- Verify: a test whose injected `sleep` waits for the child's pid file, flips a flag and returns, and which cancels the outer task only after reading the flag (a trapping child keeps teardown running): expect `.timedOut`. 100 races by construction; on 6.4 also `swift test --filter CancellationTests --repeat-until fail --maximum-repetitions 10` (the flag does not exist on 6.3).
- Run: yes. R8 (`red-c`, lines swapped: rc 1, 100 of 100 `Expectation failed: timedOut`); [SDK] `red-c` 100/100 on both toolchains, green 1,000/1,000 on 6.4.0 and 500/500 by plain reruns on 6.3.3.
- Binds: SDK. Floor: Swift Testing, swift-subprocess 1.0.1.

**SW-API-20 (MUST). Capture is bounded by one symmetric `captureLimit`, default 4 MiB per stream, configurable.** stdout is `.bytes(limit:)`, stderr is `.string(limit:)`, overflow is `outputTooLarge(limit:)`; never `Int.max`, never a per-stream default below the largest observed stderr.
- Why: measured against real ocx 0.6.5: stdout is at most 4,040 bytes (recorded fixtures 7,145) but a traced `package pull` writes 1,372,005 bytes to stderr, so the prototype's 256 KiB stderr default turns `--log-level trace` into `outputTooLarge`; `SubprocessError`'s context is private, so two different limits could not say which stream tripped. Subprocess 1.0 made every limit explicit on purpose (SF-0037); the Python SDK's "no ceiling by design" (`_process.py:224-227`) does not transfer.
- Verify: `grep -rn --include='*.swift' -e 'limit: Int.max' -e 'limit: .max' Sources` (output = violation) and tests that a trace-sized stderr fits the default and that 1,000 bytes against a 500-byte limit gives `outputTooLarge`.
- Run: yes. R9 (G4 prints `Spawn.swift:3` on red, empty on green and package); [SDK] `red-d1` (256 KiB default) and `red-d2` (`Int.max`) rc 1 on both toolchains.
- Binds: SDK. Floor: swift-subprocess 1.0.1.

**SW-API-21 (MUST). Decode tolerantly: `decode` for the fields the CLI always writes, `decodeIfPresent` for the rest, unknown keys ignored.** A missing required key, a wrong type, non-JSON and empty stdout give a typed error naming the command and key; tests decode recorded documents from at least two CLI releases. A strict unknown-key check (where a contract demands one) opens a raw-key container, `decoder.container(keyedBy: AnyKey.self)`, never `container.allKeys` of the `CodingKeys` container.
- Why: ocx adds fields between releases (0.6.5 `about` adds `features`); a strict decoder rejects the recorded document. The typed container never lists unknown keys, so the SW-IO-28 recipe "compare `container.allKeys` to the known set" enforces nothing (K2).
- Verify: `swift test` with the recorded 0.5.8 and 0.6.5 documents and an invented `"future":{"x":1}` key; for a strict decoder, a test with an extra key must fail it.
- Run: yes. R7 (6.4.0 and 6.3.3: `CodingKeys-typed allKeys: ["version"]` against `AnyKey-typed allKeys: ["future", "version"]`); [SDK] `red-e` (a required `channel`) rc 1, `red-j2` (strict `AnyKey` decoder) rc 1 on the recorded document, `red-j1` (typed `allKeys`) stayed green rc 0 (not red: the wrong recipe).
- Binds: SDK; any `Decodable` that rejects unknown keys. Floor: Swift 6.0.

**SW-API-22 (SHOULD). Probe `ocx version` lazily, once per handle family, and cache only success.** Refuse a version below the floor (`MIN_SUPPORTED`), accept a newer one, ignore a pre-release tail (`0.5.8-rc1` compares as `[0,5,8]`); the memo is a `Sendable` class holding `Mutex<Bool>` shared by every copy of the handle.
- Why: Python (`_CompatCell`) and Go (GO-API-18) converge on lazy, once, success-only; a pre-release tail must not fail a `0.6.2-rc1` against a floor of `0.6.2`; an eager probe turns a missing binary into a version error at construction.
- Verify: tests that two typed calls produce one probe line and two failing calls two more; `swift test` parse cases.
- Run: green only (no red planted); [SDK] 2.12.
- Binds: SDK. Floor: Swift 6.0 (`Mutex`).

**SW-API-23 (SHOULD). A contract tier runs the real binary behind an environment gate.** `.enabled(if: ProcessInfo.processInfo.environment["OCX_SDK_EXE"] != nil)`, a throwaway `OCX_HOME`, and assertions on real failures (exit 64 for an unknown subcommand, 81 for `package which --offline` of an unknown package) and one real cancel.
- Why: the fake proves the SDK, the real binary proves the fake.
- Verify: `env OCX_SDK_EXE=/path/to/ocx swift test --filter RealOcxContractTests` (exit 1 = violation).
- Run: green only (4 tests, ocx 0.6.5, both toolchains; `package which` gives exit 81 `policyBlocked`); [SDK] verification runs.
- Binds: SDK. Floor: a pinned ocx.

#### Caught by reading, with a scan

**SW-API-24 (MUST). Copy the exit-status table from the ocx source at a pinned commit, never from the Python SDK, and walk 0...255 in a test.** Reading heuristic only, because no mechanical check can know the ocx repository's current table: diff the SDK's `code(forExitStatus:)` cases against `crates/ocx_exit/src/exit_code.rs`. Mapped statuses: 1 `failure`, 64 `usage`, 65 `dataError`, 69 `unavailable`, 74 `ioError`, 75 `tempFail` (the only retry-safe one), 77 `permissionDenied`, 78 `config`, 79 `notFound`, 80 `auth`, 81 `policyBlocked`, 82 `dirtyRcBlock`, 83 `transparencyLogUnavailable`, 84 `referrersUnsupported`, 85 `unsupportedKeyBackend`, 86 `forgeCapabilityUnavailable`, 87 `registryDeleteUnsupported`.
- Why: `ocx-sdk-python@80136dde4162:src/ocx_sdk/_errors.py:28-51` stops at 86 while `ocx@5de9d777eb7d` assigns 87, so a table copied from Python silently loses a status.
- Verify: reading heuristic: `grep -n -e '= 8[0-9],' -e '= 9[0-9],' crates/ocx_exit/src/exit_code.rs` against the SDK's cases (numbers match one to one); the 0...255 test walks an independently typed expectation, and exit 87 is run through a real child.
- Run: the 87 child and the 256-value walk are green in the package ([SDK] `childStatusMapsToCode`, `tableCoversEveryStatus`); the diff against the ocx repository was never automated.
- Binds: SDK. Floor: ocx at the pinned commit.

**SW-API-25 (SHOULD). Declarations used only by sibling targets of the same package are `package`, not `public`.**
- Why: every `public` symbol is versioned API; `package` (SE-0386) is invisible outside the package: a consumer package gets `error: cannot find 'helper' in scope`.
- Verify: `swift build` in a consumer package that calls the symbol (exit 1 proves the visibility); for existing code, list `public` declarations whose only referrers are in the same package (reading heuristic, not automated).
- Run: yes for the visibility fact, [LIB] V30 (`cons-pkg-red` rc 1, `cons-pkg-ok` rc 0); no for the referrer scan. Corpus density per 10k LOC: swift-collections 143.1, swift-log 28.3, swift-argument-parser 0.0 ([audit](swift-audit/exemplar-language-shape.md) Axis 3).
- Binds: library, SDK. Floor: Swift 5.9.

**SW-API-26 (SHOULD). Delete a speculative protocol.** A protocol is speculative when it is not `public` or `open`, exactly one type conforms across `Sources/` and `Tests/` (extensions count), no hand-written test double conforms (a generated mock does not count), and no second conformer is named in the same change. The replacement is the concrete type, a stored closure (`var send: @Sendable (String) async throws -> Void`) or a struct of closures; add the protocol when the second real conformer or the first hand-written spy exists. Judge a `public` protocol by whether its doc comment names who conforms.
- Why: 690 of 1,752 corpus protocols (39%) have one conformer and 427 are pure single-production-conformer, 238 of them internal; each is an `any` existential or generic parameter, a mock-generator dependency and a dead abstraction (one-protocol-per-class DI convention in tuist and element-x-ios).
- Verify: `find Sources Tests -name '*.swift' | xargs -r perl proto1.pl` (script under Check scripts; output = candidate), then apply the four-point test by reading. Limits: one-line type headers only; macro-generated doubles are invisible, which is intended.
- Run: yes. R3 (`red` prints `Sources/App/Mail.swift:1: protocol MailSending has one conformer (SMTPMailer)`; `green` with a hand-written `SpyMailer` in `Tests/` prints nothing; a public protocol prints nothing). The "named second conformer" judgement is a reading heuristic. Corpus scan: vapor 0, swift-log 1, containerization 1, SwiftPM 8, swift-build 15, tuist 131, element-x-ios 145 ([LIB] §2.7).
- Binds: library, SDK, CLI, server; an app that depends on a mock generator keeps the exception it states. Floor: any.

**SW-API-27 (SHOULD). In an executable or server, re-bind the logger explicitly where task-locals do not propagate.** `Logger.current` and `withLogger` are task-local: inside `withLogger(bound)` a child `Task {}` sees the bound logger and its metadata, `Task.detached` and every non-task boundary (GCD, completion handlers, delegates, C callbacks) see the process-wide fallback without request metadata, so re-bind with `withLogger(captured)` there. Bootstrap before the first read of `Logger.current` is SW-CLI-15.
- Why: the unbound default is captured at first access, so a `bootstrap` that comes after a read is invisible to it: output stays on the default stream handler (`info: [Lib] working`), rc 0, silent misrouting.
- Verify: a smoke run that logs through `Logger.current` and asserts the custom handler's marker (`CUSTOM`) appears in the output; `grep -rn -e 'Task\.detached' --include='*.swift' Sources` lists detach points to inspect.
- Run: yes, [LIB] V20-V21: `b3` prints `info: [Lib] working` twice and no `CUSTOM`, `b4` prints `CUSTOM: working [:]`, `b5` shows `CUSTOM: child-task ["req": 42]` and `CUSTOM: detached [:]` (metadata lost); all rc 0, so the red is the output. Not re-run. Apple-only types here: unverified: read only.
- Binds: executable, server. Floor: swift-log 1.14.0.

### Check scripts (verbatim, host-side perl; run red and green in R3)

`pubenum.pl` (SW-API-05): `find Sources -name '*.swift' | xargs -r perl pubenum.pl`

```perl
#!/usr/bin/perl
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

`proto1.pl` (SW-API-26): `find Sources Tests -name '*.swift' | xargs -r perl proto1.pl`

```perl
#!/usr/bin/perl
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

### Conflicts resolved

- **K1. SW-IO-26 against the working SDK ([SDK] §2.14).** SW-IO-26 made `ProcessFailure` the public closed vocabulary (`throws(ProcessFailure)`), set defaults of 4 MiB stdout and 256 KiB stderr without a source, enforced "only the spawn module imports `Subprocess`" by layout, and left the `Task.isCancelled` throw unimplemented. Decision: the SDK wins. The public error is SW-ERR-20's struct (SW-ERR-08 already forbids public concrete typed throws; SE-0413 calls untyped `throws` the better default), `ProcessFailure` is `package` and gains `cancelled` (SW-API-17); the limit is one symmetric 4 MiB (256 KiB is red against a traced pull, SW-API-20); the single importer is a grep because `red-g` stayed green (SW-API-09); the cancel throw is implemented and pinned 3 of 3 red (SW-API-18, re-run R8). SW-IO-27's `.signaled(9)` becomes `.signaled(15)`/143 under the SIGTERM-first teardown; the SDK's check is `Task.isCancelled`, not the signal value.
- **K2. SW-IO-28 strict-key recipe.** "A strict contract compares `container.allKeys` to the known set" is silently wrong with a `CodingKeys` container. Decision: `AnyKey` raw-key container (SW-API-21). Re-run R7 on 6.4.0 and 6.3.3 reproduces the two printed key lists.
- **K3. The SW-PKG SDK skeleton** ([swift-package.md](swift-package.md): one `OCXKit` target, `public import Subprocess` "because `OCX` exposes `Subprocess.Executable`"). Decision: the two-target layout of SW-API-09 wins; no Subprocess type is public, so the public target needs no `public import Subprocess`, and the skeleton is rewritten at authoring (the manifest loop and `from: "1.0.1"` stay). Type naming: the working package uses `Ocx`/`OcxSDK`/`OcxError` (the Python names); see Open question 4.
- **K4. SW-TEST-20/-22 (an injected spawn seam; the coverage run starts no process and passes `--skip LiveSpawn`; the adapter is excluded by path; lines and regions both at 100, regions pending Q-T7) against [SDK] §2.13 (a fake `ocx` script run out of process; the real spawn path counts; 283/283 lines).** Decision: the SDK form wins for the SDK kind. Reason: SW-TEST-20's own stated gap is the timeout race, cancellation and kill ladder, which are exactly the layers where the package's reds live (`red-b`, `red-c`, `red-h` fail only against real children) and which an injected `run` closure cannot reach; the earlier excluded-adapter measurement used a Foundation `Process` vehicle (25/27 lines), not the swift-subprocess runner. SW-TEST-20 remains the form for a CLI core that does not own a spawn module. New measurement R11: the same package reaches 283/283 lines but 179/182 regions (2 uncovered in `Discovery.swift`, 1 in `ProcessRunner.swift`), so SW-TEST-22's regions gate at 100 would be red; the SDK gate is lines at 100 (owner Q4) and regions are reported until Q-T7 is decided.
- **K5. SW-CLI "New commitments" (the SDK "takes a `Logger` or reads `Logger.current`") against the Q4 budget.** SW-API-12 allows one direct dependency and `swift-log` is a second (jq goes red, R10). Decision: the SDK v1 does not log; diagnostics travel in typed errors (`stderr`, `envelope`). SW-API-07 binds an SDK only once it logs, and adding swift-log then is an owner decision (Open question 2).
- **K6. [swift-errors.md](swift-errors.md) line 328 ("none uses `@nonexhaustive` in production code").** Stale. Re-grep (R12): swift-crypto 33 lines (e.g. `swift-crypto@1c80d3aff53f:Sources/Crypto/PRF/AES.swift:19`, tools 6.2), Vapor 2 (`vapor@bf77fc69b142:Sources/Vapor/Server/ServerError.swift:2` and `Application+AddressConfiguration.swift:36`, both public error/config enums), swift-protobuf only in generator output and options. SW-ERR-20's "enum only as `@nonexhaustive`" has production precedent; the struct stays the floor-safe default.
- **K7. `-require-explicit-sendable` adoption.** [LIB] counts 2 of 40 (manifests only); the gates audit counts 5 and the re-grep over manifests and workflows agrees (R12: swift-log, swift-distributed-tracing, swift-openapi-generator, swift-service-lifecycle, async-http-client). The audit figure is cited, per the map's counting discipline (conflict 21). All five use a spelling SW-GATE-17 measured as inert (frontend flag: plain warning; driver flag: no-op), and no exemplar promotes the group to an error (swift-testing demotes it, `Package.swift:440`, `.treatWarning("ExplicitSendable", as: .warning)`), so "5 repositories gate it" is wrong: 0 of 40 do.
- **K8. SW-LANG-04's "guard every form newer than the floor with `#if compiler(>=N)`" against `#if hasAttribute(nonexhaustive)`.** Both spellings typecheck on 6.1, 6.3 and 6.4 (R6). Decision: `hasAttribute(nonexhaustive)`, because it asks for the attribute itself and so does not depend on how a patch release (6.2.3) compares; `compiler(>=N)` stays the convention for forms with no `hasAttribute`/`hasFeature` probe.
- **K9. Overlaps with sibling owners, deduplicated.** Manifest enabling of the import flags stays SW-PKG-07 (SW-API-01 owns only the source-side consequence); CI wiring of the digester stays SW-GATE-20 (SW-API-11 owns what the allowlist may contain); bootstrap-once for executables stays SW-CLI-15 (SW-API-27 owns re-binding); the consumer-package vehicle is SW-CONC-06's `CompileTests/` (SW-API-02 adds the Sendable-storage twin); the explicit-Sendable group promotion is SW-GATE-17 (K12).
- **K10. Correction inside [LIB] (§2.5).** The staging recipe `@nonexhaustive(warn)` was taken from SE-0487's text and not run. Run (R4, R5): the retrofit is source-compatible, but the digester reports it as breaking, so a CI that follows SW-GATE-20 needs the one-time allowlist line stated in SW-API-11.
- **K11. SW-ERR-20 (an enum error is allowed as `@nonexhaustive`) against the SDK grep (no public enum error at all).** Decision: the SDK is stricter. `Code` is keyed on the CLI exit status, a CLI may add a status at any time, and a struct maps an unknown status without a source change; other libraries may follow SW-ERR-20's looser text.
- **K12. SW-CONC-04 and [LIB] V13 against SW-GATE-17: is the library-side explicit-Sendable check red by exit code?** SW-CONC-04 and [LIB] say the build "stays 0 even with `.treatWarning(...)` and `-warnings-as-errors`" and call it a log-reading audit; SW-GATE-17 says the group promotion exits 1 and the frontend spelling is the inert one. Re-run (R13, 6.4.0 and 6.3.3): `.treatWarning("ExplicitSendable", as: .error)` alone is rc 1 on a bare public struct and rc 0 on the stated twin; the same promotion beside `.unsafeFlags(["-Xfrontend", "-require-explicit-sendable"])` is rc 0 with the diagnostic demoted to a warning, which is exactly the setup both earlier measurements used. Decision: SW-GATE-17 wins (it is the later and more complete measurement, 15 builds plus a 20-build re-run) and SW-API-02 defers the library gate to it. SW-CONC-04's Verify text must be rewritten at authoring to name the group promotion instead of the unsafeFlags log grep.

### Verification runs added by this consolidation (fixtures: `/home/mherwig/.cache/research-lang/swift-tools/fixtures/api-consolidation/`)

All 2026-10-10 on Docker `swift:6.4` (6.4.0) unless a version is stated; `SWIFT_VERSION=6.3` selects 6.3.3, `6.1` selects 6.1.3. Fixtures were copied from the dives' planted fixtures (never run inside an exemplar clone) or created new (`v2/gen.sh`, `dg/setup.sh`).

- **R1** import plants (`lib/d-red`, `d-package`, `d-public`, `d-internal-use`, `d-off`): `swift build` gives rc 1 `function cannot be declared public because its parameter uses an internal type`; rc 1 `... uses a package type`; rc 0; rc 0; rc 0.
- **R2** logging plants (`lib/b1-lib-bootstraps`, `b2-lib-takes-logger`): build and run `App`: `Logging/LoggingSystem.swift:165: Precondition failed: logging system can only be initialized once per process.` rc 132, both library greps print `Lib.swift:3` and `:4`; twin prints `CUSTOM: working [:]` rc 0, greps empty.
- **R3** `perl pubenum.pl` over `[LIB]`'s `a/lib-enum-v2` prints `Sources/Lib/Lib.swift:1: public enum Status lacks @nonexhaustive or @frozen`; `lib-nonex-v2`, `lib-struct-v2`, `lib-frozen-v1` print nothing. `perl proto1.pl` over `e/red` prints the `MailSending` line, `e/green` and `e/pub` print nothing.
- **R4** `@nonexhaustive(warn)` (`v2/`): a plain enum shipped as 1.0.0 becomes `@nonexhaustive(warn)` in 1.1 with no new case: consumer with an exhaustive switch `swift build` rc 0 plus the warning quoted in SW-API-11; 1.2 adds `timedOut`: exhaustive consumer rc 1 `error: switch must be exhaustive`, consumer with `@unknown default` rc 0 `warning: switch must be exhaustive`.
- **R5** digester on the `(warn)` retrofit (`dg/adopt-warn`, tag `1.0.0` against HEAD): `swift package diagnose-api-breaking-changes 1.0.0` rc 1 `API breakage: enum Status is now with @nonexhaustive` on 6.4.0 and 6.3.3; with `--breakage-allowlist-path ../allow-warn.txt` (that one line) rc 0 `No breaking changes detected in Lib`.
- **R6** guard spellings (`v2/swiftc`, `v2/lib-guard`): `#if compiler(>=6.2.3)` and `#if hasAttribute(nonexhaustive)` each `swiftc -typecheck -parse-as-library -swift-version 6` rc 0 on 6.1.3, 6.3.3 and 6.4.0. Guarded library, tools 6.1: on 6.1.3 consumers with and without `@unknown default` both rc 0 and print no diagnostic; on 6.4.0 the `@unknown default` consumer rc 0 and the exhaustive consumer rc 1 `switch covers known cases, but 'Status' may have additional unknown values, possibly added in future versions`.
- **R7** `allkeys/` (copy of the SDK dive's plant): `swift run probe` on 6.4.0 and 6.3.3 prints `CodingKeys-typed allKeys: ["version"]` and `AnyKey-typed allKeys:    ["future", "version"]`.
- **R8** `sdk/` (copy of `sdk-shape/pkg`, Swift Testing, swift-subprocess 1.0.1): green `swift test` rc 0, `Test run with 38 tests in 5 suites passed after 3.357 seconds`; `red-a` (raw `.signaled` pass-through) rc 1, 6 issues; `red-b` (cancel check deleted) rc 1, 3 issues `crashed: ocx x exited 143`; `red-c` (cancel before timer) rc 1, 100 issues `Expectation failed: timedOut`. The other mutations (`red-d1`, `-d2`, `-e`, `-h`, `-i`, `-j1`, `-j2`, `-k`, `-l`, `-m`, `-n`, `-g`) are [SDK]'s, run on both toolchains, not repeated.
- **R9** `sdk-shape/greps.sh` on `plants/red`, `plants/green` and `pkg` (host-side grep): G1-G6 print the planted lines named in SW-API-09, -10, -17, -20 on red (grep exit 0) and nothing on green and the package (exit 1).
- **R10** `swift package dump-package | jq -e '[.dependencies[] | .sourceControl[0].location.remote[0].urlString] == ["https://github.com/swiftlang/swift-subprocess"]'`: the package `true` exit 0; `dep-red/` (adds swift-log) `false` exit 1.
- **R11** `sdk/cov.sh green` (coverage JSON, filter `startswith($root + "/Sources/")`): lines 283/283, gate at 100 exit 0; regions 179/182, gate at 100 exit 1 (`Discovery.swift` 27/29, `ProcessRunner.swift` 50/51; the three regions were not investigated).
- **R12** corpus re-greps (`/home/mherwig/.cache/research-lang/exemplars/swift`, read-only): `@nonexhaustive` swift-crypto 33, vapor 2, swift-protobuf 14 (generator and reference output), async-http-client 0, containerization 0; `require-explicit-sendable` in 5 repos; `enable-library-evolution` in `Package*.swift` of swift-testing and SwiftPM only; `InternalImportsByDefault` in 13 repos and `MemberImportVisibility` in 21 over every `Package*.swift` (the audits count 11 and 19-20 over root and app manifests).
- **R13** `es/` (`es-red`, `es-green`, `es-frontend`, `es-none`; tools 6.2, Swift 6 mode, one `public struct Config` with and without `: Sendable`; runner `es/chk.sh <dir>`, `SWIFT_VERSION=6.3` for the prior line). `es-red` (`.treatWarning("ExplicitSendable", as: .error)`): rc 1 on 6.4.0 and 6.3.3, `error: public struct 'Config' does not specify whether it is 'Sendable' or not [#ExplicitSendable]`. `es-green` (same setting, `Config: Sendable`): rc 0. `es-frontend` (`-Xfrontend -require-explicit-sendable` plus the same `.treatWarning`): rc 0, two `warning:` lines, both toolchains. `es-none` (no setting): rc 0, silent, i.e. the group is opt-in and only naming it enables it.

## Applied to the exemplars and the future consumers

**What the corpus already satisfies**

- SW-API-01/-03: swift-log sets both flags (`swift-log@4038b6a4f74a:Package.swift:62,65`), Vapor too (`vapor@bf77fc69b142:Package.swift:249-250`); 13 of 40 repos set `InternalImportsByDefault` and 21 set `MemberImportVisibility` (R12). `@_exported import CryptoKit` in swift-crypto is the allowed overlay exception.
- SW-API-04: only swift-testing (`Package.swift:520-531`) and SwiftPM (`Package.swift:231,777,791,805`) enable library evolution, both for ABI-stable binaries.
- SW-API-05: swift-crypto (33 `@nonexhaustive`), Vapor's error enums (`ServerError.swift:2`), `@frozen` in swift-collections (109 lines), swift-system (22), async-algorithms (26), Nuke (13); a struct error in `apple/containerization@3e7bc39e66b3:Sources/ContainerizationError/ContainerizationError.swift:23-29` (the model for SW-API-17).
- SW-API-07: executables bootstrap (`containerization@3e7bc39e66b3:Sources/cctl/cctl.swift:24`); `swift-server/async-http-client@017115279d09:Sources/AsyncHTTPClient/HTTPClient.swift:390` takes `logger: Logger`; `swift-aws-lambda-runtime@8abd464310c7:Sources/AWSLambdaRuntime/Logging/LoggingConfiguration.swift:41` defaults to `Logger.current`.
- SW-API-26: Vapor flags 0, swift-log 1 (a test-local `History`), containerization 1.

**What prominent exemplars violate**

- SW-API-05: 310 of 363 public enums (85%) in 17 library-shaped repos carry neither attribute: swift-nio 71/71, containerization 110/112, swift-protobuf 24/24, hummingbird 12/12, swift-dependencies 9/9, vapor 23/25 (`vapor@bf77fc69b142:Sources/Vapor/Application+State.swift:5`, `public enum State`, 7 cases, next to a struct `LifecycleError` at `:36`), Nuke 17/30, swift-crypto 18/51.
- SW-API-01: 27 of 40 repos leave `InternalImportsByDefault` off, among them swift-nio, swift-collections, swift-system, swift-crypto, async-http-client and containerization.
- SW-API-07: the hybrid `logger ?? Logger(label: "com.apple.containerization.bridge")` at `containerization@3e7bc39e66b3:Sources/Containerization/BridgeManager.swift:90` and `Sources/ContainerizationNetlink/NetlinkSession.swift:35`; `tuist@2f6ac74754bf:cli/Sources/TuistLogging/ApplicationLogStore.swift:44-51` bootstraps from a library-shaped module (acceptable only because the module is application-internal); `Logger(label:)` in non-test, non-example Sources of vapor (3 files), hummingbird (3), lambda-runtime (3), apple/container (13).
- SW-API-02: no exemplar gates the group: 5 of 40 repos pass `-require-explicit-sendable` in a spelling that checks nothing (swift-log `Package.swift:71`, swift-distributed-tracing, swift-openapi-generator, swift-service-lifecycle, async-http-client) and swift-testing demotes the group to a warning (`Package.swift:440`), 0 of 40 promote it to an error (K7, K12); swift-protobuf's `CompileTests/NonisolatedDeclarations/Package.swift:25` is the precedent for the consumer package.
- SW-API-26: tuist 131 flags (e.g. `tuist@2f6ac74754bf:cli/Sources/Rosalind/AndroidBundleMetadataService.swift:33`, a `*Servicing` protocol), element-x-ios 145, swift-build 15, SwiftPM 8 (`swiftlang/swift-package-manager@5546f44a3b52:Sources/Basics/ImportScanning.swift:25`); the audit counts 427 pure single-conformer protocols (238 internal, 158 public).
- SDK rules (no Swift SDK exists in the corpus; `import Subprocess` in 3 of 40 repos: swiftly 14 files, tuist 3, element-x-ios 1; `Process()` in 12+ repos): `swiftly@c8cf2e35bfca:Sources/SwiftlyCore/ModeledCommandLine.swift:64-71` mutates `c.environment` on a local copy and runs `self.config()` (SW-IO-24, latent); `swiftly@c8cf2e35bfca:Sources/Swiftly/Proxy.swift:94-95` maps `.signaled` to `exit(1)` (SW-API-16 lost signal); `tuist@2f6ac74754bf:cli/Sources/TuistProcess/CommandRunner.swift:321-322` keeps the signal apart under `#if !os(Windows)` but in a closed `CommandError` enum (half of SW-API-16, fails SW-API-17); `tuist@2f6ac74754bf:cli/Sources/XcodeGraph/Sources/XcodeGraphMapper/Utilities/SubprocessRunner.swift:33-34` passes 10 MiB to both streams (the SW-API-20 principle, unmeasured size). The Python baseline `ocx-sdk-python@80136dde4162` has the 86-status table and the unbounded capture the Swift SDK corrects.

**New commitments**

- **Swift SDK wrapping the ocx CLI** (mirrors `ocx-sdk-python@80136dde4162`, with the Q6 divergence): SW-API-01 to -04, -05 (as the struct error), -11 to -25, plus SW-IO-23/-24 (teardown and environment, unchanged), SW-TEST-15/-16, SW-ERR-08/-20. The reference implementation is the 467-line package in `[SDK]` (fixtures `sdk-shape/pkg`), still only in the research cache (Open question 5).
- **Swift CLIs in the ocx/grimoire mould**: they are executables, so SW-API-07 does not bind them and SW-CLI-15 does; they take SW-API-27, SW-API-26, SW-API-16 where they forward a child's status (128-255 is never a `Status` case, SW-CLI), and SW-API-24 if they print ocx's codes.
- **OCI tooling in the `apple/containerization` mould**: library targets take SW-API-01, -05, -07 (retire the hybrid fallback) and use the `ContainerizationError` struct shape as the public error.
- **General adopters (packages, servers, apps)**: SW-API-01 to -08, -11 and -25/-26; apps keep their mock-generator exception under SW-API-26 and are exempt from SW-API-05 only for types they do not publish.

## AI-agent failure modes

Ranked by how often the habit bites (corpus counts and the dives' agent angles); each has the mechanical check.

1. **`public enum FooError: Error { case a, b }`, or any new public enum with no attribute.** Compiles, breaks consumers on the next case (85% of corpus public enums are unmarked). Check: SW-API-05 `pubenum.pl`, SW-ERR-20 N1, the SDK G3 grep (SW-API-17), digester (SW-API-11).
2. **Wrapping the CLI with `Foundation.Process` + `Pipe` + `waitUntilExit()`** (12+ corpus repos construct `Process()`; Subprocess appears in 3). Deadlocks above 64 KiB. Check: SW-API-10 G2 grep, the `stderr-bytes` fake-CLI test (SW-API-13).
3. **Passing `.signaled(n)` through as `n`, or copying the exit table from the Python SDK (loses 87), or treating `terminationStatus != 0` as "ocx said no" and parsing stderr.** Check: SW-API-16 status test over every `TerminationStatus` case and nine real children; SW-API-24 table diff; SW-API-17 envelope test.
4. **A protocol plus a mock for every service (`FooServicing`, `MockFoo`, `@Mockable`).** Pre-concurrency DI habit (tuist 131, element-x-ios 145). Check: SW-API-26 `proto1.pl`; the SDK has no protocol seam (SW-API-13).
5. **`LoggingSystem.bootstrap` in a library `init`, a `static let`, a test `init` or every `@Test`; `private let logger = Logger(label: "MyLib")`; `logger ?? Logger(label:)`.** Exit 132 or silent misrouting. Check: SW-API-07 and -08 greps.
6. **Bare `import X` everywhere with `public func f(_: X.Type)`; when the flag errors, "fixing" it with `@_exported import` or `package import`.** Check: SW-API-01 build (`package import` stays red), SW-API-03 grep.
7. **`Task { try await run(...) }` / `Task.detached` to add a timeout, then `task.cancel()`; `try? await Task.sleep` as the timer; the cancel check before the timer check.** `run` returns `.signaled` instead of throwing. Check: SW-API-18/-19 tests, SW-API-10 G5 grep.
8. **Guessing a capture limit (`Int.max`, "a big number") or keeping 256 KiB on stderr.** Check: SW-API-20 grep and trace-size test.
9. **Adding `-enable-library-evolution` to every package, or `@frozen` on structs "for performance".** Check: SW-API-04 grep.
10. **Strict decoding via `container.allKeys`; or every field non-optional; or `decodeIfPresent` on required fields.** Check: SW-API-21 recorded-document tests (`red-e`, `red-j2`), key-list probe.
11. **Adding a case to a shipped enum "because the compiler will find the switches"; adding `@nonexhaustive` to a shipped enum; deleting the old API in the same change; bare `@available(*, deprecated)`.** Check: SW-API-11 digester, SW-API-06 grep.
12. **`import Subprocess` in the public target "because it is already a dependency"; `public init(runner: ProcessRunner)` leaking the seam.** Check: SW-API-09 G1/G6 greps and the SW-API-01 build.
13. **Pasting `@nonexhaustive` into a tools-6.2 library with no guard** (fails on 6.2.0 to 6.2.2 and 6.1), or an invented spelling (`@nonExhaustive`, `@extensible`). Check: `swiftc -typecheck` on the floor image (`unknown attribute`), `grep -rn -e '@nonexhaustive' --include='*.swift' Sources` then confirm each is guarded or the floor is stated.
14. **`Task {}` in `main.swift` as the Sendable proof, or "fixing" a consumer Sendable error with `extension Config: @retroactive @unchecked Sendable`** instead of stating it in the library. Check: SW-API-02 consumer package; `grep -rn -e '@retroactive' -e '@unchecked Sendable' --include='*.swift' Sources` (each hit on a type the repo does not own is a smell; SW-CONC owns the rule).
15. **Hallucinated or removed spellings**: Subprocess 0.x (`output: .string` with no limit, `.sendSignal`), `ocx --json`, `Subprocess.run(...).result`, `.name("./tool")`. Check: `swift build` against the pinned 1.0.1 and the SW-API-15 argv test.
16. **Copies swift-log's `-Xfrontend -require-explicit-sendable` (or the `-Xswiftc` form) believing it gates public Sendable statements.** Five corpus repos did; the frontend spelling only warns and the driver spelling does nothing. Check: the SW-GATE-17 ban grep (`grep -rn -F -e 'require-explicit-sendable' --include='Package*.swift' --include='*.yml' .`) and R13.

## Open questions

Owner decisions (the default the program applies is stated):

1. **Library floor against `@nonexhaustive`.** Tools 6.2 admits Swift 6.2.0 to 6.2.2, which cannot parse the attribute. Default: keep the floor and the `#if hasAttribute(nonexhaustive)` guard (SW-API-05); the alternative is to state `swift:6.2.3` as the floor leg (SW-LANG-03) and drop the guard.
2. **Does the SDK ever log?** Default: no logger and no swift-log in v1 (K5); if the owner wants SDK logging, the dependency budget (SW-API-12) is widened to swift-log and SW-API-07 binds the SDK.
3. **SDK regions gate.** The package is at 179/182 regions, so SW-TEST-22's regions at 100 is red (R11). Default: gate lines at 100 (Q4), report regions, and let the Q-T7 decision pick the regions floor.
4. **Naming of the SDK.** The working package uses `OcxSDK`, `Ocx`, `OcxError` (the Python names; the API Design Guidelines treat `ocx` as a word); the SW-PKG skeleton used `OCXKit`/`OCX`. Default: `Ocx*` names, product `OcxSDK`, repository `ocx-sdk-swift`.
5. **Durable home for the reference SDK package.** The 467-line source and 487-line tests live only in the research cache. Default: copy it into the future skill's `references/` or a template repo at authoring time.
6. **Deprecation timeline.** One major from deprecation to removal is a decided policy ([LIB] §2.9), not a measured fact. Default: keep it.
7. **Owner Q6 (128 + n) and Q7 (Windows).** Default stays: the SDK maps `128 + s` and keeps `signal`; every Windows row is unverified: read only.

Subareas that deserve another research round:

- **SDK breadth and drift gate.** The fixture package covers four commands; the Python SDK has 64 result types and 70 command methods generated from `https://ocx.sh/schemas/reports/v1.json`. Question: are the Swift result types hand-written or generated from that schema, which command emits which output shape (`package test -- CMD` prints the child's stdout under `--format json`; report-then-fail commands keep stdout), and what test fails when ocx's schema drifts?
- **Mutating calls under cancellation.** Question: after a cancel (`CancellationError`, "outcome unknown"), does `ocx package install`/`pull` against a real store leave a consistent state when the group is killed at varied points, and which re-query is the idempotent confirmation? Needs real ocx and a kill-point sweep.
- **SDK on Windows and macOS.** Question: do `createSession`, `toProcessGroup`, the NT-status mapping and the `.exe` PATH rules behave as the Linux fixtures claim? Needs the Windows host (owner Q7) and a macOS runner.
- **Streaming and the capture ceiling.** Question: when ocx emits a large JSON (SBOM, catalog) or a long progress stream, is the 4 MiB limit raised per call or replaced by a `.sequence` consumer, and how does that interact with cancellation and teardown?
- **Library module and import-level edges.** Question: `@usableFromInline import` (SE-0409, "yet to be implemented", not tested), `@inlinable` plus `public import`, and the module-split rule for a library larger than the SDK (M-D-14); `@retroactive` (M-D-13) has no measurement.

## Sub-artifacts

- [swift-api/library-api-shape.md](swift-api/library-api-shape.md): import access (`InternalImportsByDefault`, `MemberImportVisibility`, `public import`, `package`), library evolution, the Sendable consumer view, public enum evolution with the digester table, the speculative-protocol heuristic, the swift-log library contract and the deprecation recipe; 31 verification runs, perl scripts verbatim.
- [swift-api/sdk-shape.md](swift-api/sdk-shape.md): the Swift SDK over the ocx CLI built and run on 6.4.0 and 6.3.3: module layout and dependency budget, discovery, argv, exit and signal mapping, the public error, cancellation and timeout contract, measured capture limits, tolerant decoding and the failure envelope, the version gate, the test seam and coverage gate; 13 mutation variants, 6 greps, a budget jq, a coverage gate and a grandchild `pgrep`.

Renumbering map (dive-local to final). [LIB] 01 to SW-PKG-07 plus SW-API-01; 02 to 01; 03 to 03; 04 to 25; 05 to 04; 06 to 02; 07 to 05; 08 to 11 (CI wiring is SW-GATE-20); 09 to 26; 10 to 07; 11 to 27 (bootstrap order is SW-CLI-15); 12 to 08; 13 to 06; 14 folded into 06's Verify. [SDK] S01 to 09; S02 to 12; S03 to 14; S04 to 15; S05 to SW-IO-24 (cited, unchanged); S06 and S22 to 16; S07 to 24; S08 and S15 to 17; S09 to 18; S10 to 19; S11 to SW-IO-23 (cited, folded into 18); S12 to 20; S13 and S14 to 21; S16 to 22; S17 and S18 to 13; S19 to 01; S20 to 10; S21 to 23.

## Key sources

- https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0487-extensible-enums.md (SE-0487 `@nonexhaustive`, implemented Swift 6.2.3)
- https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0409-access-level-on-imports.md (SE-0409, `InternalImportsByDefault`, `@_exported` stance)
- https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0444-member-import-visibility.md (SE-0444, `MemberImportVisibility`)
- https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0386-package-access-modifier.md (SE-0386 `package` access)
- https://github.com/swiftlang/swift-evolution/blob/main/proposals/0413-typed-throws.md (SE-0413: untyped `throws` is the default, typed for module-internal code)
- https://www.swift.org/blog/library-evolution/ (SwiftPM packages should not enable library evolution)
- https://www.swift.org/documentation/api-design-guidelines/ (naming and documentation baseline)
- https://github.com/apple/swift-log/blob/main/Sources/Logging/Docs.docc/BestPractices/003-AcceptingLoggers.md (the library logging contract and its "Avoid" list)
- https://github.com/apple/swift-log/blob/main/Sources/Logging/Docs.docc/BestPractices/004-TestingLogging.md (`InMemoryLogHandler`, no bootstrap in tests)
- https://github.com/apple/swift-log/blob/main/Sources/Logging/Docs.docc/Proposals/SLG-0006-task-local-logger.md (`Logger.current`, `withLogger`)
- https://github.com/swiftlang/swift-subprocess/blob/1.0.1/README.md (cancellation, graceful teardown, limits, platform table)
- https://github.com/swiftlang/swift-foundation/blob/main/Proposals/0037-subprocess-1.0.md (SF-0037: explicit limits, `toProcessGroup` and the final kill)
- https://github.com/ocx-sh/ocx/blob/5de9d777eb7d/crates/ocx_exit/src/exit_code.rs (ocx exit statuses 0-87, `#[non_exhaustive]`)
- https://ocx.sh/schemas/reports/v1.json (ocx `--format json` report contract)
- https://github.com/ocx-sh/ocx-sdk-python/tree/80136dde4162/src/ocx_sdk (the fleet's SDK baseline: `_process.py`, `_errors.py`, `_bootstrap.py`, `_results.py`, `_client.py`)
