---
title: Error UX and Diagnostics for Rust CLIs
topic: User-facing error UX and diagnostics
agent: rust-error-ux-researcher
model: sonnet
date_researched: 2026-08
sources_count: 19
scope: >
  Covers how Rust CLI tools should present failures to humans (message composition,
  cause chains, capitalisation, hints) and to machines (JSON error output, exit codes,
  cargo's JSON diagnostics as a model), rich source-span diagnostics (miette/ariadne/
  codespan-reporting), panic UX (human-panic, exit code 101), error-reporting discipline
  (log-vs-return, redaction), and partial-failure/aggregate-error reporting. Does NOT
  cover general Result/Option combinator style, async error propagation internals, or
  library-vs-application error-type design beyond what bears on user-visible output
  (that belongs in the error-type-architecture subarea).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Top-level error line composition](#1-top-level-error-line-composition)
   2. [Cause chains: when to print, when to collapse](#2-cause-chains-when-to-print-when-to-collapse)
   3. [Capitalisation, punctuation, and the no-trailing-period rule](#3-capitalisation-punctuation-and-the-no-trailing-period-rule)
   4. [Actionable hints and "did you mean"](#4-actionable-hints-and-did-you-mean)
   5. [Rich diagnostics: miette, ariadne, codespan-reporting](#5-rich-diagnostics-miette-ariadne-codespan-reporting)
   6. [Machine-readable errors and `--format json`](#6-machine-readable-errors-and---format-json)
   7. [Log-vs-return discipline and double reporting](#7-log-vs-return-discipline-and-double-reporting)
   8. [Redaction: secrets, tokens, paths, URLs](#8-redaction-secrets-tokens-paths-urls)
   9. [Panic UX](#9-panic-ux)
   10. [Exit codes](#10-exit-codes)
   11. [Retry and partial-failure UX](#11-retry-and-partial-failure-ux)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- The `Display` text of a Rust error type must be lowercase with no trailing punctuation, per [C-GOOD-ERR in the Rust API Guidelines](https://rust-lang.github.io/api-guidelines/interoperability.html) — this is the single most load-bearing style rule and it is checkable by eye or grep.
- A CLI's top-level printed line is conventionally `error: <lowercase message>`, matching rustc's own diagnostic style ([rustc-dev-guide](https://rustc-dev-guide.rust-lang.org/diagnostics.html), [rust-cli book](https://rust-cli.github.io/book/in-depth/human-communication.html)) — capitalize/punctuate only at this outermost print site, never inside the error type itself.
- `anyhow::Context` is the idiomatic way to attach human-facing context to a `Result` without discarding the underlying cause; printing `{:#}` or matching on `.chain()` renders the full "Caused by:" list ([rust-cli book errors chapter](https://rust-cli.github.io/book/tutorial/errors.html), [anyhow docs](https://docs.rs/anyhow/latest/anyhow/trait.Context.html)).
- Never stack context messages that repeat the word "error" or "failed to" at every layer — each `.context()` call should add new information, not restate the layer below, or you get the classic "Error: Error: Error:" pileup.
- `thiserror` is for library error *types* (structured, `#[error("...")]`, `#[from]`, `#[source]`); `anyhow` is for application-level propagation where callers don't need to match on variants; this library-vs-application split is the accepted convention as of the 2026 anyhow/thiserror ecosystem ([anyhow context](https://docs.rs/anyhow/latest/anyhow/trait.Context.html), [thiserror docs](https://docs.rs/thiserror/latest/thiserror/)).
- `miette` earns its dependency weight only when a CLI needs compiler-like output — labelled source spans, `#[diagnostic(code(...), help(...), url(...))]` — not for plain "file not found" style errors; it is a superset of what thiserror/anyhow give you, at real added complexity ([miette docs](https://docs.rs/miette/latest/miette/)).
- `ariadne` and `codespan-reporting` are lower-level, source-span-only renderers (no error-type derive machinery); use one of these instead of miette when you're building a report/render pipeline by hand rather than deriving from an error enum ([ariadne](https://docs.rs/ariadne/latest/ariadne/), [codespan-reporting](https://docs.rs/codespan-reporting/latest/codespan_reporting/)).
- `cargo --message-format=json` with the `json-render-diagnostics` directive is the reference model for machine-readable diagnostics: one JSON object per line, a stable `reason`/`type` discriminant field, and a `rendered` field carrying the human-readable text for tools that want both ([Cargo Book: External Tools](https://doc.rust-lang.org/cargo/reference/external-tools.html)).
- ripgrep's `--json` mode uses the same "one JSON object per line with a `type` discriminant" shape (`begin`/`match`/`context`/`end`/`summary`) — this pattern, not a single big JSON blob, is what real Rust CLIs converge on for streaming machine output ([ripgrep guide](https://iepathos.github.io/ripgrep/troubleshooting/errors/)).
- Do not log an error and then also return/propagate it up the call stack — log once, at the boundary where it's finally handled or discarded, or you get duplicate stack traces for one failure (general logging discipline, applies directly to Rust's `tracing`/`log` + `Result` combination).
- `SecretString`/`SecretVec` from the `secrecy` crate redact their contents from `Debug` by default and require an explicit `ExposeSecret::expose_secret()` call to read the value — this is the mechanical way to stop a token from ending up in an error message or log line by accident.
- `human-panic` replaces the default Rust panic output with a friendly message plus a generated crash-report file, hiding the raw backtrace from end users while still capturing it for a bug report ([human-panic repo](https://github.com/rust-cli/human-panic)).
- A panic exits with code 101 by default because Rust's panic runtime calls the process-abort path after unwinding; this is *not* a normal error exit code and should not be reused for expected failures ([rust-cli book: exit codes](https://rust-cli.github.io/book/in-depth/exit-code.html), community discussion on 101).
- Prefer returning `ExitCode`/`Result` from `main()` over calling `std::process::exit()` directly — `process::exit` skips destructors on every live stack, so any cleanup (temp files, lockfile release, flushed writers) is silently dropped ([`std::process::exit` docs](https://doc.rust-lang.org/std/process/fn.exit.html)).
- Use domain-appropriate exit codes (the `exitcode` crate's BSD `sysexits.h`-derived constants — `CONFIG`, `DATAERR`, `NOINPUT`, `IOERR`, etc.) instead of a flat 0/1, so scripts and CI can branch on failure class ([rust-cli book: exit codes](https://rust-cli.github.io/book/in-depth/exit-code.html)).
- clap's built-in "did you mean" suggestion engine (`InvalidSubcommand` vs `UnrecognizedSubcommand`, similarity-threshold based) is the reference implementation for typo-correction hints in a Rust CLI — reuse it rather than hand-rolling Levenshtein matching ([clap docs.rs error module](https://docs.rs/clap/latest/clap/error/enum.ErrorKind.html)).
- clippy's `missing_errors_doc` lint enforces an `# Errors` section on every public `fn` returning `Result`; `result_large_err` flags oversized `Err` variants that bloat the `Ok` path — both are mechanical, CI-enforceable checks for error-surface hygiene.
- Multi-target failure reporting (cargo's "error: aborting due to N previous errors", or a batch operation reporting "3 of 12 packages failed") should collect all failures before reporting rather than stopping at the first — report a count plus a per-item summary, and reserve the fully-detailed chain for `-v`/`--verbose` or a `--format json` array.
- uv's resolver errors pair a plain description of the unsatisfiable constraint with an explicit `help:` line offering the escape hatch (e.g. `--frozen`) — the two-line "what failed" / "help: what you can do" shape is a good minimum bar for actionable CLI errors.
- The community has NOT converged on printing full cause chains by default vs. only with `-v`: cargo/rustc print full chains by default because they're compiler-adjacent tools; general CLIs increasingly hide the chain behind `RUST_BACKTRACE`-style verbosity flags to keep top-level output short — treat this as a per-tool product decision, not a settled rule (see Contested section).

## Findings

### 1. Top-level error line composition

rustc and the tools built in its image print errors as `error: <lowercase message>`, with optional `note:`/`help:` follow-up lines, and this has become the de facto shape for Rust CLI errors generally. The [rustc-dev-guide diagnostics chapter](https://rustc-dev-guide.rust-lang.org/diagnostics.html) states error/warning/note/help text "start with a lowercase letter and do not end with punctuation," and should be "matter of fact" — terse unless multiple sentences are genuinely needed.

The [rust-cli book](https://rust-cli.github.io/book/in-depth/human-communication.html) gives the same shape for an application-level error:

```
error: could not find `Cargo.toml` in `/home/you/project/`
```

Correct vs incorrect composition:

```rust
// correct: one lowercase clause, no trailing period, contextualized
eprintln!("error: could not read config file `{}`", path.display());

// incorrect: capitalized, punctuated, and vague
eprintln!("Error: Something went wrong.");
```

Key rule: capitalisation/punctuation policy applies at the *print site* (the outermost `eprintln!`/report renderer), not inside the `Display` impl of the error type itself — the error type's `Display` should already be lowercase and unpunctuated per C-GOOD-ERR (§3), so the print site's job is only to prepend the `error: ` prefix, not to reformat the message.

### 2. Cause chains: when to print, when to collapse

`anyhow::Context` is the standard way to layer human context onto a `Result` while retaining the original error as `source()`:

```rust
use anyhow::{Context, Result};

fn load(path: &Path) -> Result<String> {
    std::fs::read_to_string(path)
        .with_context(|| format!("could not read file `{}`", path.display()))
}
```

Printed with anyhow's default `Display`, this yields ([rust-cli book](https://rust-cli.github.io/book/tutorial/errors.html)):

```
Error: could not read file `test.txt`

Caused by:
    No such file or directory (os error 2)
```

To render the *entire* chain rather than anyhow's default (which shows only the top message plus, in `main`'s `Debug`-based reporting, the chain), use the alternate formatter `{:#}` or walk `err.chain()` explicitly:

```rust
// full chain, one cause per line
err.chain().skip(1).for_each(|cause| eprintln!("because: {cause}"));
```

Anti-pattern — "Error: Error: Error:" — happens when every layer's `.context()` string itself starts with "Error" or repeats "failed to" redundantly:

```rust
// wrong: each layer restates "error"/"failed", chain becomes noise
.context("Error reading file")?      // called from
.context("Error: could not load")?   // called from
.context("Error in main")?

// right: each layer adds new information, no layer says "error"
.context(format!("could not read file `{}`", path.display()))?
.context("loading configuration")?
```

The convention (documented informally, applied consistently by anyhow-based CLIs) is: exactly one `Error:` / `error:` prefix at the final print site; every layer below it is a plain noun phrase describing *what was being attempted*, not restating that something failed.

### 3. Capitalisation, punctuation, and the no-trailing-period rule

This is codified as guideline **C-GOOD-ERR** in the [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/interoperability.html):

> "The error message given by the `Display` representation of an error type should be lowercase without trailing punctuation, and typically concise."

The same page notes `Error::description()` is deprecated in favour of `Display`, that error types should be `Send + Sync + 'static` so they compose with other error-handling crates, and that using `()` as an error type is an anti-pattern — always define a real (even trivial) error type.

The underlying rationale, per the [rustc-dev-guide](https://rustc-dev-guide.rust-lang.org/diagnostics.html): a `Display` string is meant to be embeddable — printed standalone, or interpolated into a wrapper message (`"error: {err}"`, `"failed: {err}"`) — and a leading capital or trailing period breaks that composability the moment the string is nested inside another sentence.

### 4. Actionable hints and "did you mean"

clap ships a built-in typo-suggestion engine for both subcommands and long-flag names. Per [clap's `ErrorKind` docs](https://docs.rs/clap/latest/clap/error/enum.ErrorKind.html), an unrecognized subcommand that's *similar enough* to a real one (similarity threshold, `suggestions` cargo feature) produces `InvalidSubcommand` with a `tip:` line:

```
error: unrecognized subcommand 'subcm'

tip: a similar subcommand exists: 'subcmd'
```

Below the threshold, or with the `suggestions` feature disabled, clap falls back to the plain `UnrecognizedSubcommand`/`UnknownArgument` error with no suggestion. Because this ships in clap itself, hand-rolling Levenshtein-distance suggestion logic for a clap-based CLI is redundant — the mechanism to reach for is clap's own feature flag, not a bespoke implementation.

uv's resolver errors follow a similar two-part shape: state what failed, then a `help:` line naming the escape hatch, e.g. pointing the user at `--frozen` when a version constraint can't be satisfied. The generalizable rule: an actionable CLI error has (1) what failed, in concrete terms (which file/package/flag), and (2) what the user can do about it, on a separate `help:`/`tip:` line — not folded into the same sentence.

### 5. Rich diagnostics: miette, ariadne, codespan-reporting

**miette** ([docs.rs/miette](https://docs.rs/miette/latest/miette/)) is a `Diagnostic` trait plus derive macro that layers compiler-style rendering on top of an error type:

```rust
#[derive(thiserror::Error, Debug, miette::Diagnostic)]
#[error("oops!")]
#[diagnostic(
    code(oops::my::bad),
    url(docsrs),
    help("try doing it better next time?")
)]
struct MyBad {
    #[source_code]
    src: miette::NamedSource<String>,
    #[label("this bit here")]
    bad_bit: miette::SourceSpan,
}
```

It integrates with `thiserror` (attach `Diagnostic` alongside `Error`) and offers an `anyhow`-like generic `Report` for ad-hoc use in application code. The "fancy" rendering (ANSI/Unicode boxes, colored underlines, terminal hyperlinks for `code()`, screen-reader/braille fallback when `NO_COLOR` is set) is feature-gated (`--features fancy`) specifically so libraries don't force the heavy renderer on downstream binaries.

**When it's justified**: a CLI that parses a user-authored source file — config, manifest, template, query language, lockfile — and needs to point at *which byte range* is wrong. Below that bar (a missing file, a failed HTTP request, an invalid CLI flag) miette's span machinery is pure overhead; plain `anyhow`/`thiserror` plus a `help:` line covers it more cheaply.

**ariadne** ([docs.rs/ariadne](https://docs.rs/ariadne/latest/ariadne/)) and **codespan-reporting** ([docs.rs/codespan-reporting](https://docs.rs/codespan-reporting/latest/codespan_reporting/)) are the lower-level alternative: they render `Report`/`Diagnostic` + `Label`/span data structures you build by hand, with no derive macro and no coupling to `std::error::Error`. Reach for one of these instead of miette when the diagnostics come from a parser/interpreter pipeline that already has its own span/AST types and doesn't want an error-type-shaped API forced on top — miette derives *from an error enum*, ariadne/codespan-reporting render *diagnostics you construct directly*. codespan-reporting predates the ariadne/miette ecosystem and is the one most similar to rustc's own internal diagnostic renderer.

### 6. Machine-readable errors and `--format json`

Cargo's `--message-format=json` is the reference design in the Rust ecosystem ([Cargo Book: External Tools](https://doc.rust-lang.org/cargo/reference/external-tools.html)):

- Comma-separated directives: `json`, `json-diagnostic-short`, `json-diagnostic-rendered-ansi`, `json-render-diagnostics`.
- `json-render-diagnostics` tells Cargo to render rustc's diagnostics itself and only emit JSON for artifact/build-script messages — i.e., there's an explicit switch between "let the human-readable renderer own diagnostics" and "put everything in JSON."
- Every message object carries enough structure for a consuming tool to skip fields it doesn't understand; Cargo's own schema convention is kebab-case field names, omit-if-default (`#[serde(skip_serializing_if = "Default::default")]`) to keep messages small.

ripgrep's `--json` mode is the streaming-output reference model ([ripgrep guide](https://iepathos.github.io/ripgrep/troubleshooting/errors/)): one JSON object per line, a `"type"` discriminant (`begin`, `match`, `context`, `end`, `summary`), so a consumer can `jq` or line-split without buffering the whole output. Crucially, ripgrep's ordinary stderr error messages (e.g. a permission-denied file) are *not* part of the JSON stream by default and can corrupt naive JSON parsing downstream — the documented fix is `--no-messages`, which suppresses file-access error text (but not pattern-syntax errors) so JSON consumers get a clean stream. The transferable lesson: a `--format json` mode must route *all* diagnostic output (including partial-failure warnings) through the same structured channel, or document precisely which category of message bypasses it.

For a Grimoire/ocx-style CLI, the pattern to copy is: (1) one JSON object per top-level event, newline-delimited, not a single array wrapping the whole run; (2) a stable `type`/`reason` field every consumer switches on; (3) a `--format json` flag that is complete — no error class silently escapes to plain-text stderr once JSON mode is selected.

### 7. Log-vs-return discipline and double reporting

The general logging anti-pattern — logging an error at every layer that returns or re-raises it, producing N copies of the same failure in the log — applies directly to Rust code that mixes `tracing`/`log` calls with `?`-propagated `Result`s:

```rust
// wrong: every layer logs AND returns — one failure, N log lines
fn read_config(path: &Path) -> Result<Config> {
    let s = std::fs::read_to_string(path).map_err(|e| {
        tracing::error!("failed to read {path:?}: {e}"); // logged here...
        e
    })?;
    // ...
}
fn load() -> Result<Config> {
    read_config(&path).map_err(|e| {
        tracing::error!("load failed: {e}"); // ...and again here
        e
    })
}

// right: propagate silently with ?, log exactly once at the boundary
fn read_config(path: &Path) -> Result<Config> {
    let s = std::fs::read_to_string(path)?; // no logging, just context
    // ...
}
fn main() -> ExitCode {
    match load() {
        Ok(_) => ExitCode::SUCCESS,
        Err(e) => { eprintln!("error: {e:#}"); ExitCode::FAILURE } // logged once, here
    }
}
```

Rule of thumb: a function that returns `Result` never also logs the error it's returning — logging and returning are two different ways of reporting the same fact, and doing both means every intermediate call site duplicates the report. Log (or print) only at the final point that actually consumes the error instead of propagating it further — `main`, a top-level command handler, or a spot that deliberately downgrades an error to a warning and continues.

### 8. Redaction: secrets, tokens, paths, URLs

The [`secrecy`](https://paritytech.github.io/try-runtime-cli/secrecy/index.html) crate's `SecretString`/`SecretVec<u8>` wrap sensitive values (tokens, passwords, keys) and implement `Debug`/`Display` to print a fixed redaction placeholder rather than the value — the real value is reachable only via `ExposeSecret::expose_secret()`, an explicit, greppable call site. For an OCI registry client (ghcr.io tokens, bearer credentials), wrapping the credential type in `SecretString` at the point it's parsed means any accidental `{:?}` in an error path, a `tracing::debug!`, or a panic payload prints `[REDACTED]` instead of the token, by construction rather than by remembering to redact at every call site.

For paths and URLs that may embed secrets (e.g. a registry URL with an embedded token, or a local path revealing the user's home directory / username), redaction has to be applied explicitly since no crate wraps these generically — the mechanical rule is: any URL or path interpolated into an error message that originated from a credential-bearing config value (registry auth URL, signed URL, `Authorization` header) must be scrubbed of query strings/credentials before being formatted into `Display`, not just before logging.

### 9. Panic UX

[`human-panic`](https://github.com/rust-cli/human-panic) installs a panic hook (`std::panic::set_hook`, invoked once via the `setup_panic!()` macro at the top of `main`) that replaces Rust's default backtrace dump with:

- a short, apologetic human message ("Well, this is embarrassing...");
- a call to action to file a bug, with project homepage/author contact;
- a generated crash-report file path (containing app name/version, OS, panic location, full backtrace) the user can attach to an issue;
- an explicit privacy note that nothing is collected automatically — the user must choose to submit it.

A panic in a CLI signals a *contract violation the program didn't anticipate*, distinct from an expected, handled failure (missing file, bad input) that should be a `Result`/`Error`, not a panic. Because Rust's default panic behaviour terminates the whole process with exit code 101 the instant the panicking thread is `main` (the panic-runtime's abort path after unwinding — see [rust-cli book: exit codes](https://rust-cli.github.io/book/in-depth/exit-code.html) and the community thread on why it's 101 specifically), a CLI's contract is: **101 means "this is a bug, not your fault, file a report,"** and no other exit code should be reused for that meaning. Catching panics with `catch_unwind` at the top of `main` to convert them into a normal `Result`-shaped error is generally discouraged for a CLI's outermost boundary — a panic already means "unexpected internal invariant broken," and downgrading it to a plain error message hides that distinction from the user and from monitoring that greps for exit code 101.

### 10. Exit codes

Two independent rules from the [rust-cli book's exit-code chapter](https://rust-cli.github.io/book/in-depth/exit-code.html):

1. **Prefer `ExitCode`/`Result` from `main` over `std::process::exit`.** [`std::process::exit`'s own docs](https://doc.rust-lang.org/std/process/fn.exit.html) state it terminates immediately without running destructors on the current or any other thread's stack — any `Drop` cleanup (releasing a lockfile, flushing a buffered writer, removing a temp directory) is silently skipped. The recommended pattern is `fn main() -> ExitCode { ... }` or `fn main() -> Result<(), E>`, computing the code from a value rather than calling `exit()` directly; if `exit()` truly must be called, do it from the outermost frame only, after all other cleanup has already run.
2. **Use semantically distinct exit codes, not a flat 0/1.** The `exitcode` crate exposes BSD `sysexits.h`-derived constants (`OK`, `CONFIG`, `DATAERR`, `NOINPUT`, `IOERR`, etc.) so a caller (CI, a wrapper script) can branch on failure *class* rather than parsing stderr text.

```rust
// pattern from the rust-cli book
match run() {
    Ok(()) => ExitCode::from(exitcode::OK as u8),
    Err(Error::CantReadConfig(e)) => {
        eprintln!("error: {e}");
        ExitCode::from(exitcode::CONFIG as u8)
    }
    Err(e) => {
        eprintln!("error: {e}");
        ExitCode::from(exitcode::DATAERR as u8)
    }
}
```

101 is reserved by Rust's own panic machinery (§9) and should never be assigned deliberately to an expected error path.

### 11. Retry and partial-failure UX

Rust's compiler diagnostics are the reference model for "collect everything, then summarize": rustc/cargo do not stop at the first `error[E....]` — they keep compiling as far as possible and finish with `error: aborting due to N previous errors` (or `error: aborting due to previous error` for exactly one), giving the user the full list in one pass instead of a fix-one-rerun loop.

The [`error-stack`](https://docs.rs/error-stack/latest/error_stack/struct.Report.html) crate is purpose-built for this shape at the type level: a single `Report` can carry multiple attached contexts/backtraces representing *related* errors, with `Report::request_ref`/`downcast_ref` letting a consumer recover specific error kinds out of an aggregate. For a simpler need — "N of M targets failed, here's each one" — a plain `Vec<(Target, Error)>` collected across a loop and rendered as a numbered list at the end is sufficient; reach for `error-stack`'s richer aggregation only when downstream code needs to programmatically inspect *which* sub-errors occurred, not just display them.

uv's and cargo's shared convention for multi-target batch operations: report a one-line count summary first ("3 of 12 packages failed to install"), then per-item detail below it (or gated behind `-v`/`--verbose`), rather than interleaving full per-item error chains with progress output — this keeps the top-level signal ("did it work, how much of it") separable from the detail a user needs only when debugging a specific failure.

## Normative guidance candidates

1. **Error `Display` text is lowercase, no trailing punctuation.** Rationale: matches C-GOOD-ERR and lets the string compose inside wrapper messages without producing "Error: Something went wrong." style capitalization clashes. Verify: `grep -rn '#\[error("[A-Z]' src/` and `grep -rn '#\[error(".*[.!]"\)\]' src/` should both return nothing (excluding intentional multi-sentence messages).

2. **Exactly one `error: `/`Error:` prefix per printed failure, at the outermost print site only.** Rationale: prevents the "Error: Error: Error:" pileup from stacking anyhow `.context()` strings that each restate "error"/"failed". Verify: `grep -rn '\.context(' src/ | grep -iE '"(error|failed)'` — any hit is a context string redundantly announcing failure instead of describing the attempted action.

3. **Return `ExitCode` (or `Result`) from `main`, never call `std::process::exit()` except as the very last statement of `main` itself.** Rationale: `process::exit` skips destructors on every live stack frame, silently dropping cleanup (lockfiles, temp files, flushed writers). Verify: `grep -rn 'process::exit' src/` — every hit must be inside `fn main` and be the terminal statement, not inside a library function or a mid-`main` early return.

4. **Use `exitcode`-style distinct exit codes, never a flat `1` for every failure class.** Rationale: lets CI/scripts branch on failure kind (config error vs I/O error vs data error) without parsing stderr. Verify: code review — does the top-level `match` on the outer error type map ≥3 distinct exit codes, or does every arm fall through to the same constant?

5. **Never assign exit code 101 to an expected/handled error path.** Rationale: 101 is Rust's own panic signal; reusing it for ordinary failures breaks the "101 = bug, file a report" convention that monitoring and `human-panic`-style tooling rely on. Verify: `grep -rn '101' src/` for any manual `ExitCode::from(101)` / `process::exit(101)` outside panic-hook code.

6. **A library crate error type implements `std::error::Error` + `Send + Sync + 'static` and is never `()`.** Rationale: composability with `anyhow`/`thiserror`/`?` across crate boundaries requires the trait; `()` as an error type discards all information. Verify: `cargo doc` + eyeball, or a clippy check that every public `fn ... -> Result<_, E>` has `E: std::error::Error`.

7. **Public functions returning `Result` carry an `# Errors` doc section.** Rationale: undocumented failure modes are undiscoverable by callers and by an AI agent reading the crate. Verify: `cargo clippy -- -W clippy::missing_errors_doc` (deny in CI for library crates).

8. **`Err` variants stay small; box large payloads.** Rationale: an oversized `Err` variant inflates every `Result<T, E>` return slot even on the common `Ok` path. Verify: `cargo clippy -- -W clippy::result_large_err`.

9. **No function that returns `Result` also logs the error it's about to return.** Rationale: logging-and-returning double-reports the same failure once per call-stack layer that does it; log exactly once, at the final consumption point. Verify: grep for `tracing::error!`/`log::error!` calls whose enclosing function signature returns `Result` and whose next non-blank line is `return Err`/`?` — a code-reading heuristic, not a mechanical grep, but a fast manual scan.

10. **Secrets (tokens, credentials) are wrapped in a type whose `Debug`/`Display` redact by default (e.g. `secrecy::SecretString`), never a bare `String`.** Rationale: prevents accidental leakage through `{:?}` in an error message, panic payload, or debug log. Verify: `grep -rn 'token\|credential\|api_key\|bearer' src/**/*.rs` cross-checked against the field's declared type — any bare `String`/`&str` field on that grep is a candidate leak.

11. **Any URL or path interpolated into an error message is checked for embedded credentials before formatting.** Rationale: a registry URL or signed URL can carry a token in the query string or userinfo component; printing it verbatim in `error: failed to fetch {url}` leaks it into logs/CI output. Verify: code-reading heuristic — every `Display`/`format!` site that embeds a `Url`/`PathBuf` sourced from an auth-bearing config value must go through a redaction helper, not the raw `Display` impl.

12. **A `--format json` mode is exhaustive: no error class silently falls back to plain-text stderr once selected.** Rationale: modeled on ripgrep's documented pitfall where uncaptured file-access errors corrupt JSON consumers; a partial JSON mode is worse than none because it fails unpredictably downstream. Verify: with `--format json` set, trigger at least one of every top-level error category (bad input, network failure, filesystem failure) and confirm each is a JSON object, not raw stderr text.

13. **`miette`/`ariadne`/`codespan-reporting` are added only when the CLI renders errors against user-authored source text with byte-range spans; otherwise `anyhow`+`thiserror` is sufficient.** Rationale: the span/label machinery is real complexity and a real dependency that pays for itself only when there's a source file to point into. Verify: code review — does any `Diagnostic`/`Report`/`Label` usage exist without a corresponding `SourceSpan`/byte-range pointing into user input? If so, it's dependency weight bought for no benefit.

14. **Panics are not caught with `catch_unwind` at the CLI's top level to convert them into ordinary error output.** Rationale: a panic signals a broken internal invariant, not a handleable failure; downgrading it to normal error text (and a non-101 exit code) hides bugs from both users and monitoring. Verify: `grep -rn 'catch_unwind' src/` — any hit wrapping the whole of `main`'s logic (as opposed to an FFI boundary, which is the legitimate use) is a violation.

15. **Batch/multi-target operations collect all failures and report a "K of N failed" summary rather than stopping at the first error.** Rationale: matches cargo/rustc's "aborting due to N previous errors" model and avoids a fix-one-rerun loop for independent failures. Verify: code-reading — does the loop over targets use `?` (stop-at-first) or accumulate into a `Vec<(Target, Error)>` / similar before reporting?

## AI-agent angle

- **Capitalized/punctuated `#[error("...")]` strings.** An LLM trained on generic "good error message" advice (full sentences, capital letters) will write `#[error("Failed to read the file.")]` — violates C-GOOD-ERR and produces double-capitalized output once the CLI prepends its own `error: ` prefix. Mechanical check: `grep -rn '#\[error("[A-Z]' src/`.

- **`.unwrap()`/`.expect()` left in as "temporary" error handling that ships.** Agents frequently write working code with `.unwrap()` during iteration and don't circle back to convert it to a proper `Result` path, especially in newly-added code paths that "obviously can't fail" (they can — file I/O, network, parsing). Mechanical check: `cargo clippy -- -W clippy::unwrap_used -W clippy::expect_used` scoped to non-test code, or `grep -rn '\.unwrap()\|\.expect(' src/` excluding `tests/`.

- **Hallucinated anyhow/miette API surface.** Models trained on older anyhow/miette snapshots sometimes emit APIs that don't exist in current releases (e.g. inventing a `.context_with()` method, or a miette `Diagnostic` field attribute name that isn't real, or the pre-1.0 `eyre`-flavoured macro spellings). This compiles-and-fails-later only if the crate isn't actually pulled in yet; if it is, it simply fails `cargo build`. Mechanical check: `cargo build` / `cargo check` after any anyhow/miette-touching diff — do not trust the diff without a compile.

- **Calling `std::process::exit()` mid-`main` "to fail fast" instead of returning `ExitCode`.** This is a natural pattern for a model that's optimizing for "shortest code that produces the right exit code" without modeling destructor/cleanup semantics — it silently drops any pending cleanup. Mechanical check: `grep -rn 'process::exit' src/` — any hit outside the final line of `main`, or inside a library function, is the smell.

- **Logging the error and then also returning it (or bubbling it with `?`) from the same function** — a model taught "always log errors for observability" will add `tracing::error!` at every layer that also propagates the error with `?`, producing duplicate log lines per failure. Mechanical check: manual scan of functions returning `Result` for an `error!`/`warn!` call immediately preceding a `return Err`/`?` on the same value.

- **Printing a raw `Debug`-formatted secret or credential-bearing struct into an error message** (`format!("failed auth: {config:?}")` where `config` holds a token as a plain `String`) — models don't reliably distinguish "this struct is safe to debug-print" from "this struct holds a bearer token" unless the type itself enforces it. Mechanical check: grep for `{:?}` / `{config:?}`-style debug interpolation of any struct whose fields include `token`/`secret`/`password`/`credential`/`authorization` by name, and confirm the field type is a redacting wrapper (`SecretString`), not a bare `String`.

- **Reaching for `miette` on every error path "because rich diagnostics are good practice"**, adding a heavyweight dependency and span machinery to a CLI that never renders against user source text (e.g. wrapping a plain "network request failed" error in a `Diagnostic` with no `#[label]`/`SourceSpan` at all). Mechanical check: code review — grep for `#[derive(..., Diagnostic)]` structs with no `#[source_code]`/`#[label]` fields; that's `miette` used as a fancier `thiserror` for zero actual benefit.

## Contested / evolving

- **Whether to print the full cause chain by default, or collapse to the top message and hide the chain behind `-v`.** rustc/cargo-adjacent tools (and anyhow's own default `Debug`-based `main` error rendering) print the chain unconditionally. A growing number of general-purpose CLIs treat the full chain as noise for a typical user and gate it behind `-v`/`RUST_BACKTRACE=1`-style verbosity, showing only the top-level message and a one-line hint by default. As of 2026 there's no single winning convention — treat it as a per-tool UX decision driven by audience (developer-tool audience tends toward "show me everything"; end-user-tool audience tends toward "tell me what to do").

- **`anyhow`/`thiserror` vs `eyre`/`color-eyre` vs `miette`'s own `Report` type as the application-level error wrapper.** All three lineages (anyhow, eyre, miette) solve overlapping problems and the ecosystem has not consolidated on one; miette's own docs note its `Report` is explicitly modeled after eyre/anyhow's, meaning a codebase choosing between them is largely picking a rendering aesthetic (miette's fancy spans vs anyhow's plain chain vs color-eyre's colored chain + `SpanTrace`) rather than a functionally different mechanism. Trend: miette absorbing the "I also want anyhow" use case (via its `Report` type) is relatively recent and reduces the pressure to pull in both anyhow and miette in the same binary.

- **`error-stack` vs a hand-rolled `Vec<Error>`/enum for aggregate/multi-failure reporting.** `error-stack` is a comparatively young, opinionated crate (context-attachment model, its own `Report` type distinct from anyhow's) and has not reached the ecosystem-default status thiserror/anyhow have for the single-error case; for CLIs, a plain `Vec<(Target, Error)>` collected in a loop remains the more common and more easily-reviewed pattern as of 2026. Watch this space rather than mandating `error-stack`.

- **Whether a CLI should ever catch panics at the top level and re-report them as ordinary errors.** The dominant view (human-panic's own design, §9) is no — a panic is categorically different from a handled error and should keep its distinct exit code and crash-report flow. A minority position (mostly in long-running server-adjacent CLI daemons, not one-shot command tools) argues for `catch_unwind` at a request/task boundary to avoid taking the whole process down for one bad input; this is a different problem (isolating a sub-task) from a genuinely single-shot CLI invocation like `grim`/`ocx`, where the distinction rarely applies.

## Sources

| URL | What it is | Date / era | Why it was worth reading |
|---|---|---|---|
| [Rust API Guidelines — Interoperability (C-GOOD-ERR)](https://rust-lang.github.io/api-guidelines/interoperability.html) | Official Rust API guidelines (rust-lang org) | Living doc, checked 2026 | Source of the load-bearing lowercase/no-trailing-punctuation rule for `Display` on error types, plus `Send+Sync`/no-`()`-error-type guidance. |
| [rustc-dev-guide — Errors and Lints](https://rustc-dev-guide.rust-lang.org/diagnostics.html) | Official rustc contributor documentation | Living doc, checked 2026 | Primary source for the `error:`/`note:`/`help:` lowercase, unpunctuated, matter-of-fact diagnostic style that Rust CLIs imitate. |
| [rust-cli book — Human communication](https://rust-cli.github.io/book/in-depth/human-communication.html) | Official Rust CLI Working Group book | Living doc, checked 2026 | Direct guidance on wording CLI errors for humans, `error: could not find ...` example, pointer to human-panic. |
| [rust-cli book — Nicer error reporting](https://rust-cli.github.io/book/tutorial/errors.html) | Official Rust CLI Working Group book | Living doc, checked 2026 | Worked example of `anyhow::Context`, the "Caused by:" chain output, and returning `Result` from `main`. |
| [rust-cli book — Exit codes](https://rust-cli.github.io/book/in-depth/exit-code.html) | Official Rust CLI Working Group book | Living doc, checked 2026 | Source for the `exitcode` crate pattern, default panic = 101, and matching error variants to distinct exit codes. |
| [rust-cli book — Machine communication](https://rust-cli.github.io/book/in-depth/machine-communication.html) | Official Rust CLI Working Group book | Living doc, checked 2026 | Guidance on `--json`, `IsTerminal`-based audience detection, line-delimited JSON as the streaming convention. |
| [Cargo Book — External Tools (message-format)](https://doc.rust-lang.org/cargo/reference/external-tools.html) | Official Cargo reference documentation | Living doc, checked 2026 | Reference model for `--message-format=json`, `json-render-diagnostics`, and the schema conventions (kebab-case, omit-if-default) that a `--format json` CLI flag should imitate. |
| [anyhow — `Context` trait docs](https://docs.rs/anyhow/latest/anyhow/trait.Context.html) | Official crate docs (docs.rs), dtolnay/anyhow | Current release, checked 2026 | Primary source for `.context()`/`.with_context()` semantics and how the cause chain is exposed via `source()`. |
| [thiserror — crate docs](https://docs.rs/thiserror/latest/thiserror/) | Official crate docs (docs.rs), dtolnay/thiserror | Current release, checked 2026 | Primary source for `#[error("...")]` interpolation syntax, `#[from]`, `#[source]`, and `#[error(transparent)]`. |
| [miette — crate docs](https://docs.rs/miette/latest/miette/) | Official crate docs (docs.rs) | Current release, checked 2026 | Primary source for the `Diagnostic` derive macro, `#[label]`/`#[source_code]`/`code()`/`help()`/`url()` attributes, and the "fancy" feature-gating rationale. |
| [ariadne — crate docs](https://docs.rs/ariadne/latest/ariadne/) | Official crate docs (docs.rs), zesterer/ariadne | Current release (MSRV 1.85), checked 2026 | Confirms ariadne's lower-level, span-and-label-only API shape as the alternative to miette's derive-based approach. |
| [codespan-reporting — crate docs](https://docs.rs/codespan-reporting/latest/codespan_reporting/) | Official crate docs (docs.rs), brendanzab/codespan | Current release, checked 2026 | Confirms the `diagnostic`/`files`/`term` module split as the oldest of the three source-span renderers. |
| [human-panic — GitHub repository](https://github.com/rust-cli/human-panic) | Official crate repository (rust-cli org) | Checked 2026 | Primary source for what the panic hook shows a user, the crash-report file contents, and `setup_panic!()` usage. |
| [clap — `ErrorKind` (error module) docs](https://docs.rs/clap/latest/clap/error/enum.ErrorKind.html) | Official crate docs (docs.rs), clap-rs/clap | Current release, checked 2026 | Primary source for clap's built-in `InvalidSubcommand`/`UnrecognizedSubcommand` "did you mean" suggestion behaviour. |
| [`std::process::exit` — standard library docs](https://doc.rust-lang.org/std/process/fn.exit.html) | Official Rust standard library documentation | Current stable, checked 2026 | Primary source that `process::exit` skips destructors, and the recommendation to prefer `ExitCode`/`Result` from `main`. |
| [secrecy crate docs](https://paritytech.github.io/try-runtime-cli/secrecy/index.html) | Crate docs (mirrored via a downstream project's doc build) | Checked 2026 | Primary source for `SecretString`/`SecretVec`'s redacting `Debug` and the `ExposeSecret` trait gate. |
| [error-stack — `Report` docs](https://docs.rs/error-stack/latest/error_stack/struct.Report.html) | Official crate docs (docs.rs) | Current release, checked 2026 | Primary source for the aggregate/attached-context model used for multi-error reporting, contrasted with plain `Vec<Error>`. |
| [ripgrep user guide — Common Error Messages / `--json`](https://iepathos.github.io/ripgrep/troubleshooting/errors/) | Community-maintained ripgrep user guide | Checked 2026 | Real-CLI example of the newline-delimited `{"type": ...}` JSON output convention and the documented pitfall of unstructured stderr corrupting JSON consumers. |
| [Rust API Guidelines issue #79 — Capitalization and punctuation of error messages](https://github.com/rust-lang-nursery/api-guidelines/issues/79) | GitHub issue on the api-guidelines repo (rust-lang-nursery) | Historical discussion, referenced for context | Original discussion thread that led to the C-GOOD-ERR wording — useful for understanding *why* the rule exists (composability of `Display` strings inside wrapper messages), not just that it exists. |
