---
title: Recent shifts and new-rule candidates for the rust-quality pair (delta)
pair: rust-quality
date_researched: 2026-11-27
window_start: 2026-08-14
model: sonnet
sources_fetched: 24
---

# Recent shifts and new-rule candidates, 2026-08-14 to 2026-11-27

This is a delta update of an existing, already-researched pair. Anything not listed under "changed" below is unchanged or could not be determined, and stays exactly as it is. Every claim cites the page that was actually opened. Where a page did not give a detail, the claim says "could not determine". The sibling research file `churn-crates-current-apis.md` covers crate version drift and is not repeated here.

## Table of contents

1. Summary
2. Findings by question (a) to (g)
3. Candidate rules
4. Considered and rejected
5. Handoffs to rust-cargo
6. AI-agent angle
7. Contested and evolving
8. Sources

## 1. Summary

- Highest-value finding: the `zip` crate shipped a regression-class symlink escape in `ZipArchive::extract` in versions 7.2.0 up to but not including 9.0.0, fixed in 9.0.0 (CVE-2026-115908). SEC-07 currently pins `zip >= 2.3.0`, which now admits the vulnerable range. Status: **changed**.
- A second zip advisory batch (17 Oct and 17 Nov 2026) adds SUID/SGID preservation (patched 9.0.0), and `ZipStreamReader` extracting under local-header names that differ from the central directory (patched 9.0.5, opt-in check `enforce_header_consistency(true)`). No rule mentions either.
- tar: no new advisory after 2026-03-23. SEC-07 and PKG-12 `tar >= 0.4.45` stay correct (crates.io shows tar 0.4.46 on 2026-05-18). Status: **unchanged**.
- Cargo 1.100 (2026-11-12) changed the build-directory layout and says tools must not rely on it. Existing TEST-41 (`CARGO_MANIFEST_DIR`) is not described as affected. The pair's single `assert_cmd` mention (`Command::cargo_bin`) is a legacy-path lookup that the assert_cmd source documents as breaking with a custom build-dir.
- Rust 1.98, 1.99 and 1.100 list no security fixes in RELEASES.md. Cargo CVE-2026-5222/5223 are 1.96.0 (2026-05-28), pre-window.
- None of the 13 candidate crates in question (c) received a RustSec unmaintained or INFO notice dated 2026-08-14 or later. Status: **unchanged**.
- No new Clippy lint mechanizes API-02, STATE-23 or IDIOM-04. The only relevant new lint is `unused_async_trait_impl` (pedantic, 1.98).
- A terminal-escape finding exists for a Rust CLI (dua-cli, CVE-2026-73479, reported 2026-08-26): escape sequences in file names printed after a TUI exits. SEC-34 exists but its scope is not stated for local file names. Source is a distro bug tracker, not an advisory.
- Edition 2027 content could not be determined from any primary source in the window.
- Two LLM-on-Rust studies surfaced; one (crate hallucination) is pre-window with a v2 on 2026-08-14, the other does not name Rust. Neither justifies reordering the "What Agents Get Wrong" lists.

## 2. Findings

### (a) Newly stabilized std or language items

