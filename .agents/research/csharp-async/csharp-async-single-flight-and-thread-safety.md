---
title: "Single-flight shared async state, first-caller tokens, SemaphoreSlim discipline and the client thread-safety statement in a .NET library"
topic: csharp-async-single-flight-and-thread-safety
agent: deep-dive researcher (group csharp-async, revision wave)
model: sonnet
date_researched: 2026-10-11
sources_count: 28
scope: |
  Covers: how a library initialises shared async state exactly once (Lazy<Task>, vs-threading AsyncLazy, lock + Task field, SemaphoreSlim double-check, Interlocked/TCS, in-flight coalescing); the token rule for shared init; retry after fault; whether CS-API-01's handshake in CreateAsync removes the need for lazy init; SemaphoreSlim discipline and starvation; the OcxClient thread-safety statement and its test; whether the SDK must serialise concurrent ocx children (read from ocx_store/ocx_util/ocx_project and watched against a main-built ocx).
  Not covered: IAsyncEnumerable and callback ordering (csharp-async-callbacks-and-streaming); disposal and sync bridges (CS-ASYNC-11..15, already decided); the process engine (CS-PROC); the binary download pipeline itself (CS-BIN). Windows was not exercised (no claim here is Windows-only). .NET 11 RC1 was run only by rolling a net10 build forward (no net11 build).
---

