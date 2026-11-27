---
title: Swift recent shifts delta, 2026-10-10 to 2026-11-27
pair: swift-quality
date_researched: 2026-11-27
window_start: 2026-10-10
model: sonnet
sources_fetched: 20
---

# Delta result

This is a delta against the 2026-10-10 baseline. It lists what shipped or was decided in the window that rules/swift-quality.md and skills/swift-quality-reference/ do not mention. Each source was opened on 2026-11-27. Items named in the other briefs of this pair (SE-0526, SE-0540, SE-0529, SE-0406, SE-0481, SE-0487, SE-0409, SE-0522, swift-subprocess, AHC, swift-nio advisories, SwiftLint, Xcode 27) and the sibling swift-package pair are left out. Grep over the pair for SE-0568, SE-0564, SE-0563, ST-0030, SE-0553, SE-0478, SE-0551 and TestingUtilities found no hit, so each is new to the pair.

Compile-now column: "yes" means the API or fix exists in a released artifact. "proposal text only" means SW-LANG-05 forbids writing code against it yet.

## Claims at risk

1. Swift 6.4 toolchain stamp and Swift Testing 6.4.0: changed in detail. Old text: measured on 6.4.0 and 6.3.3. New fact: the toolchain has point releases 6.4.1 (2026-10-14), 6.4.2 (2026-10-30) and 6.4.3 (2026-11-20). Source: https://github.com/swiftlang/swift-testing/releases (see candidate 5). The tag list shows nothing that reverses a probe, but the four SW-CORE-14 probes were not re-run on 6.4.3 in this research: could not determine.
2. SW-CONC-24, SW-CONC-33 hand-written timeout and shield patterns: unchanged as the rule to write today. The `withDeadline` amendment review (2026-11-20 to 2026-12-01) is in the sibling brief. A newer proposal, SE-0568, adds a second replacement path (candidate 1), still proposal text only.
3. SW-CONC-30 bounded stream: unchanged. No new stream or buffering API was found in the window.
4. SW-SEC-20 advisory floors (swift-crypto 4.5.1): changed. Old text: floor swift-crypto 4.5.1, measured 2026-10-10. New fact: swift-crypto 5.1.2 (2026-11-19) fixes two advisories, GHSA-rch3-xxjq-365j and GHSA-c24m-vphm-p22w (candidate 4). I could not determine whether 5.0.0 predates the baseline or whether the 4.x line also received the fixes; only the 5.x release rows were readable.
5. Paths, processes and JSON key order in stdlib or Foundation: could not determine any change in the window; none found in the digest or CHANGELOG sections that were read.
6. Platform shifts (Android, Wasm, Windows, static Linux SDK): no rule-relevant change found. The November digest only mentions an Android talk, swift-ros2 on Android and Windows, and Swift Testing's Embedded preview on WASI. The Android emulator testing fix in 6.4.2 and 6.4.3 is a tooling fix, not a rule.
7. New compiler diagnostic group or warning control: none new found in the window. The CHANGELOG for Swift (next) names the `KeyPathAllocation` group for Embedded Swift only, which no rule here needs. `@diagnose` control is SE-0522, excluded.
8. New class of AI-agent error reported for Swift 6.4: could not determine; no primary-source report found in the window.

## Candidates (7)

### 1. Task cancellation scopes, SE-0568 (family SW-CONC)

- Source: https://forums.swift.org/t/se-0568-task-cancellation-scopes/90920 (review 2026-11-20 to 2026-12-02) and the proposal https://github.com/swiftlang/swift-evolution/blob/main/proposals/0568-task-cancellation-scopes.md, which says the implementation is SPI on `main` (swift PR 91516) and needs a new stdlib and runtime.
- Change: `withTaskCancellationScope { scope in ... }` plus `TaskCancellationScope.cancel(reason:)` cancels part of a task without a child task. It names the task-group race against an `AsyncStream` as the pattern it replaces, and says `withDeadline` is built on it.
- Proposed rule: SW-CONC-24, SW-CONC-33 and any hand-written cancel-boundary race keep the task-group form and carry a one-line `// SE-0568` marker; adopt the scope API only after the dated probe in SW-CORE-14 flips.
- Compile on Linux now: proposal text only, in review, not in 6.4.x. SW-LANG-05 forbids writing it.
- Rationale: agents trained on the proposal will emit the API and the build fails. Verification: add a fifth probe to SW-CORE-14 (`swift build` must fail with `cannot find 'withTaskCancellationScope' in scope`), and grep `rg 'withTaskCancellationScope|TaskCancellationScope' Sources`.

