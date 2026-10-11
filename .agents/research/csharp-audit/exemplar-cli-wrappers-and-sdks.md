---
title: How real .NET libraries wrap external processes and shape SDK public APIs (numbers-first audit)
agent: research-lang audit subagent (axis - CLI wrappers and SDK shapes)
model: claude-sonnet-5-5 (sonnet; measurement and enumeration, no ruleset decisions)
scope: 14 exemplar clones under /home/mherwig/.cache/research-lang/exemplars/csharp (CliWrap, simple-exec, MedallionShell, pulumi-dotnet, testcontainers-dotnet, nuke, cake, aspire/Dcp slice, PowerShell NativeCommandProcessor slice, octokit.net, stripe-dotnet, openai-dotnet, anthropic-sdk-csharp, azure-sdk-for-net/Azure.Core slice) plus 5 runnable fixtures. Target era C# 14 / .NET 10 LTS, floor .NET 8, .NET 11 RC1 flagged.
method: ripgrep counts over each repo's non-test source root, hand reading of the process layers, and five compiled/run fixtures under /home/mherwig/.cache/research-lang/dotnet-tools/fixtures/exemplar-cli-wrappers/. Every command is inlined next to its result. R=/home/mherwig/.ocx/toolchain/active/bin/rg (the shell's `rg` is shadowed by a wrapper that rejects -g; call the real binary). T=/home/mherwig/.cache/research-lang/dotnet-tools/run.sh. Repo paths are relative to the exemplar root. Cite format owner__repo@sha12:path:line.
---

# Verdict (read this first)

The framing ("prefer ArgumentList, Kill(entireProcessTree: true), JsonSerializerContext, graceful cancel, a fake process runner") is the *recommended* shape, not the *observed* one. Measured against the 10 codebases that actually spawn processes:

| Claim in the brief | Measured | Verdict |
|---|---|---|
| ArgumentList is how .NET libraries pass args | 3 of 10 use it at all (SimpleExec opt-in, Aspire opt-in, PowerShell default). 10 of 10 have a string `Arguments` path. CliWrap, Medallion, Nuke, Cake, Azure.Core, Testcontainers, Pulumi (via CliWrap) never touch it | Contradicted. Reason is measurable: netstandard2.0 has no ArgumentList (fixture ns20, error CS1061) |
| Kill(entireProcessTree: true) is standard | 3 of 10 (CliWrap, SimpleExec default, Aspire). 5 of 10 call bare `Kill()` and orphan grandchildren (fixture E3 proves the orphan) | Contradicted |
| Graceful cancellation is standard | 3 of 10 (CliWrap, Aspire, Medallion). .NET 8/10 has no SIGTERM API; CliWrap embeds a net35 helper exe for Windows Ctrl+C | Contradicted; .NET 11 RC1 adds `Process.Signal(PosixSignal)` |
| WaitForExitAsync is the wait primitive | 2 of 10 (CliWrap, Aspire). 3 use `Exited` event / event+TCS (SimpleExec, Medallion, Azure), 3 block on sync `WaitForExit` (Nuke, Cake, PowerShell) | Contradicted |
| JsonSerializerContext source generation | 0 of 5 SDKs. Used for 1 internal error type in Azure.Core, 4 types in Cake, 1 in Testcontainers | Contradicted for SDK DTOs |
| System.Text.Json over Newtonsoft | 8 of 10 JSON-using repos are STJ-only; Nuke (98 files) is Newtonsoft; Stripe carries both attributes on every DTO (5795 files) | Mostly confirmed; Stripe shows the migration cost |
| Pulumi has a "CommandRunner" | `rg -c CommandRunner sdk/` = 0. It is `PulumiCommand` (abstract) + `LocalPulumiCommand` over the CliWrap NuGet | Name wrong, shape right |
| Testcontainers wraps a CLI | It talks to the Docker daemon via Docker.DotNet.Enhanced (csproj:12-13). The only Process use is one 43-line sync credential-helper file | Contradicted |
| Interface + fake runner for tests | Fakes exist in 4 of 10 (Cake FakeProcess, Aspire IProcessRunner, Azure IProcess, Pulumi PulumiCommandMock); the 2 best process libs (CliWrap, SimpleExec) test against real dummy executables instead | Partly |

Doc vs code: `Pulumi.Automation.csproj:8-9` describes the package as "driving Pulumi programs without the CLI"; `LocalPulumiCommand.cs:348` runs `Cli.Wrap("pulumi")`. Code wins: it is a CLI wrapper.

**Recommendation (evidence in section 8):** copy Pulumi.Automation's three layers (abstract command seam, sealed typed workspace handles, flat option/result models) and put a CliWrap-style execution engine behind the seam. Implement the engine in-house on `ArgumentList` (net8+), do not copy CliWrap's string-escaping layer, and do not copy Pulumi's stderr-regex error mapping (ocx exits with 17 distinct sysexits-style codes, `ocx-sdk-python@80136dde4162:src/ocx_sdk/_errors.py:28-47`).

Headline numbers: 10 process spawners surveyed; 3 ArgumentList; 3 tree-kill; 3 graceful; 5 bare `Kill()`; 2 WaitForExitAsync; 0 of 5 SDKs source-gen JSON; 0 of 4 large HTTP SDKs use ILogger; 701 of 1330 public async methods in Stripe.net have no CancellationToken; 9 of 13 libraries ship netstandard2.0; Cake and Aspire already multi-target net11.0.

# 1. Method and commands

Exemplar SHAs (`git -C <dir> rev-parse --short=12 HEAD`) and last-commit dates (`git -C <dir> log -1 --format=%cs`):

| repo | sha12 | last commit | .cs files (`git ls-files '*.cs' \| wc -l`) |
|---|---|---|---|
| Tyrrrz__CliWrap | 7dbc252fa773 | 2026-10-09 | 66 |
| adamralph__simple-exec | f80913246993 | 2026-10-08 | 19 |
| madelson__MedallionShell | e45f1f6ffd4c | 2023-04-04 (dormant) | 46 |
| pulumi__pulumi-dotnet | 2a0dca84f09b | 2026-10-10 | 1233 |
| testcontainers__testcontainers-dotnet | 04cbb73fcc58 | 2026-10-10 | 818 |
| nuke-build__nuke | 27e8077b8ab0 | 2025-12-02 | 646 |
| cake-build__cake | 08885933e936 | 2026-10-08 | 1883 |
| dotnet__aspire (Dcp slice) | af646baee1e8 | 2026-10-10 | 58 checked out |
| PowerShell__PowerShell (1 file) | 5d871eb5e02c | 2026-10-09 | 1 checked out |
| octokit__octokit.net | 7fa5b0fe4a18 | 2025-01-08 (21 months idle) | 1584 |
| stripe__stripe-dotnet | dbdca6ba5efc | 2026-09-30 | 6316 |
| openai__openai-dotnet | 1f0e8829acac | 2026-10-06 | 3607 |
| anthropics__anthropic-sdk-csharp | ae16e5933f39 | 2026-10-09 | 4466 |
| Azure__azure-sdk-for-net (Azure.Core slice) | 32c48fc3d524 | 2026-10-10 | 815 checked out |

