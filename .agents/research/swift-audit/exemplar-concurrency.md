---
title: Exemplar corpus concurrency audit (40 Swift repositories, Swift 6.4 toolchain)
agent: research-lang / exemplar-concurrency auditor (workflow subagent)
model: claude-sonnet-5-5
scope: Concurrency posture of the 40-repository Swift exemplar corpus - escape hatches, isolation, tasks, legacy concurrency, AsyncSequence, language-mode posture, plus strict-mode compiler runs on 6 packages. Non-test, non-generated code only. Read-only on all clones.
method: |
  Re-runnable. Scripts live in /home/mherwig/.cache/research-lang/swift-tools/fixtures/exemplar-concurrency/scripts (cwd = that dir, run with `python3 -I`). Order: `run_scan.py` (per-repo walk, classify path, strip comments+strings with one master regex, count ~80 regexes, write scan.json) -> `extra.py` (refined Task / AsyncStream / callback / AsyncSequence-conformer / @MainActor-kind parsing, extra.json) -> `tasks2.py` -> `unchk.py` -> `samp25.py` -> `pkgs.py` (manifest parse, pkgs.json) -> `final.py` (tables). Compiler runs: `drive.sh <name>` in the parent dir (three `swift build` runs per package via /home/mherwig/.cache/research-lang/swift-tools/run.sh, swift:6.4 image), logs summarised by `logsum.py` / `reps.py`. Exemplar SHAs: see "Corpus and method". Every number below is the output of one of those scripts; the regex catalog is in "Appendix: regex catalog"; each axis states its command next to its result. Spot-checks (3 hits per pattern, drawn with random.Random(7), distinct repos) are reported with false-positive rates.
date_researched: 2026-10-10
---

# Exemplar corpus concurrency audit

Researched 2026-10-10 against Swift 6.4.0 (docker `swift:6.4`; `swift --version` run inside `run.sh`). Linux only: nothing here executed SwiftUI, Xcode build settings or Apple frameworks; every Apple-only claim rests on reading and says so.

## Table of contents

1. Headline numbers
2. Corpus and method (SHAs, exclusions, spot-check false-positive rates)
3. Axis 1 - Escape hatches (H2)
4. Axis 2 - Isolation (H8)
5. Axis 3 - Tasks and cancellation
6. Axis 4 - Legacy concurrency still present
7. Axis 5 - AsyncSequence
8. Axis 6 - Language-mode posture (H1)
9. Axis 7 - Compiler in stricter modes
10. Smells (ranked)
11. Patterns worth encoding
12. Contradictions of the frame
13. Gaps
14. Appendix: regex catalog

## Headline numbers

Corpus after exclusions: 40 repos, 9,537 `.swift` files, 1,266,893 non-blank non-comment lines (LOC below always means this). 9,349 further `.swift` files were excluded (5,050 test, 2,351 example/demo/tutorial, 844 fixture, 692 manifest, 303 generated, 101 benchmark, 8 vendored).

| Metric | Count (per 10k LOC) | Repos with at least one | Extremes |
|---|---|---|---|
| `@unchecked Sendable` | 564 (4.5) | 33 of 40 | high: swift-build 237 total, swift-log 28.3/10k, Alamofire 22.2/10k; zero: swift-format, SwiftFormat, swift-testing, swiftly, container, swift-container-plugin, swift-embedded-examples |
| `nonisolated(unsafe)` | 191 (1.5) | 19 | high: rules_swift 27.5/10k, swift-testing 17.3/10k (36), async-algorithms 15.7/10k; 58% are `let` bindings |
| `@preconcurrency import` | 410 (3.2); 347 are libc/SDK shims | 21 | swift-nio 150, swift-foundation 113 (both libc blocks) |
| `@preconcurrency` on declarations | 422 (3.3); conformance form only 2 | 13 | swift-nio 154, TCA 75, Alamofire 65, swift-foundation 54 |
| actor-isolation assumptions | 75: 19 `MainActor.assumeIsolated`, 56 NIO `EventLoop.assumeIsolated()` | 6 | async-http-client 29, swift-nio 27 |
| `actor` declarations | 151 (1.2) | 16 | sourcekit-lsp 38, container 28, swift-package-manager 22 |
| `@MainActor` | 614 (4.8): 224 type, 205 member, 165 function-type, 12 global | 11 | IceCubesApp 219, element-x-ios 122, TCA 113; 29 repos use none |
| `nonisolated` keyword | 691 | 16 | element-x-ios 446 (default-MainActor app) |
| `nonisolated(nonsending)` / `@concurrent` | 51 / 12 | 6 / 3 | swift-testing 26 / element-x-ios 8 |
| unstructured `Task {}` | 882 (7.0); 709 (80%) not stored | 22 | element-x-ios 469, IceCubesApp 186; stored handles cancelled by name: 88 of 159 |
| `Task.detached` | 34 | 9 | sourcekit-lsp 8, tuist 9 |
| structured: TaskGroup / discarding / `async let` | 143 / 12 / 66 | 20 / 7 / 7 | tuist 19, swift-package-manager 17, swift-build 16 |
| cooperative cancellation (Task.isCancelled / checkCancellation / handler) | 142 / 70 / 72 | 17 for handler | async files with any: 145 of 2,257 (6.4%) |
| `Task.sleep(for:)` vs `(nanoseconds:)` | 132 vs 18 (ratio 7.3) | 18 vs 7 | element-x-ios 39 vs 0; tuist 20 vs 9 |
| `DispatchQueue` | 550 (4.3) | 22 | element-x-ios 190, Alamofire 126 (133/10k), SwiftPM 87 |
| callback-style closure params (Void, non-async) | 322 (2.5) | 23 | Alamofire 87 (92/10k), SwiftPM 79 |
| `import Combine` files | 440 (3.5) | 9 | element-x-ios 387 (88%) |
| `withChecked*Continuation` / `withUnsafe*Continuation` | 165 / 46 (unsafe 22%) | 20 / 6 | swift-async-algorithms 35 (all unsafe) |
| blocking `DispatchSemaphore`/`DispatchGroup` waits | 20; 1 bridging async-to-sync (marked `noasync`) | 8 | SwiftPM `unsafe_await` |
| `AsyncStream` closure ctor / `makeStream` | 32 / 46; 75 of 78 use the default unbounded buffer | 20 | element-x-ios 15 makeStream, container 9 ctor |
| custom `AsyncSequence` / `AsyncIteratorProtocol` conformers | 84 / 84 | 15 | swift-async-algorithms 56 |
| `Mutex<>` (Synchronization) | 177 | 15 | swift-foundation 46, containerization 38 |
| Whole-package Swift 6 mode | 25 of 40 (+4 mostly-6 with 5-mode targets) | | Swift 5 mode still: swift-foundation, SwiftPM, swift-syntax, swift-format, SwiftLint, SwiftFormat, Alamofire, swift-snapshot-testing, tuist (mostly) |
| `NonisolatedNonsendingByDefault` enabled | 7 of 40 | | swift-log, async-algorithms, lambda-runtime, sourcekit-lsp, swift-dependencies, vapor, element-x-ios |
| Default `MainActor` isolation | 2 of 40 repos (IceCubesApp, element-x-ios) | | in 9 of 13 IceCubes local packages |
| Strict-mode build (`-swift-version 6`) | 3 of 5 buildable packages fail (Nuke does not build on Linux at all) | | see Axis 7 |

Verdict on the hypotheses touched here: H1 half right (tools version is not the discriminator), H2 half right (dominant yes, "mostly avoidable" no), H8 narrowly contradicted, H7 split. Details in "Contradictions of the frame".

## Corpus and method

Exemplar SHAs measured (12 chars, from swift-audit/scratch/exemplar-shas.md; clones depth-1 under `/home/mherwig/.cache/research-lang/exemplars/swift/<owner>__<repo>`):

```
swift-log@4038b6a4f74a  swift-argument-parser@efd239f0055b  swift-async-algorithms@cbde9aed744b
swift-collections@935f696a549a  swift-nio@e12881f2a691  swift-system@486d48c80fce
swift-openapi-generator@c4f943e14015  swift-distributed-tracing@a5270bd1280a  swift-container-plugin@a9646b8d4dca
swift-crypto@1c80d3aff53f  swift-format@b15dd59fad21  container@f70ecbb926d9
containerization@3e7bc39e66b3  swift-protobuf@6c84c3dedac0  swift-testing@c7d68ca20cd7
swift-syntax@be549876fe91  swiftly@c8cf2e35bfca  swift-foundation@aadd9259be07
swift-embedded-examples@119b29f83550  sourcekit-lsp@c6ce93d5f8aa  async-http-client@017115279d09
swift-package-manager@5546f44a3b52  swift-service-lifecycle@c55297914e26  swift-build@2187330e13e7
grpc-swift-2@ac33066eb6ed  vapor@bf77fc69b142  hummingbird@1bd3b407fb47
swift-aws-lambda-runtime@8abd464310c7  swift-dependencies@b476cc576105  swift-snapshot-testing@28e5de025e3f
swift-composable-architecture@bc2db5ba8ad3  Alamofire@bda9ed57d729  Nuke@d5548dd61395
SwiftLint@ec4691d9e813  SwiftFormat@fbc07aca5373  IceCubesApp@2ad6e6891258
rules_swift@50450ed24dde  JavaScriptKit@c68ee9bdebfa  element-x-ios@14e33866ced2
tuist@2f6ac74754bf
```

Counting discipline (implemented in `scan.py::classify`, applied to every repo):

- Excluded path components (case-insensitive where noted): `Tests`/`*Tests`/`*TestSupport`/`UnitTests`/`UITests`/`Mocks`/`Preview*`/`Integration` (test); `Examples`/`Samples`/`Demo`/`Tutorials`/`*tutorial`/`SampleApp`/`Playgrounds` (example; kept for swift-embedded-examples, where the examples are the product); `Fixtures`/`Snapshots` (fixture; SwiftFormat `Snapshots/` are third-party code used as inputs); `Benchmarks` (bench); `Vendor*`/`ThirdParty` (vendored); `*Tests.swift`; `*.pb.swift`, `*.grpc.swift`; any file whose first 25 lines match `DO NOT EDIT|automatically generated|auto-generated|@generated|Generated by|Generated using|Generated from`. Manifests (`Package*.swift`) are parsed separately (Axis 6).
- Comments and string literals (including multi-line and raw strings) are blanked by one regex before matching, so a pattern inside a comment or string never counts. Limitation: nested `/* */` comments and string interpolations containing a `"` are not handled (rare in the corpus).
- LOC = non-blank lines after comment removal (strings kept), per file, summed.
- Effect of the discipline, shown by a naive count over all 18,886 files (`find . -name '*.swift' | xargs cat | <regex count>`): `@unchecked Sendable` 1,131 naive vs 564 filtered; `nonisolated(unsafe)` 2,794 vs 191 (generated protobuf and fixtures); `DispatchQueue` 993 vs 550; `import Combine` 556 vs 440.
- Mock directories (`Mocks`, `Preview*`) are excluded as test-support; this undercounts element-x-ios, whose `Mocks` carry production-style code.

Spot-check of three hits per pattern (`samp.py`), false-positive rate observed and what was done:

| Pattern | Spot-check | Action |
|---|---|---|
| `@unchecked Sendable`, `nonisolated(unsafe)`, `@preconcurrency`, `@Sendable`, `@unsafe`, `unsafe` expr, `sending`, `Task(priority:)`, `Task.detached`, `Task.isCancelled`, `Task.sleep(for:)`, `Clock` generics, `pthread_*`, `withChecked*`, `Combine` use | 3/3 true positives each | none |
| `assumeIsolated` | 1 of 3 was NIO `EventLoopFuture.assumeIsolated()` (different construct) | split: 56 NIO event-loop vs 19 `MainActor.assumeIsolated` |
| `Task {` | 1 of 3 false (`public func createTask() -> Task {`, swift-package-manager@5546f44a3b52:Sources/SPMLLBuild/llbuild.swift:143) | refined parser drops `-> Task {`, `extension Task {`, `class Task {`: 915 to 882 (3.6% false positives) |
| `isCancelled` (bare) | 0 of 3 about tasks (own properties) | replaced by `Task.isCancelled` (142) |
| `Thread` | 2 of 3 were `Thread.isMainThread` checks | split: 2 creations vs 10 `isMainThread` checks |
| `AsyncStream<...> {` | 2 of 3 false (property type, return type) | refined: 67 to 32 constructions (52% false positives) |
| `AsyncSequence` conformers | 1 of 3 false (generic constraint `Base: AsyncSequence`) | token parser over the inheritance list: 100 to 84 |
| `nonisolated` | 1 of 3 false (swift-syntax `.nonisolated` token) | require no leading `.`: 715 to 691 |
| callback params | 5 of 6 real callbacks, 1 synchronous closure (`emitUsage(_ handler:)`, swift-build@2187330e13e7:Sources/SWBBuildService/Tools.swift:60) | reported as "callback-style params", 174 of 322 are named `completion*` |
| `.cancel()` | 3 of 3 are cancel calls but only about 1 in 3 is `Task.cancel` (others: DispatchSource, Alamofire Request) | used only as a relative signal |
| `unsafe` expression | 3/3 real (swift-collections is `-strict-memory-safety`) | none |

## Axis 1 - Escape hatches (H2)

Commands: `python3 -I run_scan.py && python3 -I final.py` (patterns `unchecked_sendable`, `nonisolated_unsafe`, `preconc_import`, `preconc_other`, `assumeIsolated`, `at_Sendable`, `sync_Mutex`, lock family). "libc/SDK + other" splits `@preconcurrency import` by module. Lock column* = NIOLock/NIOLockedValueBox + LockedValueBox/ManagedCriticalState + OSAllocatedUnfairLock + os_unfair_lock + NSLock + pthread_mutex references.

