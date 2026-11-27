---
title: swift-quality delta refresh decision, 2026-10-10 to 2026-11-27
pair: swift-quality
date: 2026-11-27
window_start: 2026-10-10
model: opus
consolidates:
  - .agents/research/refresh-2026-11/swift-quality/toolchain-patches-and-dated-probes.md
  - .agents/research/refresh-2026-11/swift-quality/evolution-proposal-status.md
  - .agents/research/refresh-2026-11/swift-quality/server-package-releases.md
  - .agents/research/refresh-2026-11/swift-quality/advisory-floors.md
  - .agents/research/refresh-2026-11/swift-quality/lint-coverage-sanitizer-tooling.md
  - .agents/research/refresh-2026-11/swift-quality/apple-xcode-sdk-deltas.md
  - .agents/research/refresh-2026-11/swift-quality/recent-shifts.md
revises:
  - .agents/research/swift-procedures.md
  - .agents/research/swift-language.md
  - .agents/research/swift-api.md
  - .agents/research/swift-testing.md
  - .agents/research/swift-cli.md
  - .agents/research/swift-security.md
  - .agents/research/swift-apple.md
---

# swift-quality delta refresh decision

This is a delta update of the pair as researched on 2026-10-10. It is not a re-creation. Every claim that upstream did not change in the window stays exactly as written, and every measurement dated 2026-10-10 stays a true dated measurement.

## Verdict

1. The current toolchain stamp moves from Swift 6.4.0 to Swift 6.4.3 in the four places that call 6.4.0 "current" (the rule, language.md, api-design.md, security.md). Each stamp also says that rows dated 2026-10-10 ran on 6.4.0. Stamps that only say "6.4.0 and 6.3.3 ... measured 2026-10-10" stay, because they are true as dated measurements. Swift 6.3.3 stays the previous leg (no 6.3.4 exists) and `swift:6.2.0` stays the floor.
2. SW-CORE-14 keeps its meaning and its four probes. Its rationale is corrected for SE-0540, which is now "Implemented (Swift 6.5)", and its verification adds the 2026-11-27 STILL result on 6.4.3 and 6.3.3.
3. SW-SEC-20 raises two advisory floors: swift-crypto to 5.1.2 (GHSA-rch3-xxjq-365j, critical, and GHSA-c24m-vphm-p22w) and hummingbird to 2.29.0 (GHSA-rgp4-jj2h-f9h9, high). The `floors` script changes to match. The other three floors stay.
4. SW-SEC-09 and SW-SEC-11 record that `-Werror TemporaryPointers` still does not escalate on 6.4.3. The SW-SEC-09 (d) build-log grep stays the check.
5. SW-APPLE-10 records that the DocC deprecations moved to `deprecatedAt` 27.3, a beta SDK. The rule stays a grep. The setting oracle gains three new swift-build names (183 to 186), so SW-APPLE-01 does not flag real settings as invented. apple.md gains one gap note: Xcode 27.2's JSON `.xcproj` format is not read by any block.
6. testing.md gains two dated facts: the 6.4.0 repeat-policy bug fixed in 6.4.1, and the replacement llvm-cov PR 203724, which is still open. The coverage gap stays.
7. cli-contract.md corrects the swift-service-lifecycle tools-version sentence (2.13.0 needs tools 6.2). cli-contract.md and SW-API-24 record that ocx 0.6.6 folded exit codes 83 to 87. The new mapping is not known, so the pinned table stays the 0.6.5 table and is labelled as such.
8. No new rule ID is added. SE-0568, SE-0564, SE-0563, ST-0030 and the issue-capturing pitch are proposal text only, and SW-LANG-05 already forbids writing code against them. The 6.4.3 environment-lookup fix in Swift Testing concerns its own variable parsing and gives no rule.
9. Bumps: the rule gets a patch (corrected facts only). The reference skill gets a minor bump (the `.xcproj` gap note is new guidance, and the floors and oracle are corrected facts).

## Changed rules