Feature matrix commands (one per cell, run per process-layer root; roots = CliWrap `CliWrap/`, SimpleExec `src/SimpleExec`, Medallion `MedallionShell/`, Pulumi `sdk/Pulumi.Automation`, Testcontainers `src/Testcontainers`, Nuke `source/Nuke.Tooling`, Cake `src/Cake.Core`, Aspire `src/Aspire.Hosting/Dcp`, PowerShell `.../NativeCommandProcessor.cs`, Azure `sdk/core/Azure.Core/src/Identity`):

```
$R -l -g '*.cs' -e '\.ArgumentList'                         <root> | wc -l   # ArgumentList
$R -l -g '*.cs' -e 'Begin(Output|Error)ReadLine'            <root> | wc -l   # event drain
$R -l -g '*.cs' -e 'WaitForExitAsync'                       <root> | wc -l
$R -l -g '*.cs' -e 'Kill\((entireProcessTree: ?)?true\)|Kill\(!|Kill\(entireProcessTree' <root>
$R -l -g '*.cs' -e '\bPATHEXT\b'                            <root> | wc -l
```

`.ArgumentList` false positives were removed by hand: Nuke.GlobalTool and Cake each have Roslyn `node.ArgumentList.Arguments` hits (`$R -n '\.ArgumentList' -g '*.cs' cake-build__cake/src nuke-build__nuke/source` returns only 3 Roslyn lines in `Nuke.GlobalTool/Rewriting/Cake/CodeAnalysisExtensions.cs:24,44,52`, zero in Cake). Hand-confirmed cells below cite file:line.

# 2. Process spawning, per library (cited)

Prefix every path with the repo@sha12 from the table above.

| library (LOC of process layer) | args | stdout+stderr drain | wait | cancel / kill | graceful | encoding | env | exe resolution | exit code mapping |
|---|---|---|---|---|---|---|---|---|---|
| CliWrap (3200 LOC lib) | string `Arguments` built by `ArgumentsBuilder.Escape` copied from dotnet/runtime PasteArguments (`Builders/ArgumentsBuilder.cs:135-138`); `Command.Execution.cs:408` | async byte pumps over `BaseStream`, 3 tasks (stdin/out/err) + process via `Task.WhenEach` (`:210`) | `WaitForExitAsync(CancellationToken.None)` `:197`, then `finally await processTask` `:254` ("process never outlives") | forceful token -> `TryKill(entireProcessTree: true)` `Utils/Extensions/ProcessExtensions.cs:44-48`; `OperationCanceledException` thrown `:258-266` | separate second token -> SIGINT via libc kill(pid,2) (`ProcessExtensions.cs:31`), Windows: deploys embedded net35 `Signaler.exe` (`CliWrap.csproj:62`, `Native/WindowsSignaler.cs:12-41`) | none on ProcessStartInfo; decode at the pipe, default `Encoding.Default` (`PipeTarget.cs:236`) | dict with null = remove var `:449-463` | probes exe/cmd/bat on PATH, process dir, cwd on Windows only `:21-73` | `CommandExecutionException(command, exitCode)` `:278`; Buffered variant embeds stderr (`Buffered/BufferedCommandExtensions.cs:67-80`) |
| SimpleExec (867 LOC) | string `args` OR `IEnumerable<string>` -> `ArgumentList` (`Internal/ProcessStartInfoExtensions.cs:35`) | `ReadToEndAsync` x2 then `Task.WhenAll` (`Command.cs:421-430`) | `Exited` event + TCS + SemaphoreSlim double-check (`Internal/ProcessExtensions.cs:44-77`) | `ct.Register` -> `Kill(!ignoreProcessTree)` default **tree** (`:115`), then `ct.ThrowIfCancellationRequested` | none | optional `Encoding?` applied to all 3 std streams (`ProcessStartInfoExtensions.cs:23-25`) | `Action<IDictionary<string,string?>>` | own `Resolve`: PATHEXT, only .exe/.bat/.cmd (`Command.cs:449-479`) | `ExitCodeException` / `ExitCodeReadException` (carries stdout, stderr); `handleExitCode` predicate |
| Medallion (4311 LOC, dormant) | string; own `CommandLineSyntax` (Windows, MonoUnix) because ns1.3/net45 has no ArgumentList (`Shell.cs:43-44`) | background `InternalProcessStreamReader` per stream (`ProcessCommand.cs:41-50`) | process monitoring task + `Interlocked` race between exit/timeout/cancel (`ProcessHelper.cs:47-100`) | bare `process.Kill()` (`ProcessHelper.cs:26`), no tree; also `ProcessTimeout` | `TrySignalAsync` via `MedallionShell.ProcessSignaler` helper | optional (`Shell.cs:53-56`) | `StartInfoInitializers` | none | `ErrorExitCodeException` when `ThrowOnError` |
| Pulumi.Automation (10514 LOC SDK) | `IList<string>` args -> CliWrap `WithArguments(args, escape: true)` (`LocalPulumiCommand.cs:349`) | CliWrap pipes: StringBuilder + user callbacks merged (`:328-340`) | CliWrap | CT passed to `ExecuteAsync` (`:357`) | CliWrap forceful only | CliWrap default | merged dictionary, PATH prefixed with CLI dir (`:372-390`) | `"pulumi"` on PATH or `<root>/bin/pulumi` (`:65-69`) | `CommandException.CreateFromResult` = regex/`Contains` on **stderr** (`Commands/Exceptions/CommandException.cs:23-33`) |
| Aspire Dcp `ProcessUtil` (314 lines, internal) | `Arguments` string OR `ArgumentList`, both set = throw (`Dcp/Process/ProcessUtil.cs:24-27,57-63`); Aspire's own caller builds an interpolated string with embedded `\"{path}\"` (`DcpHost.cs:305-324`) | `OutputDataReceived`/`ErrorDataReceived` + two TCS completed on EOF null (`:83-122`) | `WaitForExitAsync` then `WhenAll(stdoutComplete, stderrComplete)` (`:149-150`) | no CT; `IAsyncDisposable` ladder: SIGINT via `[LibraryImport("libc")] kill` / `CloseMainWindow`, wait 5 s, `Kill(true)`, wait 5 s, `Kill(true)` again (`:255-301`) | yes (that ladder) | none | `InheritEnv=false` clears (`:65-68`) | `ResolveExecutablePath` flag -> `PathLookupHelper` (not in the slice) | `InvalidOperationException` + last 256 lines (`ProcessSpec.cs:8`, `ProcessUtil.cs:156-163`) |
| Nuke `ProcessTasks` | string (`ProcessTasks.cs:150`), `ArgumentStringHandler` interpolation filter for secrets (`:54-77`) | `OutputDataReceived` into `BlockingCollection` (`:199-229`) | sync `WaitForExit(timeout)` then bare `Kill()` (`Process2.cs:50-58`) | none; no CT | none | fixed UTF8 (`:155-156`) | `Environment.Clear()` whenever a dictionary is passed (`:159-164`) | `ToolPathResolver.GetPathExecutable` | `ProcessException` with stderr lines (`ProcessException.cs:20-42`) |
| Cake `ProcessRunner` | string via `ProcessArgumentBuilder` (`ProcessRunner.cs:155`), `RenderSafe` for logs (`:148`) | events into `ConcurrentQueue`; consumer spin-waits `while(!queue.IsEmpty \|\| !HasExited) continue;` (`ProcessWrapper.cs:73-83`) | sync `WaitForExit` | `Kill()` + `WaitForExit()` (`:109-113`); `ToolTimeout` | none | none | `CAKE`, `CAKE_VERSION` injected (`:169-170`) | `IToolLocator` | `CakeException(exitCode)` (`Tooling/Tool.cs:101-108`) |
| Azure.Core `ProcessRunner` (for `az`, `azd`, `pwsh`) | **shell**: `/bin/sh -c "az ..."` or `cmd.exe /d /c "..."` with string interpolation (`Credentials/AzureCliCredential.cs:236-259`) | events + TCS per stream (`ProcessRunner.cs:92-105`) | `Exited` event (`:94`) | CT+timeout -> bare `Kill()` of the *shell* (`:148`) | none | none | only `PATH` set (`:233`) | none | `InvalidOperationException(stderr)` then string-matched ("az login", "AADSTS") `:175-211` |
| PowerShell `NativeCommandProcessor` | **both**: ArgumentList by default (`:1690-1697`), legacy string for known-bad exes (`UseSpecialArgumentPassing` `:1587-1593`) | `BeginOutputReadLine` `:2038` | sync | bare `Kill()` on cleanup (`:1502`) | n/a | configurable per stream (`:1652-1659`) | `Environment` edits force `UseShellExecute=false` (`:750-751`) | PATHEXT list incl. .com (`:1917-1926`) | pipeline semantics, not an exception |
| Testcontainers `DockerCredentialProcess` (43 lines) | string `"get"` | stdout `ReadToEnd` only; stderr not redirected so no deadlock (`:8-41`) | none | none | none | default | none | none | swallows every exception, returns `null` (`:33-36`) |

