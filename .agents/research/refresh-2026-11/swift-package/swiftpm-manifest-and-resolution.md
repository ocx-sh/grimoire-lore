---
title: SwiftPM manifest, resolution and release-flag delta, 2026-10-10 to 2026-11-27
pair: swift-package
date_researched: 2026-11-27
window_start: 2026-10-10
model: sonnet
sources_fetched: 16
---

# SwiftPM manifest, resolution and release-flag delta

This is a delta update of the baseline research of 2026-10-10. A claim whose upstream did not move stays as written.
Method: the swift-package-manager repository was cloned (blobless) and read directly with `git log`, `git show` and
`git merge-base --is-ancestor`; single files were read from raw.githubusercontent.com at the tag `swift-6.4.3-RELEASE`
and at `main`. The GitHub REST API rate limit was exhausted by parallel agents, so issue and pull-request state came
from `gh pr view` (before the limit hit) and from the issue web page. No Swift toolchain exists on this machine, so
nothing below was re-measured by running `swift`; every verdict is a source reading, and every behavioural measurement
from 2026-10-10 (on 6.4.0 and 6.3.3) is carried forward untouched.

## Contents

- Verdict on the three decisions
- Per-claim verdicts
- Normative guidance candidates
- AI-agent angle
- Contested / evolving
- Sources

## Verdict on the three decisions

