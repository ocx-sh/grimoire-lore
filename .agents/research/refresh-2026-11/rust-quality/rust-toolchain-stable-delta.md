---
title: Stable Rust toolchain delta, 2026-08-14 to 2026-11-27, for rust-quality
pair: rust-quality
date_researched: 2026-11-27
window_start: 2026-08-14
model: sonnet
sources_fetched: 22
---

# Stable Rust delta for rust-quality (delta update)

This is a delta against rules/rust-quality.md and skills/rust-quality-reference/. Anything that upstream did not change stays as written. Dates are upstream dates. Method: the full RELEASES.md was downloaded and grepped locally (944,973 bytes, 16,576 lines), then tracking issues, the 1.98 to 1.100 release posts, the stable std docs and the current std source on master were fetched. No claim comes from memory or from a search snippet.

## Summary

- Step 0 resolved. Stable on 2026-08-14 was 1.97.1 (2026-07-16). Stable on 2026-11-27 is 1.100.1 (released the same day). Six stable releases fall in the window, listed below.
- The corpus frame "current as of Rust 1.89 ... August 2026" is wrong in its version label. 1.89.0 shipped 2025-08-07. The frame should read "Rust 1.97, August 2026" at the baseline, and "Rust 1.100, November 2026" after this update. Between 1.89 and 1.97 there are eight further releases that the baseline never covered, and the claims below were checked against them as well, not only against the window.
- Every claim at risk is unchanged. No grep of RELEASES.md from 1.88 through 1.100.1 finds `gen` blocks, `nonpoison`, `AsyncDrop`, `error_generic_member_access`/`provide`, `doc_cfg`/`auto_cfg` stabilization, dyn-compatible `async fn`, `#[bench]`, `unix_sigpipe`, or a 2027 edition.
- Movement that does matter: `doc_cfg` has a stabilization PR (open, blocked, no FCP), `error_generic_member_access` had its stabilization-direction FCP cancelled on 2026-02-26, `#[bench]` has a stated direction away from the eRFC, and `unix_sigpipe` is being replaced by an externally implementable item. All are still unstable. These need no text change, but DOC-12 and PERF-06 gain a dated reason.
- The Since column needs no corrected value. Every value was confirmed against RELEASES.md headings.
- Two optional extensions: `LazyLock::get`/`get_mut`/`force_mut` (1.94) and the never type plus `core::mem::DropGuard` (1.100). One real wording risk: the never type changes the fallback to `!` on all editions in 1.100.

## Step 0: version timeline (RELEASES.md)