Counts for the sentence in the Verdict (10 = the rows above plus none counted twice; Pulumi counted through CliWrap):

- ArgumentList: SimpleExec, Aspire, PowerShell = **3/10**. Command: `$R -l '\.ArgumentList' -g '*.cs' <root>`.
- Tree kill (`Kill(true)` default or explicit): CliWrap, SimpleExec, Aspire = **3/10**; bare `Kill()`: Medallion, Nuke, Cake, Azure.Core, PowerShell = **5/10**.
- Graceful path: CliWrap, Aspire, Medallion = **3/10**.
- `WaitForExitAsync`: CliWrap `Command.Execution.cs:197`, Aspire `ProcessUtil.cs:149` = **2/10** (`$R -l WaitForExitAsync -g '*.cs' <root>`).
- CancellationToken on the spawn API: CliWrap, SimpleExec, Medallion, Pulumi, Azure = **5/10**.
- Secret redaction of the echoed command line: SimpleExec `secrets` param (`Internal/ProcessExtensions.cs:105-106`), Nuke filter, Cake `RenderSafe`, Azure `_logPII` flag = **4/10**.
- Windows-specific branches (`$R -c -e 'IsWindows\(\)|OSPlatform\.Windows|IsWin\b|IsUnix\(\)|#if UNIX'`): Cake.Core 15, PowerShell 14, Azure.Identity 10, Nuke.Tooling 8, Aspire 4, CliWrap 2, Pulumi 2, SimpleExec 1, Medallion 1. Cross-platform is paid for in branch count, not by the BCL.

# 3. Measured .NET behaviour (fixtures, re-runnable)

Fixture: `$F=/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/exemplar-cli-wrappers`, dir `spawn/` (net10.0, SDK 10.0.401 via the parent global.json), run with `cd $F/spawn && $T dotnet run -c Release --nologo`. Linux only (WSL2); Windows behaviour below is taken from library comments and not re-measured.

| id | experiment | result |
|---|---|---|
| E1 | redirect both streams; child writes 200 KB to stderr then `echo done`; parent does `StandardOutput.ReadToEnd()` then `StandardError.ReadToEnd()` | **DEADLOCK after 3 s** |
| E2 | same child; `ReadToEndAsync` on both + `WaitForExitAsync` in `Task.WhenAll` | completed, stdout=`done`, stderrLen=200000 |
| E3 | child `sh -c 'sleep 30 & echo $!; wait'`, then `p.Kill(false)` vs `p.Kill(true)`, check `/proc/<grandchild>` | `Kill(false)`: grandchild **alive**; `Kill(true)`: gone |
| E4a | `ProcessStartInfo.ArgumentList` with `a b`, `say "hi"`, empty string, `back\slash\`, `$HOME`, `*` | argv delivered exactly: `[a b]\|[say "hi"]\|[]\|[back\slash\]\|[$HOME]\|[*]` |
| E4b | same values joined with spaces into `Arguments` | argv corrupted: `[a]\|[b]\|[say]\|[hi]\|...` and the empty argument vanished |
| E5 | missing exe / `exit 7` / `kill -9 $$` | `Win32Exception` NativeErrorCode=2 (message names the working directory); ExitCode 7; ExitCode 137 for SIGKILL (128+9) |
| E6 | `Encoding.Default` on net10 | `Unicode (UTF-8)`, preamble length 0 (CliWrap's default decoder is UTF-8 only on .NET Core; on a .NET Framework consumer of its netstandard2.0 build it would be the ANSI code page - documented, not measured here) |
| E7 | child exits at once but leaves `sleep 5 &` holding stdout; `BeginOutputReadLine()` + `WaitForExitAsync()` | returns after **5001 ms** with stdout redirected, **1 ms** without redirect. A daemonising grandchild stalls WaitForExitAsync; Aspire documents the same (`ProcessUtil.cs:79-81` cites dotnet/runtime#29232) and works around it with a 5 s timeout ladder |

Why this matters for ocx: `ocx exec` launches arbitrary tools; E7 is the exact case (a tool that backgrounds a daemon).

## 3.1 API availability probes (compile errors are the measurement)

`cd $F/ns20 && $T dotnet build` (netstandard2.0 class library, LangVersion latest):

- `ProcessStartInfo.ArgumentList` - CS1061 missing
- `Process.Kill(bool)` - CS1501 no 1-arg overload
- `Process.WaitForExitAsync` - CS1061 missing
- `ProcessStartInfo.StandardInputEncoding` - CS1061 missing
- `OperatingSystem.IsWindows()` - CS0117 missing
- `ProcessStartInfo.Environment`, `CreateNoWindow` - compile (controls)

`cd $F/net10 && $T dotnet build` (net10.0) fails for the five .NET 11 APIs Cake uses (`KillOnParentExit`, `StartDetached`, `InheritedHandles`, `File.OpenNullHandle`, `Process.StartAndForget`); `cd $F/net11 && $T dotnet build` with a nested `global.json` pinning `11.0.100-rc.1.26425.128` (`allowPrerelease: true`) succeeds. Cake guards them with `#if NET11_0_OR_GREATER` (`cake-build__cake@08885933e936:src/Cake.Core/IO/ProcessRunner.cs:89,179-181,216-255`) and pins the RC SDK in its own `global.json` (`"version": "11.0.100-rc.1.26425.128"`).

