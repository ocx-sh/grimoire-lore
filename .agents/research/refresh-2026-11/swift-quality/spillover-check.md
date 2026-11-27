---
title: swift-quality spillover check, 2026-11-27
target: swift-quality
date_researched: 2026-11-27
model: sonnet
sources_fetched:
  - https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0540-default-target-settings.md
  - https://download.swift.org/swift-evolution/v1/evolution.json
  - https://github.com/swiftlang/swift-package-manager/pull/10033
  - https://www.swift.org/api/v1/install/releases.json
---

# Spillover check

## Item 1 (from swift-package)

Item: rules/swift-quality.md line 115 cites `defaultSwiftSettings:` (SE-0540). Its wording should match the corrected SW-PKG-01: the API is implemented for Swift 6.5 at tools 6.5 and is in no 6.4.x release.

Verdict: target already correct (the claim itself is confirmed by primary source).

Evidence:
- The SE-0540 proposal file at https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0540-default-target-settings.md reads "Status: **Implemented (Swift 6.5)**" and is titled "Default Target Settings". Read 2026-11-27, no date stated in the file.
- https://download.swift.org/swift-evolution/v1/evolution.json (generated 2026-11-26) gives SE-0540 `{'state': 'implemented', 'version': '6.5'}`, implementation swift-package-manager#10033.
- https://github.com/swiftlang/swift-package-manager/pull/10033 is merged 2026-10-20 into `main` (page read; it does not mention release branches).
- https://www.swift.org/api/v1/install/releases.json lists releases up to 6.4.3 and no 6.5, so nothing ships it.
- Not independently confirmed here: that #10033 is on `release/6.5.x`, and the exact date the status was set (the target says 2026-11-16). The origin pair's notes (swift-package/swiftpm-manifest-and-resolution.md) record both from git history. Neither is load-bearing for the target text.

Affected text, rules/swift-quality.md line 115 (SW-CORE-14, rationale column), verbatim: "SE-0526 and SE-0529 are accepted with modifications, SE-0540 is implemented for Swift 6.5 (status set 2026-11-16), none ships in a release toolchain, and the fourth crashes the compiler."

The same row's rule column says "`defaultSwiftSettings:` (SE-0540, SW-PKG-01, SW-PKG-18)" and its verification says the probe is "Watched STILL on Swift 6.4.0 and 6.3.3 (measured 2026-10-10) and on 6.4.3 and 6.3.3 (measured 2026-11-27 ...)". Both are consistent. Other mentions (skills/swift-quality-reference/language.md lines 131, 143, 298) only say the API does not compile on 6.4 and say nothing of SE-0540's status.

Smallest change: none. Optional only: say "at tools 6.5" after "implemented for Swift 6.5" in line 115 if exact parity with SW-PKG-01 is wanted.