| ID | Old text | New text | Source |
|---|---|---|---|
| Rule stamp (not an ID) | "Binds to Swift 6.4.0 (current), Swift 6.3.3 (previous) ... measured 2026-10-10 on Linux x86_64." | "Binds to Swift 6.4.3 (current), Swift 6.3.3 (previous) ... measured 2026-10-10 on Linux x86_64 when 6.4.0 was current, so a row that names 6.4.0 dates that run." | toolchain-patches-and-dated-probes.md, section 1: 6.4.3 tag 2026-11-19, announced 2026-11-20 (forums.swift.org/t/90941), swift.org/install reads "Install (6.4.3)", no swift-6.3.4-RELEASE tag |
| SW-CORE-14 (rationale) | "The three proposals are accepted with modifications and not shipped, and the fourth crashes the compiler." | "SE-0526 and SE-0529 are accepted with modifications, SE-0540 is implemented for Swift 6.5 (status set 2026-11-16), none ships in a release toolchain, and the fourth crashes the compiler." | evolution-proposal-status.md: swift-evolution commit 6d9f877 of 2026-11-16 |
| SW-CORE-14 (verification) | "Watched STILL on Swift 6.4.0 and 6.3.3 (measured 2026-10-10)." | "Watched STILL on Swift 6.4.0 and 6.3.3 (measured 2026-10-10) and on 6.4.3 and 6.3.3 (measured 2026-11-27, the `Task { throw E() }` twin not re-run)." | toolchain-patches-and-dated-probes.md, claim ledger rows 3 to 7 (Docker runs of `swift:6.4.3` and `swift:6.3.3`) |
| SW-SEC-09 (rationale) | "cannot be promoted to an error on 6.4.0." | "cannot be promoted to an error on 6.4.0 or 6.4.3 (6.4.3 measured 2026-11-27)." | toolchain-patches-and-dated-probes.md, claim 14 |
| SW-SEC-11 (rule) | "Re-check `-Werror TemporaryPointers` on each 6.4.x release, and until it errors" | "Re-check `-Werror TemporaryPointers` on each 6.4.x release (still exit 0 on 6.4.3, measured 2026-11-27), and until it errors" | toolchain-patches-and-dated-probes.md, claim 14 |
| SW-SEC-20 (rule, rationale, verification, `floors` block) | swift-crypto 4.5.1 and hummingbird 2.26.0 floors | swift-crypto 5.1.2 and hummingbird 2.29.0, with the advisory IDs and ranges, OSV "not found" for the new IDs, and a not-yet-watched verification line | advisory-floors.md, section 1 (GHSA-rch3-xxjq-365j and GHSA-c24m-vphm-p22w published 2026-11-19, `<= 5.1.1` and `>= 4.0.0, <= 5.1.1`, fixed 5.1.2; GHSA-rgp4-jj2h-f9h9 published 2026-11-19, `>= 2.6.0, <= 2.28.1`, fixed 2.29.0), section 3 (api.osv.dev "Vulnerability not found") |
| SW-API-24 (rationale) | ends "so a status is silently lost." | adds "The pinned table is ocx 0.6.5's: 0.6.6 (2026-11-12) folded 83 to 87 into its next-action codes, so re-copy it from the current source before use (read 2026-11-27)." | server-package-releases.md, ocx section (github.com/ocx-sh/ocx/releases/tag/v0.6.6) |
| SW-APPLE-10 (rationale, verification) | "`deprecatedAt` 27.2 ... all still `deprecated: false` (read 2026-10-10)" and "Whether the iOS 27.2 SDK warns" | "`deprecatedAt` 27.3, an SDK only in Xcode 27.3 beta (27.2 on 2026-10-10), ... none with a `deprecated` flag set (read 2026-11-27)" and "Whether the iOS 27.3 SDK warns" | apple-xcode-sdk-deltas.md, SW-APPLE-10 section (DocC JSON `swiftui/navigationview.json`, Last-Modified 2026-10-15; Xcode 27.3 Beta 2 release notes) |

