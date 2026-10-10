---
title: "Swift error contracts: typed throws, error shape, user-facing text, swallowed errors, logging layer"
topic: "Errors and traps (SW-ERR): rows M-C-01..M-C-04, M-C-08, M-C-09"
agent: "W2-8 errors/error-contracts"
model: sonnet
date_researched: 2026-10-10
sources_count: 22
fixtures: "/home/mherwig/.cache/research-lang/swift-tools/fixtures/error-contracts/"
scope: |
  Covers: when to use typed throws (conflict 6 confirmed), closure/async/stdlib typed-error inference on Swift 6.4 and 6.3.3,
  the PerformanceHints::UntypedThrows diagnostic, the public error type template (struct + Code + cause), the user-facing
  description protocol and exactly what swift-argument-parser prints, the try?/empty-catch/log-only-catch greps with an allow-list,
  string-matching of errors, and which layer logs.
  Does not cover: force unwraps, try!, fatalError/precondition (W2-9), Result's role (M-C-07), cancellation errors (tasks dive),
  exit-code numbers (CLI dive). Linux only: every macOS/Windows/Xcode claim is marked "unverified: read only" (owner Q7).
---

# Swift error contracts (SW-ERR) - typed throws, shape, text, swallowing, logging

Date 2026-10-10. Toolchains: Swift 6.4 (swift-6.4-RELEASE) and 6.3.3 (swift-6.3.3-RELEASE) via
`~/.cache/research-lang/swift-tools/run.sh`; swiftlint 0.65.1; swift-argument-parser 1.8.2; swift-log 1.16.1.
Every plant was built or run on both toolchains unless a row says otherwise. Fixture root `F` =
`/home/mherwig/.cache/research-lang/swift-tools/fixtures/error-contracts`.

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   - 1. Typed throws: the rule (conflict 6 confirmed)
   - 2. The plant: what a typed public API costs the next release
   - 3. Closure inference on 6.4: FullTypedThrows is not shipping
   - 4. Typed errors through async let, task groups, Task, AsyncSequence
   - 5. rethrows vs throws(E) forwarding and stdlib adoption
   - 6. PerformanceHints::UntypedThrows
   - 7. Error shape: struct + Code + cause, and @nonexhaustive
   - 8. User-facing text: what ArgumentParser prints
   - 9. try? and empty/log-only catch: the swallow family
   - 10. Control flow by matching error text
   - 11. Which layer logs
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- Public API throws untyped (`throws`); typed throws is for module-internal domains, generic forwarding (`throws(E)`) and closed domains (errno-style); this confirms conflict 6 ([SE-0413](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0413-typed-throws.md) "untyped throws is better for most scenarios").
- A public `func f() throws(LoadError)` cannot grow a second error type without a source break for every consumer: planted, red (`typed-v2-widen`, rc=1), untyped twin green (rc=0).
- Closure typed-throws inference does not exist on 6.4 or 6.3.3: `{ try typed(x) }` infers `any Error`; write `{ x throws(E) in ... }`. Measured on 25 probes, identical on both toolchains.
- `FullTypedThrows` is not an upcoming feature on 6.4; it is an experimental flag that "cannot be enabled in production compiler". `.enableUpcomingFeature("FullTypedThrows")` builds with rc=0 and does nothing; only `-Werror StrictLanguageFeatures` exposes it.
- Typed errors do not cross concurrency constructs: `async let`, `withThrowingTaskGroup` and `Task { }` all erase to `any Error`; fold the typed error into `Result<T, E>` per child, or declare the enclosing function untyped.
- `rethrows` erases a typed closure error to `any Error`; `throws(E)` forwarding keeps it and collapses to non-throwing for `Never`. On 6.4 only `map`, `filter`, `mapValues`, `Optional.map` and `Dictionary(grouping:)` forward typed closure errors; `reduce`, `forEach`, `sorted`, `contains(where:)` and 11 more still erase.
- `-Werror UntypedThrows` is a 6.4-only group (6.3.3 prints `unknown warning group` and exits 0) and fires on every untyped `throws`, public API included: enable it per hot-path module, never repo-wide.
- The public error type is one `struct` with an open `Code` struct, a `message` and a chained `cause` (apple/containerization `ContainerizationError`); a public `enum` error is a source break per new case unless it is `@nonexhaustive` (SE-0487, works on 6.3.3 and 6.4, new case becomes a warning).
- An error type conforms to `CustomStringConvertible`, and to `LocalizedError` with `errorDescription` returning the same text when Foundation/Apple UI may read it; `error.localizedDescription` on a plain Error prints `The operation could not be completed. (main.D error 1.)` on Linux.
- swift-argument-parser prints `Error: <LocalizedError.errorDescription, else String(describing:)>` to stderr and exits 1; `ValidationError` adds usage and exits 64; `ExitCode(n)` prints nothing. A bare enum prints `Error: missing`; a struct without a description prints a type dump.
- `try? data.write(to: "/dev/full")` prints `saved 7 bytes` and exits 0 with zero compiler warnings on 6.4 and 6.3.3; the propagating twin prints the ENOSPC error and exits 1.
- Three greps (empty catch, log-only/drop-only catch, `try?` on write/remove/copy/createDirectory/decode) go red on the planted file and are silent on the twin; SwiftLint opt-in `no_empty_block` independently catches the empty catches (rc=2 vs 0). SwiftLint `custom_rules` could not run here (static binary has no SourceKit).
- Allow-list by comment: an empty catch with a comment in the body is non-empty to both the grep and `no_empty_block`; `try? /* swallow-ok: reason */ x` skips the `try?` grep. Best-effort `removeItem` cleanup is the dominant legitimate `try?` (136 of 284 corpus hits).
- Do not branch on error text: `String(describing: error).contains("XPC connection error")` (container@f70ecbb926d9:Sources/ContainerCommands/Application.swift:135-136) exists although the producer already sets `code = .interrupted` (XPCClient.swift:145).
- One layer logs: the layer that ends the error (entry point, request/RPC handler, task loop). Logging at three layers printed 3 lines for one failure; one layer printed 1 with the full chain. Libraries log at `info` or lower and never log what they throw.
- Never stringify a cause into a new error (`throw X("failed: \(error)")`); attach it as `cause:`. Grep K7 catches the pattern.

## Findings

### 1. Typed throws: the rule (conflict 6 confirmed)

SE-0413 states that "untyped `throws` is better for most scenarios" and lists exactly three cases for typed throws: (1) code that stays within a module or package where the error is always handled, (2) generic code that only passes through errors from user components, (3) dependency-free code for constrained environments such as Embedded Swift ([SE-0413, "When to use typed throws"](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0413-typed-throws.md)). Its worked counter-example is `public func loadBytes(from file: String) async throws(FileSystemError) -> [UInt8]  // should use untyped throws`, because the concrete type "may hamper further evolution".

