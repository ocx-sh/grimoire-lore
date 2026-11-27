---
title: Apple Xcode and SDK deltas, 2026-10-10 to 2026-11-27
pair: swift-quality
date_researched: 2026-11-27
window_start: 2026-10-10
model: sonnet
sources_fetched: 27
---

# Apple Xcode and SDK deltas for apple.md

This is a delta against the 2026-10-10 swift-apple consolidation. Method: the DocC JSON behind developer.apple.com (the same data the doc pages render, fetched at `https://developer.apple.com/tutorials/data/documentation/<path>.json` on 2026-11-27), plus a local clone of swiftlang/swift-build at `d417bbcdd46bcd5afb99cc810b3d769d3e7f922f` (committed 2026-11-23). No compile checks were run (owner Q5). Apple's pages carry no release dates; the 27.x release-note JSON files all report one Last-Modified of 2026-11-14 (a site rebuild), so a release date for 27.1, 27.2 or 27.3 beta 2 could not be determined from Apple.

## Verdict per claim

| Claim | Verdict |
|---|---|
| apple.md header: Xcode 26 (Swift 6.2), Xcode 27 (Swift 6.4) | unchanged. Xcode 27.1, 27.2 and 27.3 beta 2 each state "includes Swift 6.4". Xcode 26.5 and 26.6 notes exist (not read for Swift version). |
| apple.md header: swift-build at `2187330e13e7` | changed. HEAD is now `d417bbcd` (178 commits later). The pin is stale only if the oracle is regenerated; see the next row. |
| Oracle lists 183 `SWIFT_*` names | changed at HEAD: 186 names, three added, none removed. |
| SW-APPLE-10 `deprecatedAt` 27.2 | changed: now 27.3. |
| SW-APPLE-10 `UIScreen.main` at 26.0 | unchanged. |
| SW-APPLE-16 MCP release note 176935844 | unchanged. No later note says "resolved values" or adds build-setting write tools. |
| Xcode 27 template `SWIFT_VERSION` default | could not determine (still unverifiable without macOS). |
| testing.md: interop reported off in Xcode 26.4 | unchanged for 26.4; but a pre-window Xcode 27 note adds a related test-plan setting (see below). |
| Availability rows `Observations` 26.0, `Mutex` 18.0/15.0, `Tab` 18.0 | unchanged. |

## Oracle recount

Reproduced the oracle's own regeneration pipeline (all `Sources/**/*.xcspec` plus `BuiltinMacros.swift`, the two interpolation fragments removed) at both commits. At `2187330e13e7` it yields exactly the 183 names in `checks/swift-settings-oracle.txt` (same set). At HEAD it yields 186.

Added (all three are in `Swift.xcspec` or `BuiltinMacros.swift`, commit dates from the swift-build log):
- `SWIFT_ENABLE_CAS_SANDBOX`, commit `24ab995f`, 2026-10-29, "[CAS] Introduce `SWIFT_ENABLE_CAS_SANDBOX`".
- `SWIFT_ENABLE_PRESCAN_CACHING`, commit `56b01877`, 2026-11-12, "[CAS] Introduce `SWIFT_ENABLE_PRESCAN_CACHING`".
- `SWIFT_CLANG_INLINES_ARE_PRIVATE_EXTERN`, from commit `1deb6017`, 2026-10-15 (Swift.xcspec line 1678 at HEAD).

Removed: none. Commits touching `Swift.xcspec` after the pin: nine, from 2026-10-12 to 2026-11-14 (`e9babe22`, `56b01877`, `fb7a9228`, `24ab995f`, `f80b4697`, `569324b4`, `1deb6017`, `d1153eac`, `1e7a7034`). A diff of the xcspec shows no change to `SWIFT_VERSION`, default isolation, approachable concurrency or strict concurrency definitions (the only matches are new `Condition` lines for compile cache, prefix mapping and `SWIFT_OBJC_INTEROP_MODE`).

Normative candidate (oracle regeneration, not an edit now): re-pin swift-build to `d417bbcd` and regenerate the oracle, 183 becomes 186.
- Rationale: SW-APPLE-01 flags any name not in the oracle, so a project using `SWIFT_ENABLE_CAS_SANDBOX` would be reported as invented (false positive).
- Verification: run the regeneration command in the oracle header at the new commit and compare the count; then the SW-APPLE-01 block on a fixture that uses the three names must print nothing.

## SW-APPLE-10: 27.2 shipped, deprecation moved to 27.3

Old text: "DocC lists most of these at `deprecatedAt` 27.2 and `UIScreen.main` at 26.0, all still `deprecated: false` (read 2026-10-10)".

New fact, read 2026-11-27 from `https://developer.apple.com/tutorials/data/documentation/swiftui/navigationview.json`: `"deprecatedAt": "27.3"`, `"message": "use NavigationStack or NavigationSplitView instead"` for iOS, iPadOS, macOS, tvOS (and the rest). The page's Last-Modified is 2026-10-15, five days after the baseline, which dates the change. Same `deprecatedAt: 27.3` now on `foregroundColor(_:)`, `cornerRadius(_:antialiased:)`, `navigationBarItems(leading:trailing:)`, `edgesIgnoringSafeArea(_:)`, `accentColor(_:)` and `tabItem(_:)` (message: "Use `Tab(title:image:value:content:)` and related initializers instead"). Exception: `tabItem(_:)` carries no `deprecatedAt` for visionOS. `UIScreen.main`: `deprecatedAt 26.0` on iOS and iPadOS, unchanged. `.onChange(of:perform:)`: 17.0 iOS, unchanged. None of the entries has a `deprecated` boolean in the platform data (the key is absent, not true).

