# dotnet-build

Standards for the files a C# compiler never checks: the projects, props, SDK pin, NuGet config, analyzer severity and ban files, the workflows and build scripts that run the build, and the pack properties. It holds the gate, 12 merge-blocking non-negotiables and one depth file routed to by task.

```sh
grim add ghcr.io/ocx-sh/lore/dotnet-build
```

Loads on 22 globs: `**/*.csproj`, `**/*.props`, `**/*.targets`, `**/*.proj`, `**/*.slnx`, `**/*.sln`, `**/global.json`, `nuget.config` in all three spellings, `**/.globalconfig`, `**/*.globalconfig`, `**/BannedSymbols*.txt`, `**/PublicAPI*.txt`, `**/PublicAPI/**/*.txt`, `**/packages.lock.json`, `**/dotnet-tools.json`, `.github/**/*.y*ml` and the `**/*.ps1`, `**/*.sh`, `**/*.cmd` and `**/[Bb]uild.*` scripts. A workflow or build-script edit meets the DN-RULE and CS-BUILD rows here. The index is always present. The depth file is read only when the work calls for it. It ships beside `csharp-quality` in `dotnet-essentials`.

## It starts by pinning the SDK that runs

A malformed `global.json` silently selects the newest installed SDK, prerelease included (SDK 11.0.100-rc.1 on the measuring host, measured 2026-10-11). That can change which restore codes exist, and the visible failure is an unrelated MSB4242 cascade. `dotnet --version` is one line and settles it.

So the first gate line is a command, not a rule: assert the SDK before the first build (CS-BUILD-21). The gate runs from the build root against the one solution the repository names, and it reads the `global.json` the SDK itself would find. Then restore into an empty packages folder with the audit asserted (CS-BUILD-27), build with warnings as errors from the props (CS-BUILD-13), format-verify, and test with the zero-test gate (the MTP exit codes, or one `Passed!` line per project under VSTest). The same gate block is quoted in `csharp-quality`, owned by CS-BUILD-16.

## What agents get wrong by default, measured

Measured 2026-10-11 on SDK 10.0.401 with NuGet 7.9.0, built for `net8.0` and `net10.0`. Windows, macOS and arm64 rows are marked `unverified: read only`, and so is every nuget.org write path.

Agents copy habits that no longer hold. `MinVer` as a `PackageReference Version=` fails with NU1008 under central package management, and `ContinuousIntegrationBuild` set unconditionally or keyed on `CI` breaks local source stepping. `GenerateDocumentationFile=false` in a test project fails with `error EnableGenerateDocumentationFile`. `--tl:off` on `dotnet test` exits 5 under Microsoft.Testing.Platform.

Gates fail quietly. A ban file that is not an `AdditionalFiles` item, or is not named `BannedSymbols.txt` or `BannedSymbols.*.txt`, bans nothing and the build exits 0. A symbol listed twice is an RS0031 error. A project with no `PublicAPI.Shipped.txt` reports 12 RS0016 and 8 RS0037 until it is marked `IsPackable=false`. A pack with a baseline equal to the version being released fails with NU1102.

## What is in it

The index carries the gate, 12 non-negotiables and the 27 CS-BUILD rules it owns outright, one line each. `packaging.md` holds 16 CS-PKG rules, 12 of them MUST and 4 SHOULD: the metadata block, SourceLink and CI-build properties, symbols, deterministic packing, tag-derived versions, strong-naming policy, package validation, Trusted Publishing and the tag-only push.

Every rule carries an ID, a rationale, a runnable verification and a severity. Each verification says which way empty output reads, and an unset operand (`SLN`, `BASE`, `G`, `CIF`) prints `MISSING <x>` instead of passing. A rule that does not bind everywhere leads with a tag (`library`, `app`, `packable-library`, `zero-dependency`, `cli-wrapper`, `gha`, `greenfield`), defined once in `csharp-quality`: the CS-PKG rows and the TFM rows bind packable libraries only, and a tool, sample, test or analyzer project in the same repository is outside them. The index also carries the routing table and cites the owner defaults that `csharp-quality` lists.

Six shipped files sit in a `checks/` directory the rules name by path: `BannedSymbols.txt`, `BannedSymbols.Src.txt`, `analyzers.globalconfig`, `analyzers.editorconfig`, `Directory.Packages.analyzers.props` and `posture-check.sh`. They are the analyzer posture, one line per ID with the owning rule in a trailing comment. The editorconfig carries path sections for test projects and for committed generator output, and `Path.Combine` is banned in `src` only. `posture-check.sh` fails on a symbol listed twice, a missing RS0030 or RS0031 error line, an unregistered ban file or a deleted severity line.

## Pinned decisions

Some rules encode an agreed decision rather than a derivable fact. They are marked pinned.

SDK 10.0.401 with `rollForward: latestFeature` and no prerelease. `LangVersion` 14 and `AnalysisLevel` `10.0-all`. Five analyzer packs and MinVer as `GlobalPackageReference` with exact versions: BannedApiAnalyzers 5.6.0, PublicApiAnalyzers 5.6.0 for packable projects, VS.Threading.Analyzers 18.7.23, IDisposableAnalyzers 4.0.8 and Meziantou.Analyzer 3.0.297 with mode `None`. Never StyleCop, Roslynator or the NetAnalyzers package.

One root `.globalconfig`, never a second file to relax severities. A library ships no lock file, and `dotnet pack` runs with package validation and a nuspec budget. The repo-wide `none` list is exactly CA1303, CA1308, CA1716, CA1867 and VSTHRD003, each with a reason line. Each is a default an adopter overrides once, in the props. Overriding one is a decision, recorded with its reason. Ignoring one is a violation.

## What it does not cover

C# source is `csharp-quality`, on `**/*.cs`, `**/*.csx` and `**/*.cake`. This rule never loads on a source edit, and writing a workflow or a CI matrix (CS-CI) is `csharp-quality` too. It does not load on `.editorconfig`, Dockerfiles, `*.fsproj`, `*.vbproj`, `*.ruleset` or `*.nuspec`. `.editorconfig` is not .NET-specific, and CS-CORE-01 routes `.editorconfig` edits here.

It does not restate MSBuild or the NuGet docs, which the model already knows. The release procedure is `dotnet-release`. Windows, macOS and arm64 runs are read-only here.

## Siblings

`csharp-quality` owns CS-CORE and the source families. It loads on `*.cs`, `*.csx` and `*.cake`, so a source edit never pays for this rule and a build-file, workflow or build-script edit always does.

`dotnet-upgrade`, `dotnet-diagnose` and `dotnet-release` are procedures that cite this set's rule IDs by number and never restate them. Bundled with `csharp-quality` and `code-docs` as `dotnet-essentials`.
