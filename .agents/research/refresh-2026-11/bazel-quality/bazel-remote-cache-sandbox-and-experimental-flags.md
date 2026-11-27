---
title: Bazel remote-cache, sandbox and experimental flag delta, 2026-09-06 to 2026-11-27
pair: bazel-quality
date_researched: 2026-11-27
window_start: 2026-09-06
model: sonnet
sources_fetched: 14
---

# Scope

Delta against the 2026-09-06 baseline of rules/bazel-quality.md and skills/bazel-quality-reference/. Only upstream changes inside the window are recorded. Everything marked "unchanged" means no primary source in the window touched it; it was not re-measured. Releases in the window: 8.8.1 (2026-09-24), 9.3.0 (2026-10-07), 8.8.2 and 9.3.1 (2026-10-20), 9.3.2 (2026-11-05), 8.9.0 and 9.3.3 (2026-11-19), 10.0.0rc1 to rc4 (2026-10-07 to 2026-11-19; rc4 is NOT a final release). Baseline measured 8.7.0, 8.8.0 (released 2026-08-31) and 9.2.0.

Method limits: GitHub release pages were read through a summarising fetcher. The 8.9.0rc and 10.0.0rc4 notes are marked upstream as "still being updated", so absence of a line is not proof of absence. Intermediate patch notes (8.8.1, 8.8.2, 9.3.1 to 9.3.3) were not read individually; only the release list shows 9.3.3 and 9.3.2/8.8.x changed the embedded JDK or carried no flag news that surfaced. The `RemoteOptions.java` at release-10.0.0 did not contain `experimental_remote_cache_eviction_retries` or `experimental_remote_cache_ttl`, so their current definition file was not located.

# Summary

