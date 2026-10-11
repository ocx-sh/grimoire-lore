---
title: "Target framework reach: netstandard2.0 vs net8.0+, the floor, and the polyfill cost for an ocx SDK"
topic: csharp-build / csharp-build-tfm-reach
agent: deep-dive researcher (sonnet), group "Target reach, the analyzer gate, and SDK/restore pinning"
model: claude-sonnet-5-5
date_researched: 2026-10-10
sources_count: 32
scope: |
  Covers: which TargetFrameworks string an ocx-wrapping C# SDK should ship for each owner answer, measured reach on the 8 ocx dist targets, the compile-level cost of netstandard2.0 (API, language, nullable, trim), the polyfill packages that clear it, the split option, the .NET 8 / 9 / 10 / 11 support clock, the LangVersion-14-on-net8 question, 32-bit .NET Framework hosts on x64 Windows, and the floor-bump procedure for a dotnet-upgrade skill.
  Not covered: process-engine design (ArgumentList escaping policy, tree kill, timeouts), analyzer severities, packaging/signing, SDK pinning in CI (sibling subtopics). Unity/IL2CPP/Mono runtime behaviour was not executed here (cited only). Windows-on-Arm64 and .NET Framework behaviour under x64 emulation on Arm64 were not measured.
---

# Target framework reach: netstandard2.0 vs net8.0+, the floor, and the polyfill cost

Toolchain for every "Verified" claim: `/home/mherwig/.cache/research-lang/dotnet-tools/run.sh dotnet ...` (SDK 10.0.401 pinned by the parent `global.json`; 8.0.425 and 11.0.100-rc.1.26425.128 via nested `global.json`). Fixtures: `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-build-tfm-reach/` (abbreviated `$F`). Windows host: SDK 10.0.102, staged under `C:\Users\ecom\csharp-wintest\tfm-reach\`.

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   - [1. Reach: modern .NET already covers all 8 ocx targets](#1-reach-modern-net-already-covers-all-8-ocx-targets)
   - [2. What netstandard2.0 actually adds](#2-what-netstandard20-actually-adds)
   - [3. Cost of netstandard2.0, measured by compile probe](#3-cost-of-netstandard20-measured-by-compile-probe)
   - [4. Polyfills: what clears the errors and what does not](#4-polyfills-what-clears-the-errors-and-what-does-not)
   - [5. Corpus and guidance: who ships what, and why](#5-corpus-and-guidance-who-ships-what-and-why)
   - [6. The split option (models ns2.0, engine net8+)](#6-the-split-option-models-ns20-engine-net8)
   - [7. The floor: support clock, net8.0;net10.0 vs net10.0, LangVersion 14 on net8](#7-the-floor-support-clock-net80net100-vs-net100-langversion-14-on-net8)
   - [8. Consumer resolution and NU1202](#8-consumer-resolution-and-nu1202)
   - [9. 32-bit .NET Framework host on x64 Windows](#9-32-bit-net-framework-host-on-x64-windows)
   - [10. Decision table: TargetFrameworks per owner answer](#10-decision-table-targetframeworks-per-owner-answer)
   - [11. When netstandard2.0 is worth carrying (named consumer classes)](#11-when-netstandard20-is-worth-carrying-named-consumer-classes)
   - [12. Floor-bump procedure for the dotnet-upgrade skill](#12-floor-bump-procedure-for-the-dotnet-upgrade-skill)
   - [13. Verified on the toolchain](#13-verified-on-the-toolchain)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- Modern .NET (8, 10, and the 11 RC) supports every OS and CPU that the 8 ocx dist targets need (win/osx/linux/linux-musl x x64/arm64) per the official supported-OS matrices; netstandard2.0 adds runtimes (.NET Framework, Mono, Unity, Xamarin), not OSes or CPUs.
- Carry `netstandard2.0` only for a named consumer class (Visual-Studio-hosted MSBuild tasks, Unity, legacy .NET Framework 4.7.2+ services, analyzers) and only with a `net472` test leg on a Windows runner; "maximum compatibility" is not a consumer class.
- The ns2.0 compile cost is large and measured: 9 of 9 probed process/IO/time APIs fail to compile (ArgumentList, Kill(bool), WaitForExitAsync, StandardInputEncoding, OperatingSystem.IsWindows, File.SetUnixFileMode+UnixFileMode, TimeProvider, ArgumentNullException.ThrowIfNull, System.Formats.Tar) and the default C# is 7.3 (records, `required`, `init`, Index/Range fail).
- Set `<LangVersion>14</LangVersion>` explicitly (not `latest`) and add PolySharp or Polyfill (source-only, `PrivateAssets="all"`); this clears every language error (CS0518, CS0656) but not every API error.
- Polyfill 11.4.3 clears ArgumentList, Kill(bool), WaitForExitAsync, OperatingSystem.IsWindows and File.SetUnixFileMode on ns2.0; ThrowIfNull needs `<PolyArgumentExceptions>true</PolyArgumentExceptions>`; TimeProvider needs the `Microsoft.Bcl.TimeProvider` package; `ProcessStartInfo.StandardInputEncoding`, `System.Formats.Tar` (no NuGet package exists) and array ranges (`a[1..]`, CS0656 GetSubArray) stay unfixable and must be designed around.
- Polyfilled `ArgumentList` on .NET Framework builds `Arguments` with CRT escaping (Polyfill source `Polyfill_ProcessStartInfo.cs:46-103`); on a Windows net472 host it delivered `a b`, `say "hi"`, empty, `back\slash\`, `$HOME`, `*` byte-exact.
- The ns2.0 BCL is nullable-oblivious: `Path.GetFullPath(null)` warns on net8.0 (CS8604) and is silent on ns2.0, and `string.IsNullOrEmpty(p) ? false : p.Length` yields a false-positive CS8602 on ns2.0; neither PolySharp nor Polyfill fixes it.
- `IsAotCompatible`/`EnableTrimAnalyzer` on netstandard2.0 build clean and do nothing (no error, no warning); condition them with `IsTargetFrameworkCompatible('$(TargetFramework)', 'net8.0')`.
- Never use `#if NET8_0`; on the net10.0 build it is false and the fallback branch compiles (measured); use `NET8_0_OR_GREATER`, and `NETSTANDARD2_0` only to mean "this is the ns2.0 build".
- Support clock (dotnet.microsoft.com, retrieved 2026-10-10): .NET 8 and .NET 9 both end 2026-11-10; .NET 10 LTS ends 2028-11-14; STS is 24 months; .NET 11 GA is expected at .NET Conf 2026-11-10..13 (not an official date); .NET Framework 4.6.2 ends 2027-01-13 UTC.
- `net8.0;net10.0` is the right pair while any net8 consumer exists; a `net10.0`-only package fails restore on net8 with NU1202 (measured), and a `net9.0` consumer of `net8.0;net10.0` resolves the `net8.0` asset (measured), so `net9.0` is never a useful TFM.
- `LangVersion 14` on `net8.0` compiles and runs compile-only features (`field`, `extension` blocks, `?.=`; run on 8.0.31) and the compiler itself refuses runtime-dependent ones (`allows ref struct` -> CS9240); Microsoft calls it unsupported, so make it a recorded decision.
- The SDK's EOL warning NETSDK1138 fires only for executables, never for libraries (`CheckEolTargetFramework` defaults to true only when `OutputType != Library`); a library needs its own TFM allow-list gate.
- Binary selection must key on `RuntimeInformation.OSArchitecture`, never `ProcessArchitecture`/`Is64BitProcess`/`IntPtr.Size`: a 32-bit net472 host on x64 Windows reports `OSArchitecture=X64`, `ProcessArchitecture=X86`, and spawns the x64 child fine (measured); ocx ships no win-x86 build.
- Dropping a TFM is a consumer-visible break (NU1202 for the consumer whose framework lost its asset, measured): do it only at a major version, only after the TFM's end-of-support date, with a Directory.Build.props single source of TFMs and the gate script in section 13.

## Findings

### 1. Reach: modern .NET already covers all 8 ocx targets

The ocx bootstrap targets map one-to-one onto .NET RIDs: aarch64/x86_64 apple-darwin = osx-arm64/osx-x64; aarch64/x86_64 pc-windows-msvc = win-arm64/win-x64; aarch64/x86_64 unknown-linux-gnu = linux-arm64/linux-x64; aarch64/x86_64 unknown-linux-musl = linux-musl-arm64/linux-musl-x64; no win-x86, no linux-arm, no FreeBSD (`/home/mherwig/dev/grimoire-lore/.agents/worktrees/csharp/.agents/research/csharp-audit/ocx-cli-contract.md:103`).

Per-target confirmation from the official supported-OS matrices (all "Last Updated: 2026/09/28"):

