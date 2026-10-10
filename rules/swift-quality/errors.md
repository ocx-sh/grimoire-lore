---
# Read on demand through the index. This glob matches no file, so a client never auto-loads the file.
paths:
  - "**/.swift-quality-depth-on-demand"
title: Errors and Traps
summary: The SW-ERR family, owning typed throws, the public error shape, swallowed errors, which layer logs, force operations, trap policy and error text a person reads
---

# Errors and Traps

Binds to Swift 6.4.0 and 6.3.3 on Linux x86_64, the swift-format bundled with each, SwiftLint 0.65.1,
swift-argument-parser 1.8.2 and swift-log 1.16.1 (measured 2026-10-10). Apple and Windows behaviour is
`unverified: read only`.

Owns how a failure is declared, thrown, wrapped, rendered and matched, when typed throws is allowed, which
operations are forbidden because they trap, and where a trap is a legitimate invariant. Swallowed errors are
the dominant defect class here, and the compiler has no diagnostic for them, so most rows are greps. Not owned
here: the exit-status table, the usage code per platform and the root error hook are `SW-CLI` (`SW-CLI-01`,
`SW-CLI-12`), and the exit-test mechanism is `SW-TEST-11`. Network error types are rendered by `SW-NET-14`, and
secret redaction and terminal escaping of a rendered chain are `SW-SEC-14` and `SW-SEC-17`. Integer
conversions that trap on untrusted input are `SW-SEC` rows, and the SDK's own error struct is `SW-API-17`. The
swift-format invocation and its wiring are `SW-GATE-02` and `SW-GATE-28`, the manifest feature guard is
`SW-PKG-02`, and the `@nonexhaustive` guard is `SW-API-05`.

