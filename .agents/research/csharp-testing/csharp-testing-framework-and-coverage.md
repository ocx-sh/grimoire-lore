---
title: "Testing a .NET library beyond the harness: framework, analyzers, assertions, mocking and coverage on Microsoft.Testing.Platform"
topic: csharp-testing / csharp-testing-framework-and-coverage
agent: deep-dive researcher (csharp-testing group)
model: sonnet
date_researched: 2026-10-11
sources_count: 31
scope: |
  Covers: which test framework a general .NET library should use on Microsoft.Testing.Platform (xUnit v3, MSTest 4, NUnit 5, TUnit) and whether CS-TEST-05 generalises;
  the analyzers each ships and which fire by default; assertion libraries (built-in, AwesomeAssertions, Shouldly, FluentAssertions 8 licence); mocking (none, NSubstitute, Moq SponsorLink, FakeItEasy);
  coverage tooling (Microsoft.Testing.Extensions.CodeCoverage vs coverlet.MTP, the silent-no-op trap of coverlet.collector/coverlet.msbuild), per-TFM output, merge across TFMs and OS legs,
  generated-code and attribute exclusion, ContinuousIntegrationBuild `/_/` paths, and whether a threshold gates merge.
  Does not cover: the fake-ocx harness, exit-8 zero-test gate and contract tier (CS-TEST-01..08, already decided); snapshot (Verify) and property-based testing (sibling topic csharp-testing-snapshots-and-property);
  mutation testing (Stryker is only noted); CI matrix shape (CS-CI-01..07).
  Everything marked "measured" ran on SDK 10.0.401 (Linux x64, net8.0 + net10.0), re-ran on the Windows host (SDK 10.0.102, net10.0 only: no net8 runtime there) and on SDK 11.0.100-rc.1. arm64 legs were NOT run; the one arm64-relevant claim is flagged.
---

# Testing a .NET library beyond the harness