| group | repo | LOC | @unchecked Sendable (/10k) | nonisolated(unsafe) | @preconcurrency import: libc/SDK + other | @preconcurrency other | assumeIsolated actor + NIO-loop | @Sendable | Mutex | lock/queue primitives* |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| core | swift-log | 2475 | 7 (28.3) | 0 | 7 + 0 | 4 | 0 + 0 | 11 | 0 | 19 |
| core | swift-argument-parser | 11792 | 2 (1.7) | 0 | 8 + 0 | 18 | 0 + 0 | 24 | 3 | 8 |
| core | swift-async-algorithms | 12772 | 8 (6.3) | 20 | 0 + 0 | 0 | 0 + 0 | 137 | 5 | 26 |
| core | swift-collections | 52479 | 29 (5.5) | 3 | 0 + 0 | 0 | 0 + 0 | 0 | 0 | 0 |
| core | swift-nio | 76074 | 60 (7.9) | 2 | 149 + 1 | 154 | 0 + 27 | 357 | 1 | 92 |
| core | swift-system | 8382 | 2 (2.4) | 0 | 1 + 0 | 0 | 0 + 0 | 0 | 0 | 0 |
| core | swift-openapi-generator | 10592 | 1 (0.9) | 0 | 4 + 3 | 0 | 0 + 0 | 3 | 0 | 1 |
| core | swift-distributed-tracing | 2242 | 3 (13.4) | 0 | 5 + 0 | 0 | 0 + 0 | 7 | 0 | 19 |
| core | swift-crypto | 18917 | 24 (12.7) | 1 | 4 + 0 | 16 | 0 + 0 | 0 | 0 | 0 |
| core | swift-protobuf | 20266 | 5 (2.5) | 1 | 0 + 0 | 11 | 0 + 0 | 0 | 0 | 0 |
| core | swift-foundation | 104197 | 55 (5.3) | 6 | 113 + 0 | 54 | 1 + 0 | 34 | 46 | 0 |
| swiftlang-tools | swift-format | 12684 | 0 (0.0) | 0 | 0 + 0 | 0 | 0 + 0 | 0 | 0 | 0 |
| swiftlang-tools | swift-testing | 20765 | 0 (0.0) | 36 | 0 + 0 | 0 | 0 + 0 | 117 | 12 | 4 |
| swiftlang-tools | swift-syntax | 66395 | 6 (0.9) | 5 | 0 + 0 | 0 | 0 + 0 | 0 | 0 | 0 |
| swiftlang-tools | swiftly | 6811 | 0 (0.0) | 0 | 0 + 3 | 1 | 0 + 0 | 0 | 0 | 0 |
| swiftlang-tools | sourcekit-lsp | 41969 | 4 (1.0) | 40 | 0 + 15 | 1 | 0 + 0 | 108 | 11 | 0 |
| swiftlang-tools | swift-package-manager | 106051 | 12 (1.1) | 0 | 0 + 6 | 0 | 0 + 0 | 93 | 12 | 29 |
| swiftlang-tools | swift-build | 115280 | 237 (20.6) | 3 | 0 + 0 | 0 | 0 + 0 | 84 | 0 | 1 |
| server | async-http-client | 14094 | 7 (5.0) | 1 | 0 + 0 | 18 | 0 + 29 | 45 | 0 | 16 |
| server | swift-service-lifecycle | 1871 | 4 (21.4) | 0 | 1 + 0 | 0 | 0 + 0 | 9 | 0 | 11 |
| server | grpc-swift-2 | 12531 | 4 (3.2) | 0 | 0 + 0 | 0 | 0 + 0 | 41 | 8 | 0 |
| server | vapor | 13580 | 1 (0.7) | 0 | 0 + 0 | 0 | 0 + 0 | 57 | 12 | 0 |
| server | hummingbird | 11547 | 4 (3.5) | 0 | 0 + 0 | 3 | 0 + 0 | 77 | 0 | 7 |
| server | swift-aws-lambda-runtime | 7131 | 3 (4.2) | 0 | 3 + 1 | 0 | 0 + 0 | 7 | 4 | 0 |
| community | swift-dependencies | 3439 | 3 (8.7) | 0 | 0 + 0 | 0 | 0 + 0 | 13 | 0 | 1 |
| community | swift-snapshot-testing | 6377 | 2 (3.1) | 0 | 0 + 0 | 0 | 0 + 0 | 4 | 0 | 2 |
| community | swift-composable-architecture | 14291 | 5 (3.5) | 0 | 0 + 5 | 75 | 5 + 0 | 47 | 0 | 4 |
| community | Alamofire | 9456 | 21 (22.2) | 1 | 0 + 2 | 65 | 0 + 0 | 153 | 0 | 3 |
| community | Nuke | 10471 | 4 (3.8) | 13 | 0 + 0 | 0 | 7 + 0 | 96 | 0 | 22 |
| tools | SwiftLint | 61414 | 6 (1.0) | 3 | 3 + 4 | 2 | 0 + 0 | 9 | 0 | 8 |
| tools | SwiftFormat | 34381 | 0 (0.0) | 0 | 0 + 0 | 0 | 0 + 0 | 0 | 0 | 1 |
| tools | tuist | 136317 | 18 (1.3) | 0 | 0 + 12 | 0 | 0 + 0 | 100 | 12 | 9 |
| apps | IceCubesApp | 37113 | 8 (2.2) | 0 | 1 + 0 | 0 | 0 + 0 | 13 | 0 | 1 |
| apps | element-x-ios | 98239 | 5 (0.5) | 16 | 0 + 10 | 0 | 6 + 0 | 32 | 7 | 2 |
| platforms | rules_swift | 1817 | 1 (5.5) | 5 | 0 + 0 | 0 | 0 + 0 | 2 | 0 | 8 |
| platforms | JavaScriptKit | 26666 | 12 (4.5) | 6 | 48 + 0 | 0 | 0 + 0 | 10 | 2 | 1 |
| platforms | swift-embedded-examples | 8663 | 0 (0.0) | 0 | 0 + 0 | 0 | 0 + 0 | 0 | 0 | 0 |
| oci | containerization | 35525 | 1 (0.3) | 17 | 0 + 1 | 0 | 0 + 0 | 38 | 38 | 2 |
| oci | container | 29302 | 0 (0.0) | 12 | 0 + 0 | 0 | 0 + 0 | 114 | 4 | 3 |
| oci | swift-container-plugin | 2525 | 0 (0.0) | 0 | 0 + 0 | 0 | 0 + 0 | 0 | 0 | 0 |
| **total** | 40 repos | 1266893 | **564** (4.5) | **191** (1.5) | **347** + **63** | **422** | **19** + **56** | **1842** (14.5) | **177** | **300** |

Group roll-up (count and per 10k):

| group | LOC | @unchecked Sendable | nonisolated(unsafe) | @preconcurrency import | @preconcurrency other | @Sendable | Mutex<> |
|---|---:|---:|---:|---:|---:|---:|---:|
| core | 320188 | 196 (6.1) | 33 (1.0) | 295 (9.2) | 257 (8.0) | 573 (17.9) | 55 (1.7) |
| swiftlang-tools | 369955 | 259 (7.0) | 84 (2.3) | 24 (0.6) | 2 (0.1) | 402 (10.9) | 35 (0.9) |
| server | 60754 | 23 (3.8) | 1 (0.2) | 5 (0.8) | 21 (3.5) | 236 (38.8) | 24 (4.0) |
| community | 44034 | 35 (7.9) | 14 (3.2) | 7 (1.6) | 140 (31.8) | 313 (71.1) | 0 (0.0) |
| tools | 232112 | 24 (1.0) | 3 (0.1) | 19 (0.8) | 2 (0.1) | 109 (4.7) | 12 (0.5) |
| apps | 135352 | 13 (1.0) | 16 (1.2) | 11 (0.8) | 0 (0.0) | 45 (3.3) | 7 (0.5) |
| platforms | 37146 | 13 (3.5) | 11 (3.0) | 48 (12.9) | 0 (0.0) | 12 (3.2) | 2 (0.5) |
| oci | 67352 | 1 (0.1) | 29 (4.3) | 1 (0.1) | 0 (0.0) | 152 (22.6) | 42 (6.2) |

Findings.

- Density is lopsided, not uniform. One repo (swift-build) holds 237 of 564 `@unchecked Sendable` (42%); the next three (swift-nio 60, swift-foundation 55, swift-collections 29) bring the top four to 68%. 229 of swift-build's 237 are class declarations (174 `final`, 55 non-final on the declaration line) in the `Spec` hierarchy rooted at `open class Spec: @unchecked Sendable` (swiftlang/swift-build@2187330e13e7:Sources/SWBCore/SpecImplementations/Specs.swift:29), e.g. Sources/SWBCore/SpecImplementations/ProductTypes.swift:16 (`public class ProductTypeSpec : Spec, SpecType, @unchecked Sendable`) with immutable `let` state. Compile check: a non-final class cannot conform to `Sendable` at all (`error: non-final class 'Spec' cannot conform to the 'Sendable' protocol`, fixture `fixtures/exemplar-concurrency/avoid/b.swift`), so the open root and its 55 non-final subclasses are unavoidable; whether the 174 final leaves could be checked was not determined.
- Auto-classification of all 564 (`unchk.py`, body scanned for guards): immutable-only 209 (37%), no guard visible with a stored `var` 141 (25%; contains false negatives, see sample), guarded 120 (21%), empty `extension X: @unchecked Sendable {}` 94 (17%; 30 carry a `where Element: Sendable` clause).
- `@preconcurrency import` is mostly platform boilerplate: 347 of 410 import `Glibc`, `Musl`, `WASILibc`, `Android`, `Bionic`, `EmscriptenLibc`, `Darwin`, `CRT`, `WinSDK` in per-OS `#if` blocks, e.g. swiftlang/swift-nio@e12881f2a691:Sources/NIOConcurrencyHelpers/lock.swift:25 (`@preconcurrency import Bionic`). Only 63 are real third-party/SDK gaps (JavaScriptKit `Foundation` 40, element `MatrixRustSDK` 5, TCA `Combine` 5, sourcekit-lsp `SwiftDocC` 5).
- `@preconcurrency` on declarations (422) is a library-evolution tool, not a silencer: 345 on funcs/vars/inits (public API taking closures, swift-nio 154, Alamofire 65), 39 on protocols (swift-crypto@1c80d3aff53f:Sources/Crypto/Message Authentication Codes/MessageAuthenticationCode.swift:26), 16 on types, 20 other, and only 2 as a conformance modifier (swift-composable-architecture@bc2db5ba8ad3:Sources/ComposableArchitecture/Internal/Deprecations.swift:950 `extension ForEachStore: @preconcurrency DynamicViewContent`).
- `nonisolated(unsafe)` (191): 110 `let` (58%), 76 `var`, 5 multi-line. The `let` form is an immutable non-Sendable binding, e.g. swiftlang/sourcekit-lsp@c6ce93d5f8aa:Sources/SourceKitD/SKDRequestDictionary.swift:57 (`nonisolated(unsafe) let dict: sourcekitd_api_object_t`), 28 `let` in sourcekit-lsp alone. swift-testing pairs it with a lock: swift-testing@c7d68ca20cd7:Sources/Testing/Test+Cancellation.swift:35 (`nonisolated(unsafe) var _unsafeCurrentTask: Allocated<Mutex<UnsafeCurrentTask?>>`).
- Actor-isolation assumptions are rare and local: 19 `MainActor.assumeIsolated` (Nuke 7, element-x-ios 6, TCA 5, foundation 1; e.g. swift-composable-architecture@bc2db5ba8ad3:Sources/ComposableArchitecture/Internal/Deprecations.swift:584) versus 56 NIO `eventLoop.assumeIsolated()` (async-http-client@017115279d09:Sources/AsyncHTTPClient/ConnectionPool/HTTPConnectionPool+Factory.swift:363).
- Lock primitive adoption (reference counts): `Mutex<>` 177 in 15 repos (swift-foundation 46, containerization 38, SwiftPM/tuist/vapor/swift-testing 12 each), `import Synchronization` in 17 repos; `NIOLockedValueBox` family 79 in 4 (swift-nio 54, async-http-client 16); `NSLock` 61 in 14 (SwiftPM 29); `pthread_mutex` 100 in 8 (platform lock implementations, swift-nio 38, swift-log 19); `OSAllocatedUnfairLock` 24 in 3 (Nuke 21); `os_unfair_lock` 9; `Atomic`/`ManagedAtomic` 81 in 11. The NIO stack keeps its own lock: swift-nio 54 `NIOLock*` vs 1 `Mutex<>`, async-http-client 16 vs 0, hummingbird 7 vs 0; vapor (12) and grpc-swift-2 (8) use `Mutex<>` with 0 NIOLock.

Sample of 25 `@unchecked Sendable` types (one per repo, 25 repos chosen with `random.Random(2026)`; `samp25.py`), read and classified by hand. "Avoidable" = a checked `Sendable`, `Mutex`, `sending` or a value type would satisfy the compiler without redesign; items marked (c) were compile-checked on swift:6.4 in `fixtures/exemplar-concurrency/avoid/a.swift`, the rest are judged by reading.