Contents: [Dates and Defaults](#dates-and-defaults) · [The Compiler](#the-compiler) ·
[The Format Lint](#the-format-lint) · [Greps With a Directory Operand](#greps-with-a-directory-operand) ·
[Review Lists and Reading Heuristics](#review-lists-and-reading-heuristics) ·
[Run the Binary or the Test](#run-the-binary-or-the-test) · [Error Shape and Text](#error-shape-and-text) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Defaults

- Floors: typed throws is Swift 6.0. `@nonexhaustive` is SE-0487 and compiler-gated at 6.2.3 (a consumer on
  6.2.0 to 6.2.2 cannot parse it). Exit tests are Swift 6.2 (ST-0008). The `UntypedThrows` group is 6.4 only
  (SE-0522). The three `Never*` swift-format rules exist
  in the toolchains of 6.3.3 and 6.4.0 (measured 2026-10-10).
- **Pinned defaults, the adopter may override each:**
  - The marker comments `swallow-ok:` and `invariant:` are program conventions. No tool recognises them
    and only the greps below read them (`SW-SEC` owns `truncate-ok:` and `wrap-ok:`).
  - A new package enforces `SW-ERR-05` over the whole tree. An existing repository lints changed files with
    `BASE=origin/main bash "$CHECKS/never-gate.sh"` (`SW-GATE-28`), never a bare `git diff --name-only`, which
    is empty once the change is committed, and never lowers the config to fit.
  - The registry of closed-domain typed-throws types (`SW-ERR-08`) lives in the repository's own rules file,
    and each listed type is also `@frozen`.
- The greps are the gate. The static Linux SwiftLint skips `custom_rules` silently and exits 0, so a `custom_rules`
  mirror counts only after a planted violation turns it red on the SourceKit image (`SW-GATE-11`).
- Source trees may be symlinks (RxSwift's `Sources/` is a symlink farm of 412 files): every scan here uses `grep -R` and `find -L`, because `grep -r` skips symlinked files and `find` without `-L` skips a symlinked directory, so the scan and the `SW-CORE-03` canary must count the same files (measured 2026-10-10: `find` 412 files, `grep -r` 1, `grep -R` 412).
- Every grep prints the violation, so empty output is the pass (grep exits 1). Run `bash "$CHECKS/canary.sh"`
  first (`SW-CORE-03`, `CHECKS` as in the index gate block): it exits 1 on an empty tree, and a failed canary
  stops the gate. Cells assume GNU grep with `-P` and `jq`; on macOS use `ggrep` or the perl form.

## The Compiler

The gate is the build itself: `swift build`, or `swiftc -typecheck -swift-version 6 Probe.swift` for one file.
The diagnostic text in each row is the finding, and exit 0 is the pass.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-ERR-01 | Inside a `throws(E)` function, annotate every throwing closure (`{ name throws(E) in … }`), use `do throws(E) { }` or `Result(catching:)`, and forward a closure's error with `func f<T, E: Error>(_ body: () throws(E) -> T) throws(E) -> T`, never `rethrows`. Write a loop for a stdlib API that erases. | Closure error inference does not exist on 6.4.0 or 6.3.3, and `rethrows` erases a typed error. On 6.4.0 `reduce`, `forEach`, `sorted(by:)`, `contains(where:)`, `compactMap`, `flatMap` and 9 more erase. Only `map`, `filter`, `mapValues`, `Optional.map`, `Dictionary(grouping:)` and `withoutActuallyEscaping` forward (6.3.3: `map`, `Optional.map`, `withoutActuallyEscaping`). With `E == Never` the call needs no `try`. | The compiler, in any language mode: `thrown expression type 'any Error' cannot be converted to error type 'E'` or `cannot convert value of type 'any Error' to specified type 'E'`. Watched red: 10 red and 15 green probes, re-run on both toolchains (measured 2026-10-10). Exit 0 is the pass. | SHOULD |
| SW-ERR-02 | A function that creates `async let`, task-group or `Task` children, or calls `TaskLocal.withValue`, declares plain `throws`, or folds each child into `Result<T, E>` and calls `try result.get()` once. `error as! E` is allowed only in the shim shape of `SW-ERR-05`. | These constructs erase the error. `Task<Int, E> { }` is a hallucinated initialiser (`requires the types 'E' and 'any Error' be equivalent`), and the cast traps if the failure is ever not `E`. Typed iteration of an `AsyncSequence` with a concrete `Failure` (SE-0421) is the one place typed errors survive. | The compiler errors above for `async let`, `withThrowingTaskGroup`, `Task<Int, E>` and `Task { try await typed() }`. The `Result` folds compile. `TaskLocal.withValue` erases (exit 1) and the shim compiles (exit 0) on both toolchains. Watched red (measured 2026-10-10). | SHOULD |
| SW-ERR-03 | Never list `FullTypedThrows` in `Package*.swift`, an `.xcconfig` or `-enable-upcoming-feature`. | It is not an upcoming feature on 6.4.0 or 6.3.3. `.enableUpcomingFeature("FullTypedThrows")` builds with exit 0 and does nothing, so an agent believes closure inference is on. | `SW-PKG-02`: its `StrictLanguageFeatures` error turns the listed name into `'FullTypedThrows' is not a recognized upcoming feature [#StrictLanguageFeatures::UnrecognizedStrictLanguageFeatures]`. Watched: default build exit 0, strict build exit 1, both toolchains (measured 2026-10-10). This row needs no grep of its own. | SHOULD |
| SW-ERR-04 | Enable `-Werror UntypedThrows` (`.treatWarning("UntypedThrows", as: .error)`, SE-0522) only in one module whose profile shows throw cost, and only where the oldest CI leg is 6.4 or later. Otherwise scope it with `@diagnose(UntypedThrows, as: warning, reason:)` in that module. Never package-wide. | The group sits in the off-by-default `PerformanceHints`, fires on every untyped `throws` including the public API `SW-ERR-08` prescribes, and is an `unknown warning group` no-op on 6.3.3 (exit 0), so a gate that names it is silently absent on the prior line. `SW-GATE-15` owns the rule against naming a group the oldest leg lacks. | `swiftc -typecheck -swift-version 6 -Werror UntypedThrows Probe.swift`: on 6.4.0 `untyped throws performs heap allocation on each 'throw' [#PerformanceHints::UntypedThrows]` (exit 1), typed twin exit 0. On 6.3.3 both exit 0 with `unknown warning group: 'UntypedThrows'`, so the check did not go red there. | CONSIDER |

```swift
// wrong: no closure inference, so the body throws any Error and the build fails
func load(_ names: [String]) throws(LoadError) -> [Item] {
    try names.map { try read($0) }
}

// right: the closure is annotated and map forwards its typed error
func load(_ names: [String]) throws(LoadError) -> [Item] {
    try names.map { (name) throws(LoadError) in try read(name) }
}
```

## The Format Lint

The gate is the `SW-GATE-02` `swift format lint --strict` step, reading a config that enables all three rules.
It exits 1 on a finding and exits 0 with findings when `--strict` is missing. `SW-ERR-06` checks that the config
is wired, and the second block applies only where SwiftLint is already the linter (a `Skipping enabled rule`
line is a failed gate, `SW-GATE-11`).

```json
{ "rules": { "NeverForceUnwrap": true, "NeverUseForceTry": true, "NeverUseImplicitlyUnwrappedOptionals": true } }
```

```sh
# SwiftLint only: opt_in_rules: [force_unwrapping] and force_unwrapping: {severity: error} in .swiftlint.yml
if test -f .swiftlint.yml; then bash "$CHECKS/swiftlint-gate.sh" Sources; else echo "SKIP: no .swiftlint.yml, SwiftLint is not the linter here"; fi

# G7: each config that does NOT enable all three rules is printed. Prerequisite: the config exists
test -f .swift-format || echo "MISSING .swift-format"
for r in NeverForceUnwrap NeverUseForceTry NeverUseImplicitlyUnwrappedOptionals; do
  grep -RL --include='.swift-format*' --exclude-dir='.build*' --exclude-dir=.git -e "\"$r\" *: *true" .
done
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-ERR-05 | Non-test code you write or touch has no `!` force unwrap, `try!`, `as!` or `T!` declaration. The only carve-outs are (a) a static-literal initialiser or compile-proven value and (b) the one provable shim `do { return try erasingAPI(…) } catch { throw error as! E }` (`SW-ERR-02`). Each carries `// swift-format-ignore: <Rule>` and an adjacent comment stating the invariant. Prefer a regex literal (`/^[a-z]+$/`) over `try! NSRegularExpression(pattern:)`. A repository whose `.swift-format` keeps the three rules off cites `SW-GATE-28`. | A trap on a value the compiler could not prove is a remote crash when a peer supplied it. The corpus had 3,364 `!`, 620 `try!`, 378 `as!` and 209 IUO in production code. The rules are off by default and lint-only, and `swift format lint` without `--strict` exits 0 with findings (12 of 12 runs). swift-log keeps the one allowed `error as! Failure` shape (swift-log@4038b6a4f74a:Sources/Logging/Logger+With.swift:60) with its own `NeverForceUnwrap` off, so it is precedent for the shim and not for an unannotated cast. | The `SW-GATE-02` step: exit 1 on a finding. Watched red: `--strict` red exit 1, green exit 0, non-strict red exit 0 (measured 2026-10-10). Cheap fallback: `bash "$CHECKS/k07.sh" e09 e15`, empty output = pass. A justified carve-out still prints under K-07 E09 and E15 (`swift-format-ignore`), so quote it in the pull request (`SW-GATE-10`). SwiftLint exits 2 on a finding with `force_unwrapping` at error severity (default severity exits 0 without `--strict`) and silently ignores `URL(string: "literal")!` and four sibling literal initialisers. Reason check, a reading heuristic because neither tool checks that a reason exists: `grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' -B1 -A1 --include='*.swift' -e 'swift-format-ignore: Never' -e 'swiftlint:disable:next force_' Sources`, then confirm each hit's neighbour says why it cannot fail. Counter-example: swift-argument-parser@efd239f0055b:Sources/ArgumentParser/Parsing/SplitArguments.swift:331 ("I don't know why this is safe"). | MUST |
| SW-ERR-06 | The config file that enables the three rules is the file the gate command reads. | apple/containerization enables them in `.swift-format` but lints with `.swift-format-nolint`, where all three are `false` (containerization@3e7bc39e66b3:Makefile:505, `.swift-format-nolint:35-37`). Against its own `.swift-format` its Sources have 57 `NeverForceUnwrap`, 5 `NeverUseForceTry` and 1 IUO finding. 18 of 24 corpus `.swift-format` files keep the rules off. | G7 above: each printed line is a config that does not enable a rule, empty output = pass. With no config at all the three greps print nothing, so the `test -f` prerequisite is part of the check. Then read the gate command (Makefile or CI) and confirm it passes the listed-clean file. Watched red: 3 lines on the plant, 0 on the twin, and the absent-config false green caught (measured 2026-10-10). | MUST |
| SW-ERR-07 | Test code uses `try #require(x)` (Swift Testing) or `try XCTUnwrap(x)`, never `!`. `try!` is for literal fixtures only. | swift-format exempts any file that imports `XCTest` or `Testing`, and SwiftLint exempts nothing without a nested config. A `!` on nil inside a Swift Testing test crashes the process (`Program crashed: Illegal instruction`) and the run summary is never printed, while `#require` records one issue and the run finishes. A production file that merely imports `Testing` is also exempt from the swift-format rule. | Review list, not a gate: `grep -Rn --include='*.swift' -e 'try!' -e ' as! ' Tests`. Empty output = nothing to review. The behaviour was watched (`#require` on nil exits 1 with a summary, `!` on nil crashes with none, both toolchains). The grep is an inventory and was not run on a real Tests tree. | SHOULD |

## Greps With a Directory Operand

Run these over `Sources`, and empty output is the pass. G4 is an inventory for changed files in boundary targets
(CLI, parser, decoder, router, middleware), because a whole-tree run is noise (1,136 hits in swift-nio).

```sh
# K6: public API with a concrete typed throws, multi-line signatures included. Limit: misses a member of a public extension
grep -RPzo --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'public[^{};]*throws\((?![A-Z]\))(?!Failure\))(?!ErrorType\))[A-Z][A-Za-z]*\)' Sources

# K4: control flow by matching error text
grep -RnE --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e '[eE]rror[A-Za-z]*(: String)? = String\(describing: ' -e 'localizedDescription\.contains\(' \
  -e 'localizedDescription\.hasPrefix\(' -e 'localizedDescription\.hasSuffix\(' -e 'localizedDescription ==' \
  -e 'String\(describing: [A-Za-z.]*[eE]rr[A-Za-z]*\)\.contains\(' -e 'String\(describing: [A-Za-z.]*[eE]rr[A-Za-z]*\)\.hasPrefix\(' Sources

# K1: empty catch, any layout and any pattern (a comment line in the body counts as non-empty). The catch starts a statement or follows a `}`, so the word in a doc comment or a protocol body is no hit (the unanchored form printed Catchable.swift on PromiseKit, 2026-10-10)
grep -RPzo --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e '(?m)(^[ \t]*|\}[ \t]*)catch\b[^{};]*\{\s*\}' Sources

# K3: try? on a mutating or decoding call, minus lines carrying the marker and the `if let x = try? container.decode(T.self)` type-probe of a single-value decoder
grep -RnE --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'try\? [^/]*\.write\(' -e 'try\? [^/]*\.removeItem\(' -e 'try\? [^/]*\.moveItem\(' \
  -e 'try\? [^/]*\.copyItem\(' -e 'try\? [^/]*\.createDirectory\(' -e 'try\? [^/]*\.decode\(' Sources \
  | grep -v -e 'swallow-ok:' -e 'if let .* = try? [A-Za-z]*[cC]ontainer\.decode('

# K7: error text interpolated into a new error, cause lost. Single-line form only
grep -RnE --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'throw .*\\\(error\)' -e 'throw .*\\\(err\)' -e 'throw .*\\\(e\)' Sources

# G4: trap as validation. Scope to changed boundary files. Golden-output, test-support and playground directories are not shipped code (SwiftGen: 455 of 459 `fatalError` hits sat in `Sources/TestUtils/Fixtures`, measured 2026-10-10): the excludes name them, and a tree with others (`Snapshots`, `Golden`) adds its own
grep -RlZ --include='*.swift' --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' -e 'precondition' -e 'fatalError(' -e 'assert(' Sources | xargs -0 -r awk '
  FNR == 1 { doc = 0; seen = 0 }
  /^[ \t]*\/\/\// { if ($0 ~ /- Precondition:/) { doc = 1; seen = 0 }; next }
  /^[ \t]*\/\// { next }
  /^[ \t]*((@[A-Za-z]+|public|open|package|internal|private|fileprivate|static|class|final|override|mutating|nonisolated|convenience|required) +)*(func|init|subscript)[ (<?!]/ { if (seen) doc = 0; seen = 1 }
  /invariant:/ { next }
  /precondition|fatalError\(|assert\(/ { if (doc && $0 ~ /precondition/) next; print FILENAME ":" FNR ":" $0 }'

# G6: -Ounchecked anywhere in manifests, CI or scripts
grep -Rn --exclude-dir='.build*' --exclude-dir=.git --include='Package*.swift' --include='*.yml' --include='*.yaml' \
  --include='*.sh' --include='*.bzl' --include='BUILD.bazel' --include='*.bazelrc' -e 'Ounchecked' .
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-ERR-08 | A `public` or `open` function, initialiser or accessor declares plain `throws`, never `throws(ConcreteType)`. Concrete typed throws is allowed only in internal, package and fileprivate code, in a registered closed domain (a `@frozen` struct over a fixed set such as `Errno`, or a decoder's fixed failure list) and in Embedded targets. Binds library and SDK public API. CLI, server and app targets have no public consumers. | With a typed signature the next failure has nowhere to go but a wider type, which breaks every consumer: planted typed widen exit 1 (`type 'ReadError' has no member 'missing'`), untyped twin exit 0. SE-0413: "untyped throws is better for most scenarios". The three OCI exemplars use 0 typed throws against 3,151 untyped. The Embedded exception rests on SE-0413 text and was not exercised. | K6. Append one `(?!Name\))` lookahead per registered closed-domain type and per multi-letter generic error parameter used in the tree. Watched red: two hits (single-line and multi-line `public init(`), green exit 1 (measured 2026-10-10). | MUST |
| SW-ERR-09 | Match an error by its type or a `code` (`(error as? XError)?.isCode(.interrupted)`), never by `.contains`, `.hasPrefix` or `==` on `String(describing: error)` or `localizedDescription`. | Wording is not a contract and nothing type-checks it. apple/container matches `"XPC connection error"` (container@f70ecbb926d9:Sources/ContainerCommands/Application.swift:135-136) although the producer already sets `code = .interrupted` (Sources/ContainerXPC/XPCClient.swift:143-150). Corpus: 9 hits, 3 true control flow. | K4. The `errorX: String = String(describing: ` form is a review trigger and the `.contains(` forms are near-certain. Watched red: two hits, green exit 1 (measured 2026-10-10). | MUST |
| SW-ERR-10 | No empty `catch`. A `catch` that discards on purpose has a comment line in its body: `// swallow-ok: best-effort temp cleanup`. | 122 empty catches in the corpus, 55 in IceCubesApp alone (IceCubesApp@2ad6e6891258:Packages/Timeline/Sources/Timeline/actors/TimelineCache.swift:59). swift-testing documents its one intent in the body (swift-testing@c7d68ca20cd7:Sources/Testing/Issues/Issue+Recording.swift:274). swift-format has no equivalent rule. | K1, multi-line aware. Second check where SwiftLint is the linter: `only_rules: [no_empty_block]` then `swiftlint lint --strict --config .swiftlint.yml Sources` (exit 2 on a finding). Both treat a comment in the body as non-empty. Known false-positive class: lint-rule example strings. Watched red: K1 exit 0 with hits, green exit 1, `no_empty_block` exit 2 on the plant (measured 2026-10-10). | MUST |
| SW-ERR-11 | No `try?` on a `write`, `removeItem`, `moveItem`, `copyItem`, `createDirectory` or `decode` call without a trailing `// swallow-ok: <reason>` on the same line. Best-effort cleanup (`defer { try? FileManager.default.removeItem(…) }`) carries the same marker. | `try? data.write(to: URL(fileURLWithPath: "/dev/full"))` followed by `print("saved 7 bytes")` exits 0 with no compiler warning, while the propagating twin prints ENOSPC and exits 1. Corpus: 284 production hits, 136 of them `removeItem` and 38 of those next to a `defer`. containerization has 63 (containerization@3e7bc39e66b3:Sources/Containerization/UnixSocketRelay.swift:84). | K3, whose last pipe stage drops the marked lines and the container type-probe chain (SwiftGen's `AnyCodable.swift` printed 17 such lines before, 0 after, measured 2026-10-10). Limit: misses a `/` before the method name, and a probe through a variable not named `*container` stays a hit to read. Watched red at runtime (`saved 7 bytes` exit 0 against the throwing twin's exit 1, both toolchains) and as a grep (hits on the planted write and removal, green exit 1 with marker-bearing, `defer` and read-only `try? Data(contentsOf:)` lines untouched, measured 2026-10-10). | MUST |
| SW-ERR-12 | Chain a cause with `cause: error`. Never `throw X("failed: \(error)")`. | Stringifying drops the type, the code and any `LocalizedError` chain. About 75 of 973 corpus error types (7.7%) keep a cause. | K7, which sees only the one-line form, so the row is SHOULD. Watched red: hits at both planted `throw` lines, green exit 1 (measured 2026-10-10). | SHOULD |
| SW-ERR-14 | Input from outside the process (argv, env, file, network, JSON, manifest, FFI return) is validated by throwing. `precondition`, `preconditionFailure`, `assert` and `fatalError` never guard it, and `assert` never validates anything. Binds servers, CLIs, parsers, any library parsing untrusted bytes and Apple apps decoding data. | A trap cannot be caught, kills every concurrent task and is the shape of two 2026 advisories: swift-nio CVE-2026-43678 (a WebSocket length through `Int(_:)` trapped before `maxFrameSize`) and Hummingbird CVE-2026-97697 (`5...2` built from a `Range:` header aborted the process). `assert` is removed in `-O`: `assert` on a bad port exits 0 and prints `listening on 70000`. External integers are validated before conversion by the `SW-SEC` conversion rows. | G4 on changed boundary files, every surviving line is a finding, plus the thrown-error exit test of `SW-ERR-17`. Watched red: 4 lines on the plant, 0 on the twin (annotated precondition). At runtime `precondition` on a bad port exits 132 and the throwing twin exits 64 (release build, main thread, `SWIFT_BACKTRACE=enable=no`, measured 2026-10-10). | MUST |
| SW-ERR-16 | Never compile with `-Ounchecked`. | It removes every `precondition`, makes `Int.max - 2 + 70000` print `-9223372036854705811` and `Int(2^63)` print `-9223372036854775808`, and turns an out-of-range index into a segfault (139, `SWIFT_BACKTRACE=enable=no`). 0 of 40 exemplars use it. | G6, over manifests, CI and scripts. Watched red: 2 lines on the plant (`unsafeFlags` in `Package.swift` and a CI file), 0 on the twin (measured 2026-10-10). | MUST |

```swift
// wrong: reports success when the write failed, and the empty catch hides the next one
try? data.write(to: url)
do { try publish(url) } catch {}

// right: the failure propagates, and a deliberate discard names its reason
try data.write(to: url)
try? FileManager.default.removeItem(at: tmp)  // swallow-ok: best-effort temp cleanup
```

## Review Lists and Reading Heuristics

These rows have no mechanical verdict. K2 and K8 build a work list that is read. Empty output = empty list.

```sh
# K2: log-only or drop-only catch
grep -REzo --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' \
  -e 'catch[[:space:]]*(let [A-Za-z_]+[[:space:]]*)?\{[[:space:]]*print\([^{}]*\)[[:space:]]*\}' \
  -e 'catch[[:space:]]*(let [A-Za-z_]+[[:space:]]*)?\{[[:space:]]*debugPrint\([^{}]*\)[[:space:]]*\}' \
  -e 'catch[[:space:]]*(let [A-Za-z_]+[[:space:]]*)?\{[[:space:]]*NSLog\([^{}]*\)[[:space:]]*\}' \
  -e 'catch[[:space:]]*(let [A-Za-z_]+[[:space:]]*)?\{[[:space:]]*log(ger)?\.[a-z]+\([^{}]*\)[[:space:]]*\}' \
  -e 'catch[[:space:]]*(let [A-Za-z_]+[[:space:]]*)?\{[[:space:]]*return( nil)?[[:space:]]*\}' \
  -e 'catch[[:space:]]*(let [A-Za-z_]+[[:space:]]*)?\{[[:space:]]*continue[[:space:]]*\}' Sources

# K8: log then throw in one catch
grep -RPzo --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'catch[^{}]*\{[^{}]*\blog(ger)?\.[a-z]+\([^{}]*\)[^{}]*throw ' Sources
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-ERR-13 | Exactly one layer logs an error: the layer that ends it (the entry point, a request or RPC handler that converts the error into a response, a loop that continues after a failure). Every other layer adds context with `cause:` and throws. A function never logs an error it also throws, and a library logs at `info` or below. A log-only or drop-only `catch` is allowed only at the ending layer (in an app target, the last handler before the UI). | Logging at three layers printed 3 lines for one failure, and one layer printed 1 with the full chain. swift-log: "Libraries should use info level or less severe" (swift-log@4038b6a4f74a:Sources/Logging/Docs.docc/BestPractices/001-ChoosingLogLevels.md:41). The legitimate exception is an RPC handler translating to a status (containerization has 27 such sites, Server+GRPC.swift:105-110). Log-only catches: element-x-ios 242, containerization 29. | K2 and K8 as review lists, plus the reading heuristic "trace one failure and count the stderr lines". The grep cannot see the ending-layer boundary, so the judgement is read. Watched red: K8 red exit 0 with hits, green exit 1. K2 four hits on the plant, green exit 1 (measured 2026-10-10). | SHOULD |
| SW-ERR-15 | `fatalError("…")` marks a state the module established as unreachable. `precondition` is reserved for a documented caller contract and carries `// invariant: <why>` or a `- Precondition:` doc line. A public API that traps on an argument offers a non-trapping sibling (`get*` returning `nil`, a `throws` overload) wherever the argument can be external. | `fatalError` is the only primitive kept in all of `-Onone`, `-O` and `-Ounchecked` (`precondition` under `-Ounchecked` prints `listening on 70000`). SwiftPM review asked for `fatalError` over `preconditionFailure` (swift-package-manager PR 10497, merged 2026-10-05 with `fatalError`). swift-nio documented that `set*(at:)` traps by design, unlike `get*`, after a report was closed as working as intended (swift-nio commit 53ac1ccab23f). | G4 for the unannotated hits: it skips `//` and `///` lines, a same-line `invariant:` and a `precondition(` inside the first function after a `- Precondition:` doc line (a heuristic: a nested function ends the exemption, and prose-form docs such as swift-numerics `Complex(length:phase:)` still print). The reading heuristic "every `public` function containing `precondition(` has a `- Precondition:` line in its doc comment" stays. Watched (measured 2026-10-10, GNU awk and mawk 1.3.4): a plant with a documented, an undocumented, a `fatalError` and a post-doc `precondition(` prints 3 lines, the twin with doc line, prose and `invariant:` forms 0. The `-Ounchecked` behaviour was watched earlier. | SHOULD |

## Run the Binary or the Test

Run the built binary on the failing input, because no grep sees an exit status or the text on stderr. Rename
`mytool` and the arguments to your executable and each documented failure path. Windows and WASI usage codes are `SW-CLI-12`.

```sh
timeout 30 .build/debug/mytool --port 70000; echo "exit=$?"                                  # a documented status (SW-CLI-01), never 132 or 124 (124 = hung)
timeout 30 .build/debug/mytool --file /nonexistent 2>err.txt >/dev/null; echo "exit=$?"; grep -c -e 'Error Domain=' err.txt   # same exit rule, and the count must be 0: a trap also prints 0 here, so the exit decides
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-ERR-17 | A CLI throws a typed error for operational failure and never traps. Bad invocation is a thrown `ValidationError`, bad data is a thrown typed error, and the statuses are the `SW-CLI-01` table. A trap (132, 134 or 139 on x86_64 Linux, measured 2026-10-10) is never a documented status. An integration test runs the built binary on the bad input and asserts the status, empty stdout, an `Error:` or `error:` line on stderr (case-insensitive) and no `Fatal error`. For an SDK, map the child's exit code to a `Code`, never to text. | `precondition` on a bad `--port` exits 132 in `-O` with a 47-line backtrace on stderr under the default backtracer (the same exit 132 with `SWIFT_BACKTRACE=enable=no`, which prints nothing) and loses buffered stdout. The throwing twin prints `Error: port out of range: 70000 (expected 1...65535)` through ArgumentParser (`error: ...` through the `SW-CLI-23` root hook) and exits with the usage status. | The first line of the block: `exit=` must equal the `SW-CLI-01` usage status (64 on Unix, measured 2026-10-10). This is a test and not a grep. Watched red: trap exit 132 against throw exit 64, both toolchains and `SWIFT_BACKTRACE=enable=no`, and `ValidationError` exit 64 against `ExitCode(3)` exit 3. | MUST |
| SW-ERR-18 | No Foundation error dump reaches a person: the stderr of a failing run contains no `Error Domain=`. Wrap an error thrown by Foundation (`CocoaError`, `POSIXError`) at the catch site with operation and path context, keep it as `cause`, and render a foreign Foundation cause with `localizedDescription`, never by interpolation. Render your own errors with their description. A network error type is `SW-NET-14`'s. | A raw `Data(contentsOf:)` failure through ArgumentParser prints `Error: Error Domain=NSCocoaErrorDomain Code=260 "The file doesn’t exist."UserInfo={...}` (6.4.0 and 6.3.3). `localizedDescription` gives the readable `The operation could not be completed. The file doesn’t exist.` Apple-platform wording differs: `unverified: read only`. | The second line of the block must print `0`, once per Foundation failure path the CLI documents (the first line's `--port` path never raises a Foundation error). Watched red: the raw `CocoaError`, raw `POSIXError` and interpolated-wrapper cases print 1, the `localizedDescription`, `render` and chained-cause cases print 0 (measured 2026-10-10). | SHOULD |
| SW-ERR-19 | Every documented trap and every documented throw is covered by a test. A throw: `#expect(throws: E.case) { try f(bad) }`. A trap uses an exit test, whose form is `SW-TEST-11`'s (Swift 6.2, XCTest has no equivalent). Below a 6.2 toolchain floor there is no exit test: run the built binary or a `Process` child through the `SW-TEST-15` harness and assert the trap's status (132) as its own fact, and read the `SW-TEST-15` tests where this row's grep reads `processExitsWith`. | "You cannot test a trap" is pre-6.2 knowledge. The exit test passed against the trapping function and went red when pointed at the throwing one. Binds the test code of libraries with documented preconditions. | `grep -Rn --include='*.swift' -e 'processExitsWith' Tests` must be non-empty for every module that documents a `- Precondition:`. Empty output = fail for such a module. The count of documented traps equalling the count of exit tests is a reading heuristic. The mechanism was watched (green exit 0, red control exit 1 with `expected exit status ".failure", but ".exitCode(EXIT_SUCCESS)" was reported instead`, both toolchains). | SHOULD |

```swift
// wrong: a bad --port traps, exits 132 and prints a backtrace instead of a message
precondition((1...65535).contains(port), "port out of range")

// right: a thrown error that the framework prints once and maps to the usage status
guard (1...65535).contains(port) else {
    throw ValidationError("port out of range: \(port) (expected 1...65535)")
}
```

## Error Shape and Text

Two perl scans print each violation, and empty output is the pass. A cross-file `extension X: CustomStringConvertible`
is a false positive of N2, so pass it every file that could hold a conformance. N1 does not see a conformance
declared in an extension. N2 also prints a doc-comment or generic-argument match (`Task<Void, Error>`, a
lowercase or bare `Error` name); skip it on reading.

```sh
# N1: public error enums without @nonexhaustive or @frozen
find -L Sources -name '*.swift' -not -path '*/Fixtures/*' -not -path '*/TestUtils/*' -not -path '*.playground/*' -print0 | xargs -0 -r perl -0777 -ne \
  'while (/((?:(?:\@\w+(?:\([^)]*\))?|\#(?:if|else|endif)[^\n]*)\s+)*)public\s+enum\s+(\w+)[^{]*?:[^{]*\b(?:Localized)?Error\b/g) { print "$ARGV: public enum $2 lacks \@nonexhaustive/\@frozen\n" unless $1 =~ /nonexhaustive|frozen/ }'
```

```perl
# N2: usage  find -L Sources -name '*.swift' -not -path '*/Fixtures/*' -not -path '*/TestUtils/*' -not -path '*.playground/*' -print0 | xargs -0 -r perl check.pl
my %src; for my $f (@ARGV) { open my $h, '<', $f or next; local $/; $src{$f} = <$h>; }
my $all = join "\n", values %src;
for my $f (sort keys %src) {
  while ($src{$f} =~ /\b(?:struct|enum|class|actor)\s+(\w+)[^{]*?:([^{]*)\{/g) {
    my ($n, $conf) = ($1, $2);
    next unless $conf =~ /\bError\b/;
    next if $conf =~ /CustomStringConvertible|LocalizedError/;
    next if $all =~ /extension\s+(?:\w+\.)*\Q$n\E\s*:[^{]*(CustomStringConvertible|LocalizedError)/;
    print "$f: error type $n has no description conformance\n";
  }
}
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-ERR-20 | The public error domain is one `struct XError: Error, Sendable` with an open `struct Code: RawRepresentable, Hashable, Sendable` (static members), a one-sentence `message` (no `Error:` prefix, no trailing period) and `cause: (any Error)?`. A new failure is a new `Code`. The public API stays plain `throws` and documents the type it throws. A public `enum` error exists only as `@nonexhaustive` from its first release (stated floor 6.2.3, guard `SW-API-05`) or as a `@frozen` registered closed domain. Binds library and SDK public API. CLI, server and app-internal enums are fine. | A new case on a public error enum breaks every exhaustive consumer, typed or not (a consumer built against the enum exits 1 on the added case), while a struct cannot be switched exhaustively (exit 0). Adding `@nonexhaustive` later is itself source-breaking, and it needs Swift 6.2.3, so the struct is the floor-safe default. For an SDK wrapping a CLI, a `Code` keyed on the CLI's exit status can represent a status the SDK does not know yet and an enum cannot (a design implication, not run). Precedent: apple/containerization@3e7bc39e66b3:Sources/ContainerizationError/ContainerizationError.swift:23-29 (struct) and `:94` (`Code` over a private enum). Closed domain: swift-system@486d48c80fce:Sources/System/Errno.swift:12-14. | N1 prints each `public enum … : Error` lacking `@nonexhaustive` or `@frozen`. Watched red: 2 lines on the plant (`LoadError`, and `ParseFailure` with an intervening `@available`), 0 on the twin (`@nonexhaustive`, `@frozen`, struct, internal enum, non-Error enum untouched). Both plants typecheck with exit 0 on 6.4.0 and 6.3.3 (measured 2026-10-10). | MUST (library and SDK public API) · SHOULD (elsewhere) |
| SW-ERR-21 | Every error type has a description a person can read: `CustomStringConvertible` always, plus `LocalizedError` returning the same text (`errorDescription = description`) when Foundation or an Apple UI may read it. `localizedDescription` on your own or a third-party plain `Error` is never used for text. On a Foundation-thrown error it is the readable choice (`SW-ERR-18`). | ArgumentParser prints `Error: <errorDescription, else String(describing:)>`. A bare `enum` prints `Error: missing`, an opaque struct prints a type dump, and a `LocalizedError` with only `failureReason` prints `Error: ReasonOnly()`. Only the both-conformances shape prints one sentence through ArgumentParser, swift-log interpolation, Swift Testing output and `localizedDescription`. A plain error's `localizedDescription` is `The operation could not be completed. (main.D error 1.)`. | N2 prints each `struct`, `enum`, `class` or `actor` conforming to `Error` with no description conformance in the scanned files. K5 is a review list: `grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'localizedDescription' Sources`, where every hit must be a `LocalizedError`-conforming own type or a Foundation-domain error (add `--exclude-dir=UI` for a UI layer). Watched red: N2 2 lines on the plant (bare enum, opaque struct), 0 on the twin (header conformances and an extension). A qualified `extension Outer.ClientError: CustomStringConvertible` is matched too: the old pattern printed the plant and the twin, this one the plant only, and soto-core stopped listing `AWSClient.ClientError` (measured 2026-10-10). K5 exit 0 with hits, green exit 1 (measured 2026-10-10). | SHOULD |

Template, compiled with `-warnings-as-errors` on 6.4.0 and 6.3.3 (measured 2026-10-10). `render` prints the
outermost context first and replaces `"\(message): \(cause)"`, which dumps every Foundation cause.

```swift
import Foundation

public struct ToolError: Error, Sendable, CustomStringConvertible, LocalizedError {
    public struct Code: RawRepresentable, Hashable, Sendable {
        public let rawValue: String
        public init(rawValue: String) { self.rawValue = rawValue }
        public static let notFound = Code(rawValue: "notFound")
    }

    public var code: Code
    public var message: String
    public var cause: (any Error)?

    public init(_ code: Code, _ message: String, cause: (any Error)? = nil) {
        (self.code, self.message, self.cause) = (code, message, cause)
    }

    public var description: String { cause.map { "\(message): \(render($0))" } ?? message }
    public var errorDescription: String? { description }
}

func render(_ error: any Error) -> String {
    if let localized = error as? LocalizedError, let text = localized.errorDescription { return text }
    if error is CocoaError || error is POSIXError { return error.localizedDescription }
    return String(describing: error)
}
```

## What Agents Get Wrong Here

Ranked by corpus frequency times blast radius. Agent failure itself is not measured, so the counts are the
human-written proxy and the order is judgement.

1. **`try?` on a write, remove, move, copy, create or decode "to keep going", and an empty `catch {}`.** No
   compiler warning, and success is reported on failure. K3, K1. `SW-ERR-10`, `SW-ERR-11`.
2. **Adding `!`, `try!`, `as!` or an IUO "temporarily", then turning the rule off.** `"NeverForceUnwrap": false`,
   a `.swift-format-nolint` and a `swift-format-ignore` with no reason. `SW-ERR-05`, `SW-ERR-06`.
3. **Throwing a bare `enum` or opaque `struct` to `main`, or letting a Foundation error reach stderr.** It prints
   `Error: missing` or `Error Domain=NSCocoaErrorDomain Code=260`. N2, the stderr count. `SW-ERR-18`, `SW-ERR-21`.
4. **Validating external input with `precondition`, `guard … else { fatalError }` or `assert`.** `assert` is a
   no-op in `-O`, and a `truncatingIfNeeded` "fix" trades a trap for a memory-safety bug. G4. `SW-ERR-14`.
5. **Losing the cause**: `throw X("failed: \(error)")`, or a cause rendered by interpolation. K7, the stderr
   count. `SW-ERR-12`, `SW-ERR-20`.
6. **`public func f() throws(MyError)` "because typed throws is the Swift 6 way".** It breaks the next release.
   K6. `SW-ERR-08`.
7. **Assuming closure inference**: `xs.map { try typed($0) }`, `reduce` or `sorted` in a `throws(E)` function,
   `async let` then `catch { throw error as! E }`, `Task<Int, MyError> { }`, `FullTypedThrows`. The compiler or
   `SW-PKG-02` rejects each but the flag. `SW-ERR-01`, `SW-ERR-02`, `SW-ERR-03`.
8. **Logging at every layer "for traceability", or `catch { print(error) }`.** K2, K8. `SW-ERR-13`.
9. **Branching on `localizedDescription.contains("timeout")` or `String(describing: error).contains(…)`.** K4.
   `SW-ERR-09`.
10. **`public enum FooError: Error { case a, b }` as the library error, cases added later.** N1. `SW-ERR-20`.
11. **Documenting a trap as `exit 1`, assuming release builds wrap on overflow, or `-Ounchecked` for speed.**
    G6 and the exit-status test. `SW-ERR-16`, `SW-ERR-17`.
12. **`!` or `XCTUnwrap` in the wrong test framework, or saying a trap cannot be tested.** `SW-ERR-07`,
    `SW-ERR-19`.
13. **Naming `-Werror UntypedThrows` in a CI with a 6.3 leg, or inventing `Int(safely:)` and
    `UInt32(clamped:)`.** The unknown group passes silently and the invented API fails the build. `SW-ERR-04`.