Apple's Xcode 27.2 release notes (`https://developer.apple.com/documentation/xcode-release-notes/xcode-27_2-release-notes`) state it "includes Swift 6.4 and SDKs for iOS 27.2 ..." and mention no SwiftUI deprecation. The only Xcode with a 27.3 SDK is "Xcode 27.3 Beta 2" (`https://developer.apple.com/documentation/xcode-release-notes/xcode-27_3-release-notes`), a beta. So the deprecations are tied to a SDK that has not shipped final as of 2026-11-27.

Decision: SW-APPLE-10 does not move from grep to compiler gating. The 27.2 SDK does not warn (the metadata says 27.3), and 27.3 is beta. Keep the grep as agent hygiene. Revisit when Xcode 27.3 ships final: only then does a deprecation warning exist, and even then it fires only for a build against the 27.3 SDK, so projects on an older Xcode get nothing. Rewrite candidate for the "DocC lists" sentence: "`deprecatedAt` 27.3 (iOS 27.3 beta, read 2026-11-27; it read 27.2 on 2026-10-10), `UIScreen.main` at 26.0". Verification: re-fetch `swiftui/navigationview.json` and read `metadata.platforms[].deprecatedAt` before editing.

## SW-APPLE-16: Xcode MCP server

Unchanged. Item 176935844 is still the Xcode 27 note: "The Xcode MCP server has been updated with new tools that allow agents to debug projects ... and inspecting and modifying build settings, compiler flags, entitlements, and Info.plist keys." Nothing in 27.1, 27.2 or 27.3 beta 2 says whether values are resolved. New MCP items in the window are narrower: 27.2 "The RenderPreview MCP tool now returns the list of available render destinations" (186442676), 27.3 beta "New tools allow coding agents to manipulate String Catalogs" (184511781), and RenderPreview snapshot fixes. Pre-window but possibly under-read: the Xcode 27 note (181836944) previews an MCP server that runs without an open workspace, enabled by `sudo xcrun mcp-server enable`.

Possible SW-APPLE-03 interaction (new in 27.2, item 184661114): "Xcode now supports a JSON-based project format (.xcproj) that's more readable, merge-friendly, and easier for coding agents to edit." apple.md has no `.xcproj` mention (grep found none). Candidate: add a one-line note that SW-APPLE-01 to SW-APPLE-03 globs cover only `.pbxproj` and the new format is unread. Rationale: a project that opts into `.xcproj` escapes the checks. Verification: `git ls-files '*.xcproj'` non-empty on an adopter repo; the format's schema is `unverified: read only`.

## Xcode 27 template SWIFT_VERSION default

Could not determine. A search of the 27, 27.1, 27.2 and 27.3 release notes for `SWIFT_VERSION`, "language mode" and "template" finds no default. The single blog source stands. Keep "unverified: read only".

## testing.md interop

Unchanged for the cited claim. The Xcode 26.4 note still reads: "Interoperability between XCTest and Swift Testing is no longer enabled by default. To enable this experimental feature, set the environment variable SWIFT_TESTING_XCTEST_INTEROP_MODE to limited in your test plan." (171360625). The Xcode 27 note (`.../xcode-27-release-notes`, Testing, New Features, item 170335449) adds: "When you call an XCTest or Swift Testing assertion within a test from the opposite framework, you will see a runtime issue with warning severity if the assertion failed. Control this behavior with the new Swift Testing and XCTest Interoperability setting in your test plan." That predates the window (the page existed on 2026-10-10) and does not appear in testing.md's Xcode statement; it suggests Xcode 27 defaults to warning-severity interop, which SW-TEST-02's "passes silently under none" row does not cover for Xcode runs. Whether the default is `limited` or `complete` is not stated: could not determine. No 27.1 to 27.3 note changes it.

## Availability rows

Unchanged, read 2026-11-27: `Observations` iOS, iPadOS, macOS, watchOS and visionOS 26.0 (no `deprecatedAt`); `Mutex` iOS 18.0, macOS 15.0, watchOS 11.0, visionOS 2.0; `Tab` iOS 18.0, macOS 15.0, watchOS 11.0, visionOS 2.0; `NavigationStack` iOS 16.0, macOS 13.0, watchOS 9.0, visionOS 1.0; `.onChange(of:initial:_:)` 17.0 iOS, 14.0 macOS. Sources: `.../synchronization/mutex.json`, `.../swiftui/tab.json`, `.../observation/observations.json`, `.../swiftui/navigationstack.json`.

## Other SDK facts worth one line

Xcode 27.2 known issue (187160501): "macOS, watchOS, tvOS, and visionOS SDKs in Xcode 27.2 incorrectly report 27.1 as a valid deployment target." Relevant to SW-APPLE-11 floors: a floor of 27.1 on those platforms is not a real target. Xcode 27.1 and 27.2 require macOS Tahoe 26.6 or later.

## Sources fetched

Xcode release notes JSON for 27, 27.1, 27.2, 27.3 beta 2, 26.4, 26.5, 26.6 and the release-notes index; DocC JSON for NavigationView, foregroundColor, cornerRadius, tabItem, navigationBarItems, edgesIgnoringSafeArea, accentColor, UIScreen.main, onChange (both forms), Tab, Mutex, Observations and NavigationStack; swift-build git log, diff and grep at `d417bbcd` and `2187330e13e7`.
