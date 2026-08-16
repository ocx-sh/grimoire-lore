---
title: Drop Guards, Panic Strategy, and Lock Poisoning
agent: rust-state-and-resources/drop-guards
model: sonnet
date_researched: "2026-08"
sources_count: 17
scope: |
  RAII/unwind semantics that decide whether cleanup actually runs: Drop::drop's
  infallible ()-returning shape and the C-DTOR-FAIL/C-DTOR-BLOCK guidelines;
  blocking and async teardown inside Drop; panic=abort vs panic=unwind as a
  project-wide decision and its effect on every Drop guard; Mutex/RwLock/
  LazyLock poisoning policy per state category; std::thread::scope vs
  spawn+forgotten-join; field/scope drop order and reference-holding guard
  hazards. Does not cover general error-type design (see rust-error-handling)
  or process exit-code mechanics (see rust-cli-contract/exit-codes.md).
---

## Table of contents

1. [`Drop::drop` is infallible: the three mandated shapes](#1-dropdrop-is-infallible-the-three-mandated-shapes)
2. [Blocking and async teardown inside `Drop`](#2-blocking-and-async-teardown-inside-drop)
3. [Panic strategy as a project-wide failure model](#3-panic-strategy-as-a-project-wide-failure-model)
4. [Unwind safety and exception-safety levels](#4-unwind-safety-and-exception-safety-levels)
5. [Lock poisoning: `Mutex`, `RwLock`, `LazyLock`/`OnceLock`](#5-lock-poisoning-mutex-rwlock-lazylockoncelock)
6. [Poisoning policy per state category](#6-poisoning-policy-per-state-category)
7. [`std::thread::scope` vs `spawn` + forgotten `join`](#7-stdthreadscope-vs-spawn--forgotten-join)
8. [Drop order and reference-holding guard hazards](#8-drop-order-and-reference-holding-guard-hazards)

## Summary

- `Drop::drop(&mut self)` returns `()` — `?` cannot appear in its body at all; any fallible cleanup must be swallowed, logged, or performed by an explicit prior method ([Rust API Guidelines, C-DTOR-FAIL](https://rust-lang.github.io/api-guidelines/dependability.html)).
- A panic (`.unwrap()`/`.expect()`/`panic!`) inside a `Drop::drop` that runs *during an unwind already in progress* is a **double panic**, and Rust's documented response is to abort the process immediately, with no further cleanup — this is stated by both the Rustonomicon and the rust-unofficial idioms guide ([Rustonomicon: Unwinding](https://doc.rust-lang.org/nomicon/unwinding.html), [rust-unofficial: dtor-finally](https://rust-unofficial.github.io/patterns/idioms/dtor-finally.html)).
- Mandated `Drop` body shapes, in order of preference for this codebase: (1) log-and-swallow fallible cleanup, (2) an explicit `close()`/`commit()` method that `Drop` only backstops with a debug-only "you forgot to call this" bomb, (3) never a bare `.unwrap()`/`?` on the fallible path.
- `C-DTOR-FAIL`: "Destructors are executed while panicking, and in that context a failing destructor causes the program to abort" — offer a `close`-style fallible method instead, and have `Drop` log or trace errors rather than fail ([Rust API Guidelines: dependability](https://rust-lang.github.io/api-guidelines/dependability.html)).
- `C-DTOR-BLOCK`: destructors should not invoke blocking operations because it makes debugging harder — offer a separate, explicit teardown method for blocking/fallible work and let `Drop` be the non-blocking last resort ([Rust API Guidelines: dependability](https://rust-lang.github.io/api-guidelines/dependability.html)).
- `Drop::drop` cannot be `async fn` — there is no `AsyncDrop` in stable Rust — so any guard that must await something on teardown (flushing a socket, releasing an async lock) needs an explicit async `close()`/`shutdown()` method that callers `.await`, with sync `Drop` as a synchronous, non-blocking fallback only.
- If a `Drop` impl truly must block, `tokio::task::block_in_place` is the sanctioned way to do synchronous work inside an async context without starving the runtime — but it panics on a `current_thread` runtime and requires the `rt-multi-thread` feature, so it is not a safe default for `Drop` bodies that run under unknown runtime flavors ([tokio `block_in_place` docs](https://docs.rs/tokio/latest/tokio/task/fn.block_in_place.html)).
- `clippy::let_underscore_lock` catches `let _ = mutex.lock();`, which drops the guard **immediately** instead of holding it for the rest of the scope — one of the most common "lock does nothing" bugs, and one an LLM will write when it means to intentionally acquire-then-release ([clippy `let_underscore_lock` source](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/let_underscore.rs)).
- Decide `panic = "unwind"` (the default) as the project-wide profile for this CLI family, *not* `panic = "abort"`: abort skips every `Drop` on every thread, which means every temp-file guard, lock-file guard, and partial-write guard this codebase relies on for correctness stops running exactly when a panic makes cleanup most needed.
- `std::sync::Mutex`/`RwLock` poison the lock when a thread panics while holding it; `.lock().unwrap()` on a poisoned mutex re-panics, so one panicking thread anywhere the lock is touched permanently wedges every other thread that reaches the same `.unwrap()` — pick a policy per state category rather than blanket `.unwrap()` everywhere.
- Three real poisoning policies exist: (a) propagate as a fatal error (`.lock().unwrap()` / `?`) for state where corruption truly must stop the process, (b) recover via `PoisonError::into_inner()` / `.lock().unwrap_or_else(|e| e.into_inner())` for state that's safe to keep using best-effort after a panic, (c) use a non-poisoning lock (`parking_lot::Mutex`, or an atomic/channel-based design) for state where poisoning is pure overhead — pick per state category, not once for the whole codebase.
- `LazyLock` (stable since 1.80) poisons **unrecoverably** if its init closure panics — every future access panics forever, with no `into_inner` escape — while `once_cell::sync::Lazy`/`OnceCell` do **not** poison: a panicking init leaves the cell empty and the *next* access retries initialization ([`LazyLock` docs](https://doc.rust-lang.org/std/sync/struct.LazyLock.html), [`once_cell` source docs](https://raw.githubusercontent.com/matklad/once_cell/master/src/lib.rs)). This is a real behavioral difference, not just an API rename — migrating `once_cell::Lazy` statics to `std::LazyLock` silently changes panic-recovery semantics.
- `std::thread::scope` (stable 1.63) structurally closes the "forgot to join" class: threads spawned inside the scope closure are **automatically joined before `scope()` returns**, and if any joined thread panicked, `scope()` itself panics — so a leaked/never-joined background thread whose `Drop`-bearing state never got cleaned up (the classic `thread::spawn` footgun) cannot happen with scoped threads ([`std::thread::scope` docs](https://doc.rust-lang.org/std/thread/fn.scope.html)).
- Exception safety in unsafe code has a hard floor: "minimal" exception safety (no UB/memory-unsafety even mid-panic) is mandatory for `unsafe` blocks; "maximal" exception safety (program does the sensible thing) is only a *goal* for safe code, not a guarantee — a `Drop` impl that repairs a temporarily-broken invariant (the Rustonomicon's `Hole` example) is the standard technique for making an unsafe operation panic-safe ([Rustonomicon: exception safety](https://doc.rust-lang.org/nomicon/exception-safety.html)).
- Poisoning-on-panic is treated by the standard library's own docs as *advisory*, not a memory-safety mechanism: `PoisonError::into_inner()` always lets you retrieve the guard anyway — "it is safe, after all, just maybe nonsense" — which is the API's built-in escape hatch for policy (b) above ([Rustonomicon: poisoning](https://doc.rust-lang.org/nomicon/poisoning.html), [`Mutex` docs](https://doc.rust-lang.org/std/sync/struct.Mutex.html)).
- `clear_poison()` (stabilized 1.77, via the `mutex_unpoison` feature history) lets a poisoned `Mutex`/`RwLock` be explicitly marked recovered after the caller has repaired the data, which is the standard-library-native version of policy (b) without reaching for `into_inner` boilerplate every time ([`Mutex` docs](https://doc.rust-lang.org/std/sync/struct.Mutex.html), [tracking issue rust-lang/rust#96469](https://github.com/rust-lang/rust/issues/96469)).
- Field drop order is declaration order (top to bottom) for structs and last-to-first for stack locals within a scope; a guard that borrows or references a sibling field/local that drops *before* it (i.e., is declared *after* it, or created later in the same scope) is a use-after-drop hazard the compiler does not always catch for non-lifetime-tied resources like raw handles or `Arc` cycles — reviewers must check field order by hand when a `Drop` impl reaches for another field.

## Findings

### 1. `Drop::drop` is infallible: the three mandated shapes

`Drop::drop` has the signature `fn drop(&mut self)` — it returns `()`. This is a hard type-system fact, not a style choice: `?` is syntactically illegal inside it because there is no `Result` return type to propagate into. An LLM asked to "clean up on drop and handle errors" will frequently write:

```rust
// WRONG — does not compile: `?` requires the enclosing fn to return Result/Option.
impl Drop for TempFileGuard {
    fn drop(&mut self) {
        std::fs::remove_file(&self.path)?; // error[E0277]
    }
}
```

The Rust API Guidelines' dependability section names this exact failure mode as **C-DTOR-FAIL**: "Destructors are executed while panicking, and in that context a failing destructor causes the program to abort." Its prescribed fix is a `close`-style method that returns `Result` for callers who want to observe failure, with `Drop` itself never failing — log or trace instead ([Rust API Guidelines: dependability](https://rust-lang.github.io/api-guidelines/dependability.html)).

Three shapes satisfy this, in order of preference for this codebase:

**Shape 1 — log-and-swallow** (default for cleanup nobody is expected to explicitly finalize, e.g. best-effort temp-file removal):

```rust
impl Drop for TempFileGuard {
    fn drop(&mut self) {
        if let Err(e) = std::fs::remove_file(&self.path) {
            tracing::warn!(path = %self.path.display(), error = %e, "failed to remove temp file on drop");
        }
    }
}
```

**Shape 2 — explicit `close()`/`commit()` that `Drop` only backstops** (for state where the caller *should* observe failure, e.g. a partial-write guard finalizing to a real destination):

```rust
pub struct AtomicWriteGuard { /* .. */ closed: bool }

impl AtomicWriteGuard {
    pub fn commit(mut self) -> std::io::Result<()> {
        self.closed = true;
        self.finish_rename() // real fallible work, caller sees the Result
    }
}

impl Drop for AtomicWriteGuard {
    fn drop(&mut self) {
        if !self.closed {
            // backstop only: best-effort cleanup of the abandoned temp file,
            // never the primary path — caller who wants success must call commit().
            let _ = std::fs::remove_file(&self.tmp_path);
        }
    }
}
```

**Shape 3 — the debug-only "bomb"** for state where forgetting to explicitly finalize is itself a programmer error worth catching in tests/dev builds but not worth crashing production over:

```rust
impl Drop for MustExplicitlyClose {
    fn drop(&mut self) {
        if !self.closed && !std::thread::panicking() {
            debug_assert!(false, "MustExplicitlyClose dropped without close()/commit() — this is a bug");
        }
    }
}
```

The `!std::thread::panicking()` guard matters: without it, the bomb fires *during* an unwind caused by an unrelated panic, turning one failure into a double panic and an abort (see next bullet). This mirrors the "unused `Result` bomb" pattern from the wider Rust ecosystem (e.g. `anyhow`'s guidance and `must_use` patterns) applied to `Drop`.

Never write shape 4:

```rust
// WRONG — the mandated anti-pattern this task is asking us to ban.
impl Drop for LockFileGuard {
    fn drop(&mut self) {
        std::fs::remove_file(&self.path).unwrap(); // panics if remove fails
    }
}
```

If this `drop` runs during normal (non-panicking) scope exit, the `.unwrap()` panic starts a fresh unwind — survivable, but still poor: cleanup failure now looks identical to a program bug to whoever reads the panic message. If it runs *while the thread is already unwinding* from an earlier panic, the process aborts immediately (Rustonomicon and rust-unofficial idioms both state this plainly: "If a destructor panics while unwinding, there is no good action to take, so Rust aborts the thread immediately" — [rust-unofficial: Finalisation in Destructors](https://rust-unofficial.github.io/patterns/idioms/dtor-finally.html), [Rustonomicon: Unwinding](https://doc.rust-lang.org/nomicon/unwinding.html)).

`C-DTOR-BLOCK` is the companion rule: "Destructors should not invoke blocking operations, which can make debugging much more difficult" — the guidelines again recommend a separate, explicit teardown method for anything blocking, leaving `Drop` itself fast and non-blocking ([Rust API Guidelines: dependability](https://rust-lang.github.io/api-guidelines/dependability.html)). See §2 for the async-specific version of this.

### 2. Blocking and async teardown inside `Drop`

`Drop::drop` cannot be `async fn` — Rust has no stable `AsyncDrop` trait as of 2026. This forces a structural choice for any guard whose real cleanup is asynchronous (releasing a distributed lock over HTTP, flushing a buffered async writer, closing a database connection pool handle):

- **The sanctioned pattern**: an explicit async `close()`/`shutdown()` method that the owner calls and `.await`s before the guard's scope ends, with `Drop` reduced to a synchronous, best-effort, non-blocking fallback (log a warning that explicit shutdown was skipped, at most).
- **A shutdown handle**: hand out a separate `ShutdownHandle` (or a `tokio::sync::oneshot`/`watch` channel) that a background task holds; the guard's synchronous `Drop` sends a non-blocking signal down the channel rather than doing the work itself, and a supervisor task performs the actual async teardown.
- **`tokio::task::block_in_place`**: when a `Drop` genuinely must run blocking work under an async runtime (e.g. a synchronous `Handle::block_on` call to await async cleanup), `block_in_place` tells the multi-thread executor to hand off other work to a new worker thread first — but it **panics if called from a `current_thread` runtime** and requires the `rt-multi-thread` Cargo feature, and "any other code running concurrently in the same task will be suspended during the call" ([tokio `block_in_place` docs](https://docs.rs/tokio/latest/tokio/task/fn.block_in_place.html)). This makes it unsafe to bury inside a library-level `Drop` impl whose caller's runtime flavor you don't control — reserve it for binary-level (application) code that knows its own runtime configuration, never for a reusable guard type shipped to other crates.

Two clippy lints police the sync-lock-in-async-context version of this hazard:

- **`clippy::significant_drop_in_scrutinee`** — fires when a lock guard (or other "significant drop" type) is held as the temporary scrutinee of a `match`/`if let`, keeping the lock alive for the entire match arm body instead of releasing it immediately after the value is extracted. In async code this is the classic way a `.await` point ends up executing while a synchronous lock is still held, which can deadlock the executor or block other tasks on that thread.
- **`clippy::let_underscore_lock`** — fires on `let _ = mutex.lock();`, which **immediately drops** the guard instead of holding it, "which is often not intended"; the fix is `let _lock = mutex.lock();` (leading underscore, not bare `_`) or an explicit `std::mem::drop` to make the immediate-release intent visible ([clippy `let_underscore_lock` source](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/let_underscore.rs)). This is a `correctness`-severity lint (on by default), introduced in clippy 1.43.0 — an LLM writing `let _ = ...` out of habit to silence an unused-`Result`/must-use warning on a lock call will trip this and silently release a lock it meant to hold.

### 3. Panic strategy as a project-wide failure model

`panic = "abort"` in `Cargo.toml`'s profile section replaces stack unwinding with immediate process termination on any panic. The consequence for a codebase built on RAII guards is total: **abort skips unwinding, and unwinding is the only mechanism that runs `Drop` on a panic path** — the Rustonomicon states unwinding exists precisely because "if a task's destructors weren't called, it would cause memory and other system resources to leak" ([Rustonomicon: Unwinding](https://doc.rust-lang.org/nomicon/unwinding.html)). With `panic = "abort"`:

- Temp-file guards never remove their temp files.
- Lock-file guards (advisory filesystem locks used to prevent concurrent-instance corruption) never release their locks — the next invocation of the tool sees a stale lock.
- Partial-write guards (the "write to `.tmp`, `Drop` cleans up if not committed" pattern from §1 Shape 2) never clean up; a crashed run leaves a `.tmp` file next to the real one forever.
- Every debug-only bomb (§1 Shape 3) never fires, so a class of forgotten-`commit()` bugs stops being catchable via panics in dev/test builds too — abort doesn't distinguish debug from release.

**Decision for this codebase: keep `panic = "unwind"` (the Cargo default) project-wide; do not set `panic = "abort"`.** A CLI package manager whose correctness model leans on Drop guards for cache/lockfile/partial-write cleanup cannot afford to lose that mechanism for a modest binary-size/performance win. The corrode.dev "Hardening Rust Code For Production" piece argues the opposite for a different profile of program — it recommends `panic = "abort"` specifically for FFI-boundary safety (unwinding across an FFI boundary from Rust into non-Rust code, or vice versa, is UB) and for eliminating unwind-table binary-size/performance overhead ([corrode.dev: Hardening Rust Code For Production](https://corrode.dev/blog/hardening-rust/)). That tradeoff does not apply here: this project's target surface is a self-contained CLI executing downloaded tools as subprocesses, not embedding Rust as a library under a C ABI, so the FFI-UB argument for abort doesn't bite, while the cleanup-loss argument against it does.

If a future subcomponent (e.g. an FFI-linked archive-extraction library) does need `panic = "abort"` locally, note it cannot be set per-crate for a binary — it's a whole-binary profile setting — so that decision would force the same choice onto every Drop guard in this repository, including the ones the guidance above depends on. Treat any proposal to add `panic = "abort"` to the workspace `Cargo.toml` as requiring an explicit audit of every `impl Drop` in the dependency graph, not a routine profile tweak.

**What a panic hook can and cannot recover, if abort is ever chosen anyway:** `std::panic::set_hook` registers a callback invoked "when a thread panics, but before the panic runtime is invoked" and — critically — **runs under both `panic=abort` and `panic=unwind`** ([`std::panic::set_hook` docs](https://doc.rust-lang.org/std/panic/fn.set_hook.html)). This means a hook *can* still log the panic message/location and even attempt best-effort cleanup (e.g. `std::fs::remove_file` on a known temp path) even under abort, because it runs before the abort happens — but corrode.dev's hardening piece warns hooks execute "in a compromised environment": "one of the subsystems you want to interact with might be the *cause* of the panic you're handling," so hook-based cleanup must itself avoid panicking, blocking indefinitely, or depending on the subsystem that just failed ([corrode.dev: Hardening Rust Code For Production](https://corrode.dev/blog/hardening-rust/)). A panic hook is a global, single, cross-cutting escape valve — it can log and attempt one shot at cleanup, but it cannot replace per-guard `Drop` logic, because it has no access to the guards' actual state (paths, handles) unless that state is separately threaded into hook-reachable global storage.

**Interaction with exit code 101**: this project's exit-code research already establishes that Rust panics exit with the fixed code **101** regardless of `main`'s `Termination` impl, and recommends this as a deliberate signal CI/reviewers can use to distinguish "crashed" from "cleanly reported failure" (see [`rust-cli-contract/exit-codes.md` §4](../rust-cli-contract/exit-codes.md)). That contract is unaffected by the unwind-vs-abort choice — 101 fires either way — but the *cleanup that happened before* that 101 is emitted differs completely: under unwind, every guard between the panic site and `main` ran its `Drop`; under abort, none did. Treat "exit code 101 was observed" as meaning different things operationally depending on which panic strategy is configured, and document the chosen strategy next to the exit-code contract so a reviewer doesn't assume Drop-based cleanup happened just because the process reported 101.

### 4. Unwind safety and exception-safety levels

The Rustonomicon defines two tiers, and only one is a hard requirement:

- **Minimal exception safety** (mandatory in `unsafe` code): "we *must* be exception safe to the point of not violating memory safety." A panic mid-operation must never leave memory in an undefined state, even if the higher-level operation is left logically incomplete.
- **Maximal exception safety** (a goal, not a guarantee, in safe code): "it is *good* to be exception safe to the point of your program doing the right thing" — but this is aspirational, not something the compiler enforces ([Rustonomicon: Exception Safety](https://doc.rust-lang.org/nomicon/exception-safety.html)).

The canonical worked example is `Vec::push_all`, where writing elements into pre-reserved-but-uninitialized capacity via `unsafe { end_ptr.add(i).write(x.clone()) }` is unsound if `Clone::clone` panics partway through: "If it does, our function will exit early with the length of the Vec set too large... uninitialized memory will be read!" The general fix pattern the Nomicon shows (`BinaryHeap`'s `Hole` guard) is exactly the RAII-guard idiom: a small `Drop` impl whose only job is to repair a temporarily-broken invariant unconditionally, panic or not — "Hole will be unconditionally filled here; panic or not!" ([Rustonomicon: Exception Safety](https://doc.rust-lang.org/nomicon/exception-safety.html)). This is the direct justification for why RAII guards are the standard tool for panic-safety in unsafe code, not just a style preference: a guard's `Drop` is the *only* code Rust guarantees will run on an early, panicking exit from an unsafe block that has left invariants temporarily broken.

### 5. Lock poisoning: `Mutex`, `RwLock`, `LazyLock`/`OnceLock`

**Mechanism.** `std::sync::Mutex` "will poison itself if one of its `MutexGuard`s... is dropped during a panic" — the poisoning is a deliberate safety-guard, not a memory-safety mechanism: "Mutex poisons not for true safety in the sense that Rust normally cares about. It poisons as a safety-guard against blindly using the data that comes out of a Mutex that has witnessed a panic while locked" ([Rustonomicon: Poisoning](https://doc.rust-lang.org/nomicon/poisoning.html)). Every lock-acquiring method (`lock()`, `try_lock()`) returns a `Result` (`LockResult<T>`), and once poisoned "all other threads are unable to access the data by default" until they explicitly opt in via `PoisonError::into_inner()` ([`Mutex` docs](https://doc.rust-lang.org/std/sync/struct.Mutex.html)).

**Poisoning is best-effort, not guaranteed.** The std docs explicitly warn "the panic detection is not ideal, so even unpoisoned mutexes need to be handled with care, since certain panics may have been skipped" — cases include a panic inside `Drop` or a panic hook while the mutex is held, double panics, or panics crossing an FFI boundary ([`Mutex` docs](https://doc.rust-lang.org/std/sync/struct.Mutex.html)). Do not treat "the mutex isn't poisoned" as proof the data is definitely consistent.

**`RwLock` poisons asymmetrically**: only a panic while holding the **write** lock poisons it; "If a panic occurs in any reader, then the lock will not be poisoned" ([`RwLock` docs](https://doc.rust-lang.org/std/sync/struct.RwLock.html)). Both `read()` and `write()` return `LockResult`, and the poisoned-error variant still carries the acquired guard for recovery, same as `Mutex`.

**`LazyLock`/`OnceLock` poison differently from `once_cell`.** `std::sync::LazyLock` (stabilized 1.80) poisons if its init closure panics, and that poisoning is **unrecoverable** — "poisoning in `LazyLock` is *unrecoverable*. All future accesses of the lock from other threads will panic, whereas a type in `std::sync::poison` like `std::sync::poison::Mutex` allows recovery via `PoisonError::into_inner()`" ([`LazyLock` docs](https://doc.rust-lang.org/std/sync/struct.LazyLock.html)). By contrast, `once_cell::sync::Lazy` / `once_cell::sync::OnceCell` do **not** poison at all: "If `f` panics, the panic is propagated to the caller, and the cell remains uninitialized" — meaning the *next* access simply retries initialization from scratch ([`once_cell` source, `lib.rs` doc comments](https://raw.githubusercontent.com/matklad/once_cell/master/src/lib.rs)). This is a real, easy-to-miss migration hazard: swapping `once_cell::sync::Lazy<T>` for `std::sync::LazyLock<T>` (a very natural "drop the dependency, use std" refactor now that it's stable) silently turns "transient init failure, retry next time" into "one panic permanently bricks this static for the rest of the process's life."

**Recovery API**: `clear_poison()` (`Mutex`/`RwLock`, stabilized 1.77 via the `mutex_unpoison` feature) explicitly marks a poisoned lock as recovered after the caller has repaired the underlying data:

```rust
let guard = lock.write().unwrap_or_else(|mut e| {
    **e.get_mut() = repaired_value;
    lock.clear_poison();
    e.into_inner()
});
```
([`Mutex` docs](https://doc.rust-lang.org/std/sync/struct.Mutex.html); the tracking issue shows the feature's public API surface: [rust-lang/rust#96469](https://github.com/rust-lang/rust/issues/96469).)

### 6. Poisoning policy per state category

Three real policies exist; pick per state category rather than reflexively `.unwrap()`-ing every lock call:

| Policy | When | Code shape |
|---|---|---|
| **(a) Propagate as fatal** | State whose corruption genuinely must stop the process — e.g. an in-memory index whose invariants a partial write could violate in a way that would corrupt subsequent on-disk writes if used. | `let guard = state.lock().unwrap();` — deliberate, not lazy; the panic-on-panic is the intended fail-fast behavior. Document *why* at the call site. |
| **(b) Recover via `into_inner`/`clear_poison`** | State that's safe to keep using best-effort after a panic — e.g. an in-memory metrics counter, a progress-reporting cache, anything where "possibly slightly stale/inconsistent" beats "wedge the whole process." | `state.lock().unwrap_or_else(|e| e.into_inner())`, optionally followed by `state_lock.clear_poison()` once repaired. |
| **(c) Non-poisoning lock** | Hot-path state where poisoning is pure overhead and the invariant is either trivially re-derivable or protected some other way (atomics, a channel-based single-writer design) — e.g. a request counter, a cache eviction clock. | `parking_lot::Mutex<T>` (no poisoning by design) or restructure to `std::sync::atomic::*` / message-passing so no lock exists to poison. |

For OCX/Grimoire specifically: registry-credential caches and lockfile in-memory mirrors belong in (a) — a panic while holding either strongly suggests the on-disk state is now suspect, and continuing silently risks writing a corrupt lockfile; download-progress/telemetry counters belong in (b) or (c); anything genuinely hot-path and single-purpose (an atomic byte counter) belongs in (c) and shouldn't be a `Mutex` at all.

### 7. `std::thread::scope` vs `spawn` + forgotten `join`

`thread::spawn`'s `JoinHandle` is inert if dropped without calling `.join()` — the spawned thread keeps running detached, and any `Drop`-bearing state it owned when it eventually finishes (or panics) is cleaned up on the *spawned* thread's schedule, not the parent's, which is silently wrong for code assuming "when this function returns, all its resources are cleaned up." corrode.dev's sharp-edges piece calls this out directly: "forgetting to *join* a thread can have some unexpected side effects" — specifically that "cleanup tasks (such as flushing caches or closing files) might not get executed" if the parent scope moves on before the detached thread's guards drop ([corrode.dev: Sharp Edges In The Rust Standard Library](https://corrode.dev/blog/sharp-edges-in-rust-std/)).

`std::thread::scope` (stable since 1.63) closes this class **structurally**, not by discipline/review: "All threads spawned within the scope that haven't been manually joined will be automatically joined before this function returns," and additionally, borrowing non-`'static` local data becomes sound because the scope guarantees the borrow can't outlive its threads ([`std::thread::scope` docs](https://doc.rust-lang.org/std/thread/fn.scope.html)). Panics propagate too: "If any of the automatically joined threads panicked, this function will panic" — so a scoped-thread panic can't be silently swallowed the way a detached, never-joined `spawn`'s panic can (a panic in a detached thread just terminates that thread; nothing observes it unless the caller explicitly joins). Prefer `thread::scope` over raw `thread::spawn` for any parallel work whose lifetime is meant to be bounded by the enclosing function — which, for a CLI doing e.g. parallel layer downloads bounded by a single `install` command's execution, is nearly all of this project's thread usage.

### 8. Drop order and reference-holding guard hazards

Two ordering rules govern when destructors run, and both are exploitable footguns when a guard's cleanup logic depends on a sibling that drops around the same time:

- **Struct fields drop in declaration order** (top field first, bottom field last). A guard placed as an *earlier* field than the resource it depends on will have its `Drop` run *before* that resource is gone — safe. Reverse the order (guard declared after/below the resource it needs) and the resource is already dropped by the time the guard's `Drop` runs, which is a use-after-drop for anything not statically borrow-checked (raw handles, `Weak` upgrades that now fail, non-lifetime-tracked resource IDs).
- **Local variables in a scope drop in reverse declaration order** (last-declared, first-dropped) — the opposite of struct fields. `mem::drop(x)` triggers `x`'s destructor immediately at that point in the code, not at scope end; this is the standard way to force early release of a lock guard or file handle without waiting for the enclosing block to close, and is preferable to wrapping the guard in an inner `{ }` block purely to control its lifetime when the intent should be explicit.

The concrete hazard for this codebase: a guard type that holds, say, an `Arc<Mutex<Cache>>` alongside a raw `File` handle for the same resource, where the `Drop` impl for the guard tries to flush the file *through* the cache — if the cache's own guard/lock was already released or the `Arc`'s last strong reference already dropped in a sibling field ordered earlier, the flush either panics or silently no-ops depending on how it's written. The mechanical defense is: when reviewing any `impl Drop` that reaches into `self.some_other_field` to do its cleanup, check that field's declaration position is *after* (drops-before) the field doing the reaching, and if the `Drop` impl needs to reach *outside* `self` (a shared `Arc`), verify by reading — not assuming — that the referenced resource's own lifetime provably outlives every `Drop` that could touch it, since the borrow checker does not track this across `Drop` impls except through ordinary lifetimes.

## Normative guidance candidates

1. **`Drop::drop` bodies must never call `.unwrap()`, `.expect()`, `panic!`, or use `?` on a fallible operation.** Rationale: `?` doesn't compile there anyway (no `Result` to return into), and `.unwrap()`/`panic!` risks a double-panic abort if `drop` runs mid-unwind (§1). VERIFICATION: `grep -rn -A5 'impl Drop for' --include='*.rs' | grep -E '\.unwrap\(\)|\.expect\(|panic!|proc_macro2::.*\?'` across every `impl Drop` body; also `rg -U 'impl Drop for \w+ \{[^}]*\?' --include='*.rs'` to catch `?` usage inside the block (won't compile, but worth catching in draft/generated code before it's fixed by deletion rather than restructuring).
2. **Fallible cleanup in `Drop` must use one of: log-and-swallow, a `close()`/`commit()` method that `Drop` only backstops, or a `debug_assert!`/`debug_assert_eq!` "bomb" guarded by `!std::thread::panicking()`.** Rationale: satisfies `C-DTOR-FAIL` while still surfacing forgotten-finalization bugs in dev/test builds (§1). VERIFICATION: reading heuristic — every `impl Drop` either (a) contains a `tracing::warn!`/`log::warn!`/`eprintln!` on its fallible path, (b) has a paired `pub fn close(self) -> Result<...>` / `pub fn commit(self) -> Result<...>` on the same type, or (c) is a `debug_assert!` gated by `std::thread::panicking()`.
3. **Do not set `panic = "abort"` anywhere in the workspace `Cargo.toml`.** Rationale: this project's Drop-guard-based cleanup (temp files, lock files, partial-write guards) depends entirely on unwinding running; abort silently disables all of it, project-wide, with no per-crate opt-out (§3). VERIFICATION: `grep -n 'panic\s*=\s*"abort"' Cargo.toml **/Cargo.toml` — any hit requires an explicit ADR-level justification, not a routine profile edit.
4. **Never call `std::process::exit` or otherwise skip `main`'s normal return path after any `Drop`-bearing guard has been constructed.** Rationale: `exit()` skips destructors identically to `panic=abort`, just locally instead of project-wide — see the sibling exit-codes research for the primary rule and grep (already covered in [`rust-cli-contract/exit-codes.md`](../rust-cli-contract/exit-codes.md) rule 1); repeated here because it's the same underlying hazard as rule 3, just triggered by a function call instead of a build profile.
5. **Pick a poisoning policy explicitly per `Mutex`/`RwLock`-guarded state category (propagate / recover / non-poisoning) and document the choice at the `Mutex::new(...)` call site as a one-line comment.** Rationale: blanket `.lock().unwrap()` conflates "this corruption must halt the process" with "this is fine to keep using" — one panicking thread anywhere shouldn't be able to wedge state that was never actually corrupted (§5, §6). VERIFICATION: `grep -rn '\.lock()\.unwrap()\|\.write()\.unwrap()\|\.read()\.unwrap()' --include='*.rs'` — every hit must have an adjacent comment naming the policy (`// poison-policy: fatal` / `// poison-policy: recover` / etc.), or be flagged for review.
6. **Prefer `parking_lot::Mutex`/`RwLock` (already a likely transitive dependency in an HTTP/OCI-client-heavy crate graph) for hot-path or "poisoning is pure overhead" state, rather than reaching for `std::sync::Mutex` by default everywhere.** Rationale: `parking_lot` locks don't poison, are smaller, and are faster — appropriate specifically for policy-(c) state (§6). VERIFICATION: reading heuristic during design review — new `Mutex`/`RwLock` additions should state which of the three policies (§6) applies before picking the type; `std::sync::Mutex` is the default only for policy (a)/(b).
7. **Never migrate `once_cell::sync::Lazy`/`OnceCell` to `std::sync::LazyLock`/`OnceLock` without re-auditing panic behavior at the init site.** Rationale: `once_cell` retries a panicked init on next access; `std::LazyLock`/`OnceLock` poison permanently on init panic — an otherwise-mechanical "drop the dependency" refactor silently changes recoverability (§5). VERIFICATION: `grep -rn 'once_cell::sync::\(Lazy\|OnceCell\)' --include='*.rs'` before any migration PR; for each hit, confirm the init closure is provably infallible (no I/O, no parsing) before switching to std, or keep `once_cell` deliberately.
8. **Any `Drop` impl that performs I/O, acquires a lock, or otherwise could block must be justified against `C-DTOR-BLOCK`; prefer an explicit async/blocking teardown method the caller invokes before the guard's scope ends.** Rationale: blocking in `Drop` is invisible at call sites, makes debugging hangs much harder, and cannot be `.await`ed since `Drop` isn't async (§2). VERIFICATION: `grep -rn -A10 'impl Drop for' --include='*.rs' | grep -E '\.lock\(\)|std::fs::|reqwest::|block_on|block_in_place'` — flag every hit for review; acceptable only if the blocking call is provably fast/local (e.g. removing a small temp file) and documented as such.
9. **Run `cargo clippy` with `let_underscore_lock` and `significant_drop_in_scrutinee` enabled (both are in clippy's default/`correctness`+`nursery` sets — confirm neither is `#[allow]`-suppressed project-wide).** Rationale: these two lints catch, respectively, an accidentally-immediately-released lock and a lock held too long across a `match`/`if let` — both silent, compiling-but-wrong bugs (§2). VERIFICATION: `cargo clippy -- -W clippy::let_underscore_lock -W clippy::significant_drop_in_scrutinee 2>&1 | grep -c warning`; also `grep -rn 'allow(clippy::let_underscore_lock\|allow(clippy::significant_drop_in_scrutinee' --include='*.rs'` should return nothing outside a justified, commented exception.
10. **Prefer `std::thread::scope` over `std::thread::spawn` for any parallel work whose lifetime is bounded by the enclosing function.** Rationale: scoped threads make "forgot to join" structurally impossible instead of relying on code review to catch a dropped `JoinHandle` (§7). VERIFICATION: `grep -rn 'thread::spawn' --include='*.rs'` — every hit should either escape the enclosing function deliberately (a genuine background/daemon thread, rare in a CLI) or be flagged to convert to `thread::scope`.
11. **When reviewing an `impl Drop` that accesses `self.other_field` or an external `Arc`/`Weak`, verify field declaration order (or external lifetime) proves the accessed resource outlives this guard's drop.** Rationale: struct fields drop in declaration order top-to-bottom; a guard declared before the resource it depends on will run its cleanup against already-dropped state, and the compiler does not catch this for non-lifetime-tracked resources (§8). VERIFICATION: reading heuristic — for every `impl Drop` body referencing `self.<other_field>`, check that `<other_field>` is declared *after* the guard field in the struct definition (drops after / still alive); no automated grep captures this, it requires manual struct-definition inspection.

## AI-agent angle

- **Writing `?` or `.unwrap()` inside `Drop::drop` when asked for "robust cleanup that handles errors."** An LLM trained on ordinary fallible-function idioms defaults to `?`/`.unwrap()` reflexively; inside `Drop` the former doesn't compile and the latter risks a double-panic abort. Smallest check: `cargo build` catches the `?` case immediately (compile error); the `.unwrap()`/`panic!` case needs the grep in rule 1 since it compiles fine and only fails at runtime, and only during an unwind.
- **Adding `panic = "abort"` to `Cargo.toml` because a search engine/LLM summary calls it "faster" or "smaller binaries," without connecting it to Drop-based cleanup loss.** This is a real, popular piece of generic Rust advice (see corrode.dev's own recommendation, §3) that is actively wrong for a Drop-guard-heavy codebase. Smallest check: `grep -n 'panic = "abort"' Cargo.toml` as a required manual gate before merge — this single line should never land without an explicit sign-off, per rule 3.
- **Blanket `.lock().unwrap()` on every `Mutex`/`RwLock` access, including state where recovery would be trivially safe.** LLMs treat `.lock().unwrap()` as the canonical/only way to use a `Mutex`, because it's what nearly every tutorial and doc example shows for brevity — they rarely reach for `into_inner()`/`clear_poison()` unless explicitly prompted. Smallest check: the grep in rule 5 plus a manual pass asking "does this state need to halt the process on corruption, or would stale-but-usable be fine?" for each hit.
- **Migrating `once_cell::Lazy` to `std::LazyLock` as a "modernize to std" cleanup pass and treating it as behavior-preserving.** It compiles and passes the happy-path tests; the divergence (permanent poisoning vs. retry-on-next-access) only shows up when the init closure can actually panic (e.g. it does fallible I/O/parsing), which is exactly the case most likely to be missed in a quick refactor PR. Smallest check: rule 7's grep before any such migration; treat any `once_cell::Lazy<T>` whose init closure contains `?`, `.unwrap()`, `.expect()`, I/O, or parsing as a "do not migrate without review" case.
- **`thread::spawn` + storing the `JoinHandle` in a field that's never explicitly `.join()`-ed, assuming "it'll get cleaned up."** An LLM asked to "run this in the background" reaches for `thread::spawn` because it's the more commonly seen API in training data, over the more targeted `thread::scope` — and then either drops the handle or stores it without a corresponding join call anywhere. Smallest check: `grep -rn 'thread::spawn' --include='*.rs'` combined with tracing each `JoinHandle` binding to a `.join()` call in the same function; unjoined handles are the bug (rule 10).
- **A generated `Drop` impl that reaches into a co-located `Arc<Mutex<T>>` field declared *before* it in struct order, assuming Rust's ownership model automatically prevents use-after-drop.** LLMs generally understand lifetimes prevent use-after-free for *borrows*, but frequently don't model that struct-field drop order (not lifetimes) governs same-struct sibling field access during `Drop`, since this specific ordering rule is a less-emphasized corner of the language. Smallest check: rule 11's manual reading pass — no grep substitutes for checking field declaration order against what a `Drop` body touches.

## Contested / evolving

- **Whether `Mutex`/`RwLock` poisoning should be opt-in rather than the default is a live, unresolved discussion in the Rust project**, not settled guidance. The standard library has already shipped `clear_poison()` (stable 1.77) specifically to make *recovering* from poisoning cheaper without a third-party crate, which is itself evidence the default's ergonomics were seen as a real pain point worth addressing incrementally — but a more fundamental "should poisoning even be the default" redesign remains an open question the tracking issue for the unpoisoning feature does not resolve (its own "unresolved questions" section was empty at closure, meaning the bigger design question was deliberately punted, not settled) ([tracking issue rust-lang/rust#96469](https://github.com/rust-lang/rust/issues/96469)). Mark this rule set (§6) as one to revisit if/when std ships a non-poisoning `Mutex` variant or changes the default — this research found no evidence such a change has landed as of August 2026, but the direction of travel (adding `clear_poison`, and `parking_lot`'s long-standing popularity specifically *because* it doesn't poison) suggests the ecosystem consensus is trending toward "poisoning should be a choice, not automatic."
- **`panic = "abort"` vs `panic = "unwind"` is genuinely context-dependent, and corrode.dev's own production-hardening guidance recommends abort as a general default** — this research deliberately disagrees with that generic recommendation for *this specific* codebase's Drop-guard-heavy design (§3), but the disagreement should be understood as a project-specific tradeoff call, not a claim that abort is wrong in general. Revisit if OCX/Grimoire's cleanup story shifts away from Drop guards toward some other mechanism (e.g. an explicit `defer`-style API, or moving cleanup out of in-process Drop entirely into a supervisor process), or if profiling shows unwind-table overhead is actually material for this binary's performance goals.
- **`AsyncDrop` remains unstable/unshipped as of 2026** — the ecosystem's workarounds (explicit async `close()`, shutdown handles, `block_in_place`) are all *because* the language hasn't solved this, not a settled final design; if/when an async-drop mechanism stabilizes, §2's guidance about explicit teardown methods should be revisited, since it may become possible to express what's currently a manual convention as a language-checked contract.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [doc.rust-lang.org/nomicon/unwinding.html](https://doc.rust-lang.org/nomicon/unwinding.html) | Official Rustonomicon chapter | current, stable-era content | Primary source for why unwinding exists, that Drop runs during it, and the "don't build for unwinding as normal control flow" guidance |
| [doc.rust-lang.org/nomicon/poisoning.html](https://doc.rust-lang.org/nomicon/poisoning.html) | Official Rustonomicon chapter | current | Primary source establishing poisoning as advisory-not-memory-safety, and that `into_inner`-style recovery is deliberately safe |
| [doc.rust-lang.org/nomicon/exception-safety.html](https://doc.rust-lang.org/nomicon/exception-safety.html) | Official Rustonomicon chapter | current | Primary source for minimal/maximal exception safety and the `Hole`-guard technique that justifies RAII guards for panic-safety |
| [doc.rust-lang.org/std/sync/struct.Mutex.html](https://doc.rust-lang.org/std/sync/struct.Mutex.html) | Official std API docs | current (includes `clear_poison`, stable 1.77) | Primary source for exact poisoning trigger conditions, `LockResult`, `into_inner`, `clear_poison` semantics and example |
| [doc.rust-lang.org/std/sync/struct.RwLock.html](https://doc.rust-lang.org/std/sync/struct.RwLock.html) | Official std API docs | current | Primary source for the write-only-poisons asymmetry that differs from `Mutex` |
| [doc.rust-lang.org/std/sync/struct.LazyLock.html](https://doc.rust-lang.org/std/sync/struct.LazyLock.html) | Official std API docs | current (stabilized 1.80) | Primary source for `LazyLock`'s unrecoverable poisoning, explicitly contrasted against `std::sync::poison::Mutex` in the same doc text |
| [doc.rust-lang.org/std/thread/fn.scope.html](https://doc.rust-lang.org/std/thread/fn.scope.html) | Official std API docs | current (stable since 1.63) | Primary source for scoped-thread auto-join guarantee and panic propagation on scope exit |
| [doc.rust-lang.org/std/panic/fn.set_hook.html](https://doc.rust-lang.org/std/panic/fn.set_hook.html) | Official std API docs | current | Primary source for panic hooks running under both abort and unwind, and their timing relative to the panic runtime |
| [rust-lang.github.io/api-guidelines/dependability.html](https://rust-lang.github.io/api-guidelines/dependability.html) | Official Rust API Guidelines, dependability section | actively maintained community-endorsed reference | Primary source for `C-DTOR-FAIL` and `C-DTOR-BLOCK`, the two normative rules this task explicitly asks to cite |
| [rust-unofficial.github.io/patterns/idioms/dtor-finally.html](https://rust-unofficial.github.io/patterns/idioms/dtor-finally.html) | rust-unofficial patterns book, "Finalisation in Destructors" idiom | community reference, actively maintained | Confirms the double-panic-aborts behavior in plain language and shows the `_exit`-naming-convention idiom |
| [rust-unofficial.github.io/patterns/patterns/behavioural/RAII.html](https://rust-unofficial.github.io/patterns/patterns/behavioural/RAII.html) | rust-unofficial patterns book, "RAII Guards" pattern | community reference, actively maintained | Canonical description of the guard-mediates-access RAII pattern this whole task is about |
| [corrode.dev/blog/hardening-rust/](https://corrode.dev/blog/hardening-rust/) | corrode.dev production-hardening blog post | 2026-07-23 | Source of the (deliberately contested here) generic `panic=abort` recommendation, plus panic-hook operational guidance and "panic semantics are part of your API" framing |
| [corrode.dev/blog/sharp-edges-in-rust-std.html](https://corrode.dev/blog/sharp-edges-in-rust-std/) | corrode.dev "Sharp Edges In The Rust Standard Library" blog post | 2025-05-21 | Concrete description of the forgotten-join/detached-thread cleanup-skip hazard that `thread::scope` structurally fixes |
| [docs.rs/tokio/latest/tokio/task/fn.block_in_place.html](https://docs.rs/tokio/latest/tokio/task/fn.block_in_place.html) | Official tokio crate docs | current tokio 1.x | Primary source for `block_in_place`'s runtime-flavor constraint and task-suspension caveat, relevant to blocking-in-Drop under async |
| [raw.githubusercontent.com/rust-lang/rust-clippy/.../let_underscore.rs](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/let_underscore.rs) | Clippy lint source (doc comments) | current clippy master | Primary source for `let_underscore_lock`'s exact detection rule, example, and severity |
| [github.com/rust-lang/rust/issues/96469](https://github.com/rust-lang/rust/issues/96469) | Rust compiler tracking issue | opened/closed in the `mutex_unpoison` stabilization window (landed 1.77) | Primary source confirming `clear_poison()`'s feature-gate history and that broader poisoning-default questions were left open, not resolved |
| [raw.githubusercontent.com/matklad/once_cell/master/src/lib.rs](https://raw.githubusercontent.com/matklad/once_cell/master/src/lib.rs) | `once_cell` crate source (doc comments) | current `once_cell` master | Primary source for the no-poisoning, retry-on-panic behavior that differs from `std::LazyLock`/`OnceLock` |