Source: [RELEASES.md on master](https://raw.githubusercontent.com/rust-lang/rust/master/RELEASES.md), headings read locally.

| Version | Date | In window |
|---|---|---|
| 1.89.0 | 2025-08-07 | no (the corpus label) |
| 1.90.0 | 2025-09-18 | no |
| 1.91.0 / 1.91.1 | 2025-10-30 / 2025-11-10 | no |
| 1.92.0 | 2025-12-11 | no |
| 1.93.0 / 1.93.1 | 2026-01-22 / 2026-02-12 | no |
| 1.94.0 / 1.94.1 | 2026-03-05 / 2026-03-26 | no |
| 1.95.0 | 2026-04-16 | no |
| 1.96.0 / 1.96.1 | 2026-05-28 / 2026-06-30 | no |
| 1.97.0 / 1.97.1 | 2026-07-09 / 2026-07-16 | no. 1.97.1 is the stable on 2026-08-14 |
| **1.98.0** | 2026-08-20 | yes |
| **1.98.1** | 2026-09-03 | yes (fixes a vtable miscompilation) |
| **1.99.0** | 2026-10-01 | yes |
| **1.99.1** | 2026-10-15 | yes (wcslen on UEFI, FFI `bool` return miscompilation on x86_64, rust-lld rpath on macOS) |
| **1.100.0** | 2026-11-12 | yes |
| **1.100.1** | 2026-11-27 | yes. Stable on 2026-11-27 (fixes an `Iterator` inference regression, [rust#166229](https://github.com/rust-lang/rust/issues/166229)) |

The cadence is six weeks, with point releases between.

## Claims at risk

| # | Claim in pair | Status | Detail |
|---|---|---|---|
| 1 | current-apis.md header "Correct in 2026" and Since column (ed. 2024, 1.75, 1.80, 1.81, 1.82, 1.85, 1.87, 1.88) | unchanged | See "Since column" below. All eight values confirmed. The header is still true at 1.100. |
| 2 | `gen { … }` "still unstable"; agent-failure item 6 | unchanged | [rust#117078](https://github.com/rust-lang/rust/issues/117078) is open, "Stabilization PR" unchecked, two soundness issues listed (#159443, #161026), latest event 2026-08-08 (title edit adding `gen_blocks`). Not in any release note 1.88 to 1.100.1. |
| 3 | LazyLock poisoning "unrecoverable ... no `PoisonError::into_inner`"; STATE-17 | unchanged, extended | The [stable LazyLock page](https://doc.rust-lang.org/stable/std/sync/struct.LazyLock.html) still says "poisoning in `LazyLock` is _unrecoverable_" and contrasts `std::sync::poison::Mutex` recovery via `PoisonError::into_inner()`. New since 1.94.0 (2026-03-05): `LazyLock::get`, `get_mut`, `force_mut`; per the docs page `get`/`get_mut` return `None` on a poisoned lock, which observes poison without panicking but does not clear it. 1.96.0 added `From<T> for LazyLock<T, F>`. `LazyLock::into_inner` is still nightly (`lazy_cell_into_inner`, [rust#125623](https://github.com/rust-lang/rust/issues/125623)). |
| 4 | STATE-12 "no stable `AsyncDrop`" | unchanged | [rust#126482](https://github.com/rust-lang/rust/issues/126482) is open, still gated by `#![feature(async_drop)]`, stabilization PR unchecked. Comment of 2026-07-14: the `dyn Trait` case is not handled yet. Extension: 1.100.0 stabilized `core::mem::DropGuard` (closure on drop, `dismiss` for rollback), a synchronous drop-guard that fits STATE-12's "Drop is a sync backstop" stance. |
| 5 | STATE-16 poisoning defaults; research open question about a non-poisoning Mutex | unchanged | The [stable std::sync index](https://doc.rust-lang.org/stable/std/sync/index.html) lists `nonpoison` and `poison` modules, both marked Experimental, and no stable non-poisoning Mutex. Tracking issue [rust#134645](https://github.com/rust-lang/rust/issues/134645) is open, FCP and stabilization PR unchecked. It is active: nominated for libs 2026-11-13, demoted to I-libs-radar 2026-11-24, comments up to 2026-11-26. Revisit trigger not yet met. Note that std docs now spell the poisoning type path `std::sync::poison::Mutex` while `std::sync::Mutex` remains the stable name. |
| 6 | errors.md item 9, `Error::provide()`/`#[backtrace]` nightly-only behind `error_generic_member_access` | unchanged | [rust#99301](https://github.com/rust-lang/rust/issues/99301) open. A merge-disposition FCP was cancelled by Amanieu on 2026-02-26 because libs-api prefers a language-level solution via trait-object casting (RFC 3885). T-libs-api label removed 2026-08-12. Linked PR #150074 is open. This makes stabilization less likely in the near term, so the claim is safer, not weaker. |
| 7 | DOC-12 `#[doc(cfg(...))]`/`#[doc(auto_cfg)]` "both are still nightly-gated" | unchanged, dated | [rust#43781](https://github.com/rust-lang/rust/issues/43781) is open, B-unstable. The stabilization PR [rust#150055](https://github.com/rust-lang/rust/pull/150055) ("Stabilize `doc_cfg` feature", opened 2025-12-16) is open, labelled `needs-fcp` and `S-blocked`, no FCP started. On 2026-11-02 S-waiting-on-review was removed. `doc_auto_cfg` has no separate gate any more, it was folded into `doc_cfg`. Stable 1.99.0 changed two adjacent behaviours: "Do not take `doc(cfg())` into account when filtering doctests" ([rust#159014](https://github.com/rust-lang/rust/pull/159014)) and "Warn if an invalid `doc` attribute is used on a macro invocation" ([rust#161003](https://github.com/rust-lang/rust/pull/161003)). Neither stabilizes the attribute. |
| 8 | ASYNC-14, ARCH-10, `#[async_trait]` row: native `async fn` in traits "not dyn-compatible" | unchanged | The 2026 project goal ["Box notation for dyn async trait"](https://goals.rust-lang.org/2026/afidt-box.html) is Accepted, timespan 2026-2027. The 2026 target is to settle a design, not to stabilize. The proposed `std::preview::dyn_box!` helper is nightly only. 1.100.0 lists only "Check dyn-compatibility of trait objects in more places" as a compatibility note, which is a tightening, not a relaxation. The goal page carries no update date. |
| 9 | PERF-06 `#[bench]` "nightly-only since 2015 with no stabilization path" | unchanged, wording nuance | [rust#50297](https://github.com/rust-lang/rust/issues/50297) says there is "no plan/RFC for stabilizing". `#[bench]` was destabilized in 2025 (PR #134273, rollup May 2025). On 2026-11-02 epage pinned a comment: direction is custom harnesses through Cargo `harness = false` (libtest-mimic style), not the eRFC approach, see [rust#125418](https://github.com/rust-lang/rust/issues/125418). "Since 2015" is loosely true; the nuance is that the project is now moving away from the in-tree bench path altogether. |
| 10 | CLI-05 "Rust sets `SIGPIPE` to `SIG_IGN` before `main`" | unchanged | Current master `library/std/src/sys/pal/unix/mod.rs`: `sigpipe::DEFAULT => (false, Some(libc::SIG_IGN))`, comment "Use `-Zon-broken-pipe=...` to alter this". [rust#97889](https://github.com/rust-lang/rust/issues/97889) status update by Enselic on 2026-03-02: the current implementation is the compiler flag `-Zon-broken-pipe`; the plan is to remove the flag and use an externally implementable item `#[std::io::on_broken_pipe]`, tracked by #150588 with draft PR #150591 blocked by #151271. No stabilization, no default change. The attribute `#[unix_sigpipe]` no longer exists, only the unstable flag. Do not recommend either in rules. |
| 11 | SEC-37 `text_direction_codepoint_in_{comment,literal}` deny-by-default, lex time only | unchanged for "deny-by-default"; "lex time" not re-verifiable | The [rustc deny-by-default list](https://doc.rust-lang.org/stable/rustc/lints/listing/deny-by-default.html) (52 lints) still contains both. The docs describe the lints but never state when they run, and the lints.rs fetch returned 404. The "lex time" half of the claim stays as the baseline research had it. Verdict: could not determine for lex-time, no evidence of change. |
| 12 | PLAT-18/39/35 std `is_symlink` surrogate bit, `read_link` only SYMLINK and MOUNT_POINT, `rename` fallback | unchanged, one nuance | Current master [library/std/src/sys/fs/windows.rs](https://raw.githubusercontent.com/rust-lang/rust/master/library/std/src/sys/fs/windows.rs) (read in full locally): `is_reparse_tag_name_surrogate = reparse_tag & 0x20000000 != 0` and `is_symlink = is_reparse_point && is_reparse_tag_name_surrogate` (lines 1207-1212); `readlink` matches only `IO_REPARSE_TAG_SYMLINK` and `IO_REPARSE_TAG_MOUNT_POINT`, else "Unsupported reparse point type" (lines 717-746); `rename_inner` calls `MoveFileExW` first and on `WinError::ACCESS_DENIED` falls back to `SetFileInformationByHandle` with `FileRenameInfoEx` (lines 1329-1334). Nuance for PLAT-35: `rename` passes `MOVEFILE_REPLACE_EXISTING` plus `FILE_RENAME_FLAG_REPLACE_IF_EXISTS | FILE_RENAME_FLAG_POSIX_SEMANTICS` for the fallback, and the file also has a `rename_noreplace` helper (no `MOVEFILE_REPLACE_EXISTING`, POSIX semantics). Whether `rename_noreplace` is publicly exposed was not determined. The commit history page returned empty and the GitHub API was rate limited, so the exact date of each change in the window could not be established; the source state is what is verified. |
| 13 | Next edition (2027) needing a new current-apis row | unchanged, no new row | No edition guide chapter for 2027 exists (the guide URL returned 404). No release note or post in 1.98 to 1.100 mentions it. The only discussion found is a community thread ([internals, auto-closed 2026-09-03](https://internals.rust-lang.org/t/we-have-only-two-years-to-prepare-the-rust-2027-edition/22494), last post 2025-03-12) with no edition-team decision. Do not add a row. |

## Since column: exact values

No correction is needed. Verified headings in RELEASES.md:

| Row | Claimed | RELEASES.md evidence |
|---|---|---|
| native `async fn` in traits | 1.75 | `Version 1.75.0 (2023-12-28)` heading present (line 3404; the stabilization line itself was not separately grepped) |
| `LazyLock` | 1.80 | 1.80.0 (2024-07-25), `force` stable 1.80.0 per std docs |
| `#[expect]` | 1.81 | "Stabilize `#[expect]` for lints (RFC 2383)" under 1.81.0 (2024-09-05) |
| `use<...>` free fns | 1.82 | "Stabilize `+ use<'lt>` opaque type precise capturing (RFC 3617)" under 1.82.0 (2024-10-17) |
| async closures, `set_var` unsafe | 1.85 | "Stabilize async closures" under 1.85.0 (2025-02-20) |
| `use<...>` in RPITIT | 1.87 | "Stabilize `feature(precise_capturing_in_traits)`" under 1.87.0 (2025-05-15) |
| let chains, 2024 only | 1.88 | "Stabilize `#![feature(let_chains)]` in the 2024 edition" under 1.88.0 (2025-06-26). 1.95.0 later changed only the `irrefutable_let_patterns` lint to ignore let chains. |

The Since value for the LazyLock poisoning row stays 1.80. The version-frame text in edition-2024-and-stale-api-recall.md ("Rust 1.89 ... August 2026") should read "Rust 1.97, August 2026" at the baseline date, or simply be re-stamped "Rust 1.100, November 2026" by this refresh.

## Normative guidance candidates

All optional. Nothing in the pair is falsified, so there are no mandatory edits.

1. **Candidate: re-stamp the frame.** In current-apis.md and the research frame, replace any "1.89 / August 2026" label with "1.100, November 2026". Rationale: the label contradicts the release dates and misleads an agent about what "stable" means. Verification: `grep -rn "1\.89" rules/rust-quality.md skills/rust-quality-reference/` returns no hit that presents 1.89 as current.
2. **Candidate: LazyLock row extension (SHOULD, current-apis.md).** After "unrecoverable", add: `LazyLock::get`/`get_mut` (1.94) return `None` on a poisoned lock, so a fallible-init global is read with `get` and never retried; there is still no recovery. Rationale: agents will otherwise propose `into_inner` (nightly) or `force_mut` as a poison fix. Verification: reviewer greps `LazyLock::new(` closures for `unwrap`/`expect`/`?`-like fallibility; a fallible init uses `OnceLock::get_or_try_init` (nightly) or an explicit init function instead.
3. **Candidate: never type row (CONSIDER, current-apis.md).** `Result<T, Infallible>` becomes `Result<T, !>`-compatible: `Infallible` is an alias of `!` since 1.100.0 (2026-11-12, [post](https://blog.rust-lang.org/2026/11/12/Rust-1.100.0/)), and the never-type fallback changes from `()` to `!` on all editions. Rationale: the fallback change can alter inference in old code; agents trained before 1.100 write `Infallible` and `-> !` workarounds. Verification: `grep -rn "Infallible" --include=*.rs`, review each hit; run the suite on 1.100 before bumping the MSRV.
4. **Candidate: DropGuard mention (CONSIDER, durable-state.md STATE-12).** Name `core::mem::DropGuard` (1.100) as the std form of a rollback-on-drop guard, with `dismiss()` on success. Rationale: agents hand-roll `struct Guard(Option<F>)`. Verification: grep for hand-written structs whose only `Drop` impl calls a stored closure.
5. **Candidate: DOC-12 dated reason (no behaviour change).** Append "stabilization PR rust#150055 is open and blocked as of 2026-11-02" so the reviewer knows when to re-check. Verification: check the `F-doc_cfg` label on rust#43781 at each refresh; the rule can relax only when a release note lists `doc_cfg`.
6. **Candidate: STATE-16 re-check hook.** Keep the rule. Add to the refresh checklist: grep RELEASES.md for `nonpoison`; stabilize signal is a FCP on rust#134645. Verification: `grep -n -i nonpoison RELEASES.md` returns nothing today.

## AI-agent angle

- Writing "current as of Rust 1.89" is a model that thinks in its training cutoff. The check is the RELEASES.md heading date, not the version number in the prose.
- An agent will propose `#![feature(doc_cfg)]` or `#[cfg_attr(docsrs, doc(auto_cfg))]` because docs.rs pages show badges. Catch: DOC-12's grep for `doc\(cfg` and `doc\(auto_cfg`.
- An agent will propose `#[unix_sigpipe = "sig_dfl"]` from 2023 blog memory. It no longer exists as an attribute; the flag is `-Zon-broken-pipe`, nightly. Catch: grep `unix_sigpipe` and `on-broken-pipe` in source and `.cargo/config.toml`.
- An agent will write `async fn` in a trait and then `Box<dyn Trait>` it. Catch: `cargo check` error "the trait is not dyn compatible"; the fix stays `#[async_trait]`.
- An agent will recommend `Mutex` replacement by `std::sync::nonpoison::Mutex`. Catch: that path needs nightly `#![feature(nonpoison_mutex)]`; grep for `nonpoison`.

## Contested / evolving

- doc_cfg: trending toward stabilization (PR open since 2025-12-16, labelled blocked, about 14 other F-doc_cfg issues). Timing unknown. As of 2026-11-27.
- nonpoison: active (comments to 2026-11-26) but FCP and stabilization PR not started. Trending toward eventual stabilization.
- error_generic_member_access: trending away from stabilization as-is; libs-api prefers a language-level solution (trait-object upcasting or casting, RFC 3885). As of 2026-02-26.
- dyn async fn: design-phase only (project goal 2026-2027). As of the goal page, undated.
- `#[bench]`: direction is custom harnesses via `harness = false`, as of 2026-11-02.
- SIGPIPE: the flag is slated for replacement by `#[std::io::on_broken_pipe]` (as of 2026-03-02); the default stays `SIG_IGN`.
- 2027 edition: no official plan found.

## Could not determine

- Whether `text_direction_codepoint_in_{comment,literal}` run at lex time only: the lint docs do not say, and rustc_lint source fetch returned 404.
- Whether `rename_noreplace` in std's Windows backend is exposed publicly.
- Exact dates of individual commits to windows.rs in the window (history page empty, API rate limited). Source state on master is verified as unchanged in behaviour for the claims.
- The goals page for dyn async has no update date.

## Sources

| URL | What it is | Date/era | Primary |
|---|---|---|---|
| https://raw.githubusercontent.com/rust-lang/rust/master/RELEASES.md | Full changelog, grepped locally | to 2026-11-27 | yes |
| https://blog.rust-lang.org/2026/11/12/Rust-1.100.0/ | 1.100.0 release post | 2026-11-12 | yes |
| https://blog.rust-lang.org/2026/10/01/Rust-1.99.0/ | 1.99.0 release post | 2026-10-01 | yes |
| https://blog.rust-lang.org/2026/08/20/Rust-1.98.0/ | 1.98.0 release post | 2026-08-20 | yes |
| https://github.com/rust-lang/rust/issues/134645 | nonpoison tracking issue | active 2026-11-26 | yes |
| https://github.com/rust-lang/rust/issues/99301 | error_generic_member_access | FCP cancelled 2026-02-26 | yes |
| https://github.com/rust-lang/rust/issues/43781 | doc_cfg tracking issue | label change 2026-11-18 | yes |
| https://github.com/rust-lang/rust/pull/150055 | Stabilize doc_cfg PR | blocked, 2026-11-02 | yes |
| https://github.com/rust-lang/rust/issues/117078 | gen_blocks tracking issue | 2026-08-08 | yes |
| https://github.com/rust-lang/rust/issues/126482 | async_drop tracking issue | 2026-07-14 | yes |
| https://github.com/rust-lang/rust/issues/97889 | unix_sigpipe tracking issue | 2026-03-02 update | yes |
| https://github.com/rust-lang/rust/issues/50297 | custom test frameworks / bench | 2026-11-02 | yes |
| https://goals.rust-lang.org/2026/afidt-box.html | Project goal, dyn async trait | 2026-2027 | yes |
| https://doc.rust-lang.org/stable/std/sync/struct.LazyLock.html | LazyLock docs, poisoning text | 1.100 | yes |
| https://doc.rust-lang.org/stable/std/sync/index.html | std::sync module list | 1.100 | yes |
| https://doc.rust-lang.org/stable/rustc/lints/listing/deny-by-default.html | Deny-by-default lint list | 1.100 | yes |
| https://raw.githubusercontent.com/rust-lang/rust/master/library/std/src/sys/pal/unix/mod.rs | std unix init, SIGPIPE | master 2026-11 | yes |
| https://raw.githubusercontent.com/rust-lang/rust/master/library/std/src/sys/fs/windows.rs | std Windows fs backend | master 2026-11 | yes |
| https://internals.rust-lang.org/t/we-have-only-two-years-to-prepare-the-rust-2027-edition/22494 | 2027 edition community thread | closed 2026-09-03 | secondary |
| https://rust-lang.github.io/rust-project-goals/2026/afidt-box.html | Redirect stub only, no content | n/a | n/a |
| https://doc.rust-lang.org/edition-guide/rust-2027/index.html | 404, no 2027 chapter | 2026-11-27 | negative result |
| https://github.com/rust-lang/rust/commits/master/library/std/src/sys/fs/windows.rs | Empty history page | n/a | negative result |
