---
title: Books and Canonical Guides — Rust Topic Map
agent: books-and-canonical-guides scout
model: sonnet
date_researched: 2026-08
sources_count: 16
scope: "Survey of canonical Rust book/guide corpus (Effective Rust, Rust for Rustaceans, Rust Design Patterns, Rust API Guidelines, Rustonomicon, Reference, Style Guide, Cargo Book, Edition Guide 2024, Rust Atomics and Locks, Zero To Production, Command-Line Rust, Programming Rust, async book, Tokio tutorial, Rust Cookbook) to enumerate topic candidates for an AI-agent Rust rule/skill set, for the OCX/Grimoire CLI package-manager project."
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)
7. [Candidate topics](#candidate-topics)

## Summary

- Effective Rust's 35 items are the single densest, most PR-review-shaped checklist in the corpus — items 1–13 (types/traits) and 21–26 (dependencies) are the highest-leverage for a package manager crate. [Effective Rust](https://www.lurklurk.org/effective-rust/)
- The Rust API Guidelines checklist (~50 `C-*` items) is the closest thing to a machine-checkable public-API spec; several items map directly to clippy lints (`C-COMMON-TRAITS`, `C-CONV-TRAITS`, `C-DEBUG`) and are verifiable by `cargo doc` + `clippy::missing_docs_in_private_items` style checks. [API Guidelines Checklist](https://rust-lang.github.io/api-guidelines/checklist.html)
- The Rust Design Patterns book explicitly separates *idioms* (do this), *design patterns* (solve this problem this way), and *anti-patterns* (stop doing this) — that three-way split is itself a useful structure for AI-agent rules (MUST/SHOULD/MUST-NOT). [Design Patterns intro](https://rust-unofficial.github.io/patterns/)
- `C-SEALED` (sealed traits) and `C-STRUCT-PRIVATE` (private fields) are the two API-guidelines items most relevant to a package manager's evolving on-disk/wire formats — they are the mechanism for "add a variant later without breaking downstream" and are not covered by the earlier type-architecture wave's typestate/newtype focus.
- The Rustonomicon's ownership chapter enumerates variance, drop-check, `PhantomData`, and lifetime subtleties that a Rust agent writing cache/lockfile code with borrowed data structures will hit; none of this is "avoid unsafe" (already covered) — it's about *safe* code that still needs to reason about aliasing and drop order.
- The Cargo Book's Reference section (not the Guide) covers workspace inheritance, `[patch]`, SemVer-breaking-change checklist, and build-script determinism — directly relevant to a multi-crate CLI family the user already flagged as "nearly one crate."
- The 2024 Edition Guide's language section has 14 subsections; the two with real day-to-day bite for this project are RPIT lifetime capture rules and the `unsafe extern` block requirement — both change how FFI/build.rs code must be written under edition 2024, an area already flagged as security-sensitive.
- Rust Atomics and Locks' chapter progression (atomics → memory ordering → locks from scratch → building your own primitives) is the correct depth reference for reviewing any hand-rolled synchronization in the codebase, even though tokio/async concurrency is already covered by another wave — this book is specifically about the *sub-async* layer (std::sync, atomics, spinlocks) that async code sits on top of.
- Zero To Production's chapters on structured logging, telemetry propagation, and "faults are not the same as errors" map onto the docs-observability wave but its testing chapter's emphasis on *black-box integration testing against a running instance* is a distinct testing-strategy candidate the testing wave may not have reached (subprocess/e2e testing of a CLI binary itself, not just unit tests).
- Command-Line Rust (O'Reilly) is organized entirely as "reimplement a Unix tool" chapters — its consistent lesson across all of them is: validate args before touching the filesystem, and separate "parse arguments" from "run" as two testable functions — directly reusable as a rule for the grim/ocx CLI surface.
- The Rust Cookbook's category list is a good coverage-checklist for utility crates the project already depends on (encoding: base64/hex/CSV/JSON/TOML; date/time parsing; compression: tar/gzip) — each category is a place where naive hand-rolled code is a known bug magnet (e.g., timezone conversion, tar-slip).
- The async book confirms `Pin`, executors, and `Future` internals are covered by the existing async wave; its one distinct contribution is the "async fn in traits desugars to `-> impl Future`, which is not object-safe without `Box<dyn Future>`" gotcha, worth a one-line cross-reference rather than a new topic.
- The Style Guide and rustfmt defaults are already assumed tooling; its "non-formatting conventions" chapter (matching on `Result`/`Option`, import granularity, avoiding `#[allow]` at module scope) is a source of a few concrete lint-shaped rules not yet listed.
- Programming Rust (Blandy/Orendorff/Tierney) devotes full chapters to `Rc`/`Arc`/`Cell`/`RefCell` (interior mutability), operator overloading, and closures/generic functions as distinct topics that other waves treat only as a corollary of type architecture — interior mutability choice (`Cell` vs `RefCell` vs `Mutex` vs atomic) for single-threaded CLI state is a genuinely distinct decision an LLM gets wrong by defaulting to `Rc<RefCell<T>>` everywhere.
- Idiomatic Rust (Brenden Matthews) and Rust Web Development both stress "parse, don't validate" and newtype-per-domain-concept — already covered by the type-architecture wave, so excluded here except where they add path/config-specific instances (e.g. validated `AbsolutePath` newtype).
- The strongest genuinely new candidate across the whole corpus is **on-disk format versioning / forward-compatible deserialization** (`#[serde(deny_unknown_fields)]` vs tolerant parsing, schema version fields, migration on read) — it appears implicitly in Cargo's own lockfile-versioning practice, in API Guidelines' `C-STABLE`, and in Effective Rust Item 21 (semver), but no earlier wave owns it and it is exactly what a lockfile-writing OCI package manager needs.
- A second strong new candidate is **path handling correctness** (`Path`/`PathBuf` vs `OsString`, non-UTF8 paths, `..`/symlink-aware joins, Windows `\\?\` prefixes, case-(in)sensitivity) — the Cookbook, Command-Line Rust, and the Rustonomicon's data-layout chapter all touch pieces of it, but no wave (including rust-security's zip-slip mention) owns *general* cross-platform path handling outside archive extraction.

## Findings

### 1. Effective Rust — the 35 items, by chapter

Fetched directly from the book. [Effective Rust](https://www.lurklurk.org/effective-rust/)

**Types**: (1) type system to express data structures, (2) type system for common behavior, (3) prefer `Option`/`Result` transforms over `match`, (4) idiomatic `Error` types, (5) understand type conversions, (6) newtype pattern, (7) builders for complex types, (8) reference/pointer types, (9) iterator transforms over explicit loops.

**Traits**: (10) standard traits, (11) `Drop` for RAII, (12) generics vs trait objects trade-offs, (13) default implementations.

**Concepts**: (14) lifetimes, (15) borrow checker, (16) avoid unsafe, (17) shared-state parallelism caution, (18) don't panic, (19) avoid reflection, (20) avoid over-optimizing.

**Dependencies**: (21) semver promises, (22) minimize visibility, (23) avoid wildcard imports, (24) re-export dependencies whose types appear in your API, (25) manage the dependency graph, (26) feature creep.

**Tooling**: (27) document public interfaces, (28) macros judiciously, (29) listen to Clippy, (30) more than unit tests, (31) tooling ecosystem, (32) CI.

**Beyond std**: (33) `no_std` compatibility, (34) control what crosses FFI, (35) prefer `bindgen`.

Items 21, 24, and 33–35 are not touched by any earlier wave's summary and are strong candidates below (semver discipline for a multi-binary workspace; dependency re-export; FFI is covered by security wave but item 33/no_std is a distinct portability question this CLI likely doesn't need — noted as low priority).

### 2. Rust API Guidelines checklist — full list by section

Fetched directly. [Checklist](https://rust-lang.github.io/api-guidelines/checklist.html)

Full `C-*` list captured in the frontmatter research (Naming, Interoperability, Macros, Documentation, Predictability, Flexibility, Type safety, Dependability, Debuggability, Future proofing, Necessities — 7+8+5+8+7+4+4+3+2+4+2 = 54 items). The **Future proofing** group (`C-SEALED`, `C-STRUCT-PRIVATE`, `C-NEWTYPE-HIDE`, `C-STRUCT-BOUNDS`) is the one most specific to a package manager exposing a public lockfile/manifest schema and least redundant with the type-architecture wave, which discussed newtype/typestate as *internal* design tools, not as *external compatibility* tools.

### 3. Rust Design Patterns — structure and named entries

The book's own front page states the idioms/patterns/anti-patterns split; sidebar fetch was blocked by the mdbook JS-rendered nav, but the SUMMARY.md fetch confirmed category membership: [SUMMARY.md](https://raw.githubusercontent.com/rust-unofficial/patterns/master/src/SUMMARY.md)

- **Idioms** (partial, from prior knowledge + fetch confirmation): `Default` trait, collections as smart pointers via `Deref`, finalisation in destructors, `mem::{take, replace}`, on-stack dynamic dispatch, iterating over an `Option`, pass variables to a closure, privacy-for-extensibility, constructor idiom, string concatenation with `format!`, temporary mutability, easy doc initialization.
- **Design patterns — Behavioural**: Command, Interpreter, Newtype, RAII Guards, Strategy, Visitor.
- **Design patterns — Creational**: Builder, Fold.
- **Design patterns — Structural**: composition over inheritance, crate/module organization, unsafe-code encapsulation, custom traits to avoid complex type bounds (added 2025-12-14 — newest entry in the whole corpus).
- **Anti-patterns**: `Deref` polymorphism misuse, excessive `#[allow]`/compiler-directive suppression, `clone()` to satisfy the borrow checker instead of fixing ownership.
- **Functional**: generics as type classes, functional "optics"-style field access patterns.

The RAII Guards pattern and the `#[allow]`-suppression anti-pattern are worth pulling out as distinct rules — RAII guards for temp-dir/lockfile cleanup, and a hard rule against `#[allow(clippy::...)]` at module/crate scope without a comment, since it silently defeats the tooling-CI wave's lint gate.

### 4. Rustonomicon — confirmed TOC

Fetched raw SUMMARY.md. [Nomicon SUMMARY.md](https://raw.githubusercontent.com/rust-lang/nomicon/master/src/SUMMARY.md)

Chapters: Meet Safe and Unsafe; Data Layout (`repr(Rust)`, exotic sizes, other reprs); Ownership (references, aliasing, lifetimes, lifetime mismatch/elision, unbounded lifetimes, HRTB, subtyping/variance, drop check, `PhantomData`, splitting borrows); Type Conversions (coercions, dot operator, casts, transmutes); Uninitialized Memory; Ownership-Based Resource Management (constructors, destructors, leaking); Unwinding (exception safety, poisoning); Concurrency (races, Send/Sync, atomics); a full worked `Vec` and `Arc`/`Mutex` implementation; FFI; Beneath std.

This is mostly subsumed by the security wave's "unsafe/UB/Miri/FFI" line — but **variance/subtyping**, **drop check with `PhantomData`**, and **poisoning** (mutex poisoning, not just async poisoning) are subtle enough and common enough in *safe*, non-`unsafe` code (e.g. a generic `Cache<T>` struct, a `Guard` type wrapping a lock) that they deserve their own line items rather than being folded into "avoid unsafe code."

### 5. Cargo Book, Reference, Style Guide, Edition Guide 2024

- Cargo Book top sections confirmed: Getting Started, Guide, **Reference**, Commands, FAQ, Appendices. [Cargo Book](https://doc.rust-lang.org/cargo/) — the Reference section (not directly enumerated by the fetch, but well-known) covers workspaces, `[patch]`, profiles, SemVer compatibility rules, and build scripts — all directly relevant given the "nearly one crate" pain point.
- Reference confirmed sections: lexical structure, macros, crates/source files, conditional compilation, items, attributes, statements/expressions, patterns, types, DSTs/layout/coercions, interior mutability/variance, names/visibility, memory model, panic handling, linkage/inline-asm, unsafety/UB, const eval, ABI, runtime behavior. [Reference SUMMARY.md](https://raw.githubusercontent.com/rust-lang/reference/master/src/SUMMARY.md)
- Style Guide confirmed sections: formatting conventions, module-level items, statements, expressions, types, **non-formatting conventions**, Cargo.toml conventions, guiding principles. [Style Guide](https://doc.rust-lang.org/style-guide/) — the "non-formatting conventions" and "Cargo.toml conventions" chapters are the two with content rustfmt cannot auto-fix and are worth a rule each.
- Edition Guide 2024 confirmed structure: Language (14 subsections), Standard library (3), Cargo (3), Rustdoc (2), Rustfmt (4). [Edition Guide 2024](https://doc.rust-lang.org/edition-guide/rust-2024/index.html) — known specific items from this section (RPIT lifetime capture change, `unsafe extern` blocks, `gen` reserved keyword, tail-expression temporary-scope change) are highly relevant given this project's build.rs/FFI-adjacent and cross-platform surface.

### 6. Rust Atomics and Locks (Mara Bos)

Site redirect prevented a fresh fetch this session; TOC is well-established (10 chapters: Basics of Rust Concurrency; Atomics; Memory Ordering; Building Our Own Spin Lock; Building Our Own Channels; Building Our Own Arc; Building Our Own Rwlock; Understanding the Processor; Building Our Own Locks (OS primitives); Futexes/Parking/generic-Waiting). Distinct from the async wave: this is the std::sync/atomics substrate, relevant only if the codebase hand-rolls any synchronization primitive rather than using tokio's; flagged low priority unless such code exists.

### 7. Zero To Production In Rust (Palmieri)

Publisher page confirms 11 chapters but not titles; from established structure the chapters most relevant here (filtered against what other waves own) are: chapter on **type-driven domain validation at the boundary** (parse-don't-validate for HTTP inputs — already covered by type-architecture) and the **black-box/integration-testing-a-running-binary** chapter, which is a distinct testing-strategy point: spin up the actual compiled binary/server and assert on its real behavior rather than only unit-testing internals. [Zero2Prod](https://www.zero2prod.com/)

### 8. Command-Line Rust (O'Reilly)

Structured as "reimplement a Unix CLI tool per chapter" (`echo`, `cat`, `head`, `wc`, `uniq`, `find`, `cut`, `grep`, `comm`, `tail`, `fortune`, `ls`, `calc`). The recurring lesson each chapter reinforces: separate `get_args()` (parse + validate) from `run()` (do the work) so both are independently testable, and validate all CLI inputs (file existence, numeric ranges) before any I/O. This is a distinct, mechanical CLI-testability pattern beyond what the cli-contract wave (exit codes, `--json`, clap design) already lists.

### 9. Tokio tutorial — confirmed topic list

[Tokio tutorial](https://tokio.rs/tokio/tutorial) — Overview, Setup, Hello Tokio, Spawning, Shared state, Channels, I/O, Framing, Async in depth, Select, Streams, Bridging with sync code, Graceful Shutdown, Tracing (getting started / next steps), Unit Testing. All subsumed by the existing async wave except **Framing** (codec-based length-delimited/line-delimited protocol parsing over a stream) — worth flagging only if the OCI/registry HTTP client hand-rolls any streaming protocol parsing rather than using an HTTP library's framing.

### 10. Rust Cookbook — category checklist

[Rust Cookbook](https://rust-lang-nursery.github.io/rust-cookbook/) — 24 categories confirmed (Algorithms, Async, CLI, Compression, Concurrency, Configuration, Cryptography, Data Structures, Database, Date and Time, Dev Tools, Encoding, Error Handling, File System, Hardware, Memory Management, Multimedia, Networking, OS, Parsing, Science, Text Processing, WebAssembly, Web Programming). For this project the highest-signal, least-covered categories are **Date and Time** (timezone conversion, duration arithmetic — a known correctness trap even in mature codebases) and **Encoding** (base64/hex/CSV/JSON/TOML correctness, e.g. base64 alphabet variants, digest string formatting) since digest verification is named as a security-sensitive area but the *encoding* half of that (getting the hex/base64 representation exactly right) isn't owned by the security wave's "digest verification" line, which focuses on the verification logic itself, not the encode/decode correctness underneath it.

## Normative guidance candidates

1. **Public on-disk/manifest formats must declare a schema version field and reject-or-migrate on mismatch, never silently misparse.** Rationale: a lockfile or manifest format that changes shape breaks every older binary reading a newer file. VERIFICATION: grep struct defs for `Deserialize` that are also written to disk/lockfiles for a `version:` or `schema_version` field; confirm a `match version { ... => migrate, _ => Err }` arm exists.
2. **Prefer `#[serde(deny_unknown_fields)]` on strictly-owned config, and its opposite (tolerant/forward-compatible parsing) on anything another OCX/Grimoire binary version might have added fields to.** Rationale: the two failure modes (silently ignoring a typo vs breaking on a newer sibling binary's new field) require an explicit choice, not the serde default. VERIFICATION: grep for `#[derive(Deserialize)]` structs lacking either `deny_unknown_fields` or a documented rationale comment for its absence.
3. **New enum variants added to a format read across binary versions must be additive and non-exhaustive (`#[non_exhaustive]`) at the crate boundary.** Rationale: API Guidelines `C-SEALED`/future-proofing category; an exhaustive `match` on a public enum breaks every downstream match arm when a variant is added. VERIFICATION: `cargo semver-checks` (already in testing wave) plus a manual check that any enum crossing a workspace-crate boundary carries `#[non_exhaustive]` or is behind a sealed trait.
4. **All `Path`/`PathBuf` joins from untrusted or config-supplied segments must go through a normalizing helper, never raw `Path::join`.** Rationale: `..`, absolute-path override (`Path::join` with an absolute RHS discards the LHS entirely — a common Windows/Linux surprise), and non-UTF8 components are all silent footguns. VERIFICATION: grep for `.join(` calls on `Path`/`PathBuf` outside a small whitelisted helper module; flag any that join user/registry-supplied strings directly.
5. **Never construct paths via string concatenation (`format!("{}/{}", a, b)`); always `Path`/`PathBuf` methods.** Rationale: breaks on Windows separators, embeds encoding bugs. VERIFICATION: grep for `format!.*[/\\].*", ` patterns that produce a path-shaped string, or clippy's `clippy::string_lit_as_bytes`/manual review.
6. **Interior mutability choice must match the concurrency model actually in use: `Cell`/`RefCell` for genuinely single-threaded state, `Mutex`/atomics only where cross-thread sharing is real.** Rationale: Programming Rust's chapter on this; defaulting to `Arc<Mutex<T>>` "to be safe" in a single-threaded CLI path adds lock overhead and panic-on-poison risk for no benefit, while defaulting to `RefCell` in code that later gets `tokio::spawn`ed panics at runtime (`already borrowed`). VERIFICATION: reading heuristic — any `RefCell`/`Cell` field on a type that is ever wrapped in `Arc` or crosses a `tokio::spawn` boundary is a bug; grep co-occurrence of `RefCell` and `Arc<` on the same type.
7. **Mutex poisoning must be handled explicitly (recover, propagate, or `expect` with a message), never `.unwrap()`ed blindly on `.lock()`.** Rationale: a panic while holding a std `Mutex` poisons it for every future locker — one bad thread can wedge the whole process. VERIFICATION: grep `.lock().unwrap()` and require either a comment justifying "poison = fatal is correct here" or a match on `Err(poisoned)`.
8. **RAII guard types (custom `Drop` wrapping a lockfile, temp dir, or spawned child process) must not perform fallible cleanup that panics on failure inside `drop`.** Rationale: Nomicon/Design-Patterns RAII-guard idiom plus API Guidelines `C-DTOR-FAIL`; a `Drop::drop` that panics during unwind aborts the process. VERIFICATION: grep `impl Drop for` blocks for `.unwrap()`/`.expect()`/`panic!` in the `drop` body; require `let _ = ...` or logged-and-swallowed error instead.
9. **Public structs default to private fields plus constructors/builders, per `C-STRUCT-PRIVATE`; a `pub struct` with all-`pub` fields crossing a crate boundary is a smell unless it's a pure data-transfer/config type documented as such.** Rationale: locks in the ability to add fields later without a breaking change. VERIFICATION: `cargo public-api` diff (already testing-wave tool) plus grep for `pub struct` followed immediately by `pub ` fields in non-`#[derive(Deserialize)]`-only modules.
10. **Sealed traits for any public trait not meant for downstream `impl`.** Rationale: `C-SEALED`; prevents a semver-breaking addition of a new required method from ever being "safe" once external impls exist. VERIFICATION: grep `pub trait` definitions lacking a `: sealed::Sealed` supertrait or a doc comment explicitly inviting external impls.
11. **CLI subcommands split argument parsing/validation from execution as two separately-testable functions** (Command-Line Rust pattern): `fn parse_args(...) -> Result<Config>` / `fn run(config: Config) -> Result<()>`. Rationale: lets validation be unit-tested without spawning the process or touching the filesystem. VERIFICATION: reading heuristic on each `clap` subcommand handler — does it call I/O before all arg validation completes?
12. **`#[allow(clippy::...)]` above module or crate level is banned without a linked justification comment.** Rationale: Design Patterns' documented anti-pattern; a blanket allow silently defeats the tooling-CI wave's lint gate for every line beneath it, not just the offending one. VERIFICATION: grep for `#![allow(clippy` and `#[allow(clippy` spanning more than a single expression/statement; require a `// allow: <reason>` comment on each.
13. **Black-box integration tests exercise the compiled binary itself for at least the primary user flows**, not only library-level unit tests. Rationale: Zero To Production's testing chapter; catches wiring/arg-parsing/exit-code regressions unit tests structurally cannot see. VERIFICATION: presence of an `assert_cmd`/`trycmd`-based test file (already named in the testing wave) exercising `main`, not just `lib.rs` functions — confirm at least one exists per subcommand.
14. **Time/date handling uses a single vetted crate (`time` or `chrono`) consistently across the workspace, never both, and all wall-clock reads for cache/lockfile timestamps are UTC, formatted with an explicit, versioned format string.** Rationale: Rust Cookbook's Date-and-Time category flags timezone conversion as a recurring correctness trap; mixed crates duplicate dependency weight and risk subtly incompatible serialization formats for the same on-disk field. VERIFICATION: grep `Cargo.lock`/`Cargo.toml` across the workspace for both `chrono` and `time` present simultaneously; grep for naive (non-UTC) `Local::now()`/`SystemTime::now()` writes into any serialized struct.
15. **Digest/hash string encoding (hex vs base64, upper vs lower case, `sha256:`-prefixed or not) is centralized in one module with round-trip tests, never re-implemented at each call site.** Rationale: encoding correctness sits underneath the security wave's digest-verification logic; a case-sensitivity or alphabet mismatch silently breaks equality checks rather than erroring. VERIFICATION: grep for ad-hoc `format!("{:x}", ...)` or manual hex-encoding loops outside a single `digest`/`encoding` module.

## AI-agent angle

- **Schema evolution blindness**: an LLM asked to "add a field to the lockfile struct" will add it as a plain required field and move on — it does not spontaneously add a version bump, a migration arm, or consider `deny_unknown_fields`. Smallest mechanical check: a CI step running `cargo semver-checks` (or a repo-specific snapshot diff of the serialized struct's JSON schema) against the previous released version, gated on any change to a type tagged `// on-disk-format`.
- **Path-join footgun**: an LLM reaching for `PathBuf::from(base).join(user_input)` does not know that `Path::join` silently discards `base` entirely when `user_input` is absolute — it will write code that looks correct and passes a happy-path test with a relative string. Smallest check: a clippy-adjacent grep/lint rule flagging `.join(` calls where the RHS originates from a `clap` arg, env var, or deserialized config field without going through a canonicalize-and-prefix-check helper first.
- **`Arc<Mutex<T>>` overuse and mismatched interior mutability**: LLMs pattern-match "shared mutable state" to `Arc<Mutex<T>>` reflexively, even in single-threaded CLI code, and separately reach for `RefCell` in code a human later parallelizes with `tokio::spawn`, producing a runtime panic no compiler warning caught. Smallest check: `cargo clippy` already flags some of this (`clippy::arc_with_non_send_sync`), but the reverse case (RefCell later wrapped in Arc) needs a grep co-occurrence check as in rule 6.
- **Drop-time panics**: LLMs write `impl Drop` cleanup with the same `.unwrap()` habit used everywhere else in the file, not realizing `drop` during unwind that panics aborts the process. Smallest check: grep every `impl Drop for` body for `unwrap()`/`expect()`/`panic!`/`?` (the `?` operator is also illegal in `drop`, a distinct and frequent LLM mistake since `drop` returns `()`).
- **Exhaustive matches on public enums**: an LLM extending a public enum will fix every `match` call site it can find — but it cannot fix call sites in downstream crates it doesn't have open, so a non-`#[non_exhaustive]` enum that's already public is a landmine the LLM has no way to see. Smallest check: `cargo public-api diff` in CI on any enum without `#[non_exhaustive]` that gains a variant.

## Contested / evolving

- **`unsafe extern` blocks (edition 2024)**: now mandatory to mark `extern "C"` blocks `unsafe`, tightening what was previously an unchecked FFI boundary — direction of travel is toward more explicit unsafety annotations at every FFI touch point, not fewer. [Edition Guide 2024](https://doc.rust-lang.org/edition-guide/rust-2024/index.html)
- **RPIT lifetime capture rules changed in 2024**: `-> impl Trait` now captures all in-scope generic lifetime parameters by default (previously it didn't unless named), which silently changes borrow-checker behavior for existing code ported to the new edition — worth a one-time audit on edition migration, not an ongoing rule.
- **`async fn` in traits** (stabilized) vs the `#[async_trait]` macro: native support exists but is still not object-safe without boxing; the ecosystem has not converged on when to drop the macro. Already owned by the async wave; noted here only because Effective Rust and the async book both still hedge on this.
- **Sealed-trait idiom formalization**: the "custom traits to avoid complex type bounds" pattern was added to the Design Patterns book in December 2025 — evidence the community is still actively adding new catalogued patterns; treat the Design Patterns book as a living document worth periodic re-checking, not a frozen reference.
- **`cargo public-api` / `cargo-semver-checks` adoption**: increasingly treated as CI-mandatory for library crates in 2025–2026 discourse, but still opt-in tooling, not a compiler-enforced guarantee — the corpus (API Guidelines) states the *intent* (`C-STABLE` etc.) without mandating the *tool*.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [Effective Rust](https://www.lurklurk.org/effective-rust/) | Free online book, 35-item checklist | Actively maintained, 2024-2026 era | Densest PR-review-shaped checklist in the corpus; fetched full item list directly |
| [Rust API Guidelines Checklist](https://rust-lang.github.io/api-guidelines/checklist.html) | Official rust-lang guidance doc | Living document | Closest thing to a machine-checkable public-API spec; fetched full C-* list |
| [Rust Design Patterns intro](https://rust-unofficial.github.io/patterns/) | Community book | Actively maintained (newest entry Dec 2025) | Idiom/pattern/anti-pattern three-way split maps to MUST/SHOULD/MUST-NOT rule tiers |
| [Design Patterns SUMMARY.md](https://raw.githubusercontent.com/rust-unofficial/patterns/master/src/SUMMARY.md) | Raw source ToC | Same | Ground truth for pattern names/categories when rendered nav wasn't fetchable |
| [Rustonomicon SUMMARY.md](https://raw.githubusercontent.com/rust-lang/nomicon/master/src/SUMMARY.md) | Official rust-lang unsafe-Rust reference | Living, edition-agnostic | Full confirmed chapter list; source for variance/drop-check/poisoning as distinct-from-"avoid unsafe" topics |
| [The Rust Reference SUMMARY.md](https://raw.githubusercontent.com/rust-lang/reference/master/src/SUMMARY.md) | Official language reference | Living | Ground truth for language-spec section coverage (interior mutability/variance, panic handling, ABI) |
| [Rust Style Guide](https://doc.rust-lang.org/style-guide/) | Official rustfmt style spec | Living | Source of "non-formatting conventions" and Cargo.toml conventions chapters, the parts rustfmt can't auto-fix |
| [Cargo Book](https://doc.rust-lang.org/cargo/) | Official Cargo documentation | Living | Confirms Reference-vs-Guide split; workspace/patch/profile mechanics relevant to the "nearly one crate" pain point |
| [Edition Guide 2024](https://doc.rust-lang.org/edition-guide/rust-2024/index.html) | Official edition migration guide | Rust 1.85.0 / Feb 2025 | Confirmed section structure (Language 14, stdlib 3, Cargo 3, Rustdoc 2, Rustfmt 4); source for `unsafe extern` and RPIT capture changes |
| [Tokio tutorial](https://tokio.rs/tokio/tutorial) | Official Tokio documentation | Living | Confirmed full topic list; "Framing" flagged as the one item not already owned by the async wave |
| [Rust Cookbook](https://rust-lang-nursery.github.io/rust-cookbook/) | Community recipe collection | Community-maintained | Confirmed 24-category structure; source for Date/Time and Encoding as under-owned correctness traps |
| [Zero2Prod site](https://www.zero2prod.com/) | Book landing page (Palmieri) | 2026-updated | Confirms 11-chapter structure; source for black-box integration-testing-the-binary pattern |
| Rust Atomics and Locks (Mara Bos) — site redirect blocked live fetch this session | Book (O'Reilly / self-published) | 2023, still current | Well-established 10-chapter structure from general knowledge; scoped as low-priority unless hand-rolled sync primitives exist |
| Programming Rust (Blandy/Orendorff/Tierney) | O'Reilly book | 2nd ed. current | Source of interior-mutability-choice (Cell/RefCell/Mutex/atomic) as a distinct topic from general type architecture |
| Command-Line Rust (Ken Youens-Clark) | O'Reilly book | Current | Source of the parse-then-run CLI testability pattern (site returned 403; structure from established knowledge) |
| Rust Async Book | Official async documentation | Living, marked incomplete in places | Confirms Pin/executor/Future internals are async-wave territory; source of the async-fn-in-traits object-safety gotcha |

## Candidate topics

| Candidate topic | Why it matters | Source | Already covered? | Priority |
|---|---|---|---|---|
| On-disk/manifest schema versioning and migrate-on-read | Lockfile/manifest format changes break older binaries reading newer files silently | Effective Rust #21, API Guidelines C-STABLE, Cargo lockfile practice | no | high |
| `#[serde(deny_unknown_fields)]` vs tolerant-parsing as an explicit per-type choice | Wrong default either hides typos or breaks cross-version compatibility | Rust Cookbook Encoding, general serde practice | no | high |
| `#[non_exhaustive]` / sealed traits for public enums and traits crossing crate boundaries | Prevents future additive changes from being semver-breaking | API Guidelines C-SEALED/C-STRUCT-PRIVATE | no | high |
| Cross-platform path handling (join semantics, non-UTF8, `\\?\`, absolute-path override footgun) | Silent correctness bugs on Windows; `Path::join` with absolute RHS discards base | Rust Cookbook FS, Command-Line Rust, Reference | partial (security wave covers zip-slip only) | high |
| Interior mutability selection: `Cell`/`RefCell` vs `Mutex`/atomics matched to actual concurrency | Wrong default causes either needless lock overhead or runtime "already borrowed" panics after later parallelization | Programming Rust ch. on Rc/RefCell | no | high |
| Mutex poisoning handling (never blind `.lock().unwrap()`) | One panicking thread wedges the whole process for every future lock | Rust Atomics and Locks, Nomicon (poisoning) | no | high |
| RAII guard `Drop` impls must not panic/use `?` in `drop` | Panic during unwind inside `drop` aborts the process | Design Patterns (RAII Guards), API Guidelines C-DTOR-FAIL | no | high |
| Public struct field privacy by default (`C-STRUCT-PRIVATE`) | Locks in ability to add fields without a breaking change | API Guidelines | partial (type-architecture wave covers builder/newtype, not this specific rule) | medium |
| CLI parse-args/run separation for testability | Lets arg validation be unit-tested without touching filesystem/process | Command-Line Rust | partial (cli-contract wave covers clap design, not this specific test-shape rule) | medium |
| Blanket `#[allow(clippy::...)]` ban above expression scope | Silently defeats the lint gate for everything beneath it | Design Patterns anti-patterns | partial (tooling-CI wave owns lint selection, not this specific anti-pattern) | medium |
| Black-box integration testing of the compiled binary (not just lib units) | Catches wiring/exit-code/arg-parsing regressions unit tests structurally can't see | Zero To Production | partial (testing wave lists assert_cmd/trycmd as tools, not this rationale) | medium |
| Digest/hash string encoding centralization (hex/base64 case & alphabet, prefix format) | Encoding bugs break equality checks silently, underneath the security wave's verification logic | Rust Cookbook Encoding | partial (security wave owns verification logic, not encode/decode correctness) | high |
| Single vetted time crate workspace-wide, UTC-only serialized timestamps | Mixed chrono/time crates and naive local-time writes are a recurring correctness trap | Rust Cookbook Date and Time | no | medium |
| Variance/subtyping and drop-check subtleties in generic cache/guard types | Safe-code lifetime bugs distinct from "avoid unsafe"; hits generic `Cache<T>`/`Guard<T>` designs | Rustonomicon (Ownership chapter) | no | medium |
| `PhantomData` for marker/typestate-adjacent generic parameters | Needed whenever a generic type doesn't literally store `T` but must still track variance/drop | Rustonomicon | partial (type-architecture wave owns typestate, not the PhantomData mechanics) | low |
| Dependency re-export discipline (`C-24`: re-export deps whose types appear in your public API) | Prevents "which version of `serde` do I need" downstream confusion in a multi-crate workspace | Effective Rust #24 | no | medium |
| Feature-flag / feature-creep discipline for a multi-binary workspace | Directly addresses the "nearly one crate" pain point at the Cargo.toml level | Effective Rust #26, Cargo Book Reference | no | medium |
| Workspace dependency/version inheritance (`[workspace.dependencies]`, `[patch]`) | Mechanical fix for a monolithic-crate codebase splitting into a real workspace | Cargo Book Reference | no | high |
| `unsafe extern` block requirement (edition 2024) | FFI/build.rs code silently needs new syntax under 2024; compile break if missed | Edition Guide 2024 | partial (security wave owns FFI generally, not this edition-specific syntax change) | medium |
| RPIT lifetime-capture rule change (edition 2024) | Silently changes borrow-checker behavior for `-> impl Trait` return types on edition migration | Edition Guide 2024 | no | low |
| Style Guide "non-formatting conventions" (match ergonomics, import granularity) | The subset of style rustfmt cannot auto-fix, so it needs a lint or reading-heuristic instead | Rust Style Guide | partial (tooling-CI wave owns rustfmt config, not the non-automatable subset) | low |
| Command idiom / Interpreter pattern for CLI subcommand dispatch | Alternative to a giant match-on-enum dispatcher for growing subcommand sets | Design Patterns (Behavioural) | no | low |
| Fold design pattern for AST/tree-walking transforms | Relevant if the manifest/lockfile parser does any tree-shaped transform | Design Patterns (Creational) | no | low |
| Tokio "Framing" (codec-based stream protocol parsing) | Only relevant if the OCI/registry client hand-rolls streaming protocol parsing | Tokio tutorial | partial (async wave owns tokio broadly, not framing specifically) | low |
| `no_std` / `#[no_std]` compatibility consideration | Portability question; likely irrelevant for a CLI binary, included for completeness | Effective Rust #33 | no | low |
| Reflection avoidance (`Any`/downcasting) | Rarely needed in a CLI package manager; flagged so an LLM doesn't reach for `dyn Any` as a generics substitute | Effective Rust #19 | no | low |
| Operator overloading unsurprising-ness (`C-OVERLOAD`) | Relevant only if any domain type (version, digest) implements `Ord`/arithmetic traits | API Guidelines | no | low |
| Bitflags vs enum-for-flags (`C-BITFLAG`) | Relevant to any CLI flag-combination or capability-set type | API Guidelines | no | low |
| Const generics for fixed-size buffers (digest arrays, magic-number headers) | Avoids heap allocation and gives compile-time size guarantees for hash/digest byte arrays | General corpus theme (Effective Rust types chapter, Reference types) | no | medium |
| Zero-copy parsing for registry manifest/HTTP response bodies | Avoids unnecessary allocation/copy on every OCI API call, a real perf/complexity trade-off | Rust Cookbook Parsing, Programming Rust | partial (performance wave may own allocation broadly, not zero-copy parsing specifically) | medium |
| Streaming vs buffering for archive extraction and large blob downloads | Memory-bounded downloads matter for a package manager pulling arbitrary-size OCI blobs | Rust Cookbook Compression/Networking | partial (security wave owns zip-slip on extraction, not the streaming-vs-buffer memory question) | medium |
| Macro hygiene for any internal `macro_rules!` (e.g. error-enum boilerplate generators) | API Guidelines' macro C-* items (evocative syntax, composes with attributes, works anywhere) | API Guidelines (Macros section) | no | low |
| Idempotency of install/update operations (re-running produces the same result, no duplicate side effects) | Core correctness property for any package-manager mutate-the-filesystem command | General corpus theme, not a single source | no | high |
| Resource cleanup / shutdown ordering for concurrent downloads-in-progress on interrupt | Ensures partial downloads/lockfiles aren't left in a corrupt state on Ctrl-C | Rust Atomics and Locks + Tokio graceful-shutdown topic | partial (async wave owns cancellation-safety generally, not the specific on-disk-cleanup-on-interrupt angle) | high |
| Ordering determinism in serialized output (`HashMap` iteration order, sorted keys) | Non-deterministic lockfile/manifest serialization breaks diffability and reproducible builds | General corpus theme (API Guidelines predictability) | no | high |

