---
title: "The Rust library ecosystem: what to depend on in 2026"
topic: rust-crate-defaults
agent: inv-ecosystem
model: sonnet
date_researched: 2026-08
sources_count: 29
scope: >
  Default-crate inventory for a family of Rust CLI package managers over OCI
  registries (grim, ocx, ocx-mirror, plus a Python-binding crate): CLI/TUI,
  HTTP/TLS, OCI clients, serialization, errors/logging/tracing, async
  runtimes, filesystem, compression/hashing, time/uuid/rand, config/secrets,
  process/signals, testing/mocking, Python interop. Excludes clippy/CI/release
  tooling, test-runner/fuzzing mechanics, workspace architecture,
  supply-chain/audit tooling, benchmarking, and docs tooling — those are
  covered by sibling research topics.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)
7. [Inventory](#inventory)
8. [Candidate topics](#candidate-topics)

## Summary

1. `async-std` is discontinued — its own README says "use `smol` instead." Any code or LLM suggestion that imports `async_std::*` is dead-end advice in 2026.
2. `bincode` is reported unmaintained on its registry listing after a maintainer incident; its final `3.0.0` ships only docs and a compile-time error. Default to `postcard` (compact, no_std-friendly) or `rmp-serde` (MessagePack) for new binary-serde work.
3. `serde_yaml` has carried a `+deprecated` version suffix since `0.9.34` (Mar 2024) and says "no longer maintained," yet still pulls ~30M downloads/month because nobody has migrated existing dependents. New YAML code should use `serde_yaml_ng` (drop-in fork) or `serde_norway`, not `serde_yaml`.
4. `ansi_term` is unmaintained since 2019; the 2026 default terminal-styling stack is `anstream` + `anstyle` (+ `anstyle-query`, `colorchoice`) — the same infrastructure `clap` itself uses for its own colour output.
5. `ratatui` is not "yet another TUI crate," it is the maintained continuation of `tui-rs`, which is archived. Any reference to `tui-rs` in a dependency graph is legacy.
6. `rustls` moved to a pluggable `CryptoProvider` model starting at `0.23`; the ecosystem default provider is `aws-lc-rs` (not `ring`, which was the pre-2024 default). Code built against `reqwest`/`rustls` that doesn't explicitly install a provider panics at runtime with "no process-level CryptoProvider available" — a very common 2024-2025 migration bug.
7. `rand` renamed its core RNG methods in `0.9` (`Rng::gen` → `Rng::random`, `gen_range` → `random_range`) because `gen` became reserve-adjacent under the 2024 edition; by research date the crate is already at `0.10`, so any LLM-generated `rng.gen()` call is two majors stale.
8. `oci-distribution` was renamed `oci-client`; it is the field-default Rust OCI registry client (actively released, 0.17 in May 2026) and is worth reusing for manifest/auth types even where this project's own registry logic diverges.
9. `dotenv` is unmaintained; use `dotenvy`, its maintained fork, for `.env` loading.
10. `fs2` is not dead but is superseded in practice by `fs4`, its fork that drops `libc` for `rustix` and adds async-runtime support for file locking.
11. `directories` (ProjectDirs, per-app config/cache/data paths) and `dirs` (raw XDG/Known-Folder lookups) are both actively maintained by the same org; pick by need, not by which is "newer."
12. `uuid` supports UUIDv7 (time-ordered, DB-index-friendly) behind the `v7` feature; defaulting to `Uuid::new_v4()` for anything that becomes a primary key or sort key is a habit worth breaking.
13. `jiff` (BurntSushi, 2024) is the modern, DST-correct datetime library gaining real adoption (≈20M downloads/month and rising); `chrono` remains the incumbent with the bigger integration ecosystem (serde/sqlx/diesel) but documents known gaps (no bundled timezone data, well-known footguns in naive-to-aware arithmetic).
14. `governor` (GCRA algorithm) is the default rate-limiting crate; `backon` is the current recommended retry/backoff crate over the effectively-frozen `backoff` crate and the forked `tokio-retry2`.
15. `hyper` `1.x` (stable since Jan 2025) removed the old built-in high-level `Client`/`Server` types that `0.14`-era code and most LLM training data assume; use `reqwest` for a high-level client or `hyper-util` for low-level `1.x` composition.
16. `ureq` `3.0` (2025 rewrite) is still deliberately blocking/sync-only — it is not an async client — but is a legitimate lightweight alternative to `reqwest` when a tool doesn't otherwise need Tokio.
17. `camino`'s `Utf8Path`/`Utf8PathBuf` are worth adopting anywhere paths are already assumed UTF-8 (OCI refs, manifest paths, config keys) to stop re-litigating `.to_str().unwrap()` at every boundary.
18. `blake3` is markedly faster than `sha2`/`sha3`/`blake2` for internal content-addressing, but OCI digests are contractually `sha256` (occasionally `sha512`) per spec — `sha2` stays mandatory for registry-facing digests regardless of what an internal CAS layer uses.
19. `wiremock` is async-only and Tokio-native, making it the natural fit for mocking `ghcr.io`-style HTTP interactions in tests; `mockito` is the sync/async alternative when a suite isn't fully async.
20. `pyo3`'s `Bound<'py, T>` GIL-bound API (introduced `0.21`, 2024) replaced the legacy `&PyAny`/GIL-ref API; pre-2024 pyo3 code and most LLM training examples use the deprecated pattern.

## Findings

### 1. CLI, terminal styling, progress, TUI

`clap` remains the unchallenged default CLI parser (derive + builder, ~72M downloads/month) — `structopt` was merged into `clap` 3.0 years ago and is legacy. Shell completions are generated at build- or run-time via `clap_complete` (bash/zsh/fish/PowerShell/Elvish; Nushell via the separate `clap_complete_nushell`), man pages via `clap_mangen`. [clap on lib.rs](https://lib.rs/crates/clap).

Terminal colour handling has consolidated around the `anstream`/`anstyle` family (`anstyle-query` for capability detection, `colorchoice` for the `--color=auto|always|never` convention) — this is literally the infrastructure `clap` itself uses for its own help-text colouring, so a `clap`-based tool that also wants coloured output elsewhere should reuse the same stack rather than adding a second styling crate. `ansi_term`, still recommended by a lot of older tutorials, is explicitly unmaintained (last release 2019) and its own listing points at `anstream`, `owo-colors`, `nu-ansi-term`, `console`, and `colored` as the maintained replacements. [ansi_term on lib.rs](https://lib.rs/crates/ansi_term), [anstream on lib.rs](https://lib.rs/crates/anstream).

`indicatif` remains the default progress-bar/spinner crate with no serious challenger; no recent breaking churn to flag.

`ratatui` is the 2026 TUI default, and its ancestry matters: it was forked from `tui-rs` in 2023 specifically because `tui-rs` stalled, and the project's own docs credit the original author while making clear `tui-rs` is not where new work should go. [ratatui on lib.rs](https://lib.rs/crates/ratatui).

### 2. HTTP client/server, TLS, retry, rate limiting

`reqwest` (built on `hyper`) is the default high-level HTTP client; `axum` is the default server framework in the same (Tokio) ecosystem. `hyper` itself shipped a `1.0` stable release in January 2025 that removed the old built-in `Client`/`Server` convenience types most `0.14`-era code (and most LLM training data) assumes — code now composes `hyper-util` connectors manually, or just reaches for `reqwest`/`axum` instead of touching `hyper` directly. [hyper on lib.rs](https://lib.rs/crates/hyper).

`ureq` had a `3.0` rewrite (current `3.4.0`, Aug 2026) that is still deliberately synchronous/blocking by design ("keeps the API simple and keeps dependencies to a minimum") — it did *not* gain async support, so it's a lightweight alternative for tools that don't otherwise carry a Tokio dependency, not a `reqwest` replacement inside an already-async binary. It currently defaults to `rustls` + `ring`, and its own docs explicitly decline to promise that default holds indefinitely. [ureq on lib.rs](https://lib.rs/crates/ureq).

TLS backend: `rustls` moved to a pluggable `CryptoProvider` trait starting at `0.23`, and the ecosystem default provider changed from `ring` to `aws-lc-rs`. As of the version current at research date (`0.24.0-dev.1`), the crate is moving toward *no* default provider at all — every binary must call something like `CryptoProvider::install_default()` once at startup, or panic at first TLS handshake with "no process-level CryptoProvider available." This is one of the most commonly hit 2024–2025 upgrade bugs in the `reqwest`/`rustls` stack and is worth a standing check in any project that pins `rustls`. `ring` remains relevant for platforms/targets `aws-lc-rs` doesn't build cleanly on. [rustls on lib.rs](https://lib.rs/crates/rustls).

Retry/backoff: `backon` (Datafuse Labs) is the crate the ecosystem is converging on for both sync and async retry with pluggable backoff strategies; it doesn't itself badmouth the older `backoff` crate or `tokio-retry`, but both of those have gone quiet, and `tokio-retry2` is a community fork keeping `tokio-retry`'s API alive. [backon on lib.rs](https://lib.rs/crates/backon).

Rate limiting: `governor` implements GCRA (a leaky-bucket variant) with lock-free 64-bit atomic state, claimed ~10x faster than mutex-based approaches under contention — it's the default choice for outbound-request throttling against a registry API. [governor on lib.rs](https://lib.rs/crates/governor).

Connection pooling is handled internally by `reqwest`/`hyper` (idle-connection reuse per host) — no separate crate is needed for HTTP; `deadpool`/`bb8` are for generic resource pools (DB connections etc.) and are out of scope unless the project pools something else.

### 3. OCI registry clients and image handling

`oci-distribution` was renamed `oci-client`; it implements the OCI Distribution spec (the protocol Docker Hub, ghcr.io, and every OCI-compatible registry speak) and is actively released — `0.17.0` in May 2026, 67 contributors, ~830K downloads/month. It is the field default to benchmark a hand-rolled registry client against, and a source of reusable manifest/auth/digest types even where this project's client diverges for its own package-manager semantics. [oci-client on lib.rs](https://lib.rs/crates/oci-client). `oci-spec` provides the raw OCI Image/Distribution spec types independent of any HTTP client; `oras-rs` targets generic OCI-artifact push/pull (not just container images) and is worth checking against grim/ocx's artifact-publishing path specifically, since both projects distribute non-image artifacts over OCI registries.

### 4. Serialization: JSON/TOML/YAML, schema, binary formats

`serde` + `serde_json` remain the unchallenged default for JSON; `simd-json` is a legitimate perf upgrade for large-payload parsing but is not a drop-in `serde_json` replacement (different API surface, mutates input buffer).

TOML: the `toml` crate (which wraps `toml_edit` internally) is the default for typed (de)serialization; reach for `toml_edit` directly when a formatting-preserving edit is needed (e.g. rewriting one key in `grimoire.toml`/`ocx.toml`/`cog.toml` without reformatting the rest of the file) — this is directly relevant to any tool in this family that programmatically edits its own config files.

YAML: `serde_yaml` carries a `+deprecated` suffix on its published version and an explicit "no longer maintained" notice, dated to the `0.9.34` release in March 2024 — yet it still pulls ~30M downloads/month purely from existing dependents who haven't migrated. New YAML-touching code should reach for `serde_yaml_ng` (maintained drop-in fork) or `serde_norway`, not `serde_yaml`. [serde_yaml on lib.rs](https://lib.rs/crates/serde_yaml).

Schema generation: `schemars` reached a `1.0` line (current `1.2.2`, July 2026, ~52M downloads/month) that stabilized its API surface; its own versioning policy explicitly reserves the right to change generated-schema *shape* in a minor release without calling that a breaking change, which matters if a project snapshot-tests generated schemas. [schemars on lib.rs](https://lib.rs/crates/schemars).

Binary formats: `bincode`'s own registry listing (current `3.0.0`, Dec 2025) reports the crate is now unmaintained following a maintainer incident, with the final release shipping only documentation and a deliberate compile error to force consumers to notice — its own "See also" list recommends `postcard`, `rkyv`, and a fork called `wincode` instead. `postcard` (no_std-friendly, compact, widely used in embedded and increasingly in general tooling) or `rmp-serde` (MessagePack, broader cross-language interop) are the sane 2026 defaults for new binary-serde work. [bincode on lib.rs](https://lib.rs/crates/bincode).

### 5. Errors, logging, tracing, metrics

`thiserror` (library-facing error enums via derive) + `anyhow` (application-facing error propagation) remain the standard combination, unchanged. `miette` layers rich, compiler-style diagnostic *reporting* (source snippets, span highlighting) on top of that — its own docs are explicit that it complements rather than replaces `thiserror`: libraries should keep exporting concrete `thiserror` types (optionally implementing `miette::Diagnostic`), and applications reach for `miette`'s `Report`/`Result` wrapper only at the presentation layer. This is a good fit for a CLI tool that wants rustc-style error output on manifest/config parse failures. [miette on lib.rs](https://lib.rs/crates/miette).

`tracing` (structured, span-based diagnostics) is dominant over plain `log`+`env_logger` for anything with async or multi-stage request/operation lifecycles — its macros mirror `log`'s, and `tracing-log` bridges dependencies still emitting via `log`. `tracing-subscriber` handles filtering/formatting, `tracing-appender` handles rotating file output. [tracing on lib.rs](https://lib.rs/crates/tracing). For metrics, the `metrics` crate + `metrics-exporter-prometheus` is the lightweight default; reach for the full OpenTelemetry metrics SDK only if the project already runs an OTel pipeline for traces.

### 6. Async runtimes, sync primitives, channels

`tokio` is the dominant, effectively load-bearing runtime for anything touching `hyper`/`reqwest`/`axum` (current `1.53.1`, ~72.6M downloads/month, MSRV 1.71). `async-std` is discontinued: its GitHub README states plainly "`async-std` has been discontinued; use `smol` instead," with the maintainers explaining they're consolidating effort into `smol` and pointing at `futures-concurrency`, `async-io`, `futures-lite`, and `async-compat` as the complementary pieces. Any tutorial, Stack Overflow answer, or LLM suggestion built on `async_std::*` is dead-end advice going into 2026. [async-std GitHub README](https://github.com/async-rs/async-std).

`parking_lot` remains worth reaching for when a hot path is mutex-contended (smaller, faster than `std::sync::Mutex` in the general case); `std::sync` is fine as the default everywhere else. For channels: `tokio::sync::{mpsc,oneshot,watch,broadcast}` inside async code, `crossbeam-channel` for high-throughput sync multi-producer/multi-consumer, `flume` as a smaller crate offering one channel type usable from both sync and async contexts.

### 7. Filesystem

`camino`'s `Utf8Path`/`Utf8PathBuf` are a real ergonomics and correctness win anywhere paths are already assumed UTF-8 (image refs, manifest paths, config keys are all inherently textual) — it trades support for non-Unicode paths for eliminating repeated `.to_str().unwrap()` conversions, and is already how `cargo` itself models paths internally. [camino on lib.rs](https://lib.rs/crates/camino).

`tempfile` is the unchallenged default for temp files (secure creation, `Drop`-based cleanup, `NamedTempFile::persist` for the create-in-temp-then-rename-into-place atomic-write pattern) — that pattern covers "atomic writes" without reaching for a dedicated crate; the standalone `atomicwrites` crate has low adoption and isn't worth the extra dependency.

File locking: `fs4` is a fork of `fs2` created specifically to drop the `libc` dependency for `rustix` and add async-runtime support (tokio/async-std/smol); `fs4`'s own listing is explicit that `fs2` "is still maintained," so this is "fs4 is the actively-developed superset," not "fs2 is dead." [fs4 on lib.rs](https://lib.rs/crates/fs4).

Directory conventions: `directories` (adds `ProjectDirs` — per-application config/cache/data paths from a qualifier/org/app triple) and `dirs` (raw XDG-on-Linux / Known-Folder-on-Windows / Standard-Directory-on-macOS lookups) are both actively maintained by the same `dirs-dev` org; `directories` is the better fit whenever a tool needs "my app's own config dir" rather than a raw base-directory lookup. [dirs on lib.rs](https://lib.rs/crates/dirs), [directories on lib.rs](https://lib.rs/crates/directories).

Directory walking + ignore-file handling: `ignore` (ripgrep's crate) combines recursive walking with `.gitignore`/`.ignore`-compatible pattern exclusion in one pass and is the default whenever exclude-list semantics matter; plain `walkdir` (which `ignore` itself is built on) is the right default when there's no ignore-file concept, and `jwalk` is the parallel-walking option for very large trees. [ignore on lib.rs](https://lib.rs/crates/ignore). For pattern matching without a walk attached, `globset` (also ripgrep's, compiles many glob patterns into one matcher) beats the older `glob` crate once more than a handful of patterns are involved.

Capability-based access: `cap-std` sandboxes filesystem access behind capability handles rather than ambient global paths — worth flagging as a conditional recommendation given this project family executes third-party skill/plugin/toolchain packages fetched from a registry; it's real defense-in-depth for anything that shouldn't be able to walk arbitrary host paths, but it's a genuine architectural commitment, not a drop-in.

### 8. Compression, hashing, checksums, content addressing

`flate2` (gzip/deflate/zlib) is directly relevant since OCI image layers have historically defaulted to gzip; its backend feature flags matter for cross-platform builds (pure-Rust `miniz_oxide` vs. faster `zlib-ng`). `zstd` (bindings to libzstd) is increasingly the preferred OCI layer-compression media type over gzip at comparable ratios and meaningfully faster — worth checking which media types this project's registry client already negotiates. `xz2` covers xz/lzma when needed but is uncommon in OCI contexts.

Hashing: OCI digests are contractually `sha256` (occasionally `sha512`) per the OCI Image/Distribution spec, so `sha2` is a hard requirement for anything registry-facing regardless of what else is in the dependency tree. `blake3` is markedly faster than `sha2`/`sha3`/`blake2` (its own docs: "much faster than MD5, SHA-1, SHA-2, SHA-3, and BLAKE2"), supports incremental/streaming verification via its Merkle-tree structure, and is the right choice for any *internal* content-addressed cache/dedup layer that isn't bound by the registry's own digest algorithm — e.g. a local package cache keyed by content hash, distinct from the manifest's `sha256:` digest. It explicitly should not be used for password hashing (use Argon2 there). [blake3 on lib.rs](https://lib.rs/crates/blake3). `crc32fast` covers lightweight non-cryptographic integrity checks (e.g. validating a gzip footer).

### 9. Time, UUID, random

`chrono` remains the incumbent default (~56.6M downloads/month) with the widest integration surface (serde, sqlx, diesel all have first-class chrono support), but its own docs flag real limitations: no bundled timezone data by default (needs `chrono-tz`/`tzfile`), and a long-standing reputation for footguns in naive-vs-aware arithmetic. `jiff` (BurntSushi, first released 2024) is the modern challenger, explicitly modeled on the JS Temporal proposal to make DST-safe, ambiguity-explicit arithmetic the default rather than an opt-in; it's pre-1.0 but growing fast (~19.6M downloads/month, weekly-download trend still climbing through mid-2026). [jiff on lib.rs](https://lib.rs/crates/jiff), [chrono on lib.rs](https://lib.rs/crates/chrono).

`uuid` is the default UUID crate and supports UUIDv7 (time-ordered, sortable, DB-index-friendly) behind the `v7` feature flag alongside the classic `v4` random and `v1`/`v3`/`v5`/`v6`/`v8` variants — reflexively defaulting to `Uuid::new_v4()` for anything that becomes a primary key, sort key, or filename is worth reconsidering in favour of `v7` wherever ordering or index locality helps. [uuid on lib.rs](https://lib.rs/crates/uuid).

`rand` renamed its most-used methods in `0.9` (`Rng::gen` → `Rng::random`, `gen_range` → `random_range`) — driven by `gen` becoming reserve-adjacent syntax under the Rust 2024 edition — and by research date has already moved to `0.10` (current `0.10.2`, July 2026). Any generated code calling `rng.gen()` is now two majors behind current. [rand on lib.rs](https://lib.rs/crates/rand).

### 10. Configuration, env, secrets

`figment` (from the Rocket-web-framework author) offers typed, layered config merging (defaults < file < env < explicit overrides) with a clean `Provider`/`.merge()`/`.join()` API; it's stable but its last release in this survey was May 2024 — old by download-velocity standards but not necessarily by API-stability standards for a small, focused crate. `config` (the older, more loosely-typed generic alternative) remains a fine choice when figment's opinionated typed-extraction model doesn't fit. [figment on lib.rs](https://lib.rs/crates/figment).

`dotenv` is unmaintained; `dotenvy` is its maintained fork and the crate to reach for whenever `.env`-file loading is wanted (mainly for local dev — production secrets should go through the platform's real secret store, not a `.env` file).

Secrets: `keyring` provides a unified API over each OS's native secure store — macOS/iOS Keychain, Windows Credential Manager, Linux (D-Bus Secret Service or kernel keyutils), Android keystore — and is the right place to persist registry credentials (ghcr.io tokens) rather than a plaintext config file. [keyring on lib.rs](https://lib.rs/crates/keyring). `secrecy` wraps in-memory secret values so they don't leak through accidental `Debug`/`Display`/logging and get zeroized on drop — worth pairing with `keyring` for anything that holds a token in memory between fetch and use.

### 11. Process execution, signals

`std::process::Command` is sufficient for the large majority of process-execution needs (spawning toolchains, invoking git, etc.) — no crate needed. `duct` is worth reaching for only once shell-like pipeline composition (`cmd1 | cmd2`, output capture across a chain) gets genuinely awkward with raw `Command`.

Signal handling: `signal-hook` is the cross-platform standard for gracefully handling `SIGTERM`/`SIGINT`/`SIGHUP` in a long-running process (relevant for anything running under a supervisor or inside a container, where `SIGTERM` is the actual shutdown signal, not just Ctrl-C); `ctrlc` is a minimal, Ctrl-C-only alternative that's fine for a short-lived interactive CLI but insufficient for a daemon or TUI that also needs to react to `SIGTERM`.

### 12. Testing and mocking (HTTP/trait doubles only — general test-org tooling is out of scope here)

`wiremock` is async-only and Tokio-native, and is the natural fit for mocking `ghcr.io`-style HTTP interactions in an async test suite — it supports custom request matchers and response templating, with parallel test execution. `mockito` is the sync/async alternative, weaker on custom matchers but useful when a suite isn't fully async. `mockall` remains the standard for mocking Rust traits directly (e.g. mocking the OCI-client trait boundary so unit tests never hit a real registry) — this hasn't changed in years and is worth naming explicitly since the project's registry-client abstraction is exactly the kind of trait boundary `mockall` targets. [wiremock on lib.rs](https://lib.rs/crates/wiremock).

### 13. Python interop

`pyo3` is the only serious choice for Rust↔Python bindings (current `0.29.2`, Aug 2026, ~18.2M downloads/month, actively released). The API shape changed meaningfully in `0.21` (2024): the `Bound<'py, T>` GIL-bound reference type replaced the older `&PyAny`/GIL-ref pattern, and pyo3 has been steering (and eventually removing) the old pattern since. Code and examples written before 2024 — which is most of what an LLM's training data contains — use the deprecated pattern and will not compile cleanly, or will trigger deprecation warnings, against current `pyo3`. [pyo3 on lib.rs](https://lib.rs/crates/pyo3). `maturin` remains the standard, unchanged build/publish tool for pyo3 extension wheels.

## Normative guidance candidates

1. **Never add `serde_yaml` to a new `Cargo.toml`.** Use `serde_yaml_ng` or `serde_norway` for YAML, or prefer TOML/JSON where the format is still a choice. *Rationale:* `serde_yaml` is officially deprecated and unmaintained. *VERIFICATION:* `grep -rn 'serde_yaml' Cargo.toml */Cargo.toml` — any hit that isn't `serde_yaml_ng`/`serde_norway` is a finding.
2. **Never add `bincode` to a new `Cargo.toml` for binary serialization.** Use `postcard` or `rmp-serde`. *Rationale:* `bincode`'s registry listing reports it unmaintained as of its final `3.0.0`. *VERIFICATION:* `grep -rn '^bincode' Cargo.toml */Cargo.toml`.
3. **Never add `async-std` to a new `Cargo.toml`.** Use `tokio` (already the project's runtime) or `smol`. *Rationale:* `async-std` is discontinued by its own maintainers. *VERIFICATION:* `grep -rn 'async-std' Cargo.toml */Cargo.toml`.
4. **Never add `ansi_term` or bare `dotenv` to a new `Cargo.toml`.** Use `anstream`/`anstyle` and `dotenvy` respectively. *Rationale:* both are unmaintained forks/predecessors with maintained drop-ins. *VERIFICATION:* `grep -rnE '^(ansi_term|dotenv) ' Cargo.toml */Cargo.toml`.
5. **Any binary that constructs a `rustls::ClientConfig`/`ServerConfig` must call a `CryptoProvider::install_default()` (or equivalent) exactly once at startup, and must not rely on an implicit default.** *Rationale:* `rustls` no longer guarantees an automatic default provider from `0.23` onward, and the failure mode is a runtime panic on first handshake, not a compile error. *VERIFICATION:* `grep -rn 'install_default\|CryptoProvider' src/` in any crate that depends on `rustls`/`reqwest` with TLS; absence plus a `rustls` dependency is a finding.
6. **New `Rng` call sites use `random()`/`random_range()`, never `gen()`/`gen_range()`.** *Rationale:* `rand 0.9`+ renamed these methods; the old names are gone, not just deprecated, in current `rand`. *VERIFICATION:* `grep -rn '\.gen(\|\.gen_range(' --include='*.rs'` — any hit is stale-API usage (or a real false positive on an unrelated `.gen(...)` method; inspect).
7. **New sortable/indexable identifiers default to UUIDv7, not v4, unless the ID must be unguessable.** *Rationale:* `uuid`'s `v7` feature gives time-ordered IDs that are far friendlier to any index or on-disk ordering than random v4 IDs. *VERIFICATION:* `grep -rn 'Uuid::new_v4' --include='*.rs'` on any new identifier-generation code; check whether ordering/index-locality would have helped.
8. **Registry credentials are stored via `keyring`, never written to a plaintext config file or `.env`.** *Rationale:* `keyring` gives OS-native secure storage on every target platform this project ships for. *VERIFICATION:* grep any code path that persists a token/credential and confirm it routes through `keyring`, not `std::fs::write` to a config path.

## AI-agent angle

An autonomous coding agent trained on data through roughly 2024–2025 will, unprompted, reach for: `ansi_term`/`termcolor` over `anstream`; `async-std` over `tokio`/`smol`; `serde_yaml` for any new YAML need; `bincode` 1.x-style API for binary serialization; `rng.gen()`/`gen_range()`; `Uuid::new_v4()` for every ID; pyo3's `&PyAny` GIL-ref pattern instead of `Bound<'py, T>`; and a `rustls`/`reqwest` TLS setup with no explicit `CryptoProvider::install_default()` call, which compiles fine and then panics the first time a real handshake happens — the single hardest-to-catch trap in this list because it's silent until runtime and the panic message doesn't obviously point back to the missing call.

The smallest mechanical check for the whole cluster is one grep pass over every `Cargo.toml` in the workspace for the exact deprecated/unmaintained crate names in the table below (`serde_yaml`, `bincode`, `async-std`, `ansi_term`, `dotenv`, `tui-rs`, `fs2` used for locking, `ansi_term`), plus a source grep for `\.gen(` / `\.gen_range(` and `Uuid::new_v4` to catch stale-API call sites even where the crate itself is current. A `rustls`-specific check — grep for `rustls::ClientConfig::builder()` or `reqwest::Client` construction without a nearby `install_default()` in the same binary's `main.rs`/startup path — catches the runtime-panic trap before it ships.

## Contested / evolving

- **`chrono` vs `jiff`.** `chrono` is still the safe, ecosystem-compatible default (serde/sqlx/diesel integrations), but `jiff` is the direction new "get timezone arithmetic right" code is moving, and its adoption curve (per lib.rs download trend) is climbing through 2026. Recommendation for this project: keep `chrono` where it's already threaded through, evaluate `jiff` for any *new* code doing real calendar/timezone arithmetic (e.g. package expiry, cache TTLs across DST boundaries) rather than simple UTC timestamps.
- **`rustls`'s crypto-provider defaulting.** The trend line (`0.23` → `0.24-dev`) is toward *removing* any implicit default provider entirely, which will turn today's "hope reqwest picked aws-lc-rs for you" into a hard compile/runtime requirement everywhere. Worth revisiting this finding again once `0.24` actually stabilizes.
- **`bincode`'s unmaintained status.** This is the single most surprising, most recent finding in this survey and deserves independent re-confirmation before being treated as settled fact in a normative rule — the claim (a maintainer incident, a compiler-error-only final release) is unusual enough that it's worth a second source before hard-blocking `bincode` in CI.
- **`figment` vs `config`.** Neither has "won"; `figment`'s last observed release predates most other crates surveyed here by roughly two years, which is either "stable and done" or "quietly stalling" depending on how the maintainer treats it going forward.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [async-std GitHub README](https://github.com/async-rs/async-std) | Primary repo README | fetched Aug 2026 | States discontinuation directly from the maintainers, points at `smol` as successor |
| [serde_yaml on lib.rs](https://lib.rs/crates/serde_yaml) | Registry mirror aggregating crates.io + README | last release Mar 2024 | Shows the `+deprecated` version suffix and "no longer maintained" notice plus continued download volume |
| [bincode on lib.rs](https://lib.rs/crates/bincode) | Registry mirror | last release Dec 2025 | Documents the unmaintained status and the doc-only/compile-error final release |
| [schemars on lib.rs](https://lib.rs/crates/schemars) | Registry mirror | current 1.2.2, Jul 2026 | Confirms the 1.0 stabilization and the schema-shape-not-a-breaking-change policy |
| [rustls on lib.rs](https://lib.rs/crates/rustls) | Registry mirror | current 0.24.0-dev.1, Jul 2026 | Documents the pluggable `CryptoProvider` model and the move away from an automatic default |
| [oci-client on lib.rs](https://lib.rs/crates/oci-client) | Registry mirror | current 0.17.0, May 2026 | Confirms the `oci-distribution` → `oci-client` rename and current maintenance activity |
| [fs4 on lib.rs](https://lib.rs/crates/fs4) | Registry mirror | current 1.1.0, Apr 2026 | Confirms fork lineage from `fs2`, rationale (async support, `rustix` over `libc`) |
| [ratatui on lib.rs](https://lib.rs/crates/ratatui) | Registry mirror | current 0.30.2, Jun 2026 | Confirms fork lineage from `tui-rs` and current maintenance activity |
| [jiff on lib.rs](https://lib.rs/crates/jiff) | Registry mirror | current 0.2.35, Jul 2026 | Shows adoption trend and pre-1.0 status of the chrono challenger |
| [chrono on lib.rs](https://lib.rs/crates/chrono) | Registry mirror | current 0.4.45, Jun 2026 | Documents chrono's own stated limitations (timezone data, calendar range) |
| [uuid on lib.rs](https://lib.rs/crates/uuid) | Registry mirror | current 1.24.0, Jul 2026 | Confirms `v7` feature availability |
| [rand on lib.rs](https://lib.rs/crates/rand) | Registry mirror | current 0.10.2, Jul 2026 | Shows the crate has already moved past the 0.9 method-rename generation |
| [dirs on lib.rs](https://lib.rs/crates/dirs) | Registry mirror | current 6.0.0, Jan 2025 | Confirms active maintenance and scope (raw base-directory lookups) |
| [directories on lib.rs](https://lib.rs/crates/directories) | Registry mirror | current 6.0.0, Jan 2025 | Confirms active maintenance and the ProjectDirs distinction vs `dirs` |
| [ignore on lib.rs](https://lib.rs/crates/ignore) | Registry mirror | current 0.4.33, Aug 2026 | Confirms this is ripgrep's gitignore-walking crate, still very actively released |
| [camino on lib.rs](https://lib.rs/crates/camino) | Registry mirror | current 1.2.5, Jul 2026 | Explains the UTF-8-path rationale in the crate's own words |
| [anstream on lib.rs](https://lib.rs/crates/anstream) | Registry mirror | current 1.0.0, Feb 2026 | Confirms this is the clap/rust-cli-org colour infrastructure and its related crates |
| [ansi_term on lib.rs](https://lib.rs/crates/ansi_term) | Registry mirror | last release 2019 | Confirms unmaintained status and lists maintained replacements |
| [tracing on lib.rs](https://lib.rs/crates/tracing) | Registry mirror | current 0.1.44, Dec 2025 | Confirms scale of adoption and relationship to the `log` crate |
| [blake3 on lib.rs](https://lib.rs/crates/blake3) | Registry mirror | current 1.8.6, Aug 2026 | States speed comparison vs SHA-2/3/BLAKE2 and non-suitability for password hashing |
| [keyring on lib.rs](https://lib.rs/crates/keyring) | Registry mirror | current 4.1.6, Aug 2026 | Confirms per-OS backend coverage relevant to credential storage |
| [figment on lib.rs](https://lib.rs/crates/figment) | Registry mirror | last release May 2024 | Confirms the layered-merge model and comparatively older release date |
| [hyper on lib.rs](https://lib.rs/crates/hyper) | Registry mirror | current 1.11.0, Jul 2026 | Confirms `1.x` is current and long past the `0.14` API most training data assumes |
| [tokio on lib.rs](https://lib.rs/crates/tokio) | Registry mirror | current 1.53.1, Jul 2026 | Confirms dominant adoption and MSRV policy |
| [miette on lib.rs](https://lib.rs/crates/miette) | Registry mirror | current 7.6.0, Apr 2025 | States its own relationship to `thiserror`/`anyhow` explicitly |
| [ureq on lib.rs](https://lib.rs/crates/ureq) | Registry mirror | current 3.4.0, Aug 2026 | Confirms the 3.0 rewrite is still sync-only and the TLS-default caveat |
| [backon on lib.rs](https://lib.rs/crates/backon) | Registry mirror | current 1.6.0, Oct 2025 | Confirms scope (sync+async retry/backoff) and adoption scale |
| [wiremock on lib.rs](https://lib.rs/crates/wiremock) | Registry mirror | current 0.6.5, Aug 2025 | Confirms async-only design and comparison table vs mockito/httpmock |
| [governor on lib.rs](https://lib.rs/crates/governor) | Registry mirror | current 0.10.4, Dec 2025 | Confirms GCRA algorithm and performance claim |
| [pyo3 on lib.rs](https://lib.rs/crates/pyo3) | Registry mirror | current 0.29.2, Aug 2026 | Confirms current release cadence and adoption scale |
| [clap on lib.rs](https://lib.rs/crates/clap) | Registry mirror | current 4.6.6, Aug 2026 | Confirms continued dominance as the CLI-parsing default |

## Inventory

| Name | What it does | Maturity / adoption signal | 2026 status | Earns a place here |
|---|---|---|---|---|
| `clap` | CLI arg parsing (derive + builder) | ~72M dl/mo, current 4.6.6 (Aug 2026) | Default | Yes — already in use |
| `clap_complete` | Shell completion generation | Part of clap workspace | Default | Yes, if completions are shipped |
| `structopt` | Old derive-based CLI parsing | Merged into clap 3.0, archived | Legacy | No — use `clap` derive |
| `anstream`/`anstyle` | Terminal colour IO adapters + capability detection | ~56M dl/mo, current 1.0.0 (Feb 2026) | Default | Yes — same infra clap uses |
| `ansi_term` | Terminal colouring | Unmaintained since 2019 | Legacy | No — use `anstream`/`owo-colors` |
| `owo-colors` | Zero-cost terminal colouring | Actively maintained | Challenger/complement | Conditional — for compile-time-styled output alongside `anstream` |
| `console` | Terminal utilities (colour, cursor, styling) | Actively maintained (indicatif's sibling crate) | Challenger | Conditional — mainly if already pulled in via `indicatif` |
| `indicatif` | Progress bars / spinners | Long-standing default, no challenger | Default | Yes |
| `ratatui` | TUI framework | ~5.6M dl/mo, current 0.30.2 (Jun 2026), fork of tui-rs | Default | Yes — already in use |
| `tui-rs` | Original TUI framework | Archived/unmaintained since 2023 | Legacy | No — superseded by `ratatui` |
| `reqwest` | High-level async HTTP client | Dominant default on top of hyper | Default | Yes |
| `hyper` | Low-level HTTP client/server | ~66M dl/mo, current 1.11.0, 1.x stable since Jan 2025 | Default (low-level layer) | Yes, via `reqwest`/`axum` |
| `ureq` | Sync/blocking HTTP client | ~18M dl/mo, current 3.4.0 (Aug 2026), 3.0 rewrite | Challenger | Conditional — only for non-Tokio binaries |
| `axum` | Async HTTP server framework | Tokio-ecosystem default | Default | Conditional — only if this family ever serves HTTP (e.g. ocx-mirror) |
| `rustls` | Pure-Rust TLS | ~65M dl/mo, current 0.24.0-dev, pluggable crypto provider since 0.23 | Default | Yes — explicit `CryptoProvider::install_default()` required |
| `aws-lc-rs` | rustls crypto provider | Ecosystem default provider since 0.23 | Default | Yes, as the provider choice |
| `ring` | rustls crypto provider (older default) | Still maintained, broader platform coverage | Alternative provider | Conditional — for targets aws-lc-rs doesn't support |
| `native-tls` | System-TLS-backed client | Maintained, but pulls in OpenSSL/Schannel/Secure Transport | Legacy-leaning | No — prefer pure-Rust `rustls` for cross-platform prebuilt binaries |
| `backon` | Retry/backoff (sync+async) | ~8.9M dl/mo, current 1.6.0 (Oct 2025) | Default | Yes |
| `backoff` | Retry/backoff (older) | Release activity has slowed | Legacy-leaning | No — prefer `backon` |
| `tokio-retry` / `tokio-retry2` | Async retry | Original stalled; `-2` is a maintained fork | Legacy / fork | No / conditional — prefer `backon` |
| `governor` | Rate limiting (GCRA) | ~4.6M dl/mo, current 0.10.4 (Dec 2025) | Default | Yes — for registry request throttling |
| `oci-client` | OCI Distribution registry client | ~830K dl/mo, current 0.17.0 (May 2026), renamed from oci-distribution | Default reference impl | Conditional — reuse types/patterns even if this project keeps its own client |
| `oci-spec` | OCI Image/Distribution spec types | Companion crate to oci-client ecosystem | Default | Conditional — useful for spec-conformant types |
| `oras-rs` | Generic OCI-artifact push/pull | Smaller, more specialized | Challenger | Conditional — check against grim/ocx's own artifact publishing |
| `dkregistry-rs` | Older OCI registry client | Lower activity than oci-client | Legacy-leaning | No — prefer `oci-client` |
| `serde` | Serialization framework | Ubiquitous | Default | Yes |
| `serde_json` | JSON (de)serialization | Ubiquitous default | Default | Yes |
| `simd-json` | Fast JSON parsing | Real perf gain, different API | Challenger | Conditional — only for large-payload hot paths |
| `toml` / `toml_edit` | TOML (de)serialization / format-preserving edit | Default for Rust-ecosystem TOML | Default | Yes — already used for grimoire.toml/ocx.toml |
| `serde_yaml` | YAML (de)serialization | +deprecated since 0.9.34 (Mar 2024), "no longer maintained" | Legacy | No — use `serde_yaml_ng`/`serde_norway` |
| `serde_yaml_ng` | YAML (de)serialization, maintained fork | Active fork of serde_yaml | Default (YAML) | Yes, if YAML is unavoidable |
| `schemars` | JSON Schema generation from Rust types | ~52M dl/mo, current 1.2.2 (Jul 2026), 1.0 stabilized | Default | Yes — for config/tool-schema validation |
| `bincode` | Compact binary serialization | Reported unmaintained, final 3.0.0 doc-only | Legacy | No — use `postcard`/`rmp-serde` |
| `postcard` | Compact, no_std-friendly binary serialization | Growing adoption, embedded-friendly | Default (binary) | Yes |
| `rmp-serde` | MessagePack serialization | Stable, cross-language interop | Alternative | Conditional — when cross-language interop matters |
| `thiserror` | Derive-based error enums | Ubiquitous library-error default | Default | Yes |
| `anyhow` | Application-level error propagation | Ubiquitous application-error default | Default | Yes |
| `miette` | Rich diagnostic error reporting | ~5.3M dl/mo, current 7.6.0 (Apr 2025) | Complement | Conditional — for CLI tools wanting rustc-style diagnostics |
| `tracing` | Structured, span-based diagnostics | ~60.5M dl/mo, current 0.1.44 (Dec 2025) | Default | Yes |
| `tracing-subscriber` | tracing filtering/formatting | Standard companion crate | Default | Yes |
| `log` + `env_logger` | Traditional logging | Still ubiquitous in leaf dependencies | Legacy-leaning for new app code | No for new code — bridge via `tracing-log` instead |
| `metrics` + `metrics-exporter-prometheus` | Metrics collection/export | Lightweight standard | Default | Conditional — if metrics are needed at all |
| `tokio` | Async runtime | ~72.6M dl/mo, current 1.53.1 (Jul 2026), MSRV 1.71 | Default | Yes — already in use |
| `async-std` | Async runtime | Discontinued by its own maintainers | Legacy | No — use `tokio`/`smol` |
| `smol` | Lightweight async runtime | Recommended successor for async-std users | Alternative | Conditional — only for non-Tokio-ecosystem needs |
| `parking_lot` | Faster sync primitives | Stable, widely used | Challenger (to std) | Conditional — hot-path mutex contention only |
| `crossbeam-channel` | High-perf sync MPMC channels | Stable, widely used | Default (sync channels) | Conditional — where std::sync::mpsc isn't enough |
| `flume` | Sync+async channel | Smaller alternative | Challenger | Conditional |
| `camino` | UTF-8-guaranteed paths | ~20.8M dl/mo, current 1.2.5 (Jul 2026) | Default (UTF-8 contexts) | Conditional — for OCI-ref/manifest path handling |
| `tempfile` | Temp files, atomic-write pattern | Unchallenged default | Default | Yes |
| `fs4` | Cross-platform file locking | ~5.7M dl/mo, current 1.1.0 (Apr 2026), fork of fs2 | Default | Yes |
| `fs2` | Cross-platform file locking (older) | Still maintained per fs4's own docs | Legacy-leaning | No — prefer `fs4` |
| `directories` | Per-app config/cache/data paths (ProjectDirs) | ~3.7M dl/mo, current 6.0.0 (Jan 2025) | Default (per-app dirs) | Yes |
| `dirs` | Raw XDG/Known-Folder lookups | ~24.4M dl/mo, current 6.0.0 (Jan 2025) | Default (raw lookups) | Conditional — when ProjectDirs isn't needed |
| `cap-std` | Capability-based filesystem sandboxing | Real but architecturally heavy | Challenger | Conditional — for sandboxing third-party package execution |
| `walkdir` | Recursive directory walking | Unchallenged baseline | Default | Yes |
| `ignore` | Gitignore-aware directory walking | ~11.7M dl/mo, current 0.4.33 (Aug 2026) | Default (with exclude semantics) | Conditional — wherever ignore-file logic is needed |
| `globset` | Multi-pattern glob matching | Stable, ripgrep-grade | Default (many patterns) | Conditional |
| `glob` | Simple glob matching | Stable, older API | Alternative | Conditional — single-pattern cases |
| `flate2` | gzip/deflate/zlib | Standard for OCI gzip layers | Default | Yes |
| `zstd` | Zstandard compression | Faster than gzip at comparable ratio | Growing default (OCI zstd layers) | Conditional — check registry's advertised media types |
| `sha2` | SHA-256/512 hashing | Mandatory for OCI digest spec | Default (mandatory) | Yes |
| `blake3` | Fast general-purpose hashing | ~13.2M dl/mo, current 1.8.6 (Aug 2026) | Default (internal CAS) | Conditional — internal content-addressing only |
| `crc32fast` | CRC32 checksums | Stable, lightweight | Default (lightweight checks) | Conditional |
| `chrono` | Date/time with timezone support | ~56.6M dl/mo, current 0.4.45 (Jun 2026) | Incumbent default | Yes — where already used |
| `jiff` | Modern DST-safe date/time | ~19.6M dl/mo, current 0.2.35, pre-1.0, growing fast | Challenger, direction of travel | Conditional — for new calendar/timezone-arithmetic code |
| `uuid` | UUID generation/parsing, incl. v7 | ~59.4M dl/mo, current 1.24.0 (Jul 2026) | Default | Yes |
| `rand` | Random number generation | ~140M dl/mo, current 0.10.2 (Jul 2026) | Default | Yes — mind the 0.9 method renames |
| `figment` | Layered typed configuration | ~3.3M dl/mo, last release May 2024 | Default (layered config) | Conditional |
| `config` | Layered configuration (older, looser typing) | Maintained, older API style | Alternative | Conditional |
| `dotenvy` | `.env` file loading, maintained fork | Maintained | Default | Yes, for local dev only |
| `dotenv` | `.env` file loading (original) | Unmaintained | Legacy | No — use `dotenvy` |
| `keyring` | OS-native credential storage | ~3.4M dl/mo, current 4.1.6 (Aug 2026) | Default | Yes — for registry credentials |
| `secrecy` | In-memory secret wrapping/zeroization | Stable, widely used | Default | Conditional — wherever tokens live in memory |
| `signal-hook` | Cross-platform signal handling | Stable, standard | Default | Conditional — long-running/daemon processes |
| `ctrlc` | Ctrl-C-only signal handling | Stable, minimal | Alternative | Conditional — short-lived interactive CLIs only |
| `duct` | Shell-like process pipeline composition | Stable, niche | Alternative | Conditional — only once raw `Command` gets awkward |
| `wiremock` | Async HTTP mocking for tests | ~6.2M dl/mo, current 0.6.5 (Aug 2025) | Default (async) | Yes — for registry-interaction tests |
| `mockito` | Sync+async HTTP mocking for tests | Maintained alternative | Alternative | Conditional — non-fully-async suites |
| `mockall` | Rust trait mocking | Long-standing default | Default | Yes — for the OCI-client trait boundary |
| `pyo3` | Rust↔Python bindings | ~18.2M dl/mo, current 0.29.2 (Aug 2026) | Default | Yes — already relevant to the Python-binding crate |
| `maturin` | Build/publish tool for pyo3 wheels | Long-standing default | Default | Yes |

## Candidate topics

| Topic | Why it matters | Source | Already covered? | Priority |
|---|---|---|---|---|
| does-this-project-need-the-oci-client-crate | Whether to adopt/reuse `oci-client` types vs. keep the hand-rolled registry client, given custom auth/upload needs | [oci-client on lib.rs](https://lib.rs/crates/oci-client) | no | high |
| rustls-crypto-provider-startup-check | Whether every binary in the workspace correctly calls `CryptoProvider::install_default()` | [rustls on lib.rs](https://lib.rs/crates/rustls) | no | high |
| bincode-migration-audit | Does anything in the workspace still depend on `bincode`, and does the "unmaintained" claim hold up on closer inspection | [bincode on lib.rs](https://lib.rs/crates/bincode) | no | high |
| serde-yaml-transitive-dependency-audit | Does any transitive dependency still pull `serde_yaml`, and does that matter (build-only vs. runtime-parsed input) | [serde_yaml on lib.rs](https://lib.rs/crates/serde_yaml) | no | medium |
| oci-layer-compression-media-type-choice | gzip vs zstd for any layers this project itself produces/publishes | — | no | medium |
| content-addressed-cache-hash-choice | blake3 vs sha256 for an internal local-cache CAS layer distinct from registry digests | [blake3 on lib.rs](https://lib.rs/crates/blake3) | no | medium |
| uuid-v7-adoption-for-package-ids | Whether package/lock-entry identifiers should move to UUIDv7 for index locality | [uuid on lib.rs](https://lib.rs/crates/uuid) | no | low |
| jiff-vs-chrono-for-cache-ttl-arithmetic | Whether TTL/expiry arithmetic across DST boundaries is a live correctness risk today | [jiff on lib.rs](https://lib.rs/crates/jiff) | no | low |
| terminal-color-stack-consolidation | Whether the project already uses `anstream`/`anstyle` consistently or has stray `termcolor`/`colored` usage | [anstream on lib.rs](https://lib.rs/crates/anstream) | no | medium |
| credential-storage-migration-to-keyring | Whether ghcr.io tokens are currently stored in plaintext config vs. the OS keychain | [keyring on lib.rs](https://lib.rs/crates/keyring) | no | high |
| cap-std-sandboxing-for-untrusted-packages | Whether executing fetched skill/toolchain packages warrants capability-based FS sandboxing | — | no | medium |
| async-std-transitive-dependency-audit | Whether any dependency still pulls the discontinued `async-std` runtime, causing two async runtimes in one binary | [async-std GitHub README](https://github.com/async-rs/async-std) | no | medium |
| signal-hook-vs-ctrlc-for-daemon-processes | Whether ocx-mirror (a longer-running process) handles SIGTERM correctly today | — | no | medium |
| mockall-coverage-of-registry-trait-boundary | Whether the OCI-client abstraction has a mockall-based test double already, or tests hit real/wiremock endpoints only | [wiremock on lib.rs](https://lib.rs/crates/wiremock) | no | low |
| pyo3-bound-api-migration-check | Whether the Python-binding crate already uses `Bound<'py, T>` or still has legacy GIL-ref patterns | [pyo3 on lib.rs](https://lib.rs/crates/pyo3) | no | high |
| rand-method-rename-audit | Whether any code still calls the removed `rng.gen()`/`gen_range()` names | [rand on lib.rs](https://lib.rs/crates/rand) | no | medium |
| toml-edit-vs-toml-for-self-editing-configs | Whether grim/ocx code that rewrites its own `.toml` files preserves formatting/comments correctly | — | no | medium |
| figment-vs-config-rs-for-layered-settings | Which layered-config approach fits ocx/grim's existing config precedence rules better | [figment on lib.rs](https://lib.rs/crates/figment) | no | low |
| governor-based-registry-rate-limiting | Whether the registry client currently self-throttles against ghcr.io rate limits at all | [governor on lib.rs](https://lib.rs/crates/governor) | no | medium |
| backon-retry-policy-for-registry-fetches | Whether registry HTTP calls have a consistent, centralized retry/backoff policy today | [backon on lib.rs](https://lib.rs/crates/backon) | no | medium |
| directories-vs-dirs-consistency-audit | Whether config/cache paths are computed consistently across grim, ocx, and ocx-mirror | [directories on lib.rs](https://lib.rs/crates/directories) | no | low |
| camino-adoption-for-manifest-paths | Whether manifest/path handling would materially simplify by switching to `Utf8PathBuf` | [camino on lib.rs](https://lib.rs/crates/camino) | no | low |
| schemars-1.0-migration-impact | Whether any generated-schema snapshot tests are exposed to schemars' "shape isn't a breaking change" policy | [schemars on lib.rs](https://lib.rs/crates/schemars) | no | low |
| secrecy-wrapping-for-in-memory-tokens | Whether tokens fetched from `keyring` are wrapped to avoid accidental logging | — | no | low |