# Single-flight shared async state and client thread-safety

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
  - [1. The ocx case: the factory removes lazy init](#1-the-ocx-case-the-factory-removes-lazy-init)
  - [2. Lazy&lt;Task&lt;T&gt;&gt; caches the fault, in every mode](#2-lazytaskt-caches-the-fault-in-every-mode)
  - [3. AsyncLazy&lt;T&gt; from vs-threading: same fault caching, plus a dependency](#3-asynclazyt-from-vs-threading-same-fault-caching-plus-a-dependency)
  - [4. The first-caller-token problem and the token rule](#4-the-first-caller-token-problem-and-the-token-rule)
  - [5. Retry after a fault or cancel: the three working patterns](#5-retry-after-a-fault-or-cancel-the-three-working-patterns)
  - [6. SemaphoreSlim discipline and the starvation trap](#6-semaphoreslim-discipline-and-the-starvation-trap)
  - [7. What state remains: download-once and per-project caches](#7-what-state-remains-download-once-and-per-project-caches)
  - [8. The thread-safety statement and its test](#8-the-thread-safety-statement-and-its-test)
  - [9. Does the SDK serialise anything? What ocx locks](#9-does-the-sdk-serialise-anything-what-ocx-locks)
  - [10. Verified on the toolchain](#10-verified-on-the-toolchain)
- [Normative guidance candidates](#normative-guidance-candidates)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

- **Do the handshake in `CreateAsync` and keep `OcxClient` free of lazily initialised state.** After the factory returns, the client is a bag of `readonly` fields (exe path, handshake result, options snapshot). No `Lazy`, no `SemaphoreSlim`, no `lock`, no `CancellationTokenSource` lives on it. This is the Redis shape (`ConnectionMultiplexer.ConnectAsync`), not the Python `_CompatCell` shape, which exists only because Python's constructor is synchronous.
- **`Lazy<Task<T>>` caches a faulted or cancelled task forever, in every `LazyThreadSafetyMode`**, including `PublicationOnly`. Lazy's exception caching covers only a factory that throws synchronously; an async factory returns a (faulted) `Task` as its successful *value*. Watched red on net8, net10 and the .NET 11 RC1 runtime.
- **`AsyncLazy<T>` from `Microsoft.VisualStudio.Threading` has the same flaw** (it never resets its value) and drags a JoinableTaskFactory-flavoured dependency into a library whose gate allows VS.Threading *analyzers* only. Zero of the 35 exemplars use it outside its own repo.
- **Never hand the first caller's token to shared init.** Caller A cancelling then fails caller B with A's `OperationCanceledException` (watched red). Run shared init under a token the work owns, and give every caller `shared.WaitAsync(cancellationToken)` so cancelling abandons the wait, never the work.
- **The working single-flight is a `lock` around one `Task<T>?` field, with reset on `IsCompleted && !IsCompletedSuccessfully`.** No await under the lock, no discard, no `async void`. It passes retry-after-fault, caller-cancel isolation and exactly-one-spawn under 64 concurrent first calls. Resetting on `IsFaulted` alone still caches a cancelled init (watched red).
- **`Interlocked.CompareExchange` on a `Task` field is wrong unless the task already exists before the CAS.** Starting work to obtain the task to compare means every racing caller spawns (10-27 spawns for 64 callers). The correct CAS form needs a `TaskCompletionSource` plus a detached runner, which collides with CS-ASYNC-16/17, so reject it.
- **When the filesystem is the cache (the `EnsureAsync` download), coalesce while in flight and cache nothing.** Correctness comes from atomic temp-file-plus-`Move(overwrite: false)` (CS-BIN-12), not from a lock: 16 concurrent callers, 15 saw a partial binary with write-in-place, 0 with atomic install.
- **`SemaphoreSlim` rules, each watched:** `await sem.WaitAsync(cancellationToken)` is a statement *before* `try`, `Release()` is in `finally`. Acquire-inside-`try` lets a cancelled waiter release a permit it never held, and a third caller enters beside the real holder. `.Wait()` in async code starved 200 queued operations for 84 s (ideal 1 s) on .NET 10; `await WaitAsync()` took 1.6 s.
- **`await` inside `lock` is `CS1996`, a compile error, on `object` locks and `System.Threading.Lock` alike.** The net8 floor has no `System.Threading.Lock` anyway: use a private `object`.
- **Thread-safety statement for `OcxClient`: "All public members are thread-safe; the instance is immutable after `CreateAsync`; the SDK serialises nothing."** The Azure SDK guideline is the model ("clients are immutable", options are snapshotted). Result types are not guaranteed thread-safe for mutation; they are never mutated by the SDK after return.
- **Enforce immutability with a reflection test, not an analyzer.** IDE0044 and CA2211 (both watched at `error`) catch a never-reassigned field and a public static field, but miss a private field reassigned in a method and a `static readonly List<T>`. The test asserts every instance field is init-only and no property has a plain setter.
- **The SDK needs no serialisation of ocx children.** ocx takes advisory file locks (`fs4`) on its temp/store entries and a keyed project-mutation lock; 8 concurrent pulls of one package and 8 of different packages into one `OCX_HOME` all exited 0, and 8 concurrent `ocx add` into one `ocx.toml` kept all 8 bindings (a naive unlocked writer kept 1-2).
- **Contention surfaces as exit 75, `error.kind = temp_fail`, `error.detail = project_locked`.** The project lock waits at most 500 ms. With 64 concurrent `ocx add` on one `ocx.toml`, 1 to 37 children (varying per run) exited 75 and no file was corrupted; with at most 4 concurrent, 0 failed. Map it to a command exception whose message says "another ocx holds the project lock", and let the caller decide.
- **Proposal for the consolidator:** `project_locked` is the one exit-75 case that is provably retry-safe even for mutating commands (the lock is acquired before any read or write). CS-PROC currently retries 75 for non-mutating commands only; widening it needs an ocx-maintainer confirmation, so it is a SHOULD at most.
- **`Task.WaitAsync` needs net6+, its `TimeProvider` overloads net8+.** Both are inside the net8 floor. A netstandard2.0 target would need its own wait helper.
- **Ban the idioms an agent reaches for:** `Lazy<Task…>` (VSTHRD011 at error, verified firing), `GetOrAdd(key, async …)` (not flagged by any analyzer, use rg), `_task ??= InitAsync(cancellationToken)`, `SemaphoreSlim.Wait()` (CA1849 and VSTHRD103, both watched), `new SemaphoreSlim(1)` without a maximum.

## Findings

### 1. The ocx case: the factory removes lazy init

CS-API-01 fixes the entry point as `public static async Task<OcxClient> CreateAsync(OcxClientOptions? options = null, CancellationToken cancellationToken = default)` with a private constructor; discovery and the `ocx --format json version` handshake run inside it ([csharp-api.md:54](../csharp-api.md), `csharp-api.md:328`). That removes the only lazy-init the Python SDK has.

Python's compat gate is lazy because its constructor is synchronous: the first typed call probes `ocx version` through `gate()`/`gate_async()` and stores a one-slot `_CompatCell`, shared by reference across `with_config` handles; the docstring calls the race "benign: two threads may both probe and both write the same answer" (`ocx-sdk-python@80136dde4162:src/ocx_sdk/_client.py:200-210`, `:811-836`, `:664-675`). The python-sdk-digest row 30 suggested `Lazy<Task>`/`SemaphoreSlim` for the C# port; with an async factory neither is needed, and `Lazy<Task>` would be wrong (section 2).

What the C# client holds after `CreateAsync` returns:

| State | Lifetime | Mutable after creation? | Single-flight needed? |
|---|---|---|---|
| resolved ocx path (CS-BIN-01) | client | no (`readonly string`) | no, computed in the factory |
| handshake result (version, schema_version) | client; shared by reference with `WithOptions` derivations | no (sealed, init-only) | no, `WithOptions` never re-probes (`csharp-api-surface-shape.md:99`) |
| options + environment snapshot | client | no, copied in the factory | no |
| the download (`OcxBootstrap.EnsureAsync`, CS-BIN-06) | process, static, filesystem-backed | the cache directory, atomically | in-flight coalescing is optional (section 7) |
| per-project caches | none in v1 (Python has none either) | n/a | n/a |

Two consequences. First, `OcxClient` is not `IDisposable` (CS-ASYNC-13), so it cannot own a lifetime `CancellationTokenSource`; any shared in-flight work must live in the static `EnsureAsync` helper or not exist. Second, the factory runs under the caller's own token because nothing is shared: a failure or cancel publishes no half-built object (the constructor is private and only runs after the handshake). Cost: every `CreateAsync` spawns ocx once (about 5 ms measured, `ocx-cli-contract.md:95`), so the doc comment must tell callers to create one client and reuse it, as the Azure guideline does ("treat clients as singletons", [Azure SDK blog](https://devblogs.microsoft.com/azure-sdk/lifetime-management-and-thread-safety-guarantees-of-azure-sdk-net-clients/)).

Redis is the closest exemplar: the client is built by `static Task<ConnectionMultiplexer> ConnectAsync(ConfigurationOptions, TextWriter?)` and the handshake happens there (`StackExchange__StackExchange.Redis@e7c43a269f53:src/StackExchange.Redis/ConnectionMultiplexer.cs:606-612`).

### 2. `Lazy<Task<T>>` caches the fault, in every mode

The documentation states the exception-caching rule for factories: "if the factory method throws an exception the first time a thread tries to access the `Value` property, the same exception is thrown on every subsequent attempt", and "When you specify `LazyThreadSafetyMode.PublicationOnly`, exceptions are never cached, even if you specify a factory method" ([Lazy&lt;T&gt; docs](https://learn.microsoft.com/en-us/dotnet/api/system.lazy-1?view=net-10.0)). Agents read the second sentence as a cure for `Lazy<Task>`. It is not.

The source shows why. `ViaFactory` runs `_value = factory();` inside a `try` and stores an exception only if `factory()` itself throws (`dotnet/runtime@v10.0.0:src/libraries/System.Private.CoreLib/src/System/Lazy.cs:314-328`, [source](https://github.com/dotnet/runtime/blob/v10.0.0/src/libraries/System.Private.CoreLib/src/System/Lazy.cs)). An `async` factory does not throw: it returns a `Task`, and a faulted `Task` is a perfectly good successfully-created value. `PublicationOnly` additionally runs the factory on every racing thread (`:367-377`), so it makes the spawn count worse.

```csharp
// INCORRECT: compiles, passes review at a glance, caches the first failure for the life of the client.
private readonly Lazy<Task<string>> _version = new(() => ProbeAsync(CancellationToken.None));
public Task<string> VersionAsync() => _version.Value;

// INCORRECT: PublicationOnly "never caches exceptions" - but there is no exception, only a faulted Task value.
new Lazy<Task<string>>(() => ProbeAsync(CancellationToken.None), LazyThreadSafetyMode.PublicationOnly);
```

Watched on net8.0, net10.0 and the .NET 11 RC1 runtime (fixture `Sf`, gate `lazy-eap` and `lazy-pub`, scenario S1: the first init throws, the second call must succeed):

```
lazy-eap  S1 retry-after-fault=FAIL (starts=1)  S3 64-concurrent=PASS (spawns=1)
lazy-pub  S1 retry-after-fault=FAIL (starts=1)  S3 64-concurrent=FAIL (spawns=9..25)
```

`starts=1` on a second call is the cached fault. Corpus signal: four of the 35 clones use `Lazy<Task<…>>` (Octokit `Readme.cs:30`, Pulumi `Deployment_Prepare.cs:20,527`, Testcontainers `MsSqlContainer.cs:9,20,49`, and the Meziantou test harness `NuGetPackages.cs:17,38`). Testcontainers' version is the full failure set at once: `GetSqlCmdFilePathAsync(CancellationToken ct = default)` ignores `ct` and returns `_lazySqlCmdFilePath.Value`, whose factory `FindSqlCmdFilePathAsync()` takes no token (`testcontainers__testcontainers-dotnet@04cbb73fcc58:src/Testcontainers.MsSql/MsSqlContainer.cs:49,72`). Meziantou's harness shows the call-site cure: it catches, then `Cache.TryRemove(key, out _)` and rethrows (`meziantou__Meziantou.Analyzer@161b7e948ad3:tests/Meziantou.Analyzer.Test/Harness/NuGetPackages.cs:38-46`), a reset-on-fault bolted on from outside, which removes *any* entry under that key, including a newer healthy one. `ConcurrentDictionary.TryRemove(KeyValuePair<TKey,TValue>)` removes only the exact pair ([TryRemove](https://learn.microsoft.com/en-us/dotnet/api/system.collections.concurrent.concurrentdictionary-2.tryremove?view=net-10.0)).

Analyzer coverage: `VSTHRD011` flags `Lazy<Task<T>>` construction and `.Value` use as "can deadlock. Use AsyncLazy<T> instead" and fired at `error` in the fixture (`red/Red.cs(11,35)`). The rule's *reason* is a JoinableTaskFactory deadlock ([VSTHRD011](https://microsoft.github.io/vs-threading/analyzers/VSTHRD011.html)), unrelated to fault caching, and its fix (`AsyncLazy`) is wrong for this SDK (section 3). Keep the rule on because it blocks the construct; document that the suggested fix must not be applied. `BannedSymbols.txt` cannot ban `Lazy<Task<>>` specifically (the symbol syntax names the open generic `T:System.Lazy\`1`), and banning it wholesale would break the legitimate `Lazy<string>`.

### 3. `AsyncLazy<T>` from vs-threading: same fault caching, plus a dependency

`AsyncLazy<T>` fixes the *deadlock* (JoinableTask join on the first caller) and the *token* problem for waiters (section 4), but not the fault. After the first `GetValueAsync` the factory field is nulled and `this.value` holds the task for good; nothing ever resets it (`microsoft__vs-threading@f6d817997090:src/Microsoft.VisualStudio.Threading/AsyncLazy\`1.cs:166-262`, `:199` `this.valueFactory = null`, `:234` `this.value = this.joinableTask.Task`). Watched red: gate `asynclazy`, scenario S1 `FAIL (starts=1)`.

Its token handling is correct and is the model for section 4: the factory is a `Func<Task<T>>` that receives no token, and `GetValueAsync(CancellationToken)` documents "this will not cancel the value factory (since other callers may exist)", returning `this.value.WithCancellation(cancellationToken)` (`AsyncLazy\`1.cs:152-158,258`). The only cancellation check before start is `cancellationToken.ThrowIfCancellationRequested()` at `:196`.

Decision: do not depend on `Microsoft.VisualStudio.Threading`. CS-BUILD allows `Microsoft.VisualStudio.Threading.Analyzers` only; the library package brings `JoinableTaskFactory` and `Microsoft.VisualStudio.Validation`, none of it needed for a process wrapper, and it still would not reset. The cost of writing the 12-line lock gate (section 5) is lower than the dependency. Hand-copied AsyncLazy snippets (Stephen Toub 2011, Stephen Cleary 2012, `Lazy<Task<T>>` wrapped in `Task.Run`) have the identical fault-caching flaw; they are historical ([Cleary](https://blog.stephencleary.com/2012/08/asynchronous-lazy-initialization.html), shipped later in Nito.AsyncEx).

The BCL has no async lazy and none is planned: a maintainer wrote of the related `ConcurrentDictionary.GetOrAddAsync` proposal "I don't foresee us adding async methods to ConcurrentDictionary", noting the helpers can be built from the `Try*` primitives ([dotnet/runtime#83636](https://github.com/dotnet/runtime/issues/83636), comment 2023-03-18, issue still open at 2025-07-06).

### 4. The first-caller-token problem and the token rule

If shared init is started with caller A's token, A cancelling cancels the work every other waiter is awaiting. Caller B, whose token never fired, gets A's `OperationCanceledException`.

```csharp
// INCORRECT: the first caller's token drives the shared task; A's cancel fails B.
lock (_gate) { if (_task is null || _task.IsFaulted) _task = InitAsync(cancellationToken); return _task; }

// INCORRECT: same flaw in ??= form, and ??= is not atomic either.
return _initTask ??= InitAsync(cancellationToken);
```

Watched (fixture gate `firsttoken`, scenario S2: A starts init, B joins 50 ms later, A cancels at 100 ms):

```
firsttoken  S2 caller-cancel=FAIL   [firsttoken] A=TaskCanceledException (own token: True)  B=TaskCanceledException
singleflight S2 caller-cancel=PASS  [singleflight] A=TaskCanceledException (own token: True)  B=ok   (starts=1)
```

The rule has two halves.

1. **Shared init runs under a token the work owns, never a caller's.** Either `CancellationToken.None` or a source whose lifetime matches the work. For a type that is `IDisposable`, a client-owned `CancellationTokenSource` cancelled in `Dispose`. For OcxClient (not disposable) nothing is shared, so there is nothing to own. For the static `EnsureAsync` helper, a `new CancellationTokenSource(downloadTimeout, timeProvider)` bound, so an abandoned download still ends.
2. **Every caller waits with `shared.WaitAsync(cancellationToken)`.** "Gets a `Task` that will complete when this `Task` completes or when the specified `CancellationToken` has cancellation requested", throwing `OperationCanceledException` stored in the returned task ([Task.WaitAsync](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.task.waitasync?view=net-10.0), monikers net-6.0 to net-11.0; the `TimeSpan, TimeProvider, CancellationToken` overload is net-8.0 and later). The exception carries the caller's token: `oce.CancellationToken == tokenA` was `True` in every gate, so CS-ASYNC-08's `catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)` classification works unchanged. The exception type is `TaskCanceledException` (a subclass), not the base type, so assert with `is OperationCanceledException`, never `GetType() ==`.

Exemplars show three answers to the same problem:

- **Own the work, wait per caller** (vs-threading `AsyncLazy`: factory has no token, `WithCancellation(ct)` per caller; `AsyncLazy\`1.cs:152-158,258`).
- **Retry loop when a waited task was cancelled by someone else.** Azure's `AccessTokenCache` makes the first caller run the credential call with *its* `message.CancellationToken` and, on cancel, `CurrentTokenTcs.SetCanceled()`; waiters that were not cancelled themselves catch `TaskCanceledException when (!message.CancellationToken.IsCancellationRequested)` and loop up to 3 times (`Azure__azure-sdk-for-net@32c48fc3d524:sdk/core/Azure.Core/src/Pipeline/BearerTokenAuthenticationPolicy.cs:346-398`, state swap under `lock (_syncObj)` at `:421`, new TCS when `IsCurrentTokenTcsFailedOrExpired` at `:451-453`). It works but costs a retry loop, a counter and a TCS state machine; section 5's gate avoids all three by never tying the work to a caller.
- **Serialise, winner's token drives its own attempt.** Npgsql and Anthropic (section 5, pattern C).

### 5. Retry after a fault or cancel: the three working patterns

All three pass the same three tests (retry after fault, caller-cancel isolation, 64 concurrent first calls, exactly one spawn against the fake). Matrix from `./run-all.sh` (net10.0; net8.0 and the .NET 11 RC1 roll-forward are identical in pass/fail):

| Gate (fixture `Sf/Gates.cs`) | S1 retry after fault | S2 caller-cancel isolation | S3 64 concurrent, one spawn | Verdict |
|---|---|---|---|---|
| `LazyTaskGate` ExecutionAndPublication (`:10`) | FAIL | pass | pass | reject: caches fault |
| `LazyTaskGate` PublicationOnly | FAIL | pass | FAIL (9-25 spawns) | reject |
| `AsyncLazyGate` (vs-threading) | FAIL | pass | pass | reject: caches fault, dependency |
| `FirstCallerTokenGate` (`:19`) | pass | FAIL | pass | reject: first-caller token |
| `FaultedOnlyGate` (`:116`) | FAIL on a cancelled init (`S1c`) | pass | pass | reject: resets on `IsFaulted` only |
| `RacyGate` (`:34`) | pass | pass | FAIL (47-50 spawns) | reject: check-then-act |
| `CasStartedTaskGate` (`:46`) | FAIL | pass | FAIL (10-27 spawns) | reject: losers start work to get a Task to CAS |
| **`SingleFlightGate`** (`:70`) | pass | pass (starts=1) | pass | **A: use for in-memory results** |
| `CoalesceGate` (`:127`) | pass | pass (starts=1) | pass | **B: use when the filesystem is the cache** |
| `SemaphoreGate` (`:143`) | pass | pass (starts=2) | pass | C: acceptable, wastes one init on a winner cancel |
| `CasTcsGate` (`:93`) | pass | pass | pass | reject: needs `async void` or a discarded task (CS-ASYNC-16/17) |

**Pattern A, the single-flight gate (recommended when the result is held in memory).**

```csharp
// CORRECT: lock guards the field only; init is started under a token the work owns; reset on any non-success completion;
// each caller waits on its own token. No await under the lock, no discard.
private readonly object _gate = new();
private Task<Handshake>? _task;

public Task<Handshake> GetAsync(CancellationToken cancellationToken)
{
    Task<Handshake> shared;
    lock (_gate)
    {
        if (_task is null || (_task.IsCompleted && !_task.IsCompletedSuccessfully))
            _task = InitAsync(_ownedToken);        // runs synchronously only until its first await
        shared = _task;
    }
    return shared.WaitAsync(cancellationToken);    // caller cancel abandons the wait, never the work
}
```

The reset condition is `IsCompleted && !IsCompletedSuccessfully`, covering both Faulted and Canceled. `IsFaulted` alone cached a `TaskCanceledException` from an init that timed out (S1c, watched red); an HttpClient timeout surfaces exactly as `TaskCanceledException`, so this is the realistic case. The init task is stored and returned to its callers, so it is not fire-and-forget under CS-ASYNC-17. If every waiter cancels and the init later faults, nobody observes the fault until the next caller replaces and awaits it; `UnobservedTaskException` fires only when the task is finalised (not run in this fixture, taken from the documented behaviour).

**Pattern B, in-flight coalescing (when the filesystem or another store is the cache).**

```csharp
// CORRECT for EnsureAsync: callers arriving while a run is in flight share it; nothing is cached afterwards,
// so a fault needs no reset and a success is found on disk by the next caller.
lock (_gate) { _inflight ??= RunAsync(); return _inflight.WaitAsync(cancellationToken); }

private async Task<string> RunAsync()
{
    try { await Task.Yield(); return await InstallAsync(_ownedToken).ConfigureAwait(false); }
    finally { lock (_gate) _inflight = null; }
}
```

The `Task.Yield()` is load-bearing: if `InstallAsync` completes synchronously, the `finally` clears `_inflight` *before* `??=` assigns it, and a completed task is then stored forever. Watched: `coalesce` passes S1 to S3.

**Pattern C, `SemaphoreSlim(1,1)` double-check (Npgsql, Anthropic).** The caller waits on the semaphore with its own token, re-checks the result, runs init under its own token, and a failure leaves the result unset so the next waiter takes over (`npgsql__npgsql@9c47244547c2:src/Npgsql/NpgsqlDataSource.cs:91,289-330`; `anthropics__anthropic-sdk-csharp@ae16e5933f39:src/Anthropic/Credentials/TokenCache.cs:19,100-132`). No shared task exists, so the first-caller problem cannot arise; the price is that a cancelling winner wastes its init and the next waiter starts a second one (fixture S2: `starts=2`, i.e. a second ocx spawn). Acceptable for a cheap init, not for a 20 MB download.

**Interlocked on a Task field.** `Interlocked.CompareExchange(ref _task, mine, null)` needs `mine` to exist, which means calling the initializer first; every racing caller does, then all but one result is discarded (gate `cas-started`: 10 to 27 spawns for 64 callers). The correct version creates a `TaskCompletionSource` first, then needs a detached runner (`async void` or `_ = RunAsync(tcs)`), which CS-ASYNC-16 and CS-ASYNC-17 forbid (gate `cas-tcs` passes behaviourally but is rejected on rules). Use the lock.

### 6. `SemaphoreSlim` discipline and the starvation trap

Facts from the type's documentation ([SemaphoreSlim](https://learn.microsoft.com/en-us/dotnet/api/system.threading.semaphoreslim?view=net-10.0)): "The `SemaphoreSlim` class doesn't enforce thread or task identity on calls to `Wait`, `WaitAsync`, and `Release`... It is the programmer's responsibility to ensure that calls to `Wait` or `WaitAsync` methods are appropriately paired with calls to `Release`"; there is "no guaranteed order, such as FIFO or LIFO"; all members are thread-safe "with the exception of `Dispose()`, which must be used only when all other operations on the `SemaphoreSlim` have completed".

**Acquire before `try`.**

```csharp
// INCORRECT: if WaitAsync throws (token cancelled), the finally still runs Release() for a permit never acquired.
try { await _sem.WaitAsync(cancellationToken); return await DoAsync(cancellationToken); }
finally { _sem.Release(); }

// CORRECT: a cancelled wait owns nothing, so it never reaches the try.
await _sem.WaitAsync(cancellationToken).ConfigureAwait(false);
try { return await DoAsync(cancellationToken).ConfigureAwait(false); }
finally { _sem.Release(); }
```

Watched (fixture `sem-cancel`): a holder holds a `SemaphoreSlim(1,1)`; a second waiter with a 100 ms token is cancelled; with acquire-inside-`try` `CurrentCount` was `1` while the holder still held it and a third caller's `WaitAsync(0)` returned `True` (mutual exclusion gone); the correct form kept `0` and `False`. The `(1,1)` maximum turns a *later* over-release into `SemaphoreFullException`; it is a tripwire, not a guard, and `new SemaphoreSlim(1)` (no maximum) lets the count climb silently. The same nesting is correct in Polly's bulkhead: the queued-actions permit is acquired at line 15 *before* the outer `try` whose `finally` releases it, the parallelisation `WaitAsync(cancellationToken)` is inside that `try` but has its own inner `try/finally` that releases only after acquisition (`App-vNext__Polly@e4476096da5b:src/Polly/Bulkhead/AsyncBulkheadEngine.cs:15-37`). Toub's original `AsyncSemaphore` example puts `await m_lock.WaitAsync();` before `try` too ([AsyncLock, part 6](https://devblogs.microsoft.com/dotnet/building-async-coordination-primitives-part-6-asynclock/)).

**Never `Wait()` in async code; the starvation number.** The runtime docs describe thread-pool starvation as blocked pool threads outrunning the pool's thread injection, and list `SemaphoreSlim.Wait` among the blocking operations ([starvation guide](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/debug-threadpool-starvation)). Watched (fixture `starve`, .NET 10.0.12, 32 cores, `SetMinThreads(2, …)` to simulate a small container): 200 operations that each take a `SemaphoreSlim(1,1)` and `await Task.Delay(5)` (ideal ~1 s serialised):

| Variant | Result |
|---|---|
| `sem.Wait()` in the async method | did not finish in 8 s; finished in **83,995 ms** with a 120 s ceiling; pool grew to 116 threads |
| `await sem.WaitAsync().ConfigureAwait(false)` | **1,602 ms**, 7-11 pool threads |

The starvation guide says the pool scales faster since .NET 6 "in response to certain blocking Task APIs"; this case shows the semaphore is not one of them. The pool minimum was lowered on purpose, so the absolute number is a worst case; the ratio and the thread count are the evidence. `CA1849` and `VSTHRD103` both fire on the pattern (watched: `red/Red.cs(29,9) CA1849`, `(29,14) VSTHRD103`).

**`lock` never spans an `await`.** `lock (_gate) { return await ProbeAsync(); }` is `CS1996: Cannot await in the body of a lock statement` (watched). The language docs: "You can't use the await expression in the body of a lock statement", and since .NET 9/C# 13 a dedicated `System.Threading.Lock` is preferred ([lock statement](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/lock)). The net8 floor (CS-BUILD) has no `System.Threading.Lock`; a private `readonly object _gate = new();` compiles on both TFMs. Hold the lock only to read or swap the `Task` field (Pattern A), never around the init.

**Dispose.** If a type owns a `SemaphoreSlim` it is `IDisposable` (CA1001 fired on the red fixture: "owns disposable field(s) `_sem` but is not disposable"). That is one more reason `OcxClient` keeps none.

**Corpus.** 133 files in the clones use `WaitAsync(`; the exemplar shapes are Npgsql (`WaitAsync(timeout, cancellationToken)` then double-check), Anthropic `TokenCache` (`WaitAsync(cancellationToken)` then double-check then `Release()` in `finally`, plus a non-blocking `Wait(0)` for the background refresh at `:138`), and Testcontainers' `Resource.AcquireLockAsync(ct)` returning an `IDisposable` whose `Dispose` releases (`testcontainers__testcontainers-dotnet@04cbb73fcc58:src/Testcontainers/Resource.cs:62-70`). The `.Wait(` exceptions are Polly's separate *synchronous* engine (`BulkheadEngine.cs:15,23`) and Redis's sentinel `.Wait()` on a non-async path (`ConnectionMultiplexer.Sentinel.cs:81,555`).

### 7. What state remains: download-once and per-project caches

**Download-once (`EnsureAsync`, CS-BIN-06/12).** It is static, has no client, and its cache is a directory. Two layers:

1. **Correctness: atomic install, no lock.** Write to a unique temp file in the target directory, then `File.Move(tmp, final, overwrite: false)`; if it throws `IOException` and `final` exists, delete the temp and treat the winner's file as the result. Watched (fixture `install-race`, 16 callers staggered 5 ms, a 4 MiB payload): write-in-place left 15 callers holding a partial binary (reproducible 5/5 runs), temp-plus-move left 0 and no temp leftovers. CS-BIN-12 already requires the temp-plus-move shape for the running-binary reason; this adds the concurrency reason and the `overwrite: false` + catch for the loser. On Windows a loser's `overwrite: true` onto an already-running `ocx.exe` fails (CS-BIN-12 measurement), another reason to prefer `overwrite: false`.
2. **Cost: in-flight coalescing (Pattern B), optional.** Without it, 64 concurrent first calls download 64 archives and 63 are discarded. With it, one. Both are correct; coalescing is an optimisation, and its token is an owned `CancellationTokenSource(timeout, timeProvider)`, never a caller's.
3. **No cross-process lock** (named `Mutex`, `FileShare.None` sentinel files). Atomic rename already makes two processes safe, and a stale lock file is a new failure mode.

**Per-project caches.** None in v1. The Python client has none (`_CompatCell` is its only memo). If a per-key cache ever appears, `ConcurrentDictionary<K, Task<V>>.GetOrAdd(key, k => FetchAsync(k))` is wrong twice: "valueFactory may be called multiple times, but only one key/value pair will be added" and the factory runs outside the dictionary's locks ([GetOrAdd](https://learn.microsoft.com/en-us/dotnet/api/system.collections.concurrent.concurrentdictionary-2.getoradd?view=net-10.0)), and it caches the fault (section 2). The shape that works is a plain `Dictionary<K, Task<V>>` under the same `lock` as Pattern A, removing the exact entry on non-success.

### 8. The thread-safety statement and its test

**What to state.** The Azure SDK guideline is the strongest public precedent: "{MUST} be thread-safe. All public members of the client type must be safe to call from multiple threads concurrently", with the rationale that this makes "the recommendation of reusing client instances always safe", model types "aren't required to be thread-safe, as they're rarely shared between threads", and "clients are immutable after being created", with the example that mutating the options object after construction "has no effect on the client" ([guideline](https://github.com/Azure/azure-sdk/blob/main/docs/dotnet/introduction.md) lines 464-466 and 788; [blog](https://devblogs.microsoft.com/azure-sdk/lifetime-management-and-thread-safety-guarantees-of-azure-sdk-net-clients/)). The BCL puts the statement in a "Thread Safety" section of the type page ("All public and protected members of `SemaphoreSlim` are thread-safe... with the exception of `Dispose()`"; for `Lazy<T>` "Making the `Lazy<T>` object thread safe does not protect the lazily initialized object"). In source, StackExchange.Redis writes it as a remark paragraph, and the same file family states the negative case just as plainly: `<para>All members of this class are thread safe.</para>` on `LuaScript` (`StackExchange__StackExchange.Redis@e7c43a269f53:src/StackExchange.Redis/LuaScript.cs:19`) and `<para>This type is not threadsafe.</para>` on `ProfiledCommandEnumerable` (`src/StackExchange.Redis/Profiling/ProfiledCommandEnumerable.cs:15`). Anthropic's credentials interface does the same for implementers: "Implementations must be thread-safe" (`anthropic-sdk-csharp@ae16e5933f39:src/Anthropic/Credentials/IAccessTokenProvider.cs:13`).

Recommended text for `OcxClient` (XML doc hygiene belongs to the code-docs set; the content is this):

```csharp
/// <remarks>
/// <para>This type is thread-safe. Every public member may be called concurrently from any number of threads and tasks.
/// An instance is immutable after <see cref="CreateAsync"/>: it holds the resolved binary path, the version handshake and a
/// snapshot of the options and environment, and later changes to the options object or to process environment variables
/// have no effect on it. Create one client and reuse it.</para>
/// <para>The SDK does not serialise commands. Concurrent commands against one <c>OCX_HOME</c> are safe (ocx locks its store);
/// concurrent mutating commands on one project file can fail with exit code 75 (<c>project_locked</c>) and are safe to retry.</para>
/// <para>Result types are not synchronised; the SDK never mutates them after returning.</para>
/// </remarks>
```

**What makes it true.** (1) `CreateAsync` snapshots `OcxClientOptions` (the mutable-options trap: a client keeping the caller's reference changed from 30 s to 1 s when the caller mutated it; watched, fixture `options`) and the environment (CS-BIN-03 already reads a "caller's environment snapshot"). (2) No per-client scratch: a shared `StringBuilder` stdout buffer made all 64 concurrent callers read each other's output in the bad client (`mismatched=63..64` of 64), per-call locals made it 0 (fixture `client`; the fake's `echo` verb sleeps 100 ms so the calls overlap). (3) Process state is per-call: `Process` objects, pipes and the byte pumps (CS-PROC) are locals of one call.

**How to test it** (two tests, both watched red then green):

1. *Concurrency test:* 64 concurrent `client.XAsync(uniqueId)` through one client against `Ocx.Fake`'s echo verb; assert each result carries its own id, and elapsed time is below the sequential bound. Pair it with `--minimum-expected-tests` (CS-TEST) so a skipped test is red.
2. *Immutability test (reflection):* for `OcxClient`, the options snapshot and the handshake type, assert every instance field is `IsInitOnly`, no public property has a plain `set` (an `init` setter carries the `IsExternalInit` modifier), and no mutable static field exists. Fixture `immutable`: `MutableClient` with a private `_lastStderr` assigned in a method reported `[_lastStderr]`, exit 1; `ImmutableClient` reported `[]`.

Why a reflection test and not only analyzers: with `EnforceCodeStyleInBuild` and the IDs set to `error`, `IDE0044` ("Make field readonly") and `CA2211` ("Non-constant fields should not be visible") both fired on the planted bad fixture, but neither flagged `_lastStderr` (reassigned in a method) nor `private static readonly List<string> Seen` (mutable object behind a readonly reference). Those need the reflection test and an rg heuristic respectively.

**Python reference.** The Python docstring makes the same promise in one sentence: "the handle exposes no mutators, so it is safe to share across threads, tasks, and event loops" (`ocx-sdk-python@80136dde4162:src/ocx_sdk/_client.py:220-223`). The port keeps the promise and replaces the benign-race memo with the factory.

### 9. Does the SDK serialise anything? What ocx locks

**Reading `ocx_store` and its neighbours** (ocx at `a23ec5be2939`, the checkout read; the binary exercised below was built from the main branch by the csharp-process-real-ocx run):

- Store and temp entries use advisory file locks through `fs4`: `FileLock::try_exclusive`, `lock_exclusive_with_timeout`, `lock_shared_with_timeout` (`crates/ocx_util/src/fs/file_lock.rs`, wrapped by `LockedFile`). `TempStore::try_acquire` takes a non-blocking exclusive lock on a per-entry lock file and clears leftovers; `acquire_with_timeout` blocks (`crates/ocx_store/src/file_structure/temp_store.rs:116-131`). Default wait 60 s (`DEFAULT_LOCK_TIMEOUT`, `crates/ocx_util/src/fs/locked_file.rs:16`); the local pull lock waits 5 s (`PULL_LOCAL_LOCK_TIMEOUT`, `crates/ocx_package_manager/src/tasks/pull.rs:36`).
- `ocx.toml` mutation takes a project mutation lock keyed by the file's directory identity and never held on the file itself, because "the rename publish rotates its inode"; contention waits at most `CONTENTION_BUDGET = 500 ms`, then fails as `ProjectErrorKind::Locked` (`crates/ocx_project/src/project_lock.rs:1-60`). Commands publish whole files by atomic rename (`mutate.rs publish_by_rename`).
- The storage page: `locks/` holds "cross-process lock files — content-keyed... also holds the project mutation mutex for every ocx.toml this machine has written to" (`website/src/docs/in-depth/storage.md`, `locks/` node; `ocx-cli-contract.md:95`).
- The failure is a documented, schema'd error: `project_locked` is an `error.detail` slug (`crates/ocx_schema/tests/golden/errors.json:1977`), reported as exit 75, `error.kind = temp_fail`.

**Watched against a real ocx** (`real/concurrent-ocx.sh 8 64`, registry:2 on 127.0.0.1:55422, `OCX_HOME` fresh per section; binary `csharp-process-real-ocx/bin/main/ocx`):

```
A: 8 concurrent 'package pull' of the SAME package into a fresh shared OCX_HOME:   exit codes 8x0; 1 content dir
B: 8 concurrent 'package pull' of 8 DIFFERENT packages into the same OCX_HOME:      exit codes 8x0; 8 content dirs (expected 8)
C: 8 concurrent 'ocx add' of 8 packages into ONE ocx.toml:                          exit codes 8x0; bindings 8/8
D: 64 concurrent 'ocx add' (8 packages x 8) into ONE ocx.toml:                     exit codes 63x0 + 1x75 (this run); bindings 8/8 (an earlier run: 27x0 + 37x75)
```

`real/lostupdate-detector.sh` is the planted-bad twin for section C: 8 naive unlocked read-modify-write "adds" ended with 1 to 2 bindings of 8 (red), proving the "bindings == 8" counter can see a lost update; ocx's own run kept all 8.

The exit-75 document (`{"exit_code":75,"error":{"kind":"temp_fail","detail":"project_locked",...}}`) appears only past the 500 ms budget. `real/bulkhead.sh` caps concurrency with `xargs -P K` over the same 64 adds (what a per-project `SemaphoreSlim(K)` inside the SDK would do):

```
at most 1, 2, 4 concurrent:  64x0     bindings 8   (both runs)
at most 8 concurrent:        64x0 or 63x0+1x75
at most 16:                  60x0+4x75         at most 32: 41..55x0 + 9..23x75       at most 64: 43..62x0 + 2..21x75
```

(Ranges are across the repeated runs; the counts depend on machine load.) No run produced a corrupted or partial `ocx.toml`; `ocx status` on the contended project reported `lock.present: true, current: true`.

**Decision: the SDK serialises nothing in v1.** Reasons: (1) correctness never depends on it; ocx already makes cross-process and cross-thread store access safe, and an in-process lock would not cover a second process or a human's terminal anyway; (2) an SDK-side keyed `SemaphoreSlim` is new shared state (a dictionary of semaphores with canonical-path keys and eviction) that the Python SDK never needed; (3) it would hide exit 75 from the caller in one configuration and not in another. What the SDK does instead: classify exit 75 with `detail == "project_locked"` as a transient command failure whose message names the project and says nothing changed, and put "limit concurrent mutations of one `ocx.toml` to about 4" in the client's doc remarks. The measured knee is between 4 and 8 on this machine, so say "about", not a hard number.

**Open point for the consolidator (not decided here).** CS-PROC retries exit 75 for non-mutating commands only. `project_locked` is raised while acquiring the lock, before the project file is read or written (`project_lock.rs:56-60` "Under the lock, before the caller reads"; `add.rs:42` "Parsed before the flock"), and 3 contended runs left every file intact, so a bounded retry (for example 3 attempts, 100-400 ms jittered, through `TimeProvider`) of exactly that slug is safe. Other exit-75 causes (registry unreachable) are not provably pre-mutation, so the widening must key on `detail`, not on the exit code. This needs an ocx-maintainer yes before it ships as a MUST; it is written as SF-17 (MAY) below.

### 10. Verified on the toolchain

Fixture root: `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-async-single-flight-and-thread-safety/` (parent `global.json` pins SDK 10.0.401). Everything below is reproduced by `./run-all.sh` (output kept in `results.txt`; 27 of 27 exit-code expectations matched) and `real/concurrent-ocx.sh 8 64`, `real/bulkhead.sh <run-prefix>`, `real/lostupdate-detector.sh` (output kept in `results-real.txt`).

| Check | Red command and observed output | Green command and observed output |
|---|---|---|
| S1 fault caching | `run.sh dotnet Sf/bin/Release/net10.0/Sf.dll gate lazy-eap S1` -> `lazy-eap S1: FAIL (starts/spawns=1)`, exit 1; same for `lazy-pub`, `asynclazy` | `... gate singleflight S1` -> `PASS (starts/spawns=2)`, exit 0 |
| S1c cancelled init cached | `... gate faultedonly S1c` -> `FAIL (starts/spawns=1)`, exit 1; `lazy-eap S1c` FAIL | `... gate singleflight S1c` -> `PASS (starts/spawns=2)`, exit 0 |
| S2 first-caller token | `... gate firsttoken S2` -> `A=TaskCanceledException (own token: True)  B=TaskCanceledException`, `FAIL`, exit 1 | `... gate singleflight S2` -> `B=ok`, `PASS (starts=1)`, exit 0; `semaphore` passes with `starts=2` |
| S3 64 concurrent first calls, spawn count (the fake is `dotnet exec Sf.dll --fake version`, one file line per spawn) | `gate racy S3` -> 50 spawns; `cas-started` 24; `lazy-pub` 25; exit 1 | `gate singleflight S3`, `coalesce`, `semaphore` -> `spawns=1`, exit 0 |
| S4 64 concurrent commands, one client | `Sf.dll client bad` -> `mismatched=64 elapsed=265 ms`, exit 1 | `Sf.dll client good` -> `mismatched=0 elapsed=252 ms`, exit 0 |
| S5 options snapshot | `Sf.dll options bad` -> `timeout after caller mutation = 1s (expected 30)`, exit 1 | `options good` -> `30s`, exit 0 |
| S6a acquire-inside-try | `Sf.dll sem-cancel bad` -> `CurrentCount while held=1 (expected 0), intruder entered=True`, exit 1 | `sem-cancel good` -> `=0 ... intruder entered=False`, exit 0 |
| S6b starvation | `Sf.dll starve bad` -> `completed=False in 9007 ms (ideal ~1000), peak pool threads=40`, exit 1 (with `STARVE_TIMEOUT_MS=120000`: `completed=True in 83995 ms`, 116 threads) | `starve good` -> `completed=True in 1620 ms`, 7 threads, exit 0 |
| S7 install race | `Sf.dll install-race bad` -> `callers that saw a partial binary = 15`, exit 1 (5/5 runs) | `install-race good` -> `= 0; leftover temp files = 0`, exit 0 |
| S8 immutability test | `Sf.dll immutable bad` -> `MutableClient mutable members = [_lastStderr]`, exit 1 | `immutable good` -> `[]`, exit 0 |
| Analyzer gate (`Cs.csproj`, `AnalysisLevel 10.0-all`, TWAE, VS.Threading.Analyzers 18.7.23) | `run.sh dotnet build Cs -p:Variant=red` -> build exit 1: `VSTHRD011 (11,35)`, `VSTHRD003 (15,43)`, `CS1996 (23,20)`, `VSTHRD103 (29,14)`, `CA1849 (29,9)`, `CA1001 (4,21)` | `-p:Variant=green` -> `0 Warning(s) 0 Error(s)`, exit 0 |
| Immutability analyzers (`EnforceCodeStyleInBuild`, `.editorconfig` IDE0044/CA2211 = error) | `-p:Variant=red2` -> `IDE0044 (5,20)`, `CA2211 (6,23)`; does not flag `_lastStderr` or `static readonly List<string>` | `-p:Variant=green2` -> 0/0 |
| rg heuristics | `rg -n -U -P 'try\s*\{\s*(//[^\n]*\s*)*(var\s+\w+\s*=\s*)?await\s+[\w.]+\.WaitAsync\(' Cs/red Cs/green --glob '*.cs'` -> `Cs/red/Red.cs:36-38` only; SF-04 regex -> `Sf/Gates.cs:27` only | green dir: no output |
| Real ocx (sections A-D above) | lost-update detector: `bindings in file: 1..2 (expected 8)`; K >= 16 concurrent adds: exit 75 appears | ocx: 8/8 bindings, 8x exit 0 at 8 concurrent; K <= 4: 64x0 |
| Runtime spread | the matrix is identical in pass/fail on `.NET 8.0.31`, `.NET 10.0.12` and `.NET 11.0.0-rc.1.26425.128` (a net10 build rolled forward with `DOTNET_ROLL_FORWARD=LatestMajor DOTNET_ROLL_FORWARD_TO_PRERELEASE=1`) | |

Limits of the evidence: the rg acquire-inside-try pattern matched Polly's correct bulkhead (`AsyncBulkheadEngine.cs:21-23`) as a false positive because it checks syntax, not which semaphore the `finally` releases; one real hit also appeared in Azure.Core (`TokenExchangeManagedIdentitySource.cs`, not inspected). It is therefore a review aid, not a gate. The starvation absolute numbers depend on `SetMinThreads(2, …)` and the host. Windows and macOS were not run.

## Normative guidance candidates

Numbering is local (SF-nn); the consolidator assigns CS-ASYNC ids. "Verify" gives the mechanical check.

**SF-01 (MUST) `CreateAsync` performs discovery and the handshake; `OcxClient` and every type reachable from it hold no lazily initialised state.** No `Lazy<>`, `AsyncLazy<>`, `SemaphoreSlim`, `lock`, `Interlocked` or `CancellationTokenSource` field in client, options-snapshot or handshake types. Rationale: nothing is left to initialise, and all four primitives are bug magnets (sections 2-6).
Verify: `rg -n -e 'Lazy<' -e 'AsyncLazy' -e 'SemaphoreSlim' -e 'CancellationTokenSource' -e '\block\s*\(' -e 'Interlocked\.' src/Ocx/Client src/Ocx/Options` prints nothing (adapt the directory operands to the layout; allow-list only the static install helper).

**SF-02 (MUST) Do not wrap an async factory in `Lazy<>`.** No `Lazy<Task…>`, `Lazy<ValueTask…>`, `ConcurrentDictionary<…, Lazy<Task…>>`, `ConcurrentDictionary<…, Task…>.GetOrAdd(key, …Async…)`. Rationale: a faulted or cancelled task is cached as a value in every mode; `GetOrAdd` also runs the factory more than once.
Verify: `VSTHRD011` severity `error` (verified firing on `Lazy<Task<string>>`); `rg -n -P -e 'Lazy<\s*(Value)?Task' -e 'GetOrAdd(Async)?\(.*(Async|Task)' src/` prints nothing. Do not apply VSTHRD011's "use AsyncLazy<T>" fix.

**SF-03 (MUST) Do not reference `Microsoft.VisualStudio.Threading` (the library); only `Microsoft.VisualStudio.Threading.Analyzers`.** Rationale: `AsyncLazy<T>` never resets a fault and the package pulls JoinableTask machinery.
Verify: `rg -n -e 'Microsoft\.VisualStudio\.Threading"' -g 'Directory.Packages.props' -g '*.csproj' .` prints nothing (the analyzers package id ends in `.Analyzers"`, so it does not match).

**SF-04 (MUST) Shared init never receives a caller's token.** It runs under `CancellationToken.None`, an owned `CancellationTokenSource` (disposable types only), or `new CancellationTokenSource(timeout, timeProvider)` for the static install helper. A linked source over a caller token is also forbidden. Rationale: A's cancel would fail B (watched).
Verify: `rg -n -P '_\w*[tT]ask\w*\s*(\?\?=|=)\s*[\w.]+\(\s*(ct|cancellationToken)\b' src/` prints nothing (matched only the planted bad line `Sf/Gates.cs:27`); review heuristic: in any method that assigns a `Task` field, the initializer call's argument must not be a parameter of that method.

**SF-05 (MUST) Every caller of shared work waits with `shared.WaitAsync(cancellationToken)` (net6+; with a timeout, `WaitAsync(timeout, timeProvider, cancellationToken)`, net8+).** No `Task.WhenAny(shared, Task.Delay(…))`, no `Task.Delay(Timeout.Infinite, ct)` race. Rationale: cancel abandons the wait, not the work, and the exception carries the caller's token.
Verify: `rg -n -e 'Task\.WhenAny\(' -e 'Delay\(Timeout\.Infinite' src/` prints nothing; a unit test per shared-state helper asserts `oce.CancellationToken == callerToken` (S2).

**SF-06 (MUST) Reset a shared task on `IsCompleted && !IsCompletedSuccessfully`, never on `IsFaulted` alone.** Rationale: `IsFaulted` leaves a cancelled init (HttpClient timeout) cached forever (S1c, watched).
Verify: `rg -n -e '\.IsFaulted' src/` has no hit inside a reset condition (review each hit); test S1 and S1c for every single-flight helper.

**SF-07 (MUST) A single-flight helper is a `lock` around the `Task<T>?` field with no `await` in the locked region, and exposes no discarded task, `async void` or `Interlocked.CompareExchange(ref task, …)` on a task created beforehand.** Rationale: Pattern A passes S1-S3; the CAS form either spawns once per racer or needs a detached runner (CS-ASYNC-16/17).
Verify: `CS1996` (compile error) for await under lock; `rg -n -e 'Interlocked\.CompareExchange\(ref\s+_\w*[tT]ask' src/` prints nothing; the three tests S1/S2/S3 exist and run against `Ocx.Fake` (spawn counted in a file, assert `== 1` for 64 concurrent first calls).

**SF-08 (MUST) When the filesystem is the cache, coalesce in flight and cache nothing; the first statement after `??=` assignment must yield.** (Pattern B, `await Task.Yield()` before the body, `finally` clears the field under the lock.) Rationale: a synchronously completing body would otherwise store a completed task forever.
Verify: review heuristic: in a coalescing helper the field is cleared only in a `finally` that runs after an `await`; test: S1 and S3 against a fake whose first call faults.

**SF-09 (MUST) Install the downloaded binary by temp file in the target directory plus `File.Move(tmp, final, overwrite: false)`; on `IOException` with `File.Exists(final)`, delete the temp and use the winner's file. No cross-process lock, no named `Mutex`.** Rationale: 15 of 16 concurrent callers saw a partial binary with write-in-place (watched).
Verify: `rg -n -e 'new Mutex\(' -e 'FileShare\.None' -e 'File\.(WriteAllBytes|Copy|WriteAllText)\(' src/Ocx/Bootstrap` prints nothing; the 16-caller `install-race` test (partial reads must be 0).

**SF-10 (MUST) `SemaphoreSlim`: construct as `new SemaphoreSlim(n, n)`, put `await sem.WaitAsync(cancellationToken).ConfigureAwait(false);` as a statement before `try`, and `Release()` only in the matching `finally`.** Rationale: acquire-inside-`try` lets a cancelled waiter release a permit it never held, admitting a second holder (watched).
Verify: `rg -n -U -P 'try\s*\{\s*(//[^\n]*\s*)*(var\s+\w+\s*=\s*)?await\s+[\w.]+\.WaitAsync\(' src/` hits are reviewed (each hit's `finally` must release a different semaphore than the one waited on, as in Polly's bulkhead); `rg -n -P 'new SemaphoreSlim\(\s*\d+\s*\)' src/` prints nothing.

**SF-11 (MUST) No `SemaphoreSlim.Wait()` in async code, anywhere in `src/`.** Rationale: 200 queued operations took 84 s instead of 1.6 s (watched).
Verify: `CA1849` severity `error` and `VSTHRD103` severity `error` (both fired on `_sem.Wait()` in the fixture); `rg -n -P '\b\w*[sS]em\w*\.Wait\(' src/` prints nothing.

**SF-12 (MUST) No `lock`/`Monitor` region contains `await`; the gate object is a private `readonly object`, not `System.Threading.Lock` (absent on the net8 floor), not `this`, not a `Type`.**
Verify: `CS1996` is a compile error; `rg -n -e 'lock\s*\(\s*(this|typeof)' -e 'System\.Threading\.Lock\b' src/` prints nothing (unless guarded by a `#if NET9_0_OR_GREATER` that CS-BUILD permits).

**SF-13 (MUST) `OcxClient`, its options snapshot and the handshake record are immutable: every instance field `readonly`, no public property with a plain setter (init only), no mutable static state; `CreateAsync` copies the caller's options and the environment.** Rationale: the thread-safety statement is only true if this holds (Azure: "clients are immutable").
Verify: `IDE0044` and `CA2211` at `error` with `EnforceCodeStyleInBuild=true` (both verified) plus the reflection test: all instance fields `IsInitOnly`, no setter without `IsExternalInit` (fixture `immutable bad` -> exit 1, `good` -> exit 0); `rg -n -P 'static\s+readonly\s+(List|Dictionary|HashSet|Queue|Stack|StringBuilder)<' src/` prints nothing (IDE0044/CA2211 miss these).

**SF-14 (MUST) The client's XML remarks state: thread-safe for all public members, immutable after `CreateAsync`, options/environment snapshotted, the SDK does not serialise commands, result types are not synchronised and never mutated by the SDK after return.** Rationale: Azure, Redis (`LuaScript.cs:19`) and the BCL "Thread Safety" sections state it; an unstated guarantee is not one.
Verify: `rg -n -i -e 'thread-safe' -e 'thread safe' src/Ocx/OcxClient.cs` finds the remark; the concurrency test below exists.

**SF-15 (MUST) A concurrency test drives at least 64 concurrent commands through one client against `Ocx.Fake` and asserts each caller received its own output (no cross-talk), under `--minimum-expected-tests`.** Rationale: caught the shared-buffer client (63-64 of 64 mismatched).
Verify: `rg -n -e 'Range\(0,\s*(6[4-9]|[7-9]\d|\d{3,})\)' tests/` finds it; `dotnet test` passes; red twin: reintroduce a per-client buffer and the test fails.

**SF-16 (MUST) The SDK adds no lock, semaphore or queue around ocx invocations.** Concurrent commands are passed through; ocx's file locks are the serialisation. Rationale: correctness is ocx's (A-C all exit 0, 8/8 bindings); an SDK lock covers one process only and adds shared state.
Verify: `rg -n -e 'SemaphoreSlim' -e '\block\s*\(' -e 'Channel<' src/Ocx/Process src/Ocx/Commands` prints nothing.

**SF-17 (SHOULD, needs ocx-maintainer confirmation; consolidator decides) Map exit 75 with `error.detail == "project_locked"` to a transient `OcxCommandException` flagged retry-safe, and allow a bounded jittered retry of exactly that slug even for mutating commands.** Everything else on exit 75 keeps CS-PROC's non-mutating-only retry. Rationale: the 500 ms lock budget produced 1 to 37 exit-75 children of 64 with no corruption, and the lock is taken before any write.
Verify: the exit-table conformance test against `errors.json` includes the `project_locked` slug (`rg -n 'project_locked' crates/ocx_schema/tests/golden/errors.json` finds line 1977 in the ocx checkout); a test with `Ocx.Fake` returning the exit-75 document twice then success asserts the third attempt succeeds, and the same fake for a different 75 slug asserts no retry.

**SF-18 (MUST) Document, do not enforce, the practical limit: about 4 concurrent mutating commands per `ocx.toml`.** Rationale: measured knee between 4 and 8 on one machine; the number is load-dependent.
Verify: `rg -n -i 'project_locked|ocx.toml' src/Ocx/OcxClient.cs` finds it in the remarks; no code check.

**SF-19 (MUST) No mutable static state in the library except `private static readonly` immutable or thread-safe objects (the CS-BIN-14 `HttpClient`).**
Verify: `CA2211` at `error`; `rg -n -P 'static\s+(?!readonly|class|void|async|extern|partial|abstract)[\w<>\[\],? ]+\s+\w+\s*(=|;)' src/` is reviewed; the SF-13 rg for static collections prints nothing.

**SF-20 (MUST) Any wait with a timeout inside shared-state code uses `TimeProvider` (`WaitAsync(timeout, timeProvider, ct)`, `new CancellationTokenSource(timeout, timeProvider)`).** Rationale: CS-XP already requires `TimeProvider` for every timer; it is what lets the tests above run without real sleeps.
Verify: `rg -n -e 'Task\.Delay\(\s*[^,)]+\)' -e 'new CancellationTokenSource\(\s*[^,)]+\)' src/` prints nothing outside a documented allow-list (BannedApiAnalyzers `RS0030` entries for the one-argument `Task.Delay`, per CS-XP).

## AI-agent angle

What an LLM characteristically gets wrong here, and the smallest mechanical check:

| Wrong output | Why it looks right | Smallest check |
|---|---|---|
| `private readonly Lazy<Task<T>> _init = new(() => InitAsync());` and `=> _init.Value` | the dominant StackOverflow/blog idiom; compiles; passes a happy-path test; four of the 35 exemplar repos do it | `VSTHRD011` error; `rg 'Lazy<\s*Task'` (SF-02) |
| `LazyThreadSafetyMode.PublicationOnly` "so exceptions aren't cached" | true sentence from the docs, wrong for a `Task` value | same rg; S1 test |
| `AsyncLazy<T>` from `Microsoft.VisualStudio.Threading` or a pasted Cleary/Toub class (there is no BCL `AsyncLazy`) | "the proper tool" | package-reference rg (SF-03); `CS0246` if the type is assumed to exist in the BCL |
| `return _initTask ??= InitAsync(cancellationToken);` | short, uses `??=` | SF-04 regex (matches `??=` and `=`); `??=` is also not atomic |
| `lock (_gate) { await … }`, or `Monitor.Enter` across an await | habit from synchronous code | `CS1996` compile error (always caught); `Monitor.Enter` caught by rg `Monitor\.Enter` |
| `System.Threading.Lock` in a net8-targeted library | .NET 9 advice | multi-target build fails on net8 (`CS0234`/`CS0246`); SF-12 rg |
| `_sem.Wait()` inside an `async` method "for safety" | works on a dev box | `CA1849` + `VSTHRD103` at error; S6b shows the 50x cost |
| `try { await _sem.WaitAsync(ct); … } finally { _sem.Release(); }` | looks symmetrical | no analyzer; SF-10 multiline rg + review; S6a test |
| `new SemaphoreSlim(1)` | shortest form | rg `new SemaphoreSlim\(\s*\d+\s*\)` |
| `ConcurrentDictionary<K, Task<V>>.GetOrAdd(key, async k => …)` | "thread-safe cache" | not caught by any analyzer; SF-02 rg; docs say the factory may run more than once |
| `Interlocked.CompareExchange(ref _task, InitAsync(ct), null)` | "lock-free" | rg SF-07; S3 spawn-count test (10-27 spawns) |
| Adding a `SemaphoreSlim` per client "to make concurrent ocx calls safe" | defensive over-synchronisation; hides exit 75 | SF-16 rg; section 9 evidence |
| Resetting on `IsFaulted` only | the obvious property name | S1c test; SF-06 rg |
| "Thread-safe" in an XML remark on a class with a private mutable field or a shared `StringBuilder` | claim without a test | reflection test (SF-13) and the 64-caller test (SF-15) |
| Holding the caller's options reference in the client | cheapest code | S5-style test: mutate options after `CreateAsync` |
| Writing the downloaded binary straight to the final path | simplest | SF-09 rg; `install-race` test |
| A hallucinated `semaphore.LockAsync()` / `await using (await sem.AcquireAsync())` | exists in Nito.AsyncEx, not in the BCL | `CS1061` compile error |

## Contested / evolving

- **Semaphore double-check versus shared task.** Npgsql and Anthropic serialise on a `SemaphoreSlim` and let the next waiter retry; Azure and vs-threading share one task. The semaphore form is simpler and cannot suffer the first-caller problem but wastes the winner's init when it cancels (S2 `starts=2`). Picked: shared task for the in-memory case, coalescing for the filesystem case, semaphore tolerated for cheap init. Stable since at least 2019; no sign of convergence.
- **`Lazy<Task<T>>`.** Still the common idiom (four of 35 repos; Cleary's AsyncLazy is the same construct). The docs' own advice for recoverable failures is "build the retry logic into the initialization routine", which a `Task`-returning factory cannot satisfy from outside. No BCL replacement is planned (#83636, open as of 2025-07-06). Trend: unchanged.
- **`System.Threading.Lock` (.NET 9).** The docs now steer to a dedicated `Lock` object; the net8 floor makes it unusable without `#if`. Revisit when net8 leaves the supported set (net8 LTS reaches end of support in November 2026 per the usual three-year LTS cycle; confirm in the support policy before acting).
- **Retrying a mutating command on `project_locked`.** Open between CS-PROC (no mutating retry) and this report (SF-17). Needs an ocx-maintainer answer on whether any code path acquires the project lock after a write. Also open: ocx may lengthen or make configurable the 500 ms `CONTENTION_BUDGET`; the numbers in section 9 are for the build exercised.
- **Thread-pool injection heuristics.** The starvation guide notes faster scale-up "in response to certain blocking Task APIs" since .NET 6; the observed 84 s says `SemaphoreSlim.Wait` is not covered. A runtime change could shrink the gap, so quote the rule (never block), not the number.
- **.NET 11 / C# 15 (RC1, GA expected November 2026).** The full matrix gave identical pass/fail on `11.0.0-rc.1.26425.128` when a net10 build was rolled forward onto it. Runtime-async (opt-in in the previews) changes how `await` is compiled and was not tested; nothing in these primitives is documented as changing. Flag for re-run on the GA SDK with a net11 build.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.task.waitasync?view=net-10.0 | `Task.WaitAsync` overloads, exceptions, supported monikers | docs updated 2026-07-01; API .NET 6+, TimeProvider overloads .NET 8+ | the per-caller wait that makes shared-init cancellation safe |
| https://learn.microsoft.com/en-us/dotnet/api/system.lazy-1?view=net-10.0 | `Lazy<T>` remarks: exception caching, PublicationOnly, Thread Safety section | docs updated 2026-07-01 | the exact sentences agents misread for `Lazy<Task>` |
| https://github.com/dotnet/runtime/blob/v10.0.0/src/libraries/System.Private.CoreLib/src/System/Lazy.cs | `Lazy<T>` implementation (`ViaFactory`, `LazyHelper`) | .NET 10.0.0 | proves exceptions are cached only when the factory throws |
| https://learn.microsoft.com/en-us/dotnet/api/system.threading.semaphoreslim?view=net-10.0 | `SemaphoreSlim` remarks and Thread Safety | docs updated 2026-07-01 | no thread identity, no FIFO, Dispose caveat, pairing duty |
| https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/lock | `lock` statement reference | current (C# 13/14) | "can't use await in the body"; `System.Threading.Lock` guidance |
| https://learn.microsoft.com/en-us/dotnet/core/diagnostics/debug-threadpool-starvation | thread-pool starvation diagnosis | current (.NET 9+ `WaitHandleWait` event) | symptoms and the faster-scale-up note for blocking Task APIs |
| https://learn.microsoft.com/en-us/dotnet/api/system.collections.concurrent.concurrentdictionary-2.getoradd?view=net-10.0 | `ConcurrentDictionary.GetOrAdd` remarks | current | "valueFactory may be called multiple times", called outside locks |
| https://learn.microsoft.com/en-us/dotnet/api/system.collections.concurrent.concurrentdictionary-2.tryremove?view=net-10.0 | `TryRemove(KeyValuePair)` | current (.NET 5+) | remove-exact-entry for reset-on-fault caches |
| https://github.com/Azure/azure-sdk/blob/main/docs/dotnet/introduction.md | Azure SDK .NET design guidelines | live main, read 2026-10-11 | the MUST on thread-safe client members (lines 464-466) and the model-types note (788) |
| https://devblogs.microsoft.com/azure-sdk/lifetime-management-and-thread-safety-guarantees-of-azure-sdk-net-clients/ | Azure SDK blog on client lifetime and thread safety | maintained post | singletons, "clients are immutable", options mutation has no effect |
| https://microsoft.github.io/vs-threading/analyzers/VSTHRD011.html | VSTHRD011: `Lazy<Task<T>>` deadlock rule | current | what the analyzer says, and why its fix is unsuitable here |
| https://microsoft.github.io/vs-threading/analyzers/VSTHRD003.html | VSTHRD003: awaiting a task not started in context | current | why CS-ASYNC-19 leaves it off for stored shared tasks |
| https://github.com/dotnet/runtime/issues/83636 | proposal: `ConcurrentDictionary.GetOrAddAsync` | opened 2023-03-18, open as of 2025-07-06 | maintainer position: no async collection helpers; no BCL async-lazy |
| https://devblogs.microsoft.com/dotnet/building-async-coordination-primitives-part-6-asynclock/ | Toub, AsyncLock over AsyncSemaphore | 2012-02-12, historical | the `await WaitAsync(); try { } finally { Release(); }` shape |
| https://blog.stephencleary.com/2012/08/asynchronous-lazy-initialization.html | Cleary on AsyncLazy as `Lazy<Task<T>>` | 2012-08-16, historical only | the origin of the fault-caching idiom agents reproduce |
| `microsoft__vs-threading@f6d817997090:src/Microsoft.VisualStudio.Threading/AsyncLazy\`1.cs` | real `AsyncLazy<T>` source | exemplar clone | per-caller `WithCancellation`, factory without token, no reset (:166-262) |
| `Azure__azure-sdk-for-net@32c48fc3d524:sdk/core/Azure.Core/src/Pipeline/BearerTokenAuthenticationPolicy.cs` | token cache with TCS, lock and cancel-retry loop | exemplar clone | the retry-when-someone-else-cancelled pattern (:346-398, :421-453) |
| `npgsql__npgsql@9c47244547c2:src/Npgsql/NpgsqlDataSource.cs` | `Bootstrap` with `SemaphoreSlim` double-check | exemplar clone | pattern C in production (:91, :289-330) |
| `anthropics__anthropic-sdk-csharp@ae16e5933f39:src/Anthropic/Credentials/TokenCache.cs` | SDK token cache, semaphore double-check, "Implementations must be thread-safe" | exemplar clone | closest sibling SDK to the C# ocx SDK (:19, :100-132; `IAccessTokenProvider.cs:13`) |
| `App-vNext__Polly@e4476096da5b:src/Polly/Bulkhead/AsyncBulkheadEngine.cs` | bulkhead with nested acquire/release | exemplar clone | correct nesting; also the rg false positive (:15-37) |
| `StackExchange__StackExchange.Redis@e7c43a269f53:src/StackExchange.Redis/ConnectionMultiplexer.cs`, `LuaScript.cs`, `Profiling/ProfiledCommandEnumerable.cs` | static `ConnectAsync` factory; thread-safety remarks | exemplar clone | factory-does-the-handshake shape; "All members of this class are thread safe" wording |
| `testcontainers__testcontainers-dotnet@04cbb73fcc58:src/Testcontainers.MsSql/MsSqlContainer.cs`, `src/Testcontainers/Resource.cs` | `Lazy<Task<string>>` ignoring its token; `AcquireLockAsync` | exemplar clone | the full failure set in 4 lines; a clean lock-as-IDisposable |
| `meziantou__Meziantou.Analyzer@161b7e948ad3:tests/Meziantou.Analyzer.Test/Harness/NuGetPackages.cs` | `ConcurrentDictionary<,Lazy<Task>>` with catch-and-TryRemove | exemplar clone | call-site reset-on-fault and its remove-by-key hazard |
| `pulumi__pulumi-dotnet@2a0dca84f09b:sdk/Pulumi/Deployment/Deployment_Prepare.cs`, `octokit__octokit.net@7fa5b0fe4a18:Octokit/Models/Response/Readme.cs` | further `Lazy<Task<…>>` uses | exemplar clones | corpus frequency of the pattern |
| `/home/mherwig/dev/ocx/crates/ocx_util/src/fs/file_lock.rs`, `locked_file.rs`; `crates/ocx_store/src/file_structure/temp_store.rs`; `crates/ocx_project/src/project_lock.rs` | ocx advisory-lock implementation and timeouts | ocx checkout `a23ec5be2939` | what actually serialises ocx children (60 s, 5 s, 500 ms) |
| `/home/mherwig/dev/ocx/crates/ocx_schema/tests/golden/errors.json:1977`; `website/src/docs/in-depth/storage.md` | `project_locked` slug; `locks/` layout | ocx checkout | the schema'd, documented failure mode |
| `/home/mherwig/dev/ocx-sdk-python/src/ocx_sdk/_client.py:200-226,664-675,811-857` | Python `_CompatCell`, `gate()`, thread-safety docstring | `ocx-sdk-python@80136dde4162` | the lazy memo this report replaces with the factory |
| `/home/mherwig/dev/grimoire-lore/.agents/worktrees/csharp/.agents/research/csharp-api.md` (CS-API-01, :54, :328), `csharp-async.md`, `csharp-packaging.md` (CS-BIN-01/06/12), `csharp-audit/ocx-cli-contract.md:95` | earlier-wave decisions this report builds on | 2026-10 | the constraints (not disposable, no fire-and-forget, atomic install) |
| fixture tree `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-async-single-flight-and-thread-safety/` (`Sf/`, `Cs/`, `real/`, `run-all.sh`, `results.txt`, `results-real.txt`) | the 14 watched red/green pairs | 2026-10-11 | reproduce every number in this report |
