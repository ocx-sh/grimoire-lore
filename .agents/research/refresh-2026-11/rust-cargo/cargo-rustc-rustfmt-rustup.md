---
title: Delta - Cargo, rustc, rustfmt and rustup changes affecting rules/rust-cargo.md
pair: rust-cargo
date_researched: 2026-11-27
window_start: 2026-08-14
model: sonnet
sources_fetched: 15
---

# Delta: Cargo, rustc, rustfmt, rustup (2026-08-01 to 2026-11-27)

Scope: a delta update of the rust-cargo pair. Only claims at risk in `rules/rust-cargo.md` are covered. Lint-group content is out of scope. The fetch window started on 2026-08-01 because the feeding research is dated only to the month. Stable releases in or touching the window: Rust 1.97.0 (2026-07-09, just before the window, but it carries the key change), 1.98.0 (2026-08-20), 1.99.0 (2026-10-01), 1.100.0 (2026-11-12). The point releases 1.97.1, 1.98.1, 1.99.1 and 1.100.1 list nothing relevant. Cargo versions match the Rust versions.

## Summary

- LINT-02 CHANGED: Cargo 1.97 (2026-07-09) stabilised `build.warnings` / `CARGO_BUILD_WARNINGS`, the officially intended replacement for `RUSTFLAGS=-Dwarnings`. It does not invalidate the build cache. The rule's ban stays correct; its "Denial comes from" half needs a third mechanism added.
- LINT-02 open point: whether `build.warnings` skips path dependencies could not be determined. The docs say only "local packages" and never define the term.
- LINT-15 PARTLY CHANGED: `[lints.cargo]` is now stable (Cargo 1.100, 2026-11-12). `priority` semantics are unchanged. The "plain `--warn` flags" claim could not be confirmed or refuted from the current docs.
- TOOL-05 CHANGED: Cargo 1.100 ships its own `cargo::unused_dependencies` lint, which is a first-party alternative to `cargo shear`. rustc's `unused_crate_dependencies` is still allow-by-default with the same documented single-target false-positive. The claim about rustc's lint is unchanged.
- LINT-08, LINT-07, LINT-11: unchanged in substance. Two small compatibility notes exist (1.98 `unsafe_code`, 1.100 `unfulfilled_lint_expectations`).
- LINT-14: unchanged. None of the five options was stabilised. `style_edition` is now stable for 2015 to 2024, with `"2027"` unstable. `hex_literal_case` was stabilised (not a rule claim).
- TOOL-01: unchanged. No rustup release has been published since 1.29.0 (2026-03-05) as far as the fetched changelog shows.
- REL-01: unchanged. Release profile defaults are identical. A new built-in `debug` profile was added in 1.99.
- New fact for CI: Cargo 1.99 disables incremental compilation by default when `CI` is set.
- Sources section: every URL resolves. The Cargo Book `#the-lints-section` anchor resolves. rustfmt `Configurations.md` still exists at the same raw URL. The Cargo `CHANGELOG.md` has moved to the Cargo Book (not cited in the Sources section).

## Findings (per claim)

### LINT-02 - `RUSTFLAGS=-D warnings` ban and the denial mechanism: CHANGED

