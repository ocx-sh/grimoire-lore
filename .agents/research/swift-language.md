---
title: "Swift language idioms (SW-LANG): consolidated ruleset"
topic: "Swift 6.4-era language idioms: Linux portability, the toolchain floor and floor-raising syntax, hallucinated APIs, existentials and generics, final and open, [weak self], type-checker timeouts, ownership types, stale-idiom tells"
model: sonnet
id_family: SW-LANG
consolidates:
  - swift-language/era-and-idioms.md
date: 2026-10-10
---

# Swift language idioms (SW-LANG): consolidated ruleset

Toolchains: Swift 6.4.0 (released 2026-09-14), 6.3.3, 6.2.0 / 6.2.4, 6.1.3 on Linux x86_64 only. Apple, Windows, Android and Wasm behaviour is "unverified: read only" (owner Q7). Citation tags: `[era §n]` is a finding in the one sub-artifact, `E-Vn` is its Verification-run row (V1..V13), `R1..R13` are re-runs and new runs by this consolidation (appendix at the end, fixtures under `/home/mherwig/.cache/research-lang/swift-tools/fixtures/language-consolidation/`), `fx:<dir>` is a fixture of the dive under `.../fixtures/era-and-idioms/`. `[shape]`, `[conc]`, `[gates]`, `[pkg]`, `[cfg]` are the audits under `swift-audit/`, `[map]` is `swift-topic-map.md`. Exemplar cites are repo@sha12:path:line. Sibling rule IDs (SW-CONC, SW-GATE, SW-IO, SW-CLI, SW-PKG, SW-APPLE, SW-ERR, SW-TEST) are cited, never restated.

There is one sub-artifact, so the conflicts below are between it and the topic map, the audits and the sibling consolidations. Map rows covered: M-A-01, M-A-02, M-A-06, M-A-07, M-A-09, M-A-11, M-A-12, M-A-14. Map rows owned by a sibling, with no SW-LANG rule: M-A-03 (String views) is SW-IO-29, M-A-04 (iteration order) is SW-IO-12 and SW-IO-17, M-A-05 (clocks) is SW-IO-16. Not researched, P3: M-A-08 (`@specialized`, `@inlinable`), M-A-10, M-A-13, M-A-15.

## Verdict

