---
title: OCX / Grimoire Rust Quality Rules — Inventory
agent: inv-rules
model: sonnet
scope: >
  Inventory of AI-config RULES governing Rust quality in ocx and grimoire
  (plus their mirrors ocx-mirror and grimoire-duo), as source material for
  porting into a publishable package.
sources:
  - /home/mherwig/dev/ocx/.claude/rules/quality-rust.md
  - /home/mherwig/dev/ocx/.claude/rules/quality-rust-errors.md
  - /home/mherwig/dev/ocx/.claude/rules/quality-rust-exit_codes.md
  - /home/mherwig/dev/ocx/.claude/rules/quality-core.md
  - /home/mherwig/dev/ocx/.claude/rules/quality-security.md
  - /home/mherwig/dev/ocx/.claude/rules/quality-cli-help.md
  - /home/mherwig/dev/ocx/.claude/rules/arch-principles.md
  - /home/mherwig/dev/grimoire/.claude/rules/quality-rust.md
  - /home/mherwig/dev/grimoire/.claude/rules/quality-rust-errors.md
  - /home/mherwig/dev/grimoire/.claude/rules/quality-rust-exit_codes.md
  - /home/mherwig/dev/grimoire/.claude/rules/quality-core.md
  - /home/mherwig/dev/grimoire/.claude/rules/quality-security.md
  - /home/mherwig/dev/grimoire/.claude/rules/arch-principles.md
  - /home/mherwig/dev/ocx-mirror/.claude/rules/quality-rust.md
  - /home/mherwig/dev/ocx-mirror/.claude/rules/quality-rust-errors.md
  - /home/mherwig/dev/ocx-mirror/.claude/rules/quality-rust-exit_codes.md
  - /home/mherwig/dev/ocx-mirror/.claude/rules/quality-core.md
  - /home/mherwig/dev/grimoire-duo/.claude/rules/quality-rust.md
  - /home/mherwig/dev/grimoire-duo/.claude/rules/quality-rust-errors.md
  - /home/mherwig/dev/grimoire-duo/.claude/rules/quality-rust-exit_codes.md
  - /home/mherwig/dev/grimoire-duo/.claude/rules/quality-core.md
  - /home/mherwig/dev/grimoire-duo/.claude/rules/quality-security.md
  - /home/mherwig/dev/grimoire-duo/.claude/rules/arch-principles.md
---

# OCX / Grimoire Rust Quality Rules — Inventory

All four repos use the same rule-file convention: a YAML frontmatter block
containing **only** a `paths:` key (a list of globs that auto-load the rule
when a matching file is edited). None of the audited files use `alwaysApply`,
`globs:` (singular), or a `description:` frontmatter field — auto-load is
glob-triggered only, and every glob list ends (explicitly or implicitly via
`**/*.rs`) with a catch-all that guarantees load on any Rust edit.

## 1. Inventory Table

| Rule file | Repo(s) | Lines | Frontmatter (`paths`) | One-line purpose |
|---|---|---|---|---|
| `quality-rust.md` | ocx (340), ocx-mirror (340, minus 2 lines), grimoire (263), grimoire-duo (263) | 340 (ocx) / 263 (grimoire) | `**/*.rs`, `**/Cargo.toml`, `**/Cargo.lock` | Rust-specific design patterns, tiered anti-patterns, SOLID/DRY/YAGNI-in-Rust, Tokio async rules, testing conventions, comment-quality rules |
| `quality-rust-errors.md` | ocx, ocx-mirror, grimoire, grimoire-duo — **byte-identical across all four** | 155 | `**/error.rs`, `**/errors.rs`, `**/*.rs` | Rust error-message/design rules: API Guidelines `C-GOOD-ERR`, `thiserror`/`anyhow` conventions, library-vs-CLI boundary, three-layer error chain pattern |
| `quality-rust-exit_codes.md` | ocx, ocx-mirror — identical; grimoire, grimoire-duo — identical to each other, diverge from ocx only in the naming/scope of exit code 81 | 205 (ocx) / 205 (grimoire) | `**/main.rs`, `**/exit_code.rs`, `**/*.rs` | `ExitCode` enum shape for Rust CLIs, `sysexits.h` numeric alignment, error→exit-code classification pattern, anti-patterns |
| `quality-core.md` | ocx (239), ocx-mirror (208, missing 2 sections), grimoire (167), grimoire-duo (167, identical to grimoire) | 239 (ocx) / 167 (grimoire) | none (repo-root rule, all-language) | Universal SOLID/DRY/KISS/YAGNI, anti-pattern severity tiers, reusability heuristics, refactoring discipline, "Verification Honesty" (banned hedging phrases), links out to language-specific leaves |
| `quality-security.md` | ocx (104), grimoire (133), grimoire-duo (133, near-identical to grimoire) — **no ocx-mirror copy** (has `security-threat-model.md` instead, not reviewed here as non-Rust) | 104 (ocx) / 133 (grimoire) | `.github/workflows/**`, `.github/actions/**`, plus a project-specific third glob (`renovate.json` ocx / `.github/dependabot.yml` or `dependabot.yml` grimoire family) | Generic OWASP/CWE security checklist plus a per-product "Attack Surfaces" section (registry auth, archive extraction, path containment, etc.) — largely non-Rust-language-specific but names concrete Rust modules/functions as evidence |
| `quality-cli-help.md` | ocx only | 145 | `crates/ocx_cli/src/**` | Governs the *content* of `///` doc comments that clap-derive projects into `--help` text — a Rust-comment-adjacent rule, CLI-surface-facing rather than general Rust quality |
| `arch-principles.md` | ocx (206), grimoire (107), grimoire-duo (107, superset of grimoire — more ADRs, path convention differs) | 206 (ocx) / 107 (grimoire) | `crates/**/*.rs`, `external/**/*.rs` (ocx) / `src/**/*.rs` (grimoire family) | Auto-loads on every Rust edit; records crate layout, design-pattern-to-module mapping, a **Utility Catalog** (concrete reusable helpers — highly portable pattern), locking policy, code-style conventions |

Note on `ocx-mirror` and `grimoire-duo`: both are living mirror/fork repos of
`ocx` and `grimoire` respectively, and their Rust-relevant rule files are
either byte-identical to or a strict subset/superset of the parent repo's
copy (see §4). Neither introduces new Rust-quality *content* not already
present in `ocx`/`grimoire` — they only lag or lead by a small number of
recent edits. `ocx-mirror` additionally lacks `quality-security.md`,
`quality-cli-help.md`, and `arch-principles.md` entirely (it is a narrower,
single-purpose mirroring-tool repo); `grimoire-duo` carries every file
`grimoire` does, plus a much larger `subsystem-*.md` set (CLI, file
structure, tests, taskfiles, CI) not in scope for this Rust-quality
inventory but flagged in §6 (Gaps) as a lead for a future pass.

---

## 2. Rust-relevant rule files, faithfully digested

### 2.1 `quality-rust.md` (canonical version = ocx's, 340 lines; superset of grimoire's 263-line copy — see §4 for the exact diff)

**Framing.** "Rust quality reference… this file = Rust-specific plus Tokio
async + Rust 2024 edition." Explicitly project-independent/shareable;
project-specific types/modules are supposed to live in subsystem rules, not
here. Two sibling deep-dive files are cross-referenced: `quality-rust-errors.md`
and `quality-rust-exit_codes.md`.

**Design Patterns:**
- **Builder Pattern** — consuming builder (`self`, not `&mut self`) for
  structs with **4+ optional fields**. Setters return `Self` for chaining.
  Required fields → typestate builder where `build()` is only implemented on
  the state with all required fields set (missing field = compile error).
- **Newtype Pattern** — wrap primitives in single-field tuple structs for
  type safety, zero runtime cost. Use cases: invariants (`NonEmptyString`),
  type safety (`Digest` wrapping a hash string), bypassing the orphan rule.
  Always implement `Display`, `Debug`, `From`.
- **RAII Guards** — acquire in constructor, release in `Drop`. Named
  examples: file locks, temp dirs, lease borrows.
- **Strategy via Traits** — behavior as trait, inject implementation. Prefer
  static dispatch (`impl Trait` / `<T: Trait>`) for zero-cost
  monomorphization; `dyn Trait` only for genuine runtime polymorphism
  (heterogeneous collections, plugins).
- **Typestate Pattern** — encode valid states as distinct types; transitions
  consume `self` and return a new type so invalid transitions are compile
  errors. Zero-cost via `PhantomData`. Use when protocol correctness matters
  (connection states, build phases).
