---
title: "The signature-level async contract of a public .NET library: CancellationToken, ConfigureAwait, Task/ValueTask, Async suffix"
topic: csharp-async-cancellation-and-context
agent: deep-dive researcher (group csharp-async)
model: sonnet
date_researched: 2026-10-10
sources_count: 26
scope: |
  Covers the SIGNATURE and CONTINUATION contract of a public async API in a modern .NET library (worked example: the ocx C# SDK): token name/position/default/forwarding, retrofit cost, ConfigureAwait policy and the analyzers that enforce it at each AnalysisLevel, ConfigureAwaitOptions, TaskCompletionSource thread theft, Task vs ValueTask, the Async suffix, async-only vs sync twins as a signature question.
  Era: C# 14 / .NET 10 LTS (SDK 10.0.401), .NET 8 floor (SDK 8.0.425 re-run), .NET 11 / C# 15 RC1 flagged where it differs.
  NOT covered: sync-over-async bodies and disposal (csharp-async disposal subtopic), process kill/grace/exit mechanics (csharp-process-cancellation-and-exit; the token contract here must be identical to it), async void / fire-and-forget (VSTHRD100/110), IAsyncEnumerable internals beyond the token attribute.
---

# The async contract of a public .NET library

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Token signature: name, position, default, one token](#1-token-signature-name-position-default-one-token)
   2. [Forwarding and the analyzer ladder (which rule fires at which AnalysisLevel)](#2-forwarding-and-the-analyzer-ladder)
   3. [Retrofit cost: what adding a token later does](#3-retrofit-cost-what-adding-a-token-later-does)
   4. [Cancellation outcome, timeouts, linked tokens](#4-cancellation-outcome-timeouts-linked-tokens)
   5. [ConfigureAwait: decide on reasons, not on the 82%](#5-configureawait-decide-on-reasons-not-on-the-82)
   6. [ConfigureAwaitOptions (.NET 8)](#6-configureawaitoptions-net-8)
   7. [TaskCompletionSource and thread theft](#7-taskcompletionsource-and-thread-theft)
   8. [Task vs ValueTask in a public API](#8-task-vs-valuetask-in-a-public-api)
   9. [The Async suffix](#9-the-async-suffix)
   10. [Async-only vs sync twins (signature question only)](#10-async-only-vs-sync-twins-signature-question-only)
   11. [Era notes: .NET 11 runtime-async](#11-era-notes-net-11-runtime-async)
   12. [Verified on the toolchain](#12-verified-on-the-toolchain)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

Conventions. Exemplar citations are `owner__repo@sha12:path:line` against `/home/mherwig/.cache/research-lang/exemplars/csharp/`. `$F` = `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-async-cancellation-and-context`. `$R` = `/home/mherwig/.cache/research-lang/dotnet-tools/run.sh`. `rg` examples use ripgrep flags (`-g`, `-P`, `-e`).

## Summary

- Every public async method that does I/O, waits or loops ends with exactly one `CancellationToken cancellationToken = default`, spelled exactly that, placed last. TAP names the parameter by convention ([TAP](https://learn.microsoft.com/en-us/dotnet/standard/asynchronous-programming-patterns/task-based-asynchronous-pattern-tap)); CA1068 enforces "last" ([CA1068](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1068)).
- Ship the token from release 1 as a defaulted parameter on the single method. Replacing `M(a)` by `M(a, ct = default)` later is source-compatible and BINARY-breaking (observed: `MissingMethodException`); keeping `M(a)` as a forwarding overload avoids it but doubles the surface (Pulumi did exactly this).
- CA2016 (forward the token), CA1068 (token last) and CA2012 (ValueTask misuse) are warnings from `AnalysisLevel` Minimum upward, but only "suggestion" in Default mode, which a CLI build never prints. The brief's premise that CA2016 is silent at `10.0-recommended` is false (observed: it fires at Minimum, Recommended and All). Only CA2007 is silent below `All`.
- Set `AnalysisLevel` to a pinned `10.0-recommended` (not `latest`) and add explicit `dotnet_diagnostic.CA2007.severity = error` for library projects; explicit severities beat `10.0-all`, which adds noise (CA1062, CA1822) that is not part of the async contract.
- CA2007 has blind spots: it does not flag `await foreach` or `await using`, nor awaits of `YieldAwaitable` (observed on SDK 10.0.401 and 11.0 RC1). Close the gap with Meziantou.Analyzer `MA0004` (flags all three, observed) or an `rg` check.
- A library keeps `ConfigureAwait(false)` on every await, even on net8+. The reason is the CONSUMER's context (WPF, WinForms, legacy ASP.NET, any single-threaded `SynchronizationContext`), not the runtime's: observed deadlock when a consumer blocks on `.Result`, completed with `ConfigureAwait(false)`; `ConfigureAwait(true)` and "false only on the first await" both still deadlock.
- ASP.NET Core and console apps have no `SynchronizationContext`, so `ConfigureAwait(false)` is a no-op there; application, test and sample code should NOT carry it (CA2007 = none outside library projects).
- `ConfigureAwaitOptions` (.NET 8) is accepted by CA2007 and equals `ConfigureAwait(false)` at `None`; its only new capability a library needs is `SuppressThrowing` on a non-generic `Task` (await a completion you intend to ignore the failure of); CA2261 blocks it on `Task<T>`.
- `new TaskCompletionSource<T>(TaskCreationOptions.RunContinuationsAsynchronously)` always, in library code. Without it the awaiting continuation runs inline inside `SetResult` on the completer's thread (observed: same thread id, completer blocked 300 ms, continuation saw a half-updated invariant). CA2247 only catches the wrong enum type; nothing in the SDK catches omission, so use the `rg -P` check below.
- Public async surface returns `Task`/`Task<T>`. `ValueTask` only with measurements, sync completion on the hot path and single-await consumers; never in an SDK whose every call spawns a process. BCL-mandated `ValueTask` (`DisposeAsync`, `MoveNextAsync`) is the exception, not a precedent.
- Name every public method that returns `Task`/`ValueTask`/`IAsyncEnumerable<T>` with the `Async` suffix and no sync method with it. Anthropic and Octokit drop it because they are async-only; BCL, Azure and TAP keep it. Enforce with VSTHRD200 (both directions, observed) rather than IDE1006 (only methods with the `async` keyword, and needs an explicit `dotnet_diagnostic.IDE1006.severity`).
- Async iterators need `[EnumeratorCancellation]` on the token or `WithCancellation(ct)` is silently ignored; CS8425 is a default-on compiler warning that finds it.
- `Task.WaitAsync(timeout)` stops WAITING, it does not cancel the work (observed: operation still finished). Use a linked `CancellationTokenSource` with `CancelAfter` and a `when (!cancellationToken.IsCancellationRequested)` filter to tell timeout from caller cancellation.
- On .NET 11 RC1, `Features=runtime-async=on` removes the compiler state machines but the context semantics are unchanged (observed: same deadlock/OK table); do not drop `ConfigureAwait(false)` because of it.
- A public async API is async-only until a consumer needs a sync twin; a sync twin must not be `GetAwaiter().GetResult()` over the async body (owned by the disposal subtopic).

## Findings

### 1. Token signature: name, position, default, one token

**Rule shape.** `Task<T> VerbAsync(<domain params>, <options>?, CancellationToken cancellationToken = default)`.

- Name. "By convention, the parameter is named `cancellationToken`" ([TAP](https://learn.microsoft.com/en-us/dotnet/standard/asynchronous-programming-patterns/task-based-asynchronous-pattern-tap)); Azure SDK guideline `dotnet-service-methods-cancellation`: "take an optional `CancellationToken` parameter called _cancellationToken_" ([Azure guidelines](https://azure.github.io/azure-sdk/dotnet_introduction.html)). Corpus: `cancellationToken` 4,537 of 4,958 token parameters (91.5%), `ct` 278 (254 of them in testcontainers), `cancellation` 57 (audit, `exemplar-language-shape.md` section 3.2). Names are NOT cosmetic: callers use named arguments, and renaming a parameter is a source-breaking change ([library breaking changes](https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/breaking-changes): "a renamed parameter will break callers that use named parameters").
- Position. CA1068: "It's considered a good API design practice to have such parameters be the last parameter" ([CA1068](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1068)). It does not fire when optional parameters follow a non-optional token or when `ref`/`out` follow it. Corpus: last in 4,729 of 4,958 (95.4%); the not-last cases are two-token signatures (CliWrap `forcefulCancellationToken`/`gracefulCancellationToken`, `Tyrrrz__CliWrap@7dbc252fa773:CliWrap/Command.Execution.cs:160`), Polly v7 legacy and testfx internals.
- Default. TAP: "Consumer code that doesn't desire cancellation can call a method that accepts a CancellationToken and provide `None` ... functionally equivalent to the default" ([TAP](https://learn.microsoft.com/en-us/dotnet/standard/asynchronous-programming-patterns/task-based-asynchronous-pattern-tap)). The same page offers the overload ladder (`M(...)` plus `M(..., CancellationToken)`) as legal; a defaulted parameter on a SINGLE method is the corpus norm for SDKs: Anthropic puts `CancellationToken cancellationToken = default` on the interface (`anthropics__anthropic-sdk-csharp@ae16e5933f39:src/Anthropic/Services/IMessageService.cs:43-46`) AND the implementation (`.../MessageService.cs:49-52`); OpenAI `CompleteChatAsync(IEnumerable<ChatMessage> messages, ChatCompletionOptions options = null, CancellationToken cancellationToken = default)` (`openai__openai-dotnet@1f0e8829acac:OpenAI/src/Custom/Chat/ChatClient.cs:146`); Stripe `CreateAsync(options, RequestOptions requestOptions = null, CancellationToken cancellationToken = default)` (`stripe__stripe-dotnet@dbdca6ba5efc:src/Stripe.net/Services/Customers/CustomerService.cs:73`). Put the default on both interface and implementation: callers bind to the static type.
- One token. CA2016 does not analyze a parent or callee with more than one `CancellationToken` parameter ([CA2016](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2016), "Non-violation examples"), so a two-token signature switches the forwarding gate off for that method. CliWrap's two tokens are the corpus's only graceful/forceful design. For the ocx SDK keep one token and carry grace policy in an options object (this has to match csharp-process-cancellation-and-exit; reconcile at consolidation).
- No `params` next to a token. `params` must be the last parameter, so a token cannot follow it; OpenAI therefore has a token-less `CompleteChatAsync(params ChatMessage[] messages)` (`openai__openai-dotnet@1f0e8829acac:OpenAI/src/Custom/Chat/ChatClient.cs:214`) that calls the options overload with no way to cancel. Take `IReadOnlyList<T>`/`IEnumerable<T>` instead.
- Non-public methods: no `= default`. `internal Task F(CancellationToken cancellationToken)` turns a forgotten forward into a compile error; the defaulted form compiles silently. (CA2016 also catches the omission when the callee has an optional token: its Example 1.)
- Which methods. Not "all async". TAP: "For methods that can't be canceled, don't provide overloads that accept a cancellation token; this helps indicate to the caller whether the target method is actually cancelable." The Stripe numbers show the failure mode: the audit counted 701 of 1,330 public `*Async` methods without a token. Re-measured here with a multi-line-aware scan: 1,321 of 1,971 under `src/`; **701 are one generated family**, `FetchRelatedObjectAsync()` on 498 event classes (`stripe__stripe-dotnet@dbdca6ba5efc:src/Stripe.net/Events/V2CommerceProductCatalogImportsFailedEvent.cs:24-27`), a network call nobody can cancel, and 569 are test methods. The ordinary service methods (e.g. `CustomerService.cs:73,91,123`) all have the token. Lesson: generated or "convenience" wrappers are where tokens go missing.

```csharp
// WRONG: token first, short name, no default, params blocks a trailing token
public Task<Result> InstallAsync(CancellationToken ct, string pkg);
public Task AddAsync(params string[] items);

// RIGHT
public Task<InstallResult> InstallAsync(string package, InstallOptions? options = null,
                                        CancellationToken cancellationToken = default);
public Task AddAsync(IReadOnlyList<string> items, CancellationToken cancellationToken = default);
```

### 2. Forwarding and the analyzer ladder

CA2016 "locates method invocations that could accept a CancellationToken parameter, but are not passing any" when the enclosing method has a token as its LAST parameter; it also matches an overload with a trailing token ([CA2016](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2016)). It is non-breaking to fix. Passing `default` or `CancellationToken.None` explicitly suppresses it, which is both the documented escape hatch and the way an agent defeats the rule (see AI-agent angle).

Which level turns what on (docs say "Enabled by default in .NET 10": CA2016 "As suggestion", CA1068 "As suggestion", CA2012 "As suggestion", CA2007 "No", CA2247 and CA2261 "As warning"; [CA2016](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2016), [CA2007](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2007), [CA2261](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2261), [CA2247](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2247)). Measured on SDK 10.0.401 by building `$F/a-gate/red-lib` (all five defects) at each level, and cross-checked against the SDK's own globalconfig files (`dotnet/sdk/10.0.401/Sdks/Microsoft.NET.Sdk/analyzers/build/config/analysislevel_10_<mode>.globalconfig`):

| AnalysisLevel | CA2016 | CA1068 | CA2012 | CA2007 | CA2247 / CA2261 |
|---|---|---|---|---|---|
| `10.0-default` (mode Default) | silent (suggestion) | silent | silent | silent | warning |
| `10.0-minimum` | warning | warning | warning | silent | warning |
| `10.0-recommended` | warning | warning | warning | **silent** | warning |
| `10.0-all` | warning | warning | warning | warning | warning |
| default + explicit `dotnet_diagnostic.<ID>.severity = error` | error | error | error | error | warning |

The overview page confirms the mode semantics (Default = few warnings plus IDE suggestions; Minimum/Recommended/All progressively more) ([code analysis overview](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/overview)) and that `AnalysisLevel` takes precedence over `AnalysisMode`, defaults to `latest`, and accepts `10.0-<mode>` ([MSBuild props](https://learn.microsoft.com/en-us/dotnet/core/project-sdk/msbuild-props#analysislevel)). Consequences:

1. `latest` (the default) moves the rule set when the SDK moves; pin `10.0-recommended` and bump deliberately. `dotnet msbuild -getProperty:AnalysisLevel` prints `latest` for an unconfigured project and the pinned value for a configured one (observed).
2. Default mode is the silent gate: `red-lib` built with exit 0 and no CA2016/CA1068/CA2012/CA2007 line.
3. The `_warnaserror` globalconfig variants exist so that `TreatWarningsAsErrors`/`-warnaserror` promotes the whole set; observed `-warnaserror` at `10.0-recommended` fails the build (exit 1) without ever mentioning CA2007.
4. CA2007 needs `All` or an explicit severity. Corpus: it is a build setting, not a belief: testfx `warning` (`microsoft__testfx@7226b0c74729:.editorconfig:446`), npgsql `warning` scoped to `src/` (`npgsql__npgsql@9c47244547c2:src/.editorconfig:16`) with CA2016 `error` (`.editorconfig:64`), Stripe `error` scoped to `[src/Stripe.net/**/*.cs]` (`stripe__stripe-dotnet@dbdca6ba5efc:.editorconfig:16-18`), xunit `none` (`xunit__xunit@0c7aa4991fa3:.editorconfig:261`), Azure lists CA2007 in `NoWarn` (`Azure__azure-sdk-for-net@32c48fc3d524:eng/Directory.Build.Common.props:67`) and still writes `.ConfigureAwait(false)` throughout Azure.Core (`.../Pipeline/HttpPipeline.cs:192`). The 82% prevalence tracks severity (audit: bimodal, 10 repos at 90% or more, 6 at under 20%).
5. Re-run on the floor SDK 8.0.425 (`net8.0`, `8.0-all`): the same CA2007/CA2016/CA1068/CA2012/CA2247/CA2261 set fired. On 11.0.100-rc.1 the CA2007 and CS8425 results were identical.

**CA2007 blind spots (observed).** At `10.0-all`, on both SDK 10.0.401 and 11.0 RC1, CA2007 flagged a plain `await Task.Delay(1)` but NOT `await foreach (... in src.WithCancellation(ct))` nor `await using (d)`; it also does not apply to `await Task.Yield()` because `YieldAwaitable` is not a `Task`/`ValueTask` (and `Task.Yield().ConfigureAwait(false)` does not compile: CS1929). Meziantou.Analyzer 3.0.297 `MA0004` ("Use Task.ConfigureAwait(false) if the current SynchronizationContext is not needed") flagged all three lines (`Iter.cs(17,33)`, `(18,22)`, `(24,45)`); listed in `meziantou__Meziantou.Analyzer@161b7e948ad3:README.md:37`. vs-threading ships `VSTHRD111` ("Use .ConfigureAwait(bool)") but it is hidden by default and encourages `ConfigureAwait(true)` where `JoinableTaskFactory` applies ([VSTHRD111](https://microsoft.github.io/vs-threading/analyzers/VSTHRD111.html)); it is a Visual Studio extension-author tool, not a general library gate.

### 3. Retrofit cost: what adding a token later does

Observed in `$F/d-retrofit` (three variants of one `Sdk.dll`, one consumer compiled against v1):

- v2 replaces `RunAsync(string)` by `RunAsync(string, CancellationToken = default)`. The old consumer, NOT recompiled, throws `MissingMethodException: Method not found: 'Task<Int32> Sdk.Client.RunAsync(String)'` (exit 134). Recompiled consumers using a method group (`Func<string, Task<int>> f = c.RunAsync;`) fail with `CS0123: No overload for 'RunAsync' matches delegate`. Source-compatible for plain calls, binary-breaking always ([library breaking changes](https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/breaking-changes): "adding a new parameter will cause assemblies compiled against the older version of the library to throw a MissingMethodException").
- v2 keeps `RunAsync(string)` and adds `RunAsync(string, CancellationToken)`: old consumer runs, method group still binds. This is the Pulumi route: `public static Task<WorkspaceStack> CreateStackAsync(InlineProgramArgs args) => CreateStackAsync(args, default);` (`pulumi__pulumi-dotnet@2a0dca84f09b:sdk/Pulumi.Automation/LocalWorkspace.cs:107-108`) next to the token overload (`:124`). Cost, measured with a public-declaration scan of `sdk/Pulumi.Automation`: 131 public `*Async` declarations, 18 still without a token, 6 method names that carry both a token-less and a token overload. CliWrap shows the same pressure as long-lived `// TODO: (breaking change) remove in favor of optional parameter` overload pairs (audit `exemplar-cli-wrappers-and-sdks.md`).
- The hidden second cost is analyzer noise: PublicApiAnalyzers `RS0026`/`RS0027` ("Do not add multiple public overloads with optional parameters") push you toward overload pairs, so a defaulted-parameter style and an overload style cannot be mixed freely (npgsql disables them only for `src/*/Internal/**.cs`, `npgsql__npgsql@9c47244547c2:.editorconfig`).

Decision for a new SDK: one method with `= default` from release 1; the retrofit is only ever an issue for APIs that shipped without it.

### 4. Cancellation outcome, timeouts, linked tokens

- Outcome. A cancelled TAP operation ends `Canceled` and awaiting it throws `OperationCanceledException` or a derived type; a token already cancelled at call time should yield a Canceled task; the task ends Canceled only if the operation actually ended because of the request ([TAP](https://learn.microsoft.com/en-us/dotnet/standard/asynchronous-programming-patterns/task-based-asynchronous-pattern-tap)). `TaskCanceledException` derives from `OperationCanceledException`; `Task.Delay` throws the former (observed), `ThrowIfCancellationRequested` the latter, so catch `OperationCanceledException`.
- Library-to-user cooperation: "If library code calls into user code, the library code should interpret an OperationCanceledException(externalToken) as cooperative cancellation" ([cancellation in managed threads](https://learn.microsoft.com/en-us/dotnet/standard/threading/cancellation-in-managed-threads)); linked sources and registrations must be disposed (same page).
- Timeout versus caller cancel: use `CreateLinkedTokenSource(cancellationToken)` + `CancelAfter(timeout)` and `catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)` to convert the internal timer into a `TimeoutException`. Observed in `$F/g-cancel`: with a linked source the exception's `CancellationToken` is the LINKED token (`e.CancellationToken == callerToken` is `False`), so test `cancellationToken.IsCancellationRequested`, never token identity. Completing a `TaskCompletionSource` with `TrySetCanceled(cancellationToken)` from a registration keeps the caller's token (`True`).
- `Task.WaitAsync(TimeSpan[, CancellationToken])` (.NET 6; `TimeProvider` overloads .NET 8) gives "a Task that will complete when this Task completes, when the specified timeout expires, or when the specified CancellationToken has cancellation requested" ([Task.WaitAsync](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.task.waitasync)): the original work keeps running. Observed: after the `TimeoutException`, the underlying task still reached `finished = true`. For a process-backed SDK this is the difference between "gave up waiting" and "killed the child".
- `CancellationTokenSource.CancelAsync()` (.NET 8) runs registered callbacks asynchronously and returns a task ([CancelAsync](https://learn.microsoft.com/en-us/dotnet/api/system.threading.cancellationtokensource.cancelasync)); `Cancel()` runs callbacks synchronously on the caller, so a slow callback blocks it ([cancellation in managed threads](https://learn.microsoft.com/en-us/dotnet/standard/threading/cancellation-in-managed-threads): "the call to Cancel does not return until the callback returns").
- Async iterators: the parameter needs `[EnumeratorCancellation]`. Observed: without it `CS8425` ("none of them is decorated with the 'EnumeratorCancellation' attribute, so the cancellation token parameter from the generated 'IAsyncEnumerable<>.GetAsyncEnumerator' method's 'cancellationToken' parameter will be unconsumed") fires at default level on 10.0.401 and 11.0 RC1; with it the file is clean. Corpus: `[EnumeratorCancellation]` appears only 32 times against 205 `IAsyncEnumerable` mentions (audit), i.e. many iterators lose `WithCancellation`.

### 5. ConfigureAwait: decide on reasons, not on the 82%

What the sources say:

- Library code: "if you're writing general-purpose library code, use ConfigureAwait(false)"; the .NET runtime libraries do it on every await and a missing call "is very likely a bug" ([ConfigureAwait FAQ](https://devblogs.microsoft.com/dotnet/configureawait-faq/)). Applications (UI handlers, tests, controllers) should not.
- CA2007: "intended for libraries ... generally appropriate to suppress the warning entirely for projects that represent application code"; for ASP.NET Core "by default there is no SynchronizationContext or TaskScheduler, for which reason a ConfigureAwait wouldn't actually change any behavior" ([CA2007](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2007)). Its `output_kind` option scopes it to library output: `dotnet_code_quality.CA2007.output_kind = DynamicallyLinkedLibrary`.
- `ConfigureAwait(false)` does not promise a thread-pool continuation; it only means "won't be queued back to the original context", and an already-completed awaitable continues synchronously. So "false on the first await only" is not enough ([ConfigureAwait FAQ](https://devblogs.microsoft.com/dotnet/configureawait-faq/)). Also `TaskScheduler.Current` is captured when there is no context; `false` ignores both.

Does a net8+ library still need it? Yes, and the reason is who consumes it, not which TFM it targets. The contexts that matter to the ocx C# SDK's consumers are any single-threaded `SynchronizationContext`: WPF/WinForms apps (named by CA2007), classic ASP.NET on .NET Framework (named by the FAQ), and any host that installs one; MAUI is expected to behave the same way but is not named in a primary source I fetched. Observed on `$F/b-deadlock` (consumer pumps a single-threaded `SynchronizationContext` and blocks on `Task.Wait(2s)`):

| Library variant | Result |
|---|---|
| `await Task.Delay(50);` (no ConfigureAwait) | DEADLOCK |
| `.ConfigureAwait(true)` | DEADLOCK |
| `await Task.CompletedTask.ConfigureAwait(false); await Task.Delay(50);` (first only) | DEADLOCK |
| `.ConfigureAwait(false)` | OK, 42 |
| `.ConfigureAwait(ConfigureAwaitOptions.None)` | OK, 42 |
| both awaits configured | OK, 42 |
| control: no context, no ConfigureAwait | OK, 42 |

The same table reproduced on 11.0.100-rc.1 with `net11.0` and `Features=runtime-async=on` (confirmed active: no `<..>d__N` state-machine types in the produced `lib.dll`, 12 in the net10 build).

Cost/benefit, honestly: the deadlock is the consumer's sync-over-async bug, and ASP.NET Core / console consumers never see it. But a wrapper SDK cannot know its host (a Windows tool with a WPF front-end is a plausible ocx consumer; "Modern .NET on Windows" is a hard requirement), the cost is ten characters per await, and the .NET 11 runtime notes say "Applications that use `ConfigureAwait(false)` and `AsyncLocal<T>` sparingly see reduced overhead" ([What's new in the .NET 11 runtime](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/runtime)): the idiom is being optimized, not retired. Decision: `ConfigureAwait(false)` on every await in library assemblies; none in tests, samples, apps.

Placement: Anthropic's own agent config says "library awaits use `.ConfigureAwait(false)`" (`anthropics__anthropic-sdk-csharp@ae16e5933f39:CLAUDE.md:64`), and its code does (`src/Anthropic/Services/MessageService.cs:56-57`). Wrapper helpers are legitimate when the compiler gate sees through them: StackExchange.Redis uses `.ForAwait()` 533 times (`StackExchange__StackExchange.Redis@e7c43a269f53:src/StackExchange.Redis/TaskExtensions.cs:72,74`), Polly threads a runtime flag (`ConfigureAwait(context.ContinueOnCapturedContext)`, 117 uses; `App-vNext__Polly@e4476096da5b:src/Polly.Core/ResilienceContext.cs:54`) because it executes user callbacks that may need the context. An SDK that invokes caller-supplied delegates (callbacks, progress) should document whether it posts back; the ocx SDK as designed does not.

### 6. ConfigureAwaitOptions (.NET 8)

`[Flags] enum ConfigureAwaitOptions { None = 0, ContinueOnCapturedContext = 1, SuppressThrowing = 2, ForceYielding = 4 }`, applicable from .NET 8 ([API](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.configureawaitoptions)). `None` equals `ConfigureAwait(false)` (observed: `optionsnone` OK in the deadlock table; CA2007 accepts it, `green-lib` is clean at `10.0-all` using `ConfigureAwait(ConfigureAwaitOptions.SuppressThrowing)`). Corpus adoption is near zero (one Polly site: `App-vNext__Polly@e4476096da5b:src/Polly.Core/Hedging/Controller/HedgingExecutionContext.cs:130`, `SuppressThrowing | (ContinueOnCapturedContext ? ContinueOnCapturedContext : 0)`).

- `SuppressThrowing`: await a `Task` that may end Faulted/Canceled without an exception. Observed (net8.0 and net10.0): both a Canceled and a Faulted task awaited quietly, while `ConfigureAwait(false)` on the same faulted task threw. Use: "wait for the child's exit task after we killed it; the failure is already reported elsewhere". It hides real faults: pair it with an explicit status check.
- Only non-generic `Task`: CA2261 (warning by default since .NET 8) because "`TResult` will be invalid"; cast `((Task)t).ConfigureAwait(...)` ([CA2261](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2261)).
- `ForceYielding`: forces a yield even if completed; it is the supported replacement for `await Task.Yield()` tricks and is not needed for the signature contract.
- Do not mass-migrate `ConfigureAwait(false)` to `ConfigureAwaitOptions.None`: it only reads worse, and the BCL/ecosystem uses the boolean overload. Use options only when you need `SuppressThrowing`/`ForceYielding`.

### 7. TaskCompletionSource and thread theft

Without `RunContinuationsAsynchronously`, "continuations run inline on the thread that calls SetResult, which can cause deadlocks and state corruption" ([Fowler async guidance](https://github.com/davidfowl/AspNetCoreDiagnosticScenarios/blob/master/AsyncGuidance.md): "Always use TaskCreationOptions.RunContinuationsAsynchronously when creating the TaskCompletionSource<T>"). The enum member "forces continuations added to the current task to be executed asynchronously" (available from .NET Framework 4.6; [TaskCreationOptions](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.taskcreationoptions)).

Observed in `$F/c-tcs` (completer thread takes a lock, sets `state = "UPDATING"`, calls `SetResult`, restores state; the continuation reads `state` under the same lock and then sleeps 300 ms):

| Mode | Same thread | `SetResult` blocked completer | State seen by continuation |
|---|---|---|---|
| `new TaskCompletionSource<int>()` | yes (thread 4 = 4) | 300 ms (THEFT) | `UPDATING (invariant broken)` (Monitor is re-entrant, so the inline continuation walked in) |
| `RunContinuationsAsynchronously` | no (4 vs 5) | 2 ms | `done (invariant restored)` |

In ocx terms: a `Process.Exited` handler or an stdout-pump thread that completes the "exited" TCS would run the consumer's continuation inside the runtime's event thread. CA2247 exists for the sibling mistake: `new TaskCompletionSource<int>(TaskContinuationOptions.RunContinuationsAsynchronously)` compiles (it binds to the `object state` overload) and silently ignores the option ([CA2247](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2247); default-on warning, observed in `red-lib` at every level). Nothing in the SDK flags the OMISSION. Corpus: the safe form dominates where it matters (`Azure__azure-sdk-for-net@32c48fc3d524:sdk/core/Azure.Core/src/Identity/ProcessRunner.cs:51-53`, `App-vNext__Polly@e4476096da5b:src/Polly.Core/CircuitBreaker/Controller/ScheduledTaskExecutor.cs:29`, `pulumi__pulumi-dotnet@2a0dca84f09b:sdk/Pulumi.Automation/Events/GrpcEventWatcher.cs:29`, vs-threading `AsyncBarrier.cs:78` and `AsyncCrossProcessMutex.cs:120`); vs-threading makes inlining an explicit opt-in (`allowInliningContinuations ? TaskCreationOptions.None : TaskCreationOptions.RunContinuationsAsynchronously`, `microsoft__vs-threading@f6d817997090:src/Microsoft.VisualStudio.Threading/AsyncAutoResetEvent.cs:172`).

Cancellation-aware pattern (observed, token identity preserved):

```csharp
static async Task<int> WaitForSignalAsync(TaskCompletionSource<int> tcs, CancellationToken cancellationToken)
{
    using CancellationTokenRegistration reg = cancellationToken.Register(
        static s => { var (t, c) = ((TaskCompletionSource<int>, CancellationToken))s!; t.TrySetCanceled(c); },
        (tcs, cancellationToken));
    return await tcs.Task.ConfigureAwait(false);
}
```

### 8. Task vs ValueTask in a public API

- "The default choice is still Task / Task<TResult>" for new async APIs; consider `ValueTask` only when consumers await directly, allocation matters and sync completion is common or pooling is possible; `ValueTask` costs more state-machine space and microbenchmarks show `Task<T>` await slightly faster ([Understanding ValueTask](https://devblogs.microsoft.com/dotnet/understanding-the-whys-whats-and-whens-of-valuetask/)). TAP's current wording: use `ValueTask` "only when measurements show allocation pressure and when consumers can handle the extra usage constraints" ([TAP](https://learn.microsoft.com/en-us/dotnet/standard/asynchronous-programming-patterns/task-based-asynchronous-pattern-tap)). Azure: "DO return `Task<Response<T>>` or `Task<Response>` from asynchronous methods that make network requests" (`dotnet-service-methods-response-async`, [Azure guidelines](https://azure.github.io/azure-sdk/dotnet_introduction.html)), while its internal pipeline contract is `ValueTask ProcessAsync` (`Azure__azure-sdk-for-net@32c48fc3d524:sdk/core/Azure.Core/src/Pipeline/HttpPipelinePolicy.cs:20`): `ValueTask` where the hot path completes synchronously, `Task` on the customer-facing method.
- Consumption limits: never await twice, never await concurrently, never `GetAwaiter().GetResult()` before completion; use `.AsTask()` first ([ValueTask post](https://devblogs.microsoft.com/dotnet/understanding-the-whys-whats-and-whens-of-valuetask/)). CA2012 enforces ("directly awaited rather than discarded or stored"; [CA2012](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2012)). Observed: `ValueTask<int> v = GetAsync(); await v; await v;` is CA2012 at Minimum and above; `GetAsync().AsTask()` twice is clean.
- Corpus: 1,807 `ValueTask` mentions against 11,810 `Task` (13%), concentrated in BenchmarkDotNet, xunit, npgsql, Azure and Polly; the SDK-shaped repos (Octokit, CliWrap, OpenAI, Anthropic, Dapper) are `Task`-first (audit section 3.2).
- ocx SDK: each call spawns a process and parses output; there is no allocation-bound hot path, so every public method is `Task`/`Task<T>`. BCL-mandated `ValueTask` (`IAsyncDisposable.DisposeAsync`, `IAsyncEnumerator<T>.MoveNextAsync`) is not a precedent for ordinary methods.
- Style note: Fowler's guidance to prefer `async`/`await` over returning the inner `Task` (exceptions get captured in the returned task rather than thrown synchronously) matches TAP ("assign exceptions ... to the returned task", usage errors may throw synchronously) ([Fowler](https://github.com/davidfowl/AspNetCoreDiagnosticScenarios/blob/master/AsyncGuidance.md), [TAP](https://learn.microsoft.com/en-us/dotnet/standard/asynchronous-programming-patterns/task-based-asynchronous-pattern-tap)).

### 9. The Async suffix

- TAP: "Use the `Async` suffix for methods that return awaitable types"; "Don't append `Async` to synchronous methods"; exemptions only for combinators (`WhenAll`); if a type already has an EAP `GetAsync`, use `TaskAsync` ([TAP](https://learn.microsoft.com/en-us/dotnet/standard/asynchronous-programming-patterns/task-based-asynchronous-pattern-tap)). Azure: `dotnet-service-methods-naming` "names of the asynchronous and the synchronous variants differ only by the _Async_ suffix" ([Azure guidelines](https://azure.github.io/azure-sdk/dotnet_introduction.html)).
- Who drops it: Anthropic (`Task<Message> Create(...)`, `IMessageService.cs:43`; the audit counts 1,034 public `Task` methods and 0 suffixed) and Octokit (`Task<Repository> Get(...)`, `octokit__octokit.net:.../Clients/RepositoriesClient.cs:285`, audit). Both are async-only SDKs, so the suffix would carry no disambiguation. Who keeps it: BCL, Azure, Pulumi.Automation (165 declarations), Stripe, OpenAI (which also has sync twins), CliWrap `ExecuteAsync`.
- Why the ocx SDK keeps it: (1) the Python SDK it mirrors uses `_async` on execution verbs (`python-sdk-digest.md` line 256), so `InstallAsync` is the direct analogue; (2) adding a sync twin later is a pure addition if the async name carries the suffix, and a breaking rename if it does not; (3) it is mechanically enforceable.
- IAsyncEnumerable-returning methods: BCL precedent is the suffix (`File.ReadLinesAsync(string)` returns `IAsyncEnumerable<string>`; compile-checked in `g-cancel` on net8.0 and net10.0). VSTHRD200 documents the rule for "awaitable types such as Task or ValueTask" and says custom awaitable-like types can be configured ([VSTHRD200](https://microsoft.github.io/vs-threading/analyzers/VSTHRD200.html)), so `IAsyncEnumerable` returns are a review-time rule.
- Enforcement, measured in `$F/f-naming`: with `<EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>` and a `dotnet_naming_rule` requiring suffix `Async` on `required_modifiers = async`, IDE1006 stayed silent until `dotnet_diagnostic.IDE1006.severity = warning` was ALSO set; then it flagged `public async Task<int> Run()` (4,28) but not the non-`async` `public Task<int> Run2()`. `Microsoft.VisualStudio.Threading.Analyzers` 17.14.15 `VSTHRD200` flagged both (4,28) and (9,22) with no editorconfig, and the fixed twin was clean in both setups.

### 10. Async-only vs sync twins (signature question only)

- Azure requires both: "DO provide both asynchronous and synchronous variants for all service methods" (`dotnet-service-methods-sync-and-async`), because it controls both pipeline paths ([Azure guidelines](https://azure.github.io/azure-sdk/dotnet_introduction.html)); Azure's `HttpPipelinePolicy` split (`HttpPipelinePolicy` vs `HttpPipelineSynchronousPolicy`, [Azure implementation](https://azure.github.io/azure-sdk/dotnet_implementation.html)) exists to avoid sync-over-async.
- Async-only SDKs: Anthropic, Octokit, CliWrap (`ExecuteAsync` only). Sync-heavy facades pay in `GetAwaiter().GetResult()`: npgsql 116 sites, testfx 38 (audit section 3.2), versus 2 in CliWrap and 0 in OpenAI.
- Python parity: the Python SDK is sync-first with `_async` twins on exec verbs only (6 of 62 methods; `python-sdk-digest.md` S4); audit row 19 already decided the C# SDK is async-first, sync wrappers optional and last.
- Signature rule: ship async only; if a sync twin is later required it takes the unsuffixed name, the same parameters minus the token only if it genuinely cannot be cancelled, and its own implementation path. The shape of its body is out of scope here.

### 11. Era notes: .NET 11 runtime-async

.NET 11 (GA expected November 2026; the docs page is "last updated for release candidate 1") ships Runtime Async V2: opt-in with `<Features>runtime-async=on</Features>`, no `EnablePreviewFeatures` needed for `net11.0`, the runtime libraries themselves compiled with it, `UseRuntimeAsync=false` as the per-project opt-out, and "Async continuations without ExecutionContext" ([.NET 11 runtime](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/runtime)). It is a preview feature. Observed on SDK 11.0.100-rc.1.26425.128: the synchronization-context table in section 5 is unchanged. Nothing in the signature-level contract changes: token, suffix, `Task` return and `ConfigureAwait(false)` all stay. Unknown/untested here: library-package binary compatibility when a consumer is compiled with runtime-async and the library without (the docs say covariant `Task` to `Task<T>` overrides now work through a thunk; no further claim).

### 12. Verified on the toolchain

All commands run from the stated directory with `$R` (SDK 10.0.401 unless noted). "Red" = the check fires on the planted bad fixture; "green" = clean on the fixed twin. Abbreviated outputs; full commands are exact.

**V1-V6 analyzer ladder, `$F/a-gate/{red-lib,green-lib}`** (red = five planted defects: unforwarded token + no ConfigureAwait at `Client.cs(11,15)`, token-not-last `(16,17)`, ValueTask awaited twice `(27,28)`, `TaskContinuationOptions` into TCS `(35,49)`, `SuppressThrowing` on `Task<int>` `(43,32)`):

```
cd $F/a-gate/red-lib && $R dotnet build --no-incremental -nologo -v:q -clp:NoSummary -p:AnalysisLevel=10.0-recommended
  warning CA2016 (11,15)  CA1068 (16,17)  CA2012 (27,28)  CA2247 (35,49)  CA2261 (43,32)   [+ CA1822 noise]   <- no CA2007
cd ... -p:AnalysisLevel=10.0-all          -> same set PLUS CA2007 (11,15) and CA1062
cd ... -p:AnalysisLevel=10.0-minimum      -> CA2016 CA1068 CA2012 CA2247 CA2261
cd ... -p:AnalysisLevel=10.0-default      -> only CA2247 CA2261   (exit 0: the silent gate)
cd $F/a-gate/green-lib && $R dotnet build --no-incremental -nologo -v:q -clp:NoSummary -p:AnalysisLevel=10.0-all -warnaserror
  Build succeeded.  0 Warning(s)  0 Error(s)
```

Explicit severities at default level (`.editorconfig` in each project: `dotnet_diagnostic.CA2007/CA2016/CA1068/CA2012.severity = error`): red-lib `exit=1`, four distinct `error` diagnostics (`CA2007 CA2016 CA1068 CA2012`, each printed twice by MSBuild) (+ two CA2247/CA2261 warnings); green-lib `exit=0`, 0 errors. `-warnaserror` at `10.0-recommended`: red exit 1, no CA2007 line; at `10.0-all`: red exit 1 with CA2007 present. Floor: `$F/a-gate-floor8/red` (`global.json` pins 8.0.425, `net8.0`, `8.0-all`) printed `CA2007 CA2016 CA1062 CA1068 CA2012 CA1822 CA2247 CA2261`. Property probe: `cd $F/a-gate/green-lib && $R dotnet msbuild -nologo -getProperty:AnalysisLevel -getProperty:EffectiveAnalysisLevel` prints `"AnalysisLevel": "latest"`, `"EffectiveAnalysisLevel": "10.0"`.

**V8-V11 context deadlock, `$F/b-deadlock/app`** (`$R dotnet build -nologo -v:q -clp:NoSummary` then `$R dotnet run --no-build -- <variant>`):

```
nocfa:         DEADLOCK (task not complete after 2000 ms; pump thread was blocked in .Wait)   exit=2
cfatrue:       DEADLOCK ...                                                                  exit=2
firstonly:     DEADLOCK ...                                                                  exit=2
cfafalse:      OK result=42                                                                  exit=0
optionsnone:   OK result=42                                                                  exit=0
allconfigured: OK result=42                                                                  exit=0
nocfa noctx:   nocfa (no context): OK result=42
```
Net 11 RC1 with runtime-async on (`$F/b-deadlock-net11`, `global.json` 11.0.100-rc.1.26425.128): nocfa DEADLOCK, firstonly DEADLOCK, cfafalse OK, allconfigured OK.

**V12 TCS, `$F/c-tcs`** (`$R dotnet run --no-build -- inline` / `-- async`):

```
inline: completer thread=4, continuation thread=4, same thread=True      exit=2
inline: SetResult blocked the completer for 300 ms (THEFT)
inline: state seen by continuation = "UPDATING (invariant broken)"
async:  completer thread=4, continuation thread=5, same thread=False     exit=0
async:  SetResult blocked the completer for 2 ms (ok)
async:  state seen by continuation = "done (invariant restored)"
```

**V13-V14 retrofit, `$F/d-retrofit`** (app compiled against `v1`, then `v2-optional/bin/Release/net10.0/Sdk.dll` or `v2-overload/...` copied over `app/bin/Debug/net10.0/Sdk.dll`):

```
v1:           result=5
v2-optional:  System.MissingMethodException: Method not found: 'Task`1<Int32> Sdk.Client.RunAsync(String)'.   exit=134
v2-overload:  result=5
recompile method-group against v2-optional: error CS0123: No overload for 'RunAsync' matches delegate 'Func<string, Task<int>>'
recompile against v1 / v2-overload: builds
```

**V15-V17 iterators and the CA2007 gap, `$F/e-iter`**: `red` at `10.0-all`: `CS8425` (6,40) and `CA2007` only on the plain `await Task.Delay(1)` control (24,51); NOT on `await foreach ... WithCancellation(...)` (17) or `await using (d)` (18); identical on 11.0 RC1 (`$F/e-iter/sdk11`). `mz-red` (+ Meziantou.Analyzer 3.0.297): `MA0004` at (17,33), (18,22), (24,45). `green`/`mz-green`: no CS8425, CA2007 or MA0004. `rg` check: `rg -n -e 'await\s+(foreach|using)\b' -g '*.cs' red | rg -v ConfigureAwait` prints the two lines (exit 0); on `green` prints nothing (exit 1).

**V18-V19 suffix, `$F/f-naming`**: `red` IDE1006 `C.cs(4,28)` only (after `dotnet_diagnostic.IDE1006.severity = warning`; with only the `dotnet_naming_rule` severity it printed nothing); `green` clean. `vsthrd/red` (VSTHRD200 17.14.15): `(4,28)` and `(9,22)`; `vsthrd/green` clean.

**V20-V24 greps, `$F/h-greps/{red,green}`** (patterns in the rules below): TCS pattern 3 hits red / 0 green; token-name pipeline 2 hits (`ct`, `token`) red / 0 green; two-token pattern 1 hit / 0; `params`+Task pattern 1 hit / 0; non-public default pattern 2 hits / 0. `ConfigureAwait(true)` pattern: 1 hit in `b-deadlock/lib/Variants.cs:15`, 0 in `a-gate/green-lib`.

**V25 behaviours, `$F/g-cancel` (net10.0) and `$F/g-cancel-floor8` (SDK 8.0.425, net8.0), identical output**: SuppressThrowing on Canceled and Faulted tasks no exception, `ConfigureAwait(false)` on the faulted task throws `boom`; internal timeout becomes `TimeoutException`; caller cancel gives `TaskCanceledException` with `token matches caller: False` (linked source); `WaitAsync` timed out while the underlying task was unfinished and finished later; TCS `TrySetCanceled(c)` gives `token matches caller: True`; `File.ReadLinesAsync` is `IAsyncEnumerable<string>`. Also `i-yield`: `await Task.Yield().ConfigureAwait(false)` is `error CS1929: 'YieldAwaitable' does not contain a definition for 'ConfigureAwait'`.

Not run on the toolchain: Windows-host behaviour (not load-bearing; the contexts are simulated by a pump `SynchronizationContext`), a real WPF/WinForms/MAUI app, and the per-folder `.editorconfig` test-project override (standard EditorConfig precedence, untested here).

## Normative guidance candidates

1. **Token shape.** Every public method returning `Task`, `Task<T>`, `ValueTask`/`ValueTask<T>` or `IAsyncEnumerable<T>` that does I/O, waits or loops ends with `CancellationToken cancellationToken = default`. Rationale: TAP convention plus one binary-compatible signature from release 1. Verify: `dotnet_diagnostic.CA1068.severity = error` in `.editorconfig` (fires at Minimum+; `dotnet build` exit 1 on violation, observed), and review the public-method list with `rg -n -g '*.cs' -e 'public\s+(virtual\s+|override\s+|static\s+|async\s+)*(Task|ValueTask)(<[^=;{]*>)?\s+\w+\s*[<(]' src` for any signature lacking `CancellationToken`.
2. **Token name.** The parameter is spelled `cancellationToken`. Rationale: TAP/Azure convention; named-argument callers break on rename. Verify: `rg -n -g '*.cs' -e 'CancellationToken\s+\w+' src | rg -v -e 'CancellationToken\s+cancellationToken\b'` must print nothing (exit 1); tested red 2 hits, green 0.
3. **One token per method.** No second `CancellationToken` parameter; grace/kill policy lives in an options object. Rationale: CA2016 stops analyzing multi-token methods, and the contract must equal csharp-process-cancellation-and-exit. Verify: `rg -n -g '*.cs' -e 'CancellationToken\s+\w+[^;{)]*,[^;{)]*CancellationToken\s+\w+' src` prints nothing (tested 1/0).
4. **No `params` on async methods.** Take `IReadOnlyList<T>`/`IEnumerable<T>`. Rationale: a token cannot follow `params` (OpenAI `ChatClient.cs:214`). Verify: `rg -n -g '*.cs' -e '(Task|ValueTask)(<[^>]*>)?\s+\w+\s*\([^)]*\bparams\b' src` prints nothing (tested 1/0).
5. **Non-public async methods take the token with NO default.** Rationale: forgetting to forward becomes a compile error. Verify: `rg -n -g '*.cs' -e '^\s*(private|internal|protected internal|private protected)\b[^;{]*CancellationToken\s+\w+\s*=\s*(default|CancellationToken\.None)' src` prints nothing (tested 2/0).
6. **Interface and implementation both declare `= default`.** Rationale: callers bind to the static type (Anthropic `IMessageService.cs:43-46` + `MessageService.cs:49-52`). Verify: reading heuristic: every `= default` on an implementation has the same on its interface member; `rg -n -g 'I*.cs' -e 'CancellationToken\s+cancellationToken\s*\)' src` lists interface members missing the default.
7. **Forward the token to every awaited callee that accepts one.** Rationale: otherwise cancellation stops at your frame. Verify: `dotnet_diagnostic.CA2016.severity = error` (fires at Minimum+; observed red exit 1 / green exit 0). Passing `default` or `CancellationToken.None` to a callee needs a comment: `rg -n -g '*.cs' -e 'CancellationToken\.None' -e '\(default\)' src` is a review list, expected near-empty.
8. **Async iterators decorate the token with `[EnumeratorCancellation]`.** Rationale: otherwise `WithCancellation(ct)` is ignored. Verify: compiler warning CS8425 (default-on, no config) with `<TreatWarningsAsErrors>true</TreatWarningsAsErrors>` or `<WarningsAsErrors>$(WarningsAsErrors);CS8425</WarningsAsErrors>` (observed red/green).
9. **Never retrofit by replacing a signature.** A shipped `M(a)` stays; the token arrives as a new overload and the old one forwards `default` and is `[Obsolete]` only when removal is planned. Rationale: replacement is binary-breaking (observed `MissingMethodException`). Verify: PublicApiAnalyzers `RS0016/RS0017` against `PublicAPI.Shipped.txt` in CI (config only; not run here), or `dotnet build` of a consumer compiled against the previous release package (the V13 recipe).
10. **Classify cancellation by the caller's token, not by exception identity.** Catch `OperationCanceledException`; convert an internal timeout with `when (!cancellationToken.IsCancellationRequested)`; never compare `e.CancellationToken` to the caller token when a linked source is involved. Rationale: observed `False`. Verify: reading heuristic on every `catch (OperationCanceledException` in `src/`: `rg -n -g '*.cs' -e 'catch\s*\(OperationCanceledException' -e 'catch\s*\(TaskCanceledException' src`; `TaskCanceledException` alone is a defect.
11. **Implement timeouts with a linked source and `CancelAfter`, disposed with `using`; do not use `Task.WaitAsync(timeout)` or `Task.WhenAny(work, Task.Delay(t))` as the cancellation mechanism.** Rationale: they stop waiting, not working (observed). Verify: `rg -n -g '*.cs' -e 'Task\.WhenAny\([^;]*Task\.Delay' src` prints nothing; `WaitAsync(` hits need a comment saying the work is cancelled by other means.
12. **Library assemblies put `ConfigureAwait(false)` on every await of a `Task`/`ValueTask`, including `await foreach` (`.WithCancellation(ct).ConfigureAwait(false)`) and `await using` (`.ConfigureAwait(false)` on the disposable).** Rationale: any consumer with a single-threaded `SynchronizationContext` that blocks on the result deadlocks otherwise; "first await only" also deadlocks (observed). Verify: `<AnalysisLevel>10.0-recommended</AnalysisLevel>` plus `dotnet_diagnostic.CA2007.severity = error` for `src/**` (CA2007 is silent below `All`, observed), AND `Meziantou.Analyzer` `dotnet_diagnostic.MA0004.severity = error` or `rg -n -e 'await\s+(foreach|using)\b' -g '*.cs' src | rg -v ConfigureAwait` printing nothing (CA2007 misses these two forms; tested red 2 hits, green 0).
13. **Do not write `ConfigureAwait(true)` in library code.** Rationale: it is the no-op default and signals an unreviewed await; a library that must resume on the caller's context documents it. Verify: `rg -n -g '*.cs' -e 'ConfigureAwait\(\s*true\s*\)' src` prints nothing (tested 1/0).
14. **Tests, samples and application projects carry no `ConfigureAwait`.** Rationale: CA2007's own guidance; xunit sets it `none`. Verify: `.editorconfig` sections for `tests/**` and `samples/**` set `dotnet_diagnostic.CA2007.severity = none` and `MA0004 = none`; `rg -l -g '*.cs' -e 'ConfigureAwait\(' tests samples` lists nothing.
15. **Pin the analyzer level.** Library projects set `<AnalysisLevel>10.0-recommended</AnalysisLevel>` (bumped on purpose, never `latest`) and `<TreatWarningsAsErrors>true</TreatWarningsAsErrors>`; explicit `error` severities for CA2007, CA2016, CA1068, CA2012 live in the repo `.editorconfig`. Rationale: Default mode builds exit 0 with every async defect present (observed). Verify: `cd <project dir> && dotnet msbuild -nologo -getProperty:AnalysisLevel` prints `10.0-recommended` (not `latest`); `rg -n -e 'dotnet_diagnostic\.(CA2007|CA2016|CA1068|CA2012)\.severity\s*=\s*error' .editorconfig` returns four lines.
16. **`ConfigureAwaitOptions` only for `SuppressThrowing`/`ForceYielding`, `SuppressThrowing` only on non-generic `Task`, and every use is followed or preceded by an explicit status check.** Rationale: swallowing failures; `TResult` invalid (CA2261). Verify: `dotnet_diagnostic.CA2261.severity = error` (warning by default at AnalysisLevel Default, observed); `rg -n -g '*.cs' -e 'SuppressThrowing' src` is a review list.
17. **Every `TaskCompletionSource` is constructed with `TaskCreationOptions.RunContinuationsAsynchronously`.** Rationale: otherwise continuations run inline on the completing thread (observed theft and broken invariant). Verify: `rg -n -P -g '*.cs' 'TaskCompletionSource(<[^>]*>)?\s+\w+\s*=\s*new(\s+TaskCompletionSource(<[^>]*>)?)?\s*\((?![^;]*RunContinuationsAsynchronously)' src` prints nothing (tested 3 hits red, 0 green; assumes one declaration per statement; the also-default-on CA2247 catches the wrong enum type).
18. **Public async methods return `Task`/`Task<T>`.** `ValueTask` only with a benchmark linked from a comment, with sync completion common, and with a contract that callers await once. Rationale: TAP/Toub default, CA2012 constraints. Verify: `rg -n -g '*.cs' -e 'public\s+(virtual\s+|override\s+|static\s+|async\s+)*ValueTask' src` returns only BCL-mandated members (`DisposeAsync`, `MoveNextAsync`) or lines with a `// perf:` comment; `dotnet_diagnostic.CA2012.severity = error`.
19. **`Async` suffix on every public method returning `Task`/`ValueTask`/`IAsyncEnumerable<T>`; never on a method that returns neither.** Rationale: TAP; keeps a later sync twin an addition, not a rename. Verify: `Microsoft.VisualStudio.Threading.Analyzers` `VSTHRD200` (hidden or warning by default per version, so set `dotnet_diagnostic.VSTHRD200.severity = error`); observed red 2 hits / green 0. IDE1006 alone is insufficient (only `async`-keyword methods and needs an explicit severity).
20. **Public surface is async-only until a consumer needs a sync twin; a sync twin takes the unsuffixed name and its own implementation path.** Rationale: no sync-over-async in the library (details owned by the disposal subtopic). Verify: `rg -n -g '*.cs' -e 'GetAwaiter\(\)\.GetResult\(\)' -e '\.Result\b' -e '\.Wait\(' src` returns no hits outside an allowlisted file; `VSTHRD002` as a build error.
21. **Do not remove `ConfigureAwait(false)` for .NET 11 runtime-async.** Rationale: context semantics unchanged on RC1 (observed). Verify: `rg -n -e 'runtime-async' -g '*.csproj' -g '*.props' .` is empty for the library unless an ADR enables it; if enabled, rerun the V8-V11 matrix on net11.0.

## AI-agent angle

What an LLM characteristically gets wrong, with the cheapest mechanical catch:

| # | Typical mistake (compiles, or looks idiomatic) | Why wrong | Smallest check |
|---|---|---|---|
| 1 | `CancellationToken ct`, `token`, or token first/middle | 8.5% of corpus parameters are misnamed; CA1068; named-arg breakage | rule 2 pipeline `rg ... \| rg -v ...`; CA1068 = error |
| 2 | No token on "convenience" wrappers and generated methods | Stripe: 701 uncancellable `FetchRelatedObjectAsync()` | rule 1 listing; review of generated code |
| 3 | Adds `CancellationToken ct = default` by editing the existing signature of a shipped method | Binary break (`MissingMethodException`, observed) | rule 9 consumer-built-against-previous-release recipe; PublicAPI analyzers |
| 4 | Silences CA2016 by passing `CancellationToken.None`/`default` | Compiles, defeats cancellation | rule 7 `rg -e 'CancellationToken\.None' -e '\(default\)'` review list |
| 5 | `= default` on internal/private async methods, then forgets to forward | Silent non-forwarding | rule 5 `rg` (tested) + CA2016 |
| 6 | `.Result`, `.GetAwaiter().GetResult()`, `Task.Run(() => AsyncCall()).Result` "to make it sync" | Deadlock under a SynchronizationContext, thread-pool starvation | rule 20 `rg`; VSTHRD002 |
| 7 | Omits `ConfigureAwait(false)` in the library because "ASP.NET Core has no context" (true for ASP.NET Core, false for the library's consumers) OR sprinkles it in tests/app code from a blog | Library deadlock under WPF/WinForms/legacy ASP.NET; noise in apps | rules 12 and 14: CA2007 = error in `src/**`, none in tests |
| 8 | Believes CA2007 clean means done, but `await foreach` and `await using` have no `ConfigureAwait` | CA2007 does not analyze them (observed) | MA0004 or rule 12 `rg` |
| 9 | `ConfigureAwait(false)` on the first await only, or on `Task.Yield()` (does not compile, CS1929) | First await may complete synchronously, so later awaits still capture | CA2007/MA0004 on every await |
| 10 | Hallucinates `ConfigureAwaitOptions.SuppressThrowing` on `Task<T>` or treats `ConfigureAwait(ConfigureAwaitOptions.None)` as a different thing | CA2261; `None` equals `false` | CA2261 (default warning) |
| 11 | `new TaskCompletionSource<T>()` with no options; or `new TaskCompletionSource<T>(TaskContinuationOptions.RunContinuationsAsynchronously)` (wrong enum) | Inline continuation on the completer; the wrong enum compiles and is ignored | rule 17 `rg -P`; CA2247 |
| 12 | `ValueTask` "for performance" on every method; stores a `ValueTask`; awaits it twice | Constraints; `Task` is the documented default | rule 18; CA2012 |
| 13 | Drops the `Async` suffix because the Anthropic/Octokit SDK did, or adds `Async` to a sync method | Breaks TAP and the Python-parity naming; blocks a sync twin | VSTHRD200 = error |
| 14 | `Task.WhenAny(work, Task.Delay(timeout))` or `task.WaitAsync(timeout)` as the timeout | Work keeps running; Delay timer leaks | rule 11 `rg` |
| 15 | `new CancellationTokenSource(timeout)` not linked to the caller token, or not disposed | Caller cancel ignored; timer pressure ([Fowler](https://github.com/davidfowl/AspNetCoreDiagnosticScenarios/blob/master/AsyncGuidance.md)) | CA2000 fires only at `All`; reading heuristic: every `CancellationTokenSource` is `using`-declared and linked |
| 16 | `catch (TaskCanceledException)` only, or `catch (Exception)` that swallows cancellation | `ThrowIfCancellationRequested` throws plain `OperationCanceledException`; swallowing masks cancel | rule 10 `rg`; CA1031 (`All` only) |
| 17 | Async iterator with a token parameter and no `[EnumeratorCancellation]` | `WithCancellation` ignored | CS8425 (default-on) as error |
| 18 | `params` in an async signature, then no token | OpenAI-style uncancellable overload | rule 4 `rg` |
| 19 | Trusts `latest` AnalysisLevel / "recommended catches everything" | CA2007 silent below All; Default mode silent for all | rule 15 `dotnet msbuild -getProperty` |
| 20 | Tells you `ConfigureAwait(false)` is obsolete on .NET 8+/11 or that runtime-async removes the need | Not what the docs say; semantics unchanged on RC1 | rule 21 |

## Contested / evolving

- **ConfigureAwait(false) in libraries.** Microsoft's guidance (FAQ, CA2007) is unchanged and unanimous for general-purpose libraries; the contest is about leaving it out because the consumer's blocking is the consumer's bug, and because ASP.NET Core has no context. xunit (2%), Polly (conditional) and parts of vs-threading (JTF-focused libs get `VSTHRD111 = silent`) deliberately omit or parameterize it. Trend: still required for broad-consumption libraries; the .NET 11 runtime is optimizing continuations without `ExecutionContext` for `ConfigureAwait(false)` users rather than retiring the idiom (as of the RC1 docs page dated 2026-09-09). The corpus 82% is analyzer-driven, not conviction (audit).
- **Async suffix on async-only SDKs.** Anthropic and Octokit drop it; Azure/BCL/TAP keep it. No analyzer or doc says dropping is wrong for an async-only API; the decision here is made on forward compatibility and Python parity, not on a rule. Trend: modern generated SDKs lean toward dropping.
- **Overload pair versus defaulted token.** TAP's text still presents both; Azure and the corpus use defaulted parameters on one method; PublicApiAnalyzers RS0026/RS0027 pull library teams toward overload sets. As of 2026 new SDKs choose the defaulted parameter (Anthropic, OpenAI, Stripe) and pay the retrofit tax only if they forget it.
- **ConfigureAwaitOptions adoption.** Nearly nil (one Polly use) three years after .NET 8; expect it to stay a niche for `SuppressThrowing`.
- **ValueTask in public APIs.** Documentation keeps moving toward "measure first" (TAP page edited 2026-04-30 reads that way); the corpus keeps ValueTask in perf-driven libraries. No evidence of a trend toward ValueTask-by-default.
- **Runtime-async (.NET 11).** Preview in RC1, GA November 2026. Behavior here is only observed for the deadlock/continuation table; interop of a runtime-async consumer with a non-runtime-async library, and any future change to `ConfigureAwait` semantics under runtime-async, are not covered by any source read.
- **CA2007 coverage.** The `await foreach`/`await using` gap is observed in SDK 10.0.401 and 11.0 RC1; no issue tracker entry was read, so whether it is intentional is unknown. Treat as a standing gap and keep the second check.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2016 | CA2016 rule page | updated 2026-04-02, .NET 10 | Exact forwarding semantics, non-violation list (multi-token), `default` escape hatch, "As suggestion" default |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1068 | CA1068 rule page | updated 2026-06-29 | "Last" rule, optional/ref/out special cases, suppress-for-shipped-API note, `api_surface` option |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2007 | CA2007 rule page | updated 2026-04-02 | Library-only scope, ASP.NET Core note, `output_kind` option, enabled "No" by default |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2012 | CA2012 ValueTask misuse | updated 2026-04-02 | The consumption rules as an analyzer |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2247 | CA2247 TCS enum mix-up | updated 2026-04-02 | Shows the wrong-enum overload that silently ignores RunContinuationsAsynchronously |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2261 | CA2261 SuppressThrowing on Task<T> | .NET 8+, updated 2026-04-02 | Limits of `ConfigureAwaitOptions.SuppressThrowing` |
| https://devblogs.microsoft.com/dotnet/configureawait-faq/ | Toub's ConfigureAwait FAQ | 2019, still cited by CA2007 | Library recommendation, deadlock mechanics, "first await only" caveat, TaskScheduler.Current |
| https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.configureawaitoptions | `ConfigureAwaitOptions` API | .NET 8-11, updated 2026-05-27 | Member values and meanings |
| https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.taskcreationoptions | `TaskCreationOptions` API | .NET Framework 4.6 to .NET 11 | `RunContinuationsAsynchronously` definition |
| https://learn.microsoft.com/en-us/dotnet/standard/asynchronous-programming-patterns/task-based-asynchronous-pattern-tap | TAP overview | updated 2026-04-30 | Authoritative suffix, token name/None semantics, cancellation outcome, overload ladder, ValueTask wording |
| https://learn.microsoft.com/en-us/dotnet/standard/threading/cancellation-in-managed-threads | Cooperative cancellation model | updated 2026-08-13 | Linked tokens, disposal, callback rules, library/user cooperation |
| https://learn.microsoft.com/en-us/dotnet/core/project-sdk/msbuild-props | MSBuild properties (AnalysisLevel, AnalysisMode) | 2026 | `AnalysisLevel` values, default `latest`, precedence over `AnalysisMode` |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/overview | Code analysis overview | updated 2026-05-28 | Mode semantics, `-warnaserror`, rule-enabled-by-default tables for .NET 8/9/10 |
| https://devblogs.microsoft.com/dotnet/understanding-the-whys-whats-and-whens-of-valuetask/ | Toub on ValueTask | 2018, still the reference | Default-to-Task, consumption restrictions, `AsTask()` |
| https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/breaking-changes | Library breaking-change guidance | 2021 (updated 2023-03) | Binary vs source breaks; renamed parameters; added-parameter MissingMethodException |
| https://learn.microsoft.com/en-us/dotnet/api/system.threading.cancellationtokensource.cancelasync | `CancelAsync` API | .NET 8+, 2026-07 | Async callback semantics |
| https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.task.waitasync | `Task.WaitAsync` API | .NET 6+ (TimeProvider overloads .NET 8+) | Waits, does not cancel; stored exceptions |
| https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/runtime | What's new in the .NET 11 runtime | RC1, updated 2026-09-09 | Runtime Async V2 status, opt-in switch, ExecutionContext note |
| https://azure.github.io/azure-sdk/dotnet_introduction.html | Azure SDK .NET design guidelines | living, 2026 | Rule IDs for sync+async pairs, `Async` naming, `cancellationToken`, Task for network calls |
| https://azure.github.io/azure-sdk/dotnet_implementation.html | Azure SDK .NET implementation guidelines | living, 2026 | Sync/async pipeline policy split |
| https://microsoft.github.io/vs-threading/analyzers/VSTHRD111.html | VSTHRD111 | vs-threading 17.x | The opposite policy for JoinableTaskFactory code; hidden by default |
| https://microsoft.github.io/vs-threading/analyzers/VSTHRD200.html | VSTHRD200 | vs-threading 17.x | Suffix analyzer, both directions |
| https://github.com/davidfowl/AspNetCoreDiagnosticScenarios/blob/master/AsyncGuidance.md | Fowler async guidance | ASP.NET Core era | "Always use RunContinuationsAsynchronously", sync-over-async, timeout CTS disposal, async/await vs return Task |
| /home/mherwig/.cache/research-lang/dotnet-tools/dotnet/sdk/10.0.401/Sdks/Microsoft.NET.Sdk/analyzers/build/config/analysislevel_10_*.globalconfig | The SDK's own per-mode rule sets | SDK 10.0.401 | Ground truth for which rule is a warning at which mode |
| /home/mherwig/.cache/research-lang/exemplars/csharp (Anthropic, OpenAI, Stripe, Pulumi, Azure, Polly, npgsql, testfx, vs-threading, Meziantou, Redis, CliWrap, xunit) | Real source at pinned SHAs | 2026 | Signature shapes, retrofit overloads, editorconfig severities, TCS usage (cited by file:line above) |
| `$F` (this report's fixtures) | Reproducible red/green builds | SDKs 8.0.425, 10.0.401, 11.0.100-rc.1 | Every observed claim above; re-runnable |
