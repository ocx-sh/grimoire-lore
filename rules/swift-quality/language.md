---
# Read on demand through the index. This glob matches no file, so a client never auto-loads the file.
paths:
  - "**/.swift-quality-depth-on-demand"
title: Swift Language and Idioms
summary: The SW-LANG family, owning Linux portability, the toolchain floor and floor-raising syntax, hallucinated APIs, existentials, self capture, the type-check limit, ownership types and stale-idiom tells
---

# Swift Language and Idioms

Binds to Swift 6.4.0 (current), 6.3.3 (previous) and `swift:6.2.0` (the floor leg for libraries and the SDK), tools
6.2 for libraries and 6.4 for CLIs and servers, measured 2026-10-10 on Linux x86_64.

This file owns what changes between a Swift 5 habit and a Swift 6.0 to 6.4 tree: Linux modules, the libc import, what
a floor toolchain accepts, APIs that do not exist, `any` against `some`, `[weak self]`, the type-check limit, ownership
types and stale-spelling tells. Isolation, `Sendable` and task ownership are `SW-CONC`. Manifest features and the
tools-version are `SW-PKG`, and CI flags and the K-07 greps are `SW-GATE`. `FoundationNetworking` and `FilePath` are
`SW-IO`, `@nonexhaustive` is `SW-API`, and stdout ordering and `exit()` are `SW-CLI`. Apps and Combine are `SW-APPLE`.