### 2. Split continuations, SE-0564 (family SW-CONC)

- Source: https://forums.swift.org/t/accepted-se-0564-split-continuations/90846 (accepted as written, 2026-11-18, review 2026-11-04 to 2026-11-18). The swiftlang/swift CHANGELOG for Swift (next) lists it at https://raw.githubusercontent.com/swiftlang/swift/main/CHANGELOG.md: an async-body `withContinuation` giving a `Continuation` and a `ContinuationWaiter`, with cancellation and priority-escalation handlers active only while suspended, and `resumeSynchronously`.
- Proposed rule: bridging a callback API keeps `withCheckedThrowingContinuation` with the resume-exactly-once discipline on 6.4; a signature written from SE-0564 text is a defect until the 6.5 toolchain ships.
- Compile on Linux now: proposal text only for 6.4 (it is in `main`, the 6.5 line). Not to be written.
- Rationale: the cancellation-handler-before-continuation race is what it fixes, and agents may mix the new and old forms. Verification: `rg 'ContinuationWaiter|resumeSynchronously' Sources` must be empty on a 6.4 toolchain; reading heuristic: every continuation resumes on every path.

### 3. `@main` and top-level code, SE-0563 (family SW-CLI)

- Source: https://forums.swift.org/t/se-0563-improve-interaction-between-main-and-top-level-code/90434 (review 2026-11-03 to 2026-11-17; decision not found).
- Change: SwiftPM currently passes `-parse-as-library` to executable targets whose sources contain "@main"; a future tools version drops that heuristic.
- Proposed rule: a CLI keeps exactly one entry point, either an `@main` type in a file not named `main.swift` or top-level code, never both.
- Compile on Linux now: the one-entry-point rule is checkable today; the relaxation is proposal text only.
- Rationale: the heuristic is a known source of confusing build errors. Verification: `rg -l '@main' Sources` shows no file named `main.swift`. The tools-version part belongs to swift-package.

### 4. swift-crypto advisory floor (family SW-SEC)

- Source: https://github.com/apple/swift-crypto/releases. 5.1.2 (2026-11-19): X25519 key agreement rejects low-order public keys that give an all-zero shared secret (GHSA-rch3-xxjq-365j); Scrypt `deriveKey` enforces `maxMemory` (GHSA-c24m-vphm-p22w). 5.0.3 (2026-10-20) rejects over-long VOPRF inputs. 5.0.2 (2026-10-20) bounds RSA prime recovery. 5.2.0 (2026-11-24) adds `AES.GCM` open and seal over an output span and fixes the default Scrypt memory limit.
- Proposed rule: SW-SEC-20 raises the swift-crypto floor to 5.1.2 and the `floors` script gains the two advisory ids.
- Compile on Linux now: yes (released).
- Rationale: untrusted peer keys and attacker-chosen Scrypt cost are both in the SW-SEC threat model. Verification: `floor swift-crypto '[5,1,2]' 5.1.2` in the SW-SEC-20 script; `osv-scanner` on `Package.resolved`. The two GHSA pages were not opened, only the release notes; the 4.x backport question is open.

### 5. Environment lookup and exit-test fixes in Swift Testing (family SW-TEST)

- Source: https://github.com/swiftlang/swift-testing/releases. 6.4.1 (2026-10-14), 6.4.2 (2026-10-30), 6.4.3 (2026-11-20): exit-test captures accept non-finite floats; repetition handling for non-failure issues is fixed; 6.4.3 fixes environment lookup that matched names only a prefix of the requested name.
- Proposed rule: tests that read or set environment variables, or capture floats in `#expect(processExitsWith:)`, state a floor of toolchain 6.4.3 in the CI image.
- Compile on Linux now: yes.
- Rationale: a prefix match on `PATH`-like names gives a false pass. Verification: `swift --version` in CI prints 6.4.3 or newer, and `rg 'Environment\.variable' Tests`.

### 6. Attachments in the JSON event stream, ST-0030, and issue capturing (family SW-TEST)