Source for all items in this block: [RELEASES.md](https://raw.githubusercontent.com/rust-lang/rust/master/RELEASES.md) (read through 1.91; sections 1.98.0 to 1.100.1 are the window) and the [Rust 1.100.0 announcement](https://blog.rust-lang.org/2026/11/12/Rust-1.100.0/).

Releases in the window: 1.98.0 (2026-08-20), 1.98.1 (2026-09-03), 1.99.0 (2026-10-01), 1.99.1 (2026-10-15), 1.100.0 (2026-11-12), 1.100.1 (2026-11-27).

Changed, relevant to this pair:

- **1.100.0, never type `!` stable.** `Infallible` becomes an alias for `!`, and never-type fallback changes from `()` to `!` in editions 2015, 2018 and 2021. The announcement warns this can surface new unreachable-code warnings or inference changes in pre-2024 crates. The pair mentions neither (grep for "never type" and "Infallible" found only an unrelated English use of "infallible").
- **1.100.0, `str`/slice/`Path` `trim_prefix` and `trim_suffix`.** Replace the `s.strip_prefix(p).unwrap_or(s)` hand-pattern. The pair has no rule on it.
- **1.100.0, `core::mem::DropGuard`.** Runs a closure on drop with a `dismiss` that returns the wrapped value. Replaces hand-rolled rollback guards and the `scopeguard` crate. The pair does not mention `scopeguard` or rollback guards (grep found nothing), so this only matters as a current-apis row and for STATE-12 style teardown advice.
- **1.100.0, `CommandExt::show_window` and `ChildExt::main_thread_handle` (Windows).** Relevant to spawn code in PLAT-21 territory; the pair does not mention `CREATE_NO_WINDOW` or `show_window`.
- **1.100.0, `ENOTSUP` maps to `ErrorKind::Unsupported`.** Relevant to lock and rename error classification (STATE-10, PLAT-14). Whether it changes a documented classification in the pair could not be determined; no grep hit for `ErrorKind::Unsupported`.
- **1.99.0, `fs::set_times` and `fs::set_times_nofollow`.** Replace the `filetime` crate. The pair does not mention `filetime`.
- **1.98.0, `Path::is_empty`, `PathBuf::into_string`, `str::substr_range`.** Minor; no pair text is made obsolete.
- **1.98.0 compatibility notes, Windows.** TLS destructors switch to Fiber Local Storage. Not actionable as a rule.
- **1.97.0 (pre-window by five weeks, listed for context).** Windows socket writes after shutdown now return `BrokenPipe` instead of `Other`.
- **File locking.** The 1.98.0 compatibility notes say "Solaris `File::lock` removed", which proves std `File::lock` exists. Its stabilization release was not fetched (RELEASES.md was read only through 1.91 of the older entries), so the date is **could not determine**. STATE-9's verification greps for `lock_exclusive(`/`lock_shared(` (the `fs4` method names), so a std-lock version of the same code would escape that grep. This is a candidate with the missing date flagged.
- **1.99.0 compatibility notes.** Legacy integral modules (`std::i32::MAX`) fully deprecated; `std::char` constants deprecated in 1.97.0. These produce rustc warnings that agents will see; low value as a row.

Std path-normalization (lexical path APIs): **could not determine**. No such stabilization appears in the 1.98 to 1.100 sections read. The `dunce` and `camino` position in PLAT-05/06 is unchanged by this window.

Unchanged: `LazyLock`, `OnceLock`, `#[expect]`, let-chains, async closures rows. RELEASES.md 1.96.0 adds `From<T>` for `LazyLock` (pre-window).

### (b) New Clippy or rustc lints

Source: [Clippy CHANGELOG](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/CHANGELOG.md), "New Lints" for Rust 1.98, 1.99 and 1.100.

- 1.98 (2026-08-20): `unnecessary_unwrap_unchecked`, `chunks_exact_to_as_chunks`, `by_ref_peekable_peek`, `with_capacity_zero`, `manual_isolate_lowest_one`, `for_unbounded_range`, `unused_async_trait_impl`. Deprecated: `from_iter_instead_of_collect`. Moved: `empty_enums` from pedantic to nursery.
- 1.99 (2026-10-01): `assert_is_empty`, `nonnull_unchecked_on_box_ptr`, `block_scrutinee`, `definition_in_module_root`, `rest_pattern_accessible_field`, `unnecessary_rest_pattern`, `manual_bit_width`, `mismatched_bit_width_type`.
- 1.100 (2026-11-12): `option_zip_none`, `needless_nonzero_get`.
- rustc: 1.99.0 adds allow-by-default `raw_borrows_via_references`; 1.100.0 adds deny-by-default `aligned_fields_in_packed`; 1.98.0 adds deny-by-default `invalid_runtime_symbol_definitions`.

None targets secrets in `Debug` (API-02), redundant `Arc<Mutex<_>>` (STATE-23) or discard patterns (IDIOM-04). Only `unused_async_trait_impl` touches a pair topic (the `#[async_trait]` row in current-apis.md). Its exact trigger was not read from the Clippy lint page, so the description "flags `async_trait` impls that need no `async`" is **could not determine**; the candidate below is hedged accordingly.

`from_iter_instead_of_collect` deprecation: the pair has no mention. Unchanged.

### (c) Crate status

Source: [crates.io API](https://crates.io/api/v1/crates/zip) queried per crate on 2026-11-27, and the [RustSec advisory index](https://rustsec.org/advisories/).

| Crate | Latest, date | Notice in window |
|---|---|---|
| backon | 1.6.0, 2025-10-18 | None |
| secrecy | 0.10.3, 2024-10-09 | None (unchanged, also in the sibling file) |
| fs4 | 1.1.0, 2026-04-28 | None |
| dunce | 1.0.5, 2024-08-04 | None |
| cap-std | 4.0.3, 2026-08-20 | None |
| directories | 6.0.0, 2025-01-12 | None |
| etcetera | 0.11.0, 2025-10-28 | None |
| trait-variant | 0.1.3, 2026-11-11 | None |
| async-trait | 0.1.92, 2026-08-08 | None |
| strip-ansi-escapes | 0.2.1, 2025-01-14 | None |
| human-panic | 2.0.8, 2026-04-02 | None |
| vergen | 10.1.0, 2026-11-25 | None; the CHANGELOG URL tried returned 404, so what vergen 10 changed is **could not determine** |
| tracing-test | 0.2.6, 2026-02-07 | None |

The RustSec index search (filtered to informational, unmaintained or unsound, dated 2026-08-14 or later) matched none of these names. The only unmaintained notice in the window it surfaced is `zip-extract` (2026-08-31, RUSTSEC-2025-0172), a different crate the pair does not recommend. The index page was read only for its first 100,000 characters, so a notice sorted lower on the page could have been missed; treat "no notice" as strong but not exhaustive.

Pair crates with dated versions worth noting: `vergen` is now on a 10.x major. The pair's OBS-15 says "vergen or equivalent" and its verification greps for `VERGEN` env vars, so no text is wrong, but the API drift check for vergen 10 was not done. **Could not determine.**

### (d) Attack classes and CVEs

**Changed: zip.** Source pages: [GHSA-hjqx-j4rw-g7xv / CVE-2026-115908](https://github.com/advisories/GHSA-hjqx-j4rw-g7xv), [RUSTSEC-2026-0546](https://rustsec.org/advisories/RUSTSEC-2026-0546), [RUSTSEC-2026-0367](https://rustsec.org/advisories/RUSTSEC-2026-0367), [RUSTSEC-2026-0548](https://rustsec.org/advisories/RUSTSEC-2026-0548), [RUSTSEC-2025-0168](https://rustsec.org/advisories/RUSTSEC-2025-0168), and the [zip advisory list](https://rustsec.org/packages/zip.html).

- Old text (security.md SEC-07): "Pin explicit version floors `tar >= 0.4.45` and `zip >= 2.3.0` ... both crates shipped symlink-driven escapes in their documented-safe entry points." Sources at security.md lines 226-227 cite the 2025 zip advisory only.
- New fact: `ZipArchive::extract` and `extract_unwrapped_root_dir` in zip `>= 7.2.0, < 9.0.0` validate symlink targets lexically and create symlinks without target checks, so chained symlinks write outside the destination while `extract` returns `Ok(())`. Fixed in 9.0.0 by resolving component by component from the canonicalized destination. The regression came from a January 2026 change (v7.2.0) that began stripping absolute paths instead of rejecting them, after the 2.3.0 fix had rejected them. Reported 2026-10-22; RustSec issued 2026-11-17; GitHub review 2026-10-29. CVSS 3.1 7.4 High. `ZipStreamReader::extract` is not affected by this one.
- Consequence: a floor of `>= 2.3.0` admits 7.2.0 to 8.x. Versions below 7.2.0 and 2.3.0 or later are unaffected by this advisory; the safe floor today is `>= 9.0.5` (see next bullets).
- RUSTSEC-2026-0367 (reported 2026-10-09, issued 2026-10-17): extraction preserves SUID, SGID and sticky bits from ZIP `external_attributes`; patched `>= 9.0.0`. SEC-08 already rejects `mode & 0o6000` in a hand-written loop, but it does not cover callers of the library `extract()`.
- RUSTSEC-2026-0548 (reported 2026-10-17, issued 2026-11-17): `ZipStreamReader` (`visit`, `extract`, `read_zipfile_from_stream`) takes names from local file headers and never compares them to the central directory, so an archive can show one name set to an inspecting tool and write other names. Patched `>= 9.0.5` with an opt-in `enforce_header_consistency(true)`, off by default. This is a parser-differential, the same class as PKG-12's tar PAX differential.
- Also listed in the zip index, patched versions **not fetched**: RUSTSEC-2026-0368 (2026-10-17, `extract` creates symlinks with attacker-controlled targets), RUSTSEC-2026-0369 (2026-10-17, Critical, Unix permissions applied through symlinks), RUSTSEC-2026-0429 (2026-11-02, `extract` aborts the process on a symlink entry with a large declared size), RUSTSEC-2026-0545 (2026-11-17, AES entries returned without authentication-code check when data ends early or is empty), RUSTSEC-2026-0547 (2026-11-17, legacy Shrink/Reduce/Implode decoders preallocate the declared uncompressed size). crates.io shows zip at 9.8.2 on 2026-11-23, so the floor proposed below is a minimum, not the newest.
- RUSTSEC-2025-0168 (the 2025 zip advisory the pair cites) was issued on RustSec only on 2026-08-11 and modified 2026-10-12. The citation is still correct.

**Changed: new archive-extractor class, nix-nar.** [RUSTSEC-2026-0425](https://rustsec.org/advisories/RUSTSEC-2026-0425) (issued 2026-10-30, CVSS 7.5): `nix_nar::Decoder::unpack` before 0.6.0 writes symlink targets unchecked, checks containment by string only while ignoring symlinks created earlier in the same unpack, and accepts entry names containing `/`. The pair does not recommend nix-nar, but this is a third crate with the same lexical-containment defect, which supports making the rule crate-independent (see candidate 2).

**Unchanged: tar.** [tar advisory list](https://rustsec.org/packages/tar.html) shows nothing after 2026-03-23.

**Changed (weak source): terminal-escape injection in a Rust CLI.** [Red Hat Bugzilla 2524398](https://bugzilla.redhat.com/show_bug.cgi?id=2524398): CVE-2026-73479, dua-cli does not filter OSC/CSI sequences in file names it prints after the TUI exits; reported 2026-08-26, status NEW, no fixed version, no RustSec advisory found. SEC-34 and SEC-35 require one sanitizer for registry-supplied text; whether they reach local directory entries printed on TUI exit is not stated in the rule text I grepped. The earlier tracing-subscriber advisory (CVE-2025-58160) is pre-window.

**Unchanged: argument injection.** No new Rust-specific advisory in the window was found. The search covered only generic terms; this is not exhaustive. **Could not determine** beyond that.

**Cargo advisories.** CVE-2026-5222 and CVE-2026-5223 (1.96.0, 2026-05-28) and libssh2 CVEs (1.96.1, 2026-06-30) are pre-window. RELEASES.md lists no security notes for 1.98.0 to 1.100.1. Registry and git handling belongs to rust-cargo.

### (e) Cargo layout and behaviour

Source: [Cargo CHANGELOG](https://doc.rust-lang.org/cargo/CHANGELOG.html) sections 1.98, 1.99, 1.100 (first 100,000 characters of the page only).

- **Changed, Cargo 1.100 (2026-11-12):** "Cargo now uses a new directory layout for intermediate build artifacts ... Tools that inspect the build directory may need to use Cargo's JSON messages to locate build artifacts instead of relying on the build directory layout. The layout is not a stable interface and is subject to change." The announcement says artifacts are grouped by build step and the config hash moved to parent directories. Final artifacts stay in `target-dir`, as the earlier [Call for Testing](https://blog.rust-lang.org/2026/03/13/call-for-testing-build-dir-layout-v2) states (that blog was read only through a search summary, so treat that sentence as secondhand).
- **TEST-41 (`CARGO_MANIFEST_DIR` fixtures): unchanged.** Neither the changelog nor the announcement says `CARGO_MANIFEST_DIR` moves. The changelog page was only partly read, so "does not say" is as far as this goes.
- **assert_cmd lookup: at risk.** The [assert_cmd 2.2.2 source](https://docs.rs/crate/assert_cmd/2.2.2/source/src/cargo.rs) shows lookup order: `CARGO_BIN_EXE_<name>` first; otherwise a legacy fallback that derives the target directory from `current_exe()` minus `deps`; otherwise a panic naming the unset variable. Its "Cargo support" note says the function "works with default build-dir" for Cargo 1.91 to 1.93; behaviour on 1.100 is **could not determine**. The [assert_cmd changelog](https://github.com/assert-rs/assert_cmd/blob/master/CHANGELOG.md) shows `cargo_bin` deprecated in 2.1.0 (2025-10-28) and un-deprecated in 2.1.3 (2026-03-10); 2.0.17 added `cargo::cargo_bin!` "will work with Cargo's build-dir". The macro docs state its path is "only set when building an integration test or benchmark". A Rust forum thread reports the nightly layout broke assert_cmd 2.1.3 for another crate's binary; I did not open it.
- **CARGO_BIN_EXE at runtime:** RELEASES.md 1.94.0 (2026-03-05, pre-window) made `CARGO_BIN_EXE_<crate>` available at runtime. Pre-window, and the pair does not mention it.
- **Cargo-script (`-Zscript`):** still nightly; 1.98 and 1.100 list only fixes. The pair has no script advice. **Unchanged.**
- **1.99.0 (2026-10-01):** Cargo disables incremental compilation by default when `CI` is set (rust-cargo's side). New built-in `debug` profile (identical to `dev` for now).
- **1.100.0:** `[lints.cargo]` with `unused_dependencies`, minimum publish age, `cargo install` uses the lockfile from the `.crate`. All rust-cargo's side.

### (f) Edition 2027

**Could not determine.** The [Inside Rust feed](https://blog.rust-lang.org/inside-rust/feed.xml) was read only for its first six posts dated in the window (the feed was truncated and the output covered the first 100,000 characters); none concerns the 2027 edition (the 2026-11-23 post is about the May 2027 All Hands in Utrecht). A search found a draft edition-cadence RFC dated 2026-08-02 and an internals thread, but I did not open either, so nothing from them is claimed. EVO-1's edition-gated advice is **unchanged**. One in-window fact does touch EVO-1: 1.100.0 changes never-type fallback on editions 2015 to 2021 (see (a)).

### (g) Studies of LLM agents and Rust

- [arXiv 2606.08444](https://arxiv.org/abs/2606.08444), "When LLMs Invent Rust Crates": first submitted 2026-06-07 (pre-window), v2 on 2026-08-14. Abstract only: Rust crate-hallucination rates are "surprisingly consistent" across model sizes, supply-chain risk. No numbers on the abstract page, so any ranking claim is **could not determine**. It supports the pair's existing guidance (read `Cargo.lock`, verify crate existence) rather than reordering it; PKG and EVO-9 already say never generate symbol names from memory.
- [arXiv 2608.00661](https://arxiv.org/abs/2608.00661) (2026-08-01, in-window): error study over 86,726 failing samples from seven LLMs in four compiled languages; the abstract does not name Rust. Not usable for Rust.
- Search summaries mentioned AdaTrans (C to Rust) saying models reach for `unsafe` or raw pointers when the borrow checker rejects code. Not opened; not claimed.

No evidence in the window justifies reordering the "What Agents Get Wrong" lists.

## 3. Candidate rules

Severity vocabulary follows the pair: MUST, SHOULD, MAY.

1. **SEC-07 amendment (not a new rule), target `security.md`, family SEC, MUST.**
   - Rule: replace `zip >= 2.3.0` with `zip >= 9.0.5`. Keep `tar >= 0.4.45`. Add the advisories as cited sources next to the 2.3.0 one.
   - Rationale: the stated floor admits 7.2.0 to 8.x, which carries CVE-2026-115908; 9.0.0 fixes it and 9.0.5 fixes the stream-reader header mismatch. The SUID advisory is fixed in 9.0.0.
   - Verification: `cargo tree -i zip` shows a version `>= 9.0.5`; `cargo audit` against RustSec; `git grep -n -E '^zip *=|name = "zip"' -- Cargo.toml Cargo.lock`.
   - Source: https://github.com/advisories/GHSA-hjqx-j4rw-g7xv, https://rustsec.org/advisories/RUSTSEC-2026-0548
   - Caveat: patched versions for RUSTSEC-2026-0368, 0369, 0429, 0545 and 0547 were not fetched; 9.0.5 may not cover them. Re-check against the newest version (9.8.2 on 2026-11-23) before fixing the number.

2. **New rule, target `security.md` (cross-link from `package-manager-domain.md`), family SEC, MUST.**
   - Rule: do not call a library's whole-archive `extract`/`unpack` (`ZipArchive::extract`, `extract_unwrapped_root_dir`, `ZipStreamReader::extract`, `tar::Archive::unpack`, `nix_nar::Decoder::unpack`) on registry-supplied archives. Iterate entries and write through the SEC-10 directory-handle resolver, so a library's lexical containment check is never the control. Where `ZipStreamReader` is unavoidable, call `enforce_header_consistency(true)`, and strip the 0o6000 bits yourself.
   - Rationale: three independent crates (zip 2025, zip 2026, nix-nar 2026) shipped the same lexical-containment defect behind a documented-safe entry point and returned `Ok(())`. A version floor fixes one instance at a time; the entry-loop rule fixes the class.
   - Verification: `git grep -n -E '\.extract(_unwrapped_root_dir)?\(|\.unpack\(|ZipStreamReader|read_zipfile_from_stream' -- '*.rs'` — each hit outside the vetted extraction module is a defect; a `ZipStreamReader` hit needs `enforce_header_consistency(true)` within five lines.
   - Source: https://rustsec.org/advisories/RUSTSEC-2026-0546, https://rustsec.org/advisories/RUSTSEC-2026-0425
   - Note: security.md line 183 already lists `archive.unpack`/`extract` as an agent failure; this makes it a numbered, greppable rule.

3. **New rule, target `testing.md`, family TEST, SHOULD.**
   - Rule: integration tests locate the binary under test with `assert_cmd::cargo::cargo_bin!` (which reads `CARGO_BIN_EXE_<name>`), never by building a path under `target/` or from `current_exe()`, and never trust the `deps` fallback. A test that needs another crate's binary declares it as an artifact dependency or builds a named test helper, not a path guess.
   - Rationale: Cargo 1.100 states the build-dir layout is not a stable interface; the assert_cmd fallback derives paths from the old layout and panics when the variable is unset.
   - Verification: `git grep -n -E 'target/(debug|release)|current_exe\(\)|cargo_bin\(' -- 'tests/**/*.rs' '**/tests/*.rs'` returns nothing outside an explained exception; run `cargo test` with `CARGO_BUILD_BUILD_DIR` set to a scratch directory once.
   - Source: https://blog.rust-lang.org/2026/11/12/Rust-1.100.0/ and the assert_cmd source above.
   - Caveat: I could not confirm that `Command::cargo_bin` breaks on stable 1.100 specifically, only that its source assumes a layout Cargo now calls unstable. Phrase the rule as "do not depend on it", not "it breaks".

4. **Amendment to SEC-34/SEC-35 scope, target `security.md`, family SEC (TUI cross-reference), SHOULD.**
   - Rule: the sanitizer covers every attacker-influenced string written to a terminal, including local file and directory names from a walked tree, and including text printed after the alternate screen is left.
   - Rationale: CVE-2026-73479 is a TUI that is safe inside the widget and unsafe on exit.
   - Verification: the existing SEC-34 grep, widened to any `println!`/`eprintln!`/`write!` of `Path::display()` or a `file_name()` in code reachable after TUI teardown; reading heuristic "what is the last thing printed after `restore_terminal`".
   - Source: https://bugzilla.redhat.com/show_bug.cgi?id=2524398
   - Caveat: weak source (a distro bug tracker, NEW, no RustSec entry). Phrase as a scope clarification, not as a cited CVE, until an advisory exists.

5. **New current-apis rows, target `current-apis.md`, family EVO, SHOULD (rows, not MUST rules).**
   - `strip_prefix(p).unwrap_or(s)` and `strip_suffix` equivalents become `trim_prefix`/`trim_suffix` (1.100). The tell: a `.unwrap_or(s)` after `strip_prefix`.
   - `filetime` crate (or `libc::utimensat`) for setting times becomes `std::fs::set_times`/`set_times_nofollow` (1.99).
   - `scopeguard` and hand-rolled drop-guard rollback becomes `core::mem::DropGuard` (1.100); keep `scopeguard` only with a comment naming the missing feature.
   - `Result<T, Infallible>` and `from_never` workarounds become `Result<T, !>` (1.100); `Infallible` is now an alias for `!`.
   - Source: https://raw.githubusercontent.com/rust-lang/rust/master/RELEASES.md, https://blog.rust-lang.org/2026/11/12/Rust-1.100.0/
   - Verification per row is the "tell" column, as in the existing table. Caveat: `DropGuard` and `trim_prefix` signatures were taken from release notes only; read the std docs before shipping the row, per EVO-9.

6. **New row plus EVO-1 clause, target `current-apis.md`, family EVO, SHOULD.**
   - Rule: for a crate on edition 2015 to 2021, a toolchain bump to 1.100 changes never-type fallback to `!`; read new unreachable-code warnings as a real signal, not noise to `#[allow]` (EVO-2 and EVO-7 already forbid the allow).
   - Rationale: it is the one 1.100 compatibility change that lands on code with no source edit, and agents will "fix" the warning by suppression.
   - Verification: `cargo clippy --all-targets -- -D warnings` after the bump; `git grep -n 'allow(unreachable'` returns nothing new.
   - Source: https://blog.rust-lang.org/2026/11/12/Rust-1.100.0/

7. **Amendment to STATE-9 verification, target `durable-state.md`, family STATE, SHOULD, pending one missing fact.**
   - Rule: the STATE-9 grep also matches std `File::lock`, `lock_shared`, `try_lock`, `try_lock_shared`, `unlock` called on a `File`, and the rule states which (std or `fs4`) the project pinned.
   - Rationale: std `File::lock` exists (1.98.0 notes say Solaris support was removed), so new code may use it instead of `fs4`, and the current grep matches only the `fs4` spelling.
   - Verification: `git ls-files ... | xargs grep -n -E '\.(try_)?lock(_shared|_exclusive)?\(|\.unlock\('`.
   - Source: https://raw.githubusercontent.com/rust-lang/rust/master/RELEASES.md (1.98.0 compatibility notes). Missing: the stabilization release and the exact error type for contended `try_lock`; read the std docs before writing the rule. Do not recommend dropping `fs4` until then.

8. **Amendment to the async-trait row, target `current-apis.md` verification column, family EVO, MAY.**
   - Rule: add Clippy `unused_async_trait_impl` (pedantic, 1.98) to the tell for a stale `#[async_trait]` impl, enabled per crate in `[lints.clippy]`.
   - Source: https://raw.githubusercontent.com/rust-lang/rust-clippy/master/CHANGELOG.md
   - Caveat: trigger semantics not read from the lint page; verify its description before citing it.

9. **Windows spawn row, target `platform-and-paths.md`, family PLAT, MAY.**
   - Rule: when spawning a console child from a GUI-less CLI on Windows, use `CommandExt::show_window` (1.100) instead of a raw `creation_flags` constant for the hidden-window case.
   - Source: https://blog.rust-lang.org/2026/11/12/Rust-1.100.0/
   - Caveat: the pair has no `CREATE_NO_WINDOW` rule, so this is an addition to PLAT-21 territory, not a fix. Low value; include only if the owner wants a spawn row.

## 4. Considered and rejected

- Cargo CVE-2026-5222/5223 and the libssh2 CVEs: pre-window (2026-05-28, 2026-06-30) and registry handling belongs to rust-cargo.
- Any unmaintained notice for the 13 candidate crates: none found, so no row to retire.
- `from_iter_instead_of_collect` deprecation, `with_capacity_zero`, `for_unbounded_range` and the other new Clippy lints: no pair rule is mechanized by them.
- A Clippy lint for secret-in-Debug, redundant `Arc<Mutex>` or discard patterns: none in 1.98 to 1.100.
- `assert_matches!` (1.96, 2026-05-28) and the `if let` guard stabilization (1.95): pre-window.
- std `Path` lexical-normalization API: not found in the three in-window releases; PLAT-05/06 stand.
- `cfg_select!` (1.95), `Vec::push_mut` (1.95): pre-window.
- Custom allocator stabilization (1.100): no pair rule touches allocators; the `unsafe`/FFI rules are unaffected.
- Windows TLS destructors via Fiber Local Storage (1.98): not actionable at rule level.
- Rust 1.100.1 (2026-11-27) iterator-regression fix: release housekeeping.
- Cargo-script: still nightly (`-Zscript` fixes only in 1.98 and 1.100).
- Edition 2027 preview items: no primary source in window (see (f)); no EVO-1 change.
- Crate-hallucination study (arXiv 2606.08444): pre-window first version; abstract only; supports existing EVO-9, no reorder.
- Error study arXiv 2608.00661: does not name Rust.
- Terminal-escape item from the Claude HUD tool: not a Rust crate; dropped.
- The zip `RUSTSEC-2026-0545` (AES authentication-code bypass): integrity, not extraction escape; included only in the floor bump, not its own rule.

## 5. Handoffs to rust-cargo (one line each, no rule here)

- Cargo 1.99: incremental compilation is off by default when `CI` is set, relevant to CI job design.
- Cargo 1.100: `[lints.cargo]` `unused_dependencies`, minimum publish age (`global-min-publish-age`, `CARGO_RESOLVER_INCOMPATIBLE_PUBLISH_AGE`), `cargo install` using the packaged lockfile, new build-dir layout for caches and workspace-level cache keys.
- Cargo 1.99: built-in `debug` profile and workspace `default-features` override on edition 2024 or later (release-profile and dependency-gate policy).
- Targets: `i686-pc-windows-gnu` is Tier 2 without host tools and `windows-gnullvm` links libunwind statically (1.100.0); `riscv64-unknown-linux-musl` Tier 2 with host tools (1.99.0) — release matrix.
- Cargo 1.99: hyphenated lint names in `[lints]` now warn (`unexpected-cfgs` to `unexpected_cfgs`).

## 6. AI-agent angle

- Agents will write `zip = "2"` or keep an old pinned floor and call `ZipArchive::extract(dest)?`, which returns `Ok(())` on a hostile archive. Smallest check: candidate 2's grep plus `cargo audit`.
- Agents will build binary paths under `target/debug/` for CLI tests, or copy a test written for the old layout. Smallest check: candidate 3's grep.
- After a toolchain bump, agents will `#[allow(unreachable_code)]` the new warnings. Existing EVO-2 and EVO-7 greps catch it.
- Agents will keep recalling `Result<T, Infallible>` and `scopeguard` as current. The rows in candidate 5 are the lookup that replaces the guess.

## 7. Contested and evolving

- Whether the pair should prefer `cap-std` handle-relative extraction (SEC-10) over a fixed zip, given three crates repeated the same lexical-check defect, is a matter of trend: as of 2026-11-27 the evidence favours the handle-based resolver and treats library `extract()` as untrusted.
- Whether `assert_cmd::cargo_bin` keeps working under the new layout is not settled by the sources I could open; the macro path is the documented safe one.
- The build-dir layout is explicitly "subject to change", so any rule written against it should reference Cargo's JSON messages, not directory names.
- Edition 2027 scope and even existence are unsettled in the sources found.

## 8. Sources

| URL | What it is | Date | Why worth reading |
|---|---|---|---|
| https://raw.githubusercontent.com/rust-lang/rust/master/RELEASES.md | Rust release notes (read: 1.91 and later, in-window sections 1.98 to 1.100.1) | 2026-08-20 to 2026-11-27 | Stabilized APIs, compat notes, security lines |
| https://blog.rust-lang.org/2026/11/12/Rust-1.100.0/ | Rust 1.100 announcement | 2026-11-12 | Never type, build-dir, DropGuard, Windows APIs |
| https://doc.rust-lang.org/cargo/CHANGELOG.html | Cargo changelog 1.98 to 1.100 (first 100,000 chars) | 2026-08-20 to 2026-11-12 | Build-dir layout, CI incremental, lints |
| https://raw.githubusercontent.com/rust-lang/rust-clippy/master/CHANGELOG.md | Clippy changelog, New Lints (first 100,000 chars) | 2026-08-20 to 2026-11-12 | Lint inventory |
| https://github.com/advisories/GHSA-hjqx-j4rw-g7xv | CVE-2026-115908 zip advisory | 2026-10-22 to 2026-10-29 | Symlink escape in 7.2.0 to 9.0.0, regression history |
| https://rustsec.org/advisories/RUSTSEC-2026-0546 | RustSec entry for the same zip bug | issued 2026-11-17 | Affected and patched versions |
| https://rustsec.org/advisories/RUSTSEC-2026-0367 | zip SUID/SGID preservation | issued 2026-10-17 | Patched 9.0.0 |
| https://rustsec.org/advisories/RUSTSEC-2026-0548 | zip stream reader name mismatch | issued 2026-11-17 | Patched 9.0.5, opt-in check |
| https://rustsec.org/advisories/RUSTSEC-2025-0168 | Earlier zip advisory the pair cites | issued 2026-08-11 | Confirms SEC-07 source still valid |
| https://rustsec.org/packages/zip.html | RustSec zip advisory list | to 2026-11-17 | Complete zip advisory inventory |
| https://rustsec.org/packages/tar.html | RustSec tar advisory list | latest 2026-03-23 | Confirms tar unchanged |
| https://rustsec.org/advisories/RUSTSEC-2026-0425 | nix-nar path traversal | issued 2026-10-30 | Third crate, same defect class |
| https://rustsec.org/advisories/ | RustSec advisory index (first 100,000 chars) | to 2026-11 | Unmaintained-notice check |
| https://crates.io/api/v1/crates/zip (and 17 sibling crates) | crates.io version data | queried 2026-11-27 | Latest versions and dates |
| https://github.com/rustsec/advisory-db/commits/main/crates | Advisory DB commit list | 2026-11-19 to 2026-11-26 | Only the last week was visible; used for context only |
| https://docs.rs/crate/assert_cmd/2.2.2/source/src/cargo.rs | assert_cmd binary lookup source | 2026-05-11 | Lookup order and fallback |
| https://github.com/assert-rs/assert_cmd/blob/master/CHANGELOG.md | assert_cmd changelog | to 2026-05-11 | Deprecation and un-deprecation timeline |
| https://docs.rs/assert_cmd/2.2.2/assert_cmd/cargo/macro.cargo_bin.html | `cargo_bin!` docs | 2026 | Variable is set only for integration tests |
| https://bugzilla.redhat.com/show_bug.cgi?id=2524398 | dua-cli escape-injection report | 2026-08-26 | Only terminal-escape item in window; weak source |
| https://arxiv.org/abs/2606.08444 | Crate-hallucination study | v1 2026-06-07, v2 2026-08-14 | Abstract only |
| https://arxiv.org/abs/2608.00661 | LLM code error study | 2026-08-01 | Does not name Rust |
| https://this-week-in-rust.org/blog/archives/index.html | TWiR archive listing (issues 663 to 679) | 2026-08-05 to 2026-11-25 | Issue list only; individual issues were not read |
| https://blog.rust-lang.org/inside-rust/feed.xml | Inside Rust feed (first six in-window posts) | 2026-10-12 to 2026-11-23 | No edition or Cargo-layout posts visible |
| https://raw.githubusercontent.com/rustyhorde/vergen/master/CHANGELOG.md | vergen changelog | n/a | Returned 404; vergen 10 changes not determined |

Not read, so nothing is claimed from them: individual This Week in Rust issues 663 to 679, the Inside Rust feed posts older than 2026-10-12, Cargo changelog beyond its first 100,000 characters, RELEASES.md beyond its first 100,000 characters, the Rust forum thread about assert_cmd and build-dir layout, and the Edition Team draft RFC.