| # | Type (repo@sha:path:line) | What guards the state | Avoidable |
|---|---|---|---|
| 1 | `StdioOutputStream`, swift-log@4038b6a4f74a:Sources/Logging/Handlers/StreamLogHandler.swift:241 | C `FILE*` lock closures (`flockfile`), stored non-`@Sendable` closures | no (C stream lock) |
| 2 | `RSA.Backing`, swift-crypto@1c80d3aff53f:Sources/CryptoExtras/RSA/RSA_boring.swift:226 | immutable `OpaquePointer` to BoringSSL key | no (raw pointer) |
| 3 | `UnsafeMutableTransferBox` ext, swift-protobuf@6c84c3dedac0:Sources/protoc-gen-swift/MessageStorageDecision.swift:101 | none; transfer box | yes, `sending` (c, region transfer compiles) |
| 4 | `ProductTypeSpec`, swift-build@2187330e13e7:Sources/SWBCore/SpecImplementations/ProductTypes.swift:16 | immutable `let`s, non-final hierarchy | no (c: non-final cannot be Sendable) |
| 5 | `_YamlFileDiagnosticsCollector`, swift-openapi-generator@c4f943e14015:Sources/_OpenAPIGeneratorCore/YamlFileDiagnosticsCollector.swift:23 | `NSLock` + `private var` array | yes, `Mutex<[Diagnostic]>` (c) |
| 6 | `AsyncMutex.Box`, containerization@3e7bc39e66b3:Sources/ContainerizationExtras/AsyncMutex.swift:22 | enclosing actor's `busy` flag and continuation queue | no (is the lock primitive) |
| 7 | `SortedSet.Iterator` ext, swift-collections@935f696a549a:Sources/SortedCollections/SortedSet/SortedSet+Sequence.swift:57 | conditional `where Element: Sendable` over storage class | no |
| 8 | `UnsafeTransferBox`, swift-aws-lambda-runtime@8abd464310c7:Sources/AWSLambdaRuntime/HTTPServer/Lambda+LocalServer.swift:117 | immutable `let`; init already takes `sending` | yes, drop the box, capture a `sending` value (c) |
| 9 | `LibraryHandle`, swift-package-manager@5546f44a3b52:Sources/Runtimes/PackagePlugin/Plugin.swift:632 | immutable `dlopen` handle (`UnsafeMutableRawPointer`/`HMODULE`) | no |
| 10 | `RetainedRawSyntaxArena`, swift-syntax@be549876fe91:Sources/SwiftSyntax/Raw/RawSyntaxArena.swift:264 | immutable reference to an arena class | no |
| 11 | `_PlatformTLSKey`, swift-system@486d48c80fce:Sources/System/Internals/Exports.swift:190 | none; empty `final class` in this `#if` branch | yes, plain `Sendable` (c) |
| 12 | `Job`, swift-async-algorithms@cbde9aed744b:Sources/AsyncSequenceValidation/Job.swift:15 | immutable `JobRef` (runtime job pointer) | no |
| 13 | `FileCache`, SwiftLint@ec4691d9e813:Source/SwiftLintCore/Extensions/SwiftLintFile+Cache.swift:42 | concurrent `DispatchQueue` with `.barrier` + `DispatchGroup` | yes in principle, `Mutex` over a state struct |
| 14 | `QuickLookToolbarItem`, IceCubesApp@2ad6e6891258:Packages/MediaUI/Sources/MediaUI/QuickLookToolbarItem.swift:5 | none; SwiftUI value type with `@State` | yes, delete the conformance (read) |
| 15 | `ServerSocketChannel`, swift-nio@e12881f2a691:Sources/NIOPosix/SocketChannel.swift:218 | confinement to one EventLoop (documented design) | no |
| 16 | `UnfairLock`, Alamofire@bda9ed57d729:Source/Core/Protected.swift:55 | it is the lock (`os_unfair_lock_t`) | yes, `Mutex`/`OSAllocatedUnfairLock` if the OS floor allows |
| 17 | `sourcekitd_api_values` ext, sourcekit-lsp@c6ce93d5f8aa:Sources/SourceKitD/SourceKitD.swift:22 | retroactive conformance on an imported C struct | no |
| 18 | `AccountUserDefaults`, element-x-ios@14e33866ced2:ElementX/Sources/Application/Settings/Storage/AccountUserDefaults.swift:14 | immutable `let`s of a non-`Sendable` protocol type | yes, make the protocol `Sendable` (read) |
| 19 | `UnsafeTransfer` ext, grpc-swift-2@ac33066eb6ed:Sources/GRPCCore/Internal/Concurrency Primitives/UnsafeTransfer.swift:30 | none; transfer wrapper | partly, `sending` |
| 20 | `Transaction`, async-http-client@017115279d09:Sources/AsyncHTTPClient/AsyncAwait/Transaction.swift:27 | `NIOLockedValueBox<StateMachine>` + immutable lets | no (state machine holds non-Sendable) |
| 21 | `NavigationID`, swift-composable-architecture@bc2db5ba8ad3:Sources/ComposableArchitecture/Internal/NavigationID.swift:41 | immutable; holds `AnyHashable`, `Any.Type`, `AnyKeyPath` | no (type-erased) |
| 22 | `JSON.Number`, rules_swift@50450ed24dde:tools/test_observer/JSON.swift:39 | immutable `NSNumber` | yes, `enum Number: Sendable {int, double}` (c) |
| 23 | `ImageContainer.Container`, Nuke@d5548dd61395:Sources/Nuke/ImageContainer.swift:147 | none; copy-on-write via `isKnownUniquelyReferenced` | yes, struct storage (read) |
| 24 | `LockedValueBox` ext, swift-service-lifecycle@c55297914e26:Sources/ConcurrencyHelpers/LockedValueBox.swift:54 | it is the lock | yes, `Mutex` (c) |
| 25 | `DependencyObject`, swift-dependencies@b476cc576105:Sources/Dependencies/WithDependencies.swift:632 | `weak var object: AnyObject?` | no (c: `weak let object: AnyObject?` still fails, `AnyObject` is not `Sendable`) |

