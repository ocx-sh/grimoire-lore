---
title: "The async contract of a .NET library: tokens, continuation context, ownership, sync bridges, shared state and streamed callbacks"
topic: csharp-async
model: claude-opus-5-5
consolidates:
  - csharp-async/csharp-async-cancellation-and-context.md
  - csharp-async/csharp-async-disposal-and-sync-bridges.md
  - csharp-async/csharp-async-single-flight-and-thread-safety.md
  - csharp-async/csharp-async-callbacks-and-streaming.md
grounding:
  - csharp-audit/python-sdk-digest.md
  - csharp-audit/ocx-cli-contract.md
  - csharp-audit/exemplar-cli-wrappers-and-sdks.md
  - csharp-audit/exemplar-language-shape.md
  - csharp-topic-map/codified.md
  - csharp-process/csharp-process-cancellation-and-exit.md (token contract must match)
  - csharp-build/csharp-build-analyzer-gate.md (AnalysisLevel owner)
  - csharp-api/csharp-api-surface-shape.md, csharp-api/csharp-api-exceptions-from-exit-codes.md
  - csharp-api.md (Verdict 1, 3; CS-API-01; CS-ERR-02/05/06), csharp-json.md (CS-JSON-10), csharp-packaging.md (CS-BIN-06/12), csharp-process.md (CS-PROC-09/10/13/22), csharp-observability.md (CS-OBS-27/28)
target_file: csharp-quality/async.md
date: 2026-10-11
revised: 2026-10-11
---

# The async contract of a .NET library

