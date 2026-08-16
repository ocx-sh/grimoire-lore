---
title: "Ownership shapes: clones, cache APIs, and interior mutability"
agent: ownership-shapes-clones-and-interior-mutability
model: sonnet
date_researched: "2026-08"
sources_count: 12
scope: >
  The family of borrow-checker-appeasement mistakes at four scales: (1) .clone() as an
  escape hatch, (2) &mut self on cache/memoization getters, (3) interior-mutability type
  selection (Cell/RefCell/Mutex/RwLock/atomics/OnceLock) against actual concurrency, and
  (4) Arc<Mutex<T>> sprawl as a design smell vs. owned actor tasks. Grounded in the
  ocx/grimoire/ocx-mirror codebase audit (116/150/8 Arc hits, 46 std::sync::Mutex hits,
  zero tokio::sync::Mutex) and grimoire's TUI functional-core/imperative-shell split.
---

## Table of contents

1. [Clone to silence the borrow checker](#1-clone-to-silence-the-borrow-checker)
2. [What `clippy::redundant_clone` catches and precisely what it misses](#2-what-clippyredundant_clone-catches-and-precisely-what-it-misses)
3. [`&mut self` cache getters — matklad's decision table](#3-mut-self-cache-getters--matkladss-decision-table)
4. [Applying the table to OCI blob/manifest/layer caches](#4-applying-the-table-to-oci-blobmanifestlayer-caches)
5. [Interior-mutability selection against actual concurrency](#5-interior-mutability-selection-against-actual-concurrency)
6. [Two symmetric failures, and what has no lint at all](#6-two-symmetric-failures-and-what-has-no-lint-at-all)
7. [`Arc<Mutex<T>>` sprawl as a design smell — the actor escalation](#7-arcmutext-sprawl-as-a-design-smell--the-actor-escalation)
8. [grimoire's TUI as the counter-example](#8-grimoires-tui-as-the-counter-example)
9. [Grounding the audit numbers](#9-grounding-the-audit-numbers)

## Summary

1. `.clone()` is not a bug in itself — it is a bug when it is reached for *because* the
   borrow checker complained, not because two independent copies of the value are the
   correct design.
2. The single review question that separates the two: **"if I mutate the clone, should the
   original see it?"** If yes, the clone is wrong — reach for `&`, `Arc`, or restructure
   ownership. If the answer is "no, and that's the point," the clone is load-bearing.
3. `clippy::redundant_clone` is a deny-nothing (`nursery`/`perf`, warn-by-default in
   practice via `cargo clippy --all-targets`) MIR/dataflow lint that only fires when it can
   *prove* the clone's target has no further use — its own doc names "False-negatives:
   analysis performed by this lint is conservative and limited" as a known problem
   ([source](https://github.com/rust-lang/rust-clippy/blob/master/clippy_lints/src/redundant_clone.rs)).
   It cannot see across function boundaries, cannot prove semantic (not just syntactic)
   redundancy, and says nothing about clones that *are* used later but shouldn't have
   diverged — the review heuristic has to live exactly there, not in tooling.
4. `Arc::clone(&x)` and `Rc::clone(&x)` are cheap, intentional, shared-ownership clones —
   different in kind from `T::clone()` on owned data, and the two must never be reviewed
   with the same eye. `Arc<T>::clone` bumps an atomic counter; it does not duplicate `T`.
5. `&mut self` on a getter is a design defect, not a mutability requirement, whenever the
   only reason for `&mut` is "the cache might need to write." It is viral: every caller up
   the graph must also take `&mut self`, and the type system's read/write distinction is
   destroyed for the whole call chain (matklad,
   ["Caches in Rust"](https://matklad.github.io/2022/06/11/caches-in-rust.html)).
6. matklad's target signature for an append-only cache is `fn get(&self, key: K) -> &T`,
   backed by `once_cell`/`std::sync::OnceLock` (single value) or `elsa::FrozenMap` (keyed,
   many values) — both provide stable references without ever requiring `&mut self` because
   nothing already inserted is ever moved or overwritten.
7. For a cache that evicts (LRU, bounded), the honest signature returns an owned handle —
   `fn get(&self, key: K) -> Option<Rc<T>>` (or `Arc<T>`) backed by
   `RefCell<LruCache<K, Rc<T>>>` — never `&T`, because the entry backing that reference can
   be evicted out from under it on the very next call.
8. A third, frequently correct answer the decision table names explicitly: **don't cache at
   all — compute the value once up front and pass it in.** This beats both interior-mutability
   shapes when the full key set is known before the read-heavy phase starts (typical of a
   resolved dependency closure, not typical of an interactive incremental compiler).
9. `Cell<T>` is for `Copy` (or otherwise cheap-to-move) types accessed by value —
   `get`/`set`/`replace`/`take`, no borrow ever escapes. `RefCell<T>` is for everything else
   that needs `&T`/`&mut T` — runtime-checked, panics (`already borrowed: BorrowMutError`)
   instead of refusing to compile.
10. Neither `Cell<T>` nor `RefCell<T>` is `Sync`. Putting either behind an `Arc` compiles —
    `Arc<T>` itself is always `Send`+`Sync` regardless of `T` — but sharing that `Arc` across
    threads or `tokio::spawn` boundaries is unsound-shaped: the `!Sync` inner type either
    blocks compilation the moment a `Send` future is required, or (if the access pattern
    hides it) produces `RefCell`'s "already borrowed" panic under concurrent access that
    single-threaded testing will never surface.
11. `clippy::arc_with_non_send_sync` (warn-by-default, `suspicious`) catches the *type-level*
    half of failure #10 — `Arc<RefCell<T>>`, `Arc<Cell<T>>` — but has no way to catch the
    *design* half: an `Arc<Mutex<T>>` that is only ever touched from one thread, which is
    equally a wrong shape but produces no warning of any kind, ever.
12. The audit's numbers are the house convention made visible: 116/150/8 `Arc` hits across
    ocx_lib/grimoire/ocx-mirror, 46 total `std::sync::Mutex` hits (17/21/8), and **zero**
    `tokio::sync::Mutex` in any of the three codebases — a deliberate choice (short critical
    sections, never held across `.await`) that should be written down as a rule, not left as
    an emergent pattern a new contributor or an LLM has no way to discover.
13. Tokio's own tutorial states the rule the audit's numbers already follow: "it is ok and
    often preferred to use the ordinary `Mutex` from the standard library in asynchronous
    code" as long as "contention remains low and the lock is not held across calls to
    `.await`" ([Shared State](https://tokio.rs/tokio/tutorial/shared-state)).
14. Tokio's own escalation ladder for lock contention, in order: restructure to avoid holding
    the lock across `.await`; shard the mutex; **spawn a task to own the state and talk to
    it over a channel** — the actor pattern is not exotic, it is the *documented* answer once
    a shared mutex becomes a bottleneck or a design headache.
15. Alice Ryhl's actor pattern splits *task* (owns the state exclusively, no lock needed)
    from *handle* (a cheap `Clone`-able struct wrapping a channel sender) — this is strictly
    better than `Arc<Mutex<T>>` whenever the state has behavior beyond "read/write a field,"
    because invariants are enforced by the single owner instead of by convention at every
    call site ([Actors with Tokio](https://ryhl.io/blog/actors-with-tokio/)).
16. `Arc<Mutex<T>>` sprawl is a *design* smell distinct from async-primitive misuse: the
    question "should N call sites share mutable access to this at all" is prior to and
    separate from "which lock type is correct" — a codebase can pick the textbook-correct
    lock type at every site and still have the wrong architecture.
17. grimoire's TUI (`src/tui/state.rs`, `render.rs`, `event.rs`, `bundle_members.rs`) is the
    family's working counter-example: state lives as plain owned fields on `TuiState`, mutated
    only through message dispatch in the imperative shell (`app.rs`), with zero `RefCell`
    anywhere in the state model itself — the memoization cache
    (`BundleMemberCache`, a `HashMap<(String, String), BundleMemberCache>`) is a plain field,
    not an interior-mutability wrapper, because the shell already owns `&mut TuiState`
    exclusively at every point it runs.
18. The mandated cache-getter signature for a review checklist is one of exactly three
    shapes — `fn get(&self, k: &K) -> Option<&V>` (append-only), `fn get(&self, k: &K) ->
    Option<Rc<V>>`/`Arc<V>` (evicting), or no getter at all (precomputed map passed in) — any
    `fn get(&mut self, ...)` on a type with more than one live caller is a finding, not a
    style nit.
19. `clippy::redundant_clone` and `clippy::arc_with_non_send_sync` are necessary but not
    sufficient reviewers: neither one can see "was this `&mut self` chosen because writes are
    real, or because it was the first thing that made `cargo build` pass" — that judgment has
    no mechanical substitute and must be a stated review question.
20. An LLM's default failure mode across all four scales is the same reflex: treat the
    compiler error as the thing to satisfy, not as a signal about a design question upstream
    of the error — `.clone()`, `&mut self`, `Arc<Mutex<_>>`, and `RefCell` are the four tools
    that make *any* borrow-checker complaint go away without addressing why it fired.

## Findings

### 1. Clone to silence the borrow checker

The canonical description, from the Rust community's own anti-patterns collection:

> "Using `.clone()` causes a copy of the data to be made. Any changes between the two are
> not synchronized – as if two completely separate variables exist."
> — [rust-unofficial, "Clone to satisfy the borrow checker"](https://rust-unofficial.github.io/patterns/anti_patterns/borrow_clone.html)

The doc's own minimal example is instructive precisely because it looks harmless:

```rust
// wrong: appeasement clone — silences the error, changes nothing about intent
let mut x = 5;
let y = &mut (x.clone());
println!("{x}");
*y += 1;
// x is still 5 here — the mutation through y never touched x.
// If the code's actual intent was "increment x", this is a silent bug,
// not a style nit: it compiles, runs, and produces the wrong answer.
```

```rust
// correct: address the actual conflict — here, there wasn't one
let mut x = 5;
let y = &mut x;
println!("{}", *y); // must read through y, not x, while the borrow is live
*y += 1;
```

The doc allows clones for beginners, prototypes, and cases where "the amount of extra
allocations would be negligible in the context of the rest of the code" and readability
genuinely outweighs a clone's cost — but frames these as *conscious trade-offs*, not as the
default resolution to a borrow error.

**Legitimate clones, distinguished from appeasement clones:**

| Shape | Why it's legitimate | Review signal it's NOT appeasement |
|---|---|---|
| `Arc::clone(&x)` / `Rc::clone(&x)` | Bumps a refcount; `T` is not duplicated | Called via `Arc::clone`/`Rc::clone` (or `.clone()` on the smart pointer type itself), not on the pointee |
| Escaping a borrow at an API boundary | The callee outlives the caller's borrow (stored in a struct, sent to another thread, returned) | The clone crosses a lifetime the borrow checker *cannot* extend, not one it merely complained about locally |
| Genuinely independent state | Config template cloned per invocation so each caller can mutate its own copy | The two values are *expected* to diverge — that's the feature, not a bug |
| Cheap `Copy`-adjacent types | `PathBuf`/`String` clone to avoid a lifetime parameter threading through five structs | The alternative (lifetime plumbing) is a net complexity loss for a value that's cheap to own |

The review question that separates the two, restated precisely: **if the clone and the
original later diverge, is that divergence intended?** If the code would be *wrong* the
moment someone mutates one without the other, the clone papered over a real ownership
question. If divergence is exactly what's wanted (independent copies, snapshot semantics),
the clone is load-bearing.

### 2. What `clippy::redundant_clone` catches and precisely what it misses

The lint's own doc, read directly from source:

> "### What it does — Checks for a redundant `clone()` (and its relatives) which clones an
> owned value that is going to be dropped without further use.
> ### Why is this bad? — It is not always possible for the compiler to eliminate useless
> allocations and deallocations generated by redundant `clone()`s.
> ### Known problems — False-negatives: analysis performed by this lint is conservative and
> limited."
> — [clippy_lints/src/redundant_clone.rs](https://github.com/rust-lang/rust-clippy/blob/master/clippy_lints/src/redundant_clone.rs)

What it **catches**: `x.clone()` where MIR dataflow analysis can prove `x` (the clone
*target*, not the source) is never used again before being dropped — i.e., the clone
produced a value that was pure waste, syntactically local and provable.

What it **precisely misses** (the gap the review heuristic must cover):

- **Cross-function and cross-boundary redundancy.** If the clone is passed into another
  function, the lint cannot see whether that function needed an owned value or would have
  been happy with a borrow — it only reasons about the clone's *local* dataflow.
- **Semantic redundancy that isn't dataflow-provable.** A clone used exactly once, then
  mutated, where the mutation was never meant to be observed by the original — the value
  *is* used, so the lint is silent, but the clone still exists only because a borrow
  conflict was worked around rather than resolved.
- **Divergence bugs.** The lint has no notion of "these two values are supposed to stay in
  sync" — it only asks "is this specific clone's output dead." A clone that both branches
  read but neither is meant to mutate independently produces no lint output even when the
  *design* is wrong (should have been `&T` or `Rc<T>` from the start).
- **Clones inside loops that are individually non-dead but collectively pathological** —
  each iteration's clone is "used," so no single instance is flagged, while the aggregate
  cost (an O(n) allocation storm) is invisible to a lint that reasons per-clone.

This is precisely why the task's normative section below treats `redundant_clone` as a
floor, not a review substitute: it catches *wasted* clones, not *wrong* ones.

### 3. `&mut self` cache getters — matklad's decision table

matklad's "Caches in Rust" is the canonical source. Its core diagnosis of why `&mut self`
on a getter is wrong even when it compiles cleanly:

> "the `&mut self` becomes viral — most of functions in the program begin requiring `&mut`,
> and you lose type-system distinction between read-only and read-write operations."
> — [matklad, "Caches in Rust"](https://matklad.github.io/2022/06/11/caches-in-rust.html)

The concrete failure this produces — two calls that should be independent become mutually
exclusive:

```rust
// wrong: &mut self getter — these two calls cannot coexist even though
// get_widget is conceptually read-only from the caller's point of view
let w1 = app.get_widget(1)?;   // borrows app mutably...
let w2 = app.get_widget(2)?;   // ...error: cannot borrow app as mutable more than once
```

The article's stated goal is to reach one of exactly two shapes instead of the naive
`fn get(&mut self, ...) -> &T`:

**Append-only — never evicts, so a `&T` stays valid forever:**

```rust
// OnceCell: single memoized value
cache: once_cell::sync::OnceCell<Widget>,
fn get_widget(&self) -> &Widget {
    self.cache.get_or_init(create_widget)
}

// elsa::FrozenMap: keyed, many values, still append-only
cache: elsa::map::FrozenMap<u32, Box<Widget>>,
fn get_widget(&self, id: u32) -> &Widget {
    if let Some(widget) = self.cache.get(&id) {
        return widget;
    }
    self.cache.insert(id, Box::new(create_widget(id)))
}
```

Both work through `&self`, not `&mut self`, because "as long as we never overwrite, delete
or move values, we can safely return references to them" — the invariant `FrozenMap` (via
`StableDeref`) enforces at the type level.

**Evicting — an LRU or any bounded cache, where a `&T` could dangle after eviction:**

```rust
// RefCell<LruCache<K, Rc<V>>>: shared ownership survives eviction of the cache slot
cache: RefCell<lru::LruCache<u32, Rc<Widget>>>,
pub fn get_widget(&self, id: u32) -> io::Result<Rc<Widget>> {
    if let Some(widget) = self.cache.borrow_mut().get(&id) {
        return Ok(Rc::clone(widget));
    }
    let widget = Rc::new(load_widget(id)?);
    self.cache.borrow_mut().put(id, Rc::clone(&widget));
    Ok(widget)
}
```

The signature returns `Rc<Widget>`, never `&Widget` — because the *next* call to
`get_widget` can evict the slot backing any reference this call might have handed out. The
`Rc` is not a workaround; it is the correct expression of "this value may outlive its slot
in the cache."

**The third answer, easy to overlook:** matklad's framing is explicit that thinking about
"what the ownership and borrowing situation *should* be" sometimes concludes there should be
no runtime cache at all — compute every needed value once, up front, before entering the
read-heavy phase, and pass the resulting map in as a plain (non-interior-mutable) field. This
is strictly simpler than either cache shape when the key set is known ahead of time and
avoids interior mutability, `Rc`, and runtime borrow checks entirely.

### 4. Applying the table to OCI blob/manifest/layer caches

Mapped onto grim/ocx's actual domain — digest-addressed blobs, manifests, and layer
metadata pulled from an OCI registry:

| Cache | Shape | Why |
|---|---|---|
| **Digest → decoded manifest, within one pull** | Append-only, `elsa::FrozenMap<Digest, Box<Manifest>>` or a plain `HashMap` built once before fan-out reads begin | A manifest is immutable once fetched — content-addressed by digest, it can never be invalidated in place. If the full manifest set for a pull is known before the read-heavy resolution phase, skip the cache type entirely: resolve everything, build a `HashMap`, hand `&HashMap` down. |
| **Digest → blob bytes, bounded by disk/memory budget** | Evicting, `RefCell<LruCache<Digest, Rc<Bytes>>>` (or `Arc<Bytes>` if the cache must be `Send`) | A long-running process (the `ocx-mirror` daemon shape, or grim's TUI background fetch) cannot hold every blob it has ever seen; eviction is required, so callers get `Rc<Bytes>`/`Arc<Bytes>`, never a borrowed slice into the cache. |
| **Layer digest → verified-and-extracted path, for the lifetime of one install** | Append-only for that install's duration; `OnceLock`/`FrozenMap` keyed by digest | Once a layer is extracted and its digest verified, the result does not change again within that install run — no eviction pressure exists at that scope. |
| **Cross-process, cross-invocation content cache (the on-disk CAS)** | Not an in-memory interior-mutability question at all — the filesystem *is* the cache, keyed by digest, and correctness comes from atomic rename + digest verification on read, not from a Rust-level cache type | This is the case matklad's table doesn't cover because it's not an in-process cache; naming it here specifically to stop an LLM from reaching for `Mutex<HashMap<..>>` to guard something the filesystem already serializes via atomic rename. |

The unifying test for which row applies: **is the key space known before the read-heavy
phase, does the cache ever evict, and does more than one owner need the value
concurrently?** Precomputed-and-passed-in wins when the first is true; append-only wins when
eviction never happens; evicting-with-`Rc`/`Arc` is the fallback only when both memory
pressure and true reuse exist simultaneously.

### 5. Interior-mutability selection against actual concurrency

The base semantic distinction, read from the standard library's own module docs:

> `Cell<T>` implements interior mutability by moving values in and out — you never obtain a
> `&T` to the inner value directly (`get`/`set`/`replace`/`take`). `RefCell<T>` uses dynamic
> borrowing with runtime-checked borrow rules — you can obtain `&T`/`&mut T`, but violating
> the rules panics rather than failing to compile.
> — [`std::cell` module docs](https://doc.rust-lang.org/std/cell/index.html)

The Rust Book states the trade-off this buys explicitly:

> "The advantage of checking the borrowing rules at runtime instead is that certain
> memory-safe scenarios are then allowed, where they would've been disallowed by the
> compile-time checks... your code would incur a small runtime performance penalty as a
> result of keeping track of the borrows at runtime rather than compile time."
> — [The Rust Book, ch. 15.5](https://doc.rust-lang.org/book/ch15-05-interior-mutability.html)

Neither is thread-safe:

> "Similar to `Rc<T>`, `RefCell<T>` is only for use in single-threaded scenarios and will
> give you a compile-time error if you try using it in a multithreaded context... `Mutex<T>`
> is the thread-safe version of `RefCell<T>`."
> — [The Rust Book, ch. 15.5](https://doc.rust-lang.org/book/ch15-05-interior-mutability.html)

**The decision table** — (concurrency shape) × (access pattern) → concrete type:

| | Read-mostly / init-once | Mutating, single owner style | Mutating, genuinely shared |
|---|---|---|---|
| **Single-threaded** | `OnceCell<T>` (`once_cell` or std) for one value; plain field if the value is known at construction | `Cell<T>` (Copy types) / `RefCell<T>` (everything else) | `Rc<RefCell<T>>` — shared ownership, single thread, runtime-checked borrows |
| **Multi-threaded (std threads)** | `OnceLock<T>` / `LazyLock<T, F>` — never blocks on `get()`, initializes exactly once across racing threads | `Mutex<T>` (std) for general data; `AtomicU*`/`AtomicBool` for single scalars where a lock is overkill | `Arc<Mutex<T>>` (read/write both matter) or `Arc<RwLock<T>>` (reads dominate, writes are rare) |
| **Async (tokio)** | Same as multi-threaded — `OnceLock`/`LazyLock` need no async variant, initialization is synchronous work | `std::sync::Mutex` **still preferred** if the critical section never spans `.await` (see finding 7) | `tokio::sync::Mutex` only if the lock must be held across `.await`; otherwise `Arc<std::sync::Mutex<T>>` with the guard scoped to end before any `.await` — or escalate to an actor (finding 8) |

Tokio's tutorial states the async row's rule directly, and it is the rule the audit's own
numbers already follow without it being written down anywhere in-repo:

> "it is ok and often preferred to use the ordinary `Mutex` from the standard library in
> asynchronous code" as long as "contention remains low and the lock is not held across
> calls to `.await`."
> — [Tokio tutorial, "Shared State"](https://tokio.rs/tokio/tutorial/shared-state)

`tokio::sync::Mutex`'s own docs converge on the same point from the other side — it exists
specifically for the case the table's async row calls out, and its docs additionally point
past itself toward the actor escalation:

> "when you *do* want shared access to an IO resource, it is often better to spawn a task to
> manage the IO resource, and to use message passing to communicate with that task."
> — [`tokio::sync::Mutex` docs](https://docs.rs/tokio/latest/tokio/sync/struct.Mutex.html)

### 6. Two symmetric failures, and what has no lint at all

**Failure A — `Arc<Mutex<T>>` in a single-threaded path.** The code pays atomic-increment
cost on every clone and lock/unlock cost on every access, plus carries poisoning risk (a
panic while holding the lock poisons it for every future locker), for a value that never
crosses a thread or task boundary. This compiles cleanly, passes every test, and shows up
only as unexplained lock overhead in a profile — there is no lint that flags "this `Mutex`
is never contended" because contention is a runtime property, not a type-level one.

**Failure B — `RefCell` on a type someone later `Arc`s or moves across `tokio::spawn`.**
Two distinct failure shapes depending on where the mistake is caught:

```rust
// wrong: RefCell inside a struct that later gets Arc'd for cross-task sharing
struct BlobCache {
    entries: std::cell::RefCell<HashMap<Digest, Bytes>>,
}
// Arc<BlobCache> is Send+Sync-eligible by Arc's own definition (Arc<T> is
// unconditionally Send/Sync in its OWN right), but any future that captures
// this Arc and is itself required to be Send will fail to compile the moment
// a & to the RefCell's contents is held across an .await point that also
// touches non-Send data — OR, if no await ever straddles it, the code
// compiles and instead panics at runtime under concurrent access:
// "already borrowed: BorrowMutError"
```

The compile-time half of this is caught *sometimes* — if the specific await pattern trips
the `Send` bound on the spawned future. The runtime half is caught *never* at compile time:
two tasks racing to `.borrow_mut()` the same `RefCell` through a shared `Arc` produces a
panic only under the interleaving that actually triggers the double-borrow, which is exactly
the kind of bug that survives single-threaded local testing and CI, then fires in
production under load.

```rust
// correct: Mutex (or RwLock) once the type crosses a concurrency boundary
struct BlobCache {
    entries: std::sync::Mutex<HashMap<Digest, Bytes>>,
}
```

**What `clippy::arc_with_non_send_sync` catches:**

> "This lint warns when you use `Arc` with a type that does not implement `Send` or `Sync`
> ... `Arc::new(RefCell::new(42))` is problematic because `RefCell` is not `Sync`."
> — [clippy_lints/src/arc_with_non_send_sync.rs](https://github.com/rust-lang/rust-clippy/blob/master/clippy_lints/src/arc_with_non_send_sync.rs)

It catches the **type-level** instance of Failure B — `Arc<RefCell<T>>` written directly, in
scope for static analysis. It does **not** catch:

- `Rc<RefCell<T>>` that later gets wrapped in an outer `Arc<...>` one level removed (e.g.
  `Arc<Mutex<Vec<Rc<RefCell<Node>>>>>` — the `Rc<RefCell<_>>` is nested, and clippy's lint
  fires on the direct `Arc<T>` construction site, not on transitively reachable interior
  mutability several types deep).
- **Failure A entirely** — there is no lint, in clippy or anywhere else, for "this `Mutex` /
  `Arc` is architecturally unnecessary because nothing else ever touches this value." That
  judgment requires knowing the call graph's actual concurrency, which is a design fact, not
  a type fact — no static analysis tool has this information.
- A `RefCell` that compiles fine today because nothing currently sends it across threads,
  but will panic the day someone adds a `tokio::spawn` two call-sites away — clippy lints
  the code as it is written, not the shape it's one refactor away from being.

### 7. `Arc<Mutex<T>>` sprawl as a design smell — the actor escalation

The question this scale of the mistake asks is different in kind from finding 6: not "is
this the right lock type" but **"should N call sites share mutable access to this value at
all."** A codebase can get every individual lock type right and still have architected
itself into contention, unclear ownership of invariants, and lock-ordering deadlock risk
simply by defaulting to `Arc<Mutex<T>>` every time two parts of the program need to touch
the same state.

Tokio's tutorial states its own escalation ladder plainly, in order:

1. Restructure the code so the lock is never held across `.await`.
2. Shard the mutex (multiple locks over key ranges) if contention is the actual problem.
3. **"spawn a task to manage the state and use message passing to communicate with that
   task"** — the actor pattern.
   — [Tokio tutorial, "Shared State"](https://tokio.rs/tokio/tutorial/shared-state)

Alice Ryhl's actor post gives the concrete shape step 3 takes, and *why* it beats a shared
mutex once the state has any behavior beyond raw get/set:

> "The task is the independently spawned Tokio task that actually performs the duties of the
> actor, and the handle is a struct that allows you to communicate with the task... If you
> combine both the actor and the handle into a single struct, you are... giving every handle
> access to the fields owned by the actor's task."
> — [Alice Ryhl, "Actors with Tokio"](https://ryhl.io/blog/actors-with-tokio/)

```rust
// wrong: shared mutable state, invariants enforced by every caller's discipline
struct RegistryCache {
    inner: Arc<Mutex<HashMap<Digest, ManifestEntry>>>,
}
// every call site that touches `inner` must remember to: check staleness,
// bound the map size, and never hold the lock across the network call that
// refreshes an entry. Nothing enforces any of that except code review.

// correct: an actor owns the state exclusively; callers only send messages
struct RegistryCacheHandle {
    tx: mpsc::Sender<CacheMsg>,
}
// the actor task owns the HashMap with no lock at all — staleness checks,
// size bounds, and refresh-ordering are enforced once, in the actor's own
// message loop, not re-derived at every call site.
```

The post also names the actor pattern's own hazards, so this is not a free upgrade:
"you must make sure that there are no cycles of channels with bounded capacity" (a bounded
`send` can block, and a cycle of actors each waiting on the next deadlocks exactly like a
lock-ordering violation would), and shutdown needs explicit handling once actors hold
handles to each other (the last sender never drops, so the receiver never sees channel
closure).

**When `Arc<Mutex<T>>` is still the right call**, worth stating since the post above doesn't
argue against it directly: plain shared data with no behavior — a counter, a flag, a small
map read far more than written — where the "invariant" is nothing more than "the field is
consistent," and where wrapping it in an actor would be a message-passing ceremony around
what is genuinely just a guarded variable. The design smell is sprawl and behavior hidden
behind a lock, not the primitive's mere presence.

### 8. grimoire's TUI as the counter-example

grimoire's TUI module (`/home/mherwig/dev/grimoire/src/tui/`) is the family's cleanest
instance of "the answer is neither a cache getter nor an interior-mutability wrapper — the
state's owner already has exclusive `&mut` access, so use that." `src/tui/state.rs`'s own
module doc states the intent directly:

> "This module is deliberately free of ratatui, crossterm, and `std::io` — every transition
> is a pure function over `TuiState` so the screen logic is exhaustively unit-testable
> without a terminal."

`src/tui/bundle_members.rs` defines `BundleMemberCache`, a memoization cache for
registry-fetched bundle member rows keyed by `(scope_label, bundle_repo)`. It contains
**zero** `RefCell`, `Cell`, `Rc`, or `Arc` — it is a plain `enum` (`Loading` / `Ready(Vec<..>)`
/ `Failed(String)` / `Offline`) stored as a field inside `TuiState`, which the imperative
shell (`app.rs`) mutates directly because it already owns `&mut TuiState` at every point in
its event loop. There is no `&mut self` getter to design around, no interior mutability to
select, because the functional-core/imperative-shell split means the "cache" question never
arises in the form matklad's article addresses — the owner of the state and the reader of
the state are never in a borrow conflict, since they're the same call, sequential, not
concurrent.

This is the pattern worth generalizing: **before reaching for any interior-mutability
wrapper, ask whether the code could instead give one component uncontested `&mut` ownership
of the state and route all access through it sequentially** (a message-dispatch loop, a
functional-core update function). grimoire's TUI answers this "yes" for its entire state
model; the cases in findings 3–7 are what's needed only when the answer is "no."

### 9. Grounding the audit numbers

Local greps against the two production repos, run for this research:

```
$ rg -o '\.clone\(\)' crates/ocx_lib/src | wc -l   # ocx_lib
1864
$ rg -o '\.clone\(\)' src | wc -l                  # grimoire
1110
$ rg -n 'Arc<Mutex<|Arc<std::sync::Mutex<' crates/ocx_lib/src | wc -l
39
$ rg -n 'Arc<Mutex<|Arc<std::sync::Mutex<' src | wc -l   # grimoire
18
```

Cross-referenced against the wider audit
([errors-async-security.md](../ocx-codebase-audit/errors-async-security.md)): `Arc<...>` is
116/150/8 across ocx_lib/grimoire/ocx-mirror; `std::sync::Mutex` is 17/21/8; `tokio::sync::Mutex`
is 0/0/0; `RwLock` is ocx_lib-only at 25 hits. The audit's own framing already calls this "a
deliberate, consistent choice... rather than an accidental blocking-lock smell," with the
caveat that no exhaustive `MutexGuard`-across-`.await` AST pass was run — `clippy::await_holding_lock`
closes exactly that gap mechanically and its presence in the lint config should be verified,
not assumed, given the scale (700+ files) the manual sampling couldn't fully cover.

grimoire's TUI (finding 8) is the one place in either codebase where the natural pull toward
`RefCell`/`Arc<Mutex<_>>` was designed around entirely — `src/tui/install_progress.rs` is the
TUI's only `RefCell` (wrapping a `&mut TuiTerminal` behind a rendering trait boundary that
needs `&self`, not a cache), confirming the state model itself never needed one.

## Normative guidance candidates

1. **A cache/memoization getter's signature must be one of exactly three shapes**: `fn
   get(&self, k: &K) -> Option<&V>` (append-only, never evicts), `fn get(&self, k: &K) ->
   Option<Rc<V>>`/`Option<Arc<V>>` (evicting), or no getter — precompute the full map and
   pass it in as a plain field.
   *Rationale:* `&mut self` on a getter propagates virally and destroys the read/write
   distinction across every caller (matklad).
   *VERIFICATION:* `rg 'fn get\w*\(&mut self' <src>` — any hit on a type with more than one
   call site to the getter is a finding. Cross-check the type's other public methods take
   `&self`; if none do, it may be a legitimate mutator, not a cache.

2. **Never wrap `Cell`/`RefCell` in `Arc` directly.** If a type needs to cross a thread or
   `tokio::spawn` boundary, its interior mutability must be `Mutex`/`RwLock`/an atomic —
   chosen at the point the type is designed, not discovered by a runtime panic.
   *Rationale:* `Arc<T>` is `Send`+`Sync` regardless of `T`; the `!Sync` inner type is what
   actually breaks, and it breaks as a runtime "already borrowed" panic when the compile-time
   catch doesn't trigger.
   *VERIFICATION:* `cargo clippy` for `clippy::arc_with_non_send_sync` (warn-by-default);
   supplement with `rg 'Arc<(std::)?(cell::)?RefCell<|Arc<(std::)?(cell::)?Cell<'` for nested
   cases the lint's direct-construction scope misses (e.g. `Arc<Mutex<Vec<Rc<RefCell<_>>>>>`).

3. **`std::sync::Mutex`, not `tokio::sync::Mutex`, is the default lock in async code** —
   reach for the tokio variant only when the critical section provably must span an
   `.await`.
   *Rationale:* matches the house convention already present (46 std hits, 0 tokio hits
   across ocx_lib/grimoire/ocx-mirror) and Tokio's own stated guidance.
   *VERIFICATION:* `rg 'tokio::sync::Mutex'` — every hit needs a comment justifying the
   `.await`-spanning need, or it's a downgrade candidate. `cargo clippy` with
   `clippy::await_holding_lock` catches guards actually held across await points.

4. **A `MutexGuard`/`RwLock` guard is never held across `.await`** — extract the needed data,
   drop the guard, then await.
   *Rationale:* deadlocks the executor (if `Send`-checked, it's a compile error under
   `tokio::spawn`; if not, a runtime hang) and is exactly the case `tokio::sync::Mutex`
   exists for — reaching for it is a smell that the critical section is drawn too large,
   not a fix.
   *VERIFICATION:* `cargo clippy -- -W clippy::await_holding_lock -W clippy::await_holding_invalid_type`.

5. **`Arc<Mutex<T>>`/`Arc<RwLock<T>>` requires a stated reason more than one task or thread
   touches `T`.** If grep shows exactly one call site ever locking it, that's a design defect
   (Failure A), not a style choice.
   *Rationale:* atomic refcounting and lock/unlock cost, plus poisoning risk, bought for
   nothing.
   *VERIFICATION:* `rg -n 'Arc<(std::sync::)?(Mutex|RwLock)<'`, then for each hit `rg -n
   '\.lock\(\)|\.read\(\)|\.write\(\)'` scoped to the type's usages — one call site total is
   a finding.

6. **Once a shared `Mutex<T>` guards behavior (staleness checks, size bounds, ordering
   invariants) rather than a plain field, escalate to an owned actor task + channel** before
   the invariant drifts out of sync at some call site.
   *Rationale:* Tokio's own escalation ladder names this as the terminal step once
   restructuring/sharding don't resolve the design pressure; an actor enforces the invariant
   once, in one place, instead of at every lock site.
   *VERIFICATION:* reading heuristic — grep every `.lock()` call site on the type in
   question (`rg -n '\.lock\(\)' | grep <type>`); if more than ~3 sites each re-implement
   the same "check X, then mutate, then maybe refresh" sequence, that duplication is the
   actor signal.

7. **`clippy::redundant_clone` is a floor, not a review substitute.** A clean `cargo clippy`
   proves no *wasted* clone was left behind; it proves nothing about a *wrong* clone (one
   that should have been a borrow, an `Rc`, or a restructure).
   *Rationale:* the lint's own doc names its analysis "conservative and limited" with
   explicit false-negatives.
   *VERIFICATION:* `cargo clippy -- -W clippy::redundant_clone` for the mechanical floor;
   pair with the review question in rule 8 for the gap.

8. **Review question for every `.clone()` on non-`Arc`/`Rc` data**: "if I mutate the clone,
   should the original see it?" Yes → the clone is wrong, find the actual ownership shape
   needed. No, and that's the intent → load-bearing, leave it, optionally note why in a
   comment if the reason isn't obvious from context.
   *Rationale:* this is the one question `redundant_clone` structurally cannot ask, since it
   requires knowing intent, not just dataflow.
   *VERIFICATION:* reading heuristic only — no mechanical check exists; a `// clone: <why>`
   comment convention on non-obvious clones makes the answer greppable after the fact
   (`rg -B1 '\.clone\(\)' | grep -v '// clone:'` as a soft audit, not a gate).

9. **`Arc::clone(&x)` / `Rc::clone(&x)`, not `x.clone()`, for smart-pointer clones.**
   *Rationale:* makes the cheap-refcount-bump clone visually distinct from an owned-data
   clone at every call site, so a reviewer scanning for appeasement clones doesn't have to
   resolve the type first.
   *VERIFICATION:* `cargo clippy` for `clippy::clone_on_ref_ptr` (restriction lint, opt-in —
   confirm it's enabled in `clippy.toml`/lint attributes, since restriction lints are
   allow-by-default).

10. **An append-only in-process cache over immutable, content-addressed data (OCI manifests
    and blobs keyed by digest) uses `OnceLock`/`once_cell::sync::OnceCell` or
    `elsa::FrozenMap`, never `RefCell<HashMap<..>>` or `Mutex<HashMap<..>>`**, unless the key
    set is fully known before the read-heavy phase — in which case, skip the cache type
    entirely and precompute into a plain `HashMap`.
    *Rationale:* a digest-keyed entry never needs invalidation; a lock or runtime-borrow-check
    bought for data that structurally never conflicts is pure overhead plus a code-review
    question about eviction that doesn't apply.
    *VERIFICATION:* `rg -n 'RefCell<HashMap|Mutex<HashMap' <src>`, then check whether the key
    is a digest/content hash — if so, `OnceLock`/`FrozenMap` is a candidate refactor, not
    just a stylistic alternative.

## AI-agent angle

An LLM's default reflex, at every one of the four scales in this document, is to treat a
compiler error as the thing to satisfy rather than as a signal about a design question
upstream of the error. Concretely, four almost-indistinguishable-from-correct moves an
autonomous coding agent reaches for, in order of how often each shows up:

1. **`.clone()` the moment `cannot borrow as mutable` or `value moved` appears**, without
   asking whether the two resulting values are supposed to diverge. The smallest mechanical
   check: after any edit that adds a `.clone()` not already present, run `cargo clippy -- -W
   clippy::redundant_clone` — it won't catch every appeasement clone (finding 2), but it
   catches the worst case (a clone whose target is immediately dead) for free, and any hit
   means the edit definitely didn't need the clone at all.

2. **`&mut self` on any method that "needs to write a cache," even when only one call site
   exists today** — because it's the first signature that makes the borrow checker stop
   complaining, and the agent has no visibility into how many future callers this decision
   will cost. The smallest mechanical check: `rg 'fn get\w*\(&mut self'` across the diff; if
   the method name contains `get`/`cache`/`lookup`/`fetch` and takes `&mut self`, that's a
   near-certain finding worth flagging even without deep analysis.

3. **`Arc<Mutex<T>>` as the default answer to "share this across an async boundary,"**
   applied uniformly whether the sharing is real (multiple tasks genuinely need concurrent
   mutable access) or accidental (the agent introduced a clone/move error and wrapped the
   value in `Arc<Mutex<_>>` to make it `Clone` and interior-mutable, satisfying the compiler
   without evaluating whether shared ownership was ever the right model). The smallest
   mechanical check: `rg -n 'Arc<Mutex<'` on the diff, then count distinct `.lock()` call
   sites for each hit — a new `Arc<Mutex<T>>` with exactly one lock site in the same diff is
   near-certainly compiler appeasement, not a design decision.

4. **`RefCell` reached for to make a struct's method take `&self` instead of `&mut self`**,
   without checking whether that struct is ever going to be shared across threads or moved
   into a `tokio::spawn`. This one is the most dangerous because it's invisible until
   runtime — `cargo build` and `cargo test` (if tests are single-threaded, which most are by
   default) both pass silently. The smallest mechanical check: `rg -n 'RefCell' <src>`
   cross-referenced against `rg -n 'Arc<' <src>` on the *same type name* — if a type
   containing a `RefCell` field also appears inside an `Arc<...>` anywhere in the codebase,
   that's the finding worth a human's attention, since neither clippy nor the compiler
   reliably catches it (finding 6).

The unifying mechanical habit worth instilling: **any diff that adds a `.clone()`,
`&mut self` on a getter, `Arc<Mutex<_>>`, or `RefCell` should be re-read once asking "would
this exist if the borrow checker had said nothing?"** If the honest answer is no, the fix is
almost never to make the workaround more sophisticated — it's to ask the design question the
error was actually pointing at.

## Contested / evolving

- **`once_cell` vs `std::sync::OnceLock`/`LazyLock`.** `OnceLock` and `LazyLock` landed in
  std (stabilized progressively through 1.70–1.80) and cover most of what `once_cell`
  provided; `once_cell` remains widely used for its slightly richer API (e.g. `OnceCell`'s
  non-thread-safe single-threaded variant, and ergonomic differences some codebases still
  prefer) and because large codebases migrate dependencies slowly. Direction of travel: new
  code should default to std's `OnceLock`/`LazyLock` and reserve `once_cell` for the gaps std
  doesn't cover yet, not the reverse.
- **`elsa::FrozenMap` adoption is thin outside niche use.** It solves the append-only-cache
  problem precisely, but its `StableDeref` requirement on values (`Box<T>`, not `T` directly)
  and its own docs noting `!Sync`/`!Freeze` limitations mean it's a specialist tool most
  Rust codebases reach for `OnceLock<HashMap<K, V>>` behind a single lazy-init instead of —
  trading FrozenMap's per-key laziness for a simpler, coarser one-shot-whole-map
  initialization. Which is "correct" depends on whether the full key set is cheap to compute
  eagerly (in which case skip FrozenMap and just build the map once).
- **Whether `clippy::clone_on_ref_ptr` should be default-on.** It's a `restriction` lint
  (allow-by-default) precisely because `Arc::clone(&x)` vs `x.clone()` is a style preference
  with real but modest reviewability value, not a correctness issue — teams disagree on
  whether it's worth the churn to enable.
  Rust's restriction-lint category itself is the site of ongoing debate about how many such
  lints should graduate toward warn-by-default as the ecosystem's taste converges.
  This document's rule 9 recommends turning it on for this project family specifically
  because of the sheer clone density already measured (1864/1110 `.clone()` calls) — the
  general-ecosystem answer remains "team's choice."
  This is genuinely unsettled ecosystem-wide, not just under-documented, and worth revisiting
  as clippy's restriction-lint policy evolves.
- **Actor-vs-shared-state is not free of its own new failure modes**, and the ryhl.io post
  is explicit about this rather than presenting actors as a strict upgrade: bounded-channel
  cycles deadlock exactly like lock-ordering violations, and handle cycles prevent clean
  shutdown. The "escalate to an actor" guidance in finding 7 should not be read as "actors
  have no sharp edges" — only that the sharp edges move from silent lock contention to
  channel-topology bugs that are at least visible in the type signatures (`Sender`/`Receiver`
  pairs) rather than hidden inside a `Mutex`.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [rust-unofficial, "Clone to satisfy the borrow checker"](https://rust-unofficial.github.io/patterns/anti_patterns/borrow_clone.html) | Community-maintained anti-patterns reference | Living doc, current | Primary source naming this exact anti-pattern; states the divergence-bug consequence directly |
| [matklad, "Caches in Rust"](https://matklad.github.io/2022/06/11/caches-in-rust.html) | Individual expert blog post (rust-analyzer/TigerBeetle author) | 2022-06-11, still the canonical reference | Primary source for the entire `&mut self` cache-getter decision table this document builds on |
| [Tokio, "Shared State" tutorial](https://tokio.rs/tokio/tutorial/shared-state) | Official Tokio project documentation | Living doc, current for tokio 1.x | Primary source for std-vs-tokio Mutex guidance and the actor escalation ladder, from the runtime's own maintainers |
| [Alice Ryhl, "Actors with Tokio"](https://ryhl.io/blog/actors-with-tokio/) | Blog post by a Tokio core maintainer | 2021-12-27, still linked from official Tokio docs as canonical | Primary source for the handle/actor split pattern and its failure modes (channel cycles, shutdown) |
| [clippy source, `redundant_clone.rs`](https://github.com/rust-lang/rust-clippy/blob/master/clippy_lints/src/redundant_clone.rs) | Lint implementation + doc comment, upstream clippy repo | Current `master` | Ground truth for exactly what the lint claims to detect and its stated false-negative limitation |
| [clippy source, `arc_with_non_send_sync.rs`](https://github.com/rust-lang/rust-clippy/blob/master/clippy_lints/src/arc_with_non_send_sync.rs) | Lint implementation + doc comment, upstream clippy repo | Current `master` | Ground truth for what the lint catches (direct `Arc<!Send/!Sync>` construction) and its scope limits |
| [`std::cell` module docs](https://doc.rust-lang.org/std/cell/index.html) | Official Rust standard library documentation | Current, edition-2024-era stable | Primary source for the `Cell` vs `RefCell` semantic split and neither being `Sync` |
| [The Rust Book, ch. 15.5, "RefCell<T> and the Interior Mutability Pattern"](https://doc.rust-lang.org/book/ch15-05-interior-mutability.html) | Official Rust project book | Current edition | Primary source for the compile-time-vs-runtime borrow-checking trade-off and the `Rc<RefCell<T>>` shared-mutable-owner pattern |
| [`tokio::sync::Mutex` docs](https://docs.rs/tokio/latest/tokio/sync/struct.Mutex.html) | Official crate API documentation | Current, tokio 1.x | Primary source stating std Mutex is "ok and often preferred" in async code, and pointing past itself to message passing |
| [`std::sync::OnceLock` docs](https://doc.rust-lang.org/std/sync/struct.OnceLock.html) | Official Rust standard library documentation | Current, stabilized 1.70 | Primary source for the append-only/init-once cache primitive this document's table recommends |
| [`elsa::map::FrozenMap` docs](https://docs.rs/elsa/latest/elsa/map/struct.FrozenMap.html) | Official crate API documentation (docs.rs) | Current | Primary source for the append-only keyed-cache type and its `StableDeref` soundness argument |
| [`lru::LruCache` docs](https://docs.rs/lru/latest/lru/struct.LruCache.html) | Official crate API documentation (docs.rs) | Current | Confirms `get` requires `&mut self` (LRU reordering) and `peek` doesn't — grounds why the evicting-cache shape needs `RefCell`, not `&self` alone |

Local grounding (not cited as external sources, used for the audit numbers in finding 9):
`/home/mherwig/dev/grimoire-lore/.agents/research/ocx-codebase-audit/errors-async-security.md`
(Arc/Mutex hit counts) and `/home/mherwig/dev/grimoire/src/tui/` (functional-core TUI
counter-example), both read directly from the working trees at
`/home/mherwig/dev/ocx` and `/home/mherwig/dev/grimoire`.