- WRONG (needs rewrite): `--rewind_lost_inputs` is now ON by default from 9.3.0, so BZL-CACHE-12's "UNDOCUMENTED" framing and "never set retries=0 believing rewind covers the gap" must be split per version.
- WRONG: the "MAX_REPEATED_LOST_INPUTS = 20 is hard-coded, byte-identical 8.7.0 through 9.2.0" is true only up to 9.2.0; 8.9.0 and 10.0.0 add `--experimental_max_repeated_lost_inputs`, default 20.
- WRONG: BZL-CACHE-28 "Never write `--experimental_remote_cache_chunking_function`... no such flag has ever shipped". It ships on 8.9.0 and 10.0.0rc4, default `auto`, values `auto`, `fast_cdc_2020`, `rep_max_cdc`.
- CHANGED: chunking is still experimental and default false, but server negotiation, RepMaxCDC fallback and parallel chunk transfer now exist; the Gaps line "durable absence" for chunking is stale.
- CHANGED: `--disk_cache_gc_*` flags are no longer experimental (10.0.0rc4 notes); GC-deleted disk entries are misses, not failures (9.3.0, 8.9.0).
- CHANGED: `--experimental_use_hermetic_linux_sandbox` now fails the build when linux-sandbox is unsupported (10.0.0 only, [#32198](https://github.com/bazelbuild/bazel/pull/32198), merged 2026-10-30).
- UNCHANGED: `--remote_cache_compression` default false; `--experimental_remote_cache_ttl` default 3h.
- COULD NOT DETERMINE: exit 39 reachability, eviction_retries default, `--experimental_output_paths` default and help text.

# Findings per claim

| Claim | Verdict | Old text | New fact | Source and date |
|---|---|---|---|---|
| BZL-CACHE-12 eviction_retries default 5 | could not determine | "leave ... at its default of 5" | No release-note line in 8.8.1, 8.9.0, 9.3.0 or 10.0.0rc4 mentions this flag. Its @Option was not found in RemoteOptions.java at release-10.0.0, so its current default was not read. Treat as unchanged on 8.x and 9.x but re-measure on 9.3.0+ because rewinding now competes with the retry path. | [9.3.0 notes](https://github.com/bazelbuild/bazel/releases/tag/9.3.0), 2026-10-07 |
| exit 39 never observed; NN14 "both measured false on 8.7.0 and 9.2.0" | re-measure | no reachable shape | No documented reachable shape found. But 9.3.0 changes the default recovery path (rewinding), so the measured 9.2.0 behaviour does not transfer to 9.3.x. | same |
| `--rewind_lost_inputs` UNDOCUMENTED until 9.2.0 | changed | UNDOCUMENTED, absent from help | 9.3.0 "is now enabled by default. Builds with BwoB automatically recover from remote cache eviction by rewinding actions that generated lost inputs." Source at release-10.0.0 has `default: true`, help "Whether to use action rewinding to recover from lost inputs." (documentation category not read). The flip was reverted twice and relanded on 2026-09-30. 10.0.0rc4 labels it "[Incompatible]". | [#31416](https://github.com/bazelbuild/bazel/pull/31416) merged 2026-09-30; [BuildRequestOptions.java @ release-10.0.0](https://raw.githubusercontent.com/bazelbuild/bazel/release-10.0.0/src/main/java/com/google/devtools/build/lib/buildtool/BuildRequestOptions.java) |
| MAX_REPEATED_LOST_INPUTS = 20 hard-coded | changed | constant, byte-identical 8.7.0 to 9.2.0 | `--experimental_max_repeated_lost_inputs`, default 20, "0 fails on the first lost input", only effective with rewinding on. Backported to 8.9.0 (2026-11-19). The "#21" message text should be unchanged at default. | [#32354](https://github.com/bazelbuild/bazel/pull/32354) merged 2026-11-02 |
| BZL-CACHE-13 `--experimental_remote_cache_ttl` | unchanged | default 3h | Current CLI reference: default `3h`, tag `execution`. No release note touches it. | [command-line-reference](https://bazel.build/reference/command-line-reference) |
| BZL-CACHE-17 disk cache GC flags | changed | experimental | 10.0.0rc4: `--disk_cache_gc_idle_delay`, `_max_size`, `_max_age` "are no longer experimental". master defaults: 5m, 0, 0. 9.3.0 and 8.9.0: GC-deleted entries are cache misses. 10.0.0rc4 also: no digest verification on disk cache hit; `--disk_cache` without argument enables a default location. | [10.0.0rc4](https://github.com/bazelbuild/bazel/releases/tag/10.0.0rc4), 2026-11-19; [#31021](https://github.com/bazelbuild/bazel/pull/31021) |
| BZL-CACHE-28 chunking boolean | changed | default false, FastCDC only, server must advertise SplitBlob/SpliceBlob | Boolean still default false, tag experimental. 10.0.0rc4 notes it as newly added to 10.x; 8.8.0 added bounded parallel chunk transfers; 10.0.0rc4 adds parallel chunk transfer within a blob. | [10.0.0rc4](https://github.com/bazelbuild/bazel/releases/tag/10.0.0rc4); [8.8.0](https://github.com/bazelbuild/bazel/releases/tag/8.8.0) |
| BZL-CACHE-28 "no `_function` flag has ever shipped" | wrong | "never write ... chunking_function or rep_max_cdc" | `--experimental_remote_cache_chunking_function` exists on 8.9.0 ([#32385](https://github.com/bazelbuild/bazel/pull/32385)) and 10.0.0rc4; values `auto` (default, negotiates, prefers FastCDC 2020, falls back to RepMaxCDC), `fast_cdc_2020`, `rep_max_cdc`. Not on 8.8.x or 9.2.0 as measured. [#30585](https://github.com/bazelbuild/bazel/pull/30585) (the 8.8.0 cherry-pick of RepMaxCDC) is closed unmerged (closed 2026-08-05); the capability landed through a different PR. | 8.9.0 released 2026-11-19 |
| remote-apis SplitBlob/SpliceBlob | changed | not advertised by surveyed servers | remote-apis v2.12.0 carries the Split/Splice API (PRs 282, 357, rename to `split_blob_support`/`splice_blob_support` in 340). Release date shown only as "12 Feb"; the year was not confirmed, so whether it falls in the window is unknown. Server support (bazel-remote, Buildbarn, EngFlow) was not re-surveyed. | [remote-apis releases](https://github.com/bazelbuild/remote-apis/releases) |
| BZL-CACHE-30 compression default false | unchanged | default false | master default `false`. 10.0.0rc4 only reduces zstd upload size ([#32119](https://github.com/bazelbuild/bazel/pull/32119)); no default flip. | RemoteOptions.java on master |
| BZL-CACHE-26 silent local fallback | unchanged (not re-read) | `--remote_local_fallback` | master default `false`; no note in window. The measured cache-only silent fallback was not re-tested. | RemoteOptions.java on master |
| hermeticity: `--experimental_remote_repo_contents_cache` (8.8.0+) | unchanged boundary | 8.8.0+ | Boundary holds (8.8.0 notes). Now default false, tag loading_and_analysis; 10.0.0rc4: supports all reproducible repo rules, includes host OS/CPU in key. | 8.8.0 notes; 10.0.0rc4 |
| `--experimental_strict_repo_env` | unchanged | experimental | CLI reference: default false, tags loading_and_analysis, experimental. | command-line-reference |
| BZL-HERM-05 `--repo_env` help text verbatim | could not determine | verbatim help | Reference page shows "Specifies additional environment variables to be available only for repository rules." The verbatim sentence "see the full environment anyway" was not confirmed in the current text. 10.0.0rc4 adds `%bazel_workspace%` substitution in `--repo_env` values. Re-check help text on 9.3.x. | 10.0.0rc4 notes |
| aliased `--experimental_strict_action_env`, `--experimental_reuse_sandbox_directories` | could not determine | aliases | Not mentioned in any window release note. | none |
| BZL-ARCH-22 `--experimental_output_paths=strip` | could not determine | default off, highly experimental | Flag not read at source. 10.0.0rc4 notes: output path mapping for ArchivedTreeArtifacts, a lost-input fix under `strip`, and a legacy hardcoded list now needs opt-in. Re-measure value set and help on 9.3.x and 10.0. | 10.0.0rc4 |
| BZL-CC-31 `--experimental_use_hermetic_linux_sandbox` | changed (10.x only) | silent fallback implied | 10.0.0: build fails when linux-sandbox unsupported, previously silent fallback to processwrapper-sandbox. 10.0.0rc4 also: external repos not refetched when they feed the hermetic sandbox. Not on 8.9.0 or 9.3.x as far as notes show. | [#32198](https://github.com/bazelbuild/bazel/pull/32198) merged 2026-10-30 |
| BZL-CC-31 `--sandbox_base` | unchanged | | No note in window. | none |

# Normative guidance candidates

1. Rewrite BZL-CACHE-12 per version: on 8.x (incl. 8.9.0) rewinding is opt-in; on 9.3.0+ and 10.x it is on by default. Rationale: the baseline's "never set retries=0 believing rewind covers the gap" is now the default state. Verification: `bazel help build --long | grep -A3 rewind_lost_inputs` on the pin, then re-run the five-configuration eviction measurement on 9.3.3; exit codes and message text are the checks.
2. Replace "MAX_REPEATED_LOST_INPUTS hard-coded" with "20 by default, configurable via `--experimental_max_repeated_lost_inputs` from 8.9.0 and 10.0.0". Verification: `bazel help build --long | grep -A3 max_repeated_lost_inputs`; absent on 8.8.x, 9.2.x.
3. Rewrite BZL-CACHE-28: drop "no such flag has ever shipped"; keep "do not enable by default"; state the `_function` flag exists on 8.9.0+/10.0.0rc4+ with default `auto`. Verification: `bazel help build --long 2>&1 | grep -A4 remote_cache_chunking` per pin; a `_function` hit on 8.9.0+ is correct, on 8.8.x or 9.2.x is a non-release build.
4. Update BZL-CACHE-17: GC flags no longer experimental on 10.x; add that a concurrent-GC miss is no longer an error on 9.3.0 and 8.9.0. Verification: help grep per pin.
5. Add to BZL-CC-31: on 10.x the hermetic-sandbox flag fails instead of falling back; strip it from rc files used on hosts without user namespaces. Verification: `grep -n experimental_use_hermetic_linux_sandbox` over rc files plus a `bazel build` on the target host.
6. Reword the Gaps line: chunking is no longer a "durable absence" on the client side; the server-side survey stays open pending an actual server advertising split/splice.

# AI-agent angle

An agent trained before this window will say rewinding is off by default, that max repeated lost inputs is a constant, and that no chunking function flag exists. Smallest check: run the `bazel help build --long` grep per pin before quoting a default.

# Contested / evolving

- 10.0.0 is at rc4 as of 2026-11-19; every 10.x row is provisional until final.
- `--rewind_lost_inputs` default flip was reverted twice before landing; regression [#31805](https://github.com/bazelbuild/bazel/issues/31805) (disk cache hit with missing CAS blob) was reported against 9.3.0 and is closed; fix mapping not confirmed.
- Chunking remains experimental; interop depends on servers advertising the capability.

# Sources

| URL | What | Date |
|---|---|---|
| https://github.com/bazelbuild/bazel/releases (pages 1 to 3) | release list and dates | 2026-09 to 2026-11 |
| https://github.com/bazelbuild/bazel/releases/tag/9.3.0 | notes | 2026-10-07 |
| https://github.com/bazelbuild/bazel/releases/tag/8.9.0 | notes | 2026-11-19 |
| https://github.com/bazelbuild/bazel/releases/tag/8.8.0 | notes, baseline check | 2026-08-31 |
| https://github.com/bazelbuild/bazel/releases/tag/10.0.0rc4 | notes | 2026-11-19 |
| https://github.com/bazelbuild/bazel/pull/31416 | rewind default flip | 2026-09-30 |
| https://github.com/bazelbuild/bazel/pull/32354 | max repeated lost inputs | 2026-11-02 |
| https://github.com/bazelbuild/bazel/pull/32198 | hermetic sandbox failure | 2026-10-30 |
| https://github.com/bazelbuild/bazel/pull/30585 | RepMaxCDC cherry-pick, closed | 2026-08-05 |
| https://raw.githubusercontent.com/bazelbuild/bazel/master/src/main/java/com/google/devtools/build/lib/remote/options/RemoteOptions.java | option defaults | master |
| https://raw.githubusercontent.com/bazelbuild/bazel/release-10.0.0/src/main/java/com/google/devtools/build/lib/buildtool/BuildRequestOptions.java | rewind options | release-10.0.0 |
| https://bazel.build/reference/command-line-reference | CLI reference (first 100k chars only) | current |
| https://github.com/bazelbuild/remote-apis/releases | Split/Splice API | v2.12.0, year unconfirmed |
