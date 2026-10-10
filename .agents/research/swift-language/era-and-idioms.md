---
title: Swift era and idioms - stale tells, some/any/generic, floor-raising syntax, final/open, [weak self], Linux-only breaks
topic: swift-language / SW-LANG (rows M-A-01, M-A-02, M-A-06, M-A-07, M-A-09, M-A-11, M-A-12, M-A-14)
agent: wave-3 dive W3-1 language/era-and-idioms (research-lang, swift program)
model: sonnet
date_researched: 2026-10-10
sources_count: 26
fixtures: /home/mherwig/.cache/research-lang/swift-tools/fixtures/era-and-idioms/
scope: |
  Covered: the stale-idiom grep table beyond the K-07 set (SW-GATE-10, as amended by map contradictions 7 and 8), the Linux-unavailable module and API list, the some/any/generic rule, the list of 6.2-6.4 syntax that raises the real toolchain floor above the declared tools version (each form compiled on 6.1, 6.3 and 6.4), the final/open rule, the [weak self] rule, type-checker timeouts, the Span/InlineArray/~Copyable over-application test, and the InferIsolatedConformances no-op check (map contradiction 4). 37 greps and 15 compile or run checks were each watched red on a planted violation and green on a compliant twin.
  Not covered: hatch policy (SW-CONC-01..10), FilePath/import System (SW-IO-01), machine-facing locale (SW-IO-15), exit() (SW-CLI-03), manifest keys (SW-PKG), SwiftUI view design (SW-APPLE), macros (M-A-15), @specialized/@inlinable justification (M-A-08). Linux only: every Apple, Windows and Xcode claim is marked "unverified: read only". There is no swift:6.0 or swift:6.2 image (only 6.1, 6.3, 6.4), so a 6.2 introduction rests on the SE "Implemented (Swift 6.2)" status plus a 6.1-red / 6.3-green bracket.
---

