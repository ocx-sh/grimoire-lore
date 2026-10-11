---
title: "Exemplar build, packaging and quality-gate configuration audit (35 C# repos)"
agent: sonnet-5.5 (research-lang subagent, axis: build/packaging/quality-gates)
model: claude-sonnet-5-5
scope: "All 35 blob-less depth-1 clones under /home/mherwig/.cache/research-lang/exemplars/csharp. Axes: TFMs and polyfills, props/CPM/global.json/solution format, compiler and analyzer settings, analyzer packages, trim/AOT flags, packaging and supply-chain settings, CI matrix and test/coverage/format gates. Nothing was built; the toolchain was only used for `dotnet --list-sdks`."
method: "cd /home/mherwig/.cache/research-lang/dotnet-tools/fixtures/exemplar-build-gates; python3 -I audit.py out.json (static scan of 35 working trees via git ls-files + file reads); python3 -I ci.py (CI runner tokens -> ci.json); python3 -I flags.py (per-repo booleans -> flags.json); python3 -I count.py [key] (every total in this file); python3 -I gen.py tfm|layer|pack|ci (tables 3.1-3.4); spot checks with git -C <repo> grep -n and git -C <repo> rev-parse --short=12 HEAD; /home/mherwig/.cache/research-lang/dotnet-tools/run.sh dotnet --list-sdks. Nothing built. Run date 2026-10-10. Full command table in section 2."
---

# Exemplar build, packaging and quality-gate audit

## 0. Headline (all counts are repos out of 35 unless stated; † = sparse slice, see Caveats)

| Finding | Count | Reproduce |
|---|---|---|
| Libraries that still ship netstandard1.x/2.x | **26 of 34** (PowerShell slice has no csproj) | `python3 -I count.py nsd` |
| Libraries that are modern-.NET-only (no netstandard, no net4x) | **8 of 34**: FluentValidation, GitVersion, simple-exec, cake, aspire, npgsql, nuke, pulumi-dotnet. Only 3 are plain libraries that dropped it deliberately (FluentValidation net8.0, simple-exec net8-10, npgsql net10.0); pulumi-dotnet is net6.0 (EOL) | same |
| Libraries that also ship net4xx | 14 of 34 (every one of them also ships netstandard) | same |
| The four vendor API-client SDKs (anthropic, openai, stripe, Azure.Core) | 4 of 4 keep `netstandard2.0` + net8.0+ | TFM table |
| Root `Directory.Build.props` / `.targets` / `Directory.Packages.props` | 32 / 24 / 22 repos | `count.py layout` |
| `.slnx` (slnx-only / both / sln-only) | 19 / 5 / 11 | `count.py slnx` |
| Root `global.json` | 28; rollForward: latestFeature 10, latestMinor 5, unset 4, feature 2, latestMajor 2, patch 2, major 2, latestPatch 1; allowPrerelease true 7 / false 6 / unset 15 | `count.py globaljson` |
| SDK pinned to an 11.0 preview/RC (or 12.0 alpha) in global.json | 6 (+ testfx `tools.dotnet` 12.0 alpha) | same |
| `Nullable=enable` / ImplicitUsings / `TreatWarningsAsErrors=true` | 30 / 21 / 23 | `count.py props` |
| LangVersion: numeric pin / `latest` / `preview` / unset | 16 / 15 / 7 / 3 (repos can be in several) | `count.py lang` |
| `AnalysisLevel` set / `AnalysisMode` set (All: 1, Recommended: 1) / `EnforceCodeStyleInBuild=true` | 10 / 4 / 11 | `count.py props` |
| `GenerateDocumentationFile=true` yet `NoWarn` CS1591 | 30 vs **19** repos suppress CS1591 | `count.py props nowarn` |
| `.editorconfig` at root / with any `dotnet_diagnostic.*.severity` override | 31 (median 99 lines, max 888) / 21 | `count.py props` |
| `IsAotCompatible=true` / `IsTrimmable=true` / `EnableTrimAnalyzer=true` / `EnableAotAnalyzer=true` | 11 / 4 / 1 / **0** (one repo sets it false) | `count.py aot` |
| `EnablePackageValidation=true` (with baseline version) | 6 (5); Azure uses its own `ApiCompatVersion` | `count.py pack` |
| `PublishRepositoryUrl` / `EmbedUntrackedSources` / `ContinuousIntegrationBuild` / explicit `Deterministic` | 20 / 23 / 16 / 7 | `count.py pack` |
| snupkg / explicit Microsoft.SourceLink.* package | 9 / 12 | `count.py pack` |
| Strong-name `.snk` tracked in repo / `SignAssembly=true` | 22 / 20 | `count.py layout pack` |
| `packages.lock.json` tracked / `RestorePackagesWithLockFile` / `RestoreLockedMode` | 5 / 5 / 3 | `count.py layout pack` |
| NuGet package *signing* in `.github/workflows` | **2** (Polly, openai-dotnet, both `dotnet/sign` + Azure Key Vault) | see 6.4 |
| `NuGet/login` (OIDC trusted publishing) in workflows | 11 | see 7.3 |
| Versioning tool: Nerdbank.GitVersioning / MinVer / GitVersion.yml | 7 / 3 / 5 | `count.py pkgs` + 6.2 |
| `packageSourceMapping` in a repo-owned `nuget.config` | 5 (Polly, npgsql, MessagePack, testfx, openai); cli-api and sourcelink only carry the Arcade `eng/common` one | 6.3 |
| CI (GitHub-hosted build workflows): linux / windows / macos / all three | 27 / 23 / **11** / 11; explicit arm64 runner in 3 | `count.py ci` |
| Test runner: VSTest-only / Microsoft.Testing.Platform (any signal) / MTP via `global.json test.runner` | 20 / 12 / 11 | `count.py tests` |
| Test framework: xunit v2-only / xunit v3 (any) / NUnit / MSTest | 16 / 12 / 9 / 4 | `count.py tests` |
| `dotnet format --verify-no-changes` in CI | 4 (GitVersion, roslynator, Humanizer, vs-threading via AzDO) | 7.4 |

## 1. Hypothesis check (the requester's framing against the numbers)

