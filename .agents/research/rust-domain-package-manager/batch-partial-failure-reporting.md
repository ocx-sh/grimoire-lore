---
title: Batch Operations and Partial-Failure Reporting
agent: inv-batch
model: sonnet
date_researched: "2026-08"
sources_count: 13
scope: |
  How an operation over N items (grim install, grim update, ocx pull, prune/GC)
  reports N outcomes instead of one. Covers failure shapes that lose information
  (bare `?` in a loop, `.ok()`/`let _ =` swallowing, scalar Result over N items,
  last-error-wins), the fail-fast/continue-and-collect/transactional decision and
  its criteria, collection types and stdlib seams (partition, collect::<Result<..>>,
  join_all/try_join_all, JoinSet drain), error aggregation and rendering at scale,
  exit-code semantics for partial success, the --json batch schema, cancellation
  mid-batch, and progress reporting under concurrency. Does not cover general
  error-type design (see rust-error-handling) or the full exit-code taxonomy (see
  rust-cli-contract/exit-codes.md and ocx-codebase-audit/exit-codes-and-cli.md,
  both of which this file extends rather than restates) or atomic-write mechanics
  in depth (see rust-security/application-hardening.md §2, cited for the
  transactional case).
---

## Table of contents

1. [The four failure shapes that lose information](#1-the-four-failure-shapes-that-lose-information)
2. [The per-operation decision: fail-fast, continue-and-collect, or transactional](#2-the-per-operation-decision-fail-fast-continue-and-collect-or-transactional)
3. [Collection types and stdlib seams](#3-collection-types-and-stdlib-seams)
4. [Async seams: join_all vs try_join_all vs JoinSet's drain contract](#4-async-seams-join_all-vs-try_join_all-vs-joinsets-drain-contract)
5. [Error aggregation without losing sources, at scale](#5-error-aggregation-without-losing-sources-at-scale)
6. [Exit-code semantics for partial success](#6-exit-code-semantics-for-partial-success)
7. [The --json batch schema](#7-the---json-batch-schema)
8. [Cancellation mid-batch and the atomic-write contract](#8-cancellation-mid-batch-and-the-atomic-write-contract)
9. [Progress reporting under concurrency](#9-progress-reporting-under-concurrency)

## Summary

- A `for item in items { thing(item)?; }` loop aborts the whole batch at whichever item fails first — item 3 of 50 never lets items 4–50 be attempted, even though they are independent ([corrode.dev, "Bugs Rust Won't Catch"](https://corrode.dev/blog/bugs-rust-wont-catch/)).
- `.collect::<Result<Vec<T>, E>>()` has exactly this same short-circuit behavior by contract, not by accident: "if it is an `Err`, no further elements are taken" — the stdlib's own doctest proves later elements are never even iterated ([`std::result::Result` docs, `FromIterator` impl](https://doc.rust-lang.org/std/result/enum.Result.html)). It is the *wrong* default for N independent items; it is the *right* choice only when item K's success is a precondition for attempting item K+1.
- The uutils/Canonical audit found `chmod -R` reporting only the last file's exit status instead of the worst one across the whole tree, and `dd` calling `.ok()` on a length check that silently truncated output on a full disk — both are real, shipped, security-audited Rust CLI bugs, not hypotheticals ([corrode.dev](https://corrode.dev/blog/bugs-rust-wont-catch/)).
- The fix for "worst status across N items," not "last status," is track-max-severity while continuing the loop — corrode.dev's own suggested fix pattern is `worst = worst.max(e.exit_code())` inside the loop, never breaking on `Err` ([corrode.dev](https://corrode.dev/blog/bugs-rust-wont-catch/)).
- The three legitimate batch strategies are fail-fast (`?` in a loop, deliberately), continue-and-collect (`Vec<(Item, Result<T,E>)>` / `BatchReport`), and transactional all-or-nothing (build the whole result off to the side, then atomically publish it in one write-temp-then-rename) — pick one *per operation*, explicitly, never by default.
- `Iterator::partition` is the correct stdlib seam for turning a batch's raw `Vec<(Item, Result<T,E>)>` into a `(succeeded, failed)` split in one pass ([`Iterator::partition` docs](https://doc.rust-lang.org/std/iter/trait.Iterator.html#method.partition)).
- `futures::future::join_all` waits for every future regardless of whether the item type is a `Result` — it returns `Vec<T>` (or `Vec<Result<T,E>>` if `T` is itself `Result`), never short-circuiting on the futures level ([docs.rs `join_all`](https://docs.rs/futures/latest/futures/future/fn.join_all.html)). `try_join_all` is the opposite: "if any future returns an error then all other futures will be canceled and an error will be returned immediately" ([docs.rs `try_join_all`](https://docs.rs/futures/latest/futures/future/fn.try_join_all.html)) — for a batch of N independent items, `try_join_all` is the async twin of the bare-`?`-in-a-loop bug: the first failure destroys the results of every other in-flight item.
- `tokio::task::JoinSet::join_all()` "will panic and all remaining tasks on the `JoinSet` are cancelled" the moment any one task fails with a `JoinError` ([docs.rs `JoinSet`](https://docs.rs/tokio/latest/tokio/task/struct.JoinSet.html)) — this is not a batch-safe drain method; it is `try_join_all`'s failure mode wearing a different name, and it is a live risk anywhere in a codebase that already has 122 `JoinSet` call sites.
- The batch-safe drain is `while let Some(res) = set.join_next().await { ... }`, matching each `Result<T, JoinError>` individually and folding it into the batch's own `Vec<(Item, Result<T,E>)>` — `join_next` returns `None` only once the set is empty, and one task's `JoinError` never stops the loop from draining the rest ([docs.rs `JoinSet`](https://docs.rs/tokio/latest/tokio/task/struct.JoinSet.html)).
- `cargo install`'s own `--keep-going` flag is the exact fail-fast/continue-and-collect knob this research recommends, made explicit and opt-in: default is abort-on-first-failure, `--keep-going` builds "as many crates in the dependency graph as possible" instead ([cargo book, `cargo install`](https://doc.rust-lang.org/cargo/commands/cargo-install.html)) — evidence that even cargo itself treats "stop at first failure" as worth a dedicated, named, documented flag rather than an implicit default nobody chose.
- Exit codes classify *why* a batch failed, never *how much* of it failed — "48 of 50 succeeded" is scriptable only through `--json`'s summary object, and the process exit code should be the *worst* per-item error's already-classified code (mirroring corrode.dev's chmod fix), falling back to the generic `Failure` (1) bucket only when the batch's failures are of genuinely mixed, unclassifiable kinds.
- A `--json` batch result is always a `{summary: {...}, items: [...]}` object, never a bare array — every item carries a `status` field (`succeeded`/`failed`/`skipped`), and the summary carries the aggregate counts and a single `status` a script can branch on without counting the array itself.
- Rendering 200 per-item failures as 200 lines of stderr is a UX bug distinct from the data-loss bugs above: truncate to a fixed head (e.g. the first 20) plus a `… and N more failures (see --json or --verbose)` trailer, matching rustc/cargo's "aborting due to N previous errors" summarization discipline that the sibling error-UX research already documents.
- Cancellation mid-batch (SIGINT) must stop spawning new items, let in-flight atomic writes finish or cleanly abandon their temp file (never touching the final path), and report a `BatchReport` whose not-yet-attempted items are `skipped` with reason `cancelled` — the atomic write-then-rename contract is what makes "cancel-safe" true here, not the batch loop itself.
- Aggregate progress (a counter or progress bar driven by `JoinSet` completions) must never be the thing consulted to decide the exit code — the exit code comes only from the final, fully-drained `BatchReport`, because a progress counter can tick from paths (UI throttling, an aborted task never posting "done") that do not correspond 1:1 with the authoritative result set.
- The review heuristic for this whole bug class is mechanical: any `for`/`while` loop iterating a collection of user-facing items (packages, files, layers, targets) whose body contains a bare `?` on a per-item call, or a `.ok()`/`let _ =` discarding a per-item `Result`, is a finding — the first silently aborts the batch, the second silently swallows a failure; both destroy the N-outcomes-for-N-items contract.

## Findings

### 1. The four failure shapes that lose information

**Shape A — `?` inside a loop aborts at item K.** The most common shape in agent-written Rust: a `for` loop over N items where each item's fallible step uses `?`. The function returns on the *first* error; items K+1..N are never attempted, and the caller cannot tell "which items, if any, before K also succeeded" without extra bookkeeping the `?` short-circuit already threw away.

```rust
// WRONG: aborts the whole batch at item 3 of 50; items 4..50 never run,
// and the caller gets one Err with zero information about items 1-2's outcome.
fn install_all(pkgs: &[Package]) -> Result<(), InstallError> {
    for pkg in pkgs {
        install_one(pkg)?;
    }
    Ok(())
}
```

**Shape B — `.ok()` / `let _ =` swallows the per-item error.** The opposite failure mode: the loop *does* run to completion, but any error is thrown away, so the batch reports total success even when every single item failed. This is exactly the `dd` bug from the uutils audit: a `.ok()` call meant only to suppress a specific benign case (`/dev/null` having no meaningful length) ran unconditionally, so "a full disk silently produced a half-written destination" with zero indication anything went wrong ([corrode.dev](https://corrode.dev/blog/bugs-rust-wont-catch/)).

```rust
// WRONG: identical shape to the real dd bug — writes may fail (disk full,
// permission denied) and the caller never finds out.
for pkg in pkgs {
    write_layer(pkg).ok();   // or: let _ = write_layer(pkg);
}
```

**Shape C — a scalar `Result` summarizing N independent outcomes.** A function signature like `fn update_all(pkgs: &[Package]) -> Result<(), UpdateError>` structurally cannot report "47 succeeded, 3 failed" — by the time it returns, N-1 outcomes have already been discarded into either "everything is `Ok`" or "here is one `Err`, plus silence about the rest." This is the type-level root cause behind Shapes A and B: as long as the function signature is scalar, every implementation is forced to choose between abort-early or swallow-and-lie.

**Shape D — last-error-wins.** A loop that continues on error but overwrites a single `last_err` variable each iteration, then returns only that. This is the `chmod -R` bug exactly: the real Canonical/uutils audit found `chmod -R` "returned the exit status of only the final file processed rather than the worst failure encountered," so a tree with failures on files 1 and 2 but success on file 50 (the last one processed) reported *success* ([corrode.dev](https://corrode.dev/blog/bugs-rust-wont-catch/)).

```rust
// WRONG: same shape as the real chmod -R bug. If item 49 fails but item 50
// (the last one) succeeds, `result` ends up Ok — the batch reports success.
let mut result = Ok(());
for item in items {
    result = process(item);   // overwrites, doesn't accumulate
}
result
```

The article's own prescribed fix generalizes past chmod's simple "compare exit code integers" case to "track the worst outcome, never overwrite it, never break early":

```rust
// RIGHT (corrode.dev's own shape, adapted): track the worst outcome across
// every item, without ever short-circuiting the loop.
let mut worst = 0;
for file in files {
    if let Err(e) = chmod_one(file) {
        worst = worst.max(e.exit_code());
    }
}
```

All four shapes trace back to one root cause: the return type of the batch operation does not have room for N outcomes. Fixing the type (§3) fixes all four shapes at once; patching each loop site individually does not.

### 2. The per-operation decision: fail-fast, continue-and-collect, or transactional

This is a decision to make explicitly, per command, not a default to inherit. Three questions decide it:

1. **Is the batch's partial application a valid state?** If a cache with 48 of 50 packages installed is a perfectly usable, inspectable, resumable state (grim/ocx's actual on-disk cache model), continue-and-collect is safe. If a half-applied result is actively worse than not having started (a lockfile with only some of its entries rewritten — the next tool that reads it sees an inconsistent graph), the operation needs the transactional case instead.
2. **Can the user re-run to converge?** Package managers are supposed to be idempotent: re-running `grim install` after a partial failure should retry only what's missing/broken and leave already-installed items alone. If re-running is cheap and convergent, continue-and-collect is correct — the "N of M" report *is* the todo-list for the next run. If re-running redoes expensive, non-idempotent work (a resolve step that must be atomic to even be meaningful), lean transactional.
3. **Does item K's failure invalidate item K+1's premise?** Independent items (installing package A and unrelated package B) tolerate continue-and-collect trivially. Dependent items (B depends on A; A failed to install) do not — B's attempt is not merely "another item that might fail," it is *known* to be pointless, and running it anyway wastes time and produces a confusing "B failed: file not found" error that hides the real cause (A never landed). This case needs a third bucket beyond succeeded/failed: **skipped**, with a reason that names the item it was skipped because of.

Concretely for the domain named in the task:

| Command | Items | Classification | Why |
|---|---|---|---|
| `grim install` / `grim update` | independent packages | continue-and-collect, with `skipped` for anything whose dependency failed | packages are independently cacheable; a partial cache is valid and re-runnable |
| `ocx pull` | independent toolchain layers | continue-and-collect | same reasoning — a partially-populated OCI blob cache is normal, expected, and resumable |
| `grim`/`ocx` prune / GC | independent cache entries to delete | continue-and-collect | deleting entry N failing (permission, in-use) must not stop entries N+1..M from also being pruned; a stuck entry is not evidence the others are stuck |
| Lockfile / manifest write that *records* the batch's outcome | one file, one write | **transactional** | see below — this is the one part of every batch command above that must be all-or-nothing even though the batch of downloads feeding it is continue-and-collect |

**Tying the transactional case to atomic writes.** "Transactional" only means something concrete on a filesystem if it is backed by the write-temp-then-rename pattern this codebase's own security research already documents: write the new lockfile/manifest to a temp file in the *same directory* as the target, `fsync` it, then rename over the target — POSIX `rename()` is atomic, so a reader (or a crash) never observes a half-written file, only the old complete one or the new complete one ([rust-security/application-hardening.md §2, "Atomic write-then-rename, with fsync"](../rust-security/application-hardening.md)). This is why the two levels are not in tension: the *batch of downloads* is continue-and-collect (partial cache state is fine, re-runnable), but the *single record* of what that batch accomplished (a lockfile entry set, a manifest) is written exactly once, atomically, after the batch has fully drained — the transactional guarantee applies to the bookkeeping write, not to the fan-out of item attempts that fed it.

### 3. Collection types and stdlib seams

**The raw seam: `Vec<(Item, Result<T, E>)>`.** This is what a continue-and-collect loop or a drained `JoinSet` should produce before any summarization happens — one entry per item, unconditionally, whether it succeeded or failed. Nothing is thrown away at this layer.

```rust
let mut raw: Vec<(Package, Result<InstalledLayout, InstallError>)> = Vec::new();
for pkg in pkgs {
    raw.push((pkg.clone(), install_one(&pkg)));
}
```

**`Iterator::partition` is the one-line fold from raw results to succeeded/failed.** Its signature and stdlib example show exactly this split shape (predicate `true`/`false` → two collections) ([`Iterator::partition` docs](https://doc.rust-lang.org/std/iter/trait.Iterator.html#method.partition)):

```rust
let (succeeded, failed): (Vec<_>, Vec<_>) = raw
    .into_iter()
    .partition(|(_, r)| r.is_ok());
```

**The mandated summary type: `BatchReport<Item, T, E>`.** `partition` alone loses the `skipped` bucket (§2) and gives no place to hang aggregate counts, an overall status, or JSON rendering. The type this research mandates:

```rust
pub struct BatchReport<Item, T, E> {
    pub succeeded: Vec<(Item, T)>,
    pub failed: Vec<(Item, E)>,
    pub skipped: Vec<(Item, SkipReason)>,
}

pub enum SkipReason {
    DependencyFailed { of: String },
    Cancelled,
}

impl<Item, T, E> BatchReport<Item, T, E> {
    pub fn total(&self) -> usize {
        self.succeeded.len() + self.failed.len() + self.skipped.len()
    }
    pub fn is_full_success(&self) -> bool {
        self.failed.is_empty() && self.skipped.is_empty()
    }
}
```

**Why `collect::<Result<Vec<T>, E>>()` is usually the wrong tool here.** The stdlib is explicit that this collection short-circuits: "Takes each element in the `Iterator`: if it is an `Err`, no further elements are taken, and the `Err` is returned" ([`std::result::Result` FromIterator docs](https://doc.rust-lang.org/std/result/enum.Result.html)). The docs' own doctest proves it operationally — a `shared` counter accumulated inside the mapping closure stops advancing the instant the first `Err` is produced, and a later, otherwise-fine element (`10` in the doctest) is never even visited:

```rust
// From the stdlib docs: proves the short-circuit is real, not just documented.
let v = vec![3, 2, 1, 10];
let mut shared = 0;
let res: Result<Vec<u32>, &'static str> = v.iter().map(|x: &u32| {
    shared += x;
    x.checked_sub(2).ok_or("Underflow!")
}).collect();
assert_eq!(res, Err("Underflow!"));
assert_eq!(shared, 6); // not 16 — item `10` was never processed
```

This is exactly right when item K's success is a *precondition* for item K+1 (a strictly ordered migration, a dependency chain that must resolve top-down) — `collect::<Result<Vec<_>,_>>()` is a clean one-liner for genuine fail-fast semantics. It is wrong the moment items are independent, because "the batch's outcome is the batch's first failure" throws away every other item's result, reproducing Shape A from §1 at the stdlib level instead of in a hand-written loop.

### 4. Async seams: join_all vs try_join_all vs JoinSet's drain contract

**`futures::future::join_all`** drives every future to completion and collects outputs into a `Vec<T>` in the original order; the documentation gives no error-short-circuit behavior because there isn't one — it has no opinion on `Result` at all, and if the futures happen to produce `Result<T,E>`, you get `Vec<Result<T,E>>`, which is `join_all`'s way of handing you back exactly the raw seam from §3, already parallelized ([docs.rs `join_all`](https://docs.rs/futures/latest/futures/future/fn.join_all.html)).

```rust
// RIGHT for independent items: every item's outcome survives, regardless
// of how many others failed.
let results: Vec<Result<Layout, InstallError>> =
    join_all(pkgs.iter().map(install_one_async)).await;
```

**`futures::future::try_join_all`** is the fail-fast primitive: "If any future returns an error then all other futures will be canceled and an error will be returned immediately" ([docs.rs `try_join_all`](https://docs.rs/futures/latest/futures/future/fn.try_join_all.html)). For N independent items this is the async restatement of Shape A — the first failing item destroys not just its own result but the in-flight work of every other item, which for filesystem-writing tasks means canceling a future mid-write. That is safe *only* if every cancellable future is either (a) not yet past the point of any filesystem side effect, or (b) protected by the same write-temp-then-rename discipline from §2 so a cancelled write only ever orphans a temp file, never corrupts the target path.

```rust
// WRONG for a batch of independent packages: one failure cancels every
// other in-flight install, discarding N-1 results that may have already
// succeeded or been mid-write.
try_join_all(pkgs.iter().map(install_one_async)).await?;
```

**`tokio::task::JoinSet`.** The set's `join_next().await` "waits until one of the tasks in the set completes and returns its output," returning `None` only once the set is empty, and is documented cancel-safe for use inside `tokio::select!` ([docs.rs `JoinSet`](https://docs.rs/tokio/latest/tokio/task/struct.JoinSet.html)). Its bulk-drain convenience method, `join_all()`, is the trap: it "will panic and all remaining tasks on the `JoinSet` are cancelled" the instant any single task fails with a `JoinError` (task panic or abort) — structurally identical to `try_join_all`'s behavior, but arriving via a panic instead of a returned `Err`, which makes it easy to miss in review because nothing about the call site *looks* fallible.

```rust
// WRONG: one panicking/aborted task among N takes down the whole batch's
// result set — a single flaky download panics `join_all` and every other
// in-flight download's result is gone.
let outputs: Vec<T> = set.join_all().await; // panics on any task's JoinError
```

**The batch-safe drain contract**, given the codebase's 122 existing `JoinSet` call sites: manually loop `join_next`, matching each task's `Result<T, JoinError>` individually and folding every outcome — success, application-level `Err`, or task panic — into the same `Vec<(Item, Result<T,E>)>` this research already mandates as the raw seam.

```rust
// RIGHT: every task's outcome survives the drain, whether it succeeded,
// returned Err, or panicked.
let mut raw = Vec::with_capacity(set.len());
while let Some(res) = set.join_next_with_id().await {
    match res {
        Ok((id, Ok(value))) => raw.push((id_to_item(id), Ok(value))),
        Ok((id, Err(app_err))) => raw.push((id_to_item(id), Err(app_err.into()))),
        Err(join_err) => raw.push((id_to_item(join_err.id()), Err(join_err.into()))),
    }
}
```

Any existing `JoinSet::join_all()` call site in a batch command is a direct instance of this bug class and should be audited first — it is the single highest-density place this failure mode can hide, given how many call sites already exist.

### 5. Error aggregation without losing sources, at scale

`thiserror` gives per-variant `#[source]`/`#[from]` chaining but "doesn't provide built-in collection support for multiple errors" — its own guidance for that case is to reach for `anyhow` instead ([docs.rs `thiserror`](https://docs.rs/thiserror/latest/thiserror/)). `anyhow::Error` gives a linear chain (`.context()`, rendered as "Caused by:") for *one* fallible path, not a fan-out of N independent failures ([docs.rs `anyhow`](https://docs.rs/anyhow/latest/anyhow/)). Neither crate is built for "N failures, each with its own chain" — that shape is exactly what `BatchReport::failed: Vec<(Item, E)>` is for: each `E` keeps its own full thiserror/anyhow chain intact (nothing is flattened into a string early), and the *aggregation* happens one layer up, at render time, over the `Vec`, not inside the error type itself.

Rendering that `Vec` at the terminal must not become a 200-line wall for a large batch. The convention already established in this codebase's error-UX research — cargo/rustc's "aborting due to N previous errors" summarization, and the observed uv/cargo pattern of a one-line count first, detail below it — extends directly to batch rendering: print a fixed-size head of individual failures (e.g. the first 20, each with its own short chain via `{:#}`), then a single trailer line naming the count of the rest (`… and 31 more failures — see --json or re-run with --verbose`), never all 200 unconditionally. The full, untruncated list still exists — in the `BatchReport` and in `--json` output — the truncation is purely a terminal-rendering decision, not data loss.

### 6. Exit-code semantics for partial success

This codebase already has a real, implemented exit-code taxonomy (0 `Success`, 1 `Failure`, 64 `UsageError`, 65 `DataError`, 69 `Unavailable`, 74 `IoError`, 75 `TempFail`, 77 `PermissionDenied`, 78 `ConfigError`, 79 `NotFound`, 80 `AuthError`, 81 `PolicyBlocked`) documented in `ocx-codebase-audit/exit-codes-and-cli.md`, and that table has no dedicated "partial success" code — nor does any tool surveyed for that research (git, curl, ripgrep, gh, docker) carry one; `cargo`'s own `101` is a single infrastructure-failure fallback used identically whether one test failed or all of them did (`rust-cli-contract/exit-codes.md §3`). Inventing a 15th code for "some but not all items succeeded" would be new surface with no prior art anywhere in the tools this project already measures itself against.

**The decision: partial success is exit-code failure, classified by the worst item, never a distinct code.** Concretely:

- `48 of 50 succeeded` → **nonzero**. A script that checks `$?` must never see `0` unless every item succeeded — silently treating 48/50 as success is the exact `chmod -R` bug (§1, Shape D) recreated at the process-exit layer.
- The *specific* nonzero code is the already-classified exit code of the **worst** failure among the batch's `failed` items — not the first, not the last, the worst by whatever severity ordering the existing `ClassifyExitCode`/`classify()` chain already defines (e.g. an `AuthError` (80) among the failures outranks an `IoError` (74) as "the thing the user most needs to fix first"). This generalizes corrode.dev's own `chmod -R` fix (`worst = worst.max(e.exit_code())`) from a single integer comparison to a walk over the batch's classified failures.
- If the batch's failures are of genuinely mixed, unclassifiable kinds (or the classification tie-breaks ambiguously), fall back to the generic `Failure` (1) — this is what that bucket is for, and it is strictly better than inventing a new number nobody scripts against yet.
- `0 of 50 succeeded` because the operation used fail-fast (§2) and aborted at item 3 gets the classified code of *that one* error — this is the ordinary single-error case the taxonomy already handles; nothing new is needed here.
- Apply this identically across every batch command (`install`, `update`, `pull`, `prune`) — a command-specific exception (e.g. "prune uses a different rule for partial failure") reintroduces exactly the cross-tool inconsistency `rust-cli-contract/exit-codes.md` already flags as a problem when two binaries in one workspace disagree.

The granularity a script actually wants ("which 2 of the 50 failed, and why") does not belong in the exit code at all — `ExitCode` is documented as deliberately not exposing a raw value or supporting equality comparison, i.e. write-only from application code (`rust-cli-contract/exit-codes.md §4`) — that granularity is exactly what `--json`'s summary and per-item array (§7) exist to carry.

### 7. The --json batch schema

A per-item array with a status field, plus a summary object — never a bare array, and never an array whose *length* a script is expected to count in order to learn how many failed:

```json
{
  "summary": {
    "total": 50,
    "succeeded": 48,
    "failed": 2,
    "skipped": 0,
    "status": "partial_failure",
    "exit_code": 74
  },
  "items": [
    { "item": "pkg-a@1.2.3", "status": "succeeded" },
    {
      "item": "pkg-b@2.0.0",
      "status": "failed",
      "error": { "code": "io-error", "exit_code": 74, "message": "no space left on device" }
    },
    { "item": "pkg-c@0.9.0", "status": "skipped", "reason": "dependency-failed", "of": "pkg-b@2.0.0" }
  ]
}
```

- `summary.status` is one of `success` / `partial_failure` / `failure` / `cancelled` — a script branches on this single field, never on `items.length` vs `summary.succeeded`.
- `summary.exit_code` mirrors the process's actual exit code (§6) inline, so a script parsing captured JSON output after the fact doesn't need `$?` at all.
- Every item's `status` is one of exactly `succeeded` / `failed` / `skipped` — the same three-way split as `BatchReport`, so the JSON schema is a direct serialization of the mandated type, not a parallel, independently-evolving shape.
- `error.code` reuses the same slug convention grim's existing single-error JSON envelope already defines (`ocx-codebase-audit/exit-codes-and-cli.md §4`) — a batch failure's per-item error is not a new error-rendering format, it's the existing one, once per item.
- Truncation (§5) applies only to *terminal* rendering — `--json` output always includes the full, untruncated `items` array; a machine consumer should never see fewer results than `summary.total`.

### 8. Cancellation mid-batch and the atomic-write contract

On SIGINT mid-batch, three things must happen in order: (1) stop spawning any new item — a `JoinSet`-backed batch simply stops calling `.spawn()`; (2) let already in-flight items reach a safe stopping point rather than yanking them mid-effect — for a filesystem-writing item, "safe" means either it completes its write-temp-then-rename and lands normally, or it is interrupted *before* the rename and leaves only an orphaned temp file, never a half-written file at the final path (`rust-security/application-hardening.md §2`); (3) drain whatever `JoinSet`/`Vec` state exists into a final `BatchReport` whose never-attempted items are recorded as `skipped` with `SkipReason::Cancelled`, not silently absent from the report.

This is why cancellation composes cleanly with the transactional case from §2 without needing special-case code: because every filesystem-touching item was already going through write-temp-then-rename for ordinary correctness reasons, a cancelled item's worst-case outcome is "an orphaned temp file, cleaned up by the next GC pass" — never a corrupted target file. Cancellation-safety here is a *consequence* of already having atomic writes, not a separate mechanism layered on top.

The `--json` output for a cancelled batch uses `summary.status: "cancelled"` distinctly from `"partial_failure"` — a script needs to be able to tell "the user hit Ctrl-C" apart from "the tool ran to completion and some items failed," since the correct recovery action differs (re-run the same command vs investigate the specific failures first).

### 9. Progress reporting for a batch under concurrency

A `JoinSet`-driven batch naturally wants a progress indicator (`indicatif`-style) ticking once per `join_next()` completion. The one rule this section exists to state plainly: **the progress counter is a UI side-channel, and the exit code must never be derived from it.** A progress bar reaching `len()` is not the same fact as "every item succeeded" — a bar implementation can tick on completion regardless of `Ok`/`Err` (which is usually correct UX — the item is *done*, not necessarily *successful*), and any code path that reads `progress.position() == progress.length()` and treats that as the success signal has silently reintroduced Shape C from §1 (a scalar signal standing in for N outcomes) at the UI layer. The only authoritative source for the exit code is the fully-drained `BatchReport` from §3, produced after the batch loop (or `JoinSet` drain) has genuinely finished — progress reporting and result reporting are two different readers of the same completion stream, and only one of them is allowed to decide the process's exit code.

## Normative guidance candidates

1. **Any loop over independent, user-facing items (packages, files, layers, targets) must not use `?` per-item; it must accumulate a `Vec<(Item, Result<T, E>)>` (or drain a `JoinSet` into one).** Rationale: `?` inside such a loop reproduces the `chmod -R`/Shape-A bug — item 3's failure silently cancels items 4..N (§1). Verify: code-reading — for every `for`/`while` loop iterating a collection of user-facing items, confirm the per-item fallible call is matched/pushed into an accumulator, not chained with `?` or `.await?`.
2. **No `.ok()` or `let _ =` on a fallible per-item call inside a batch loop, ever, without an adjacent comment justifying exactly why that specific error is benign.** Rationale: this is the literal `dd` bug — a silently discarded error means the batch reports success when it didn't happen (§1, Shape B). Verify: `grep -rn '\.ok();\|let _ = ' src/ | grep -B2 -A2 'for \|while '` — any hit inside a loop body without a `// ponytail:`-style justification comment is a finding.
3. **Do not use `.collect::<Result<Vec<_>, _>>()` (or its `try_join_all`/`JoinSet::join_all()` async equivalents) over a collection of independent items.** Rationale: all three short-circuit on the first failure by documented contract, discarding every other item's outcome — correct only when item K's success is a precondition for item K+1, never for independent fan-out (§3, §4). Verify: code-reading every `collect::<Result<`, `try_join_all(`, and `.join_all()` (on a `JoinSet`) call site — confirm the mapped items are genuinely order-dependent, not just "happen to be collected in a loop."
4. **Every batch command exposes a single mandated `BatchReport<Item, T, E> { succeeded, failed, skipped }` type; ad hoc tuples or per-command bespoke report structs are not permitted.** Rationale: one type means one JSON schema, one exit-code derivation, one rendering routine — reused across `install`/`update`/`pull`/`prune` instead of reinvented per command (§3, §7). Verify: `grep -rn 'struct.*Report\|struct.*Summary' src/` in each batch command's module — flag any command-local report type that duplicates `succeeded`/`failed`/`skipped` instead of using the shared type.
5. **Classify every operation as fail-fast, continue-and-collect, or transactional explicitly (a doc comment on the function, not an implicit default), using the three questions from §2: valid partial state, re-runnable, item-K-invalidates-K+1.** Rationale: the failure shapes in §1 are what happens when no one made this decision on purpose. Verify: code-reading — does the batch function's doc comment state which of the three strategies it uses and why? Absence is the finding, not any particular choice.
6. **`tokio::task::JoinSet::join_all()` is banned in any batch command whose whole point is to survive individual item failure; use a manual `while let Some(res) = set.join_next_with_id().await` drain instead.** Rationale: `join_all()` panics and cancels every remaining task the instant one task fails with a `JoinError` — silently converting one flaky download into total batch data loss, exactly the risk this codebase's 122 `JoinSet` sites make structurally likely somewhere (§4). Verify: `grep -rn '\.join_all()' --include='*.rs' src/` on every `JoinSet` (not `futures::join_all`) receiver — each hit in a batch/fan-out context is a finding.
7. **The process exit code for a batch reflects the worst classified failure among `failed` items, falling back to `Failure` (1) only for mixed/unclassifiable failures — never a new "partial success" code, and never derived from counting succeeded vs failed directly.** Rationale: keeps the existing 0/1/64–81 taxonomy as the single source of exit-code truth across every batch command; no prior-art tool (git/curl/ripgrep/gh/cargo) surveyed by this project's own exit-code research adds a dedicated partial-success code either (§6). Verify: code-reading the batch command's final `ExitCode` derivation — confirm it walks `BatchReport::failed` through the existing `classify()`/`ClassifyExitCode` chain and takes the worst, rather than returning a hardcoded `1` or the last error seen.
8. **`--json` batch output is always `{ summary: {...}, items: [...] }` with a `summary.status` enum (`success`/`partial_failure`/`failure`/`cancelled`) and a per-item `status` enum (`succeeded`/`failed`/`skipped`) — no bare arrays, no schema drift between commands.** Rationale: a script must be able to branch on one field without recomputing counts or diffing schemas between `install`'s and `pull`'s JSON output (§7). Verify: schema/snapshot test asserting every batch command's `--json` output matches one shared schema (e.g. via `insta` or a JSON-Schema validator run in CI), not eyeballed per command.
9. **A batch's terminal rendering of failures truncates to a fixed head (e.g. 20) plus a `"… and N more"` trailer once failures exceed that count; `--json` output is never truncated.** Rationale: 200 raw error chains on stderr is unreadable and buries the signal the summary line already gave; the full data must still exist somewhere machine-readable (§5). Verify: code-reading the batch failure-rendering function for a `.take(N)` (or equivalent) with a trailing count line, and a confirming test that constructs >N failures and asserts the trailer appears while `--json`'s item count still equals the true total.
10. **Progress-bar/counter state must never be read to compute the exit code or the summary's success/failure classification — only the drained `BatchReport` may.** Rationale: a UI tick-on-completion counter and the authoritative result set are different readers of the same stream; conflating them reintroduces the scalar-signal bug at the UI layer (§9). Verify: code-reading — grep for the progress bar's position/length getters (`indicatif::ProgressBar::position`, `.length()`) outside the rendering module; any use feeding an `if`/exit-code decision is a finding.
11. **A cancelled batch (SIGINT mid-run) is reported with `summary.status: "cancelled"`, distinct from `"partial_failure"`, and every not-yet-attempted item appears in `skipped` with `SkipReason::Cancelled` — it is never simply absent from the report.** Rationale: "the user interrupted this" and "the tool ran to completion with some failures" call for different recovery actions from the user; collapsing them loses that distinction (§8). Verify: an integration test that sends SIGINT mid-batch (or a test seam that simulates cancellation) and asserts the resulting `BatchReport`/JSON accounts for every item, with none silently missing.

## AI-agent angle

- **Writing `for item in items { do_thing(item)?; }` as the "obviously correct" first draft of a batch loop.** This is the single most natural shape for an LLM to produce for "do this for each item" — it compiles, looks idiomatic, and passes on any test with all-succeeding fixtures, which is exactly the trap: it only fails on the input shape (some items fail) that a shallow test suite is least likely to cover. Mechanical check: grep every `for`/`while` loop body for a bare `?` immediately following a call whose argument is the loop variable, cross-referenced against whether the surrounding items are documented as independent (§2) — if independent and unaccumulated, it's a finding.
- **Reaching for `.collect::<Result<Vec<_>, _>>()` because it's the shortest code that "handles the Result," without registering that it silently discards N-1 successes on the first failure.** An agent optimizing for concise, compiling code will pick this over the more verbose `partition`/`BatchReport` fold every time unless explicitly told independent-item batches need the longer form. Mechanical check: grep for `collect::<Result<` (or `.collect::<Result<_,`) and manually confirm, for each hit, whether the mapped items are genuinely sequential-dependent or independent (§3) — independent + this pattern is the bug.
- **Adding `.ok()` to silence a `Result` that "shouldn't matter" during iterative development, and never circling back.** Models frequently do this to get code compiling quickly (a `Result` the surrounding function doesn't yet handle), intending it as temporary, and it survives into shipped code exactly like the real `dd` bug did in production, audited coreutils. Mechanical check: `grep -rn '\.ok();\|let _ = ' src/` inside any function whose name suggests batch/loop semantics (`install_all`, `update_batch`, `prune_*`) — every hit needs a justification comment or a fix.
- **Calling `JoinSet::join_all()` because the name reads as "the JoinSet equivalent of `futures::join_all`," without registering that it panics-and-cancels on the first task failure — the opposite of what `futures::join_all` does.** The name similarity across two crates with opposite failure semantics is a specific, easy-to-miss trap; an agent that has internalized "`join_all` waits for everything" from `futures` will misapply that mental model to `JoinSet::join_all()`. Mechanical check: `grep -rn 'JoinSet' -A20 src/**/*.rs | grep '\.join_all()'` — any `JoinSet` receiver calling `.join_all()` (as opposed to `futures::future::join_all` on a `Vec<impl Future>`) in a batch context is a finding requiring conversion to a manual `join_next` drain (§4).
- **Inventing a new "partial success" exit code (e.g. a made-up 2 or 3) because "48 of 50 isn't quite failure, but it isn't success either," without checking the existing taxonomy or any prior-art tool.** This is a plausible-sounding but ungrounded design an agent will produce absent explicit instruction, since "there should be a code for this" feels intuitively correct even though no surveyed tool (§6) does it. Mechanical check: any new `ExitCode`/ taxonomy variant introduced in the same diff as batch-reporting code, cross-checked against `ocx-codebase-audit/exit-codes-and-cli.md`'s existing table — a genuinely new code for "partial" is a finding to challenge, not accept.
- **Producing a `--json` batch schema that's just `Vec<ItemResult>` with no summary wrapper, because it's the more "natural" direct serialization of the loop's output.** Agents tend to serialize whatever data structure they already built rather than designing the schema a script actually wants to branch on. Mechanical check: for any new `--json` output touching a batch command, confirm the top-level value is an object with a `summary` key, not a bare array — a snapshot test catches this immediately once written (rule 8's verification).

## Contested / evolving

- **Whether `skipped` (dependency-invalidated items) belongs in the same enum as `failed`, or is a distinct top-level bucket, is a real design choice this research resolves one way (distinct bucket) but is not universally agreed in the ecosystem.** Some package managers fold "skipped because a dependency failed" into the same failure list with a distinguishing reason field rather than a separate array; this research keeps them structurally separate (`BatchReport.skipped` vs `.failed`) because a skipped item did not itself fail — its own installer/downloader never ran — and conflating the two loses that distinction when a user is deciding what to retry. Treat this as a defensible, not inevitable, choice.
- **`cargo install --keep-going`'s existence as an opt-in flag (default: fail-fast) rather than the reverse (default: keep-going, opt-in fail-fast) is itself evidence the ecosystem has not converged on one default** ([cargo book, `cargo install`](https://doc.rust-lang.org/cargo/commands/cargo-install.html)) — cargo's own default privileges "stop immediately, don't waste build time on a doomed graph" over "always show me everything," which is a reasonable choice for its use case (compiling is expensive; installing/pulling independent packages over a registry is comparatively cheap per-item) but is not the same recommendation this research makes for grim/ocx's independent-package batches. A future cargo-install-style command in this codebase should not assume "match cargo's default" is automatically right without re-asking the three questions in §2 for its own item shape.
- **Whether truncating terminal output at a fixed count (rule 9) should be user-configurable (a `--max-errors N` flag) or a fixed constant is unresolved by any source surveyed here** — rustc/cargo's own "aborting due to N previous errors" convention doesn't expose the head-count as a flag; this research treats a fixed default with `--json`/`--verbose` as the escape hatch as sufficient, but a configurable threshold is a legitimate alternative not contradicted by any source found.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| [corrode.dev — "Bugs Rust Won't Catch"](https://corrode.dev/blog/bugs-rust-wont-catch/) | Practitioner blog, corrode Rust consulting | published 2026-04-29 | Primary source for the real, audited `chmod -R`/`dd` batch/partial-failure bugs this whole subarea is built around; includes the "track worst, never overwrite" fix pattern |
| [docs.rs — `futures::future::join_all`](https://docs.rs/futures/latest/futures/future/fn.join_all.html) | Official crate docs (futures-rs) | current | Primary source: confirms `join_all` never short-circuits on error, the correct async primitive for independent-item batches |
| [docs.rs — `futures::future::try_join_all`](https://docs.rs/futures/latest/futures/future/fn.try_join_all.html) | Official crate docs (futures-rs) | current | Primary source: explicit "all other futures will be canceled" wording — the async fail-fast trap for batches |
| [docs.rs — `tokio::task::JoinSet`](https://docs.rs/tokio/latest/tokio/task/struct.JoinSet.html) | Official crate docs (tokio) | current | Primary source for `join_next`/`join_next_with_id` cancel-safety and the `join_all()` panic-and-cancel-on-first-failure trap directly relevant to this codebase's 122 `JoinSet` sites |
| [GNU coreutils manual — Exit status](https://www.gnu.org/software/coreutils/manual/html_node/Exit-status.html) | Official GNU project documentation | current (living manual) | Primary source for the base "0 = success, nonzero = failure" convention this codebase's partial-success decision must stay consistent with |
| [`std::result::Result` docs (FromIterator impl)](https://doc.rust-lang.org/std/result/enum.Result.html) | Official Rust std docs | current | Primary source proving `.collect::<Result<Vec<_>,_>>()`'s short-circuit behavior with a runnable doctest, not just prose |
| [`Iterator::partition` docs](https://doc.rust-lang.org/std/iter/trait.Iterator.html#method.partition) | Official Rust std docs | current | Primary source for the one-line succeeded/failed fold used to build `BatchReport` from raw results |
| [clig.dev — Command Line Interface Guidelines](https://clig.dev/) | Community-maintained CLI design reference (multiple industry authors) | current, widely cited | Primary source for exit-code, `--json`, progress-bar, and grouped-error-output conventions this research extends into batch-specific schema |
| [docs.rs — `thiserror`](https://docs.rs/thiserror/latest/thiserror/) | Official crate docs | current | Primary source confirming thiserror has no built-in multi-error collection support, motivating `BatchReport`'s `Vec<(Item, E)>` shape instead |
| [docs.rs — `anyhow`](https://docs.rs/anyhow/latest/anyhow/) | Official crate docs | current | Primary source for the chain-rendering convention each individual `E` inside a `BatchReport::failed` entry should still honor |
| [man7.org — `sysexits.h(3head)`](https://www.man7.org/linux//man-pages/man3/sysexits.h.3head.html) | Linux man page mirror of BSD sysexits.h | BSD origin, current mirror | Prior-art check confirming no BSD-standard code exists for "partial batch success" either — supports rule 7's "no new code" decision |
| [doc.rust-lang.org — `unused_must_use` lint listing](https://doc.rust-lang.org/rustc/lints/listing/warn-by-default.html) | Official rustc lint documentation | current | Primary source for the mechanical, compiler-level backstop against `.ok()`/`let _ =`-style discarded per-item `Result`s (rule 2's cheapest verification layer) |
| [cargo book — `cargo install`](https://doc.rust-lang.org/cargo/commands/cargo-install.html) | Official Rust/cargo documentation | current | Primary source for `--keep-going`, real-world prior art of a package manager making the fail-fast/continue-and-collect choice an explicit, named, opt-in flag rather than an implicit default |

Internal cross-references (not counted toward the external source minimum, but load-bearing for consistency with existing project research): `ocx-codebase-audit/exit-codes-and-cli.md` (the live, implemented exit-code taxonomy this research's §6 extends), `rust-cli-contract/exit-codes.md` (prior-art survey of git/curl/ripgrep/gh/cargo exit-code philosophy), `rust-security/application-hardening.md` §2 (atomic write-then-rename mechanics underpinning §2 and §8), and `rust-error-handling/error-ux-and-diagnostics.md` §11 (the pre-existing "K of N failed" summary convention this research turns into a concrete mandated type and schema).