Each changed ID keeps its verification command. The added verification text is quoted in the Edit list. The two raised floors have a stated but not yet watched plant: a tree pinning swift-crypto 5.1.1 and hummingbird 2.28.1 must print 2 `BELOW FLOOR` lines and exit 1.

Depth-file facts changed with no rule ID: language.md stamp and floor-table date, api-design.md stamp, security.md stamp, testing.md repeat-policy note and PR 203724, cli-contract.md swift-service-lifecycle sentence and ocx exit-code range, apple.md stamp, oracle count and `.xcproj` gap, and the oracle file itself (three names and its header).

## New rules

None. Candidates considered and dropped:

- A fifth SW-CORE-14 probe for SE-0568 `withTaskCancellationScope`. Dropped: the proposal is in review (2026-11-19 to 2026-12-02), SW-LANG-05 already forbids writing it, and the probe script is owned by the `swift-upgrade` skill (spillover).
- An SE-0564 split-continuation rule. Dropped: SW-CONC-22 already requires checked continuations, and SW-LANG-05 covers the unshipped API.
- An SE-0563 one-entry-point rule. Dropped: the review decision was not found, and SW-CLI-02 already fixes the entry point.
- A 6.4.3 CI floor for tests that touch the environment. Dropped: the swift-testing#2044 fix concerns Swift Testing's own variable parsing, not user code, so the rationale does not hold.
- A swift-nio 2.105.2 stamp in network.md. Dropped: it is hardening, not an advisory, and network.md does not stamp swift-nio.

## Confirmed unchanged

- Swift 6.3.3 is the last 6.3 release. `swift:6.2.0` is still published.
- All four SW-CORE-14 probes print STILL on 6.4.3 and 6.3.3, with the pinned messages.
- language.md floor-table rows "6.4.0" (all seven forms) and "not in 6.4" (all four) hold on 6.4.3 and 6.3.3.
- `NoUseUnstructuredThrowingTask` and `UntypedThrows` exist on 6.4 only. `--repeat-until` needs 6.4. The `.taskLocal` trait is absent on 6.4.3.
- glibc 2.43 on the 6.4.x image and 2.39 on 6.3.3, re-measured on 6.4.3.
- SE-0526, SE-0529, SE-0406, SE-0481, SE-0487, SE-0409, SE-0522, SE-0493, SE-0504, ST-0003 and ST-0026: status unchanged. `.serialized(for:)` is still `@_spi(Experimental)`.
- Package floors and behaviour: swift-subprocess 1.0.1 floor (1.0.2 is a bug-fix release), swift-system 1.5.0 floor, swift-argument-parser 1.8.2, the swift-service-lifecycle `gracefulShutdownSignals` default `[]` and its `fatalError`, swift-log 1.16.1 and `InMemoryLogHandler`, swift-configuration treating an empty variable as set, `AsyncChannel.send` swallowing cancellation, the stale AHC redirect README sentence and its default `.follow(max: 5)`, AHC setting no User-Agent, the swift-nio-ssl 2.30 trust-root floor.
- Advisory floors swift-nio 2.101.0, swift-nio-ssl 2.37.2 and swift-nio-extras 1.34.1. The GitHub reviewed Swift feed still holds 64 advisories. osv-scanner exits 1 on findings.
- SwiftLint 0.65.1 is still the newest release, its static binary still disables SourceKit rules, so the grep gates stay. `unhandled_throwing_task` is still opt-in. The three `Never*` swift-format rules are still documented, and swift-format had no release in the window.
- llvm-project#33625 is still open, and Swift still has no coverage exclusion.
- The TSan `Swift access race` on `Mutex` false-positive text stands. No fix was found.
- Xcode 27.1, 27.2 and 27.3 beta 2 include Swift 6.4. The SW-APPLE-16 MCP note is unchanged. `UIScreen.main` is still at 26.0. The availability rows for `Observations`, `Mutex`, `Tab` and `NavigationStack` are unchanged. The Xcode 26.4 interop note is unchanged.

## Open questions

