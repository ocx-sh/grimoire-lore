---
title: Swift advisory floors delta, 2026-10-10 to 2026-11-27
pair: swift-quality
date_researched: 2026-11-27
window_start: 2026-10-10
model: sonnet
sources_fetched: 27
---

# Swift advisory floors delta

Scope: SW-SEC-20 floor table, the security.md header stamp, SW-SEC-21 scanner claims, and the advisory citations in SW-SEC-22 and SW-SEC-23. The `discovery` command from security.md could not be run: `gh api` returned HTTP 403 "API rate limit exceeded" at 2026-11-27 09:53 UTC. The read was reproduced by hand from the repository advisory pages and release pages. Those pages show no affected or patched versions on the list view, so versions come from each advisory's own page where one was opened. Everything not opened is marked as such.

## Summary

- Two floors change: swift-crypto (new critical advisory, fixed only on the 5.x line) and hummingbird (new high advisory, fixed in 2.29.0).
- swift-nio 2.101.0, swift-nio-ssl 2.37.2 and swift-nio-extras 1.34.1 are unchanged: no advisory was published in the window.
- osv-scanner is now 2.7.1; the `scan source -L` spelling and exit code 1 on findings still hold.
- GitHub's Swift reviewed feed still shows 64 advisories.
- Outside the table: swift-nio-http2 has an advisory the program's HTTP servers pull in; its fix version is 1.45.0 per the hummingbird 2.28.0 release notes. No new advisory for swift-certificates, swift-asn1, grpc-swift or vapor.

## Findings

### 1. Floor per package

