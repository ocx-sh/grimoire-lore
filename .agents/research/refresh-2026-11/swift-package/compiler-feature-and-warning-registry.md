---
title: Swift compiler upcoming-feature registry and warning-group delta, 2026-10-10 to 2026-11-27
pair: swift-package
date_researched: 2026-11-27
window_start: 2026-10-10
model: sonnet
sources_fetched: 24
---

# Swift compiler upcoming-feature registry and warning-group delta

## Summary

Nothing in a released toolchain changed. Swift 6.4.2 (tagged 2026-10-26) and 6.4.3 (tagged 2026-11-19) fall inside the window, and their `Features.def`, `DiagnosticGroups.def`, `strict-language-features.md` and `userdocs/diagnostics` file list are byte-identical to 6.4.0 (tag date 2026-09-13). Swift 6.4.1 (2026-10-07) predates the window and is identical as well. The `release/6.5.x` branch (head commit 2026-11-25, not released) adds diagnostic groups and baseline language features but no upcoming feature. Every group-registry change on 6.5.x is therefore "pending", and no rule bound to 6.4 needs editing. Method: raw files fetched at the exact tags with curl, tag dates read from a partial git fetch of the swift repository. No toolchain was run, so every behavioural claim stays "could not determine" for re-measurement.

Pinned refs: [swift-6.4.0-RELEASE](https://github.com/swiftlang/swift/tree/swift-6.4.0-RELEASE) (b8189d76), [swift-6.4.1-RELEASE](https://github.com/swiftlang/swift/tree/swift-6.4.1-RELEASE) (6e2c1945), [swift-6.4.2-RELEASE](https://github.com/swiftlang/swift/tree/swift-6.4.2-RELEASE) (83eb1244), [swift-6.4.3-RELEASE](https://github.com/swiftlang/swift/tree/swift-6.4.3-RELEASE) (51bb1b87), [release/6.5.x](https://github.com/swiftlang/swift/tree/release/6.5.x) (a35c862a at the time of reading). No branch named `release/6.5` exists; the 6.5 line is `release/6.5.x`. The latest 6.3 tag is 6.3.3 (swift-6.3.3-RELEASE, 064859e4); no 6.3 patch is newer than that.

## Claim-by-claim result

| Claim | Status | Evidence |
|---|---|---|
| SW-PKG-03: registry of 15 `v6` and 6 `future` names, identical on 6.3 and 6.4 | unchanged | [Features.def at 6.4.3, lines 302-327](https://github.com/swiftlang/swift/blob/swift-6.4.3-RELEASE/include/swift/Basic/Features.def#L302-L327): 15 `LanguageMode::v6` entries (ConciseMagicFile through GlobalActorIsolatedTypesUsability) and 6 `LanguageMode::future` entries (ExistentialAny, InternalImportsByDefault, MemberImportVisibility, InferIsolatedConformances, NonisolatedNonsendingByDefault, ImmutableWeakCaptures). The whole file hashes identically at 6.4.0, 6.4.1, 6.4.2, 6.4.3 and release/6.4.x. [release/6.5.x](https://github.com/swiftlang/swift/blob/release/6.5.x/include/swift/Basic/Features.def) has the same 21 `UPCOMING_FEATURE` lines (diff of those lines is empty). I did not re-fetch the 6.3 file; the 6.3 half of "identical" is the baseline claim, not re-verified. |
| SW-PKG-03: `v6-group` name list | unchanged | Derived from the same 15 `v6` entries; no entry added or removed on 6.4.x or 6.5.x. |
| SW-PKG-03: 6.4 warning text "upcoming feature 'X' already enabled as of the Swift 6 language mode" | unchanged | [DiagnosticsFrontend.def line 43](https://github.com/swiftlang/swift/blob/swift-6.4.3-RELEASE/include/swift/AST/DiagnosticsFrontend.def#L43): `"upcoming feature '%0' already enabled as of the Swift %1 ..."`. The same text is at 6.4.0 and on release/6.5.x. |
| SW-PKG-17: `SuppressedAssociatedTypesWithDefaults` unrecognised on 6.3 and 6.4 | unchanged, one nuance | At 6.4.3 it is a plain `LANGUAGE_FEATURE` ([line 288](https://github.com/swiftlang/swift/blob/swift-6.4.3-RELEASE/include/swift/Basic/Features.def#L288)), not an upcoming or experimental name, so `-enable-upcoming-feature` and `-enable-experimental-feature` do not accept it. Same on 6.5.x ([line 301](https://github.com/swiftlang/swift/blob/release/6.5.x/include/swift/Basic/Features.def#L301)). Only the experimental `SuppressedAssociatedTypes` name is accepted. |
| SW-PKG-08: SE-0461 and SE-0470 exist at 6.2 | could not determine | Both proposals are still present in swift-evolution main; I did not re-read their status lines because this is outside the window. |
| rules SW-PKG-02: `ImmutableWeakCaptures` and the `ExplicitSendable` group are 6.3 | unchanged | Both are still present, unrenamed, on 6.4.3 and 6.5.x (`ImmutableWeakCaptures` as `future` at Features.def line 327; `ExplicitSendable` at [DiagnosticGroups.def line 62](https://github.com/swiftlang/swift/blob/swift-6.4.3-RELEASE/include/swift/AST/DiagnosticGroups.def#L62), `DefaultIgnoreWarnings`, doc name `explicit-sendable-annotations`). The 6.3 introduction claim itself was not re-tested. |
| SW-GATE-15: `NoUsage`, `VariableNeverMutated`, `NoUseUnstructuredThrowingTask`, `UntypedThrows` unknown on 6.3.3 | unchanged (6.3.3 is the last 6.3 patch) | All four are present on 6.4.3 (DiagnosticGroups.def lines 82, 115, 111, 110) and on 6.5.x. No 6.3.4 exists, so the 6.3.3 observation cannot have moved. |
| SW-GATE-15: `ImplicitStrongCapture` is a 6.4 group | unchanged | [Line 65](https://github.com/swiftlang/swift/blob/swift-6.4.3-RELEASE/include/swift/AST/DiagnosticGroups.def#L65), `none` default, doc name `implicit-strong-capture`; same on 6.5.x. |
| SW-GATE-15: `NoUseUnstructuredThrowingTask` is default-on on 6.4 | unchanged | [Line 111](https://github.com/swiftlang/swift/blob/swift-6.4.3-RELEASE/include/swift/AST/DiagnosticGroups.def#L111): `GROUP(NoUseUnstructuredThrowingTask,none,"no-use-throwing-unstructured-task")`. A default of `none` means the group does not default to ignored, which is consistent with default-on; the group file does not itself say the warning is on. Doc name is `no-use-throwing-unstructured-task`. |
| SW-GATE-17: `-require-explicit-sendable` demotion observed, re-run at each toolchain bump | could not determine | The flag still exists with the same help text on 6.4.3 and 6.5.x ([Options.td](https://github.com/swiftlang/swift/blob/release/6.5.x/include/swift/Option/Options.td#L611)). The demotion is runtime behaviour; no toolchain was run. `ExplicitSendable` is unchanged at `DefaultIgnoreWarnings`. |
| SW-GATE-17: on 6.4, `~Sendable` | unchanged | [`TildeSendable` (SE-0518) is a `SUPPRESSIBLE_LANGUAGE_FEATURE` at line 287](https://github.com/swiftlang/swift/blob/swift-6.4.3-RELEASE/include/swift/Basic/Features.def#L287) on 6.4.3. |
| SW-GATE-18: `@diagnose` (SE-0522, Swift 6.4) and no `@warn` | unchanged | [SE-0522 status](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0522-source-warning-control.md): "Implemented (Swift 6.4)"; last edit 2026-09-04, before the window. The proposal text contains no `@warn` spelling. [CHANGELOG at 6.4.3 lines 8-15](https://github.com/swiftlang/swift/blob/swift-6.4.3-RELEASE/CHANGELOG.md#L8-L15) documents `@diagnose(GroupID, as: error\|warning...)`. SE-0443 (Implemented 6.1) and SE-0480 (Implemented 6.2) are unchanged. |
| SW-GATE-13: 6.4 mode-5 behaviour (Sendable warnings in Swift 5 mode without `StrictConcurrency` not promoted; 6.3.3 promoted) | could not determine | Behavioural, needs a toolchain run. No source evidence of a change between 6.4.0 and 6.4.3: Features.def, DiagnosticGroups.def and the diagnostics docs are byte-identical. DiagnosticsSema.def differs by 13 lines (memberwise-initializer and `@available` stored-property messages), unrelated to Sendable. |

## Pending, 6.5.x branch only (not released)

Do not edit any rule bound to 6.4 for these. Source: [DiagnosticGroups.def on release/6.5.x](https://github.com/swiftlang/swift/blob/release/6.5.x/include/swift/AST/DiagnosticGroups.def), compared with the 6.4.3 file.

- New groups: `AlwaysUnsafe`, `CanImportMissingModule`, `ConditionalBindingNonOptionalType`, `HeapAllocation` (linked under `PerformanceHints`), `ImplicitForceUnwrap` (`DefaultIgnoreWarnings`), `MissingRuntimeFailureMessage`, `UnstableGlobalActorShared`, `PublicImportOfProjectInternalModule`, `RegionIsolationCrossIsolationDataRace`, `RegionIsolationIsolationHistory`, `RegionIsolationUnknownPattern` (all three linked under `RegionIsolation`), `UnavailableOverride`, `StrictExhaustiveSwitches` (`DefaultIgnoreWarnings`).
- Default changed: `StrictMemorySafety` goes from `none` to `DefaultIgnoreWarnings`.
- 10 new group doc pages under userdocs/diagnostics (75 files at 6.4.3, 85 on 6.5.x); `strict-language-features.md` is unchanged.
- Features.def: no new `UPCOMING_FEATURE`. Added language features include `SymbolLinkageMarkers` (SE-0492), `BuiltinTaskDeadline` (SE-0526) and `BuiltinSplitContinuations` (SE-0564); `ABIAttributeSE0479` moved from suppressible to baseline; `DeferredCodeGen` experimental feature removed.
- [CHANGELOG "Swift (next)"](https://github.com/swiftlang/swift/blob/release/6.5.x/CHANGELOG.md) adds SE-0478 file-level `default @diagnose`, which extends the SE-0522 attribute; it is not in any 6.4.x release.
- Re-measurement trigger for the pair when 6.5 is released: SW-GATE-15 (group names, especially if the `StrictMemorySafety` default change affects a gate), SW-GATE-18 (`default @diagnose`), SW-PKG-03 (confirm still 15 plus 6).

## Rows needing re-measurement

None required by this window. A re-measurement (running the gates on a 6.4.3 toolchain) is only worthwhile for SW-GATE-13 and SW-GATE-17, whose claims are behavioural and explicitly say to re-run at each toolchain bump; the source data gives no sign that they changed.

## Normative guidance candidates

1. Rule: record 6.4.3 as the newest checked patch for SW-PKG-03 and SW-GATE-15 only if the pair tracks patch levels. Rationale: the registry is byte-identical across 6.4.0 to 6.4.3. Verification: `curl -s https://raw.githubusercontent.com/swiftlang/swift/swift-6.4.3-RELEASE/include/swift/Basic/Features.def | grep -cE '^(MIGRATABLE_)?UPCOMING_FEATURE\('` returns 21.
2. Rule: keep 6.5.x group changes out of 6.4-bound rows until a `swift-6.5*-RELEASE` tag exists. Rationale: branch changes can still be reverted. Verification: `git ls-remote --tags https://github.com/swiftlang/swift 'swift-6.5*-RELEASE'` is empty.

## AI-agent angle

An agent may name a 6.5.x-only group (for example `HeapAllocation` or `StrictExhaustiveSwitches`) in `-Wwarning` or `@diagnose`. Smallest check: grep the group name in DiagnosticGroups.def at the pinned toolchain tag.

## Contested / evolving

The 6.5 line is `release/6.5.x`, with no `release/6.5` branch and no 6.5 tag as of 2026-11-27. Expect more group churn before release.

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://raw.githubusercontent.com/swiftlang/swift/swift-6.4.3-RELEASE/include/swift/Basic/Features.def | registry, 6.4.3 | 2026-11-19 | primary |
| same path at swift-6.4.0-RELEASE, 6.4.1, 6.4.2, release/6.4.x, release/6.5.x | registry comparisons | 2026-09-13 to 2026-11-25 | primary |
| https://raw.githubusercontent.com/swiftlang/swift/swift-6.4.3-RELEASE/include/swift/AST/DiagnosticGroups.def (and 6.4.0, release/6.4.x, release/6.5.x) | warning groups | same | primary |
| https://raw.githubusercontent.com/swiftlang/swift/swift-6.4.3-RELEASE/include/swift/AST/DiagnosticsFrontend.def (and 6.4.0, 6.4.x, 6.5.x) | already-enabled warning text | same | primary |
| https://raw.githubusercontent.com/swiftlang/swift/swift-6.4.3-RELEASE/include/swift/AST/DiagnosticsSema.def (and 6.4.0, 6.5.x) | Sema diagnostics diff | same | primary |
| https://raw.githubusercontent.com/swiftlang/swift/swift-6.4.3-RELEASE/userdocs/diagnostics/strict-language-features.md (and 6.4.0, 6.5.x) | upcoming-feature doc | same | primary |
| git trees of userdocs/diagnostics at 6.4.0, 6.4.3, 6.5.x | group doc page lists | same | primary |
| https://raw.githubusercontent.com/swiftlang/swift/swift-6.4.3-RELEASE/CHANGELOG.md (and 6.4.0, 6.5.x) | changelog | same | primary |
| https://raw.githubusercontent.com/swiftlang/swift/release/6.5.x/include/swift/Option/Options.td (and 6.4.3) | `-require-explicit-sendable` | 2026-11-25 | primary |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0522-source-warning-control.md | SE-0522 | edited 2026-09-04 | primary |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0443-warning-control-flags.md | SE-0443 | Implemented 6.1 | primary |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0480-swiftpm-warning-control.md | SE-0480 | Implemented 6.2 | primary |
| git ls-remote of swiftlang/swift heads and tags | tag and branch inventory | 2026-11-27 | primary |
