---
title: swift-upgrade spillover check
target: swift-upgrade
date_researched: 2026-11-27
model: sonnet
sources_fetched:
  - https://www.swift.org/api/v1/install/releases.json (swift.org release feed, primary)
  - https://github.com/swiftlang/swift-package-manager/pull/10033 (primary)
  - https://github.com/swiftlang/swift-evolution/blob/main/proposals/0568-task-cancellation-scopes.md (primary, via the GitHub API)
  - https://github.com/swiftlang/swift/tree/release/6.5.x and the GitHub compare/branches API for swift and swift-package-manager (primary)
---

All paths below are under /home/mherwig/dev/ocx-sh/grimoire-lore/skills/swift-upgrade/. Evidence for the pair side is in .agents/research/refresh-2026-11/swift-quality.md, swift-quality/evolution-proposal-status.md, swift-quality/recent-shifts.md, swift-quality/toolchain-patches-and-dated-probes.md, swift-package.md and swift-package/recent-shifts-scout.md.

## Item 1 (from swift-quality): STILL on 6.4.3 and 6.3.3 for U10.1-U10.3; optional SE-0568 probe after 2026-12-02

Verdict: confirmed by primary source (release facts); the STILL result itself is the pair's own probe run, not independently re-run here.

- swift.org release feed (https://www.swift.org/api/v1/install/releases.json, fetched 2026-11-27) lists 6.4.3 dated 2026-11-19, 6.4.2 2026-10-29, 6.4.1 2026-10-12, 6.4.0 2026-09-14, 6.3.3 2026-06-29, and no 6.5. The pair's notes give 6.4.3 as announced 2026-11-20 with tag 2026-11-19, consistent.
- SE-0568 proposal text states: "Status: **Active Review (November 19...December 2, 2026)**", implementation "Available as SPI on `main`". So the review closes 2026-12-02 as the item says.
- The STILL claim comes from the pair's run of this skill's own probe script in the official images (toolchain-patches-and-dated-probes.md). Not re-measured by me.

Affected text, references/dated-rechecks.md: "Expected output today, on 6.4.0 and on 6.3.3 (watched, measured 2026-10-10):" and line 11 "Measured 2026-10-10 on Swift 6.4.0 and 6.3.3 (Linux x86_64) unless an item says"; also line 119 "is expected in Swift 6.5 and is absent in 6.4 (read 2026-10-10)."

Smallest change: replace the two "6.4.0" with "6.4.3" and add "watched again 2026-11-27 on 6.4.3 and 6.3.3" to the expected-output sentence; leave 2026-10-10 on facts not re-measured. SE-0568 probe: optional, add nothing until the review decision exists (the proposal is not accepted, and the API is SPI only).

## Item 2 (from swift-quality): probes expected to FLIP on the first 6.5 toolchain (release/6.5.x cut 2026-11-17)

Verdict: confirmed by primary source for the FLIP expectation of the SE-0540 probe; the cut date could not be confirmed as 2026-11-17.

- swift-package-manager PR 10033 (https://github.com/swiftlang/swift-package-manager/pull/10033): Merged 2026-10-20 as commit c54d22a into main. GitHub compare shows c54d22a is an ancestor of release/6.5.x in swift-package-manager (status "ahead"), so it is on the 6.5 branch.
- release/6.5.x exists in swiftlang/swift (head 2026-11-25) and swift-package-manager (head 2026-11-26). The compare merge base with main is 2026-11-19 for swift and 2026-11-19 for swift-package-manager, so the branch-cut date is not 2026-11-17 by this measure. Say "cut in mid November 2026" instead.
- SE-0540 is "Implemented (Swift 6.5)" per the pair's evidence (swift-evolution commit 6d9f877, 2026-11-16); not independently re-fetched. SE-0526 withDeadline expectation in 6.5 is carried unchanged from the baseline.
- Nothing in the sources says all four probes flip on 6.5; only the SE-0540 probe is evidenced. SE-0529 and the typed-throws crash have no 6.5 evidence.

Affected text, references/dated-rechecks.md: "The FLIPPED path is real." (no statement of which probes are expected to flip on 6.5), and the U10.2 bullet "was open and blocked on 2026-10-10 (read)". The skill says nothing about SW-PKG-01 being updated on FLIPPED.

Smallest change: in the U10.2 bullet add "FLIPPED is expected on the first Swift 6.5 toolchain (SE-0540 is Implemented (Swift 6.5)); revise SW-PKG-01, SW-PKG-18 and SW-CORE-14, this is not a regression." Add SW-CONC-24 only to U10.1 (already named in its rules column).

## Item 3 (from swift-package): align dated re-checks to 6.4.3; SW-PKG-01 trigger is the first 6.5 release tag, not #10033

Verdict: confirmed by primary source.

- 6.4.3 is current (release feed above). PR 10033 merged 2026-10-20 to main and is on release/6.5.x, in no 6.4.x tag per the pair's check (swift-package.md line 36); a 6.4.x absence was not independently re-checked here but the feed shows 6.5 unreleased.
- The "6.4.0 is the only 6.4 tag" statement is false as of 2026-11-27: 6.4.1, 6.4.2 and 6.4.3 exist.

Affected text, verbatim:
- SKILL.md line 67: "`.swift-version` holds the exact patch (6.4.0 current, 6.3.3 previous) and the primary CI image derives from it"
- SKILL.md line 180: "(or `swift --version` when absent) against 6.2.0 for a library or SDK and 6.4.0"
- references/toolchain-pin.md line 20: "`.swift-version` holds the exact patch, for example `6.4.0`."
- references/toolchain-pin.md line 8: "Measured 2026-10-10 on Swift 6.4.0 (current) and 6.3.3 (previous)."
- references/dated-rechecks.md lines 134-135: "implementation, [swiftlang/swift-package-manager#10033](https://github.com/swiftlang/swift-package-manager/pull/10033), was open and blocked on 2026-10-10 (read)."
- references/dated-rechecks.md line 175: "backported to the 6.4.x branches, and 6.4.0 was the only 6.4 tag on 2026-10-10 (read)."
- references/dated-rechecks.md line 37: "every toolchain bump past 6.4.0" and line 34 "`swift --version` is 6.4.1 or later" (the latter is already correct).
- references/must-rows.md says nothing on 6.4.0, 6.4.3 or PR 10033 (grep found no match); no change needed there.

Smallest change: SKILL.md line 67 "6.4.0 current" to "6.4.3 current"; SKILL.md line 180 "6.4.0" to "6.4.3" only if it is the current-release threshold for a CLI or server (the 6.4.0 floor may be a deliberate minimum; check before editing). toolchain-pin.md line 20 example may stay `6.4.0` or move to `6.4.3`; line 8 add "and re-read 2026-11-27: 6.4.3 is current". dated-rechecks.md lines 134-135: replace "was open and blocked on 2026-10-10 (read)" with "merged to main 2026-10-20 (c54d22a), on release/6.5.x, in no 6.4.x tag (read 2026-11-27); the trigger is the first Swift 6.5 release tag." Line 175: replace "6.4.0 was the only 6.4 tag on 2026-10-10 (read)" with "6.4.1, 6.4.2 and 6.4.3 exist since (read 2026-11-27)".
