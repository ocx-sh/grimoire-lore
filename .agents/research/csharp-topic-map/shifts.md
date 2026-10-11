---
title: "C# / .NET recent shifts (Oct 2024 - Oct 2026) and the advice they obsolete"
scout: shifts
model: claude-sonnet-5-5
date_researched: 2026-10-10
sources_count: 38
scope: |
  Landscape scout. Corpus: what changed in C# 13/14/15 and .NET 9/10/11 in the
  last ~24 months, plus tooling, packaging and support-policy shifts. Output is
  a ranked question list for the C# SDK that wraps the ocx CLI plus general C#
  quality. It does not answer the questions.
---

# C# / .NET recent shifts - landscape scout

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   - [A. Era map: dates, versions, support](#a-era-map-dates-versions-support)
   - [B. Language shifts (C# 13, 14, 15)](#b-language-shifts-c-13-14-15)
   - [C. Runtime and library shifts](#c-runtime-and-library-shifts)
   - [D. SDK, build and test tooling shifts](#d-sdk-build-and-test-tooling-shifts)
   - [E. Packaging and supply-chain shifts](#e-packaging-and-supply-chain-shifts)
   - [F. Platforms: Windows, macOS, Linux, x64 and arm64](#f-platforms-windows-macos-linux-x64-and-arm64)
   - [G. What the exemplar corpus actually does](#g-what-the-exemplar-corpus-actually-does)
   - [H. Measured on the pinned toolchain](#h-measured-on-the-pinned-toolchain)
   - [I. Obsoleted-advice table](#i-obsoleted-advice-table)
   - [J. Not verified](#j-not-verified)
3. [Candidate topics](#candidate-topics)
4. [Sources](#sources)

## Summary

- **The .NET 8 floor expires in a month.** .NET 8 and .NET 9 both reach end of support on 2026-11-10; .NET 10 (LTS) runs to 2028-11-14 ([support policy](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core)). "Floor = net8.0" is a policy question, not a default.
- **STS is now 24 months** (announced 2025-09-16, effective from .NET 9). Old advice "STS dies in 18 months, skip it" is stale ([STS post](https://devblogs.microsoft.com/dotnet/dotnet-sts-releases-supported-for-24-months/)).
- **.NET 11 adds a first-party Process run/capture API** (`Process.Run`, `RunAsync`, `RunAndCaptureTextAsync`, `ReadAllLinesAsync`, `StartAndForget`, `Process.Signal`, `ProcessStartInfo.KillOnParentExit`, `StartSuspended`, `InheritedHandles`) at RC1 ([libraries 11](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/libraries)). Measured: present on net11.0 RC1, absent on net8.0 and net10.0 (section H). A net8/net10 SDK cannot use it; third-party wrappers (CliWrap and friends) remain the only portable option, or a hand-rolled seam.
- **.NET 10 removed the runtime's default SIGTERM/SIGHUP handler.** `AppDomain.ProcessExit` no longer runs on SIGTERM ([breaking change](https://learn.microsoft.com/en-us/dotnet/core/compatibility/core-libraries/10.0/sigterm-signal-handler)); measured (section H). Cleanup of spawned `ocx` children on host termination needs explicit `PosixSignalRegistration`.
- **`KillOnParentExit` is android/linux/windows only - not macOS** (measured on RC1 via `SupportedOSPlatformAttribute`); the Learn page says "Windows only", so docs lag the runtime. Orphan prevention on macOS stays hand-built.
- **C# 14 (.NET 10, Nov 2025)**: `field` keyword, extension members (`extension` blocks incl. properties and static members), null-conditional assignment, first-class `Span<T>` conversions, `nameof(List<>)`, lambda parameter modifiers, partial constructors/events, user-defined compound assignment ([C# 14](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-14)). Measured: `net8.0` + `LangVersion=14` compiles `field`; the language version decouples from the TFM on SDK 10.
- **C# 15 / .NET 11 (RC1, GA Nov 2026) shipped unions as preview-track**: `union` types, `closed` hierarchies, extension indexers, collection-expression `with(...)` arguments, labeled `break`/`continue`, unsafe-evolution ([C# 15](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-15)). Measured: a `union Pet(Dog, Cat)` compiles and System.Text.Json round-trips it on net11.0 RC1. Flag all of it as era-specific; the Roslyn status page still labels it "Targeted for C# 15" ([roslyn status](https://github.com/dotnet/roslyn/blob/main/docs/Language%20Feature%20Status.md)).
- **System.Text.Json grew a strict preset**: `JsonSerializerOptions.Strict`, `AllowDuplicateProperties`, `RespectNullableAnnotations`, property-name-conflict validation (.NET 10) ([libs 10](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/libraries), [conflict check](https://learn.microsoft.com/en-us/dotnet/core/compatibility/serialization/10/property-name-validation)). Strict is read-compatible with Default but rejects unknown members - a tension for a wrapper of a CLI that may add JSON fields.
- **`dotnet test` has two modes.** .NET 10 SDK added native Microsoft.Testing.Platform (MTP) mode, opt-in via `global.json` `test.runner`; zero tests now exit 8; options differ per framework ([dotnet test](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-with-dotnet-test), [migration](https://learn.microsoft.com/en-us/dotnet/core/testing/migrating-vstest-microsoft-testing-platform)). 12 of 35 exemplars already use xUnit v3 and 12 use MTP (section G).
- **NuGet audit now covers transitive packages by default for net10+** (`NuGetAuditMode=all`), so a vulnerability in a transitive dependency can fail a `TreatWarningsAsErrors` restore ([breaking change](https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/10.0/nugetaudit-transitive-packages)). Polly pins `direct` (section G).
- **Package pruning** of framework-provided references is on by default for net10+ and can raise NU1510 ([SDK 10](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/sdk), [compat list](https://learn.microsoft.com/en-us/dotnet/core/compatibility/10.0)).
- **`dotnet new sln` now emits `.slnx`** (.NET 10; SDK support since 9.0.200) ([slnx](https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/10.0/dotnet-new-sln-slnx-default)). 24 of 35 exemplars already ship a `.slnx` (section G).
- **NuGet trusted publishing (OIDC) exists**: short-lived (1 hour) single-use API keys minted from a GitHub/GitLab OIDC token against a nuget.org policy; replaces stored API keys ([trusted publishing](https://learn.microsoft.com/en-us/nuget/nuget-org/trusted-publishing)). SHA-1 fingerprints in `dotnet nuget sign` are now an error ([sha1](https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/10.0/dotnet-nuget-sign-sha1-deprecated)).
- **`System.Linq.AsyncEnumerable` is in the box in .NET 10** and collides with the community `System.Linq.Async` package (source break) ([breaking change](https://learn.microsoft.com/en-us/dotnet/core/compatibility/core-libraries/10.0/asyncenumerable)).
- **Official TFM guidance still says "consider netstandard2.0"** for breadth, "start with net8.0 or later" for new libraries ([cross-platform targeting](https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/cross-platform-targeting)). 30 of 35 exemplars still mention netstandard2.0 (many are analyzers where it is mandatory); the major SDKs (OpenAI, Anthropic, Polly, Testcontainers, CliWrap) still ship it (section G).
- **arm64 is a first-class CI target for free** on public repos: `windows-11-arm`, `ubuntu-24.04-arm`, `macos-latest` (M1) ([runners](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)); .NET 10 supports macOS 26/15/27 on Arm64 and x64 and Windows on Arm64 ([supported OS](https://github.com/dotnet/core/blob/main/release-notes/10.0/supported-os.md)).
- **Default analyzers drift every SDK** (CA2023, CA2266 added in .NET 10 as warnings) because `AnalysisLevel` defaults to `latest` ([code analysis](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/overview)).
- **BinaryFormatter is gone** in .NET 9 (APIs present, implementation always throws) ([libs 9](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-9/libraries)).
- **Unpinned SDK selection picks prereleases** (measured earlier in the frame); `dnx` scripts additionally bypass `global.json` in SDK 10.0.302+/11 P6 ([dnx](https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/11/dnx-scripts-bypass-global-json)).

## Findings

### A. Era map: dates, versions, support

| Item | Date | Version | Source |
|---|---|---|---|
| .NET 8 LTS | released 2023-11-14, EOS 2026-11-10 | C# 12 | [support policy](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core) |
| .NET 9 STS | released 2024-11-12, EOS 2026-11-10 (was 2026-05-12 before the extension) | C# 13 | [support policy](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core), [STS post](https://devblogs.microsoft.com/dotnet/dotnet-sts-releases-supported-for-24-months/) |
| .NET 10 LTS | released 2025-11-11, EOS 2028-11-14 | C# 14 | [support policy](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core) |
| .NET 11 | RC1 2026-09-08, GA expected November 2026 (.NET Conf Nov 10-13); policy page does not state its type | C# 15 default | [support policy](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core), [.NET 11 overview](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/overview) |
| STS extended 18 -> 24 months | announced 2025-09-16 | effective from .NET 9 | [STS post](https://devblogs.microsoft.com/dotnet/dotnet-sts-releases-supported-for-24-months/) |

Consequence for the ocx SDK: on the date of this research (2026-10-10) the declared floor (.NET 8) has ~31 days of vendor support left. Two defensible stances (net8.0 floor for reach, or net10.0 LTS only) have different costs; the map should force the decision.

### B. Language shifts (C# 13, 14, 15)

**C# 13 (.NET 9, 2024-11)** ([C# 13](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-13)):

- `params` accepts `Span<T>`, `ReadOnlySpan<T>`, `IEnumerable<T>`, `IReadOnlyList<T>` etc., not just arrays. Obsoletes "params means an array allocation per call".
- `System.Threading.Lock` plus `lock` statement recognition. Obsoletes "lock on a private `object`" as the default.
- `OverloadResolutionPriorityAttribute` - for library authors adding a better overload without source-breaking callers. Directly relevant to public-API evolution.
- `partial` properties/indexers; `\e` escape (useful for ANSI output); `allows ref struct`; `ref struct` interfaces; `ref`/`unsafe` in async/iterators.
- `field` shipped as a preview in C# 13 and became stable in C# 14.

**C# 14 (.NET 10, 2025-11)** ([C# 14](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-14)):

- `field` keyword (replaces hand-written backing fields in setters with validation); the doc warns of a breaking change where a member is already named `field` (use `@field` / `this.field`).
- `extension<T>(...) { ... }` blocks: extension properties, static extension members and operators. Obsoletes "extension methods only".
- Null-conditional assignment `a?.B = c;` (right side not evaluated when `a` is null; `++`/`--` not allowed).
- First-class span conversions (`T[]` -> `ReadOnlySpan<T>` implicit; spans as extension receivers). A compatibility note lists "C# 14 overload resolution with span parameters" as a behavioral change ([compat 10](https://learn.microsoft.com/en-us/dotnet/core/compatibility/10.0)).
- `nameof(List<>)`; modifiers on simple lambda parameters; partial constructors and events; user-defined compound assignment and increment/decrement operators ([.NET 10 overview](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/overview)).
- File-based apps get new preprocessor directives (`#:`), see section D.

**C# 15 (.NET 11 RC1, GA Nov 2026) - era-specific, flag everything** ([C# 15](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-15), [.NET 11 overview](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/overview)):

- `union` types with exhaustive `switch` (runtime scaffolding `UnionAttribute`/`IUnion` since .NET 11 Preview 5; the doc says some proposal features are not yet implemented). Union support also in System.Text.Json (`JsonUnionAttribute`, structural classifier) and F# unions ([libs 11](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/libraries)).
- `closed` class hierarchies (exhaustiveness over a fixed assembly-local set).
- Collection expression arguments `[with(capacity: n), ..xs]` / `[with(StringComparer.OrdinalIgnoreCase), ...]`.
- Extension indexers; labeled `break`/`continue` (IDE0410 flags the flag-variable / `goto` patterns).
- Memory safety rework: pointer operations relaxed outside `unsafe`; `unsafe(expr)`; `safe` modifier; requires `LangVersion=preview` for the new rules.
- Roslyn "Working Set" lists more (dictionary expressions, null-conditional await, chained relational comparison, extension constants) as in progress, not C# 15 ([roslyn status](https://github.com/dotnet/roslyn/blob/main/docs/Language%20Feature%20Status.md)).

### C. Runtime and library shifts

**Process (the centre of the ocx SDK)**

- .NET 9 -> 10 added `ProcessStartInfo.CreateNewProcessGroup` (Windows) to send isolated signals to children that could otherwise take the parent down ([libs 10](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/libraries)).
- .NET 10 removed default termination handlers: on Unix no default SIGTERM handler; on Windows no default `CTRL_SHUTDOWN_EVENT`/`CTRL_CLOSE_EVENT` handlers. `AppDomain.ProcessExit` and `AssemblyLoadContext.Unloading` no longer fire; `HostingHostBuilderExtensions.UseConsoleLifetime` or `PosixSignalRegistration.Create` restore it ([breaking change](https://learn.microsoft.com/en-us/dotnet/core/compatibility/core-libraries/10.0/sigterm-signal-handler)).
- .NET 11 (RC1) adds, per the Learn page: `Process.Run`/`RunAsync`, `RunAndCaptureText`/`RunAndCaptureTextAsync` returning `ProcessTextOutput`, `ReadAllText`/`ReadAllBytes`/`ReadAllLines`(+Async) with a `ProcessOutputLine` that distinguishes stdout from stderr, `Process.StartAndForget`, `ProcessStartInfo.StartDetached`/`KillOnParentExit`/`StartSuspended`/`InheritedHandles`/`StandardInputHandle` etc., `SafeProcessHandle.Start/Kill/Signal/WaitForExit(Async)/Resume/Open`, `Process.Signal(PosixSignal)`, `WaitForExitStatus`, `ProcessExitStatus` ([libs 11](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/libraries)). The API-proposal-implementing PR describes the intent as removing "deadlock-prone output reading" and adding "run-and-wait patterns" with kill on timeout/cancellation ([dotnet/runtime#126800](https://github.com/dotnet/runtime/pull/126800)); that PR shows `merged_at: null` in the GitHub API, but the APIs are present in the RC1 SDK (section H), so they landed by another route. Linux support for `KillOnParentExit` was merged 2026-05-04 ([dotnet/runtime#127112](https://github.com/dotnet/runtime/pull/127112)).
- Old advice obsoleted in .NET 11 only: hand-wiring `OutputDataReceived`/`ErrorDataReceived`, `BeginOutputReadLine` plus `WaitForExit()` dance, and P/Invoke job objects. Unchanged for net8/net10 targets.
- The `dotnet` CLI itself moved "non-command-relevant data" such as first-run messages from stdout to stderr in .NET 10; more messages "will undergo a similar change" ([stderr](https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/10.0/dotnet-cli-stderr-output)). Relevant to any tool that parses a CLI's stdout: stdout purity is now an explicit CLI-design norm.

**System.Text.Json**

- .NET 9: `JsonSerializerOptions.Web`, indentation options, `JsonSchemaExporter`, `RespectNullableAnnotations`, `JsonStringEnumMemberName` ([libs 9](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-9/libraries)).
- .NET 10: `AllowDuplicateProperties`, `JsonSerializerOptions.Strict` (disallow unmapped members, no duplicates, case-sensitive, respect nullable annotations and required constructor parameters; "read-compatible with Default"), `PipeReader` deserialization, `ReferenceHandler` in `JsonSourceGenerationOptions` ([libs 10](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/libraries)).
- .NET 10 also validates that user property names do not collide with reserved metadata names (`$type`, `$id`, `$ref`, a custom `TypeDiscriminatorPropertyName`) at first use, as `InvalidOperationException` ([conflict check](https://learn.microsoft.com/en-us/dotnet/core/compatibility/serialization/10/property-name-validation)).
- .NET 11: union serialization, JSON Lines (JSONL) output, expanded polymorphism and source generation, naming and ignore controls ([libs 11](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/libraries)).
- Source generation remains the AOT/trim answer: `JsonSerializerContext`, `TypeInfoResolverChain` order matters, non-generic `JsonStringEnumConverter` is unsupported by Native AOT (use `JsonStringEnumConverter<T>`), `JsonSerializerIsReflectionEnabledByDefault=false` makes reflection fallbacks fail loudly, and if `PublishTrimmed` is on reflection is disabled automatically ([source gen](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/source-generation)).

**Other**

- BinaryFormatter removed in .NET 9 ([libs 9](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-9/libraries)).
- `System.Linq.AsyncEnumerable` in core libs; `SelectAwait` call sites must change to `Select`; use `ExcludeAssets=compile` for transitive `System.Linq.Async` ([breaking change](https://learn.microsoft.com/en-us/dotnet/core/compatibility/core-libraries/10.0/asyncenumerable)).
- .NET 11: "Runtime Async" (runtime-native async) no longer needs `EnablePreviewFeatures` for net11.0 projects and the libraries are compiled with it; effect: cleaner async stack traces ([.NET 11 overview](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/overview)).
- .NET 11: new minimum hardware requirements for x86/x64 and Arm64; `Environment.TickCount` Windows-consistent; `DateOnly`/`TimeOnly.TryParse` throw for invalid input in some cases; Tar/Zip validation tightened ([compat 11](https://learn.microsoft.com/en-us/dotnet/core/compatibility/11)).
- OpenTelemetry convergence: .NET 10 default trace-context propagator is now W3C ([compat 10](https://learn.microsoft.com/en-us/dotnet/core/compatibility/10.0)); .NET 11 adds built-in OTel metrics for `MemoryCache`, declarative `Activity` tracing rules, and the SDK's own CLI telemetry moves from Application Insights to OpenTelemetry ([.NET 11 overview](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/overview)).
- Unverified-but-plausible: the effect of .NET 10's `Uri` length-limit removal and `BufferedStream.WriteByte` no-implicit-flush on stream-pumping code ([compat 10](https://learn.microsoft.com/en-us/dotnet/core/compatibility/10.0)) - listed in the table only; not studied.

### D. SDK, build and test tooling shifts

- **File-based apps** (`dotnet run hello.cs`, shebang `#!/usr/bin/env dotnet`, `#:project`, `#:property PublishAot=false`, `#:package`/`#:sdk` directives) arrived with .NET 10; all file-based apps target native AOT by default; `dotnet project convert` migrates to a `.csproj`; .NET 11 adds `#:include` and `dotnet format` support ([SDK 10](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/sdk), [program structure](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/program-structure/), [.NET 11 overview](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/overview)). Double quotes in file-level directives are disallowed (breaking change in .NET 10).
- **`dotnet tool exec` / `dnx`**: one-shot tool execution without install; prompts for confirmation unless a local manifest pins the version. SDK 10.0.302+/.NET 11 P6 `dnx` scripts bypass `global.json` and use the newest installed SDK ([SDK 10](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/sdk), [dnx](https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/11/dnx-scripts-bypass-global-json)). Pertinent to "bootstrap ocx anywhere" if ocx were shipped as a .NET tool.
- **Platform-specific .NET tools** (.NET 10): one package with per-RID payloads plus an `any` RID fallback; AOT/self-contained/trimmed variants ([SDK 10](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/sdk)). Also `--cli-schema` introspection on every `dotnet` command.
- **`.slnx`**: default for `dotnet new sln` (.NET 10), `--format sln` to opt out ([slnx](https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/10.0/dotnet-new-sln-slnx-default)). `.NET 11` adds `.slnf` editing from the CLI.
- **Terminal Logger on by default** (.NET 9) for `build`, `clean`, `msbuild`, `pack`, `publish`, `restore`, `test`; disable with `--tl:off` or `MSBUILDTERMINALLOGGER=off` ([SDK 9](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-9/sdk)). Obsoletes parsing `dotnet build` text output by line.
- **`--interactive` defaults to true** in interactive terminals (.NET 10) ([SDK 10](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/sdk)) - hazard for scripts and agents that shell out to `dotnet`.
- **Testing**:
  - .NET 10 SDK: native MTP mode, enabled in `global.json` with `"test": {"runner": "Microsoft.Testing.Platform"}`; requires MTP >= 1.7; `dotnet test MySolution.sln` must become `dotnet test --solution`, project -> `--project`, dll -> `--test-modules` ([dotnet test](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-with-dotnet-test)).
  - Zero tests: VSTest tolerates, MTP fails with exit code 8 (`--ignore-exit-code 8` or `TESTINGPLATFORM_EXITCODE_IGNORE`). Extension-gated options (`--report-trx` needs `Microsoft.Testing.Extensions.TrxReport`, `--coverage` needs `CodeCoverage`) exit 5 when the extension is absent ([migration](https://learn.microsoft.com/en-us/dotnet/core/testing/migrating-vstest-microsoft-testing-platform)).
  - Frameworks: MSTest >= 3.2 (`EnableMSTestRunner`), NUnit3TestAdapter >= 5.0 (`EnableNUnitRunner`), xUnit.net via `xunit.v3` with `UseMicrosoftTestingPlatformRunner`; xUnit filters are different (`--filter-trait` etc.) ([migration](https://learn.microsoft.com/en-us/dotnet/core/testing/migrating-vstest-microsoft-testing-platform)).
  - xUnit v3: standalone executables, `TestContext.Current.CancellationToken`, `Assert.Skip*`, timeouts signal the token rather than killing the test; analyzer xUnit1051 flags missing token pass-through ([xunit v3](https://xunit.net/docs/getting-started/v3/whats-new)).
  - Encoding trap: VSTest runs the test host with `CreateNoWindow=true` and drops a CI codepage 65001 setting; MTP preserves it, so child-process tests can see a UTF-8 BOM on stdin; workaround `Console.InputEncoding = new UTF8Encoding(false)` ([migration](https://learn.microsoft.com/en-us/dotnet/core/testing/migrating-vstest-microsoft-testing-platform)).
  - .NET 11 SDK: `DOTNET_TEST_RUNNER` env var (from Preview 6), `--timeout`, `--maximum-failed-tests`, JSON for `--list-tests`, xUnit v3/MTP templates ([.NET 11 overview](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/overview), [dotnet test](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-with-dotnet-test)).
- **NuGet restore behaviour**:
  - `NuGetAuditMode` defaults to `all` when targeting net10+ (it was `direct`; a .NET 9 preview flip was reverted in 9.0.101). Warnings NU1901-NU1904 become errors under `TreatWarningsAsErrors`; escape hatches are `WarningsNotAsErrors`, `NuGetAuditSuppress`, `NuGetAuditMode=direct` ([breaking change](https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/10.0/nugetaudit-transitive-packages)).
  - Package pruning of framework-provided references (`RestoreEnablePackagePruning=false` to disable); NU1510 is raised for direct references pruned by NuGet; `PackageReference` without a version raises NU1015 (relevant for CPM mistakes) ([SDK 10](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/sdk), [compat 10](https://learn.microsoft.com/en-us/dotnet/core/compatibility/10.0)).
  - Central Package Management: `Directory.Packages.props`, per-TFM `PackageVersion` conditions, `CentralPackageTransitivePinningEnabled` promotes pinned transitives to explicit nuspec dependencies when packing ("should be carefully evaluated when authoring a library"), NU1507 when several sources exist without source mapping ([CPM](https://learn.microsoft.com/en-us/nuget/consume-packages/central-package-management)).
- **Analyzers**: code quality analysis is on by default for net5+; the default-enabled set grows by SDK (CA2022 in .NET 9; CA2023, CA2266 in .NET 10); `AnalysisLevel` default is `latest`, so a newer SDK silently adds warnings; `AnalysisMode` None/Default/Minimum/Recommended/All; style rules (IDE*) need `EnforceCodeStyleInBuild` for CLI builds ([code analysis](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/overview)). .NET 9 added MSBuild BuildChecks (`/check`), torn-SDK analyzer-toolset fix, workload sets ([SDK 9](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-9/sdk)).
- **SDK 11**: NativeAOT CLI entry enabled by default, MSBuild server on by default, OpenTelemetry replaces Application Insights for CLI telemetry (OTLP exporter activates on any `OTEL_EXPORTER_OTLP_*` variable) ([.NET 11 overview](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/overview)); template-engine packages no longer support netstandard2.0 ([compat 11](https://learn.microsoft.com/en-us/dotnet/core/compatibility/11)).

### E. Packaging and supply-chain shifts

- **Trusted publishing to nuget.org (OIDC)**: policy keyed on repository owner, repository, workflow *file name only*, optional environment; `NuGet/login@v1` exchanges the `id-token: write` OIDC token for a temporary API key valid 1 hour, one token -> one key; policies for private repos start with a 7-day temporary activation to bind repo IDs (anti-resurrection); GitLab is supported; policy goes inactive if the owning user leaves the owning organization ([trusted publishing](https://learn.microsoft.com/en-us/nuget/nuget-org/trusted-publishing)). Obsoletes the long-lived `NUGET_API_KEY` repository secret as the default.
- **Signing**: `dotnet nuget sign` rejects SHA-1 certificate fingerprints since .NET 10 (use SHA-256/384/512) ([sha1](https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/10.0/dotnet-nuget-sign-sha1-deprecated)).
- **Package validation** (`EnablePackageValidation`) has three validators: baseline-version, compatible-runtime, compatible-framework ([package validation](https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/package-validation/overview)); that is the tooling answer to binary-compat of a multi-targeted SDK.
- **AOT/trim for libraries**: `IsTrimmable` (defaults true when `IsAotCompatible` is true), `EnableTrimAnalyzer` for warnings without claiming trim-compat, `VerifyReferenceTrimCompatibility`/IL2125; trimming analysis only exists for net6.0+, so a `netstandard2.0` build gives no trim warnings and the guidance is to multi-target a `net6.0+` TFM too ([trimming libs](https://learn.microsoft.com/en-us/dotnet/core/deploying/trimming/prepare-libraries-for-trimming)). "Introducing trim analysis warnings is a breaking change when the library is used with `PublishTrimmed`" - same page.
- **Containers**: console apps can `dotnet publish /t:PublishContainer` without `EnableSdkContainerSupport`; `ContainerImageFormat` Docker|OCI; .NET 11 adds `wslc`/`container` runtimes and reproducible digests via `SOURCE_DATE_EPOCH` ([SDK 10](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/sdk), [.NET 11 overview](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/overview)).

### F. Platforms: Windows, macOS, Linux, x64 and arm64

- .NET 10 supports Windows 10/11 on Arm64, x64, x86; macOS 15/26/27 on Arm64 and x64; Alpine, Debian 13, Ubuntu 26.04/24.04/22.04, RHEL 8-10 etc. on x64, Arm64 (some also Arm32) ([supported OS](https://github.com/dotnet/core/blob/main/release-notes/10.0/supported-os.md)).
- GitHub-hosted arm64 runners are free and unlimited on public repos: `windows-11-arm`, `ubuntu-24.04-arm`, `macos-latest` / `macos-14` / `macos-15` / `macos-26` (M1), plus Intel `macos-15-intel`, `macos-26-intel`; private repos consume minutes ([runners](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)). The 2024-era advice "run arm64 under emulation or skip it" is stale.
- .NET 11 raises minimum hardware requirements for x86/x64 and Arm64 ([.NET 11 overview](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/overview), [compat 11](https://learn.microsoft.com/en-us/dotnet/core/compatibility/11)). .NET 10: OpenSSL 1.1.1+ required on Unix; OpenSSL primitives unsupported on macOS ([compat 10](https://learn.microsoft.com/en-us/dotnet/core/compatibility/10.0)).
- Process feature support is not uniform across OSes (measured, section H): `StartSuspended` windows+macos only; `KillOnParentExit` android/linux/windows; `CreateNewProcessGroup` windows only.

### G. What the exemplar corpus actually does

Corpus: `/home/mherwig/.cache/research-lang/exemplars/csharp` (35 clones). Counts below use `git -C <repo> grep -q <pat> -- <globs>` / `ls-files` per repo, summed with a shell loop (commands inline); read-only.

| Signal | Repos (of 35) | Command | Notes |
|---|---|---|---|
| ships a `.slnx` | 24 | `for d in */; do git -C $d ls-files '*.slnx' \| head -1; done \| grep -c .` | Azure.Core slice has 316 `.slnx` files |
| `Directory.Packages.props` (CPM) | 22 | `for d in */; do git -C $d ls-files \| grep -q Directory.Packages.props && echo y; done \| wc -l` | |
| mentions `netstandard2.0` in csproj/props/targets | 30 | `git -C $d grep -q netstandard2.0 -- '*.csproj' '*.props' '*.targets'` | inflated by analyzers/source generators where it is mandatory (roslynator, StyleCop, Meziantou, testfx) |
| `xunit.v3` | 12 | `git -C $d grep -qE 'xunit\.v3' -- '*.csproj' '*.props' '*.targets'` | |
| MTP markers (`UseMicrosoftTestingPlatformRunner`, `Microsoft.Testing.Platform`, `EnableMSTestRunner`, `TestingPlatformDotnetTestSupport`, `MSTest.Sdk`) | 12 | same shape | |
| `IsAotCompatible` | 12 | same shape | |
| `EnablePackageValidation` | 6 | same shape | Polly, coverlet, FluentValidation, vs-threading, nodatime, stripe |
| `NuGetAudit*` | 5 | same shape | |
| `ContinuousIntegrationBuild` | 17 | same shape | |
| `PublicApiAnalyzers` | 10 | same shape | |
| `global.json` present | 28 | `git -C $d ls-files \| grep -qx global.json` | |

Specific evidence (sha via `git -C <dir> rev-parse --short=12 HEAD`):

- CliWrap targets `netstandard2.0;netstandard2.1;net6.0;net7.0;net10.0` and sets `IsAotCompatible` - `Tyrrrz__CliWrap@7dbc252fa773:CliWrap/CliWrap.csproj:3` and `:9`.
- simple-exec targets only `net8.0;net9.0;net10.0` - `adamralph__simple-exec@f80913246993:Directory.Build.props:13`; xUnit v3 + MTP runner: `tests/Directory.Build.props:9` (`UseMicrosoftTestingPlatformRunner`), `Directory.Packages.props:14-15` (`xunit.v3.assert`, `xunit.v3.mtp-v2` 4.0.1).
- OpenAI SDK: `ClientTargetFrameworks` = `net10.0;net8.0;netstandard2.0` - `openai__openai-dotnet@1f0e8829acac:Directory.Build.props:7`. Anthropic SDK: `net8.0;net9.0;netstandard2.0` - `anthropics__anthropic-sdk-csharp@ae16e5933f39:src/Directory.Build.props:28`; its tests target `net8.0;net472` - `src/Anthropic.Tests/Anthropic.Tests.csproj:9`.
- Polly.Core targets `net8.0;net6.0;netstandard2.0;net472;net462` and `IsAotCompatible` - `App-vNext__Polly@e4476096da5b:src/Polly.Core/Polly.Core.csproj:4,15`; enables package validation by default - `eng/Library.targets:16`; pins `NuGetAuditMode=direct` - `eng/Common.props:9`.
- Testcontainers modules target `net8.0;net9.0;net10.0;netstandard2.0;netstandard2.1` - `testcontainers__testcontainers-dotnet@04cbb73fcc58:src/Testcontainers.ActiveMq/Testcontainers.ActiveMq.csproj:3`.
- Aspire sets the native MTP runner in `global.json:30` (`"runner": "Microsoft.Testing.Platform"`) - `dotnet__aspire@af646baee1e8`; testfx at `global.json:37` - `microsoft__testfx@7226b0c74729`.
- Stripe: `EnablePackageValidation=true` at `src/Stripe.net/Stripe.net.csproj:27`, `NuGetAudit=false` at `:29` - `stripe__stripe-dotnet@dbdca6ba5efc`.
- MedallionShell still carries `netstandard1.3;netstandard2.0;net45;net46;net471` - `madelson__MedallionShell@e45f1f6ffd4c:MedallionShell/MedallionShell.csproj:4` (a stale TFM matrix, a "what not to copy" example).

Reading: the CLI-wrapper libraries split on TFM policy (CliWrap and the AI SDKs keep `netstandard2.0`; simple-exec and Testcontainers' newest line go modern-only or net8+). That split is the open question.

### H. Measured on the pinned toolchain

Fixtures: `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/shifts-landscape/{probe,probe11,lang,union,sigterm}`; runner `run.sh`.

1. **API presence by runtime** (`probe`, `probe11`; reflection over `Process`/`ProcessStartInfo`/`JsonSerializerOptions`):
   - Command: `run.sh dotnet run -f net8.0`, `-f net10.0` in `probe`; `run.sh dotnet run` in `probe11` (global.json pins 11.0.100-rc.1.26425.128).
   - net8.0 (8.0.31): `Process.Run/RunAsync/RunAndCaptureText(Async)/StartAndForget/ReadAllLinesAsync/Signal/WaitForExitStatus` all False; `ProcessStartInfo.KillOnParentExit/StartDetached/StartSuspended/CreateNewProcessGroup/InheritedHandles` False; `JsonSerializerOptions.Strict` and `AllowDuplicateProperties` False.
   - net10.0 (10.0.12): same Process results False **except** `CreateNewProcessGroup` True; `Strict` and `AllowDuplicateProperties` True.
   - net11.0 (11.0.0-rc.1.26425.128): all True.
2. **Platform attributes on RC1** (`probe11`, `GetCustomAttributes<SupportedOSPlatformAttribute>`): `KillOnParentExit: android,linux,windows`; `StartSuspended: windows,macos`; `CreateNewProcessGroup: windows`; `StartDetached`: none. `RunAndCaptureTextAsync(ProcessStartInfo, CancellationToken)` returns `Task<ProcessTextOutput>` with `ExitStatus, StandardOutput, StandardError, ProcessId`. Conflict: the Learn page says `KillOnParentExit` is "Windows only"; the runtime attributes say otherwise (macOS absent).
3. **Language version decouples from TFM** (`lang`): `run.sh dotnet build` with `TargetFramework=net8.0` on SDK 10.0.401 fails `error CS9202: Feature 'field keyword' is not available in C# 12.0. Please use language version 14.0 or greater.`; `run.sh dotnet build -p:LangVersion=14` succeeds. `dotnet msbuild -getProperty:LangVersion`: net8.0 -> 12.0, net10.0 -> 14.0, net11.0 -> 15.0 (`union` fixture).
4. **Unions on net11.0 RC1** (`union`): `union Pet(Dog, Cat);` + `p switch { Dog d => ..., Cat c => ... }` builds and runs; `JsonSerializer.Serialize(p)` prints `{"Name":"Rex"}` (case written directly, no discriminator, as the Learn page states).
5. **SIGTERM** (`sigterm`; handler `AppDomain.ProcessExit` writes a marker file; `kill -TERM` after 3 s): net8.0 exit 143, marker `ProcessExit ran`; net10.0 exit 143, marker `none`. Matches the .NET 10 breaking change; the exit code is unchanged, only the managed cleanup is skipped.

### I. Obsoleted-advice table

| Commonly-trained advice | Obsoleted by | Version / date | Source |
|---|---|---|---|
| "Hand-wire `OutputDataReceived`/`ErrorDataReceived`; use `Task.Run` pumps to avoid deadlock" | `Process.RunAndCaptureTextAsync`, `ReadAllLinesAsync` (net11 only) | .NET 11 RC1, 2026-09 | [libs 11](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/libraries) |
| "The runtime handles SIGTERM, hook `ProcessExit` for cleanup" | no default termination handlers | .NET 10, 2025-11 | [sigterm](https://learn.microsoft.com/en-us/dotnet/core/compatibility/core-libraries/10.0/sigterm-signal-handler) |
| "STS releases are supported 18 months" | 24 months | from .NET 9, announced 2025-09-16 | [STS post](https://devblogs.microsoft.com/dotnet/dotnet-sts-releases-supported-for-24-months/) |
| "Target net8.0 as the modern floor" | .NET 8 EOS 2026-11-10 | 2026-11 | [support policy](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core) |
| "Backing field + manual setter for validation" | `field` keyword | C# 14, .NET 10 | [C# 14](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-14) |
| "Extension methods only; static helpers for 'extension properties'" | `extension` blocks | C# 14 | [C# 14](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-14) |
| "`if (x != null) x.P = v;`" | `x?.P = v;` | C# 14 | [C# 14](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-14) |
| "`params` allocates an array" | `params ReadOnlySpan<T>` / collections | C# 13, .NET 9 | [C# 13](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-13) |
| "`lock (new object())`" | `System.Threading.Lock` | C# 13, .NET 9 | [C# 13](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-13) |
| "Model sum types as abstract class + sealed subclasses + default arm" | `union`, `closed` (preview-track) | C# 15, .NET 11 RC1 | [C# 15](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-15) |
| "Use `System.Linq.Async` for `IAsyncEnumerable` LINQ" | `System.Linq.AsyncEnumerable` in box | .NET 10 | [asyncenumerable](https://learn.microsoft.com/en-us/dotnet/core/compatibility/core-libraries/10.0/asyncenumerable) |
| "BinaryFormatter with a mitigation switch" | removed (always throws) | .NET 9 | [libs 9](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-9/libraries) |
| "Default `JsonSerializerOptions` is fine" | `Strict`, `RespectNullableAnnotations`, `AllowDuplicateProperties` | .NET 9/10 | [libs 10](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/libraries) |
| "`dotnet test` is VSTest; pass `--logger trx`" | MTP mode, `--report-trx` + extension, `--solution/--project` | .NET 10 SDK | [dotnet test](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-with-dotnet-test) |
| "NuGet audit only warns about direct packages" | `NuGetAuditMode=all` for net10+ | .NET 10 Preview 3 | [audit](https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/10.0/nugetaudit-transitive-packages) |
| "Store `NUGET_API_KEY` as a repo secret" | trusted publishing (OIDC) | 2025 (docs dated 2025-07, updated 2026-07) | [trusted publishing](https://learn.microsoft.com/en-us/nuget/nuget-org/trusted-publishing) |
| "`dotnet new sln` -> classic `.sln`" | `.slnx` default | .NET 10 | [slnx](https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/10.0/dotnet-new-sln-slnx-default) |
| "Parse `dotnet build` text" | Terminal Logger default; first-run text on stderr | .NET 9 / .NET 10 | [SDK 9](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-9/sdk), [stderr](https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/10.0/dotnet-cli-stderr-output) |
| "Scripts in C# need a solution and csproj" | file-based apps | .NET 10 | [SDK 10](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/sdk) |

### J. Not verified

- **MSTest 4** (source-breaking vs v3, minimum .NET 8, analyzer severities raised, `TestMethodAttribute.Execute` -> `ExecuteAsync`): known only from a web search summary of the Learn migration page; I did not fetch the page. Treat as a lead.
- **Unity**: an unverified third-party ticket claims a CoreCLR desktop player in Unity 6.7 and editor integration in 6.8 (.NET 10 / C# 14, stable ~2027); the Unity 6 manual still lists .NET Standard 2.1 and .NET Framework 4.8 as the profiles. I fetched none of these pages. This matters for the netstandard2.0 decision and should be re-checked by the TFM scout.
- Whether a `System.Diagnostics.Process`-equivalent backport package for net8/net10 exists or is planned: not found in my corpus.
- Real effect of `NuGetAuditMode=all` on a package graph with `System.Text.Json` on `netstandard2.0` (older STJ versions have had advisories): not measured (needs network).
- Whether `Microsoft.Testing.Platform` v2 is released and what it removes (the docs say the VSTest-mode bridge is removed "in MTP version 2 if run with .NET 10 SDK"): version status not checked.

## Candidate topics

Priority = for an ocx C# SDK first, then general C# quality. "Covered?" = whether an existing rule/skill in the set already answers it (the frame says no C# guidance exists; language-neutral docs sets exist for docs-quality and code-docs).

| # | Topic (question) | Why it matters | Source | Covered? | Priority |
|---|---|---|---|---|---|
| 1 | With .NET 8 EOS on 2026-11-10 and .NET 10 LTS to 2028-11-14, which TFM floor should the ocx SDK declare, and how do we phrase it so a bundle of rules does not rot in a month? | Floor sets language features, API surface and CI matrix; the frame assumes net8.0 | [support policy](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core), [STS post](https://devblogs.microsoft.com/dotnet/dotnet-sts-releases-supported-for-24-months/) | no | high |
| 2 | Should the SDK also ship `netstandard2.0` (and `net462`) for .NET Framework / Unity, and what does that cost (Process API gaps, polyfills, STJ source-gen package, no trim analysis, nullable attributes)? | Owner flagged as open; exemplars split | [cross-platform targeting](https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/cross-platform-targeting), [trimming libs](https://learn.microsoft.com/en-us/dotnet/core/deploying/trimming/prepare-libraries-for-trimming), exemplars (section G) | no | high |
| 3 | Which process-spawn abstraction to build on today (raw `Process`, CliWrap-style, or a thin seam that later delegates to .NET 11 `Process.RunAndCaptureTextAsync`), and how is the net11 API polyfilled on net8/10? | APIs exist only on net11 (measured); the SDK's core | [libs 11](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/libraries), section H | no | high |
| 4 | How is stdout vs stderr read concurrently without deadlock, with ordering, bounded memory and a line/record framing contract for `--format json` output? | The classic Process deadlock; new `ProcessOutputLine` shows intended shape | [libs 11](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/libraries), [dotnet/runtime#126800](https://github.com/dotnet/runtime/pull/126800) | no | high |
| 5 | What is the cancellation contract: token -> graceful signal -> grace period -> kill process tree, on Windows (`CreateNewProcessGroup`, Ctrl-Break) vs Unix (SIGTERM/SIGINT) and exit-code mapping (130/143/-1)? | Cancellation must reach the Rust `ocx` child without orphaning | [libs 10](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/libraries), [libs 11](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/libraries) | no | high |
| 6 | When the host process gets SIGTERM/SIGHUP/CTRL_CLOSE, how does the SDK kill or release its `ocx` children now that .NET 10 has no default handler? | Measured: `ProcessExit` skipped on net10 | [sigterm](https://learn.microsoft.com/en-us/dotnet/core/compatibility/core-libraries/10.0/sigterm-signal-handler), section H | no | high |
| 7 | How to prevent orphaned `ocx` children on macOS where `KillOnParentExit` is unavailable (job objects on Windows, PDEATHSIG on Linux)? | Measured platform matrix gap; docs and runtime disagree | section H, [dotnet/runtime#127112](https://github.com/dotnet/runtime/pull/127112) | no | medium |
| 8 | Argument construction: `ArgumentList` vs `Arguments`, Windows quoting, `.cmd`/`.bat` shim resolution, `UseShellExecute=false`, PATH/PATHEXT lookup - what is the one safe path? | Quoting bugs are cross-platform and security-relevant; not changed by the shifts, so training advice is stale only by omission | [libs 11](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/libraries) (`ProcessStartInfo` expansions) | no | high |
| 9 | Encodings of stdin/stdout/stderr and CI codepages: what `StandardOutputEncoding`, `Console.InputEncoding`, BOM and `CreateNoWindow` do per host (VSTest vs MTP)? | Documented trap with UTF-8 BOM into child stdin | [migration](https://learn.microsoft.com/en-us/dotnet/core/testing/migrating-vstest-microsoft-testing-platform) | no | high |
| 10 | Which `JsonSerializerOptions` for decoding CLI output: `Strict` (rejects unknown members) vs tolerant defaults, `AllowDuplicateProperties`, `RespectNullableAnnotations`, case rules - and how does that interact with forward-compatibility of ocx's JSON? | Strict is read-compatible with Default but fails on unknown fields | [libs 10](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/libraries) | no | high |
| 11 | System.Text.Json source generation for every wire type: context layout, `TypeInfoResolverChain` order, `JsonStringEnumConverter<T>`, disabling reflection defaults, how users extend with their own context? | AOT/trim and extensibility seam | [source gen](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/source-generation) | no | high |
| 12 | How are on-disk and JSON schema versions handled: version fields, unknown enum values, additive-only evolution, `required` vs nullable, and a contract test against the ocx schema crate? | Format drift is the SDK's main runtime failure mode | [property-name conflicts](https://learn.microsoft.com/en-us/dotnet/core/compatibility/serialization/10/property-name-validation), [libs 11](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/libraries) | no | high |
| 13 | Which C# 14 features are safe on a net8.0 floor (measured: `LangVersion=14` compiles `field`), and which need runtime support - what is the project's `LangVersion` rule? | Decoupling LangVersion from TFM is the lever for modern code on an old floor | section H, [C# 14](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-14) | no | high |
| 14 | `field` keyword: when to prefer it, shadowing hazard with members named `field`, interplay with nullable annotations and `init`? | New default for validated properties | [C# 14](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-14) | no | medium |
| 15 | Extension blocks: public-API placement, binary compatibility vs classic extension methods, discoverability, analyzer/IDE support? | New API surface technique with compat consequences | [C# 14](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-14) | no | medium |
| 16 | How should the SDK model result variants today (records + sealed hierarchy) so it can adopt `union`/`closed` after C# 15 GA without a breaking change? | Unions are preview-track; sum types fit CLI outcomes | [C# 15](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-15), section H | no | medium |
| 17 | Public-API evolution mechanics: `OverloadResolutionPriority`, `params ReadOnlySpan<T>`, optional parameters, default interface members, `[Obsolete]` diagnostics, source vs binary compat - what is the allowed-change list? | Library authoring centre | [C# 13](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-13), [compat 10](https://learn.microsoft.com/en-us/dotnet/core/compatibility/10.0) | no | high |
| 18 | Which gate enforces binary compatibility: `EnablePackageValidation` baseline, PublicApiAnalyzers (`PublicAPI.Shipped.txt`), both? (6 and 10 of 35 exemplars use them) | Mechanical enforcement beats prose | [package validation](https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/package-validation/overview), section G | no | high |
| 19 | Test stack: xUnit v3 + MTP vs MSTest vs NUnit; `global.json` `test.runner`, `--solution/--project`, exit code 8 on zero tests, extension-gated flags (exit 5), per-framework filters in a mixed repo? | Test command shape changed; agents will run the wrong command | [dotnet test](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-with-dotnet-test), [migration](https://learn.microsoft.com/en-us/dotnet/core/testing/migrating-vstest-microsoft-testing-platform), [xunit v3](https://xunit.net/docs/getting-started/v3/whats-new) | no | high |
| 20 | How do tests of a CLI wrapper stay hermetic and fast: fake `ocx` executable vs real binary, temp dirs, ports, parallelism, CI codepage, cancellation tokens in tests (`TestContext.Current.CancellationToken`)? | Testing seam for subprocess code | [xunit v3](https://xunit.net/docs/getting-started/v3/whats-new) | no | high |
| 21 | Publishing: trusted publishing (OIDC) setup, environment-scoped policy, 1-hour key lifetime, ordering of login vs push, GitLab variant, SHA-256 signing - and what lore rule text must say so it survives? | Replaces long-lived secrets; failure modes (7-day pending, org membership) | [trusted publishing](https://learn.microsoft.com/en-us/nuget/nuget-org/trusted-publishing), [sha1](https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/10.0/dotnet-nuget-sign-sha1-deprecated) | no | high |
| 22 | How is the `ocx` binary itself delivered to each RID (win/linux/osx x x64/arm64): embedded in RID-specific NuGet packages, downloaded at runtime, a platform-specific .NET tool with the `any` RID, or `dnx`? | "Bootstrap ocx anywhere" is a requirement; .NET 10 added new tool packaging | [SDK 10](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/sdk), [dnx](https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/11/dnx-scripts-bypass-global-json) | no | high |
| 23 | Repo scaffolding defaults: `.slnx`, CPM with per-TFM versions, `global.json` pin (prerelease risk), `Directory.Build.props` layering, `ContinuousIntegrationBuild`, SourceLink - what is the minimal template? | Unpinned SDK picked an RC (measured in frame); 24/22/28 of 35 exemplars use slnx/CPM/global.json | [slnx](https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/10.0/dotnet-new-sln-slnx-default), [CPM](https://learn.microsoft.com/en-us/nuget/consume-packages/central-package-management), section G | no | medium |
| 24 | NuGet audit policy: `NuGetAuditMode=all` default on net10+ vs warnings-as-errors; when to use `WarningsNotAsErrors`, `NuGetAuditSuppress`, `direct`; what does a library owe consumers? | Restore can fail on someone else's advisory; Polly pins `direct` | [audit](https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/10.0/nugetaudit-transitive-packages), section G | no | medium |
| 25 | Package pruning and CPM transitive pinning: effect on a multi-targeted library's nuspec dependencies (NU1510, NU1015, pinned transitives promoted on pack)? | Changes shipped dependency graph silently | [SDK 10](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/sdk), [CPM](https://learn.microsoft.com/en-us/nuget/consume-packages/central-package-management) | no | medium |
| 26 | Analyzer posture: which `AnalysisLevel`/`AnalysisMode` pin, `EnforceCodeStyleInBuild`, `.editorconfig` severities, and the third-party set (Meziantou, Roslynator, vs-threading) - and how to avoid new CA rules breaking a pinned build on SDK upgrades? | Default set grows per SDK (CA2023, CA2266 in .NET 10) | [code analysis](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/overview) | no | high |
| 27 | Nullable reference types as the public contract: annotation discipline, `RespectNullableAnnotations` at the JSON boundary, polyfills on netstandard2.0, `required`/`init`? | Nullable is now enforced at serialization time | [libs 9](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-9/libraries), [libs 10](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/libraries) | no | high |
| 28 | Trim/AOT compatibility of the SDK: `IsAotCompatible` only meaningful for net6+; test app with `TrimmerRootAssembly`; no reflection in the wire path? | Consumers may publish AOT CLIs wrapping ocx | [trimming libs](https://learn.microsoft.com/en-us/dotnet/core/deploying/trimming/prepare-libraries-for-trimming) | no | medium |
| 29 | Async API shape: `Task` vs `ValueTask`, token-last convention, `IAsyncEnumerable<T>` streaming of output (and the `System.Linq.Async` collision), sync-over-async prohibition, `ConfigureAwait(false)` in libraries, runtime-async on net11? | Library-author async rules changed at the edges | [asyncenumerable](https://learn.microsoft.com/en-us/dotnet/core/compatibility/core-libraries/10.0/asyncenumerable), [.NET 11 overview](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/overview) | no | high |
| 30 | Resource cleanup: `Process`/`SafeProcessHandle` lifetime, `IAsyncDisposable`, temp directories, what `Dispose` does and does not kill, finalizer policy? | Leaks of handles and children are silent | [libs 11](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/libraries) | no | high |
| 31 | Extensibility seams: which types are interfaces, which are sealed, how do users inject a custom runner, logger (`ILogger`), clock (`TimeProvider`), HTTP/OCI hooks without freezing the API? | Sealed-by-default vs open; binary compat | [cross-platform targeting](https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/cross-platform-targeting) | no | high |
| 32 | Culture and globalization: invariant culture on every parse/format that touches the CLI, `InvariantGlobalization`, ICU on Alpine, analyzers CA1304/CA1305/CA1311 that are not in the default set? | Turkish-i style bugs; ICU version env vars were renamed in .NET 10 | [compat 10](https://learn.microsoft.com/en-us/dotnet/core/compatibility/10.0), [code analysis](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/overview) | no | medium |
| 33 | Path handling across Windows/Linux/macOS: `Path.Join`, separators, case sensitivity, long paths, UNC, drive roots, relative vs full, paths round-tripped through JSON? | A cross-platform requirement; classic bug source | [cross-platform targeting](https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/cross-platform-targeting) | no | high |
| 34 | Time and timeouts: `TimeProvider`, monotonic clocks, `DateTimeOffset` parsing of CLI timestamps, `DateOnly.TryParse` behaviour change in .NET 11, per-call vs global timeout? | Determinism in tests; behaviour shifts in .NET 11 | [compat 11](https://learn.microsoft.com/en-us/dotnet/core/compatibility/11) | no | medium |
| 35 | Ordering determinism: dictionary/set enumeration, directory enumeration order, JSON property order, sorted outputs - what must the SDK guarantee? | Reproducible output and tests | [source gen](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/source-generation) | no | medium |
| 36 | Idempotency, retry and exit-code mapping: which ocx exit codes map to which exception types, what is retryable, what does the wrapper never retry? | Python SDK has `_retry.py` and `_errors.py`; need the .NET shape | [stderr](https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/10.0/dotnet-cli-stderr-output) (stdout/stderr purity norm) | no | medium |
| 37 | Observability: `ILogger` + `ActivitySource` with no hard dependency, W3C propagation default, OTel convergence in .NET 11? | Library telemetry without lock-in | [compat 10](https://learn.microsoft.com/en-us/dotnet/core/compatibility/10.0), [.NET 11 overview](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/overview) | no | low |
| 38 | CI matrix: which runners (`windows-11-arm`, `ubuntu-24.04-arm`, `macos-latest`, `macos-15-intel`) and which TFMs per leg, and how is Windows tested locally from WSL? | arm64 is free on public repos now; owner requires 6 RIDs | [runners](https://docs.github.com/en/actions/reference/runners/github-hosted-runners), [supported OS](https://github.com/dotnet/core/blob/main/release-notes/10.0/supported-os.md) | no | high |
| 39 | Terminal Logger / `--interactive` / stderr changes: how must scripts and agents invoke `dotnet` non-interactively (`--tl:off`, `--interactive false`, binary log), and parse results? | Agents shell out to `dotnet`; defaults changed twice | [SDK 9](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-9/sdk), [SDK 10](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/sdk) | no | medium |
| 40 | File-based apps for repo scripts and single-file tools: `#:` directives, shebang, AOT default, conversion path - when should an agent write a `.cs` script instead of a project? | New small-tool path; AOT-by-default surprises packages | [SDK 10](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/sdk), [program structure](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/program-structure/) | no | low |
| 41 | C# XML doc comments for a public SDK: `GenerateDocumentationFile`, CS1591, `<inheritdoc>`, doc conventions that complement the language-neutral docs sets? | Doc sets exist but C# specifics are not covered | scope statement | partial | medium |
| 42 | Banned or obsolete constructs list for agents: BinaryFormatter, `Thread.Abort`, `WebClient`, `System.Linq.Async` clash, SHA-1 signing, `ServicePointManager`, `lock(object)` - what is on it and how is it enforced (analyzer IDs)? | One-page deny list with analyzer hooks | [libs 9](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-9/libraries), [sha1](https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/10.0/dotnet-nuget-sign-sha1-deprecated), [C# 13](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-13) | no | low |

## Sources

Primary = vendor documentation, release notes, source repositories or the toolchain itself. All URLs were fetched with WebFetch (or `gh api` for the two dotnet/runtime PRs) during this run; none are search snippets.

| # | URL | What | Date / era | Why |
|---|---|---|---|---|
| 1 | https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-14 (primary) | C# 14 feature list | .NET 10, page updated 2026-09 | language shifts |
| 2 | https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-15 (primary) | C# 15 preview feature list | .NET 11 RC, updated 2026-09 | unions, closed, etc. |
| 3 | https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-13 (primary) | C# 13 feature list | .NET 9, 2024-11 | params collections, Lock |
| 4 | https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/overview (primary) | .NET 10 overview | 2025-11 | era map |
| 5 | https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/overview (primary) | .NET 11 overview at RC1 | 2026-09 | era map, SDK 11 |
| 6 | https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/libraries (primary) | .NET 11 libraries incl. Process, STJ unions | RC1, 2026-09 | Process API |
| 7 | https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/libraries (primary) | .NET 10 libraries incl. STJ Strict, process group | 2025-11 | STJ, Process |
| 8 | https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/sdk (primary) | .NET 10 SDK: tools, file-based apps, pruning, MTP | 2025-11 | tooling |
| 9 | https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-9/sdk (primary) | .NET 9 SDK: Terminal Logger, BuildChecks | 2024-11 | CLI defaults |
| 10 | https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-9/libraries (primary) | .NET 9 libraries: BinaryFormatter, STJ | 2024-11 | removals |
| 11 | https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core (primary) | support policy table | live 2026-10 | EOS dates |
| 12 | https://devblogs.microsoft.com/dotnet/dotnet-sts-releases-supported-for-24-months/ (primary) | STS 18 -> 24 months | 2025-09-16 | policy change |
| 13 | https://learn.microsoft.com/en-us/dotnet/core/compatibility/10.0 (primary) | .NET 10 breaking-change index | updated 2026-07 | obsoleted behaviour |
| 14 | https://learn.microsoft.com/en-us/dotnet/core/compatibility/11 (primary) | .NET 11 breaking-change index | updated 2026-10-08 | upcoming breaks |
| 15 | https://learn.microsoft.com/en-us/dotnet/core/compatibility/core-libraries/10.0/sigterm-signal-handler (primary) | SIGTERM default handler removed | .NET 10 | cancellation |
| 16 | https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/10.0/nugetaudit-transitive-packages (primary) | transitive audit default | .NET 10 P3 | restore gate |
| 17 | https://learn.microsoft.com/en-us/dotnet/core/compatibility/serialization/10/property-name-validation (primary) | STJ property-name conflict validation | .NET 10 | JSON contracts |
| 18 | https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/10.0/dotnet-cli-stderr-output (primary) | CLI first-run output to stderr | .NET 10 | stdout purity |
| 19 | https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-with-dotnet-test (primary) | `dotnet test` modes | updated 2026-09 | testing |
| 20 | https://learn.microsoft.com/en-us/dotnet/core/testing/migrating-vstest-microsoft-testing-platform (primary) | VSTest -> MTP migration | updated 2026-08 | testing |
| 21 | https://xunit.net/docs/getting-started/v3/whats-new (primary) | xUnit v3 changes | v3 era | testing |
| 22 | https://learn.microsoft.com/en-us/nuget/nuget-org/trusted-publishing (primary) | NuGet trusted publishing | 2025-07, updated 2026-07/09 | publishing |
| 23 | https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/cross-platform-targeting (primary) | TFM guidance | updated 2026-04 | TFM decision |
| 24 | https://learn.microsoft.com/en-us/dotnet/core/deploying/trimming/prepare-libraries-for-trimming (primary) | trim-ready libraries | updated 2026-01 | AOT/trim |
| 25 | https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/package-validation/overview (primary) | package validation | 2023, still current | binary compat |
| 26 | https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/source-generation (primary) | STJ source generation | updated 2026-03 | JSON/AOT |
| 27 | https://learn.microsoft.com/en-us/nuget/consume-packages/central-package-management (primary) | CPM | 2025-08 | build layout |
| 28 | https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/10.0/dotnet-new-sln-slnx-default (primary) | `.slnx` default | .NET 10 | scaffolding |
| 29 | https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/11/dnx-scripts-bypass-global-json (primary) | `dnx` vs `global.json` | SDK 10.0.302 / .NET 11 P6 | tool execution |
| 30 | https://learn.microsoft.com/en-us/dotnet/core/compatibility/core-libraries/10.0/asyncenumerable (primary) | AsyncEnumerable in box | .NET 10 | async API |
| 31 | https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/10.0/dotnet-nuget-sign-sha1-deprecated (primary) | SHA-1 signing error | .NET 10 | signing |
| 32 | https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/overview (primary) | default analyzers | updated 2026-05 | analyzer drift |
| 33 | https://github.com/dotnet/core/blob/main/release-notes/10.0/supported-os.md (primary) | supported OS/arch matrix | live 2026-10 | platforms |
| 34 | https://docs.github.com/en/actions/reference/runners/github-hosted-runners | GitHub-hosted runners (arm64) | live 2026-10 | CI matrix |
| 35 | https://github.com/dotnet/roslyn/blob/main/docs/Language%20Feature%20Status.md (primary) | Roslyn feature status | live 2026-10 | C# 15 status |
| 36 | https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/program-structure/ (primary) | file-based vs project apps | updated 2026-08 | scripts |
| 37 | https://github.com/dotnet/runtime/pull/126800 (primary, via `gh api repos/dotnet/runtime/pulls/126800`) | Process API implementation PR body | 2026-04 | API intent |
| 38 | https://github.com/dotnet/runtime/pull/127112 (primary, via `gh api repos/dotnet/runtime/pulls/127112`) | Linux `KillOnParentExit`, merged 2026-05-04 | 2026-05 | platform support |

Toolchain measurements (sources of record for section H): `/home/mherwig/.cache/research-lang/dotnet-tools/run.sh` with SDKs 8.0.425, 10.0.401, 11.0.100-rc.1.26425.128; fixtures under `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/shifts-landscape/`.

Searched but not fetched (excluded from `sources_count`, see section J): MSTest 4 migration page; Unity .NET roadmap pages.