**.NET 11 RC1 only - flag in any rule:** `cd $F/api && $T dotnet run -f net11.0` (reflection diff against net10.0, 212 vs 249 members of Process+ProcessStartInfo) shows new public API: `Process.Run/RunAsync(ProcessStartInfo|fileName, IEnumerable<string> args, ...)`, `Process.RunAndCaptureText[Async]` returning `ProcessTextOutput{ExitStatus, StandardOutput, StandardError, ProcessId}`, `Process.Signal(PosixSignal)`, `WaitForExitStatus[Async]`, `TryWaitForExitStatus`, `ProcessExitStatus{ExitCode, Signal, Canceled}`, `ReadAllLines[Async]`/`ReadAllText[Async]`, `StartAndForget`, `ProcessStartInfo.{KillOnParentExit, StartDetached, StartSuspended, InheritedHandles, Standard{Input,Output,Error}Handle}`. RC1 shapes may change before GA (Nov 2026); do not encode as stable. They show where the whole CliWrap/SimpleExec class of library is heading: spawn + capture + graceful signal in the BCL.

# 4. Ranking the process-execution designs

Rubric: 13 binary criteria, each cell sourced from section 2 or 3 (1 = present). Ranking is by sum; ties noted. Criteria: argv fidelity (ArgumentList or CRT-correct escape), concurrent drain, async end to end, CancellationToken with child-cleanup guarantee, tree kill, graceful interrupt, typed exit-code exception carrying output, fake/seam for tests, env add+remove semantics, Windows exe resolution, explicit encoding control, commits in last 12 months, trim/AOT declared.

| rank | design | score | misses |
|---|---|---|---|
| 1 | CliWrap | 12/13 | no injectable runner (tests use 10 real dummy commands, `CliWrap.Tests.Dummy/Commands/`) |
| 2 | SimpleExec | 10/13 | no graceful, no seam, no trim claim |
| 3 | Aspire ProcessUtil (internal) | 8/13 | no CT, untyped exception, no encoding control, internal only |
| 4 | Medallion | 8/13 | no tree kill, no Windows resolution, dormant since 2023, no trim claim |
| 5 | Nuke ProcessTasks | 7/13 | sync only, no CT, no tree/graceful, Environment.Clear surprise |
| 6 | Cake ProcessRunner | 6/13 | sync, spin-wait consumer (`ProcessWrapper.cs:73-83`), no CT |
| 7 | Azure.Core Identity ProcessRunner | 5/13 | shell-string command line, stderr string matching, bare Kill of the shell |

Not scored: PowerShell (a shell, not a library), Testcontainers credential helper (not a wrapper), Pulumi (inherits CliWrap; its own contribution is the seam, section 5).

