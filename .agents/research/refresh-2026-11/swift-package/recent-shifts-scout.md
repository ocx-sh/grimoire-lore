---
title: Swift packaging, build and release shifts, 2026-10-10 to 2026-11-27, scout
pair: swift-package
date_researched: 2026-11-27
window_start: 2026-10-10
model: sonnet
sources_fetched: 15
---

# Scope and limits

This is a delta scout for rules/swift-package.md and skills/swift-package-reference/. The window is quiet: swift.org published only two posts in it (GSoC showcase on 2026-11-05, "What's new in Swift: November 2026 Edition" on 2026-11-11). The baseline text already says Swift Build is the default engine, so the 6.4 engine switch is not a gap.

Fetch limits, stated so the gaps are not mistaken for quiet areas: forums.swift.org returned HTTP 403 for the Package Manager and Proposal Reviews categories, the GitHub REST API was rate-limited, and the swift-evolution directory listing page was truncated. Proposal status was therefore read from individual proposal files and the swift.org digest, not from forum threads. Review dates for SE-0547 and SE-0560 could not be determined.

# Findings, ranked by likelihood of needing a rule

## 1. SwiftPM 6.4.2 downgrades "dependency declares no traits" from error to warning (shipped)

- Changed: SwiftPM 6.4.2 (tag swift-6.4.2-RELEASE, 2026-10-30) cherry-picks a fix so that traits persisted for a dependency whose new version drops all traits produce a warning and fall back to default traits, instead of failing package graph loading. The warning text is "Traits [Bar] have been enabled on package 'baz' (Baz) that declares no traits." It is emitted on every resolution. It still fails when a parent manifest asks a traitless package to disable its defaults.
- Sources: [release page](https://github.com/swiftlang/swift-package-manager/releases/tag/swift-6.4.2-RELEASE), [commit 8054c59](https://github.com/swiftlang/swift-package-manager/commit/8054c59).
- Status: shipped in 6.4.2. Swift 6.4.3 (2026-11-20) adds only a version bump.
- Rule: touches SW-PKG-23 (trait lists) and the trait matrix gate. Possible new rule: "a CI log scan treats the SwiftPM warning 'declares no traits' as a finding, because 6.4.2 no longer fails and a pin bump can silently drop a trait the package relies on". Verification: `swift package resolve 2>&1 | grep -n "declares no traits"` exits 1 on a match.
- Claim status for the existing text: could not determine whether any baseline row says "fails"; no row mentions the warning (grep of the pair for "declares no traits" found nothing).

## 2. SE-0547 compilation caching, accepted with modifications, implemented in Swift 6.5 (not yet released)

- Changed: opt-in content-addressable build cache. Flags `--enable-build-caching` and `--disable-build-caching`; `swift package build-cache configure [--global]`, `get-configuration`, `reset-configuration`, `info`, `clean`; config file `build-cache-config.json`; default size limit is implementation-defined. Prefix mapping is on by default. Remote caching is explicitly deferred. The proposal warns that a writable shared cache on CI lets anyone with write access tamper with compiler output.
- Source: [SE-0547](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0547-swiftpm-compilation-caching.md); noted in the [November digest](https://www.swift.org/blog/whats-new-in-swift-november-2026/) (2026-11-11). Implementation: swift-package-manager PR #10246.
- Status: Swift 6.5 only; no released toolchain has it.
- Rule: new rule, SW-GATE family. Draft trap: "a release or provenance build never enables build caching, and a CI cache of the build-cache directory is never restored into a release job, so release bytes cannot come from a poisoned cache". Verification: `grep -rnE -- '--enable-build-caching|build-cache' .github` returns nothing in release workflows. Park until 6.5 ships; a rule now would cite a flag no pinned toolchain accepts.

## 3. Swift 6.4 product-name case collisions and moved product paths (shipped, reported in the window)

- Changed: the Swift Package Index post of 2026-10-14 states that executable and library products whose names differ only in letter case are no longer supported under Swift Build, and that product locations moved so scripts must use `swift build --show-bin-path`. The `--show-bin-path` half is already SW-REL-04. The case-collision half is not in the pair (grep for "letter case", "case-insens" found nothing).
- Source: [SPI blog, 2026-10-14](https://swiftpackageindex.com/blog/swift-6-4-support-and-the-move-to-swift-build).
- Status: shipped in 6.4.0 (2026-09-15); only the SPI report is new.
- Rule: new rule, SW-PKG family. Draft trap: "no two products or targets of one package differ only in letter case; an LLM adding `Tool` beside `tool` builds on Linux native and breaks under Swift Build". Verification: `swift package describe --type json | jq -r '.products[].name, .targets[].name' | tr A-Z a-z | sort | uniq -d` prints nothing.
- Also from this post: `swift build --build-system native` is the documented diagnostic fallback, consistent with SW-REL-03. Unchanged.

## 4. SE-0560 build-configuration-conditional target dependencies, accepted, not shipped

- Changed: `TargetDependencyCondition` gains `configuration: BuildConfiguration?` and `.when(platforms:configuration:traits:)`, so a debug-only dependency can be declared. The proposal file lists status Accepted (review manager Franz Busch) and uses `// swift-tools-version: 6.5`; the November digest still described it as under review, so the status moved during or just before the window. The exact tools version is not stated in the text read; the annotation is a placeholder `introduced: 999.0`.
- Source: [SE-0560](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0560-swiftpm-build-configuration-conditional-target-dependencies.md).
- Status: proposed/accepted, in no released toolchain.
- Rule: touches SW-PKG-06 (read the floor before editing a manifest) and the tools-version floor guidance. Draft: "do not write `.when(configuration:)` below the tools version that ships it". Park until the version is stated. Verification: tools-version gate in `floor-read`.

## 5. SE-0545 build debugging options, implemented in Swift 6.5 (not yet released)

- Changed: experimental `--trace-events-file <path>` (Perfetto-compatible JSON trace) and `--enable-task-backtraces`, shipped under `--experimental-` names in nightly toolchains.
- Source: [SE-0545](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0545-build-debugging-options.md), [digest](https://www.swift.org/blog/whats-new-in-swift-november-2026/).
- Status: 6.5 nightlies only.
- Rule: nothing needed now. Only a trap if a CI step uses the experimental flag on a release toolchain. Weak candidate.

## 6. Package registry: Apple team building a public cross-platform registry (announcement, no date)

- Changed: a guest note in the 2026-11-11 digest says an Apple team is working on a public, cross-platform Swift package registry, with no launch date. Nothing about registry signing was found.
- Source: [November digest](https://www.swift.org/blog/whats-new-in-swift-november-2026/).
- Status: announced intent only.
- Rule: no rule. Revisit when the registry ships; it may touch SW-PKG-09 (dependency requirement forms) and the lock policy.

## 7. CocoaPods stops accepting new pods on 2026-12-02

- Changed: per the digest, the CocoaPods trunk stops accepting new pods and versions on 2026-12-02; existing pods become read-only.
- Source: [digest](https://www.swift.org/blog/whats-new-in-swift-november-2026/), [CocoaPods announcement](https://blog.cocoapods.org/CocoaPods-Specs-Repo/) (cited by the digest, not fetched).
- Rule: out of scope for SwiftPM-only guidance unless the pair covers podspec publishing. grep of the pair for CocoaPods found nothing. No rule recommended.

## 8. Static Linux SDK and Android/Wasm status

- Static Linux SDK: the September digest (2026-10-08) names it as a build option of the Swift AWS Lambda Runtime 3.0 plugin. No change to the SDK itself found. Unchanged.
- Wasm: experimental threads support in nightly snapshots (forum post "Swift for Wasm September 2026 updates", cited by the digest, not fetched). Nightly only; SW-REL-10 unchanged.
- Android: the 6.4 release post says SwiftPM supports Android through Swift Build with no post-install script. Shipped in 6.4.0, before the window. Not in the pair's Android coverage if any; could not determine whether a rule is wanted.

# Areas searched and found quiet

- Swift 6.5 branch cut or schedule: nothing found. No swift.org post, and the digest does not mention a schedule. 6.5 features appear only as "Implemented in Swift 6.5" in proposals.
- swiftly: latest release read is 1.2.0 (2026-09-22), before the window. Its only `.swift-version` change is a clearer error for a missing toolchain (PR #540). No release in the window. SW-REL-01 unchanged. Release page dates show no year, so the year is inferred from the page footer.
- Swift Build engine: releases 6.4.2 (2026-10-30) and 6.4.3 (2026-11-20) carry only a merged dynamic-variant fix (PR #1808) and a version bump. Nothing rule-relevant.
- Supply chain (SLSA, attestation, SBOM format): nothing new in the window. SBOM via SE-0509 (SPDX and CycloneDX) shipped in 6.4.0, before the window, and is already covered by SW-REL-11.
- Swift Package Index: only the 2026-10-14 post above. No registry-signing news.
- Forums (Evolution, Package Manager, Announcements): not readable (HTTP 403). Unsearched, not quiet.

# Claims at risk, status

| Claim area | Status | Evidence |
|---|---|---|
| Swift Build is the 6.4 default engine | unchanged | [6.4 release](https://www.swift.org/blog/swift-6.4-released/), SPI post |
| `--show-bin-path` for products (SW-REL-04) | unchanged | SPI post 2026-10-14 |
| `--build-system native` as fallback (SW-REL-03) | unchanged | SPI post |
| Trait behavior (SW-PKG-23) | changed: 6.4.2 warns instead of failing for a traitless dependency | commit 8054c59, 2026-10-30 |
| `.swift-version` reading (SW-REL-01) | unchanged | swiftly 1.2.0, last release 2026-09-22 |
| SE-0540 default settings | could not determine in this brief (covered by another brief) | |

# Sources

| URL | What | Date |
|---|---|---|
| https://www.swift.org/blog/ | blog index | 2026-11 |
| https://www.swift.org/blog/whats-new-in-swift-november-2026/ | monthly digest | 2026-11-11 |
| https://www.swift.org/blog/whats-new-in-swift-september-2026/ | monthly digest | 2026-10-08 |
| https://www.swift.org/blog/swift-6.4-released/ | release post | 2026-09-15 |
| https://www.swift.org/blog/gsoc-2026-showcase/ | GSoC post | 2026-11-05 |
| https://github.com/swiftlang/swift-package-manager/releases | SwiftPM releases | 2026-10-30, 2026-11-20 |
| https://github.com/swiftlang/swift-package-manager/releases/tag/swift-6.4.2-RELEASE | 6.4.2 release | 2026-10-30 |
| https://github.com/swiftlang/swift-package-manager/commit/8054c59 | traits warning commit | 2026-10 |
| https://github.com/swiftlang/swift-build/releases | Swift Build releases | 2026-10-30, 2026-11-20 |
| https://github.com/swiftlang/swiftly/releases | swiftly releases | last 2026-09-22 |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0547-swiftpm-compilation-caching.md | SE-0547 | 2026 |
| https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0560-swiftpm-build-configuration-conditional-target-dependencies.md | SE-0560 | 2026 |
| https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/0545-build-debugging-options.md | SE-0545 | 2026 |
| https://swiftpackageindex.com/blog | SPI blog index | 2026-11 |
| https://swiftpackageindex.com/blog/swift-6-4-support-and-the-move-to-swift-build | SPI post | 2026-10-14 |
