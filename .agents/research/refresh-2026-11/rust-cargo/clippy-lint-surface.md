---
title: Clippy lint surface delta, 2026-08 to 2026-11
pair: rust-cargo
date_researched: 2026-11-27
window_start: 2026-08-14
model: sonnet
sources_fetched: 14
---

# Clippy lint surface delta for rules/rust-cargo.md

This is a delta update. The feeding research pinned toolchain 1.95.0. The commission window for Clippy starts on 2026-08-01 because rust-tooling-ci.md is dated only to the month. Items from Rust 1.96 and 1.97, which shipped before that window, are reported separately because the pinned baseline (1.95.0) predates them.

## Stable releases in the window

Source: https://raw.githubusercontent.com/rust-lang/rust/master/RELEASES.md (release headings) and https://releases.rs/.

| Release | Date |
|---|---|
| 1.98.0 | 2026-08-20 |
| 1.98.1 | 2026-09-03 |
| 1.99.0 | 2026-10-01 |
| 1.99.1 | 2026-10-15 |
| 1.100.0 | 2026-11-12 |
| 1.100.1 | 2026-11-27 (stable at research time) |

Before the window but after the 1.95.0 pin: 1.96.0 on 2026-05-28 (1.96.1 on 2026-06-30) and 1.97.0 on 2026-07-09 (1.97.1 on 2026-07-16). Beta is 1.101.0, due 2026-12-24. Clippy ships in step with each Rust release, so Clippy 1.98 through 1.100 are the in-window Clippy versions.

## Sources read

- Clippy CHANGELOG.md on master, full file (sections 1.96 through 1.100 read in full): https://github.com/rust-lang/rust-clippy/blob/master/CHANGELOG.md
- Lint declarations (`declare_clippy_lint!` group) in the master source: `clippy_lints/src/methods/mod.rs`, `indexing_slicing.rs`, `panic_in_result_fn.rs`, `unwrap_in_result.rs`, `dbg_macro.rs`, `panic_unimplemented.rs`, `drop_forget_ref.rs`, `strings.rs`, `operators/mod.rs`, `await_holding_invalid.rs`, `redundant_clone.rs`, `doc/mod.rs`, and `deprecated_lints.rs`, all under https://github.com/rust-lang/rust-clippy/tree/master/clippy_lints/src
- Config definitions: https://github.com/rust-lang/rust-clippy/blob/master/clippy_config/src/conf.rs and the rendered page https://doc.rust-lang.org/clippy/lint_configuration.html
- Clippy README and book usage page: https://github.com/rust-lang/rust-clippy/blob/master/README.md and https://github.com/rust-lang/rust-clippy/blob/master/book/src/usage.md
- Issues #13755, #8458, #13852 and #10246 (issue pages fetched directly).

Limitation: the rendered lint list at https://clippy.rust-lang.org/master/index.html is JavaScript-rendered and `lints.json` is not served at the guessed paths, so group and level were read from the `declare_clippy_lint!` source instead, which is the authoritative origin of that page. The GitHub API was rate-limited, so issue state came from the issue pages' rendered state label and last-updated timestamps.

## Per-claim table