Abbreviations:
- `$CA` = `csharp-async/csharp-async-cancellation-and-context.md`
- `$DS` = `csharp-async/csharp-async-disposal-and-sync-bridges.md`
- `$SF` = `csharp-async/csharp-async-single-flight-and-thread-safety.md`
- `$CB` = `csharp-async/csharp-async-callbacks-and-streaming.md`
- `$PX` = `csharp-process/csharp-process-cancellation-and-exit.md`
- `$T` = `/home/mherwig/.cache/research-lang/dotnet-tools/run.sh`
- `$C` = `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/consolidate-csharp-async` (this consolidation's fixtures)
- `$SFX` = `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-async-single-flight-and-thread-safety`
- `$CBX` = `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-async-callbacks-and-streaming`

Rows tagged **[ocx]** are specific to the ocx C# SDK; the others hold for any library.

## Verdict

1. **Async-only public surface, v1.** Every I/O method returns `Task`/`Task<T>`, carries the `Async` suffix and ends in exactly one `CancellationToken cancellationToken = default`. No sync wrapper over the async body ships. If a sync API is approved later, it is a separate leaf (`bool async` flag or a real sync driver). Both subtopics agree ($CA §10, $DS §11). The Python SDK's sync-first shape is not copied (python-sdk-digest S4, row 19).
2. **ConfigureAwait policy, one sentence.** Library assemblies put `.ConfigureAwait(false)` on every await, including `await foreach` and `await using`, and use no `Task.Yield()`. Test, sample and app code carries none. The analyzer configuration is in CS-ASYNC-06. The reason is the consumer's `SynchronizationContext`, not the TFM: the deadlock is observed on net10 and on net11 RC1 with runtime-async ($CA §5).
3. **One token. Grace lives in options.** CA2016 stops analysing a method that has two tokens ($CA §1), so the CliWrap-style forceful/graceful token pair recommended in exemplar-cli-wrappers-and-sdks.md:211 is rejected. Grace is a property of the command class (`$PX` rule 8).
4. **Two exception types for cancellation, identical to csharp-process.** Caller cancellation surfaces as `OperationCanceledException` carrying the caller's token. An SDK timeout surfaces as `OcxTimeoutException : OcxException`, not BCL `TimeoutException` (the API and process groups agree). The cause is classified with `when (linked.IsCancellationRequested)` and the caller wins ties.
5. **Ownership is lexical.** Whoever creates a `Process`, CTS, linked CTS or registration disposes it with `using var`/`await using var`, or moves it into a sealed handle that kills before it releases. `Process.Dispose` does not kill the child ($DS §2).
6. **No Dispose ritual.** Seal the class. No finalizer, no `Dispose(bool)`, no `GC.SuppressFinalize`.
7. **The analyzer gate is explicit per-rule severities, and it does not depend on the AnalysisLevel.**
   - Measured here: every async rule set to `error` in `.editorconfig` fired at `10.0-default`, `10.0-recommended` and `10.0-all` alike.
   - "CA2007/CA1849/CA2000 fire only at All" is true only for unconfigured rules.
   - This removes the conflict between $CA (pinned `10.0-recommended`) and $DS (`AnalysisMode=All`). The build group's `10.0-all` (csharp-build-analyzer-gate.md:41) stands, and the async gate is correct under it.
   - The ConfigureAwait gaps are closed by Meziantou `MA0004`. The package is already in the build for CS-API Verdict 3, so adding the rule costs one line (CS-ASYNC-06).
8. **VSTHRD set:** 002, 100, 101, 103, 105, 110, 114, 200 at `error`. VSTHRD011 stays on at its package default under TWAE.
   - **VSTHRD003 is turned off.** It is in the brief's list, but it fired on awaiting the library's own field TCS, its own pump task in `DisposeAsync`, and a caller-supplied `Task` (measured here; csharp-build-analyzer-gate.md:55 agrees).
   - VSTHRD101 is added: it is the only check that catches `Action a = async () => ...` ($DS V6).
   - VSTHRD011 blocks `Lazy<Task<T>>` ($SF §2). Its suggested fix, `AsyncLazy<T>`, is rejected.
9. **[ocx] No lazy state, so no single-flight in the client.**
   - `OcxClient.CreateAsync` runs discovery and the CS-JSON-10 handshake under the caller's own token, which agrees with CS-API Verdict 1 and CS-API-01.
   - A failed or cancelled handshake throws `OcxContractException`, `OcxLaunchException` or OCE out of the factory. It publishes no object and caches nothing; the next `CreateAsync` probes again.
   - After the factory, the client is `readonly` fields only. There is no `Lazy`, `SemaphoreSlim`, `lock` or CTS on it.
   - The Python `_CompatCell` lazy memo exists only because Python constructors are synchronous. It is not ported ($SF §1).
10. **[ocx] Download-once is the filesystem's job.**
    - Correctness comes from CS-BIN-12's temp-file-plus-`File.Move`, with no lock and no mutex. Write-in-place showed 15 of 16 concurrent callers a partial binary; atomic install showed 0 ($SF §7).
    - In-process coalescing of `EnsureAsync` is an optional optimisation, CS-ASYNC-24.
11. **General single-flight shape, for code that does need it.** Use a `lock` around one `Task<T>?` field and reset it on `IsCompleted && !IsCompletedSuccessfully`. Run the work under a token it owns, and give each caller `shared.WaitAsync(cancellationToken)`.
    - `Lazy<Task<T>>` (in every mode), vs-threading `AsyncLazy<T>`, a first-caller token, `??=`, a reset on `IsFaulted` alone and CAS on a started task were each watched failing ($SF §5).
12. **[ocx] Thread-safety is a documented, tested promise.** The `OcxClient` remarks say four things:
    - every member is thread-safe;
    - the instance is immutable after `CreateAsync`, because options and environment are snapshotted;
    - the SDK serialises nothing;
    - results are not synchronised.

    Two tests back the promise: a 64-caller cross-talk test and a reflection immutability test. ocx's own file locks make concurrent children safe. Mutating one `ocx.toml` under heavy contention surfaces as exit 75 `project_locked`, and CS-PROC-22's no-retry-for-mutating rule stands ($SF §9).
13. **[ocx] Streaming in v1 is exactly `OnStderrLine` (CS-OBS-27), invoked inline on the stderr pump.**
    - No `IAsyncEnumerable<T>`, `IProgress<T>`/`Progress<T>`, event or SDK queue ships.
    - The engine leaves the caller's context with `ForceYielding` before `Process.Start`.
    - Each line is capped.
    - A slow callback slows ocx, which is documented. The SDK does not add a blocking queue, which would violate CS-PROC-09/10's never-block-the-pump rule.
    - A throwing callback is rethrown after the drain (CS-OBS-28). The call's own failure wins over it ($CB §1-7).

## The ruleset

Analyzer firing levels below come from the SDK's own globalconfigs and $CA §2 / $DS §7. "Explicit" means `dotnet_diagnostic.<ID>.severity = error` in `.editorconfig`, which was measured to fire at every level ($C/gate, V-C1).

| ID | Fires without config at | With explicit severity |
|---|---|---|
| CA1068, CA2016, CA2012 | Minimum and up (suggestion, so invisible, at Default) | every level, watched |
| CA2007, CA2000, CA2213, CA1849 | All only | every level, watched |
| CA1001 | Recommended and up | every level, watched |
| CA2247, CA2261, CS8425, CS4014 | Default (warning) | every level, watched |
| VSTHRD002/100/101/103/110/200 | package default Warning (vs-threading index) | watched |
| VSTHRD011 | package default; fired as error under TWAE with no severity line ($SFX/Cs red `(11,35)`) | not set explicitly |
| VSTHRD105, VSTHRD114 | package default (not measured without config) | watched |
| IDISP001/004/024/025 | package default (on) | watched |
| RS0030 | on when `BannedSymbols.txt` is an `AdditionalFiles` item | watched |
| MA0004 | off under `MeziantouAnalysisMode=None` | watched ($C/mz-gap) |

### Signature

**CS-ASYNC-01 (MUST) Every public async method that does I/O, waits or loops ends with exactly one `CancellationToken cancellationToken = default`.** The name is exact, the token is last, and the default sits on both the interface and the implementation. No `params` parameter precedes it.
- Rationale: callers use named arguments, so a rename breaks source. CA2016 skips methods with two tokens. `params` blocks a trailing token: OpenAI's `CompleteChatAsync(params ...)` cannot be cancelled (`openai__openai-dotnet@1f0e8829acac:OpenAI/src/Custom/Chat/ChatClient.cs:214`). Sources: $CA §1, rules 1-4 and 6.
- Verify:
  - `dotnet_diagnostic.CA1068.severity = error`.
  - `! rg -n -g '*.cs' -e 'CancellationToken\s+\w+' src | rg -v -e 'CancellationToken\s+cancellationToken\b'` (wrong name).
  - `! rg -q -g '*.cs' -e 'CancellationToken\s+\w+[^;{)]*,[^;{)]*CancellationToken\s+\w+' src` (two tokens).
  - `! rg -q -g '*.cs' -e '(Task|ValueTask)(<[^>]*>)?\s+\w+\s*\([^)]*\bparams\b' src`.
- Watched: CA1068 red/green ($CA V1-V6, and here). The rg checks were watched red/green in `$CA` V20-V24 (2/0, 1/0, 1/0).

**CS-ASYNC-02 (MUST) Forward the token to every callee that accepts one. Write intentional non-forwarding as `CancellationToken.None` with a `//` reason, never as `default`. Non-public async methods take the token without a default.**
- Rationale: passing `default` or `None` is how an agent silences CA2016. A non-public method with a default compiles silently when the caller forgets the token; without a default, forgetting is a compile error. Sources: $CA rules 5 and 7, `$PX` rule 3. Shared work (CS-ASYNC-22) is the one designed non-forwarding case. Its reason comment names the owned token.
- Verify:
  - `dotnet_diagnostic.CA2016.severity = error`.
  - `! rg -q -g '*.cs' -e '^\s*(private|internal|protected internal|private protected)\b[^;{]*CancellationToken\s+\w+\s*=\s*(default|CancellationToken\.None)' src`.
  - Review list: `rg -n -g '*.cs' -e 'CancellationToken\.None' -e 'cancellationToken:\s*default' src`. Every hit carries a reason comment.
- Watched: CA2016 red exit 1 / green exit 0 at every level (here). Non-public-default rg 2/0 ($CA V24). CA2016 also fired on `Src().WithCancellation(ct)` for an iterator with an optional token ($C/mz-gap, first run `(12,33)`), so pass the token to the iterator itself.

**CS-ASYNC-03 (MUST) Never add a token by editing a shipped signature. Add an overload; the old method forwards `CancellationToken.None`.**
- Rationale: replacing `M(a)` with `M(a, ct = default)` is binary-breaking. An old consumer that is not recompiled throws `MissingMethodException` (exit 134), and a method-group conversion fails with CS0123. Pulumi paid this as overload pairs (`pulumi__pulumi-dotnet@2a0dca84f09b:sdk/Pulumi.Automation/LocalWorkspace.cs:107-108,124`). Source: $CA §3.
- Verify: PublicApiAnalyzers RS0016/RS0017 against `PublicAPI.Shipped.txt` (owned by csharp-api-evolution-gates), or build a consumer against the previous release package.
- Watched: binary break red / overload green ($CA V13-V14). The analyzer was not run here.

**CS-ASYNC-04 (MUST) Public async methods return `Task`/`Task<T>`. Every `ValueTask` is awaited exactly once, never stored and never blocked on. A public `ValueTask` needs a benchmark linked in a comment.**
- Rationale: TAP and Toub default to `Task`. CA2012 is only a suggestion by default, so the build never shows it. BCL-mandated `DisposeAsync`/`MoveNextAsync` are not a precedent. Sources: $CA §8, $DS §10.
- Verify:
  - `dotnet_diagnostic.CA2012.severity = error`.
  - `rg -n -g '*.cs' -e 'public\s+(virtual\s+|override\s+|static\s+|async\s+)*ValueTask' src` lists only `DisposeAsync` or lines with a `// perf:` comment.
- Watched: CA2012 red/green ($CA V1, $DS V6, here).
- **[ocx]** Each call spawns a process costing about 5 ms (ocx-cli-contract.md:95), so `ValueTask` is never justified.

**CS-ASYNC-05 (MUST) Every method returning `Task`, `ValueTask` or `IAsyncEnumerable<T>` ends in `Async`, private ones included. No synchronous method does.**
- Rationale: TAP. With the suffix, a later sync twin is an addition rather than a rename. Python parity: `_async` (python-sdk-digest.md:256). Anthropic and Octokit drop the suffix only because they are async-only and generated ($CA §9).
- Verify: `Microsoft.VisualStudio.Threading.Analyzers` with `dotnet_diagnostic.VSTHRD200.severity = error`. IDE1006 does not work here: it sees only methods with the `async` keyword and needs its own severity line.
- Watched: VSTHRD200 red/green ($CA V18-V19). Here it also flagged private `GetVt()` and both sync methods named `*Async`; the green twin needed renames, so the rule applies beyond public members.
- Tests set `VSTHRD200 = none`, because test method names are not API.

### Cancellation semantics (identical to csharp-process-cancellation-and-exit)

**CS-ASYNC-06 (MUST) ConfigureAwait policy.** Library assemblies end every await with `.ConfigureAwait(false)`.
- That includes `await foreach`, written as `await foreach (... .WithCancellation(ct).ConfigureAwait(false))`. `.WithCancellation(ct)` alone does not count.
- It includes `await using`, written as `await using var x = expr.ConfigureAwait(false);` or `await using (x.ConfigureAwait(false))`.
- No `ConfigureAwait(true)` and no `Task.Yield()`. Use `await Task.CompletedTask.ConfigureAwait(ConfigureAwaitOptions.ForceYielding)` instead.
- Tests, samples and apps carry no ConfigureAwait.
- The rule stays on .NET 11 runtime-async.
- Rationale, observed deadlocks:
  - A consumer that blocks on `.Result` under a single-threaded `SynchronizationContext` deadlocks when the library omits ConfigureAwait. It also deadlocks with `ConfigureAwait(true)` and with "false on the first await only". It completes in 108 ms with `ConfigureAwait(false)` ($CA §5 V8-V11, $DS V2). The result is identical on net11 RC1 with `runtime-async=on` ($CA §11).
  - `.WithCancellation(ct)` returns a `ConfiguredCancelableAsyncEnumerable<T>` with `continueOnCapturedContext: true`. It satisfies CA2007, but the loop body still ran on the context thread ($CB §8, fixture 10).
- Verify:
  - `.editorconfig`:
    ```
    [src/**.cs]
    dotnet_diagnostic.CA2007.severity = error
    dotnet_diagnostic.MA0004.severity = error

    [{test,tests,samples}/**.cs]
    dotnet_diagnostic.CA2007.severity = none
    dotnet_diagnostic.MA0004.severity = none
    dotnet_diagnostic.VSTHRD200.severity = none
    ```
    MA0004 relies on `Meziantou.Analyzer` with `MeziantouAnalysisMode=None` (CS-API Verdict 3). Do not use `dotnet_code_quality.CA2007.output_kind`, because test projects are also DLLs.
  - BannedSymbols line `M:System.Threading.Tasks.Task.Yield;use ConfigureAwaitOptions.ForceYielding`. Neither CA2007 nor MA0004 flags `await Task.Yield()`.
  - `! rg -q -g '*.cs' -e 'ConfigureAwait\(\s*true\s*\)' src`.
  - Fallback, only if Meziantou leaves the build: `! rg -n -g '*.cs' -e 'await\s+(foreach|using)\b' -e 'WithCancellation\(' src | rg -q -v ConfigureAwait`. It gives a false positive on a correct `await foreach` split across lines ($C/mz-gap green: 1 hit).
- Watched:
  - CA2007 at a scoped `[red/**.cs]` section: error gives 2 hits, none gives 0 ($C/scope).
  - **V-C2 ($C/mz-gap).** `cd $C/mz-gap; for mz in off on; do for v in red green; do $T dotnet build -p:Variant=$v -p:Mz=$mz -nologo -v:q --no-incremental; done; done`:
    - With CA2007 alone (red exit 1), only bare `await foreach` was flagged, at `(14,33)` and `(16,13)`, the split-line form included. It missed `.WithCancellation(ct)` `(13,33)`, `await using (b)` `(18,22)` and `Task.Yield` `(19)`.
    - With MA0004 on (red exit 1), `(13,33)`, `(14,33)`, `(16,13)` and `(18,22)` were flagged, and not `Task.Yield`.
    - Green exits 0 both ways. Transcript: `$C/mz-gap/transcript.txt`.
  - `Task.Yield` ban: RS0030 at `Red.cs(25,15)` and `(72,13)` / green 0.
  - `ConfigureAwait(true)` rg: 1/0 ($CA V20-V24).

**CS-ASYNC-07 (MUST) Construct every `TaskCompletionSource` with `TaskCreationOptions.RunContinuationsAsynchronously`.**
- Rationale: without it, the awaiting continuation runs inside `SetResult` on the completer's thread. Observed: same thread id, completer blocked 300 ms, and the continuation saw a broken invariant ($CA §7 V12). The wrong enum (`TaskContinuationOptions`) compiles and is ignored (CA2247). Nothing flags omitting the option.
- Verify:
  - `dotnet_diagnostic.CA2247.severity = error`.
  - `! rg -n -P -g '*.cs' '\bnew\s*(TaskCompletionSource(<[^>]*>)?)?\s*\((?![^;]*TaskCreationOptions\.RunContinuationsAsynchronously)[^;]*;' src | rg -q TaskCompletionSource`.
- Watched: the rg was 2 red (no options, wrong enum) / 0 green here. This pattern also catches target-typed `=> new()`, which $CA's declaration-only pattern misses.

**CS-ASYNC-08 (MUST) Caller cancellation and SDK timeout are distinct outcomes.**
- Catch `OperationCanceledException`, never only `TaskCanceledException`.
- Build the timeout as a per-attempt `CancellationTokenSource.CreateLinkedTokenSource(cancellationToken)` plus `CancelAfter`, disposed by `using`.
- Classify with `catch (OperationCanceledException) when (linked.IsCancellationRequested)`, then check `cancellationToken.IsCancellationRequested` first and rethrow as `OperationCanceledException(message, cancellationToken)`. Otherwise throw the timeout type.
- Never compare `e.CancellationToken` with the caller's token while a linked source is involved.
- **[ocx]** The timeout type is `OcxTimeoutException : OcxException` and the child is killed and reaped before the throw (`$PX` rules 2 and 4-6; csharp-api-exceptions-from-exit-codes.md:52,131).
- Rationale: through a linked source both causes surface as `TaskCanceledException` carrying the linked token. Observed: `token matches caller: False` ($CA V25, `$PX` §3). The exception from `shared.WaitAsync(cancellationToken)` (CS-ASYNC-22) carries the caller's token: `oce.CancellationToken == tokenA` was `True` in every gate ($SF §4), so the classification holds there unchanged.
- Verify:
  - `! rg -q -g '*.cs' -e 'catch\s*\(\s*TaskCanceledException' src`.
  - `! rg -q -P -g '*.cs' 'catch\s*\(\s*OperationCanceledException[^)]*\)(?!\s*when)' src`, or each hit carries a reason comment.
  - A unit test asserts `oce.CancellationToken == callerCts.Token` and the timeout type.
- Watched: the classification was red/green in `$PX` V2/V7 and in the $DS engine (`PASS timeout throws TimeoutException`).
- **Conflict resolved:** $CA's `when (!cancellationToken.IsCancellationRequested)` and $DS's BCL `TimeoutException` are replaced by `$PX`'s form. That filter would also turn an OCE from an unrelated inner source into a "timeout", and a BCL `TimeoutException` cannot be told apart from `Task.WaitAsync`'s.

**CS-ASYNC-09 (MUST) Timeouts cancel the work, not just the wait. Do not use `Task.WaitAsync(timeout)` or `Task.WhenAny(work, Task.Delay(t))` as the timeout mechanism.**
- Rationale: after `WaitAsync` timed out, the underlying task still finished ($CA §4 V25). For a child process that means "gave up waiting", not "killed". `Process.WaitForExitAsync(ct)` never kills (`$PX` summary). `shared.WaitAsync(cancellationToken)` over owned shared work (CS-ASYNC-22) is not a timeout. It is the sanctioned use, and its comment names the owned token that bounds the work.
- Verify: `! rg -q -g '*.cs' -e 'Task\.WhenAny\([^;]*Task\.Delay' -e 'Delay\(Timeout\.Infinite' src`. Each `rg -n -g '*.cs' -e 'WaitAsync\(' src` hit carries a comment saying what cancels the work.
- Watched: the behaviour was observed red/green. The rg was not watched.

**CS-ASYNC-10 (SHOULD) Decorate the token of an async iterator with `[EnumeratorCancellation]`.**
- Rationale: without the attribute, `WithCancellation(ct)` is silently ignored. A 150 ms cancel ran for the full 1,119 ms. With the attribute, the call-site token and the `WithCancellation` token are linked, and either cancels at about 150 ms ($CB §8, fixture 9). Corpus: 32 `[EnumeratorCancellation]` against 205 `IAsyncEnumerable` mentions ($CA §4).
- Verify: `dotnet_diagnostic.CS8425.severity = error`, or `TreatWarningsAsErrors`.
- Watched: red/green ($CA V15, here at `Red.cs(71,47)`, $CB `iter-red`/`iter-green`; unchanged on net11 RC1, $CB §11).

### Ownership and disposal

**CS-ASYNC-11 (MUST) The method that creates a `Process`, `CancellationTokenSource`, linked source or `CancellationTokenRegistration` disposes it with `using var`/`await using var`, or transfers it into a handle type. A bare `token.Register(...)` statement is a defect.**
- Rationale: an undisposed `Process` with redirected pipes crashed after 326 starts on `Too many open files`, while the `using` twin stayed flat at 53 fds. A dropped linked CTS retains 144 B per call on a long-lived token, and a dropped registration 80 B per call ($DS §2-3 V1, V5).
- Verify:
  - `IDISP001`, `IDISP004` and `CA2000` at `error`. Use both packs: CA2000 misses the runner shape `p.WaitForExit(); return p.ExitCode;`, and IDISP001 misses `IAsyncDisposable`-only types ($DS §7).
  - `! rg -q -P -g '*.cs' '^(?!.*(\busing\b|=[^=>])).*\.Register\(' src`.
- Watched: here, IDISP001 fired on `Red.cs(48,9)` (the runner shape) without CA2000, and on `(52,32)` together with CA2000. The registration rg was 1/0 here and 1/0 in $DS V9.

**CS-ASYNC-12 (MUST) No finalizer, no `Dispose(bool)`, no `GC.SuppressFinalize`. Seal the class instead of answering CA1063/CA1816. Wrap any unmanaged handle in a `SafeHandle`.**
- Rationale: the Framework Design Guidelines say "AVOID making types finalizable". The corpus has 10 finalizers in 1,042 kLOC. A sealed class carrying the full ritual produced 0 diagnostics at All ($DS §5). CA1063 (All) and CA1816 (Recommended, observed here on the unsealed class) push toward the ritual, so sealing is the fix.
- Verify:
  - `IDISP024` and `IDISP025` at `error`.
  - `! rg -q -P -g '*.cs' -e '^\s*~[A-Z]\w*\s*\(\s*\)' -e 'void\s+Dispose\(\s*(bool|System\.Boolean)\b' -e 'GC\.SuppressFinalize' src`.
- Watched: rg 3 red / 0 green here; IDISP025 fired on `Red.cs(77,14)`.

**CS-ASYNC-13 (MUST) The disposal shape follows the type's role.**
- A stateless client owns no OS resource and implements neither interface.
- A type that owns a live resource is `sealed` and implements both `IDisposable` (best-effort, synchronous) and `IAsyncDisposable`. It is idempotent via `Interlocked.Exchange` and does not throw. If it owns a process, it kills the tree before releasing it.
- `IAsyncDisposable`-only is allowed only when no synchronous release exists, and the XML doc says so.
- Disposable fields are disposed by their owner.
- Rationale: MS warns that an async-only type leaks under a consumer that calls only `Dispose`. `Process.Dispose` left `sleep 30` alive. The fixture `ProcessHandle` passes "sync Dispose kills" and "DisposeAsync kills" on net8 and net10 ($DS §2 and §4, V10). A type that owns a `SemaphoreSlim` is disposable (CA1001 fired on it, $SF §6), which is one more reason `OcxClient` owns none (CS-ASYNC-20).
- Verify: `CA1001` and `CA2213` at `error`. Add a runtime test that starts `sleep 30` through the handle, disposes it both ways, and asserts the pid is gone.
- Watched: CA1001 `Red.cs(78,21)` and CA2213 `(86,95)` here; the kill test passed in $DS V10.

### Blocking, async void, fire-and-forget

**CS-ASYNC-14 (MUST) No blocking on tasks in library code: no `.Result`, `.Wait()`, `GetAwaiter().GetResult()` (configured awaiters included), `Task.WaitAll`/`WaitAny` or `Thread.Sleep`.** The only exception is one allowlisted file that carries `#pragma warning disable VSTHRD002 // <reason>`.
- Rationale: blocking deadlocks under a single-threaded context (3,003 ms hang). It also starves the pool: 1,024 concurrent calls took 3,395 ms on 112 threads, against 115 ms on 20 threads async. `ConfigureAwait(false)` fixes only the deadlock ($DS §8 V2-V3).
- Verify:
  - `VSTHRD002`, `VSTHRD103`, `CA1849` and `RS0030` at `error`, using the $DS §12 `BannedSymbols.txt` (19 lines) plus the `Task.Yield` line from CS-ASYNC-06.
  - The two non-obvious lines must be present: `ConfiguredTaskAwaitable[`1].ConfiguredTaskAwaiter.GetResult` and `Task.WaitAll(System.ReadOnlySpan{System.Threading.Tasks.Task})`.
- Watched: all 19 forms ($DS V8) and here: RS0030 on `.ConfigureAwait(false).GetAwaiter().GetResult()` `(56,42)` and on `Task.WaitAll(a, b)` `(58,51)`.

**CS-ASYNC-15 (MUST) [ocx] No sync API in v1.** If a sync twin is approved later, it is a separate leaf: a `bool async` core like Npgsql (`npgsql__npgsql@9c47244547c2:src/Npgsql/NpgsqlCommand.cs:1253,1266-1271`) or a genuine sync driver like SimpleExec (`adamralph__simple-exec@f80913246993:src/SimpleExec/Internal/ProcessExtensions.cs:36,44`). Never `XAsync().GetAwaiter().GetResult()`.
- Rationale: Toub's 2012 advice ("leave it up to the consumer") and the CliWrap, Pulumi and Anthropic precedent. A consumer at a process edge (`Main`, MSBuild task, cmdlet) can bridge safely itself ($DS §9 and §11).
- Verify: CS-ASYNC-14's RS0030 makes a wrapper uncompilable. In review, `rg -n -P -g '*.cs' -e 'public\s+(?!.*Async\b)\S+\s+\w+\(' src` lists public non-async members for a human to check that none does I/O.
- Watched: indirectly, through RS0030.

**CS-ASYNC-16 (MUST) No `async void` and no async lambda converted to a void delegate (`Action`, `List<T>.ForEach`). This includes `OnStderrLine = async line => ...` in src, tests, samples and README snippets.**
- Rationale: `async void` that throws after an await terminated the process with exit code 134, while `async Task` was caught by the caller ($DS §10 V4). An async lambda assigned to `Action<string>` ended the process the same way ($CB §10, fixture 13). The README recipe for a slow consumer is a synchronous handoff (`channel.Writer.TryWrite(line)`).
- Verify:
  - `VSTHRD100` and `VSTHRD101` at `error`.
  - `! rg -q -g '*.md' -g '*.cs' -e 'OnStderrLine\s*=\s*async' .`.
- Watched: `Red.cs(60,23)` and `(61,38)` here; $CB `asyncvoid-red` `error VSTHRD101`. The README rg was not run.

**CS-ASYNC-17 (MUST) No fire-and-forget, and the discard is not an observation. Store background tasks (stdout/stderr pumps) in locals or fields and await them on every exit path, `DisposeAsync` included.**
- Rationale: `_ = FooAsync();` silences CS4014 and VSTHRD110 and loses the exception. Observed: no diagnostic, process alive, no output ($DS §10). A shared init task stored in a field and awaited by its callers (CS-ASYNC-23) is not fire-and-forget.
- Verify:
  - `VSTHRD110` and `CS4014` at `error`.
  - `! rg -q -P -g '*.cs' '\b_\s*=\s*[\w.]*Async\(' src`.
- Watched: VSTHRD110 `(62,35)` and CS4014 `(63,39)` here; discard rg 1/0.

**CS-ASYNC-18 (SHOULD) Pass an explicit `TaskScheduler` to `Task.Factory.StartNew`/`ContinueWith`, and never return `null` from a `Task`-returning method.**
- Rationale: `TaskScheduler.Current` inherits the caller's scheduler, and a `null` `Task` throws a `NullReferenceException` at the caller's `await` (vs-threading index).
- Verify: `VSTHRD105` and `VSTHRD114` at `error`.
- Watched: `Red.cs(65,62)` and `(44,36)` here; green 0.

### The gate

**CS-ASYNC-19 (MUST) The async gate is explicit per-rule severities plus pinned analyzer packages, in the build and not as a CI extra.**
- Packages, in `Directory.Packages.props`: `Microsoft.VisualStudio.Threading.Analyzers` 18.7.23, `IDisposableAnalyzers` 4.0.8, `Microsoft.CodeAnalysis.BannedApiAnalyzers` 5.6.0. `Meziantou.Analyzer` comes from CS-API Verdict 3 and supplies MA0004 for CS-ASYNC-06. `BannedSymbols.txt` goes in the library projects only.
- `.editorconfig` `[*.cs]`:
  ```
  dotnet_diagnostic.CA1068.severity = error
  dotnet_diagnostic.CA2016.severity = error
  dotnet_diagnostic.CA2012.severity = error
  dotnet_diagnostic.CA2247.severity = error
  dotnet_diagnostic.CA2261.severity = error
  dotnet_diagnostic.CS8425.severity = error
  dotnet_diagnostic.CS4014.severity = error
  dotnet_diagnostic.CA2000.severity = error
  dotnet_diagnostic.CA2213.severity = error
  dotnet_diagnostic.CA1001.severity = error
  dotnet_diagnostic.IDISP001.severity = error
  dotnet_diagnostic.IDISP004.severity = error
  dotnet_diagnostic.IDISP024.severity = error
  dotnet_diagnostic.IDISP025.severity = error
  dotnet_diagnostic.CA1849.severity = error
  dotnet_diagnostic.VSTHRD002.severity = error
  dotnet_diagnostic.VSTHRD103.severity = error
  dotnet_diagnostic.VSTHRD100.severity = error
  dotnet_diagnostic.VSTHRD101.severity = error
  dotnet_diagnostic.VSTHRD110.severity = error
  dotnet_diagnostic.VSTHRD105.severity = error
  dotnet_diagnostic.VSTHRD114.severity = error
  dotnet_diagnostic.VSTHRD200.severity = error
  dotnet_diagnostic.RS0030.severity = error
  dotnet_diagnostic.VSTHRD003.severity = none
  ```
  Add the CA2007/MA0004 and test sections from CS-ASYNC-06.
- **VSTHRD011 stays at its package default and is never set to `none`.** Under the unconditional TWAE of CS-BUILD it fails the build on `Lazy<Task<T>>` ($SFX/Cs red `(11,35)`, no severity line). Its "use AsyncLazy<T>" message is the wrong fix here (CS-ASYNC-21).
- Leave the other VSTHRD rules at package defaults and do not promote them. 001/004/010/012/108/109/115 belong to JoinableTaskFactory or the main thread. 102/104/106/111/112/113 are info, hidden or VS-specific. 107 is optional (not measured). They are noise for a library (codified.md:116).
- Rationale: at AnalysisLevel Default nothing in the CA family catches an undisposed `Process` ($DS §7). The level is owned by csharp-build (`10.0-all`); the explicit lines make the async gate independent of it.
- Verify:
  - (watched: prints `24` on `$C/gate/.editorconfig`) `rg -c -P 'dotnet_diagnostic\.(CA1068|CA2016|CA2012|CA2247|CA2261|CS8425|CS4014|CA2000|CA2213|CA1001|IDISP001|IDISP004|IDISP024|IDISP025|CA1849|VSTHRD002|VSTHRD103|VSTHRD100|VSTHRD101|VSTHRD110|VSTHRD105|VSTHRD114|VSTHRD200|RS0030)\.severity = error' .editorconfig` prints `24`.
  - `! rg -q -e 'VSTHRD011\.severity\s*=\s*(none|silent|suggestion)' .editorconfig .globalconfig`.
  - Keep a planted-defect canary project that must fail the build.
- Watched (V-C1):
  ```
  cd /home/mherwig/.cache/research-lang/dotnet-tools/fixtures/consolidate-csharp-async/gate
  for v in red green; do for l in 10.0-default 10.0-recommended 10.0-all; do /home/mherwig/.cache/research-lang/dotnet-tools/run.sh dotnet build -p:Variant=$v -p:Level=$l -v:q -nologo --no-incremental >/dev/null 2>&1; echo "$v $l exit=$?"; done; done
  ```
  - Red exits 1 at all three levels, with the same 23 rule IDs: CA1001 CA1068 CA1849 CA2000 CA2007 CA2012 CA2016 CA2213 CA2247 CA2261 CS4014 CS8425 IDISP001 IDISP025 RS0030 VSTHRD002 VSTHRD100 VSTHRD101 VSTHRD103 VSTHRD105 VSTHRD110 VSTHRD114 VSTHRD200.
  - Green exits 0 at `10.0-recommended` with 0 diagnostics, after VSTHRD003 was set to none. Before that, green exited 1 on three VSTHRD003 false positives and three correct VSTHRD200 hits.

### Shared state and single-flight

**CS-ASYNC-20 (MUST) [ocx] `OcxClient.CreateAsync` performs discovery and the version handshake under the caller's token. `OcxClient`, its command handles, the options snapshot and the handshake type hold no lazily initialised or synchronised state.**
- None of these types has a `Lazy<>`, `AsyncLazy<>`, `SemaphoreSlim`, `lock`, `Interlocked` or `CancellationTokenSource` field.
- A handshake that fails or is cancelled throws out of the factory: `OcxContractException` (CS-JSON-10), `OcxLaunchException` or OCE. It caches nothing.
- `WithOptions` shares the handshake by reference and never re-probes (CS-API-01).
- Rationale:
  - With an async factory nothing is left to initialise, and every one of those primitives was watched failing in some shape ($SF §2-6).
  - The caller's token is correct here because nothing is shared: the private constructor runs only after the handshake ($SF §1).
  - Redis does the same in `ConnectAsync` (`StackExchange__StackExchange.Redis@e7c43a269f53:src/StackExchange.Redis/ConnectionMultiplexer.cs:606-612`).
  - Cost: one ocx spawn (about 5 ms, ocx-cli-contract.md:95) per `CreateAsync`, which is why CS-ASYNC-26's doc text says "create one client and reuse it".
- Verify: `! rg -q -g 'OcxClient*.cs' -g '*Options*.cs' -g '*Handshake*.cs' -g '*Handle*.cs' -e 'Lazy<' -e 'AsyncLazy' -e 'SemaphoreSlim' -e 'CancellationTokenSource' -e '\block\s*\(' -e 'Interlocked\.' src`. Also a unit test: a fake whose `version` document lacks `contract` makes `CreateAsync` throw `OcxContractException`, and a second `CreateAsync` against a fixed fake succeeds.
- Watched: partly. The S5 options-snapshot pair was watched (`options bad` -> `1s (expected 30)` exit 1, `good` -> `30s` exit 0, $SF §10). The rg and the handshake-retry test are specified, not run.

**CS-ASYNC-21 (MUST) Never wrap an async factory in `Lazy<>` or `ConcurrentDictionary.GetOrAdd`, and never reference the `Microsoft.VisualStudio.Threading` library (`AsyncLazy<T>`). Only its `.Analyzers` package is allowed.**
- Rationale:
  - A faulted or cancelled `Task` is a successfully created *value*. `Lazy<Task<T>>` therefore caches it forever in every `LazyThreadSafetyMode`, including `PublicationOnly`, which also ran the factory 9-25 times for 64 callers.
  - `AsyncLazy<T>` never resets either.
  - `GetOrAdd`'s "valueFactory may be called multiple times".
  - Four of the 35 exemplar repos ship `Lazy<Task<…>>`. Testcontainers ignores its token on top of that (`testcontainers__testcontainers-dotnet@04cbb73fcc58:src/Testcontainers.MsSql/MsSqlContainer.cs:49,72`). Sources: $SF §2-3, §7.
- Verify:
  - VSTHRD011 at package default (CS-ASYNC-19).
  - `! rg -q -P -g '*.cs' -e 'Lazy<\s*(Value)?Task' -e 'GetOrAdd(Async)?\(.*(Async|Task)' src`.
  - `! rg -q -e 'Microsoft\.VisualStudio\.Threading"' -g 'Directory.Packages.props' -g '*.csproj' .`. The `.Analyzers"` id does not match.