Fixtures, all runnable: `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-testing-framework-and-coverage/` (`run-all.sh` replays everything, `evidence-*.txt` hold the last output, `evidence-windows-*.txt` the Windows host, `evidence-sdk11.txt` SDK 11 RC1). Section 16 records commands and output.

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Verdict on CS-TEST-05 and the census](#1-verdict-on-cs-test-05-and-the-census)
   2. [Framework comparison on MTP, measured](#2-framework-comparison-on-mtp-measured)
   3. [The runner contract: exit codes](#3-the-runner-contract-exit-codes)
   4. [Analyzers: which fire by default](#4-analyzers-which-fire-by-default)
   5. [The cancellation token in tests](#5-the-cancellation-token-in-tests)
   6. [Parallelism defaults](#6-parallelism-defaults)
   7. [Skip, explicit, culture, fixtures](#7-skip-explicit-culture-fixtures)
   8. [Assertions and the FluentAssertions 8 licence](#8-assertions-and-the-fluentassertions-8-licence)
   9. [Mocking](#9-mocking)
   10. [Coverage tools and the silent no-op traps](#10-coverage-tools-and-the-silent-no-op-traps)
   11. [Output naming, generated code, exclusions](#11-output-naming-generated-code-exclusions)
   12. [Merging across TFMs and OS legs](#12-merging-across-tfms-and-os-legs)
   13. [ContinuousIntegrationBuild and `/_/` paths](#13-continuousintegrationbuild-and--paths)
   14. [Thresholds: gate or report](#14-thresholds-gate-or-report)
   15. [Windows and SDK 11 re-runs](#15-windows-and-sdk-11-re-runs)
   16. [Verified on the toolchain](#16-verified-on-the-toolchain)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- CS-TEST-05 (xUnit v3 on MTP only) is **confirmed for the ocx SDK and generalised**: a new library defaults to `xunit.v3.mtp-v2`; an existing repo keeps its incumbent framework (MSTest, NUnit and TUnit all run on MTP and exit 0/2/8 identically); exactly one framework per solution.
- All four frameworks share the MTP exit-code contract (measured: pass 0, failed test 2, zero tests 8, unknown option 5, coverage threshold 14). Never `--ignore-exit-code`; a gate must treat any non-zero as failure, because SDK 10.0.102 on Windows turned a module's 5 into 1.
- xUnit is the only framework whose cancellation-token analyzer fires by default: **xUnit1051 is a Warning** (measured); MSTEST0049 is Info and fires only under `MSTestAnalysisMode` Recommended/All; NUnit.Analyzers has no token rule at all.
- xUnit v3 parallelises test classes by default (4x400 ms in 1.1 s); MSTest and NUnit are sequential until opted in (3.4-3.6 s default, 0.6 s opted in). Global-state tests (env vars, cwd, culture) are an xUnit flake source by default.
- `Assert.Skip` does not exist in MSTest 4.5.1 (CS0411); runtime skip there is `Assert.Inconclusive`, `[OSCondition]` or `[Ignore("reason")]`. xUnit has `Assert.SkipUnless/SkipWhen`, `[Fact(Explicit = true)]` and `[CulturedFact(["de-DE"])]` (a bare string is CS1503); NUnit has `Assert.Ignore`, `[Explicit]`, `[SetCulture]`.
- **Assertions: built-in framework asserts by default.** FluentAssertions 8.x (8.11.0 today) ships a Xceed community licence, a `License` class and a licence warning printed into captured test output (measured); 7.2.0 and earlier are Apache-2.0. If a fluent library is wanted, AwesomeAssertions 9.6.0 (Apache-2.0 fork) or Shouldly 4.3.0 (BSD-3).
- **Mocking: none by default** (CS-TEST-08 already declines a runner seam; hand-written fakes and the real process win). If needed: NSubstitute 6.2.0 + `NSubstitute.Analyzers.CSharp` (NS1000 fired, measured). Moq is safe from 4.20.2 on; 4.20.0 and 4.20.1 pull `Devlooped.SponsorLink` into the closure (measured by restore); 4.21.0 shipped 2026-09-24.
- **Coverage tool: `Microsoft.Testing.Extensions.CodeCoverage` 18.12.0 by default, `coverlet.MTP` 10.1.0 as the OSS alternative; never both in one report, never `coverlet.collector` or `coverlet.msbuild`.** Both of those are silent no-ops under MTP (exit 0, zero coverage files, measured) or exit 5.
- The Microsoft extension **does not exclude `[GeneratedCode]` by default**: with an STJ source-generated context it reported 110/141 lines instead of 6/7; a settings XML excluding `GeneratedCodeAttribute`/`CompilerGeneratedAttribute` fixes it. coverlet.MTP excludes them by default, but **a `testconfig.json` makes its config authoritative and silently drops that default** (8/9 became 110/141).
- `--coverage-output fixed.xml` with two TFMs in one `dotnet test` clobbers one report (two TFMs, one file, measured). Use the default GUID names, or one call per TFM with the TFM in the name (Polly's shape).
- Merge with **ReportGenerator 5.5.11** (`-reporttypes:Cobertura;TextSummary`): lines and branches stay stable. `dotnet-coverage merge` (18.12.0) gave the same lines but **halved the branch counts** when merging cobertura (4/8 became 2/4) and its binary-to-cobertura path gave a different branch-rate again.
- Linux and Windows cobertura merge cleanly (6/7 each, merged 6/7); the first report's absolute path wins, so pass `-sourcedirs` when rendering HTML.
- `ContinuousIntegrationBuild=true` does not break either tool by default: the PDB says `/_/Lib/Calc.cs` yet both reports keep real local paths. Only coverlet's opt-in `deterministicReport` emits `/_/`, and then ReportGenerator needs `-sourcedirs:<checkout>` (0 to 4 source hits from an unrelated cwd).
- Coverage numbers are tool-, configuration- and compiler-specific: same tests give 8/9 (coverlet, Release) vs 9/10 (Debug) vs 6/7 (Microsoft, filtered). **Collect coverage in Release on one Linux x64 leg**, as a report.
- **Threshold: report by default; if a gate is wanted it is a raise-only floor on merged line-rate in one aggregator job.** `--coverlet-threshold` is evaluated per module (per TFM) and exits 14; the Microsoft extension 18.12.0 has no threshold option.
- MSTest's metapackage already bundles the coverage and TRX extensions (and `Microsoft.NET.Test.Sdk`); TUnit bundles coverage; xUnit and NUnit need the package or `--coverage` exits 5.
- The MTP agent mode quietly changes output: `--show-stderr` defaults to `Failed` "when an LLM/AI agent environment is detected" (platform `--help`), so a licence or diagnostic notice can vanish from an agent's transcript.

## Findings

### 1. Verdict on CS-TEST-05 and the census

CS-TEST-05 says: xUnit v3 on MTP only. For the ocx SDK that stands. For "any .NET library" the evidence supports a weaker, checkable form: **MTP always; xUnit v3 for new projects; keep the incumbent framework in an existing repo; one framework per solution.**

Census of the 35 exemplar clones (project/props files that mention the package; a repo can appear in several rows):

| Question | Result |
|---|---|
| xUnit v3 packages | 12 repos, e.g. `App-vNext__Polly@e4476096da5b:eng/Test.targets:25`, `adamralph__simple-exec@f80913246993:tests/Directory.Build.props:28`, `xunit__xunit@0c7aa4991fa3`, `cake-build__cake@08885933e936:src/Cake.Core.Tests/Cake.Core.Tests.csproj:27` |
| MSTest | `microsoft__testfx@7226b0c74729`, `coverlet-coverage__coverlet@ecd6fd5533e7:Directory.Packages.props:58` (MSTest 4.4.0), roslynator, pulumi |
| NUnit | `npgsql__npgsql@9c47244547c2:Directory.Packages.props:22,23,28` (NUnit 4.6.1 + NUnit3TestAdapter 6.3.0 on VSTest), GitVersion, nodatime, openai-dotnet, Azure |
| Still VSTest | npgsql, `testcontainers__testcontainers-dotnet@04cbb73fcc58:Directory.Packages.props:20-29` (xunit.v3 3.2.2 + `xunit.runner.visualstudio` + `coverlet.collector` in 74 projects; no `test` section in `global.json`), `Tyrrrz__CliWrap@7dbc252fa773:CliWrap.Tests/CliWrap.Tests.csproj:11,18-20`, `FluentValidation__FluentValidation@299ef377bde8:src/FluentValidation.Tests/FluentValidation.Tests.csproj:14-19` (xunit 2.2.0) |
| MTP via `global.json` `test.runner` | Polly (`global.json:10`), simple-exec, xunit (`global.json:7`), coverlet, cake, testfx (`global.json:37`) |
| Assertions | built-in only: simple-exec (`tests/Tests/CancellingCommands.cs:23`); Shouldly 4.3.0: Polly (`eng/Test.targets:10,20`), GitVersion (`src/Directory.Build.props:87`), spectre.console (`src/Directory.Packages.props:19`), serilog, MessagePack; AwesomeAssertions: testfx (`Directory.Packages.props:109`, 9.6.0), BenchmarkDotNet (9.4.0), command-line-api; FluentAssertions: CliWrap 8.11.0 (`Directory.Packages.props:12`), nuke 6.12.2 (`Directory.Packages.props:38`), MessagePack 7.0.0 (`Directory.Packages.props:18`), pulumi 6.12.0 |
| Mocking | Moq in 11 repos (testfx pins 4.20.72 at `Directory.Packages.props:126`, coverlet 4.21.0 at `Directory.Packages.props:20`); NSubstitute in 6 (Polly `:25`, cake `src/Directory.Packages.props:20`, both 6.2.0); FakeItEasy in none; hand-written fakes in simple-exec, CliWrap |
| Coverage tools | Microsoft extension: Polly (`eng/Test.targets:17`), cake, Humanizer (`Directory.Packages.props:13`), testfx, vs-threading (`Directory.Packages.props:44`); coverlet.MTP: cake (`src/Directory.Packages.props:13`), GitVersion (`src/Directory.Build.props:77`), coverlet; coverlet.collector: CliWrap, testcontainers, anthropic-sdk-csharp (all VSTest); coverlet.msbuild: nuke, pulumi, stripe |

Package versions and publish dates on 2026-10-11 (NuGet registration API): `xunit.v3.mtp-v2` 4.0.2 (2026-10-09, depends on `xunit.analyzers` 2.2.0), MSTest 4.5.1 (2026-10-07), NUnit 5.0.0 (2026-09-27), NUnit3TestAdapter 6.3.1, NUnit.Analyzers 4.15.0, TUnit 1.73.19 (2026-10-08), `Microsoft.Testing.Extensions.CodeCoverage` 18.12.0 (2026-10-06), coverlet.MTP 10.1.0 (2026-09-27), ReportGenerator 5.5.11 (2026-07-27), FluentAssertions 8.11.0 (2026-09-14), AwesomeAssertions 9.6.0 (2026-08-20), Shouldly 4.3.0 (5.0.0-preview.2 exists), Moq 4.21.0 (2026-09-24), NSubstitute 6.2.0, FakeItEasy 9.0.1. All but FluentAssertions 8.x are MIT, Apache-2.0 or BSD-3 expressions in their nuspec; FluentAssertions 8.11.0 declares `<license type="file">LICENSE</license>` and `Xceed` among its authors (fixture `nuspec/`).

### 2. Framework comparison on MTP, measured

Same eight-test library suite in each framework, net8.0 + net10.0, SDK 10.0.401 (fixture `Xu/ MS/ NU/ TU/`). Run time is not a discriminator: `dotnet test --no-build` median 1.09 s (xUnit), 1.11 s (MSTest), 1.37 s (NUnit), 1.15 s (TUnit); direct exe 0.49-0.58 s for all four (`evidence-timing.txt`).

| | xUnit v3 (`xunit.v3.mtp-v2` 4.0.2) | MSTest 4.5.1 | NUnit 5.0.0 + adapter 6.3.1 | TUnit 1.73.19 |
|---|---|---|---|---|
| Enable MTP | `<OutputType>Exe` + `<UseMicrosoftTestingPlatformRunner>true` | `<OutputType>Exe` + `<EnableMSTestRunner>true` (or `MSTest.Sdk`) | `<OutputType>Exe` + `<EnableNUnitRunner>true` (adapter >= 5.0) | MTP only, no switch |
| Bundled extensions | none | `Microsoft.NET.Test.Sdk` 18.10.1, CodeCoverage 18.12.0, TrxReport 2.5.1 (nuspec) | none (`--coverage` exits 5) | coverage works out of the box (measured) |
| Filter options | `--filter-class/-method/-namespace/-trait`, also `--filter` (VSTest syntax, works) | `--filter` only | `--filter` only | `--treenode-filter` |
| Token API | `TestContext.Current.CancellationToken` | `public TestContext TestContext { get; set; }` then `TestContext.CancellationToken` | `TestContext.CurrentContext.CancellationToken` | `CancellationToken` test parameter |
| Token analyzer | **xUnit1051 Warning by default** | MSTEST0049 Info; Warning under Recommended | none | none |
| Parallel default | **classes in parallel** | sequential, opt in | sequential, opt in | parallel (not measured) |
| Runtime skip | `Assert.Skip(reason)`, `Assert.SkipUnless/SkipWhen`, `[Fact(Skip=, SkipUnless=, SkipWhen=)]` | `Assert.Inconclusive(reason)`, `[OSCondition]`, `[Ignore("why")]`; **no `Assert.Skip`** | `Assert.Ignore`, `Assert.Inconclusive` | `[Skip("why")]` |
| Explicit | `[Fact(Explicit = true)]` (reported skipped "Not run (due to explicit test filtering)") | none | `[Explicit]` | n/a |
| Per-test culture | `[CulturedFact(["de-DE"])]`, `[CulturedTheory]` | none; set and restore, serialise (MSTEST0076) | `[SetCulture("de-DE")]` | none measured |
| Assembly fixture | `[assembly: AssemblyFixture(typeof(T))]` (docs) | `[AssemblyInitialize]` | `[SetUpFixture]` | hooks (not measured) |
| Async-assert trap | xUnit2021 (Error per index) | n/a | `Assert.ThrowsAsync` must be awaited in 5.0; NUnit2059 Error | `Assert.That(..)` must be awaited; TUnitAssertions0002 Error |

Sources: [xUnit v3 MTP page](https://xunit.net/docs/getting-started/v3/microsoft-testing-platform) (package line: `xunit.v3.mtp-v2`, v2 is the default from 4.0.0, "Standard Coverlet isn't supported with MTP"), [MSTest runner page](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-mstest-runner-intro) (`EnableMSTestRunner`, MSTest 3.2.0+, metapackage contents), [NUnit MTP page](https://docs.nunit.org/articles/vs-test-adapter/NUnit-And-Microsoft-Test-Platform.html) (adapter >= 5.0, `EnableNUnitRunner`), [xUnit v3 what's new](https://xunit.net/docs/getting-started/v3/whats-new) (`Assert.Skip*`, `Explicit`, `AssemblyFixture`, `TestContext.Current`).

xUnit-specific source facts: `[CulturedFact]` is `CulturedFactAttribute(string[] cultures)` (`xunit__xunit@0c7aa4991fa3:src/xunit.v3.core/CulturedFactAttribute_reflection.cs:20-22`), `Explicit` and `SkipUnless` live on `FactAttributeBase` (`src/xunit.v3.core.aot/Internal/FactAttributeBase_aot.cs:37,77`), the parallel attribute is `Xunit.v3.ParallelizationAttribute` with `ParallelMode` in `Xunit.Sdk` (`src/xunit.v3.core/Attributes/ParallelizationAttribute.cs:12`, `src/xunit.v3.common/Options/ParallelMode.cs`), and xUnit's own repo pins the analyzer through `xunit.analyzers` (`src/Directory.Build.props:100`).

**Why xUnit stays the default** (not "best"; the others are fine): (a) it is the only one with a default-on token analyzer, which is the one test-hygiene rule an agent most often violates; (b) its analyzer set is the strictest by default (51 Error, 48 Warning of 115 rules, section 4); (c) 12 of 35 exemplars and every MTP-first library in the corpus whose tests wrap a process (simple-exec) use it; (d) the harness decisions CS-TEST-01..08 are already written against it. **Why not MSTest/NUnit/TUnit by default:** nothing is wrong with them; changing a working repo's framework costs more than it earns, and a second framework in a solution needs `TestingPlatformCommandLineArguments` conditions because extension flags are per-framework ([troubleshooting](https://learn.microsoft.com/en-us/dotnet/core/testing/microsoft-testing-platform-troubleshooting#unrecognized-extension-command-line-option)).

### 3. The runner contract: exit codes

MTP exit codes ([troubleshooting](https://learn.microsoft.com/en-us/dotnet/core/testing/microsoft-testing-platform-troubleshooting#exit-codes); source `microsoft__testfx@7226b0c74729:src/Platform/Microsoft.Testing.Platform/Helpers/ExitCodes.cs:56,61,86`): 0 ok, 1 unknown, 2 test failed, 3 aborted, 5 invalid command line, 7 crashed, 8 zero tests, 9 below `--minimum-expected-tests`, 10 adapter infrastructure failure, 13 max failed tests, **14 coverage threshold failed**.

Measured, all four frameworks (SDK 10.0.401, `evidence-exit-codes.txt`): pass 0, one failing test 2, filter matching nothing 8, an option the framework does not register (`--filter-class` on MSTest/NUnit, `--coverlet` without the package) 5. xUnit counts runtime skips and `Explicit` tests as skipped and still exits 0; an all-skipped run is silent green (CS-TEST-06 covers the gate).

The VSTest-era flags are dead: `--collect "XPlat Code Coverage"`, `--settings x.runsettings` and `--logger trx` all exit 5 on an MTP project; extension flags exist only when the package is registered. `--ignore-exit-code` (or `TESTINGPLATFORM_EXITCODE_IGNORE`) is the documented escape hatch and is the thing to forbid: it converts 8 into green.

Windows caveat (measured, SDK 10.0.102): `dotnet test` returned **1** for a module that exited 5, while running the exe directly returned 5; 0, 2 and 8 matched Linux. Do not match specific codes in CI; treat non-zero as failure and read the `Exit code: N` line when diagnosing.

### 4. Analyzers: which fire by default

**xUnit** ([rule index](https://xunit.net/xunit.analyzers/rules/)): 115 rules, 51 Error, 48 Warning, 14 Info, 2 Hidden. `xunit.v3.mtp-v2` 4.0.2 brings `xunit.analyzers` 2.2.0 transitively; no extra reference. Measured on a deliberately bad file (`Xu/Ana.cs`, `evidence-analyzers.txt`):

| Rule | Severity measured | Catches |
|---|---|---|
| xUnit1051 | Warning | token-accepting call without `TestContext.Current.CancellationToken` |
| xUnit1049 | **Error** | `async void` test ("removed from xUnit.net v3") |
| xUnit1031 | Warning | `.Result` / blocking in a test |
| xUnit1030 | Warning | `ConfigureAwait(false)` in a test ("use ConfigureAwait(true) to avoid CA2007") |
| xUnit1001 / xUnit1003 | Error | `[Fact]` with parameters; `[Theory]` without data |
| xUnit2000 | Warning | `Assert.Equal(actual, "literal")` argument order |
| xUnit1026 | Warning | unused theory parameter |

**MSTest** ([analyzer overview](https://learn.microsoft.com/en-us/dotnet/core/testing/mstest-analyzers/overview)): `MSTest.Analyzers` is a dependency of the framework since 3.7; `MSTestAnalysisMode` (`None`, `Default`, `Recommended`, `All`; 3.8+) sets severities. Defaults: MSTEST0049 (flow token) Info, MSTEST0001 (parallelism declared) Info, MSTEST0003 Warning (Error in Recommended/All), MSTEST0015/0019-0022 opt-in. Measured: default build prints nothing; with `-p:MSTestAnalysisMode=Recommended` the same file warns `MSTEST0049` at the ignored token and `MSTEST0001`. MSTEST0076/0074/0075 (process-global state in parallel tests) are Info.

**NUnit.Analyzers** 4.15.0 ([rule table](https://raw.githubusercontent.com/nunit/nunit.analyzers/master/documentation/index.md)): every rule on by default except NUnit2025; of NUnit1001-1038 and 2001-2059, 32 + 11 are Error, 5 + 11 Warning; **no CancellationToken rule**. NUnit2059 (unobserved `ThrowsAsync`) is Error. Measured: an unawaited `Assert.ThrowsAsync` fails the build with NUnit2059; `-p:NoWarn=NUnit2059` builds and the test then **passes silently** (section 16, V19).

**TUnit**: `TUnitAssertions0002` (assert not awaited) is Error and the compiler adds CS4014 (measured). **NSubstitute.Analyzers.CSharp** 1.0.17: `NS1000` Warning on `c.NonVirtual().Returns(5)` of a class substitute (measured).

Policy for tests under the build posture of CS-BUILD (TWAE unconditional): every Warning above is a build error in practice, which is the intent. The documented exception set for tests is the one simple-exec uses (`adamralph__simple-exec@f80913246993:tests/Directory.Build.props:17-19`): `CA2007`, `VSTHRD111`, `VSTHRD200`. `ConfigureAwait(false)` is a library-code rule (CS-ASYNC-02); in tests xUnit1030 says the opposite, so CA2007 is off in test projects only.

### 5. The cancellation token in tests

xUnit v3: `TestContext.Current.CancellationToken` is signalled on timeout and on user cancel ([what's new](https://xunit.net/docs/getting-started/v3/whats-new)); [xUnit1051](https://xunit.net/xunit.analyzers/rules/xUnit1051) flags calls that accept a token without it. Measured on net8.0 and net10.0, severity Warning, only on the offending line:

```csharp
// RED  xUnit1051 at (16,62): Calls to methods which accept CancellationToken should use TestContext.Current.CancellationToken ...
[Fact] public async Task Token_ignored() { var r = await Calc.SlowAsync(2); Assert.Equal(4, r); }

// GREEN
[Fact] public async Task Token_flowed()  { var r = await Calc.SlowAsync(2, TestContext.Current.CancellationToken); Assert.Equal(4, r); }
```

MSTest: declare `public TestContext TestContext { get; set; } = null!;` and pass `TestContext.CancellationToken` (MSTEST0049; MSTEST0054 prefers the property). NUnit: `TestContext.CurrentContext.CancellationToken` compiles in 5.0.0, but nothing enforces it; the only check is a reading heuristic (no `CancellationToken.None` / `default` in test code).

### 6. Parallelism defaults

xUnit: "Test collections run in parallel with each other, but tests within one collection run sequentially", each class is its own collection, max threads = CPU count, algorithm Conservative ([parallel docs](https://xunit.net/docs/running-tests-in-parallel)). In 4.0 the knob is `[assembly: Parallelization(Mode = ParallelMode.None)]`, with `using Xunit.v3; using Xunit.Sdk;` (without them: CS0246/CS0103, measured). MSTest and NUnit run sequentially until `[assembly: Parallelize(Workers = 0, Scope = ExecutionScope.MethodLevel)]` / `[assembly: Parallelizable(ParallelScope.All)]`.

Measured (4 classes x 2 tests x 400 ms `Thread.Sleep`, net10.0, 32-core host, `evidence-parallelism.txt`):

| Framework | Default | Flipped |
|---|---|---|
| xUnit v3 | 1.34 s (classes parallel) | 3.75 s with `Mode = None` |
| MSTest 4.5.1 | 3.57 s | 0.83 s with `Parallelize(Workers = 0, MethodLevel)` |
| NUnit 5.0.0 | 3.70 s | 0.83 s with `Parallelizable(ParallelScope.All)` |

Consequence for libraries that read or set environment variables, the cwd or culture (the ocx SDK does, via `OCX_HOME`): under xUnit those tests must share a `[Collection("env")]` (with `[CollectionDefinition("env", DisableParallelization = true)]`), or they flake at random. Under MSTest the equivalent is `[DoNotParallelize]` / `[ResourceLock]`, which MSTEST0074/0075/0076 nudge towards.

### 7. Skip, explicit, culture, fixtures

Measured counts (`evidence-exit-codes.txt`): the xUnit suite reported 4 skipped across two TFMs (1 runtime skip + 1 `Explicit` each), NUnit 4 (`Assert.Ignore` + `[Explicit]`), MSTest 2 (`Assert.Inconclusive`). MSTest message: `Assert.Inconclusive. contract tier not armed`. `[OSCondition(OperatingSystems.Windows)]` and `[Ignore("why")]` both report skipped with their reason. Skipped is never failed and never counted as a gap; the all-skipped hole is closed by `--minimum-expected-tests` (CS-TEST-06).

```csharp
// xUnit v3                                 // MSTest 4.5.1                              // NUnit 5
Assert.SkipUnless(armed, "tier not armed"); if (!armed) Assert.Inconclusive("tier ...");   if (!armed) Assert.Ignore("tier ...");
[CulturedFact(["de-DE"])]                   (no attribute: set/restore + serialise)       [Test, SetCulture("de-DE")]
[Fact(Explicit = true)]                     [OSCondition(OperatingSystems.Windows)]       [Test, Explicit]
```

Do not write an early `return;` for a precondition: it reports a pass. `Assert.Skip(...)` on MSTest is a hallucination (it resolves to LINQ `AsyncEnumerable.Skip`, CS0411).

### 8. Assertions and the FluentAssertions 8 licence

FluentAssertions 8.x is under the Xceed Community License: free for "developing or testing open-source software", personal and experimental projects, and for groups that charge no fees or earn no revenue; "Any use outside of these parameters requires a paid Commercial License" (package `LICENSE`, fixture `nuspec/`; [README](https://github.com/fluentassertions/fluentassertions): "Versions 8 and beyond are free for open-source projects and non-commercial use, but commercial use requires a paid license"; "Version 7 will remain fully open-source indefinitely"). The package metadata for 8.11.0 is `<license type="file">`, for 7.2.0 `Apache-2.0`. The NuGet resolver does not warn.

The notice is real at run time (measured): FluentAssertions 8.11.0 prints `Warning: The component "Fluent Assertions" is governed by the rules defined in the Xceed License Agreement ... An active subscription is required to use Fluent Assertions for commercial use` into the captured test output. It is hidden in the default `dotnet test` summary and shown with `--output Detailed --show-stdout All`; and `--show-stderr` defaults to `Failed` when an AI agent environment is detected, so an agent can pass a whole session without ever seeing it. 7.2.0, AwesomeAssertions 9.6.0 and Shouldly 4.3.0 print nothing.

Alternatives: [AwesomeAssertions](https://github.com/AwesomeAssertions/AwesomeAssertions) is the Apache-2.0 fork ("The license will never change"), same `.Should()` API as FluentAssertions 7 (swap `using FluentAssertions;` for `using AwesomeAssertions;`); testfx, BenchmarkDotNet and command-line-api run on it. Shouldly 4.3.0 is BSD-3 (Polly, GitVersion, spectre.console). Built-in asserts need no dependency and are what simple-exec uses. **Decision: built-in by default (zero licence surface, zero extra analyzer drift); AwesomeAssertions or Shouldly on request; FluentAssertions only at 7.x or lower, never 8+ in a library whose consumers might be commercial.** A pin at 6.12.2 (nuke) or 7.0.0 (MessagePack) is licence-clean but frozen.

### 9. Mocking

The Moq incident, from the [release notes](https://github.com/devlooped/moq/releases): 4.20.0 "Added SponsorLink support" (Aug), 4.20.1 sponsor button, **4.20.2 "Removed SponsorLink"** (said to break restore on macOS; "potential privacy issues" with hashing e-mail addresses; "won't be coming back until that's properly addressed"), 4.20.69 removed it from the readme too, 4.21.0 latest (2026-09-24). Measured by restore only (never built: the analyzer phones GitHub): the closure of Moq 4.20.0 and 4.20.1 contains `Devlooped.SponsorLink 1.0.0` (`include="build,buildTransitive,analyzers"`); 4.18.4, 4.20.2, 4.20.72 and 4.21.0 do not (`evidence-moq-sponsorlink.txt`). Moq 4.20.2 is unlisted on nuget.org (published `1900-01-01`).

Decision, in this order: (1) **no mocking library**; fakes you own (a recording `Stream`, a `FakeTimeProvider`) and the real process via the Ocx.Fake dummy (CS-TEST-01..08) beat interception for a process wrapper. (2) If isolation of an interface is unavoidable: **NSubstitute 6.2.0 with `NSubstitute.Analyzers.CSharp` 1.0.17** (BSD-3; the analyzer turns the classic "non-virtual member is silently not mocked" bug into a build warning, NS1000, measured). (3) Moq only if the repo already uses it, pinned >= 4.20.69, never 4.20.0/4.20.1. FakeItEasy 9.0.1 (MIT) is fine but appears in no exemplar.

### 10. Coverage tools and the silent no-op traps

Two MTP-native tools, both worked on net8.0 and net10.0, Linux x64 and Windows:

| | `Microsoft.Testing.Extensions.CodeCoverage` 18.12.0 | `coverlet.MTP` 10.1.0 |
|---|---|---|
| Enable | package reference; `dotnet test --coverage` | package reference; `dotnet test --coverlet` |
| Format flag | `--coverage-output-format coverage\|xml\|cobertura` (default `coverage`, binary) | `--coverlet-output-format json\|lcov\|opencover\|cobertura\|teamcity` (default `json`,`cobertura` per its doc; measured cobertura only when asked) |
| Output name | `<guid>.cobertura.xml` (starts with a UTF-8 BOM, measured `ef bb bf`) | `coverage.cobertura.<ddMMyyHHmmssfff>.xml` (no BOM) |
| Config | `--coverage-settings <xml>` (CodeCoverage XML) | CLI flags or `testconfig.json` `platformOptions.Coverlet` |
| Threshold | **none** (`--help` lists 4 options) | `--coverlet-threshold N`, `-type`, `-stat`; exit 14 |
| Generated code | **included** unless excluded in settings | excluded by default (`GeneratedCode`, `CompilerGenerated`, `ExcludeFromCodeCoverage`) |
| Licence | closed-source, "free to use" ([Learn](https://learn.microsoft.com/en-us/dotnet/core/testing/microsoft-testing-platform-extensions-code-coverage)) | MIT |
| Bundled by | MSTest metapackage, TUnit | nothing |
| Doc caveat | dynamic instrumentation documented for Windows (x86/x64/Arm64), Linux x64, macOS x64 ([dotnet-coverage](https://learn.microsoft.com/en-us/dotnet/core/additional-tools/dotnet-coverage)); **Linux arm64 and macOS arm64 not run here** | managed instrumentation (arch-neutral by design, not run on arm64 here) |

Both can be referenced together (cake does, `cake-build__cake@08885933e936:src/Cake.Core.Tests/Cake.Core.Tests.csproj:19-22`) and the flag selects the tool; with both flags on one command you get two reports with different numbers (110/141 vs 8/9 unfiltered), which is why you pick one per repo.

**The traps (measured, `evidence-coverage-collector.txt`):**

| Command | Exit | Coverage files |
|---|---|---|
| `coverlet.collector` referenced, plain `dotnet test` | **0** | **0** (silent) |
| `coverlet.msbuild` + `-p:CollectCoverage=true` | **0** | **0** (silent) |
| `coverlet.collector` + `--collect "XPlat Code Coverage"` | 5 | 0 |
| `coverlet.collector` + `--settings x.runsettings` | 5 | 0 |
| `--coverlet` with only the Microsoft extension | 5 | 0 |
| `coverlet.MTP` + `--coverlet --coverlet-output-format cobertura` | 0 | 2 (one per TFM) |
| Microsoft extension + `--coverage --coverage-output-format cobertura` | 0 | 2 |

The silent rows are the dangerous ones: the pipeline is green and the report is simply absent. The xUnit page says it plainly: "Standard Coverlet isn't supported with MTP." testcontainers and CliWrap still ship `coverlet.collector`; they are on VSTest (`testcontainers__testcontainers-dotnet@04cbb73fcc58:tests/Directory.Build.props:14-17`), so that is consistent for them and wrong for an MTP repo.

### 11. Output naming, generated code, exclusions

**Naming.** One `dotnet test` over two TFMs runs both modules in parallel. A fixed `--coverage-output cov.xml` produced **one** file for two TFMs (the second write wins); the default GUID names gave two; one call per TFM with `coverage.$tfm.xml` gave two (`evidence-coverage-output-clobber.txt`). Polly does the last at build time: `<CoverageOutput>` = `.../$(MSBuildProjectName)/coverage.$(TargetFramework).xml` (`App-vNext__Polly@e4476096da5b:eng/Test.targets:26-28`, forwarded as `--coverage-output` at `:41`) and then runs ReportGenerator once per file (`cake.cs:159-200`). Note Polly forwards through the internal `_TestingPlatformCommandLineArguments` target at `eng/Test.targets:31`; the documented property is `TestingPlatformCommandLineArguments` (coverlet's doc shows the shape, `Documentation/Coverlet.MTP.Integration.md:304-319`) and, as CS-TEST-06 measured, it reaches only `dotnet test`, not a directly started exe.

**Generated code.** A `JsonSerializerContext` with `[JsonSerializable]` generates `LibJsonContext.*.g.cs` in `obj/` and the generated types carry `[GeneratedCode]` (reflection: `Lib.LibJsonContext: [..., JsonSerializableAttribute, GeneratedCodeAttribute]`; nested `<>c` types carry `CompilerGeneratedAttribute`). Net10.0, Release (`evidence-generated-code.txt`):

```
RED   Microsoft ext, defaults                 lines-covered=110 lines-valid=141   (6 .g.cs files in the report)
GREEN Microsoft ext + ms-cov.settings.xml     lines-covered=6   lines-valid=7    (0 .g.cs files)
GREEN coverlet.MTP, defaults                  lines-covered=8   lines-valid=9    (0 .g.cs files)
```

```xml
<!-- ms-cov.settings.xml, passed as --coverage-settings <ABSOLUTE PATH> -->
<Configuration><CodeCoverage><Attributes><Exclude>
  <Attribute>^System\.CodeDom\.Compiler\.GeneratedCodeAttribute$</Attribute>
  <Attribute>^System\.Runtime\.CompilerServices\.CompilerGeneratedAttribute$</Attribute>
  <Attribute>^System\.Diagnostics\.CodeAnalysis\.ExcludeFromCodeCoverageAttribute$</Attribute>
</Exclude></Attributes></CodeCoverage></Configuration>
```

The Microsoft default exclusions are `DebuggerNonUserCodeAttribute` and `ExcludeFromCodeCoverageAttribute` only; `GeneratedCodeAttribute` appears in the docs only as a sample entry ([microsoft/codecoverage configuration](https://raw.githubusercontent.com/microsoft/codecoverage/main/docs/configuration.md)); `IncludeTestAssembly` is `false` under MTP. A plain `[ExcludeFromCodeCoverage]` class was excluded without any settings (measured). `[ExcludeFromCodeCoverage]` targets assembly, class, struct, interface (11+), constructor, event, method and property, has a `Justification` property, and on a class excludes all members ([API](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.codeanalysis.excludefromcodecoverageattribute)). Use it on the rare hand-written type that cannot be tested, always with a `Justification`; use the settings file for generated code so STJ contexts (CS-JSON-01) never touch the denominator.

**coverlet.MTP's authoritative config trap.** "When a configuration file is present (`testconfig.json` or `coverlet.mtp.appsettings.json`) ... No defaults are injected" (`coverlet-coverage__coverlet@ecd6fd5533e7:Documentation/Coverlet.MTP.Integration.md:118-122`; defaults at `:109`). Measured (`evidence-ci-paths.txt`): no config 8/9; `{"platformOptions":{"Coverlet":{"format":"cobertura"}}}` **110/141**, 6 generated files back in; adding `"excludeByAttribute": "GeneratedCode,CompilerGenerated,ExcludeFromCodeCoverage"` returned 8/9.

**Debug vs Release.** Same tests, same coverlet: Release 8/9, Debug 9/10 (SDK 10.0.401 and SDK 11 RC1 agree on Debug 9/10). Collect coverage from the Release build that ships.

### 12. Merging across TFMs and OS legs

Inputs: per-TFM cobertura files (net10.0 has `Net10Only`, net8.0 does not). Results (`evidence-coverage-merge.txt`, filtered Microsoft reports):

| Path | Lines (net10 6/7, net8 5/6 merged) | Branches (inputs 4/8 each) |
|---|---|---|
| `dotnet-coverage merge -f cobertura -o m.xml a.xml b.xml` (18.12.0, cobertura in) | 6/7 | **2/4** (halved) |
| ReportGenerator `-reports:"ms/*.xml" -reporttypes:Cobertura` (5.5.11) | 6/7 | 4/8 |
| `.coverage` binaries then `dotnet-coverage merge -f cobertura` | 6/7 | `branch-rate="1"`, no counts |
| coverlet files (8/9 and 7/8), ReportGenerator | 8/9 | 4/8 |

Lines agree everywhere; branch figures do not. So: **merge with ReportGenerator** (Apache-2.0, reads Cobertura, OpenCover, JaCoCo, ... [README](https://github.com/danielpalme/ReportGenerator)), pin it as a local tool (`dotnet tool install dotnet-reportgenerator-globaltool --version 5.5.11` with a manifest), and keep `dotnet-coverage merge` for the `.coverage` format or a pure line-rate need. A merged report is valid only for one source revision; do not mix runs from different commits.

OS legs: the Windows cobertura (`filename="C:\Users\ecom\...\Calc.cs"`, 6/7) and the Linux one (`/home/.../Calc.cs`, 6/7) merged through ReportGenerator to 6/7 with no double count (`evidence-os-leg-merge.txt`); the first report's path wins and ReportGenerator warns `File '...' does not exist (any more)` unless `-sourcedirs` points at a checkout. Testcontainers rewrites absolute paths across jobs for the same reason (`testcontainers__testcontainers-dotnet@04cbb73fcc58:.github/workflows/cicd.yml:153`). Since coverage is a report, collect it on one leg; the matrix legs (CS-CI-01) run the tests without `--coverage`.

### 13. ContinuousIntegrationBuild and `/_/` paths

`ContinuousIntegrationBuild=true` makes the compiler map the source root to `/_/` (`/pathmap:"<checkout>/=/_/"`; requires a git repo with a remote for `SourceRoot`; measured PDB document name `/_/Lib/Calc.cs` against `<FIX>/Lib/Calc.cs` without the flag, via `System.Reflection.Metadata`). Effect on coverage (`evidence-ci-paths.txt`), tests run in the same job as the build:

| Setting | Report `filename` | ReportGenerator from an unrelated cwd |
|---|---|---|
| Microsoft ext, CI=false or true | real local path | finds source |
| coverlet.MTP default, CI=false or true | relative to `<source>/</source>`, real path | finds source |
| Microsoft ext + `<DeterministicReport>True` | unchanged real path (no effect observed in 18.12.0 cobertura) | finds source |
| **coverlet.MTP `deterministicReport: true`, CI=true** | `/_/Lib/Calc.cs`, empty `<source>` | **source missing (0 hits, 10 warnings)**; with `-sourcedirs:<checkout>` source found (4 hits, 6 warnings, all unrelated .g.cs) |

So the answer to the brief: **`/_/` does not break coverage by default; it appears only when `DeterministicReport` is opted into, and then the renderer needs `-sourcedirs`.** coverlet's `DeterministicBuild.md:3` says deterministic support exists "only in the msbuild and collectors drivers"; the MTP driver nonetheless honoured `deterministicReport` (the doc's own key table lists it). Where the report must be consumed on another machine (testcontainers, SonarCloud), either rewrite paths (their step) or use `deterministicReport` plus `-sourcedirs`. `ContinuousIntegrationBuild` itself stays CI-only per CS-PKG; it is unrelated to the test run.

### 14. Thresholds: gate or report

Measured: `--coverlet-threshold 95` exits **14** per module (both TFM modules reported `Exit code: 14`; 70 exits 0), the coverage summary is not printed; the Microsoft extension 18.12.0 offers no threshold flag. MTP 2.4 added a first-class coverage result model so "a compatible collector" can drive exit 14 and a terminal summary ([Learn](https://learn.microsoft.com/en-us/dotnet/core/testing/microsoft-testing-platform-extensions-code-coverage#coverage-summaries-and-thresholds)). Polly's 95% target is a Codecov project status with `require_ci_to_pass: false` (`App-vNext__Polly@e4476096da5b:.github/codecov.yml:5-9`), i.e. a service gate on the merged number, not an in-run one.

Reasons it should be a report: (1) per-module thresholds see one TFM, not the union; (2) the denominator moves with tool, configuration, Debug/Release and compiler (8/9, 9/10, 6/7, 110/141 above); (3) a hard percentage invites an agent to add assertion-free tests or sprinkle `[ExcludeFromCodeCoverage]` to reach it (the number rewards execution, not verification); (4) a library with a hand-written exit table and conformance test (CS-ERR) gets more safety from those than from a percentage. **Decision: publish the merged ReportGenerator summary (Markdown to the job summary) on every PR; no coverage gate by default.** If the owner wants one: a floor on the merged *line* rate (never branch), evaluated once in the aggregator job (the same job that feeds `ci-ok`, CS-CI-05), set to the current value rounded down minus 1 point and only ever raised. `gate-line-rate.sh` (fixture) is the 3-line implementation: floor 85 against a 80.0% report exits 1, floor 75 exits 0, an empty file exits 2.

### 15. Windows and SDK 11 re-runs

Windows host (SDK 10.0.102, net10.0; `evidence-windows-exit-codes.txt`, `evidence-windows-coverage.txt`): xUnit, MSTest, NUnit and TUnit exit 0 / 2 / 8 as on Linux; MS/NU wrong option exit **1** (see section 3); Microsoft extension 110/141 unfiltered and 6/7 with an *absolute* settings path; **a relative `--coverage-settings ms-cov.settings.xml` made `dotnet test` crash with `KeyNotFoundException` in `TerminalTestReporter.AssemblyRunCompleted` (exit 1)** while the same relative path worked on 10.0.401; coverlet.MTP 8/9, cobertura `<source>C:/</source>` + `filename="Users/ecom/..."`, threshold 95 exits 14. The host has no NuGet source configured (restore failed NU1100 until a `nuget.config` was added) and no net8 runtime, so only net10.0 ran.

SDK 11.0.100-rc.1 (`evidence-sdk11.txt`): same 0/2/8/5 and exit 14; coverlet.MTP Debug 9/10 (equal to 10.0.401 Debug). Flagged .NET 11 items: the whole-run zero-tests verdict (CS-TEST-06 measured exit 8 for an all-skipped whole run on SDK 11), and `DOTNET_TEST_RUNNER` overriding `global.json` for a process from .NET 11 Preview 6 ([Learn](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-mstest-runner-intro)).

### 16. Verified on the toolchain

Fixture root: `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-testing-framework-and-coverage/` (`global.json` pins SDK 10.0.401 and `test.runner`). Always `run.sh <cmd>` from `/home/mherwig/.cache/research-lang/dotnet-tools/`. Projects: `Lib` (net8.0;net10.0 library with branches, an async token method, a `[GeneratedCode]` class, an `[ExcludeFromCodeCoverage]` class, a net10-only method, an STJ source-generated context), `Xu`, `MS`, `NU`, `TU` (same tests per framework). Selected commands and observed output; each script prints its own red then green.

| # | Check | Command | RED | GREEN |
|---|---|---|---|---|
| V1 | xUnit exit codes | `./exit-codes.sh` | `FIXTURE_FAIL=1` exit=2; zero tests (`--filter-class Xu.Nope`) exit=8 | exit=0 (23 tests, 4 skipped) |
| V2 | MSTest exit codes | same | exit=2; `--filter "FullyQualifiedName~Nope"` exit=8; `--filter-class` exit=5 | exit=0 |
| V3 | NUnit exit codes | same | exit=2; exit=8; `--filter-class` exit=5 | exit=0 |
| V4 | TUnit exit codes | `evidence-windows-exit-codes.txt` + Linux run | exit=2; `--treenode-filter "/*/*/Nope/*"` exit=8 | exit=0 |
| V5 | token analyzer | `./analyzers.sh` | `Xu/Tests.cs(16,62): warning xUnit1051` | `Token_flowed` line: no diagnostic |
| V6 | MSTest analysis mode | `./analyzers.sh` | `-p:MSTestAnalysisMode=Recommended`: `warning MSTEST0049`, `MSTEST0001` | default: empty output |
| V7-V9 | parallelism | `./parallelism.sh` | MSTest 3567 ms, NUnit 3703 ms, xUnit `Mode=None` 3752 ms | xUnit default 1366 ms; MSTest/NUnit flipped 832 ms |
| V10 | collector silent | `./coverage-collector-red.sh` | `coverlet.collector` plain: `exit=0 coverage-files=0`; `--collect`: exit 5 | `coverlet.MTP` `exit=0 coverage-files=2`; Microsoft ext `exit=0 coverage-files=2` |
| V11 | coverlet.msbuild silent | same | `-p:CollectCoverage=true`: `exit=0 coverage-files=0` | as V10 green |
| V12 | output clobber | `./coverage-output-clobber.sh` | `--coverage-output cov.xml`: `files: cov.xml` (2 TFMs) | GUID names: 2 files; `coverage.net8.0.xml` + `coverage.net10.0.xml` |
| V13 | TFM merge | `./coverage-merge.sh` | `dotnet-coverage merge` cobertura: branches `2/4` | ReportGenerator: lines `6/7`, branches `4/8` |
| V14 | generated code, Microsoft ext | `./coverage-generated-code.sh` | `lines-covered="110" lines-valid="141"`, 6 `.g.cs` | with `ms-cov.settings.xml`: `6/7`, 0 `.g.cs` |
| V15 | coverlet testconfig | `./coverage-ci-paths.sh` (last block) | `{format only}`: `110/141` | `+excludeByAttribute`: `8/9` |
| V16 | `/_/` and source | `./coverage-ci-paths.sh` | `cld-true-nosrc`: `source-text-in-html=0 warnings=10`, filename `/_/Lib/Calc.cs` | `-sourcedirs`: `source-text-in-html=4 warnings=6` |
| V17 | FluentAssertions licence | `./assertions-licence.sh` | `fa8: ... licence-notice-lines=4` | `fa7`, `aa`, `shouldly`: `licence-notice-lines=0` |
| V18 | Moq SponsorLink | `./moq-sponsorlink.sh` | 4.20.0, 4.20.1: `SponsorLink-in-closure=16` | 4.20.2, 4.20.72, 4.21.0: `0` |
| V19 | NUnit 5 `ThrowsAsync` | `./analyzers.sh` and test run | `-p:NoWarn=NUnit2059`: `Throws_unawaited_passes_silently` exit=0 passed=1 | analyzer on: `error NUnit2059`; awaited: exit=2 failed=1 |
| V20 | TUnit unawaited assert | `./analyzers.sh` | `error TUnitAssertions0002` | awaited `Passes` exit=0 |
| V21 | xUnit v3 hygiene | `./analyzers.sh` | `xUnit1049` error, `xUnit1031`, `xUnit1030` warnings | clean tests: none |
| V22 | outdated idioms | `./ai-traps.sh` | `CS0234 Xunit.Abstractions`; `CS0738 IAsyncLifetime`; `CS1503 CulturedFact("de-DE")`; MSTest `CS0246 ExpectedException`, `CS0117 ThrowsException`, `CS0411 Assert.Skip` | `ThrowsExactly`, `Inconclusive`, `CulturedFact(["de-DE"])` build |
| V23 | NSubstitute | `./analyzers.sh` | `warning NS1000` | interface substitute: none |
| V24 | threshold | `dotnet test ... --coverlet --coverlet-threshold 95`; `./gate-line-rate.sh out/ms-rg/Cobertura.xml 85` | exit=14; gate exit=1 | threshold 70 exit=0; gate 75 exit=0 |
| V25 | Windows host | `cmd.exe /c win-exit-codes.cmd`, `win-coverage.cmd` | wrong option exit=1; relative `--coverage-settings` crash | absolute path rc=0, 6/7 |
| V26 | SDK 11 RC1 | `cd sdk11 && ./run.sh` | n/a | exit 0/2/8/5/14 as on 10.0.401 |

Key output excerpts:

```
$ ./coverage-collector-red.sh
## RED a: collector referenced, plain dotnet test   exit=0 coverage-files=0   total: 23
## RED f: coverlet.msbuild + /p:CollectCoverage=true  exit=0 coverage-files=0   total: 23
## GREEN a: coverlet.MTP                              exit=0 coverage-files=2
## GREEN b: Microsoft.Testing.Extensions.CodeCoverage exit=0 coverage-files=2

$ ./assertions-licence.sh        # FluentAssertions 8.11.0 run with --output Detailed --show-stdout All
fa8: exit=0 passed=1 licence-notice-lines=4
fa7: exit=0 passed=1 licence-notice-lines=0
aa: exit=0 passed=1 licence-notice-lines=0
shouldly: exit=0 passed=1 licence-notice-lines=0
```

Numbers of record (SDK 10.0.401, Release, net10.0): Microsoft ext unfiltered with STJ context 110/141 lines, 38/64 branches; filtered 6/7 lines, 4/8 branches; coverlet.MTP 8/9 lines, 4/8 branches.

## Normative guidance candidates

(Numbered for consolidation into `csharp-quality/testing.md` as CS-TEST-09+; each is a checkable imperative. Commands are run from the repo root.)

**T-01. One test framework per solution; new test projects use xUnit v3 on MTP (`xunit.v3.mtp-v2`); an existing repo keeps its incumbent (xUnit v3, MSTest 4, NUnit 5, TUnit).**
Rationale: MTP flags are per-framework and a second framework needs per-project argument routing; xUnit has the strictest default analyzers.
Verify: `rg -o -N -g '*.csproj' -g 'Directory.Packages.props' -e 'Include="(xunit\.v3[A-Za-z0-9.]*|MSTest[A-Za-z0-9.]*|NUnit[A-Za-z0-9.]*|TUnit[A-Za-z0-9.]*)"' . | rg -o -e 'xunit' -e 'MSTest' -e 'NUnit' -e 'TUnit' | sort -u | wc -l` prints `1`.

**T-02. MTP is wired in three places: `global.json` has `"test": { "runner": "Microsoft.Testing.Platform" }`; every test project is `OutputType` `Exe`; and has `UseMicrosoftTestingPlatformRunner` (xUnit), `EnableMSTestRunner` (MSTest) or `EnableNUnitRunner` (NUnit) in the project or `Directory.Build.props`.**
Rationale: without the section SDK 10 fails the build; without the switch the project is a VSTest project.
Verify: `rg -n -e '"runner"\s*:\s*"Microsoft.Testing.Platform"' global.json` matches; `rg -L -e 'UseMicrosoftTestingPlatformRunner' -e 'EnableMSTestRunner' -e 'EnableNUnitRunner' -g '*Tests*.csproj' -g 'Directory.Build.props' .` lists no test project (a file listed only matters if no Directory.Build.props supplies the switch).

**T-03. Do not reference VSTest-era or VSTest-only packages in MTP test projects: `Microsoft.NET.Test.Sdk`, `xunit.runner.visualstudio`, `xunit` (v2), `coverlet.collector`, `coverlet.msbuild`.**
Rationale: dead weight at best; `coverlet.collector` and `coverlet.msbuild` produce no coverage with exit 0 (V10, V11). (The `MSTest` metapackage brings `Microsoft.NET.Test.Sdk` itself; do not add it separately.)
Verify: `rg -n -g '*.csproj' -g '*.props' -e 'Include="(Microsoft\.NET\.Test\.Sdk|xunit\.runner\.visualstudio|xunit|coverlet\.collector|coverlet\.msbuild)"' .` is empty (MSTest-metapackage repos exempt the first).

**T-04. Never mask the runner's exit code: no `--ignore-exit-code`, no `TESTINGPLATFORM_EXITCODE_IGNORE`, no `continue-on-error` on a test step; a gate treats any non-zero exit as failure and does not match specific codes.**
Rationale: 8 and 9 are the broken-filter and all-skipped gates; SDK 10.0.102 on Windows reported 5 as 1.
Verify: `rg -n -g '*.yml' -g '*.yaml' -g '*.sh' -g '*.ps1' -g '*.cmd' -g '*.props' -g '*.targets' -e '--ignore-exit-code' -e 'TESTINGPLATFORM_EXITCODE_IGNORE' -e 'continue-on-error' .` is empty.

**T-05. Every call in a test that accepts a `CancellationToken` receives the test token: xUnit `TestContext.Current.CancellationToken`; MSTest `TestContext.CancellationToken`; NUnit `TestContext.CurrentContext.CancellationToken`; TUnit the injected `CancellationToken`. Never `CancellationToken.None` or `default` in test code.**
Rationale: a hung test is cancelled on timeout or run abort only if the token flows.
Verify: xUnit `.editorconfig` has `dotnet_diagnostic.xUnit1051.severity = error`: `rg -n 'xUnit1051' -g '.editorconfig' -g '*.globalconfig' .`; MSTest `rg -n -e 'MSTestAnalysisMode>(Recommended|All)<' -g '*.props' -g '*.csproj' .`; all frameworks `rg -n -g '*.cs' -e 'CancellationToken\.None' -e 'default\(CancellationToken\)' tests` is empty.

**T-06. Test methods are `async Task` or `async ValueTask`, never `async void`; no blocking (`.Result`, `.Wait()`, `.GetAwaiter().GetResult()`); no `ConfigureAwait` in test code; `CA2007`, `VSTHRD111` and `VSTHRD200` are off for test projects only.**
Rationale: xUnit1049 (Error), 1031, 1030; `ConfigureAwait(false)` "may bypass parallelization limits".
Verify: `rg -n -g '*.cs' -e 'async void' -e 'ConfigureAwait' -e '\.Wait\(\)' -e '\.GetAwaiter\(\)\.GetResult\(\)' tests` is empty.

**T-07. Test-analyzer diagnostics are never silenced by `NoWarn` or severity `none`; the only suppression set for tests is `CA2007;VSTHRD111;VSTHRD200`.**
Rationale: NUnit2059, TUnitAssertions0002 and xUnit1049/2021 are what stops an unawaited assertion passing silently (V19, V20).
Verify: `rg -n -g '*.csproj' -g '*.props' -g '.editorconfig' -g '*.globalconfig' -e 'NoWarn[^<]*(xUnit|NUnit|MSTEST|TUnit)[A-Za-z]*[0-9]+' -e 'dotnet_diagnostic\.(xUnit|NUnit|MSTEST|TUnit)[A-Za-z]*[0-9]+\.severity\s*=\s*(none|silent|suggestion)' .` is empty.

**T-08. Async assertions are awaited: `await Assert.ThrowsAsync<T>(...)` (xUnit, NUnit 5), `await Assert.That(...)` (TUnit). Upgrade NUnit and NUnit.Analyzers in the same commit.**
Rationale: NUnit 5 `ThrowsAsync` returns a `Task`; unobserved it asserts nothing.
Verify: the analyzers of T-07 plus `rg -n -g '*.cs' -e '^\s*Assert\.(ThrowsAsync|CatchAsync|DoesNotThrowAsync)' tests` (a statement starting with the call and no `await`) is empty.

**T-09. Tests that mutate process-global state (environment variables, cwd, culture, static singletons) join a non-parallel group: xUnit `[Collection("name")]` with a `[CollectionDefinition("name", DisableParallelization = true)]`; MSTest `[DoNotParallelize]`/`[ResourceLock]`; NUnit `[NonParallelizable]`.**
Rationale: xUnit runs classes in parallel by default (V7); MSTest/NUnit do once opted in.
Verify: `rg -l -e 'SetEnvironmentVariable' -e 'SetCurrentDirectory' -e 'CultureInfo\.(Current|DefaultThread)\w*Culture\s*=' tests | xargs -r rg -L -e 'Collection\(' -e 'DoNotParallelize' -e 'ResourceLock' -e 'NonParallelizable'` prints nothing.

**T-10. A precondition that is not met skips with a reason through the framework API (xUnit `Assert.SkipUnless/SkipWhen` or `Skip=`; MSTest `Assert.Inconclusive`, `[OSCondition]`, `[Ignore("reason")]`; NUnit `Assert.Ignore`); never an early `return;`. Do not use `Assert.Skip` on MSTest (does not exist).**
Rationale: an early return reports a pass; skipped tests still need the CS-TEST-06 minimum-tests gate.
Verify: `rg -U -n -g '*.cs' -e '\[(Fact|Test|TestMethod)[^\]]*\]\s*public (async )?(void|Task|ValueTask) \w+\([^)]*\)\s*\{\s*if \([^)]*\)\s*return;' tests` is empty; MSTest `[Ignore]` carries a message (MSTEST0066 at warning).

**T-11. Per-test culture uses the framework: xUnit `[CulturedFact([...])]` (array argument), NUnit `[SetCulture]`; on MSTest assign `CultureInfo.CurrentCulture` inside `try`/`finally` in a non-parallel class.**
Rationale: culture leaks across tests; `[CulturedFact("de-DE")]` is CS1503 on xUnit 4.0.2.
Verify: `rg -n -g '*.cs' 'CultureInfo\.(CurrentCulture|CurrentUICulture)\s*=' tests` shows only hits inside a `finally`-restored block (reading heuristic).

**T-12. Assertions: use the framework's built-in assert API. A fluent library is allowed only as AwesomeAssertions or Shouldly. FluentAssertions is forbidden at 8.0.0 or higher (direct or transitive); pins at 7.x or lower are licence-clean.**
Rationale: Xceed Community License; a licence warning printed into test output.
Verify: `rg -n -g '*.csproj' -g '*.props' -e 'Include="FluentAssertions"[^>]*Version="([89]|[1-9][0-9])\.' -e 'PackageVersion Include="FluentAssertions" Version="([89]|[1-9][0-9])\.' .` is empty, and `dotnet list package --include-transitive 2>/dev/null | rg -e 'FluentAssertions\s+(>\s+)?([89]|[1-9][0-9])\.'` prints nothing.

**T-13. No mocking library by default; fakes you own and the real process. If one is needed: NSubstitute with `NSubstitute.Analyzers.CSharp` in the same project; Moq only at >= 4.20.69 (never 4.20.0 or 4.20.1); no `Devlooped.SponsorLink` anywhere in the closure.**
Rationale: SponsorLink in the closure runs an analyzer that reads the developer's git e-mail; NS1000 catches silently ignored setups.
Verify: `dotnet list package --include-transitive 2>/dev/null | rg -i 'SponsorLink'` prints nothing; `rg -n -g '*.csproj' -g '*.props' -e 'Include="Moq"[^>]*Version="4\.20\.[01]"' .` is empty; `rg -c 'Include="NSubstitute"' -g '*.csproj' -g '*.props' .` matches `rg -c 'NSubstitute.Analyzers.CSharp' -g '*.csproj' -g '*.props' .` per file (reading heuristic).

**T-14. Coverage uses exactly one MTP-native tool: `Microsoft.Testing.Extensions.CodeCoverage` (default) or `coverlet.MTP`. Not both in one report. Never `coverlet.collector` or `coverlet.msbuild`. The coverage CI step asserts that at least one cobertura file was produced.**
Rationale: the two tools report different denominators; the silent ones exit 0 with no file (V10, V11).
Verify: `rg -o -N -g '*.csproj' -g '*.props' -e 'Include="(Microsoft\.Testing\.Extensions\.CodeCoverage|coverlet\.MTP)"' . | rg -o -e 'CodeCoverage' -e 'coverlet' | sort -u | wc -l` prints `1`; the CI step contains `test -n "$(find artifacts/coverage -name '*.xml' -print -quit)"`.

**T-15. Coverage runs in `-c Release`, on one Linux x64 leg, with `--coverage-output-format cobertura` (or `--coverlet-output-format cobertura`); other legs run tests without coverage flags.**
Rationale: Debug and Release give different denominators; arm64 instrumentation was not verified; coverage is a report.
Verify: `rg -n -g '*.yml' -g '*.yaml' -e '--coverage' -e '--coverlet' .` hits are in one job whose `runs-on` is `ubuntu-24.04` and whose command has `-c Release`.

**T-16. Multi-TFM coverage never uses one fixed `--coverage-output` file name: keep the default GUID names, or run per TFM (`-f`) with the TFM in the name.**
Rationale: two parallel modules overwrite one path (V12).
Verify: `rg -n -g '*.yml' -g '*.yaml' -g '*.sh' -g '*.ps1' -g '*.cmd' -g '*.props' -g '*.targets' -e '--coverage-output[ =]' .` shows only values containing the TFM; CI asserts `find artifacts/coverage -name '*.xml' | wc -l` >= number of TFMs.

**T-17. The Microsoft extension is always run with `--coverage-settings <absolute path>` to a settings file that excludes `GeneratedCodeAttribute`, `CompilerGeneratedAttribute` and `ExcludeFromCodeCoverageAttribute`; a coverlet `testconfig.json` always lists `excludeByAttribute` with `GeneratedCode,CompilerGenerated,ExcludeFromCodeCoverage`.**
Rationale: STJ contexts inflated 6/7 to 110/141 (V14, V15); relative settings paths crashed `dotnet test` on Windows SDK 10.0.102.
Verify: `rg -n -e '--coverage-settings' .` shows `$PWD`, `${{ github.workspace }}` or `$(MSBuildThisFileDirectory)`; `rg -L 'excludeByAttribute' -g 'testconfig.json' -g '*.testconfig.json' .` is empty; after a run `rg -c 'filename="[^"]*\.g\.cs"' artifacts/coverage` reports 0 for every file.

**T-18. `[ExcludeFromCodeCoverage]` is allowed only with a `Justification`, only on hand-written code that cannot be tested, never on a type to reach a number.**
Rationale: the attribute removes the whole type from the denominator.
Verify: `rg -n -g '*.cs' 'ExcludeFromCodeCoverage' src | rg -v 'Justification'` is empty.

**T-19. Merge per-TFM and per-leg cobertura with ReportGenerator pinned in `.config/dotnet-tools.json` (5.5.11 or later), `-reporttypes:Cobertura;TextSummary;MarkdownSummaryGithub`, and `-sourcedirs` set to the checkout. Do not use `dotnet-coverage merge` on cobertura inputs when branch figures are consumed.**
Rationale: dotnet-coverage halved branch counts (4/8 to 2/4) (V13); sources are missing from an unrelated cwd.
Verify: `rg -n -A2 'dotnet-reportgenerator-globaltool' .config/dotnet-tools.json` shows a version; `rg -n -g '*.yml' -g '*.sh' -e 'reportgenerator' .` lines contain `-sourcedirs`; `rg -n -g '*.yml' -g '*.sh' -e 'dotnet-coverage merge' .` has no cobertura input with a branch consumer.

**T-20. `DeterministicReport`/`deterministicReport` stays off unless a report is consumed on another machine; when on, the renderer gets `-sourcedirs:<checkout>`.**
Rationale: `/_/` paths cannot be resolved from an unrelated cwd (V16); `ContinuousIntegrationBuild` alone does not change reports.
Verify: `rg -n -i 'deterministicreport' .` hits only where `rg -n -e '-sourcedirs' .` is also present.

**T-21. Coverage is a report: publish the merged summary on each PR. A threshold, if the owner chooses one, is a raise-only floor on merged line rate evaluated once in the aggregator job. No per-module `--coverlet-threshold`, no branch threshold.**
Rationale: per-module thresholds see one TFM and exit 14 without a summary; targets reward hollow tests.
Verify: `rg -n -g '*.yml' -g '*.yaml' -g '*.props' -g 'testconfig.json' -e 'coverlet-threshold' -e '"threshold"' .` is empty; any gate script call (`gate-line-rate.sh`) appears only in the aggregator job.

**T-22. Test commands in docs and CI use the filter syntax of the project's framework: xUnit `--filter-class/-method/-namespace/-trait` or `--filter`; MSTest and NUnit `--filter` only; TUnit `--treenode-filter`. No `--logger`, `--collect`, `--settings` on MTP projects.**
Rationale: wrong option exits 5; a mistyped filter exits 8.
Verify: `rg -n -g '*.md' -g '*.yml' -g '*.sh' -g '*.ps1' -e '--(logger|collect)\b' -e '--settings\b' .` is empty; `rg -n -e '--filter-(class|method|namespace)' -g '*.yml' -g '*.sh' -g '*.md' .` appears only for xUnit projects.

**T-23. Own the coverage file format: treat MS cobertura as UTF-8 with BOM and coverlet cobertura as BOM-less; parse with an XML parser, never `^<\?xml` anchored text matching.**
Rationale: measured `ef bb bf` on Microsoft files.
Verify: `rg -n -g '*.sh' -g '*.yml' -e "\^<\\?xml" .` is empty.

## AI-agent angle

What an LLM characteristically gets wrong here, and the smallest mechanical check:

| Reflex | Why it fails | Check |
|---|---|---|
| `coverlet.collector` + `--collect:"XPlat Code Coverage"`, or `coverlet.msbuild` + `/p:CollectCoverage=true` | VSTest-era; under MTP exit 5 or a green run with no file (V10, V11) | T-03 `rg`; CI step asserting a coverage file exists |
| `Microsoft.NET.Test.Sdk` + `xunit.runner.visualstudio` copied into every test csproj | dead weight, signals VSTest mode | T-03 `rg` |
| `dotnet test --logger trx`, `--settings`, `--filter-class` on MSTest/NUnit | exit 5 | T-22 `rg`; run once in CI |
| Latest FluentAssertions (8.11.0) because "it is what everyone uses" | commercial licence, notice only visible with `--show-stdout All` | T-12 `rg` + `dotnet list package` |
| Moq without a version, or an old snippet pinning 4.20.0/4.20.1 | SponsorLink in the closure | T-13 `dotnet list package ... SponsorLink` |
| xUnit v2 idioms: `using Xunit.Abstractions;`, `Task InitializeAsync()`, `async void` tests, `[CollectionBehavior(DisableTestParallelization = true)]` | v3 removed them (CS0234, CS0738, xUnit1049 Error) | compile; xUnit1049 |
| `[CulturedFact("de-DE")]` | needs an array in 4.0.2 (CS1503) | compile |
| MSTest v1/v2 idioms: `[ExpectedException]`, `Assert.ThrowsException`, hallucinated `Assert.Skip` | removed in MSTest 4.5.1 (CS0246, CS0117, CS0411) | compile; use `ThrowsExactly`, `Inconclusive`, `[OSCondition]` |
| NUnit 5: `Assert.ThrowsAsync(...)` as a statement | returns `Task`; without `await` it asserts nothing | NUnit2059 Error; T-07 forbids silencing it |
| TUnit: `Assert.That(x).IsEqualTo(y);` without `await` | assertion never runs | TUnitAssertions0002 Error |
| `ConfigureAwait(false)` in tests (copied from library code, CS-ASYNC-02) | xUnit1030; "may bypass parallelization limits" | T-06 `rg` |
| `CancellationToken.None` / no token in tests | a hung test is never cancelled | xUnit1051; T-05 `rg` |
| `.Result` in a test to "keep it simple" | deadlock risk | xUnit1031; T-06 |
| Early `return;` when a precondition is missing | reports a pass | T-10 multiline `rg` |
| Setting `Environment` variables / cwd in an xUnit test without a collection | classes run in parallel by default | T-09 `rg` pipeline |
| Fixed `--coverage-output coverage.xml` in a multi-TFM project | one report silently overwritten | T-16 `rg` + file count assertion |
| Reading a number off the first coverage run and setting a gate near it | denominators differ by tool, config, Debug/Release (8/9, 9/10, 6/7, 110/141) | T-15, T-17; no gate by default |
| STJ source-generated context left in the denominator | 110/141 instead of 6/7 | T-17 `.g.cs` count |
| Writing a `testconfig.json` for coverlet containing only `format` | silently drops the default exclusions | T-17 `rg -L` |
| Hollow tests or `[ExcludeFromCodeCoverage]` to reach a percentage | the number rewards execution | T-18; no threshold (T-21) |
| Silencing `NUnit2059`/`xUnit10xx` in `NoWarn` to get a green build | turns a compile error into a silent pass | T-07 `rg` |
| Passing `--coverage-settings coverage.settings.xml` (relative) | crashed `dotnet test` on Windows SDK 10.0.102 | T-17 `rg` |
| Parsing MS cobertura with `^<?xml` | BOM | T-23 `rg` |

One agent-visible platform fact: `--show-stderr` defaults to `Failed` "when an LLM/AI agent environment is detected" (MTP 2.5.1 `--help`), so notices written to stderr or captured stdout (the FluentAssertions licence, diagnostics) can be absent from the transcript; use `--output Detailed --show-stdout All --show-stderr All` when investigating.

## Contested / evolving

- **Coverage tool.** Microsoft's extension (bundled by MSTest and TUnit, five exemplars) vs coverlet.MTP (an OSS port of `coverlet.collector`, versioned 8.x to 10.1.0 since the MTP driver landed; GitVersion, cake). Trend as of 2026-10: both stay; MTP 2.4's first-class coverage model gives collectors a common summary/threshold channel (exit 14), and only coverlet implements a threshold today. The default here is the Microsoft extension for ubiquity and a settings file; the coverlet default-exclusion behaviour is arguably friendlier. Revisit when the Microsoft extension exposes thresholds.
- **Deterministic report.** coverlet's doc says deterministic support is not in the MTP driver, its MTP table lists `DeterministicReport`, and it worked (measured). The Microsoft extension accepted `<DeterministicReport>True` but its cobertura path did not change in 18.12.0. Expect documentation and behaviour to converge.
- **xUnit v3 4.0 drift.** MTP v2 is the default from 4.0.0 and `xunit.v3.mtp-v1` stops at 3.x; docs for the new `Parallelization` attribute exist and the type is in `Xunit.v3`; `xunit.v3.mtp-v2` 4.0.2 was published two days before this research. The `--zero-tests-policy` docs attribute it to "MTP 4.3.0" while the platform here is 2.5.1 (CS-TEST-06).
- **NUnit 5.0.0** (2026-09-27, the only source for its change list beyond our own runs is a [secondary article](https://startdebugging.net/2026/10/nunit-5-assert-throwsasync-must-be-awaited/)): `ThrowsAsync` returns `Task`, `TestDelegate` removed, `net6.0` dropped, analyzer NUnit2059 added in 4.14.0. Measured: classic `Assert.AreEqual` still compiles (NUnit2007/NUnit2048 warnings), so "NUnit 4 removed the classic model" is not true of 5.0.0 as shipped. Adoption is early (npgsql is on 4.6.1 over VSTest).
- **TUnit** (MIT, MTP-only, source-generated, async assertions, 1.73.19) is the fastest-growing newcomer and ran cleanly here, but no corpus exemplar uses it and an agent's prior on its API is weak; incumbent-only for now.
- **Assertion libraries.** The FluentAssertions licence change (8.0.0 published 2025-01-14) split the ecosystem: forks (AwesomeAssertions, now also dogfooded by testfx), Shouldly (5.0.0-preview.2 in flight), built-in asserts. AwesomeAssertions has diverged on version numbers (9.x) while remaining 7.x-API-shaped.
- **Mocking.** Moq 4.21.0 was released 2026-09-24 and coverlet pins it; testfx pins 4.20.72; NSubstitute 6.2.0 is the choice of Polly and cake. The SponsorLink trust cost is why this note ranks Moq third, not because the current Moq is unsafe.
- **Gate vs report.** Polly gates 95% through Codecov; most libraries in the corpus have no gate. The agent-coverage-gaming risk is the argument for report-only; a raise-only floor is the compromise. Mutation testing (testfx runs Stryker weekly) is the stronger signal and out of scope here.
- **.NET 11.** `DOTNET_TEST_RUNNER` (Preview 6), whole-run zero-tests verdict, `--maximum-failed-tests` (exit 13): flagged, not adopted; SDK 11 RC1 behaved like 10.0.401 on every check in this note (GA is November 2026).
- **Windows `dotnet test` exit mapping.** 5 became 1 on SDK 10.0.102 and not on 10.0.401; whether this is a fixed bug or a version difference is unverified.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://learn.microsoft.com/en-us/dotnet/core/testing/microsoft-testing-platform-extensions-code-coverage | MTP code coverage page: Microsoft extension options, coverlet.MTP options, threshold exit 14 (primary) | updated 2026-10-01 | the tool list and flags used in section 10 |
| https://learn.microsoft.com/en-us/dotnet/core/additional-tools/dotnet-coverage | `dotnet-coverage` reference: `merge`, formats, platform support of instrumentation (primary) | 2026-08 | merge syntax; arm64 caveat |
| https://learn.microsoft.com/en-us/dotnet/core/testing/mstest-analyzers/overview | MSTest analyzer index with default severities and `MSTestAnalysisMode` (primary) | 2026-10-06 | MSTEST0049/0001 defaults |
| https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-mstest-runner-intro | Run tests with MSTest: `EnableMSTestRunner`, metapackage contents, .NET 11 `DOTNET_TEST_RUNNER` (primary) | 2026-10-01 | bundled CodeCoverage/TrxReport |
| https://learn.microsoft.com/en-us/dotnet/core/testing/microsoft-testing-platform-troubleshooting | MTP exit-code table 0-14, `--ignore-exit-code`, extension-option exit 5 (primary) | 2026-09-21 | the exit contract |
| https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.codeanalysis.excludefromcodecoverageattribute | `ExcludeFromCodeCoverageAttribute` API, targets, `Justification` (primary) | net-10.0 | attribute rules |
| https://raw.githubusercontent.com/microsoft/codecoverage/main/docs/configuration.md | Microsoft code coverage configuration reference: defaults, `DeterministicReport`, `IncludeTestAssembly` (primary) | main, 2026 | default attribute exclusions |
| https://xunit.net/xunit.analyzers/rules/ | xUnit analyzer rule index with default severities (primary) | 2026 | 51/48/14/2 split |
| https://xunit.net/xunit.analyzers/rules/xUnit1051 | xUnit1051: token flow in tests (primary) | 2026 | the rule and its fix |
| https://xunit.net/docs/getting-started/v3/whats-new | xUnit v3 changes: `Assert.Skip*`, `Explicit`, `AssemblyFixture`, `TestContext.Current` (primary) | v3 | feature matrix |
| https://xunit.net/docs/running-tests-in-parallel | xUnit parallelism defaults and the 4.0 `Parallelization` attribute (primary) | 2026 | default behaviour |
| https://xunit.net/docs/getting-started/v3/microsoft-testing-platform | xUnit v3 on MTP: package line, enabling, "Standard Coverlet isn't supported" (primary) | 2026 | packages and flags |
| https://raw.githubusercontent.com/nunit/nunit.analyzers/master/documentation/index.md | NUnit.Analyzers rule table with severities (primary) | master, 2026 | NUnit2059 and defaults |
| https://docs.nunit.org/articles/vs-test-adapter/NUnit-And-Microsoft-Test-Platform.html | NUnit on MTP: `EnableNUnitRunner`, adapter >= 5.0 (primary) | 2026 | enablement |
| https://github.com/devlooped/moq/releases | Moq release notes: SponsorLink added 4.20.0, removed 4.20.2, 4.21.0 latest (primary) | 2023-2026 | incident record |
| https://github.com/fluentassertions/fluentassertions | FluentAssertions README: v8 licence statement, v7 stays open source (primary) | 2025-2026 | licence wording |
| https://github.com/AwesomeAssertions/AwesomeAssertions | AwesomeAssertions README: Apache-2.0 fork, "will never change" (primary) | 2026 | replacement |
| https://github.com/danielpalme/ReportGenerator | ReportGenerator README: inputs, merge by globbing, report types, `-sourcedirs`, Apache-2.0 (primary) | 2026 | merge tool |
| https://api.nuget.org/v3-flatcontainer/fluentassertions/8.11.0/fluentassertions.nuspec | FluentAssertions 8.11.0 nuspec: `license type="file"`, Xceed author; the package `LICENSE` (Xceed Community License) was read from the restored nupkg (primary) | 2026-09-14 | licence evidence |
| https://api.nuget.org/v3-flatcontainer/moq/4.20.0/moq.nuspec | Moq 4.20.0 nuspec with `Devlooped.SponsorLink` dependency, vs 4.20.2+ without (primary) | 2023 | closure evidence |
| https://api.nuget.org/v3/registration5-gz-semver2/moq/4.21.0.json | NuGet registration leaf: publish dates for every package version cited (primary) | 2026-10 | dates in section 1 |
| `coverlet-coverage__coverlet@ecd6fd5533e7:Documentation/Coverlet.MTP.Integration.md` | coverlet.MTP options, defaults, authoritative `testconfig.json` (primary, clone) | 2026 | config trap |
| `coverlet-coverage__coverlet@ecd6fd5533e7:Documentation/DeterministicBuild.md` | deterministic reports and `/_/` (primary, clone) | 2026 | CI path behaviour |
| `microsoft__testfx@7226b0c74729:src/Platform/Microsoft.Testing.Platform/Helpers/ExitCodes.cs` | the platform's exit-code enum (primary, source) | 2026 | codes 8, 9, 14 |
| `xunit__xunit@0c7aa4991fa3:src/xunit.v3.core/CulturedFactAttribute_reflection.cs` and `.../Attributes/ParallelizationAttribute.cs` | the attributes' real signatures (primary, source) | v3-4.0.2 | array argument; namespace |
| `App-vNext__Polly@e4476096da5b:eng/Test.targets` and `cake.cs` | MTP + Microsoft coverage + per-TFM output + ReportGenerator pipeline (real source) | 2026 | the closest reference implementation |
| `adamralph__simple-exec@f80913246993:tests/Directory.Build.props` | xUnit v3 MTP test posture with built-in asserts and CA2007 off (real source) | 2026 | test-project suppressions |
| `testcontainers__testcontainers-dotnet@04cbb73fcc58:.github/workflows/cicd.yml` | cross-job coverage path rewrite (real source) | 2026 | absolute paths across jobs |
| https://startdebugging.net/2026/10/nunit-5-assert-throwsasync-must-be-awaited/ | secondary: NUnit 5.0.0 breaking changes, NUnit2059 | 2026-10 | the change list; verified by fixture V19 |
| https://learn.microsoft.com/en-us/dotnet/core/testing/microsoft-testing-platform-extensions-code-coverage#coverage-summaries-and-thresholds | MTP 2.4 first-class coverage result and exit 14 (primary) | 2026 | threshold channel |
| fixtures `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-testing-framework-and-coverage/evidence-*.txt` | our measured outputs on SDK 10.0.401, 10.0.102 (Windows), 11.0 RC1 | 2026-10-11 | reproduces every "measured" claim |