| Claim | Status | Evidence | Release |
|---|---|---|---|
| LINT-05: `unwrap_used`, `expect_used`, `indexing_slicing`, `panic_in_result_fn`, `unwrap_in_result`, `get_unwrap`, `dbg_macro`, `todo`, `unimplemented`, `mem_forget`, `string_slice`, `integer_division`, `arithmetic_side_effects` are named `restriction` lints | unchanged | Every one still declared with group `restriction` in source (for example `pub UNWRAP_USED, restriction`; `pub MEM_FORGET` in `drop_forget_ref.rs`, `restriction`; `pub ARITHMETIC_SIDE_EFFECTS, restriction`). None appears in the 1.96 to 1.100 "Moves and Deprecations" sections. `deprecated_lints.rs` only holds old renames pointing at them (`integer_arithmetic` to `arithmetic_side_effects`, `option_unwrap_used` to `unwrap_used`, `result_expect_used` to `expect_used`), none new. https://github.com/rust-lang/rust-clippy/blob/master/CHANGELOG.md | none |
| LINT-05: `unwrap_used` with `allow-unwrap-in-tests` | changed (behaviour widening, not a rename) | 1.100 changelog: "`unwrap_used`: `allow-unwrap-in-tests` now also applies to integration tests" (PR 16786). Before 1.100, an `unwrap` in a file under `tests/` was not covered by the test allowance. https://github.com/rust-lang/rust-clippy/blob/master/CHANGELOG.md | 1.100.0, 2026-11-12 |
| LINT-05: `arithmetic_side_effects` is noisy, per clippy's own tracker (#13755) | unchanged | #13755 is still open (state label "Open", last updated 2024-12-01, no maintainer resolution). Its title is "Warn about arithmetic before type cast/conversion"; the "really noisy" phrase is in the issue body: "that lint is really noisy". No lint change for `arithmetic_side_effects` in any 1.96 to 1.100 section. https://github.com/rust-lang/rust-clippy/issues/13755 | none |
| LINT-05: `integer_division` | unchanged | Still `restriction` in `operators/mod.rs`. Note a different lint, `integer_division_remainder_used`, was extended in 1.100 (also lints `DivAssign`/`RemAssign`, no longer lints inside macros). That lint is not named by the rule. | 1.100.0 for the sibling lint only |
| LINT-06: `await_holding_lock` and `await_holding_refcell_ref` in `suspicious`, warn by default | unchanged | `pub AWAIT_HOLDING_LOCK, suspicious` and `pub AWAIT_HOLDING_REFCELL_REF, suspicious` in `await_holding_invalid.rs`. No changelog entry in the window. `suspicious` is warn-by-default. | none |
| LINT-13: `redundant_clone` is `nursery` | unchanged (group) / enhancement noted | `pub REDUNDANT_CLONE, nursery` in `redundant_clone.rs`. 1.100 changelog: "`redundant_clone`: detect redundant clones inside loop bodies without aliases" (PR 17495). The group did not change; the lint now fires in more places, which strengthens, not weakens, the "run scoped and time-boxed" wording. | 1.100.0, 2026-11-12 |
| LINT-04: `nursery` is upstream-declared false-positive-prone | unchanged | No change to the group's declared description in the window. `empty_enums` moved INTO nursery in 1.98 (see pedantic row). Not re-fetched: the group description text on the lint list page (JS-rendered). Treat as "could not re-confirm the wording, no change signalled in the changelog". | 1.98.0 for the move |
| LINT-04: pedantic membership | changed (the group grew and shrank) | Net adds and removals in releases after the 1.95.0 pin: 1.96 and 1.97 (pre-window): `manual_assert_eq` added to pedantic; `nonminimal_bool` moved complexity to pedantic; `overly_complex_bool_expr` moved correctness to pedantic (1.97.0, 2026-07-09); `assert_is_empty` listed in the 1.97 section. In window: 1.98 added `with_capacity_zero` and `unused_async_trait_impl`, and moved `empty_enums` out of pedantic into nursery (2026-08-20). 1.99 added `assert_is_empty`, `manual_bit_width` (2026-10-01). 1.100 added no pedantic lint. Group membership therefore does move with the toolchain, which is the premise TOOL-01 relies on. https://github.com/rust-lang/rust-clippy/blob/master/CHANGELOG.md | 1.97.0, 1.98.0, 1.99.0 |
| LINT-09: clippy.toml key `msrv` | unchanged | `msrv("msrv"): Option<RustcVersion>`; docs: "Defaults to the `rust-version` field in Cargo.toml", default "current version". A `clippy.toml` value wins over `Cargo.toml` and a mismatch only warns. https://doc.rust-lang.org/clippy/lint_configuration.html | none |
| LINT-09: `allow-unwrap-in-tests`, `allow-expect-in-tests`, `allow-dbg-in-tests`, `allow-panic-in-tests`, `allow-indexing-slicing-in-tests` | unchanged names and defaults (all `false`), except the 1.100 integration-test widening for `unwrap` | conf.rs: each is `bool = false`, bound to `unwrap_used`, `expect_used`, `dbg_macro`, `panic`, `indexing_slicing` respectively. | 1.100.0 widening only |
| LINT-09: `check-private-items = false` | unchanged | `check_private_items("check-private-items"): bool = false`, affecting `missing_errors_doc`, `missing_panics_doc`, `missing_safety_doc`, `too_long_first_doc_paragraph`, `unnecessary_safety_doc`. Doc text: "Whether to also run the listed lints on private items." | none |
| LINT-09: `disallowed-methods` | unchanged | `disallowed_methods("disallowed-methods"): Vec<DisallowedPath>`; entries accept `path`, `reason`, `replacement` and `allow-invalid` (default `false`). | none |
| LINT-05: `arithmetic-side-effects-allowed` | unchanged | `arithmetic_side_effects_allowed("arithmetic-side-effects-allowed"): Vec<String>`; a sibling `arithmetic-side-effects-allowed-binary` takes `[[lhs, rhs]]` pairs. | none |
| LINT-12: `missing_errors_doc`, `missing_panics_doc` and `check-private-items` | unchanged | Both still `pedantic` in `doc/mod.rs`; both listed under `check-private-items` (default `false`, so private items are skipped). | none |
| LINT-18: "`--fix` implies `--all-targets`" | unchanged, and a nuance to add | README and `book/src/usage.md`: "`--fix` implies `--all-targets`". The CLI help in `src/main.rs` now says "This flag implies `--no-deps` and `--all-targets`", so `--fix` also implies `--no-deps`. | none (nuance already in master) |
| LINT-18: listed `--fix` breakage issues closed? | unchanged | #8458 ("cargo clippy --fix produced uncompilable code"), #13852 (`manual_retain` broken fix) and #10246 (`is_err` owned Result broken fix) all still Open; last updated 2022-02-22, 2024-12-18 and 2023-01-28 respectively. #13755 also Open. | none |
| LINT-16: "clippy has no `--baseline` flag" | unchanged (no native feature found) | No `baseline` or `ratchet` string in the changelog (0 hits), README, or usage book. A web search found no rust-clippy issue or RFC for a warning-count ratchet. The GitHub issue search page could not be read (JS-rendered), so absence of an open issue is not proven; "no feature landed" is. | none |

