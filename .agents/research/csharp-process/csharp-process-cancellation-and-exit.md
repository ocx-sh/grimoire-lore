---
title: "Cancelling, timing out and killing the ocx child, and mapping its exit status (C# / .NET)"
topic: csharp-process-cancellation-and-exit
agent: deep-dive researcher (group csharp-process)
model: claude-sonnet-5-5
date_researched: 2026-10-10
sources_count: 25
scope: >
  Covers the termination half of the C# ocx process engine: CancellationToken to kill ladder, tree kill, caller-cancel vs SDK-timeout
  exception contract, the grace period per OS, the Windows interrupt strategy, the exit-status mapping (POSIX signal codes, Windows
  codes, the ocx 13/18-code table and where to generate it) and the retry rule, on .NET 8 floor / .NET 10 LTS / C# 14, with .NET 11 RC1
  flagged. Measured on Linux (net8, net10, net11 RC1) and on the Windows host (net10, SDK 10.0.102); macOS is NOT measured.
  Not covered: argv/escaping, stdout/stderr draining and size caps, env neutralisation, exe resolution, JSON decoding of reports
  (sibling subtopics); the full retry/backoff implementation beyond the classification rule.
---

# Cancelling, timing out and killing the ocx child; mapping its exit status

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   - 1. [The contract in one table](#1-the-contract-in-one-table)
   - 2. [Tree kill is not optional](#2-tree-kill-is-not-optional)
   - 3. [Caller cancel vs SDK timeout](#3-caller-cancel-vs-sdk-timeout)
   - 4. [The reap guarantee](#4-the-reap-guarantee)
   - 5. [What ocx does with signals, and the POSIX ladder](#5-what-ocx-does-with-signals-and-the-posix-ladder)
   - 6. [Windows: interrupt strategies compared](#6-windows-interrupt-strategies-compared)
   - 7. [Exit-status mapping](#7-exit-status-mapping)
   - 8. [The retry rule](#8-the-retry-rule)
   - 9. [.NET 10 removed the default SIGTERM handler](#9-net-10-removed-the-default-sigterm-handler)
   - 10. [.NET 11 RC1 surface](#10-net-11-rc1-surface)
   - 11. [Verified on the toolchain](#11-verified-on-the-toolchain)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- Kill the whole tree: `process.Kill(entireProcessTree: true)` (net5+; absent on netstandard2.0). Bare `Kill()` leaves the grandchild alive: measured on Linux and Windows, and 5 of 10 surveyed wrappers do it.
- Windows `Kill(true)` kills the root first, then re-finds children by `ParentProcessId` plus start time; Linux sends `SIGSTOP` to the root, snapshots children, `SIGKILL`s, recurses. On Linux a root that already exited cannot be tree-killed (children re-parented); on Windows it can, while the `Process` object still holds its handle.
- `Process.WaitForExitAsync(ct)` never kills: cancelling it leaves the child running (measured). Cancellation = catch, kill tree, then `await WaitForExitAsync(CancellationToken.None)` before throwing, so the process never outlives the call.
- Two causes, two types: caller cancellation throws `OperationCanceledException` whose `CancellationToken` is the caller's token; an SDK timeout throws `OcxTimeoutException : OcxException` (not an OCE). Classify after the wait via a linked source (`CreateLinkedTokenSource` + `CancelAfter`) and `when (linked.IsCancellationRequested)`; the caller wins a tie.
- `WaitForExitAsync` throws `TaskCanceledException` (an OCE subtype) carrying the linked token, not the caller's: a naive catch cannot tell the two causes apart (measured red).
- `CancelAfter(TimeSpan)` accepts -1 ms (infinite) to `uint.MaxValue - 1` ms (49.7 days) on net8 and net10; `uint.MaxValue` ms throws `ArgumentOutOfRangeException`. Validate `OcxOptions.Timeout` once, not per call.
- `ocx 0.6.5` has no signal handlers: SIGINT/SIGTERM end it at once (measured), so a graceful phase buys nothing for ocx's own commands. Grace matters only for passthrough (`exec`, `run`, `package exec`, `package test`), where on Unix ocx `execvp`s and the child pid IS the tool (measured; source-confirmed on main).
- Grace per OS: POSIX passthrough SIGTERM then 5 s then `Kill(true)` (Python SDK `KILL_GRACE = 5.0`, Aspire 5 s); ocx-owned commands and all of Windows grace = 0, straight to `Kill(true)`.
- Windows has no safe default interrupt. `GenerateConsoleCtrlEvent(CTRL_BREAK_EVENT)` works only with `CreateNewProcessGroup = true` (net10+; CS1061 on net8) and `CreateNoWindow = false`, returns true even when nothing is delivered (measured), and `CreateNewProcessGroup` disables Ctrl+C for the child. Make it opt-in; never the default.
- CliWrap's Windows `Signaler.exe` (extracted to `%TEMP%`, 30 s wait) is the only general solution but writes an executable at runtime and needs a net35 loader; do not copy it.
- POSIX signals reach .NET as `128 + signo` (`pal_process.c:739`): SIGINT 130, SIGTERM 143, SIGKILL 137; Windows `Process.Kill()` leaves exit code `-1`, a Ctrl+Break'd handler-less child leaves `0xC000013A`. An exit status the SDK itself caused must surface as cancel/timeout, never as an `ExitCode` failure.
- .NET 10 removed the default SIGTERM handler: `ProcessExit` is not raised, the exit code stays 143 (measured on net10: handler not run; net8: handler ran). An SDK must install no process-wide signal handler and must not rely on `ProcessExit` for child cleanup.
- Exit table: 13 codes on ocx main, 18 on v0.6.5, and `82` changed meaning (DirtyRcBlock to Unsupported). Generate the enum from `errors.json` `$defs.ExitCode["x-ocx-enum"]`, key it by ocx version, keep it open (unknown number = `Unknown(int)`), never write numeric literals.
- Passthrough commands forward the child's code; the SDK returns it as a child result and never maps, throws on, or retries it (a child `exit 64` is indistinguishable from `UsageError`; Python smell S2).
- Retry only on `75`, only for non-mutating ocx-owned commands, never for passthrough children, timeouts or cancellations; mutating commands default to no retry.
- .NET 11 RC1 `Process.RunAsync(..., cancellationToken)` returns `Canceled = true, ExitCode = 137, Signal = SIGKILL` instead of throwing, and orphans a grandchild (measured); `RunAndCaptureTextAsync` throws OCE. Fence behind `#if NET11_0_OR_GREATER`, never the default.
- `KillOnParentExit` works on Linux RC1 (measured: child dies when the parent is SIGKILLed; control survives), but Learn's what's-new says Windows-only while the devblog says Windows/Linux/Android and Cake throws on macOS. Treat macOS as unsupported.

## Findings

### 1. The contract in one table

Decision this artifact proposes (every cell is argued in the sections named in the last column):

| Situation | Result | Type / value | Process state afterwards | Section |
|---|---|---|---|---|
| ocx exits 0, 64..82, 1 | returns a result carrying `ExitCode` (int) | `OcxResult` (ocx-owned) mapped to `OcxProcessException` only by the typed command layer | exited | 7 |
| passthrough child exits any code | returns | `ChildExit(int Code)`, no mapping | exited | 7 |
| caller token cancelled | throws | `OperationCanceledException` with `.CancellationToken == callerToken` | killed (tree) and reaped before the throw | 3, 4 |
| SDK timeout (`Timeout`) fires | throws | `OcxTimeoutException : OcxException` (carries `Timeout`, redacted argv, stderr tail) | killed (tree) and reaped before the throw | 3, 4 |
| both fire together | caller wins | OCE with caller token | same | 3 |
| exit 75, ocx-owned, non-mutating | retried, bounded | attempts 3, last result/exception surfaces | exited | 8 |
| exit 75, passthrough or mutating | returned/thrown once | no retry | exited | 8 |
| spawn failure (missing exe) | throws | `OcxSpawnException` wrapping `Win32Exception` (NativeErrorCode 2 measured by the earlier audit) | none | adjacent subtopic |

Rationale for "returns vs throws": cooperative cancellation is documented as `OperationCanceledException(externalToken)`, which library code "should interpret ... as cooperative cancellation, and not necessarily as a failure exception" ([Cancellation in managed threads](https://learn.microsoft.com/en-us/dotnet/standard/threading/cancellation-in-managed-threads)); a timeout the caller did not request is a failure of the SDK's own budget and needs its own type, as in the Python SDK (`OcxTimeoutError`, never `CancelledError`; `ocx-sdk-python@80136dde4162:src/ocx_sdk/_process.py:532-535,588-603`).

### 2. Tree kill is not optional

**Measured** (fixture `net10`, role `child` = a process that spawns a sleeping grandchild; see section 11): `Kill()` leaves the grandchild alive after 2 s on Linux, on Windows and on net8; `Kill(true)` removes it everywhere. The earlier wrapper audit found the same on its own fixture E3 and counted 3 of 10 wrappers using tree kill (CliWrap, SimpleExec default, Aspire) vs 5 of 10 bare `Kill()` (Medallion, Nuke, Cake, Azure.Core, PowerShell) (`csharp-audit/exemplar-cli-wrappers-and-sdks.md` section 2).

```csharp
// WRONG: orphans every grandchild. Medallion does exactly this.
// madelson__MedallionShell@e45f1f6ffd4c:MedallionShell/ProcessHelper.cs:26   process.Kill();
p.Kill();

// RIGHT: named argument, narrow catch, then reap.
try { p.Kill(entireProcessTree: true); }
catch (InvalidOperationException) { /* no process associated / caller inside the tree: see below */ }
catch (Win32Exception) { /* terminating or access denied */ }
await p.WaitForExitAsync(CancellationToken.None);   // Kill is asynchronous
```

What the BCL does (v10.0.0 source):

- API: `Kill(bool entireProcessTree)` exists on .NET Core 3.0+ / .NET 5+, "`false` to kill only the associated process"; exceptions `Win32Exception` (could not terminate / is terminating), `NotSupportedException` (remote), `InvalidOperationException` (".NET Framework only: already exited" **or** no process associated **or** "the calling process is a member of the associated process's descendant tree"), `AggregateException` ("Not all processes in the associated process's descendant tree could be terminated"). Processes whose details the caller lacks permission to view are "silently skipped" ([Process.Kill](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process.kill?view=net-10.0)). It is absent on netstandard2.0 (earlier audit probe CS1501 for `Process.Kill(bool)`).
- `Kill` "executes asynchronously"; `WaitForExit`/`HasExited` "do not reflect the status of descendant processes. When `Kill(entireProcessTree: true)` is used ... will indicate that exiting has completed after the given process exits, even if all descendants have not yet exited" ([Process.Kill remarks](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process.kill?view=net-10.0)). So "process exited" does not mean "tree gone"; the 2 s sleep in the fixture is a probe, production code does not poll the grandchild.
- Unix: `KillTree` returns at once if the root already exited ("we can no longer determine its children"), otherwise `SIGSTOP` the root "so it won't start additional children", snapshot children, `SIGKILL` the root, recurse ([Process.Unix.cs:101-139](https://raw.githubusercontent.com/dotnet/runtime/v10.0.0/src/libraries/System.Diagnostics.Process/src/System/Diagnostics/Process.Unix.cs)).
- Windows: kill the root "so that no further children can be created" (`Kill()` is `TerminateProcess(handle, -1)`, `Process.Windows.cs:100`), then find children where `StartTime < child.StartTime && Id == child.ParentProcessId` (`Process.Win32.cs:329-339,386-420`). Windows does not rewrite a dead parent's pid on its children, so a root that exited **but whose `Process` object still holds a handle** still reaches its re-parented grandchildren. Measured: Linux grandchild alive after `Kill(true)` on an exited root, Windows grandchild dead.
- Cannot reach: processes that double-forked and whose parent died on Linux; anything that escaped to another session/job; processes the caller may not open. For stronger containment use a Windows job object (section 6) or, on .NET 11 only, `KillOnParentExit` (section 10).

Why this matters more for ocx than for typical wrappers: on Unix `ocx exec` calls `execvp` (`ocx@246863abc1d4:crates/ocx_package_manager/src/launch/child_process.rs:42-70`), so the pid the SDK holds is the tool (measured on 0.6.5: spawned pid 247577 printed `inner=247577`, `/proc/<pid>/comm` = `sh`). Killing it with bare `Kill()` leaves every process the tool started (a compiler's workers, a dev server's child) running. On Windows the same file spawns the tool and waits (`:72-100`, no job object, no `kill_on_drop` on that path), so killing `ocx.exe` alone leaves the tool running: tree kill is the only fix. Windows `ocx.exe` itself was not run under the fixture (no Windows main build); the Linux analogue was.

Two census exemplars for the idiom:

```csharp
// Tyrrrz__CliWrap@7dbc252fa773:CliWrap/Utils/Extensions/ProcessExtensions.cs:44-55   default entireProcessTree = true
public bool TryKill(bool entireProcessTree = true) { try { process.Kill(entireProcessTree); return true; } catch { return false; } }

// dotnet__aspire@af646baee1e8:src/Aspire.Hosting/Dcp/Process/ProcessUtil.cs:303-312   narrow catch
try { process.Kill(entireProcessTree); } catch (InvalidOperationException) when (process.HasExited) { }
```

The Aspire form is the better one: a catch-all `catch` hides `AggregateException` (partial tree kill) and needs a CA1031 suppression (SimpleExec carries `#pragma warning disable CA1031`, `adamralph__simple-exec@f80913246993:src/SimpleExec/Internal/ProcessExtensions.cs:117-119`). Measured: `Kill(true)` on an already-exited process threw nothing on net8, net10 (Linux) and net10 (Windows); the `when (process.HasExited)` filter is for the race, not the common case.

### 3. Caller cancel vs SDK timeout

Classify **after** the wait by asking which source fired. Do not merge the causes into one token and then guess.

```csharp
// WRONG (measured red): both causes surface as TaskCanceledException carrying the LINKED token.
using var linked = CancellationTokenSource.CreateLinkedTokenSource(ct);
linked.CancelAfter(timeout);
try { await p.WaitForExitAsync(linked.Token); }
catch (OperationCanceledException) { p.Kill(true); await p.WaitForExitAsync(); throw; }
//   caller:  TaskCanceledException, .CancellationToken == linked.Token   (not ct)
//   timeout: TaskCanceledException, .CancellationToken == linked.Token   (identical type)

// RIGHT (measured green)
using var linked = CancellationTokenSource.CreateLinkedTokenSource(ct);
if (timeout != Timeout.InfiniteTimeSpan) linked.CancelAfter(timeout);       // per attempt
try { await p.WaitForExitAsync(linked.Token).ConfigureAwait(false); }
catch (OperationCanceledException) when (linked.IsCancellationRequested)
{
    TryKillTree(p);
    await p.WaitForExitAsync(CancellationToken.None).ConfigureAwait(false);  // reap before throwing
    if (ct.IsCancellationRequested) throw new OperationCanceledException("ocx cancelled by caller", ct);
    throw new OcxTimeoutException(timeout /*, redactedArgv, stderrTail */);
}
```

Facts behind the pattern:

- `WaitForExitAsync(CancellationToken)` documents `OperationCanceledException` "stored into the returned task" ([Process.WaitForExitAsync](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process.waitforexitasync?view=net-10.0)); the concrete type observed on net8, net10 and Windows is `TaskCanceledException : OperationCanceledException`. `catch (TaskCanceledException)` for timeouts is an HttpClient-era habit and is wrong here: code that catches only `TaskCanceledException` would also catch caller cancellation.
- Microsoft's own multi-token example does the classification the same way, by checking which source `IsCancellationRequested` in the catch (`internalToken` = "Operation timed out", `externalToken` = "Cancelling per user request" then `externalToken.ThrowIfCancellationRequested()`) ([Cancellation in managed threads, "Listen to multiple tokens"](https://learn.microsoft.com/en-us/dotnet/standard/threading/cancellation-in-managed-threads)). Throwing `OperationCanceledException(msg, ct)` with the caller's token is what lets `Task` mark the awaiting task `Canceled` rather than `Faulted`; throwing a fresh token-less OCE does not.
- `CancelAfter`: "Subsequent calls ... will reset the delay"; throws `ArgumentOutOfRangeException` for `< -1`; countdown starts at the call ([CancelAfter](https://learn.microsoft.com/en-us/dotnet/api/system.threading.cancellationtokensource.cancelafter?view=net-10.0)). Measured on net8 and net10: accepted -1, 0, `int.MaxValue`, `int.MaxValue + 1`, `uint.MaxValue - 1` ms; `uint.MaxValue` ms threw `ArgumentOutOfRangeException`; `CancelAfter(TimeSpan.Zero)` cancels at once. Docs say the cap is `Int32.MaxValue` "(or `UInt32.MaxValue` - 1 on some versions)" and only net8/net10 were measured: validate `Timeout <= TimeSpan.FromDays(24)` to be safe on every supported runtime.
- Precedence: the check order `if (ct.IsCancellationRequested)` first means "caller wins" when both sources are signalled before the catch runs; this is the Python behaviour in effect, where a timeout is the only thing that raises `OcxTimeoutError`.
- Callback style is the alternative: `ct.Register(() => TryKill(p))` as in CliWrap (`Command.Execution.cs:180-187`, then `finally await processTask`, throwing `OperationCanceledException("...", forcefulCancellationToken)` at `:258-265`) and SimpleExec (`ProcessExtensions.cs:64-76`). The catch style keeps the kill on the awaiting continuation (no racing callback thread, no `Interlocked` double-check: SimpleExec needs a `SemaphoreSlim` plus `tcs.Task.Status` checks `:51-77`). The Contested section records the disagreement.
- Timeouts apply **per attempt**, retry multiplies the worst case: `attempts * timeout + sum(backoff)` (Python `RetryPolicy`, `python-sdk-digest.md` section 6).

### 4. The reap guarantee

- Cancelling a wait is not cancelling the process: `WaitForExitAsync(cts.Token)` + cancel leaves the child running (measured `HasExited=False` on net8, net10, Windows). Anything that does `Task.WhenAny(exit, Task.Delay(timeout))` and then returns has the same hole and also leaks the timer.
- "The process must never outlive the execution of this method": CliWrap waits with `CancellationToken.None` on purpose ("we don't want to leave a detached running process") and `finally await processTask` (`Tyrrrz__CliWrap@7dbc252fa773:CliWrap/Command.Execution.cs:196-204,251-255`). The CliWrap README states the consequence: after cancel `ExecuteAsync()` "will only complete after the kill signal has been fully settled by the operating system and the underlying process has exited" ([CliWrap Readme](https://github.com/Tyrrrz/CliWrap/blob/master/Readme.md)).
- SimpleExec breaks it: after `TryKill` it calls `tcs.TrySetCanceled(ct)` immediately (`ProcessExtensions.cs:69-72`), so `CancellationToken` cancellation can complete the task before the process is gone.
- Bound the reap and the pipe drain. Aspire's disposal ladder is `SIGINT` (or `CloseMainWindow` on Windows) then wait `s_processExitTimeout = 5 s` (`ProcessUtil.cs:20`), `Kill(true)`, wait 5 s again, swallow the second timeout "The process may have exited while inherited stdout/stderr pipes are still held open by descendants" (`:255-301`). The earlier audit measured the same hazard: a child that exits at once but leaves `sleep 5 &` holding stdout stalls `WaitForExitAsync` for 5001 ms with redirected stdout and 1 ms without (E7). Rule: after the kill, `await Task.WhenAny(readers, Task.Delay(5s))`, then close the streams.
- Process-wide child reaping can be broken from outside: dotnet/runtime [#114847](https://github.com/dotnet/runtime/issues/114847) (closed by the author, no maintainer reply, no fixed version) shows `WaitForExitAsync` hanging and ~2000 zombies on .NET 8.0.14 / Rocky 8.1 because a non-thread-safe PAM module saved and restored the SIGCHLD handler under concurrency, leaving an empty handler installed. The lesson is not "a .NET bug": a host that loads native code touching `SIGCHLD` disables the runtime's child reaper. The SDK must (a) never call `signal`/`sigaction` for `SIGCHLD`, (b) bound every post-kill wait so a missing exit notification becomes an `OcxException`, not a hang.
- Dispose the `Process` (`using var`), dispose the linked source, dispose the `CancellationTokenRegistration` if the callback style is used (`await using`).

### 5. What ocx does with signals, and the POSIX ladder

Measured on the installed `ocx 0.6.5` (Linux, fixture `ocx-probe`, `ocx index update 127.0.0.1:45871/foo` against a socket that accepts and never answers): SIGINT and SIGTERM each ended the process immediately (`returncode -2` / `-15` in Python terms, i.e. exit 130 / 143 as .NET reports it) with no cleanup output. So for ocx-owned commands a graceful phase has nothing to hand the signal to.

Source reading of main (`ocx@246863abc1d4`, not executed, no main binary was available):

- `launch::exec` on Unix `execvp`s the tool (`child_process.rs:42-70`): signals go straight to the tool, whose own handlers decide; Windows path: spawn, `child.wait()`, `propagate_exit_status` (`:72-100`), with no Ctrl handler of its own.
- `spawn_and_wait` (used by non-exec launches) installs tokio SIGINT/SIGTERM listeners and calls `child.start_kill()` on the direct child only (`:149-170`), i.e. a signal to `ocx` kills one child and orphans that child's descendants. Another reason for the SDK to tree-kill from outside.
- The ocx-generated Rust SDK runtime has the same shape as this recommendation: `interrupt_then_terminate` sends SIGINT via `/bin/sh -c 'kill -INT "$0"'`, waits `grace`, then `child.kill()`; "There is no interrupt to send on Windows, so the child is killed at once there"; and `// ponytail: only the direct child is ever killed` (`ocx@246863abc1d4:crates/ocx_sdkgen/templates/rust/spawn.rs:182-183,222-254`). A .NET SDK can improve on it with `Kill(true)`.
- The Python SDK: SIGTERM to the whole process group (`start_new_session=True`), `KILL_GRACE = 5.0`, then SIGKILL; on caller cancellation it sends SIGTERM and does not wait ("awaiting inside a cancellation handler is how a caller that asked to stop ends up hanging"); on Windows `TerminateProcess` only (`ocx-sdk-python@80136dde4162:src/ocx_sdk/_process.py:68-69,473-481,752-790,590-603`). .NET cannot give the child a new session/process group before exec on POSIX (`StartDetached` is .NET 11 and detaches stdio), so the tree is reached by `Kill(true)`.

Ladder for passthrough on POSIX (verified: cooperative child exits with its own code 42 in 3 ms; a SIGTERM-ignoring child is killed after the 1 s grace with exit 137 at 1085 ms):

```csharp
// net8/net10; fence the P/Invoke so Windows never touches it.
[LibraryImport("libc", EntryPoint = "kill", SetLastError = true)]
private static partial int sys_kill(int pid, int sig);          // SIGINT=2, SIGKILL=9, SIGTERM=15 on Linux and macOS

async Task StopAsync(Process p, TimeSpan grace)
{
    if (grace > TimeSpan.Zero && (OperatingSystem.IsLinux() || OperatingSystem.IsMacOS()))
    {
        _ = sys_kill(p.Id, 15);                                   // net11: p.Signal(PosixSignal.SIGTERM)
        using var g = new CancellationTokenSource(grace);
        try { await p.WaitForExitAsync(g.Token); return; }
        catch (OperationCanceledException) { }
    }
    TryKillTree(p);
    await p.WaitForExitAsync(CancellationToken.None);
}
```

`LibraryImport("libc", "kill")` is what Aspire (`ProcessUtil.cs:15`) and CliWrap (`Native/NativeMethods.cs:12`, with a `DllImport` twin for pre-.NET-7 targets) use. `libc` resolves on Linux (measured) and is used on macOS by both; macOS was not measured here.

Thresholds: 5 s grace (Python `KILL_GRACE`, Aspire `s_processExitTimeout`); CliWrap leaves it to the caller (README example: graceful at 7 s, forceful at 10 s). Make grace a public option with default 5 s only for passthrough and 0 for ocx-owned commands.

`CloseMainWindow()` is not a graceful stop for ocx: it returned `False` and the child kept running on Linux and on Windows (measured). It is a GUI-window API ([Process.Kill remarks](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process.kill?view=net-10.0)); Aspire uses it only as the Windows first rung for its own known targets.

### 6. Windows: interrupt strategies compared

Windows has no `SIGINT`/`SIGTERM` for a console child that the parent did not create a console for. All numbers below are from the Windows host (SDK 10.0.102, run through `cmd.exe /c` from `C:\Users\ecom\csharp-wintest\cancel`) unless marked docs.

| Strategy | Works? | Costs / limits | Verdict |
|---|---|---|---|
| `Kill(entireProcessTree: true)` | yes, immediate; child exit code `-1` | no cleanup; no child cooperation | **Default for everything on Windows** |
| `GenerateConsoleCtrlEvent(CTRL_BREAK_EVENT, pid)` with `ProcessStartInfo.CreateNewProcessGroup = true` | yes: handler child exited 130, handler-less child `0xC000013A` (`STATUS_CONTROL_C_EXIT`) | needs a console shared with the caller; `CreateNoWindow = true` defeated it (child still running after 4 s); returned `true` for a child **not** in its own group where nothing happened; `CreateNewProcessGroup` makes the child ignore Ctrl+C ([doc](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.processstartinfo.createnewprocessgroup?view=net-10.0)); `CTRL_C_EVENT` "cannot be limited to a specific process group" ([doc](https://learn.microsoft.com/en-us/windows/console/generateconsolectrlevent)); property is net10+ only (CS1061 on net8) | Opt-in only, always followed by a bounded wait and `Kill(true)` |
| CliWrap `Signaler.exe` helper | yes (attaches to the target's console and sends the event) | extracts an exe to `%TEMP%\CliWrap.Signaler.<guid>.exe` at runtime, spawns it, `WaitForExit(30 s)`, deletes it; net35 helper with `COMPLUS_OnlyUseLatestCLR` (`Native/WindowsSignaler.cs:12-65`, `Tyrrrz__CliWrap@7dbc252fa773`); temp-exec blocked by AppLocker/noexec temp/AV | Reject for default; reference only |
| `CloseMainWindow()` | no (returned false, child alive) | GUI only | Never |
| Job object `KILL_ON_JOB_CLOSE` | not an interrupt; containment | after-`Start` assignment races with early grandchildren; measured with a late-spawning grandchild (700 ms) and a re-parented one: both killed on `CloseHandle(job)`; `ocx_shim` creates the job **before** `CreateProcessW` with `PROC_THREAD_ATTRIBUTE_JOB_LIST` to avoid the race (`ocx_shim/src/main.rs:143-151,273-276`); nested jobs need Windows 8+ ([doc](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects)) | Optional hardening against host crash; on net11 prefer `KillOnParentExit` |

Why not default `CTRL_BREAK`: (a) an SDK is hosted in services/GUIs/test hosts without a console, where the call cannot reach anyone (that case was NOT measured; it is the documented "same console" rule); (b) the `true` return value is not delivery evidence; (c) the ocx.exe child would lose Ctrl+C. The ocx project's own SDK made the same call ("killed at once" on Windows).

### 7. Exit-status mapping

**What `Process.ExitCode` holds.**

- Unix: the child's exit code, or `128 + WTERMSIG` when the child was killed by a signal (`dotnet/runtime pal_process.c:739`, [source](https://raw.githubusercontent.com/dotnet/runtime/v10.0.0/src/native/libs/System.Native/pal_process.c)). Measured on net8 and net10: SIGINT 130, SIGTERM 143, SIGKILL 137, `Process.Kill()` 137. POSIX only promises "greater than 128" ([POSIX 2.8.2](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html)); `128+n` is the convention, not a guarantee, and exit codes above 255 wrap (`exit 300` prints 44 under `ocx exec` on 0.6.5).
- Windows: the process exit code as `int`; SDK `Kill()` leaves `-1` (`TerminateProcess(handle, -1)`, `Process.Windows.cs:100`, measured `-1`), unhandled Ctrl+Break `-1073741510` (`0xC000013A`). The ocx launcher/ocx.exe paths pass the child's full `i32` through on Windows (`ocx_util/src/child_process.rs:20-24`) and saturate to 255 when they must become a process exit code (`:26-31`).
- A tool that exits 137/143 is indistinguishable from a signal death (and from `ocx` being SIGKILLed): the SDK must know whether **it** killed the process (it does: it threw cancel/timeout) before interpreting a high code.

**The ocx table.**

- Main (`ocx@246863abc1d4:crates/ocx_exit/src/exit_code.rs:44-78`): `0 Success, 1 Failure, 64 UsageError, 65 DataError, 69 Unavailable, 74 IoError, 75 TempFail, 77 PermissionDenied, 78 ConfigError, 79 NotFound, 80 AuthError, 81 PolicyBlocked, 82 Unsupported` = 13; `RETIRED = [83,84,85,86,87]` ("once a consumer keyed on a value, reusing it changes the meaning"). Released v0.6.5 has 18 codes with `82 DirtyRcBlock` and 83-87 live. Same number, new meaning across one release.
- Generation source: the golden `crates/ocx_schema/tests/golden/errors.json`, `$defs.ExitCode["x-ocx-enum"]`, 13 rows each with `value`, `name`, `description`, `category` (checked at `origin/main`; also carries `ErrorDetail`, 505 rows each with its `exit_code`). The CLI does not print its grammar, so the input is a repo checkout at a pinned commit or `ocx-sdkgen --contract <dir>` (`csharp-audit/ocx-cli-contract.md` section 1). Generate `enum OcxExitCode { Success = 0, ... }` plus a table keyed by supported ocx version range; never hand-write numbers. The Python SDK's hand-written enum is already stale against main (17 members, `82 = DIRTY_RC_BLOCK`, 83-86 present, 87 missing; `_errors.py:28-51`).
- `error.kind` is a different partition: `81 PolicyBlocked` has kind `permission_denied`; branch on `exit_code`, then `error.kind`, then `detail`; never on `message` (`exit_code.rs:73`, `error_category.rs:53-65`).
- Fail closed: exit 0 with a report whose `status` is not a known success value is a failure; 17 command modes are `report_then_fail` (full report on stdout AND non-zero exit), parse stdout when exit != 0 only for those (`ocx-cli-contract.md` rows 5 and "report_then_fail").
- `index list <missing package>` exits 0 with a stderr warning on 0.6.5: "not found" is data, not an exit status.

```csharp
// WRONG: switch on remembered literals, and treat a passthrough exit as an ocx error.
if (r.ExitCode == 75) retry();                  // 75 from `ocx exec -- tool` is the TOOL's code
if (r.ExitCode == 82) askUserToUseForce();     // meant DirtyRcBlock on 0.6.5, Unsupported on main

// RIGHT: generated, versioned, open; passthrough is a different return type.
OcxExitCode c = OcxExitCodes.For(ocxVersion, r.ExitCode);   // returns OcxExitCode.Unknown for numbers not in this version's table
ChildExit child = await ocx.ExecAsync(args, ct);            // Code is a raw int; no mapping, no exception, no retry
```

**Passthrough set and the S2 smell.** `exec`, `run`, `package exec`, `package test` (and `launcher *`) forward the child's code unchanged; measured on 0.6.5: `exec -- sh -c 'exit 64'` gives 64 (UsageError's number), `kill -TERM $$` gives 143, missing command gives 65 with a long "searched" message. The Python SDK maps these through the same `_exit_error`, so a hosted build tool exiting 80 raises `AuthError` with an auth hint (digest smell S2, `python-sdk-digest.md` section 10; measured there with a fake `ocx` script). C#: separate result types, so the compiler enforces it.

### 8. The retry rule

- Retry only on `75 TempFail`: the exit table calls it "the ONLY code where automated retry is safe"; `69` (rerunning will not help), `81`, `82` ("retrying will not help"), `80` auth, `65` data never (`exit_code.rs`, `ocx-cli-contract.md` rows 47-53, rule 7).
- Defaults: 3 attempts, backoff 1.0 s x2.0 capped at 30 s, full jitter; per-attempt timeout; `Task.Delay(delay, ct)` so cancel during backoff throws the caller's OCE (Python `RetryPolicy`, `_retry.py:27-48`).
- Never for mutating commands by default (`login`, `clean`, `package push`, `description_push`, `sign`, `attest`, `copy`, `announce`, `claim`, `cascade_repair`; Python measured 10 call sites): "a timed-out `login` exits 75 not 80 and resending credentials is the class of error" (`python-sdk-digest.md` section 6).
- Never for `exec`/`run`/`package exec`/`package test` children (Python `_client.py:1308`, `retry=None`): their 75 is the tool's.
- Never for `OcxTimeoutException` or cancellation: the Python classifier is `isinstance(err, OcxProcessError) and err.exit_code in retry_on` and timeouts are not `OcxProcessError`.
- Measured (fixture, `retry`): a blind "75 means retry" loop over a passthrough child exiting 75 ran 3 times (red); a policy that excludes passthrough ran it once and returned 75 (green); a non-passthrough 75 was retried to the bound of 3.

### 9. .NET 10 removed the default SIGTERM handler

- On Unix the runtime no longer installs a default SIGTERM handler; on Windows it no longer handles `CTRL_SHUTDOWN_EVENT` and `CTRL_CLOSE_EVENT`. `AppDomain.ProcessExit` and `AssemblyLoadContext.Unloading` "aren't raised". Mitigation in the doc: `PosixSignalRegistration.Create(PosixSignal.SIGTERM, ...)` or generic-host lifetime ([breaking change](https://learn.microsoft.com/en-us/dotnet/core/compatibility/core-libraries/10.0/sigterm-signal-handler)).
- Measured (same dll, differing runtime): child sent SIGTERM, exit code 143 on both; `ProcessExit` handler ran on net8 (`True`) and did not on net10 (`False`). Exit code is unchanged, side effects are not.
- Consequences for the SDK: (1) a host in a container receives SIGTERM, dies at once on net10, and any ocx child it started survives (re-parented to pid 1). Cleanup must not depend on `ProcessExit` or finalizers: document that hosts should register SIGTERM (or use `IHostApplicationLifetime`) and cancel in-flight SDK calls; on .NET 11 add opt-in `KillOnParentExit` for the long-lived `exec` case. (2) The SDK registers no `PosixSignalRegistration`, `Console.CancelKeyPress` or `ProcessExit` handler of its own: library-installed process-wide handlers collide with the host's. (3) When the child is a .NET tool (an `ocx exec -- dotnet ...`), SIGTERM no longer runs its `ProcessExit` either: do not assume graceful SIGTERM shutdown semantics for .NET 10 tools.

### 10. .NET 11 RC1 surface

All of this is RC1 (SDK `11.0.100-rc.1.26425.128`, GA Nov 2026); shapes may still change. Measured on Linux with a nested `global.json` (fixture `net11`):

| API | Behaviour measured |
|---|---|
| `Process.Signal(PosixSignal)` | `SIGTERM` returned true, `WaitForExitStatusAsync` gave `ExitCode=143 Signal=SIGTERM Canceled=False`; `SIGINT` gave 130 / `SIGINT` |
| `ProcessExitStatus { ExitCode, Signal?, Canceled }` | distinguishes a signal death from an exit code |
| `Process.RunAsync(file, args, silent, cancellationToken)` | on cancel **returned** after 501 ms: `ExitCode=137 Signal=SIGKILL Canceled=True` (no throw), and a grandchild `sleep` survived (alive after 1.5 s): it kills only the direct child |
| `Process.RunAndCaptureTextAsync(file, args, ct)` | cancel **threw** `OperationCanceledException` |
| `ProcessStartInfo.KillOnParentExit = true` (Linux) | parent SIGKILLed: child dead after 1.5 s; control (`false`): child alive |

Documentation disagreement as of 2026-10-10: [What's new in .NET 11 libraries](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/libraries) says `KillOnParentExit` is "(Windows only)"; the [devblog](https://devblogs.microsoft.com/dotnet/process-api-improvements-in-dotnet-11/) says Windows (job object with `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`, grandchildren too), Linux and Android (`PR_SET_PDEATHSIG`, tied to the spawning thread), macOS unsupported; Cake throws `PlatformNotSupportedException` outside Windows/Linux/Android (`cake-build__cake@08885933e936:src/Cake.Core/IO/ProcessRunner.cs:231-248`). The devblog's own text is internally inconsistent about the preview that shipped it (Preview 4 call-to-action vs per-API Preview 4/5 attributes). `Process.Signal` is net11 only: on net10 it does not compile.

Fence with `#if NET11_0_OR_GREATER` exactly as Cake does for `KillOnParentExit`, `StartDetached`, `InheritedHandles` (`ProcessRunner.cs:89,179-181,216-255`). Do not multi-target `net11.0` in the default build and do not pin an RC SDK in `global.json` for the SDK package; do it only in an opt-in CI leg (Cake pins `11.0.100-rc.1.26425.128`, as the earlier audit found).

### 11. Verified on the toolchain

Fixture root: `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-process-cancellation-and-exit/`. Sub-fixtures: `net10/` (parent `global.json` 10.0.401), `net8/` (own `global.json` 8.0.425, `rollForward: disable`), `net11/` (own `global.json` 11.0.100-rc.1.26425.128), `analyzers/{red,green,red2,green2}`, `grep/{bad,good}`, `ocx-probe/`, raw outputs in `evidence/`. Windows copy: `C:\Users\ecom\csharp-wintest\cancel\`.

Commands (T = `/home/mherwig/.cache/research-lang/dotnet-tools/run.sh`):

```
cd $F/net10 && $T dotnet build -c Release --nologo -v q && $T dotnet bin/Release/net10.0/fx.dll test all
cd $F/net8  && $T dotnet build -c Release --nologo -v q && $T dotnet bin/Release/net8.0/fx.dll  test all
cd $F/net11 && $T dotnet build -c Release --nologo -v q && $T dotnet bin/Release/net11.0/n11.dll ; $T dotnet bin/Release/net11.0/n11.dll kop
cmd.exe /c "cd /d C:\Users\ecom\csharp-wintest\cancel && dotnet build -c Release --nologo -v q && dotnet bin\Release\net10.0\fx.dll test all"
cd $F/analyzers/red && $T dotnet build --nologo -v q      # then red2, green, green2
```

"PASS RED" means the planted defect was observed; "PASS GREEN" means the fixed twin behaved. Results (net10 Linux = net8 Linux = net10 Windows on the first nine lines):

| # | Pair | Red observed | Green observed |
|---|---|---|---|
| V1 | grandchild after kill (child spawns `sleep`) | `Kill()` : `alive=True` after 2 s (Linux net10, Linux net8, Windows net10) | `Kill(true)` : `alive=False` (all three) |
| V2 | caller-cancel vs timeout | `TaskCanceledException vs TaskCanceledException`; `carriesCallerToken=False` (all three) | caller: `OperationCanceledException` with caller token; timeout: `OcxTimeoutException` not an OCE (all three) |
| V3 | passthrough child exits 75 | `attempts=3 code=75` (blind retry) (all three) | `attempts=1 code=75` (passthrough excluded); non-passthrough `attempts=3` (all three) |
| V4 | `.NET 11 KillOnParentExit` | `false`: `child alive after 1.5 s = True` after parent SIGKILL | `true`: `alive = False` (Linux RC1) |
| V5 | RS0030 bare `Kill()` + CA1068 | `analyzers/red`: `error RS0030: The symbol 'Process.Kill()' is banned in this project: Use Kill(entireProcessTree: true)...`; `error CA1068: ... should take CancellationToken as the last parameter` | `analyzers/green`: `0 Error(s)` |
| V6 | CA2016 token not forwarded | `analyzers/red2`: three `error CA2016: Forward the 'ct' parameter to the 'WaitForExitAsync' method or pass in 'CancellationToken.None' explicitly...` (also `Delay`, `ReadToEndAsync`) | `analyzers/green2`: `0 Error(s)` (explicit `CancellationToken.None` accepted) |
| V7 | `rg` patterns (incl. the `ChildExit` file check, `grep/bad/Pass.cs`) | `grep/bad/Bad.cs`: bare `.Kill()` line 2; unfiltered `catch (OperationCanceledException)` line 2; `code == 75` line 3 and `exitCode is 80` line 4; OCE without token line 6; `OcxTimeoutException : OperationCanceledException` line 7; `taskkill` line 8; `net11` in `Bad.csproj` | the same patterns print nothing on `grep/good` |

Platform asymmetry (one red, one not): "Kill(true) on a root that already exited, grandchild re-parented": Linux `alive=True` (red, `PASS RED  Linux: Kill(true) cannot reach...`), Windows `alive=False` (INFO line: handle still held, `IsParentOf` matches stale `ParentProcessId`).

Informational measurements (no pair): Linux net10/net8: SIGINT -> 130, SIGTERM -> 143, SIGKILL -> 137, `Process.Kill()` -> 137; ladder cooperative child exit 42 in 2-3 ms, SIGTERM-ignoring child killed at 1082-1146 ms with 137; `Kill(true)` on an exited process: no exception; Windows: `CTRL_BREAK` + `CreateNewProcessGroup`: handler child 130, handler-less `-1073741510` (`C000013A`), `CreateNoWindow=true`: not exited in 4 s, child not in own group: `sent=True` but nothing happened and the parent's `CancelKeyPress` count 0, `Process.Kill()` exit code `-1`, job object: re-parented and late-spawned grandchild both dead after `CloseHandle(job)`; `CloseMainWindow()` false on Linux and Windows; ocx 0.6.5: SIGINT/SIGTERM during a hung network call kill ocx at once, `ocx exec` keeps pid (`inner=<same pid>`). net8 build error: `CS1061 'ProcessStartInfo' does not contain a definition for 'CreateNewProcessGroup'`.

Not verified: macOS (everything), Windows `ocx.exe` itself, console-less Windows hosts, arm64 (both hosts here are x64), the main-branch ocx binary (source reading only), whether a job-object assignment race is ever lost against real `ocx.exe` startup.

## Normative guidance candidates

1. **Every kill of an ocx child is `Kill(entireProcessTree: true)`, never bare `Kill()`.** Rationale: bare `Kill()` orphans grandchildren (V1), and on Unix the ocx pid is the tool. Verify: add to `BannedSymbols.txt` the line `M:System.Diagnostics.Process.Kill();Use Kill(entireProcessTree: true)`, reference `Microsoft.CodeAnalysis.BannedApiAnalyzers` 4.14.0 with `<AdditionalFiles Include="BannedSymbols.txt" />`, and set `dotnet_diagnostic.RS0030.severity = error` in `.editorconfig` (V5: red `error RS0030`, green 0 errors); backup: `rg -n -e '\.Kill\(\s*\)' src` prints nothing.
2. **Reap before you throw: after any kill, `await process.WaitForExitAsync(CancellationToken.None)` (bounded by a 5 s reap timeout) before the method returns or throws.** Rationale: `Kill` is asynchronous and cancelling the wait does not stop the child (measured). Verify: reading heuristic "every `Kill`/`TryKillTree` call site is followed in the same block by a `WaitForExitAsync(CancellationToken.None)`"; `rg -n -e 'TryKillTree\(' -e 'Kill\(entireProcessTree' src` and inspect that each hit has the await within 3 lines (`rg -n -A3 ...`).
3. **Every public async method takes `CancellationToken cancellationToken = default` as the last parameter and forwards it; intentional non-forwarding is written `CancellationToken.None`.** Rationale: 5 of 10 wrappers have no token on the spawn API; CA2016 distinguishes forgotten from intentional (V6). Verify: `.editorconfig` with `dotnet_diagnostic.CA2016.severity = error` and `dotnet_diagnostic.CA1068.severity = error`; `dotnet build -warnaserror` (V5/V6 red/green).
4. **Caller cancellation surfaces as `OperationCanceledException` whose `CancellationToken` is the caller's token.** Rationale: only that lets the awaiting `Task` become `Canceled` and callers filter `when (e.CancellationToken == ct)`. Verify: `rg -n -P 'new OperationCanceledException\((?![^;]*\b(ct|cancellationToken|token)\b)' src` prints nothing (V7); plus a unit test asserting `oce.CancellationToken == callerCts.Token` (V2 green).
5. **An SDK timeout is `OcxTimeoutException : OcxException`, never an OCE, `TaskCanceledException` or BCL `TimeoutException`.** Rationale: a catch of OCE must mean "the caller cancelled" (V2 red shows the merged form). Verify: `rg -n -P 'class OcxTimeoutException\b[^{]*:\s*+(?!OcxException\b)' src` prints nothing (V7); public API snapshot test lists the base type.
6. **Classify with a per-attempt linked source and an exception filter: `catch (OperationCanceledException) when (linked.IsCancellationRequested)`, then `if (ct.IsCancellationRequested)` first.** Rationale: a bare catch swallows cancellation from other sources and cannot tell the causes apart; the caller wins ties. Verify: `rg -n -P 'catch\s*\(\s*OperationCanceledException[^)]*\)(?!\s*when)' src` prints nothing or each hit is justified in a comment (V7).
7. **Validate `Timeout` once: `Timeout.InfiniteTimeSpan` or `TimeSpan.Zero < t <= TimeSpan.FromDays(24)`; call `CancelAfter` only for finite values.** Rationale: `CancelAfter(TimeSpan)` throws `ArgumentOutOfRangeException` above the runtime-dependent cap (measured on net8 and net10: `uint.MaxValue` ms throws; docs say the cap varies by version, `Int32.MaxValue` ms = 24.8 days is the safe floor), and `0` cancels at once. Verify: unit tests at `-2 ms`, `0`, `24 d`, `25 d`; `rg -n 'CancelAfter\(' src` shows one call site.
8. **Grace is a property of the command class: ocx-owned commands `GracePeriod = TimeSpan.Zero` (straight to `Kill(true)`); passthrough on POSIX default 5 s of SIGTERM then `Kill(true)`; Windows always 0.** Rationale: ocx 0.6.5 dies on the signal anyway (measured), passthrough tools may handle it, Windows has no safe interrupt. Verify: reading heuristic against the `OcxOptions` defaults plus a test with the `term-ignorer` role: exit 137 at about grace + 100 ms, cooperative role exit code preserved.
9. **POSIX signals go through one `[LibraryImport("libc", EntryPoint = "kill")]` declaration fenced by `OperatingSystem.IsLinux() || OperatingSystem.IsMacOS()`; on .NET 11 use `Process.Signal(PosixSignal)` behind `#if NET11_0_OR_GREATER`.** Rationale: net8/net10 have no send-signal API; the P/Invoke is AOT/trim-safe with `LibraryImport`. Verify: `rg -c -e 'LibraryImport\("libc"' src` equals 1; `rg -n -e '\.Signal\(' src` hits all sit inside `#if NET11_0_OR_GREATER` (reading); `dotnet build -f net8.0` succeeds.
10. **Windows interrupt is opt-in only: `CTRL_BREAK_EVENT` requires `#if NET10_0_OR_GREATER`, `CreateNewProcessGroup = true`, `CreateNoWindow = false`, a host with a console, and is always followed by a bounded wait and `Kill(true)`. Never trust `GenerateConsoleCtrlEvent`'s return value as delivery.** Rationale: finding 6 (returns true when nothing was delivered; CreateNoWindow defeats it; net8 CS1061). Verify: `rg -n -e 'GenerateConsoleCtrlEvent' src` hits one file; `rg -n -e 'CreateNewProcessGroup' src` hits are inside `#if NET10_0_OR_GREATER`; `dotnet build -f net8.0` fails if not.
11. **No runtime-extracted helper executables and no shell-outs to kill processes.** Rationale: CliWrap's `%TEMP%` signaler trips AV/AppLocker; `taskkill`/`pkill` re-introduce quoting and PATH hazards. Verify: `rg -n -w -e taskkill -e pkill -e killall src` and `rg -n -e 'GetTempPath\(\)[^;]*\.exe' src` print nothing (V7 for the first).
12. **The SDK installs no process-wide signal or exit handler (`PosixSignalRegistration`, `Console.CancelKeyPress`, `AppDomain.ProcessExit`, `SIGCHLD` via P/Invoke).** Rationale: .NET 10 removed the default SIGTERM handler and hosts own signals; a SIGCHLD reset hangs `WaitForExitAsync` (runtime #114847). Verify: `rg -n -e 'PosixSignalRegistration' -e 'CancelKeyPress' -e 'ProcessExit' -e 'sigaction' src` prints nothing; docs section tells hosts to cancel in-flight calls on SIGTERM.
13. **Pipe drain after a kill or exit is bounded (5 s) and closes the streams afterwards.** Rationale: a daemonising grandchild holding stdout stalls `WaitForExitAsync` 5001 ms (earlier audit E7), Aspire uses the same 5 s. Verify: fixture like `child` with a `sleep 5 &` writer: run with a 1 s drain bound and assert return under 2 s.
14. **Exit-status numbers are generated, never typed: `OcxExitCode` and `OcxExitCodes.For(version, int)` come from `errors.json` `$defs.ExitCode["x-ocx-enum"]` at a pinned ocx commit; unknown numbers map to `Unknown(int)`; the table is keyed by ocx version because `82` changed meaning between 0.6.5 and main.** Rationale: hand-written tables go stale (the Python enum is already stale). Verify: `rg -n -P '\b(code|exitCode|ExitCode)\s*(==|!=|is)\s*\d{2,3}\b' src` prints nothing outside the generated file (V7); generator drift test: regenerate and `git diff --exit-code src/Generated/`.
15. **Branch on `exit_code`, then `error.kind`, then `detail`; never on `message`.** Rationale: `81 PolicyBlocked` has kind `permission_denied`; messages are prose. Verify: `rg -n -e 'Message\.(Contains|StartsWith)' src` prints nothing in mapping code.
16. **Passthrough commands (`exec`, `run`, `package exec`, `package test`, `launcher *`) return `ChildExit(int Code)`; no mapping to `OcxExitCode`, no exception on non-zero, no retry.** Rationale: the child's 64 equals `UsageError`, its 80 equals `AuthError` (S2). Verify: `rg -l -e 'ChildExit' src | xargs -r rg -n -e 'OcxExitCode' -e 'OcxProcessException'` prints nothing (files that define or use `ChildExit` never touch the mapper; red/green run on `grep/bad/Pass.cs` vs `grep/good/Pass.cs`).
17. **An exit status the SDK caused is never reported as a process failure.** If the SDK killed the tree, throw cancel/timeout; do not hand `137`/`-1`/`143` to the exit mapper. Rationale: SDK kill -> 137 (POSIX) or -1 (Windows). Verify: test: cancel mid-run, assert OCE and no `OcxProcessException`.
18. **Retry only on exit `75`, only for non-mutating ocx-owned commands, bounded (3 attempts, 1 s x2 cap 30 s, full jitter), with `Task.Delay(delay, ct)`; never for passthrough, mutating commands, timeouts or cancellation.** Rationale: V3; a timed-out `login` exits 75. Verify: `rg -n -e '== *75\b' -e 'TempFail' src` hits only the retry classifier file; test matrix row per mutating command asserting one attempt.
19. **`index list <missing>` exit 0 is data; do not translate it to NotFound.** Rationale: measured on 0.6.5. Verify: contract test against the pinned ocx binary.
20. **Do not use `Process.RunAsync`/`RunAndCaptureTextAsync`/`WaitForExitStatusAsync`/`KillOnParentExit` outside `#if NET11_0_OR_GREATER`; the default build targets net8.0;net10.0 and does not pin an RC SDK.** Rationale: RC1 shapes may change, `RunAsync` returns instead of throwing and orphans grandchildren (measured). Verify: `grep -rnE --include='*.csproj' --include='*.props' 'net11' .` prints nothing for the shipping projects (V7); `rg -n -e 'RunAsync\(' -e 'ProcessExitStatus' -e 'KillOnParentExit' -e 'StartDetached' src` hits are inside `#if NET11_0_OR_GREATER` (reading); `dotnet build -f net10.0` passes.
21. **Do not call `CloseMainWindow()` for graceful stop.** Rationale: false on console children (measured). Verify: `rg -n -e 'CloseMainWindow' src` prints nothing.
22. **Every termination mechanism has a named fixture test that watches the red twin fail** (grandchild + `Kill()`, merged-token timeout, passthrough 75 retried, SIGTERM-ignorer, handler-less Ctrl+Break), run on Linux and Windows CI legs, arm64 included when a runner exists. Rationale: the Python SDK ties each mechanism to a named test; these defects only show on a real process. Verify: reviewer greps the test names from this list; `dotnet test --filter "FullyQualifiedName~Termination"` lists at least five tests per OS.

## AI-agent angle

What an LLM characteristically gets wrong here, with the smallest mechanical check:

| # | Mistake | Why it compiles/passes | Check |
|---|---|---|---|
| 1 | `p.Kill()` or `p.Kill(true)` positional, expecting "stop the command" | Training data is dominated by the one-argument form | RS0030 ban line above; `rg -n -e '\.Kill\(\s*\)' src` |
| 2 | `using var cts = new CancellationTokenSource(timeout); catch (OperationCanceledException) => throw new TimeoutException()` or the same with `TaskCanceledException` | Works for HttpClient; here it relabels caller cancellation as a timeout | rule 6 `rg` (unfiltered catch) and rule 4 `rg` |
| 3 | `await Task.WhenAny(exited, Task.Delay(timeout))` then `Kill()` with no wait | Looks like a timeout; leaks the timer and the process | rule 2 reading heuristic; `rg -n 'Task\.WhenAny\(' src` near `WaitForExit` |
| 4 | Sync `WaitForExit(int)` + `Kill()` inside `async` code | .NET Framework idiom | ban `M:System.Diagnostics.Process.WaitForExit(System.Int32)` and `M:System.Diagnostics.Process.WaitForExit()` in `BannedSymbols.txt` (same RS0030 mechanism, red/green by analogy to V5; the two extra lines were not run separately) |
| 5 | `taskkill /T /F /PID` or `pkill -P` via a shell, "because Kill(true) is not available" | Framework-era workaround for net461 | `rg -n -w -e taskkill -e pkill -e killall src` |
| 6 | Hallucinated APIs: `Process.Terminate()`, `Process.Interrupt()`, `Process.SendSignal`, `ProcessStartInfo.CreateProcessGroup`, `Process.Signal` used on a net10 target | `Signal` is net11 RC1; `CreateNewProcessGroup` is net10+ only | `dotnet build -f net8.0` and `-f net10.0` (CS1061); fence rule 20 |
| 7 | `CloseMainWindow()` as "graceful" | In Process.Kill docs | rule 21 `rg` |
| 8 | `GenerateConsoleCtrlEvent(CTRL_C_EVENT, pid)` P/Invoke: returns true, delivers nothing for a group id | The doc says CTRL_C cannot be limited to a group; `true` is not delivery | rule 10 `rg`; reading heuristic "no code path treats the return value as success" |
| 9 | Treating any non-zero exit as an ocx error, including `exec`; or `catch (Win32Exception)` = "ocx failed" | Python SDK smell S2 imported | rule 16 reading heuristic (passthrough file mentions no `OcxExitCode`) |
| 10 | Typing the table from memory: `case 83: ... ReferrersUnsupported`, or `82 = DirtyRcBlock` | 0.6.5 and main differ; 83-87 retired | rule 14 numeric-literal `rg`; generator drift test |
| 11 | Retrying everything with Polly's default `HandleResult(r => r.ExitCode != 0)` | Generic resilience advice | rule 18 `rg -n -e 'Polly' -e 'WaitAndRetry' src` hits only the retry module |
| 12 | Installing `Console.CancelKeyPress`/`ProcessExit` in the library to "clean up children" | Works on net8; silently absent for SIGTERM on net10 | rule 12 `rg` |
| 13 | `catch { }` around `Kill`, hiding `AggregateException` (partial tree kill) | CliWrap/SimpleExec do it | `dotnet_diagnostic.CA1031.severity = warning`; `rg -n -P 'catch\s*(\(Exception\))?\s*\{\s*\}' src` |
| 14 | Treating `HasExited`/`WaitForExit` after `Kill(true)` as "tree gone" and asserting on grandchildren immediately | Docs say the opposite | tests assert via bounded polling, `rg -n 'Thread.Sleep' tests` flagged |
| 15 | Reporting `ExitCode == 137/143/-1` as a tool failure after the SDK itself killed it | Looks like data | rule 17 test |
| 16 | `DllImport("kernel32")`/`libc` copied without `OperatingSystem` fencing, or `LibraryImport` on a netstandard2.0 target | netstandard2.0 has no `LibraryImport`/`Kill(bool)` | `dotnet build -f` per TFM; rule 9 |

## Contested / evolving

- **SIGINT or SIGTERM for the cooperative rung.** The ocx Rust SDK uses SIGINT ("the way a terminal's Ctrl-C does"), the Python SDK SIGTERM to the process group, CliWrap and Aspire SIGINT. This artifact recommends SIGTERM for parity with the sibling Python SDK because the C# SDK mirrors it; a tool that only reacts to Ctrl-C (some REPLs, `npm`) argues for SIGINT. Trend: .NET 11 `Process.Signal` makes the choice per call cheap. As of 2026-10, unsettled; make the signal an option with SIGTERM default.
- **`Register`-callback kill vs catch-based kill.** CliWrap and SimpleExec use `ct.Register`; this artifact prefers the catch-based form for single-threaded control flow and a fixture that watches it. Both pass the V1-V3 pairs if the reap rule holds; SimpleExec's variant fails the reap rule.
- **Job object by default on Windows.** ocx's own shim uses one; here it is optional because `Kill(true)` already reaches re-parented grandchildren while the `Process` handle is held (measured) and the post-`Start` assignment race cannot be closed before .NET 11. Trend: on .NET 11 `KillOnParentExit` (job object born with the process) becomes the right default for `exec`, once GA and once macOS is addressed.
- **`KillOnParentExit` platform support.** Learn what's-new (Windows only) vs devblog (Windows, Linux, Android) vs Cake (throws elsewhere); Linux works on RC1 (measured). Re-check at GA (Nov 2026).
- **`Process.RunAsync` cancel semantics.** Returns `Canceled = true` on RC1 for `RunAsync` but throws for `RunAndCaptureTextAsync`; does not kill the tree. May change before GA; a third-party post asserts the "no throw" behaviour from a macOS RC1 run, which this artifact reproduced on Linux.
- **Hosts and SIGTERM on .NET 10.** Removal of the default handler (June 2025 doc) pushes lifetime to hosting code; trend is "library does nothing, host registers". Docs recommend `UseConsoleLifetime`/generic host.
- **Timeout type.** Some SDKs throw BCL `TimeoutException`; HttpClient historically throws `TaskCanceledException` for timeouts (and .NET 5+ wraps `TimeoutException` as inner). This artifact picks a dedicated `OcxTimeoutException` (Python parity) so `catch (OperationCanceledException)` stays unambiguous; open question for the SDK API review is whether it should also derive from `TimeoutException` for BCL-idiom callers (that does not conflict with the OCE rule).
- **ocx exit table stability.** 82 was reused "before any contract baseline exists"; main's `RETIRED` list promises no more reuse. Until a stable contract release, key every table by version.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process.kill?view=net-10.0 | `Process.Kill` reference, both overloads | net5+ / net10 docs updated 2026-09 | Exceptions, async-kill note, "descendants not reflected in HasExited", skipped-for-permissions |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/core-libraries/10.0/sigterm-signal-handler | Breaking change: no default SIGTERM handler | .NET 10 (2025-06) | Exact new behaviour, `ProcessExit` not raised, mitigation |
| https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.processstartinfo.createnewprocessgroup?view=net-10.0 | `CreateNewProcessGroup` property | net10 / net11 only | Side effect: child Ctrl+C disabled; Windows only |
| https://learn.microsoft.com/en-us/windows/console/generateconsolectrlevent | Win32 `GenerateConsoleCtrlEvent` | stable Win32 | CTRL_C vs CTRL_BREAK, same-console rule, group semantics |
| https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects | Job object overview | 2025-07 | `KILL_ON_JOB_CLOSE`, nested jobs (Win8+), breakaway |
| https://learn.microsoft.com/en-us/dotnet/api/system.threading.cancellationtokensource.cancelafter?view=net-10.0 | `CancelAfter` overloads and limits | all supported TFMs | Reset semantics, `ArgumentOutOfRange` bounds |
| https://learn.microsoft.com/en-us/dotnet/standard/threading/cancellation-in-managed-threads | Cooperative cancellation guide incl. linked tokens | 2026-03 refresh | Internal-timeout vs external-token classification pattern |
| https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process.waitforexitasync?view=net-10.0 | `WaitForExitAsync(CancellationToken)` | net5+ | OCE stored in task; cancelling the wait is not cancelling the process |
| https://github.com/dotnet/runtime/issues/114847 | WaitForExitAsync hangs / zombies on Linux | 2025-04, .NET 8.0.14 | Caused by native code resetting SIGCHLD; closed by author; lesson for bounded reaping |
| https://devblogs.microsoft.com/dotnet/process-api-improvements-in-dotnet-11/ | .NET 11 Process API post | 2026-05, previews 4-5 | `Signal`, `ProcessExitStatus`, `KillOnParentExit` mechanics (job object, `PR_SET_PDEATHSIG`) |
| https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/libraries | What's new in .NET 11 libraries | 2026-09 | Process API list; says `KillOnParentExit` Windows-only (conflict) |
| https://raw.githubusercontent.com/dotnet/runtime/v10.0.0/src/libraries/System.Diagnostics.Process/src/System/Diagnostics/Process.Unix.cs | `KillTree` Unix implementation | v10.0.0 | SIGSTOP, snapshot, SIGKILL, recurse; exited root unreachable |
| https://raw.githubusercontent.com/dotnet/runtime/v10.0.0/src/libraries/System.Diagnostics.Process/src/System/Diagnostics/Process.Win32.cs | `KillTree`, `IsParentOf` Windows | v10.0.0 | Why Windows still reaches re-parented grandchildren |
| https://raw.githubusercontent.com/dotnet/runtime/v10.0.0/src/libraries/System.Diagnostics.Process/src/System/Diagnostics/Process.Windows.cs | `Kill()` = `TerminateProcess(handle, -1)`; creation flags | v10.0.0 | Source of the `-1` exit code and `CREATE_NEW_PROCESS_GROUP` wiring |
| https://raw.githubusercontent.com/dotnet/runtime/v10.0.0/src/native/libs/System.Native/pal_process.c | Native wait status decode | v10.0.0 | `128 + WTERMSIG` at line 739 |
| https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html | POSIX shell command language, 2.8.2 exit status | POSIX 2024 | ">128 for signals" is a convention, 126/127 reserved |
| https://github.com/Tyrrrz/CliWrap/blob/master/Readme.md | CliWrap README, cancellation section | current | Graceful vs forceful tokens, "completes only after the process has exited" |
| /home/mherwig/.cache/research-lang/exemplars/csharp/Tyrrrz__CliWrap (@7dbc252fa773) `CliWrap/Command.Execution.cs`, `Utils/Extensions/ProcessExtensions.cs`, `Native/WindowsSignaler.cs` | Real CliWrap source | master at clone | Register + reap pattern; Windows Signaler deployment |
| /home/mherwig/.cache/research-lang/exemplars/csharp/dotnet__aspire (@af646baee1e8) `src/Aspire.Hosting/Dcp/Process/ProcessUtil.cs` | Aspire DCP process disposal ladder | clone | 5 s ladder, SIGINT/CloseMainWindow, narrow Kill catch |
| /home/mherwig/.cache/research-lang/exemplars/csharp/adamralph__simple-exec (@f80913246993) `src/SimpleExec/Internal/ProcessExtensions.cs` | SimpleExec cancellation | clone | Tree-by-default kill; reap-less `TrySetCanceled` |
| /home/mherwig/.cache/research-lang/exemplars/csharp/madelson__MedallionShell (@e45f1f6ffd4c) `MedallionShell/ProcessHelper.cs` | Medallion kill | last commit 2023-04 | Bare `Kill()` precedent (anti-example) |
| /home/mherwig/.cache/research-lang/exemplars/csharp/cake-build__cake (@08885933e936) `src/Cake.Core/IO/ProcessRunner.cs` | Cake NET11 fencing | clone | `#if NET11_0_OR_GREATER` precedent; `KillOnParentExit` platform switch |
| https://github.com/ocx-sh/ocx (local `~/dev/ocx` @246863abc1d4 `origin/main`): `crates/ocx_exit/src/exit_code.rs`, `crates/ocx_schema/tests/golden/errors.json`, `crates/ocx_package_manager/src/launch/child_process.rs`, `crates/ocx_sdkgen/templates/rust/spawn.rs`, `crates/ocx_util/src/child_process.rs`, `crates/ocx_shim/src/main.rs` | ocx's own exit table, execvp/spawn behaviour, Rust SDK ladder, shim job object | main 2026-10 | Ground truth for the table, the generation source and process shape |
| /home/mherwig/dev/ocx-sdk-python (@80136dde4162) `src/ocx_sdk/_process.py`, `_errors.py` | Python SDK being mirrored | main | Kill ladder (`KILL_GRACE = 5.0`), timeout vs cancel types, retry classifier |
| /home/mherwig/dev/grimoire-lore/.agents/worktrees/csharp/.agents/research/csharp-audit/{ocx-cli-contract,python-sdk-digest,exemplar-cli-wrappers-and-sdks}.md | Earlier audit artifacts | 2026-10-10 | Exit census, S2 smell, tree-kill census, E3/E7 fixtures |
| /home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-process-cancellation-and-exit/evidence/ | Raw outputs of this artifact's runs | 2026-10-10/11 | Reproduce V1-V7 (`linux-net10.txt`, `linux-net8.txt`, `windows-net10.txt`, `linux-net11-rc1.txt`) |
