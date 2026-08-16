---
title: Rustdoc, Doc Tests, and Documentation Discipline
topic: Rust documentation practice for production CLI/library crates
agent: rust-docs-observability
model: sonnet
date_researched: 2026-08
sources_count: 16
scope: >
  Covers rustdoc conventions (crate/module/item docs, standard sections, API Guidelines C-*
  items), doc tests as compiled examples (attributes, hidden lines, ? operator, 2024-edition
  merged-doctest performance change), doc(alias)/doc(hidden)/doc(cfg)/doc_auto_cfg, missing_docs
  and rustdoc lints, README/lib.rs sync via cargo-rdme, CLI documentation (clap_mangen, mdBook,
  trycmd), and changelog/deprecation/semver documentation obligations. Does NOT cover general
  Rust API design (naming, error types) beyond the documentation-specific C-* items, nor
  non-Rust doc generators.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Rustdoc conventions and the API Guidelines](#1-rustdoc-conventions-and-the-api-guidelines)
   2. [The first-line summary rule](#2-the-first-line-summary-rule)
   3. [Standard sections: Examples, Errors, Panics, Safety](#3-standard-sections-examples-errors-panics-safety)
   4. [Doc tests as compiled examples](#4-doc-tests-as-compiled-examples)
   5. [Doc test attributes](#5-doc-test-attributes)
   6. [Hidden setup lines and the `?` operator](#6-hidden-setup-lines-and-the--operator)
   7. [Doc test cost in CI and the 2024/2025 merged-doctest change](#7-doc-test-cost-in-ci-and-the-20242025-merged-doctest-change)
   8. [Intra-doc links](#8-intra-doc-links)
   9. [`#[doc(alias)]`, `#[doc(hidden)]`, `#[doc(cfg)]` / `doc_auto_cfg`](#9-docalias-dochidden-doccfg--doc_auto_cfg)
   10. [Lints: `missing_docs`, `broken_intra_doc_links`, `cargo doc -D warnings`](#10-lints-missing_docs-broken_intra_doc_links-cargo-doc--d-warnings)
   11. [README/lib.rs synchronization](#11-readmelibrs-synchronization)
   12. [Docs for a CLI: man pages, `--help`, mdBook, testing documented commands](#12-docs-for-a-cli-man-pages---help-mdbook-testing-documented-commands)
   13. [Changelogs, deprecation, and semver documentation obligations](#13-changelogs-deprecation-and-semver-documentation-obligations)
   14. [Writing style for docs an AI agent will read](#14-writing-style-for-docs-an-ai-agent-will-read)
   15. [Doc anti-patterns](#15-doc-anti-patterns)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- Every public item should have a rustdoc example (`C-EXAMPLE`); a single shared example with cross-references is acceptable when items are closely related ([Rust API Guidelines](https://rust-lang.github.io/api-guidelines/documentation.html)).
- Doc-test example code must use `?`, never `unwrap()` or `try!`, because examples get copy-pasted verbatim into real code (`C-QUESTION-MARK`) ([Rust API Guidelines](https://rust-lang.github.io/api-guidelines/documentation.html)).
- Fallible functions need an `# Errors` section, panicking functions need `# Panics`, and every `unsafe fn` needs `# Safety` documenting caller invariants (`C-FAILURE`) ([Rust API Guidelines](https://rust-lang.github.io/api-guidelines/documentation.html)).
- The text before the first blank line in a doc comment is the searched/listed summary — keep it to one concise sentence ([rustdoc book: how to write documentation](https://doc.rust-lang.org/rustdoc/how-to-write-documentation.html)).
- Doc tests compile and run by default; `no_run` compiles but skips execution (network/side-effect code), `should_panic` expects a panic, `compile_fail` expects a compile error, and `ignore` skips entirely and should be avoided in favor of `text` (non-Rust) or `#`-hidden working code ([Documentation tests](https://doc.rust-lang.org/rustdoc/write-documentation/documentation-tests.html)).
- Lines prefixed with `#` in a doc-test code block compile but don't render — the standard way to hide setup/boilerplate while keeping the example runnable ([Documentation tests](https://doc.rust-lang.org/rustdoc/write-documentation/documentation-tests.html)).
- To use `?` in a doc test without a custom `main`, either hide a `Result`-returning `main` with `#` lines, or terminate with `# Ok::<(), ErrType>(())` (no whitespace inside `(())`) ([Documentation tests](https://doc.rust-lang.org/rustdoc/write-documentation/documentation-tests.html)).
- Starting with the 2024 edition, rustdoc merges compatible doctests into a single compiland before compiling, cutting wall time dramatically (sysinfo: 4.59s vs. much more previously; rustc: 102s) — use `standalone_crate` on a doctest that depends on being alone (e.g. reads `Location::caller()` line numbers) to opt it out of merging ([Documentation tests](https://doc.rust-lang.org/rustdoc/write-documentation/documentation-tests.html)).
- `missing_docs` is allow-by-default; a library crate that wants enforced item docs must explicitly `#![warn(missing_docs)]` or `#![deny(missing_docs)]` ([rustc allowed-by-default lints](https://doc.rust-lang.org/rustc/lints/listing/allowed-by-default.html)).
- `broken_intra_doc_links`, `private_intra_doc_links`, `invalid_html_tags`, `invalid_codeblock_attributes`, and `bare_urls` all warn by default under rustdoc (not rustc) ([rustdoc lints](https://doc.rust-lang.org/rustdoc/lints.html)).
- Intra-doc links (`` [`Type`] ``, `[text](Path)`) resolve automatically; disambiguate name collisions with prefixes like `struct@Foo`, `fn@Foo`, or `` [`foo!()`] `` for macros ([Linking to items by name](https://doc.rust-lang.org/rustdoc/write-documentation/linking-to-items-by-name.html)).
- `#[doc(hidden)]` removes an item from rendered docs (used for internal-but-`pub` items forced public by macro or trait plumbing); `#[doc(alias = "...")]` makes an item findable under an alternate name, e.g. its FFI symbol ([the `#[doc]` attribute](https://doc.rust-lang.org/rustdoc/write-documentation/the-doc-attribute.html)).
- `#[doc(cfg(...))]` and `#[doc(auto_cfg)]` (auto-cfg enabled by default at crate level) render "Available on `cfg(...)` only" badges for feature-gated items — still **unstable**, gated behind `#![feature(doc_cfg)]` as of this research ([rustdoc unstable features](https://doc.rust-lang.org/rustdoc/unstable-features.html)).
- `#![doc = include_str!("../README.md")]` makes the crate's front page literally the README, guaranteeing they can't drift apart, at the cost of README-specific content (badges, install instructions) leaking into docs.rs — `cargo-rdme` is the tool of choice when you want the reverse relationship (README generated from doc comments) ([cargo-rdme](https://github.com/orium/cargo-rdme)).
- For CLIs: generate man pages from the same `clap::Command` at build time with `clap_mangen` rather than hand-maintaining them — recommended as a `build.rs` step or an `xtask`, not baked into the shipped binary ([clap_mangen](https://docs.rs/clap_mangen/latest/clap_mangen/)).
- `trycmd` snapshot-tests literal CLI invocations, including ones embedded in README/markdown files, so documented command examples fail CI the moment real behavior diverges from what's documented ([trycmd](https://docs.rs/trycmd/latest/trycmd/)).
- Keep-a-changelog format requires one dated entry per release, grouped under `Added/Changed/Deprecated/Removed/Fixed/Security`, newest first, with a running "Unreleased" section — the format is explicitly for human readers, not machines ([Keep a Changelog](https://keepachangelog.com/en/1.1.0/)).
- `#[deprecated(since = "X.Y.Z", note = "...")]` is the correct deprecation vehicle: rustc warns on use, rustdoc surfaces the version and note, and `since`/`note` are checkable by external tools even though rustc itself doesn't validate `since` ([Rust reference: deprecated attribute](https://doc.rust-lang.org/reference/attributes/diagnostics.html#the-deprecated-attribute)).
- Adding new public API, adding `#[non_exhaustive]` variants, and adding `#[deprecated]` are semver-minor/non-breaking; removing/renaming public items, adding non-defaulted trait items, and adding fields to a struct that was previously fully public are semver-major/breaking — document `rust-version` and platform support explicitly rather than leaving them implicit ([Cargo SemVer compatibility](https://doc.rust-lang.org/cargo/reference/semver.html)).

## Findings

### 1. Rustdoc conventions and the API Guidelines

The Rust API Guidelines is the de facto normative source for documentation conventions and defines documentation-specific checklist items with stable `C-*` IDs ([API Guidelines: Documentation](https://rust-lang.github.io/api-guidelines/documentation.html), [Checklist](https://rust-lang.github.io/api-guidelines/checklist.html)):

| ID | Guideline |
|---|---|
| `C-CRATE-DOC` | Crate level docs are thorough and include examples (references [RFC 1687](https://github.com/rust-lang/rfcs/blob/master/text/1687-crate-level-docs.md)) |
| `C-EXAMPLE` | All items have a rustdoc example |
| `C-QUESTION-MARK` | Examples use `?`, not `try!`, not `unwrap` |
| `C-FAILURE` | Function docs include error, panic, and safety considerations |
| `C-LINK` | Prose contains hyperlinks to relevant things |
| `C-METADATA` | `Cargo.toml` includes all common metadata (`authors`, `description`, `license`, `repository`, `keywords`, `categories`, optionally `documentation`/`homepage`) |
| `C-RELNOTES` | Release notes document all significant changes |
| `C-HIDDEN` | Rustdoc does not show unhelpful implementation details (use `#[doc(hidden)]` / `pub(crate)`) |

`C-EXAMPLE` is explicit that an example should show *why*, not just *how*:

```rust
// anti-pattern flagged by the guidelines: mechanics without purpose
fn main() {
    let hello = "hello";
    hello.clone();
}
```

### 2. The first-line summary rule

Everything before the first blank line in a `///` or `//!` comment is the item's summary — it is what shows up in module listings and search results, so it must stand alone as one sentence ([how-to-write-documentation](https://doc.rust-lang.org/rustdoc/how-to-write-documentation.html)):

```rust
//! Fast and easy queue abstraction.
//!
//! Provides an abstraction over a queue. When the abstraction is used
//! there are these advantages:
//! - Fast
//! - [`Easy`]
```

RFC 1574 reinforces the tense/mood convention for that summary line: third-person singular present tense — "Returns the argument unchanged" not "Return the..." — and full type names ("`Option<T>`", not "`Option`") ([RFC 1574](https://rust-lang.github.io/rfcs/1574-more-api-documentation-conventions.html)).

### 3. Standard sections: Examples, Errors, Panics, Safety

RFC 1574 fixes the canonical section headers as `# Examples` (always plural), `# Panics`, `# Errors`, `# Safety`, plus rarer `# Aborts` / `# Undefined Behavior` ([RFC 1574](https://rust-lang.github.io/rfcs/1574-more-api-documentation-conventions.html)). The API Guidelines make three of these effectively mandatory via `C-FAILURE`: fallible functions get `# Errors`, panicking functions get `# Panics`, `unsafe fn` gets `# Safety` describing caller-upheld invariants ([API Guidelines](https://rust-lang.github.io/api-guidelines/documentation.html)). Real example from `std::env::args()` showing the pattern in practice ([how-to-write-documentation](https://doc.rust-lang.org/rustdoc/how-to-write-documentation.html)):

```rust
/// Returns the arguments which this program was started with (normally passed
/// via the command line).
///
/// # Panics
///
/// The returned iterator will panic during iteration if any argument to the
/// process is not valid unicode.
///
/// # Examples
///
/// ```
/// use std::env;
/// for argument in env::args() {
///     println!("{argument}");
/// }
/// ```
```

### 4. Doc tests as compiled examples

`rustdoc --test` (surfaced through `cargo test --doc`) extracts every fenced Rust code block from doc comments and compiles+runs it. Before compiling, rustdoc auto-inserts `#[allow(unused_variables, unused_assignments, unused_mut, unused_attributes, dead_code)]`, injects `extern crate <mycrate>;` unless the block already has one (or `#![doc(test(no_crate_inject))]` is set), and wraps the block in `fn main() { ... }` if no `main` is present ([Documentation tests](https://doc.rust-lang.org/rustdoc/write-documentation/documentation-tests.html)). This is why example code in docs is treated as the primary, continuously-verified example surface for a Rust crate — a stale example is a compile failure, not a silent lie.

### 5. Doc test attributes

Attributes go on the opening code fence: ` ```attr ` ([Documentation tests](https://doc.rust-lang.org/rustdoc/write-documentation/documentation-tests.html)):

| Attribute | Behavior |
|---|---|
| (none) | Compile and run; failure (compile error or panic) fails the test |
| `no_run` | Compile only — for examples that touch the network, disk, or otherwise shouldn't execute in CI |
| `should_panic` | Must compile and must panic at runtime |
| `compile_fail` | Must fail to compile |
| `ignore` | Skipped entirely — the book explicitly discourages this in favor of `text` for non-Rust snippets or `#`-hidden lines for working-but-elided code |
| `edition2015`/`2018`/`2021`/`2024` | Forces a specific edition for that block |
| `standalone_crate` | Opts a block out of doctest merging, e.g. when it depends on being compiled alone (line-number-sensitive code) |
| custom `,{class=...}` | Attaches a CSS class for non-Rust snippets |

```rust
/// ```no_run
/// loop {
///     println!("Hello, world");
/// }
/// ```

/// ```compile_fail
/// let x = 5;
/// x += 2; // shouldn't compile!
/// ```

/// ```should_panic
/// assert!(false);
/// ```
```

### 6. Hidden setup lines and the `?` operator

A line prefixed with `# ` in a fenced block compiles/runs but is stripped from the rendered doc — the standard mechanism for boilerplate that would clutter the example ([Documentation tests](https://doc.rust-lang.org/rustdoc/write-documentation/documentation-tests.html)):

```rust
/// ```
/// /// Some documentation.
/// # fn foo() {} // hidden from rendered output, present in compiled test
/// println!("Hello, World!");
/// ```
```

To display a literal line beginning with `#` (e.g. a shell comment in embedded output), escape it as `##`.

For `?` in doc tests (which by default run inside a `()`-returning `main`), three patterns are standard, in ascending order of terseness — API Guidelines `C-QUESTION-MARK` mandates one of these over `unwrap()`:

```rust
/// ```
/// use std::io;
/// # fn main() -> io::Result<()> {
/// let mut input = String::new();
/// io::stdin().read_line(&mut input)?;
/// # Ok(())
/// # }
/// ```

/// ```
/// use std::io;
/// let mut input = String::new();
/// io::stdin().read_line(&mut input)?;
/// # Ok::<(), io::Error>(())   // NB: no whitespace inside (())
/// ```
```

### 7. Doc test cost in CI and the 2024/2025 merged-doctest change

Every doctest is historically its own compiled crate — for a crate with hundreds of small doc examples this means hundreds of separate `rustc` invocations, dominated by compilation overhead rather than execution. Starting with the 2024 edition, rustdoc merges *compatible* doctests into one compilation unit before compiling them, while still running each in its own process; the book cites concrete before/after numbers: the `sysinfo` crate's doctest suite drops to 4.59s wall time, and `rustc`'s own core-library doctests drop to 102s wall time (previously dominated by ~775s of separate compilation) ([Documentation tests — Performance Optimization](https://doc.rust-lang.org/rustdoc/write-documentation/documentation-tests.html)). Practical implication for a CI pipeline: doctest suites that were previously slow enough to skip or run only on release branches are now cheap enough to run on every PR on edition-2024 crates; a doctest that depends on not being merged (e.g., asserting on `Location::caller().line()`) must opt out with `standalone_crate`.

### 8. Intra-doc links

Rustdoc resolves item paths directly inside doc comments — no need to hand-write a docs.rs URL ([Linking to items by name](https://doc.rust-lang.org/rustdoc/write-documentation/linking-to-items-by-name.html)):

```rust
/// See [`Bar`], or [bar][b], or [`Self::method`].
///
/// [b]: Bar
```

Backticks are stripped for resolution, so `` [`Option`] `` links correctly. When a name is ambiguous across namespaces, disambiguate with a prefix: `struct@Foo`, `fn@Foo`, `` [`foo!()`] `` for a macro invoked with parens. Links resolve in the scope where the item is *defined*, not where it's re-exported (except for doc comments attached directly to the re-export, which resolve in the re-export's scope). This is the mechanism `C-LINK` calls for.

### 9. `#[doc(alias)]`, `#[doc(hidden)]`, `#[doc(cfg)]` / `doc_auto_cfg`

`#[doc(alias = "...")]` makes an item discoverable in rustdoc's search index under a name other than its Rust identifier — the canonical use case is FFI wrappers, so a user who knows the C symbol `lib_name_do_something` finds `Obj::do_something` ([the `#[doc]` attribute](https://doc.rust-lang.org/rustdoc/write-documentation/the-doc-attribute.html)):

```rust
impl Obj {
    #[doc(alias = "lib_name_do_something")]
    pub fn do_something(&mut self) -> i32 { /* ... */ }
}
```

`#[doc(hidden)]` removes an item from rendered docs entirely (it still exists and is still `pub`, satisfying `C-HIDDEN` for items that must be public for macro/trait-plumbing reasons but aren't part of the intended API).

`#[doc(cfg(...))]` and `#[doc(auto_cfg)]` render "Available on `cfg(...)` only" badges for feature-gated items; `auto_cfg` is on by default at crate level and infers the badge from the item's real `#[cfg(...)]`, while explicit `#[doc(cfg(...))]` overrides it. **As of this research these remain unstable**, gated behind `#![feature(doc_cfg)]`, so they are nightly-only / docs.rs-only (docs.rs builds with nightly rustdoc) rather than something a stable-toolchain CI can rely on ([rustdoc unstable features](https://doc.rust-lang.org/rustdoc/unstable-features.html)).

### 10. Lints: `missing_docs`, `broken_intra_doc_links`, `cargo doc -D warnings`

`missing_docs` is a **rustc** lint (works with plain `cargo build`, not just `cargo doc`) and is **allow-by-default** — a crate gets zero enforcement unless it opts in with `#![warn(missing_docs)]` or `#![deny(missing_docs)]` at the crate root ([rustc allowed-by-default lints](https://doc.rust-lang.org/rustc/lints/listing/allowed-by-default.html)).

Rustdoc (not rustc) ships a separate lint group that mostly **warns by default**, so it already fires without any opt-in during `cargo doc`: `broken_intra_doc_links`, `private_intra_doc_links`, `invalid_html_tags`, `invalid_codeblock_attributes`, `invalid_rust_codeblocks`, `bare_urls`, `redundant_explicit_links`. `missing_crate_level_docs`, `private_doc_tests`, and `unescaped_backticks` are allow-by-default ([rustdoc lints](https://doc.rust-lang.org/rustdoc/lints.html)):

```rust
#![allow(rustdoc::broken_intra_doc_links)]  // silence
#![warn(rustdoc::broken_intra_doc_links)]   // default
#![deny(rustdoc::broken_intra_doc_links)]   // fail the build
```

Because these are warnings, not errors, by default, a CI job must run `RUSTDOCFLAGS="-D warnings" cargo doc --no-deps` (or `cargo doc -D warnings` in workflows that alias it) to turn a broken intra-doc link or invalid HTML tag into a build failure — otherwise `cargo doc` "succeeds" while silently producing pages with dead links.

### 11. README/lib.rs synchronization

Two opposite directions of sync are both common, and a project must pick one direction, not attempt to hand-maintain both independently:

- **README ← crate docs**: `#![doc = include_str!("../README.md")]` at the crate root makes the README the single source of truth and the docs.rs front page literally identical to it. Simple, zero extra tooling, but README-only content (badges, contribution links) then also appears on docs.rs.
- **README → crate docs, generated**: `cargo-rdme` extracts the crate-level `//!` doc comment and writes it into a `<!-- cargo-rdme -->`-marked section of `README.md`, stripping `#`-hidden lines from embedded code blocks, rewriting intra-doc links to working docs.rs URLs, and adjusting heading depth. Verified in CI with `cargo rdme --check` (exit 0 = current, 3 = outdated, 4 = warnings) ([cargo-rdme](https://github.com/orium/cargo-rdme)).

Either way, the failure mode this prevents is doc drift: a README example that still compiles conceptually but no longer matches the real API, silently, because nothing re-checks it against the crate.

### 12. Docs for a CLI: man pages, `--help`, mdBook, testing documented commands

`--help` (from `clap`'s derived or builder API) is the primary, always-in-sync documentation surface for a CLI — it's generated from the same `Command` definition that parses arguments, so it cannot drift the way hand-written docs can.

For a man page, `clap_mangen` renders ROFF output from the same `clap::Command` value, normally invoked from `build.rs` (or an `xtask`, recommended by the docs to avoid slowing down every `cargo build`) so the man page is regenerated whenever the CLI definition changes ([clap_mangen](https://docs.rs/clap_mangen/latest/clap_mangen/)):

```rust
// build.rs
fn main() -> std::io::Result<()> {
    let out_dir = std::path::PathBuf::from(std::env::var_os("OUT_DIR").unwrap());
    let cmd = clap::Command::new("mybin")
        .arg(clap::arg!(-n --name <NAME>))
        .arg(clap::arg!(-c --count <NUM>));
    let man = clap_mangen::Man::new(cmd);
    let mut buffer = Vec::new();
    man.render(&mut buffer)?;
    std::fs::write(out_dir.join("mybin.1"), buffer)
}
```

For a broader reference site (multi-page CLI reference, guides, tutorials), `mdBook` is the ecosystem-standard generator — used for *The Rust Programming Language* book itself — and supports `mdbook test`, which extracts and runs Rust code blocks the same way `cargo test --doc` does for a library, so a documentation site's code samples don't silently rot ([mdBook](https://rust-lang.github.io/mdBook/)).

For testing *documented CLI invocations specifically* (not Rust code, but literal `$ mytool --flag` transcripts as they appear in a README or reference doc), `trycmd` runs the exact command shown and diffs real stdout/stderr/exit-code against the documented expectation, including extracting cases straight out of `README.md` ([trycmd](https://docs.rs/trycmd/latest/trycmd/)):

```rust
#[test]
fn cli_tests() {
    trycmd::TestCases::new()
        .case("tests/cmd/*.toml")
        .case("README.md");
}
```

This closes the gap `--help`/man pages don't: a worked example ("run `grim install foo`, you should see...") that would otherwise only be checked by a human eyeballing a screenshot.

### 13. Changelogs, deprecation, and semver documentation obligations

**Keep a Changelog** format ([keepachangelog.com](https://keepachangelog.com/en/1.1.0/)) fixes six categories — `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security` — one dated (ISO 8601) entry per released version, newest first, with a running `Unreleased` section that gets renamed into a version section at release time. It's explicit that "changelogs are for humans, not machines," i.e. it's a curation exercise, not a commit dump.

**git-cliff** ([git-cliff.org](https://git-cliff.org/docs/)) is the generated alternative: it parses git history against the Conventional Commits grammar (`fix:` → patch, `feat:` → minor, `feat!:`/`BREAKING CHANGE:` → major) and renders a changelog from a template configured in `cliff.toml`. The two are not mutually exclusive — a project can adopt Conventional Commits as the *source discipline* and still hand-curate the final Keep-a-Changelog-formatted output, or run git-cliff templated to produce Keep-a-Changelog-shaped output directly.

**Deprecation**: `#[deprecated(since = "X.Y.Z", note = "use Y instead")]` is the only mechanism that's both machine-checked (rustc emits a use-site warning) and visible in rendered docs (rustdoc surfaces `since`/`note` on the item page) ([Rust reference: deprecated attribute](https://doc.rust-lang.org/reference/attributes/diagnostics.html#the-deprecated-attribute)). It cannot be applied to trait-impl items, and applying it to a module/impl block propagates to all children.

```rust
#[deprecated(since = "5.2.0", note = "foo was rarely used. Users should instead use bar")]
pub fn foo() {}
```

**Semver obligations**: the Cargo book's SemVer compatibility reference is the authoritative classification of breaking vs. non-breaking changes ([Cargo: SemVer compatibility](https://doc.rust-lang.org/cargo/reference/semver.html)). Selected rules directly relevant to documentation discipline:

| Change | Breaking? |
|---|---|
| Removing/renaming a public item | Yes (major) |
| Adding a field to a struct that was previously 100%-public | Yes (major) — breaks exhaustive struct-literal construction |
| Adding an enum variant *without* `#[non_exhaustive]` | Yes (major) |
| Adding a new public item | No (minor) |
| Adding an enum variant *with* `#[non_exhaustive]` (marked at introduction) | No (minor) |
| Adding `#[deprecated]` to an existing item | No (minor) — warns, doesn't break the build |
| Adding `#[non_exhaustive]` to a struct/enum that previously had no private fields | Yes (major) — retroactively adding it is itself breaking |

The guide's own framing: these are "guidelines, not rules" and judgment calls are fine "if clearly communicated" — i.e., the changelog/release-notes obligation (`C-RELNOTES`) is what makes a judgment call legitimate rather than a silent surprise.

### 14. Writing style for docs an AI agent will read

None of the primary sources above are about LLM comprehension specifically — this is inference from how the sources themselves are structured, cross-checked against what makes a doc "partial-read-safe":

- The first-line-summary convention (§2) is exactly the property that makes a doc corpus skimmable by truncation: an agent that reads only the first paragraph of N items (to stay in budget) gets a correct one-sentence answer for each, precisely because rustdoc tooling already enforces "everything before the blank line must stand alone."
- Fixed section headers (`# Errors`, `# Panics`, `# Safety` — §3) are a machine-greppable contract: an agent auditing "does this fallible function document its error conditions" can `grep -A5 '# Errors'` instead of parsing prose. Free-form prose ("this can fail if...") defeats that.
- A compiling doc test (§4) is machine-verifiable ground truth an LLM-authored patch can be checked against — `cargo test --doc` catches a hallucinated method signature or renamed type in an example the same way it would in any other test, which plain prose examples cannot.
- Intra-doc links (§8) turn "what does `Foo` mean here" into a resolvable graph edge rather than a string an agent has to guess at or search for by name.

### 15. Doc anti-patterns

Consolidated from the sources above and the API Guidelines' explicit "avoid" callouts:

- **Restating the signature**: `/// Returns a Foo.` on `fn foo() -> Foo` — the anti-pattern the `C-EXAMPLE` guideline calls out directly: showing *how* to call it when the signature already says that, instead of *why* you'd call it ([API Guidelines](https://rust-lang.github.io/api-guidelines/documentation.html)).
- **`unwrap()` in an example** — violates `C-QUESTION-MARK`; readers copy it into production code that now panics on the first real error.
- **`ignore` on a doctest that could run** — the rustdoc book calls this out by name: use `#`-hidden setup or `no_run` instead, because `ignore` means the example silently stops being checked forever ([Documentation tests](https://doc.rust-lang.org/rustdoc/write-documentation/documentation-tests.html)).
- **Undocumented `# Errors` / `# Panics` on a fallible/panicking `pub fn`** — directly contradicts `C-FAILURE`; `missing_docs` will not catch this because it only checks for *presence* of any doc comment, not the presence of specific sections.
- **Docs that live only in a wiki or external site**: nothing about a wiki page is checked by `cargo doc`, `cargo test --doc`, or the compiler — it can describe an API that no longer exists and nothing in CI will ever notice.
- **"TODO: document"** as literal doc-comment content: passes `missing_docs` (a doc comment is present) while conveying zero information — `missing_docs` checks presence, not quality, so this defeats the lint entirely while looking compliant.

## Normative guidance candidates

1. **Every `pub` item has a rustdoc doc comment whose first line is a single, complete sentence.** Rationale: enforces `C-CRATE-DOC`/summary convention; a truncated read must still be correct. Verify: `#![deny(missing_docs)]` at crate root + `cargo doc --no-deps 2>&1 | grep -i "missing documentation"` returns nothing; manually scan for doc comments where the first line has no terminal period or spans past the first blank line.
2. **Every fallible `pub fn` (returns `Result`) has a `# Errors` section; every function that can panic has a `# Panics` section; every `unsafe fn` has a `# Safety` section.** Rationale: `C-FAILURE`. Verify: `grep -rn "pub fn.*-> Result" src/ | ...` cross-referenced against `grep -B20 "# Errors"` per file, or a small script that parses each `pub fn` returning `Result`/marked `unsafe` and checks the preceding doc block for the header; `unsafe fn` without `# Safety` is a `grep -B5 'unsafe fn'` scan.
3. **Doc-test example code uses `?`, never `.unwrap()` or `.expect(...)`.** Rationale: `C-QUESTION-MARK` — examples are copy-pasted into production. Verify: `grep -rn '\.unwrap()\|\.expect(' src/**/*.rs` restricted to lines inside ` ``` ` fenced blocks in doc comments (a script that extracts fenced blocks from `///`/`//!` lines and greps them).
4. **No doctest is marked `ignore` unless a comment on the same line states why it cannot compile or run.** Rationale: `ignore` permanently disables verification; the rustdoc book treats it as a last resort. Verify: `grep -rn '```ignore' src/ | grep -v '// why:'` (or equivalent) flags unexplained instances.
5. **CI runs `cargo test --doc` (or full `cargo test`) and `RUSTDOCFLAGS="-D warnings" cargo doc --no-deps --all-features` on every PR.** Rationale: doctest merging (2024 edition) made this cheap; rustdoc's link/HTML lints only fail the build when warnings are denied. Verify: grep the CI workflow file for both invocations; a broken intra-doc link introduced in a PR should fail CI, not just show a warning in a build log nobody reads.
6. **A crate with 2+ significant `pub use` re-exports declares its README-sync direction explicitly** (either `#![doc = include_str!("../README.md")]` or a `cargo-rdme --check` CI job) — never hand-maintain both independently. Rationale: undeclared direction is how README and lib.rs docs silently diverge. Verify: `grep -rn 'include_str!("../README' src/lib.rs` OR presence of a `cargo rdme --check` step in CI; absence of both on a crate with a nontrivial README is a finding.
7. **Every public API break lands with a `#[deprecated(since = "...", note = "...")]` cycle before removal, and every release entry in the changelog names the breaking change explicitly.** Rationale: `C-RELNOTES` + Cargo semver guide's explicit preference for deprecate-then-remove. Verify: for a removed `pub` item, `git log -p -- <file>` should show a prior commit adding `#[deprecated]` to it; changelog entry exists under `Removed`/`Changed` for the same version.
8. **A CLI's `--help` output and its man page/reference docs are generated from the same `clap::Command`, not hand-duplicated.** Rationale: hand-duplicated flag docs drift the moment a flag is added or renamed. Verify: presence of `clap_mangen` in `build.rs`/`Cargo.toml` build-dependencies, or absence of a hand-written `.1` man page committed to the repo alongside a separate flag list in a markdown doc.
9. **Every literal command transcript in README/docs (`$ tool --flag` → expected output) is covered by a `trycmd` case, not just prose.** Rationale: worked CLI examples are the highest-drift documentation surface because nothing else checks them. Verify: presence of a `#[test]` calling `trycmd::TestCases::new().case("README.md")` (or equivalent) in the test suite.
10. **Feature-gated (`#[cfg(feature = "...")]`) public items document which feature enables them, in prose, since `#[doc(cfg(...))]`/`doc_auto_cfg` badges remain nightly-only.** Rationale: stable-toolchain `cargo doc` cannot render the automatic badge, so silence on stable docs would otherwise hide the requirement entirely. Verify: `grep -B3 '#\[cfg(feature' src/**/*.rs` and check the preceding doc comment mentions the feature name in prose.

## AI-agent angle

Characteristic LLM mistakes in this subarea, and the smallest mechanical check that catches each:

- **Writing `# Example` (singular) instead of `# Examples`.** RFC 1574 fixes the plural form; models trained on mixed corpora frequently emit the singular by analogy with "# Panic". Check: `grep -rn '# Example$\|# Example ' src/**/*.rs` (excluding `# Examples`).
- **Using `unwrap()`/`expect()` in a generated doc example "for brevity."** This is the single most common LLM doc-test habit, because it produces shorter, more obviously "working" code in isolation — it directly violates `C-QUESTION-MARK`. Check: grep fenced code blocks inside doc comments for `.unwrap(`/`.expect(`.
- **Hallucinating a method or field name inside a doc example that doesn't exist on the real type**, because the example is generated from the model's general Rust knowledge rather than the actual crate. This is the one class of doc bug that is *fully* mechanically caught: `cargo test --doc` fails to compile. The failure mode is an agent that writes the doc comment but never runs `cargo test --doc` before considering the task done — treat "ran the doctest suite" as a hard gate, not optional polish.
- **Marking a doctest `ignore` to "make CI pass" when it actually fails to compile**, rather than fixing the example or legitimately marking it `no_run`/`compile_fail`. This silently launders a broken example into a permanently-unchecked one. Check: any diff that adds ` ```ignore ` should be treated as a review-blocking change requiring an explicit justification comment (rule 4 above).
- **Emitting `#[doc(cfg(...))]` or `doc_auto_cfg` in code destined for a stable-toolchain build**, because these read as normal in docs.rs-published crates the model has seen, but they require `#![feature(doc_cfg)]` and fail to compile on stable rustc/rustdoc. Check: `grep -rn 'doc(cfg\|doc(auto_cfg' src/` cross-referenced against `grep 'feature(doc_cfg)' src/lib.rs`; presence of the former without the latter, or presence of either at all in a crate that must build on stable, is a defect.
- **Writing a changelog entry as a raw commit-message dump** rather than curated, categorized prose — an agent asked to "update the changelog" from `git log` output will often paste subject lines verbatim under no category, violating Keep a Changelog's explicit "for humans, not machines" framing. Check: every new changelog entry falls under one of the six fixed headings (`Added/Changed/Deprecated/Removed/Fixed/Security`); an entry that is a literal `git log` subject line (starts with a Conventional Commits type prefix like `feat:`/`fix:`) is a smell.
- **Deprecating with a bare `#[deprecated]` (no `since`, no `note`)**, which compiles and satisfies "I added deprecation" superficially but gives the caller no version to reason about and no migration path. Check: `grep -rn '#\[deprecated\]$' src/` (bare form, no parenthesized args) — anything found should almost always carry `since`/`note` instead.
- **Adding a public struct field without checking whether the struct was previously fully public**, not realizing this is a semver-major change, and shipping it as a patch/minor version bump. Check: for any PR that adds a field to a `pub struct`, verify whether that struct already had `#[non_exhaustive]` or any private field before the change — if not, this is a breaking change and the version bump / changelog category must reflect it (rule 7).

## Contested / evolving

- **`#[doc(cfg(...))]` / `doc_auto_cfg` stability**: widely used in the wild (docs.rs builds every crate with nightly rustdoc, so the feature works there today) but still gated behind `#![feature(doc_cfg)]` as of this research — a crate that wants the badge on stable-only CI simply cannot have it yet; practice has settled on "use it, guarded by `#[cfg_attr(docsrs, feature(doc_cfg))]` conditionally enabled only for the docs.rs build," not on waiting for stabilization ([rustdoc unstable features](https://doc.rust-lang.org/rustdoc/unstable-features.html)).
- **Merged doctests (§7) is a genuinely recent (2024-edition-era) change** to how `cargo test --doc` executes; older blog posts and Stack Overflow answers advising "keep doctests light because compilation is expensive per-example" are now measuring a cost structure that no longer applies on edition-2024 crates to the same degree — this is exactly the kind of historical-only guidance to flag when auditing an AI agent's advice, since a model trained on older material will still repeat the old cost argument as a reason to prefer `no_run`/`ignore` over compiling examples.
- **Generated changelogs (git-cliff/Conventional Commits) vs. hand-curated Keep a Changelog** remain two live, competing disciplines rather than a settled consensus — Keep a Changelog's own text insists changelogs are "for humans," implicitly pushing back on pure commit-message generation, while git-cliff's whole value proposition is automating that same curation from disciplined commit messages. Projects that adopt Conventional Commits as a *writing discipline* while still hand-templating the rendered output (rather than accepting raw generated text) appear to be where practice is trending, but there is no single dominant convention across the Rust ecosystem.
- **`missing_docs` as deny-by-default** is not itself contested (it's clearly allow-by-default and opt-in), but *whether it should be enabled crate-wide from day one* on a still-churning internal crate is a live judgment call — enabling it early forces documentation discipline as code is written; enabling it late means retrofitting docs onto an existing large `pub` surface, which teams often defer indefinitely once the crate is not brand new.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [Rust API Guidelines — Documentation](https://rust-lang.github.io/api-guidelines/documentation.html) | Community-maintained normative guideline doc (rust-lang org) | Living document, 2024/2025-current | Defines the `C-*` IDs (`C-CRATE-DOC`, `C-EXAMPLE`, `C-QUESTION-MARK`, `C-FAILURE`, `C-LINK`, `C-METADATA`, `C-RELNOTES`, `C-HIDDEN`) that are the checkable core of this subarea |
| [Rust API Guidelines — Checklist](https://rust-lang.github.io/api-guidelines/checklist.html) | Full checklist cross-reference | Living document | One-line summary of every `C-*` ID, useful as a grep-target list |
| [rustdoc book — How to write documentation](https://doc.rust-lang.org/rustdoc/how-to-write-documentation.html) | Official rustdoc book chapter | Rust stable docs, current | Primary source for crate-level doc syntax, first-line-summary rule, markdown extensions, `std::env::args` worked example |
| [rustdoc book — Documentation tests](https://doc.rust-lang.org/rustdoc/write-documentation/documentation-tests.html) | Official rustdoc book chapter | Rust stable docs, current, includes 2024-edition merged-doctest perf section | Primary source for every doctest attribute (`no_run`/`ignore`/`compile_fail`/`should_panic`/`standalone_crate`), `#`-hidden lines, `?`-operator patterns, and the merged-doctest performance numbers |
| [rustdoc book — Lints](https://doc.rust-lang.org/rustdoc/lints.html) | Official rustdoc book chapter | Rust stable docs, current | Authoritative default levels for `broken_intra_doc_links`, `private_intra_doc_links`, `invalid_html_tags`, etc. |
| [rustdoc book — Linking to items by name](https://doc.rust-lang.org/rustdoc/write-documentation/linking-to-items-by-name.html) | Official rustdoc book chapter | Rust stable docs, current | Primary source for intra-doc link syntax and disambiguators |
| [rustdoc book — The `#[doc]` attribute](https://doc.rust-lang.org/rustdoc/write-documentation/the-doc-attribute.html) | Official rustdoc book chapter | Rust stable docs, current | Primary source for `doc(alias)`, `doc(hidden)`, `doc(inline)`/`no_inline`, `doc(test(attr(...)))`, `include_str!` pattern |
| [rustdoc book — Unstable features](https://doc.rust-lang.org/rustdoc/unstable-features.html) | Official rustdoc book chapter | Rust nightly docs, current | Primary source establishing `doc(cfg)`/`doc_auto_cfg` are still nightly-gated, with exact syntax |
| [rustc book — Allowed-by-default lints](https://doc.rust-lang.org/rustc/lints/listing/allowed-by-default.html) | Official rustc book chapter | Rust stable docs, current | Primary source that `missing_docs` is allow-by-default and how to opt in |
| [Rust reference — the `deprecated` attribute](https://doc.rust-lang.org/reference/attributes/diagnostics.html#the-deprecated-attribute) | Official Rust language reference | Current | Primary source for exact `#[deprecated(since, note)]` syntax, inheritance, and disallowed positions (trait impls) |
| [RFC 1574 — More API documentation conventions](https://rust-lang.github.io/rfcs/1574-more-api-documentation-conventions.html) | Accepted Rust RFC | 2016, still normative | Origin of the fixed section-header vocabulary (`# Examples` plural, `# Panics`, `# Errors`, `# Safety`) and prose-style conventions |
| [Cargo book — SemVer compatibility](https://doc.rust-lang.org/cargo/reference/semver.html) | Official Cargo reference chapter | Current | Primary source for the full breaking/non-breaking classification table and deprecation-before-removal guidance |
| [cargo-rdme (GitHub)](https://github.com/orium/cargo-rdme) | Tool README/documentation | Actively maintained, current | Primary source for the README-from-lib.rs sync workflow and `--check` CI exit codes |
| [clap_mangen (docs.rs)](https://docs.rs/clap_mangen/latest/clap_mangen/) | Crate documentation | Current | Primary source for generating man pages from a `clap::Command`, including the recommended `build.rs`/xtask pattern |
| [trycmd (docs.rs)](https://docs.rs/trycmd/latest/trycmd/) | Crate documentation | Current | Primary source for snapshot-testing literal CLI transcripts, including extracting cases from README.md |
| [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) | Community changelog format specification | 1.1.0, current | Primary source for the six-category, human-first changelog format |
| [git-cliff docs](https://git-cliff.org/docs/) | Tool documentation | Current | Primary source for Conventional-Commits-driven changelog generation and `cliff.toml` |
| [mdBook (rust-lang.github.io)](https://rust-lang.github.io/mdBook/) | Official mdBook documentation | Current | Primary source establishing mdBook as the ecosystem-standard multi-page doc-site generator with testable code samples |
