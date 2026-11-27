---
title: swift-package delta refresh, 2026-10-10 to 2026-11-27
pair: swift-package
date: 2026-11-27
window_start: 2026-10-10
model: opus
consolidates:
  - .agents/research/refresh-2026-11/swift-package/toolchain-releases-and-images.md
  - .agents/research/refresh-2026-11/swift-package/swiftpm-manifest-and-resolution.md
  - .agents/research/refresh-2026-11/swift-package/compiler-feature-and-warning-registry.md
  - .agents/research/refresh-2026-11/swift-package/dependency-package-pins.md
  - .agents/research/refresh-2026-11/swift-package/format-and-lint-tools.md
  - .agents/research/refresh-2026-11/swift-package/ci-workflows-and-provenance.md
  - .agents/research/refresh-2026-11/swift-package/recent-shifts-scout.md
revises:
  - .agents/research/swift-package.md
  - .agents/research/swift-gates.md
  - .agents/research/swift-release.md
---

# swift-package delta refresh

## Contents

- [Verdict](#verdict)
- [Changed rules](#changed-rules)
- [New rules](#new-rules)
- [Confirmed unchanged](#confirmed-unchanged)
- [Open questions](#open-questions)
- [Revision log](#revision-log)
- [Edit list](#edit-list)
- [Spillover round](#spillover-round)

## Verdict

- Rebind the pair to Swift 6.4.3 as the current release. Swift 6.4.1 (2026-10-12), 6.4.2 (2026-10-29) and 6.4.3 (2026-11-19) shipped in the window, according to releases.json. 6.3.3 stays the previous release, because no 6.3 patch shipped. The `swift:6.2.0` floor leg stays. Every header says that the behaviour was measured on 6.4.0 on 2026-10-10 and was not re-run on 6.4.3, because no toolchain ran in this refresh. The `.swift-version` example in Non-Negotiable 10 becomes `6.4.3`.
- Keep SW-PKG-01 as written and correct its facts. swift-package-manager#10033 merged to `main` on 2026-10-20 and is on `release/6.5.x`. It is in no 6.4.x tag through 6.4.3, and the API is gated at tools 6.5. SE-0540 was retitled "Default Target Settings" and reads "Implemented (Swift 6.5)". The re-run trigger moves from "when #10033 ships" to "the first Swift 6.5 release tag". The text also says that a tools-6.2 library keeps the loop even after 6.5 ships. The skeleton comment changes to match.
- Keep SW-REL-03's ban and tolerance. Replace its "6.4.0 is the only 6.4 tag" state line with the backport facts: #1772 went into 6.4.1, #1771 into 6.4.2 and #1770 into 6.4.x, all merged 2026-09-23. By branch history, 6.4.1 to 6.4.3 contain the fix. The removal condition counts as met only after the rule's own JSONEncoder probe exits 0 on the pinned patch. The Unverified bullet and agent error 1 change to match.
- Correct three swift-format facts in gates.md. `swift format --version` prints `main` only on 6.4.0 and prints the patch number from 6.4.1 (SW-GATE-08 and agent error 8). `.swift-format-ignore` is documented from 6.4.0 in `Documentation/IgnoringSource.md` (SW-GATE-07). The shipped `.swift-format` holds for 6.4.0 to 6.4.3, because `Configuration.swift` and the rule list are byte-identical across those patches (gates.md header). The SwiftFormat header records that 0.64.7 is the newest release and was not run.
- Rewrite SW-GATE-24's rationale for swiftlang/github-workflows 0.0.19. The default `linux_swift_versions` now holds 6.2, 6.3, 6.4 and two nightlies. Explicit passing stays, but the reason is now default drift (two moves in six weeks). Since 0.0.18 the soundness scripts come from the workflow's own commit, so the rule now also asks for a `soundness.yml` pin at 0.0.18 or later. SW-REL-01 names the new `swift:6.4-noble` default, and the gates.md header binds 0.0.19.
- Change SW-GATE-23 in place. GitHub workflow lockfiles (`.github/workflows/actions.lock`, `gh actions-lock`) became generally available on 2026-10-28, and the secure-use page now says a lockfile supersedes SHA pinning for an adopting repository. "The only way" is therefore false. A lockfile repository may keep tag refs on step-level actions. Reusable-workflow calls still take a SHA.
- Update SW-GATE-27's swift-protobuf citation. Its main branch still pins `swift:6.3`, but it now names swift-build#1776 as the cause: a link failure for C and C++-only executables, closed 2026-09-27. That is not the `Swift access race` report the row measures.
- Bump SW-GATE-22's read date to 2026-11-27 (#9620 is still open). Change SW-GATE-25's current release to 6.4.3.
- Add no new rule. Every candidate either cites a feature that no released toolchain has (SE-0547 build caching, SE-0560 configuration conditions, SE-0545 trace flags) or comes from behaviour that shipped before the window with only a secondary source (product-name case collisions under Swift Build). Each one is under Open questions.
- Bumps: the rule gets a patch (corrected facts only). The skill gets a minor, because SW-GATE-23 adds the lockfile allowance and SW-GATE-24 adds the 0.0.18 pin floor.

## Changed rules

| ID | Old text | New text | Source |
|---|---|---|---|
| SW-PKG-01 (rationale, verification) | "SE-0540 is accepted with modifications (2026-09-06) and unshipped ... The implementation, #10033, was open and blocked on 2026-10-10." / "Re-run when #10033 ships, then the loop body moves into the argument unchanged." | "SE-0540 (retitled Default Target Settings) is implemented for Swift 6.5 and gated at tools 6.5 ... merged to `main` on 2026-10-20 and is on `release/6.5.x`, but is in no 6.4.x tag through 6.4.3 (read 2026-11-27)." / "Re-run when the first Swift 6.5 release tag exists ... only a manifest at tools 6.5 moves the loop body into it, and a tools-6.2 library keeps the loop." | [swift-package-manager#10033](https://github.com/swiftlang/swift-package-manager/pull/10033), `git merge-base --is-ancestor` against `release/6.4.x`, `release/6.5.x` and the tags 6.4.1 to 6.4.3; [SE-0540](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0540-default-target-settings.md) |
| SW-GATE-07 (rationale) | "`.swift-format-ignore` is honoured by 6.4.0, ignored by 6.3.3 and documented nowhere." | "honoured from 6.4.0, where `Documentation/IgnoringSource.md` documents it ..., and ignored by 6.3.3." | [IgnoringSource.md at swift-6.4.3-RELEASE](https://raw.githubusercontent.com/swiftlang/swift-format/swift-6.4.3-RELEASE/Documentation/IgnoringSource.md), section present at 6.4.0 and absent at 6.3.3 |
| SW-GATE-08 (rationale) | "`swift format --version` prints `main` on 6.4.0, so it identifies nothing." | "prints `main` on 6.4.0 and a hand-edited patch number from 6.4.1 ..., so it identifies no 6.4.0 toolchain and only `swift --version` is the record." | [PrintVersion.swift](https://raw.githubusercontent.com/swiftlang/swift-format/swift-6.4.3-RELEASE/Sources/swift-format/PrintVersion.swift) at the 6.4.0 to 6.4.3 tags |
| SW-GATE-22 (rationale) | "#9620 open, read 2026-10-10" | "#9620 open, read 2026-11-27" | [swift-package-manager#9620](https://github.com/swiftlang/swift-package-manager/issues/9620), open on 2026-11-27 |
| SW-GATE-23 (rule, rationale, verification) | "A full-length SHA is the only way to use an action as an immutable release (GitHub secure-use guidance, read 2026-10-10)." | The rule adds a lockfile allowance for step-level actions and keeps the SHA requirement for reusable-workflow calls. The rationale names the lockfile (GA 2026-10-28). The verification reads lockfile-repository hits for job-level `uses:` only. | [lockfile GA changelog](https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available), [lockfile docs](https://docs.github.com/actions/concepts/security/workflow-dependency-lockfiles), [secure use](https://docs.github.com/en/actions/reference/security/secure-use) |
| SW-GATE-24 (rule, rationale, verification) | "The 0.0.15 default `linux_swift_versions` is 5.9, 5.10 and 6.0 to 6.3 plus nightlies, with no 6.4 ..." / "Every soundness job checks out `swiftlang/github-workflows` with no `ref:` ..." | The default list moves with each tag (0.0.15 against 0.0.19). Scripts float only up to 0.0.17. The rule pins `soundness.yml` at 0.0.18 or later, and the verification reads the version comment. | [0.0.19 swift_package_test.yml](https://raw.githubusercontent.com/swiftlang/github-workflows/0.0.19/.github/workflows/swift_package_test.yml), [0.0.19 soundness.yml](https://raw.githubusercontent.com/swiftlang/github-workflows/0.0.19/.github/workflows/soundness.yml), [releases](https://github.com/swiftlang/github-workflows/releases) |
| SW-GATE-25 (rule) | "at the current release (6.4.0)" | "at the current release (6.4.3 on 2026-11-27)" | [releases.json](https://www.swift.org/api/v1/install/releases.json) |
| SW-GATE-27 (rationale) | "with the comment that 6.4 is failing for some reason, unexplained (re-check at each toolchain bump)." | main still pins `swift:6.3` and names swift-build#1776, a C and C++-only link failure, not the `Swift access race` report. | [swift-protobuf build.yml](https://raw.githubusercontent.com/apple/swift-protobuf/main/.github/workflows/build.yml), [swift-build#1776](https://github.com/swiftlang/swift-build/issues/1776) |
| SW-REL-01 (rationale) | "A shared workflow can default its API and docs jobs to `swift:6.3-noble` (swiftlang/github-workflows 0.0.15)." | "... to a minor-only tag (`swift:6.4-noble` in swiftlang/github-workflows 0.0.19, `swift:6.3-noble` in 0.0.15, read 2026-11-27)." The sentence also adds that `swift:6.4` resolved to 6.4.3. | 0.0.19 soundness.yml; [Docker Hub tags](https://hub.docker.com/v2/repositories/library/swift/tags?page_size=100&name=6.4) |
| SW-REL-03 (rationale) | "State on 2026-10-10: ... 6.4.0 is the only 6.4 tag. The re-check is at 6.4.1 or later." | "State on 2026-11-27: ... cherry-picked into `release/6.4.1` (#1772), `release/6.4.2` (#1771) and `release/6.4.x` (#1770) ... The removal condition counts as met only once the probe exits 0 on the pinned patch." | [#1770](https://github.com/swiftlang/swift-build/pull/1770), [#1771](https://github.com/swiftlang/swift-build/pull/1771), [#1772](https://github.com/swiftlang/swift-build/pull/1772), [release/6.4.1 history](https://github.com/swiftlang/swift-build/commits/release/6.4.1), releases.json |

Each changed row keeps the verification it already had. SW-GATE-23 adds a lockfile reading step marked `unverified: read only`. SW-GATE-24 adds a reading of the version comment. The other rows change facts in the rationale only.

Edits that carry no rule ID: the binding header of the rule, manifest.md, gates.md and release.md; Non-Negotiable 10 (`6.4.0` becomes `6.4.3`); the skeleton comment on SE-0540; the release.md Unverified bullet on `--static-swift-stdlib`; release.md agent error 1; gates.md agent error 8.

## New rules

None. See Open questions for the candidates that were weighed and parked.

## Confirmed unchanged

- No 6.3 patch after 6.3.3, and no new 6.2 patch after 6.2.4 (releases.json). The floor leg and the SW-GATE-25 swift-crypto floor-patch finding stay.
- The Static Linux SDK is still version 0.1.0, and the releases.json `static-sdk` shape (`version`, `checksum`, `archs`) is unchanged. Only the checksum values differ per patch, which SW-REL-02 already handles by taking them from releases.json.
- Docker bases did not change: `swift:6.4` is Ubuntu 26.04 (`ubuntu:resolute`), `-amazonlinux2023` is AL2023, `-rhel-ubi9` exists and `-ubi9` does not. The glibc figures stay as measured.
- The native build engine is still selectable. No removal or new date was found, so "removal planned for 2026H2" stays.
- The upcoming-feature registry (15 `v6` and 6 `future` names), the already-enabled warning text, and every warning group the pair names are byte-identical from 6.4.0 to 6.4.3 (SW-PKG-03, SW-PKG-02, SW-PKG-17, SW-GATE-15, SW-GATE-17, SW-GATE-18). Changes on 6.5.x are unreleased.
- SwiftPM through 6.4.3: the `--force-resolved-versions` spellings, the absence of `--locked`, `--frozen` and `--offline`, the `Migrate.swift` sources, the `init` template, `--sbom-spec` with CycloneDX 1.7, `show-traits` and the absence of `retract` are all unchanged (SW-PKG-28, SW-PKG-31, SW-PKG-32, manifest agent error 1, SW-REL-11, SW-PKG-35, SW-REL-19). SBOM determinism (#10802) is on `main` only, so SW-REL-11 and SW-REL-14 stay as written.
- The one-major-per-graph resolution of SW-PKG-10 and SW-PKG-34 is unchanged, with no code for multiple majors.
- Pins: swift-subprocess `from: "1.0.1"` stays (1.0.2 fixes only an armv7 Android build). swift-argument-parser `from: "1.8.0"` stays. swift-syntax `lo` 602 and `hi` 605 stay (no 604.x or 605 release). The swift-crypto `"1.0.0" ..< "6.0.0"` stays (no 6.x, and the README range is unchanged). swift-docc-plugin `from: "1.4.0"` stays. swift-nio still ships `_NIOFileSystem` underscored.
- The swift-subprocess README still marks the Static Linux SDK "Build only" and lists no WASI row (SW-REL-07, SW-REL-10).
- SwiftLint: no release after 0.65.1 and no newer image tag. Every SW-GATE-11 and SW-GATE-26 trap stays, and the custom-rule default is still `.sourcekit` in the source.
- The swift-format rule count is 43, and its defaults and `rules` decode are unchanged from 6.4.0 to 6.4.3 (SW-GATE-04, SW-GATE-06). The "lines 461-464" citation sits inside the 459-465 block of the byte-identical file, so it stays.
- github-workflows 0.0.19: the `swift_flags` and `swift_nightly_flags` and-or chain is unchanged (SW-GATE-24). The API-breakage baseline still defaults to the PR base (SW-REL-20). `check-docs.sh` still logs `... no documentation targets to check.` and exits 0 with no `.spi.yml` (SW-GATE-21, whose quoted substring is still in the line). SPIManifest 1.14.0 still decodes `documentation_targets`. swift-nio's `*_arguments_override` is still the only argument string (SW-GATE-13).
- `actions/attest-build-provenance` did not release in the window, and its `subject-checksums` input still exists (SW-REL-16).

## Open questions

1. Run the SW-REL-03 JSONEncoder probe (`--static-swift-stdlib` on the default engine) on 6.4.3. If it exits 0, the next refresh can relax the tolerance clause. Until then the rule stands.
2. Re-watch the trait matrix (SW-PKG-23, SW-PKG-35) on 6.4.3. SwiftPM 6.4.2 changed trait resolution (#10569, #10570, #10579) and turned "Traits [X] have been enabled on package 'p' that declares no traits" from an error into a warning (#10584). The bare-list semantic was not shown to change. A CI rule that scans for that warning was weighed and not added, because the silent loss it guards against is narrow and unmeasured.
3. Decide whether SW-REL-16 should name `actions/attest` and add `artifact-metadata: write`. The wrapper has delegated to `actions/attest` since v4.0.0 (2026-02-25, before the baseline), and existing use remains supported. Whether the permission is needed without `push-to-registry` was not determined. This is not a window change, so the row is left as is.
4. Product names that differ only in letter case are reported unsupported under Swift Build (Swift Package Index blog, 2026-10-14). The behaviour shipped in 6.4.0, the only source is secondary, and nothing was measured. A candidate SW-PKG-39 is parked until a primary source or a measurement exists.
5. Parked until Swift 6.5 ships: SE-0547 build caching (a release job must not restore a shared build cache), SE-0560 `.when(configuration:)` (tools floor), SE-0545 trace flags, SBOM determinism from #10802, and new warning groups and the `StrictMemorySafety` default change on `release/6.5.x`. Re-check SW-PKG-01, SW-GATE-15, SW-GATE-18 and SW-PKG-03 at the first 6.5 release tag.
6. SW-REL-22: the swift-syntax prebuilt manifest could not be read (download.swift.org returned 404), so prebuilt coverage on 6.4.3 and Ubuntu 26.04 is undetermined.
7. SwiftFormat 0.64.0 renamed rules (`privateStateVariables`, `redundantViewBuilder`) and added `--unknown-options`. How an incumbent `.swiftformat` that names a renamed rule behaves under `swiftformat --lint` (SW-GATE-09) was not run.
8. The swift-crypto README phrase "almost API compatible" that SW-PKG-25 quotes was not reproduced verbatim by the fetch. The range and the recommendation are verified, and the quote is unconfirmed.
9. The behavioural rows that say to re-run at each toolchain bump (SW-GATE-13 mode-5 warnings, SW-GATE-17 `-require-explicit-sendable` demotion, SW-REL-12 plugin environment) were not re-run on 6.4.3. The sources show no change.

## Revision log

1. rules/swift-package.md header: current Swift 6.4.0 becomes 6.4.3, and the header says that behaviour was measured on 6.4.0 and not re-run.
2. rules/swift-package.md Non-Negotiable 10: the `.swift-version` example `6.4.0` becomes `6.4.3`.
3. rules/swift-package.md SW-PKG-01: #10033 merged for 6.5 and is in no 6.4.x tag, and the re-run trigger becomes the first 6.5 release tag.
4. rules/swift-package.md skeleton comment: "accepted, not shipped" becomes "needs tools 6.5".
5. manifest.md header: rebound to 6.4.3, with the unchanged SwiftPM sources named.
6. gates.md header: rebound to 6.4.3, github-workflows 0.0.19 and the newest SwiftFormat (0.64.7, not run), and states that the shipped `.swift-format` holds for 6.4.0 to 6.4.3.
7. gates.md SW-GATE-07: "documented nowhere" is replaced by the IgnoringSource.md citation.
8. gates.md SW-GATE-08: `--version` prints `main` on 6.4.0 only.
9. gates.md SW-GATE-22: the read date becomes 2026-11-27.
10. gates.md SW-GATE-23: the lockfile alternative is added, the "only way" claim is corrected, and the verification reads job-level hits.
11. gates.md SW-GATE-24: the rationale covers 0.0.15 against 0.0.19 defaults and the script source from 0.0.18, the rule asks for a pin at 0.0.18 or later, and the verification reads the version comment.
12. gates.md SW-GATE-25: the current release becomes 6.4.3.
13. gates.md SW-GATE-27: the swift-protobuf cause is named (swift-build#1776, a link failure).
14. gates.md agent error 8: `main` is qualified to 6.4.0.
15. release.md header: rebound to 6.4.3, with the date of the source re-check.
16. release.md SW-REL-01: the shared-workflow image default becomes `swift:6.4-noble` (0.0.19), and `swift:6.4` resolves to 6.4.3.
17. release.md SW-REL-03: the backports into 6.4.1, 6.4.2 and 6.4.x are named, and the removal condition is tied to the probe.
18. release.md Unverified Here: the `--static-swift-stdlib` re-check is marked due.
19. release.md agent error 1: the failure is scoped to 6.4.0's engine.
20. gates.md SW-GATE-25 (spillover round): the current leg is the exact image tag `swift:6.4.3`, never the floating `swift:6.4`, with the shared digest as rationale and a reading check for minor-only tags.

## Edit list

Apply in order. Each "find" string is verbatim and unique in its file. Paths are relative to the repository root. None of the replacements adds or removes a line, so every line budget and table of contents stays as it is.

1. `rules/swift-package.md`
   Find:
   ```
   Binds to Swift 6.4.0 (current),
   ```
   Replace:
   ```
   Binds to Swift 6.4.3 (current, released 2026-11-19),
   ```

2. `rules/swift-package.md`
   Find:
   ```
   1.0.1, SwiftLint 0.65.1 and Static Linux SDK 0.1.0 (measured 2026-10-10 on Linux x86_64).
   ```
   Replace:
   ```
   1.0.1, SwiftLint 0.65.1 and Static Linux SDK 0.1.0 (versions re-checked 2026-11-27; behaviour measured 2026-10-10 on Linux x86_64 with Swift 6.4.0, not re-run on 6.4.3).
   ```

3. `rules/swift-package.md`
   Find:
   ```
   `.swift-version` holds one exact patch (`6.4.0`), never `6.4` or `latest`.
   ```
   Replace:
   ```
   `.swift-version` holds one exact patch (`6.4.3`), never `6.4` or `latest`.
   ```

4. `rules/swift-package.md`
   Find:
   ```
   SE-0540 is accepted with modifications (2026-09-06) and unshipped, so on Swift 6.4 the manifest fails `extra argument 'defaultSwiftSettings' in call` (exit 1). The implementation, [swift-package-manager#10033](https://github.com/swiftlang/swift-package-manager/pull/10033), was open and blocked on 2026-10-10. A helper variable with that name is legal.
   ```
   Replace:
   ```
   SE-0540 (retitled Default Target Settings) is implemented for Swift 6.5 and gated at tools 6.5, so on Swift 6.4 the manifest fails `extra argument 'defaultSwiftSettings' in call` (exit 1). The implementation, [swift-package-manager#10033](https://github.com/swiftlang/swift-package-manager/pull/10033), merged to `main` on 2026-10-20 and is on `release/6.5.x`, but is in no 6.4.x tag through 6.4.3 (read 2026-11-27). A helper variable with that name is legal.
   ```

5. `rules/swift-package.md`
   Find:
   ```
   Watched red and green (measured 2026-10-10, 6.4.0). Re-run when #10033 ships, then the loop body moves into the argument unchanged.
   ```
   Replace:
   ```
   Watched red and green (measured 2026-10-10, 6.4.0). Re-run when the first Swift 6.5 release tag exists (none on 2026-11-27). The argument needs `// swift-tools-version: 6.5`, so only a manifest at tools 6.5 moves the loop body into it, and a tools-6.2 library keeps the loop.
   ```

6. `rules/swift-package.md`
   Find:
   ```
   // Swift 6.4 has no per-package default settings (SE-0540 is accepted, not shipped): one loop sets them for every target.
   ```
   Replace:
   ```
   // Swift 6.4 has no per-package default settings (SE-0540 needs tools 6.5): one loop sets them for every target.
   ```

7. `skills/swift-package-reference/manifest.md`
   Find:
   ```
   Binds to Swift 6.4.0 and 6.3.3 on Linux x86_64 (measured 2026-10-10), with the `swift:6.2.0` floor leg a pinned default
   ```
   Replace:
   ```
   Binds to Swift 6.4.3 (current) and 6.3.3 on Linux x86_64 (measured 2026-10-10 on 6.4.0; the SwiftPM `migrate`, `init` template and lock-flag sources are unchanged through 6.4.3, read 2026-11-27), with the `swift:6.2.0` floor leg a pinned default
   ```

8. `skills/swift-package-reference/gates.md`
   Find:
   ```
   Binds to Swift 6.4.0 and 6.3.3 with the bundled `swift format`, SwiftLint 0.65.1, SwiftFormat 0.63.1 (incumbent only) and
   swiftlang/github-workflows 0.0.15, measured 2026-10-10 on Linux x86_64 unless a row says read.
   ```
   Replace:
   ```
   Binds to Swift 6.4.3 (current) and 6.3.3 with the bundled `swift format`, SwiftLint 0.65.1, SwiftFormat 0.63.1 (incumbent only, newest 0.64.7 not run) and
   swiftlang/github-workflows 0.0.19 (read 2026-11-27). Behaviour was measured 2026-10-10 on Linux x86_64 with Swift 6.4.0 and github-workflows 0.0.15 unless a row says read. swift-format's `Configuration.swift` and rule list are byte-identical from 6.4.0 to 6.4.3, so the shipped `.swift-format` holds for all four patches.
   ```

9. `skills/swift-package-reference/gates.md`
   Find:
   ```
   `.swift-format-ignore` is honoured by 6.4.0, ignored by 6.3.3 and documented nowhere.
   ```
   Replace:
   ```
   `.swift-format-ignore` is honoured from 6.4.0, where `Documentation/IgnoringSource.md` documents it (section "File-Based Ignoring with `.swift-format-ignore`", read 2026-11-27), and ignored by 6.3.3.
   ```

10. `skills/swift-package-reference/gates.md`
    Find:
    ```
    `swift format --version` prints `main` on 6.4.0, so it identifies nothing.
    ```
    Replace:
    ```
    `swift format --version` prints `main` on 6.4.0 and a hand-edited patch number from 6.4.1 (`PrintVersion.swift`, read 2026-11-27), so it identifies no 6.4.0 toolchain and only `swift --version` is the record.
    ```

11. `skills/swift-package-reference/gates.md`
    Find:
    ```
    open, read 2026-10-10)
    ```
    Replace:
    ```
    open, read 2026-11-27)
    ```

12. `skills/swift-package-reference/gates.md`
    Find:
    ```
    Never `@main`, `@master` or a missing ref. A tag-only pin is a reviewed exception. | A full-length SHA is the only way to use an action as an immutable release (GitHub secure-use guidance, read 2026-10-10).
    ```
    Replace:
    ```
    Never `@main`, `@master` or a missing ref. A tag-only pin is a reviewed exception. A repository that commits a GitHub workflow lockfile (`.github/workflows/actions.lock`, written by `gh actions-lock`) may keep tag refs on step-level actions, and its reusable-workflow calls (`jobs.<id>.uses`) still take a SHA. | A full-length SHA is the one in-workflow pin to an exact commit. Since 2026-10-28 (general availability) GitHub's secure-use guidance names the lockfile as the measure that supersedes SHA pinning for a repository that adopts it, and the lockfile does not pin reusable-workflow calls (read 2026-11-27).
    ```

13. `skills/swift-package-reference/gates.md`
    Find:
    ```
    `sha-pins` in the package block below (output = a violation, empty output = pass). Watched red: 3 unpinned lines and the `@main` line on a violating workflow, empty on a compliant one.
    ```
    Replace:
    ```
    `sha-pins` in the package block below (output = a violation, empty output = pass). Watched red: 3 unpinned lines and the `@main` line on a violating workflow, empty on a compliant one. In a lockfile repository (`test -f .github/workflows/actions.lock` exits 0) a step-level hit is not a violation, so read the hits and keep only job-level `uses:` lines; the lockfile path was read, not run (`unverified: read only`).
    ```

14. `skills/swift-package-reference/gates.md`
    Find:
    ```
    and use `soundness.yml` only for the extras (license header, unacceptable language, symlinks, shell, YAML). |
    ```
    Replace:
    ```
    and use `soundness.yml` only for the extras (license header, unacceptable language, symlinks, shell, YAML), pinned at 0.0.18 or later. |
    ```

15. `skills/swift-package-reference/gates.md`
    Find:
    ```
    The 0.0.15 default `linux_swift_versions` is 5.9, 5.10 and 6.0 to 6.3 plus nightlies, with no 6.4 (read 2026-10-10), and 5.9 and 5.10 legs cannot build a tools-6.2 package.
    ```
    Replace:
    ```
    The default `linux_swift_versions` moves with each tag: 0.0.15 listed 5.9, 5.10 and 6.0 to 6.3 plus nightlies with no 6.4 (5.9 and 5.10 legs cannot build a tools-6.2 package), and 0.0.19 (2026-11-18) lists 6.2, 6.3, 6.4, `nightly-main` and `nightly-6.4.x` (read 2026-11-27), so an implicit list changes the matrix with no commit in the caller.
    ```

16. `skills/swift-package-reference/gates.md`
    Find:
    ```
    Every soundness job checks out `swiftlang/github-workflows` with no `ref:`, so a SHA pin freezes the YAML but not `check-docs.sh` or `check-swift-format.sh`.
    ```
    Replace:
    ```
    Up to 0.0.17 every soundness job checks out `swiftlang/github-workflows` with no `ref:`, so a SHA pin freezes the YAML but not `check-docs.sh` or `check-swift-format.sh`. From 0.0.18 the jobs take the scripts from the workflow's own commit (`uses: $/.github/actions/workflows-scripts`), so a pin freezes both.
    ```

17. `skills/swift-package-reference/gates.md`
    Find:
    ```
    The expression fall-through and the floating scripts are read-only evidence.
    ```
    Replace:
    ```
    The expression fall-through and the floating scripts are read-only evidence. Read the version comment on the `soundness.yml` pin: below `0.0.18` the scripts float.
    ```

18. `skills/swift-package-reference/gates.md`
    Find:
    ```
    and at the current release (6.4.0), both with the strict flag
    ```
    Replace:
    ```
    and at the current release (6.4.3 on 2026-11-27), both with the strict flag
    ```

19. `skills/swift-package-reference/gates.md`
    Find:
    ```
    pins its sanitizer jobs to `swift:6.3` with the comment that 6.4 is failing for some reason, unexplained (re-check at each toolchain bump).
    ```
    Replace:
    ```
    pins its sanitizer jobs to `swift:6.3` with the comment that 6.4 is failing for some reason. Its main branch still pins `swift:6.3` and now names the cause, [swift-build#1776](https://github.com/swiftlang/swift-build/issues/1776) (`--sanitize=thread` fails to link C and C++-only executables on Linux, closed 2026-09-27, fixed release not named): a link failure, not the `Swift access race` report above (read 2026-11-27, re-check at each toolchain bump).
    ```

20. `skills/swift-package-reference/gates.md`
    Find:
    ```
    (`swift format --version` prints `main`, so it pins nothing)
    ```
    Replace:
    ```
    (`swift format --version` prints `main` on 6.4.0, so it pins nothing)
    ```

21. `skills/swift-package-reference/release.md`
    Find:
    ```
    Binds to Swift 6.4.0 (current) and 6.3.3 (previous), Static Linux SDK 0.1.0 and the SwiftPM SBOM flag of SE-0509
    (Swift 6.4 only), all measured 2026-10-10. Every Windows, macOS, arm64 and GitHub Actions statement is
    ```
    Replace:
    ```
    Binds to Swift 6.4.3 (current, 2026-11-19) and 6.3.3 (previous), Static Linux SDK 0.1.0 and the SwiftPM SBOM flag of SE-0509
    (Swift 6.4 only), measured 2026-10-10 on 6.4.0 and re-checked against upstream sources 2026-11-27 with no build re-run. Every Windows, macOS, arm64 and GitHub Actions statement is
    ```

22. `skills/swift-package-reference/release.md`
    Find:
    ```
    (`swift:6.3` floated to 6.3.3 during the measurement)
    ```
    Replace:
    ```
    (`swift:6.3` floated to 6.3.3 during the measurement, and `swift:6.4` resolved to 6.4.3 on 2026-11-27)
    ```

23. `skills/swift-package-reference/release.md`
    Find:
    ```
    A shared workflow can default its API and docs jobs to `swift:6.3-noble` (swiftlang/github-workflows 0.0.15).
    ```
    Replace:
    ```
    A shared workflow can default its API and docs jobs to a minor-only tag (`swift:6.4-noble` in swiftlang/github-workflows 0.0.19, `swift:6.3-noble` in 0.0.15, read 2026-11-27).
    ```

24. `skills/swift-package-reference/release.md`
    Find:
    ```
    State on 2026-10-10: the fix swift-build#1763 is merged to main and backported to 6.4.x, and 6.4.0 is the only 6.4 tag. The re-check is at 6.4.1 or later.
    ```
    Replace:
    ```
    State on 2026-11-27: the fix swift-build#1763 is merged to main and cherry-picked into `release/6.4.1` (#1772), `release/6.4.2` (#1771) and `release/6.4.x` (#1770), all on 2026-09-23, so 6.4.1 (2026-10-12), 6.4.2 and 6.4.3 contain it by branch history. The behavioural probe has not been run on them, so the removal condition counts as met only once the probe exits 0 on the pinned patch.
    ```

25. `skills/swift-package-reference/release.md`
    Find:
    ```
    - Re-check `--static-swift-stdlib` when 6.4.1 or a later tag lands (`SW-REL-03`), and the swift-syntax prebuilt
    ```
    Replace:
    ```
    - The `--static-swift-stdlib` re-check is due: 6.4.1 to 6.4.3 shipped with the fix by branch history and the `SW-REL-03` probe has not been run on them. Also the swift-syntax prebuilt
    ```

26. `skills/swift-package-reference/release.md`
    Find:
    ```
    on the Swift Build engine (the 6.4 default; 6.3.3 builds with native and exits 0).
    ```
    Replace:
    ```
    on the Swift Build engine of 6.4.0 (the 6.4 default; 6.3.3 builds with native and exits 0; 6.4.1 and later carry the fix, unprobed).
    ```

## Spillover round

Input: the swift-quality spillover check (`swift-package/spillover-check.md`, read 2026-11-27), which holds 2 confirmed items, 0 unconfirmed items and 1 item that was already correct.

### Verdict

- Change SW-GATE-25 in place, so that the current-release leg names the exact image tag `swift:6.4.3` and never the floating `swift:6.4`. On 2026-11-27 Docker Hub gives tags `6.4` and `6.4.3` the same amd64 digest, so the minor-only tag moves to each new patch with no commit in the workflow. This is the same pinning reason that SW-GATE-08 gives for the format step and that SW-REL-01 gives for release jobs. The rule gets one rationale sentence and one reading check. Through swiftlang/github-workflows the image is `swift:${{ matrix.swift_version }}-${{ matrix.os_version }}`, so a `linux_swift_versions` entry of `6.4.3` produces the exact tag. SW-GATE-24 therefore stays consistent.
- Make no change for SE-0540. SW-PKG-01 and the skeleton comment already say "implemented for Swift 6.5", because of the first round.
- Make no change for the four server packages that need Swift 6.2. SW-PKG-12 already fixes library tools at `6.2`, and a tools-6.2 manifest cannot build on a lower leg. The target never proposes a leg below 6.2.
- Bumps for this round: the rule is unchanged. The skill gets a minor, because SW-GATE-25 adds a new violation (a minor-only tag on the current leg). The first round already gave the skill a minor, so the combined bump stays minor.

### Changed rules

| ID | Old text | New text | Source |
|---|---|---|---|
| SW-GATE-25 (rule, rationale, verification) | "and at the current release (6.4.3 on 2026-11-27), both with the strict flag" | "and at the current release as the exact image tag `swift:6.4.3` (never the floating `swift:6.4`; 6.4.3 on 2026-11-27), both with the strict flag". The rationale adds the shared digest, and the verification reads the current leg's tag. | [Docker Hub swift:6.4](https://hub.docker.com/v2/repositories/library/swift/tags/6.4) and [swift:6.4.3](https://hub.docker.com/v2/repositories/library/swift/tags/6.4.3) (same amd64 digest `sha256:2d76e3132ff4…a2e3`, both pushed 2026-11-20, read 2026-11-27); [0.0.19 swift_package_test.yml](https://raw.githubusercontent.com/swiftlang/github-workflows/0.0.19/.github/workflows/swift_package_test.yml) line 464 (the image tag is built from the version string, read 2026-11-27) |

### New rules

None.

### Declined

- Item 2 (SE-0540 is "Implemented (Swift 6.5)"): the target is already correct. SW-PKG-01, the skeleton comment and SW-PKG-18 hold no contradicting claim after the first round.
- Item 3 (swift-log 1.16.0, swift-service-lifecycle 2.13.0, AsyncHTTPClient 1.37.0 and swift-system 1.9.0 require Swift 6.2): this is confirmed by the release pages, but no change is needed. SW-PKG-12 already fixes library and SDK tools at `6.2`, and that already excludes a leg below 6.2. The optional parenthetical would add no enforceable behaviour, so it was not added.

### Edit list (spillover round)

Apply in order, after the first-round Edit list. Each "find" string is verbatim and occurs once in its file. The path is relative to the repository root. No replacement adds or removes a line, so the line budget and the table of contents of gates.md stay as they are.

27. `skills/swift-package-reference/gates.md`
    Find:
    ```
    and at the current release (6.4.3 on 2026-11-27), both with the strict flag
    ```
    Replace:
    ```
    and at the current release as the exact image tag `swift:6.4.3` (never the floating `swift:6.4`; 6.4.3 on 2026-11-27), both with the strict flag
    ```

28. `skills/swift-package-reference/gates.md`
    Find:
    ```
    The current-release strict leg is where 6.4-only diagnostics first fire (SW-GATE-15).
    ```
    Replace:
    ```
    The current-release strict leg is where 6.4-only diagnostics first fire (SW-GATE-15). `swift:6.4` and `swift:6.4.3` carried the same amd64 digest on 2026-11-27 (both pushed 2026-11-20), so a minor-only tag moves to each new patch with no commit in the workflow.
    ```

29. `skills/swift-package-reference/gates.md`
    Find:
    ```
    the build of each tree on its chosen floor patch is the check, exit 0 with the strict flag.
    ```
    Replace:
    ```
    the build of each tree on its chosen floor patch is the check, exit 0 with the strict flag. A current leg on a minor-only tag (`swift:6.4`, `swift:6.4-noble`, or a `linux_swift_versions` entry `6.4`, which swiftlang/github-workflows turns into `swift:6.4-<os>`) is a violation, judged by reading.
    ```
