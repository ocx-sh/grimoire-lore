---
title: rust-quality delta refresh, 2026-08-14 to 2026-11-27
pair: rust-quality
date: 2026-11-27
window_start: 2026-08-14
model: opus
consolidates:
  - .agents/research/refresh-2026-11/rust-quality/rust-toolchain-stable-delta.md
  - .agents/research/refresh-2026-11/rust-quality/clippy-and-cargo-claims.md
  - .agents/research/refresh-2026-11/rust-quality/churn-crates-current-apis.md
  - .agents/research/refresh-2026-11/rust-quality/runtime-fs-data-crates.md
  - .agents/research/refresh-2026-11/rust-quality/advisories-supply-chain-and-specs.md
  - .agents/research/refresh-2026-11/rust-quality/test-and-bench-tooling.md
  - .agents/research/refresh-2026-11/rust-quality/tracing-otel-and-tui-crates.md
  - .agents/research/refresh-2026-11/rust-quality/recent-shifts-new-rule-candidates.md
revises:
  - .agents/research/rust-security.md
  - .agents/research/rust-platform-and-portability.md
  - .agents/research/rust-language-evolution.md
  - .agents/research/rust-testing.md
  - .agents/research/rust-performance.md
  - .agents/research/rust-tui.md
  - .agents/research/rust-docs-observability.md
  - .agents/research/rust-type-architecture.md
  - .agents/research/rust-idioms-and-patterns.md
  - .agents/research/rust-error-handling.md
  - .agents/research/rust-api-design.md
  - .agents/research/rust-state-and-resources.md
---

# rust-quality delta refresh, 2026-11-27

This is a delta update of the pair as it stood on 2026-08-14. Only findings that a delta artifact backs with a fetched primary source change the pair. Every rule ID keeps its number and meaning. Two new rules continue their families: SEC-41 and TEST-42.

## Verdict

1. The rule file `rules/rust-quality.md` is unchanged. No non-negotiable, gate command or routing row was contradicted. Rule bump: none.
2. The reference skill takes corrected facts and two new rules. Skill bump: minor.
3. SEC-07 raises the zip floor from 2.3.0 to 9.0.5. Floor 2.3.0 admits zip 7.2.0 to 8.x, which re-opened a symlink escape in `ZipArchive::extract` (RUSTSEC-2026-0546). Eight zip advisories from October 2026 are all fixed by 9.0.5. The tar floor stays at 0.4.45.
4. SEC-41 is a new rule. It bans a library's whole-archive extractor on registry content and makes the zip stream reader's header-consistency check mandatory. Three crates (zip in 2025, zip again in 2026, nix-nar in 2026) shipped the same lexical-containment defect behind a documented-safe entry point. A version floor fixes one instance; the entry loop fixes the class.
5. SEC-26 keeps `--locked` everywhere but corrects its reason. From Cargo 1.100 (2026-11-12), `cargo install` uses the packaged lockfile by default.
6. PLAT-30 and its pinned paragraph keep chrono as the one datetime crate, with a tracked advisory ignore. chrono is now flagged unmaintained (RUSTSEC-2026-0543). With `unmaintained = "workspace"` that turns the gate red, so the ignore and its removal condition must be stated. jiff 1.0 shipped on 2026-11-15. The migration is one reviewed change that swaps the crate, and it is not made in this refresh.
7. New version floors for tokio, rustls, rustls-webpki and h2 are not added as rules. `cargo deny check` is already in the gate and already fails on every one of those advisories. A rule that restates an advisory the gate enforces adds no control.
8. The rest are corrected facts, each a minimal in-place edit:
   - API-14 lint groups.
   - ERR-09 key scope.
   - STATE-9 fs4 renames.
   - architecture.md item 12 (`clippy::pub_use` exists).
   - TUI-15 `unicode-width` semantics.
   - SEC-31 and OBS-10 `tracing-subscriber` escaping.
   - PERF-25 hyperfine 2.0 default.
   - PERF-18 flate2 `runtime_detection`.
   - Gungraun status.
   - The syn 3 row.
   - SEC-25 cargo-deny floor.
   - SEC-29 cargo-auditable floor.
   - SEC-36 console floor.
   - OBS-22 key list.
   - ARCH-21 Cargo lint.
9. current-apis.md gains three rows: the rand 0.10 sampling renames, the never type (1.100), and `core::mem::DropGuard` (1.100). EVO-9 adds `syn` to its high-churn list.
10. TEST-42 is a new rule. It makes integration tests locate the binary under test through `CARGO_BIN_EXE_<name>`, because Cargo 1.100 changed the build-dir layout and documents it as unstable.

## Changed rules

