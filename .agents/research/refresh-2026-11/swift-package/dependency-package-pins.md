---
title: Swift package pair, dependency pin delta (2026-10-10 to 2026-11-27)
pair: swift-package
date_researched: 2026-11-27
window_start: 2026-10-10
model: sonnet
sources_fetched: 16
---

# Swift package pair: dependency pin delta

This is a delta update of the 2026-10-10 baseline. Every pin not listed as "changed" stays exactly as written. The GitHub REST API was rate limited during this run, so all facts come from the GitHub web pages (releases, tags, raw README and Package.swift files). The release pages show day and month only; years were read from tag pages where available and otherwise inferred from the 2026 page footer and release order. Where the year is inferred, this is marked.

## Summary

- swift-subprocess shipped 1.0.2 on 16 Oct 2026. It is a bug-fix release (armv7 Android build error, no API change). The skeleton lower bound `from: "1.0.1"` does not need to rise.
- swift-argument-parser: no release after 2026-10-10. Newest tags are 1.8.2 (4 Jun 2026) and 1.7.2 (8 Jul 2026). Pin `from: "1.8.0"` is unchanged.
- swift-syntax: no 604.x or 605 tag after 2026-10-10. 604.0.0 and the 605.0.0-prerelease-2026-09-15 are both from 15 Sep 2026 (before the baseline). SW-PKG-10 `lo` 602 and `hi` 605 are unchanged.
- swift-crypto: no 6.x major. Releases in the window are 5.0.1 (12 Oct), 5.0.2 and 5.0.3 (20 Oct), 5.1.0 (2 Nov), 5.1.1 (3 Nov), 5.1.2 (19 Nov) and 5.2.0 (24 Nov); the year for these is inferred as 2026. The README still recommends `"1.0.0" ..< "6.0.0"`. SW-PKG-25 is unchanged.
- swift-nio: 2.105.0 (3 Nov), 2.105.1 (23 Nov), 2.105.2 (24 Nov). The product is still `_NIOFileSystem` on main; `NIOFileSystem` is only a target. No graduation completed.
- swift-docc-plugin: no release after 2026-10-10. Newest is 1.5.0 (27 Apr 2026, before the baseline). Pin `from: "1.4.0"` is unchanged.
- swift-subprocess README: Static Linux SDK still "Build only"; no WASI row. SW-REL-07 and SW-REL-10 unchanged.
- Could not determine: the swift-syntax prebuilt manifest list (SW-REL-22 "Prebuilt artifact") because download.swift.org returned a 404 redirect.

## Findings per claim at risk

### 1. swift-subprocess pin (skeleton line, Binds line, Q4)

Status: unchanged pin, one new patch release exists.

