---
title: "swift-upgrade procedure and swift-diagnose runbook (SW-CORE): step lists, stop conditions, descriptions, references split, all measured on Swift 6.4 and 6.3"
topic: procedures/upgrade-and-diagnose (merged W3-11 and W3-12; rows M-P-01, M-P-02)
agent: procedures-upgrade-and-diagnose
model: sonnet
date_researched: 2026-10-10
sources_count: 24
fixtures: /home/mherwig/.cache/research-lang/swift-tools/fixtures/upgrade-and-diagnose/
scope: >
  Covers the ordered step list of the swift-upgrade skill (Swift 5 mode to Swift 6 mode, upcoming features, toolchain bump, dated
  re-checks) and the symptom-routed runbook of the swift-diagnose skill (exit codes, backtracer, hangs, sanitizers, type-checker
  slowness), each with a verification command watched red and green on Swift 6.4 and 6.3 (Linux, Docker). Not covered: rule text (cited
  by SW-CONC, SW-PKG, SW-GATE, SW-ERR, SW-CLI, SW-TEST IDs, never restated), Apple-platform crash logs and Instruments (unverified: read
  only), Windows, Wasm, Embedded, the static Linux SDK (unverified: read only), Bazel, release and tagging (swift-release is M-P-03).
---

# swift-upgrade and swift-diagnose: the procedures over settled rules