1. **"netstandard2.0 is an open question" - measured answer: it is the majority default, but it is a cost the data shows plainly.** 26/34 keep it, 4/4 vendor client SDKs keep it, and the closest CLI-wrapping peers split: CliWrap keeps it (CliWrap/CliWrap.csproj:3 `netstandard2.0;netstandard2.1;net6.0;net7.0;net10.0`), simple-exec dropped it (simple-exec Directory.Build.props:13 `net8.0;net9.0;net10.0`), Testcontainers keeps it (src/Testcontainers/Testcontainers.csproj:3), pulumi-dotnet (Automation API wrapping a CLI) ships `net6.0` only (sdk/Pulumi/Pulumi.csproj:4). The cost of keeping it, paid in code: CliWrap must downgrade nullability and disable trim/AOT analyzers on every non-net10 TFM (Tyrrrz__CliWrap@7dbc252fa773:Directory.Build.props:14-22); 14 repos carry Microsoft.Bcl.AsyncInterfaces, 14 System.Memory, 11 System.Threading.Tasks.Extensions (`count.py pkgs`). Modern TFMs named explicitly in the 34 hand-verified primary-library lists: net8.0 in 21, net10.0 in 20, net9.0 in 11, net6.0 in 5 (Polly, CliWrap, BDN, serilog, pulumi), net11.0 in 3 (Humanizer, cake, aspire) - counted by regex over the TFM column of table 3.1.
2. **"All platforms" is not a TFM property and the exemplars barely gate it.** No library uses a TFM to cover an OS; the only OS TFMs are `net8.0-windows`/`net10.0-windows` for WPF/WinForms-bound code (vs-threading src/LibraryNuspecProperties.props:4, testfx, coverlet). Platform coverage is a CI-matrix property, and only **11/35** run macOS, **3/35** run an explicit arm64 runner (GitVersion ubuntu-24.04-arm; simple-exec ubuntu-24.04-arm + windows-11-arm; BenchmarkDotNet windows-11-arm + ubuntu-24.04-arm). `macos-latest` is an Apple-silicon image per GitHub's runner docs (not re-verified here), which is how Polly/coverlet/nuke/pulumi/xunit get implicit arm64. So "x64 and arm64 on Win/Linux/macOS" is stronger than 32 of 35 exemplars.
3. **Strictness is not the norm.** TreatWarningsAsErrors is on in 23/35 but AnalysisMode `All` in exactly 1 (simple-exec), `latest-All` level in exactly 1 (xunit), and a format check in 4. Where docs and code disagree: Microsoft Learn recommends package validation for libraries (https://learn.microsoft.com/dotnet/fundamentals/apicompat/package-validation/overview); 6/34 do it. Code wins in practice: most repos are "Nullable + TWAE + a few IDE rules", not "analysis All".
4. **Lock files and audit are rare.** 5 lock-file repos, 3 locked-mode, NuGetAudit configured in 2, and 4 repos mute NU1903 (known-vulnerable package) in NoWarn (`count.py nowarn`); stripe turns audit off outright (stripe-dotnet src/Stripe.net/Stripe.net.csproj:29).
5. **Tooling default is moving to MTP.** `global.json` `"test": {"runner": "Microsoft.Testing.Platform"}` (the .NET 10 `dotnet test` MTP mode) is in 11 of the 28 repos that have a global.json; 20 repos are still VSTest-only (`Microsoft.NET.Test.Sdk`).
6. **The SDK-prerelease hazard is real in this cohort.** Orchestrator-measured: with no global.json `dotnet` picks the newest SDK including a prerelease. Here 7 set `allowPrerelease: true` and 6 pin an 11.0 preview/RC SDK version, so those 6 build only where that exact preview line is installed. The smallest guard seen is Redis's `global.json` (`{"sdk":{"allowPrerelease":false}}`, StackExchange__StackExchange.Redis@e7c43a269f53:global.json:4).

## 2. Method (every command; results inline)

Run from `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/exemplar-build-gates/` (`F`). Exemplar root `E=/home/mherwig/.cache/research-lang/exemplars/csharp`.

| Step | Command | Result |
|---|---|---|
| Repo count | `ls $E \| wc -l` | 35 |
| Pinned SHAs | `for d in $E/*/; do git -C $d rev-parse --short=12 HEAD; done` | table in 3.1 (sha column) |
| Tracked files / sparseness | `git -C <d> ls-files \| wc -l`; test of `-e` on every tracked csproj/props/targets/yml | full: 32; sparse slices: Azure (1988 of 2000 sampled build files absent from disk), aspire (798/803), PowerShell (158/160) |
| SDKs available | `/home/mherwig/.cache/research-lang/dotnet-tools/run.sh dotnet --list-sdks` | 8.0.425, 10.0.401, 11.0.100-rc.1.26425.128 (nothing built) |
| Extract build facts | `python3 -I audit.py out.json` (2.7 s) | 579 KB JSON: per repo TFMs, ~70 MSBuild properties with file + value, PackageReference/PackageVersion/GlobalPackageReference names, global.json fields, editorconfig/globalconfig severities, workflow facts |
| CI OS matrix | `python3 -I ci.py` -> `ci.json` | union of runner tokens over workflow files that mention dotnet/build/pack |
| Per-repo booleans | `python3 -I flags.py` -> `flags.json` | input to gen.py/count.py |
| Totals | `python3 -I count.py` (or `count.py <key>`) | every total in this file |
| Tables | `python3 -I gen.py tfm\|layer\|pack\|ci` | tables 3.1-3.4 |
| Spot checks (TFMs, signing, format, OIDC) | `git -C <d> grep -n -E "<TargetFrameworks?>" -- <paths>`; `grep -n` on workflow files | cited file:line in text |

Definitions: a repo "has" a property if **any** MSBuild file (csproj/props/targets) sets it to an enabling value (test projects included; it is a repo-level presence count, not a coverage percentage). "Primary library TFMs" are hand-verified (the script-derived union is polluted by test/tool projects). Behaviour that an MSBuild SDK injects is invisible to this method: Meziantou (Meziantou.NET.Sdk 1.0.183, Meziantou__Meziantou.Analyzer@161b7e948ad3:global.json:6-8), Arcade (aspire, command-line-api, sourcelink, testfx), simple-exec's DotNet.ReproducibleBuilds.Isolated SDK. Rows for these under-count.

## 3. Per-repo tables (one row per repo; † = sparse slice, columns mostly blank by construction)

### 3.1 Target frameworks (hand-verified primary library; pinned SHA per repo)

Cite form for any row: `<owner__repo>@<sha>:<file:line>` using the directory name `owner__repo` (the repo column below drops the owner).

| repo | sha | primary library TFMs (hand-verified) | file:line |
|---|---|---|---|
| Polly | e4476096da5b | net8.0;net6.0;netstandard2.0;net472;net462 | src/Polly.Core/Polly.Core.csproj:4 |
| azure-sdk-for-net† | 32c48fc3d524 | (net10.0;net8.0;netstandard2.0 via RequiredTargetFrameworks)+net462;net472 | sdk/core/Azure.Core/src/Azure.Core.csproj:11 + eng/Directory.Build.Common.props:194-233 |
| Dapper | eb47546a408b | net461;netstandard2.0;net8.0;net10.0 | Dapper/Dapper.csproj:8 |
| StyleCopAnalyzers | d51e0fd84584 | netstandard1.1 (analyzer) | StyleCop.Analyzers/StyleCop.Analyzers/StyleCop.Analyzers.csproj:5 |
| FluentValidation | 299ef377bde8 | net8.0 | src/FluentValidation/FluentValidation.csproj:3 |
| GitVersion | 5057cdbcc177 | net10.0 (netstandard2.0 only in the source generator new-cli/GitVersion.Cli.Generator/GitVersion.Cli.Generator.csproj:4) | src/Directory.Build.props:3 |
| Humanizer | 4574b93883bf | net11.0;net10.0;net8.0;net48;netstandard2.0 | src/Humanizer/Humanizer.csproj:3 |
| MessagePack-CSharp | 242bdad51f89 | netstandard2.0;netstandard2.1;net8.0;net9.0;net472 | src/MessagePack/MessagePack.csproj:4 |
| PowerShell† | 5d871eb5e02c | n/a (slice has no csproj on disk) | - |
| StackExchange.Redis | e7c43a269f53 | net461;netstandard2.0;net472;net8.0;net10.0 | src/StackExchange.Redis/StackExchange.Redis.csproj:5 |
| CliWrap | 7dbc252fa773 | netstandard2.0;netstandard2.1;net6.0;net7.0;net10.0 | CliWrap/CliWrap.csproj:3 |
| simple-exec | f80913246993 | net8.0;net9.0;net10.0 | Directory.Build.props:13 |
| anthropic-sdk-csharp | ae16e5933f39 | net8.0;net9.0;netstandard2.0 | src/Directory.Build.props:28 |
| cake | 08885933e936 | net10.0;net11.0 | src/Shared.msbuild:4 |
| coverlet | ecd6fd5533e7 | net8.0;net9.0;net10.0;netstandard2.0 | src/coverlet.core/coverlet.core.csproj:5 |
| BenchmarkDotNet | 61ebda8a50ae | netstandard2.0;net6.0;net8.0;net9.0;net10.0 | src/BenchmarkDotNet/BenchmarkDotNet.csproj:6 |
| aspire† | af646baee1e8 | net10.0;net11.0 | eng/Versions.props:11-12 |
| command-line-api | ba7fb9bd4443 | $(NetMinimum);netstandard2.0 | src/System.CommandLine/System.CommandLine.csproj:4 |
| roslynator | 167f43468118 | netstandard2.0 (analyzers); CLI net8.0;net9.0;net10.0 + net48 | src/Core/Core.csproj:4, src/CommandLine/CommandLine.csproj:8,12 |
| sourcelink | 6ec19dda0e19 | $(NetMinimum);$(NetFrameworkToolCurrent) (MSBuild tasks) | src/Microsoft.Build.Tasks.Git/Microsoft.Build.Tasks.Git.csproj:4 |
| MedallionShell | e45f1f6ffd4c | netstandard1.3;netstandard2.0;net45;net46;net471 | MedallionShell/MedallionShell.csproj:4 |
| Meziantou.Analyzer | 161b7e948ad3 | net10.0;netstandard2.0 | src/Meziantou.Analyzer/Directory.Build.props:5 |
| testfx | 7226b0c74729 | $(SupportedNetFrameworks)=net8.0;net9.0 + netstandard2.0; net462 on Windows | Directory.Build.props:42; src/Platform/Microsoft.Testing.Platform/Microsoft.Testing.Platform.csproj:4 |
| vs-threading | f6d817997090 | netstandard2.0;net8.0;net472 (+net8.0-windows) | src/LibraryNuspecProperties.props:3-4 |
| nodatime | 4dd26f1ddfa7 | netstandard2.0;net8.0 | src/NodaTime/NodaTime.csproj:6 |
| npgsql | 9c47244547c2 | net10.0 | src/Npgsql/Npgsql.csproj:8 |
| nuke | 27e8077b8ab0 | net10.0 (Nuke.Common) | source/Nuke.Common/Nuke.Common.csproj:4 |
| octokit.net | 7fa5b0fe4a18 | netstandard2.0 | Octokit/Octokit.csproj:9 |
| openai-dotnet | 1f0e8829acac | net10.0;net8.0;netstandard2.0 | Directory.Build.props:7 |
| pulumi-dotnet | 2a0dca84f09b | net6.0 | sdk/Pulumi/Pulumi.csproj:4 |
| serilog | bebc7719004f | netstandard2.0;net6.0;net8.0;net9.0;net10.0 + net462;net471 (Windows) | src/Serilog/Serilog.csproj:9-12 |
| spectre.console | 0de183140529 | net10.0;net9.0;net8.0;netstandard2.0 | src/Spectre.Console/Spectre.Console.csproj:4 |
| stripe-dotnet | dbdca6ba5efc | net8.0;net9.0;net10.0;netstandard2.0;net462 | src/Stripe.net/Stripe.net.csproj:14 |
| testcontainers-dotnet | 04cbb73fcc58 | net8.0;net9.0;net10.0;netstandard2.0;netstandard2.1 | src/Testcontainers/Testcontainers.csproj:3 |
| xunit | 0c7aa4991fa3 | netstandard2.0 (core/common); netstandard2.0;net8.0 (assert); net472;net8.0 (runner.utility) | src/xunit.v3.core/xunit.v3.core.csproj:7 |

Totals (`python3 -I count.py nsd`): netstandard1.x/2.x **26**; modern-only **8**; netstandard without net4x **12** (StyleCop, CliWrap, anthropic, coverlet, BDN, command-line-api, Meziantou, nodatime, octokit, openai, spectre, testcontainers); with net4x **14** (Polly, Azure.Core, Dapper, Humanizer, MessagePack, Redis, Medallion, serilog, stripe, vs-threading, xunit, roslynator CLI, sourcelink tasks, testfx); net4x without netstandard **0**.

Notes that matter for a new library:
- Microsoft's own client-SDK policy is the clearest written rule: current-generation libraries target `net10.0;net8.0;netstandard2.0` (`RequiredRunnableTargetFrameworks = $(Lts);net8.0` plus netstandard2.0 when `SupportsNetStandard20`), tests run on all active runnable TFMs, net462 is kept "until end-of-life in Jan 2027", analyzers/generators are netstandard2.0 only (Azure__azure-sdk-for-net@32c48fc3d524:eng/Directory.Build.Common.props:194-233; Azure.Core adds net462/net472 at sdk/core/Azure.Core/src/Azure.Core.csproj:11).
- Serilog states its trim policy in a comment: net462/net471 frozen on Windows only, then `net10.0;net9.0;net8.0;net6.0;netstandard2.0` ("trim TFM-specific builds to netstandard2.0, net6.0, all active LTS versions, and optionally the latest RTM", serilog__serilog@bebc7719004f:src/Serilog/Serilog.csproj:7-12).
- Analyzer/generator/MSBuild-task assemblies are forced to netstandard2.0 (or net472 for tasks) by their host: StyleCop (netstandard1.1), roslynator Core/Analyzers, Meziantou, vs-threading analyzers, sourcelink tasks (`$(NetMinimum);$(NetFrameworkToolCurrent)`), GitVersion MSBuild task. This is separate from the consumer-library choice.
- Pre-release TFMs: net11.0 is already a shipping TFM in Humanizer (`net11.0;net10.0;net8.0;net48;netstandard2.0`, Humanizr__Humanizer@4574b93883bf:src/Humanizer/Humanizer.csproj:3), cake (`net10.0;net11.0`, cake-build__cake@08885933e936:src/Shared.msbuild:4) and aspire (eng/Versions.props:11-12). Anything net11/C# 15 must be flagged as RC.

#### Polyfill mechanisms (counts are repos with the package referenced anywhere, incl. test/tool projects: `count.py pkgs`)
- Runtime polyfill packages: Microsoft.Bcl.AsyncInterfaces 14, System.Memory 14, System.Text.Json 14, System.Threading.Tasks.Extensions 11, System.Collections.Immutable 10, Microsoft.NETFramework.ReferenceAssemblies 7 (to build net4x on Linux/macOS), System.Buffers 4, Microsoft.Bcl.Memory 3, Microsoft.Bcl.TimeProvider 2, Microsoft.Bcl.HashCode 1.
- Source polyfills: PolySharp 5 (GitVersion, MessagePack, BDN, vs-threading, Serilog), Polyfill 2 (Humanizer, spectre), Meziantou.Polyfill 1 (its own), `Nullable` package 2. Hand-rolled source folders: Polly `src/LegacySupport` (IsExternalInit, CallerArgumentExpression, DynamicallyAccessedMembers..., wired at App-vNext__Polly@e4476096da5b:eng/Common.props:14), Azure `Shared\NullableAttributes.cs` (Azure.Core.csproj:80).
- No exemplar references a dedicated Index/Range polyfill package: package names matching `index|range` in out.json return only `Pulumi.IndexModule` (unrelated); Index/Range reach netstandard2.0 through PolySharp/Polyfill or hand-rolled source. Also seen: System.ValueTuple 6 (Polly, Dapper, MessagePack, sourcelink, vs-threading, serilog), System.Runtime.CompilerServices.Unsafe 5.

### 3.2 Layering, language and compiler settings

Legend: DBP/DBT = count of `Directory.Build.props`/`.targets` files (nested layering); CPM = `Directory.Packages.props` present (count); sln = solution format; NRT = `Nullable=enable`; IU = ImplicitUsings; TWAE = TreatWarningsAsErrors true in any file; ECSB = EnforceCodeStyleInBuild; DocFile = GenerateDocumentationFile true; last column = number of `dotnet_diagnostic.*.severity` lines in all editorconfig/globalconfig files (Polly's four generated globalconfigs are 2980 of them).

| repo | DBP | DBT | CPM(DPP) | global.json rollForward | sln | LangVersion | NRT | IU | TWAE | AnalysisLevel / Mode | ECSB | DocFile | .editorconfig lines (root) | dotnet_diagnostic overrides |
|---|--:|--:|---|---|---|---|---|---|---|---|---|---|--:|--:|
| Polly | 2 | 2 | Y(1) | (none) | slnx | latest | Y | Y | - | latest | Y | Y | 60 | 2980 |
| azure-sdk-for-net† | 481 | 6 | Y(2) | feature | both | latest | Y | - | Y | - | - | - | 193 | - |
| Dapper | 3 | 2 | Y(1) | latestMajor | slnx | 13 | Y | - | Y | - | - | Y | 80 | - |
| StyleCopAnalyzers | 1 | 1 | - | latestFeature | sln | 14 | Y | Y | Y | - | - | Y | 99 | - |
| FluentValidation | 1 | 0 | - | latestFeature | sln | 12 | - | - | Y | - | - | Y | 41 | - |
| GitVersion | 3 | 1 | Y(3) | (none) | slnx | latest | Y | Y | - | latest | Y | - | 192 | 8 |
| Humanizer | 10 | 10 | Y(3) | latestFeature | slnx | latest/preview | Y | Y | Y | latest/Minimum/None | Y | Y | 260 | 76 |
| MessagePack-CSharp | 8 | 3 | Y(1) | patch | sln | 12/13/16.9 | Y | Y | - | latest | Y | Y | 265 | 82 |
| PowerShell† | 0 | 0 | - | (none) | sln | - | - | - | - | - | - | - | 213 | 2 |
| StackExchange.Redis | 2 | 2 | Y(1) | (none) | slnx | 14 | Y | Y | Y | - | - | Y | 213 | 50 |
| CliWrap | 1 | 0 | Y(1) | latestFeature | slnx | - | Y | - | Y | - | - | Y | - | - |
| simple-exec | 4 | 1 | Y(1) | latestMinor | slnx | latest | Y | Y | Y | All | Y | Y | 34 | - |
| anthropic-sdk-csharp | 1 | 0 | - | none | sln | 12/13.0 | Y | Y | Y | - | - | Y | 37 | 12 |
| cake | 1 | 1 | Y(1) | latestFeature | both | - | - | Y | Y | latest/Default | Y | Y | 147 | 46 |
| coverlet | 5 | 5 | Y(1) | latestFeature | slnx | 12.0/latest | Y | Y | - | latest/preview-recommended | Y | Y | 239 | 20 |
| BenchmarkDotNet | 2 | 2 | - | non-root | slnx | 14.0 | Y | Y | Y | - | - | Y | 42 | 2 |
| aspire† | 20 | 11 | Y(11) | major | both | preview | Y | Y | Y | - | Y | Y | 487 | 141 |
| command-line-api | 2 | 1 | Y(1) | major | slnx | latest | Y | Y | Y | - | - | Y | 31 | - |
| roslynator | 2 | 0 | - | none | sln | 12.0/preview | Y | - | - | - | - | - | 271 | 160 |
| sourcelink | 2 | 1 | Y(1) | latestFeature | slnx | Preview | Y | - | - | - | - | - | 233 | 2 |
| MedallionShell | 0 | 0 | - | none | sln | Latest | Y | - | Y | - | - | Y | - | - |
| Meziantou.Analyzer | 4 | 1 | - | latestPatch | slnx | preview | - | - | - | - | - | Y | 54 | 8 |
| testfx | 8 | 6 | Y(3) | latestFeature | both | latest/preview | Y | Y | Y | preview-recommended | Y | Y | 888 | 255 |
| vs-threading | 3 | 3 | Y(2) | patch | slnx | 14/16.9 | Y | - | - | latest | Y | Y | 221 | 72 |
| nodatime | 2 | 2 | Y(1) | latestMinor | slnx | latest | Y | Y | Y | - | - | Y | - | - |
| npgsql | 3 | 0 | Y(1) | latestMajor | slnx | latest | Y | Y | Y | latest | - | Y | 71 | 8 |
| nuke | 2 | 2 | Y(1) | latestMinor | slnx | preview | - | - | - | - | - | Y | 82 | - |
| octokit.net | 1 | 1 | - | none | sln | 9 | Y | - | - | - | - | Y | - | - |
| openai-dotnet | 2 | 3 | Y(1) | feature | slnx | latest | Y | Y | Y | - | - | Y | 188 | - |
| pulumi-dotnet | 2 | 1 | - | none | sln | 10 | Y | Y | Y | Recommended | - | Y | 8 | 1 |
| serilog | 1 | 0 | - | latestFeature | sln | latest | Y | Y | Y | - | - | Y | 51 | - |
| spectre.console | 1 | 0 | Y(1) | latestFeature | slnx | 14/latest | Y | Y | - | - | - | Y | 27 | 35 |
| stripe-dotnet | 0 | 0 | - | none | sln | 8 | Y | - | Y | - | - | Y | 18 | 1 |
| testcontainers-dotnet | 5 | 0 | Y(4) | latestMinor | both | 10.0/latest | Y | - | Y | - | - | Y | 8 | - |
| xunit | 3 | 3 | - | latestMinor | slnx | 10.0/12.0/13.0/14.0/7.3/9.0 | Y | Y | Y | latest-All | Y | Y | 381 | 145 |

Totals (`count.py props lang slnx layout globaljson`): DBP 32, DBT 24, CPM 22 (`ManagePackageVersionsCentrally=true` in 21; the 13 without a DPP include xunit, which uses `Versions.props` variables instead, Meziantou (SDK), anthropic, serilog, roslynator, octokit, stripe, pulumi, BDN, FluentValidation, StyleCop, Medallion, PowerShell slice). Nested layering is the norm in larger repos (Azure 481 DBP files, aspire 20, Humanizer 10, MessagePack 8, testfx 8). Repos that use `Directory.Build.targets` put shared pack/analyzer wiring there (xunit src/Directory.Build.targets); Polly puts the same wiring in imported `eng/*.targets`.

Language level pins you will see (`count.py lang`): 16 repos pin a numeric LangVersion somewhere, but the numbers include VB (16.9) and sample projects; library pins: Dapper 13, FluentValidation 12, anthropic 12/13.0, MessagePack 12/13, Redis 14, BDN 14.0, vs-threading 14, StyleCop 14, xunit 14.0 (non-test projects, xunit__xunit@0c7aa4991fa3:src/Directory.Build.props:24), octokit 9, stripe 8, pulumi 10. `latest` in 15, `preview` in 7 (Humanizer, aspire, roslynator, sourcelink, Meziantou, testfx, nuke), unset in 3 (CliWrap, cake, PowerShell slice). `latest` on a netstandard2.0 target does not bring the BCL, so it needs the polyfills above.

### 3.3 Analyzer, packaging and supply-chain settings

| repo | analyzers (PackageReference) | trim/AOT flags | PkgValidation | snupkg | SourceLink pkg | PublishRepoUrl+EmbedUntracked | CIB/Det | strong-name (.snk tracked) | lock files | version tool | NuGetAudit | psm |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Polly | StyleCop, Sonar, PublicApi, BannedApi | IsAotCompatible, PublishAot | Y+baseline | Y | - | Y | Y/Y | 1 | - | MinVer | Y | Y |
| azure-sdk-for-net† | - | - | ApiCompatVersion | - | - | - | Y/- | 5 | - | - | - | - |
| Dapper | PublicApi | - | - | - | Y | Y | Y/Y | 1 | - | NBGV | - | - |
| StyleCopAnalyzers | StyleCop, PublicApi, CodeStyle, RoslynAnalyzers, DocAn | - | - | - | - | - | -/- | 2 | - | NBGV | - | - |
| FluentValidation | - | - | Y+baseline | - | - | Y | Y/- | 1 | - | - | - | - |
| GitVersion | Roslynator, PublicApi, RoslynAnalyzers, NUnit.an, Rosl.Fmt | - | - | - | - | - | Y/- | 1 | - | GitVersion.yml | - | - |
| Humanizer | RoslynAnalyzers | IsAotCompatible, IsTrimmable | - | - | - | Y | Y/- | 1 | - | NBGV | - | - |
| MessagePack-CSharp | StyleCop.Unstable, RoslynAnalyzers | - | - | Y | - | Y | -/- | 1 | - | - | - | Y |
| PowerShell† | - | - | - | - | - | - | -/- | 1 | - | - | - | - |
| StackExchange.Redis | StyleCop, PublicApi, RoslynAnalyzers | PublishAot | - | - | - | Y | Y/Y | 1 | - | NBGV | - | - |
| CliWrap | CSharpier | - | - | - | - | - | -/- | - | - | - | - | - |
| simple-exec | VSThreading, PublicApi | - | - | - | - | - | -/- | - | 5 | MinVer, DotNet.ReproducibleBuilds (sets CIB/deterministic/embed) | - | - |
| anthropic-sdk-csharp | xunit.an | - | - | - | Y | Y | -/Y | 1 | 8 | - | - | - |
| cake | - | - | - | Y | - | Y | -/- | - | - | GitVersion.yml | - | - |
| coverlet | BannedApi | - | Y | Y | Y | Y | Y/Y | 17 | - | NBGV | - | - |
| BenchmarkDotNet | StyleCop.Unstable | - | - | - | - | - | Y/- | 1 | - | - | - | - |
| aspire† | - | - | - | - | - | - | -/- | - | - | - | - | - |
| command-line-api | - | IsAotCompatible, IsTrimmable, TrimAn, PublishAot | - | - | - | - | -/- | - | - | - | - | Y |
| roslynator | Roslynator, RoslynAnalyzers | - | - | Y | Y | Y | Y/- | 1 | - | GitVersion.yml | - | - |
| sourcelink | - | - | - | - | - | - | Y/- | - | - | - | - | Y |
| MedallionShell | StyleCop | - | - | - | - | - | -/- | - | - | - | - | - |
| Meziantou.Analyzer | (own SDK: Meziantou.NET.Sdk) | - | - | - | - | - | -/- | - | - | - | - | - |
| testfx | StyleCop, VSThreading, PublicApi, BannedApi, RoslynAnalyzers, MSTest.an | IsAotCompatible, IsTrimmable, PublishAot | - | - | - | - | -/- | - | 1 | - | - | Y |
| vs-threading | StyleCop.Unstable, RoslynAnalyzers, DocAn | IsAotCompatible, PublishAot | Y+baseline | Y | - | Y | -/- | - | - | NBGV | - | - |
| nodatime | NetAnalyzers | IsAotCompatible, PublishAot | Y+baseline | - | - | Y | -/Y | 2 | - | - | - | - |
| npgsql | PublicApi, RoslynAnalyzers, NUnit.an | IsAotCompatible, PublishAot | - | Y | Y | Y | -/- | 1 | - | - | - | Y |
| nuke | RoslynAnalyzers | - | - | - | Y | Y | -/- | - | - | GitVersion.yml | - | - |
| octokit.net | - | - | - | - | Y | Y | Y/- | 1 | - | GitVersion.yml | - | - |
| openai-dotnet | - | IsAotCompatible | - | Y | Y | Y | Y/- | 1 | - | - | - | Y |
| pulumi-dotnet | PublicApi | - | - | - | Y | Y | Y/- | - | - | - | - | - |
| serilog | - | IsAotCompatible, PublishAot | - | Y | - | Y | -/- | 1 | - | - | - | - |
| spectre.console | Roslynator, RoslynAnalyzers | IsAotCompatible | - | - | Y | Y | Y/Y | 1 | - | MinVer | - | - |
| stripe-dotnet | StyleCop | - | Y+baseline | - | Y | Y | -/- | - | - | - | Y | - |
| testcontainers-dotnet | xunit.an | - | - | - | - | - | -/- | 1 | 7 | - | - | - |
| xunit | RoslynAnalyzers, xunit.an | IsAotCompatible, IsTrimmable, PublishAot | - | - | Y | - | Y/- | 1 | 59 | NBGV | - | - |

Legend: "SourceLink pkg" = explicit `Microsoft.SourceLink.*` PackageReference (the SDK already carries SourceLink for GitHub since .NET 8 per Microsoft Learn https://learn.microsoft.com/dotnet/standard/library-guidance/sourcelink - not re-verified here; xunit pins it with a version-conflict comment at src/Directory.Build.props:95-99). CIB/Det = `ContinuousIntegrationBuild`/explicit `Deterministic` set. lock files = number of tracked `packages.lock.json`. psm = a `packageSourceMapping` element exists in some tracked nuget.config (for cli-api and sourcelink only the Arcade `eng/common/internal` file). simple-exec's blank CIB/embed columns are covered by its `DotNet.ReproducibleBuilds.Isolated` SDK (listed in version-tool column). Meziantou's analyzers come from its own MSBuild SDK, so the row reads empty.

### 3.4 CI, test runner, coverage, format

Legend: L/W/M = GitHub-hosted build workflows name a linux/windows/macos runner (union over workflow files that mention dotnet/build/pack; octokit's `platform:` matrix key was added by hand); Azure DevOps pipelines (`+N AzDO/other`) are listed but not parsed for OS. SHA-pinned = `uses: x@<40-hex>` over all `uses:` lines. Coverage = package refs plus codecov/ReportGenerator in workflows. fmt check = `dotnet format --verify-no-changes` (GitVersion format.yml:79, roslynator build.yml:63, Humanizer docs.yml:177, vs-threading azure-pipelines/build.yml:225).

| repo | GH build workflows | L | W | M | arm64 explicit | test fw | runner | coverage | fmt check | SHA-pinned uses | NuGet/login OIDC |
|---|--:|---|---|---|---|---|---|---|---|---|---|
| Polly | 15 | Y | Y | Y | - | xunit v3, xunit v2 | MTP+VSTest (global.json) | MS.CodeCoverage, codecov | - | 68/68 | Y |
| azure-sdk-for-net† | 15+29 AzDO/other | - | - | - | - | NUnit | VSTest | - | - | - | - |
| Dapper | 3 | Y | Y | - | - | xunit v2 | VSTest | - | - | 0/15 | Y |
| StyleCopAnalyzers | 1+1 AzDO/other | Y | Y | - | - | xunit v2 | VSTest | ReportGen, codecov | - | 2/41 | - |
| FluentValidation | 2 | Y | Y | - | - | xunit v2 | VSTest | - | - | 0/3 | - |
| GitVersion | 24 | Y | Y | Y | ubuntu-24.04-arm | NUnit | MTP+VSTest (global.json) | coverlet, codecov | Y | 114/114 | - |
| Humanizer | 6+1 AzDO/other | Y | Y | - | - | xunit v3 | MTP (global.json) | MS.CodeCoverage | Y | 23/46 | - |
| MessagePack-CSharp | 7 | Y | Y | - | - | xunit v2, NUnit | VSTest | - | - | 0/13 | Y |
| PowerShell† | 11+64 AzDO/other | - | - | - | - | - | - | - | - | - | - |
| StackExchange.Redis | 3 | Y | Y | - | - | xunit v3, xunit v2 | MTP+VSTest | - | - | 0/14 | Y |
| CliWrap | 1 | - | - | - | - | xunit v2 | VSTest | coverlet, codecov | - | 0/1 | - |
| simple-exec | 5 | Y | Y | Y | ubuntu-24.04-arm,windows-11-arm | xunit v3 | MTP (global.json) | - | - | 14/14 | Y |
| anthropic-sdk-csharp | 3 | Y | Y | - | - | xunit v3, xunit v2 | VSTest | coverlet | - | 11/11 | - |
| cake | 3+8 AzDO/other | Y | Y | Y | - | xunit v3, xunit v2 | MTP+VSTest (global.json) | coverlet, MS.CodeCoverage | - | 0/18 | Y |
| coverlet | 6+2 AzDO/other | Y | Y | Y | - | xunit v3, xunit v2, MSTest | MTP+VSTest (global.json) | coverlet, ReportGen | - | 0/26 | - |
| BenchmarkDotNet | 8 | Y | Y | Y | windows-11-arm,ubuntu-24.04-arm | xunit v2 | VSTest | ReportGen, codecov | - | 13/49 | - |
| aspire† | 68+20 AzDO/other | - | - | - | - | xunit v3 | MTP (global.json) | - | - | - | - |
| command-line-api | 2 | - | - | - | - | xunit v2 | - | - | - | 0/2 | - |
| roslynator | 1 | Y | Y | - | - | xunit v2, MSTest | VSTest | - | Y | 0/33 | Y |
| sourcelink | 2+2 AzDO/other | - | - | - | - | xunit v2 | - | - | - | 0/2 | - |
| MedallionShell | 0+2 AzDO/other | - | - | - | - | NUnit | VSTest | - | - | - | - |
| Meziantou.Analyzer | 3 | Y | - | - | - | (Meziantou.NET.Sdk.Test) | MTP (global.json) | - | - | 26/26 | Y |
| testfx | 57+11 AzDO/other | Y | Y | - | - | xunit v3, NUnit, MSTest | MTP+VSTest (global.json) | MS.CodeCoverage | - | 2301/2301 | - |
| vs-threading | 4+21 AzDO/other | Y | - | - | - | xunit v3 | MTP (global.json) | MS.CodeCoverage, codecov | Y | 7/7 | - |
| nodatime | 3 | Y | - | - | - | NUnit | VSTest | - | - | 0/6 | - |
| npgsql | 3 | Y | Y | Y | - | xunit v2, NUnit | VSTest | - | - | 0/25 | Y |
| nuke | 5+5 AzDO/other | Y | Y | Y | - | xunit v2 | VSTest | coverlet | - | 0/10 | - |
| octokit.net | 6 | Y | Y | Y | - | xunit v2 | VSTest | - | - | 0/11 | - |
| openai-dotnet | 7 | Y | Y | - | - | NUnit | VSTest | - | - | 46/46 | Y |
| pulumi-dotnet | 9 | Y | Y | Y | - | xunit v2, NUnit, MSTest | VSTest | coverlet, codecov | - | 29/52 | - |
| serilog | 1 | - | Y | - | - | xunit v2 | VSTest | - | - | 0/2 | - |
| spectre.console | 3 | Y | - | - | - | xunit v2 | VSTest | - | - | 0/6 | - |
| stripe-dotnet | 4 | Y | Y | - | - | xunit v2 | VSTest | coverlet | - | 24/28 | - |
| testcontainers-dotnet | 4 | Y | - | - | - | xunit v3, xunit v2 | VSTest | coverlet | - | 25/25 | Y |
| xunit | 3 | Y | Y | Y | - | xunit v3, xunit v2 | MTP+VSTest (global.json) | - | - | 0/22 | - |

## 4. Compiler, analyzer and suppression detail

### 4.1 Analyzer packages (`python3 -I count.py pkgs`, repos with a PackageReference/PackageVersion anywhere)

| Package | Repos | Who |
|---|--:|---|
| Microsoft.CodeAnalysis.PublicApiAnalyzers | 9 | Polly, Dapper, StyleCop, GitVersion, Redis, simple-exec, testfx, npgsql, pulumi (8 repos also track `PublicAPI.Shipped/Unshipped.txt`: `count.py layout` n_publicapi) |
| StyleCop.Analyzers (+ `.Unstable` 3, Stylecop spelled differently in stripe) | 5 (+3) | Polly, StyleCop, Redis, Medallion, testfx; Unstable: MessagePack, BDN, vs-threading |
| Microsoft.CodeAnalysis.BannedApiAnalyzers | 3 (+ `BannedSymbols.txt` tracked in 6) | Polly (eng/analyzers/BannedSymbols.txt), coverlet, testfx; txt only: Azure, MessagePack, Meziantou |
| Microsoft.VisualStudio.Threading.Analyzers | 2 | simple-exec (Directory.Build.props:29), testfx |
| Roslynator.Analyzers (+ Formatting) | 2 (+ roslynator itself, + GitVersion Formatting) | GitVersion, spectre |
| SonarAnalyzer.CSharp | 1 | Polly (Analyzers.targets:4) |
| Microsoft.CodeAnalysis.NetAnalyzers (explicit package) | 1 | nodatime; everyone else uses the SDK-bundled analyzers (`EnableNETAnalyzers`, AnalysisLevel/Mode) |
| Microsoft.CodeAnalysis.CSharp.CodeStyle | 1 | StyleCop analyzers repo |
| Meziantou.Analyzer as a *consumer* | **0** of 35 (the repo itself ships it and uses it via its own SDK) | - |
| xunit.analyzers / NUnit.Analyzers / MSTest.Analyzers | 3 / 2 / 1 | anthropic, testcontainers, xunit / GitVersion, npgsql / testfx |
| CSharpier.MsBuild | 1 | CliWrap (formatting enforced at build, no `dotnet format` step) |

BannedApi has one concrete sample: Polly adds `AdditionalFiles analyzers\BannedSymbols.txt` only when `IsTestProject != true` (App-vNext__Polly@e4476096da5b:eng/Analyzers.targets:6). Azure carries `eng/BannedSymbols.txt`, `eng/CodeAnalysis.ruleset`, `eng/AnalyzerAllowList.targets` and per-library allowlists (`eng/analyzerallowlist/*.txt`), i.e. an allowlist-of-exceptions model (Azure__azure-sdk-for-net@32c48fc3d524:eng/).

### 4.2 AnalysisLevel / AnalysisMode / code-style-in-build

- `AnalysisMode`: All (simple-exec Directory.Build.props:4), Recommended (pulumi), Default (cake), Minimum+None (Humanizer, explicit relaxations). `AnalysisLevel`: `latest` 8 repos, `latest-All` 1 (xunit src/Directory.Build.props:61), `preview-recommended` 2 (coverlet, testfx).
- simple-exec is the only repo that combines `AnalysisMode=All` with a repo-wide global severity floor: `.globalconfig` contains `is_global = true` + `dotnet_analyzer_diagnostic.severity = warning` (adamralph__simple-exec@f80913246993:.globalconfig:3), then TreatWarningsAsErrors only for `Configuration=Release` (Directory.Build.props:19-22). That makes every CA/IDE rule a warning locally and an error on the CI Release build.
- `EnforceCodeStyleInBuild=true` in 11 repos; simple-exec pairs it with `GenerateDocumentationFile=true` and a comment pointing to dotnet/roslyn#41640 (IDE0005 only works in build when the doc file is generated) (Directory.Build.props:8).

### 4.3 Suppression and severity statistics

`python3 -I count.py nowarn` (repos whose MSBuild files list the ID in `<NoWarn>`; 33 repos have any NoWarn):

| ID | Repos | Meaning |
|---|--:|---|
| CS1591 | **19** | missing XML doc on public member |
| NU5128 | 7 | pack: missing dependency group for a TFM (typical for build-only/analyzer packages) |
| NU5105 | 5 | non-SemVer-2 version string |
| CS1701 / CS1702 | 5 / 5 | assembly-version unification |
| NU1701 | 5 | package restored with fallback TFM |
| CA2007 | 4 | `ConfigureAwait` (Polly, Azure, simple-exec, BDN) |
| NU1510, NU1507, NU1903 | 4 each | unneeded direct ref / multi-source w/o mapping / known vulnerable package |
| CS0618, CS1573 | 4 each | obsolete use / partial param docs |

`dotnet_diagnostic.<ID>.severity` overrides (`python3 -I count.py sev`, repos setting the ID; Polly excluded because its four generated globalconfigs alone hold 2980 override lines): IDE1006 10 (naming; 7 of its settings are `none`), **CA2007 9** (settings: none 7, warning 4, silent 2, suggestion 1, error 1), IDE0060 6, IDE0005 5, IDE0305 5, IDE0011 5, CA1822 5, SA1600 5 (silent/none: StyleCop docs rules are turned off), CA2016 5 (forward CancellationToken; 4 warning, 1 error: npgsql .editorconfig:64), IDE0090 5. Reading: library-vs-test split on CA2007 is real (stripe sets it to `error` at stripe-dotnet .editorconfig:18; BDN `warning` at .editorconfig:41; npgsql scopes `warning` to `src/.editorconfig:16`; Meziantou, MessagePack, xunit, vs-threading set it off/silent).

`.editorconfig`: 31 repos have a root file, median 99 lines (min 8, max 888 testfx); 27 repos carry `csharp_style_*`/`dotnet_style_*` blocks (26 / 23 individually); `:warning`/`:error` enforce-in-build suffixes appear in 15 (Polly, FluentValidation, GitVersion, Humanizer, Redis, cake, coverlet, aspire, command-line-api, testfx, vs-threading, npgsql, nuke, spectre, xunit).

Polly's approach is the extreme: four checked-in generated globalconfigs (Library 5118 lines: 697 warning, 37 error, 122 none, 16 suggestion, 2 silent; Test 5346; Benchmark 5396; StyleCop 1810), selected by `$(ProjectType).globalconfig` (App-vNext__Polly@e4476096da5b:eng/Analyzers.targets:9-10, header "Created by the diagnostic config generator, 2023-02-20" in eng/analyzers/Library.globalconfig:1-3). It carries 37 `error` rules but Polly sets no TreatWarningsAsErrors (grep returns none).

## 5. Trim / AOT

`python3 -I count.py aot`: IsAotCompatible 11 (Polly, Humanizer, command-line-api, testfx, vs-threading, nodatime, npgsql, openai, serilog, spectre, xunit), IsTrimmable 4 (Humanizer, command-line-api, testfx, xunit), EnableTrimAnalyzer 1 (command-line-api), EnableAotAnalyzer 0 true, PublishAot 9 (mostly AOT smoke/test apps).
- `IsAotCompatible` is set conditionally on the TFM supporting it: vs-threading `Condition="$([MSBuild]::IsTargetFrameworkCompatible('$(TargetFramework)', 'net8.0'))"` (microsoft__vs-threading@f6d817997090:src/Microsoft.VisualStudio.Threading/Microsoft.VisualStudio.Threading.csproj:11). CliWrap disables both analyzers on every TFM that is not net10.0-compatible (Directory.Build.props:19-22).
- command-line-api states all of `IsTrimmable`, `IsAotCompatible` in System.CommandLine.csproj:14-17 and sets `PublishAot` in 2 files.
- Azure opts out per library (`AotAnalyzersOptOut=true` in Azure.Core.csproj:15) - a documented exception, not silence.
- Native-AOT claims are tested in xunit (`.aot` projects with 7 RIDs: `XunitAotRuntimeIdentifiers=win-x86;win-x64;win-arm64;linux-x64;linux-arm64;osx-x64;osx-arm64`, src/Directory.Build.props:34).

## 6. Packaging and supply chain

### 6.1 Package validation / API compatibility
`EnablePackageValidation=true`: Polly (baseline `PackageValidationBaselineVersion` 8.5.2, eng/Library.targets:16-17), FluentValidation (baseline 12.0.0), vs-threading (17.14.15), nodatime (3.3.0), stripe (`$(Version)`, i.e. self-baseline), coverlet (no baseline). Azure runs `ApiCompatVersion` managed by tooling (Azure.Core.csproj:6-7). Public-surface tracking alternative: PublicApiAnalyzers + `PublicAPI.Shipped.txt` (9 repos).

### 6.2 Versioning
Nerdbank.GitVersioning 7 (Dapper, StyleCop, Humanizer, Redis, coverlet, vs-threading, xunit; `version.json` tracked in 7 repos, vs-threading with 5 files), MinVer 3 (Polly: `MinVerMinimumMajorMinor` in eng/Common.props:23; simple-exec; spectre), `GitVersion.yml` 5 (cake, roslynator, GitVersion, nuke, octokit). 15/35 derive the version from git; the other 20 hard-code or inject (CliWrap `<Version>0.0.0-dev</Version>` replaced at pack time, Directory.Build.props:3).

### 6.3 Restore reproducibility
- Lock files: xunit 59, anthropic 8, testcontainers 7, simple-exec 5, testfx 1. `RestoreLockedMode` conditioned on CI: simple-exec `Condition="'$(CI)' != ''"` (Directory.Build.props:11), xunit `Condition="'$(ContinuousIntegrationBuild)' == 'true'"` (src/Directory.Build.props:29); testfx 1.
- `packageSourceMapping`: author-owned in Polly (NuGet.config), npgsql (NuGet.config), MessagePack, testfx (NuGet.config + `.config/stryker/NuGet.config`), openai (nuget.config + codegen/nuget.config). 27 repos have at least one nuget.config file (44 files in total); 16 repos have no packageSourceMapping at all even though NU1507 (multiple sources, no mapping) is suppressed in 4.
- NuGetAudit: configured in 2 (`NuGetAuditMode=direct` Polly eng/Common.props:9; `NuGetAudit=false` stripe). `CheckSdkVulnerabilities` true in Polly (eng/Common.props:5).

### 6.4 Symbols, SourceLink, determinism, signing
- snupkg 9; embedded PDB (`DebugType=embedded`) in 16; `portable`/`full` otherwise. Polly shows the full chain: `PublishRepositoryUrl`, `IncludeSymbols`, `SymbolPackageFormat=snupkg` (eng/Library.targets:21-23), `EmbedUntrackedSources` (eng/Library.targets:11), `ContinuousIntegrationBuild`+`Deterministic`+`DeterministicTimestamp` only when `CI == 'true'` (Directory.Build.props:7-10).
- Strong naming: 22 repos track an `.snk`, 20 set `SignAssembly=true`; coverlet tracks 17 `.snk` files. Polly wires `InternalsVisibleTo ... PublicKey` (eng/Library.targets:42,47). 12 repos neither track an `.snk` nor set `SignAssembly`: CliWrap, simple-exec, cake, aspire, command-line-api, sourcelink, Medallion, Meziantou, testfx, vs-threading, nuke, pulumi.
- NuGet signing in GitHub workflows: **2 repos**, both `dotnet/sign` CLI + Azure Key Vault + `azure/login`: Polly (.github/workflows/build.yml:250-271, `./sign code azure-key-vault **/*.nupkg ...`) and openai-dotnet (.github/workflows/release.yml:91-108). Attestation: Polly (`actions/attest`, build.yml:412), GitVersion, testcontainers. Microsoft-owned repos (testfx, aspire, vs-threading, sourcelink, PowerShell, Azure) sign inside Azure DevOps pipelines; those files were not parsed.

## 7. CI

### 7.1 Platform matrix (`python3 -I ci.py`; table 3.4)
27 repos build on Linux, 23 on Windows, 11 on macOS, 11 on all three (Polly, GitVersion, simple-exec, cake, coverlet, BenchmarkDotNet, npgsql, nuke, octokit, pulumi, xunit). Explicit arm64: GitVersion `ubuntu-24.04-arm`, simple-exec `ubuntu-24.04-arm` + `windows-11-arm`, BenchmarkDotNet `windows-11-arm` + `ubuntu-24.04-arm`. Intel mac runners also appear in cake (`macos-15-intel`) and BDN (`macos-26-intel`). Seven repos have no GitHub-hosted build parsed (Azure, PowerShell, aspire, command-line-api, sourcelink = AzDO/Arcade; Medallion = Travis/AppVeyor; CliWrap delegates to a shared workflow `Tyrrrz/.github/.github/workflows/nuget.yml@prime`).
Linux-only or Windows-only CI is common among libraries: Meziantou, vs-threading, nodatime, spectre, testcontainers are Linux-only on GitHub; serilog is Windows-only (`windows-latest`, ci.yml:19).

### 7.2 Test framework and runner (`count.py tests`)
xunit v2-only 16, xunit v3 12 (7 of those still mix in v2 packages), NUnit 9, MSTest 4. VSTest-only 20, MTP 12 (11 via global.json `test.runner`, adamralph__simple-exec@f80913246993:global.json:6-8 and the same shape in Polly, GitVersion, Humanizer, cake, coverlet, aspire, Meziantou, testfx, vs-threading, xunit). Coverage: coverlet packages 9 (coverlet.MTP in coverlet, GitVersion, cake), Microsoft.Testing.Extensions.CodeCoverage 5 (Polly, Humanizer, cake, testfx, vs-threading), codecov upload in workflows 7, ReportGenerator 3.

### 7.3 Supply-chain and workflow hygiene (`git grep -c -i -E <pat> -- .github/workflows '*.yml'` per repo)
- Fully SHA-pinned actions (every `uses:` is a 40-hex SHA): 9 (Polly 68/68, GitVersion 114/114, simple-exec 14/14, anthropic 11/11, Meziantou 26/26, testfx 2301/2301, vs-threading 7/7, openai 46/46, testcontainers 25/25); partially pinned 5 (stripe 24/28, pulumi 29/52, Humanizer 23/46, BDN 13/49, StyleCop 2/41); unpinned: the rest of the repos with workflows.
- `NuGet/login` (OIDC trusted publishing, no long-lived API key): 11 (simple-exec release.yml:22, Polly, cake, Dapper, roslynator, MessagePack, Meziantou, npgsql, openai, Redis, testcontainers).
- CodeQL / dependency-review / OSSF scorecard (match count > 0): 13 repos (Polly 20, testfx 36, GitVersion 25, ...). Stryker mutation testing: Polly (mutation-tests.yml), testfx. `cancel-in-progress` concurrency: 13 repos. Dependabot config: 16, Renovate config: 5.

### 7.4 Format gate
`dotnet format <sln> --verify-no-changes`: GitVersion (format.yml:79,83), roslynator (build.yml:63, with `--severity info`), Humanizer (docs.yml:177, `--verbosity diagnostic`), vs-threading (azure-pipelines/build.yml:225). CliWrap enforces CSharpier through the CSharpier.MsBuild package instead. 30 repos have no format check in CI.

## 8. Strongest gate configurations seen

No repo is best on every axis; these three are the strongest by evidence, and the third is the closest analogue to a CLI-wrapping SDK.

1. **xunit (build strictness)** - one unconditional block for every project: `LangVersion 14.0`, `TreatWarningsAsErrors true` (src/Directory.Build.props:24,33), plus for non-test projects `AnalysisLevel latest-All`, `EnforceCodeStyleInBuild`, `Nullable enable`, `EnableNETAnalyzers`, `IsAotCompatible` for `.aot` projects, `xunit.analyzers`, strong-name, NBGV, SourceLink; `RestorePackagesWithLockFile` always, `RestoreLockedMode` on CI (lines 29-30), 59 tracked lock files; `global.json` `latestMinor` + MTP runner; AOT RID matrix (xunit__xunit@0c7aa4991fa3:src/Directory.Build.props:61-71, global.json:1-8).
2. **Polly (breadth of supply chain)** - 4 analyzer packs (StyleCop, Sonar, PublicApi, BannedApi; eng/Analyzers.targets:3-17) with generated per-project-type globalconfigs; `EnablePackageValidation` + baseline; MinVer; snupkg + SourceLink flags; `CI`-conditional determinism; CPM + artifacts output (Directory.Build.props:4-5); `NuGetAuditMode direct`; 68/68 SHA-pinned actions; `NuGet/login`; `dotnet/sign` Key Vault signing of nupkgs (build.yml:250-271); build attestation (build.yml:411); CodeQL, dependency-review, OSSF scorecard, Stryker; Linux/Windows/macOS matrix. Gap: no `TreatWarningsAsErrors` (relies on 37 globalconfig `error` severities).
3. **simple-exec (smallest effective recipe; subprocess library)** - 22 lines of props: `AnalysisMode All`, `.globalconfig` severity floor `warning`, `EnforceCodeStyleInBuild`, `GenerateDocumentationFile` (needed for IDE0005), `Nullable`, `ImplicitUsings`, TWAE in Release only, `RestorePackagesWithLockFile` + CI-conditional `RestoreLockedMode`, `Microsoft.VisualStudio.Threading.Analyzers`, PublicApiAnalyzers, `TargetFrameworks net8.0;net9.0;net10.0`, MinVer + `DotNet.ReproducibleBuilds.Isolated`, `global.json` `latestMinor` + MTP, CI on L/W/M with arm64 on Linux and Windows, SHA-pinned actions (14/14), `NuGet/login` publishing (adamralph__simple-exec@f80913246993:Directory.Build.props:4-21,29; global.json:1-8; .globalconfig:1-3; .github/workflows/release.yml:22). Gap: no package validation, no signing.

Composite "strongest" = simple-exec's property block + xunit's `latest-All` for production projects + Polly's package validation with baseline, PublicAPI files, `dotnet/sign` + `actions/attest` + `NuGet/login`, + simple-exec's arm64 matrix.

## 9. Smells (things the data shows going wrong or being cargo-culted)

1. CS1591 suppressed in 19 repos while `GenerateDocumentationFile=true` in 30: docs are generated and not enforced (testfx is the counter-example: `WarningsAsErrors=$(WarningsAsErrors);CS1591` for its two public API projects, microsoft__testfx@7226b0c74729:src/Platform/Microsoft.Testing.Platform/Microsoft.Testing.Platform.csproj and src/TestFramework/TestFramework/TestFramework.csproj).
2. Strong-name keys committed in 22 repos, `SignAssembly` in 20 - a .NET Framework-era ritual; 12 repos do neither, including the modern-only simple-exec, cake, nuke, pulumi.
3. Explicit `Microsoft.SourceLink.GitHub` in 12 repos is redundant on the 8+ SDK (xunit pins it by exact version to dodge a System.Memory conflict - a cost of that choice).
4. `NU1903` (vulnerable package) muted in 4 repos (GitVersion, pulumi, stripe, xunit) and NuGetAudit disabled in stripe; `NU1507` muted in 4 instead of adding source mapping.
5. Preview posture leaking into builds: `LangVersion=preview` in 7, 6 repos pin an 11.0 preview/RC SDK, 7 set `allowPrerelease: true`.
6. `AnalysisMode=None/Minimum` plus broad `none` severities (Humanizer) next to `TreatWarningsAsErrors` makes the gate cosmetic.
7. pulumi-dotnet ships `net6.0` (EOL) only; the closest CLI-wrapping precedent is the least current.
8. Hand-maintained 5000-line generated globalconfigs (Polly) - unreadable diffs; the generator header dates 2023.
9. 20 repos still on VSTest-only; 16 on xunit v2-only.
10. Only 11/35 test macOS and 3/35 explicit arm64; Linux-only GitHub CI for Meziantou, vs-threading, nodatime, spectre, testcontainers.

## 10. Patterns worth encoding (with the strongest evidence)

1. **Root layering recipe**: root `Directory.Build.props` (32/35) + `Directory.Packages.props` CPM (22) + `global.json` with `sdk.version`, `rollForward` `latestFeature|latestMinor` (15 of 28), explicit `allowPrerelease: false`, and `test.runner = Microsoft.Testing.Platform` (11) + `.slnx` (24, 19 slnx-only). Evidence: simple-exec global.json:1-8, Redis global.json:4 (guard), Meziantou/Polly/GitVersion/xunit global.json.
2. **Gate block**: `Nullable enable` (30/35), `ImplicitUsings`, `EnableNETAnalyzers`, `AnalysisMode All` or `latest-All` for production projects, `EnforceCodeStyleInBuild` + `GenerateDocumentationFile`, `.globalconfig` with `dotnet_analyzer_diagnostic.severity = warning` (simple-exec) and `TreatWarningsAsErrors` for Release or CI only; relax test projects separately (Polly Test.globalconfig; xunit `.tests` carve-out at src/Directory.Build.props:59).
3. **CI-conditional reproducibility**: `ContinuousIntegrationBuild`/`Deterministic` and `RestoreLockedMode` only on CI (Polly Directory.Build.props:7-10, xunit:29, simple-exec:11) so local restores stay flexible.
4. **Multi-target hygiene when netstandard2.0 is kept**: conditional property groups for `Nullable annotations` and trim/AOT analyzers on old TFMs (CliWrap), per-TFM `IsAotCompatible` (vs-threading), `ItemGroup Condition=TargetFramework==...` for polyfill packages, Windows-only net4x TFMs (Serilog `Condition="'$(OS)' == 'Windows_NT'"`, Azure tests).
5. **Public surface control**: PublicApiAnalyzers + `PublicAPI.Shipped.txt`/`Unshipped.txt` (9 repos) and/or `EnablePackageValidation` with `PackageValidationBaselineVersion` (6) - the only two exemplar mechanisms for catching breaking changes before publish.
6. **Release supply chain**: `NuGet/login` OIDC (11), `dotnet/sign` with Key Vault (2), `actions/attest` (Polly), SHA-pinned actions (9 fully), explicit `permissions:` blocks (29 repos, out.json `wf_permissions`).
7. **Async/subprocess analyzers**: CA2007 is treated as a library-only rule where it is set (warning/error in src, none/silent in tests; 9 repos override it); CA2016 forward CancellationToken (5 repos); `Microsoft.VisualStudio.Threading.Analyzers` is wired in the subprocess exemplar (simple-exec Directory.Build.props:29) and in testfx.
8. **CI OS matrix**: `ubuntu-latest` + `windows-latest` + `macos-latest` (11) plus an arm64 leg (`ubuntu-24.04-arm`, `windows-11-arm`: simple-exec, BDN, GitVersion) - the only exemplars that gate the owner's "Windows/Linux/macOS x64+arm64" requirement.

## 11. Caveats and open items

- **Sparse slices**: Azure (only sdk/core/Azure.Core + eng), aspire (src/Aspire.Hosting/Dcp), PowerShell (NativeCommandProcessor.cs) have most build files absent from disk; their rows show only what exists (Azure's `eng/Directory.Build.Common.props` is present and read; aspire's workflows are tracked but absent; PowerShell has no csproj on disk). Totals over 35 count them as zero where nothing was readable; totals over 34/32 are stated explicitly.
- **MSBuild SDKs and Arcade hide settings** (Meziantou.NET.Sdk, DotNet.ReproducibleBuilds, Microsoft.DotNet.Arcade.Sdk used by aspire, command-line-api, sourcelink, testfx); `Nullable`, `AnalysisMode`, signing and symbol settings are therefore under-counted for exactly the Microsoft repos.
- **Presence not coverage**: a property set only in a test/sample project still counts the repo; the TFM table is the exception (hand-verified primary library).
- **CI parsing is regex-based** over runner tokens; octokit's `platform:` key was patched by hand; AzDO pipelines, shared reusable workflows (CliWrap -> `Tyrrrz/.github`) and Cake/Nuke/`build.cs` indirection (spectre uses `build.cs`, testcontainers uses `build.sh` Cake) are not followed, so Linux/Windows counts are lower bounds.
- Not measured: whether any repo's signing happens in AzDO, actual lock-file freshness, whether warnings-as-errors passes on `main`, and no exemplar was built.
- Re-run: `cd /home/mherwig/.cache/research-lang/dotnet-tools/fixtures/exemplar-build-gates && python3 -I audit.py out.json && python3 -I ci.py >/dev/null && python3 -I flags.py && python3 -I count.py` (verified: flags.json and the four generated tables regenerate byte-identical).
