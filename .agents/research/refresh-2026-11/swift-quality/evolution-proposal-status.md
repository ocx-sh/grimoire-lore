---
title: Swift Evolution and Swift Testing proposal status delta, 2026-10-10 to 2026-11-27
pair: swift-quality
date_researched: 2026-11-27
window_start: 2026-10-10
model: sonnet
sources_fetched: 14
---

# Proposal status delta for swift-quality

This is a delta update of the 2026-10-10 baseline. Method: a blobless clone of `swiftlang/swift-evolution` (main tip is the Nov 20 2026 commit `58a97fa`, which is Nov 21 UTC) and of `swiftlang/swift-testing` (tip Nov 19 2026). The proposal headers and `git log --since=2026-10-10` per file were read directly. The GitHub API was rate limited, so the web pages for swift#91190, SE-0568, SE-0529, the swift.org install page, blog index and November digest were fetched instead. Forum threads were not opened; their URLs below come from the proposal headers.

## Summary

- One status change touches a pair claim: SE-0540 moved from "Accepted with modifications" to "Implemented (Swift 6.5)" on 2026-11-16.
- Nothing else the pair names changed status in the window. SE-0526, SE-0529, SE-0406, SE-0481, SE-0487, SE-0409, SE-0522, SE-0493, SE-0504, ST-0003 and ST-0026 have zero commits to their files since 2026-10-10, except a header-format cleanup on 2026-10-11 that touched ST-0003 and ST-0026 and changed no status.
- SW-CORE-14 probe: no FLIPPED on any shipped toolchain. Latest stable is Swift 6.4.3 per swift.org/install. A SwiftPM 6.5 snapshot or toolchain WOULD flip the `defaultSwiftSettings:` probe, so the row's wording must change from "accepted with modifications and not shipped" to "SE-0540 implemented in 6.5, unshipped".
- SE-0526 `withDeadline`: header still "Accepted with modifications", but the implementation (swift#91190) merged to main 2026-08-13, was reverted 2026-08-14 and relanded via swift#91516 on 2026-08-15. This is before the window and does not contradict "expected 6.5". It is new evidence that main has it.
- New proposal SE-0568 (task cancellation scopes) entered review 2026-11-19 to 2026-12-02. It references `withDeadline` and SE-0504. It is not named by the pair.

## Findings

### Table: status at baseline and on 2026-11-27

| Proposal | Status at baseline (2026-10-10) | Status on 2026-11-27 | Implementing toolchain | Source |
|---|---|---|---|---|
| SE-0526 `withDeadline` | Accepted with modifications (2026-07-30) | Unchanged | None shipped; on `main` via swift#91516 (landed 2026-08-15); 6.5 expected, not stated in header | [proposal](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0526-deadline.md), [PR 91190](https://github.com/swiftlang/swift/pull/91190) |
| SE-0540 default target settings | Accepted with modifications | **Implemented (Swift 6.5)**, changed 2026-11-16 in commit `6d9f877` "Update SwiftPM proposals implemented in Swift 6.5" | SwiftPM 6.5 (swift-package-manager#10033); no 6.5 release or snapshot found | [proposal](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0540-default-target-settings.md) |
| SE-0529 stdlib `FilePath` | Accepted with modifications | Unchanged; no implementation link, version still a placeholder `compiler(>=6.4) // or whichever version this lands in` | None | [proposal](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0529-filepath-in-stdlib.md) |
| SE-0406 AsyncStream backpressure | Returned for revision | Unchanged | None | [proposal](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0406-async-stream-backpressure.md) |
| SE-0481 `weak let` | Implemented (Swift 6.3) | Unchanged | 6.3 per header | [proposal](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0481-weak-let.md) |
| SE-0487 nonexhaustive enums | Implemented (Swift 6.2.3) | Unchanged | 6.2.3 per header | [proposal](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0487-extensible-enums.md) |
| SE-0409 import access levels | Implemented (Swift 6.0) | Unchanged; line 108 still reads "Support for @usableFromInline on imports has yet to be implemented." | 6.0 | [proposal](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0409-access-level-on-imports.md) |
| SE-0522 source warning control | Implemented (Swift 6.4) | Unchanged | 6.4 | [proposal](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0522-source-warning-control.md) |
| SE-0493 async defer | Implemented (Swift 6.4) | Unchanged | 6.4 | [proposal](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0493-defer-async.md) |
| SE-0504 cancellation shields | Implemented (Swift 6.4) | Unchanged | 6.4 | [proposal](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0504-task-cancellation-shields.md) |
| ST-0003 `.serialized` | Implemented (Swift 6.0) | Unchanged | 6.0 | [proposal](https://github.com/swiftlang/swift-evolution/blob/main/proposals/testing/0003-make-serialized-trait-api.md) |
| ST-0026 `.taskLocal` trait | Implemented (Swift 6.5), set 2026-09-02, before baseline | Unchanged | 6.5 (swift-testing#1764) | [proposal](https://github.com/swiftlang/swift-evolution/blob/main/proposals/testing/0026-task-local-test-trait.md) |

Swift Testing proposals now live in `swift-evolution/proposals/testing/` (ST-0001 to ST-0030). The `swift-testing/Documentation/Proposals` directory holds only the legacy copies 0001 to 0007, with no commits in the window. In-window testing changes: ST-0029 marked implemented 2026-10-19; ST-0030 (attachment JSON) readied for review 2026-11-17. Neither is named by the pair.

### Claims at risk

1. concurrency.md and network.md "`withDeadline` (SE-0526, accepted 2026-07-30, expected 6.5)" and "SW-CONC-24 is the answer until it ships": **unchanged.** Header status and acceptance thread are the same. Optional new fact: implementation is on `main` since 2026-08-15 ([PR 91190](https://github.com/swiftlang/swift/pull/91190)), so a main-branch or 6.5 snapshot toolchain compiles it.
2. concurrency.md "SE-0406 was returned for revision on 2023-09-13": **unchanged.** Still "Returned for revision". No new bounded-stream proposal exists in `proposals/` (only 0314, 0388, 0406, 0468 mention streams).
3. SW-CORE-14 "accepted with modifications and not shipped": **changed for SE-0540 only.** Old text: all three accepted with modifications. New fact: SE-0540 is "Implemented (Swift 6.5)", changed 2026-11-16, [commit 6d9f877](https://github.com/swiftlang/swift-evolution/commit/6d9f8772). SE-0526 and SE-0529 are unchanged. "Not shipped" stays true on every stable toolchain found (6.4.3 latest).
4. io.md "stdlib `FilePath` absent through 6.4": **unchanged.**
5. language.md "SE-0481 says 6.3, read 2026-10-10": **unchanged**; re-read 2026-11-27, header still Implemented (Swift 6.3). api-design.md and errors.md "`@nonexhaustive` at Swift 6.2.3 (SE-0487)": **unchanged.**
6. api-design.md open question, `@usableFromInline import` "yet to be implemented": **unchanged**; the proposal text is verbatim and the file has no commit in the window. This only proves the proposal text is unchanged; no toolchain test was run.
7. errors.md SE-0522 `UntypedThrows`: **unchanged**, Implemented (Swift 6.4). concurrency.md SE-0493 and SE-0504 "no back-deployment": status **unchanged**; the headers do not state back-deployment, so that half of the claim stays a toolchain measurement, not a proposal fact (could not determine from proposals).
8. testing.md `.serialized(for:)` "is `@_spi(Experimental)`": **unchanged.** No ST proposal promotes it. On swift-testing main (2026-11-19), `Sources/Testing/Traits/ParallelizationTrait.swift` still carries `@_spi(Experimental)` on the dependency API, and a TODO comment says the docs are to be clarified. The `.taskLocal` trait was promoted by ST-0026 (6.5), as the pair already says.

### Probe verdict for SW-CORE-14

| Probe | On 6.4.x and 6.3.x | On a 6.5 toolchain or snapshot |
|---|---|---|
| `withDeadline` (SE-0526) | still fails | likely prints FLIPPED (implementation on main); not measured |
| `defaultSwiftSettings:` (SE-0540) | still fails | likely prints FLIPPED (status Implemented (Swift 6.5)); not measured |
| stdlib `FilePath` (SE-0529) | still fails | no implementation link, expect still fails |

No toolchain was installed or run, so every "still fails" line is inferred from proposal status and swift.org/install, not measured. No 6.5 snapshot is mentioned on swift.org/install or the blog index.

## Normative guidance candidates

1. Rule: reword SW-CORE-14's rationale to "SE-0526 and SE-0529 are accepted with modifications and unshipped; SE-0540 is implemented in SwiftPM 6.5 and unshipped." Rationale: the header changed 2026-11-16 and the old sentence is now false for SE-0540. Verification: `grep -n "Status:" proposals/0540-default-target-settings.md` in swift-evolution shows `Implemented (Swift 6.5)`.
2. Rule: add to SW-CORE-14 that the probes are expected to FLIP on the first Swift 6.5 toolchain, and that FLIPPED on 6.5 means update SW-CONC-24, SW-PKG-01, SW-PKG-18 floors, not a regression. Rationale: the probe is designed to detect stale rules and 6.5 is the stated target. Verification: run the existing U10.1 to U10.3 probe script on the 6.5 toolchain; FLIPPED line printed.
3. Rule: in language.md row "not in 6.4", keep `withDeadline`, `FilePath`, `defaultSwiftSettings:`; no change needed until 6.5 ships. Verification: probe above.
4. Optional rule: add SE-0568 as a watch item next to `withDeadline` (it makes `withDeadline` run inside a cancellation scope). Rationale: it affects SW-CONC-24 and SW-CONC-33 once 6.5 lands. Verification: `grep -n "Status" proposals/0568-task-cancellation-scopes.md` after 2026-12-02.

## AI-agent angle

- An agent reading the SE-0540 header "Implemented (Swift 6.5)" may write `defaultSwiftSettings:` into a Package.swift on a 6.4 floor. Check: the SW-CORE-14 probe on the project toolchain, and `swift-tools-version` below 6.5 with `defaultSwiftSettings` in grep.
- An agent may treat SE-0568's SPI on main as shipped API. Check: `grep -rn withTaskCancellationScope Sources/` against the toolchain floor.

## Contested / evolving

- Swift 6.5 contents: the commit "Replace Swift Next with Swift 6.5" on 2026-11-10 says the schedule "has been announced", but no schedule page was found in this run. Release date and snapshot availability are unknown.
- SE-0526 header status will probably move to Implemented (Swift 6.5) in a later SwiftPM-style bulk commit; watch for it.

## Could not determine

- Whether any 6.5 snapshot or release exists as of 2026-11-27 (swift.org/install lists only 6.4.3 as stable).
- Back-deployment of SE-0493 and SE-0504 (proposal headers do not say).
- Forum thread contents (not opened); the swift-evolution commit log and headers were the primary evidence.
- The 6.4.3 point release: the pair measured 6.4.0 and 6.3.3; no re-measurement was done.

## Sources

| URL | What it is | Date | Why |
|---|---|---|---|
| https://github.com/swiftlang/swift-evolution (clone, `git log --since=2026-10-10 -- proposals`) | commit history, 117 commits | to 2026-11-21 | status change evidence |
| https://github.com/swiftlang/swift-evolution/commits/main/proposals | commit list page | to 2026-11-21 | cross-check of the log |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0526-deadline.md | SE-0526 | unchanged | status |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0540-default-target-settings.md | SE-0540 | changed 2026-11-16 | status flip |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0529-filepath-in-stdlib.md | SE-0529 | unchanged | status |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0406-async-stream-backpressure.md | SE-0406 | unchanged | status |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0409-access-level-on-imports.md | SE-0409 | unchanged | line 108 |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0568-task-cancellation-scopes.md | SE-0568 | review 2026-11-19 | new related proposal |
| https://github.com/swiftlang/swift-evolution/tree/main/proposals/testing | ST-0003, ST-0026 | ST-0026 implemented 2026-09-02 | trait promotion |
| https://github.com/swiftlang/swift-testing (clone, ParallelizationTrait.swift) | source at tip | 2026-11-19 | SPI status |
| https://github.com/swiftlang/swift/pull/91190 | withDeadline implementation PR | merged 2026-08-13, reverted, relanded 2026-08-15 | main status |
| https://www.swift.org/install/ | stable release page | 2026-11-27 | 6.4.3 latest, no 6.5 |
| https://www.swift.org/blog/ | blog index | 2026-11-27 | no 6.5 post |
| https://www.swift.org/blog/whats-new-in-swift-november-2026/ | November digest | 2026-11-11 | nothing on the named proposals |
