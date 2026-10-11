---
title: "Progress callbacks and streamed output in a .NET CLI-wrapper SDK: thread, order, completion, exception and back-pressure contract"
topic: csharp-async-callbacks-and-streaming (AS-05, PR-17)
agent: deep-dive researcher (research-lang, group "Revision: shared client state, thread-safety, and streaming callbacks")
model: sonnet (claude-sonnet-5-5)
date_researched: 2026-10-11
sources_count: 14 URLs (11 primary) + 9 exemplar files + 4 in-repo documents
scope: |
  Covers: whether v1 ships any streaming surface; the thread, context, ordering, completion and consumer-exception contract of the one
  callback that ships; back-pressure against CS-PROC's never-block-the-pump and 16 MiB rules; IProgress<T> / Progress<T>;
  IAsyncEnumerable<T> ([EnumeratorCancellation], WithCancellation, CS8425, CA2007 coverage, early break, re-enumeration,
  System.Linq.Async on net10). Every behavioural claim has a fixture watched red then green on SDK 10.0.401 (Linux, POSIX sh child).
  Not covered: Windows behaviour of these fixtures (mechanism-level only, flagged), client thread-safety and single-flight (sibling
  csharp-async-single-flight-and-thread-safety), the ILogger/ActivitySource decision (csharp-observability; this file only
  builds on OBS-LIB-14/15), macOS/arm64.
---

