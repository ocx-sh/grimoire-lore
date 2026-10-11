---
title: "Resource ownership, dual disposal and sync-over-async bridges in a .NET library that drives child processes"
topic: csharp-async-disposal-and-sync-bridges
agent: deep-dive researcher (group csharp-async)
model: claude-sonnet-5-5 (sonnet)
date_researched: 2026-10-11
sources_count: 41
scope: |
  Covers: who owns Process, CancellationTokenSource, CancellationTokenRegistration and redirected stream handles in a process engine; IDisposable vs IAsyncDisposable vs both; the reflexive Dispose(bool)/finalizer pattern as an agent mistake; which analyzer actually catches an undisposed Process (CA2000 vs IDisposableAnalyzers, re-measured); using declarations; sync-over-async (.Result/.Wait()/GetAwaiter().GetResult(), VSTHRD002/103, CA1849, RS0030 BannedSymbols), deadlock and thread-pool starvation numbers; async void, fire-and-forget, ValueTask misuse; the SDK sync-API policy (async-only vs thin wrapper vs separate sync leaf).
  NOT covered (sibling topics): token placement/ConfigureAwait signature policy (csharp-async-cancellation-and-context), kill/grace/exit-code mechanics of the process engine, JSON, HTTP. Fixtures are Linux x64 only; Windows handle behaviour is documented, not measured.
  Era: C# 14 / .NET 10 LTS (SDK 10.0.401), .NET 8 floor (engine fixture run on net8.0 runtime 8.0.31), .NET 11 / C# 15 RC1 (SDK 11.0.100-rc.1.26425.128) flagged wherever it differs.
---

