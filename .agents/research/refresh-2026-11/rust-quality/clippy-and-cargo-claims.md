---
title: Clippy and Cargo claims, delta check 2026-08-14 to 2026-11-27
pair: rust-quality
date_researched: 2026-11-27
window_start: 2026-08-14
model: sonnet
sources_fetched: 12
---

# Clippy and Cargo claims, delta check

Scope: only the claims listed in the commission. Lint policy, toolchain pinning, CI design and release profiles belong to the rust-cargo sibling. In-window Clippy releases are Rust 1.98 (2026-08-20), 1.99 (2026-10-01) and 1.100 (2026-11-12); Cargo has the same three. The Clippy lint index was read from the master build (`clippy.rust-lang.org/master/index.html`), which can be slightly ahead of stable 1.100, so a lint's state is "as of master on 2026-11-27".

## Summary

- Result: one real Cargo change (SEC-26), one pre-existing factual error (architecture.md item 12, `clippy::pub_use`), and no Clippy group or default change that touches any listed lint.
- SEC-26 is changed: since Cargo 1.100 (released 2026-11-12) `cargo install` uses the `Cargo.lock` in the `.crate` tarball by default.
- Item 12 is wrong, and was wrong before the window: `clippy::pub_use` exists (restriction, allow, added 1.62.0).
- Clippy group moves in the window: only `empty_enums` (pedantic to nursery, 1.98) and, just before the window, `nonminimal_bool` and `overly_complex_bool_expr` (1.97, released 2026-07-09). None is cited by this pair.
- No lint has landed for API-02 (secret-bearing `Debug` derive) or STATE-23 (single-site `Arc<Mutex<T>>`). The greps stay.
- New Cargo item relevant to ARCH-21: stable Cargo 1.100 ships the `cargo::missing_lints_inheritance` lint (warn by default). The "not inherited" statement itself is unchanged.

## Findings

### 1. Per-lint table, group and default level on 2026-11-27

