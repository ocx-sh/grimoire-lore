---
title: Spillover check for swift-package (items from swift-quality)
target: swift-package
date_researched: 2026-11-27
model: sonnet
sources_fetched:
  - https://hub.docker.com/v2/repositories/library/swift/tags/6.4
  - https://hub.docker.com/v2/repositories/library/swift/tags/6.4.3
  - https://github.com/swiftlang/swift-evolution/blob/main/proposals/0540-default-target-settings.md (read through the GitHub contents API)
  - https://github.com/swiftlang/swift-evolution/commit/6d9f8772
  - https://github.com/apple/swift-log/releases/tag/1.16.0
  - https://github.com/swift-server/swift-service-lifecycle/releases/tag/2.13.0
  - https://github.com/swift-server/async-http-client/releases/tag/1.37.0
  - https://github.com/apple/swift-system/releases/tag/1.9.0
---

Originating evidence: .agents/research/refresh-2026-11/swift-quality/ (toolchain-patches-and-dated-probes.md, evolution-proposal-status.md, server-package-releases.md) and swift-quality.md.

## Item 1: pin the CI current leg to swift:6.4.3, not floating swift:6.4

Verdict: confirmed by primary source (for the current state), with one part not re-verified.

- Source: Docker Hub official image API, read 2026-11-27. Tag `6.4` has last_updated 2026-11-20T21:48:00Z and tag `6.4.3` has last_updated 2026-11-20T21:49:56Z. Both carry the same amd64 digest `sha256:2d76e3132ff4b7a4018b983e8d946216b120e67507a639660c0b266f81d0a2e3`. So `swift:6.4` now is 6.4.3, and it will move again at 6.4.4. The earlier claim that `swift:6.4` was 6.4.0 is supported only by the swift-quality brief (6.4.0 last pushed 2026-10-02); I did not re-fetch the 6.4.0 tag.
- Target text, skills/swift-package-reference/gates.md, SW-GATE-25: "and at the current release (6.4.3 on 2026-11-27), both with the strict flag". It names the patch but not the image tag.
- Target text, skills/swift-package-reference/gates.md, SW-GATE-08: "Run the format step on one pinned toolchain patch (`.swift-version` or an exact image tag)." This already forbids a floating tag for the format step.
- Target text, rules/swift-package.md line 73: "`.swift-version` holds one exact patch (`6.4.3`), never `6.4` or `late...`" (line truncated in my read; the visible words are as quoted).
- Smallest change: in SW-GATE-25 replace "at the current release (6.4.3 on 2026-11-27)" with "at the current release as the exact image tag `swift:6.4.3` (never the floating `swift:6.4`; 6.4.3 on 2026-11-27)".

## Item 2: SE-0540 is now "Implemented (Swift 6.5)"; SW-PKG-01 and SW-PKG-18 should say implemented for 6.5 and unshipped

Verdict: target already correct.

- Source: swift-evolution proposals/0540-default-target-settings.md on main: "Status: **Implemented (Swift 6.5)**", Implementation swift-package-manager#10033. Commit 6d9f8772 "Update SwiftPM proposals implemented in Swift 6.5", dated 2026-11-16T22:10:59Z. Primary source (the proposal repository itself). The 503 on the web page was bypassed with the GitHub contents API.
- Target text, rules/swift-package.md, SW-PKG-01: "SE-0540 (retitled Default Target Settings) is implemented for Swift 6.5 and gated at tools 6.5, so on Swift 6.4 the manifest fails `extra argument 'defaultSwiftSettings' in call` (exit 1)." It also says it is "in no 6.4.x tag through 6.4.3 (read 2026-11-27)".
- Target text, rules/swift-package.md line 153: "Swift 6.4 has no per-package default settings (SE-0540 needs tools 6.5): one loop sets them for every target."
- SW-PKG-18: my grep of the SW-PKG-18 row did not show an SE-0540 status claim. I found nothing in it that contradicts the item. No change needed.
- Smallest change: none.

## Item 3: swift-log 1.16, swift-service-lifecycle 2.13.0, AHC 1.37.0 and swift-system 1.9.0 require Swift/tools 6.2, so a floor leg below 6.2 is not viable

Verdict: confirmed by primary source. The target already states the floor as 6.2.

- Sources (GitHub release pages, year not printed on the page, dates match the brief): swift-log 1.16.0, 07 Oct: "Bump minimal Swift tools version to 6.2" (#518). swift-service-lifecycle 2.13.0, 14 Oct: "Bump minimal Swift tools version to 6.2" (#261). AsyncHTTPClient 1.37.0, 02 Nov: "Lift minimum Swift version to 6.2" (#935). swift-system 1.9.0, 12 Nov: "This release requires Swift 6.2 or later." The brief gives 2026 for all four.
- Target text, rules/swift-package.md line 32: "a `swift:6.2.0` floor leg for libraries and the SDK (pinned default, verify the patch per tree, SW-GATE-25)".
- Target text, rules/swift-package.md SW-PKG-12: "A library and the SDK declare exactly tools `6.2`". Tools 6.2 already rules out a leg below 6.2, and the target never proposes one.
- The target names none of these four packages as a version floor, so nothing is stale.
- Smallest change: none required. Optional, in SW-GATE-25 after "default `swift:6.2.0`": add "(no leg below 6.2: swift-log 1.16, swift-service-lifecycle 2.13, AsyncHTTPClient 1.37 and swift-system 1.9 each require Swift 6.2)".
