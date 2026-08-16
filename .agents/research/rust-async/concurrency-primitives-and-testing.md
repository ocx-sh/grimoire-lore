---
title: Sync Primitives, Shared State and Concurrency Testing in Rust
topic: concurrency-primitives-and-testing
agent: rust-domain-researcher-concurrency
model: sonnet
date_researched: "2026-08"
sources_count: 24
scope: >
  Covers std::sync vs tokio::sync locking, channels (std/crossbeam/tokio), the
  actor pattern, Arc/interior mutability/Send+Sync, atomics and memory
  ordering, rayon vs tokio, and concurrency testing tools (loom, shuttle,
  turmoil/madsim, tokio time control). Does not cover distributed-systems
  consensus, GPU/SIMD parallelism, or non-Rust language comparisons.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [std::sync vs tokio::sync locks](#1-stdsync-vs-tokiosync-locks)
   2. [RwLock fairness and writer starvation](#2-rwlock-fairness-and-writer-starvation)
   3. [parking_lot tradeoffs](#3-parking_lot-tradeoffs)
   4. [Mutex poisoning and try_lock](#4-mutex-poisoning-and-try_lock)
   5. [Channels: std, crossbeam, tokio](#5-channels-std-crossbeam-tokio)
   6. [The actor pattern](#6-the-actor-pattern)
   7. [Arc, interior mutability, Send + Sync](#7-arc-interior-mutability-send--sync)
   8. [Thread-locals in async](#8-thread-locals-in-async)
   9. [Atomics and memory ordering](#9-atomics-and-memory-ordering)
   10. [Parallelism vs concurrency: rayon and tokio](#10-parallelism-vs-concurrency-rayon-and-tokio)
   11. [Testing concurrency: loom, shuttle, deterministic simulation](#11-testing-concurrency-loom-shuttle-deterministic-simulation)
   12. [Data race and deadlock case studies](#12-data-race-and-deadlock-case-studies)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- Never hold a `std::sync::MutexGuard` (or `RwLock` guard) across an `.await` point; the guard is not `Send` and the compiler will usually reject it on a multi-threaded runtime, but on a single-threaded/`!Send`-tolerant path it can silently compile into a deadlock ([Tokio shared-state tutorial](https://tokio.rs/tokio/tutorial/shared-state)).
- Default to `std::sync::Mutex`/`RwLock` for short, non-`.await`-spanning critical sections; reach for `tokio::sync::Mutex` only when the lock genuinely must survive an `.await` (e.g., guarding a single shared connection) ([tokio::sync::Mutex docs](https://docs.rs/tokio/latest/tokio/sync/struct.Mutex.html)).
- `tokio::sync::Mutex` does **not** poison on panic — a panic while holding the guard silently unlocks, potentially leaving data inconsistent; `std::sync::Mutex` does poison ([tokio::sync::Mutex docs](https://docs.rs/tokio/latest/tokio/sync/struct.Mutex.html)).
- `std::sync::RwLock` gives **no fairness guarantee** — the OS decides reader/writer priority, so a reader-heavy workload can starve a writer indefinitely on some platforms ([std::sync::RwLock docs](https://doc.rust-lang.org/std/sync/struct.RwLock.html)).
- `RwLock` only poisons on a panic while **write**-locked; a panicking reader leaves the lock unpoisoned ([std::sync::RwLock docs](https://doc.rust-lang.org/std/sync/struct.RwLock.html)).
- `parking_lot::Mutex`/`RwLock` are 1 byte / 1 word respectively (vs OS-allocated storage on some platforms), up to 5x–50x faster under contention, but drop poisoning by default and need the `deadlock_detection` feature explicitly for cycle detection ([parking_lot README](https://github.com/Amanieu/parking_lot)).
- An **unbounded** channel (`tokio::sync::mpsc::unbounded_channel`, `std::sync::mpsc::channel` without a bound, or any queue with no cap) turns a slow consumer into an unbounded memory leak — this has caused real production OOMs ([OneSignal blog](https://onesignal.com/blog/solving-memory-leaks-in-rust/), [tokio mpsc docs](https://docs.rs/tokio/latest/tokio/sync/mpsc/index.html)).
- A channel closes when **all senders** are dropped (`recv()` returns `None`/`Closed` after the buffer drains); dropping the receiver instead makes further sends fail — design shutdown around whichever end you actually own ([tokio mpsc docs](https://docs.rs/tokio/latest/tokio/sync/mpsc/index.html)).
- The actor pattern (Alice Ryhl's formulation) replaces `Arc<Mutex<T>>` with a spawned task owning the state exclusively plus a cloneable `Handle` that sends messages over an `mpsc` channel; `tokio::spawn` must live in the handle constructor, not inside actor methods, because of the `'static` bound ([Actors with Tokio](https://ryhl.io/blog/actors-with-tokio/)).
- Bounded channels wired into a cycle of actors can deadlock — never let two actors both hold a bounded sender to each other and await a full send inside their own receive loop ([Actors with Tokio](https://ryhl.io/blog/actors-with-tokio/)).
- `Send`/`Sync` are unsafe auto-traits: a type is automatically `Send`/`Sync` if every field is; `Rc<T>` and raw `UnsafeCell`-based cells (`Cell`, `RefCell`) are deliberately `!Sync` because they allow unsynchronized shared mutation ([Rustonomicon: Send and Sync](https://doc.rust-lang.org/nomicon/send-and-sync.html)).
- `OnceLock`/`LazyLock` are now in std (`OnceLock` since 1.70, `LazyLock` since 1.80) and should replace the `lazy_static`/`once_cell` crates for new code; neither poisons on panic ([std::sync::OnceLock docs](https://doc.rust-lang.org/std/sync/struct.OnceLock.html)).
- Thread-locals are unreliable in async code once a task can migrate threads on a multi-threaded runtime — a value set on one poll may not be visible after the next `.await` resumes on a different worker thread; use `tokio::task_local!` (task-scoped, not thread-scoped) instead ([tokio-rs/tokio PR #3370](https://github.com/tokio-rs/tokio/pull/3370)).
- Default to `Relaxed` only for pure counters with no cross-thread happens-before requirement; use `Acquire`/`Release` pairs for publish/subscribe of a pointer or flag; reach for `SeqCst` only when you need a single global total order across more than one atomic location, and prefer starting from a lock or channel over hand-rolled atomics at all ([std::sync::atomic::Ordering docs](https://doc.rust-lang.org/std/sync/atomic/enum.Ordering.html)).
- Holding a `std::sync::Mutex` while calling into `rayon` (or any thread pool) is a real deadlock shape: the lock-holder blocks waiting for rayon workers, and a rayon worker blocks trying to take the same lock — this exact bug froze a production robot control loop for 8 hours of debugging ([UBOS case study](https://ubos.tech/news/rust-rayon-mutex-deadlock-explained-preventing-robot-freeze/)).
- `loom` exhaustively permutes thread interleavings under the C11 memory model for a test compiled with `--cfg loom`; it is exhaustive but does not scale past small, isolated data-structure tests ([tokio-rs/loom README](https://github.com/tokio-rs/loom)).
- `shuttle` (AWS Labs) trades loom's exhaustiveness for randomized, seed-reproducible scheduling that scales to much larger programs — it is unsound (a pass doesn't prove correctness) but finds most real bugs in practice ([shuttle crates.io](https://crates.io/crates/shuttle)).
- `turmoil` deterministically simulates a network of async hosts on a single thread for testing distributed protocols (partitions, delays, retries) against a Tokio-like API ([turmoil docs.rs](https://docs.rs/turmoil/latest/turmoil/)).
- `#[tokio::test(start_paused = true)]` freezes `tokio::time::Instant` so timeout/retry/backoff logic can be tested deterministically and instantly, without real sleeps; it requires the `current_thread` flavor (the test macro default) ([tokio::time::pause docs](https://docs.rs/tokio/latest/tokio/time/fn.pause.html)).
- `rayon` is for CPU-bound data parallelism (parallel iterators, sorting); never call blocking rayon work from inside an async task without `spawn_blocking` — it will stall the tokio worker thread pool ([tokio bridging-with-sync-code](https://tokio.rs/tokio/topics/bridging)).

## Findings

### 1. std::sync vs tokio::sync locks

The rule from Tokio's own tutorial is unambiguous: prefer `std::sync::Mutex` "provided that contention remains low and the lock is not held across calls to `.await`" — it is cheaper and simpler. Reach for `tokio::sync::Mutex` only "for situations where the lock needs to be held for longer periods of time, or across await points" ([Tokio shared-state tutorial](https://tokio.rs/tokio/tutorial/shared-state)).

The mechanical reason a std guard can't cross `.await` on a multi-threaded runtime: `MutexGuard` is `!Send`, and `tokio::spawn` requires the whole future (including anything alive across a suspend point) to be `Send`, because "the Tokio runtime can move a task between threads at every `.await`" ([Tokio shared-state tutorial](https://tokio.rs/tokio/tutorial/shared-state)). The docs.rs page goes further: even where the compiler *doesn't* catch it (e.g. `current_thread` runtime, or a `!Send` future that's never spawned across threads), "this virtually never leads to correct concurrent code in practice as it can easily lead to deadlocks" ([tokio::sync::Mutex docs](https://docs.rs/tokio/latest/tokio/sync/struct.Mutex.html)) — so treat it as a hard rule, not just a compiler-enforced one.

Correct (scope the guard, drop before await):

```rust
{
    let mut lock = mutex.lock().unwrap();
    *lock += 1;
} // guard dropped here, before the next line

do_something_async().await;
```

Incorrect (guard alive across await — compiles on `current_thread`, deadlock-prone on `multi_thread`):

```rust
let mut lock = mutex.lock().unwrap();
*lock += 1;
do_something_async().await; // guard still held here
```

Tokio's own recommendation for the common case of "shared access to an I/O resource" is neither of these mutex types — spawn a task that owns the resource and talk to it over a channel (see §6, actor pattern) ([tokio::sync::Mutex docs](https://docs.rs/tokio/latest/tokio/sync/struct.Mutex.html)).

### 2. RwLock fairness and writer starvation

`std::sync::RwLock`'s docs state plainly: "The priority policy of the lock is dependent on the underlying operating system's implementation, and this type does not guarantee that any particular policy will be used" ([std::sync::RwLock docs](https://doc.rust-lang.org/std/sync/struct.RwLock.html)). Concretely this means a pattern like:

```rust
// Thread 1                  // Thread 2
let _rg1 = lock.read();
                             let _wg = lock.write(); // blocks, waiting for readers
let _rg2 = lock.read();      // may deadlock: OS may let this jump the queue,
                              // or may block it behind the pending writer
```

may deadlock or may not, depending on the platform. Do not rely on either readers or writers winning contention — if you need a fairness guarantee, use `parking_lot::FairMutex`/`RwLock` with explicit fairness, or restructure to avoid nested acquisition of the same lock on the same thread.

Poisoning is asymmetric too: "an `RwLock` may only be poisoned if a panic occurs while it is locked exclusively (write mode). If a panic occurs in any reader, then the lock will not be poisoned" ([std::sync::RwLock docs](https://doc.rust-lang.org/std/sync/struct.RwLock.html)).

### 3. parking_lot tradeoffs

`parking_lot::Mutex` is "1.5x faster than std::sync::Mutex when uncontended, and up to 5x faster when contended," with `RwLock` reaching up to 50x in some benchmarks, at 1 byte of storage for `Mutex`/`Once` and 1 word for `Condvar`/`RwLock` (vs OS-allocated storage for std's primitives on some platforms) ([parking_lot README](https://github.com/Amanieu/parking_lot)).

Its default `Mutex` uses **eventual fairness**: a fair unlock is forced roughly every 0.5ms on average, and any critical section held over 1ms always triggers a fair unlock — this bounds starvation without sacrificing throughput the way a strict FIFO lock would. A fully fair `FairMutex` type is available when strict FIFO ordering is required, at a throughput cost ([parking_lot README](https://github.com/Amanieu/parking_lot); [users.rust-lang.org: Mutex starvation](https://users.rust-lang.org/t/mutex-starvation/89080)).

Tradeoffs to know before swapping in parking_lot: no panic-poisoning by default (a lock held across an unwinding panic silently unlocks with the invariant potentially broken — same non-poisoning risk as `tokio::sync::Mutex`), and deadlock detection is an opt-in Cargo feature, not free ([parking_lot README](https://github.com/Amanieu/parking_lot)).

### 4. Mutex poisoning and try_lock

`std::sync::Mutex`/`RwLock` poison on an unwinding panic while the guard is held; the *next* `.lock()`/`.read()`/`.write()` returns `Err(PoisonError)` wrapping the guard, forcing the caller to consciously decide whether the invariant is still trustworthy (`into_inner()` to recover it or propagate the panic). Neither `tokio::sync::Mutex` nor `parking_lot`'s default types poison — "unlike `std::sync::Mutex`, this implementation does not poison the mutex when a thread holding the `MutexGuard` panics" ([tokio::sync::Mutex docs](https://docs.rs/tokio/latest/tokio/sync/struct.Mutex.html)).

`try_read()`/`try_write()` on `std::sync::RwLock` return `Poisoned` only if the lock would otherwise have been acquired, and `WouldBlock` if contended — they never block ([std::sync::RwLock docs](https://doc.rust-lang.org/std/sync/struct.RwLock.html)). Use `try_lock`/`try_read`/`try_write` on hot paths where blocking is unacceptable (e.g. a metrics sampler), but always have a defined fallback for the `WouldBlock` case — don't spin on it.

### 5. Channels: std, crossbeam, tokio

**std::sync::mpsc** is multi-producer, single-consumer only, blocking, sync-only. Fine for plain-thread pipelines; has no async integration.

**crossbeam-channel** is "an alternative to `std::sync::mpsc` with more features and better performance": multiple consumers (cloneable `Receiver`), a `select!` macro to wait on several channels/timeouts/never at once, and zero-capacity (rendezvous) channels where "send and receive operations must appear at the same time" ([crossbeam-channel docs](https://docs.rs/crossbeam-channel/latest/crossbeam_channel/)).

**tokio::sync::mpsc** is the async multi-producer, single-consumer channel: `channel(n)` is bounded and applies backpressure — "if the bounded channel is at capacity, the send is rejected and the task will be notified when additional capacity is available"; `unbounded_channel()` never blocks the sender and can be called from sync code, at the cost of unbounded memory growth under a slow consumer ([tokio mpsc docs](https://docs.rs/tokio/latest/tokio/sync/mpsc/index.html)). This unbounded footgun is not theoretical: OneSignal's Kafka consumer service was repeatedly OOM-killed in production from unconsumed channel backlog ([OneSignal: Fixing Memory Leaks in Rust](https://onesignal.com/blog/solving-memory-leaks-in-rust/)).

Closing semantics: the channel drains and `recv()` returns `None` (mpsc) once **every** `Sender` is dropped; dropping the `Receiver` first makes subsequent `send()`s return an error and drops any buffered-but-unread messages ([tokio mpsc docs](https://docs.rs/tokio/latest/tokio/sync/mpsc/index.html)).

**tokio::sync::broadcast** is multi-producer, multi-consumer, where every receiver sees every message (up to lag). Capacity rounds **up** to the next power of two; a receiver that falls behind the retained window gets `RecvError::Lagged(n)` on its next `recv()` — not a close — and its cursor jumps forward to the oldest retained message, so lag is recoverable, not fatal ([tokio broadcast docs](https://docs.rs/tokio/latest/tokio/sync/broadcast/index.html)).

**tokio::sync::watch** carries only the *latest* value (single-slot, overwrite-on-send) — use it for "the current config" / "the current leader," not for a message stream where every message matters. **tokio::sync::oneshot** is exactly one value, one send — the standard vehicle for a request/response reply address embedded in a message enum (see §6).

`tokio::select!` picks among ready branches non-deterministically (biased toward listed order unless `biased;` chosen explicitly) and is the standard tool for "shut down on cancellation OR handle the next message," a pattern the actor's receive loop and graceful-shutdown code both lean on.

### 6. The actor pattern

Alice Ryhl's formulation (the canonical reference for Rust actors without a framework like Actix) splits an actor into two structs: the **task** (owns all mutable state, runs a `while let Some(msg) = receiver.recv().await` loop) and the **handle** (a cheap, `Clone`-able struct wrapping an `mpsc::Sender<Message>`, given to callers) ([Actors with Tokio](https://ryhl.io/blog/actors-with-tokio/)).

```rust
enum ActorMessage {
    GetUniqueId { respond_to: oneshot::Sender<u32> },
}

struct MyActor {
    receiver: mpsc::Receiver<ActorMessage>,
    next_id: u32,
}

impl MyActor {
    fn handle_message(&mut self, msg: ActorMessage) {
        match msg {
            ActorMessage::GetUniqueId { respond_to } => {
                self.next_id += 1;
                let _ = respond_to.send(self.next_id);
            }
        }
    }
}

async fn run_my_actor(mut actor: MyActor) {
    while let Some(msg) = actor.receiver.recv().await {
        actor.handle_message(msg);
    }
}

#[derive(Clone)]
pub struct MyActorHandle {
    sender: mpsc::Sender<ActorMessage>,
}

impl MyActorHandle {
    pub fn new() -> Self {
        let (sender, receiver) = mpsc::channel(8);
        let actor = MyActor { receiver, next_id: 0 };
        tokio::spawn(run_my_actor(actor));
        Self { sender }
    }
}
```

Two rules from the article that are easy to get wrong:

- **Spawn in the handle constructor, never inside a method the handle exposes.** `tokio::spawn` requires `'static`, so the spawned future must fully own its state — spawning per-call instead of once at construction either leaks tasks or re-creates state incorrectly.
- **No cycles of bounded channels.** If actor A holds a bounded sender to B and B holds a bounded sender to A, and both can be simultaneously blocked on a full `send().await` back to the other while processing a message, that's a deadlock by construction ([Actors with Tokio](https://ryhl.io/blog/actors-with-tokio/)).

Why this simplifies testing: state lives in exactly one place (the task), so unit tests exercise the handle's public message API rather than reasoning about interleaved access to shared memory — there is no lock to get wrong, and the actor's internal invariants can be asserted directly on `MyActor` without spawning anything at all.

### 7. Arc, interior mutability, Send + Sync

`Send`/`Sync` are unsafe, auto-derived marker traits: "a type is composed entirely of `Send` or `Sync` types" is automatically `Send`/`Sync`; a type is `!Send`/`!Sync` only if it (or something it wraps) opts out, typically via `PhantomData` or a raw pointer field ([Rustonomicon: Send and Sync](https://doc.rust-lang.org/nomicon/send-and-sync.html)).

`Rc<T>` is deliberately `!Send`/`!Sync` (its refcount isn't atomic — two threads bumping it racily corrupts the count); `Arc<T>` is the atomic-refcount equivalent and is `Send`/`Sync` when `T: Send + Sync`. `Cell`/`RefCell` are `!Sync` because they're built on `UnsafeCell`, which "enables unsynchronized shared mutable state" and is itself `!Sync` ([Rustonomicon: Send and Sync](https://doc.rust-lang.org/nomicon/send-and-sync.html)). Practical corollary: `Arc<RefCell<T>>` compiles and type-checks but is a data race waiting to happen the moment two threads touch it — the compiler doesn't stop you because `RefCell` is `Send` (transferable), just not `Sync` (shareable-by-reference); the failure only shows up as a runtime `already borrowed` panic or, worse, is masked entirely if only one thread ever mutates. The correct type for cross-thread shared mutable state is `Arc<Mutex<T>>` / `Arc<RwLock<T>>`.

`OnceLock<T>` (stable since Rust 1.70) and `LazyLock<T, F>` (stable since Rust 1.80) are the std replacements for the `lazy_static`/`once_cell` crates: `OnceLock` is a write-once cell you populate explicitly (`set`/`get_or_init`), `LazyLock` auto-initializes from a closure on first deref and behaves like `&T`. Neither poisons on panic, and both are usable in `static` position ([std::sync::OnceLock docs](https://doc.rust-lang.org/std/sync/struct.OnceLock.html)).

```rust
static CONFIG: OnceLock<Config> = OnceLock::new();
fn config() -> &'static Config {
    CONFIG.get_or_init(Config::load)
}
```

### 8. Thread-locals in async

Thread-local state (`thread_local!`) is scoped to an OS thread, not a task. On tokio's `multi_thread` runtime a task can be polled on a different worker thread after every `.await` — so a thread-local set before an await may read back stale (or another task's) data after it, or a value set at task start may simply vanish. Tokio's discussion of this migration ties it directly to logging/tracing context getting silently mixed between requests ([tokio-rs/tokio PR #3370](https://github.com/tokio-rs/tokio/pull/3370)). The fix is `tokio::task_local!` — state scoped to the *task*, correctly following it across thread migrations — or `tokio::task::LocalSet` + `spawn_local` if you must keep `!Send` state pinned to one thread for the task's whole lifetime ([tokio::task::LocalSet docs](https://docs.rs/tokio/latest/tokio/task/struct.LocalSet.html)).

### 9. Atomics and memory ordering

The five `Ordering` variants, verbatim intent from the std docs ([std::sync::atomic::Ordering docs](https://doc.rust-lang.org/std/sync/atomic/enum.Ordering.html)):

- `Relaxed` — atomicity only, no ordering/synchronization with any other memory access. Fine for independent counters (e.g. a metrics tally) nobody uses to guard access to other data.
- `Release` (store side) — everything written before this store becomes visible to any thread that later `Acquire`-loads the same value.
- `Acquire` (load side) — if the value observed was published with `Release` (or stronger), everything after this load is ordered after that store; i.e. you now see everything the releasing thread wrote before its release.
- `AcqRel` — both, for read-modify-write ops (`fetch_add`, `compare_exchange`) that need to both publish and observe.
- `SeqCst` — `Acquire`/`Release`/`AcqRel` as applicable, plus a single total order visible identically to *every* thread across *all* `SeqCst` operations.

Practical guidance for a normal application codebase (not a lock-free-data-structure author): use `Relaxed` for simple counters/flags with no data dependency; use an `Acquire`/`Release` pair when one thread publishes a value (e.g. a pointer swap, an initialization-done flag) that another thread must safely observe; reach for `SeqCst` only when reasoning about more than one atomic location's relative order, and treat needing it at all as a signal to double check the design — most application code should not be hand-rolling atomics-based synchronization when a `Mutex`, channel, or `OnceLock` expresses the same intent more safely.

### 10. Parallelism vs concurrency: rayon and tokio

`rayon` is for CPU-bound **data parallelism** — parallel iterators, parallel sort — built on a global work-stealing thread pool sized by `available_parallelism()`-derived defaults, configurable via `ThreadPoolBuilder` ([rayon docs](https://docs.rs/rayon/latest/rayon/)).

Tokio's own guidance on mixing sync/CPU-bound work into an async program: use `spawn_blocking` for "running a small portion of synchronous code" inside an async context so it runs on tokio's dedicated blocking-thread pool rather than starving the async worker threads; the `current_thread` runtime "only operates when `block_on` is called" — spawned tasks freeze the instant `block_on` returns, so background work generally needs the `multi_thread` runtime ([tokio bridging-with-sync-code](https://tokio.rs/tokio/topics/bridging)). Tokio's docs don't cover rayon specifically, but the same principle applies: never call into rayon's `join`/parallel-iterator API directly from an async task without going through `spawn_blocking`, since a rayon call can block the calling thread until its work-stealing pool finishes.

`available_parallelism()` returns "an estimate of the default amount of parallelism a program should use," usually the logical CPU count, but is documented to over/undercount under container CPU quotas (cgroups), `ulimit` thread limits, or process affinity masks — it is a portable default, not a precise measurement, and should not be called from a hot path since "it is not cached" ([std::thread::available_parallelism docs](https://doc.rust-lang.org/std/thread/fn.available_parallelism.html)).

The deadlock case study in §12 shows the sharpest interaction between the two worlds: holding any lock while calling into a thread pool (rayon or tokio's blocking pool) is a latent deadlock if that pool's workers can ever need the same lock.

### 11. Testing concurrency: loom, shuttle, deterministic simulation

**loom** ("Concurrency permutation testing tool for Rust," maintained by the Tokio team) runs a test repeatedly, exhaustively permuting thread interleavings under the C11 memory model, using state-reduction to avoid combinatorial blowup. It requires rewriting the code under test to use loom's own `Atomic*`, `Mutex`, `thread::spawn`, etc. behind `#[cfg(loom)]`, and is invoked as:

```
RUSTFLAGS="--cfg loom" cargo test --test loom_mytest --release
```

Known gaps: `SeqCst` is modeled as `AcqRel` (can miss/false-alarm on SeqCst-specific bugs), and load-buffering is not fully explored ([tokio-rs/loom README](https://github.com/tokio-rs/loom)). Because it's exhaustive, it does not scale to whole-program tests — scope loom tests to a single lock-free data structure or small module, not an entire service.

A hand-rolled illustration of the same idea (useful for explaining loom to a reviewer) shows that naive multi-thread stress tests are unreliable: "if you reduce the number of threads and increments, chances are the test passes by luck!" — the fix is either exhaustive enumeration of small interleaving spaces or a seeded, replayable PRNG driving the scheduler so a failure can be reproduced and minimized ([matklad: Properly Testing Concurrent Data Structures](https://matklad.github.io/2024/07/05/properly-testing-concurrent-data-structures.html)).

**shuttle** (AWS Labs) takes the opposite tradeoff: randomized, seeded scheduling instead of exhaustive enumeration. "Shuttle is not sound (a passing Shuttle test does not prove the code is correct), but it scales to much larger test cases than Loom," and because scheduling is seed-driven, a failing run can be replayed deterministically to debug it ([shuttle crates.io](https://crates.io/crates/shuttle)).

**turmoil** simulates a network of async hosts on a single thread against a Tokio-like API, letting a test inject partitions, delays, and message loss deterministically to test retry/timeout/consensus logic without flaky real-network timing ([turmoil docs.rs](https://docs.rs/turmoil/latest/turmoil/)). **madsim** is a fuller deterministic-simulation Tokio-compatible runtime (network, disk, and time all simulated, PRNG-seeded) for whole-service simulation testing, distinct from turmoil's narrower host/network model ([madsim-rs/madsim](https://github.com/madsim-rs/madsim)).

For ordinary async application tests (not lock-free primitives, not distributed protocols), tokio's own time control is usually sufficient and much cheaper to reach for: `#[tokio::test(start_paused = true)]` freezes `tokio::time::Instant`, so timeouts/backoff/retry logic runs to completion instantly and deterministically instead of racing real wall-clock sleeps; time auto-advances to the next pending timer when the runtime goes idle ([tokio::time::pause docs](https://docs.rs/tokio/latest/tokio/time/fn.pause.html)). It requires the `current_thread` flavor, which is already the `#[tokio::test]` default; multi-threaded tests need `#[tokio::test(flavor = "multi_thread", worker_threads = N)]` and cannot use `start_paused` ([tokio `#[test]` docs](https://docs.rs/tokio/latest/tokio/attr.test.html)).

Miri (`cargo miri test`) catches undefined behavior (data races, out-of-bounds, use-after-free) in `unsafe` code including under real OS threads, but it is an interpreter — expect one to two orders of magnitude slowdown, and it does not explore interleavings the way loom does; it only catches UB on the interleaving that actually occurred during that run. Treat miri and loom as complementary, not substitutes: miri for soundness of `unsafe` blocks, loom for exhaustive interleaving coverage of the logic built on top.

### 12. Data race and deadlock case studies

**Rayon-inside-a-held-lock (production robot control loop).** A 100 Hz robot control loop held a `std::sync::Mutex` guarding sensor state, then — still holding the guard — called a logging function that internally dispatched work to rayon's thread pool. Rayon's workers then tried to take the *same* mutex to write log entries and blocked; the main thread was waiting on the (now-blocked) rayon call to return; classic circular wait. It took roughly 8 hours to isolate because there was no crash, just a stall that appeared ~16 seconds after a client connected and started streaming LiDAR data. Fix: extract the needed data inside a small `{ }` scope that drops the guard, then call the rayon-backed function afterward with no lock held ([UBOS: Rust Rayon Mutex Deadlock](https://ubos.tech/news/rust-rayon-mutex-deadlock-explained-preventing-robot-freeze/)). This is the same shape as "never hold a lock across `.await`," generalized: never hold a lock across *any* call that might hand control to another thread pool that could want the same lock.

**Unbounded-channel OOM (production Kafka consumer).** A Rust Kafka-consuming service was repeatedly OOM-killed as traffic grew; root cause traced to an unbounded internal queue accumulating messages faster than the downstream stage drained them, with no backpressure to slow the producer side down ([OneSignal: Fixing Memory Leaks in Rust](https://onesignal.com/blog/solving-memory-leaks-in-rust/)). The generalizable lesson: any unbounded buffer (channel, `Vec` behind a lock, log buffer) is a memory-safety bug under sustained producer/consumer imbalance, not just a performance smell — always ask "what happens if the consumer stalls for an hour" before choosing unbounded.

## Normative guidance candidates

1. **Never let a `std::sync::MutexGuard`/`RwLock` guard (std or parking_lot) span an `.await`.** Rationale: the guard is `!Send`/blocking and can deadlock the runtime even where it compiles. Verify: `cargo clippy -- -W clippy::await_holding_lock -W clippy::await_holding_invalid_type` (finds guards live across an await; also see [clippy await_holding_invalid.rs source](https://github.com/rust-lang/rust-clippy/blob/master/clippy_lints/src/await_holding_invalid.rs)); reviewer heuristic: grep for `.lock()`/`.read()`/`.write()` followed by any `.await` before the guard's closing brace.
2. **Default to `std::sync::Mutex`/`RwLock`; use `tokio::sync::Mutex` only when the critical section must genuinely cross an `.await`.** Rationale: std locks are cheaper and simpler, per [Tokio's own tutorial](https://tokio.rs/tokio/tutorial/shared-state). Verify: grep for `tokio::sync::Mutex` usages and require a comment justifying the cross-await hold; if none exists, it should be `std::sync::Mutex`.
3. **When a lock needs to be held for I/O or held-across-await coordination, prefer the actor pattern (owning task + message channel) over any mutex.** Rationale: eliminates the lock-across-await tradeoff entirely and makes the owning task independently unit-testable ([Actors with Tokio](https://ryhl.io/blog/actors-with-tokio/)). Verify: code-reading heuristic — any `Arc<Mutex<T>>` where `T` wraps a network/file handle or does `.await` work internally is a candidate to replace with an actor.
4. **`tokio::spawn` calls inside an actor implementation belong only in the handle's constructor, never inside a message-handling method.** Rationale: `spawn` requires `'static`; spawning per-call either leaks tasks or duplicates state. Verify: grep the actor module for `tokio::spawn(` — every match should be inside a `fn new(` or equivalent constructor.
5. **Never create a cycle of bounded channels between actors/tasks that can each block on a full send while handling a message.** Rationale: circular backpressure is a deadlock by construction ([Actors with Tokio](https://ryhl.io/blog/actors-with-tokio/)). Verify: code-reading heuristic — draw the actor message graph; any cycle where every edge is a bounded `mpsc::Sender` used with blocking/awaited `send()` from inside the receive loop is a defect.
6. **Never use an unbounded channel (`unbounded_channel`, `std::sync::mpsc::channel` fed without a cap check) for anything that isn't provably self-limiting.** Rationale: an unbounded queue turns any consumer stall into unbounded memory growth — a documented cause of production OOMs ([OneSignal](https://onesignal.com/blog/solving-memory-leaks-in-rust/)). Verify: `grep -rn "unbounded_channel\|mpsc::channel()" --include=*.rs` and require each hit to carry a comment justifying why bounded backpressure is inapplicable (e.g. bridging a genuinely sync callback that must never block).
7. **Never call into a thread pool (rayon, `spawn_blocking`, or any other pool) while holding a lock that the pool's workers might also need.** Rationale: this is a real circular-wait deadlock, not a hypothetical one ([UBOS case study](https://ubos.tech/news/rust-rayon-mutex-deadlock-explained-preventing-robot-freeze/)). Verify: code-reading heuristic — grep for `rayon::` or `spawn_blocking` calls and check no enclosing `{ }` scope still holds a `MutexGuard`/`RwLock` guard at that point.
8. **Never put shared mutable state behind `Arc<RefCell<T>>`/`Arc<Cell<T>>`; use `Arc<Mutex<T>>`/`Arc<RwLock<T>>` (or atomics for primitives) instead.** Rationale: `RefCell`/`Cell` are `!Sync` by design, so this either fails to compile for genuinely shared access, or — if only accessed through interior helper functions that don't literally alias across the `Arc` boundary — compiles but is fragile and easy to break into a race with the next refactor. Verify: `grep -rn "Arc<RefCell\|Arc<Cell" --include=*.rs`; any hit is a defect (should be `Arc<Mutex<..>>`/`Arc<RwLock<..>>` or an atomic type).
9. **Replace `lazy_static!`/`once_cell::sync::Lazy` with `std::sync::OnceLock`/`std::sync::LazyLock` in new code.** Rationale: std equivalents ship since 1.70/1.80 and drop an external dependency for no functional loss ([std::sync::OnceLock docs](https://doc.rust-lang.org/std/sync/struct.OnceLock.html)). Verify: `grep -rn "lazy_static!\|once_cell::sync::Lazy" --include=*.rs`.
10. **Do not rely on `thread_local!` for anything that must survive an `.await` inside a task on the multi-threaded runtime; use `tokio::task_local!` or `LocalSet` + `spawn_local` instead.** Rationale: a task can resume on a different OS thread after every await, so thread-local state can silently read stale or foreign data ([tokio-rs/tokio PR #3370](https://github.com/tokio-rs/tokio/pull/3370)). Verify: grep for `thread_local!` and confirm no usage is read/written on both sides of an `.await` inside an async fn.
11. **Prefer `Relaxed` for independent counters, `Acquire`/`Release` pairs for publish patterns, and treat any `SeqCst` usage (or any hand-rolled atomics at all) as needing a comment justifying why a `Mutex`/channel/`OnceLock` was insufficient.** Rationale: atomics are the sharpest tool in the drawer and the least reviewable; per-thread total ordering (`SeqCst`) is rarely actually needed ([std::sync::atomic::Ordering docs](https://doc.rust-lang.org/std/sync/atomic/enum.Ordering.html)). Verify: grep for `Ordering::` usages; each should have an adjacent comment stating what happens-before relationship it establishes.
12. **Size worker/thread pools from `std::thread::available_parallelism()`, never a hardcoded constant, and never call it in a hot loop.** Rationale: hardcoded thread counts misbehave across containers/CPU quotas; the call itself is uncached and not free ([std::thread::available_parallelism docs](https://doc.rust-lang.org/std/thread/fn.available_parallelism.html)). Verify: grep for `ThreadPoolBuilder::new()\.num_threads\(` and for literal integer thread-count constants; each should trace back to a single `available_parallelism()` call made once at startup.
13. **Give every lock-free / hand-synchronized data structure (custom atomics, custom lock, unsafe `Send`/`Sync` impl) a `loom`-gated test module, run in CI under `RUSTFLAGS="--cfg loom"`.** Rationale: stress-testing with real threads is not reproducible and cannot prove absence of a race; loom exhaustively checks small interleaving spaces ([tokio-rs/loom README](https://github.com/tokio-rs/loom)). Verify: `grep -rn "unsafe impl.*Send\|unsafe impl.*Sync" --include=*.rs` — every hit should have a corresponding `#[cfg(loom)]` test module, or a comment explaining why loom doesn't apply.
14. **Any test asserting timeout, retry, or backoff behavior must use `#[tokio::test(start_paused = true)]` with `tokio::time::advance`, not a real `sleep`/`Duration` wait.** Rationale: real-time sleeps in tests are slow and flaky under CI load; paused time makes them instant and deterministic ([tokio::time::pause docs](https://docs.rs/tokio/latest/tokio/time/fn.pause.html)). Verify: grep test files for `tokio::time::sleep(Duration::from_millis` / `from_secs` used for waiting-for-effect (not as the thing under test) without `start_paused = true` on the enclosing `#[tokio::test]`.
15. **Never call a CPU-bound or rayon-backed function directly from inside an `async fn` without `tokio::task::spawn_blocking`.** Rationale: it blocks the calling tokio worker thread and starves every other task scheduled on it ([tokio bridging-with-sync-code](https://tokio.rs/tokio/topics/bridging)). Verify: grep async functions for `rayon::` calls or any function known to be CPU-bound (e.g. hashing, compression, tarball extraction — all relevant to this codebase's OCI/tarball work) that isn't wrapped in `spawn_blocking`.

## AI-agent angle

- **Hallucinated poisoning behavior.** Models frequently assume `tokio::sync::Mutex`/`parking_lot::Mutex` poison on panic the same way `std::sync::Mutex` does, and write `.lock().unwrap()` "just in case," or worse, reason about a panic-safety invariant that doesn't hold. Check: grep for `.lock().unwrap()` on a `tokio::sync::Mutex`/`parking_lot::Mutex` value and verify the surrounding comment/design doesn't assume poisoning as a safety net — `tokio::sync::Mutex::lock()` doesn't even return a `Result` (it can't fail), so a `.unwrap()` on it is itself a tell that the model copied std-Mutex-shaped code without checking the type.
- **Guard-across-await written as "it compiled, so it's fine."** An agent will often move code around, see it compile on a `current_thread` test runtime, and conclude a std guard held across `.await` is safe — the compiler doesn't reject `!Send` futures on `current_thread`. Check: `cargo clippy -- -W clippy::await_holding_lock -W clippy::await_holding_invalid_type` on the whole workspace, not just the crate under test with its default runtime flavor; also re-run tests under `#[tokio::test(flavor = "multi_thread")]` to force the `Send` check.
- **Actor pattern with `tokio::spawn` inside a per-call method instead of the constructor.** Because the article's exact code sample spawns in `new()`, but an agent extending the pattern for a "connect on demand" actor will often move the spawn into a lazily-called method, silently breaking the ownership model (either double-spawning or spawning a task that immediately has nothing to own). Check: grep the actor's handle `impl` block for `tokio::spawn(` outside `fn new`/`fn spawn`.
- **Reaching for `unsafe impl Send`/`unsafe impl Sync` to silence a compiler error instead of fixing the real ownership issue.** LLMs trained on Stack-Overflow-era snippets will suggest wrapping a `!Send` type in a newtype with a hand-written unsafe impl to make an error disappear, without verifying the type is actually safe to send/share. Check: grep for `unsafe impl.*Send`/`unsafe impl.*Sync`; each occurrence should have a comment justifying the safety argument, and ideally a loom or miri test — an unjustified occurrence is close to always wrong.
- **Unbounded channels chosen by default because they're the "simple" API.** `mpsc::unbounded_channel()` has no capacity argument to reason about, so an agent optimizing for "code that compiles with the fewest decisions" will pick it over the bounded `channel(n)`, especially when translating from a language/library where queues default to unbounded. Check: grep for `unbounded_channel` / any explicitly-unbounded queue type and require a written justification, per rule 6 above.
- **Outdated `lazy_static!`/`once_cell` idioms from pre-2023 training data.** Models frequently reach for `lazy_static! { static ref X: T = ...; }` or `once_cell::sync::Lazy` even in edition-2024 code where `std::sync::LazyLock`/`OnceLock` are the stable, dependency-free equivalent. Check: grep for `lazy_static!` and `once_cell::sync::Lazy`; both should be flagged for migration to std types.
- **SeqCst used reflexively "to be safe" on every atomic operation.** Models trained to avoid subtle bugs will default every atomic operation to `Ordering::SeqCst` without reasoning about what ordering is actually needed, masking a design that should have used a `Mutex` or channel instead of raw atomics at all. Check: grep for `Ordering::SeqCst`; every hit needs a comment explaining the specific cross-atomic total-order requirement, not just "safety."
- **Missing `spawn_blocking` around rayon/CPU-heavy calls inside async handlers.** An agent porting a synchronous function (e.g. tarball extraction, digest computation) into an async HTTP/CLI handler will often just add `async` to the signature and call the CPU-bound function directly, without wrapping it in `spawn_blocking`. Check: grep async fns for known CPU-bound calls (hashing, compression, `rayon::`) not wrapped in `tokio::task::spawn_blocking`.

## Contested / evolving

- **Actor pattern vs `Arc<Mutex<T>>`: no universal winner.** Ryhl's own article and its successors (e.g. "More Actors with Tokio") are explicit that actors add message-passing overhead and indirection; for small, low-contention, non-I/O state, a plain `Arc<Mutex<T>>` is still simpler and is not being deprecated by the community — the actor pattern is trending as the default for anything that owns an I/O resource or needs to survive `.await`, not as a blanket replacement for all shared state. As of 2026 this is settled guidance, not actively contested, but still frequently mis-applied in both directions.
- **parking_lot vs std sync primitives.** With std's own `Mutex`/`RwLock` having closed much of the historical performance gap (adaptive spinning, futex-based implementations landed years ago) and 1.84+ raising parking_lot's MSRV for some features, some in the community now treat parking_lot as "opt-in for measured contention hotspots" rather than a default swap-in — the tradeoff (no poisoning, extra dependency) is judged less favorably than it once was. This is a live, unresolved preference split, not a settled trend.
- **loom vs shuttle vs "just write a stress test."** There is no consensus on which projects warrant loom/shuttle investment versus simpler multi-thread stress tests with `#[test]` run under `--test-threads` and repeated iterations; the community view (per matklad's 2024 piece) is that ad hoc stress tests without a reproducible seed are close to worthless for finding *and confirming the fix of* concurrency bugs, but adoption of loom/shuttle outside data-structure-crate authors (tokio, crossbeam) remains limited as of 2026 — most application teams still rely on code review plus miri rather than model-checking their own concurrency.
- **Deterministic simulation testing (madsim/turmoil) for whole-service testing** is a fast-growing but still niche practice, concentrated in distributed-database/storage projects (RisingWave, TiKV-adjacent work) as of 2025–2026; it has not yet become mainstream guidance for typical CLI/service Rust codebases, and tooling maturity (e.g. the "libc-level seam" problem for true determinism raised by S2's mad-turmoil writeup) is still being worked out.

## Sources

| URL | What it is | Date/era | Why it was worth reading |
|---|---|---|---|
| [Actors with Tokio — ryhl.io](https://ryhl.io/blog/actors-with-tokio/) | Blog, primary reference for the Rust actor pattern (author is a Tokio maintainer) | 2021, still canonical 2026 | Defines the handle/task split, spawn-in-constructor rule, and bounded-channel-cycle deadlock warning used throughout §6 |
| [Tokio shared-state tutorial](https://tokio.rs/tokio/tutorial/shared-state) | Official docs (tutorial) | current (tokio 1.x) | Primary source for std-vs-tokio-Mutex guidance and the guard-across-await rule |
| [tokio::sync::Mutex — docs.rs](https://docs.rs/tokio/latest/tokio/sync/struct.Mutex.html) | Official crate API docs | current (tokio 1.x) | Verbatim poisoning behavior and "virtually never correct" wording on holding std guards across await |
| [parking_lot README — GitHub](https://github.com/Amanieu/parking_lot) | Official crate README/source | current (parking_lot 0.12.x, MSRV notes to 1.84) | Primary source for size/perf numbers, eventual-fairness mechanism, feature flags |
| [tokio-rs/loom README — GitHub](https://github.com/tokio-rs/loom) | Official crate README/source, maintained by Tokio team | current (loom 0.7.x) | Primary source for how loom works, its C11-model limitations, and the RUSTFLAGS invocation |
| [std::sync::RwLock — doc.rust-lang.org](https://doc.rust-lang.org/std/sync/struct.RwLock.html) | Official std API docs | current (stable Rust) | Primary source for the no-fairness-guarantee wording and write-only poisoning rule |
| [std::sync::atomic::Ordering — doc.rust-lang.org](https://doc.rust-lang.org/std/sync/atomic/enum.Ordering.html) | Official std API docs | current (stable Rust) | Primary source for the exact definitions of each memory ordering variant |
| [tokio::sync::mpsc — docs.rs](https://docs.rs/tokio/latest/tokio/sync/mpsc/index.html) | Official crate API docs | current (tokio 1.x) | Primary source for bounded backpressure semantics and sender/receiver closing rules |
| [tokio::task::spawn — docs.rs](https://docs.rs/tokio/latest/tokio/task/fn.spawn.html) | Official crate API docs | current (tokio 1.x) | Primary source for the `Send + 'static` requirement on spawned futures and why |
| [shuttle — crates.io](https://crates.io/crates/shuttle) | Official crate listing, AWS Labs project | current (shuttle 0.7.x era) | Primary source distinguishing shuttle's randomized/unsound-but-scalable approach from loom's exhaustive approach |
| [madsim-rs/madsim — GitHub](https://github.com/madsim-rs/madsim) | Official project README/source | current | Primary source describing the deterministic-simulation runtime approach for whole-service testing |
| [tokio `#[test]` macro — docs.rs](https://docs.rs/tokio/latest/tokio/attr.test.html) | Official macro API docs | current (tokio 1.x) | Primary source for `flavor`, `worker_threads`, and `start_paused` options |
| [tokio::time::pause — docs.rs](https://docs.rs/tokio/latest/tokio/time/fn.pause.html) | Official crate API docs | current (tokio 1.x) | Primary source for how paused time and auto-advance work, and the current_thread requirement |
| [rayon — docs.rs](https://docs.rs/rayon/latest/rayon/) | Official crate API docs | current (rayon 1.x) | Primary source for rayon's data-parallelism scope and global-pool/ThreadPoolBuilder model |
| [crossbeam-channel — docs.rs](https://docs.rs/crossbeam-channel/latest/crossbeam_channel/) | Official crate API docs | current (crossbeam-channel 0.5.x) | Primary source for crossbeam's feature comparison against std::sync::mpsc and `select!` |
| [Send and Sync — The Rustonomicon (GitHub)](https://github.com/rust-lang/nomicon/blob/master/src/send-and-sync.md) | Official language reference book, source of truth | current | Primary source for the auto-trait mechanics and why `Rc`/`RefCell` opt out of `Sync` |
| [std::sync::OnceLock — doc.rust-lang.org](https://doc.rust-lang.org/std/sync/struct.OnceLock.html) | Official std API docs | current (stable since 1.70) | Primary source for OnceLock/LazyLock API and stabilization era, replacing lazy_static/once_cell |
| [tokio::sync::broadcast — docs.rs](https://docs.rs/tokio/latest/tokio/sync/broadcast/index.html) | Official crate API docs | current (tokio 1.x) | Primary source for capacity rounding, `RecvError::Lagged` recovery semantics |
| [std::thread::available_parallelism — doc.rust-lang.org](https://doc.rust-lang.org/std/thread/fn.available_parallelism.html) | Official std API docs | current (stable Rust) | Primary source for platform over/undercounting caveats and non-cached-call warning |
| [UBOS: Rust Rayon Mutex Deadlock case study](https://ubos.tech/news/rust-rayon-mutex-deadlock-explained-preventing-robot-freeze/) | Blog, real production incident writeup | 2025-era | Concrete, mechanistic real-world case study of lock-held-across-thread-pool-call deadlock |
| [Tokio bridging with sync code](https://tokio.rs/tokio/topics/bridging) | Official docs (topic guide) | current (tokio 1.x) | Primary source for spawn_blocking guidance and current_thread-runtime freeze caveat |
| [rust-clippy await_holding_invalid.rs source](https://github.com/rust-lang/rust-clippy/blob/master/clippy_lints/src/await_holding_invalid.rs) | Official lint implementation source | current (clippy, in-tree with rustc) | Primary source confirming exact lint mechanics/scope for `await_holding_lock` used in the verification rules |
| [OneSignal: Fixing Memory Leaks in Rust](https://onesignal.com/blog/solving-memory-leaks-in-rust/) | Engineering blog, real production incident | recent | Case study grounding the "unbounded channel = OOM" rule in an actual production failure |
| [matklad: Properly Testing Concurrent Data Structures](https://matklad.github.io/2024/07/05/properly-testing-concurrent-data-structures.html) | Blog by a well-known Rust tooling author (rust-analyzer) | 2024 | Clear first-principles explanation of why loom-style exhaustive/seeded testing beats naive stress tests |
| [turmoil — docs.rs](https://docs.rs/turmoil/latest/turmoil/) | Official crate API docs | current | Primary source for turmoil's single-thread deterministic network simulation model and API shape |

