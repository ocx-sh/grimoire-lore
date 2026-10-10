---
title: "Swift errors and traps (SW-ERR): typed throws, error shape, swallowing, logging layer, force operations, trap policy"
topic: "Errors and traps (SW-ERR) -> swift-quality/errors.md; rows M-C-01..M-C-06, M-C-08, M-C-09 (M-I-01/02 carried to SW-SEC)"
model: sonnet
id_family: SW-ERR
consolidates:
  - swift-errors/error-contracts.md
  - swift-errors/traps-and-unwraps.md
date: 2026-10-10
---

# Swift errors and traps (SW-ERR), consolidated

Toolchains: Swift 6.4.0 and 6.3.3 (Linux x86_64, Docker `swift:6.4` / `SWIFT_VERSION=6.3`), swift-format bundled (reports `main` on 6.4, `6.3.3` on 6.3), SwiftLint 0.65.1, swift-argument-parser 1.8.2, swift-log 1.16.1. No macOS, no Xcode, no Windows: every Apple or Windows behaviour below is `unverified: read only`. Citation keys: **[EC]** = [error-contracts](swift-errors/error-contracts.md) (finding number or Verification-runs row `V`), **[TU]** = [traps-and-unwraps](swift-errors/traps-and-unwraps.md), **[CN]** = a re-run or new check made by this consolidation (table "Consolidator re-runs"), **[map]** = [swift-topic-map](swift-topic-map.md), **[shape]** / **[gates]** / **[cfg]** = the audits under `swift-audit/`.

## Verdict

