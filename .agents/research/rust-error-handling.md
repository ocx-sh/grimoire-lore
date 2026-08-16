---
title: "Error handling, diagnostics and panics"
topic: rust-error-handling
model: opus
consolidates:
  - rust-error-handling/error-model-and-crates.md
  - rust-error-handling/error-ux-and-diagnostics.md
  - ocx-codebase-audit/errors-async-security.md
  - ocx-codebase-audit/exit-codes-and-cli.md
  - ocx-codebase-audit/rules-inventory.md
date: "2026-08"
---

# Error handling, diagnostics and panics

## Verdict

1. **`thiserror` + `anyhow`, nothing else.** No `eyre`, no `miette`, no `snafu`, no
   `error-stack`. `miette` earns its weight only when a CLI points at byte ranges in
   user-authored source text ([error-ux §5](rust-error-handling/error-ux-and-diagnostics.md));
   grim and ocx report registry, filesystem and process failures, not parse spans.
2. **The library/binary split is by *role*, not by crate type.** The owner's one-crate
   reality does not license `anyhow` everywhere. Every subsystem module owns a concrete
   `thiserror` enum in its own `error.rs`; `anyhow` starts at `app::run` and stops there.
   ocx_lib already does this with 15 per-subsystem `error.rs` files
   ([errors-async-security §1](ocx-codebase-audit/errors-async-security.md)); `ocx-mirror/src`
   does not, and that is a defect, not a style choice.
3. **Lowercase, unpunctuated `Display` text everywhere — including `anyhow` context
   strings.** This overrides the shipped `quality-rust-errors.md`, which permits
   sentence-case at the CLI boundary. Resolution below.
4. **Exit codes are structural, never textual.** The taxonomy bucket (user / environment /
   upstream / bug) must be recoverable from the error value. Both ocx and grimoire already
   satisfy this; the *mechanism* differs and both are now blessed (see conflict 2).
5. **Panics mean bugs and keep exit 101.** No `catch_unwind` around `main`, no
   `human-panic`-style downgrade of a panic into ordinary error text. `unwrap`/`expect` are
   assertions about invariants, enforced by clippy restriction lints that must be *opted
   into* — a clean `cargo clippy` proves nothing about panic policy on its own
   ([error-model §12](rust-error-handling/error-model-and-crates.md)).
6. **The error chain is untrusted text.** It quotes package names, tags and paths read off
   the wire. It is sanitized for control/bidi characters at exactly one stderr boundary
   before printing. ocx does this; grimoire does not, and that is the single highest-ranked
   finding in the local audit.
7. **Full cause chain by default.** The sub-researchers flagged chain-by-default vs
   `-v`-gated as unsettled ([error-ux, Contested](rust-error-handling/error-ux-and-diagnostics.md));
   these are developer tools consumed by CI and by agents, both codebases already print
   `{err:#}`, so the chain stays on by default.

### Conflicts resolved