- swift-crypto 4.x: the advisory ranges cover 4.x, and none of the eight newest releases backports the fix. Whether Apple will ship a 4.x fix is open, so a root that cannot move to 5.x has no patched version today.
- swift-nio-http2 1.45.0 (CVE-2026-64785) as a candidate floor: secondary-sourced from the hummingbird 2.28.0 notes. Its advisory page was not opened.
- The ocx 0.6.6 exit-code mapping for 83 to 87 is not stated. SW-API-24's table and SW-API-16's "88-127 unknownStatus" range need a re-measure against ocx 0.6.8.
- The TemporaryPointers non-escalation on 6.4: was an upstream issue filed? The search was blocked by a rate limit.
- errors.md labels the `UntypedThrows` group "(SE-0522)", while the compiler prints `PerformanceHints::UntypedThrows`. Whether that label is intended is undetermined.
- Xcode 27's new "Swift Testing and XCTest Interoperability" test-plan setting (item 170335449) predates the window. Its default is not stated, and testing.md does not cover it for Xcode runs.
- TSan `Swift access race` counts on 6.4.3, the bundled swift-format on 6.4.1 to 6.4.3, the `Task { throw E() }` twin on 6.4.3, and a repeat run with a known issue on 6.4.0 against 6.4.3 were not re-measured.
- osv-scanner 2.7.1: the watched-red example was not re-run, so 2.6.0 stays the measured version.
- The swift-async-algorithms multi-producer channel trait could not be confirmed from the fetched Package.swift.
- Swift 6.5: the branch was cut 2026-11-17, and there is no release date or snapshot image yet. Re-run the SW-CORE-14 probes and the `.taskLocal` plant on the first 6.5 toolchain.
- Xcode 27.2 known issue 187160501 (27.1 reported as a valid deployment target on non-iOS SDKs) may matter to SW-APPLE-11 floors. Not acted on.
- The `.xcproj` schema, and whether the new format is a file or a bundle directory, is `unverified: read only`.

## Revision log

- rules/swift-quality.md: current stamp 6.4.0 to 6.4.3, with 2026-10-10 rows dated to 6.4.0 (patch).
- rules/swift-quality.md SW-CORE-14: SE-0540 status corrected, 2026-11-27 STILL result on 6.4.3 added (patch).
- security.md header: current stamp, swift-crypto floor pointer, osv-scanner current version (patch).
- security.md SW-SEC-09, SW-SEC-11: TemporaryPointers still non-escalating on 6.4.3 (patch).
- security.md SW-SEC-20 and `floors` block: swift-crypto 5.1.2, hummingbird 2.29.0, OSV gap, verification line (patch).
- testing.md: 6.4.0 repeat-policy bug fixed in 6.4.1, PR 203724 still open (patch).
- cli-contract.md: swift-service-lifecycle 2.13 needs tools 6.2, ocx 0.6.6 exit-code fold (patch).
- api-design.md: current stamp, SW-API-24 marked as the 0.6.5 table (patch).
- language.md: current stamp, floor-table rows re-measured on 6.4.3 (patch).
- apple.md: swift-build oracle re-read at d417bbcdd46b (183 to 186), SW-APPLE-10 at deprecatedAt 27.3 (patch), `.xcproj` gap note (minor).
- checks/swift-settings-oracle.txt: three names added, header re-pinned (patch).

## Edit list

Paths are relative to the repository root. Each "find" string was checked to occur exactly once in its file on 2026-11-27. Apply the entries in order.

1. File `rules/swift-quality.md`.
   Find: `Swift 6.4.0 (current), Swift 6.3.3 (previous) and the `swift:6.2.0` floor leg`
   Replace: `Swift 6.4.3 (current), Swift 6.3.3 (previous) and the `swift:6.2.0` floor leg`

2. File `rules/swift-quality.md`.
   Find: `measured 2026-10-10 on Linux x86_64. macOS, Xcode,`
   Replace: `measured 2026-10-10 on Linux x86_64 when 6.4.0 was current, so a row that names 6.4.0 dates that run. macOS, Xcode,`

