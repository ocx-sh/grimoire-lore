---
title: Test Organisation, CLI Testing and Coverage for Rust CLIs
topic: rust-testing
agent: inv-testing
model: sonnet
date_researched: "2026-08"
sources_count: 17
scope: |
  Covers Rust test taxonomy (unit/integration/doc), naming and table-driven
  conventions, cargo-nextest, CLI/e2e testing (assert_cmd/trycmd/insta),
  filesystem/network isolation, coverage tooling, and flakiness causes —
  as applicable to a clap+tokio CLI shipped as prebuilt binaries over OCI.
  Does not cover fuzzing/property testing (proptest/quickcheck), benchmark
  harnesses (criterion), or GUI/TUI-specific testing.
---

## Table of contents

1. [Test taxonomy: unit, integration, doc](#1-test-taxonomy-unit-integration-doc)
2. [Naming, structure, table-driven tests](#2-naming-structure-table-driven-tests)
3. [cargo-nextest](#3-cargo-nextest)
4. [CLI / end-to-end testing](#4-cli--end-to-end-testing)
5. [Filesystem and network isolation](#5-filesystem-and-network-isolation)
6. [Coverage](#6-coverage)
7. [Flakiness and determinism](#7-flakiness-and-determinism)
8. [What NOT to test, and suite speed](#8-what-not-to-test-and-suite-speed)
9. [Normative guidance candidates](#normative-guidance-candidates)
10. [AI-agent angle](#ai-agent-angle)
11. [Contested / evolving](#contested--evolving)
12. [Sources](#sources)

## Summary

- Unit tests (`#[cfg(test)] mod tests` in the same file) can see private items via `use super::*;`; integration tests under `tests/` compile as separate crates and can only call the crate's public API — put contract-level assertions in `tests/`, implementation-detail assertions in `#[cfg(test)]` modules ([Rust Book §11.3](https://doc.rust-lang.org/book/ch11-03-test-organization.html)).
- Share integration-test helpers via `tests/common/mod.rs`, never `tests/common.rs` — the `mod.rs` form is not treated as its own test binary and doesn't show up as a spurious "running 0 tests" entry ([Rust Book §11.3](https://doc.rust-lang.org/book/ch11-03-test-organization.html)).
- `cargo-nextest` runs every test in its own process (not just its own thread) and is materially faster on large suites, but it does not run doc tests — `cargo test --doc` (or plain `cargo test`) is still required as a separate CI step ([nexte.st running docs](https://nexte.st/docs/running/), [rustdoc doctest docs](https://doc.rust-lang.org/rustdoc/write-documentation/documentation-tests.html)).
- Nextest partitioning across CI shards uses `--partition slice:m/n` (position-based) or `--partition hash:m/n` (content-hash based, stable across adds/removes); `count:m/n` is deprecated in favour of `slice:m/n` ([nexte.st search result / changelog](https://nexte.st/changelog/)).
- Configure retries for flaky tests via `.config/nextest.toml` (`retries = N`, `flaky-result = "pass"`); a retried test that eventually passes is reported as flaky, not as failed, and this is visible in JUnit output as `<flakyFailure>` ([nexte.st retries docs](https://github.com/nextest-rs/nextest/blob/main/site/src/docs/features/retries.md)).
- JUnit XML is opt-in per profile: `[profile.ci.junit] path = "junit.xml"` in `.config/nextest.toml`, written to `target/nextest/<profile>/junit.xml`.
- `assert_cmd::Command::cargo_bin("name")` finds and runs the crate's own binary under test, then `.assert().success()/.failure()` combined with `predicates` crate assertions checks stdout/stderr/exit code independently — this is the standard way to black-box test a clap CLI ([assert_cmd README](https://github.com/assert-rs/assert_cmd)).
- `trycmd` (and its lower-level sibling `snapbox`) is for large numbers of golden-file CLI cases (`.toml` or `.trycmd` fixtures with `.stdout`/`.stderr` files); regenerate with `TRYCMD=overwrite cargo test`, and use `[..]`/`...` wildcards to elide non-deterministic content like paths and timings ([trycmd docs](https://docs.rs/trycmd/latest/trycmd/)).
- `insta` snapshot tests store `.snap` files next to the test; a mismatch during `cargo insta test` writes a `.snap.new` file that `cargo insta review` shows as an interactive diff to accept/reject — never hand-edit `.snap` files, always go through review or `cargo insta accept` ([insta.rs CLI docs](https://insta.rs/docs/cli/)).
- Make snapshots deterministic with `insta::Settings` redactions (or a fixed value) for paths, timestamps, and random ports — colour output must be disabled (`NO_COLOR=1` or `--color never`) and ordering must be sorted before snapshotting non-deterministic collections.
- Use `tempfile::TempDir`/`assert_fs::TempDir` for filesystem isolation; cleanup happens on `Drop`, so pass `&temp_dir` (not the owned value) into anything that must run while the directory still exists, or it's deleted before use ([tempfile docs](https://docs.rs/tempfile/latest/tempfile/)).
- Use `wiremock` (async, tokio-native) or `mockito`/`httpmock` (sync-friendly) to stand up a local HTTP server per test on a random port — this is the correct way to test an OCI/registry HTTP client without touching a real registry, and it should be the *only* network path a test suite is allowed ([wiremock docs](https://docs.rs/wiremock/latest/wiremock/)).
- `std::env::set_var` and `remove_var` are `unsafe fn` (not new in edition 2024, but the guidance sharpened around it): on Unix, concurrent env reads/writes across threads are a data race the OS gives no protection against, and Rust's own stdlib (e.g. DNS resolution) may read the environment without warning — treat any test that mutates process-global env vars as needing `#[serial]` or `Command::env()` on a child process instead ([std::env::set_var docs](https://doc.rust-lang.org/std/env/fn.set_var.html)).
- `serial_test`'s `#[serial]`/`#[serial(key)]` attributes force specific tests to run one-at-a-time (optionally scoped to a named lock) when they share global mutable state (env vars, cwd, singleton files) that `cargo test`'s or nextest's default parallelism would otherwise race ([serial_test docs](https://docs.rs/serial_test/latest/serial_test/)).
- `cargo-llvm-cov` is the current default coverage tool (LLVM source-based instrumentation, cross-platform Linux/macOS/Windows); `cargo-tarpaulin` still works but is Linux-x86_64-only via ptrace — prefer llvm-cov for a cross-platform CLI project ([cargo-llvm-cov README](https://github.com/taiki-e/cargo-llvm-cov)).
- Coverage doc tests and integration tests together with `cargo llvm-cov --workspace --doctests --lcov`; branch coverage is still explicitly unstable (`--branch`) — treat line/region coverage as the reportable number, not branch coverage.
- Enforce a coverage floor in CI with `cargo llvm-cov --fail-under-lines 80` (or your chosen threshold) rather than relying on a human to read a report; export `--codecov`/`--lcov` for the dashboard, and treat the number as a regression detector, not a target to game.
- Prefer `rstest`'s `#[case(...)]`/`#[values(...)]` attributes over hand-rolled loops for table-driven Rust tests — each case becomes its own named, individually reportable test rather than one opaque loop that stops at the first failure ([rstest docs](https://docs.rs/rstest/latest/rstest/)).
- Test what a reimplementation with the same public behaviour would still need to satisfy ("the Neural Network Test"); don't write a test whose only failure mode is "I refactored the internals," and keep I/O off the hot path of the suite so most tests can stay fast without needing `#[ignore]` gating (matklad, ["How to Test"](https://matklad.github.io/2021/05/31/how-to-test.html)).

## Findings

### 1. Test taxonomy: unit, integration, doc

Rust has three distinct kinds of tests with different visibility and different compile units, per the Rust Book's canonical treatment ([ch11.3](https://doc.rust-lang.org/book/ch11-03-test-organization.html)):

- **Unit tests** live in `src/` files themselves, inside a `#[cfg(test)] mod tests { use super::*; ... }` block. `#[cfg(test)]` means the module (and anything it alone depends on) is compiled *only* for `cargo test`, not for `cargo build` — it costs nothing in the shipped binary. Because the module is nested inside the same file, `use super::*;` gives it access to private (non-`pub`) items, so this is the right place to test internal helpers, error-mapping logic, parsing routines, etc. that are not part of the crate's public surface.
- **Integration tests** live in a top-level `tests/` directory (sibling of `src/`). Each `.rs` file directly under `tests/` is compiled as its own separate crate and linked against the library's public API only — private items are invisible. This is the right place for tests that exercise the crate the way an external consumer (or, for a binary crate, the way the CLI's own users) would.
- **Doc tests** are code fences inside `///` doc comments, extracted and run by `rustdoc --test` (also triggered by plain `cargo test`, but *not* by `cargo nextest run`). They can only reach public items and only compile against the crate as an external user would — they double as living usage examples and as a guarantee those examples still work ([rustdoc docs](https://doc.rust-lang.org/rustdoc/write-documentation/documentation-tests.html)).

Because each `tests/*.rs` file is its own crate, a helper module placed directly as `tests/common.rs` is picked up by cargo as an independent test binary — it runs, reports "running 0 tests" and clutters output. The fix, confirmed on the same Book page, is to put shared setup in `tests/common/mod.rs`: files inside subdirectories of `tests/` are *not* auto-discovered as test crates, so `mod common;` inside an integration test file pulls it in as an ordinary module instead.

```rust
// tests/common/mod.rs  (NOT tests/common.rs)
pub fn setup_temp_repo() -> tempfile::TempDir {
    tempfile::tempdir().unwrap()
}
```
```rust
// tests/install_cmd.rs
mod common;

#[test]
fn install_writes_lockfile() {
    let dir = common::setup_temp_repo();
    // ...
}
```

**Test-support crates in a workspace.** For a multi-crate workspace (the target shape for OCX/Grimoire, given the "everything in one crate" pain point), the equivalent pattern at workspace scale is a dedicated `*-test-support` (or `testutil`) crate that other crates depend on only via `[dev-dependencies]`, exposing fixtures, fake registries, and builders. This avoids every crate reinventing tempdir/mock-server boilerplate and avoids leaking test-only code into release builds — the crate is never a normal (non-dev) dependency of anything shipped.

**`#[cfg(feature = "test-util")]` seams.** When a *library* crate (not just its test crate) needs to expose test doubles to downstream crates — e.g. a fake OCI registry client that other workspace crates' tests want to reuse — gate that surface behind a `test-util` feature rather than making it always-public API:

```rust
#[cfg(feature = "test-util")]
pub mod test_util {
    pub fn fake_registry() -> FakeRegistry { /* ... */ }
}
```
Consumers enable it only in `[dev-dependencies]`:
```toml
[dev-dependencies]
ocx-registry = { path = "../ocx-registry", features = ["test-util"] }
```
This is the same seam pattern tokio itself uses for `tokio::test`/test utilities and keeps the feature out of default production builds.

### 2. Naming, structure, table-driven tests

Rust has no enforced naming scheme (unlike, say, Go's `TestXxx`), but the `#[test]` function name *is* the test's identity in `cargo test`/`nextest` output and in JUnit reports, so it should read as a sentence describing behaviour, not just the function under test. A widely used scheme in real Rust codebases is `<subject>_<condition>_<expected_outcome>`, e.g. `install_missing_lockfile_creates_default`, or a plain `it_...`/`should_...` style — either is fine as long as it's consistent within a crate; what matters more than the exact scheme is that the name alone (visible in a CI failure list without opening the file) tells you what broke.

**Arrange-Act-Assert** maps directly onto Rust test functions with no special tooling: setup/fixtures, one call into the code under test, then assertions — matklad's "How to Test" post specifically recommends going further and centralizing the "Act" step into a shared `check(input) -> actual` helper function used by every case, so that when the API under test changes shape, only `check` needs editing rather than every individual test body ([matklad](https://matklad.github.io/2021/05/31/how-to-test.html)).

**Table-driven tests.** Rust has no native table-test syntax; two crates fill the gap:

- `rstest`'s `#[case(...)]` generates one independently named, independently reportable test per row:
```rust
#[rstest]
#[case(0, 0)]
#[case(1, 1)]
#[case(6, 8)]
fn fibonacci_test(#[case] input: u32, #[case] expected: u32) {
    assert_eq!(expected, fibonacci(input));
}
```
  and `#[values(...)]` expands a full cross-product of parameters into separate tests ([rstest docs](https://docs.rs/rstest/latest/rstest/)).
- `rstest`'s `#[fixture]` functions provide dependency-injection-style setup that multiple tests share by naming the fixture as a parameter, avoiding copy-pasted arrange blocks.
- `test-case` is a narrower, older alternative (`#[test_case(0, 0)]` per row) that predates `rstest`'s case support; either is acceptable, but don't mix both idioms in one crate.

The important property either way: a hand-rolled `for` loop over cases inside one `#[test]` fn is strictly worse than either crate, because a failure in case 3 of 10 aborts the loop and hides cases 4–10, and the failure message reports the single wrapping test name, not which case failed. `rstest`/`test-case` give each case its own test identity that nextest, JUnit, and coverage tools all see individually.

### 3. cargo-nextest

`cargo-nextest` re-implements the test runner (not the compiler — it still uses `cargo test`'s build) around one core architectural difference: **one process per test**, rather than `cargo test`'s one-process-with-N-threads model ([nexte.st](https://nexte.st/docs/running/)). Consequences:

- A test that segfaults, aborts, or calls `std::process::exit` no longer takes the rest of the suite down with it — libtest's in-process model does exactly that.
- Tests that mutate process-global state (env vars, cwd) are naturally isolated from each other by default, though *within* a single test process that spawns its own threads, the same env-var-race hazards described in §7 still apply.
- Parallelism is controlled with `-j`/`--test-threads <N>`, accepting `num-cpus` (default), a positive integer, or a negative integer meaning "available parallelism minus N."

**Retries.** `.config/nextest.toml`:
```toml
[profile.default]
retries = 2
flaky-result = "pass"
```
or `cargo nextest run --retries 2`. A test that fails then later passes on retry is marked **flaky**, not failed; nextest surfaces this distinctly in both its terminal summary and JUnit output (`<flakyFailure>`/`<flakyError>`) so retried-but-passing tests don't silently look identical to tests that always passed ([retries docs](https://github.com/nextest-rs/nextest/blob/main/site/src/docs/features/retries.md)). Retries paper over flakiness for CI green/red purposes — they do not fix the underlying non-determinism (see §7) and should be treated as a stopgap with an owner, not a permanent config.

**Partitioning** splits one test binary's tests across N CI shards: `cargo nextest run --partition slice:1/3` runs (position-based) roughly the first third. `hash:1/3` instead assigns tests to shards by a content hash of their name, so which shard a given test lands in stays stable as tests are added/removed elsewhere — useful when shard timing balance matters less than shard *membership* not silently shuffling. `count:m/n` is the older syntax and is deprecated in favour of `slice:m/n`.

**JUnit output** is opt-in per profile:
```toml
# .config/nextest.toml
[profile.ci.junit]
path = "junit.xml"
```
run with `cargo nextest run --profile ci`; the report lands at `target/nextest/ci/junit.xml`. It captures per-test timing, retry/flaky status, and (per `store-failure-output = true`, the default) captured stdout/stderr for failed tests — pass `store-success-output = true` to keep passing-test output too, at the cost of a larger report.

**Timeouts.** A `slow-timeout` config in `.config/nextest.toml` marks tests exceeding a duration as SLOW without necessarily failing them, and a nested `terminate-after` can kill+fail tests that run far past that.

**Doc tests are the one gap.** Nextest deliberately does not run them (rustdoc's doctest harness is a different, incompatible mechanism), so any CI pipeline using nextest for its main suite still needs a separate `cargo test --doc` invocation. A representative CI shape:
```bash
cargo nextest run --workspace --all-features --profile ci
cargo test --doc --workspace --all-features
```

### 4. CLI / end-to-end testing

For a clap-based binary, the standard black-box testing stack is `assert_cmd` + `predicates`:

```rust
use assert_cmd::Command;
use predicates::prelude::*;

#[test]
fn install_missing_arg_fails_with_usage() {
    let mut cmd = Command::cargo_bin("ocx").unwrap();
    cmd.arg("install")
        .assert()
        .failure()
        .code(2)
        .stderr(predicate::str::contains("required argument"));
}
```
`Command::cargo_bin("name")` resolves and runs the crate's own built binary (via `escargot` under the hood for more complex build-flag scenarios) so tests exercise the actual compiled CLI, not a library call into `main`'s internals ([assert_cmd README](https://github.com/assert-rs/assert_cmd)). `.assert()` returns a builder checked against `.success()`/`.failure()`/`.code(n)` for exit status and `predicates::str::*` matchers for stdout/stderr independently — this is the mechanism for asserting exit codes and streams separately rather than concatenating them.

**`trycmd`** (and the lower-level `snapbox` it's built on) targets *many* CLI cases cheaply rather than a few precisely-asserted ones. A `.toml` fixture:
```toml
bin.name = "ocx"
args = ["search", "missing-pkg"]
status.code = 1
```
with companion `case.stdout`/`case.stderr` golden files, or a literate `.trycmd`/`.md` form using `$ ocx search missing-pkg` / `? 1` shell-transcript syntax. Non-deterministic content (paths, temp dirs, timings) is elided with `[..]` (within-line wildcard) or `...` (multi-line wildcard) rather than asserted exactly. Regenerate goldens with `TRYCMD=overwrite cargo test` and review the diff like any other generated-file change ([trycmd docs](https://docs.rs/trycmd/latest/trycmd/)). Use `trycmd` where you have dozens of arg-permutation smoke cases and `assert_cmd` where you need a precise, narrative assertion (specific stderr wording, specific exit code semantics) with room for setup/teardown logic.

**`insta`** handles structured or long output (JSON manifests, rendered tables, multi-line diagnostics) that would be unwieldy as a `predicate::str::contains` chain:
```rust
#[test]
fn manifest_snapshot() {
    let manifest = build_manifest();
    insta::assert_yaml_snapshot!(manifest);
}
```
`cargo insta test` runs the suite and writes any changed snapshot as `<name>.snap.new` beside the accepted `<name>.snap`; `cargo insta review` opens an interactive terminal diff (`a` accept / `r` reject / `s` skip) — snapshots are never hand-edited ([insta.rs CLI docs](https://insta.rs/docs/cli/)). In CI, `cargo insta test -- --check` (or the `CI=1` env var, which `insta` auto-detects) must fail the build on any pending snapshot rather than silently writing `.snap.new` files that nobody reviews.

**Making snapshots stable** requires actively normalizing non-determinism before it hits the snapshot:
- Redact filesystem paths and temp-dir names with `insta::Settings::new().add_dynamic_redaction(...)` or a fixed placeholder.
- Strip/replace timestamps and durations before serializing.
- Force deterministic ordering — sort any `HashMap`/`HashSet`-derived output before snapshotting, since iteration order is randomized per-process.
- Force `NO_COLOR=1` (or clap's `--color never` if exposed) so ANSI escapes don't leak into snapshots and differ by terminal/CI environment.

### 5. Filesystem and network isolation

`tempfile::TempDir` (or `assert_fs::TempDir`, a thin assertion-friendly wrapper) creates a directory removed on `Drop`. The sharp edge: passing the *owned* `TempDir` value into something that only needs `AsRef<Path>` moves and drops it before the callee runs — pass `&temp_dir`, keeping the guard alive for the whole test ([tempfile docs](https://docs.rs/tempfile/latest/tempfile/)):
```rust
// wrong: TempDir dropped (and deleted) before Command runs
Command::new("ocx").current_dir(tempfile::tempdir()?.path()).status()?;

// right: TempDir kept alive for the Command's lifetime
let dir = tempfile::tempdir()?;
Command::new("ocx").current_dir(dir.path()).status()?;
```
Cleanup relies on the `Drop` impl running — a `SIGINT`/hard-kill or a leaked `Box::leak`/`std::mem::forget` on the guard leaves the directory behind, which matters for CI disk-space hygiene on long-running self-hosted runners.

For OCI/registry HTTP interactions, `wiremock` starts a real local HTTP server bound to a random free port per test, so tests are wholly network-free (no calls to `ghcr.io`) yet exercise real request/response parsing, headers, and status-code handling:
```rust
use wiremock::{Mock, MockServer, ResponseTemplate};
use wiremock::matchers::{method, path};

#[tokio::test]
async fn fetch_manifest_ok() {
    let server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/v2/pkg/manifests/latest"))
        .respond_with(ResponseTemplate::new(200).set_body_json(&fake_manifest()))
        .mount(&server)
        .await;

    let client = OcxRegistryClient::new(server.uri());
    assert!(client.fetch_manifest("pkg", "latest").await.is_ok());
}
```
([wiremock docs](https://docs.rs/wiremock/latest/wiremock/)). `mockito` and `httpmock` are viable sync-flavoured alternatives with similar APIs; the project should standardize on exactly one to keep test doubles consistent. Whichever is chosen, CI should actively **ban real network access** in the test job (e.g. a restricted-network runner, or a `#[test]`-time guard that panics on outbound DNS) so a missing mock fails loudly instead of silently hitting the real registry and passing only when the network happens to be up.

### 6. Coverage

`cargo-llvm-cov` (LLVM source-based coverage, via `-C instrument-coverage`) is the tool of choice for a cross-platform (Linux/macOS/Windows) project: it works everywhere `rustc`/LLVM does. `cargo-tarpaulin` predates it, still works, but its default ptrace-based instrumentation is Linux-x86_64-only, which rules it out for a project shipping Windows/macOS binaries as a first-class target ([cargo-llvm-cov README](https://github.com/taiki-e/cargo-llvm-cov)).

```bash
# local, human-readable
cargo llvm-cov --workspace --all-features

# CI: include doc tests, emit lcov, and enforce a floor
cargo llvm-cov --workspace --all-features --doctests --lcov --output-path lcov.info
cargo llvm-cov report --fail-under-lines 80
```
`--doctests` is explicitly called out as relying on unstable/nightly coverage internals — expect it to be flakier across toolchain updates than unit/integration coverage. `--branch` (branch coverage) is likewise still unstable upstream in rustc itself; treat *line/region* coverage as the number you report and gate on, not branch coverage, until that stabilizes.

For Codecov specifically, the region-aware `--codecov` output format is preferred over plain `--lcov` because it reports at LLVM's region granularity rather than collapsing to whole lines:
```yaml
- run: cargo llvm-cov --workspace --all-features --codecov --output-path codecov.json
- uses: codecov/codecov-action@v5
  with:
    files: codecov.json
```
A numeric threshold (e.g. 80% lines) is a regression gate, not a design goal — coverage-of-integration-tests (via `--workspace`, which sweeps `tests/` binaries into the same coverage run as unit tests) matters more for a CLI than unit coverage alone, since a large share of real behaviour (arg parsing, exit codes, file writes) is only exercised end-to-end.

### 7. Flakiness and determinism

Rust-specific flakiness sources, in the order they tend to bite a CLI/filesystem-heavy project:

1. **Parallel test threads sharing process-global state.** `cargo test` and nextest both run tests concurrently by default (nextest: separate processes; plain `cargo test`: separate threads in one process). Any test that calls `std::env::set_var`, changes the process's current directory, or writes to a fixed (non-tempdir) path races every other concurrently-running test doing the same. `serial_test`'s `#[serial]` (optionally `#[serial(key)]` to scope the lock to a named group rather than the whole suite) forces such tests onto a single lane ([serial_test docs](https://docs.rs/serial_test/latest/serial_test/)).
2. **`std::env::set_var`/`remove_var` are `unsafe fn`.** The documented reason: on Unix there is no OS-level synchronization for environment access, and code outside your control (libc, DNS resolution inside the stdlib itself) may read the environment without warning, making concurrent env mutation a genuine data race, not just a testing inconvenience ([std::env::set_var docs](https://doc.rust-lang.org/std/env/fn.set_var.html)). For tests, the two safe patterns are: (a) never mutate process env at all — pass configuration through function parameters or `Command::env()` on a *child* process instead of the parent's environment, or (b) if the code under test genuinely reads `std::env::var` internally, wrap every test that touches it in `#[serial(env)]`.
3. **Shared temp directories** — reusing one fixed path (e.g. `/tmp/ocx-test`) across tests instead of a fresh `tempfile::tempdir()` per test reintroduces the same race as env vars, plus leftover state from a previous failed run corrupting the next one.
4. **Time-dependent tests** — asserting on `SystemTow::now()`-derived values, TTL expiry, or lockfile timestamps directly is inherently racy under load; inject a clock (a trait/closure returning the current time, faked in tests) rather than asserting real wall-clock behaviour, or assert on ranges/relative ordering instead of exact instants.
5. **Ordering assumptions from `HashMap`/`HashSet`** — Rust's default hasher is randomized per-process specifically to prevent HashDoS, so iteration order differs run to run; any test or snapshot depending on it is nondeterministic by construction and needs explicit sorting before comparison.

Retries (nextest `--retries`) are a legitimate CI safety net for genuinely-external flakiness (a real network blip in an already-hermetic-except-one-spot test) but must not be used to mask the causes above — a test that only passes 9/10 times because of a `HashMap` iteration order or an unguarded env var is a bug in the test, and retries just make the bug slower to notice.

### 8. What NOT to test, and suite speed

Don't write tests whose only possible failure is "the compiler would have caught this anyway" — type mismatches, exhaustiveness of a `match` over an enum the compiler already enforces, or a `Result` you already `?`-propagate. matklad's framing is the sharpest available heuristic: would the test still make sense, and still need to pass, if the entire implementation were swapped for a different one with the same *observable* behaviour (the "Neural Network Test")? If the answer is no — the test only passes because it inspects a specific internal call sequence or private field — it is testing implementation, not behaviour, and will break on refactors that change nothing a user could observe ([matklad, "How to Test"](https://matklad.github.io/2021/05/31/how-to-test.html)).

Keep the suite fast primarily by keeping I/O off the default path: matklad's point, directly applicable to an OCI-client CLI, is that pure in-process logic (manifest parsing, dependency resolution, path computation) can have hundreds of sub-millisecond unit tests, while every test that touches a filesystem or network mock is orders of magnitude slower — group the latter deliberately (separate `tests/` binaries, or a `--features slow-tests`/`#[ignore]` gate run only in CI, not on every local `cargo test`) rather than letting slow I/O-bound tests dominate the default local loop. As a concrete operational budget: nextest's own default `slow-timeout` flags any individual test over 60s as suspicious, which is a reasonable per-test ceiling to alarm on; there is no single authoritative "whole suite" budget number in the primary sources reviewed, so treat "the full workspace suite finishes before a developer's attention drifts" (commonly cited informally as a low-tens-of-seconds target for the default/fast profile, with a slower `--profile ci`-only tier for full end-to-end + snapshot suites) as the practical target rather than a sourced hard number.

## Normative guidance candidates

1. **Rule**: Private-implementation assertions go in `#[cfg(test)] mod tests` next to the code; public-contract assertions go in `tests/`. Never `pub(crate)`-widen an item purely so an integration test can reach it.
   **Rationale**: keeps the public API surface honest — if a test needs a wider visibility, that's a signal it belongs in a unit test instead.
   **Verify**: `grep -rn "pub(crate)" src/ | grep -i test` for suspicious widenings; reviewer reads whether a `tests/*.rs` file imports anything not re-exported from the crate root.

2. **Rule**: Any file under `tests/` that exists purely to be `mod`-included by others must live at `tests/common/mod.rs` (or another `tests/<name>/mod.rs`), never `tests/common.rs`.
   **Rationale**: a bare `tests/common.rs` is auto-discovered as its own zero-test binary, adding noise and an extra compiled crate for nothing.
   **Verify**: `find tests -maxdepth 1 -name '*.rs' ! -name 'mod.rs'` then check each has at least one `#[test]`; any helper-only file at that depth is a violation.

3. **Rule**: CI runs `cargo nextest run --workspace --all-features --profile ci` for unit+integration tests AND a separate `cargo test --doc --workspace --all-features` step. Neither replaces the other.
   **Rationale**: nextest does not execute doc tests at all; a CI pipeline that only runs nextest silently stops verifying every code example in the docs.
   **Verify**: `grep -n "cargo test --doc\|cargo test.*--doc" .github/workflows/*.yml`; its absence next to an `cargo nextest run` step is a gap.

4. **Rule**: Every table of related test cases (3+ similar inputs/outputs) uses `#[rstest]` `#[case(...)]` (or `test-case`, pick one project-wide), never a hand-rolled `for` loop inside one `#[test]` fn.
   **Rationale**: a loop hides all cases after the first failure and reports one opaque test name; per-case macros give each row its own name in nextest/JUnit output.
   **Verify**: reviewer heuristic — grep test files for `for .* in \[` or `for .* in vec!` immediately preceding an `assert`; flag for conversion.

5. **Rule**: No test calls `std::env::set_var`/`remove_var` outside a `#[serial(...)]`-guarded test, and none relies on the parent process's real env at all if it can instead use `Command::env()` on a child process.
   **Rationale**: `set_var`/`remove_var` are `unsafe fn` because concurrent env access across threads is a data race the OS does not protect against; parallel test execution turns this into real, sometimes non-reproducible CI flakiness.
   **Verify**: `grep -rn "env::set_var\|env::remove_var" tests/ src/ --include=*.rs`; every hit must have a `#[serial` attribute on its enclosing `#[test]` (or be inside an `unsafe {}` block with a comment justifying single-threaded safety).

6. **Rule**: No test writes to a fixed, non-tempdir filesystem path (`/tmp/foo`, `./scratch`, etc.); every filesystem-touching test creates its own `tempfile::TempDir`/`assert_fs::TempDir` and passes it by reference, not by value, into anything used after creation.
   **Rationale**: fixed paths race across parallel tests and leak state between runs; passing the owned guard drops (and deletes) the directory before use.
   **Verify**: `grep -rn '"/tmp/\|"./scratch' tests/ src/`; and grep for `tempdir()` calls immediately followed by `.path()` being used without the binding (`tempfile::tempdir()?.path()` inline) — a common accidental-drop pattern.

7. **Rule**: No test in the default profile makes a real network call; all HTTP/registry interaction in tests goes through `wiremock` (or the project's single chosen mocking crate) bound to a local random port.
   **Rationale**: real network calls make tests slow, non-hermetic, and dependent on `ghcr.io` uptime/rate limits — exactly the opposite of what a security-sensitive package manager's test suite should assume.
   **Verify**: CI job runs with network egress blocked (or a DNS-deny sidecar) for the default test profile; any test that needs real network is explicitly tagged (`#[ignore = "network"]`) and excluded from that job.

8. **Rule**: `insta` snapshots never contain absolute filesystem paths, wall-clock timestamps, or ANSI colour codes; redact/normalize before `assert_*_snapshot!`, and CI runs `cargo insta test -- --check` (or sets `CI=1`) so a pending `.snap.new` fails the build instead of merging silently.
   **Rationale**: unredacted snapshots are non-deterministic by construction and will flap on machine/CI differences; an unreviewed `.snap.new` merged as a normal file defeats the point of snapshot review.
   **Verify**: `grep -rn "assert_.*_snapshot" tests/ src/` then inspect each for a preceding `Settings`/redaction call when the snapshotted value can contain a path or timestamp; `find . -name '*.snap.new'` must be empty in CI.

9. **Rule**: Coverage is measured with `cargo llvm-cov --workspace --all-features --doctests`, not `cargo-tarpaulin`, and CI enforces a numeric floor via `--fail-under-lines <N>` rather than a human eyeballing a report.
   **Rationale**: tarpaulin's default ptrace instrumentation only supports Linux x86_64, which cannot cover this project's macOS/Windows targets; an unenforced coverage number silently erodes.
   **Verify**: `grep -rn "tarpaulin" .github/ Cargo.toml`; should return nothing. `grep -n "fail-under" .github/workflows/*.yml` should exist.

10. **Rule**: Nextest CI sharding uses `--partition hash:m/n`, not `count:m/n`, when the shard a given test lands in must stay stable as tests are added or removed elsewhere in the suite.
    **Rationale**: `count:m/n` is deprecated; `hash:m/n` keeps per-shard membership stable across suite churn, avoiding shard-timing surprises on every PR.
    **Verify**: `grep -n "partition" .github/workflows/*.yml`; flag any `count:` usage for migration to `hash:` or `slice:`.

## AI-agent angle

- **Hallucinated `std::env::set_var` safety.** An agent trained mostly on pre-edition-2024 Rust will write `std::env::set_var("KEY", "val")` as a bare call, which no longer compiles once the surrounding fn isn't itself `unsafe`, or worse, wraps it in an unjustified blanket `unsafe {}` without adding the `#[serial]` guard that actually makes it sound under parallel test execution. **Check**: `grep -n "env::set_var\|env::remove_var" -A2 -B2` and confirm each call site is either inside a `#[serial]`-tagged test or replaced with `Command::env()` on a child process — an `unsafe` block alone is not sufficient evidence of correctness, only of compiling.
- **Fabricated nextest doc-test support.** Agents frequently assume `cargo nextest run` covers everything `cargo test` does, including doc tests, and either omit a `cargo test --doc` CI step entirely or (worse) claim in a comment that nextest "runs all tests including doctests." **Check**: grep the CI workflow for both `cargo nextest run` and `cargo test --doc`/`cargo test .*--doc`; the first without the second is an incomplete pipeline, silently un-tested doc examples.
- **`tests/common.rs` instead of `tests/common/mod.rs`.** This is an extremely common agent mistake because the flat filename looks more natural; it compiles and "half-works" (the helper functions are usable) but adds a spurious zero-test binary to every `cargo test` run, and agents often don't notice the extra "running 0 tests" section is a smell. **Check**: `find tests -maxdepth 1 -type f -name '*.rs' ! -name 'mod.rs'` — any hit that's imported via `mod` from other files in the same run is the anti-pattern.
- **Owned `TempDir` dropped before use.** A very common pattern-that-compiles-but-is-wrong: `Command::new(bin).current_dir(tempfile::tempdir()?.path())` — the temporary `TempDir` value is dropped (and its directory deleted) at the end of that statement, before `Command` ever runs, because nothing keeps the guard alive. Tests using this pattern intermittently pass (if cleanup races favorably) and intermittently fail with ENOENT. **Check**: grep for `tempdir()?.path()` or `tempdir().unwrap().path()` used inline within the same expression rather than bound to a `let` first.
- **Hand-edited `.snap` files.** An agent asked to "fix the failing snapshot test" will sometimes edit the `.snap` file's expected-value text directly to match new output, rather than running `cargo insta review`/`cargo insta accept` — this bypasses the entire review workflow insta exists for, and risks hand-typo'd snapshot content that no longer matches what the code actually produces. **Check**: a `.snap` file changed in a diff without a corresponding `.snap.new` having existed, or without `cargo insta` appearing anywhere in the PR's CI log, is suspicious — re-run `cargo insta test` and diff against the committed `.snap`.
- **Deprecated `count:m/n` nextest partitioning.** Training data cutoffs predating the `slice:m/n` rename mean agents often emit `--partition count:2/4`-style CI matrix config, which still works but is the deprecated form. **Check**: `grep -n "partition count:" .github/workflows/*.yml` and migrate to `slice:` or `hash:`.

## Contested / evolving

- **`count:m/n` vs `slice:m/n` vs `hash:m/n` partitioning.** nextest deprecated `count:m/n` in favour of `slice:m/n`, while keeping `hash:m/n` for cases where shard-membership stability matters more than even time distribution across shards ([nexte.st changelog](https://nexte.st/changelog/)). Practice is actively migrating; older CI configs and older agent training data will still show `count:`.
- **Branch coverage in Rust remains unstable.** `cargo-llvm-cov --branch` and the underlying rustc branch-coverage instrumentation are both explicitly flagged unstable by the tool's own maintainers ([cargo-llvm-cov README](https://github.com/taiki-e/cargo-llvm-cov)); the ecosystem consensus is still "report line/region coverage, treat branch coverage as experimental," and this has not visibly changed as of 2026.
- **tarpaulin vs llvm-cov.** tarpaulin was the de facto standard before llvm-cov existed and remains in wide use in older Rust projects' CI, but for any project targeting Windows/macOS (as OCX/Grimoire does) llvm-cov is the only realistic choice since tarpaulin's ptrace approach is Linux-only; expect this gap to persist rather than close, since tarpaulin's instrumentation model is fundamentally OS-specific.
- **matklad's "test features, not code" stance is a minority-strong opinion, not universal consensus.** It's influential and widely cited in the Rust community, but it explicitly argues against classic isolated-unit-test orthodoxy (heavy mocking, one test per private function) that plenty of production Rust codebases still practice; treat it as the sharpest available heuristic for *this* project's stated pain point (functions dominating a monolithic crate) rather than as uncontested doctrine.
- **Whole-suite runtime budgets have no single authoritative number.** Sources reviewed give a per-test slow-timeout default (nextest: 60s) but no sourced "whole workspace suite should finish in X seconds" figure; this guidance is necessarily heuristic/practice-derived rather than citable to a primary source.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [doc.rust-lang.org/book/ch11-03-test-organization.html](https://doc.rust-lang.org/book/ch11-03-test-organization.html) | The Rust Book, official test-organization chapter | Evergreen, current | Primary, canonical source for unit/integration test structure and `tests/common/mod.rs` convention |
| [doc.rust-lang.org/rustdoc/write-documentation/documentation-tests.html](https://doc.rust-lang.org/rustdoc/write-documentation/documentation-tests.html) | Official rustdoc book, doctest chapter | Current (references edition 2024 doctest-merging behaviour) | Primary source on doc-test mechanics, attributes, and why nextest can't run them |
| [doc.rust-lang.org/std/env/fn.set_var.html](https://doc.rust-lang.org/std/env/fn.set_var.html) | Official std library API docs for `env::set_var` | Current | Primary source for the exact Safety contract that makes env mutation unsafe in tests |
| [nexte.st/docs/running/](https://nexte.st/docs/running/) | Official cargo-nextest docs, "Running tests" | Current, actively maintained | Primary source on process-per-test model, `-j`/test-threads, fail-fast, doctest limitation |
| [github.com/nextest-rs/nextest/.../features/retries.md](https://github.com/nextest-rs/nextest/blob/main/site/src/docs/features/retries.md) | nextest source-tree docs for retries | Current | Primary source for retry/flaky-test config syntax and JUnit flaky reporting |
| [nexte.st/changelog/](https://nexte.st/changelog/) | Official nextest changelog | Current, rolling | Primary source establishing `slice:m/n` vs deprecated `count:m/n` vs `hash:m/n` |
| [github.com/assert-rs/assert_cmd](https://github.com/assert-rs/assert_cmd) | Official assert_cmd repo/README | Current | Primary source for `Command::cargo_bin`, `.assert()` API, relationship to escargot |
| [docs.rs/trycmd/latest/trycmd/](https://docs.rs/trycmd/latest/trycmd/) | Official trycmd crate docs | Current | Primary source for golden-file CLI test format, `TRYCMD=overwrite` workflow, wildcard elision syntax |
| [insta.rs/docs/cli/](https://insta.rs/docs/cli/) | Official cargo-insta CLI docs | Current | Primary source for `cargo insta test`/`review` workflow and CI-aware `--unreferenced auto` behaviour |
| [github.com/taiki-e/cargo-llvm-cov](https://github.com/taiki-e/cargo-llvm-cov) | Official cargo-llvm-cov README | Current, actively maintained | Primary source for coverage flags, `--doctests`, `--branch` unstable status, Codecov integration |
| [docs.rs/rstest/latest/rstest/](https://docs.rs/rstest/latest/rstest/) | Official rstest crate docs | Current | Primary source for `#[case]`/`#[fixture]`/`#[values]` table-driven test syntax |
| [docs.rs/wiremock/latest/wiremock/](https://docs.rs/wiremock/latest/wiremock/) | Official wiremock crate docs | Current | Primary source for async HTTP mocking pattern used to hermetically test an OCI/registry client |
| [docs.rs/serial_test/latest/serial_test/](https://docs.rs/serial_test/latest/serial_test/) | Official serial_test crate docs | Current | Primary source for `#[serial]`/`#[parallel]` semantics and keyed serialization groups |
| [docs.rs/tempfile/latest/tempfile/](https://docs.rs/tempfile/latest/tempfile/) | Official tempfile crate docs | Current | Primary source for `TempDir` Drop-based cleanup and the owned-vs-reference pitfall |
| [nexte.st/docs/machine-readable/junit/](https://nexte.st/docs/machine-readable/junit/) | Official nextest JUnit docs | Current | Primary source for exact `.config/nextest.toml` JUnit config and captured fields |
| [matklad.github.io/2021/05/31/how-to-test.html](https://matklad.github.io/2021/05/31/how-to-test.html) | Influential Rust-community blog post ("How to Test") by a rust-analyzer/TigerBeetle-affiliated author | 2021, still widely cited in 2026 | Secondary but high-signal source for "test features not code," the Neural Network Test heuristic, and keeping I/O off the fast path |
| [github.com/rusqlite/rusqlite/issues/1195](https://github.com/rusqlite/rusqlite/issues/1195) | Real project's GitHub issue discussing llvm-cov vs tarpaulin tradeoffs | Community discussion, recent | Secondary corroboration of the cross-platform llvm-cov-over-tarpaulin recommendation from actual maintainers, not just tool docs |
