---
title: "NuGet library package contents, build provenance and publishing route (nuget.org)"
topic: csharp-packaging-nuget-release
agent: deep-dive researcher (csharp-packaging group)
model: sonnet
date_researched: 2026-10-10
sources_count: 26
scope: |
  Covers what a .NET library nupkg/snupkg must carry (pack metadata, SourceLink, deterministic/CI build, symbols), the version source and AssemblyVersion policy,
  strong naming, author signing, NuGet Trusted Publishing (OIDC), package validation at pack time, prefix reservation, and an ordered release step list with a check per step.
  Era: SDK 10.0.401 (NuGet 7.9) target, SDK 8.0.425 floor, SDK 11.0 RC1 flagged. Verified on a local pack-only fixture tree; nothing was pushed to nuget.org.
  NOT covered: API-evolution policy beyond the pack-time hook (csharp-api-evolution-gates), CI matrix/test design, native-AOT/trim flags, bundling the ocx binary into the package, GitHub Release/changelog tooling.
---

# NuGet library package contents, build provenance and publishing route

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Metadata: what pack checks and what it silently accepts](#1-metadata-what-pack-checks-and-what-it-silently-accepts)
   2. [SourceLink on SDK 8+ (no package needed)](#2-sourcelink-on-sdk-8-no-package-needed)
   3. [ContinuousIntegrationBuild, Deterministic, and the `/_/` map](#3-continuousintegrationbuild-deterministic-and-the-_-map)
   4. [Symbols: snupkg vs embedded vs pdb-in-nupkg](#4-symbols-snupkg-vs-embedded-vs-pdb-in-nupkg)
   5. [Byte-for-byte reproducibility of the nupkg itself](#5-byte-for-byte-reproducibility-of-the-nupkg-itself)
   6. [Version source and AssemblyVersion policy](#6-version-source-and-assemblyversion-policy)
   7. [Strong naming](#7-strong-naming)
   8. [Trusted Publishing vs API keys](#8-trusted-publishing-vs-api-keys)
   9. [Author signing](#9-author-signing)
   10. [Package validation at pack](#10-package-validation-at-pack)
   11. [Prefix reservation](#11-prefix-reservation)
   12. [Decisions for the ocx C# SDK](#12-decisions-for-the-ocx-c-sdk)
   13. [Release step list with a check per step](#13-release-step-list-with-a-check-per-step)
   14. [Verified on the toolchain](#14-verified-on-the-toolchain)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- Pack metadata that the SDK does NOT enforce must be enforced by you: with no `PackageLicenseExpression`, no readme, the default description `Package Description` and the default author (= assembly name), `dotnet pack` exits 0 with zero warnings (measured, fixture `red-bare`); only a readme gap prints an informational message. Check the nuspec mechanically.
- Declared-but-unpacked files DO fail pack: `PackageReadmeFile` without a `<None Pack="true">` item is error NU5039, `PackageIcon` NU5046, `PackageLicenseFile` NU5030, license expression plus file NU5033; a bad SPDX id is only warning NU5124 and `PackageLicenseUrl` / `PackageIconUrl` are warnings NU5125 / NU5048.
- On SDK 8+ do not add a `Microsoft.SourceLink.*` PackageReference for GitHub, GitLab, Azure Repos or Bitbucket: SourceLink ships in the SDK, and `EmbedUntrackedSources` and `Deterministic` already evaluate to `true` (measured on 8.0.425 and 10.0.401). Referencing the package overrides the SDK-bundled version.
- Set `<PublishRepositoryUrl>true</PublishRepositoryUrl>`: alone it fills the nuspec `<repository url= branch= commit=>` from the git `origin` remote (measured); without it the nuspec has a commit but no URL.
- `ContinuousIntegrationBuild` is NOT set automatically, even with `CI=true` or `GITHUB_ACTIONS=true` (measured). Set it conditionally on a CI env var in `Directory.Build.props`; unconditional breaks local source stepping. Without it the PDB embeds absolute paths (red) and `dotnet-validate` exits 1; with it the SourceLink map is `/_/*` and the DLL is byte-identical across checkout directories.
- A nupkg is still not byte-reproducible by default: zip entry timestamps are wall-clock. `DeterministicTimestamp=true` (Polly's value) is also wall-clock; only a fixed timestamp or `SOURCE_DATE_EPOCH` gives identical nupkg and snupkg across clones (measured on SDK 10.0.401 / NuGet 7.9; SDK 8.0.425 ignores it). SDK 11.0 RC1 does not change that.
- Ship symbols as `snupkg` (`IncludeSymbols` + `SymbolPackageFormat=snupkg`). Leaving the format default produces `X.symbols.nupkg`, which the `*.nupkg` push glob also matches (measured) and which nuget.org's symbol server does not accept.
- Version from git tags with MinVer 8.0.0 (`PrivateAssets=all`, `MinVerTagPrefix=v`), never a hand-edited `<Version>`. A shallow clone with no tags silently packs `0.0.0-alpha.0` (measured): release checkout needs `fetch-depth: 0` plus a guard that rejects `0.0.0*`.
- Leave `AssemblyVersion` to MinVer (`{major}.0.0.0`; FileVersion `{major}.{minor}.{patch}.0`); do not hand-set any of the four version attributes.
- Do not strong-name a library that targets only net8.0+: Microsoft says strong naming has no benefit on modern .NET and is "not required"; 22 of 35 corpus repos still ship an `.snk` as Framework-era inheritance. Exception: multi-targeting netstandard2.0 or net4x.
- Publish with NuGet Trusted Publishing: `NuGet/login@<full sha>` plus `permissions: id-token: write` on the publish job only, then `dotnet nuget push --skip-duplicate`. The temporary key lives 1 hour and is single-use per OIDC token; no `NUGET_API_KEY` secret exists to leak. `user` is the nuget.org profile name, not an email.
- Do NOT author-sign at v1. It needs a CA code-signing cert in Azure Key Vault, `dotnet/sign` (Windows x64 prerequisite per its README), cert registration on nuget.org which then makes every future submission need a signature, and SHA-1 fingerprints are an error on SDK 10 (NU3043). nuget.org adds a repository signature to every package anyway (observed `.signature.p7s` in Serilog 4.2.0 from nuget.org).
- Turn on `EnablePackageValidation` at pack; set `PackageValidationBaselineVersion` only after the first stable release (an unpublished baseline is restore error NU1102), and bump it right after each release. A failed validation still leaves the nupkg in `-o` (measured), so gate on the exit code, never on file existence.
- Run `dotnet-validate package local <nupkg>` (pinned preview tool) on every nupkg before push and `dotnet-validate package remote <id> -v <ver>` after; it reports Source Link, Deterministic and Compiler Flags and exits 1 on any red (measured).
- Apply for an ID prefix reservation after the first publish; check it mechanically via the search API `verified` flag (Serilog and Polly.Core `True`, MinVer `False`, measured).
- Nothing on nuget.org can be edited or deleted after upload (immutable nuspec, no delete policy): every pre-push check in the step list is the only chance.

## Findings

### 1. Metadata: what pack checks and what it silently accepts

Pack properties and their nuspec elements are in the [NuGet MSBuild targets reference](https://learn.microsoft.com/en-us/nuget/reference/msbuild-targets): `PackageId` (default `$(AssemblyName)`), `Authors` (default: current user name), `Description` (default "Package Description"), `PackageLicenseExpression` / `PackageLicenseFile` (only one of the two), `PackageProjectUrl`, `PackageIcon` (PNG/JPEG, max 1 MB, 128x128 recommended), `PackageReadmeFile` (Markdown only, NuGet 5.10 / SDK 5.0.300+), `PackageTags`, `PackageReleaseNotes`, `Copyright`, `RepositoryUrl`, `RepositoryType`, `RepositoryCommit`. `Owners` and `Summary` are unsupported in MSBuild pack. `PackageLicenseUrl` and `PackageIconUrl` are deprecated. The Microsoft [authoring best practices](https://learn.microsoft.com/en-us/nuget/create-packages/package-authoring-best-practices) say: DO add a README, DO include a license expression or file, DO NOT use `LicenseUrl` or `IconUrl`, DO use a pretty-name author, description up to 4000 characters, copyright "Copyright (c) <name> <year>", pre-release suffix for non-stable packages. nuget.org only accepts license expressions for OSI/FSF-approved licenses (same page).

What the toolchain actually enforces (fixtures `red-bare`, `badmeta`, SDK 10.0.401):

| Defect | Pack result |
|---|---|
| No license, no readme, no icon, default description and author | exit 0, 0 warnings; readme gap prints only `The package ... is missing a readme. Go to https://aka.ms/nuget/authoring-best-practices/readme` as a message |
| `PackageReadmeFile` set, file not packed | `error NU5039: The readme file 'README.md' does not exist in the package.` exit 1 |
| `PackageIcon` set, file not packed | `error NU5046: The icon file 'icon.png' does not exist in the package.` exit 1 |
| `PackageLicenseFile` set, file not packed | `error NU5030: The license file 'LICENSE' does not exist in the package.` exit 1 |
| expression and file both set | `error NU5033: ... Cannot specify both a PackageLicenseExpression and a PackageLicenseFile.` exit 1 |
| `Apache-2.0 OR NotARealLicense-9.9` | `warning NU5124: The license identifier 'NotARealLicense-9.9' is not recognized` exit 0 |
| `PackageLicenseUrl` only | `warning NU5125: The 'licenseUrl' element will be deprecated` exit 0; `-p:WarningsAsErrors=NU5125` or `TreatWarningsAsErrors=true` turns it into exit 1 |
| `PackageIconUrl` only | `warning NU5048` exit 0 |

So the SDK catches wrong declarations but not absent ones. nuget.org itself accepts a package without license or readme (FAQ: a package "does not specify the licensing terms" is allowed; the page shows a License Info link; the [authoring guide](https://learn.microsoft.com/en-us/nuget/create-packages/package-authoring-best-practices) warns "A project without a license defaults to exclusive copyright"). I could not find documentation of any nuget.org-side hard rejection or warning for a missing license/readme, and I did not push to test, so this remains "accepted but unattractive". A nuget.org readme only supports Markdown, images only from an allow-listed domain set (`img.shields.io`, `raw.githubusercontent.com`, `github.com/.../workflows/.../badge.svg` ...), relative image paths do not render, and a fix requires a new version ([readme page](https://learn.microsoft.com/en-us/nuget/nuget-org/package-readme-on-nuget-org)). Package size limit is 250 MB; metadata cannot be edited after upload and deletion is unsupported ([FAQ](https://learn.microsoft.com/en-us/nuget/nuget-org/nuget-org-faq)).

Exemplar shapes: Polly keeps one shared block of metadata and `<None ... Pack="true" PackagePath="">` items for icon, readme and LICENSE in `App-vNext__Polly@e4476096da5b:eng/Library.targets:26-39`; simple-exec's whole packaging block is 8 lines in `adamralph__simple-exec@f80913246993:src/Directory.Build.props:7-13,31-34`; xunit packs under `_content/` (`xunit__xunit@0c7aa4991fa3:src/Directory.Build.props:73-75,85-88`).

```xml
<!-- WRONG: compiles and packs clean, ships an anonymous, unlicensed package -->
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup><TargetFrameworks>net8.0;net10.0</TargetFrameworks></PropertyGroup>
</Project>

<!-- RIGHT: Directory.Build.props (shared) + csproj -->
<PropertyGroup>
  <Authors>Example Org</Authors>
  <Copyright>Copyright (c) Example Org 2026</Copyright>
  <Description>Typed .NET wrapper around the ocx command line tool.</Description>
  <PackageTags>ocx;oci;package-manager;cli-wrapper</PackageTags>
  <PackageLicenseExpression>Apache-2.0</PackageLicenseExpression>
  <PackageProjectUrl>https://github.com/example-org/ocx-sdk-demo</PackageProjectUrl>
  <PackageReadmeFile>README.md</PackageReadmeFile>
  <PackageIcon>icon.png</PackageIcon>
  <PackageReleaseNotes>https://github.com/example-org/ocx-sdk-demo/blob/main/CHANGELOG.md</PackageReleaseNotes>
</PropertyGroup>
<ItemGroup>
  <None Include="$(MSBuildThisFileDirectory)README.md" Pack="true" PackagePath="" />
  <None Include="$(MSBuildThisFileDirectory)icon.png" Pack="true" PackagePath="" />
</ItemGroup>
```

Note `PackageLicenseExpression` also makes pack emit a compatibility `<licenseUrl>https://licenses.nuget.org/Apache-2.0</licenseUrl>` (observed in the fixture nuspec); that is not NU5125.

### 2. SourceLink on SDK 8+ (no package needed)

The [dotnet/sourcelink README](https://raw.githubusercontent.com/dotnet/sourcelink/main/README.md) states that "Starting with .NET 8, Source Link for the following source control providers is included in the .NET SDK and enabled by default": GitHub / GitHub Enterprise, Azure Repos git, GitLab 12.0+ and Bitbucket 4.7+. Other hosts (Azure DevOps Server, GitWeb, Gitea) still need their `Microsoft.SourceLink.*` package with `PrivateAssets="All"`. Referencing any SourceLink package in an SDK 8+ project overrides the bundled version, and xunit pins `Microsoft.SourceLink.GitHub` by exact version to dodge a System.Memory conflict (`xunit__xunit@0c7aa4991fa3:src/Directory.Build.props:95-99`), which is the cost of keeping the redundant reference. The [.NET 8 breaking-change note](https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/8.0/source-link) records the side effect: `InformationalVersion` now carries `+<commit>` for every project built by the 8 SDK (opt-out `IncludeSourceRevisionInInformationalVersion=false`); the [MSBuild props reference](https://learn.microsoft.com/en-us/dotnet/core/project-sdk/msbuild-props) says `SourceRevisionId` is auto-populated from .NET 8 when SourceLink is present.

Measured on a bare project with a GitHub `origin` (fixture `red-bare`): `dotnet msbuild -getProperty:` on SDK 10.0.401 gives `EmbedUntrackedSources=true`, `Deterministic=true`, `EnableSourceLink=true`, `DebugType=portable`, `PublishRepositoryUrl=` (empty), `ContinuousIntegrationBuild=` (empty); SDK 8.0.425 gives `EmbedUntrackedSources=true` and `Deterministic=true` as well. Packing with only `-p:PublishRepositoryUrl=true` produced `<repository type="git" url="https://github.com/example-org/ocx-sdk-demo.git" branch="refs/heads/main" commit="2d1c..."/>`; packing with no property produced `<repository type="git" commit="2d1c..."/>` (no URL); a lone `RepositoryUrl` yields URL + commit without branch. Microsoft's own [library guidance](https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/sourcelink) is only "CONSIDER using Source Link" and points at the dotnet/sourcelink repo; it does not mention the SDK inclusion.

A repository whose `origin` is not a recognized host silently produces no SourceLink mapping even though the nuspec still says what you typed: with `origin` = a local path `dotnet-validate` printed `Source Link: Contains untracked sources (obj)` and exited 1, with the GitHub URL it exited 0 (Verified section, V3).

```xml
<!-- WRONG on SDK >= 8 (redundant, pins a second copy, needs PrivateAssets or it leaks) -->
<PackageReference Include="Microsoft.SourceLink.GitHub" Version="8.0.0" />

<!-- RIGHT -->
<PropertyGroup><PublishRepositoryUrl>true</PublishRepositoryUrl></PropertyGroup>
```

### 3. ContinuousIntegrationBuild, Deterministic, and the `/_/` map

[MSBuild props](https://learn.microsoft.com/en-us/dotnet/core/project-sdk/msbuild-props): `ContinuousIntegrationBuild` "enables settings that only apply to official builds ... stored file paths are normalized ... on a local development machine, the debugger isn't able to find local source files if file paths are normalized"; the documented guard is `Condition="'$(TF_BUILD)' == 'true'"`. The [sourcelink docs](https://raw.githubusercontent.com/dotnet/sourcelink/main/docs/README.md): "Only set `DeterministicSourcePaths` to true on a build/CI server, never for local builds"; a fully deterministic build needs both `Deterministic` and `ContinuousIntegrationBuild` true. Exemplars: Polly sets all three only under `'$(CI)' == 'true'` (`App-vNext__Polly@e4476096da5b:Directory.Build.props:7-11`); xunit keys lock-file mode on it (`xunit__xunit@0c7aa4991fa3:src/Directory.Build.props:29`); simple-exec delegates to the `DotNet.ReproducibleBuilds.Isolated` SDK (`adamralph__simple-exec@f80913246993:src/Directory.Build.props:5,25`).

The [DotNet.ReproducibleBuilds README](https://raw.githubusercontent.com/dotnet/reproducible-builds/main/README.md) states the package sets `PublishRepositoryUrl=true`, `DebugType=embedded` and `ContinuousIntegrationBuild=true` on CI systems. Measured with version 2.0.5 (fixture `rb`): `ContinuousIntegrationBuild` empty with no CI env, `true` under `GITHUB_ACTIONS=true`, `TF_BUILD=true` or `CI=true`; `DebugType` is `embedded`. It is a convenience for multi-CI detection; one MSBuild line replaces it for a GitHub-only repo.

Measured effect (fixture `green-complete`, same commit): without CIB the PDB document map is `{"documents":{"/home/.../green-complete/*":"https://raw.githubusercontent.com/example-org/ocx-sdk-demo/d023.../*"}}` and `dotnet-validate` says `Deterministic (dll/exe): Non deterministic ... Ensure that the following property is enabled for CI builds ... <ContinuousIntegrationBuild>true</ContinuousIntegrationBuild>` and exits 1; with `CI=true` the map is `{"documents":{"/_/*":"https://raw.githubusercontent.com/.../d023.../*"}}`, the document list is `/_/src/Ocx.Sdk/Client.cs` plus the `obj/` generated files, and `dotnet-validate` exits 0. Two clones in different directories built without CIB give different `Ocx.Sdk.dll` SHA-256 (`1233a143...` vs `550729a6...`), with CIB the same (`6247f1fe...`, V4).

```xml
<!-- WRONG: unconditional, local F5 debugging loses sources -->
<ContinuousIntegrationBuild>true</ContinuousIntegrationBuild>
<!-- WRONG: relying on the SDK to detect CI (it does not) -->
<!-- RIGHT -->
<ContinuousIntegrationBuild Condition="'$(GITHUB_ACTIONS)' == 'true'">true</ContinuousIntegrationBuild>
```

Prefer a provider-specific variable over bare `CI`: a developer machine that exports `CI=true` flips local builds to normalized paths.

### 4. Symbols: snupkg vs embedded vs pdb-in-nupkg

The [sourcelink PDB comparison table](https://raw.githubusercontent.com/dotnet/sourcelink/main/README.md): snupkg = no user opt-in, no main-package growth, no assembly growth, supported only on feeds that implement it (nuget.org yes, Azure Artifacts no); pdb-in-main-package grows restore size; embedded grows each assembly. nuget.org's symbol server accepts only `.snupkg` of portable PDBs built with VS 15.9+ compilers (not `DebugType=full`), and only `.pdb .nuspec .xml .psmdcp .rels .p7s` entries; indexing takes under 15 minutes ([snupkg doc](https://learn.microsoft.com/en-us/nuget/create-packages/symbol-packages-snupkg)). `dotnet nuget push X.nupkg` to nuget.org pushes the nupkg first, then the sibling snupkg. `SymbolPackageFormat` defaults to `symbols.nupkg`.

Measured sizes for the 2-TFM fixture: nupkg 6,674 B + snupkg 15,999 B; pdb inside nupkg 16,397 B (the `AllowedOutputExtensionsInPackageBuildOutputFolder;.pdb` trick used by Polly `eng/Library.targets:10` and nodatime `nodatime__nodatime@4dd26f1ddfa7:Directory.Build.props:43`) ; `DebugType=embedded` nupkg 21,249 B. With the pdb-in-nupkg trick `dotnet-validate` printed `No files found to validate` (exit 0): the checks are skipped, not passed. With `embedded` and a correct remote it printed Valid / Valid / Valid (exit 0).

```xml
<!-- WRONG: IncludeSymbols alone -> Ocx.Sdk.1.0.0.symbols.nupkg; `push '*.nupkg'` pushes it too -->
<IncludeSymbols>true</IncludeSymbols>
<!-- RIGHT -->
<IncludeSymbols>true</IncludeSymbols>
<SymbolPackageFormat>snupkg</SymbolPackageFormat>
```

Measured: with the legacy format `dotnet nuget push 'out/*.nupkg' --source <folder>` printed `Pushing Ocx.Sdk.1.0.0.symbols.nupkg ...` then `Pushing Ocx.Sdk.1.0.0.nupkg`; with snupkg only the nupkg matched the glob (folder sources do not take snupkg; nuget.org does).

Positive proof that a published symbol package resolves from the repo URL: `sourcelink print-json` on the nuget.org symbol package of Serilog 4.2.0 gives `{"documents":{"/_/*":"https://raw.githubusercontent.com/serilog/serilog/c00e17fdeb615d36c062569f7342f72c9ece4aa7/*"}}` and `sourcelink test` prints `sourcelink test passed` (V11). The same command on the unpushed fixture fails with `error: url failed NotFound` — correct, the commit is not on GitHub, which is why the check belongs AFTER the tag is pushed and the package is on nuget.org.

### 5. Byte-for-byte reproducibility of the nupkg itself

[MSBuild targets reference](https://learn.microsoft.com/en-us/nuget/reference/msbuild-targets) (page updated 2026-07): `Deterministic` pack property (default `true` from .NET 11), `DeterministicTimestamp` (RFC 3339 string, Unix seconds, `true` = current wall clock, or `false`; default `true` on .NET 11+ / NuGet 7.9.0+), and `SOURCE_DATE_EPOCH` used automatically when `DeterministicTimestamp` is unset (NuGet 7.9.0+). Measured on two clones of one commit built 2-3 s apart in different directories, all with `CI=true`:

| Setting | nupkg identical? | snupkg identical? |
|---|---|---|
| defaults (SDK 10.0.401) | no | no |
| `-p:DeterministicTimestamp=true` (Polly's value, `Directory.Build.props:9`) | no (wall clock) | no |
| `-p:DeterministicTimestamp=2026-01-01T00:00:00Z` | yes (`fb71b04f...`) | yes (`57a1f3d1...`) |
| `SOURCE_DATE_EPOCH=1767225600` | yes, same hashes as above | yes |
| SDK 11.0.100-rc.1, defaults | no | no |
| SDK 8.0.425 (NuGet 6.11), `SOURCE_DATE_EPOCH` set, TFM net8.0 only | no (property ignored) | - |

The only remaining difference in the default case is the zip entry mtimes (CRCs and entry names were equal, `nuget.psmdcp` has a fixed name). Release recipe: `SOURCE_DATE_EPOCH=$(git log -1 --format=%ct) dotnet pack ...` on SDK >= 10.0.401. SDK 8 additionally cannot pack a net10.0 target (`NETSDK1045`), so the release job uses the newest SDK from `global.json`.

### 6. Version source and AssemblyVersion policy

[Microsoft versioning guidance](https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/versioning): use SemVer 2.0 for the NuGet version, DO add a pre-release suffix for non-stable packages, CONSIDER only the major in `AssemblyVersion`, DO NOT freeze `AssemblyVersion`, FileVersion `Major.Minor.Build.Revision`, AVOID setting `InformationalVersion` yourself (SourceLink appends `+<commit>`). In .NET (Core) the runtime loads higher assembly versions automatically, so `AssemblyVersion` mainly shows up in exception messages.

Options seen in the corpus ([exemplar audit](../csharp-audit/exemplar-build-and-gates.md) section 6): MinVer 3 (Polly, simple-exec, spectre), Nerdbank.GitVersioning 7 (xunit, Dapper, StyleCop ...), GitVersion.yml 5, hand-set `<Version>` (nodatime `Directory.Build.props:7`, "the last thing to change before performing a release"), injected at pack time (CliWrap `Directory.Build.props:3` `0.0.0-dev`).

MinVer 8.0.0 measured (fixture `ver`, tag prefix `v`): no tag -> `0.0.0-alpha.0`; tag `v1.2.3` on HEAD -> `1.2.3`; 3 commits after -> `1.2.4-alpha.0.3`; `AssemblyVersion` `1.0.0.0`, `AssemblyFileVersion` `1.2.4.0` / `1.3.0.0` on a `v1.3.0` tag, `AssemblyInformationalVersion` `1.2.4-alpha.0.3+<40-hex commit>`. The [MinVer README](https://raw.githubusercontent.com/adamralph/minver/main/README.md) documents `{MinVerMajor}.0.0.0` and `{Major}.{Minor}.{Patch}.0` and the shallow-clone fallback; measured red: `git clone --depth 1` (0 tags) packs `Lib.0.0.0-alpha.0.nupkg` without any error, green after `git fetch --tags --unshallow` -> `Lib.1.2.4-alpha.0.3.nupkg`. Polly pins the floor with `MinVerMinimumMajorMinor` (`eng/Common.props:23`); simple-exec adds `MINVERBUILDMETADATA=build.<run_id>.<run_attempt>` in the release job (`.github/workflows/release.yml:10`). [Nerdbank.GitVersioning](https://raw.githubusercontent.com/dotnet/Nerdbank.GitVersioning/main/README.md) derives the version from a `version.json` plus git height and "doesn't depend on tags or branch names" (the page does not discuss shallow clones; xunit checks out with `fetch-depth: 0`, `xunit__xunit@0c7aa4991fa3:.github/workflows/ci-signed.yaml:23`). Both need history on CI.

### 7. Strong naming

[Microsoft strong-naming guidance](https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/strong-naming) (updated 2026-03): strict assembly loading is isolated to .NET Framework; ".NET 5+, .NET Core ... don't have strict assembly loading"; "Strong naming has no benefits on .NET Core/5+"; "Strong naming is not required for libraries that target .NET Core/5+ only. You should strong name your open-source .NET libraries if their targets include .NET Framework or .NET Standard"; if multi-targeting Framework/Standard and modern, strong-name ALL TFMs; DO NOT add, remove or change the key later; DO NOT publish strong-named and non-strong-named variants. When publisher identity matters, it recommends Authenticode and NuGet package signing instead. Corpus: 22 of 35 repos track an `.snk` and 20 set `SignAssembly` (audit 6.4); 12, including modern-only simple-exec, cake, nuke, pulumi, do neither. Examples that do: Polly (`eng/Library.targets:98,104-105` plus `InternalsVisibleTo ... PublicKey`), nodatime (`Directory.Build.props:23-24`, key committed: `NodaTime Release.snk`), serilog (`Directory.Build.props:9-10`, `assets/Serilog.snk`), xunit (`src/Directory.Build.props:62,79`). Those four all multi-target netstandard2.0 / net4x, which is the documented exception.

Measured: `PublicSign=true` on Linux builds a signed-identity assembly from a key file without the private key; full signing with a hand-built `.snk` crashed Roslyn in this fixture (fixture key-format problem, not evidence about the feature), and the CS8002 warning the page describes did not appear under PublicSign. I record the Microsoft statements as documented, not reproduced.

The decision is irreversible: adding a key later is an identity change for every consumer; omitting it now costs nothing for a net8.0+ library and can be added only with a major version, so "no" is the safe default.

### 8. Trusted Publishing vs API keys

[nuget.org Trusted Publishing](https://learn.microsoft.com/en-us/nuget/nuget-org/trusted-publishing) (page updated 2026-09-01): the workflow's OIDC token is exchanged at nuget.org for a temporary API key valid 1 hour; one token yields one key. Policy fields (case-insensitive): repository owner, repository, workflow file NAME ONLY (`build.yml`, not the path), optional environment; policy owner is a user or an organization (the policy goes inactive if the creating user leaves the org); policy scopes control publishing new packages vs new versions, with glob patterns for package ids; policies on private repos stay active only 7 days until a publish supplies the repo and owner IDs (anti-resurrection). GitLab is supported through the raw token endpoint (`POST https://www.nuget.org/api/v2/token`, `tokenType: ApiKey`).

The [NuGet/login action](https://github.com/NuGet/login) takes `user` (required; nuget.org username), optional `token-service-url` and `audience`, exposes `NUGET_API_KEY`, and needs `id-token: write` and `contents: read`. Exemplars: Polly (`build.yml:418-452`, `environment: NuGet.org`, `NuGet/login@8d196754... # v1.2.0`, `dotnet nuget push "*.nupkg" --skip-duplicate --source https://api.nuget.org/v3/index.json`), openai-dotnet (`release.yml:153-200`, `environment: publish`), simple-exec (`release.yml:6-7,22-29`, push on tag `*.*.*`). Long-lived key counter-examples: GitVersion loads credentials from 1Password (`GitTools__GitVersion@5057cdbcc177:.github/workflows/_publish.yml:51-56`), xunit pushes CI builds to Feedz with a `FEEDZ_PUSH_KEY` secret (`.github/workflows/ci-signed.yaml:53`). The Python SDK being mirrored already uses PyPI trusted publishing via OIDC (python-sdk-digest.md:190), so the C# release should be the same shape.

```yaml
# WRONG: long-lived secret, always-on token
- run: dotnet nuget push *.nupkg -k ${{ secrets.NUGET_API_KEY }} -s https://api.nuget.org/v3/index.json

# RIGHT (publish job only)
publish:
  environment: nuget.org
  permissions: { id-token: write, contents: read }
  steps:
    - uses: NuGet/login@8d196754b4036150537f80ac539e15c2f1028841 # v1.2.0
      id: login
      with: { user: ${{ secrets.NUGET_USER }} }   # profile name, not an email
    - run: dotnet nuget push "artifacts/*.nupkg" --skip-duplicate --api-key "${{ steps.login.outputs.NUGET_API_KEY }}" --source https://api.nuget.org/v3/index.json
```

Request the key right before the push (1 hour expiry).

### 9. Author signing

Mechanics: [sign a package](https://learn.microsoft.com/en-us/nuget/create-packages/sign-a-package): a CA-issued code-signing certificate (self-issued certs are rejected by nuget.org), `dotnet nuget sign <nupkg> --certificate-path ... --timestamper <url>` (.NET 6.0.100+), register the `.cer` on nuget.org, and "While a user has one or more certificates registered, all package submissions must be signed with one of the certificates." [dotnet nuget sign](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-nuget-sign): hash default SHA256 (SHA256/384/512); `--certificate-fingerprint` SHA-1 is warning NU3043 in .NET 9 and an error from .NET 10 ([breaking change](https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/10.0/dotnet-nuget-sign-sha1-deprecated)); pre-9 SDKs accept only SHA-1 fingerprints. Verification on Linux needs .NET 6.0.400+; macOS verification is disabled by default and "we recommend that you don't enable verification" ([signed-package verification](https://learn.microsoft.com/en-us/dotnet/core/tools/nuget-signed-package-verification)).

Corpus: only Polly and openai-dotnet author-sign, both with the [dotnet/sign](https://raw.githubusercontent.com/dotnet/sign/main/README.md) CLI against an Azure Key Vault certificate on a Windows runner (`App-vNext__Polly@e4476096da5b:.github/workflows/build.yml:217-283`, `windows-2025`, `azure/login`, `./sign code azure-key-vault **/*.nupkg ...`; `openai__openai-dotnet@1f0e8829acac:.github/workflows/release.yml:91-112`, `dotnet tool install --tool-path . --prerelease sign`). The dotnet/sign README lists an "up-to-date x64-based version of Windows" as prerequisite, supports `.nupkg`, and only RSA PKCS#1 v1.5 (no ECDSA). Polly then re-verifies signatures and attests provenance: `dotnet nuget verify` (`build.yml:378`), `actions/attest` (`build.yml:411-416`), a separate `validate-signed-packages` job (`:292-392`) so a signing regression cannot reach `publish-nuget`. xunit signs inside its own builder (`ci-signed.yaml:44-59`). Measured locally: `dotnet nuget sign` with a self-issued RSA-3072 cert on Linux emits `NU3002` (no timestamper), `NU3042`/`NU3018` untrusted root and exits 1; a 40-hex SHA-1 `--certificate-fingerprint` on SDK 10.0.401 exits 1 with `NU3043: ... The value must be a SHA-256, SHA-384, or SHA-512 certificate fingerprint` (V9). Cost I could not price from a primary source: a CA certificate with HSM-protected key, an Azure subscription for Key Vault, a Windows runner, and the lock-in that, once a certificate is registered, every future push (including hotfixes) must be signed. nuget.org already countersigns every package with a repository signature (observed `.signature.p7s` inside `serilog.4.2.0.nupkg` downloaded from nuget.org), which covers tamper evidence after upload but not publisher identity before it; GitHub build provenance (`actions/attest`) covers the latter without a certificate.

### 10. Package validation at pack

[Package validation](https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/package-validation/overview): `EnablePackageValidation=true` runs the baseline-version validator, the compatible-runtime validator and the compatible-framework validator after `Pack`; `PackageValidationBaselineVersion` names the previous stable package. The standalone [ApiCompat tool](https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/global-tool) is `dotnet tool install --global Microsoft.DotNet.ApiCompat.Tool`; `apicompat package <new.nupkg> --baseline-package <old.nupkg>`. Measured (fixture `pkgval`, SDK 10.0.401): removing a public method gives `error CP0002: Member 'int Pv.Api.Sub(int, int)' exists on [Baseline] lib/net10.0/Lib.dll but not on lib/net10.0/Lib.dll` (once per TFM) and pack exits 1 -- but `out-red/Pv.Lib.1.1.0.nupkg` was still written; the additive change packs with exit 0 and `apicompat` prints `APICompat ran successfully without finding any breaking changes.` A baseline that is not on any source fails restore: `error NU1102 ... Found 0 version(s) in nuget.org`; with validation enabled and no baseline pack exits 0. Exemplars: Polly sets both properties with `Condition="'$(...)' == ''"` overrides (`eng/Library.targets:15-18`, baseline `8.5.2`); nodatime documents the discipline in the file itself: `Version` "is the last thing to change before performing a release", `PackageValidationBaselineVersion` "is changed immediately *after* a release" (`nodatime__nodatime@4dd26f1ddfa7:Directory.Build.props:3-12`). Which diagnostics become errors and how suppressions are managed is `csharp-api-evolution-gates`'s subject.

### 11. Prefix reservation

[ID prefix reservation](https://learn.microsoft.com/en-us/nuget/nuget-org/id-prefix-reservation): once reserved, packages with a matching ID from other owners are rejected, and the owner's packages show the verified check mark on nuget.org and VS 2017 15.4+. Criteria (not all must be met): the prefix clearly identifies the owner; it is not a common word and "Avoid ID prefix reservations that are shorter than four characters"; not reserving would cause confusion. Packages under the prefix should have consistent author, a license expression (not `licenseUrl`), an `icon`. Application: email `account@nuget.org` with the owner display name and prefixes (page last updated 2022-09-20; confirm the current channel before relying on it). Mechanical check after approval: the search API exposes `verified`; measured `Serilog verified=True`, `Polly.Core verified=True`, `MinVer verified=False` (`https://azuresearch-usnc.nuget.org/query?q=packageid:<id>&take=1`).

### 12. Decisions for the ocx C# SDK

| Decision | Stance | Reason |
|---|---|---|
| Required MSBuild property set | `PublishRepositoryUrl`, `IncludeSymbols`, `SymbolPackageFormat=snupkg`, conditional `ContinuousIntegrationBuild`, `GenerateDocumentationFile`, `EnablePackageValidation`, plus metadata block of finding 1; `Deterministic` / `EmbedUntrackedSources` are SDK defaults and may be omitted | measured defaults on 8.0.425 and 10.0.401 |
| Version source | MinVer 8.0.0, tag `vX.Y.Z`, `fetch-depth: 0`, zero-version guard | mirrors the Python SDK's tag-driven release (python-sdk-digest.md:190); no version file to drift; same recipe as Polly and simple-exec |
| AssemblyVersion | accept MinVer's `{major}.0.0.0` | Microsoft guidance; no binding redirects on modern .NET |
| Strong naming | NO | net8.0+ only; no benefit; irreversible if added later |
| Author signing | NO at v1; revisit on a concrete consumer requirement | CA cert + Key Vault + Windows x64 + registration lock-in; nuget.org repository signature plus `actions/attest` cover integrity |
| Publishing | Trusted Publishing via `NuGet/login`, tag-triggered, environment-gated | no stored key; Python SDK parity |
| Symbols | snupkg (not embedded, not pdb-in-nupkg) | works with nuget.org symbol server, keeps nupkg small, `dotnet-validate` actually inspects it |
| Prefix | apply for the SDK's chosen prefix after first publish | verified badge; namespace protection |

### 13. Release step list with a check per step

Tag-triggered workflow `release.yml` (`on: push: tags: ['v*.*.*']`), Linux runner for build+pack+publish:

| # | Step | Check (fails the job) |
|---|---|---|
| 1 | `actions/checkout` with `fetch-depth: 0`, `persist-credentials: false` | `test "$(git rev-parse --is-shallow-repository)" = false` and `git describe --tags --exact-match` exits 0 |
| 2 | `actions/setup-dotnet` with `global-json-file: global.json` | `dotnet --version` equals the `global.json` version |
| 3 | `dotnet restore --locked-mode` | exit 0 (lock files) |
| 4 | build + test (other topics) | exit 0 |
| 5 | `SOURCE_DATE_EPOCH=$(git log -1 --format=%ct) dotnet pack -c Release -o artifacts --no-restore` with `GITHUB_ACTIONS=true` (set by the runner) | exit 0 (includes CP#### validation); `ls artifacts/*.nupkg artifacts/*.snupkg` non-empty |
| 6 | version/tag consistency | `test "$(basename artifacts/Ocx.Sdk.*.nupkg .nupkg)" = "Ocx.Sdk.${GITHUB_REF_NAME#v}"` and no `0.0.0` prefix |
| 7 | metadata completeness | `scripts/check-package.sh artifacts` (the fixture script `check-package.sh`: license, readme, icon, projectUrl, repo url, 40-hex commit, authors, tags, non-default description, snupkg present) |
| 8 | provenance | `dotnet-validate package local` on each nupkg, version pinned in `.config/dotnet-tools.json`; exit 0 |
| 9 | reproducibility (separate job, fresh clone, other directory) | `sha256sum` of both `artifacts/*.nupkg` equal |
| 10 | attest (optional) | `actions/attest` on `artifacts/*.nupkg`; job green |
| 11 | publish job (`environment: nuget.org`, `id-token: write`) downloads the SAME artifacts, `NuGet/login`, then `dotnet nuget push "artifacts/*.nupkg" --skip-duplicate --source https://api.nuget.org/v3/index.json` | exit 0; log lists the nupkg and the snupkg |
| 12 | post-publish (poll up to ~15 min for symbol indexing) | `dotnet-validate package remote Ocx.Sdk -v <ver>` exit 0; `sourcelink test` on the downloaded snupkg pdb prints `sourcelink test passed` |
| 13 | bump `PackageValidationBaselineVersion` to the just-released version in the next commit | `grep` of the csproj/props equals last tag |

### 14. Verified on the toolchain

Fixture root: `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-packaging-nuget-release/` (global.json inherited from the parent pins 10.0.401; `det8/` and `det11/` carry their own). Every command ran through `/home/mherwig/.cache/research-lang/dotnet-tools/run.sh`; nothing was pushed (the only push was `dotnet nuget push` to a local folder source). Tools installed with `--tool-path tools/{dv,sl,ac}`: dotnet-validate 0.0.1-preview.582, sourcelink 3.1.1, Microsoft.DotNet.ApiCompat.Tool 10.0.401, plus MinVer 8.0.0 and DotNet.ReproducibleBuilds 2.0.5 as package references. SDKs: 10.0.401 (NuGet 7.9.0), 8.0.425 (NuGet 6.11.2), 11.0.100-rc.1.26425.128.

**V1 metadata (red then green).** Red: `red-bare/` (3-line csproj), `dotnet pack src/Ocx.Sdk -c Release -o artifacts` -> `The package Ocx.Sdk.1.0.0 is missing a readme...`, `Successfully created package`, 0 warnings; nuspec has `<authors>Ocx.Sdk</authors><description>Package Description</description>` and no license/readme. `./check-package.sh red-bare/artifacts` printed `FAIL license / readme / icon / projectUrl / repo-url / tags / description is the SDK default / snupkg missing`, exit 1. Green: `green-complete/` (finding 1 block) -> `./check-package.sh green-complete/artifacts` printed `ok` for all 11 lines, exit 0; nupkg members `README.md icon.png lib/net10.0/Ocx.Sdk.{dll,xml} lib/net8.0/Ocx.Sdk.{dll,xml}`. Declared-but-unpacked defects in `badmeta/`: `NU5039`, `NU5046`, `NU5030`, `NU5033` errors (exit 1), `NU5124`, `NU5048`, `NU5125` warnings (exit 0; `-p:WarningsAsErrors=NU5125` -> `error NU5125: Warning As Error ...` exit 1).

**V2 CIB / `/_/` map.** Red: `green-complete`, no CI env: `dotnet pack src/Ocx.Sdk -c Release -o artifacts`; `sourcelink`-style extraction of the snupkg PDB shows `{"documents":{"/home/mherwig/.cache/.../green-complete/*":"https://raw.githubusercontent.com/example-org/ocx-sdk-demo/d0233d78.../*"}}`; `dotnet-validate package local artifacts/Ocx.Sdk.1.0.0.nupkg` -> `Source Link: Valid with Symbol Server`, `Deterministic (dll/exe): Non deterministic ... <ContinuousIntegrationBuild>true</ContinuousIntegrationBuild>`, exit 1. Green: `CI=true dotnet pack ...` -> `sourcelink print-json` `{"documents":{"/_/*":"https://raw.githubusercontent.com/example-org/ocx-sdk-demo/d0233d78.../*"}}`, `print-documents` lists `/_/src/Ocx.Sdk/Client.cs` and three `/_/src/Ocx.Sdk/obj/Release/net10.0/*.cs`; `dotnet-validate` all three `Valid`, exit 0.

**V3 unrecognized remote.** Red: `pdbin/` (clone whose `origin` is the local path `.../green-complete`), `CI=true dotnet pack` -> nuspec has the explicit GitHub url but `dotnet-validate` prints `Source Link: Contains untracked sources (obj) ... <EmbedUntrackedSources>true</EmbedUntrackedSources>`, exit 1. Green: `git remote set-url origin https://github.com/example-org/ocx-sdk-demo.git`, repack -> `Valid with Symbol Server`, exit 0 (and `DebugType=embedded`, `IncludeSymbols=false` -> Valid x3, exit 0).

**V4 DLL determinism across directories.** `det/a`, `det/b` (clones of one commit). Red (`env -u CI -u GITHUB_ACTIONS`, same `SOURCE_DATE_EPOCH`): `Ocx.Sdk.dll` SHA-256 `1233a1436165c879...` vs `550729a6e829d051...`. Green (`CI=true`): both `6247f1fe51a92861...`.

**V5 nupkg determinism.** Same `det/a`/`det/b`, packs 2 s apart, `CI=true`: defaults -> nupkg `db12878c...` vs `0eeddb54...` (differ); `-p:DeterministicTimestamp=true` -> `1ac80da8...` vs `2d651d4c...` (differ); `-p:DeterministicTimestamp=2026-01-01T00:00:00Z` -> `fb71b04fe2c6183e` = `fb71b04fe2c6183e`, snupkg `57a1f3d1829c18cd` = `57a1f3d1829c18cd`; `SOURCE_DATE_EPOCH=1767225600` -> the same four hashes. `det11/` (SDK 11.0.100-rc.1) defaults: `0c2592f2...` vs `6ccd6d47...` (differ). `det8/` (8.0.425, `-p:TargetFrameworks=net8.0`, `SOURCE_DATE_EPOCH=1767225600`): `10c84255...` vs `23f09245...` (differ). SDK 8 with the net10.0 TFM: `error NETSDK1045: The current .NET SDK does not support targeting .NET 10.0`.

**V6 symbols format.** Red: `legacy/`, `-p:SymbolPackageFormat=symbols.nupkg` -> `Ocx.Sdk.1.0.0.symbols.nupkg` (21,461 B) next to the nupkg; `dotnet nuget push 'out/*.nupkg' --source $PWD/feed` -> `Pushing Ocx.Sdk.1.0.0.symbols.nupkg ...` then the nupkg. Green: default fixture props (snupkg) -> glob pushes only `Ocx.Sdk.1.0.0.nupkg`; `Ocx.Sdk.1.0.0.snupkg` (15,999 B) is a sibling file.

**V7 package validation.** `pkgval/` (nuget.config with local feed + nuget.org). Baseline 1.0.0 packed to `feed/`. Red: 1.1.0 removes `Api.Sub`: `dotnet pack src -c Release -o out-red` -> `error CP0002: Member 'int Pv.Api.Sub(int, int)' exists on [Baseline] lib/net10.0/Lib.dll but not on lib/net10.0/Lib.dll` (and net8.0), `API breaking changes found.`, exit 1, nupkg still in `out-red/`. Green: 1.1.0 adds `Mul` -> exit 0; `../tools/ac/apicompat package out-green/Pv.Lib.1.1.0.nupkg --baseline-package feed/Pv.Lib.1.0.0.nupkg` -> `APICompat ran successfully without finding any breaking changes.` exit 0; same tool on the red package exit 1. Baseline `9.9.9` -> `error NU1102 ... Found 0 version(s) in nuget.org`, exit 1.

**V8 MinVer.** `ver/origin` (tag `v1.2.3`, then commits): no tag `Lib.0.0.0-alpha.0.nupkg`; tag on HEAD `Lib.1.2.3.nupkg`; 3 commits later `Lib.1.2.4-alpha.0.3.nupkg`. Red: `git clone --depth 1 file://.../origin shallow` (`git tag | wc -l` = 0) -> `Lib.0.0.0-alpha.0.nupkg`, no diagnostic. Green: `git fetch --tags --unshallow` -> `Lib.1.2.4-alpha.0.3.nupkg`; full clone same. Attributes: `AssemblyFileVersion("1.2.4.0")`, `AssemblyInformationalVersion("1.2.4-alpha.0.3+de0e24c66c227e2e...")`, `AssemblyVersion("1.0.0.0")`.

**V9 signing.** `sign/`: `openssl req -x509 -newkey rsa:3072 -sha256 ... -addext extendedKeyUsage=critical,codeSigning` + `openssl pkcs12 -export`; `dotnet nuget sign signed.nupkg --certificate-path cert.pfx --certificate-password pw` -> `warn : NU3002`, `warn : NU3042 ... untrusted because it is not present in the certificate bundle at /etc/pki/ca-trust/extracted/pem/objsign-ca-bundle.pem`, `error: NU3018: Certificate chain validation failed.`, exit 1 (so a self-issued cert cannot even sign locally on Linux; nuget.org rejects them by documentation). `dotnet nuget sign s1.nupkg --certificate-fingerprint 0123456789abcdef0123456789abcdef01234567` -> `error: NU3043: Invalid value for '--certificate-fingerprint' option. The value must be a SHA-256, SHA-384, or SHA-512 certificate fingerprint`, exit 1. No green twin run (no trusted certificate available); the SHA-256 path is documentary.

**V10 defaults and ReproducibleBuilds.** `dotnet msbuild src/Ocx.Sdk -getProperty:<P> -p:TargetFramework=net10.0 -p:Configuration=Release` in `red-bare`: `EmbedUntrackedSources=true`, `Deterministic=true`, `EnableSourceLink=true`, `DebugType=portable`, `SymbolPackageFormat=symbols.nupkg`; `ContinuousIntegrationBuild`, `PublishRepositoryUrl`, `IncludeSymbols` empty, even with `GITHUB_ACTIONS=true CI=true`. `rb/` (DotNet.ReproducibleBuilds 2.0.5): `ContinuousIntegrationBuild` empty with `X=1`, `true` with `GITHUB_ACTIONS=true`, `TF_BUILD=true`, `CI=true`; `PublishRepositoryUrl=true`, `DebugType=embedded`.

**V11 real-world green and remote check.** `curl -sL https://www.nuget.org/api/v2/symbolpackage/Serilog/4.2.0` -> snupkg; `sourcelink print-json` -> `/_/*` -> `.../serilog/c00e17fdeb615d36c062569f7342f72c9ece4aa7/*`; `sourcelink test sp/lib/net8.0/Serilog.pdb` -> `sourcelink test passed`, exit 0. Red twin: the fixture pdb (commit never pushed) -> `error: url failed NotFound`, `sourcelink test failed`. `dotnet-validate package remote Serilog -v 4.2.0` -> Source Link / Deterministic / Compiler Flags all Valid, exit 0. `unzip -p serilog.4.2.0.nupkg .signature.p7s` shows a CMS blob (repository signature). Search API `verified`: Serilog True, Polly.Core True, MinVer False.

Verification pairs watched red then green: 10 (V1 metadata, V2 CIB, V3 recognized remote, V4 DLL determinism, V5 nupkg determinism, V5 SDK 8 vs SDK 10 timestamp support, V6 symbols format, V7 package validation, V8 MinVer shallow clone, V11 unpushed vs published SourceLink). V9 (signing) and the strong-naming probe have a red side only and are labelled so; V10 is a measurement table.

## Normative guidance candidates

1. **Pack through the SDK only.** `dotnet pack` on an SDK-style project in Release; no `.nuspec`, `nuget.exe pack`, `msbuild -t:pack`, `GeneratePackageOnBuild`. Why: the property-driven path is what every check below inspects. Verify: `grep -rn -E --include='*.csproj' --include='*.props' --include='*.targets' --include='*.yml' -e 'NuspecFile' -e 'nuget pack' -e 'nuget.exe' -e 'GeneratePackageOnBuild' .` returns nothing.
2. **Every packable project declares Authors, Description, PackageLicenseExpression, PackageReadmeFile, PackageProjectUrl, PackageTags, Copyright and PackageReleaseNotes (shared in `Directory.Build.props`).** Why: SDK pack accepts their absence silently (V1). Verify: `for p in Authors Description PackageLicenseExpression PackageReadmeFile PackageProjectUrl PackageTags Copyright; do dotnet msbuild src/Ocx.Sdk -getProperty:$p -p:TargetFramework=net10.0 | tr -d ' \n{}"'; echo; done` shows no empty value and Description is not `Package Description`; or run `check-package.sh artifacts` (exit 0).
3. **Pack every file you declare: `PackageReadmeFile`, `PackageIcon` (and a `PackageLicenseFile` if used) each need `<None Include="..." Pack="true" PackagePath="" />`.** Why: otherwise NU5039 / NU5046 / NU5030 (errors). Verify: `dotnet pack` exits 0 and `unzip -Z1 artifacts/*.nupkg | grep -x -e README.md -e icon.png` prints both.
4. **Use `PackageLicenseExpression` with an SPDX id; never `PackageLicenseUrl` or `PackageIconUrl`; never both expression and file.** Why: NU5125 / NU5048 / NU5033; license URL changes retroactively. Verify: `grep -rn -E --include='*.csproj' --include='*.props' --include='*.targets' -e 'PackageLicenseUrl' -e 'PackageIconUrl' -e '<licenseUrl' .` returns nothing; analyzer-level: `-p:WarningsAsErrors=NU5124%3BNU5125%3BNU5048` on the release pack exits 0.
5. **Set `PublishRepositoryUrl=true`, `IncludeSymbols=true`, `SymbolPackageFormat=snupkg` in `Directory.Build.props`.** Why: URL + commit in the nuspec; symbols the nuget.org symbol server accepts (and no `.symbols.nupkg`). Verify: `unzip -p artifacts/Ocx.Sdk.*.nupkg '*.nuspec' | grep -E -e '<repository type="git" url="https://[^"]+" .*commit="[0-9a-f]{40}"'` matches and `ls artifacts/*.snupkg` succeeds and `ls artifacts/*.symbols.nupkg` fails.
6. **No `Microsoft.SourceLink.GitHub|GitLab|AzureRepos.Git|Bitbucket.Git` PackageReference on SDK >= 8 for those hosts.** Why: bundled in the SDK; the reference overrides it and drags version conflicts. Verify: `grep -rn -E --include='*.csproj' --include='*.props' --include='*.targets' -e 'Microsoft\.SourceLink\.(GitHub|GitLab|AzureRepos\.Git|Bitbucket\.Git)' .` returns nothing (host-specific exceptions documented in a comment).
7. **`ContinuousIntegrationBuild` is set only under a CI-provider condition, never unconditionally and never from `Configuration`.** Why: unconditional breaks local source stepping; the SDK does not detect CI. Verify: `grep -rn --include='*.props' --include='*.targets' --include='*.csproj' -e 'ContinuousIntegrationBuild' .` shows every hit on a line containing `Condition=` (or via `DotNet.ReproducibleBuilds`); `GITHUB_ACTIONS=true dotnet msbuild src/Ocx.Sdk -getProperty:ContinuousIntegrationBuild -p:TargetFramework=net10.0` prints `true` and without the variable prints an empty value.
8. **Release packs run with `SOURCE_DATE_EPOCH=$(git log -1 --format=%ct)` on SDK >= 10.0.401; never `DeterministicTimestamp=true`.** Why: `true` is wall-clock, SDK 8 ignores the variable (V5). Verify: in a fresh clone in a second directory repeat step 5 of the release list and `test "$(sha256sum artifacts/*.nupkg | cut -d' ' -f1)" = "$(sha256sum ../other/artifacts/*.nupkg | cut -d' ' -f1)"`; `grep -rn -e 'DeterministicTimestamp>true' .` returns nothing.
9. **`dotnet-validate package local` (version pinned in `.config/dotnet-tools.json`) must exit 0 for every nupkg before publish; `package remote` after.** Why: it is the only tool that checks Source Link, Deterministic and Compiler Flags together and it caught CIB and remote-host defects (V2, V3). Verify: `dotnet tool run dotnet-validate package local artifacts/Ocx.Sdk.1.0.0.nupkg; echo $?` is 0, and `grep -n -e 'dotnet-validate' .config/dotnet-tools.json` shows an exact version.
10. **Version comes from the git tag via MinVer (`PackageReference Include="MinVer" PrivateAssets="all"`, `MinVerTagPrefix=v`); no `<Version>`, `<PackageVersion>`, `<AssemblyVersion>`, `<FileVersion>`, `<InformationalVersion>` in project files.** Why: single source of truth, mirrors tag-driven release; MinVer sets `{major}.0.0.0` AssemblyVersion. Verify: `grep -rn -E --include='*.csproj' --include='*.props' -e '<(Version|PackageVersion|AssemblyVersion|FileVersion|InformationalVersion)>' .` returns nothing; `grep -rn -e 'MinVer' --include='*.props' --include='*.csproj' .` shows `PrivateAssets`.
11. **The release job checks out with `fetch-depth: 0` and fails when the packed version starts with `0.0.0` or does not equal the tag.** Why: a shallow clone silently packs `0.0.0-alpha.0` (V8). Verify: `grep -n -e 'fetch-depth: 0' .github/workflows/release.yml` hits; `ls artifacts/*.nupkg | grep -v -e '/Ocx\.Sdk\.0\.0\.0'` is non-empty and `test "$(basename artifacts/Ocx.Sdk.*.nupkg .nupkg)" = "Ocx.Sdk.${GITHUB_REF_NAME#v}"`.
12. **No strong naming for a library whose TFMs are all net5.0+ (this SDK: net8.0+).** Why: no benefit on modern .NET; changing the key later is a breaking identity change. Verify: `git ls-files | grep -e '\.snk$'` prints nothing and `grep -rn -E --include='*.csproj' --include='*.props' --include='*.targets' -e 'SignAssembly' -e 'AssemblyOriginatorKeyFile' -e 'PublicSign' .` returns nothing; if a netstandard2.0 or net4x TFM is ever added, rule flips to "strong-name all TFMs".
13. **Publish only with NuGet Trusted Publishing: `NuGet/login` pinned to a full 40-hex SHA, `id-token: write` only on the publish job, a protected `environment`, no `NUGET_API_KEY` secret, `dotnet nuget push ... --skip-duplicate --source https://api.nuget.org/v3/index.json`.** Why: 1-hour single-use key, nothing to leak, idempotent re-runs. Verify: `grep -rn -E -e 'secrets\.NUGET[A-Z_]*API[A-Z_]*KEY' -e 'nuget push .* (-k|--api-key) \$\{\{ *secrets' .github/workflows` returns nothing; `grep -rn -E -e 'NuGet/login@[0-9a-f]{40}' .github/workflows` hits; `grep -rn -e 'id-token: write' .github/workflows` hits only in the publish job (reading heuristic: the line sits under a job that has `environment:`).
14. **Publish is reachable only from a version tag and downloads the exact artifacts the verify jobs checked.** Why: nuget.org versions are immutable; no rebuild between check and push. Verify: the publish job has `if: startsWith(github.ref, 'refs/tags/v')` (or `on.push.tags`), `needs:` the validate job, and uses `actions/download-artifact` (reading heuristic; `grep -n -e 'dotnet pack' .github/workflows/release.yml` shows exactly one pack job).
15. **`EnablePackageValidation=true`; `PackageValidationBaselineVersion` is unset for the first release and set to the latest stable immediately after each release.** Why: pack fails on breaking API changes (CP0002 etc.); an unpublished baseline fails restore (NU1102). Verify: `dotnet msbuild src/Ocx.Sdk -getProperty:EnablePackageValidation -p:TargetFramework=net10.0` prints `true`; after the first release `dotnet msbuild src/Ocx.Sdk -getProperty:PackageValidationBaselineVersion ...` equals `git describe --tags --abbrev=0 | tr -d v`.
16. **Gate on pack's exit code and the validate job, never on the existence of `*.nupkg`.** Why: a failed validation still writes the nupkg (V7). Verify: reading heuristic: the push step has `needs:` on a job whose steps are not `continue-on-error: true` (`grep -n -e 'continue-on-error' .github/workflows/release.yml` returns nothing).
17. **Do not author-sign at v1; if signing is introduced, SHA-256+ only, `--timestamper` always, never register a nuget.org certificate unless every future push is signed.** Why: cost and lock-in (finding 9); SHA-1 fingerprints are error NU3043 on SDK 10. Verify: `grep -rn -E -e '--certificate-fingerprint [0-9A-Fa-f]{40}( |$)' .github` returns nothing; `grep -rn -e 'dotnet nuget sign' -e 'sign code' .github/workflows` is empty or paired with `--timestamper` / `azure-key-vault` on a `windows-*` runner.
18. **Pin release tooling by exact version (`dotnet-validate`, `sign`, `sourcelink`, ApiCompat) in `.config/dotnet-tools.json` or `--version`.** Why: `dotnet-validate` is preview; floating versions change the gate. Verify: `dotnet tool list --local` shows exact versions; `grep -rn -E -e 'dotnet tool install [^ ]+( |$)' .github/workflows | grep -v -e '--version'` returns nothing.
19. **After the first publish, request an ID prefix reservation and confirm `verified` is true.** Why: protects the namespace and shows the check mark. Verify: `rtk proxy curl -s 'https://azuresearch-usnc.nuget.org/query?q=packageid:Ocx.Sdk&take=1' | python3 -I -c "import sys,json; print(json.load(sys.stdin)['data'][0].get('verified'))"` prints `True` (plain `curl` if no wrapper is installed).
20. **README images in the packed readme use allow-listed HTTPS hosts and absolute URLs.** Why: other images do not render on nuget.org and a fix needs a new version. Verify: `grep -n -E -e '!\[[^]]*\]\((\./|\.\./|[^h])' README.md` returns nothing; `grep -n -o -E -e '!\[[^]]*\]\(https://[^/]+' README.md` lists only hosts such as `img.shields.io`, `raw.githubusercontent.com`.
21. **Cite target SDK in `global.json`; pack with the newest SDK, not the floor.** Why: SDK 8 cannot pack a net10.0 target and ignores `SOURCE_DATE_EPOCH`. Verify: `dotnet --version` in the release job equals `global.json`; `grep -n -e '"version"' global.json`.
22. **Verify symbols resolve after publishing: `sourcelink test` on the downloaded snupkg PDB passes.** Why: proves the URL + commit map reaches a public raw file (V11). Verify: `curl -sL -o s.snupkg https://www.nuget.org/api/v2/symbolpackage/Ocx.Sdk/<ver> && unzip -q s.snupkg -d sp && sourcelink test sp/lib/net8.0/Ocx.Sdk.pdb` prints `sourcelink test passed`.

## AI-agent angle

| Typical wrong output | Why it compiles / ships | Smallest mechanical check |
|---|---|---|
| csproj with only `<TargetFramework>` and no packaging block | pack exits 0, 0 warnings | `check-package.sh` or rule 2 `-getProperty` loop |
| `PackageLicenseUrl`, `PackageIconUrl`, `<licenseUrl>` (pre-2019 NuGet advice) | warnings NU5125 / NU5048 only | rule 4 grep; `-p:WarningsAsErrors=NU5125` |
| Adds `Microsoft.SourceLink.GitHub` (often with a floating or old `1.1.1` version, often without `PrivateAssets`) | builds fine; overrides the SDK's copy | rule 6 grep |
| Sets `ContinuousIntegrationBuild=true` unconditionally, or believes the SDK sets it on CI | PDB then has `/_/` locally, or CI has absolute paths | rule 7 grep + `-getProperty` with/without `GITHUB_ACTIONS` |
| Uses `DeterministicTimestamp=true` or `Deterministic=true` and claims a "reproducible package" | nupkg hashes differ run to run | rule 8 two-clone `sha256sum` |
| `IncludeSymbols=true` without `SymbolPackageFormat=snupkg`, or pdb via `AllowedOutputExtensionsInPackageBuildOutputFolder` copied from Polly/nodatime | creates `.symbols.nupkg`, or pack succeeds while `dotnet-validate` skips checks | `ls artifacts/*.symbols.nupkg` must fail; `dotnet-validate` must say `Valid`, not `No files found` |
| `<Version>1.0.0</Version>` hand-edited, or `GitVersion`/`nbgv` config invented without `fetch-depth: 0` | packs `0.0.0-alpha.0` or a stale number | rule 10 grep, rule 11 guard |
| `<SignAssembly>true</SignAssembly>` + generated `.snk` "for NuGet" (Framework-era habit) | compiles; irreversible identity | rule 12 grep |
| `secrets.NUGET_API_KEY` + `dotnet nuget push -k`; or `NuGet/login@v1` by tag, `user:` an email | works until the key leaks; tag can move | rule 13 greps |
| `dotnet nuget push *.nupkg` from a pull-request workflow, or in the same job that builds, no `--skip-duplicate` | publishes unvetted builds; re-run fails on duplicate | rule 14 reading check + `--skip-duplicate` grep |
| Invents `dotnet pack --include-symbols --include-source` or `nuget.exe push -Symbols` | legacy flags that bypass snupkg | rule 1 grep; rule 5 `ls` |
| Suggests `nuget sign` with a SHA-1 thumbprint or self-signed cert and `nuget.org` upload | NU3043 error on SDK 10, NU3018 locally, rejected by nuget.org | rule 17 grep |
| Calls `dotnet validate` a built-in SDK subcommand | it is the separate `dotnet-validate` tool (`dotnet tool install dotnet-validate --prerelease`) | `dotnet tool list --local` shows it pinned |
| Enables `EnablePackageValidation` with `PackageValidationBaselineVersion` equal to the version being released for v1.0.0 | restore fails NU1102 (baseline unpublished) | rule 15 |
| Edits the README on nuget.org expectations ("I'll fix the readme later") | metadata is immutable per version | rule 20 pre-push grep, `check-package.sh` |

## Contested / evolving

- **SourceLink package redundancy (settled on SDK 8, 2023).** 12 corpus repos still reference `Microsoft.SourceLink.*`; the SDK bundles it since .NET 8 Preview 4 for four hosts. Trend: drop the reference; keep it only for Gitea, GitWeb or Azure DevOps Server (sourcelink README).
- **Strong naming.** Microsoft: "no benefits on .NET Core/5+" (updated 2026-03); the large installed base of `.snk` files is inertia from netstandard / net4x targets. Trend: new modern-only libraries skip it (12 of the 35 corpus repos). Not reproduced: the CS8002 warning behavior.
- **Package determinism is moving into pack itself.** `Deterministic` and `DeterministicTimestamp` for pack, plus `SOURCE_DATE_EPOCH`, are documented as NuGet 7.9.0 / .NET 11 features and already work on SDK 10.0.401; the doc says the default becomes `true` in .NET 11, but `true` for the timestamp still means wall clock, and SDK 11.0 RC1 packs measured non-identical without a fixed timestamp. Do not assume .NET 11 GA gives byte-identical nupkgs by default (as of RC1, 2026-10).
- **Author signing.** Polly and openai-dotnet do it; most do not. Microsoft recommends it where publisher identity matters but nuget.org already adds a repository signature. The cost side (certificate authority, Key Vault, Windows x64 runner, forced-signing after registration) is unpriced here; trend among large vendors is signing plus build attestations (`actions/attest`), among small libraries neither.
- **Trusted Publishing is new (2025) and still rolling out features.** The page was edited 2026-09-01 (GitLab section, scopes, policy owner warnings); `NuGet/login` v1.2.0 is the pinned version in all three exemplars checked. GitVersion and xunit still publish with stored keys. Trend: OIDC wins; the open issue is that first-ever publish of a new package id needs a policy whose scope allows new packages (docs describe scopes; I did not exercise it).
- **Embedded vs snupkg symbols.** DotNet.ReproducibleBuilds defaults to `embedded` (bigger assemblies, no second artifact, works on feeds without snupkg); Microsoft/nuget.org and Polly/serilog use snupkg. `dotnet-validate` accepts both when the remote is recognized. For a nuget.org-only SDK snupkg wins on package size (6.7 KB vs 21.2 KB in the fixture); revisit if a private feed without snupkg support is added.
- **Version tool.** MinVer (tag-driven, 3 corpus repos) vs Nerdbank.GitVersioning (version.json + height, 7 repos) vs GitVersion (5): all work if history is available. The choice here is made for parity with the tag-driven Python release, not because the others are wrong.
- **Prefix reservation channel** is documented as an email to `account@nuget.org` (page dated 2022-09-20); the process may have moved to a form. Confirm at application time.
- **`dotnet-validate` is a preview tool** (`0.0.1-preview.582`); its false-positives (`Contains untracked sources (obj)` on embedded PDBs when the remote is unrecognized, `No files found to validate` when the pdb is inside the nupkg) are tool behavior, so treat exit 1 as a gate but read the message.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://learn.microsoft.com/en-us/nuget/reference/msbuild-targets | NuGet pack/restore MSBuild property reference | updated 2026-07 | exact pack properties, icon/readme packing, `Deterministic`/`DeterministicTimestamp`/`SOURCE_DATE_EPOCH` (NuGet 7.9) |
| https://learn.microsoft.com/en-us/nuget/nuget-org/trusted-publishing | nuget.org Trusted Publishing | updated 2026-09-01 | policy fields, 1-hour single-use key, `NuGet/login` YAML, GitLab flow, private-repo 7-day window |
| https://github.com/NuGet/login | `NuGet/login` GitHub Action README | 2025-26 | inputs `user`, outputs `NUGET_API_KEY`, permissions |
| https://learn.microsoft.com/en-us/nuget/create-packages/package-authoring-best-practices | Microsoft package authoring best practices | updated 2025-10 | DO/DO NOT list for metadata, license, icon, readme, SourceLink |
| https://learn.microsoft.com/en-us/nuget/nuget-org/id-prefix-reservation | ID prefix reservation | page 2022-09 | criteria, verified indicator, application process |
| https://learn.microsoft.com/en-us/nuget/create-packages/symbol-packages-snupkg | snupkg creation and nuget.org symbol server | updated 2026-05 | constraints (portable PDB only), push behavior, structure |
| https://learn.microsoft.com/en-us/nuget/nuget-org/package-readme-on-nuget-org | Readme rendering on nuget.org | updated 2026-07 | allowed image domains, Markdown features, immutable-after-publish |
| https://learn.microsoft.com/en-us/nuget/nuget-org/nuget-org-faq | nuget.org FAQ | updated 2025-10 | 250 MB limit, no delete, no metadata edit, username change effects on repository signature |
| https://learn.microsoft.com/en-us/nuget/create-packages/sign-a-package | Signing NuGet packages | updated 2025-12 | CA cert requirement, registration forces signing, self-issued rejected |
| https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-nuget-sign | `dotnet nuget sign` reference | updated 2025-12 | options, SHA-256 default, SHA-1 deprecation |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/10.0/dotnet-nuget-sign-sha1-deprecated | SDK 10 breaking change | 2025-11 | NU3043 warning to error |
| https://learn.microsoft.com/en-us/dotnet/core/tools/nuget-signed-package-verification | Signed-package verification per OS | updated 2024-03 | Linux/macOS verification caveats |
| https://raw.githubusercontent.com/dotnet/sign/main/README.md | dotnet/sign CLI README | 2026 | prerequisites (Windows x64), supported file types incl. nupkg, RSA PKCS#1 only |
| https://raw.githubusercontent.com/dotnet/sourcelink/main/README.md | dotnet/sourcelink README | SDK 8+ era | bundled hosts, `PrivateAssets`, PDB distribution comparison table |
| https://raw.githubusercontent.com/dotnet/sourcelink/main/docs/README.md | sourcelink docs: CI, determinism, embed untracked sources | SDK 8+ era | `DeterministicSourcePaths` CI-only warning, `Deterministic` + CIB |
| https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/sourcelink | Microsoft SourceLink library guidance | page 2019, updated 2025-07 | the "CONSIDER" level of Microsoft's recommendation |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/8.0/source-link | .NET 8 SDK breaking change: SourceLink included | 2023-11 | proves SDK inclusion and the InformationalVersion side effect |
| https://learn.microsoft.com/en-us/dotnet/core/project-sdk/msbuild-props | SDK MSBuild property reference | 2026 | `ContinuousIntegrationBuild`, `SourceRevisionId`, package validation properties |
| https://raw.githubusercontent.com/dotnet/reproducible-builds/main/README.md | DotNet.ReproducibleBuilds README | 2026 | what the package sets on CI |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/package-validation/overview | Package validation overview | updated 2025-08 | three validators, `EnablePackageValidation` |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/global-tool | Microsoft.DotNet.ApiCompat.Tool | updated 2026-02 | `apicompat package ... --baseline-package` command |
| https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/strong-naming | Strong naming and .NET libraries | updated 2026-03 | when to strong-name, key permanence, examples |
| https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/versioning | Versioning and .NET libraries | updated 2025-12 | the four version numbers and what to set |
| https://raw.githubusercontent.com/adamralph/minver/main/README.md | MinVer README | MinVer 8 era | version algorithm, assembly/file version, shallow clone fallback |
| https://raw.githubusercontent.com/dotnet/Nerdbank.GitVersioning/main/README.md | Nerdbank.GitVersioning README | 2026 | alternative version source, version.json model |
| https://www.nuget.org/api/v2/symbolpackage/Serilog/4.2.0 and https://api.nuget.org/v3-flatcontainer/serilog/4.2.0/serilog.4.2.0.nupkg | a real published nupkg and snupkg | Serilog 4.2.0 | positive control: `/_/` map, repository signature, `sourcelink test` passes |