1. **Public API throws untyped. Typed `throws(E)` is for internal code, generic forwarders, registered closed domains and Embedded.** Binds the public surface of libraries and the SDK; CLIs, servers and apps have no external consumers, so internal typed domains are allowed there but never encouraged. Confirms [map] conflict 6: a typed public signature turned a new error into a consumer source break (rc=1) where the untyped twin stayed green (rc=0) [EC V1]. The three OCI exemplars use 0 typed throws against 3,151 untyped [EC §1].
2. **Typed throws is not the ergonomic path in Swift 6.4 or 6.3.3.** Closure inference does not exist (`{ try typed(x) }` is `any Error`), `FullTypedThrows` is a silent no-op, and typed errors do not cross `async let`, task groups, `Task` or `TaskLocal.withValue` [EC §3-4, CN R1-R2]. Annotate or write a loop; do not cast.
3. **The public error domain is one `struct` with an open `Code`, a `message` and a `cause`** (apple/containerization's `ContainerizationError`); a public `enum` is allowed only as `@nonexhaustive` (Swift 6.2.3+) or `@frozen` closed domain. MUST for library and SDK API, SHOULD elsewhere. Causes are chained structurally, never stringified.
4. **Swallowing is the dominant defect class and the compiler has no diagnostic for it.** `try? data.write(to: "/dev/full")` prints `saved 7 bytes` and exits 0 with zero warnings on both toolchains [EC §9]. The greps are the gates: no empty `catch`, no `try?` on write/remove/move/copy/create/decode without an inline `swallow-ok:` reason. A log-only `catch` is a review trigger; exactly one layer logs an error, the one that ends it.
5. **Throw on external input, trap only on invariants.** `precondition`/`assert`/`fatalError` never validate argv, files, wire data or decoded JSON (CVE-2026-97697 is that shape). `fatalError` marks unreachable states (the only primitive that survives `-O` and `-Ounchecked`), `precondition` carries a documented caller contract, `assert` is debug-only. Never build with `-Ounchecked`. A trap is never an exit status. Binds servers, CLIs, parsers and any library parsing untrusted bytes; documented trapping primitives (swift-nio `set*(at:)`) are allowed when a non-trapping sibling exists.
6. **Force operations: swift-format `lint --strict` with the three `Never*` rules enabled, in the config the gate actually reads, is the check.** SwiftLint is conditional (only where it is already the linter). Test code is exempt from the lint but uses `try #require(x)`, not `!`. The carve-out is a static-literal initialiser or a provable shim with the reason written next to it.
7. **Error text for people is a sentence, never a type dump and never an `Error Domain=` dump.** Every error type conforms to `CustomStringConvertible` (plus `LocalizedError` when Foundation or an Apple UI may read it); causes that are Foundation errors are rendered through `localizedDescription`, own errors through their description. This narrows [EC] SW-ERR-10 ("never `localizedDescription`"), which a re-run contradicts (conflict C1).
8. **Ownership.** The throw-not-trap boundary rule lives here (SW-ERR-14, SW-ERR-17); trapping integer conversions and `truncatingIfNeeded` (M-I-01/02) are SW-SEC rows [TU §10], carried under "Carried to SW-SEC" so the security consolidation does not lose them. Not researched: `Result`'s general role (M-C-07, P3), error aggregation over many targets, chain sanitisation against terminal control characters, credentials in error text.

### Where the sources disagreed, and how it was settled

| # | Conflict | Decision and reason |
|---|---|---|
| C1 | [EC] SW-ERR-10 bans `localizedDescription` outside UI; [EC]'s own green twin and its ArgumentParser `NSError` row already print Foundation errors as an `Error Domain=...` dump under interpolation. | **Narrowed.** Re-run [CN R8]: `CocoaError`/`POSIXError` give a readable sentence through `localizedDescription` and an `Error Domain=NSCocoaErrorDomain Code=260 ... UserInfo={...}` dump through `"\(error)"`; own plain errors are the reverse (`The operation could not be completed. (main.D error 1.)` vs `D()`), identical on 6.4 and 6.3.3. [EC]'s template (`"\(message): \($0)"`) therefore prints the dump for every Foundation cause. Rule SW-ERR-18/21 replace the ban with a verified `render(_:)` and a stderr check. |
| C2 | [EC] SW-ERR-05 "never `error as! E`" and [TU] E1 "no `as!`" vs swift-log, whose `withLogger` and `withTaskLocalLogger` contain 8 `throw error as! Failure` (swift-log@4038b6a4f74a:Sources/Logging/Logger+With.swift:60, `:107`, `:151`, `:195`, `:259`, `:323`; Logger.swift:1498, `:1510`; [gates] reads all as intentional). | **One shape is allowed.** [CN R2]: `TaskLocal.withValue(_:operation:)` erases a typed closure error (`thrown expression type 'any Error' cannot be converted to error type 'E'`, rc=1) and the `do { ... } catch { throw error as! E }` shim compiles (rc=0) on 6.4 and 6.3.3. The cast is provable only when the erasing API rethrows nothing but the closure's own error; it needs `// invariant:` plus `swift-format-ignore: NeverForceUnwrap` (SW-ERR-05). Any other `as! E` stays banned. swift-log itself has `NeverForceUnwrap` set `false` (`.swift-format:33`), so it is a precedent for the shim, not for an unannotated cast. |
| C3 | [TU] E3 offers SwiftLint `force_unwrapping` as a gate; [map] conflict 1 makes swift-format the formatter and lint of record. | **swift-format `--strict` is the check; SwiftLint is a conditional clause** of SW-ERR-05. The unverified half of E3 (severity override) was run: `force_unwrapping: {severity: error}` exits 2 without `--strict`, default severity exits 0 [CN R7]. |
| C4 | [shape] pattern 6 "errors are enums, wrap the cause" (75% of 973 error types are enums) vs [EC] "public error is a struct". | **Split by surface.** The audit measures what the corpus does (tuist 261 enums, SwiftPM 99; mostly per-feature internal enums); [EC] governs the *public* library/SDK domain, where an enum case is a source break (`F/a/untyped-v2-newcase` rc=1 [EC V1c]). Internal enums stay fine. The audit's "wrap the cause" half is adopted (SW-ERR-12, 20). |
| C5 | Rust sibling `rust-quality/errors.md` ERR-18 makes log-and-return a MUST; containerization logs then throws at 27 sites. | **SHOULD, defined by the ending layer.** The 27 sites are gRPC handlers translating to a status (containerization@3e7bc39e66b3:vminitd/Sources/VminitdCore/Server+GRPC.swift:105-110): the handler is the layer that ends the error, so it is the one log, not a second [EC §11]. async-http-client, hummingbird, vapor, SwiftPM, grpc-swift-2 have 0 log-then-throw catches. The grep (K8) cannot see the boundary, so it is a review list. |
| C6 | [TU] E6 grep (`precondition|fatalError(|assert(` minus `invariant:`) vs corpus: 683 hits in containerization, 1,136 in swift-nio, and 0 adoption of the `// invariant:` marker. | **The policy is MUST, the grep is scoped.** Run it on changed files in boundary targets (CLI, parser, decoder, router, middleware), not as a whole-tree gate. The marker is a new program convention (0 adoption) that only the grep reads. |
| C7 | Counts differ: [shape] `try?` 2,231 vs [EC] 2,784; [shape] Axis 5 vs the brief's "Axis 4" for errors; argument-parser `swift-format-ignore` 25 ([TU], two `Never*` rules) vs 42 (all rules, [CN R11]). | Different exclusions and denominators, not disagreement. Rules cite the sub-artifact's own measurement; the audit figures are trend only. The errors axis is **Axis 5** of [shape]. |
| C8 | [map] conflict 1 names SwiftLint `custom_rules` as the optional vehicle for banned-pattern greps; both dives found the static SwiftLint 0.65.1 binary skips `custom_rules` ("requires SourceKit and SourceKit access is prohibited", rc stays 0). | **The greps are the checks.** A `custom_rules` mirror is `unverified: not runnable here` and would be a false green if added without a planted-violation run (see Open questions, round 2 item 1). |
| C9 | [EC] SW-ERR-01..16 and [TU] E1..E12 both claim `SW-ERR` numbers. | Renumbered to one sequence below; "Traceability" maps every source rule. |
| C10 | [TU] G7 (`grep -rL ... -e '"NeverForceUnwrap" *: *true'`) is the config-wiring check. | **Prerequisite added.** With no `.swift-format` at all the three greps print nothing, a false green [CN R10]; the check now starts with `test -f .swift-format`. |

## The ruleset

Conventions. A grep check's **output is the violation; empty output is a pass** (grep rc 1). Before trusting an empty result, confirm the operand holds Swift files: `find Sources -name '*.swift' | head -1` must print a path (empty-output semantics, SW-CORE). Long commands are in "Check library" below and cited as `K1..K9`, `G1`, `G4`, `G6`, `G7` (source-dive names, unchanged) and `N1..N3` (new, this consolidation). "Red" says whether the check was watched going red on a planted violation and staying green on a compliant twin: **yes** names where; every `Verification runs` row is in [EC] or [TU]; `[CN Rn]` rows are in the table at the end of this section. Fixture roots: `F-EC` = `/home/mherwig/.cache/research-lang/swift-tools/fixtures/error-contracts`, `F-TU` = `.../fixtures/traps-and-unwraps`, `F-CN` = `.../fixtures/errors-consolidation`.

### A. The compiler catches it (typed-throws mechanics)

**SW-ERR-01 (SHOULD, Swift 6.0).** Inside a `throws(E)` function, annotate every throwing closure (`{ x throws(E) in ... }`), use `do throws(E) { }` or `Result(catching: fn)`, and forward closure errors with `func f<T, E: Error>(_ body: () throws(E) -> T) throws(E) -> T`, not `rethrows`; write a loop for stdlib APIs that still erase.
- Why: closure error inference does not exist on 6.4 or 6.3.3, `rethrows` erases a typed closure error, and on 6.4 `reduce`, `forEach`, `sorted(by:)`, `contains(where:)`, `compactMap`, `flatMap` and 9 more erase; only `map`, `filter`, `mapValues`, `Optional.map`, `Dictionary(grouping:)` and `withoutActuallyEscaping` forward (6.3.3: `map`, `Optional.map`, `withoutActuallyEscaping`) [EC §3, §5]. With `E == Never` the call needs no `try`.
- Check: `swiftc -typecheck -swift-version 6 <file>` (any language mode) fails with `thrown expression type 'any Error' cannot be converted to error type 'E'` or `cannot convert value of type 'any Error' to specified type 'E'`.
- Red: **yes**, [EC V2] 10 red / 15 green probes; re-run [CN R1] c01 c05 c08 c20 red, c03 c07 c21 green on 6.4 and 6.3.3.
- Binds: any code that adopts typed throws.

**SW-ERR-02 (SHOULD, Swift 6.0).** A function that creates `async let`, task-group or `Task` children, or calls `TaskLocal.withValue`, declares plain `throws`; or folds each child into `Result<T, E>` and calls `try result.get()` once. `error as! E` is allowed only in the shim shape of SW-ERR-05.
- Why: those constructs erase the error (`Task<Int, E> { }` is a hallucinated initialiser: `requires the types 'E' and 'any Error' be equivalent`); the cast is a trap if the failure ever is not `E`. Typed iteration of an `AsyncSequence` with a concrete `Failure` (SE-0421) is the one place typed errors survive [EC §4].
- Check: the compiler errors above for `async let` (c05), `withThrowingTaskGroup` (c06), `Task<Int, E>` (c08), `Task { try await typed() }` (c09); the `Result` folds compile (c07, c17, c18).
- Red: **yes**, [EC V2]; [CN R1] c05 c08 red, c07 green; [CN R2] `TaskLocal.withValue` erases (rc=1), shim compiles (rc=0), both toolchains.

**SW-ERR-03 (SHOULD, Swift 6.0 to 6.4).** Never list `FullTypedThrows` in `Package*.swift`, `.xcconfig` or `-enable-upcoming-feature`; it is not an upcoming feature on 6.4 or 6.3.3.
- Why: `.enableUpcomingFeature("FullTypedThrows")` builds rc=0 and does nothing, so an agent believes closure inference is on [EC §3].
- Check: `grep -rn --include='Package*.swift' --include='*.xcconfig' -e 'FullTypedThrows' .` (K9); or `-Xswiftc -Werror -Xswiftc StrictLanguageFeatures` turns any unrecognised feature name into an error (`'FullTypedThrows' is not a recognized upcoming feature [#StrictLanguageFeatures::UnrecognizedStrictLanguageFeatures]`).
- Red: **yes**, [EC V4]/[EC V16] (`F-EC/b-infer/ftt`: default build rc=0, strict build rc=1, grep hit at `Package.swift:6`; both toolchains). Re-run [CN R4]: K9 green rc=1 on the clean tree.

**SW-ERR-04 (CONSIDER, Swift 6.4 only).** Enable `-Werror UntypedThrows` (`.treatWarning("UntypedThrows", as: .error)`, or `@diagnose(UntypedThrows, as: warning, reason:)`, SE-0522) only in one module whose profile shows throw cost, behind a toolchain check; never package-wide.
- Why: the group sits in the off-by-default `PerformanceHints`, fires on every untyped `throws` including the public API SW-ERR-08 prescribes, and is an `unknown warning group` no-op on 6.3.3 (exit 0), so a gate that names it is silently absent on the prior line [EC §6].
- Check: `swiftc -typecheck -swift-version 6 -Werror UntypedThrows <file>` -> `error: untyped throws performs heap allocation on each 'throw' [#PerformanceHints::UntypedThrows]` on 6.4.
- Red: **yes on 6.4 only**, [EC V5]; [CN R3] 6.4 untyped rc=1 / typed rc=0; 6.3.3 both rc=0 with `warning: unknown warning group: 'UntypedThrows'` (did not go red there: group absent).

### B. swift-format `lint --strict` (force operations)

**SW-ERR-05 (MUST).** Non-test code you write or touch has no `!` force unwrap, `try!`, `as!` or `T!` declaration. Gate: `swift format lint --strict --configuration .swift-format -r Sources` with `NeverForceUnwrap` (covers `!` and `as!`), `NeverUseForceTry` and `NeverUseImplicitlyUnwrappedOptionals` set `true`. The only carve-outs are (a) a static-literal initialiser or compile-proven value and (b) the one provable shim `do { return try erasingAPI(...) } catch { throw error as! E }` (SW-ERR-02), each with `// swift-format-ignore: <Rule>` and a comment stating the invariant adjacent to it; prefer a regex literal (`/^[a-z]+$/`) over `try! NSRegularExpression(pattern:)`.
- Why: a trap on a value the compiler could not prove is a remote crash when the value came from a peer; the corpus has 3,364 `!`, 620 `try!`, 378 `as!` and 209 IUO in production code [shape Axis 4]; the rules are off by default and lint-only, and `swift format lint` without `--strict` exits 0 even with findings (12/12 runs) [map conflict 2].
- Check: the command above (rc 1 on a finding; rc 0 without `--strict`). Config: `"rules": { "NeverForceUnwrap": true, "NeverUseForceTry": true, "NeverUseImplicitlyUnwrappedOptionals": true }`. Cheap fallback (G1): `grep -rn --include='*.swift' -e 'try!' -e ' as! ' Sources`. If SwiftLint is already the linter: `opt_in_rules: [force_unwrapping]` and `force_unwrapping: {severity: error}`, then `swiftlint lint --strict --quiet Sources` (rc 2); `force_cast`/`force_try` are on at severity error by default; `force_unwrapping` silently ignores `URL(string: "literal")!` and four sibling literal initialisers.
- Reason check (reading heuristic; neither tool checks that a reason exists): `grep -rn -B1 -A1 --include='*.swift' -e 'swift-format-ignore: Never' -e 'swiftlint:disable:next force_' Sources`, then confirm an adjacent line states why it cannot fail. Counter-example: swift-argument-parser@efd239f0055b:Sources/ArgumentParser/Parsing/SplitArguments.swift:331 ("I don't know why this is safe").
- Red: **yes**, [TU] `lint.sh`: swift-format `--strict` red rc=1 / green rc=0 / non-strict red rc=0; SwiftLint red rc=2 / green rc=0; re-run identical [CN R5]; SwiftLint severity override [CN R7]. G1 [TU checks.sh]: `cred` 3 lines, `cgreen` 0.
- Binds: library, SDK, CLI, server, Apple app (swift-format skips `@IBOutlet` IUOs, read only); test code is exempt, see SW-ERR-07. Floor: the three rules exist in the bundled swift-format of 6.3.3 and 6.4 (measured).

**SW-ERR-06 (MUST).** The config file that enables the three rules is the file the gate command reads.
- Why: containerization enables them in `.swift-format` but lints with `.swift-format-nolint`, where all three are `false` (apple/containerization@3e7bc39e66b3:Makefile:505, `.swift-format-nolint:35-37`); with its own `.swift-format` its Sources have 57 `NeverForceUnwrap`, 5 `NeverUseForceTry`, 1 IUO finding [TU §6]. 18 of 24 corpus `.swift-format` files keep the rules off [shape].
- Check (G7, three greps, output lists each non-enabling config) plus `test -f .swift-format` (without a config the greps print nothing: false green [CN R10]); then read the gate command (Makefile/CI) and confirm it passes the listed-clean file.
- Red: **yes**, [TU] G7: `cfg/red` 3 lines, `cfg/green` 0, containerization 3 (`.swift-format-nolint`), swift-argument-parser 0; [CN R10] absent-config false green and `off`/`on` twins.
- Binds: any package with a swift-format gate. Overlaps SW-GATE (gate wiring); keep the rule here for the three `Never*` names and cross-reference.

**SW-ERR-07 (SHOULD).** Test code uses `try #require(x)` (Swift Testing) or `try XCTUnwrap(x)`, not `!`; `try!` only for literal fixtures.
- Why: swift-format exempts any file that imports `XCTest` or `Testing` (and any `@Test` function) and SwiftLint exempts nothing without a nested config, but a `!` on nil inside a Swift Testing test crashes the process ("Program crashed: Illegal instruction") and the final run summary is never printed, while `#require` records one issue and the run finishes [TU §7].
- Check: `grep -rn --include='*.swift' -e 'try!' -e ' as! ' Tests` as a review list (not a gate).
- Red: **yes** for the behaviour, [TU] `unwraptest.sh` (`#require` on nil rc=1 with summary; `!` on nil crash, no summary; both toolchains); the grep is an inventory, not run on a real Tests tree.
- Binds: test code. Caveat: a production file that merely imports `Testing` is also exempt from the swift-format rule (fixture `Helpers/Helper.swift`).

### C. grep with a directory operand

**SW-ERR-08 (MUST, Swift 6.0).** A `public` or `open` function, initialiser or accessor declares `throws`, never `throws(ConcreteType)`; concrete typed throws is allowed only in internal/package/fileprivate code, in registered closed domains (a `@frozen` struct over a fixed set such as `Errno`, or a decoder's fixed failure list) and in Embedded targets.
- Why: with a typed signature the next failure mode has nowhere to go but a wider type, which breaks every consumer; planted: typed widen rc=1 (`type 'ReadError' has no member 'missing'`), untyped twin rc=0 [EC §2]. SE-0413: "untyped throws is better for most scenarios".
- Check (K6): `grep -rPzo --include='*.swift' -e 'public[^{};]*throws\((?![A-Z]\))(?!Failure\))[A-Z][A-Za-z]*\)' Sources`; append one `(?!Name\))` lookahead per registered closed-domain type. Limit: misses members of a `public extension`.
- Red: **yes**, [EC V13] (red rc=0 with the single-line and the multi-line `public init(` hits, green rc=1); compile evidence [EC V1]; re-run [CN R4].
- Binds: library and SDK public API. CLI/server/app targets have no public consumers. Embedded exception rests on SE-0413 text and is not exercised here.

**SW-ERR-09 (MUST).** Never branch on error text: match on the type or a `code` (`(error as? XError)?.isCode(.interrupted)`), never `.contains`/`.hasPrefix`/`==` on `String(describing: error)` or `localizedDescription`.
- Why: wording is not a contract and nothing type-checks it; apple/container matches `"XPC connection error"` (container@f70ecbb926d9:Sources/ContainerCommands/Application.swift:135-136) although the producer already sets `code = .interrupted` (Sources/ContainerXPC/XPCClient.swift:143-150); same in tuist (tuist@2f6ac74754bf:cli/Sources/tuist/TuistCommand.swift:284, cli/Sources/TuistCore/Simulator/SimulatorController.swift:414). Corpus: 9 hits, 3 true control flow [EC §10].
- Check (K4); the assignment form `errorX: String = String(describing: ` is a review trigger, the `.contains(` forms are near-certain.
- Red: **yes**, [EC V11] (red rc=0 two hits, green rc=1); re-run [CN R4].
- Binds: all code. Sibling: Rust ERR-13 (derive the exit code from structure, never from `Display` text).

**SW-ERR-10 (MUST).** No empty `catch`; a `catch` that discards on purpose carries its reason inside the braces (`catch { /* swallow-ok: best-effort temp cleanup */ }`).
- Why: 122 empty catches in the corpus, IceCubesApp alone 55 (IceCubesApp@2ad6e6891258:Packages/Timeline/Sources/Timeline/actors/TimelineCache.swift:59, `:69`, `} catch {}` around cache writes); swift-testing documents its one intent in the body (swift-testing@c7d68ca20cd7:Sources/Testing/Issues/Issue+Recording.swift:274).
- Check (K1, multi-line aware) and SwiftLint opt-in `no_empty_block` (`only_rules: [no_empty_block]`, `swiftlint lint --strict --config .swiftlint.yml Sources`); both treat a comment in the body as non-empty. False-positive class: lint-rule example strings (SwiftLint's own 31).
- Red: **yes**, [EC V7] K1 red rc=0 / green rc=1; [EC V10] `no_empty_block` red rc=2 (`Store.swift:6:41`, `:12:17`) / green rc=0; re-run K1 [CN R4].
- Binds: all code. swift-format has no equivalent rule.

**SW-ERR-11 (MUST).** No `try?` on a `write`, `removeItem`, `moveItem`, `copyItem`, `createDirectory` or `decode` call without `try? /* swallow-ok: <reason> */ call(...)`; best-effort cleanup (`defer { try? FileManager.default.removeItem(...) }`) carries the same marker.
- Why: `try? data.write(to: URL(fileURLWithPath: "/dev/full"))` then `print("saved 7 bytes")` exits 0 with no compiler warning; the propagating twin prints the ENOSPC error and exits 1 [EC §9]. Corpus K3: 284 production hits (136 `removeItem`, 38 of those `defer`-adjacent), containerization 63 (e.g. apple/containerization@3e7bc39e66b3:Sources/Containerization/UnixSocketRelay.swift:84).
- Check (K3): the six `try\? [^/]*\.<call>\(` patterns; `[^/]*` is what makes a `/* swallow-ok */` comment invisible. Limit: misses a `/` before the method name.
- Red: **yes**, [EC V6] runtime (red `saved 7 bytes` exit 0; green exit 1, both toolchains) and [EC V9] grep (red rc=0 three hits, green rc=1 with marker-bearing and read-only `try? Data(contentsOf:)` untouched); re-run [CN R4].
- Binds: all code; the marker is a program convention with 0 corpus adoption, read only by this grep.

**SW-ERR-12 (SHOULD).** Chain a cause with `cause: error`; never `throw X("failed: \(error)")`.
- Why: stringifying drops the type, the code and any `LocalizedError` chain; only ~75 of 973 corpus error types (7.7%) keep a cause [shape Axis 5].
- Check (K7), single-line only: `grep -rnE --include='*.swift' -e 'throw .*\\\(error\)' -e 'throw .*\\\(err\)' -e 'throw .*\\\(e\)' Sources`.
- Red: **yes**, [EC V14] (red `Api.swift:22`, `:27`; green rc=1); re-run [CN R4].
- Binds: all code; mirrors Rust ERR-04. SHOULD because the grep sees only the one-line form.

**SW-ERR-13 (SHOULD).** Exactly one layer logs an error: the layer that ends it (entry point, request/RPC handler that converts the error into a response, a loop that continues after a failure). Every other layer adds context (`cause:`) and throws; a function never logs an error it also throws; libraries log at `info` or below. A log-only or drop-only `catch` is allowed only at that ending layer (in app targets, the last handler before the UI).
- Why: logging at three layers printed 3 lines for one failure, one layer printed 1 with the full chain [EC §11]; swift-log: "Libraries should use info level or less severe" (swift-log@4038b6a4f74a:Sources/Logging/Docs.docc/BestPractices/001-ChoosingLogLevels.md:41). The legitimate exception is the RPC handler translating to a status (containerization 27 sites, Server+GRPC.swift:105-110). Corpus log-only catches: element-x-ios 242 (element-x-ios@14e33866ced2:ElementX/Sources/Services/Keychain/KeychainController.swift:133), containerization 29, container 25 [EC §9].
- Check: K8 (log then throw in one catch) and K2 (log-only/drop-only catch) as **review lists**, plus the named reading heuristic "trace one failure and count the stderr lines".
- Red: **yes**, [EC V15] K8 red rc=0 / green rc=1; [EC V8] K2 red four hits / green rc=1; [EC V17] 3 lines vs 1; re-run K2, K8 [CN R4]. The ending-layer judgement itself is a reading heuristic.
- Binds: servers and CLIs (log once at the boundary), libraries (never log what they throw), Apple apps (UI boundary allowed).

**SW-ERR-14 (MUST).** Input from outside the process (argv, env, file, network, JSON, manifest, FFI return) is validated by throwing an error; `precondition`, `preconditionFailure`, `assert` and `fatalError` never guard it, and `assert` never validates anything.
- Why: a trap cannot be caught, kills every concurrent task and is the shape of the 2026 advisories: swift-nio CVE-2026-43678 (WebSocket length `Int(_:)` trapped before `maxFrameSize`), Hummingbird CVE-2026-97697 (`5...2` built from a `Range:` header aborts the process) [TU §3]. `assert` is removed in `-O`: `dred assert 70000` exits 0 and prints `listening on 70000` [TU §2]. TSPL: assertions and preconditions "aren't used for recoverable or expected errors".
- Check (G4), run on changed files in boundary targets (CLI, parser, decoder, router, middleware): `grep -rn --include='*.swift' -e 'precondition' -e 'fatalError(' -e 'assert(' Sources | grep -v -e 'invariant:'`; every remaining line is a finding. Plus the exit-64 test of SW-ERR-17.
- Red: **yes**, [TU] G4: `dred` 4 lines, `dgreen` 0 (annotated precondition); runtime `dred precondition 70000` rc=132 vs `dgreen x 70000` rc=64, re-run [CN R6]. Whole-tree noise is large (C6), so the grep is an inventory at PR scope.
- Binds: server, CLI, parsers, any library parsing untrusted bytes, Apple apps for decoded data. Integer-conversion companions (S1, S3) are in "Carried to SW-SEC".

**SW-ERR-15 (SHOULD).** `fatalError("...")` marks a state the module established as unreachable; `precondition` is reserved for a documented caller contract and carries `// invariant: <why>` or a `- Precondition:` doc line, and a public API that traps on an argument offers a non-trapping sibling (`get*` returning `nil`, a `throws` overload) wherever the argument can be external.
- Why: `fatalError` is the only primitive kept in all of `-Onone`, `-O` and `-Ounchecked` (`precondition` under `-Ounchecked` prints `listening on 70000`); SwiftPM review asked for `fatalError` over `preconditionFailure` (swift-package-manager PR 10497, merged 2026-10-05 with `fatalError`); swift-nio documented that `set*(at:)` traps by design unlike `get*` after a report was closed as working-as-intended (swift-nio commit 53ac1ccab23f) [TU §2, §3, §8].
- Check: G4 (unannotated hits) plus the named reading heuristic "every `public` function containing `precondition(` has a `- Precondition:` line in its doc comment" (no automated check for the doc line).
- Red: **partly**: G4 and the `-Ounchecked` behaviour yes ([TU] `dred`/`dgreen`); the doc-line half is a reading heuristic only, because no tool inspects doc comments for it.
- Binds: library primitives (documented traps allowed), servers/CLIs (invariants only).

**SW-ERR-16 (MUST).** Never compile with `-Ounchecked`.
- Why: it removes every `precondition`, makes `Int.max - 2 + 70000` print `-9223372036854705811`, `Int(2^63)` print `-9223372036854775808`, and out-of-range indexing segfault (139) [TU §2]; 0 of 40 exemplars use it.
- Check (G6): `grep -rn --include='Package*.swift' --include='*.yml' --include='*.yaml' --include='*.sh' --include='*.bzl' --include='BUILD.bazel' --include='*.bazelrc' -e 'Ounchecked' .`
- Red: **yes**, [TU] G6: `flags/red` 2 lines (`Package.swift` `unsafeFlags` and `ci.yml`), `flags/green` 0; the behaviour table [TU §2].
- Binds: all manifests, CI and scripts.

### D. Run the binary or the test

**SW-ERR-17 (MUST, Unix measured).** A CLI maps bad invocation to a thrown typed error (ArgumentParser `ValidationError` prints `Error: ...` plus usage and exits 64 on Unix; `ExitCode(n)` exits silently with `n`) and bad data to exit 65; a trap (132 SIGILL, 134 SIGABRT, 139 SIGSEGV on x86_64 Linux) is never a documented status. An integration test runs the built binary with the bad input and asserts the exit code, empty stdout and an `error:` line on stderr with no `Fatal error`.
- Why: `precondition` on a bad `--port` exits 132 with empty stderr in `-O` (a 47-line backtrace by default on Linux) and loses buffered stdout; the throwing twin exits 64 with `error: port out of range: 70000 (expected 1...65535)` [TU §1, §9]. The fleet contract assigns 64/65 and reserves 128+n for forwarded child signals (`rules/rust-quality/cli-contract.md`).
- Check: `.build/debug/<cli> --port 70000; echo "exit=$?"` expects `exit=64` (a test, not a grep).
- Red: **yes**, [TU] `dred` 132 vs `dgreen` 64 (6.3.3 and 6.4); [EC V18] `validation` rc=64, `exit3` rc=3; re-run [CN R6]. Windows (`ERROR_BAD_ARGUMENTS`) and WASI (`EXIT_FAILURE`) differ (swift-argument-parser@efd239f0055b:Sources/ArgumentParser/Utilities/Platform.swift:155-162): `unverified: read only`. The full exit-code table and reserved codes belong to SW-CLI (M-F-02, M-F-11).
- Binds: CLI. SDK: map the child's exit code to a `Code`, never to text.

**SW-ERR-18 (SHOULD).** No Foundation error dump reaches a person: stderr of a failing run contains no `Error Domain=`. Wrap a Foundation-thrown error (`CocoaError`, `POSIXError`, `URLError`) at the catch site with operation and path context, keep it as `cause`, and render a foreign Foundation cause with `localizedDescription` (never interpolation); render own errors with their description.
- Why: a raw `Data(contentsOf:)` failure through ArgumentParser prints `Error: Error Domain=NSCocoaErrorDomain Code=260 "The file doesn’t exist."UserInfo={...}` (6.4 and 6.3.3) [CN R8]; the readable text is `localizedDescription`: `The operation could not be completed. The file doesn’t exist.` Apple-platform wording differs: `unverified: read only`.
- Check (N3): `"$BIN" <failing-case> 2>&1 >/dev/null | grep -c 'Error Domain='` must print `0`.
- Red: **yes** [CN R8]: `cocoa-raw`, `posix-raw` and the template-v1 `wrapped` case print 1 dump line; `wrapped-localized`, `v2-cocoa`, `v2-chain`, `v2-third` print 0 (6.4, and 6.3.3 for `cocoa-raw`/`v2-cocoa`/`v2-chain`).
- Binds: CLI (stderr), SDK (error text surfaced to callers), servers (log text). Test it per failure path the CLI documents.

**SW-ERR-19 (SHOULD, Swift 6.2).** A documented trap and a documented throw are each covered by a test: throw `#expect(throws: E.case) { try f(bad) }`; trap `await #expect(processExitsWith: .failure) { _ = f(bad) }` (Swift Testing exit tests, ST-0008; XCTest has no equivalent).
- Why: "you cannot test a trap" is pre-6.2 knowledge; the exit test passed against the trapping function and went red when pointed at the throwing one [TU §7].
- Check: `grep -rn --include='*.swift' -e 'processExitsWith' Tests` is non-empty for every module that documents a `- Precondition:` (named reading heuristic: documented traps count equals exit tests).
- Red: **yes** for the mechanism, [TU] `exittest.sh` (green rc=0, red control rc=1: `expected exit status ".failure", but ".exitCode(EXIT_SUCCESS)" was reported instead`, both toolchains); the count heuristic is reading only.
- Binds: test code of libraries with documented preconditions.

### E. Shape and text (check plus reading heuristic)

**SW-ERR-20 (MUST for library/SDK public API, SHOULD elsewhere).** The public error domain is one `struct XError: Error, Sendable` with an open `struct Code: RawRepresentable, Hashable, Sendable` (static members), a one-sentence `message` (no `Error:` prefix, no trailing period) and `cause: (any Error)?`; a new failure is a new `Code`. A public `enum` error exists only as `@nonexhaustive` from its first release, or as a `@frozen` registered closed domain. The public API stays untyped `throws` and documents the type it throws.
- Why: a new case on a public error enum breaks every exhaustive consumer, typed or not (`F/a/untyped-v2-newcase` rc=1); a struct cannot be switched exhaustively (`struct-v2` rc=0); adding `@nonexhaustive` later is itself source-breaking; `@nonexhaustive` is SE-0487, implemented in Swift 6.2.3 (a consumer on 6.2.0 to 6.2.2 cannot parse it), so the struct is the floor-safe default [EC §7]. Precedent: apple/containerization@3e7bc39e66b3:Sources/ContainerizationError/ContainerizationError.swift:23-29 (struct), `:94` (`Code` struct over a private enum). For an SDK wrapping a CLI, `Code` keyed on the CLI exit code can represent a code the SDK does not know yet, which an enum cannot (design implication, not run).
- Check (N1): the perl scan below prints each `public enum ... : Error` lacking `@nonexhaustive`/`@frozen`.
- Red: **yes** [CN R9]: red tree 2 lines (`LoadError`, `ParseFailure` with an intervening `@available`), green tree 0 (`@nonexhaustive`, `@frozen`, struct, internal enum, non-Error enum untouched); both plants typecheck rc=0 on 6.4 and 6.3.3. Compile evidence [EC V1c, V1d].
- Template (verified, `swift test -Xswiftc -warnings-as-errors` rc=0 on both toolchains [EC V20], rendering fixed by [CN R8]):

```swift
public struct ToolError: Error, Sendable, CustomStringConvertible, LocalizedError {
    public struct Code: RawRepresentable, Hashable, Sendable {
        public let rawValue: String
        public init(rawValue: String) { self.rawValue = rawValue }
        public static let notFound = Code(rawValue: "notFound")
        public static let io = Code(rawValue: "io")
    }
    public var code: Code
    public var message: String
    public var cause: (any Error)?
    public init(_ code: Code, _ message: String, cause: (any Error)? = nil) { /* assign */ }
    public var description: String { cause.map { "\(message): \(render($0))" } ?? message }
    public var errorDescription: String? { description }
}
func render(_ e: any Error) -> String {            // outermost context first, root cause last
    if let l = e as? LocalizedError, let d = l.errorDescription { return d }
    if e is CocoaError || e is URLError || e is POSIXError { return e.localizedDescription }
    return String(describing: e)
}
```
  `render` replaces [EC]'s `"\(message): \($0)"` (which dumped Foundation causes); [CN R8] cases `v2-cocoa`, `v2-chain` (`bad reference: cannot pull: no such image`), `v2-third` and a structural-cause assertion (`v2-keeps-cause`) pass on 6.4 and 6.3.3.
- Binds: library and SDK (MUST); CLI, server, app-internal enums are fine (C4). Closed-domain exception: swift-system's `@frozen public struct Errno` (swift-system@486d48c80fce:Sources/System/Errno.swift:12-14).

**SW-ERR-21 (SHOULD).** Every error type has a description a person can read: `CustomStringConvertible` always, plus `LocalizedError` returning the same text (`errorDescription = description`) when Foundation or an Apple UI may read it. `localizedDescription` on an own or third-party plain `Error` is never used for text (it prints `The operation could not be completed. (main.D error 1.)`); on a Foundation-thrown error it is the readable choice (SW-ERR-18).
- Why: ArgumentParser prints `Error: <errorDescription, else String(describing:)>`: a bare `enum` prints `Error: missing`, an opaque struct a type dump (`Error: OpaqueError(op: "write", path: "/data/x", underlying: App.BareError.unreadable)`), a `LocalizedError` with only `failureReason` prints `Error: ReasonOnly()`; only the "both conformances" shape prints one sentence through ArgumentParser, swift-log interpolation, Swift Testing output and `localizedDescription` [EC §8]. Since Swift 6.3, `DecodingError`/`EncodingError` print readably (SE-0489).
- Check (N2): the perl scan below prints each `struct|enum|class|actor` conforming to `Error` with no `CustomStringConvertible`/`LocalizedError` header or extension in the scanned files; plus K5 (`grep -rn --include='*.swift' -e 'localizedDescription' Sources`) as a review list (every hit must be a `LocalizedError`-conforming own type or a Foundation-domain error; UI layers allow-listed with `--exclude-dir=UI`).
- Red: **yes** [CN R9]: red tree 2 lines (bare enum, opaque struct), green tree 0 (header conformances and an `extension X: CustomStringConvertible, LocalizedError`), both typecheck rc=0 on 6.4 and 6.3.3; K5 red rc=0 / green rc=1 [EC V12]; the ArgumentParser behaviours [EC V18, V19].
- Binds: CLI MUST in practice (stderr text), library/SDK public errors, servers. Cross-file extensions are a false positive of N2 (it scans only the files passed).

### Check library (verbatim)

```sh
# K1 empty catch, any layout (output = violation)
grep -rEzo --include='*.swift' -e 'catch[[:space:]]*(let [A-Za-z_]+[[:space:]]*)?\{[[:space:]]*\}' Sources

# K2 log-only or drop-only catch (review list)
grep -rEzo --include='*.swift' \
  -e 'catch[[:space:]]*(let [A-Za-z_]+[[:space:]]*)?\{[[:space:]]*print\([^{}]*\)[[:space:]]*\}' \
  -e 'catch[[:space:]]*(let [A-Za-z_]+[[:space:]]*)?\{[[:space:]]*debugPrint\([^{}]*\)[[:space:]]*\}' \
  -e 'catch[[:space:]]*(let [A-Za-z_]+[[:space:]]*)?\{[[:space:]]*NSLog\([^{}]*\)[[:space:]]*\}' \
  -e 'catch[[:space:]]*(let [A-Za-z_]+[[:space:]]*)?\{[[:space:]]*log(ger)?\.[a-z]+\([^{}]*\)[[:space:]]*\}' \
  -e 'catch[[:space:]]*(let [A-Za-z_]+[[:space:]]*)?\{[[:space:]]*return( nil)?[[:space:]]*\}' \
  -e 'catch[[:space:]]*(let [A-Za-z_]+[[:space:]]*)?\{[[:space:]]*continue[[:space:]]*\}' Sources

# K3 try? on a mutating or decoding call
grep -rnE --include='*.swift' -e 'try\? [^/]*\.write\(' -e 'try\? [^/]*\.removeItem\(' -e 'try\? [^/]*\.moveItem\(' \
  -e 'try\? [^/]*\.copyItem\(' -e 'try\? [^/]*\.createDirectory\(' -e 'try\? [^/]*\.decode\(' Sources

# K4 control flow by matching error text
grep -rnE --include='*.swift' -e '[eE]rror[A-Za-z]*(: String)? = String\(describing: ' -e 'localizedDescription\.contains\(' \
  -e 'localizedDescription\.hasPrefix\(' -e 'localizedDescription\.hasSuffix\(' -e 'localizedDescription ==' \
  -e 'String\(describing: [A-Za-z.]*[eE]rr[A-Za-z]*\)\.contains\(' -e 'String\(describing: [A-Za-z.]*[eE]rr[A-Za-z]*\)\.hasPrefix\(' Sources

# K5 localizedDescription (review list)
grep -rn --include='*.swift' -e 'localizedDescription' Sources

# K6 public API with a concrete typed throws (multi-line signatures included)
grep -rPzo --include='*.swift' -e 'public[^{};]*throws\((?![A-Z]\))(?!Failure\))[A-Z][A-Za-z]*\)' Sources

# K7 error text interpolated into a new error (cause lost)
grep -rnE --include='*.swift' -e 'throw .*\\\(error\)' -e 'throw .*\\\(err\)' -e 'throw .*\\\(e\)' Sources

# K8 log then throw in one catch (review list)
grep -rPzo --include='*.swift' -e 'catch[^{}]*\{[^{}]*\blog(ger)?\.[a-z]+\([^{}]*\)[^{}]*throw ' Sources

# K9 FullTypedThrows token
grep -rn --include='Package*.swift' --include='*.xcconfig' -e 'FullTypedThrows' .

# G1 force try / force cast fallback;  G4 trap-as-validation (scope to changed boundary files)
grep -rn --include='*.swift' -e 'try!' -e ' as! ' Sources
grep -rn --include='*.swift' -e 'precondition' -e 'fatalError(' -e 'assert(' Sources | grep -v -e 'invariant:'

# G6 -Ounchecked
grep -rn --include='Package*.swift' --include='*.yml' --include='*.yaml' --include='*.sh' --include='*.bzl' \
  --include='BUILD.bazel' --include='*.bazelrc' -e 'Ounchecked' .

# G7 gate config enables the three rules (output = each config that does NOT); prerequisite: the config exists
test -f .swift-format || echo "MISSING .swift-format"
for r in NeverForceUnwrap NeverUseForceTry NeverUseImplicitlyUnwrappedOptionals; do
  grep -rL --include='.swift-format*' -e "\"$r\" *: *true" .
done

# N1 public error enums without @nonexhaustive / @frozen (output = violation)
find Sources -name '*.swift' -print0 | xargs -0 -r perl -0777 -ne \
  'while (/((?:\@\w+(?:\([^)]*\))?\s+)*)public\s+enum\s+(\w+)[^{]*?:[^{]*\bError\b/g) { print "$ARGV: public enum $2 lacks \@nonexhaustive/\@frozen\n" unless $1 =~ /nonexhaustive|frozen/ }'

# N3 no Foundation dump on stderr (must print 0)
"$BIN" <failing-case> 2>&1 >/dev/null | grep -c 'Error Domain='
```

```perl
# N2: usage  find Sources -name '*.swift' -print0 | xargs -0 -r perl check.pl   (output = violation)
my %src; for my $f (@ARGV) { open my $h, '<', $f or next; local $/; $src{$f} = <$h>; }
my $all = join "\n", values %src;
for my $f (sort keys %src) {
  while ($src{$f} =~ /\b(?:struct|enum|class|actor)\s+(\w+)[^{]*?:([^{]*)\{/g) {
    my ($n, $conf) = ($1, $2);
    next unless $conf =~ /\bError\b/;
    next if $conf =~ /CustomStringConvertible|LocalizedError/;
    next if $all =~ /extension\s+\Q$n\E\s*:[^{]*(CustomStringConvertible|LocalizedError)/;
    print "$f: error type $n has no description conformance\n";
  }
}
```

### Traceability (source rule to final ID)

[EC] SW-ERR-01 -> 08; 02, 03 -> 01; 04 -> 03; 05 -> 02; 06 -> 04; 07 -> 20; 08 -> 12; 09 -> 21; 10 -> 21 (narrowed) and 18; 11 -> 17; 12 -> 09; 13 -> 10 (empty) and 13 (log-only); 14 -> 11; 15 -> 13; 16 -> 13. [TU] E1 -> 05; E2 -> 06; E3, E4 -> 05 (clauses); E5 -> 07; E6, E7 -> 14; E8, E12 -> 15; E9 -> 16; E10 -> 17; E11 -> 19; S1-S6 -> Carried to SW-SEC.

### Carried to SW-SEC (not numbered here; full text, commands and fixture runs in [TU] "security.md (SW-SEC)")

- **S1** convert untrusted integers with `T(exactly:)` and throw on `nil`, or compare to the limit before any `T(_:)`; `Int(UInt64 >= 2^63)` exits 132 (`ared 8000000000000000`), the `exactly:` twin exits 65 (CVE-2026-43678). Review grep on changed files, name-based.
- **S2** guard `Int(_ double:)` and `lower...upper` built from untrusted bounds (`lower <= upper` first; CVE-2026-97697; `range-trap` 132, `range-safe` 0). Reading heuristic.
- **S3** `truncatingIfNeeded` only with `// truncate-ok: <why>` (release build wrote 64 bytes into a 16-byte allocation, exit 0; ASan exit 1; CVE-2026-43671). Grep `G2`.
- **S4** overflow-aware arithmetic on untrusted values; `&+ &- &*` carry `// wrap-ok:` (stdlib `+` traps in `-O`, wraps only with `&+` or `-Ounchecked`). Grep `G5`.
- **S5** convert and bound before using a size: the conversion runs before the configured limit check. Reading heuristic.
- **S6** code combining unsafe pointers with an externally derived size has a test under `swift test --sanitize=address`. Run: `asan.sh`.
- Cross-reference both ways (one line each): SW-ERR-14 "external integers: see SW-SEC conversion rules"; SW-SEC "a thrown error, not a trap, at the parser boundary: SW-ERR-14".

### Consolidator re-runs and new checks (all under `F-CN` unless stated; 6.4 = `run.sh`, 6.3.3 = `SWIFT_VERSION=6.3 run.sh`)

| ID | What | Command and result |
|---|---|---|
| R1 | typed-throws probes re-run, both toolchains | `run.sh swiftc -typecheck -swift-version 6 <F-EC>/b-infer/cases/<cNN>.swift`: c01 rc=1 `cannot convert value of type 'any Error' to specified type 'E'`; c03 rc=0; c05 rc=1 `thrown expression type 'any Error' cannot be converted to error type 'E'`; c07 rc=0; c08 rc=1 `referencing initializer 'init(name:priority:operation:)' on 'Task' requires the types 'E' and 'any Error' be equivalent`; c20 rc=1; c21 rc=0 (identical on 6.4 and 6.3.3) |
| R2 | `TaskLocal.withValue` erases; the cast shim | `run.sh swiftc -typecheck -swift-version 6 tl/erase.swift` rc=1 `thrown expression type 'any Error' cannot be converted to error type 'E'`; `tl/shim.swift` (`do { return try Ctx.$v.withValue(1, operation: op) } catch { throw error as! E }`) rc=0; 6.4 and 6.3.3 |
| R3 | UntypedThrows | `run.sh swiftc -typecheck -swift-version 6 -Werror UntypedThrows <F-EC>/b-infer/perf/{untyped,typed}.swift`: 6.4 rc=1 `untyped throws performs heap allocation on each 'throw' [#PerformanceHints::UntypedThrows]` / rc=0; 6.3.3 both rc=0 `unknown warning group: 'UntypedThrows' [#UnknownWarningGroup]` |
| R4 | K1-K8 on `<F-EC>/c-grep/{red,green}` | `bash check.sh|check2.sh|check3.sh <red|green>`: every K1-K8 red rc=0 with the hits listed in [EC V7-V15], every green rc=1; K9 green rc=1 (red token at `F-EC/b-infer/ftt` not re-planted) |
| R5 | force-operation lints | `run.sh bash <F-TU>/lint.sh`: swift-format `--strict` red 1 / green 0 / tests 0 / carve 1, non-strict red 0; SwiftLint red 2 / green 0 / tests 0 / carve 2; and `<F-TU>/checks.sh`: G1 `cred` 3, G2 `bred` 3, G4 `dred` 4 / `dgreen` 0, G6 `flags/red` 2 / green 0, G7 `cfg/red` 3 / `cfg/green` 0, containerization 3, swift-argument-parser 0 |
| R6 | trap vs throw exit codes (release binaries from [TU], `-O`) | `ared 8000000000000000` exit 132; `ared 7fffffffffffffff` 0; `agreen 8000000000000000` 65 `error: invalidFrameLength(9223372036854775808)`; `agreen 10` 0; `dred precondition 70000` 132; `dred assert 70000` 0 `listening on 70000`; `dred fatalError 70000` 132; `dgreen x 70000` 64 `error: port out of range: 70000 (expected 1...65535)` |
| R7 | SwiftLint `force_unwrapping` severity (the unverified half of [TU] E3) | `sl/`: `run.sh swiftlint lint --quiet --config sev-error.yml red` rc=2 (`error: Force Unwrapping Violation`); `sev-default.yml red` rc=0 (warning) and rc=2 with `--strict`; every `green` rc=0 |
| R8 | Foundation error rendering | `ld/ld.swift` (6.4, 6.3.3 identical): `CocoaError` read-missing `localizedDescription` = `The operation could not be completed. The file doesn’t exist.`, `"\(e)"` = `Error Domain=NSCocoaErrorDomain Code=260 ...UserInfo={...}`; `POSIXError(.ENOENT)` same split; `URLError(.timedOut)` `localizedDescription` = `(NSURLErrorDomain error -1001.)`, interpolation `Error Domain=NSURLErrorDomain Code=-1001 "(null)"`; plain struct/enum: `localizedDescription` `(main.Plain error 1.)` / `(main.Bare error 0.)`, interpolation `Plain(n: 3)` / `missing`; `DecodingError` readable both ways. `ap/run.sh` (ArgumentParser 1.8.2): `cocoa-raw`, `posix-raw`, `wrapped` (template v1) rc=1 with `Error Domain=` on stderr; `wrapped-localized`, `v2-cocoa` (`Error: cannot load x.json: The operation could not be completed. The file doesn’t exist.`), `v2-chain` (`Error: bad reference: cannot pull: no such image`), `v2-third` (`Error: cannot start: ThirdParty(n: 3)`) rc=1 with none; `ap/domain-check.sh <case>` prints 1/1/1/0/0/0/0; `v2-keeps-cause` asserts `(e.cause as? CocoaError)?.code == .fileReadNoSuchFile` and exits 1 with the same text |
| R9 | N1 and N2 plants | `pe/check.sh red` 2 lines / `green` 0; `de/check.sh red` 2 lines / `green` 0; all four plants `run.sh swiftc -typecheck -swift-version 6` rc=0 on 6.4 and 6.3.3 (`green` of `de` needed `import Foundation` for `LocalizedError`) |
| R10 | G7 false green | `g7/none` (no config): the three greps print nothing and `test -f .swift-format` fails; `g7/off` lists `.swift-format` 3 times; `g7/on` prints nothing and the config exists |
| R11 | citation spot-checks (read only, exemplar SHAs re-read) | container Application.swift:135-136 and XPCClient.swift; IceCubesApp TimelineCache.swift:59, `:69`; tuist TuistCommand.swift:284, SimulatorController.swift:414; element-x `.swiftlint.yml:9` `- force_unwrapping`; swift-nio `.swift-format:33-35` all `false`; swift-log `.swift-format:33` `false` and the 8 `error as! Failure` sites; hummingbird FileMiddleware.swift:394-396 guard; swift-testing Issue+Recording.swift:274; containerization Makefile:501/505 and `.swift-format-nolint:35-37`; swift-argument-parser 25 `swift-format-ignore: Never*` (42 including other rules) |

## Applied to the exemplars and the future consumers

### Exemplars that already satisfy

| Rule | Exemplar | Evidence |
|---|---|---|
| 08, 20 | apple/containerization, apple/container, swift-container-plugin | 0 typed vs 1,956 / 1,120 / 75 untyped `throws`; `ContainerizationError` is struct + `Code` + `cause`, both protocols (containerization@3e7bc39e66b3:Sources/ContainerizationError/ContainerizationError.swift:23-29, `:72-90`, `:94`) [EC §1, §7] |
| 08 (closed domain) | swift-system | `@frozen public struct Errno` over `CInt` (swift-system@486d48c80fce:Sources/System/Errno.swift:12-14); `throws(Errno)` only on newer surfaces (`FileOperations.swift:455`, `:544`) while classic `FileDescriptor.open` stays untyped (`FileOperations.swift:35`) |
| 01 | swift-foundation | `Result(catching: { () throws(DecodingError) -> Data in` (swift-foundation@aadd9259be07:Sources/FoundationEssentials/Data/Data+Base64.swift:538, `:556`, `:576`) |
| 05, 06 | swift-argument-parser | rules on, `swift format lint --strict -r Sources` exits 0, 25 `swift-format-ignore: Never*` (swift-argument-parser@efd239f0055b:.swift-format; `Platform.swift:155-162` also maps validation failure to `EX_USAGE`) |
| 05 | element-x-ios, SwiftLint | 17 `!` in 98,287 production lines; `force_unwrapping` opt-in (element-x-ios@14e33866ced2:.swiftlint.yml:9; realm/SwiftLint@ec4691d9e813:.swiftlint.yml:31) |
| 10 | swift-testing | intent written inside the handler (swift-testing@c7d68ca20cd7:Sources/Testing/Issues/Issue+Recording.swift:274) |
| 14 | swift-nio (post-fix), hummingbird (post-fix) | `guard lengthQWord <= UInt64(Int.max) else { throw ... }` (swift-nio@e12881f2a691:Sources/NIOWebSocket/WebSocketFrameDecoder.swift:163-166); range guard (hummingbird@1bd3b407fb47:Sources/Hummingbird/Middleware/FileMiddleware.swift:394-396) |
| 15 | swift-nio | `- Precondition:` notes on `set*(at:)`, `get*` returns `nil` (swift-nio commit 53ac1ccab23f) |
| 16 | all 40 exemplars | 0 use `-Ounchecked` [TU §2] |
| 13 | async-http-client, hummingbird, vapor, SwiftPM, grpc-swift-2 | 0 log-then-throw catches [EC §11] |
| 05 (shim) | swift-log | 8 `throw error as! Failure` around `TaskLocal.withValue` (swift-log@4038b6a4f74a:Sources/Logging/Logger+With.swift:60) are the one allowed shape (conflict C2) |

No exemplar satisfies SW-ERR-11 fully (containerization still has 63 K3 hits) and none uses `@nonexhaustive` in production code (swift-protobuf only mentions it in a generator option, swift-protobuf@6c84c3dedac0:Sources/protoc-gen-swift/GeneratorOptions.swift:143).

### Exemplars that violate (prominent)

| Rule | Exemplar | Evidence |
|---|---|---|
| 06 | apple/containerization, apple/container | rules enabled in `.swift-format`, lint gate reads `.swift-format-nolint` with all three `false` (containerization@3e7bc39e66b3:Makefile:505, `.swift-format-nolint:35-37`; container@f70ecbb926d9:Makefile:402/406): 57/5/1 and 38/8/0 findings against their own `.swift-format` [TU §6] |
| 05 | swift-nio, swift-log, swift-crypto | `.swift-format:33-35` all `false` (swift-nio@e12881f2a691), 199 `try!`/`as!` hits; swift-log `NeverForceUnwrap` `false`; swift-crypto 101 `try!` and 130 `!` in 16,634 lines [TU §6, Exemplar evidence] |
| 09 | apple/container, tuist | container@f70ecbb926d9:Sources/ContainerCommands/Application.swift:135-136 vs ContainerXPC/XPCClient.swift:143-150; tuist@2f6ac74754bf:cli/Sources/tuist/TuistCommand.swift:284 and cli/Sources/TuistCore/Simulator/SimulatorController.swift:414 |
| 10 | IceCubesApp, swift-build, SwiftPM | 55 / 7 / 3 empty catches (IceCubesApp@2ad6e6891258:Packages/Timeline/Sources/Timeline/actors/TimelineCache.swift:59, `:69`) |
| 11 | containerization, container, tuist, element-x-ios | 63 / 32 / 27 / 17 K3 hits; 52 `try? ...removeItem(` in containerization (UnixSocketRelay.swift:84) |
| 13 | element-x-ios, containerization | 242 log-only catches (KeychainController.swift:133) and 27 log-then-throw sites; the latter are the RPC-boundary exception, the former a review list in app UI code |
| 20 | swift-crypto, tuist | `CryptoKitError` is a plain public enum (swift-crypto@1c80d3aff53f:Sources/Crypto/CryptoKitErrors.swift:20), tolerable because it mirrors Apple CryptoKit; tuist 270 error types, 261 enums, `cause` rarely kept [shape Axis 5] |
| 05 (reason) | swift-argument-parser | `swift-format-ignore: NeverForceUnwrap` followed by "I don't know why this is safe" (SplitArguments.swift:331) |
| 14 | swift-nio (pre-fix), hummingbird (pre-fix) | CVE-2026-43678 `Int(lengthQWord)` before `maxFrameSize`; CVE-2026-97697 `5...2` aborts the process [TU §3] |

### New commitments for the future consumers

- **Swift SDK wrapping `ocx` (mirrors `/home/mherwig/dev/ocx-sdk-python`):** public methods are untyped `throws` documented to throw one `OcxError` struct (SW-ERR-08, 20) whose `Code` is keyed on the CLI exit code; append-only codes mirror the Python `ExitCode` map and `_EXIT_CODE_ERRORS` (`_errors.py:28-51`, `:373-387` [cfg §4]), and an unmapped code stays representable. Retry classification reads `code`, never stderr text (SW-ERR-09). Decoding the CLI's JSON output throws, never `try?`/`try!` (SW-ERR-05, 11, 14); spawn and teardown `try?` carry `swallow-ok:`. Error text through the SDK uses `render(_:)` (SW-ERR-18, 20). The signal-killed-child mapping (128+n) is owner question Q6 [map] and belongs to SW-IO/SW-CLI.
- **Swift CLIs in the ocx/grimoire mould:** `main` throws and the framework prints once (SW-ERR-13); bad invocation is `ValidationError` -> 64 on Unix, bad data a typed error -> 65, a trap is never a status (SW-ERR-17); each documented failure path is run through the binary and checked for `Error Domain=` (SW-ERR-18); documented preconditions get exit tests (SW-ERR-19); swift-format `--strict` with the three rules on in the file the gate reads (SW-ERR-05, 06). The exit-code table, SIGPIPE and stream contract are SW-CLI.
- **OCI tooling in the containerization mould:** adopt the `ContainerizationError` shape (SW-ERR-20); do not copy containerization's own gaps: 63 `try?` mutating calls (SW-ERR-11), `.swift-format-nolint` (SW-ERR-06), and the `.contains("XPC connection error")` pattern of its sibling container (SW-ERR-09). Digest and length parsing from registries follows S1 under SW-SEC, with the throw-not-trap boundary of SW-ERR-14.

## AI-agent failure modes

Ranked by corpus frequency times blast radius. Agent failure itself is not measured [shape H7 verdict]: the counts are the human-written proxy, the order is judgement. Each row names the mechanical check.

| # | Mistake | Why it compiles or looks right | Mechanical check |
|---|---|---|---|
| 1 | `try?` on a write, remove, move, copy, create or decode "to keep going"; empty `catch {}` | zero compiler warnings; reports success on failure (`saved 7 bytes`, exit 0). 2,784 `try?`, 284 K3, 122 empty catches | K3, K1, SwiftLint `no_empty_block` (SW-ERR-10, 11) |
| 2 | Adds `!`, `try!`, `as!` or an IUO "temporarily" to silence the compiler; disables the lint rule (`"NeverForceUnwrap": false`, a `.swift-format-nolint`) instead of fixing the site; adds `swift-format-ignore` with no reason | fastest route to green; 18 of 24 corpus configs keep the rules off | `swift format lint --strict` with rules on; G7; reason grep with `-B1 -A1` (SW-ERR-05, 06) |
| 3 | Throws a bare `enum` or opaque `struct` to `main`, or lets a Foundation error reach stderr | prints `Error: missing`, a type dump, or `Error Domain=NSCocoaErrorDomain Code=260 ...` | N2, N3 (SW-ERR-18, 21) |
| 4 | Validates external input with `precondition`, `guard ... else { fatalError }` or `assert`; "fixes" a crash with `truncatingIfNeeded` | short, looks safe; `assert` is a no-op in `-O` (exit 0, `listening on 70000`) | G4 on changed boundary files; exit-64 test; S3 grep (SW-ERR-14, 17) |
| 5 | Loses the cause: `throw X("failed: \(error)")`, or a cause rendered by interpolation | compiles; only 7.7% of corpus error types keep a cause | K7; N3 (SW-ERR-12, 20) |
| 6 | `public func f() throws(MyError)` "because typed throws is the Swift 6 way" | compiles; breaks the next release | K6 (SW-ERR-08) |
| 7 | Assumes closure inference: `try xs.map { try typed($0) }`, `reduce`/`forEach`/`sorted` in a `throws(E)` function, `async let` inside `throws(E)` then `catch { throw error as! E }`, `Task<Int, MyError> { }`, `.enableUpcomingFeature("FullTypedThrows")` | reads naturally; hallucinated initialiser; flag is a silent no-op | compiler errors (SW-ERR-01, 02); K9 (SW-ERR-03) |
| 8 | Logs at every layer "for traceability"; `catch { print(error) }` | compiles; N lines per failure | K2, K8 plus trace one failure (SW-ERR-13) |
| 9 | Branches on `error.localizedDescription.contains("timeout")` or `String(describing: error).contains(...)` | compiles; wording is not a contract | K4 (SW-ERR-09) |
| 10 | `public enum FooError: Error { case a, b }` as the library error, cases added later | compiles; breaks exhaustive consumers | N1 (SW-ERR-20) |
| 11 | Reports a trap as `exit 1`/`exit(2)` in docs or tests; believes release builds wrap on overflow; uses `-Ounchecked` for speed | does not know 132/134/139; `+` traps in `-O` | exit-code integration test; G6 (SW-ERR-16, 17) |
| 12 | `!` or `XCTUnwrap` in the wrong framework inside tests; says a trap cannot be tested | XCTest habit; pre-6.2 knowledge | `grep ... Tests` list; `processExitsWith` (SW-ERR-07, 19) |
| 13 | Invents conversion APIs (`Int(safely:)`, `UInt32(clamped:)`) or `-Werror UntypedThrows` on a 6.3 CI | hallucinated; unknown warning group passes silently | `swift build` compile error; gate on `swift --version` >= 6.4 (SW-ERR-04) |

## Open questions

### Owner decisions (the program applies the default until told otherwise)

1. **Marker comments (`swallow-ok:`, `invariant:`, and SW-SEC's `truncate-ok:`/`wrap-ok:`) become program conventions.** They have 0 corpus adoption and no tool recognises them; only the greps read them. Default: adopt, document in the index.
2. **Brownfield policy for SW-ERR-05.** The rules fail an existing tree with 100s of `!`. Default: new packages enforce whole-tree zero; existing repos lint changed files only (`git diff --name-only -- '*.swift'`), never lowering the config to fit.
3. **Library error shape vs the 6.2.3 floor.** `@nonexhaustive` needs Swift 6.2.3 while [map] Q1 sets library floors at tools 6.2. Default: struct + `Code` for every published library and the SDK; an enum only with `@nonexhaustive` and a stated floor of 6.2.3.
4. **Where the closed-domain registry lives** (K6 `(?!Name\))` lookaheads). Default: the repo's own rule or `CLAUDE.md` lists them, each type also `@frozen`.
5. **`ValidationError` on Windows.** ArgumentParser exits `ERROR_BAD_ARGUMENTS` there (read only). Default: assert 64 on Unix legs only; a cross-platform CLI maps to its own `ExitCode` enum (SW-CLI decides).
6. **Test code may use `try!` for literal fixtures** and keeps `try #require` for optionals. Default: yes.

### Another research round

1. **SwiftLint `custom_rules` as the delivery vehicle (gates).** Can `custom_rules` mirrors of K1-K8 be proven on Linux by building SwiftLint from source in `swift:6.4` with a working SourceKit (`LINUX_SOURCEKIT_LIB_PATH`)? Until then no `custom_rules` row may count as watched red. Both dives hit the same wall.
2. **Foundation-error rendering helper (errors/io).** What is the smallest `render(_:)` that yields one clean sentence per failure for `CocoaError`, `POSIXError`, `URLError`, `DecodingError`, swift-nio/ArgumentParser errors and own types on Linux, and does the Apple-Foundation wording match? Needs a macOS runner for the Apple half; `URLError` currently renders `(NSURLErrorDomain error -1001.)`.
3. **Aggregate errors and chain sanitisation (errors/cli).** Rust ERR-21 (a batch over N targets reports "K of N failed") and ERR-16 (strip terminal control, `\r`, NUL, bidi from chains quoting wire-supplied names) have no Swift research: what does `withThrowingTaskGroup` give a batch, and does a Swift CLI need the same sanitiser at the one stderr boundary?
4. **`Result`'s role (M-C-07, P3) and `- Throws:` documentation (Rust ERR-22).** Is `Result` more than the typed-error carrier across task boundaries used here, and does swift-format `ValidateDocumentationComments` (off in most corpus configs) check `- Throws:`?
5. **Embedded Swift and aarch64/macOS trap codes (platform).** SW-ERR-08's Embedded exception rests on SE-0413 text; exit codes were measured on x86_64 Linux only (arm64 reports SIGTRAP 133 in cited threads). Needs an Embedded build and an arm64/macOS runner.
6. **Credentials in error text (SW-SEC M-I-09).** Rust ERR-17 (redaction by construction, URL userinfo scrubbed) is not covered by either dive.

## Sub-artifacts

- [swift-errors/error-contracts.md](swift-errors/error-contracts.md): typed throws (25 closure/async/stdlib probes on 6.4 and 6.3.3, `FullTypedThrows`, `UntypedThrows`), the public error type template, ArgumentParser's printed text, the swallow family greps with allow-list, text-matching, which layer logs. 16 candidate rules, 21 verification rows.
- [swift-errors/traps-and-unwraps.md](swift-errors/traps-and-unwraps.md): what traps and its exit codes, build-mode semantics of `assert`/`precondition`/`fatalError`, the three 2026 advisories (swift-nio CVE-2026-43678 and CVE-2026-43671, Hummingbird CVE-2026-97697), force-operation lints in swift-format and SwiftLint, exit tests, trap-vs-throw decision table. E1-E12 here, S1-S6 for SW-SEC.
- Audits used: [exemplar-language-shape.md](swift-audit/exemplar-language-shape.md) (Axes 4 and 5, Smells 3 and 5), [exemplar-quality-gates.md](swift-audit/exemplar-quality-gates.md) (swift-format and SwiftLint tables, `force_cast`/`force_try` read), [config-inventory.md](swift-audit/config-inventory.md) (Python SDK error map, CLI contract translation), [exemplar-packaging-and-release.md](swift-audit/exemplar-packaging-and-release.md) (ExitCode/`fatalError` usage in CLI-shaped repos), [exemplar-concurrency.md](swift-audit/exemplar-concurrency.md) (searched for error-handling material: none; the fire-and-forget `Task { }` swallow is the concurrency family's).

## Key sources

1. https://github.com/swiftlang/swift-evolution/blob/main/proposals/0413-typed-throws.md : SE-0413, "untyped throws is better for most scenarios", the three cases, FullTypedThrows moved to Future Directions.
2. https://raw.githubusercontent.com/swiftlang/swift-book/main/TSPL.docc/LanguageGuide/ErrorHandling.md : TSPL, "Specifying the Error Type" and "Disabling Error Propagation" (`try!`).
3. https://raw.githubusercontent.com/swiftlang/swift-book/main/TSPL.docc/LanguageGuide/TheBasics.md : assertions and preconditions are not for recoverable errors.
4. https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0487-extensible-enums.md : SE-0487 `@nonexhaustive`, implemented in Swift 6.2.3.
5. https://raw.githubusercontent.com/swiftlang/swift/main/userdocs/diagnostics/untyped-throws.md : the `UntypedThrows` cost statement and hot-path framing.
6. https://raw.githubusercontent.com/swiftlang/swift/main/docs/ErrorHandlingRationale.md : logic failures, the denial-of-service tension, recoverable traps an open question.
7. https://raw.githubusercontent.com/swiftlang/swift/main/stdlib/public/core/Assert.swift : exact `assert`/`precondition`/`fatalError` build-mode semantics.
8. https://github.com/apple/swift-nio/security/advisories/GHSA-qcc5-f287-vgmq : CVE-2026-43678, trapping `Int(_:)` before the size limit.
9. https://github.com/apple/swift-nio/security/advisories/GHSA-r3rc-9hpw-54v9 : CVE-2026-43671, `truncatingIfNeeded` out-of-bounds write.
10. https://github.com/hummingbird-project/hummingbird/security/advisories/GHSA-62cf-93wq-244m : CVE-2026-97697, `ClosedRange` precondition as a remote abort.
11. https://raw.githubusercontent.com/swiftlang/swift-format/main/Documentation/RuleDocumentation.md : `NeverForceUnwrap`, `NeverUseForceTry`, `NeverUseImplicitlyUnwrappedOptionals` are opt-in and lint-only.
12. https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/testing/0008-exit-tests.md : ST-0008 exit tests, `#expect(processExitsWith:)` (Swift 6.2).
13. https://github.com/apple/swift-log (Sources/Logging/Docs.docc/BestPractices/001-ChoosingLogLevels.md @4038b6a4f74a) : libraries log at info or below.
14. https://github.com/apple/swift-argument-parser (Sources/ArgumentParser/Usage/MessageInfo.swift and Utilities/Foundation.swift @efd239f0055b) : how an error becomes stderr text and an exit code.
15. https://github.com/apple/containerization/blob/main/Sources/ContainerizationError/ContainerizationError.swift (@3e7bc39e66b3) : the struct + Code + cause error type in production.
