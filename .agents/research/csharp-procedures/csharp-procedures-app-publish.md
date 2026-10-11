---
title: "Application publish modes for .NET 10: framework-dependent, self-contained, single-file, R2R, trim, Native AOT, container, file-based, and SIGTERM"
topic: csharp-procedures-app-publish (PK-10, PR-15, BD-15) - input to the dotnet-release app path
agent: deep-dive researcher (wave 2, group "Skill corpora: dotnet-diagnose, dotnet-upgrade, dotnet-release app path")
model: claude-sonnet-5-5
date_researched: 2026-10-11
sources_count: 31
scope: |
  Covers: when an application (not a library) ships in which publish mode, the exact MSBuild property set per mode, the trap list
  (NETSDK1179/1201, IL3000, IL2026/IL3050, InvariantGlobalization, native assets, ICU, glibc/musl), SDK container publish without a Dockerfile,
  `dotnet publish app.cs`, SIGTERM in containers on .NET 10, release checksums and build-provenance attestation, and a verification step per mode.
  Every mode was published and RUN on linux-x64 (SDK 10.0.401); win-x64 on the Windows host (SDK 10.0.102); SDK 11.0 RC1 spot-checked.
  Not covered: library NuGet release (csharp-packaging), osx and arm64 execution (built only, never run - recorded as unverified), Alpine/musl Native AOT
  (no musl toolchain on this host), Kubernetes grace periods, signing/notarization of binaries, MSIX/installers, ASP.NET-specific publish, `dotnet tool` packaging.
---