| ID | Old text (the part that changes) | New text (the part that changes) | Source |
|---|---|---|---|
| SEC-07 | "`zip >= 2.3.0` ... both crates shipped symlink-driven escapes in their *documented-safe* entry points." | "`zip >= 9.0.5` ... and zip did it twice: 7.2.0 to 8.x re-opened `ZipArchive::extract` after the 2.3.0 fix (RUSTSEC-2026-0546), and 9.0.5 is the first release clear of the October 2026 batch." Verification also names both floors. | RustSec advisory-db `crates/zip/` (RUSTSEC-2026-0367, -0368, -0369, -0429, -0545, -0546, -0547, -0548); crates.io zip versions |
| SEC-25 | (no tool floor) | Adds: run cargo-deny 0.22.1 or later, because earlier versions could suppress an `unsound` or `unmaintained` advisory when a workspace holds two versions of a crate. Verification adds `cargo deny --version`. | cargo-deny CHANGELOG 0.22.1 (PR 929) |
| SEC-26 | "`cargo install` **ignores** the published `Cargo.lock` by default." | Before Cargo 1.100 `cargo install` ignored it unless `--locked` was passed. From 1.100 the packaged lockfile is the default and `--locked` is a harmless no-op, so the flag stays for older toolchains. | Cargo CHANGELOG 1.100 (PR 17388); stable cargo-install page |
| SEC-29 | "Build releases with `cargo auditable build --release`" | Adds: cargo-auditable 0.7.8 or later, because earlier versions fail to embed audit data in large Windows builds on Rust 1.100+. | cargo-auditable CHANGELOG 0.7.8 |
| SEC-31 | "`tracing-subscriber` passes `\n`, `\r`, NUL and the whole `Cf` bidi set straight to the terminal" | "`tracing-subscriber` (0.3.20+) escapes ESC, BEL, BS, FF, DEL and C1 controls by default but still passes `\n`, `\r`, NUL and the whole `Cf` bidi set ..." | tracing PR 3368; `tracing-subscriber/src/fmt/format/escape.rs` on main |
| SEC-36 | "or `console::truncate_str`)" | "or `console::truncate_str` from console 0.16.6, which stopped panicking on a cut through a multi-byte character)" | console releases 0.16.6 |
| STATE-9 | Verification: "`fs4` renamed `lock_exclusive` to `try_lock`, so a two-spelling grep reports zero on a crate that locks" | fs4 1.0 renamed `lock_exclusive` to `lock` and `try_lock_exclusive` to `try_lock`, matching std. The grep keeps both spellings, and a blocking `.lock()` on a `File` has to be read by hand. | fs4 CHANGELOG 1.0.0 |
| PLAT-30 | Pinned paragraph: chrono, with no advisory. Verification: three `cargo tree` checks. | The pinned paragraph adds RUSTSEC-2026-0543, the required ignore with its removal condition (the move to jiff 1.x), and the one-change migration. Verification adds `cargo deny check advisories` with the ignore present and `unmaintained` not lowered. | RUSTSEC-2026-0543; jiff CHANGELOG 1.0.0 |
| PERF-18 | ends "its default `miniz_oxide` is the slowest documented option." | Adds: a `default-features = false` pin also drops `runtime_detection`, a default since flate2 1.1.10, so the pin names it. | flate2 `Cargo.toml` and CHANGELOG 1.1.10 |
| PERF-25 | rationale for `--shell=none` only | Adds: hyperfine 2.0 (2026-10-07) made `--shell=none` the default and 1.x did not, so the flag stays spelled out. | hyperfine v2.0.0 release and README |
| TUI-15 | "`unicode-width` is scalar-value width:" | "`UnicodeWidthChar::width` is per scalar value and `UnicodeWidthStr::width` applies the crate's sequence rules ...; neither is font-accurate, so the cluster walk stays." | docs.rs unicode-width 0.2.3, "Rules for determining width" |
| OBS-10 | "`tracing-subscriber` forwards `\n`, `\r`, NUL and the whole `Cf` bidi set" | It names the default ESC/C1 escaping since 0.3.20 and states that an escaped ESC is not evidence the log path is safe. | as SEC-31 |
| OBS-22 | "(`X-Amz-Signature`, `sig`, `Signature`)" | "(`X-Amz-Signature`, `X-Amz-Credential`, `AWSAccessKeyId`, `sig`, `Signature`)" | OTel semconv v1.45.0 changelog (issue 3989), `url.md` and `http-spans.md` at v1.45.0 |
| ERR-09 | "with `allow-unwrap-in-tests`/`allow-expect-in-tests` in `clippy.toml`." | Adds that the key reaches `tests/` integration crates only from Clippy 1.100. | Clippy CHANGELOG 1.100 (PR 16786) |
| API-14 | "several live in nursery/pedantic" and all three set to `warn` | `derive_partial_eq_without_eq` (nursery) is set to `warn`. The other two lints are correctness, deny by default, and are never lowered. Verification blocks (3) and (4) pass when they are absent or set to `deny`. | Clippy lint index (master) |
| ARCH-21 | verification is only the grep | Adds: on Cargo 1.100+ `cargo check` warns through `cargo::missing_lints_inheritance`. | Cargo lints reference page |
| EVO-9 | high-churn list `rand`, `thiserror`, `reqwest`, `rustls`, `clap` | Adds `syn`. The sweep adds `\.choose_multiple(`. | syn 3.0.0 release; rand CHANGELOG 0.10.0 |
| architecture.md item 12 | "`clippy::pub_use` does not exist (it is `wildcard_imports` plus a config key)" | `clippy::pub_use` is real (restriction, allow by default, since 1.62). Only `--dependency-order` is invented, and `cargo publish --workspace` exists since Cargo 1.90. | Clippy lint index; stable cargo-publish page; Cargo CHANGELOG 1.90 |
| current-apis syn row | "syn 2 `attr.parse_nested_meta(…)`, `attr.meta` / syn 2" | Names syn 3 (2026-07-18) as the current major and its type renames, and points to the pinned major's docs. | syn 3.0.0 release notes |
| performance.md Gungraun line | "Linux-only, mid-rename" | "Linux-only, its API still breaking between minors (0.20.0, 2026-09)" | gungraun v0.20.0 release and CHANGELOG |

Sources lines change to match: zip advisories and cargo-install in security.md, unicode-width in tui.md, assert_cmd and Cargo 1.100 in testing.md, Rust 1.100 and syn 3 in current-apis.md.

### Sources for the Changed rules table

Full URLs for the facts named in the Source column above.