1. **SE-0540 did NOT ship in a released toolchain.** It is merged, but only into the Swift 6.5 line. Facts:
   - PR [#10033](https://github.com/swiftlang/swift-package-manager/pull/10033) merged 2026-10-20 as commit `c54d22a5c4af9fb396b90dc5798114518d68b8d4`
     ("SE-0540: Default Package Settings (#10033)"), squashed into `main`.
   - Containing refs, tested with `git merge-base --is-ancestor`: `origin/main` yes, `origin/release/6.5.x` yes.
     NOT contained: `origin/release/6.4.x`, and the tags `swift-6.4.1-RELEASE`, `swift-6.4.2-RELEASE`, `swift-6.4.3-RELEASE`.
     GitHub's branch-contains page for the commit lists only `main` and nightly snapshot tags
     `swift-DEVELOPMENT-SNAPSHOT-2026-10-27-a`, `-2026-11-01-a`, `-2026-11-25-a`.
   - The API is gated `@available(_PackageDescription, introduced: 6.5)` (read in the PR diff), so it needs
     `// swift-tools-version: 6.5`. A 6.4 compiler rejects it, exactly as SW-PKG-01 says.
   - Proposal [SE-0540](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0540-default-target-settings.md) was retitled
     "Default Target Settings" (file `0540-default-target-settings.md`; the baseline URL name `default-package-settings` is gone)
     and its status is now "Implemented (Swift 6.5)". The manifest spelling in the proposal is still `defaultSwiftSettings:`
     with `.defaults` placeholders inside per-target `swiftSettings`.
   - No Swift 6.5 release exists yet. The latest SwiftPM release tag is `swift-6.4.3-RELEASE`.
2. **#9620 did NOT close.** [swift-package-manager#9620](https://github.com/swiftlang/swift-package-manager/issues/9620) is OPEN, labelled
   `bug` and `swiftbuild backend`, no comments, no linked PR, last substantive event 2026-06-09 (a sub-issue to
   [swift-driver#2151](https://github.com/swiftlang/swift-driver/issues/2151)). `gh` reported `updatedAt` 2026-01-20. The state of swift-driver#2151 itself could not be read from the page text.
3. **Lock, retract and registry changes needing a rule edit: none for lock or retract.** Registry fixes shipped in 6.4.2 but change no documented
   rule text (details under SW-REL-19). Rule edits that ARE needed come from the patch releases, not from SwiftPM behaviour; see the candidates.

## Per-claim verdicts

| Claim | Verdict | Evidence |
|---|---|---|
| SW-PKG-01 "SE-0540 accepted with modifications (2026-09-06) and unshipped"; "#10033 was open and blocked on 2026-10-10" | **changed (partly)** | Old: #10033 open and blocked. New: #10033 merged 2026-10-20 into main; in `release/6.5.x`; in no 6.4.x release. The operative sentence "unshipped, so on Swift 6.4 the manifest fails" stays TRUE. Source: [PR](https://github.com/swiftlang/swift-package-manager/pull/10033), [proposal](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0540-default-target-settings.md). The proposal file was renamed and now reads "Implemented (Swift 6.5)". |
| SW-PKG-01 note "Re-run when #10033 ships" | **changed (trigger refined)** | The trigger is no longer #10033, which is closed. It is "a released toolchain with tools-version 6.5", i.e. the first Swift 6.5 release tag (none yet). Re-run on that event. |
| Skeleton comment "Swift 6.4 has no per-package default settings (SE-0540 is accepted, not shipped)" | **changed (wording)** | Still true for 6.4. "accepted, not shipped" should read "implemented on Swift 6.5 (tools 6.5), not in any 6.4.x". |
| Non-Negotiable 4 "no `defaultSwiftSettings:` (a compile error on 6.4)" | **unchanged** | `defaultSwiftSettings` exists in `Sources/Runtimes/PackageDescription/` on `main` and `release/6.5.x` and in no file of `release/6.4.x` or `swift-6.4.3-RELEASE` (grep count 0 vs 6). |
| SW-PKG-10, SW-PKG-34 one major of a package per graph; forum [86317](https://forums.swift.org/t/multiple-major-versions-of-a-package-in-swiftpm-opening-the-discussion/86317) | **unchanged** | Thread has 14 posts; the last is 2026-07-20 (Honza Dvorsky); nothing in the window. The author announced a GitHub project board on 2026-05-20. `git log origin/main --grep` for "multiple major"/"major version" since 2026-05-01 finds no implementation commit (only two unrelated dependabot bumps). Resolution still yields one version per package. |
| SW-GATE-22 "SwiftPM #9620 open, read 2026-10-10", "Re-run if the issue closes" | **unchanged** | Open on 2026-11-27, read via [issue page](https://github.com/swiftlang/swift-package-manager/issues/9620). Bump the read date. |
| SW-PKG-35 manifest API needs tools 6.1, `show-traits` needs 6.3 | **unchanged** | [SE-0450](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0450-swiftpm-package-traits.md) status still "implemented 6.1" in the evolution index; `Sources/Commands/PackageCommands/ShowTraits.swift` exists at both `swift-6.4.3-RELEASE` and `main`. Not re-measured. |
| SW-PKG-23 (bare `traits: ["X"]` replaces defaults) and SW-PKG-35 trait behaviour | **unchanged text, but note new 6.4.2 fixes** | 6.4.2 (released 2026-10-29) fixed trait resolution bugs: [#10570](https://github.com/swiftlang/swift-package-manager/pull/10570) "Carry a parent's request for default traits into resolution", [#10569](https://github.com/swiftlang/swift-package-manager/pull/10569) "Seed root manifest traits when loading dependency manifests", [#10579](https://github.com/swiftlang/swift-package-manager/pull/10579) "conditional traits not reaching already visited packages", and [#10584](https://github.com/swiftlang/swift-package-manager/pull/10584) which turns the hard error "Traits [Bar] have been enabled on package 'baz' that declares no traits" into a warning (falls back to defaults; a parent asking a traitless package to disable defaults is still an error). 6.4.x after the 6.4.3 tag adds [#10754](https://github.com/swiftlang/swift-package-manager/pull/10754) and [#10755](https://github.com/swiftlang/swift-package-manager/pull/10755) (trait-guarded dependency resolves whichever parent asks) which are unreleased. The measured "bare list replaces defaults" semantic was not shown to change, but it was measured on 6.4.0 only. |
| SW-PKG-32 `migrate` error texts, `--target`, "`InternalImportsByDefault` and `ImmutableWeakCaptures` are not migratable" | **unchanged** | `Sources/Commands/PackageCommands/Migrate.swift` is byte-identical between `swift-6.4.3-RELEASE` and `main` (empty diff). Not re-run. |
| SW-PKG-28 / SW-PKG-31: no `--locked`, `--frozen`, `--offline`; three spellings of `--force-resolved-versions` | **unchanged** | `Sources/CoreCommands/Options.swift` at `swift-6.4.3-RELEASE` line 324 and at `main` line 399: `name: [.long, .customLong("disable-automatic-resolution"), .customLong("only-use-versions-from-resolved-file")]`. No `locked`, `frozen` or `offline` match in either file. |
| SW-REL-11 "`--sbom-spec` exists on 6.4 only", SE-0509, CycloneDX 1.7 | **unchanged, one addition** | `--sbom-spec` is in `Options.swift` at 6.4.3 and main; [SE-0509](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0509-swift-sboms-via-swiftpm.md) "Implemented (Swift 6.4)"; `cycloneDX1LatestMinor = "1.7"` in `SBOMVersionRegistry.swift` at both refs. Wording "6.4 only" is loose: it also exists on main (6.5). Addition: [#10802](https://github.com/swiftlang/swift-package-manager/pull/10802) (2026-11-19, main only, not in 6.4.x) makes SBOM output deterministic (stable identifiers, `SOURCE_DATE_EPOCH`). On 6.4.x two SBOMs of one tree still differ per run (random UUIDs, wall-clock time), so a checksum-of-SBOM comparison stays invalid until 6.5. |
| SW-REL-12 Swift Build does not pass the environment to plugin commands | **could not determine** | No SwiftPM commit in the window mentions plugin environment (`git log --grep=environment` finds only an unrelated ModulesGraph cache). The behaviour lives partly in the swift-build repository, which was not read. The 2026-10-10 measurement on 6.4.0 and 6.3.3 stands, unverified on 6.4.3. |
| SW-REL-19 "SwiftPM has no `retract`" | **unchanged** | `git grep -i retract` over the SwiftPM tree was attempted but too slow on a blobless clone; instead no commit title in the window mentions retract and the evolution index (as of 2026-11-26) lists no retract proposal. Registry-related items in the window: [#10574](https://github.com/swiftlang/swift-package-manager/pull/10574) (6.4.2, scope registry downloads by serving registry), [#10775](https://github.com/swiftlang/swift-package-manager/pull/10775) (main only, re-download when a pinned registry version changes), [#10769](https://github.com/swiftlang/swift-package-manager/pull/10769) (6.4.x after 6.4.3, registry storage key 128 bits). None adds retract or yank. [SE-0536](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0536-registry-search.md) (registry search) is implemented in 6.5. |
| manifest.md agent-error 1: 6.4 `init` template (tools 6.4, `ApproachableConcurrency`, no mode) | **unchanged** | `Sources/Workspace/InitPackage.swift` is identical between `swift-6.4.0-RELEASE` and `swift-6.4.3-RELEASE` (empty diff). `main` differs only by `public import` and one `.swiftpm/configuration/build-cache-config.json` gitignore line, so the template did not adopt `defaultSwiftSettings` yet (the PR thread says that "could happen independently"). |

## Facts new in the window that the pair does not carry yet

- **Swift 6.4.1, 6.4.2 and 6.4.3 were released.** `https://www.swift.org/api/v1/install/releases.json` lists 6.4.1 (2026-10-12), 6.4.2 (2026-10-29) and 6.4.3 (2026-11-19), all with
  tags `swift-6.4.N-RELEASE` in swift-package-manager. The pair is bound to "6.4.0 (current)". SwiftPM changes in 6.4.0 to 6.4.3 (diff stat, 23 files): trait resolution fixes,
  registry download scoping, a PubGrub infinite-loop fix, symlink-cycle fix in target sources, PIF fixes. The first five are listed above.
- **`release/6.5.x` branch was cut on 2026-11-18** (merge base with main `a2d5382e5`). Tools-version `v6_5` already exists in `ToolsVersion.swift`.
  SwiftPM 6.5 release notes on main contain only "HTML Coverage support" so far.
- **New proposal states** (evolution index of 2026-11-26): [SE-0545](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0545-build-debugging-options.md) and
  [SE-0547](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0547-swiftpm-compilation-caching.md) implemented 6.5; SE-0541 (flexible Swift/C interop) implemented 6.5;
  SE-0560 (build-configuration conditional target dependencies) accepted; SE-0565 (deprecating package products) in active review; SE-0542 and SE-0549 (proxy configuration) returned for revision.
  None changes a claim at risk.
- Main-only: `swift build`/`swift run` gained `--enable-testability`/`--disable-testability` ([#10747](https://github.com/swiftlang/swift-package-manager/pull/10747), 2026-11-02).
- 6.4.x unreleased: [#10762](https://github.com/swiftlang/swift-package-manager/pull/10762) rejects path separators and dot names in target and product names; [#10668](https://github.com/swiftlang/swift-package-manager/pull/10668) retries transient HTTP failures in every HTTP client. The branch version is already 6.4.4.

## Normative guidance candidates

Each is an edit to existing text, not a new rule. Edit only if the owner accepts them.

1. **SW-PKG-01, skeleton comment, Non-Negotiable 4**: reword "accepted, not shipped" to "implemented for Swift 6.5 (tools 6.5), absent from every 6.4.x"; change the re-run trigger from "when #10033 ships" to "when a Swift 6.5 release tag exists". Rationale: #10033 is merged, so the old trigger already fired and would send a maintainer to a closed PR. Verification: `git merge-base --is-ancestor c54d22a5c4af9fb396b90dc5798114518d68b8d4 <tag>` for the newest `swift-6.N.M-RELEASE` tag; and `curl -s https://www.swift.org/api/v1/install/releases.json | grep '"6.5'`.
2. **SW-GATE-22**: bump "read 2026-10-10" to "read 2026-11-27". Rationale: freshness of the evidence date. Verification: `gh issue view 9620 -R swiftlang/swift-package-manager --json state`.
3. **SW-REL-11**: replace "`--sbom-spec` exists on 6.4 only" with "exists from Swift 6.4"; add that SBOM output is non-deterministic on 6.4.x (random identifiers, wall-clock timestamps) and deterministic from 6.5 (`SOURCE_DATE_EPOCH`, [#10802](https://github.com/swiftlang/swift-package-manager/pull/10802)), so never diff or checksum two SBOMs across builds on 6.4. Verification: build twice with `swift build -c release --sbom-spec cyclonedx --sbom-output-dir A` and `B`, `diff -r A B` is non-empty on 6.4.3.
   This last sentence is a prediction from the commit message and was not run.
4. **Header binding "Swift 6.4.0 (current)" in rules/swift-package.md and the three reference files; SW-REL-01 example `6.4.0`; SW-REL-03 "Re-check `--static-swift-stdlib` when 6.4.1 or a later tag lands"**: the re-check trigger fired on 2026-10-12. Rationale: current is 6.4.3, and a rule saying "re-check at 6.4.1" is now overdue, not pending. Verification: `curl -s https://www.swift.org/api/v1/install/releases.json` newest 6.4 entry; re-run SW-REL-03's measurement on a 6.4.3 image. Whether `--static-swift-stdlib` is fixed on 6.4.3 was NOT researched here (swift-build#1764 not read); another delta agent or a re-measure must settle it.
5. **SW-PKG-23 / SW-PKG-35**: add "measured on 6.4.0; 6.4.2 changed trait resolution, re-watch the `traits-bare` and `--disable-default-traits` matrix on 6.4.3 before trusting the numbers". Verification: re-run the existing matrix on a `swift:6.4.3` image.

No edit is needed for SW-PKG-28, SW-PKG-31, SW-PKG-32, SW-PKG-10, SW-PKG-34, SW-REL-19 or manifest agent-error 1.

## AI-agent angle

- An agent that reads the Swift Evolution page (now "Default Target Settings", "Implemented (Swift 6.5)") or the merged PR will conclude `defaultSwiftSettings:` works and write it under tools 6.4. It fails to compile (`extra argument 'defaultSwiftSettings' in call`). Check: `grep -rn 'defaultSwiftSettings' Package*.swift` must be empty unless the file declares `swift-tools-version: 6.5` and CI toolchain is a Swift 6.5 release.
- An agent that copies a `.swift-version` of `6.4.0` from the rules builds on a superseded patch. Check: `.swift-version` is one exact patch (SW-REL-01) and the patch exists in `releases.json`.
- An agent that sees `--sbom-spec` on main may reason the SBOM is reproducible. It is only from 6.5. Check: two builds, `diff -r`.

## Contested / evolving

- Multiple major versions of one package (forum 86317): active design effort, project board, no code on main as of 2026-11-27. Trend: likely 6.5 or later, unconfirmed.
- Swift 6.5: branch `release/6.5.x` cut 2026-11-18, so the release is the next toolchain after 6.4.x. No date was found; do not state one.
- `release/6.4.x` is now at version 6.4.4; whether 6.4.4 ships SE-0540 is no (the commit is not on that branch).

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://github.com/swiftlang/swift-package-manager/pull/10033 | SE-0540 implementation PR, merged | merged 2026-10-20 | Merge commit, thread, diff with `introduced: 6.5` |
| https://github.com/swiftlang/swift-package-manager/branch_commits/c54d22a5c4af9fb396b90dc5798114518d68b8d4 | Branches and tags containing the merge commit | read 2026-11-27 | Shows only `main` and nightly snapshots |
| https://github.com/swiftlang/swift-package-manager (clone, `git merge-base --is-ancestor`) | Refs `release/6.4.x`, `release/6.5.x`, tags 6.4.1 to 6.4.3 | read 2026-11-27 | Decisive containment test |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0540-default-target-settings.md | SE-0540 text | status Implemented (Swift 6.5) | Spelling of the API, renamed file |
| https://download.swift.org/swift-evolution/v1/evolution.json | Evolution index, generated 2026-11-26 | 2026-11-26 | Status of 0450, 0509, 0540 and all new SwiftPM proposals |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0509-swift-sboms-via-swiftpm.md | SE-0509 | Implemented 6.4 | Flag spelling and formats |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0450-swiftpm-package-traits.md | SE-0450 | Implemented 6.1 | Traits floor (status read from the index) |
| https://github.com/swiftlang/swift-package-manager/issues/9620 | Explicit-target-dependency-import-check issue | open, 2026-11-27 | Closes or not |
| https://github.com/swiftlang/swift-driver/issues/2151 | Sub-issue of 9620 | page read, state not extracted | Upstream fix location |
| https://forums.swift.org/t/86317.json | Multiple-major-versions thread | last post 2026-07-20 | No movement in window |
| https://www.swift.org/api/v1/install/releases.json | Toolchain release dates | read 2026-11-27 | 6.4.1 to 6.4.3 dates |
| https://raw.githubusercontent.com/swiftlang/swift-package-manager/main/Sources/CoreCommands/Options.swift (and at `swift-6.4.3-RELEASE`) | Flag definitions | 2026-11 | Lock flags, `--sbom-spec` |
| https://raw.githubusercontent.com/swiftlang/swift-package-manager/main/Sources/Commands/PackageCommands/Migrate.swift (and 6.4.3) | `migrate` command | 2026-11 | Identical on both refs |
| https://raw.githubusercontent.com/swiftlang/swift-package-manager/main/Sources/Workspace/InitPackage.swift (and 6.4.0, 6.4.3) | `init` templates | 2026-11 | Template unchanged |
| https://raw.githubusercontent.com/swiftlang/swift-package-manager/main/Sources/SBOMModel/Core/SBOMVersionRegistry.swift (and 6.4.3) | CycloneDX version constant | 2026-11 | `1.7` on both |
| https://github.com/swiftlang/swift-package-manager/pull/10802 | SBOM determinism PR (via `git show 74280ab24`) | merged 2026-11-19 | Reproducible SBOM, main only |
| https://raw.githubusercontent.com/swiftlang/swift-package-manager/main/Sources/PackageManagerDocs/Documentation.docc/ReleaseNotes/6.5.md | 6.5 release notes | 2026-11 | Only HTML coverage listed |

Limits: GitHub REST API was rate limited, so issue and PR bodies beyond `gh pr view 10033` came from git history and web pages. `retract` absence was inferred from commit titles and the evolution index, not from a full-tree grep. Nothing was executed on a Swift toolchain.
