---
title: rust-quality delta - runtime, filesystem and data crates
pair: rust-quality
date_researched: 2026-11-27
window_start: 2026-08-14
model: sonnet
sources_fetched: 34
---

# rust-quality delta: runtime, filesystem and data crates

Scope: this is a delta against the August 2026 baseline. Only claims in async.md, durable-state.md, performance.md, data-and-formats.md, platform-and-paths.md, package-manager-domain.md and cli-contract.md that name a crate behaviour were checked. Events dated 2026-08-01 or later count as in-window. Where a crate has had no release since before the window, that is stated, and the claim is "unchanged" on the strength of the current docs page, which was read.

## Summary

- Two changes need an edit: **jiff 1.0 has shipped** (1.0.0 on 2026-11-15) and **chrono is now flagged unmaintained** by RustSec (RUSTSEC-2026-0543, issued 2026-11-17). Both hit PLAT-30 and the corpus open question.
- Everything else the pair states about tokio, tokio-util, futures, tempfile, flate2, serde_json, toml_edit, memmap2, foldhash, fs-err, dunce, cap-std, directories and etcetera is unchanged in substance.
- One wording imprecision, not a time-driven change: STATE-9 says fs4 "renamed `lock_exclusive` to `try_lock`". fs4 1.0.0 (2026-04-22, before the window) renamed `lock_exclusive` to `lock` and `try_lock_exclusive` to `try_lock`, and changed `try_lock` to return `Result<(), TryLockError>`.
- `std::fs::File::lock` / `try_lock` are stable and fs4 1.x mirrors them, so the rule can name the std family as the first choice.
- parking_lot 0.13.0 shipped 2026-10-21 with a contention-performance improvement. The pinned "performance gap closed" decision is not contradicted by any source, but it is also not re-measured by this research.
- tokio 1.54.0 (2026-10-19) carries a use-after-free race in `Interval` (RUSTSEC-2026-0384, fixed in 1.54.1); `AsyncFd::new` family deprecated in 1.53.3 (RUSTSEC-2026-0386). Neither is a pair claim; both are useful guidance.

## Verdicts per claim

### 1. async.md

