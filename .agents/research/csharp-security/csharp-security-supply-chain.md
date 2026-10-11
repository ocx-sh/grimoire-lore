---
title: "Supply chain for a .NET library: runtime-dependency budget, PrivateAssets, build-time code, signatures, SBOM, updaters"
topic: csharp-security / csharp-security-supply-chain
agent: deep-dive researcher (sonnet subagent, research-lang csharp, wave 2, group "Security: unsafe APIs, supply chain, binary trust")
model: claude-sonnet-5-5
date_researched: 2026-10-11
sources_count: 39
scope: |
  Covers: the runtime-dependency budget of a library and its nuspec check; how build-only packages leak into the nuspec and what a consumer restores because of it (three declaration mechanisms measured, plus a CPM no-op); the build-time code-execution surface (package .props/.targets, analyzers, generators) and an inventory check; nuget.config trustedSigners / signatureValidationMode=require, its per-OS enforcement, owners allowlists, fingerprint upkeep and cost; `dotnet nuget verify`; typosquatting, the reserved-prefix `verified` flag and AI-hallucinated package names; SBOM (Microsoft.Sbom.Targets vs CycloneDX); Dependabot/Renovate with CPM and cooldown; dependency licence expressions; the review rule for adding a package. 39 sources read (17 primary web, 2 secondary/live-service, 20 exemplar files); 13 red/green pairs plus one A/B (SBOM) run on SDK 10.0.401 (several re-run on 11.0.100-rc.1).
  Does not cover: NuGetAudit, CPM, package source mapping, lock files, TWAE for NU190x (settled in CS-BUILD-13/-26/-27, only cited); NuGet pack metadata and Trusted Publishing (CS-PKG); verifying the downloaded ocx binary (sibling csharp-security-binary-attestation, PK-12); deserialization/crypto/unsafe APIs (sibling csharp-security-unsafe-apis). Windows and macOS were not run: the macOS claims rest on Microsoft's docs plus a Linux simulation of the same switch (flagged where used).
---

# Supply chain for a .NET library

Fixtures: `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-security-supply-chain/` (cited as `$FIX`). Tool wrapper: `/home/mherwig/.cache/research-lang/dotnet-tools/run.sh`. SDK 10.0.401 (NuGet 7.9) unless stated. Exemplar cites are `owner__repo@sha12:path:line` under `/home/mherwig/.cache/research-lang/exemplars/csharp/`. Rule IDs CS-BUILD-nn / CS-PKG-nn / CS-JSON-nn refer to the waves 1-2 rules; they are cited, not re-decided.

## Contents

