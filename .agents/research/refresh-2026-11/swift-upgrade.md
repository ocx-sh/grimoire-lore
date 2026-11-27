---
title: swift-upgrade refresh, spillover round
target: swift-upgrade
date: 2026-11-27
model: opus
consolidates: /home/mherwig/dev/ocx-sh/grimoire-lore/.agents/research/refresh-2026-11/swift-upgrade/spillover-check.md
---

# swift-upgrade refresh, spillover round

## Verdict

Six in-place statement edits, no new rules, no ID changes. Swift 6.4.3 is the current release and 6.3.3 is still the previous one. The U10.1 to U10.3 probes are still STILL on 6.4.3 and 6.3.3: the swift-quality pair ran this skill's own script in the official `swift:6.4.3` and `swift:6.3.3` images on 2026-11-27. SE-0540 (swift-package-manager#10033) merged to main on 2026-10-20 and is on `release/6.5.x`, in no 6.4.x tag through 6.4.3. The API is gated `@available(_PackageDescription, introduced: 6.5)`, per the PR diff the swift-package pair read. That gate contradicts part of item 2, which said FLIPPED is expected on the first 6.5 toolchain. The probe manifest is at tools 6.2, so the gate still rejects the call on 6.5, and the move into the argument needs a tools 6.5 manifest. The U10.2 text says this instead.

This file holds the first round for swift-upgrade too: the working tree had no earlier changes under `skills/swift-upgrade/`. Every edit builds on the committed text.

## Changed statements

1. SKILL.md, Pinned defaults, Toolchain pin row: "6.4.0 current" becomes "6.4.3 current on 2026-11-27". Verification: `docker run --rm swift:6.4 swift --version` prints 6.4.3, and the swift.org release feed lists 6.4.3 (2026-11-19) and no 6.5.
2. references/toolchain-pin.md, the measurement stamp: "6.4.0 (current)" becomes "6.4.0 (then current)", followed by "6.4.3 is current on 2026-11-27 (read)". The 2026-10-10 measurement stays dated to 6.4.0. Verification: the same as statement 1.
3. references/toolchain-pin.md, the pin example becomes `6.4.3`. An example that agents copy should name the current patch. Verification: `cat .swift-version` in an adopted repository matches `swift --version` on the current image.
4. references/dated-rechecks.md, the expected probe output now says it was watched on 6.4.3 and 6.3.3 on 2026-11-27, with the 6.4.0 result kept as the 2026-10-10 measurement. Verification: run the U10.1 to U10.3 script in `swift:6.4.3` and `swift:6.3.3`, and expect four `STILL` lines on each.
5. references/dated-rechecks.md, the U10.2 SE-0540 bullet. "was open and blocked on 2026-10-10" is now false. The bullet now says the PR merged 2026-10-20, is on `release/6.5.x` and is in no 6.4.x tag through 6.4.3. It also says the API is gated at `PackageDescription` 6.5, so a tools-6.2 library keeps the loop. FLIPPED now means a tools 6.5 manifest can move the loop body. FLIPPED with a nonzero exit means only the diagnostic text changed. That last sentence follows from the script's own logic: FLIPPED prints whenever the build fails without the pinned text. Verification: `git merge-base --is-ancestor c54d22a origin/release/6.5.x` succeeds in swift-package-manager, and the same check against the `swift-6.4.3-RELEASE` tag fails.
6. references/dated-rechecks.md, U10.4: "6.4.0 was the only 6.4 tag" is kept as the 2026-10-10 reading, and the text now adds that 6.4.1, 6.4.2 and 6.4.3 were tagged since. The U10.4 trigger therefore fires on the current toolchain. The green half stays `unverified: read only`. Verification: `git ls-remote --tags https://github.com/swiftlang/swift 'swift-6.4*-RELEASE'` lists 6.4.1 to 6.4.3.

## New rules

None. The SE-0568 probe is not added (see Declined).

## Declined

