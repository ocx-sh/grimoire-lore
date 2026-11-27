---
title: Swift lint, coverage and sanitizer tooling delta, 2026-10-10 to 2026-11-27
pair: swift-quality
date_researched: 2026-11-27
window_start: 2026-10-10
model: sonnet
sources_fetched: 9
---

# Delta result

This is a delta against the 2026-10-10 baseline. No claim at risk changed. Every unchanged verdict below rests on a primary source fetched on 2026-11-27. Two items could not be fully determined and are marked.

## Claims at risk

### 1. SwiftLint 0.65.1 static binary and `custom_rules` (io.md, errors.md, concurrency.md SW-CONC-21, security.md)

Verdict: unchanged.
- Newest SwiftLint release is still 0.65.1, published 2026-08-21 (`gh release list -R realm/SwiftLint`: "0.65.1: Fresh Folded Fixtures Latest"). There is no release inside the window, so the stamp "SwiftLint 0.65.1" stays current.
- The CHANGELOG `## Main` section (unreleased, read at https://raw.githubusercontent.com/realm/SwiftLint/main/CHANGELOG.md) holds one enhancement (autocorrection for `multiline_call_arguments`) and bug fixes. It has no entry about `custom_rules`, SourceKit or the static Linux binary.
- The older changelog text that explains the behaviour is still the latest word: "A fully statically linked binary named `swiftlint-static` that does not require any dynamic libraries at runtime. Rules requiring SourceKit will be disabled and ..." and "rules requiring SourceKit will be disabled and a warning will be printed once per rule" (CHANGELOG lines 751 and 770-771). This is by design, so no fix is planned.
- Grep-gate question: a static-binary `custom_rules` fix would let the grep gates move to SwiftLint, but none exists or is announced. The grep gates stay.

### 2. unhandled_throwing_task opt-in (owner decision 5)

Verdict: unchanged. The CHANGELOG still reads "Make `unhandled_throwing_task` opt-in instead of enabled by default" (line 2397). No newer entry reverses it.

### 3. The three Never* swift-format rules in 6.3.3 and 6.4.0

Verdict: unchanged for the rules, partly could not determine for the 6.4 line.
- swift-format has no release in the window. Newest is 604.0.0, published 2026-09-16 (before the window); 603.0.0 is 2026-06-30.
- `Documentation/RuleDocumentation.md` on the `release/6.3` and `main` branches lists NeverForceUnwrap, NeverUseForceTry and NeverUseImplicitlyUnwrappedOptionals.
- The `release/6.4` raw path returned nothing (the branch name may differ), and the 604.0.0 release body could not be read (`release not found` through the releases-by-tag call). Could not determine anything about the bundled swift-format in the Swift 6.4.1 (2026-10-15), 6.4.2 (2026-10-30) and 6.4.3 (2026-11-20) toolchain point releases. Treat the "6.4.0" stamp as true but not re-measured on 6.4.1 to 6.4.3.

### 4. LLVM coverage exclusion (testing.md)

Verdict: changed in a detail, same conclusion.
- Issue llvm-project#33625 is still open (`gh issue view`: state OPEN, updatedAt 2026-06-13).
- PR 203723 is confirmed CLOSED, mergedAt null, closedAt 2026-06-13T19:48:41Z. That part of the stamp is correct.
- New fact: the same author, on the same day, opened a replacement PR, [llvm-project#203724](https://github.com/llvm/llvm-project/pull/203724), "[llvm-cov] Add inline exclusion marker support for coverage reporting". It is OPEN and unmerged, last updated 2026-11-12. The issue was assigned to the author on 2026-06-13.
- Proposed rule text change for testing.md lines 35-36: replace "the inline-marker PR 203723 closed unmerged on 2026-06-13" with "the inline-marker PR 203723 closed unmerged on 2026-06-13 and was reopened as the still-open PR 203724 (read 2026-11-27)". Verification: `gh pr view 203724 -R llvm/llvm-project --json state,mergedAt` must show OPEN with null mergedAt. "Swift has no line or region coverage exclusion" stays true because nothing is merged and no release carries it.

### 5. TSan `Swift access race` on Mutex (SW-CORE-19, SW-CONC-27)

Verdict: unchanged.
- The Swift forums thread 84801 ("ThreadSanitizer in a Swift Concurrency World") has posts only from 2026-02-18 to 2026-02-21. It reports Mutex false positives on Linux and asks for reproducers; it states no fix.
- The only linked swiftlang/swift issue is [#86265](https://github.com/swiftlang/swift/issues/86265), "Invalid bitcast in non-copyable struct with pointer and TSAN", still OPEN (updatedAt 2026-11-19). It is a compiler crash, not the access race report.
- Could not determine whether Swift 6.4.1 to 6.4.3 changed the false positive: the release notes were not readable and no re-measurement was done. A GitHub search for a dedicated swiftlang/swift issue for the Mutex report was blocked by an API rate limit. The rule text "known false positive" stays; re-measure on 6.4.3 before the next stamp bump.

## Normative candidates

1. testing.md: add the PR 203724 note above. Rationale: the current text implies the inline-marker idea is dead. Verification: the `gh pr view` command above.
2. Optional, SW-CORE-19 and SW-CONC-27: add "re-measure on 6.4.3" to the re-check trigger. Rationale: the toolchain moved three point releases inside the window. Verification: run the existing Mutex plant under `swift test --sanitize=thread` on swift-6.4.3 and compare `Swift access race` counts with the baseline of 2.

## Sources fetched

- https://api.github.com via `gh release list` for realm/SwiftLint, swiftlang/swift-format and swiftlang/swift
- https://raw.githubusercontent.com/realm/SwiftLint/main/CHANGELOG.md
- https://github.com/llvm/llvm-project/issues/33625
- `gh pr view` for llvm-project 203723 and 203724
- https://forums.swift.org/t/threadsanitizer-in-a-swift-concurrency-world/84801.json
- `gh issue view 86265` for swiftlang/swift
- swift-format `Documentation/RuleDocumentation.md` on release/6.3 and main