- Old text: `.package(url: "https://github.com/swiftlang/swift-subprocess", from: "1.0.1")`; "swift-subprocess 1.0.1"; Q4 `from: "1.0.1"`.
- New fact: 1.0.2 published 16 Oct 2026, marked Latest. Notes: "bug fix release", no API changes, fixes a build error on armv7 Android (PR #387 by jakepetroules). Source: https://github.com/swiftlang/swift-subprocess/releases (tags 1.0.2, 1.0.1 on 9 Oct, 1.0.0 on 4 Aug).
- Decision: do not raise `from:`. The 1.0.2 fix concerns armv7 Android, which the skeleton (Linux and macOS CLI) does not target. Raise only for a fix the skeleton needs. The Binds line may optionally say "1.0.1 (1.0.2 released 2026-10-16, Android armv7 fix only)"; this is a measured-value statement, not a pin change.

### 2. swift-argument-parser `from: "1.8.0"`

Status: unchanged.

- Tags page (https://github.com/apple/swift-argument-parser/tags) lists 1.7.2 (Jul 8, 2026), 1.8.2 (Jun 4, 2026), 1.8.1 (May 27, 2026), 1.8.0 (May 25, 2026). No 1.9 or 2.0 tag and nothing after 2026-10-10.
- Note for the author: the release page shows 1.8.1 reverts a 1.8.0 source-compatibility change to `parse()` and `parseAsRoot()`, and 1.8.2 fixes fish completions and a Windows warning. This predates the baseline. Whether `from: "1.8.0"` should become `"1.8.1"` is a pre-window question, not a delta. If the owner wants it, the rationale is the 1.8.1 source-compat revert; flagged as a candidate only (see Normative candidates, N1).

### 3. swift-syntax range (SW-PKG-10, `swift-syntax-range` block, Point-Free example, SW-PKG-34)

Status: unchanged.

- Releases page (https://github.com/swiftlang/swift-syntax/releases): newest entries are 605.0.0-prerelease-2026-09-15, 604.0.0 (Latest) and 604.0.0-prerelease-2026-09-15, all 15 Sep 2026. Nothing newer. The tags page shows only `swift-DEVELOPMENT-SNAPSHOT` and `swift-6.4.x-DEVELOPMENT-SNAPSHOT` tags from 22 Oct to 26 Nov 2026 (https://github.com/swiftlang/swift-syntax/tags); these are toolchain snapshots, not syntax versions.
- 605 prereleases exist (605.0.0-prerelease-2026-06-08, 2026-06-26, 2026-09-15). They do not move `hi` until a Swift release ships (Swift 6.4 is current as of baseline; no newer Swift release is evidenced here). `lo` 602, `hi` 605 and the Point-Free `"509.0.0"..<"605.0.0"` example stay. SW-PKG-34's `canImport(SwiftSyntax604)` ladder is unchanged.
- SW-REL-22 prerelease tag example: the example tag family (`NNN.0.0-prerelease-YYYY-MM-DD`) is still how upstream names prereleases; unchanged.
- SW-REL-22 "Prebuilt artifact": could not determine. https://download.swift.org/prebuilts/swift-syntax/ and the 604.0.0 manifest URL both redirected to swift.org/404.html, so the manifest list was not read. The baseline wording stays.

### 4. swift-crypto (SW-PKG-25)

Status: unchanged. No 6.x major.

- Releases (https://github.com/apple/swift-crypto/releases): 5.2.0 (24 Nov), 5.1.2 (19 Nov), 5.1.1 (3 Nov), 5.1.0 (2 Nov), 5.0.3 and 5.0.2 (20 Oct), 5.0.1 (12 Oct), 5.0.0 (16 Sep), 4.5.2 (2 Sep). The year is not printed on the page; 2026 is inferred.
- 5.2.0 notes (https://github.com/apple/swift-crypto/releases/tag/5.2.0): adds AES.GCM open and seal over an output span (#507, minor), Scrypt default memory limit fix (#508), rejects Curve25519 private keys labelled with the wrong algorithm (#506). No breaking change, no mention of 6.0.
- README (https://raw.githubusercontent.com/apple/swift-crypto/main/README.md), read 2026-11-27: "Most users will be able to depend on the 1.0.0, 2.0.0, 3.0.0, 4.0.0 or 5.0.0 series of releases."; the 5.0.0 change marks non-frozen public CryptoKit enums `@nonexhaustive`, "should mitigate the need for any future major releases"; recommended dependency `.package(url: "https://github.com/apple/swift-crypto.git", "1.0.0" ..< "6.0.0")`. The README does not describe 6.x.
- The baseline quote "1.x to 5.x 'are almost API compatible'" was not reproduced by this fetch: the fetch tool summarised the section and did not return that exact phrase. Treat the quote as could not determine; the phrase "Most users will be able to depend on ... 5.0.0 series" is the verified wording. The bound `"6.0.0"` is unchanged and the rule needs no edit.

### 5. swift-nio and `_NIOFileSystem` (manifest.md Dates and Defaults)

Status: unchanged. Graduation not completed.

- Releases (https://github.com/apple/swift-nio/releases): 2.105.2 (24 Nov), 2.105.1 (23 Nov), 2.105.0 (3 Nov), 2.104.0 (6 Oct). Year inferred as 2026.
- 2.105.0 notes (https://github.com/apple/swift-nio/releases/tag/2.105.0) mention no NIOFileSystem change.
- Package.swift on main (https://raw.githubusercontent.com/apple/swift-nio/main/Package.swift) still declares `.library(name: "_NIOFileSystem", targets: ["_NIOFileSystem", "NIOFileSystem"])` and `_NIOFileSystemFoundationCompat`. `NIOFileSystem` is a target only, not a product. So the sentence "swift-nio's graduation of `_NIOFileSystem` does not change it" remains true only as a forward-looking statement; today the product name is still underscored. The wording could be softened to "if swift-nio graduates `_NIOFileSystem` to a non-underscored product", which is accurate. Candidate N2.
- SW-PKG-24 README line on underscored products: the quote "Any product beginning with an underscore is not subject to semantic versioning" lives in the swift-nio README, which was not fetched in this run. Could not determine; no evidence of change.

### 6. swift-docc-plugin `from: "1.4.0"` (SW-GATE-21)

Status: unchanged.

- Tags (https://github.com/swiftlang/swift-docc-plugin/tags): 1.5.0 (Apr 27, 2026), 1.4.6 (Feb 5, 2026), 1.4.5 (Jun 30, 2025). Nothing after 2026-10-10. 1.5.0 predates the baseline; whether the baseline knew it is not evidenced here. Pin `from: "1.4.0"` still resolves to 1.5.0. No change needed.

### 7. swift-subprocess platform support (SW-REL-07, SW-REL-10)

Status: unchanged.

- README (https://raw.githubusercontent.com/apple/swift-subprocess/main/README.md): Static Linux SDK row reads "Build only"; Android row "Automated"; no WASI row. SW-REL-07 and SW-REL-10 claims hold. The README install snippet still shows `.upToNextMinor(from: "0.4.0")`, which is stale upstream documentation; the pair's `from: "1.0.1"` is correct and must not copy the README snippet. The README has no statement on underscored products.

## Normative candidates

N1 (optional, pre-window origin). Rule: raise swift-argument-parser skeleton lower bound to `from: "1.8.1"`. Rationale: 1.8.0 carried a source-compatibility regression in `parse()` and `parseAsRoot()` that 1.8.1 reverted. Verification: `grep -n 'swift-argument-parser' rules/swift-package.md` shows `1.8.1`; read the 1.8.1 release notes at https://github.com/apple/swift-argument-parser/releases. Recommendation: only if the skeleton calls `parse()` or `parseAsRoot()` directly, which a thin `ExampleCore` plus `@main` does not; default is no change.

N2. Rule: reword "swift-nio's graduation of `_NIOFileSystem` does not change it" to conditional form, since no graduation shipped as of 2026-11-27. Rationale: the sentence reads as if graduation happened. Verification: `grep -n '_NIOFileSystem' skills/swift-package-reference/manifest.md` and re-check `.library(name: "_NIOFileSystem"` in swift-nio Package.swift.

No other rule changes are warranted by this delta.

## AI-agent angle

- An agent trained before 2026-10 may bump swift-subprocess to `from: "1.0.2"` because it is newest. Smallest check: the skeleton lower bound stays at the last version containing a needed fix; grep for `swift-subprocess.*from:` and compare with the table above.
- An agent may infer a swift-crypto 6.0 because 5.2.0 exists. Check: README range still ends at `"6.0.0"` exclusive.
- An agent may use the swift-subprocess README snippet `.upToNextMinor(from: "0.4.0")`. Check: `grep -n 'upToNextMinor' Package.swift` finds nothing for swift-subprocess.

## Contested / evolving

- `_NIOFileSystem` graduation: still underscored as of 2026-11-27; re-check at each swift-nio minor.
- swift-syntax 605 final: prereleases only; ships with the next Swift release. Re-check when Swift 6.5 or 7 toolchain releases.
- swift-syntax prebuilt manifest: not readable this run; re-check next refresh.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://github.com/swiftlang/swift-subprocess/releases | Releases list | 1.0.2 on 16 Oct 2026 | Newest subprocess release and notes |
| https://raw.githubusercontent.com/swiftlang/swift-subprocess/main/README.md | README | read 2026-11-27 | Platform table, stale install snippet |
| https://github.com/apple/swift-argument-parser/releases | Releases list | newest 1.8.2 | No release in window |
| https://github.com/apple/swift-argument-parser/tags | Tags with years | read 2026-11-27 | Dates with year |
| https://github.com/swiftlang/swift-syntax/releases | Releases list | newest 15 Sep 2026 | 604 and 605 prereleases |
| https://github.com/swiftlang/swift-syntax/tags | Tags | snapshots to 26 Nov 2026 | Confirms no new 604.x or 605 tag |
| https://github.com/swiftlang/swift-syntax/releases/tag/605.0.0-prerelease-2026-09-15 | Release page | 15 Sep 2026 | Prerelease date |
| https://github.com/apple/swift-crypto/releases | Releases list | newest 5.2.0 | No 6.x |
| https://github.com/apple/swift-crypto/releases/tag/5.2.0 | Release notes | 24 Nov | No breaking changes |
| https://raw.githubusercontent.com/apple/swift-crypto/main/README.md | README | read 2026-11-27 | Compatibility range |
| https://github.com/apple/swift-nio/releases | Releases list | 2.105.2 on 24 Nov | NIO versions in window |
| https://github.com/apple/swift-nio/releases/tag/2.105.0 | Release notes | 3 Nov | No FileSystem change |
| https://raw.githubusercontent.com/apple/swift-nio/main/Package.swift | Manifest | read 2026-11-27 | Product names |
| https://github.com/swiftlang/swift-docc-plugin/releases | Releases list | newest 1.5.0 | No release in window |
| https://github.com/swiftlang/swift-docc-plugin/tags | Tags with years | read 2026-11-27 | Dates with year |
| https://download.swift.org/prebuilts/swift-syntax/ | Prebuilt manifest location | 404 redirect | Failed, could not read |