# Resource ownership, dual disposal and sync-over-async bridges

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Ownership map of a process engine](#1-ownership-map-of-a-process-engine)
   2. [Process.Dispose does not stop the child, and an undisposed Process leaks fds until the finalizer runs](#2-processdispose-does-not-stop-the-child-and-an-undisposed-process-leaks-fds)
   3. [CancellationTokenSource, linked sources and CancellationTokenRegistration](#3-cancellationtokensource-linked-sources-and-cancellationtokenregistration)
   4. [IDisposable, IAsyncDisposable, or both](#4-idisposable-iasyncdisposable-or-both)
   5. [The reflexive Dispose(bool) + finalizer pattern is an agent mistake](#5-the-reflexive-disposebool--finalizer-pattern-is-an-agent-mistake)
   6. [using declarations, await using, stacked usings](#6-using-declarations-await-using-stacked-usings)
   7. [What actually catches an undisposed Process (re-measured)](#7-what-actually-catches-an-undisposed-process-re-measured)
   8. [Sync-over-async: why it fails and where the corpus does it anyway](#8-sync-over-async-why-it-fails-and-where-the-corpus-does-it-anyway)
   9. [Sync facades in the exemplar corpus: five patterns](#9-sync-facades-in-the-exemplar-corpus-five-patterns)
   10. [async void, fire-and-forget, ValueTask](#10-async-void-fire-and-forget-valuetask)
   11. [SDK policy decision: sync and async API](#11-sdk-policy-decision-sync-and-async-api)
   12. [Analyzer set, severities and the BannedSymbols.txt fragment](#12-analyzer-set-severities-and-the-bannedsymbolstxt-fragment)
   13. [Era notes: .NET 8 floor, .NET 10, .NET 11 RC1](#13-era-notes-net-8-floor-net-10-net-11-rc1)
   14. [Verified on the toolchain](#14-verified-on-the-toolchain)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

Fixture root for every "Verified" claim: `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-async-disposal-and-sync-bridges/` (abbreviated `$FX`). Toolchain wrapper: `T=/home/mherwig/.cache/research-lang/dotnet-tools/run.sh`. Exemplar cites are `owner__repo@sha12:path:line` under `/home/mherwig/.cache/research-lang/exemplars/csharp`.

## Summary

- Whoever creates a `Process`, `CancellationTokenSource`, linked source or `CancellationTokenRegistration` disposes it in the same method with `using var` / `await using var`; ownership moves only by returning a handle type. CliWrap's engine does exactly this (`using var _ = process;` plus two linked sources plus two registrations in one method: `Tyrrrz__CliWrap@7dbc252fa773:CliWrap/Command.Execution.cs:164-186`).
- `Process.Dispose()` releases the handle and pipes and does NOT stop the child. Observed: a disposed `sleep 30` was still alive (`PASS Process.Dispose() leaves the child running`); the .NET team states it ([Process API improvements in .NET 11](https://devblogs.microsoft.com/dotnet/process-api-improvements-in-dotnet-11/)). Kill explicitly, then dispose.
- An undisposed `Process` with 3 redirected pipes leaks about 3 fds per call until a finalizer runs: 326 starts crashed with `Too many open files` at `RLIMIT_NOFILE` 1024 (GC budget raised so no GC ran); the `using` twin ran 2000 starts at a flat 53 fds. With the default GC the leak is bounded but non-deterministic (sampled peak 641 vs 53).
- A per-call `CancellationTokenSource.CreateLinkedTokenSource(sessionToken)` that is not disposed retains about 144 B per call on the parent token, a dropped `token.Register(...)` about 80 B per call (200 000 calls: 28 096 KiB and 15 579 KiB retained after a full GC; 0 KiB when disposed).
- Types owning a live process are `sealed` and implement BOTH `IDisposable` (best-effort kill + release) and `IAsyncDisposable` (kill + await exit + release), with an `Interlocked.Exchange` idempotence guard, no `Dispose(bool)`, no finalizer, no `GC.SuppressFinalize`. A stateless client that holds no OS resource implements neither.
- `IAsyncDisposable`-only is legitimate when cleanup is inherently async and every consumer is async (Testcontainers `Resource`, `testcontainers__testcontainers-dotnet@04cbb73fcc58:src/Testcontainers/Resource.cs:14`); the compiler then stops sync `using` (CS8418, observed) but a container that only calls `Dispose` would leak ([MS docs caution](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/implementing-disposeasync)).
- The full `Dispose(bool)` + finalizer + `SuppressFinalize` pattern is a managed-resource-free ritual in an SDK: 10 finalizers in 1 042 kLOC across 35 exemplars (`csharp-audit/exemplar-language-shape.md:302`). No analyzer flags a pointless one (measured: a sealed class with finalizer + `Dispose(bool)` + `SuppressFinalize` produced 0 diagnostics at `AnalysisMode=All` with CA, IDISP and VSTHRD packs); only `rg` does. When CA1063 fires on an unsealed public `IDisposable`, seal the class instead of adding the pattern.
- Re-confirmed and sharpened: at `AnalysisMode` Default nothing from the CA family catches an undisposed `Process` (only the compiler's CS4014 fires on the planted file). `IDisposableAnalyzers` 4.0.8 IDISP001/IDISP004 catch every Process form tried (`new`, `Process.Start`, discarded `Process.Start`, factory-returned) at Default and All. CA2000 at All catches some but has a false negative on the commonest runner shape (`WaitForExit(); return p.ExitCode;`).
- IDISP001 does not see `IAsyncDisposable`-only types (`new Handle()` never awaited-disposed: no IDISP001); CA2000 at All does. Run both packs; neither alone is enough.
- Nothing flags a dropped `CancellationTokenRegistration` (`t.Register(...);` as a statement): that needs `rg`.
- `.Result` / `.Wait()` / `GetAwaiter().GetResult()` in a library: VSTHRD002 (default Warning) outside async methods, VSTHRD103 (default Warning) and CA1849 (All only) inside async methods; `ConfigureAwait(false)` removes the single-threaded-context deadlock (observed 3 s hang vs 108 ms) but not the thread cost: 1 024 concurrent blocked calls took 3 395 ms and 112 pool threads vs 115 ms and 20 threads async.
- Ban the blocking calls with BannedApiAnalyzers (RS0030): 19 doc-ID lines in this file were each watched firing on a planted line; the two non-obvious ones are `ConfiguredTaskAwaitable[`1].ConfiguredTaskAwaiter.GetResult` and `Task.WaitAll(ReadOnlySpan<Task>)` (the .NET 9+ `params` span overload bypasses a `Task[]` ban).
- `async void` is VSTHRD100 (Warning, default on); the same crash hides in `Action a = async () => ...` (VSTHRD101). Observed: `async void` throwing after an await terminated the process with exit code 134; `async Task` was caught by the caller's `try`.
- `_ = FooAsync();` silences CS4014 and VSTHRD110 without observing anything (observed: 0 diagnostics at All); the exception is then invisible (observed: process alive, no output). Forbid fire-and-forget; store the task and await it in `DisposeAsync`.
- CA2012 (ValueTask misuse) is only "As suggestion" by default ([CA2012](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2012)); build output never shows it. Promote to error.
- SDK sync policy: ship async-only; no blocking wrapper inside the library (Toub: "Please try hard not to; leave it up to the consumer", [2012](https://devblogs.microsoft.com/dotnet/should-i-expose-synchronous-wrappers-for-asynchronous-methods/)). If a sync twin is demanded (MSBuild tasks, PowerShell cmdlets), build it as a separate leaf implementation (`bool async` flag: Npgsql `NpgsqlCommand.cs:1266-1271`; or a genuine sync driver: SimpleExec `ProcessExtensions.cs:36` vs `:44`; the Python SDK has four entry points `_process.py:199,296,384,426`), never `GetAwaiter().GetResult()` over the async body.
- Gate it mechanically: PackageReference `Microsoft.VisualStudio.Threading.Analyzers` 18.7.23, `IDisposableAnalyzers` 4.0.8, `Microsoft.CodeAnalysis.BannedApiAnalyzers` 5.6.0, `AnalysisMode=All`, and the 16 severities in section 12 set to `error`. Watched: planted file exits 1, fixed twin exits 0.
- .NET 11 RC1 adds `Process.RunAndCaptureTextAsync` / `Process.RunAsync` that kill the child on cancellation (observed: cancelled after 303 ms, no stray `sleep`); it does not change `Process.Dispose` and is not available on the net8.0/net10.0 floor, so a multi-targeted SDK keeps its own engine and may adopt it behind `#if NET11_0_OR_GREATER` later.

## Findings

### 1. Ownership map of a process engine

One rule governs everything below: the code that calls `Start` / `new` / `Register` / `CreateLinkedTokenSource` owns the result until it returns the thing inside a handle type or disposes it. The MS guidance is the same ("a class that instantiates an `IDisposable` implementation and stores it as an instance member ... is also responsible for its cleanup", [Implement a Dispose method](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/implementing-dispose)); ownership "can be transferred to another `IDisposable` type" (same page).

| Resource | Created by | Owner | What release does | What release does NOT do |
|---|---|---|---|---|
| `Process` | the engine method (`new Process` + `Start`, or `Process.Start`) | that method, or the handle it returns | closes the process handle, clears state; `Dispose` calls `Close` ([Process.Close](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process.close?view=net-10.0)) | does not kill the child (fixture: child still alive after `Dispose`) |
| `StandardInput/Output/Error` readers/writers | `Process` (when `Redirect*` is true) | the `Process` object; never leave the engine method | freed with the process; Linux fixture: `Close()` alone returned fds to baseline (51 vs 53 for `using`) although the docs say `Close` "does not close the standard output, input, and error readers and writers in case they are being referenced externally" | do not hand `process.StandardOutput` to callers; return strings/records |
| per-call `CancellationTokenSource` (timeout) | the engine method | that method (`using var`) | releases timer + registrations ([CTS.Dispose](https://learn.microsoft.com/en-us/dotnet/api/system.threading.cancellationtokensource.dispose?view=net-10.0): "Always call `Dispose` before you release your last reference") | `Dispose` is not a cancel request (same page) |
| linked source `CreateLinkedTokenSource(ct)` | the engine method | that method | unregisters from every parent token ([Cancellation in managed threads](https://learn.microsoft.com/en-us/dotnet/standard/threading/cancellation-in-managed-threads): "you must call `Dispose` on the linked token source") | leaks 144 B/call on the parent when skipped (fixture) |
| `CancellationTokenRegistration` | `token.Register(callback, state)` | the engine method | unregisters; `DisposeAsync` waits for a running callback without blocking a thread | nothing in the SDK or analyzers reminds you; 80 B/call leak when dropped (fixture) |
| read tasks (`ReadToEndAsync`) | the engine method | that method | must be observed after kill (CliWrap and the green fixture `ObserveAsync` swallow expected `OperationCanceledException`/`IOException`) | an unobserved faulted read is a silent failure (section 10) |

Exemplar shape (CliWrap, the closest engine): `using var _ = process;` (`Tyrrrz__CliWrap@7dbc252fa773:CliWrap/Command.Execution.cs:164`), two linked sources (`:169-177`), a kill registration and a graceful registration both `await using` (`:180-188`, built with a `ToAsyncDisposable()` shim because CliWrap targets netstandard2.0), and a `catch { process.Dispose(); throw; }` for the failure path before the pipeline owns the process (`:383-385`). Medallion keeps the process alive past the call when `DisposeOnExit` is false, so `Command` itself is `IDisposable` (`madelson__MedallionShell@e45f1f6ffd4c:MedallionShell/Command.cs:20,475-481`) and the process is disposed "AFTER we capture the exit code" in a `finally` (`ProcessCommand.cs:88-96`). Both are the two legal ownership shapes: scoped to a call, or carried by a handle.

Counter-example worth knowing: CliWrap's public `CommandTask<T>` is `IDisposable` only to dispose its inner `Task` (`CliWrap/CommandTask.cs:11,52`), and the audit found no analyzer that makes callers dispose it; a returned handle that wraps a `Task` is not a resource and should not be disposable.

### 2. Process.Dispose does not stop the child, and an undisposed Process leaks fds

Documentation: "`Process.Dispose` only releases the resources associated with the process, but does not kill it" ([Process API improvements in .NET 11](https://devblogs.microsoft.com/dotnet/process-api-improvements-in-dotnet-11/), 2026-05-13); the class page says the type is `IDisposable` and should be disposed "directly or indirectly" with `try`/`finally` or `using` ([Process](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process?view=net-10.0)).

Measured (Linux x64, net10.0; `$FX/leak/Program.cs`): 2 000 starts of `true` with stdin/stdout/stderr redirected.

```csharp
// RED: never disposed, 3 redirected pipes per start
var p = Process.Start(psi)!;
p.WaitForExit();

// GREEN: using declaration
using var p = Process.Start(psi)!;
p.WaitForExit();
```

| mode | GC condition | result |
|---|---|---|
| red | `DOTNET_GCgen0size=0x10000000`, `RLIMIT_NOFILE`=1024 | `CRASH after 326 starts: Win32Exception: ... Too many open files` |
| red | gen0 budget 256 MB, default rlimit | fds `26 -> 2031` after loop, sampled peak 3 949, `54` after a forced GC |
| red | default GC | fds `26 -> 209` after loop, sampled peak 641, `56` after forced GC |
| `Close()` only | gen0 256 MB, rlimit 1024 | `starts=2000`, fds 51 |
| `using` (green) | gen0 256 MB, rlimit 1024 | `starts=2000`, fds 53 flat |

Reading: the finalizer eventually reclaims the leaked pipes, which is why the bug passes small tests and kills a long-running service or CI job that spawns thousands of children. Note .NET raises the soft `RLIMIT_NOFILE` to the hard limit at startup (observed: the first attempt with `ulimit -n 1024` peaked at 3 949 fds until both soft and hard limits were lowered). Windows handle behaviour is not measured here.

The second half of the ownership fact: if disposal must also stop the child (a handle type that outlives the call), the type has to kill before it releases. Green fixture `ProcessHandle` (sealed, dual):

```csharp
public void Dispose()
{
    if (Interlocked.Exchange(ref _disposed, 1) != 0) return;   // idempotent
    ProcessRunner.TryKill(_process);                             // Kill(entireProcessTree: true), swallow InvalidOperationException/Win32Exception
    _process.Dispose();
}
public async ValueTask DisposeAsync()
{
    if (Interlocked.Exchange(ref _disposed, 1) != 0) return;
    ProcessRunner.TryKill(_process);
    try { await _process.WaitForExitAsync().ConfigureAwait(false); } catch (InvalidOperationException) { }
    _process.Dispose();
}
```

Harness result on net10.0 and net8.0: `PASS ProcessHandle sync Dispose kills`, `PASS ProcessHandle DisposeAsync kills`. Aspire's `ProcessDisposable` is the same idea with a signal ladder and is `IAsyncDisposable`-only (`dotnet__aspire@af646baee1e8:src/Aspire.Hosting/Dcp/Process/ProcessUtil.cs:242-262`).

### 3. CancellationTokenSource, linked sources and CancellationTokenRegistration

Rules from the docs: dispose every `CancellationTokenSource` ("You should be sure to call the `CancellationTokenSource.Dispose` method when you have finished", [Cancellation in managed threads](https://learn.microsoft.com/en-us/dotnet/standard/threading/cancellation-in-managed-threads)); dispose the linked source; keep callbacks fast because `Cancel` runs them synchronously; "If you call `Dispose` [on the registration] while the callback is running, and you hold a lock that the callback is waiting on, your program can deadlock" (same page).

Retention is measurable and not subtle (`$FX/ctsleak`, 200 000 calls against one long-lived parent token, `GC.GetTotalMemory(true)` delta):

| mode | retained after full GC |
|---|---|
| `linked-red` (`CreateLinkedTokenSource(parent)` never disposed) | 28 096 KiB (144 B/call) |
| `linked-green` (`using var`) | 0 KiB |
| `reg-red` (`token.Register(static () => { })` result dropped) | 15 579 KiB (80 B/call) |
| `reg-green` (`using var r = token.Register(...)`) | 0 KiB |

The parent holds the registration list, so an SDK whose session token lives for the whole process leaks per call. Correct engine fragment (compiles clean at `AnalysisMode=All` with all three packs, net8.0 and net10.0):

```csharp
using var process = new Process { StartInfo = psi };
using var linked = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
if (timeout is { } t) linked.CancelAfter(t);
process.Start();
await using var killOnCancel = linked.Token
    .Register(static p => TryKill((Process)p!), process).ConfigureAwait(false);
```

`CancellationTokenRegistration` implements `IAsyncDisposable` on the modern TFMs (the net8.0 and net10.0 builds of the fixture use `await using` on it directly; CliWrap needs the `ToAsyncDisposable()` shim only for netstandard2.0, `Command.Execution.cs:180-188`). `await using` on the registration (not `using`) is preferred in async code because it waits for an in-flight callback without blocking the thread.

Timeout vs caller cancellation: with a linked source, `catch (OperationCanceledException) when (linked.IsCancellationRequested)` then `if (cancellationToken.IsCancellationRequested) throw;` else throw `TimeoutException` (fixture: `PASS timeout throws TimeoutException`). Anthropic's agent file adds the inverse rule that matters for handles: "never `Dispose` a `CancellationTokenSource`/stream the returned object still depends on" (`csharp-audit/exemplar-cli-wrappers-and-sdks.md:278`).

### 4. IDisposable, IAsyncDisposable, or both

What Microsoft says ([Implement a DisposeAsync method](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/implementing-disposeasync), ms.date 2025-10-20): it is "typical" to implement both; "If no synchronous disposable of your class is possible, having only `IAsyncDisposable` is acceptable"; and the caution: "If a class implements `IAsyncDisposable`, but not `IDisposable`, and a consumer only calls `Dispose`, your implementation would never call `DisposeAsync`. This would result in a resource leak." Nonsealed classes need `protected virtual ValueTask DisposeAsyncCore()`; "If an implementation of `IAsyncDisposable` is `sealed`, the `DisposeAsyncCore()` method is not needed".

Corpus: `IAsyncDisposable` 138 declarations vs `IDisposable` 586, `await using` 88, using declarations (1 212) outnumber using statements (884) 58:42 (`csharp-audit/exemplar-language-shape.md:303`). Shapes seen:

| Shape | Example | Why |
|---|---|---|
| `IDisposable` only | Pulumi `abstract Workspace : IDisposable` (`pulumi__pulumi-dotnet@2a0dca84f09b:sdk/Pulumi.Automation/Workspace.cs:24`); CliWrap `Channel<T>`, `WindowsSignaler` | cleanup is synchronous |
| `IAsyncDisposable` only | Testcontainers `Resource` (`src/Testcontainers/Resource.cs:14,25`: `DisposeAsync` -> `DisposeAsyncCore` -> `GC.SuppressFinalize`); Aspire `ProcessDisposable` | cleanup awaits the Docker daemon / a signal ladder; all consumers async |
| both, separate implementations | Redis `ConnectionMultiplexer.Dispose()` (`:2845`, calls `Close(!_isDisposed)`) and `DisposeAsync()` (`:2858`, `await CloseAsync(...)`) (`StackExchange__StackExchange.Redis@e7c43a269f53:src/StackExchange.Redis/ConnectionMultiplexer.cs`) | two real paths, no bridge |
| both via a base class | Npgsql `NpgsqlConnection.DisposeAsync` (`npgsql__npgsql@9c47244547c2:src/Npgsql/NpgsqlConnection.cs:832-838`) overrides `DbConnection` | BCL contract |

Decision for an SDK that wraps a CLI:

1. A **stateless client** (paths, config, env snapshot; every call owns its own process) has nothing to dispose: implement neither. The Python SDK has no context manager or `close` on its client (`ocx-sdk-python@80136dde4162:src/ocx_sdk/`: `grep -rn "__enter__\|__aenter__\|def close\|def aclose"` returns nothing) and returns stdlib handles from `spawn` that the caller owns.
2. A **live-process handle** returned to the caller (the `spawn` analogue) is `sealed`, implements both, and its sync `Dispose` is a real best-effort kill (a process can be killed without awaiting). Fixture `ProcessHandle` is the template.
3. `IAsyncDisposable`-only is right only when sync cleanup is impossible, and then the type must say so in its XML doc and be reachable only via `await using`.
4. A sealed dual-disposal class needs no `DisposeAsyncCore`, no `Dispose(bool)`, no finalizer, no `SuppressFinalize` (IDISP024 flags `GC.SuppressFinalize(this)` on a sealed type without finalizer, observed).

Compiler guard: using a sync `using` on an async-only type is `CS8418` ("type used in a using statement must implement 'System.IDisposable'. Did you mean 'await using' rather than 'using'?", observed).

### 5. The reflexive Dispose(bool) + finalizer pattern is an agent mistake

The pattern is for unmanaged resources and for unsealed bases. Microsoft's own page limits it: "A finalizer ... is only required if you directly reference unmanaged resources. This is a highly advanced scenario that can be typically avoided"; "If your class references only managed objects, it's still possible for the class to implement the dispose pattern. There's no need to implement a finalizer"; "we strongly recommend wrapping the unmanaged `IntPtr` handle into a `SafeHandle`" ([Implement a Dispose method](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/implementing-dispose)); "X AVOID making types finalizable" ([Framework Design Guidelines: Dispose Pattern](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/dispose-pattern)). The simple form for a sealed owner is one line: `public void Dispose() => _bar.Dispose();` (same Implement-a-Dispose page, "Cascade dispose calls").

Why agents emit it anyway: CA1063 ("Implement IDisposable correctly", Design, **not enabled by default in .NET 10**, [CA1063](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1063)) demands `protected virtual void Dispose(bool)` on every unsealed public `IDisposable`, and the doc's own pseudo-code carries a finalizer. A model that hits CA1063 (or imitates the many pre-2019 samples) writes the whole ritual. The correct reaction is to seal.

Measured (`$FX/analyzers`, red vs green):

```csharp
// RED: pointless on a managed-only class; zero diagnostics at AnalysisMode=All
public sealed class ReflexiveSealed : IDisposable
{
    private readonly CancellationTokenSource _cts = new();
    private bool _disposed;
    ~ReflexiveSealed() { Dispose(false); }
    public void Dispose() { Dispose(true); GC.SuppressFinalize(this); }
    private void Dispose(bool disposing) { if (_disposed) return; if (disposing) _cts.Dispose(); _disposed = true; }
}

// GREEN
public sealed class SimpleOwner : IDisposable
{
    private readonly CancellationTokenSource _cts = new();
    public void Dispose() => _cts.Dispose();
}
```

| Planted type | Diagnostics at All |
|---|---|
| `public class UnsealedSimpleDispose : IDisposable { public void Dispose() { } }` | CA1063 x2, CA1816, IDISP025 |
| `public sealed class ReflexiveSealed` (above) | none |
| `public class ReflexiveUnsealedNoUnmanaged` (`protected virtual Dispose(bool)`, no finalizer) | none |
| `public sealed class SuppressOnSealedNoFinalizer` (`GC.SuppressFinalize(this)`) | IDISP024 only |
| `sealed SimpleOwner`, `sealed SealedSimpleDispose` | none |

So the analyzers push toward the ritual (CA1063) and nothing pushes back except IDISP024/IDISP025; the pointless finalizer on a sealed type passes everything. Only the `rg` rules in the normative list catch it. Corpus numbers: 10 finalizers in 5 repos (Redis 4, BenchmarkDotNet 2, testfx 2, Polly 1, coverlet 1), `Dispose(bool)` 84, `SuppressFinalize` 98 (xunit alone 41), `SafeHandle` 3 (`csharp-audit/exemplar-language-shape.md:302`). Redis is the instructive case: its finalizer is not cleanup but a leak counter, `~ConnectionMultiplexer() { Interlocked.Increment(ref _collectedWithoutDispose); }` (`StackExchange.Redis@e7c43a269f53:.../ConnectionMultiplexer.Debug.cs:32-35`); the one that does real teardown, `~PhysicalBridge()` (`PhysicalBridge.cs:153`), documents that it "shouldn't *really* touch managed objects in a finalizer" and does so only to kill a socket.

### 6. using declarations, await using, stacked usings

- Prefer the using declaration (`using var x = ...;`, C# 8): 1 212 declarations vs 884 statements in the corpus; it scopes to the method and removes a nesting level. Use the statement form only when disposal must happen before the end of the method (for example a pipe that must close before `WaitForExitAsync`).
- `await using var x = ...;` for `IAsyncDisposable`. In a library each `await using` should be configured: either `await using var x = thing.ConfigureAwait(false);` (extension `ConfigureAwait(IAsyncDisposable, bool)`, MS "acceptable pattern three") or declare the variable first and write `await using (x.ConfigureAwait(false)) { }`. Observed on SDK 10.0.401 at `AnalysisMode=All`: CA2007 flags `await using (var h = new H())`, `await using var h = new H();` and `await using var r = token.Register(...)`; it accepts `await using (h.ConfigureAwait(false))`, `await using var h = new H().ConfigureAwait(false);` and the configured registration. (The sibling topic csharp-async-cancellation-and-context states CA2007 does not flag `await using`; this fixture observed it flagging the unconfigured declaration forms. Reconcile in consolidation.) The [ConfigureAwait FAQ](https://devblogs.microsoft.com/dotnet/configureawait-faq/) notes the pattern needs the resource declared separately and widens its scope.
- Do not stack: MS shows that `await using (objOne) await using (objTwo)` after two eager constructors skips `objOne` if the second constructor throws; use nested blocks, sequential blocks or using declarations ([Implement a DisposeAsync method](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/implementing-disposeasync), "Stacked usings").
- CA2000's own caveat: "To return a disposable object, the object must be constructed in a `try/finally` block outside of a `using` block" ([CA2000](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2000)); the green `ProcessHandle.Start` does `try { p.Start(); return new ProcessHandle(p); } catch { p.Dispose(); throw; }`.

### 7. What actually catches an undisposed Process (re-measured)

Commission premise: the earlier codified probe found nothing catching an undisposed `Process`, and CA2000/CA2213 fire only at `AnalysisMode=All`. Re-run with `IDisposableAnalyzers` 4.0.8 added (`$FX/analyzers`, planted `red/Red.cs`, SDK 10.0.401; raw results in `$FX/results/`).

CA family on the SDK alone (`$FX/sdkonly`):

| `AnalysisMode` | CA diagnostics on the planted file |
|---|---|
| Default | none (only compiler CS4014 x3) |
| Minimum | CA1816, CA2012 |
| Recommended | CA1001, CA1816, CA2012 |
| All | CA1001, CA2000 (3), CA2213 (2), CA1063 (2), CA1849 (3), CA2012 (3), CA1816, plus noise (CA1002, CA1030, CA1062, CA2007) |

Per-shape matrix (line-level, same file; `Y` = fires):

| Planted shape | CA2000 (All) | IDISP001/004 (Default and All) |
|---|---|---|
| `new Process(); p.Start();` (never disposed) | Y | Y |
| `new Process { StartInfo = ... }` (initializer) | Y | Y |
| `var p = Process.Start(psi); p.WaitForExit(); return p.ExitCode;` | **no** | Y |
| `var p = new Process{...}; p.Start(); p.WaitForExit(); return p.ExitCode;` | **no** | Y |
| `var p = new Process(); p.Start(); p.WaitForExit();` (no `ExitCode` read) | Y | Y |
| factory `var p = Make(); p.Start();` | Y | Y |
| `Process.Start("true");` result discarded | no | Y (IDISP004) |
| `p.Close()` instead of `Dispose` | no | no (reasonable: Close frees it) |
| `CancellationTokenSource` / linked source never disposed | Y | Y |
| `new Handle()` where `Handle : IAsyncDisposable` only | Y | **no** |
| `t.Register(...)` as a bare statement | no | no |

Conclusions: (1) at the default analysis level no CA rule protects a process engine; (2) CA2000 loses the object when its fields are read after `WaitForExit` (`return p.ExitCode;`), the exact shape of every runner; (3) IDISP001/IDISP004 are the dependable detector for `Process`, CTS and linked sources; (4) CA2000 is the only detector of `IAsyncDisposable`-only leaks; (5) a dropped registration needs `rg`. CA2213 flagged `Process` fields never disposed in `Dispose()` of both a sync and an async-only owner; CA1001 flagged a non-disposable owner of a `Process` field (All and Recommended). IDISP002/IDISP006 (field disposal) did not fire on the planted fields in this fixture, so do not rely on them for fields; use CA1001/CA2213.

### 8. Sync-over-async: why it fails and where the corpus does it anyway

**Deadlock.** Blocking on an incomplete task from a thread that owns a single-threaded `SynchronizationContext` while the task's continuation needs that context. The root cause per Cleary: "That context already has a thread in it, which is (synchronously) waiting for the async method to complete. They're each waiting for the other" ([Async/Await - Best Practices](https://learn.microsoft.com/en-us/archive/msdn-magazine/2013/march/async-await-best-practices-in-asynchronous-programming), March 2013). It cannot occur in consoles, ASP.NET Core or the thread pool, which is why it ships. Measured (`$FX/deadlock`, a `BlockingCollection` pump context):

| Variant | Result |
|---|---|
| library `FetchAsync` awaits `Task.Delay(100)` without `ConfigureAwait(false)`, wrapper `FetchAsync().Result`, run on the pump context | `DEADLOCK (no completion within 3s) [3003 ms]` |
| same with `ConfigureAwait(false)` in the library | `ok [108 ms]` |
| async all the way | `ok [111 ms]` |

`ConfigureAwait(false)` rescues the wrapper only because the library never resumes on the captured context; the thread is still parked. The ConfigureAwait FAQ is explicit that it "only affects the callbacks" and that blocking in web apps should be avoided "regardless".

**Starvation.** Each blocked call pins a pool thread; the pool injects slowly. Docs: after the initial burst to "2-3x the number of processor cores" threads are added "1-2 per second"; a count that stabilises "more than about three times the number of processor cores" means code is blocking pool threads; ".NET 6 has updated ThreadPool heuristics that reduce the performance impact", and sync-over-async "is the most common cause of ThreadPool starvation" ([Debug ThreadPool starvation](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/debug-threadpool-starvation), applies to .NET 9+). Measured with `ThreadPool.SetMinThreads(4,4)` and each call a 100 ms delay:

| concurrent calls | sync-over-async | async |
|---|---|---|
| 64 | 313 ms, 44 pool threads | 109 ms, 21 |
| 256 | 933 ms, 68 | 109 ms, 16 |
| 1 024 | 3 395 ms, 112 | 115 ms, 20 |

An SDK whose callers run `Parallel`/ASP.NET code will hit exactly this if a "convenience" `Run()` wraps `RunAsync().GetAwaiter().GetResult()`.

**Legitimate bridges.** The blocking call is acceptable at a process edge (console `Main`, a test host, an MSBuild task `Execute`), on a task proven complete, or inside a primitive that owns scheduling. Evidence: vs-threading's `JoinableTaskFactory.Run` ends with `transient.Task.GetAwaiter().GetResult()` only to rethrow after the work completed (`microsoft__vs-threading@f6d817997090:src/Microsoft.VisualStudio.Threading/JoinableTaskFactory.cs:390-395`), and the analyzer's recommended fix when you cannot go async is `JoinableTaskFactory.Run` ([VSTHRD002](https://microsoft.github.io/vs-threading/analyzers/VSTHRD002.html)); the analyzer also stays silent when "it can prove the task has completed". Cleary's one sanctioned case is `Main`: "The `Main` method for a console application is one of the few situations where code may block on an asynchronous method" (same article). The corpus has 273 `GetAwaiter().GetResult()`, 46 `.Wait()`, 235 `.Result` across 21 repos (`csharp-audit/exemplar-language-shape.md:23`): deliberate sync facade layers (Npgsql 116) and `Main`/ctors, not async-first SDKs (CliWrap 2, Anthropic 2, OpenAI 0, line 255).

**Library-side code of an async-first SDK that still blocks:** CliWrap's `SimplexStream.Read/Write` override the sync `Stream` members with `ReadAsync(...).AsTask().GetAwaiter().GetResult()` (`Tyrrrz__CliWrap@7dbc252fa773:CliWrap/Utils/SimplexStream.cs:171,175`, `[ExcludeFromCodeCoverage]`) because `Stream` forces a sync contract; Azure.Core suppresses its own analyzer to do it once: `#pragma warning disable AZC0102 // Do not use GetAwaiter().GetResult().` around `_tcs.Task.GetAwaiter().GetResult()` in a runner whose task completes from process events, never from a captured context (`Azure__azure-sdk-for-net@32c48fc3d524:sdk/core/Azure.Core/src/Identity/ProcessRunner.cs:75-77`). Both are justified, narrow, and commented.

### 9. Sync facades in the exemplar corpus: five patterns

| # | Pattern | Exemplar | Safe? |
|---|---|---|---|
| A | async-only, consumer blocks if it must | CliWrap (`ExecuteAsync` only), Pulumi.Automation (165 async decls), Anthropic (1 034 Task-returning service methods, 0 sync), Octokit | yes |
| B | one implementation, `bool async` flag; sync branch never yields an incomplete task, so the final `GetAwaiter().GetResult()` is non-blocking | Npgsql: `public override int ExecuteNonQuery() => ExecuteNonQuery(false, CancellationToken.None).GetAwaiter().GetResult();` (`NpgsqlCommand.cs:1253`) over `async Task<int> ExecuteNonQuery(bool async, ...)` whose body does `async ? await reader.NextResultAsync(...) : reader.NextResult()` (`:1266-1271`); Azure.Core `Foo`/`FooAsync` pairs | yes, at the cost of discipline in the core |
| C | two genuine drivers | SimpleExec: `ProcessExtensions.Run` ends in `process.WaitForExit()` (`adamralph__simple-exec@f80913246993:src/SimpleExec/Internal/ProcessExtensions.cs:36`) while `RunAsync` (`:44`) is a separate async implementation; Redis `Dispose`/`DisposeAsync`; Dapper `Query` (`DapperLib__Dapper@eb47546a408b:Dapper/SqlMapper.cs:846`) vs `QueryAsync` (`SqlMapper.Async.cs:90`); the Python SDK's four duplicated entry points whose author wrote that a bridge "would be more code than the thing it abstracts" (`csharp-audit/python-sdk-digest.md:164`) | yes |
| D | thin blocking wrapper, documented | Medallion `public void Wait() => this.Task.GetAwaiter().GetResult();` and `public CommandResult Result => this.Task.GetAwaiter().GetResult();` (`MedallionShell/Command.cs:103,110`), safe because the library uses `ConfigureAwait(false)` (34 sites in the corpus read) and its task completes off any context; Redis `Wait<T>(Task<T>)` with `task.Wait(TimeoutMilliseconds)` and a `TimeoutException` (`ConnectionMultiplexer.cs:436-448`, `RedisBase.cs:35-42`) | only with a timeout and a context-free library; still blocks a thread |
| E | `JoinableTaskFactory.Run` | vs-threading and VS extensions | yes, if you adopt that library |

Policy statement the artifacts should encode: A for the default; B or C if a sync twin is required; D only as a documented consumer-side convenience; never "async-over-sync" in the other direction either (`Task.Run(() => Sync())` to fake an async API holds a pool thread; the repo's red/green grep `Task\.Run\(\s*\(\)\s*=>\s*\w+Async\(` catches the inverse mistake of wrapping async in `Task.Run`, and VSTHRD110 flags an unobserved `Task.Run`, observed).

### 10. async void, fire-and-forget, ValueTask

**async void.** "With `async void` methods, there is no Task object, so any exceptions thrown out of an `async void` method will be raised directly on the SynchronizationContext that was active when the `async void` method started" (Cleary 2013); VSTHRD100: unhandled exceptions "crash the process" ([VSTHRD100](https://microsoft.github.io/vs-threading/analyzers/VSTHRD100.html)). Only event handlers qualify, and the handler should be a thin `async void` calling `async Task`. Observed (`$FX/asyncvoid`, net10.0):

| mode | result |
|---|---|
| `void`: `async void ThrowsVoid() { await Task.Delay(10); throw ... }` called in `try` | `Unhandled exception. System.InvalidOperationException: boom from async void` at `Task.ThrowAsync` / `ThreadPoolWorkQueue.Dispatch`, exit code **134** |
| `task`: `await ThrowsTask()` | `caller caught InvalidOperationException`, exit 0 |
| `forget`: `ThrowsTask();` dropped | `no exception reached the caller; process still alive`, exit 0 (silent failure; .NET 4.5+ no longer escalates unobserved task exceptions at finalization by default in this run) |

The hidden form is the async lambda converted to a void delegate: `Action a = async () => await Task.Delay(1);` and `xs.ForEach(async x => await Task.Delay(x))`, VSTHRD101 "Avoid using async lambda for a void returning delegate type" (default Warning; observed x2). Cleary: "async lambdas should only be used if they're converted to a delegate type that returns Task (for example, `Func<Task>`)".

**Fire-and-forget.** VSTHRD110 (Warning, on by default) flags an un-awaited `Task` in a synchronous method; CS4014 flags it in async methods (observed to fire in both on SDK 10.0.401: lines 83-85 of the planted file). The page's remedies are await, `JoinableTaskFactory.Run`, or store the task and observe it later; the discard `_ = GetAsync();` is accepted silently (observed: no diagnostic) and is therefore the standard agent "fix" that hides the bug. The Learn TPL page: "If you do not wait on a task that propagates an exception, or access its `Exception` property, the exception is escalated according to the .NET exception policy when the task is garbage-collected" ([Exception handling (TPL)](https://learn.microsoft.com/en-us/dotnet/standard/parallel-programming/exception-handling-task-parallel-library)). In a process engine the legitimate background work are the stdout/stderr pump tasks: keep them in locals, `await Task.WhenAll`, and on cancellation observe them (`ObserveAsync` in the green engine).

**ValueTask.** CA2012: "`ValueTask` instances returned from member invocations are intended to be directly awaited"; consuming twice or reading `Result` before completion "may result in an exception or corruption"; ignoring one "may degrade performance"; default **"As suggestion"** in .NET 10 ([CA2012](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2012)). Observed at All: CA2012 fires on `VtAsync().GetAwaiter().GetResult()`, on a dropped `VtAsync();` (together with CS4014) and on `await v; await v;`. `CA1849` (All only; "Enabled by default in .NET 10: No") flags `Task.Wait()`, `Task<T>.Result`, `GetAwaiter().GetResult()` and sync overloads in a Task-returning method ([CA1849](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1849)); VSTHRD103 covers the same at Warning by default, so with the VS Threading pack CA1849 is redundant except for `Thread.Sleep` (observed: CA1849 fires on it, VSTHRD103 does not).

### 11. SDK policy decision: sync and async API

Evidence for the choice:

- Azure's rule is "DO provide both asynchronous and synchronous variants for all service methods" because sync-over-async "can cause deadlocks" ([Azure SDK .NET guidelines](https://azure.github.io/azure-sdk/dotnet_introduction.html), `dotnet-service-methods-sync-and-async`); that is a rule about network services consumed by netfx-era UI code, and Azure implements it via pattern B, not wrappers.
- New LLM/CLI SDKs went async-only (Anthropic 1 034/0, CliWrap, Pulumi, Octokit); Stripe, OpenAI, SimpleExec, Azure ship pairs (`csharp-audit/exemplar-cli-wrappers-and-sdks.md:162`: 4 of 8 ship sync twins).
- Python SDK parity does not require a sync twin in C#: the Python twins exist because Python's sync world is the default; C# consumers have `async Main`, top-level statements, async tests and hosts.
- The realistic sync consumers are MSBuild tasks, PowerShell cmdlets and legacy ctors. They sit at a process edge where a one-line consumer-side `GetAwaiter().GetResult()` is the accepted bridge (Cleary's `Main` exception), and the cost of getting it wrong is inside the consumer.

**Decision candidate:** v1 public surface is async-only (`Task`-returning, `Async` suffix, token last; see sibling topic). No blocking wrapper in the library. If a sync API is later required it is added as pattern B/C inside the engine leaf (a sync `Run` using `Process.WaitForExit()` + synchronous stream reads), exposed only on the process-spawning layer, covered by the same fixtures. Contrast thin wrappers: they inherit the starvation numbers above and a `ConfigureAwait(false)` discipline that CA2007 cannot fully verify.

### 12. Analyzer set, severities and the BannedSymbols.txt fragment

Packages (versions resolved in the fixtures): `Microsoft.VisualStudio.Threading.Analyzers` 18.7.23, `IDisposableAnalyzers` 4.0.8, `Microsoft.CodeAnalysis.BannedApiAnalyzers` 5.6.0, with `<AnalysisMode>All</AnalysisMode>` on SDK 10.0.401. Rule defaults from the vs-threading index: VSTHRD002 Warning, VSTHRD100 Warning, VSTHRD101 Warning, VSTHRD103 Warning, VSTHRD110 Warning, VSTHRD111 Hidden, VSTHRD112/113 Info, VSTHRD200 Warning ([index](https://microsoft.github.io/vs-threading/analyzers/index.html)); IDISP rule list in the [README](https://github.com/DotNetAnalyzers/IDisposableAnalyzers) (IDISP001 "Dispose created", IDISP004 "Don't ignore created IDisposable", IDISP024, IDISP025).

`.editorconfig` that made the planted file exit 1 and the fixed twin exit 0 (`$FX/analyzers/.editorconfig`):

```ini
root = true

[*.cs]
# ownership
dotnet_diagnostic.CA2000.severity = error
dotnet_diagnostic.CA2213.severity = error
dotnet_diagnostic.CA1001.severity = error
dotnet_diagnostic.IDISP001.severity = error
dotnet_diagnostic.IDISP004.severity = error
dotnet_diagnostic.IDISP024.severity = error
dotnet_diagnostic.IDISP025.severity = error
# sync-over-async / fire-and-forget
dotnet_diagnostic.CA1849.severity = error
dotnet_diagnostic.CA2012.severity = error
dotnet_diagnostic.VSTHRD002.severity = error
dotnet_diagnostic.VSTHRD100.severity = error
dotnet_diagnostic.VSTHRD101.severity = error
dotnet_diagnostic.VSTHRD103.severity = error
dotnet_diagnostic.VSTHRD110.severity = error
dotnet_diagnostic.RS0030.severity = error
dotnet_diagnostic.CS4014.severity = error
```

CA1063 stays at its default (off) and is not promoted; the fix for an unsealed `IDisposable` is `sealed`, enforced by IDISP025. `AnalysisMode=All` adds noise (CA1002, CA1030, CA1062, CA1515 on exes, CA2007 on test code) that the project must suppress explicitly; the sibling topic recommends a pinned recommended level plus explicit severities, which is equivalent here as long as CA2000, CA2213, CA1001, CA1849 and CA2012 are listed (they are not in Recommended except CA1001, CA2012 and CA1816, section 7).

`BannedSymbols.txt` (`$FX/analyzers/BannedSymbols.txt`; every line watched firing RS0030 on `$FX/analyzers/bans/Bans.cs`, 19 planted call forms, lines 10-28, and 0 hits on the green twin). Syntax per the [BannedApiAnalyzers help](https://github.com/dotnet/roslyn-analyzers/blob/main/src/Microsoft.CodeAnalysis.BannedApiAnalyzers/BannedApiAnalyzers.Help.md): `{doc-comment ID};optional description`, `//` comments, file registered as `<AdditionalFiles Include="BannedSymbols.txt" />`.

```text
// RS0030 fragment for library code: no blocking on Task / ValueTask / awaiters, no Thread.Sleep.
// Documentation-comment ID syntax: nested types use '.', generic arity uses a backtick.
M:System.Threading.Tasks.Task.Wait;Do not block on a Task; await it
M:System.Threading.Tasks.Task.Wait(System.Int32);Do not block on a Task; await it
M:System.Threading.Tasks.Task.Wait(System.TimeSpan);Do not block on a Task; await it
M:System.Threading.Tasks.Task.Wait(System.Threading.CancellationToken);Do not block on a Task; await it
M:System.Threading.Tasks.Task.Wait(System.Int32,System.Threading.CancellationToken);Do not block on a Task; await it
M:System.Threading.Tasks.Task.WaitAll(System.Threading.Tasks.Task[]);Do not block; await Task.WhenAll
M:System.Threading.Tasks.Task.WaitAll(System.ReadOnlySpan{System.Threading.Tasks.Task});Do not block; await Task.WhenAll (params ReadOnlySpan overload, .NET 9+)
M:System.Threading.Tasks.Task.WaitAny(System.Threading.Tasks.Task[]);Do not block; await Task.WhenAny
P:System.Threading.Tasks.Task`1.Result;Do not block on Task<T>.Result; await it
M:System.Runtime.CompilerServices.TaskAwaiter.GetResult;Do not use GetAwaiter().GetResult() in library code
M:System.Runtime.CompilerServices.TaskAwaiter`1.GetResult;Do not use GetAwaiter().GetResult() in library code
M:System.Runtime.CompilerServices.ConfiguredTaskAwaitable.ConfiguredTaskAwaiter.GetResult;Do not use GetAwaiter().GetResult() in library code
M:System.Runtime.CompilerServices.ConfiguredTaskAwaitable`1.ConfiguredTaskAwaiter.GetResult;Do not use GetAwaiter().GetResult() in library code
M:System.Runtime.CompilerServices.ValueTaskAwaiter.GetResult;Do not block on ValueTask
M:System.Runtime.CompilerServices.ValueTaskAwaiter`1.GetResult;Do not block on ValueTask
M:System.Runtime.CompilerServices.ConfiguredValueTaskAwaitable.ConfiguredValueTaskAwaiter.GetResult;Do not block on ValueTask
M:System.Runtime.CompilerServices.ConfiguredValueTaskAwaitable`1.ConfiguredValueTaskAwaiter.GetResult;Do not block on ValueTask
M:System.Threading.Thread.Sleep(System.Int32);Use await Task.Delay(.., ct)
M:System.Threading.Thread.Sleep(System.TimeSpan);Use await Task.Delay(.., ct)
```

Notes from the first attempt: without the `ReadOnlySpan` line `Task.WaitAll(T(), T())` compiled against the .NET 9+ `params ReadOnlySpan<Task>` overload and was NOT flagged; without the `ConfiguredTaskAwaiter` lines `x.ConfigureAwait(false).GetAwaiter().GetResult()` (the form agents write to look careful) was not flagged by RS0030 (VSTHRD002 still caught the `Result`/`Wait` forms in the fixture). The ban is not applied to the consumer-side tests or the sample `Main`: scope it by putting `BannedSymbols.txt` in the library project only, or `BannedSymbols.Tests.txt` override per project. The ban list is a floor, not a ceiling: `Process.WaitForExit()` (no arguments) is legitimately needed in a genuine sync leaf (pattern C), so it is deliberately not on the list; add it only to async-only assemblies.

### 13. Era notes: .NET 8 floor, .NET 10, .NET 11 RC1

- **.NET 8 floor:** the green engine builds and passes all 10 harness checks on `net8.0` (runtime 8.0.31) with the same analyzers; `Process.Kill(entireProcessTree: true)`, `Process.WaitForExitAsync(CancellationToken)` (net5+), `CancellationTokenRegistration : IAsyncDisposable`, `ArgumentList` are all present. `Process.WaitForExitAsync(TimeSpan)` does not exist on 10.0.401 or 11.0 RC1 (`CS1503: cannot convert from 'System.TimeSpan' to 'System.Threading.CancellationToken'`, observed on both), a hallucination magnet.
- **.NET 9+:** `Task.WaitAll(params ReadOnlySpan<Task>)` overload exists (ban list above). The starvation doc is written for .NET 9+; the `WaitHandleWait` trace event (`dotnet trace collect --clrevents waithandle --clreventlevel verbose`) shows sync-over-async stacks.
- **.NET 10 / C# 14:** no change to disposal or blocking rules; CA1063/CA2000/CA2213/CA1001/CA1849 remain "Enabled by default in .NET 10: No", CA2012 "As suggestion".
- **.NET 11 / C# 15 (RC1, GA Nov 2026):** (a) new `Process.Run`, `Process.RunAsync`, `Process.RunAndCaptureText[Async]`, `Process.StartAndForget`, `ProcessStartInfo.KillOnParentExit` (Windows job object; Linux/Android `PR_SET_PDEATHSIG`); "The high-level `RunAndCaptureText[Async]` and `Run[Async]` methods will also try to kill the process to avoid leaving it running" ([blog, 2026-05-13](https://devblogs.microsoft.com/dotnet/process-api-improvements-in-dotnet-11/)); verified on RC1: `Process.RunAndCaptureTextAsync("sh", ["-c","echo out; echo err >&2; exit 3"])` returned `ProcessTextOutput{ExitStatus, StandardOutput, StandardError, ProcessId}` with exit 3, and a 300 ms cancel threw `OperationCanceledException` after 303 ms leaving no `sleep` process. Those APIs do not exist on net8.0/net10.0, so a multi-targeted SDK keeps its own engine; revisit when the SDK floor becomes net11. (b) Runtime Async (`<Features>runtime-async=on</Features>`, preview, "last updated for RC 1") replaces compiler state machines with runtime suspension; it does not change the blocking, `ConfigureAwait` or disposal rules in this document, and the BCL itself is built with it ([What's new in the .NET 11 runtime](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/runtime)). (c) Async continuations can skip `ExecutionContext` capture when there is nothing to restore (same page).

### 14. Verified on the toolchain

All commands run from `$FX` with `T=/home/mherwig/.cache/research-lang/dotnet-tools/run.sh`; SDK 10.0.401 unless noted. Red/green pairs watched: 11 (listed). Outputs are the observed text (trimmed to one line where long).

**V1 Process fd leak (red crash / green flat).**

```sh
cd $FX/leak && $T dotnet build -v:q -nologo
bash -c "ulimit -Sn 1024; ulimit -Hn 1024; DOTNET_GCgen0size=0x10000000 $T dotnet bin/Debug/net10.0/Leak.dll red 2000"
bash -c "ulimit -Sn 1024; ulimit -Hn 1024; DOTNET_GCgen0size=0x10000000 $T dotnet bin/Debug/net10.0/Leak.dll green 2000"
```

red: `CRASH after 326 starts: Win32Exception: An error occurred trying to start process '/usr/sbin/true' ... Too many open files` then `red: starts=326 fds before=26 afterLoop=1020 afterForcedGC=45 peakSampled=941`. green: `green: starts=2000 fds before=26 afterLoop=53 afterForcedGC=53 peakSampled=53`. Without the gen0 knob (default GC): red `afterLoop=209 afterForcedGC=56 peakSampled=641`, green `53/53/53`. Variants: `close` -> `afterLoop=51`; `close-streams` -> `53`.

**V2 Deadlock under a single-threaded context (red / green).** `cd $FX/deadlock && $T dotnet build -v:q -nologo && for m in deadlock cfa async; do $T dotnet bin/Debug/net10.0/Deadlock.dll $m; done`:

```text
sync wrapper (.Result), library awaits WITHOUT ConfigureAwait(false): DEADLOCK (no completion within 3s) [3003 ms]
sync wrapper (.Result), library awaits WITH ConfigureAwait(false): ok [108 ms]
async all the way: ok [111 ms]
```

**V3 Thread-pool starvation (red / green).** `for c in 64 256 1024; do for m in starve-sync starve-async; do CALLS=$c $T dotnet bin/Debug/net10.0/Deadlock.dll $m; done; done`:

```text
sync-over-async x1024 concurrent on min-threads=4: 3395 ms (ideal ~100 ms), peak pool threads=112
async x1024 concurrent on min-threads=4: 115 ms (ideal ~100 ms), peak pool threads=20
```

(x64: 313 vs 109 ms; x256: 933 vs 109 ms.)

**V4 async void (red / green).** `cd $FX/asyncvoid && $T dotnet build -v:q -nologo && for m in void task forget; do $T dotnet bin/Debug/net10.0/AsyncVoid.dll $m; echo exit=$?; done`: `void` -> `Unhandled exception. System.InvalidOperationException: boom from async void ... at System.Threading.ThreadPoolWorkQueue.Dispatch()` exit 134; `task` -> `task: caller caught InvalidOperationException: boom from async Task` exit 0; `forget` -> `forget: no exception reached the caller; process still alive` exit 0.

**V5 Linked-CTS and registration retention (red / green).** `cd $FX/ctsleak && $T dotnet build -v:q -nologo && for m in linked-red linked-green reg-red reg-green; do $T dotnet bin/Debug/net10.0/CtsLeak.dll $m; done`:

```text
linked-red n=200000: retained after full GC = 28096 KiB (144 B/call)
linked-green n=200000: retained after full GC = 0 KiB (0 B/call)
reg-red n=200000: retained after full GC = 15579 KiB (80 B/call)
reg-green n=200000: retained after full GC = 0 KiB (0 B/call)
```

**V6 Analyzer sweep at Default and All (red / green).**

```sh
cd $FX/analyzers
for v in red green; do for m in Default All; do
  $T dotnet build -p:Variant=$v -p:Mode=$m -v:q -nologo --no-incremental 2>&1 | grep -E "warning|error" | sort -u > ../results/lint-$v-$m.txt
done; done
```

Diagnostic counts: red Default 26, red All 46, green Default 0, green All 0. Histogram red Default: `CS4014=3 IDISP001=4 IDISP024=1 IDISP025=1 RS0030=6 VSTHRD002=4 VSTHRD100=1 VSTHRD101=2 VSTHRD103=2 VSTHRD110=2`. Added by All: `CA1001=1 CA1002=1 CA1030=3 CA1062=1 CA1063=2 CA1816=1 CA1849=3 CA2000=3 CA2012=3 CA2213=2`. SDK-only (no analyzer packages, `$FX/sdkonly`): Default `CS4014=3`; All `CA1001=1 CA1002=1 CA1030=3 CA1062=1 CA1063=2 CA1816=1 CA1849=3 CA2000=3 CA2007=7 CA2012=3 CA2213=2 CS4014=3`. Representative lines: `Red.cs(8,9): warning IDISP001: Dispose created` (Process.Start), `Red.cs(67,52): warning VSTHRD002: Synchronously waiting on tasks or awaiters may cause deadlocks. Use await or JoinableTaskFactory.Run instead.`, `Red.cs(81,30): warning VSTHRD100: Avoid "async void" methods, because any exceptions not handled by the method will crash the process`, `Red.cs(124,57): warning VSTHRD101: Avoid using async lambda for a void returning delegate type`.

**V7 Errors break the build (red exit 1 / green exit 0).**

```sh
cd $FX/analyzers   # with the .editorconfig in section 12
for v in red green; do $T dotnet build -p:Variant=$v -p:Mode=All -v:q -nologo --no-incremental >/dev/null 2>&1; echo "$v exit=$?"; done
```

Output: `red exit=1`, `green exit=0`. Red unique error rules: CA1001 CA1849 CA2000 CA2012 CA2213 CS4014 IDISP001 IDISP024 IDISP025 RS0030 VSTHRD002 VSTHRD100 VSTHRD101 VSTHRD103 VSTHRD110.

**V8 BannedSymbols: 19 forms.** `cd $FX/analyzers && $T dotnet build -p:Variant=bans -p:Mode=Default -v:q -nologo --no-incremental 2>&1 | grep RS0030 | ...` -> RS0030 on every line 10-28 of `bans/Bans.cs`; message example `Bans.cs(15,33): error RS0030: The symbol 'Task.WaitAll(params ReadOnlySpan<Task>)' is banned in this project: Do not block; await Task.WhenAll (params ReadOnlySpan overload, .NET 9+)`. Before adding the span line line 15 was the only miss. Green variant: 0 RS0030.

**V9 ripgrep rules (red hits / green hits).** Using the real binary (`R=/home/mherwig/.ocx/toolchain/active/bin/rg`; the interactive `rg` in this shell is wrapped), `--glob '*.cs'` over `red` and `green`:

| rule (see N-rules 3, 4, 6, 10, 12) | red | green |
|---|---|---|
| finalizer `^\s*~[A-Z]\w*\s*\(\s*\)` | 1 | 0 |
| `void\s+Dispose\(\s*(bool\|System\.Boolean)\b` | 2 | 0 |
| `\.GetAwaiter\(\)\s*\.GetResult\(\)`, `\.Wait\(`, `\.Result\b` | 5 | 0 |
| `async\s+void\s+\w+\s*\(` | 1 | 0 |
| Process not under `using` | 2 | 0 |
| dropped `.Register(` | 1 | 0 |
| `\b(Action\|Action<[^>]+>)\s+\w+\s*=\s*async\b` | 1 | 0 |
| `GC\.SuppressFinalize` | 3 | 0 |

**V10 Green engine on the floor and the target (all PASS).** `cd $FX/engine && $T dotnet build -nologo` (TreatWarningsAsErrors, AnalysisMode All, three packs: `0 Warning(s) 0 Error(s)` for net8.0 and net10.0) then `$T dotnet bin/Debug/net10.0/Engine.dll` and `.../net8.0/Engine.dll`:

```text
PASS echo exit=0 out=hi
PASS exit code + stderr exit=3
PASS cancel throws OCE after 404 ms
PASS cancelled child is dead pid=343146
PASS timeout throws TimeoutException
PASS timed-out child is dead pid=343219
PASS Process.Dispose() leaves the child running pid=343252
PASS ProcessHandle sync Dispose kills pid=343253
PASS ProcessHandle DisposeAsync kills pid=343272
PASS 300 more cancelled runs add no fds (no linear growth) fds 65 -> 65
```

net8.0 identical (`fds 64 -> 64`). The fd check is a plateau test: 100 warm-up cancelled runs then +300 runs add <= 4 fds; a first attempt (20 warm-up) failed with `fds 63 -> 77` because the runtime holds a bounded transient of pipes until GC (a sampled run shows 69 flat from 100 to 500 runs, 63 after a forced GC), which is why the assertion is "no linear growth", not "no change".

**V11 .NET 11 RC1.** `cd $FX/net11probe && $T dotnet --version` -> `11.0.100-rc.1.26425.128`; `Process.RunAndCaptureTextAsync("sh", ["-c","echo out; echo err >&2; exit 3"])` -> `exit=3 out=out err=err`; `RunAndCaptureTextAsync("sleep", ["30"], cancellationToken: cts.Token)` with 300 ms -> `cancelled after 303 ms`, `pgrep -x sleep | wc -l` -> `0`.

## Normative guidance candidates

Verification commands assume source under `src` and tests under `test`; `R` is `rg`. "Expect no output" lines use `! rg -q` so the shell exit status is 0 on pass.

1. **The method that creates a `Process`, `CancellationTokenSource`, linked source or `CancellationTokenRegistration` disposes it with `using var` / `await using var`.** Rationale: ownership stays lexical, the leak is 3 fds per call or 144 B per call. Verify: IDISP001 + IDISP004 + CA2000 at `error` (section 12 editorconfig) and `dotnet build -p:AnalysisMode=All`; plus `! rg -q -P '^(?!.*\busing\b).*(new\s+Process\s*[({]|Process\.Start\()' --glob '*.cs' src` (misses `Process p = new();` target-typed; the analyzers catch it).
2. **A dropped registration is a defect.** `token.Register(...)` must be assigned to a `using`/`await using` variable. Rationale: 80 B/call retained on a long-lived token and no analyzer notices. Verify: `! rg -q -P '^(?!.*(\busing\b|=[^=>])).*\.Register\(' --glob '*.cs' src`.
3. **Seal every class; an unsealed `IDisposable` is a review failure, not a reason to add `Dispose(bool)`.** Rationale: sealed types need `public void Dispose() => _x.Dispose();` only; CA1063's demand is about inheritance nobody asked for. Verify: IDISP025 = error; `! rg -q -P '^\s*(public|internal)\s+(?!sealed|abstract|static|sealed\s+partial|static\s+partial|record|struct|interface|enum)(partial\s+)?class\s+\w+[^{]*:\s*[^{]*\bI(Async)?Disposable\b' --glob '*.cs' src` (rough; reading heuristic: every class type declaration in `src` carries `sealed`, `abstract` or `static`).
4. **No finalizer, no `Dispose(bool)`, no `GC.SuppressFinalize` in SDK code; unmanaged handles are wrapped in `SafeHandle`.** Rationale: managed-only classes need none of it, the FDG says "AVOID making types finalizable", and no analyzer catches the pointless version. Verify: `! rg -q -P '^\s*~[A-Z]\w*\s*\(\s*\)' --glob '*.cs' src`, `! rg -q -P 'void\s+Dispose\(\s*(bool|System\.Boolean)\b' --glob '*.cs' src`, `! rg -q 'GC\.SuppressFinalize' --glob '*.cs' src`; IDISP024 = error. An allow-list entry must name the unmanaged resource in a comment.
5. **Types that own a live process implement both `IDisposable` and `IAsyncDisposable`, are `sealed`, guard with `Interlocked.Exchange`, and kill the process tree before releasing it.** `IAsyncDisposable`-only requires an XML-doc sentence "async cleanup only; use await using". Rationale: MS cautions that an async-only type leaks under a consumer that calls `Dispose`; `Process.Dispose` does not kill. Verify: reading heuristic on every `class .*IAsyncDisposable` hit (`rg -n -P 'class\s+\w+[^{]*\bIAsyncDisposable\b' --glob '*.cs' src` and check the line also lists `IDisposable` or the doc comment states why not); runtime check: a test that starts `sleep 30` through the handle, disposes it both ways and asserts the pid is gone (the engine fixture does this).
6. **A stateless client owns no OS resource and implements neither disposal interface.** Rationale: an `IDisposable` client forces `using` on every caller and CA2000 noise for nothing (the Python SDK client has no `close`). Verify: `rg -n -P 'class\s+\w*(Client|Ocx)\w*[^{]*\bI(Async)?Disposable\b' --glob '*.cs' src` lists only types with a documented owned resource.
7. **Dispose is idempotent, thread-safe and non-throwing.** `if (Interlocked.Exchange(ref _disposed, 1) != 0) return;`; kill calls catch `InvalidOperationException` and `Win32Exception` only. Rationale: FDG "DO allow the Dispose(bool) method to be called more than once"; "AVOID throwing an exception from within Dispose". Verify: `rg -n -P 'Interlocked\.Exchange\(ref _disposed' --glob '*.cs' src` appears in every disposable type; reading heuristic for `catch (Exception)` inside `Dispose`/`DisposeAsync`.
8. **Never expose `Process.StandardOutput`/`StandardError`/`StandardInput` or the `Process` itself from a one-shot API.** Callers get strings or typed records; only a documented live-handle API exposes a stream, and then the handle owns it. Rationale: the engine method is the single owner of pipes and pump tasks. Verify: `! rg -q -P 'public\s+[^;(]*(StandardOutput|StandardError|StandardInput|Process)\b[^;(]*[({=]' --glob '*.cs' src` outside the handle file (reading heuristic: public signatures contain no `System.Diagnostics.Process`).
9. **Observe every started pump task; after cancellation kill first, then await/observe the tasks, then dispose.** Rationale: an abandoned faulted read is a silent failure and a disposed `Process` leaves tasks touching closed pipes. Verify: reading heuristic: each `ReadToEndAsync`/`CopyToAsync` task started in a method is awaited in all exits (`Task.WhenAll` or an `ObserveAsync` helper); VSTHRD110 = error.
10. **No `.Result`, `.Wait(...)`, `.GetAwaiter().GetResult()`, `Task.WaitAll/WaitAny` or `Thread.Sleep` in the library.** Rationale: deadlock under a single-threaded context (3 003 ms hang) and pool starvation (3 395 ms vs 115 ms for 1 024 calls). Verify: RS0030 = error with the section 12 `BannedSymbols.txt`; VSTHRD002/VSTHRD103 = error; `! rg -q -P '\.GetAwaiter\(\)\s*\.GetResult\(\)|\.Wait\(|\.Result\b|Thread\.Sleep' --glob '*.cs' src`. Documented exceptions carry `#pragma warning disable VSTHRD002 // reason` on the line and are limited to one file (`Sync.cs`).
11. **No sync API that wraps the async body in v1.** If a sync twin is approved, it is a separate leaf (`bool async` flag or a genuine sync driver) with its own tests, documented as blocking, and absent from the async-only assemblies. Rationale: Toub 2012, CliWrap/Anthropic/Pulumi precedent; Npgsql/SimpleExec shapes are the safe alternatives. Verify: public API listing (`dotnet build` with PublicApiAnalyzers or `rg -n -P 'public\s+(?!static\s+async)\S+\s+\w+\((?!.*CancellationToken)' --glob '*.cs' src` reading heuristic) contains no non-`Async` I/O method; PR checklist item "sync entry points: none (v1)".
12. **No `async void` except a thin event handler outside the library; no async lambda for a void delegate.** Rationale: process-terminating exceptions (exit 134 observed). Verify: VSTHRD100 + VSTHRD101 = error; `! rg -q -P 'async\s+void\s+\w+\s*\(' --glob '*.cs' src`; `! rg -q -P '\b(Action|Action<[^>]+>)\s+\w+\s*=\s*async\b' --glob '*.cs' src`.
13. **No fire-and-forget, and the discard is not an observation.** Rationale: `_ = FooAsync();` silences CS4014/VSTHRD110 and loses the exception. Verify: VSTHRD110 + CS4014 = error; `! rg -q -P '^\s*_\s*=\s*[\w.]*Async\(' --glob '*.cs' src`; background work is a field `Task` awaited in `DisposeAsync`.
14. **`ValueTask` is awaited exactly once, never stored, never `.Result`/`GetAwaiter().GetResult()`; public SDK methods return `Task`.** Rationale: CA2012 corruption cases; the audit found CA2012 only "As suggestion" by default. Verify: CA2012 = error; `! rg -q -P '\bValueTask(<[^>]+>)?\s+\w+\s*=\s*(?!default|new)' --glob '*.cs' src` (reading heuristic: no ValueTask local is used twice).
15. **Every await in library code ends in `.ConfigureAwait(false)`, including `await using` (configured form).** Rationale: consumer-side single-threaded contexts; the same fixture hang disappears (108 ms). Verify: CA2007 = error in `src` projects only (not tests); observed flagging of unconfigured `await using` declarations at All. (Token/ConfigureAwait signature rules are owned by csharp-async-cancellation-and-context.)
16. **Engine skeleton: one call = one `Process`; `ArgumentList` only; `RedirectStandardInput` closed immediately; linked CTS with `CancelAfter` for timeout; `Kill(entireProcessTree: true)` from a registration made before pipes are read; timeout surfaces as `TimeoutException`, caller cancel as `OperationCanceledException`.** Rationale: no leak on any exit path; the 300-run plateau and "child is dead" assertions pass on net8.0 and net10.0. Verify: runtime tests equal to the engine harness (kill, timeout, dispose-leaves-child, no linear fd growth); `rg -n 'ArgumentList\.Add' --glob '*.cs' src` and `! rg -q -P 'StartInfo\.Arguments\s*=|new\s+ProcessStartInfo\([^)]*,[^)]*\)' --glob '*.cs' src`.
17. **Analyzer gate is part of the build, not a CI extra.** `Directory.Build.props` references `Microsoft.VisualStudio.Threading.Analyzers`, `IDisposableAnalyzers`, `Microsoft.CodeAnalysis.BannedApiAnalyzers` (versions pinned in `Directory.Packages.props`), `<AnalysisMode>All</AnalysisMode>`, and the 16 severities of section 12 at `error` in `.editorconfig`. Rationale: at Default nothing but CS4014 fires (measured) and CA2000 alone misses the runner shape. Verify: `rg -n -e '<AnalysisMode>All</AnalysisMode>' --glob 'Directory.Build.props' --glob '*.csproj' .`; `rg -n -e 'IDisposableAnalyzers' -e 'Microsoft.VisualStudio.Threading.Analyzers' -e 'Microsoft.CodeAnalysis.BannedApiAnalyzers' --glob 'Directory.*.props' .` returns all three; `rg -c -P 'dotnet_diagnostic\.(CA2000|CA2213|CA1001|CA1849|CA2012|IDISP001|IDISP004|IDISP024|IDISP025|VSTHRD002|VSTHRD100|VSTHRD101|VSTHRD103|VSTHRD110|RS0030|CS4014)\.severity = error' .editorconfig` prints `16`; `dotnet build -p:TreatWarningsAsErrors=true -v:q` exits 0.
18. **Do not use the .NET 11 `Process.Run*` APIs until the SDK floor is net11; when adopted, wrap them behind `#if NET11_0_OR_GREATER` and keep the same cancellation/timeout contract.** Rationale: preview API, absent on net8/net10; `Process.Dispose` semantics unchanged. Verify: `! rg -q -e 'Process\.RunAsync' -e 'Process\.RunAndCaptureText' -e 'StartAndForget' -e 'KillOnParentExit' --glob '*.cs' src` unless every hit sits under `#if NET11_0_OR_GREATER`.

## AI-agent angle

| What an LLM characteristically gets wrong | Why it compiles | Smallest mechanical check |
|---|---|---|
| Writes the full `Dispose(bool)` + finalizer + `SuppressFinalize` ritual on every `IDisposable`, often copying a pre-2019 sample or satisfying CA1063 | it is valid C# and no analyzer objects (0 diagnostics measured on a sealed managed-only class) | `! rg -q -e '~[A-Z]\w*\(\)' -e 'void Dispose\(bool' -e 'SuppressFinalize' --glob '*.cs' src`; IDISP024/IDISP025 = error |
| Fixes CA1063 by adding the pattern instead of sealing | CA1063 is satisfied | IDISP025 = error; reviewer asks "why is this class unsealed?" |
| Treats `Process.Dispose()` or `Close()` as "stop the process" | docs say Dispose releases resources; the name suggests cleanup | runtime test: spawn `sleep 30`, dispose, assert pid gone; `rg -n 'Kill\(' ` must appear in the same file as `new Process` |
| Forgets to dispose the `Process` or CTS in "quick" helper methods, especially `return p.ExitCode;` shapes | CA2000 misses it (measured); IDISP001 catches it | IDISP001/IDISP004 = error |
| Drops `token.Register(...)` or `CreateLinkedTokenSource` per call | compiles, passes unit tests, leaks 80/144 B per call | `! rg -q -P '^(?!.*(\busing\b|=[^=>])).*\.Register\(' --glob '*.cs' src`; IDISP001 for the linked source |
| Implements only `IAsyncDisposable` (or only `IDisposable`) because the example did | each is valid | CS8418 for sync `using` on async-only; rule 5 reading heuristic; MS caution on async-only |
| Adds a "convenience" `Run()` that does `RunAsync().Result` / `.GetAwaiter().GetResult()` and says `ConfigureAwait(false)` makes it safe | it works in a console test; the deadlock needs a single-threaded context; starvation needs concurrency | RS0030 + VSTHRD002 = error; `! rg -q -P '\.GetAwaiter\(\)\s*\.GetResult\(\)|\.Wait\(|\.Result\b' --glob '*.cs' src` |
| Writes `x.ConfigureAwait(false).GetAwaiter().GetResult()` to look careful | `ConfiguredTaskAwaiter` is a different type from `TaskAwaiter` | the `ConfiguredTaskAwaiter` BannedSymbols lines (watched firing) |
| Uses `Task.WaitAll(a, b)` believing it is banned like `Task.WaitAll(Task[])` | .NET 9+ binds to the `ReadOnlySpan<Task>` overload | the span line in BannedSymbols (watched: was the only miss) |
| Uses `async void` for callbacks, or an `async` lambda for `Action`/`ForEach` | both are legal | VSTHRD100/VSTHRD101 = error |
| "Fixes" CS4014/VSTHRD110 with `_ = FooAsync();` | the discard compiles clean and satisfies both analyzers (measured: 0 diagnostics) | `! rg -q -P '^\s*_\s*=\s*[\w.]*Async\(' --glob '*.cs' src` |
| Wraps a sync call in `Task.Run` to fake an async API, or `await Task.Run(() => d.Dispose())` inside `DisposeAsync` | compiles, "async" signature | `rg -n 'Task\.Run' --glob '*.cs' src` every hit needs a reason comment; VSTHRD110 flags the unobserved form |
| Calls hallucinated `Process.WaitForExitAsync(TimeSpan)` or `WaitForExitAsync(int)` | none exist; only `CancellationToken` | build failure CS1503 on net10.0 and net11.0 RC1 (observed) |
| Uses `ValueTask` everywhere "for performance" and stores or double-awaits it | compiles | CA2012 = error (default only a suggestion); public API returns `Task` |
| Uses `StartInfo.Arguments` string concatenation with `UseShellExecute` defaults | works for simple input | `rg` for `StartInfo.Arguments\s*=`; `ArgumentList` only (rule 16) |
| Applies .NET Framework/ASP.NET advice: "`ConfigureAwait(false)` fixes the deadlock so `.Result` is fine" | true for the single-context deadlock only | starvation numbers (3 395 ms vs 115 ms); rule 10 |
| Suggests `Task.Run(() => ProcessRunner.Run(...))` in ASP.NET to avoid blocking | moves the block to another pool thread | rule 10/11; review for sync I/O inside `Task.Run` |

## Contested / evolving

- **`IAsyncDisposable`-only vs dual.** Microsoft (docs updated 2025-10-20) calls dual "typical" and async-only "acceptable" with a leak caution; Testcontainers and Aspire ship async-only, Redis ships separate dual paths. Trend: dual for handles that can be killed synchronously, async-only for daemon/IO-bound cleanup. The decision turns on whether a synchronous best-effort release exists (for a process it does).
- **Sync twin vs async-only.** Azure guidelines still say DO provide both (pattern B); new SDKs (Anthropic, CliWrap, Pulumi) are async-only; Toub's 2012 advice ("leave it up to the consumer") is still the reference. The Python SDK mirrors sync+async with duplicated drivers, which argues for parity in the SDK family but not for a C# wrapper. As of 2026-10 the trend in new .NET SDKs is async-only with consumer-side bridging at the process edge.
- **CA2000's value.** Dataflow-based, off by default at every level but All, and measurably misses `return p.ExitCode;`; many teams disable it. IDisposableAnalyzers is more precise for `IDisposable` but blind to async-only types. Whether to run both is a cost/noise judgement; this file recommends both for a resource-owning SDK.
- **ConfigureAwait(false) in libraries.** Still the library recommendation (Toub FAQ 2019: "if you're writing general-purpose library code, use `ConfigureAwait(false)`"); .NET 11 lets continuations skip `ExecutionContext` capture when nothing needs restoring and runtime-async preview changes the implementation, but the SynchronizationContext semantics are unchanged. Owned by the sibling topic; do not relax here.
- **`Process.Dispose` vs `Close` docs.** The Learn page says `Close` "does not close the standard output, input, and error readers and writers in case they are being referenced externally"; on Linux/.NET 10 `Close()` alone released the pipe fds in the fixture. Behaviour on Windows not measured; treat `using` as the contract.
- **.NET 11 `Process` improvements (preview/RC).** One-call run-and-capture, kill-on-cancel, `KillOnParentExit`; the blog's availability text conflicts with the attribute notes (Preview 4 vs Preview 5 for Linux). Expect to move the engine's kill/timeout/capture logic into BCL calls once the floor reaches net11 (2028+ for an LTS floor); until then keep the in-house engine.
- **Unobserved task exceptions.** The docs state escalation "according to the .NET exception policy when the task is garbage-collected"; in the fixture the dropped faulted `Task` neither crashed nor logged. Practice: treat as silent loss and ban the pattern.
- **CA2007 and `await using`.** This fixture observed CA2007 flagging unconfigured `await using` declarations at `AnalysisMode=All` on 10.0.401, contradicting the sibling note; to be reconciled in consolidation (re-run both fixtures on the same SDK).

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/implementing-dispose | Learn: Implement a Dispose method (primary) | ms.date 2025-10-22, updated 2026-06-18, .NET 10 era | SafeHandle vs finalizer, sealed one-liner, "no need to implement a finalizer" for managed-only |
| https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/implementing-disposeasync | Learn: Implement a DisposeAsync method (primary) | 2025-10-20 | dual pattern, async-only caution, stacked usings, ConfigureAwait on `await using` |
| https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/dispose-pattern | Framework Design Guidelines: Dispose Pattern (primary, reprint) | 2008 text, page updated 2026-03 | "AVOID making types finalizable", idempotence, no exceptions from Dispose |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1063 | CA1063 rule page (primary) | .NET 10, "Enabled by default: No" | what the rule demands on unsealed types |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2000 | CA2000 rule page (primary) | ms.date 2025-02-01, .NET 10 | special cases, ownership-transfer options, try/finally for returned disposables |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2213 | CA2213 rule page (primary) | .NET 10, not default | field disposal check scope (one call level) |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1001 | CA1001 rule page (primary) | .NET 10, not default | owners of disposable fields; respects `IAsyncDisposable` |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1849 | CA1849 rule page (primary) | .NET 10, not default | sync calls and `.Result` inside Task-returning methods |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2012 | CA2012 rule page (primary) | .NET 10, "As suggestion" | ValueTask consumption rules |
| https://microsoft.github.io/vs-threading/analyzers/index.html | vs-threading analyzer index (primary) | current (package 18.7.23) | IDs, default severities |
| https://microsoft.github.io/vs-threading/analyzers/VSTHRD002.html | VSTHRD002 (primary) | current | what is flagged, completed-task exemption, `JoinableTaskFactory.Run` |
| https://microsoft.github.io/vs-threading/analyzers/VSTHRD100.html | VSTHRD100 (primary) | current | async void crash statement, event-handler pattern |
| https://microsoft.github.io/vs-threading/analyzers/VSTHRD103.html | VSTHRD103 (primary) | current | sync-in-async detection and exclusions file |
| https://microsoft.github.io/vs-threading/analyzers/VSTHRD110.html | VSTHRD110 (primary) | current | observe-result rule and remedies |
| https://learn.microsoft.com/en-us/dotnet/core/diagnostics/debug-threadpool-starvation | Learn: Debug ThreadPool starvation (primary) | ms.date 2022-04, updated 2025-09, .NET 9+ | injection rates, 3x-cores heuristic, sync-over-async as top cause, `WaitHandleWait` event |
| https://learn.microsoft.com/en-us/dotnet/standard/threading/cancellation-in-managed-threads | Learn: Cancellation in managed threads (primary) | updated 2026-08 | dispose CTS, linked sources, registration deadlock rules |
| https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process?view=net-10.0 | Process class reference (primary) | updated 2026-09 | must dispose; members |
| https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process.close?view=net-10.0 | Process.Close (primary) | .NET 10 | Close/Dispose relation, readers/writers note |
| https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process.waitforexitasync?view=net-10.0 | Process.WaitForExitAsync (primary) | net-5.0..11.0 | only a CancellationToken overload; stores exceptions in the task |
| https://learn.microsoft.com/en-us/dotnet/api/system.threading.cancellationtokensource.dispose?view=net-10.0 | CancellationTokenSource.Dispose (primary) | updated 2026-07 | "Always call Dispose before you release your last reference" |
| https://learn.microsoft.com/en-us/dotnet/standard/parallel-programming/exception-handling-task-parallel-library | Learn: TPL exception handling (primary) | updated 2026-03 | unobserved exception policy; AggregateException vs await |
| https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/runtime | What's new in the .NET 11 runtime (primary) | updated for RC1, 2026-09 | Runtime Async V2, ExecutionContext opt-out |
| https://devblogs.microsoft.com/dotnet/process-api-improvements-in-dotnet-11/ | .NET Blog: Process API improvements in .NET 11 (primary) | 2026-05-13, Preview 4 | Run/RunAsync/RunAndCaptureText, kill on cancel, "Dispose does not kill", KillOnParentExit |
| https://devblogs.microsoft.com/dotnet/should-i-expose-synchronous-wrappers-for-asynchronous-methods/ | Toub: sync wrappers for async methods (primary, historical but still cited by docs) | 2012-04-13 | the canonical answer for library authors |
| https://devblogs.microsoft.com/dotnet/configureawait-faq/ | Toub: ConfigureAwait FAQ (primary) | 2019 | library guidance, "only affects the callbacks", `await using` |
| https://learn.microsoft.com/en-us/archive/msdn-magazine/2013/march/async-await-best-practices-in-asynchronous-programming | Cleary: Async/Await best practices | 2013-03 (historical, still the deadlock reference) | async void semantics, async all the way, deadlock explanation |
| https://azure.github.io/azure-sdk/dotnet_introduction.html | Azure SDK .NET design guidelines | current | sync+async pair rule and its rationale |
| https://github.com/dotnet/roslyn-analyzers/blob/main/src/Microsoft.CodeAnalysis.BannedApiAnalyzers/BannedApiAnalyzers.Help.md | BannedApiAnalyzers help (primary, dotnet/*) | current (package 5.6.0) | BannedSymbols.txt syntax, doc-comment IDs |
| https://github.com/DotNetAnalyzers/IDisposableAnalyzers | IDisposableAnalyzers README | package 4.0.8 | IDISP001-026 titles |
| `Tyrrrz__CliWrap@7dbc252fa773:CliWrap/Command.Execution.cs:164-188,383-385`; `CliWrap/Utils/SimplexStream.cs:171,175`; `CliWrap/CommandTask.cs:11,52` | real source: closest process engine | commit 2026-10-09 | one-method ownership of process, CTS, registrations; narrow justified sync bridge |
| `madelson__MedallionShell@e45f1f6ffd4c:MedallionShell/Command.cs:20,99-110,475-481`; `ProcessCommand.cs:88-96` | real source: handle-owned process, thin blocking `Wait()`/`Result` | commit 2023-04-04 (dormant) | pattern D |
| `testcontainers__testcontainers-dotnet@04cbb73fcc58:src/Testcontainers/Resource.cs:14,25` | real source: async-only disposal | 2026-10-10 | `IAsyncDisposable`-only precedent |
| `npgsql__npgsql@9c47244547c2:src/Npgsql/NpgsqlCommand.cs:1253,1266-1271`; `NpgsqlConnection.cs:832` | real source: `bool async` flag, sync facade | current | pattern B |
| `StackExchange__StackExchange.Redis@e7c43a269f53:src/StackExchange.Redis/ConnectionMultiplexer.cs:436-448,2845,2858`; `ConnectionMultiplexer.Debug.cs:32-35`; `PhysicalBridge.cs:153`; `RedisBase.cs:35-42` | real source: dual dispose, timeout `Wait`, finalizer as leak counter | current | patterns C, D |
| `adamralph__simple-exec@f80913246993:src/SimpleExec/Internal/ProcessExtensions.cs:36,44` | real source: genuine sync and async drivers | 2026-10-08 | pattern C for a process wrapper |
| `microsoft__vs-threading@f6d817997090:src/Microsoft.VisualStudio.Threading/JoinableTaskFactory.cs:217,390-395` | real source: sanctioned sync bridge | current | pattern E |
| `Azure__azure-sdk-for-net@32c48fc3d524:sdk/core/Azure.Core/src/Identity/ProcessRunner.cs:75-77,196-200`; `dotnet__aspire@af646baee1e8:.../Dcp/Process/ProcessUtil.cs:242-262`; `pulumi__pulumi-dotnet@2a0dca84f09b:sdk/Pulumi.Automation/Workspace.cs:24`; `DapperLib__Dapper@eb47546a408b:Dapper/SqlMapper.cs:846` + `SqlMapper.Async.cs:90` | real source: suppressed AZC0102, async-only process disposable, sync workspace disposal, sync/async twin | current | boundary cases |
| `/home/mherwig/dev/grimoire-lore/.agents/worktrees/csharp/.agents/research/csharp-audit/exemplar-language-shape.md:23,255,302-303,739-740`; `exemplar-cli-wrappers-and-sdks.md:162,278`; `python-sdk-digest.md:164`; `ocx-sdk-python@80136dde4162:src/ocx_sdk/_process.py:199,296,384,426` | local audits and the Python SDK this SDK mirrors | 2026-10-10 | corpus counts, sync/async twin precedent, no client close |
| `$FX` fixtures: leak, deadlock, asyncvoid, ctsleak, analyzers, sdkonly, engine, net11probe | this file's own verification | 2026-10-11, SDK 10.0.401 / 8.0.425 runtime / 11.0 RC1 | every "observed" claim |