- Old text: "Never set `RUSTFLAGS=-D warnings` in CI or `.cargo/config.toml`. Denial comes from `[workspace.lints.rust] warnings = "deny"` plus `cargo clippy -- -D warnings` - `RUSTFLAGS` also denies *path*-dependency warnings, turning a vendored fork's upstream noise into a build failure, and busts the incremental cache."
- New fact: Cargo 1.97 stabilised `build.warnings` ("Stabilize `build.warnings` config. This controls how lint warnings from local packages are treated. Useful for enforcing a warning-free build in CI, replacing `-Dwarnings`"). Upstream change date: 2026-07-09 (Cargo 1.97 release). Source: https://doc.rust-lang.org/nightly/cargo/CHANGELOG.html (PRs rust-lang/cargo#16796 and #16961) and https://blog.rust-lang.org/2026/07/09/Rust-1.97.0/.
- Mechanics, from the Cargo Book config page https://doc.rust-lang.org/cargo/reference/config.html#buildwarnings: type string, default `"warn"`, environment variable `CARGO_BUILD_WARNINGS`, values `"warn"`, `"allow"`, `"deny"`. `"deny"` emits an error for a crate that has lint warnings, and `--keep-going` shows the warnings for all dependent crates. Only adjustable lints are affected; non-lint warnings and warnings from dependencies are left as they are. The docs list "MSRV: Respected as of 1.97."
- Cache: the 1.97 blog says using the feature "doesn't invalidate the underlying build cache", and the PR discussion says it works "without invalidation caches". This confirms the rule's "busts the incremental cache" rationale against `RUSTFLAGS` and supports the new mechanism.
- Changelog 1.100: `build.warnings='deny'` now reports the error count in the build summary (rust-lang/cargo#17479). Cargo 1.98 nightly also routed Cargo's own lints through `build.warnings` (`-Zcargo-lints`, #17112), now moot after 1.100 stabilised them.
- Path dependencies: COULD NOT DETERMINE. The config page says "local packages" and the 1.97 blog and PR #16796 never define "local". Nearby evidence: the Cargo Book `[lints]` section says Cargo applies lints to the current package and "suppresses lints from non-path dependencies", which suggests path dependencies are treated as local, and thus denied. That is an inference, not a documented guarantee. The rule's claim that `RUSTFLAGS` denies path-dependency warnings is untouched by upstream; whether `build.warnings` avoids that effect is unverified. A reviewer must test this on a workspace with a vendored path fork before the rule asserts it.
- The `[workspace.lints.rust] warnings = "deny"` half of the rule is not contradicted by any source read. The Cargo Book never mentions it either way.

Proposed replacement text (the sentence after the first):

> Never set `RUSTFLAGS=-D warnings` in CI or `.cargo/config.toml`. In CI, deny warnings with `CARGO_BUILD_WARNINGS=deny` (Cargo 1.97+, stable; add `--keep-going` to see every crate's warnings), which unlike `RUSTFLAGS` does not invalidate the build cache. Denial of the lints themselves comes from `[workspace.lints.rust] warnings = "deny"` plus `cargo clippy -- -D warnings`. `RUSTFLAGS` also denies *path*-dependency warnings, turning a vendored fork's upstream noise into a build failure; whether `build.warnings` skips path dependencies is undocumented, so verify it before relying on it.

Verification for the added mechanism: `grep -n -E -e 'CARGO_BUILD_WARNINGS' -e 'warnings *= *"deny"' -- .github/workflows .cargo/config.toml` finds the mechanism; `grep -rn -E -e 'RUSTFLAGS.*-D *warnings' -- .cargo .github` stays empty. Rationale: it names the sanctioned replacement upstream now documents so agents stop reaching for `RUSTFLAGS`. Open decision for the owner: whether `CARGO_BUILD_WARNINGS=deny` replaces the manifest `warnings = "deny"` approach or stands beside it. The sources do not rank them.

### LINT-15 - "Cargo emits `[lints]` entries as plain `--warn` flags": COULD NOT DETERMINE (no contradiction found); related facts CHANGED

- The current manifest page (https://doc.rust-lang.org/cargo/reference/manifest.html#the-lints-section) says only that lower-priority lints "show up first on the command-line to tools like `rustc`". It never states which flag form Cargo emits, so the claim can be neither confirmed nor refuted from the Book. No changelog entry from 1.97 to 1.100 mentions a change to flag emission.
- `priority` semantics: unchanged. Still a signed integer; lower numbers have lower priority and are overridden by higher ones. Cargo 1.97 nightly had "Prefer defined lint levels over default" (#16879), which concerns Cargo's own lints.
- `[lints.cargo]` STABILISED. Changelog 1.100 (2026-11-12): "Stabilize Cargo's own linting system. Some Cargo warnings are now emitted as lints that users can control in the `[lints.cargo]` table. The initial set of Cargo lints includes a built-in unused dependency check via the `cargo::unused_dependencies` lint." Source: https://doc.rust-lang.org/nightly/cargo/CHANGELOG.html (PRs #17298, #17441, #17478, #17515), docs https://doc.rust-lang.org/cargo/reference/lints.html. Groups: `cargo::default`, `cargo::correctness` (deny), `cargo::style`, `cargo::suspicious`, `cargo::pedantic` (allow), `cargo::restriction` (allow). `unused_dependencies` is group `style`, level `warn`.
- Effect on LINT-04: its "Never enable `nursery`, `restriction` or `cargo` as groups" refers to clippy groups. Clippy's `cargo` group is a different thing from the new `[lints.cargo]` table. The rule text is ambiguous now and should say "clippy `cargo`" explicitly. Lint-group content is otherwise out of scope.
- Cargo 1.99 also warns on hyphenated lint names in `[lints]` (e.g. `unexpected-cfgs` deprecated in favour of `unexpected_cfgs`; will not work in a future edition, #17051).
- Consequence for the ratchet logic: because `warnings = "deny"` / `-D warnings` and `CARGO_BUILD_WARNINGS=deny` both promote any manifest `warn` to an error, a Cargo lint at `warn` in `[lints.cargo]` is also subject to the gate. This is inferred from the stated behaviour that `deny` mirrors `-Dwarnings` (PR #16796 comment) and is not separately documented.

Proposed replacement text (one clause added to the end of the LINT-15 sentence): keep the old sentence and append: "`[lints.cargo]` (stable since Cargo 1.100) is a separate table whose lints, such as `cargo::unused_dependencies`, follow the same level and `priority` rules."

### LINT-08 - `#[expect]` and `unfulfilled_lint_expectations`: UNCHANGED

- rustc book lint levels page (https://doc.rust-lang.org/rustc/lints/levels.html): `expect` still fires `unfulfilled_lint_expectations` when the lint is not emitted; `reason` is still supported on all lint attributes; `expect` has no flag equivalent and `force-warn` lints are still emitted.
- One narrowing, Rust 1.100 (2026-11-12, rust-lang/rust#161005): "`unfulfilled_lint_expectations` no longer fires on `#[expect(dead_code)]` inside code that is covered by a dead parent's diagnostic". This is a false-positive fix and does not change the rule. An agent that sees no unfulfilled warning for an inner `#[expect(dead_code)]` under an already-dead item should not conclude the expectation is fulfilled on its own.

### LINT-07 - `unsafe_code`: UNCHANGED (one compatibility note)

- Rust 1.98.0 (2026-08-20, rust-lang/rust#157201) compatibility note: "The UNSAFE_CODE lint is now consistently emitted for all unsafe attributes." The lint description in the rustc book still reads "catches usage of `unsafe` code and other potentially unsound constructs like `no_mangle`, `export_name`, and `link_section`" (https://doc.rust-lang.org/rustc/lints/listing/allowed-by-default.html). Under `forbid` at workspace level a crate using `#[unsafe(no_mangle)]`-style attributes may now fail in more places. The "downgrade to `deny` in FFI crates with a rationale comment" guidance is unaffected. The 1.98 note says nothing about `forbid` semantics. Not a text change; an optional added clause: "Unsafe attributes such as `#[unsafe(no_mangle)]` count".

### LINT-11 - `unreachable_pub`: UNCHANGED

- The rustc book listing still places `unreachable_pub` in the allowed-by-default list with the explanation "Eventually it is desired for this to become warn-by-default." No release note from 1.97 to 1.100 touches it. A new related lint exists: `dead_code_pub_in_binary` (allow-by-default, Rust 1.97, for unused `pub` items in binary crates); it is relevant to a crate shipping only binaries but it is lint-group content for the other brief.

### TOOL-05 - `unused_crate_dependencies` single-target false positive: UNCHANGED for rustc; a first-party alternative now exists

- The rustc book entry still says: "This lint is 'allow' by default because it can provide false positives ... If there is a dependency that is only used in the binary, but not the library, then the lint will be incorrectly issued in the library." Not fixed. Source: https://doc.rust-lang.org/rustc/lints/listing/allowed-by-default.html.
- Cargo 1.100 (2026-11-12) added `cargo::unused_dependencies` (group `style`, `warn`, minimal `package.rust-version` 1.79.0). Caveats documented on https://doc.rust-lang.org/cargo/reference/lints.html: it only checks the selected packages, not all path dependencies; `cargo check` checks `[dependencies]` and `[build-dependencies]` only; `[dev-dependencies]` are unchecked because no target flag selects all dev targets; `--bin foo` does not lint `[dependencies]`; false positives occur when depending on a transitive dependency to activate a feature. Cargo 1.97 also switched Cargo from third-party to first-party unused-deps detection (#16946) and made the lint ignore rustc's `unused_crate_dependencies` status (#16877).
- Verdict: the rule's statement about rustc's lint is still accurate. The rule does not mention the new Cargo lint. Whether it displaces `cargo shear` is a decision for the owner: the documented limits (dev-dependencies unchecked, selected packages only) mean it does not cover everything `cargo shear` does. The sources do not compare them.

Proposed replacement text for TOOL-05 (the sentence after "SHOULD" claim, in place of the final clause): "Run `cargo shear` in the PR gate. Not `cargo-machete` (regex-based, false positives), not `cargo-udeps` (nightly), not rustc's `unused_crate_dependencies` (fires falsely on single-target deps). Cargo 1.100's `cargo::unused_dependencies` is stable but skips `[dev-dependencies]` and unselected path dependencies, so treat it as a complement, not a replacement." Verification: `grep -n -E -e 'unused_crate_dependencies' -- Cargo.toml` is empty; a CI step runs `cargo shear`. Rationale: stops agents from treating the new Cargo lint as a full substitute.

### LINT-14 - rustfmt unstable options: UNCHANGED

- `Configurations.md` (https://raw.githubusercontent.com/rust-lang/rustfmt/master/Configurations.md): `unstable_features` Stable: No (#3387); `imports_granularity` No (#4991); `group_imports` No (#5083); `wrap_comments` No (#3347); `format_code_in_doc_comments` No (#3348). None was stabilised.
- `style_edition`: Stable: Yes, with stable values "2015", "2018", "2021", "2024" and unstable "2027".
- rustfmt CHANGELOG (https://raw.githubusercontent.com/rust-lang/rustfmt/master/CHANGELOG.md): 1.10.0 (2026-07-21) stabilised `hex_literal_case` and added the unstable `doc_comment_code_block_small_heuristics` (#6942); it also corrected the `style_edition` docs to say the option is stable while `"2027"` is not. 1.11.0 (2026-11-12) lists only `style_edition=2027` fixes and a `wrap_comments` fix. A 1.12.0 entry is dated 2026-12-24, after the research date; it is presumably an unreleased entry with a planned date and was ignored. It changes only unstable options.
- No stable option was removed. The rule's list of five names stays accurate. An optional addition: `doc_comment_code_block_small_heuristics` is also unstable and `style_edition = "2027"` is unstable.

### TOOL-01 - `rust-toolchain.toml` fields and precedence: UNCHANGED

- Rustup overrides page (https://rust-lang.github.io/rustup/overrides.html): fields in the `[toolchain]` section are `channel`, `path`, `profile` (`minimal`, `default`, `complete`), `components`, `targets`; `channel` and `path` are mutually exclusive. Precedence: 1 `cargo +beta` shorthand, 2 `RUSTUP_TOOLCHAIN`, 3 directory override via `rustup override`, 4 `rust-toolchain.toml`, 5 default toolchain. The channel grammar accepts `stable|beta|nightly|<major.minor>|<major.minor.patch>` with optional prerelease or date, so an exact `X.Y.Z` still works.
- Rustup CHANGELOG (https://raw.githubusercontent.com/rust-lang/rustup/master/CHANGELOG.md): newest heading read is 1.29.0 (2026-03-05); nothing in the window. A newer release may exist that this fetch did not show; treat as "no change found".
- Note: the rule says `channel = "X.Y.Z"` with a `^\d+\.\d+\.\d+$` verification. That is still valid per the grammar. The rule's mention of `components = ["rustfmt", "clippy"]` is unchanged.

### REL-01 - Cargo `release` defaults: UNCHANGED

- Cargo Book profiles page (https://doc.rust-lang.org/cargo/reference/profiles.html) still lists the release defaults `opt-level = 3`, `debug = false`, `strip = "none"`, `lto = false`, `panic = 'unwind'`, `incremental = false`, `codegen-units = 16`. So the rule's `lto=false, codegen-units=16, strip="none"` is exact.
- New: Cargo 1.99 (2026-10-01) added a built-in `debug` profile (`inherits = "dev"`), "preparation for transitioning the `dev` profile away from debugging" (#17214). It does not touch `release`. Watch item: a future change to `dev` is announced, not made.
- New CI fact: Cargo 1.99 (#17220) "incremental compilation is now disabled by default when running in CI", detected through the `CI` environment variable. This affects the rationale text in LINT-02 ("busts the incremental cache") only in CI: there incremental is off by default anyway, so the cache argument weighs on the rule mainly through the shared build cache, not incremental artifacts. Suggested wording tweak: replace "busts the incremental cache" with "invalidates the build cache".

### Sources section anchors

| URL in rule | Resolves? |
|---|---|
| https://doc.rust-lang.org/cargo/reference/manifest.html#the-lints-section | yes, heading `The [lints] section`, anchor `#the-lints-section` confirmed |
| https://doc.rust-lang.org/rustc/lints/levels.html | yes |
| https://doc.rust-lang.org/clippy/lint_configuration.html | not fetched; out of scope (clippy brief) |
| https://raw.githubusercontent.com/rust-lang/rustfmt/master/Configurations.md | yes |
| https://rust-lang.github.io/rustup/overrides.html | yes; anchors `#the-toolchain-file`, `#toolchain-file-settings`, `#channel`, `#components` exist |
| https://doc.rust-lang.org/cargo/reference/profiles.html | yes |
| GitHub security hardening, cargo-deny-action | not fetched; out of scope for this commission |

Suggested Sources additions: https://doc.rust-lang.org/cargo/reference/config.html#buildwarnings and https://doc.rust-lang.org/cargo/reference/lints.html.

## Normative guidance candidates

1. Deny warnings in CI with `CARGO_BUILD_WARNINGS=deny`, not `RUSTFLAGS`. Rationale: stable since Cargo 1.97 and does not invalidate the build cache. Verification: `grep -rn -E -e 'CARGO_BUILD_WARNINGS' -- .github` finds the setting; `grep -rn -E -e 'RUSTFLAGS.*warnings' -- .github .cargo` is empty. Strength: SHOULD, pending the owner decision above.
2. Before relying on `build.warnings` to skip path-dependency noise, test it. Rationale: "local packages" is undefined in the docs. Verification: run `CARGO_BUILD_WARNINGS=deny cargo check --workspace` on a workspace with a path dependency that emits a lint warning, and read whether it fails.
3. Name the clippy `cargo` group as "clippy `cargo`" in LINT-04. Rationale: avoids confusion with the now-stable `[lints.cargo]` table. Verification: reading heuristic on the LINT-04 text.
4. Treat `cargo::unused_dependencies` as a complement to `cargo shear`, not a replacement. Rationale: it skips `[dev-dependencies]` and unselected path dependencies. Verification: `grep -n -E -e 'unused_dependencies' -- Cargo.toml` is allowed only together with a `cargo shear` CI step.

## AI-agent angle

- An agent trained before 2026-07 will write `RUSTFLAGS: -D warnings` in a workflow `env:` block. Smallest check: `grep -rn -E 'RUSTFLAGS.*-D *warnings' -- .github .cargo`.
- It will also hyphenate lint names in `[lints]` (`unexpected-cfgs`); Cargo 1.99 now warns. Check: `grep -n -E '^[a-z]+-[a-z-]+ *=' -- Cargo.toml` inside the `[lints.*]` tables.
- It may enable rustc's `unused_crate_dependencies` for the same job as the new Cargo lint. Check: the TOOL-05 grep.
- It may assume `[lints.cargo]` is nightly-only. It is stable from Cargo 1.100.

## Contested / evolving

- `build.warnings` versus manifest `warnings = "deny"`: both are in use; upstream calls `build.warnings` the replacement for `-Dwarnings` only (as of 2026-07 to 2026-11). Trend: toward the config/env mechanism.
- `dev` profile will move away from debugging; the new `debug` profile is the preparation (as of 1.99). Not yet a change.
- Rust 1.100 stabilised Cargo's linting system; more Cargo lints (the nightly list included `manual_readme`, `text_direction_codepoint`, `missing_lints_inheritance`) may follow. They are unstable-gated or unverified in this research and are not claimed as stable here.

## Sources

| URL | What | Date/era | Why |
|---|---|---|---|
| https://raw.githubusercontent.com/rust-lang/rust/master/RELEASES.md | Rust release notes (first 100k chars read, covers 1.97 to 1.100.1) | 2026-07 to 2026-11 | version dates, lint compatibility notes |
| https://doc.rust-lang.org/nightly/cargo/CHANGELOG.html | Cargo changelog (moved from CHANGELOG.md) | 1.97 to 1.100 | `build.warnings`, `[lints.cargo]`, `debug` profile, CI incremental |
| https://raw.githubusercontent.com/rust-lang/cargo/master/CHANGELOG.md | redirect stub to the Book | n/a | confirms the move |
| https://doc.rust-lang.org/cargo/reference/config.html | `build.warnings` | Cargo 1.97+ | mechanism, env var, values |
| https://doc.rust-lang.org/cargo/reference/manifest.html | `[lints]` section | Cargo 1.100 | priority, anchor |
| https://doc.rust-lang.org/cargo/reference/lints.html | Cargo's own lints | Cargo 1.100 | groups, `unused_dependencies` caveats |
| https://doc.rust-lang.org/cargo/reference/profiles.html | profile defaults | Cargo 1.99+ | REL-01 |
| https://doc.rust-lang.org/rustc/lints/levels.html | lint levels | current | LINT-08 |
| https://doc.rust-lang.org/rustc/lints/listing/allowed-by-default.html | allowed-by-default lints (two fetch pages) | current | LINT-07, 11, TOOL-05 |
| https://raw.githubusercontent.com/rust-lang/rustfmt/master/CHANGELOG.md | rustfmt changelog | 1.10.0 to 1.12.0 | LINT-14 |
| https://raw.githubusercontent.com/rust-lang/rustfmt/master/Configurations.md | rustfmt options | current | stable/unstable split |
| https://raw.githubusercontent.com/rust-lang/rustup/master/CHANGELOG.md | rustup changelog | newest 1.29.0, 2026-03-05 | TOOL-01 |
| https://rust-lang.github.io/rustup/overrides.html | rustup overrides | current | TOOL-01 |
| https://github.com/rust-lang/cargo/pull/16796 | `build.warnings` stabilisation PR | 2026 | path-dependency and cache discussion |
| https://doc.rust-lang.org/nightly/cargo/reference/unstable.html | unstable features page | current | checked "local packages" definition; absent |
| https://blog.rust-lang.org/2026/07/09/Rust-1.97.0/ | Rust 1.97 announcement | 2026-07-09 | cache statement, CI usage |
