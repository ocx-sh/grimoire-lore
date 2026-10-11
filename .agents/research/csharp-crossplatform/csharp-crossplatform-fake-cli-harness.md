---
title: "Testing a CLI-wrapping .NET SDK without the real CLI: the fake-ocx harness, the test tiers, the runner, and the contract tier"
topic: csharp-crossplatform / csharp-crossplatform-fake-cli-harness
agent: deep-dive researcher (csharp-crossplatform group)
model: sonnet
date_researched: 2026-10-11
sources_count: 26
scope: |
  Covers: the dummy-executable seam (shape, verbs, how it is built and located on every CI leg), the tier layout
  mapped from the Python SDK, the engine behaviours the dummy must prove (stderr flood, orphaned grandchild, held pipe),
  stdin encoding/BOM, TimeProvider/FakeTimeProvider for retry, the framework + runner choice (xUnit v3 on Microsoft.Testing.Platform),
  the zero-test / all-skipped exit-code gate, and what the contract tier pins and asserts.
  Does not cover: the production engine's full design (see csharp-process-* topics), JSON binding, NuGet packaging or how the
  SDK acquires ocx at run time (see csharp-packaging-ocx-binary-acquisition), coverage tooling, mutation testing.
  Everything marked "measured" was run on SDK 10.0.401 (Linux x64) and re-run on the Windows host (SDK 10.0.102); .NET 11 RC1 is flagged where it differs.
---

# Testing a CLI-wrapping .NET SDK without the real CLI

