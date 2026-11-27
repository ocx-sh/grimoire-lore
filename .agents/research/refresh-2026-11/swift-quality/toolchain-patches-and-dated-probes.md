---
title: Swift toolchain patches and dated probes, delta 2026-10-10 to 2026-11-27
pair: swift-quality
date_researched: 2026-11-27
window_start: 2026-10-10
model: sonnet
sources_fetched: 17
---

# Swift toolchain patches and dated probes (delta update)

Scope: what shipped between 2026-10-10 and 2026-11-27, and whether any claim that the swift-quality pair pins on Swift 6.4.0 and 6.3.3 no longer holds. Out of scope: the CI matrix, swift-syntax and tools-version policy (the swift-package pair owns them). This is a delta of artifacts last current on 2026-10-10. Unchanged claims stay as they are.

Method note. The probes were not read from release notes alone. On 2026-11-27 I ran the pair's own probe script (the U10.1 to U10.3 script in `skills/swift-upgrade/references/dated-rechecks.md`) plus form, warning-group and `swift test` probes in the official Docker images `swift:6.4.3` and `swift:6.3.3`, and a `-Werror TemporaryPointers` plant in `swift:6.4.0`, `swift:6.4.3` and `swift:6.3.3`. Probe scripts: scratchpad `scripts/run.sh` and `scripts/tp.sh` (temporary, not persisted in the repository).

## Summary