- **Version Enum via `serde_repr`** — versioned on-disk formats should encode
  the version as a `#[repr(u8)]` enum with `serde_repr`'s
  `Serialize_repr`/`Deserialize_repr` derives, so deserialization
  automatically rejects unknown versions with no manual check. Example given:
  ```rust
  #[derive(Serialize_repr, Deserialize_repr, PartialEq)]
  #[repr(u8)]
  pub enum Version { V1 = 1 }
  ```
  This beats a raw `u32` field + `CURRENT_VERSION` constant + manual
  validation.

**Anti-Patterns — Block tier (must fix before merge), verbatim list:**
1. `.unwrap()` / `.expect()` in library code — panics cross API boundaries
   without caller consent. Exact lints named: **`clippy::unwrap_used`** and
   **`clippy::expect_used`** (both in clippy's *restriction* group); enable
   both as `warn` in `[lints.rust]` for lib crates. `.expect("reason")` is OK
   only for invariants proven at compile time or by preceding logic (e.g. a
   regex group guaranteed to capture, a length checked before `.next()`).
   Fallible ops must return `Result`. Tests may use `.unwrap()`.
2. `anyhow` / erased errors in library APIs — `anyhow::Error` kills
   downstream `match`. Rule: **libs use `thiserror`, binaries use `anyhow`**
   — both fine individually, mixing roles is not.
3. Sentence-case / trailing-punctuation `#[error("...")]` strings — violates
   Rust API Guidelines **`C-GOOD-ERR`**.
4. Magic numeric exit codes or `std::process::exit(N)` with bare literals —
   CLI binaries must own a typed `ExitCode` enum aligned with `sysexits.h`.
5. Silent error swallowing — `let _ = result` or `.ok()` without a comment
   explaining why the error is ignored.
6. `.to_string()` in `map_err()` erasing source errors — never
   `map_err(|e| SomeError(e.to_string()))`; carry the source structurally via
   `#[source]` or `Box<dyn Error + Send + Sync>`.
7. `String` wrapping a structured error's `Display` output — if a field
   holds `error.to_string()`, it should hold the error itself.
8. `MutexGuard` held across `.await` — extract data, drop guard, then await.
   Deadlock if `Send`, compile error if not. `tokio::sync::Mutex` only when
   the lock genuinely must span an await point.
9. `unsafe` without a safety comment — every `unsafe` block must document its
   invariant in a `// SAFETY:` comment.
10. Blocking I/O in async — never `std::fs::*`, `std::net::*`,
    `std::thread::sleep`, or any blocking stdlib call inside async code; use
    `tokio::fs::*`, `tokio::time::sleep`, or `spawn_blocking`.
11. `From` impl hiding `.unwrap()` — `From` must be infallible; use `TryFrom`
    for anything fallible (violates the `?` operator's contract otherwise).
12. `Box<dyn Error>` as a function's error return type in lib code — loses
    type info; use a concrete enum via `thiserror`.
13. **`clippy::correctness`** group violations — deny-by-default for a
    reason, signals genuinely wrong code; never suppress without a comment.
14. `todo!()` / `unimplemented!()` in production paths — OK during stub
    phases, block-tier if reachable in a released build.
15. RPIT (return-position `impl Trait`) without `use<..>` bounds in public
    APIs under **edition 2024** — Rust 2024 implicitly captures all in-scope
    lifetimes in `impl Trait` returns; public lib functions must add
    explicit `use<'a, T>` bounds to lock the capture set and prevent API
    breakage on edition upgrade.

**Anti-Patterns — Warn tier (should fix):**
- `pub(crate)` / `pub(super)` as a design smell — control visibility through
  module nesting (`mod` vs `pub mod`), not path qualifiers. Items inside:
  `pub` or private only. Wanting `pub(crate)`/`pub(super)` is a signal to
  reconsider the module hierarchy.
- Error types without `#[derive(thiserror::Error)]` — manual `Display` OK
  only when the format is too complex for `#[error(...)]`.
- Public error enums without `#[non_exhaustive]` — adding a variant is
  semver-breaking without it.
- Missing `#[source]` on inner error fields — the wrapping variant must
  return the inner error from `source()`, or chain-walking breaks for
  logging/diagnostics.
- Unnecessary `.clone()` — cloning to silence the borrow checker masks a
  design problem; restructure ownership, pass refs, or use indices.
- `Box<dyn Trait>` where `impl Trait` suffices — vtable + heap overhead;
  prefer generics for a single impl or compile-time-known set.
- `PathBuf` parameter where `&Path` suffices — accept `impl AsRef<Path>` at
  API boundaries, `&Path` internally.
- `String` parameter where `&str` / `impl AsRef<str>` suffices — forces an
  allocation at every call site. Exact lint named: **`clippy::needless_pass_by_value`**.
- Stringly-typed APIs — `String` where an enum would prevent typos at
  compile time; includes error types (`String` errors block programmatic
  matching).
- Boolean parameters — `fn sort(ascending: bool)` is less clear than
  `fn sort(order: SortOrder)`. Use enums for two-state flags.
- Missing `From`/`Into` — if callers often write `String::from(x)` or
  `.into()`, add `impl From<T>` (the `?` operator needs `From`).
- Unbounded channels — `mpsc::channel()` (unbounded) is a latent OOM; prefer
  `mpsc::channel(N)` with a documented bound.
- God structs — **15+ fields** spanning unrelated concerns → decompose.
- **(ocx only, not in grimoire's copy)** Abbreviated identifiers — full
  descriptive words for every name (types, enums, variants, fields,
  functions, locals, parameters): `annotation` not `ann`, `Architecture` not
  `Arch`, `text` not `t`, `index` not `idx`. Exceptions: established domain
  initialisms kept canonical (`OCI`, `URL`, `HTTP`, `id`), the conventional
  closure/iterator binding where the type is obvious from one line of
  context, and loop counters `i`/`j`. "A reader must not have to expand an
  abbreviation to know what a name holds."

**Anti-Patterns — Suggest tier (improvement, optional):**
- `Cow<'_, str>` for functions usually returning borrowed but sometimes
  allocating (serialisation, path normalisation).
- `#[must_use]` on returns callers might discard.
- Iterator chains over materializing intermediate `Vec` —
  `.iter().map().filter().collect()`, not build-then-iterate.
- `impl Into<T>` parameters — `fn process(name: impl Into<String>)` accepts
  both `&str` and `String` without forcing an allocation.
- Early returns over nesting — `if condition { continue; }` /
  `if condition { return; }` to cut indentation; flatten `if !x { ... }` by
  inverting.
- **`clippy::pedantic` cherry-picks** — don't enable the whole group; pick
  individually: **`clippy::semicolon_if_nothing_returned`**,
  **`clippy::match_wildcard_for_single_variants`**,
  **`clippy::inefficient_to_string`**.

**SOLID in Rust** (mechanism table):

| Principle | Rust Mechanism |
|---|---|
| SRP | One struct per concern; split `impl` blocks by role |
| OCP | New `impl Trait` instead of new match arms |
| LSP | Every trait `impl` honors documented contract — no `panic!` where trait promises `Result` |
| ISP | Narrowest bounds: `impl Write` not `impl Read + Write + Seek`; `&[T]` not `Vec<T>` when reading |
| DIP | Depend on `impl Trait` / `dyn Trait`, not concrete; constructor takes `impl Client` not `HttpClient` |

**DRY in Rust:** generics (`<T: Trait>`) as zero-cost DRY; derive macros
(`Debug, Clone, PartialEq, Serialize, Deserialize`) kill boilerplate;
`macro_rules!` for structural duplication generics can't express; extract a
trait only when 2+ genuinely different impls exist.

**YAGNI in Rust:** prefer `impl Trait` over `dyn Trait` unless runtime
polymorphism is truly needed; start concrete, extract a trait only when a
second different impl appears; don't over-engineer error enums (2 cases the
caller distinguishes ≠ a 20-variant enum); no premature generics (a function
handling only `String` gets no `<T: AsRef<str>>` until called with something
else).

**Async Patterns (Tokio):**
- *Structured Concurrency* — `JoinSet` for bounded parallel work needing all
  results (drop aborts all). Always join — never fire-and-forget spawned
  tasks; observe the `JoinHandle` or use `JoinSet`. **`JoinSet::join_next()`
  returns in completion order (non-deterministic)** — every consumer *must*
  sort by a stable key (path, index, ID) before returning; "no exceptions."
  Standard order-preserving pattern for parallel batches: spawn with an
  index, collect, sort by index. `.expect()` on `JoinHandle`/`join_next()` is
  OK for swallowing *task panics* at the join boundary (message describes the
  panicking context), but the **inner `Result` from the task must always be
  propagated via `?`**, never silently dropped. `spawn_blocking` for sync I/O
  and CPU-bound work (rule of thumb: **>100μs between awaits**); use `rayon`
  for heavy compute bridged via a `oneshot` channel. `spawn_blocking` results
  must be awaited or a blocking-thread panic is silently dropped.
- *Cancel Safety* — `recv()` is cancel-safe, `send()` is NOT: use
  `reserve().await` + `permit.send()` inside `select!`. Pin futures outside
  `select!` loops with `tokio::pin!` to resume rather than recreate each
  iteration. `JoinSet::join_next()` is cancel-safe.
- *Async Anti-Patterns* (all "NEVER"): hold `std::sync::MutexGuard` across
  `.await`; use `std::fs::*`, `std::net::*`, or `std::thread::sleep` in
  async; call `runtime.block_on()` from a tokio thread (deadlock); use
  `mpsc::unbounded_channel()` without justification; drop a `JoinHandle`
  without observing it (panics silently disappear).
- *Error Handling in Async* — distinguish panics (`.is_panic()`) from
  cancellation (`.is_cancelled()`) on `JoinError`; re-panic via
  `std::panic::resume_unwind(e.into_panic())` to propagate task panics; fail
  fast with `set.abort_all()` on first error when appropriate.
- *Async I/O Conventions* — `tokio::fs::*` not `std::fs::*`; `tokio::net::*`
  not `std::net::*`; channels bounded by default (`mpsc::channel(N)`),
  unbounded only with justification; `spawn_blocking` for sync I/O, `rayon`
  for CPU-bound.

**Testing Conventions:**
- Test-only methods: prefer a separate `#[cfg(test)] impl Foo { ... }` block
  before `mod tests`, not scattered `#[cfg(test)]` on individual methods
  mixed into the production `impl` — keeps production surface clear, makes
  test scaffolding explicit.
- **(ocx only, absent from grimoire's copy) "Structural guards
  (source-text assertions)"** — a substantial subsection (~75 lines) on tests
  that assert over a module's own source text rather than its behavior. Five
  concrete, non-hypothetical failure modes and the fix for each:
  1. **Scope to where the defect can actually occur**, not to the function
     whose name matches the contract — a guard scanning only the caller's
     source is blind to a swallow one call down inside a correctly-invoked
     callee; trace the call graph before deciding what to scan.
  2. **Strip comments before scanning** — a denylist that quotes the forms it
     forbids (as a comment naturally would) matches its own comment; filter
     `//`-prefixed lines out of the scanned text first.
  3. **A needle can silently stop matching** — a literal string tied to one
     exact source layout (a call chain at a specific line width) stops
     matching the moment `cargo fmt` or any refactor rewraps it, and a guard
     matching nothing still reports green. Where the guard's meaning depends
     on the needle matching at least once, assert the match count is
     non-zero, not only that a forbidden count is absent.
  4. **A count-form guard is a budget, not a pairing** —
     `body.matches(X).count() == body.matches(Y).count()` only proves totals
     agree (e.g. `1 == 1` passes even when one unpaired raw `X` sits next to
     one unrelated sanitized `Y` elsewhere in the file). Prefer scanning each
     call site and asserting the required form applies *there*, or extract a
     behavioral seam.
  5. **A negative assertion fails silently where a positive one fails
     loudly** — `!body.contains(X)` can't enumerate every way to write the
     forbidden shape (UFCS receiver, differently-named equivalent combinator,
     a helper hiding the pattern, a positional format arg satisfying a
     needle-count comparison without carrying the value). Treat a denylist as
     a tripwire for the likely accident, not the contract itself.
  Conclusion: structural guards are real coverage for genuinely absent
  behavior with no other test to write — but write them as narrowly and
  adversarially as a reviewer would try to defeat them, and prefer a
  behavioral seam first whenever one can be extracted.

**Cross-Platform Path Handling (ocx only, absent from grimoire's copy):**
A ~35-line section on OS-specific path canonicalization pitfalls:
- **macOS**: `/tmp`, `/var`, `/etc` are symlinks (`/tmp` → `/private/tmp`), so
  a `tempfile::TempDir` under `/tmp` has a *non-canonical* path.
- **Windows**: `std::fs::canonicalize` returns a `\\?\`-prefixed verbatim
  path; 8.3 short names vs long names also differ; the verbatim prefix
  breaks string comparison, `Display`, and further `Path::join`.
- **Windows absoluteness ≠ POSIX absoluteness**: a driveless `/root/bin` has
  a root but no drive prefix, so `Path::is_absolute()` is *false* on
  Windows; joining a "relative" path onto a base
  (`base.join("/root/bin")`) drops the base's directory and keeps only its
  drive → `C:/root/bin`.
- Rules: prefer **`dunce::canonicalize`** over `std::fs::canonicalize` (it
  strips the `\\?\` prefix when expressible without it — reach for bare
  `std::fs::canonicalize` only when a verbatim path is genuinely required);
  canonicalize both sides before a path equality/membership assertion;
  negative path assertions (`assert!(!set.contains(&raw_path))`) are a trap
  when the set is canonical-keyed and the raw path could never match —
  always pair a `!contains` with a positive assertion on a known-present
  canonical path; never assert a POSIX-absolute literal against a resolved
  path value (a `"/root/bin"` fixture matches verbatim on Linux but
  drive-joins to `"C:/root/bin"` on Windows) — assert the invariant under
  test, not the exact literal.

**Refactoring Tooling (Rust-specific):** when an LSP tool is available, use
rust-analyzer for symbol ops (`findReferences`, `goToDefinition`,
`workspaceSymbol`) for semantically precise results.

**Code Review Checklist (Rust additions, verbatim):**
- No `.unwrap()` in library code; no `MutexGuard` across `.await`; no
  blocking I/O in async.
- `thiserror` in libs, `anyhow` only in binaries — no `anyhow` in library
  APIs.
- Every `.clone()` intentional; prefer `&[T]`/`&str`/`&Path` over owned.
- `Result` propagated via `?` with `From` impls; errors logged once at
  boundary.
- `#[non_exhaustive]` on public enums; `#[source]` on wrapping error
  variants.
- Builder for 4+ optional fields; no boolean flags where an enum is clearer.
- **(ocx only)** Full descriptive identifiers — no abbreviations
  (`annotation` not `ann`, `text` not `t`); domain initialisms and obvious
  closure bindings exempt.
- `JoinSet` consumers sort results by a stable key; `spawn_blocking` handles
  are awaited.
- Bounded channels; tasks observed; no `MutexGuard` across `.await`.
- Public APIs use `use<..>` bounds for RPIT in edition 2024.
- `cargo clippy --workspace` passes; `clippy::correctness` never suppressed.
- A resolution-affecting CLI flag (offline / remote / config / index /
  similar) is forwarded in the project's subprocess-spawn helper (ocx names
  its own `Env::apply_ocx_config`; grimoire-duo generalizes the phrasing to
  "the single env-composition function") **and** documented in the env-var
  reference. A presentation flag (log-level / format / color) is **never**
  forwarded via env.

**2026 Update Notes:**
- **Edition 2024 stable.** Migrate with `cargo fix --edition`. Key impact:
  RPIT now captures all lifetimes — the `Captures` trick and outlives trick
  are dead weight, remove them. Reserve the `gen` identifier (it's a keyword
  even without stable generators).
- **`thiserror` 2.x** is the current line; new projects should pin `>=2`.
  `#[error(transparent)]` improvements + better `source` chaining make the
  upgrade worthwhile.
- **`clippy::pedantic` cherry-picking** (repeated from the Suggest tier) —
  `clippy::semicolon_if_nothing_returned`,
  `clippy::match_wildcard_for_single_variants`,
  `clippy::inefficient_to_string`.
- **`snafu`** — for subsystems with many error sites needing rich context
  (file paths, HTTP status codes), `snafu`'s context selector pattern is
  gaining adoption over `thiserror` + manual `map_err`. "Worth evaluating for
  large internal subsystems, not a blanket replacement."

**Comment Quality:**
- The Ousterhout Test (quoted): *"If someone unfamiliar with the code could
  write your comment just by reading the code, it adds no value."* Before
  adding a comment, apply three substitution tests — would a better name, an
  extraction into a named function, or a type (enum/newtype) eliminate the
  need? Add the comment only if all three fail.
- Two-Register Model: doc comments (`///`/`//!`) are for API consumers via
  rustdoc — content = contract (what it does, when it fails, invariants).
  Inline comments (`//`) are for maintainers reading the implementation —
  content = rationale (why this approach, non-obvious constraints). Never
  mix registers.
- Block tier: commented-out code (delete — VCS preserves history); `unsafe`
  without `// SAFETY:` (repeated from anti-patterns).
- Warn tier: narration comments restating the next line
  (`// Create a new vector` above `let v = Vec::new()`); tautological doc
  comments (`/// Returns the path` on `fn path()`); closing-brace comments
  (`} // end if`).
- Positive requirements: public items get a `///` summary that adds info
  beyond the name; functions returning `Result` get a `# Errors` section;
  modules get a `//!` inner doc comment at the top; `unsafe` blocks get a
  `// SAFETY:` explanation.
- Patterns to preserve: `// ── Section ──` dividers in long files; phase/step
  comments in multi-step orchestration (`// Phase 1:`); parenthetical
  why-qualifications (`// tolerate failure (stale ref or GC'd object)`);
  issue references (`// NOTE: issue #23`); comments explaining non-obvious
  constraints or "why this looks wrong but is correct"; external references
  (RFCs, specs, algorithm citations).

**Sources cited** (7 links): Rust API Guidelines, Rust 2024 Edition Guide
(RPIT Lifetime Capture), Clippy Lints Reference, Tokio `JoinSet` docs, Tokio
shared-state tutorial, Effective Rust Item 22 (Minimize visibility),
Effective Rust Item 29 (Listen to Clippy).

---

### 2.2 `quality-rust-errors.md` (byte-identical across ocx, ocx-mirror, grimoire, grimoire-duo — one digest covers all four)

**The Canonical Rule** (from Rust API Guidelines **`C-GOOD-ERR`** and
`std::error::Error` docs, quoted): *"Error messages are concise lowercase
sentences without trailing punctuation."* Canonical example:
`"invalid digit found in string"`, not `"Invalid digit found in string."`.
**Acronyms and proper nouns keep canonical case** — the rule applies to the
first *English word*, not initialisms: `JSON`, `TOML`, `HTTP`, `URL`, `I/O`,
`SHA-256`, `TLS`, `CI` stay unchanged. `"I/O error for {path}"` is compliant;
`"io error for {path}"` is not.

**Library vs CLI Boundary** (table): library (`thiserror` variants,
`#[error("...")]`) = lowercase, no period, concise — composes into `Display`
chains via `source()`; mixed-case chains read wrong
(`"failed to install: Registry authentication failed."`). CLI binary
(`anyhow::Context` strings) = sentence-case acceptable, since it's the
terminal boundary the user reads directly. When a binary prints with
`anyhow::Error`'s `{:#}` alternate format, the sentence-case CLI context
string prefixes the lowercase lib chain cleanly, e.g.:
```
Context("Running install for cmake:3.28")
  → lib error "registry authentication failed"
     → lib error "invalid digit found in header"
```
prints as: `Running install for cmake:3.28: registry authentication failed: invalid digit found in header`.
Never inline an `"Error:"` / `"error:"` prefix at the log site —
`log::error!`/`tracing::error!` already categorize the line.

**Block-tier violations (must fix before merge):**
- `.to_string()` in `map_err()` erasing source errors —
  `map_err(|e| MyError::X(e.to_string()))` destroys the source chain; use
  `#[source]` on a structured field carrying the inner error, or
  `Box<dyn Error + Send + Sync>`.
- `String` wrapping a structured error's `Display` output — if a field
  holds `error.to_string()`, it should hold the error itself.
- Sentence-case or trailing-punctuation `#[error("...")]` strings in library
  crates — violates `C-GOOD-ERR`, reads inconsistently in `{:#}` chains.
- `"Error:"` / `"error:"` prefix inside `#[error("...")]` strings — the
  `Error` trait itself already represents the error category; the prefix is
  redundant and breaks chain readability.
- Missing `#[source]` on wrapping error variants — every variant wrapping an
  inner error must return it via `source()`, or chain walking breaks for
  logging, diagnostics, downcasting.
- `anyhow::Error` in library APIs — libraries use `thiserror` for structured
  errors; `anyhow::Error` is a binary/application-layer convenience that
  destroys downstream `match`-ability.

**Warn-tier violations (should fix):**
- Missing `#[non_exhaustive]` on public error enums — adding a variant
  becomes a semver break without it.
- Error types without `#[derive(thiserror::Error)]` — manual `Display`
  impls OK only when the format logic is too complex for `#[error(...)]`;
  new types default to thiserror.
- Bare re-raise without context — `?` propagates fine, but adding an
  `anyhow::Context` string at each semantic boundary in the binary helps
  debugging.

**Structured Error Chain Pattern** — three-layer pattern for per-object
error diagnosis in batch operations, given as a full code example:
```rust
pub enum Error {
    #[error("{0}")]
    PackageManager(PackageError),
    // ... other top-level variants
}

pub struct PackageError {
    pub identifier: Identifier,
    pub kind: PackageErrorKind,
}

impl std::error::Error for PackageError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        Some(&self.kind)
    }
}

impl std::fmt::Display for PackageError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}: {}", self.identifier, self.kind)
    }
}

#[derive(thiserror::Error, Debug)]
#[non_exhaustive]
pub enum PackageErrorKind {
    #[error("package not found")]
    NotFound,
    #[error("ambiguous selection: {candidates:?}")]
    Ambiguous { candidates: Vec<String> },
    // ...
}
```
Outer struct attaches per-object context (identifier); inner enum carries the
discriminant kind. Chain walking via `source()` surfaces the inner kind for
programmatic dispatch (e.g. exit-code classification, see §2.3).

**`thiserror` Conventions:**
- `#[derive(thiserror::Error, Debug)]` on every library error type.
- `#[error("...")]` messages follow the lowercase/no-period rule.
- `#[source]` on wrapping variants; `#[from]` when the conversion is
  unambiguous and infallible.
- `#[error(transparent)]` when a variant is a pure pass-through to a single
  inner error — don't add a prefix when there's nothing to add.
- Library public API: always `#[non_exhaustive]`.
- **One error enum per module.** Avoid a single workspace-wide god enum —
  each subsystem owns its taxonomy, composed via `#[from]`.

**`anyhow` Conventions:**
- `anyhow` belongs in binaries (`main.rs` and immediate call sites), not
  libraries.
- Use `.context("…")` / `.with_context(|| …)` at semantic boundaries, not
  every `?` site.
- Sentence-case context strings OK at the CLI boundary where the user reads
  them.
- Print errors with `{err:#}` (alternate format) to walk the full `source()`
  chain — not `{err}`, which only shows the top message.
- Do NOT inline an `"Error: "` prefix when logging; `log::error!` /
  `tracing::error!` already signal the level.

**Normalization Examples** (table, 7 rows — verbatim):

| Non-compliant | Compliant |
|---|---|
| `"Invalid manifest: {0}"` | `"invalid manifest: {0}"` |
| `"Failed to read config file {path}"` | `"failed to read config file {path}"` |
| `"Registry authentication failed: {0}"` | `"registry authentication failed: {0}"` |
| `"A network operation was attempted while in offline mode."` | `"network operation attempted in offline mode"` |
| `"JSON serialization error: {0}"` | `"JSON serialization error: {0}"` (compliant — `JSON` acronym) |
| `"I/O error for '{path}': {source}"` | `"I/O error for '{path}': {source}"` (compliant — `I/O` acronym) |
| `"CI environment variable is not set. Is this running inside CI?"` | `"CI environment variable is not set; is this running inside CI?"` (trailing `?` removed by joining sentences; `CI` stays canonical) |

**Sources cited** (6 links): Rust API Guidelines `C-GOOD-ERR`,
`std::error::Error` trait docs, `thiserror` docs, `anyhow` docs, cargo source
(`util/context/mod.rs` — production-scale lowercase-message reference), jj
source (`cli/src/ui.rs` — library/CLI boundary split reference).

---

### 2.3 `quality-rust-exit_codes.md` (identical within each family — ocx ≡ ocx-mirror; grimoire ≡ grimoire-duo — the two families diverge only on exit code 81's name/scope)

**The Canonical Reference** — **BSD `sysexits.h`** (codes 64–78) is the
de-facto standard for CLI exit codes on Unix; formally deprecated as a C
header for portability but the numeric values stay canonical. The Rust CLI
Book endorses it via the `exitcode`/`sysexits` crates. Values 1 and 2 are
shell-reserved (1 = generic error, 2 = Bash builtin misuse); 128+ are
signal-derived (`128 + N`); 64+ avoids both collisions.

**Design Principles:**
- **Own the enum** — define a `#[repr(u8)]` enum in the library crate's
  `cli` submodule (`<lib>::cli::ExitCode`) instead of depending on the
  `sysexits` or `exitcode` crates; ownership decouples binaries from the
  external dep while values still follow stable POSIX convention.
- **Align with `sysexits.h`**: **64** usage, **65** data, **69** unavailable,
  **74** I/O, **77** permission, **78** config.
- **Reserve the private range above 78** — **79–127** is free (below
  shell-reserved 128+, above `EX__MAX = 78`) for tool-specific codes
  sysexits doesn't cover (e.g. "auth failure", "offline-blocked").
- `#[non_exhaustive]` required — adding a variant must not break semver.
- `From<ExitCode> for std::process::ExitCode` — lets `main()` return the
  code directly, no explicit cast at call sites.
- **One enum per workspace**, shared by all binaries (primary CLI and
  sibling tools) to prevent drift.

**Canonical Shape** — full code example (ocx version; the numeric table is
identical between families, only the last variant's name/doc differ):
```rust
/// Process exit codes used by all binaries in this workspace.
///
/// Numeric values align with BSD sysexits.h (EX__BASE = 64) to avoid collisions
/// with shell-reserved codes (1–2) and signal-derived codes (128+).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
#[non_exhaustive]
pub enum ExitCode {
    Success = 0,
    Failure = 1,
    UsageError = 64,      // EX_USAGE — bad CLI invocation
    DataError = 65,       // EX_DATAERR — malformed input data
    Unavailable = 69,     // EX_UNAVAILABLE — required resource unavailable
    IoError = 74,         // EX_IOERR — filesystem/read/write failure
    TempFail = 75,        // EX_TEMPFAIL — retryable transient failure
    PermissionDenied = 77,// EX_NOPERM — insufficient permissions
    ConfigError = 78,     // EX_CONFIG — bad config file / missing field
    NotFound = 79,        // tool-specific — resource not found (first slot above EX_CONFIG)
    AuthError = 80,       // tool-specific — authentication failure
    PolicyBlocked = 81,   // ocx: --offline or --frozen refused an op (not a fault)
    // grimoire family names code 81 `OfflineBlocked` — narrower scope, see §4
}

impl From<ExitCode> for std::process::ExitCode {
    fn from(code: ExitCode) -> Self {
        std::process::ExitCode::from(code as u8)
    }
}
```

**Error → Exit Code Classification** — use a **free function, not a trait
method** (a trait method would couple every error type to the exit-code
taxonomy → circular dependency errors → `ExitCode` → `main.rs` → errors). The
free function walks `anyhow::Error::chain()` and downcasts each known
subtree:
```rust
pub fn classify_error(err: &anyhow::Error) -> ExitCode {
    for cause in err.chain() {
        if let Some(e) = cause.downcast_ref::<MyLibError>() {
            return match e {
                MyLibError::OfflineMode        => ExitCode::PolicyBlocked, // OfflineBlocked in grimoire
                MyLibError::Io { .. }          => ExitCode::IoError,
                MyLibError::Config(ce)         => classify_config(ce),
                MyLibError::PackageManager(pe) => match pe.kind() {
                    PackageErrorKind::NotFound  => ExitCode::NotFound,
                    PackageErrorKind::Ambiguous => ExitCode::DataError,
                    _                           => ExitCode::Failure,
                },
                _ => continue,
            };
        }
        if let Some(io) = cause.downcast_ref::<std::io::Error>()
            && io.kind() == std::io::ErrorKind::PermissionDenied
        {
            return ExitCode::PermissionDenied;
        }
    }
    ExitCode::Failure
}
```
Note on the three-layer error pattern: `classify_error` must downcast the
**outermost** `Error` first, then pattern-match to the inner `kind` — you
cannot `downcast_ref::<PackageErrorKind>()` directly unless the kind is
attached as its own `anyhow::context` (unusual). **Default fall-through**:
any subtree not classified falls through to `ExitCode::Failure`; acceptable
as v1 behavior if a test locks in the fall-through so it can't silently
change later.

**Anti-Patterns:**
- *Block*: single-digit numeric codes for semantic categories (e.g. `exit 3`
  for "network error" — collides with shell-reserved 1/2, no discoverable
  meaning); Bash `exit $?` chains with magic numbers inside the CLI itself;
  different binaries in the same workspace using different exit-code
  taxonomies (blocks shared CI-script error handling — one enum, shared);
  trait-based error-to-exit-code mapping per error type (circular dep, use
  the free function instead); `std::process::exit(N)` from inside library
  code (libraries never exit — return `Result`, exit only at `main.rs`).
- *Warn*: hard-coded `ExitCode::from(N)` at call sites (route through the
  typed enum so the numeric value has a single source of truth); more than
  one canonical success code (e.g. `0` for "installed", `99` for
  "already installed" — use `Success = 0` and communicate the distinction
  via stdout/stderr, not the exit code); missing `#[non_exhaustive]`.
- *Suggest*: `match` with a wildcard arm `_ => Failure` — prefer exhaustive
  matches so new error variants compile-error until classified, then
  explicitly map unclassified variants to `Failure` if intended (locks the
  choice in).

**Wiring the Enum into `main()`:**
```rust
use <lib>::cli::{classify_error, ExitCode};

#[tokio::main]
async fn main() -> std::process::ExitCode {
    match app::run().await {
        Ok(code) => code.into(),
        Err(err) => {
            tracing::error!("{err:#}");
            classify_error(&err).into()
        }
    }
}
```
`app::run()` returns `anyhow::Result<ExitCode>`. Success path: the app's own
`ExitCode` (e.g. `Success` or `NotFound` for "nothing matched" queries).
Error path: log the full chain with `{err:#}`, classify via the free
function, return the numeric code. Never prefix the error log with
`"Error: "`.

**Scripts Consuming the Exit Codes** — example `case $?` script with
numeric branches for `0`/`64`/`69`/`78`/`79`/`80`/`81` and a `*` fallback
that echoes the unknown code and exits 1. Primary value: programmatic
failure discrimination for backend/automation tools without parsing stderr.

**Sources cited** (6 links): FreeBSD `sysexits.h` manpage, Rust CLI Book
(Exit Codes), `sysexits` crate, `std::process::ExitCode` docs, clig.dev
(Exit Codes — no numeric prescription, defers to tool conventions), npm exit
codes (semantic-differentiation example).

---

### 2.4 `quality-core.md` — language-general, but the parts most relevant to Rust digested here

Not Rust-specific, but auto-loaded across the whole codebase (no `paths:`
glob restriction — repo-root rule) and referenced *by name* from
`quality-rust.md` ("See `quality-core.md` for universal SOLID/DRY/YAGNI").
Digesting the parts with direct Rust-quality bearing:

- **SOLID / DRY / KISS / "Choose Boring Technology" / YAGNI** — the generic
  principles that `quality-rust.md` §"SOLID in Rust" etc. build on top of.
  KISS: "Design needs diagram to explain → too complex for problem." Boring
  Technology: teams have ~**3** "innovation tokens" total per Dan McKinley's
  framing — budget novel deps/frameworks/languages against that.
- **Anti-Pattern Severity tiers** — Block/Warn/Suggest, the same
  three-tier vocabulary `quality-rust.md` uses throughout its own
  anti-pattern lists. Universal Block-tier: hardcoded secrets, unvalidated
  external input at system boundaries, silently swallowed errors, god
  objects with **15+ fields/methods**. Universal Warn-tier: boolean
  parameters where an enum is clearer, stringly-typed APIs, unnecessary
  copies/clones in hot paths, missing error context.
- **"Don't Own Non-Domain Code"** (ocx only — absent from grimoire's copy,
  see §4) — a substantial section asking, before any reusability question,
  "should this code exist in this repo at all?" Don't hand-roll
  serialization, compression, hashing, HTTP, TLS, dates, globbing, terminal
  rendering. Bar for owning it (fork/vendor/hand-roll), narrow, only one of:
  (1) no library implements the requirement, verified by searching not
  assumed; (2) a library exists but leaks substantial needed features —
  named precedent: the `oci-client` fork at `external/rust-oci-client`,
  forked for missing capability, not a disliked API; (3) a few lines with no
  edge cases (YAGNI — no dep for a one-liner). "Our format is slightly
  non-standard" does **not** qualify. Severity: **Warn-tier, escalating to
  Block** for anything parsing/emitting an external wire format (serializers,
  codecs, escaping) — these fail silently past local fixtures. Worked
  example cited: a hand-written JSON emitter used escape boundary `> 0x7F`
  instead of `>= 0x7F`; both its unit test and doc comment affirmed the wrong
  rule, and no golden fixture contained the offending byte. Review
  implication: invisible to diff-scoped review when the file already exists
  — ask this question whenever a diff *touches* (not just adds) a
  non-domain module.
- **Performance Checklist** — includes two Rust-named items verbatim:
  "Blocking I/O in async paths (e.g., `std::fs::*` in async Rust, sync HTTP
  clients in async handlers)" and "Locks held across suspension points (e.g.,
  `MutexGuard` across `.await` in Rust)" — these are the same rules
  `quality-rust.md`'s Block-tier anti-patterns state, restated at the
  universal-checklist level.
- **Refactoring Tooling** — "check available tools via `ToolSearch`… prefer
  semantic tooling (LSP `findReferences`, `workspaceSymbol`,
  `goToDefinition`) over text search (Grep) for symbol-level ops." Same
  principle `quality-rust.md`'s "Refactoring Tooling (Rust-Specific)"
  section narrows to rust-analyzer specifically.
- **Refactoring Discipline — "Two Hats Rule"**: never mix refactoring
  (structure change, behavior unchanged, tests pass unchanged) and
  optimization (performance change, behavior unchanged, benchmarks
  required) in the same session; commit before switching hats. A
  rationalization table gives three named traps and their correct action
  (e.g. "I'll optimize this loop while I refactor it" → commit the refactor
  first).
- **Verification Honesty** — banned-phrase table ("should work" →
  "verified by [test name/command output]"; "probably"/"likely" → state what
  was checked; "seems to" → "confirmed that [X] by [method]"; "Great!"/
  "Perfect!"/"Done!" → cite completion evidence). Classification: hedging in
  a review verdict or completion report = **Warn-tier**; premature
  celebration before verification evidence = **Warn-tier**; stating
  "verified" without citing evidence = **Block-tier** (false verification).
- **"Unchecked Green"** (ocx only — absent from grimoire's copy, see §4) —
  a green check result is only evidence if a red one was reachable; the test
  is to demonstrate *both* outcomes on controlled inputs (a check that can
  only ever be red, or that never ran, looks identical to "passing" without
  this). Applies to config whose failure mode is "quietly does less"
  (unmatched globs, `paths:` on rule files — an explicit self-referential
  callout) as much as to tests. Warns that a detector matching its own
  invocation measures itself (`pgrep <term>` from a shell whose command line
  contains `<term>`). Corollary: a mutation that *fails* to turn a check red
  means "I haven't found every guard yet," not "the check is weak" — two
  independent guards on one property both pass when either alone is
  deleted; keep mutating until one reds. "The harness is not exempt" — prove
  a mutation landed (the mutated text is actually present) before trusting a
  script's success report. Cheapest tells named: a tolerated *range* of exit
  codes, a text assertion where a parser exists, a skip message naming a
  cause it never observed. Classification: claiming a check works without
  seeing it red = **Warn-tier**; shipping a check whose red state was never
  reachable = **Block-tier**.
- **"See Also" list** at the bottom names the sibling leaf files by
  responsibility: `quality-rust.md` (ownership, async/Tokio, error handling,
  edition 2024), `quality-python.md`, `quality-typescript.md` (ocx only),
  `quality-bash.md`, `quality-vite.md` (ocx only).

---

### 2.5 `quality-security.md` — mostly non-Rust, but names concrete Rust modules as its evidence base

Structurally generic (OWASP Top 10 2021 table, CWE reference convention,
Critical/High/Medium/Low severity table, dependency-safety bullets) and not
Rust-language-specific in its checklist mechanics. The Rust-relevant content
is entirely in the per-product **"Attack Surfaces"** section, which names
concrete Rust source paths as the audit's evidence:

- **ocx**: registry auth chain via `OCX_AUTH_<REGISTRY>_*` env vars →
  Docker credentials; `OCX_INSECURE_REGISTRIES` (HTTP-only, localhost/test
  only); digest verification (SHA-256) + "manifest signature validation";
  symlink safety re `OCX_HOME` traversal + Windows junction points +
  back-reference integrity; archive extraction (tar path traversal / zip
  slip, symlink injection, permission preservation incl. setuid/setgid,
  decompression bombs); macOS ad-hoc code signing on Mach-O binaries;
  `${installPath}` template expansion + PATH prepend ordering.
- **grimoire**: same shape, materially corrected against actual shipped code
  (dated 2026-07-26 in an HTML comment inside the file) — explicitly states
  "No signature verification exists… Do not audit for it and never claim
  it," names the two-layer path-containment guard
  (`path_safety.rs::contain`, `install/path_anchor.rs::AnchoredPath::resolve`),
  flags Windows junction points as **unverified** (`dunce::canonicalize`
  plausibly resolves them but every escape test is `#[cfg(unix)]`), names
  `materializer.rs::safe_relative_path` for zip-slip prevention, states tar
  permission bits are **never applied** (plain `std::fs::write`, default
  umask — no setuid/setgid surface exists), the `CappedSink` streamed
  size-cap for CWE-770, and an MCP-descriptor-execution section (grim writes
  `command`/`args` verbatim from the registry into the client's MCP config;
  grim itself never executes them). The file's own HTML comment models good
  practice for this whole rule: "a stale checklist entry is worse than a
  missing one: it gets repeated into a public document as a control that
  does not exist."

This file is a **poor candidate for a portable Rust-quality package** as
written — its normative content is either generic security-review process
(shareable, but not Rust-specific) or wholly product-specific claims about
one repo's shipped modules (not portable at all). See §5.

---

### 2.6 `quality-cli-help.md` (ocx only) — governs Rust `///` doc-comment content on clap surfaces

Narrow-scoped (`crates/ocx_cli/src/**` only) but directly Rust-relevant: it
governs what goes inside `///` doc comments on any type/field/variant that
`clap`'s derive macro projects into user-facing `--help` text.

- **The One Rule**: *"`///` on a clap surface states the user contract.
  Nothing else."* — implementation rationale, ADR references, and design
  history don't belong in text a user reads.
- **Two-Tier Help** mirrors clap's own model: the first paragraph of a `///`
  comment becomes `about`/`help` (short, target **≤ ~70 chars**, no trailing
  period since clap strips it but keeps `...`); everything after a blank
  line becomes `long_about`/`long_help` (complete sentences: what it does,
  important flags, failure modes/exit codes, a doc-site link for depth).
- Applies to **all four** clap-facing surfaces: the root command, subcommand
  variants (`///` on the `Command`/group-enum variant clap actually
  renders), command-group dispatcher enums, and individual
  arguments/flags/possible-values.
- **Render-source gotcha**: for a variant `Foo(FooArgs)`, clap renders the
  *variant's* doc as the subcommand's `about`, and each `FooArgs` field as an
  arg — but `FooArgs`'s own top-level `///` is orphaned (rustdoc-only)
  *unless the variant itself has no doc*, in which case clap falls back to
  it. Confirm with `--help` directly; a specific test
  (`app::tests::cli_help_text_is_ascii`) walks the whole `Cli::command()`
  tree as the authoritative definition of "clap-facing."
- **Forbidden in clap-facing help (Block-tier)**: section/clause references
  (`handshake §3`, `C1`, `per the amended ...`); ADR/spec/code-path
  references (`adr_*.md`, `app::plugin_dispatch`, RFC numbers, rustdoc
  `[Self::build_api]` links — they render as raw bracket noise); dates and
  build timestamps (use a digit-free placeholder `<YYYYMMDDhhmmss>` in
  format examples); migration history ("former root commands moved here");
  implementation jargon ("backend-first", "walk-order chain blob digests");
  incorrect statements of behavior (a stale help string that contradicts
  reality is itself a Block-tier bug).
- **Anti-Patterns (tiered)**: Block = any forbidden item above in a
  clap-rendered string, or a non-ASCII byte in help (Windows PowerShell 5.1
  mojibakes captured `--help` streams under the console codepage — use
  `->`, `-`, `...` instead of arrow/em-dash/ellipsis). Warn = implementation
  jargon where a user sentence belongs, a `long_about` dumping full
  narrative, example flood (>2 inline examples), tautological help
  (`/// The format` on `--format`), abbreviated flag names, or a
  `-file`/`-path` suffix on a flag that *reads* input (reserved for flags
  that *write* an output sink, e.g. `--export-file`). Suggest = missing doc
  deep-link, missing default/env-var note on a resolution-affecting flag,
  short help longer than ~70 chars.
- **Automated Enforcement** — four gates run in `task verify`, table:
  `app::tests::cli_definition_is_valid` (clap structural invariants),
  `app::tests::cli_help_text_is_ascii` (every clap-rendered string is
  ASCII), `app::tests::cli_help_text_has_no_internal_references` (no `§` /
  `handshake` / `adr_` / `amended` / ISO-date / 8+-digit timestamp leaks),
  `test/tests/test_completion_ascii.py` (generated completion +
  `self activate` output bytes are ASCII). Explicitly noted: these guards
  backstop unambiguous markers only, not a substitute for by-hand review of
  spelled-out `section N`, jargon, or stale facts.

---

### 2.7 `arch-principles.md` — Rust-specific (auto-loads on every `.rs` edit); the most portable sub-section is its Utility Catalog

Both repos' copies are structured the same way: crate/binary layout, a
design-patterns-to-module mapping table, an "End-to-End Command Flow" ASCII
diagram, a "Key Concepts" glossary, an ADR index table, a "Code Style
Conventions" table, a "Where Features Land" table, and (ocx only) a
"Cross-Cutting Modules" table plus a large **Utility Catalog** and **Locking
Policy**. Digesting only the parts that are Rust-*pattern* guidance rather
than pure ocx/grimoire product facts (product facts are excluded — see §5):

- **Design Principles table** (both repos, same pattern vocabulary as
  `quality-rust.md`'s SOLID table): Facade, Strategy/trait dispatch, Command
  pattern, Three-layer errors (same pattern as `quality-rust-errors.md`
  §2.2), Option-based lookups/results ("not found" = `Option::None`, not an
  error, at the lookup layer), Extension traits in a prelude, Builder
  pattern, Lazily-initialized/singleton context (one init per invocation).
- **Utility Catalog (ocx only, absent from grimoire's shorter copy)** — a
  large "check this table before writing a small helper" reference table
  mapping ~25 concrete needs to existing helpers (e.g.
  `Path::with_added_extension` (std, stable) for appending an extra
  extension; `SerdeExt::read_json`/`write_json` for JSON with path-context
  errors; `StringExt::to_slug`/`to_relaxed_slug` for filesystem-safe
  slugification; `VecExt::sorted`/`unique_clone`; `ResultExt::ignore` for
  deliberately-ignored `Result`s; `utility::fs::LockedFile` +
  `LockedJsonFile<T>`/`LockedTomlFile<T>` for cross-process advisory file
  locks with RAII; `utility::fs::DropFile` as an RAII delete-on-drop guard;
  `utility::fs::path::{lexical_normalize, escapes_root,
  validate_symlinks_in_dir}` for lexical path containment without FS I/O;
  `utility::fs::rename_with_windows_retry` /
  `utility::fs::persist_temp_file` for Windows transient-lock-retry atomic
  publish). **Rule stated explicitly**: "before writing small helper inside
  module, check this table. Helper reinvented in one module = wasted effort
  + drift risk. If new helper broadly applicable, upstream to `utility/`…
  in same change." This "check std → check catalog → then invent" discipline
  is itself a portable Rust practice even though the concrete row entries are
  ocx-specific.
- **Locking Policy table (ocx only)** — a two-row decision table: stable
  inode edited in place → lock the data file itself (`LockedFile`);
  atomic-rename-replaced data (inode rotates) → lock into a dedicated locks
  directory, never a persistent sidecar next to the guarded data (sidecars
  outside it are a review Block-tier finding). This decision rule (choose
  the locking mechanism by *whether the target's inode is stable*) is a
  portable Rust concurrency pattern independent of ocx's specific paths.
- **Code Style Conventions table** — both repos share: "Type names: full
  descriptive names (`OperatingSystem`, `Architecture`), not abbreviations
  (`Os`, `Arch`)" and "Module structure: one concept per file, no `mod.rs`,
  named module files." ocx additionally has: "Internal enum exhaustiveness —
  omit `#[non_exhaustive]` on internal non-error enums so matches stay total
  across the workspace (binary is the only consumer); error enums exempt"
  and a "Test-only seams" row (env vars double-underscore-prefixed
  `__OCX_*`, gated `#[cfg(any(test, feature = "__testing"))]`, kept out of
  user docs). grimoire's copy states the same exhaustiveness rule plus one
  grimoire-only row: "Domain types over `String` — fields representing a
  domain concept (registry reference, digest, version, platform) use a
  dedicated type with round-tripping `Serialize`/`Deserialize`, not raw
  `String`" — this is a portable, general "domain newtype over stringly-typed
  field" rule not present verbatim in `quality-rust.md`'s own newtype
  section.
- **Utility Discipline (grimoire's compressed equivalent of ocx's Utility
  Catalog)** — states the same "check `std`, then `tokio`, then existing
  crate-level utility before writing a small helper" principle in ~6 lines
  without ocx's large lookup table — i.e. grimoire keeps the *rule* but
  dropped the *catalog rows* as the codebase is smaller.

---

## 3. Not digested in depth (checked, found non-Rust or out of primary scope)

- `ocx-mirror/.claude/rules/security-threat-model.md` — exists in place of
  `quality-security.md`; generic STRIDE-shaped threat-modeling guidance, not
  Rust-language-specific. Not read in full for this inventory.
- `grimoire-duo/.claude/rules/quality-bash.md` — Bash, not Rust.
- `grimoire-duo/.claude/rules/subsystem-tests.md` — referenced *by name*
  from ocx's `arch-principles.md` ("Test-Only Seams… full convention +
  reference impl in `subsystem-tests.md`") but grimoire-duo's own copy was
  not opened; likely carries Rust test-fixture conventions and is a strong
  candidate for a follow-up pass (see §6).

---

## 4. Divergences between ocx's and grimoire's copies of the same-named rule

| File | Divergence | Which is newer/broader |
|---|---|---|
| `quality-rust.md` | ocx (340 lines) has three blocks entirely absent from grimoire (263 lines): (1) the "Abbreviated identifiers" Warn-tier anti-pattern bullet + its matching Code Review Checklist line; (2) the ~75-line "Structural guards (source-text assertions)" testing subsection; (3) the ~35-line "Cross-Platform Path Handling" section (macOS/Windows canonicalization pitfalls, `dunce::canonicalize` rule). Everything else is byte-identical. One further micro-diff: the CLI-flag-forwarding checklist line names ocx's own `Env::apply_ocx_config` helper by name, where grimoire generalizes it to "the single env-composition function" — a deliberate de-specialization for portability already done once by the grimoire author. | **ocx is strictly broader** — grimoire's copy reads like an earlier snapshot with the ocx-specific helper name already genericized but three whole sections not yet back-ported. |
| `quality-rust-errors.md` | **None.** Byte-identical in ocx, ocx-mirror, grimoire, grimoire-duo. | Tied — already fully converged. |
| `quality-rust-exit_codes.md` | Only the exit-code-**81** variant differs: ocx names it `PolicyBlocked` and documents it as triggered by *either* `--offline` or `--frozen` ("a deliberate local policy… refused a network or resolution operation"), with its script-consumer comment reading "policy blocked (offline/frozen); loosen the flag or update the index." grimoire names the same numeric slot `OfflineBlocked`, scoped only to offline mode ("Offline mode blocked a network operation… the failure is deliberate policy, not a fault"), with the simpler script comment "offline mode; run online." Everything else (the full enum shape, `sysexits.h` table, classification pattern, anti-patterns, `main()` wiring, sources) is identical. | **ocx is broader** (covers a second policy trigger, `--frozen`) — this reads as ocx generalizing a rule grimoire defined first for a narrower single-flag case, or grimoire intentionally keeping the narrower name because it has no `--frozen` equivalent. Either is portable; the package should either parameterize the variant name/scope or pick ocx's broader framing and note narrowing is fine per-project. |
| `quality-core.md` | ocx (239 lines) has two entire sections absent from grimoire (167 lines): (1) "Don't Own Non-Domain Code" (~30 lines — the "no hand-rolled serializer/codec" rule with its own Code Review Checklist line); (2) "Unchecked Green" (~35 lines — the red/green check-validity rule, itself explicitly citing "`paths:` on rule files" as an example of a silently-degrading config, i.e. this very rule-file convention). The "See Also" footer also differs by roster: ocx lists `quality-typescript.md` and `quality-vite.md` in addition to the three grimoire shares (`quality-rust.md`, `quality-python.md`, `quality-bash.md`) — reflecting ocx's broader per-language rule set, not a content divergence in the shared file itself. | **ocx is strictly broader.** Both added sections are general (not Rust- or ocx-specific) and read as strong candidates to port wholesale. |
| `quality-security.md` | Beyond the expected product-name swaps (`OCX_*` env vars ↔ `GRIM_*`, "OCX audit" ↔ "Grimoire audit"), grimoire's "Attack Surfaces" section is a materially *corrected* rewrite (dated 2026-07-26 in an in-file HTML comment) that explicitly retracts claims ocx's copy still makes: no signature verification, no code-signing step, no `${installPath}` env templating, no decompression-bomb surface, no setuid/setgid preservation concern — all present as active checklist items in ocx's copy but stated as *not applicable / not shipped* in grimoire's. grimoire's copy also adds concrete module/function names as evidence (`path_safety.rs::contain`, `materializer.rs::safe_relative_path`, `CappedSink`) that ocx's copy lacks for the analogous ocx concepts. | **Neither is simply "ahead"** — grimoire's is methodologically better disciplined (evidence-linked, self-correcting, explicit about non-existent controls) but both are product-specific rewrites of a shared checklist skeleton, not a shared source of truth. |
| `arch-principles.md` | Expected to diverge heavily — different products. Beyond the different `paths:` glob (`crates/**/*.rs` + `external/**/*.rs` vs `src/**/*.rs`) and entirely different ADR indexes, the *portable pattern content* diverges too: ocx has a large **Utility Catalog** (~25-row lookup table) and a **Locking Policy** table that grimoire's copy compresses into a 6-line prose paragraph ("Utility Discipline") with no catalog rows — grimoire is evidently a smaller/younger codebase that hasn't accumulated as many named utilities yet, not a disagreement in principle. grimoire's Code Style Conventions table adds one row ocx's lacks: "Domain types over `String`." | Not meaningfully comparable as "same rule, two versions" — same *shape*, different *content* by design (each records its own codebase's facts). The **discipline** ("check std → check catalog → then invent") is identical and portable; the **catalog rows** are not. |

---

## 5. Repo-specific vs portable

**Portable as-is (general Rust guidance, no project facts):**
- All of `quality-rust.md` except the one CLI-flag-forwarding checklist line
  that names `Env::apply_ocx_config` (already genericized in grimoire's
  copy and trivially so in ocx's).
- All of `quality-rust-errors.md` (already zero-divergence across all four
  repos — strong signal it's already fully general).
- All of `quality-rust-exit_codes.md` except the one bikeshed of what to
  call exit code 81 and whether it covers one flag or two — the *mechanism*
  (own the enum, align to `sysexits.h`, reserve 79–127, one enum per
  workspace, free-function classification) is 100% portable.
- `quality-core.md` in its entirety — it explicitly bills itself as
  "Canonical design principles for all languages… Shareable,
  project-independent root rule," and nothing in it names an ocx or
  grimoire concept.
- `quality-cli-help.md`'s **general rule** (`///` on a clap surface states
  only the user contract; the two-tier short/long help mapping; the
  render-source gotcha; the forbidden-content list) — all of this is generic
  clap+rustdoc mechanics, not ocx-specific, even though the file's `paths:`
  glob and its one worked example (`content_path.rs`, `ocx.sh` doc link) are
  ocx paths. The four `task verify` test names in "Automated Enforcement"
  are ocx-specific identifiers but describe a portable *pattern*
  (structural CLI-help guards) worth restating generically.
- `arch-principles.md`'s **Design Principles table**, the **"check std →
  check existing catalog → then invent" discipline**, and the **Locking
  Policy decision rule** (inode-stable vs atomic-rename-replaced data
  dictates the locking mechanism) — all portable patterns independent of
  ocx's specific module paths.

**Repo-specific (must be stripped, genericized, or left out):**
- Every `paths:` frontmatter glob that names a real crate directory
  (`crates/ocx_cli/src/**`, `crates/**/*.rs`, `external/**/*.rs`,
  `src/**/*.rs`) — a published package needs its own glob convention, not
  these paths verbatim.
- All concrete crate/module names cited as evidence: `ocx_lib`, `ocx_cli`,
  `ocx_schema`, `Env::apply_ocx_config`, `FileStructure`, `IndexImpl`,
  `PackageManager`; grimoire's `path_safety.rs`, `materializer.rs`,
  `CappedSink`, `install/path_anchor.rs`.
- All ADR references and ADR index tables in `arch-principles.md` (both
  repos) — these are product decision records, not portable rules.
- The entire "Utility Catalog" *row content* in ocx's `arch-principles.md`
  (the helpers themselves — `StringExt::to_slug`, `hardlink::create`, etc. —
  are ocx's own code, not a library a new repo would have).
- `quality-security.md`'s entire "Attack Surfaces" / "Audit Checklist"
  sections in both repos — 100% product-specific (env var names, specific
  module functions, specific vulnerability classes that do/don't apply to
  that one codebase's shipped features). Only the file's *generic* top half
  (OWASP table, CWE convention, severity table, dependency-safety bullets,
  output guidelines) is portable, and that content is standard security-review
  boilerplate rather than distinctive Rust guidance.
- Exit code 81's exact name/scope (`PolicyBlocked` vs `OfflineBlocked`) is a
  per-project bikeshed — a portable package should either omit it and stop
  the reserved-range table at 80, or present it as an example slot the
  adopting project names for its own policy-refusal case.

---

## 6. Gaps — Rust quality areas these rules do NOT cover

1. **Traits and generics beyond the four SOLID-mapping bullets and the
   YAGNI "no premature generics" line** — no guidance on trait object safety,
   supertraits, default methods vs required methods, blanket impls,
   associated types vs generic parameters, GATs, or where clauses/trait
   bounds style.
2. **Testing depth beyond "structural guards" and "test-only methods"** — no
   guidance on table-driven / property-based testing (`proptest`,
   `quickcheck`), snapshot testing (`insta`), test fixture organization,
   `#[test]` naming conventions, integration-vs-unit test placement,
   mocking/fake strategy, or flaky-test handling. (ocx's own
   `arch-principles.md` points at a sibling `subsystem-tests.md` for
   "Test-Only Seams" that wasn't in scope here — see §3.)
3. **Performance/benchmarking** — `quality-core.md`'s generic Performance
   Checklist (N+1 patterns, blocking I/O, clones, unbounded channels) is the
   only content; nothing on `criterion` benchmarks, allocation profiling,
   `perf`/flamegraphs, SIMD, or `#[inline]` guidance.
4. **`unsafe` beyond "needs a `// SAFETY:` comment"** — no guidance on
   minimizing unsafe surface area, `Miri` usage, FFI conventions,
   `#[repr(C)]` / ABI stability rules, or sound-wrapper design for unsafe
   internals.
5. **Macro hygiene** — `macro_rules!` is named once (DRY-in-Rust, "structural
   duplication generics can't express") with zero style guidance; no mention
   of proc-macro authoring, declarative-macro hygiene pitfalls, or
   `syn`/`quote` conventions.
6. **Semver / MSRV / dependency-version policy** — no MSRV pinning
   guidance, no semver-compatible-change checklist beyond the scattered
   `#[non_exhaustive]` mentions, no `cargo-semver-checks` or
   `cargo-deny`/`cargo-audit` mention (dependency vetting is covered only
   generically in `quality-security.md`'s "Dependency Safety" bullets —
   Trivy/Snyk/Dependabot, not Rust-specific tooling).
7. **Feature flags / conditional compilation** — no guidance on Cargo
   feature design (additive-only features, mutually-exclusive feature
   pitfalls, `--no-default-features` testing), beyond the one
   `#[cfg(any(test, feature = "__testing"))]` test-seam convention in ocx's
   `arch-principles.md`.
8. **Workspace layout / crate boundaries** — ocx's `arch-principles.md`
   documents *its own* crate layout as fact, but there's no generalized
   "how to split a workspace" or "when to extract a new crate" rule a
   portable package could ship.
9. **Observability** — `tracing`/`log` usage is mentioned only incidentally
   (error-logging placement, `tracing::error!` in the exit-code file); no
   guidance on span design, structured logging fields, log-level
   conventions, or metrics/telemetry.
10. **Serialization/schema evolution beyond the one `serde_repr` version-enum
    pattern** — no broader guidance on `serde` attribute conventions
    (`#[serde(deny_unknown_fields)]` trade-offs — notably, ocx's
    `arch-principles.md` argues *against* `deny_unknown_fields` for one
    specific fleet-compat reason, but that's a product decision, not a
    general rule), backward/forward-compatible field addition, or
    `schemars`/JSON-schema generation conventions.
11. *(bonus, 11th)* **Build tooling / CI integration for Rust specifically**
    — `cargo clippy --workspace` is named once as a checklist gate, but
    there's no guidance on `cargo fmt` enforcement, MSRV CI matrix, cross-
    compilation targets, or release/publish tooling (`cargo-release`,
    `cargo-dist`) — despite `quality-rust.md`'s "2026 Update Notes" showing
    the authors do track ecosystem/tooling currency (edition 2024, thiserror
    2.x, snafu adoption) for *libraries*, not build tooling.