## Findings outside the commissioned claims

1. Cargo 1.97 added the `build.warnings` config option, and Clippy's usage book now says "Since Cargo 1.97, the recommended way to [fail CI on warnings] is by using the `build.warnings` config option", via `CARGO_BUILD_WARNINGS=deny cargo clippy` or in `.cargo/config.toml`. The `-D warnings` and `RUSTFLAGS` form is documented as the fallback for older Cargo. Source: https://github.com/rust-lang/rust-clippy/blob/master/book/src/usage.md (README CI example also uses `CARGO_BUILD_WARNINGS=deny cargo clippy --all-targets --all-features`). Effect on the pair: LINT-02 and LINT-15 currently say denial comes from `warnings = "deny"` plus `-- -D warnings`. That stays correct for the ratchet split, but the rationale "RUSTFLAGS ... busts the incremental cache" now has an official non-RUSTFLAGS alternative, and the note that `CARGO_BUILD_WARNINGS=deny` also fails on any rustc warning is worth stating. Reported for the Cargo-side researcher to confirm; this agent did not check Cargo's own documentation.
2. `cargo clippy --explain <lint>` was broken and fixed in 1.100 (PR 17632). No claim depends on it.
3. `from_iter_instead_of_collect` deprecated in 1.98 (2026-08-20). Not named in the rule.

## Normative candidates and exact edits

Each carries a rationale and a verification.

### Edit 1: LINT-09 (the test-allowance sentence), optional and low priority

Old text: "The test allowances are what let LINT-05 stay strict without an `#[expect]` per test;"
New text: "The test allowances are what let LINT-05 stay strict without an `#[expect]` per test; from Rust 1.100 `allow-unwrap-in-tests` also covers integration tests under `tests/`;"
Rationale: before 1.100 a pinned toolchain older than 1.100 would still flag `unwrap` in `tests/`; the allowance's reach depends on the pinned version.
Verification: pin `rust-toolchain.toml` to 1.100 or later, add `.unwrap()` in a file under `tests/` with `allow-unwrap-in-tests = true`, run `cargo clippy --workspace --all-targets -- -D clippy::unwrap_used` and confirm exit 0.

### Edit 2: LINT-04 (the TOOL-01 premise sentence), recommended

Old text: "Pedantic is safe here *only* because TOOL-01 freezes group membership."
New text: "Pedantic is safe here *only* because TOOL-01 freezes group membership; membership does move between releases (1.97 added `nonminimal_bool` and `overly_complex_bool_expr`, 1.98 removed `empty_enums`, 1.98 and 1.99 added four more), so a toolchain bump re-captures the LINT-16 baseline."
Rationale: the delta gives concrete evidence for the premise already stated; the rule already says bumps re-capture the baseline in the Lints Stanza, so this edit only adds proof. Skip if the line count is tight.
Verification: `git diff` of the clippy `CHANGELOG.md` sections "Moves and Deprecations" between the old and new pinned releases lists the moves.

### Edit 3: LINT-13, optional

Old text: "It is `nursery` for cause; run it scoped and time-boxed during an explicit clone-reduction change."
New text: no change required. 1.100 made it fire inside loop bodies, so a first run on a pinned 1.100 toolchain finds more; the existing "scoped and time-boxed" wording already covers that.

### Edit 4: LINT-02 and LINT-15, flagged for the Cargo-side pair researcher, not applied here

Add one sentence naming `CARGO_BUILD_WARNINGS=deny` / `[build] warnings = "deny"` (Cargo 1.97 and later) as the officially recommended warning-denial route and noting it denies rustc warnings as well. Rationale: Clippy's book changed its recommendation. Verification: `cargo clippy --workspace --all-targets --locked` with `CARGO_BUILD_WARNINGS=deny` exits non-zero on a deliberate warning, and `grep -n 'RUSTFLAGS' -- .cargo/config.toml` stays empty (LINT-02). Confirm against Cargo's own documentation before editing, since this agent only read the Clippy side.

### No change

LINT-05 (all thirteen names and group), LINT-05 noisy-tracker statement and #13755 status, LINT-06, LINT-09 key names and defaults, LINT-12, LINT-13 group, LINT-16, LINT-18 (both sentences; optionally add "and `--no-deps`"), LINT-04 nursery wording.

## Could not determine

- Exact current wording of the nursery group description on the Clippy lint list page (page is JavaScript-rendered and was not readable). No changelog entry suggests a change.
- Whether any rust-clippy issue or RFC for a native warning baseline exists but is unmerged; the issue search page was not readable.
