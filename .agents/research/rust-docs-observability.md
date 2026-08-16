---
title: Documentation and Observability
topic: rust-docs-observability
model: opus
consolidates:
  - rust-docs-observability/rustdoc-and-documentation.md
  - rust-docs-observability/tracing-and-observability.md
  - rust-docs-observability/span-taxonomy-for-concurrent-io.md
date: 2026-08
revised: 2026-08
---

## Verdict

Documentation and observability are one topic here because both fail the same way: they
compile, they look done, and nothing checks them. Every rule below exists to attach a
machine check to a claim.

1. **Rustdoc sections are a contract, not prose.** `# Errors` / `# Panics` / `# Safety` with
   the exact RFC 1574 spellings, because `grep -A5 '# Errors'` is how an agent (and a
   reviewer) audits a fallible surface ([RFC 1574](https://rust-lang.github.io/rfcs/1574-more-api-documentation-conventions.html)).
   OCX already does `# Errors` well (234 sections / 119 fallible `pub fn`) and does
   `# Panics` essentially not at all (grimoire: 0). That asymmetry is the gap we close.
2. **Doctests run in CI, or they are lies.** Both repos test via `cargo nextest run`
   ([grimoire/taskfiles/rust.taskfile.yml:68](file:///home/mherwig/dev/grimoire/taskfiles/rust.taskfile.yml#L68),
   [ocx/taskfiles/rust.taskfile.yml:137](file:///home/mherwig/dev/ocx/taskfiles/rust.taskfile.yml#L137)),
   and nextest does not run doctests. Every `///` example in these codebases is currently
   unverified. Fix: add `cargo test --doc` as a separate verify step. The old "doctests are
   too slow" argument is dead on edition 2024 — rustdoc merges compatible doctests into one
   compiland (sysinfo: 4.59s total).
3. **`missing_docs` on libraries only.** `ocx_lib` has an external consumer surface and gets
   `#![warn(missing_docs)]`; the `grim` binary crate does not, because most of its `pub` is
   intra-crate plumbing and denying the lint there manufactures `/// TODO: document`
   — an anti-pattern that satisfies the lint while conveying nothing. Binary crates owe a
   `//!` per module instead. This resolves the sub-researcher's open "contested" item.
4. **Verbosity: the sub-artifact's "never a bespoke `--log-level`" is overruled.** ocx ships
   a documented `--log-level` ValueEnum ([ocx_lib/src/cli/log_level.rs:8](file:///home/mherwig/dev/ocx/crates/ocx_lib/src/cli/log_level.rs#L8))
   with an explicit env precedence chain and a deliberate non-forwarding policy
   ([env.rs:405](file:///home/mherwig/dev/ocx/crates/ocx_lib/src/env.rs#L405)). Ripping that
   out for `clap-verbosity-flag` buys nothing. The real rule is: *some* explicit level
   control MUST exist, its precedence MUST be documented, and `-v`/`-q` SHOULD exist as
   ecosystem-conventional aliases. grim has neither a flag nor an alias — grim is the
   violator, not ocx.
5. **"Never route user output through the logger" is split, not adopted whole.** clig.dev is
   right about *results*: those go to stdout via the printer. It is wrong for *this* family
   about *errors*: `ocx_cli` deliberately funnels the error chain through one logging seam
   because that seam is where CWE-150 terminal sanitization lives
   ([ocx_cli/main.rs:36](file:///home/mherwig/dev/ocx/crates/ocx_cli/src/main.rs#L36)). One
   seam with a sanitizer beats a dozen unsanitized `eprintln!`s.
6. **No OpenTelemetry *dependency* in `grim`/`ocx`; the OTel *vocabulary* is adopted anyway.**
   A process that lives for seconds pays setup and flush cost for zero local benefit, against
   a crate whose own docs warn of ongoing breaking changes; `ocx-mirror` in daemon mode is the
   only legitimate candidate (OBS-12). But field *names* are free: `error.type`,
   `url.full`, `http.response.status_code`, `http.request.resend_count` and
   `oci.manifest.digest` are a published, understood vocabulary, and inventing `err_kind` /
   `status` / `repo` instead costs the same to write and teaches every consumer a private
   dialect ([OTel HTTP spans](https://opentelemetry.io/docs/specs/semconv/http/http-spans/),
   [OTel OCI attributes](https://opentelemetry.io/docs/specs/semconv/registry/attributes/oci/)).
   Naming without exporting is the settled position (OBS-20).
7. **`tracing`'s JSON formatter is never a public contract.** It documents no schema
   stability. grim's `--format json` error envelope
   ([grim/main.rs:220-265](file:///home/mherwig/dev/grimoire/src/main.rs#L220)) is the
   versioned contract and must be constructed explicitly, never scraped from the fmt layer.
8. **`#[instrument]` is opt-in with `skip_all`, not reflexive.** Zero usages today across
   all three repos. The default — record every argument via `Debug` — is a secret-leak and a
   log-volume bug waiting for the first agent that adds it "for thoroughness."
9. **Changelogs: Conventional Commits as the writing discipline, hand-curated
   Keep-a-Changelog as the output.** Raw `git log` dumps under no heading are rejected.
10. **The span taxonomy is now decided, not deferred.** One root span per command invocation
    carrying `run_id`; one span per retryable network unit of work (`pull_layer`, one per
    layer, N concurrent under the root); `resolve` and `fetch_manifest` distinguishable
    because "slow to resolve or slow to fetch" is the question a debug flag exists to answer;
    span *names* constant with the digest as a *field*. This follows OTel's own HTTP
    convention — "Instrumentations SHOULD create an HTTP span for each attempt to send an HTTP
    request over the wire", with retries as siblings carrying `http.request.resend_count`,
    not events folded into one span
    ([OTel HTTP spans](https://opentelemetry.io/docs/specs/semconv/http/http-spans/)).
    It is *synthesis*, not transcription: `oci-client`, the ecosystem's reference Rust OCI
    client, has no `#[instrument]` and no spans at all, so there is no Rust prior art to copy
    (OBS-17, OBS-18).
11. **The span-across-`tokio::spawn` gap is the highest-risk instrumentation defect here, and
    it is currently latent.** 26 `tokio::spawn(` sites in ocx and 4 in grim, and **zero**
    `.instrument(` / `.in_current_span()` anywhere in either tree (grep). Today that is
    harmless because there are no spans; the day someone adds `#[instrument]` to a fan-out
    pull, all 30 sites orphan silently — it compiles, it runs, the trace just loses its tree
    ([`tracing::Instrument`](https://docs.rs/tracing/latest/tracing/trait.Instrument.html)).
    OBS-19 exists to be in place *before* that happens.
12. **One component owns the terminal; the fmt writer follows it — and the follow-up's
    "`tracing-indicatif` is the drop-in fix" is overruled as a mandate.** grim already
    implements the TUI half correctly: a `SwitchableWriter` installed at subscriber build
    time ([grim/main.rs:280-292](file:///home/mherwig/dev/grimoire/src/main.rs#L280)) that
    `LogSinkGuard` swaps to a file while the alt-screen is active
    ([log_switch.rs:154](file:///home/mherwig/dev/grimoire/src/log_switch.rs#L154),
    [tui/app.rs:215-217](file:///home/mherwig/dev/grimoire/src/tui/app.rs#L215)). ocx
    implements the progress half with a documented ADR
    (`adr_progress_architecture`) that flushes log lines inside `MultiProgress::suspend`
    rather than adding `tracing-indicatif`
    ([log_settings.rs:91](file:///home/mherwig/dev/ocx/crates/ocx_lib/src/cli/log_settings.rs#L91)).
    The follow-up's objection — `suspend` holds the bar lock while the closure runs
    ([indicatif docs](https://docs.rs/indicatif/latest/indicatif/struct.MultiProgress.html)) —
    is real but priced wrong for a CLI whose default level is `warn`: a handful of lines
    serialized behind a redraw lock is not a cost worth a new dependency and an ADR reversal.
    The rule is the *invariant* (never a bare stderr writer while something else owns the
    screen), not the crate (OBS-24). This amends OBS-02, whose "resolves to stderr" text
    would otherwise flag grim's correct implementation as a violation.

## The ruleset

### Documentation

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| DOC-01 | The text before the first blank line of any `///`/`//!` is exactly one complete sentence in third-person present indicative ("Returns the resolved digest.", not "Return…" / "This function returns…"). | That text is the whole of the item's entry in module listings and search — a truncated read must still be correct ([rustdoc book](https://doc.rust-lang.org/rustdoc/how-to-write-documentation.html), [RFC 1574](https://rust-lang.github.io/rfcs/1574-more-api-documentation-conventions.html)). | `grep -rn '^\s*/// ' --include='*.rs' src \| grep -vE '\.$'` on first-lines; review any hit. | MUST |
| DOC-02 | Every `pub fn` returning `Result` has a `# Errors` section naming the *conditions* that produce each error, not the fact that it can fail. | `C-FAILURE`; "returns an error if the operation fails" passes every lint and tells the caller nothing. | `grep -c '# Errors'` vs `grep -c 'pub fn .*-> .*Result'` per crate; ratio ≥ 1. | MUST |
| DOC-03 | Every function that can panic — indexing, slicing, `unwrap`/`expect`, integer division, `assert!` — has a `# Panics` section stating the precondition. | `C-FAILURE`; `missing_docs` cannot see this, and it is the section OCX omits entirely. | `grep -rln 'unwrap()\|expect(\|\[[a-z_]*\]' src` cross-checked against `grep -B20 '# Panics'`; in review, any new `pub fn` with a panicking operation and no `# Panics`. | MUST |
| DOC-04 | Every `unsafe fn` has a `# Safety` rustdoc section stating the invariants the *caller* must uphold; every `unsafe` block has a `// SAFETY:` comment stating why they hold *here*. These are two different documents for two different readers. | Existing `quality-rust.md` requires only the inline `// SAFETY:`; the rustdoc section is the half that reaches the caller. | `grep -rn 'unsafe fn' src` → each has `# Safety` above; `grep -rn 'unsafe {' src` → each has `// SAFETY:`. | MUST |
| DOC-05 | Use only the canonical section headers `# Examples` (always plural), `# Panics`, `# Errors`, `# Safety`. No invented headers, no singular `# Example`. | Fixed vocabulary is what makes the corpus greppable; models emit `# Example` by analogy with `# Panic`. | `grep -rnE '^\s*/// # (Example|Error|Panic|Safety)$' --include='*.rs' src` must return nothing. | MUST |
| DOC-06 | Doc-example code uses `?` and hides setup with `# `-prefixed lines or a trailing `# Ok::<(), E>(())` (no whitespace inside `(())`). Never `.unwrap()`/`.expect()` in a rendered example. | `C-QUESTION-MARK` — examples get copy-pasted verbatim into code that then panics on first real error. | Extract fenced blocks from `///`/`//!` lines and grep for `.unwrap(`/`.expect(`. | MUST |
| DOC-07 | Never mark a doctest ` ```ignore `. Use ` ```no_run ` (compiles, doesn't execute — network/disk), ` ```text ` (not Rust), or ` ```compile_fail `. If `ignore` is genuinely unavoidable, the same line carries a `// why:` comment. | `ignore` permanently and silently removes an example from verification; it is the move an agent makes to turn a red CI green. | `grep -rn '```ignore' src \| grep -v '// why:'` must return nothing. | MUST |
| DOC-08 | The verify pipeline runs `cargo test --doc --workspace` as its own step, separate from the nextest step. | `cargo nextest run` does not execute doctests — the current pipeline verifies zero examples. Merged doctests (edition 2024) make this cheap. | `grep -rn 'test --doc' taskfiles/ .github/workflows/`. | MUST |
| DOC-09 | CI runs `RUSTDOCFLAGS="-D warnings" cargo doc --no-deps --all-features`. | rustdoc's link/HTML lints only *warn*; `cargo doc` "succeeds" while emitting dead intra-doc links ([rustdoc lints](https://doc.rust-lang.org/rustdoc/lints.html)). | `grep -rn 'RUSTDOCFLAGS' .github/workflows/ taskfiles/`. | MUST |
| DOC-10 | Library crates with an external consumer surface carry `#![warn(missing_docs)]` at the crate root. Binary crates do not, but every module in them carries a `//!` inner doc comment. | `missing_docs` is allow-by-default and checks *presence*, not quality; forcing it on a binary's intra-crate `pub` surface produces ceremony docs. | `grep -n 'missing_docs' crates/*/src/lib.rs`; for binaries, every `src/**/*.rs` starts with `//!`. | MUST (lib) / SHOULD (bin) |
| DOC-11 | A `///` on a clap-rendered surface states the user contract and nothing else: short line ≤ ~70 chars with no trailing period, ASCII only, no `§`/ADR/RFC/rustdoc-link references, no dates, no implementation jargon. | Verbatim from ocx's `quality-cli-help.md`; Windows PowerShell 5.1 mojibakes non-ASCII help under the console codepage. This rule is family-wide now, not ocx-only. | The four ocx gates: `cli_definition_is_valid`, `cli_help_text_is_ascii`, `cli_help_text_has_no_internal_references`, `test_completion_ascii.py`. | MUST |
| DOC-12 | Never emit `#[doc(cfg(...))]` or `#[doc(auto_cfg)]` in code that must build on stable. A feature-gated `pub` item states its required feature in prose instead. | Both are still nightly-gated behind `#![feature(doc_cfg)]`; the badge is invisible on a stable `cargo doc` regardless. | `grep -rn 'doc(cfg\|doc(auto_cfg' src` must be empty, or every hit is inside a `cfg_attr(docsrs, …)`. | MUST |
| DOC-13 | Remove a public item only after a release carrying `#[deprecated(since = "X.Y.Z", note = "use Y instead")]` on it; both `since` and `note` are mandatory. The removal lands with a changelog entry under `Removed`. | A bare `#[deprecated]` compiles and looks like diligence while giving the caller no version and no migration path ([Rust reference](https://doc.rust-lang.org/reference/attributes/diagnostics.html#the-deprecated-attribute), [Cargo SemVer](https://doc.rust-lang.org/cargo/reference/semver.html)). | `grep -rn '#\[deprecated\]$' src` must be empty; for a removed item, `git log -p` shows a prior deprecating commit. | MUST |
| DOC-14 | Every changelog entry sits under one of `Added / Changed / Deprecated / Removed / Fixed / Security`, written as a sentence for a human. An entry that is a verbatim commit subject (starts `feat:`/`fix:`) is rejected. | Keep a Changelog is explicit that changelogs are for humans; Conventional Commits is the input discipline, not the output. | `grep -nE '^\s*[-*] (feat\|fix\|chore\|refactor)(\(.*\))?:' CHANGELOG.md` must be empty. | SHOULD |
| DOC-15 | Every literal command transcript in README/docs (`$ grim install foo` → expected output) is covered by a `trycmd` case or an equivalent snapshot test. | Worked CLI examples are the highest-drift doc surface — `--help` and man pages are generated, transcripts are not. | A test invoking `trycmd::TestCases::new().case("README.md")` (or equivalent) exists. | SHOULD |
| DOC-16 | Reference other items with intra-doc links (`` [`Manifest`] ``, `[`Self::pull`]`), never a hand-written docs.rs URL or a bare backticked name. | `C-LINK`; hand-written URLs rot silently, intra-doc links fail `cargo doc -D warnings` when they break. | Covered by DOC-09 (`broken_intra_doc_links` warns by default). | SHOULD |
| DOC-17 | Pick and declare one README↔`lib.rs` sync direction per crate: `#![doc = include_str!("../README.md")]`, or `cargo rdme --check` in CI. Never hand-maintain both. | Undeclared direction is exactly how a README example ends up describing an API that no longer exists. | `grep -n 'include_str!("../README' src/lib.rs` OR a `cargo rdme --check` CI step. | CONSIDER |

### Observability

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| OBS-01 | A command's *result* — the thing the user asked for — goes to stdout through the printer/`DataInterface`, never through `tracing::info!`. Diagnostics and progress go to stderr. | Routing a result through the logger means it vanishes under `--quiet` or a restrictive filter and arrives with a level/timestamp prefix a pipe can't parse ([clig.dev](https://clig.dev/)). | For each `tracing::info!` call, ask whether a script would want that line; any "yes" is a violation. | MUST |
| OBS-02 | Every subscriber's fmt layer names its writer explicitly, and that writer is the one the terminal-ownership rule (OBS-24) selects: stderr by default, a switchable/file writer when a TUI can take the screen, or a progress-aware writer when bars are live. A bare `std::io::stdout` writer is never correct. | An accidental stdout writer silently corrupts every piped invocation; a bare stderr writer corrupts a raw-mode frame or tears a progress bar. The requirement is that the writer is *named and deliberate*, not that it is literally `stderr`. | `grep -rn 'with_writer' src` — every hit is stderr, a file/switchable writer, or a progress-aware wrapper, and never `std::io::stdout`. | MUST |
| OBS-03 | Never hold a `Span::enter()` guard across an `.await`. Use `#[instrument]` on the async fn, `.instrument(span)` on the future you are about to await, or `.in_scope()` around the synchronous part only. | The guard stays entered while the task is parked, producing interleaved and wrong traces — documented by `tracing` itself. `#[instrument]`/`Instrument` are safe because the span is re-entered on every poll. | `grep -rn '\.enter()' src` → no `.await` before the guard drops. | MUST |
| OBS-04 | Every `#[instrument]` carries `skip_all` plus an explicit `fields(...)` list drawn from the OBS-20 vocabulary, and those field expressions are cheap (field access, `%`/`?` formatting, trivial arithmetic — no allocation, no I/O). | The default records every argument via `Debug` on every call, which leaks tokens and blobs; and `fields(...)` is evaluated eagerly even when the span is disabled. At 200 concurrent layers an un-skipped `&Layer` argument means 200 full-descriptor `Debug` serializations. | `grep -rn -A3 '#\[instrument' src` — each has `skip_all`/`skip(...)`; read each `fields(...)` expression. | MUST |
| OBS-05 | Anything carrying a credential, registry token, or auth header is typed so it has no `Debug`/`Display` — `secrecy::SecretString` or a local newtype that deliberately omits both. | `tracing` has no redaction mechanism whatsoever; the only reliable defence is making the leak a compile error. `skip()` is a rule a contributor can forget, a missing `Debug` impl is not. | `grep -rn 'token\|password\|credential\|secret' src --include='*.rs'` → each such field's type derives neither. | MUST |
| OBS-06 | A `WorkerGuard` from `tracing_appender::non_blocking(...)` is bound in `main` and lives to process exit — never returned-and-dropped by a setup helper. | An early-dropped guard silently discards buffered lines, precisely in the crash case you needed them for. | `grep -rn 'non_blocking(' src` → trace the guard binding back to `fn main`. | MUST |
| OBS-07 | Level semantics: `error` = the operation failed and the process exits non-zero; `warn` = degraded but continuing; `info` = coarse milestones a `-v` user wants; `debug` = per-request/per-file maintainer detail; `trace` = loop bodies and wire data. | Without a fixed mapping, an agent logs everything at `info` and the level flag stops meaning anything. | Review: any `info!` firing more than a handful of times per invocation is `debug`. | MUST |
| OBS-08 | The binary exposes an explicit log-level control (a `--log-level` ValueEnum or `-v`/`-vv`/`-q`) whose precedence against the env var chain is documented in one place and in `--help`. `RUST_LOG` remains the power-user escape hatch. | Env-var-only verbosity is undiscoverable; undocumented precedence between three env vars and a flag is unsupportable. | `--help` shows the control; the precedence chain appears in the env-var reference. | MUST |
| OBS-09 | Never inline an `"Error:"`/`"error:"` prefix at a log or `tracing::error!` site. | The level already categorizes the line; the prefix double-renders. (Restates the existing `quality-rust-errors.md` rule — kept here because the log site is where agents add it.) | `grep -rn 'error!("Error' src` must be empty. | MUST |
| OBS-10 | Untrusted text — registry-sourced names, digests, error chains quoting wire documents — is passed through a terminal sanitizer before it reaches stderr/stdout. | CWE-150: `tracing-subscriber` passes `\n`, `\r`, NUL and the whole `Cf` bidi set straight to the terminal. | A structural test pins the sanitizer call at the error boundary (ocx does this at `main.rs:39-60`). | MUST |
| OBS-11 | Treat `tracing-subscriber`'s JSON formatter output as unversioned internal debugging. Any JSON the project promises to consumers is a separately constructed, versioned envelope. | The formatter documents no schema stability; coupling a downstream tool to it is an unannounced breaking change waiting on a dependency bump. | No docs/README text promising a stable log-JSON shape; `--format json` output is built by project code, not scraped from a fmt layer. | MUST |
| OBS-12 | Do not add `opentelemetry*` dependencies to a short-lived CLI. OTel is admissible only in a long-running/daemon mode, with the version pinned and the justification written down. This bans the *crates*, not the *naming conventions* — OBS-20 requires those. | Provider setup plus flush-on-shutdown for a process that runs for seconds is pure cost; `opentelemetry-rust` warns of ongoing breaking changes. Semantic-convention field names cost nothing and are the reason the eventual export, if it ever happens, is a config change rather than a rename sweep. | Any new `opentelemetry*` line in `Cargo.toml` needs an accompanying daemon-mode rationale. | MUST |
| OBS-13 | Panic handling defaults to zero network calls (`human_panic::setup_panic!()` writes a local report). Any remote crash reporting is opt-in behind explicit runtime consent, never a build default. | This is a security-sensitive package manager holding registry credentials; silent telemetry is a trust liability. | `grep -rn 'sentry::init' src` → gated by a runtime config read, not unconditional in `main`. | MUST |
| OBS-14 | Bridge `log`→`tracing` in one direction only, via `tracing_log::LogTracer::init()`. Never also enable a tracing→log bridge. | The two together recurse infinitely. | `grep -rn 'LogTracer\|log-always' src` — at most one direction configured. | SHOULD |
| OBS-15 | `--version` embeds the git SHA, dirty flag, and build timestamp (vergen or equivalent). | A bug report against a prebuilt binary is untriageable without knowing exactly which build it was. | `--version` output contains a SHA; `grep -rn 'VERGEN' src`. | SHOULD |
| OBS-16 | Behaviour that depends on a log line being emitted is asserted with `#[tracing_test::traced_test]` + `logs_contain(...)`, not by eyeballing output. | Makes the observability surface a tested surface rather than a hope. | `grep -rn 'traced_test' src tests`. | CONSIDER |
| OBS-17 | Exactly one root span per command invocation (`grim_add`, `ocx_install`), created at subcommand dispatch and carrying the run-level fields (`run_id`, subcommand). Every other span in the process is a descendant of it. | Makes a `RUST_LOG=grim=debug` capture a call tree rather than a flat interleave, and gives every root field automatic visibility on descendant events. Without it, "which of these lines belong to my run" is unanswerable in a bug report. | `grep -rn '#\[instrument' src` → the subcommand-dispatch fn is instrumented, and every other instrumented fn is reachable from it (no instrumented entry point called with no ambient span). | MUST |
| OBS-18 | Every retryable network unit of work is its own span with a **constant** name (`pull_layer`, one per layer, N concurrent) — never one bulk span with N log lines, and never a name that embeds a digest. High-cardinality values (digest, URL, size) are *fields*. Transfer-progress ticks are not tracing events at all. | OTel's HTTP conventions instrument each wire attempt as its own span, with retries as siblings carrying `http.request.resend_count` ([OTel HTTP spans](https://opentelemetry.io/docs/specs/semconv/http/http-spans/)). 200 short-lived spans is normal; 200 *distinct span names* breaks every tool that groups by name, and per-chunk events are the textbook cardinality mistake. | Read the pull path: can you answer "which of the N layers was slow" from the trace alone? `grep -rn 'span!\|#\[instrument' src` → every span name is a literal, never a `format!`. | MUST |
| OBS-19 | Every future handed to `tokio::spawn` from inside an instrumented call chain is explicitly `.instrument(Span::current())` or `.in_current_span()` before spawning. | `tokio::spawn` does not inherit the caller's span; an un-instrumented spawn silently orphans its events from the parent trace ([`tracing::Instrument`](https://docs.rs/tracing/latest/tracing/trait.Instrument.html)). It compiles, it runs, and the defect is invisible until someone reads trace output. Currently latent: 26 spawn sites in ocx, 4 in grim, 0 `.instrument(` anywhere. | `grep -rn 'tokio::spawn(' src crates` → every match's argument is wrapped in `.instrument(`/`.in_current_span()`, or the binary creates no spans at all. | MUST |
| OBS-20 | Span and event field names come from OpenTelemetry semantic conventions where one exists — `error.type`, `url.full`, `server.address`, `http.response.status_code`, `http.request.resend_count`, `oci.manifest.digest`. OCI concepts OTel has not standardized use one `oci.*`-shaped name each (`oci.repository`, `oci.reference`, `oci.layer.digest`, `oci.layer.media_type`, `oci.layer.size`), declared once in a shared constants module and never re-spelled at a call site. | A published vocabulary is understood by every consumer — aggregator, `grep`, a future export — for the same reason a package manager adopts SemVer rather than inventing one. The failure this prevents is `repo` here and `repository` there in the same binary. OTel's OCI namespace currently defines exactly one attribute, so the `oci.*` shape is a deliberate bet on where it lands, not a citation. | Collect every `fields(...)` / `%name` identifier across the tree and diff against the constants module; any field name used at exactly one call site is a suspected synonym. | MUST |
| OBS-21 | `#[instrument(err)]` appears once per failure, on the span closest to where the error originates. Do not re-`err` intermediate hops that only `?`-propagate the same `Result`, and do not also `error!` it at the aggregation point — the CLI's top-level handler is the single place the user-facing failure is reported. | `err`/`ret` each emit their own event and nothing in the macro suppresses a separate log of the same failure ([`attr.instrument`](https://docs.rs/tracing/latest/tracing/attr.instrument.html)). OTel has moved the same way: recording a handled exception on every span it passed through is "no longer recommended" ([OTel exceptions-on-spans](https://opentelemetry.io/docs/specs/semconv/exceptions/exceptions-spans/)). A span still records an error *status* structurally without emitting a duplicate event. | For a given error type, count the `#[instrument(err` sites plus `error!(` sites on its path from origin to exit code; more than one firing for the same unmodified `Result` is the defect. | MUST |
| OBS-22 | Any URL recorded as a span field, log line, or error message passes through a redaction function that strips `user:pass@` userinfo and known signed-URL parameters (`X-Amz-Signature`, `sig`, `Signature`), preserving the key name. Never `%url` on a raw `Url`. | OTel makes this a MUST, not a style preference: `url.full` "MUST NOT contain credentials passed via URL" ([OTel HTTP spans](https://opentelemetry.io/docs/specs/semconv/http/http-spans/)). Registry blob fetches are exactly the presigned-URL case. One tested redaction function makes every call site downstream safe by construction. | The redaction function exists and has a unit test; `grep -rn 'url' src` at `#[instrument]`/`fields(` sites → each passes through it, not the raw value. | MUST |
| OBS-23 | One `run_id` (UUID or ULID) is generated per invocation and recorded on the root span. A registry-returned request ID is a *different* identifier: logged at `debug`, explicitly labelled as the registry's, never merged into `run_id`. | There is no OCI-distribution-spec request-ID or trace-context header — only `Docker-Content-Digest` and `Docker-Upload-UUID` — so client-side and server-side correlation IDs come from different places and conflating them in a bug report ("here's the request ID" — whose?) costs a support round-trip. Sending W3C `traceparent` is a zero-cost forward bet, not a requirement. | `--version`/bug-report output and the root span both carry `run_id`; `grep -rn 'request.id\|x-github-request-id' src` → logged under its own distinct field name. | SHOULD |
| OBS-24 | Exactly one component owns the terminal at a time, and the fmt writer follows it: a file while a ratatui/raw-mode TUI holds the alt-screen, a progress-aware writer while indicatif bars are live, plain stderr otherwise. The switch mechanism is named in one place, not branched on per call site. `tracing-indicatif` is an acceptable implementation, not a required one. | A raw-mode TUI has no locking discipline with a separate writer — any direct terminal write corrupts the frame. `MultiProgress::suspend` holds the bar lock for the whole closure ([indicatif docs](https://docs.rs/indicatif/latest/indicatif/struct.MultiProgress.html)), which is fine for a `warn`-default CLI's line volume and not fine as a per-event wrapper on a chatty subscriber — so the choice of mechanism is a measured local call, while the invariant is not. | `grep -rn 'fmt::layer\|with_writer' src` → the writer is a switchable/file writer when a TUI is reachable in the same binary, or a progress-aware wrapper when a progress manager exists; never a bare stderr writer alongside either. | MUST |
| OBS-25 | If a `max_level_*` / `release_max_level_*` `tracing` feature is set, the compiled ceiling is at least the highest level the verbosity flag advertises in `--help`. | Those features strip disabled call sites from the binary entirely ([`level_filters`](https://docs.rs/tracing/latest/tracing/level_filters/index.html)); a mismatch means `--log-level trace` is advertised and produces nothing, which reads to the user as a broken flag with no error message. | `grep -n 'max_level' Cargo.toml` → cross-check against every level the verbosity flag's help text names. | SHOULD |
| OBS-26 | The interactive `--debug`/`-v` path and a bug-report bundle are separate outputs with separate budgets: the flag is human-formatted to the terminal under OBS-24, the bundle is structured JSON to a file. Both apply the identical OBS-05/OBS-22 redaction — "it's for support" never relaxes it. | Different audiences: one is scanned live, the other read offline by a developer, so the bundle can carry per-attempt counts, byte counts and span timings the terminal should not. But a bundle attached to a public issue tracker is a *worse* leak vector than a terminal, not a better one, so redaction is unconditional. | The bundle writer and the fmt layer share one redaction path; `grep` the bundle-generation code for a direct token/URL write that bypasses it. | MUST |

## Applied to OCX

**Already satisfied.**

- `# Errors` discipline is genuinely strong: grimoire has 224 `# Errors` sections against 106
  fallible `pub fn`; ocx has 234 against 119. The existing positive requirement in
  `quality-rust.md` ("functions returning `Result` get a `# Errors` section",
  [rules-inventory.md:392](file:///home/mherwig/dev/grimoire-lore/.agents/research/ocx-codebase-audit/rules-inventory.md#L392))
  is being followed. DOC-02 is a ratification, not a new burden.
- OBS-02/OBS-24 are satisfied by ocx: [`log_settings.rs:77-84`](file:///home/mherwig/dev/ocx/crates/ocx_lib/src/cli/log_settings.rs#L77)
  builds the fmt layer with `.with_writer(std::io::stderr)` explicitly, and the
  progress-aware variant ([`log_settings.rs:91`](file:///home/mherwig/dev/ocx/crates/ocx_lib/src/cli/log_settings.rs#L91))
  writes through a `ProgressManager` that flushes inside `MultiProgress::suspend` and degrades
  to stderr on the non-TTY path — an explicit ADR (`adr_progress_architecture`), not an
  accident.
- OBS-24 is satisfied by grim for the TUI half, which is the harder half: `init_tracing`
  installs a `SwitchableWriter`
  ([grim/main.rs:280-292](file:///home/mherwig/dev/grimoire/src/main.rs#L280)) held in a
  process-global, and `LogSinkGuard::redirect_to` swaps it to a file for the lifetime of the
  alt-screen ([log_switch.rs:154](file:///home/mherwig/dev/grimoire/src/log_switch.rs#L154),
  [tui/app.rs:215-217](file:///home/mherwig/dev/grimoire/src/tui/app.rs#L215)), restoring
  stderr on exit. This is the design OBS-24 codifies, discovered rather than invented.
- OBS-04 is satisfied vacuously: **zero `#[instrument]` usages across ocx, grimoire and
  ocx-mirror** (grep; corroborated by
  [errors-async-security.md:93](file:///home/mherwig/dev/grimoire-lore/.agents/research/ocx-codebase-audit/errors-async-security.md)).
  This is a rule that prevents a future regression, not one that indicts current code. The
  same vacuity covers OBS-17…OBS-21: there is no span tree to be wrong yet.
- OBS-09/OBS-10: ocx_cli funnels the error chain through one boundary and sanitizes it —
  [`ocx_cli/src/main.rs:36`](file:///home/mherwig/dev/ocx/crates/ocx_cli/src/main.rs#L36)
  calls `api::data::sanitize_for_terminal` with an explicit CWE-150 comment, pinned by a
  structural regression test at `main.rs:39-60`.
- OBS-11: grim's `--format json` error envelope is hand-built at
  [`grim/main.rs:220-265`](file:///home/mherwig/dev/grimoire/src/main.rs#L220) and documented
  at `docs/src/json-interface.md` — a real versioned contract, correctly *not* the fmt
  layer's JSON output.
- OBS-15: ocx embeds build metadata via `vergen-gix`
  ([`ocx_cli/Cargo.toml:36`](file:///home/mherwig/dev/ocx/crates/ocx_cli/Cargo.toml#L36),
  consumed at [`app/build_info.rs:117-131`](file:///home/mherwig/dev/ocx/crates/ocx_cli/src/app/build_info.rs#L117)).
- DOC-11 is already fully specified and gated — in ocx only
  ([rules-inventory.md:824-877](file:///home/mherwig/dev/grimoire-lore/.agents/research/ocx-codebase-audit/rules-inventory.md#L824)),
  with four automated gates in `task verify`.

**Violated.**

1. **DOC-08 — no doctest ever runs.** Both verify pipelines use `cargo nextest run`
   ([grimoire/taskfiles/rust.taskfile.yml:68](file:///home/mherwig/dev/grimoire/taskfiles/rust.taskfile.yml#L68),
   [ocx/taskfiles/rust.taskfile.yml:137](file:///home/mherwig/dev/ocx/taskfiles/rust.taskfile.yml#L137)),
   which does not support doctests, and no `cargo test --doc` appears anywhere in the
   taskfiles or the 27 workflow files. ocx's 56 doc-comment code fences and grimoire's 8 are
   unverified text.
2. **DOC-09 — no `cargo doc` gate.** `RUSTDOCFLAGS` and `cargo doc` appear in zero workflows
   and zero taskfiles. Broken intra-doc links are invisible. Confirmed independently as a
   named gap in the skills audit
   ([skills-agents-inventory.md:528-532](file:///home/mherwig/dev/grimoire-lore/.agents/research/ocx-codebase-audit/skills-agents-inventory.md#L528)).
3. **DOC-03 — `# Panics` is absent.** grimoire: 0 occurrences. ocx: 4. Given `unwrap`/`expect`
   are library-forbidden but indexing and slicing are not, this is under-documented rather
   than genuinely panic-free.
4. **DOC-10 — no crate carries `missing_docs` or any `rustdoc::` lint attribute.** grep over
   `grimoire/src` and `ocx/crates` returns nothing; `grimoire/src/main.rs:13` sets only a
   clippy test allowance.
5. **OBS-08 — grim has no verbosity control at all.** No `-v`, no `-q`, no `--log-level`;
   verbosity is `GRIM_LOG` only, defaulting to `warn`
   ([grim/main.rs:278](file:///home/mherwig/dev/grimoire/src/main.rs#L278)). ocx passes with
   `--log-level` plus a documented `OCX_LOG_CONSOLE` → `OCX_LOG` → `RUST_LOG` → INFO chain
   ([log_settings.rs:9,144-153](file:///home/mherwig/dev/ocx/crates/ocx_lib/src/cli/log_settings.rs#L133)).
6. **OBS-10 — grimoire writes untrusted error text to the terminal unsanitized.**
   [`grimoire/src/main.rs:191`](file:///home/mherwig/dev/grimoire/src/main.rs#L191) and
   `:326` do `writeln!(io::stderr(), "{err:#}")` with no sanitizer, while grim's error chains
   quote registry-sourced skill and package names — the identical threat model ocx_cli
   defends against. Flagged HIGH in
   [errors-async-security.md:99](file:///home/mherwig/dev/grimoire-lore/.agents/research/ocx-codebase-audit/errors-async-security.md).
7. **OBS-15 — grimoire embeds no build metadata.** No vergen, no git SHA in `--version`.
8. **DOC-11 is ocx-only.** grim's `--help` text is governed by no rule and gated by no test
   ([exit-codes-and-cli.md:75](file:///home/mherwig/dev/grimoire-lore/.agents/research/ocx-codebase-audit/exit-codes-and-cli.md)).
9. **OBS-19 is a loaded gun, not yet fired.** 26 `tokio::spawn(` sites in `ocx/crates`, 4 in
   `grimoire/src`, and zero `.instrument(` / `.in_current_span()` in either tree (grep). No
   trace is broken today because no spans exist; every one of those 30 sites becomes an
   orphaned subtree the moment OBS-17 is implemented without OBS-19.
10. **OBS-23 — no `run_id` anywhere.** grep for `run_id`/`Uuid::new`/`ulid` in `grimoire/src`
    returns nothing. Two concurrent `grim` runs writing to the same log file are currently
    indistinguishable line by line.

**Newly committed to.**

- DOC-11 becomes family-wide: grimoire adopts `quality-cli-help.md` and the four ASCII /
  no-internal-references gates.
- OBS-05: ocx already depends on `secrecy`
  ([ocx/Cargo.toml:109](file:///home/mherwig/dev/ocx/Cargo.toml#L109)); grimoire does not, and
  commits to typing registry credentials the same way.
- The whole OBS block closes gap #9 of the rules inventory, which recorded observability as
  covered "only incidentally"
  ([rules-inventory.md:1073-1076](file:///home/mherwig/dev/grimoire-lore/.agents/research/ocx-codebase-audit/rules-inventory.md#L1073)).
- OBS-01 is written as a *split* rather than clig.dev's blanket rule, deliberately preserving
  ocx's single-logging-seam design for errors — the seam is load-bearing for OBS-10.
- OBS-17…OBS-21 commit the family to a span *design* before any span exists, so the first
  agent to "add observability" implements a decided tree rather than improvising per call
  site. The constants module OBS-20 requires does not exist yet in either repo and is a
  prerequisite for the first `#[instrument]`.
- OBS-24 generalizes grim's `log_switch` design and ocx's progress ADR into one rule instead
  of two per-repo conventions, without forcing either repo to change implementation.

## AI-agent failure modes

Ranked by how often they bite an unsupervised agent in this codebase.

1. **Writing a doc example and never running `cargo test --doc`.** The single highest-frequency
   failure: hallucinated method names and stale signatures inside `///` blocks are *fully*
   mechanically catchable and currently caught by nothing (DOC-08). Treat "ran the doctest
   suite" as a completion gate, not polish.
2. **`.unwrap()` in a doc example "for brevity."** Shorter, looks correct in isolation,
   violates `C-QUESTION-MARK`, and gets copy-pasted into production (DOC-06).
3. **`#[instrument]` sprayed on every function without `skip_all`.** Looks thorough, silently
   records every argument via `Debug` — including auth tokens and blob bytes — on every call
   (OBS-04, OBS-05). Especially dangerous here because current usage is zero, so the first
   agent to "add observability" sets the pattern.
4. **`tokio::spawn(pull_layer(layer))` with no `.instrument(...)`.** The most dangerous
   *invisible* defect in the whole topic: it compiles, it runs, review passes, and the trace
   silently loses its tree — the failure only surfaces when a human reads span output and
   finds parentless `pull_layer` spans (OBS-19). An agent writes the un-instrumented version
   by default because that is the form that type-checks.
5. **Routing a result through `tracing::info!`.** The line disappears under `--quiet` and
   arrives unparseable when it doesn't (OBS-01).
6. **Marking a failing doctest ` ```ignore ` to turn CI green.** Launders a broken example
   into a permanently unchecked one (DOC-07).
7. **`#[instrument(err)]` at every hop plus an `error!` at the handler.** Each addition looks
   locally correct; together they emit the same failure three or four times for one user-visible
   error, because nothing forces the agent to trace the propagation path first (OBS-21).
8. **`# Example` singular, or an invented header like `# Usage`.** Breaks the greppability
   the whole section contract depends on (DOC-05).
9. **Holding `span.enter()` across `.await`.** The exact output of mechanically translating a
   sync tracing pattern into an async fn (OBS-03).
10. **Inventing a field name per call site** — `repo` in one function, `repository` in the
    next, `image` in a third — because each is locally reasonable and no compiler checks
    cross-call-site consistency (OBS-20).
11. **Reaching for OpenTelemetry when asked to "add observability."** Disproportionate for a
    process measured in seconds (OBS-12) — and the agent then also skips the *free* half,
    the semantic-convention field names (OBS-20).
12. **`/// TODO: document` to satisfy `missing_docs`.** Passes the lint, conveys nothing — the
    reason DOC-10 is scoped to library crates only.
13. **Bare `#[deprecated]` with no `since`/`note`.** Compiles, looks like diligence, leaves the
    caller with no version and no migration path (DOC-13).
14. **Emitting `#[doc(cfg(...))]`** — reads as normal because docs.rs builds with nightly, but
    fails to compile on a stable toolchain (DOC-12).
15. **Putting the digest in the span *name*** (`info_span!("pull_{digest}")` via `format!`) so
    every layer produces a unique name and every group-by-name view degenerates to N groups of
    one (OBS-18).
16. **Adding a bare `tracing_subscriber::fmt().init()` in a binary that also runs a TUI**,
    which writes straight to stderr mid-render and shreds the alt-screen frame (OBS-24).
17. **Changelog as a `git log` dump** under no Keep-a-Changelog heading (DOC-14).
18. **Chaining `.json().pretty()`** on the same fmt builder — mutually exclusive formatters.
19. **Assuming `RUST_LOG`'s `{field=value}` syntax filters events.** It matches *spans* only,
    at span-creation time.

## Open questions

**Needs a human decision.**

- **Does grim get `-v`/`-q`, ocx's `--log-level`, or both?** OBS-08 requires a control; it
  deliberately does not pick the shape. Adding `-v` to ocx alongside `--log-level` means two
  controls with a precedence rule — possibly worse than one. `uv`'s named levels
  (`DebugUv`/`TraceUv`/`TraceAll`) are a third shape worth considering over a raw `-vvv`
  counter.
- **Is `ocx-mirror`'s `tracing` dependency dead?** No `tracing_subscriber` init site exists
  anywhere in `ocx-mirror/src` (grep empty, matching
  [errors-async-security.md:101](file:///home/mherwig/dev/grimoire-lore/.agents/research/ocx-codebase-audit/errors-async-security.md)),
  yet it emits 20 tracing calls. Either the dep is vestigial or output is going somewhere
  unaudited. Nobody should write observability rules for ocx-mirror until this is answered.
- **Do these binaries ship man pages?** They ship as prebuilt binaries with no package
  manager doing man-page installation, and grim already publishes an mdBook site
  (`docs.yml:69`, mdbook 0.5.3). `clap_mangen` may be pure ceremony here. DOC-15 assumes
  transcripts matter; man pages are unresolved.
- **Should `missing_docs` be retrofitted onto `ocx_lib` now, or gated to new modules?**
  `ocx_lib` has ~74 top-level modules; a flag-day `#![warn(missing_docs)]` produces a large,
  low-value doc backlog.
- **Does the family want a bug-report bundle at all?** OBS-26 specifies what one must do *if*
  it exists; neither binary has one today, and `grim`'s TUI log file plus `--version` build
  metadata may already cover the triage need at zero cost.

**Deserves another research round.**

1. **Terminal-injection sanitization as a shared control.** ocx has `sanitize_for_terminal`
   and a structural test; grimoire has fragments in TUI code only. What is the canonical
   sanitizer (which Unicode categories, what replacement policy), where does it live so both
   families share it, and can it be enforced by a lint rather than a per-repo structural test?
   OBS-10 states the requirement without naming the implementation. OBS-22's URL redactor is a
   second, adjacent sanitizer — the two should probably share a home.
2. **Versioned JSON output contract.** grim's error envelope exists and is documented; ocx's
   `DataInterface` covers results but has no structured error document. What is the shared
   schema, does it carry a version field, and how is compatibility tested? OBS-11 forbids the
   wrong source without specifying the right one.
3. **Doc-drift detection for the mdBook site.** `worker-doc-reviewer` is bespoke to one
   project's doc tree; there is no generic check that a public-API change updated the
   corresponding book page. `mdbook test` runs Rust blocks but nothing checks prose against
   code.
4. **Validate the span tree against real trace output before it hardens into a rule file.**
   OBS-17/OBS-18 are original synthesis — `oci-client`, the ecosystem's reference Rust OCI
   client, ships no spans at all, so there is no implementation to compare against. The tree
   should be built once for `grim install` and read by a human before it is published as
   normative.
5. **Registry request-ID header names are unverified.** `x-github-request-id` and
   `x-amzn-RequestId` come from platform convention, not from a fetched primary source, and
   the OCI distribution spec defines no request-ID header at all. Confirm against each
   registry's current docs before OBS-23's second half is implemented as a hardcoded header
   list. Related and also open: whether ghcr.io honours a client-sent W3C `traceparent`.

## Sub-artifacts

- [rustdoc-and-documentation.md](rust-docs-observability/rustdoc-and-documentation.md) —
  rustdoc conventions and the `C-*` API Guidelines, doctest attributes and the edition-2024
  merged-doctest change, `missing_docs`/rustdoc lints, README sync, CLI doc surfaces
  (clap_mangen, mdBook, trycmd), changelog/deprecation/semver obligations.
- [tracing-and-observability.md](rust-docs-observability/tracing-and-observability.md) —
  the `tracing` ecosystem (spans, `#[instrument]`, `EnvFilter`, layered subscribers, JSON,
  appenders), CLI log-level semantics and stdout/stderr separation, secret redaction,
  panic/crash reporting, build-metadata embedding, and the OpenTelemetry cost argument.
- [span-taxonomy-for-concurrent-io.md](rust-docs-observability/span-taxonomy-for-concurrent-io.md)
  — follow-up round: the span tree for resolve → fetch-manifest → N×pull → extract → link,
  span-per-attempt vs. events, `Instrument` across `tokio::spawn`, OTel semantic-convention
  field naming, cardinality and compile-time level ceilings, run-ID/trace-context correlation,
  URL and credential redaction, `err`/`ret` double-reporting, and progress-UI/TUI vs.
  subscriber terminal contention.

## Key sources

| URL | Why |
|---|---|
| [Rust API Guidelines — Documentation](https://rust-lang.github.io/api-guidelines/documentation.html) | Normative source for `C-EXAMPLE`, `C-QUESTION-MARK`, `C-FAILURE`, `C-LINK`, `C-RELNOTES`, `C-HIDDEN` — the checkable core of DOC-02…DOC-06 |
| [rustdoc book — Documentation tests](https://doc.rust-lang.org/rustdoc/write-documentation/documentation-tests.html) | Every doctest attribute, `#`-hidden lines, `?` patterns, and the merged-doctest performance numbers behind DOC-08 |
| [rustdoc book — Lints](https://doc.rust-lang.org/rustdoc/lints.html) | Default levels proving `cargo doc` warns rather than fails — the basis for DOC-09 |
| [rustc book — Allowed-by-default lints](https://doc.rust-lang.org/rustc/lints/listing/allowed-by-default.html) | `missing_docs` is allow-by-default and opt-in (DOC-10) |
| [RFC 1574 — More API documentation conventions](https://rust-lang.github.io/rfcs/1574-more-api-documentation-conventions.html) | Origin of the fixed header vocabulary and third-person-present summary convention (DOC-01, DOC-05) |
| [rustdoc book — Unstable features](https://doc.rust-lang.org/rustdoc/unstable-features.html) | Establishes `doc(cfg)`/`doc_auto_cfg` are still nightly-gated (DOC-12) |
| [Cargo book — SemVer compatibility](https://doc.rust-lang.org/cargo/reference/semver.html) | Breaking/non-breaking classification and deprecate-before-remove (DOC-13) |
| [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) | The six fixed categories and the "for humans, not machines" framing (DOC-14) |
| [trycmd](https://docs.rs/trycmd/latest/trycmd/) | Snapshot-testing literal CLI transcripts, including cases extracted from README.md (DOC-15) |
| [docs.rs/tracing](https://docs.rs/tracing/latest/tracing/) | Span/event model and the explicit warning against holding `enter()` across `.await` (OBS-03) |
| [docs.rs/tracing `Instrument` trait](https://docs.rs/tracing/latest/tracing/trait.Instrument.html) | Re-enter-per-poll semantics, and the authoritative statement that `tokio::spawn` inherits no span (OBS-03, OBS-19) |
| [docs.rs/tracing attr.instrument](https://docs.rs/tracing/latest/tracing/attr.instrument.html) | `skip`/`skip_all`/`fields`/`err`/`ret` semantics, eager field evaluation, and that `err`/`ret` each emit their own event (OBS-04, OBS-21) |
| [docs.rs/tracing level_filters](https://docs.rs/tracing/latest/tracing/level_filters/index.html) | `max_level_*`/`release_max_level_*` strip call sites at compile time (OBS-25) |
| [docs.rs/tracing-subscriber EnvFilter](https://docs.rs/tracing-subscriber/latest/tracing_subscriber/filter/struct.EnvFilter.html) | Exact `RUST_LOG` directive grammar, including span-only field matching (OBS-08) |
| [docs.rs/tracing-subscriber Json](https://docs.rs/tracing-subscriber/latest/tracing_subscriber/fmt/format/struct.Json.html) | "Not optimized for human readability", no stability contract (OBS-11) |
| [OTel semantic conventions — HTTP spans](https://opentelemetry.io/docs/specs/semconv/http/http-spans/) | Span-per-wire-attempt convention, `http.request.resend_count`, and the MUST on redacting credentials and signed-URL parameters from `url.full` (OBS-18, OBS-20, OBS-22) |
| [OTel semantic conventions — OCI registry attributes](https://opentelemetry.io/docs/specs/semconv/registry/attributes/oci/) | The single standardized OCI attribute (`oci.manifest.digest`) and how thin the namespace still is (OBS-20) |
| [OTel semantic conventions — exceptions on spans (deprecated)](https://opentelemetry.io/docs/specs/semconv/exceptions/exceptions-spans/) | The industry's own move away from recording a handled error on every span it crosses (OBS-21) |
| [W3C Trace Context](https://www.w3.org/TR/trace-context/) | `traceparent`/`tracestate` format for propagating a client trace ID into registry calls (OBS-23) |
| [OCI Distribution Spec HTTP API](https://distribution.github.io/distribution/spec/api/) | Establishes there is no spec-defined request-ID or trace header — only `Docker-Content-Digest`/`Docker-Upload-UUID` (OBS-23) |
| [docs.rs/secrecy](https://docs.rs/secrecy/latest/secrecy/) | `SecretString` deliberately implements neither `Debug` nor `Display` (OBS-05, OBS-22) |
| [docs.rs/tracing-appender](https://docs.rs/tracing-appender/latest/tracing_appender/) | The `WorkerGuard` lifetime footgun (OBS-06) |
| [docs.rs/indicatif `MultiProgress`](https://docs.rs/indicatif/latest/indicatif/struct.MultiProgress.html) | `suspend` holds the bar lock for the whole closure — the cost that decides OBS-24's mechanism choice |
| [docs.rs/tracing-indicatif](https://docs.rs/tracing-indicatif/latest/tracing_indicatif/) | `IndicatifLayer`/`IndicatifWriter`, the off-the-shelf option OBS-24 permits but does not mandate |
| [Command Line Interface Guidelines](https://clig.dev/) | stdout/stderr separation and "don't treat stderr like a log file" (OBS-01, OBS-07) |
| [docs.rs/human-panic](https://docs.rs/human-panic/latest/human_panic/) | "We do not perform any automated error collection" — the zero-network default (OBS-13) |
| [docs.rs/vergen](https://docs.rs/vergen/latest/vergen/) | `VERGEN_*` build-metadata embedding for `--version` (OBS-15) |
| [`uv` `logging.rs`](https://github.com/astral-sh/uv/blob/main/crates/uv/src/logging.rs) | A real Rust package manager's subscriber setup and named verbosity levels (OBS-08, OBS-26) |
| [`oci-client`](https://docs.rs/oci-client/latest/oci_client/) | The reference Rust OCI client has no spans at all — establishes OBS-17/OBS-18 as synthesis, not transcription |

## Revision log

- **2026-08 — folded in `span-taxonomy-for-concurrent-io.md`** (the follow-up round this file
  commissioned as open question "Span taxonomy for concurrent OCI pulls"). Frontmatter
  `consolidates` extended and `revised: 2026-08` added.
- **Added OBS-17…OBS-26** (ten new IDs, continuing the OBS sequence; no existing number
  reused or moved). OBS-17 root span per invocation; OBS-18 span per retryable unit with a
  constant name; OBS-19 `.instrument()` across `tokio::spawn`; OBS-20 OTel semantic-convention
  field naming; OBS-21 single `err` report per failure; OBS-22 URL credential/signature
  redaction; OBS-23 `run_id` vs. registry request ID; OBS-24 one terminal owner, writer
  follows; OBS-25 compiled level ceiling matches the advertised flag; OBS-26 `--debug` vs.
  bug-report bundle, redaction unconditional in both.
- **Changed OBS-02 in place** — was "that writer resolves to stderr", now "the writer the
  OBS-24 ownership rule selects (stderr / file under a TUI / progress-aware), never
  `std::io::stdout`". *Why:* the follow-up's §9 and grim's existing `SwitchableWriter`
  ([main.rs:280-292](file:///home/mherwig/dev/grimoire/src/main.rs#L280)) make the old text
  factually wrong — it would flag grim's correct TUI log redirection as a violation. Contract
  preserved: the rule still means "the writer is explicit and never stdout."
- **Changed OBS-03 in place** — added `.instrument(span)` on the future as a third accepted
  form alongside `#[instrument]` and `.in_scope()`. *Why:* the follow-up documents
  `Instrument`'s re-enter-per-poll behaviour as equally safe; the previous text implied only
  two escapes existed. Meaning unchanged.
- **Changed OBS-04 in place** — `fields(...)` must now draw its names from the OBS-20
  vocabulary, and the rationale cites the 200-layer `Debug`-serialization cost. *Why:* field
  naming became governed this round; OBS-04 previously constrained field *cost* but not field
  *identity*.
- **Changed OBS-12 in place** — now states explicitly that the ban covers the
  `opentelemetry*` crates and **not** the semantic-convention naming, which OBS-20 requires.
  *Why:* without the clause, an agent reading OBS-12 and OBS-20 together sees a
  contradiction and will resolve it by dropping the field names.
- **Verdict:** item 6 rewritten to carry the "vocabulary yes, dependency no" split; items
  10, 11 and 12 added (span taxonomy settled; the latent spawn-orphan risk with the measured
  26/4/0 grep; terminal ownership, including the explicit overruling of the follow-up's
  "`tracing-indicatif` is the drop-in fix" in favour of ocx's existing `MultiProgress::suspend`
  ADR). Items 1–5 and 7–9 are unchanged.
- **Open questions:** removed "Span taxonomy for concurrent OCI pulls" from *Deserves another
  research round* — answered by this round (OBS-17…OBS-21). Remaining items renumbered 1–3.
  Added two narrower successors that the follow-up raised rather than closed: validate the
  synthesized span tree against real trace output (#4), and verify registry request-ID header
  names and `traceparent` handling against primary sources (#5). Added one human decision:
  whether a bug-report bundle should exist at all (OBS-26 specifies the shape, not the need).
- **Applied to OCX:** added grim's `log_switch`/`LogSinkGuard` as an *already satisfied*
  instance of OBS-24, ocx's progress ADR as another; added violations 9 (30 spawn sites, 0
  instrumented) and 10 (no `run_id` anywhere), both measured by grep this round.
- **AI-agent failure modes:** list re-ranked from 14 to 19 entries. Added the un-instrumented
  `tokio::spawn` at #4 (the follow-up names it the single most likely correctness gap because
  it is invisible in code review), duplicated error reporting at #7, per-call-site field-name
  invention at #10, digest-in-span-name at #15, and bare `fmt().init()` in a TUI binary at
  #16. No existing entry was removed; ranks shifted only.
- **Key sources:** added `tracing::Instrument`, `tracing::level_filters`, OTel HTTP spans,
  OTel OCI attributes, OTel exceptions-on-spans, W3C Trace Context, OCI Distribution Spec,
  indicatif `MultiProgress`, `tracing-indicatif`, `uv` `logging.rs`, and `oci-client`.