# Application publish modes for .NET 10

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Mode decision table](#1-mode-decision-table)
   2. [SelfContained, RuntimeIdentifier and the NETSDK1179 ghost](#2-selfcontained-runtimeidentifier-and-the-netsdk1179-ghost)
   3. [Single-file](#3-single-file)
   4. [Trimming](#4-trimming)
   5. [ReadyToRun](#5-readytorun)
   6. [Native AOT](#6-native-aot)
   7. [InvariantGlobalization and ICU](#7-invariantglobalization-and-icu)
   8. [Size and startup, measured](#8-size-and-startup-measured)
   9. [Native package assets under RID-specific publish](#9-native-package-assets-under-rid-specific-publish)
   10. [Container publish without a Dockerfile](#10-container-publish-without-a-dockerfile)
   11. [SIGTERM in containers after .NET 10](#11-sigterm-in-containers-after-net-10)
   12. [File-based apps](#12-file-based-apps)
   13. [Release checksums and build provenance](#13-release-checksums-and-build-provenance)
   14. [Exemplar evidence](#14-exemplar-evidence)
   15. [Verified on the toolchain](#15-verified-on-the-toolchain)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- Pick the mode from three inputs: does the host guarantee a .NET runtime, does the code survive trimming (zero IL2xxx/IL3xxx warnings), and is there one native build runner per target OS and arch. Table in finding 1.
- Native AOT is the only mode that is small and fast at once: 2.2 MB and 15 ms (4 ms with invariant globalization) for a hello-world, against 74 MB and 67 ms for self-contained single-file. It needs zero trim/AOT warnings, a native linker per OS (no cross-OS), and a runner per RID.
- Always write `--self-contained true|false` next to `-r` in scripts and CI. On SDK 8.0.425 and 10.0.401, `-r` alone is silently framework-dependent. NETSDK1179 did not fire on either SDK. TFMs below net8 get NETSDK1201 instead.
- `PublishSingleFile`, `PublishTrimmed` and `PublishAot` imply self-contained during `dotnet publish` only. `PublishReadyToRun` does not (TFM 8+). `msbuild -t:Publish` implies nothing: the same properties gave 116 KB, not 74 MB.
- Set the publish properties in the csproj, not on the command line, so the single-file, trim and AOT analyzers run during `dotnet build`. Make the IL warnings errors: IL3000 is only a warning by default and the app then crashes at run time.
- `Assembly.Location` is `""` in a bundle. `Path.GetDirectoryName("")` returns null and the next `Path.Combine` throws (exit 134). Use `AppContext.BaseDirectory`. Gate with `dotnet_diagnostic.IL3000.severity = error` (verified red then green, Linux and Windows).
- `PublishTrimmed` without `PublishReadyToRun` strips the framework's precompiled code: median startup went from 64 ms to 162 ms. Trim plus R2R plus invariant gave 41 ms at 19 MB. Never ship trimmed-only.
- Reflection-based System.Text.Json compiles and runs framework-dependent, and fails at run time after trim or AOT (`JsonSerializerIsReflectionDisabled`, exit 134). The publish itself exits 0 unless warnings are errors. Source generation fixes it (CS-JSON).
- `IncludeNativeLibrariesForSelfExtract` matters only for third-party native assets. The runtime itself is statically linked into the single-file host on .NET 6+ (hello app 73,607,592 bytes with or without the flag). A bundle without it and without the sidecar `.so` fails with DllNotFoundException.
- `InvariantGlobalization=true` is a behavior change, not a size flag: non-invariant cultures throw CultureNotFoundException by default, culture-sensitive compare becomes ordinal, formatting silently turns invariant when `PredefinedCulturesOnly=false`. A non-invariant app in a no-ICU image fails fast (exit 139).
- `dotnet publish -t:PublishContainer` needs no Dockerfile and, on SDK 10.0.401, no `EnableSdkContainerSupport` for a console app. The image runs as uid 1654 (`app`) by default; the repository name is lowercased; the tag defaults to `latest`.
- Base-image inference on SDK 10.0.401: FDD gets `runtime:10.0` (300 MB), AOT with ICU gets `runtime-deps:10.0-noble-chiseled-extra` (87.6 MB), AOT with `InvariantGlobalization=true` gets `runtime-deps:10.0-noble-chiseled` (30.7 MB), `-r linux-musl-x64` gets `runtime:10.0-alpine` (137 MB). The `-aot` family tag no longer exists for 10.0 (CONTAINER1015).
- On .NET 10, a console app with no SIGTERM handler dies on `docker stop` with exit 143 and never raises `ProcessExit`. The same code on net8 raised `ProcessExit` and also exited 143. Use Generic Host or `PosixSignalRegistration`.
- Generic Host's `ShutdownTimeout` defaults to 30 s and `docker stop` waits 10 s, so a slow `StopAsync` is SIGKILLed (exit 137, measured 10.5 s). Set `HostOptions.ShutdownTimeout` below the grace period (6 s gave exit 0 in 6.35 s, abandoning the work).
- `dotnet publish app.cs` produces a Native AOT executable by default (1.27 MB on SDK 10.0.401, 1.35 MB on 11.0 RC1), and `dotnet run app.cs` already runs with `IsDynamicCodeSupported == false`. Reflection JSON in a file-based app fails even under `dotnet run`. `#:property PublishAot=false` is the opt-out.
- Native AOT cannot cross OS: `Cross-OS native compilation is not supported.` R2R can (linux-arm64 and osx-arm64 builds from linux-x64 produced the right ELF and Mach-O; neither was run). win-x64 AOT worked on the Windows host.
- Release assets get a `SHA256SUMS` file checked with `sha256sum -c --strict` (tampered and missing files both exit 1) and a provenance attestation from `actions/attest@v4` (v4.2.2, 2026-08-04; `attest-build-provenance` is now only a wrapper), in the tag-triggered job only.

## Findings

### 1. Mode decision table

The app is not a library: nothing here applies to the NuGet-shipped SDK (csharp-packaging). Decide top to bottom, first row that fits.

| Situation | Mode | Why | Run-the-artifact check |
|---|---|---|---|
| Repo script, CI helper, one-off tool, runs where the SDK is installed | File-based app (`dotnet run --file x.cs`), `#:property PublishAot=false` if it uses reflection or dynamic code | No csproj; SDK present anyway. Default is AOT (finding 12) | `dotnet run --file x.cs -- --version` exit 0 |
| Installed through `dotnet tool` or run where a runtime is guaranteed (dev machines, CI with `setup-dotnet`) | Framework-dependent (`-r <rid> --self-contained false`, optionally `PublishReadyToRun=true`) | 116 KB, smallest, security patches come from the host runtime [(deploying)](https://learn.microsoft.com/en-us/dotnet/core/deploying/) | `dotnet <app>.dll --version` and the apphost `./app --version` |
| Server in a container on a Microsoft base image, any dependency graph | Container, framework-dependent (`runtime:10.0`) | Works with reflection, ICU, anything; 300 MB image | `docker run` + `docker stop` probe (finding 11) |
| Server or CLI in a container, code is AOT-clean | Container + Native AOT, `InvariantGlobalization=true` -> `runtime-deps:10.0-noble-chiseled` | 30.7 MB image, no shell, no runtime | `docker run`, check `Config.User` |
| Standalone download for end users with no runtime, code is AOT-clean, a native runner exists per RID | Native AOT per RID | 2.2 MB, 15 ms | run the binary from an empty dir |
| Standalone download, not AOT-clean (reflection, plugins, dynamic loading) | Self-contained single-file + R2R, not trimmed: `PublishSingleFile` + `PublishReadyToRun` + `SelfContained` | 84 MB, 64 ms, no warnings to fix | copy only the exe to an empty dir and run it |
| Standalone download, size matters, trim-clean but not AOT-clean | Self-contained single-file + trim + R2R | 19 MB, 41 ms (invariant) / 62 ms | same, and run every code path that reflects |
| Needs `Assembly.LoadFile`, `System.Reflection.Emit`, built-in COM, C++/CLI | Never AOT or trim | Listed limitations [(native-aot)](https://learn.microsoft.com/en-us/dotnet/core/deploying/native-aot/) | n/a |

OS and arch are never free choices: single-file and AOT output is "always OS and architecture specific" [(single-file)](https://learn.microsoft.com/en-us/dotnet/core/deploying/single-file/overview), so a release is a matrix of RIDs, each built on a runner that can link it (finding 6).

### 2. SelfContained, RuntimeIdentifier and the NETSDK1179 ghost

- Since .NET 8 Preview 5, a `RuntimeIdentifier` no longer implies `SelfContained` for TFM 8+; `PublishSingleFile`, `PublishAot` and `PublishTrimmed` do imply it during `dotnet publish` only (not build, not restore); `PublishReadyToRun` no longer implies it [(breaking change)](https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/8.0/runtimespecific-app-default). The SDK targets agree: `<PublishSelfContained>true` is set only when `PublishTrimmed`, `PublishSingleFile` or `PublishAot` is true (`Microsoft.NET.RuntimeIdentifierInference.targets:66-77`, SDK 10.0.401).
- The brief's NETSDK1179 ("One of '--self-contained' or '--no-self-contained' options are required when '--runtime' is used") was the .NET 6/7-era warning. I could not reproduce it on SDK 8.0.425 or 10.0.401. What fires instead, for a TFM below net8 only, is NETSDK1201 (`Microsoft.NET.RuntimeIdentifierInference.targets:299-302`). For net8+ the result is silent: `-r linux-x64` gives a 4-file framework-dependent publish with `"framework": Microsoft.NETCore.App` in `runtimeconfig.json`. The code still exists in the resources, so treat NETSDK1179 as historical and `RuntimeIdentifierWillNoLongerImplySelfContained` as the live mechanism.
- Two docs still say the old thing: the single-file page says `RuntimeIdentifier` "Also sets `<SelfContained>true</SelfContained>` by default" and the `dotnet publish` page says "If you use this option, use `--self-contained` or `--no-self-contained` also". Both are stale for net8+; the behavior is the breaking-change page's. Even an SDK comment at `Microsoft.NET.RuntimeIdentifierInference.targets:211` says R2R implies self-contained, which the same file's code and the measured `11-fdd-r2r` publish (136 KB, framework-dependent) contradict.
- `dotnet publish --self-contained` with no `-r` works: the SDK infers the current RID (`UseCurrentRuntimeIdentifier`, same file, lines 100-118). `msbuild -t:Publish` skips that inference: "If you publish using `msbuild /t:Publish` and you want your app to be self-contained, you must explicitly specify `SelfContained`" (breaking-change page). Measured: same properties, 116,197 bytes vs 73,626,120 bytes (`verify-misc.log` M2).

Incorrect and correct:

```bash
# incorrect: self-containedness depends on SDK/TFM history; msbuild -t:Publish ignores the implication
dotnet publish -c Release -r linux-x64 -p:PublishSingleFile=true
msbuild app.csproj -t:Publish -p:RuntimeIdentifier=linux-x64 -p:PublishSingleFile=true
# correct: say it, always
dotnet publish -c Release -r linux-x64 --self-contained true  -p:PublishSingleFile=true
dotnet publish -c Release -r linux-x64 --self-contained false
```

### 3. Single-file

Property set (csproj; the CLI flag form gives no build-time analyzer):

```xml
<PropertyGroup>
  <OutputType>Exe</OutputType>
  <TargetFramework>net10.0</TargetFramework>
  <PublishSingleFile>true</PublishSingleFile>      <!-- also enables the single-file analyzer in dotnet build -->
  <SelfContained>true</SelfContained>
  <RuntimeIdentifier>linux-x64</RuntimeIdentifier> <!-- or pass -r per matrix leg -->
  <!-- only when a PackageReference ships native libraries: -->
  <IncludeNativeLibrariesForSelfExtract>true</IncludeNativeLibrariesForSelfExtract>
</PropertyGroup>
```

- "`PublishSingleFile`. Enables single file publishing. Also enables single file warnings during `dotnet build`." [(single-file)](https://learn.microsoft.com/en-us/dotnet/core/deploying/single-file/overview). Framework-dependent single-file is allowed (`-r linux-x64 --self-contained false -p:PublishSingleFile=true`: 116,197 bytes, runs only where the runtime is found).
- API table from the same page: `Assembly.Location` returns `""`; `Assembly.CodeBase` and `EscapedCodeBase` throw PlatformNotSupportedException; `Assembly.GetFile(s)` throws IOException; `AssemblyName.CodeBase` returns null; `Module.FullyQualifiedName` returns `<Unknown>` or throws. Fixes: "To access files next to the executable, use AppContext.BaseDirectory", and `Environment.ProcessPath` for the exe name. IL3000 text: "calling the `Assembly.Location` property ... always returns an empty string" [(IL3000)](https://learn.microsoft.com/en-us/dotnet/core/deploying/single-file/warnings/il3000).
- IL3000 is a warning, not an error. Verified red: publish exit 0 with `warning IL3000`, then `ArgumentNullException (path1)` at `Path.Combine`, exit 134. With `dotnet_diagnostic.IL3000.severity = error` in `.editorconfig` (or `-p:TreatWarningsAsErrors=true`) the publish exits 1 (`verify-misc.log` M1, `verify-location.log`).
- `IncludeNativeLibrariesForSelfExtract`: the doc says "the native binaries of the core runtime itself are separate files". That is stale for .NET 6+: the hello app is 73,607,592 bytes with and without the flag, one file plus a pdb (`out/14-sc-single-noinclude`). The flag matters for third-party native assets: Microsoft.Data.Sqlite published single-file without it leaves `libe_sqlite3.so` beside the exe; the exe copied alone dies with `DllNotFoundException: Unable to load shared library 'e_sqlite3'` (exit 134); with the flag the exe runs alone and extracts `libe_sqlite3.so` under `DOTNET_BUNDLE_EXTRACT_BASE_DIR` (`verify-native.log`).
- Extraction directory rules: `DOTNET_BUNDLE_EXTRACT_BASE_DIR` if set, else `$HOME/.net` (Linux, macOS) or `%TEMP%/.net` (Windows); "Don't use /tmp or /var/tmp"; under systemd `$HOME` may be undefined, so set it (`%h/.net`) [(single-file)](https://learn.microsoft.com/en-us/dotnet/core/deploying/single-file/overview).
- `EnableCompressionInSingleFile=true` measured 39,257,250 bytes vs 73,626,120, at 125.8 ms vs 67.5 ms median startup. The doc says to measure both [(single-file)](https://learn.microsoft.com/en-us/dotnet/core/deploying/single-file/overview). Not a default.
- `IncludeAllContentForSelfExtract` is "not recommended: it's a .NET Core 3.1 compatibility mode and might be removed" (same page).

### 4. Trimming

- `PublishTrimmed=true` "turns off trim-incompatible features and enables trim analysis during build"; place it in the project file so `dotnet build` analyzes too [(trimming-options)](https://learn.microsoft.com/en-us/dotnet/core/deploying/trimming/trimming-options). It implies self-contained during publish (finding 2). For TFM 8+ the SDK leaves `TrimMode` at the ILLink default; it forces `partial` only for TFM below 8 (`Microsoft.NET.Sdk.Publish.targets:102-106`).
- "An app that uses trimming shouldn't produce any trim warnings." [(fixing-warnings)](https://learn.microsoft.com/en-us/dotnet/core/deploying/trimming/fixing-warnings). Fix order: eliminate reflection, then `DynamicallyAccessedMembers`, then `RequiresUnreferencedCode`, then `UnconditionalSuppressMessage` ("Do not use `SuppressMessage` or `#pragma warning disable` for trim warnings"). Trim warnings are IL2xxx; `TrimmerSingleWarn=false` expands the single per-package warning into every site (xunit sets it for AOT projects, `xunit__xunit@0c7aa4991fa3:src/Directory.Build.props:82`). `ILLinkTreatWarningsAsErrors=false` exists to keep compiler TWAE from also failing ILLink.
- Trim without R2R is a startup regression on the self-contained path. Measured (idle host, 41 runs, `measure.log`): sc-single 67.5 ms, sc-single-trim 161.6 ms, sc-single-trim-r2r (ICU) 62.5 ms, sc-single-trim-r2r-invariant 41.1 ms. The framework's own R2R images are re-linked away by ILLink; `PublishReadyToRun` recompiles the trimmed set.
- Trimming turns off `JsonSerializer` reflection (finding 15, JSON fixtures). The runtime-side feature switches (`UseSystemResourceKeys`, `EventSourceSupport`, `InvariantGlobalization`, `UseSizeOptimizedLinq` default true under AOT on .NET 10) are in the options table of the same page; none is a default recommendation here except `InvariantGlobalization` after finding 7.

### 5. ReadyToRun

- `PublishReadyToRun=true` needs a RID; binaries get "two to three times larger"; the benefit is startup (and first-use latency); small apps gain little because the framework is already R2R [(ready-to-run)](https://learn.microsoft.com/en-us/dotnet/core/deploying/ready-to-run). Measured framework-dependent: 136,470 bytes, 56.0 ms vs 66.2 ms plain FDD. Self-contained: 83.9 MB, 64.0 ms, no change from plain SC (the SDK framework is already R2R).
- Cross-compilation: Linux x64 can target Linux (x64, arm32, arm64) and macOS (x64, arm64); Windows x64 can target all of Windows, Linux, macOS [(ready-to-run)](https://learn.microsoft.com/en-us/dotnet/core/deploying/ready-to-run). Verified from linux-x64: `-r linux-arm64` produced `ELF 64-bit LSB pie executable, ARM aarch64`; `-r osx-arm64` produced `Mach-O 64-bit arm64 executable` (`verify-cross.log`). Neither was executed (no arm64 or macOS host): unverified at run time.
- `PublishReadyToRunComposite` is "only recommended for applications that disable Tiered Compilation or applications running on Linux seeking best startup with self-contained deployment". Not a default; not measured.
- Recommended for publish profiles rather than CLI (`dotnet publish` doc: "We recommend that you specify `PublishReadyToRun` in a publish profile").

### 6. Native AOT

Property set:

```xml
<PropertyGroup>
  <PublishAot>true</PublishAot>                           <!-- in the csproj: also turns on the AOT/trim analyzers in build -->
  <InvariantGlobalization>true</InvariantGlobalization>   <!-- only after finding 7 -->
  <OptimizationPreference>Size</OptimizationPreference>   <!-- optional; Speed is the other value -->
  <StripSymbols>true</StripSymbols>                       <!-- default on Unix: debug info goes to a separate .dbg -->
</PropertyGroup>
```

- "It's preferable to put this setting in the project file rather than passing it on the command line, since it controls behaviors outside publish." [(native-aot)](https://learn.microsoft.com/en-us/dotnet/core/deploying/native-aot/). Verified: `dotnet build` with `PublishAot` in the csproj reports `IL2026` and `IL3050` for the reflection JSON call before any publish.
- Prerequisites: Windows needs Visual Studio's "Desktop development with C++" workload; Ubuntu `clang zlib1g-dev`; Alpine `clang build-base zlib-dev`; Fedora `clang zlib-devel ...`; macOS the Xcode command line tools [(native-aot)](https://learn.microsoft.com/en-us/dotnet/core/deploying/native-aot/). Observed on this host: no clang; a one-line `clang -> gcc` shim plus `libz.so` on `LIBRARY_PATH` linked fine (fixture `shim/`). So the link line is gcc-compatible on glibc Linux; real clang is not exercised. On the Windows host, `link.exe` is not on PATH and `vswhere` is not in PATH, yet win-x64 AOT published (`Generating native code`, `Modes.exe` 2,134,528 bytes) and ran, because Visual Studio 2019 and 2022 are installed under Program Files: the ILCompiler targets find the toolchain themselves.
- A Linux AOT binary "is only going to work on same or newer Linux version" [(native-aot)](https://learn.microsoft.com/en-us/dotnet/core/deploying/native-aot/). Verified consequence: the glibc `linux-x64` AOT binary, mounted into `alpine:3.20`, fails `exec ... no such file or directory` (exit 255). Alpine needs `-r linux-musl-x64` built on a musl toolchain (CS-BIN: musl is the Linux default for the SDK's downloaded binary, a separate decision). Unverified here: no musl toolchain.
- No cross-OS: "Native AOT does not support cross-OS compilation"; cross-architecture works "as long as the necessary native toolchain is installed" [(cross-compile)](https://learn.microsoft.com/en-us/dotnet/core/deploying/native-aot/cross-compile). Verified: `-r win-x64 -p:PublishAot=true` from linux-x64 fails with `error : Cross-OS native compilation is not supported.` (`Microsoft.NETCore.Native.Publish.targets(63,5)`); `-r linux-arm64` fails at link (`--target=aarch64-linux-gnu` unrecognized by the gcc shim; needs a cross toolchain: cross-linker, target objcopy/strip, target C runtime and zlib objects). `-r osx-arm64` reached the linker with Linux gcc and failed on `-framework`: not evidence either way for a real cross clang. osx and arm64 AOT: unverified.
- Limits: no `Assembly.LoadFile`, no `System.Reflection.Emit`, no C++/CLI, no built-in COM; "Requires trimming"; "implies compilation into a single file"; `System.Linq.Expressions` is interpreted; struct generic instantiations are all pregenerated (size) [(native-aot)](https://learn.microsoft.com/en-us/dotnet/core/deploying/native-aot/). `IsAotCompatible` is the library switch; an app sets `PublishAot`. `IsAotCompatible` also sets `IsTrimmable`, `EnableTrimAnalyzer`, `EnableSingleFileAnalyzer`, `EnableAotAnalyzer` (same page); spectre.console sets it on libraries (`spectreconsole__spectre.console@0de183140529:src/Spectre.Console/Spectre.Console.csproj:7`), xunit sets both on `.aot` projects (finding 14).
- IL3050: "calling members annotated with `RequiresDynamicCodeAttribute` might result in exceptions at runtime" [(IL3050)](https://learn.microsoft.com/en-us/dotnet/core/deploying/native-aot/warnings/il3050). Publish still exits 0 with IL2026 + IL3050 unless warnings are errors (red-aot: exit 0 then exit 134; red-aot-twae: exit 1).
- AOT runtime facts: `RuntimeFeature.IsDynamicCodeSupported == false` (the modes app printed `"dynamicCode":false`); native debug info goes to `.dbg` (4.7 MB beside the 2.2 MB exe) and the container image excludes it.
- .NET 11 RC1 note: `StackTraceLineNumberSupport` (AOT only) is new in .NET 11 [(trimming-options)](https://learn.microsoft.com/en-us/dotnet/core/deploying/trimming/trimming-options). SDK 11.0 RC1 AOT publish of the same app worked (`out/sdk11-aot`, `"dynamicCode":false`).

### 7. InvariantGlobalization and ICU

- Knobs: MSBuild `InvariantGlobalization`, runtimeconfig `System.Globalization.Invariant`, env `DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1`; `PredefinedCulturesOnly` (default true under invariant) controls whether other cultures can be created [(globalization config)](https://learn.microsoft.com/en-us/dotnet/core/runtime-config/globalization).
- Measured consequences on net10 (`inv/`, ICU run first, invariant second): `CultureInfo.CurrentCulture.Name` becomes `""`; `string.Compare("a","B", CurrentCulture)` goes from -1 to 31 (ordinal); `"ä"` vs `"b"` from -1 to 130; `CultureInfo.GetCultureInfo("de-DE")` throws `CultureNotFoundException: Only the invariant culture is supported in globalization-invariant mode`; with `PredefinedCulturesOnly=false` it succeeds but `1234.5.ToString("N1", de-DE)` prints `1,234.5` not `1.234,5` and `double.Parse("1,5", de-DE)` fails. `"é".ToUpper()` still gives `É` on .NET 10; the design doc still says casing is ASCII-only, which is stale ([design doc](https://github.com/dotnet/runtime/blob/main/docs/design/features/globalization-invariant-mode.md)). Turkish `i` casing: `new CultureInfo("tr-TR")` throws (the `modes` app printed `CultureNotFoundException`).
- This is exactly what the CS-XP culture rules (CA1304/1305/1307/1309/1310/1311, MA0076) protect: code that always passes `CultureInfo.InvariantCulture` or `StringComparison.Ordinal` is unaffected, code that relies on the current culture changes behavior silently. Enabling invariant mode on an app that uses `CurrentCulture` for user-facing text is a product decision, not a build flag.
- The failure in the other direction: a non-invariant self-contained or AOT app in a minimal image without ICU dies at startup. Verified: the ICU-mode AOT binary in `debian:13-slim` prints "Couldn't find a valid ICU package installed on the system" and exits 139; `-e DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1` makes it run (exit 0) (`verify-misc.log` M3). The Microsoft size-optimized images (Alpine, chiseled) "don't include globalization dependencies such as ICU or tzdata. These images only work with apps that are configured for globalization invariant mode" [(container-images)](https://learn.microsoft.com/en-us/dotnet/core/docker/container-images); the SDK picks the `-extra` variant when `InvariantGlobalization` is not true (finding 10).
- Startup effect: loading ICU costs real time. AOT: 15.1 ms (ICU) vs 4.2 ms (invariant + Size). Self-contained trim+R2R: 62.5 ms vs 41.1 ms. Framework-dependent: 66.2 vs 62.4 ms.

### 8. Size and startup, measured

Hello-world console app, one source-generated JSON line, linux-x64, SDK 10.0.401, Fedora 43 host (glibc), median and minimum of 41 wall-clock runs after 3 warm-ups, host otherwise idle (`modes.sh`, `measure.sh`, `measure.log`). Absolute numbers are host-specific; ratios are the finding. Exe size is the single file where there is one; "dir" is the whole publish directory including `.pdb`/`.dbg`.

| # | Mode (properties beyond `-r linux-x64`) | exe / dir bytes | files | median ms | min ms |
|---|---|---|---|---|---|
| 1 | FDD (`--self-contained false`) | dir 115,990 | 4 | 66.2 | 56.5 |
| 11 | FDD + `PublishReadyToRun` | dir 136,470 | 5 | 56.0 | 44.5 |
| 13 | FDD + `InvariantGlobalization` | dir 116,095 | 4 | 62.4 | 46.1 |
| 2 | FDD + `PublishSingleFile` | dir 116,197 | 1 | 64.2 | 49.7 |
| 3 | Self-contained | dir 82,640,529 | 191 | 64.4 | 49.2 |
| 4 | SC + single-file (+ `IncludeNativeLibrariesForSelfExtract`) | exe 73,607,592 | 1 | 67.5 | 52.3 |
| 10 | #4 + `EnableCompressionInSingleFile` | exe 39,238,722 | 1 | 125.8 | 107.1 |
| 6 | SC + single-file + `PublishReadyToRun` | dir 83,856,071 | 1 | 64.0 | 46.5 |
| 5 | SC + single-file + `PublishTrimmed` | exe 15,143,433 | 1 | 161.6 | 135.7 |
| 12 | SC + single-file + trim + R2R | dir 19,482,204 | 1 | 62.5 | 50.6 |
| 7 | #12 + `InvariantGlobalization` | exe 19,207,344 | 1 | 41.1 | 33.8 |
| 8 | `PublishAot` | exe 2,225,448 (+4.7 MB .dbg) | 1 | 15.1 | 12.2 |
| 9 | `PublishAot` + invariant + `OptimizationPreference=Size` | exe 2,040,696 | 1 | 4.2 | 2.9 |

Reading: R2R helps framework-dependent apps modestly and self-contained apps not at all for a trivial app; trim alone hurts startup; compression halves size and doubles startup; AOT is the only mode that wins on both axes. Windows: AOT `Modes.exe` 2,134,528 bytes (ICU on); startup not compared across OSes.

### 9. Native package assets under RID-specific publish

`runtimes/<rid>/native/*` assets are chosen by the RID at publish time. Fixture: Microsoft.Data.Sqlite 10.0.0 (`native/`, `verify-native.log`).

| Publish | Result |
|---|---|
| portable (no `-r`) | 10 files; 23 `*sqlite3*` files under `runtimes/<rid>/native/` for every RID; the loader picks one at run time |
| `-r linux-x64 --self-contained false` | `libe_sqlite3.so` flat in the root, no `runtimes/` tree |
| `-r linux-x64 --self-contained true -p:PublishSingleFile=true` | exe + sidecar `libe_sqlite3.so` + pdb; exe copied alone: `DllNotFoundException` (exit 134) |
| same + `IncludeNativeLibrariesForSelfExtract=true` | exe + pdb; exe copied alone runs, extracts the `.so` under `DOTNET_BUNDLE_EXTRACT_BASE_DIR` |

Consequence for the SDK acquisition story (CS-BIN, CS-PKG): any native asset an app takes from a package follows the app's RID, not the library's. A portable publish carries all RIDs; a RID-specific publish silently drops the others, so a "portable" artifact must not be built with `-r`. NuGet/NativeAOT static linking of such assets is not covered (needs `DirectPInvoke`; unverified).

### 10. Container publish without a Dockerfile

Command, verified on SDK 10.0.401 against the local Docker daemon (no registry push; `ContainerRegistry` unset means the local daemon, per [publish-configuration](https://learn.microsoft.com/en-us/dotnet/core/containers/publish-configuration)):

```bash
dotnet publish -c Release -r linux-x64 --self-contained false -t:PublishContainer
# ... Building image 'modes' with tags 'latest' on top of base image 'mcr.microsoft.com/dotnet/runtime:10.0'.
# ... Pushed image 'modes:latest' to local registry via 'docker'.
```

- No `EnableSdkContainerSupport` was needed for the console project, and the capitalised `ContainerRepository=AppModes` was written as `appmodes`; the default repository is the lowercased `AssemblyName`; the tag defaults to `latest` ("Starting with .NET 8, when a tag isn't provided the default is `latest`") [(publish-configuration)](https://learn.microsoft.com/en-us/dotnet/core/containers/publish-configuration). The overview page says console apps "must" set `EnableSdkContainerSupport` [(overview)](https://learn.microsoft.com/en-us/dotnet/core/containers/overview); on 10.0.401 that is not required. Setting it is harmless.
- `ContainerImageTags` takes `;`-separated tags and "you end up with multiple images, one per unique tag"; quote the value in shells (`/p:ContainerImageTags='"1.2.3;latest"'` in bash). Tag rules: up to 127 alphanumerics, `.`, `_`, `-`, starting alphanumeric or `_`. `ContainerArchiveOutputPath` writes a tar.gz instead of loading the daemon (for scanning before any push). `ContainerRuntimeIdentifiers` (subset of `RuntimeIdentifiers`) builds a multi-arch OCI index [(publish-configuration)](https://learn.microsoft.com/en-us/dotnet/core/containers/publish-configuration).
- Base-image inference observed on 10.0.401 (`docker images` sizes):

| Properties | Base image chosen | Local image size |
|---|---|---|
| `-r linux-x64 --self-contained false` | `mcr.microsoft.com/dotnet/runtime:10.0` | 300 MB |
| `-r linux-musl-x64 --self-contained false -p:InvariantGlobalization=true` | `mcr.microsoft.com/dotnet/runtime:10.0-alpine` | 137 MB |
| `-r linux-x64 -p:PublishAot=true` | `mcr.microsoft.com/dotnet/runtime-deps:10.0-noble-chiseled-extra` | 87.6 MB |
| `-r linux-x64 -p:PublishAot=true -p:InvariantGlobalization=true` | `mcr.microsoft.com/dotnet/runtime-deps:10.0-noble-chiseled` | 30.7 MB |
| same with `-p:ContainerFamily=noble-chiseled-aot` | CONTAINER1015: "Unable to access the repository 'dotnet/runtime-deps' at tag '10.0-noble-chiseled-aot'" | none |

  The rules match the docs' 8.0-era text (self-contained gets `runtime-deps`; `linux-musl-*` picks alpine; `InvariantGlobalization=false` picks `-extra`) [(publish-configuration)](https://learn.microsoft.com/en-us/dotnet/core/containers/publish-configuration), but the `-aot` suffix that the container-images page lists for 8.0 (`8.0-jammy-chiseled-aot`) is gone for 10.0, and the family is `noble`, not `jammy` [(container-images)](https://learn.microsoft.com/en-us/dotnet/core/docker/container-images). Do not hard-code family strings from memory; leave `ContainerFamily` unset and let inference work, or verify the tag exists.
- Non-root: `Config.User` is `1654` and the environment has `APP_UID=1654`; `id` inside `runtime:10.0` prints `uid=1654(app) gid=1654(app)`. The docs: "on Linux, the rootless user `app` is used (though it's referenced by its user ID)" [(publish-configuration)](https://learn.microsoft.com/en-us/dotnet/core/containers/publish-configuration). The chiseled image has no `sh` and no `id` (`exec: "sh": executable file not found`), so the user check there is `docker image inspect --format '{{.Config.User}}'`.
- Entrypoint differs by mode: framework-dependent `["dotnet", "/app/Modes.dll"]` (so `Environment.ProcessPath` is `dotnet`, measured `"proc":"dotnet"`); AOT `["/app/Modes"]`. Working directory `/app/`. `ASPNETCORE_HTTP_PORTS=8080` is baked in by the base image.
- Default OCI labels (created, version, authors, `base.name`, `base.digest` from SDK 9.0.100) are set automatically; `org.opencontainers.image.source` and `.revision` appear only with `PublishRepositoryUrl=true` and Source Link in the build [(publish-configuration)](https://learn.microsoft.com/en-us/dotnet/core/containers/publish-configuration).
- Local registry tool: Docker or Podman; from .NET 11 the SDK prefers `wslc` on Windows and Apple's `container` CLI on macOS when present; `LocalRegistry` pins the choice (same page; .NET 11, unverified here).
- No Dockerfile `RUN`: "There's no way of performing `RUN` commands with the .NET SDK". Needing OS packages or a created user means a custom base image or a Dockerfile.

### 11. SIGTERM in containers after .NET 10

Source: "On Unix systems, the .NET runtime no longer provides a default SIGTERM signal handler." `AppDomain.ProcessExit` and `AssemblyLoadContext.Unloading` "aren't raised" [(breaking change)](https://learn.microsoft.com/en-us/dotnet/core/compatibility/core-libraries/10.0/sigterm-signal-handler). The fix there: Generic Host / `UseConsoleLifetime` (no action), or `PosixSignalRegistration.Create(PosixSignal.SIGTERM, ...)`. The host side: `docker stop` sends SIGTERM and after 10 s on Linux (30 s on Windows) SIGKILL; `-t` changes it [(docker stop)](https://docs.docker.com/reference/cli/docker/container/stop/). `ConsoleLifetime` handles SIGINT, SIGQUIT and SIGTERM [(generic-host)](https://learn.microsoft.com/en-us/dotnet/core/extensions/generic-host); `HostOptions.ShutdownTimeout` defaults to 30 s (`HostOptions.cs:24`, `TimeSpan.FromSeconds(30)`) and covers stopping and stopped lifecycle hooks too [(API)](https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.hosting.hostoptions.shutdowntimeout).

Measured on `PublishContainer` images, local daemon, `verify-sigterm.log` (container runs the app as PID 1 via `dotnet app.dll`):

| App | Image | `docker stop` | exit | output after SIGTERM |
|---|---|---|---|---|
| plain console, `Task.Delay(Infinite)`, no handler | net10 `runtime:10.0` | 301 ms | 143 | nothing (no `ProcessExit`) |
| same source built for net8.0 | `runtime:8.0` | 374 ms | 143 | `ProcessExit raised` |
| plain console + `PosixSignalRegistration(SIGTERM)` | net10 | 544 ms | 0 | `SIGTERM received...`, `graceful exit 0`, `ProcessExit raised` |
| Generic Host + `BackgroundService`, fast stop | net10 | 302 ms | 0 | `worker stopped`, `host.RunAsync returned` |
| Generic Host, `StopAsync` takes 15 s, defaults | net10 | 10,517 ms | 137 | `worker stopping` only; SIGKILL |
| Generic Host, `StopAsync` takes 15 s, `ShutdownTimeout=6 s` | net10 | 6,350 ms | 0 | `worker stopping`, `host.RunAsync returned`; the worker's last line never printed |

Conclusions: exit 143 means "died to SIGTERM", on both net8 and net10, so an exit code alone cannot tell graceful from abrupt; the difference is whether finalizers, `ProcessExit` handlers and `finally` blocks ran. Exit 137 means the grace period expired. `ShutdownTimeout` below the grace period turns a kill into a clean exit 0 but abandons in-flight work, so workers must honor the cancellation token. An unhandled-SIGTERM console app that holds state (temp files, lock files, partially written outputs) leaks it on every `docker stop` on .NET 10.

### 12. File-based apps

Source: file-based apps (.NET 10 SDK and later) "enable native AOT publishing by default"; opt out with `#:property PublishAot=false`; `dotnet publish file.cs` writes to an `artifacts` directory next to the `.cs`; `dotnet pack file.cs` defaults `PackAsTool=true`; directives are `#:sdk`, `#:package`, `#:project`, `#:property`, `#:include` (the last needs SDK 10.0.300); `#:package` without a version works only with central package management or `@*`; `dotnet clean file-based-apps` clears the cache [(file-based apps)](https://learn.microsoft.com/en-us/dotnet/core/sdk/file-based-apps). `dotnet publish [PROJECT|SOLUTION|FILE]`: "File-based program support was added in .NET SDK 10.0.100" [(dotnet publish)](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-publish).

Verified:
- `dotnet publish app.cs` (one `Console.WriteLine`) printed `Generating native code` and wrote `artifacts/app/app` 1,271,472 bytes plus `app.dbg` 2,936,320 bytes: an ELF, dynamically linked to glibc. SDK 11.0 RC1: 1,350,040 bytes, same behavior.
- `dotnet run app.cs` prints `dynamicCode=False`: the AOT default also disables dynamic code under the JIT run. A reflection-based `JsonSerializer.Deserialize<R>(..., new JsonSerializerOptions(JsonSerializerDefaults.Web))` therefore emits IL2026 + IL3050 and throws `InvalidOperationException: Reflection-based serialization has been disabled` under plain `dotnet run`. With `#:property PublishAot=false` on line 1 it prints `version=0.6.5`. `dotnet publish` of that variant is framework-dependent (96,892 bytes, apphost needs `DOTNET_ROOT`; exit 131 when not found).
- Project cone: with a csproj in the same directory, `dotnet run app.cs` "runs that project and passes `file.cs` as an argument", and the csproj globs the `.cs` in as a second top-level-statements file (CS8802) - the doc's "Avoid project file cones" in action. Put scripts in a directory without a project above or beside them, and use `dotnet run --file`.
- Build output for `dotnet run`/`build` lands in the user data directory, observed `~/.local/share/dotnet/runfile/<name>-<hash>/bin/release` (the doc says the temp dir); concurrent first runs race on it - build once, then `--no-build` (doc).
- Exemplar: GitVersion's integration-test file-based app sets `#:property PublishAot=false` on line 7 (`GitTools__GitVersion@5057cdbcc177:tests/integration/Program.cs:7`), with `#:package GitVersion.MsBuild@$(GitVersionMsBuildVersion)`.
- .NET 11: `dotnet run app.cs`/`dotnet app.cs` can reuse unchanged native AOT build output (SDK 11 only); `dotnet reference add --file` (SDK 11 only) [(file-based apps)](https://learn.microsoft.com/en-us/dotnet/core/sdk/file-based-apps).

### 13. Release checksums and build provenance

- Checksums: write `SHA256SUMS` next to the artifacts and verify with `sha256sum -c --strict SHA256SUMS`. Verified red/green: unmodified OK exit 0; one byte appended -> `FAILED`, `WARNING: 1 computed checksum did NOT match`, exit 1; missing file -> `FAILED open or read`, exit 1 (`verify-checksums.log`). For the binary-acquisition side (CS-BIN: sha256 checked before parse), the app release is the producer of that file.
- Provenance: `actions/attest-build-provenance` v4 "is simply a wrapper on top of `actions/attest`"; new work uses `actions/attest` [(attest-build-provenance)](https://github.com/actions/attest-build-provenance). Latest tag on 2026-10-11: v4.2.2 for both (published 2026-08-04 and 2026-08-06, `gh api`). Required job permissions per the README: `id-token: write`, `attestations: write`, `artifact-metadata: write` (new; "necessary to create the artifact storage record"), plus `contents: read`; inputs `subject-path` (glob or list, max 1024 subjects), `subject-checksums` (a checksums file), `subject-digest` + `subject-name`; exactly one of the three [(actions/attest)](https://github.com/actions/attest). Private repositories need GitHub Enterprise Cloud. Verification is `gh attestation verify <file> --repo <owner>/<repo>` (command shape from the `gh` manual page; not runnable here without a real attestation: unverified).
- Exemplar shape: GitVersion attests the directories `artifacts/packages/native` and `artifacts/packages/nuget` with `actions/attest-build-provenance` pinned by full SHA (`v4.1.1`), from a composite action called only when `CAN_PUBLISH == 'true'` in the release job that holds `id-token: write` and `attestations: write` (`GitTools__GitVersion@5057cdbcc177:.github/actions/artifacts-attest/action.yml:8-13`, `.github/workflows/ci.yml:182-183,205-207`). Attest after the final bytes exist (after compression or signing), and never from a PR leg (fork PRs get no `id-token`).
- Order in a release job (ties to CS-PKG tag-triggered, environment-gated job): build matrix legs -> upload artifacts -> release job downloads all -> `sha256sum` -> `actions/attest` on the files and on `SHA256SUMS` -> create the GitHub release with assets. No `ContainerRegistry` push and no `docker push` outside that job.

### 14. Exemplar evidence

Cited as owner__repo@sha12:path:line.

| Exemplar | What it shows |
|---|---|
| `GitTools__GitVersion@5057cdbcc177:build/build/Tasks/Package/PackagePrepare.cs:56-65` | Release CLI shipped self-contained single-file with `IncludeNativeLibrariesForSelfExtract`, `Framework = net{LTS}`, `Runtime = runtime` per entry of `NativeRuntimes[platform]` |
| `GitTools__GitVersion@5057cdbcc177:build/build/BuildContext.cs:12-13` | The RID list is per OS family (`Windows = win-x64, win-arm64`; `Linux = linux-x64, linux-musl-x64, linux-arm64, ...`): each OS publishes its own RIDs on its own runner |
| `GitTools__GitVersion@5057cdbcc177:src/GitVersion.App/GitVersion.App.csproj` | Also ships as a `PackAsTool` with `ToolPackageRuntimeIdentifiers` for 7 RIDs (framework-dependent path) |
| `GitTools__GitVersion@5057cdbcc177:tests/integration/Program.cs:7` | file-based app with `#:property PublishAot=false` |
| `GitTools__GitVersion@5057cdbcc177:.github/actions/artifacts-attest/action.yml:8-13` | `actions/attest-build-provenance@0f67c3f4856b2e3261c31976d6725780e5e4c373 # v4.1.1` over two artifact directories |
| `xunit__xunit@0c7aa4991fa3:src/Directory.Build.props:23,28,34,71,82` | AOT projects via one switch (`_XunitIsAotProject`): `IsAotCompatible`, `PublishAot`, a shared `XunitAotRuntimeIdentifiers` list (win-x86, win-x64, win-arm64, linux-x64, linux-arm64, osx-x64, osx-arm64), `IsTrimmable`, `TrimmerSingleWarn=false`, and `TreatWarningsAsErrors` at line 29 |
| `xunit__xunit@0c7aa4991fa3:src/xunit.v3.runner.console.aot/xunit.v3.runner.console.aot.csproj:7-8` | The console runner as a `PublishAot` exe with `RuntimeIdentifiers` |
| `nuke-build__nuke@27e8077b8ab0:source/Nuke.MSBuildTasks/Nuke.MSBuildTasks.targets:38` | A target that embeds package files only when `SelfContained == 'True' AND PublishSingleFile == 'True'`: single-file self-contained is a mode build tooling must special-case |
| `spectreconsole__spectre.console@0de183140529:src/Spectre.Console/Spectre.Console.csproj:7` | `IsAotCompatible` on the library only, `netstandard2.0` excluded (library side; apps consume it) |
| `dotnet__aspire@af646baee1e8`, `PowerShell__PowerShell@5d871eb5e02c` | Sparse clones: no publish-mode properties in the cloned tree (grep for `PublishAot`, `PublishSingleFile`, `SelfContained`, `PublishContainer`, `SIGTERM`, `PosixSignalRegistration` found nothing). No evidence either way; do not cite them for app publish |

None of the six exemplars uses `PublishContainer`; GitVersion builds containers in a separate docker workflow. The SDK-container path in this document rests on the Microsoft docs plus the measurements, not on exemplar adoption.

### 15. Verified on the toolchain

Fixture root: `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-procedures-app-publish/`. Toolchain wrapper `dotnet-tools/run.sh` (SDK 10.0.401 via parent `global.json`; the scripts export the same environment and add `shim/` for the missing clang). Docker 29.5.2, local daemon, no pushes. Every script is re-runnable.

| # | Claim | Red | Green | Script / log |
|---|---|---|---|---|
| V1 | `Assembly.Location` in a single-file bundle (Linux) | `warning IL3000`, publish exit 0, run: `ArgumentNullException ... (Parameter 'path1')` at `Path.Combine`, exit 134; with TWAE publish exit 1 | `AppContext.BaseDirectory` prints `dir='.../out/loc-green/'`, exit 0; TWAE publish exit 0 | `verify-location.sh`, `.log` |
| V2 | same on the Windows host (SDK 10.0.102, win-x64) | `warning IL3000` then `Value cannot be null (path1)` | `dir='C:\...\loc-green\' ... exe=Loc.exe` | `C:\Users\ecom\csharp-wintest\app-publish\location\{red,green}` via `cmd.exe /c dotnet publish -c Release -o ..\..\out\loc-X` |
| V3 | IL3000 severity | default: publish exit 0 `warning IL3000` | `.editorconfig` `dotnet_diagnostic.IL3000.severity = error`: exit 1 `error IL3000` | `verify-misc.sh` M1 |
| V4 | Reflection STJ under trim | `red-trim`: publish exit 0 with 2x `IL2026`; run: `Reflection-based serialization has been disabled`, exit 134 | `green-trim` (source-generated, TWAE on): exit 0, `version=0.6.5 commit=abc` | `verify-json.sh`, `.log` |
| V5 | Reflection STJ under AOT | `red-aot`: exit 0 with 2x IL2026 + 2x IL3050, run exit 134; `red-aot-twae`: publish exit 1 (`error IL2026`, `error IL3050`) | `green-aot` with TWAE: exit 0, correct output | same |
| V6 | Reflection STJ works framework-dependent (why it ships) | n/a | `red-fdd`: exit 0, `version=0.6.5 commit=abc` | same |
| V7 | Single-file native assets | exe copied alone without the flag: `DllNotFoundException ... 'e_sqlite3'`, exit 134 | with `IncludeNativeLibrariesForSelfExtract`: runs alone, extracts `.so` | `verify-native.sh`, `.log` |
| V8 | Generic Host vs `docker stop` | defaults + 15 s `StopAsync`: 10,517 ms, exit 137 | `ShutdownTimeout=6 s`: 6,350 ms, exit 0 | `verify-sigterm.sh`, `.log` |
| V9 | Plain console SIGTERM | no handler: exit 143, no `ProcessExit` line | `PosixSignalRegistration`: exit 0, `graceful exit 0` + `ProcessExit raised` | same |
| V10 | `msbuild -t:Publish` vs `dotnet publish` | `-t:Publish`: 116,197 bytes (framework-dependent) | `dotnet publish`: 73,626,120 bytes (self-contained) | `verify-misc.sh` M2 |
| V11 | No-ICU image | AOT (ICU) binary in `debian:13-slim`: exit 139, "Couldn't find a valid ICU package" | `-e DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1`: exit 0; also glibc binary in `alpine:3.20`: exit 255 `no such file or directory` | `verify-misc.sh` M3 |
| V12 | Checksums | tampered / missing file: `sha256sum -c --strict` exit 1 | untouched: exit 0 | `verify-checksums.sh`, `.log` |
| V13 | InvariantGlobalization | `DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1`: `GetCultureInfo("de-DE")` throws CultureNotFoundException; compare 31 vs -1 | ICU default: `1.234,5`, compare -1 | `inv/` (commands in finding 7) |
| V14 | File-based app default AOT | `dotnet run json-red.cs`: IL2026+IL3050, `Reflection-based serialization has been disabled` | `#:property PublishAot=false`: `version=0.6.5` | `filebased/json-red.cs`, `json-green.cs` |
| V15 | AOT cross-OS | `-r win-x64 -p:PublishAot=true` on linux: `Cross-OS native compilation is not supported.`, exit 1 | win-x64 AOT on the Windows host (VS 2019/2022 present): `Modes.exe` 2,134,528 bytes, runs, `"dynamicCode":false` | `verify-cross.sh`, Windows host command above |
| V16 | Container user and base inference | `ContainerFamily=noble-chiseled-aot` for 10.0: CONTAINER1015 | inferred bases per finding 10; `Config.User=1654`, `id` = `app` | commands in finding 10 |

Red/green pairs watched: 14 (V1, V2, V3, V4, V5, V7, V8, V9, V10, V11, V12, V13, V14, V15). V6 and V16 are controls, not pairs.

Exact commands for the most-reused ones:

```bash
cd fixtures/csharp-procedures-app-publish
./modes.sh                      # publishes the 10 linux-x64 modes into out/, prints size + startup + one run line each
./measure.sh                    # re-measures out/* with the host idle (median and min of 41 runs)
./verify-location.sh            # V1
./verify-json.sh                # V4, V5, V6
./verify-native.sh              # V7
./verify-sigterm.sh             # V8, V9 (needs docker; builds from sigterm/{plain,host,plain8} with: dotnet publish -c Release -r linux-x64 -t:PublishContainer)
./verify-misc.sh                # V3, V10, V11
./verify-checksums.sh           # V12
./verify-cross.sh               # R2R cross builds + AOT cross failures
```

Environment limits (recorded, not hidden): Linux AOT linked through a `clang -> gcc` shim, not real clang; macOS and arm64 binaries built (R2R) but never run; Alpine/musl AOT not built; `gh attestation verify` not run (no attestation exists); SDK 11.0 RC1 checked for fdd, AOT and file-based only.

## Normative guidance candidates

Each rule: the rule, a one-line rationale, and how a reviewer verifies it. Pattern commands assume the repo root and `rg` (ripgrep).

1. **Choose the publish mode from the decision table, and write the choice and its inputs in the release workflow.** Rationale: size, startup and failure behavior differ by 40x between modes. Verify: reading heuristic - the workflow or csproj names exactly one mode per artifact, matching the table; `rg -n -e 'PublishAot|PublishSingleFile|PublishTrimmed|PublishReadyToRun|SelfContained' --glob '*.csproj' --glob '*.props' --glob '*.yml' .` lists every mode in use.
2. **Pass `--self-contained true|false` (or `-p:SelfContained=`) on every `dotnet publish -r` and on every `msbuild -t:Publish`.** Rationale: `-r` alone is framework-dependent on net8+, and `msbuild -t:Publish` ignores the publish-property implication (116 KB vs 74 MB). Verify: `rg -n -e 'dotnet publish[^\n]*(-r|--runtime) ' --glob '*.yml' --glob '*.sh' --glob '*.ps1' --glob '*.md' . | rg -v -e '--self-contained|--no-self-contained|SelfContained|PublishAot|PublishContainer'` prints nothing.
3. **Set `PublishAot`, `PublishSingleFile`, `PublishTrimmed` and `PublishReadyToRun` in the project file (or Directory.Build.props), not with `-p:` in CI.** Rationale: only project-level properties switch on the analyzers during `dotnet build`. Verify: `dotnet msbuild app.csproj -getProperty:PublishAot -getProperty:EnableAotAnalyzer` prints `true` for both without extra arguments; `rg -n -e '-p:Publish(Aot|SingleFile|Trimmed)' --glob '*.yml' .` prints nothing.
4. **Every app published single-file, trimmed or AOT has `IL3000` set to error (and `IL3001`, `IL2026`, `IL3050` follow the CS-BUILD TWAE rule).** Rationale: they are warnings by default; the publish exits 0 and the artifact crashes. Verify: `.editorconfig` contains `dotnet_diagnostic.IL3000.severity = error` (`rg -n 'IL3000' --glob '.editorconfig' --glob '.globalconfig' .`), and `dotnet publish -c Release -r linux-x64 -p:TreatWarningsAsErrors=true` exits 0 in CI.
5. **No `Assembly.Location`, `GetExecutingAssembly().Location`, `.CodeBase` or `.GetFile(s)()` in app code; use `AppContext.BaseDirectory` (directory) and `Environment.ProcessPath` (exe).** Rationale: empty string/null/throw inside a bundle. Verify: `rg -n -e 'Assembly\.(GetExecutingAssembly|GetEntryAssembly|GetCallingAssembly)\(\)\.Location' -e 'typeof\([A-Za-z_.<>]+\)\.Assembly\.Location' -e '\.CodeBase\b' -e '\.EscapedCodeBase\b' --glob '*.cs' src` prints nothing (gate verified: red file matched, green file not); backstop is rule 4.
6. **Never publish a self-contained, trimmed, or AOT app that serializes with reflection JSON; use the source-generated `JsonTypeInfo` overloads (CS-JSON).** Rationale: `JsonSerializerIsReflectionDisabled` at run time, exit 134. Verify: `rg -n -e 'JsonSerializer\.(Serialize|Deserialize)\w*(<[^>]*>)?\(' --glob '*.cs' src | rg -v -e '\.Default\.' -e 'TypeInfo' -e 'Context'` prints nothing; `dotnet publish ... -p:PublishAot=true -p:TreatWarningsAsErrors=true` exits 0.
7. **Do not ship `PublishTrimmed` without `PublishReadyToRun`, and do not ship trim at all unless the publish has zero IL2xxx/IL3xxx warnings with `TrimmerSingleWarn=false`.** Rationale: trim-only startup regressed 64 -> 162 ms; warnings are future crashes. Verify: `dotnet msbuild app.csproj -getProperty:PublishTrimmed -getProperty:PublishReadyToRun -p:RuntimeIdentifier=linux-x64` shows both `true` or `PublishTrimmed` empty; `dotnet publish -c Release -r linux-x64 -p:TrimmerSingleWarn=false 2>&1 | rg -c 'warning IL[0-9]+'` prints 0.
8. **Set `IncludeNativeLibrariesForSelfExtract=true` when, and only when, a single-file app has third-party native assets; set `DOTNET_BUNDLE_EXTRACT_BASE_DIR` in service units; never extract into `/tmp`.** Rationale: otherwise DllNotFoundException on a copied exe; extraction dirs must not be writable by other principals. Verify: after publish, `find out -name '*.so' -o -name '*.dll' -o -name '*.dylib' | rg -v -e 'pdb'` is empty for a one-file release and `out/<exe>` runs from an empty directory (rule 12).
9. **Treat `EnableCompressionInSingleFile` as measured-only.** Rationale: 2x size win, 1.9x startup loss. Verify: reading heuristic - the PR carries the before/after size and median startup numbers (see `measure.sh` shape).
10. **Do not set `InvariantGlobalization=true` until the code passes the CS-XP culture rules and no user-facing culture behavior is needed; when set, add a test that runs with it.** Rationale: non-invariant cultures throw, comparison turns ordinal, formatting silently invariant. Verify: `dotnet msbuild app.csproj -getProperty:InvariantGlobalization`; `rg -n -e 'CultureInfo\((\"|\w)' -e 'GetCultureInfo\(' --glob '*.cs' src` shows no named-culture creation without a guard; CA1304/CA1305/CA1307/CA1309/CA1310/CA1311 are errors (CS-XP).
11. **A non-invariant self-contained or AOT app must ship in an image or host with ICU; an invariant one must say so (`InvariantGlobalization=true` or `DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1`).** Rationale: no-ICU hosts fail fast at startup (exit 139). Verify: the run step in rule 12 executes in the target base image (`docker run --rm <image>`), not only on the build host.
12. **Every published artifact is executed before it is released, from an empty working directory and, for single-file, as a lone copy of the exe.** Rationale: each mode here has a failure that only appears when the artifact runs (V1, V4, V5, V7, V11). Verify: the workflow has a step with a pattern like `d=$(mktemp -d); cp out/app "$d"/ && (cd "$d" && ./app --version)` after every publish; `rg -n -e './out/|\./artifacts/|bin/Release/.*/publish' --glob '*.yml' .` shows an execution, not only an upload.
13. **Native AOT: one build leg per target OS (and per arch unless a documented cross toolchain exists); no cross-OS AOT; the toolchain is installed in the workflow, not assumed.** Rationale: "Cross-OS native compilation is not supported." Verify: the release matrix `os:` values cover each `-r` RID's OS (`rg -n -e 'runs-on|matrix' --glob '*.yml' .`); a Linux leg that publishes `win-*` or `osx-*` with `PublishAot` is a finding; Linux legs install `clang zlib1g-dev` (`rg -n 'clang' --glob '*.yml' .`).
14. **A Linux AOT or self-contained binary built on glibc is not shipped for Alpine; publish `linux-musl-*` on a musl builder or ship a glibc image.** Rationale: glibc binary on Alpine fails with exit 255. Verify: container base is a glibc `runtime-deps` family for `linux-x64`, and `linux-musl-*` RIDs appear only with an Alpine/musl build leg.
15. **Container images come from `dotnet publish -c Release -r <rid> -t:PublishContainer` with an explicit `-r`; `ContainerRepository` is lowercase; `ContainerImageTags` includes an immutable version (`$(Version)`) not only `latest`.** Rationale: tags default to `latest`; the repository name rule is lowercase only. Verify: `rg -n -e 'PublishContainer' --glob '*.yml' --glob '*.sh' --glob '*.csproj' .` lines carry `-r` or `ContainerRuntimeIdentifier(s)`; `rg -n -e 'ContainerImageTags?' --glob '*.csproj' --glob '*.props' .` shows `$(Version)` or a literal version.
16. **No registry push from PR or branch builds; push only from the tag-triggered, environment-gated release job (CS-PKG).** Rationale: `PublishContainer` pushes to whatever `ContainerRegistry` names. Verify: `rg -n -e 'ContainerRegistry|docker push|DOTNET_CONTAINER_REGISTRY' --glob '*.yml' .` hits only in the release workflow; PR legs use `ContainerArchiveOutputPath=./image.tar.gz` or the local daemon.
17. **Leave `ContainerUser` at its default (`app`, uid 1654); never `ContainerUser=root`; leave `ContainerFamily` unset unless a documented reason names a tag that exists.** Rationale: non-root by default; family strings drift (`jammy` -> `noble`, `-aot` removed). Verify: `rg -n -e 'ContainerUser|ContainerFamily|ContainerBaseImage' --glob '*.csproj' --glob '*.props' --glob '*.yml' .` is empty or justified; `docker image inspect <img> --format '{{.Config.User}}'` prints `1654`.
18. **Pick the base image by mode through inference, then record the observed `Building image ... on top of base image '<x>'` line in the release log.** Rationale: AOT+ICU silently costs 87.6 MB vs 30.7 MB. Verify: the publish log is archived; the line is compared with the table in finding 10.
19. **Every long-running containerized .NET 10 app handles SIGTERM: Generic Host (`Host.CreateApplicationBuilder` + `RunAsync`) or `PosixSignalRegistration.Create(PosixSignal.SIGTERM, ...)` that cancels a token; `AppDomain.ProcessExit` and `Console.CancelKeyPress` are not substitutes.** Rationale: no default handler since .NET 10; ProcessExit is not raised; CancelKeyPress is SIGINT only. Verify: `rg -L -e 'PosixSignalRegistration|UseConsoleLifetime|RunAsync\(|Host\.Create' --glob 'Program.cs' src/*` lists entry points with neither (review each); `docker stop` probe exits 0.
20. **`HostOptions.ShutdownTimeout` is set below the orchestrator's stop grace period, and every `StopAsync`/`ExecuteAsync` honors its token.** Rationale: default 30 s vs `docker stop` 10 s; kill at 137 loses everything. Verify: `rg -n 'ShutdownTimeout' --glob '*.cs' src` finds an assignment below the grace period; CI runs `docker run -d`, `sleep 3`, `docker stop -t <grace>`, and asserts `docker inspect --format '{{.State.ExitCode}}'` is 0 (not 137, not 143).
21. **Treat exit 143 from a .NET 10 container as "killed by SIGTERM without cleanup", not as success; accept only 0.** Rationale: 143 is identical for graceful-less termination on net8 and net10. Verify: a stop test asserts `ExitCode == 0` and that a cleanup marker line (`graceful exit`) is in `docker logs`.
22. **Do not take `Environment.ProcessPath` as the app's own executable inside a framework-dependent container (it is `dotnet`).** Rationale: entrypoint is `dotnet /app/App.dll`. Verify: `rg -n 'Environment\.ProcessPath' --glob '*.cs' src` hits are each guarded by a mode check or used only in single-file/AOT code paths.
23. **A portable (`-r`-less) publish is never done with `-r`; a RID-specific publish never claims portability; native package assets are checked per RID.** Rationale: `runtimes/<rid>/native` follows the app's RID. Verify: `find out -path '*runtimes*' -name '*.so' | wc -l` is greater than 0 for portable and 0 for RID-specific outputs.
24. **File-based apps live outside any project cone, run with `dotnet run --file x.cs`, set `#:property PublishAot=false` on line 1 when they reflect, serialize via source generation, or load plugins, pin versions with `#:package Name@x.y.z`, and rely on the repo's `global.json`.** Rationale: AOT is the default and also disables dynamic code under `dotnet run`; project cones break resolution. Verify: `rg -n -e '^#:package [^@ ]+$' --glob '*.cs' scripts` prints nothing (version missing); `fd -e csproj -d 1 . $(dirname <script>)` finds no csproj beside a file-based app; `rg -n -e '^#:property PublishAot=false' <script>` present where reflection is used.
25. **Release assets of every app ship with `SHA256SUMS`, verified in CI with `sha256sum -c --strict`, and with a provenance attestation from `actions/attest` (full-SHA pinned) in the tag-triggered job holding `id-token: write`, `attestations: write`, `artifact-metadata: write`, `contents: read`.** Rationale: consumers (CS-BIN) verify before parse; provenance binds the bytes to the workflow. Verify: `rg -n -e 'actions/attest' --glob '*.yml' .` shows `@<40-hex-sha>`; `rg -n -e 'permissions:' -A6 --glob '*release*.yml' .` shows the four permissions only on the release job; `gh attestation verify ./app --repo <owner>/<repo>` exits 0 on a released file.
26. **Attest and checksum the final bytes (after compression or signing), never an intermediate.** Rationale: the digest must equal the downloadable file. Verify: the attest step's `subject-path` points at the directory uploaded to the release, in a step after the last packaging step (reading heuristic).
27. **Record osx and arm64 as unverified until a run on that hardware: a cross-built R2R/AOT binary counts as "built", not "works".** Rationale: ELF/Mach-O produced from linux-x64 was never executed. Verify: the release matrix has a native `osx-arm64` and `linux-arm64` leg that runs the smoke step (rule 12).

## AI-agent angle

What an LLM characteristically gets wrong, and the smallest mechanical check:

1. **".NET 6/7-era `-r` implies self-contained; add `--self-contained` only sometimes."** Output is silently framework-dependent on net8+, or `msbuild -t:Publish` is 116 KB. Check: rule 2's `rg` pipeline; the post-publish `du -sb` or an apphost run on a machine with no runtime.
2. **Passing `-p:PublishAot=true` / `-p:PublishSingleFile=true` only on the command line.** No analyzer in `dotnet build`, so IL warnings appear only at publish. Check: `dotnet msbuild -getProperty:EnableAotAnalyzer` is `true` with no CLI properties.
3. **`Assembly.GetExecutingAssembly().Location` for "the app directory".** Compiles, passes in `dotnet run`, crashes in the bundle. Check: rule 5's `rg`, and IL3000 as an error.
4. **"Trim it to make it faster."** Trim-only is slower (162 vs 64 ms). Check: rule 7's property pair.
5. **Reflection `JsonSerializer.Deserialize<T>(json, options)` in a tool that is later published trimmed/AOT, or in a `.cs` script.** Works under `dotnet run` on an old mental model; on SDK 10 file-based apps it already fails because AOT is the default. Check: rule 6's `rg`; `dotnet run --file x.cs` once.
6. **Hard-coding container tags from memory: `jammy-chiseled`, `jammy-chiseled-aot`, `mariner`, `8.0-alpine`.** CONTAINER1015 on 10.0, or a 300 MB image where 30 MB was possible. Check: unset `ContainerFamily` (rule 17); the archived `Building image ... on top of base image` line (rule 18).
7. **Writing a Dockerfile (`FROM sdk ... USER root`) for what `-t:PublishContainer` does.** Check: `rg -n 'FROM mcr.microsoft.com/dotnet/sdk' --glob 'Dockerfile*' .` hits get a reviewer question; `USER` lines audited.
8. **`ContainerUser=root` "to fix a permissions error", or `chmod 777`.** Check: rule 17.
9. **Assuming `ProcessExit`, `Console.CancelKeyPress` or `finally` run on `docker stop`.** On .NET 10 none runs for SIGTERM. Check: rule 19's `rg -L` and the stop probe.
10. **Reading `exit 143` as a clean stop; reading `exit 137` as a crash.** 143 = killed by SIGTERM, 137 = grace expired. Check: stop test asserts 0 (rule 21).
11. **Leaving `ShutdownTimeout` at the default (30 s) in a Docker-run service.** 10 s kill. Check: rule 20.
12. **`InvariantGlobalization=true` to "fix" a missing-ICU crash or to "make the image small".** Silent behavior change. Check: rule 10 and 11; run the test suite with `DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1`.
13. **Cross-compiling Native AOT for Windows or macOS from a Linux CI runner, or from a `linux-x64` Docker image for Alpine.** Fails or produces a glibc binary. Check: rule 13 matrix review; `ldd out/app | rg -c 'libc.so.6'` on an artifact tagged musl must print 0.
14. **`IncludeNativeLibrariesForSelfExtract=true` "to be safe" on every single-file app, or omitting it with SQLite-class packages.** Check: rule 8's `find`.
15. **`dotnet publish -r X` for a "portable" release and then wondering where `runtimes/` went.** Check: rule 23's `find`.
16. **`actions/attest-build-provenance@v1`/`@main`, missing `artifact-metadata`, attesting before compression, or attesting on a PR.** v4 is a wrapper; the new action is `actions/attest`. Check: rule 25's `rg`.
17. **File-based apps: `dotnet run app.cs` inside a project directory, unversioned `#:package`, expecting JIT semantics.** Check: rule 24.
18. **Reporting "published successfully" from the exit code.** Warnings-only IL failures exit 0. Check: rule 12, run the artifact; rule 4.

## Contested / evolving

- **File-based apps default to Native AOT** (as of SDK 10.0.401 and 11.0 RC1, 2026-10). Trend: more caching of the AOT path in .NET 11 (`dotnet run app.cs` reuse of native output), `#:include` and `dotnet reference add --file` arriving. The default surprises people who think "script" means JIT; the doc page itself lists AOT as a key benefit, GitVersion opts out. Expect this to stay.
- **Docs lag behavior.** The single-file page (updated 2026-07-31) still says `RuntimeIdentifier` sets `SelfContained` and that runtime natives are separate files; the `dotnet publish` page says to pass `--self-contained` with `-r`; the container overview says console apps must set `EnableSdkContainerSupport`; the container-images page (ms.date 2024-08-28) lists `jammy-chiseled-aot`; the invariant-mode design doc says ASCII-only casing. All five are contradicted by the measurements here. Prefer the measurement; re-run the fixtures after each SDK band.
- **Trimming for apps vs AOT.** Microsoft's guidance is "no trim warnings"; practice at xunit and others is to go straight to AOT for CLIs and skip trim-only. Trimmed self-contained remains the fallback when AOT is blocked by a dependency. Trend: AOT for tools, trim+R2R for the rest, trim-only for nobody (as of 2026-10).
- **Floating vs pinned base images.** The SDK writes `base.name` and `base.digest` labels (9.0.100+) so a floating `runtime:10.0` is reproducible after the fact, but the build is not reproducible. Pinning a digest improves reproducibility and loses patch updates; no consensus in the exemplars (none use the SDK container path). Not decided here.
- **Chiseled / distroless naming.** 8.0 docs say "Mariner distroless, Ubuntu chiseled, Alpine"; 10.0 images are `noble-chiseled` (and `-extra`), the `-aot` variant is gone, Azure Linux replaced Mariner. Expect further renames; do not encode family strings.
- **SIGTERM defaults.** .NET 10 moved to "leave it to higher-level libraries" (reverting to .NET Framework/Mono behavior) after a decade of the opposite; the Generic Host handles it, plain console apps are the casualty. Open question: whether `ConsoleLifetime`-style helpers appear for non-host console apps. No sign of it as of 2026-10.
- **`actions/attest` vs `attest-build-provenance`.** v4 (2025) makes the latter a wrapper; the README now requires `artifact-metadata: write`. Private-repo availability is plan-gated. Expect the wrapper to be deprecated.
- **NETSDK1179 vs NETSDK1201.** The 6/7 warning is gone from the behavior on SDK 8+; the live warning is NETSDK1201 for pre-net8 TFMs only. If you maintain a net6/7 floor, the old wording still appears on old SDKs.
- **.NET 11 (RC1, GA Nov 2026):** `StackTraceLineNumberSupport` for AOT, `LocalRegistry` auto-prefers `wslc`/Apple `container`, AOT reuse for `dotnet run`, `dotnet reference` for file-based apps. None changes a rule above; flag any use of these behind SDK 11 (CS-BUILD fences .NET 11 APIs).
- **macOS and arm64:** AOT and R2R run-time behavior unverified here; the .NET 9+ AOT matrix lists Windows x64/Arm64/x86, Linux x64/Arm64/Arm, macOS x64/Arm64 [(native-aot)](https://learn.microsoft.com/en-us/dotnet/core/deploying/native-aot/). A later CI dispatch on native legs is the right closure.

## Sources

Primary: learn.microsoft.com, dotnet/* repos, SDK source, the Docker and actions references, and the exemplar files. Retrieval date 2026-10-11 for all fetched pages; "page date" is the `ms.date` front matter where shown.

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://learn.microsoft.com/en-us/dotnet/core/deploying/ | Publishing overview: FDD, SCD, single-file, AOT, R2R, container, quick-reference table | page date 2025-08-11, updated 2026-07-27 | Canonical mode list and commands; contains the one doc statement on `-r` that is stale |
| https://learn.microsoft.com/en-us/dotnet/core/deploying/single-file/overview | Single-file deployment | page date 2026-03-25, updated 2026-07-31 | API incompatibility table, extraction directory rules, compression, `ExcludeFromSingleFile` |
| https://learn.microsoft.com/en-us/dotnet/core/deploying/single-file/warnings/il3000 | IL3000 rule | 2020, updated 2023 | Cause and the `AppContext.BaseDirectory` fix |
| https://learn.microsoft.com/en-us/dotnet/core/deploying/native-aot/ | Native AOT overview | 2025-10-22, updated 2026-07-27 | Prerequisites per OS, limitations, `IsAotCompatible` property set, platform matrix |
| https://learn.microsoft.com/en-us/dotnet/core/deploying/native-aot/cross-compile | AOT cross-compilation | 2023-10-10, updated 2025-08-22 | "does not support cross-OS compilation"; Linux arm64 toolchain list |
| https://learn.microsoft.com/en-us/dotnet/core/deploying/native-aot/optimizing | Optimizing AOT output | 2023, updated 2024-09 | `OptimizationPreference` Size/Speed |
| https://learn.microsoft.com/en-us/dotnet/core/deploying/native-aot/warnings/il3050 | IL3050 rule | 2022, updated 2025-12-03 | RequiresDynamicCode cause and fix |
| https://learn.microsoft.com/en-us/dotnet/core/deploying/ready-to-run | ReadyToRun | updated 2026-07-27 | Size/startup trade-off, composite, cross-compile target table |
| https://learn.microsoft.com/en-us/dotnet/core/deploying/trimming/trimming-options | Trimming options and feature switches | updated 2026-08-24 | `PublishTrimmed`, `TrimmerSingleWarn`, `ILLinkTreatWarningsAsErrors`, .NET 10/11 switches |
| https://learn.microsoft.com/en-us/dotnet/core/deploying/trimming/fixing-warnings | Fixing trim warnings | 2025-11-04 | Ordered workflow; `UnconditionalSuppressMessage`, not `#pragma` |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/8.0/runtimespecific-app-default | .NET 8 breaking change: RID no longer implies self-contained | 2023-06-05 | Exact implication rules; quotes NETSDK1179 |
| https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-publish | `dotnet publish` reference | updated 2026-07-27 | Options, FILE argument for file-based apps (SDK 10.0.100), Release default |
| https://learn.microsoft.com/en-us/dotnet/core/sdk/file-based-apps | File-based apps | 2026-09-10 | Default AOT, directives, `dotnet publish file.cs`, cone and cache pitfalls, .NET 11 notes |
| https://learn.microsoft.com/en-us/dotnet/core/containers/publish-configuration | SDK container properties reference | 2026-08-04 | Base-image inference, `ContainerUser`, tags, `LocalRegistry`, labels |
| https://learn.microsoft.com/en-us/dotnet/core/containers/overview | SDK container overview | 2025-01-07 | `EnableSdkContainerSupport`, auth, insecure registries |
| https://learn.microsoft.com/en-us/dotnet/core/docker/container-images | .NET container image variants | 2024-08-28 | `-extra`/`-aot`/chiseled/alpine scheme (8.0-era; compare finding 10) |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/core-libraries/10.0/sigterm-signal-handler | .NET 10 breaking change: no default SIGTERM handler | 2025-06-06 | The rule behind PR-15 and the `PosixSignalRegistration` recipe |
| https://learn.microsoft.com/en-us/dotnet/core/extensions/generic-host | Generic Host and shutdown | 2026-02-04 | `ConsoleLifetime` signals, stop order, shutdown timeout |
| https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.hosting.hostoptions.shutdowntimeout | `HostOptions.ShutdownTimeout` | updated 2026-05-27 | Scope of the timeout; default 30 s is in source below |
| https://github.com/dotnet/runtime/blob/main/src/libraries/Microsoft.Extensions.Hosting/src/HostOptions.cs | HostOptions source (read via `gh api`, line 24) | main, 2026-10 | `ShutdownTimeout { get; set; } = TimeSpan.FromSeconds(30)` |
| https://learn.microsoft.com/en-us/dotnet/core/runtime-config/globalization | Globalization runtime config | updated 2025-12-03 | `InvariantGlobalization`, `PredefinedCulturesOnly`, env var names |
| https://github.com/dotnet/runtime/blob/main/docs/design/features/globalization-invariant-mode.md | Invariant mode design doc (read via `gh api`) | main, 2026-10 | Behavior list; casing text is stale vs .NET 10 behavior |
| https://docs.docker.com/reference/cli/docker/container/stop/ | `docker stop` | current | 10 s Linux / 30 s Windows grace, `-t`, SIGTERM default |
| https://github.com/actions/attest-build-provenance | Attest-build-provenance README | v4.2.2, 2026-08-06 | v4 is a wrapper of `actions/attest` |
| https://github.com/actions/attest | `actions/attest` README (WebFetch + `gh api repos/actions/attest/readme`) | v4.2.2, 2026-08-04 | Permissions including `artifact-metadata`, inputs, 1024 subject limit |
| SDK 10.0.401 `Sdks/Microsoft.NET.Sdk/targets/Microsoft.NET.RuntimeIdentifierInference.targets:66-77,100-118,211,296-302` (local install) | MSBuild source for SelfContained/RID inference and NETSDK1201 | SDK 10.0.401 | The authoritative mechanism behind finding 2 |
| SDK 10.0.401 `Sdks/Microsoft.NET.Sdk.Publish/targets/Microsoft.NET.Sdk.Publish.targets:102-106` (local install) | `TrimMode` default for TFM < 8 | SDK 10.0.401 | Confirms net8+ uses the ILLink default |
| `GitTools__GitVersion@5057cdbcc177:build/build/Tasks/Package/PackagePrepare.cs:56-65`, `.github/actions/artifacts-attest/action.yml:8-13`, `tests/integration/Program.cs:7` | Real SC single-file release, attestation, file-based app | clone at the sha | Only exemplar of an app release pipeline end to end |
| `xunit__xunit@0c7aa4991fa3:src/Directory.Build.props:23-34,71,82` and `src/xunit.v3.runner.console.aot/xunit.v3.runner.console.aot.csproj:7-8` | AOT app projects and RID list | clone at the sha | How a large repo declares AOT app targets |
| `nuke-build__nuke@27e8077b8ab0:source/Nuke.MSBuildTasks/Nuke.MSBuildTasks.targets:38` | Build tooling that special-cases SC + single-file | clone at the sha | Shows the mode as a build-system concern |
| Fixtures: `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-procedures-app-publish/` (all `verify-*.sh` and `*.log`) | First-hand measurements | 2026-10-11 | Re-runnable red/green evidence |
