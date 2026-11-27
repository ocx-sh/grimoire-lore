---
title: swift-release spillover check
target: swift-release
date_researched: 2026-11-27
model: sonnet
sources_fetched:
  - https://www.swift.org/api/v1/install/releases.json
  - https://github.com/swiftlang/swift-build/pull/1772
---

# swift-release spillover check

## Item 1 (from swift-package)

Item: "swift-release skill (references/preflight.md, optional-legs.md): it binds 6.4.0. Align its `.swift-version` example to 6.4.3 and point its --static-swift-stdlib note at the SW-REL-03 probe that is now due on 6.4.3."

Verdict: confirmed by primary source, in part. Two of the three claims hold. The `.swift-version` example claim does not apply to the target.

Evidence read in the originating pair: `.agents/research/refresh-2026-11/swift-package.md` (Verdict, Open question 1) and `swift-package/toolchain-releases-and-images.md`.

Primary sources:
- https://www.swift.org/api/v1/install/releases.json, fetched 2026-11-27. It lists 6.4.0 (2026-09-14), 6.4.1 (2026-10-12), 6.4.2 (2026-10-29) and 6.4.3 (2026-11-19) as the newest entry. It lists no 6.3.4 and no 6.5. Source is swift.org itself.
- https://github.com/swiftlang/swift-build/pull/1772, fetched 2026-11-27. It is "6.4.1 cherrypick of #1763", base `release/6.4.1`, merged 2026-09-23. This is the first-party repository. It supports "the fix is in 6.4.1 and later". Whether the JSONEncoder probe exits 0 on 6.4.3 is not shown by any source: no toolchain ran, so the removal condition is still unmet until the probe runs.

Affected text, three points:

1. `.swift-version` example. The target has no literal `.swift-version` example. `/home/mherwig/dev/ocx-sh/grimoire-lore/skills/swift-release/references/preflight.md` and `optional-legs.md` only read the file (`V=$(cat .swift-version ...)`), and `SKILL.md` has `read -r V < .swift-version`. The literal `6.4` there appears only as a bad value to reject (`references/preflight.md` P1: "a partial selector such as `6.4`"). Verdict for this point: target already correct. No change.
2. Stale state line, `references/preflight.md` ("The permitted fallback line"): "On 2026-10-10 the fix is merged to main and the 6.4.x branches, and 6.4.0 is the only 6.4 tag, so the removal condition has not been met." This is false on 2026-11-27: 6.4.1, 6.4.2 and 6.4.3 exist and contain the fix by branch content.
3. Version binding. The skill is dated as measured 2026-10-10 on 6.4.0 and 6.3.3: `SKILL.md` "Tool versions, measured 2026-10-10: Swift 6.4.0 current and 6.3.3 previous", `preflight.md` "(measured 2026-10-10, Swift 6.4.0 and 6.3.3)", and `optional-legs.md` "Build in `swift:6.4.0-amazonlinux2023` (glibc 2.34, measured 2026-10-10)". These are dated measurements and stay true as measurements. `SKILL.md` calls 6.4.0 "current", which is false now. `optional-legs.md` also names `swift:6.4.0-ubi9` and `swift:6.4.0`, tags that still exist.

Smallest change that makes the target true on 2026-11-27:
- In `references/preflight.md`, replace "On 2026-10-10 the fix is merged to main and the 6.4.x branches, and 6.4.0 is the only 6.4 tag, so the removal condition has not been met." with: "Read 2026-11-27: the fix is in 6.4.1, 6.4.2 and 6.4.3 by branch history (swift-build#1772 and its siblings), but no probe has run on a patch. The removal condition counts as met only after the SW-REL-03 JSONEncoder probe exits 0 on the pinned patch."
- In `SKILL.md`, change "Swift 6.4.0 current" to "Swift 6.4.0 measured, 6.4.3 current (not re-run)". Leave the dated measurements and image tags as they are.
- Do not add a `.swift-version` example: the target has none.