3. File `rules/swift-quality.md`.
   Find: `The three proposals are accepted with modifications and not shipped, and the fourth crashes the compiler.`
   Replace: `SE-0526 and SE-0529 are accepted with modifications, SE-0540 is implemented for Swift 6.5 (status set 2026-11-16), none ships in a release toolchain, and the fourth crashes the compiler.`

4. File `rules/swift-quality.md`.
   Find: `Watched STILL on Swift 6.4.0 and 6.3.3 (measured 2026-10-10). | SHOULD |`
   Replace: `Watched STILL on Swift 6.4.0 and 6.3.3 (measured 2026-10-10) and on 6.4.3 and 6.3.3 (measured 2026-11-27, the `Task { throw E() }` twin not re-run). | SHOULD |`

5. File `skills/swift-quality-reference/security.md`.
   Find: `Binds to Swift 6.4.0 (current) and 6.3.3 (previous), SwiftPM tools 6.2 and later, swift-nio 2.101.0,`
   Replace: `Binds to Swift 6.4.3 (current; rows measured 2026-10-10 ran on 6.4.0) and 6.3.3 (previous), SwiftPM tools 6.2 and later, swift-nio 2.101.0,`

6. File `skills/swift-quality-reference/security.md`.
   Find: `swift-crypto 4.5.1, SwiftLint 0.65.1 and osv-scanner 2.6.0, measured 2026-10-10 unless a row says read.`
   Replace: `swift-crypto 4.5.1 (its advisory floor is 5.1.2 since 2026-11-19, `SW-SEC-20`), SwiftLint 0.65.1 and osv-scanner 2.6.0 (2.7.1 is current and was not re-run), measured 2026-10-10 unless a row says read.`

7. File `skills/swift-quality-reference/security.md`.
   Find: `cannot be promoted to an error on 6.4.0. |`
   Replace: `cannot be promoted to an error on 6.4.0 or 6.4.3 (6.4.3 measured 2026-11-27). |`

8. File `skills/swift-quality-reference/security.md`.
   Find: ``Re-check `-Werror TemporaryPointers` on each 6.4.x release, and until it errors``
   Replace: ``Re-check `-Werror TemporaryPointers` on each 6.4.x release (still exit 0 on 6.4.3, measured 2026-11-27), and until it errors``

9. File `skills/swift-quality-reference/security.md`.
   Find: `floor swift-crypto '[4,5,1]' 4.5.1; floor hummingbird '[2,26,0]' 2.26.0; exit $bad`
   Replace: `floor swift-crypto '[5,1,2]' 5.1.2; floor hummingbird '[2,29,0]' 2.29.0; exit $bad`

10. File `skills/swift-quality-reference/security.md`.
    Find: ``swift-crypto 4.5.1 (CVE-2026-43823, critical) and hummingbird 2.26.0 (CVE-2026-97696, -97697, -102835). Re-run `discovery` before trusting the table.``
    Replace: ``swift-crypto 5.1.2 (GHSA-rch3-xxjq-365j, critical, X25519 accepts a low-order public key and returns an all-zero shared secret, `<= 5.1.1`, and GHSA-c24m-vphm-p22w, Scrypt ignores `maxMemory`, `>= 4.0.0, <= 5.1.1`; both ranges cover 4.x and no 4.x release carries the fix; it also covers CVE-2026-43823, fixed 4.5.1, and CVE-2026-86983, fixed 5.0.3) and hummingbird 2.29.0 (GHSA-rgp4-jj2h-f9h9, high, request-body close handling exhausts resources, `>= 2.6.0, <= 2.28.1`; it also covers CVE-2026-97696, -97697 and -102835, fixed 2.26.0), these two read 2026-11-27. Re-run `discovery` before trusting the table.``

11. File `skills/swift-quality-reference/security.md`.
    Find: ``inside CVE-2026-43678's `<= 2.100.0` (measured 2026-10-10). |``
    Replace: ``inside CVE-2026-43678's `<= 2.100.0` (measured 2026-10-10). The three swift-crypto and hummingbird advisories of 2026-11-19 carry no CVE, and OSV returned not found for them and for GHSA-jwv7-rv4f-rff2 (read 2026-11-27). |``