# Swift era and idioms (researched 2026-10-10, Swift 6.4.0 / 6.3.3 / 6.1.3 toolchains on Linux)

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
  - [1. Method, citation keys and what is imported](#1-method-citation-keys-and-what-is-imported)
  - [2. The stale-idiom table (K-07 imported, new greps T01-T17)](#2-the-stale-idiom-table)
  - [3. Linux: unavailable modules, API breaks and guards](#3-linux-unavailable-modules-api-breaks-and-guards)
  - [4. some, any and generics](#4-some-any-and-generics)
  - [5. Floor-raising syntax](#5-floor-raising-syntax)
  - [6. final and open](#6-final-and-open)
  - [7. [weak self] and what a Task captures](#7-weak-self-and-what-a-task-captures)
  - [8. Type-checker timeouts](#8-type-checker-timeouts)
  - [9. Span, InlineArray and noncopyable types](#9-span-inlinearray-and-noncopyable-types)
  - [10. InferIsolatedConformances is a no-op without global-actor types](#10-inferisolatedconformances-is-a-no-op-without-global-actor-types)
  - [11. The API Design Guidelines are older than this topic](#11-the-api-design-guidelines-are-older-than-this-topic)
  - [12. Corrections to the shift table](#12-corrections-to-the-shift-table)
- [Normative guidance candidates](#normative-guidance-candidates)
- [Verification runs](#verification-runs)
- [Exemplar evidence](#exemplar-evidence)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

- A `swift-tools-version` does not gate syntax: a tools-6.0 package using `weak let` builds on 6.3 and 6.4 and fails on 6.1 (`'weak' must be a mutable variable`). The real floor is the oldest toolchain that compiles the tree, so CI must build on the floor image, not only the current one.
- Syntax pins, compiled on 6.1, 6.3 and 6.4: `weak let` 6.3; `~Sendable`, `@diagnose`, `some P?`, `defer { await }`, `withTaskCancellationShield`, `anyAppleOS` (without a warning-free fallback) 6.4; raw identifiers, `InlineArray` and `[3 of Int]`, `@concurrent`, `nonisolated(nonsending)`, `Task.immediate`, `unsafe` expressions 6.2; `@c`, `@export(implementation)`, `@inline(always)`, `Swift::Int` 6.3.
- Guard newer syntax with `#if compiler(>=6.4)` (green on 6.1, 6.3, 6.4) or `#if hasFeature(SourceWarningControl)` for `@diagnose` (swift-crypto does exactly this). `hasFeature(TildeSendable)` is true only on 6.4; `hasFeature(ImmutableWeakCaptures)` is false on all three, so never use it to detect `weak let`.
- `~Sendable` in a tools-6.2 package fails on 6.3 with `'~Sendable' requires -enable-experimental-feature TildeSendable`; the 6.3-compatible spelling of the same intent is `@available(*, unavailable) extension X: Sendable {}`.
- The K-07 set stays the gate; the 22 new greps in section 2 add what it lacks: legacy threading, Combine types, Apple-only imports, ObjC runtime, `URLSession` without `FoundationNetworking`, redundant optional binding, `.filter{}.count`, `protocol P: class`, underscored attributes, `[weak self]` in `Task`, non-final classes, `[String: Any]`, stale availability, `[any P]`, ownership tokens without a reason, and one grep per floor band.
- On a stock Linux 6.4 or 6.3 toolchain, 41 commonly imported Apple modules do not exist (Combine, SwiftUI, UIKit, AppKit, CoreGraphics, os, OSLog, CryptoKit, Security, Network, simd, ...), and so does `System` (the Linux module is `SystemPackage`, a package product). `Foundation`, `FoundationNetworking`, `Dispatch`, `Observation`, `Synchronization`, `Testing`, `XCTest`, `CoreFoundation` do exist.
- On Linux `import Foundation` alone does not give `URLSession` or `URLRequest`: the error is `type 'URLSession' (aka 'AnyObject') has no member 'shared'`. Add `#if canImport(FoundationNetworking)` + `import FoundationNetworking`. `@objc` and `#selector` fail with `Objective-C interoperability is disabled`.
- `import Glibc` builds on the glibc image and fails on the static Linux SDK (`--swift-sdk x86_64-swift-linux-musl`: `no such module 'Glibc'`); use the `canImport(Glibc)` / `canImport(Musl)` / `canImport(Darwin)` chain.
- Swift 6 language mode still accepts a bare protocol as a type (`[Shape]`). `-enable-upcoming-feature ExistentialAny` gives only a warning (`#ExistentialAny`); `-Werror ExistentialAny` without the feature is silent; the working gate is the feature plus `-warnings-as-errors` (or the `-Werror` pair).
- `any P` is a performance choice, not a style default: a hot loop over `[any Shape]` was 4.4x to 9x slower than a generic `[Square]` (2,000,000 elements, best of five, -O, 6.4) and about 2x slower for a 4-Double struct that does not fit the inline buffer. `some P` and `<T: P>` cost the same; use `any` for runtime heterogeneity.
- `InlineArray<4, Int>` was not faster than a non-escaping `[Int]` under `-O` on 6.4 (7.2 ms vs 7.3-7.5 ms for 5,000,000 iterations): `InlineArray`, `Span` and `~Copyable` need a stated reason, and a `~Copyable` model type fails at the first `[Token]` or un-annotated parameter.
- A class that is checked `Sendable` must be `final` (`non-final class 'Cache' cannot conform to the 'Sendable' protocol`, 6.3 and 6.4). 72.4% of exemplar classes are `final` (2,071 of 2,860); 42% of the corpus's `@unchecked Sendable` sits in one `open class Spec` hierarchy.
- `[weak self]` is required for a stored or never-ending `Task` (a `while !Task.isCancelled` loop held by `self`: deinit count 0, a cycle) and is cargo cult for a short-lived unstored `Task` (strong: deinit 1, work ran; weak: the work silently never ran). 6.4 adds the `ImplicitStrongCapture` warning for a nested `[weak self]` inside a closure that captures `self` strongly; 6.3 is silent.
- A type-checker timeout reproduces on 6.3 and 6.4 for a valid mixed-literal expression (4.3-4.7 s on 6.4); the gate is `-Xswiftc -Xfrontend -Xswiftc -warn-long-expression-type-checking=200 -Xswiftc -warnings-as-errors`, the fix is one typed `let` per sub-expression. The solver gives up at one million disjunction attempts or a 512 MB arena.
- Map contradiction 4 is confirmed: in a module with no global-actor types, `InferIsolatedConformances` leaves the SIL and IR byte-identical on 6.3.3 and 6.4 (planted `e-infer/noglobal.swift`); with a `@MainActor` conformer it changes the diagnostics, so SW-PKG-08's "enable it in every new package" is safe.
- Release notes and the wave-1 shift table drift from the compiler: `@specialize(where ...)` does not parse on 6.1, 6.3 or 6.4 (the attribute is `@specialized`), `Dictionary.mapKeyedValues` does not exist on 6.4, and `anyAppleOS` on 6.1 is a silent `unrecognized platform name` warning. Compile every API named in a note before citing it.

## Findings

### 1. Method, citation keys and what is imported

Citation keys. `fx:<dir>` is a fixture under `/home/mherwig/.cache/research-lang/swift-tools/fixtures/era-and-idioms/<dir>` (the measurement behind the claim). `repo@sha12:path:line` is the exemplar corpus under `/home/mherwig/.cache/research-lang/exemplars/swift/`. Every build used `--scratch-path /home/mherwig/.cache/research-lang/swift-tools/build/era-and-idioms-<version>-<dir>` and nothing was built inside an exemplar. Toolchains: `swift:6.4` (6.4.0), `swift:6.3` (6.3.3), `swift:6.1` (6.1.3); the static Linux SDK `swift-6.4.0-RELEASE_static-linux-0.1.0` for the musl check.

Imported, not re-derived:

| Imported | From | Used here as |
|---|---|---|
| K-07 set E01-E16 (E10 absent) with E08 replaced by the SW-TEST-03 grep and E16 replaced by the first SW-CLI-03 grep | SW-GATE-10 in [swift-gates.md](../swift-gates.md), map "Wave 2 landed" contradictions 7 and 8 | the base gate; re-run verbatim on the plant (section "Verification runs" V1) |
| hatch rules SW-CONC-01..10 | [swift-concurrency.md](../swift-concurrency.md) | pointers only; `weak let` and `~Sendable` appear here only as floor facts (SW-CONC-04 owns the policy) |
| SW-IO-01 `FilePath` from `SystemPackage`, never unconditional `import System` | [swift-io.md](../swift-io.md) | Linux half confirmed by compile: `no such module 'System'` on 6.3 and 6.4 (`fx:c-system-only`) |
| SW-IO-15 machine-facing numbers never through `Locale.current` or `en_001` | swift-io.md | not re-tested |
| SW-CLI-03 `exit` / `Darwin.exit` out of command code | [swift-cli.md](../swift-cli.md) | `Darwin` does not exist on Linux (module probe), which is why the agent's `Darwin.exit` fix fails |

### 2. The stale-idiom table

How the table is built. A "tell" is a pattern that marks code written from pre-Swift-6 habits. Each row names the modern form, the first release where the modern form compiles (measured on 6.1 vs 6.3 vs 6.4 unless "SE status" is stated), the check, and the corpus noise. K-07 rows are cited by ID and not repeated.

| Tell | Modern form | Since | Check | Notes |
|---|---|---|---|---|
| `DispatchQueue.*`, `DispatchSemaphore`, `DispatchGroup` | structured concurrency, `Mutex` | 5.5 / 6.0 | **K-07 E04** (SW-CONC) | imported |
| `completion...: @escaping`, `@escaping (Result<` | `async throws` | 5.5 | **K-07 E13** | imported |
| `ObservableObject`, `@Published`, `@StateObject`, `@ObservedObject`, `@EnvironmentObject` | `@Observable`; `Observations {}` outside views | iOS 17 / 6.2 | **K-07 E12** | imported; Linux half in section 3 |
| `NSLock`, `os_unfair_lock`, `pthread_mutex` | `Mutex` from `Synchronization` | 6.0 | **K-07 E14** | imported, a review prompt |
| `Task.detached`, `MainActor.run`, `try!`, `as!`, `Process()`, `exit(` | see SW-CONC, SW-ERR, SW-IO, SW-CLI | | **K-07 E03 E05 E09 E11 E16** | imported |
| `Task.sleep(nanoseconds:`, `Thread.sleep`, `usleep(` | `Task.sleep(for:)` | 5.7 | **K-07 E07**; tests: SW-TEST-03 (E08) | imported |
| `import XCTest` in new tests | Swift Testing | 6.0 | SW-TEST; K-07 rejected the grep | imported |
| `DateFormatter`, `NumberFormatter` on machine data | `FormatStyle`, ISO8601 style | | SW-IO-15 | imported |
| `swiftLanguageVersions:`, `// swift-tools-version:5.x` | `swiftLanguageModes`, tools 6.x | 6.0 | SW-PKG; measured here: `fx:j-manifest-old` builds with a deprecation warning, rc 0 | imported |
| legacy threading: `OperationQueue`, `Thread.detachNewThread`, `Thread(block`, `NSThread`, `performSelector` | `Task`, task groups, `AsyncStream` | 5.5 | **T01** | not in E04; swift-build 28, SwiftPM 15 are real uses |
| Combine types: `AnyCancellable`, `PassthroughSubject`, `CurrentValueSubject`, `AnyPublisher` | `AsyncSequence`, `Observations` | 6.2 | **T02** | 1,307 hits, element-x-ios 1,175 |
| Apple-only imports (Combine, SwiftUI, UIKit, AppKit, Cocoa, CoreData, CoreGraphics, OSLog, CryptoKit, Security, Network, simd, Accelerate, UniformTypeIdentifiers, ObjectiveC, Darwin) | behind `#if canImport(X)` or a portable package | | **T03** | the gate is the Linux build (section 3) |
| `@objc`, `#selector`, `NSObject`, `autoreleasepool` | none on Linux | | **T04** | `Objective-C interoperability is disabled` |
| `OSAllocatedUnfairLock`, `Logger(subsystem`, `os_log(`, `mach_absolute_time`, `OSSignposter` | `Mutex`, swift-log, `ContinuousClock` | | **T05** | |
| `URLSession` / `URLRequest` in a file with no `FoundationNetworking` | `#if canImport(FoundationNetworking)` import | | **T06** | |
| `if let x = x`, `guard let y = y` | `if let x`, `guard let y` | 5.7 | **T07**; SwiftLint opt-in `shorthand_optional_binding` (SourceKit image only) | 4,392 hits: a style tell, not a defect |
| `.filter { }.count`, `.filter { }.isEmpty` | `count(where:)`, `contains(where:)` | 6.0 | **T08** (single-line forms only) | SwiftFairy flags the same pattern |
| `protocol P: class` | `protocol P: AnyObject` | 4.2 | **T09**; compiler: deprecation warning on 6.1, 6.3 and 6.4, error under `-warnings-as-errors` | |
| `@_implementationOnly`, `@_cdecl`, `@inline(__always)`, `@_specialize` | `internal import` (6.0), `@c` (6.3), `@inline(always)` (6.3), `@specialized` (6.3) | per form | **T10**, only when the floor admits the modern form | only `@_implementationOnly` warns |
| `Task { [weak self] in`, `[unowned self]` | see section 7 | | **T11** (review prompt) | |
| class neither `final` nor `open` | `final class` | | **T12** (review prompt) | section 6 |
| `[String: Any]` as a data model | `Codable` struct | | **T13**; JSON determinism is SW-IO | |
| `#available(iOS 1x`, `@available(macOS 10.` | drop below the deployment target | | **T14**; unverified: read only (Apple semantics) | Gallagher saw iOS 13 checks |
| `NavigationView`, `.foregroundColor(`, `.cornerRadius(`, `AnyView(` | `NavigationStack`, `.foregroundStyle`, `.clipShape` | | **T15**; unverified: read only | SW-APPLE owns |
| `[any P]` | generic `[S]` unless the elements are heterogeneous | 5.7 | **T16** (review prompt) | section 4 |
| `~Copyable`, `~Escapable`, `InlineArray` with no reason comment | a stated reason | | **T17** | section 9 |

The new greps, verbatim. Output is the violation (empty output = pass); `grep` exits 0 when it prints and 1 when it does not, and the `xargs` forms exit 123 on no match, so judge by the printed lines, as SW-GATE-10 does. Run from the repository root.

```sh
# T01 legacy threading (not in E04)
grep -rn --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -F -e 'OperationQueue' -e 'Thread.detachNewThread' -e 'Thread(block' -e 'NSThread' -e 'performSelector' .
# T02 Combine types
grep -rn --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -F -e 'AnyCancellable' -e 'PassthroughSubject' -e 'CurrentValueSubject' -e 'AnyPublisher' .
# T03 Apple-only imports
grep -rn --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -F -e 'import Combine' -e 'import SwiftUI' -e 'import UIKit' -e 'import AppKit' -e 'import Cocoa' -e 'import CoreData' -e 'import CoreGraphics' -e 'import OSLog' -e 'import CryptoKit' -e 'import Security' -e 'import Network' -e 'import simd' -e 'import Accelerate' -e 'import UniformTypeIdentifiers' -e 'import ObjectiveC' -e 'import Darwin' .
# T04 Objective-C runtime
grep -rn --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -F -e '@objc' -e '#selector' -e 'NSObject' -e 'autoreleasepool' .
# T05 Darwin-only APIs
grep -rn --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -F -e 'OSAllocatedUnfairLock' -e 'Logger(subsystem' -e 'os_log(' -e 'mach_absolute_time' -e 'OSSignposter' .
# T06 URLSession in a file that never mentions FoundationNetworking
grep -rLZ --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -F -e 'FoundationNetworking' . | xargs -r -0 grep -n -F -e 'URLSession' -e 'URLRequest'
# T07 redundant optional binding
grep -rn --include='*.swift' --exclude-dir='.build' -e 'if let \([A-Za-z_][A-Za-z0-9_]*\) = \1\b' -e 'guard let \([A-Za-z_][A-Za-z0-9_]*\) = \1\b' .
# T08 filter-then-count
grep -rn --include='*.swift' --exclude-dir='.build' -e '\.filter *{[^}]*} *\.count\b' -e '\.filter *{[^}]*} *\.isEmpty\b' -e '\.filter([^)]*)\.count\b' .
# T09 class-constrained protocol spelled with the class keyword
grep -rnE --include='*.swift' --exclude-dir='.build' -e 'protocol +[A-Za-z_]+ *: *class\b' .
# T10 underscored attributes that have a shipped replacement
grep -rn --include='*.swift' --exclude-dir='.build' -F -e '@_implementationOnly' -e '@_cdecl' -e '@inline(__always)' -e '@_specialize' .
# T11 weak/unowned self in Task (review prompt, section 7)
grep -rnE --include='*.swift' --exclude-dir='.build' -e 'Task *\{ *\[weak self\]' -e 'Task\.detached *\{ *\[weak self\]' -e '\[unowned self\]' .
# T12 classes that are neither final nor open (review prompt, section 6)
grep -rnE --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -e '^[[:space:]]*(@[A-Za-z]+ +)*class +[A-Z]' -e '^[[:space:]]*(@[A-Za-z]+ +)*public class +[A-Z]' -e '^[[:space:]]*(@[A-Za-z]+ +)*package class +[A-Z]' -e '^[[:space:]]*(@[A-Za-z]+ +)*internal class +[A-Z]' -e '^[[:space:]]*(@[A-Za-z]+ +)*private class +[A-Z]' -e '^[[:space:]]*(@[A-Za-z]+ +)*fileprivate class +[A-Z]' .
# T13 untyped dictionaries as models
grep -rnE --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -e '\[String: *Any\]' .
# T14 stale availability (unverified: read only; compare to the deployment target)
grep -rn --include='*.swift' --exclude-dir='.build' -e '#available(iOS 1[0-5]' -e '@available(iOS 1[0-5]' -e '#available(macOS 10\.' -e '@available(macOS 10\.' .
# T15 deprecated SwiftUI spellings (unverified: read only)
grep -rn --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -F -e 'NavigationView' -e '.foregroundColor(' -e '.cornerRadius(' -e 'AnyView(' .
# T16 arrays of existentials (review prompt, section 4)
grep -rn --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -e '\[any [A-Za-z]' .
# T17 ownership tokens with no multi-word reason on the line or the line above (output = unjustified)
find . -name '*.swift' -not -path './.build/*' -not -path './Tests/*' -print0 | xargs -r -0 awk '
  FNR == 1 { prev = "" }
  /~Copyable|~Escapable|InlineArray/ {
    if ($0 !~ /\/\/[[:space:]]*[^[:space:]]+[[:space:]]+[^[:space:]]+[[:space:]]+[^[:space:]]+/ &&
        prev !~ /^[[:space:]]*\/\/[[:space:]]*[^[:space:]]+[[:space:]]+[^[:space:]]+[[:space:]]+[^[:space:]]+/)
      print FILENAME ":" FNR ": " $0
  }
  { prev = $0 }'
```

Floor-band greps (section 5; each prints the tokens introduced in that band, so the reviewer runs the bands above the declared floor):

```sh
# F62 introduced in 6.2 (SE status; bracketed 6.1 red / 6.3 green)
grep -rnE --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -e 'InlineArray' -e '\[[0-9_]+ of [A-Za-z]' -e 'nonisolated\(nonsending\)' -e '@concurrent' -e 'Task\.immediate' -e 'isolated deinit' -e 'Observations *\{' -e '[^A-Za-z]MutableSpan' -e '[^A-Za-z]Span<' .
# F62b raw identifiers (6.2): a backtick name with a space
grep -rnE --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -e 'func `[A-Za-z0-9_]+ [^`]*`' -e '(let|var) `[A-Za-z0-9_]+ [^`]*`' .
# F63 introduced in 6.3
grep -rn --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -F -e 'weak let' -e '@export(' -e '@specialized(' -e '@inline(always)' -e 'Swift::' -e '@c(' -e '@c func' -e '@c enum' .
# F64 introduced in 6.4
grep -rn --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -F -e '~Sendable' -e '@diagnose(' -e 'anyAppleOS' -e 'withTaskCancellationShield' -e 'UniqueBox' -e 'UniqueArray' .
# F64b 6.4: optional opaque without parentheses; await inside defer (single-line forms)
grep -rnE --include='*.swift' --exclude-dir='.build' --exclude-dir='Tests' -e 'some [A-Za-z_.]+\?' -e 'defer *\{.*await ' .
```

Corpus noise (read-only runs of the same greps over all 40 exemplars, `fx:exemplar-stale.tsv`): T01 53 hits in 6 repos; T02 1,307 in 8; T03 2,945 in 35; T04 1,232 in 22; T05 64 in 10; T06 1,060 in 13; T07 4,392 in 38; T08 236 in 16; T09 27 in 3 (SwiftFormat 15, SwiftLint 9, swift-syntax 3); T10 4,743 in 21; T11 171 in 13; T12 1,623 in 27; T13 406 in 17; T14 1,811 in 26; T15 719 in 8; T16 931 in 28 (swift-build 521); T17 1,188 in 19 (swift-collections 770); F62 893 in 22; F62b 13 in 4; F63 663 in 5; F64 211 in 7; F64b 9 in 3. These are inventories on mature trees (SW-GATE-10 says the same of K-07): the greps are a review prompt on added lines, not a ban on a legacy tree.

### 3. Linux: unavailable modules, API breaks and guards

**Module list (measured).** `import X` typechecked in Swift 6 mode on `swift:6.4` and `swift:6.3` (glibc images), identical on both (`fx:modules/out.txt`, probe `fx:modules/probe.sh`; exit 0 = exists):

| Exists on Linux (rc 0) | Does not exist on Linux (rc 1) |
|---|---|
| `Swift`, `_Concurrency`, `_StringProcessing`, `Foundation`, `FoundationEssentials`, `FoundationInternationalization`, `FoundationNetworking`, `FoundationXML`, `Dispatch`, `Glibc`, `Observation`, `Synchronization`, `Testing`, `XCTest`, `RegexBuilder`, `Distributed`, `Cxx`, `CoreFoundation`, `_Differentiation` | `Combine`, `SwiftUI`, `UIKit`, `AppKit`, `Cocoa`, `CoreData`, `CoreGraphics`, `CoreImage`, `CoreText`, `CoreLocation`, `ObjectiveC`, `os`, `OSLog`, `CryptoKit`, `Security`, `Network`, `NetworkExtension`, `AVFoundation`, `Accelerate`, `simd`, `SwiftData`, `CloudKit`, `WebKit`, `StoreKit`, `MapKit`, `UniformTypeIdentifiers`, `Charts`, `WidgetKit`, `AppIntents`, `TipKit`, `Metal`, `SpriteKit`, `UserNotifications`, `Contacts`, `EventKit`, `LocalAuthentication`, `Vision`, `CoreML`, `NaturalLanguage`, `Speech` |
| | other-platform libc: `Darwin`, `WinSDK`, `ucrt`, `Android`, `Bionic`, `WASILibc`; `Musl` (exists on the static Linux SDK only) |
| | package products, not toolchain modules: `System` (use `SystemPackage`, SW-IO-01), `Crypto` (swift-crypto), `SystemPackage`; `CxxStdlib` needs C++ interop mode |

Replacements with evidence: `System` to `SystemPackage` compiles on 6.3 and 6.4 once the package depends on swift-system (`fx:c-system-twin`, rc 0, `from: "1.5.0"`); an `#if canImport(System) ... #else import SystemPackage` twin without the dependency still fails with `no such module 'SystemPackage'` (`fx:c-linux-twin`), so the guard needs the manifest dependency too. `OSLog` to swift-log and `CryptoKit` to `Crypto` are exemplar practice (swift-crypto and swift-log are in the corpus); no drop-in was measured for `Network`, `Security`, `UniformTypeIdentifiers`. Unverified: read only for the Apple side of every row.

**Build errors recorded (`fx:c-linux`, `fx:c-system-only`, `swift build`, rc 1 on 6.4 and 6.3):**

```text
Sources/Lib/A.swift:1:8: error: no such module 'Combine'
Sources/Lib/B.swift:1:8: error: no such module 'System'
```

**API breaks with the module present** (`fx:apis/`, typecheck, same result on 6.3 and 6.4):

| Snippet | rc | First error |
|---|---|---|
| `import Foundation; URLSession.shared` | 1 | `type 'URLSession' (aka 'AnyObject') has no member 'shared'` |
| same with `import FoundationNetworking` | 0 | |
| `final class A: NSObject { @objc func f() {} }` | 1 | `Objective-C interoperability is disabled` |
| `#selector(f)` | 1 | `Objective-C interoperability is disabled` |
| `autoreleasepool { }` | 1 | `cannot call value of non-function type 'module<autoreleasepool>'` |
| `Logger(subsystem:category:)` | 1 | `cannot find 'Logger' in scope` |
| `os_unfair_lock()`, `OSAllocatedUnfairLock` | 1 | `module<os_unfair_lock>` / `no such module 'os'` |
| `mach_absolute_time()` | 1 | `cannot find 'mach_absolute_time' in scope` |
| `NSLock`, `Process()`, `Timer.scheduledTimer`, `NotificationCenter`, `UserDefaults`, `String(format:)`, `NSRegularExpression`, `NSKeyedArchiver`, `Bundle.main`, `CGFloat` (Foundation), `DispatchQueue.main.async`, `pthread_create`, `arc4random_uniform` (glibc 2.36+) | 0 | compile fine |

The `URLSession` error is an agent trap: the message names no module and no import fix.

**Observation off the UI.** `@Observable` compiles and runs on Linux 6.3 and 6.4 (`fx:i-observation`): after two mutations a single `withObservationTracking` `onChange` fired once (`calls ... : 1`), so it is one-shot and must be re-armed; `Observations { c.n }` (6.2) yielded `[2, 3]` for a value observed at 2 and then set to 3. Rule consequence: a non-UI consumer of changes uses `Observations`, not a re-arming `withObservationTracking` loop. `ObservableObject` and `@Published` need Combine and so do not compile on Linux at all.

**libc import.** `import Glibc` unguarded builds on the glibc image (rc 0) and fails on `--swift-sdk x86_64-swift-linux-musl` with `no such module 'Glibc'`; the chain `#if canImport(Glibc) / #elseif canImport(Musl) / #elseif canImport(Darwin)` builds on both (`fx:k-musl`, `fx:k-musl-twin`). SW-CLI-07 and SW-IO-04 own the ordering and `@preconcurrency`; this is the compile proof of the need.

**Guards in practice.** Alamofire guards its Combine file by platform, `#if !((os(iOS) && ...) || os(Windows) || os(Linux) || os(Android) || os(FreeBSD))` before `import Combine` (`Alamofire@bda9ed57d729:Source/Features/Combine.swift:24-27`); swift-testing uses `#if canImport(Combine)` (`swift-testing@c7d68ca20cd7:Sources/Overlays/_Testing_Foundation/Attachments/_AttachableEncodableWrapper.swift:14`); SwiftPM uses `#if canImport(FoundationNetworking)` before `import FoundationNetworking` (`swift-package-manager@5546f44a3b52:Sources/Basics/HTTPClient/URLSessionHTTPClient.swift:15-17`). `canImport` is the better guard: it names the capability, not the OS list.

**The gate is a Linux build, not a grep.** A grep cannot see `#if` guards, so T03/T04/T05/T06 are prompts and the verification is `docker run --rm -v "$PWD":/src -w /src swift:6.4 swift build` (rc 0 on the twin, rc 1 on the plant, `fx:a-tells`, run through the research wrapper `run.sh swift build`). Windows and Android legs are unverified: read only.

### 4. some, any and generics

Primary text: a function returning an opaque type hides the concrete type but "Opaque types preserve type identity"; a boxed protocol type "don't[es] preserve type identity" and "Swift adds a level of indirection when necessary - this indirection is called a box, and it has a performance cost" ([TSPL Opaque and Boxed Protocol Types](https://raw.githubusercontent.com/swiftlang/swift-book/main/TSPL.docc/LanguageGuide/OpaqueTypes.md)). `any` was introduced in Swift 5.6 and "will become the default in a future language mode"; `ExistentialAny` diagnoses every bare existential ([userdocs ExistentialAny](https://raw.githubusercontent.com/swiftlang/swift/main/userdocs/diagnostics/existential-any.md), [SE-0335](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0335-existential-any.md), status Implemented 5.6). `some` in parameter position is sugar for an anonymous generic ([SE-0341](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0341-opaque-parameters.md), 5.7). Implicit existential opening lets an `any P` be passed to `<T: P>` (SE-0352, 5.7).

Measured on 6.3 and 6.4 (`fx:d-existential`, `fx:d-any-*`):

| Case | Result |
|---|---|
| bare `[Shape]` / `-> Shape` in Swift 6 mode, no flags | rc 0 (`-swift-version 6` does not require `any`) |
| `-enable-upcoming-feature ExistentialAny` | rc 0, warning `use of protocol 'Shape' as a type must be written 'any Shape'; this will be an error in a future Swift language mode [#ExistentialAny]` |
| `-Werror ExistentialAny` without the feature | rc 0, silent (nothing to promote) |
| feature + `-warnings-as-errors`, or feature + `-Werror ExistentialAny` | rc 1 on the bare form, rc 0 on `any Shape` |
| SwiftPM: `.enableUpcomingFeature("ExistentialAny")` alone | `swift build` rc 0 (warning only); with `-Xswiftc -warnings-as-errors` rc 1 on bare, 0 on `[any Shape]` and on `<S: Shape>` (`fx:d-any-warn`, `fx:d-any-green`) |
| SwiftPM `.treatWarning("ExistentialAny", as: .error)` (tools 6.2) | rc 1 on bare (`fx:d-any-err`); a manifest-level promotion in a published library conflicts with SW-GATE-14, so CI uses the command-line form |
| `any Equatable == any Equatable` | rc 1, `binary operator '==' cannot be applied to two 'any Equatable' operands` (`fx:d-existential/open.swift`) |
| `func f(_ x: any P) -> Int { g(x) }` with `g<T: P>`; `func h(_ x: some P)` | rc 0 (implicit opening, opaque parameter) |

Cost (`fx:d-existential/bench.swift`, `swiftc -O`, 6.4, 2,000,000 elements, best of five, two runs; ratio matters, absolute times are machine noise):

| Layout | generic `<S: Shape>([S])` | `[any Shape]` | ratio |
|---|---|---|---|
| `Square` (1 Double, fits the inline existential buffer) | 0.91 ms / 2.05 ms | 8.17 ms / 8.99 ms | 4.4x - 9x |
| `Big` (4 Doubles, boxed on the heap) | 4.38 ms / 5.46 ms | 9.97 ms / 10.36 ms | 1.9x - 2.3x |

So an existential is a runtime dispatch plus (for larger values) a heap box. It is the right tool when the set of conforming types is open at runtime. The decision rule used in the candidates: parameter positions take `some P` (one use) or `<T: P>` (named in another position, a `where` clause or the body); a return takes `some P` when one concrete type is returned and `any P` only when different conformers are returned at runtime or stored in one collection; a stored property or public API type that must erase takes `any P`, spelled out. Exemplar shape: `any` is 6,636 occurrences vs `some` 4,111 across 1,220,887 prod LOC; Alamofire is the `any` extreme (383.6 per 10k LOC) because it stores `(any RequestInterceptor)?` (`Alamofire@bda9ed57d729:Source/Core/Session.swift:75`); the apps are the `some` extreme (IceCubes 134.0, element-x 151.9 per 10k, SwiftUI `some View`) ([shape](../swift-audit/exemplar-language-shape.md) Axis 3). 15 of 38 manifests enable `ExistentialAny` (swift-log `Package.swift:59`, swift-testing `Package.swift:461`, swift-protobuf `Package.swift:465`).

Not measured: the ABI half of "an existential in a public signature is an ABI defect". Changing a public `some P` return to `any P` changes the type identity callers see (the `==` failure above is the source-level symptom); the ABI statement is reasoned from TSPL, unverified here, and library-evolution modules should keep the rule "do not change it after release" without a measured ABI claim. No swift-format rule and no SwiftLint rule enforces `any`; `syntactic_sugar` (default on) and `shorthand_optional_binding` (opt-in) are the nearest SwiftLint rules and neither is about existentials. The compiler is the checker.

### 5. Floor-raising syntax

**tools-version does not gate syntax.** `fx:b-weaklet-tools60` is a `// swift-tools-version: 6.0` package using `weak let`: `swift build` rc 0 on 6.3 and 6.4, rc 1 on 6.1 with `error: 'weak' must be a mutable variable, because it may change at runtime`. Its pre-6.3 twin (`Mutex<Box>` holding a `weak var`, `fx:b-weaklet-twin`) is rc 0 on 6.1, 6.3 and 6.4. The declared floor in the manifest therefore says nothing about what the sources need; only a build on the floor toolchain does.

**Pins, compiled** (`fx:forms/`, `swiftc -typecheck -swift-version 6`; rc per toolchain; SE status in the last column). 6.2 was not available as an image, so a 6.2 pin is the 6.1-red / 6.3-green bracket plus the SE status.

| Form | 6.1 | 6.3 | 6.4 | Introduced (SE / CHANGELOG) |
|---|---|---|---|---|
| `weak let x: C?` in a `Sendable` class | 1 | 0 | 0 | 6.3, [SE-0481](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0481-weak-let.md), upcoming flag `ImmutableWeakCaptures` (immutable weak captures are a source break behind that flag) |
| `class Base: ~Sendable` | 1 `conformance to 'Sendable' cannot be suppressed` | 1 `'~Sendable' requires -enable-experimental-feature TildeSendable` | 0 | 6.4, [SE-0518](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0518-tilde-sendable.md) |
| `@diagnose(DeprecatedDeclaration, as: ignored, reason: ...)` | 1 | 1 `cannot find type 'diagnose'` | 0 | 6.4, [SE-0522](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0522-source-warning-control.md), flag `SourceWarningControl` |
| `some P?` | 1 | 1 | 0 | 6.4, SE-0521 per the [6.4 release post](https://www.swift.org/blog/swift-6.4-released/) |
| `defer { await cleanup() }` | 1 `'async' call cannot occur in a defer body` | 1 | 0 | 6.4, SE-0493 ([CHANGELOG](https://raw.githubusercontent.com/swiftlang/swift/main/CHANGELOG.md)) |
| `withTaskCancellationShield { }` | 1 | 1 | 0 | 6.4, SE-0504 |
| `@available(anyAppleOS 26.0, *)` | 0 with `warning: unrecognized platform name 'anyAppleOS'` | 1 `requires -enable-experimental-feature AnyAppleOSAvailability` | 0 | 6.4; on 6.1 the attribute silently does nothing |
| `UniqueBox(1)` | 1 | 1 | 0 | 6.4 |
| `Iterable` protocol | 1 | 1 | 0 | 6.4 |
| `@c func`, `@c @implementation` | 1 `unknown attribute 'c'` | 0 | 0 | 6.3 ([6.3 post](https://www.swift.org/blog/swift-6.3-released/)) |
| `Swift::Int(1)` module selector | 1 | 0 | 0 | 6.3, SE-0491 |
| `@export(implementation)` | 1 `unknown attribute 'export'` | 0 | 0 | 6.3 |
| `@inline(always)` | 1 `unknown option 'always'` | 0 | 0 | 6.3 (`@inline(__always)` compiles on all) |
| `@specialized(where T == Int)` | 1 | 0 | 0 | 6.3, [SE-0460](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0460-specialized.md); `@specialize(...)` as written in the release post is rc 1 everywhere |
| raw identifier ``func `square() returns x * x`()`` | 1 | 0 | 0 | 6.2, [SE-0451](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0451-escaped-identifiers.md) |
| `InlineArray<3, Int> = [1, 2, 3]` | 1 `cannot find type 'InlineArray'` | 0 | 0 | 6.2, [SE-0453](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0453-vector.md) |
| `[3 of Int]`, `[_ of Int]` sugar | 1 | 0 | 0 | 6.2, [SE-0483](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0483-inline-array-sugar.md) |
| `nonisolated(nonsending)`, `@concurrent` | 1 | 0 | 0 | 6.2 (SE-0461) |
| `Task.immediate { }` | 1 | 0 | 0 | 6.2 |
| `isolated deinit` | 1 (needs a flag) | 0 | 0 | 6.2 (SE-0371) |
| `unsafe p.pointee` expression | 1 | 0 | 0 | 6.2 |
| `Array.span` | 1 | 0 | 0 | 6.2 |
| `Mutex` (`import Synchronization`), `sending`, `throws(E)` | 0 | 0 | 0 | 6.0 |
| `Dictionary.mapKeyedValues` | 1 | 1 | 1 | not in 6.4 (the shift table says 6.4) |

**Guards.** `fx:guards.swift.txt` (a file with `#if hasFeature(SourceWarningControl)` around `@diagnose`, `#if compiler(>=6.4)` around `~Sendable` and `#if compiler(>=6.3)` around `weak let`) typechecks rc 0 on 6.1, 6.3 and 6.4. Feature probes on a compiled program: `hasFeature(SourceWarningControl)` false/false/true, `hasFeature(TildeSendable)` false/false/true, `hasFeature(ImmutableWeakCaptures)` false/false/false on 6.1/6.3/6.4. So `hasFeature` works for experimental features that shipped in 6.4 and is useless for the upcoming-feature name `ImmutableWeakCaptures`; `compiler(>=N)` always works. swift-crypto, a tools-6.2 package, uses the first form: `#if hasFeature(SourceWarningControl)` / `@diagnose(ImplementationOnlyDeprecated, as: ignored) @_implementationOnly import CCryptoBoringSSL` (`swift-crypto@1c80d3aff53f:Sources/CryptoExtras/AES/AES_GCM_SIV.swift:16-17`). swift-collections takes the other route and raises its tools version to 6.4 (`swift-collections@935f696a549a:Package.swift:1`), as does vapor; sourcekit-lsp's tools 6.3 matches its `private weak let` (`sourcekit-lsp@c6ce93d5f8aa:Sources/SourceKitLSP/IndexProgressManager.swift:34`).

**`~Sendable` plant (`fx:b-red`, tools 6.2):** `swift build` rc 1 on 6.3 with `'~Sendable' requires -enable-experimental-feature TildeSendable`, rc 0 on 6.4. Twin without it (`fx:b-twin`: a plain class plus `@available(*, unavailable) extension Base: Sendable {}`, the pre-6.4 audit spelling in SE-0518's motivation) rc 0 on both. The guarded variant (`fx:b-guarded`, `#if compiler(>=6.4)` with the twin in the `#else`) rc 0 on both; `#if hasFeature(TildeSendable)` (`fx:b-hasfeature`) also rc 0 on both. Caveat from SE-0518: an unavailable `Sendable` conformance is inherited by subclasses, `~Sendable` is not, so the two spellings are not equivalent for a class that subclasses may make `Sendable`.

**Check recipe.** (1) The band greps F62/F62b/F63/F64/F64b list every token newer than the floor; each hit needs an enclosing `#if compiler(>=...)` or `#if hasFeature(...)` or a floor raise. (2) The real gate is the floor build: `docker run --rm -v "$PWD":/src -w /src swift:<floor> swift build` (with the research wrapper: `SWIFT_VERSION=6.1 run.sh swift build --scratch-path "$SWIFT_SCRATCH/era-and-idioms"`). On the plant `a-tells/plant` F62..F64b printed 6, 1, 4, 4, 1 lines and the plant fails to compile on 6.1 (`consecutive statements on a line must be separated by ';'` at the first 6.3+ token); the twin printed 0 and builds on 6.1 and 6.4.

### 6. final and open

- Checked `Sendable` requires `final`: `public class Cache: Sendable { let limit = 10 }` is rc 1 on 6.3 and 6.4 (`non-final class 'Cache' cannot conform to the 'Sendable' protocol`); `public final class Cache: Sendable` is rc 0; `open class Cache: @unchecked Sendable` is rc 0 and is exactly the hatch SW-CONC-01 constrains (`fx:g-final`).
- Corpus: 72.4% of production classes are `final` (2,071 of 2,860) and there are 52 `open class` declarations; the lowest `final` shares are swift-syntax 23% (node classes are `final` by macro), IceCubes 25% and element-x 43% ([shape](../swift-audit/exemplar-language-shape.md) Axis 2). One `open class Spec: @unchecked Sendable` hierarchy holds 237 of the corpus's 564 `@unchecked Sendable` (`swift-build@2187330e13e7:Sources/SWBCore/SpecImplementations/Specs.swift:29`, [conc](../swift-audit/exemplar-concurrency.md) Axis 1): an open hierarchy is where the compiler stops checking.
- A copy-on-write box is the legitimate `private final class ... : @unchecked Sendable` (`Nuke@d5548dd61395:Sources/Nuke/ImageContainer.swift:147`, with `isKnownUniquelyReferenced` at :141); a conditional unchecked conformance on a generic iterator is the other common form (`swift-collections@935f696a549a:Sources/DequeModule/Deque/Deque+Collection.swift:170`). Both are final or generic-conditional and carry the guard in the body; neither carries a comment naming the guard, which SW-CONC-01 requires.
- SwiftLint has `redundant_final` (opt-in; flags `final` that has no effect) and `static_over_final_class`; no SwiftLint and no swift-format rule flags a missing `final`, so T12 (a grep with false positives: SwiftLint 602, element-x 238, tuist 212 hits) is a review prompt and the compiler error above is the hard gate.

### 7. [weak self] and what a Task captures

Primary text. Apple's `Task` documentation: after the closure runs to completion "this closure is eagerly released", so "tasks rarely need to capture weak references to values"; its example stores the task on an actor and notes the strong capture of `self` "is released" when the task completes ([Task](https://developer.apple.com/documentation/swift/task.md)). TSPL: a closure stored on a class instance that captures the instance forms a cycle, broken by a capture list ([ARC, closures](https://raw.githubusercontent.com/swiftlang/swift-book/main/TSPL.docc/LanguageGuide/AutomaticReferenceCounting.md)). Donny Wals: tasks that iterate async sequences "are fairly likely to have memory leaks", and `[weak self]` followed by `guard let self` held across a long call re-pins `self` for that call ([How to unwrap [weak self] in Swift Concurrency Tasks](https://www.donnywals.com/how-to-use-weak-self-in-swift-concurrency-tasks/)).

Measured (`fx:f-weak`, `swiftc -O -swift-version 6`, 6.3.3 and 6.4, same result):

| Program | Result | exit |
|---|---|---|
| `Poller` stores `task = Task { while !Task.isCancelled { sleep; self.tick() } }`, strong capture | `deinit_count=0`: a cycle, the object never dies | 1 |
| same with `Task { [weak self] in ... guard let self else { return } ... }` and `deinit { task?.cancel() }` | `deinit_count=1` | 0 |
| short unstored `Task { await w.work() }`, strong capture | `ran=1 deinit_count=1`: no cycle, the strong capture ends with the task | |
| short unstored `Task { [weak w] in sleep; await w?.work() }` | `ran=0 deinit_count=1`: the work silently never ran | |

The compiler side. 6.4 adds the `ImplicitStrongCapture` warning group ([userdocs](https://raw.githubusercontent.com/swiftlang/swift/main/userdocs/diagnostics/implicit-strong-capture.md)): a nested closure with `[weak self]` inside an outer escaping closure that does not capture `self` explicitly makes the outer closure capture `self` strongly. On 6.4 the plant (`fx:f-weak/nested.swift`) gives `warning: 'weak' ownership of capture 'self' differs from implicitly-captured strong reference in outer scope [#ImplicitStrongCapture]` and is rc 1 under `-Werror ImplicitStrongCapture`; the fix `run { [weak self, service] in ... }` is rc 0. On 6.3 the same file is silent (rc 0), and `-Werror ImplicitStrongCapture` on 6.3 prints `warning: unknown warning group: 'ImplicitStrongCapture' [#UnknownWarningGroup]` and exits 0 unless `-warnings-as-errors` is also set (this is why SW-GATE-15 never names a group absent on the oldest leg). John Sundell documents the same warning with the `Timer.scheduledTimer` example ([Why Swift is introducing a warning for weak captures within nested closures](https://www.swiftbysundell.com/articles/warning-for-nested-weak-self-closure-captures/), 2026-08-30).

Decision used in the candidates: use `[weak self]` (or `[weak owner = self]`) when the closure or task is stored by `self` or registered with something `self` outlives, and can run unboundedly (a polling or `for await` loop, an observer, a timer, a delegate callback). Do not use it on a short, finite, unstored `Task`; there the strong capture is correct and the weak one risks dropping the work. In a loop, re-bind per iteration and do not hold the strong reference across a suspension that can be long. `unowned` is a crash risk and a different decision: SwiftLint `unowned_variable_capture` (opt-in) flagged `[unowned self]` in the plant (see V12).

### 8. Type-checker timeouts

Why. The expression type checker solves one expression at a time; overload disjunctions make the worst case exponential. It gives up after one million disjunction attempts per expression or a 512 MB per-expression arena; the wall-clock limit "is no longer enabled by default"; an integer literal has two default types (`Int`, `Double`), so mixed literal arithmetic is the pathological case, and a language change requiring a decimal point is floated but not shipped ([Slava Pestov, Roadmap for improving the type checker, 2025-10-30](https://forums.swift.org/t/roadmap-for-improving-the-type-checker/82952)).

Measured (`fx:typecheck`, `fx:d-tc-red`, `fx:d-tc-green`): the failure.md §2.10 expression (an invalid Int/Double mix) and a **valid** one both time out on 6.3 and 6.4:

```swift
let w = 3.0, h = 4.0
let r = [1, 2, 3].map { Double($0) * 1.5 + w / 2 - h * 0.25 + 3 * 2.0 - 1 + Double($0) / 4 }.reduce(0, +) + 1 + 2.5 * w - h / 2 + 3 * 4
```

`swiftc -typecheck -swift-version 6 -Xfrontend -warn-long-expression-type-checking=200` rc 1 on both: `error: the compiler is unable to type-check this expression in reasonable time; try breaking up the expression into distinct sub-expressions` plus `warning: expression took 4336ms to type-check (limit: 200ms)` on 6.4 (4.3-4.7 s over runs) and 5.2-11.5 s on 6.3. The validity of the red case is shown by an annotated version (`v3_annotated.swift`) that compiles rc 0. The split twin (one typed `let` per sub-expression, `Double(x)` made explicit, a local `func term`) is rc 0 with no warning on both. A sweep for an expression inside the 200 ms to one-million-attempt window found none (the cliff between 7 and 6 terms is sharp: fast or error), so the 200 ms warning behaves as an early alarm that arrives together with the error on this family.

The gate as a SwiftPM command, run on `fx:d-tc-red` (rc 1) and `fx:d-tc-green` (rc 0) on 6.4 and 6.3:

```sh
swift build -Xswiftc -Xfrontend -Xswiftc -warn-long-expression-type-checking=200 -Xswiftc -warnings-as-errors
```

The red output on 6.4: `error: the compiler is unable to type-check this expression in reasonable time ...` and `error: expression took 4421ms to type-check (limit: 200ms)` (the warning promoted by `-warnings-as-errors`; 6.3: 6622 ms). Fix pattern, in order: give every numeric literal operand its type (`3.0`, not `3`), bind each sub-expression to a typed `let`, extract a local function for a closure body, and never rely on literal defaulting inside a long chain. `-warn-long-function-bodies=N` is the sibling flag; not run here.

### 9. Span, InlineArray and noncopyable types

- `Span` (6.2, `Array.span`), `InlineArray` (6.2) and `~Copyable` (6.0) compile as listed in section 5. The 6.3 `@unsafe` marking of `Span.bytes` and `MutableSpan.mutableBytes` for padded element types is in the [CHANGELOG](https://raw.githubusercontent.com/swiftlang/swift/main/CHANGELOG.md) (Swift 6.3); unverified here.
- Over-application test, measured (`fx:h-ownership`). `struct Token: ~Copyable { var id: Int }` used as an ordinary model: `let tokens = [Token(id: 1)]` is rc 1 (`generic struct 'Array' requires that 'Token' conform to 'Copyable'`), and `func log(_ t: Token)` is rc 1 (`parameter of noncopyable type 'Token' must specify ownership`), then a second `log(t)` is a use-after-consume error; the ordinary `struct Token` twin is rc 0 on 6.3 and 6.4. A noncopyable type is warranted for a unique-resource lifetime (a descriptor closed exactly once), not for a model.
- `InlineArray<4, Int>` vs `[Int]` of four elements, non-escaping, in a 5,000,000-iteration loop, `swiftc -O`, 6.4, best of five, two runs: `Array` 7.20 ms and 7.22 ms; `InlineArray` 7.48 ms and 7.26 ms. No gain: the optimizer already promotes a non-escaping small array to the stack. `InlineArray` is for a fixed-size storage member or a layout guarantee, and needs a measurement.
- Corpus: `~Copyable` 1,267 hits in 13 repos (swift-collections 162.6 per 10k LOC), `InlineArray` 32 hits in 5 repos, `Span` family 833 hits in 7 repos; 22 of 40 repos have no ownership features, including both apps, tuist, SwiftLint, SwiftFormat, Alamofire and TCA ([shape](../swift-audit/exemplar-language-shape.md) Axis 3). 6.4 adds `UniqueBox`, `UniqueArray`, `Iterable` (compile pins in section 5); the shift table's "over-applies `~Copyable` to ordinary models" is the agent failure to guard against.
- Check: T17 prints every `~Copyable`, `~Escapable` or `InlineArray` line with no multi-word reason comment on the line or the line above, and the compiler errors above stop the model-type case. The reason must be real (a measurement or a resource lifetime); like SW-GATE-10's justification pass it checks that a reason exists, not that it is true.

### 10. InferIsolatedConformances is a no-op without global-actor types

Map contradiction 4 reasons from SE-0470 that the upcoming feature (`InferIsolatedConformances`, [SE-0470](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0470-isolated-conformances.md), Implemented 6.2) changes nothing in a module without global-actor-isolated conformances. Measured (`fx:e-infer/run-e.sh`, `swiftc -swift-version 6 -parse-as-library -O`, `-emit-sil` and `-emit-ir`, first two lines (ModuleID / source_filename) stripped before `cmp`):

| Module | Toolchain | feature off | feature on | SIL / IR compared |
|---|---|---|---|---|
| `noglobal.swift`: protocols, structs, a class, a non-global actor, a nonisolated async function | 6.4 and 6.3.3 | rc 0 | rc 0 | IDENTICAL / IDENTICAL |
| `withglobal-ok.swift`: `@MainActor final class Box: Shape` used only from `@MainActor` | 6.4 and 6.3.3 | rc 1 `conformance of 'Box' to protocol 'Shape' crosses into main actor-isolated code and can cause data races [#ConformanceIsolation]` | rc 0 | n/a |
| `withglobal.swift`: same plus a nonisolated generic call | 6.4 and 6.3.3 | rc 1 (`#ConformanceIsolation`) | rc 1 `main actor-isolated conformance of 'Box' to 'Shape' cannot be used in nonisolated context [#IsolatedConformances]` | n/a |

The same module as a SwiftPM package with `.enableUpcomingFeature("InferIsolatedConformances")` vs none (`fx:e-pkg-on`, `fx:e-pkg-off`) builds rc 0 on 6.3 and 6.4 in both configurations. Conclusion: SW-PKG-08 ("enable it with NonisolatedNonsendingByDefault in every new package") stands; in a module without global-actor conformers the flag is a measured no-op, and with one it turns an unavoidable error into an isolated conformance, which is the point of the feature.

### 11. The API Design Guidelines are older than this topic

[swift.org API Design Guidelines](https://www.swift.org/documentation/api-design-guidelines/) say nothing about `some`, `any`, `final`, `Sendable`, `async` or `[weak self]`; their code samples still use pre-Swift-3 and pre-5.6 spellings (`SequenceType` in the `append` overload example, `UnsafePointer<Void>`). What still applies and is checkable by reading: protocols that describe what something is "read as nouns (e.g. `Collection`)" and capability protocols use the `able`, `ible` or `ing` suffix (`Equatable`, `ProgressReporting`); "document the complexity of any computed property that is not O(1)"; "take extra care with unconstrained polymorphism (e.g. `Any`, `AnyObject`, and unconstrained generic parameters) to avoid ambiguities in overload sets". Use the guidelines for naming and the SE proposals and compiler for everything above; do not cite the guidelines for any `some`/`any` or `final` decision.

### 12. Corrections to the shift table

Measured differences from [shifts.md](../swift-topic-map/shifts.md) "Use X not Y" (all `fx:forms/`):

- `Dictionary.mapKeyedValues` is listed as available from 6.4 ("accepted with modifications"); it does not compile on 6.4 (`value of type '[String : Int]' has no member 'mapKeyedValues'`). Treat it as "next".
- `@specialize(where ...)` is the spelling in the 6.3 release post and the table; the attribute that parses on 6.3 and 6.4 is `@specialized(where T == Int)` (SE-0460's spelling). `@specialize(...)` and `@specialize(exported:...)` are rc 1 on 6.1, 6.3 and 6.4.
- `anyAppleOS`: 6.3 needs the experimental flag; 6.1 warns and ignores it (section 5).
- The `Observation` row "iOS 17 / 6.2 / 6.4" is consistent with the Linux runs (section 3).
- A new class of agent error not in the table: `withDeadline(in:)` appears under "Swift (next)" in the CHANGELOG, not in the 6.4 section (confirmed by reading the CHANGELOG headings: SE-0526 sits above `## Swift 6.4`).

## Normative guidance candidates

IDs are working numbers inside SW-LANG for this dive; the consolidation renumbers. "RAN" says whether the verification was run against a planted violation and a compliant twin. Plant and twin for every grep: `fx:a-tells/plant`, `fx:a-tells/twin`; compile plants as named.

1. **SW-LANG-01 (MUST).** Run the K-07 set (SW-GATE-10, with E08 and E16 as amended by contradictions 7 and 8) and then T01, T02, T07-T11, T13 and T16 on every change that adds Swift; each hit is removed or justified in the pull-request text. Rationale: the K-07 set does not see legacy threading, Combine types or the stale spellings, and agents emit them from 2023-24 habits. Verify: V1 and V2 (commands in section 2; output is the violation). RAN: yes, 15 K-07 entries and 17 new entries red on the plant (hit counts in V1/V2) and 0 on the twin.
2. **SW-LANG-02 (MUST).** New code does not use `OperationQueue`, `Thread.detachNewThread`, `Thread(block`, `NSThread`, `performSelector` or Combine types (`AnyCancellable`, `PassthroughSubject`, `CurrentValueSubject`, `AnyPublisher`) outside a module that is documented Apple-only legacy. Rationale: Combine does not exist on Linux (`no such module 'Combine'`) and async sequences replace it. Verify: T01 and T02 (empty output). RAN: yes (`fx:a-tells`: 2 and 2 lines, twin 0).
3. **SW-LANG-03 (MUST).** Every Apple-only import (`Combine`, `SwiftUI`, `UIKit`, `AppKit`, `Cocoa`, `CoreData`, `CoreGraphics`, `OSLog`, `CryptoKit`, `Security`, `Network`, `simd`, `Accelerate`, `UniformTypeIdentifiers`, `ObjectiveC`, `Darwin`) in a target that also builds on Linux sits inside `#if canImport(X)`; the module list of section 3 is the reference. Rationale: 41 modules do not exist on the stock Linux toolchain. Verify: the Linux build `docker run --rm -v "$PWD":/src -w /src swift:6.4 swift build` exits 0 (and on the floor image), with T03 as the prompt listing the lines to inspect. RAN: yes (plant `swift build` rc 1 `no such module 'Combine'`; twin rc 0).
4. **SW-LANG-04 (MUST).** A file that uses `URLSession` or `URLRequest` imports `FoundationNetworking` behind `#if canImport(FoundationNetworking)`. Rationale: on Linux `URLSession.shared` fails with `type 'URLSession' (aka 'AnyObject') has no member 'shared'`, a message that names no import. Verify: T06 (empty output) plus the Linux build. RAN: yes (compile rc 1/0; T06 1 line vs 0, `xargs` rc 0 vs 123).
5. **SW-LANG-05 (MUST).** `@objc`, `#selector`, `NSObject` subclasses and `autoreleasepool` appear only in Apple-only files behind `#if canImport(ObjectiveC)`. Rationale: `Objective-C interoperability is disabled` on Linux. Verify: T04 (prompt), Linux build. RAN: yes (compile rc 1; T04 4 lines vs 0).
6. **SW-LANG-06 (MUST).** `import Glibc` is never unconditional in a package that may be built with the static Linux SDK; use `#if canImport(Glibc) / #elseif canImport(Musl) / #elseif canImport(Darwin)` (ordering and `@preconcurrency`: SW-CLI-07, SW-IO-04). Rationale: unguarded `Glibc` builds on glibc and fails with `no such module 'Glibc'` under `--swift-sdk x86_64-swift-linux-musl`. Verify: `swift build --swift-sdk x86_64-swift-linux-musl` exits 0. RAN: yes (`fx:k-musl` rc 1, `fx:k-musl-twin` rc 0).
7. **SW-LANG-07 (SHOULD).** State that depends on change notification outside a view uses `@Observable` with `Observations { }` (6.2+), not `ObservableObject` or a re-armed `withObservationTracking`. Rationale: `ObservableObject` needs Combine (absent on Linux); `withObservationTracking` fired once after two mutations on Linux 6.3 and 6.4. Verify: K-07 E12 (empty) and a Linux build; reading heuristic for the tracking loop. RAN: yes for the runtime facts (`fx:i-observation`), E12 red on the plant.
8. **SW-LANG-08 (SHOULD).** Use the modern spelling where the declared floor admits it: `if let x` (5.7), `count(where:)` / `contains(where:)` (6.0), `AnyObject` for class-constrained protocols; compile with `-warnings-as-errors` so `protocol P: class` is an error. Rationale: pure staleness tells that mark unreviewed agent output. Verify: T07, T08, T09 (empty); `swiftc -warnings-as-errors` on `protocol P: class {}` exits 1. RAN: yes (T07 2, T08 2, T09 1 lines vs 0; compiler rc 1 vs 0 for `AnyObject`). SwiftLint `shorthand_optional_binding` is an optional second check: it is silently skipped by the static binary and printed 2 `error:` lines (rc 2 with `--strict`) from the SourceKit image `fx:a-tells/swiftlint-lang.yml`.
9. **SW-LANG-09 (SHOULD).** When the floor is 6.3 or newer, replace `@_cdecl` with `@c`, `@inline(__always)` with `@inline(always)`, `@_specialize` with `@specialized`; when it is 6.0 or newer replace `@_implementationOnly import` with `internal import`. Never write `@specialize(...)`. Rationale: the underscored forms are unreviewed internals; only `@_implementationOnly` has a compiler diagnostic (`ImplementationOnlyDeprecated`, [userdocs](https://raw.githubusercontent.com/swiftlang/swift/main/userdocs/diagnostics/implementation-only-deprecated.md)); `@specialize` does not parse. Verify: T10 (empty at the matching floor), floor build. RAN: yes (T10 4 lines vs 0; `@specialize` rc 1 on 6.1/6.3/6.4).
10. **SW-LANG-10 (MUST).** An API, attribute or flag named in a release note, blog or table is compiled on the floor and the current toolchain before it is written into code or a rule. Rationale: the shift table lists `mapKeyedValues` for 6.4 (does not exist) and `@specialize` (does not parse), and `withDeadline` is "Swift (next)". Verify: `swift build` on both toolchains exits 0; a "cannot find ... in scope" or "no member" error is the signal. RAN: yes (`fx:forms/map_keyed.swift` rc 1 on 6.1, 6.3, 6.4).
11. **SW-LANG-11 (MUST).** A new package enables `ExistentialAny` (`.enableUpcomingFeature("ExistentialAny")`) and CI builds with `-Xswiftc -warnings-as-errors`; every protocol used as a type is written `any P`. Rationale: Swift 6 mode still accepts a bare protocol type; the feature gives a warning only; `-Werror ExistentialAny` without the feature is silent. Verify: `swift build -Xswiftc -warnings-as-errors` exits 1 on `[Shape]` and 0 on `[any Shape]`. RAN: yes (`fx:d-any-warn` rc 1, `fx:d-any-green` rc 0 on 6.3 and 6.4).
12. **SW-LANG-12 (SHOULD).** Pick the spelling by what the call site needs: a parameter used once is `some P`; a parameter that must be named elsewhere (same type twice, a `where` clause, the return) is `<T: P>`; a return is `some P` when one concrete type comes back; `any P` only when conformers differ at runtime (a plugin registry, a heterogeneous array, an erased stored property) and then written out. Rationale: `some` and generics keep type identity and specialise; `[any Shape]` was 4.4x-9x slower in a hot loop and `any Equatable == any Equatable` does not compile. Verify: T16 (review prompt: every `[any P]` needs the heterogeneity named) and the reading heuristic above; the compiler enforces the identity half. RAN: yes for T16 (1 line vs 0) and the compile and benchmark facts; the choice itself is a reading heuristic.
13. **SW-LANG-13 (SHOULD).** Do not change a released public `some P` return to `any P` or the reverse in a library; treat it as a source-breaking change. Rationale: identity-preserving vs erased types behave differently at call sites (the `==` failure). Verify: `swift package diagnose-api-breaking-changes` (SW-GATE-20) catches the declaration change. RAN: no (ABI and API-breakage behaviour not measured here; reading heuristic only).
14. **SW-LANG-14 (MUST).** The declared floor is the oldest toolchain that builds the tree: CI builds and tests on the floor image as well as the current one, and the manifest tools-version is raised the moment a source needs newer syntax. Rationale: a tools-6.0 package using `weak let` builds on 6.3 and 6.4 and fails on 6.1. Verify: `docker run --rm -v "$PWD":/src -w /src swift:<floor> swift build` exits 0. RAN: yes (`fx:b-weaklet-tools60` rc 1 on 6.1, 0 on 6.3/6.4; twin rc 0 on 6.1/6.3/6.4). Limit: only 6.1, 6.3 and 6.4 images exist here.
15. **SW-LANG-15 (MUST).** Syntax newer than the floor is guarded: `#if compiler(>=6.4)` for `~Sendable`, `some P?`, `defer { await }`, `withTaskCancellationShield`; `#if compiler(>=6.3)` for `weak let`, `@c`, `@inline(always)`, `@export`, `@specialized`, `::`; `#if hasFeature(SourceWarningControl)` for `@diagnose`; never `hasFeature(ImmutableWeakCaptures)` for `weak let`. Rationale: measured pins in section 5; the guards compile on 6.1, 6.3 and 6.4. Verify: the band greps F62-F64b with a floor below the band: every hit must be inside the guard (reading), and the floor build passes. RAN: yes (bands red on the plant 6, 1, 4, 4, 1 lines, twin 0; guarded file rc 0 on 6.1/6.3/6.4; unguarded `fx:b-red` rc 1 on 6.3).
16. **SW-LANG-16 (SHOULD).** In a library whose floor is below 6.4, express "audited non-Sendable" with `@available(*, unavailable) extension X: Sendable {}` and switch to `~Sendable` when the floor reaches 6.4; SW-CONC-04 owns whether the type states its intent. Rationale: `~Sendable` fails on 6.3 with `requires -enable-experimental-feature TildeSendable`; the unavailable form is inherited by subclasses, `~Sendable` is not. Verify: build on the floor image. RAN: yes (`fx:b-red` rc 1 on 6.3 and 0 on 6.4; `fx:b-twin`, `fx:b-guarded` rc 0 on both).
17. **SW-LANG-17 (MUST).** A class is `final` unless it is a documented extension point (`open`, with a comment naming the subclassing contract); a `Sendable` class must be `final`. Rationale: checked `Sendable` rejects a non-final class (`non-final class 'Cache' cannot conform to the 'Sendable' protocol`); an open `@unchecked Sendable` hierarchy held 237 of 564 corpus hatches. Verify: T12 (review prompt: each printed class is final-able or carries a comment) and `swiftc -swift-version 6` on the Sendable declaration exits 1. RAN: yes (T12 4 lines vs 0; compile rc 1 non-final, 0 final).
18. **SW-LANG-18 (MUST).** `[weak self]` (or `[weak owner = self]`) goes on a closure or `Task` that `self` stores or that is registered with something `self` outlives and that can run unboundedly (a polling or `for await` loop, an observer, a timer); it is not added to a short, finite, unstored `Task`, and `guard let self` is not held across a long suspension. Rationale: measured, an unweakened stored loop task leaves `deinit_count=0`; a weakened short task skips its work (`ran=0`). Verify: behavioural test that the owner deinits after the last strong reference drops (`cycle.swift` exits 1, `nocycle.swift` exits 0); T11 lists every `Task { [weak self]` for the reading check. RAN: yes (`fx:f-weak` runtime rc 1/0 on 6.3 and 6.4; T11 2 lines vs 0).
19. **SW-LANG-19 (MUST on 6.4+ legs).** A nested closure that captures `self` weakly inside a closure that captures it strongly is an error: on the 6.4 leg build with `-warnings-as-errors` (the group is a default-on warning there), and name `ImplicitStrongCapture` only on a leg whose oldest compiler knows it. Rationale: 6.3 is silent and a retain cycle results; 6.3 prints only `unknown warning group`. Verify: `swiftc -swift-version 6 -Werror ImplicitStrongCapture nested.swift` exits 1 on 6.4. RAN: yes (`fx:f-weak/nested.swift` rc 1, `nested_ok.swift` rc 0 on 6.4; 6.3 rc 0 with `#UnknownWarningGroup`).
20. **SW-LANG-20 (MUST).** `[unowned self]` is replaced by `[weak self]` unless a comment states the lifetime guarantee. Rationale: unowned traps when the referent is gone. Verify: T11 prints the line; optional SwiftLint `unowned_variable_capture` (opt-in). RAN: yes (T11; SwiftLint SourceKit image printed `error: Unowned Variable Capture Violation` on the plant, rc 2 with `--strict`, 0 on the twin).
21. **SW-LANG-21 (MUST).** The build gate includes `swift build -Xswiftc -Xfrontend -Xswiftc -warn-long-expression-type-checking=200 -Xswiftc -warnings-as-errors`; a timeout is fixed by typing each operand (`3.0`, `Double(x)`), one typed `let` per sub-expression, or a local function, never by raising a limit. Rationale: valid mixed-literal expressions fail with `unable to type-check this expression in reasonable time` on 6.3 and 6.4 and slow every build; the solver stops at one million attempts or 512 MB. Verify: the command exits 1 on the plant and 0 on the split twin. RAN: yes (`fx:d-tc-red` rc 1, `fx:d-tc-green` rc 0, on 6.3 and 6.4).
22. **SW-LANG-22 (SHOULD).** `~Copyable`, `~Escapable`, `InlineArray` and `Span` appear only with a multi-word reason on the line or the line above (a unique resource lifetime, a measurement, a C-interop layout). Rationale: a noncopyable model type breaks at the first array and un-annotated parameter; `InlineArray<4, Int>` was no faster than `[Int]` under `-O` (7.2 vs 7.3-7.5 ms). Verify: T17 (empty = every use is justified). RAN: yes (T17 4 lines vs 0; compile rc 1/0 for the model-type case).
23. **SW-LANG-23 (SHOULD).** Raw identifiers (backtick names with spaces) are used for test names only when the floor is 6.2 or newer; below it use `@Test("display name")`. Rationale: raw identifiers are rc 1 on 6.1 and rc 0 on 6.3. Verify: F62b prints each use; floor build. RAN: yes (F62b 1 line vs 0; compile bracket 6.1 rc 1 / 6.3 rc 0).
24. **SW-LANG-24 (SHOULD).** Do not hand-write `@available(anyAppleOS ...)` below a 6.4 floor. Rationale: 6.3 requires `-enable-experimental-feature AnyAppleOSAvailability`; 6.1 prints `unrecognized platform name 'anyAppleOS'` and exits 0 so the guard silently does nothing. Verify: F64 plus floor build with `-warnings-as-errors`. RAN: yes for the compile facts (`fx:forms/any_apple_os.swift`); Apple behaviour unverified: read only.
25. **SW-LANG-25 (MUST).** `InferIsolatedConformances` may be listed in every new package's manifest together with `NonisolatedNonsendingByDefault`; it is a no-op in a module with no global-actor-isolated conformers. Rationale: SIL and IR are byte-identical on 6.3.3 and 6.4 for such a module. Verify: `swiftc ... -emit-sil` with and without `-enable-upcoming-feature InferIsolatedConformances`, then `cmp` after dropping the first two IR lines. RAN: yes (`fx:e-infer`, IDENTICAL on both toolchains; positive control differs). Settles map contradiction 4 for SW-PKG-08.
26. **SW-LANG-26 (SHOULD).** Stale `#available(iOS 1x` and `@available(macOS 10.` checks are removed once they fall below the deployment target; deprecated SwiftUI spellings (`NavigationView`, `.foregroundColor(`, `.cornerRadius(`, `AnyView(`) are replaced. Rationale: LLMs add iOS 13 checks and use pre-2023 SwiftUI (Gallagher; SwiftFairy). Verify: T14 and T15 against the declared deployment target. RAN: grep yes (T14 2 lines vs 0, T15 1 line vs 0); the Apple semantics are unverified: read only.

## Verification runs

All greps were run from the root of `fx:a-tells/plant` (violations) and `fx:a-tells/twin` (compliant twin); the twin builds on 6.4 and 6.1 (`run-b.sh`, rc 0) and the plant does not. Counts are the printed lines; rc is the `grep` exit status (0 = printed something = red; 1 = nothing = green; 123 = `xargs` of a non-matching `grep`). Reproduce with `fx:verify-greps.sh` (wraps `k07-amended.sh` and `stale.sh`).

**V1. K-07 as amended (imported, re-run).**

| ID | plant lines / rc | twin lines / rc |
|---|---|---|
| E01 `@unchecked Sendable` | 1 / 0 | 0 / 1 |
| E02 `nonisolated(unsafe)` | 1 / 0 | 0 / 1 |
| E03 `Task.detached` | 1 / 0 | 0 / 1 |
| E04 GCD | 2 / 0 | 0 / 1 |
| E05 `MainActor.run` | 1 / 0 | 0 / 1 |
| E06 `@preconcurrency`, `assumeIsolated` | 2 / 0 | 0 / 1 |
| E07 `Thread.sleep`, `usleep(`, `Task.sleep(nanoseconds` | 3 / 0 | 0 / 1 |
| E08 (SW-TEST-03 grep, `Tests/`) | 1 / 0 | 0 / 1 |
| E09 `try!`, ` as! ` | 2 / 0 | 0 / 1 |
| E11 `Process()`, `NSTask`, `.launchPath` | 1 / 0 | 0 / 1 |
| E12 `ObservableObject` family | 2 / 0 | 0 / 1 |
| E13 completion handlers | 3 / 0 | 0 / 1 |
| E14 `NSLock` family | 1 / 0 | 0 / 1 |
| E15 suppressions | 1 / 0 | 0 / 1 |
| E16 (SW-CLI-03 first grep) | 1 / 0 | 0 / 1 |

**V2. New greps (commands verbatim in section 2).**

| ID | plant lines / rc | twin lines / rc |
|---|---|---|
| T01 | 2 / 0 | 0 / 1 |
| T02 | 2 / 0 | 0 / 1 |
| T03 | 4 / 0 | 0 / 1 |
| T04 | 4 / 0 | 0 / 1 |
| T05 | 3 / 0 | 0 / 1 |
| T06 | 1 / 0 | 0 / 123 |
| T07 | 2 / 0 | 0 / 1 |
| T08 | 2 / 0 | 0 / 1 |
| T09 | 1 / 0 | 0 / 1 |
| T10 | 4 / 0 | 0 / 1 |
| T11 | 2 / 0 | 0 / 1 |
| T12 | 4 / 0 | 0 / 1 |
| T13 | 1 / 0 | 0 / 1 |
| T14 | 2 / 0 | 0 / 1 |
| T15 | 1 / 0 | 0 / 1 |
| T16 | 1 / 0 | 0 / 1 |
| T17 (awk, judged by lines) | 4 / 0 | 0 / 0 |
| F62 | 7 / 0 | 0 / 1 |
| F62b | 1 / 0 | 0 / 1 |
| F63 | 4 / 0 | 0 / 1 |
| F64 | 4 / 0 | 0 / 1 |
| F64b | 1 / 0 | 0 / 1 |

An empty-directory canary is SW-GATE-10's; the twin run is the green. The plant fails to build (V3); the twin builds.

**V3. Linux build and floor build (`run-b.sh <version> <dir>` = `SWIFT_VERSION=<v> run.sh swift build --scratch-path .../era-and-idioms-<v>-<dir>`).**

| Fixture | Toolchain | rc | Output |
|---|---|---|---|
| `a-tells/plant` | 6.4 | 1 | `Sources/App/Platform.swift:1:8: error: no such module 'Combine'` |
| `a-tells/plant` | 6.1 | 1 | `Sources/App/Floor.swift:11:14: error: consecutive statements on a line must be separated by ';'` (first 6.3+ token) |
| `a-tells/twin` | 6.4 | 0 | |
| `a-tells/twin` | 6.1 | 0 | |
| `c-linux` (`import Combine`) | 6.4 and 6.3 | 1 | `error: no such module 'Combine'` |
| `c-system-only` (`import System`) | 6.4 and 6.3 | 1 | `error: no such module 'System'` |
| `c-system-twin` (depends on swift-system, `import SystemPackage`) | 6.4 and 6.3 | 0 | |
| `c-linux-twin` (Observation + `canImport(System)` else `SystemPackage`, no dependency) | 6.4 and 6.3 | 1 | `no such module 'SystemPackage'` (guard needs the dependency) |
| `k-musl` (`import Glibc`), `--swift-sdks-path .../sdks --swift-sdk x86_64-swift-linux-musl` | 6.4 | 1 | `error: no such module 'Glibc'` |
| `k-musl-twin` (canImport chain), same SDK | 6.4 | 0 | |
| `k-musl`, `k-musl-twin` on glibc | 6.4 | 0 / 0 | |

**V4. Syntax pins (`fx:forms/run.sh`, results in `forms-out.txt`, `forms2-out.txt`):** the table in section 5 is that output; every "1" is a red watched on the older toolchain, every "0" a green on the newer one.

**V5. `~Sendable` and `weak let` plants.**

| Fixture | 6.1 | 6.3 | 6.4 |
|---|---|---|---|
| `b-red` (tools 6.2, `~Sendable`) | n/a (tools 6.2) | rc 1 `'~Sendable' requires -enable-experimental-feature TildeSendable` | rc 0 |
| `b-twin` | | rc 0 | rc 0 |
| `b-guarded` (`#if compiler(>=6.4)`) | | rc 0 | rc 0 |
| `b-hasfeature` | | rc 0 | rc 0 |
| `b-weaklet-tools60` | rc 1 `'weak' must be a mutable variable` | rc 0 | rc 0 |
| `b-weaklet-twin` | rc 0 | rc 0 | rc 0 |

**V6. Existentials (`fx:d-existential`, `fx:d-any-*`).** Commands and results as in the section 4 table: `swiftc -typecheck -swift-version 6 -enable-upcoming-feature ExistentialAny -warnings-as-errors bare.swift` rc 1 and `modern.swift` rc 0 on 6.3 and 6.4; `... -Werror ExistentialAny` alone rc 0 on both; `swift build -Xswiftc -warnings-as-errors` rc 1 on `d-any-warn`, rc 0 on `d-any-green` (6.3 and 6.4).

**V7. Type-checker (`fx:typecheck`, `fx:d-tc-*`).**

| Command | Fixture | 6.4 | 6.3 |
|---|---|---|---|
| `swiftc -typecheck -swift-version 6 -Xfrontend -warn-long-expression-type-checking=200 <file>` | `red.swift` | rc 1, `expression took 4431ms` | rc 1 |
| same | `red_valid.swift` | rc 1, `expression took 4336ms` | rc 1 |
| same | `green.swift`, `green_v3.swift`, `v3_annotated.swift` | rc 0 | rc 0 |
| `swift build -Xswiftc -Xfrontend -Xswiftc -warn-long-expression-type-checking=200 -Xswiftc -warnings-as-errors` (`run-d.sh`) | `d-tc-red` | rc 1, `expression took 4421ms to type-check (limit: 200ms)` | rc 1, `6622ms` |
| same | `d-tc-green` | rc 0 | rc 0 |

**V8. InferIsolatedConformances (`fx:e-infer/run-e.sh`, `fx:e-out.txt`).** Results in the section 10 table; SIL and IR `IDENTICAL` for `noglobal` on 6.4 and 6.3.3 and feature-dependent rc for `withglobal-ok`; SwiftPM build `e-pkg-on` and `e-pkg-off` rc 0 on both.

**V9. Final/Sendable (`fx:g-final`).** `swiftc -typecheck -swift-version 6`: `sendable_nonfinal.swift` rc 1 (6.3, 6.4), `sendable_final.swift` rc 0, `sendable_open.swift` (`@unchecked`) rc 0.

**V10. `[weak self]` (`fx:f-weak`).** `swiftc -O -swift-version 6 -parse-as-library cycle.swift -o cycle && ./cycle`: `CYCLE deinit_count=0`, exit 1 (6.3 and 6.4). `nocycle.swift`: `NOCYCLE deinit_count=1`, exit 0. `cargo.swift`: `STRONG short task: ran=1 deinit_count=1`, `WEAK short task: ran=0 deinit_count=1`. `nested.swift` with `-Werror ImplicitStrongCapture`: rc 1 on 6.4 (`weak ownership of capture 'self' differs ... [#ImplicitStrongCapture]`), `nested_ok.swift` rc 0; on 6.3 both rc 0, `warning: unknown warning group: 'ImplicitStrongCapture'`.

**V11. Ownership (`fx:h-ownership`).** `copyable_red.swift` rc 1 (`generic struct 'Array' requires that 'Token' conform to 'Copyable'`, `parameter of noncopyable type 'Token' must specify ownership`), `copyable_green.swift` rc 0, `span_ok.swift` rc 0 (6.3, 6.4). Benchmark `bench.swift`: Array 7.20/7.22 ms, InlineArray 7.48/7.26 ms (6.4, `-O`).

**V12. SwiftLint (`fx:a-tells/swiftlint-lang.yml`, only_rules `shorthand_optional_binding`, `unowned_variable_capture`, `legacy_objc_type`, `redundant_final`, `syntactic_sugar`).**

| Command | plant | twin |
|---|---|---|
| `run.sh swiftlint lint --config a-tells/swiftlint-lang.yml --no-cache --quiet a-tells/<d>/Sources` (static binary) | rc 0, 1 warning (`unowned_variable_capture`); `shorthand_optional_binding` silently skipped | rc 0, none |
| `swiftlint-sk.sh lint --strict --config a-tells/swiftlint-lang.yml --no-cache --quiet a-tells/<d>/Sources` (SourceKit image 0.65.1) | rc 2, 3 `error:` lines (2 `shorthand_optional_binding`, 1 `unowned_variable_capture`) | rc 0, none |

**V13. Runtime and probes.** Module probe (`fx:modules/probe.sh` through `run.sh bash`, 6.4 and 6.3 identical) and API probe (`fx:apis-probe.sh`, outputs `modules/out.txt`, `apis-out.txt`) as in section 3. Observation runtime (`fx:i-observation`): `onChange calls after two mutations: 1`; `Observations values: [2, 3]` on both toolchains.

Reproduction commands (from the fixture root, with `RUN=/home/mherwig/.cache/research-lang/swift-tools/run.sh`): `SWIFT_VERSION=6.3 $RUN swift build --scratch-path "$SWIFT_SCRATCH/era-and-idioms"` inside a fixture package; `./verify-greps.sh` for V1 and V2; `SWIFT_VERSION=6.4 ./forms/run.sh` for V4.

## Exemplar evidence

| Candidate | Satisfies | Violates | Contradicts or nuances |
|---|---|---|---|
| SW-LANG-01/02 (legacy threading, Combine) | tuist, swift-nio, swift-crypto: no Combine or legacy-queue hits | element-x-ios: 1,175 Combine-type hits; swift-build 28 and SwiftPM 15 `OperationQueue`/`Thread` hits ([exemplar-stale.tsv](#)) | the hits are real design choices in tools that predate structured concurrency; the grep is a review prompt on added lines |
| SW-LANG-03/04/05 (Linux portability) | Alamofire guards Combine by platform (`Alamofire@bda9ed57d729:Source/Features/Combine.swift:24-27`); swift-testing `canImport(Combine)` (`swift-testing@c7d68ca20cd7:Sources/Overlays/_Testing_Foundation/Attachments/_AttachableEncodableWrapper.swift:14`); SwiftPM `canImport(FoundationNetworking)` (`swift-package-manager@5546f44a3b52:Sources/Basics/HTTPClient/URLSessionHTTPClient.swift:15`); swift-snapshot-testing `canImport(FoundationNetworking)` (`swift-snapshot-testing@28e5de025e3f:Sources/SnapshotTesting/Snapshotting/URLRequest.swift:4`) | T03 2,945 hits in 35 repos, T04 1,232 in 22, T06 1,060 in 13: mostly Apple-only code, expected in apps | the grep cannot see guards; only the Linux build decides |
| SW-LANG-06 (libc chain) | `canImport(Glibc)/Musl` chains are standard in swiftlang CLIs (SW-CLI-07, SW-IO-04) | | static-SDK failure is measured here (`fx:k-musl`) |
| SW-LANG-11/12 (`any`, `some`) | 15 of 38 manifests enable `ExistentialAny`: swift-log (`swift-log@4038b6a4f74a:Package.swift:59`), swift-testing (`swift-testing@c7d68ca20cd7:Package.swift:461`), swift-protobuf (`swift-protobuf` `Package.swift:465`); Alamofire stores `(any RequestInterceptor)?` where erasure is needed (`Alamofire@bda9ed57d729:Source/Core/Session.swift:75`) | | `any` 6,636 vs `some` 4,111 occurrences; swift-collections has zero `any` and 55.5 `some` per 10k LOC (hot-path generics, [shape](../swift-audit/exemplar-language-shape.md) Axis 3); the apps' `some` count is SwiftUI `some View` |
| SW-LANG-14/15 (floor, guards) | swift-crypto guards `@diagnose` with `#if hasFeature(SourceWarningControl)` (`swift-crypto@1c80d3aff53f:Sources/CryptoExtras/AES/AES_GCM_SIV.swift:16-17`); swift-collections raises tools to 6.4 (`swift-collections@935f696a549a:Package.swift:1`); sourcekit-lsp at tools 6.3 uses `weak let` (`sourcekit-lsp@c6ce93d5f8aa:Sources/SourceKitLSP/IndexProgressManager.swift:34`) | swift-foundation (tools 6.2) writes `@export(implementation)` 637 times (`swift-foundation@aadd9259be07:Sources/FoundationEssentials/Locale/Locale+Components.swift:962`), a 6.3 attribute above its declared tools 6.2; it is built with its own toolchain, so the floor is in its CI, not its manifest | F63 663 hits in 5 repos, F64 211 in 7: 0 uses of `~Sendable` anywhere in the corpus (6.4 is 3 weeks old at the snapshot) |
| SW-LANG-17 (final) | 72.4% of classes `final`; swift-nio 93%; Nuke `private final class Container: @unchecked Sendable` (`Nuke@d5548dd61395:Sources/Nuke/ImageContainer.swift:147`) with a `isKnownUniquelyReferenced` guard at :141 | `open class Spec: @unchecked Sendable` hierarchy (`swift-build@2187330e13e7:Sources/SWBCore/SpecImplementations/Specs.swift:29`, 237 hatches); swift-syntax 23% final (macro-generated) | `extension Deque.Iterator: @unchecked Sendable where Element: Sendable {}` (`swift-collections@935f696a549a:Sources/DequeModule/Deque/Deque+Collection.swift:170`) is the conditional-unchecked form; neither Nuke nor swift-collections carries the guard comment SW-CONC-01 asks for |
| SW-LANG-18 (`[weak self]`) | JavaScriptKit's `Task { [weak self] in` examples (`JavaScriptKit` `Examples/ActorOnWebWorker/Sources/MyApp.swift:174`) | element-x-ios `Task { [weak self] in` at `ElementX/Sources/FlowCoordinators/UserSessionFlowCoordinator.swift:534` and 51 more: T11 171 hits in 13 repos, most on short tasks where the weak capture can drop work | IceCubes' `public actor TimelineCache` (`IceCubesApp@2ad6e6891258:Packages/Timeline/Sources/Timeline/actors/TimelineCache.swift:6`, async APIs at :59) shows the actor alternative to a locked class with stored closures |
| SW-LANG-22 (ownership) | swift-collections 770 T17 hits, a library whose job is ownership; 22 of 40 repos use none | | no exemplar justifies `InlineArray` by measurement in the lines read |
| SW-LANG-09 (underscored attributes) | | T10 4,743 hits in 21 repos (JavaScriptKit 1,691, swift-collections 1,209) | stdlib-adjacent packages legitimately keep `@inline(__always)` for older floors |

## AI-agent angle

What an LLM characteristically gets wrong here, and the smallest mechanical check that catches each. Gallagher (December 2025, one-shot prompts to GPT 5.2, Gemini 3, Claude 4.5 and local models) found "#availability checks for iOS 13, zero knowledge of async/await ... no idea what Swift 6 is", and that a new Xcode default made `import Combine` mandatory for `ObservableObject`, so all but one model's output failed to compile ([Cocoa with Love](https://www.cocoawithlove.com/blog/llms-twelve-months-later.html)). Nil Coalescing argues that "agents regularly miss rules stated in their instructions and skills", so checks must be deterministic and structural ([Introducing SwiftFairy](https://nilcoalescing.com/blog/IntroducingSwiftFairy), 2026-09-25). That is the design basis of every candidate above: a command, not a sentence.

| Characteristic mistake | Smallest check | Result in this dive |
|---|---|---|
| GCD (`DispatchQueue.main.async`) and completion handlers in new code | K-07 E04, E13 | imported; red on plant |
| `ObservableObject`, `@Published`, Combine in non-UI or cross-platform code | K-07 E12, T02, T03; Linux build | E12 2 lines, T02 2, compile `no such module 'Combine'` |
| XCTest-only habits | SW-TEST (K-07 rejected the import grep) | imported |
| `@unchecked Sendable` to silence an error; `Task.detached` | K-07 E01, E03 | imported; section 6 adds the `final` compile gate |
| Old manifest APIs (`swiftLanguageVersions`, `// swift-tools-version:5.x`) | SW-PKG; compiler deprecation warning | `fx:j-manifest-old` rc 0 with warning, so only `-warnings-as-errors` fails it |
| Hallucinated or unreleased APIs and attributes: `mapKeyedValues`, `@specialize`, `withDeadline`, `defaultSwiftSettings`, stdlib `FilePath` | a build on the floor and current toolchains | `mapKeyedValues` rc 1 on 6.4; `@specialize` rc 1; `anyAppleOS` warns on 6.1 |
| Newer syntax in an older-floor package (`weak let`, `~Sendable`, `@diagnose`, `some P?`) | floor-image build; F62-F64b greps | tools-6.0 `weak let` rc 1 on 6.1 |
| Apple-only API in portable code (`URLSession` without `FoundationNetworking`, `@objc`, `os_log`, `autoreleasepool`, `Logger`) | Linux image `swift build`; T04-T06 | each rc 1 with a message that names no fix |
| `import Darwin`/`Darwin.exit` after `exit()` fails to compile in an async command (SW-CLI-03) | Linux build | `Darwin` rc 1 on Linux |
| Bare protocol types (`[Shape]`) | `ExistentialAny` + `-warnings-as-errors` | accepted silently in Swift 6 mode |
| `any P` everywhere as a default | T16 prompt, a benchmark for hot paths | `[any Shape]` 4.4x-9x slower than generic |
| `[weak self]` on every closure (compiles, wrong) | behavioural deinit test; T11 | `WEAK short task: ran=0` |
| `Task { }` fire-and-forget that swallows errors | `NoUseUnstructuredThrowingTask` (6.4 warning), SW-CONC-13 | owned by SW-CONC |
| `ObservableObject` replaced by `@Observable` but with a re-armed `withObservationTracking` | reading; use `Observations` | onChange fired once after two mutations |
| Mixed-literal arithmetic in one expression | `-warn-long-expression-type-checking=200` + `-warnings-as-errors` | rc 1 red, rc 0 split twin |
| `~Copyable` or `InlineArray` "for performance" | T17; benchmark | no speedup measured |
| `final` forgotten before `Sendable` | compiler | `non-final class ... cannot conform to the 'Sendable' protocol` |
| iOS 13 availability checks, `NavigationView`, `.foregroundColor` | T14, T15 | grep red on plant; semantics unverified: read only |

## Contested / evolving

- **When `any` becomes mandatory.** SE-0335 stages `any` so that it is required "under a future language mode"; the userdocs repeat that. Swift 6 mode did not make it required (measured rc 0 on 6.3 and 6.4). Trend (2026-10-10): 15 of 38 manifests opt in via the upcoming feature, Embedded Swift gained existential support in 6.4 ([6.4 post](https://www.swift.org/blog/swift-6.4-released/)), and the practice here (enable the feature, gate on warnings) is stable until a language mode changes it.
- **`[weak self]` in `Task`.** Apple's documentation says tasks "rarely need to capture weak references"; Donny Wals shows long-lived async-sequence tasks leaking; a Swift Forums thread questions whether a strong capture in a finite task is a cycle at all. The measured split (stored loop = cycle; finite = fine) is consistent with all three. The 6.4 `ImplicitStrongCapture` warning and Sundell's 2026-08-30 article show the compiler moving toward flagging the nested-capture mistake rather than the `Task` case.
- **Type-checker timeouts.** Pestov's roadmap lists shipped 6.2 work and planned work (SAT-style solving, a decimal-point rule for float literals); none removes the cliff on 6.4. Re-measure each toolchain bump: the 6.4 timing (4.3-4.7 s) was faster than 6.3 (5-11 s) for the same expression, but both fail.
- **Guard style.** `#if compiler(>=6.4)` (version) vs `#if hasFeature(X)` (capability). swift-crypto uses `hasFeature`; the measured `hasFeature(ImmutableWeakCaptures)` false on all three shows it is unreliable for upcoming-feature names. Prefer `compiler(>=)` unless an experimental-feature name is known to flip.
- **Whether `final` should be the default for public classes.** The corpus is 72.4% final, but open hierarchies (swift-build `Spec`, swift-nio handlers) are the point of those libraries. The candidate sides with `final` unless a subclassing contract is documented; SwiftLint has no rule that enforces it.
- **LLM competence over time.** Gallagher (2025-12) saw stale APIs in one-shot free-tier prompts; raska.io (2026-09) and Nil Coalescing (2026-09) say agentic harnesses do better but still skip stated rules. Direction: toward deterministic checks, away from prose rules.
- **Release-note spelling drift.** The 6.3 post says `@specialize`; SE-0460 and the compiler say `@specialized`. The wave-1 shift table inherits both the spelling and the `mapKeyedValues` availability. Direction: treat blogs as pointers and the compiler as the source of truth.
- **Unverified: read only.** Everything about SwiftUI, Xcode defaults (the `MEMBER_IMPORT_VISIBILITY` default Gallagher hit), `#available` semantics, Windows and Android legs, and library-evolution ABI effects of `some`/`any`.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://www.swift.org/documentation/api-design-guidelines/ | Swift API Design Guidelines (primary) | evergreen, samples pre-5.6 | naming rules for protocols; shows what it does not cover |
| https://www.swift.org/blog/swift-6.3-released/ | Swift 6.3 release post (primary) | 2026-03-24 | `@c`, module selectors, `@specialize` spelling, Android SDK |
| https://www.swift.org/blog/swift-6.4-released/ | Swift 6.4 release post (primary) | 2026-09-15 | `some P?`, `@diagnose`, defer-await, cancellation shield, Embedded existentials |
| https://raw.githubusercontent.com/swiftlang/swift/main/CHANGELOG.md | swiftlang/swift CHANGELOG (primary) | 6.0-6.4 and "next" | per-release attribution, SE-0518 `~Sendable`, SE-0522, "Swift (next)" `withDeadline` |
| https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0481-weak-let.md | SE-0481 `weak let` (primary) | Implemented 6.3 | semantics, `ImmutableWeakCaptures`, source break for weak captures |
| https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0518-tilde-sendable.md | SE-0518 `~Sendable` (primary) | Implemented 6.4 | why unavailable-conformance is not equivalent |
| https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0522-source-warning-control.md | SE-0522 `@diagnose` (primary) | Implemented 6.4 | lexical scope, `SourceWarningControl` |
| https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0451-escaped-identifiers.md | SE-0451 raw identifiers (primary) | Implemented 6.2 | test-name motivation |
| https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0453-vector.md | SE-0453 `InlineArray` (primary) | Implemented 6.2 | type and literal semantics |
| https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0483-inline-array-sugar.md | SE-0483 `InlineArray` sugar (primary) | Implemented 6.2 | `[3 of Int]` |
| https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0335-existential-any.md | SE-0335 `any` (primary) | Implemented 5.6 | staging to a future language mode |
| https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0341-opaque-parameters.md | SE-0341 `some` parameters (primary) | Implemented 5.7 | `some` as anonymous generic |
| https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0470-isolated-conformances.md | SE-0470 isolated conformances (primary) | Implemented 6.2 | `InferIsolatedConformances` |
| https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0460-specialized.md | SE-0460 explicit specialization (primary) | 6.3 | the attribute is `@specialized` |
| https://raw.githubusercontent.com/swiftlang/swift/main/userdocs/diagnostics/existential-any.md | compiler diagnostic-group doc (primary) | 6.x | `ExistentialAny` behaviour and migration |
| https://raw.githubusercontent.com/swiftlang/swift/main/userdocs/diagnostics/implicit-strong-capture.md | compiler diagnostic-group doc (primary) | 6.4 | `ImplicitStrongCapture` |
| https://raw.githubusercontent.com/swiftlang/swift/main/userdocs/diagnostics/implementation-only-deprecated.md | compiler diagnostic-group doc (primary) | 6.x | why `@_implementationOnly` is unsafe |
| https://raw.githubusercontent.com/swiftlang/swift-book/main/TSPL.docc/LanguageGuide/OpaqueTypes.md | The Swift Programming Language: opaque and boxed types (primary) | current | box cost, type identity |
| https://raw.githubusercontent.com/swiftlang/swift-book/main/TSPL.docc/LanguageGuide/AutomaticReferenceCounting.md | The Swift Programming Language: ARC (primary) | current | closure capture cycles |
| https://developer.apple.com/documentation/swift/task.md | Apple `Task` documentation (primary vendor docs) | current | closure lifetime: "tasks rarely need to capture weak references" |
| https://forums.swift.org/t/roadmap-for-improving-the-type-checker/82952 | Slava Pestov, type-checker roadmap (core team) | 2025-10-30 | the one-million-attempt and 512 MB limits, literal defaulting |
| https://www.cocoawithlove.com/blog/llms-twelve-months-later.html | Matt Gallagher, LLMs for Swift | 2025-12-29 | measured agent failure modes (stale availability, Combine import) |
| https://nilcoalescing.com/blog/IntroducingSwiftFairy | Nil Coalescing, SwiftFairy | 2026-09-25 | why deterministic checks beat prose rules |
| https://tools.nilcoalescing.com/swiftfairy/modern-swift/ | SwiftFairy "Modern Swift" scroll | 2026-09 | `count(where:)` and labelled-break examples |
| https://www.swiftbysundell.com/articles/warning-for-nested-weak-self-closure-captures/ | John Sundell, nested weak capture warning | 2026-08-30 | worked `Timer` example for the 6.4 warning |
| https://www.donnywals.com/how-to-use-weak-self-in-swift-concurrency-tasks/ | Donny Wals, `[weak self]` in Tasks | 2025 | `for await` task leaks, re-pinning by `guard let self` |
