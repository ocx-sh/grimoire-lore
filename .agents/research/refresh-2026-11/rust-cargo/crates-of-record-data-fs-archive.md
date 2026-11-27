---
title: Crates of record delta, data, serialization, filesystem, archive, time and randomness rows
pair: rust-cargo
date_researched: 2026-11-27
window_start: 2026-08-14
model: sonnet
sources_fetched: 24
---

# Crates of record delta (2026-08-14 to 2026-11-27)

This is a delta update of `skills/rust-cargo-reference/crates-of-record.md`. Only rows whose upstream facts changed are marked "changed". Everything else is "unchanged".

Primary sources used:
- crates.io JSON API, `https://crates.io/api/v1/crates/<name>` and `/versions`, fetched 2026-11-27 with a `dep-check` User-Agent. Every version date below comes from the `created_at` field.
- RustSec advisory database, shallow clone of `https://github.com/rustsec/advisory-db` (HEAD dated 2026-11-26). Every advisory file under `crates/<name>/` for every crate in scope was listed and filtered by `date`.
- Upstream changelogs: zip2, jiff, toml, toml_edit, schemars, ruzstd, dirs (Codeberg), chronotope/chrono issue 1768.

Limits: GitHub's REST API was rate limited, so archive status came from rendered repository pages. The jiff, zip, toml, toml_edit, schemars and ruzstd changelog contents were read through a summarising fetch tool, not raw.

## Summary of changed rows

1. Date and time: `chrono` is now the subject of RUSTSEC-2026-0543 (unmaintained, no patched version), and `jiff` reached 1.0.0. The row must flip.
2. zip: `zip` 9.x is current (9.8.2), and 8.x is affected by seven advisories published 2026-10-09 to 2026-10-22. The row must flip.
3. Base directories: `dirs` 7.0.0 shipped 2026-09-05 with a Windows `preference_dir` change. Wording update only.
4. ruzstd: 0.9.1 fixed a decompression-bomb advisory (RUSTSEC-2026-0344). This bears on open question 6.
5. YAML: no release by either fork in the window, so the open question 4 sweep result is "still unsettled, and both are idle".

## Per-row verdicts