- Sources: https://forums.swift.org/t/st-0030-attachments-in-the-swift-testing-json-event-stream-tooling-enablement/90815 (review 2026-11-17 to 2026-11-29) and the pitch https://forums.swift.org/t/pitch-add-issue-capturing-test-utility-specific-module-to-swift-testing/90397 (2026-11-03, `withIssueCapturing`, `TestingUtilities` module, awaiting review).
- Proposed rule: CI that parses the JSON event stream accepts attachment bytes as Base64 or an integer array and never treats `path` as readable; do not write `withIssueCapturing`.
- Compile on Linux now: proposal text only for both.
- Rationale: pre-empts agents writing against unreleased test APIs. Verification: `rg 'withIssueCapturing|TestingUtilities' Tests` empty; reading heuristic on any JSON-stream consumer.

### 7. swift-nio 2.105.x behavior changes (family SW-NET)

- Source: https://github.com/apple/swift-nio/releases. 2.105.0 (2026-11-03): futures can be given sending values and `TokenBucket` drops an `@unchecked Sendable`. 2.105.2 (2026-11-24): `TimeAmount(Duration)` clamps large negative durations to `Int64.min`; `ByteBufferView` range subscript is bounds-checked. No deprecations. This is not an advisory.
- Proposed rule: SW-NET stamps swift-nio 2.105.2 and no timeout is built from a possibly negative or huge `Duration` without clamping.
- Compile on Linux now: yes. Low priority.
- Rationale: the clamp changes timeout arithmetic. Verification: `rg 'TimeAmount\(' Sources` and read each for sign.

## Seen but dropped

- SE-0553 (`Task.currentID`), SE-0551 (`Span(ofOne:)`), SE-0478 (file-level `default` isolation), SE-0558 and SE-0562: the November digest at https://www.swift.org/blog/whats-new-in-swift-november-2026/ lists SE-0553 and SE-0551 as recently accepted, and the CHANGELOG lists SE-0551 and SE-0478 for Swift (next). I found no decision date inside the window for SE-0553, SE-0551 or SE-0478 (the SE-0478 second review ran from 2026-06-05), so they fail the rule that a candidate needs a dated source in the window. SE-0558 (accepted with modifications 2026-11-20) and SE-0562 (accepted 2026-11-21) are span and ownership work with no rule family here.
- SE-0569 (`TopLevelEncoder` to stdlib, review opened 2026-11-21) and the called-once function type pitch (2026-11-05): proposal or pitch only, no rule change; the pitch lists the `withTaskCancellationHandler` handler as a candidate.
- grpc-swift-2 2.4.4 (2026-10-13): dependency bump only. swift-certificates: could not determine, not shown on the pages read.

## Sources

| URL | What | Date |
|---|---|---|
| https://www.swift.org/blog/ | blog index | window posts 2026-11-05, 2026-11-11 |
| https://www.swift.org/blog/whats-new-in-swift-november-2026/ | digest | 2026-11-11 |
| https://raw.githubusercontent.com/swiftlang/swift/main/CHANGELOG.md | Swift (next) changelog | read 2026-11-27 |
| https://forums.swift.org/c/evolution/18.json and /proposal-reviews/21.json | evolution listings | window |
| https://forums.swift.org/t/accepted-se-0564-split-continuations/90846 | SE-0564 decision | 2026-11-18 |
| https://forums.swift.org/t/se-0568-task-cancellation-scopes/90920 | SE-0568 review | 2026-11-20 |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0568-task-cancellation-scopes.md | SE-0568 text | 2026-11 |
| https://forums.swift.org/t/se-0563-improve-interaction-between-main-and-top-level-code/90434 | SE-0563 review | 2026-11-03 |
| https://forums.swift.org/t/st-0030-attachments-in-the-swift-testing-json-event-stream-tooling-enablement/90815 | ST-0030 | 2026-11-17 |
| https://forums.swift.org/t/pitch-add-issue-capturing-test-utility-specific-module-to-swift-testing/90397 | issue capturing pitch | 2026-11-03 |
| https://forums.swift.org/t/pitch-2-called-once-function-types/90515 | called-once pitch | 2026-11-05 |
| https://github.com/swiftlang/swift-testing/releases | 6.4.1 to 6.4.3 | 2026-10-14 to 2026-11-20 |
| https://github.com/apple/swift-nio/releases | 2.105.x | 2026-11-03 to 2026-11-24 |
| https://github.com/apple/swift-crypto/releases | 5.0.1 to 5.2.0 | 2026-10-12 to 2026-11-24 |
| https://github.com/grpc/grpc-swift-2/releases | 2.4.4 | 2026-10-13 |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0553-task-identity.md, 0478 and 0504 | proposal texts | undated |

The GitHub API hit its rate limit, so proposal dates came from the forum JSON listings. Forum topic pages for SE-0478 returned 403.