Source for all rows: [Clippy lint index (master)](https://clippy.rust-lang.org/master/index.html); in-window moves checked against the [Clippy CHANGELOG](https://github.com/rust-lang/rust-clippy/blob/master/CHANGELOG.md) sections 1.98, 1.99, 1.100 ("Moves and Deprecations" appears only in 1.98). Version column is the "Added in" value.

| Lint | Group | Default | Added | Claim | Verdict |
|---|---|---|---|---|---|
| `derive_partial_eq_without_eq` | nursery | allow | 1.63.0 | API-14 nursery/pedantic | unchanged |
| `derived_hash_with_manual_eq` | correctness | deny | pre 1.29 | API-14 (corpus placed it in a non-default group?) | unchanged by upstream; see note A |
| `derive_ord_xor_partial_ord` | correctness | deny | 1.47.0 | API-14 | unchanged by upstream; see note A |
| `unsafe_derive_deserialize` | pedantic | allow | 1.45.0 | API-11 open question "still nursery?" | it is pedantic, not nursery; unchanged in window |
| `wildcard_imports` | pedantic | allow | 1.43.0 | IDIOM-05 not on by default | unchanged |
| `allow_attributes` | restriction | allow | 1.70.0 | IDIOM-05 not on by default | unchanged |
| `let_underscore_lock` | correctness | deny | 1.43.0 | IDIOM-05 deny | unchanged |
| `let_underscore_future` | suspicious | warn | 1.67.0 | IDIOM-05 warn | unchanged |
| `arc_with_non_send_sync` | suspicious | warn | 1.72.0 | STATE-21 warn-by-default | unchanged |
| `clone_on_ref_ptr` | restriction | allow | pre 1.29 | STATE-25 | unchanged |
| `missing_debug_implementations` | not a Clippy lint (absent from the index; it is a rustc lint) | allow (rustc) | n/a | API-01 allow-by-default | unchanged; rustc lint, not verified in this run |
| `unwrap_used` | restriction | allow | 1.45.0 | ERR-09 | unchanged |
| `expect_used` | restriction | allow | 1.45.0 | ERR-09 | unchanged |
| `panic` | restriction | allow | 1.40.0 | ERR-09 | unchanged |
| `result_large_err` | perf | warn | 1.65.0 | ERR-08 | unchanged; config `large-error-threshold` default 128, `large-error-ignored` added 1.93 |
| `missing_errors_doc` | pedantic | allow | 1.41.0 | ERR-22 | unchanged |
| `missing_panics_doc` | pedantic | allow | 1.51.0 | ERR-22 | unchanged |
| `await_holding_lock` | suspicious | warn | 1.45.0 | ASYNC-02 | unchanged |
| `await_holding_invalid_type` | suspicious | warn | 1.62.0 | ASYNC-02 | unchanged |
| `await_holding_refcell_ref` | suspicious | warn | 1.49.0 | ASYNC-02 | unchanged |
| `undocumented_unsafe_blocks` | restriction | allow | 1.58.0 | SEC-02 checks presence | unchanged; see note C |
| `missing_safety_doc` | style | warn | 1.39.0 | SEC-02 | unchanged |
| `arithmetic_side_effects` | restriction | allow | 1.64.0 | PKG-02 | unchanged |
| `as_conversions` | restriction | allow | 1.41.0 | PKG-02 | unchanged |
| `join_absolute_paths` | suspicious | warn | 1.76.0 | PLAT-04 literals only | unchanged; see note D |
| `large_enum_variant` | perf | warn | pre 1.29 | PERF-22 | unchanged |
| `pub_use` | restriction | allow | 1.62.0 | architecture.md item 12 "does not exist" | CHANGED claim is false (pre-existing error, not a window change) |

Config keys: `allow-unwrap-in-tests` (default false), `allow-unwrap-in-consts` (default true) and `allow-unwrap-types` (added in 1.95, default empty) exist on `unwrap_used`; `allow-expect-in-tests` and `allow-panic-in-tests` exist in the index. The 1.100 changelog says "[`unwrap_used`]: `allow-unwrap-in-tests` now also applies to integration tests" ([#16786](https://github.com/rust-lang/rust-clippy/pull/16786)), dated 2026-11-12 release. This is a behaviour change to a key ERR-09 names: before 1.100 the key did not cover `tests/` integration-test crates. Status for ERR-09: CHANGED (key semantics widened, 1.100). I could not verify the same widening for `allow-expect-in-tests`; the changelog names only `unwrap_used`.

Note A. API-14 says several of these "live in nursery/pedantic". Only `derive_partial_eq_without_eq` is nursery. `derived_hash_with_manual_eq` and `derive_ord_xor_partial_ord` are correctness, deny by default. If the corpus text lumps them under nursery/pedantic, that is imprecise but was not changed in the window. The only window event touching them: `derive_ord_xor_partial_ord` gained an enhancement in 1.94 (before window). No move occurred in 1.98 to 1.100.

Note C. SEC-02: the index text still says the safety comment must be on the lines directly preceding the block. Config keys `accept-comment-above-attributes` and `accept-comment-above-statement` (both default true) exist. It checks presence and placement of a `// SAFETY:` comment, never its content. 1.95 fixed a false positive for same-line comments in macros (pre-window).

Note D. PLAT-04: the index describes `join_absolute_paths` as "calls to Path::join that start with a path separator" with a literal example; no change to this, last mentioned in the 1.76 changelog. I did not test non-literal arguments, so "literals only" is neither confirmed nor refuted beyond the index text.

### 2. Open questions in the corpus

- IDIOM-05 open question, does `wildcard_imports` exempt a first-party `crate::prelude`: yes. The index states "Wildcard imports are allowed from modules that their name contains prelude", also `pub use` re-exported wildcards and `use super::*` in test modules. `warn-on-all-wildcard-imports = true` disables these exemptions; `allowed-wildcard-imports` is the opt-in list. Unchanged in window (no changelog mention since 1.90).
- API-11 "still nursery?" for `unsafe_derive_deserialize`: it is pedantic.
- ARCH-18: `warn-on-all-wildcard-imports` exists (index, `wildcard_imports` configuration). Unchanged.

### 3. architecture.md item 12 claims

- "`clippy::pub_use` does not exist": false. [Index entry](https://clippy.rust-lang.org/master/index.html) reads "pub_use, restriction, allow, Restricts the usage of `pub use ...`", added 1.62.0 (2022). Pre-existing error; the sentence must be rewritten. The corpus statement "it is `wildcard_imports` plus a config key" is a mis-equation: `pub_use` flags any `pub use`, `wildcard_imports` flags globs.
- "`cargo publish --workspace --dependency-order` has no such flag": unchanged. The [stable cargo-publish page](https://doc.rust-lang.org/stable/cargo/commands/cargo-publish.html) lists `--workspace`, `--package`, `--exclude` and no `--dependency-order`. Multi-package publishing was stabilized in Cargo 1.90 ([changelog](https://doc.rust-lang.org/nightly/cargo/CHANGELOG.html)), so `cargo publish --workspace` exists and orders itself; only the second flag is invented. The item text could mislead if read as "no workspace publish".

### 4. Grep-only rules

- API-02 (no secret-bearing `Debug` derive): no lint. Related Clippy lints in the index are `use_debug`, `missing_fields_in_debug` (pedantic, 1.70), `unnecessary_debug_formatting`; none flags a secret field name or type. Window changelogs list no such new lint (1.98 to 1.100 new lints: none about `Debug` or secrets). Keep the grep. Not replaceable.
- STATE-23 (single-site `Arc<Mutex<T>>`): no lint. Index has `arc_with_non_send_sync`, `mutex_atomic`, `mutex_integer`, `rc_mutex`, `if_let_mutex`, `mut_mutex_lock`; none counts lock sites. Keep the grep. Not replaceable.

### 5. Cargo claims

| Claim | Verdict | Evidence |
|---|---|---|
| SEC-26 `cargo install` ignores published `Cargo.lock` by default | CHANGED | Old: ignores it by default, `--locked` needed. New: since Cargo 1.100 (2026-11-12) "cargo-install: now uses the existing lockfile in the .crate tarball by default. `--locked` in cargo install becomes a no-op" ([changelog, PR #17388](https://doc.rust-lang.org/nightly/cargo/CHANGELOG.html)). The [stable cargo-install page](https://doc.rust-lang.org/stable/cargo/commands/cargo-install.html) now says "By default, Cargo uses the Cargo.lock file included with the package if it is available... The --locked flag does not currently change dependency resolution". Caveat: the same page still says `--locked` "emits a warning" when no lockfile exists, and packages with no lockfile resolve normally. Installs from a toolchain older than 1.100 still ignore the lock. |
| SEC-30 release `overflow-checks` defaults false | unchanged | [Profiles page](https://doc.rust-lang.org/stable/cargo/reference/profiles.html): `[profile.release] overflow-checks = false`, dev true. |
| PERF-16 `lto = false`, `codegen-units = 16` | unchanged for release | Same page: release `lto = false`, `codegen-units = 16`; dev `codegen-units = 256`. New in 1.99: a built-in `debug` profile identical to dev today; dev may later shed debuginfo (1.99 notes). Also 1.99: incremental compilation is disabled by default when `CI` is set. |
| SEC-28 nothing in mainline cargo sandboxes `build.rs` | unchanged | The [build scripts page](https://doc.rust-lang.org/stable/cargo/reference/build-scripts.html) contains no sandbox mechanism; neither 1.98 to 1.100 changelogs mention one. Absence of evidence in docs, not a positive statement from Cargo. |
| TEST-35 dev-edge feature unification | unchanged | Features page: "Dev-dependencies do not activate features unless building a Cargo target that needs them"; resolver page example with `[dev-dependencies] serde features=["std"]`. |
| TEST-36 cargo does not infer the virtual-workspace resolver | unchanged | [Workspaces page](https://doc.rust-lang.org/stable/cargo/reference/workspaces.html): "resolver must be set explicitly in virtual workspaces as they have no package.edition to infer it from". Resolver 3 still requires Rust 1.84+, default for edition 2024. |
| ARCH-21 `[lints]` not inherited | unchanged, plus a new check | Workspaces page still requires `[lints] workspace = true`. New: stable Cargo lint `cargo::missing_lints_inheritance` (group suspicious, warn by default, min rust-version 1.79) "Checks for packages without a lints table while workspace.lints is present" ([Cargo lints page](https://doc.rust-lang.org/stable/cargo/reference/lints.html)); Cargo's own linting was stabilized in 1.100. 1.99 also warns on hyphenated lint names in `[lints]` (e.g. `unexpected-cfgs`) and on `[lints]` in a virtual workspace. |
| EVO-15 resolver 3 does nothing without `rust-version` | unchanged / could not fully determine | Resolver page: resolver 3 changes `resolver.incompatible-rust-versions` default from allow to fallback, and the resolver compares against the package's `rust-version`. I did not find text stating what happens when `rust-version` is absent beyond "does not have a Rust version" examples, so the claim is not contradicted but its absolute form is not confirmed. |

Other Cargo window items relevant to the pair, not previously claimed: stabilized `registry.global-min-publish-age` (dependency cooldown, 1.100), `[lints.cargo]` table with `unused_dependencies`, 1.99 `default-features = false` override on inherited workspace dependencies for edition 2024.

## Normative guidance candidates

1. Rewrite architecture.md item 12 so `clippy::pub_use` is described as a real restriction lint (allow by default, since 1.62) and keep only `--dependency-order` as invented. Rationale: an agent told the lint does not exist will skip a valid re-export gate. Verification: `cargo clippy -- -W clippy::pub_use` runs without "unknown lint".
2. Rewrite SEC-26 to: from Cargo 1.100 `cargo install` uses the published lockfile by default; with older toolchains pass `--locked`; `--locked` is harmless on 1.100+ but still warns with no lockfile. Rationale: the old text is now false on the pinned stable. Verification: `cargo install --path . ` on 1.100 prints no "ignores lockfile" behaviour; `grep -rn -- '--locked'` in release scripts for older pins.
3. Add to ARCH-21 a verification via `cargo::missing_lints_inheritance` (warn by default on stable 1.100; set `[workspace.lints.cargo]` deny to gate). Rationale: replaces manual member scan. Verification: remove `[lints] workspace = true` from one member and confirm `cargo check` warns.
4. ERR-09: note `allow-unwrap-in-tests` covers integration tests only from Clippy 1.100. Rationale: pre-1.100 pins flag `unwrap` in `tests/`. Verification: `cargo clippy --all-targets` on a `tests/*.rs` file with `.unwrap()` under each pinned version.
5. API-14: restate group of the three derive lints precisely (nursery, correctness deny, correctness deny). Verification: `cargo clippy -- -W clippy::derive_partial_eq_without_eq`.

## AI-agent angle

- Training data says `clippy::pub_use` is missing or confuses it with wildcard imports; check: run the lint name.
- Models state `cargo install` ignores `Cargo.lock` (true before 1.100); check: `cargo --version` against 1.100.
- Models assume `[workspace.lints]` inherits; check: `grep -L 'workspace = true'` over member manifests, or the new Cargo lint.
- Models invent a lint for secret `Debug` or `Arc<Mutex>` misuse; check: lint name must appear in the index.

## Contested / evolving

- Clippy group moves are continuous: 1.97 moved `nonminimal_bool` (warn to allow) and `overly_complex_bool_expr` (deny to allow) to pedantic; 1.98 moved `empty_enums` to nursery. API-14's "moves between groups" wording is accurate, and none of this pair's cited lints moved.
- Cargo's linting and `cargo install` lock handling are moving toward Cargo-owned defaults; trend as of 2026-11-12.
- The `debug` profile (1.99) signals dev will change; re-check PERF-16 and SEC-30 dev values at the next refresh.

## Sources

| URL | What | Date/era | Why |
|---|---|---|---|
| https://github.com/rust-lang/rust-clippy/blob/master/CHANGELOG.md (raw) | Clippy changelog 1.98 to 1.100 | to 2026-11-12 | moves, config changes |
| https://clippy.rust-lang.org/master/index.html | Clippy lint index | 2026-11-27 | group and default of every lint |
| https://doc.rust-lang.org/nightly/cargo/CHANGELOG.html | Cargo changelog | to 1.102 draft | SEC-26 change |
| https://doc.rust-lang.org/stable/cargo/commands/cargo-install.html | cargo-install | 1.100 | lockfile default |
| https://doc.rust-lang.org/stable/cargo/commands/cargo-publish.html | cargo-publish | 1.100 | flag list |
| https://doc.rust-lang.org/stable/cargo/reference/profiles.html | profiles | 1.100 | defaults |
| https://doc.rust-lang.org/stable/cargo/reference/resolver.html | resolver | 1.100 | v2/v3, dev edges |
| https://doc.rust-lang.org/stable/cargo/reference/workspaces.html | workspaces | 1.100 | lints, virtual resolver |
| https://doc.rust-lang.org/stable/cargo/reference/build-scripts.html | build scripts | 1.100 | sandbox absence |
| https://doc.rust-lang.org/stable/cargo/reference/features.html | features | 1.100 | dev-dep unification |
| https://doc.rust-lang.org/stable/cargo/reference/lints.html | Cargo lints | 1.100 | missing_lints_inheritance |
| https://doc.rust-lang.org/stable/cargo/reference/manifest.html | manifest | 1.100 | `[lints]` table |

Not done: RELEASES.md Cargo sections were not opened separately (the Cargo Book changelog was used); `missing_debug_implementations` rustc default not fetched; `allow-expect-in-tests` integration-test behaviour not verified; fewer than 12 independent primary sources if the Cargo Book pages are counted as one site.