**Conflict 1 — case at the CLI boundary.** The shipped `quality-rust-errors.md` says
sentence-case `anyhow::Context` strings are acceptable because the binary is the terminal
boundary ([rules-inventory §2.2](ocx-codebase-audit/rules-inventory.md)); the UX research
says lowercase per
[C-GOOD-ERR](https://rust-lang.github.io/api-guidelines/interoperability.html) and rustc's
`error: <lowercase>` style. **Resolved in favour of lowercase everywhere.** A context string
is only outermost until someone wraps it — the shipped rule's own worked example renders
`Running install for cmake:3.28: registry authentication failed: …`, and the moment that
string is nested one level deeper the capital lands mid-line. The `error: ` prefix is
applied by the print site and is itself lowercase.

**Conflict 2 — free function vs trait for exit-code classification.** The shipped
`quality-rust-exit_codes.md` *Blocks* trait-based mapping, citing a circular dependency
lib → cli → lib. ocx does exactly the blocked thing: `ClassifyExitCode` implemented on 50+
error types ([exit-codes §3](ocx-codebase-audit/exit-codes-and-cli.md),
`ocx_lib/src/cli/classify.rs:44`), while grimoire follows the documented free function
(`grimoire/src/error.rs:177`). **Resolved: both are permitted; the stated rationale is
wrong.** `ExitCode`, the trait and the error types all live inside `ocx_lib`, so there is no
cycle to create. The trait is the better fit when nested wrapper variants must delegate
recursively (`inner.classify()`); the free function is the better fit when one top-level
enum can be matched exhaustively. What is *not* negotiable is ERR-13: whichever mechanism,
the mapping is derived from types, never from `Display` text. The shipped rule text must be
corrected — it is stale, not aspirational.

**Conflict 3 — `#[from]` convenience vs context.** The shipped rule blesses `#[from]` "when
the conversion is unambiguous"; the error-model research shows a `#[from]` field can hold
*only* the source, so any variant needing a path, URL or identifier cannot use it
([error-model §4](rust-error-handling/error-model-and-crates.md)). **Resolved toward the more
specific formulation (ERR-07):** `#[from]` is for pass-through only; the moment a sibling
fact matters, an explicit named-field variant plus `map_err` is required. This is the rule
an agent silently violates — it drops the context rather than restructuring the variant.

## The ruleset

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| ERR-01 | Subsystem modules return a concrete `thiserror` enum; `anyhow::Error` appears only in `main.rs` and `app::run` and the command handlers directly beneath them. | `anyhow` in a reusable module destroys downstream `match`-ability and exit-code classification. | `rg 'anyhow' src/ --files-with-matches \| rg -v 'main\.rs\|app\.rs\|command/'` — every hit is a candidate downgrade. | MUST |
| ERR-02 | Every public error enum carries `#[non_exhaustive]`. | Adding a variant to an exhaustive public enum is a semver break; matches the fleet-forward-compat posture already applied to wire payloads. | `rg -B2 'pub enum \w*Error' src/` and confirm the attribute precedes each. | MUST |
| ERR-03 | Every variant that wraps another error carries `#[source]` (or `#[from]`, which implies it). Never `#[error("{0}")]` on a wrapped error without `#[source]`. | Without it `source()` returns `None`, chain walking stops, and both `{err:#}` rendering and downcast-based classification silently lose the inner error. | `rg '#\[error\("\{0\}"\)\]' -A2 src/` — each hit must have `#[source]`/`#[from]` on the field or be `#[error(transparent)]`. | MUST |
| ERR-04 | Never `map_err(\|e\| X(e.to_string()))`, and never store `error.to_string()` in a field. | Stringifying erases the source chain and all downcast ability; carry the error structurally. | `rg 'map_err.*to_string\(\)' src/` must return nothing. | MUST |
| ERR-05 | `#[error("…")]` text and `anyhow` context strings are lowercase, have no trailing punctuation, and never begin with `error:`/`failed:`/`Error`. Acronyms keep canonical case (`JSON`, `I/O`, `TLS`, `SHA-256`). | C-GOOD-ERR; the string must compose when nested inside a `{err:#}` chain or a wrapper message. | `rg '#\[error\("[A-Z]' src/` (allowing an acronym allowlist) and `rg '#\[error\(".*[.!]"\)\]' src/` both empty; `rg '\.context\(' src/ \| rg -i '"(error\|failed)'` empty. | MUST |
| ERR-06 | A variant's `Display` says only what `source()` does not. Do not interpolate the source's text *and* return it from `source()`. | "Double reporting" — the same sentence appears twice whenever a reporter walks the chain. Named anti-pattern with real clap/handlebars regressions. | Read every `#[error("…: {source}")]` / `#[error("…: {0}")]` that also has `#[source]` — that shape is the violation; drop the interpolation. | MUST |
| ERR-07 | Use `#[from]` only when the variant needs nothing beyond the source error. The moment a path, URL, digest or identifier matters, write an explicit named-field variant and `map_err` it in. | A `#[from]` field can hold only the source by construction; taking it anyway means the call-site context is dropped. | Review: for each `#[from] io::Error`-shaped variant, ask whether the message can name *which* file/URL. If not, it is under-specified. | MUST |
| ERR-08 | Keep `Err` payloads small; box anything that pushes the enum past 128 bytes. | `Result<T, E>` is sized to its largest variant in *every* frame it propagates through, including the `Ok` path. | `cargo clippy --workspace --all-targets -- -D clippy::result_large_err`. | SHOULD |
| ERR-09 | `[lints.clippy]` sets `unwrap_used`, `expect_used` and `panic` to at least `warn` for non-test code, with `allow-unwrap-in-tests`/`allow-expect-in-tests` in `clippy.toml`. | All three are restriction-group and **allow-by-default** — a clean clippy run proves nothing about panic policy without them. | `rg -A8 '\[lints\.clippy\]' Cargo.toml` shows all three names; then `cargo clippy --workspace --all-targets -- -D warnings`. | MUST |
| ERR-10 | An `expect` message states the invariant that guarantees success, never the failure. Prefer `expect` over `unwrap` in production code. | `expect("parse failed")` adds nothing over `unwrap()`; `expect("hardcoded IP address is valid")` tells the next reader why the panic is unreachable. | `rg '\.expect\("' src/` and reject any message starting with a failure verb (`failed`, `could not`, `error`). | MUST |
| ERR-11 | `main` returns `std::process::ExitCode`. `std::process::exit` never appears in library code, and in `main` only as the terminal statement. | `process::exit` skips destructors on every live stack — lockfile release, temp-dir cleanup and buffered-writer flushes are silently dropped. | `rg -n 'process::exit' src/` — every hit must be the last statement of a `main`. | MUST |
| ERR-12 | One `#[repr(u8)] #[non_exhaustive] ExitCode` enum per workspace, sysexits-aligned (64/65/69/74/75/77/78), tool-specific codes in 79–127, with `From<ExitCode> for std::process::ExitCode`. Separate binaries with an ADR-justified separate taxonomy are the only carve-out. | Scripts and CI branch on failure class without parsing stderr; drift between binaries in one workspace breaks shared error handling. | `rg -n 'ExitCode::from\([0-9]' src/` empty (no hard-coded numerics at call sites); one `enum ExitCode` definition per workspace. | MUST |
| ERR-13 | Derive the exit code from the error's *structure* — an exhaustive `match`, or a `ClassifyExitCode`-style trait walked over the chain. Never from `Display` text. | Wording changes; taxonomy must not. Either mechanism is fine (see Conflict 2); string matching is not. | `rg 'to_string\(\).*contains\|Display.*match' src/cli/` at the classification site must return nothing. | MUST |
| ERR-14 | Classification matches are exhaustive — no `_ => Failure` wildcard. If unclassified variants should fall through to `Failure`, list them explicitly and lock the choice with a test. | A wildcard means a new error variant ships silently mis-classified; an exhaustive match makes it a compile error. | Read the `classify*` fns for `_ =>` arms; each existing fall-through needs a test pinning it. | SHOULD |
| ERR-15 | Never assign 101, or any code ≥ 128, to a modeled error path. | 101 is Rust's panic signal and 128+N is signal-derived; reusing either breaks "101 means file a bug" for monitoring. Forwarding a *child's* `128 + signum` status is the sole exception. | `rg -n 'ExitCode::from\(101\|process::exit\(101\|= 101' src/` empty outside panic-hook code. | MUST |
| ERR-16 | Sanitize the rendered error chain for terminal control, `\r`, NUL and bidi (`Cf`) characters at the single stderr boundary, before printing. Pin the call with a structural test that reads `main.rs`'s own source. | CWE-150: chains quote package names, tags and paths read off wire documents and filesystem walks; `tracing-subscriber` passes those bytes straight through. The failure mode is a *missing call*, which no behavioural assertion catches. | `rg -n 'writeln!\(io::stderr\|eprintln!' src/main.rs` — each must route through the sanitizer; a same-file test greps for it. | MUST |
| ERR-17 | Credentials are `secrecy::SecretString`, never `String`. Any URL or path sourced from auth-bearing config is scrubbed of userinfo and query string before it is interpolated into an error message. | Redaction by construction beats remembering it at each `{:?}`; a signed URL in `error: failed to fetch {url}` leaks the token into CI logs. | `rg -n 'token\|credential\|api_key\|bearer\|password' src/ --type rust` cross-checked against the field type; any bare `String` is a candidate leak. | MUST |
| ERR-18 | A function that returns `Result` does not also log the error it returns. Log once, at the point that stops propagating it. | Logging *and* returning duplicates the report once per layer; one failure becomes N log lines with no added information. | Scan functions returning `Result` for a `tracing::error!`/`warn!` immediately preceding a `return Err`/`?` on the same value. | MUST |
| ERR-19 | No silent swallowing. `let _ = result`, `.ok()`, and `unwrap_or_default()` on a `Result` each require a comment naming why the error is genuinely discardable. | These are indistinguishable from a forgotten error path at review time; the comment is the only signal of intent. | `rg -n 'let _ = \|\.ok\(\);\|unwrap_or_default\(\)' src/` and confirm an adjacent rationale comment. | MUST |
| ERR-20 | Print errors with the alternate format `{err:#}`, never `{err}`. | `{err}` shows only the top message; the whole point of `#[source]` chaining is lost at the print site. | `rg -n '\{err\}\|\{e\}' src/main.rs src/cli/` — the top-level print must use `{err:#}`. | SHOULD |
| ERR-21 | A batch operation over N targets collects `Vec<(Target, Error)>` and reports a "K of N failed" summary with per-item detail; it does not `?` out at the first failure. | Matches cargo's "aborting due to N previous errors"; independent failures should not force a fix-one-rerun loop. | Read loops over packages/targets: a bare `?` inside the loop body is the violation. | SHOULD |
| ERR-22 | Public fallible functions in the library surface carry a `# Errors` doc section; public functions that can panic carry `# Panics`. | Callers — and agents reading the crate — cannot discover failure modes from a signature alone. | `cargo clippy --workspace -- -W clippy::missing_errors_doc -W clippy::missing_panics_doc`. | SHOULD |
| ERR-23 | `catch_unwind` appears only at an FFI boundary or a documented supervised-worker boundary. Never around `main`, never as control flow. | Unwinding across FFI is UB; converting a panic to ordinary error text hides a broken invariant from the user, from CI and from anything watching for exit 101. | `rg -n 'catch_unwind' src/` — each hit must be adjacent to an `extern "C"` boundary or a worker-supervision comment. | MUST |
| ERR-24 | A poisoned `Mutex` is propagated (`.expect("<invariant>")`) or explicitly recovered via `into_inner()`/`clear_poison()`. Never downgrade a poison to a default value. | Poisoning is advisory but it means a thread already panicked mid-mutation; returning a default masks real corruption. | `rg -n '\.lock\(\)' src/` — any `else`/`unwrap_or` branch returning a default is the violation. | SHOULD |
| ERR-25 | Do not add `eyre`, `color-eyre`, `miette`, `ariadne`, `snafu` or `error-stack`. Rich source-span diagnostics require actual byte ranges into user-authored text. | Span machinery is a real dependency and real complexity that pays only when there is a source file to point into; `#[derive(Diagnostic)]` with no `#[label]` is a fancier `thiserror` for zero benefit. | `rg -n 'miette\|eyre\|snafu\|error-stack\|ariadne' Cargo.toml` empty. | SHOULD |

## Applied to OCX

Evidence below is cited from the local audits:
[errors-async-security.md](ocx-codebase-audit/errors-async-security.md),
[exit-codes-and-cli.md](ocx-codebase-audit/exit-codes-and-cli.md),
[rules-inventory.md](ocx-codebase-audit/rules-inventory.md).

**Already satisfied**

- **ERR-01** — ocx_lib, ocx_cli, ocx_schema, ocx_shim, grimoire and ocx_python all use
  `thiserror` 2.0.18 for domain errors with `anyhow` reserved for the CLI boundary
  (`ocx_cli/src/main.rs:18`; grimoire's `app::run` return type). ocx_lib carries 15
  per-subsystem `error.rs` files. `ocx_lib/src/oci/ssrf.rs:38-68` is the reference shape.
- **ERR-02** — 82 `#[non_exhaustive]` hits in ocx_lib, 66 in grimoire.
- **ERR-03** — `#[source]`/`#[from]` at 114/43 in ocx_lib and 45/23 in grimoire.
- **ERR-09** — grimoire only: `grimoire/Cargo.toml:79` sets `unsafe_code = "forbid"` plus
  `unwrap_used`/`expect_used = "warn"` scoped to non-test code, and its production counts
  match (9 unwrap, 22 expect across 199 files).
- **ERR-11/ERR-12** — both `ocx_cli/src/main.rs` and `grimoire/src/main.rs` return
  `ExitCode`; a single sysexits-aligned enum (`ocx_lib/src/cli/exit_code.rs`,
  `grimoire/src/cli/exit_code.rs`) with codes 0/1/64/65/69/74/75/77/78/79/80/81 identical
  across ocx, grimoire and ocx-mirror.
- **ERR-13** — ocx via `ClassifyExitCode` (`ocx_lib/src/cli/classify.rs:44`), grimoire via a
  free `classify()` (`grimoire/src/error.rs:177`). No string matching in either.
- **ERR-15** — the only 128+ codes produced are forwarded child statuses
  (`ocx_lib/src/utility/child_process.rs:35-50`, `script/ocx_module.rs:245`), which is the
  sanctioned exception.
- **ERR-16** — ocx only: `ocx_cli/src/main.rs:20-27` routes the chain through
  `api::data::sanitize_for_terminal` (`ocx_cli/src/api/data.rs:164`) with an explicit CWE-150
  comment, pinned by a structural regression test at `ocx_cli/src/main.rs:39-60`.
- **ERR-17** — `secrecy` in 2 ocx_lib files and 6 grimoire files; a targeted grep found
  **zero** token/password values flowing into `log`/`tracing` macros across ocx_lib and
  grimoire.
- **ERR-18/ERR-20** — both binaries converge on one boundary and print `{err:#}` once.
- **ERR-23** — no `catch_unwind` around `main` in any of the three codebases.
- **ERR-24** — `std::sync::Mutex` is the house lock (17 ocx_lib / 21 grimoire / 8
  ocx-mirror; zero `tokio::sync::Mutex` anywhere) and no default-on-poison branch was found,
  though the audit notes the guard-across-`.await` check was not exhaustive.
- **ERR-25** — no `snafu`/`miette`/`eyre` anywhere in any of the three codebases.

**Violated**

- **ERR-16 — grimoire.** `grimoire/src/main.rs:191` writes `{err:#}` straight to
  `io::stderr()` with no sanitizer, while grimoire's chains quote skill/package identifiers
  pulled from a registry — the identical threat model ocx explicitly defends against.
  Ranked **HIGH**, the top finding of the local audit. `sanitize_for_terminal`-style helpers
  exist in grimoire but only inside TUI code (`tui/bundle_members.rs`, `tui/tree.rs`).
- **ERR-01/02/03 — `ocx-mirror/src`.** Zero `thiserror` derives, zero `#[source]`/`#[from]`,
  only 4 `#[non_exhaustive]`; `anyhow::Error`/`anyhow!()` used throughout library-shaped
  `pipeline/` and `command/` modules (15 hits across 10 files). No typed domain error enum
  exists, so `ClassifyExitCode`-style mapping is impossible there.
- **ERR-11/ERR-12 — `ocx_schema`.** `ocx_schema/src/main.rs:15` calls raw
  `process::exit(1)` for an unknown `schema_for()` argument — a usage error that should be
  `UsageError` (64). The binary does not use `ocx_lib::cli::ExitCode` at all.
- **ERR-09 — the ocx workspace.** No `[lints.clippy]` gate on `unwrap_used`/`expect_used`/
  `panic`. Discipline is by convention only: 11 production `unwrap` and 78 production
  `expect` in ocx_lib, 1/18 in ocx_cli. Turning the lints on will surface all of them.
- **ERR-14 — both.** `ocx_lib/src/cli/classify.rs:67` and `grimoire/src/error.rs:221` both
  fall through to `Failure`; the shipped exit-code rule already lists the wildcard arm as a
  *Suggest*-tier anti-pattern and it is unaddressed.
- **ERR-06 — the shipped three-layer pattern.** The documented example in
  `quality-rust-errors.md` uses `#[error("{0}")] PackageManager(PackageError)` with no
  `#[source]` — which renders the inner text *and* truncates the chain, the exact shape
  ERR-03 and ERR-06 forbid. `#[error(transparent)]` is the correct spelling.

**New commitments** (nothing in the codebases enforces these yet)

- **ERR-08** `result_large_err` is not in any lint table in any of the three repos.
- **ERR-21** batch collect-all-failures: no evidence either way in the audit; adopt for
  multi-package install/publish loops.
- **ERR-22** `# Errors`/`# Panics` doc sections: `missing_errors_doc` is pedantic and not
  currently enabled anywhere.
- **ERR-05** applied to `anyhow` context strings: this is a change from the shipped rule,
  which permits sentence-case there.
- **ERR-13** the shipped rule must be rewritten to bless the trait mechanism (Conflict 2);
  today ocx's production code is a documented Block-tier violation of its own rule.

## AI-agent failure modes

Ranked by how often each bites, merging both sub-artifacts.

1. **`.unwrap()`/`.expect()` left in as "temporary" handling that ships.** Agents write
   working code with `unwrap` during iteration and never circle back, especially in paths
   that "obviously can't fail" — file I/O, network, parsing. Compounded by #2.
   *Check:* `cargo clippy -- -W clippy::unwrap_used -W clippy::expect_used`, non-test scope.
2. **Treating a clean `cargo clippy` as proof of panic-policy compliance.** `unwrap_used`,
   `expect_used` and `panic` are restriction-group and allow-by-default — they are not in
   `clippy::all` or `pedantic`. An agent that "ran clippy and it was clean" has verified
   nothing here unless the `[lints]` table turns them on.
   *Check:* read the manifest before trusting the exit code.
3. **Capitalized / punctuated `#[error("…")]` strings.** An LLM trained on generic
   good-error-message advice writes `#[error("Failed to read the file.")]`, which violates
   C-GOOD-ERR and double-capitalizes once the CLI prepends `error: `.
   *Check:* `rg '#\[error\("[A-Z]' src/`.
4. **Reaching for `anyhow` inside library-shaped code "for convenience."** Compiles, looks
   idiomatic, and infects the whole call chain — the exact state `ocx-mirror/src` is in.
   *Check:* `rg 'anyhow' src/` outside `main.rs`/`app.rs`.
5. **`map_err(|e| MyError::X(e.to_string()))`.** The most common way an agent destroys a
   source chain while appearing to handle the error properly.
6. **Dropping context instead of restructuring the variant.** Asked to "include the file
   path in the error," an agent that cannot make `#[from]` carry a sibling field silently
   settles for a bare `#[from] io::Error` rather than writing an explicit named-field
   variant. The diff looks like it did the work.
   *Check:* did the task that asked for a path actually add a path field?
7. **`std::process::exit()` mid-`main` "to fail fast."** Natural for a model optimizing for
   the shortest code that produces the right code; silently drops all pending cleanup.
   *Check:* `rg -n 'process::exit' src/`.
8. **Logging the error and then also returning it.** A model taught "always log errors for
   observability" adds `tracing::error!` at every layer that also propagates with `?`.
9. **Hallucinating `std::error::Error::provide()` as stable.** It is nightly-only
   (`error_generic_member_access`, [#99301](https://github.com/rust-lang/rust/issues/99301))
   as of Aug 2026, as is `thiserror`'s `#[backtrace]` attribute which is built on it.
   *Check:* `cargo build` on the pinned stable toolchain; flag any
   `#![feature(error_generic_member_access)]`.
10. **Hallucinated `anyhow`/`miette` API surface** — inventing `.context_with()` or a
    non-existent derive attribute. Fails `cargo build`, so it is cheap, but never trust the
    diff without a compile.
11. **Debug-printing a credential-bearing struct** (`format!("failed auth: {config:?}")`
    where a token is a bare `String`). Models do not reliably distinguish safe-to-debug from
    secret-bearing structs unless the *type* enforces it — which is why ERR-17 is about the
    type, not the call site.
12. **Reaching for `miette` "because rich diagnostics are good practice"** — a `Diagnostic`
    derive with no `#[source_code]`/`#[label]` is dependency weight bought for nothing.
13. **Exhaustive `match` on a `#[non_exhaustive]` foreign error enum.** Compiles today,
    breaks on the next dependency bump — precisely what the attribute exists to prevent.

## Open questions

1. **Exit code 77 and 81 names.** ocx says `PermissionDenied`/`PolicyBlocked`, grimoire's
   code says `NoPermission`/`OfflineBlocked` — and grimoire's *own rule doc* says
   `PermissionDenied`, so 77 is a doc/code mismatch inside one repo. Recommendation from the
   audit: `PermissionDenied` and `PolicyBlocked` (the latter covers `--frozen` too, which
   `OfflineBlocked` does not). Needs a decision before either name is pinned into a rule.
2. **Exit code 82 (`DirtyRcBlock`, ocx only).** Real, tested, shipped
   (`ocx_lib/src/cli/exit_code.rs:67`) and absent from every doc surface including the
   public website table. Document it, or fold it into 81?
3. **Is grim's JSON error envelope a cross-tool contract?** grimoire emits
   `{"error":{"code":<slug>,"exit":<int>,"message":…,"reason"?,"retryable"?,"forceable"?}}`
   to stdout (`grimoire/src/main.rs:220-265`, `docs/src/json-interface.md`). ocx has a JSON
   path for command *results* but no structured error document. Either ocx adopts the
   envelope and it becomes a rule, or the rule stays scoped to exit codes.
4. **`ocx-mirror/src`: retrofit or accept?** Adding typed errors to `pipeline/` and
   `command/` is real work. Is it a CI tool exempt from the fleet rules, or does it converge?
5. **Grandfathering ERR-09 on the ocx workspace.** Enabling `unwrap_used`/`expect_used`
   immediately flags ~89 existing production sites in ocx_lib alone. Warn-and-backfill, or
   deny with a per-site `#[allow]` sweep first?

## Sub-artifacts

- [rust-error-handling/error-model-and-crates.md](rust-error-handling/error-model-and-crates.md)
  — the thiserror/anyhow/eyre/miette/snafu landscape, error-enum design and granularity,
  `#[from]` vs explicit conversion, error size and boxing, `source()`/`provide()` stability,
  backtraces, the user/environment/bug/upstream taxonomy, panic policy and the exact clippy
  lints that enforce it.
- [rust-error-handling/error-ux-and-diagnostics.md](rust-error-handling/error-ux-and-diagnostics.md)
  — how failures reach humans and machines: message composition, cause-chain rendering,
  C-GOOD-ERR capitalization, actionable `help:` lines, miette/ariadne/codespan-reporting,
  `--format json` conventions, log-vs-return discipline, secret redaction, panic UX, exit
  codes, and partial-failure reporting.

## Key sources

| URL | Why it matters here |
|---|---|
| [Rust API Guidelines — Interoperability (C-GOOD-ERR)](https://rust-lang.github.io/api-guidelines/interoperability.html) | The lowercase / no-trailing-punctuation rule, plus `Send + Sync + 'static` and the no-`()`-error-type guidance. ERR-05. |
| [rust-lang/project-error-handling#27](https://github.com/rust-lang/project-error-handling/issues/27) | Names the "double reporting" anti-pattern with real clap/handlebars regressions. ERR-06. |
| [thiserror README](https://github.com/dtolnay/thiserror/blob/master/README.md) | Canonical enum example; the `#[from]`-holds-only-the-source constraint behind ERR-07. |
| [anyhow — `Context` trait docs](https://docs.rs/anyhow/latest/anyhow/trait.Context.html) | `.context()` eager vs `.with_context()` lazy; how the chain surfaces through `source()`. |
| [std::error::Error trait docs](https://doc.rust-lang.org/std/error/trait.Error.html) | `source()` stable since 1.30; `provide()` still nightly; `description()`/`cause()` deprecated. Failure mode 9. |
| [Rust tracking issue #99301 — `error_generic_member_access`](https://github.com/rust-lang/rust/issues/99301) | Proof that `provide()` and `thiserror`'s `#[backtrace]` are not available on stable as of Aug 2026. |
| [clippy source — `unwrap_used`/`expect_used`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/methods/mod.rs) | Verbatim confirmation that both are restriction-group and allow-by-default. ERR-09, failure mode 2. |
| [clippy source — `result_large_err`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/functions/mod.rs) | The 128-byte default and the before/after boxing example. ERR-08. |
| [Cargo manifest reference — `[lints]`](https://doc.rust-lang.org/cargo/reference/manifest.html#the-lints-section) | Exact TOML syntax for workspace-wide lint config. ERR-09. |
| [std::process::exit docs](https://doc.rust-lang.org/std/process/fn.exit.html) | States that destructors on every live stack are skipped. ERR-11. |
| [rust-cli book — Exit codes](https://rust-cli.github.io/book/in-depth/exit-code.html) | sysexits-derived codes over a flat 0/1; why 101 is Rust's panic code. ERR-12, ERR-15. |
| [Rustonomicon — Unwinding](https://doc.rust-lang.org/nomicon/unwinding.html) | FFI-unwinding UB, the legitimate `catch_unwind` boundary, unwind cost model. ERR-23. |
| [Rust Book ch. 9.3 — To panic! or Not to panic!](https://doc.rust-lang.org/book/ch09-03-to-panic-or-not-to-panic.html) | The panic-vs-`Result` framework and the `expect`-states-the-invariant convention. ERR-10. |
| [std::sync::Mutex docs](https://doc.rust-lang.org/std/sync/struct.Mutex.html) | Poisoning is advisory; `into_inner()` / `clear_poison()` (1.77+). ERR-24. |
| [miette docs](https://docs.rs/miette/latest/miette/) | What the span/label machinery actually buys — the bar ERR-25 says these tools do not clear. |
| [rustc-dev-guide — Errors and Lints](https://rustc-dev-guide.rust-lang.org/diagnostics.html) | The `error:`/`note:`/`help:` lowercase, unpunctuated, matter-of-fact house style. ERR-05. |