Fixtures, all runnable: `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-crossplatform-fake-cli-harness/`
(`run-all.sh` replays every red/green pair; `evidence.txt` is its last output; `evidence-windows-*.txt` are the Windows host runs).

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Tier layout: Python's three tiers become four projects in C#](#1-tier-layout)
   2. [The seam: a real dummy executable, not a mocked Process](#2-the-seam)
   3. [The dummy: one verb per hazard](#3-the-dummy)
   4. [Building and locating the dummy on every CI leg](#4-building-and-locating-the-dummy)
   5. [What the dummy must prove about the engine: E1, E3, E7](#5-what-the-dummy-must-prove-e1-e3-e7)
   6. [Stdin encoding: the BOM trap](#6-stdin-encoding-the-bom-trap)
   7. [TimeProvider and FakeTimeProvider for retry and backoff](#7-timeprovider-and-faketimeprovider)
   8. [Framework and runner: xUnit v3 on Microsoft.Testing.Platform](#8-framework-and-runner)
   9. [The zero-test gate: exit 8, exit 9 and the all-skipped hole](#9-the-zero-test-gate)
   10. [The contract tier: pin, gate, assertions](#10-the-contract-tier)
   11. [Verified on the toolchain](#11-verified-on-the-toolchain)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- Test the SDK against a **real dummy executable** (`tests/Ocx.Fake`, a console project with one argv verb per hazard), never against a mock of `System.Diagnostics.Process`; the two best process libraries do exactly this ([CliWrap](#2-the-seam), [SimpleExec](#2-the-seam)) and `Process` has no seam to mock.
- Use **four test-side projects**: `UnitTests` (pure logic through an internal runner seam + `FakeTimeProvider`), `FakeCliTests` (real engine x real dummy), `ContractTests` (real pinned ocx), plus the `Ocx.Fake` exe; Python's third tier (acceptance against registries) is out of scope for v0.
- Reference the dummy with a **plain `ProjectReference`**: it copies `Dummy.dll`, `runtimeconfig.json`, `deps.json` and the apphost next to the tests. `ReferenceOutputAssembly="false"` copies the apphost but **not the dll** and the apphost then exits 154 "application to execute does not exist" (measured).
- Launch the dummy as `dotnet exec <dir>/Dummy.dll` for arch-neutral scenarios and as the apphost (`Dummy` / `Dummy.exe`) only for tests of executable resolution; do not use a file-based app (`dotnet run x.cs`): 1558 ms first run, ~230 ms cached versus 36-46 ms (measured).
- Resolve the `dotnet` host from `DOTNET_HOST_PATH`, falling back to the runtime directory three levels up; `DOTNET_HOST_PATH` is not set when the test exe is launched directly (the fallback was exercised, measured).
- The three engine hazards each get a test that is **red against a naive engine and green against the reference engine**: stderr flood (E1) deadlocks sequential reads at 8 s, `Kill(false)` orphans the grandchild (E3), an inherited pipe stalls `ReadToEnd` past 4 s (E7). All three also reproduce on Windows, where E3 shows up as a hang rather than an orphan.
- `Process.WaitForExitAsync` waits for pipe EOF **only** when `BeginOutputReadLine`/`BeginErrorReadLine` were used ([Process.cs `WaitUntilOutputEOF`](https://raw.githubusercontent.com/dotnet/runtime/v10.0.0/src/libraries/System.Diagnostics.Process/src/System/Diagnostics/Process.cs)); with your own chunked pumps it returns on process exit and you bound the drain yourself with `Task.WaitAsync(TimeSpan, TimeProvider)`.
- A bounded drain must keep what it already read: abandoning `ReadToEndAsync` returned an empty string while the child had written `parent done` (measured); use a chunked pump into a `StringBuilder`.
- Never set `ProcessStartInfo.StandardInputEncoding = Encoding.UTF8` when writing a secret to stdin: `Encoding.UTF8` has a preamble and the pipe receives `EF BB BF` first (measured on Linux and Windows); leave it null or use `new UTF8Encoding(false)`.
- Every delay, timeout and backoff takes a `TimeProvider` (`Task.Delay(TimeSpan, TimeProvider, CancellationToken)`, `new CancellationTokenSource(TimeSpan, TimeProvider)`, `Task.WaitAsync(TimeSpan, TimeProvider)`); enforce it with `Microsoft.CodeAnalysis.BannedApiAnalyzers` RS0030 (red/green measured); tests drive it with `FakeTimeProvider` from `Microsoft.Extensions.TimeProvider.Testing` (3 attempts, 1 s + 2 s backoff, ~0 s real).
- Framework: **xUnit v3 via `xunit.v3.mtp-v2` on Microsoft.Testing.Platform**, selected by `UseMicrosoftTestingPlatformRunner` plus `"test": {"runner": "Microsoft.Testing.Platform"}` in `global.json`. Without the global.json section `dotnet test` fails the build with "Testing with VSTest target is no longer supported" (measured).
- MTP mode flags: `--project`/`--solution`/`--test-modules`, `--report-trx` needs the TRX extension, `--logger trx` and `--report-trx` without an extension both exit **5** (measured); xUnit filters are `--filter-class/-method/-namespace/-trait/-query`.
- A filter that matches nothing exits **8** (measured) but an **all-skipped run exits 0** on SDK 10.0.401, so an unarmed contract tier looks green. Bake `--minimum-expected-tests 1` into `TestingPlatformCommandLineArguments` (per-module; skipped tests do not count, so all-skipped exits **9**); a *global* `--minimum-expected-tests` counts skipped tests and does not catch it (measured). On the .NET 11 RC1 SDK an all-skipped whole run exits 8 by default.
- The contract tier is a **separate project** gated by `OCX_SDK_CONTRACT=1`: `[Fact(SkipUnless = nameof(Armed), Skip = "<reason>")]` where `Armed` is a `public static bool` (xUnit1054 is an error otherwise); armed but binary missing must **fail**, not skip.
- The contract tier pins one ocx version in one constant, installs it with `setup-ocx` (as the Python SDK does), and asserts three things a fake cannot: the exit-code table, the presence-rule table against ocx's published schema, and the real process mechanics (timeout, big stderr), all hermetic (`OCX_HOME`, `DOCKER_CONFIG`, explicit env).
- Run the fake-cli tier on every OS/arch leg (Windows is where pipe-inheritance bugs live); run the contract tier at least on Linux and Windows; add a nightly job against `latest` via `OCX_TEST_VERSIONS`, as `ocx-sdk-python` does.

## Findings

### 1. Tier layout

The Python SDK has three tiers: **unit** (100 % coverage through injected seams: a fake `Popen`, injected clocks), **contract** (the real pinned binary, throwaway state, skipped without `OCX_SDK_CONTRACT=1`), **acceptance** (real registries, gated by `OCX_SDK_ACCEPTANCE=1`) ([ocx-sdk-python@80136dde4162:CLAUDE.md:12-14](/home/mherwig/dev/ocx-sdk-python/CLAUDE.md), [tests/contract/conftest.py:1-19,45-49](/home/mherwig/dev/ocx-sdk-python/tests/contract/conftest.py), [tests/acceptance/conftest.py:1-26](/home/mherwig/dev/ocx-sdk-python/tests/acceptance/conftest.py)). The brief's "fake-binary tier" does not exist in Python: its unit tier fakes `Popen` (`tests/unit/test_process.py:12-15`: "The kill ladder and the signal handling run against a fake `Popen` and an injected clock ... Three tests do spawn a real child"). Code wins over the brief.

.NET has no equivalent seam: `System.Diagnostics.Process` is a concrete class with no interface. So the C# layout adds a tier that Python gets for free from `_FakePopen`:

| C# project | Python equivalent | What it runs | Gate |
|---|---|---|---|
| `tests/Ocx.Sdk.UnitTests` | `tests/unit` | Pure logic: argv assembly, JSON parsers, wire-contract schema diff, exit-code mapping, retry policy with `FakeTimeProvider`, through an `internal` runner seam | always; no process spawned |
| `tests/Ocx.Sdk.FakeCliTests` | the 3 real-child tests in `test_process.py` plus `contract/test_process_contract.py` | The **production engine** against `Ocx.Fake`: E1/E3/E7, exit codes, stdin, encodings, cancellation, per OS/arch | always |
| `tests/Ocx.Sdk.ContractTests` | `tests/contract` | The SDK against the **pinned real ocx** | `OCX_SDK_CONTRACT=1`, else skipped with a stated reason |
| `tests/Ocx.Fake` | n/a | the dummy exe (not a test project) | n/a |

Names are `<Product>.<Tier>Tests`; the suffix is the grep handle. The Python contract tier is also the nightly canary: `OCX_TEST_VERSIONS` parametrizes the `ocx_exe` fixture (`tests/conftest.py:1-14,45-58`) and `acceptance.yml:11,43` runs it on `cron '0 3 * * *'` with `OCX_TEST_VERSIONS: latest`.

### 2. The seam

Corpus evidence, eight wrapper/SDK repos:

| Repo | How it tests process code | Cite |
|---|---|---|
| CliWrap | real dummy exe `CliWrap.Tests.Dummy` (CliFx-based, 10 commands), referenced with a plain `ProjectReference`; no injectable runner | `Tyrrrz__CliWrap@7dbc252fa773:CliWrap.Tests/CliWrap.Tests.csproj:24-25`, `CliWrap.Tests.Dummy/Program.cs:15-20` |
| SimpleExec | real dummy `Fixtures.Cli`, launched as `dotnet exec <Fixtures.Cli.dll>` | `adamralph__simple-exec@f80913246993:tests/Tests/Tests.csproj:4`, `tests/Tests/Fixtures/Cli.cs:5`, `tests/Tests/ExitCodes.cs:20` |
| MedallionShell | real `SampleCommand` exe | `madelson__MedallionShell@e45f1f6ffd4c:MedallionShell.Tests/MedallionShell.Tests.csproj:29` |
| Pulumi.Automation | abstract `PulumiCommand` + hand-written `PulumiCommandMock` for logic tests; `LocalPulumiCommand` over CliWrap in production | `pulumi__pulumi-dotnet@2a0dca84f09b:sdk/Pulumi.Automation/Commands/PulumiCommand.cs:12-28`, `sdk/Pulumi.Automation.Tests/Mocks/PulumiCommandMock.cs:11-31` |
| Testcontainers | real Docker for integration; platform skips via `[Fact(SkipUnless = ..., Skip = "...")]` | `testcontainers__testcontainers-dotnet@04cbb73fcc58:tests/Testcontainers.Tests/Unit/Builders/ComposeBuilderTest.cs:70` |

The audit already found the same split: fakes exist in 4 of 10 wrapper repos, while the two best process libraries test against real dummy executables ([exemplar-cli-wrappers-and-sdks.md:23](/home/mherwig/dev/grimoire-lore/.agents/worktrees/csharp/.agents/research/csharp-audit/exemplar-cli-wrappers-and-sdks.md)). Decision:

- Logic tests (tier 1) go through a small `internal interface IProcessRunner` (`Launch -> Result`), substituted by a hand-written fake that returns canned `Result`s. An interface rather than Pulumi's public abstract class, because the seam is not a public extension point (judgment, no source forces either; Pulumi publishes its abstract class because consumers subclass it).
- Anything about pipes, signals, exit codes, encodings and process trees (tier 2) must run the production engine on a real child. A fake runner cannot find E1/E3/E7; the red table in section 5 is the proof.

### 3. The dummy

One console project, behaviour chosen by `argv[0]`. The CliWrap dummy gets its verbs from CliFx; a 90-line `switch` has no dependency and starts faster. The fixture dummy (`Dummy/Program.cs`) has these verbs:

| Verb | Hazard it models |
|---|---|
| `exit <n>` | exit code + one stderr line |
| `cat <file>` | stdout payload from a recorded file (a captured `--format json` document) |
| `flood-stderr <bytes>` | E1: fill stderr far past the 64 KiB pipe buffer, then `done` on stdout |
| `sleep <ms>` | timeouts, cancellation |
| `grandchild-wait <pidfile>` | E3: spawn a grandchild with its own redirected stdio, write its pid to a file, wait |
| `hold-pipe <pidfile> <ms>` | E7: grandchild **inherits** stdout/stderr, parent exits at once |
| `ignore-sigterm` | POSIX: swallows SIGTERM/SIGINT with `PosixSignalRegistration`, so only a hard kill works |
| `emit <encoding> <text>` | raw bytes in a chosen encoding, preamble included |
| `echo-stdin` | hex of the first 3 stdin bytes: reveals a BOM the parent wrote |

Two details that are easy to omit and expensive when missing:

1. **Watchdog.** `_ = new Timer(_ => Environment.Exit(99), null, TimeSpan.FromSeconds(life), Timeout.InfiniteTimeSpan);` with `DUMMY_MAX_LIFE_SECONDS` (default 60). A red test, a debugger stop or a crashed test host must never leave a sleeping dummy or grandchild behind. After the naive-engine run (3 failures, children still blocked or sleeping) `pgrep -af Dummy` found no survivor.
2. **Self re-launch for grandchildren.** The dummy spawns itself: `Environment.ProcessPath` is `Dummy` for an apphost launch and `dotnet` for `dotnet exec`; in the second case it must prepend `exec <Assembly.Location>`. Without that the grandchild of a `dotnet exec` run would be `dotnet sleep 30000` and fail instantly.

Payload "from a file" keeps recorded ocx documents (`ocx --format json ...` captures) as plain fixture files instead of C# string literals.

### 4. Building and locating the dummy

Three options from the brief, all measured:

| Option | What lands in the test output dir | Spawn cost | Verdict |
|---|---|---|---|
| **A.** `<ProjectReference Include="../Ocx.Fake/Ocx.Fake.csproj" />` | `Dummy`, `Dummy.dll`, `Dummy.deps.json`, `Dummy.runtimeconfig.json` (+ `.pdb`) | apphost 36-40 ms, `dotnet exec Dummy.dll` 36-46 ms | **use** |
| **B.** same with `ReferenceOutputAssembly="false"` | `Dummy`, `Dummy.deps.json`, `Dummy.runtimeconfig.json` - **no `Dummy.dll`** | apphost exits **154**: `The application to execute does not exist: '.../Dummy.dll'` | trap |
| **C.** B plus `OutputItemType="Content" CopyToOutputDirectory="PreserveNewest"` | A's set | as A | works, but pointless over A |
| **D.** file-based app, `dotnet run dummy.cs` (.NET 10) | nothing; built into a temp `runfile` dir | **1558 ms** first, ~**230 ms** cached, and an extra `dotnet run` process sits between the test and the dummy | not for per-spawn use |

Option D is the new .NET 10 feature ([file-based apps](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/tutorials/file-based-programs): "the `dotnet` host builds the executable from your source file, stores build artifacts in a temporary folder, and then runs the created executable"). It is excellent for one-off scripts, wrong as a process fixture: the tree becomes `test -> dotnet run -> dummy`, so kill-tree tests would measure the SDK host instead of your engine.

**Location.** The dummy sits next to the test assembly: `Path.Combine(AppContext.BaseDirectory, "Dummy.dll")` for `dotnet exec`, and `Path.Combine(AppContext.BaseDirectory, OperatingSystem.IsWindows() ? "Dummy.exe" : "Dummy")` for the apphost. CliWrap derives the same path from the assembly location: `Path.ChangeExtension(Assembly.GetExecutingAssembly().Location, OperatingSystem.IsWindows() ? "exe" : null)` (`Tyrrrz__CliWrap@7dbc252fa773:CliWrap.Tests.Dummy/Program.cs:15-20`); SimpleExec uses `Path.Combine(AppContext.BaseDirectory, "Fixtures.Cli.dll")` (`Cli.cs:5`).

**Host RID, every CI leg.** Nothing to configure: `dotnet test` builds the referenced exe in the same configuration on the machine it runs on, and the SDK generates the apphost for the SDK's host RID. SimpleExec's CI runs `macos-26`, `ubuntu-24.04-arm` and `windows-11-arm` and only ever uses `dotnet exec` (`adamralph__simple-exec@f80913246993:.github/workflows/ci.yml:18-22`), which is arch-neutral. Do not pass `-r <other-rid>` to a test run: an apphost for another RID cannot execute on the host (inference; the cross-RID case was not run).

**The `dotnet` host.** `dotnet exec` needs a `dotnet` that is not necessarily on PATH. `DOTNET_HOST_PATH` is set by `dotnet test`/`dotnet run`, not when the test exe is launched directly. The fixture falls back to `RuntimeEnvironment.GetRuntimeDirectory()/../../..` + `dotnet[.exe]` (runtime dir is `<root>/shared/Microsoft.NETCore.App/<ver>/`); a direct run with `DOTNET_HOST_PATH` unset passed 10/10 (measured). SimpleExec just passes the bare string `"dotnet"` and relies on PATH.

### 5. What the dummy must prove: E1, E3, E7

The audit measured the three hazards on Linux ([exemplar-cli-wrappers-and-sdks.md:97-99](/home/mherwig/dev/grimoire-lore/.agents/worktrees/csharp/.agents/research/csharp-audit/exemplar-cli-wrappers-and-sdks.md)). The harness turns them into tests that fail on a naive engine:

```csharp
// RED: the three classic mistakes in one class (Engine/Engines.cs NaiveEngine)
var stdout = p.StandardOutput.ReadToEnd();   // E1: stderr is not drained while we block here
var stderr = p.StandardError.ReadToEnd();
p.Kill(false);                               // E3: grandchild survives
p.WaitForExit();                             // E7: waits for EOF, a grandchild may hold the pipe
```

```csharp
// GREEN (ReferenceEngine): concurrent chunked pumps, tree kill, bounded post-exit drain
var pumps = Task.WhenAll(outPump.Start(), errPump.Start());          // both pipes drain at once (E1)
using var reg = ct.Register(() => { try { p.Kill(entireProcessTree: true); } catch (InvalidOperationException) { } }); // E3
await p.WaitForExitAsync(CancellationToken.None);                    // does not wait for EOF here
try { await pumps.WaitAsync(_grace, _time); } catch (TimeoutException) { abandoned = true; }  // E7
```

Why `WaitForExitAsync` is safe here: its private `WaitUntilOutputEOF` awaits `_output.EOF`/`_error.EOF` only `if (_output is not null)` / `if (_error is not null)`, and those fields are created only by `BeginOutputReadLine`/`BeginErrorReadLine` ([Process.cs, v10.0.0](https://raw.githubusercontent.com/dotnet/runtime/v10.0.0/src/libraries/System.Diagnostics.Process/src/System/Diagnostics/Process.cs)). The documented hang - "WaitForExit involves waiting for the output to reach EOF, which won't happen because Process3 is keeping it alive" - is [dotnet/runtime#29232](https://github.com/dotnet/runtime/issues/29232): closed 2023-03-03, milestone Future, no API change; its suggested workarounds are redirecting the grandchild, closing the parent's streams, or `BeginOutputReadLine`. Use whichever model you choose consistently: **own pumps + bounded drain**, or Begin*ReadLine + a timeout around `WaitForExitAsync`.

`Process.Kill(true)` kills descendants but `WaitForExit`/`HasExited` "do not reflect the status of descendant processes" and `AggregateException` is thrown if not every descendant could be terminated; processes the caller cannot inspect are "silently skipped" ([Process.Kill](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process.kill?view=net-10.0)). The E3 test therefore polls the grandchild pid for up to 5 s instead of asserting immediately.

Three non-obvious engine facts the tests found:

- **Abandoning must not lose data.** First draft of `ReferenceEngine` used `ReadToEndAsync` and returned `Stdout == ""` when the E7 grace expired, although the child had printed `parent done` (observed failure: `Assert.Contains() Failure: Sub-string not found; String: ""`). A chunked pump (`ReadAsync(char[])` into a locked `StringBuilder`) keeps the partial text; the shipped engine has it.
- **On Windows E3 fails differently.** With the naive engine the E3 test times out (`did not complete within 10s`) rather than reporting an orphan: the grandchild is created with handle inheritance and holds the root's stdout pipe, so `ReadToEnd` never returns (`evidence-windows-red.txt`). Same test, same fix, different symptom; the reference engine is green on Windows.
- **`ignore-sigterm` is POSIX only.** The test uses `Assert.SkipWhen(OperatingSystem.IsWindows(), "POSIX signals only: ...")`; on Windows the run shows `skipped: 1` with the reason (`evidence-windows-green.txt`).

Each scenario test enforces its own wall-clock deadline (`Task.WaitAsync(budget)` then `Assert.Fail`), because xUnit's own timeouts are cooperative: "A timed-out test does not stop running forcefully", so process-spawning code must observe `TestContext.Current.CancellationToken` and clean up children itself ([xUnit v3 what's new](https://xunit.net/docs/getting-started/v3/whats-new)). Cleanup of pid files and children goes in `finally`.

### 6. Stdin encoding: the BOM trap

The VSTest-to-MTP migration page documents a trap: with MTP "that encoding [the console code page, e.g. 65001] is always preserved", and a child started with a non-UTF-8 stdin encoding "might get ... the UTF8 BOM", especially on .NET Framework; workaround `Console.InputEncoding = new UTF8Encoding(encoderShouldEmitUTF8Identifier: false);` ([migration guide](https://learn.microsoft.com/en-us/dotnet/core/testing/migrating-vstest-microsoft-testing-platform)).

On .NET 10 the part the SDK controls is simpler and measured: `psi.StandardInputEncoding = Encoding.UTF8` **writes a BOM into the pipe** because `Encoding.UTF8` carries a preamble and a pipe is not seekable; leaving it null does not (also under `chcp 65001` on Windows).

| `StandardInputEncoding` | bytes the dummy saw (first 3) | Linux | Windows 10.0.102 |
|---|---|---|---|
| `Encoding.UTF8` | `EF BB BF` | red | red |
| `null` (default) | `73 33 63` (`s3c`) | green | green, also under `chcp 65001` |
| `new UTF8Encoding(false)` | `73 33 63` | green | green |

This matters beyond tests: ocx takes secrets through stdin only ([ocx-cli-contract.md §8 item 2](/home/mherwig/dev/grimoire-lore/.agents/worktrees/csharp/.agents/research/csharp-audit/ocx-cli-contract.md)); a BOM silently corrupts a token. The `echo-stdin` verb is the regression test.

### 7. TimeProvider and FakeTimeProvider

`TimeProvider` is in the box from .NET 8; for older targets it ships in `Microsoft.Bcl.TimeProvider` (.NET 5-7, .NET Framework 4.6.2+, netstandard2.0) ([TimeProvider overview](https://learn.microsoft.com/en-us/dotnet/standard/datetime/timeprovider-overview)). Injectable overloads: `CancellationTokenSource(TimeSpan, TimeProvider)`, `Task.Delay(TimeSpan, TimeProvider[, CancellationToken])`, `Task.WaitAsync(TimeSpan, TimeProvider[, CancellationToken])`. The fake is `FakeTimeProvider` in package `Microsoft.Extensions.TimeProvider.Testing` (10.10.0 on nuget.org on 2026-10-11; API: `Advance(TimeSpan)`, `SetUtcNow`, `AdjustTime`, `AutoAdvanceAmount`, `CreateTimer`) ([API page](https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.time.testing.faketimeprovider?view=net-10.0-pp), which lists net-8.0 as applicable).

The Python SDK's rule "a real `time.sleep` in a unit test is a defect, so the drivers are exercised with recorders that return instantly" (`ocx-sdk-python@80136dde4162:tests/unit/test_retry.py:7-9`) has an exact C# form:

```csharp
// GREEN (Engine/Engines.cs Retry.RunAsync): the backoff reads the injected clock
await Task.Delay(policy.DelayFor(n), time, ct);
// RED  (Retry.RunWallClockAsync): same logic, ignores the provider -> the fake clock never fires, 3.0 s of real sleeping
await Task.Delay(policy.DelayFor(n), ct);
```

```csharp
// the test: three attempts (75, 75, 0), 1 s + 2 s backoff, driven by advancing the FAKE clock
var fake = new FakeTimeProvider();
var task = Retry.RunAsync(Attempt, new RetryPolicy(5, TimeSpan.FromSeconds(1)), fake, TestContext.Current.CancellationToken);
while (!task.IsCompleted && real.Elapsed < TimeSpan.FromSeconds(10)) { fake.Advance(TimeSpan.FromSeconds(1)); await Task.Yield(); }
Assert.True(real.Elapsed < TimeSpan.FromSeconds(1.5));        // red: 00:00:03.0076483
```

Two traps: a single `Advance` before the continuation has registered the next timer is lost, so loop until completion with a real-time ceiling; and every retry/timeout in the SDK, not just the visible one, must take the provider (see rule 13 for the analyzer that enforces it). 75 is ocx's `TempFail`, "the ONLY code where automated retry is safe" ([ocx-cli-contract.md:47](/home/mherwig/dev/grimoire-lore/.agents/worktrees/csharp/.agents/research/csharp-audit/ocx-cli-contract.md)).

### 8. Framework and runner

**Choice: xUnit v3 on MTP (`xunit.v3.mtp-v2`).** Evidence: 12 of the 35 corpus repos carry MTP markers and 12 use xUnit v3 ([shifts.md:43,171](/home/mherwig/dev/grimoire-lore/.agents/worktrees/csharp/.agents/research/csharp-topic-map/shifts.md)); the two reference process-library tests split exactly along the era line: CliWrap is still xUnit v2 + `Microsoft.NET.Test.Sdk` + `xunit.runner.visualstudio` + `Xunit.SkippableFact` on VSTest (`Tyrrrz__CliWrap@7dbc252fa773:CliWrap.Tests/CliWrap.Tests.csproj:15-20`), SimpleExec is `xunit.v3.mtp-v2` 4.0.1 with `UseMicrosoftTestingPlatformRunner` and `global.json` `"test": {"runner": "Microsoft.Testing.Platform"}` (`adamralph__simple-exec@f80913246993:tests/Directory.Build.props:9,28`, `Directory.Packages.props:15`, `global.json:5-8`); xunit itself, coverlet and testfx set the same runner in `global.json:7`. MSTest (>= 3.2, `EnableMSTestRunner`) and NUnit3TestAdapter (>= 5.0, `EnableNUnitRunner`) are equally valid on MTP ([migration guide](https://learn.microsoft.com/en-us/dotnet/core/testing/migrating-vstest-microsoft-testing-platform)); xUnit v3 wins here on three concrete features the harness uses: `Assert.SkipWhen/SkipUnless` and `[Fact(SkipUnless=..., Skip=...)]`, `TestContext.Current.CancellationToken` with analyzer xUnit1051, and test projects that are plain executables ([what's new](https://xunit.net/docs/getting-started/v3/whats-new)).

Package map ([xunit.net MTP page](https://xunit.net/docs/getting-started/v3/microsoft-testing-platform)): `xunit.v3` = MTP v1 in 3.x and MTP v2 from 4.0.0; `xunit.v3.mtp-v2` pins v2 explicitly; `xunit.v3.mtp-off` disables MTP. Measured: `xunit.v3.mtp-v2` 4.0.2 restores Microsoft.Testing.Platform **2.5.1**; both are the latest on nuget.org on 2026-10-11.

Project file (the fixture's, builds on SDK 10.0.401):

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <UseMicrosoftTestingPlatformRunner>true</UseMicrosoftTestingPlatformRunner>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="xunit.v3.mtp-v2" Version="4.0.2" />
    <PackageReference Include="Microsoft.Extensions.TimeProvider.Testing" Version="10.10.0" />
  </ItemGroup>
</Project>
```

```json
{ "sdk":  { "version": "10.0.401", "rollForward": "latestPatch", "allowPrerelease": false },
  "test": { "runner": "Microsoft.Testing.Platform" } }
```

**Invocation shapes (SDK 10, MTP mode)** ([dotnet test (MTP)](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-test-mtp), [dotnet test modes](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-with-dotnet-test)):

```
dotnet test --solution Ocx.slnx -c Release
dotnet test --project tests/Ocx.Sdk.FakeCliTests --filter-method '*E3*'
dotnet test --test-modules "**/bin/**/Release/net10.0/*Tests.dll"     # already-built, no project restore state needed
dotnet test --project tests/Ocx.Sdk.ContractTests -- --report-trx      # requires Microsoft.Testing.Extensions.TrxReport
```

Facts: the extra `--` is optional in MTP mode but "keep it to forward test application arguments unambiguously"; extension options (`--report-trx`, `--coverage`, `--hangdump`) exist only if the extension package is registered, otherwise **exit 5**; VSTest flags are gone (`--logger`, `--collect`, `--blame`). Measured on 10.0.401: `--report-trx` without the package and `--logger trx` both exit 5. Mixed frameworks in one solution need `TestingPlatformCommandLineArguments` conditions; do not mix.

**What happens if `global.json` lacks the section.** The build fails: `error : Testing with VSTest target is no longer supported by Microsoft.Testing.Platform on .NET 10 SDK and later. If you use dotnet test, you should opt-in to the new dotnet test experience.` (measured, `norunner/`, from `Microsoft.Testing.Platform.MSBuild.targets(395,5)`).

**Per-framework filters.** xUnit on MTP: `--filter-class`, `--filter-not-class`, `--filter-method`, `--filter-not-method`, `--filter-namespace`, `--filter-trait`, `--filter-query` ([migration guide](https://learn.microsoft.com/en-us/dotnet/core/testing/migrating-vstest-microsoft-testing-platform)). Measured quirks: `--filter-method Passes` matched nothing and exited 8, `--filter-method '*Passes'` and `--filter-method ZeroTests.Unit.Passes` passed - the argument is a fully-qualified name or wildcard. The docs say xUnit "does not support the same filter format [as VSTest] when running with MTP", yet `xunit.v3.mtp-v2` 4.0.2 `--help` lists `--filter  Filter using the VSTest filter syntax` and `--filter "FullyQualifiedName~Contract"` worked (see Contested).

**The VSTest era is over for new work.** "The support of running under this mode will be removed in MTP version 2 if run with .NET 10 SDK"; MTP mode "is only compatible with MTP version 1.7.0 and later" and "It is an error if any of the test projects use VSTest" ([dotnet test modes](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-with-dotnet-test), [dotnet test (MTP)](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-test-mtp)). `Microsoft.NET.Test.Sdk` added to an MTP xUnit v3 project still builds and runs (measured) - it is dead weight, not breakage; do not add it.

### 9. The zero-test gate

MTP exit codes ([troubleshooting](https://learn.microsoft.com/en-us/dotnet/core/testing/microsoft-testing-platform-troubleshooting#exit-codes)), source in `microsoft__testfx@7226b0c74729:src/Platform/Microsoft.Testing.Platform/Helpers/ExitCodes.cs:56,61`: 0 ok, 2 test failed, 3 aborted, 5 invalid command line, **8 zero tests**, **9 fewer than `--minimum-expected-tests`**, 13 max failed tests (SDK 11 / MTP 2.4), 14 coverage threshold.

Measured on SDK 10.0.401 with `xunit.v3.mtp-v2` 4.0.2 (MTP 2.5.1), single module:

| Run | Exit |
|---|---|
| right filter, 1 test | 0 |
| filter matches nothing | **8** |
| contract tier unarmed (the only test skipped) | **0** - silent green |
| same, global `dotnet test --minimum-expected-tests 1` | **0** (global count includes skipped) |
| same, per-module `-- --minimum-expected-tests 1` | **9** |
| same, per-module `-- --zero-tests-policy strict` | **8** |
| `TestingPlatformCommandLineArguments` = `--minimum-expected-tests 1` baked in the csproj, run through `dotnet test` | **9**; armed (`OCX_SDK_CONTRACT=1`): 0 |
| same csproj, test exe run directly | 0 (the property only reaches `dotnet test`) |
| .NET 11.0.100-rc.1 SDK, unarmed contract tier, no flags | **8** |
| .NET 11.0.100-rc.1 SDK, per-module min | 9 |

This is the design comment in the platform source: "`allow-skipped` ... (the default): skipped count as run, so only a run where nothing was discovered ... yields exit code 8 ... `strict`: ... an all-skipped (or zero-test) run ... yields exit code 8" (`TestApplicationResult.cs:150-160,217-224`); an explicit minimum "supersedes the ZeroTests (8) verdict" and yields 9 (`:201-212`). Docs: global minimum "includes skipped tests", per-module "excludes skipped tests"; `--minimum-expected-tests 0` is invalid; the .NET 11 SDK decides the whole-run zero-tests verdict from aggregated results, so one empty module in a multi-module run no longer fails it, and an all-skipped whole run exits 8 ([dotnet test (MTP)](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-test-mtp#whole-run-and-per-module-minimums)).

Consequences: (1) exit 8 is the gate that catches a broken filter, a renamed class or an AI-written wrong `--filter-*`; never `--ignore-exit-code 8` it away (the docs list that as the migration escape hatch, which is exactly why an agent reaches for it); (2) on SDK 10 an unarmed contract tier is invisible unless a per-module minimum is baked in; (3) pick the minimum as "at least 1", not the current count, or every added test edits CI.

The docs attribute `--zero-tests-policy` to "MTP 4.3.0 and later"; the option is present in the platform 2.5.1 bundled with xUnit v3 4.0.2 (`--info` lists it under the 2.5.1 provider). The "4.x" is the testfx/MSTest train, not the platform's own number (Contested).

### 10. The contract tier

**Gate and skip.** Python gates by path in a `conftest.py` hook (`pytest_collection_modifyitems`, `tests/contract/conftest.py:45-49`) and skips, never fails, without `OCX_SDK_CONTRACT=1`. The C# equivalent is attribute-level, in a dedicated project:

```csharp
public static class Contract
{
    public static bool Armed => Environment.GetEnvironmentVariable("OCX_SDK_CONTRACT") == "1";   // public static bool: xUnit1054
}
[Fact(SkipUnless = nameof(Contract.Armed), Skip = "contract tier: set OCX_SDK_CONTRACT=1 and put the pinned ocx on PATH")]
public void Exit_codes_match_the_table() { ... }
```

Measured: unarmed -> `skipped ZeroTests.Contract.Exit_codes_match_the_table` with that reason, exit 0; armed -> runs. `SkipUnless`/`SkipWhen` must name a **public static property returning bool** or xUnit1054 fails the build ([xUnit1054](https://xunit.net/xunit.analyzers/rules/xUnit1054); measured: `error xUnit1054` with `TreatWarningsAsErrors=false`, i.e. error by default). Testcontainers uses the same shape for platform skips (`ComposeBuilderTest.cs:70`). Setting both `SkipUnless` and `SkipWhen` fails at run time ([what's new](https://xunit.net/docs/getting-started/v3/whats-new)). Dynamically skipped tests still run the full pipeline including fixtures, so the armed check should be the first thing a collection fixture does, not an `Assert.Skip` deep in setup.

**Armed but broken must fail.** If `OCX_SDK_CONTRACT=1` and the pinned ocx is missing or the wrong version, throw. A skip there is the same silent-green hole as section 9. The Python `ocx_exe` fixture provisions the binary itself (`bootstrap.ensure()`), so "a green contract run is also evidence the bootstrap layer works" (`tests/conftest.py:3-9, fixture at :45-58`).

**Pin.** One constant (`TestedOcxVersion = "0.6.2"` in Python: `_types.py:30-33`), mirrored in every workflow's `setup-ocx` step with a comment `# = TESTED_OCX_VERSION` and guarded by `test_version_matches_the_tested_pin` (`.github/workflows/ci.yml:28-30,62-64,86-88`). The C# SDK should keep the same three-part contract: constant, CI pin, drift test. The contract job in Python runs on `ubuntu-latest` only (`ci.yml:81-90`) while unit tests run on three OSes (`ci.yml:56`); because C# process mechanics are OS-specific (section 5), run the fake-cli tier on every leg and the contract tier on at least Linux + Windows. Nightly canary: `OCX_TEST_VERSIONS=latest` (`acceptance.yml:11,43`).

**What it asserts** (the things a fake cannot):

1. **Exit-code table**, each row provoked offline, none via mocks (`tests/contract/test_exit_codes_contract.py:1-14`, 12.7 KB): ocx's codes 0, 64, 65, 69, 74, 75, 77, 78, 79, 80, 81, 82 ([ocx-cli-contract.md:41-52](/home/mherwig/dev/grimoire-lore/.agents/worktrees/csharp/.agents/research/csharp-audit/ocx-cli-contract.md)); rows that need a registry or cosign key are *named at the bottom of the file* as recorded gaps, not silently dropped. The table is version-keyed: 82 changed meaning between 0.6.5 and main, so the assertion is "for pinned version V, code X means Y", not a bare number.
2. **Presence-rule table** (the artefact the Python digest calls highest-value for the port): `T` always present -> required; `Option<T>` always, null -> nullable; `Option<T>` + `skip_serializing_if` -> optional. Pinned by a vendored `reports.v1.json` schema (279,260 bytes) and a schema-diff test that fails on *phantom* (parser reads a key ocx never publishes) and *unsafe* (parser requires a key ocx may omit) ([python-sdk-digest.md:124](/home/mherwig/dev/grimoire-lore/.agents/worktrees/csharp/.agents/research/csharp-audit/python-sdk-digest.md)). That diff belongs to tier 1 (no binary needed); the contract tier adds "real output of the pinned binary parses with the same models".
3. **Real mechanics** with nothing injected: a real timeout on a hanging child, big stderr, shared handle across threads (`test_process_contract.py:46-80: `test_timeout_kill_ladder`, `test_pump_captures_all_lines` with `_LINES = 500``). In C# these are the E1/E3/E7 scenarios again, now against the real executable (`ocx exec -- sh -c 'sleep 60'` style, POSIX-only rows guarded with `Assert.SkipWhen`).

**Hermetic.** Throwaway `OCX_HOME`, throwaway `DOCKER_CONFIG` ("the ambient one can carry a credential helper that turns an offline `logout` into an exit 80"), projects under a temp dir, and an explicit minimal environment instead of the ambient one (`tests/contract/conftest.py:15-19,74-90`).

**Wire quirks the real binary exposes.** `ocx exec` forwards the child's exit code unchanged, so `exit 64` from the child is indistinguishable from `UsageError`; `index list <missing>` exits 0; 17 command modes are `report_then_fail` ([ocx-cli-contract.md:55-61](/home/mherwig/dev/grimoire-lore/.agents/worktrees/csharp/.agents/research/csharp-audit/ocx-cli-contract.md)). The contract tier is where those become permanent assertions.

### 11. Verified on the toolchain

Fixture root: `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-crossplatform-fake-cli-harness/`. SDK 10.0.401 via `run.sh` (Linux x64, MTP 2.5.1, xunit.v3.mtp-v2 4.0.2). Replay everything with `cd <fixture root> && ./run-all.sh` (output in `evidence.txt`).

| # | Claim | Red (command, observed) | Green (command, observed) |
|---|---|---|---|
| 1 | E1 stderr flood deadlocks sequential reads | `HARNESS_ENGINE=naive run.sh dotnet test --project Harness.Tests --no-build` -> `failed ...E1_stderr_flood_does_not_deadlock (8s 002ms) did not complete within 8s`; exit 2 | same without the env var (ReferenceEngine) -> `total: 10 failed: 0 succeeded: 10`, exit 0 |
| 2 | E3 `Kill(false)` orphans the grandchild | same naive run -> `failed ...E3_cancellation_kills_the_grandchild (5s 276ms) grandchild 470173 survived cancellation (orphaned)` | green run above |
| 3 | E7 held pipe stalls an unbounded wait | same naive run -> `failed ...E7_pipe_held_by_grandchild_is_bounded (4s 125ms) did not complete within 4s`; totals `failed: 3 succeeded: 7`, exit 2 | green run above (E7 returns exit 0, `parent done`, in about the 500 ms grace) |
| 4 | `Encoding.UTF8` on stdin writes a BOM | `HARNESS_STDIN_ENC=utf8 ... --filter-method '*BOM'` -> `Expected: "733363"  Actual: "EFBBBF"`, exit 2 | default (`UTF8Encoding(false)`) and `HARNESS_STDIN_ENC=default` (null) -> `succeeded: 1`, exit 0 |
| 5 | retry delay must use the injected TimeProvider | `HARNESS_RETRY=wallclock ... --filter-method '*fake_clock'` -> `failed (3s 023ms) real time spent: 00:00:03.0076483`, exit 2 | default -> `succeeded: 1`, exit 0 (3 attempts, 1 s + 2 s fake backoff) |
| 6 | exit 8 catches a broken filter | `dotnet test --project ZeroTests --no-build --filter-class ZeroTests.Nope` -> `Exit code: 8`, `total: 0` | `--filter-class ZeroTests.Unit` -> `total: 1 succeeded: 1`, exit 0 |
| 7 | all-skipped contract tier is silent green | `--filter-class ZeroTests.Contract` -> `skipped: 1`, **exit 0**; with global `--minimum-expected-tests 1` -> exit 0 | per-module `-- --minimum-expected-tests 1` -> `Exit code: 9`; `-- --zero-tests-policy strict` -> `Exit code: 8`; baked `TestingPlatformCommandLineArguments` -> exit 9 |
| 8 | `global.json` must carry `test.runner` | `cd norunner && run.sh dotnet test` -> `error : Testing with VSTest target is no longer supported by Microsoft.Testing.Platform on .NET 10 SDK and later`, exit 1 | root `global.json` with the section -> runs, exit 0 |
| 9 | `ReferenceOutputAssembly="false"` loses the dll | variant B: `variants/B/bin/Debug/net10.0/Dummy exit 7` -> `The application to execute does not exist: '.../Dummy.dll'`, rc 154 | variant C (`OutputItemType="Content" CopyToOutputDirectory="PreserveNewest"`) and default A -> `exiting with 7`, rc 7 |
| 10 | banned wall-clock APIs (RS0030) | `BannedApiAnalyzers` 4.14.0 + `BannedSymbols.txt`: `error RS0030: The symbol 'Task.Delay(TimeSpan, CancellationToken)' is banned` and `... 'CancellationTokenSource.CancellationTokenSource(TimeSpan)' is banned`, exit 1 | `Task.Delay(span, time, ct)` + `new(span, time)` -> `Build succeeded`, no RS0030 |
| 11 | xUnit1051 flags tests that drop the token | `variants/X` `Task.Delay(1)` in a `[Fact]` -> `T.cs(4,45): warning xUnit1051` (warning by default; error with `.editorconfig` `dotnet_diagnostic.xUnit1051.severity = error`) | `Task.Delay(1, TestContext.Current.CancellationToken)` -> no diagnostic |
| 12 | xUnit1054: skip property must be public static bool | `variants/S`: `static bool HasOcx` -> `error xUnit1054` | `ZeroTests`: `public static bool HasOcx` -> `Build succeeded` |
| 13 | VSTest-era flags | `--logger trx` -> `Exit code: 5`; `--report-trx` w/o extension -> `Exit code: 5` | n/a |
| 14 | SDK 11.0.100-rc.1 differs | unarmed contract tier, no flags -> exit **8** (10.0.401: 0) | per-module min -> 9 |

Red/green pairs watched: **12** (rows 1-12; row 1-3 are one engine swap counted as three pairs; 13 and 14 are single observations). Only #1-#3 needed a code change between red and green; the others flip an env var, filter, flag or one line.

Windows host (SDK 10.0.102, `cmd.exe` from `C:\Users\ecom\csharp-wintest\fakecli`; the host has **no NuGet source configured** - `dotnet nuget list source` says "No sources found" - so the staged copy carries a `nuget.config` pointing at nuget.org; without it restore fails NU1100):

- Green, reference engine: `total: 10 failed: 0 succeeded: 9 skipped: 1` (the SIGTERM test skipped with its reason), exit 0 (`evidence-windows-green.txt`).
- Red, naive engine: E1, E3, E7 fail (`failed with 3 error(s)`, exit 2); E3 as a **hang** (`Expected: typeof(OperationCanceledException) Actual: typeof(Xunit.Sdk.FailException) ---- did not complete within 10s`) rather than an orphan.
- BOM: `utf8` red (`EFBBBF`), `default`, `nobom`, and `default` under `chcp 65001` green.
- Zero tests: broken filter exit 8, all-skipped unarmed exit 0, per-module minimum exit 9 (`evidence-windows-red.txt`).

During development one more red was observed and fixed in the engine (not in `run-all.sh`): the `ReadToEndAsync`-based `ReferenceEngine` returned `Stdout == ""` on E7 (see section 5).

## Normative guidance candidates

Verification commands use ripgrep (`rg`, `-P` for PCRE2 look-ahead) and were each run against the fixture tree. On this fleet the rtk shell hook can rewrite a bare `rg` into `grep` (which then rejects `--glob`): call the real binary, `/home/mherwig/.ocx/toolchain/active/bin/rg`, or `rtk proxy rg ...`.

Layout and seam

1. **Rule:** The SDK's test side is `tests/Ocx.Sdk.UnitTests`, `tests/Ocx.Sdk.FakeCliTests`, `tests/Ocx.Sdk.ContractTests` and the non-test exe `tests/Ocx.Fake`. *Why:* each tier has a different gate, matrix and failure meaning. *Verify:* `test "$(find tests -maxdepth 2 -name '*Tests.csproj' | wc -l)" -ge 3 && test -f tests/Ocx.Fake/Ocx.Fake.csproj && rg -n -e '<OutputType>Exe</OutputType>' tests/Ocx.Fake/Ocx.Fake.csproj`.
2. **Rule:** Tier-2 tests run the production engine against `Ocx.Fake`; they contain no mocking library and no hand-written fake runner. *Why:* a fake runner cannot find pipe, signal or tree bugs (E1/E3/E7 are invisible to it). *Verify:* `rg -n -e 'Mock<' -e 'Substitute\.For<' -e 'class Fake[A-Za-z]*Runner' tests/Ocx.Sdk.FakeCliTests` returns nothing (exit 1).
3. **Rule:** Production code never lets tests call `Process.Start`; test code starts processes only through the engine under test or one `Support` helper. *Why:* a second spawn path in tests re-introduces the naive pattern unreviewed. *Verify:* `rg -n -e 'Process\.Start\(' tests --glob '*.cs' --glob '!**/Support*.cs'` returns nothing.
4. **Rule:** `Ocx.Fake` implements one argv verb per hazard (`exit`, `cat`, `flood-stderr`, `sleep`, `grandchild-wait`, `hold-pipe`, `ignore-sigterm`, `emit`, `echo-stdin`) and carries a self-exit watchdog. *Why:* a leaked dummy poisons later runs; the verbs are the spec of what the engine must survive. *Verify:* `rg -c -e '"flood-stderr"' -e '"grandchild-wait"' -e '"hold-pipe"' -e '"echo-stdin"' tests/Ocx.Fake --glob '*.cs'` is >= 4 and `rg -n -e 'Environment\.Exit' -e 'MAX_LIFE' tests/Ocx.Fake --glob '*.cs'` is non-empty.

Building and locating the dummy

5. **Rule:** Reference the dummy with a plain `ProjectReference`; `ReferenceOutputAssembly="false"` is allowed only together with `CopyToOutputDirectory`. *Why:* without it the apphost is copied but `Dummy.dll` is not (rc 154). *Verify:* `rg -n -P 'ReferenceOutputAssembly="false"(?!.*CopyToOutputDirectory)' tests --glob '*.csproj'` returns nothing (measured: matches variant B only).
6. **Rule:** Locate the dummy from `AppContext.BaseDirectory`; no `bin/Debug/netX` relative paths, no hard-coded `.exe`. *Why:* TFM, configuration and OS vary per leg. *Verify:* `rg -n -e 'AppContext\.BaseDirectory' tests/Ocx.Sdk.FakeCliTests --glob '*.cs'` non-empty and `rg -n -P '(bin[/\\]+(Debug|Release)|\.\.[/\\]+Ocx\.Fake)' tests --glob '*.cs'` returns nothing; `rg -n -e '"Ocx\.Fake\.exe"' -e '"Dummy\.exe"' tests --glob '*.cs' | rg -v -e 'IsWindows'` returns nothing.
7. **Rule:** Launch the dummy as `<dotnet> exec <Dll>` for scenario tests and as the apphost only in tests of executable resolution, with the `.exe` suffix chosen by `OperatingSystem.IsWindows()`. *Why:* `dotnet exec` is arch-neutral across x64/arm64 runners; the apphost proves path/extension handling. *Verify:* reading heuristic: `rg -n -e '"exec"' -e 'IsWindows\(\) \? "' tests/Ocx.Sdk.FakeCliTests --glob '*.cs'` shows both.
8. **Rule:** Resolve the `dotnet` host from `DOTNET_HOST_PATH`, then from `RuntimeEnvironment.GetRuntimeDirectory()` three levels up; not from a bare `"dotnet"` on PATH. *Why:* `DOTNET_HOST_PATH` is unset when a test exe is launched directly or from an IDE. *Verify:* `rg -n -e 'DOTNET_HOST_PATH' tests --glob '*.cs'` non-empty and `rg -n -e 'ProcessStartInfo\("dotnet' -e 'FileName = "dotnet"' tests --glob '*.cs'` returns nothing.
9. **Rule:** Do not use file-based apps (`dotnet run x.cs`, `#:package`) as the process fixture. *Why:* 230-1558 ms per spawn and an extra SDK process in the tree. *Verify:* `rg -n -e 'dotnet run' -e '#:package' -e '#:project' tests .github --glob '*.{cs,yml,yaml,sh,cmd,ps1}'` returns nothing.

Engine behaviours the tests pin

10. **Rule:** Tier 2 contains one test each for stderr flood (>= 200 000 B), grandchild-after-cancel and pipe-held-by-grandchild, named with the `E1_`, `E3_`, `E7_` prefixes. *Why:* these are the three failures a naive engine ships. *Verify:* `rg -o -e 'E1_\w+' -e 'E3_\w+' -e 'E7_\w+' tests/Ocx.Sdk.FakeCliTests --glob '*.cs' | sort -u | wc -l` is >= 3 (measured: 3 on the fixture); after touching the engine, swap in the naive engine once and confirm the three go red (`run-all.sh` does this).
11. **Rule:** Every process-spawning test enforces its own wall-clock deadline with `Task.WaitAsync(timeout)` and cleans children and pid files in `finally`. *Why:* xUnit timeouts are cooperative and do not stop a blocked read. *Verify:* `rg -n -e 'WaitAsync\(' tests/Ocx.Sdk.FakeCliTests --glob '*.cs'` non-empty and `rg -c -e 'finally' tests/Ocx.Sdk.FakeCliTests --glob '*.cs'` >= the number of tests that write pid files.
12. **Rule:** The engine never uses bare `Kill()`/`Kill(false)`, synchronous `ReadToEnd()`, or an unbounded post-exit pipe wait; it kills with `Kill(entireProcessTree: true)` and bounds the drain, retaining partial output. *Why:* E3, E1, E7 and the data-loss-on-abandon bug. *Verify:* `rg -n -P '\.Kill\(\s*(false)?\s*\)|\.ReadToEnd\(\)' src` returns nothing; `rg -n -e 'entireProcessTree: true' src` and `rg -n -e 'WaitAsync\(' src` non-empty; plus `BannedSymbols.txt` line `M:System.Diagnostics.Process.Kill();...` with RS0030 (error by default, measured).
13. **Rule:** Every delay/timeout in `src/` takes a `TimeProvider` (`Task.Delay(TimeSpan, TimeProvider, CancellationToken)`, `new CancellationTokenSource(TimeSpan, TimeProvider)`, `Task.WaitAsync(TimeSpan, TimeProvider)`); `Thread.Sleep`, `Task.Delay(TimeSpan[, ct])`, `Task.Delay(int)`, `new CancellationTokenSource(TimeSpan)` and `WaitAsync(TimeSpan[, ct])` are banned. *Why:* otherwise backoff tests sleep for real (3.0 s red) or cannot be written. *Verify:* package `Microsoft.CodeAnalysis.BannedApiAnalyzers` 4.14.0 with `<AdditionalFiles Include="BannedSymbols.txt" />` containing the doc-IDs `M:System.Threading.Tasks.Task.Delay(System.TimeSpan,System.Threading.CancellationToken)`, `M:System.Threading.CancellationTokenSource.#ctor(System.TimeSpan)`, `M:System.Threading.Thread.Sleep(System.Int32)` etc.; `dotnet build src -c Release` fails with `error RS0030` on a plant (measured); fallback `rg -n -P 'Thread\.Sleep|Task\.Delay\((?![^;]*\b(time|timeProvider|_time)\b)' src`.
14. **Rule:** Tier-1 time tests use `FakeTimeProvider` from `Microsoft.Extensions.TimeProvider.Testing` and advance it in a loop bounded by a real-time ceiling; they assert real elapsed < 1.5 s and never `Thread.Sleep`. *Why:* one `Advance` can precede timer registration and hang. *Verify:* `rg -n -P 'Thread\.Sleep|Task\.Delay\((?![^;]*(fake|time))' tests/Ocx.Sdk.UnitTests --glob '*.cs'` returns nothing; `rg -n -e 'FakeTimeProvider' tests/Ocx.Sdk.UnitTests` non-empty.
15. **Rule:** Never assign `Encoding.UTF8` (or `Encoding.Unicode`, `Encoding.UTF32`) to `ProcessStartInfo.StandardInputEncoding`; leave it unset or use `new UTF8Encoding(false)`. A test writes a secret and asserts the first stdin bytes are the secret's. *Why:* `Encoding.UTF8` writes `EF BB BF` into the pipe (measured Linux + Windows). *Verify:* `rg -n -P 'StandardInputEncoding\s*=\s*(System\.Text\.)?Encoding\.(UTF8|Unicode|UTF32)\b' src tests` returns nothing; the `echo-stdin` test is green.

Framework, runner, gate

16. **Rule:** All test projects are `OutputType` Exe with `UseMicrosoftTestingPlatformRunner` true and `xunit.v3.mtp-v2` (or `xunit.v3` >= 4.0.0); none reference `Microsoft.NET.Test.Sdk`, `xunit.runner.visualstudio` or xUnit v2 `xunit`. *Why:* VSTest mode is legacy; MTP is the one runner. *Verify:* `test -n "$(rg -l -e '<UseMicrosoftTestingPlatformRunner>true</UseMicrosoftTestingPlatformRunner>' tests/Directory.Build.props)"` and `rg -n -e 'Microsoft\.NET\.Test\.Sdk' -e 'xunit\.runner\.visualstudio' -e 'Include="xunit"' -e 'Xunit\.SkippableFact' tests Directory.Packages.props --glob '*.{csproj,props}'` returns nothing.
17. **Rule:** `global.json` carries `"test": {"runner": "Microsoft.Testing.Platform"}` next to the pinned SDK. *Why:* without it `dotnet test` fails the build on SDK 10 with MTP projects. *Verify:* `jq -e '.test.runner == "Microsoft.Testing.Platform"' global.json` (exit 0).
18. **Rule:** CI and docs invoke `dotnet test --solution|--project|--test-modules`; they never use `--logger`, `--collect`, `--blame`, `vstest`, `TestingPlatformDotnetTestSupport`; extension flags are used only when the extension package is referenced. *Why:* VSTest flags exit 5 in MTP mode. *Verify:* `rg -n -e '--logger' -e '--collect' -e '--blame' -e 'vstest' -e 'TestingPlatformDotnetTestSupport' .github tests Directory.Build.props taskfile.yml` returns nothing; `rg -n -e '--report-trx' .github taskfile.yml` implies `rg -n -e 'Microsoft.Testing.Extensions.TrxReport' tests Directory.Packages.props`.
19. **Rule:** Every test project bakes `--minimum-expected-tests 1` (or the tier's floor) into `TestingPlatformCommandLineArguments`, and the contract CI step additionally passes `-- --minimum-expected-tests <n>`; nothing ignores exit 8 or 9. *Why:* on SDK 10.0.401 an all-skipped run exits 0; the per-module minimum turns it into 9 (measured), a global minimum does not. *Verify:* `rg -n -e 'TestingPlatformCommandLineArguments' -e 'minimum-expected-tests' tests/Directory.Build.props .github taskfile.yml` non-empty and `rg -n -e 'ignore-exit-code' -e 'TESTINGPLATFORM_EXITCODE_IGNORE' . --glob '!*.md'` returns nothing.
20. **Rule:** xUnit filters are `--filter-class|-method|-namespace|-trait|-query` with a fully-qualified name or wildcard; a filter that selects nothing must be treated as the exit-8 failure it is. *Why:* partial names match nothing (`--filter-method Passes` -> 8). *Verify:* `rg -n -e '--filter ' .github taskfile.yml` returns nothing (VSTest syntax is accepted by xunit.v3.mtp-v2 4.0.2 but undocumented there; do not depend on it).
21. **Rule:** `xUnit1051` is `error` in the tests' `.editorconfig` and every call that accepts a token receives `TestContext.Current.CancellationToken`. *Why:* timeouts and Ctrl+C must reach spawned work. *Verify:* `rg -n -e 'xUnit1051\.severity\s*=\s*error' tests/.editorconfig .editorconfig` non-empty (measured: raises `error xUnit1051`).

Contract tier

22. **Rule:** The contract tier lives in its own project, is gated by `OCX_SDK_CONTRACT=1` through `[Fact(SkipUnless = nameof(Armed), Skip = "<reason of at least 8 chars>")]` with `public static bool Armed`, and throws when armed but the pinned ocx is absent or reports a different version. *Why:* a skip with a stated reason is honest; a skip when armed is a silent-green hole. *Verify:* `rg -n -P 'SkipUnless\s*=' tests/Ocx.Sdk.ContractTests | rg -v -e 'Skip\s*=\s*"[^"]{8,}"'` returns nothing; `rg -n -e 'public static bool Armed' tests/Ocx.Sdk.ContractTests` non-empty; `dotnet build tests/Ocx.Sdk.ContractTests` clean (xUnit1054 is an error by default).
23. **Rule:** One `TestedOcxVersion` constant, mirrored in every workflow's `setup-ocx` version and guarded by a drift test; a nightly job runs the contract project with `OCX_TEST_VERSIONS=latest`. *Why:* the window of supported ocx versions is a single version today. *Verify:* `rg -n -e 'TestedOcxVersion' src tests .github` hits >= 3 files; `rg -n -e 'setup-ocx' -A2 .github/workflows` shows `version:` equal to the constant.
24. **Rule:** The contract tier asserts (a) each exit-code row reachable offline for the pinned version, keyed by version, with unreachable rows listed in a comment block, (b) real pinned-binary output parses with the SDK models, (c) real timeout/large-stderr mechanics; it is hermetic (`OCX_HOME`, `DOCKER_CONFIG` temp dirs, explicit minimal env). *Why:* these are exactly what fakes cannot say. *Verify:* reading heuristic plus `rg -n -e 'OCX_HOME' -e 'DOCKER_CONFIG' tests/Ocx.Sdk.ContractTests --glob '*.cs'` >= 2 hits and `rg -n -e 'Environment\.GetEnvironmentVariables\(\)' tests/Ocx.Sdk.ContractTests` returns nothing.
25. **Rule:** The schema-diff test (vendored `reports.v1.json` vs the SDK's models; fails on phantom and unsafe keys) runs in tier 1 and is regenerated from ocx, never hand-edited. *Why:* hand-written fixtures reached `main` with three presence-rule inversions in the Python SDK. *Verify:* `test -f tests/fixtures/contract/reports.v1.json` and `rg -n -e 'phantom' -e 'unsafe' tests/Ocx.Sdk.UnitTests --glob '*.cs'` non-empty.

Matrix

26. **Rule:** The fake-cli tier runs on `ubuntu` + `ubuntu-arm`, `macos`, `windows` (+ `windows-arm` when available); POSIX-only tests use `Assert.SkipWhen(OperatingSystem.IsWindows(), "<reason>")`, never a silent `return`. *Why:* the E3 symptom differs by OS (orphan vs hang) and a silent return reports a pass. *Verify:* `rg -n -e 'windows' -e 'macos' -e 'ubuntu' .github/workflows` shows all three families; `rg -n -P 'if \(OperatingSystem\.Is(Windows|Linux|MacOS)\(\)\)\s*return' tests` returns nothing.

## AI-agent angle

| What an LLM characteristically does | Why it is wrong | Smallest mechanical check |
|---|---|---|
| Wraps `Process` in an `IProcessWrapper` and mocks it with Moq/NSubstitute for "unit tests" of pipe handling | proves nothing about E1/E3/E7; tier 2 exists because of this | rule 2: `rg -n -e 'Mock<' -e 'Substitute\.For<' tests/Ocx.Sdk.FakeCliTests` |
| `dotnet test --logger trx`, `--collect "Code Coverage"`, `--blame` (VSTest era, all .NET 6-8 tutorials) | MTP mode exits **5**; measured | rule 18 `rg -e '--logger' -e '--collect' -e '--blame' .github` |
| `dotnet test --report-trx` without adding `Microsoft.Testing.Extensions.TrxReport` | exit 5 (unrecognized option); measured | run `dotnet test --report-trx` in CI dry run; rule 18 pairing check |
| Adds `Microsoft.NET.Test.Sdk` + `xunit.runner.visualstudio` + `xunit` 2.x + `Xunit.SkippableFact` / `Skip.If(...)` | v2-era; CliWrap still carries it (`CliWrap.Tests.csproj:15-20`); v3 has `Assert.SkipWhen`/`SkipUnless` | rule 16 `rg -e 'Skip\.If' -e 'SkippableFact' -e 'Include="xunit"' tests` |
| Forgets `"test": {"runner": ...}` in `global.json`, or adds `<TestingPlatformDotnetTestSupport>` (SDK 9 recipe) | build error on SDK 10 / legacy mode | rule 17 `jq -e` |
| "Fixes" a red exit 8 with `--ignore-exit-code 8` or `TESTINGPLATFORM_EXITCODE_IGNORE` | silences the gate that catches broken filters | rule 19 `rg -e 'ignore-exit-code' -e 'TESTINGPLATFORM_EXITCODE_IGNORE' .` |
| Writes the contract tier as `[Fact(Skip = "needs ocx")]` (always skipped) or `if (!HasOcx) return;` (always green) | invisible; unarmed run is exit 0 | rule 22 `rg -P 'if \(.*Ocx.*\)\s*return' tests` and the `Skip =` reason check |
| `[Fact(SkipUnless = "HasOcx")]` with a private/instance property | xUnit1054 build error | `dotnet build tests/Ocx.Sdk.ContractTests` |
| `Thread.Sleep(…)` / `await Task.Delay(1000)` in retry tests, `DateTime.UtcNow` in the SDK | real sleeping; untestable | rule 13 RS0030 |
| Calls `fake.Advance(...)` once, then `await task` | races timer registration, can hang | rule 14 reading heuristic; real-time ceiling in the loop |
| `Process.Kill()` or `Kill(false)` on cancel; `StandardOutput.ReadToEnd()` then `StandardError.ReadToEnd()`; `WaitForExit()` with no bound | E3 / E1 / E7 | rule 12 `rg -P '\.Kill\(\s*(false)?\s*\)\|\.ReadToEnd\(\)' src` |
| Sets `StandardInputEncoding = Encoding.UTF8` "to be safe" | BOM into the pipe, corrupts stdin secrets | rule 15 `rg -P 'StandardInputEncoding\s*=\s*(System\.Text\.)?Encoding\.UTF8'` |
| Hard-codes `Path.Combine("..","Ocx.Fake","bin","Debug","net10.0","Ocx.Fake.exe")` or `"dummy.exe"` | breaks on Linux/macOS and Release | rule 6 grep |
| Adds `ReferenceOutputAssembly="false"` to "avoid referencing the exe's types" | apphost without dll, rc 154 | rule 5 `rg -P` |
| Uses `dotnet run dummy.cs` (the new .NET 10 feature) as the fixture | 6x slower, extra process in the tree | rule 9 grep |
| Uses the bare string `"dotnet"` for `dotnet exec` | breaks when launched without PATH | rule 8 grep |
| `--filter-method Passes` (partial name) or `--filter "Category=Contract"` on xUnit MTP | exit 8 / VSTest syntax | rule 20; the exit-8 gate itself |
| Asserts "a minimum of N tests" globally to catch skipped tests | the global count includes skipped; exit 0 | rule 19 uses per-module via `TestingPlatformCommandLineArguments` |
| Hallucinated `FakeTimeProvider` members (`AdvanceAsync`, `RunPendingTimers`) | the real surface is `Advance`, `SetUtcNow`, `AdjustTime`, `AutoAdvanceAmount`, `CreateTimer` | `dotnet build` (compile error) |

## Contested / evolving

- **Mock the runner vs run a real dummy.** CliWrap and SimpleExec use real dummies and no injectable runner; Pulumi, Aspire, Azure SDK and Cake use interface/abstract fakes ([exemplar-cli-wrappers-and-sdks.md:23](/home/mherwig/dev/grimoire-lore/.agents/worktrees/csharp/.agents/research/csharp-audit/exemplar-cli-wrappers-and-sdks.md)). Position taken: both, in different tiers; trend in the newest repos is toward real executables for anything about processes.
- **Apphost vs `dotnet exec`.** CliWrap launches the apphost (`Program.cs:15-20`), SimpleExec `dotnet exec` (`Cli.cs:5`). Position: `dotnet exec` for scenarios, apphost for resolution tests.
- **VSTest -> MTP.** .NET 10 SDK (2025-11) made MTP mode native; docs now call VSTest-hosted MTP "legacy" and say it "will be removed in MTP version 2" (2026-09 pages). `xunit.v3` 4.0.0+ ships MTP v2 by default and dropped v1 ("Support for Microsoft Testing Platform v1 has been removed from package version 4.0.0 onward"), so the decision is already made for new xUnit projects; CliWrap's v2+VSTest stack remains a valid but frozen choice.
- **xUnit filter format.** The migration guide (2026-08-31) says xUnit "does not support the same filter format" on MTP; `xunit.v3.mtp-v2` 4.0.2 `--help` advertises `--filter` with "VSTest filter syntax" and it worked (measured). Trend: native `--filter-*`/`--filter-query` is the documented path; the VSTest syntax appears to be a compatibility shim.
- **`--zero-tests-policy` and version numbers.** Docs: "MTP 4.3.0 and later"; the option exists in platform 2.5.1 bundled with xUnit v3 4.0.2. The numbers belong to different trains; trust `--info` on the actual test exe. Default `allow-skipped` was introduced after the original "skipped = not run" behaviour (testfx issue refs #3216/#3243 -> #9385 in the source comment, `TestApplicationResult.cs:150-160`).
- **.NET 11 / RC1 specifics (GA Nov 2026).** The .NET 11 SDK normalizes per-module exit 8 before aggregating (a single empty module no longer fails a multi-module run) and treats an all-skipped whole run as 8 (measured on 11.0.100-rc.1: contract tier unarmed exits 8, SDK 10.0.401 exits 0); `DOTNET_TEST_RUNNER=Microsoft.Testing.Platform` overrides `global.json` from Preview 6; `--timeout` and `--maximum-failed-tests` (exit 13) need .NET 11 Preview 7 + MTP 2.4; `--results-directory-layout per-module` from RC 1; `dotnet test` of a C# file-based MTP test app is announced for .NET 12 Preview 1 ([dotnet test (MTP)](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-test-mtp)). Treat all as .NET 11+ only; do not rely on them in a net8 floor SDK.
- **Process-tree semantics.** `Process.Kill(true)` is the only portable tree kill; there is still no graceful phase on Windows, and [dotnet/runtime#29232](https://github.com/dotnet/runtime/issues/29232) (pipe EOF held by descendants) is closed with "Future" and no API. Expect the bounded-drain workaround to stay necessary through net10.
- **Windows-only behaviours.** Windows grandchildren inherit handles (E3 shows as a hang); the dev host here needed an explicit NuGet source for restore. Local Windows runs beat a CI round trip; CI stays the gate.
- **Contract-tier coverage of exit codes.** Python leaves exit codes needing a registry or a cosign key as recorded gaps (83, 84, 86). Whether the C# SDK adds cosign/registry fixtures is a scope decision for the SDK plan, not a research finding.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://learn.microsoft.com/en-us/dotnet/core/testing/migrating-vstest-microsoft-testing-platform | Official VSTest -> MTP migration guide (primary) | 2026-08-31, .NET 10 | opt-in properties, argument mapping, exit 8 on zero tests, the Console.InputEncoding / UTF-8 BOM trap and its workaround |
| https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-with-dotnet-test | `dotnet test` modes (primary) | 2026-09-12, .NET 10/11 | VSTest vs MTP mode, `global.json` `test.runner`, `DOTNET_TEST_RUNNER`, mixed frameworks, `TestingPlatformCommandLineArguments` |
| https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-test-mtp | `dotnet test` MTP reference (primary) | 2026-09-21, .NET 10 SDK+ | `--minimum-expected-tests` whole-run vs per-module, `--zero-tests-policy`, `--test-modules`, .NET 11 flags |
| https://learn.microsoft.com/en-us/dotnet/core/testing/microsoft-testing-platform-troubleshooting | MTP exit-code table and `--ignore-exit-code` (primary) | 2026-09-21 | codes 0-14, 8 vs 9, SDK 11 whole-run rule |
| https://learn.microsoft.com/en-us/dotnet/core/testing/microsoft-testing-platform-cli-options | MTP platform options reference (primary) | 2026-10-01 | `--zero-tests-policy`, `--minimum-expected-tests`, `--timeout`, `--diagnostic` |
| https://xunit.net/docs/getting-started/v3/microsoft-testing-platform | xUnit v3 on MTP (primary, vendor) | 2026, xunit.v3 4.x | package matrix mtp-v1/v2/off, `UseMicrosoftTestingPlatformRunner`, filter switches |
| https://xunit.net/docs/getting-started/v3/whats-new | xUnit v3 changes (primary, vendor) | 2026 | `TestContext.Current.CancellationToken`, cooperative timeouts, `Assert.SkipWhen/SkipUnless`, `ITestPipelineStartup` |
| https://xunit.net/xunit.analyzers/rules/xUnit1051 | analyzer rule | 2026 | token-passing rule that makes timeouts effective |
| https://xunit.net/xunit.analyzers/rules/xUnit1054 | analyzer rule | 2026 | the `public static bool` requirement for `SkipUnless`/`SkipWhen` |
| https://learn.microsoft.com/en-us/dotnet/standard/datetime/timeprovider-overview | TimeProvider overview (primary) | 2026-01-16, .NET 8+ | frameworks/back-compat package, injectable async APIs, FakeTimeProvider pointer |
| https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.time.testing.faketimeprovider?view=net-10.0-pp | FakeTimeProvider API (primary) | 2026-09, pkg 10.9.0 | exact member list (`Advance`, `SetUtcNow`, `AutoAdvanceAmount`) |
| https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process.kill?view=net-10.0 | Process.Kill API (primary) | 2026-09, .NET 10 | `entireProcessTree`, exceptions, "WaitForExit does not reflect descendants" |
| https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process.waitforexitasync?view=net-10.0 | Process.WaitForExitAsync API (primary) | 2026-09, .NET 5+ | signature and what the docs do not say about EOF (the source does) |
| https://raw.githubusercontent.com/dotnet/runtime/v10.0.0/src/libraries/System.Diagnostics.Process/src/System/Diagnostics/Process.cs | dotnet/runtime source at v10.0.0 (primary, real source) | .NET 10 | `WaitUntilOutputEOF` is conditional on `_output`/`_error` being non-null |
| https://github.com/dotnet/runtime/issues/29232 | WaitForExit hangs when a grandchild holds redirected handles (primary) | opened 2018, closed 2023-03-03, milestone Future | status, workarounds, no API change |
| https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/tutorials/file-based-programs | File-based apps tutorial (primary) | 2026-05-12, .NET 10 | how `dotnet app.cs` builds into a temp folder (basis for the spawn-cost rejection) |
| https://api.nuget.org/v3-flatcontainer/xunit.v3.mtp-v2/index.json | nuget.org version index | queried 2026-10-11 | latest `xunit.v3.mtp-v2` is 4.0.2; companion indexes gave MTP 2.5.1, TimeProvider.Testing 10.10.0 |
| `Tyrrrz__CliWrap@7dbc252fa773` (`CliWrap.Tests.Dummy/Program.cs:15-25`, `CliWrap.Tests/CliWrap.Tests.csproj:7-25`, `CliWrap/Utils/Extensions/ProcessExtensions.cs:44-48`) | reference dummy-exe harness; still xUnit v2 + VSTest | 2026 | apphost path trick, plain ProjectReference, `TryKill(entireProcessTree = true)` |
| `adamralph__simple-exec@f80913246993` (`tests/Directory.Build.props:9,28`, `Directory.Packages.props:15`, `global.json:5-8`, `tests/Tests/Fixtures/Cli.cs:5`, `.github/workflows/ci.yml:18-22`) | xUnit v3 + MTP + `dotnet exec` dummy on 3 OS arm runners | 2026 | the closest modern analogue of the proposed harness |
| `pulumi__pulumi-dotnet@2a0dca84f09b` (`sdk/Pulumi.Automation/Commands/PulumiCommand.cs:12-28`, `sdk/Pulumi.Automation.Tests/Mocks/PulumiCommandMock.cs:11-31`) | abstract-class seam with hand-written mock | 2026 | the seam shape for logic tests |
| `microsoft__testfx@7226b0c74729` (`src/Platform/Microsoft.Testing.Platform/Services/TestApplicationResult.cs:150-224`, `Helpers/ExitCodes.cs:56,61`, `CommandLine/PlatformCommandLineProvider.cs:34-37`) | MTP source | 2026 | exact exit-code decision order; design comment on skipped tests |
| `testcontainers__testcontainers-dotnet@04cbb73fcc58` (`tests/Testcontainers.Tests/Unit/Builders/ComposeBuilderTest.cs:70`), `madelson__MedallionShell@e45f1f6ffd4c` (`MedallionShell.Tests.csproj:29`), `xunit__xunit@0c7aa4991fa3` / `coverlet-coverage__coverlet@ecd6fd5533e7` (`global.json:7`) | `SkipUnless` + reason usage; second real-exe harness; MTP runner in `global.json` | 2026 | corroborating exemplars |
| `/home/mherwig/dev/ocx-sdk-python` @`80136dde4162` (`tests/conftest.py`, `tests/contract/conftest.py`, `tests/contract/test_exit_codes_contract.py`, `tests/unit/test_process.py`, `tests/unit/test_retry.py`, `.github/workflows/ci.yml`, `acceptance.yml`, `taskfile.yml:45-48`) | the Python SDK whose tiers are being ported | 2026-10 | contract gating, version seam, hermetic state, tier docstrings |
| `/home/mherwig/dev/grimoire-lore/.agents/worktrees/csharp/.agents/research/csharp-audit/{ocx-cli-contract,python-sdk-digest,exemplar-cli-wrappers-and-sdks}.md`, `csharp-topic-map/shifts.md` | grounding audit | 2026-10 | exit-code table, presence rules, E1/E3/E7 first measurements, MTP adoption counts |
