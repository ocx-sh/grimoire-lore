---
title: Swift toolchain releases, Static Linux SDK and swift Docker images, delta 2026-10-10 to 2026-11-27
pair: swift-package
date_researched: 2026-11-27
window_start: 2026-10-10
model: sonnet
sources_fetched: 14
---

# Swift toolchain releases, Static Linux SDK and swift Docker images: delta

## Summary

- Three 6.4 patches shipped in the window: 6.4.1 (2026-10-12), 6.4.2 (2026-10-29) and 6.4.3 (2026-11-19). The "current" release is now 6.4.3, so "6.4.0 (current)" is stale.
- No 6.3.x patch shipped. 6.3.3 (2026-06-29) is still the latest 6.3, so "6.3.3 (previous)" is unchanged.
- The fix swift-build#1763 is in 6.4.1 and later. Its release/6.4.1 cherry-pick (#1772) merged on 2026-09-23, before the 6.4.1 release date. SW-REL-03's removal condition is met on 6.4.1 or later, pending the behavioural probe.
- Static Linux SDK stays at version 0.1.0 with the same releases.json shape, but every patch has a new checksum.
- The native build engine removal was neither done nor rescheduled in anything fetched. No source states a date after the October 2025 plan.
- Docker tags and base images named in the claims are unchanged. `6.4` now resolves to 6.4.3.
- Android SDK is still listed in 6.4.0 through 6.4.3, so the frame note "6.4.0 dropped the Android SDK" is wrong as written. The frame file already carries a correction at line 161.

## Findings

### 1. Which releases exist