Design properties worth copying from CliWrap (all cited in section 2): immutable `Command` value (`Command.cs:13-24`, `With*` clones), one execution method taking *two* tokens (forceful, graceful), "process never outlives the call" enforced in `finally`, pipes as the extensibility point, validation default-on with an explicit opt-out (`WithValidation(None)`), stdin pump cancelled when the process exits (`Command.Execution.cs:93-110` cites issue #74).

# 5. SDK public API shape

Roots: Octokit `Octokit/`, Stripe `src/Stripe.net`, OpenAI `OpenAI/` (src/Custom + src/Generated), Anthropic `src/Anthropic`, Azure.Core `sdk/core/Azure.Core/src`, Pulumi `sdk/Pulumi.Automation`. Counting command pattern (heuristics; multi-line signatures make the CT-last column approximate):

```
$R -c -g '*.cs' -e '^\s*public\s+(virtual\s+|override\s+|static\s+|async\s+)*(Task|ValueTask)(<[^=;{]*>)?\s+\w+Async\s*[<(]' <root>
$R -U -c -g '*.cs' -e 'CancellationToken\s+\w+(\s*=\s*(default|CancellationToken\.None))?\s*\)' <root>   # CT last
$R -U -c -g '*.cs' -e 'CancellationToken\s+\w+(\s*=\s*(default|CancellationToken\.None))?\s*,'  <root>   # CT not last
```

| SDK | client shape | sync/async | CT placement | result type | pagination | IDisposable | logging | exceptions | JSON |
|---|---|---|---|---|---|---|---|---|---|
| Octokit (790 files) | `GitHubClient : IGitHubClient`, per-resource sub-clients (`IRepositoriesClient` ...) | async only, **no Async suffix** (`Task<Repository> Get(...)` `Clients/RepositoriesClient.cs:285`) | 1093 Task/IObservable-returning client methods, 131 `CancellationToken` mentions in the whole project: CT is the exception | domain model direct, `ApiInfo` side channel | `GetAll` + `ApiOptions` | no | none (0 ILogger/EventSource) | 21 exception classes under `ApiException` | **vendored** `SimpleJson.cs` (90 KB), no STJ/Newtonsoft; ns2.0 only (`Octokit.csproj:9`) |
| Stripe.net (6151 files) | `StripeClient`/`IStripeClient`, one `*Service` per resource, mutable DTO classes with `get; set;`, static `StripeConfiguration.ApiKey` global | **every operation twice**: `Create` + `CreateAsync` (`Services/Customers/CustomerService.cs:65,73`) | last, always `= default` where present; **701 of 1330** public `Task`-returning `*Async` methods have no CT (all `Events/*Notification.cs`, e.g. `FetchRelatedObjectAsync()`; the protected base takes one, `Entities/V2/Core/Events/Event.partial.cs`) | domain model; `StripeResponse` via `IStripeClient` | `StripeList<T>` + `ListAutoPaging` | no | none | 3 classes rooted at `StripeException` | Newtonsoft **and** STJ on every property: `[JsonProperty("id")] [STJS.JsonPropertyName("id")]` (`Entities/Customers/Customer.cs:22-23`); `JsonUtils.cs` still Newtonsoft; `LangVersion 8` (`Stripe.net.csproj:6`) |
| OpenAI (2461 files, generated + `Custom/`) | `OpenAIClient` hands out sub-clients (`ChatClient` ...), constructors take `ApiKeyCredential` + `OpenAIClientOptions` | sync + Async pairs, both `virtual` (`Custom/Chat/ChatClient.cs:146,186`) | last, `= default` | `ClientResult<T>` wrapper (System.ClientModel) | `CollectionResult<T>` / `AsyncCollectionResult<T>` (47 mentions) | only the Realtime client | none | uses BCL `ClientResultException`, 0 own exception classes | STJ + ModelReaderWriter `IJsonModel<T>` on 740 files; **extensible-enum structs**: 216 `readonly partial struct X : IEquatable<X>` (79 public) + 21 closed enums; 809 `[Experimental("OPENAI001/2")]` (644/165) |
| Anthropic (2312 files, generated) | `AnthropicClient : IAnthropicClient : IDisposable`; every service has an `I*Service` + `I*ServiceWithRawResponse`; `WithOptions(Func<ClientOptions,ClientOptions>)` returns a view (`IAnthropicClient.cs:23,55-60`, `Services/IMessageService.cs:16-29`) | **async only and no Async suffix**: 1034 Task-returning service-interface methods, 0 named `*Async` (`IMessageService.cs:43`); streaming = `IAsyncEnumerable<T>` (10) | last, `= default`, 2353 sites vs 0 non-last | immutable `sealed record class` models with `required` + `init`, raw-JSON-backed (`Models/Messages/Message.cs:13-28`); 2164 `record` decls | `IPage<T>` with `HasNext()`, `Next(ct)`, `Paginate(ct)` (`Core/IPage.cs:12-50`) | yes (client) | none | 16 classes under `AnthropicException` (see CLAUDE.md "Exceptions") | STJ only, 704 converter files, reflection-based (no source-gen); `ApiEnum<TRaw,TEnum>` wraps 541 enums and keeps unknown wire values (`Core/ApiEnum.cs:15-27`) |
| Azure.Core (390 files) | `ClientOptions` + pipeline, `Response<T>` implicit-converts to `T` | public `Foo`/`FooAsync` pairs over one internal `bool async` implementation (148 `async ?`/`bool async` hits); analyzer AZC0102 bans `.GetAwaiter().GetResult()` (suppressed at `Identity/ProcessRunner.cs:75`) | last | `Response<T>`, `NullableResponse<T>`, `ErrorOptions.NoThrow` opt-out (`api/Azure.Core.net10.0.cs`) | `Pageable<T>`/`AsyncPageable<T>` with `AsPages(continuationToken, pageSizeHint)` | no | `EventSource` x30 files + `DiagnosticScope` x35 | `RequestFailedException` + `AuthenticationFailedException`/`CredentialUnavailableException` | STJ; one `JsonSerializerContext` for the error DTOs (`ResponseErrorSourceGenerationContext.cs:14-23`); `AotAnalyzersOptOut=true` (`Azure.Core.csproj`) |
| Pulumi.Automation (131 files) | `LocalWorkspace` **sealed**, built by static `CreateAsync(options, ct)`; `abstract Workspace : IDisposable` (`Workspace.cs:24`); `WorkspaceStack` handle per stack; options classes per verb (`UpOptions`, `PreviewOptions`, ...) | async only **with** Async suffix (165 decls) | CT-less overload *and* CT overload because CT was retrofitted: `CreateStackAsync(args)` `:107` + `CreateStackAsync(args, ct)` `:124` | result classes (`UpResult`, `UpdateSummary`) | n/a | yes (`Workspace`) | `ILogger?` property on options (7 files) | `CommandException` + 3 subclasses mapped from stderr | STJ with one `BuildJsonSerializerOptions()` (camelCase, `WhenWritingNull`, `AllowTrailingCommas`, 4 custom enum converters) `Serialization/LocalSerializer.cs:66-80` |

Cross-cutting counts:

- Sync+async pairs: Stripe, OpenAI, Azure.Core, SimpleExec (4 pairs). Async only: Octokit, Anthropic, Pulumi, CliWrap. 4 of 8 ship sync twins, so "async only" is not the consensus for SDKs, but for CLI wrappers sync twins are a thin `GetAwaiter().GetResult()` risk (Azure suppresses AZC0102 to do it).
- `*Async` suffix omitted: Octokit and Anthropic (2 of 8; both predate or are generated from a non-.NET spec). Microsoft guideline and VSTHRD200 expect the suffix.
- IDisposable on the client: Anthropic, Pulumi (workspace), OpenAI (realtime only). The big HTTP SDKs rely on `HttpClient` lifetime instead.
- ILogger/EventSource/ActivitySource in the four HTTP SDKs: Octokit 0, Stripe 0, OpenAI 0 (1 file Diagnostic), Anthropic 0; Azure.Core is the only one with EventSource+DiagnosticScope. ILogger lives in Testcontainers (28 files) and Pulumi (7). A CLI wrapper SDK should expose one logging seam; the HTTP SDKs show it is easy to skip.
- Records: Anthropic 2164, Stripe 16, OpenAI 0, Azure.Core 4, Pulumi 0. Records are a generated-code idiom, not a hand-written one.

# 6. JSON handling

Commands: `$R -l -g '*.cs' -e 'using Newtonsoft' <root>` and `-e 'using (static )?System\.Text\.Json'` excluding test dirs (`-g '!**/*[Tt]est*/**'`).

| repo | Newtonsoft files | STJ files | source-gen contexts | unknown properties | enums |
|---|---|---|---|---|---|
| Pulumi.Automation | 0 | 12 | 0 | STJ default (ignored); `AllowTrailingCommas` | `StringToEnumJsonConverter<T,TConv>` x3 + `JsonStringEnumConverter(LowercaseJsonNamingPolicy)` (`LocalSerializer.cs:75-78`) |
| Testcontainers | 0 | 24 | 1 | default | 2 converters |
| Cake | 0 (2 csproj refs) | 40 | 4 `[JsonSerializable]` (all in `GitHubNuGetLoginJsonContext.cs:12-15`) | default | n/a |
| Nuke (all of `source/`) | 98 | 4 | 0 | Newtonsoft default | n/a |
| Stripe | 5795 | 5820 | 0 | `[JsonExtensionData]` only on request `BaseOptions` (`Services/_base/BaseOptions.cs:29-30`) | 1 public enum; everything is `string` |
| OpenAI | 0 | 915 | 0 | `IJsonModel<T>` additional-properties dictionary (generated) | 216 extensible structs |
| Anthropic | 0 | 2069 | 0 | raw-data-backed models keep every field; CLAUDE.md rule "Throwing on data the SDK doesn't recognize" (line 77) | `ApiEnum` keeps unknown values |
| Azure.Core | 0 | 52 | 1 (internal) | `JsonExtensionData` honoured in `JsonObjectSerializer.cs:128-130` | 9 converters |
| Octokit | 0 | 0 | 0 | vendored SimpleJson | custom |
| CliWrap, SimpleExec, Medallion | 0 | 0 | 0 | no JSON | n/a |

Take-aways: (a) STJ-only is the default for anything written after 2020; (b) no SDK uses `JsonSerializerContext` for its DTOs - they pay reflection STJ and declare no trim/AOT promise (only CliWrap `IsAotCompatible`, `CliWrap.csproj:9-11`, and OpenAI `Directory.Build.props:45` declare AOT, and CliWrap has no JSON) - so the source-gen claim in the brief has zero SDK precedent and must be decided on first principles; (c) the three forward-compatibility devices actually used are *raw-data retention* (Anthropic), *extensible-enum structs* (OpenAI) and *wrapper enums* (Anthropic `ApiEnum`); a closed C# `enum` over a CLI's JSON will throw or silently mis-map when ocx adds a value, which is the same pitfall the Python SDK avoids by carrying identifiers verbatim (`ocx-sdk-python` `.claude/rules/architecture.md` "Carry, don't parse").

# 7. Testability seams

| library | seam | test style |
|---|---|---|
| CliWrap | none for execution; `ICommandConfiguration` only (1 interface in `CliWrap/`) | `CliWrap.Tests.Dummy` real exe with 10 commands (Echo, EchoStdIn, Environment, Exit, GenerateBinary, GenerateText, LengthStdIn, Sleep, WorkingDirectory, Default) |
| SimpleExec | none (0 interfaces) | fixtures + real processes; `tests/Tests/PublicApi.cs` snapshots the public API (`PublicApi.Surface.expected.txt`) via PublicApiGenerator |
| Medallion | none (0 interfaces) | real processes |
| Cake | `IProcessRunner` -> `IProcess`; `Cake.Testing.FakeProcess`; `rg -l 'FakeProcessRunner\|IProcessRunner'` = 166 files | fakes |
| Aspire | `IProcessRunner` + `DefaultProcessRunner` (`Dcp/Process/IProcessRunner.cs:10-24`) | fakes |
| Azure.Core | `IProcessService`/`IProcess` wrapper exposing the exact Process surface the runner uses (`Identity/ProcessService.cs:14-69`) | fakes |
| Pulumi | `abstract class PulumiCommand` with 2 abstract methods + `Version`; `LocalWorkspaceOptions.PulumiCommand` injects it; `Pulumi.Automation.Tests/Mocks/PulumiCommandMock.cs`, used at `LocalWorkspaceTests.cs:2546-2588` | fake command returns canned `CommandResult` |
| Nuke | `IProcess` + `protected virtual StartProcess` (`ToolTasks.Run.cs:86`) | partial |
| Testcontainers | none for the process path | n/a |
| ocx-sdk-python (reference) | `popen_factory` / `exec_factory` injected (`_process.py:102-106`) + contract tests against a pinned binary | fakes + real binary |

Pulumi's seam is the narrowest that still lets every typed method be unit tested: it sits at "args in, `CommandResult{Code, StandardOutput, StandardError}` out" (`PulumiCommand.cs:19-36`, `CommandResult.cs:8-24`). The ocx Python SDK has the same cut.

# 8. Recommendation for a new ocx C# SDK

**Copy: Pulumi.Automation's layering (score on shape: closest to "typed handles over a CLI, methods mirror commands, bootstrap the binary").** Concretely:

1. Layer 1, `abstract OcxCommand` (or interface) = the only thing that spawns: `RunAsync(IReadOnlyList<string> args, workingDir, env, onStdout?, onStderr?, ct) -> CommandResult`. Evidence: `Pulumi.Automation/Commands/PulumiCommand.cs:12-37`, mock at `PulumiCommandMock.cs`.
2. Layer 2, sealed typed handles built by static `CreateAsync(options, ct)`; one method per ocx command; options object per verb; CT last with `= default` **from day one** (Pulumi had to add overloads later, `LocalWorkspace.cs:107` + `:124`; Stripe left 701 methods without; Octokit has 131 CT mentions across ~1093 methods).
3. Layer 3, flat result models; carry identifiers verbatim; forward-compatible enums (OpenAI extensible structs or Anthropic `ApiEnum`).
4. Engine inside layer 1: CliWrap's structure re-implemented on `ArgumentList` (net8+): three concurrent byte pumps + `WaitForExitAsync` + "process never outlives the call", forceful and graceful tokens, `Kill(entireProcessTree: true)`, null-removes-env-var, bytes-then-decode. About 300-400 lines (Aspire's ProcessUtil is 314 lines and already has the SIGINT ladder; SimpleExec is 867 total).
5. Errors: map **exit codes** to a typed hierarchy and carry stderr tail. Do not regex stderr (Pulumi `CommandException.cs:23-33`, Azure `AzureCliCredential.cs:175-211`).
6. Bootstrap: do not copy Pulumi's installer - it downloads and executes `get.pulumi.com/install.sh|ps1` with no hash check and `new HttpClient()` per call (`LocalPulumiCommand.cs:152,190,208-217`). The ocx Python SDK requires sha256-verified artifacts (architecture.md "Bootstrap security"). Take Pulumi's *shape* (`LocalPulumiCommandOptions{Version, Root, SkipVersionCheck}`, `CreateAsync` vs `Install`, min-version check `ParseAndValidatePulumiVersion` `:247-270`, `--non-interactive` forced `:396-401`) and Aspire's RID logic that separates `ProcessArchitecture` from `OSArchitecture` (x64 process on arm64 Windows, `DcpHost.cs:407-448`).