- SEC-07: [RustSec zip advisories](https://rustsec.org/packages/zip.html), [crates.io zip](https://crates.io/crates/zip/versions)
- SEC-25: [cargo-deny CHANGELOG](https://github.com/EmbarkStudios/cargo-deny/blob/main/CHANGELOG.md) (0.22.1)
- SEC-26: [Cargo CHANGELOG](https://doc.rust-lang.org/cargo/CHANGELOG.html) (1.100, PR 17388, [PR link](https://github.com/rust-lang/cargo/pull/17388)), [cargo-install page](https://doc.rust-lang.org/stable/cargo/commands/cargo-install.html)
- SEC-29: [cargo-auditable CHANGELOG](https://github.com/rust-secure-code/cargo-auditable/blob/master/cargo-auditable/CHANGELOG.md) (0.7.8)
- SEC-31 and OBS-10: [tracing PR 3368](https://github.com/tokio-rs/tracing/pull/3368), [escape.rs](https://raw.githubusercontent.com/tokio-rs/tracing/main/tracing-subscriber/src/fmt/format/escape.rs)
- SEC-36: [console releases](https://github.com/console-rs/console/releases) (0.16.6)
- STATE-9: [fs4 CHANGELOG](https://github.com/al8n/fs4-rs/blob/main/CHANGELOG.md) (1.0.0)
- PLAT-30: [RUSTSEC-2026-0543](https://rustsec.org/advisories/RUSTSEC-2026-0543.html), [jiff CHANGELOG](https://github.com/BurntSushi/jiff/blob/master/CHANGELOG.md) (1.0.0)
- PERF-18: [flate2 Cargo.toml](https://github.com/rust-lang/flate2-rs/blob/main/Cargo.toml), [flate2 CHANGELOG](https://github.com/rust-lang/flate2-rs/blob/main/CHANGELOG.md) (1.1.10)
- PERF-25: [hyperfine v2.0.0 release](https://github.com/sharkdp/hyperfine/releases/tag/v2.0.0), [README at v2.0.0](https://raw.githubusercontent.com/sharkdp/hyperfine/v2.0.0/README.md)
- TUI-15: [docs.rs unicode-width 0.2.3](https://docs.rs/unicode-width/0.2.3/unicode_width/)
- OBS-22: [semantic-conventions issue 3989](https://github.com/open-telemetry/semantic-conventions/issues/3989), [url.md at v1.45.0](https://raw.githubusercontent.com/open-telemetry/semantic-conventions/v1.45.0/docs/registry/attributes/url.md), [http-spans.md at v1.45.0](https://raw.githubusercontent.com/open-telemetry/semantic-conventions/v1.45.0/docs/http/http-spans.md)
- ERR-09: [Clippy CHANGELOG](https://github.com/rust-lang/rust-clippy/blob/master/CHANGELOG.md) (1.100), [PR 16786](https://github.com/rust-lang/rust-clippy/pull/16786)
- API-14 and architecture.md item 12: [Clippy lint index](https://clippy.rust-lang.org/master/index.html), [Clippy CHANGELOG](https://github.com/rust-lang/rust-clippy/blob/master/CHANGELOG.md), [cargo-publish page](https://doc.rust-lang.org/stable/cargo/commands/cargo-publish.html), [Cargo CHANGELOG](https://doc.rust-lang.org/cargo/CHANGELOG.html) (1.90)
- ARCH-21: [Cargo lints reference](https://doc.rust-lang.org/stable/cargo/reference/lints.html)
- EVO-9 and the rand row: [syn 3.0.0 release](https://github.com/dtolnay/syn/releases/tag/3.0.0), [rand CHANGELOG](https://github.com/rust-random/rand/blob/master/CHANGELOG.md) (0.10.0)
- current-apis syn row: [syn 3.0.0 release](https://github.com/dtolnay/syn/releases/tag/3.0.0)
- performance.md Gungraun: [gungraun v0.20.0 release](https://github.com/gungraun/gungraun/releases/tag/v0.20.0), [CHANGELOG](https://raw.githubusercontent.com/gungraun/gungraun/main/CHANGELOG.md)

## New rules

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SEC-41 | Never hand a registry-supplied archive to a library's whole-archive extractor (`ZipArchive::extract`, `extract_unwrapped_root_dir`, `ZipStreamReader::extract`, `tar::Archive::unpack`). Iterate entries and write each through SEC-08 and SEC-10. A `ZipStreamReader` over registry content sets `enforce_header_consistency(true)`. An archive is never inspected with `ZipArchive` and then extracted with `ZipStreamReader`. | RUSTSEC-2026-0546 (zip 7.2.0 to 8.x) and RUSTSEC-2026-0425 (nix-nar) repeat the 2025 zip escape. Each returns `Ok(())` from a documented-safe entry point. RUSTSEC-2026-0548 is a local-header versus central-directory parser differential, and its check is off by default. | Block SEC-41 greps `\.extract\(`, `extract_unwrapped_root_dir`, `\.unpack\(` and `ZipStreamReader`. Every hit must sit in the vetted extraction module, and every `ZipStreamReader` hit must set `enforce_header_consistency(true)` at the same call site. | MUST |
| TEST-42 | Integration tests reach the binary under test through `CARGO_BIN_EXE_<name>`, using `env!`, `assert_cmd::cargo::cargo_bin!`, or `Command::cargo_bin`, which reads that variable first. They never use a path assembled under `target/` or from `current_exe()`. | Cargo 1.100 moved intermediate artifacts to a new build-dir layout and states that the layout is not a stable interface. The assert_cmd fallback derives the path from `current_exe()`, which is the old layout. | Block TEST-42 greps test sources for `target/debug/`, `target/release/` and `current_exe\(\)`. Each hit needs an explaining comment. | SHOULD |

The SEC-41 grep is noisy on generic `.extract(` names. Its pass condition is location-based, not zero hits. TEST-42 is phrased as "do not depend on the layout", not "`cargo_bin` breaks on 1.100". The sources could not confirm the breakage, only that the layout is declared unstable.

## Confirmed unchanged

- **Toolchain.** Stable on 2026-11-27 is 1.100.1. Every Since value in current-apis.md is confirmed against RELEASES.md. `gen` blocks are still unstable. There is no stable `AsyncDrop`. No `nonpoison` Mutex is stable. `error_generic_member_access` and `doc_cfg` are still nightly. Native `async fn` in traits is still not dyn-compatible. `#[bench]` is still nightly. SIGPIPE is still set to `SIG_IGN` before `main`. `text_direction_codepoint_*` is still deny-by-default. The std Windows `is_symlink`, `read_link` and `rename` behaviour is unchanged. There is no 2027 edition. The pair contains no "1.89" frame label.
- **LazyLock.** Poisoning is still unrecoverable. The optional `LazyLock::get`/`get_mut` (1.94) extension was declined as unneeded for the rule.
- **Clippy groups and defaults.** All of these are unchanged: `wildcard_imports`, `allow_attributes`, `let_underscore_lock`, `let_underscore_future`, `arc_with_non_send_sync`, `clone_on_ref_ptr`, `unwrap_used`/`expect_used`/`panic`, `result_large_err`, `missing_errors_doc`/`missing_panics_doc`, the three `await_holding_*` lints, `undocumented_unsafe_blocks` (it checks presence only), `missing_safety_doc`, `arithmetic_side_effects`, `as_conversions`, `join_absolute_paths` and `large_enum_variant`. No lint mechanizes API-02 or STATE-23, so their greps stay.
- **Cargo.** SEC-30 `overflow-checks` is still false in release. PERF-16 release defaults are unchanged. SEC-28 still has no build-script sandbox. TEST-35 dev-edge unification and TEST-36 virtual-workspace resolver are unchanged. ARCH-21 "not inherited" still holds. EVO-15 is not contradicted.
- **Crates.**
  - rand 0.9/0.10 rows, thiserror 2 rows, EVO-14 and the clap 4 row are unchanged (clap 5 is gated behind `unstable-v5`).
  - The reqwest 0.13 rows, the TLS pin and EVO-10 are unchanged.
  - SEC-15: its grep `danger_accept_invalid` already matches the new `tls_danger_accept_invalid_certs` spelling.
  - SEC-16, PKG-14 and PKG-15 are unchanged. The secrecy 0.10 rows are unchanged (no `Secret<T>`).
- **Runtime and filesystem.**
  - ASYNC-07, -09, -10, -13, -15 and -18 are unchanged. So are PKG-22 and PERF-27.
  - The "no `parking_lot`" decision stands as policy; parking_lot 0.13 was not re-measured.
  - STATE-3 tempfile `persist` is unchanged.
  - PERF-12: the mmap ban holds. memmap2 0.9.12 `map_if_safe` returns `None` for multi-writer store files.
  - PERF-19 foldhash is unchanged.
  - DATA-DET-03 `preserve_order` and DATA-FMT-10 toml_edit are unchanged.
  - PLAT-10 fs-err, PLAT-05/06 dunce, PLAT-40/TEST-28/SEC-10 cap-std, and PLAT-24/CLI-13 directories/etcetera are unchanged.
- **Supply chain and specs.**
  - SEC-07 tar floor is unchanged.
  - SEC-25 keys (`unsound = "all"`, `unmaintained = "workspace"`, `[sources]`, `[[bans.deny]]`) are still valid.
  - The pinned decision to use `cargo deny check` with `cargo audit bin` is unchanged.
  - SEC-29 `gh attestation verify` is unchanged.
  - SEC-34 sanitizer crates and SEC-40 `anstream` are unchanged.
  - SEC-06 and TEST-21 Miri are unchanged as a default statement.
  - The OCI claims (DATA-DIG-02, PKG-17, SEC-19, OBS-23) are unchanged, and neither spec has a new release.
- **Test and bench tooling.** TEST-22 and DOC-08 (nextest has no doctests) are unchanged. So are TEST-23, TEST-38, TEST-24 (tarpaulin ptrace, llvm-cov `--branch` unstable, `--fail-under-lines`), TEST-20, TEST-37, TEST-26, TEST-33, TEST-17, TEST-18, TEST-32, TEST-39, PERF-03, PERF-05 (the pair already names `std::hint::black_box`), PERF-07, PERF-08, DOC-15 and DOC-17. No verification parses hyperfine JSON or `--show-missing-lines` output.
- **Tracing and TUI.** The tracing family, ratatui 0.30.2 and crossterm 0.29.0 have no release in the window. OBS-03, OBS-04, OBS-06, OBS-11, OBS-13, OBS-14, OBS-16, OBS-24 and OBS-25 are unchanged. OBS-12 is unchanged, because opentelemetry is still 0.33 and its traces are Beta. OBS-20 field names are unchanged. OBS-22 still treats a credential-free `url.full` as a MUST. TUI-19, TUI-05, TUI-24 and SEC-38 are unchanged for released versions.

## Open questions

1. Clippy `unused_async_trait_impl` (pedantic, 1.98): the lint page was not read, so it is not added to the `#[async_trait]` row's tell.
2. vergen 10.0.3 to 10.1.0 (OBS-15): the changelog returned 404 at both paths tried, so the API drift could not be determined.
3. The ratatui.rs recipes (TEA/Component/Flux neutrality, `insta` as the official recipe) were not re-fetched.
4. TUI-08 versus `ratatui::init`, which installs its own restoring panic hook. This is a design question, not a dated fact change. The rule stays as written until someone decides whether the helper may replace the hand-rolled guard.
5. The stable release that stabilized std `File::lock`/`try_lock` was not read from a release note. STATE-9 names the std methods only as sharing fs4's names.
6. syn 3: the artifacts did not confirm against syn 3 docs that `parse_nested_meta` and `attr.meta` carry over unchanged. The new row points to the pinned major's docs instead.
7. zip 9.x: it is unknown whether `ZipArchive`, `enclosed_name` or `extract` changed shape for the 2.x to 9.x move. The zip 9 series is also moving fast (9.8.2 on 2026-11-23).
8. cargo-deny `ignore-expiry`, per-entry `expiry`, `ignore.allow` and `patched` (0.21.0 to 0.22.1) are days old. They are a candidate machine-checkable form for SEC-25's removal condition at the next refresh.
9. distribution-spec main now makes the upload `Location` a MUST-use-verbatim (PR 619), but this text is unreleased. The PKG-17 change waits for a tagged release.
10. ghcr.io conditional manifest PUT (`If-None-Match: *` returning `412`) could not be determined without a live test.
11. Whether `text_direction_codepoint_*` runs at lex time only could not be re-verified, because the lint source fetch returned 404. SEC-37 stays as written.
12. SEC-34 scope for local file names printed after TUI exit rests on a distro bug tracker (dua-cli, CVE-2026-73479, status NEW), with no advisory. It is not adopted.
13. `assert_cmd` `Command::cargo_bin` behaviour under the Cargo 1.100 build-dir layout is unconfirmed (see TEST-42).
14. The consolidation-only open questions are answered but do not touch the pair:
    - sigstore-rs is still 0.15.1, "not stable until 1.0".
    - `unicode-security` 0.1.3 has no bidi coverage.
    - `wildcard_imports` exempts `prelude` modules.
    - `unsafe_derive_deserialize` is pedantic, not nursery.
    - The jiff 1.0 trigger has fired.

## Revision log

1. SEC-07: zip floor 2.3.0 to 9.0.5, with the 2026 advisories cited.
2. SEC-41: new rule against whole-archive extractors and for zip stream-reader header consistency.
3. SEC-25: cargo-deny 0.22.1 floor.
4. SEC-26: corrected the `cargo install` lockfile reason for Cargo 1.100.
5. SEC-29: cargo-auditable 0.7.8 floor.
6. SEC-31: named `tracing-subscriber`'s default ESC/C1 escaping.
7. SEC-36: console 0.16.6 floor for `truncate_str`.
8. security.md agent item 5 and sources: matched SEC-07 and SEC-26.
9. STATE-9: corrected the fs4 1.0 rename sentence.
10. PLAT-30 and pinned paragraph: chrono unmaintained advisory handling and the jiff 1.0 migration condition.
11. PERF-18: `runtime_detection` in a pinned flate2 feature list.
12. PERF-25: hyperfine 2.0 default.
13. performance.md pinned decision: Gungraun status.
14. TUI-15 and its source line: `unicode-width` char versus str semantics.
15. OBS-10: `tracing-subscriber` escaping.
16. OBS-22: added `X-Amz-Credential` and `AWSAccessKeyId`.
17. ERR-09: `allow-unwrap-in-tests` scope by Clippy version.
18. API-14: corrected the lint groups and the matching verification.
19. ARCH-21: `cargo::missing_lints_inheritance`.
20. architecture.md item 12: `clippy::pub_use` exists.
21. TEST-42: new rule for locating the binary via `CARGO_BIN_EXE_<name>`.
22. testing.md sources: assert_cmd forms and the Cargo 1.100 changelog.
23. current-apis.md: syn 3 row.
24. current-apis.md: rand 0.10 sampling row, never-type row and `DropGuard` row.
25. EVO-9: added `syn` and a `choose_multiple` sweep needle.
26. current-apis.md sources: syn 3.0.0 and Rust 1.100.0.

## Edit list

Paths are relative to the repository root. For a replacement, find the text in the first block and replace it with the text in the second. For an insertion, insert the second block as new line(s) directly after the line that contains the anchor. Every find text below occurs exactly once in its file.

### 1. skills/rust-quality-reference/security.md (replace)

Find:

```
| SEC-07 | Pin explicit version floors `tar >= 0.4.45` and `zip >= 2.3.0`, not "latest compatible" — both crates shipped symlink-driven escapes in their *documented-safe* entry points. | `cargo tree -i tar -i zip` | MUST |
```

Replace with:

```
| SEC-07 | Pin explicit version floors `tar >= 0.4.45` and `zip >= 9.0.5`, not "latest compatible" — both crates shipped symlink-driven escapes in their *documented-safe* entry points, and zip did it twice: 7.2.0 to 8.x re-opened `ZipArchive::extract` after the 2.3.0 fix (RUSTSEC-2026-0546), and 9.0.5 is the first release clear of the October 2026 batch. | `cargo tree -i tar -i zip` shows `tar >= 0.4.45` and `zip >= 9.0.5` | MUST |
```

### 2. skills/rust-quality-reference/security.md (insert after anchor)

Anchor (the SEC-12 row; the line begins with):

```
| SEC-12 | Set `0600` on credential/lock files and `0700` on their directories explicitly at creation
```

Insert after that line:

```
| SEC-41 | Never hand a registry-supplied archive to a library's whole-archive extractor (`ZipArchive::extract`, `extract_unwrapped_root_dir`, `ZipStreamReader::extract`, `tar::Archive::unpack`); iterate entries and write each through SEC-08 and SEC-10, so a library's own containment check is never the control. A `ZipStreamReader` over registry content sets the `enforce_header_consistency(true)` read option (zip 9.0.5, off by default), and an archive is never inspected with `ZipArchive` and then extracted with `ZipStreamReader` — the two read different name tables. | see block SEC-41 — every hit sits in the vetted extraction module, and every `ZipStreamReader` hit sets `enforce_header_consistency(true)` at the same call site | MUST |
```

### 3. skills/rust-quality-reference/security.md (insert after anchor)

Anchor (the SEC-12 grep line, unique):

```
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.rs' ':(exclude,glob)external/**' | xargs -0 -r grep -H -n -E -e '0o600' -e '0o700' --
```

Insert after that line:

```
# SEC-41
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.rs' ':(exclude,glob)external/**' | xargs -0 -r grep -H -n -E -e '\.extract\(' -e 'extract_unwrapped_root_dir' -e '\.unpack\(' -e 'ZipStreamReader' --
```

### 4. skills/rust-quality-reference/security.md (replace)

Find:

```
Gating `unmaintained` as hard as `unsound` produces the noise that gets the gate disabled. | `cargo deny check`; see block SEC-25 | MUST |
```

Replace with:

```
Gating `unmaintained` as hard as `unsound` produces the noise that gets the gate disabled. Run cargo-deny 0.22.1 or later: earlier versions could suppress an `unsound` or `unmaintained` advisory when the workspace holds two versions of the affected crate. | `cargo deny check`; `cargo deny --version` reports 0.22.1 or later; see block SEC-25 | MUST |
```

### 5. skills/rust-quality-reference/security.md (replace)

Find:

```
| SEC-26 | Pass `--locked` to every `cargo build`, `cargo test` and `cargo install` in CI, release workflows, scripts and docs — `cargo install` **ignores** the published `Cargo.lock` by default. | see block SEC-26 — every hit carries `--locked` | MUST |
```

Replace with:

```
| SEC-26 | Pass `--locked` to every `cargo build`, `cargo test` and `cargo install` in CI, release workflows, scripts and docs. Before Cargo 1.100 (2026-11-12) `cargo install` **ignored** the published `Cargo.lock` unless `--locked` was passed; from 1.100 it uses the packaged lockfile by default and `--locked` is a harmless no-op there, so the flag stays for every older toolchain a script or a doc reader may run. | see block SEC-26 — every hit carries `--locked` | MUST |
```

### 6. skills/rust-quality-reference/security.md (replace)

Find:

```
| SEC-29 | Build releases with `cargo auditable build --release` and emit GitHub Artifact Attestations;
```

Replace with:

```
| SEC-29 | Build releases with `cargo auditable build --release` (cargo-auditable 0.7.8 or later: earlier versions fail to embed the audit data in large Windows builds on Rust 1.100+) and emit GitHub Artifact Attestations;
```

### 7. skills/rust-quality-reference/security.md (replace)

Find:

```
and `tracing-subscriber` passes `\n`, `\r`, NUL and the whole `Cf` bidi set straight to the terminal (CWE-150).
```

Replace with:

```
and `tracing-subscriber` (0.3.20+) escapes ESC, BEL, BS, FF, DEL and C1 controls by default but still passes `\n`, `\r`, NUL and the whole `Cf` bidi set straight to the terminal (CWE-150).
```

### 8. skills/rust-quality-reference/security.md (replace)

Find:

```
or `console::truncate_str`) — never
```

Replace with:

```
or `console::truncate_str` from console 0.16.6, which stopped panicking on a cut through a multi-byte character) — never
```

### 9. skills/rust-quality-reference/security.md (replace)

Find:

```
5. Writes `cargo install foo` without `--locked`, assuming it respects the
   published lockfile the way `cargo build` does (SEC-26).
```

Replace with:

```
5. Writes `cargo install foo` without `--locked` in a script or doc that an
   older toolchain runs; before Cargo 1.100 that install ignores the
   published lockfile (SEC-26).
```

### 10. skills/rust-quality-reference/security.md (replace)

Find:

```
- [GHSA-94vh-gphv-8pm8 — zip CVE-2025-29787](https://github.com/advisories/GHSA-94vh-gphv-8pm8) — the escape past `enclosed_name()`, sets the 2.3.0 floor
```

Replace with:

```
- [GHSA-94vh-gphv-8pm8 — zip CVE-2025-29787](https://github.com/advisories/GHSA-94vh-gphv-8pm8) — the escape past `enclosed_name()`, fixed in 2.3.0
- [RustSec zip advisories](https://rustsec.org/packages/zip.html) — RUSTSEC-2026-0546 (the 7.2.0 to 8.x `extract` symlink escape) and RUSTSEC-2026-0548 (stream-reader names that differ from the central directory, fixed in 9.0.5 behind `enforce_header_consistency`) set the 9.0.5 floor and SEC-41
```

### 11. skills/rust-quality-reference/security.md (replace)

Find:

```
- [Cargo Book: cargo-install](https://doc.rust-lang.org/cargo/commands/cargo-install.html) — ignores the published lockfile without `--locked`
```

Replace with:

```
- [Cargo Book: cargo-install](https://doc.rust-lang.org/cargo/commands/cargo-install.html) — uses the packaged lockfile by default from Cargo 1.100; older toolchains ignore it without `--locked`
```

### 12. skills/rust-quality-reference/durable-state.md (replace)

Find:

```
see block STATE-9 — `fs4` renamed `lock_exclusive` to `try_lock`, so a two-spelling grep reports zero on a crate that locks;
```

Replace with:

```
see block STATE-9 — fs4 1.0 renamed `lock_exclusive` to `lock` and `try_lock_exclusive` to `try_lock`, matching std `File::lock`/`try_lock`, so the grep keeps the old and the current spellings; a blocking `.lock()` on a `File` shares its spelling with `Mutex::lock`, so also read every `.lock()` on a value opened from a path;
```

### 13. skills/rust-quality-reference/platform-and-paths.md (replace)

Find:

```
crate, `chrono`, and RFC 3339 with a literal `Z` on every persisted timestamp,
which renders chrono's offset-only serde inert.
```

Replace with:

```
crate, `chrono`, and RFC 3339 with a literal `Z` on every persisted timestamp,
which renders chrono's offset-only serde inert. chrono is flagged unmaintained
(RUSTSEC-2026-0543, issued 2026-11-17), which `unmaintained = "workspace"`
(SEC-25) turns into a `cargo deny check` failure for a direct dependency. Its
`[advisories].ignore` entry names that ID and the removal condition: the move
to jiff 1.x (1.0 shipped 2026-11-15 and renamed `Zoned` to `ZonedDateTime`),
made as one reviewed change that swaps the crate, never by adding jiff beside
chrono.
```

### 14. skills/rust-quality-reference/platform-and-paths.md (replace)

Find:

```
`cargo tree -e normal -i chrono` resolves; `cargo tree -e normal -i jiff` and `cargo tree -e normal -i time` each print nothing — exactly one family | MUST |
```

Replace with:

```
`cargo tree -e normal -i chrono` resolves; `cargo tree -e normal -i jiff` and `cargo tree -e normal -i time` each print nothing — exactly one family; `cargo deny check advisories` passes with RUSTSEC-2026-0543 ignored under a stated removal condition, never with `unmaintained` lowered | MUST |
```

### 15. skills/rust-quality-reference/performance.md (replace)

Find:

```
  not deferred: Linux-only, mid-rename, and a fix for a noise problem avoided
```

Replace with:

```
  not deferred: Linux-only, its API still breaking between minors (0.20.0,
  2026-09), and a fix for a noise problem avoided
```

### 16. skills/rust-quality-reference/performance.md (replace)

Find:

```
and its default `miniz_oxide` is the slowest documented option. |
```

Replace with:

```
and its default `miniz_oxide` is the slowest documented option. A `default-features = false` pin also drops `runtime_detection`, a default since flate2 1.1.10 (2026-08-28), so the pinned feature list names it beside the backend. |
```

### 17. skills/rust-quality-reference/performance.md (replace)

Find:

```
and a hand-rolled loop re-adds fork/exec to every sample. |
```

Replace with:

```
and a hand-rolled loop re-adds fork/exec to every sample. hyperfine 2.0 (2026-10-07) made `--shell=none` the default and 1.x did not, so the flag stays spelled out. |
```

### 18. skills/rust-quality-reference/tui.md (replace)

Find:

```
`unicode-width` is scalar-value width: `chars().count()` measures a CJK name at half its rendered width and can cut a combining sequence in half.
```

Replace with:

```
`UnicodeWidthChar::width` is per scalar value and `UnicodeWidthStr::width` applies the crate's sequence rules (`\r\n`, ZWJ and emoji sequences); neither is font-accurate, so the cluster walk stays. `chars().count()` measures a CJK name at half its rendered width and can cut a combining sequence in half.
```

### 19. skills/rust-quality-reference/tui.md (replace)

Find:

```
— scalar-value width vs the grapheme-cluster iterator TUI-15 requires
```

Replace with:

```
— per-char versus sequence-aware `str` width, and the grapheme-cluster iterator TUI-15 requires
```

### 20. skills/rust-quality-reference/docs-and-tracing.md (replace)

Find:

```
`tracing-subscriber` forwards `\n`, `\r`, NUL and the whole `Cf` bidi set straight to the terminal (CWE-150).
```

Replace with:

```
`tracing-subscriber` (0.3.20+) escapes ESC, BEL, BS, FF, DEL and C1 controls by default but still forwards `\n`, `\r`, NUL and the whole `Cf` bidi set straight to the terminal (CWE-150), so an escaped ESC is not evidence the log path is safe.
```

### 21. skills/rust-quality-reference/docs-and-tracing.md (replace)

Find:

```
(`X-Amz-Signature`, `sig`, `Signature`)
```

Replace with:

```
(`X-Amz-Signature`, `X-Amz-Credential`, `AWSAccessKeyId`, `sig`, `Signature`)
```

### 22. skills/rust-quality-reference/errors.md (replace)

Find:

```
with `allow-unwrap-in-tests`/`allow-expect-in-tests` in `clippy.toml`.
```

Replace with:

```
with `allow-unwrap-in-tests`/`allow-expect-in-tests` in `clippy.toml` (`allow-unwrap-in-tests` reaches `tests/` integration-test crates only from Clippy 1.100, so an older pin flags `unwrap` there under `--all-targets`).
```

### 23. skills/rust-quality-reference/api-and-idioms.md (replace)

Find:

```
| API-14 | Add `derive_partial_eq_without_eq`, `derived_hash_with_manual_eq` and `derive_ord_xor_partial_ord` at `warn` to `[workspace.lints.clippy]`, and re-audit that table each toolchain bump — several live in nursery/pedantic, so a bare `cargo clippy` never surfaces them, and clippy moves lints between groups. | see block API-14, which locates the table. Then one command per lint, because a union hit count of three proves nothing: see block API-14 (2); see block API-14 (3); see block API-14 (4) — each must return a line reading `warn` or stronger; an empty result for any one is the finding.
```

Replace with:

```
| API-14 | Add `derive_partial_eq_without_eq` at `warn` to `[workspace.lints.clippy]` — it is nursery, so a bare `cargo clippy` never surfaces it — and never lower `derived_hash_with_manual_eq` or `derive_ord_xor_partial_ord`, which are correctness lints, deny by default. Re-audit that table each toolchain bump, because clippy moves lints between groups. | see block API-14, which locates the table. Then one command per lint, because a union hit count proves nothing: see block API-14 (2) — must return a line reading `warn` or stronger, and an empty result is the finding; see block API-14 (3) and API-14 (4) — each must return nothing or a line reading `deny`, and a `warn` or `allow` is the finding.
```

### 24. skills/rust-quality-reference/architecture.md (replace)

Find:

```
see block ARCH-21 — every member it lists is missing the opt-in; the workspace root manifest is not a member, so ignore it | MUST |
```

Replace with:

```
see block ARCH-21 — every member it lists is missing the opt-in; the workspace root manifest is not a member, so ignore it. On Cargo 1.100+ `cargo check` also reports a missing opt-in through the warn-by-default `cargo::missing_lints_inheritance` lint | MUST |
```

### 25. skills/rust-quality-reference/architecture.md (replace)

Find:

```
12. **Hallucinated tooling.** `clippy::pub_use` does not exist (it is
    `wildcard_imports` plus a config key); `cargo publish --workspace
    --dependency-order` has no such flag. Also: an in-memory FS double proves
```

Replace with:

```
12. **Hallucinated tooling.** `cargo publish --workspace
    --dependency-order` has no such flag: `--workspace` exists (Cargo 1.90)
    and already publishes in dependency order. The inverse error is as
    common: `clippy::pub_use` is real (restriction group, allow by default,
    since 1.62), so check a lint name against the Clippy index before calling
    it invented. Also: an in-memory FS double proves
```

### 26. skills/rust-quality-reference/testing.md (insert after anchor)

Anchor (the TEST-41 row; the line begins with):

```
| TEST-41 | Locate fixtures and golden files with `concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures/…")`
```

Insert after that line:

```
| TEST-42 | Integration tests reach the binary under test through `CARGO_BIN_EXE_<name>` — `env!`, `assert_cmd::cargo::cargo_bin!`, or `Command::cargo_bin`, which reads that variable first — never through a path assembled under `target/` or from `current_exe()`. Cargo 1.100 (2026-11-12) moved intermediate artifacts to a new build-dir layout and documents the layout as not a stable interface. | see block TEST-42 — every hit carries a comment explaining why the variable cannot serve | SHOULD |
```

### 27. skills/rust-quality-reference/testing.md (insert after anchor)

Anchor (the TEST-41 grep line, unique):

```
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.rs' | xargs -0 -r grep -H -n -E -e '"\./' -e '"tests/' --
```

Insert after that line:

```
# TEST-42
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/tests/**/*.rs' ':(exclude,glob)external/**' | xargs -0 -r grep -H -n -E -e 'target/debug/' -e 'target/release/' -e 'current_exe\(\)' --
```

### 28. skills/rust-quality-reference/testing.md (replace)

Find:

```
- [assert_cmd](https://github.com/assert-rs/assert_cmd) — `Command::cargo_bin`, separate exit-code and stream assertions
```

Replace with:

```
- [assert_cmd](https://github.com/assert-rs/assert_cmd) — `Command::cargo_bin` and the `cargo_bin!` macro (both current; the 2.1.0 deprecation was reverted in 2.1.3), separate exit-code and stream assertions
- [Cargo CHANGELOG](https://doc.rust-lang.org/cargo/CHANGELOG.html) — the 1.100 build-dir layout, declared not a stable interface (TEST-42)
```

### 29. skills/rust-quality-reference/current-apis.md (replace)

Find:

```
| `syn::Meta`/`NestedMeta` attribute walking, `syn::export` | syn 2 `attr.parse_nested_meta(…)`, `attr.meta` | syn 2 | proc-macro crate that will not build against syn 2 |
```

Replace with:

```
| `syn::Meta`/`NestedMeta` attribute walking, `syn::export` | syn 2 `attr.parse_nested_meta(…)`, `attr.meta`; syn 3 then renamed `Type::BareFn` to `Type::FnPtr`, replaced `Signature::unsafety` with a `Safety` enum and moved `Arm::guard` into `Pat::Guard` — read the pinned major's docs | syn 2; **syn 3**, Jul 2026 | proc-macro crate that will not build against the pinned syn |
```

### 30. skills/rust-quality-reference/current-apis.md (insert after anchor)

Anchor (the rand 0.10 row; the line begins with):

```
| `rand::rngs::OsRng`, the `Rng` trait, `os_rng` feature |
```

Insert after that line:

```
| `choose_multiple`, `choose_multiple_array`, `choose_multiple_weighted`, `SeedableRng::from_os_rng`, the `small_rng` feature | `sample`, `sample_array`, `sample_weighted`, `sample_fill`; `from_os_rng` and the `small_rng` feature are gone | **rand 0.10**, Feb 2026 | method or feature not found after a rand bump |
```

### 31. skills/rust-quality-reference/current-apis.md (insert after anchor)

Anchor (the `#[expect]` row; the line begins with):

```
| `#[allow(lint)]` | `#[expect(lint, reason = "…")]`
```

Insert after that line:

```
| `std::convert::Infallible` as the only uninhabited type; code leaning on `()` never-type fallback | `!` is stable and `Infallible` is an alias of it; never-type fallback is `!` on every edition | 1.100 | new unreachable-code warnings or inference errors after bumping a pre-2024 crate to 1.100 — a real signal, never an `#[allow]` (EVO-7) |
| `scopeguard`, or a hand-rolled guard whose `Drop` only calls a stored closure | `core::mem::DropGuard` — runs the closure on drop, `dismiss` disarms it on success | 1.100 | a `Drop` impl whose whole body is a stored closure call |
```

### 32. skills/rust-quality-reference/current-apis.md (replace)

Find:

```
| EVO-9 | Before calling into a high-churn crate (`rand`, `thiserror`, `reqwest`, `rustls`, `clap`), read the pinned version from `Cargo.lock` and check the API against *that version's* docs. Never generate symbol names from memory. | see block EVO-9, then `docs.rs/<crate>/<version>`; stale-name sweep `git grep -n -e 'thread_rng()' -e '\.gen()' -e '\.gen_range(' -e 'rand::distributions' -e 'rand::rngs::OsRng' -- '*.rs'` | MUST |
```

Replace with:

```
| EVO-9 | Before calling into a high-churn crate (`rand`, `thiserror`, `reqwest`, `rustls`, `clap`, `syn`), read the pinned version from `Cargo.lock` and check the API against *that version's* docs. Never generate symbol names from memory. | see block EVO-9, then `docs.rs/<crate>/<version>`; stale-name sweep `git grep -n -e 'thread_rng()' -e '\.gen()' -e '\.gen_range(' -e 'rand::distributions' -e 'rand::rngs::OsRng' -e '\.choose_multiple(' -- '*.rs'` | MUST |
```

### 33. skills/rust-quality-reference/current-apis.md (insert after anchor)

Anchor (the line begins with):

```
- [Rust 1.88.0](https://blog.rust-lang.org/2025/06/26/Rust-1.88.0/)
```

Insert after that line:

```
- [Rust 1.100.0](https://blog.rust-lang.org/2026/11/12/Rust-1.100.0/) — the never type, `Infallible` as its alias, the all-edition fallback change, `core::mem::DropGuard`
```

### 34. skills/rust-quality-reference/current-apis.md (insert after anchor)

Anchor (the line begins with):

```
- [rand CHANGELOG](https://github.com/rust-random/rand/blob/master/CHANGELOG.md)
```

Insert after that line:

```
- [syn 3.0.0](https://github.com/dtolnay/syn/releases/tag/3.0.0) — the syn 3 breaking renames
```

## Spillover round

Input: `.agents/research/refresh-2026-11/rust-quality/spillover-check.md`, which carries four items from the code-docs and rust-cargo pairs: three confirmed by a primary source, none unconfirmed, and one the target already states correctly.

### Verdict

1. No file changes. The rule file and the reference skill stay exactly as the first round left them. Rule bump: none. Skill bump: none from this round; the first round's minor bump stands.
2. None of the four items makes a statement in the target false on 2026-11-27. Each confirmed item is an optional addition, and each fails the bar for a new or changed rule, for the reasons under Declined.
3. Item 2 (never-type fallback is `!` on every edition from Rust 1.100) is already stated by the current-apis.md row that the first round added. The rust-cargo part of that item concerns the toolchain-bump commit and belongs to the rust-cargo target.

### Changed rules

None.

### New rules

None. No new ID is used. The next free IDs stay as the first round left them (SEC-42, TEST-43, and so on per family).

### Declined

| Item | Primary source | Reason |
|---|---|---|
| 1. rustdoc `invalid_markdown_table` (Rust 1.100, warn by default) and `unused_footnote_definition` (Rust 1.99) | Rust RELEASES.md 1.100.0 and 1.99.0; rustdoc book lints page | DOC-09 stays true: its `RUSTDOCFLAGS="-D warnings"` gate already turns both lints into errors. A sentence that names lints the gate already enforces adds no control, which is the same test the first round applied to advisories (Verdict item 7). The default level of `unused_footnote_definition` is also unconfirmed. |
| 2. Never-type fallback changed to `!` on all editions (Rust 1.100) | Rust RELEASES.md 1.100.0, Compatibility Notes | Already correct. The current-apis.md never-type row states the change and the warning to expect after a bump. |
| 3. `dead_code_pub_in_binary` (Rust 1.97, allow by default) | Rust RELEASES.md 1.97.0, Language | No claim is false: ARCH-15 and the `unreachable_pub = "warn"` snippet stay correct. Adding the lint to the recommended lint table is a new policy, and its only primary evidence is a one-line release note. Its lint documentation (scope, false-positive profile, interaction with `unreachable_pub`) was not read, so the suggested wording "flags what `unreachable_pub` does not" is the checker's inference, not a sourced fact. Candidate for the next refresh once the lint page is read. |
| 4. nextest 0.9.150 fixes GHSA-vc25-qg58-w57c; advice to set `nextest-version = "0.9.150"` | nextest changelog, Version 0.9.150 (2026-10-26) | No claim is false: the target never enables nextest's experimental run recording, and the exposure needs that feature together with `cargo nextest run --rerun` on a malicious recording. Pinning a minimum tool version in `.config/nextest.toml` is tool-pinning policy, which the rust-cargo target owns. The GitHub advisory page itself was not opened. |

### Sources

No change was made, so there are no source rows for changes. The declined items rest on:

- [Rust RELEASES.md](https://raw.githubusercontent.com/rust-lang/rust/master/RELEASES.md) (1.97.0, 1.99.0, 1.100.0)
- [rustdoc lints](https://doc.rust-lang.org/rustdoc/lints.html)
- [nextest changelog](https://nexte.st/changelog/) (0.9.150)

No first-round change lacks a source row; none of the four items reports one.

### Edit list (spillover round)

Empty. No file under `rules/` or `skills/rust-quality-reference/` changes in this round.