Source: [releases.json](https://www.swift.org/api/v1/install/releases.json), fetched 2026-11-27 and parsed with a script.

| Release | Date | xcode_release | Static SDK version | Static SDK checksum |
|---|---|---|---|---|
| 6.3.3 | 2026-06-29 | true | 0.1.0 | 87c3eaf9...b607b |
| 6.4.0 | 2026-09-14 | true | 0.1.0 | 47d2fd89...40a9e |
| 6.4.1 | 2026-10-12 | false | 0.1.0 | cef5592d...38a7c |
| 6.4.2 | 2026-10-29 | true | 0.1.0 | 3786b179...dc5a |
| 6.4.3 | 2026-11-19 | false | 0.1.0 | 529e6982...7c73 |

Full checksums: 6.4.1 `cef5592d7430ed3c5ae1ddda479849c6f5252bd94a5723db1559f984caf38a7c`, 6.4.2 `3786b179936d9cc9e266dd506bd1654176358d7b25288e243359f4d17cc4dc5a`, 6.4.3 `529e6982974de78793c8348c1459105a772f54b464a51edf074e5b9c4bfe7c73`.

The release list ends at 6.4.3. There is no 6.3.4 and no 6.5 entry. The swift.org install page confirms 6.4.3 as latest, with the SDK file `swift-6.4.3-RELEASE_static-linux-0.1.0.artifactbundle.tar.gz` ([install/linux](https://www.swift.org/install/linux/)).

GitHub release tags: the swift-build releases page lists 6.4.2 (30 Oct) and 6.4.3 (20 Nov) and no 6.4.1 entry ([swift-build releases](https://github.com/swiftlang/swift-build/releases)). The SwiftPM releases page also lacks 6.4.1 and lists 6.4.2 and 6.4.3 ([SwiftPM releases](https://github.com/swiftlang/swift-package-manager/releases)). releases.json and a published Docker tag (`6.4.1-rhel-ubi9-slim`, updated 2026-10-29) show 6.4.1 shipped as a toolchain. Whether a `swift-6.4.1-RELEASE` git tag exists could not be determined.

### 2. swift-build#1763 and the backports

- [#1763](https://github.com/swiftlang/swift-build/pull/1763): merged to main by owenv on 2026-09-22 (commit 9766f5f). It adds `-static-stdlib` to compile tasks so autolink entries use the right resource directory.
- [#1764](https://github.com/swiftlang/swift-build/issues/1764): closed as completed on 2026-09-22. It reports 6.4.0 and a 6.5-dev nightly failing.
- [#1770](https://github.com/swiftlang/swift-build/pull/1770): "[6.4.x]" cherry-pick into `release/6.4.x`, merged 2026-09-23.
- [#1771](https://github.com/swiftlang/swift-build/pull/1771): "[6.4.2]" cherry-pick into `release/6.4.2`, merged 2026-09-23.
- [#1772](https://github.com/swiftlang/swift-build/pull/1772): cherry-pick into `release/6.4.1`, merged 2026-09-23.
- The [release/6.4.1 history](https://github.com/swiftlang/swift-build/commits/release/6.4.1) shows the fix commit fd23c75 dated 2026-09-22 and the #1772 merge 495f728 dated 2026-09-23, both before the 6.4.1 date of 2026-10-12.

So the fix is in 6.4.1, 6.4.2 and 6.4.3 by branch content. The SwiftPM 6.4.2 notes fetched show only "Warn instead of failing when a dependency declares no traits", and the 6.4.3 notes show only a version bump. Neither mentions static-swift-stdlib. The fix lives in swift-build, so SwiftPM notes are not where it would appear. The #1764 page lists no comment confirming a fixed release.

### 3. Image tags and glibc

Source: [Docker Hub tag list](https://hub.docker.com/v2/repositories/library/swift/tags?page_size=100&name=6.4) (first 100000 characters only) and raw Dockerfiles in [swift-docker 6.4](https://github.com/swiftlang/swift-docker/tree/main/6.4).

- `6.4` and `6.4.3` share the digest prefix `e0f67c41`, updated 2026-11-20. `6.4-*` variant aliases were rebuilt 2026-11-24.
- `6.4/ubuntu/26.04/Dockerfile` is `FROM ubuntu:resolute` with `SWIFT_VERSION=swift-6.4.3-RELEASE`. Ubuntu 26.04 is unchanged as the base of `swift:6.4`.
- `6.4/amazonlinux/2023/Dockerfile` is `FROM amazonlinux:2023`. `6.4/rhel-ubi/9/Dockerfile` is `FROM redhat/ubi9` and `rhel-ubi/10` is `FROM redhat/ubi10`. Tag names remain `-rhel-ubi9` and `-rhel-ubi10`, from releases.json `docker` fields. A `-ubi9` tag appears nowhere in releases.json or the tag list.
- The glibc numbers 2.43 and 2.34 are properties of those base images. This research did not open the images, so those two numbers are carried forward and need no re-measurement unless the base image changes. The `ubuntu:resolute` base did not change.

### 4. Native engine

- A web search returned no source announcing removal or a new date, and no PR confirming deprecation or removal. The statement "removal planned for 2026H2" traces to the October 2025 SwiftPM post ([forum thread](https://forums.swift.org/t/swiftpm-on-swift-build-october-update/82889)), which returned 403 and could not be read here.
- The [Swift Package Index 6.4 post](https://swiftpackageindex.com/blog/swift-6-4-support-and-the-move-to-swift-build) (2026-10-14) says `--build-system native` still works and gives no removal date.
- The [What's new in Swift, November 2026](https://swift.org/blog/whats-new-in-swift-november-2026/) post has nothing on it.
- Today is 2026-11-27, still inside 2026H2. Removal did not ship in 6.4.1 to 6.4.3, because a native fallback is still documented on 6.4.

## Claim-by-claim verdicts

| Claim | Verdict | Old text | New fact | Source and upstream date |
|---|---|---|---|---|
| swift-package.md: "Swift 6.4.0 (current)" | changed | 6.4.0 current | 6.4.3 current (released 2026-11-19); 6.4.1 and 6.4.2 in between | releases.json, 2026-11-19 |
| "6.3.3 (previous)" | unchanged | 6.3.3 | still the latest 6.3 | releases.json, no 6.3.4 as of 2026-11-27 |
| "`swift:6.2.0` floor leg" | unchanged | floor 6.2.0 | 6.2.4 (2026-02-26) is latest 6.2 and no new 6.2 patch shipped in the window | releases.json |
| "Static Linux SDK 0.1.0 (measured 2026-10-10)" | unchanged in version, changed in checksums | 0.1.0 | still 0.1.0 on 6.4.1 to 6.4.3; new checksums per patch | releases.json |
| `.swift-version` example "`6.4.0`" | changed if the pin follows current | 6.4.0 | example should name 6.4.3 | releases.json |
| SW-REL-02 (exact SDK match, `static-sdk` entry) | unchanged | entry `static-sdk`, `--checksum` from one source | same shape: `version`, `checksum`, `archs`, no scheme field. Only the checksum value changes per patch | releases.json, 2026-11-27 |
| SW-REL-03 "6.4.0 is the only 6.4 tag. The re-check is at 6.4.1 or later" | changed | 6.4.0 only tag | 6.4.1, 6.4.2, 6.4.3 shipped, all containing the fix by branch history | releases.json; swift-build#1772, 2026-09-23 |
| SW-REL-03 "fix merged to main and backported to 6.4.x" | unchanged, refine | #1763 backported | backports #1770 (6.4.x), #1771 (6.4.2), #1772 (6.4.1), all merged 2026-09-23 | PR pages |
| SW-REL-03 "native engine deprecated with removal planned for 2026H2" | unchanged | 2026H2 | no removal or reschedule found; native still selectable | Package Index post 2026-10-14; could not read the forum thread |
| Unverified item "Re-check at 6.4.1 or a later tag" | changed | trigger pending | trigger met: 6.4.1, 6.4.2 and 6.4.3 exist. Re-measure on 6.4.3 | releases.json |
| SW-REL-06 `swift:6.4` is Ubuntu 26.04, glibc 2.43 | unchanged | Ubuntu 26.04 | Dockerfile still `FROM ubuntu:resolute`; `6.4` now resolves to 6.4.3 | swift-docker 6.4/ubuntu/26.04 |
| SW-REL-06 `-amazonlinux2023` glibc 2.34 | unchanged | AL2023 | still `FROM amazonlinux:2023` | swift-docker 6.4/amazonlinux/2023 |
| SW-REL-06 `-rhel-ubi9` exists, `-ubi9` does not | unchanged | as written | `6.4.3-rhel-ubi9` and `-rhel-ubi10` exist; no `-ubi9` tag | Docker Hub tags, releases.json |
| SW-REL-22 "Ubuntu 26.04 and 6.3.3 have no prebuilts; 6.4.0 prebuilts on by default" | could not determine | as written | not researched in this pair of sources. SwiftPM notes for 6.4.1 to 6.4.3 fetched show nothing on prebuilts | SwiftPM releases page |
| SW-GATE-25 "current release (6.4.0)" | changed | 6.4.0 | 6.4.3 | releases.json |
| SW-GATE-25 swift-crypto 5.0.0 floor (6.2.0 to 6.2.2 fail, 6.2.3 builds) | unchanged | as written | no new 6.2 patch; 6.2.x line ends at 6.2.4. Result list "6.4.0" would gain 6.4.3 on re-measure | releases.json |
| Frame note "6.4.0 dropped the Android SDK from releases.json" | changed (false) | dropped | `android-sdk` is present in 6.4.0, 6.4.1, 6.4.2 and 6.4.3, and has no `version` field. Platforms dropped in 6.4.0 were Fedora 39 and Amazon Linux 2 | releases.json, script check 2026-11-27 |

Whether the frame file's own correction at `.agents/research/swift-frame.md:161` reaches the published text is for the author step.

## Decisions asked

1. **Did 6.4.1 or later ship, and is the fix in?** Yes: 6.4.1 (2026-10-12), 6.4.2, 6.4.3. The fix is in all three by branch content. The SW-REL-03 removal condition ("drop when the pinned toolchain contains swift-build#1763") is met for any pin at 6.4.1 or later, but the rule's own text says to prove it with the probe first.
2. **Behavioural probe the rule gives (run before changing rule text):** on a 6.4 toolchain with the default engine (Swift Build), build a product that uses `JSONEncoder` with `--static-swift-stdlib`. Exit 0 means the fix is present. Exit 1 with `undefined reference to '$s15Synchronization12_MutexHandleV11_unlockSlowyyF'` means it is not. Run it on 6.4.3 (and 6.4.1 if the pin may sit there). On 6.3.3 the default is native, so exit 0 proves nothing.
3. **6.3.x patch?** None. "previous" stays 6.3.3.
4. **Static SDK version or checksum scheme?** Version stays 0.1.0. releases.json fields stay `version`, `checksum`, `archs`. No scheme field. Only checksum values changed.
5. **Native removal?** Not done, and no new date found. Treat as unchanged and unconfirmed.
6. **Image tags or glibc?** No named tag or base image changed. glibc figures not re-measured.

## Normative guidance candidates

1. Rule: bind the "current" pin to the latest 6.4 patch (6.4.3 on 2026-11-27) and read it from releases.json instead of hard-coding. Rationale: three patches shipped in 48 days. Verification: `curl -s https://www.swift.org/api/v1/install/releases.json | python3 -c 'import json,sys; print(json.load(sys.stdin)[-1]["name"])'` equals the pin in `.swift-version`.
2. Rule: SW-REL-03 keeps `--static-swift-stdlib` banned from the recipe, but its removal condition may be marked met once the probe passes on the pinned toolchain. Rationale: the fix is in 6.4.1 to 6.4.3 by branch history. Verification: the JSONEncoder probe above exits 0 on 6.4.3 with the default engine.
3. Rule: SW-REL-02 stays as written, and the install line takes the checksum from the pinned release's `static-sdk` entry. Rationale: the checksum changes every patch (five different values for 6.3.3 to 6.4.3). Verification: compare the install line's `--checksum` to the `static-sdk` entry for the pinned `name`.
4. Rule: correct the frame note on Android. Rationale: `android-sdk` is listed in 6.4.0 to 6.4.3. Verification: `python3 -c` over releases.json, platform `android-sdk` present for every release from 6.3.

## AI-agent angle

- An agent trained before 6.4 will pin `6.4.0` from the rule text. It will then miss the patch with the SW-REL-03 fix. Check: grep the pin against the last releases.json entry.
- An agent may copy a checksum from this repository's older measurements. Check: the SW-REL-02 (a) block already lists installs without `--checksum`, and (c) fails on a mismatch.
- An agent may conclude from "native deprecated, removal 2026H2" that `--build-system native` is gone. It is not, as of 2026-11-27. Check: `swift build --help` on 6.4.3 lists the option (not run here).

## Contested / evolving

- Native engine removal timing: the only dated source is the October 2025 plan (2026H2), which could not be re-read. Trend: still planned, no date.
- The 6.4.1 git tag: missing from both GitHub release pages fetched, present in releases.json and on Docker Hub.

## Needs re-measurement later (not done here, no builds run)

- The SW-REL-03 JSONEncoder probe on 6.4.3 (and 6.4.1 or 6.4.2 if pinned there).
- SW-REL-22 prebuilt behaviour on 6.4.3 and Ubuntu 26.04.
- SW-REL-05 and SW-REL-06 spot runs on `swift:6.4` (now 6.4.3), only if the rule text will cite 6.4.3 as the measurement toolchain.
- SW-GATE-25 swift-crypto result on 6.4.3.

## Sources

| URL | What | Date/era | Why |
|---|---|---|---|
| https://www.swift.org/api/v1/install/releases.json | release, SDK, Docker tag data (parsed) | read 2026-11-27 | primary for every release claim |
| https://www.swift.org/install/linux/ | install page, 6.4.3 latest, SDK file name | 2026-11-27 | primary, SDK 0.1.0 |
| https://github.com/swiftlang/swift-build/pull/1763 | fix on main | merged 2026-09-22 | primary |
| https://github.com/swiftlang/swift-build/issues/1764 | the bug report | closed 2026-09-22 | primary |
| https://github.com/swiftlang/swift-build/pull/1770 | 6.4.x cherry-pick | merged 2026-09-23 | primary |
| https://github.com/swiftlang/swift-build/pull/1771 | 6.4.2 cherry-pick | merged 2026-09-23 | primary |
| https://github.com/swiftlang/swift-build/pull/1772 | 6.4.1 cherry-pick | merged 2026-09-23 | primary |
| https://github.com/swiftlang/swift-build/commits/release/6.4.1 | branch history | read 2026-11-27 | primary, fix inside 6.4.1 |
| https://github.com/swiftlang/swift-build/releases | tag list | read 2026-11-27 | primary, no 6.4.1 entry |
| https://github.com/swiftlang/swift-package-manager/releases | SwiftPM notes 6.4.2, 6.4.3 | 2026-10-30, 2026-11-20 | primary |
| https://hub.docker.com/v2/repositories/library/swift/tags?page_size=100&name=6.4 | Docker Hub tags (partial read) | 2026-11-24 | primary |
| https://github.com/swiftlang/swift-docker/tree/main/6.4 | image Dockerfiles (raw FROM lines read) | 2026-11-27 | primary |
| https://swiftpackageindex.com/blog/swift-6-4-support-and-the-move-to-swift-build | native flag still works | 2026-10-14 | secondary |
| https://swift.org/blog/whats-new-in-swift-november-2026/ | no relevant content | 2026-11-11 | primary, negative |

Fetch failures: the SwiftPM forum threads (403), the `6.4.md` release notes path (404), `swift.org/install/linux/static-sdk/` (404), the GitHub API (rate limited). The Docker Hub list was read only to character 100000 of 163860.
