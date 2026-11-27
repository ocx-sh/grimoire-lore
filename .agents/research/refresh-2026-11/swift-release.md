---
title: swift-release refresh, spillover round
target: swift-release
date: 2026-11-27
model: opus
consolidates: /home/mherwig/dev/ocx-sh/grimoire-lore/.agents/research/refresh-2026-11/swift-release/spillover-check.md
---

# swift-release refresh, spillover round

## Verdict

Two small in-place edits. The skill was not changed in the first round of this refresh, so these edits build on the text as published. One item came over from the swift-package pair, and a primary source confirms part of it. swift.org lists 6.4.1, 6.4.2 and 6.4.3, and 6.4.3 (2026-11-19) is the newest release. The fix for the static-stdlib link failure was cherry-picked to the 6.4.1 release branch as swift-build#1772. Two statements are now false. In `references/preflight.md`, the fallback section says that 6.4.0 is the only 6.4 tag. In `SKILL.md`, the tool-versions line calls 6.4.0 "current". No toolchain was run, so no source shows that the static-stdlib build now links on a patch release. The removal condition therefore stays unmet until that build is run. The dated measurements (2026-10-10, 6.4.0 and 6.3.3) and the image tags stay as they are, because they are true as measurements. No rule or step ID changes.

## Changed statements

1. `skills/swift-release/references/preflight.md`, section "The permitted fallback line". The text "On 2026-10-10 the fix is merged to main and the 6.4.x branches, and 6.4.0 is the only 6.4 tag, so the removal condition has not been met." is false on 2026-11-27. It now says that the fix is on the 6.4.1 release branch and that 6.4.1 to 6.4.3 exist. It also says the condition is met only when the static-stdlib build exits 0 on the Swift Build engine of the pinned patch. Verification: run `swift build -c release --static-swift-stdlib` on a target that reaches a Foundation symbol, on the pinned toolchain with its default Swift Build engine. Exit 0 meets the condition. This is the failure that agent-mistakes item 1 describes. A 6.3.3 run does not count, because its default engine is native.
2. `skills/swift-release/SKILL.md`, the tool-versions paragraph. "Swift 6.4.0 current" becomes "Swift 6.4.0 (6.4.3 is current on 2026-11-27, not re-run)". 6.3.3 stays "previous", because releases.json lists no 6.3.4. Verification: `curl -s https://www.swift.org/api/v1/install/releases.json | jq -r '.[-1].name'` prints `6.4.3`.

## New rules

None.

## Declined

- Align the `.swift-version` example to 6.4.3. The target has no literal `.swift-version` example. It only reads the file, and `6.4` appears only as a partial selector to reject (P1). The target is already correct.
- Say that 6.4.2 and 6.4.3 contain the fix "by branch history". The only primary source is the 6.4.1 cherry-pick (swift-build#1772). That later patches contain it is an inference, and no source states it. The edit names only the 6.4.1 branch and requires the build to run.

## Sources

- https://www.swift.org/api/v1/install/releases.json, fetched 2026-11-27 (primary: 6.4.0 2026-09-14, 6.4.1 2026-10-12, 6.4.2 2026-10-29, 6.4.3 2026-11-19; no 6.3.4, no 6.5).
- https://github.com/swiftlang/swift-build/pull/1772, fetched 2026-11-27 (primary: "6.4.1 cherrypick of #1763", base `release/6.4.1`, merged 2026-09-23).

## Revision log

- 2026-11-27, spillover round (opus): consolidated the swift-package spillover item. Two statements changed in place. No IDs added or renumbered.

### Edit list (spillover round)

1. File: `/home/mherwig/dev/ocx-sh/grimoire-lore/skills/swift-release/references/preflight.md`
   Find:
   ```
   swift-build#1763". On 2026-10-10 the fix is merged to main and the 6.4.x
   branches, and 6.4.0 is the only 6.4 tag, so the removal condition has not been
   met. The Swift Build engine
   ```
   Replace with:
   ```
   swift-build#1763". Read 2026-11-27: the fix is on the 6.4.1 release branch
   ([swift-build#1772](https://github.com/swiftlang/swift-build/pull/1772)), and
   swift.org lists 6.4.1, 6.4.2 and 6.4.3, but no build has run on a patch
   release. The removal condition is met only once `swift build -c release
   --static-swift-stdlib` with a reachable Foundation symbol exits 0 on the
   pinned patch's default Swift Build engine. The Swift Build engine
   ```

2. File: `/home/mherwig/dev/ocx-sh/grimoire-lore/skills/swift-release/SKILL.md`
   Find:
   ```
   Tool versions, measured 2026-10-10: Swift 6.4.0 current and 6.3.3 previous,
   ```
   Replace with:
   ```
   Tool versions, measured 2026-10-10: Swift 6.4.0 (6.4.3 is current on 2026-11-27, not re-run) and 6.3.3 previous,
   ```
