---
title: Dependency Injection, I/O Seams, and Testability in Rust
topic: rust-type-architecture
agent: di-and-testability-seams
model: sonnet
date_researched: 2026-08
sources_count: 17
scope: |
  Covers trait-based I/O seams (fs, clock, env, network, process, registry clients), the
  generic-vs-dyn-vs-enum dispatch tradeoff, the sans-io pattern, hexagonal architecture in
  Rust, mocking/fake tooling (mockall, faux, vfs, wiremock-rs, assert_fs, assert_cmd), and
  config-injection vs global state. Does NOT cover async runtime selection, property-based
  testing (proptest/quickcheck), or fuzzing — those are separate subareas.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Traits as I/O seams](#1-traits-as-io-seams)
   2. [Generic parameter vs `&dyn Trait` vs enum dispatch](#2-generic-parameter-vs-dyn-trait-vs-enum-dispatch)
   3. [The sans-IO pattern](#3-the-sans-io-pattern)
   4. [Hexagonal / ports-and-adapters in Rust](#4-hexagonal--ports-and-adapters-in-rust)
   5. [Mocking and test doubles](#5-mocking-and-test-doubles)
   6. [In-memory filesystems and HTTP mocking](#6-in-memory-filesystems-and-http-mocking)
   7. [CLI-level integration testing](#7-cli-level-integration-testing)
   8. [Free functions vs type-owned code: before/after](#8-free-functions-vs-type-owned-code-beforeafter)
   9. [Config/context structs vs globals, `OnceLock`, thread-locals](#9-configcontext-structs-vs-globals-oncelock-thread-locals)
   10. [The clock as a seam](#10-the-clock-as-a-seam)
   11. [The environment as a seam — and a 2024-edition landmine](#11-the-environment-as-a-seam--and-a-2024-edition-landmine)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

---

## Summary

- A trait is a seam only if production code is generic (or `dyn`) over it; a trait with exactly
  one `impl` and call sites that name the concrete type is decoration, not a seam.
- Prefer a generic type parameter (`fn run<F: Fs>(fs: &F)`) at the boundary of a crate/module for
  zero-cost static dispatch; switch to `&dyn Trait` only when you need heterogeneity (a `Vec` of
  mixed adapters), an object stored in a struct field without infecting the struct with a type
  parameter, or you want to keep binary size and compile time down in a CLI with many call sites.
- `enum_dispatch` (or a hand-rolled enum) beats `dyn Trait` on raw call speed and is appropriate
  when the set of implementations is closed and owned by your crate; it loses to `dyn Trait` the
  moment external/plugin implementations must be supported.
- `async fn` in traits (stabilized Rust 1.75, Dec 2023) is **not dyn-compatible** — RPITIT return
  types can't be boxed into a vtable slot automatically. If a trait must support both async
  methods and `dyn` dispatch, use the `async-trait` crate (`Pin<Box<dyn Future + Send>>`) or the
  `Send`-bounded `impl Future<Output = _> + Send` form and keep dispatch generic instead.
- The sans-IO pattern extracts pure protocol/algorithm state machines that take input, mutate
  `&mut self`, and hand back "please do this I/O" values (`poll_transmit`, `poll_timeout`) — no
  socket, no clock, no async runtime inside the type. `quinn-proto`, `rustls`, and Firezone's
  connection layer are production examples of this at the network-protocol scale.
- Sans-IO is worth the extra boilerplate when: the logic is a genuine protocol/state machine
  reused across sync/async/embedded/WASM, or when tests need to fast-forward time deterministically.
  It is not worth it for simple, one-shot orchestration code — that's what a trait seam is for.
- Hexagonal architecture translates to Rust as: domain logic depends on traits ("ports"); adapters
  (HTTP handler, SQL repo, OCI registry client) implement them ("adapters"); wiring happens via
  generic parameters on an application/service struct, not a DI container or reflection.
- What does *not* survive translation from OOP: DI containers/reflection-based wiring (Rust has
  none, and doesn't need one — the compiler enforces the wiring at the generic-parameter call
  site), and "interface for every class" — Rust's convention is closer to "trait for every
  seam you actually cross in a test," not one trait per struct.
- `mockall` (`#[automock]`, `mock!`) is the default choice for trait-based mocks with expectation/
  sequence verification; it requires you to already have extracted a trait. `faux` mocks a
  concrete `struct` directly without requiring you to introduce a trait — useful mid-refactor or
  when a trait genuinely has only one production implementation and would be an unrequested
  abstraction otherwise.
- `vfs` gives a `FileSystem` trait with `PhysicalFS`/`MemoryFS`/`OverlayFS`/`AltrootFS`
  implementations — swap `MemoryFS` in for unit tests of path-manipulation-heavy logic without
  touching disk. For CLI-level tests, `assert_fs` (real temp dirs + predicates) is more common
  and more honest than a fully virtual filesystem, because atomic-write/rename/permission bugs
  only reproduce on a real filesystem.
- `wiremock-rs` (async, tokio-based, request matcher DSL) and `httpmock` (sync+async, parallel
  test execution) are the two live HTTP-mocking crates for registry-client tests; `mockito` still
  exists but requires sequential test execution and is the older design.
- `assert_cmd` + `assert_fs` + `predicates` is the standard trio for black-box CLI testing:
  spawn the actual compiled binary (`Command::cargo_bin`), assert exit code/stdout/stderr, assert
  on files it wrote. This is the *fallback* test layer for logic you didn't extract a seam for —
  useful, but it can't cover error branches that are hard to trigger through the real filesystem
  or a real registry.
  free functions that call `std::fs`, `reqwest::get`, `Command::new`, or `Instant::now()`
  directly force integration-only testing: every test that exercises that function must go
  through real I/O, so error paths (permission denied, partial write, 500 response, clock skew)
  become expensive or impossible to hit without root, network flakiness, or `sleep`.
- Prefer an explicit `Context`/config struct (assembled once at `main`, passed down by
  reference) over `OnceLock`/`lazy_static` globals or thread-locals for anything a test needs to
  vary — globals force all tests in a process to agree on one value and serialize on it (or use
  `#[serial]`), while a passed-in struct lets each test construct its own.
- `std::env::set_var`/`remove_var` became `unsafe fn` in the **2024 edition** (stabilized via
  edition migration, RFC discussion in [rust-lang/rust#124636](https://github.com/rust-lang/rust/pull/124636))
  because mutating the process environment races with any concurrent read from another thread —
  a real hazard when `cargo test` runs tests in parallel threads. This is a strong argument
  *against* testing env-var-reading code by mutating real process env in parallel tests; inject
  the value instead.
- `async fn` in traits, `dyn`-compatibility rules (renamed from "object safety" in the current
  Rust Reference), and the 2024-edition `unsafe` env functions are all **new since ~2023–2024**;
  guidance and training data predating this window will get the dyn-compatibility and env-var
  safety story wrong.

## Findings

### 1. Traits as I/O seams

The general move: identify where your code crosses a boundary the test suite cannot or should
not cross for real (disk, network, wall clock, environment, child processes, an OCI registry
API), and put a trait at exactly that boundary — not one layer up, not one layer down.

```rust
// Seam at the right altitude: one trait per capability actually needed.
trait PackageStore {
    fn write_blob(&self, digest: &Digest, bytes: &[u8]) -> io::Result<()>;
    fn read_blob(&self, digest: &Digest) -> io::Result<Vec<u8>>;
}

trait RegistryClient {
    fn fetch_manifest(&self, reference: &Reference) -> Result<Manifest, RegistryError>;
    fn fetch_blob(&self, digest: &Digest) -> Result<Bytes, RegistryError>;
}

trait Clock {
    fn now(&self) -> SystemTime;
}
```

A struct that needs all three is generic over them (or holds `Arc<dyn _>` fields — see §2), and
production `main()` wires up `PhysicalStore`, `OciHttpClient`, `SystemClock`; tests wire up
`InMemoryStore`, `StubRegistry`, `FixedClock`. The Rust API Guidelines' C-OBJECT guidance frames
this as a decision made "early" in a trait's design: is this trait meant to be used as a bound
(generic), an object (`dyn`), or both — see §2 for the concrete cost/ergonomics tradeoff
[Rust API Guidelines, Flexibility](https://rust-lang.github.io/api-guidelines/flexibility.html).

For process spawning specifically, the same pattern applies to `std::process::Command`: wrap the
"spawn this and check exit status" call behind a small trait (or accept a closure) so tests can
assert on *what would have been run* instead of actually spawning a subprocess (important for
security-sensitive code that executes downloaded tool binaries).

### 2. Generic parameter vs `&dyn Trait` vs enum dispatch

Three real options, not two:

| | Dispatch | Call-site cost | Ergonomics | Use when |
|---|---|---|---|---|
| `fn f<T: Trait>(t: &T)` | static, monomorphized | zero runtime cost; N copies in binary | every generic param must be threaded through the whole call chain, or hidden behind a newtype wrapper | the seam is crossed in a hot path, or you want the compiler to catch a wiring mistake at the call site |
| `fn f(t: &dyn Trait)` | dynamic, vtable | one indirect call; no code bloat | trait must be dyn-compatible (see below); easy to store in a `Vec<Box<dyn Trait>>` or a struct field without infecting the struct with a type parameter | heterogeneous collections, plugin-style extensibility, or you want one non-generic struct wired at `main()` |
| `enum Impl { A(A), B(B) }` + `match` | static, but through one indirection point | compiles to a jump table, no vtable lookup — `enum_dispatch` reports **up to 10x** faster than `dyn` in its own benchmarks | the enum must live in a crate the trait and all variants are visible to (for `enum_dispatch`); adding a new implementation means editing the enum | the implementation set is closed, known, and owned by your crate, and call-site perf matters more than open extensibility [Possible Rust: Enum or Trait Object](https://www.possiblerust.com/guide/enum-or-trait-object), [enum_dispatch docs](https://docs.rs/enum_dispatch/latest/enum_dispatch/) |

Trait-object viability is governed by **dyn-compatibility** (the current Rust Reference term —
"formerly known as object safety"): no `Sized` supertrait, no associated constants, no generic
associated functions, no opaque (`impl Trait`/`async fn`) return types, and every dispatchable
method must take `&self`/`&mut self`/`Box<Self>`/`Rc<Self>`/`Arc<Self>`/`Pin<P>` as receiver
[Rust Reference, dyn-compatibility](https://doc.rust-lang.org/reference/items/traits.html#dyn-compatibility).

**This directly hits async I/O seams.** `async fn` in traits, stabilized in Rust 1.75 (Dec 2023),
desugars to a method returning `impl Future<...>` — an opaque return type — which the
dyn-compatibility rules above explicitly forbid
[Rust Blog, "Announcing async fn and RPIT in traits"](https://blog.rust-lang.org/2023/12/21/async-fn-rpit-in-traits/).
So a trait like `trait RegistryClient { async fn fetch_manifest(&self, ...) -> Result<...>; }`
cannot be turned into `dyn RegistryClient` at all — the compiler rejects it. Two fixes:

```rust
// Fix 1: stay generic (works today, no macro, no allocation)
trait RegistryClient: Send + Sync + 'static {
    fn fetch_manifest(&self, r: &Reference)
        -> impl Future<Output = Result<Manifest, RegistryError>> + Send;
}
fn install<C: RegistryClient>(client: &C) { /* ... */ }

// Fix 2: need dyn (heterogeneous adapters, stored in a struct field) — box the future
#[async_trait::async_trait]
trait RegistryClient: Send + Sync {
    async fn fetch_manifest(&self, r: &Reference) -> Result<Manifest, RegistryError>;
}
struct App { client: Arc<dyn RegistryClient> }
```

`async-trait` transforms each method into one returning
`Pin<Box<dyn Future<Output = _> + Send + 'async_trait>>`, paying one heap allocation per call in
exchange for dyn-compatibility
[docs.rs/async-trait](https://docs.rs/async-trait). As of 2026 there is no fully stable
zero-cost way to get both async methods and `dyn` dispatch on the same trait; this is active
work (`dyn*`, return-type-notation) but not yet shipped for this use case
[baby steps, "Dyn async traits, part 10"](https://smallcultfollowing.com/babysteps/blog/2025/03/24/box-box-box/).

The public-API cost of `dyn` matters for library design too: if a trait method is dyn-dispatched
publicly, every type in its signature must also be public, or callers can't name the trait —
this pushes toward wrapping the trait object in a private newtype (`pub struct Connection(Arc<dyn Db + Send + Sync>)`)
so the trait itself, and its argument types, can stay crate-private
[jmmv.dev, "Rust traits and dependency injection"](https://jmmv.dev/2022/04/rust-traits-and-dependency-injection.html).

### 3. The sans-IO pattern

Sans-IO (the term predates Rust — it originates in the Python networking community) means: the
protocol/algorithm is a pure state machine that never calls a socket, a clock, or a sleep
function itself. It receives bytes and an `Instant` as parameters, mutates `&mut self`, and
returns "here is what you should transmit" / "here is when to call me again" values that the
*caller* (the actual I/O loop) is responsible for acting on:

```rust
impl Protocol {
    fn handle_input(&mut self, packet: &[u8], now: Instant);
    fn poll_transmit(&mut self) -> Option<Transmit>;
    fn handle_timeout(&mut self, now: Instant);
    fn poll_timeout(&self) -> Option<Instant>;
}
```

The caller's event loop does the real I/O:

```rust
loop {
    if let Some(transmit) = proto.poll_transmit() {
        socket.send_to(&transmit.payload, transmit.dst)?;
    }
    proto.handle_input(&buf[..n], Instant::now());
    if let Some(deadline) = proto.poll_timeout() { /* schedule wake */ }
}
```

Production adopters at real scale: **`quinn-proto`** ("a deterministic state machine of the
[QUIC] protocol which performs no I/O internally," used by `quinn`'s tokio-based async layer and
independently testable with simulated I/O for reproducible, sleep-free timing tests)
[quinn README](https://github.com/quinn-rs/quinn/blob/main/README.md); **`rustls`** (TLS state
machine with no socket ownership — the caller feeds/drains buffers); and Firezone's connection
layer, whose engineering blog is the most concrete Rust-specific writeup of the tradeoff, framing
it as solving async's "function coloring" problem: an async dependency infects every caller with
`async`, whereas a sans-IO struct is plain, synchronous, `Send`-agnostic Rust that any runtime
(or no runtime, or WASM) can drive
[Firezone Blog, "sans-IO Pattern in Rust Networking Code"](https://www.firezone.dev/blog/sans-io).

**Cost**: you write the state machine *and* the event loop as separate things — no `async`/`await`
sugar for sequential "send, then wait for reply, then send again" flows; that has to become
explicit state. Firezone's own writeup calls the pattern "not particularly wide-spread (yet)" in
the ecosystem.

**Worth it when**: the logic is a genuine protocol/algorithm reused across multiple I/O contexts
(sync, async, multiple async runtimes, embedded, WASM), or when a test suite needs to advance
simulated time by minutes/hours instantly instead of `tokio::time::advance` plus careful runtime
setup. **Not worth it** for straight-line orchestration code ("download this, verify the digest,
extract it, write the lockfile") — that's exactly what a plain I/O-seam trait (§1) is for, at a
fraction of the design cost.

### 4. Hexagonal / ports-and-adapters in Rust

The mapping is close but not 1:1. Domain logic defines traits ("ports"); infrastructure code
implements them ("adapters" — an HTTP handler is an *inbound* adapter, a SQL repo or OCI registry
client is an *outbound* adapter). A worked, current (2026) example:

```rust
// domain/ports — no reference to sqlx, reqwest, tokio, etc.
pub trait AuthorRepository: Clone + Send + Sync + 'static {
    fn create_author(&self, req: &CreateAuthorRequest)
        -> impl Future<Output = Result<Author, CreateAuthorError>> + Send;
}

// application — generic over the port, wired at main()
struct Service<R: AuthorRepository> { repo: R }
```

[howtocodeit.com, "Master Hexagonal Architecture in Rust"](https://www.howtocodeit.com/guides/master-hexagonal-architecture-in-rust)

**What survives the OOP→Rust translation**: the port/adapter *shape* (an interface the domain
depends on, an implementation the infrastructure provides), and the discipline of not leaking a
third-party crate's types (e.g. `sqlx::Error`, `reqwest::Error`, an OCI client's wire types)
across the port boundary — wrap them in domain error/data types at the adapter.

**What does not survive**: DI *containers* and reflection-based runtime wiring. Rust has neither
reflection nor a conventional IoC container; wiring is just constructing the concrete adapters in
`main()` (or a `main`-adjacent composition function) and passing them into a generic
`Service<R, M, N>` or behind `Arc<dyn Trait>` fields — the compiler, not a container, verifies
the wiring is complete and type-correct. The "one interface per class" OOP reflex also doesn't
survive: a trait should exist because a test (or a second production implementation) genuinely
needs it, not because every struct "should" have an interface — an unrequested single-impl trait
is exactly the kind of abstraction the Rust community explicitly warns against re-adding via
`faux`'s design rationale (§5).

Real-world crate layout convention seen across multiple current write-ups: separate
`*-core`/`domain` crate (traits + domain types, no I/O deps), `*-adapters` crate (concrete infra
impls), optional `*-fixtures`/test-support crate (in-memory fakes reused across the workspace's
tests), and one or more binary crates that assemble the concrete graph
[Cogs and Levers, "Hexagonal Architecture in Rust"](http://tuttlem.github.io/2025/08/31/hexagonal-architecture-in-rust.html).
For a currently single-crate codebase, the same layering can start as `mod domain`, `mod
adapters` inside one crate and be split into workspace members later — the module boundary is
what matters for testability, not the crate boundary.

### 5. Mocking and test doubles

**`mockall`** (current: 0.15.x, MSRV 1.77+) is the default for trait-based mocking in current
Rust: `#[automock]` on a trait definition generates `MockYourTrait` with `.expect_method()`
builders supporting argument matchers, call counts, and cross-object call-sequence verification
[GitHub, asomers/mockall](https://github.com/asomers/mockall):

```rust
#[cfg_attr(test, automock)]
trait RegistryClient {
    fn fetch_manifest(&self, r: &Reference) -> Result<Manifest, RegistryError>;
}

#[test]
fn retries_on_transient_error() {
    let mut mock = MockRegistryClient::new();
    mock.expect_fetch_manifest()
        .times(1)
        .returning(|_| Err(RegistryError::Timeout));
    // ... assert the caller retries or surfaces the error correctly
}
```

**`faux`** (0.1.x, MSRV 1.65+) mocks a `struct` directly — `#[faux::create]` +
`#[faux::methods]` — with no trait required, explicitly because "traits with single
implementations are an undue burden and an unnecessary layer of abstraction"
[GitHub, nrxus/faux](https://github.com/nrxus/faux). Use it when you have exactly one production
implementation and don't want a trait purely to satisfy a mocking library — but note it leans on
unsafe internals and is test-only by the author's own guidance.

**Choosing between them and hand-written fakes**: an informal but widely cited 2018–2019 shootout
of ~9 mocking libraries found "no one library clearly superior," and specifically noted that
proc-macro-based libraries (mockall, mockers) trade lower verbosity for harder-to-debug generated
code [Rust Mock Shootout](https://asomers.github.io/mock_shootout/) — **flagged as historical**:
most libraries in that comparison (Mockers, Mock_Derive, Galvanic-mock, Pseudo) are now dead or
superseded; mockall (created by the same author *after* that shootout) and faux are the two
still actively maintained as of 2026. A hand-written fake (a small struct implementing the trait
with a `Vec`/`HashMap` backing store) remains preferable to any mocking crate when the fake's
behavior *is* the interesting part of the test (e.g. a fake registry that actually enforces
digest matching) rather than a sequence of stubbed return values — mocking crates are for
verifying *interactions*, fakes are for verifying *behavior against a seam*.

### 6. In-memory filesystems and HTTP mocking

**`vfs`** (0.13.x) defines a `FileSystem` trait with `PhysicalFS` (real disk), `MemoryFS`
(in-process, ephemeral), `AltrootFS` (rooted subview of another `VfsPath`), and `OverlayFS`
(union of a writable and read-only layer) — same code runs against any of them through a
`VfsPath` handle [docs.rs/vfs](https://docs.rs/vfs/latest/vfs/):

```rust
let root: VfsPath = MemoryFS::new().into();
root.join("test.txt")?.create_file()?.write_all(b"hello")?;
```

Good for unit tests of pure path/tree logic (does the lockfile-diffing algorithm walk the tree
correctly?). **Not a substitute** for real-filesystem tests of atomic writes, rename-based
publish, permission bits, or symlink handling — those bugs only reproduce against a real
filesystem, which is what `assert_fs`/`tempfile` are for.

**`assert_fs`** (1.1.x) pairs a real `TempDir`/`NamedTempFile` sandbox with the `predicates`
crate for assertions:

```rust
let temp = assert_fs::TempDir::new().unwrap();
let f = temp.child("foo.txt");
f.touch().unwrap();
// ... run code under test against temp.path() ...
f.assert("");
temp.child("bar.txt").assert(predicate::path::missing());
```
[docs.rs/assert_fs](https://docs.rs/assert_fs/latest/assert_fs/)

**HTTP mocking** for registry-client tests: `wiremock-rs` (0.6.x, async/tokio, request-matcher
DSL, one isolated `MockServer` per test with automatic cleanup on drop, pools servers internally
for speed) is the standard choice for async codebases:

```rust
let server = MockServer::start().await;
Mock::given(method("GET")).and(path("/v2/pkg/manifests/latest"))
    .respond_with(ResponseTemplate::new(200).set_body_json(&manifest))
    .mount(&server).await;
// point the RegistryClient under test at server.uri()
```
[wiremock-rs README](https://github.com/LukeMathWalker/wiremock-rs/blob/main/README.md)

`httpmock` is the alternative when sync and parallel test execution matter more than the
wiremock matcher ergonomics; `mockito` still exists but its design requires sequential test
execution, which is a real cost in a large `cargo test` suite
[WebSearch summary of wiremock/httpmock/mockito comparisons](https://wiremock.org/docs/solutions/rust/).

### 7. CLI-level integration testing

For a clap-based CLI, the standard black-box layer is **`assert_cmd`** (spawns the actual
compiled binary via `Command::cargo_bin("grim")`) combined with **`assert_fs`** (real temp dirs
as the CLI's working directory/cache dir) and **`predicates`** (composable assertions):

```rust
Command::cargo_bin("grim")?
    .args(["install", "some/pkg"])
    .current_dir(temp.path())
    .assert()
    .success()
    .stdout(predicate::str::contains("installed"));
```
[docs.rs/assert_cmd](https://docs.rs/assert_cmd/latest/assert_cmd/),
[assert-rs/assert_cmd README](https://github.com/assert-rs/assert_cmd)

This layer is necessary but not sufficient: it proves the binary behaves correctly end-to-end for
the paths you can trigger through real files/exit codes, but it cannot cheaply cover registry
5xx responses, partial-download resumption, or concurrent-lock contention — those need the
seams from §1/§6, unit-tested without a subprocess.

### 8. Free functions vs type-owned code: before/after

Free functions that reach directly into global I/O force every test that touches them into the
integration tier — there is no way to substitute a fake for `std::fs::write` called inside the
function body. This is the concrete failure mode named in the project's own known pain point
(free-function-heavy code in one crate):

```rust
// BEFORE — untestable except by running it against the real filesystem
pub fn write_lockfile(path: &Path, lock: &Lockfile) -> io::Result<()> {
    let tmp = path.with_extension("tmp");
    std::fs::write(&tmp, toml::to_string(lock)?)?;
    std::fs::rename(&tmp, path)?;   // can this test ever see a rename failure?
    Ok(())
}

// AFTER — the write/rename seam is a trait; the function is pure orchestration
trait AtomicWriter {
    fn write_atomic(&self, path: &Path, bytes: &[u8]) -> io::Result<()>;
}

pub fn write_lockfile<W: AtomicWriter>(w: &W, path: &Path, lock: &Lockfile) -> io::Result<()> {
    w.write_atomic(path, toml::to_string(lock)?.as_bytes())
}

// test: a FailingWriter that returns Err on the 2nd call proves the caller
// surfaces a rename failure correctly — impossible to trigger through a real fs
// without racing another process.
```

The "after" version costs one trait + one extra parameter; it buys deterministic tests for the
exact failure modes (partial write, rename-across-devices, permission denied) that matter most
in a security-sensitive package manager. This is the general shape every free-function seam in
§1 should take: don't test the orchestration function against real I/O at all — test it against
a fake that can be made to fail on command, and reserve real-I/O testing for the one adapter
implementation itself (a single, narrow test per adapter, not per caller).

### 9. Config/context structs vs globals, `OnceLock`, thread-locals

A `Context`/`Config` struct built once (typically in `main`, from parsed CLI args + env + config
file) and threaded down by reference (or inside an `Arc`) is strictly more testable than a
process-global: each test constructs its own `Context` with whatever cache dir, registry URL, or
credentials it needs, and tests run in parallel without interfering. `OnceLock`/`lazy_static`
globals force every test in the process to agree on one value (or serialize with `#[serial]`
from the `serial_test` crate), which is a real tax on a large `cargo test` suite and a common
source of "passes alone, fails in the full suite" flakiness. Thread-locals fix the
cross-test-interference problem for *single-threaded* per-test state (this is exactly how
`mock_instant`'s `thread_local` clock module works — see §10) but still require every piece of
code under test to *read* through the thread-local rather than close over a captured value, which
reintroduces a hidden dependency the type signature doesn't show.

### 10. The clock as a seam

Direct calls to `Instant::now()`/`SystemTime::now()` inside business logic have the same
testability cost as direct filesystem calls: any test of time-dependent logic (cache expiry,
retry backoff, rate limiting) either has to use real `sleep`/wall-clock time (slow, flaky) or
can't be written at all. The idiomatic fix is a `Clock` trait:

```rust
trait Clock { fn now(&self) -> Instant; }
struct SystemClock;
impl Clock for SystemClock { fn now(&self) -> Instant { Instant::now() } }
```
used generically, exactly as in §1
[cyplo/rust-dependency-injection example](https://github.com/cyplo/rust-dependency-injection).
For code that's harder to retrofit, the `mock_instant` crate offers a drop-in
`#[cfg(test)] use mock_instant::thread_local::Instant;` swap that freezes/advances time per-test
via `MockClock::advance(...)` without threading a `Clock` parameter through every call —
recommended by its own docs specifically for single-threaded test scenarios "to create the least
surprise" [docs.rs/mock_instant](https://docs.rs/mock_instant). This is the sans-IO idea (§3) at
its smallest scale: "take `now: Instant` as a parameter" is a lighter-weight version of the same
Clock trait when only one function needs it.

### 11. The environment as a seam — and a 2024-edition landmine

`std::env::var` reads and `std::env::set_var`/`remove_var` writes are process-global state, with
the same globals-hurt-parallel-tests problem as §9. As of the **2024 edition**,
`env::set_var`/`env::remove_var` are `unsafe fn` — the underlying C library `setenv`/`unsetenv`
calls are not thread-safe on most platforms, and Rust's own test harness runs tests on multiple
threads by default, so mutating real process env from a test is a genuine data race, not just
bad practice
[rust-lang/rust#124636](https://github.com/rust-lang/rust/pull/124636),
[Edition Guide, "Newly unsafe functions"](https://doc.rust-lang.org/edition-guide/rust-2024/newly-unsafe-functions.html).
The `deprecated_safe_2024` lint (part of the `rust-2024-compatibility` group) auto-wraps existing
calls in `unsafe {}` on `cargo fix --edition`, but that only silences the compiler — it does not
make the race go away. The correct testability fix is the same as everywhere else in this
document: don't read `std::env::var` inside business logic; read it once in `main`, put the
result in your `Context` struct (§9), and pass that down.

## Normative guidance candidates

1. **Every direct call to `std::fs::*`, `std::process::Command::new`, `reqwest`/HTTP client
   methods, `Instant::now()`/`SystemTime::now()`, or `std::env::var` inside a function that also
   contains business logic must go through a trait parameter, not be called inline.**
   Rationale: inline global I/O calls make the function untestable without real I/O.
   Verify: `grep -rn 'std::fs::\|Command::new\|Instant::now()\|SystemTime::now()\|env::var' src/ --include=*.rs`
   and manually check each hit is either (a) inside a thin adapter `impl` of a seam trait, or
   (b) in `main.rs`/composition code.

2. **A trait exists only where a test or a second real implementation needs it — never "for
   consistency" or "in case we need it later."**
   Rationale: a one-impl trait with no test double is an unrequested abstraction (YAGNI); it adds
   a layer of indirection an agent (or reviewer) has to read through for no testability gain.
   Verify: for each `trait T`, `grep -rn 'impl T for\|MockT\|FakeT\|StubT'` — if there's exactly
   one `impl` and zero test doubles, question whether the trait should exist (consider `faux`
   instead of extracting a trait).

3. **Default to a generic type parameter (`fn f<C: Clock>(clock: &C)`) at I/O seams; reach for
   `&dyn Trait`/`Arc<dyn Trait>` only when heterogeneity or field-storage-without-a-type-param is
   actually needed; reach for an enum only when the implementation set is closed and owned by
   the crate.**
   Rationale: generics are zero-cost and catch wiring mistakes at compile time; `dyn` costs a
   vtable indirection and forces every referenced type in the trait's signature to be public if
   the trait is public.
   Verify: code-reading — for each `Box<dyn T>`/`Arc<dyn T>` field, confirm either (a) more than
   one concrete type is actually constructed against it somewhere in the codebase, or (b) it's
   stored in a struct that would otherwise need a type parameter threaded through many other
   structs.

4. **Never write `async fn` in a trait that is also stored as `dyn Trait`.**
   Rationale: RPITIT (the desugaring of `async fn` in traits) is not dyn-compatible; the compiler
   will reject `dyn TraitWithAsyncFn` outright, or an agent may "fix" it by adding
   `Box::pin(async move {...})` ad hoc at every call site instead of using `async-trait` once.
   Verify: `grep -rn 'async fn' src/ --include=*.rs` inside trait definitions, then confirm no
   `dyn <thattrait>` appears anywhere; if it does, confirm `#[async_trait]` is applied.

5. **Read `std::env::var` and parse CLI args exactly once, in `main`/composition code; store the
   result in a `Context`/`Config` struct passed by reference to everything else.**
   Rationale: this is the only way to give each test its own environment without triggering the
   2024-edition `unsafe` env-mutation hazard or relying on `#[serial]` to avoid cross-test
   interference.
   Verify: `grep -rn 'env::var\|env::set_var' src/ --include=*.rs` — every hit should be in
   `main.rs`/a config-loading module, never inside a function also called from library code paths
   under test.

6. **No `OnceLock`/`lazy_static`/thread-local for anything a test needs to vary (registry URL,
   cache dir, credentials, clock).** `OnceLock` is acceptable only for genuinely-constant,
   never-varied-in-tests process state (e.g. a compiled regex).
   Verify: `grep -rn 'OnceLock\|lazy_static\|thread_local!' src/ --include=*.rs`; for each hit,
   confirm the value is never touched by test setup — if it is, it belongs in `Context` instead.

7. **Test the orchestration function against a fake that can be told to fail; reserve real-I/O
   tests for the single adapter `impl` itself.**
   Rationale: this is the only way to deterministically exercise partial-write, rename-failure,
   registry-5xx, and permission-denied paths that are impractical to trigger through real disk/
   network in every caller's test.
   Verify: code-reading — for each error branch in an orchestration function, confirm at least
   one test drives that branch via a fake/mock returning `Err(...)`, not via `#[ignore]` or a
   comment saying it's untested.

8. **Use `assert_cmd` + `assert_fs` + `predicates` for CLI-level black-box tests; use
   `wiremock-rs`/`httpmock` for registry-client tests; use `mockall`/hand-written fakes for
   unit-level trait seams. Don't reach for a full virtual filesystem (`vfs`) unless the code
   under test is pure path/tree logic with no atomic-write/permission concerns.**
   Rationale: matches each layer's real strength — `vfs`'s `MemoryFS` cannot reproduce
   filesystem-specific bugs (rename-across-devices, permission bits) that are exactly the bugs
   this project's "filesystem-heavy, atomic writes" profile needs covered.
   Verify: `cargo tree | grep -E 'assert_cmd|assert_fs|wiremock|httpmock|mockall|^vfs '` — confirm
   the dev-dependency set matches the layer being tested; a heavy `vfs` presence alongside heavy
   atomic-write code in `src/` is a mismatch worth a review comment.

9. **A sans-IO state machine is justified only when the same logic is genuinely driven from more
   than one I/O context (sync + async, or multiple async runtimes, or a test harness that
   fast-forwards time) — not for one-shot orchestration.**
   Rationale: the pattern's cost (explicit state machine, separate event loop, `Instant` threaded
   as a parameter everywhere) is real; paying it for straight-line "download, verify, extract"
   code is over-engineering relative to a plain I/O-seam trait.
   Verify: code-reading — does the type in question have more than one production driver
   (an async caller and a sync caller, or two different runtimes)? If not, a sans-IO refactor is
   a candidate for `ponytail-review`-style pushback.

10. **Wire concrete adapters only in `main`/composition code; domain and application code never
    names a concrete adapter type (`PhysicalFs`, `OciHttpClient`, `SystemClock`) — only the port
    trait.**
    Rationale: this is what makes the generic-parameter wiring actually enforce the hexagonal
    boundary — a stray concrete-type reference in domain code is a port violation the compiler
    won't catch on its own.
    Verify: `grep -rln 'PhysicalFs\|OciHttpClient\|SystemClock' src/` (adjust names to the
    project's actual adapter types) outside of `main.rs`/a `bin/`/composition module.

## AI-agent angle

- **Mixing `async fn` in a trait with `dyn Trait` storage.** An agent trained on pre-2023 Rust
  (or that pattern-matches "trait + dyn" without checking) will happily write
  `trait Repo { async fn get(&self) -> ...; }` and then `Box<dyn Repo>`, which does not compile
  — the fix an agent reaches for is often `Box::pin(async move { ... })` scattered ad hoc at call
  sites rather than reaching for `async-trait` once at the trait definition. Check: does `cargo
  build` succeed, and if `dyn` is used with an async trait, is `#[async_trait]` present on the
  trait?

- **Calling `std::env::set_var` in test code without `unsafe`, or without realizing edition-2024
  requires it.** An agent generating tests that stub an env var will often write pre-2024-edition
  code (`env::set_var("X", "1")`), which fails to compile under edition 2024, or "fixes" it by
  wrapping in `unsafe` without addressing the actual thread-safety hazard the lint is warning
  about (parallel `cargo test` threads). Check: `grep -n 'env::set_var\|env::remove_var'
  tests/ src/` — flag any occurrence outside a `Context`-injection pattern; if present, confirm
  it's wrapped in `unsafe` (compiles under edition 2024) *and* the test is `#[serial]` or single-
  threaded, since wrapping in `unsafe` silences the compiler but not the actual race.

- **Adding a trait + mock for a struct that has, and will only ever have, one implementation** —
  agents over-apply "DI means trait" reflexively, producing `trait FooRepository` with one
  `impl` and a `MockFooRepository` nobody meaningfully varies. Check: for each new trait in a
  diff, does the diff also add a second `impl` or a test that exercises a *different* return
  value than the real implementation would give? If not, it's likely unrequested abstraction —
  consider `faux` on the concrete struct instead, or no abstraction at all.

- **Hallucinating a `mockall` feature that doesn't exist for the trait shape at hand** — e.g.
  expecting `#[automock]` to work transparently on a trait with a generic associated type, or
  assuming `mock!` supports mocking a free function (it doesn't; `mockall` mocks traits/structs,
  not bare functions — that's `mocktopus`'s niche, a different, narrower crate). Check: does
  `cargo test` actually compile the generated `MockX`? A hallucinated capability fails loudly at
  compile time here, which is the cheap catch — don't let an agent "fix" a `mockall` compile
  error by adding `unsafe` or disabling the test.

- **Reaching for `vfs`'s `MemoryFS` to test atomic-write/rename logic** — this compiles and
  "passes" but proves nothing about the real bug class (rename-across-filesystems, permission
  bits, partial writes on crash) that matters for a package manager's lockfile/cache writes.
  Check: does the test in question assert on a behavior that is filesystem-implementation-
  specific (permissions, atomic rename, symlinks)? If so, it must run against `assert_fs`'s real
  `TempDir`, not `vfs::MemoryFS`.

- **Treating `OnceLock`-based "just make it global for now" as equivalent to proper DI** — an
  agent asked to "make X configurable/testable" may reach for `static X: OnceLock<Config> =
  OnceLock::new()` because it compiles and superficially "removes a hardcoded value," without
  noticing this still prevents two tests in the same process from using different values. Check:
  does any test set the `OnceLock` more than once, or does `cargo test` fail intermittently under
  `--test-threads` > 1 touching that global? Either symptom means it should have been a
  `Context` parameter.

## Contested / evolving

- **Generic-heavy vs `dyn`-heavy hexagonal Rust** is a live style disagreement, not a settled
  question: the `howtocodeit.com` 2026 guide argues explicitly for generics everywhere
  (`Service<R: AuthorRepository>`) to keep static dispatch and avoid `Arc<dyn _>` boilerplate;
  other practitioners (see the `jmmv.dev` newtype-wrapped-`dyn` pattern) prefer `dyn` at
  application-composition boundaries specifically to avoid generic parameters propagating through
  every layer of a large app. Current trend as of 2026: generics for library/domain crates that
  need to stay dependency-light and fast; `dyn` (often behind a newtype) at the outermost
  application-wiring layer where the extra vtable indirection is negligible relative to I/O cost
  anyway.

- **`async fn` in traits + `dyn` dispatch** is explicitly unresolved upstream — the
  `smallcultfollowing.com` "Dyn async traits" series (ongoing as of March 2025) tracks active
  language-team exploration (`dyn*`, boxing strategies) with no shipped solution as of this
  writing; `async-trait`'s boxing workaround remains the practical answer and should be treated
  as the current recommendation, not a historical crutch.

- **Sans-IO adoption remains niche outside networking/protocol crates.** Firezone's own post
  (2024) calls it "not particularly wide-spread (yet)" — it's well-established for QUIC/TLS/
  protocol-state-machine code (`quinn-proto`, `rustls`) but there is no consensus on applying it
  to ordinary application orchestration code; treat sans-IO as a networking-protocol-specific
  pattern, not a general DI technique, unless a concrete case for it emerges (§3, rule 9).

- **`vfs` vs `assert_fs`/real temp dirs** is not really contested so much as under-discussed —
  most current Rust CLI testing writeups (rust-cli book, assert-rs ecosystem docs) default to
  real temp dirs and don't mention `vfs` at all, suggesting the ecosystem's center of gravity has
  settled on "test against a real filesystem in a temp dir" over "build a virtual filesystem
  layer," contrary to what a Java/Go background might expect.

## Sources

| URL | What it is | Date/era | Why it was worth reading |
|---|---|---|---|
| [Rust Reference — dyn-compatibility](https://doc.rust-lang.org/reference/items/traits.html#dyn-compatibility) | Official language reference | current (2026) | Authoritative, current rules for what can be `dyn`-dispatched; confirms "object safety" is the old name. |
| [Rust Blog — Announcing async fn and RPIT in traits](https://blog.rust-lang.org/2023/12/21/async-fn-rpit-in-traits/) | Official Rust blog | Dec 2023 | Primary source for when `async fn` in traits stabilized and why it isn't dyn-compatible. |
| [Rust Edition Guide — Newly unsafe functions](https://doc.rust-lang.org/edition-guide/rust-2024/newly-unsafe-functions.html) | Official edition guide | 2024 edition | Authoritative on `env::set_var`/`remove_var` becoming `unsafe fn`, directly relevant to env-as-seam guidance. |
| [rust-lang/rust#124636](https://github.com/rust-lang/rust/pull/124636) | Merged PR implementing the above | 2024 | Primary source for the exact rationale (thread-safety of `setenv`). |
| [Rust API Guidelines — Flexibility (C-OBJECT)](https://rust-lang.github.io/api-guidelines/flexibility.html) | Official Rust API guidelines | living doc, current | Canonical guidance on trait-as-bound vs trait-as-object design decisions. |
| [Firezone Blog — sans-IO Pattern in Rust Networking Code](https://www.firezone.dev/blog/sans-io) | Engineering blog, primary practitioner account | 2024 | Best concrete Rust-specific writeup of sans-IO API shape, costs, and production motivation. |
| [quinn-rs/quinn README](https://github.com/quinn-rs/quinn/blob/main/README.md) | Real source of a production sans-IO crate (`quinn-proto`) | current (2026) | Confirms sans-IO adoption at production scale and the simulated-I/O test strategy. |
| [jmmv.dev — Rust traits and dependency injection](https://jmmv.dev/2022/04/rust-traits-and-dependency-injection.html) | Practitioner blog, primary | 2022 (still cited/current pattern) | Concrete newtype-wrapped-`dyn` pattern and the public-API-leakage cost of public `dyn` traits. |
| [howtocodeit.com — Master Hexagonal Architecture in Rust](https://www.howtocodeit.com/guides/master-hexagonal-architecture-in-rust) | In-depth practitioner guide | 2026 | Most complete current worked example of ports/adapters with generics, `impl Future + Send` async traits, and crate layout. |
| [GitHub — asomers/mockall](https://github.com/asomers/mockall) | Official crate repo/docs | current (v0.15.x, MSRV 1.77) | Primary source for current mockall API and version/MSRV. |
| [GitHub — nrxus/faux](https://github.com/nrxus/faux) | Official crate repo/docs | current (v0.1.x, MSRV 1.65) | Primary source for faux's struct-mocking design rationale vs trait-based mocking. |
| [Rust Mock Shootout](https://asomers.github.io/mock_shootout/) | Comparative survey by mockall's author | 2018–2019 (historical) | Landscape context; explicitly flagged as dated — most compared libraries are now dead. |
| [docs.rs/vfs](https://docs.rs/vfs/latest/vfs/) | Official crate docs | current (v0.13.x) | Primary source for `FileSystem` trait shape and `MemoryFS`/`PhysicalFS`/`OverlayFS` implementations. |
| [docs.rs/assert_fs](https://docs.rs/assert_fs/latest/assert_fs/) | Official crate docs | current (v1.1.x) | Primary source for real-temp-dir CLI testing pattern paired with `predicates`. |
| [docs.rs/assert_cmd](https://docs.rs/assert_cmd/latest/assert_cmd/) & [assert-rs/assert_cmd README](https://github.com/assert-rs/assert_cmd) | Official crate docs/repo | current | Primary source for black-box CLI binary testing pattern (`Command::cargo_bin`). |
| [LukeMathWalker/wiremock-rs README](https://github.com/LukeMathWalker/wiremock-rs/blob/main/README.md) | Official crate repo/README | current (v0.6.x) | Primary source for async HTTP-mock server API and per-test isolation design. |
| [docs.rs/mock_instant](https://docs.rs/mock_instant) | Official crate docs | current | Primary source for thread-local clock-freezing pattern as a lighter alternative to a full `Clock` trait. |
| [Possible Rust — Enum or Trait Object](https://www.possiblerust.com/guide/enum-or-trait-object) | Practitioner guide | current | Clear decision criteria for enum-dispatch vs `dyn Trait`, cited for the closed-vs-open-set distinction. |