- Watched: S1 `lazy-eap`/`lazy-pub`/`asynclazy` -> `FAIL (starts=1)` exit 1, `singleflight` -> `PASS (starts=2)` exit 0 on net8.0.31, net10.0.12 and the 11.0 RC1 runtime. VSTHRD011 `(11,35)`. The `Lazy<\s*Task` rg hit only the red line ($SFX `results.txt`).

**CS-ASYNC-22 (MUST) Shared async work never runs under a caller's token. It runs under `CancellationToken.None` (with a `//` reason), an owned source, or `new CancellationTokenSource(timeout, timeProvider)`. Every caller waits with `shared.WaitAsync(cancellationToken)`.**
- A linked source over a caller token is also forbidden.
- With a timeout on the wait itself, use `WaitAsync(timeout, timeProvider, cancellationToken)` (net8+, inside the floor).
- Rationale:
  - Caller A's cancel failed caller B with A's OCE (`firsttoken S2`: `B=TaskCanceledException`). With the owned token, `B=ok` and `starts=1`.
  - `WaitAsync` abandons the wait, never the work, and its OCE carries the caller's token. The type is `TaskCanceledException`, so assert `is OperationCanceledException`.
  - vs-threading `AsyncLazy.GetValueAsync` takes the same stance: "this will not cancel the value factory (since other callers may exist)" (`microsoft__vs-threading@f6d817997090:src/Microsoft.VisualStudio.Threading/AsyncLazy`1.cs:152-158`). Source: $SF §4.
- Verify: `! rg -q -P -g '*.cs' '_\w*[tT]ask\w*\s*(\?\?=|=)\s*[\w.]+\(\s*(ct|cancellationToken)\b' src`. Also a per-helper test asserting `oce.CancellationToken == callerToken` and that a second caller completes.
- Watched: S2 red/green, and the rg matched only the planted `Gates.cs:27` ($SF §10).

**CS-ASYNC-23 (MUST) An in-memory single-flight is a `lock` around one `Task<T>?` field. It replaces the field when `_task is null || (_task.IsCompleted && !_task.IsCompletedSuccessfully)`. No `await` sits inside the lock, the gate is a `private readonly object`, and there is no `??=`, no `Interlocked.CompareExchange` on a task and no reset on `IsFaulted` alone.**
- Rationale:
  - The `SingleFlightGate` passed retry-after-fault, caller-cancel isolation and exactly one spawn for 64 concurrent first calls.
  - `IsFaulted` alone cached a cancelled init, the realistic HttpClient-timeout case (S1c).
  - Check-then-act spawned 47-50 times.
  - CAS on a started task spawned 10-27 times. CAS with a TCS needs a detached runner, which CS-ASYNC-16/17 forbid.
  - `await` in `lock` is CS1996.
  - `System.Threading.Lock` is absent on the net8 floor. Source: $SF §5-6.
- Verify:
  - CS1996 is a compiler error.
  - `! rg -q -g '*.cs' -e 'Interlocked\.CompareExchange\(ref\s+_\w*[tT]ask' -e 'lock\s*\(\s*(this|typeof)' -e 'System\.Threading\.Lock\b' src`.
  - Review each `rg -n -g '*.cs' '\.IsFaulted' src` hit.
  - Tests S1, S1c, S2 and S3 per helper, with spawns counted by `Ocx.Fake` and asserted `== 1`.
- Watched: the full matrix, 27 of 27 exit-code expectations ($SFX `run-all.sh`).
- **[ocx]** v1 has no such helper (CS-ASYNC-20). The rule binds the first one anyone adds.

**CS-ASYNC-24 (CONSIDER) [ocx] Coalesce concurrent `OcxBootstrap.EnsureAsync` calls in flight only, and cache nothing.**
- Correctness never depends on coalescing. It comes from CS-BIN-12's temp-file-plus-move. The loser path is `File.Move(tmp, final, overwrite: false)`: on `IOException` with `final` present, re-hash the winner via the CS-BIN-12 sidecar, delete the temp and use it.
- Do not add a named `Mutex` or a `FileShare.None` sentinel.
- If coalescing is added, use exactly this shape: `lock (_gate) { _inflight ??= RunAsync(); return _inflight.WaitAsync(cancellationToken); }`. `RunAsync` starts with `await Task.CompletedTask.ConfigureAwait(ConfigureAwaitOptions.ForceYielding);`, runs under an owned `new CancellationTokenSource(downloadTimeout, timeProvider)`, and clears `_inflight` under the lock in `finally`.
- Rationale:
  - Without coalescing, 64 first calls download 64 archives, and 63 are discarded but all are correct.
  - Write-in-place gave 15 of 16 callers a partial binary; temp-plus-move gave 0 ($SF §7).
  - The yield is load-bearing. A body that completes synchronously clears the field before `??=` stores it, and the completed (faulted) task is then cached forever.
- Verify:
  - `! rg -q -g '*.cs' -e 'new Mutex\(' -e 'FileShare\.None' src`.
  - The `install-race` test, which asserts partial reads `== 0`.
  - If coalescing exists, a test whose first init faults synchronously asserts that the second call succeeds.
- Watched:
  - `install-race bad` -> 15 (5/5 runs) exit 1, `good` -> 0 exit 0 ($SF §10).
  - **V-C3 ($C/coalesce).** `$T dotnet bin/Release/net10.0/Coalesce.dll noyield` -> `call2=InvalidOperationException starts=1 -> FAIL` exit 1; `forceyield` -> `call2=ok starts=2 -> PASS` exit 0. Identical on net8.0.31.
  - The Windows loser path (`overwrite: false` against a running `ocx.exe`) was not run.

**CS-ASYNC-25 (MUST) `SemaphoreSlim`, where one exists, is `new SemaphoreSlim(n, n)`. `await sem.WaitAsync(cancellationToken).ConfigureAwait(false);` is a statement before `try`, and `Release()` sits only in the matching `finally`. Never call `.Wait()` on it in async code.**
- Rationale:
  - With acquire inside `try`, a cancelled waiter released a permit it never held: `CurrentCount while held=1`, and an intruder entered beside the holder.
  - `.Wait()` in async code took 200 serialised operations 83,995 ms on 116 threads, against 1,602 ms with `WaitAsync`. `SemaphoreSlim.Wait` is not among the blocking APIs the pool compensates for.
  - `(n)` without a maximum lets an over-release climb silently. Source: $SF §6.
- Verify:
  - CA1849 and VSTHRD103 at `error` (CS-ASYNC-19).
  - `! rg -q -P -g '*.cs' 'new SemaphoreSlim\(\s*\d+\s*\)' src`.
  - Review aid only: `rg -n -U -P -g '*.cs' 'try\s*\{\s*(//[^\n]*\s*)*(var\s+\w+\s*=\s*)?await\s+[\w.]+\.WaitAsync\(' src`. It false-positives on Polly's correct nested bulkhead (`App-vNext__Polly@e4476096da5b:src/Polly/Bulkhead/AsyncBulkheadEngine.cs:15-37`).
- Watched: S6a `sem-cancel` and S6b `starve` red/green, and CA1849 `(29,9)` / VSTHRD103 `(29,14)` ($SF §10).

**CS-ASYNC-26 (MUST) [ocx] `OcxClient`'s XML `<remarks>` state the thread-safety contract, and two tests make it true.**
- Required content (wording is the code-docs set's):
  - "This type is thread-safe. Every public member may be called concurrently."
  - "An instance is immutable after `CreateAsync`. Later changes to the options object or to environment variables have no effect. Create one client and reuse it."
  - "The SDK does not serialise commands. Concurrent commands on one `OCX_HOME` are safe. More than about 4 concurrent mutating commands on one `ocx.toml` can fail with exit 75 `project_locked`."
  - "Result types are not synchronised; the SDK never mutates them after return."
- What makes it true: `CreateAsync` copies collection-valued options and the environment. All instance fields of `OcxClient`, its handles, the options snapshot and the handshake type are `readonly`. There is no plain public setter, only `init`, and no mutable static state except CS-BIN-14's `HttpClient`. Process, pipes and pumps are per-call locals.
- Rationale:
  - Azure: "All public members of the client type must be safe to call from multiple threads concurrently" and "clients are immutable after being created" (Azure SDK .NET guideline, introduction.md:464-466, 788).
  - Redis states it in source (`LuaScript.cs:19`).
  - Python promises it in one sentence (`ocx-sdk-python@80136dde4162:src/ocx_sdk/_client.py:220-223`).
  - An unstated guarantee is not one. A stated but untested one was false in the fixture: a shared `StringBuilder` buffer gave 63-64 of 64 callers someone else's output.
  - IDE0044 and CA2211 miss a private field reassigned in a method and a `static readonly List<T>`.
  - The "about 4" is the measured knee between 4 and 8 concurrent adds on one machine ($SF §8-9).
- Verify:
  - `rg -q -i -g 'OcxClient.cs' -e 'thread-safe' src`.
  - `rg -q -i -g 'OcxClient.cs' -e 'project_locked' src`.
  - `IDE0044` and `CA2211` at `error` with `EnforceCodeStyleInBuild=true`.
  - `! rg -q -P -g '*.cs' 'static\s+readonly\s+(List|Dictionary|HashSet|Queue|Stack|StringBuilder)<' src`.
  - (a) A test: 64 concurrent commands through one client against `Ocx.Fake`'s echo verb, each asserting its own id back, under `--minimum-expected-tests` (CS-TEST).
  - (b) A reflection test: every declared instance field of those types `IsInitOnly`, every property setter carries the `IsExternalInit` modreq, no non-readonly static field.
- Watched: S4 `client bad` -> `mismatched=64` exit 1 / `good` -> 0 exit 0; S8 `immutable bad` -> `[_lastStderr]` exit 1 / `good` -> `[]` exit 0; IDE0044 `(5,20)` and CA2211 `(6,23)` on red2, 0/0 on green2 ($SF §10). The doc rg was not run.

**CS-ASYNC-27 (MUST) [ocx] The SDK adds no lock, semaphore or queue around ocx invocations. Exit 75 with `error.detail == "project_locked"` surfaces as `OcxCommandException` with `ErrorKind` `temp_fail` and that `Detail`. It is not retried for mutating commands (CS-PROC-22 unchanged).**
- Rationale:
  - ocx serialises itself with `fs4` advisory locks on store and temp entries (60 s default, 5 s local pull). It also takes a keyed project-mutation lock with a 500 ms budget (`crates/ocx_project/src/project_lock.rs:1-60`).
  - Against a main-built ocx:
    - 8 concurrent pulls of one package: 8x exit 0.
    - 8 concurrent pulls of 8 packages: 8x exit 0.
    - 8 concurrent `ocx add` into one `ocx.toml`: 8x exit 0, all 8 bindings kept. A naive unlocked writer kept 1-2.
    - 64 concurrent adds: 1-37 exit 75 and no corruption.
  - An SDK lock covers one process only, adds shared state, and would hide 75 in some configurations ($SF §9).
  - Branching on `Detail` after `ExitCode` and `ErrorKind` is CS-ERR-02's sanctioned order.
- Verify:
  - `! rg -q -g '*.cs' -e 'SemaphoreSlim' -e 'Channel<' -e '\block\s*\(' src/Process src/Commands`.
  - A test: `Ocx.Fake` returns the exit-75 `project_locked` document for a mutating command, and the test asserts one attempt and `OcxCommandException.Detail == "project_locked"`.
- Watched: real-ocx sections A-D and the lost-update detector (1-2 of 8 bindings red, 8/8 green) ($SF §9, `results-real.txt`). The SDK test is specified.

### Callbacks and streaming

**CS-ASYNC-28 (MUST) [ocx] v1's only streaming member is `OcxClientOptions.OnStderrLine` (`Action<string>?`, CS-OBS-27).**
- The public API has no `IAsyncEnumerable<T>`, no `IProgress<T>`, no .NET `event` and no `Func<string, Task>`/`Func<string, ValueTask>` callback.
- `Progress<T>` is banned in `src`.
- Rationale:
  - ocx has no progress contract. Progress draws only on a TTY (ocx-cli-contract.md:73), and a piped `--log-level debug index list` wrote 7 stderr lines (723 B).
  - `Progress<T>` posts to the context captured at construction, or to the ThreadPool. With 20,000 lines, 1,066 callbacks had run when the Task completed, 7,271 ran out of order and up to 43 ran concurrently.
  - A throwing `Progress<T>` handler killed the process (exit 134).
  - Shipping an iterator now would freeze back-pressure, break and cold/hot semantics in `PublicAPI.Shipped.txt` for a command that does not stream. Adding one later is additive. Source: $CB §1-2.
- Verify:
  - The BannedSymbols line ``T:System.Progress`1;callbacks are inline Action<string> (CS-ASYNC-28)``.
  - `! rg -q -g '*.cs' -e 'IAsyncEnumerable<' -e 'IProgress<' -e '\bevent\s+' -e 'Func<string,\s*(Value)?Task>' src`.
  - `! rg -q -e 'IAsyncEnumerable|IProgress|EventHandler' -g 'PublicAPI.*.txt' .`.
- Watched: $CB fixtures 1, 2 and 4, and `bans-red` RS0030 on `Progress<T>` / `bans-green` succeeded.

**CS-ASYNC-29 (MUST) [ocx] Every engine entry method starts with `await Task.CompletedTask.ConfigureAwait(ConfigureAwaitOptions.ForceYielding);`, before `Process.Start` and before any pump starts.**
- Rationale:
  - Everything before the first incomplete await runs on the caller's thread, and pipe reads with data ready complete synchronously.
  - A pump started there ran all 20,000 callbacks on a single-threaded (UI stand-in) context inside the call, and a UI probe waited 338 ms. With the yield: 0 callbacks on that thread and 0 ms.
  - `Task.Run` moves the callbacks but not the blocking `Process.Start`.
  - CA2007 accepts this spelling, and net8 has the API, so no `#if` is needed. Source: $CB §3.
- Verify: `rg -c -F 'ConfigureAwaitOptions.ForceYielding' src` is at least the number of engine entry points. Also a test runs a call under a single-threaded `SynchronizationContext` and asserts 0 callbacks on its thread.
- Watched: $CB `progress-ui-inline-noyield-red` / `progress-ui-forceyield-green`. Linux only; the rule is unconditional because correctness must not depend on child speed.

**CS-ASYNC-30 (MUST) [ocx] `OnStderrLine` is invoked inline by the stderr pump, with no SDK queue. Callbacks are sequential and in byte order within a call, and may run concurrently across calls, on a thread-pool thread. None starts after the Task completes. The pump never awaits a bounded hand-off.**
- The engine sets a volatile `sealed` flag before returning and checks it before each invocation.
- If CS-PROC-13 returned `DrainTimedOut = true`, at most one earlier invocation may still be running, and the property docs say so.
- The docs say "return quickly; hand off to your own queue". A slow callback slows ocx, bounded by the call timeout.
- Rationale:
  - This is the only shape that keeps CS-PROC-09/10's never-block-the-pump rule. A 150,000-line flood:

    | Shape | Child finished after |
    |---|---|
    | bounded `Channel` with `Wait` | 5,625 ms (stalled) |
    | inline slow callback | 3,019 ms (the consumer's own time) |
    | unbounded channel | 67 ms, but 149,100 lines buffered |
    | byte-capped `TryWrite` | 80 ms, 262,144 B, 103,677 dropped |

  - Measured completion: `seenAtTaskCompletion=20000 outOfOrder=0 maxConcurrentCallbacks=1`.
  - `ExecutionContext` flows into the pump: each of 3 concurrent calls saw only its own `AsyncLocal`. A client-level callback therefore needs no call-identity parameter; correlate with `Activity.Current` ($CB §4, §6).
- Verify:
  - BannedSymbols lines ``M:System.Threading.Channels.Channel.CreateBounded``1(System.Int32)``, ``M:System.Threading.Channels.Channel.CreateBounded``1(System.Threading.Channels.BoundedChannelOptions)`` and ``M:System.Threading.Channels.ChannelWriter`1.WriteAsync(`0,System.Threading.CancellationToken)`` at RS0030 error.
  - `! rg -q -g '*.cs' -e 'BoundedChannelFullMode' src`.
  - Tests: 20,000 lines asserting `calls_after_return == 0` and `maxConcurrent == 1`, the same under a cancelled call, and an `AsyncLocal` flow test.
- Watched: $CB fixture 6 (`stream bounded` / `stream capped`), fixture 1 green, `asynclocal`, and `bans-red`/`bans-green`. The `DrainTimedOut` caveat was not run.

**CS-ASYNC-31 (MUST) [ocx] A faulting `OnStderrLine` follows CS-OBS-28 (capture once, stop calling, keep draining, rethrow after exit and drain), with three refinements.**
- The child is never killed for a callback fault.
- If the call fails by itself (OCE, `OcxTimeoutException`, any `OcxException`), that exception propagates and the callback fault is dropped. Otherwise the callback exception is rethrown unwrapped, with its original stack, and the docs say the command's side effects happened.
- A caller-supplied passthrough `Stream` sink (CS-PROC-10) that throws follows the same capture, drain and rethrow contract. That case is by analogy and was not measured.
- Rationale:
  - A kill would turn a consumer bug into a half-applied `install`/`push`. The call's timeout still bounds it.
  - An unguarded throw hung 8,199 ms; capture, drain and rethrow took 59 ms and kept `InvalidOperationException` with the consumer's frame on top.
  - Precedence answers the swallow-versus-rethrow question that $CB §5 left to the consolidator: CS-OBS-28 already decided rethrow ($CB §5).
- Verify:
  - `rg -c -g '*.cs' 'ExceptionDispatchInfo\.Capture' src` equals the number of capture sites (1 for the pump).
  - CS-OBS-28's single justified CA1031 site.
  - Tests: throw on line 3 against 1 MiB of stderr finishes under 5 s, has the same type and the consumer frame in `StackTrace`, and `calls_after_throw == 0`. A second test sets the callback to throw while the call times out and asserts `OcxTimeoutException`.
- Watched: $CB `cb-naive-red` / `cb-capture-green`. The precedence and `Stream`-sink cases are specified, not run.

**CS-ASYNC-32 (MUST) [ocx] The stderr line splitter uses a fixed buffer of 65,536 bytes (an internal constant, not an option).**
- Past the cap it discards to the next `\n` and delivers the line marked truncated. It delivers the final unterminated fragment at EOF.
- The pump never uses `ReadLineAsync`, a growing `MemoryStream` or a `StringBuilder` for a line.
- Rationale: CS-PROC-10 caps capture, not the line buffer. A 64 MiB stderr with no newline produced one 67,108,864-char callback and allocated 256 MiB. A fixed 8,192-byte cap allocated 0 MiB and delivered `truncated=True` ($CB §7).
- Verify: `! rg -q -g '*Pump*.cs' -e 'ReadLineAsync' -e 'new MemoryStream\(\)' -e 'new StringBuilder\(' src`. Also a test feeds a 64 MiB no-newline child and asserts a `GC.GetTotalAllocatedBytes(true)` delta under 8 MiB and one truncated line.
- Watched: $CB `longline-red` / `longline-green`.

**CS-ASYNC-33 (MUST, when an `IAsyncEnumerable<T>` is first added) A process-owning iterator follows five rules.**
- It is `[Experimental]` at first release (CS-API Verdict 8).
- It is cold, documented as "each enumeration starts one ocx process".
- It takes `[EnumeratorCancellation] CancellationToken cancellationToken = default` last.
- It ends in `finally { cts.Cancel(); Kill(entireProcessTree: true); await exit and pumps }`.
- It buffers, if at all, through an unbounded channel with a byte cap against `MaxOutputBytes`, `TryWrite` and a dropped counter on the result.
- Rationale:
  - `break` runs only `DisposeAsync`. Without the `finally`, the child and its `sleep 30` grandchild were alive 500 ms later; with it, 0 survived, in 292 ms.
  - A cold iterator enumerated twice spawned two processes.
  - Bounded `Wait` stalls the child (CS-ASYNC-30).
  - CliWrap documents the same kill-on-abandon (`Tyrrrz__CliWrap@7dbc252fa773:CliWrap/EventStream/PullEventStreamCommandExtensions.cs:28-29,133-158`). Source: $CB §8.
- Verify: a test breaks after the first line and asserts the child pid is gone within 1 s, plus `CS8425` at error (CS-ASYNC-10) and the RS0030 bans of CS-ASYNC-30.
- Watched: $CB `break leak` / `break unbounded`, `reenum` (measurement), and `iter-red`/`iter-green`.

## Applied to the ocx C# SDK

**New commitments (the design must change for these):**
- **Async-only surface.** Every typed command (`PullAsync`, `InstallAsync`, ...) returns `Task<T>` and ends with `cancellationToken`. The Python SDK is sync-first with 6 of 62 methods async (python-sdk-digest S4 line 306; row 19 line 344). Do **not** copy its sync twins (CS-ASYNC-15).
- **One token; grace in `OcxOptions` per command class.** Rejects exemplar-cli-wrappers-and-sdks.md:211 ("forceful and graceful tokens") (CS-ASYNC-01, `$PX` rule 8).
- **`OcxClient` (sealed, `static CreateAsync`) is stateless and implements neither disposal interface.**
  - Anthropic's client is `IDisposable` (exemplar-cli-wrappers-and-sdks.md:156). The Python client has no `close` ($DS §4).
  - The `spawn` analogue returns a sealed dual-disposable `OcxProcessHandle` that kills the tree on both dispose paths.
  - Do **not** copy Python's `spawn`, which hands out raw `Popen`/`asyncio.subprocess.Process` (python-sdk-digest.md:256). In C#, a handed-out `Process` leaks fds and its `Dispose` does not kill (CS-ASYNC-11, CS-ASYNC-13).
- **Cross-group fix.** csharp-api-surface-shape.md:47 writes `CreateAsync(OcxClientOptions? options = null, CancellationToken ct = default)`. Under CS-ASYNC-01 the parameter is `cancellationToken`, as that file's own code block at line 96-97 already has. CS-API-01 in csharp-api.md:54 already uses `cancellationToken`.
- **Exit/"Exited" signalling.** Any TCS the engine completes from `Process.Exited` or a pump thread uses `RunContinuationsAsynchronously` (CS-ASYNC-07, $CA §7). Retry backoff awaits `Task.Delay(delay, cancellationToken).ConfigureAwait(false)` (`$PX` rule 18).
- **The handshake lives in `CreateAsync`, not in a lazy gate (CS-ASYNC-20).** python-sdk-digest row 30 proposed `Lazy<Task>`/`SemaphoreSlim` for the port's compat gate. Both are rejected: `Lazy<Task>` caches the fault (CS-ASYNC-21), and the factory removes the need.
- **Thread-safety remarks plus two tests (CS-ASYNC-26).** `Ocx.Fake` gains an `echo <id>` verb that sleeps 100 ms. The test project gains the 64-caller cross-talk test and the reflection immutability test over `OcxClient`, its handles, the options snapshot and the handshake type.
- **Streaming (CS-ASYNC-28..32).**
  - stderr lines reach consumers only through `OnStderrLine`, invoked inline after a `ForceYielding` engine entry, with a 64 KiB line cap and no queue.
  - The earlier plan for an `IProgress<string>`/`Action<string>` option is narrowed to `Action<string>` alone.
  - `Ocx.Fake` gains three verbs: a 1 MiB stderr flood, a 64 MiB no-newline line, and a throw-on-line-3 harness. These give the callback suite at least 7 tests, held in place by `--minimum-expected-tests`.
- **`EnsureAsync` loser path (CS-ASYNC-24).** A concurrent installer that loses the rename uses the winner's verified file.
  - This needs CS-BIN-12 step 3 to change from `overwrite: true` to `overwrite: false` plus the catch. CS-BIN-12's own Windows measurement is that a rename over a running `ocx.exe` throws, so `overwrite: true` fails exactly in the concurrent case.
  - Cross-group fix for the packaging consolidation.

**Already modelled by the Python SDK (port, do not reinvent):**
- Per-attempt timeout raising `OcxTimeoutError`, never `CancelledError` (`_process.py:532-535,588-603`, python-sdk-digest.md:74). This maps to CS-ASYNC-08.
- "Cancellation never orphans the child" (python-sdk-digest row 18, gh-88050 workaround). This maps to `$PX` reap-before-throw.
- Duplicated sync/async drivers instead of a bridge (python-sdk-digest.md:164, "the bridge would be more code than the thing it abstracts"). This is the precedent for pattern C if a sync leaf is ever approved.
- `_async` naming on execution verbs (python-sdk-digest.md:256). This maps to CS-ASYNC-05.
- The thread-safety promise: "the handle exposes no mutators, so it is safe to share across threads, tasks, and event loops" (`_client.py:220-223`). This maps to CS-ASYNC-26's remark, now with tests.
- A client-level, redacted per-line stderr callback (`on_log`, python-sdk-digest rows 20, 25). This maps to CS-OBS-27 and CS-ASYNC-30.

**Do NOT copy from Python:**
- `_CompatCell`, the lazy compat memo with a "benign" double-probe race shared across `with_config` handles (`_client.py:200-210,811-836`). Use the factory (CS-ASYNC-20).
- `on_log`'s unguarded pump. `_drain` has no try/except (`_process.py:627-631`), so a raising callback ends the pump thread and the child blocks on a full pipe (by reading; not run). Use CS-ASYNC-31.

**Forced by the ocx CLI contract:**
- Parallel ocx children on one `$OCX_HOME` are designed for: content-keyed lock files (ocx-cli-contract.md:95). SDK methods are therefore safe for concurrent calls and take no SDK-wide lock (CS-ASYNC-27, watched against a real ocx).
- `project_locked` is a schema'd `error.detail` slug on exit 75 (`crates/ocx_schema/tests/golden/errors.json:1977`). The SDK surfaces it as data on `OcxCommandException` (CS-ASYNC-27).
- About 5 ms per spawn (ocx-cli-contract.md:95) means `Task`, never `ValueTask` (CS-ASYNC-04), and "create one client and reuse it" (CS-ASYNC-26).
- Passthrough commands (`exec`, `run`, `package exec`, `package test`) can run indefinitely and forward the child's exit (ocx-cli-contract.md:58,131). A token on every method and a tree kill are mandatory (ocx-cli-contract.md:134 "honour cancellation ... kill the process tree").
- One JSON document on stdout, and logs and progress on stderr (ocx-cli-contract.md:68,73). Stdout is never streamed in v1, so there is no stdout/stderr interleaving to define (CS-ASYNC-30).

## AI-agent failure modes

Ranked by how often each bites. Corpus counts are from $CA/$DS/$SF/$CB and exemplar-language-shape.md.

1. **A "convenience" sync method doing `XAsync().Result`/`.GetAwaiter().GetResult()`, defended with "ConfigureAwait(false) makes it safe".** Corpus: 273 `GetAwaiter().GetResult()`, 235 `.Result`, 46 `.Wait()`. Caught by RS0030 (with the configured-awaiter and span lines), VSTHRD002 and VSTHRD103 (CS-ASYNC-14).
2. **ConfigureAwait missing in the library, or sprinkled into tests. CA2007-clean code is assumed done while `await foreach (x in e.WithCancellation(ct))` and `await using (x)` stay unconfigured.** Corpus: 82%, bimodal by analyzer severity. Caught by MA0004 plus the scoped CA2007 (CS-ASYNC-06, V-C2).
3. **Token misnamed (`ct`, `token`, 8.5% of corpus parameters), not last, or missing on convenience/generated wrappers** (Stripe: 701 uncancellable `FetchRelatedObjectAsync`). Caught by CA1068 and the name rg (CS-ASYNC-01).
4. **`private readonly Lazy<Task<T>> _x = new(() => InitAsync());`, or `PublicationOnly` "so exceptions aren't cached", or `AsyncLazy<T>`.** 4 of 35 exemplar repos do it. Caught by VSTHRD011 under TWAE, the `Lazy<\s*Task` rg and the package rg (CS-ASYNC-21).
5. **`new Progress<T>(...)`/`IProgress<T>` offered as "the idiomatic .NET progress API" for a CLI wrapper.** Caught by RS0030 on ``T:System.Progress`1`` and the public-surface rg (CS-ASYNC-28).
6. **`Process`/CTS left undisposed in a helper shaped `return p.ExitCode;`.** CA2000 misses it. Caught by IDISP001 (CS-ASYNC-11).
7. **The full `Dispose(bool)` + finalizer ritual on a managed-only class, or "fixing" CA1063/CA1816 by adding it.** Caught by the ritual rg and IDISP025 (CS-ASYNC-12).
8. **Silencing an analyzer with a placeholder:** `_ = XAsync()` for CS4014/VSTHRD110, `CancellationToken.None`/`default` for CA2016. Caught by the discard rg and the `None` review list (CS-ASYNC-17, CS-ASYNC-02).
9. **Shared init started with the first caller's token (`_task ??= InitAsync(cancellationToken)`), or reset on `IsFaulted` only.** Caught by the first-token rg and the S1c/S2 tests (CS-ASYNC-22, CS-ASYNC-23).
10. **"Back-pressure" via `Channel.CreateBounded<string>(n)` in the stderr pump, or `catch (Exception) { }` around the callback.** Caught by RS0030 on `CreateBounded`/`WriteAsync`, the single CA1031 site and the throw-on-line-3 test (CS-ASYNC-30, CS-ASYNC-31).
11. **A defensive `SemaphoreSlim` per client "to make concurrent ocx calls safe", with `_sem.Wait()` or acquire inside `try`.** Caught by the CS-ASYNC-20/27 rgs, CA1849 + VSTHRD103, the `new SemaphoreSlim(\d+)` rg and the S6a test (CS-ASYNC-25).
12. **"Thread-safe" written on a class with a shared buffer, or the caller's options object held by reference.** Caught by the 64-caller test and the reflection test (CS-ASYNC-26).
13. **Treating `Process.Dispose()` as "stop the process".** Caught by the runtime kill test (CS-ASYNC-13).
14. **Timeout via `WaitAsync`/`WhenAny(Delay)`, `catch (TaskCanceledException)`, or `e.CancellationToken == ct` behind a linked source.** Caught by the CS-ASYNC-08/09 rgs and the unit test.
15. **Pump started on the caller's thread, "because it's an async method".** Caught by the `ForceYielding` count and the single-threaded-context test (CS-ASYNC-29).
16. **`async void` callbacks, or an `async` lambda passed to `Action`/`ForEach`/`OnStderrLine`.** Caught by VSTHRD100 and VSTHRD101 (CS-ASYNC-16).
17. **`new TaskCompletionSource<T>()` without options, or with `TaskContinuationOptions`.** Caught by the CS-ASYNC-07 rg and CA2247.
18. **Reading stderr lines with `ReadLineAsync` and calling it streaming.** That makes the line buffer unbounded: 256 MiB for a 64 MiB line. Caught by the pump rg and the 64 MiB test (CS-ASYNC-32).
19. **Dropping the `Async` suffix "like Anthropic", or putting it on a sync method.** Caught by VSTHRD200 (CS-ASYNC-05).
20. **Adding `CancellationToken ct = default` by editing a shipped signature.** Caught by RS0016/RS0017 or the previous-release consumer build (CS-ASYNC-03).
21. **Trusting the AnalysisLevel ("recommended catches it", `latest`).** Caught by the red canary build (CS-ASYNC-19).
22. **Hallucinated APIs:** `WaitForExitAsync(TimeSpan)` (CS1503), `Task.Yield().ConfigureAwait(false)` (CS1929), `SuppressThrowing` on `Task<T>` (CA2261), BCL `AsyncLazy<T>` (CS0246), `semaphore.LockAsync()` (CS1061), `System.Threading.Lock` on net8 (CS0246). Caught by the compiler and CA2261 at `error`.
23. **`break` out of `await foreach` over a process-owning iterator with no `finally`.** The child and grandchild survive. Caught by the break test (CS-ASYNC-33).
24. **"ConfigureAwait is obsolete on .NET 8+/11 runtime-async".** Caught by CS-ASYNC-06's rationale (RC1 deadlock unchanged).
25. **`ValueTask` everywhere "for performance", stored and double-awaited.** Caught by CA2012 at `error` (CS-ASYNC-04).
26. **`Task.WaitAll(a, b)` slipping past a `Task[]` ban through the .NET 9+ span overload.** Caught by the span BannedSymbols line.
27. **An async iterator without `[EnumeratorCancellation]`, or `Src().WithCancellation(ct)` instead of `Src(ct)`.** Caught by CS8425 and CA2016 at `error`.
28. **`System.Linq.Async` 6.0.1 added on net10.** It makes every `Select`/`ToListAsync` ambiguous (CS0121). Caught by the compiler. Remove it; on net8 use `System.Linq.AsyncEnumerable` 10.0.x ($CB §9).

## Failure classes

| Class (mechanism) | Members (failure mode #) | Check that catches the class |
|---|---|---|
| A. Placeholder silencing: the analyzer is satisfied, the semantics are lost | 8, parts of 2 and 10 | Review rgs for `_ = *Async(`, `CancellationToken.None`, `#pragma warning disable VSTHRD`, `catch (Exception)`, each requiring a reason comment |
| B. Analyzer blind spots: the rule exists but misses a syntactic form | 2 (`WithCancellation`/`using (x)`/`Yield`), 6 (`return p.ExitCode`), 7, 17 (omission), 26, 12 (IDE0044 misses reassigned fields) | Pair every analyzer with a second check watched red/green in this file (MA0004 for CA2007, IDISP for CA2000, reflection test for IDE0044). Never trust one analyzer alone |
| C. Context capture and blocking: deadlock, pool starvation, thread theft | 1, 2, 5, 11 (`.Wait()`), 15, 16, 17 | CA2007 + MA0004 (scoped), RS0030/VSTHRD002/103, the TCS rg, `ForceYielding` at entry, the `Progress<T>` ban |
| D. Lifetime and ownership: leaks, dispose vs kill | 6, 7, 13, 23, dropped registration | IDISP001/004 + CA2000 + CA1001/CA2213 + runtime kill/fd-plateau and break tests |
| E. Public-contract drift: name, position, retrofit, suffix, task type, sync twins, premature streaming surface | 3, 5, 19, 20, 25 | CA1068, VSTHRD200, CA2012, PublicAPI RS0016/17, signature rgs, the CS-ASYNC-28 surface rg |
| F. Cancellation-semantics confusion: wait vs cancel, timeout vs caller, whose token | 9, 14, 27 | CS-ASYNC-08/09/22 rgs + unit tests on token identity, timeout type and second-caller completion |
| G. Config silence: the gate is off or floating | 21, 22, 24 | A red canary build that must exit 1, the `rg -c ... = 24` check, and the VSTHRD011-not-none rg |
| H. Outcome caching in shared state: a failure or a first caller's choice becomes permanent | 4, 9, 11 (defensive lock), 12 | No lazy state in the client (CS-ASYNC-20 rg); if a gate exists, the S1/S1c/S2/S3 tests with a spawn counter |
| I. Pump coupling: consumer code changes how fast or how much the pump reads | 5, 10, 15, 18 | RS0030 on `Progress<T>`/`CreateBounded`/`WriteAsync`, the line-cap test, the throw-on-line-3 test, the 1 MiB flood under a time bound |

## Conflicts resolved

1. **CA2007 on `await foreach` and `await using`** ($CA said it flags neither; $DS said it flags `await using`). *Corrected this revision.*
   - The first consolidation measured only `src.WithCancellation(ct)` and generalised that to "not `await foreach`".
   - `$C/mz-gap` shows CA2007 **does** flag bare `await foreach`, including the split-line form (`(14,33)`, `(16,13)`). It misses `.WithCancellation(ct)` without ConfigureAwait (`(13,33)`), `await using (b)` on an existing variable and `await Task.Yield()`. It flags `await using var a = new H();` (`Red.cs(21,29)`).
   - Resolution: MA0004 (closes all but `Yield`) plus the `Task.Yield` ban (CS-ASYNC-06).
2. **AnalysisLevel** ($CA: pinned `10.0-recommended`; $DS: `AnalysisMode=All`; build group: `10.0-all`). Measured: explicit severities fire identically at Default, Recommended and All. Resolution: the async gate is level-independent. The level stays with csharp-build.
3. **VSTHRD003** (the brief lists it as applicable). It fired three false positives on legitimate patterns. Set to `none`; csharp-build-analyzer-gate.md:55 measured the same.
4. **Timeout exception type** ($CA/$DS: BCL `TimeoutException`; `$PX`/API: `OcxTimeoutException : OcxException`). Took the `$PX` form for identity with csharp-process. In general form: "a distinct non-OCE type the library owns".
5. **Classification filter** ($CA: `when (!ct.IsCancellationRequested)`). Replaced by `$PX`'s `when (linked.IsCancellationRequested)` with the caller checked first, because the $CA filter misclassifies OCEs from unrelated sources.
6. **One token vs graceful+forceful tokens** (wrappers audit:211, CliWrap). One token, because CA2016 goes blind on two-token methods.
7. **Package versions** (VSTHRD 17.14.15 in $CA vs 18.7.23 in $DS; BannedApi 4.14.0 in `$PX` vs 5.6.0 in $DS). Pinned 18.7.23 and 5.6.0, the versions the merged gate was watched with.
8. **MA0004 vs rg for the ConfigureAwait gaps.** *Changed this revision.* The first consolidation chose the rg because MA0004 meant a new dependency. CS-API Verdict 3 has since put `Meziantou.Analyzer` (mode `None`) into the build, so MA0004 costs one line.
   - Measured, MA0004 catches the `WithCancellation` and `using (b)` gaps CA2007 leaves.
   - The line rg false-positives on correct split-line code.
   - MA0004 is primary; the rg is the fallback if Meziantou is ever removed. csharp-process's "no Meziantou" (csharp-process.md:430) concerned MA0161-0163 and predates CS-API Verdict 3.
9. **Correction to `$PX` §3.** It claims a token-less `OperationCanceledException` does not mark the task Canceled. That is false: measured here, both end `Status=Canceled` (`$C/oce-status`: `token-less OCE: Status=Canceled tokenMatchesCaller=False`). The real reason to carry the caller's token is caller-side filtering `when (e.CancellationToken == ct)`. The csharp-process consolidation should fix that rationale.
10. **Single-flight shape** ($SF found three passing patterns: shared task, in-flight coalescing, semaphore double-check; python-sdk-digest row 30: `Lazy<Task>`/`SemaphoreSlim`).
    - Decided: **no single-flight in `OcxClient` at all**, because CS-API-01's factory runs the handshake, which agrees with CS-API Verdict 1 and CS-JSON-10.
    - Pattern A is the rule for any future in-memory gate. Pattern B is only for `EnsureAsync`, and optional. The semaphore form (Npgsql, Anthropic) is not adopted: a cancelling winner wastes its init (`starts=2`), which for a 20 MB download is a second download.
11. **`Task.Yield` in $SF's Pattern B vs CS-ASYNC-06's `Task.Yield` ban.** Replaced by `ForceYielding`. Measured equivalent for the load-bearing property (V-C3, net8 and net10).
12. **`WaitAsync` for shared work vs CS-ASYNC-09's `WaitAsync` warning.** No conflict once stated. CS-ASYNC-09 forbids `WaitAsync(timeout)` as the way to stop work. CS-ASYNC-22 uses `WaitAsync(cancellationToken)` to abandon a wait on work that carries its own owned bound. CS-ASYNC-09's verify now names that case.
13. **Retrying `project_locked` on mutating commands** ($SF SF-17 MAY vs CS-PROC-22 "never retry the 10 mutating commands").
    - Kept CS-PROC-22. $SF reads the lock as acquired before any read or write (`project_lock.rs:56-60`, `add.rs:42`), and 3 contended runs stayed intact. That is evidence, not a contract.
    - The SDK surfaces `Detail == "project_locked"` so callers can retry themselves. Widening needs an ocx-maintainer answer (Open questions).
14. **Swallow vs rethrow a callback fault** ($CB "consolidator must pick"; Npgsql swallows, M.E.L aggregates, CliWrap kills). Already decided by CS-OBS-28: rethrow. This revision adds precedence (the call's own failure wins) and no-kill (CS-ASYNC-31).
15. **`Action<string>` vs `IProgress<string>` for stderr lines** (the first consolidation's Applied section allowed either). Narrowed to `Action<string>`, as CS-OBS-27 already says. Measured: `Progress<T>` reorders (7,271 of 20,000), lags (1,066 run at completion) and can crash the process (exit 134).
16. **`IAsyncEnumerable<T>` now vs later** (`$CB` contested pull vs push). Later: ocx has no event stream. The trigger to revisit is a documented ocx event stream showing up in the `OCX_SDK_CONTRACT` tier. CS-ASYNC-33 is the checklist for that day.
17. **VSTHRD011 listed as library noise** (CS-ASYNC-19, first consolidation). Wrong for 011. It is the only analyzer that blocks `Lazy<Task<T>>`, and it fires under TWAE at its package default ($SFX/Cs). Removed from the noise list; its suggested fix is rejected.

## Open questions

**Owner decisions:**
1. Confirm async-only v1 with no sync twins, accepting a break from Python parity (CS-ASYNC-15). The alternative is a pattern-C sync leaf for MSBuild/PowerShell consumers.
2. **As ocx maintainer:** does any ocx code path take the project mutation lock after reading or writing `ocx.toml`?
   - If none does, CS-PROC-22 may widen to a bounded retry of exactly `detail == "project_locked"` for mutating commands (3 attempts, 100-400 ms jitter via `TimeProvider`).
   - Also decide whether `CONTENTION_BUDGET` (500 ms) stays fixed, since CS-ASYNC-26's "about 4" depends on it.
3. Accept CS-ASYNC-24's cross-group change to CS-BIN-12 step 3 (`overwrite: true` -> `overwrite: false` plus loser catch), and decide whether v1 ships the in-flight coalescing at all (default here: no).

**Another research round:**
- **csharp-crossplatform: Windows runs of the streaming and single-flight fixtures.**
  - Question: does the synchronous pipe-read completion that CS-ASYNC-29 guards against occur on Windows overlapped pipes?
  - Do the CS-ASYNC-30 stall numbers hold there?
  - Does the `overwrite: false` loser path of CS-ASYNC-24 behave as designed against a running `ocx.exe`?
  - None of these was run on the Windows host. Also one real WinForms/WPF run, to make the ConfigureAwait deadlock first-hand rather than a simulated pump. That run is not load-bearing.
- **csharp-async at .NET 11 GA (Nov 2026).**
  - Question: with a native `net11.0` build and runtime-async on, do the single-flight matrix, `ForceYielding` and the CS-ASYNC-06 deadlock table stay unchanged?
  - RC1 covers only a net10 build rolled forward ($SF §10) and the `$CA §11` deadlock run.

## Sub-artifacts

- [csharp-async-cancellation-and-context.md](csharp-async/csharp-async-cancellation-and-context.md): token signature, analyzer ladder per AnalysisLevel, retrofit cost, ConfigureAwait deadlock matrix, TCS thread theft, Task vs ValueTask, Async suffix, .NET 11 runtime-async.
- [csharp-async-disposal-and-sync-bridges.md](csharp-async/csharp-async-disposal-and-sync-bridges.md): process-engine ownership map, fd/CTS leak measurements, dual disposal, the Dispose-ritual anti-pattern, CA2000 vs IDISP matrix, sync-over-async deadlock and starvation, five sync-facade patterns, BannedSymbols fragment.
- [csharp-async-single-flight-and-thread-safety.md](csharp-async/csharp-async-single-flight-and-thread-safety.md): `Lazy<Task>`/`AsyncLazy` fault caching, the first-caller token, eleven gate shapes measured for retry/cancel/spawn count, `SemaphoreSlim` discipline and starvation, atomic install race, the thread-safety statement and its two tests, and what ocx itself locks (real-ocx concurrency runs).
- [csharp-async-callbacks-and-streaming.md](csharp-async/csharp-async-callbacks-and-streaming.md): v1 streaming decision, `Progress<T>` reordering and crash, caller-thread pump trap, callback ordering/completion/fault contract, back-pressure table against CS-PROC, per-line cap, `IAsyncEnumerable<T>` checklist (token, ConfigureAwait gap, break, re-enumeration), `System.Linq.Async` on net10.

## Key sources

- https://learn.microsoft.com/en-us/dotnet/standard/asynchronous-programming-patterns/task-based-asynchronous-pattern-tap: TAP; suffix, token name, cancellation outcome, ValueTask wording.
- https://devblogs.microsoft.com/dotnet/configureawait-faq/: library ConfigureAwait guidance, why "first await only" is not enough.
- https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2007: library scope, default "No", `Task`-only wording that explains the `await foreach` gap.
- https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2016: forwarding, multi-token non-violation.
- https://learn.microsoft.com/en-us/dotnet/standard/threading/cancellation-in-managed-threads: linked sources, disposal, multi-token classification.
- https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/implementing-disposeasync: dual disposal, the async-only leak caution, stacked usings.
- https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/breaking-changes: an added parameter causes MissingMethodException.
- https://devblogs.microsoft.com/dotnet/should-i-expose-synchronous-wrappers-for-asynchronous-methods/: no sync wrappers in libraries.
- https://microsoft.github.io/vs-threading/analyzers/index.html: VSTHRD IDs and default severities (VSTHRD011 for `Lazy<Task<T>>`).
- https://learn.microsoft.com/en-us/dotnet/api/system.lazy-1?view=net-10.0: exception caching and `PublicationOnly`, the sentences agents misread for `Lazy<Task>`.
- https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.task.waitasync?view=net-10.0: per-caller wait over shared work; TimeProvider overloads net8+.
- https://learn.microsoft.com/en-us/dotnet/api/system.threading.semaphoreslim?view=net-10.0: no thread identity, no FIFO, the caller's pairing duty.
- https://github.com/Azure/azure-sdk/blob/main/docs/dotnet/introduction.md: client thread-safety MUST and immutability after creation (lines 464-466, 788).
- https://learn.microsoft.com/en-us/dotnet/api/system.progress-1: context capture at construction, ThreadPool fallback.
- https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/generate-consume-asynchronous-stream: captured-context default for `await foreach`, `[EnumeratorCancellation]`, the `finally` expansion behind `break`.

## Revision log

- 2026-10-11 revision 1 (folds in $SF and $CB):
  - Frontmatter: `consolidates` gains the two new sub-artifacts; `revised` was added; the title was widened.
  - Verdict: 7 and 8 were amended (MA0004; VSTHRD011 kept on). 9-13 are new: no lazy state, download-once, the single-flight shape, the thread-safety promise and the streaming surface.
  - CS-ASYNC-02: shared work is named as the one designed non-forwarding case. CA2016 on `Src().WithCancellation(ct)` was recorded (measured in `$C/mz-gap`).
  - CS-ASYNC-06, changed in place with the meaning kept:
    - `.WithCancellation(ct)` alone is stated not to count.
    - MA0004 replaces the gap rg as the primary check; the rg is kept as a fallback with its measured split-line false positive.
    - V-C2 was added.
    - Why: `$CB` fixture 10 and `$C/mz-gap` contradict the earlier "CA2007 does not flag `await foreach`".
  - CS-ASYNC-08: the `WaitAsync` OCE token identity was added from $SF §4.
  - CS-ASYNC-09: `Delay(Timeout.Infinite` was added to the rg, and the shared-work `WaitAsync` case was stated (conflict 12).
  - CS-ASYNC-10: the measured effect (1,119 ms vs 150 ms) and net11 RC1 parity were added from $CB.
  - CS-ASYNC-13: the `SemaphoreSlim` field made CA1001 fire, a link to CS-ASYNC-20.
  - CS-ASYNC-16: extended to `OnStderrLine = async`, with a README/sample rg, from $CB §10.
  - CS-ASYNC-17: a stored shared-init task is stated as not fire-and-forget.
  - CS-ASYNC-19:
    - VSTHRD011 was removed from the "noise" list and kept at its package default, with a not-`none` check. Why: $SFX/Cs measured it as the only `Lazy<Task<T>>` blocker.
    - Meziantou was noted as the MA0004 source.
    - The 24-line count check is unchanged.
  - New CS-ASYNC-20..27 (shared state, single-flight, SemaphoreSlim, thread-safety doc rule and tests, no SDK serialisation), from $SF SF-01..20. SF-17 was rejected for v1 and SF-18 folded into 26.
  - New CS-ASYNC-28..33 (streaming surface, `ForceYielding` entry, inline delivery and no queue, fault precedence, line cap, iterator checklist), from $CB CS-CB-01..15:
    - CB-12 folded into CS-ASYNC-16.
    - CB-14 and CB-15 folded into CS-ASYNC-10 and CS-ASYNC-06.
    - CB-16 moved to failure mode 28, because the compiler already catches it.
    - CB-09/11/17 folded into 30/31.
  - Applied section:
    - The stderr-callback bullet changed from `IProgress<string>`/`Action<string>` to `Action<string>` only (conflict 15).
    - Added the handshake-in-factory, thread-safety tests, streaming and `EnsureAsync` loser-path commitments.
    - Added "Do NOT copy" (`_CompatCell`, unguarded `on_log` pump) and new contract facts (`project_locked`, stderr-only logs).
  - Failure modes were re-ranked with 10 new entries. Failure classes H (outcome caching) and I (pump coupling) were added.
  - Conflicts: 1 and 8 were rewritten on the new measurements; 10-17 were added.
  - Open questions:
    - Removed: kill style (decided catch-based by csharp-process.md:427), Meziantou adoption (settled by CS-API Verdict 3 + conflict 8), and both "another round" topics, shared async state and callbacks/streaming (answered by $SF and $CB).
    - Added: the `project_locked` retry question to the ocx maintainer, and the CS-BIN-12 `overwrite` change.
    - Rounds now: Windows fixture runs and .NET 11 GA.
  - New fixtures:
    - `$C/mz-gap` (V-C2, MA0004 vs CA2007, red/green with Meziantou off and on).
    - `$C/coalesce` (V-C3, Pattern B with `ForceYielding` vs no yield on net8 and net10).