The Swift Programming Language book repeats the same three cases ([TSPL Error Handling, "Specifying the Error Type"](https://raw.githubusercontent.com/swiftlang/swift-book/main/TSPL.docc/LanguageGuide/ErrorHandling.md)): no-allocation environments, errors that are "an implementation detail of some unit of code, like a library", and generic propagation.

SE-0413 says "This section will be added to the Swift API Design Guidelines". It was not: the page fetched 2026-10-10 contains no text on typed throws (`grep -o -i "typed throw"` on the saved HTML returned nothing) ([API Design Guidelines](https://www.swift.org/documentation/api-design-guidelines/)). The authority is SE-0413 plus TSPL, not the guidelines.

The corpus agrees with the restraint, with one honest exception class:

- The OCI exemplars use no typed throws at all: containerization 0 typed vs 1,956 untyped `throws`, container 0 vs 1,120, swift-container-plugin 0 vs 75; SwiftPM 1 vs 2,565 (own count, `--exclude-dir=Tests`, 2026-10-10).
- swift-foundation has 202 lines with `throws(X)` against 1,927 untyped; the concrete ones are closed domains (`ICUError` 15, `DecodingError` 14) and the rest forward `throws(E)` (swift-foundation@aadd9259be07:Sources/FoundationEssentials/Data/Data+Base64.swift:534 `throws(DecodingError)`, `:538` `Result(catching: { () throws(DecodingError) -> Data in`).
- swift-crypto has 233 `throws(CryptoKitMetaError)` and 101 `throws(E)` forwarders (swift-crypto@1c80d3aff53f:Sources/Crypto/CryptoKitErrors.swift:92 defines the umbrella enum): a closed domain mirroring Apple CryptoKit.
- swift-system types `Errno` as `@frozen public struct Errno: RawRepresentable, Error, Hashable, Codable` over a `CInt` (swift-system@486d48c80fce:Sources/System/Errno.swift:12-14) and uses `throws(Errno)` only on newer surfaces: `IORing.swift` (19 sites), `Stat.swift` (11), `FileOperations.swift:455` and `:544`; the classic `FileDescriptor.open` stays untyped (`FileOperations.swift:35`). A struct over a fixed integer set is the one shape for which a typed signature does not age, because new errno values are new static members, not new cases.

Closed-domain test used by the rule: the error values are defined by something outside the module's control and fixed for the module's lifetime (a syscall's errno, a wire spec, a decoder's fixed failure list), and the type is a struct or a `@frozen` enum. Anything that wraps "whatever the layer below throws" is not closed.

### 2. The plant: what a typed public API costs the next release

Fixture `F/a/` (generated by `F/a/gen.sh`; build with `F/a/run.sh <dir>`; each dir is a package with a `Lib` target and an `App` consumer that catches exhaustively).

| dir | public API of v2 | App builds? | 6.4 rc | 6.3.3 rc |
|---|---|---|---|---|
| `typed-v1` | `load() throws(LoadError)` | yes | 0 | 0 |
| `typed-v2-newtype` | author adds `throw ParseError(...)` inside `throws(LoadError)` | author's own build fails: `thrown expression type 'ParseError' cannot be converted to error type 'LoadError'` | 1 | 1 |
| `typed-v2-widen` | author widens to `throws(ReadError)` (the typed "fix") | consumer fails: `type 'ReadError' has no member 'missing'` | 1 | 1 |
| `untyped-v1` | `load() throws` | yes | 0 | 0 |
| `untyped-v2-newtype` | same new `ParseError` thrown | yes (consumer has `catch { }`) | 0 | 0 |
| `typed-v2-newcase` | new case `corrupt` on `LoadError` | consumer: `switch must be exhaustive` | 1 | 1 |
| `untyped-v2-newcase` | new case `corrupt` on `LoadError` | consumer: `switch must be exhaustive` | 1 | 1 |

Two readings. (1) The signature is the contract: with typed throws the new failure mode has nowhere to go but a wider type, which breaks every consumer; with untyped throws it is invisible to the signature. (2) The `newcase` rows are red for the typed AND the untyped twin: adding a case to a public error enum breaks any consumer that switched exhaustively, typed or not. That is an enum-evolution problem (finding 7), not a typed-throws problem; reporting it as a typed-throws cost would be wrong.

### 3. Closure inference on 6.4: FullTypedThrows is not shipping

SE-0413's accepted text originally included closure inference behind an upcoming flag `FullTypedThrows`; the current text says the inference changes "did not get implemented in Swift 6.0" and moved them to Future Directions ([SE-0413](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0413-typed-throws.md), note under Introduction and "Future directions").

Status on 2026-10-10 (all rows ran `swiftc -typecheck -swift-version 6` on 6.4 and 6.3.3; identical results; probe files in `F/b-infer/cases/`):

| probe | code shape | result |
|---|---|---|
| c01 | `let c = { (x: Int) in if x < 0 { throw E.a }; return x }` then `catch { let _: E = error }` | red: `cannot convert value of type 'any Error' to specified type 'E'` |
| c02 | `let c = { (x: Int) in try typed(x) }` | red, same error |
| c03 | `[1,2].map { x throws(E) in try typed(x) }` inside `throws(E)` | green |
| c04 | `[1,2].map { x in try typed(x) }` inside `throws(E)` | red: `thrown expression type 'any Error' cannot be converted to error type 'E'` |
| c12 | `do { throw E.a } catch { let _: E = error }` | red: a `throw` statement is always `any Error` (SE-0413 compatibility rule) |
| c19 | `do { _ = try typed(1) } catch { let _: E = error }` | green: a `do` over typed calls is inferred |
| c11 | `do throws(F) { ... } catch { throw .a }` | green: explicit `do throws(F)` works |

Core-team confirmation, 2026-02-13 (Swift Forums, ktoso): "we're missing closure type inference for typed throws and it makes the ergonomics bad ... We've not worked on this in the current timeframe"; "it also depends on cross-statement inference in closures that has to join error types which isn't something that we have today" ([Cannot compose APIs that use typed throws](https://forums.swift.org/t/cannot-compose-apis-that-use-typed-throws/84716)). A 2026-06-10 post on Swift 6.3.1 says "there's essentially no inference for typed throws until we get FullTypedThrows back" ([Is throws() type-checking really this limited?](https://forums.swift.org/t/is-throws-type-checking-really-this-limited/87276)); the 2024 thread [Where is FullTypedThrows?](https://forums.swift.org/t/where-is-fulltypedthrows/72346) shows the same gap since Xcode 16 beta 1.

The flag itself:

- `swiftc -frontend -print-supported-features` on 6.4 lists 21 upcoming features and 56 experimental; none upcoming is named `FullTypedThrows`.
- `-enable-experimental-feature FullTypedThrows` -> `error: experimental feature 'FullTypedThrows' cannot be enabled in production compiler` (6.4 and 6.3.3).
- `-enable-upcoming-feature FullTypedThrows` is accepted silently; the compile result is unchanged (c01 stays red). With `-Werror StrictLanguageFeatures`: `'FullTypedThrows' is not a recognized upcoming feature [#StrictLanguageFeatures::UnrecognizedStrictLanguageFeatures]`. SwiftPM: `.target(name: "Lib", swiftSettings: [.enableUpcomingFeature("FullTypedThrows")])` builds rc=0 with no diagnostic (`F/b-infer/ftt/`), and rc=1 with `-Xswiftc -Werror -Xswiftc StrictLanguageFeatures`.

Practical forms that work today: annotate the closure (`{ x throws(E) in ... }`), pass a function reference (`Result(catching: typedFn)`), or write `do throws(E) { }`. The toolchain's own code does the same: `Result(catching: { () throws(DecodingError) -> Data in` at swift-foundation@aadd9259be07:Sources/FoundationEssentials/Data/Data+Base64.swift:538, `:556`, `:576`.

### 4. Typed errors through async let, task groups, Task, AsyncSequence

Probes in `F/b-infer/cases/`, 6.4 and 6.3.3 identical, each inside a function declared `async throws(E)`:

| probe | construct | result |
|---|---|---|
| c05 | `async let v = typedAsync(); return try await v` | red: `thrown expression type 'any Error' cannot be converted to error type 'E'` (async let erases) |
| c10 | c05 plus `catch { throw error as! E }` | green, but a force cast: a trap if the failure ever isn't `E`; do not use |
| c17 | `async let v: Result<Int, E> = { do throws(E) { ... } catch { return .failure(error) } }()`; `return try await v.get()` | green |
| c06 | `withThrowingTaskGroup(of:returning:)` with `addTask { try await typedAsync() }` | red: erased to `any Error` |
| c07 | `withTaskGroup(of: Result<Int, E>.self, ...)`, each child returns `.success`/`.failure`; `try r.get()` after | green |
| c08 | `Task<Int, E> { () async throws(E) -> Int in ... }` | red: `referencing initializer 'init(name:priority:operation:)' on 'Task' requires the types 'E' and 'any Error' be equivalent` |
| c09 | `Task { try await typedAsync() }; try await t.value` | red (erased) |
| c18 | `Task { () async -> Result<Int, E> in ... }; try await t.value.get()` | green |
| c16 | `for try await x in s` with `s: AsyncThrowingStream<Int, E>` inside `throws(E)` | green (SE-0421, Swift 6.0: `AsyncIteratorProtocol.Failure`) |

Conclusion: typed throws survives structured iteration of an `AsyncSequence` whose `Failure` is concrete, and nothing else in the concurrency library. A function that uses `async let`, task groups or `Task` and promises `throws(E)` forces either `Result` folding in every child or a force cast. The rule is therefore: declare such functions untyped `throws`. SE-0413 lists "Concurrency library adoption" (`Task`, continuations, task groups) as future work, which matches ([SE-0413, Future directions](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0413-typed-throws.md)); [SE-0421](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0421-generalize-async-sequence.md) is the shipped part.

### 5. rethrows vs throws(E) forwarding and stdlib adoption

- `rethrows` erases. `func r<T>(_ f: () throws -> T) rethrows -> T` called with `() throws(E) in ...` inside a `throws(E)` function is red (c20: `thrown expression type 'any Error' cannot be converted to error type 'E'`). The generic form `func r<T, X: Error>(_ f: () throws(X) -> T) throws(X) -> T` is green (c21) and, called with a non-throwing closure, needs no `try` at all (c24, `X == Never`): "throws(E) with E = Never" is the replacement for `rethrows` in new code ([SE-0413, "An alternative to rethrows"](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0413-typed-throws.md)).
- Standard library adoption is partial and moved between releases. `F/b-infer/stdlib.swift` (21 probes, each with an explicitly typed closure inside `throws(E)`), run by `F/b-infer/stdlib-run.sh`:

| | Swift 6.4 | Swift 6.3.3 |
|---|---|---|
| keeps the typed closure error | `map`, `filter`, `mapValues`, `Optional.map`, `Dictionary(grouping:)`, `withoutActuallyEscaping` | `map`, `Optional.map`, `withoutActuallyEscaping` |
| erases to `any Error` | `compactMap`, `flatMap`, `forEach`, `contains(where:)`, `first(where:)`, `allSatisfy`, `reduce`, `reduce(into:)`, `sorted(by:)`, `min(by:)`, `firstIndex(where:)`, `drop(while:)`, `sort(by:)`, `split`, `removeAll(where:)` | the same plus `filter`, `mapValues`, `Dictionary(grouping:)` |

An agent that writes `try items.reduce(0) { ... }` inside a `throws(E)` function gets a type error on both toolchains; the fix is a loop, not a cast.

### 6. PerformanceHints::UntypedThrows

The documented cost: "Throwing an error of type `any Error` involves a heap allocation as well as reference-counting overhead. Therefore, highly performance-sensitive code should prefer to use typed throws" ([untyped-throws.md](https://raw.githubusercontent.com/swiftlang/swift/main/userdocs/diagnostics/untyped-throws.md)); the group sits in `PerformanceHints`, which is "off by default" ([performance-hints.md](https://raw.githubusercontent.com/swiftlang/swift/main/userdocs/diagnostics/performance-hints.md)).

Measured (`F/b-infer/perf/run.sh`): `swiftc -typecheck -swift-version 6 -Werror UntypedThrows untyped.swift` on 6.4 -> `error: untyped throws performs heap allocation on each 'throw' [#PerformanceHints::UntypedThrows]`, rc=1, pointing at the `throws` of a *public* function; the typed twin rc=0. On 6.3.3 the same command prints `warning: unknown warning group: 'UntypedThrows' [#UnknownWarningGroup]` and exits 0, so a gate that names the group is a no-op on the prior line.

It is a hot-path hint, not a design rule: it fires on every untyped `throws`, which is the shape this document prescribes for public API (rule SW-ERR-01). Use `.treatWarning("UntypedThrows", as: .warning)` or `@diagnose(UntypedThrows, as: warning, reason:)` (SE-0522, 6.4) in the one module whose profile shows throw cost, never package-wide.

### 7. Error shape: struct + Code + cause, and @nonexhaustive

Corpus facts ([shape audit, Axis 5](../swift-audit/exemplar-language-shape.md); the brief calls it Axis 4, the errors axis is numbered 5 in the audit): 973 error types, 726 enums, 247 structs, 0 classes; `LocalizedError` 340 (tuist 250); only ~75 (7.7%) wrap an underlying error, so most chains lose their cause.

The strongest shape in the corpus is apple/containerization's `ContainerizationError`:

- `public struct ContainerizationError: Swift.Error, Sendable` with `code: Code`, `message: String`, `cause: (any Error)?` (containerization@3e7bc39e66b3:Sources/ContainerizationError/ContainerizationError.swift:23-29);
- `Code` is itself a struct over a private enum, so a new code is not a source break (`:94`);
- conforms to `CustomStringConvertible` (`:72-79`, prints `code: "message" (cause: "...")`) and `LocalizedError` (`:82-90`, `errorDescription` = message plus cause);
- 0 `throws(ContainerizationError)` anywhere: the whole API is untyped `throws` documented to throw this type (`:19-22` doc comment).

Template verified in `F/g-template/` (`swift test -Xswiftc -warnings-as-errors`, rc=0 on 6.4 and 6.3.3, 2 Swift Testing tests):

```swift
public struct ToolError: Error, Sendable, CustomStringConvertible, LocalizedError {
    public struct Code: RawRepresentable, Hashable, Sendable {
        public let rawValue: String
        public init(rawValue: String) { self.rawValue = rawValue }
        public static let notFound = Code(rawValue: "notFound")
        public static let io = Code(rawValue: "io")
    }
    public var code: Code
    public var message: String          // one sentence, no "Error:" prefix, no trailing period
    public var cause: (any Error)?      // the error that produced this one
    public init(_ code: Code, _ message: String, cause: (any Error)? = nil) { ... }
    public var description: String { cause.map { "\(message): \($0)" } ?? message }
    public var errorDescription: String? { description }
}
// public API stays untyped; the domain is documented:
public func save(_ data: Data, to url: URL) throws {
    do { try data.write(to: url) } catch { throw ToolError(.io, "cannot save \(url.lastPathComponent)", cause: error) }
}
```

Test result: `ToolError(.invalidInput, "bad reference", cause: ToolError(.io, "cannot pull", cause: ToolError(.notFound, "no such image")))` has `description == "bad reference: cannot pull: no such image"`, equal to `localizedDescription` and to `"\(error)"`; `save` to `/dev/full` throws a `ToolError` with `isCode(.io)` and a Foundation cause. Order is outermost context first, root cause last. Swift's `Error` has no built-in cause link; `NSUnderlyingErrorKey` is Foundation-only and not portable to the typed-struct shape, so the `cause` field is the convention.

Closed-domain errors are the exception: syscall-like domains follow swift-system's `Errno` (struct over an integer, `@frozen`, static members, `CustomStringConvertible` at `Errno.swift:1546`).

Public enums: SE-0487 `@nonexhaustive` ([SE-0487](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0487-extensible-enums.md), "Implemented (Swift 6.2.3)") makes an enum extensible in a non-resilient package. Planted `F/a/nonex-v1` -> `nonex-v2` (adds `corrupt`; consumer has `@unknown default`): builds rc=0 on 6.4 and 6.3.3, with `warning: switch must be exhaustive` at the consumer. Per the proposal, *adding* `@nonexhaustive` to an existing enum is itself source-breaking in a non-resilient module, so it must be there from the first release. Corpus adoption: none in production Swift code (only a swift-protobuf generator option mentions it, swift-protobuf@6c84c3dedac0:Sources/protoc-gen-swift/GeneratorOptions.swift:143). Struct twin `F/a/struct-v1`/`struct-v2` (new `Code`, new `ParseError` thrown): both rc=0, because a `struct` cannot be switched exhaustively.

### 8. User-facing text: what ArgumentParser prints

ArgumentParser's dispatch, read in source: `MessageInfo.init` matches `ValidationError` (message + usage), `CleanExit`, `ExitCode` (no message), otherwise `.other(message: error.describe(), exitCode: .failure)` (swift-argument-parser@efd239f0055b:Sources/ArgumentParser/Usage/MessageInfo.swift:100-126); `describe()` returns `(self as? LocalizedError)?.errorDescription` if present, else `String(describing: self)` (with an `NSError` special case when built on non-Essentials Foundation) (`Sources/ArgumentParser/Utilities/Foundation.swift:19-35`). The docs say "Errors that conform to `CustomStringConvertible` or `LocalizedError` provide the best experience for users" (`Documentation.docc/Articles/Validation.md:62` and `:110`).

Measured, `F/e-argparse/` (swift-argument-parser 1.8.2, `F/e-argparse/run.sh`, 6.4 = 6.3.3 output; all text on stderr, stdout 0 bytes):

| thrown | stderr | exit |
|---|---|---|
| `enum BareError: Error { case missing }` | `Error: missing` | 1 |
| `struct OpaqueError: Error` (op, path, underlying; no description) | `Error: OpaqueError(op: "write", path: "/data/x", underlying: App.BareError.unreadable)` | 1 |
| `CustomStringConvertible` struct with chained cause | `Error: write /data/x failed: open /data failed` | 1 |
| `LocalizedError` with `errorDescription` (and a `recoverySuggestion`) | `Error: could not reach the registry` (suggestion ignored) | 1 |
| `LocalizedError` with only `failureReason` | `Error: ReasonOnly()` | 1 |
| `throws(TypedFailure)` `run()` witness + `CustomStringConvertible` | `Error: denied: token expired` (a typed `run()` satisfies the untyped protocol requirement) | 1 |
| `ValidationError("name must not be empty")` | `Error: name must not be empty` + `Usage: cmd <which>` + `See 'cmd --help' ...` | 64 |
| `ExitCode(3)` | nothing | 3 |
| `NSError(domain:code:userInfo:)` | `Error: Error Domain=fx Code=7 "(null)"UserInfo={NSLocalizedDescription=ns says hi}` | 1 |

Outside ArgumentParser, `F/f-desc/` (6.4 = 6.3.3):

| type | `localizedDescription` | `String(describing:)` / `"\(e)"` |
|---|---|---|
| `CustomStringConvertible` only | `The operation could not be completed. (main.D error 1.)` | `custom description` |
| `LocalizedError` only | `localized description` | `L()` |
| bare enum | `The operation could not be completed. (main.B error 0.)` | `x` |
| both, `errorDescription = description` | `both: description` | `both: description` |

Only the "both" shape prints the same sentence through ArgumentParser, `swift-log` interpolation, Swift Testing failure output and `localizedDescription`. Decision: conform to `CustomStringConvertible` always; add `LocalizedError` (returning `description`) when the error can reach Foundation or an Apple UI, which `ContainerizationError` does (`:72`, `:82`). `localizedDescription` is never the way to get text in CLI/server/library code; 404 production lines in the corpus use it (most files: swift-build 78, tuist 40); this dive did not classify which are `NSError`-shaped.

SE-0489 (Swift 6.3) made `DecodingError`/`EncodingError` print readably via `CustomDebugStringConvertible` ([SE-0489](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0489-codable-error-printing.md)); pre-6.3 they print a nested dump.

unverified: read only - on macOS/iOS the `localizedDescription` fallback text for a plain Error differs in wording (it is generated by Apple Foundation, not swift-foundation); Windows behaves as Linux because it uses swift-foundation (not run).

### 9. try? and empty/log-only catch: the swallow family

Plant (b), `F/b-swallow/` (`F/b-swallow/run.sh`): `try? data.write(to: URL(fileURLWithPath: "/dev/full"))` then `print("saved 7 bytes")`. Red: stdout `saved 7 bytes`, exit 0, zero compiler warnings (`swift build` on 6.4 and 6.3.3 with no flags). Green twin: `do { try data.write(to: target) } catch { stderr "error: cannot write /dev/full: Error Domain=NSCocoaErrorDomain Code=640 ... NSUnderlyingError=... NSPOSIXErrorDomain Code=28 \"No space left on device\""; exit(1) }` -> exit 1. The compiler has no diagnostic for a discarded `Void?` from `try?`. Linux only: unverified: read only on macOS (no `/dev/full`; use a full disk image) and Windows.

Plant (c), `F/c-grep/{red,green}/Sources/Lib/*.swift` (both build clean, rc=0, 0 warnings on 6.4 and 6.3.3). Checks, each quoted verbatim in "Verification runs"; the output is the violation, empty output = pass (grep rc=1):

- K1 empty catch, any layout, including multi-line: `grep -rEzo --include='*.swift' -e 'catch[[:space:]]*(let [A-Za-z_]+[[:space:]]*)?\{[[:space:]]*\}' Sources`
- K2 catch whose only statement is a log, print or drop: same `catch[[:space:]]*...\{[[:space:]]*` prefix with `print\(`, `debugPrint\(`, `NSLog\(`, `log(ger)?\.[a-z]+\(`, `return( nil)?`, `continue`.
- K3 `try?` directly on a mutating or decoding call: `try\? [^/]*\.write\(`, `.removeItem(`, `.moveItem(`, `.copyItem(`, `.createDirectory(`, `.decode(`.

Allow-list (both tested green): an empty catch carries its reason inside the braces (`catch { /* swallow-ok: best-effort temp cleanup */ }`); `[^/]*` in K3 makes `try? /* swallow-ok: reason */ expr` invisible. The same comment convention satisfies SwiftLint's opt-in `no_empty_block` ("Code blocks should contain at least one statement or comment", realm__SwiftLint@ec4691d9e813:Source/SwiftLintBuiltInRules/Rules/Idiomatic/NoEmptyBlockRule.swift:9-11): `swiftlint lint --strict --config .swiftlint.yml` with `only_rules: [no_empty_block]` flagged both empty catches (`Store.swift:6:41`, `:12:17`), rc=2; green rc=0. swift-format has no rule for this (its `dump-configuration` lists only `NeverUseForceTry`, `NeverForceUnwrap` in this family). SwiftLint `custom_rules` regex rules for K2/K3 are written in `F/c-grep/.swiftlint-custom.yml` but did not run: the static `swiftlint` 0.65.1 binary prints `Skipping enabled rule 'custom_rules' because it requires SourceKit and SourceKit access is prohibited` (rc stays 0, so a green run would be a false green).

Corpus measurement (own re-measure, production code, `--exclude-dir` Tests/Fixtures/Examples/Benchmarks, `F/corpus-scan.sh`, output `F/corpus-scan.out`):

- K3: write 28, removeItem 136, copyItem 6, createDirectory 13, decode 101, moveItem 0 = 284 hits; 38 of the 136 `removeItem` sites have a `defer` within two lines (cleanup). containerization alone has 52 `try? ...removeItem(` (e.g. containerization@3e7bc39e66b3:Sources/Containerization/UnixSocketRelay.swift:84). Total `try?` in production code: 2,784 (the audit's 2,231 used a narrower exclusion).
- K1: IceCubesApp 55 (e.g. IceCubesApp@2ad6e6891258:Packages/Timeline/Sources/Timeline/actors/TimelineCache.swift:59 and :69, `} catch {}` around cache writes), swift-build 7, SwiftPM 3; SwiftLint's 31 are rule-example strings (false positive class: lint-rule test data).
- K2: element-x-ios 242 (app UI boundary logging via `MXLog`, e.g. element-x-ios@14e33866ced2:ElementX/Sources/Services/Keychain/KeychainController.swift:133 logs and continues), containerization 29, container 25. K2 is a review trigger in app code, not an auto-fail.
- The documented-intent shape exists in the toolchain itself: `catch is ExpectationFailedError { // This error is thrown by ... }` (swift-testing@c7d68ca20cd7:Sources/Testing/Issues/Issue+Recording.swift:274).

### 10. Control flow by matching error text

container@f70ecbb926d9:Sources/ContainerCommands/Application.swift:135-137: `let errorAsString: String = String(describing: error)`, `if errorAsString.contains("XPC connection error")`, then rebuilds a `ContainerizationError(.interrupted, ...)`. The matched string is produced elsewhere: container@f70ecbb926d9:Sources/ContainerXPC/XPCClient.swift:143-150 builds `ContainerizationError(code, message: "XPC connection error: ...")` with `code = .interrupted` when `reply.connectionError`. The consumer could test `(error as? ContainerizationError)?.isCode(.interrupted)` (`ContainerizationError.swift:67`); the string round-trip is a module-spanning coupling to a message nobody types-checks. (The brief's second anchor, `Application.swift:150`, is `bootstrapLogger.logLevel = .debug`, unrelated; the matching site is :135-137.)

K4 (`F/c-grep/check2.sh`) greps `localizedDescription.contains(`/`hasPrefix(`/`hasSuffix(`, `localizedDescription ==`, `String(describing: <err>).contains(` and the assignment form `errorX: String = String(describing: `. Corpus: 9 hits, 3 true control flow (tuist@2f6ac74754bf:`cli/Sources/tuist/TuistCommand.swift:284` `error.localizedDescription.contains("ArgumentParser")`, `cli/Sources/TuistCore/Simulator/SimulatorController.swift:414` `String(describing: error).contains("Unable to boot device ...")`, container `Application.swift:135`), 6 message capture (not flow). So the assignment pattern is a review trigger; the `.contains(` patterns are near-certain.

### 11. Which layer logs

Plant (d), `F/d-logging/` (swift-log 1.16.1, `F/d-logging/run.sh`): one failure ("connection refused") crossing `fetch` -> `loadConfig` -> `main`.

`triple` (each layer calls `logger.error` then throws), stderr, 3 lines, exit 1:
```
error app: error=connection refused by registry.example host=registry.example [App] fetch failed
error app: error=connection refused by registry.example [App] loadConfig failed
error app: error=ServiceError(op: "loadConfig", underlying: connection refused by registry.example) [App] fatal
```
`single` (lower layers add context via `ServiceError: CustomStringConvertible` and throw; only `main` logs), 1 line, exit 1:
```
error app: error=loadConfig: connection refused by registry.example [App] fatal
```
Both toolchains identical. The third `triple` line also shows the cost of a missing description: `ServiceError(op: ..., underlying: ...)`.

Official guidance, swift-log (swift-log@4038b6a4f74a:Sources/Logging/Docs.docc/BestPractices/001-ChoosingLogLevels.md:41): "Libraries should use **info level or less severe** (info, debug, trace)" and not warning or worse "unless it is a one-time ... warning"; failures "completely intentional from the high-level perspective" (failed lookups, failed requests) belong at debug/trace with metrics offered instead. `ImplementingALogHandler.md:114`: `LogHandler.log(event:)` cannot throw, so logging itself must never be the failure path. Structured form: `logger.error("Database query failed", metadata: ["query.error": "\(error)"])` (`002-StructuredLogging.md:33-39`); swift-log 1.16.1 also accepts the error as an argument, `logger.error("fatal", error: e)` (`F/d-logging/errparam`, build rc=0; `LogEvent.error: (any Error)?` at `Sources/Logging/LogEvent.swift:30`).

Where the corpus logs and then throws on purpose: containerization's vminitd gRPC handlers log, then throw a translated `RPCError(code: .internalError, message: ..., cause: error)` (containerization@3e7bc39e66b3:vminitd/Sources/VminitdCore/Server+GRPC.swift:105-110, `:144-152`, `:185-192`): 27 log-then-throw sites in containerization, 3 in container, 6 in element-x-ios, 0 in async-http-client, hummingbird, vapor, SwiftPM and grpc-swift-2. The handler is a process boundary: the guest's log is the only place the full error survives, because the wire carries a status. That is the legitimate exception, and it is the same rule: the layer that *ends* the error's journey (here, converts it to a status) logs once.

## Normative guidance candidates

Check commands are exact; `S` is the source directory operand. A grep check's OUTPUT is the violation; empty output (grep rc=1) passes. "RUN" = executed against a planted violation and a compliant twin, both exit codes in "Verification runs".

1. **SW-ERR-01 Public API throws untyped.** A `public`/`open` function, initializer or accessor declares `throws`, never `throws(ConcreteType)`; concrete typed throws is allowed only for (a) internal/package/fileprivate code, (b) closed domains registered in the repo's rule (errno-style struct over a fixed set), (c) Embedded/no-allocation targets. Why: a second error type is otherwise a source break (finding 2); SE-0413 "untyped is better for most scenarios". Verify: `grep -rPzo --include='*.swift' -e 'public[^{};]*throws\((?![A-Z]\))(?!Failure\))[A-Z][A-Za-z]*\)' Sources`; append one `(?!Name\))` lookahead per registered closed-domain type. Limit: misses members of `public extension`. RUN: yes, `F/c-grep` K6 (red rc=0 with 2 hits, multi-line initializer included; green rc=1). Compile evidence for the break: `F/a/typed-v2-widen` rc=1 vs `F/a/untyped-v2-newtype` rc=0.
2. **SW-ERR-02 Forward closure errors with `throws(E)`, not `rethrows`, in new code.** `func f<T, E: Error>(_ body: () throws(E) -> T) throws(E) -> T`. Why: `rethrows` erases a typed closure error to `any Error` (c20 red) and `E == Never` removes `try` at the call site (c24). Verify: compile - a caller inside a `throws(E)` function fails with `thrown expression type 'any Error' cannot be converted to error type 'E'`; reading heuristic for review: `grep -rn --include='*.swift' -e 'rethrows' Sources` lists candidates in code written after Swift 6.0. RUN: compile probes yes (`F/b-infer/cases/c20` red, `c21`/`c24` green, 6.4 and 6.3.3); the `rethrows` grep is reading only.
3. **SW-ERR-03 Annotate closures that must be typed.** Write `{ x throws(E) in ... }` or `Result(catching: fn)`/`do throws(E)`; never rely on inference (none exists on 6.4/6.3.3). Why: c01/c02/c04 red. Verify: compiler diagnostic `thrown expression type 'any Error' cannot be converted to error type` / `cannot convert value of type 'any Error' to specified type` (no flag; Swift 6 mode irrelevant). RUN: yes, `F/b-infer/cases/c01,c02,c04` red vs `c03` green.
4. **SW-ERR-04 Do not enable FullTypedThrows.** No `FullTypedThrows` in `Package*.swift`, `.xcconfig`, `-enable-upcoming-feature`. Why: not an upcoming feature on 6.4/6.3.3; silently ignored. Verify: `grep -rn --include='Package*.swift' --include='*.xcconfig' -e 'FullTypedThrows' .`; and `-Xswiftc -Werror -Xswiftc StrictLanguageFeatures` turns any unrecognised feature name into an error. RUN: yes, `F/b-infer/ftt` (default build rc=0 with the flag present; grep rc=0 hit; strict build rc=1 on 6.4 and 6.3.3).
5. **SW-ERR-05 A function that awaits concurrency constructs is untyped.** If the body uses `async let`, a task group, or `Task { }` whose children throw, declare plain `throws`; or fold each child into `Result<T, E>` and `try result.get()` once. Never `error as! E`. Why: those constructs erase (c05, c06, c08, c09) and `as!` traps. Verify: compiler diagnostic as in rule 3. RUN: yes, `c05`/`c06`/`c08` red, `c07`/`c17`/`c18` green. The `as! E` ban belongs to the traps dive; grep for orientation: `grep -rn --include='*.swift' -e 'as! [A-Z][A-Za-z]*Error' Sources` (not run).
6. **SW-ERR-06 UntypedThrows is a per-module hot-path gate.** Enable `-Werror UntypedThrows` / `.treatWarning("UntypedThrows", as: .error)` only on modules whose profile shows throw cost, behind a toolchain check (the group is unknown before 6.4). Why: it flags public untyped API (contradicts rule 1) and is a silent no-op on 6.3.3. Verify: `swiftc -typecheck -swift-version 6 -Werror UntypedThrows <file>` on 6.4. RUN: yes, `F/b-infer/perf/run.sh` (6.4 untyped rc=1, typed rc=0; 6.3.3 both rc=0 with `unknown warning group`).
7. **SW-ERR-07 The public error domain is one struct with Code, message, cause.** `struct XError: Error, Sendable` with `struct Code: RawRepresentable, Hashable, Sendable` (static members), `message`, `cause: (any Error)?`; new failures are new `Code`s. A public `enum` error exists only if `@nonexhaustive` (from its first release) or a documented closed domain. Why: finding 7; enum case addition breaks exhaustive consumers (typed or not). Verify: list public error enums for review - `grep -rn --include='*.swift' -e 'public enum [A-Za-z]*Error' -e 'public enum [A-Za-z]*Failure' Sources`; every hit must show `@nonexhaustive`, `@frozen` or a closed-domain note. RUN: compile evidence yes (`F/a/untyped-v2-newcase` rc=1, `F/a/nonex-v2` rc=0 + warning, `F/a/struct-v2` rc=0); the grep was run on `F/c-grep` and lists `public enum LoadError` in both red and green, so it is a review list (rc=0 on both), not a gate. Template tests: `F/g-template` rc=0 on both toolchains.
8. **SW-ERR-08 Chain causes structurally; never stringify them.** Wrap with `cause: error`; never `throw X("failed: \(error)")`. Why: stringifying drops the type, the code, and any `LocalizedError`/underlying chain (only ~7.7% of corpus error types keep a cause). Verify: `grep -rnE --include='*.swift' -e 'throw .*\\\(error\)' -e 'throw .*\\\(err\)' -e 'throw .*\\\(e\)' Sources` (single-line only). RUN: yes, K7 (red rc=0: `Api.swift:22`, `:27`; green rc=1).
9. **SW-ERR-09 Every error type has a description a person can read.** Conform to `CustomStringConvertible` always; add `LocalizedError` with `errorDescription` returning `description` when Foundation/Apple UI may consume it; message is one sentence, outermost context first, ending with the cause (`write /data/x failed: open /data failed`), no `Error:` prefix (ArgumentParser adds it). Why: ArgumentParser prints `String(describing:)` or `errorDescription`; a bare enum prints `Error: missing`, a plain struct a type dump. Verify: reading heuristic plus the run table in finding 8; automated floor: every `: Error` type in a CLI target appears in a file that also contains `CustomStringConvertible` or `LocalizedError` - `grep -rL --include='*.swift' -e 'CustomStringConvertible' -e 'LocalizedError' Sources` lists files with NO description (then read for `: Error`). RUN: ArgumentParser behaviour yes (`F/e-argparse`, 9 cases, 6.4 = 6.3.3); the `-rL` file filter is a reading aid, not run.
10. **SW-ERR-10 Never use `localizedDescription` to build user text outside UI code.** Use `"\(error)"`/`String(describing:)`. Why: plain Error prints `The operation could not be completed. (main.D error 1.)` on Linux (f-desc). Verify: `grep -rn --include='*.swift' -e 'localizedDescription' Sources` (output = candidates; UI-layer files are allow-listed by path with `--exclude-dir=UI`). RUN: yes, K5 (red rc=0, green rc=1) and `F/f-desc` table.
11. **SW-ERR-11 `ValidationError` for usage problems; `ExitCode` for silent exits.** In ArgumentParser commands throw `ValidationError("...")` for bad input (stderr: `Error: ...` + usage, exit 64), `ExitCode(n)` to exit without text, any other error for runtime failure (exit 1). Why: measured table in finding 8. Verify: run the binary with a bad input and assert exit 64 and the `Usage:` line on stderr (a test, not a grep). RUN: yes, `F/e-argparse` (`validation` rc=64, `exit3` rc=3).
12. **SW-ERR-12 Do not branch on error text.** Match on type or `code` (`(error as? XError)?.isCode(.interrupted)`), never `.contains` on `String(describing: error)` or `localizedDescription`. Why: finding 10 (container Application.swift:135-137 vs XPCClient.swift:145). Verify: K4 command below. RUN: yes, K4 (red rc=0, 2 hits; green rc=1). Corpus: 9 hits, 3 true flow; the assignment pattern `errorX: String = String(describing: ` is a review trigger.

    `grep -rnE --include='*.swift' -e '[eE]rror[A-Za-z]*(: String)? = String\(describing: ' -e 'localizedDescription\.contains\(' -e 'localizedDescription\.hasPrefix\(' -e 'localizedDescription\.hasSuffix\(' -e 'localizedDescription ==' -e 'String\(describing: [A-Za-z.]*[eE]rr[A-Za-z]*\)\.contains\(' -e 'String\(describing: [A-Za-z.]*[eE]rr[A-Za-z]*\)\.hasPrefix\(' Sources`
13. **SW-ERR-13 No empty or log-only catch.** A `catch` either propagates (`throw`/`throw Wrapped(cause: error)`), handles with a real fallback and a stderr/log record at the layer that ends the error, or carries a comment that states why discarding is safe. Why: a swallowed write reports success (b-swallow red: `saved 7 bytes`, exit 0). Verify, K1 and K2 (output = violation): `grep -rEzo --include='*.swift' -e 'catch[[:space:]]*(let [A-Za-z_]+[[:space:]]*)?\{[[:space:]]*\}' Sources` and K2 as in the run table; plus SwiftLint `only_rules: [no_empty_block]` with `swiftlint lint --strict`. RUN: yes, K1/K2 red rc=0 / green rc=1; `no_empty_block` red rc=2 / green rc=0 (both toolchains build the plants clean).
14. **SW-ERR-14 No `try?` on a write, remove, copy, create or decode without a stated reason.** Mutating and decoding calls propagate. Allow-list: `try? /* swallow-ok: <reason> */ call(...)`; best-effort cleanup (`defer { try? FileManager.default.removeItem(...) }`) carries the same marker. Why: finding 9; 38 of 136 corpus `removeItem` sites are `defer`-adjacent cleanup, the rest need a reason. Verify: K3 `grep -rnE --include='*.swift' -e 'try\? [^/]*\.write\(' -e 'try\? [^/]*\.removeItem\(' -e 'try\? [^/]*\.moveItem\(' -e 'try\? [^/]*\.copyItem\(' -e 'try\? [^/]*\.createDirectory\(' -e 'try\? [^/]*\.decode\(' Sources`. RUN: yes (red rc=0 with 3 hits, green rc=1 with marker-bearing `try?` and a read-only `try? Data(contentsOf:)` untouched).
15. **SW-ERR-15 Exactly one layer logs an error: the layer that ends it.** Entry points, request/RPC handlers that convert an error into a response, and loops that continue after a failure log once, with the full chain (`logger.error("...", error: e)` or `metadata: ["error": "\(error)"]`); every other layer adds context (`cause:`) and throws, never both. Libraries log at `info` or below and never log an error they also throw. Why: 3 lines vs 1 for one failure (finding 11); swift-log best practice. Verify: K8 `grep -rPzo --include='*.swift' -e 'catch[^{}]*\{[^{}]*\blog(ger)?\.[a-z]+\([^{}]*\)[^{}]*throw ' Sources` lists log-then-throw catches (each must be a response-converting boundary, with a comment); reading heuristic: trace one failure and count the lines. RUN: yes, K8 (red rc=0, green rc=1) and the 3-vs-1 output in `F/d-logging`.
16. **SW-ERR-16 Log-and-continue in app UI code is allowed only at a user-visible boundary.** The K2 hit list in app targets (element-x-ios 242) is a review list, not a gate; a log-only catch there must be the last handler before the UI. Verify: K2 plus review. RUN: K2 yes; the "UI boundary" judgement is a reading heuristic.

## Verification runs

Conventions: `F` = `/home/mherwig/.cache/research-lang/swift-tools/fixtures/error-contracts`. grep exit codes: 0 = matches (violation printed), 1 = no match (pass). Builds use `--scratch-path "$SWIFT_SCRATCH/error-contracts/<name>-<ver>"` through `run.sh`; nothing built inside an exemplar. "6.3" = `SWIFT_VERSION=6.3` (image reports swift-6.3.3-RELEASE).

| id | fixture | command (verbatim) | violation | twin | key output |
|---|---|---|---|---|---|
| V1 typed API break | `F/a/typed-v2-widen` vs `F/a/untyped-v2-newtype` | `F/a/run.sh <dir>` (= `swift build`) | rc=1 | rc=0 | `error: type 'ReadError' has no member 'missing'` (App/main.swift:6:15). 6.3.3 same. |
| V1b typed newtype | `F/a/typed-v2-newtype` | `F/a/run.sh typed-v2-newtype` | rc=1 | (twin above) | `thrown expression type 'ParseError' cannot be converted to error type 'LoadError'` |
| V1c new case (not typed-specific) | `F/a/typed-v2-newcase`, `F/a/untyped-v2-newcase` | `F/a/run.sh <dir>` | rc=1 | rc=1 (both red) | `switch must be exhaustive`. Not evidence for the typed-throws rule. |
| V1d nonexhaustive | `F/a/nonex-v2`, `F/a/struct-v2` | `F/a/run.sh <dir>` | n/a | rc=0 | `nonex-v2`: `warning: switch must be exhaustive`; `struct-v2` clean. 6.4 and 6.3.3. |
| V2 closure/async/rethrows inference | `F/b-infer/cases/c01..c25` | `swiftc -typecheck -swift-version 6 <file>` via `run.sh` | c01 c02 c04 c05 c06 c08 c09 c12 c20 c23: error | c03 c07 c10 c11 c13 c14 c15 c16 c17 c18 c19 c21 c22 c24 c25: OK | e.g. c05 `thrown expression type 'any Error' cannot be converted to error type 'E'`; identical on 6.4 and 6.3.3 |
| V3 stdlib erasure | `F/b-infer/stdlib.swift` | `F/b-infer/stdlib-run.sh` | 6.4: 15 erased; 6.3: 18 erased | typed-preserving: 6 (6.4) / 3 (6.3) | listing in finding 5 |
| V4 FullTypedThrows | `F/b-infer/ftt`, `F/b-infer/cases/c01` | `swiftc -typecheck -swift-version 6 -enable-experimental-feature FullTypedThrows -Werror StrictLanguageFeatures c15-...swift`; `F/b-infer/ftt/run.sh` | experimental: `error: experimental feature 'FullTypedThrows' cannot be enabled in production compiler`; strict build rc=1 | default build with the upcoming flag: rc=0 (silent no-op) | both toolchains |
| V5 UntypedThrows | `F/b-infer/perf` | `swiftc -typecheck -swift-version 6 -Werror UntypedThrows untyped.swift` (and `typed.swift`) | 6.4 rc=1 `untyped throws performs heap allocation on each 'throw' [#PerformanceHints::UntypedThrows]` | typed rc=0; 6.3.3 both rc=0 with `warning: unknown warning group: 'UntypedThrows'` | the 6.3.3 row did not go red: the group does not exist there |
| V6 try? swallows ENOSPC | `F/b-swallow/{red,green}` | `F/b-swallow/run.sh` (builds, runs `App /dev/full`) | red: `saved 7 bytes`, exit=0 | green: `error: cannot write /dev/full: ... Code=28 "No space left on device"`, exit=1 | 6.4 and 6.3.3 identical; 0 compiler warnings |
| V7 K1 empty catch | `F/c-grep/{red,green}` | `grep -rEzo --include='*.swift' -e 'catch[[:space:]]*(let [A-Za-z_]+[[:space:]]*)?\{[[:space:]]*\}' Sources` | rc=0, `catch {}` and the multi-line `catch {\n }` | rc=1, no output | via `F/c-grep/check.sh <red|green>` |
| V8 K2 log-only/drop-only catch | same | `grep -rEzo --include='*.swift' -e 'catch[[:space:]]*(let [A-Za-z_]+[[:space:]]*)?\{[[:space:]]*print\([^{}]*\)[[:space:]]*\}' -e '...debugPrint\(...' -e '...NSLog\(...' -e '...log(ger)?\.[a-z]+\([^{}]*\)...' -e '...return( nil)?[[:space:]]*\}' -e '...continue[[:space:]]*\}' Sources` (full line in `check.sh`) | rc=0: `catch { print(error) }`, `catch let err { print(...) }`, `catch { return nil }`, `catch { logger.error(...) }` | rc=1 (green has a boundary `catch` that logs and `exit(1)`) | |
| V9 K3 try? | same | `grep -rnE --include='*.swift' -e 'try\? [^/]*\.write\(' -e 'try\? [^/]*\.removeItem\(' -e 'try\? [^/]*\.moveItem\(' -e 'try\? [^/]*\.copyItem\(' -e 'try\? [^/]*\.createDirectory\(' -e 'try\? [^/]*\.decode\(' Sources` | rc=0: `Store.swift:33,34,35` | rc=1 | green holds `try? /* swallow-ok: ... */ JSONDecoder()...` and `try? Data(contentsOf:)` |
| V10 SwiftLint no_empty_block | same | `swiftlint lint --strict --config ../.swiftlint.yml --quiet Sources` (`only_rules: [no_empty_block, untyped_error_in_catch, force_try]`) | rc=2: `Store.swift:6:41` and `:12:17` `No Empty Block Violation`; also `untyped_error_in_catch` at `:23:11` | rc=0 | `custom_rules` variant did not run (no SourceKit in the static binary) |
| V11 K4 error-text control flow | same | the K4 command in SW-ERR-12 | rc=0: `Match.swift:2`, `:6` | rc=1 | |
| V12 K5 localizedDescription | same | `grep -rn --include='*.swift' -e 'localizedDescription' Sources` | rc=0: `Match.swift:5`, `:6` | rc=1 | |
| V13 K6 public concrete typed throws | same | `grep -rPzo --include='*.swift' -e 'public[^{};]*throws\((?![A-Z]\))(?!Failure\))[A-Z][A-Za-z]*\)' Sources` | rc=0: `public func load(...) throws(LoadError)` and the multi-line `public init(` | rc=1 (green: internal typed, `throws`, `throws(E)`, `throws(Failure)`) | |
| V14 K7 stringified cause | same | `grep -rnE --include='*.swift' -e 'throw .*\\\(error\)' -e 'throw .*\\\(err\)' -e 'throw .*\\\(e\)' Sources` | rc=0: `Api.swift:22`, `:27` | rc=1 | |
| V15 K8 log-then-throw | same | `grep -rPzo --include='*.swift' -e 'catch[^{}]*\{[^{}]*\blog(ger)?\.[a-z]+\([^{}]*\)[^{}]*throw ' Sources` | rc=0 | rc=1 | |
| V16 K9 FullTypedThrows token | `F/b-infer/ftt` | `grep -rn --include='Package*.swift' --include='*.xcconfig' -e 'FullTypedThrows' .` | rc=0 `./Package.swift:6` | not planted separately (K1-K8 twins show rc=1 on files without the token) | |
| V17 logging layers | `F/d-logging/{triple,single}` | `F/d-logging/run.sh` | 3 stderr lines, exit=1 | 1 stderr line, exit=1 | 6.4 and 6.3.3 identical |
| V18 ArgumentParser output | `F/e-argparse` | `F/e-argparse/run.sh` | bare `Error: missing`; opaque struct dump; `ReasonOnly()` | described `Error: write /data/x failed: open /data failed`; localized `Error: could not reach the registry` | exits 1/1/1/1/1/1/64/3/1; 6.4 = 6.3.3 |
| V19 description matrix | `F/f-desc` | `F/f-desc/run.sh` | plain Error `localizedDescription` junk | "both" shape consistent | 6.4 = 6.3.3 |
| V20 template | `F/g-template` | `F/g-template/run.sh` (`swift test -Xswiftc -warnings-as-errors`) | n/a (no red twin) | rc=0, 2 tests pass, 6.4 and 6.3.3 | the red twin is `OpaqueError` in V18 |
| V21 corpus scan | exemplars (read-only) | `F/corpus-scan.sh` | per-repo counts | n/a | `F/corpus-scan.out`; the scan script itself uses `|` inside patterns for speed and is a measurement, not a proposed check |

Watched red on a planted fixture with a green twin: V1, V2 (10 red/15 green probes), V4, V5 (6.4 only), V6, V7, V8, V9, V10, V11, V12, V13, V14, V15 and V17 (count difference 3 vs 1): 15 verifications. Not red: V3 on 6.4 for `filter` (typed, by design), V5 on 6.3.3 (group unknown), V10 `custom_rules` (did not run), V20 (no red twin).

## Exemplar evidence

| claim | satisfies | violates / contradicts |
|---|---|---|
| SW-ERR-01 public untyped | containerization (0 typed / 1,956 untyped), container (0/1,120), swift-container-plugin (0/75), SwiftPM (1/2,565) | swift-crypto `throws(CryptoKitMetaError)` x233, closed domain mirroring CryptoKit (swift-crypto@1c80d3aff53f:Sources/Crypto/CryptoKitErrors.swift:92); swift-system `throws(Errno)` on `IORing`/`Stat` (swift-system@486d48c80fce:Sources/System/FileOperations.swift:455, `:544`) - registered closed domains, not violations |
| closed domain = struct over fixed set | swift-system `@frozen public struct Errno` (`Errno.swift:12-14`) | `CryptoKitError` is a plain public enum (`CryptoKitErrors.swift:20`): adding a case breaks exhaustive consumers; tolerable only because it mirrors Apple CryptoKit |
| SW-ERR-02/03 annotate and forward | swift-foundation `Result(catching: { () throws(DecodingError) -> Data in` (Data+Base64.swift:538, 556, 576); swift-build `throws(E)` forwarder (swift-build@2187330e13e7:Sources/SWBUtil/HeavyCache.swift:32) | swift-build `async throws(any Error)` iterator (Sources/SWBProtocol/AsyncSequence.swift:45) is the explicit untyped spelling |
| SW-ERR-07 struct + Code + cause | containerization `ContainerizationError.swift:23-29, 72-90, 94` | tuist: 270 error types, 261 enums, 250 `LocalizedError` ([shape audit](../swift-audit/exemplar-language-shape.md) Axis 5) - per-feature enums, cause rarely kept; swift-log, collections, TCA: 0 error types |
| SW-ERR-09 description | containerization (both protocols); ArgumentParser docs (`Validation.md:62`) | ArgumentParser-using CLIs with bare enums print `Error: missing` (finding 8) |
| SW-ERR-12 no text matching | container is the counter-example: `Application.swift:135-137` vs `XPCClient.swift:143-150` | tuist `cli/Sources/tuist/TuistCommand.swift:284`, `SimulatorController.swift:414` |
| SW-ERR-13 empty catch | swift-testing documents intent in the body (`Issue+Recording.swift:274`) | IceCubesApp 55 empty catches, e.g. `TimelineCache.swift:59,69` (IceCubesApp@2ad6e6891258) |
| SW-ERR-14 try? | none fully: even containerization has 63 K3 hits (52 `removeItem`) | element-x 17, tuist 27, containerization 63, container 32 |
| SW-ERR-15 one layer logs | async-http-client, hummingbird, vapor, SwiftPM, grpc-swift-2: 0 log-then-throw catches; swift-log docs | containerization 27 (RPC-boundary exception, `Server+GRPC.swift:105-110`), element-x 6 |

Re-measurement note: `F/corpus-scan.out` K2 counts are per catch block matched by the scan's logger names (`print`, `logger`, `log`, `MXLog`, `Logger`); K1 counts are lines containing `catch` in the matched text, so multi-line matches count once.

## AI-agent angle

What an LLM characteristically gets wrong here, and the smallest mechanical check:

| mistake | why it compiles / looks right | smallest check |
|---|---|---|
| `public func f() throws(MyError)` because "typed throws is the Swift 6 way" | compiles; breaks the next release | K6 grep (rule 01) |
| Unannotated closure assumed typed: `try xs.map { try typed($0) }` in a `throws(E)` function | reads naturally | compile error `any Error ... cannot be converted` (rule 03) |
| `try xs.reduce(0) { ... }` or `forEach`/`sorted(by:)` in a `throws(E)` function | same | compile error; use a loop (finding 5) |
| `async let` / task group inside `throws(E)` function, then `catch { throw error as! E }` | compiles, traps later | compile error without the cast; K-grep `as! [A-Z]...Error` (rule 05) |
| `.enableUpcomingFeature("FullTypedThrows")` to "turn on inference" | builds rc=0, no effect | K9 grep or `-Werror StrictLanguageFeatures` (rule 04) |
| `public enum FooError: Error { case a, b }` as the library error, then adding cases | compiles | K-list for public error enums, `@nonexhaustive` or struct (rule 07) |
| `throw MyError("failed: \(error)")` | compiles, loses the cause and type | K7 (rule 08) |
| `print(error.localizedDescription)` in a CLI/server | prints `The operation could not be completed. (main.X error 0.)` on Linux | K5 (rule 10) |
| `enum E: Error { case missing }` thrown from an ArgumentParser command | prints `Error: missing` | review + conformance floor (rule 09) |
| `catch { print(error) }`, `catch {}`, `try? data.write(to:)` "to keep going" | compiles with zero warnings, reports success on failure | K1/K2/K3 (rules 13/14) |
| `if error.localizedDescription.contains("timeout")` | compiles | K4 (rule 12) |
| log at every layer "for traceability" | compiles; N lines per failure | K8 + trace one failure (rule 15) |
| Calls `Task<Int, MyError> { }` | hallucinated initializer; red | compile error `requires the types 'E' and 'any Error' be equivalent` |
| Uses `-Werror UntypedThrows` on 6.3 CI | warns `unknown warning group`, passes | gate it on `swift --version` >= 6.4 |

## Contested / evolving

- **Typed throws in public API.** Official guidance has not moved since SE-0413 (2024-03): untyped by default. Counter-pressure: Apple's new low-level surfaces (swift-system `IORing`, `Stat`) are typed, and 2026 forum posts from adopters are frustrated ("disappointed", "back this whole change out"). Direction as of 2026-10: closure inference is acknowledged but unscheduled (ktoso, 2026-02-13), so the ergonomics gap, not the evolution risk, is what limits adoption.
- **Stdlib typed adoption** is moving release by release (`filter`, `mapValues`, `Dictionary(grouping:)` newly typed in 6.4; `reduce`, `forEach`, `sorted` not). Re-run `F/b-infer/stdlib-run.sh` on each new toolchain before relaxing rule 03/05.
- **`@nonexhaustive` (SE-0487, Swift 6.2.3)** is new and unused in the corpus; its future-directions text raises changing the default in a future language mode. If that happens, rule 07's enum clause relaxes; the struct+Code shape stays valid either way.
- **`LocalizedError` vs `CustomStringConvertible`.** ArgumentParser documents both as equal; containerization conforms to both; Swift Testing and swift-log interpolation only see `CustomStringConvertible`. This document recommends both when Foundation consumers exist; a CLI-only package may stop at `CustomStringConvertible`. Trend: no change expected.
- **Log-and-throw at RPC boundaries** is practised by Apple's own containerization and is correct there; the "one layer logs" rule is contested for service code that wants a log line per hop for tracing. Distributed tracing (spans) is the usual answer, and is outside this dive.
- **PerformanceHints::UntypedThrows** exists only from 6.4; whether it graduates out of the opt-in group is unknown.
- **`try?` for cleanup** is the most common legitimate swallow; whether to require a marker on every one (noise) or exempt `defer`-adjacent `removeItem` (a heuristic grep cannot see) is a taste call; this document requires the marker.

## Sources

| URL | what it is | date/era | why worth reading |
|---|---|---|---|
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0413-typed-throws.md | SE-0413 Typed throws (primary) | Swift 6.0, text revised after 6.0 | the three allowed cases, the `loadBytes` counter-example, FullTypedThrows moved to Future Directions |
| https://raw.githubusercontent.com/swiftlang/swift-book/main/TSPL.docc/LanguageGuide/ErrorHandling.md | TSPL "Error Handling", "Specifying the Error Type" (primary) | Swift 6.x book | the same three cases in the official book; `do` inference text |
| https://www.swift.org/documentation/api-design-guidelines/ | Swift API Design Guidelines (primary) | current | read in full: contains no typed-throws section though SE-0413 promised one |
| https://raw.githubusercontent.com/swiftlang/swift/main/userdocs/diagnostics/untyped-throws.md | compiler diagnostic doc for UntypedThrows (primary) | 6.4 | the cost statement and the hot-path framing |
| https://raw.githubusercontent.com/swiftlang/swift/main/userdocs/diagnostics/performance-hints.md | PerformanceHints group doc (primary) | 6.4 | "off by default", sub-groups |
| https://raw.githubusercontent.com/swiftlang/swift/main/docs/ErrorHandlingRationale.md | Swift error handling rationale (primary) | original design, 2015 | why typed propagation "promotes decentralized error handling" and swallowing |
| https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0487-extensible-enums.md | SE-0487 nonexhaustive enums (primary) | Implemented 6.2.3 | the source-break statement for public enums and the attribute's staging rules |
| https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0421-generalize-async-sequence.md | SE-0421 AsyncSequence Failure (primary) | Swift 6.0 | the one concurrency place typed errors survive |
| https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0489-codable-error-printing.md | SE-0489 DecodingError printing (primary) | Swift 6.3 | why decoding errors print readably now |
| https://github.com/apple/swift-log (README and Sources/Logging/Docs.docc/BestPractices/001-ChoosingLogLevels.md, 002-StructuredLogging.md, ImplementingALogHandler.md @4038b6a4f74a) | swift-log docs on log levels, errors, libraries (primary) | 1.16.x, Oct 2026 | libraries log at info or lower; structured error metadata |
| https://github.com/apple/swift-argument-parser (Sources/ArgumentParser/Usage/MessageInfo.swift, Utilities/Foundation.swift, Documentation.docc/Articles/Validation.md @efd239f0055b) | the tool's own source for error printing (primary) | 1.8.2 | `describe()` and the dispatch that decides stderr text and exit code |
| https://forums.swift.org/t/cannot-compose-apis-that-use-typed-throws/84716 | Swift Forums, ktoso on missing closure inference | 2026-02 | current core-team status of closure inference |
| https://forums.swift.org/t/is-throws-type-checking-really-this-limited/87276 | Swift Forums, Swift 6.3.1 report | 2026-06 | confirms no inference and the `do throws(E)` workaround |
| https://forums.swift.org/t/where-is-fulltypedthrows/72346 | Swift Forums, FullTypedThrows missing | 2024-06 | origin of the "flag does nothing" confusion |
| https://github.com/apple/containerization/blob/main/Sources/ContainerizationError/ContainerizationError.swift (@3e7bc39e66b3) | the error type of an OCI toolkit | Oct 2026 | the struct + Code + cause template in production |
| https://github.com/apple/swift-system/blob/main/Sources/System/Errno.swift (@486d48c80fce) | `Errno` closed-domain error | Oct 2026 | the shape that makes typed throws safe |
| https://github.com/apple/swift-crypto/blob/main/Sources/Crypto/CryptoKitErrors.swift (@1c80d3aff53f) | `CryptoKitMetaError` umbrella enum | Oct 2026 | the largest concrete typed-throws user, a closed mirror domain |
| https://github.com/apple/container/blob/main/Sources/ContainerCommands/Application.swift (@f70ecbb926d9, lines 135-139) and Sources/ContainerXPC/XPCClient.swift (143-150) | string-matching an error and its producer | Oct 2026 | the control-flow-by-text anti-pattern with its typed alternative one file away |
| https://github.com/swiftlang/swift-foundation/blob/main/Sources/FoundationEssentials/Data/Data%2BBase64.swift (@aadd9259be07, 534-576) | toolchain code annotating typed closures | Oct 2026 | the toolchain authors' own workaround for missing inference |
| https://github.com/apple/containerization/blob/main/vminitd/Sources/VminitdCore/Server%2BGRPC.swift (@3e7bc39e66b3, 105-192) | log-then-translate at an RPC boundary | Oct 2026 | the legitimate log-and-throw exception |
| https://github.com/swiftlang/swift-testing/blob/main/Sources/Testing/Issues/Issue%2BRecording.swift (@c7d68ca20cd7, 274) | a documented empty-handler `catch` | Oct 2026 | the comment-in-body convention |
| https://github.com/realm/SwiftLint/blob/main/Source/SwiftLintBuiltInRules/Rules/Idiomatic/NoEmptyBlockRule.swift (@ec4691d9e813) | SwiftLint `no_empty_block` (tool's own repo) | 0.65.1 | the rule that treats a comment as non-empty |