Why not depend on CliWrap: Pulumi does (`CliWrap 3.3.2`, `Pulumi.Automation.csproj:44`, an old pin), and CliWrap is the best library measured (12/13). Against: its string-escape layer exists only because of netstandard2.0 (fixture ns20), it ships an embedded net35 helper exe for Windows Ctrl+C and pulls PolyShim/PowerKit/System.Management/Microsoft.Bcl.* on older TFMs (`CliWrap.csproj:32-45,62-66`), and the Python SDK is zero-dependency by rule. That is a decision for the authoring pass; both options are evidenced.

# 9. The netstandard2.0 open question (numbers only, no decision)

| ships netstandard2.0? | libraries |
|---|---|
| yes (9) | CliWrap (`CliWrap.csproj:3`), Medallion (`:4`), Testcontainers (`Testcontainers.csproj:3`), Octokit (`Octokit.csproj:9`, ns2.0 only), Stripe (`Stripe.net.csproj:14`, + net462), OpenAI (`Directory.Build.props:7`), Anthropic (`src/Directory.Build.props`, net8;net9;ns2.0), Azure.Core (`Azure.Core.csproj:11`; + net462/net472), Nuke.Tooling (`Nuke.Tooling.csproj:4`) |
| no (4) | SimpleExec (`Directory.Build.props:13` net8;net9;net10), Pulumi.Automation (`net6.0` only), Cake (`src/Shared.msbuild:4` net10;net11), Aspire (`eng/Versions.props:11-12` net10;net11) |