1. **The build is the linter for this family.** Of 13 rules, 7 are MUST and every one of them is caught by a build on a chosen image (Linux, the static Linux SDK, the floor patch, `-warnings-as-errors`) or by a runtime check. Greps are review prompts on added lines, never the gate: grep cannot see `#if`, and the corpus noise runs from 53 to 4,743 hits per tell on mature trees (SW-GATE-10's discipline, [era §2]).
2. **Portable code is built on Linux, at the floor and at the current release** (SW-LANG-01, -03). Library, SDK, CLI and server code guards each Apple-only module with `canImport`; Apple apps are exempt by declaration. The fleet SDK, CLIs and servers always claim Linux (frame Q6, Linux via Docker as the gate host).
3. **libc is imported through one chain, never unconditionally** (SW-LANG-02): `canImport(Glibc)`, `Musl`, `Darwin`, each arm `@preconcurrency import` in the one file that names `stdout`. SW-CLI-07 read literally fails the static Linux SDK (R1); the chain is the spelling both rules need.
4. **The floor is a toolchain patch, not a tools-version.** Syntax can arrive in a patch release: `weak let` compiles from 6.2.3, although SE-0481 says Implemented 6.3 (R6). A floating `swift:6.2` leg passes where 6.2.0 consumers fail, so the floor leg pins the `.0` (SW-LANG-03). Newer syntax is guarded by `#if compiler(>=N)` (SW-LANG-04), or the manifest names the patch: `// swift-tools-version: 6.2.3` makes 6.2.0 and 6.2.2 stop with `is using Swift tools version 6.2.3 but the installed version is 6.2.0` instead of an opaque syntax error (R11).
5. **No release note, blog or table is evidence for an API** (SW-LANG-05). `mapKeyedValues`, `@specialize`, `withDeadline`, stdlib `FilePath` and `defaultSwiftSettings:` were all published as available and none compiles on 6.4.
6. **Existentials are written `any P`, and chosen last.** The gate is the `ExistentialAny` feature plus `-warnings-as-errors`; `-Werror ExistentialAny` alone is a silent no-op (SW-LANG-06). `some` and generics are the default; `any` is for runtime heterogeneity and measured 1.9x to 9x slower in a hot loop (SW-LANG-10). A released `some`/`any` change is an API break and `diagnose-api-breaking-changes` catches it (R4).
7. **`[weak self]` is a lifetime design, not a reflex** (SW-LANG-08). A stored unbounded task has exactly two sound designs, `[weak self]` plus a cancelling `deinit`, or a strong capture plus an owner `close()` that cancels (R2: deinit_count 1 and 0). A short unstored task never gets `[weak self]`: the work silently never runs (`ran=0`).
8. **`final` is the default but not a MUST.** The dive's MUST rests on a grep with 1,623 hits in 27 repos; the compiler already rejects the one enforceable half (non-final `Sendable` class), so the rule is SHOULD (SW-LANG-11).
9. **Ownership and span features need a stated reason** (SW-LANG-12). `InlineArray<4, Int>` was not faster than `[Int]` under `-O`, and a `~Copyable` model type fails at the first array.
10. **The type-checker gate costs nothing and false-alarmed nowhere**: 0 hits at 100 ms across six packages and their dependency graphs (R3), red on the planted expression. It stays SHOULD because the limit is wall-clock (SW-LANG-07).
11. **Code kinds.** SW-LANG-01, -02, -09 bind library, SDK, CLI and server; apps follow SW-APPLE-06 and -13 for Observation and Combine. Test code is exempt from the tell greps (the operands exclude `Tests`). SW-LANG-03 to -08 bind every kind that ships Swift.

## The ruleset

### Conflicts resolved

| # | Conflict | Decision | Reason |
|---|---|---|---|
| 1 | SW-CLI-07's heading says name `stdout`/`stderr` in one file "whose first import is `@preconcurrency import Glibc`" (its Rule bullet adds "`Musl` under `canImport(Musl)`" but leaves the Glibc import unguarded); the dive's SW-LANG-06 says `import Glibc` is never unconditional; swift-io's durable-write recipe is a `canImport` chain without `@preconcurrency` and marks the Musl arm "untested" | One spelling: the `canImport` chain with `@preconcurrency` on each arm, as the first import of the Stdio file and before any `import Foundation` (SW-CLI-07 measured the reverse order failing, t4; R13 re-measured it with the chain). SW-CLI-07 stays correct when read as the chain | R1: the literal form builds on glibc (rc 0) and fails on `--swift-sdk x86_64-swift-linux-musl` with `Stdio.swift:1:24: error: no such module 'Glibc'` (rc 1); the chain with `@preconcurrency` builds on both (rc 0, rc 0). Map conflict 16 makes the static SDK the release path for CLIs |
| 2 | Dive SW-LANG-18: `[weak self]` is required on a stored loop task. SW-CONC-13 and -20: the owner stores the task and exposes an idempotent awaited `close()` | Both designs are sound; the unsound one is a strong capture with no cancel path. The rule names both (SW-LANG-08) | R2, same program twice: strong capture plus `close()` that cancels, `deinit_count=1` exit 0; strong capture and the owner forgets `close()`, `deinit_count=0` exit 1. The dive measured the weak design (deinit 1) and the short-task drop (`ran=0`) [era §7] |
| 3 | Dive SW-LANG-02 bans `Thread.detachNewThread` and `Thread(block`; SW-CONC-23 sanctions "a dedicated `Thread`" behind one cancellable continuation for blocking calls | `OperationQueue`, `NSThread`, `performSelector`, Combine types: no sanctioned use in new code. `Thread` is allowed only as the SW-CONC-23 bridge, with the reason comment | SW-CONC-23 is measured (T-V13, R7 in swift-concurrency.md): private queues and threads scaled to 256 where `DispatchQueue.global()` hung at 56 |
| 4 | Dive SW-LANG-04 (every file naming `URLSession` imports `FoundationNetworking`) and SW-IO-02 | Dropped here; SW-IO-02 owns it. T06 stays in the check scripts as a cross-check | Identical rule, identical failure (`type 'URLSession' (aka 'AnyObject') has no member 'shared'`); one owner |
| 5 | Dive SW-LANG-17 is MUST ("a class is `final` unless a documented extension point") | SHOULD (SW-LANG-11). The enforceable half, a non-final `Sendable` class, is a compiler error and needs no rule | The only check is T12, a grep that prints every class (1,623 hits in 27 repos, [era §2]); no SwiftLint or swift-format rule flags a missing `final`. A MUST needs a verification that discriminates |
| 6 | Dive SW-LANG-01 is one MUST over K-07 plus 17 greps; the dive's own SW-LANG-08 calls T07 to T09 SHOULD | K-07 stays SW-GATE-10. The tells split by what they catch: Linux and legacy tells into SW-LANG-01 and -09, stale spellings into SW-LANG-13 (CONSIDER), prompts into the rule they serve (T11 in -08, T12 in -11, T16 in -10, T17 in -12) | Noise by tell: T07 4,392 hits in 38 repos, T08 236, T13 406 are style, not defects; the corpus holds the idioms an agent is told to avoid [shape] H7 |
| 7 | Dive SW-LANG-11: "a new package enables `ExistentialAny` and CI builds with `-Xswiftc -warnings-as-errors`" vs SW-PKG-07 (manifest), SW-GATE-13 (flag spelling), SW-GATE-14 (manifest promotion limits) | SW-LANG-06 owns only the source rule and the trap; the manifest line is SW-PKG-07 and the flag is SW-GATE-13 | No duplicated rules. The trap is the contribution: feature alone is a warning, `-Werror ExistentialAny` without the feature is silent, and a manifest `.treatWarning("ExistentialAny", as: .error)` in a published library conflicts with SW-GATE-14 [era §4] |
| 8 | Dive SW-LANG-21 is MUST for the long-expression build gate | SHOULD | The limit is wall-clock. R3 measured 0 false alarms at 100 ms on this host in six packages, but a slower CI runner narrows the margin and the gate cannot discriminate real code from a slow machine |
| 9 | SE-0481 says `weak let` is "Implemented (Swift 6.3)"; SW-CONC-04 and SW-PKG-08 say 6.3 | The measured introduction is 6.2.3; keep 6.3 as the declared floor for a library on tools 6.2 | R6: `weak let` rc 1 on 6.1.3, 6.2.0 and 6.2.2, rc 0 on 6.2.3, 6.2.4, 6.3, 6.4. A consumer on 6.2.0 through 6.2.2 still fails, so SW-CONC-04 and SW-PKG-08 are right in effect and wrong in mechanism; the patch-level fact is what SW-LANG-03 acts on |
| 10 | Dive SW-LANG-13 ("treat a released `some P` to `any P` change as source-breaking") is "RAN: no" | Run, and folded into SW-LANG-10 | R4: `diagnose-api-breaking-changes 1.0.0` exits 1 for `some Shape` to `any Shape` in a return and in a parameter, and for `[Square]` to `[any Shape]`; exits 0 on the additive twin |
| 11 | SW-CONC-12 adds `InferIsolatedConformances` "only for modules with global-actor-isolated public types or MainActor-default consumers"; SW-PKG-08 enables it in every new package | Evidence says both are safe; the manifest owner (SW-PKG-08) decides, so no SW-LANG rule | [era §10], E-V8: in a module with no global-actor types the SIL and IR are byte-identical with and without the feature on 6.3.3 and 6.4 (`cmp` after dropping the first two IR lines); with a `@MainActor` conformer the diagnostics change. Raised again in Open questions |
| 12 | The dive points at "SW-CLI-07, SW-IO-04" for libc ordering | SW-IO-04 is the `FoundationEssentials` rule; libc ordering is SW-CLI-07 and the recipe in swift-io.md "Reference recipes" | Stale cross-reference from before the siblings were numbered; SW-LANG-02 carries the compile proof |
| 13 | Wave-1 shift table and the 6.3 release post vs the compiler: `Dictionary.mapKeyedValues` "6.4", `@specialize(where:)`, `anyAppleOS` | The compiler wins (SW-LANG-05) | [era §12]: `mapKeyedValues` has no member on 6.1, 6.2.0, 6.2.4, 6.3, 6.4 (R6 adds 6.2); `@specialize(...)` rc 1 on every toolchain (the attribute is `@specialized`); `anyAppleOS` is a silent warning on 6.1 and an error without a flag on 6.3 |
| 14 | Apple's `Task` docs: "tasks rarely need to capture weak references". Wals: iterating tasks "are fairly likely to have memory leaks" | Split by lifetime, not by authority | R2 and [era §7]: the finite unstored task is fine strong; the stored loop is a cycle |
| 15 | Dive SW-LANG-26 (stale `#available(iOS 1x`, deprecated SwiftUI spellings, greps T14 and T15) | Dropped; SW-APPLE-11 and SW-APPLE-10 own them | Same rule, Apple-only, unverified: read only |
| 16 | Dive counts: "41 Apple modules" in the summary vs 40 in its table; F62 band "6 lines" vs 7 on re-run; `@export(implementation)` in swift-foundation "637" vs 621 | 40, 7 and 621 | R7 and the module list in [era §3]; the plant gained a `Span` line after the dive's count; `grep -rF '@export(implementation)' .` over the pinned clone prints 621 lines in 25 files, the same under `Sources` (R9, re-counted in R12) |
| 17 | [conc] Axis 4: element-x-ios has 853 Combine-type references (its token set); the dive's T02 prints 1,175 for four type names | Cite both, with their scope | They count different tokens over different file sets; neither is a defect count (H7: presence in the corpus is not a failure signal) and the rule does not depend on the figure |
| 18 | SW-GATE-25 and SW-PKG-12 name the floor as "the tools-version floor" and "exactly `6.2`"; SW-LANG-03 names a patch (`swift:6.2.0`) | Compatible: SW-LANG-03 only fixes the spelling of the floor image. A manifest that needs a form from a later patch may declare that patch | R6 (`weak let` 6.2.3) and R11: `// swift-tools-version: 6.2.3` builds on 6.2.3 and 6.2.4 and is rejected by 6.2.0 and 6.2.2 with `package is using Swift tools version 6.2.3 but the installed version is 6.2.0`; SW-PKG-12 allows raising "for a feature that needs it", recorded in the commit message |

### SW-LANG

Every entry: rule, why, check, red/green status, binding. "Red" cites the dive's Verification runs (E-V) and this consolidation's runs (R). A grep prints the violation; empty output is a pass; judge by printed lines, not exit status (`xargs` returns 123 when its grep prints).

#### A. Caught by a build on a chosen image

**SW-LANG-01 (MUST for library, SDK, CLI and server code that builds on Linux; any Swift).** Build the target on the Linux image at the floor and at the current release, guard every Apple-only module with `#if canImport(X)` or replace it, and do not guard what Linux compiles.

- Why: Apple-only modules and APIs fail the Linux build with errors that name no fix (`no such module 'Combine'`, `type 'URLSession' (aka 'AnyObject') has no member 'shared'`).
- Evidence: 40 probed Apple modules do not exist on the stock 6.4.0 and 6.3.3 Linux toolchains (`error: no such module 'Combine'`); `import Foundation` alone gives no `URLSession` or `URLRequest` (`type 'URLSession' (aka 'AnyObject') has no member 'shared'`, a message that names no import; SW-IO-02 owns the fix); `@objc` and `#selector` fail with `Objective-C interoperability is disabled`; `autoreleasepool`, `Logger(subsystem:category:)`, `os_unfair_lock`, `OSAllocatedUnfairLock` and `mach_absolute_time` fail with `cannot find ... in scope` [era §3, E-V13].
- Module facts, identical on 6.4 and 6.3 [era §3]:
  - Exist: `Swift`, `_Concurrency`, `_StringProcessing`, `Foundation`, `FoundationEssentials`, `FoundationInternationalization`, `FoundationNetworking`, `FoundationXML`, `Dispatch`, `Glibc`, `Observation`, `Synchronization`, `Testing`, `XCTest`, `RegexBuilder`, `Distributed`, `Cxx`, `CoreFoundation`.
  - Absent: `Combine`, `SwiftUI`, `UIKit`, `AppKit`, `Cocoa`, `CoreData`, `CoreGraphics`, `CoreImage`, `CoreText`, `CoreLocation`, `ObjectiveC`, `os`, `OSLog`, `CryptoKit`, `Security`, `Network`, `NetworkExtension`, `AVFoundation`, `Accelerate`, `simd`, `SwiftData`, `CloudKit`, `WebKit`, `StoreKit`, `MapKit`, `UniformTypeIdentifiers`, `Charts`, `WidgetKit`, `AppIntents`, `TipKit`, `Metal`, `SpriteKit`, `UserNotifications`, `Contacts`, `EventKit`, `LocalAuthentication`, `Vision`, `CoreML`, `NaturalLanguage`, `Speech`, plus the other platforms' libc (`Darwin`, `WinSDK`, `ucrt`, `Android`, `Bionic`, `WASILibc`). `System` and `Crypto` are package products (`SystemPackage`, swift-crypto), not toolchain modules.
  - A `#if canImport(System) ... #else import SystemPackage` guard still needs the manifest dependency (`no such module 'SystemPackage'` without it).
  - Compiles on Linux, so is not guarded (compiling is not endorsing: SW-IO-05 and SW-GATE-10 E14 still apply): `NSLock`, `Process()`, `Timer.scheduledTimer`, `NotificationCenter`, `UserDefaults`, `String(format:)`, `NSRegularExpression`, `NSKeyedArchiver`, `Bundle.main`, `CGFloat`, `DispatchQueue.main.async`, `pthread_create`, `arc4random_uniform` (glibc 2.36 and later).
- Guard the capability, not the OS list: `#if canImport(Combine)` over `#if !(os(Linux) || ...)`; both compile, the first survives a new platform.
- Check: the gate is `docker run --rm -v "$PWD":/src -w /src swift:6.4 swift build` exiting 0, repeated on the floor image (SW-LANG-03). T03, T04, T05 list the lines to inspect; a hit inside a `canImport` guard is fine, because a grep cannot see `#if`.
- Red: yes. E-V3: `a-tells/plant` `swift build` rc 1 with `Sources/App/Platform.swift:1:8: error: no such module 'Combine'` on 6.4; `a-tells/twin` rc 0 on 6.4 and 6.1; R8 reproduced both. T03, T04, T05 print 4, 4 and 3 lines on the plant and nothing on the twin (E-V2, R7).
- Binds: library, SDK, CLI, server. Apple apps are Apple-only by declaration and exempt (SW-APPLE). Windows, Android, Wasm: unverified: read only.

**SW-LANG-02 (MUST; any Swift).** Import a libc module only through `#if canImport(Glibc)` / `#elseif canImport(Musl)` / `#elseif canImport(Darwin)` (add `Bionic`, `WASILibc`, `WinSDK` arms only for a platform the package claims); never an unconditional `import Glibc` or `import Darwin`; in the one file that names `stdout` or `stderr` every arm is `@preconcurrency import` and the chain precedes any `import Foundation` (SW-CLI-07, SW-CONC-10).

- Why: an unconditional `import Glibc` builds on the glibc image and fails on the static Linux SDK, which is the CLI release path.
- Evidence: an unconditional `import Glibc` builds on the glibc image and fails on the static Linux SDK; a SW-CLI-07 read as "first import is `@preconcurrency import Glibc`" fails there too, and the agent fix for `exit()` in an async command, `Darwin.exit`, does not exist on Linux (`Darwin` rc 1, [era §3], SW-CLI-03). The chain with `@preconcurrency` on each arm closes all three (R1).
- Check: `swift build --swift-sdk x86_64-swift-linux-musl` exits 0 (the static Linux SDK must be installed; SW-REL owns the install). Aid, output = a file with an unguarded libc import:

```sh
grep -rlE --include='*.swift' '^[[:space:]]*(@preconcurrency +)?import +(Glibc|Musl|Darwin)\b' Sources | xargs -r grep -L 'canImport'
```

- Red: yes. E-V3: `k-musl` (`import Glibc`) rc 1 `error: no such module 'Glibc'`, `k-musl-twin` (chain) rc 0, both rc 0 on glibc. R1: `libc-cli07` musl rc 1 / glibc rc 0; `libc-combined` (chain plus `@preconcurrency`, stdout use under Swift 6 mode) rc 0 / rc 0; the aid prints `libc-cli07/Sources/Lib/Stdio.swift` (xargs rc 123) and nothing for `libc-combined` (rc 0). R13, the order clause: the chain before `import Foundation` is rc 0 on glibc and on the static SDK; `import Foundation` before the chain is rc 1 on glibc (`Stdio.swift:11:14: error: reference to var 'stdout' is not concurrency-safe because it involves shared mutable state`) and rc 0 on the static SDK, so the order rule is a glibc fact.
- Binds: every code kind that imports a libc module. MUST because CLIs release on the static SDK (map conflict 16). Floor: any Swift; the static SDK image is 6.4.0.

**SW-LANG-03 (MUST; any Swift).** Name the floor as the oldest toolchain patch that must build the tree, build and test that exact image in CI (`swift:6.2.0`, not the floating `swift:6.2`), and, in the commit that adds a form newer than the floor, either guard the syntax (SW-LANG-04) or raise `swift-tools-version` to the toolchain that introduced it, to the patch when the form arrived in one (`// swift-tools-version: 6.2.3`).

- Why: a tools-version does not gate syntax and syntax arrives in patch releases, so a floating floor leg passes where consumers on the `.0` fail.
- Evidence: a tools-version does not gate syntax. A `// swift-tools-version: 6.0` package using `weak let` builds on 6.3 and 6.4 and fails on 6.1 with `'weak' must be a mutable variable, because it may change at runtime`; and syntax arrives in patch releases: the same file is rc 1 on 6.2.0 and 6.2.2 and rc 0 on 6.2.3, so a leg on the floating tag (now 6.2.4) passes while consumers on 6.2.0 fail (R6). swift-foundation declares tools 6.2 and writes the 6.3 attribute `@export(implementation)` 621 times with no `compiler(>=6.3)` guard; it is built by its own toolchain, which is why its CI hides the gap. That a 6.2 toolchain cannot compile it is inferred from the measured `unknown attribute 'export'` on 6.2.0 and 6.2.4, not from a build of the repository ([era §5], R9).
- Check: `docker run --rm -v "$PWD":/src -w /src swift:<floor-patch> swift build` and `swift test` exit 0; with the research wrapper, `SWIFT_VERSION=6.2.0 /home/mherwig/.cache/research-lang/swift-tools/run.sh swift build --scratch-path "$SWIFT_SCRATCH/<slug>"`. The command proves the tree compiles on the floor, not that the floor is minimal; to find the real floor, bisect images downward. Read the declared floor first with the SW-PKG-06 command. The matrix itself is SW-GATE-25's; SW-PKG-12 sets the library floor at tools 6.2. A patch in the manifest is accepted by that patch and by later ones and rejected by earlier ones with a clear message, so it is the sharper spelling of "raise the floor" when the dependency is a single form (R11); the guard is the spelling when the library must keep serving `6.2.0`.
- Red: yes. R11: a tools-6.2 package with `weak let` is rc 1 on 6.2.0 and 6.2.2 (`'weak' must be a mutable variable`) and rc 0 on 6.2.3 and 6.2.4; the same package at `// swift-tools-version: 6.2.3` is rc 1 on 6.2.0 and 6.2.2 (`package 'toolspatch' is using Swift tools version 6.2.3 but the installed version is 6.2.0`) and rc 0 on 6.2.3 and 6.2.4. `b-weaklet-tools60` rc 1 on 6.1, rc 0 on 6.3 and 6.4 (E-V5, re-run in R8); on 6.2.0 rc 1 and on 6.2.4 rc 0 (R6); the twin `b-weaklet-twin` (`Mutex<Box>` holding a `weak var`) is rc 0 on 6.1, 6.2.4, 6.3, 6.4. `a-tells/plant` fails on 6.1 at the first 6.3+ token (`consecutive statements on a line must be separated by ';'`), the twin builds on 6.1 and 6.4 (E-V3, R8).
- Binds: library and SDK (floor leg `swift:6.2.0` at tools 6.2); CLI and server on the current release need only the current image. Only the 6.1, 6.2.x, 6.3 and 6.4 images were available.

**SW-LANG-04 (MUST; floor-dependent).** Guard every form newer than the floor with `#if compiler(>=N)`; `@diagnose` may use `#if hasFeature(SourceWarningControl)`; never detect `weak let` with `hasFeature(ImmutableWeakCaptures)`.

- Why: each form below is a compile error on an older toolchain, and `hasFeature` is not a reliable probe for it.
- Evidence: each form below is a compile error on an older toolchain, and `hasFeature(ImmutableWeakCaptures)` reports whether the upcoming flag was passed (true on 6.2.4, 6.3, 6.4 with `-enable-upcoming-feature ImmutableWeakCaptures`, false without it and false on 6.2.0 even with it), not whether the syntax exists (R6b). The pins, compiled on 6.1, 6.2.0, 6.2.4, 6.3, 6.4:

| First toolchain that compiles it | Forms | Guard |
|---|---|---|
| 6.0 | `Mutex` (`import Synchronization`), `sending`, `throws(E)`, `count(where:)`, `internal import` | none above a 6.0 floor |
| 6.2.0 | raw identifiers ``func `a b`()``, `InlineArray` and `[3 of Int]`, `nonisolated(nonsending)`, `@concurrent`, `Task.immediate`, `isolated deinit`, `unsafe` expressions, `Span` and `Array.span`, `Observations { }` | `#if compiler(>=6.2)` |
| 6.2.3 | `weak let` (rc 1 on 6.2.0 to 6.2.2; SE-0481 says 6.3) | `#if compiler(>=6.3)` for a library on tools 6.2 |
| 6.3.0 | `@c`, `@export(implementation)`, `@inline(always)`, `@specialized(where:)`, the `Swift::Int` module selector; `@available(anyAppleOS ...)` still needs `-enable-experimental-feature AnyAppleOSAvailability` | `#if compiler(>=6.3)` |
| 6.4.0 | `~Sendable`, `@diagnose(...)`, `some P?`, `defer { await ... }`, `withTaskCancellationShield`, `UniqueBox`, `Iterable`, `anyAppleOS` | `#if compiler(>=6.4)`; `#if hasFeature(SourceWarningControl)` for `@diagnose` |
| not in 6.4 | `Dictionary.mapKeyedValues`, `withDeadline` (Swift next), `@specialize(...)`, stdlib `FilePath`, `CommandLine.executablePath`, `defaultSwiftSettings:` | do not write (SW-LANG-05) |

  - `~Sendable` below a 6.4 floor: `~Sendable` fails on 6.3 with `'~Sendable' requires -enable-experimental-feature TildeSendable`; the spelling of the same intent is `@available(*, unavailable) extension X: Sendable {}`, which subclasses inherit and `~Sendable` does not. Whether a public type states its Sendable intent is SW-CONC-04's.
  - Raw identifiers in test names need a 6.2 floor; below it use `@Test("display name")`. `anyAppleOS` below a 6.4 floor does nothing on 6.1 (silent `unrecognized platform name` warning) and is an error on 6.3; do not hand-write it.
  - `hasFeature(SourceWarningControl)` and `hasFeature(TildeSendable)` are false on 6.1 and 6.3 and true on 6.4; `compiler(>=N)` always works. swift-crypto guards `@diagnose` with `hasFeature` (`swift-crypto@1c80d3aff53f:Sources/CryptoExtras/AES/AES_GCM_SIV.swift:16-17`); swift-collections raised its tools version to 6.4 instead (`swift-collections@935f696a549a:Package.swift:1`).
- Check: the floor build of SW-LANG-03, plus the band greps F62, F62b, F63, F64, F64b (Check scripts): every hit lies inside a guard or the floor was raised.
- Red: yes. The bands print 7, 1, 4, 4, 1 lines on the plant and 0 on the twin (R7; the dive recorded 6 for F62); the guarded file typechecks rc 0 on 6.1, 6.3 and 6.4; unguarded `b-red` is rc 1 on 6.3 and rc 0 on 6.4 (E-V5, R8). The 6.2 band now runs directly on 6.2.0 and 6.2.4 and matches the dive's 6.1-red / 6.3-green bracket for every form except `weak let` (R6).
- Binds: every kind. Floor: depends on the form.

**SW-LANG-05 (MUST; any Swift).** Compile any API, attribute, flag or syntax that a release note, blog post, forum thread, WWDC session or earlier research table names, on the floor and the current image, before writing it into code, a rule or a skill. `cannot find ... in scope`, `has no member` and `unknown attribute` are the signals.

- Why: release notes, blogs and earlier research tables name APIs and attributes that do not compile.
- Evidence: `Dictionary.mapKeyedValues` is "6.4" in the wave-1 shift table and has no member on 6.1, 6.2.0, 6.2.4, 6.3 and 6.4; `@specialize(where:)` is the 6.3 post's spelling and does not parse anywhere (the attribute is `@specialized`); `withDeadline` sits above `## Swift 6.4` in the CHANGELOG ("Swift next"); stdlib `FilePath`, `CommandLine.executablePath` and `defaultSwiftSettings:` are WWDC26 claims the map's conflict 15 overturned; `@warn` is `@diagnose`. Owners: `FilePath` SW-IO-01, `defaultSwiftSettings` SW-PKG-01, the `@warn` spelling SW-GATE-13 [era §12].
- Check: `swift build` (or `swiftc -typecheck -swift-version 6 file.swift`) exits 0 on both images, with the file compiled and not read.
- Red: yes. `fx:forms/map_keyed.swift` rc 1 on 6.1, 6.3, 6.4 (E-V4) and on 6.2.0 and 6.2.4 (R6); `specialized.swift` (`@specialized`) rc 0 only from 6.3; `underscore_specialize.swift` compiles everywhere.
- Binds: code, rules and skills of every kind. Highest-yield rule in this family against hallucination.

#### B. Caught by compiler flags in the gate

**SW-LANG-06 (MUST for new packages and for any package that enables the feature; Swift 5.6 spelling, tools 6.2 manifest).** Write every protocol used as a type as `any P`; the gate is the `ExistentialAny` upcoming feature (SW-PKG-07) with `-Xswiftc -warnings-as-errors` (SW-GATE-13); never rely on `-Werror ExistentialAny` alone.

- Why: Swift 6 mode accepts a bare protocol type silently, the feature alone only warns, and `-Werror ExistentialAny` alone is a no-op.
- Evidence: Swift 6 mode still accepts a bare protocol type (`[Shape]`, `-> Shape`, `rhs: Error`); the feature gives a warning only (`use of protocol 'Shape' as a type must be written 'any Shape' [#ExistentialAny]`); `-Werror ExistentialAny` without the feature exits 0 silently; the userdocs say `any` "will become the default in a future language mode" ([SE-0335](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0335-existential-any.md), [userdocs](https://raw.githubusercontent.com/swiftlang/swift/main/userdocs/diagnostics/existential-any.md)) [era §4].
- Check: with the feature in the manifest, `swift build -Xswiftc -warnings-as-errors` exits 1 on `[Shape]` and 0 on `[any Shape]` and on `<S: Shape>`. The manifest-side check is SW-PKG-07's `dump-package` command. A `.treatWarning("ExistentialAny", as: .error)` in a published library's manifest is SW-GATE-14's call; CI uses the command-line form.
- Retrofit: adopted packages do not rewrite wholesale; they enable the feature through SW-PKG-32. Measured cost of enabling it on an unmodified tree (R5): swift-argument-parser 159 warning sites in 33 files, swift-collections 85 in 18, swift-system 1 (`Sources/System/Errno.swift:1568`), every build rc 0 until `-warnings-as-errors`.
- Red: yes. E-V6: `swiftc -typecheck -swift-version 6 -enable-upcoming-feature ExistentialAny -warnings-as-errors bare.swift` rc 1, `modern.swift` rc 0, `-Werror ExistentialAny` alone rc 0 (6.3 and 6.4); `fx:d-any-warn` rc 1 / `fx:d-any-green` rc 0 under `-Xswiftc -warnings-as-errors`.
- Binds: library, SDK, CLI, server. 15 of 38 corpus manifests enable it (swift-log `Package.swift:59`, swift-testing `Package.swift:461`, swift-protobuf `Package.swift:465`).

**SW-LANG-07 (SHOULD; any Swift).** Add `-Xswiftc -Xfrontend -Xswiftc -warn-long-expression-type-checking=200` to the warnings-as-errors build, and fix a timeout by typing every literal operand (`3.0`, `Double(x)`), binding each sub-expression to a typed `let`, or extracting a local function; never by raising the limit.

- Why: a valid mixed-literal expression fails with an opaque timeout error, and the fix is to split the expression, not to tune the compiler.
- Evidence: a valid mixed-literal expression fails with `the compiler is unable to type-check this expression in reasonable time` on 6.3 and 6.4 (4.3 to 4.8 s on 6.4, 5 to 11 s on 6.3); the solver gives up at one million disjunction attempts or 512 MB, the wall-clock limit is off by default, and an integer literal has two default types ([Pestov](https://forums.swift.org/t/roadmap-for-improving-the-type-checker/82952)). The cliff between 7 and 6 terms is sharp, so the 200 ms warning arrives with the error rather than before it [era §8].

```sh
swift build -Xswiftc -Xfrontend -Xswiftc -warn-long-expression-type-checking=200 -Xswiftc -warnings-as-errors
```

- Red: yes. `d-tc-red` rc 1 (`error: expression took 4844ms to type-check (limit: 200ms)`), `d-tc-green` rc 0 on 6.4 (R3, E-V7 on 6.3 and 6.4). False alarms: R3 built swift-log, swift-argument-parser, swift-system, swift-async-algorithms, swift-collections and hummingbird (with its resolved dependency graph, whose modules take the same flags) in debug on 6.4 with the threshold at 100 ms and counted 0 hits; the same flag at 1 ms printed 120 on swift-log, so it was live; the exact gate command exits 0 on the swift-log and swift-system copies.
- Marginal value, stated honestly: the plain build already exits 1 with `unable to type-check this expression in reasonable time` on the cliff expressions, so the flag adds the `expression took Nms` line and catches only expressions between 200 ms and the solver limit; the sweep found none in that window and the six-package run found none at 100 ms. The durable content of this rule is the fix order, which stops an agent answering the error with a whole-closure annotation or a raised limit.
- Binds: every kind. SHOULD because the limit is wall-clock (Conflicts 8). Re-measure on each toolchain bump: 6.4 was faster than 6.3 on the same expression and both fail.

#### C. Caught by running the code

**SW-LANG-08 (MUST for library, SDK, CLI and server; SHOULD for apps; any Swift, 6.4 for the warning).** Capture `self` by lifetime. A closure or `Task` that `self` stores or that is registered with something `self` outlives, and that can run unboundedly (a polling or `for await` loop, an observer, a timer, a delegate callback), uses one of two designs. Design W: `[weak self]` with `guard let self` rebound per iteration, not held across a long suspension, plus a `deinit` that cancels the task. Design C: a strong capture and an owner contract (SW-CONC-13, SW-CONC-20) of an idempotent awaited `close()` that cancels it. A short, finite, unstored `Task` gets no `[weak self]`. `[unowned self]` becomes `[weak self]` unless a comment states the lifetime guarantee.

- Why: `[weak self]` on a short `Task` silently drops its work, and a strong capture on a stored loop leaks the owner.
- Evidence: R2 and [era §7], `swiftc -O -swift-version 6`, 6.3.3 and 6.4 identical:

| Program | Result | exit |
|---|---|---|
| stored loop task, strong capture, nobody cancels | `deinit_count=0`: a cycle, the owner never dies | 1 |
| same, `[weak self]` with `guard let self`, `deinit { task?.cancel() }` | `deinit_count=1` | 0 |
| same strong capture, owner calls `close()` that cancels (R2 `closed.swift`) | `deinit_count=1` | 0 |
| same strong capture, owner forgets `close()` (R2 `forgot.swift`) | `deinit_count=0` | 1 |
| short unstored `Task { await w.work() }`, strong | `ran=1 deinit_count=1`: no cycle | |
| short unstored `Task { [weak w] in sleep; await w?.work() }` | `ran=0`: the work silently never ran | |

  - 6.4 adds the default-on warning `ImplicitStrongCapture` for a nested `[weak self]` closure inside an outer escaping closure that does not capture `self` explicitly (the outer one then captures it strongly): `warning: 'weak' ownership of capture 'self' differs from implicitly-captured strong reference in outer scope [#ImplicitStrongCapture]`. Fix: put the capture list on the outer closure, `run { [weak self, service] in ... }`. On 6.3 the file is silent and `-Werror ImplicitStrongCapture` prints `unknown warning group` and exits 0; SW-GATE-15 therefore names a group only if the oldest leg knows it, and on a 6.4 leg `-Xswiftc -warnings-as-errors` (SW-GATE-13) already makes it an error.
  - Apple's documentation ("tasks rarely need to capture weak references") and Wals's leak warning for iterating tasks are both right for their lifetimes (Conflicts 14).
- Check: a behavioural test that the owner `deinit`s after its last strong reference drops (design W) or after `close()` (design C), exit 0 / deinit count 1; T11 lists every `Task { [weak self]`, `Task.detached { [weak self]` and `[unowned self]` for the reading check (finite and unstored: remove; stored and unbounded: confirm a design). Which design applies is a reading heuristic, because no tool tells a stored loop from a finite task; the deinit test is the runtime proof, written per owner type, and a change that adds such a task without it names the design in the pull request. MUST holds because both failures were measured and the proof is runnable. SwiftLint `unowned_variable_capture` (opt-in) flags `[unowned self]` but only from the SourceKit image path in strict mode; it is optional.
- Red: yes. `cycle.swift` rc 1, `nocycle.swift` rc 0, `cargo.swift` `WEAK short task: ran=0` (E-V10); R2 `closed.swift` rc 0, `forgot.swift` rc 1; T11 prints 2 lines on the plant and 0 on the twin; `nested.swift` rc 1 under `-Werror ImplicitStrongCapture` on 6.4, `nested_ok.swift` rc 0; SwiftLint SourceKit image `error: Unowned Variable Capture Violation` rc 2 under `--strict`, the static binary prints 1 warning at rc 0 and silently skips `shorthand_optional_binding` (E-V12).
- Binds: library, SDK, CLI, server. Floor: any Swift for the capture rule; 6.4 for the warning.

#### D. Caught by a grep prompt and a reading

**SW-LANG-09 (SHOULD; MUST-run only through SW-GATE-10).** In new non-UI code replace `OperationQueue`, `Thread.detachNewThread`, `Thread(block:)`, `NSThread`, `performSelector`, Combine types (`AnyCancellable`, `PassthroughSubject`, `CurrentValueSubject`, `AnyPublisher`) and `ObservableObject`/`@Published` with structured concurrency, `AsyncSequence`, and `@Observable` with `Observations { }`; `Thread` is allowed only as the SW-CONC-23 off-pool bridge, with its reason comment. State that reacts to change outside a view does not use a re-armed `withObservationTracking`.

- Why: Combine and `ObservableObject` do not exist on Linux, and a re-armed `withObservationTracking` observes one change.
- Evidence: `ObservableObject` and `@Published` need Combine and so do not compile on Linux at all; `withObservationTracking` fired its `onChange` once after two mutations on Linux 6.3 and 6.4 (`calls ... : 1`), while `Observations { c.n }` yielded `[2, 3]` for a value set to 2 then 3; `Observations` resolves on 6.2.0, 6.2.4 and 6.4 and not on 6.1 (`cannot find 'Observations' in scope`, R6c). The Combine half is already a MUST through SW-LANG-01 (it breaks the Linux build); this rule is the design replacement and the legacy-threading tell [era §3, §2].
- Check: T01 (legacy threading) and T02 (Combine types), plus SW-GATE-10 E04, E12, E13. Empty output is a pass on added lines; the greps are prompts on a legacy tree (T01 53 hits in 6 repos, T02 1,307 in 8; element-x-ios holds 1,175 of the Combine hits).
- Red: yes. T01 2 lines and T02 2 lines on the plant, 0 on the twin (E-V2, R7); E12 2 lines (E-V1); `fx:i-observation` `onChange calls after two mutations: 1`, `Observations values: [2, 3]` (E-V13).
- Binds: library, SDK, CLI, server. Apps follow SW-APPLE-06 and SW-APPLE-13 (Combine stays where an Apple API vends a `Publisher`). `Thread` for blocking work is SW-CONC-23's.

**SW-LANG-10 (SHOULD; Swift 5.7 spelling).** Choose the spelling by what the call site needs: a parameter used once is `some P`; a parameter named elsewhere (the same type twice, a `where` clause, the return, the body) is `<T: P>`; a return with one concrete type is `some P`; `any P`, written out, only where conformers differ at runtime (a plugin registry, a heterogeneous array, an erased stored property). Do not change a released signature between `some P`, `any P` and a concrete type.

- Why: `any P` costs a box and a dynamic dispatch and drops type identity, and swapping it for `some P` in a released signature breaks callers.
- Evidence: `some` and generics keep type identity and specialise; a boxed `any P` "has a performance cost" (TSPL). Measured, `swiftc -O`, 6.4, 2,000,000 elements, best of five, two runs: `[any Shape]` against generic `[Square]` (one Double, inline buffer) 8.2 and 9.0 ms against 0.9 and 2.1 ms, 4.4x to 9x; for a four-Double struct (boxed) 10.0 and 10.4 ms against 4.4 and 5.5 ms, 1.9x to 2.3x. `any Equatable == any Equatable` does not compile (`binary operator '==' cannot be applied to two 'any Equatable' operands`); `func f(_ x: any P) -> Int { g(x) }` with `g<T: P>` and `func h(_ x: some P)` both compile (SE-0352, SE-0341) [era §4].
- Check: T16 lists every `[any ...]`; each hit names its runtime heterogeneity in the pull request (reading heuristic: the choice itself cannot be graded by a tool). For a released signature: `swift package diagnose-api-breaking-changes <tag>` exits 1 on the change (SW-GATE-20).
- Red: yes for T16 (1 line on the plant, 0 on the twin, E-V2), the compile facts and the benchmark. R4 for the API gate: `makeShape() -> some Shape` to `-> any Shape` rc 1 `API breakage: func makeShape() has return type change from some Lib.Shape to any Lib.Shape`; `accept(_ s: some Shape)` to `any Shape` rc 1; `all() -> [Square]` to `[any Shape]` rc 1; an added `extra()` rc 0 `No breaking changes detected in Lib`. The ABI half (library evolution) is reasoned from TSPL, not measured.
- Binds: library, SDK, CLI, server, apps (SwiftUI `some View` is the legitimate `some`). Corpus: `any` 6,636 against `some` 4,111 occurrences; Alamofire is the `any` extreme because it stores `(any RequestInterceptor)?` (`Alamofire@bda9ed57d729:Source/Core/Session.swift:75`).

**SW-LANG-11 (SHOULD; any Swift).** A class is `final` unless it is a documented extension point: `open`, with a comment naming the subclassing contract. When the compiler says `non-final class 'X' cannot conform to the 'Sendable' protocol`, the fix is `final` (SW-CONC-28 ladder, rung 2), never `@unchecked Sendable`.

- Why: a non-final class cannot be checked `Sendable`, and the agent's answer to that error is `@unchecked Sendable`.
- Evidence: `public class Cache: Sendable { let limit = 10 }` is rc 1 on 6.3 and 6.4; `public final class Cache: Sendable` rc 0; `open class Cache: @unchecked Sendable` rc 0, which is the hatch SW-CONC-01 constrains. 72.4% of corpus classes are `final` (2,071 of 2,860) and 52 are `open`; one `open class Spec: @unchecked Sendable` hierarchy holds 237 of the corpus's 564 hatches [era §6].
- Check: T12 is a prompt (each printed class is final-able or carries a contract comment) and the compile error above is the hard gate for the `Sendable` case. SwiftLint `redundant_final` and `static_over_final_class` do not flag a missing `final`; no swift-format rule does (the 6.4 `dump-configuration` has none, R10).
- Red: yes. `g-final` rc 1 non-final, rc 0 final and rc 0 `@unchecked` open (E-V9); T12 4 lines on the plant, 0 on the twin (E-V2).
- Binds: library, SDK, CLI, server. Floor: any Swift. Corpus noise: SwiftLint 602, element-x-ios 238 and tuist 212 T12 hits, so it cannot be a gate.

**SW-LANG-12 (SHOULD; Swift 6.0 for `~Copyable`, 6.2 for `InlineArray` and `Span`).** Use `~Copyable`, `~Escapable`, `InlineArray` and `Span` only with a multi-word reason on the line or the line above: a unique-resource lifetime (a descriptor closed exactly once), a layout guarantee, a C-interop shape, or a measurement. Ordinary models stay ordinary structs.

- Why: a `~Copyable` model type breaks at the first array, and `InlineArray` measured no faster than `[Int]` under `-O`.
- Evidence: a `~Copyable` model type fails at the first `[Token]` (`generic struct 'Array' requires that 'Token' conform to 'Copyable'`) and at the first un-annotated parameter (`parameter of noncopyable type 'Token' must specify ownership`), then a second use is a use-after-consume error; `InlineArray<4, Int>` was not faster than a non-escaping four-element `[Int]` under `-O` on 6.4 (7.48 and 7.26 ms against 7.20 and 7.22 ms, 5,000,000 iterations, best of five, two runs) because the optimiser already promotes the small array to the stack [era §9].
- Check: T17 prints every use with no multi-word reason; empty output means every use is justified. It checks that a reason exists, not that it is true. The compiler errors above stop the model-type case.
- Red: yes. T17 4 lines on the plant, 0 on the twin (E-V2); `copyable_red.swift` rc 1, `copyable_green.swift` rc 0, `span_ok.swift` rc 0 on 6.3 and 6.4 (E-V11).
- Binds: library, SDK, CLI, server, apps. Corpus: 22 of 40 repos use none, including both apps; swift-collections holds 770 of the 1,188 T17 hits and its job is ownership.

**SW-LANG-13 (CONSIDER; Swift 5.7 to 6.3, by form).** On added lines prefer `if let x` to `if let x = x` (5.7), `count(where:)` and `contains(where:)` to `.filter { }.count` and `.filter { }.isEmpty` (6.0), `AnyObject` to `class` in a class-constrained protocol, a `Codable` struct to `[String: Any]` as a model, and `internal import` (6.0) to `@_implementationOnly import`; use the shipped spelling of other underscored attributes only when the floor admits it (`@c` 6.3, `@inline(always)` 6.3, `@specialized` 6.3).

- Why: these spellings mark unreviewed agent output and cost nothing to fix, but none is a defect. This is the first rule to drop if the always-loaded budget is tight.
- Evidence: `if let x = x` has 4,392 corpus hits in 38 repos (T07), `[String: Any]` 406 in 17 (T13), `.filter { }.count` 236 in 16 (T08). Only two have compiler teeth: `protocol P: class` warns on 6.1, 6.3 and 6.4 and is an error under `-warnings-as-errors`; `@_implementationOnly` warns (`ImplementationOnlyDeprecated`). `@inline(__always)` still compiles everywhere and stdlib-adjacent packages keep it for older floors [era §2].
- Check: T07, T08, T09, T10, T13 (prompts). Optional SwiftLint `shorthand_optional_binding` (opt-in; the static 0.65.1 binary silently skips it, the SourceKit image prints it).
- Red: yes. T07 2, T08 2, T09 1, T10 4, T13 1 lines on the plant, 0 on the twin (E-V2); `swiftc -warnings-as-errors` on `protocol P: class {}` rc 1 against `AnyObject` rc 0; SwiftLint SourceKit image rc 2 under `--strict` on the plant (E-V12).
- Binds: new and touched code, every kind. Floor: per form.

### Check scripts

The dive's names are kept (T01 to T17, F62 to F64b) so the ID in a pull request maps to the dive and to `fx:verify-greps.sh`. T14 and T15 (stale availability, deprecated SwiftUI spellings) are SW-APPLE-11 and SW-APPLE-10's. Run from the repository root. Output is the violation. Plant: `fx:a-tells/plant`, twin: `fx:a-tells/twin`; R7 re-ran all of them.

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

Floor-band greps (SW-LANG-04): each prints the tokens introduced in that band; run the bands above the declared floor.

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

Corpus noise of the same greps over the 40 exemplars (`fx:exemplar-stale.tsv`): T01 53 hits in 6 repos; T02 1,307 in 8; T03 2,945 in 35; T04 1,232 in 22; T05 64 in 10; T06 1,060 in 13; T07 4,392 in 38; T08 236 in 16; T09 27 in 3; T10 4,743 in 21; T11 171 in 13; T12 1,623 in 27; T13 406 in 17; T16 931 in 28 (swift-build 521); T17 1,188 in 19; F62 893 in 22; F63 663 in 5; F64 211 in 7. These are inventories on mature trees, not a ban list: run them on added lines.

### Traceability

| Merged | Dive rule (working number) | Change |
|---|---|---|
| SW-LANG-01 | 03, 05 | merged Apple-only imports and Objective-C; added the module facts and the over-guard list |
| SW-LANG-02 | 06 | spelling reconciled with SW-CLI-07 (R1) |
| SW-LANG-03 | 14 | floor named by patch; weak-let patch fact (R6); patch-level tools-version option (R11) |
| SW-LANG-04 | 15, 16, 23, 24 | one pin table; `hasFeature` fact corrected (R6b) |
| SW-LANG-05 | 10 | unchanged, severity MUST kept |
| SW-LANG-06 | 11 | split: manifest to SW-PKG-07, flag to SW-GATE-13; retrofit cost (R5) |
| SW-LANG-07 | 21 | MUST to SHOULD; false-alarm run (R3) |
| SW-LANG-08 | 18, 19, 20 | design C added (R2); `[unowned self]` MUST to part of the rule |
| SW-LANG-09 | 01 (T01, T02), 02, 07 | `Thread` carve-out (SW-CONC-23) |
| SW-LANG-10 | 12, 13 | API-break check run (R4) |
| SW-LANG-11 | 17 | MUST to SHOULD |
| SW-LANG-12 | 22 | unchanged |
| SW-LANG-13 | 01 (T07 to T09, T13), 08, 09 | MUST/SHOULD to CONSIDER |
| (dropped) | 04, 25, 26 | 04 is SW-IO-02; 25 is evidence for SW-PKG-08 (Conflicts 11); 26 is SW-APPLE-10 and -11 |

## Applied to the exemplars and the future consumers

### Strict exemplars that already satisfy

| Rule | Satisfied by |
|---|---|
| SW-LANG-01 | Alamofire guards its Combine file by platform (`Alamofire@bda9ed57d729:Source/Features/Combine.swift:24-27`); swift-testing uses `#if canImport(Combine)` (`swift-testing@c7d68ca20cd7:Sources/Overlays/_Testing_Foundation/Attachments/_AttachableEncodableWrapper.swift:14`); SwiftPM imports `FoundationNetworking` under `canImport` (`swift-package-manager@5546f44a3b52:Sources/Basics/HTTPClient/URLSessionHTTPClient.swift:15-17`, with a FIXME that the import drags OpenSSL onto Linux) |
| SW-LANG-02 | swift-nio's ladder (`swift-nio@e12881f2a691:Sources/NIOConcurrencyHelpers/NIOLock.swift:22-24`); 347 of 410 corpus `@preconcurrency import` lines are libc shims in per-OS `#if` blocks [conc] Axis 1 |
| SW-LANG-04 | swift-crypto guards `@diagnose` (`swift-crypto@1c80d3aff53f:Sources/CryptoExtras/AES/AES_GCM_SIV.swift:16-17`); sourcekit-lsp declares tools 6.3 and writes `private weak let` (`sourcekit-lsp@c6ce93d5f8aa:Package.swift:1`, `Sources/SourceKitLSP/IndexProgressManager.swift:34`), consistent with the 6.3 floor rule; swift-collections raised tools to 6.4 (`swift-collections@935f696a549a:Package.swift:1`) |
| SW-LANG-06 | swift-log (`swift-log@4038b6a4f74a:Package.swift:59`), swift-testing (`:461`), swift-protobuf (`:465`) and 12 more of 38 manifests enable `ExistentialAny` |
| SW-LANG-08 | element-x-ios rebinds per iteration inside a `for await` loop (`element-x-ios@14e33866ced2:ElementX/Sources/FlowCoordinators/UserSessionFlowCoordinator.swift:534-536`, `Task { [weak self] in ... guard let self else { return }`) and stores a finite weak task (`ElementX/Sources/Services/ElementCall/ElementCallService.swift:397`) |
| SW-LANG-09 | the OCI exemplars have no Combine and no `OperationQueue`/`Thread` tells: swift-container-plugin 0 `DispatchQueue` and 0 Combine, container 6 and 0, containerization 22 and 0 ([conc] Axis 4 columns "DispatchQueue" and "import Combine"). Their `DispatchQueue` uses are SW-GATE-10 E04's, not this rule's |
| SW-LANG-11 | swift-nio 93% `final`; Nuke's copy-on-write box is a `private final class ... : @unchecked Sendable` with `isKnownUniquelyReferenced` in view (`Nuke@d5548dd61395:Sources/Nuke/ImageContainer.swift:147`) |
| SW-LANG-12 | swift-collections, whose job is ownership (770 T17 hits); 22 of 40 repos use no ownership feature |

### Prominent exemplars that violate (or are the cost of the rule)

| Rule | Violated by |
|---|---|
| SW-LANG-03, -04 | swift-foundation: tools 6.2 (`swift-foundation@aadd9259be07:Package.swift:1`), 621 `@export(implementation)` uses (a 6.3 attribute; first at `Sources/FoundationEssentials/Locale/Locale+Components.swift:962`) and no `compiler(>=6.3)` guard anywhere under `Sources` (R9). By inference from the measured `unknown attribute 'export'` on 6.2.0 and 6.2.4 (the repository itself was not built), a consumer on a 6.2 toolchain cannot compile it; it is built by its own toolchain, so this is not a model for a published package |
| SW-LANG-06 | swift-argument-parser, swift-collections and swift-system do not enable `ExistentialAny` (159, 85 and 1 sites when enabled, R5). swift-aws-lambda-runtime relaxes it for one target under a blanket error: `.treatWarning("ExistentialAny", as: .warning)` (`swift-aws-lambda-runtime@8abd464310c7:Package.swift:154`) |
| SW-LANG-09 | element-x-ios: 387 files import Combine and T02 prints 1,175 Combine-type lines ([conc] Axis 4 counts 853 references with its own token set, Conflicts 17); IceCubesApp's own `CLAUDE.md:144` says "Avoid Combine unless absolutely necessary" and the code has 24 `import Combine` files [conc] Axis 4. swift-build (28) and SwiftPM (15) hold real `OperationQueue`/`Thread` uses that predate structured concurrency |
| SW-LANG-11 | swift-build: `open class Spec: @unchecked Sendable` with a one-line doc comment and no subclassing contract or guard comment (`swift-build@2187330e13e7:Sources/SWBCore/SpecImplementations/Specs.swift:29`), 237 of 564 hatches; final share IceCubes 25%, element-x-ios 43%, swift-syntax 23% (node classes are `final` by macro) |
| SW-LANG-01 | Nuke imports `os` unguarded (`Nuke@d5548dd61395:Sources/Nuke/Internal/Graphics.swift:8`) and fails the Linux build [conc] Axis 7; it declares Apple platforms only, so the failure is by declaration. The T06 cross-check flags 24 Alamofire files that still build on Linux in 7 s, because one `@_exported import FoundationNetworking` sits at `Alamofire@bda9ed57d729:Source/Alamofire.swift:27-28`: the grep is a prompt, the build is the gate (R9). SW-API-03 forbids `@_exported` in libraries, so SW-IO-02's per-file import is the compatible form |
| SW-LANG-08 | T11 finds 171 `Task { [weak self]`/`[unowned self]` lines in 13 repos; this consolidation did not classify them, so the share that are finite unstored tasks (the `ran=0` failure) is unmeasured |

### New commitments for the Swift SDK, Swift CLIs and OCI tooling

- **SDK wrapping `ocx` (mirrors `ocx-sdk-python`).** SW-LANG-01 and -02 as MUST (it ships on Linux and must survive the static SDK); a floor leg on `swift:6.2.0` at tools 6.2 (SW-LANG-03, SW-PKG-12) so `weak let`, `@c` and `~Sendable` need guards the moment they appear; `any P` only for the spawn module's erased boundary (SW-IO-26) and `some`/generics elsewhere; its public signatures are frozen against `some`/`any` drift by SW-GATE-20; no Combine, no `ObservableObject`, no `Thread` outside the SW-CONC-23 bridge. Its tasks are owned by `close()` (design C of SW-LANG-08) unless a task must outlive its handle.
- **Swift CLIs (ocx and grimoire mould).** The Stdio file imports libc through the chain with `@preconcurrency` (SW-LANG-02, SW-CLI-07); `Darwin.exit` is never the fix for an async `exit()` (SW-CLI-03); release builds use the static SDK, so SW-LANG-02's musl build is part of the release gate.
- **Servers.** Same as the CLI; per-request tasks are SW-CONC-19's, and `[weak self]` on a request task is wrong by SW-LANG-08.
- **OCI tooling in the containerization mould.** The mould already satisfies SW-LANG-09 (0 Combine, few legacy queues); the open question for it is the static-SDK build, not the idioms.

## AI-agent failure modes

Ranked by how often the failure bites. The evidence for frequency is corpus counts and Gallagher's December 2025 one-shot test (stale availability checks, mandatory `import Combine` for `ObservableObject`); agent failure frequency itself is not measured ([shape] H7: presence in the corpus is not a failure signal). Nil Coalescing's point drives the form: agents "regularly miss rules stated in their instructions", so every check is a command.

| # | Failure | Mechanical check | Rule |
|---|---|---|---|
| 1 | Apple-only API in portable code: `Combine`, `os`/`OSLog`, `Logger(subsystem:)`, `@objc`, `autoreleasepool`, CryptoKit, `URLSession` without `FoundationNetworking`; the error names no fix | `swift build` on the Linux image; T03, T04, T05 | SW-LANG-01, SW-IO-02 |
| 2 | Pre-6 concurrency and state idioms in new code: GCD, completion handlers, `ObservableObject`, `NSLock`, `OperationQueue` | K-07 E04, E12, E13, E14; T01, T02 | SW-LANG-09, SW-GATE-10 |
| 3 | Hallucinated or unreleased API and attribute: `mapKeyedValues`, `@specialize`, `withDeadline`, `defaultSwiftSettings:`, stdlib `FilePath`, `@warn` | compile on the floor and current image | SW-LANG-05 |
| 4 | Newer syntax in an older-floor package: `weak let`, `~Sendable`, `@diagnose`, `some P?`, `@c` | floor-patch image build; F62 to F64b | SW-LANG-03, -04 |
| 5 | `[weak self]` on every closure (compiles, drops the work) or a strong stored loop with no cancel path (leaks) | owner-`deinit` test; T11 | SW-LANG-08 |
| 6 | Unconditional `import Glibc`/`import Darwin`; `Darwin.exit` as the async-`exit()` fix | `swift build --swift-sdk x86_64-swift-linux-musl`; the aid grep | SW-LANG-02, SW-CLI-03 |
| 7 | Bare protocol types accepted silently in Swift 6 mode; or `any P` everywhere as a default | `ExistentialAny` plus `-warnings-as-errors`; T16 | SW-LANG-06, -10 |
| 8 | `@unchecked Sendable` as the answer to a non-final class | compiler error `non-final class ... cannot conform`; T12 | SW-LANG-11, SW-CONC-28 |
| 9 | A long mixed-literal arithmetic expression that times out with an opaque error | `-warn-long-expression-type-checking=200` build | SW-LANG-07 |
| 10 | `~Copyable`, `InlineArray` or `Span` "for performance" on an ordinary model | T17; the compiler rejects the model case | SW-LANG-12 |
| 11 | A re-armed `withObservationTracking` loop in place of `Observations` | reading; `onChange` fires once | SW-LANG-09 |
| 12 | Stale `if let x = x`, `.filter{}.count`, `protocol P: class`, `[String: Any]` models | T07, T08, T09, T13 | SW-LANG-13 |

Stale `#available(iOS 1x` checks and deprecated SwiftUI spellings are real failures of the same kind and are SW-APPLE-10 and SW-APPLE-11's.

## Open questions

Owner decisions, each with the default this program applies:

1. **Does the static Linux SDK build gate every library, or only CLIs?** Default: SW-LANG-02's import form is MUST for every code kind that imports libc; the musl build leg is the release gate for CLIs and servers (SW-GATE-25 owns the matrix) and an optional leg for libraries that claim it.
2. **Pin the floor leg to the `.0` patch?** Default: yes for library and SDK (`swift:6.2.0`), because syntax arrived in a patch (R6); CLIs and servers test the current release only. Cost: one extra Linux leg and a 5 GB image.
3. **What does SW-CONC-04 and SW-PKG-08's "`weak let` is 6.3" become?** Default: keep 6.3 as the declared floor for a library on tools 6.2, so the form sits behind `#if compiler(>=6.3)` with the `Mutex<Box>` fallback (`b-weaklet-twin`), and record 6.2.3 as the measured introduction; nothing a consumer on 6.2.0 sees changes. A package that decides to require the form instead declares `// swift-tools-version: 6.2.3` (R11).
4. **SW-CONC-12 against SW-PKG-08 on `InferIsolatedConformances`.** Default: SW-PKG-08 (enable in every new package); the feature is a measured no-op without global-actor conformers, so SW-CONC-12's restriction buys nothing. Needs a one-line amendment to SW-CONC-12 at authoring.
5. **Reword SW-CLI-07 to the chain.** Default: yes, at authoring ("the file's libc imports are the SW-LANG-02 chain, each arm `@preconcurrency`").
6. **SW-IO-02 per-file `FoundationNetworking` against Alamofire's one `@_exported import` and SW-API-03.** Default: SW-IO-02 stays per-file; SW-API-03's ban on `@_exported` wins for libraries.
7. **Where the T-set lives.** Default: `language.md` carries T01 to T17 and the bands; the SW-CORE index carries K-07 and a pointer, so the always-loaded index stays small.
8. **Threshold of the type-checker gate.** Default: 200 ms; raise per CI fleet only after a measured false alarm, never to silence a real timeout.
9. **Guard or patch-level tools-version for a form that arrived in a patch release.** Default: the guard (`#if compiler(>=N)` plus the old spelling) for libraries and the SDK, which keep serving the `.0` of their floor (SW-PKG-12); a patch-level `swift-tools-version` only when the package decides to require the form, recorded in the commit message. CLIs and servers are on the current release and need neither.
10. **Drop SW-LANG-13 from the always-loaded text if the budget is tight.** Default: keep it at CONSIDER in the `language.md` depth file only; it carries no defect the build or SW-GATE-10 does not already see.

Subareas that deserve another research round:

- **Patch-release syntax introduction (6.3.x and 6.4.x).** Question: which forms compile on an earlier patch than their SE "Implemented" version, the way `weak let` compiles on 6.2.3 and not on 6.2.0 through 6.2.2? Run `fx:forms/run.sh` on 6.3.0 to 6.3.3, 6.1.0 to 6.1.3 and every 6.4 patch as they ship. This decides whether SW-LANG-03's `.0` pin is a one-off or a policy, and whether R11's patch-level tools-version is a rule or a rescue.
- **`[weak self]` base rate.** Question: of the 171 T11 hits in 13 repos, how many are finite unstored tasks where the weak capture drops work (`ran=0`), and how many are stored loops that rely on it? A 40-site classified sample would turn SW-LANG-08 from a measured mechanism into a measured frequency.
- **Non-Linux portability.** Question: which of the 40 probed Apple modules, the `canImport` libc arms and `FoundationNetworking` exist on the Wasm, Android and Windows SDKs? The Wasm SDK bundle is already installed under `swift-tools/sdks`; SW-LANG-01 is Linux-only until this runs.
- **Unresearched P3 rows.** M-A-08 (`@specialized`, `@inlinable`, `@usableFromInline`) and M-A-15 (consumer-side macro use in library code) have no dive; spawn one only if an SDK API needs them.

## Sub-artifacts

- [swift-language/era-and-idioms.md](swift-language/era-and-idioms.md): the stale-idiom grep table (T01 to T17), the Linux unavailable-module and API-break list, the some/any/generic measurements, the floor-raising syntax pins compiled on 6.1, 6.3 and 6.4, `final` and `open`, `[weak self]` runtime measurements, type-checker timeouts, the Span, InlineArray and noncopyable over-application test, and the `InferIsolatedConformances` no-op check.

## Key sources

1. https://www.swift.org/blog/swift-6.4-released/ (`some P?`, `@diagnose`, `defer { await }`, `withTaskCancellationShield`, Embedded existentials)
2. https://www.swift.org/blog/swift-6.3-released/ (`@c`, module selectors; the `@specialize` spelling the compiler rejects)
3. https://raw.githubusercontent.com/swiftlang/swift/main/CHANGELOG.md (per-release attribution; `withDeadline` under "Swift (next)")
4. https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0481-weak-let.md (SE-0481, `weak let`, `ImmutableWeakCaptures`; status says 6.3, the 6.2.3 compiler accepts it)
5. https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0518-tilde-sendable.md (SE-0518, why an unavailable `Sendable` conformance is not equivalent)
6. https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0522-source-warning-control.md (SE-0522, `@diagnose`, `SourceWarningControl`)
7. https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0335-existential-any.md (SE-0335, `any` staged to a future language mode)
8. https://raw.githubusercontent.com/swiftlang/swift/main/userdocs/diagnostics/existential-any.md (`ExistentialAny` behaviour and migration)
9. https://raw.githubusercontent.com/swiftlang/swift/main/userdocs/diagnostics/implicit-strong-capture.md (`ImplicitStrongCapture`, 6.4)
10. https://raw.githubusercontent.com/swiftlang/swift-book/main/TSPL.docc/LanguageGuide/OpaqueTypes.md (TSPL: type identity, the cost of a box)
11. https://developer.apple.com/documentation/swift/task.md (closure lifetime: "tasks rarely need to capture weak references")
12. https://www.donnywals.com/how-to-use-weak-self-in-swift-concurrency-tasks/ (iterating tasks leak; `guard let self` re-pins)
13. https://forums.swift.org/t/roadmap-for-improving-the-type-checker/82952 (one million attempts, 512 MB, literal defaulting)
14. https://www.cocoawithlove.com/blog/llms-twelve-months-later.html (Gallagher, measured LLM failures on Swift)
15. https://nilcoalescing.com/blog/IntroducingSwiftFairy (why deterministic checks beat prose rules)

## Appendix: runs by this consolidation

Fixtures: `/home/mherwig/.cache/research-lang/swift-tools/fixtures/language-consolidation/` (`libc-combined`, `libc-cli07`, `weak`, `tc`, `apibreak`, `obs`, `hf`, `forms-62.txt`, `forms-620.txt`). Wrapper: `/home/mherwig/.cache/research-lang/swift-tools/run.sh`, `SWIFT_VERSION` selects the image. Builds used `--scratch-path /home/mherwig/.cache/research-lang/swift-tools/build/langcons-<name>`; nothing was built inside an exemplar (the `tc` packages are copies without `.git`). Images pulled for this work: `swift:6.2`, `swift:6.2.0`, `swift:6.2.2`, `swift:6.2.3` (6.2.4 is the floating tag).

| Run | Command | Result |
|---|---|---|
| R1 libc chain | `SWIFT_VERSION=6.4 run.sh swift build --scratch-path ...` in `libc-combined` and `libc-cli07`; musl adds `--swift-sdks-path .../sdks --swift-sdk x86_64-swift-linux-musl` | `libc-combined` glibc rc 0, musl rc 0 (`Build complete! (4.94 secs)`); `libc-cli07` glibc rc 0, musl rc 1 `Sources/Lib/Stdio.swift:1:24: error: no such module 'Glibc'`. Aid grep: `libc-cli07` prints `libc-cli07/Sources/Lib/Stdio.swift` (rc 123), `libc-combined` prints nothing (rc 0) |
| R2 weak design | `swiftc -O -swift-version 6 -parse-as-library <f>.swift` on 6.4, then run | `closed.swift`: `CLOSED deinit_count=1`, exit 0; `forgot.swift`: `FORGOT deinit_count=0`, exit 1 |
| R3 type-checker | `swift build -Xswiftc -Xfrontend -Xswiftc -warn-long-expression-type-checking=100` (6.4, debug) on copies of swift-log, swift-argument-parser, swift-system, swift-async-algorithms, swift-collections, hummingbird; count `expression took` lines; gate command at 200 plus `-Xswiftc -warnings-as-errors` on `d-tc-red`, `d-tc-green`, swift-log, swift-system | all six rc 0 with 0 hits at 100 ms (the first async-algorithms and hummingbird builds failed on scratch-directory races, `already exists in file system` and `modified during the build`, and passed on a clean scratch path); control at `=1` on swift-log printed 120 hits; `d-tc-red` rc 1 `error: expression took 4844ms to type-check (limit: 200ms)`, `d-tc-green` rc 0; swift-log and swift-system gate rc 0 |
| R4 API break | `git tag 1.0.0` baseline, edit, `SWIFT_VERSION=6.4 run.sh swift package --scratch-path ... diagnose-api-breaking-changes 1.0.0` in `apibreak` | A return `some Shape` to `any Shape`: rc 1 `API breakage: func makeShape() has return type change from some Lib.Shape to any Lib.Shape`; B parameter: rc 1 `func accept(_:) has parameter 0 type change from some Lib.Shape to any Lib.Shape`; C `[Square]` to `[any Shape]`: rc 1; D additive `extra()`: rc 0 `No breaking changes detected in Lib` |
| R5 ExistentialAny retrofit | `swift build ... -Xswiftc -enable-upcoming-feature -Xswiftc ExistentialAny` (6.4) on unmodified copies; count unique `file:line` warnings `use of protocol ... must be written 'any ...'` after stripping ANSI and OSC-8 codes | swift-argument-parser@efd239f0055b rc 0, 159 sites in 33 files; swift-collections@935f696a549a rc 0, 85 in 18; swift-system@486d48c80fce rc 0, 1 (`Sources/System/Errno.swift:1568`) |
| R6 floor pins | `SWIFT_VERSION=<v> fx:forms/run.sh` (`swiftc -typecheck -swift-version 6` per form) on 6.2.4 and 6.2.0; `weak_let.swift` on 6.1, 6.2.0, 6.2.2, 6.2.3, 6.2.4; `b-weaklet-tools60` | 6.2.0 and 6.2.4 agree on all 33 forms except `weak_let` (rc 1 on 6.2.0, 0 on 6.2.4); `weak_let`: 6.1 rc 1, 6.2.0 rc 1, 6.2.2 rc 1, 6.2.3 rc 0, 6.2.4 rc 0 (and 6.3, 6.4 rc 0, E-V4); `b-weaklet-tools60` 6.2.4 rc 0; `mapKeyedValues`, `@specialized`, `~Sendable`, `UniqueBox`, `Iterable`, `diagnose`, `cancel_shield`, `defer_await`, `optional_some`, `@c`, `@export`, `@inline(always)`, the module selector all rc 1 on both 6.2 builds |
| R6b `hasFeature` | `swiftc -typecheck -swift-version 6 [-enable-upcoming-feature ImmutableWeakCaptures] hf.swift` with `#error` inside `#if hasFeature(...)` | `ImmutableWeakCaptures`: no `#error` without the flag on 6.2.0, 6.2.4, 6.3, 6.4; with the flag it fires on 6.2.4, 6.3, 6.4 and not on 6.2.0. `TildeSendable` and `SourceWarningControl` fire on 6.4 only |
| R6c `Observations` | `swiftc -typecheck -swift-version 6 obs.swift` (`Observations { 0 }`) | 6.1 rc 1 `cannot find 'Observations' in scope`; 6.2.0, 6.2.4, 6.4 rc 0 |
| R7 grep re-run | `fx:verify-greps.sh` | E01 to E16 (E10 absent) and T01 to T17, F62 to F64b: each prints on the plant (rc 0) and is empty on the twin (rc 1; T06 rc 123; T17 rc 0 with 0 lines); F62 7 lines on re-run |
| R8 floor and Linux plants | `fx:run-b.sh <v> <dir>` | `b-weaklet-tools60` 6.1 rc 1 `'weak' must be a mutable variable`, 6.4 rc 0; `b-red` 6.3 rc 1 `'~Sendable' requires -enable-experimental-feature TildeSendable`, 6.4 rc 0; `b-guarded` 6.3 rc 0; `a-tells/twin` 6.1 rc 0; `a-tells/plant` 6.4 rc 1 `no such module 'Combine'` |
| R9 exemplar reads | `sed -n`, `/usr/bin/grep -c` on the pinned clones; a T06-style count per repo | swift-foundation `Package.swift:1` tools 6.2, `@export(implementation)` 621 under `Sources`, 0 `compiler(>=6.3)`; sourcekit-lsp `Package.swift:1` tools 6.3; files naming `URLSession` without `FoundationNetworking`: swift-openapi-generator 44, Alamofire 24, tuist 23, Nuke 21, TCA 19, element-x-ios 13, IceCubesApp 11, SwiftFormat 6 |
| R10 swift-format | `SWIFT_VERSION=6.4 run.sh swift format dump-configuration`, grep for optional, existential, final, weak, shorthand, self, class | no rule except `UseShorthandTypeNames` (`[Int]` for `Array<Int>`, default on) and the `NeverUseImplicitlyUnwrappedOptionals` flag: swift-format has no rule for any SW-LANG check |
| R11 patch-level tools-version | a `Package.swift` at `// swift-tools-version: 6.2` and at `6.2.3` with a `weak let` source (`fixtures/language-consolidation/toolspatch`), `SWIFT_VERSION=<v> run.sh swift build --scratch-path ...` on 6.2.0, 6.2.2, 6.2.3, 6.2.4 | tools 6.2: 6.2.0 rc 1 and 6.2.2 rc 1 (`L.swift:3:14: error: 'weak' must be a mutable variable, because it may change at runtime`), 6.2.3 rc 0, 6.2.4 rc 0. tools 6.2.3: 6.2.0 rc 1 and 6.2.2 rc 1 (`error: 'toolspatch': package 'toolspatch' is using Swift tools version 6.2.3 but the installed version is 6.2.0`), 6.2.3 rc 0, 6.2.4 rc 0 |
| R12 final-pass re-runs | R1 (`libc-cli07`, `libc-combined` on glibc and `--swift-sdk x86_64-swift-linux-musl`), R2 (`weak/closed.swift`, `forgot.swift` compiled `-O -swift-version 6` into `weak/rerun/`), R3 (swift-log copy at 100 ms and 1 ms), R4 (`apibreak2`, tag `1.0.0`, variants A to D), R5 (swift-system), R6 (`weak_let.swift` on 6.1, 6.2.0, 6.2.2, 6.2.3, 6.2.4, 6.3, 6.4), R7 (`fx:verify-greps.sh`), the aid grep of SW-LANG-02, the exemplar line cites of this file | all reproduced: R1 musl rc 1 / rc 0 and glibc rc 0 / rc 0; R2 `CLOSED deinit_count=1` exit 0, `FORGOT deinit_count=0` exit 1; R3 swift-log rc 0 with 0 hits at 100 ms and 92 hits at 1 ms (R3 recorded 120 in an earlier run; the control only has to be non-zero); R4 A rc 1 `return type change from some Lib.Shape to any Lib.Shape`, B and C print the same `[#api-digester-breaking-change]` error (rc not captured in the re-run, rc 1 in R4), D rc 0 `No breaking changes detected in Lib`; R5 one site at `Errno.swift:1568:46`; R6 rc 1,1,1,0,0,0,0; R7 every plant prints and every twin is empty; the aid prints `Stdio.swift` (rc 123) and nothing; the line cites match the pinned clones |
| R13 libc order | `libc-order-a` (chain, then `import Foundation`) and `libc-order-b` (`import Foundation`, then chain), `fputs(s, stdout)` in Swift 6 mode, 6.4, glibc and `--swift-sdk x86_64-swift-linux-musl` | a: glibc rc 0, musl rc 0. b: glibc rc 1 (`Stdio.swift:11:14: error: reference to var 'stdout' is not concurrency-safe because it involves shared mutable state`), musl rc 0 |
