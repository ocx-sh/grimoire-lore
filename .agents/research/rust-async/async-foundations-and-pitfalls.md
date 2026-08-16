---
title: Async Runtime Discipline and the Classic Pitfalls
topic: async-rust
agent: inv-runtime (async foundations)
model: sonnet
date_researched: 2026-08
sources_count: 20
scope: |
  Covers tokio runtime configuration and startup cost, the blocking-in-async rules
  (spawn_blocking/block_in_place/Handle::block_on deadlocks), cancellation safety and
  select!/timeout/CancellationToken/JoinSet/TaskTracker, async-fn-in-traits as of the
  2024/2025 stabilization plus trait_variant and async-trait's remaining niche, common
  futures/Pin/MutexGuard pitfalls, and bounded-concurrency/backoff patterns for HTTP
  clients. Does NOT cover: non-tokio runtimes (async-std, smol, embassy) in depth, WASM
  async, or io_uring/glommio-style thread-per-core designs — mentioned only where they
  bear on the tokio-centric CLI use case this feeds into.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Runtime configuration: multi_thread vs current_thread vs no runtime at all](#1-runtime-configuration-multi_thread-vs-current_thread-vs-no-runtime-at-all)
   2. [Blocking in async: the rules and the escape hatches](#2-blocking-in-async-the-rules-and-the-escape-hatches)
   3. [Handle::block_on deadlocks](#3-handleblock_on-deadlocks)
   4. [Cancellation safety](#4-cancellation-safety)
   5. [Structured concurrency: JoinSet, TaskTracker, CancellationToken](#5-structured-concurrency-joinset-tasktracker-cancellationtoken)
   6. [Async traits in 2026](#6-async-traits-in-2026)
   7. [Futures fundamentals agents get wrong](#7-futures-fundamentals-agents-get-wrong)
   8. [Bounded concurrency and backpressure](#8-bounded-concurrency-and-backpressure)
   9. [Retry with jittered exponential backoff](#9-retry-with-jittered-exponential-backoff)
   10. [Debugging: tokio-console and tracing](#10-debugging-tokio-console-and-tracing)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- Default to `multi_thread` (the `#[tokio::main]` default); it spawns one worker thread per CPU core and work-steals, and is the documented recommendation for "most applications" ([docs.rs/tokio runtime](https://docs.rs/tokio/latest/tokio/runtime/index.html)).
- `current_thread` is correct when the whole program can run on one thread (a CLI that does sequential HTTP calls, no fan-out) — it has no worker pool to spin up and is the documented choice when bridging a mostly-sync app into a small async island ([tokio.rs bridging](https://tokio.rs/tokio/topics/bridging)).
- `spawn_blocking` is for short-lived, bounded blocking work; long-running blocking work should get a dedicated OS thread instead, because it permanently eats one slot of the (large but finite) blocking pool ([docs.rs spawn_blocking](https://docs.rs/tokio/latest/tokio/task/fn.spawn_blocking.html)).
- `block_in_place` panics on a `current_thread` runtime, requires `rt-multi-thread`, and suspends *all* other work on the same task (e.g. sibling branches of a `join!`) for its duration — prefer `spawn_blocking` unless you specifically need to stay on the current task ([docs.rs block_in_place](https://docs.rs/tokio/latest/tokio/task/fn.block_in_place.html)).
- The tokio rule of thumb for CPU-bound work: no more than roughly 10–100 microseconds between `.await` points before you should hand it to `spawn_blocking` or a rayon/dedicated thread ([Alice Ryhl, "Async: What is blocking?"](https://ryhl.io/blog/async-what-is-blocking/)).
- Calling `Handle::block_on` (or `Runtime::block_on`) from inside an already-running async context panics — it is not merely discouraged, it is a hard runtime panic ([docs.rs Handle::block_on](https://docs.rs/tokio/latest/tokio/runtime/struct.Handle.html#method.block_on)).
- Cancellation safety is precisely defined: a future is cancel-safe if dropping it and recreating it is a no-op. `tokio::select!` drops every losing branch, so only cancel-safe futures belong in a loop-and-select pattern ([tokio select! docs](https://docs.rs/tokio/latest/tokio/macro.select.html)).
- `AsyncReadExt::read`, `mpsc::Receiver::recv`, `TcpListener::accept` are cancel-safe; `AsyncReadExt::read_exact`/`read_to_end`, `AsyncWriteExt::write_all`, `Mutex::lock`, and `Semaphore::acquire` are **not** — dropping them mid-flight loses data or queue position ([tokio select! docs](https://docs.rs/tokio/latest/tokio/macro.select.html)).
- `tokio::time::timeout` cancels the wrapped future cleanly on expiry by dropping it — no extra cleanup is required, but the future is polled once before the deadline is even checked, so a non-yielding future can still overrun the timeout ([docs.rs timeout](https://docs.rs/tokio/latest/tokio/time/fn.timeout.html)).
- Holding a `std::sync::MutexGuard` (or `parking_lot::MutexGuard`) across an `.await` is a real bug, not just a style nit: clippy's `await_holding_lock` (warn-by-default) exists precisely because std mutexes are not async-aware and the guard can be held across a suspension that never resumes on the same thread ([clippy await_holding_lock](https://rust-lang.github.io/rust-clippy/master/#await_holding_lock)).
- `async fn` in traits (AFIT) and return-position-`impl Trait` in traits (RPITIT) have been stable since Rust 1.75 (Dec 2023); as of 2026 they are the default choice, and `async-trait` is needed only for `dyn Trait` objects, since async trait methods are still not dyn-compatible ([Rust blog, Dec 2023](https://blog.rust-lang.org/2023/12/21/async-fn-rpit-in-traits/)).
- Native AFIT does not let you add a `Send` bound to the returned future; use `trait_variant::make` to generate a `Send`-bounded sibling trait when the future must cross a `tokio::spawn` boundary ([docs.rs trait-variant](https://docs.rs/trait-variant/latest/trait_variant/)).
- `JoinSet` is the structured way to spawn a dynamic number of tasks and collect results as they finish (not in spawn order); dropping a `JoinSet` aborts every task still in it ([docs.rs JoinSet](https://docs.rs/tokio/latest/tokio/task/struct.JoinSet.html)).
- `CancellationToken` + `TaskTracker` (both `tokio-util`) is the documented pattern for graceful shutdown: the token tells tasks to stop, the tracker's `.wait()` blocks until every tracked task has actually exited after `.close()` ([docs.rs TaskTracker](https://docs.rs/tokio-util/latest/tokio_util/task/task_tracker/struct.TaskTracker.html)).
- `StreamExt::buffer_unordered(n)` (futures crate) is the standard bounded-concurrency primitive for "run up to N of these futures at once, in whatever order they finish" — the idiomatic replacement for a hand-rolled semaphore + `join_all` in fan-out HTTP work ([docs.rs buffer_unordered](https://docs.rs/futures/latest/futures/stream/trait.StreamExt.html#method.buffer_unordered)).
- `backon` is the current (2025/2026-era) idiomatic retry crate: `.retry(ExponentialBuilder::default())` on any `async fn` via the `Retryable` trait, with built-in jitter support ([docs.rs backon](https://docs.rs/backon/latest/backon/)).
- `tokio-console` requires building with `RUSTFLAGS="--cfg tokio_unstable"` and calling `console_subscriber::init()`; it surfaces self-waking tasks, lost wakers, and tasks that never yield — exactly the symptoms of accidental blocking ([tokio-rs/console](https://github.com/tokio-rs/console)).
- Runtime shutdown cannot forcibly cancel a task that is inside `spawn_blocking` or `block_in_place` — it waits indefinitely unless you set a `shutdown_timeout`, which then abandons (not cancels) the thread ([docs.rs spawn_blocking](https://docs.rs/tokio/latest/tokio/task/fn.spawn_blocking.html)).

## Findings

### 1. Runtime configuration: multi_thread vs current_thread vs no runtime at all

`#[tokio::main]` desugars, with no arguments, to:

```rust
fn main() {
    tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(async { /* your body */ })
}
```

— a fresh multi-thread `Runtime` is built and torn down around your `main` body every process run ([docs.rs `attr.main`](https://docs.rs/tokio/latest/tokio/attr.main.html)). The multi-thread flavor spawns one worker thread per CPU core by default (override with `worker_threads = N` on the attribute or `Builder::worker_threads`), plus a separate blocking-thread pool for `spawn_blocking` ([docs.rs runtime](https://docs.rs/tokio/latest/tokio/runtime/index.html)).

Three flavors are documented on the `#[tokio::main]` attribute: `multi_thread` (default, needs `rt-multi-thread`), `current_thread`, and `local` (current-thread plus `task::spawn_local` support) ([docs.rs `attr.main`](https://docs.rs/tokio/latest/tokio/attr.main.html)).

Decision rule from the runtime docs' own framing: pick multi-thread if you want work-stealing across cores; pick current-thread if you don't need to spawn `!Send` futures and don't need multiple OS threads driving the executor ([docs.rs runtime](https://docs.rs/tokio/latest/tokio/runtime/index.html)). For a CLI that does mostly sequential or moderately fanned-out HTTP I/O with no CPU-bound parallelism need, `current_thread` avoids spinning up N worker threads that will mostly sit idle waiting on the network — lower startup cost, lower baseline memory, and no cross-thread synchronization overhead for the common single-registry-call, single-tarball-extract, run-and-exit shape.

The bridging guide is explicit that when you only need "islands" of async inside an otherwise synchronous CLI, `current_thread` is preferred over `multi_thread` specifically because a `current_thread` runtime "only operates when `block_on` is called," so it does not spawn background OS threads for a program that is not doing concurrent background work ([tokio.rs bridging](https://tokio.rs/tokio/topics/bridging)). The same page warns that any task you `spawn` onto a `current_thread` runtime "freezes" the moment `block_on` returns and only resumes on the next `block_on` call — a footgun if you spawn a task and then do sync work before awaiting anything again.

**"Should this CLI be async at all?"** — the honest cost/benefit for an OCI-registry CLI: async buys you concurrent HTTP requests (parallel layer downloads, parallel manifest fetches) and is what `reqwest`/`hyper` expect on the call side; the cost is the `async fn` "colour" propagating through the whole call graph, `Send`-bound friction in trait objects, and a nonzero (if small, sub-millisecond) runtime startup cost paid on every invocation of a program that may run for tens of milliseconds total. For a genuinely single-request, sequential-only operation, a blocking HTTP client (e.g. `ureq`) with zero runtime is a legitimate "does this need to exist at all" answer — but a package manager doing N-way layer/blob downloads and wanting bounded concurrency (`buffer_unordered`) gets real wall-clock wins from async, which is the actual shape of grim/ocx's registry-fetch fan-out.

### 2. Blocking in async: the rules and the escape hatches

Tokio's own definition of "blocking" for scheduling purposes: **preventing the runtime from swapping the current task out**, i.e. running for a stretch without hitting an `.await` that actually yields ([Alice Ryhl, "Async: What is blocking?"](https://ryhl.io/blog/async-what-is-blocking/), Ryhl is a tokio core maintainer and this post is treated as de-facto tokio guidance). The rule of thumb stated there: **no more than ~10 to 100 microseconds between `.await` points**. Below that, run inline; above it, get off the worker thread.

Two escape hatches, not interchangeable:

```rust
// Correct: bounded blocking I/O or CPU work, dedicated blocking-pool thread.
let digest = tokio::task::spawn_blocking(move || {
    // std::fs, sha256 hashing of a downloaded tarball, tar/zip extraction, etc.
    compute_sha256(&path)
}).await?;
```

```rust
// Correct, but narrower: stay on the CURRENT task/thread, hand OTHER tasks
// on this worker to other threads for the duration. Cannot be used on a
// current_thread runtime — panics. Suspends any concurrently-joined work
// in the SAME task (e.g. sibling branches of join!/select!) until it returns.
tokio::task::block_in_place(move || {
    compute_sha256(&path)
});
```

```rust
// WRONG: synchronous std::fs / std::process / blocking DNS resolution
// called directly inside an async fn body with no spawn_blocking wrapper.
// This blocks the worker thread that may be driving dozens of other tasks
// (e.g. every other in-flight HTTP request in the same runtime).
async fn extract_bad(path: &Path) -> Result<()> {
    let bytes = std::fs::read(path)?;      // blocks the worker thread
    let out = std::process::Command::new("tar")
        .arg("-xf").arg(path).output()?;   // blocks the worker thread
    Ok(())
}
```

Guidance on which to reach for: "use `spawn_blocking` for short-lived blocking operations; use a dedicated thread for long-lived or persistent blocking workloads" — because `spawn_blocking` tasks that never finish permanently consume one slot of the blocking pool, which is large by default but not unbounded ([docs.rs spawn_blocking](https://docs.rs/tokio/latest/tokio/task/fn.spawn_blocking.html)). `block_in_place` additionally: requires the `rt-multi-thread` feature and panics on a `current_thread` runtime; suspends other concurrently-running work in the *same* task for its duration; and its work, like `spawn_blocking`'s, cannot be cancelled — runtime shutdown waits indefinitely for it unless `shutdown_timeout` is set ([docs.rs block_in_place](https://docs.rs/tokio/latest/tokio/task/fn.block_in_place.html)).

For an OCI CLI specifically: tarball/layer extraction, sha256 digest verification, and any synchronous subprocess execution of a downloaded tool binary belong in `spawn_blocking`, never inline in an `async fn`.

### 3. Handle::block_on deadlocks

`Handle::block_on` (and `Runtime::block_on`) **panics** — not deadlocks silently, panics — when called from inside code that is already running on a tokio worker thread inside an async context, including from within another `block_on` call or from a `#[tokio::main]`-annotated function body ([docs.rs Handle::block_on](https://docs.rs/tokio/latest/tokio/runtime/struct.Handle.html#method.block_on)). The correct pattern for calling async code from a genuinely synchronous callback that itself runs inside async code is `block_in_place` + `Handle::current().block_on(...)`, not a bare nested `block_on` ([docs.rs block_in_place](https://docs.rs/tokio/latest/tokio/task/fn.block_in_place.html)).

### 4. Cancellation safety

Definition, verbatim from the tokio docs: "If you have a future that has not yet completed, then it must be a no-op to drop that future and recreate it" ([docs.rs select! macro](https://docs.rs/tokio/latest/tokio/macro.select.html)). `select!` races its branches and, the instant one resolves, **drops every other branch outright** — cancellation in async Rust is implemented by dropping the future, full stop ([tokio.rs select tutorial](https://tokio.rs/tokio/tutorial/select)).

Documented cancel-safe: `mpsc::Receiver::recv`/`UnboundedReceiver::recv`, `broadcast::Receiver::recv`, `watch::Receiver::changed`, `TcpListener::accept`/`UnixListener::accept`, `signal::unix::Signal::recv`, `AsyncReadExt::read`/`read_buf`, `AsyncWriteExt::write`/`write_buf`.

Documented **not** cancel-safe: `AsyncReadExt::read_exact`, `read_to_end`, `read_to_string`, `AsyncWriteExt::write_all` (data loss on partial completion), and `Mutex::lock`, `RwLock::read`/`write`, `Semaphore::acquire`, `Notify::notified` (loses queue position — a dropped waiter may be skipped when re-created, breaking fairness) ([docs.rs select! macro](https://docs.rs/tokio/latest/tokio/macro.select.html)).

```rust
// WRONG: read_to_end is not cancel-safe. If the timeout branch wins,
// partially-read bytes are silently dropped and the stream position is lost.
tokio::select! {
    _ = tokio::time::sleep(Duration::from_secs(5)) => { /* timeout */ }
    result = stream.read_to_end(&mut buf) => { /* buf may be partial garbage on retry */ }
}
```

```rust
// CORRECT: read() in a loop is cancel-safe — each call either completes
// wholly or is dropped with nothing lost, so re-entering the select! loop
// is sound.
loop {
    tokio::select! {
        _ = token.cancelled() => break,
        n = stream.read(&mut buf) => {
            let n = n?;
            if n == 0 { break; }
            out.extend_from_slice(&buf[..n]);
        }
    }
}
```

`tokio::time::timeout(dur, fut)` cancels `fut` on expiry purely by dropping it — "no additional cleanup or other work is required" — but note it polls the wrapped future once *before* checking the deadline, so a future that never yields can still overrun the requested timeout ([docs.rs timeout](https://docs.rs/tokio/latest/tokio/time/fn.timeout.html)).

### 5. Structured concurrency: JoinSet, TaskTracker, CancellationToken

`JoinSet<T>` is the structured alternative to `Vec<JoinHandle<T>>` for a dynamic fan-out of tasks: `.spawn()` adds a task, `.join_next().await` yields results in completion order (not spawn order), and — critically — **dropping the `JoinSet` aborts every task still inside it** ([docs.rs JoinSet](https://docs.rs/tokio/latest/tokio/task/struct.JoinSet.html)). This is the right primitive for "download these N layers concurrently, stop everything if the caller drops the future."

`CancellationToken` (tokio-util) is a cooperative shutdown signal: `.cancelled()` returns a future that resolves once `.cancel()` is called anywhere on the token or a parent; `.child_token()` builds a token that cancels when its parent does but not vice versa, giving hierarchical shutdown scopes ([docs.rs CancellationToken](https://docs.rs/tokio-util/latest/tokio_util/sync/struct.CancellationToken.html)).

`TaskTracker` pairs with it: the token tells tasks to *stop*, the tracker's `.wait()` future resolves only once `.close()` has been called *and* every task spawned through the tracker has actually exited — the two are deliberately separate concerns (signal vs confirm) ([docs.rs TaskTracker](https://docs.rs/tokio-util/latest/tokio_util/task/task_tracker/struct.TaskTracker.html)):

```rust
let tracker = TaskTracker::new();
let token = CancellationToken::new();

for job in jobs {
    let token = token.clone();
    tracker.spawn(async move {
        tokio::select! {
            _ = token.cancelled() => { /* clean up, return early */ }
            res = do_job(job) => { /* handle res */ }
        }
    });
}

tracker.close();          // no more tasks will be spawned
token.cancel();           // tell all in-flight tasks to stop
tracker.wait().await;     // block until every one has actually exited
```

### 6. Async traits in 2026

`async fn` in traits (AFIT) and return-position `impl Trait` in traits (RPITIT) stabilized in **Rust 1.75, December 2023** ([Rust blog announcement](https://blog.rust-lang.org/2023/12/21/async-fn-rpit-in-traits/)). As of 2026, native syntax is the default:

```rust
trait RegistryClient {
    async fn fetch_manifest(&self, digest: &str) -> Result<Manifest, Error>;
}
```

Two limitations survive stabilization and still require workarounds:

1. **`dyn` incompatibility.** A trait with an `async fn` method cannot be turned into a `dyn RegistryClient` trait object on stable — async trait methods are not (yet) dyn-compatible. `#[async_trait]` remains the correct tool **only** for this case, because it desugars to `Pin<Box<dyn Future>>`, which is dyn-safe at the cost of one heap allocation per call ([async-book](https://rust-lang.github.io/async-book/07_workarounds/05_async_in_traits.html) — note this specific page is stale, written pre-stabilization in 2022, but the dyn-compatibility limitation it describes is still current in 2026).
2. **No `Send` bound on the returned future.** Native AFIT gives you an anonymous, unnameable future type with no way to add a `where` bound requiring it be `Send` — a real problem the moment an implementation of the trait needs to be used inside `tokio::spawn`, which requires `Send + 'static`. `trait_variant::make` solves this by generating a second, `Send`-bounded version of the trait from the same source:

```rust
#[trait_variant::make(RegistryClient: Send)]
trait LocalRegistryClient {
    async fn fetch_manifest(&self, digest: &str) -> Result<Manifest, Error>;
}
// generates:
// trait RegistryClient: Send {
//     fn fetch_manifest(&self, digest: &str) -> impl Future<Output = Result<Manifest, Error>> + Send;
// }
```

([docs.rs trait-variant](https://docs.rs/trait-variant/latest/trait_variant/)) — use the `Send`-bounded generated trait as the bound in any function signature that spawns the future onto the runtime.

Both limitations remain: async trait methods are not dyn-compatible on stable Rust as of 1.75+ into 2026, and auto-trait (`Send`/`Sync`) propagation through async trait methods is still conservative and needs `trait_variant` or manual `+ Send` future wrapping to fix ([Rust blog, June 2024 types-team update](https://blog.rust-lang.org/2024/06/26/types-team-update/)). Return Type Notation (RTN, `T: Trait<method(..): Send>`), which would subsume much of `trait_variant`'s job, was in call-for-testing on nightly as of September 2024 and was still not stabilized as of the mid-2025 project-goals update, blocked on the next-generation trait solver work ([RTN call for testing](https://blog.rust-lang.org/inside-rust/2024/09/26/rtn-call-for-testing/)).

**Practical rule for this codebase's traits/structs refactor:** default every trait to plain `async fn` (no macro). Reach for `#[async_trait]` only where a `Box<dyn Trait>` / `Arc<dyn Trait>` object is genuinely needed (e.g. a pluggable registry backend selected at runtime). Reach for `trait_variant::make` only where an implementation must cross a `tokio::spawn` boundary and the compiler complains about a missing `Send` bound.

### 7. Futures fundamentals agents get wrong

**Futures are lazy.** Constructing a future does nothing; only polling it (via `.await`, an executor, or a combinator) runs any of its body. Forgetting `.await` on an async call is a classic silent bug — the code compiles (the un-awaited future is simply dropped, often with an `unused_must_use` warning since futures are `#[must_use]`), but the operation never happens:

```rust
// WRONG: compiles, warns "unused implementer of `Future` that must be used",
// but download_layer never actually runs.
download_layer(&client, &digest);

// CORRECT
download_layer(&client, &digest).await?;
```

**Holding a `std::sync::MutexGuard` across an `.await`.** The guard is not `Send`-safe to hold across a suspension point in general, and even where it compiles, it blocks every other task waiting on that mutex for the entire duration of the awaited operation — a synchronous lock has no concept of yielding. Clippy's `await_holding_lock` lint (warn-by-default) exists specifically to catch this ([clippy await_holding_lock](https://rust-lang.github.io/rust-clippy/master/#await_holding_lock)):

```rust
// WRONG: std Mutex guard held across .await
let guard = state.lock().unwrap();
some_async_call().await;   // clippy: await_holding_lock
drop(guard);
```

```rust
// CORRECT: drop the guard, or scope it, before awaiting
{
    let guard = state.lock().unwrap();
    do_sync_work(&guard);
} // guard dropped here
some_async_call().await;

// Or, if the value genuinely needs to be held across awaits: use tokio::sync::Mutex,
// whose .lock().await itself yields instead of blocking a worker thread.
```

**`Rc<T>` across an await point in a task that must be `Send`.** `Rc` is not `Send`, so a future holding an `Rc` across `.await` cannot be spawned with `tokio::spawn` (which requires `Send + 'static`). Use `Arc` for any state shared across an await boundary in spawned work.

**`join!` vs sequential `.await`.** Two independent async calls awaited one after another run strictly sequentially — no concurrency happens just because both are `async fn`s:

```rust
// SEQUENTIAL — total latency ~= sum of both calls
let a = fetch_manifest(&client, "img-a").await?;
let b = fetch_manifest(&client, "img-b").await?;

// CONCURRENT — total latency ~= the slower of the two
let (a, b) = tokio::join!(fetch_manifest(&client, "img-a"), fetch_manifest(&client, "img-b"));
let (a, b) = (a?, b?);
```

**`FuturesUnordered` pitfalls.** An empty `FuturesUnordered` polled directly returns `Poll::Ready(None)` immediately, which inside a `select!`/loop pattern with no other exit condition becomes a silent, permanently-completing branch (or a busy-loop if not handled) rather than "pending forever" as intuition might suggest — always check `is_empty()` or gate the branch, and prefer `StreamExt::buffer_unordered` for the common "bounded fan-out over a fixed list" case rather than hand-managing a `FuturesUnordered`.

**Pin/Unpin.** Application-level async code essentially never touches `Pin` directly — `async fn`/`async` blocks handle pinning automatically. An agent should not hand-write `Pin<Box<dyn Future>>` plumbing unless implementing a custom `Future` or `Stream` by hand (rare; almost always the wrong first move — reach for `async fn` / combinators first).

### 8. Backpressure and bounded concurrency

`futures::stream::StreamExt::buffer_unordered(n)` runs up to `n` futures from a stream concurrently and yields outputs as they complete, not in source order ([docs.rs buffer_unordered](https://docs.rs/futures/latest/futures/stream/trait.StreamExt.html#method.buffer_unordered)):

```rust
use futures::stream::{self, StreamExt};

let results: Vec<_> = stream::iter(digests)
    .map(|d| fetch_blob(&client, d))
    .buffer_unordered(8)   // at most 8 concurrent HTTP requests
    .collect()
    .await;
```

This is the idiomatic bounded-concurrency tool for "fan out over a known list, cap in-flight requests" — the shape of pulling N image layers from an OCI registry. It replaces a hand-rolled `tokio::sync::Semaphore` + `join_all` for this specific case; reach for a bare `Semaphore` only when the concurrency limit must be shared across call sites that don't share one stream (e.g. a global cap on concurrent registry connections across multiple independent commands in one process).

`tokio::sync::mpsc::channel(capacity)` (bounded) is the default channel choice for producer/consumer pipelines that need backpressure — an unbounded channel (`unbounded_channel`) removes backpressure entirely and lets a fast producer grow memory without limit; use it only when you have already reasoned about why bounding is unnecessary.

### 9. Retry with jittered exponential backoff

`backon` is the current idiomatic crate: it exposes a `Retryable` extension trait that wraps any `async fn` (or `FnMut() -> impl Future`) with a configurable backoff strategy — `ExponentialBuilder` (with jitter support), `ConstantBuilder`, `FibonacciBuilder` — plumbed through `.retry(builder).sleep(...).when(...).notify(...)` ([docs.rs backon](https://docs.rs/backon/latest/backon/)):

```rust
use backon::{ExponentialBuilder, Retryable};

let manifest = (|| fetch_manifest(&client, digest))
    .retry(ExponentialBuilder::default().with_jitter())
    .when(|e: &FetchError| e.is_transient())
    .notify(|err, dur| tracing::warn!(?err, ?dur, "retrying"))
    .await?;
```

Older alternatives (`tokio-retry`) are still seen in code trained-on-2023-and-earlier corpora; `backon` is the crate to reach for going forward for new async retry code — check `Cargo.toml`/`cargo tree` for which one is already a dependency before adding either.

### 10. Debugging: tokio-console and tracing

`tokio-console` requires opting the whole binary into the unstable tokio instrumentation ABI:

```bash
RUSTFLAGS="--cfg tokio_unstable" cargo build
# or in .cargo/config.toml:
# [build]
# rustflags = ["--cfg", "tokio_unstable"]
```

plus a `console-subscriber` dependency and `console_subscriber::init()` near the top of `main` (which also wires the required `tokio=trace,runtime=trace` tracing targets under the hood), then running the separate `tokio-console` binary (`cargo install --locked tokio-console`) against the default `localhost:6669` gRPC endpoint ([tokio-rs/console](https://github.com/tokio-rs/console)). It surfaces: tasks that wake themselves more than half the time (a self-waking loop, usually a bug), lost wakers (a task dropped without ever being woken — a hang), tasks that never yield (the blocking-in-async smell), and oversized futures the runtime had to auto-box.

`RuntimeMetrics` (stable API, no `tokio_unstable` needed for the basic counters) exposes `worker_steal_count` (always 0 on `current_thread`, meaningful only on `multi_thread` — heavy stealing indicates uneven task distribution) and a budget-exhaustion counter that increments each time a task is forced to yield because it exceeded tokio's cooperative-scheduling poll budget — a direct, queryable signal of a task that is CPU-hogging a worker ([docs.rs RuntimeMetrics](https://docs.rs/tokio/latest/tokio/runtime/struct.RuntimeMetrics.html)).

## Normative guidance candidates

1. **Default the process runtime to `current_thread` unless the tool does genuine concurrent fan-out (parallel downloads, parallel HTTP calls).** Rationale: lower startup cost and no idle worker threads for a short-lived, mostly-sequential CLI invocation. Verify: check `#[tokio::main]` flavor / `Builder::new_current_thread()` vs `new_multi_thread()` against whether the command body actually calls `tokio::spawn`, `join!`, or `buffer_unordered` with n>1 anywhere in its path.
2. **Never call blocking stdlib I/O (`std::fs`, `std::process::Command::output`, synchronous DNS) directly inside an `async fn` body — wrap it in `tokio::task::spawn_blocking`.** Rationale: blocks the worker thread and starves every other in-flight task on that runtime. Verify: `grep -rn 'std::fs::\|std::process::Command' --include='*.rs' src/` inside any file containing `async fn`, confirm each hit is inside a `spawn_blocking` closure.
3. **Never hold a `std::sync::MutexGuard` / `parking_lot::MutexGuard` across an `.await`.** Rationale: blocks a synchronous lock across a suspension point, starving every other holder; clippy has a dedicated warn-by-default lint for exactly this. Verify: `cargo clippy -- -D clippy::await_holding_lock -D clippy::await_holding_refcell_ref` must pass with zero warnings.
4. **Only give `async fn` methods a `Box<dyn Future>`/`#[async_trait]` treatment when the trait is actually used as `dyn Trait`; otherwise use plain native `async fn` in the trait.** Rationale: `#[async_trait]` costs one heap allocation per call and is unneeded since AFIT stabilized in Rust 1.75. Verify: `grep -rn '#\[async_trait\]'` and, for each hit, confirm a `dyn <TraitName>` or `Box<dyn <TraitName>>` usage exists somewhere in the same crate — if not, it's a stale/unnecessary macro.
5. **Any trait whose implementations must be spawned with `tokio::spawn` needs a `Send`-bounded future — add it via `trait_variant::make`, never by hand-writing `Pin<Box<dyn Future + Send>>`.** Rationale: native AFIT cannot express a `Send` bound on the trait itself. Verify: for a trait with `async fn` methods consumed inside `tokio::spawn(...)`, confirm `#[trait_variant::make(... : Send)]` is present, or that the compiler already accepts it without the macro (small/simple cases sometimes infer `Send` naturally — verify by attempting to compile a `tokio::spawn` call site).
6. **`select!` branches must all be built from cancel-safe futures, or the non-winning branch's partial work must be explicitly acceptable to lose.** Rationale: `select!` unconditionally drops every losing branch; `read_to_end`/`write_all`/`Mutex::lock`/`Semaphore::acquire` lose data or fairness when dropped mid-flight. Verify: code-read every `select!`/`tokio::select!` block; flag any branch calling `read_exact`, `read_to_end`, `read_to_string`, `write_all`, `Mutex::lock().await` (tokio) mid-select, or a bare `.lock()` on a std mutex.
7. **`Handle::block_on`/`Runtime::block_on` must never be reachable from code that itself may already be running inside a tokio task or `#[tokio::main]` body.** Rationale: it panics, not deadlocks silently — but the panic can be far from the call site (buried in a callback deep in a sync dependency). Verify: `grep -rn 'block_on(' --include='*.rs' src/` and trace each caller's context; any call reachable from an `async fn` call graph is a bug.
8. **A `tokio::spawn`ed task that is not tracked by a `JoinSet`/`TaskTracker` and not explicitly detached must be joined or aborted somewhere before the enclosing scope's futures are dropped.** Rationale: an untracked `JoinHandle` that is dropped does not cancel the task (it keeps running detached) — silent orphaned work outlives its logical owner. Verify: `grep -rn 'tokio::spawn(' --include='*.rs' src/` and confirm each call site's `JoinHandle` is either `.await`ed, pushed into a `JoinSet`/`TaskTracker`, or intentionally detached with a comment explaining why.
9. **Long-running or unbounded-duration blocking work must go on a dedicated `std::thread`, not repeated/long `spawn_blocking` calls.** Rationale: `spawn_blocking`'s pool is large but bounded, and shutdown cannot cancel work already running inside it, so a stuck long-running blocking closure can wedge process shutdown. Verify: code-read every `spawn_blocking` closure body for an unbounded loop or a call with no timeout (e.g. a network call inside `spawn_blocking` instead of using the async HTTP client directly).
10. **Fan-out HTTP/registry calls must go through a bounded-concurrency combinator (`buffer_unordered(n)` or a `Semaphore`), never an unbounded `join_all`/`FuturesUnordered` over a caller-controlled list length.** Rationale: unbounded fan-out against a registry can exhaust the HTTP connection pool or trip registry rate limits. Verify: `grep -rn 'join_all\|FuturesUnordered::new' --include='*.rs' src/` and confirm each site bounds the list length or wraps it in `buffer_unordered`/`Semaphore`.
11. **Retries against the registry/network must use jittered exponential backoff via an existing crate (`backon`), never a hand-rolled fixed-delay retry loop.** Rationale: fixed-delay retries synchronize and amplify load on a struggling registry (thundering herd); jitter is the standard fix. Verify: `grep -rn 'retry\|backoff' --include='*.rs' src/` — confirm `backon`/equivalent crate usage rather than a manual `for attempt in 0..N { sleep(fixed_delay).await; ... }` loop.

## AI-agent angle

- **Reaching for `#[async_trait]` reflexively.** Training data is saturated with pre-1.75 code where `#[async_trait]` was the only option; an agent will often add it to every new trait with `async fn` methods even when the trait is never used as `dyn Trait`. Check: `grep -rn '#\[async_trait\]'` then confirm a matching `dyn <Trait>`/`Box<dyn <Trait>>` exists — if not, delete the macro.
- **Writing `Pin<Box<dyn Future<Output = T> + Send>>` by hand for a trait method return type instead of just writing `async fn` or reaching for `trait_variant`.** This compiles and "looks expert" but is needless 2021-era boilerplate post-1.75. Check: `grep -rn 'Pin<Box<dyn Future'` — any hit inside a trait definition (not a hand-rolled `Future`/`Stream` impl) is very likely obsolete.
- **Awaiting `read_to_end`/`write_all` inside a `select!` or a `tokio::time::timeout` and assuming a timeout "just cancels safely."** The future genuinely is dropped safely at the language level, but the *buffer/stream state* is left inconsistent (partial read, position lost) — this is a semantic bug an agent's compiler-passes check will never catch. Check: hand-audit every `select!`/`timeout(...)` wrapping one of the documented non-cancel-safe methods.
- **Assuming `Mutex::lock()` from `std::sync` is fine "because it's just a quick lock" inside an async function that later awaits something else in the same scope.** An agent frequently doesn't trace the guard's lifetime past the `.lock()` call to see it's still live at a later `.await`. Check: `cargo clippy -- -D clippy::await_holding_lock` in CI — this is a mechanical, zero-judgment catch.
- **Believing `tokio::spawn(fut)` inside an async block "runs concurrently" with the code after it without ever `.await`ing the returned `JoinHandle`, then silently dropping the handle** — the task does keep running (spawn is fire-and-forget by design), but the agent frequently doesn't reason about what happens if the process/runtime exits before it finishes, or forgets to propagate its error, so failures vanish silently. Check: for every `tokio::spawn` whose `JoinHandle` is bound to `_` or immediately dropped, confirm that's intentional (comment) rather than an unhandled fallible task.
- **Hallucinating `Handle::spawn_blocking` or `block_on` as always-safe "just call it" escape hatches for sync code deep inside async call chains**, without checking whether the call site is already on a worker thread (causing a `block_on` panic) or already at cooperative-scheduling risk (a `block_in_place` inside a `join!`, freezing sibling branches). Check: trace the call graph from any `block_in_place`/`block_on` site up to its entry point; confirm it's not nested inside another async context.
- **Writing a fixed-delay retry loop (`loop { attempt; sleep(Duration::from_secs(1)).await; }`) instead of using the backoff crate already in the dependency tree**, because fixed-delay retry is what most training-data code looks like. Check: `cargo tree | grep -i backon` (or whichever retry crate the project already depends on) — if present, any hand-rolled sleep-loop retry is a candidate for replacement.
- **Producing an unbounded `join_all(futures)` over a list whose length is caller/user-controlled** (e.g. "download every layer of this image") instead of `buffer_unordered(n)`. Compiles fine, works fine on small test images, breaks on a 200-layer image against a rate-limited registry. Check: any `futures::future::join_all`/`try_join_all` call — confirm the input list length is provably bounded by a small constant, or replace with `buffer_unordered`.

## Contested / evolving

- **`async-trait` vs native AFIT for public library APIs.** As of 2026 the community has broadly converged on "native AFIT unless you need `dyn`," but some widely-used libraries keep `#[async_trait]` on public traits for backward-compatibility / MSRV reasons even where dyn-compatibility isn't otherwise needed — check a given crate's MSRV before assuming AFIT is safe to require.
- **Return Type Notation (RTN) for expressing `Send` bounds on trait methods** is still not stabilized as of the most recent tracked status (blocked on trait-solver work as of the 2025 project-goals update) — `trait_variant::make` remains the practical answer, but expect this story to change; re-check before treating `trait_variant` as permanent.
- **Whether CLI tools should be async at all** is a live style debate, not settled: one camp treats tokio as the default HTTP-client dependency regardless of concurrency need (because `reqwest` pulls it in transitively anyway); the other treats a runtime as unjustified weight for a tool that mostly does one sequential registry call per invocation and reaches for a blocking client (`ureq`) instead. The trend for OCI/registry tooling specifically (this project's actual shape) is toward async + `current_thread`/bounded-fan-out, because bulk layer/blob downloads are the dominant real workload once a project matures past its first version — but a genuinely single-request subcommand is a legitimate place to stay synchronous.
- **`block_in_place` is increasingly discouraged in newer guidance** in favor of always reaching for `spawn_blocking`, even for the "stay on this task" case — treat any new `block_in_place` call added to a codebase as something to double-check rather than a routine choice.
- **tokio-console's `tokio_unstable` requirement** means it is not something that ships in a normal `cargo build`/release pipeline; expect this gate to persist rather than get lifted soon, so it stays a local-dev/debug-build-only tool rather than something wired into CI trace collection for this project.

## Sources

| URL | What it is | Date / era | Why it was worth reading |
|---|---|---|---|
| [docs.rs/tokio spawn_blocking](https://docs.rs/tokio/latest/tokio/task/fn.spawn_blocking.html) | Official crate docs | tokio 1.x, current | Primary source for spawn_blocking semantics, pool sizing, shutdown behavior |
| [docs.rs/tokio block_in_place](https://docs.rs/tokio/latest/tokio/task/fn.block_in_place.html) | Official crate docs | tokio 1.x, current | Primary source for block_in_place restrictions and deadlock/suspension risk |
| [tokio.rs tutorial: select](https://tokio.rs/tokio/tutorial/select) | Official tokio.rs tutorial | current | Canonical, narrative explanation of select! dropping losing branches |
| [docs.rs/tokio macro.select!](https://docs.rs/tokio/latest/tokio/macro.select.html) | Official crate docs (API reference) | tokio 1.x, current | Exact cancellation-safety definition and the cancel-safe/not-safe API list |
| [docs.rs/tokio runtime module](https://docs.rs/tokio/latest/tokio/runtime/index.html) | Official crate docs | tokio 1.x, current | multi_thread vs current_thread selection criteria, worker thread defaults |
| [Alice Ryhl — "Async: What is blocking?"](https://ryhl.io/blog/async-what-is-blocking/) | Blog, tokio core maintainer | 2020s, treated as current de facto tokio guidance | Source of the 10–100 microsecond rule of thumb and the definition of blocking |
| [tokio-rs/console (GitHub repo)](https://github.com/tokio-rs/console) | Official tool repo/README | current | tokio_unstable setup, console-subscriber usage, what the console detects |
| [wrenlearnsrust.com — async traits 2026](https://wrenlearnsrust.com/posts/async-traits-2026.html) | Independent blog | dated 2026 | Concise current-state summary of AFIT vs async-trait vs trait_variant tradeoffs |
| [docs.rs trait-variant](https://docs.rs/trait-variant/latest/trait_variant/) | Official crate docs | current | Primary source for why/how trait_variant::make solves the Send-bound gap |
| [docs.rs/tokio JoinSet](https://docs.rs/tokio/latest/tokio/task/struct.JoinSet.html) | Official crate docs | tokio 1.x, current | Primary source for JoinSet semantics, drop-aborts-tasks behavior |
| [docs.rs/tokio-util TaskTracker](https://docs.rs/tokio-util/latest/tokio_util/task/task_tracker/struct.TaskTracker.html) | Official crate docs | tokio-util current | Primary source for the TaskTracker + CancellationToken shutdown pattern |
| [docs.rs backon](https://docs.rs/backon/latest/backon/) | Official crate docs | current | Primary source for the current idiomatic retry/backoff crate's API |
| [docs.rs/tokio Handle::block_on](https://docs.rs/tokio/latest/tokio/runtime/struct.Handle.html#method.block_on) | Official crate docs | tokio 1.x, current | Confirms block_on panics (not silently deadlocks) when nested in async context |
| [docs.rs/tokio time::timeout](https://docs.rs/tokio/latest/tokio/time/fn.timeout.html) | Official crate docs | tokio 1.x, current | Exact cancellation semantics of timeout and the poll-before-deadline caveat |
| [docs.rs futures StreamExt::buffer_unordered](https://docs.rs/futures/latest/futures/stream/trait.StreamExt.html#method.buffer_unordered) | Official crate docs (futures-rs) | current | Primary source for the bounded-concurrency fan-out combinator's semantics |
| [rust-clippy master lint list — await_holding_lock](https://rust-lang.github.io/rust-clippy/master/#await_holding_lock) | Official clippy lint reference | current (master) | Confirms lint name, default level (warn), and related lints |
| [docs.rs/tokio attr.main](https://docs.rs/tokio/latest/tokio/attr.main.html) | Official crate docs | tokio 1.x, current | Exact flavor options and macro-expansion of #[tokio::main] |
| [tokio.rs topics: bridging](https://tokio.rs/tokio/topics/bridging) | Official tokio.rs guide | current | Guidance on mixing sync/async, current_thread preference when bridging, block_on freeze risk |
| [docs.rs/tokio-util CancellationToken](https://docs.rs/tokio-util/latest/tokio_util/sync/struct.CancellationToken.html) | Official crate docs | tokio-util current | Primary source for child_token/cancelled API and structured shutdown pattern |
| [rust-lang async-book — async in traits](https://rust-lang.github.io/async-book/07_workarounds/05_async_in_traits.html) | Official Rust project book | written ~2022, historical | Explains the dyn-incompatibility root cause; explicitly flagged as pre-stabilization/stale on stable-vs-nightly claims |
| [Rust Blog — Announcing async fn and RPITIT in traits](https://blog.rust-lang.org/2023/12/21/async-fn-rpit-in-traits/) | Official Rust project blog | Dec 2023 | Primary source for the exact stabilization (Rust 1.75) of AFIT/RPITIT |
| [Rust Blog — Types Team Update and Roadmap](https://blog.rust-lang.org/2024/06/26/types-team-update/) | Official Rust project blog | June 2024 | Confirms ongoing Send-bound-problem status post-stabilization |
| [Rust inside-blog — RTN call for testing](https://blog.rust-lang.org/inside-rust/2024/09/26/rtn-call-for-testing/) | Official Rust project blog | Sept 2024 | Status of Return Type Notation as the eventual native fix for Send bounds |