12. File `skills/swift-quality-reference/security.md`.
    Find: ``lists CVE-2026-43678 `vulnerable=<= 2.100.0 fixed=2.101.0`. | MUST (roots that ship)``
    Replace: ``lists CVE-2026-43678 `vulnerable=<= 2.100.0 fixed=2.101.0`. The swift-crypto 5.1.2 and hummingbird 2.29.0 floors (2026-11-27) are not yet watched: a tree pinning swift-crypto 5.1.1 and hummingbird 2.28.1 must print 2 `BELOW FLOOR` lines and exit 1. | MUST (roots that ship)``

13. File `skills/swift-quality-reference/testing.md`.
    Find: ``with `Unknown option`). The interop variable acts only on a 6.4 or later toolchain.``
    Replace: ``with `Unknown option`, and 6.4.0's repetition policy counts a warning or known issue as a failure, fixed in 6.4.1 by swift-testing#1924, read 2026-11-27). The interop variable acts only on a 6.4 or later toolchain.``

14. File `skills/swift-quality-reference/testing.md`.
    Find: `the inline-marker PR 203723 closed unmerged on 2026-06-13.`
    Replace: `the inline-marker PR 203723 closed unmerged on 2026-06-13, replaced the same day by PR 203724, still open and unmerged (read 2026-11-27).`

15. File `skills/swift-quality-reference/cli-contract.md`.
    Find: `swift-service-lifecycle 2.x needs tools 6.1.`
    Replace: `swift-service-lifecycle 2.12 needs tools 6.1, and 2.13.0 (2026-10-14) and later need tools 6.2.`

16. File `skills/swift-quality-reference/cli-contract.md`.
    Find: `uses 82 to 87 for its own conditions |`
    Replace: `0.6.5 used 82 to 87 for its own conditions, and 0.6.6 (2026-11-12) folded 83 to 87 into its next-action codes |`
    (The text before the find string, `` `ocx` ``, stays, so the cell reads "`ocx` 0.6.5 used 82 to 87 ...".)

17. File `skills/swift-quality-reference/api-design.md`.
    Find: `Binds to Swift 6.4.0 (current), 6.3.3 (previous) and the 6.2.0 floor leg`
    Replace: `Binds to Swift 6.4.3 (current; rows measured 2026-10-10 ran on 6.4.0), 6.3.3 (previous) and the 6.2.0 floor leg`

18. File `skills/swift-quality-reference/api-design.md`.
    Find: `assigns 87, so a status is silently lost. |`
    Replace: `assigns 87, so a status is silently lost. The pinned table is ocx 0.6.5's: 0.6.6 (2026-11-12) folded 83 to 87 into its next-action codes, so re-copy it from the current source before use (read 2026-11-27). |`

19. File `skills/swift-quality-reference/language.md`.
    Find: `Binds to Swift 6.4.0 (current), 6.3.3 (previous) and`
    Replace: `Binds to Swift 6.4.3 (current; rows measured 2026-10-10 ran on 6.4.0), 6.3.3 (previous) and`

20. File `skills/swift-quality-reference/language.md`.
    Find: `two patch-gated forms (measured 2026-10-10):`
    Replace: ``two patch-gated forms (measured 2026-10-10; the `6.4.0` and `not in 6.4` rows hold unchanged on 6.4.3 and 6.3.3, measured 2026-11-27):``

21. File `skills/swift-quality-reference/apple.md`.
    Find: `` `2187330e13e7` for setting definitions (read 2026-10-10)``
    Replace: `` `2187330e13e7` for setting definitions (read 2026-10-10; the oracle re-read at `d417bbcdd46b`, 2026-11-27)``

22. File `skills/swift-quality-reference/apple.md`.
    Find: `lists the 183 `SWIFT_*` names of swift-build's`
    Replace: `lists the 186 `SWIFT_*` names of swift-build's`

23. File `skills/swift-quality-reference/apple.md`.
    Find: `` `Swift.xcspec` (read 2026-10-10), with its regeneration command beside it. Regenerate it on each``
    Replace: `` `Swift.xcspec` (read 2026-11-27 at `d417bbcdd46b`, 183 at `2187330e13e7`), with its regeneration command beside it. Regenerate it on each``

