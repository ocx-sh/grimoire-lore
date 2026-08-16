---
title: Clippy, rustfmt, [lints] Table, and Toolchain Pinning
topic: rust-tooling-ci / lints-and-toolchain-policy
agent: rust-tooling-ci researcher (lints & toolchain subarea)
model: sonnet
date_researched: 2026-08
sources_count: 24
scope: |
  Covers the enforceable-quality layer for a production Rust CLI: clippy lint groups and a
  concrete `[lints.clippy]` table, high-value non-default lints an LLM-written codebase needs,
  rustc lint policy, where to configure lints (Cargo.toml vs attributes vs RUSTFLAGS),
  `#[expect]` discipline and `clippy.toml`, rustfmt stable/unstable options and `style_edition`,
  toolchain pinning via `rust-toolchain.toml`, and the auxiliary CI tool landscape
  (cargo-machete/shear, cargo-hack, cargo-sort, typos, taplo, committed/cog).
  Does NOT cover: CI pipeline YAML/workflow design, release/publishing tooling, or
  security-audit tooling (cargo-audit/cargo-deny) — those belong to sibling subareas.
---

## Table of contents

1. [Clippy lint groups](#1-clippy-lint-groups)
2. [An annotated `[lints.clippy]` table for a production CLI](#2-an-annotated-lintsclippy-table-for-a-production-cli)
3. [High-value lints that catch real LLM-written bugs](#3-high-value-lints-that-catch-real-llm-written-bugs)
4. [rustc lint policy](#4-rustc-lint-policy)
5. [Where to configure lints: Cargo.toml vs attributes vs RUSTFLAGS](#5-where-to-configure-lints-cargotoml-vs-attributes-vs-rustflags)
6. [`#[allow]` / `#[expect]` discipline and `clippy.toml`](#6-allow--expect-discipline-and-clippytoml)
7. [rustfmt: stable options, style_edition, and CI](#7-rustfmt-stable-options-style_edition-and-ci)
8. [Toolchain policy: pinning, MSRV, nightly boundaries](#8-toolchain-policy-pinning-msrv-nightly-boundaries)
9. [Additional tooling: what earns its CI time](#9-additional-tooling-what-earns-its-ci-time)

## Summary

- Clippy has 9 lint groups; only `correctness`, `suspicious`, `style`, `complexity`, and `perf` are warn/deny-by-default — `pedantic`, `nursery`, `restriction`, and `cargo` are opt-in and must be explicitly enabled ([Clippy lint groups](https://doc.rust-lang.org/clippy/lint_configuration.html)).
- `clippy::restriction` lints are individually opt-in only — enabling the whole group is explicitly discouraged upstream because many restriction lints conflict with each other and with idiomatic Rust; pick lints one at a time, not `clippy::restriction = "warn"`.
- `clippy::redundant_clone` lives in **`nursery`**, not `perf` — it has known false positives and was demoted; do not deny it project-wide without review ([source](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/redundant_clone.rs)).
- `clippy::disallowed_methods` and `clippy::disallowed_types` are in the **`style`** group (warn-by-default once `clippy.toml` lists targets), not `restriction` — they do nothing until you populate `clippy.toml`.
- `unwrap_used`, `expect_used`, `get_unwrap`, `unwrap_in_result`, `indexing_slicing`, `panic_in_result_fn`, `dbg_macro`, `mem_forget`, `todo`, `unimplemented`, `panic`, `print_stdout`, `print_stderr`, `arithmetic_side_effects`, `integer_division`, `string_slice`, `module_name_repetitions`, `exhaustive_enums`, `exhaustive_structs`, `min_ident_chars`, `single_call_fn`, `shadow_unrelated`, and `missing_docs_in_private_items` are all confirmed real lints in the **`restriction`** group (verified against `declare_clippy_lint!` source, August 2026 master branch).
- `cast_possible_truncation`, `cast_sign_loss`, `cast_precision_loss`, `float_cmp`, `must_use_candidate`, `needless_pass_by_value`, `unused_async`, `missing_errors_doc`, and `missing_panics_doc` are all in **`pedantic`**.
- `await_holding_lock` and `await_holding_refcell_ref` are in **`suspicious`** (warn-by-default already) — they fire whenever a non-async-aware guard is held across an `.await`.
- `expect_fun_call` and `result_large_err` are in **`perf`**; `large_enum_variant` is also `perf`.
- Cargo's `[lints]` table (stabilized Rust 1.74) is the single recommended place to declare lint policy — it is versioned with the code, participates in `cargo package`/`publish`, and supports workspace inheritance via `[workspace.lints]` + `[lints] workspace = true` ([Cargo Book](https://doc.rust-lang.org/cargo/reference/manifest.html#the-lints-section)).
- `RUSTFLAGS=-D warnings` in CI is a trap: it applies blanket-deny to *every* warning including ones from dependencies/build scripts and busts incremental caches; prefer `cargo clippy -- -D warnings` scoped to the local crate, or better, put denies in `[lints]` so `cargo build` itself fails without any CI-only flag.
- Edition 2024 stabilized `#[expect(lint)]` (RFC 2383): unlike `#[allow]`, `#[expect]` itself warns (`unfulfilled_lint_expectations`) if the suppressed lint stops firing, preventing silently-stale suppressions — pair every `#[expect]`/`#[allow]` with a `reason = "..."`.
- `clippy.toml` is where numeric thresholds and disallow-lists live (`cognitive-complexity-threshold`, `too-many-arguments-threshold`, `type-complexity-threshold`, `disallowed-methods`, `disallowed-types`, `msrv`) — it is not a lint-level file, it configures *how* enabled lints behave.
- `unsafe_op_in_unsafe_fn` became warn-by-default in edition 2024: an `unsafe fn` body no longer implicitly grants blanket unsafe-op permission — each unsafe operation still needs its own `unsafe { }` block ([Edition Guide](https://doc.rust-lang.org/edition-guide/rust-2024/unsafe-op-in-unsafe-fn.html)).
- rustfmt's `style_edition` is decoupled from the Rust parser edition as of the 2024 edition work — a crate can parse as edition 2024 while formatting to an older style, or vice versa, via `rustfmt.toml`'s `style_edition` key.
- Most "nice" rustfmt options (`imports_granularity`, `group_imports`, `wrap_comments`, `format_code_in_doc_comments`) are still **unstable** and require the nightly toolchain plus `unstable_features = true` — do not put them in a `rustfmt.toml` you expect stable `cargo fmt` to honor.
- `rust-toolchain.toml` with `channel`, `components`, and `profile = "minimal"` is the recommended pin for CI/dev parity; MSRV in `Cargo.toml`'s `rust-version` field is a separate, lower-bound declaration that Cargo itself enforces since 1.74 lint-table respect and since 1.56 for the field.
- `cargo-machete` is fast but regex-based and has real false positives (macro-only usage, renamed imports); `cargo-shear` uses an actual parser (rust-analyzer's) and additionally catches misplaced dependencies and orphaned source files — prefer `cargo-shear` where available, keep `cargo-machete` as a cheap first pass.
- `cargo-hack --feature-powerset --no-dev-deps` is the correct way to verify every feature combination compiles; running it in full powerset mode on every PR is often too slow — reserve full powerset for a nightly/scheduled job and use `--each-feature` on PRs.

## Findings

### 1. Clippy lint groups

Clippy organizes every lint into exactly one of nine groups. Only the first five are enabled (warn or deny) by default; the last four require explicit opt-in ([Clippy lint configuration guide](https://doc.rust-lang.org/clippy/lint_configuration.html)):

| Group | Default level | Purpose |
|---|---|---|
| `correctness` | deny | Code that is outright wrong (e.g. `absurd_extreme_comparisons`, `almost_swapped`) |
| `suspicious` | warn | Code that is most likely wrong (e.g. `await_holding_lock`) |
| `style` | warn | Code that doesn't follow Rust conventions (e.g. `collapsible_if`, `disallowed_methods` once configured) |
| `complexity` | warn | Code that does something simple in a complicated way |
| `perf` | warn | Code that can be optimized (e.g. `large_enum_variant`, `expect_fun_call`) |
| `pedantic` | **allow** | Stricter style/API-hygiene lints, opt-in because some are debatable (e.g. `must_use_candidate`, `missing_errors_doc`) |
| `nursery` | **allow** | New lints not yet proven stable — expect false positives (e.g. `redundant_clone`) |
| `restriction` | **allow** | Lints that *restrict* valid-but-risky patterns; mutually exclusive with each other in places, only ever opt-in one at a time (e.g. `unwrap_used`, `print_stdout`) |
| `cargo` | **allow** | Lints about `Cargo.toml` itself (e.g. missing `license`, wildcard deps) |

Clippy's own docs are explicit that `restriction` is not meant to be enabled wholesale: individual restriction lints can conflict (e.g. `clippy::implicit_return` vs `clippy::needless_return`), so a serious project selects specific restriction lints rather than `clippy::restriction = "warn"` ([lint configuration guide](https://doc.rust-lang.org/clippy/lint_configuration.html)).

A project that wants real teeth should:
- `deny` correctness (already deny by default — don't downgrade it),
- `warn`→`deny` `suspicious`, `complexity`, `perf` (promote from warn to deny in CI),
- enable `pedantic` and `nursery` as groups but allow-list the few false-positive-prone lints back down (`nursery` especially, since it churns),
- hand-pick `restriction` lints individually (see §2 and §3),
- enable `cargo` for publishable crates.

### 2. An annotated `[lints.clippy]` table for a production CLI

This table targets exactly the project shape described in scope (clap CLI, tokio async, OCI/HTTP client, filesystem-heavy, cross-platform, security-sensitive, shipped as prebuilt binaries). It goes in the workspace root under `[workspace.lints.clippy]`, inherited by every member via `[lints] workspace = true` (see §5).

```toml
[workspace.lints.clippy]
# --- Groups: promote everything to real teeth ---
all        = { level = "deny", priority = -1 }   # correctness+suspicious+style+complexity+perf
pedantic   = { level = "warn", priority = -1 }   # API-hygiene, opt-in group
nursery    = { level = "warn", priority = -1 }   # new lints, expect some noise
cargo      = { level = "warn", priority = -1 }   # Cargo.toml hygiene

# --- Restriction lints picked individually (never `restriction = "warn"` wholesale) ---
unwrap_used          = "deny"   # LLM-written code reaches for .unwrap() by default; force ? or explicit handling
expect_used           = "deny"  # same failure mode as unwrap_used, just with a message
indexing_slicing      = "warn"  # v[i] / &s[a..b] panics on OOB; prefer .get()/.get(a..b)
panic_in_result_fn    = "deny"  # a fn -> Result that still panic!()s defeats the Result contract
unwrap_in_result      = "warn"  # same idea one level up: unwrap()/expect() inside a Result/Option-returning fn
get_unwrap            = "warn"  # .get(i).unwrap() is indexing_slicing wearing a costume
dbg_macro             = "deny"  # dbg! leaks to stderr in production builds; CI should never let one through
todo                  = "deny"  # todo!() is an unfinished code marker, not a runtime plan
unimplemented         = "deny"  # same for unimplemented!()
panic                 = "warn"  # explicit panic!() in library-shaped code; CLI's own main.rs can allow this locally
mem_forget            = "deny"  # leaks + defeats Drop-based resource cleanup (file handles, locks)
print_stdout          = "warn"  # a CLI needs println! somewhere — warn, not deny, and allow at the presentation layer
print_stderr          = "warn"  # same; logging should usually go through `tracing`, not eprintln!
arithmetic_side_effects = "warn"  # unchecked +/-/* on integers; forces checked_/wrapping_/saturating_ variants
integer_division       = "warn"  # silent truncation from `/` on integers is a frequent off-by-one source
float_cmp              = "warn"  # already pedantic; == on f64 is almost always a bug — this reinforces it
string_slice           = "warn"  # byte-slicing a &str can panic mid-UTF-8-codepoint
missing_docs_in_private_items = "allow"  # too noisy for a CLI's internals; keep off unless doc coverage is a goal
module_name_repetitions = "allow"  # stylistic; OCX's foo::FooClient naming is fine, don't fight it
min_ident_chars        = "allow"  # too aggressive for i, x, e in narrow scopes
single_call_fn          = "allow"  # actively discouraged by clippy's own docs ("prepare to #[allow] it a lot")
exhaustive_enums        = "allow"  # only matters for a published stable API surface; internal enums don't need this
exhaustive_structs       = "allow"  # same
shadow_unrelated        = "allow"  # too aggressive; shadowing with Into/TryFrom conversions is idiomatic

# --- Individually promoted pedantic/nursery lints worth calling out by name ---
missing_errors_doc     = "warn"  # public fn -> Result without a `# Errors` doc section
missing_panics_doc     = "warn"  # public fn that can panic without a `# Panics` doc section
must_use_candidate     = "warn"  # catches fns whose return value is silently droppable when it shouldn't be
needless_pass_by_value = "warn"  # LLMs default to `fn f(x: String)` when `&str` would do — real perf + API cost
unused_async           = "warn"  # tokio-heavy codebases accumulate `async fn` that never awaits — dead concurrency tax
result_large_err        = "warn"  # perf group; forces boxing large Err variants (anyhow::Error wrapping helps)
large_enum_variant       = "warn"  # perf group; same idea for enum payloads (protocol/wire-format enums especially)
redundant_clone         = "allow"  # nursery, known false positives — enable per-crate only after auditing hits
disallowed_methods       = "deny"  # style group; requires populating clippy.toml's `disallowed-methods` (see §6)
disallowed_types         = "deny"  # style group; same, populate clippy.toml's `disallowed-types`
await_holding_lock        = "deny"  # suspicious, warn-by-default already — deny it: std::sync::MutexGuard across .await deadlocks tokio
await_holding_refcell_ref = "deny"  # same for RefCell borrows across .await

# --- Cargo-adjacent, only if this crate publishes to a registry ---
wildcard_dependencies = "deny"    # cargo group: `serde = "*"` is a supply-chain smell in a security-sensitive CLI
```

Rationale notes:
- `unwrap_used`/`expect_used` are `deny` not `warn` because this is explicitly the failure mode the requesting project flagged (LLM-written code, "nearly everything in one crate"). A `deny` forces the agent to justify every escape hatch with an `#[expect(clippy::unwrap_used, reason = "...")]` (§6), which is itself a code-review signal.
- `print_stdout`/`print_stderr` stay `warn`, not `deny`, because this is a CLI, not a library — some crate (the top-level `main.rs` / output-formatting module) legitimately owns stdout. Scope the `#[allow]` to that module only.
- `redundant_clone` is deliberately left `allow` at the workspace level despite being a real bug-catcher, because it lives in `nursery` and Clippy's own source marks it as false-positive-prone (confirmed: `nursery` group, [source](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/redundant_clone.rs)). Turn it on locally when doing a clone-reduction pass, not as a standing CI gate.
- `disallowed_methods`/`disallowed_types` are `deny` but inert without `clippy.toml` entries — see §6 for the specific bans this project needs (`env::set_var`, `process::exit`, `Instant::now`, etc.).

### 3. High-value lints that catch real LLM-written bugs

All of the following were verified against the `declare_clippy_lint!` macro invocations in the `rust-lang/rust-clippy` `master` branch source (August 2026) — group and exact one-line description quoted:

| Lint | Group | Verified description | Why it matters for LLM-written code |
|---|---|---|---|
| `unwrap_used` | restriction | *"using `.unwrap()` on `Result` or `Option`, which should at least get a better message using `expect()`"* | LLMs default to `.unwrap()` in example-style code that then ships unchanged |
| `expect_used` | restriction | *"using `.expect()` on `Result` or `Option`, which might be better handled"* | `.expect("should work")` messages are frequently meaningless boilerplate an LLM invents to satisfy this exact lint — reviewer must check the message is actually informative |
| `indexing_slicing` | restriction | *"indexing/slicing usage"* | `v[i]` in a CLI parsing untrusted OCI manifest data panics on malformed input instead of returning an error |
| `panic_in_result_fn` | restriction | *"functions of type `Result<..>` that contain `panic!()` or assertion"* | catches an LLM writing `fn foo() -> Result<T, E> { assert!(...); ... }` — a Result signature that lies |
| `float_cmp` | pedantic | *"using `==` or `!=` on float values instead of comparing difference with an allowed error"* | rare in a CLI but appears in progress-bar/size-comparison code |
| `cast_possible_truncation` | pedantic | *"checks for casts between numeric types that may truncate large values"* | `usize as u32` for file sizes/offsets is a classic LLM cast that silently truncates on large files |
| `cast_sign_loss` | pedantic | *"checks for casts from a signed to an unsigned numeric type where negative values wrap around"* | `i64 as u64` on a negative duration/offset wraps instead of erroring |
| `cast_precision_loss` | pedantic | *"checks for casts from numeric types to float types where the receiving type cannot store all values"* | `u64 as f64` for byte counts/progress percentages loses precision above 2^53 |
| `arithmetic_side_effects` | restriction | overflow/division-error detector on any arithmetic op | unchecked `+`/`*` on sizes/offsets derived from untrusted registry responses is a real overflow-panic vector |
| `integer_division` | restriction | *"integer division may cause loss of precision"* | `total / count` for percentages silently truncates; LLM code rarely casts to float first |
| `mem_forget` | restriction | *"`mem::forget` usage on `Drop` types, likely to cause memory leaks"* | LLM occasionally reaches for `mem::forget` to "avoid a double-free" instead of understanding ownership — always wrong in safe Rust |
| `todo` | restriction | *"`todo!` should not be present in production code"* | catches unfinished LLM stubs that would otherwise compile and ship |
| `unimplemented` | restriction | *"`unimplemented!` should not be present in production code"* | same failure mode as `todo` |
| `dbg_macro` | restriction | *"`dbg!` macro is intended as a debugging tool"* | LLM debugging-session artifacts left in the diff |
| `print_stdout` / `print_stderr` | restriction | *"printing on stdout"* / *"printing on stderr"* | forces routing through `tracing`/structured logging instead of ad hoc `println!` sprinkled by the agent while debugging |
| `unwrap_in_result` | restriction | fns returning `Result`/`Option` that still call `.unwrap()`/`.expect()` internally | catches the "half-converted to `?`" pattern an LLM leaves after a refactor |
| `missing_errors_doc` | pedantic | *"`pub fn` returns `Result` without `# Errors` in doc comment"* | LLM-generated public APIs routinely skip the `# Errors` section; this is a mechanical, cheap-to-fix signal |
| `missing_panics_doc` | pedantic | *"`pub fn` may panic without `# Panics` in doc comment"* | catches undocumented panic paths the agent introduced via `.unwrap()`/indexing before those are fixed |
| `must_use_candidate` | pedantic | *"checks for functions that should be marked with the `#[must_use]` attribute"* | prevents an LLM from writing a builder/validation method whose result silently gets dropped |
| `needless_pass_by_value` | pedantic | fns taking by-value args they never consume | LLM default is `fn f(s: String, v: Vec<T>)` even when `&str`/`&[T]` suffices — real cost in a filesystem-heavy hot path |
| `redundant_clone` | **nursery** (not perf) | *"`clone()` of an owned value that is going to be dropped immediately"* | genuinely catches the reflexive `.clone()` LLMs insert to dodge a borrow-checker error instead of restructuring ownership — but audit hits manually, it has false positives |
| `large_enum_variant` | perf | *"large size difference between variants on an enum"* | protocol/wire-format enums (OCI manifest variants) where one variant embeds a big struct bloat every instance to the largest size |
| `result_large_err` | perf | *"function returning `Result` with large `Err` type"* | an `anyhow::Error`-wrapped or raw struct `Err` bloats every `Result` return, including the `Ok` path |
| `await_holding_lock` | suspicious (warn by default) | held `std::sync::MutexGuard` across `.await` | classic tokio deadlock/starvation bug; `std::sync::Mutex` guards are not `Send`-safe across await points |
| `await_holding_refcell_ref` | suspicious (warn by default) | held `RefCell` `Ref`/`RefMut` across `.await` | same failure class for interior-mutability borrows |
| `unused_async` | pedantic | *"finds async functions with no await statements"* | tokio-heavy codebases accumulate `async fn` stubs that never actually await — needless `Future` overhead and API friction for callers |
| `get_unwrap` | restriction | *"using `.get().unwrap()` or `.get_mut().unwrap()` when using `[]` would work instead"* | ironic anti-pattern: using the "safe" accessor and then immediately unwrapping it away |
| `expect_fun_call` | perf | *"using any `expect` method with a function call"* | `x.expect(&format!(...))` eagerly evaluates the message on every call, even the non-panicking path — real perf cost in hot loops |
| `disallowed_methods` | style | user-configured ban list | see §6 — this is the mechanism, not a single behavior |
| `disallowed_types` | style | user-configured ban list | see §6 |
| `module_name_repetitions` | restriction | flags `foo::FooBar` naming | stylistic only; listed here because it's commonly assumed to be a bug-catcher and isn't — deliberately `allow` above |
| `missing_docs_in_private_items` | restriction | *"detects missing documentation for private members"* | too aggressive for internal modules in a fast-moving CLI; listed to explain why it's `allow`d above, not a recommendation to enable |
| `single_call_fn` | restriction | flags functions called from exactly one site | Clippy's own doc comment says *"If this lint is used, prepare to `#[allow]` it a lot"* — explicitly not a general-purpose lint |
| `exhaustive_enums` / `exhaustive_structs` | restriction | flags exported types missing `#[non_exhaustive]` | only relevant for a crate publishing a stable external API — irrelevant noise for CLI-internal types |
| `string_slice` | restriction | *"slicing a string"* | `&s[1..]` panics mid-codepoint on non-ASCII input; an OCI registry/CLI handling arbitrary user strings (tags, paths) should prefer `char_indices`/`.get(..)` |
| `min_ident_chars` | restriction | flags single/short identifiers | too noisy for idiomatic Rust (`i`, `e`, `x` in narrow scope) — listed as a known false-positive generator, not a recommendation |
| `shadow_unrelated` | restriction | flags shadowing with an unrelated value | conflicts with the common `let x = x.try_into()?;` conversion idiom — deliberately `allow`d above |

No newer 2025/2026-specific "AI-authored-code" lint category was found; Clippy does not currently ship a lint group specifically marketed at catching LLM-generated bugs — the value comes entirely from combining existing `restriction`/`pedantic` lints as above.

### 4. rustc lint policy

Beyond Clippy, the compiler's own **allow-by-default** lints are the second enforcement layer ([rustc allowed-by-default lints](https://doc.rust-lang.org/rustc/lints/listing/allowed-by-default.html)):

| Lint | Verified description | Recommendation for this project |
|---|---|---|
| `unsafe_code` | *"catches usage of `unsafe` code and other potentially unsound constructs like `no_mangle`, `export_name`, and `link_section`"* | `deny` at the workspace root; carve out a narrow `#[allow(unsafe_code)]` only in the specific module that needs FFI/mmap, if any — a package manager over OCI registries should have zero unsafe by default |
| `missing_docs` | *"detects missing documentation for public items"*, allow-by-default because noisy | `warn` on library crates (the `-core`/`-lib` crate exposing types to other OCX crates), `allow` on the binary crate |
| `unreachable_pub` | *"triggers for `pub` items not reachable from other crates"* | `warn` — directly targets "everything dumped in one crate with free-standing functions": items marked `pub` that are actually only used within the crate should be `pub(crate)`, which is exactly the visibility-discipline problem named in the project brief |
| `unused_crate_dependencies` | detects unused crate dependencies (compiler-level, complements `cargo-machete`/`cargo-shear`) | `warn`; catches dependencies referenced only in `Cargo.toml`, including via disabled feature flags — cheap, no extra tool needed |
| `trivial_casts` | *"detects trivial casts which could be replaced with coercion"*, allow-by-default because of known false positives | `allow` — the false-positive rate documented in the rustc book makes this not worth the noise |
| `elided_lifetimes_in_paths` | *"detects the use of hidden lifetime parameters"*, allow-by-default, "has some known issues" | `warn` — worth it in a filesystem/HTTP-client-heavy codebase where lifetime-carrying types (`&'a Path`, borrowed response bodies) are common; makes borrows visible at every call site |
| `unused_qualifications` | detects unnecessarily-qualified paths | `warn` — cosmetic but cheap, and it's exactly the kind of thing an LLM leaves after copy-pasting a fully-qualified path from an error message |
| `rust_2018_idioms` | lint **group**: `bare_trait_objects`, `elided_lifetimes_in_paths`, `ellipsis_inclusive_range_patterns`, `explicit_outlives_requirements`, `unused_extern_crates` | `warn` the whole group — this project is well past edition 2018 so these are all safe, long-stable idioms |
| `missing_debug_implementations` | allow-by-default; adding `Debug` everywhere has compile-time/binary-size cost | `allow` at workspace level, but consider `warn` on error types specifically (an error type without `Debug` is a debugging dead end) |

Edition-2024-specific lint changes (verified against the [Rust 2024 Edition Guide](https://doc.rust-lang.org/edition-guide/rust-2024/unsafe-op-in-unsafe-fn.html) and [rustc lint groups](https://doc.rust-lang.org/rustc/lints/groups.html)):
- `unsafe_op_in_unsafe_fn` moved from allow-by-default to **warn-by-default** in edition 2024. An `unsafe fn` body no longer implicitly authorizes unsafe operations inside it — each one still needs its own `unsafe { }` block. Migrate mechanically with `cargo fix --edition`.
- The `rust_2024_compatibility` lint group bundles the migration-relevant lints for editions 2021→2024: `if_let_rescope`, `impl_trait_overcaptures`, `keyword_idents_2024`, `missing_unsafe_on_extern`, `rust_2024_incompatible_pat`, `static_mut_refs`, `unsafe_op_in_unsafe_fn`, `boxed_slice_into_iter`, `deprecated_safe_2024`, among others (15 total).
- `if_let_rescope` matters specifically for lock-guard code: edition 2024 changed the temporary-scope rules for `if let` so that a `MutexGuard` created in the condition is dropped at the end of the `if let`'s block, not held for the entire enclosing scope — verify any `if let Ok(guard) = mutex.lock() { ... }` pattern still releases the lock where expected after an edition bump.

### 5. Where to configure lints: Cargo.toml vs attributes vs RUSTFLAGS

Three layers exist; they are not equivalent and mixing them carelessly causes drift between local `cargo check` and CI:

1. **`[lints]` in Cargo.toml (recommended primary layer).** Stabilized in Rust 1.74 ([Cargo Book](https://doc.rust-lang.org/cargo/reference/manifest.html#the-lints-section)). Lives in version control, applies to every `cargo build`/`check`/`clippy` invocation without any special CI flag, and supports workspace-wide inheritance:
   ```toml
   # workspace root Cargo.toml
   [workspace.lints.rust]
   unsafe_code = "deny"

   [workspace.lints.clippy]
   unwrap_used = "deny"
   ```
   ```toml
   # each member crate's Cargo.toml
   [lints]
   workspace = true
   ```
   Caveat: this only affects the local package — Cargo suppresses lints from non-path (registry) dependencies via `--cap-lints`, so it cannot be used to enforce policy on third-party code.

2. **`#![deny(...)]` / `#![warn(...)]` crate-root attributes.** Still useful for lints that must apply even when the crate is compiled as a dependency of something else (attributes are baked into the crate, `[lints]` is developer-experience-only for the *current* package's own build). Downside: harder to keep in sync across a multi-crate workspace than a single `[workspace.lints]` table, and attribute-level lint config can't use the `priority` field to resolve group/individual-lint conflicts.

3. **`RUSTFLAGS=-D warnings` in CI.** The most common pitfall layer. It denies *every* warning process-wide, including ones from `build.rs` scripts, proc-macro expansion, and (depending on how the build is invoked) dependency crates — and because `RUSTFLAGS` participates in Cargo's build-hash, changing it between CI runs and local dev invalidates the incremental compilation cache, causing full rebuilds. Prefer scoping the deny to the tool invocation instead: `cargo clippy --workspace --all-targets -- -D warnings`, or simply rely on `[lints]` with `deny`/`forbid` levels so `cargo build` itself already fails — no CI-only flag needed at all. Reserve `RUSTFLAGS` for flags that have no Cargo.toml equivalent (e.g. sanitizer flags).

Priority ordering when multiple sources disagree, from the rustc book ([lint levels](https://doc.rust-lang.org/rustc/lints/levels.html)), highest wins:
`--force-warn` CLI flag > `--cap-lints` > CLI `-A`/`-D`/`-W`/`-F` flags > source attributes (innermost wins) > default level. `forbid` cannot be downgraded by anything except a later `deny` inside the same forbid scope (which is itself rejected).

### 6. `#[allow]` / `#[expect]` discipline and `clippy.toml`

Rust has six lint levels, not four: `allow`, **`expect`**, `warn`, **`force-warn`**, `deny`, `forbid` ([rustc lint levels](https://doc.rust-lang.org/rustc/lints/levels.html)). `expect`, stabilized as part of RFC 2383, is the edition-2024-era replacement for `#[allow]` wherever the suppression is meant to be *temporary and reviewed*:

```rust
// WRONG — silently rots; nobody notices when the underlying code changes
// and the lint no longer even applies here.
#[allow(clippy::unwrap_used)]
fn parse_manifest(bytes: &[u8]) -> Manifest {
    serde_json::from_slice(bytes).unwrap()
}

// RIGHT — if this stops firing (e.g. someone later adds proper error
// handling), `unfulfilled_lint_expectations` fires instead, forcing a
// human to notice and delete the now-stale suppression.
#[expect(clippy::unwrap_used, reason = "manifest is validated by the OCI client before this call")]
fn parse_manifest(bytes: &[u8]) -> Manifest {
    serde_json::from_slice(bytes).unwrap()
}
```

Every `#[allow]`/`#[expect]` should carry a `reason = "..."` — this is supported on both attributes ([rustc lint levels](https://doc.rust-lang.org/rustc/lints/levels.html)) and is the cheapest possible code-review signal: a suppression without a reason is a red flag a reviewer (human or agent) should reject on sight.

`clippy.toml` is the separate configuration file for *how enabled lints behave* — thresholds and disallow-lists, not lint levels ([lint configuration guide](https://doc.rust-lang.org/clippy/lint_configuration.html)):

```toml
# clippy.toml — sits next to the workspace root Cargo.toml

# MSRV gate: clippy avoids suggesting fixes that need a newer Rust than this,
# and (with check-incompatible-msrv-in-tests) flags code that already
# violates it.
msrv = "1.85"

# Thresholds tuned for a CLI, not library defaults.
cognitive-complexity-threshold = 20   # default 25; tighter forces smaller functions
too-many-arguments-threshold   = 6    # default 7; clap subcommand handlers grow fast
type-complexity-threshold      = 250  # default; OCI response types are already nested enough

# Ban specific std/library calls that are almost always wrong in THIS
# codebase's context (async, cross-platform, testable).
disallowed-methods = [
    { path = "std::env::set_var", reason = "not thread-safe / unsound as of edition 2024 (env::set_var is now unsafe); route config through a typed Config struct instead" },
    { path = "std::env::remove_var", reason = "same soundness issue as set_var" },
    { path = "std::process::exit", reason = "skips Drop and unwinding; return a Result from main and let the top-level handler choose the exit code" },
    { path = "std::time::Instant::now", reason = "untestable in library code; inject a Clock trait or pass timestamps in" },
    { path = "std::thread::sleep", reason = "blocks the tokio worker thread; use tokio::time::sleep in async code" },
    { path = "std::fs::read_to_string", reason = "use the async tokio::fs equivalent in async contexts; if this is genuinely sync-only code, allow locally with a reason" },
]

disallowed-types = [
    { path = "std::sync::Mutex", reason = "prefer tokio::sync::Mutex in async code paths — a std Mutex held across .await deadlocks the runtime (see await_holding_lock)" },
]

# Allow a few restriction lints inside test modules without a blanket crate allow.
allow-unwrap-in-tests = true
allow-expect-in-tests = true
allow-dbg-in-tests    = true
```

Note: `disallowed-methods` and `disallowed-types` are inert without the corresponding lint enabled at `deny`/`warn` level in `[lints.clippy]` (§2) — the two files are a matched pair.

### 7. rustfmt: stable options, style_edition, and CI

`style_edition` decouples "which Rust Style Guide revision rustfmt formats to" from "which parser edition the crate compiles as." By default it tracks the `edition` field, but a `rustfmt.toml` can set it independently — this matters because upgrading `Cargo.toml`'s `edition = "2024"` for the compiler no longer force-reformats the whole codebase unless `style_edition` also moves ([Edition Guide: rustfmt style edition](https://doc.rust-lang.org/edition-guide/rust-2024/rustfmt-style-edition.html)).

```toml
# rustfmt.toml — stable-only options, safe for CI + `cargo fmt --check`
style_edition = "2024"
max_width = 100
use_small_heuristics = "Default"
reorder_imports = true
```

Verified stable vs unstable status ([rustfmt Configurations.md, master branch](https://raw.githubusercontent.com/rust-lang/rustfmt/master/Configurations.md)):

| Option | Stability | Default | Note |
|---|---|---|---|
| `max_width` | stable | `100` | |
| `edition` | stable | `"2015"` (auto-read from Cargo.toml under `cargo fmt`) | |
| `style_edition` | stable | `"2015"` | `"2027"` value exists but is itself unstable |
| `use_small_heuristics` | stable | `"Default"` | |
| `chain_width` / `fn_call_width` | stable | `60` (as % of max_width) | |
| `reorder_imports` | stable | `true` | |
| `imports_granularity` | **unstable** | `Preserve` | needs nightly + `unstable_features = true` |
| `group_imports` | **unstable** | `Preserve` | same |
| `wrap_comments` | **unstable** | `false` | same |
| `format_code_in_doc_comments` | **unstable** | `false` | same |
| `unstable_features` | **unstable** (meta-flag) | `false` | must itself be true on nightly for the above to take effect |

Practical consequence: a team that wants `imports_granularity = "Crate"` or `wrap_comments = true` must either pin CI to nightly rustfmt (fragile — nightly rustfmt itself changes behavior release to release) or accept those options are aspirational only. Most production setups stay stable-only and skip the unstable import/comment grooming options.

CI check:
```bash
cargo fmt --all -- --check
```
`--check` exits nonzero on any diff without writing files — this is the correct CI invocation; do not run bare `cargo fmt` in CI (it silently mutates the tree and reports success).

### 8. Toolchain policy: pinning, MSRV, nightly boundaries

`rust-toolchain.toml` at the repo root is the standard reproducibility mechanism ([rustup overrides](https://rust-lang.github.io/rustup/overrides.html)):

```toml
[toolchain]
channel = "1.85.0"                       # pin to an exact stable release, not "stable"
components = ["rustfmt", "clippy"]       # additive to whatever profile installs
profile = "minimal"                      # smallest install; CI adds only what it needs
targets = ["x86_64-unknown-linux-musl"]  # cross-compile target for static Linux binaries, if relevant
```

- `channel = "stable"` (floating) means every contributor's toolchain silently drifts on the next `rustup update`, and a new stable release can introduce new default-warn lints that break CI without a code change — pin to an exact version (`"1.85.0"`) for a security-sensitive, cross-platform-shipped CLI, and bump it as a deliberate, reviewed commit.
- Override precedence (closest wins): CLI shorthand (`cargo +nightly ...`) > `RUSTUP_TOOLCHAIN` env var > `rustup override` (directory-scoped) > `rust-toolchain.toml` > global default. A committed `rust-toolchain.toml` is what makes `cargo build` reproducible for a contributor who has never touched `rustup override`.
- **MSRV** is declared separately, in `Cargo.toml`'s `[package] rust-version = "1.80"` field — this is a *lower bound* Cargo itself checks against (dependency resolution respects it since Cargo 1.74), distinct from `rust-toolchain.toml`'s *exact pin* for the toolchain actually used to build. `clippy.toml`'s `msrv` key (§6) is a third, related setting that tells Clippy not to suggest fixes requiring a newer Rust than the MSRV.
- Test MSRV compliance in CI with a dedicated job pinned to the MSRV version (`cargo +1.80.0 check --workspace`), separate from the main pinned-toolchain job — this is the only way to catch "works on my pinned 1.85 but breaks on the documented 1.80 floor."
- Nightly usage boundary: keep nightly strictly to opt-in, non-blocking CI jobs (fuzzing, unstable rustfmt formatting, `-Z` flags for experiments). Never let the shipped binary's build depend on a nightly-only feature — this directly contradicts "prebuilt binaries, cross-platform" from the project brief, since nightly toolchains are not a stable target for reproducible release builds.

### 9. Additional tooling: what earns its CI time

| Tool | What it does | Verdict for this project |
|---|---|---|
| [`cargo-machete`](https://github.com/bnjbvr/cargo-machete) | Regex-based unused-dependency detector; fast (`cargo install cargo-machete`, then `cargo machete`); exit codes 0/1/2 | Cheap first pass — false positives on macro-only or build-script-only usage require a `[package.metadata.cargo-machete] ignored = [...]` allowlist |
| [`cargo-shear`](https://github.com/Boshen/cargo-shear) | Uses an actual Rust parser (not regex) to find unused deps, *misplaced* deps (dev-dep used in non-dev code or vice versa), and orphaned source files never reachable from any module tree; `cargo shear --fix` auto-removes | Prefer this over `cargo-machete` where CI budget allows both; the misplaced-dependency and orphaned-file checks are new value cargo-machete doesn't have — directly useful against "everything dumped in one crate" |
| [`cargo-udeps`](https://github.com/est31/cargo-udeps) *(referenced, not independently fetched this pass — see contested section)* | Nightly-only unused-dep detector via rustc's own dependency tracking | Slower (needs a real nightly build) and nightly-only; `cargo-shear` is the modern stable-toolchain replacement for most of its value |
| [`cargo-hack`](https://github.com/taiki-e/cargo-hack) | Feature-combination test runner: `--each-feature`, `--feature-powerset` | Run `cargo hack check --each-feature --no-dev-deps` on every PR (fast); reserve `--feature-powerset` for a nightly/scheduled job — powerset cost grows combinatorially with feature count |
| `cargo-sort` | Alphabetizes `[dependencies]` tables in Cargo.toml | Low value if `taplo` is already enforcing TOML formatting; skip unless dependency-table churn in diffs is a recurring reviewer complaint |
| [`typos`](https://github.com/crate-ci/typos) | Fast spell-checker tuned for source code (low false-positive rate); `typos` to check, `typos -w` to fix, config in `_typos.toml` | Earns its CI time — near-zero false positives, catches doc-comment and error-message typos an LLM introduces at volume, one line in CI (`typos`) |
| [`taplo`](https://github.com/tamasfe/taplo) | TOML formatter/linter (`taplo fmt --check`, `taplo lint`) for `Cargo.toml`/`clippy.toml`/`rustfmt.toml` themselves | Worth adding given this project has *multiple* TOML config files (`Cargo.toml` per crate, `clippy.toml`, `rust-toolchain.toml`, and its own `grimoire.toml`/`ocx.toml`) — keeps them all in one consistent style |
| [`committed`](https://github.com/crate-ci/committed) | Commit-message linter (Conventional-Commits-style rules), `committed HEAD` / `committed main..HEAD --no-merge-commit` | Optional; valuable mainly if release tooling parses commit messages for changelog generation — check whether OCX's release process already does that before adding |
| `cog` (Cocogitto) | Conventional-commit enforcement + changelog/version-bump automation | Overlaps with `committed`; only adopt one of the two, and only if commit-driven versioning is the release strategy — don't run both |

## Normative guidance candidates

1. **Every crate in the workspace inherits `[lints]` from `[workspace.lints]`; no crate defines its own lint table.** *Rationale:* prevents the "one crate has strict lints, the sibling crate is unlint" drift this project is prone to given its multi-crate ambition. *Verify:* `grep -L 'workspace = true' -r --include=Cargo.toml -A2 '\[lints\]'` across all member Cargo.toml files should find none defining lints outside `workspace = true`.
2. **`clippy::unwrap_used` and `clippy::expect_used` are `deny`, and every remaining call site carries `#[expect(clippy::unwrap_used, reason = "...")]`, never bare `#[allow]`.** *Rationale:* the single highest-value guard against the project's named failure mode (LLM-authored code reaching for `.unwrap()`). *Verify:* `cargo clippy --workspace -- -D clippy::unwrap_used -D clippy::expect_used` exits 0; `grep -rn '#\[allow(clippy::unwrap_used' --include=*.rs` returns nothing (all suppressions must be `#[expect]` with a reason, not `#[allow]`).
3. **No `#[allow(...)]` or `#[expect(...)]` attribute lacks a `reason = "..."` string.** *Rationale:* an unreasoned suppression is unreviewable by a future agent or human. *Verify:* `grep -rn '#\[\(allow\|expect\)(' --include=*.rs | grep -v 'reason ='` should be empty (manual check for multi-line attributes; a small script or clippy's own `lint_groups_priority`/custom check may be needed for full coverage).
4. **`std::env::set_var`, `std::process::exit`, and `std::sync::Mutex` (in async-touching modules) are all in `clippy.toml`'s `disallowed-methods`/`disallowed-types`, and `clippy::disallowed_methods`/`disallowed_types` are `deny`.** *Rationale:* these three are exactly the std APIs whose correct-looking call sites are wrong in this project's async, cross-platform, testable context. *Verify:* `cargo clippy --workspace -- -D clippy::disallowed_methods -D clippy::disallowed_types` fails on any violation; confirm the three entries exist via `grep -A1 'disallowed-methods' clippy.toml`.
5. **`rust-toolchain.toml` pins an exact `channel` version (e.g. `"1.85.0"`), never a floating channel name like `"stable"`.** *Rationale:* reproducible builds for a project shipping prebuilt cross-platform binaries; a floating channel means CI and contributor builds can silently diverge. *Verify:* `channel` value in `rust-toolchain.toml` matches `^\d+\.\d+\.\d+$`, not `stable`/`beta`/`nightly` (bare).
6. **A dedicated CI job builds against the declared `rust-version` MSRV, separate from the pinned-toolchain job.** *Rationale:* the pinned toolchain guarantees reproducibility, not MSRV compliance — those are two different guarantees that need two different jobs. *Verify:* CI config has a job invoking `cargo +<msrv-version> check --workspace --all-features`, where `<msrv-version>` matches `Cargo.toml`'s `rust-version`.
7. **`cargo fmt --all -- --check` and `cargo clippy --workspace --all-targets --all-features -- -D warnings` both run in CI as required (non-optional, blocking) checks.** *Rationale:* format and lint drift is otherwise discovered post-merge. *Verify:* CI workflow file greps for both exact invocations; a PR with either failing must fail the check.
8. **No nightly-only Cargo feature, rustfmt option, or `-Z` flag is required to produce the release binary.** *Rationale:* the project ships prebuilt binaries across Linux/macOS/Windows — nightly toolchains are not a stable release target. *Verify:* the release build job's toolchain matches `rust-toolchain.toml`'s pinned stable channel, not `+nightly`; `grep -rn 'unstable_features\s*=\s*true' rustfmt.toml` and any `#![feature(...)]` in non-test code should both be empty.
9. **`clippy::redundant_clone` is never enabled at `deny` workspace-wide; if used, it's a scoped, time-boxed `warn` during an explicit clone-reduction pass.** *Rationale:* it lives in the `nursery` group precisely because of known false positives (verified against source). *Verify:* `grep 'redundant_clone' Cargo.toml` (workspace root) shows `"allow"` or is absent, never `"deny"`/`"forbid"`.
10. **`await_holding_lock` and `await_holding_refcell_ref` are `deny`, not left at their default `warn`.** *Rationale:* in a tokio-async, OCI-HTTP-client codebase, a `std::sync::MutexGuard` or `RefCell` borrow held across `.await` is a deadlock/soundness bug waiting for the right concurrency scenario, not a style nit. *Verify:* `cargo clippy --workspace -- -D clippy::await_holding_lock -D clippy::await_holding_refcell_ref` exits 0.
11. **`unreachable_pub` is `warn` (or `deny`) at the workspace level.** *Rationale:* directly targets the named pain point ("nearly everything in one crate, dominated by free-standing functions") by forcing every `pub` item to justify its visibility. *Verify:* `cargo build --workspace 2>&1 | grep -c unreachable_pub` trends toward zero over time; new PRs introduce zero new hits (`cargo clippy` diff against base branch).
12. **Every public function in a library crate that returns `Result` has a `# Errors` doc section, and every one that can panic has a `# Panics` section.** *Rationale:* `missing_errors_doc`/`missing_panics_doc` make failure modes discoverable without reading the implementation — critical when an autonomous agent, not just a human, is the API consumer. *Verify:* `cargo clippy --workspace -- -D clippy::missing_errors_doc -D clippy::missing_panics_doc` exits 0 on library crates (binary/`main.rs` crate may exempt this).

## AI-agent angle

- **Reaching for `.unwrap()`/`.expect()` as the default error-handling strategy.** This is the single most common LLM habit in Rust generation — training data is saturated with tutorial-style code where `.unwrap()` is fine. Mechanical check: `clippy::unwrap_used`/`expect_used` at `deny` (rule 2) makes this a compile-time failure instead of a review-time catch.
- **Writing `#[allow(clippy::...)]` to make a denied lint go away, without a `reason`, instead of fixing the underlying code.** An agent under time pressure treats the lint as the obstacle rather than the signal. Mechanical check: rule 3's grep for reasonless `#[allow]`/`#[expect]` attributes; reject any PR that adds one.
- **Casting between numeric types with bare `as` instead of `try_into()`/`TryFrom`.** `usize as u32`, `i64 as u32` compile silently and are exactly what an LLM writes when converting a byte count or offset without thinking about the target platform's `usize` width (relevant given this project targets Linux/macOS/Windows, where `usize` differs). Mechanical check: `cast_possible_truncation`/`cast_sign_loss`/`cast_precision_loss` at `warn` or `deny`; grep for bare `as` casts between differently-sized integer types as a supplementary heuristic (`grep -rn ' as u32\| as i32\| as usize' --include=*.rs`).
- **Hallucinating a `std::env::set_var` call as if it were still ordinary safe code.** Edition 2024 made `env::set_var`/`remove_var` `unsafe fn` due to genuine soundness issues in multi-threaded programs; an LLM trained on pre-2024 idioms will write it as a plain call and may even wrap it in an unnecessary/incorrect `unsafe` block copied from elsewhere, or the model may simply not know it changed. Mechanical check: `clippy.toml`'s `disallowed-methods` entry for `std::env::set_var` (§6, rule 4) catches this regardless of whether the model correctly marked it `unsafe`.
- **Holding a `std::sync::Mutex` guard across an `.await` point.** An LLM writing tokio code frequently mixes `std::sync::Mutex` (learned from sync-Rust training data) with async functions, producing code that compiles, appears correct, and deadlocks only under real concurrent load — exactly the kind of bug that won't show up in a single-threaded unit test. Mechanical check: `await_holding_lock` at `deny` (rule 10) — this is a lint an LLM cannot "know" to satisfy by pattern-matching training data, because the bug is invisible in isolation.
- **Writing a public API that returns `Result<T, E>` but never documents the error conditions, because the model generated the happy path and the signature but not the doc prose to match.** Mechanical check: `missing_errors_doc`/`missing_panics_doc` at `warn` (rule 12) forces the doc comment to exist, which is a weak but real signal that error paths were actually considered, not just typed.
- **Treating `rust-toolchain.toml`'s `channel = "stable"` as equivalent to a pinned version, because both "work" locally.** An agent asked to "set up the toolchain" will often write the semantically-loosest thing that compiles, not the reproducible one, since it has no way to observe drift within a single session. Mechanical check: rule 5's regex on the `channel` field.
- **Adding a new dependency without checking whether the crate already has one that does the job, then leaving the old one in `Cargo.toml` unused after a refactor.** LLMs are prone to dependency creep across multi-turn sessions where earlier context (which crate handles X) is lost. Mechanical check: `cargo shear` (or `cargo machete`) in CI (rule/tool from §9) catches the leftover half of this pattern; it does not catch the "added a redundant new dependency that duplicates an existing one" half — that still needs a reading heuristic (reviewer checks new `[dependencies]` entries against existing ones with overlapping purpose).

## Contested / evolving

- **`cargo-udeps` vs `cargo-shear` vs `cargo-machete`.** `cargo-udeps` was for years the most accurate unused-dependency tool because it hooks rustc's own dependency tracking, but it requires nightly and is comparatively slow. `cargo-shear`'s parser-based approach (using rust-analyzer) is newer and claims comparable accuracy on a stable toolchain; the ecosystem has not fully converged on which is now the default recommendation, and `cargo-machete` remains popular purely for install-and-forget speed despite its documented false positives ([cargo-machete README](https://github.com/bnjbvr/cargo-machete), [cargo-shear README](https://github.com/Boshen/cargo-shear)). Trend: stable-toolchain, parser-based tools (`cargo-shear`) are gaining over nightly-only (`cargo-udeps`) as the community moves away from requiring nightly in ordinary CI.
- **Whether `clippy::pedantic` and `clippy::nursery` should be enabled wholesale versus lint-by-lint.** Clippy's own docs mark `nursery` as explicitly unstable/false-positive-prone, yet many high-profile projects (including parts of the Rust compiler's own tooling ecosystem) enable it wholesale and allow-list exceptions, on the theory that catching real bugs earlier is worth occasional noise. This document recommends the wholesale-enable-then-allowlist approach (§2) as the lower-maintenance option for a project this document expects to evolve quickly, but the alternative (lint-by-lint opt-in, zero noise) is a legitimate, more conservative choice some teams prefer.
- **`RUSTFLAGS=-D warnings` as a CI pattern.** Still extremely common in blog posts and CI templates despite the incremental-cache-busting and blanket-scope problems noted in §5; the `[lints]` table (stable since 1.74) is the more recent, more correct replacement, but a large fraction of existing Rust CI configuration predates it and hasn't been migrated. Treat any `RUSTFLAGS=-D warnings` seen in a template as historical-only guidance to be replaced.
- **`unstable_features = true` rustfmt configs on nightly CI.** Some teams accept nightly-only rustfmt (for `imports_granularity`, `group_imports`, `wrap_comments`) because the formatting improvements are worth the fragility; others treat any nightly dependency in the format-check path as unacceptable for a project that ships stable-toolchain release binaries. No consensus; this document takes the stable-only side (§7) as the safer default for a cross-platform-shipped CLI.
- **Committed/cog for commit linting.** Genuinely optional and lower-consensus than the lint/format tooling above — whether it's worth adopting depends entirely on whether release automation consumes conventional-commit metadata, which this research did not confirm for the OCX/Grimoire family specifically.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [Clippy lint configuration guide](https://doc.rust-lang.org/clippy/lint_configuration.html) | Official Clippy book, lint groups + `clippy.toml` reference | current (master) | Primary source for all 9 group definitions and the full `clippy.toml` knob list |
| [Clippy lint index](https://rust-lang.github.io/rust-clippy/master/index.html) | Official searchable lint index | current (master) | Primary source for several confirmed lint/group pairs (partial coverage due to page size) |
| [rust-clippy `declared_lints.rs` (raw source)](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/declared_lints.rs) | Actual compiler source, master branch | August 2026 | Ground truth for lint existence/module location; used to locate every individual lint's source file for group verification |
| [`clippy_lints/src/methods/mod.rs`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/methods/mod.rs) | Clippy source | August 2026 | Verified `unwrap_used`, `expect_used`, `get_unwrap`, `expect_fun_call` groups+descriptions directly from `declare_clippy_lint!` |
| [`clippy_lints/src/redundant_clone.rs`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/redundant_clone.rs) | Clippy source | August 2026 | Verified `redundant_clone` is `nursery`, correcting a wrong `perf` claim from a secondary source |
| [`clippy_lints/src/disallowed_methods.rs`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/disallowed_methods.rs) | Clippy source | August 2026 | Verified `disallowed_methods`/`disallowed_types` are `style`, not `restriction` |
| [`clippy_lints/src/operators/mod.rs`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/operators/mod.rs) | Clippy source | August 2026 | Verified `float_cmp` (pedantic), `arithmetic_side_effects` (restriction), `integer_division` (restriction) |
| [`clippy_lints/src/panic_unimplemented.rs`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/panic_unimplemented.rs) | Clippy source | August 2026 | Verified `todo`, `unimplemented`, `panic` are all `restriction` |
| [`clippy_lints/src/write/mod.rs`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/write/mod.rs) | Clippy source | August 2026 | Verified `print_stdout`/`print_stderr` are `restriction` |
| [`clippy_lints/src/doc/mod.rs`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/doc/mod.rs) | Clippy source | August 2026 | Verified `missing_errors_doc`/`missing_panics_doc` are `pedantic` |
| [Cargo Book: manifest `[lints]` section](https://doc.rust-lang.org/cargo/reference/manifest.html#the-lints-section) | Official Cargo reference | current | Primary source for `[lints]` syntax, `priority` field, MSRV (1.74) |
| [Cargo Book: Workspaces, `[workspace.lints]`](https://doc.rust-lang.org/cargo/reference/workspaces.html) | Official Cargo reference | current | Primary source for workspace lint inheritance syntax |
| [rustc book: lint levels](https://doc.rust-lang.org/rustc/lints/levels.html) | Official rustc reference | current | Primary source for the 6 lint levels, `#[expect]` semantics, `reason=`, priority ordering |
| [rustc book: allowed-by-default lints](https://doc.rust-lang.org/rustc/lints/listing/allowed-by-default.html) | Official rustc reference | current | Primary source for `unsafe_code`, `missing_docs`, `unreachable_pub`, `trivial_casts`, `elided_lifetimes_in_paths` descriptions |
| [rustc book: lint groups](https://doc.rust-lang.org/rustc/lints/groups.html) | Official rustc reference | current | Primary source for `rust_2018_idioms`, `rust_2021_compatibility`, `rust_2024_compatibility` group membership |
| [Rust 2024 Edition Guide: `unsafe_op_in_unsafe_fn`](https://doc.rust-lang.org/edition-guide/rust-2024/unsafe-op-in-unsafe-fn.html) | Official edition migration guide | edition 2024 (Rust 1.85, Feb 2025) | Primary source for the warn-by-default change and `cargo fix --edition` migration path |
| [Rust 2024 Edition Guide: rustfmt style edition](https://doc.rust-lang.org/edition-guide/rust-2024/rustfmt-style-edition.html) | Official edition migration guide | edition 2024 | Primary source for `style_edition` decoupling from `edition` |
| [rustfmt `Configurations.md` (raw, master)](https://raw.githubusercontent.com/rust-lang/rustfmt/master/Configurations.md) | Official rustfmt config reference | current (master) | Primary source for stable/unstable status and defaults of every rustfmt option cited |
| [rustup: overrides](https://rust-lang.github.io/rustup/overrides.html) | Official rustup book | current | Primary source for `rust-toolchain.toml` fields and override precedence order |
| [cargo-machete README](https://github.com/bnjbvr/cargo-machete) | Tool repo | current | Primary source for cargo-machete's regex-based approach and known false-positive classes |
| [cargo-shear README](https://github.com/Boshen/cargo-shear) | Tool repo | current | Primary source for cargo-shear's parser-based approach and comparison claims vs cargo-machete |
| [cargo-hack README](https://github.com/taiki-e/cargo-hack) | Tool repo | current | Primary source for `--each-feature`/`--feature-powerset`/`--no-dev-deps` semantics |
| [typos README](https://github.com/crate-ci/typos) | Tool repo | current | Primary source for `_typos.toml` config shape and CLI flags |
| [committed README](https://github.com/crate-ci/committed) | Tool repo | current | Primary source for commit-message linting config and CI integration options |