Contents: [Dates and Floors](#dates-and-floors) · [The Linux Build](#the-linux-build) ·
[The Floor Build](#the-floor-build) · [The Warnings-as-Errors Build](#the-warnings-as-errors-build) ·
[The Ownership Test](#the-ownership-test) · [Grep Prompts and Readings](#grep-prompts-and-readings) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Floors

- Measured 2026-10-10 against Swift 6.4.0, 6.3.3, 6.2.0 to 6.2.4 and 6.1.3. Apple, Windows, Android and Wasm behaviour
  is `unverified: read only`.
- **Pinned default (Q1), the adopter may override:** libraries and the SDK use tools 6.2 and Swift 6 mode with a floor
  leg on the exact `swift:6.2.0` image (verify the patch per tree, SW-GATE-25). CLIs and servers use tools 6.4 and the current image only.
- Floors are gated by the manifest tools-version (which does not gate syntax), by the compiler (`#if compiler`,
  `#if hasAttribute`, and patch-gated forms such as `weak let` in 6.2.3) or by the stdlib (`Observations`, 6.2).
- The build is the gate for this family. A grep cannot see `#if` and mature trees give 53 to 4,743 hits per tell, so
  every grep below is a prompt on added lines. The rules bind library, SDK, CLI and server code, and test code is exempt.

## The Linux Build

```sh
docker run --rm -u "$(id -u):$(id -g)" -e HOME=/tmp -v "$PWD":/src -w /src swift:6.4 swift build --scratch-path /tmp/lang03
swift build --swift-sdk x86_64-swift-linux-musl
```

The first is the Linux gate, repeated on the floor image (`SW-LANG-03`). Every container command here runs as your uid with `--scratch-path /tmp/lang03` inside the container, never into the mounted `.build`: a root container with no scratch path left root-owned `.build` directories, the next host build failed `invalid access to .build/manifest.pif` and `precompiled file ... compiled with module cache path`, and `find` printed `Permission denied` (measured 2026-10-10). A `.build` filled by the host cannot be reused through the `/src` mount, so the container rebuilds from scratch each run. The second needs the static Linux SDK
installed (`SW-REL` owns the install). Review prompts, block `linux-tells`. Run from the repository root. Run the build first, because it decides whether T03 to T05 bind: exit 0 means the package builds on Linux and they bind, and `no such module` naming an Apple module of T03 with an empty T00 means an Apple-only package, where they do not. T00 reads CI text and `.linux` claims, a hint for a package whose build you cannot run (swift-markdown has no workflow file and builds on Linux; SwiftGen runs Danger on `ubuntu-latest`, so T00 prints, and `swift build` on `swift:6.4` fails `no such module 'AppKit'`, measured 2026-10-10; SwiftTerm declares only Apple minimums in `platforms:` and builds on Linux). Then read every hit that is not inside a `canImport` guard. Hits inside a guard are expected on a guarded tree, and the pass
signal is no hit outside a guard. Libc imports are L02's, not T03's. `xargs` exits 123 when a batch lists files and none matched, and 0 for a mixed batch, so judge by the printed lines, never the exit status: behind `grep -L` (L02) a listed file is the hit and the status is 123, while behind the plain `grep -n` of T06 a batch with no match is the clean tree (123) and a printed line is the hit. File lists cross `xargs` NUL-separated (`-Z`, `-0`), so a path with a space survives (`Sources/Markdown/Block Nodes/` is one operand, measured 2026-10-10). Kingfisher printed 107 lines for T06 with exit 0; a clean tree printed none with exit 123 (measured 2026-10-10).

```sh
# linux-tells: T00 hint, a Linux leg or a Linux claim in CI text. The Linux build above decides; empty output here proves nothing about the build
grep -Rl -i -E -e 'ubuntu|linux|swift:[0-9]|swiftlang/swift' --include='*.yml' --include='*.yaml' --include='Dockerfile*' --exclude-dir='.build' --exclude-dir='.git' --exclude-dir='.claude' --exclude-dir='.agents' .
grep -Rl -F -e '.linux' --include='Package*.swift' --exclude-dir='.build' .
NOSHIP=(--exclude-dir='Demo*' --exclude-dir='Example*' --exclude-dir='*Example' --exclude-dir='Sample*' --exclude-dir='Docs' --exclude-dir='Documentation' --exclude-dir='Fixtures' --exclude-dir='*TestUtils' --exclude-dir='*TestSupport' --exclude-dir='*.playground')    # sample projects, golden fixtures, test-support targets and playgrounds are not Linux targets: add the repository's sample app directory
# T03 Apple-only imports
grep -Rn "${NOSHIP[@]}" --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -F -e 'import Combine' -e 'import SwiftUI' -e 'import UIKit' -e 'import AppKit' -e 'import Cocoa' -e 'import CoreData' -e 'import CoreGraphics' -e 'import OSLog' -e 'import CryptoKit' -e 'import Security' -e 'import Network' -e 'import simd' -e 'import Accelerate' -e 'import UniformTypeIdentifiers' -e 'import ObjectiveC' .
# T04 Objective-C runtime
grep -Rn "${NOSHIP[@]}" --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -F -e '@objc' -e '#selector' -e 'NSObject' -e 'autoreleasepool' . | grep -v -E '^[^:]+:[0-9]+:[[:space:]]*//'
# T05 Darwin-only APIs
grep -Rn "${NOSHIP[@]}" --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -F -e 'OSAllocatedUnfairLock' -e 'Logger(subsystem' -e 'os_log(' -e 'mach_absolute_time' -e 'OSSignposter' .
# T06 cross-check only (SW-IO-02 owns the rule): URLSession in a file that never mentions FoundationNetworking
grep -RLZ "${NOSHIP[@]}" --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -F -e 'FoundationNetworking' . | xargs -r -0 grep -n -H -F -e 'URLSession' -e 'URLRequest' | grep -v -E '^[^:]+:[0-9]+:[[:space:]]*//'
# L02 a file with an unguarded libc import. Known miss: a file that uses canImport for another module hides an unguarded libc import, the musl SDK build is the gate.
grep -RlEZ --include='*.swift' '^[[:space:]]*(@[A-Za-z_]+ +)*(public +|package +|internal +)?import +(Glibc|Musl|Darwin)\b' Sources | xargs -0 -r grep -L 'canImport'
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-LANG-01 | Build every library, SDK, CLI and server target on the Linux image at the floor and at the current release. Guard each Apple-only module with `#if canImport(X)` or replace it, and do not guard what Linux compiles. Guard the capability (`#if canImport(Combine)`), never an OS list. | Apple-only modules fail the Linux build with errors that name no fix: `no such module 'Combine'`, `type 'URLSession' (aka 'AnyObject') has no member 'shared'`, `Objective-C interoperability is disabled`, `cannot find 'autoreleasepool' in scope`. | The first build above exits 0 on `swift:6.4` and on `swift:6.2.0`. The build, not T00, decides whether T03 to T05 bind (T00 is a CI-text hint: empty on Kingfisher, which has none, and on swift-markdown, which builds on Linux; it prints on SwiftGen, which does not), and T03 to T05 then list the lines to read in non-sample directories, with the pass signal no hit outside a `canImport` guard. Watched red: a planted `import Combine` file exits 1 on 6.4 with `no such module 'Combine'`, the twin exits 0 on 6.4 and 6.1, and T03 to T05 print 4, 4 and 3 lines on the plant and none on the twin (measured 2026-10-10). Intersect the T03 to T06 hit list with the effective manifest's target sources: a file in an `exclude:` list never compiles on Linux (PromiseKit's `Package@swift-5.3.swift` excludes `AnyPromise.swift` and `*.m`: T04 printed its 9 `@objc` lines, none a finding), and T04 and T06 skip `//` and `///` comment lines and the `Documentation` directory (T06 on PromiseKit printed 11 lines, 10 after: `Documentation/Examples/URLSession+BadResponseErrors.swift` is gone). A sample inside a `/* */` block comment still prints (`firstly.swift:8-21`): read the hit, a line inside a comment is not a finding (measured 2026-10-10). T07 to T11 skip `Tests`. | MUST |
| SW-LANG-02 | Import a libc module only through `#if canImport(Glibc)`, `#elseif canImport(Musl)`, `#elseif canImport(Darwin)` (add `Bionic`, `WASILibc` or `WinSDK` arms only for a platform the package claims). Never write an unconditional `import Glibc` or `import Darwin`. In the one file that names `stdout` or `stderr`, every arm is `@preconcurrency import` and the chain comes before any `import Foundation` (`SW-CLI-07`, `SW-CONC-10`). | An unconditional `import Glibc` builds on the glibc image and fails on the static Linux SDK, which is the CLI release path. A literal "first import is `@preconcurrency import Glibc`" fails there too, and the agent fix for an async `exit()`, `Darwin.exit`, does not exist on Linux (`SW-CLI-03`). | `swift build --swift-sdk x86_64-swift-linux-musl` exits 0. L02 in `linux-tells` prints each file with an unguarded libc import: empty output = pass, and it exits 123 when it prints. Watched red: the unconditional import exits 0 on glibc and exits 1 on the musl SDK with `no such module 'Glibc'`, the chain exits 0 on both. The order clause is a glibc fact: `import Foundation` first exits 1 on glibc with `reference to var 'stdout' is not concurrency-safe` and exits 0 on musl (Swift 6.4.0, static Linux SDK 0.1.0, measured 2026-10-10). | MUST |

```swift
// wrong: builds on glibc, fails on the static Linux SDK with "no such module 'Glibc'"
@preconcurrency import Glibc

// right: the chain first, every arm @preconcurrency, then Foundation
// swift-format-ignore-file: OrderedImports
#if canImport(Glibc)
    @preconcurrency import Glibc
#elseif canImport(Musl)
    @preconcurrency import Musl
#elseif canImport(Darwin)
    @preconcurrency import Darwin
#endif
import Foundation

// also right, a package on strict memory safety (SW-SEC-11): the attribute chain may lead with @unsafe
//     @unsafe @preconcurrency import Glibc
```

`OrderedImports` rejects the chain without the ignore line (`place imports at the top of the file`, measured 2026-10-10), and `k07.sh e15` prints that line: quote it in the pull request as the justified hit.

The `@unsafe @preconcurrency import Glibc` form (vapor/console-kit: 18 lines in 7 files, tools 6.2 with strict memory safety) is skipped by `k07.sh`, `weaken-check.sh`, the hatch-delta awk and L02 alike: each skip accepts leading attributes. Red on `@unsafe @preconcurrency import Foo` in all three, green on the libc chain; L02 prints an unguarded `@unsafe @preconcurrency import Glibc` and not the guarded one (measured 2026-10-10).

Module facts, identical on 6.4.0 and 6.3.3 (measured 2026-10-10):

- Exist on Linux: `Foundation`, `FoundationEssentials`, `FoundationInternationalization`, `FoundationNetworking`,
  `FoundationXML`, `Dispatch`, `Glibc`, `Observation`, `Synchronization`, `Testing`, `XCTest`, `RegexBuilder`.
- Absent: `Combine`, `SwiftUI`, `UIKit`, `AppKit`, `CoreData`, `CoreGraphics`, `ObjectiveC`, `os`, `OSLog`, `CryptoKit`,
  `Security`, `Network`, `Accelerate`, `simd`, `SwiftData`, `WebKit`, `UniformTypeIdentifiers`, and the other platforms'
  libc (`Darwin`, `WinSDK`, `ucrt`, `Android`, `WASILibc`). `System` and `Crypto` are packages (`SystemPackage`,
  swift-crypto), and a `canImport(System)` guard with a `SystemPackage` fallback still needs the manifest dependency.
- Compile on Linux, so do not guard them (`SW-IO-05` and `SW-GATE-10` E14 still apply): `NSLock`, `Process()`,
  `NotificationCenter`, `UserDefaults`, `String(format:)`, `NSRegularExpression`, `Bundle.main`, `pthread_create`.

## The Floor Build

```sh
docker run --rm -u "$(id -u):$(id -g)" -e HOME=/tmp -v "$PWD":/src -w /src swift:6.2.0 swift build --scratch-path /tmp/lang03
docker run --rm -u "$(id -u):$(id -g)" -e HOME=/tmp -v "$PWD":/src -w /src swift:6.2.0 swift test --scratch-path /tmp/lang03
```

Read the declared floor first with the `SW-PKG-06` command. The matrix is `SW-GATE-25`'s and the library floor is
`SW-PKG-12`'s (tools 6.2). The builds prove the tree compiles on the floor, not that the floor is minimal: bisect
images downward to find the real one. Floor bands, block `floor-bands`: run the bands above the declared floor, and
read every hit: each must sit inside a guard or the floor must have been raised. Empty output = no form above the floor is used, and hits inside a guard are expected.

```sh
# floor-bands: F62 introduced in 6.2
grep -RnE --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -e 'InlineArray' -e '\[[0-9_]+ of [A-Za-z]' -e 'nonisolated\(nonsending\)' -e '@concurrent' -e 'Task\.immediate' -e 'isolated deinit' -e 'Observations *\{' -e '[^A-Za-z]MutableSpan' -e '[^A-Za-z]Span<' .
# F62b raw identifiers (6.2): a backtick name with a space
grep -RnE --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -e 'func `[A-Za-z0-9_]+ [^`]*`' -e '(let|var) `[A-Za-z0-9_]+ [^`]*`' .
# F63 declared floor 6.3 (weak let and @nonexhaustive compile from 6.2.3)
grep -Rn --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -F -e 'weak let' -e '@nonexhaustive' -e '@export(' -e '@specialized(' -e '@inline(always)' -e 'Swift::' -e '@c(' -e '@c func' -e '@c enum' .
# F64 introduced in 6.4
grep -Rn --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -F -e '~Sendable' -e '@diagnose(' -e 'withTaskCancellationShield' -e 'UniqueBox' -e 'UniqueArray' .
# F64b 6.4 single-line forms: optional opaque without parentheses, await inside defer
grep -RnE --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -e 'some [A-Za-z_.]+\?' -e 'defer *\{.*await ' .
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-LANG-03 | Name the floor as the oldest toolchain patch that must build the tree, and build and test exactly that image in CI (`swift:6.2.0`, never the floating `swift:6.2`). In the commit that adds a form newer than the floor, either guard it (`SW-LANG-04`) or raise `swift-tools-version` to the toolchain that introduced it, to the patch when it arrived in one (`// swift-tools-version: 6.2.3`). **Default:** libraries and the SDK guard, because they keep serving the `.0`. A patch-level tools-version is for a package that decides to require the form, and the commit message records it. | A tools-version does not gate syntax, and syntax arrives in patch releases, so a leg on the floating tag passes where consumers on the `.0` fail. A patch in the manifest is accepted by that patch and later, and rejected by earlier ones with a readable message. | Both floor builds above exit 0. Watched red: a tools-6.2 package with `weak let` exits 1 on 6.2.0 and 6.2.2 (`'weak' must be a mutable variable, because it may change at runtime`) and exits 0 on 6.2.3 and 6.2.4. The same package at `// swift-tools-version: 6.2.3` exits 1 on 6.2.0 with `package is using Swift tools version 6.2.3 but the installed version is 6.2.0` and exits 0 on 6.2.3. A tools-6.0 package with `weak let` exits 1 on 6.1 and 0 on 6.3 (measured 2026-10-10). | MUST |
| SW-LANG-04 | Guard every form newer than the floor, in the commit that adds it. An attribute uses `#if hasAttribute(X)` (`SW-API-05`, for example `nonexhaustive`). `@diagnose` may use `#if hasFeature(SourceWarningControl)`. Every other form uses `#if compiler(>=N)` with the old spelling in the `#else`. A library on tools 6.2 guards `weak let` with `#if compiler(>=6.3)`: the declared floor stays 6.3 although the form compiles from 6.2.3. Never detect `weak let` with `hasFeature(ImmutableWeakCaptures)`. | Each form in the pin table is a compile error on an older toolchain. `hasFeature(ImmutableWeakCaptures)` reports whether the upcoming-feature flag was passed (true on 6.2.4, 6.3 and 6.4 with it, false on 6.2.0 even with it), not whether the syntax exists. | The floor builds of `SW-LANG-03` exit 0 and the bands F62 to F64b in `floor-bands` have every hit inside a guard. Every hit is guarded or the floor is raised (hits inside a guard are expected). Watched red: the bands print 7, 1, 5, 3 and 1 lines on the plant and none on the twin. Unguarded `weak let` exits 1 on 6.2.0 and the guarded form exits 0 on 6.2.0, 6.2.3 and 6.4. Unguarded `@nonexhaustive` exits 1 on 6.2.0 and 6.2.2 (`unknown attribute 'nonexhaustive'`) and the `hasAttribute` form exits 0 on both (measured 2026-10-10). | MUST |
| SW-LANG-05 | Compile any API, attribute, flag or syntax that a release note, blog post, forum thread, WWDC session or earlier research table names, on the floor and the current image, before writing it into code, a rule or a skill. `cannot find ... in scope`, `has no member` and `unknown attribute` are the signals. | Release notes, blogs and tables name APIs that do not compile, and an agent copies them with full confidence. | `swift build` exits 0 on both images with the file compiled and not read. `swiftc -typecheck -swift-version 6 file.swift` proves a name exists, and `swift build` or `swiftc -emit-sil` proves a concurrency form compiles (region-isolation errors appear only after SIL). Watched red on 6.4 and 6.2.0: `withDeadline` (`cannot find 'withDeadline' in scope`), stdlib `FilePath` (`no type named 'FilePath' in module 'Swift'`), `CommandLine.executablePath` (`has no member`) and `@warn` (the attribute is `@diagnose`) each exit 1 (measured 2026-10-10). Owners: `FilePath` is `SW-IO-01`, `defaultSwiftSettings:` is `SW-PKG-01`, the `@warn` spelling is `SW-GATE-13`. | MUST |

First compiler that accepts each form, compiled on 6.1.3, 6.2.0, 6.2.4, 6.3.3 and 6.4.0, plus 6.2.2 and 6.2.3 for the
two patch-gated forms (measured 2026-10-10):

| First compiler | Forms | Guard |
|---|---|---|
| 6.0 | `Mutex` (`import Synchronization`), `sending`, `throws(E)`, `count(where:)`, `internal import` | none above a 6.0 floor |
| 6.2.0 | raw identifiers, `InlineArray` and `[3 of Int]`, `nonisolated(nonsending)`, `@concurrent` (6.1.3 accepts it as a deprecated alias of `@Sendable` with a rename warning, a different meaning, so the guard is required and `-warnings-as-errors` is what catches it), `Task.immediate`, `isolated deinit`, `Span`, `Observations { }` | `#if compiler(>=6.2)` |
| 6.2.3 | `weak let` and `@nonexhaustive` (both exit 1 on 6.2.0 to 6.2.2, and SE-0481 says 6.3, read 2026-10-10) | `#if compiler(>=6.3)` for `weak let`, `#if hasAttribute(nonexhaustive)` for the attribute |
| 6.3.0 | `@c`, `@export(implementation)`, `@inline(always)`, `@specialized(where:)`, the `Swift::Int` module selector | `#if compiler(>=6.3)` |
| 6.4.0 | `~Sendable`, `@diagnose(...)`, `some P?`, `defer { await ... }`, `withTaskCancellationShield`, `UniqueBox`, `Iterable` | `#if compiler(>=6.4)`, and `#if hasFeature(SourceWarningControl)` for `@diagnose` |
| not in 6.4 | `withDeadline` (SE-0526), stdlib `FilePath`, `CommandLine.executablePath`, `defaultSwiftSettings:` | do not write (`SW-LANG-05`) |

- `~Sendable` fails on 6.3 with `'~Sendable' requires -enable-experimental-feature TildeSendable`. Below a 6.4 floor
  write `@available(*, unavailable) extension X: Sendable {}`, which subclasses inherit and `~Sendable` does not.
  Whether a public type states its Sendable intent is `SW-CONC-04`'s.
- Raw identifiers in test names need a 6.2 floor, below it use `@Test("display name")`. `hasFeature(SourceWarningControl)`
  is false on 6.1 and 6.3 and true on 6.4, while `compiler(>=N)` always works. Apple availability spellings are
  `SW-APPLE`'s.

```swift
// wrong: fails on the 6.2.0 floor with "'weak' must be a mutable variable"
public final class Holder: Sendable {
    private weak let owner: Owner?
    public init(_ owner: Owner) { self.owner = owner }
}

// right: guarded at the declared floor 6.3, with the pre-6.3 spelling in the #else
public final class Holder: Sendable {
    #if compiler(>=6.3)
        private weak let owner: Owner?
        public init(_ owner: Owner) { self.owner = owner }
    #else
        private struct Box { weak var owner: Owner? }
        private let box: Mutex<Box>
        public init(_ owner: Owner) { self.box = Mutex(Box(owner: owner)) }
    #endif
}
```

## The Warnings-as-Errors Build

```sh
swift build -Xswiftc -warnings-as-errors
swift build -Xswiftc -Xfrontend -Xswiftc -warn-long-expression-type-checking=200 -Xswiftc -warnings-as-errors
```

Both exit 0 on a clean tree. The flag spelling is `SW-GATE-13`'s and the manifest feature is `SW-PKG-07`'s. The
second command is the type-check gate, and the diagnosis step after a red (`SW-CORE-20`) cites `SW-LANG-07` for the limit.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-LANG-06 | Write every protocol used as a type as `any P`. The gate is the `ExistentialAny` upcoming feature (`SW-PKG-07`) plus `-Xswiftc -warnings-as-errors` (`SW-GATE-13`). Never rely on `-Werror ExistentialAny` alone. An adopted package enables the feature through `SW-PKG-32` and does not rewrite wholesale. A published library's manifest does not carry `.treatWarning("ExistentialAny", as: .error)` (`SW-GATE-14`), CI uses the command-line form. | Swift 6 mode accepts a bare protocol type silently, the feature alone only warns, and `-Werror ExistentialAny` without the feature exits 0 silently. | The first build above with the feature on exits 1 on `[Shape]` and 0 on `[any Shape]` and on `<S: Shape>`. The manifest side is the `SW-PKG-07` `dump-package` command. Watched red on 6.4 and 6.3: with the feature and `-warnings-as-errors` a bare `[Shape]` exits 1 and `modern` exits 0, while `-Werror ExistentialAny` alone exits 0 on the bare file. Retrofit cost on an unmodified tree: swift-argument-parser 159 warning sites in 33 files, swift-collections 85 in 18, swift-system 1 (measured 2026-10-10, 6.4.0). | MUST (new packages, and any package that enables the feature) |
| SW-LANG-07 | Run the second build above, with limit 200, as part of the warnings-as-errors build. Fix a timeout by typing every literal operand (`3.0`, `Double(x)`), binding each sub-expression to a typed `let`, or extracting a local function. Never raise a limit, and never answer the error with a whole-closure annotation. | A valid mixed-literal expression fails with `the compiler is unable to type-check this expression in reasonable time` (4.3 to 4.8 s on 6.4, 5 to 11 s on 6.3), and the solver gives up at one million disjunction attempts. The fix order is the content of this rule. | The second build above exits 0. The plain build already exits 1 on cliff expressions, so the flag adds the `expression took Nms` line and catches only the window between 200 ms and the solver limit. Watched red: the snippet's wrong half exits 1 (`unable to type-check this expression in reasonable time`) and its right half exits 0, on 6.4 and 6.3. False alarms: 0 hits at 100 ms across six packages with their dependency graphs on 6.4, and 92 to 120 hits at 1 ms on swift-log, so the flag was live (measured 2026-10-10). The limit is wall-clock, so re-measure on a loaded runner and on each toolchain bump. | SHOULD |

```swift
// wrong: mixed literals and Double(x) in one expression, the solver times out (each half is self-contained)
func area(w: Double, h: Double) -> Double {
    return [1, 2, 3].map { Double($0) * 1.5 + w / 2 - h * 0.25 + 3 * 2.0 - 1 + Double($0) / 4 }.reduce(0, +) + 1 + 2.5 * w - h / 2 + 3 * 4
}

// right: typed operands and one sub-expression per let
func area(w: Double, h: Double) -> Double {
    let terms = [1, 2, 3].map { (x: Int) -> Double in
        let scaled: Double = Double(x) * 1.5, offset: Double = w / 2 - h * 0.25
        return scaled + offset + 6.0 - 1.0 + Double(x) / 4.0
    }
    return terms.reduce(0, +) + 1.0 + 2.5 * w - h / 2.0 + 12.0
}
```

## The Ownership Test

The gate is a behavioural test per owner type (`SW-CONC-13` and `SW-CONC-20` own the task and `close()` contract it
exercises). T11 is the cheap prompt: read every hit, and empty output = no `[weak self]` task to classify.

```sh
# T11 weak or unowned self in a Task
grep -RnE --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -e 'Task *\{ *\[weak self\]' -e 'Task\.detached *\{ *\[weak self\]' -e '\[unowned self\]' .
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-LANG-08 | Capture `self` by lifetime. A closure or `Task` that `self` stores, or that is registered with something `self` outlives, and that can run unboundedly (a polling or `for await` loop, an observer, a timer, a delegate callback), uses one of two designs. **Design W:** `[weak self]` with `guard let self` rebound per iteration and not held across a long suspension, plus a `deinit` that cancels the task. **Design C:** a strong capture plus the owner's idempotent awaited `close()` that cancels it (`SW-CONC-13`, `SW-CONC-20`). A short, finite, unstored `Task` gets no `[weak self]`. `[unowned self]` becomes `[weak self]` unless a comment states the lifetime guarantee. | `[weak self]` on a short `Task` silently drops its work (`ran=0`), and a strong capture on a stored loop with no cancel path leaks the owner (`deinit_count=0`). | A test that the owner `deinit`s after its last strong reference drops (design W) or after `close()` (design C), deinit count 1 and exit 0, written per owner type. T11 lists each hit to read: finite and unstored, remove the capture, stored and unbounded, confirm a design (reading heuristic, since no tool tells a stored loop from a finite task). A change that adds such a task without the test names its design in the pull request. On a 6.4 leg `-warnings-as-errors` (`SW-GATE-13`) turns `ImplicitStrongCapture` into an error, and the group is named only where the oldest leg knows it (`SW-GATE-15`). Watched red (Swift 6 mode, `-O`, 6.4 and 6.3.3): strong stored loop exits 1 with count 0, design W exits 0 with count 1, design C with `close()` exits 0 with count 1 and exits 1 when the owner forgets `close()`, T11 prints 2 lines on the plant and none on the twin (measured 2026-10-10). | MUST (library, SDK, CLI, server) · SHOULD (apps) |

```swift
// wrong: a strong capture of a stored loop is a cycle, the owner never deinits
func start() {
    task = Task {
        while !Task.isCancelled {
            try? await Task.sleep(for: .milliseconds(5))
            self.tick()
        }
    }
}

// right, design W: weak capture rebound per iteration, and a deinit that cancels
func start() {
    task = Task { [weak self] in
        while !Task.isCancelled {
            try? await Task.sleep(for: .milliseconds(5))
            guard let self else { return }
            self.tick()
        }
    }
}
deinit { task?.cancel() }
```

- 6.4 adds the default-on warning `ImplicitStrongCapture` for a nested `[weak self]` closure inside an outer escaping
  closure that does not capture `self` explicitly, because the outer one then captures it strongly. Fix: put the capture
  list on the outer closure, `run { [weak self, service] in ... }`. On 6.3 the file is silent and
  `-Werror ImplicitStrongCapture` prints `unknown warning group` and exits 0 (measured 2026-10-10).
- Apple's "tasks rarely need to capture weak references" is right for a finite unstored task, and the warning that
  iterating tasks leak is right for a stored loop.

## Grep Prompts and Readings

Review prompts on added lines, block `prompts`, run from the repository root. Empty output is a pass. None is a gate,
and `SW-GATE-10` runs T01 and T02 as the K-07 E04, E12 and E13 greps.

```sh
# prompts: on a tree whose tools version is below 6.0 (SW-PKG-06), T09, T10, T12 and T13 print Swift 5 compatibility idioms (@_implementationOnly, public class, [String: Any]): advisory, and the receipt carries one migrate or keep line per hit
# T01 legacy threading
grep -Rn --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -F -e 'OperationQueue' -e 'Thread.detachNewThread' -e 'Thread(block' -e 'NSThread' -e 'performSelector' .
# T02 Combine types
grep -Rn --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -F -e 'AnyCancellable' -e 'PassthroughSubject' -e 'CurrentValueSubject' -e 'AnyPublisher' .
# T07 redundant optional binding
grep -Rn --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -e 'if let \([A-Za-z_][A-Za-z0-9_]*\) = \1 *\({\|,\|else\b\|$\)' -e 'guard let \([A-Za-z_][A-Za-z0-9_]*\) = \1 *\({\|,\|else\b\|$\)' .
# T08 filter then count
grep -Rn --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -e '\.filter *{[^}]*} *\.count\b' -e '\.filter *{[^}]*} *\.isEmpty\b' -e '\.filter([^)]*)\.count\b' .
# T09 class-constrained protocol spelled with the class keyword
grep -RnE --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -e 'protocol +[A-Za-z_]+ *: *class\b' .
# T10 @_implementationOnly, replaced by internal import (6.0)
grep -Rn --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -F -e '@_implementationOnly' .
# T10b only when the declared floor is 6.3 or newer: underscored attributes whose shipped spelling is 6.3
grep -Rn --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -F -e '@_cdecl' -e '@inline(__always)' -e '@_specialize' .
# T12 a class that is neither final nor open
grep -RnE --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -e '^[[:space:]]*((@[A-Za-z]+|public|package|internal|private|fileprivate) +)*class +[A-Z]' .
# T13 untyped dictionaries as models
grep -RnE --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -e '\[String: *Any\]' .
# T16 arrays of existentials
grep -Rn --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -e '\[any [A-Za-z]' .
# T17 ownership tokens with no multi-word reason (output = unjustified)
find -L . -name '*.swift' -not -path './.build/*' -not -path './Tests/*' -print0 | xargs -r -0 awk '
  FNR == 1 { prev = "" }
  /~Copyable|~Escapable|InlineArray/ {
    if ($0 !~ /\/\/[[:space:]]*[^[:space:]]+[[:space:]]+[^[:space:]]+[[:space:]]+[^[:space:]]+/ &&
        prev !~ /^[[:space:]]*\/\/[[:space:]]*[^[:space:]]+[[:space:]]+[^[:space:]]+[[:space:]]+[^[:space:]]+/)
      print FILENAME ":" FNR ": " $0
  }
  { prev = $0 }'
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-LANG-09 | In new non-UI code replace `OperationQueue`, `Thread.detachNewThread`, `Thread(block:)`, `NSThread`, `performSelector`, Combine types (`AnyCancellable`, `PassthroughSubject`, `CurrentValueSubject`, `AnyPublisher`) and `ObservableObject` with `@Published` by structured concurrency, `AsyncSequence` and `@Observable` with `Observations { }`. `Thread` is allowed only as the `SW-CONC-23` off-pool bridge, with its reason comment. State that reacts to change outside a view does not use a re-armed `withObservationTracking`. | Combine, `ObservableObject` and `@Published` do not exist on Linux (`SW-LANG-01` is the build half), and a re-armed `withObservationTracking` observes one change. | T01 and T02 in `prompts`, plus `SW-GATE-10` E04, E12 and E13. Empty output on added lines = pass. Watched red: T01 and T02 print 2 lines each on the plant and none on the twin. On Linux 6.3 and 6.4 `withObservationTracking` fired `onChange` once after two mutations while `Observations { c.n }` yielded `[2, 3]`. `Observations` resolves on 6.2.0, 6.2.4 and 6.4, not on 6.1 (measured 2026-10-10). | SHOULD |
| SW-LANG-10 | Choose the spelling by what the call site needs. A parameter used once is `some P`. A parameter named elsewhere (the same type twice, a `where` clause, the return, the body) is `<T: P>`. A return with one concrete type is `some P`. Write `any P` only where conformers differ at runtime (a plugin registry, a heterogeneous array, an erased stored property). Never change a released signature between `some P`, `any P` and a concrete type. | `any P` costs a box and a dynamic dispatch and drops type identity, and swapping it for `some P` in a released signature breaks callers. Measured with `-O` on 6.4 at 2,000,000 elements: `[any Shape]` is 4.4x to 9x slower than generic `[Square]` for a one-Double struct, and 1.9x to 2.3x for a four-Double boxed struct. | T16 lists every `[any ...]`, and each hit names its runtime heterogeneity in the pull request (reading heuristic, since a tool cannot grade the choice). For a released signature `swift package diagnose-api-breaking-changes 1.0.0` (use the last release tag) exits 1 on the change (`SW-GATE-20`). Watched red: `some Shape` to `any Shape` in a return and in a parameter, and `[Square]` to `[any Shape]`, each exit 1, and an added method exits 0 (measured 2026-10-10). | SHOULD |
| SW-LANG-11 | A class is `final` unless it is a documented extension point: `open`, with a comment naming the subclassing contract. When the compiler says `non-final class 'X' cannot conform to the 'Sendable' protocol`, the fix is `final` (`SW-CONC-28`, rung 2), never `@unchecked Sendable`. | A non-final class cannot be checked `Sendable`, and the agent's answer to that error is `@unchecked Sendable`. One `open class Spec: @unchecked Sendable` hierarchy holds 237 of one corpus's 564 hatches. | T12 prints each class to make `final` or to document. The compile error above is the hard gate for the `Sendable` case. No SwiftLint rule and no swift-format rule flags a missing `final` (the 6.4 `dump-configuration` has none). Watched red: a non-final `Sendable` class exits 1 on 6.3 and 6.4, `final` exits 0, and T12 prints 4 lines on the plant and none on the twin (measured 2026-10-10). | SHOULD |
| SW-LANG-12 | Use `~Copyable`, `~Escapable`, `InlineArray` and `Span` only with a multi-word reason on the line or the line above: a unique-resource lifetime (a descriptor closed exactly once), a layout guarantee, a C-interop shape, or a measurement. Ordinary models stay ordinary structs. | A `~Copyable` model type fails at the first `[Token]` (`generic struct 'Array' requires that 'Token' conform to 'Copyable'`), and `InlineArray<4, Int>` was no faster than a four-element `[Int]` under `-O` on 6.4 (7.48 and 7.26 ms against 7.20 and 7.22 ms) because the optimiser already promotes the small array to the stack. | The T17 command in `prompts` prints each use with no multi-word reason: empty output = every use is justified, which checks that a reason exists and not that it is true. Expected noise: library generics that merely accept `~Copyable` (`& ~Copyable`), and a reason above an attribute line also prints. Watched red: T17 prints 4 lines on the plant and none on the twin, and the model-type case fails to compile (measured 2026-10-10). | SHOULD |
| SW-LANG-13 | On added lines prefer `if let x` to `if let x = x` (5.7), `count(where:)` and `contains(where:)` to `.filter { }.count` and `.filter { }.isEmpty` (6.0), `AnyObject` to `class` in a class-constrained protocol, a `Codable` struct to `[String: Any]` as a model, and `internal import` (6.0) to `@_implementationOnly import`. Use the shipped spelling of other underscored attributes only when the floor admits it (`@c`, `@inline(always)` and `@specialized` are 6.3). | These spellings mark unreviewed agent output and cost nothing to fix, but none is a defect. Only two have compiler teeth: `protocol P: class` warns, and `@_implementationOnly` warns with `ImplementationOnlyDeprecated`. | T07, T08, T09, T10 and T13 in `prompts`, plus T10b only when the declared floor is 6.3 or newer (on a 6.2.0 floor its hits are expected). On a tree with tools version below 6.0, T09, T10, T12 and T13 are advisory and each hit gets a `migrate` or `keep` line (Mint and Yams printed 8 to 13 such hits each, measured 2026-10-10). Empty output on added lines = pass. T07 ends the binding at `{`, `,` or `else`, so a type-narrowing `guard let json = json as? [AnyObject]` does not print: RxSwift 3 of 3 hits were that cast and now print 0 (measured 2026-10-10). Watched red: T07, T08, T09, T10 and T13 print 2, 2, 1, 1 and 1 lines and T10b prints 3 on the plant, none on the twin, and `protocol P: class {}` exits 1 under `-warnings-as-errors` while `AnyObject` exits 0 (measured 2026-10-10). | CONSIDER |

## What Agents Get Wrong Here

1. **An Apple-only API in portable code** (`Combine`, `OSLog`, `@objc`, `autoreleasepool`, CryptoKit, `URLSession`
   without `FoundationNetworking`). The error names no fix. `SW-LANG-01`.
2. **A hallucinated or unreleased API** (`withDeadline`, stdlib `FilePath`, `defaultSwiftSettings:`, `@warn`). `SW-LANG-05`.
3. **Newer syntax in an older-floor package** (`weak let`, `@nonexhaustive`, `~Sendable`, `@diagnose`, `some P?`, `@c`),
   which a floating floor leg lets through. `SW-LANG-03`, `SW-LANG-04`.
4. **`[weak self]` on every closure** (drops the work) **or a strong stored loop with no cancel path** (leaks). `SW-LANG-08`.
5. **An unconditional `import Glibc` or `import Darwin`**, or `Darwin.exit` as the async `exit()` fix. `SW-LANG-02`.
6. **Pre-6 idioms in new code**: GCD, `ObservableObject`, `OperationQueue`, a re-armed `withObservationTracking`. `SW-LANG-09`.
7. **A bare protocol type accepted silently in Swift 6 mode, or `any P` everywhere.** `SW-LANG-06`, `SW-LANG-10`.
8. **`@unchecked Sendable` as the answer to a non-final class.** The answer is `final`. `SW-LANG-11`, `SW-CONC-28`.
9. **A mixed-literal expression that times out**, fixed by raising a limit instead of splitting it. `SW-LANG-07`.
10. **`~Copyable`, `InlineArray` or `Span` "for performance" on an ordinary model.** `SW-LANG-12`.
11. **Stale `if let x = x`, `.filter { }.count`, `protocol P: class`, `[String: Any]` models.** `SW-LANG-13`.