Skills carry procedure, rules carry standards. Every rule is cited by ID. Every command below was run on `swift:6.4` (6.4.0-RELEASE)
and, where the table says so, on `swift:6.3` (6.3.x) through `/home/mherwig/.cache/research-lang/swift-tools/run.sh`, 2026-10-10.
Counts are unique `file:line:col` diagnostics under the package's own `Sources/`.

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Method, fixtures, exemplar](#1-method-fixtures-exemplar)
   2. [swift-upgrade: the ordered step list](#2-swift-upgrade-the-ordered-step-list)
   3. [swift-upgrade: step counts on 6.4 and 6.3](#3-swift-upgrade-step-counts-on-64-and-63)
   4. [swift-upgrade: `swift package migrate` on 6.4](#4-swift-upgrade-swift-package-migrate-on-64)
   5. [swift-upgrade: the fix ladder on a real package](#5-swift-upgrade-the-fix-ladder-on-a-real-package)
   6. [swift-upgrade: toolchain bump, `.swift-version`, CI image](#6-swift-upgrade-toolchain-bump-swift-version-ci-image)
   7. [swift-upgrade: dated re-checks](#7-swift-upgrade-dated-re-checks)
   8. [swift-upgrade: stop conditions, description, references](#8-swift-upgrade-stop-conditions-description-references)
   9. [swift-diagnose: the decision tree](#9-swift-diagnose-the-decision-tree)
   10. [swift-diagnose: crash signatures, debug and release](#10-swift-diagnose-crash-signatures-debug-and-release)
   11. [swift-diagnose: the backtracer on Linux](#11-swift-diagnose-the-backtracer-on-linux)
   12. [swift-diagnose: capturing a hang](#12-swift-diagnose-capturing-a-hang)
   13. [swift-diagnose: sanitizers and flaky tests](#13-swift-diagnose-sanitizers-and-flaky-tests)
   14. [swift-diagnose: slow and failing type-checks](#14-swift-diagnose-slow-and-failing-type-checks)
   15. [swift-diagnose: stop conditions, description, references](#15-swift-diagnose-stop-conditions-description-references)
   16. [Corrections to earlier consolidations](#16-corrections-to-earlier-consolidations)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- **The order is the product.** Probe first, pin the toolchain second, fix by ladder third, flip the mode fourth, clean the flip's non-concurrency warnings fifth, `migrate` post-6 features one at a time sixth. The flip alone surfaced 5 warnings the concurrency checking never showed (4 from `ConciseMagicFile`, 1 `DeprecatedDeclaration`).
- **`swift package migrate --to-feature` handles exactly five names on 6.4**: `ExistentialAny`, `InferIsolatedConformances`, `MemberImportVisibility`, `NonisolatedNonsendingByDefault`, `StrictMemorySafety`. `GlobalConcurrency` exits 64 `not migratable`. `swiftc -print-supported-features` is the machine-readable list (`"migratable": true`, `"enabled_in"`).
- **The flag is `--target`, not the guide's `--targets`** (exit 64 `Unknown option '--targets'`). `migrate` runs on a dirty tree (exit 0, edits mixed), fails (exit 1, no edits) on an existing build error, and writes per-target `swiftSettings:` literals instead of editing a shared loop.
- **Re-gate after every `migrate` on the current toolchain.** Its `@concurrent` fix-it output was clean on 6.3 (0 warnings) and produced 2 `DeprecatedDeclaration` warnings on 6.4 (`TaskLocal.withValue(isolation:)`), so `-Xswiftc -warnings-as-errors` exited 1.
- **"Zero new hatches" is a delta, not a whole-tree pass.** The SW-GATE-10 justification pass prints 2 legacy lines before and after the migration; the lazy twin printed 12. The gate that went red is the added-lines check: 13 lines on the lazy twin, 0 on the ladder result.
- **Real package, real numbers:** `swift-snapshot-testing@28e5de025e3f` (37 source files) went 5-mode 1 warning, complete checking 13, `-swift-version 6` 9 errors, to Swift 6 mode 0 warnings with `-warnings-as-errors` exit 0 and 0 new hatches, on both 6.4 and 6.3.
- **One toolchain pin, derived everywhere.** `.swift-version` is the source; CI derives the image (`image=swift:$(cat .swift-version)-noble`, `containerization@3e7bc39e66b3`). A hard-coded `swift:6.3-noble` is the grep that goes red.
- **Dated re-checks are four compile probes that must still fail** (SE-0526 `withDeadline`, SE-0540 `defaultSwiftSettings`, SE-0529 `FilePath`, T-V42 typed-throws `Task` crash). All four are STILL on 6.4 and 6.3; a twin that compiles reports FLIPPED.
- **Diagnose by exit code plus the first message line, never the code alone.** A 17-row planted matrix: the two-signal tree took the right branch 17 of 17 on 6.4 and 6.3 and 7 of 7 on release builds; the exit-code-only tree took the wrong branch 11 of 17 (debug) and 5 of 7 (release).
- **SIGQUIT is a non-destructive thread dump on Linux 6.3 and 6.4** (the process survives and keeps hanging) unless the target was launched with a bare `&` in a non-interactive shell, which leaves SIGINT and SIGQUIT ignored (`SigIgn: 0000000000000006`) and `kill -QUIT` does nothing. Launch with `set -m`.
- **Exit codes do not depend on `SWIFT_BACKTRACE`.** `enable=no` keeps 132 and 139 but removes the evidence (a segfault prints 0 stderr lines). `enable=yes,interactive=no,color=no` is the capture setting. Release builds drop the `precondition` message text.
- **Three hangs share exit 124 and are told apart by symptom.** The `leaked its continuation` stderr line (SW-CONC-22), CPU at or above 50 percent (spin), a `_dispatch_sema4_wait` frame in the SIGQUIT dump (SW-CONC-15), else idle with no user frame.
- **TSan is the diagnosis tool even though it is an advisory CI leg.** `swift build --sanitize=thread` exits 66 on a race and on correct `Mutex` code (6.3 and 6.4 false positive); five plain runs of the `Mutex` plant printed `count=200000` every time, the race plant printed five different counts.
- **`unable to type-check this expression in reasonable time` can hide a real type error.** A `Double` plus `Float` expression took 4128 ms to fail with that message and 74 ms to fail with `binary operator '+' cannot be applied` once split.
- **`-Xswiftc -Xfrontend -Xswiftc -warn-long-expression-type-checking=100` plus `-Xswiftc -warnings-as-errors` is a working budget gate:** a 5-row dictionary-literal array took 3791 ms (exit 1), the annotated twin exit 0.

## Findings

### 1. Method, fixtures, exemplar

All fixtures live under `/home/mherwig/.cache/research-lang/swift-tools/fixtures/upgrade-and-diagnose/` (never `/tmp`, never inside an exemplar). Builds use `--scratch-path "$SWIFT_SCRATCH/upgrade-and-diagnose/<name>"`. The image sets its own `SWIFT_VERSION=swift-6.4.0-RELEASE`, so version selection travels as a host variable to `run.sh` and as an argument to in-container scripts.

| Fixture | Purpose |
|---|---|
| `upgrade/` | Copy of `pointfreeco__swift-snapshot-testing` Sources, `Package.swift`, `Package.resolved` at `28e5de025e3f`: 37 `.swift` files, tools 6.0, `swiftLanguageModes: [.v5]` ([`Package.swift:69`](https://github.com/pointfreeco/swift-snapshot-testing)). Test targets removed (they need Apple frameworks and 249 snapshot assets). Git history in the fixture is the step record (13 commits). |
| `upgrade-lazy/` | The lazy twin: same flip, every diagnostic silenced with `nonisolated(unsafe)` or `@unchecked Sendable`. Builds green in Swift 6 mode (exit 0). |
| `upgrade-probe/` | Clone used for 6.3 reruns and feature probes. |
| `diagnose/` | One executable, 18 subcommands (`precondition`, `unwrap`, `overflow`, `segv`, `recurse`, `sigpipe`, `kill9`, `abort`, `doublefree`, `leak`, `doubleresume`, `semaphore`, `spin`, `race`, `mutexok`, `throwtop`, `slowtc`, `ok`) plus a C target for the segfault and double free. Scripts: `symptoms.sh`, `classify.sh`, `classify-naive.sh`, `matrix.sh`, `matrix-rel.sh`, `quit.sh`, `slowtc-matrix.sh`. |
| `hangtest/` | A Swift Testing package with one test that leaks a continuation, for hang capture under `swift test`. |
| `recheck/` | Four dated-re-check probes and a FLIPPED twin. |
| `bump/`, `greps/` | Red and green plants for the toolchain-pin and flag greps. |

Choice of exemplar: `swift-snapshot-testing` is one of the three 5-mode libraries the concurrency audit marked as failing (9 errors in `-swift-version 6`; [exemplar-concurrency.md Axis 7](swift-audit/exemplar-concurrency.md)). It is under 50 files, has three module targets, a SwiftSyntax dependency and real shared mutable state, so the ladder gets exercised for real instead of on a toy.

### 2. swift-upgrade: the ordered step list

Every step has one verification command. "Count" always means unique own-package `warning:` and `error:` lines. Rule IDs are the standard; the step is the procedure.

**U0. Baseline.** Clean tree, green build, count recorded. `git status --porcelain` prints nothing; `swift --version`; `swift build --scratch-path "$SWIFT_SCRATCH/upgrade-and-diagnose"` exit 0; write down the warning count (fixture: 1). Without a baseline, step U7's "zero" cannot be told from "pre-existing". Pre-existing hatches are counted here too: the SW-GATE-10 justification pass printed 2 legacy lines (`AssertSnapshot.swift:615` `Counter`, `AssertInlineSnapshot.swift:767` `LockIsolated`).

**U1. Pin the toolchain once.** `.swift-version` holds the exact patch; CI derives the image from it ([section 6](#6-swift-upgrade-toolchain-bump-swift-version-ci-image); SW-GATE-08). Verify: `grep -rn -e 'swift:[0-9]' -e 'swiftlang/swift:' --include='*.yml' --include='*.yaml' --include='Dockerfile' .` prints nothing.

**U2. Manifest floor, shared loop, typo guard.** Raise `swift-tools-version` to 6.2 (SW-PKG-11/12, a release-note event per SW-PKG-33), move shared settings into one `for target in package.targets` loop (SW-PKG-18), add `.treatWarning("StrictLanguageFeatures", as: .error)` (SW-PKG-02). Package stays in 5 mode for now. Verify: build exit 0, count unchanged (fixture 1 to 1 on both toolchains); a misspelt name now fails: `'ExistentalAny' is not a recognized upcoming feature [#StrictLanguageFeatures::UnrecognizedStrictLanguageFeatures]`, exit 1, versus exit 0 without the guard.

**U3. Probe, change nothing.** Measure the blast radius with flags, no manifest edit:
`swift build -Xswiftc -strict-concurrency=complete` (fixture 13 warnings, exit 0), `swift build -Xswiftc -swift-version -Xswiftc 6` (fixture exit 1, 9 errors; a lower bound because the compiler stops after the first module with errors), and one `-Xswiftc -enable-upcoming-feature -Xswiftc NAME` per Swift-6-group name. Measured per-name deltas are in [section 3](#3-swift-upgrade-step-counts-on-64-and-63). The `-swift-version` flag is a probe only: it reaches dependencies (audit evidence: swift-format failed inside swift-markdown, [exemplar-concurrency.md Axis 7](swift-audit/exemplar-concurrency.md)); the faithful migration mode is the manifest.

**U4. Turn on complete checking in 5 mode through the manifest.** `.enableUpcomingFeature("StrictConcurrency")` in the loop (tools 6.0 and later, [EnableDataRaceSafety](https://raw.githubusercontent.com/swiftlang/swift-migration-guide/main/Guide.docc/EnableDataRaceSafety.md)). Add the other names with a non-zero delta from U3 (`GlobalConcurrency`, `ConciseMagicFile` in the fixture) so their diagnostics are fixed before the flip. Verify: build exit 0 (warnings only), count equals the U3 probe (13).

**U5. Fix by ladder, one class at a time, rebuilding after each.** SW-CONC-28 order, hatch last. Record the count after each class (fixture 13, 9, 4, 4, 1). Verify per class: build exit 0 and count falls; after the last class, the hatch delta check prints nothing ([section 5](#5-swift-upgrade-the-fix-ladder-on-a-real-package)).

**U6. Flip.** `swiftLanguageModes: [.v6]` and delete the 5-mode `enableUpcomingFeature` lines of the Swift-6 group in the same commit (SW-PKG-03, SW-PKG-14). Verify: `grep -rn -e 'swiftLanguageModes: \[.v5\]' -e 'enableUpcomingFeature("StrictConcurrency")' --include='Package*.swift' .` prints nothing; build exit 0 with errors 0 (fixture: 6 warnings).

**U7. Clear the flip's non-concurrency warnings.** Fixture: four `parameter 'file' with default argument '#file' passed to parameter 'filePath', whose default argument is '#filePath'` (Swift 6 mode turns on `ConciseMagicFile`: `#file` now means the file ID), one `'init(contentsOfFile:)' is deprecated [#DeprecatedDeclaration]`, one `open var` in a Linux-only extension branch. Verify: `swift build -Xswiftc -warnings-as-errors` exit 0 on 6.4 and 6.3 (SW-GATE-13). The `-warnings-as-errors` exit was 1 before this step because of the pre-existing `Any.swift:205` warning, which Swift 6 mode did not change.

**U8. Post-6 upcoming features, one at a time, with `migrate`.** For each of `NonisolatedNonsendingByDefault` (SW-CONC-07, review every `@concurrent`), `InferIsolatedConformances`, `MemberImportVisibility`, `ExistentialAny` (SW-PKG-08, SW-PKG-32): clean tree, `swift package migrate --to-feature NAME`, read `git diff`, build with `-Xswiftc -warnings-as-errors` on the current toolchain and the floor, commit. Verify: `git status --porcelain` prints nothing before each run; exit 0 and the diff is reviewed; the re-gate catches output the current toolchain dislikes ([section 4](#4-swift-upgrade-swift-package-migrate-on-64)).

**U9. Fold the per-target literals into the loop.** `migrate` writes `swiftSettings: [.enableUpcomingFeature(...)]` into each target; move the names into the shared loop (SW-PKG-18). Verify: `grep -rn -e 'swiftSettings: \[' --include='Package.swift' .` prints nothing and `swift package dump-package` shows the same four `enableUpcomingFeature` entries on all three targets (fixture: yes); build exit 0, `-warnings-as-errors` exit 0 on 6.4 and 6.3.

**U10. Gate and dated re-checks.** Run the gate block (SW-GATE-01), the added-hatch check against the U0 commit, and the four re-check probes ([section 7](#7-swift-upgrade-dated-re-checks)). Write the receipt: toolchain, per-step counts, hatches added (must be 0), probes STILL or FLIPPED.

### 3. swift-upgrade: step counts on 6.4 and 6.3

Fixture commits in `upgrade/`: baseline `b36158f`, U2 `eb5de4e`, U4 `552dd85`, U5 `4d9cca3`, U6 `803ee85`, U7 `5d86394`, U8 `0e95143`..`441dd75` then `9f1bddb`, U9 `8f4792d`. Cells are `exit/errors/warnings`.

| Step | Change | 6.4 | 6.3 |
|---|---|---|---|
| U0 | baseline, tools 6.0, `[.v5]` | 0/0/1 | 0/0/1 |
| U2 | tools 6.2, loop, guard | 0/0/1 | 0/0/1 |
| U3 | probe `-strict-concurrency=complete` | 0/0/13 | |
| U3 | probe `-swift-version 6` | 1/9/1 | |
| U4 | manifest `StrictConcurrency` in 5 mode | 0/0/13 | 0/0/13 |
| U5a | `static let` of non-Sendable struct to computed `static var` (4 sites) | 0/0/9 | |
| U5b | `NSString` constant to computed var, 4 mutable globals behind `Mutex` | 0/0/4 | |
| U5c | `var` holding a lock to `let`, global cache behind existing lock type | 0/0/4 | |
| U5d | `Sendable` on 3 public value types | 0/0/1 | 0/0/1 |
| U6 | flip to `.v6`, 5-mode lines removed | 0/0/6 | 0/0/6 |
| U7 | `#filePath` defaults, `encoding:` overload, `public var` | 0/0/0 | 0/0/0 |
| U8 | 4 `migrate` runs, exits 0, 0, 0, 0 | 0/0/2 | 0/0/0 |
| U8 | `-warnings-as-errors` after the 4 runs | exit 1 | exit 0 |
| U8 | drop `@concurrent` from two closures | 0/0/0 | |
| U9 | features folded into the loop | 0/0/0, `-Werror` exit 0 | 0/0/0, `-Werror` exit 0 |

Per-name probe deltas in 5 mode (6.4, own-package warnings above the baseline of 1): `GlobalConcurrency` +7, `ConciseMagicFile` +4, `StrictConcurrency` (complete) +12, and 0 for `DisableOutwardActorInference`, `InferSendableFromCaptures`, `ForwardTrailingClosures`, `BareSlashRegexLiterals`, `DeprecateApplicationMain`, `ImportObjcForwardDeclarations`, `IsolatedDefaultValues`, `ImplicitOpenExistentials`, `RegionBasedIsolation`, `DynamicActorIsolation`, `NonfrozenEnumExhaustivity`, `GlobalActorIsolatedTypesUsability`. The [migration guide strategy page](https://raw.githubusercontent.com/swiftlang/swift-migration-guide/main/Guide.docc/MigrationStrategy.md) lists only three concurrency names (`DisableOutwardActorInference`, `GlobalConcurrency`, `InferSendableFromCaptures`); it does not list `ConciseMagicFile`, which was the only non-concurrency name with an effect here. The compiler's list is the 15 names with `"enabled_in": "6"` from `swiftc -print-supported-features` (matches SW-PKG-03).

Whole migration, baseline to U9: 10 files, +107 -69 lines, of which `Package.swift` +16.

### 4. swift-upgrade: `swift package migrate` on 6.4

Measured on 6.4.0 and 6.3 (the command exists on both; SwiftPM docs mark it [introduced in Swift 6.2](https://github.com/swiftlang/swift-package-manager) via `PackageMigrate.md` at `swift-package-manager@5546f44a3b52`).

```
$ swift package migrate --to-feature Bogus
error: Unsupported feature 'Bogus'. Available features: ExistentialAny, InferIsolatedConformances, MemberImportVisibility, NonisolatedNonsendingByDefault, StrictMemorySafety    # exit 64
$ swift package migrate --to-feature GlobalConcurrency
error: Feature 'GlobalConcurrency' is not migratable                                                            # exit 64
$ swift package migrate --targets Core --to-feature ExistentialAny
error: Unknown option '--targets'. Did you mean '--target'?                                                     # exit 64
$ swift package migrate --target SnapshotTestingCustomDump --to-feature MemberImportVisibility                 # exit 0, Package.swift +3
```

Behaviour table (fixture `upgrade-probe/`, 6.4):

| Situation | Exit | Effect |
|---|---|---|
| Clean tree, green build | 0 | build, apply fix-its, rewrite manifest per target |
| Dirty tree | 0 | fix-its and the pre-existing edit coexist in `git status`; the clean-tree precondition is not enforced |
| Existing build error | 1 | `error: cannot convert value...`; no migrate edits |
| `--scratch-path <existing dir>` | 0 | works on 6.3 and 6.4 (a fresh path was killed once with 137 under load, then exit 0 on retry) |
| Bare `swiftSettings: sharedVar` | 1 | rewrites sources then fails (SW-PKG-18/32 plant, not re-run) |

What `migrate` wrote for `NonisolatedNonsendingByDefault` (3 files, +17 -8): per-target `swiftSettings: [.enableUpcomingFeature("NonisolatedNonsendingByDefault")]` literals (the shared `for target in package.targets` loop was left alone and the two coexist), `@concurrent` on `withSnapshotTesting(operation:)` and `provideScope`, `@concurrent` on their closure parameters, and `{ @concurrent in` on two closures. With the feature on, the two `{ @concurrent in` closures call `TaskLocal.withValue(_:operation:isolation:file:line:)`, which 6.4 deprecates ("Prefer the 'nonisolated(nonsending)' overload"): 2 `[#DeprecatedDeclaration]` warnings, `-warnings-as-errors` exit 1. 6.3 had none. Removing `@concurrent in` from the two closures (the functions keep `@concurrent`) made 6.4 clean. The other three runs: `InferIsolatedConformances` and `MemberImportVisibility` changed only the manifest (0 fix-its here); `ExistentialAny` rewrote `PlistEncoder.swift` and `Any.swift` (+38 -35, `any` added).

`swiftc -print-supported-features` (6.4) is the authoritative table of what is migratable and when each name becomes default (`"enabled_in": "6"` for the 15 Swift-6 names, `"7"` for `ExistentialAny`, `InternalImportsByDefault`, `MemberImportVisibility`, `InferIsolatedConformances`, `NonisolatedNonsendingByDefault`, `ImmutableWeakCaptures`). Only `StrictMemorySafety` is `optional` and migratable.

Source: the command's own `--help` output on 6.4, [`Migrate.swift`](https://raw.githubusercontent.com/swiftlang/swift-package-manager/main/Sources/Commands/PackageCommands/Migrate.swift) (`.customLong("target")`, line 37), the [FeatureMigration guide page](https://raw.githubusercontent.com/swiftlang/swift-migration-guide/main/Guide.docc/FeatureMigration.md) (which writes `--targets` and warns that the feature is "in active development").

### 5. swift-upgrade: the fix ladder on a real package

Order is SW-CONC-28. Classes found in the fixture, with the rung used and the code. All were compiled on 6.4 and 6.3.

**Rung 1/2: delete the sharing, or return a fresh value.** A stored `static let` of a non-Sendable generic struct (4 sites: `Snapshotting<String, String>.lines`, `Diffing<String>.lines`, `Snapshotting<URLRequest, String>.raw` and `.curl`; original `String.swift:6,11`, `URLRequest.swift:23,78`).

```swift
// wrong in Swift 6 mode: error: static property 'lines' is not concurrency-safe because non-'Sendable' type 'Snapshotting<String, String>'
public static let lines = Snapshotting(pathExtension: "txt", diffing: .lines)
// lazy fix, compiles, adds a hatch
nonisolated(unsafe) public static let lines = Snapshotting(pathExtension: "txt", diffing: .lines)
// ladder fix: no shared state, source-compatible for callers
public static var lines: Snapshotting<String, String> {
  Snapshotting(pathExtension: "txt", diffing: .lines)
}
```
Same for `private let _plistNullNSString = NSString(string: _plistNull)` (`PlistEncoder.swift:2245`) to `private var _plistNullNSString: NSString { NSString(string: _plistNull) }`. Caveat: for a resilient or binary-distributed library this changes the symbol kind; the fixture package is source-only (unverified for library evolution).

**Rung 2: declare `Sendable` on public value types.** A public non-frozen struct is not implicitly `Sendable`. `public struct File: Hashable, Sendable`, `InlineSnapshot: Hashable, Sendable`, `InlineSnapshotSyntaxDescriptor: Hashable, Sendable` removed 3 `capture of 'x' with non-Sendable type ... in a '@Sendable' closure` warnings.

**Rung 2: `var` to `let`.** `public var inlineSnapshotState: LockIsolated<...> = LockIsolated([:])` is never reassigned; `public let` removes the diagnostic.

**Rung 5: `Mutex` for a mutable global.** Four sites (`__diffTool` `AssertSnapshot.swift:49`, `__record` `:83`, `registered` `:593`, `recordings` `Deprecations.swift:452`).

```swift
// wrong: error: var '__record' is not concurrency-safe because it is nonisolated global shared mutable state
public var __record: SnapshotTestingConfiguration.Record = { ... }()
// ladder fix: the public spelling is preserved as a computed property
private let recordStorage = Mutex<SnapshotTestingConfiguration.Record>({ ... }())
@_spi(Internals) public var __record: SnapshotTestingConfiguration.Record {
  get { recordStorage.withLock { $0 } }
  set { recordStorage.withLock { $0 = newValue } }
}
```
`import Synchronization` is required; on Apple platforms `Mutex` carries an OS availability floor that the package's `platforms: [.macOS(.v10_15)]` is below (unverified: read only). That is stop condition S2 below, not a reason to add `nonisolated(unsafe)`.

**A global cache of non-Sendable-looking values: reuse the package's own lock type.** `testSourceCache: [File: TestSource]` went behind the existing `LockIsolated` (rung 5 with a type already in the tree, so the justification pass still prints the same 2 legacy lines).

**What the lazy twin did instead** (`upgrade-lazy/`, builds green in Swift 6 mode): `nonisolated(unsafe)` on 10 declarations and `@unchecked Sendable` on 2 types, 13 added hatch lines in total. The compiler does not distinguish the two results. The check does:

```sh
git diff -U0 "$BASE" -- '*.swift' | awk '/^\+[^+]/ && /@unchecked[[:space:]]+Sendable|nonisolated\(unsafe\)|Task\.detached|@preconcurrency|MainActor\.assumeIsolated|MainActor\.run/'
# ladder result: no output.  lazy twin: 13 lines.  (awk exits 0 either way: the OUTPUT is the verdict.)
```

A reasoned, not run, trap in the `registered` fix: replacing the flag with `private static let registration: Void = { ...DispatchQueue.main.sync... }()` can deadlock when a background thread holds the once-initialiser and waits on the main queue while the main thread waits on the same initialiser. The `Mutex<Bool>` form avoids it. Reading heuristic only.

### 6. swift-upgrade: toolchain bump, `.swift-version`, CI image

The corpus has one exemplar of the whole pattern. `apple/containerization` pins `6.3.0` in `.swift-version` and derives the CI image from it: a job sparse-checks-out only `.swift-version` (`containerization@3e7bc39e66b3:.github/workflows/containerization-build-template.yml:26-30`) and emits `echo "image=swift:$(cat .swift-version)-noble" >> "$GITHUB_OUTPUT"` (`:34`); the build job uses `container: ${{ needs.swift-version.outputs.image }}` (`:49`-ish via `needs`). `swiftly` reads the same file by walking up to the nearest `.git` (`swiftly@c8cf2e35bfca:Sources/Swiftly/Use.swift:191,235`), and `swift-embedded-examples` has a workflow that opens a PR updating `.swift-version` (`swift-embedded-examples@119b29f83550:.github/workflows/update-swift-version.yml:12,57`). SW-GATE-08 owns the rule (one pinned patch, record `swift --version`, ship the bump with the regenerated formatter config); this section is the order.

Bump order: (1) change `.swift-version` and nothing else that names a version; (2) run the gate block (SW-GATE-01) on the new patch, because `swift format` and the compiler differ between patches (SW-GATE-08: `swift:6.3` floated to 6.3.3 during this research); (3) run the build on the previous line too if the package floor is below the new toolchain (SW-PKG-33); (4) run the dated re-checks (section 7); (5) only then raise the manifest floor. The plant:

```
bump/red/.github/workflows/ci.yml:6:    container: swift:6.3-noble          # grep exit 0, one line  = hard-coded image
bump/green/  (derived from .swift-version)                                    # grep exit 1, no output  = pass
grep -rn -e 'swift:[0-9]' -e 'swiftlang/swift:' --include='*.yml' --include='*.yaml' --include='Dockerfile' .
```

`swift package tools-version` prints the manifest floor; comparing it with `.swift-version` is a reading step (a shell comparison needs command substitution, which the shape rules forbid). The swiftly `use`/`install` commands were not run (no swiftly in the image: unverified: read only).

### 7. swift-upgrade: dated re-checks

Each probe is a three-line package that must keep failing; the step reports `STILL` while it fails with the pinned message and `FLIPPED` when it compiles. Run at every toolchain bump and every SwiftPM bump. Dated 2026-10-10, 6.4.0 and 6.3.

| Fact the rules pin | Probe | Pinned failure (6.4 and 6.3) | Rules affected |
|---|---|---|---|
| SE-0526 `withDeadline` is accepted, not shipped ([status: Accepted with modifications](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0526-deadline.md)) | `try await withDeadline(.now + .seconds(1)) { 1 }` | `error: cannot find 'withDeadline' in scope`, exit 1 | SW-CONC-24 (timeout helper) |
| SE-0540 `defaultSwiftSettings:` is accepted, not shipped ([status](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0540-default-target-settings.md), implementation [swiftlang/swift-package-manager#10033](https://github.com/swiftlang/swift-package-manager/pull/10033)) | `Package(... defaultSwiftSettings: [...])` | `error: extra argument 'defaultSwiftSettings' in call`, exit 1 | SW-PKG-01, SW-PKG-18 |
| SE-0529 `FilePath` in the stdlib is accepted, not shipped ([status](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0529-filepath-in-stdlib.md)) | `let p: FilePath = "/tmp/x"` with no import | `error: cannot find type 'FilePath' in scope`, exit 1 | SW-IO |
| T-V42 typed-throws `Task` closure crashes the frontend | `Task { () throws(E) in throw E() }` | `While evaluating request IRGenRequest`, `Please submit a bug report`, exit 1 | SW-CONC-03 |
| swift-syntax majors | `git ls-remote --tags https://github.com/swiftlang/swift-syntax` | latest release `604.0.0`, prereleases `605.0.0-prerelease-2026-09-15`; so lo 602 / hi 605 (SW-PKG-10) | SW-PKG-10, SW-PKG-34 |
| SwiftPM multiple majors | forum 86317 (not fetched) | unverified | SW-PKG-10 |

The FLIPPED path is real: the twin `typedtask-ok` (`Task { throw E() }`) printed `FLIPPED typedtask-ok (T-V42) exit=0`.

### 8. swift-upgrade: stop conditions, description, references

**Stop conditions** (stop and report; never hatch to pass them):

- **S1 Dependency source.** The errors sit in a package you do not own (probe `-swift-version 6` reports them in a dependency): stay on the manifest mode, do not flip that target, record the dependency and its version.
- **S2 Rung unavailable.** The highest applicable rung needs an API above the package's platform or tools floor (`Mutex` on an Apple floor below the OS that ships `Synchronization`, `weak let` below 6.3, `sending` below 6.0). Record the gap and the floor; do not drop to rung 8.
- **S3 Toolchain bug.** A diagnostic or crash reproduces as a frontend crash (T-V42): minimise, record the probe, wait; do not rewrite around it in shared code.
- **S4 Behaviour change.** `NonisolatedNonsendingByDefault` or a `migrate` fix-it changes a public async signature (`@concurrent` added to public API): stop for a human, it is source and ABI visible.
- **S5 Count does not fall.** Two consecutive ladder classes leave the count unchanged or higher: stop and re-read the diagnostics instead of widening the change.
- **S6 Red re-gate on the floor toolchain** (U9) that is green on the current one or the reverse: report both legs; do not add `#if compiler` splits (SW-CONC owner default 5).

**Description (trigger phrases, 2026-10-10):** name the exact phrase "Swift 6 concurrency migration", plus: Swift 6 language mode, strict concurrency, `StrictConcurrency`, `swiftLanguageModes`, `swift package migrate`, upcoming feature, `NonisolatedNonsendingByDefault`, `ExistentialAny`, `MemberImportVisibility`, bump the Swift toolchain, `.swift-version`, `swift-tools-version`, "is not concurrency-safe because", "this is an error in the Swift 6 language mode", Sendable errors after upgrading. Negative triggers: writing new concurrency code (rules), diagnosing a crash or hang (swift-diagnose), cutting a release (swift-release).

**references/ split.** SKILL.md carries the order, U0 to U10 with their commands, stop conditions, the receipt. `references/ladder-cases.md` (the five classes with wrong, lazy and ladder code), `references/feature-table.md` (the 21 upcoming names, `enabled_in`, `migratable`, probe deltas, the probe command), `references/dated-rechecks.md` (the probes and the recheck script, with the date and expected output), `references/toolchain-pin.md` (the containerization derivation, the bump order).

### 9. swift-diagnose: the decision tree

Inputs available from the symptom alone: build-time or run-time; exit code; first non-empty stderr lines; for hangs, CPU and the SIGQUIT dump. Measured by `classify.sh` over `symptoms.sh` output, 17 planted failures plus `ok`.

| Exit | Branch test (first match) | Label | Rule to open |
|---|---|---|---|
| build | `unable to type-check this expression in reasonable time` or a slow build | slow or failing type-check | [section 14](#14-swift-diagnose-slow-and-failing-type-checks) |
| 0 | stdout differs between two runs | race suspect, rerun under TSan | SW-CONC-27, SW-TEST-17 |
| 66 | stderr has `ThreadSanitizer` | data race (or the known `Mutex` false positive) | SW-CONC-02, SW-CONC-27 |
| 124 | stderr has `leaked its continuation` | continuation leak | SW-CONC-22 |
| 124 | CPU at or above 50 percent | spin | SW-CONC-15 |
| 124 | SIGQUIT dump has `_dispatch_sema4_wait` (or `pthread_cond_wait`, `futex_wait`) | blocked thread, semaphore or lock | SW-CONC-15 |
| 124 | none of the above | idle, no user frame: lost wakeup or unresumed continuation | SW-CONC-22 |
| 132 | `Precondition failed` or `precondition failure` | `precondition` | SW-ERR-08 and the SW-ERR trap policy |
| 132 | `Unexpectedly found nil` | force unwrap | SW-ERR-05 |
| 132 | `Error raised at top level` | throw out of an entry point | SW-CLI-02 |
| 132 | `tried to resume its continuation more than once` | continuation double resume | SW-CONC-22 |
| 132 | `Swift runtime failure` (no `Fatal error` line) | runtime trap such as arithmetic overflow | SW-ERR |
| 133 | | arm64 trap (reported in cited threads; unverified: read only) | SW-ERR-08 |
| 134 | `double free`, `corrupted`, `invalid pointer`, `malloc(): ` | heap corruption in C code | SW-ERR, C interop |
| 134 | otherwise | `abort()` or an uncaught C++ exception | |
| 137 | (no message) | SIGKILL: OOM kill, `timeout -k`, `kill -9`; no backtrace exists | |
| 139 | same frame repeated 20 or more times | stack overflow (fault address near `rsp`) | |
| 139 | `Bad pointer dereference at 0x0000000000000000`, frame 0 in C | null dereference in a C call | |
| 141 | (no message) | SIGPIPE: the reader closed | SW-CLI-08 |
| 143 | (no message) | unhandled SIGTERM | SW-CLI |
| 130 | | SIGINT | SW-CLI-10 |
| 1 | | an ordinary reported error | SW-CLI-01 |

Result on the planted matrix ([Verification runs](#verification-runs) V14): 17 of 17 right on 6.4, 17 of 17 on 6.3, 7 of 7 on a release build; the exit-code-only twin `classify-naive.sh` took the wrong branch 11 of 17 and 5 of 7. `timeout` (uutils in the Ubuntu 26.04 image) returns 124 whatever signal it sent, so 124 means "timed out" and never "SIGTERM".

### 10. swift-diagnose: crash signatures, debug and release

Debug build, 6.4 (6.3 identical):

| Subcommand | rc | First lines of stderr |
|---|---|---|
| `precondition` | 132 | `faults/main.swift:16: Precondition failed: zero must be positive` |
| `unwrap` | 132 | `faults/main.swift:17: Fatal error: Unexpectedly found nil while unwrapping an Optional value` |
| `overflow` | 132 | `*** Signal 4: Backtracing ... ***` then `*** Swift runtime failure: arithmetic overflow ***` |
| `doubleresume` | 132 | `_Concurrency/CheckedContinuation.swift:169: Fatal error: SWIFT TASK CONTINUATION MISUSE: doubleResume_() tried to resume its continuation more than once` |
| `throwtop` | 132 | `Swift/ErrorType.swift:254: Fatal error: Error raised at top level: faults.Boom()` |
| `segv` (C call) | 139 | `*** Program crashed: Bad pointer dereference at 0x0000000000000000 ***`, frame 0 `cfault_segv + 12 in faults at ...cfault.c:2:40` |
| `recurse` | 139 | same header, fault address `0x00007ffd...`, frames 0 to 12+ all `recurse_(_:) + 63` |
| `abort` | 134 | `*** Program crashed: Aborted ***` |
| `doublefree` | 134 | `free(): double free detected in tcache 2` before the backtrace |
| `sigpipe` (reader `head -n 1`) | 141 | no output |
| `kill9` | 137 | no output |
| `leak` | 124 under `timeout 5` | `SWIFT TASK CONTINUATION MISUSE: leak_() leaked its continuation without resuming it.` |

Release build (`swift build -c release`), 6.4: the message text moves. `unwrap` prints `*** Swift runtime failure: Unexpectedly found nil while unwrapping an Optional value ***` and no `Fatal error:` line; `precondition` prints `*** Program crashed: Illegal instruction ***` and frame 0 reads `Swift runtime failure: precondition failure`, with the message string `zero must be positive` gone; frames still carry `main.swift:16:24` because SwiftPM builds with debug info. The classifier therefore matches both `Precondition failed` and `precondition failure`.

The exit codes follow SW-ERR-08 (132 trap on x86_64) and SW-CLI-01/02; SIGPIPE 141 versus the fleet's exit 0 is SW-CLI-08. Source of the code-to-signal mapping: `128 + n`; the backtracer handles signals 3, 4, 5, 6, 8, 10, 11 ([Backtracing.rst, Signal Handling](https://github.com/swiftlang/swift/blob/main/docs/Backtracing.rst)).

### 11. swift-diagnose: the backtracer on Linux

The documented keys ([Backtracing.rst](https://github.com/swiftlang/swift/blob/main/docs/Backtracing.rst)): `enable` (default `yes` on Linux; `tty` on macOS 26 and later, `no` earlier), `interactive` (`tty`), `color` (`tty`), `timeout` (30s), `preset` (`friendly`, `medium`, `full`; `auto` is `full` when not interactive), `threads` (`all` or `crashed`), `registers`, `images`, `symbolicate` (`full`, `fast`, `off`), `format` (`text` or `json`), `output-to` (`stderr`, `stdout`, or a path; a directory gets unique file names), `limit` 64 and `top` 16, `sanitize`, `swift-backtrace`. Linux unwinds by frame pointer, so `-Xcc -fno-omit-frame-pointer` gives complete traces on optimised Intel builds.

Measured on 6.4 and 6.3:

| Setting | `unwrap` rc | `segv` rc | `segv` stderr |
|---|---|---|---|
| unset | 132 | 139 | 52 lines, header `*** Signal 11: Backtracing from ... done ***` |
| `enable=no` | 132 | 139 | 0 lines (the runtime message for `unwrap` stays, 14 lines) |
| `enable=yes,interactive=no,color=no,format=json,output-to=<file>` | 132 | 139 | 3 lines; a 4.1 KB `crashReport` JSON in the file |

So: the exit code never depends on the variable; evidence does. An empty stderr with 139 means check `SWIFT_BACKTRACE` in the environment, the Dockerfile and the unit before concluding there is nothing to read. `swift-testing` sets `SWIFT_BACKTRACE=enable=no` in exit-test children on purpose ("to reduce the noise level", `swift-testing@c7d68ca20cd7:Sources/Testing/ExitTests/ExitTest.swift:887-890`). In CI use `enable=yes,interactive=no,color=no` (the [5.9 backtrace post](https://swift.org/blog/swift-5.9-backtraces/) says interactive mode triggers only when stdin and stdout are both terminals). The static Linux SDK needs `swift-backtrace-static` installed next to the binary and ptrace-related kernel settings (Alastair Houghton's reply in the [forum thread](https://forums.swift.org/t/unable-to-generate-a-backtrace-using-swift-6-static-linux-sdk/74215)); not reproduced here (unverified: read only). On macOS the backtracer is off by default and needs `com.apple.security.get-task-allow` (doc, unverified: read only).

### 12. swift-diagnose: capturing a hang

The question "does SIGQUIT print a backtrace?" has a two-part answer, both measured (6.4 and 6.3, Linux).

1. **Yes, and the process survives.** With `SWIFT_BACKTRACE` unset or `enable=yes`, `kill -QUIT <pid>` prints `*** Signal 3: Backtracing from 0x... done ***`, `*** Program crashed: Terminated ***` and every thread (`Thread 0 "faults" crashed:` is the dump's label, not a crash), and the process stays alive and hung (alive 8 seconds later; the harness then sent SIGKILL, rc 137). With `enable=no`, SIGQUIT keeps its default action: rc 131.
2. **Not if it was started with a bare `&`.** In a non-interactive shell a background child inherits SIGINT and SIGQUIT as `SIG_IGN`; `/proc/<pid>/status` shows `SigIgn: 0000000000000006` and the Swift runtime installs no handler for a signal that is already handled or ignored ([Backtracing.rst](https://github.com/swiftlang/swift/blob/main/docs/Backtracing.rst): "the runtime will not install its signal handlers for a signal if it finds that there is already a handler"). `kill -QUIT` then does nothing and also `kill -INT` does nothing.

| Launch style | `SigIgn` of the child |
|---|---|
| `cmd &` | `0000000000000006` |
| `setsid cmd &` | `0000000000000006` |
| `nohup cmd &` | `0000000000000007` |
| `set -m; cmd &` | `0000000000000000` |

Reading the dump for the three hangs (all rc 124 under `timeout 5`):

| Hang | stderr during the hang | CPU at 2 s | Thread 0 in the dump |
|---|---|---|---|
| `leak` | `SWIFT TASK CONTINUATION MISUSE: leak_() leaked its continuation without resuming it` | 0.0 | `sigsuspend` in the runtime, 3 idle `DispatchWorker` threads, no frame of the program |
| `semaphore` (main actor blocked on a semaphore only a main-actor task can signal) | none | 0.0 (`futex_do_wait`) | `_dispatch_sema4_wait` then `_dispatch_semaphore_wait_slow` then `semaphore_() + 241 in faults at ...main.swift` |
| `spin` | none | 98 | `spin_() + 57 in faults at ...main.swift` |

Under `swift test` the process to signal is the test runner child, not the driver: on 6.4 (default `--build-system swiftbuild`) it is `<Target>-test-runner` under `.../out/Products/Debug-linux-x86_64/`; on 6.3 (native) it is `<pkg>PackageTests.xctest`. The hang symptom is `◇ Test hangsForever() started.` with no `passed` or `failed` line plus the leak line. `kill -QUIT <runner pid>` put the dump into the `swift test` log and the driver exited 1 afterwards when the runner was killed. A SIGQUIT sent to `swift-test` itself dumps the driver (not measured; the run signalled the child). `timeout 60 swift test` exit 124 is the leak signal of SW-CONC-22; `timeout` kills the driver only (not measured whether the runner is reaped).

### 13. swift-diagnose: sanitizers and flaky tests

TSan on a built executable: `swift build --sanitize=thread --scratch-path "$SWIFT_SCRATCH/upgrade-and-diagnose/<name>"` then run the binary. The Docker default seccomp breaks TSan ("incompatible memory layout"); `run.sh` passes `--security-opt seccomp=unconfined` (SW-TEST-17, SW-CONC-27). Measured (6.4 and 6.3):

| Plant | plain rc | plain stdout | TSan rc | TSan stderr |
|---|---|---|---|---|
| `race` (`@unchecked Sendable` counter, 4 tasks) | 0 | five runs: 432117, 485920, 552443, 647070, 712743 (expected 800000) | 66 | `WARNING: ThreadSanitizer: Swift access race` |
| `mutexok` (`Mutex<Int>`, correct) | 0 | five runs: `count=200000` | 66 | the same report (known false positive, SW-CONC-27) |
| `ok` | 0 | | 0 | |

66 is TSan's default `exitcode` ([ThreadSanitizerFlags](https://github.com/google/sanitizers/wiki/ThreadSanitizerFlags): "Override exit status of the process if something was reported", default 66); `halt_on_error` defaults to 0. `swift test --sanitize=thread` exits 1 instead (SW-TEST-17). Disambiguation rule: a TSan report on a `Mutex`-guarded type plus an exact count over five plain runs is the false positive; a wrong or varying count is a race. TSan stays an advisory CI leg (SW-TEST-17); in diagnosis it is authoritative. ASan was not re-run (SW-TEST-17 owns it). Flake triage order is SW-TEST-14 (`--no-parallel`, then `--repeat-until fail --maximum-repetitions 100` on 6.4).

### 14. swift-diagnose: slow and failing type-checks

Plant: an array of N dictionary literals (`["k": 0, "v": 0.5 * 2, "s": "x0"]`) in `diagnose/Sources/faults/main.swift` behind `-DSLOW` (N=5), `-DSLOWER` (N=20), `-DSLOWFIXED` (N=20 with `let r: [[String: any Sendable]] = [...]`). Growth is steep: N=3 fast, N=4 346 ms, N=5 3168 ms, N=6 exceeded the solver budget (error).

| Variant | Flags | Exit | Wall | Relevant line |
|---|---|---|---|---|
| `SLOW` | none | 0 | 13.5 s | (silent) |
| `SLOW` | `-Xswiftc -Xfrontend -Xswiftc -warn-long-expression-type-checking=100` | 0 | 6.5 s | `warning: expression took 2585ms to type-check (limit: 100ms)` |
| `SLOW` | `... -warn-long-function-bodies=100` | 0 | 5.8 s | `warning: global function 'slowtc_()' took 2764ms to type-check (limit: 100ms)` |
| `SLOW` | expression flag plus `-Xswiftc -warnings-as-errors` | 1 | | `error: expression took 3791ms to type-check (limit: 100ms)` |
| `SLOWFIXED` | same | 0 | 3.6 s | (silent) |
| `SLOWER` | expression flag | 1 | 14.5 s | `error: the compiler is unable to type-check this expression in reasonable time; try breaking up the expression into distinct sub-expressions` |

6.3 gave the same exits and shapes (SLOW 3436 ms, SLOWER error). Two further facts:

- **The error can mask a real type error.** `Double(a) + 2 + b * 1.5 + Float(a) + Double(c) / 2 + 3.25` failed after 4128 ms with the "unable to type-check" message; splitting it showed `error: binary operator '+' cannot be applied to operands of type 'Double' and 'Float'` in 74 ms; wrapping `Double(Float(a))` compiled (79 ms). First move: split the expression and read the first real error.
- **The cheap fixes are structure, not limits.** Annotating the literal's type or using a struct made the 20-element case compile in 59 to 75 ms. Raising any solver threshold is not a fix.

The flags need the `-Xswiftc -Xfrontend -Xswiftc` triple prefix through SwiftPM; in a manifest they are `unsafeFlags` (SW-PKG-04, root only). Corpus: no repository's own build uses them; Tuist's test data mentions `-warn-long-function-bodies=100` as a build setting it generates (`tuist@2f6ac74754bf:cli/Tests/TuistGeneratorTests/Mappers/XcodeCacheSettingsProjectMapperTests.swift:470`).

### 15. swift-diagnose: stop conditions, description, references

**Consent first (mirror of go-diagnose).** On a process the operator named: `kill -QUIT` is non-destructive on Linux when the backtracer is on (process survives), `kill -KILL` destroys it, `SWIFT_BACKTRACE` changes need a restart, a TSan or release rebuild is a different binary. On a production process, print the command and cost and stop absent consent.

**Stop condition:** (1) root cause named as a mechanism ("main-actor task blocked on a `DispatchSemaphore` only a main-actor task can signal", not "a deadlock"); (2) the evidence pasted: command and verbatim lines (exit code, first message line, the dump frames); (3) the fix watched to clear the same measurement, or a named gap with the toolchain version; (4) nothing else changed to get there.

**Never edit the check** (violations, not fixes): setting `SWIFT_BACKTRACE=enable=no` to quiet a crash; raising `timeout`; adding `Task.sleep` so a race or hang stops reproducing; wrapping the call in `try?`; adding a `nonisolated(unsafe)` to quiet TSan; removing `-warnings-as-errors` or `-warn-long-expression-type-checking` to make the build green; switching off the sanitizer leg. Each cites SW-GATE-12 (weakening needs a written justification).

**Description (trigger phrases):** "Illegal instruction", "Segmentation fault", "Fatal error:", "Backtracing from", "exit code 132", 134, 137, 139, 141, 143, 124, "hangs", "stuck", "deadlock", "never finishes", "swift test hangs", "SWIFT TASK CONTINUATION MISUSE", "ThreadSanitizer", "data race", "crashes with no output", "SIGPIPE", "swift build is slow", "unable to type-check this expression in reasonable time". Negative: standards (swift-quality), a Swift version bump (swift-upgrade), a release (swift-release).

**references/ split.** SKILL.md: consent, stop condition, never-edit table, Step 0 build identity (`swift --version`, build configuration, `echo "$SWIFT_BACKTRACE"`), the route table of section 9, branches A crash, B hang, C race, D build-time, the receipt. `references/crash-signatures.md` (section 10 tables, debug and release), `references/hang-capture.md` (section 12, the `set -m` launch, test-runner process names), `references/backtrace-settings.md` (section 11), `references/typecheck.md` (section 14). Sanitizer commands stay in SKILL.md (short, cite SW-TEST-17).

### 16. Corrections to earlier consolidations

These are measured contradictions of settled text; the drafters should fix the cited rules.

- **SW-PKG-32** writes `swift package migrate --to-feature NAME [--targets T]`: the flag is `--target` (singular, comma-separated); `--targets` exits 64.
- **SW-CONC-07** says `swift package migrate` takes no `--scratch-path`: on 6.4 and 6.3 it accepts one (exit 0, applied 0 fix-its on an unaffected feature). SwiftPM's own docs list it (`swift-package-manager@5546f44a3b52:Sources/PackageManagerDocs/Documentation.docc/Package/PackageMigrate.md`).
- **SW-PKG-18** says the shared loop is what `migrate` handles: `migrate` leaves the loop alone and writes per-target literals, so the loop and the literals coexist until folded (step U9).
- **SW-GATE-10** justification pass: usable as written only on a tree with no legacy hatches; on an adopted tree use the delta form of section 5 (2 legacy lines before and after, 12 on the lazy twin).
- **SW-CLI-02** "exit 132 on top-level throw" holds on the debug and release builds of the fixture (`throwtop`, rc 132 in both).
- **SW-TEST-17 and the topic map** want a TSan verdict from `gates/lint-carriers-and-sanitizers`; that dive was not on disk when this was written, so the verdict here is the fixture's: rc 66 on the race and on the correct `Mutex` plant, both toolchains.

## Normative guidance candidates

Format: rule, why, how a reviewer VERIFIES it, and whether it was RUN against a planted violation (fixture under `/home/mherwig/.cache/research-lang/swift-tools/fixtures/upgrade-and-diagnose/`). Where the shape rules forbid a command (command substitution), the check is a named reading heuristic and says so.

### swift-upgrade

1. **Record a baseline before the first edit.** Clean tree, green build, the warning count and the hatch count written down (SW-GATE-10 pass, legacy lines). Why: step U7's "zero" and the hatch delta are meaningless without it. Verify: `git status --porcelain` prints nothing; the receipt carries U0 numbers. RUN: yes (`upgrade/`, baseline 0/0/1, 2 legacy hatch lines).

2. **Pin the toolchain in `.swift-version` and derive the CI image from it.** No hard-coded `swift:<version>` tag in workflows or Dockerfiles. Why: a bump is then one edit and `swift:6.3` floating to 6.3.3 cannot split legs (SW-GATE-08). Verify, output is the violation: `grep -rn -e 'swift:[0-9]' -e 'swiftlang/swift:' --include='*.yml' --include='*.yaml' --include='Dockerfile' .`. RUN: yes (`bump/red` exit 0 with `ci.yml:6`, `bump/green` exit 1 empty).

3. **Raise the manifest floor, centralise settings and add the typo guard before touching any feature.** Tools 6.2, one `for target in package.targets` loop, `.treatWarning("StrictLanguageFeatures", as: .error)` (SW-PKG-11, 12, 18, 02). Why: an unknown feature name is silently ignored without the guard. Verify: `grep -rL --exclude-dir='.build' -e 'treatWarning("StrictLanguageFeatures", as: .error)' --include='Package.swift' .` prints nothing; misspell a name and `swift build` exits 1. RUN: yes (`ExistentalAny` typo: exit 1 with the guard, 0 without).

4. **Probe every candidate upcoming feature with a flag before editing the manifest; enable only names with a non-zero delta.** `swift build --scratch-path "$SWIFT_SCRATCH/upgrade-and-diagnose" -Xswiftc -enable-upcoming-feature -Xswiftc NAME`, count unique own-package diagnostics. Why: 13 of the 15 Swift-6-group names added nothing; `ConciseMagicFile` added 4 warnings the concurrency checking never shows. Verify: the per-name counts in the receipt; named reading heuristic for completeness (the list is the `"enabled_in": "6"` set of `swiftc -print-supported-features`). RUN: yes (12 probes on 6.4, table in section 3).

5. **Enable complete checking in 5 mode through the manifest with `.enableUpcomingFeature("StrictConcurrency")`; use `-Xswiftc -strict-concurrency=complete` and `-Xswiftc -swift-version -Xswiftc 6` only as probes.** Why: the flags reach dependencies; the manifest does not. Verify: `grep -rn -e '-swift-version' --include='*.yml' --include='*.sh' --include='Makefile' .` prints nothing in committed scripts. RUN: partly (probe numbers 13 and 9 reproduced; the dependency blast radius is audit-measured, not re-run).

6. **Resolve each Sendable diagnostic at the highest applicable ladder rung and add no hatch.** SW-CONC-28 order. Why: the lazy twin built green with 13 added hatches; only a check on added lines tells the two results apart. Verify, output is the violation: `git diff -U0 "$BASE" -- '*.swift' | awk '/^\+[^+]/ && /@unchecked[[:space:]]+Sendable|nonisolated\(unsafe\)|Task\.detached|@preconcurrency|MainActor\.assumeIsolated|MainActor\.run/'`. RUN: yes (`newhatches.sh b36158f`: ladder `upgrade/` 0 lines, lazy `upgrade-lazy/` 13 lines).

7. **For a non-Sendable value that is only read, return a fresh value from a computed `static var` before reaching for a lock or a hatch.** Why: 4 `static let` sites and one `NSString` constant disappeared with no shared state. Verify: build exit 0 and the diagnostic gone; reading heuristic that the type is not part of a resilient or binary interface. RUN: yes (13 to 9 to 4).

8. **Never replace a diagnosed `static let` with a once-initialised `static let` that blocks on another thread (for example `DispatchQueue.main.sync`).** Why: reasoned deadlock between the initialiser lock and the main queue. Verify: reading heuristic. RUN: no.

9. **Flip to Swift 6 mode in the commit that removes the 5-mode `enableUpcomingFeature` lines of the Swift-6 group.** SW-PKG-03, SW-PKG-14. Verify, output is the violation: `grep -rn -e 'swiftLanguageModes: \[.v5\]' -e 'enableUpcomingFeature("StrictConcurrency")' --include='Package*.swift' .`. RUN: yes (prints 2 lines at `552dd85`, nothing at the final tree).

10. **After the flip, clear non-concurrency warnings and gate with `-Xswiftc -warnings-as-errors` on the current and floor toolchains.** Why: the flip surfaced `#file` versus `#filePath` mismatches (4), a deprecation (1), and exposed one old warning as an error. Verify: `swift build -Xswiftc -warnings-as-errors` exits 0 on 6.4 and 6.3 (SW-GATE-13). RUN: yes (exit 1 at `803ee85`, exit 0 at `5d86394`, both toolchains).

11. **Adopt post-6 upcoming features one at a time with `swift package migrate --to-feature NAME`, only for migratable names, never by pasting the name.** On 6.4 the set is `ExistentialAny`, `InferIsolatedConformances`, `MemberImportVisibility`, `NonisolatedNonsendingByDefault`, `StrictMemorySafety`. Why: SW-CONC-07; `GlobalConcurrency` exits 64. Verify: `swift package migrate --to-feature Bogus` prints the available set (exit 64); the diff after each run is reviewed. RUN: yes (four runs, exits 0; Bogus 64; GlobalConcurrency 64).

12. **Spell the target flag `--target` and run `migrate` only from a clean tree and a green build.** Why: `--targets` exits 64; a dirty tree mixes edits; a build error exits 1. Verify, output is the violation: `grep -rn -e 'migrate --targets' --include='*.sh' --include='*.md' --include='*.yml' .` and `git status --porcelain` before each run. RUN: yes (`greps/red` exit 0, `greps/green` exit 1; dirty-tree run exit 0 with mixed edits; build-error run exit 1).

13. **Re-gate on the current toolchain after every `migrate`, and fix generated code that uses an API the current toolchain deprecates.** Why: `{ @concurrent in` closures called a 6.4-deprecated `TaskLocal.withValue` overload: `-warnings-as-errors` exit 1 on 6.4, 0 on 6.3. Verify: `swift build -Xswiftc -warnings-as-errors` on both toolchains. RUN: yes (6.4 exit 1 then 0 after the edit; 6.3 exit 0).

14. **Fold the per-target literals `migrate` writes into the shared loop.** Why: `migrate` does not edit the loop; the duplication drifts. Verify, output is the violation: `grep -rn -e 'swiftSettings: \[' --include='Package.swift' .`; `swift package dump-package` lists the names on every target. RUN: yes (3 hits at `441dd75`, none at `8f4792d`).

15. **Judge a migration by the delta of the hatch pass, not its whole-tree output, on an adopted tree.** Why: the pass printed the same 2 legacy lines before and after, and 12 on the lazy twin. Verify: `git ls-files -z --cached --others --exclude-standard -- '*.swift' ':(exclude)Tests' | xargs -r -0 awk '...'` (SW-GATE-10 text) before and after, line numbers stripped; or rule 6. RUN: yes (2 / 2 / 12).

16. **Run the four dated re-check probes at every toolchain bump; a probe that stops failing means the rules are stale.** SE-0526, SE-0540, SE-0529, T-V42. Verify: `swift build --scratch-path "$SWIFT_SCRATCH/upgrade-and-diagnose"` in each probe package prints the pinned message and exits 1. RUN: yes (STILL x4 on 6.4 and 6.3; FLIPPED on the twin).

17. **Stop instead of hatching when a stop condition fires (S1 to S6).** Verify: named reading heuristic; the receipt lists the condition and the diagnostics left. RUN: no.

### swift-diagnose

18. **Classify a crash by exit code and the first message line together, never by the code alone.** Why: 132 covers six causes, 124 three, 134 two; the exit-code-only tree was wrong 11 of 17 (debug) and 5 of 7 (release). Verify: replay the route table of section 9 on the symptom file; named reading heuristic with the fixture matrix as the proof. RUN: yes (`diagnose/matrix.sh`: full tree 0 wrong on 6.4, 6.3; `matrix-rel.sh` 0 wrong; naive 11 and 5 wrong).

19. **In release builds do not search for the `Fatal error:` text of a trap; match `Swift runtime failure: ...` and read the first user frame's `file:line`.** Why: the `precondition` message is dropped in `-c release` (frame 0 says `precondition failure`). Verify: `swift build -c release`, run, read frame 0. RUN: yes (`symrel/precondition.txt`).

20. **Keep the backtracer on while diagnosing: unset `SWIFT_BACKTRACE` or use `enable=yes,interactive=no,color=no`; never `enable=no` in a Dockerfile, unit or CI file for a process you will diagnose.** Why: exit codes are identical; the segfault's 52-line report becomes 0 lines. Verify, output is the violation: `grep -rn -e 'SWIFT_BACKTRACE=enable=no' -e 'SWIFT_BACKTRACE: enable=no' --include='Dockerfile' --include='*.yml' --include='*.yaml' --include='*.sh' .` (exit-test children set it deliberately, `swift-testing@c7d68ca20cd7:Sources/Testing/ExitTests/ExitTest.swift:887-890`). RUN: yes (`greps/red` exit 0 with the line, `greps/green` exit 1).

21. **Start a process you may need to dump under job control (`set -m`), and confirm `SigIgn` clears bits 2 and 3 before relying on SIGQUIT.** Why: a bare `&` leaves SIGQUIT ignored (`0000000000000006`) and the dump never comes. Verify: `grep -e SigIgn /proc/$PID/status` must show a mask with 0x6 clear. RUN: yes (`sigign.sh`: `&` and `setsid` 6, `nohup` 7, `set -m` 0).

22. **Capture a hang with `kill -QUIT <pid>` of the real process, then read thread 0; use SIGKILL last.** On 6.3 and 6.4 Linux the process survives the dump. Why: no destructive step is needed to find the blocked frame. Verify: stderr contains `Signal 3: Backtracing`; `kill -0 <pid>` still succeeds. RUN: yes (alive after QUIT on `semaphore`, `spin`, `leak`, and on the `swift test` runner).

23. **Under `swift test`, signal the test runner child (`<Target>-test-runner` on 6.4, `<pkg>PackageTests.xctest` on 6.3), not `swift-test`.** Verify: `ps -eo pid,ppid,stat,pcpu,args` shows the child of `swift-test`. RUN: yes (6.4 and 6.3 hangtest; the dump appears in the test log).

24. **For exit 124, branch on the leak line, then CPU, then the dump frame.** `leaked its continuation` leads to SW-CONC-22; CPU at or above 50 percent to a spin; `_dispatch_sema4_wait` in thread 0 to SW-CONC-15; otherwise idle with no user frame is a lost wakeup (SW-CONC-22). Verify: the three plants classify right. RUN: yes (`matrix.sh`).

25. **Treat 137, 141 and 143 as "no backtrace exists" exits and look outside the program.** 137 SIGKILL (OOM, `timeout -k`), 141 closed reader (SW-CLI-08), 143 unhandled SIGTERM (SW-CLI). Verify: stderr empty and the code matches; run `kill -TERM` and `kill -INT` against a spinning plant to confirm 143 and 130. RUN: yes (`sigterm.sh`: 143, 130; `sigpipe` 141; `kill9` 137).

26. **Treat rc 0 with nondeterministic output as a race suspect: run twice, compare, then run a `--sanitize=thread` build.** Verify: two plain runs differ; TSan build exits 66 with `ThreadSanitizer`. RUN: yes (`race`).

27. **Confirm a TSan report on `Mutex`-guarded code with an exact count over five plain runs before calling it a race.** Why: known false positive on 6.3 and 6.4 (SW-CONC-27, SW-TEST-17). Verify: the counts. RUN: yes (`mutexok`: 66 under TSan, `count=200000` x5 plain; `race`: five different counts).

28. **On `unable to type-check this expression in reasonable time`, split the expression and read the first real error before touching anything else.** Why: the message masked a `Double` plus `Float` error (4128 ms versus 74 ms). Verify: named reading heuristic. RUN: yes.

29. **Gate expression cost with a budget: `swift build -Xswiftc -Xfrontend -Xswiftc -warn-long-expression-type-checking=100 -Xswiftc -warnings-as-errors`.** Fix by annotating or restructuring, never by raising a limit. Verify: that command exits 0. RUN: yes (SLOW exit 1, 3791 ms; SLOWFIXED exit 0; 6.4 and 6.3).

30. **Report with the five-block receipt and name every rule ID relied on.** Symptom in the reporter's words; build identity (`swift --version`, configuration, `SWIFT_BACKTRACE`); root cause with toolchain version; verbatim evidence (two readings when a fix was applied); fix with rule ID or a named gap. Verify: named reading heuristic. RUN: no.

## Verification runs

Fixture root: `/home/mherwig/.cache/research-lang/swift-tools/fixtures/upgrade-and-diagnose/`. `R` is `/home/mherwig/.cache/research-lang/swift-tools/run.sh`; `B` is `--scratch-path "$SWIFT_SCRATCH/upgrade-and-diagnose/<name>"`. A run "went red" when the violation exited non-zero or printed the violation; "green" is the twin.

| # | Fixture and command | Violation | Compliant twin | Relevant output |
|---|---|---|---|---|
| V01 | `upgrade/`: `R swift build B` at `b36158f` | | exit 0, 1 warning | `Any.swift:205:5: warning: non-'@objc' property declared in extension cannot be overridden; use 'public' instead` |
| V02 | `upgrade/`: `R swift build B -Xswiftc -swift-version -Xswiftc 6` | exit 1, 9 errors | | `error: var '__diffTool' is not concurrency-safe because it is nonisolated global shared mutable state` |
| V03 | `upgrade/`: `R swift build B -Xswiftc -strict-concurrency=complete` | | exit 0, 13 warnings | |
| V04 | `upgrade/`: `R swift package migrate --to-feature GlobalConcurrency` | exit 64 | | `error: Feature 'GlobalConcurrency' is not migratable` |
| V05 | `upgrade-probe/`: `R swift package migrate --to-feature Bogus` | exit 64 | | `Available features: ExistentialAny, InferIsolatedConformances, MemberImportVisibility, NonisolatedNonsendingByDefault, StrictMemorySafety` |
| V06 | `upgrade-probe/`: `R swift package migrate --targets SnapshotTesting --to-feature ExistentialAny` / `--target ...` | exit 64 / exit 0 | | `error: Unknown option '--targets'. Did you mean '--target'?` |
| V07 | `upgrade-probe/`: `migrate` on a dirty tree / with a planted `let broken: Int = "x"` | exit 0 with mixed edits / exit 1, no migrate edits | | `Diff.swift:132:19: error: cannot convert value of type 'String' to specified type 'Int'` |
| V08 | `upgrade/`: `ExistentalAny` typo with and without `StrictLanguageFeatures` guard | exit 1 | exit 0 | `error: 'ExistentalAny' is not a recognized upcoming feature [#StrictLanguageFeatures::UnrecognizedStrictLanguageFeatures]` |
| V09 | `upgrade/`: `R swift build B -Xswiftc -warnings-as-errors` at `803ee85` (flipped, 6 warnings) | exit 1 | `5d86394`: exit 0 | `error: non-'@objc' property declared in extension cannot be overridden` |
| V10 | `upgrade/` after 4 `migrate` runs, same command, 6.4 | exit 1, 2 warnings | `9f1bddb`: exit 0; 6.3 exit 0 | `'withValue(_:operation:isolation:file:line:)' is deprecated ... [#DeprecatedDeclaration]` |
| V11 | `upgrade/` final, `build` and `build -Xswiftc -warnings-as-errors`, 6.4 and 6.3 | | exit 0 / 0, 0 warnings, both toolchains | |
| V12 | `newhatches.sh b36158f` in `upgrade-lazy/` / `upgrade/` | 13 lines | 0 lines | `+  nonisolated(unsafe) private var testSourceCache: ...` |
| V13 | `hatchpass.sh` (SW-GATE-10 justification pass) in `upgrade-probe/@b36158f`, `upgrade/`, `upgrade-lazy/` | 12 lines (lazy) | 2 legacy lines before and after | `AssertSnapshot.swift:629:   final class Counter: @unchecked Sendable {` |
| V14 | `diagnose/matrix.sh ./classify.sh` / `./classify-naive.sh`, 6.4 | naive: `wrong_branches=11` | `wrong_branches=0` | `unwrap expected=force-unwrap got=precondition WRONG` (naive) |
| V15 | same, 6.3; `matrix-rel.sh` (release, 6.4) | naive release: 5 wrong | 0 wrong, 0 wrong | `throwtop expected=toplevel-throw got=toplevel-throw ok` |
| V16 | `diagnose/quit.sh <bin> semaphore` with `set -m` / launched with bare `&` | bare `&`: still alive, no dump (`SigIgn 6`) | `set -m`: `Signal 3: Backtracing`, still alive | `_dispatch_sema4_wait + 23 in libdispatch.so` |
| V17 | `quit.sh <bin> semaphore enable=no` | rc 131 (killed by QUIT) | default: alive | |
| V18 | `btenv.sh <bin>` over `SWIFT_BACKTRACE` `-`, `enable=no`, json | rc unchanged 132/139; `enable=no` segv: 0 stderr lines | 52 lines default | `crash.json` 4.1 KB |
| V19 | TSan: `R swift build --sanitize=thread B` then `faults race` / `faults mutexok` / `faults ok` | race rc 66; mutexok rc 66 (false positive) | ok rc 0 | `WARNING: ThreadSanitizer: Swift access race` |
| V20 | plain `faults race` x5 / `faults mutexok` x5 (`five.sh`) | five counts 432117..712743 | `count=200000` x5 | |
| V21 | `slowtc-matrix.sh 6.4` and `6.3` | `SLOW` + flag + `-warnings-as-errors`: exit 1; `SLOWER`: exit 1 | `SLOWFIXED`: exit 0 | `error: expression took 3791ms to type-check (limit: 100ms)` |
| V22 | `slowprobe2/hid.sh` (swiftc -typecheck) | `hidden.swift` exit 1 in 4128 ms | `hidden-split.swift` exit 1 in 74 ms (real error); `hidden-twin.swift` exit 0 | `binary operator '+' cannot be applied to operands of type 'Double' and 'Float'` |
| V23 | `hangtest/run-hang.sh` (6.4) and `run-hang.sh 63` (6.3) | hang at `Test hangsForever() started.`; `kill -QUIT <runner>` dump in log | | `SWIFT TASK CONTINUATION MISUSE: waitForever() leaked its continuation` |
| V24 | `recheck/recheck.sh 6.4` and `6.3` | four `STILL` lines, exit 1 each | `typedtask-ok`: `FLIPPED`, exit 0 | `error: cannot find 'withDeadline' in scope` |
| V25 | `grep -rn -e 'swift:[0-9]' -e 'swiftlang/swift:' --include='*.yml' --include='*.yaml' --include='Dockerfile' .` in `bump/red`, `bump/green` | exit 0, `ci.yml:6` | exit 1, empty | `container: swift:6.3-noble` |
| V26 | `grep -rn -e 'migrate --targets' ...` and `grep -rn -e 'SWIFT_BACKTRACE=enable=no' ...` in `greps/red`, `greps/green` | exit 0 with the line (both) | exit 1 (both) | `ENV SWIFT_BACKTRACE=enable=no` |
| V27 | `grep -rn -e 'swiftLanguageModes: \[.v5\]' -e 'enableUpcomingFeature("StrictConcurrency")' --include='Package*.swift' .` at `552dd85` and final; `grep -rn -e 'swiftSettings: \[' --include='Package.swift' .` at `441dd75` and final | 2 lines; 3 lines | empty; empty | |
| V28 | `diagnose/sigterm.sh`, `sigign.sh` | | SIGTERM 143, SIGINT 130; `SigIgn` per launch style | `set -m &: SigIgn: 0000000000000000` |

Verifications that did not go red as expected: the `-swift-version 6` dependency blast radius (audit-measured only; the fixture's dependencies compile in 6, so V02 shows own-package errors only). `migrate` of a bare `swiftSettings: sharedVar` was not re-run (SW-PKG-32 plant). The `registered` deadlock (rule 8) was reasoned, not run. `timeout` reaping the test runner after the driver is killed was not measured. ASan was not run. Windows, macOS, the static Linux SDK and swiftly are unverified: read only.

## Exemplar evidence

- **Rule 2 (one pin, derived image).** Satisfied: `containerization@3e7bc39e66b3:.github/workflows/containerization-build-template.yml:26-34` (sparse checkout of `.swift-version`, `image=swift:$(cat .swift-version)-noble`), `.swift-version` = `6.3.0`. `swiftly@c8cf2e35bfca:Sources/Swiftly/Use.swift:191,235` reads it. `swift-embedded-examples@119b29f83550:.github/workflows/update-swift-version.yml:57` automates the bump. 6 of 40 repositories carry the file (topic map). Violates: any workflow with a literal `swift:` tag (not enumerated beyond the audit's `swift:6.3` floating note, SW-GATE-08).
- **Rule 3 (typo guard).** 0 of 38 root manifests use `StrictLanguageFeatures` (SW-PKG-02); two exemplars ship dead names the compiler never mentioned (`vapor@bf77fc69b142:Package.swift:257`, `swift-async-algorithms@cbde9aed744b:Package.swift:78,154`).
- **Rules 5, 9 (5-mode with complete checking, then flip).** Migration state held on purpose: `swift-package-manager@5546f44a3b52:Package.swift:260,276,670` (`enableExperimentalFeature("StrictConcurrency")` and `"StrictConcurrency=complete"` in a `[.v5]` package, the pre-6.0 spelling), `swift-format@b15dd59fad21:Package.swift:150`, `Alamofire@bda9ed57d729:Package.swift:52`, `swift-snapshot-testing@28e5de025e3f:Package.swift:69` (the fixture's origin). Temporary downgrade with a dated reason: `swift-build@2187330e13e7:Package.swift:345` ("Temporarily downgraded from Swift 6 mode due to a source break in 1/31/26 nightly snapshot"). Conditional: `swift-service-lifecycle@c55297914e26:Package.swift:78` (`#if compiler(<6.2)` appends `.v5`, with the reason).
- **Rule 11 (NNBD by migrate).** `swift-log@4038b6a4f74a:Package.swift:68` enables it by name; the break case is `swift-service-lifecycle@c55297914e26:Sources/UnixSignals/UnixSignalsSequence.swift:80` (`sending 'self.iterator' risks causing data races`), 2 of 6 audited packages broke when flipped (SW-CONC-07). In the fixture the same feature produced fix-its, not errors, but did produce the 6.4-only deprecation (rule 13).
- **Rule 6 and 15 (hatches).** The fixture's own legacy hatches: `swift-snapshot-testing@28e5de025e3f:Sources/SnapshotTesting/AssertSnapshot.swift:615` (`final class Counter: @unchecked Sendable`) and `Sources/InlineSnapshotTesting/AssertInlineSnapshot.swift:767` (`public final class LockIsolated<Value>: @unchecked Sendable`), both with no justification comment. `swift-nio@e12881f2a691:Sources/NIOCore/AsyncAwaitSupport.swift:16-23` documents that every use of its continuation alias "must have a comment that states why it is safe", the shape SW-GATE-10 enforces.
- **Rules 20, 22 (backtracer and signals).** `swift-testing@c7d68ca20cd7:Sources/Testing/ExitTests/ExitTest.swift:887-890` sets `SWIFT_BACKTRACE=enable=no` in exit-test children; `swift-package-manager@5546f44a3b52:CHANGELOG.md:72` documents `SWIFT_BACKTRACE=enable=yes` for debug binaries on macOS; the corpus never sets the variable in its own CI. SIGQUIT appears as a mappable signal in `swift-service-lifecycle@c55297914e26:Sources/UnixSignals/UnixSignal.swift:99,135` and `containerization@3e7bc39e66b3:Sources/Containerization/Signal.swift:229`; no repository documents a SIGQUIT dump procedure.
- **Rule 27 (TSan).** The only TSan leg in the corpus is `SwiftLint@ec4691d9e813:Makefile:15` (`TSAN_SWIFT_BUILD_FLAGS=-Xswiftc -sanitize=thread`, macOS test-bundle form); `swift-build` generates `-sanitize=thread` flags for users (`Sources/SWBUniversalPlatform/Specs/Swift.xcspec`).
- **Rule 29 (type-check budget).** No repository applies `-warn-long-expression-type-checking` in its own build; `tuist@2f6ac74754bf:cli/Tests/TuistHasherTests/SettingsContentHasherTests.swift:109` (value `300`) and `...XcodeCacheSettingsProjectMapperTests.swift:470` (`-warn-long-function-bodies=100`) use them as test data.
- **Contradicts a candidate.** None found for rules 2, 3, 6, 11; the corpus lacks any `swift package migrate` usage outside SwiftPM's docs, so rules 11 to 13 rest on the toolchain runs.

## AI-agent angle

What an LLM characteristically gets wrong in these two procedures, and the smallest mechanical check:

| Mistake | Why it compiles or passes | Smallest check |
|---|---|---|
| Uses `-Xswiftc -swift-version -Xswiftc 6` (or `-strict-concurrency=complete`) as the migration | builds; the flag reaches dependencies and prints "language mode was overridden" | `grep -rn -e '-swift-version' --include='*.yml' --include='*.sh' --include='Makefile' .` |
| Silences every Swift 6 error with `nonisolated(unsafe)` or `@unchecked Sendable` | builds green in Swift 6 mode (lazy twin: 13 lines, exit 0) | the `git diff -U0 ... awk` added-hatch check |
| Pastes `.enableUpcomingFeature("NonisolatedNonsendingByDefault")` without running `migrate` | compiles; behaviour flips silently (SW-CONC-07) | manifest line added with no `@concurrent` in the diff: reading heuristic; `migrate` leaves fix-its |
| Writes `swift package migrate --targets A` from the official guide | rejected, exit 64 | `grep -rn -e 'migrate --targets' ...` |
| Calls `migrate --to-feature StrictConcurrency` or any Swift-6-group name | exit 64 `not migratable` | the exit code |
| Removes `[.v5]` first and fixes the fallout, never probing | 5 non-concurrency warnings appear at the flip | probe deltas (rule 4) |
| Declares the upgrade done on a green build, not `-warnings-as-errors` | the flip left a pre-existing warning that `-Werror` turns into exit 1 | `swift build -Xswiftc -warnings-as-errors` |
| Accepts `migrate` output unreviewed | fix-its used a 6.4-deprecated overload | re-gate on the current toolchain |
| Writes `defaultSwiftSettings:`, `withDeadline`, stdlib `FilePath`, typed-throws `Task` from WWDC26 or proposal text | the proposals are accepted, not shipped; the last crashes the frontend | the four `recheck` probes |
| Hard-codes `swift:6.4` in CI beside a `.swift-version` that says something else | both builds pass | the image grep |
| Triages a crash by exit code alone (132 means precondition) | the code is right for six different failures | the symptom matrix; read the first message line |
| Looks for `Fatal error:` in a release binary | the text is not there | match `Swift runtime failure` and frame 0 |
| Sets `SWIFT_BACKTRACE=enable=no` "to reduce noise" | exit codes identical | the env grep |
| Launches the target with `&`, then `kill -QUIT`, concludes "no dump" | SIGQUIT was inherited as ignored | `grep -e SigIgn /proc/$PID/status` |
| Sends SIGQUIT to `swift test` instead of the runner, or `kill -9` first | the driver dumps, or the evidence dies | `ps -eo pid,ppid,args` |
| Reads `timeout` exit 124 as SIGTERM, or `143`/`137` as "the program printed nothing" | 124 means timed out | table of section 9 |
| Declares a race from a TSan report on `Mutex` code, or declares none because the plain run exited 0 | both are false in this toolchain pair | five plain runs, compare counts |
| Chases `unable to type-check this expression in reasonable time` by adding casts or raising `-solver-expression-time-threshold` | masks the real error | split the expression first |
| Invents flags such as `swift test --timeout` or `--deadlock-detect` | not in `swift test --help` | `swift test --help` |

## Contested / evolving

- **Spelling of complete checking in 5 mode.** The guide's old text uses `enableExperimentalFeature("StrictConcurrency")` for 5.9 and 5.10 tools; for tools 6.0 and later it says `enableUpcomingFeature("StrictConcurrency")` ([EnableDataRaceSafety](https://raw.githubusercontent.com/swiftlang/swift-migration-guide/main/Guide.docc/EnableDataRaceSafety.md)). SwiftPM itself still ships the experimental spelling in a `[.v5]` package (`swift-package-manager@5546f44a3b52:Package.swift:260`). Trend: upcoming spelling; both produce the same 13 warnings on 6.4. As of 2026-10-10.
- **"Express what is true now" versus the ladder.** The [strategy page](https://raw.githubusercontent.com/swiftlang/swift-migration-guide/main/Guide.docc/MigrationStrategy.md) says minimise change and use the opt-outs as markers for later refactoring ("Resist the urge to refactor"), and that its guidance "should not be interpreted as a recommendation"; the lore ladder (SW-CONC-28) says no hatch while a lower rung applies. They disagree on migrating a codebase you do not plan to revisit. This set follows the ladder for packages the team owns and treats S1 and S2 as the legitimate exits.
- **`migrate` maturity.** The guide still calls it "in active development"; 6.4 has five migratable names and the fix-it output was correct on 6.3 and needed a one-line edit on 6.4. Trend: more names becoming migratable; re-read `swiftc -print-supported-features` each bump.
- **SIGQUIT semantics.** Go's SIGQUIT dumps and exits; Swift's (Linux, 6.3 and 6.4) dumps and keeps running. The doc lists SIGQUIT among crash-handled signals but does not state the survival; this is measured behaviour, not a documented guarantee, so rule 22 should be re-run at each bump. macOS not verified.
- **TSan.** Advisory CI leg (SW-TEST-17) versus authoritative in diagnosis (this document). The `Mutex` false positive persists on 6.3 and 6.4; a suppression is open work in `gates/lint-carriers-and-sanitizers`.
- **Mutex floor.** Rung 5 needs `Synchronization`; the Apple availability floor is unverified here, and libraries with old platform floors cannot use it (stop condition S2). Trend: floors rising; re-check each bump.
- **Computed `static var` for `static let`.** Source-compatible, possibly ABI-changing; fine for source-distributed packages, not verified for binary frameworks.
- **swift-syntax range policy** (SW-PKG-10): lo 602, hi 605 as of 2026-10-10 (604.0.0 latest release, 605 prereleases up to 2026-09-15). Moves with each Swift release.

## Sources

Primary marked **P**. Read means fetched and read in this session, 2026-10-10.

| URL | What it is | Date or era | Why worth reading |
|---|---|---|---|
| **P** https://github.com/swiftlang/swift/blob/main/docs/Backtracing.rst (read as raw) | The Swift runtime's backtracing design and `SWIFT_BACKTRACE` key table, signals handled, Linux notes | main, Swift 5.9 to 6.4 | The only normative text for the backtracer settings and handled signals |
| **P** https://raw.githubusercontent.com/swiftlang/swift-migration-guide/main/Guide.docc/MigrationStrategy.md | Migration strategy: outside-in, Swift 5 mode first, three concurrency upcoming features, "express what is true now" | main | The official order the step list improves on |
| **P** https://raw.githubusercontent.com/swiftlang/swift-migration-guide/main/Guide.docc/EnableDataRaceSafety.md | How to enable the Swift 6 mode and complete checking in packages, flags, Xcode | main | Spellings per tools version; `-Xswiftc -swift-version` |
| **P** https://raw.githubusercontent.com/swiftlang/swift-migration-guide/main/Guide.docc/FeatureMigration.md | `swift package migrate` usage and the manifest-edit failure | main, "active development" | The `--targets` spelling that 6.4 rejects |
| **P** https://raw.githubusercontent.com/swiftlang/swift-migration-guide/main/Guide.docc/CommonProblems.md | Catalogue of Swift 6 diagnostics and their fixes (globals, non-Sendable types, `@preconcurrency`) | main | The fix classes the ladder orders |
| **P** https://raw.githubusercontent.com/swiftlang/swift-migration-guide/main/Guide.docc/IncrementalAdoption.md (headings and sections read) | Wrapping callbacks, dynamic isolation, `@preconcurrency`, dependencies | main | Where the hatch rungs are sanctioned |
| **P** https://raw.githubusercontent.com/swiftlang/swift-migration-guide/main/Guide.docc/MigrationGuide.md | Front page: compiler version versus language mode | main | The distinction the flip step depends on |
| **P** https://raw.githubusercontent.com/swiftlang/swift-package-manager/main/Sources/Commands/PackageCommands/Migrate.swift | SwiftPM source of `package migrate` (`--target`, `--to-feature`) | main | Ground truth for the flag spelling |
| **P** `swift-package-manager@5546f44a3b52:Sources/PackageManagerDocs/Documentation.docc/Package/PackageMigrate.md` (exemplar clone) | SwiftPM's own `package migrate` reference (introduced 6.2; lists `--scratch-path`, `--target`) | 2026-10-10 clone | Contradicts two lore claims |
| **P** https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0526-deadline.md | SE-0526 `withDeadline`, Accepted with modifications | 2026 | Dated re-check #1 |
| **P** https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0540-default-target-settings.md | SE-0540 `defaultSwiftSettings`, Accepted with modifications, PR #10033 | 2026 | Dated re-check #2 |
| **P** https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0529-filepath-in-stdlib.md | SE-0529 `FilePath` in the stdlib, Accepted with modifications | 2026 | Dated re-check #3 |
| **P** https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0300-continuation.md | SE-0300: continuations, double resume traps, leak detection | Swift 5.5 | Why a leak hangs and a double resume traps |
| **P** https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0337-support-incremental-migration-to-concurrency-checking.md | SE-0337: `@preconcurrency`, checking levels, Swift 6 mode behaviour | Swift 5.6 | Origin of the incremental model |
| **P** https://swift.org/blog/swift-5.9-backtraces/ | swift.org post: on-crash backtraces on by default on Linux, interactive mode only on a TTY | 2023 (Swift 5.9) | CI behaviour of the backtracer |
| https://forums.swift.org/t/unable-to-generate-a-backtrace-using-swift-6-static-linux-sdk/74215 | Forum thread with a reply from Alastair Houghton (backtracer author) on ptrace and security settings | 2024 to 2025 | The static SDK caveat |
| https://github.com/google/sanitizers/wiki/ThreadSanitizerFlags | TSan flags: `exitcode` default 66, `halt_on_error` 0 | current | Why a race exits 66 |
| https://github.com/pointfreeco/swift-snapshot-testing | The package migrated in the fixture | `28e5de025e3f`, 2026 | A real 5-mode library with globals |
| `containerization@3e7bc39e66b3:.github/workflows/containerization-build-template.yml` | CI derives the image from `.swift-version` | 2026-10-10 clone | The pin pattern |
| `swift-testing@c7d68ca20cd7:Sources/Testing/ExitTests/ExitTest.swift` | Exit tests disable the backtracer in the child | 2026-10-10 clone | When `enable=no` is deliberate |
| https://github.com/swiftlang/swift-syntax (tags via `git ls-remote`) | swift-syntax tags: 604.0.0 latest, 605 prereleases | 2026-10-10 | lo/hi re-check |
| `swiftc -print-supported-features`, `swift package migrate --help`, `swift test --help`, `swift build --help` on 6.4 | The toolchain's own machine-readable and help output | 6.4.0-RELEASE | Migratable set, build system default |
| `/home/mherwig/dev/grimoire-lore/.agents/worktrees/swift/skills/go-upgrade/SKILL.md`, `skills/go-diagnose/SKILL.md` | The skill shapes mirrored (order statement, consent table, stop condition, never-edit table, receipt) | this repo | Structure of the two new skills |
| Consolidations `swift-concurrency.md`, `swift-package.md`, `swift-gates.md`, `swift-errors.md`, `swift-cli.md`, `swift-testing.md` | The settled rules cited by ID | 2026-10-10 | Standards this procedure orders |