- A newer 6.4.x patch exists. Three shipped in the window: 6.4.1 (tag 2026-10-07, announced 2026-10-13), 6.4.2 (tag 2026-10-26, announced 2026-10-30) and 6.4.3 (tag 2026-11-19, announced 2026-11-20). The install page now reads "Install (6.4.3)". `swift:6.4` and `swift:6.4.3` are the same current image.
- No newer 6.3.x patch exists. The `release/6.3` line has tags up to `swift-6.3.3-RELEASE` only. A 6.3.4 was planned for the end of July, then the merge window was extended to 2026-08-14 with release "a week after" (forum post of 2026-08-08), but no `swift-6.3.4-RELEASE` tag and no `swift:6.3.4` image exist on 2026-11-27. Swift 6.3.3 stays the previous-release leg.
- Recommendation: move the "current" stamp from 6.4.0 to 6.4.3 in rules/swift-quality.md and in every depth file whose stamp reads 6.4.0, but only the claims this run re-measured on 6.4.3 may carry the new patch number. Measurements elsewhere that say "measured 2026-10-10 on 6.4.0" stay true as dated measurements. Keep 6.3.3 as previous and `swift:6.2.0` as the floor.
- All four SW-CORE-14 probes are STILL on 6.4.3 and on 6.3.3, including the typed-throws `Task` frontend crash ("Please submit a bug report"). No 6.4.x release note mentions any of them.
- Every form in the language.md floor table rows "6.4.0" and "not in 6.4" behaves as stated on 6.4.3.
- The `NoUseUnstructuredThrowingTask` and `UntypedThrows` claims, and the `--repeat-until` and `.taskLocal` claims in testing.md, are unchanged. Detail in the claim ledger.
- The security.md open question has a definite answer for 6.4.3: `-Werror TemporaryPointers` still builds clean (exit 0, two warnings) on 6.4.0 and 6.4.3, and exits 1 on 6.3.3. No 6.4.1, 6.4.2 or 6.4.3 release note or commit in the 6.4.0 to 6.4.3 range mentions it. Whether an upstream issue was filed could not be determined (no search hit; GitHub's API was rate limited).
- Swift 6.5 branch date was announced: `release/6.5.x` was to be cut from main on 2026-11-17 (forum post "Swift 6.5 Release Process" of 2026-11-04). The branch exists and has commits dated 2026-11-24 and 2026-11-25. No release date and no 6.5 tag exist yet. The post gives a branch date only, no release estimate.
- One claim in cli-contract.md is now partly stale in wording only: the glibc figures are correct (2.43 on 6.4.x, 2.39 on 6.3.3) and were re-measured today on 6.4.3.

## Findings

### 1. Which patches exist

| Release | Tag commit date | Announcement | Source |
|---|---|---|---|
| 6.3.3 | download tarball dated 2026-06-30 | before window | [download.swift.org tarball header](https://download.swift.org/swift-6.3.3-release/ubuntu2404/swift-6.3.3-RELEASE/swift-6.3.3-RELEASE-ubuntu24.04.tar.gz) |
| 6.4.0 | tarball 2026-09-15 | [Swift 6.4 Released, 2026-09-15](https://www.swift.org/blog/) | blog list |
| 6.4.1 | 2026-10-07 (`6e2c194`) | [2026-10-13](https://forums.swift.org/t/90029) | `git log swift-6.4.0-RELEASE..swift-6.4.1-RELEASE` |
| 6.4.2 | 2026-10-26 (`83eb124`) | [2026-10-30](https://forums.swift.org/t/90337) | `git log swift-6.4.1-RELEASE..swift-6.4.2-RELEASE` |
| 6.4.3 | 2026-11-19 (`51bb1b8`) | [2026-11-20](https://forums.swift.org/t/90941) | [GitHub release page](https://github.com/swiftlang/swift/releases/tag/swift-6.4.3-RELEASE), marked Latest |

`git ls-remote --tags https://github.com/swiftlang/swift 'swift-6.4*' 'swift-6.3*'` lists, among releases, `swift-6.3-RELEASE`, `6.3.1`, `6.3.2`, `6.3.3`, `6.4.0`, `6.4.1`, `6.4.2` and `6.4.3`. No `swift-6.3.4-RELEASE`. The branch list holds `release/6.3` and `release/6.3.1` but no later 6.3 branch.

Docker Hub (read via the tags API on 2026-11-27): `6.4.1` pushed 2026-10-27, `6.4.2` pushed 2026-11-12, `6.4.3` pushed 2026-11-20 with distro variants rebuilt up to 2026-11-24, `6.3.3` last pushed 2026-11-20, `6.2.0` last pushed 2025-10-09, `6.4.0` last pushed 2026-10-02. Tags `6.3.4` and `6.5` do not exist. Docker push dates are rebuild dates, not release dates.

The 6.4.0 to 6.4.3 range holds 80 commits (`git log --format='%h %ad %s' swift-6.4.0-RELEASE..swift-6.4.3-RELEASE | wc -l` gives 80). The repository `CHANGELOG.md` is byte-identical at the four tags 6.4.0, 6.4.1, 6.4.2 and 6.4.3 (405,657 bytes each), so no patch changed language-visible features recorded there.

### 2. What each 6.4.x patch fixed, as far as it touches this pair

6.4.1 release notes ([forum](https://forums.swift.org/t/90029)): fixed a SIL verification failure with multiple `[weak self]` closures under `-Osize` with cross-module optimization (swift#92707), an alias-analysis miscompile dropping writes through a `MutableSpan`-like pointer (swift#92631), a `LoopInvariantCodeMotion` release-mode failure (swift#92506), a backtracer DWARF crash (swift#92184), SwiftPM PubGrub and default-trait fixes, and, under Swift Testing: "Fixed test repetition policies to no longer treat warnings and known issues as test failures. (swift-testing#1924)".

6.4.2 release notes ([forum](https://forums.swift.org/t/90337)) relevant lines: "Fixed a 6.4 regression with @TaskLocal when it is followed by another attribute. (swift#93063)", the array `init(unsafeUninitializedCapacity:initializingWith:)` now traps on an invalid `initializedCount` (swift#91690), and the availability and traits fixes. The commit for swift#93063 (`050a564`) touches only `TaskLocalMacro.swift` and one test.

6.4.3 release notes ([forum](https://forums.swift.org/t/90941)): "Fixed a race in concurrent first instantiation of metadata by mangled name in IRGen. (swift#94257)", a backtracer fix for `dwz`-compressed debug info (swift#94013), Windows Foundation fixes, and "Fixed environment variable parsing to avoid matching with names that are a prefix of the requested name. (swift-testing#2044)".

None of the three notes mentions typed throws, `Task` closures, `TemporaryPointers`, `withDeadline`, `FilePath`, `defaultSwiftSettings`, `NoUseUnstructuredThrowingTask`, `UntypedThrows` or `-Werror` group handling.

### 3. Swift 6.5

[Swift 6.5 Release Process](https://forums.swift.org/t/90442) (posted 2026-11-04 by the release coordinator): "On Nov 17th, 2026 the release/6.5.x branch will be cut from main in the swift repository and related project repositories." LLVM comes from `stable/23.x` (corrected in the thread on 2026-11-05 from a typo). The post names no release date. `git ls-remote` shows `refs/heads/release/6.5.x` with head `a35c862` dated 2026-11-25 and no `swift-6.5*` tag; development snapshot tags exist on main (`swift-DEVELOPMENT-SNAPSHOT-2026-11-25-a`). The `release/6.5.x` `CHANGELOG.md` already lists SE-0564 (`withContinuation` with an `async` body and a `ContinuationWaiter`) and a task-priority-escalation-handler behaviour change for "Swift 6.5". The branch changelog does not list `withDeadline`, `FilePath` or `defaultSwiftSettings:` in its first lines (only the head of the file was read; the full file was not searched for them).

## Claim ledger

Each row: the pair's claim, the verdict, the evidence. "Measured today" means measured on 2026-11-27 in the named Docker image.

| # | Claim (file) | Verdict | Evidence |
|---|---|---|---|
| 1 | "Binds to Swift 6.4.0 (current), Swift 6.3.3 (previous) and the `swift:6.2.0` floor leg" (rules/swift-quality.md, same stamp in language.md, api-design.md, testing.md, security.md, network.md, errors.md, io.md, cli-contract.md; "6.3.x" in concurrency.md) | changed for "current": 6.4.3 is current. 6.3.3 previous and `swift:6.2.0` floor are unchanged | 6.4.1, 6.4.2 and 6.4.3 shipped (section 1). No 6.3.4. `swift:6.2.0` is still published (Docker Hub, pushed 2025-10-09) |
| 2 | cli-contract.md "glibc 2.43 on the 6.4.0 image and 2.39 on the 6.3.3 image" | unchanged (values), wording stale | Measured today: `swift:6.4.3` gives `ldd (Ubuntu GLIBC 2.43-2ubuntu2.7) 2.43`, `swift:6.3.3` gives `ldd (Ubuntu GLIBC 2.39-0ubuntu8.12) 2.39`. Say "6.4.x image" if the stamp moves |
| 3 | SW-CORE-14 probe `withDeadline` (SE-0526) | unchanged | Measured today: STILL on 6.4.3 and 6.3.3, `cannot find 'withDeadline' in scope`, exit 1 |
| 4 | SW-CORE-14 probe `defaultSwiftSettings:` (SE-0540) | unchanged | Measured today: STILL on 6.4.3 and 6.3.3, `extra argument 'defaultSwiftSettings' in call`, exit 1. 6.4.1 to 6.4.3 SwiftPM notes list trait and PubGrub fixes only |
| 5 | SW-CORE-14 probe stdlib `FilePath` (SE-0529) | unchanged | Measured today: STILL on 6.4.3 and 6.3.3, `cannot find type 'FilePath' in scope`, exit 1 |
| 6 | SW-CORE-14 probe typed-throws `Task` closure crash | unchanged | Measured today: STILL on 6.4.3 and 6.3.3, build exits 1 with `Please submit a bug report`. No release note or commit title in 6.4.0 to 6.4.3 names it. The `Task { throw E() }` twin was not re-run |
| 7 | SW-CORE-14 text "Watched STILL on Swift 6.4.0 and 6.3.3 (measured 2026-10-10)" | extendable | May read "Watched STILL on Swift 6.4.3 and 6.3.3 (measured 2026-11-27)" for all four probes, with the 6.4.0 result kept as the 2026-10-10 measurement |
| 8 | language.md row "6.4.0": `~Sendable`, `@diagnose(...)`, `some P?`, `defer { await ... }`, `withTaskCancellationShield`, `UniqueBox`, `Iterable` | unchanged | Measured today with `swiftc -typecheck -swift-version 6`: all seven forms exit 0 on 6.4.3 and all seven fail on 6.3.3 (`'~Sendable' requires -enable-experimental-feature TildeSendable`, `cannot find type 'diagnose' in scope`, `a 'some' type must specify only 'Any', 'AnyObject', protocols, and/or a base class`, `'async' call cannot occur in a defer body`, `cannot find 'withTaskCancellationShield' in scope`, `cannot find 'UniqueBox' in scope`, `cannot find type 'Iterable' in scope`). So the "first compiler" is still 6.4.0, and no patch is needed to gate any of them |
| 9 | language.md row "not in 6.4": `withDeadline`, stdlib `FilePath`, `CommandLine.executablePath`, `defaultSwiftSettings:` | unchanged | `withDeadline`, `FilePath`, `defaultSwiftSettings` as in rows 3 to 5. `CommandLine.executablePath` fails on 6.4.3 and 6.3.3 with `type 'CommandLine' has no member 'executablePath'` |
| 10 | concurrency.md "`NoUseUnstructuredThrowingTask` exists on 6.4 only" | unchanged | `swiftc -Werror NoUseUnstructuredThrowingTask` on 6.4.3: `unstructured throwing task created by 'init(name:priority:operation:)' is not used ... [#NoUseUnstructuredThrowingTask]` as an error, exit 1. On 6.3.3: `unknown warning group: 'NoUseUnstructuredThrowingTask' [#UnknownWarningGroup]`, exit 0. The group is documented in `CHANGELOG.md` of the 6.4 tags |
| 11 | errors.md "The `UntypedThrows` group is 6.4 only (SE-0522)" | unchanged for "6.4 only", needs a wording check for the label | `-Werror UntypedThrows` on 6.4.0 and 6.4.3: exit 1, `untyped throws performs heap allocation on each 'throw' [#PerformanceHints::UntypedThrows]`. On 6.3.3: `unknown warning group`, exit 0. The 6.4 `CHANGELOG.md` entry titled SE-0522 is `@diagnose`, not the group, and the changelog does not name `UntypedThrows`, so the "(SE-0522)" label attaches the group to the `@diagnose` proposal: could not determine whether that is the intended meaning. The compiler prints the group as `PerformanceHints::UntypedThrows` |
| 12 | testing.md "`--repeat-until` and `--maximum-repetitions` need 6.4" | unchanged | `swift test --repeat-until fail --maximum-repetitions 2`: on 6.4.3 it ran repetition 2 and exited 0, on 6.3.3 it printed `Unknown option '--repeat-until'` and exited 64. New in the window: 6.4.1 fixed repetition policies counting warnings and known issues as failures (swift-testing#1924). Any measurement in testing.md of a repeat run that failed on a warning or known issue was measured on 6.4.0 and may differ on 6.4.1 and later |
| 13 | testing.md "The built-in `.taskLocal(_:withValue:)` trait is Swift 6.5 only" | unchanged | On 6.4.3 `@Test(.taskLocal(E.$v, withValue: 3))` fails with `type 'any TestTrait' has no member 'taskLocal'`. Not measured on 6.5, which has no toolchain or snapshot read in this run, so "6.5 only" is unverified: read only. 6.4.2's `@TaskLocal` fix (swift#93063) concerns the macro followed by another attribute, not the trait |
| 14 | security.md open question: `TemporaryPointers` non-escalation on 6.4 ("exit 0 where 6.3.3 exits 1") | unchanged: the regression is still present on 6.4.3 | Plant `var x = 1; let p = UnsafeMutablePointer(&x)`. Measured today: `-Werror TemporaryPointers`, `-warnings-as-errors` and `-Xfrontend -warnings-as-errors` give exit 0 with 2 warnings and 0 errors on `swift:6.4.0` and on `swift:6.4.3`, and exit 1 with 2 errors on `swift:6.3.3`. Not fixed in 6.4.1, 6.4.2 or 6.4.3: no release note names it. Whether it was filed upstream: could not determine (no issue found by web search, the GitHub API was rate limited in this run) |
| 15 | Swift 6.5 release or branch date | answered | Branch cut 2026-11-17, branch live, no release date (section 3) |

## Normative guidance candidates

1. Rule: stamp the current leg as "Swift 6.4.3 (current)" in rules/swift-quality.md and the depth files, keep "6.3.3 (previous)" and "`swift:6.2.0` floor", and say in one line that any measurement dated 2026-10-10 was taken on 6.4.0. Rationale: a stamp that names 6.4.0 while `swift:6.4` resolves to 6.4.3 makes the floating image differ from the pinned claims. Verification: `grep -n "6\.4\.0" rules/swift-quality.md skills/swift-quality-reference/*.md` lists each stamp to update, and `docker run --rm swift:6.4 swift --version` prints `6.4.3`.
2. Rule: pin the CI current leg to the exact patch image (`swift:6.4.3`), not `swift:6.4`, as SW-LANG-03 already requires for the floor. Rationale: `swift:6.4` moved from 6.4.0 to 6.4.3 in this window with no change to the tag name. Verification: `grep -rn "swift:6\.4\b" .github` finds a floating tag. This belongs to the swift-package pair's matrix scope, so I only record it.
3. Rule: keep SW-CORE-14 as written and update only its "Watched" sentence (claim 7). Rationale: all four probes are still STILL, so the rule's meaning is unchanged. Verification: run the U10.1 to U10.3 script on `swift:6.4.3` and `swift:6.3.3` and expect four `STILL` lines.
4. Rule: when SW-SEC-11 and SW-SEC-09 say "Re-check `-Werror TemporaryPointers` on each 6.4.x release", add "(still exit 0 on 6.4.3, measured 2026-11-27)". Rationale: the re-check was due on each patch, and three patches have now passed. Verification: `swiftc -typecheck -swift-version 6 -Werror TemporaryPointers plant.swift; echo $?` prints 0 on 6.4.x and 1 on 6.3.3.
5. Rule: in testing.md, state that `--repeat-until` repetition on 6.4.0 counted warnings and known issues as failures and that 6.4.1 fixed it. Rationale: a flake triage on a 6.4.0 leg could stop on a warning. Verification: reading heuristic on release note swift-testing#1924, or a repeat run of a test with a `withKnownIssue` body on 6.4.0 and 6.4.3 (not run here, so mark it "needs a re-measure": plant = a `@Test` with `withKnownIssue { Issue.record("x") }`, command `swift test --repeat-until fail --maximum-repetitions 3`).

## AI-agent angle

- An agent that reads the install page sees "6.4.3" and writes "6.4.0 (current)" from the pair's text anyway. Mechanical check: compare `swift --version` in the sandbox against the stamp.
- An agent that reads the 6.4.2 note "Fixed a 6.4 regression with @TaskLocal" may conclude the `.taskLocal` test trait shipped in 6.4. It did not (claim 13). Check: compile the `@Test(.taskLocal(...))` plant.
- An agent that sees 6.4.1 to 6.4.3 and assumes the typed-throws `Task` crash was among "compiler fixes" will drop SW-CONC-03's workaround. Check: probe 4 of the script exits 1 with `Please submit a bug report`.
- An agent may assume a 6.3.4 exists because a July forum post announced it. Check: `docker manifest inspect swift:6.3.4` fails and no `swift-6.3.4-RELEASE` tag exists.

## Contested / evolving (as of 2026-11-27)

- The 6.3 line looks abandoned after 6.3.3: a 6.3.4 got a development window and an extension, then nothing shipped in 15 weeks. If a rule needs "previous release", 6.3.3 is the last one and will not change.
- Swift 6.5 is in branch convergence. `withDeadline`, `FilePath`, `defaultSwiftSettings:` and the `.taskLocal` trait are all expected there by the pair's earlier research, but none is verified shipped. Re-run the probes the day the first `swift-6.5*-RELEASE` or a 6.5 snapshot image is available.
- The cause of the `TemporaryPointers` non-escalation on 6.4 is unknown. The 6.3.3 build exits 1, so it is a 6.4 behaviour change in how the group is handled under `-Werror`. Whether it is intended is not documented in the fetched sources.

## Open items marked "needs a re-measure"

| Item | Probe |
|---|---|
| `Task { throw E() }` twin of the typed-throws probe on 6.4.3 | `Task { throw Boom() }` in a package, `swift build`, expect exit 0 |
| Repeat-run behaviour with a known issue on 6.4.0 versus 6.4.3 | `withKnownIssue` plant, `swift test --repeat-until fail --maximum-repetitions 3` |
| `.taskLocal` trait on the first 6.5 snapshot | the `@Test(.taskLocal(E.$v, withValue: 3))` plant |
| Any other "measured 2026-10-10 on 6.4.0" figure (timings, crash-signature table, sanitizer counts) | not re-run in this delta; they remain dated 6.4.0 measurements |

## Sources

| URL | What it is | Date | Why worth reading |
|---|---|---|---|
| https://www.swift.org/blog/ | swift.org blog index | read 2026-11-27 | confirms 6.4 release 2026-09-15 and no patch or 6.5 posts in the list |
| https://www.swift.org/install/ | install page | read 2026-11-27 | shows "Install (6.4.3)" |
| https://github.com/swiftlang/swift/releases/tag/swift-6.4.3-RELEASE | GitHub release page | 2026-11-20 | marked Latest, commit `51bb1b8` |
| `git ls-remote` of github.com/swiftlang/swift (tags and heads) | tag and branch list | read 2026-11-27 | no 6.3.4 tag, no 6.5 tag, `release/6.5.x` exists |
| `git log swift-6.4.0-RELEASE..swift-6.4.3-RELEASE` (blobless fetch of the same repo) | 80 commits with dates and titles | 2026-09 to 2026-11 | the change list between the pinned and current patch |
| https://raw.githubusercontent.com/swiftlang/swift/swift-6.4.3-RELEASE/CHANGELOG.md (and the 6.4.0, 6.4.1, 6.4.2, 6.3.3 tags) | compiler changelog at each tag | 2026-11-27 | identical across 6.4.0 to 6.4.3, source of the `NoUseUnstructuredThrowingTask` entry |
| https://raw.githubusercontent.com/swiftlang/swift/release/6.5.x/CHANGELOG.md | 6.5 branch changelog | 2026-11-27 | SE-0564 and priority escalation changes |
| https://hub.docker.com/v2/repositories/library/swift/tags | Docker Hub tag list | read 2026-11-27 | which 6.4.x, 6.3.x and 6.2.0 tags exist and when pushed |
| https://download.swift.org/ tarball headers (6.3.3, 6.4.0 to 6.4.3) | release artefact dates | 2026-06 to 2026-11 | independent release dates |
| https://forums.swift.org/t/90029 | Announcing Swift 6.4.1 | 2026-10-13 | release notes, swift-testing#1924 |
| https://forums.swift.org/t/90337 | Announcing Swift 6.4.2 | 2026-10-30 | release notes, `@TaskLocal` regression fix |
| https://forums.swift.org/t/90941 | Announcing Swift 6.4.3 | 2026-11-20 | release notes, IRGen metadata race |
| https://forums.swift.org/t/90403 | Development open for Swift 6.4.3 | 2026-11-03 | merge window and plan |
| https://forums.swift.org/t/88288 | Development open for Swift 6.3.4 | 2026-07-14, update 2026-08-08 | the planned 6.3.4 that never shipped |
| https://forums.swift.org/t/90442 | Swift 6.5 Release Process | 2026-11-04 | branch date 2026-11-17 |
| https://forums.swift.org/t/85421 | Swift 6.4 Release Process and branching plans | 2026-03-18, updated 2026-09-12 | 6.4.x branch structure |
| Docker runs of `swift:6.4.0`, `swift:6.4.3`, `swift:6.3.3` | local measurements | 2026-11-27 | the probe results behind claims 2 to 14 |

Note on source count: the forum pages were read through the Discourse JSON endpoint (`/t/<id>.json`), because the HTML pages returned HTTP 403 to the fetch tool. GitHub's REST API was rate limited, so the tag list and commit history came from `git ls-remote` and a blobless git fetch instead.