| ocx target | .NET 8 ([8.0](https://github.com/dotnet/core/blob/main/release-notes/8.0/supported-os.md)) | .NET 10 ([10.0](https://github.com/dotnet/core/blob/main/release-notes/10.0/supported-os.md)) | .NET 11 RC ([11.0](https://github.com/dotnet/core/blob/main/release-notes/11.0/supported-os.md)) |
|---|---|---|---|
| win-x64 | Windows 11/10/Server, Arm64, x64, x86 | same | same |
| win-arm64 | Windows 11 Arm64 (listed in the same row) | same | same |
| osx-x64, osx-arm64 | macOS 27, 26, 15: Arm64, x64 | same | same |
| linux-x64, linux-arm64 (glibc) | Ubuntu 26.04/24.04/22.04, Debian 13/12, RHEL 10/9/8, etc.: Arm64, x64 | same (Debian 13 only) | same |
| linux-musl-x64, linux-musl-arm64 | Alpine 3.24..3.21: Arm32, Arm64, x64; musl 1.2.2 | Alpine 3.24..3.21; musl 1.2.3 | Alpine 3.24, 3.23; musl 1.2.3 |

Read from the raw files (retrieved by `curl` from `raw.githubusercontent.com/dotnet/core/main/release-notes/{8.0,10.0,11.0}/supported-os.md`): the macOS row is `| macOS | 27, 26, 15 | Arm64, x64 |` in all three; the Windows row lists `Arm64, x64, x86`; Alpine rows list `Arm32, Arm64, x64`. The .NET 8 page says "Support phase: Maintenance", .NET 10 "Active", .NET 11 "Go Live". Windows notes: "The x64 and x86 emulators are supported on Windows 11 Arm64"; "QEMU is not supported to run .NET apps" ([10.0 Notes](https://github.com/dotnet/core/blob/main/release-notes/10.0/supported-os.md)). Consequence: every ocx target the SDK can run on is covered by `net8.0` and `net10.0` with no `netstandard2.0` involvement. 32-bit Windows (x86) is a .NET-supported host with no matching ocx binary: the SDK must fail with a clear unsupported-platform error there (see section 9).

### 2. What netstandard2.0 actually adds

netstandard2.0 is supported by ".NET and .NET Core 2.0 ... 10.0", ".NET Framework 4.6.1 (with caveat), 4.6.2 ... 4.8.1", "Mono 5.4, 6.4", Xamarin.iOS/Mac/Android, UWP 10.0.16299 and "Unity 2018.1"; netstandard2.1 is "N/A" for .NET Framework and Unity 2021.2 ([net-standard overview](https://learn.microsoft.com/en-us/dotnet/standard/net-standard), updated 2026-08-04). NuGet "considers .NET Framework 4.6.1 as supporting .NET Standard 1.5 through 2.0" but "there are several issues ... we recommend that you upgrade the project to target .NET Framework 4.7.2 or higher" (same page, footnote 2). Microsoft also says reusable libraries "consider the trade-off between reach and available feature set" and that "Most widely used libraries multi-target for both .NET Standard 2.0 and .NET 5+" (same page, 'When to target netx.0 vs. netstandard').

The runtimes it adds: .NET Framework (Windows only), Mono, Xamarin, Unity. Unity's default API compatibility level is ".NET Standard 2.1", the alternative is ".NET Framework" (4.8 plus netstandard 2.1 additions) ([Unity 6 manual](http://docs.unity3d.com/6000.0/Documentation/Manual/dotnet-profile-support.html), fetched 2026-10-10; the 6000.1 variant is cited in the practitioner scout). None of these adds an OS or CPU that net8.0+ lacks.

.NET Framework lifecycle (relevant to "which Framework"): 4.6.2 ends 1/13/2027 (UTC), 4.6.1 ended 2022-04-27, 4.7 through 4.8.1 have no end date listed ([lifecycle page](https://learn.microsoft.com/en-us/lifecycle/products/microsoft-net-framework)). Azure's own props state "`net462` reaches end-of-life in Jan, 2027" (`Azure__azure-sdk-for-net@32c48fc3d524:eng/Directory.Build.Common.props:213`).

### 3. Cost of netstandard2.0, measured by compile probe

Fixture `$F/probe-red/` (`TargetFrameworks netstandard2.0;net8.0;net10.0`, one method per API; declaration-level errors hide body-level errors in Roslyn, so each probe is a `void` method with no unknown type in its signature). `dotnet build -f netstandard2.0 --no-incremental` output (SDK 10.0.401):

| Probe | Code | ns2.0 error | net8.0 / net10.0 |
|---|---|---|---|
| P1 | `psi.ArgumentList.Add("x")` | CS1061 no `ArgumentList` | compiles |
| P2 | `p.Kill(true)` | CS1501 no overload takes 1 argument | compiles |
| P3 | `p.WaitForExitAsync(ct)` | CS1061 | compiles |
| P4 | `psi.StandardInputEncoding = ...` | CS1061 | compiles |
| P5 | `OperatingSystem.IsWindows()` | CS0117 | compiles |
| P6 | `File.SetUnixFileMode(path, UnixFileMode.UserRead)` | CS0117 + CS0103 (`UnixFileMode`) | compiles, CA1416 warning "unsupported on: 'windows'" |
| P7 | `TimeProvider.System.GetUtcNow()` | CS0103 | compiles (in-box since .NET 8) |
| P8 | `ArgumentNullException.ThrowIfNull(o)` | CS0117 | compiles |
| P9 | `System.Formats.Tar.TarFile.CreateFromDirectory(...)` | CS0234 namespace `Formats` missing | compiles |
| C1 (control) | `psi.Environment[..]`, `CreateNoWindow` | compiles | compiles |

Result: `10 Error(s)` on netstandard2.0 (P6 yields two), `0 Error(s)` on net8.0 and net10.0. This matches the 5-API probe in the audit (`csharp-audit/exemplar-cli-wrappers-and-sdks.md:110-117`). API availability from the docs: `ProcessStartInfo.ArgumentList` first exists in .NET Core 2.1 and netstandard 2.1 ([doc](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.processstartinfo.argumentlist), monikers `netcore-2.1, netstandard-2.1, net-5.0..net-11.0`); `Process.WaitForExitAsync` starts at .NET 5 ([doc](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process.waitforexitasync), monikers `net-5.0..net-11.0`).

Language cost (`$F/lang-red`, `$F/lang-lv14`, `$F/lang-bodies`, `#error version` probe, CS8304):

| TFM | default `LangVersion` (SDK 10.0.401) | SDK 11.0 RC1 |
|---|---|---|
| netstandard2.0 | 7.3 | 7.3 |
| net8.0 | 12.0 | 12.0 |
| net10.0 | 14.0 | 14.0 |
| net11.0 | n/a | 15.0 |

At the 7.3 default a `public record` fails immediately (`Lang.cs(4,1): error CS0106: The modifier 'public' is not valid for this item`). Forcing `<LangVersion>14</LangVersion>` on ns2.0 produces the polyfill errors: CS0518 `Predefined type 'System.Runtime.CompilerServices.IsExternalInit' is not defined or imported` (record, `init`), CS0656 `Missing compiler required member 'System.Runtime.CompilerServices.RequiredMemberAttribute..ctor'` and `'CompilerFeatureRequiredAttribute..ctor'` (`required`), CS0518 `System.Index` / `System.Range`, CS0656 `System.Index..ctor`, CS0225/CS0246 for `params ReadOnlySpan<int>` (no `ReadOnlySpan<>` in ns2.0). Compile-only features need no polyfill: `field`, collection expressions to `int[]`/`List<int>`, `switch` patterns, `is null` all built with no error on ns2.0 at LangVersion 14.

Nullable (`$F/nullable`, `<Nullable>enable</Nullable>`): `Path.GetFullPath(string?)` gives `warning CS8604` on net8.0 and no diagnostic on ns2.0 (BCL un-annotated, "oblivious"); `string.IsNullOrEmpty(p) ? false : p.Length > 0` gives `warning CS8602` on ns2.0 only (no `[NotNullWhen(false)]` on that API). Adding `Polyfill` + `PolySharp` did not change either (`nullable ns2.0 + Polyfill + PolySharp` still `CS8602`).

Trim/AOT (`$F/aot`): `IsAotCompatible=true` and `EnableTrimAnalyzer=true` on netstandard2.0 build with `Build succeeded.` and no warning; i.e. they are silently inert. Microsoft: "Trimming is only supported for .NET 6 and later" and "If library targets a TFM that is not trimmable, for example `net472` or `netstandard2.0`, there's no benefit to creating a trimming test app"; the documented gate is `<IsTrimmable Condition="$([MSBuild]::IsTargetFrameworkCompatible('$(TargetFramework)', 'net6.0'))">true</IsTrimmable>` ([trimming guide](https://learn.microsoft.com/en-us/dotnet/core/deploying/trimming/prepare-libraries-for-trimming), updated 2026-01-08). Exemplar: vs-threading conditions `IsAotCompatible` on the TFM (audit `exemplar-build-and-gates.md:308`).

Dependency cost: a `netstandard2.0` System.Text.Json 10.0.12 carries seven dependencies (`Microsoft.Bcl.AsyncInterfaces`, `System.IO.Pipelines`, `System.Text.Encodings.Web`, `System.Buffers`, `System.Memory`, `System.Runtime.CompilerServices.Unsafe`, `System.Threading.Tasks.Extensions`), `net8.0` two (`System.IO.Pipelines`, `System.Text.Encodings.Web`), `net10.0` none (nuspec of [System.Text.Json 10.0.12](https://api.nuget.org/v3-flatcontainer/system.text.json/10.0.12/system.text.json.nuspec)). `Microsoft.Bcl.TimeProvider` 10.0.12 has an empty `net8.0` group and dependencies for `netstandard2.0` (`Microsoft.Bcl.AsyncInterfaces`) and net462 ([nuspec](https://api.nuget.org/v3-flatcontainer/microsoft.bcl.timeprovider/10.0.12/microsoft.bcl.timeprovider.nuspec)). A net472 consumer of an ns2.0 package that uses TimeProvider copied `Microsoft.Bcl.AsyncInterfaces.dll`, `Microsoft.Bcl.TimeProvider.dll`, `System.Runtime.CompilerServices.Unsafe.dll`, `System.Threading.Tasks.Extensions.dll` into its output (`$F/c-net472-ns/bin/Debug/net472/`).

Code-shape cost in the corpus: `#if` TFM lines in non-test source: OpenAI 461 (378 files), Azure.Core 86, Anthropic 32, Testcontainers 27, Stripe 11, Medallion 11, CliWrap 4 (PolyShim absorbs it) (`csharp-audit/exemplar-cli-wrappers-and-sdks.md:225`).

### 4. Polyfills: what clears the errors and what does not

Three fixtures with the same sources (`$F/shared/{Decl,Body,Api}.cs`), `LangVersion 14`, `Nullable enable`, building `-f netstandard2.0`:

| Fixture | Result |
|---|---|
| `poly-none` | 5 errors: CS0518 x3 `IsExternalInit`, CS0656 x2 `CompilerFeatureRequiredAttribute`/`RequiredMemberAttribute` ctor (body errors hidden behind declaration errors) |
| `poly-polysharp` (PolySharp 1.16.0) | all language errors gone; 12 errors remain, all API/library: P1-P9 plus `Body.cs(11,46) CS0656 Missing compiler required member 'System.Runtime.CompilerServices.RuntimeHelpers.GetSubArray'` and `ThrowIfNull` |
| `poly-polyfill` (Polyfill 11.4.3) | 6 errors: `StandardInputEncoding` (CS1061), `TimeProvider` (CS0103), `ThrowIfNull` (CS0117), `System.Formats` (CS0234), `GetSubArray` (CS0656), `ThrowIfNull` in Body |
| `poly-polyfill-plus` (Polyfill 11.4.3 + `<PolyArgumentExceptions>true</PolyArgumentExceptions>` + `Microsoft.Bcl.TimeProvider` 10.0.12 on ns2.0 only) | 3 errors: `StandardInputEncoding` (CS1061), `System.Formats` (CS0234), array range `a[1..]` (CS0656 `GetSubArray`); net8.0 and net10.0: `0 Error(s)` |

What each package is: PolySharp "generates source-only polyfills for C# language features" (the compiler "magic types"); runtime-supported attributes are opt-in; "Features that need runtime support, such as static abstract members, won't work" ([PolySharp README](https://github.com/Sergio0694/PolySharp)). Polyfill is a "Source only package that exposes newer .NET and C# features to older runtimes", 1182 APIs, with a per-TFM count (netstandard2.0: 1081, net8.0: 400, net10.0: 190, net11.0: 58) ([Polyfill README](https://github.com/SimonCropp/Polyfill)); its API list shows `Process.Kill(bool)`, `Process.WaitForExitAsync`, `ProcessStartInfo.ArgumentList`, `OperatingSystem.IsWindows`, `File.SetUnixFileMode`, and notes `ArgumentNullException.ThrowIfNull` "Requires `<PolyArgumentExceptions>true</PolyArgumentExceptions>`" ([api_list](https://github.com/SimonCropp/Polyfill/blob/main/api_list.include.md)). Polyfill is implemented with C# 14 `extension(...)` members, so the consuming project needs a C# 14 compiler (Polyfill README, "SDK / LangVersion": newest stable SDK and `LangVersion latest`; we measured it with explicit `14`). Polyfill's own guidance: because polyfills compile into the consumer's IL, "the project should target all frameworks from the lowest TargetFramework up to and including the current framework" ([target-frameworks.md](https://github.com/SimonCropp/Polyfill/blob/main/target-frameworks.md)); default visibility is `internal`, and `PolyUseEmbeddedAttribute` exists for `InternalsVisibleTo` conflicts ([consuming.md](https://github.com/SimonCropp/Polyfill/blob/main/consuming.md)). Anthropic's rule: "Polyfilled attribute/compiler types stay `internal` (public copies collide with consumers' own polyfills)" (`anthropics__anthropic-sdk-csharp@ae16e5933f39:CLAUDE.md:29`).

The ArgumentList polyfill is behaviourally real: `Polyfill_ProcessStartInfo.cs` (in the 11.4.3 package, `contentFiles/cs/netstandard2.0/`) keeps a `ConditionalWeakTable<ProcessStartInfo, SyncingArgumentList>` and, on every mutation, rebuilds `owner.Arguments` quoting arguments that are empty or contain whitespace or `"`, doubling backslashes before a quote or at the end (lines 46-103). Windows proof in section 9.

System.Formats.Tar has no NuGet package: `dotnet restore` of `<PackageReference Include="System.Formats.Tar" Version="10.0.0" />` on netstandard2.0 gives `error NU1101: Unable to find package System.Formats.Tar. No packages exist with this id in source(s): nuget.org` (`$F/tarpkg`). An ns2.0 build that must unpack ocx `.tar.gz` needs a third-party tar reader or must shell out; the Python SDK uses stdlib tarfile (`python-sdk-digest.md:328` maps it to `System.Formats.Tar`).

Package-hygiene check: a library that references Polyfill/PolySharp without `PrivateAssets="all"` leaks both as NuGet dependencies (`leak-red`: nuspec `<dependency id="PolySharp" version="1.16.0"` and `<dependency id="Polyfill" version="11.4.3"`); with `PrivateAssets="all"` the nuspec has no dependencies (`leak-green`).

### 5. Corpus and guidance: who ships what, and why

Microsoft (written, current):
- "DO start with including a `net8.0` target or later for new libraries." "CONSIDER including a `netstandard2.0` target if you need broad compatibility or .NET Framework support." "DO NOT publish for `netstandard2.0` if your project or dependencies multi-target" is followed by "`netstandard2.0` is not a runtime, and multi-targeted projects provide a runtime framework-specific library" (the page is in tension with itself here: its own multi-targeting example is `net8.0;netstandard2.0`; see Contested) ([cross-platform targeting](https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/cross-platform-targeting), updated 2026-05-07). It also says "CONSIDER adding a target for `net462` when you're also targeting `netstandard2.0`" and "AVOID changing the assembly name ... for each TFM".
- Azure SDK: "MUST build all libraries for .NET Standard 2.0" and "SHOULD build libraries for the current long term support (LTS) version"; retirement: add the new LTS when released, keep the previous LTS "until it is out of support", then remove it; "MUST define the same APIs for all TFMs"; polyfills "only for `netstandard2.0` and legacy target frameworks" ([Azure SDK .NET guidelines](https://github.com/Azure/azure-sdk/blob/main/docs/dotnet/introduction.md), retrieved from raw lines ~1135-1215). In the monorepo: `LtsTargetFramework=net10.0`, `RequiredRunnableTargetFrameworks=$(LtsTargetFramework);net8.0`, client libraries `...;netstandard2.0` (`Azure__azure-sdk-for-net@32c48fc3d524:eng/Directory.Build.Common.props:194-195,230`).
- .NET team 2020: widely used libraries "will end up multi-targeting for both .NET Standard 2.0 and .NET 5"; "Most code can probably skip .NET Standard 2.1" ([future of .NET Standard](https://devblogs.microsoft.com/dotnet/the-future-of-net-standard/), 2020-09-15; era-specific, principle holds).
- Skeet 2026-07-11, forking a project: keeps `netstandard2.0` ("the bait target"), moves net45 -> net48 and netcoreapp2.1 -> net10, drops mobile and UWP: "I don't like the idea of trying to maintain code that I can't test" ([post](https://codeblog.jonskeet.uk/2026/07/11/forking-an-open-source-project/)).

Exemplars (TFMs, `file:line`):

| Library | TFMs | Source |
|---|---|---|
| anthropic-sdk-csharp | `net8.0;net9.0;netstandard2.0` | `anthropics__anthropic-sdk-csharp@ae16e5933f39:src/Directory.Build.props:28` |
| openai-dotnet | `net10.0;net8.0;netstandard2.0` | audit `exemplar-build-and-gates.md:107` |
| Azure.Core | `net10.0;net8.0;netstandard2.0` (+ net462/net472 where required) | `Azure__azure-sdk-for-net@32c48fc3d524:eng/Directory.Build.Common.props:230` |
| CliWrap | `netstandard2.0;netstandard2.1;net6.0;net7.0;net10.0` | `Tyrrrz__CliWrap@7dbc252fa773:CliWrap/CliWrap.csproj:3` |
| Testcontainers | `net8.0;net9.0;net10.0;netstandard2.0;netstandard2.1` | `testcontainers__testcontainers-dotnet@04cbb73fcc58:src/Testcontainers/Testcontainers.csproj:3` |
| MedallionShell | `netstandard1.3;netstandard2.0;net45;net46;net471` | `madelson__MedallionShell@e45f1f6ffd4c:MedallionShell/MedallionShell.csproj:4` |
| Polly.Core | `net8.0;net6.0;netstandard2.0;net472;net462` | `App-vNext__Polly@e4476096da5b:src/Polly.Core/Polly.Core.csproj:4` |
| simple-exec | `net8.0;net9.0;net10.0` (no ns2.0) | `adamralph__simple-exec@f80913246993:Directory.Build.props:13` |
| Pulumi.Automation | `net6.0` (no ns2.0) | `pulumi__pulumi-dotnet@2a0dca84f09b:sdk/Pulumi.Automation/Pulumi.Automation.csproj:4` |

Counts from the audit: 26 of 34 libraries ship netstandard; 8 of 34 are modern-only; the four vendor SDKs (anthropic, openai, stripe, Azure.Core) all keep `netstandard2.0` + net8.0+ (`exemplar-build-and-gates.md:15-18`); of the 13 wrapper/SDK libraries, 9 ship ns2.0 and SimpleExec, Pulumi, Cake, Aspire do not (`exemplar-cli-wrappers-and-sdks.md:221-222`). CliWrap shows what the choice costs a process wrapper: PolyShim + PowerKit + Snek, `Microsoft.Bcl.AsyncInterfaces`, `System.Threading.Tasks.Extensions`, `System.Management`, `System.Memory` all conditioned on the TFM (`Tyrrrz__CliWrap@7dbc252fa773:CliWrap/CliWrap.csproj:28-45`). Anthropic is the best-documented testing rule: tests run on .NET and `net472`, and "the `net472` run is what exercises the `netstandard2.0` build (on Windows in CI)" (`anthropics__anthropic-sdk-csharp@ae16e5933f39:CLAUDE.md:20`); behaviour must be identical on every target, and "a guard around the missing `HttpStatusCode.TooManyRequests` once silently disabled 429 retries for every netstandard2.0 consumer" (`CLAUDE.md:28`). Serilog's trim policy: freeze net462/net471 on Windows only; keep `netstandard2.0`, `net6.0`, active LTS (audit `exemplar-build-and-gates.md:119`).

### 6. The split option (models ns2.0, engine net8+)

Fixture `$F/split`: `Ocx.Models` (`netstandard2.0`, PolySharp, `public sealed record PackageRef(string Name) { public required string Digest { get; init; } }`) and `Ocx.Engine` (`net8.0;net10.0`, `ProjectReference` to Models, `Process.Kill(true)`). `dotnet pack` output: `Ocx.Models.1.0.0.nupkg` has only `lib/netstandard2.0/Ocx.Models.dll`; `Ocx.Engine.1.0.0.nupkg` nuspec has groups `net10.0` and `net8.0`, each depending on `Ocx.Models`. Consumers:
- red: `c-net472-engine` (net472 referencing Ocx.Engine): `error NU1202: Package Ocx.Engine 1.0.0 is not compatible with net472 (.NETFramework,Version=v4.7.2). Package Ocx.Engine 1.0.0 supports: net10.0, net8.0`.
- green: `c-net472-models` (net472 referencing Ocx.Models): `Build succeeded.`; `c-net8-engine`: `Build succeeded.`

What the split buys: a Framework/Unity/MSBuild-task consumer can read and write ocx JSON documents and typed refs, but cannot use the engine. The in-corpus precedent: Nuke has `Nuke.Build.Shared` (`netstandard2.0;net10.0`) and `Nuke.Common` (`net10.0`) (audit `exemplar-cli-wrappers-and-sdks.md:227`). The cost: two packages, two versions, a cross-package public API that must stay ns2.0-compatible (no `Span` in signatures without `System.Memory`), and System.Text.Json brings seven transitive packages on ns2.0 (section 3) against two on net8.0 and none on net10.0 (only for an in-box reference; a `PackageReference` is still needed on ns2.0). When the engine itself can be ns2.0 (Polyfill covers ArgumentList, Kill(bool), WaitForExitAsync, IsWindows), the split saves little: the real engine blockers are `StandardInputEncoding`, `System.Formats.Tar` and array ranges.

### 7. The floor: support clock, net8.0;net10.0 vs net10.0, LangVersion 14 on net8

Support dates ([.NET and .NET Core support policy](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core), retrieved 2026-10-10):

| Version | GA | Type | Support | End of support |
|---|---|---|---|---|
| .NET 8 | 2023-11-14 | LTS | 3 years | 2026-11-10 |
| .NET 9 | 2024-11-12 | STS | 2 years | 2026-11-10 |
| .NET 10 | 2025-11-11 | LTS | 3 years | 2028-11-14 |
| .NET 11 | .NET Conf 2026-11-10..13 (page: "isn't an official release date"); RC1 go-live 2026-09-08 | STS (even/odd rule) | 2 years | RC1 listed 2026-10-13; GA release EOS not yet published |

STS is 24 months ("The page already sets STS support at two years"); the last 6 months of any release are maintenance (security fixes only); end-of-support dates are Patch Tuesday. Hence as of 2026-10-10 both net8.0 and net9.0 are 31 days from end of support; net9.0 adds no reach over net8.0 for a library (consumer on net9 resolves the net8.0 asset, section 8), so the pair that matters is `net8.0;net10.0`.

`net8.0;net10.0` versus `net10.0` only:
- `net10.0` only: restore on any net8 or net9 project fails with `NU1202` (section 8). That excludes every consumer who has not yet moved off 8/9, including the 31 days of overlap and, in practice, a long tail after 2026-11-10.
- `net8.0;net10.0`: one extra TFM, no polyfills (everything the process engine needs exists in net8.0: ArgumentList, Kill(bool), WaitForExitAsync, StandardInputEncoding, TimeProvider, Formats.Tar, `OperatingSystem.IsWindows`), requires a net8 runtime test leg. Cake's .NET 11-only APIs show where this leads: the BCL gains `Process.Run/RunAsync`, `RunAndCaptureText`, `Signal`, `ProcessExitStatus`, `ProcessStartInfo.KillOnParentExit` etc. only in net11.0 RC1 (audit `exemplar-cli-wrappers-and-sdks.md:121`); guard them with `#if NET11_0_OR_GREATER` and do not encode RC1 shapes as stable.
- Azure's retirement rule is the best written policy: keep the previous LTS "until it is out of support", then remove it.

LangVersion 14 on net8.0 (`$F/net8-lv14-run`, `$F/net8-lv14-red`): Microsoft states "Using a C# language version newer than the version associated with your target TFM isn't supported" and "Don't set the `LangVersion` element to `latest`" ([configure language version](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/configure-language-version), updated 2026-01-20). Measured: under SDK 10.0.401, `net8.0` + `LangVersion 14` compiled and ran (output `lazy True 8.0.31` then `ok`) a program using the `field` keyword, a C# 14 `extension(string s)` block and `n?.Next = c`; the compiler itself refuses features that need new runtime support: `static void F<T>(T t) where T : allows ref struct { }` on net8.0 gives `error CS9240: Target runtime doesn't support by-ref-like generics.` and builds on net10.0. The older SDK cannot do it at all: SDK 8.0.425, `net8.0`, `LangVersion 14` gives `CSC : error CS1617: Invalid option '14' for /langversion`, and SDK 8.0.425 targeting `net10.0` gives `error NETSDK1045: The current .NET SDK does not support targeting .NET 10.0`. `LangVersion latest` drifts with the SDK: same project, `net10.0`, `latest` = 14.0 under SDK 10.0.401 and 15.0 under SDK 11.0 RC1 (`Language version: latest (14.0)` vs `latest (15.0)`, `$F/latest-drift`). So the library must be built with SDK >= 10 and pin an explicit numeric LangVersion.

EOL detection in the SDK (`$F/eol`): `Microsoft.NET.EolTargetFrameworks.targets` hard-codes `_EolNetCoreTargetFrameworkVersions Include="1.0;1.1;2.0;2.1;2.2;3.0;3.1;5.0;6.0;7.0"` (SDK 10.0.401, file under `dotnet/sdk/10.0.401/Sdks/Microsoft.NET.Sdk/targets/`) and defaults `CheckEolTargetFramework` to true only when `OutputType != 'Library'`. Measured: an `Exe` targeting `net7.0` emits `warning NETSDK1138: The target framework 'net7.0' is out of support and will not receive security updates in the future.`; `CheckEolTargetFramework=false` silences it; a `Library` targeting `net7.0` builds with no warning at all. Net8 and net9 will join that list in SDK servicing after 2026-11-10 (list is data in the SDK; not verifiable today).

### 8. Consumer resolution and NU1202

Local feed `$F/feed` (three packages built by `dotnet pack`), consumers restoring from it (`$F/c-*`). Selected compile asset per consumer, read from `obj/project.assets.json`:

| Consumer | Package | Package TFMs | Asset used |
|---|---|---|---|
| net8.0 app | Probe.Net10Only | `net10.0` | none: `error NU1202: Package Probe.Net10Only 1.0.0 is not compatible with net8.0 (.NETCoreApp,Version=v8.0). Package Probe.Net10Only 1.0.0 supports: net10.0 (.NETCoreApp,Version=v10.0)` |
| net8.0 app | Probe.Multi | `net8.0;net10.0` | `lib/net8.0/Probe.Multi.dll` |
| net9.0 app | Probe.Multi | `net8.0;net10.0` | `lib/net8.0/Probe.Multi.dll` (nearest lower) |
| net8.0 app | Probe.Ns | `netstandard2.0;net8.0;net10.0` | `lib/net8.0/Probe.Ns.dll` (ns2.0 not used) |
| net10.0 app | Probe.Ns | same | `lib/net10.0/Probe.Ns.dll` |
| net472 app | Probe.Ns | same | `lib/netstandard2.0/Probe.Ns.dll` plus dependency `Microsoft.Bcl.TimeProvider` |

Running the net8.0 apps printed `net8.0 build`; the net10.0 app `net10.0 build` (the net9.0 app could not run: no .NET 9 runtime in the toolchain, resolution only). NU1202 is the documented symptom: "A dependency package doesn't contain any assets compatible with the project" ([NU1202](https://learn.microsoft.com/en-us/nuget/reference/errors-and-warnings/nu1202)). Consequence for floor bumps: removing a TFM from a package is observable by the consumers whose framework matched it as a restore failure, not a warning.

### 9. 32-bit .NET Framework host on x64 Windows

Fixture `$F/wow64` (staged to `C:\Users\ecom\csharp-wintest\tfm-reach\`, SDK 10.0.102, host OS "Windows 10.0.26200", RID win-x64): `Engine` is `netstandard2.0` + Polyfill; `HostAnyCPU` and `Hostx86` are `net472` consoles (`PlatformTarget` AnyCPU with `Prefer32Bit=false`, and x86) that reference Engine and call `Spawn.Run(child, "a b", "say \"hi\"", "", "back\\slash\\", "$HOME", "*")`, which uses `psi.ArgumentList`; `Child` is a `net472` console with `PlatformTarget x64` that prints its argv. Output of `run.cmd`:

```
===== AnyCPU host
HOST OSArchitecture=X64 ProcessArchitecture=X64 Is64BitOperatingSystem=True Is64BitProcess=True RidByOs=win-x64 RidByProcess=win-x64 Framework='.NET Framework 4.8.9345.0'
CHILD Is64BitProcess=True IntPtr.Size=8 argv=[a b]|[say "hi"]|[]|[back\slash\]|[$HOME]|[*] exit=0
===== x86 host
HOST OSArchitecture=X64 ProcessArchitecture=X86 Is64BitOperatingSystem=True Is64BitProcess=False RidByOs=win-x64 RidByProcess=win-x86 Framework='.NET Framework 4.8.9345.0'
CHILD Is64BitProcess=True IntPtr.Size=8 argv=[a b]|[say "hi"]|[]|[back\slash\]|[$HOME]|[*] exit=0
```

Answers: (a) a 32-bit .NET Framework host on x64 Windows can spawn an x64 child under WOW64 (child ran as `Is64BitProcess=True`, exit 0). (b) Selection keyed on `ProcessArchitecture` yields `win-x86`, which does not exist in the ocx dist; keyed on `OSArchitecture` it yields `win-x64`. (c) `RuntimeInformation.OSArchitecture` exists for netstandard-2.0 and .NET Framework 4.7.1+ ([doc](https://learn.microsoft.com/en-us/dotnet/api/system.runtime.interopservices.runtimeinformation.osarchitecture)); it "is intended to represent the actual architecture of the underlying operating system ... takes into account emulation built into Windows and macOS"; its behaviour for emulated processes changed in .NET 7. (d) A truly 32-bit Windows OS reports `X86`: fail with an explicit unsupported-platform error naming the 8 ocx targets. Not measured: .NET Framework under x64 emulation on Windows-on-Arm64 (OSArchitecture there is untested; a Windows-on-Arm64 CI leg is the only way to know). The polyfilled `ArgumentList` delivered the six hostile arguments intact, including the empty one (contrast: the audit measured that joining the same values with spaces into `Arguments` corrupts argv on net10: `exemplar-cli-wrappers-and-sdks.md:100-101`).

### 10. Decision table: TargetFrameworks per owner answer

| Owner answer | `TargetFrameworks` | Test legs | Notes |
|---|---|---|---|
| A. Modern .NET only (Win/Linux/macOS x x64/arm64), first release before 2026-11-10 or any net8 consumer expected | `net8.0;net10.0` | net8.0, net10.0 on ubuntu, windows, macos (x64 + arm64 where runners exist) | No polyfill, no `#if` except `NET11_0_OR_GREATER` guards; LangVersion 14 on net8 optional (see rule 6). The project-context floor ("`.NET 8 LTS floor`") is this row |
| A'. Same, after 2026-11-10 and no named net8 consumer | `net10.0` | net10.0 | Consumers on net8/9 get NU1202; do at a major version; follow section 12 |
| B. Also .NET Framework 4.7.2+ / Unity / Mono / MSBuild-task hosts | `netstandard2.0;net8.0;net10.0` | A's legs + `net472` on windows-latest (and the x86 host leg of section 9) | Add Polyfill (+ PolySharp if not using Polyfill), `PolyArgumentExceptions`, `Microsoft.Bcl.TimeProvider` on ns2.0 only; no `net462` in a package first shipped after 2026-10 (net462 ends 2027-01-13) |
| C. Framework/Unity need only the data types | `Ocx.Models`: `netstandard2.0`; `Ocx.Engine`: `net8.0;net10.0` | Models: net472 + net8.0; Engine: as A | Two packages; see section 6 |
| D. Legacy-only Framework requirement below 4.7.2 (net461/net462) | do not support | | NuGet itself warns ns2.0 on 4.6.1 has "several issues" and recommends 4.7.2+ ([net-standard](https://learn.microsoft.com/en-us/dotnet/standard/net-standard), footnote 2) |

### 11. When netstandard2.0 is worth carrying (named consumer classes)

Carry it when you can name a consumer class AND give it a CI leg that executes the ns2.0 assembly:
1. MSBuild tasks, Roslyn analyzers and source generators loaded by hosts that run on .NET Framework 4.7.2 (Visual Studio) or on `dotnet msbuild`: analyzer/generator/task assemblies are forced to ns2.0 (or net472) by their host (audit `exemplar-build-and-gates.md:120`; Azure sets `IsSourceGenerator or IsAnalyzer` => `netstandard2.0` only, `eng/Directory.Build.Common.props:233`).
2. Unity projects on the default `.NET Standard 2.1` profile or the `.NET Framework` profile (ns2.0 is consumable by both; a `net8.0`-only package is invisible to both, per the practitioner scout citing the Unity manual). Unity player platforms that disallow process spawn are not verified here.
3. Windows services and desktop apps still on .NET Framework 4.7.2-4.8.1 (4.8/4.8.1 have no end date on the lifecycle page).
Not a consumer class: "maximum compatibility", "might be needed", Windows/Linux/macOS/x64/arm64 coverage (section 1). Each carried ns2.0 target must also pass the rules in section 13 (net472 test leg, no behaviour compiled out).

### 12. Floor-bump procedure for the dotnet-upgrade skill

Trigger: a shipped TFM's end-of-support date has passed (read from the [support policy](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core), never from memory), or a new LTS has shipped (add it; do not remove the old LTS until its end of support, per Azure).
1. Single source: the TFM list lives in one `Directory.Build.props` property (e.g. `<OcxTargetFrameworks>net8.0;net10.0</OcxTargetFrameworks>`); no project sets its own (rule 1). Edit that line only.
2. Remove dead code: `rg -n -e 'NET8_0' -e 'NETSTANDARD2_0' -e 'NET472' --glob '*.cs' src` (or `grep -rnE --include='*.cs' ...`), delete `#if` branches that can no longer be taken; delete `Condition="...netstandard2.0..."` PackageReferences and the polyfill package if ns2.0 left.
3. Update the test matrix (workflow `framework:` lists, the `net472` leg) and the TFM allow-list in the gate script (section 13).
4. Re-pin: `global.json` SDK must be >= the newest TFM's SDK (the .NET 8 SDK cannot build `net10.0`: `NETSDK1045`; cannot compile `LangVersion 14`: `CS1617`).
5. Verify: `dotnet build -c Release -warnaserror` on every remaining TFM, the gate script, and a throwaway consumer for each *removed* TFM expecting `NU1202` (this proves the break is intentional).
6. Release as a major version with the removed TFM in the changelog (NU1202 is a restore failure for those consumers, section 8). Do not combine with a new TFM addition in the same PR when a break is also present.
7. Package validation / API diff between TFMs was not exercised here (Azure and OpenAI check in a per-TFM API listing: audit `exemplar-cli-wrappers-and-sdks.md:237`); wire one before the first multi-TFM release.

### 13. Verified on the toolchain

All commands run through `/home/mherwig/.cache/research-lang/dotnet-tools/run.sh`; `F=/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-build-tfm-reach`.

| # | Claim | Red (fixture, command, observed) | Green twin (observed) |
|---|---|---|---|
| 1 | ns2.0 lacks 9 BCL APIs | `$F/probe-red`: `dotnet build -f netstandard2.0 --no-incremental` -> `10 Error(s)`: CS1501 `Kill`, CS1061 `WaitForExitAsync` / `StandardInputEncoding` / `ArgumentList`, CS0117 `IsWindows` / `SetUnixFileMode` / `ThrowIfNull`, CS0103 `UnixFileMode` / `TimeProvider`, CS0234 `Formats` | `-f net8.0` and `-f net10.0`: `0 Error(s)`; `Build succeeded.` (only CA1416 on P6) |
| 2 | Default LangVersion by TFM | `$F/lang-red`: `#error version` -> `Language version: 7.3` (ns2.0), `12.0` (net8.0), `14.0` (net10.0); `public record` on ns2.0: `error CS0106` | net10.0: `Build succeeded.` |
| 3 | `field` needs C# 14 | net8.0 default 12: `error CS0103: The name 'field' does not exist` | `$F/lang-lv14` net8.0 `LangVersion 14`: `0 Error(s)` |
| 4 | LangVersion 14 on ns2.0 needs compiler types | `$F/poly-none`: `error CS0518 ... IsExternalInit`, `CS0656 ... RequiredMemberAttribute..ctor` | `$F/poly-polysharp`: language errors gone; Index/Range compile; residual API errors only |
| 5 | Polyfill clears API errors | `$F/poly-polysharp`: 12 errors | `$F/poly-polyfill-plus`: 3 errors (`StandardInputEncoding`, `System.Formats`, `GetSubArray`); net8.0/net10.0 `0 Error(s)` |
| 6 | NU1202 on net10-only package | `$F/c-net8-net10only`: `error NU1202: ... not compatible with net8.0 ... supports: net10.0` | `$F/c-net8-multi` (net8.0;net10.0) and `$F/c-net8-ns`: `Build succeeded.`; asset `lib/net8.0/...` |
| 7 | Split: Framework cannot use the engine | `$F/c-net472-engine`: `error NU1202: Package Ocx.Engine 1.0.0 is not compatible with net472 ... supports: net10.0, net8.0` | `$F/c-net472-models`: `Build succeeded.` |
| 8 | SDK 8 cannot do LangVersion 14 / net10 | `$F/sdk8-lv14` (`global.json` 8.0.425): `CSC : error CS1617: Invalid option '14' for /langversion`; net10.0 target: `error NETSDK1045` | SDK 10.0.401 same source: `Build succeeded.` |
| 9 | Compiler refuses runtime-dependent features on net8 | `$F/net8-lv14-red` (`allows ref struct`): `error CS9240: Target runtime doesn't support by-ref-like generics.` | same file, `net10.0`: `Build succeeded.`; `$F/net8-lv14-run` (`field`, `extension`, `?.=`) on net8.0: ran `lazy True 8.0.31` / `ok` |
| 10 | TFM-allow-list + net472-leg gate | `$F/gate-red` (`lib=netstandard2.0;net8.0;net10.0`, `tests=net8.0;net10.0`): `gate.sh` prints `FAIL: netstandard2.0 shipped but tests have no net472 leg`, exit 1 | `$F/gate-green` (`tests=net472;net8.0;net10.0`): `OK`, exit 0 |
| 11 | Polyfill must be private | `$F/leak-red`: `dotnet pack`; nuspec lists `PolySharp` and `Polyfill` dependencies | `$F/leak-green` (`PrivateAssets="all"`): no `<dependency>` lines |
| 12 | `#if NET8_0` is a bug on net10 | `$F/if-red`: `dotnet run -f net10.0` -> `FALLBACK path` (and `modern path` on net8.0); `grep -rnP --include='*.cs' '^\s*#\s*(el)?if\b.*\b(NET[0-9]+_[0-9]+\|NETCOREAPP[0-9]_[0-9])\b' $F/ifgrep-red` matches `P.cs:2:#if NET8_0`, exit 0 | `$F/if-green` (`NET8_0_OR_GREATER`): `modern path` on both; same grep on `ifgrep-green`: no output, exit 1 |
| 13 | Binary selection keyed on OS arch | Windows x86 net472 host (section 9): `RidByProcess=win-x86`; `grep -rnE --include='*.cs' -e 'ProcessArchitecture' -e 'Is64BitProcess' -e 'IntPtr\.Size' $F/arch-red/src` matches, exit 0 | `RidByOs=win-x64`; same grep on `$F/arch-green/src`: no match, exit 1; x64 child spawned, exit 0 |
| 14 | Libraries get no EOL warning | `$F/eol` as `Exe` net7.0: `warning NETSDK1138 ... 'net7.0' is out of support` | `CheckEolTargetFramework=false`: none; as `Library`: none (silent, hence the gate in #10) |
| 15 | Single-source TFM check | `$F/tfm1-red`: `grep -rnE --include='*.csproj' '<TargetFrameworks?>' $F/tfm1-red` matches `src/A/A.csproj`, exit 0 | `$F/tfm1-green`: no match, exit 1 |
| 16 | Trim/AOT props inert on ns2.0 | `$F/aot`: `IsAotCompatible` / `EnableTrimAnalyzer` on netstandard2.0: `Build succeeded.`, no warning (a false assurance) | conditional `IsTargetFrameworkCompatible(..., 'net8.0')` form builds on both |
| 17 | `LangVersion latest` drifts with SDK | `$F/latest-drift/sdk11`: `Language version: latest (15.0)` | `sdk10`: `latest (14.0)` for the same `net10.0` project |

`gate.sh` (at `$F/gate.sh`) reads TFMs with `dotnet msbuild <proj> -getProperty:TargetFrameworks` (works on SDK 10.0.401), rejects TFMs outside `netstandard2.0|net8.0|net10.0`, requires a `net472` test TFM when `netstandard2.0` ships and a test TFM for every other shipped TFM.

## Normative guidance candidates

1. **Declare the TFM list exactly once, in `Directory.Build.props`.** Rationale: a per-project TFM drifts and a floor bump becomes a hunt. Verify: `grep -rnE --include='*.csproj' '<TargetFrameworks?>' src tests` prints nothing (red/green in section 13 #15); the list is read with `dotnet msbuild src/Ocx.Sdk/Ocx.Sdk.csproj -getProperty:TargetFrameworks`.
2. **Do not add `netstandard2.0` for OS or CPU reach; add it only for a named consumer class listed in the README (MSBuild task hosts, Unity, .NET Framework 4.7.2+ apps).** Rationale: it adds runtimes, never OSes (section 1). Verify: reading heuristic: a diff that introduces `netstandard2.0` must also add the consumer class to the README "Supported frameworks" table and a `net472` test TFM (rule 4); `grep -rn 'netstandard2.0' Directory.Build.props README.md` must hit both.
3. **Restrict TFMs to an allow-list: `net8.0`, `net10.0`, and `netstandard2.0` only under rule 2; never `netstandard2.1`, `netstandard1.x`, `net5.0`, `net6.0`, `net7.0`, `net9.0`, `net461`, `net462`.** Rationale: ns2.1 is unsupported by .NET Framework, 6/7 are EOL, 9 ends the same day as 8, 462 ends 2027-01-13; `netstandard1.x` warns NETSDK1215. Verify: `grep -rnE --include='*.csproj' --include='Directory.Build.props' -e 'netstandard2\.1' -e 'netstandard1\.' -e 'net(5|6|7|9)\.0' -e 'net46[12]' .` must print nothing; plus `gate.sh`'s allow-list.
4. **Every shipped TFM has a test leg that executes that assembly; `netstandard2.0` is executed on `net472` on a Windows runner.** Rationale: the ns2.0 assembly is not exercised by a net8 test run; Anthropic's 429 bug and Skeet's "can't test" rule. Verify: `$F/gate.sh <repo>` returns 0 (section 13 #10) or `dotnet msbuild tests/<proj>/<proj>.csproj -getProperty:TargetFrameworks` contains `net472`.
5. **Never `#if` away behaviour on a TFM; use an equivalent that exists everywhere or an internal shim, and test both sides.** Rationale: a guard around a missing API silently disabled retries for every ns2.0 consumer (Anthropic `CLAUDE.md:28`). Verify: `grep -rnE --include='*.cs' '#\s*if\s+!?NETSTANDARD2_0|#\s*if\s+NET[0-9]' src` -> each hit is reviewed for "else branch does the same thing"; named reading heuristic: the two branches must be behaviourally equal.
6. **Write `#if NET8_0_OR_GREATER`/`NET10_0_OR_GREATER`, never `#if NET8_0`; use `NETSTANDARD2_0` only to mean "this is the ns2.0 build".** Rationale: `NET8_0` is false on the net10.0 build and the fallback compiles (section 13 #12). Verify: `grep -rnP --include='*.cs' '^\s*#\s*(el)?if\b.*\b(NET[0-9]+_[0-9]+|NETCOREAPP[0-9]_[0-9])\b' src` prints nothing.
7. **Set `<LangVersion>14</LangVersion>` explicitly, never `latest`, `preview`, `latestMajor` or `default`, and build with SDK >= 10 (`global.json`).** Rationale: `latest` is 14 on SDK 10 and 15 on SDK 11 for the same project; SDK 8 rejects 14 (CS1617). Verify: `grep -rnE --include='*.csproj' --include='*.props' '<LangVersion>(latest|preview|latestMajor|default)<' .` prints nothing; `grep -n '<LangVersion>' Directory.Build.props` shows `14`; `dotnet --version` under the repo's `global.json` >= 10.0.
8. **`LangVersion 14` on `net8.0` is allowed only for compile-only features and must be recorded as a decision.** Rationale: it builds and runs (`field`, `extension`, `?.=`) but Microsoft calls it unsupported; runtime-dependent features are refused (CS9240). Verify: a comment in `Directory.Build.props` naming the decision; `dotnet build -f net8.0 -warnaserror` succeeds; reviewer rejects `allows ref struct`, `static abstract` interface use in net6 code paths and similar runtime-bound features on the ns2.0 leg.
9. **On `netstandard2.0` use Polyfill (and PolySharp only if Polyfill is not used), both `PrivateAssets="all"`, with `<PolyArgumentExceptions>true</PolyArgumentExceptions>` if `ThrowIfNull` is used; keep polyfilled types `internal` (no `PolyPublic` in a library).** Rationale: public polyfills collide with consumers'; non-private references become package dependencies. Verify: `unzip -p artifacts/*.nupkg '*.nuspec' | grep -i -e polyfill -e polysharp` prints nothing; `grep -rn 'PolyPublic' --include='*.csproj' --include='*.props' .` prints nothing.
10. **Condition every compat package on the TFM: `Microsoft.Bcl.TimeProvider`, `Microsoft.Bcl.AsyncInterfaces`, `System.Text.Json`, `System.Memory` carry `Condition="'$(TargetFramework)' == 'netstandard2.0'"` (or the `!IsTargetFrameworkCompatible` form).** Rationale: net8.0/net10.0 need none; System.Text.Json adds 7 packages on ns2.0 vs 2 on net8.0 and 0 on net10.0. Verify: `unzip -p artifacts/*.nupkg '*.nuspec' | grep -A4 'targetFramework="net10.0"'` shows no dependency lines; `grep -rn --include='*.csproj' 'PackageReference' src` lines for those ids have a `Condition`.
11. **Design around the three non-polyfillable gaps on ns2.0: no `ProcessStartInfo.StandardInputEncoding`, no `System.Formats.Tar` (no NuGet package), no range slicing on arrays (`a[1..]`).** Rationale: still errors with Polyfill 11.4.3 (`CS1061`, `CS0234`, `CS0656`). Verify: `dotnet build -f netstandard2.0 -warnaserror` is part of CI; `grep -rnE --include='*.cs' 'StandardInputEncoding|System\.Formats\.Tar' src` hits must sit inside a `#if !NETSTANDARD2_0` with a documented alternative.
12. **Select the ocx binary by `RuntimeInformation.OSArchitecture` (+ OS), never by `ProcessArchitecture`, `Environment.Is64BitProcess` or `IntPtr.Size`; unsupported OS/arch (including 32-bit Windows) throws a typed unsupported-platform error naming the 8 supported targets.** Rationale: a 32-bit host on x64 Windows reports `ProcessArchitecture=X86` yet runs the x64 binary; ocx has no win-x86 (section 9). Verify: `grep -rnE --include='*.cs' -e 'ProcessArchitecture' -e 'Is64BitProcess' -e 'IntPtr\.Size' src` prints nothing; the Windows x86 host leg of section 9 passes.
13. **Condition `IsAotCompatible`, `IsTrimmable`, `EnableTrimAnalyzer` with `IsTargetFrameworkCompatible('$(TargetFramework)', 'net8.0')`.** Rationale: on ns2.0 they are silently inert (a false assurance). Verify: `grep -rn -e IsAotCompatible -e IsTrimmable -e EnableTrimAnalyzer --include='*.csproj' --include='*.props' .` -> every hit has a `Condition=` containing `IsTargetFrameworkCompatible`.
14. **Treat nullable warnings on the ns2.0 leg as real but know its limits: BCL is oblivious there (missed CS8604) and `string.IsNullOrEmpty` flow is not understood (false CS8602); use explicit `is null`/`.Length == 0` patterns, do not blanket-suppress.** Rationale: measured, unaffected by polyfills. Verify: `dotnet build -f netstandard2.0 -warnaserror` is clean; `grep -rn --include='*.cs' '#pragma warning disable CS86' src` prints nothing.
15. **Remove a TFM only at a major version and only after its end-of-support date; follow section 12; keep the previous LTS until its end of support.** Rationale: removal is a restore break (NU1202) for those consumers. Verify: `git diff -U0 -- Directory.Build.props | grep TargetFrameworks` in a PR is paired with a major-version bump (`grep -n '<Version>' Directory.Build.props`) and a changelog line naming the TFM.
16. **Add a repo-owned TFM gate; do not rely on the SDK's EOL warning for libraries.** Rationale: `NETSDK1138` is emitted for executables only (`CheckEolTargetFramework` defaults true only when `OutputType != Library`). Verify: CI runs the section 13 `gate.sh` (or equivalent) and fails on any TFM outside the allow-list; `grep -rn 'NETSDK1138' .github Directory.Build.props` is not used as the control.
17. **Keep `AssemblyName` identical across TFMs and the public API identical across TFMs.** Rationale: Microsoft guidance and Azure MUST. Verify: `grep -rn 'AssemblyName' --include='*.csproj' --include='*.props' . | grep -i condition` prints nothing; per-TFM API listing diff checked in (not exercised here).
18. **Do not publish `net9.0` as a TFM for a library.** Rationale: a net9 consumer resolves the `net8.0` asset (measured) and net9 ends support the same day as net8 (2026-11-10). Verify: covered by rule 3's grep.
19. **When netstandard2.0 ships, add a Windows CI leg where a `net472` host built x86 spawns an x64 `ocx.exe`.** Rationale: proves the WOW64 path and the OSArchitecture selection end to end. Verify: workflow contains a matrix entry with `os: windows-latest` and a step running the x86 host; `grep -n 'windows' .github/workflows/*.yml` returns the leg.
20. **Pin the build SDK in `global.json` to the newest TFM's SDK (>= 10.0.401 now) and use `rollForward: latestPatch`.** Rationale: SDK 8 cannot target net10.0 (NETSDK1045) nor compile C# 14. Verify: `grep -n '"version"' global.json`; `dotnet --version` prints >= 10.0.
21. **Any .NET 11 / C# 15 symbol is guarded and marked RC1-era.** Rationale: GA is 2026-11 (not yet official); `Process.Run*`/`KillOnParentExit` shapes may change. Verify: `grep -rnE --include='*.cs' 'ProcessExitStatus|RunAndCaptureText|KillOnParentExit|StartDetached' src` hits sit inside `#if NET11_0_OR_GREATER`.

## AI-agent angle

| What an LLM characteristically gets wrong | Mechanical catch |
|---|---|
| Chooses `netstandard2.0` (or 2.1) "for maximum compatibility" for a cross-platform CLI wrapper; 2.1 is unsupported on .NET Framework. | Rule 3 grep (`netstandard2\.1`, `netstandard1\.`) and rule 2 README check; `gate.sh` allow-list. |
| Copies .NET Framework / netcoreapp3.1-era advice: `TargetFramework netcoreapp3.1`, `net5.0`, `net6.0`, `net7.0`, `net9.0` as floor. | Rule 3 grep `net(5\|6\|7\|9)\.0`; `Directory.Build.props` single source. |
| Writes `<LangVersion>latest</LangVersion>` (or `preview`) to "enable records/init on netstandard2.0". | Rule 7 grep; the CS8304 probe shows `latest` = 14 or 15 by SDK. |
| "Fixes" CS0518/CS0656 by hand-rolling `public class IsExternalInit` / `RequiredMemberAttribute` in the library (collides with consumers' and with PolySharp). | Rule 9: `grep -rnE --include='*.cs' 'class (IsExternalInit\|RequiredMemberAttribute\|CompilerFeatureRequiredAttribute)' src` prints nothing; nuspec check. |
| Adds `Polyfill`/`PolySharp` without `PrivateAssets="all"`, leaking them as dependencies. | Rule 9 `unzip -p ... '*.nuspec' \| grep -i -e polyfill -e polysharp`. |
| Uses `#if NET8_0` (or `NETCOREAPP3_1`) as "net8 and later". | Rule 6 `grep -rnP`; measured `FALLBACK path` on net10.0. |
| Uses `ArgumentNullException.ThrowIfNull`, `Process.Kill(true)`, `WaitForExitAsync` in shared code and then deletes the ns2.0 TFM when the build fails. | `dotnet build -f netstandard2.0 -warnaserror` in CI; rule 11 grep; the TFM-removal diff check (rule 15). |
| Adds `IsAotCompatible`/`IsTrimmable` globally and believes ns2.0 is analyzed. | Rule 13 grep for `Condition=`. |
| Picks the binary with `RuntimeInformation.ProcessArchitecture` / `Environment.Is64BitProcess` / `IntPtr.Size == 8`, or hardcodes `win-x64` and `x86` fallbacks. | Rule 12 grep; the Windows x86 host leg. |
| Writes `Process.Start` with `Arguments = string.Join(" ", args)` because "ArgumentList isn't on netstandard2.0". | `grep -rnE --include='*.cs' '\.Arguments\s*=' src` prints nothing (audit E4b shows corruption); Polyfill supplies ArgumentList. |
| Assumes System.Formats.Tar is available as a NuGet package for ns2.0. | `NU1101` on restore (`$F/tarpkg`); `grep -rn 'System.Formats.Tar' --include='*.csproj' .`. |
| Assumes the SDK warns about EOL TFMs in libraries (relies on NETSDK1138). | Rule 16: gate script; section 13 #14. |
| Adds `<PackageReference Include="System.Text.Json" ...>` unconditionally on all TFMs. | Rule 10 nuspec check: `net10.0` group must have zero dependencies. |
| Adds a `net9.0` TFM "because STS is current". | Rule 3/18 grep; net9 consumer resolves net8 asset. |
| Forgets that `LangVersion 14` needs SDK 10 and downgrades the SDK in CI to match net8. | Rule 20 `dotnet --version`; `CS1617`/`NETSDK1045`. |

## Contested / evolving

- **netstandard2.0 for new SDKs.** Microsoft's cross-platform guidance (page updated 2026-05-07) leads with "start with net8.0 or later" and only "CONSIDER" ns2.0; the Azure SDK (Microsoft's own, 2026 props) still mandates ns2.0; the vendor API SDKs (anthropic, openai, stripe, Azure.Core) all still ship it; wrappers split 9/13. Trend: new libraries that are CLI/process-centric (SimpleExec, Cake, Aspire, Pulumi.Automation) are modern-only; broad-reach libraries still carry ns2.0 (Humanizer adds `net11.0` while keeping `netstandard2.0`). As of 2026-10-10 no sign that the ns2.0 majority is shrinking in client SDKs.
- **"DO NOT publish for netstandard2.0 if your project or dependencies multi-target"** (Microsoft) versus the same page's example `net8.0;netstandard2.0` and Azure's mandate: the practice is to ship ns2.0 as the fallback alongside modern targets; the sentence is about not relying on ns2.0 alone. Treat as the contradiction it reads as, and follow the example.
- **LangVersion 14 on net8.0.** Microsoft: unsupported. Practice: Polyfill requires a C# 14 compiler; the build above ran. Likely to remain a "compiles, not supported" zone; as net8 leaves support on 2026-11-10 the question fades for the floor, but the same question reappears for net10.0 with C# 15 in 2027.
- **net8 floor timing.** .NET 8 and 9 both end 2026-11-10; Azure keeps the previous LTS until end of support, Polly/Serilog carry older TFMs far longer. Expect libraries to drop net8.0 within months of the date; no hard industry rule for "when after EOS".
- **.NET Framework floor.** Microsoft suggests adding `net462`; NuGet itself recommends 4.7.2+ for ns2.0; net462 ends 2027-01-13, Azure notes the same. Trend: floor moving to net472 or net48 (Skeet moved net45 -> net48; Anthropic tests net472).
- **BCL replacing wrappers (.NET 11 RC1).** `Process.RunAndCaptureText`, `Signal`, `ProcessExitStatus`, `KillOnParentExit` (audit `exemplar-cli-wrappers-and-sdks.md:121`) and Polyfill already ships them as polyfills (api_list `Process` section). RC1 shapes may change before GA (Nov 2026); GA date is "not an official release date" per the support-policy page.
- **Unity.** Default profile ns2.1, ns2.0 consumable; whether a process-spawning SDK is usable under IL2CPP/mobile/console player targets was not verified; treat Unity as editor/standalone Mono only until a consumer states otherwise.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/cross-platform-targeting | Microsoft library guidance: TFM DO/CONSIDER/AVOID list | updated 2026-05-07 | The authoritative "start at net8, consider ns2.0" text and multi-targeting rules |
| https://learn.microsoft.com/en-us/dotnet/standard/net-standard | .NET Standard overview, support table, "when to target netx.0 vs netstandard" | updated 2026-08-04 | Who implements ns2.0 / ns2.1 (Framework, Mono, Unity); the 4.7.2 recommendation |
| https://learn.microsoft.com/en-us/dotnet/standard/frameworks | TFM list and preprocessor symbol table | updated 2026-04-17 | Exact `NET8_0_OR_GREATER`, `NETSTANDARD2_0` symbols; `net10.0` implements ns2.1 |
| https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core | .NET and .NET Core support policy | retrieved 2026-10-10 | EOS dates: 8 and 9 on 2026-11-10, 10 on 2028-11-14, STS 24 months |
| https://github.com/dotnet/core/blob/main/release-notes/8.0/supported-os.md | .NET 8 supported OS matrix | Last Updated 2026/09/28 | Per-target reach: macOS, Windows (Arm64/x64/x86), Alpine/musl |
| https://github.com/dotnet/core/blob/main/release-notes/10.0/supported-os.md | .NET 10 supported OS matrix | Last Updated 2026/09/28 | Same, current LTS; emulator and QEMU notes |
| https://github.com/dotnet/core/blob/main/release-notes/11.0/supported-os.md | .NET 11 (Go Live) supported OS matrix | Last Updated 2026/09/28 | RC1-era flag; Alpine 3.24/3.23 only |
| https://github.com/Azure/azure-sdk/blob/main/docs/dotnet/introduction.md | Azure SDK .NET design guidelines (target framework section) | retrieved 2026-10-10 | MUST ns2.0, SHOULD current LTS, retirement rule, polyfill-only-for-legacy |
| https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/configure-language-version | Configure C# language version | updated 2026-01-20 | "newer than the TFM's version isn't supported"; do not use `latest`; CS8304 probe |
| https://github.com/Sergio0694/PolySharp | PolySharp README | retrieved 2026-10-10 | Source-only compiler-type polyfills and their limits |
| https://github.com/SimonCropp/Polyfill | Polyfill README, `api_list.include.md`, `consuming.md`, `target-frameworks.md` | retrieved 2026-10-10 (API count 1182, v11.4.3) | Exact polyfilled APIs, `PolyArgumentExceptions`, visibility, TFM guidance |
| https://learn.microsoft.com/en-us/nuget/reference/errors-and-warnings/nu1202 | NuGet NU1202 | page updated 2024-08-13 | The restore failure when a package has no compatible asset |
| https://learn.microsoft.com/en-us/lifecycle/products/microsoft-net-framework | .NET Framework lifecycle | retrieved 2026-10-10 | 4.6.2 ends 2027-01-13; 4.7-4.8.1 open |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/9.0/netstandard-warning | .NET 9 SDK breaking change: NETSDK1215 for netstandard1.x | 2024-07 | The SDK's own push toward ns2.0 / net6+ |
| https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/dependencies | Library guidance: dependencies | updated 2025-12-04 | Minimum versions, no upper bounds, fewer dependencies |
| https://learn.microsoft.com/en-us/dotnet/core/deploying/trimming/prepare-libraries-for-trimming | Prepare libraries for trimming | updated 2026-01-08 | `IsTargetFrameworkCompatible` gate for `IsTrimmable`; trimming needs net6+ |
| https://learn.microsoft.com/en-us/visualstudio/msbuild/property-functions | MSBuild property functions | updated 2026-10-08 | `IsTargetFrameworkCompatible`, `GetTargetFrameworkIdentifier` semantics and the sample outputs |
| https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.processstartinfo.argumentlist | ProcessStartInfo.ArgumentList API | updated 2026-08-13 | First available in .NET Core 2.1 / netstandard 2.1; escaping semantics |
| https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process.waitforexitasync | Process.WaitForExitAsync API | updated 2026-09-09 | First available in .NET 5 |
| https://learn.microsoft.com/en-us/dotnet/api/system.runtime.interopservices.runtimeinformation.osarchitecture | RuntimeInformation.OSArchitecture API | updated 2026-05-27 | Actual-OS architecture, emulation handling, applies to ns2.0 and Framework 4.7.1+ |
| https://codeblog.jonskeet.uk/2026/07/11/forking-an-open-source-project/ | Skeet on TFMs when forking | 2026-07-11 | "bait" ns2.0 target; "can't test" rule |
| https://devblogs.microsoft.com/dotnet/the-future-of-net-standard/ | .NET team on the future of .NET Standard | 2020-09-15 (era-specific) | Origin of "multi-target ns2.0 + net5.0" |
| http://docs.unity3d.com/6000.0/Documentation/Manual/dotnet-profile-support.html | Unity 6 .NET profile support | fetched 2026-10-10 | Default profile .NET Standard 2.1; Framework profile = 4.8 + additions |
| https://api.nuget.org/v3-flatcontainer/system.text.json/10.0.12/system.text.json.nuspec | System.Text.Json 10.0.12 nuspec | 10.0.12 | Per-TFM dependency groups (7 on ns2.0, 2 on net8, 0 on net10) |
| https://api.nuget.org/v3-flatcontainer/microsoft.bcl.timeprovider/10.0.12/microsoft.bcl.timeprovider.nuspec | Microsoft.Bcl.TimeProvider 10.0.12 nuspec | 10.0.12 | In-box on net8; package only for ns2.0 / net462 |
| `/home/mherwig/.cache/research-lang/dotnet-tools/dotnet/sdk/10.0.401/Sdks/Microsoft.NET.Sdk/targets/Microsoft.NET.EolTargetFrameworks.targets` | Real SDK source: EOL TFM check | SDK 10.0.401 | Shows the hard-coded EOL list and the Exe-only default |
| `anthropics__anthropic-sdk-csharp@ae16e5933f39:CLAUDE.md:20,28,29` | Anthropic C# SDK multi-targeting contract | 2026 | net472 leg exercises ns2.0; "no behaviour compiled out"; internal polyfills |
| `Azure__azure-sdk-for-net@32c48fc3d524:eng/Directory.Build.Common.props:194-233` | Azure monorepo TFM policy in props | 2026 | Executable form of the LTS+net8+ns2.0 rule; net462 EOL comment |
| `Tyrrrz__CliWrap@7dbc252fa773:CliWrap/CliWrap.csproj:3,28-45` | CLI-wrapper analogue: TFMs and per-TFM packages | 2026 | The cost of ns2.0 in a process wrapper |
| `adamralph__simple-exec@f80913246993:Directory.Build.props:13`; `pulumi__pulumi-dotnet@2a0dca84f09b:sdk/Pulumi.Automation/Pulumi.Automation.csproj:4` | Modern-only subprocess wrappers | 2026 | The counter-examples to ns2.0 |
| `/home/mherwig/dev/grimoire-lore/.agents/worktrees/csharp/.agents/research/csharp-audit/{ocx-cli-contract.md,exemplar-build-and-gates.md,exemplar-cli-wrappers-and-sdks.md,exemplar-language-shape.md}` | Prior audit: ocx RIDs, TFM table, API probes, #if counts | 2026-10-10 | The 26/34, 9/13 numbers and the 8-target mapping |
| `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-build-tfm-reach/` | This artifact's fixtures (all red/green runs) | 2026-10-10 | Re-run any claim with the exact commands in section 13 |