- The 3 newest SDKs (OpenAI, Anthropic, Azure.Core) all still ship ns2.0, and Anthropic tests it on **net472 on Windows** because that run is what exercises the ns2.0 build (CLAUDE.md "Multi-targeting", lines 49-53 and 44). Its lesson: a `#if` around a missing `HttpStatusCode.TooManyRequests` once silently disabled 429 retries for every ns2.0 consumer (line 52).
- Cost signal, `#if` TFM lines in non-test source (`$R -c -e '^\s*#\s*(if|elif)\s.*(NET\w*|NETSTANDARD\w*|NETFRAMEWORK|NETCOREAPP\w*)'`): OpenAI 461 (378 files), Azure.Core 86 (37), Anthropic 32 (18), Testcontainers 27 (14), Stripe 11, Medallion 11, Nuke.Tooling 8, Cake.Core 7, CliWrap 4 (PolyShim absorbs it), Octokit 1.
- What a process wrapper loses on ns2.0 is exactly the list in 3.1: ArgumentList, `Kill(bool)`, `WaitForExitAsync`, `StandardInputEncoding`, `OperatingSystem.IsWindows`. CliWrap's answer is a string escaper + polyfills + embedded helper exe; Medallion's was its own `CommandLineSyntax` and no tree kill.
- Platform reach: netstandard2.0 adds .NET Framework (Windows only), Unity/Mono, Xamarin. It adds **no** OS or CPU that net8+ lacks, so for "Windows, Linux, macOS x x64, arm64" it is not required; it is a consumer-reach decision (Unity, legacy Framework build tools). A split is the low-cost middle path seen in the corpus: ns2.0 for a types/JSON assembly, net8+ for the process engine (Nuke does this per project: `Nuke.Build.Shared` `netstandard2.0;net10.0`, `Nuke.Common` `net10.0` only).
- Floor note: net8.0 reaches end of support Nov 2026 per Microsoft's LTS cadence (not re-measured here); Azure sets `net462` EOL as Jan 2027 (`eng/Directory.Build.Common.props` comment).

# 10. API evolution mechanisms observed (for the "evolution" rules)

Command (the shell `rg` wrapper is fine here, stdin filter): `git -C <repo> ls-files | rg 'PublicAPI\.(Shipped|Unshipped)\.txt'` and `$R -l 'EnablePackageValidation|ApiCompat|CompatibilitySuppressions' -g '*.props' -g '*.csproj' -g '*.targets'`.

| mechanism | who |
|---|---|
| `PublicAPI.Shipped.txt` + Microsoft.CodeAnalysis.PublicApiAnalyzers | Pulumi.Automation (`Pulumi.Automation.csproj:40,59`, 58 KB file); SimpleExec references the analyzer (`src/Directory.Build.props:26`, RS0026 pragma `Command.cs:12`) but ships the snapshot test below instead of a `.txt` baseline |
| generated API listing per TFM checked in | OpenAI `api/released|in-progress/{net10.0,net8.0,netstandard2.0}` (`api/README.md`); Azure.Core `api/Azure.Core.{net10.0,net8.0,net462,net472,netstandard2.0}.cs` |
| snapshot unit test of the public surface | SimpleExec `tests/Tests/PublicApi.cs` + `PublicApi.Surface.expected.txt` |
| package validation / ApiCompat suppression files | Stripe (`CompatibilitySuppressions.xml`), OpenAI, Azure (ApiCompatVersion 1.63.0 vs 1.64.0-beta.1 `Azure.Core.csproj`) |
| `[Experimental("ID")]` gating unfinished API | OpenAI 809 sites (OPENAI001 644, OPENAI002 165) |
| "do not inherit from this type outside the SDK" warning in docs instead of sealing | Anthropic `IMessageService.cs:11-15`, `IAnthropicClient.cs:19-21` |
| CI that compiles `main`'s generated tests against the branch | Anthropic `scripts/detect-breaking-changes` (CLAUDE.md line 46) |
| None | CliWrap, Medallion, Nuke, Cake, Octokit, Testcontainers (0 of the 6 have a baseline file) |

CliWrap evolves by `// TODO: (breaking change) remove in favor of optional parameter` overload pairs left in place (`Buffered/BufferedCommandExtensions.cs:23`, `ArgumentsBuilder.cs:31`, `CommandExecutionException.cs:19`, `CommandTask.cs:34`): evidence that optional-parameter retrofits are source-compatible but binary-breaking, so CliWrap kept the old overloads. This is the same pressure that produced Pulumi's CT overload pairs.

# 11. Smells (ranked by how directly they would bite the ocx SDK)

