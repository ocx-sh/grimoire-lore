---
title: Rust toolchain lint and hover delta, 2026-09-27 to 2026-11-27
pair: code-docs
date_researched: 2026-11-27
window_start: 2026-09-27
model: sonnet
sources_fetched: 12
---

# Rust toolchain lint and hover delta

## Summary

- Current stable is Rust 1.100.1, released 2026-11-27 (1.100.0 on 2026-11-12). Clippy 1.100 is the matching clippy.
- The guards.md stamp "rustc and clippy 1.93.1" was already six minor releases behind on 2026-09-27: 1.98.1 (2026-09-03) was stable then, and 1.99.0 shipped 2026-10-01.
- No rustc or clippy changelog entry from 1.94 through 1.100.1 mentions `wildcard_enum_match_arm`, `match_wildcard_for_single_variants`, `let_underscore_drop`, `let_underscore_untyped` or `too_long_first_doc_paragraph`. Those claims are unchanged.
- One lint in the claims was touched: `let_underscore_must_use` (clippy 1.95, PR 16353; clippy 1.99, PR 16633). It is an audit-only lint in guards.md.
- One claim was wrong before the window and is wrong now: "clippy's `let_underscore_lock` sees only std lock guards". The lint listings say the opposite split. See claim 5.
- rust-analyzer hover shows the whole doc block; nothing in the window changes that.
- cargo-mutants 27.0.0 and 27.1.0 left `-f` and `--in-place` alone. No bare-method-call operator was added.

## Findings

### Sources read

- Rust RELEASES.md, https://raw.githubusercontent.com/rust-lang/rust/master/RELEASES.md (read first 100000 characters; releases are listed newest first, so 1.94 through 1.100.1 are covered).
- Clippy CHANGELOG.md, https://raw.githubusercontent.com/rust-lang/rust-clippy/master/CHANGELOG.md (read in full by local grep; sections 1.93 to 1.100 inspected).
- Clippy lint list, https://rust-lang.github.io/rust-clippy/master/index.html (group and default level per lint).
- Clippy config, https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_config/src/conf.rs and clippy_lints/src/doc/too_long_first_doc_paragraph.rs.
- rustc lint listings, https://doc.rust-lang.org/rustc/lints/listing/allowed-by-default.html and .../deny-by-default.html.
- rust-analyzer releases, https://github.com/rust-lang/rust-analyzer/releases (nine weekly releases, 2026-09-28 to 2026-11-23) and https://rust-lang.github.io/rust-analyzer/src/ide/hover/render.rs.html.
- cargo-mutants NEWS.md, https://raw.githubusercontent.com/sourcefrog/cargo-mutants/main/NEWS.md, and its book page https://raw.githubusercontent.com/sourcefrog/cargo-mutants/main/book/src/in-place.md.

Not reachable: the rust-analyzer thisweek index page and the newreleases.io mirror returned no usable content, so the weekly changelog pages were not read individually; the GitHub releases page was used instead.

### Per-claim verdicts

1. **guards.md stamp "Measured 2026-09-27 against rustc and clippy 1.93.1".** Verdict: unchanged as a measurement claim; the current stable is 1.100.1 (RELEASES.md, 2026-11-27). Of the lints guards.md names, the changelogs show no behaviour change except `let_underscore_must_use`. Recommendation: do not move the stamp to 1.100.1, because the stamp asserts a measurement and no planted edit was re-run. Add one sentence: "Changelogs read through 1.100.1 (2026-11-27) show no change to the lints named here except `let_underscore_must_use`." Verification: `rg "^## Rust 1\.(9[4-9]|100)" CHANGELOG.md` then grep each lint name.

2. **GRD-09 table (`wildcard_enum_match_arm`, `match_wildcard_for_single_variants`, `#[expect]`).** Verdict: unchanged. No 1.94 to 1.100 entry names either lint; the only `wildcard_enum_match_arm` entry is a raw-identifier suggestion fix in 1.90, before the baseline. The lint list still shows `wildcard_enum_match_arm` as restriction/allow and `match_wildcard_for_single_variants` as pedantic/allow. The `unfulfilled_lint_expectations` change in rustc 1.100.0 (it no longer fires in some dead-code cases) does not touch the "`#[expect]` silences the lint it names" claim. No planted proof needs a re-run.

3. **GRD-10 `let_underscore_drop` in `[workspace.lints.rust]`.** Verdict: unchanged. rustc still lists it as allow-by-default, and no 1.94 to 1.100.1 release note names it. No new rustc lint owns the `let _ =` drop case; the 1.97.0 must-use change (`Result<T, Uninhabited>` treated as `T`) concerns `unused_must_use`. The planted proof (rename a guard binding to `_`, clippy must fail) uses this lint and the changelogs never mention it, so it is not re-run.