| Package | Old floor | Verdict | Detail |
|---|---|---|---|
| swift-nio | 2.101.0 | unchanged | Six repo advisories, newest [GHSA-qcc5-f287-vgmq](https://github.com/apple/swift-nio/security/advisories/GHSA-qcc5-f287-vgmq) = CVE-2026-43678, published 2026-07-09, `<= 2.100.0`, fixed 2.101.0. No advisory after 2026-10-10 ([list](https://github.com/apple/swift-nio/security/advisories)). Releases 2.102.0 to 2.105.2 (latest 2026-11-24) carry no security label ([releases](https://github.com/apple/swift-nio/releases)). 2.105.1 (owner-only temp directories) and 2.105.2 (ByteBufferView range bounds check) are hardening, not advisories. |
| swift-nio-ssl | 2.37.2 | unchanged | Still [GHSA-xfxg-9975-pc2j](https://github.com/apple/swift-nio-ssl/security/advisories/GHSA-xfxg-9975-pc2j) = CVE-2026-43820, `>= 2.18.0, <= 2.37.1`, fixed 2.37.2, published 2026-07-15. No newer advisory ([list](https://github.com/apple/swift-nio-ssl/security/advisories)). |
| swift-nio-extras | 1.34.1 | unchanged | Newest is [GHSA-6ph5-fww6-vfwv](https://github.com/apple/swift-nio-extras/security/advisories) (published 2026-05-21 on the repo, 2026-06-12 on the GitHub database). No new advisory. |
| swift-crypto | 4.5.1 | changed | Old: "swift-crypto 4.5.1 (CVE-2026-43823, critical)". New advisories in the window, all on [the repo list](https://github.com/apple/swift-crypto/security/advisories): [GHSA-rch3-xxjq-365j](https://github.com/apple/swift-crypto/security/advisories/GHSA-rch3-xxjq-365j) critical, CVSS 9.1, no CVE, X25519 accepts low-order public keys and returns an all-zero shared secret, `<= 5.1.1`, fixed 5.1.2, published 2026-11-19. [GHSA-c24m-vphm-p22w](https://github.com/apple/swift-crypto/security/advisories/GHSA-c24m-vphm-p22w) moderate, no CVE, `KDF.Scrypt.deriveKey` ignores `maxMemory`, `>= 4.0.0, <= 5.1.1`, fixed 5.1.2, published 2026-11-19. [GHSA-jwv7-rv4f-rff2](https://github.com/apple/swift-crypto/security/advisories/GHSA-jwv7-rv4f-rff2) high, CVE-2026-86983, VOPRF input length limit not enforced, `3.10.0 to 5.0.2`, fixed 5.0.3, published 2026-10-20. 5.1.2 release 2026-11-19 names the first two as security fixes ([releases](https://github.com/apple/swift-crypto/releases)). The 4.x line gets no backport in the eight newest releases (5.2.0 on 2026-11-24 is the latest). The X25519 advisory states only `<= 5.1.1`; it does not say whether 4.x is affected or backported. The floor for a root on 5.x becomes 5.1.2. The floor for a root pinned on 4.x: could not determine. |
| hummingbird | 2.26.0 | changed | Old: "hummingbird 2.26.0 (CVE-2026-97696, -97697, -102835)". New: [GHSA-rgp4-jj2h-f9h9](https://github.com/hummingbird-project/hummingbird/security/advisories/GHSA-rgp4-jj2h-f9h9) high, CVSS 7.5, no CVE, RequestBody inbound close functions do not exit on connection close (resource exhaustion), `>= 2.6.0, <= 2.28.1`, fixed 2.29.0, published 2026-11-19. Releases: v2.28.0 (2026-10-13) raised its minimums to swift-nio 2.101.0, swift-nio-ssl 2.37.2, swift-nio-http2 1.45.0; v2.29.0 (2026-11-19) ([releases](https://github.com/hummingbird-project/hummingbird/releases)). The three August advisories (GHSA-wqpw-qq6j-p4x2, GHSA-62cf-93wq-244m, GHSA-97r6-mq85-c3rv, all 2026-08-17) are unchanged and still match the baseline. Their CVE IDs were not re-opened. |

### 2. Header stamp and advisory links

- "swift-nio 2.101.0" still correct as a floor. "swift-crypto 4.5.1" is stale (see table). "osv-scanner 2.6.0" is stale: [v2.7.1 on 2026-11-09](https://github.com/google/osv-scanner/releases), v2.7.0 on 2026-10-12, v2.6.0 on 2026-09-14.
- GHSA-qcc5-f287-vgmq: fixed 2.101.0, unchanged. GHSA-8q93-f6xh-4f6f ([swift-crypto](https://github.com/apple/swift-crypto/security/advisories/GHSA-8q93-f6xh-4f6f)): CVE-2026-43823, `>= 3.2.0, <= 4.5.0`, fixed 4.5.1, published 2026-07-16, unchanged. GHSA-r3rc-9hpw-54v9: out-of-bounds write via ByteBuffer UInt32 overflow, published 2026-05-21 on [the swift-nio list](https://github.com/apple/swift-nio/security/advisories), its fixed version was not opened, so "could not determine" whether anything changed.

### 3. Scanners

- `osv-scanner scan source -L Package.resolved`: the release notes for v2.4.0 to v2.7.1 mention no change to `scan source` or `-L`. The v2.4.0 note says the `swift/packageresolved` plugin is enabled by default. Spelling: unchanged by release notes, not re-run (no binary installed here; the docs URL `/usage/scan-source/` returned 404, so the spelling is confirmed only by the absence of a release note). Exit code: the [output doc](https://google.github.io/osv-scanner/output/) says 0 = packages found and no findings, 1 = findings, 128 = no packages found, 127 = general error. "Exits 1 on findings" holds.
- OSV does not carry the new advisories. api.osv.dev returned "Vulnerability not found" for GHSA-rch3-xxjq-365j, GHSA-c24m-vphm-p22w and GHSA-rgp4-jj2h-f9h9, and for GHSA-jwv7-rv4f-rff2 it returned "not found, but the following aliases were: CVE-2026-86983" (read 2026-11-27). So the "a green scanner is not a safe tree" rationale gains three more cases. Not re-measured by running osv-scanner.
- GitHub reviewed Swift feed (`github.com/advisories?query=ecosystem:swift type:reviewed`): [64 advisories](https://github.com/advisories?query=ecosystem%3Aswift+type%3Areviewed), unchanged. Newest listed entry is 2026-10-05 (Capacitor, a Maven-ecosystem package shown under the Swift filter). None of the new swift-crypto or hummingbird repo advisories appear. "Misses six well-known 2026 CVEs": the miss count is now at least three greater (the four new IDs above are absent from OSV, and the first three from the feed), not re-counted against the original six.
- Dependabot `package-ecosystem: swift`: not re-checked (docs not fetched). Treat as unchanged, could not determine.

### 4. SW-SEC-22 and SW-SEC-23 citations

Hummingbird CVE-2026-97697 (Range header, FileMiddleware GHSA-62cf-93wq-244m, 2026-08-17), swift-nio-extras CVE-2026-28975 and swift-nio CVE-2026-28980: the repo pages list the same advisories as at baseline and none was withdrawn or reworded in the window. The CVE ID mapping itself was not re-opened: could not determine.

### 5. Packages outside the table

- swift-nio-http2: [GHSA-q3g2-m552-3r9c](https://github.com/apple/swift-nio-http2/security/advisories) moderate, missing CR/LF/NUL validation in header values, published 2026-07-23. [GHSA-4px2-pw77-vc85](https://github.com/apple/swift-nio-http2/security/advisories) low, HTTP/2-to-HTTP/1 smuggling, 2026-05-21. Both predate the window. The hummingbird 2.28.0 notes name swift-nio-http2 1.45.0 with CVE-2026-64785; the matching advisory page was not opened, so the floor 1.45.0 is secondary-sourced. A Swift server pulls this in through swift-nio-ssl/hummingbird-http2. Candidate floor, not yet in the table.
- swift-certificates: no published advisories. swift-asn1: one, CVE-2025-0343, 2025-01-14, outside the window. grpc-swift: four, newest 2022. vapor: seven, newest 2024-01-03. None new.

## Normative guidance candidates

1. Raise the swift-crypto floor for roots on 5.x to 5.1.2, citing GHSA-rch3-xxjq-365j (critical) and GHSA-c24m-vphm-p22w. Rationale: critical all-zero shared secret in X25519. Verification: the `floors` block with `floor swift-crypto '[5,1,2]' 5.1.2`, applied only when the pin's major is 5, otherwise a reading step; `discovery` lists the advisory on repo `apple/swift-crypto`.
2. Raise the hummingbird floor to 2.29.0, citing GHSA-rgp4-jj2h-f9h9. Rationale: remote resource exhaustion, fixed in 2.29.0. Verification: `floor hummingbird '[2,29,0]' 2.29.0` in the `floors` block.
3. Add swift-nio-http2 1.45.0 to the floors only after the advisory page behind CVE-2026-64785 is opened and its range confirmed. Verification: `floor swift-nio-http2 '[1,45,0]' 1.45.0` and `discovery`.
4. Add the new advisories to the "scanner-green" rationale of SW-SEC-20 (OSV returned not found on 2026-11-27) and change the header stamp from osv-scanner 2.6.0 to 2.7.1 only after a re-run of the watched-red example; until then keep 2.6.0 as the measured version and say 2.7.1 is current.
5. Reword the floor table label as a "2026-11-27 snapshot" for crypto and hummingbird, keep the rest at 2026-10-10.

## AI-agent angle

- An agent will take swift-crypto "latest 4.x" and see no scanner finding for the X25519 flaw. Check: `floors` plus `discovery`; never rely on `osv-scanner` exit 0.
- An agent may copy the old `floors` block, which still passes swift-crypto 4.5.1 and hummingbird 2.26.0 to 2.28.1. Check: diff the floor numbers against the table above before trusting exit 0.

## Contested / evolving

- swift-crypto 5.x is a major bump (aligned with CryptoKit in Xcode 27). Whether the 4.x line receives the X25519 fix is open as of 2026-11-27; a root that cannot move to 5.x has no known patched version.
- Repository advisories are published without CVEs (three of the four new ones), which is why OSV and the GitHub feed stay empty.

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://github.com/apple/swift-nio/security/advisories | swift-nio advisories | read 2026-11-27 | no new advisory |
| https://github.com/apple/swift-nio/security/advisories/GHSA-qcc5-f287-vgmq | CVE-2026-43678 | 2026-07-09 | floor 2.101.0 |
| https://github.com/apple/swift-nio/releases | releases to 2.105.2 | 2026-11-24 | no security label |
| https://github.com/apple/swift-nio-ssl/security/advisories | list | read 2026-11-27 | unchanged |
| https://github.com/apple/swift-nio-ssl/security/advisories/GHSA-xfxg-9975-pc2j | CVE-2026-43820 | 2026-07-15 | floor 2.37.2 |
| https://github.com/apple/swift-nio-extras/security/advisories | list | read 2026-11-27 | unchanged |
| https://github.com/apple/swift-crypto/security/advisories | list | read 2026-11-27 | three new |
| https://github.com/apple/swift-crypto/security/advisories/GHSA-rch3-xxjq-365j | X25519 | 2026-11-19 | critical |
| https://github.com/apple/swift-crypto/security/advisories/GHSA-c24m-vphm-p22w | Scrypt | 2026-11-19 | moderate |
| https://github.com/apple/swift-crypto/security/advisories/GHSA-jwv7-rv4f-rff2 | VOPRF | 2026-10-20 | CVE-2026-86983 |
| https://github.com/apple/swift-crypto/security/advisories/GHSA-8q93-f6xh-4f6f | CVE-2026-43823 | 2026-07-16 | baseline floor |
| https://github.com/apple/swift-crypto/releases | releases | 2026-11-24 | fix versions |
| https://github.com/hummingbird-project/hummingbird/security/advisories | list | read 2026-11-27 | one new |
| https://github.com/hummingbird-project/hummingbird/security/advisories/GHSA-rgp4-jj2h-f9h9 | new advisory | 2026-11-19 | floor 2.29.0 |
| https://github.com/hummingbird-project/hummingbird/releases | releases | 2026-11-19 | min deps |
| https://github.com/apple/swift-nio-http2/security/advisories | list | read 2026-11-27 | outside table |
| https://github.com/apple/swift-certificates/security/advisories | none | read 2026-11-27 | none |
| https://github.com/apple/swift-asn1/security/advisories | one old | read 2026-11-27 | none new |
| https://github.com/grpc/grpc-swift/security/advisories | old only | read 2026-11-27 | none new |
| https://github.com/vapor/vapor/security/advisories | old only | read 2026-11-27 | none new |
| https://github.com/advisories?query=ecosystem%3Aswift+type%3Areviewed | GitHub Swift feed | read 2026-11-27 | 64 |
| https://api.osv.dev/v1/vulns/GHSA-rch3-xxjq-365j (and three more) | OSV lookups | read 2026-11-27 | not found |
| https://github.com/google/osv-scanner/releases | osv-scanner releases | 2026-11-09 | v2.7.1 |
| https://google.github.io/osv-scanner/output/ | exit codes | read 2026-11-27 | 1 on findings |