| Claim | Verdict | Evidence |
|---|---|---|
| ASYNC-07 cancel-safe / not-cancel-safe list from `select!` docs | unchanged | [tokio 1.54.1 select! docs](https://docs.rs/tokio/1.54.1/tokio/macro.select.html) still list `mpsc::Receiver::recv`, `broadcast::Receiver::recv`, `watch::Receiver::changed`, `TcpListener::accept` as cancel safe; `read_exact`, `read_to_end`, `read_to_string`, `write_all` as losing data; `Mutex::lock`, `RwLock::read`/`write`, `Semaphore::acquire` as losing queue position. The page says the lists are not exhaustive. |
| ASYNC-09 `JoinSet` / `TaskTracker` | unchanged | [JoinSet 1.54.1](https://docs.rs/tokio/1.54.1/tokio/task/struct.JoinSet.html) API is the same; [TaskTracker 0.7.20](https://docs.rs/tokio-util/0.7.20/tokio_util/task/task_tracker/struct.TaskTracker.html) is still documented with `CancellationToken` for graceful shutdown. tokio-util 0.7.20 (2026-10-09) changes nothing there ([changelog](https://github.com/tokio-rs/tokio/blob/master/tokio-util/CHANGELOG.md)). |
| ASYNC-13 `start_paused` / `advance` | unchanged, one note | [`time::advance` docs](https://docs.rs/tokio/1.54.1/tokio/time/fn.advance.html) unchanged. tokio 1.53.3 (2026-10-13) fixed "paused time auto-advancing when I/O wakes a task on `current_thread`" (#8595, [changelog](https://github.com/tokio-rs/tokio/blob/master/tokio/CHANGELOG.md)). A test that mixes paused time with real I/O on a `current_thread` runtime could have auto-advanced early before 1.53.3. Not a rule change; useful as a reason to be on >= 1.53.3. |
| ASYNC-18 runtime shutdown cannot cancel work already inside the blocking pool | unchanged | [`spawn_blocking` docs](https://docs.rs/tokio/1.54.1/tokio/task/fn.spawn_blocking.html): "runtime shutdown will wait indefinitely for all started spawn_blocking to finish running", `shutdown_timeout` "will still not cancel the tasks". A task that has not yet started can be cancelled. |
| ASYNC-15 `#[trait_variant::make(... : Send)]` | unchanged | [trait-variant 0.1.3](https://docs.rs/trait-variant/0.1.3/trait_variant/attr.make.html) (published 2026-07-22, before the window) still documents `#[trait_variant::make(Send)]` and the `LocalIntFactory` form that generates a second trait. Syntax in the rule is the documented one. |
| ASYNC-10 `backon` | unchanged | Latest release is 1.6.0 on 2025-10-18 ([crates.io](https://crates.io/crates/backon)); nothing in the window. Not flagged by RustSec (no page on rustsec.org). |
| Pinned decision "No `parking_lot`. The performance gap closed, and it silently drops poisoning." | unchanged, flag for re-check | parking_lot 0.13.0 on 2026-10-21: "Significantly improved `Mutex` and `RwLock` performance under contention", removed automatic eventual fairness, removed `hardware-lock-elision`, MSRV 1.95 ([CHANGELOG](https://github.com/Amanieu/parking_lot/blob/master/CHANGELOG.md)). No source here compares it with the current std futex mutex, so "the gap closed" is neither confirmed nor refuted. The changelog does not announce poisoning. The decision stands because it also rests on "never hold a guard across `.await`". Could not determine whether the gap reopened. |
| async-trait | unchanged | 0.1.92 on 2026-08-08 ([crates.io](https://crates.io/crates/async-trait)); no deprecation. Not read beyond version data. |
| futures-rs | unchanged | 0.3.34 on 2026-08-11 only preserves cloned waker identity and bumps `syn` to 3 ([CHANGELOG](https://github.com/rust-lang/futures-rs/blob/master/CHANGELOG.md)). `ready!` and `pin_mut!` were soft-deprecated in 0.3.32 (2026-02-15, before the window) in favour of `std::task::ready!` / `std::pin::pin!`. |

### 2. package-manager-domain.md PKG-22 and performance.md PERF-27

| Claim | Verdict | Evidence |
|---|---|---|
| PKG-22 `JoinSet::join_all()` panics on a `JoinError` and cancels the rest | unchanged | [JoinSet docs 1.54.1](https://docs.rs/tokio/1.54.1/tokio/task/struct.JoinSet.html): "If any tasks on the JoinSet fail with an JoinError, then this call to join_all will panic and all remaining tasks on the JoinSet are cancelled." Results come back in completion order. |
| PERF-27 drivers are opt-in on a hand-built builder | unchanged | [`Builder` 1.54.1](https://docs.rs/tokio/1.54.1/tokio/runtime/struct.Builder.html): `enable_all` is a shorthand for `enable_io` plus `enable_time` and "will include these future components"; `enable_io` is explicit. 1.54.0 made `enable_io` available whenever `rt` is enabled (#8387) and added `Builder::max_io_events_per_busy_tick`; neither makes drivers default-on. |

### 3. durable-state.md

| Claim | Verdict | Evidence |
|---|---|---|
| STATE-3 `persist` syncs neither contents nor directory | unchanged | [`NamedTempFile::persist` docs, tempfile 3.27.0](https://docs.rs/tempfile/3.27.0/tempfile/struct.NamedTempFile.html): "neither the file contents nor the containing directory are synchronized, so the update may not yet have reached the disk when persist returns." tempfile has had no release since 3.27.0 (2026-03-11, [CHANGELOG](https://github.com/Stebalien/tempfile/blob/master/CHANGELOG.md)). 3.27.0 deprecated `TempPath::from_path` in favour of `try_from_path`; the pair does not mention it. |
| STATE-9 "`fs4` renamed `lock_exclusive` to `try_lock`" | changed (wording, not in window) | Old text: "renamed `lock_exclusive` to `try_lock`". New fact: fs4 1.0.0 (2026-04-22) renamed `lock_exclusive` to `lock` and `try_lock_exclusive` to `try_lock`, matching `std::fs::File::lock` / `try_lock`, and made `try_lock` return `Result<(), TryLockError>` with `Err(TryLockError::WouldBlock)` instead of `Ok(false)`. fs4 1.1.0 (2026-04-28) unified the sync and async `FileExt` traits at the crate root and sealed them. Source: [fs4 CHANGELOG](https://github.com/al8n/fs4-rs/blob/main/CHANGELOG.md). The grep in STATE-9 matches `lock_exclusive(`, `lock_shared(`, `.try_lock(` so it still finds both spellings; the prose is what needs the fix. |
| std `File::lock` family as the alternative the rule may name | named by upstream | fs4 1.0.0 states its API now "match[es] the stabilized `std::fs::File::lock` API" and `std::fs::TryLockError`. Recommend STATE-9 say: prefer `std::fs::File::{lock, lock_shared, try_lock, try_lock_shared, unlock}`; use fs4 only for what std lacks (async wrappers, `allocate`, `statvfs`). The Rust release that stabilised the std family is stated in the fs4 text only as "1.89"; that figure comes from a code comment in the changelog, not a release note, so confirm against the Rust 1.89 release notes before writing it into a rule. |

### 4. performance.md

| Claim | Verdict | Evidence |
|---|---|---|
| PERF-18 flate2 features additive and resolve by priority; default `miniz_oxide` is the slowest documented option | unchanged | flate2 `Cargo.toml` on main: `default = ["rust_backend", "runtime_detection"]`, commented "default backend using pure Rust implementation via miniz_oxide"; the feature comment says only one backend should be enabled or the order is "`zlib-ng`, `zlib-rs`, `miniz_oxide` and which may change at any time". The default has **not** moved to zlib-rs. [flate2 README](https://github.com/rust-lang/flate2-rs/blob/main/README.md) still recommends `features = ["zlib-rs", "runtime_detection"], default-features = false` for maximum performance and calls zlib-rs "the fastest overall". New since baseline wording: `runtime_detection` became a default feature in 1.1.10 (2026-08-28) and `default-features = false` disables it, so a pinned-backend line should carry `runtime_detection` explicitly. flate2 1.1.11 (2026-11-06) is bug fixes only. zlib-rs 0.6.9 on 2026-11-24 ([crates.io](https://crates.io/crates/zlib-rs)); RUSTSEC-2024-0401 is the only advisory and predates the window. |
| PERF-19 foldhash "minimally DoS-resistant"; ahash slowdown | unchanged | [foldhash 0.2.0 docs](https://docs.rs/foldhash/0.2.0/foldhash/) (2025-08-23, no newer release) still say "fast, non-cryptographic, minimally DoS-resistant", and `FixedState` is "trivially vulnerable to HashDoS". ahash shipped 0.8.13, 0.7.9 (2026-11-23) and 0.8.14 (2026-11-25), a maintenance burst (typo fixes, getrandom 0.4, serde `no_std`), not a deprecation ([releases page](https://github.com/tkaitchuck/aHash/releases)); no RustSec unmaintained notice found. The rustc 1-4% slowdown figure was not re-measured. |
| PERF-12 memmap2 UB on concurrent truncation | unchanged, one nuance | memmap2 0.9.12 (2026-10-21) added `MmapOptions::map_if_safe()`, a **safe** constructor that returns a map only when the backing file is provably immutable (Linux/Android/FreeBSD sealed memfd with `F_SEAL_SHRINK` and `F_SEAL_WRITE`, or fs-verity) and `Ok(None)` otherwise ([CHANGELOG](https://github.com/RazrFalcon/memmap2-rs/blob/master/CHANGELOG.md), [docs](https://docs.rs/memmap2/0.9.12/memmap2/struct.MmapOptions.html)). Store and cache directories are plain multi-writer files, so `map_if_safe` returns `None` for them and the ban holds. 0.9.11 (2026-06-22, before the window) fixed unsound pointer arithmetic in `advise_range`/`flush_range` ([RUSTSEC-2026-0186](https://rustsec.org/advisories/RUSTSEC-2026-0186.html), patched >= 0.9.11). |

### 5. data-and-formats.md

| Claim | Verdict | Evidence |
|---|---|---|
| DATA-DET-03 `serde_json` `preserve_order` flips map to insertion order | unchanged | serde_json `Cargo.toml` on master: `preserve_order = ["indexmap", "alloc", "dep:foldhash"]`, doc comment "preserving the order of map keys". The default map is still `BTreeMap`. New fact: `preserve_order` now pulls the optional `foldhash` dependency (used for `no_std` hashing, see `src/map.rs`); the date of that change was not determined. serde_json 1.0.152-1.0.154 landed 2026-10-10/11 ([releases](https://github.com/serde-rs/json/releases), 1.0.152 fixes `-0` in `arbitrary_precision`). The `cargo tree -e features -i serde_json` check is unaffected. |
| `serde_repr` | unchanged | 0.1.21 on 2026-07-18, before the window ([crates.io](https://crates.io/crates/serde_repr)). Behaviour text not re-read; could not determine more. |
| DATA-FMT-10 `toml_edit` for hand-authored + tool-rewritten files | unchanged | Releases 0.25.13 to 0.25.21 (2026-07-14 to 2026-11-25) are performance work and stack-overflow fixes on parse; all carry `+spec-1.1.0` ([CHANGELOG](https://github.com/toml-rs/toml/blob/main/crates/toml_edit/CHANGELOG.md)). Comment preservation is unchanged. |

### 6. platform-and-paths.md

| Claim | Verdict | Evidence |
|---|---|---|
| PLAT-30 chrono is pinned; exactly one datetime crate | **changed** | Old text: chrono is the one datetime crate; adding `time` or `jiff` is a bans finding. New facts: (a) [RUSTSEC-2026-0543](https://rustsec.org/advisories/RUSTSEC-2026-0543.html), "chrono is unmaintained", type INFO, all versions affected, no patched version, reported 2026-09-14, issued 2026-11-17, recommended alternatives `jiff` and `time`; tracked at [chronotope/chrono#1768](https://github.com/chronotope/chrono/issues/1768). (b) chrono's last release is 0.4.45 on 2026-06-04 ([crates.io](https://crates.io/crates/chrono)). (c) Many downstream projects now add the advisory to `cargo-deny` ignore lists (comments on the issue dated 2026-11-19). The rule's core is still right (one crate, one serde representation); the pinned choice and its rationale need to be re-decided. |
| Corpus open question: "If jiff ships 1.0 ... re-evaluate" | **YES, the trigger has fired** | jiff **1.0.0 shipped 2026-11-15**; 1.0.1 (2026-11-17), 1.0.2 (2026-11-21), 1.0.3 (2026-11-24) are bug fixes. The release note commits to "an indefinite commitment to 1.x.y". Breaking changes from 0.2: `Zoned` renamed to `ZonedDateTime` (and `Timestamp::to_zoned` to `to_zoned_datetime`), `Timestamp` to `SystemTime` conversions are fallible, `impl Sub for Timestamp` returns `SignedDuration`, `ToSpan` sealed, MSRV 1.85 ([jiff CHANGELOG](https://github.com/BurntSushi/jiff/blob/master/CHANGELOG.md)). The open question's own condition has a second half, "a lockfile schema bump is happening for another reason"; that half is a project fact this research cannot read. 1.0.1 and 1.0.2 fixed parser out-of-bounds and panic bugs within a week of 1.0, so a migration should wait for a quiet patch cycle. |
| PLAT-10 `fs-err` adds no Windows rename or durability logic | unchanged | fs-err 3.3.1 (2026-07-03, before the window) and 3.3.2 (2026-10-04) only fix a feature flag and reword error messages (`metadata`, paths in backticks) ([CHANGELOG](https://github.com/andrewhickman/fs-err/blob/main/CHANGELOG.md)). 3.3.0 added Unix `os::unix::fs` wrappers and 3.2.2 added `set_times`; still thin wrappers. |
| PLAT-05/06 `dunce` conditional rewrite | unchanged | dunce 1.0.5 (2024-08-04) is still the latest ([crates.io](https://crates.io/crates/dunce)); [docs 1.0.5](https://docs.rs/dunce/1.0.5/dunce/) read. No release in the window, no RustSec notice found. |
| PLAT-40, TEST-28, SEC-10 cap-std Windows component walk | unchanged, one note | cap-std 4.0.3 and 3.4.6 were both published 2026-08-20 (in window). Diffing the `cap-primitives` 4.0.2 and 4.0.3 crate sources (static.crates.io) shows one functional change: in `fs/manually/open.rs` the manual component walk no longer re-appends a trailing `/` when opening the last component; everything else is `Cargo.toml` and import ordering. No upstream release note was found, so the intent is inferred from the diff. The "walk component by component against open handles" claim is unaffected. The rest of the diff was not exhaustive over sibling crates (`cap-std`, `cap-fs-ext`, `cap-tempfile`); could not determine whether those changed. |
| PLAT-24 and CLI-13 `directories` / `etcetera` | unchanged | directories 6.0.0 (2025-01-12) and etcetera 0.11.0 (2025-10-28) are still latest ([crates.io](https://crates.io/crates/directories), [etcetera docs](https://docs.rs/etcetera/0.11.0/etcetera/)); the only RustSec entry for `directories` (RUSTSEC-2020-0054, "unmaintained, use directories-next") is marked **withdrawn** ([advisory](https://rustsec.org/advisories/RUSTSEC-2020-0054.html)). Neither crate has had a release in the window, so "deprecated" is not claimed; low release cadence is worth a note. |

## Findings on deprecation and maintenance status

- **chrono: unmaintained** (RUSTSEC-2026-0543, issued 2026-11-17). Only crate in the pair flagged this way.
- **tokio**: not deprecated; but 1.54.0 is a bad pin ([RUSTSEC-2026-0384](https://rustsec.org/advisories/RUSTSEC-2026-0384.html), `Interval` race, fixed in 1.54.1), and `AsyncFd::{new, with_interest, try_new, try_with_interest}` were deprecated in 1.53.3 for I/O-safety reasons ([RUSTSEC-2026-0386](https://rustsec.org/advisories/RUSTSEC-2026-0386.html)). The pair does not name `AsyncFd`.
- No other crate in the commission is marked deprecated or unmaintained on RustSec. rustsec.org returned no package page (404) for ahash, dunce, etcetera, fs4, backon, trait-variant, parking_lot, fs-err, async-trait, serde_repr, cap-std, tempfile, flate2, foldhash, serde_json, jiff, toml_edit, tokio-util and futures. A missing page means no advisory is filed, not that the crate is healthy.

## Normative guidance candidates

1. **PLAT-30 rewrite: name the datetime decision as open, not as "chrono is pinned".** Rule: "Exactly one datetime crate in the graph. chrono is flagged unmaintained (RUSTSEC-2026-0543); a project still on chrono records the cargo-deny ignore with the advisory id and a review date, and a new project starts on jiff >= 1.0.3." Rationale: the rule's reason (one serde representation per lockfile field) survives, its choice of chrono does not. Verification: `cargo deny check advisories` shows the RUSTSEC id acknowledged in `deny.toml` `[advisories] ignore` with a reason; `cargo tree -e normal -d | grep -E 'chrono|jiff|time'` lists exactly one family.
2. **Corpus open question: close the jiff trigger.** Replace "If jiff ships 1.0 ..." with "jiff 1.0 shipped 2026-11-15; migrate only as one reviewed change alongside a lockfile schema bump, after 1.0.x settles." Verification: reading heuristic, the open-questions section has no sentence in the future tense about jiff 1.0.
3. **STATE-9: fix the fs4 rename sentence and name std first.** Rule: "Lock with `std::fs::File::lock` / `try_lock` (stable); use fs4 1.x only for async wrappers, `allocate` or `statvfs`. fs4 1.0 renamed `lock_exclusive` to `lock` and `try_lock_exclusive` to `try_lock`." Rationale: the current sentence misstates which method became which and an agent trained on pre-1.0 fs4 writes `lock_exclusive`. Verification: `grep -rnE 'lock_exclusive\(|try_lock_exclusive\(' --include='*.rs'` returns nothing on a project using fs4 >= 1.0; `try_lock` call sites match on `TryLockError::WouldBlock`, not on `Ok(false)`.
4. **PERF-18: add `runtime_detection` to the pinned-backend example.** Rule: "Pinned flate2 features list the backend and `runtime_detection` together with `default-features = false`." Rationale: since flate2 1.1.10 (2026-08-28) `runtime_detection` is a default feature; turning defaults off silently drops CPU-feature detection and slows zlib-rs. Verification: `cargo tree -e features -i flate2` shows `runtime_detection`; `grep -n 'flate2' Cargo.toml` shows both names.
5. **Dependency floor: tokio >= 1.54.1 and not 1.54.0.** Rule: "Lockfile tokio is not 1.54.0." Rationale: RUSTSEC-2026-0384 use-after-free in `Interval` on the multi-thread runtime. Verification: `cargo audit` or `cargo deny check advisories`; `cargo tree -i tokio` shows >= 1.54.1 (or a 1.51.6 / 1.53.3 LTS-style patch line for the AsyncFd fix).
6. **PERF-12: one-clause nuance.** Keep the ban; add "`MmapOptions::map_if_safe` (memmap2 0.9.12) is the only acceptable mmap and only for files a sealed memfd or fs-verity makes immutable; the store and cache never qualify." Verification: `grep -rn 'map_if_safe\|Mmap::map' --include='*.rs'` has zero hits outside a justified, commented site.

## AI-agent angle

- An agent trained before April 2026 writes `file.lock_exclusive()?` and `if file.try_lock_exclusive()? { ... }` for fs4. Both fail to compile on fs4 1.x. Check: `cargo check` after the grep in candidate 3.
- An agent will "fix" a chrono advisory by adding `time` next to chrono. That breaks PLAT-30. Check: `cargo tree -e normal -d`.
- An agent migrating to jiff from older docs writes `Zoned`, `Timestamp::to_zoned`, `SystemTime::from(ts)`. All changed in 1.0. Check: `cargo check`; grep `Zoned\b` and `to_zoned\(`.
- An agent reading flate2's README might drop `default-features = false` handling and lose `runtime_detection`. Check: candidate 4's two commands.

## Contested / evolving

- **jiff vs chrono (as of 2026-11-27):** jiff 1.0 stable, chrono unmaintained and RustSec-flagged, a community offer to take over chrono maintenance exists on issue 1768 but nothing was reported as agreed. Trend is toward jiff.
- **parking_lot vs std mutex:** parking_lot 0.13.0 narrowed its own contention cost in October; whether it beats the std futex mutex is unmeasured here. The pair's decision (no parking_lot) should be treated as a policy, not a benchmark result, until someone measures.
- **std `File::lock` vs fs4:** the ecosystem crate now mirrors std; trend is toward std for the basic lock.
- **flate2 default backend:** still `miniz_oxide`; the README and Cargo.toml comments present zlib-rs as the recommended performance choice, and the priority order is declared unstable.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://github.com/BurntSushi/jiff/blob/master/CHANGELOG.md | jiff changelog | 1.0.0 on 2026-11-15, 1.0.3 on 2026-11-24 | Decides the jiff 1.0 trigger (primary) |
| https://rustsec.org/advisories/RUSTSEC-2026-0543.html | chrono unmaintained advisory | issued 2026-11-17 | Only unmaintained flag found (primary) |
| https://github.com/chronotope/chrono/issues/1768 | chrono maintenance issue | open since before 2026-08-02, activity to 2026-11-19 | Maintainer state and downstream reaction |
| https://crates.io/crates/chrono | version history | 0.4.45 on 2026-06-04 | No release in window |
| https://github.com/Amanieu/parking_lot/blob/master/CHANGELOG.md | parking_lot changelog | 0.13.0 on 2026-10-21 | Contention change, fairness removed (primary) |
| https://github.com/al8n/fs4-rs/blob/main/CHANGELOG.md | fs4 changelog | 1.0.0 2026-04-22, 1.1.0 2026-04-28 | Exact rename and signature change (primary) |
| https://docs.rs/tempfile/3.27.0/tempfile/struct.NamedTempFile.html | NamedTempFile docs | tempfile 3.27.0, 2026-03-11 | `persist` sync statement (primary) |
| https://github.com/Stebalien/tempfile/blob/master/CHANGELOG.md | tempfile changelog | to 3.27.0 | No in-window release |
| https://github.com/rust-lang/flate2-rs/blob/main/Cargo.toml | flate2 features | main, 2026-11 | Default backend and priority order (primary) |
| https://github.com/rust-lang/flate2-rs/blob/main/README.md | flate2 README | 1.1.10+ | Backend recommendation, `runtime_detection` |
| https://github.com/rust-lang/flate2-rs/blob/main/CHANGELOG.md | flate2 changelog | 1.1.11 on 2026-11-06 | Bug fixes only |
| https://github.com/tokio-rs/tokio/blob/master/tokio/CHANGELOG.md | tokio changelog | 1.53.1 to 1.54.1, 2026-07 to 2026-10 | In-window runtime changes (primary) |
| https://github.com/tokio-rs/tokio/blob/master/tokio-util/CHANGELOG.md | tokio-util changelog | 0.7.20 on 2026-10-09 | No TaskTracker change |
| https://docs.rs/tokio/1.54.1/tokio/macro.select.html | select! docs | 1.54.1 | Cancel-safety lists (primary) |
| https://docs.rs/tokio/1.54.1/tokio/task/struct.JoinSet.html | JoinSet docs | 1.54.1 | `join_all` panic text (primary) |
| https://docs.rs/tokio/1.54.1/tokio/task/fn.spawn_blocking.html | spawn_blocking docs | 1.54.1 | Shutdown does not cancel started blocking work |
| https://docs.rs/tokio/1.54.1/tokio/runtime/struct.Builder.html | runtime Builder docs | 1.54.1 | Driver opt-in |
| https://docs.rs/tokio/1.54.1/tokio/time/fn.advance.html | time::advance docs | 1.54.1 | Paused-time semantics |
| https://docs.rs/tokio-util/0.7.20/tokio_util/task/task_tracker/struct.TaskTracker.html | TaskTracker docs | 0.7.20 | Graceful-shutdown role |
| https://rustsec.org/advisories/RUSTSEC-2026-0384.html | tokio Interval race | 2026-10-22 | Version to avoid |
| https://rustsec.org/advisories/RUSTSEC-2026-0386.html | tokio AsyncFd I/O safety | 2026-10-23 | Deprecation context |
| https://rustsec.org/advisories/RUSTSEC-2026-0186.html | memmap2 unsound offsets | 2026-06-22 | memmap2 soundness history |
| https://rustsec.org/advisories/RUSTSEC-2020-0054.html | directories advisory | withdrawn | Not a live deprecation |
| https://github.com/RazrFalcon/memmap2-rs/blob/master/CHANGELOG.md | memmap2 changelog | 0.9.12 on 2026-10-21 | `map_if_safe` (primary) |
| https://docs.rs/memmap2/0.9.12/memmap2/struct.MmapOptions.html | MmapOptions docs | 0.9.12 | Conditions for `map_if_safe` |
| https://docs.rs/foldhash/0.2.0/foldhash/ | foldhash docs | 0.2.0, 2025-08-23 | DoS-resistance wording (primary) |
| https://github.com/tkaitchuck/aHash/releases | ahash releases | 0.8.13 to 0.8.14, 2026-11 | Maintenance, not deprecation |
| https://github.com/serde-rs/json/blob/master/Cargo.toml | serde_json manifest | master, 2026-11 | `preserve_order` feature definition |
| https://github.com/toml-rs/toml/blob/main/crates/toml_edit/CHANGELOG.md | toml_edit changelog | 0.25.13 to 0.25.21 | No comment-preservation change |
| https://github.com/andrewhickman/fs-err/blob/main/CHANGELOG.md | fs-err changelog | 3.3.2 on 2026-10-04 | Still thin wrappers |
| https://static.crates.io/crates/cap-primitives/cap-primitives-4.0.3.crate | cap-primitives crate source, diffed against 4.0.2 | 2026-08-20 | Only functional change in the 4.0.3 release |
| https://docs.rs/trait-variant/0.1.3/trait_variant/attr.make.html | trait-variant docs | 0.1.3 | `make(Send)` syntax |
| https://github.com/rust-lang/futures-rs/blob/master/CHANGELOG.md | futures changelog | 0.3.34 on 2026-08-11 | No behaviour claim affected |
| https://docs.rs/etcetera/0.11.0/etcetera/ and https://docs.rs/dunce/1.0.5/dunce/ | etcetera and dunce docs | 0.11.0 / 1.0.5 | Unchanged path crates |
| https://crates.io/api/v1/crates/{tokio,tokio-util,futures,trait-variant,async-trait,parking_lot,backon,tempfile,fs4,flate2,zlib-rs,serde_json,serde_repr,toml_edit,jiff,chrono,fs-err,dunce,cap-std,directories,etcetera,memmap2,foldhash,ahash} | crates.io version index | read 2026-11-27 | Release dates used throughout |