24. File `skills/swift-quality-reference/apple.md`. Insertion.
    Anchor (the two lines, verbatim):
    ```
    `Swift.xcspec` (read 2026-11-27 at `d417bbcdd46b`, 183 at `2187330e13e7`), with its regeneration command beside it. Regenerate it on each
      swift-build bump.
    ```
    (This is the text after entry 23. The first line is indented by two spaces in the file.)
    Insert after it, as a new bullet line:
    ```
    - **Gap: the JSON project format.** Xcode 27.2 adds a JSON-based `.xcproj` project format (release note 184661114, read 2026-11-27). The blocks in this file read `.pbxproj`, `.xcconfig` and generator YAML only, so a project in that format escapes `SW-APPLE-01` to `SW-APPLE-03`. When `git ls-files -- '*.xcproj' '*.xcproj/*'` prints a path, read its settings by hand. The format's schema is `unverified: read only`.
    ```

25. File `skills/swift-quality-reference/apple.md`.
    Find: ``DocC lists most of these at `deprecatedAt` 27.2 and `UIScreen.main` at 26.0, all still `deprecated: false` (read 2026-10-10)``
    Replace: ``DocC lists most of these at `deprecatedAt` 27.3, an SDK only in Xcode 27.3 beta (27.2 on 2026-10-10), and `UIScreen.main` at 26.0, none with a `deprecated` flag set (read 2026-11-27)``

26. File `skills/swift-quality-reference/apple.md`.
    Find: ``Whether the iOS 27.2 SDK warns on these is `unverified: read only`.``
    Replace: ``Whether the iOS 27.3 SDK warns on these is `unverified: read only`.``

27. File `skills/swift-quality-reference/checks/swift-settings-oracle.txt`.
    Find: `# 183 names read from swiftlang/swift-build at commit 2187330e13e7 (Swift.xcspec and BuiltinMacros.swift), read 2026-10-10.`
    Replace: `# 186 names read from swiftlang/swift-build at commit d417bbcdd46b (Swift.xcspec and BuiltinMacros.swift), read 2026-11-27 (183 at 2187330e13e7, read 2026-10-10).`

28. File `skills/swift-quality-reference/checks/swift-settings-oracle.txt`.
    Find: `(185 raw names, 183 kept).`
    Replace: `(185 raw names and 183 kept at 2187330e13e7, 186 kept at d417bbcdd46b).`

29. File `skills/swift-quality-reference/checks/swift-settings-oracle.txt`. Insertion.
    Anchor: the line `SWIFT_CLANG_CXX_STANDARD_LIBRARY_HARDENING` (followed by `SWIFT_COHORT_ARCHS`).
    Insert after it: `SWIFT_CLANG_INLINES_ARE_PRIVATE_EXTERN`

30. File `skills/swift-quality-reference/checks/swift-settings-oracle.txt`. Insertion.
    Anchor: the line `SWIFT_ENABLE_BATCH_MODE` (followed by `SWIFT_ENABLE_COMPILE_CACHE`).
    Insert after it: `SWIFT_ENABLE_CAS_SANDBOX`

31. File `skills/swift-quality-reference/checks/swift-settings-oracle.txt`. Insertion.
    Anchor: the line `SWIFT_ENABLE_PREFIX_MAPPING` (the exact whole line, followed by `SWIFT_ENABLE_PROJECT_PREFIX_MAPPING`).
    Insert after it: `SWIFT_ENABLE_PRESCAN_CACHING`

After applying entries 29 to 31, `grep -c '^SWIFT_' skills/swift-quality-reference/checks/swift-settings-oracle.txt` prints 186. `grep -v '^#' skills/swift-quality-reference/checks/swift-settings-oracle.txt | LC_ALL=C sort -c` exits 0. Each new line is one name with no trailing space. The rule body keeps its line count (198 lines after the frontmatter), and no depth file loses its contents line.
