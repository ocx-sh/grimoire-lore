---
title: C# and .NET expertise (language, async, analyzers, SDK/MSBuild, NuGet, testing, release) — phase 0 frame
program: csharp
date: 2026-10-10
method: research-lang (one language, its runtime era, its build system, its package manager, its analyzer and test ecosystem, and its release story)
status: active
branch: csharp worktree (/home/mherwig/dev/grimoire-lore/.agents/worktrees/csharp) — research lands on branch `csharp`, not `main`
---

# C# — the frame

Written before any worker was spawned. Everything below is a hypothesis the
grounding wave may overturn; corrections are appended at the bottom, never
edited into the body.

## The language and its era

Measured 2026-10-10 from the official release index
(`builds.dotnet.microsoft.com/dotnet/release-metadata/releases-index.json`):

| Channel | Latest SDK | Phase | Type |
|---|---|---|---|
| 11.0 | 11.0.100-rc.1 | go-live | STS (GA expected Nov 2026) |
| 10.0 | 10.0.401 | active | LTS — the target |
| 9.0 | 9.0.318 | maintenance | STS |
| 8.0 | 8.0.425 | maintenance | LTS — the floor |

Target: **C# 14 on .NET 10 LTS**, floor .NET 8, with C# 15 / .NET 11 flagged
as era-specific. Layers:

- **Language**: nullable reference types, records and `with`, pattern
  matching, primary constructors, collection expressions, `required`/`init`,
  `field` keyword and extension members (C# 14), `Span<T>`/`ref struct`,
  source generators vs reflection.
- **Async and concurrency**: `Task`/`ValueTask`, `ConfigureAwait`,
  `CancellationToken` plumbing, sync-over-async, `IAsyncEnumerable`,
  channels, `IAsyncDisposable`, thread-pool starvation.
- **Analyzers and gates**: Roslyn analyzers (CA/IDE), `AnalysisLevel`,
  `TreatWarningsAsErrors`, `.editorconfig` severity, `dotnet format`,
  nullable warnings as errors, trimming/AOT analyzers.
- **SDK and MSBuild**: SDK-style projects, `Directory.Build.props/targets`,
  Central Package Management, `global.json` SDK pinning and roll-forward,
  `.slnx`, file-based apps (`dotnet run app.cs`, .NET 10).
- **NuGet**: lock files and `--locked-mode`, package source mapping,
  vulnerability audit (`NuGetAudit`), trusted signing, SourceLink,
  deterministic builds, package validation / API compat.
- **Testing**: xUnit v3, MSTest, NUnit, Microsoft.Testing.Platform vs VSTest,
  coverage.
- **Release**: framework-dependent vs self-contained vs single-file vs
  Native AOT, trimming, RID matrix, container publish.

## The codebases that will adopt the output

Fleet measurement (`find ~/dev -name '*.cs' -o -name '*.csproj' ...`,
excluding worktrees and `.tmp-*`): **zero first-party C#**. The only hits are
vendored protobuf C# sources inside a Bazel cache in `ocx-sion` and test
fixtures in `grimoire`. Grounding therefore follows the JVM/Swift precedent:
~30 upstream exemplars, blob-less sparse clones under
`~/.cache/research-lang/exemplars/csharp`, measured not read.

Consumers: any lore user writing C#; the set publishes from this repo.

## Toolchain

`ocx index catalog` has no .NET SDK (only `ocx.sh/powershell/powershell`).
Plan: official `dotnet-install.sh` into `~/.cache/research-lang/dotnet-tools`
(SDK 10.0.401 and 8.0.425, 11.0 RC for era checks), no root, wrapped by a
`run.sh` that pins `DOTNET_ROOT`, `NUGET_PACKAGES` and
`DOTNET_CLI_TELEMETRY_OPTOUT`. Windows host has SDK 10.0.102 for
Windows-only claims. Every verification watched red on a planted fixture and
green on its twin.

## Intended artifact set (house shape, revisable after the map)

- Rule `csharp-quality` (index + depth files + `checks/`): language,
  nullability, async, disposal, exceptions, analyzers, performance, security.
- Rule `dotnet-build` (index + depth): SDK projects, MSBuild layering, CPM,
  `global.json`, NuGet locking/audit/source mapping, gates, packaging.
- Skills `dotnet-upgrade` (TFM / SDK / C# version migration), `dotnet-diagnose`
  (restore/build/analyzer error catalog), `dotnet-release` (NuGet pack,
  SourceLink, deterministic, AOT/single-file/container publish).
- Bundle `dotnet-essentials` (untagged members); `publish.toml` entries at 0.1.0.
- Open for the map: a `bazel-quality/csharp.md` depth file (rules_dotnet) only
  if the scouts show real adoption.

## Corrections after framing (2026-10-10)

1. **Owner: the adopting codebase is a C# SDK that wraps the ocx CLI.** C#
   is not in the fleet today; the program exists so an agent can write a
   high-quality .NET SDK over `ocx`. Reference implementation:
   `~/dev/ocx-sdk-python` (`src/ocx_sdk/_process.py`, `_errors.py`,
   `_results.py`, `_bootstrap.py`, `_dist.py`, `_retry.py` — "methods that
   mirror ocx's own commands one for one, wrapping the CLI rather than
   reimplementing it"). The CLI contract it binds to lives in
   `~/dev/ocx/crates/{ocx_exit,ocx_schema,ocx_cli}`. Grounding gains two
   axes: the ocx CLI contract an SDK consumes, and a portability digest of
   the Python SDK. Library authoring (public API, versioning, NuGet
   publishing, subprocess control, JSON binding) moves to the centre.
2. **Owner: modern .NET (Core) for all platforms.** Windows, Linux and macOS,
   x64 and arm64, are a hard requirement. Target-framework reach is an open
   research question the map must decide: `net8.0`+ only, or also
   `netstandard2.0` for .NET Framework / Unity / older hosts, and at what cost
   (polyfills, `Process` API gaps, `System.Text.Json` source generation, AOT).
3. **Measured: SDK selection without `global.json` picks the newest installed
   SDK, including a prerelease.** `dotnet run app.cs` in an unpinned dir ran
   on 11.0 RC1 with 10.0.401 installed. Fixtures dir
   (`~/.cache/research-lang/dotnet-tools/fixtures`) pins 10.0.401.
4. Toolchain: `~/.cache/research-lang/dotnet-tools/run.sh` (SDKs 8.0.425,
   10.0.401, 11.0 RC1). Windows host SDK 10.0.102 for Windows-only claims.
5. Exemplars: 35 repos, SHAs in `csharp-audit/scratch/fetch.log` —
   CLI-wrapping libraries (CliWrap, SimpleExec, MedallionShell, Pulumi
   Automation API, Testcontainers, Nuke, Cake), SDKs (Octokit, Stripe, OpenAI,
   Anthropic, Azure.Core), strict libraries (Polly, Npgsql, NodaTime, Serilog,
   Dapper, StackExchange.Redis, MessagePack), analyzers (Meziantou, StyleCop,
   Roslynator, vs-threading), test/tooling (xunit, testfx, coverlet,
   BenchmarkDotNet, SourceLink, GitVersion), plus sparse slices of Aspire DCP
   and PowerShell's native-command processor.