- Item 2, "FLIPPED is expected on the first Swift 6.5 toolchain": contradicted by a primary source. The PR diff gates the API at `PackageDescription` 6.5. The probe manifest is at tools 6.2, so on 6.5 the call is still rejected. Statement 5 says this instead.
- Item 2, "revise SW-PKG-01, SW-PKG-18 and SW-CORE-14 on FLIPPED": not added. U10.2 already names SW-PKG-01 and SW-PKG-18, and the file header already makes a FLIPPED result a finding against the named rules.
- Item 2, "release/6.5.x cut 2026-11-17": the forum post gives 2026-11-17, but the merge base measured in the spillover check is 2026-11-19. The skill states no cut date, so nothing changes.
- Item 1, the optional SE-0568 probe: unconfirmed for shipping. The proposal is in active review until 2026-12-02, and the API is SPI on main only.
- Item 1, the 6.4.0 to 6.4.3 change in the dated-rechecks.md header stamp ("Measured 2026-10-10 on Swift 6.4.0 and 6.3.3"): declined. U10.4 to U10.6 were measured on 6.4.0 on 2026-10-10, so the stamp is still true as a dated measurement. Statement 4 marks the re-measured probe output.
- Item 1, U10.1 "absent in 6.4 (read 2026-10-10)": still true, and the 6.4.3 probe output already covers it.
- Item 3, SKILL.md U1 "6.4.0 for a CLI or server": kept. It is the minimum toolchain that can load the tools 6.4 manifest U2 writes, not a current-release stamp. A 6.4.0 pin passes that check correctly.
- Item 3, U10.7 trigger "every toolchain bump past 6.4.0": still correct, so no change.

## Sources

- swift.org release feed, https://www.swift.org/api/v1/install/releases.json (read 2026-11-27): 6.4.3 on 2026-11-19, 6.4.2, 6.4.1 and 6.4.0 before it, 6.3.3 as the last 6.3 release, and no 6.5.
- swift-package-manager PR 10033, https://github.com/swiftlang/swift-package-manager/pull/10033: merged 2026-10-20 as c54d22a. The diff carries `@available(_PackageDescription, introduced: 6.5)`. Ancestry was checked against `release/6.5.x` and the tags 6.4.1 to 6.4.3.
- SE-0568, https://github.com/swiftlang/swift-evolution/blob/main/proposals/0568-task-cancellation-scopes.md: in active review from 2026-11-19 to 2026-12-02, SPI on main.
- Swift 6.5 Release Process, https://forums.swift.org/t/90442: the branch cut announced for 2026-11-17.
- The swift-quality pair's probe run on 2026-11-27 in `swift:6.4.3` and `swift:6.3.3`: all four probes STILL.

## Revision log

- 2026-11-27, spillover round (opus): six in-place statement edits across SKILL.md, references/toolchain-pin.md and references/dated-rechecks.md. No IDs added, renumbered or removed. The line counts of SKILL.md and toolchain-pin.md are unchanged. dated-rechecks.md grows by four lines and keeps its table of contents.

### Edit list (spillover round)

1. File: skills/swift-upgrade/SKILL.md
   Find: "`.swift-version` holds the exact patch (6.4.0 current, 6.3.3 previous)"
   Replace: "`.swift-version` holds the exact patch (6.4.3 current on 2026-11-27, 6.3.3 previous)"

2. File: skills/swift-upgrade/references/toolchain-pin.md
   Find: "Measured 2026-10-10 on Swift 6.4.0 (current) and 6.3.3 (previous)."
   Replace: "Measured 2026-10-10 on Swift 6.4.0 (then current) and 6.3.3 (previous); 6.4.3 is current on 2026-11-27 (read)."

3. File: skills/swift-upgrade/references/toolchain-pin.md
   Find: "`.swift-version` holds the exact patch, for example `6.4.0`."
   Replace: "`.swift-version` holds the exact patch, for example `6.4.3`."

4. File: skills/swift-upgrade/references/dated-rechecks.md
   Find: "Expected output today, on 6.4.0 and on 6.3.3 (watched, measured 2026-10-10):"
   Replace: "Expected output today, on 6.4.3 and on 6.3.3 (watched 2026-11-27; the same four lines on 6.4.0, measured 2026-10-10):"

5. File: skills/swift-upgrade/references/dated-rechecks.md
   Find (two lines, verbatim):
   ```
     was open and blocked on 2026-10-10 (read). STILL means the shared loop of SW-PKG-18
     stays. FLIPPED means the loop body moves into the argument unchanged.
   ```
   Replace (six lines, verbatim):
   ```
     merged to main on 2026-10-20, is on `release/6.5.x` and is in no 6.4.x tag through
     6.4.3 (read 2026-11-27). It is gated at `PackageDescription` 6.5, so a tools-6.2
     library keeps the loop. STILL means the shared loop of SW-PKG-18 stays. FLIPPED
     means a manifest at tools 6.5 or higher can move the loop body into the argument
     unchanged. The probe manifest is at tools 6.2, so FLIPPED with a nonzero exit means
     only the diagnostic text changed.
   ```

6. File: skills/swift-upgrade/references/dated-rechecks.md
   Find: "backported to the 6.4.x branches, and 6.4.0 was the only 6.4 tag on 2026-10-10 (read)."
   Replace: "backported to the 6.4.x branches. 6.4.0 was the only 6.4 tag on 2026-10-10, and 6.4.1, 6.4.2 and 6.4.3 were tagged since (read 2026-11-27)."
