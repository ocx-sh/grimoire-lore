---
title: Async Rust and Concurrency — Consolidated Position
topic: rust-async
model: opus
consolidates:
  - rust-async/async-foundations-and-pitfalls.md
  - rust-async/concurrency-primitives-and-testing.md
  - ocx-codebase-audit/errors-async-security.md
  - ocx-codebase-audit/crate-architecture.md
date: 2026-08
---

# Async Rust and Concurrency

## Verdict

1. **Async stays.** grim/ocx pull N blobs and layers per invocation; the fan-out is the
   workload, not an accident. The "should a CLI be async at all" debate
   ([foundations §Contested](rust-async/async-foundations-and-pitfalls.md)) resolves toward
   async for this project shape.
2. **`multi_thread` remains the default flavour.** The foundations researcher proposed
   defaulting to `current_thread` for startup cost; the concurrency researcher notes that
   `current_thread` freezes spawned tasks the moment `block_on` returns
   ([tokio bridging](https://tokio.rs/tokio/topics/bridging)). **Conflict resolved for
   `multi_thread`**: all three codebases fan out through `JoinSet` (95/27/5 hits,
   `errors-async-security.md §3`), so the freeze hazard is real and the idle-worker cost is
   not. `current_thread` is allowed only in a binary that provably never spawns.
3. **Locks are `std::sync`, critical sections are short, and no guard crosses an `.await`.**
   This is already the house convention — zero `tokio::sync::Mutex` in 700+ files — so we
   promote convention to enforced lint rather than inventing a new policy. No `parking_lot`:
   the perf gap closed, and it silently drops poisoning.
4. **Blocking work goes to `spawn_blocking`, always, named and documented.** Tarball
   extraction, sha256, `std::fs`, subprocess launch are the four blocking families this
   codebase actually has, and all four appear inside async call graphs today.
5. **Every network await carries a deadline and every fan-out carries a bound.** A package
   manager talking to a hostile or rate-limited registry has no excuse for an unbounded wait
   or an unbounded in-flight count.
6. **Native `async fn` in traits is the default for new code; `#[async_trait]` needs a
   `dyn` site to justify itself.** We do not mass-migrate the 83 existing usages — the
   traits/structs refactor decides each one as it touches it.
7. **Concurrency correctness is tested with paused tokio time, not with loom.** loom/shuttle
   pay off for lock-free data-structure authors; this codebase has none. Deterministic
   timeout/retry tests are the high-yield investment.
8. **Cancellation is a first-class design concern, not an afterthought.** `select!` drops
   losing branches; that is the single most common source of silent partial-write bugs an
   agent will introduce here.

## The ruleset

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| ASYNC-01 | Never call blocking work (`std::fs`, `std::process::Command`, sha256/digest, tar/zip extract, compression, `rayon`) directly in an `async fn` body — wrap it in `tokio::task::spawn_blocking`. | Blocks the worker thread and starves every other in-flight task; tokio's threshold is ~10–100 µs between awaits ([Ryhl](https://ryhl.io/blog/async-what-is-blocking/)). | `grep -rn 'std::fs::\|std::process::Command\|Sha256::' --include='*.rs' src/` and confirm each hit inside an `async fn` is in a `spawn_blocking` closure. | MUST |
| ASYNC-02 | Never hold a `std::sync`/`parking_lot` `MutexGuard` or `RwLock` guard across an `.await`. | Not `Send`, and even where it compiles (`current_thread`) it "virtually never leads to correct concurrent code" ([tokio::sync::Mutex](https://docs.rs/tokio/latest/tokio/sync/struct.Mutex.html)). | `cargo clippy --all-targets -- -D clippy::await_holding_lock -D clippy::await_holding_invalid_type -D clippy::await_holding_refcell_ref` in CI. | MUST |
| ASYNC-03 | Default to `std::sync::Mutex`/`RwLock`; reaching for `tokio::sync::Mutex` requires a comment naming the `.await` the critical section must span. | Std locks are cheaper; needing the async lock is a signal the critical section is too big ([tokio shared-state](https://tokio.rs/tokio/tutorial/shared-state)). | `grep -rn 'tokio::sync::\(Mutex\|RwLock\)' --include='*.rs' src/` — every hit needs the justification comment. | MUST |
| ASYNC-04 | Every await on a network or subprocess operation carries a deadline — `tokio::time::timeout` or a client-level timeout configured at construction. | A hostile or wedged registry otherwise hangs the process forever with no exit code. | `grep -rn 'reqwest::Client::builder\|ClientBuilder' src/` must show `.timeout(`/`.connect_timeout(`; audit `oci`/registry call sites for a `timeout(` wrapper. | MUST |
| ASYNC-05 | Bound every fan-out whose length is caller- or wire-controlled: `buffer_unordered(n)`, or a `JoinSet` gated by a `Semaphore`. Never `join_all`/`try_join_all` over an unbounded list. | A 200-layer image against a rate-limited registry exhausts the connection pool and trips 429s ([buffer_unordered](https://docs.rs/futures/latest/futures/stream/trait.StreamExt.html#method.buffer_unordered)). | `grep -rn 'join_all\|try_join_all\|FuturesUnordered::new' --include='*.rs' src/`; each hit must prove a small constant bound or be replaced. | MUST |
| ASYNC-06 | Never use `mpsc::unbounded_channel` (or any uncapped queue) without a comment justifying why backpressure is inapplicable. | An unbounded queue turns any consumer stall into unbounded memory growth — a documented production OOM ([OneSignal](https://onesignal.com/blog/solving-memory-leaks-in-rust/)). | `grep -rn 'unbounded_channel' --include='*.rs' src/`. | MUST |
| ASYNC-07 | Every `select!` branch must be built from a cancel-safe future, or the code must state in a comment what partial work is acceptable to lose. | `select!` drops every losing branch outright; `read_exact`, `read_to_end`, `write_all`, `Mutex::lock`, `Semaphore::acquire` lose data or queue position ([select! docs](https://docs.rs/tokio/latest/tokio/macro.select.html)). | Read every `tokio::select!` block; flag branches calling the non-cancel-safe list above. Applies to `tokio::time::timeout` wrapping the same calls. | MUST |
| ASYNC-08 | `Handle::block_on`/`Runtime::block_on` must not be reachable from any code that can already be running inside a tokio task. | It panics — and the panic surfaces far from the call site, inside a sync callback ([Handle::block_on](https://docs.rs/tokio/latest/tokio/runtime/struct.Handle.html#method.block_on)). | `grep -rn 'block_on(' --include='*.rs' src/`; trace each caller to its entry point. The legal nested form is `block_in_place` + `Handle::current().block_on`. | MUST |
| ASYNC-09 | Every `tokio::spawn` handle is `.await`ed, held in a `JoinSet`/`TaskTracker`, or explicitly detached with a comment saying why the failure may be ignored. | A dropped `JoinHandle` does not cancel the task; errors from orphaned work vanish silently. | `grep -rn 'tokio::spawn(' --include='*.rs' src/`; any handle bound to `_` or dropped needs the comment. | MUST |
| ASYNC-10 | Retries against the registry use jittered exponential backoff from a crate already in the tree (`backon` if adding one), never a hand-rolled fixed-delay `sleep` loop. | Fixed-delay retries synchronise across clients and amplify load on a struggling registry ([backon](https://docs.rs/backon/latest/backon/)). | `grep -rn 'retry\|backoff' --include='*.rs' src/` — reject `loop { …; sleep(fixed).await }`. | MUST |
| ASYNC-11 | Never call into a thread pool (`rayon`, `spawn_blocking`) while holding a lock that the pool's workers could also need. | Circular wait; a real production deadlock that took 8 hours to isolate ([UBOS case study](https://ubos.tech/news/rust-rayon-mutex-deadlock-explained-preventing-robot-freeze/)). | Read every `spawn_blocking(`/`rayon::` call site; no enclosing scope may still hold a guard. | MUST |
| ASYNC-12 | Never put shared mutable state behind `Arc<RefCell<T>>`/`Arc<Cell<T>>`, and never add `unsafe impl Send`/`Sync` to silence a compiler error. | `RefCell`/`Cell` are `!Sync` by design; the unsafe impl removes the only check that the design is sound ([Rustonomicon](https://doc.rust-lang.org/nomicon/send-and-sync.html)). | `grep -rn 'Arc<RefCell\|Arc<Cell\|unsafe impl.*\(Send\|Sync\)' --include='*.rs' src/`. | MUST |
| ASYNC-13 | Any test asserting timeout, retry, or backoff behaviour uses `#[tokio::test(start_paused = true)]` with `tokio::time::advance` — never a real `sleep` as a wait. | Real-time sleeps are slow and flaky under CI load; paused time is instant and deterministic ([tokio::time::pause](https://docs.rs/tokio/latest/tokio/time/fn.pause.html)). | `grep -rn 'sleep(Duration::from_' tests/ src/` inside `#[tokio::test]` bodies without `start_paused = true`. | MUST |
| ASYNC-14 | New traits with async methods use native `async fn`; `#[async_trait]` is permitted only where a `dyn Trait`/`Box<dyn Trait>`/`Arc<dyn Trait>` site exists in the same crate. | AFIT is stable since Rust 1.75; `#[async_trait]` costs a heap allocation per call and is pre-1.75 muscle memory ([Rust blog](https://blog.rust-lang.org/2023/12/21/async-fn-rpit-in-traits/)). | `grep -rn '#\[async_trait\]'` and, per hit, `grep -rn 'dyn <TraitName>'`. No `dyn` site → delete the macro. | SHOULD |
| ASYNC-15 | When a trait's futures must cross a `tokio::spawn` boundary, add the `Send` bound with `#[trait_variant::make(… : Send)]` — never by hand-writing `Pin<Box<dyn Future + Send>>` in the trait. | Native AFIT cannot express a `Send` bound; RTN is not stabilised ([trait-variant](https://docs.rs/trait-variant/latest/trait_variant/)). | `grep -rn 'Pin<Box<dyn Future' --include='*.rs' src/` — any hit in a trait definition (not a hand-rolled `Future`/`Stream` impl) is obsolete. | SHOULD |
| ASYNC-16 | An `Arc<Mutex<T>>` where `T` owns an I/O handle or does `.await` work internally should become an actor: one owning task plus a cloneable handle over an `mpsc` channel. Spawn in the handle constructor, never in a message-handling method. | Removes the lock-across-await tradeoff entirely and makes the owner unit-testable; `spawn` needs `'static`, so per-call spawning leaks tasks ([Actors with Tokio](https://ryhl.io/blog/actors-with-tokio/)). | Grep for `Arc<Mutex<` wrapping a client/connection/file handle; grep the actor's handle `impl` for `tokio::spawn(` outside `fn new`. | SHOULD |
| ASYNC-17 | Never build a cycle of bounded channels between tasks that can each block on a full `send().await` from inside their own receive loop. | Circular backpressure is a deadlock by construction ([Actors with Tokio](https://ryhl.io/blog/actors-with-tokio/)). | Draw the message graph; any cycle of awaited bounded sends is a defect. | SHOULD |
| ASYNC-18 | Long-lived or unbounded-duration blocking work goes on a dedicated `std::thread`, not `spawn_blocking`. | The blocking pool is large but finite, and runtime shutdown cannot cancel work already inside it — a stuck closure wedges process exit ([spawn_blocking](https://docs.rs/tokio/latest/tokio/task/fn.spawn_blocking.html)). | Read every `spawn_blocking` closure for an unbounded loop or an un-timed network call. | SHOULD |
| ASYNC-19 | Use `std::sync::OnceLock`/`LazyLock`, not `lazy_static!`/`once_cell::sync::Lazy`, in new code. | Both are in std (1.70 / 1.80); the crates are a dependency for no functional gain ([OnceLock](https://doc.rust-lang.org/std/sync/struct.OnceLock.html)). | `grep -rn 'lazy_static!\|once_cell::sync::Lazy' --include='*.rs' src/`. | SHOULD |
| ASYNC-20 | Do not use `thread_local!` for state that must survive an `.await`; use `tokio::task_local!`. | A task can resume on a different worker thread after every await, so thread-local context reads stale or foreign data ([tokio #3370](https://github.com/tokio-rs/tokio/pull/3370)). | `grep -rn 'thread_local!' --include='*.rs' src/`; confirm no read/write pair straddles an `.await`. | CONSIDER |
| ASYNC-21 | Hand-rolled atomics need a comment naming the happens-before relationship: `Relaxed` for independent counters, `Acquire`/`Release` pairs for publish, `SeqCst` only for a genuine multi-location total order. | `SeqCst`-by-default hides a design that should have used a `Mutex`, channel, or `OnceLock` ([Ordering docs](https://doc.rust-lang.org/std/sync/atomic/enum.Ordering.html)). | `grep -rn 'Ordering::' --include='*.rs' src/`. | CONSIDER |

## Applied to OCX

**Already satisfied.**

- **ASYNC-03** — zero `tokio::sync::Mutex` across all three codebases; `std::sync::Mutex` is
  the dominant lock (17 ocx_lib / 21 grimoire / 8 ocx-mirror), a deliberate short-critical-
  section convention (`errors-async-security.md §4`). The rule codifies existing practice.
- **ASYNC-05 (structure, not bounds)** — `JoinSet` is the standard fan-out primitive
  (95/27/5) and bare `tokio::spawn` is rare (26/4/7) (`§3`). Whether each `JoinSet` is
  *bounded* is unverified.
- **ASYNC-01 (pattern established)** — `spawn_blocking` is the disciplined escape hatch
  (81/16/9), and `ocx_lib/src/utility/fs.rs:22-26` carries a doc comment naming exactly which
  sync API (`FileLock::lock_exclusive_blocking_with_timeout`) it exists to bridge — the
  reference shape for ASYNC-01/ASYNC-18.
- **ASYNC-09 (best local example)** — `grimoire/src/tui/update_check.rs:132-232` drains a
  `JoinSet<()>` non-blockingly each tick with a comment on why completed handles must not
  accumulate.
- **Runtime construction** — `grimoire/src/main.rs:165` deliberately builds
  `tokio::runtime::Runtime::new()` by hand instead of `#[tokio::main]`, so a runtime-
  construction failure routes through the same exit-code path as any other error
  (`main.rs:166-175`). Keep this; it is a motivated divergence, not drift.

**Violated or unverified.**

- **ASYNC-04** — `tokio::time::timeout` appears 22× in ocx_lib but only **2× in grimoire**,
  against a comparable registry/OCI-pull network surface (`errors-async-security.md` smell
  #5). Unbounded-wait risk on a slow or hostile registry. Highest-value fix in this topic.
- **ASYNC-01** — 76 / 25 / 39 files contain both an `async fn` and a `std::fs::*` call
  (smell #6); `crate-architecture.md:221` counts 1,664 (ocx) and 906 (grimoire) `std::fs::`/
  `tokio::fs::` call sites. Co-location is a heuristic, not a defect count — a precise
  lexical pass (calls inside an `async fn` body) is required before this becomes a gate.
- **ASYNC-02** — clippy's `await_holding_lock` is **not confirmed enabled** anywhere, and the
  guard-lifetime-vs-await-span check was never run exhaustively across the 700+ files
  (smell #7). Turning the lint on is cheap and mechanical.
- **ASYNC-14** — 63 `#[async_trait]` usages in ocx, 20 in grimoire
  (`crate-architecture.md:37`; the async/security audit counts 80/28 raw hits). The audit
  suspects object-safety motivation but never confirmed it (smell #8). Under this ruleset
  each becomes a per-site question at refactor time, not a bulk migration.
- **Graceful shutdown** — no process-wide `CancellationToken` root anywhere; `.abort()` +
  `CancellationToken` total 13 hits across three codebases, and no SIGINT/SIGTERM handling
  exists in grimoire or ocx-mirror (smell #9). This is a design gap, not a rule violation —
  see Open questions.

**New commitments** (nothing in the codebase does these today): ASYNC-02 as a CI-denied
lint; ASYNC-04 as a universal deadline requirement; ASYNC-06 (no unbounded channel without
justification); ASYNC-10 (jittered backoff — no evidence any retry crate is in the tree);
ASYNC-13 (`start_paused` timing tests); ASYNC-15/ASYNC-16 as the shapes the traits-and-
structs refactor should produce instead of more free functions over `Arc<Mutex<…>>`.

## AI-agent failure modes

Ranked by how often they bite in a codebase of this shape.

1. **Porting a sync function into an `async fn` by adding `async` to the signature** and
   calling the CPU/FS-bound body directly — no `spawn_blocking`. The single most likely
   defect here, because tarball extraction, digest computation and `std::fs` are everywhere.
   Compiles, passes tests, starves the runtime under load.
2. **Reaching for `#[async_trait]` reflexively** on every new trait with an async method,
   because training data is saturated with pre-1.75 code. Also its cousin: hand-writing
   `Pin<Box<dyn Future + Send>>` as a trait return type because it "looks expert".
3. **Holding a `std::sync` guard across an `.await`**, then concluding it is fine because it
   compiled — the compiler does not reject `!Send` futures on a `current_thread` test
   runtime. Mechanically catchable, so it survives only where the lint is off.
4. **Choosing `unbounded_channel` because it has no capacity argument to reason about** —
   the fewest-decisions API wins when an agent optimises for "code that compiles".
5. **Unbounded `join_all` over a caller-controlled list** ("download every layer"). Fine on a
   3-layer test image, breaks on a 200-layer image against a rate-limited registry.
6. **Wrapping `read_to_end`/`write_all` in `select!` or `timeout` and assuming cancellation
   is clean.** The drop *is* safe at the language level; the buffer and stream position are
   not. No compiler pass catches this.
7. **Fixed-delay retry loops** (`loop { attempt; sleep(1s).await }`) instead of the backoff
   crate already in the dependency tree — again, the shape most training data has.
8. **Dropping a `JoinHandle` from `tokio::spawn`** without reasoning about whether the task
   outlives the runtime or whether its error is now unobservable.
9. **Stale `lazy_static!` / `once_cell::sync::Lazy`** in edition-2024 code where
   `LazyLock`/`OnceLock` are stable and dependency-free.
10. **`Ordering::SeqCst` on every atomic "to be safe"**, masking a design that should have
    used a `Mutex` or a channel.
11. **Hallucinated poisoning semantics** — `.lock().unwrap()` written against a
    `tokio::sync::Mutex` (whose `lock()` returns no `Result` at all), a tell that std-Mutex-
    shaped code was copied without checking the type.
12. **`block_on` treated as an always-safe escape hatch** for calling async from sync deep in
    the call graph. It panics, and the panic lands far from the cause.

## Open questions

1. **Are the 83 `#[async_trait]` usages actually `dyn`-motivated?** One grep answers it, and
   the answer decides whether ASYNC-14 is a no-op for existing code or a migration backlog.
2. **Does grim/ocx want a process-wide `CancellationToken` root plus SIGINT/SIGTERM
   handling?** Today shutdown is per-subsystem and ad hoc. For a CLI that writes lockfiles
   and extracts tarballs, Ctrl-C mid-write is a real corruption path — but adding a shutdown
   coordinator is architecture, not a lint.
3. **Is `tokio = { features = ["full"] }` (pinned identically in all three) worth trimming?**
   Compile time and binary size versus one more thing to get wrong on each feature add.
4. **Does any `grim` subcommand justify `current_thread`?** Verdict item 2 says
   `multi_thread` by default, but a genuinely sequential command path (`grim status`,
   `grim describe`) could measurably win on startup. Needs a measurement, not an opinion.
5. **Does anything here warrant `loom`?** Neither audit found a hand-rolled lock or lock-free
   structure, so the answer is currently no — revisit only if an `unsafe impl Send`/`Sync`
   appears outside FFI shim code.

## Sub-artifacts

- [rust-async/async-foundations-and-pitfalls.md](rust-async/async-foundations-and-pitfalls.md) —
  tokio runtime flavours, blocking rules and `spawn_blocking`/`block_in_place`/`block_on`
  semantics, cancellation safety, structured concurrency, async traits after Rust 1.75,
  bounded fan-out and jittered backoff, tokio-console.
- [rust-async/concurrency-primitives-and-testing.md](rust-async/concurrency-primitives-and-testing.md) —
  `std::sync` vs `tokio::sync` locks, poisoning and fairness, channel selection and the
  unbounded-queue OOM, the actor pattern, `Send`/`Sync` and interior mutability, atomics
  and memory ordering, rayon vs tokio, and the concurrency-testing tool ladder
  (paused time → shuttle → loom → turmoil/madsim).
- [ocx-codebase-audit/errors-async-security.md](ocx-codebase-audit/errors-async-security.md) —
  how tokio, locks, `spawn_blocking` and shutdown are actually used across ocx, grimoire and
  ocx-mirror today, with the ranked smell list this document's "Applied to OCX" cites.

## Key sources

| URL | Why |
|---|---|
| [tokio `select!` macro docs](https://docs.rs/tokio/latest/tokio/macro.select.html) | Exact cancellation-safety definition plus the cancel-safe / not-cancel-safe API lists |
| [Alice Ryhl — Async: What is blocking?](https://ryhl.io/blog/async-what-is-blocking/) | The 10–100 µs rule and tokio's working definition of "blocking" |
| [tokio `spawn_blocking` docs](https://docs.rs/tokio/latest/tokio/task/fn.spawn_blocking.html) | Pool sizing, short-vs-long-lived guidance, shutdown cannot cancel |
| [tokio shared-state tutorial](https://tokio.rs/tokio/tutorial/shared-state) | The std-Mutex-first rule and the mechanics of guard-across-await |
| [`tokio::sync::Mutex` docs](https://docs.rs/tokio/latest/tokio/sync/struct.Mutex.html) | No poisoning; "virtually never leads to correct concurrent code" wording |
| [Actors with Tokio — ryhl.io](https://ryhl.io/blog/actors-with-tokio/) | Canonical actor formulation, spawn-in-constructor rule, bounded-cycle deadlock |
| [`tokio::sync::mpsc` docs](https://docs.rs/tokio/latest/tokio/sync/mpsc/index.html) | Bounded backpressure semantics and channel-closing rules |
| [OneSignal — Fixing Memory Leaks in Rust](https://onesignal.com/blog/solving-memory-leaks-in-rust/) | Production OOM grounding the no-unbounded-channel rule |
| [futures `StreamExt::buffer_unordered`](https://docs.rs/futures/latest/futures/stream/trait.StreamExt.html#method.buffer_unordered) | The bounded fan-out combinator for layer/blob pulls |
| [clippy `await_holding_lock`](https://rust-lang.github.io/rust-clippy/master/#await_holding_lock) | Exact lint name and default level for the ASYNC-02 CI gate |
| [Rust blog — async fn and RPITIT in traits](https://blog.rust-lang.org/2023/12/21/async-fn-rpit-in-traits/) | Stabilisation fact (1.75) that retires reflexive `#[async_trait]` |
| [`trait-variant` docs](https://docs.rs/trait-variant/latest/trait_variant/) | The supported way to put a `Send` bound on an AFIT future |
| [`tokio::time::pause` docs](https://docs.rs/tokio/latest/tokio/time/fn.pause.html) | `start_paused` semantics for deterministic timeout/retry tests |
| [`tokio::runtime::Handle::block_on`](https://docs.rs/tokio/latest/tokio/runtime/struct.Handle.html#method.block_on) | Confirms it panics rather than silently deadlocking |
| [tokio bridging with sync code](https://tokio.rs/tokio/topics/bridging) | `current_thread` freeze caveat that settled the runtime-flavour conflict |
| [UBOS — Rayon/Mutex deadlock case study](https://ubos.tech/news/rust-rayon-mutex-deadlock-explained-preventing-robot-freeze/) | Real incident behind "no lock held across a thread-pool call" |
| [`std::sync::atomic::Ordering` docs](https://doc.rust-lang.org/std/sync/atomic/enum.Ordering.html) | Authoritative per-variant semantics for ASYNC-21 |
| [`backon` docs](https://docs.rs/backon/latest/backon/) | Current idiomatic jittered-backoff retry API |