# Progress callbacks and streamed output

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [What ocx streams today, and the v1 decision](#1-what-ocx-streams-today-and-the-v1-decision)
   2. [Progress<T> is the wrong tool inside a library](#2-progresst-is-the-wrong-tool-inside-a-library)
   3. [The inline callback: which thread really runs it](#3-the-inline-callback-which-thread-really-runs-it)
   4. [Ordering, concurrency and "finished before the Task completes"](#4-ordering-concurrency-and-finished-before-the-task-completes)
   5. [A consumer callback that throws](#5-a-consumer-callback-that-throws)
   6. [Back-pressure against CS-PROC](#6-back-pressure-against-cs-proc)
   7. [Line framing and the per-line cap](#7-line-framing-and-the-per-line-cap)
   8. [IAsyncEnumerable<T>: the checklist for when it is added](#8-iasyncenumerablet-the-checklist-for-when-it-is-added)
   9. [System.Linq.Async on net10](#9-systemlinqasync-on-net10)
   10. [Async lambdas assigned to Action<string>](#10-async-lambdas-assigned-to-actionstring)
   11. [.NET 11 / C# 15](#11-net-11--c-15)
   12. [Verified on the toolchain](#12-verified-on-the-toolchain)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- v1 ships exactly one streaming surface: the optional `Action<string>? OnStderrLine` already fixed by OBS-LIB-14. No `IAsyncEnumerable<T>`, no `IProgress<T>`, no events. ocx has no progress contract: progress bars exist only on a TTY, a piped stderr carries 7 log lines (723 B) for `--log-level debug index list`, and `ocx exec` forwards the child's own output live.
- Adding an `IAsyncEnumerable<T>` later is source-compatible; shipping one now freezes a back-pressure policy, a kill-on-break policy and a cold/hot policy in `PublicAPI.Shipped.txt` for a command that does not stream.
- `Progress<T>` is banned inside the SDK: it posts every report to the captured `SynchronizationContext` (ThreadPool when none). Measured with a 2 ms handler on a 20 000-line flood: 1 066 of 20 000 callbacks had run when the Task completed, 7 271 arrived out of order, up to 43 ran concurrently.
- An exception thrown from a `Progress<T>` handler with no context is unhandled on a pool thread and kills the process (exit 134). Do not hand consumers a design that can do that.
- The callback runs inline on the stderr pump, which must start on a thread-pool thread. A pump started on the caller's thread ran all 20 000 callbacks on the caller's (UI) thread inside the call because the pipe reads completed synchronously. Fix: `await Task.CompletedTask.ConfigureAwait(ConfigureAwaitOptions.ForceYielding)` at engine entry (.NET 8+, accepted by CA2007).
- Contract: sequential per call, in stderr byte order, never concurrent within a call, concurrent across calls, thread-pool thread, never the captured context, `ExecutionContext` (AsyncLocal, `Activity.Current`) flows in.
- "Every callback finished before the Task completes" holds by construction when the engine awaits the pump task before completing. Measured: `seenAtTaskCompletion=20000`, 0 after. The one exception is a drain that hit `DrainTimedOut`: at most one invocation may still be in flight.
- Consumer fault: capture the first exception with `ExceptionDispatchInfo`, stop calling, keep draining at full speed, do not kill the child, rethrow the original exception after exit and drain unless the call itself failed. Unprotected: 8 199 ms hang (watchdog) and lost output; protected: 59 ms, same exception type and stack. This adds the rethrow to OBS-LIB-15, which stopped at "disable and keep draining".
- A slow inline callback stalls the child by exactly the consumer's time (3 019 ms for 1 500 x 2 ms). That is inherent in inline delivery. v1 documents "return quickly, hand off to your own queue" and adds no SDK queue.
- A bounded `Channel<T>` with `BoundedChannelFullMode.Wait` in the pump is the same stall (child finished after 5 625 ms of a 6 027 ms consumer). Unbounded buffers 149 100 of 150 000 lines. A byte-capped queue that drops and counts past the cap kept the child at 80 ms and memory at 262 144 B. Only the capped shape agrees with CS-PROC-10.
- Cap line length. A 64 MiB stderr with no newline produced one 67 108 864-char callback and 256 MiB of allocation; an 8 192-byte per-line cap allocated 0 MiB and delivered `truncated=true`.
- `[EnumeratorCancellation]` is mandatory on an iterator's token: CS8425 is a default-on warning, and without the attribute `WithCancellation(150 ms)` was ignored for the full 1 119 ms.
- CA2007 does not flag `await foreach (x in e.WithCancellation(ct))` and that spelling still captures the context (measured on a single-threaded context). Only `.ConfigureAwait(false)` leaves it. A grep gate is needed on top of the analyzer.
- `break` out of `await foreach` runs `DisposeAsync` only; with no `finally` that kills the child, the child and its `sleep 30` grandchild were still alive 500 ms later. With cancel + `Kill(true)` + join in `finally`, 0 survivors in 292 ms.
- A cold iterator enumerated twice spawns two processes. Medallion guards single enumeration with an exception; CliWrap's pull stream is cold.
- On net10 a `System.Linq.Async` 6.0.1 reference makes `Select`/`ToListAsync` ambiguous (CS0121). Remove the reference, or `ExcludeAssets=compile`; on net8 use `System.Linq.AsyncEnumerable` 10.0.0.
- Gates: RS0030 bans on `Progress<T>`, `Channel.CreateBounded`, `ChannelWriter<T>.WriteAsync` in `src/`; CS8425 and VSTHRD101 at error; one `catch (Exception)` site with a justified CA1031 suppression.

## Findings

### 1. What ocx streams today, and the v1 decision

Measured on the installed ocx in this session:

- Logs. `ocx --log-level debug --json --offline index list zz` writes 7 stderr lines, 723 bytes, and one 15-byte JSON document on stdout. The volume is three orders of magnitude below the 1 MB flood used in the fixtures. Stdout/stderr discipline (one JSON document on stdout; logs, warnings and progress on stderr) is in `ocx-cli-contract.md:68`.
- Progress. ocx draws progress only when stderr is a terminal (`ocx-cli-contract.md:73`, `progress_mode.rs:12`); the SDK pipes stderr, so there is no progress stream to expose.
- `exec` / `run`. The child's output is forwarded live and unbuffered. `ocx --offline exec -- sh -c 'echo a; sleep 1; echo b >&2; sleep 1; echo c' 2>&1 | while read ...` stamped the lines 1.00 s and 2.00 s apart. This is the only real stream, and CS-PROC-10 already routes passthrough output to a caller-supplied `Stream` sink.
- The Python SDK ships one callback, `on_log`, called per redacted stderr line from the pump thread, and rejects it on async paths (`ocx-sdk-python/src/ocx_sdk/_process.py:348-351`, sink at `:683-692`). Its pump `_drain` has no try/except (`:627-631`), so by reading a raising `on_log` ends that pump thread and the child blocks on a full pipe until the timeout. Not run; recorded as a Python defect, not as a C# precedent.

Decision: v1 has one streaming surface, `OcxClientOptions.OnStderrLine` (`Action<string>?`), as fixed by OBS-LIB-14. An iterator is deferred. The additive path stays open: a new `IAsyncEnumerable<T>` method is non-breaking, while a shipped iterator whose back-pressure or break semantics are later changed is breaking and would be frozen by PublicApiAnalyzers (CS-API). Trigger to revisit: ocx documents an event stream (the contract tier armed by `OCX_SDK_CONTRACT` will show it); then ship it `[Experimental]` per CS-API and follow section 8.

### 2. Progress<T> is the wrong tool inside a library

What the source does ([Progress.cs](https://source.dot.net/System.Private.CoreLib/src/runtime/src/libraries/System.Private.CoreLib/src/System/Progress.cs.html), read in full):

```csharp
_synchronizationContext = SynchronizationContext.Current ?? ProgressStatics.DefaultContext; // ctor
...
_synchronizationContext.Post(_invokeHandlers, value);                                        // OnReport
```

`ProgressStatics.DefaultContext` is a plain `new SynchronizationContext()`, whose `Post` queues to the ThreadPool. The documentation says the same ([Progress<T> remarks](https://learn.microsoft.com/en-us/dotnet/api/system.progress-1): "invoked through a SynchronizationContext instance captured when the instance is constructed. If there is no current SynchronizationContext ... the callbacks will be invoked on the ThreadPool"), and the handler documentation in the source warns the handler "could be invoked concurrently with itself". The 2012 design post ([Async in 4.5](https://devblogs.microsoft.com/dotnet/async-in-4-5-enabling-progress-and-cancellation-in-async-apis/)) sells it as UI marshalling and says nothing about ordering or completion.

Consequences, all measured (section 12, fixtures 1, 2, 4):

| Setting | Observed |
|---|---|
| No context (console, ASP.NET Core, test host), 2 ms handler, 20 000 lines | Task completed with 1 066 callbacks run; 7 271 out of order; 43 concurrent |
| Single-threaded context (UI stand-in), 20 us handler | 20 000 posts queued at once (`uiMaxQueueDepth=20000`); Task completed with 0 run; a UI probe posted 100 ms in waited 376 ms (frame budget about 16 ms) |
| Handler throws, no context | unhandled exception on a pool thread, process exit 134 |

Correct and incorrect, side by side:

```csharp
// WRONG inside the SDK: reorders, runs after the Task completes, and a throw kills the process.
public async Task<Result> RunAsync(IProgress<string>? progress, CancellationToken ct = default) { ... progress?.Report(line); }

// RIGHT: a plain delegate invoked inline by the pump; the SDK owns the thread and the completion order.
public Action<string>? OnStderrLine { get; init; }
```

A consumer who still wants UI marshalling writes `OnStderrLine = new Progress<string>(ui).Report` and accepts that their handler runs later; the property's XML docs say so. vs-threading ships `ProgressWithCompletion<T>` for exactly the missing property: "also allows asynchronous awaiting for all reports to be processed" (`microsoft__vs-threading@f6d817997090:src/Microsoft.VisualStudio.Threading/ProgressWithCompletion`1.cs:12-17`, built on a `TaskFactory` over the captured context, `:120`), which is evidence that plain `Progress<T>` does not provide it. Only 2 files in the 35 exemplar clones construct a `Progress<T>` (`grep -rlF 'new Progress<' --include='*.cs'`).

### 3. The inline callback: which thread really runs it

CS-PROC-09 starts the pumps "immediately after Start". In an `async` method everything up to the first incomplete await runs synchronously on the caller's thread. A pipe read that already has data completes synchronously, so a fast child lets the whole pump loop, and every callback, run on the caller's thread before the method returns its Task:

```csharp
// RED: pump started on the caller's thread.
public async Task<Raw> RunAsync(...) { using var p = Start(...); var err = PumpLinesAsync(p.StandardError.BaseStream, ...); ... }
// Observed on a single-threaded context: callbacksRunOnTheUiThread=20000, UI probe waited 338 ms.

// GREEN: leave the caller's thread and context before Process.Start and the first read (.NET 8+).
public async Task<Raw> RunAsync(...)
{
    await Task.CompletedTask.ConfigureAwait(ConfigureAwaitOptions.ForceYielding);
    using var p = Start(...); var err = PumpLinesAsync(...); ...
}
// Observed: callbacksRunOnTheUiThread=0, UI probe waited 0 ms.
```

[`ConfigureAwaitOptions.ForceYielding`](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.configureawaitoptions) "forces an await on an already completed Task to behave as if the Task wasn't yet completed"; without `ContinueOnCapturedContext` the continuation goes to the pool. CA2007 accepts this spelling (verified: no CA2007 on it with the rule at error). CS-ASYNC-06 already recommends it in place of `Task.Yield()`; this finding adds the reason that matters here: it also moves `Process.Start` (a blocking call, tens of ms) off a UI thread. `Task.Run(() => Pump(...))` gives the same callback thread (fixture `progress-ui-inline-green`) but does not move `Process.Start`.

The synchronous-completion behaviour was observed on Linux. Windows anonymous pipes read with overlapped I/O may complete later; the rule is stated unconditionally because correctness must not depend on child speed.

`ExecutionContext` flows into the pump continuation. Three concurrent calls each set an `AsyncLocal<string>`; each call's callbacks saw only their own value (`asynclocal: call-1 callbacks saw [call-1,call-1]`, same for 2 and 3). A client-level `OnStderrLine` therefore does not need a call-identity parameter: consumers correlate through `Activity.Current` or their own `AsyncLocal`, which also settles the per-call versus per-client question left open in the observability file.

### 4. Ordering, concurrency and "finished before the Task completes"

Contract that the engine shape gives for free, and what to document:

- One pump per stream, one reader loop: lines arrive in byte order of stderr and never overlap within a call. Stdout is never delivered in v1 (it is a JSON document or a passthrough `Stream`), so there is no stdout/stderr interleaving to define.
- Concurrent calls on one client invoke the same delegate concurrently. The delegate must be thread-safe; the SDK does not serialise across calls.
- Completion: the engine awaits the pump task before returning, so every `onLine` has returned. Fixture: `progress-inline-green` `seenAtTaskCompletion=20000`, `outOfOrder=0`, `maxConcurrentCallbacks=1`; same code with `Progress<string>`: `seenAtTaskCompletion=1066`.
- Exception to the guarantee: CS-PROC-13 abandons a pipe held by a grandchild after `DrainGrace` (5 s) and returns `DrainTimedOut = true`. A pump blocked inside a consumer callback at that moment cannot be recalled. Contract wording: "no callback starts after the Task completes; if `DrainTimedOut` is set, one invocation that started earlier may still be running". The engine sets a `sealed` flag (volatile) before returning, checked before each invocation.
- Cancellation, timeout and fault paths use the same rule: the engine joins the pump (bounded) before it throws.

### 5. A consumer callback that throws

What each reference does:

| Where | Behaviour on a throwing consumer callback | Citation |
|---|---|---|
| CliWrap `ToDelegate` / `Pulumi.Automation` `OnStandardError` | pipe task faults; a linked "panic" token kills the process; the exception propagates after the process is reaped | `Tyrrrz__CliWrap@7dbc252fa773:CliWrap/Command.Execution.cs:166-169,180-182,222-233,240,251-255`; Pulumi wires its callback through `PipeTarget.ToDelegate`: `pulumi__pulumi-dotnet@2a0dca84f09b:sdk/Pulumi.Automation/Commands/LocalPulumiCommand.cs:337-339` |
| Npgsql `Notice` event | catches everything, logs, never propagates | `npgsql__npgsql@9c47244547c2:src/Npgsql/NpgsqlConnection.cs:871-880` |
| Microsoft.Extensions.Logging `Logger.Log` | runs every provider, collects, rethrows one `AggregateException` | [Logger.cs](https://raw.githubusercontent.com/dotnet/runtime/v10.0.0/src/libraries/Microsoft.Extensions.Logging/src/Logger.cs) |
| Python `on_log` | pump thread ends; child blocks until timeout (by reading) | `_process.py:627-631` |
| Unprotected inline (red fixture) | pump task faults, child blocks on full pipe | below |

Fixture 5 (child writes 150 000 lines, about 1 MB, to stderr; callback throws on line 3):

```csharp
// RED: onLine(l) called bare in the pump. WhenAll(pump, exit) never completes; the child is blocked on a full stderr pipe.
// Observed: elapsed=8199 ms (the 8 s watchdog), InvalidOperationException surfaced only by the watchdog.

// GREEN: capture, disable, keep draining, rethrow after exit + drain.
ExceptionDispatchInfo? fault = null;
...
if (fault is null) { try { onLine(line); } catch (Exception e) { fault = ExceptionDispatchInfo.Capture(e); } }  // CA1031 suppressed here only
...
await process.WaitForExitAsync(ct).ConfigureAwait(false);
var raw = await pumps.ConfigureAwait(false);
fault?.Throw();                       // original type, original stack
// Observed: elapsed=59 ms, InvalidOperationException, stack top = the consumer's own frame (Throwing).
```

Decision on rethrow (a revision of OBS-LIB-15, which says "disable the callback after the first fault, keep draining" and does not say what happens to the fault):

- The child is not killed. A kill would turn a consumer bug into a half-applied `install`/`push`; letting ocx finish keeps its on-disk state consistent and costs only the remaining runtime, which the call's timeout still bounds.
- The fault is rethrown after the drain, original type, not wrapped, not an `AggregateException`, not an `OcxException` (CS-ERR keeps five leaves). A swallowed fault is invisible to an agent that has no human watching: lines stop after line 3 and nothing else tells it why.
- Precedence: if the call fails by itself (cancellation, `OcxTimeoutException`, any `OcxException`), that exception propagates and the callback fault is dropped, because the caller already gets a failure. Otherwise the callback exception replaces the result. The command did complete; its side effects happened. The XML docs say so.
- Contrast kept in section "Contested": swallow-and-log (Npgsql), kill-and-throw (CliWrap), aggregate-and-throw (M.E.L).

### 6. Back-pressure against CS-PROC

The conflict in the brief is real. CS-PROC-09/10 say the pump never stops reading; an inline callback or a bounded `Wait` queue does exactly that. Measured on a 1 MB (150 000-line) stderr flood, consumer pausing 2 ms every 100 lines (fixture 6, child timestamps its own exit):

| Shape | Child finished after | Consumer elapsed | Peak buffered | Lines lost |
|---|---|---|---|---|
| `Channel.CreateBounded(16)`, `FullMode.Wait`, `await WriteAsync` in the pump | 5 625 ms | 6 027 ms | 0 | 0 |
| Inline `Action<string>` (slow handler) | 3 019 ms | 3 233 ms | 0 | 0 |
| `CreateUnbounded` | 67 ms | 6 055 ms | 149 100 lines (about all of it) | 0 |
| Unbounded + byte cap (fixture used 256 KiB) + `TryWrite`, drop and count past the cap | 80 ms | 1 904 ms | 262 144 B | 103 677 |

- A bounded `Wait` queue and an inline callback both stall the child for the consumer's whole run. The `AttachedStream` remarks in Testcontainers say why this matters in practice: a client that stops reading "blocks the container and every other attached client" (`testcontainers__testcontainers-dotnet@04cbb73fcc58:src/Testcontainers/Clients/AttachedStream.cs:15-22`). CliWrap's pull stream is a rendezvous channel (`CliWrap/Utils/Channel.cs:12-24`, `TransmitAsync` waits for the consumer at `:46`) and so stalls the child by design.
- No exemplar uses `BoundedChannelFullMode.Wait` against a producer that must not block. Aspire's log stream is unbounded with `AllowSynchronousContinuations = false` (`dotnet__aspire@af646baee1e8:src/Aspire.Hosting/Dcp/ResourceLogSource.cs:48-52`, `DcpResourceWatcher.cs:65-66`); Serilog's batching sink is the only bounded channel in the corpus and its producer uses `TryWrite` (drop when full), `serilog__serilog@bebc7719004f:src/Serilog/Core/Sinks/Batching/BatchingSink.cs:70-73,104`. The documented defaults agree: a full bounded channel "asynchronously blocks the producer" ([Channels](https://learn.microsoft.com/en-us/dotnet/core/extensions/channels)).
- v1 policy: inline delivery, no SDK queue, "return quickly" in the docs. It stalls only when the consumer is slower than ocx's output, which for ocx logs is 7 lines. The stall is bounded by the call timeout. If a future streaming surface needs decoupling, the only compliant shape is the last table row: unbounded channel, byte count against the existing 16 MiB `MaxOutputBytes`, `TryWrite`, a dropped counter surfaced on the result. Ceiling: lossy past the cap, one consumer task more.
- Bans make the first row mechanical (section 12, fixture 13): `Channel.CreateBounded` and `ChannelWriter<T>.WriteAsync` in `src/` raise RS0030.

### 7. Line framing and the per-line cap

Splitting on `\n` and trimming `\r` is what OBS-LIB section 12 specifies. Missing from it: the line buffer itself must be capped, or CS-PROC-10's 16 MiB cap is bypassed by a child that never prints a newline. Fixture 8 (child writes 64 MiB of `a` with no newline to stderr):

```csharp
// RED: grow a MemoryStream until '\n'. One callback with a 67 108 864-char string; 256 MiB allocated; peak working set 271 MiB.
// GREEN: fixed byte[] of maxLine; past it set truncated=true and discard to the next '\n'.
//        Callback gets 8 192 chars, truncated=True; 0 MiB allocated; peak working set 45 MiB.
```

Default `MaxLineBytes` 64 KiB (the fixture used 8 192 to show the mechanism; the allocation shape is the same). A truncated line is delivered with a trailing marker, never dropped. The final unterminated fragment is delivered at EOF.

### 8. IAsyncEnumerable<T>: the checklist for when it is added

Not shipped in v1 (section 1). If and when ocx grows a documented stream, these are the verified rules.

**Token plumbing.** [`EnumeratorCancellationAttribute`](https://learn.microsoft.com/en-us/dotnet/api/system.runtime.compilerservices.enumeratorcancellationattribute) marks the parameter that receives the token from `GetAsyncEnumerator(CancellationToken)`. Without it:

```csharp
static async IAsyncEnumerable<int> Ticks(CancellationToken ct = default) { ... }          // RED
// warning CS8425: Async-iterator 'Ticks(CancellationToken)' has one or more parameters of type 'CancellationToken' but none of them
//   is decorated with the 'EnumeratorCancellation' attribute, so the cancellation token parameter from the generated
//   'IAsyncEnumerable<>.GetAsyncEnumerator' will be unconsumed
// await foreach (var t in Ticks().WithCancellation(cts.Token))   -> "completed all 40 items in 1119 ms; the 150 ms cancellation was ignored"

static async IAsyncEnumerable<int> Ticks([EnumeratorCancellation] CancellationToken ct = default) { ... }   // GREEN
// WithCancellation only: cancelled after 5 items in 162 ms; call-site token only: 152 ms; both given: either one fires (152 ms / 151 ms)
```

- CS8425 is on by default (a warning); under the unconditional TWAE of CS-BUILD it is an error, and `-p:TreatWarningsAsErrors=true` produced `error CS8425`. CS-ASYNC-10 already states `dotnet_diagnostic.CS8425.severity = error`; this file adds the measured effect and that the compiler combines both tokens (the spec says the `GetAsyncEnumerator` token "will supersede" the saved one, [async-streams proposal](https://raw.githubusercontent.com/dotnet/csharplang/main/proposals/csharp-8.0/async-streams.md); observed: either token cancels, so they are linked).
- Npgsql keeps the attribute off its public signature by returning from a non-iterator wrapper and putting `[EnumeratorCancellation]` on a local function (`npgsql__npgsql@9c47244547c2:src/Npgsql/Replication/Internal/LogicalReplicationConnectionExtensions.cs:145-149`). Azure.Core's `AsyncPageable<T>.GetAsyncEnumerator` takes `CancellationToken cancellationToken = default` and iterates `AsPages().ConfigureAwait(false).WithCancellation(cancellationToken)` (`Azure__azure-sdk-for-net@32c48fc3d524:sdk/core/Azure.Core/src/AsyncPageable.cs:100-103`). Azure's guideline text is only [`#dotnet-pagination-ienumerable`](https://azure.github.io/azure-sdk/dotnet_introduction.html) ("DO return Pageable<T> or AsyncPageable<T> from service methods that return a collection") plus the generic cancellation rule; it says nothing about progress or handler exceptions.

**ConfigureAwait on `await foreach`.** The tutorial states "By default, stream elements are processed in the captured context" and points to `ConfigureAwait` ([async streams](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/generate-consume-asynchronous-stream)); the spec shows `await foreach (T item in enumerable.ConfigureAwait(false))`. The CA2007 page ([CA2007](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2007)) lists only `Task`, "Enabled by default in .NET 10: No". Fixture 11, CA2007 at error, five spellings under a single-threaded context:

| Spelling | CA2007 | Continuation ran on |
|---|---|---|
| A `await foreach (x in Src(ct))` | error at (17,29) | context thread |
| B `... Src().WithCancellation(ct)` | **silent** | **context thread** |
| C `... .ConfigureAwait(false)` | silent | pool |
| D `... .WithCancellation(ct).ConfigureAwait(false)` | silent | pool |
| E `... .ConfigureAwait(false).WithCancellation(ct)` | silent | pool |

`WithCancellation` returns a `ConfiguredCancelableAsyncEnumerable<T>` with `continueOnCapturedContext: true`, which satisfies the analyzer but not the intent. The gate is therefore `CA2007 = error` plus a grep (rule CS-CB-15); CS-ASYNC-06's `await foreach` grep already catches B on single-line loops.

**Break and disposal.** The compiler expands `await foreach` to `try { while (await e.MoveNextAsync()) ... } finally { await e.DisposeAsync(); }` (tutorial and spec), so `break` runs only `DisposeAsync`. An iterator that starts a process and has no `finally` leaves it running:

```text
break[leak]      : loop exited after 35 ms; child alive 500 ms after break = True; 'sleep 30' processes = 2 (the sh and its grandchild)
break[unbounded] : loop exited after 292 ms (cancel + Kill(true) + join in finally); child alive = False; 'sleep 30' processes = 0
```

CliWrap documents and implements the green shape: "Abandoning the iterator (via break, return, or throw) will also forcefully terminate the underlying process" (`Tyrrrz__CliWrap@7dbc252fa773:CliWrap/EventStream/PullEventStreamCommandExtensions.cs:28-29`; `finally` at `:133-158`: cancel a linked source, then await the command task and swallow only the internally caused cancellation). Its push twin (`Observe`) cannot await in `Dispose`, so it detaches (`PushEventStreamCommandExtensions.cs:106-121`); that is why async disposal is the right surface for a process-owning stream.

**Multiple enumeration.** `async IAsyncEnumerable<T>` is cold: enumerating one instance twice spawned two child processes (`reenum: ... spawned 2 child processes`). Medallion refuses a second enumeration with `InvalidOperationException` ("can only be enumerated once", `madelson__MedallionShell@e45f1f6ffd4c:MedallionShell/Streams/MergedLinesEnumerable.cs:25-28`) and is a sync `IEnumerable` that blocks with `GetResult()` (`:62`). For a process-owning stream a documented cold contract is acceptable; if cold is unacceptable, add the once-only guard.

### 9. System.Linq.Async on net10

.NET 10 put `System.Linq.AsyncEnumerable` in the box ([breaking change](https://learn.microsoft.com/en-us/dotnet/core/compatibility/core-libraries/10.0/asyncenumerable)). Fixture 12:

```text
linq-red            (net10.0, PackageReference System.Linq.Async 6.0.1)  -> error CS0121: The call is ambiguous between ... System.Linq.AsyncEnumerable.Select<...>
linq-green-remove   (reference removed)                                   -> Build succeeded, prints 2,4
linq-green-exclude  (<ExcludeAssets>compile</ExcludeAssets>)              -> Build succeeded, prints 2,4
linq-multitarget    (net8.0;net10.0, System.Linq.AsyncEnumerable 10.0.0 only on net8.0) -> Build succeeded; runs 2,4 on both
```

The migration page also records that `SelectAwait(async (int i, CancellationToken ct) => ...)` must become `Select(async (i, ct) => ...)`. The SDK needs neither package in v1 (no iterators). Tests and tools that do LINQ over async sequences take the conditional `System.Linq.AsyncEnumerable` reference on net8 and nothing on net10.

### 10. Async lambdas assigned to Action<string>

`OnStderrLine = async line => await sink.WriteAsync(line)` compiles because `Action<string>` accepts an async-void lambda. Fixture `asyncvoid-*`: the exception thrown after the await was unhandled on a pool thread and ended the process; VS.Threading's VSTHRD101 flags it at error ("Avoid using async lambda for a void returning delegate type"). CS-ASYNC-16 already bans it in SDK code; here it matters for the documented consumer usage, so the README's recipe uses a synchronous handoff (`channel.Writer.TryWrite(line)`).

### 11. .NET 11 / C# 15

Probed with SDK 11.0.100-rc.1.26425.128, `net11.0`, `LangVersion latest`: CS8425 text and default severity are unchanged, and the ignored-token run is identical (1 123 ms). `Progress<T>` is unchanged in the 11.0 documentation moniker. `ConfigureAwaitOptions` and `Channel` have no .NET 11 change in the pages read. Nothing in this file needs an `#if NET11_0_OR_GREATER`.

### 12. Verified on the toolchain

Fixtures: `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-async-callbacks-and-streaming/`. Re-run everything: `cd` there and `./run-all.sh > transcript.txt` (about 2 minutes; the transcript is committed beside it). SDK 10.0.401, Linux x64, `/bin/sh` and `seq` as the stand-in child. 12 red/green pairs, 1 red-only (row 4) and 5 measurements:

| # | Claim | Red (command: `E=run.sh dotnet engine/bin/Release/net10.0/Engine.dll`) | Green |
|---|---|---|---|
| 1 | `Progress<T>` with no context reorders and lags | `CB_HZ=500 $E progress-default-red` -> `seenAtTaskCompletion=1066 ... outOfOrder=7271 maxConcurrentCallbacks=43` | `$E progress-inline-green` -> `seenAtTaskCompletion=20000 outOfOrder=0 maxConcurrentCallbacks=1` |
| 2 | `Progress<T>` floods a single-threaded context | `$E progress-ui-red` -> `seenAtTaskCompletion=0 uiMaxQueueDepth=20000 callbacksRunOnTheUiThread=20000`; probe waited 376 ms | `$E progress-ui-inline-green` -> `seenAtTaskCompletion=20000 callbacksRunOnTheUiThread=0`; probe 0 ms |
| 3 | Pump on the caller thread runs callbacks there | `$E progress-ui-inline-noyield-red` -> `callbacksRunOnTheUiThread=20000`, probe 338 ms | `$E progress-ui-forceyield-green` -> `callbacksRunOnTheUiThread=0`, probe 0 ms |
| 4 | Throwing `Progress<T>` handler kills the process | `$E progress-throw-crash; echo $?` -> `Unhandled exception. System.InvalidOperationException: consumer bug`, exit 134 | red only; the capture shape that survives a throwing callback is row 5's green |
| 5 | Throwing callback hangs the engine | `$E cb-naive-red` -> `elapsed=8199 ms` (watchdog) | `$E cb-capture-green` -> `elapsed=59 ms, exception=InvalidOperationException`, stack top is the consumer frame |
| 6 | Bounded `Wait` stalls the child | `$E stream bounded` -> `childFinishedAfter=5625 ms` | `$E stream capped` -> `childFinishedAfter=80 ms, dropped=103677, peakQueuedBytes=262144` |
| 7 | `break` leaks the child | `$E break leak` -> `alive 500ms after break = True; 'sleep 30' processes = 2` | `$E break unbounded` -> `alive = False; 'sleep 30' processes = 0` |
| 8 | Unbounded line buffer | `$E longline-red` -> `ONE line of 67108864 chars; allocated 256 MiB` | `$E longline-green` -> `8192 chars, truncated=True; allocated 0 MiB` |
| 9 | Missing `[EnumeratorCancellation]` | `iter-red`: `warning CS8425 ...`; `RED: completed all 40 items in 1119 ms; the 150 ms cancellation was ignored` | `iter-green`: all four token routes cancel after 5 items in about 150 ms |
| 10 | CA2007 gap | `ca2007-gap` with `dotnet_diagnostic.CA2007.severity = error`: only line 17 (A) errors; B runs on the context thread | D and E run on the pool thread |
| 11 | `System.Linq.Async` on net10 | `linq-red`: `error CS0121` | `linq-green-remove`, `linq-green-exclude`, `linq-multitarget`: `Build succeeded`, `2,4` |
| 12 | RS0030 bans | `bans-red`: RS0030 on `Progress<T>`, `Channel.CreateBounded<T>(int)`, `ChannelWriter<T>.WriteAsync(T, CancellationToken)` | `bans-green`: `Build succeeded` |
| 13 | async-void callback | `asyncvoid-red`: `error VSTHRD101`; `asyncvoid-run`: unhandled exception, process ends | `Action<string>` with a synchronous body |

Measurements without a twin: `stream inline-callback` -> `childFinishedAfter=3019 ms` (a slow inline callback is the bounded-queue stall); `stream unbounded` -> `childFinishedAfter=67 ms, peakQueuedLines=149100`; `reenum` -> 2 spawns; `asynclocal` -> each call's callbacks see only their own value; `net11-probe` -> CS8425 unchanged. The `exec` and `index list` stream facts in section 1 were measured with the installed ocx. Windows was not run; the claims that depend on pipe-read timing (section 3) are stated as rules that hold regardless.

## Normative guidance candidates

Rule IDs are provisional (`CS-CB-nn`); each is checkable. `src/` stands for the SDK source directory; replace it with the real project directory.

1. **CS-CB-01 (MUST): v1 exposes no `IAsyncEnumerable<T>`, `IProgress<T>` or .NET event; the only streaming member is `Action<string>? OnStderrLine`.** Why: ocx has no progress contract and an iterator freezes back-pressure, break and cold/hot semantics. Verify: `! rg -n -g '*.cs' -e 'IAsyncEnumerable<' -e 'IProgress<' -e '\bevent\s+' src/` and `! rg -n -e 'IAsyncEnumerable|IProgress|EventHandler' -g 'PublicAPI.*.txt' src/`.
2. **CS-CB-02 (MUST): the callback type is a synchronous `Action<string>`. `Progress<T>`, `Func<string, Task>` and `Func<string, ValueTask>` are not accepted or used in `src/`.** Why: `Progress<T>` reorders, lags and can crash the process (fixtures 1, 2, 4). Verify: `BannedSymbols.txt` line ``T:System.Progress`1;callbacks are inline Action<T>`` with `dotnet_diagnostic.RS0030.severity = error` (red/green: fixture 12); `! rg -n -g '*.cs' -e 'Func<string,\s*(Value)?Task>' src/`.
3. **CS-CB-03 (MUST): the engine entry method begins with `await Task.CompletedTask.ConfigureAwait(ConfigureAwaitOptions.ForceYielding);` before `Process.Start` and before any pump starts.** Why: otherwise a fast child runs every callback on the caller's thread inside the call (fixture 3). Verify: `rg -c -F 'ConfigureAwaitOptions.ForceYielding' src/` is at least 1 per engine entry point; the context test of CS-CB-11 asserts zero callbacks on the caller thread; net8 has the API, no `#if`.
4. **CS-CB-04 (MUST): callbacks of one call are sequential and in stderr byte order; the delegate may be invoked concurrently by concurrent calls; only the stderr pump invokes it.** Why: single pump loop, no stdout interleave to define. Verify: test with a counter whose `maxConcurrent` is 1 within a call and an `AsyncLocal` per call (fixture 9); XML docs on `OnStderrLine` state "sequential per call, concurrent across calls, thread-pool thread, thread-safe delegate required": `rg -c -e 'thread-pool' -e 'sequential' -e 'concurrent' src/` on the options file.
5. **CS-CB-05 (MUST): every `OnStderrLine` invocation has returned before the Task completes or faults; a volatile `sealed` flag is set before return and checked before each invocation; with `DrainTimedOut` one earlier invocation may still be running (documented).** Why: no consumer code after the awaited call. Verify: test counts `calls_after_return == 0` over 20 000 lines and over a cancelled call; the doc sentence about `DrainTimedOut` exists (`rg -n -F 'DrainTimedOut' src/` in the callback's remarks).
6. **CS-CB-06 (MUST): a throwing callback is caught once, captured with `ExceptionDispatchInfo.Capture`, disables further invocations, and never stops the drain or kills the child; after exit and drain the original exception is rethrown unless the call itself failed (cancellation, `OcxTimeoutException`, any `OcxException`), in which case that exception wins.** Why: the red fixture hangs 8 199 ms; the green returns in 59 ms with the consumer's exception and stack. Verify: test with a 1 MiB stderr child and a callback that throws on line 3 must finish under 5 s, throw the same type, show the consumer frame in `StackTrace`, and see `calls_after_throw == 0`; `rg -c 'ExceptionDispatchInfo.Capture' src/` equals 1; exactly one `#pragma warning disable CA1031` (or `[SuppressMessage]`) in `src/` carrying the text "consumer code must never break the drain": `rg -c 'CA1031' src/` is 1.
7. **CS-CB-07 (MUST NOT): no SDK queue between pump and callback, and no `Channel.CreateBounded`, `BoundedChannelFullMode.Wait` or awaited `ChannelWriter<T>.WriteAsync` in `src/`; the options docs say "return quickly; hand off to your own queue".** Why: any blocking hand-off stalls the child for the consumer's runtime (5 625 ms / 3 019 ms measured). If a decoupling queue is ever added, it is unbounded with a byte cap against `MaxOutputBytes`, `TryWrite`, and a dropped counter. Verify: BannedSymbols lines for `Channel.CreateBounded` (both overloads) and ``ChannelWriter`1.WriteAsync`` at RS0030 error (fixture 12); `! rg -n -g '*.cs' -e 'BoundedChannelFullMode' -e 'CreateBounded' src/`.
8. **CS-CB-08 (MUST): line framing is split on `\n`, trim one trailing `\r`, redact before invocation, deliver the final unterminated fragment, and cap each line at `MaxLineBytes` (default 65 536); past the cap discard to the next `\n` and deliver the line marked truncated.** Why: CS-PROC-10 bounds capture, not the line buffer (256 MiB for a 64 MiB line). Verify: test with a 64 MiB no-newline child asserting `GC.GetTotalAllocatedBytes(true)` delta under 8 MiB and a truncated line delivered; reading heuristic: the line buffer is a fixed `byte[]`/`ArrayPool` rental, never a growing `MemoryStream` or `StringBuilder`: `! rg -n -g '*.cs' -e 'new MemoryStream\(\)' -e 'ReadLineAsync' src/` in the pump file.
9. **CS-CB-09 (SHOULD): `OnStderrLine` is client-level, not per call; the SDK passes no call identity; the README tells consumers to correlate with `Activity.Current` or an `AsyncLocal`.** Why: `ExecutionContext` flows into the pump (fixture 9), so correlation is free and the 70-method surface stays unchanged. Verify: the context-flow test; `rg -c -g '*.cs' 'Action<string>\??\s+OnStderrLine' src/` shows exactly one declaration, on the options type.
10. **CS-CB-10 (SHOULD): a caller-supplied `Stream` sink for passthrough output (`exec`, `run`) follows the same fault contract as CS-CB-06: a throwing or failing sink is captured, the pump keeps draining into the void, the exception is rethrown after the drain.** Why: same mechanism, same hang (a stopped reader fills a pipe); measured for callbacks, extended by analogy and not separately measured for `Stream`. Verify: test with a sink that throws `IOException` on the first write against a 1 MiB child.
11. **CS-CB-11 (MUST): the callback contract has these tests: throw-on-line-3 (CS-CB-06), slow callback bounded by the call timeout (CS-CB-07), within-call concurrency 1 (CS-CB-04), no call after return including cancellation (CS-CB-05), no callback on the caller's thread under a single-threaded `SynchronizationContext` (CS-CB-03), 64 MiB line (CS-CB-08), `AsyncLocal` flow (CS-CB-09).** Verify: `dotnet test` on the callback test class with `--minimum-expected-tests 7` (xUnit v3 on MTP, CS-TEST) is green and fails when any test is removed; each test fails against the red fixture shape.
12. **CS-CB-12 (MUST NOT): no `async` lambda or `async void` method is assigned to or used as `Action<string>` in `src/`, tests, samples or README snippets.** Why: the exception ends the process (fixture 13). Verify: `dotnet_diagnostic.VSTHRD101.severity = error` and `VSTHRD100 = error` (CS-ASYNC-19); `! rg -n -g '*.md' -g '*.cs' -e 'OnStderrLine\s*=\s*async' .`.
13. **CS-CB-13 (MUST, if an iterator is ever added): it is `[Experimental]` at first release, cold, documented "each enumeration starts one ocx process", ends in `finally { cts.Cancel(); Kill(entireProcessTree: true); await exit and pumps }`, buffers with an unbounded channel plus byte cap and `TryWrite` (never bounded `Wait`), and takes `[EnumeratorCancellation] CancellationToken cancellationToken = default` as the last parameter.** Why: leak without the `finally` (fixture 7), stall with bounded `Wait` (fixture 6), ignored token without the attribute (fixture 9). Verify: a `break`-after-first-line test asserting the child pid is gone within 1 s; `dotnet_diagnostic.CS8425.severity = error`; the RS0030 bans of CS-CB-07.
14. **CS-CB-14 (MUST): `[EnumeratorCancellation]` on every async-iterator token, enforced as an error.** Why: silently ignored token (1 119 ms vs 150 ms). Verify: `dotnet_diagnostic.CS8425.severity = error` in `.editorconfig` (or TWAE, CS-BUILD); `dotnet build` on a method without the attribute prints `error CS8425`.
15. **CS-CB-15 (MUST): in `src/`, every `await foreach` and `await using` carries `.ConfigureAwait(false)` (either order with `.WithCancellation(...)`); `.WithCancellation(...)` alone does not count.** Why: CA2007 does not flag bare `WithCancellation(ct)`, which still captures the context (fixture 10). Verify: `dotnet_diagnostic.CA2007.severity = error` plus `! rg -n -g '*.cs' 'WithCancellation\(' src/ | rg -q -v ConfigureAwait` and `! rg -n -g '*.cs' -e 'await\s+(foreach|using)\b' src/ | rg -q -v ConfigureAwait`.
16. **CS-CB-16 (MUST NOT): no `System.Linq.Async` reference anywhere; LINQ over `IAsyncEnumerable<T>` uses the in-box `System.Linq.AsyncEnumerable` on net10 and a net8-conditional `System.Linq.AsyncEnumerable` 10.0.x package.** Why: CS0121 on every `Select`/`Where`/`ToListAsync`. Verify: `! rg -n -e 'System\.Linq\.Async"' -g '*.csproj' -g 'Directory.Packages.props' -g 'Directory.Build.props' .`; `dotnet build` of a net10 project that calls `Select` on `IAsyncEnumerable<T>` succeeds.
17. **CS-CB-17 (SHOULD): the README states, in this order: the callback runs on a thread-pool thread, never the caller's context; calls are sequential per call and concurrent across calls; a slow callback slows ocx; a throwing callback is rethrown after the command finished and its effects happened; `Progress<T>.Report` as the delegate is allowed but its handler runs later.** Verify: `rg -c -e 'thread-pool' -e 'slow' -e 'rethrown' -e 'Progress<' README.md` returns at least 4.

## AI-agent angle

| What an LLM does | Why it is wrong | Smallest mechanical check |
|---|---|---|
| Offers `IProgress<T>` / `new Progress<T>(...)` as the idiomatic .NET progress API for a CLI wrapper | Posts to the captured context or ThreadPool; reorders, lags, and a throwing handler exits the process (134) | RS0030 on ``T:System.Progress`1`` (fixture 12) |
| Assumes `Progress<T>` with no context "just calls the handler inline" | It queues to the ThreadPool (`new SynchronizationContext()` base `Post`) | read the `Post` line in Progress.cs; fixture 1 shows 7 271 reorderings |
| Starts the pump inside the async method and believes it is off the caller's thread | Everything before the first incomplete await runs on the caller's thread; fast pipes complete synchronously | `ForceYielding` grep (CS-CB-03) and the single-threaded-context test |
| "Back-pressure": `Channel.CreateBounded<string>(100)` in the stderr pump | Default `Wait` blocks the pump; the child stalls for the consumer's runtime (5 625 ms) | RS0030 on `CreateBounded` and `WriteAsync` |
| `catch (Exception) { }` around the callback | Silent loss of every later line; no signal to an agent with no human | CA1031 at error; exactly one suppression site; the throw-on-line-3 test expects the rethrow |
| Rethrows with `throw ex;` or wraps in `AggregateException` | Loses the consumer's stack, or changes the caller-visible type | test asserts type and the consumer frame in `StackTrace` |
| `OnStderrLine = async line => await ...` | Compiles to async void; the exception ends the process | VSTHRD101 at error (fixture 13) |
| `async IAsyncEnumerable<T> M(CancellationToken ct)` without the attribute, then `.WithCancellation(token)` at the call site | Token silently ignored: ran 1 119 ms instead of cancelling at 150 ms | CS8425 at error |
| Believes `.WithCancellation(ct)` covers ConfigureAwait, or that CA2007 would warn | It returns a captured-context awaitable and CA2007 stays silent | grep in CS-CB-15 |
| Writes `await foreach (...) { if (done) break; }` over a process-owning iterator with no `finally` | Child and grandchild survive the loop | `break`-after-first-line test |
| Adds `System.Linq.Async` 6.0.1 for `ToListAsync` on net10 | CS0121 ambiguity with the in-box `System.Linq.AsyncEnumerable` | `dotnet build`; `rg` over `*.csproj` |
| `Process.OutputDataReceived` / `BeginOutputReadLine` for "live output" | Event mode makes `WaitForExitAsync` wait for EOF (CS-PROC-09) | RS0030 lines already in CS-PROC |
| Reads lines with `ReadLineAsync` and calls it streaming | Unbounded line buffer: 256 MiB for a 64 MiB line | per-line cap test; `rg ReadLineAsync` in the pump file |
| Uses `Task.Yield()` to leave the context | Posts back to the captured context | BannedSymbols line from CS-ASYNC-06 |

## Contested / evolving

- **Swallow versus rethrow a consumer callback fault (open, as of 2026-10).** Npgsql swallows and logs (`NpgsqlConnection.cs:871-880`), M.E.L collects and rethrows an `AggregateException`, CliWrap kills the child and throws, the Python SDK loses the pump thread. This file recommends capture, drain, rethrow the original, because the failure otherwise has no observer. The case for swallow is outcome-neutrality: an observer should not change whether `install` "succeeded" (OBS-LIB-15 as written). The consolidator must pick; the drain behaviour (never stop reading, never kill) is common to both.
- **Inline `Action<T>` versus `IProgress<T>` (stable since 2012, trend: libraries avoid `IProgress<T>`).** Microsoft's own pages still present `Progress<T>` for UI marshalling. In the 35 exemplar clones 2 files construct one, and `IProgress<` is absent from the Azure.Core clone subset, OpenAI, Anthropic, Stripe, Octokit, Pulumi and Npgsql sources (`grep -rlF 'IProgress<'`). Library authors who need completion add their own (`ProgressWithCompletion<T>`).
- **Pull (`IAsyncEnumerable<T>`) versus push (callback or `IObservable<T>`).** CliWrap offers both and documents kill-on-abandon for each. For an SDK without a stream contract the callback wins; the pull model wins once ocx has typed events. Trend: C# async streams are routine in vendor SDKs (`[EnumeratorCancellation]` appears in 14 Anthropic and 2 OpenAI source files) for server-sent events, which ocx does not have.
- **Client-level versus per-call callback.** Settled here for v1 as client-level because `ExecutionContext` flows; Pulumi is per call. Revisit if a consumer needs two concurrent calls with different sinks and cannot use `AsyncLocal`.
- **`Task.Run` versus `ForceYielding` at engine entry.** Both move callbacks off the caller; only `ForceYielding` also moves `Process.Start`. `ForceYielding` is .NET 8+, which is the TFM floor, so no polyfill question arises. If the floor ever drops to netstandard2.0 the `Task.Run` form is the fallback.
- **Unverified on Windows.** The synchronous-completion trap (section 3) and the stall numbers were measured on Linux with `/bin/sh`. The mechanisms are OS-neutral (E1 deadlock already measured on both in CS-PROC) but the exact timings are not.
- **.NET 11 GA (Nov 2026).** No change found at RC1 in `Progress<T>`, `ConfigureAwaitOptions`, `Channel` or CS8425. Re-check at GA.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://learn.microsoft.com/en-us/dotnet/api/system.progress-1 | `Progress<T>` API reference (net-10.0 moniker, updated 2026-07-01) | .NET 10 | States context capture at construction and ThreadPool fallback; primary |
| https://source.dot.net/System.Private.CoreLib/src/runtime/src/libraries/System.Private.CoreLib/src/System/Progress.cs.html | `Progress<T>` source | .NET 10 | The `Post` call, `DefaultContext`, the "invoked concurrently with itself" comment; primary |
| https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/generate-consume-asynchronous-stream | Async streams tutorial | updated 2026-03 | Captured-context default, `ConfigureAwait`, `[EnumeratorCancellation]`, `WithCancellation`, the `finally` expansion; primary |
| https://raw.githubusercontent.com/dotnet/csharplang/main/proposals/csharp-8.0/async-streams.md | C# 8 async-streams proposal | C# 8, living | Token supersede rule, `await foreach` pattern, disposal expansion; primary |
| https://learn.microsoft.com/en-us/dotnet/api/system.runtime.compilerservices.enumeratorcancellationattribute | `EnumeratorCancellationAttribute` reference | .NET 10 | Exact meaning of the attribute; primary |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/core-libraries/10.0/asyncenumerable | Breaking change: System.Linq.AsyncEnumerable in .NET 10 | 2025-12 | The CS0121 cause and the three fixes; primary |
| https://learn.microsoft.com/en-us/dotnet/core/extensions/channels | Channels guide | updated 2026-04 | `BoundedChannelFullMode` table, "asynchronously blocks the producer", `AllowSynchronousContinuations`; primary |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2007 | CA2007 rule page | updated 2026-04 | Not enabled by default in .NET 10; text covers `Task` only, which explains the gap; primary |
| https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.configureawaitoptions | `ConfigureAwaitOptions` reference | .NET 8+ | `ForceYielding` definition; primary |
| https://raw.githubusercontent.com/dotnet/runtime/v10.0.0/src/libraries/Microsoft.Extensions.Logging/src/Logger.cs | M.E.L `Logger.Log` source | .NET 10 | The collect-then-rethrow precedent for observer faults; primary |
| https://azure.github.io/azure-sdk/dotnet_introduction.html | Azure SDK .NET guidelines | living | `AsyncPageable<T>` and cancellation rules; confirms no progress or handler-exception guidance; primary |
| https://devblogs.microsoft.com/dotnet/configureawait-faq/ | ConfigureAwait FAQ (Toub) | 2019 | `ConfigureAwait` extension on `IAsyncEnumerable<T>`; library guidance still current |
| https://devblogs.microsoft.com/dotnet/async-in-4-5-enabling-progress-and-cancellation-in-async-apis/ | Original `IProgress<T>` design post | 2012, historical | Shows the intended UI-marshalling use; says nothing on ordering or completion |
| https://www.jetbrains.com.cn/en-us/help/rider/CSharpWarnings_CS8425.html | Rider inspection page for CS8425 | 2026 | Third-party restatement of the warning and its fix |
| `Tyrrrz__CliWrap@7dbc252fa773:CliWrap/EventStream/PullEventStreamCommandExtensions.cs:28-29,133-158`, `CliWrap/Utils/Channel.cs:12-24`, `CliWrap/Command.Execution.cs:166-255`, `CliWrap/EventStream/PushEventStreamCommandExtensions.cs:106-121` | Exemplar: pull/push event streams, panic-kill | 2026 clone | Kill-on-abandon, rendezvous back-pressure, fault handling |
| `pulumi__pulumi-dotnet@2a0dca84f09b:sdk/Pulumi.Automation/Commands/LocalPulumiCommand.cs:337-339` | Exemplar: `Action<string>` stderr callback through `PipeTarget.ToDelegate` | 2026 clone | Closest shape to `OnStderrLine` |
| `testcontainers__testcontainers-dotnet@04cbb73fcc58:src/Testcontainers/Clients/AttachedStream.cs:15-22`, `Configurations/OutputConsumers/IOutputConsumer.cs:9-25` | Exemplar: output consumers as `Stream` sinks | 2026 clone | Remark on a non-reading client blocking the producer |
| `dotnet__aspire@af646baee1e8:src/Aspire.Hosting/Dcp/ResourceLogSource.cs:48-67`, `DcpResourceWatcher.cs:65-66` | Exemplar: unbounded log channels, `ConfigureAwait(false)` on `await foreach` | 2026 clone | Real log-streaming policy |
| `npgsql__npgsql@9c47244547c2:src/Npgsql/NpgsqlConnection.cs:871-880`, `Replication/Internal/LogicalReplicationConnectionExtensions.cs:145-149` | Exemplar: swallowing observer faults, attribute on a local function | 2026 clone | The swallow precedent; keeps `[EnumeratorCancellation]` off the public signature |
| `Azure__azure-sdk-for-net@32c48fc3d524:sdk/core/Azure.Core/src/AsyncPageable.cs:100-103` | Exemplar: `AsyncPageable<T>` enumerator | 2026 clone | `ConfigureAwait(false).WithCancellation(ct)` in a vendor SDK |
| `madelson__MedallionShell@e45f1f6ffd4c:MedallionShell/Streams/MergedLinesEnumerable.cs:25-28,62` | Exemplar: once-only line enumerable | 2026 clone | Single-enumeration guard; sync-over-async to avoid |
| `microsoft__vs-threading@f6d817997090:src/Microsoft.VisualStudio.Threading/ProgressWithCompletion`1.cs:12-17,120` | Exemplar: `Progress<T>` with awaitable completion | 2026 clone | Shows the missing completion property of `Progress<T>` |
| `serilog__serilog@bebc7719004f:src/Serilog/Core/Sinks/Batching/BatchingSink.cs:70-73,104` | Exemplar: bounded channel with `TryWrite` | 2026 clone | The only bounded channel in the corpus never blocks the producer |
| `/home/mherwig/dev/ocx-sdk-python/src/ocx_sdk/_process.py:348-351,627-631,683-692` | Python SDK `on_log` | 2026 | The parity reference; `_drain` has no fault guard |
| `csharp-observability/csharp-observability-library-instrumentation.md` section 12, OBS-LIB-14/15 | Prior wave: stderr surfacing contract | 2026-10 | The decisions this file builds on and revises |
| `csharp-async.md` CS-ASYNC-06/10/16/19; `csharp-process.md` CS-PROC-09/10/13 | Prior waves | 2026-10 | The rules this file must not re-decide |