4. **GRD-10 `let_underscore_must_use` and `let_underscore_untyped` as one-off audits.** Verdict: unchanged in level and group (both restriction/allow). `let_underscore_untyped` has no entry in the window. `let_underscore_must_use` changed twice. Clippy 1.95 (2026-04-16, PR 16353): it treats `Result<T, U>` and `ControlFlow<U, T>` as `T` for `#[must_use]` when `U` is uninhabited. Clippy 1.99 (2026-10-01, PR 16633, shared with `double_must_use` and `must_use_candidate`): it now decides `#[must_use]` with the compiler's algorithm. Effect: the hit count and the "70% noise in a 30-hit sample" figure may shift; the audit-only advice stands. Optional, not required: re-sample 30 hits on 1.100.1 if the owner wants the 70% figure re-stamped. Otherwise leave the sentence as written.

5. **GRD-10 "clippy's `let_underscore_lock` sees only std lock guards".** Verdict: changed, but the correction comes from a split that predates the window, not from a window change. Clippy lint list: `let_underscore_lock` is correctness/deny and "supports mutex and rwlock in parking_lot. For std locks see the rustc lint `let_underscore_lock`." The rustc deny-by-default listing carries the std case. The clippy changelog records the std case being uplifted into rustc and a later parking_lot addition, both far before 1.93. The existing sentence has the split backwards. Old text: "clippy's `let_underscore_lock` sees only std lock guards, never a domain wrapper." Replacement: "rustc's deny-by-default `let_underscore_lock` sees only std mutex guards and clippy's sees only `parking_lot` ones, so a domain lock wrapper is seen by neither." Verification: `cargo clippy` on a scratch copy with `let _ = domain_lock.acquire();` stays silent; `let _ = std_mutex.lock().unwrap();` fails under rustc's deny. Owner decision: this fixes a statement already in the file, so it is a correction, not a refresh; apply it.

6. **GRD-10 "Never add `-A warnings`: it silences the `-W` in either order".** Verdict: unchanged. No source in the window touches lint-flag precedence. Cargo 1.97.0 stabilised `build.warnings`, which controls how local-package warnings are treated and replaces `-Dwarnings`; it does not change `-A warnings` versus `-W lint`. Could not confirm the flag-order behaviour on 1.100.1 from a primary source, because the claim is an observed behaviour and no run was done; mark it "unchanged, not re-measured".

7. **SRF-04 `too_long_first_doc_paragraph` (nursery, opt in; 200 characters).** Verdict: unchanged. Lint list: nursery/allow. Not renamed, no entry from 1.94 to 1.100. The 200 is a hard-coded constant in the lint source (`first_paragraph_text_len <= 200`) with no threshold key. The only configuration is `check-private-items` (bool, default false), listed in `clippy_config/src/conf.rs`; it was not new in the window. If the file does not already say private items are skipped by default, adding "it checks only exported items unless `check-private-items = true` in `clippy.toml`" would be new information, but it is not a window change, so it is optional.

8. **surfaces.md "rust-analyzer ... render the whole doc block on hover".** Verdict: unchanged. `ide/hover/render.rs` appends the full docs string; its size limits (`max_trait_assoc_items_count`, `max_fields_count`, `max_enum_variants_count`, `max_subst_ty_len`) apply to type and signature display only. Releases 2026-09-28 to 2026-11-23 list hover items (cfg predicate hover, trait impl on method hover, SCIP hover skipping) and none about truncating docs. The `docs_with_rangemap` source was not read, so truncation inside it is not excluded from source alone; the release notes show none was added. The "read September 2026" date can stay.

9. **routing.md RTE-06 cargo-mutants `-f` and `--in-place`.** Verdict: unchanged. `--in-place` is still documented ("test mutations in the original source tree"; incompatible with `--jobs`). Version 27.0.0 (2026-03-07) changed `--file` so command-line values combine with config-file values; `-f` on one file still works, but a repo `.cargo/mutants.toml` with `examine_globs` or similar now adds to rather than being replaced by `-f`. Optional addendum: "`-f` adds to the file list in `.cargo/mutants.toml` since 27.0.0; use `--no-config` for exactly one file." Verification: `cargo mutants --list -f src/x.rs` against a repo with a config file.

10. **routing.md "no operator for a bare method call".** Verdict: unchanged. cargo-mutants 27.0.0, 27.1.0 and the unreleased section add `NonZero` mutations, struct-field deletion filtering and the `#[mutants::exclude_re]` attribute; none adds a bare-method-call replacement. The "Unreleased" notes mention method calls only as places the new attribute can sit. The 34 to 65% figure is a measurement and was not re-run.

### Decisions

- Stamp: keep "Measured 2026-09-27 ... 1.93.1"; append the changelog sentence in claim 1. Moving to 1.100.1 would claim a measurement nobody made.
- Planted-edit proofs: none must be re-run. The only touched lint is `let_underscore_must_use`, which is audit-only and has no planted proof; the planted proof uses `let_underscore_drop`, which no changelog names.
- Replacement wording changes to apply: claim 5 (required correction), claim 1 sentence (recommended), claims 7 and 9 addenda (optional).