Tally: guarded by a lock/queue/actor/confinement 8 (NSLock 1, DispatchQueue 1, NIOLockedValueBox 1, the lock itself 2, event-loop 1, actor 1, C stream lock 1); immutable-only 9; transfer boxes 3; conditional generic 1; C type 1; nothing 3 (#14, #23, #25 - only #14 and #23 are truly unguarded and fixable). Avoidable: 12 of 25 (48%); replaceable by `Mutex` specifically: 4 of 25 (#5, #13, #16, #24); by `sending`: 3. Not one of the 25 used `Mutex`, an OSAllocatedUnfairLock or an atomic as its guard. H2's "most uses are avoidable with Mutex, sending, or actor isolation" holds for about half, and the compiler refuses the swift-build and `weak` cases outright. Sample limit: n=25, one per repo, so swift-build's 237 are represented once.

## Axis 2 - Isolation (H8)

Commands: same scan; `@MainActor` kind from `extra.py::mainactor_kind` (text after the attribute: type keyword, member keyword, function-type position, or top-level declaration). `isolated param` column shows `isolation: isolated (any Actor)?` declarations then `#isolation` defaults. Default MainActor from manifests (`pkgs.py`) and `SWIFT_DEFAULT_ACTOR_ISOLATION` in `*.pbxproj` / `target.yml`.

| group | repo | LOC | actor | @globalActor | @MainActor: type / member / fn-type / global | nonisolated | nonisolated(nonsending) | `isolation: isolated` + `#isolation` | @concurrent | sending | default MainActor |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| core | swift-log | 2475 | 0 | 0 | 0 / 0 / 0 / 0 | 0 | 8 | 0 + 0 | 0 | 0 |  |
| core | swift-argument-parser | 11792 | 0 | 0 | 0 / 0 / 0 / 0 | 0 | 0 | 0 + 0 | 0 | 0 |  |
| core | swift-async-algorithms | 12772 | 0 | 0 | 0 / 0 / 0 / 0 | 0 | 3 | 9 + 10 | 0 | 71 |  |
| core | swift-collections | 52479 | 0 | 0 | 0 / 0 / 0 / 0 | 0 | 0 | 0 + 0 | 0 | 0 |  |
| core | swift-nio | 76074 | 0 | 0 | 0 / 0 / 0 / 0 | 0 | 2 | 3 + 7 | 0 | 11 |  |
| core | swift-system | 8382 | 0 | 0 | 0 / 0 / 0 / 0 | 0 | 0 | 0 + 0 | 0 | 0 |  |
| core | swift-openapi-generator | 10592 | 0 | 0 | 0 / 0 / 0 / 0 | 0 | 0 | 0 + 0 | 0 | 0 |  |
| core | swift-distributed-tracing | 2242 | 0 | 0 | 0 / 0 / 0 / 0 | 0 | 4 | 8 + 8 | 0 | 0 |  |
| core | swift-crypto | 18917 | 0 | 0 | 0 / 0 / 0 / 0 | 0 | 0 | 0 + 0 | 0 | 0 |  |
| core | swift-protobuf | 20266 | 0 | 0 | 0 / 0 / 0 / 0 | 1 | 0 | 0 + 0 | 0 | 0 |  |
| core | swift-foundation | 104197 | 0 | 0 | 0 / 8 / 4 / 0 | 0 | 0 | 0 + 0 | 0 | 12 |  |
| swiftlang-tools | swift-format | 12684 | 0 | 0 | 0 / 0 / 0 / 0 | 0 | 0 | 0 + 0 | 0 | 0 |  |
| swiftlang-tools | swift-testing | 20765 | 1 | 0 | 0 / 0 / 0 / 0 | 1 | 26 | 14 + 14 | 0 | 14 |  |
| swiftlang-tools | swift-syntax | 66395 | 0 | 0 | 0 / 1 / 0 / 0 | 3 | 0 | 0 + 0 | 0 | 2 |  |
| swiftlang-tools | swiftly | 6811 | 0 | 0 | 0 / 0 / 0 / 0 | 0 | 0 | 0 + 0 | 0 | 0 |  |
| swiftlang-tools | sourcekit-lsp | 41969 | 38 | 0 | 1 / 31 / 1 / 5 | 73 | 0 | 4 + 0 | 0 | 1 |  |
| swiftlang-tools | swift-package-manager | 106051 | 22 | 0 | 0 / 0 / 0 / 0 | 1 | 0 | 0 + 0 | 0 | 5 |  |
| swiftlang-tools | swift-build | 115280 | 11 | 1 | 0 / 0 / 0 / 0 | 25 | 8 | 0 + 1 | 0 | 11 |  |
| server | async-http-client | 14094 | 1 | 0 | 0 / 0 / 0 / 0 | 2 | 0 | 2 + 2 | 0 | 2 |  |
| server | swift-service-lifecycle | 1871 | 2 | 0 | 0 / 0 / 0 / 0 | 0 | 0 | 2 + 2 | 0 | 0 |  |
| server | grpc-swift-2 | 12531 | 0 | 0 | 0 / 0 / 0 / 0 | 0 | 0 | 4 + 4 | 0 | 0 |  |
| server | vapor | 13580 | 5 | 0 | 0 / 0 / 0 / 0 | 0 | 0 | 0 + 0 | 3 | 5 |  |
| server | hummingbird | 11547 | 2 | 0 | 0 / 0 / 0 / 0 | 5 | 0 | 2 + 2 | 0 | 0 |  |
| server | swift-aws-lambda-runtime | 7131 | 1 | 0 | 0 / 0 / 0 / 0 | 4 | 0 | 0 + 0 | 0 | 16 |  |
| community | swift-dependencies | 3439 | 0 | 0 | 0 / 0 / 5 / 0 | 0 | 0 | 3 + 3 | 0 | 0 |  |
| community | swift-snapshot-testing | 6377 | 0 | 0 | 0 / 0 / 0 / 0 | 0 | 0 | 0 + 0 | 0 | 0 |  |
| community | swift-composable-architecture | 14291 | 0 | 0 | 11 / 84 / 18 / 0 | 4 | 0 | 2 + 2 | 0 | 2 |  |
| community | Alamofire | 9456 | 0 | 0 | 0 / 0 / 0 / 0 | 0 | 0 | 0 + 0 | 0 | 3 |  |
| community | Nuke | 10471 | 3 | 1 | 19 / 2 / 38 / 7 | 71 | 0 | 0 + 0 | 1 | 0 |  |
| tools | SwiftLint | 61414 | 3 | 0 | 0 / 1 / 0 / 0 | 0 | 0 | 0 + 0 | 0 | 0 |  |
| tools | SwiftFormat | 34381 | 0 | 0 | 0 / 0 / 0 / 0 | 0 | 0 | 0 + 0 | 0 | 0 |  |
| tools | tuist | 136317 | 13 | 0 | 3 / 23 / 0 / 0 | 8 | 0 | 0 + 0 | 0 | 0 |  |
| apps | IceCubesApp | 37113 | 5 | 0 | 181 / 23 / 15 / 0 | 23 | 0 | 0 + 0 | 0 | 0 | Xcode: 4 build configs; 9/13 local packages |
| apps | element-x-ios | 98239 | 4 | 1 | 7 / 31 / 84 / 0 | 446 | 0 | 0 + 10 | 8 | 2 | Xcode: app, UnitTests, PreviewTests, 2 MapLibre; compound-ios pkg |
| platforms | rules_swift | 1817 | 0 | 0 | 2 / 1 / 0 / 0 | 0 | 0 | 0 + 0 | 0 | 0 |  |
| platforms | JavaScriptKit | 26666 | 0 | 0 | 0 / 0 / 0 / 0 | 0 | 0 | 4 + 4 | 0 | 25 |  |
| platforms | swift-embedded-examples | 8663 | 0 | 0 | 0 / 0 / 0 / 0 | 0 | 0 | 0 + 0 | 0 | 0 |  |
| oci | containerization | 35525 | 12 | 0 | 0 / 0 / 0 / 0 | 2 | 0 | 0 + 0 | 0 | 7 |  |
| oci | container | 29302 | 28 | 0 | 0 / 0 / 0 / 0 | 22 | 0 | 0 + 0 | 0 | 0 |  |
| oci | swift-container-plugin | 2525 | 0 | 0 | 0 / 0 / 0 / 0 | 0 | 0 | 0 + 0 | 0 | 0 |  |
| **total** | 40 repos | 1266893 | **151** | **3** | **224 / 205 / 165 / 12** | **691** | **51** | **57** + **69** | **12** | **189** | |

| group | LOC | actor | @MainActor | nonisolated | nonisolated(nonsending) | isolation: isolated | sending |
|---|---:|---:|---:|---:|---:|---:|---:|
| core | 320188 | 0 (0.0) | 12 (0.4) | 1 (0.0) | 17 (0.5) | 20 (0.6) | 94 (2.9) |
| swiftlang-tools | 369955 | 72 (1.9) | 39 (1.1) | 103 (2.8) | 34 (0.9) | 18 (0.5) | 33 (0.9) |
| server | 60754 | 11 (1.8) | 0 (0.0) | 11 (1.8) | 0 (0.0) | 10 (1.6) | 23 (3.8) |
| community | 44034 | 3 (0.7) | 184 (41.8) | 75 (17.0) | 0 (0.0) | 5 (1.1) | 5 (1.1) |
| tools | 232112 | 16 (0.7) | 27 (1.2) | 8 (0.3) | 0 (0.0) | 0 (0.0) | 0 (0.0) |
| apps | 135352 | 9 (0.7) | 349 (25.8) | 469 (34.7) | 0 (0.0) | 0 (0.0) | 2 (0.1) |
| platforms | 37146 | 0 (0.0) | 3 (0.8) | 0 (0.0) | 0 (0.0) | 4 (1.1) | 25 (6.7) |
| oci | 67352 | 40 (5.9) | 0 (0.0) | 24 (3.6) | 0 (0.0) | 0 (0.0) | 7 (1.0) |

Findings.

- Actors are server/tooling constructs, not app constructs: 151 `actor` declarations, 58% of them in three repos (sourcekit-lsp 38, container 28, SwiftPM 22). Both SwiftUI apps have 4-5 each; element-x-ios's own doc says `actor` types are rare (AGENTS.md:289) and the count (4) agrees.
- `@globalActor`: only 3 in 40 repos - swift-build `PluginExtensionSystemActor` (SWBUtil/PluginManager.swift:15), Nuke `ImagePipelineActor` (Sources/Nuke/Pipeline/ImagePipelineActor.swift:14), element `NotificationToneManager.swift:14`. A global actor other than MainActor is a niche tool.
- `@MainActor` clusters in UI code (TCA 113, IceCubes 219, element 122, Nuke 66) and is absent from 29 repos. Its form differs by default isolation: under `SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor`, element-x-ios has 446 `nonisolated` opt-outs and only 7 `@MainActor` on types; IceCubes (also default-MainActor) still annotates 181 types, i.e. redundant under its own setting.
- Default MainActor isolation (H8): IceCubes sets it in the Xcode project (IceCubesApp.xcodeproj/project.pbxproj:731-734, four configurations, with `SWIFT_APPROACHABLE_CONCURRENCY = YES`, `SWIFT_VERSION = 6.0`) AND in 9 of its 13 local packages (`.defaultIsolation(MainActor.self)`, e.g. Dimillian/IceCubesApp@2ad6e6891258:Packages/Timeline/Package.swift:42); element-x-ios sets it in `ElementX/SupportingFiles/target.yml:152-154`, generated `ElementX.xcodeproj/project.pbxproj:10193`, and in the `compound-ios` package (`compound-ios/Package.swift:27,40`). No published library sets it. swift-protobuf ships a compile test that generated code survives a consumer's default MainActor: swift-protobuf@6c84c3dedac0:CompileTests/NonisolatedDeclarations/Package.swift:25 (generator option `NonisolatedDeclarations=true`).
- Approachable-concurrency spellings (6.2): `nonisolated(nonsending)` appears 51 times in 6 repos (swift-testing 26, swift-log 8, swift-build 8, distributed-tracing 4, async-algorithms 3, nio 2), always on library API that takes closures, e.g. swift-log@4038b6a4f74a:Sources/Logging/Logger+With.swift:98, swift-nio@e12881f2a691:Sources/NIOCore/AsyncAwaitSupport.swift:28; `@concurrent` 12 in 3 repos (Nuke@d5548dd61395:Sources/Nuke/Internal/Extensions.swift:67, element-x-ios@14e33866ced2:ElementX/Sources/Other/Extensions/NSItemProvider.swift:110, vapor@bf77fc69b142:Sources/Vapor/Utilities/FileETagHashCache.swift:59); `isolated deinit` 5 (element-x-ios@14e33866ced2:ElementX/Sources/Services/Presence/PresenceService.swift:38, IceCubesApp@2ad6e6891258:Packages/MediaUI/Sources/MediaUI/MediaUIAttachmentVideoView.swift:83); isolated conformances `extension X: @MainActor P` 7 (IceCubesApp@2ad6e6891258:Packages/Account/Sources/Account/Detail/Tabs/BoostsTab.swift:31). All four are single-digit-percent idioms; libraries lead on `nonsending`, apps on `isolated deinit`/isolated conformances.
- The isolated-parameter idiom `isolation: isolated (any Actor)? = #isolation` is the standard generic-async-helper signature: 57 declarations in 12 repos (swift-nio@e12881f2a691:Sources/NIOPosix/StructuredConcurrencyHelpers.swift:34, async-http-client@017115279d09:Sources/AsyncHTTPClient/StructuredConcurrencyHelpers.swift:21, swift-testing@c7d68ca20cd7:Sources/Testing/Expectations/ExpectationChecking+Macro.swift:1004, distributed-tracing 8).
- `sending`: 189 uses in 16 repos, concentrated in async-algorithms (71, e.g. `AsyncShareSequence.swift:192` `() -> sending Base.AsyncIterator`), JavaScriptKit 25, lambda-runtime 16, foundation 12. Mostly return/closure positions in library internals.

## Axis 3 - Tasks and cancellation

Commands: `extra.py` (refined `Task {`, `Task(priority:/name:) {`, `Task.detached/immediate` with the prefix filter), `tasks2.py` (bare vs stored classification by the text left of `Task`), `run_scan.py` (the rest). "bare / stored" = unstructured `Task {` not assigned / assigned-or-returned-or-argument. Async files = files containing `async` not preceded by `.`; coop = file contains `Task.isCancelled`, `Task.checkCancellation` or `withTaskCancellationHandler`.

| group | repo | LOC | Task{} bare / stored | Task.detached | TaskGroup (+discarding) | async let | Task.isCancelled / checkCancellation / handler | `.cancel()` | async files: coop-cancel / any | sleep(for:) / (nanoseconds:) / (until:) | Clock refs (Continuous/Suspending/generic/@Dependency) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| core | swift-log | 2475 | 0 / 0 | 0 | 0 (+0) | 0 | 0 / 0 / 0 | 0 | 0 of 2 / 0 | 0 / 0 / 0 | 0/0/0/0 |
| core | swift-argument-parser | 11792 | 0 / 0 | 0 | 0 (+0) | 0 | 0 / 0 / 0 | 0 | 0 of 5 / 0 | 0 / 0 / 0 | 0/0/0/0 |
| core | swift-async-algorithms | 12772 | 0 / 9 | 2 | 4 (+0) | 0 | 1 / 1 / 20 | 42 | 18 of 61 / 8 | 0 / 0 / 3 | 3/3/23/0 |
| core | swift-collections | 52479 | 0 / 0 | 0 | 0 (+0) | 0 | 0 / 0 / 0 | 0 | 0 of 0 / 0 | 0 / 0 / 0 | 0/0/0/0 |
| core | swift-nio | 76074 | 5 / 2 | 0 | 6 (+2) | 0 | 0 / 6 / 9 | 21 | 10 of 70 / 1 | 1 / 0 / 0 | 1/0/0/0 |
| core | swift-system | 8382 | 0 / 0 | 0 | 0 (+0) | 0 | 0 / 0 / 0 | 0 | 0 of 0 / 0 | 0 / 0 / 0 | 0/0/0/0 |
| core | swift-openapi-generator | 10592 | 0 / 0 | 0 | 1 (+0) | 0 | 0 / 0 / 0 | 0 | 0 of 10 / 0 | 0 / 0 / 0 | 0/0/0/0 |
| core | swift-distributed-tracing | 2242 | 0 / 0 | 0 | 0 (+0) | 0 | 0 / 0 / 0 | 0 | 0 of 5 / 0 | 0 / 0 / 0 | 0/0/0/0 |
| core | swift-crypto | 18917 | 0 / 0 | 0 | 0 (+0) | 0 | 0 / 0 / 0 | 0 | 0 of 0 / 0 | 0 / 0 / 0 | 0/0/0/0 |
| core | swift-protobuf | 20266 | 1 / 0 | 0 | 0 (+0) | 0 | 0 / 0 / 0 | 0 | 0 of 2 / 0 | 0 / 0 / 0 | 0/0/0/0 |
| core | swift-foundation | 104197 | 0 / 0 | 1 | 0 (+1) | 0 | 0 / 0 / 2 | 1 | 2 of 3 / 1 | 0 / 0 / 0 | 0/0/2/0 |
| swiftlang-tools | swift-format | 12684 | 0 / 0 | 0 | 0 (+0) | 0 | 0 / 0 / 0 | 0 | 0 of 2 / 0 | 0 / 0 / 0 | 0/0/0/0 |
| swiftlang-tools | swift-testing | 20765 | 0 / 1 | 0 | 5 (+0) | 0 | 2 / 4 / 1 | 3 | 4 of 31 / 1 | 4 / 0 / 0 | 0/7/0/0 |
| swiftlang-tools | swift-syntax | 66395 | 0 / 0 | 0 | 1 (+0) | 0 | 0 / 0 / 0 | 0 | 0 of 6 / 0 | 0 / 0 / 0 | 0/0/0/0 |
| swiftlang-tools | swiftly | 6811 | 0 / 0 | 0 | 0 (+0) | 0 | 0 / 0 / 0 | 0 | 0 of 29 / 0 | 1 / 0 / 0 | 0/0/0/0 |
| swiftlang-tools | sourcekit-lsp | 41969 | 18 / 23 | 8 | 1 (+0) | 19 | 25 / 25 / 5 | 15 | 23 of 106 / 7 | 8 / 0 / 1 | 6/0/0/0 |
| swiftlang-tools | swift-package-manager | 106051 | 5 / 8 | 0 | 17 (+0) | 13 | 3 / 4 / 3 | 7 | 6 of 166 / 6 | 0 / 1 / 0 | 11/0/3/0 |
| swiftlang-tools | swift-build | 115280 | 5 / 2 | 4 | 16 (+0) | 3 | 17 / 4 / 6 | 24 | 12 of 276 / 7 | 2 / 0 / 0 | 7/1/2/0 |
| server | async-http-client | 14094 | 5 / 0 | 0 | 0 (+0) | 0 | 0 / 0 / 1 | 21 | 1 of 12 / 1 | 0 / 0 / 0 | 0/0/0/0 |
| server | swift-service-lifecycle | 1871 | 2 / 1 | 0 | 2 (+0) | 0 | 0 / 0 / 5 | 4 | 4 of 9 / 2 | 2 / 0 / 0 | 0/0/0/0 |
| server | grpc-swift-2 | 12531 | 0 / 0 | 0 | 10 (+3) | 0 | 1 / 2 / 3 | 8 | 5 of 36 / 3 | 2 / 0 / 5 | 11/0/0/0 |
| server | vapor | 13580 | 3 / 2 | 0 | 2 (+1) | 0 | 0 / 0 / 1 | 2 | 1 of 64 / 2 | 1 / 1 / 0 | 1/0/0/0 |
| server | hummingbird | 11547 | 1 / 0 | 0 | 7 (+2) | 0 | 0 / 0 / 2 | 6 | 2 of 57 / 0 | 1 / 0 / 0 | 3/0/2/0 |
| server | swift-aws-lambda-runtime | 7131 | 1 / 0 | 1 | 2 (+1) | 0 | 2 / 1 / 2 | 0 | 3 of 33 / 0 | 2 / 0 / 0 | 1/0/1/0 |
| community | swift-dependencies | 3439 | 3 / 5 | 0 | 0 (+0) | 0 | 0 / 0 / 0 | 3 | 0 of 4 / 2 | 0 / 0 / 0 | 1/1/6/0 |
| community | swift-snapshot-testing | 6377 | 0 / 0 | 0 | 0 (+0) | 0 | 0 / 0 / 0 | 0 | 0 of 3 / 0 | 0 / 0 / 0 | 0/0/0/0 |
| community | swift-composable-architecture | 14291 | 5 / 6 | 1 | 2 (+0) | 0 | 6 / 1 / 4 | 17 | 3 of 6 / 4 | 1 / 0 / 0 | 2/0/0/0 |
| community | Alamofire | 9456 | 2 / 2 | 0 | 0 (+0) | 0 | 2 / 0 / 4 | 25 | 1 of 1 / 1 | 0 / 0 / 0 | 0/0/0/0 |
| community | Nuke | 10471 | 20 / 7 | 0 | 0 (+0) | 0 | 3 / 0 / 1 | 29 | 2 of 15 / 4 | 1 / 1 / 0 | 13/0/0/0 |
| tools | SwiftLint | 61414 | 0 / 0 | 0 | 0 (+0) | 0 | 0 / 0 / 0 | 1 | 0 of 10 / 0 | 0 / 0 / 0 | 0/0/0/0 |
| tools | SwiftFormat | 34381 | 0 / 0 | 0 | 0 (+0) | 0 | 0 / 0 / 0 | 0 | 0 of 0 / 0 | 0 / 0 / 0 | 0/0/0/0 |
| tools | tuist | 136317 | 32 / 17 | 9 | 19 (+0) | 12 | 25 / 3 / 3 | 16 | 12 of 668 / 11 | 20 / 9 / 0 | 15/0/14/0 |
| apps | IceCubesApp | 37113 | 170 / 16 | 0 | 9 (+0) | 9 | 12 / 1 / 0 | 17 | 7 of 95 / 5 | 21 / 3 / 0 | 0/0/0/0 |
| apps | element-x-ios | 98239 | 416 / 53 | 5 | 11 (+0) | 7 | 39 / 0 / 0 | 42 | 21 of 199 / 14 | 39 / 0 / 0 | 1/0/1/0 |
| platforms | rules_swift | 1817 | 0 / 0 | 0 | 0 (+0) | 0 | 0 / 0 / 0 | 0 | 0 of 4 / 0 | 0 / 0 / 0 | 0/0/0/0 |
| platforms | JavaScriptKit | 26666 | 5 / 0 | 0 | 0 (+0) | 0 | 0 / 0 / 0 | 6 | 0 of 10 / 0 | 1 / 0 / 0 | 4/2/2/0 |
| platforms | swift-embedded-examples | 8663 | 0 / 0 | 0 | 0 (+0) | 0 | 0 / 0 / 0 | 0 | 0 of 0 / 0 | 0 / 0 / 0 | 0/0/0/0 |
| oci | containerization | 35525 | 2 / 9 | 3 | 12 (+0) | 0 | 3 / 5 / 0 | 20 | 4 of 78 / 6 | 10 / 2 / 0 | 10/0/0/0 |
| oci | container | 29302 | 8 / 10 | 0 | 15 (+2) | 3 | 1 / 13 / 0 | 12 | 4 of 163 / 5 | 15 / 1 / 0 | 0/0/0/0 |
| oci | swift-container-plugin | 2525 | 0 / 0 | 0 | 1 (+0) | 0 | 0 / 0 / 0 | 0 | 0 of 16 / 0 | 0 / 0 / 0 | 0/0/0/0 |
| **total** | 40 repos | 1266893 | **709 / 173** | **34** | **143** (+12) | **66** | **142 / 70 / 72** | **342** | **145 of 2257** / 91 | **132 / 18 / 9** | 90/14/56/0 |

Findings.

- Unstructured creation is an app idiom: 709 of 882 `Task {}` are bare statements (80%), but 586 of those 709 are in two apps (element-x-ios 416, IceCubes 170), typically UI event handlers: element-x-ios@14e33866ced2:ElementX/Sources/Screens/JoinRoomScreen/JoinRoomScreenViewModel.swift:413 (`{ Task { await self.declineInvite() } }`). Excluding both apps, 123 of 227 creations (54%) are bare and 104 stored.
- Stored handles (173 incl. `return`/argument forms; 159 with a recoverable name): 88 of 159 are cancelled by the same name in the same file (55%). Sample of 20 (`tasks2.py`, 2 per repo, seed 11): 14 cancelled by name (e.g. IceCubesApp@2ad6e6891258:Packages/Env/Sources/Env/StreamWatcher.swift:173, Nuke@d5548dd61395:Sources/Nuke/Pipeline/TaskQueue.swift:174, swift-async-algorithms@cbde9aed744b:Sources/AsyncAlgorithms/Debounce/DebounceStorage.swift:141); of the 6 not cancelled by name, 2 are awaited immediately (vapor@bf77fc69b142:Sources/Vapor/HTTP/EndpointCache.swift:64-67 `try await newRequest.value`; swift-package-manager@5546f44a3b52:Sources/PackageRegistry/RegistryDownloadsManager.swift:75), 1 is tracked in a dictionary and removed in a `defer` (containerization vminitd VsockProxy.swift:162), 1 polls `Task.isCancelled` (element-x-ios@14e33866ced2:ElementX/Sources/Screens/FilePreviewScreen/View/TimelineMediaPreviewController.swift:316; its cancel site is not in the file), 2 genuinely have no visible cancel (sourcekit-lsp@c6ce93d5f8aa:Sources/SourceKitLSP/Workspace.swift:253, BuildServerManager.swift:706). Name-matching under-counts cancellation; treat 55% as a floor.
- `Task.detached` is rare (34, 9 repos; tuist 9, sourcekit-lsp 8, element 5, swift-build 4) and mostly for priority/isolation escape: sourcekit-lsp@c6ce93d5f8aa:Sources/SourceKitD/SourceKitDCore.swift:82 (`.background`), element-x-ios@14e33866ced2:ElementX/Sources/Services/Timeline/TimelineController/TimelineController.swift:531, swift-composable-architecture@bc2db5ba8ad3:Sources/ComposableArchitecture/TestStore.swift:1856. `Task.immediate` (6.2): 0 uses.
- Cancellation awareness is low: 145 of 2,257 async-containing files (6.4%) contain any cooperative cancellation primitive; 91 contain a `.cancel()`. Best: swift-async-algorithms 29.5% of async files (18 of 61), sourcekit-lsp 21.7% (23 of 106), swift-nio 14.3%; worst of the large: tuist 1.8% (12 of 668), vapor 1.6% (1 of 64), container 2.5% (4 of 163), swift-build 4.3%. Server frameworks lean on structured groups and cancellation handlers (17 repos use `withTaskCancellationHandler`, e.g. swift-service-lifecycle@c55297914e26:Sources/UnixSignals/UnixSignalsSequence.swift:151).
- Structured concurrency is used where lifetimes matter: `withTaskGroup`/`withThrowingTaskGroup` 143, discarding groups 12 (hummingbird@1bd3b407fb47:Sources/HummingbirdCore/Server/Server.swift:117, grpc-swift-2@ac33066eb6ed:Sources/GRPCInProcessTransport/InProcessTransport+Server.swift:123), `async let` 66 (sourcekit-lsp 19, SwiftPM 13).
- Sleep: `Task.sleep(for:)` 132 (18 repos; element 39, IceCubes 21, tuist 20) vs `Task.sleep(nanoseconds:)` 18 (7 repos; tuist 9; IceCubesApp@2ad6e6891258:Packages/DesignSystem/Sources/DesignSystem/Views/AccountPopoverView.swift:84, Nuke@d5548dd61395:Sources/Nuke/Internal/RateLimiter.swift:55, swift-package-manager@5546f44a3b52:Sources/Basics/HTTPClient/HTTPClient.swift:180, tuist@2f6ac74754bf:swifterpm/Sources/swifterpm/Support.swift:278, vapor@bf77fc69b142:Sources/Development/routes.swift:32); `sleep(until:)` 9. The `Duration` form dominates (88%).
- Clock injection exists but is a minority practice: concrete `ContinuousClock` 90 refs, `SuspendingClock` 14, generic `C: Clock` / `any Clock<Duration>` 56 (hummingbird@1bd3b407fb47:Sources/Hummingbird/Storage/MemoryPersistDriver.swift:16 `actor MemoryPersistDriver<C: Clock>`; swift-async-algorithms@cbde9aed744b:Sources/AsyncAlgorithms/Debounce/AsyncDebounceSequence.swift:39; swift-dependencies@b476cc576105:Sources/Dependencies/DependencyValues/Clocks.swift:80 `any Clock<Duration>`). `@Dependency(\.continuousClock)` key-path use: 0 in non-test code.

## Axis 4 - Legacy concurrency still present

Commands: same scans; "callback params" from `extra.py` (`completion|handler|callback|reply...: (...) -> Void` without `async`); blocking waits from `sem.py` (each hit's enclosing `func` checked for `async`).

| group | repo | LOC | DispatchQueue | Group / Semaphore | blocking wait() | OperationQueue | completion-callback params | import Combine files | check-ed / unsafe continuation | Thread create / isMainThread | NotificationCenter | `MainActor.run` | `DispatchQueue.main.async` |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| core | swift-log | 2475 | 0 | 0 / 0 | 0 | 0 | 0 | 0 | 0 / 0 | 0 / 0 | 0 | 0 | 0 |
| core | swift-argument-parser | 11792 | 0 | 0 / 0 | 0 | 0 | 0 | 0 | 0 / 0 | 0 / 0 | 0 | 0 | 0 |
| core | swift-async-algorithms | 12772 | 0 | 0 / 0 | 0 | 0 | 8 | 0 | 0 / 35 | 0 / 0 | 0 | 0 | 0 |
| core | swift-collections | 52479 | 0 | 0 / 0 | 0 | 0 | 2 | 0 | 0 / 0 | 0 / 0 | 0 | 0 | 0 |
| core | swift-nio | 76074 | 27 | 8 / 6 | 3 | 0 | 27 | 0 | 17 / 3 | 0 / 0 | 0 | 0 | 0 |
| core | swift-system | 8382 | 0 | 0 / 0 | 0 | 0 | 0 | 0 | 0 / 0 | 0 / 0 | 0 | 0 | 0 |
| core | swift-openapi-generator | 10592 | 0 | 0 / 0 | 0 | 0 | 0 | 0 | 0 / 0 | 0 / 0 | 0 | 0 | 0 |
| core | swift-distributed-tracing | 2242 | 0 | 0 / 0 | 0 | 0 | 1 | 0 | 0 / 0 | 0 / 0 | 0 | 0 | 0 |
| core | swift-crypto | 18917 | 0 | 0 / 0 | 0 | 0 | 7 | 0 | 0 / 0 | 0 / 0 | 0 | 0 | 0 |
| core | swift-protobuf | 20266 | 1 | 0 / 1 | 1 | 0 | 0 | 0 | 0 / 0 | 0 / 0 | 0 | 0 | 0 |
| core | swift-foundation | 104197 | 0 | 0 / 0 | 0 | 0 | 0 | 1 | 0 / 2 | 0 / 0 | 43 | 0 | 0 |
| swiftlang-tools | swift-format | 12684 | 2 | 0 / 0 | 0 | 0 | 0 | 0 | 0 / 0 | 0 / 0 | 0 | 0 | 0 |
| swiftlang-tools | swift-testing | 20765 | 0 | 0 / 0 | 0 | 1 | 0 | 2 | 2 / 0 | 0 / 0 | 0 | 0 | 0 |
| swiftlang-tools | swift-syntax | 66395 | 0 | 2 / 1 | 1 | 0 | 0 | 0 | 0 / 0 | 0 / 0 | 0 | 0 | 0 |
| swiftlang-tools | swiftly | 6811 | 0 | 0 / 0 | 0 | 0 | 0 | 0 | 0 / 0 | 0 / 0 | 0 | 0 | 0 |
| swiftlang-tools | sourcekit-lsp | 41969 | 7 | 0 / 0 | 0 | 0 | 15 | 0 | 6 / 0 | 0 / 0 | 0 | 0 | 0 |
| swiftlang-tools | swift-package-manager | 106051 | 87 | 11 / 6 | 7 | 5 | 79 | 0 | 30 / 0 | 1 / 0 | 0 | 0 | 0 |
| swiftlang-tools | swift-build | 115280 | 5 | 2 / 2 | 3 | 0 | 10 | 0 | 24 / 0 | 1 / 1 | 0 | 0 | 0 |
| server | async-http-client | 14094 | 5 | 0 / 0 | 0 | 0 | 1 | 0 | 3 / 0 | 0 / 0 | 0 | 0 | 0 |
| server | swift-service-lifecycle | 1871 | 1 | 0 / 0 | 0 | 0 | 6 | 0 | 2 / 0 | 0 / 0 | 0 | 0 | 0 |
| server | grpc-swift-2 | 12531 | 0 | 0 / 0 | 0 | 0 | 4 | 0 | 3 / 0 | 0 / 0 | 0 | 0 | 0 |
| server | vapor | 13580 | 0 | 0 / 0 | 0 | 0 | 1 | 0 | 3 / 0 | 0 / 0 | 0 | 0 | 0 |
| server | hummingbird | 11547 | 1 | 0 / 0 | 0 | 0 | 0 | 0 | 2 / 0 | 0 / 0 | 0 | 0 | 0 |
| server | swift-aws-lambda-runtime | 7131 | 1 | 1 / 0 | 0 | 0 | 0 | 0 | 8 / 0 | 0 / 0 | 0 | 0 | 0 |
| community | swift-dependencies | 3439 | 5 | 0 / 0 | 0 | 0 | 0 | 2 | 0 / 0 | 0 / 1 | 4 | 0 | 0 |
| community | swift-snapshot-testing | 6377 | 2 | 0 / 0 | 0 | 0 | 1 | 0 | 0 / 0 | 0 / 1 | 0 | 0 | 1 |
| community | swift-composable-architecture | 14291 | 7 | 0 / 0 | 0 | 0 | 0 | 14 | 0 / 1 | 0 / 3 | 0 | 0 | 1 |
| community | Alamofire | 9456 | 126 | 0 / 0 | 0 | 3 | 87 | 2 | 3 / 0 | 0 / 0 | 9 | 0 | 0 |
| community | Nuke | 10471 | 4 | 0 / 0 | 0 | 1 | 27 | 3 | 1 / 2 | 0 / 4 | 8 | 0 | 3 |
| tools | SwiftLint | 61414 | 7 | 4 / 0 | 2 | 0 | 0 | 0 | 0 / 0 | 0 / 0 | 0 | 0 | 0 |
| tools | SwiftFormat | 34381 | 6 | 2 / 0 | 2 | 0 | 4 | 0 | 0 / 0 | 0 / 0 | 4 | 0 | 0 |
| tools | tuist | 136317 | 11 | 0 / 1 | 1 | 0 | 2 | 5 | 9 / 0 | 0 / 0 | 0 | 5 | 1 |
| apps | IceCubesApp | 37113 | 27 | 0 / 0 | 0 | 0 | 2 | 24 | 9 / 0 | 0 / 0 | 19 | 10 | 23 |
| apps | element-x-ios | 98239 | 190 | 0 / 0 | 0 | 0 | 23 | 387 | 16 / 0 | 0 / 0 | 28 | 8 | 47 |
| platforms | rules_swift | 1817 | 0 | 0 / 0 | 0 | 0 | 0 | 0 | 0 / 0 | 0 / 0 | 0 | 0 | 0 |
| platforms | JavaScriptKit | 26666 | 0 | 0 / 0 | 0 | 0 | 3 | 0 | 6 / 3 | 0 / 0 | 0 | 0 | 0 |
| platforms | swift-embedded-examples | 8663 | 0 | 0 / 0 | 0 | 0 | 1 | 0 | 0 / 0 | 0 / 0 | 0 | 0 | 0 |
| oci | containerization | 35525 | 22 | 0 / 0 | 0 | 0 | 4 | 0 | 16 / 0 | 0 / 0 | 0 | 0 | 0 |
| oci | container | 29302 | 6 | 0 / 0 | 0 | 0 | 7 | 0 | 4 / 0 | 0 / 0 | 0 | 0 | 0 |
| oci | swift-container-plugin | 2525 | 0 | 0 / 0 | 0 | 0 | 0 | 0 | 1 / 0 | 0 / 0 | 0 | 0 | 0 |
| **total** | 40 repos | 1266893 | **550** | **30 / 17** | **20** | **10** | **322** | **440** | **165 / 46** | **2 / 10** | **115** | **23** | **76** |

| group | LOC | DispatchQueue | completion params | import Combine | checked cont. | unsafe cont. | MainActor.run | DispatchQueue.main.async |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| core | 320188 | 28 (0.9) | 45 (1.4) | 1 (0.0) | 17 (0.5) | 40 (1.2) | 0 (0.0) | 0 (0.0) |
| swiftlang-tools | 369955 | 101 (2.7) | 104 (2.8) | 2 (0.1) | 62 (1.7) | 0 (0.0) | 0 (0.0) | 0 (0.0) |
| server | 60754 | 8 (1.3) | 12 (2.0) | 0 (0.0) | 21 (3.5) | 0 (0.0) | 0 (0.0) | 0 (0.0) |
| community | 44034 | 144 (32.7) | 115 (26.1) | 21 (4.8) | 4 (0.9) | 3 (0.7) | 0 (0.0) | 5 (1.1) |
| tools | 232112 | 24 (1.0) | 6 (0.3) | 5 (0.2) | 9 (0.4) | 0 (0.0) | 5 (0.2) | 1 (0.0) |
| apps | 135352 | 217 (16.0) | 25 (1.8) | 411 (30.4) | 25 (1.8) | 0 (0.0) | 18 (1.3) | 70 (5.2) |
| platforms | 37146 | 0 (0.0) | 4 (1.1) | 0 (0.0) | 6 (1.6) | 3 (0.8) | 0 (0.0) | 0 (0.0) |
| oci | 67352 | 28 (4.2) | 11 (1.6) | 0 (0.0) | 21 (3.1) | 0 (0.0) | 0 (0.0) | 0 (0.0) |

Findings.

- GCD is a community-library and app phenomenon: community 144 `DispatchQueue` (Alamofire 126 = 133/10k, the corpus maximum), apps 217, but core 28 and server 8. 18 repos have zero. `DispatchQueue.main.async` 76 (element 47, IceCubes 23) vs `MainActor.run` 23 - the exemplars do not use `MainActor.run` as a habit.
- Completion-handler APIs survive as compatibility surface: 322 callback-style params in 23 repos; Alamofire 87, SwiftPM 79, swift-nio 27, Nuke 27; core/server libraries keep them next to `async` twins. New code in apps has few (25 in apps).
- Combine: 440 files in 9 repos; element-x-ios 387 of them and 853 Combine-type references (`PassthroughSubject`, `.sink`, ...), IceCubes 24, TCA 14. Doc vs reality: Dimillian/IceCubesApp@2ad6e6891258:CLAUDE.md:144 ("Avoid Combine unless absolutely necessary") and :258 ("DON'T Use Combine for simple async operations") versus 24 `import Combine` files (6.5/10k) in StatusKit and others; the code is authoritative. `ObservableObject` 26 (tuist 10, element 9) vs `@Observable` 60 (IceCubes 43, element 11); `@Published` 35 (element 15, tuist 11).
- Continuations: `withChecked*` 165 in 20 repos, `withUnsafe*` 46 in 6 (async-algorithms 35, e.g. DuplexAsyncChannel.swift:353-354 pairs `withTaskCancellationHandler` with `withUnsafeThrowingContinuation`; swift-nio 3; JavaScriptKit 3; foundation 2; Nuke 2; TCA 1). Unsafe share 22%, driven by one repo.
- Blocking waits: 20 (`DispatchSemaphore.wait` 10, `DispatchGroup.wait` 10) in 8 repos (SwiftPM, swift-nio, tuist, swift-protobuf, swift-build, SwiftLint, SwiftFormat, swift-syntax), none inside an `async` function except via explicit bridges. The one async-to-sync bridge: swiftlang/swift-package-manager@5546f44a3b52:Sources/Basics/Concurrency/ConcurrencyHelpers.swift:28-40 `unsafe_await` (spawns `Task`, `semaphore.wait()`), annotated `@available(*, noasync, message: "This method blocks the current thread indefinitely...")`. swift-nio's `_syncShutdownGracefully` waits on a semaphore by design (Sources/NIOCore/EventLoop.swift:1536). The two `await group.wait(queue:)` in swift-build (CompilationCachingUploader.swift:189) are non-blocking async wrappers.
- Threads and queues: `Thread` creation 2 (swift-package-manager@5546f44a3b52:Sources/Basics/Concurrency/ConcurrencyHelpers.swift:73), `Thread.isMainThread` 10, `OperationQueue` 10 in 4 repos (Alamofire 3, SwiftPM 5), `pthread_*` non-mutex 102 mostly swift-nio/swift-foundation platform code. `NotificationCenter` 115 references, but `NotificationCenter.notifications(named:)` (async API): 0.

## Axis 5 - AsyncSequence

Commands: `extra.py` (constructions with buffering window, conformer parser over the inheritance clause), `final.py`.

| group | repo | LOC | AsyncStream ctor (closure) | makeStream | custom AsyncSequence / AsyncIteratorProtocol conformers | some/any AsyncSequence | `for await` | import AsyncAlgorithms |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| core | swift-log | 2475 | 0 | 0 | 0 / 0 | 0 | 0 | 0 |
| core | swift-argument-parser | 11792 | 0 | 0 | 0 / 0 | 0 | 0 | 0 |
| core | swift-async-algorithms | 12772 | 0 | 0 | 36 / 37 | 6 | 7 | 1 |
| core | swift-collections | 52479 | 0 | 0 | 0 / 0 | 0 | 0 | 0 |
| core | swift-nio | 76074 | 2 | 0 | 16 / 17 | 0 | 25 | 0 |
| core | swift-system | 8382 | 0 | 0 | 0 / 0 | 0 | 0 | 0 |
| core | swift-openapi-generator | 10592 | 0 | 0 | 0 / 0 | 0 | 0 | 0 |
| core | swift-distributed-tracing | 2242 | 0 | 0 | 0 / 0 | 0 | 0 | 0 |
| core | swift-crypto | 18917 | 0 | 0 | 0 / 0 | 0 | 0 | 0 |
| core | swift-protobuf | 20266 | 1 | 0 | 1 / 1 | 0 | 1 | 0 |
| core | swift-foundation | 104197 | 0 | 0 | 1 / 1 | 3 | 0 | 0 |
| swiftlang-tools | swift-format | 12684 | 0 | 0 | 0 / 0 | 0 | 0 | 0 |
| swiftlang-tools | swift-testing | 20765 | 0 | 0 | 0 / 0 | 0 | 0 | 0 |
| swiftlang-tools | swift-syntax | 66395 | 0 | 0 | 0 / 0 | 0 | 1 | 0 |
| swiftlang-tools | swiftly | 6811 | 0 | 0 | 0 / 0 | 0 | 4 | 0 |
| swiftlang-tools | sourcekit-lsp | 41969 | 1 | 0 | 0 / 0 | 0 | 1 | 0 |
| swiftlang-tools | swift-package-manager | 106051 | 0 | 2 | 3 / 3 | 0 | 9 | 0 |
| swiftlang-tools | swift-build | 115280 | 1 | 7 | 2 / 2 | 0 | 9 | 0 |
| server | async-http-client | 14094 | 0 | 0 | 6 / 5 | 0 | 0 | 0 |
| server | swift-service-lifecycle | 1871 | 3 | 2 | 4 / 4 | 0 | 4 | 2 |
| server | grpc-swift-2 | 12531 | 0 | 5 | 6 / 6 | 1 | 8 | 0 |
| server | vapor | 13580 | 1 | 0 | 1 / 1 | 0 | 6 | 0 |
| server | hummingbird | 11547 | 0 | 2 | 4 / 4 | 0 | 6 | 2 |
| server | swift-aws-lambda-runtime | 7131 | 0 | 0 | 1 / 1 | 0 | 4 | 0 |
| community | swift-dependencies | 3439 | 1 | 0 | 0 / 0 | 0 | 2 | 0 |
| community | swift-snapshot-testing | 6377 | 0 | 0 | 0 / 0 | 0 | 0 | 0 |
| community | swift-composable-architecture | 14291 | 2 | 1 | 0 / 0 | 0 | 2 | 0 |
| community | Alamofire | 9456 | 0 | 1 | 1 / 1 | 0 | 0 | 0 |
| community | Nuke | 10471 | 1 | 0 | 0 / 0 | 0 | 0 | 0 |
| tools | SwiftLint | 61414 | 0 | 1 | 0 / 0 | 0 | 0 | 0 |
| tools | SwiftFormat | 34381 | 0 | 0 | 0 / 0 | 0 | 0 | 0 |
| tools | tuist | 136317 | 4 | 3 | 0 / 0 | 0 | 20 | 0 |
| apps | IceCubesApp | 37113 | 0 | 0 | 0 / 0 | 0 | 5 | 0 |
| apps | element-x-ios | 98239 | 0 | 15 | 0 / 0 | 2 | 33 | 1 |
| platforms | rules_swift | 1817 | 2 | 0 | 0 / 0 | 0 | 3 | 0 |
| platforms | JavaScriptKit | 26666 | 0 | 0 | 0 / 0 | 0 | 0 | 0 |
| platforms | swift-embedded-examples | 8663 | 0 | 0 | 0 / 0 | 0 | 0 | 0 |
| oci | containerization | 35525 | 3 | 5 | 1 / 0 | 0 | 14 | 0 |
| oci | container | 29302 | 9 | 2 | 1 / 1 | 0 | 31 | 0 |
| oci | swift-container-plugin | 2525 | 1 | 0 | 0 / 0 | 0 | 1 | 0 |
| **total** | 40 repos | 1266893 | **32** | **46** | **84 / 84** | **12** | **196** | **6** |

Findings.

- Stream construction: 78 total (32 closure-ctor in 14 repos + 46 `makeStream` in 12), in 20 repos. Buffering: 75 of 78 take the default (unbounded); explicit `.unbounded` 3 (swift-package-manager@5546f44a3b52:Sources/Basics/Concurrency/SerialEventQueue.swift:32); zero explicit `.bufferingNewest`/`.bufferingOldest` on `AsyncStream`/`makeStream` in 40 repos. The 112 `bufferingPolicy` references are mostly swift-async-algorithms' own buffer operator (16 `.bufferingNewest/Oldest`) and Alamofire's public parameter (57). `makeStream(of:)` outnumbers the closure init 46 to 32 (element 15, swift-build 7, grpc-swift-2 5, containerization 5); closure init leaders: container 9, tuist 4.
- Custom sequences are library work: 84 `AsyncSequence` + 84 `AsyncIteratorProtocol` conformers in 15 repos; `AsyncSequence` conformers: swift-async-algorithms 36, swift-nio 16, grpc-swift-2 6, async-http-client 6, service-lifecycle 4, hummingbird 4. The two apps define none.
- Consumption: 196 `for [try] await` loops in 22 repos (tuist 20, element 33, containerization 14, container 31); `some/any AsyncSequence` in signatures 12 (swift-foundation 3). Algorithms adoption: `import AsyncAlgorithms` in 6 files in 4 repos (service-lifecycle 2, hummingbird 2, element-x-ios 1, and the library itself 1) - the package is a dependency of few exemplars.
- Termination handling: `AsyncStream.Continuation.onTermination` is the cancellation hook; present in few of the 78 constructions (the 145 raw `onTermination` references are dominated by swift-nio's own `_NIOFileSystem` `BufferedStream`, 128 in Sources/NIOFS and Sources/_NIOFileSystem, not `AsyncStream`).

## Axis 6 - Language-mode posture (H1)

Commands: `python3 -I pkgs.py > pkgs.txt` (parses every `Package.swift` and `Package@swift-*.swift` outside Tests/Fixtures/Examples/Benchmarks/CompileTests; extracts tools version, `swiftLanguageModes`/`.swiftLanguageMode`, `enableUpcomingFeature`, `enableExperimentalFeature`, `strictMemorySafety`, `defaultIsolation`, `unsafeFlags`), then manual reading of every non-trivial mode site. App projects: `SWIFT_VERSION`, `SWIFT_STRICT_CONCURRENCY`, `SWIFT_APPROACHABLE_CONCURRENCY` greps over `*.pbxproj`, `target.yml`.

Evidence cells read `<repo of the row>@<sha from the corpus table>:Package.swift:<line>` unless another file is named.

| Repo | tools (Package.swift:1) | Effective language mode | Evidence |
|---|---|---|---|
| swift-log | 6.2 | 6 | no opt-out; `NonisolatedNonsendingByDefault` Package.swift:68 |
| swift-argument-parser | 6.0 | 6 | no opt-out |
| swift-async-algorithms | 6.2 | 6 | `StrictConcurrency=complete` Package.swift:63,90,98,139 (redundant in 6; also in `Package@swift-5.8.swift`) |
| swift-collections | 6.4 | 6, 1 target in 5 | `_RopeModule` Package.swift:325, FIXME at :324 "_modify accessors ... broken in Swift 6 mode"; `.strictMemorySafety()` :111 |
| swift-nio | 6.1 | 6 | `MemberImportVisibility` only |
| swift-system | 6.1 | 6 | `swiftLanguageModes: [.v6]` :148 |
| swift-openapi-generator | 6.2 | 6 | ExistentialAny, InternalImportsByDefault, MemberImportVisibility |
| swift-distributed-tracing | 6.2 | 6 | `StrictConcurrency=complete` :74 |
| swift-crypto | 6.2 | 6 | MemberImportVisibility |
| swift-protobuf | 6.2 | 6 | `[.v6]` :456 |
| swift-foundation | 6.2 | **5 + complete checking** | `.swiftLanguageMode(.v5)` :45 with `StrictConcurrency` experimental :41 |
| swift-format | 6.0 | **5** | `[.v5]` :150 |
| swift-testing | 6.3 | 6 | `.strictMemorySafety()` :199; 4 upcoming features |
| swift-syntax | 5.9 | **5** (builds in 5 or 6) | `swiftLanguageVersions: [.v5, .version("6")]` :447 |
| swiftly | 6.2 | 6 | MemberImportVisibility |
| sourcekit-lsp | 6.3 | 6 | `[.v6]` :754 + 6 upcoming features |
| swift-package-manager | 6.1 | **5 + StrictConcurrency** | `[.v5]` :1041; `StrictConcurrency` :260,276; `=complete` :670 |
| swift-build | 6.2 | 6 for 50 targets, **5 for 8** | `swiftSettings(languageMode:)` Package.swift:32-66; v5 sites :127,137,142,156,218,223,308,345; :345 comment "Temporarily downgraded from Swift 6 mode due to a source break in 1/31/26 nightly snapshot (rdar://169461269)" |
| async-http-client | 6.2 | 6 | `unsafeFlags` + warnings flags |
| swift-service-lifecycle | 6.1 | 6 on >=6.2, 5 below | `#if compiler(<6.2)` append `.v5` Package.swift:77-84, comment "Sendable checking with isolated methods is not working correctly before 6.2" |
| grpc-swift-2 | 6.1 | 6 | `.v6` :65 |
| vapor | 6.4 | 6 | 7 upcoming incl. `NonisolatedNonsendingByDefault`, `.strictMemorySafety()` :246 |
| hummingbird | 6.2 | 6 | ExistentialAny, InternalImportsByDefault, MemberImportVisibility |
| swift-aws-lambda-runtime | 6.2 | 6 | `NonisolatedNonsendingByDefault` |
| swift-dependencies | 6.4 | 6 | `[.v6]` :103; 6 upcoming features |
| swift-snapshot-testing | 6.0 | **5** | `[.v5]` :69 |
| swift-composable-architecture | 6.4 | 6; test+system targets 5 | `[.v6]` :100; `.v5` + StrictConcurrency :112-113 |
| Alamofire | 6.4 | **5** | `swiftLanguageModes: [.v5]` :52; ExistentialAny :41; plus `Package@swift-6.0/6.1/6.2/6.3.swift` |
| Nuke | 6.0 | 6 | no opt-out (but does not build on Linux, Axis 7) |
| SwiftLint | 5.9 | **5** | 9 upcoming features; `StrictConcurrency=complete` :16 / `targeted` :17 |
| SwiftFormat | 5.7 | **5** | no settings |
| tuist | 6.1 | mostly **5** (89 targets) | `[.v5]` :2031; `.v6` :501,515; `StrictConcurrency` :530,543,559,578; `cli/Sources/XcodeGraph/Package.swift` tools 5.10 |
| IceCubesApp | 6.2 (13 packages) | 6 | `.swiftLanguageMode(.v6)` in all 13; app `SWIFT_VERSION = 6.0` pbxproj:734 |
| element-x-ios | 6.2 | 6 | `SWIFT_VERSION: 6` target.yml:152 (all targets); Package.swift enables InferIsolatedConformances, NonisolatedNonsendingByDefault |
| rules_swift | n/a | n/a (Bazel, no manifest) | `tools/` built by Bazel |
| JavaScriptKit | 6.2 | 6 | experimental Embedded, Extern |
| swift-embedded-examples | 6.0 | 5 in 8 of the example manifests | `[.v5]` e.g. stm32-blink/Package.swift:34 |
| containerization | 6.2 | 6 | `unsafeFlags` |
| container | 6.2 | 6 | none |
| swift-container-plugin | 6.0 | 6; `containertool` target 5 | `[.v6]` :94, `.v5` :49 |

Tallies: whole-package Swift 6 = 25 (swift-log, argument-parser, async-algorithms, nio, system, openapi-generator, distributed-tracing, crypto, protobuf, testing, swiftly, sourcekit-lsp, async-http-client, service-lifecycle, grpc-swift-2, vapor, hummingbird, lambda-runtime, swift-dependencies, Nuke, IceCubes, element-x-ios, JavaScriptKit, containerization, container); 6 with at least one 5-mode target = 4 (collections, container-plugin, swift-build, TCA); 5-mode = 9 (foundation, swift-format, swift-syntax, SwiftPM, snapshot-testing, Alamofire, SwiftLint, SwiftFormat, tuist); examples/n-a = 2.

Upcoming-feature adoption among root and app-package manifests (`pkgs.py`): `MemberImportVisibility` 19 repos, `ExistentialAny` 15, `InternalImportsByDefault` 11, `NonisolatedNonsendingByDefault` 7, `InferIsolatedConformances` 7, `InferSendableFromCaptures` 4 (all 5-mode packages: SwiftLint, swift-build, TCA tests, foundation), `ImmutableWeakCaptures` 3, `GlobalActorIsolatedTypesUsability` 2, `RegionBasedIsolation` 0 (commented out in swift-build Package.swift with "rdar://137809703"), `StrictMemorySafety` (`.strictMemorySafety()`) 3 (collections, testing, vapor), `StrictConcurrency` experimental flag 4 + `=complete`/`targeted` string in 3 more. `unsafeFlags` 10 repos. Default isolation manifests: 2 (IceCubes packages, element's compound-ios).

## Axis 7 - Compiler in stricter modes

Setup. Six packages copied without `.git` to `/home/mherwig/.cache/research-lang/swift-tools/fixtures/exemplar-concurrency/<name>`: Alamofire, swift-snapshot-testing, swift-service-lifecycle, swift-argument-parser, swift-format, Nuke (selected from Axis 6: five are 5-mode or 5-mode-conditional, argument-parser is a 6-mode control, Nuke is the Apple-framework-heavy candidate). Each ran three times (`drive.sh <name>`):

```
timeout 900 /home/mherwig/.cache/research-lang/swift-tools/run.sh swift build --scratch-path /home/mherwig/.cache/research-lang/swift-tools/build/conc-<name>-base
... same with: -Xswiftc -swift-version -Xswiftc 6                                  (mode "v6")
... same with: -Xswiftc -enable-upcoming-feature -Xswiftc NonisolatedNonsendingByDefault   (mode "nonsend")
```

swift-format additionally ran with its manifest edited to `swiftLanguageModes: [.v6]` (mode "pkgv6"), because the `-Xswiftc` override reaches dependencies (below). Counts are unique `file:line:col: error|warning` diagnostics after stripping ANSI (`logsum.py`); the compiler stops after the first module with errors, so counts are lower bounds for downstream modules.

| Package | Mode | Exit | Time | Errors | Warnings | Classes (count) |
|---|---|---|---|---|---|---|
| Alamofire | base | 0 | 7s | 0 | 15 | 14 non-@objc extension member overridable (error in a future mode); 1 non-Sendable capture in `@Sendable` closure |
| Alamofire | v6 | 1 | 4s | 2 | 14 | 2 type does not conform to Sendable |
| Alamofire | nonsend | 0 | 7s | 0 | 15 | same as base |
| swift-snapshot-testing | base | 0 | 24s | 0 | 1 | 1 non-@objc extension member |
| swift-snapshot-testing | v6 | 1 | 5s | 9 | 1 | 9 global/static mutable state not concurrency-safe |
| swift-snapshot-testing | nonsend | 1 | 5s | 1 | 1 | 1 protocol conformance (isolation mismatch) |
| swift-service-lifecycle | base | 0 | 11s | 0 | 0 | clean |
| swift-service-lifecycle | v6 | 0 | 10s | 0 | 0 | clean (already Swift 6 on 6.4; override is a no-op, only the "language mode overridden" warning) |
| swift-service-lifecycle | nonsend | 1 | 5s | 1 | 0 | 1 `sending` risks data race |
| swift-argument-parser | base / v6 / nonsend | 0 | 5-8s | 0 | 3 each | 3 deprecations; identical in all modes |
| swift-format | base | 0 | 25s | 0 | 0 | clean |
| swift-format | v6 (override) | 1 | 6s | 3 | 0 | 3 in dependency swift-markdown, never reaches swift-format |
| swift-format | pkgv6 (manifest edit) | 1 | 18s | 9 | 0 | 9 static properties not concurrency-safe |
| swift-format | nonsend | 0 | 20s | 0 | 0 | clean |
| Nuke | base / v6 / nonsend | 1 | 3-4s | 1 | 0 | `no such module 'os'` - fails on Linux in every mode |

Representative diagnostics (5 per package where that many distinct kinds exist):

- Alamofire v6: `error: Source/Features/ResponseSerialization.swift:360: type 'Any' does not conform to the 'Sendable' protocol`; `error: ResponseSerialization.swift:360: type 'JSONResponseSerializer.SerializedObject' (aka 'Any') does not conform to the 'Sendable' protocol`; `warning: Source/Core/SessionDelegate.swift:74: non-'@objc' instance method declared in extension cannot be overridden; use 'public' instead; this will be an error in a future Swift language mode`. nonsend/base: `warning: Source/Features/EventMonitor.swift:558: capture of 'stream' with non-Sendable type 'InputStream' in a '@Sendable' closure; this is an error in the Swift 6 language mode`.
- swift-snapshot-testing v6: `var '__diffTool' is not concurrency-safe because it is nonisolated global shared mutable state` (Sources/SnapshotTesting/AssertSnapshot.swift:49); `static property 'registered' is not concurrency-safe ...` (AssertSnapshot.swift:593); `let '_plistNullNSString' is not concurrency-safe because non-'Sendable' type 'NSString' may have shared mutable state` (Common/PlistEncoder.swift:2245); `static property 'lines' is not concurrency-safe because non-'Sendable' type 'Snapshotting<String, String>'` (Snapshotting/String.swift:6). nonsend: `type '_SnapshotsTestTrait' does not conform to protocol 'TestScoping'` (SnapshotsTestTrait.swift:44).
- swift-service-lifecycle nonsend: `error: Sources/UnixSignals/UnixSignalsSequence.swift:80: sending 'self.iterator' risks causing data races` with note "sending 'self.iterator' to @concurrent instance method 'next()' risks causing data races between @concurrent code" - the one exemplar in this set where flipping `NonisolatedNonsendingByDefault` is a source-breaking change.
- swift-format pkgv6: `static property 'returnVoid' is not concurrency-safe because non-'Sendable' type 'Finding.Message'` (Sources/SwiftFormat/Rules/ReturnVoidInsteadOfEmptyTuple.swift:125); same for `removeEmptySuiteAttribute` (SwiftTestingNamingConventions.swift:68); `static property 'ignoreRegex' ... non-'Sendable' type 'IgnoreDirective.RegexExpression'` (Core/RuleMask.swift:146); `replacePrivateWithFileprivate` (FileScopedDeclarationPrivacy.swift:163). All nine are one class: shared static constants of non-Sendable value types.
- Nuke: `error: Sources/Nuke/Caching/Cache.swift:6: no such module 'os'` (unconditional `import os`). Apple-only frameworks make a Linux strict-mode run impossible for it; the strict-mode answer for Nuke needs macOS.

Findings.

- `-Xswiftc -swift-version 6` is a blunt instrument. SwiftPM prints `warning: language mode was overridden by extra Swift flags and may be inconsistent with code generated during the build`, and the flag applies to dependencies: swift-format failed in swift-markdown (3 errors) before its own sources compiled. The faithful probe is to edit the root manifest to `swiftLanguageModes: [.v6]` (pkgv6: 9 errors that the override hid).
- The Swift 6 migration work in the three failing 5-mode libraries is two classes only: global/static mutable state or non-Sendable constants (swift-snapshot-testing 9, swift-format 9) and type-erased `Any` results (Alamofire 2). Neither needs an escape hatch if the type is made `Sendable` or the property `let` of a `Sendable` type.
- `NonisolatedNonsendingByDefault` alone broke 2 of 6 (snapshot-testing, service-lifecycle) and none of the other four; both breaks are in protocol/async-iterator forwarding code, not in app-style code.
- Build failures on Linux from Apple-only frameworks: Nuke (`os`). Alamofire builds on Linux in 7s. Not run: the `swift:6.3` image (`SWIFT_VERSION=6.3`).

## Smells (ranked)

Rank = (agent failure likelihood in new code) x (measured prevalence in the exemplars). Count = occurrences in the 40-repo non-test corpus.

| # | Smell | Repos | Count | Citation |
|---|---|---|---|---|
| 1 | Fire-and-forget `Task {}` with no handle or cancellation path | 22 (apps dominate) | 709 bare of 882 (80%); 586 in 2 apps | element-x-ios@14e33866ced2:ElementX/Sources/Screens/JoinRoomScreen/JoinRoomScreenViewModel.swift:413 |
| 2 | Async code with no cooperative cancellation check | all with async | 6.4% of 2,257 async files have any; tuist 1.8%, vapor 1.6% | tuist@2f6ac74754bf (12 of 668 async files) |
| 3 | `@unchecked Sendable` with no guard and mutable state | 33 repos hold the hatch | 3 of 25 sampled are unguarded (2 fixable); auto-class "no guard visible" 141 | IceCubesApp@2ad6e6891258:Packages/MediaUI/Sources/MediaUI/QuickLookToolbarItem.swift:5 (SwiftUI struct), Nuke@d5548dd61395:Sources/Nuke/ImageContainer.swift:147 |
| 4 | `@unchecked Sendable` as the answer to a non-final class hierarchy | swift-build | 237 | swift-build@2187330e13e7:Sources/SWBCore/SpecImplementations/ProductTypes.swift:16 |
| 5 | `nonisolated(unsafe) let` on immutable non-Sendable values | 19 | 110 of 191 | sourcekit-lsp@c6ce93d5f8aa:Sources/SourceKitD/SKDRequestDictionary.swift:57 |
| 6 | Unbounded default `AsyncStream` buffers | 20 | 78 of 78 constructions unbounded (75 default, 3 explicit `.unbounded`), 0 bounded | container@f70ecbb926d9 (9 closure-ctor streams, e.g. Sources/ContainerXPC/XPCServer.swift:112) |
| 7 | Sync-over-async bridge via semaphore | 1 (6 repos construct `DispatchSemaphore`) | 1 bridge, `noasync`-annotated | swift-package-manager@5546f44a3b52:Sources/Basics/Concurrency/ConcurrencyHelpers.swift:39 |
| 8 | GCD for new state protection / main hops | 22 | 550 `DispatchQueue`, 76 `DispatchQueue.main.async` | Alamofire@bda9ed57d729 (126, 133/10k); element-x-ios (190) |
| 9 | Completion-handler API without async twin | 23 | 322 callback params | Alamofire@bda9ed57d729:Source/Features/AuthenticationInterceptor.swift:84 |
| 10 | Combine in app code against project guidance | 9 | 440 files (387 element-x-ios, 24 IceCubes) | Dimillian/IceCubesApp@2ad6e6891258:CLAUDE.md:144 vs 24 files |
| 11 | `@preconcurrency` on public API as a permanent shim | 13 | 422 | swift-nio (154), TCA (75), Alamofire (65) |
| 12 | `Task.sleep(nanoseconds:)` instead of `for:` | 7 | 18 (vs 132) | Nuke@d5548dd61395:Sources/Nuke/Internal/RateLimiter.swift:55 |
| 13 | `Task.detached` without priority/isolation reason | 9 | 34 | sourcekit-lsp@c6ce93d5f8aa:Sources/SourceKitD/SourceKitDCore.swift:82 |
| 14 | Swift 5 language mode by default in maintained libraries | 9 | 9 of 40 repos | Alamofire@bda9ed57d729:Package.swift:52 |
| 15 | Unsafe continuation where checked would do | 5 | 46 of 211 | swift-async-algorithms@cbde9aed744b:Sources/AsyncStreaming/DuplexChannel/DuplexAsyncChannel.swift:354 |
| 16 | Documentation that forbids a hatch the code uses | 1 | 5 + 16 hatches vs "Never" | element-hq/element-x-ios@14e33866ced2:AGENTS.md:288 |

## Patterns worth encoding

| Pattern | Exemplar citation |
|---|---|
| Wrap mutable state as `private let state: Mutex<State>` (Swift 6.0 Synchronization), mutate only in `withLock` | vapor@bf77fc69b142:Sources/Vapor/Application+State.swift:55; swift-foundation@aadd9259be07:Sources/FoundationEssentials/Locale/Locale_Cache.swift:129 |
| Pre-Mutex portable lock: `NIOLockedValueBox<State>` holding a state machine | async-http-client@017115279d09:Sources/AsyncHTTPClient/HTTPHandler.swift:548 |
| Generic async helper takes `isolation: isolated (any Actor)? = #isolation` so it inherits the caller | swift-nio@e12881f2a691:Sources/NIOPosix/StructuredConcurrencyHelpers.swift:34 |
| `nonisolated(nonsending)` on async API that takes closures | swift-log@4038b6a4f74a:Sources/Logging/Logger+With.swift:98; swift-nio@e12881f2a691:Sources/NIOCore/AsyncAwaitSupport.swift:28 |
| Enable `NonisolatedNonsendingByDefault` with the docs link in the manifest | swift-log@4038b6a4f74a:Package.swift:66-68 |
| Library compile-test that generated code survives a consumer's default MainActor (`nonisolated` generated decls) | swift-protobuf@6c84c3dedac0:CompileTests/NonisolatedDeclarations/Package.swift:25 |
| Conditional Sendable for unsafe-storage containers: `extension T: @unchecked Sendable where Element: Sendable {}` | swift-collections@935f696a549a:Sources/DequeModule/Deque/Deque+Collection.swift:170 |
| Per-target Swift 5 opt-out with dated reason and tracker, never package-wide silence | swift-build@2187330e13e7:Package.swift:345; swift-collections@935f696a549a:Package.swift:324-325; swift-service-lifecycle@c55297914e26:Package.swift:77-84 |
| Migration bridge: stay in Swift 5 mode with `StrictConcurrency` complete and upcoming flags, then flip | swift-foundation@aadd9259be07:Package.swift:41-45; swift-package-manager@5546f44a3b52:Package.swift:670; SwiftLint@ec4691d9e813:Package.swift:16 |
| Discarding task group for accept loops and request fan-out | hummingbird@1bd3b407fb47:Sources/HummingbirdCore/Server/Server.swift:117; grpc-swift-2@ac33066eb6ed:Sources/GRPCInProcessTransport/InProcessTransport+Server.swift:123 |
| `withTaskCancellationHandler` around a state machine in a locked box, not ad-hoc flags | swift-service-lifecycle@c55297914e26:Sources/UnixSignals/UnixSignalsSequence.swift:151 |
| `sending` on results/closure returns instead of transfer boxes | swift-async-algorithms@cbde9aed744b:Sources/AsyncAlgorithms/AsyncShareSequence.swift:192; JavaScriptKit@c68ee9bdebfa:Sources/JavaScriptKit/FundamentalObjects/JSClosure.swift:124 |
| Time-dependent types generic over `Clock` for testability | hummingbird@1bd3b407fb47:Sources/Hummingbird/Storage/MemoryPersistDriver.swift:16; swift-async-algorithms@cbde9aed744b:Sources/AsyncAlgorithms/Debounce/AsyncDebounceSequence.swift:39 |
| Store the handle and cancel it on replace/teardown | IceCubesApp@2ad6e6891258:Packages/Env/Sources/Env/StreamWatcher.swift:173; Nuke@d5548dd61395:Sources/Nuke/Pipeline/TaskQueue.swift:174 |
| `isolated deinit` and isolated conformances (6.2) in actor-bound view models | element-x-ios@14e33866ced2:ElementX/Sources/Services/Presence/PresenceService.swift:38; IceCubesApp@2ad6e6891258:Packages/Account/Sources/Account/Detail/Tabs/BoostsTab.swift:31 |
| Platform libc import block: per-OS `#if` with `@preconcurrency import` (boilerplate, copy verbatim) | swift-nio@e12881f2a691:Sources/NIOConcurrencyHelpers/lock.swift:25 |
| Explicit `.swiftLanguageMode(.v6)` per target in app-internal packages next to `.defaultIsolation(MainActor.self)` | IceCubesApp@2ad6e6891258:Packages/Timeline/Package.swift:41-42 |

Patterns the corpus does not supply (rules must come from the language, not an exemplar): bounded `AsyncStream` buffers (0 of 78), `Task.immediate` (0), `Mutex` replacing `NIOLockedValueBox` in server code (0), `@Dependency(\.continuousClock)` in non-test code (0).

## Contradictions of the frame

| Frame statement | Measurement | Verdict |
|---|---|---|
| H1: most active exemplars are in Swift 6 mode, "community libraries still ship 5.x tools versions" | 25 of 40 whole-package Swift 6, 4 more mostly 6. But the community libraries ship new tools versions with an explicit opt-out: Alamofire tools 6.4 with `swiftLanguageModes: [.v5]` (Package.swift:1,52); swift-snapshot-testing tools 6.0 with `[.v5]` (:69). 5.x tools versions appear only in SwiftLint 5.9, SwiftFormat 5.7, swift-syntax 5.9 and sub-packages. Four large swiftlang/Apple repos are in Swift 5 mode (swift-foundation, SwiftPM, swift-format, swift-syntax). | Half right. Tools version does NOT predict language mode; read `swiftLanguageModes`/`.swiftLanguageMode`. "Apple/swiftlang repos are Swift 6" is false for swift-foundation and for 3 of the 7 swiftlang tools repos (swift-format, swift-syntax, SwiftPM). |
| H2: `@unchecked Sendable` and `nonisolated(unsafe)` dominate, "most uses avoidable with Mutex, sending, or actor isolation" | 564 + 191 = 755 vs 75 assume-isolated and 2 conformance-form `@preconcurrency`: dominant, yes. Avoidable: 12 of 25 sampled (48%); `Mutex` fits only 4; 42% of the corpus total is one repo's `Spec` class hierarchy rooted in an `open class` the compiler refuses to check; `weak let` does not help (compile). | Dominance confirmed; avoidability overstated by about half. |
| H7: agents fail on `MainActor.run` hops | `MainActor.run` 23 uses (0.2/10k, 3 repos) vs `@MainActor` annotations 614 and `DispatchQueue.main.async` 76 | The exemplars almost never use `MainActor.run`; if agents emit it, it is an agent habit, not exemplar-derived. Rule on annotation placement instead. |
| H7: unstructured `Task {}` with no cancellation path | True but app-concentrated: 83% of bare creations in 2 apps; libraries store handles. | Confirmed with a scope qualifier. |
| H7: GCD/completion handlers/Combine in new code | True mostly for Alamofire/apps; core and server libraries keep them only as API-compat surface next to async twins. | Confirmed for apps and community libs; not for core/server. |
| H8: default MainActor appears only in app targets, not packages | IceCubes sets `.defaultIsolation(MainActor.self)` in 9 of 13 local packages (Packages/Timeline/Package.swift:42); element's `compound-ios` package does (Package.swift:27,40). No published library does. | Narrowly contradicted: app-internal feature packages yes, published libraries no. Libraries must stay correct under a consumer's default isolation (swift-protobuf compile test). |
| Frame: `Mutex` (Synchronization) as the 6.x lock | 177 refs in 15 repos, but swift-nio uses 1, async-http-client 0, hummingbird 0; `NIO*Lock*` 79 | Mutex is the 6.x answer in swift-foundation, containerization, vapor, grpc-swift-2; the NIO stack stays on `NIOLockedValueBox`. |
| Docs vs config | element-x-ios AGENTS.md:288 says never `@unchecked Sendable`/`nonisolated(unsafe)`; code has 5 and 16 in non-test sources. AGENTS.md:286 lists app, UnitTests, PreviewTests for default MainActor; `target.yml` also sets it for both MapLibre targets (MapLibreInterface:16, MapLibreShim:17). IceCubes CLAUDE.md:144 "Avoid Combine" vs 24 `import Combine` files. | The compiler-enforced config (`target.yml`/pbxproj/Package.swift) and the code are authoritative; the prose docs are aspirations. |
| New: compiler-visible effect of 6.2 settings | `NonisolatedNonsendingByDefault` broke 2 of 6 packages (UnixSignalsSequence.swift:80); 7 of 40 repos enable it. | Adoption is early; rules must treat it as opt-in with a build check. |

## Gaps

- Test code was excluded by instruction; the Swift Testing vs XCTest and test-isolation questions are not covered here.
- Axis 7 covers 6 packages and stops at the first module with errors; counts are lower bounds. No Apple-only target (Nuke, IceCubes, element-x-ios, TCA's SwiftUI surface) could be strict-built: no macOS. The `swift:6.3` image and `-Xswiftc -strict-concurrency=complete` in 5 mode were not run.
- No runtime evidence: no TSan run, no data-race reproduction; "avoidable" in the 25-sample is compile-checked for only 6 verdicts (marked (c)), the rest is reading.
- `Mocks`/`Preview*`/`Integration` directories are classed as test support; production-style code inside them (element-x-ios `Mocks`) is not counted. `Tutorials`/`examples` are excluded (TCA tutorials 475 files, tuist examples 1,175 files); their idioms are not measured.
- Regex limits: nested block comments and interpolations containing quotes are not handled; `async` file detection is lexical; "stored handle cancelled" is name-and-file matching (floor, see Axis 3); `@MainActor` kind is by text after the attribute (8 "other"); callback params require a `-> Void` on the same or next two lines.
- App Xcode settings read only from `*.pbxproj` and `target.yml` (XcodeGen); `.xcconfig` and Tuist `Project.swift` settings for tuist/IceCubes extension targets were not enumerated beyond the main app.
- `rules_swift` (Bazel) has no manifest; Bazel-side language-mode flags were not measured.
- `Package@swift-*.swift` variants were parsed but their differences from the main manifest were reported only for Alamofire, async-algorithms, TCA, dependencies.

## Appendix: regex catalog

All applied to code with comments and strings blanked; `\b` boundaries omitted here for readability where harmless. Full table: `run_scan.py::PAT`, refined forms in `extra.py`.

| Name | Regex (abridged) |
|---|---|
| unchecked_sendable | `@unchecked\s+Sendable` |
| nonisolated_unsafe | `nonisolated\s*\(\s*unsafe\s*\)` |
| preconc_import | `@preconcurrency\s+(@\w+\s+)*(public|internal|package|private|fileprivate)?\s*import` |
| preconc_other | `@preconcurrency\b` not followed by import |
| assumeIsolated | `\bassumeIsolated\b` (split by `\(\s*\)` = NIO) |
| actor_decl | `^\s*(modifiers\s+)*actor\s+[A-Za-z_]\w*` |
| MainActor | `@MainActor\b` (kind by following keyword) |
| nonisolated_any | `(?<![\w.])nonisolated\b(?!\s*\()` |
| nonisolated_nonsending | `nonisolated\s*\(\s*nonsending\s*\)` |
| isolation_param / hash_isolation | `\bisolation\s*:\s*(isolated\b|\(any\b)` / `#isolation` |
| sending | `(?<![\w.])sending\s+([A-Za-z_(\[]|any\b)` |
| Task creation | `(?<![\w.])Task\s*(<..>)?\s*(\{|\((priority|name|executorPreference|operation)..\)\s*\{)` minus prefix `->|extension|class|struct|enum|actor|protocol|:|as|is|typealias` |
| task_detached | `\bTask\s*(<..>)?\s*\.\s*detached\b` |
| structured | `with(Throwing)?TaskGroup`, `with(Throwing)?DiscardingTaskGroup`, `async\s+let` |
| cancellation | `Task\s*\.\s*isCancelled`, `Task\s*\.\s*checkCancellation`, `withTaskCancellationHandler`, `\.cancel\(\)` |
| sleep | `\.sleep\s*\(\s*(for|nanoseconds|until)\s*:` |
| Clock | `ContinuousClock`, `SuspendingClock`, `any\s+Clock|:\s*Clock\b|Clock\s*<\s*Duration\s*>` |
| Dispatch | `\bDispatchQueue\b`, `DispatchGroup`, `DispatchSemaphore`, `\w*[Ss]emaphore\w*\s*\.\s*wait\s*\(` |
| callback params | `(completion\w*|handler|callback|reply|resultHandler)\s*:\s*(@attr\s+)*\(` with `-> Void` and no `async` within 3 lines |
| Combine | `import\s+Combine`; uses: `AnyPublisher|PassthroughSubject|CurrentValueSubject|AnyCancellable|\.sink\s*\(|\.receive\s*\(\s*on` |
| continuations | `withChecked(Throwing)?Continuation`, `withUnsafe(Throwing)?Continuation` |
| AsyncStream | `Async(Throwing)?Stream\s*(<..>)?\s*(\(|\{)` minus type-position prefixes; `.makeStream`; policy window of 260 chars |
| AsyncSequence conformer | token parser: `(struct|class|enum|actor|extension) Name<..>? : <list>` list contains `Async(Throwing)?Sequence` / `AsyncIteratorProtocol` |
| lock family | `Mutex\s*<`, `NIOLock(edValueBox)?`, `(LockedValueBox|ManagedCriticalState)\s*<`, `OSAllocatedUnfairLock`, `os_unfair_lock`, `NSLock|NSRecursiveLock|NSCondition`, `pthread_(mutex|rwlock|cond)\w*`, `Atomic|ManagedAtomic` |
