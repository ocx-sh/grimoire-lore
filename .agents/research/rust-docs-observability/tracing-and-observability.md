---
title: Structured Logging, Tracing and Diagnosability for Rust CLIs
topic: observability
agent: rust-docs-observability
model: sonnet
date_researched: 2026-08
sources_count: 22
scope: >
  Covers the `tracing` ecosystem (spans/events, #[instrument], EnvFilter/RUST_LOG,
  subscriber layering, JSON output, file appenders, log-crate bridging), log-level
  semantics for CLIs, panic/crash reporting, build-metadata embedding, and
  OpenTelemetry export tradeoffs for short-lived processes. Does NOT cover
  full distributed-tracing backend setup (Jaeger/Tempo config), Prometheus
  server-side scraping, or non-Rust logging frameworks.
---

## Table of Contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [tracing vs log](#1-tracing-vs-log)
   2. [Spans, events, and async span-lifetime pitfalls](#2-spans-events-and-async-span-lifetime-pitfalls)
   3. [#[instrument]: options, cost, pitfalls](#3-instrument-options-cost-pitfalls)
   4. [tracing-subscriber: layers, Registry, composition](#4-tracing-subscriber-layers-registry-composition)
   5. [EnvFilter and RUST_LOG syntax](#5-envfilter-and-rust_log-syntax)
   6. [Log-level semantics for a CLI](#6-log-level-semantics-for-a-cli)
   7. [Verbosity flags: clap-verbosity-flag](#7-verbosity-flags-clap-verbosity-flag)
   8. [User-facing output must not go through the logger](#8-user-facing-output-must-not-go-through-the-logger)
   9. [JSON formatting and log-format stability](#9-json-formatting-and-log-format-stability)
   10. [tracing-appender: non-blocking writers and rolling files](#10-tracing-appender-non-blocking-writers-and-rolling-files)
   11. [tracing-error / SpanTrace](#11-tracing-error--spantrace)
   12. [tracing-log: bridging dependency `log` output](#12-tracing-log-bridging-dependency-log-output)
   13. [Redaction of secrets in spans and fields](#13-redaction-of-secrets-in-spans-and-fields)
   14. [OpenTelemetry in Rust: traces and metrics](#14-opentelemetry-in-rust-traces-and-metrics)
   15. [doctor/info subcommands and diagnostic bundles](#15-doctorinfo-subcommands-and-diagnostic-bundles)
   16. [Build metadata embedding (vergen)](#16-build-metadata-embedding-vergen)
   17. [RUST_BACKTRACE and panic reporting](#17-rust_backtrace-and-panic-reporting)
   18. [human-panic and sentry-rust](#18-human-panic-and-sentry-rust)
   19. [Testing observability](#19-testing-observability)
   20. [Performance cost of instrumentation](#20-performance-cost-of-instrumentation)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- `tracing` is span-and-event based, not just log-line based: spans have duration and nest, so causality survives across async boundaries — plain `log` cannot express this ([tracing docs](https://docs.rs/tracing/latest/tracing/)).
- Never hold a `Span::enter()` guard across an `.await` point — it produces incorrect/interleaved traces; use `#[instrument]` or `.in_scope()` for sync blocks instead ([tracing docs](https://docs.rs/tracing/latest/tracing/)).
- `#[instrument]` records every function argument as a field by default via `Debug` — this leaks large payloads, secrets, and anything without a cheap `Debug` unless you `skip`/`skip_all` it explicitly ([attr.instrument docs](https://docs.rs/tracing/latest/tracing/attr.instrument.html)).
- `RUST_LOG` directive syntax is `target[span{field=value}]=level`, comma-separated, most-specific-wins; a bare level with no target sets the ceiling for everything unmatched ([EnvFilter docs](https://docs.rs/tracing-subscriber/latest/tracing_subscriber/filter/struct.EnvFilter.html)).
- Subscribers compose via the `Layer` trait: stack a filter layer, a fmt/JSON layer, an `ErrorLayer`, and an OpenTelemetry layer independently on one `Registry` ([Layer docs](https://docs.rs/tracing-subscriber/latest/tracing_subscriber/layer/trait.Layer.html)).
- `clap-verbosity-flag`'s `Verbosity<L>` gives `-v`/`-vv`/`-q` for free; the default level is a compile-time type parameter (`ErrorLevel`, `WarnLevel`, `InfoLevel`, …), not a runtime default ([clap-verbosity-flag docs](https://docs.rs/clap-verbosity-flag/latest/clap_verbosity_flag/)).
- A CLI's primary/machine-readable output belongs on stdout; **all** logging, diagnostics, and progress belongs on stderr — this is a load-bearing convention for pipelines, not a style choice ([Command Line Interface Guidelines](https://clig.dev/), [Rust CLI Book](https://rust-cli.github.io/book/tutorial/output.html)).
- Don't print log-level labels (`WARN`, `ERR`) or timestamps to stderr by default outside verbose mode — that's noise for a human, signal only for a developer ([clig.dev](https://clig.dev/)).
- `tracing`'s JSON formatter is explicitly documented as **not** optimized for human reading and carries no documented format-stability guarantee — treat field names/shape as subject to change across `tracing-subscriber` versions ([Json formatter docs](https://docs.rs/tracing-subscriber/latest/tracing_subscriber/fmt/format/struct.Json.html)).
- `tracing-appender::non_blocking` returns a `WorkerGuard` that MUST be held for the process lifetime — drop it early (e.g. it falls out of scope in a helper function) and buffered log lines are silently lost, especially on early `return`/panic ([tracing-appender docs](https://docs.rs/tracing-appender/latest/tracing_appender/)).
- `tracing` itself has **no built-in redaction mechanism** for span/event fields — the official `Span::record` docs are silent on secrets; redaction is entirely the caller's responsibility (skip the field, or wrap the value in a type like `secrecy::SecretString` that has no `Debug`/`Display` impl) ([Span docs](https://docs.rs/tracing/latest/tracing/span/struct.Span.html), [secrecy docs](https://docs.rs/secrecy/latest/secrecy/)).
- Bridging `log`-based dependencies into `tracing` requires `tracing_log::LogTracer::init()`; pairing it with a subscriber that converts tracing events back to `log` records causes infinite recursion — pick one direction ([tracing-log docs](https://docs.rs/tracing-log/latest/tracing_log/)).
- `tracing-opentelemetry` bridges spans to OTel exporters via `tracing_opentelemetry::layer().with_tracer(tracer)`; for a short-lived CLI process the setup/flush cost and the "opentelemetry-rust is still evolving, breaking changes occur" warning both argue against enabling it by default ([tracing-opentelemetry docs](https://docs.rs/tracing-opentelemetry/latest/tracing_opentelemetry/)).
- Events/spans that no subscriber is interested in are never constructed — filtering is checked before allocation, so a well-configured `EnvFilter` makes disabled trace/debug logging cheap, but this does NOT make `#[instrument]`'s per-call field-expression evaluation free ([tracing perf notes](https://docs.rs/tracing/latest/tracing/#performance)).
- `human-panic::setup_panic!()` replaces Rust's raw panic output with a friendly message plus a local TOML crash report; it explicitly does no automated network collection — "we do not perform any automated error collection" ([human-panic docs](https://docs.rs/human-panic/latest/human_panic/)).
- `sentry-rust` must be initialized **before** the async runtime starts (before `#[tokio::main]`-style setup) so spawned threads inherit the hub, and PII capture is opt-in via `send_default_pii(true)` — off by default ([Sentry Rust docs](https://docs.sentry.io/platforms/rust/)).
- `RUST_BACKTRACE`/`RUST_LIB_BACKTRACE` are read once and cached — changing them at runtime after the first backtrace has no effect; capturing a backtrace is explicitly documented as "a quite expensive runtime operation" ([std::backtrace docs](https://doc.rust-lang.org/std/backtrace/index.html)).
- Real CLIs standardize a debug env var over ad hoc flags: `gh` uses `GH_DEBUG=1` or `GH_DEBUG=api` for HTTP-traffic-level detail; `uv` documents `-v`/`-vv` plus "configure fine-grained logging using `RUST_LOG`" directly in its `--help` text ([gh env docs](https://cli.github.com/manual/gh_help_environment), [uv CLI reference](https://docs.astral.sh/uv/reference/cli/)).
- `#[traced_test]` from `tracing-test` captures tracing output per-test and exposes `logs_contain(&str)`/`logs_assert(...)`; by default it filters to your own crate only (`no-env-filter` feature widens it) ([tracing-test docs](https://docs.rs/tracing-test/latest/tracing_test/)).

## Findings

### 1. tracing vs log

`tracing` is a superset built for structured, causal diagnostics: it models **spans** (a period of time, can nest, carries typed fields) in addition to **events** (a single moment, roughly a `log` record). `log` only has flat, unstructured text records with no notion of "this happened while processing request X." Tracing can interoperate with `log` in both directions (see §12), and its own macros (`info!`, `warn!`, etc.) look identical to `log`'s, which is precisely why crates get miswired — see [AI-agent angle](#ai-agent-angle) ([tracing crate docs](https://docs.rs/tracing/latest/tracing/)).

### 2. Spans, events, and async span-lifetime pitfalls

```rust
// WRONG — holding the guard across an .await produces interleaved/incorrect traces
let span = tracing::info_span!("fetch");
let _guard = span.enter();
let body = client.get(url).send().await?;   // guard is still "entered" here
```

```rust
// CORRECT — either use #[instrument] on the async fn, or re-enter per poll
#[tracing::instrument]
async fn fetch(client: &Client, url: &str) -> Result<Body> {
    client.get(url).send().await
}
```

The docs are explicit: *"In asynchronous code that uses async/await syntax, `Span::enter` may produce incorrect traces if the returned drop guard is held across an await point."* ([tracing crate docs](https://docs.rs/tracing/latest/tracing/)). `#[instrument]` handles this correctly for you because it re-enters the span around each poll of the generated future.

### 3. #[instrument]: options, cost, pitfalls

```rust
#[tracing::instrument(
    level = "debug",
    skip(self, raw_manifest),           // omit large/non-Debug args
    fields(digest = %manifest.digest),  // add a derived field, %=Display, ?=Debug
    err(level = "warn"),                // log Err returns at WARN
    ret(Display),                       // log Ok returns via Display, not Debug
)]
async fn pull_layer(&self, raw_manifest: &[u8], manifest: &Manifest) -> Result<PathBuf> {
    ...
}
```

- `skip(args...)` / `skip_all` — required whenever an argument lacks `Debug`, is large, or is sensitive (tokens, file bytes). Every un-skipped argument is recorded via `Debug` at function entry.
- `err` (default `Display`) / `err(Debug)` / `err(level = Level::WARN)` — emits an event only on `Result::Err`.
- `ret` / `ret(Display)` — emits an event with the return value; for `Result` only the `Ok` variant is recorded.
- Field expressions in `fields(...)` are evaluated on every call, so they add real per-call cost, not just when the span level is enabled — avoid in hot loops.
- Cannot instrument `const fn`.
([attr.instrument docs](https://docs.rs/tracing/latest/tracing/attr.instrument.html))

### 4. tracing-subscriber: layers, Registry, composition

```rust
use tracing_subscriber::{prelude::*, EnvFilter};

let json_layer = tracing_subscriber::fmt::layer()
    .json()
    .with_writer(std::io::stderr);

tracing_subscriber::registry()
    .with(EnvFilter::from_default_env())
    .with(json_layer)
    .with(tracing_error::ErrorLayer::default())
    .init();
```

Layers compose independently: a filter layer decides what's *enabled*, a fmt/JSON layer decides *how it's rendered*, an `ErrorLayer` captures `SpanTrace`s for errors, and (optionally) an OTel layer exports spans — all on the same `Registry` ([Layer trait docs](https://docs.rs/tracing-subscriber/latest/tracing_subscriber/layer/trait.Layer.html)).

### 5. EnvFilter and RUST_LOG syntax

Directive grammar: `target[span{field=value}]=level`, comma-separated, e.g.:

```
RUST_LOG=warn,ocx_core=debug,ocx_core::registry[pull{digest}]=trace
```

- A directive with no level (`my_crate::module`) enables everything matched, equivalent to `=trace`.
- A directive with only a level (`warn`) sets the ceiling for anything not otherwise matched.
- Non-literal field values are matched as regex by default (disable via `Builder::with_regex(false)`).
- The default env var read by `EnvFilter::from_default_env()` is `RUST_LOG`; use `EnvFilter::from_env("OCX_LOG")` for a custom var name.
([EnvFilter docs](https://docs.rs/tracing-subscriber/latest/tracing_subscriber/filter/struct.EnvFilter.html))

### 6. Log-level semantics for a CLI

A concrete mapping for a package-manager-style CLI (grim/ocx):

| Level | Belongs here | Example |
|---|---|---|
| `error` | Operation failed, process will exit non-zero | "failed to resolve `ghcr.io/x/y:latest`: 404" |
| `warn` | Degraded but continuing | "lockfile entry missing digest, falling back to tag resolution" |
| `info` | Coarse operational milestones a `-v` user wants | "pulled 3 layers (12.4 MiB) in 840ms" |
| `debug` | Per-request/per-file detail for the maintainer, not the end user | "cache hit for blob sha256:abcd…, skipping fetch" |
| `trace` | Everything, including loop bodies and raw wire data | "HTTP request headers: {..}" |

This table is a synthesis of the CLI-guideline sources' principles (§8) applied to this project's domain — not a direct quote.

### 7. Verbosity flags: clap-verbosity-flag

```rust
#[derive(clap::Parser)]
struct Cli {
    #[command(flatten)]
    verbosity: clap_verbosity_flag::Verbosity<clap_verbosity_flag::ErrorLevel>,
}
```

`-q` silences everything, no flag = `ErrorLevel` default (errors only), `-v` = warn, `-vv` = info, `-vvv` = debug, `-vvvv` = trace. Pass `cli.verbosity` into `tracing_subscriber::fmt().with_max_level(...)`, or call `.log_level_filter()` for `env_logger`-based setups. The generic parameter (`ErrorLevel`/`WarnLevel`/`InfoLevel`/…) picks the *default* level and must be chosen per-binary, not left at the crate default blindly ([clap-verbosity-flag docs](https://docs.rs/clap-verbosity-flag/latest/clap_verbosity_flag/)).

### 8. User-facing output must not go through the logger

```rust
// WRONG — the "did work" summary is the CLI's primary output; routing it
// through tracing means it vanishes if the user set RUST_LOG=error, and it
// gets an unwanted "2026-08-14T10:03:11Z INFO ocx::pull:" prefix otherwise.
tracing::info!("pulled ghcr.io/foo/bar:1.0.0");

// RIGHT — primary output goes straight to stdout, unconditionally
println!("pulled ghcr.io/foo/bar:1.0.0");
tracing::debug!(target: "ocx::pull", digest = %digest, "pull complete");
```

*"The primary output for your command should go to `stdout`… Log messages, errors, and so on should all be sent to `stderr`."* And: *"Don't treat `stderr` like a log file, at least not by default. Don't print log level labels… unless in verbose mode."* ([clig.dev](https://clig.dev/), [Rust CLI Book](https://rust-cli.github.io/book/tutorial/output.html)).

### 9. JSON formatting and log-format stability

```json
{"timestamp":"2022-02-15T18:47:10.821315Z","level":"INFO","fields":{"message":"pulled layer","digest":"sha256:abcd"},"target":"ocx_core::pull"}
```

Options: `.flatten_event(true)` promotes `fields` into the root object; `.with_span_list(false)` drops the full span chain from output. The docs state the JSON output *"is not optimized for human readability; instead, it should be pretty-printed using external JSON tools such as `jq`"* — and document no schema-stability contract, so any tool consuming this JSON downstream (log shippers, tests) is coupling to an unversioned shape ([Json formatter docs](https://docs.rs/tracing-subscriber/latest/tracing_subscriber/fmt/format/struct.Json.html)).

### 10. tracing-appender: non-blocking writers and rolling files

```rust
let file_appender = tracing_appender::rolling::daily("/var/log/ocx", "ocx.log");
let (non_blocking, _guard) = tracing_appender::non_blocking(file_appender);
tracing_subscriber::fmt().with_writer(non_blocking).init();
// `_guard` must live until process exit — store it in `main`'s scope, not a helper.
```

The `WorkerGuard` "ensures buffered logs are flushed to their output in the case of abrupt terminations" — dropping it early silently loses buffered lines. Rotation strategies: `Rotation::HOURLY`, `::DAILY`, `::NEVER` ([tracing-appender docs](https://docs.rs/tracing-appender/latest/tracing_appender/)).

### 11. tracing-error / SpanTrace

```rust
use tracing_error::prelude::*;
std::fs::read_to_string("myfile.txt").in_current_span()?;
```

`tracing_error::ErrorLayer` (added to the subscriber, see §4) enables capturing a `SpanTrace` — the chain of active spans at error time — without replacing `anyhow`/`eyre`; you attach it via `in_current_span()` or the `ExtractSpanTrace` trait and print it via `Display`/`Debug` ([tracing-error docs](https://docs.rs/tracing-error/latest/tracing_error/)).

### 12. tracing-log: bridging dependency `log` output

```rust
tracing_log::LogTracer::init()?;
log::trace!("emitted by a `log`-only dependency, now visible to tracing subscribers");
```

Required whenever a dependency (e.g. an HTTP client using `log`) should show up in your `tracing` output. **Do not** also configure a subscriber that turns `tracing` events back into `log` records — that creates infinite recursion between `LogTracer` and the reverse bridge ([tracing-log docs](https://docs.rs/tracing-log/latest/tracing_log/)).

### 13. Redaction of secrets in spans and fields

`tracing` itself provides no redaction: the `Span::record` docs describe only *that* a field value is recorded, with no mention of formatting safety or PII ([Span docs](https://docs.rs/tracing/latest/tracing/span/struct.Span.html)). Two correct patterns:

```rust
// Pattern A — skip it, full stop
#[tracing::instrument(skip(auth_token))]
fn authenticate(auth_token: &str) { ... }

// Pattern B — wrap it in a type with no Debug/Display, so accidental
// instrumentation is a compile error, not a leak
use secrecy::{SecretString, ExposeSecret};
struct Config { token: SecretString }
// tracing::instrument would fail to compile on `token: SecretString` unless skipped —
// SecretBox/SecretString deliberately implement neither Debug nor Display.
```
([secrecy docs](https://docs.rs/secrecy/latest/secrecy/))

### 14. OpenTelemetry in Rust: traces and metrics

```rust
let provider = SdkTracerProvider::builder()
    .with_simple_exporter(opentelemetry_stdout::SpanExporter::default())
    .build();
let tracer = provider.tracer("ocx");
let telemetry = tracing_opentelemetry::layer().with_tracer(tracer);
Registry::default().with(telemetry).init();
```

`tracing-opentelemetry::layer()` converts `tracing` spans to OTel spans, recognizing special fields (`otel.name`, `otel.kind`, `otel.status_code`) ([tracing-opentelemetry docs](https://docs.rs/tracing-opentelemetry/latest/tracing_opentelemetry/)). The metrics API (`opentelemetry::metrics`) offers `Counter`, `Histogram`, `Gauge`, `UpDownCounter`, and async/observable variants via a `Meter` ([opentelemetry metrics docs](https://docs.rs/opentelemetry/latest/opentelemetry/metrics/index.html)). For a short-lived CLI invocation (typical: seconds, exits after one command), full OTel export adds provider/exporter setup and a flush-on-shutdown requirement for no local benefit — it earns its keep only when the CLI is embedded in a server/daemon mode (e.g. ocx-mirror running continuously) or when the org already runs a collector every invocation can ship to.

### 15. doctor/info subcommands and diagnostic bundles

- `gh` uses an env var, not a subcommand, for HTTP-level debug detail: `GH_DEBUG=1` for general verbose stderr output, `GH_DEBUG=api` additionally logs HTTP traffic; `DEBUG=1/true/yes` is a deprecated alias ([gh env docs](https://cli.github.com/manual/gh_help_environment)).
- `uv` documents `-v`/`-vv` in `--help` text itself with an explicit escape hatch: *"You can configure fine-grained logging using the `RUST_LOG` environment variable"* — i.e. the flag gives coarse control, `RUST_LOG` gives full `EnvFilter` control to power users. `uv cache dir` prints the resolved cache path (platform-dependent: `$XDG_CACHE_HOME/uv`, `%LOCALAPPDATA%\uv\cache`) as a one-shot diagnostic command, not a doctor-style health check ([uv CLI reference](https://docs.astral.sh/uv/reference/cli/)).
- The `clig.dev` guideline generalizes this: *"If there is an unexpected or unexplainable error, provide debug and traceback information… Consider writing the debug log to a file instead of printing it to the terminal"* — i.e. a bug-report bundle (file) beats a terminal dump ([clig.dev](https://clig.dev/)).

### 16. Build metadata embedding (vergen)

```rust
// build.rs
use vergen::{Emitter, Build, Cargo, Rustc};
Emitter::default()
    .add_instructions(&Build::all_build())?
    .add_instructions(&Cargo::all_cargo())?
    .add_instructions(&Rustc::all_rustc())?
    .emit()?;
```

Exposes `env!("VERGEN_GIT_SHA")`, `VERGEN_BUILD_TIMESTAMP`, `VERGEN_RUSTC_SEMVER`, `VERGEN_CARGO_OPT_LEVEL`, etc. for embedding into `--version` output — standard for reproducing a user's exact build when triaging a bug report ([vergen docs](https://docs.rs/vergen/latest/vergen/)).

### 17. RUST_BACKTRACE and panic reporting

`RUST_LIB_BACKTRACE` takes precedence over `RUST_BACKTRACE`; both are read once and **cached** — setting them after a backtrace has already been captured once has no effect for the rest of the process. Capturing is explicitly costly (*"a quite expensive runtime operation"*), so it is opt-in, not automatic, for `std::backtrace::Backtrace::capture()` (use `force_capture()` to bypass the env-var check entirely, e.g. inside your own error type) ([std::backtrace docs](https://doc.rust-lang.org/std/backtrace/index.html)).

### 18. human-panic and sentry-rust

```rust
fn main() {
    human_panic::setup_panic!();
    // ...
}
```

Replaces the raw `thread 'main' panicked at ...` output with a friendly message plus a local TOML crash-report file; explicitly *"does not perform any automated error collection"* — no network call ([human-panic docs](https://docs.rs/human-panic/latest/human_panic/)). If opt-in telemetry is wanted instead, `sentry-rust`:

```rust
let _guard = sentry::init(sentry::ClientOptions::new().dsn(dsn));
// must run before the async runtime starts — spawned threads inherit the hub
```

PII (user IPs, sensitive headers) is opt-in via `.send_default_pii(true)`, off by default ([Sentry Rust docs](https://docs.sentry.io/platforms/rust/)). For a security-sensitive OCI package manager, human-panic's zero-network default is the safer starting posture; Sentry-style reporting should require explicit user consent (a config flag or first-run prompt), never be on by default.

### 19. Testing observability

```rust
#[tokio::test]
#[tracing_test::traced_test]
async fn resolves_digest() {
    tracing::info!("resolving digest for ghcr.io/foo/bar:1.0.0");
    assert!(logs_contain("resolving digest"));
}
```

`#[traced_test]` captures output per-test and injects `logs_contain(&str) -> bool` and `logs_assert(f)`. By default it filters to your own crate (`RUST_LOG=<your_crate>=trace` equivalent); the `no-env-filter` feature widens capture to dependencies too ([tracing-test docs](https://docs.rs/tracing-test/latest/tracing_test/)).

### 20. Performance cost of instrumentation

The framework's stated design principle: *"For performance reasons, if no currently active subscribers express interest in a given set of metadata by returning `true`, then the corresponding `Span` or `Event` will never be constructed."* — i.e. a disabled `trace!()` behind a restrictive `EnvFilter` is close to free at the call site, because interest is checked before field values are even formatted. This does not cover `#[instrument]`'s `fields(...)` expressions, which are evaluated eagerly at function entry regardless of whether the span ends up enabled — keep those expressions cheap or gate them behind `skip_all` + manual `Span::current().record()` inside an `if enabled` check. Compile-time ceilings (`max_level_off`, `release_max_level_*`, `static_max_level_*` feature flags on the `tracing` crate) strip disabled call sites at compile time rather than runtime, but this project's `docs.rs` page did not enumerate their exact semantics in the fetched excerpt — verify against `Cargo.toml` feature docs before relying on the exact flag list ([tracing performance notes](https://docs.rs/tracing/latest/tracing/#performance)).

## Normative guidance candidates

1. **Never route a CLI's primary/machine-readable output through `tracing`/`log` — use `println!`/stdout directly.** Rationale: piping breaks and output vanishes under `RUST_LOG=error` or `-q` otherwise. Verify: `grep -rn 'tracing::info!\|log::info!' src/ | xargs -I{} echo {}` then manually confirm none of those lines are the thing the user asked for (e.g. a resolved digest, a printed path) rather than a diagnostic.
2. **All `tracing`/`log` output goes to stderr, never stdout.** Rationale: stdout is reserved for pipeable primary output. Verify: subscriber init must use `.with_writer(std::io::stderr)` (or the `non_blocking` equivalent) — `grep -rn 'with_writer' src/` and confirm no stdout writer for the default logger.
3. **Every `#[instrument]`-annotated function on a hot/per-item path must `skip` or `skip_all` large, non-Debug, or secret arguments explicitly — never rely on the default "record everything."** Rationale: defaults leak secrets and blow up log volume. Verify: `grep -rn '#\[instrument' src/ -A1` and check each one either has `skip`/`skip_all` or every argument is small, `Copy`, and non-sensitive by inspection.
4. **Never hold a `Span::enter()` guard across an `.await` — use `#[instrument]` on the async fn or `.in_scope()` for the sync portion only.** Rationale: produces incorrect/interleaved traces per the crate's own docs. Verify: `grep -rn '\.enter()' src/` then check none of the enclosing scopes contain a `.await` before the guard drops.
5. **Any type carrying credentials, tokens, or registry auth (anything used to talk to ghcr.io) must not implement `Debug`/`Display` directly — wrap it in `secrecy::SecretString` or a local newtype that deliberately omits both.** Rationale: makes accidental instrumentation/logging of secrets a compile error instead of a leak. Verify: `grep -rn 'token\|password\|credential\|secret' src/ --include=*.rs -l` then confirm each such field's type has no derived `Debug`.
6. **A `WorkerGuard` returned by `tracing_appender::non_blocking(...)` must be bound in `main` (or held for the process's full lifetime), never dropped inside a setup helper function.** Rationale: an early-dropped guard silently discards buffered log lines, especially on panics. Verify: grep for `non_blocking(` and trace the guard variable's binding scope back to `fn main`.
7. **Verbosity is controlled by `-v`/`-vv`/`-q` via `clap_verbosity_flag::Verbosity<L>`, never by a bespoke `--log-level <string>` flag or a raw `RUST_LOG` requirement for normal use.** Rationale: consistency with the wider Rust CLI ecosystem (uv, ripgrep-family tools); `RUST_LOG` remains available as the power-user escape hatch. Verify: `grep -rn 'Verbosity<' src/` exists, and `--help` output shows `-v`/`-q`, not a custom level enum.
8. **JSON log output (when enabled) must be treated as unversioned wire format for internal debugging only — never assert on its exact field layout in a stability-guaranteeing way, and never ship it as a documented public contract without an explicit schema/version field added by the caller.** Rationale: `tracing-subscriber`'s JSON formatter documents no stability guarantee. Verify: search docs/README for any promise like "our JSON log format is stable" — if found without a versioning scheme, flag it.
9. **`#[instrument]` `fields(...)` expressions must be cheap (no allocation, no I/O, no network) because they run on every call regardless of whether the span is enabled.** Rationale: EnvFilter's "never constructed if disabled" optimization does not cover eager field-expression evaluation. Verify: read each `fields(...)` expression in a `grep -rn '#\[instrument' -A3` scan for anything beyond a field access, cheap `%`/`?` formatting, or trivial arithmetic.
10. **A panic-reporting story must default to zero network calls (e.g. `human_panic::setup_panic!()`); any Sentry-style remote crash reporting must be opt-in and gated by explicit user consent, never enabled by a build default.** Rationale: this is a security-sensitive package manager talking to a registry — silent telemetry is a trust liability. Verify: `grep -rn 'sentry::init\|sentry_tracing' src/` and confirm it's behind a config flag read at runtime, not called unconditionally in `main`.

## AI-agent angle

- **Reaching for `log::info!`/`env_logger` out of habit instead of `tracing`.** Both compile and both "work," so an agent won't notice it picked the weaker one — check: `grep -rn 'use log::\|env_logger' src/` in a codebase that otherwise uses `tracing` is a same-project inconsistency worth flagging.
- **Writing `#[instrument]` on every function reflexively, including hot inner-loop helpers, without `skip`/`skip_all`.** This compiles fine and looks thorough, but silently records every argument via `Debug` on every call — a classic "looks careful, is actually a leak/perf regression." Check: any `#[instrument]` inside a loop body or called per-item (per-blob, per-layer) without `skip_all` plus explicit minimal `fields(...)`.
- **Holding `span.enter()` across `.await` in generated async code** — this is exactly the pattern an LLM produces when it mechanically translates a sync-code tracing pattern into an async fn without knowing about the pitfall documented in §2. Check: any `let _guard = ....enter();` followed later in the same block by `.await`.
- **Fabricating a `tracing_subscriber::fmt().json().pretty()` combination** — `.json()` and `.pretty()` are mutually exclusive formatters on the fmt layer; an agent pattern-matching on "I want JSON but also readable" will sometimes chain both, which either fails to compile or silently picks one, depending on version. Check: `grep -rn '\.json()' src/ -A2 -B2` for a nearby `.pretty()` on the same builder chain.
- **Assuming `RUST_LOG` directives filter *events* only, then wondering why span-level filtering by `field=value` "doesn't work."** Field-value filtering in `EnvFilter` only applies to *spans*, matched at span-creation time from fields declared in `span!`/`#[instrument] fields(...)` — not to arbitrary event fields. Check: any directive with `{field=value}` in a code comment or doc string next to an `event!`/`info!` call rather than a `span!`/`#[instrument]`.
- **Inventing OpenTelemetry as the default answer to "add observability" for a short CLI.** An agent asked to "add tracing/observability" will often reach straight for `tracing-opentelemetry` + a collector, which is disproportionate for a binary that runs for milliseconds-to-seconds per invocation (see §14). Check: any new `opentelemetry*` dependency added without an accompanying justification for a long-running/daemon mode (ocx-mirror is the one legitimate candidate in this family; grim/ocx CLI invocations are not).
- **Logging secrets because `#[instrument]`'s default "record all args via Debug" silently includes an auth token parameter the agent didn't think to `skip`.** Check: rule 3/5 above — any instrumented function with a token/credential-shaped parameter not present in a `skip(...)` list.

## Contested / evolving

- **Whether `tracing`'s `log` compatibility feature (`log` vs `log-always`) should be enabled by default in a binary crate.** The `log` feature only emits log records if no `tracing` subscriber is set (good for libraries, avoids double emission); `log-always` always emits both. Practice trends toward leaving this off entirely in application crates and instead using `tracing-log::LogTracer` explicitly at the boundary, giving full control over the bridge direction ([tracing perf/feature notes](https://docs.rs/tracing/latest/tracing/#performance), [tracing-log docs](https://docs.rs/tracing-log/latest/tracing_log/)).
- **JSON log schema stability.** No source found documents a stability promise for `tracing-subscriber`'s built-in JSON formatter; teams needing a stable schema increasingly roll a custom `FormatEvent` implementation or a dedicated `tracing-serde`-based layer rather than depending on the built-in shape verbatim — this project's fetched sources show the gap but not yet a single dominant replacement pattern.
- **Compile-time `static_max_level_*` feature flags** were referenced by the `tracing` crate's own doc index but not spelled out in the fetched performance section — their exact interaction with `release_max_level_*` (debug vs release profile) needs verification directly against the `Cargo.toml` `[features]` table in a pinned `tracing` version before being written into a hard rule; treat as evolving/under-verified in this document.
- **OpenTelemetry-in-Rust churn.** `tracing-opentelemetry`'s own docs flag that the underlying `opentelemetry` crate "is still evolving, so some breaking changes may occur" — treat any OTel-export code as needing a version-pin and periodic re-check, not a "set and forget" integration.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [docs.rs/tracing](https://docs.rs/tracing/latest/tracing/) | `tracing` crate root docs | current (latest) | Primary source for spans/events/subscriber model and the async-span-guard warning |
| [docs.rs/tracing attr.instrument](https://docs.rs/tracing/latest/tracing/attr.instrument.html) | `#[instrument]` macro reference | current | Authoritative on skip/fields/err/ret options and their exact syntax |
| [docs.rs/tracing #performance](https://docs.rs/tracing/latest/tracing/#performance) | tracing crate performance section | current | States the "never constructed if disabled" filtering guarantee |
| [docs.rs/tracing Span](https://docs.rs/tracing/latest/tracing/span/struct.Span.html) | `Span` type docs | current | Confirms no built-in redaction guidance exists — used to justify rule 5 |
| [docs.rs/tracing-subscriber EnvFilter](https://docs.rs/tracing-subscriber/latest/tracing_subscriber/filter/struct.EnvFilter.html) | `EnvFilter` reference | current | Exact RUST_LOG directive grammar, primary source |
| [docs.rs/tracing-subscriber Layer](https://docs.rs/tracing-subscriber/latest/tracing_subscriber/layer/trait.Layer.html) | `Layer` trait reference | current | How to compose fmt/filter/error/otel layers on one Registry |
| [docs.rs/tracing-subscriber Json](https://docs.rs/tracing-subscriber/latest/tracing_subscriber/fmt/format/struct.Json.html) | JSON formatter reference | current | Explicit "not for human reading" statement and lack of stability guarantee |
| [docs.rs/tracing-appender](https://docs.rs/tracing-appender/latest/tracing_appender/) | non-blocking writer + rolling file appender | current | WorkerGuard lifetime pitfall is documented here directly |
| [docs.rs/tracing-error](https://docs.rs/tracing-error/latest/tracing_error/) | SpanTrace / ErrorLayer reference | current | Primary source for span-context-on-error pattern |
| [docs.rs/tracing-log](https://docs.rs/tracing-log/latest/tracing_log/) | log→tracing bridge | current | Documents the infinite-recursion footgun when bridging both directions |
| [docs.rs/tracing-opentelemetry](https://docs.rs/tracing-opentelemetry/latest/tracing_opentelemetry/) | tracing↔OTel bridge | current | Setup example and the "still evolving" stability caveat |
| [docs.rs/opentelemetry metrics](https://docs.rs/opentelemetry/latest/opentelemetry/metrics/index.html) | OTel metrics API | current | Instrument types (Counter/Histogram/Gauge/Meter) for the metrics subarea |
| [docs.rs/clap-verbosity-flag](https://docs.rs/clap-verbosity-flag/latest/clap_verbosity_flag/) | `-v/-vv/-q` flag helper | current | Primary source for the verbosity-flag-to-level mapping and generic default level |
| [docs.rs/human-panic](https://docs.rs/human-panic/latest/human_panic/) | friendly panic handler | current | "No automated error collection" privacy statement, setup_panic! usage |
| [docs.rs/vergen](https://docs.rs/vergen/latest/vergen/) | build-metadata embedding | current | Exact `VERGEN_*` env vars and build.rs pattern for `--version` output |
| [docs.rs/tracing-test](https://docs.rs/tracing-test/latest/tracing_test/) | test-time log assertions | current | `#[traced_test]`, `logs_contain`, default per-crate filtering behavior |
| [docs.rs/secrecy](https://docs.rs/secrecy/latest/secrecy/) | secret-wrapping types | current | `SecretString` deliberately has no Debug/Display — basis for redaction rule |
| [doc.rust-lang.org std::backtrace](https://doc.rust-lang.org/std/backtrace/index.html) | stdlib backtrace API | current (std docs) | RUST_BACKTRACE/RUST_LIB_BACKTRACE precedence, caching, and cost |
| [Command Line Interface Guidelines](https://clig.dev/) | cross-language CLI design guide | actively maintained | stdout/stderr separation, "don't treat stderr like a log file" principle |
| [Rust CLI Book — Output](https://rust-cli.github.io/book/tutorial/output.html) | official Rust CLI working-group tutorial | actively maintained | Rust-specific stdout/stderr and `log`-crate-vs-`println!` guidance |
| [gh CLI environment reference](https://cli.github.com/manual/gh_help_environment) | GitHub CLI manual | actively maintained | Real-world debug-env-var precedent (`GH_DEBUG`, `GH_DEBUG=api`) |
| [uv CLI reference](https://docs.astral.sh/uv/reference/cli/) | Astral uv docs | actively maintained | Real-world precedent for `-v/-vv` plus `RUST_LOG` escape hatch, `uv cache dir` |
| [Sentry Rust SDK docs](https://docs.sentry.io/platforms/rust/) | Sentry's official Rust integration guide | actively maintained | Init-before-runtime requirement, opt-in PII flag |