| Claim at risk | Verdict | Evidence (URL, date) |
|---|---|---|
| serde_json is the JSON crate of record; simd-json is the reached-for alternative | unchanged | serde_json 1.0.154 (2026-10-11), simd-json 0.19.0 (2026-10-27): https://crates.io/api/v1/crates/simd-json. No in-window advisory. Last simd-json advisory is RUSTSEC-2019-0008 |
| serde_json_canonicalizer | unchanged | 0.4.1 (2026-10-13). 0.4.0 of the same day is yanked, which is a release hiccup, not a row change: https://crates.io/api/v1/crates/serde_json_canonicalizer |
| `toml::map::Map` is BTreeMap-backed unless `preserve_order` | unchanged (could not fully determine; no contrary entry) | toml 1.2.3 (2026-11-25). The changelog for 1.1.5 to 1.2.3 and Unreleased has no entry on `Map`, `preserve_order`, `BTreeMap` or `IndexMap`: https://github.com/toml-rs/toml/blob/main/crates/toml/CHANGELOG.md. Note toml is now 1.x, with spec 1.1.0 |
| toml_edit gaps: dotted-key order, CRLF to LF, BOM dropped | unchanged | toml_edit 0.25.21 (2026-11-25). Changelog 0.25.14 to 0.25.21 has no fix for dotted-key order, newline normalisation or BOM. The only dotted-key entry (0.25.21) is a stack-overflow error fix: https://github.com/toml-rs/toml/blob/main/crates/toml_edit/CHANGELOG.md |
| YAML: `serde_yaml_ng` here; fork landscape unsettled | unchanged, with new facts (see below) | crates.io: serde_yaml_ng 0.10.0 last released 2024-05-26, serde_norway 0.9.42 last released 2024-12-21, serde_yaml 0.9.34+deprecated 2024-03-25. Neither fork shipped in the window. https://github.com/acatton/serde-yaml-ng and https://github.com/cafkafk/serde-norway show no archive banner. No RUSTSEC advisory for any of the three in the window |
| schemars 1.x and the schema-shape stability statement | unchanged, and the statement was just demonstrated | schemars 1.2.3 (2026-10-12) changed output: the tag of internally-tagged enums is now first in `properties`. 1.2.1 (2026-02-01) and 1.2.2 (2026-07-27) pre-date or are not output changes. https://github.com/GREsau/schemars/blob/master/CHANGELOG.md |
| bincode: RUSTSEC-2025-0141; 3.0.0 docs-only with compile error | unchanged | bincode 3.0.0 created 2025-12-16, not yanked, still the newest version, no later release: https://crates.io/api/v1/crates/bincode. The advisory date is 2025-12-16. The GitHub repository is archived since 2025-08-15 with a pointer to sourcehut: https://github.com/bincode-org/bincode |
| postcard | changed in a minor way | postcard 1.2.0 (2026-11-21) is the max stable version. 2.0.0-rc.0 was published 2026-11-27, the day of this sweep. 1.2.0 notes: no breaking changes listed (https://github.com/jamesmunns/postcard/releases). The contents of 2.0.0-rc.0 could not be determined. Keep the row, and do not pin `2.0.0-rc.0` |
| rmp-serde | unchanged | 1.3.1 (2025-12-23). Last advisory RUSTSEC-2022-0092 |
| thiserror, anyhow majors | unchanged | thiserror 2.0.21 (2026-09-23), anyhow 1.0.105 (2026-11-23). No new major. The anyhow advisory RUSTSEC-2026-0190 (downcast_mut unsound, patched in 1.0.103) is dated 2026-06-25, before the window |
| tracing, tracing-subscriber, tracing-log | unchanged | tracing 0.1.44 (2025-12-18), tracing-subscriber 0.3.23 (2026-03-13), tracing-log 0.2.0 (2023-10-25). No release in the window and no new advisory. tracing-log being idle since 2023 is not a signal of abandonment for a bridge crate |
| tempfile `NamedTempFile::persist` | unchanged | 3.27.0 (2026-03-11), no release in the window |
| atomicwrites | unchanged | 0.4.4 (2024-09-19), no release in the window |
| fs4 vs fs2 ("fs2 last release 2018-01") | unchanged | fs2 0.4.3 created 2018-01-06; fs4 1.1.0 (2026-04-28): https://crates.io/api/v1/crates/fs2 |
| dunce | unchanged | 1.0.5 (2024-08-04) |
| dirs / directories ("both maintained by the same org") | changed, wording only | dirs 7.0.0 (2026-09-05): single changelog entry, a breaking change, `preference_dir` on Windows moves from LocalAppData to RoamingAppData. `directories` is still 6.0.0 (2025-01-12). Development moved to Codeberg: crate repository is `https://codeberg.org/dirs/dirs-rs`, and the GitHub `dirs-dev/dirs-rs` repository is archived since 2025-02-18. See https://codeberg.org/dirs/dirs-rs |
| globset vs glob | unchanged | globset 0.4.22 (2026-11-22). glob 0.3.4 (2026-10-08). No advisory |
| flate2 on miniz_oxide | unchanged | flate2 1.1.11 (2026-11-06), miniz_oxide 0.9.1 (2026-03-13). No advisory |
| xz: pure-Rust decoder vs liblzma/xz2 | unchanged; no new advisory | liblzma 0.4.9 (2026-10-19), xz2 0.1.7 (2022-06-06). lzma-rust2 0.26.0 (2026-11-25), a rapid minor-version cadence from 0.18.1 (2026-08-05): https://crates.io/api/v1/crates/lzma-rust2. No advisory in the window for liblzma, liblzma-sys, lzma-sys, lzma-rs, xz2 or lzma-rust2 |
| tar >= 0.4.45; RUSTSEC-2026-0067 | unchanged | tar 0.4.46 (2026-05-18) is newest, and no tar advisory is newer than RUSTSEC-2026-0067 and RUSTSEC-2026-0068 (both 2026-03-19, both patched at >= 0.4.45). Floor is not raised. RUSTSEC-2026-0068 (PAX size header ignored) is a second advisory fixed by the same floor, and could be named alongside 0067 |
| zip 8.x; RUSTSEC-2025-0168 | changed | zip 9.0.0 (2026-10-09) and 9.8.2 (2026-11-23) current. Seven new advisories, below. https://crates.io/api/v1/crates/zip and https://raw.githubusercontent.com/zip-rs/zip2/master/CHANGELOG.md |
| sha2 vs blake3 | unchanged | sha2 0.11.2 (2026-11-25), blake3 1.8.8 (2026-11-26). No advisory |
| chrono vs jiff | changed | chrono flagged unmaintained, jiff 1.0.0 released. See below |
| backon, backoff, tokio-retry | unchanged | backon 1.6.0 (2025-10-18); backoff 0.4.0 (2021-12-14), RUSTSEC-2025-0012 (2025-03-04) already covers it; tokio-retry 0.3.2 (2026-06-09) |
| governor | unchanged | 0.10.4 (2025-12-16) |
| dotenvy vs dotenv | unchanged | dotenvy 0.15.7 (2023-03-22); dotenv 0.15.0 (2019-10-21), RUSTSEC-2021-0141 |
| rand 0.10; `gen` renamed `random` at 0.9 | unchanged | rand 0.10.4 (2026-11-15), no 0.11. RUSTSEC-2026-0097 (unsound with a custom logger calling `rand::rng()`, patched 0.10.1, 0.9.3, 0.8.6) is dated 2026-04-09, before the window. A 0.8.8 appeared 2026-08-25 |
| uuid v7 | unchanged | uuid 1.29.3 (2026-11-17), still 1.x |
| ruzstd maturity (open question 6) | changed | See below |

## New RUSTSEC IDs that touch a row (published in the window)

All dates are the `date` field in the advisory file.

- RUSTSEC-2026-0543, chrono, 2026-09-14, informational "unmaintained", no patched version, "all versions are affected". Recommends `jiff` or `time`. Issue: https://github.com/chronotope/chrono/issues/1768
- RUSTSEC-2026-0367, zip, 2026-10-09, SUID/SGID bits preserved during extraction. Patched in >= 9.0.0.
- RUSTSEC-2026-0368, zip, 2026-10-09, `ZipArchive::extract` creates symlinks whose targets escape the destination. Patched in >= 9.0.0.
- RUSTSEC-2026-0369, zip, 2026-10-10, permissions applied through symlinks without confinement (`ZipStreamReader::extract`, `ZipArchive::extract`). Patched in >= 9.0.0.
- RUSTSEC-2026-0548, zip, 2026-10-17, `ZipStreamReader` uses local-header names that can differ from the central directory. Patched in >= 9.0.5.
- RUSTSEC-2026-0429, zip, 2026-10-22, `extract` aborts on a symlink entry with a large declared size. Patched in >= 9.0.0.
- RUSTSEC-2026-0545, zip, 2026-10-22, AES entries returned without checking the authentication code. Patched in >= 9.0.0.
- RUSTSEC-2026-0546, zip, 2026-10-22, `extract` writes outside the destination through absolute or chained symlinks. Unaffected below 7.2.0, patched in >= 9.0.0.
- RUSTSEC-2026-0547, zip, 2026-10-22, legacy Shrink/Reduce/Implode decoders preallocate the declared size. Unaffected below 5.1.0, patched in >= 9.0.0.
- RUSTSEC-2026-0344, ruzstd, 2026-10-11, decompression bomb: an input under 128 KB can force a multi-gigabyte allocation. Patched in >= 0.9.1.

No new advisory in the window for: serde_json, simd-json, serde_json_canonicalizer, toml, toml_edit, serde_yaml and both forks, schemars, bincode, postcard, rmp-serde, thiserror, anyhow, tracing family, tempfile, atomicwrites, fs4, fs2, dunce, dirs, directories, globset, glob, flate2, miniz_oxide, xz and lzma crates, tar, sha2, blake3, jiff, backon, tokio-retry, governor, dotenvy, rand, uuid.

## Details for the changed rows

### Date and time (chrono vs jiff)

- jiff 1.0.0 was released 2026-11-15; 1.0.1 (2026-11-17), 1.0.2 (2026-11-21), 1.0.3 (2026-11-24) are bug fixes. The changelog says: "Barring some unforeseen major problem with the API, this release marks an indefinite commitment to 1.x.y." Breaking changes against 0.2: `Zoned` renamed `ZonedDateTime`, `Timestamp::to_zoned` became `to_zoned_datetime`. Source: https://github.com/BurntSushi/jiff/blob/master/CHANGELOG.md.
- chrono: maintainer djc opened issue 1768 "Soft-deprecating chrono and chrono-tz" on 2026-01-22, stating he plans to "wind down maintenance in the coming months" and recommending jiff. RustSec turned that into RUSTSEC-2026-0543 on 2026-09-14. chrono 0.4.45 (2026-06-04) is the last release. `chrono-tz` will not track time zone database changes (maintainer reply, 2026-08-02). The repository is not archived.
- Consequence: the existing cell calls jiff "not a migration mandate", which is now stale for new code. `cargo deny check advisories` will fail on any graph containing chrono unless an ignore is added with a removal condition (DEP-08).

Replacement cell text for "Date and time":

> | Date and time | `jiff` 1.x for new code | `chrono`, `time` where a graph already depends on it | `chrono` is flagged unmaintained (`RUSTSEC-2026-0543`, 2026-09-14, no patched version) and its maintainer recommends `jiff`, which reached 1.0 on 2026-11-15 with a commitment to 1.x. Existing chrono use is a deliberate migration, not a reflex edit: an `[advisories] ignore` entry needs a removal condition (DEP-08). `chrono-tz` no longer tracks tz database updates. One datetime crate per graph either way |

Note: this reverses the "Crate of record" and "An agent reaches for" columns. The family's own repositories may still depend on chrono, so the rule text and the table row need to be edited together with a DEP-08 note. A transitive chrono (via other crates) is not a violation of DEP-04 by itself.

### zip

- zip 9.0.0 (2026-10-08 per changelog, 2026-10-09 on crates.io) is the line that patches seven advisories. 8.6.0 (2026-04-25) is the last 8.x. 9.8.2 (2026-11-23) is current. Nineteen or more 9.x releases in seven weeks show rapid churn, so a pinned minor matters less than the floor.
- The floor for all seven is >= 9.0.5 because of RUSTSEC-2026-0548 (affects `ZipStreamReader`, which a loop over `ZipArchive` does not use, so 9.0.0 suffices for the explicit-loop pattern, but a floor of 9.0.5 removes the question).
- Behaviour note: the zip2 changelog describes 9.x extraction hardening (symlink handling in 9.1.2 and 9.1.3, size limit in 9.1.0, `ExtractOptions` in 9.5.0). It labels none of the 9.x releases as security releases, so the RustSec entries are the authority, not the changelog.
- The original cell's reasoning stays valid and is strengthened: three of the seven advisories are in `ZipArchive::extract()` itself (0368, 0369, 0429), and one more in the symlink path (0546).

Replacement cell text for "zip":

> | zip | `zip` >= 9.0.5 with an explicit extraction loop | `ZipArchive::extract()`, `zip` 8.x or earlier | `RUSTSEC-2025-0168` (symlink zip-slip that `enclosed_name()` alone did not stop) and, from 2026-10, seven more advisories all patched in 9.0.0 or later: `RUSTSEC-2026-0367`, `-0368`, `-0369`, `-0429`, `-0545`, `-0546`, `-0547`, plus `RUSTSEC-2026-0548` (`ZipStreamReader` local-header names, patched 9.0.5). Several are in `extract()` itself, so the convenience method is still not the answer |

### Base directories

Replacement cell text for "Base directories":

> | Base directories | one of `dirs` 7.x / `directories` 6.x, chosen once | picking per call site | Both come from the same author, now developed on Codeberg (the GitHub `dirs-dev` repository is archived since 2025-02-18). `dirs` 7.0.0 (2026-09-05) moved Windows `preference_dir` from LocalAppData to RoamingAppData, matching `directories`. The failure is inconsistency, not the choice |

### YAML (open question 4)

- Result of the sweep: both forks are idle. serde_yaml_ng last published 2024-05-26 (about 18 months), serde_norway 2024-12-21 (about 11 months). Neither is archived. serde_yaml_ng's README still says "This is a library for myself, don't expect professional support".
- Other YAML crates seen on crates.io with recent updates: `serde_yml` 0.0.13 (2026-05-27) and `libyml` 0.0.6 (2026-05-29). Their relationship to the above was not investigated, and `serde_yml` was not evaluated here. Treat as "could not determine".
- Verdict: the decision (`serde_yaml_ng`, family consistency) is not stale, and the "landscape is unsettled" wording stays true. Optional addition to the cell: "Neither `serde_yaml_ng` nor `serde_norway` released in the 2026-08 to 2026-11 window."

### ruzstd (open question 6)

- ruzstd 0.9.0 (2026-07-26), 0.9.1 (2026-10-11). The 0.9.1 line patches RUSTSEC-2026-0344, an OOM decompression bomb on a under-128 KB `.zst` input. The earlier advisory RUSTSEC-2024-0400 (uninitialised reads, patched 0.7.3, 2024-11-28) also exists. The Changelog lists further decoder-hardening items after 0.9.1 on master: rejecting oversized compressed block bodies, per-block literal limits, reserved-bit rejection. Source: https://raw.githubusercontent.com/KillingSpark/zstd-rs/master/Changelog.md.
- Verdict for open question 6: ruzstd is actively maintained but two advisories on untrusted-input decoding, one in the window, show it is not yet an equal-maturity replacement for C `zstd`. The asymmetry (C `zstd-sys` for zstd, pure Rust for xz and gzip) stands. The crates-of-record table has no zstd row, so there is nothing to change in that file. If the research file's asymmetry statement is carried into a rule, add that ruzstd needs >= 0.9.1.

## Normative candidates

1. Rule: new Rust code uses `jiff` for dates and times, and `chrono` is a deny-list entry for new dependencies.
   - Rationale: RUSTSEC-2026-0543 plus a maintainer statement plus jiff 1.0 is a stronger signal than the table's current "not a migration mandate".
   - Verification: `cargo deny check advisories` fails on chrono without an ignore, and `grep -n -E '^chrono\b' Cargo.toml */Cargo.toml` returns nothing in new crates.
2. Rule: `zip` floor is 9.0.5 and `ZipArchive::extract()` remains banned.
   - Rationale: seven advisories patched at 9.0.0 or later; one at 9.0.5.
   - Verification: `cargo tree -e normal -i zip` shows >= 9.0.5; `grep -rn -F '.extract(' --include='*.rs' .` shows no `ZipArchive` call sites.
3. Rule (extends DEP-08): an advisory ignore for an unmaintained crate (such as chrono) carries the command that detects the migration, for example `cargo tree -e normal -i chrono` returning "did not match any packages".
   - Rationale: the new chrono advisory is informational and has no patched version, so the ignore never goes green on its own.
   - Verification: each `[advisories] ignore` entry names a command, as DEP-08 already states.

## Could not determine

- Contents of postcard 2.0.0-rc.0 (released the same day as this sweep).
- Whether `serde_yml` and `libyml` are viable alternatives to the two forks.
- Exact GitHub archive status of the toml-rs, zip-rs, jiff, tar-rs and schemars repositories (the GitHub REST API was rate limited). None of their changelog or crates.io activity suggests archival.
- Whether the toml `Map` backing changed: no changelog entry says so, but the changelog was read through a summariser, not diffed against source.