1. **Sequential stdout-then-stderr read**: measured deadlock at 200 KB (E1). Present nowhere in the surveyed libraries' hot paths, but trivially written by agents; Testcontainers' credential helper only escapes it because stderr is not redirected (`DockerCredentialProcess.cs:13-15`).
2. **Bare `Process.Kill()` for cancellation**: 5 of 10 leave grandchildren alive (E3). For `ocx exec` the wrapped tool *is* the grandchild.
3. **String `Arguments` joins**: E4b drops the empty argument and splits `say "hi"`; Aspire's own caller builds `--kubeconfig \"{path}\"` by interpolation although its runner offers ArgumentList (`DcpHost.cs:305-324`); Azure.Core wraps the whole command in `sh -c "..."` / `cmd /d /c "..."` (`AzureCliCredential.cs:236-259`), a shell-injection surface for tenant/resource values.
4. **Classifying failures by stderr text** (Pulumi `CommandException.cs:23-33`, Azure `AzureCliCredential.cs:175-211`): breaks on any CLI wording or locale change.
5. **WaitForExitAsync stalls on inherited stdout** (E7, 5001 ms): needs a bound or a ladder (Aspire `ProcessUtil.cs:255-301`).
6. **CT retrofit debt**: Octokit 131 CT mentions vs 1093 methods; Stripe 701/1330 public async methods without; Pulumi overload pairs.
7. **Async methods named without `Async`** (Anthropic 1034/1034, Octokit): fights VSTHRD200 and every .NET reader's expectation.
8. **Dual-attribute JSON** (Stripe 5795 files with both Newtonsoft and STJ attributes): migration cost paid per property, enforced by an "internal wholesome test" attribute `NoSystemTextJsonAttributesNeeded` (`Infrastructure/NoSystemTextJsonAttributesNeededAttribute.cs`).
9. **Pulumi installer executes a downloaded script unverified** and leaks a `new HttpClient()` per call (`LocalPulumiCommand.cs:208-217`); also its package description contradicts its code (section "Verdict").
10. **Cake `GetStandardOutput` busy-spins** and can drop lines emitted after `HasExited` flips (`ProcessWrapper.cs:73-83`).
11. **Nuke `Environment.Clear()` whenever any dictionary is passed** (`ProcessTasks.cs:159-164`): passing one extra variable silently wipes PATH.
12. **Mutable global config**: Nuke `ProcessTasks.DefaultLogOutput`, statics at `ProcessTasks.cs:23-26`; Stripe `StripeConfiguration.ApiKey`.
13. **Dormancy as a dependency risk**: Medallion last commit 2023-04-04, Octokit 2025-01-08.

# 12. Patterns worth encoding

1. Immutable command value + `With*` clones; one execution entry that takes forceful and graceful tokens; `finally` guarantees the child never outlives the call (CliWrap `Command.Execution.cs:158-255`).
2. Concurrent byte-level drain of stdout and stderr started *before* waiting; decode at the sink with an explicit `Encoding` (CliWrap `:192-194`; SimpleExec `Command.cs:421-430`).
3. `ProcessStartInfo.ArgumentList` for every argument on net8+; never join with spaces (E4a vs E4b; SimpleExec `ProcessStartInfoExtensions.cs:33-36`).
4. `Kill(entireProcessTree: true)` as the forceful rung; a graceful rung before it, bounded by a timeout; swallow `InvalidOperationException` when `HasExited` (Aspire `ProcessUtil.cs:255-312`, CliWrap `ProcessExtensions.cs:43-55`).
5. Do not let a daemonising grandchild hang the wait: bound `WaitForExitAsync` (E7).
6. Narrow command seam (`args, cwd, env -> exit code + stdout + stderr`) with a hand-written fake for typed-method tests, plus a small real "dummy executable" suite and a contract test against the pinned binary (Pulumi `PulumiCommand.cs`; CliWrap `CliWrap.Tests.Dummy`; ocx-sdk-python `_process.py:102-106`).
7. Exit-code -> typed exception, carrying command, exit code and stderr tail; validation on by default with an explicit opt-out (CliWrap `Command.Execution.cs:278`, `Buffered/BufferedCommandExtensions.cs:67-80`).
8. Force non-interactive mode and put injected flags before the `--` separator (Pulumi `LocalPulumiCommand.cs:392-420`).
9. Redact secrets from any echoed command line (SimpleExec `secrets` `ProcessExtensions.cs:105-106`; Cake `RenderSafe`; Nuke `ArgumentStringHandler`).
10. Version gate on the wrapped CLI (min version, skip env var) at construction (Pulumi `LocalPulumiCommand.cs:77-104,247-270`).
11. Forward-compatible enums and unknown-field retention for wrapper-owned JSON (Anthropic `ApiEnum`, OpenAI extensible structs; Anthropic CLAUDE.md "Throwing on data the SDK doesn't recognize").
12. Public API baseline in CI (`PublicAPI.Shipped.txt` or GenAPI listing per TFM) and `[Experimental("ID")]` for unfinished surface (Pulumi, OpenAI 809 sites).
13. `CancellationToken cancellationToken = default` last on every async method from the first release; `Async` suffix; optional-parameter retrofits are binary-breaking.
14. Anthropic's own CLAUDE.md is a precedent for C# SDK agent config (sections: Multi-targeting, Exceptions, Common mistakes, Tests): "polyfilled attribute types stay `internal`", "library awaits use `.ConfigureAwait(false)`", "never `Dispose` a `CancellationTokenSource`/stream the returned object still depends on", "an exception family rooted at one base type, keep the original as `InnerException`".
15. TFM split by `#if NET` around the smallest fragment; test the netstandard2.0 build on a real .NET Framework runner if you ship it (Anthropic).

# 13. Limits of this audit

- Windows and macOS behaviour was not re-measured (WSL2 Linux only). Windows claims rest on library comments: Process.Start("foo") finds `.exe` only, not `.cmd`/`.bat` (CliWrap `Command.Execution.cs:17-20`, SimpleExec `Command.cs:449-479`, test `RunningCommandsInPathOnWindowsWithSpecificPathExt`), and Ctrl+C to a console child needs a helper (CliWrap issue #47 cited at `ProcessExtensions.cs:21`). Re-measure on the Windows host before encoding.
- Aspire, PowerShell and Azure.Core are sparse slices: `PathLookupHelper` (Aspire) and Azure's pipeline classes are outside the checkout.
- Per-API-method counts in section 5 are regex heuristics over single-line signatures; multi-line signatures can shift CT-last by a few percent. The Stripe 701/1330 and Anthropic 1034/0 figures were hand-verified (`$R -n ... | rg -v CancellationToken | awk -F/ '{print $2}' | sort | uniq -c` -> `701 Events`).
- .NET 11 findings are RC1 (`11.0.100-rc.1.26425.128`), reflection-probed, not documented; shape may change before GA.
- Fixtures: `$F/ns20`, `$F/net10`, `$F/net11`, `$F/spawn`, `$F/api` (each with its own csproj; `net11` and `api` carry a nested global.json for RC1).