1. [Summary](#summary)
2. [Findings](#findings)
   - 2.1 Runtime-dependency minimalism: the budget and its check
   - 2.2 What leaks into the nuspec, and what the consumer pays
   - 2.3 Three ways to declare a build-only package (and one that silently does nothing)
   - 2.4 The build-time code-execution surface
   - 2.5 Signature validation: `require`, trustedSigners, owners, and what it costs
   - 2.6 `dotnet nuget verify` as an audit step
   - 2.7 Typosquatting, the reserved-prefix flag, and hallucinated package names
   - 2.8 SBOM: Microsoft.Sbom.Targets vs CycloneDX
   - 2.9 Dependabot and Renovate with CPM; cooldown
   - 2.10 Dependency licence expressions
   - 2.11 The review rule for adding a package
   - 2.12 Verified on the toolchain
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- A library's runtime `PackageReference` set is the consumer's transitive graph. Peers closest in shape ship zero on net8/net10 ([SimpleExec 13.1.0](https://api.nuget.org/v3-flatcontainer/simpleexec/13.1.0/simpleexec.nuspec), Serilog 4.4.0, Dapper 2.1.89, Polly.Core 8.8.0 on net8); SDK-class libraries ship 1-4 `System.*`/`Microsoft.Extensions.*` packages (OpenAI 2.14.0: 1 on net10, 3 on net8; StackExchange.Redis 3.4.0: 3/4). Budget for the ocx SDK: net10.0 group empty, net8.0 group at most `System.Text.Json` (CS-JSON), checked on the packed nuspec.
- The brief's "zero on net8+" does not hold once CS-JSON puts the STJ 10 package on net8: measured net8.0 consumer graph = `System.Text.Json` + `System.IO.Pipelines` + `System.Text.Encodings.Web` (3 packages), net10.0 = 0 after pruning. Record this as the one accepted cost, not as zero.
- Every `PackageReference` without `PrivateAssets="all"` becomes a nuspec `<dependency … exclude="Build,Analyzers"/>`. `developmentDependency=true` inside the *dependency's own* nuspec does not prevent it: 8 build-only packages leaked as 16 dependency elements across two TFM groups, and a consumer restored 11 packages (103 MB) instead of 1 (0.45 MB).
- The cheapest structural fix is `GlobalPackageReference` in `Directory.Packages.props`: measured to never appear in the nuspec. Per-project `PrivateAssets="all"` on the `PackageReference` is the fallback. `PrivateAssets` on a `<PackageVersion>` is a silent no-op (measured leak); openai-dotnet carries a 10-line MSBuild bridge precisely because CPM does not propagate it.
- The mechanical gate is evaluation, not text search: `dotnet msbuild -p:TargetFramework=<tfm> -getItem:PackageReference` filtered to `PrivateAssets != all` lists exactly the runtime dependencies (red 8, green 0), and the nuspec grep confirms the pack.
- A restore never runs package code; a build does. A package with `build/*.targets` ran `Exec` as the user on `dotnet build` (marker file written); `ExcludeAssets="build;buildtransitive;buildmultitargeting"` stopped it. Inventory build-time code with the `obj/*.nuget.g.{props,targets}` imports and `-getItem:Analyzer`, and put every package that ships build/analyzer assets on a reviewed list.
- `signatureValidationMode=require` works on Linux and Windows and is a silent no-op where verification is off: with `DOTNET_NUGET_SIGNATURE_VERIFICATION=false` an unsigned package restored under `require`. Microsoft documents verification as off by default on macOS. Never claim the macOS CI leg enforces it.
- With `trustedSigners` pinning the nuget.org repository certificate, `require` costs no restore time (2.7-3.2 s for 20 packages, accept vs require within noise) and no per-package list: every nuget.org package carries the repository signature. Its real costs are fingerprint upkeep, breakage for any unsigned feed (the openai-dotnet repo uses two unsigned Azure DevOps feeds), and zero protection against a typosquat, which nuget.org signs like any other package.
- The only signature control that blocks a malicious-but-signed package is the `owners` allowlist on the trusted repository (measured, case-sensitive, exit 1 when an owner is missing). It must list every transitive owner, so it fits a locked tool/test closure, not a floating graph. Verdict: SHOULD for a mirror/proxy setup, MAY otherwise; default stays `accept`.
- `dotnet nuget verify --all <pkg>` exits 1 on an unsigned package (NU3004) and 0 on a repository-signed one; `--certificate-fingerprint` turns it into an equality pin (exit 1 on mismatch, NU3034). Over the 235 nupkgs in the toolchain cache: 220 repository-signed, 179 author-signed, 15 unsigned (all local fixtures).
- The reserved-prefix checkmark is the search API's `verified` field and is queryable: of simple-exec's 10 central packages, 6 are `verified:true`, 4 are `false` (MinVer, Bullseye, GitHubActionsTestLogger, PublicApiGenerator - all legitimate). It is a consumer signal, not a gate. A name that does not exist returns `data:[]`, which is the mechanical catch for an LLM-invented package id.
- SBOM verdict: not required for a library with a zero-to-three-package graph. If emitted, use CycloneDX (`dotnet-CycloneDX … -ed`) as a release asset: it resolved `MIT` licences and omitted the build-only package, 6.4 KB. Microsoft.Sbom.Targets embeds `_manifest/spdx_2.2/manifest.spdx.json` in the nupkg (+2.4 KB compressed, 13 MB package, 49 MB extracted) but wrote `NOASSERTION` for every licence and listed itself.
- Dependabot has a native `nuget` ecosystem that detects `Directory.Packages.props`, a `cooldown` (default 3 days since 2026-07-14, security updates exempt), `groups`, and a `dotnet-sdk` ecosystem. Pin intent belongs in `ignore:` with a comment (Polly, openai-dotnet do this). The review rule, not the bot, decides whether a new package enters.
- Licence expressions are checkable on the consumer side from `project.assets.json` plus each nuspec: 187 MIT, 21 Apache-2.0, 1 BSD-3-Clause expressions and 6 `type="file"` licences in the cache; a package with no `<license type="expression">` is a review flag.
- Adding a package is a six-question review (necessity, existence and ownership, build assets, licence, age, blast radius) with a script for each question; the first question is "does the BCL already do this" (NU1510 flags the pruned case).
- Dependency-count and signature rules are the cheap part; the dominant 2025-26 attack on .NET consumers is a typosquat that runs at build (`.targets`) or load, signed by nuget.org. The two checks that matter are existence/ownership of every new id and a reviewed list of packages that ship build assets.

## Findings

### 2.1 Runtime-dependency minimalism: the budget and its check

**Why it matters.** Pack writes one `<group targetFramework=…>` per TFM into the nuspec, listing every `PackageReference` that is not private ([NuGet docs: Controlling dependency assets](https://learn.microsoft.com/en-us/nuget/consume-packages/package-references-in-project-files#controlling-dependency-assets)). The consumer restores that closure, audits it (NuGetAudit transitive, CS-BUILD-26), and inherits its advisories.

**Peer measurement** (latest stable on nuget.org read 2026-10-11 from the flat-container nuspec; `python3 -I` script in the research scratchpad):

| Package | net8.0 group | net10.0 group |
|---|---|---|
| SimpleExec 13.1.0 | 0 | 0 |
| Serilog 4.4.0 | 0 | 0 |
| Dapper 2.1.89 | 0 | 0 |
| Polly.Core 8.8.0 | 0 | (not a TFM) |
| CliWrap 3.10.5 | (not a TFM) | 0 |
| Spectre.Console 0.57.2 | 1 (Spectre.Console.Ansi) | 1 |
| OpenAI 2.14.0 | 3 (System.ClientModel, System.Diagnostics.DiagnosticSource, System.Net.ServerSentEvents) | 1 (System.ClientModel) |
| Anthropic 12.55.0 | 3 (Microsoft.Extensions.AI.Abstractions, System.Net.ServerSentEvents, System.Text.Json) | (not a TFM; net9.0 has the same 3) |
| StackExchange.Redis 3.4.0 | 4 | 3 |
| Stripe.net 53.0.0 | 2 (Newtonsoft.Json, System.Configuration.ConfigurationManager) | 2 |

Two readings. The libraries whose job is closest to the ocx SDK (a thin process wrapper: SimpleExec, CliWrap) ship none. SDK-class HTTP clients (OpenAI, Anthropic) accept 1-3 packages that Microsoft owns, and the count drops on the newest TFM because of NuGet pruning.

**The net8 STJ cost, measured.** With CS-JSON's `System.Text.Json` 10.x on both TFMs (`$FIX/sbom/src/Lib.csproj`), `dotnet package list --include-transitive` shows:

```
[net8.0]:  System.Text.Json 10.0.12 (top-level) + System.IO.Pipelines 10.0.12 + System.Text.Encodings.Web 10.0.12 (transitive)
[net10.0]: System.Text.Json 10.0.12 (top-level), no transitive
```

and the packed nuspec is `<group targetFramework="net10.0" />` (empty, pruned by `PrunePackageReference`, on by default for net10+ per [NuGet docs](https://learn.microsoft.com/en-us/nuget/consume-packages/package-references-in-project-files#prunepackagereference)) plus `<group targetFramework="net8.0"><dependency id="System.Text.Json" version="10.0.12" exclude="Build,Analyzers"/>`. So the honest budget is "net10.0: 0; net8.0: 1 direct, 2 transitive". The floor decision (net8.0, CS-BUILD) is what makes this non-zero; a floor of net10.0 would make it zero.

**Which command shows what (and which one lies).**

| Command | Shows | Misleads when |
|---|---|---|
| `unzip -p artifacts/*.nupkg '*.nuspec'` | what a consumer will restore (the truth) | never |
| `dotnet package list --include-transitive [-f net8.0]` (`dotnet list package` before SDK 10) | the project's own graph | it includes `PrivateAssets=all` packages: Microsoft.Sbom.Targets showed as top-level on both TFMs ([docs](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-package-list)) |
| `dotnet package list --format json` | same, machine-readable | same |
| `dotnet msbuild -p:TargetFramework=net10.0 -getItem:PackageReference` + `PrivateAssets` filter | pre-pack: the runtime dependency set | `GlobalPackageReference` appears with `PrivateAssets:"All"` (correct) |

Do not gate on `dotnet package list`; gate on the nuspec and on the evaluated items.

### 2.2 What leaks into the nuspec, and what the consumer pays

**Default.** `PrivateAssets` defaults to `contentfiles;analyzers;build`; `IncludeAssets` to `all`; so a bare `PackageReference` is still a dependency, only its build/analyzer assets stop flowing ([NuGet docs table](https://learn.microsoft.com/en-us/nuget/consume-packages/package-references-in-project-files#controlling-dependency-assets)). That default is exactly what the packed nuspec shows: `exclude="Build,Analyzers"`.

**Wrong** (`$FIX/leak-red/src/Lib.csproj`; 8 build-only packages, no metadata):

```xml
<PackageReference Include="Microsoft.CodeAnalysis.BannedApiAnalyzers" Version="5.6.0" />
<PackageReference Include="MinVer" Version="8.0.0" />
<PackageReference Include="Meziantou.Analyzer" Version="3.0.297" />
<PackageReference Include="Microsoft.VisualStudio.Threading.Analyzers" Version="18.7.23" />
<PackageReference Include="DotNet.ReproducibleBuilds" Version="2.0.5" />
<PackageReference Include="Polyfill" Version="11.4.3" />
<PackageReference Include="Microsoft.SourceLink.GitHub" Version="8.0.0" />
<PackageReference Include="Microsoft.Sbom.Targets" Version="4.1.13" />
```

`dotnet pack -c Release` on `net8.0;net10.0` writes, in each of the two TFM groups, 8 elements like
`<dependency id="MinVer" version="8.0.0" exclude="Build,Analyzers"/>` (16 total).

**Right** (`$FIX/leak-green/src/Lib.csproj`): the same eight with `PrivateAssets="all"` → `grep -c '<dependency '` = 0 and the nuspec has no `<dependencies>` element.

**`developmentDependency` does not rescue you.** All seven of these packages declare `<developmentDependency>true</developmentDependency>` in their own nuspec (read from the packages folder), yet they leaked. The NuGet docs note says the flag "prevents the package from being included as a dependency in other packages" and "will exclude compile-time assets" ([NuGet docs note](https://learn.microsoft.com/en-us/nuget/consume-packages/package-references-in-project-files#controlling-dependency-assets)); measured on SDK 10.0.401, it does neither for a hand-written `PackageReference`. What it does do is change what `dotnet add package` writes (next section).

**Consumer cost, measured** (local feed + nuget.org, fresh `--packages` folder per run, net10.0 consumer of the packed library):

| Consumer of | packages restored | bytes in packages folder |
|---|---|---|
| `leak-red` (bare) | 11 (the 8 + Microsoft.Build.Tasks.Git, Microsoft.SourceLink.Common, Leak.Lib) | 102,998,305 |
| `leak-green` (private) | 1 | 449,195 |

Their analyzers and targets did *not* run in the consumer (`exclude="Build,Analyzers"`), so the harm here is size, restore time, advisory surface (NuGetAudit audits every node in the graph) and review noise, not code execution. Sources of "bare reference" in the corpus are rare: a census of the 35 exemplar clones (`python3 -I`, XML-parsed `.csproj/.props/.targets`, known build-only ids only) found 24 repos using build-only packages: ~200 `PrivateAssets="all"` references, 12 `GlobalPackageReference`, and 4 bare references (3 inside analyzer-authoring repos where leaking is the point; 1 is the openai case below that is bridged by MSBuild).

### 2.3 Three ways to declare a build-only package (and one that silently does nothing)

All measured with `dotnet pack` on SDK 10.0.401, nuspec read with `unzip -p … '*.nuspec'`.

| Mechanism | Where declared | Appears in nuspec? | Evidence |
|---|---|---|---|
| `PrivateAssets="all"` on the `PackageReference` | each project (or `Directory.Build.props` `ItemGroup`) | no | `leak-green`: 0 elements |
| `<GlobalPackageReference Include=… Version=… />` | `Directory.Packages.props` (CPM) | no | `$FIX/gpr/`: Banned+MinVer as global, `Meziantou.Analyzer` as plain `PackageReference` → only Meziantou in the nuspec |
| `PrivateAssets` on `<PackageVersion>` | `Directory.Packages.props` | **yes - the attribute is ignored** | `$FIX/pv-priv/`: `MinVer` listed in the nuspec despite `PrivateAssets="All"` on its `PackageVersion` |

The third row is an AI-agent trap: it looks centralised and compiles, restores and packs without a warning. The openai-dotnet maintainers hit it and wrote a bridge, quoted with its own explanation: `openai__openai-dotnet@1f0e8829acac:Directory.Build.targets:3-28` ("CPM does not propagate metadata such as PrivateAssets from PackageVersion to PackageReference. This bridges that gap …") using `<PackageReference Update="@(_CpmPrivateAssets)" PrivateAssets="%(_CpmPrivateAssets.PrivateAssets)" />`, with the declarations at `openai__openai-dotnet@1f0e8829acac:Directory.Packages.props:19-20`. That bridge works, but it is 10 lines of evaluation-order-sensitive MSBuild a reviewer must trust; `GlobalPackageReference` needs none.

`GlobalPackageReference` is already common in the corpus: `Humanizr__Humanizer@4574b93883bf:Directory.Packages.props:8` (Nerdbank.GitVersioning), `DapperLib__Dapper@eb47546a408b:Directory.Packages.props:56` (ReferenceTrimmer), `microsoft__vs-threading@f6d817997090:Directory.Packages.props:53-62` (7 analyzers/build tools), `MessagePack-CSharp__MessagePack-CSharp@242bdad51f89:Directory.Packages.props:75-77`, `dotnet__BenchmarkDotNet@61ebda8a50ae:build/common.props:67-68`, `coverlet-coverage__coverlet@ecd6fd5533e7:Directory.Packages.props:7`. Caveat: it applies to every project in the tree, test projects included; that is wanted for analyzers and MinVer, wrong for a tool that only one project needs (and for Polyfill, which CS-BUILD-06 conditions on `netstandard2.0`) - those stay `PackageReference … PrivateAssets="all"`. Whether Dependabot rewrites `GlobalPackageReference` versions was not verified here (Dependabot's updater post only names `Directory.Packages.props` generally, [source](https://devblogs.microsoft.com/dotnet/the-new-dependabot-nuget-updater/)); the corpus (Humanizer, Dapper) relies on it.

**`dotnet add package` writes the metadata for dev-dependency packages** (measured, the only time it is automatic):

```
$ dotnet add package MinVer --version 8.0.0       # nuspec has developmentDependency=true
<PackageReference Include="MinVer" Version="8.0.0">
  <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
  <PrivateAssets>all</PrivateAssets>
</PackageReference>
$ dotnet add package Newtonsoft.Json --version 13.0.3   # normal package: bare, correct
```

Under CPM the same command wrote the `PackageReference` with the two metadata child elements and the version into `Directory.Packages.props`. An agent that hand-edits XML skips this, which is why the evaluation check below exists.

**The mechanical gate** (works before pack, per TFM, sees all three mechanisms and the no-op row):

```bash
# prints every PackageReference that is NOT private = the runtime dependency set
dotnet msbuild src/Lib/Lib.csproj -nologo -p:TargetFramework=net10.0 -getItem:PackageReference \
  | jq -r '.Items.PackageReference[] | select((.PrivateAssets // "") | ascii_downcase != "all") | .Identity'
```

Measured: `leak-red` → 8 ids; `leak-green` → nothing; `pv-priv` → `Meziantou.Analyzer` and `MinVer` (exposes the no-op row); `gpr` → only the deliberately bare `Meziantou.Analyzer`.

### 2.4 The build-time code-execution surface

Three kinds of package asset run code in the build, with the developer's or CI's privileges and no sandbox:

1. **`build/`, `buildTransitive/`, `buildMultiTargeting/` `.props`/`.targets`.** MSBuild imports them automatically; they can contain `<Exec>`, inline tasks, `UsingTask` of a shipped DLL.
2. **`analyzers/` DLLs** (Roslyn analyzers and source generators), loaded into the compiler process.
3. **`tools/`** content that targets reference via `GeneratePathProperty` (`$(PkgFoo)\tools\x.exe`).

**Restore does not execute them; build does** (measured). `$FIX/buildexec/`: package `Evil.Helper` with `build/Evil.Helper.targets` running `<Exec Command="echo … > PWNED.txt"/>` before `CoreCompile`.

```
$ dotnet restore --packages …/pk-evil   → Restored; ls PWNED.txt → absent
$ dotnet build --no-restore             → Build succeeded.
$ cat PWNED.txt                         → build-time code ran as mherwig in …/buildexec/consumer
```

The consumer's `obj/C.csproj.nuget.g.targets` imports `$(NuGetPackageRoot)/evil.helper/1.0.0/build/Evil.Helper.targets`. That import line is the inventory.

**Neutralising a package you must reference but not trust with the build** (green): `ExcludeAssets="build;buildtransitive;buildmultitargeting"` on the reference → `dotnet build` succeeded, no `PWNED.txt`, and `obj/*.nuget.g.targets` has no import. Use `ExcludeAssets="analyzers"` the same way for generators. This is the only per-reference switch; there is no allowlist setting in NuGet itself.

**Real-world.** This is the technique behind the 2023 campaign ReversingLabs tracked (hundreds of typosquats, payload moved from `tools/init.ps1` to `build/*.targets`, "the payload fires each time the project compiles"; [ReversingLabs](https://reversinglabs.com/blog/iamreboot-malicious-nuget-packages-exploit-msbuild-loophole)), and the May 2026 Socket report of five `IR.*` typosquats of Chinese UI libraries (~65,000 downloads, infostealer running when the assembly loads; [coverage of Socket's report](https://dailysecurityreview.com/cyber-security/five-malicious-nuget-packages-target-chinese-net-developers/)). NuGet's own best-practice page lists the defences it offers (audit, source mapping, trust policies, lock files) and none of them inspects package contents ([NuGet security best practices](https://learn.microsoft.com/en-us/nuget/concepts/security-best-practices)).

**Inventory commands** (each watched; run after `dotnet restore`):

```bash
# 1. package build/props/targets that WILL be imported
grep -ho 'Project="[^"]*"' src/*/obj/*.nuget.g.props src/*/obj/*.nuget.g.targets
# 2. analyzers and generators that WILL load, per TFM
dotnet msbuild src/Lib/Lib.csproj -nologo -t:ResolvePackageAssets,ResolveLockFileAnalyzers \
  -p:TargetFramework=net10.0 -getItem:Analyzer | jq -r '.Items.Analyzer[].Identity'
# 3. triage a candidate .nupkg WITHOUT restoring it
unzip -Z1 cand.nupkg | grep -E '^(build|buildTransitive|buildMultiTargeting|analyzers|tools)/'
unzip -p cand.nupkg '*.targets' '*.props' | grep -c -E '<Exec[ >]|CodeTaskFactory|DownloadFile|WebClient|Invoke-WebRequest|powershell|curl |wget '
```

Measured on the toolchain cache: `Evil.Helper` → 1 build file, pattern count 1; Polyfill 0, BannedApiAnalyzers 0, Sbom.Targets 0, ReproducibleBuilds 0, SourceLink.GitHub 0, Meziantou.Analyzer 0, MinVer 1 (a legitimate hit). The pattern is a triage flag with false positives, not a verdict; a package whose build asset is a task DLL can do anything and the grep cannot see it. The review rule is therefore "a package that ships build assets or analyzers goes on a short, named, reviewed list" (R10), not "the grep is clean".

**Analyzers' own scope in this repo.** CS-BUILD already restricts third-party analyzers to BannedApiAnalyzers and VS.Threading; that list is the build-time-code allowlist, and R10 makes it explicit and checkable.

### 2.5 Signature validation: `require`, trustedSigners, owners, and what it costs

**Model.** nuget.org countersigns every package with a *repository* signature; some publishers add an *author* signature. `signatureValidationMode` is `accept` (default) or `require`; `require` needs a non-empty `trustedSigners` and then rejects any package not signed by a listed signer ([nuget.config reference](https://learn.microsoft.com/en-us/nuget/reference/nuget-config-file#trustedsigners-section); [trust boundaries](https://learn.microsoft.com/en-us/nuget/consume-packages/installing-signed-packages)). Packages signed by an untrusted certificate are treated as unsigned and install silently in `accept` mode (same page, Warning box).

**Where verification is actually on** ([signed-package verification, docs](https://learn.microsoft.com/en-us/dotnet/core/tools/nuget-signed-package-verification)):

| OS | Restore-time verification | Notes |
|---|---|---|
| Windows | always on | uses the OS root store |
| Linux | off before .NET 8 SDK; **on by default from .NET 8 SDK**; opt out with `DOTNET_NUGET_SIGNATURE_VERIFICATION=false` | bundle `/etc/pki/ca-trust/extracted/pem/objsign-ca-bundle.pem` preferred, else the SDK's bundle (visible in `dotnet add package` output) |
| macOS | **off by default**; opt in with `DOTNET_NUGET_SIGNATURE_VERIFICATION=true`, which the docs "recommend … you don't" enable (NuGet/Home#11985, #11986) | |

**Measured: with verification off, `require` is silently inert.** Same project, same unsigned local package, same `signatureValidationMode=require`:

```
(default, verification on)                         → error NU3004 … this package is unsigned.   exit 1
DOTNET_NUGET_SIGNATURE_VERIFICATION=false          → Restored …                                  exit 0
DOTNET_NUGET_SIGNATURE_VERIFICATION=true           → error NU3004                                exit 1
```

This is the Linux simulation of the macOS default (not run on macOS). Consequence for CS-CI's five-leg matrix: if the repo ships `require`, the macos-26 leg does not enforce it; enforcement is real on ubuntu-24.04, ubuntu-24.04-arm, windows-2025 and windows-11-arm. State that in the config comment; do not rely on the macOS leg for the gate (or run the gate in one Linux job).

**What `require` does against nuget.org, measured** (Polyfill 11.4.3 = repository-only; Newtonsoft.Json 13.0.4 = author + repository):

| `nuget.config` | Result |
|---|---|
| `require`, no `trustedSigners` | `error NU3034 … no trusted signers were specified` for both, exit 1 |
| `require`, repository `nuget.org` with three wrong fingerprints | `error NU3034 … This package is signed but not by a trusted signer`, exit 1 |
| `require`, repository `nuget.org` with the real fingerprints (`Humanizr__Humanizer@4574b93883bf:nuget.config:3-17`, copied verbatim) | `Restored`, exit 0 |
| same + `<owners>Microsoft</owners>` | both rejected, exit 1 |
| same + `<owners>simoncropp;jamesnk;dotnetfoundation;newtonsoft</owners>` | restored, exit 0 |
| same + `SIMONCROPP;JAMESNK` | rejected: **owners are case-sensitive** (nuget.org reports `simoncropp`, `jamesnk`) |

Create the config with the CLI rather than by hand: `dotnet nuget trust source nuget.org --configfile nuget.config` read the three fingerprints from the service index (`0e5f38f5…`, `5a2901d6…`, `1f4b311d…`), `--owners "a;b"` adds the allowlist, and `dotnet nuget config set signatureValidationMode require --configfile nuget.config` sets the mode (`dotnet nuget trust list` prints the result). The `trust source` command does not turn `require` on.

**Cost.**
- *Time:* none measurable. 20 packages, fresh folder, two alternating runs: accept 3175/2802 ms, require 2709/2702 ms. (Linux verifies in both modes; `accept` only declines to demand a trusted signer.)
- *Unsigned feeds:* any package from a feed that does not sign breaks restore. Own local feeds, CI artifact feeds and preview feeds are unsigned (the `leak.lib` fixture failed NU3004). openai-dotnet's `nuget.config` lists two unsigned Azure DevOps feeds for dev tooling (`openai__openai-dotnet@1f0e8829acac:nuget.config:7-8`), so `require` would need extra `trustedSigners` or `allowUntrustedRoot` handling there. xunit's `NuGet.Config` adds the `feedz.io` feed (`xunit__xunit@0c7aa4991fa3:NuGet.Config:5-6`).
- *Upkeep:* the repository certificate in use (SHA256 `1F4B311D…`) is valid to 2027-05-19 (shown by `dotnet nuget verify`); the older two are expired (2021-2024) and still in Humanizer's file. Microsoft's docs say clients with specific policies must update when the repository rotates, and give `trusted-signers sync` ([trust boundaries](https://learn.microsoft.com/en-us/nuget/consume-packages/installing-signed-packages#sync-repository-certificates)). Plan one config touch before 2027-05-19; `dotnet nuget trust source` re-reads the index. A missed rotation fails closed (every restore errors NU3034), which is the safe direction.
- *"Most packages carry only the repository signature":* not in this cache. Of 235 packages in the toolchain cache, 15 were unsigned (all local fixtures), 220 repository-signed and 179 author-signed (so 41 repository-only, 19% of the 220 from nuget.org). The cache is Microsoft-heavy (xunit, MSTest, analyzers), so treat 81% author-signed as an upper bound; the point is that the repository signature is the universal one and the one a pin must use.
- *Corpus adoption:* 1 of 35 exemplars sets `signatureValidationMode` to require (Humanizer). Humanizer's own `tools/docs/verify-aot.ps1` writes `accept` into a temporary config for a local checkout feed (`Humanizr__Humanizer@4574b93883bf:tools/docs/verify-aot.ps1:208-217`), i.e. even its owners drop to `accept` the moment an unsigned feed appears.

**What it protects against, honestly.** Tampering of a package in transit or at rest in a mirror, proxy or cache (the signature binds content to nuget.org); a package from an unexpected feed. It does **not** protect against a typosquat or a compromised publisher account: nuget.org repository-signs those too. Only the `owners` allowlist restricts *who* published, and it must contain the owner of every package in the closure. That works for a tiny pinned set (the build/test tools of a library) and is brittle for a floating transitive graph.

**Verdict.** Keep `accept` as the repo default. Adopt the repository pin with `require` when (a) CI restores through a mirror/proxy the team does not fully control, or (b) the repo is a security-sensitive release pipeline; add `owners` only to a locked tool closure. In every case pair it with R6's lint (the config is correct: a single trusted repository, mode set, comment about macOS).

### 2.6 `dotnet nuget verify` as an audit step

([dotnet nuget verify](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-nuget-verify): `--all`, `--certificate-fingerprint <SHA256>` repeatable, since .NET 6; prints the package content hash from .NET 10, useful for lock-file mismatches.) Measured exit codes:

| Input | Output | Exit |
|---|---|---|
| unsigned nupkg | `error: NU3004: The package is not signed.` | 1 |
| Polyfill (repository-signed) | `Signature type: Repository … SHA256 hash: 1F4B311D…` | 0 |
| Polyfill + wrong `--certificate-fingerprint` | `error: NU3034: … did not match any of the allowed certificate fingerprints.` | 1 |
| Polyfill + right fingerprint | no error | 0 |
| whole packages folder (235 nupkgs, one `xargs -0 -r` call) | 15 × NU3004; 8.4 s | 123 (xargs: some invocation failed) |

Offline or air-gapped runners print `warn : NU3018 … RevocationStatusUnknown` (45 of the 235 verifications on this WSL host) but the exit stays 0; do not escalate NU3018 to an error. `dotnet nuget verify` is the right tool for a *post-restore sweep of the packages folder* (catches a poisoned cache) and for *pinning a specific artifact* (e.g. the exact Microsoft.Sbom.Targets or MinVer nupkg a repo trusts), at the price of not covering unsigned packages.

### 2.7 Typosquatting, the reserved-prefix flag, and hallucinated package names

**The flag.** nuget.org shows a checkmark for a package whose id matches a reserved prefix and is owned by that prefix's owner; the search API exposes it as `verified` ([ID prefix reservation](https://learn.microsoft.com/en-us/nuget/nuget-org/id-prefix-reservation); [Search API](https://learn.microsoft.com/en-us/nuget/api/search-query-service-resource#search-result): "On nuget.org, a verified package is one which has a package ID matching a reserved ID prefix and owned by one of the reserved prefix's owners"). A reserved prefix is also *delegable and can be made public* (still shows the checkmark, blocks nobody), and packages that predate a reservation lose nothing (same page). So `verified:true` is a positive signal and `false` is not a red flag.

**Measured** (live query `https://azuresearch-usnc.nuget.org/query?q=packageid:<id>&take=1`, 2026-10-11): `Polly` true; `Newtonsoft.Json` true (owners `dotnetfoundation, jamesnk, newtonsoft`); `Microsoft.CodeAnalysis.BannedApiAnalyzers` true; `MinVer` false (owner `adamralph`, 20.4 M downloads); `Polyfill` false (owner `simoncropp`, 3.9 M). Over the ten central packages of `adamralph__simple-exec@f80913246993:Directory.Packages.props:6-15`, `provenance.sh` printed 6 true / 4 false. Treat false as "check owner and age yourself".

**Hallucinated names.** `Newtonsoft.Jsonn` → `data: []` (`NOT-FOUND`). An LLM that invents a plausible id (or a rename it half-remembers) gets either nothing or, if someone registered the name first, the attacker's package. The existence check is mechanical:

```bash
# fixtures: provenance.sh <Directory.Packages.props>; prints id, verified, owners, totalDownloads
curl -fsS "https://azuresearch-usnc.nuget.org/query?q=packageid:$id&take=1" -o q.json \
  && jq -r --arg id "$id" '(.data[0]//{}) as $d | [$id,(if $d.verified==null then "NOT-FOUND" else $d.verified end),($d.owners//[]|join(",")),($d.totalDownloads//0)]|@tsv' q.json
```

(`jq`'s `//` treats `false` as absent, which makes every unverified package look "NOT-FOUND"; the `== null` form above is the corrected one, found while testing.)

**Incidents, for calibration.** 2023: several hundred typosquats using `.targets` payloads ([ReversingLabs](https://reversinglabs.com/blog/iamreboot-malicious-nuget-packages-exploit-msbuild-loophole)); 2026-05: `IR.DantUI`, `IR.OscarUI`, … built from decompiled copies of real libraries, one-character-anagram names, 224 versions of which 219 unlisted, ~65,000 downloads, published under account `bmrxntfj` ([secondary report of Socket's findings](https://dailysecurityreview.com/cyber-security/five-malicious-nuget-packages-target-chinese-net-developers/)). The primary Socket page was not retrievable; the numbers are from the secondary article.

**What stops a typosquat** in a library repo: the human or agent never types an unreviewed id (R9 existence + owner check), package source mapping keeps private prefixes off nuget.org (CS-BUILD-27), cooldown gives the registry's takedown time to land (2.9), and CPM means there is exactly one file to review.

### 2.8 SBOM: Microsoft.Sbom.Targets vs CycloneDX

Same library (`$FIX/sbom/src/Lib.csproj`: net8.0;net10.0, `System.Text.Json` 10.0.12, `PackageLicenseExpression` MIT), packed with and without.

**Microsoft.Sbom.Targets 4.1.13** (`GenerateSBOM=true`, `Microsoft.Sbom.Targets` with `PrivateAssets="all"`; defaults documented in the [package README](https://github.com/microsoft/sbom-tool/blob/main/src/Microsoft.Sbom.Targets/README.md): `GenerateSBOM` false, SPDX 2.2, output "under the `_manifest` folder at the root of the NuGet package"):

| Measure | Without | With |
|---|---|---|
| nupkg bytes | 5,117 | 7,489 (+2,372) |
| `dotnet pack` wall time (one run each, cold) | 10.7 s | 12.8 s |
| extra files in nupkg | none | `_manifest/spdx_2.2/manifest.spdx.json` (10,449 B) + `….sha256` (64 B) |
| build-time package | none | Microsoft.Sbom.Targets 13.0 MB nupkg, 48.8 MB extracted |

Content of the SPDX document: `spdxVersion SPDX-2.2`, creator `Tool: Microsoft.SBOMTool-4.1.13`, 6 packages, 7 files (each with SHA-256 + SHA-1), 6 relationships. Weaknesses measured: `licenseConcluded`/`licenseDeclared` = `NOASSERTION` for every package even with `SbomGenerationEnablePackageMetadataParsing=true` (the feature overview says licence and supplier population needs the package-metadata (`-pm`) and licence (`-li`) options, which call ClearlyDefined, i.e. the network: [feature overview](https://github.com/microsoft/sbom-tool/blob/main/docs/feature-overview.md#packages-section)); it lists `Microsoft.Sbom.Targets` itself although the reference is private; the library appears twice; `supplier` is `NOASSERTION` for NuGet packages. Strength: it hashes the shipped files and travels inside the artifact.

**CycloneDX .NET tool 6.2.0** (`dotnet tool install CycloneDX --tool-path cdx-tool`; `dotnet-CycloneDX Lib.csproj -o dir -F Json [-ed]`; requires .NET 8/9/10 ([README](https://github.com/CycloneDX/cyclonedx-dotnet))):

| Measure | Value |
|---|---|
| output | `bom.json`, CycloneDX 1.7 (default `-spv`), 6,380 B, separate from the nupkg |
| components | 4 (the 3 STJ packages + Microsoft.Sbom.Targets); `-ed` (exclude development dependencies) → 3, 5,181 B |
| licence data | `licenses: [{license:{id:"MIT"}}]` resolved for all, one hash each |
| side effect | runs `dotnet restore` unless `-dpr` |

**Verdict.**
- A library whose shipped graph is 0-3 packages gains little from an SBOM; consumers generate theirs from their own assets file (the tools above read `project.assets.json`).
- If one is wanted (consumer/enterprise request, a regulated release), emit CycloneDX with `-ed` as a *release asset* in the tag-triggered job (CS-PKG-13), not inside the nupkg and not on every PR. It is the one that carries licences, excludes build-only packages and keeps the PR build free of a 49 MB task package.
- Put Microsoft.Sbom.Targets in only if the consumer requires SPDX *inside the package* (simple-exec does, `adamralph__simple-exec@f80913246993:src/Directory.Build.props:20-22,27`, under `Configuration=='Release'`). Then: `PrivateAssets="all"`, Release-only condition, pinned in CPM (`Directory.Packages.props:10`, 4.1.13), and expect NOASSERTION licences.
- Neither is a signature or attestation. Binding an SBOM to the artifact is a provenance question (GitHub attestations) for the release topic (CS-PKG-13 / PK-12), not for this one.

### 2.9 Dependabot and Renovate with CPM; cooldown

**Dependabot** (native `nuget` ecosystem; `dotnet-sdk` ecosystem for `global.json`):
- The rewritten updater detects `Directory.Packages.props`, supports per-project overrides, respects `global.json`, and for a vulnerable transitive package adds a direct pin when no parent update exists (and has "no process to remove that direct dependency later") ([.NET blog, 2025-08-04](https://devblogs.microsoft.com/dotnet/the-new-dependabot-nuget-updater/)). That is the CPM transitive-pinning leak from CS-BUILD, produced by a bot; review those PRs against the nuspec check.
- `cooldown` supports `default-days`, `semver-{major,minor,patch}-days`, `include`/`exclude` (150 entries, wildcards); NuGet and Dotnet SDK are listed as supported; security updates are exempt ([options reference](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference#cooldown)). Since 2026-07-14 a three-day cooldown is the default for version updates on github.com, overridable or removable in `dependabot.yml` ([GitHub changelog](https://github.blog/changelog/2026-07-14-dependabot-version-updates-introduce-default-package-cooldown/)).
- Exemplar practice: Polly `cooldown: default-days: 3`, groups, and an `ignore:` list "libraries which are pinned" (`App-vNext__Polly@e4476096da5b:.github/dependabot.yml:18-21,41-54`); openai-dotnet `default-days: 8`, one `nuget-dependencies` group `group-by: dependency-name`, three `directories`, ignores with reasons ("requires explicit approval from the legal team" for Moq, `…/dependabot.yml:27-35`); GitVersion `directories` for CPM roots with semver-tiered cooldown 7/3/0 (`GitTools__GitVersion@5057cdbcc177:.github/dependabot.yml:72-85`); simple-exec `dotnet-sdk` + `github-actions` only, `cooldown 7`, **no `nuget` ecosystem** (`adamralph__simple-exec@f80913246993:.github/dependabot.yml:3-14`), so its NuGet versions are bumped by hand or another tool. aspire documents a workaround for a Dependabot-core CPM issue in `dotnet__aspire@af646baee1e8:Directory.Packages.props:2`.
- Pins belong in `ignore:` with a one-line reason, not in a code comment elsewhere.

**Renovate**: `nuget` manager matches `.csproj .fsproj .sqlproj .vbproj .props .targets dotnet-tools.json global.json`; lock files are supported through `lockFileMaintenance`; file-based apps (`.cs`) need `managerFilePatterns`; "bare" versions (`Version="1.2.3"`) need `rangeStrategy: "bump"`; exact `[1.2.3]` versions are not updated by default ([Renovate nuget manager](https://docs.renovatebot.com/modules/manager/nuget/)). The page says nothing about CPM-specific behaviour or `minimumReleaseAge`; both unverified here. Choose one bot per repo.

**Lock files.** simple-exec runs `RestorePackagesWithLockFile=true` plus `RestoreLockedMode` when `CI` is set for a *library* (`adamralph__simple-exec@f80913246993:Directory.Build.props:11-12`), while Microsoft's guidance is that a library's lock file cannot constrain dependents and "should not" be checked in ([NuGet docs](https://learn.microsoft.com/en-us/nuget/consume-packages/package-references-in-project-files#make-lock-file-part-of-your-source-repository)). CS-BUILD already decided no lock file; this is recorded as an acknowledged exemplar dissent, not re-opened.

### 2.10 Dependency licence expressions

Consumer-side check from the resolved set (no network). `$FIX/licenses.sh <dir>` reads `obj/project.assets.json`, resolves each package folder, extracts `<license type="expression">`:

```bash
#!/usr/bin/env bash
set -euo pipefail
a="$1/obj/project.assets.json"
root=$(jq -r ".packageFolders|keys[0]|rtrimstr(\"/\")+\"/\"" "$a")
jq -r '.libraries|to_entries[]|select(.value.type=="package")|.value.path' "$a" | while read -r p; do
  n=$(ls "$root$p"/*.nuspec)
  l=$(grep -o '<license type="expression">[^<]*' "$n" | sed 's/.*>//' || true)
  echo "$p ${l:-NO-SPDX-EXPRESSION}"
done
```

Measured: `sbom/src` → `microsoft.sbom.targets/4.1.13 MIT`, `system.io.pipelines/10.0.12 MIT`, `system.text.encodings.web/10.0.12 MIT`, `system.text.json/10.0.12 MIT` (0 flagged); `buildexec/consumer` → `evil.helper/1.0.0 NO-SPDX-EXPRESSION` (1 flagged). Census of the cache's 356 nuspecs: 215 declare a licence element - `type="expression"` MIT 187, Apache-2.0 21, BSD-3-Clause 1; `type="file"` 6; the remainder include the local fixtures and older packages with `licenseUrl` only. `licenseUrl`-only packages are deprecated and are also a prefix-reservation criterion ([ID prefix reservation criteria](https://learn.microsoft.com/en-us/nuget/nuget-org/id-prefix-reservation#id-prefix-reservation-criteria)). A `type="file"` licence needs a human read. NuGetAudit does not check licences. For an Apache-2.0/MIT library the allow-set is `MIT`, `Apache-2.0`, `BSD-2-Clause`, `BSD-3-Clause`, `ISC`, `0BSD`; anything else, including `LGPL-*`/`GPL-*`/`AGPL-*` and `NO-SPDX-EXPRESSION`, is a human decision.

### 2.11 The review rule for adding a package

Adding a `PackageReference` or `PackageVersion` is a trust decision on the whole closure and, for build assets, on arbitrary code at build. One review, six questions, each with a mechanical answer:

| # | Question | Mechanical answer |
|---|---|---|
| 1 | Does the BCL or an already-referenced package do it? | `dotnet package list --include-transitive` + NU1510 (CS-BUILD-28); for runtime refs, 2.1 budget |
| 2 | Does the id exist, who owns it, how old and popular? | `provenance.sh` (2.7): `NOT-FOUND` blocks; `verified:false` needs owner/age check |
| 3 | Does it run code at build? | `unzip -Z1 … | grep -E '^(build|buildTransitive|buildMultiTargeting|analyzers|tools)/'` (2.4); yes → on the reviewed build-code list or `ExcludeAssets` |
| 4 | Does it leak? | the `-getItem:PackageReference` gate and the nuspec grep (2.3) |
| 5 | Licence and age | `licenses.sh`; published ≥ cooldown days (3 default) unless a security fix |
| 6 | How big is the new transitive closure? | `dotnet package list --include-transitive` diff against the base branch |

Exemplar evidence that reviews like this exist in practice: openai-dotnet's legal-approval ignore (`…/dependabot.yml:29`) and aspire's pinned-for-vulnerability comment on a transitive (`dotnet__aspire@af646baee1e8:Directory.Packages.props:91`).

### 2.12 Verified on the toolchain

Fixture root `$FIX` = `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-security-supply-chain/`; every command ran through `/home/mherwig/.cache/research-lang/dotnet-tools/run.sh`; SDK 10.0.401 (NuGet 7.9) unless noted; host Linux x86_64 (WSL2). Read-only nuget.org restores only; nothing pushed.

| # | Claim | Red (planted bad) | Green (fixed twin) |
|---|---|---|---|
| V1 | Bare build-only packages leak into the nuspec | `cd leak-red/src && dotnet pack -c Release -o ../out`; `unzip -p ../out/*.nupkg '*.nuspec' \| grep -c '<dependency '` → **16** (8 per TFM, e.g. `<dependency id="MinVer" version="8.0.0" exclude="Build,Analyzers"/>`) | `leak-green` (same + `PrivateAssets="all"`): → **0**, no `<dependencies>` element |
| V2 | The leak is paid by the consumer | `consumer-red`: `dotnet restore --packages pk-red` → `.libraries` = 11 ids (MinVer, Polyfill, Sbom.Targets, SourceLink.* …), 102,998,305 B | `consumer-green`: 1 id, 449,195 B |
| V3 | Evaluation-time gate | `dotnet msbuild -p:TargetFramework=net10.0 -getItem:PackageReference \| jq … PrivateAssets != all` on `leak-red/src` → 8 ids | `leak-green/src` → empty |
| V4 | `PackageVersion PrivateAssets` is a no-op; `GlobalPackageReference` is private | `pv-priv/`: nuspec lists `MinVer` and `Meziantou.Analyzer`; V3 gate prints both | `gpr/`: MinVer + BannedApi as `GlobalPackageReference` → nuspec lists only the plain `PackageReference` (Meziantou) |
| V5 | Build code runs at build, not restore; `ExcludeAssets` stops it | `buildexec/consumer`: restore → no `PWNED.txt`; `dotnet build --no-restore` → `Build succeeded.`, `PWNED.txt` = `build-time code ran as mherwig in …` | `buildexec/green` (`ExcludeAssets="build;buildtransitive;buildmultitargeting"`): `Build succeeded.`, `ls PWNED.txt` → no such file; `obj/*.nuget.g.targets` has no import |
| V6 | `require` rejects unsigned | `trust-require/` (local unsigned feed): `error NU3004: … signatureValidationMode is set to require … this package is unsigned.` exit 1 | `trust-accept/` (default mode): `Restored`, exit 0 |
| V7 | `require` + nuget.org needs the pin | `org-require-notrusted`: `error NU3034 … no trusted signers were specified` (Polyfill, Newtonsoft.Json) exit 1; `org-require-wrongfp`: `NU3034 … signed but not by a trusted signer` exit 1 | `org-require-trusted` (Humanizer's `nuget.config`): `Restored` exit 0 |
| V8 | Owners allowlist blocks by owner (case-sensitive) | `org-owners-Micro` (`--owners Microsoft`): NU3034 ×2 exit 1; `org-owners-lcSIM` (`SIMONCROPP;JAMESNK`): NU3034 ×2 exit 1 | `org-owners-lcsim` (`simoncropp;jamesnk`): `Restored` exit 0 |
| V9 | `require` is inert when verification is off | `DOTNET_NUGET_SIGNATURE_VERIFICATION=false dotnet restore` in `trust-require`: `Restored`, exit 0 although the package is unsigned | same with `=true`: `NU3004` exit 1 |
| V10 | `dotnet nuget verify` | `dotnet nuget verify --all feed/Leak.Lib.0.0.0-alpha.0.nupkg`: `NU3004 The package is not signed.` exit 1; Polyfill with `--certificate-fingerprint 000…0`: `NU3034 … did not match any of the allowed certificate fingerprints.` exit 1 | Polyfill: exit 0; with `--certificate-fingerprint 1F4B311D…482D`: exit 0 |
| V11 | Licence gate | `licenses.sh buildexec/consumer` → `evil.helper/1.0.0 NO-SPDX-EXPRESSION` (`grep -c` = 1) | `licenses.sh sbom/src` → 4 × `MIT` (`grep -c` = 0) |
| V12 | Existence / ownership check | `provenance.sh` on `Newtonsoft.Jsonn` → `NOT-FOUND` | on simple-exec's `Directory.Packages.props` → 6 × `true`, 4 × `false` with owners |
| V13 | Nuspec budget gate | `unzip -p leak-red/out/*.nupkg '*.nuspec' \| grep -o '<dependency id="[^"]*"' \| grep -v -x -e '<dependency id="System.Text.Json"' \| wc -l` → 16 | `leak-green` → 0; `sbom` (net8 STJ only) → 0 |
| V14 | SBOM A/B | no `GenerateSBOM`: nupkg 5,117 B, no `_manifest/` | `GenerateSBOM=true` + Sbom.Targets 4.1.13: 7,489 B, `_manifest/spdx_2.2/manifest.spdx.json` 10,449 B; licences all `NOASSERTION`; CycloneDX 6.2.0 `bom.json` 6,380 B (5,181 with `-ed`), `MIT` resolved |

Extra measurements (not pairs): net8/net10 dependency graph of the STJ library (2.1); cache-wide `dotnet nuget verify` sweep of 235 nupkgs; restore time accept vs require (2802-3175 vs 2702-2709 ms, 20 packages); peer nuspec census; exemplar census. SDK 11.0.100-rc.1.26425.128 (NuGet 7.11.0-rc): V1 re-run (net10.0 only) gives the same 8 dependency elements, `dotnet nuget verify --all` on the unsigned package exits 1, `require` on an unsigned package still fails NU3004. `dotnet nuget verify --help` printed `The application to execute does not exist: …/NuGet.CommandLine.XPlat.dll` under the RC1 toolchain here (the command itself works); treat as an RC1 packaging quirk, unreproduced elsewhere.

## Normative guidance candidates

Numbering is local (R1…); the consolidator assigns CS-SEC IDs. "Verify" lines assume the repo layout `src/<Project>/<Project>.csproj`, a pack at `artifacts/`, and `jq`, `xmllint`, `unzip` on the runner.

**R1 (MUST): the packed library's dependency budget is empty on net10.0 and `System.Text.Json` only on net8.0.** Any other runtime dependency needs an owner-approved, written exception in the PR.
- Rationale: a runtime `PackageReference` is the consumer's transitive graph and audit surface; the closest peers ship none (2.1).
- Verify: `test "$(unzip -p artifacts/*.nupkg '*.nuspec' | xmllint --xpath "count(//*[local-name()='group'][@targetFramework='net10.0']/*[local-name()='dependency'])" -)" = 0` and `test "$(unzip -p artifacts/*.nupkg '*.nuspec' | grep -o '<dependency id="[^"]*"' | grep -v -x -e '<dependency id="System.Text.Json"' | wc -l)" = 0`. Watched: V13 (16 vs 0).

**R2 (MUST): declare every analyzer, source generator, version/SBOM/SourceLink tool as `GlobalPackageReference` in `Directory.Packages.props`; a build-only package needed by one project is a `PackageReference … PrivateAssets="all"`.** Never `PrivateAssets` on a `PackageVersion`.
- Rationale: bare references leak as nuspec dependencies; `PackageVersion` metadata is silently ignored (2.2, 2.3).
- Verify: `dotnet msbuild src/<Project>/<Project>.csproj -nologo -p:TargetFramework=net10.0 -getItem:PackageReference | jq -r '.Items.PackageReference[] | select((.PrivateAssets // "") | ascii_downcase != "all") | .Identity'` prints only ids on the reviewed runtime allowlist (empty when R1 holds); `grep -rnE --include=Directory.Packages.props '<PackageVersion [^>]*(Private|Include|Exclude)Assets' .` prints nothing. Watched: V3, V4.

**R3 (MUST): after `dotnet pack`, `unzip -p artifacts/*.nupkg '*.nuspec' | grep -o '<dependency id="[^"]*"'` is the only accepted evidence of the shipped dependency set; `dotnet package list` is not.**
- Rationale: `dotnet package list` includes `PrivateAssets=all` packages (2.1).
- Verify: R1's command is a required CI step; reading heuristic: review rejects a PR that cites `dotnet package list` output for "no new dependencies".

**R4 (MUST): a package that ships `build/`, `buildTransitive/`, `buildMultiTargeting/`, `analyzers/` or `tools/` content is on a named, reviewed build-code list; every other reference sets `ExcludeAssets="build;buildtransitive;buildmultitargeting;analyzers"` or is not added.**
- Rationale: build assets run as the developer/CI user at build; restore does not run them (V5).
- Verify: `grep -ho 'Project="[^"]*"' src/*/obj/*.nuget.g.props src/*/obj/*.nuget.g.targets | sed 's|Project="||;s|"$||;s|\$(NuGetPackageRoot)/||' | cut -d/ -f1 | sort -u` lists only package ids (watched: prints `evil.helper`) on the list in `eng/build-code-packages.txt` (one id per line), and `dotnet msbuild src/<Project>/<Project>.csproj -nologo -t:ResolvePackageAssets,ResolveLockFileAnalyzers -p:TargetFramework=net10.0 -getItem:Analyzer | jq -r '.Items.Analyzer[].Identity' | grep -v -e '/dotnet/sdk/'` lists only paths under those ids. Watched: V5 (+ 2.4 inventory runs).

**R5 (MUST): read the content of any new build-asset package before approval: `unzip -Z1 cand.nupkg | grep -E '^(build|buildTransitive|buildMultiTargeting|analyzers|tools)/'` and `unzip -p cand.nupkg '*.targets' '*.props' | grep -c -E '<Exec[ >]|CodeTaskFactory|DownloadFile|WebClient|Invoke-WebRequest|powershell|curl |wget '`.**
- Rationale: the dominant malicious-package technique is a `.targets` payload; a hit is a triage flag, a clean grep is not proof (MinVer = 1 legitimate hit; a task DLL is invisible) (2.4).
- Verify: the PR description pastes both outputs; reviewer reading heuristic: any non-zero count or a `tools/` executable without a stated purpose blocks.

**R6 (SHOULD): when CI restores through a mirror or proxy, or the repo is a release pipeline, ship `signatureValidationMode=require` with a single repository signer created by `dotnet nuget trust source nuget.org --configfile nuget.config`; otherwise keep the default `accept`.** A `nuget.config` comment states that macOS legs do not enforce it.
- Rationale: it detects tampering at rest/in transit; it does not stop a typosquat; verification is off by default on macOS and `require` is then inert (V6, V9; 2.5).
- Verify: `xmllint --xpath "string(//config/add[@key='signatureValidationMode']/@value)" nuget.config` prints `require`; `xmllint --xpath 'count(//trustedSigners/repository)' nuget.config` prints `1`; `dotnet restore --packages "$(mktemp -d)"` exits 0 on a Linux leg and `DOTNET_NUGET_SIGNATURE_VERIFICATION=true dotnet restore` on any leg. Never set `DOTNET_NUGET_SIGNATURE_VERIFICATION=false` anywhere (`grep -rnE --include='*.yml' --include='*.yaml' --include='*.props' --include='*.sh' 'DOTNET_NUGET_SIGNATURE_VERIFICATION[=:"'"'"' ]+false' .` prints nothing).

**R7 (MAY): add `<owners>` to the trusted repository only for a locked build/test tool closure, listing lowercase owner names exactly as the search API prints them.**
- Rationale: the only control that rejects a signed-but-wrong publisher; it fails closed on any new owner and is case-sensitive (V8).
- Verify: `xmllint --xpath 'string(//trustedSigners/repository/owners)' nuget.config` is non-empty; restore with the owners reduced by one name fails NU3034.

**R8 (SHOULD): once per release (not per PR), run `find "${NUGET_PACKAGES:-$HOME/.nuget/packages}" -name '*.nupkg' -print0 | xargs -0 -r dotnet nuget verify --all` against the CI packages folder and pin any package that must be bit-identical with `--certificate-fingerprint`.** Do not escalate NU3018 revocation warnings.
- Rationale: catches a poisoned cache and gives an equality pin; unsigned local/preview feed packages exit non-zero by design (V10).
- Verify: the step exists in `release.yml` (`grep -n 'nuget verify' .github/workflows/release.yml`); exit 0 on a clean restore.

**R9 (MUST): every new package id passes the existence/ownership check before it is written to `Directory.Packages.props`.** `NOT-FOUND` is a hard stop; `verified:false` requires the reviewer to read owner and download count.
- Rationale: LLM-invented ids and typosquats; nuget.org's `verified` flag is queryable (2.7; V12).
- Verify: `provenance.sh Directory.Packages.props` (from the fixture dir) prints no `NOT-FOUND` line; for a single id: `curl -fsS "https://azuresearch-usnc.nuget.org/query?q=packageid:Polly&take=1" | jq -e '.data|length==1'` exits 0 (use the exact id).

**R10 (MUST): `Directory.Packages.props` is the only place that names a package version; a change to it that adds an id carries the six-question review (2.11) in the PR body.**
- Rationale: one file, one reviewer, one diff; CS-BUILD already centralises versions.
- Verify: `grep -rnE --include='*.csproj' --include='*.props' --include='*.targets' --exclude=Directory.Packages.props '<PackageReference [^>]*Version=' .` prints nothing (watched: planted `Version=` → 1 hit, CPM-clean twin → 0); `git diff origin/main -- Directory.Packages.props | grep -E '^\+.*<(Global)?Package(Version|Reference)'` lines each have a matching row in the PR body (reading heuristic).

**R11 (MUST): updater config states intent in YAML, not in comments elsewhere.** If Dependabot: an `ecosystem: nuget` entry with `cooldown: default-days >= 3` (do not set `0`; security updates bypass cooldown anyway), `groups`, and `ignore:` entries each with a reason comment; a separate `dotnet-sdk` entry for `global.json`. One bot per repo.
- Rationale: cooldown gives the registry time to remove a bad release; pins without a reason rot (Polly, openai-dotnet, GitVersion; 2.9).
- Verify: `awk '/package-ecosystem/{eco=$0} /cooldown:/{if (eco ~ /nuget/) ok=1} END{exit !ok}' .github/dependabot.yml` exits 0 (watched: Polly, openai-dotnet, GitVersion yes; simple-exec and a planted nuget block without cooldown exit 1); `grep -c 'package-ecosystem: *"\?dotnet-sdk' .github/dependabot.yml` is at least 1; reading heuristic: every `ignore:` entry has a reason comment above it.

**R12 (MUST): every resolved package has a licence in the allow-set (`MIT`, `Apache-2.0`, `BSD-2-Clause`, `BSD-3-Clause`, `ISC`, `0BSD`) or a recorded human decision.** `NO-SPDX-EXPRESSION` and `type="file"` licences block until a human reads them.
- Rationale: NuGetAudit does not check licences; the expression is machine-readable in the nuspec (2.10).
- Verify: run `licenses.sh` (the 2.10 script, committed as `eng/licenses.sh`) per project after restore: `eng/licenses.sh src/<Project> | grep -v -E ' (MIT|Apache-2\.0|BSD-2-Clause|BSD-3-Clause|ISC|0BSD)$'` prints only lines present in `eng/license-exceptions.txt`. Watched: V11.

**R13 (MAY): produce an SBOM only on request; if produced, CycloneDX 1.7 via `dotnet-CycloneDX src/<Project>/<Project>.csproj -o artifacts/sbom -F Json -ed` attached to the GitHub release, not packed into the nupkg and not run on PRs.** Microsoft.Sbom.Targets is allowed only with `PrivateAssets="all"`, a Release-only `GenerateSBOM` condition and a pinned CPM version, and its `NOASSERTION` licences are documented in the README.
- Rationale: zero-to-three-package graph; CycloneDX carried licences and dropped the build-only package; Sbom.Targets is 49 MB of build-time code (2.8).
- Verify: `grep -rnE --include='*.csproj' --include='*.props' 'GenerateSBOM' .` prints nothing unless a Release condition is on the same element, and `unzip -Z1 artifacts/*.nupkg | grep -c '^_manifest/'` is 0 when R13's CycloneDX path is chosen. Watched: V14.

**R14 (MUST): do not claim a gate that the macOS leg cannot enforce.** Any rule whose enforcement relies on NuGet signature verification states in its CI comment which legs run it.
- Rationale: verification is off by default on macOS, and `require` there is a silent no-op (V9).
- Verify: reading heuristic on `.github/workflows/ci.yml`: a job named for signature enforcement has `runs-on` of `ubuntu-24.04`, `ubuntu-24.04-arm` or a windows runner, or sets `DOTNET_NUGET_SIGNATURE_VERIFICATION: true` explicitly.

## AI-agent angle

| What an LLM does | Why it is wrong | Smallest mechanical check |
|---|---|---|
| Adds `<PackageReference Include="MinVer" Version="…" />` (or Polyfill, Meziantou.Analyzer, SourceLink.GitHub) by hand-editing XML | leaks as a nuspec dependency; only `dotnet add package` writes `PrivateAssets` for dev-dependency packages | R2 evaluation gate / R1 nuspec grep (V1, V3) |
| Puts `PrivateAssets="All"` on `<PackageVersion>` in `Directory.Packages.props` because "CPM centralises metadata" | silently ignored (measured); openai-dotnet needed an MSBuild bridge | R2's second grep; V4 |
| Writes `<DevelopmentDependency>true</DevelopmentDependency>` in the *library's own* csproj and thinks the references are private | marks the library, not its references; docs sentence is easy to misread | R1/R3 nuspec check |
| Uses `dotnet list package` (verb-first) on SDK 10, or reads its output as the shipped set | noun-first `dotnet package list` is the .NET 10 form; both include private packages | R3 |
| Invents a package id (`Newtonsoft.Json.Net`, `System.Text.Json.Extensions`, `Microsoft.Extensions.Process`) or "helpfully" corrects a rename | non-existent id restores nothing, or restores an attacker's squat | R9 existence check (V12) |
| Adds a NuGet package for what the BCL does (`System.Text.Json` on net10 as a direct reference, `Microsoft.Bcl.AsyncInterfaces`, `System.Memory`, `Newtonsoft.Json`) | pruned or redundant; NU1510 on net10; CS-JSON rejects Newtonsoft | `dotnet build` with TWAE (CS-BUILD-28 NU1510); R1 |
| Pastes a `nuget.config` with `signatureValidationMode=require` and an empty/handwritten `<trustedSigners>`, or invents fingerprints | NU3034 on every restore; made-up SHA256 values | R6: build the file with `dotnet nuget trust source`, then V7 restore |
| Believes `require` protects macOS legs and "supply-chain-hardened CI" | off by default on macOS; inert | R14 |
| Suggests `NoWarn NU3018`/`NU1903`/disabling audit to get green | hides revocation and advisory signal | CS-BUILD-26 greps; R8 leaves NU3018 as a warning |
| Treats NuGet signing as protection against malicious packages | typosquats are repository-signed too | R9/R4/R5, not R6 |
| Adds `Microsoft.Sbom.Targets` or CycloneDX to every `dotnet build`/PR | 49 MB build-time package, slower pack, NOASSERTION licences | R13 grep |
| Runs `dotnet restore` of a new package and calls it "reviewed" | restore doesn't execute; the first `dotnet build` does | R4/R5 before the first build |
| Pins with `Version="[1.2.3]"` or a floating `1.*` | Renovate won't update exact; floating breaks reproducibility | `grep -rnE --include=Directory.Packages.props 'Version="(\[|[^"]*\*)' .` prints nothing |
| Writes `cooldown: default-days: 0` or removes it "to get the PR faster" | removes the takedown window | R11 grep |

## Contested / evolving

- **Lock file for a library.** NuGet docs say a library should not check one in (cannot constrain dependents); simple-exec ships one with locked mode in CI. Settled for this repo in CS-BUILD (no lock file); the dissent is recorded, not new.
- **`require` mode as a default.** Microsoft's best-practice page lists "client trust policies" as opt-in; 1 of 35 exemplars uses it; macOS verification is documented as off and "we recommend that you don't enable". Trend: Linux default flipped to on in .NET 8 (2023); no macOS change seen up to SDK 11 RC1. As of 2026-10-11 the practical line is mirror/regulated pipelines yes, ordinary OSS library no.
- **Owners allowlist.** Powerful, brittle (case-sensitive, transitive owners), rarely used; whether tooling will offer lock-file-like owner pinning is open. Watch NuGet/Home issues linked from the trust docs.
- **Build-time code from packages.** The ReversingLabs write-up calls the NuGet security implications of auto-imported `.targets` "an unresolved GitHub discussion"; there is still no allowlist or sandbox for `build/` assets or analyzers (2023 article, unchanged by SDK 10/11 RC1 in this research). `ExcludeAssets` is per reference.
- **SBOM format.** SPDX 2.2 (Microsoft.Sbom.Targets default `SbomGenerationManifestInfo`) vs CycloneDX 1.7 (tool default). Neither is signed or attested by default. Both live in the "release asset" slot until the repo decides on GitHub artifact attestations (release topic).
- **Cooldown.** Moved from opt-in (2025-07) to the Dependabot default (2026-07-14, 3 days). Trend: longer defaults (openai 8 d, simple-exec 7 d, GitVersion 7 d for majors). Security updates are exempt; a cooldown does not help against a malicious release that stays up past the window.
- **Pruning (NuGet 6.13+, on by default for net10+).** Shrinks the net10 dependency group (verified: empty group) and false-positive audits; interacts with lock files (NuGet docs). .NET 11 / NuGet 7.11-rc: no behavioural difference observed in V1/V6/V10.
- **`GlobalPackageReference` vs per-project `PrivateAssets`.** The corpus uses both (12 global, ~200 private). The measured no-leak guarantee favours `GlobalPackageReference`; its project-wide scope is the trade-off. Dependabot support for updating it was not verified.
- **Primary-source gaps.** The Socket report itself returned 404 (secondary article used); Renovate's CPM/`minimumReleaseAge` behaviour is not documented on its nuget page; Dependabot's `GlobalPackageReference` handling is unverified; macOS enforcement is docs plus a Linux simulation.

## Sources

Primary (17):

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://learn.microsoft.com/en-us/nuget/consume-packages/package-references-in-project-files | NuGet PackageReference docs: IncludeAssets/ExcludeAssets/PrivateAssets defaults, developmentDependency note, locking, PrunePackageReference | updated 2026-08 | The defaults behind the nuspec leak; pruning behaviour on net10 |
| https://learn.microsoft.com/en-us/nuget/consume-packages/installing-signed-packages | "Manage package trust boundaries": require mode, trustedSigners, owners, sync | 2018 page, updated 2025-10 | Exact config shapes; owners semantics |
| https://learn.microsoft.com/en-us/nuget/reference/nuget-config-file | nuget.config reference: `signatureValidationMode`, `trustedSigners` schema, `auditSources`, source mapping notes | updated 2026-08 | Default `accept`; non-empty trustedSigners requirement |
| https://learn.microsoft.com/en-us/dotnet/core/tools/nuget-signed-package-verification | Per-OS verification defaults, env var, cert bundles | updated 2024-03 | The macOS-off / Linux-on-from-.NET-8 matrix behind V9 |
| https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-nuget-verify | `dotnet nuget verify` options | updated 2026-04 | `--all`, `--certificate-fingerprint`; content hash in .NET 10 |
| https://learn.microsoft.com/en-us/nuget/concepts/security-best-practices | NuGet supply-chain best practices | updated 2026-08 | Which defences NuGet itself offers (and that none inspects content) |
| https://learn.microsoft.com/en-us/nuget/nuget-org/id-prefix-reservation | ID prefix reservation and the checkmark | 2019, updated 2022 | What `verified` does and does not mean |
| https://learn.microsoft.com/en-us/nuget/api/search-query-service-resource | NuGet V3 search API, `verified`, `owners` fields | updated 2026-08 | Basis for the existence/ownership check |
| https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-package-list | `dotnet package list` (noun-first in .NET 10), `--include-transitive`, `--vulnerable`, `--format json` | updated 2025-12 | Command forms and the audit-sources note |
| https://github.com/microsoft/sbom-tool/blob/main/src/Microsoft.Sbom.Targets/README.md | Microsoft.Sbom.Targets README (read via `gh api`) | tool v4.1.5 release 2025-12; package 4.1.13 used | Properties, defaults, `_manifest` location |
| https://github.com/microsoft/sbom-tool/blob/main/docs/feature-overview.md | SBOM tool feature overview (read via `gh api`) | current main | Which fields need `-pm`/`-li` and what component detection reads |
| https://github.com/CycloneDX/cyclonedx-dotnet | CycloneDX .NET tool README | 2026 | `-ed`, `-spv`, requirements |
| https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference | Dependabot options reference (cooldown, groups, ignore) | 2026 | NuGet/dotnet-sdk cooldown support; security-update exemption |
| https://devblogs.microsoft.com/dotnet/the-new-dependabot-nuget-updater/ | New Dependabot NuGet updater | 2025-08-04 | CPM support, transitive direct-pin behaviour |
| https://github.blog/changelog/2026-07-14-dependabot-version-updates-introduce-default-package-cooldown/ | Dependabot default 3-day cooldown | 2026-07-14 | Current default; security updates not delayed |
| https://docs.renovatebot.com/modules/manager/nuget/ | Renovate nuget manager | 2026 | File patterns, lock maintenance, range-strategy pitfalls |
| https://reversinglabs.com/blog/iamreboot-malicious-nuget-packages-exploit-msbuild-loophole | ReversingLabs on the 2023 `.targets` campaign | 2023 (technique current) | Build-time payloads; the unresolved-discussion statement |

Secondary / live service (2):

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://dailysecurityreview.com/cyber-security/five-malicious-nuget-packages-target-chinese-net-developers/ | Coverage of Socket's May 2026 `IR.*` typosquat report | 2026-05-12 | 2026 calibration; primary Socket page unavailable |
| https://azuresearch-usnc.nuget.org/query | nuget.org search service (live queries) | 2026-10-11 | `verified`/`owners`/`totalDownloads` as measured |

Exemplar files (read, 20): `App-vNext__Polly@e4476096da5b:NuGet.config`, `App-vNext__Polly@e4476096da5b:.github/dependabot.yml`; `openai__openai-dotnet@1f0e8829acac:nuget.config`, `…:Directory.Build.targets`, `…:Directory.Packages.props`, `…:.github/dependabot.yml`; `adamralph__simple-exec@f80913246993:src/Directory.Build.props`, `…:Directory.Packages.props`, `…:Directory.Build.props`, `…:.github/dependabot.yml`; `Humanizr__Humanizer@4574b93883bf:nuget.config`, `…:tools/docs/verify-aot.ps1`; `GitTools__GitVersion@5057cdbcc177:.github/dependabot.yml`; `xunit__xunit@0c7aa4991fa3:NuGet.Config`; `dotnet__aspire@af646baee1e8:Directory.Packages.props`; `DapperLib__Dapper@eb47546a408b`, `microsoft__vs-threading@f6d817997090`, `MessagePack-CSharp__MessagePack-CSharp@242bdad51f89`, `dotnet__BenchmarkDotNet@61ebda8a50ae`, `coverlet-coverage__coverlet@ecd6fd5533e7` (`Directory.Packages.props` / `build/common.props` GlobalPackageReference lines). Peer nuspecs: `https://api.nuget.org/v3-flatcontainer/<id>/<version>/<id>.nuspec` for the packages in 2.1 (live reads, 2026-10-11).
