---
title: "Public API evolution gates for a .NET library: PublicApiAnalyzers, package validation, snapshots, SemVer, release steps"
topic: csharp-api / csharp-api-evolution-gates
agent: deep-dive researcher (sonnet)
model: claude-sonnet-5-5
date_researched: 2026-10-10
sources_count: 27
scope: |
  Covers the build-time gates that guard a published .NET library's public surface across releases: Microsoft.CodeAnalysis.PublicApiAnalyzers (RS00xx, PublicAPI.Shipped/Unshipped.txt, per-TFM layouts), SDK package validation / ApiCompat (CP00xx, PKV00x, baseline version, suppression files), the .NET library change rules (optional parameters, overloads, CancellationToken, sealing, interface members), snapshot alternatives (PublicApiGenerator, GenAPI listings), [Obsolete]/[Experimental] deprecation, the SemVer mapping, and the release-time promotion steps (feeds the dotnet-release skill).
  Not covered: API design taste (naming, async shape, exceptions - see sibling csharp-api-* artifacts), behavioral-compat testing beyond naming the gap, NuGet signing/publishing mechanics, Windows-host execution (every claim here ran on Linux x64; the gates are managed code and TFM-independent, see Contested for what was not re-run on Windows/arm64), and C# 15 `union` / .NET 11 specifics (RC1, flagged where relevant).
---

# Public API evolution gates for a .NET library

## Contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Two gates, two questions](#1-two-gates-two-questions)
   2. [PublicApiAnalyzers: mechanics and traps](#2-publicapianalyzers-mechanics-and-traps)
   3. [Package validation (ApiCompat): mechanics and traps](#3-package-validation-apicompat-mechanics-and-traps)
   4. [Library change rules: what is binary-breaking](#4-library-change-rules-what-is-binary-breaking)
   5. [Optional parameters, overloads, CancellationToken](#5-optional-parameters-overloads-cancellationtoken)
   6. [Multi-targeting: file layout and churn](#6-multi-targeting-file-layout-and-churn)
   7. [Snapshot alternatives](#7-snapshot-alternatives)
   8. [Deprecation: Obsolete and Experimental](#8-deprecation-obsolete-and-experimental)
   9. [SemVer: what each gate enforces](#9-semver-what-each-gate-enforces)
   10. [Release-time steps](#10-release-time-steps)
   11. [Exemplar survey](#11-exemplar-survey)
   12. [Verified on the toolchain](#12-verified-on-the-toolchain)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- Make BOTH gates mandatory for any packable library: PublicApiAnalyzers (declares the surface, blocks accidental publicity, enforces overload/nullability hygiene) AND `EnablePackageValidation` + `PackageValidationBaselineVersion` (compares the real binary against the last release). They answer different questions; neither subsumes the other (verified: `an-evade-optional` is analyzer-green and pack-red with CP0002).
- The analyzer is a declaration gate, not a compatibility gate: a `*REMOVED*` line in `PublicAPI.Unshipped.txt` makes a binary break analyzer-green. Only package validation compares binaries.
- Package validation runs on `dotnet pack`, not `dotnet build`, and the `.nupkg` is still written to disk when validation fails (exit 1). CI must publish only when pack exited 0.
- Adding an optional parameter to a shipped method is source-compatible but binary-breaking. Package validation reports `CP0002 Member 'string Acme.Greeter.Hello(string)' exists on [Baseline]` (red); the analyzer reports RS0016 + RS0017. Fix: keep the old overload, add the new one ([MS baseline-validator example](https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/package-validation/baseline-version-validator), `pv-green-overload` green).
- RS0017 (removed API) and RS0050 are reported on the API text file, so `.editorconfig` severity does NOT apply; they stay warnings. Set severities in `.globalconfig` (or use `-warnaserror` / `TreatWarningsAsErrors` in CI). Verified: `.editorconfig` error left RS0017 a warning (exit 0); `.globalconfig` and `-warnaserror` made it exit 1.
- Do not set `dotnet_public_api_analyzer.require_api_files = true` in a single-package library: with the files missing or mis-wired the analyzer then passes silently (verified exit 0). Without it a missing file floods RS0016 (loud).
- Bootstrap `PublicAPI.*.txt` with `#nullable enable` in both files BEFORE running the RS0016 code fix (`dotnet format analyzers --diagnostics RS0016 RS0036`); otherwise the fixer writes oblivious entries and RS0036 fires on every line (verified).
- Multi-target layout that scales: one shared `PublicAPI/PublicAPI.{Shipped,Unshipped}.txt` pair plus per-TFM delta directories only for TFMs whose surface differs, wired with `Exists('PublicAPI/$(TargetFramework)')` ([`App-vNext__Polly@e4476096da5b:eng/Library.targets:57-71`](#11-exemplar-survey), testfx `TestFramework.Extensions.csproj:102-108`). A single root pair with TFM-conditional API yields RS0017 on the TFM that lacks the symbol (verified).
- For "add CancellationToken / more options to an existing method": keep the shipped overload, add ONE new overload that carries the optional parameters and has the most parameters; older overloads keep mandatory-only parameters ([Roslyn guide](https://raw.githubusercontent.com/dotnet/roslyn/main/docs/Adding%20Optional%20Parameters%20in%20Public%20API.md)). Two overloads with defaults trip RS0026; an optional-bearing overload with fewer parameters than a sibling trips RS0027 (both verified red).
- Interface members: adding one without a default body is CP0006 (red); adding it with a default interface member is analyzer- and ApiCompat-green, but is a source break for `ref struct` implementers in C# 13+ ([library-change-rules](https://learn.microsoft.com/en-us/dotnet/core/compatibility/library-change-rules)). Prefer abstract classes or a new `IFoo2` interface for extension points.
- Sealing a shipped unsealed type is CP0009 (red); adding an abstract member to an unsealed type with accessible constructors is CP0005 (red); dropping a target framework is PKV006 (red). Parameter renames (CP0017) and attribute changes (CP0016) are OFF by default; opt in with `ApiCompatEnableRuleCannotChangeParameterName=true` / `ApiCompatEnableRuleAttributesMustMatch=true` (CP0017 verified red; CP0016 did not fire for an added `[Obsolete]` even with the flag).
- Package validation is incremental (semaphore file under `obj/`): a previously passing project with unchanged inputs is not re-validated when only a `-p:` flag changes. Use fresh checkouts in CI; delete `obj/**/Microsoft.NET.ApiCompat.ValidatePackage.semaphore` when experimenting (verified).
- `ApiCompatVersion` (Azure.Core, OpenAI csproj) is NOT an SDK property: copying it yields a silent no-op and a red change passes (verified exit 0). The SDK property is `PackageValidationBaselineVersion`.
- A baseline must exist on a configured feed: `PackageValidationBaselineVersion=0.9.0` with no such package fails restore with `NU1102`. So the baseline bump is a post-publish commit, never part of the release PR. A prerelease baseline (`1.0.0-beta.1`) worked in the fixture although the docs say "stable".
- Deprecate with `[Obsolete("msg", DiagnosticId = "ACME0001", UrlFormat = "https://.../{0}")]`; ship unfinished surface with `[Experimental("ACMEEXP001")]` (.NET 8+). Both give the consumer a separate suppressible ID; plain `[Obsolete]` is CS0618 and cannot be suppressed per-API. Verified output in section 8.
- SemVer mapping that the gates can enforce mechanically: no `PublicAPI.Unshipped.txt` change = patch; only added lines = minor; any `*REMOVED*` line or any baseline `CompatibilitySuppressions.xml` entry = major (minor while 0.y.z). Behavior breaks (exception types, parse tolerance, exit-code mapping) are invisible to both gates and need contract tests.
- Release step order: choose version from the Unshipped diff, promote Unshipped into Shipped (script in section 10, verified), pack with validation, publish only on exit 0, THEN bump the baseline and delete the suppression file. After promotion `PublicAPI.Unshipped.txt` contains only `#nullable enable`.
- Snapshot tests (PublicApiGenerator + Verify, or GenAPI listings) are a useful third layer for human-readable diffs and per-TFM listings, but a golden file can be regenerated blindly and has no concept of the released baseline; do not use it as the only gate (verified: `snap.sh write` silences it).

## Findings

### 1. Two gates, two questions

| Question | PublicApiAnalyzers | Package validation (ApiCompat) | Snapshot (PublicApiGenerator) |
|---|---|---|---|
| Runs on | `dotnet build` (compiler analyzer) | `dotnet pack` (target `RunPackageValidation` AfterTargets=Pack) | a test run |
| Compares | source symbols vs committed text files | packed assemblies vs baseline package | built assembly vs committed golden |
| Catches new public API nobody declared | yes (RS0016) | no (additions are legal) | yes (diff) |
| Catches removal/signature change | yes IF author does not write `*REMOVED*` (RS0017) | yes, authoritative (CP0002) | yes (diff) |
| Catches seal / abstract / iface member / TFM drop | no | yes (CP0009, CP0005, CP0006, PKV006) | only as text diff |
| Catches overload-with-optional-params hygiene | yes (RS0026, RS0027) | no | no |
| Nullability annotations of surface | yes (RS0036, RS0037, RS0041) | no | partly |
| Can be silenced by editing files in the same PR | yes (`*REMOVED*`, `NoWarn`) | yes (regenerated suppression file) | yes (rewrite golden) |
| Default severity | warning ([rules table](https://raw.githubusercontent.com/dotnet/roslyn/main/src/RoslynAnalyzers/PublicApiAnalyzers/Microsoft.CodeAnalysis.PublicApiAnalyzers.md)) | error (pack fails) | test failure |

Primary-source basis: the SDK documents package validation as "Validates that there are no breaking changes across versions" ([overview](https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/package-validation/overview)); the analyzer package's own help only documents tracking and the rule list ([Help.md](https://raw.githubusercontent.com/dotnet/roslyn-analyzers/main/src/PublicApiAnalyzers/PublicApiAnalyzers.Help.md)). Corpus: 9 repos use the analyzer and 6 enable package validation (audit `exemplar-build-and-gates.md:264,316`); only Polly combines both (`App-vNext__Polly@e4476096da5b:eng/Library.targets:16-17,51-71`).

Decision: both mandatory for a packable library. The analyzer is the cheap, always-on, inner-loop gate (local build shows the problem); package validation is the release truth. Skip package validation only for the very first release (no baseline exists), then enable the baseline immediately after the first publish (section 10).

### 2. PublicApiAnalyzers: mechanics and traps

**Package and version.** `Microsoft.CodeAnalysis.PublicApiAnalyzers` latest stable 5.6.0 (nuget.org page, published 2026-07-02), latest prerelease 5.11.0-1.26425.128 (2026-09-08), "no dependencies", no framework assets ([nuget.org](https://www.nuget.org/packages/Microsoft.CodeAnalysis.PublicApiAnalyzers)). Reference with `PrivateAssets="all"` (`adamralph__simple-exec@f80913246993:src/Directory.Build.props:26`, `npgsql__npgsql@9c47244547c2:src/Npgsql/Npgsql.csproj:18`). Polly pins 5.6.0 centrally (`App-vNext__Polly@e4476096da5b:Directory.Packages.props:12`).

**Files.** `PublicAPI.Shipped.txt` + `PublicAPI.Unshipped.txt` next to the csproj. Verified on 5.6.0: root-level files are picked up with no `<AdditionalFiles>` (the Help.md `AdditionalFiles` block is for "packages before 3.3.x"). Entry grammar (all from the fixture): `static Acme.Greeter.Hello(string! name) -> string!`; first line `#nullable enable`; `!` non-null, `?` nullable, `~` prefix oblivious; `*REMOVED*<full old line>` marks a removal in Unshipped ([Help.md](https://raw.githubusercontent.com/dotnet/roslyn-analyzers/main/src/PublicApiAnalyzers/PublicApiAnalyzers.Help.md); `*REMOVED*` also in the [rules table](https://raw.githubusercontent.com/dotnet/roslyn/main/src/RoslynAnalyzers/PublicApiAnalyzers/Microsoft.CodeAnalysis.PublicApiAnalyzers.md) RS0017 text and the [Roslyn guide](https://raw.githubusercontent.com/dotnet/roslyn/main/docs/Adding%20Optional%20Parameters%20in%20Public%20API.md)). Polly's files start with a UTF-8 BOM (`App-vNext__Polly@e4476096da5b:src/Polly.Core/.PublicAPI/PublicAPI.Unshipped.txt:1`), so checks must not anchor `^#nullable`.

**Rules that matter** (IDs and titles from the [rules table](https://raw.githubusercontent.com/dotnet/roslyn/main/src/RoslynAnalyzers/PublicApiAnalyzers/Microsoft.CodeAnalysis.PublicApiAnalyzers.md); defaults: Warning, enabled; RS0051-RS0061 internal/duplicate variants are disabled by default):

| ID | Title | Fires when | Verified message / fixture |
|---|---|---|---|
| RS0016 | Add public types and members to the declared API | public symbol absent from Shipped+Unshipped | `an-red-unlisted` exit 1 |
| RS0017 | Remove deleted types and members from the declared API | listed symbol not in source | `an-red-removed`: warning, exit 0 by default |
| RS0026 | Do not add multiple public overloads with optional parameters | two overloads carry defaults | `an-ct-optional2` exit 1 |
| RS0027 | API with optional parameter(s) should have the most parameters amongst its public overloads | optional-bearing overload is not the widest | `an-rs0027` exit 1 |
| RS0036 | Annotate nullability of public types and members | entries lack `!`/`?` while header present | `an-rs0036` exit 1 |
| RS0037 | Enable tracking of nullability of reference types | file lacks `#nullable enable` | `an-rs0037` exit 1 |
| RS0041 | Public members should not use oblivious types | `~` entries remain | not run |
| RS0048 | Missing shipped or unshipped public API file | file missing or unregistered | not run |
| RS0050 | API is marked as removed but it exists in source code | `*REMOVED*` line whose symbol still exists | not run |

**Incorrect: severity in `.editorconfig` for RS0017.**

```ini
# .editorconfig  - RS0016 obeys this, RS0017 does NOT (reported on the .txt file, no syntax tree)
[*.cs]
dotnet_diagnostic.RS0016.severity = error
dotnet_diagnostic.RS0017.severity = error   # still a warning; build exits 0
```

**Correct: `.globalconfig` (testfx does this for a related reason, `microsoft__testfx@7226b0c74729:.globalconfig:3-11`, which also explains that analyzer options are read from "the first tree").**

```ini
# .globalconfig at repo root
is_global = true
dotnet_diagnostic.RS0016.severity = error
dotnet_diagnostic.RS0017.severity = error
dotnet_diagnostic.RS0026.severity = error
dotnet_diagnostic.RS0027.severity = error
dotnet_diagnostic.RS0036.severity = error
dotnet_diagnostic.RS0037.severity = error
```

Equivalent CI form: `dotnet build -warnaserror` (verified: `an-red-removed -warnaserror` exit 1, and `-p:WarningsAsErrors=RS0017` exit 1). simple-exec instead blankets `dotnet_analyzer_diagnostic.severity = warning` in `.globalconfig` and relies on `TreatWarningsAsErrors` in Release (`adamralph__simple-exec@f80913246993:.globalconfig:3`).

**`require_api_files` hazard.** `dotnet_public_api_analyzer.require_api_files = true` makes the analyzer "bail out silently" when files are missing (Help.md). Verified: a project with zero API files and that option builds green under `TreatWarningsAsErrors` (exit 0); the same project without the option fails (`RS0016 x18, RS0037 x10`). testfx needs it because it has source-only projects without API files (`.globalconfig:3-11`); a single-package library does not.

**Bootstrap order (verified).** Seed both files with `#nullable enable` first, then run the code fix:

```bash
printf '#nullable enable\n' > PublicAPI.Shipped.txt
printf '#nullable enable\n' > PublicAPI.Unshipped.txt
dotnet format analyzers Acme.Lib.csproj --diagnostics RS0016 RS0036 --severity warn --no-restore
# writes sorted, annotated entries (string!) into PublicAPI.Unshipped.txt; then promote once for 1.0.0 (section 10)
```

Wrong order (files empty, no header) produced `Acme.IPlugin.Id.get -> string` entries and `error RS0036 x10`. If the project already sets these IDs to `error`, `--severity warn` formatted nothing in one run and `--severity info` worked; use `--severity info` when the fixer reports "Formatted 0 of N files".

**Modern C# shapes (verified on SDK 10.0.401 + analyzer 5.6.0).** Records generate 12+ entries (`virtual Acme.Options.<Clone>$() -> Acme.Options!`, `EqualityContract`, `PrintMembers`, `Deconstruct`, copy ctor, `==`/`!=`); C# 14 `extension(string s) { ... }` blocks are tracked as `Acme.StringExt.extension(string!)` plus `static Acme.StringExt.get_Len(string! s) -> int` (`an-modern` green). Never hand-write these; use the code fix.

### 3. Package validation (ApiCompat): mechanics and traps

**Enable.** `<EnablePackageValidation>true</EnablePackageValidation>` plus `<PackageValidationBaselineVersion>1.0.0</PackageValidationBaselineVersion>`; checks run after `Pack` ([overview](https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/package-validation/overview), [baseline validator](https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/package-validation/baseline-version-validator)). Three validators: baseline, compatible runtime (TFM vs TFM, `EnableStrictModeForCompatibleTfms` default `true`), compatible framework in package (`EnableStrictModeForCompatibleFrameworksInPackage` default `false`) ([msbuild-props](https://learn.microsoft.com/en-us/dotnet/core/project-sdk/msbuild-props)). The SDK implements it in `Microsoft.NET.ApiCompat.ValidatePackage.targets`; the baseline path is read from the NuGet global packages folder (`$(NuGetPackageRoot)/<id>/<ver>/<id>.<ver>.nupkg`), which is why the baseline must be restorable (`dotnet-tools/dotnet/sdk/10.0.401/Sdks/Microsoft.NET.Sdk/targets/Microsoft.NET.ApiCompat.ValidatePackage.targets:29`).

**Diagnostics seen and documented** ([diagnostic IDs](https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/diagnostic-ids)):

| ID | Meaning | Fixture result |
|---|---|---|
| CP0002 | member missing from compared side | remove overload; add optional param (both red) |
| CP0005 | abstract member added to unsealed type | red (+CP0019 because the class became abstract) |
| CP0006 | member added to interface without default impl | red; with DIM green |
| CP0009 | type sealed | red (+CP0012 virtual removed) |
| CP0017 | parameter name changed | red ONLY with `ApiCompatEnableRuleCannotChangeParameterName=true` |
| CP0016 | attribute added | not raised for added `[Obsolete]` (flag on or off) |
| PKV006 | target framework dropped in latest version | red (`mt-c-drop-tfm`) |
| "Unnecessary suppressions found" | stale `CompatibilitySuppressions.xml` entry | red (`pv-sup-stale`) |

**Traps (all verified, SDK 10.0.401):**

1. `dotnet build` does not validate; `dotnet pack` does. A red fixture builds green (`Build succeeded`, exit 0).
2. On failure the package is already written: `pv-red-*` leave `out/<name>/Acme.Lib.<ver>.nupkg` while exiting 1. A glob-based `dotnet nuget push **/*.nupkg` would publish a breaking package.
3. The target is incremental (`Inputs=@(NuGetPackInput);@(ApiCompatSuppressionFile)`, `Outputs=$(_ApiCompatValidatePackageSemaphoreFile)`, targets file lines 19-25). A passing project is not re-validated when only a `-p:` rule flag changes; deleting the semaphore re-runs it (CP0017 appeared only after deletion). Failed validations leave no semaphore, so a red stays red on re-run.
4. `-p:ApiCompatGenerateSuppressionFile=true` turns red into exit 0 and writes `CompatibilitySuppressions.xml` with `IsBaselineSuppression=true`; `-p:GenerateCompatibilitySuppressionFile=true` (the name on the diagnostic-ids page) works identically on 10.0.401. The SDK's own error text recommends `/p:ApiCompatGenerateSuppressionFile=true`. Both are one-shot command-line switches; never commit them in a project file.
5. A stale suppression fails the pack (`ApiCompatPermitUnnecessarySuppressions` defaults false), so the file must be deleted after the release that accepted the break (MS: "After you've released version 2.0.0 ... you can delete the CompatibilitySuppressions.xml file").
6. Wrong baseline version: `NU1102: Unable to find package Acme.Lib with version (= 0.9.0)`. Nothing is skipped silently - unless the property name is wrong: `<ApiCompatVersion>` (Azure.Core.csproj:7, OpenAI.csproj:7) is not an SDK property and silently disables the check (`pv-noop-apicompatversion` passed a change that `pv-red-optional` rejects).
7. SDK 8.0.425 and 11.0 RC1 reproduce the same results (`CP0002` red / overload green; fixtures `sdk8/`, `sdk11/`). The gate does not require the .NET 10 SDK.
8. Compatible-TFM suppressions are a different, non-baseline kind: Polly's `CompatibilitySuppressions.xml` has 3 CP0002 entries comparing `lib/netstandard2.0` against `lib/net6.0` for serialization constructors, no `IsBaselineSuppression` (`App-vNext__Polly@e4476096da5b:src/Polly.Core/CompatibilitySuppressions.xml:4-15`).

**Non-packable or tool-only use.** `dotnet tool install --global Microsoft.DotNet.ApiCompat.Tool`; `apicompat package current.nupkg --baseline-package baseline.nupkg` ([global tool](https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/global-tool)). OpenAI wraps exactly that: downloads the baseline from nuget.org and runs `apicompat package` (`openai__openai-dotnet@1f0e8829acac:scripts/Test-ApiCompatibility.ps1:116-124`), ignoring experimental namespaces by regex (lines 130-131, 202). Prefer the in-SDK property; use the tool only when the MSBuild flow cannot be used.

### 4. Library change rules: what is binary-breaking

Source: [.NET API changes that affect compatibility](https://learn.microsoft.com/en-us/dotnet/core/compatibility/library-change-rules) (updated 2026-04-14), [Breaking changes and .NET libraries](https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/breaking-changes), [dotnet/runtime breaking-change-rules.md](https://raw.githubusercontent.com/dotnet/runtime/main/docs/coding-guidelines/breaking-change-rules.md). Verdicts (quoted keywords) mapped to what the gates did:

| Change | Verdict | Gate result (fixture) |
|---|---|---|
| Adding/removing/reordering parameters | DISALLOWED | `Hello(string)` -> `Hello(string, string="Hello")`: CP0002 + RS0016/RS0017 |
| Renaming a parameter (even case) | DISALLOWED (named args, late binding) | CP0017 only with opt-in flag; analyzer: `~` text changes -> RS0016/RS0017 |
| Adding an overload that "precludes an existing overload and defines a different behavior" | DISALLOWED | no gate (not run); review heuristic |
| Changing a parameter default value | DISALLOWED (behavioral; not a binary break) | not run; expected RS0016/RS0017 (default text is in the file), ApiCompat blind |
| Sealing a type that was unsealed | DISALLOWED | CP0009 |
| Adding an abstract member to a type with accessible ctors and not sealed | DISALLOWED | CP0005 |
| Adding a member to an interface | REQUIRES JUDGMENT (DIM raises floor to C# 8/.NET Core 3.0; `ref struct` implementers break in C# 13+) | CP0006 without DIM; green with DIM |
| Adding the `sealed` keyword to an interface member | DISALLOWED | CP0018 per the ID table (not run) |
| Changing `params T[]` to `params ReadOnlySpan<T>` | DISALLOWED (binary) | not run; expected CP0002 + RS0016/RS0017 (signature text changes) |
| Converting a `this` extension method to a C# 14 `extension` block | ALLOWED (identical IL) | analyzer lists new block entries; not run through ApiCompat |
| Adding/removing a case type of a `union` (C# 15, .NET 11 RC1) | DISALLOWED | not run (RC1; flag) |
| Adding `OverloadResolutionPriorityAttribute` to an existing overload | REQUIRES JUDGMENT (source break) | no gate |
| Throwing a new exception / changing exception type | DISALLOWED unless new code path | NO gate |
| Changing a sync API to async | DISALLOWED | not run; expected CP0002 (signature change) |

**Incorrect / correct: extending a shipped method**

```csharp
// 1.0 shipped:  public static string Hello(string name)
// INCORRECT in 1.1 (source-compatible, binary-breaking; CP0002, RS0017):
public static string Hello(string name, string greeting = "Hello") => $"{greeting}, {name}";

// CORRECT (pv-green-overload, an-green-overload: exit 0 on both gates):
public static string Hello(string name) => Hello(name, "Hello");               // 1.0 shape kept
public static string Hello(string name, string greeting) => $"{greeting}, {name}";
```

**Incorrect / correct: interface growth**

```csharp
public interface IPlugin { string Id { get; } string Version { get; } }          // CP0006 (red)
public interface IPlugin { string Id { get; } string Version => "1"; }           // green on both gates; still a source break
                                                                                  // for ref-struct implementers (C# 13+)
public interface IPluginV2 : IPlugin { string Version { get; } }                  // no break, no judgment call
```

MS library guidance prefers abstract base classes to interfaces for extension points because "Adding anything to an interface will cause existing types that implement it to fail" ([breaking-changes](https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/breaking-changes)). Sealing: seal NEW types by default (`public sealed class`); unsealing later is allowed, sealing later is CP0009.

### 5. Optional parameters, overloads, CancellationToken

The canonical Roslyn pattern ([Adding Optional Parameters in Public API](https://raw.githubusercontent.com/dotnet/roslyn/main/docs/Adding%20Optional%20Parameters%20in%20Public%20API.md)): keep ONE overload with optional parameters and the most parameters; every older overload stays and takes only mandatory parameters, tagged `// <release> BACKCOMPAT OVERLOAD -- DO NOT TOUCH`; if the analyzer flags the change, copy the old Shipped entry into Unshipped with `*REMOVED*`.

Fixture matrix (analyzer rules at `error`):

| Fixture | Shape | RS result | ApiCompat result |
|---|---|---|---|
| `an-ct-optional` | `Hello(string)` + `Hello(string, CancellationToken ct = default)` | green | green (`pv-green-cancel`) |
| `an-ct-optional2` | adds `Hello(string, string, CancellationToken ct = default)` | RS0026 x4 | green |
| `an-rs0027` | `Hello(string,int a=0)` + `Hello(string,int,int)` | RS0027 | green |
| `an-ct-explicit` | `Hello(string)`, `Hello(string,CancellationToken)`, `Hello(string,string,CancellationToken)` (no defaults) | green | green |
| `an-canonical` | `Hello(string)` kept + `Hello(string, string greeting = "Hello")` | green | green |

So: new async-capable methods may take `CancellationToken cancellationToken = default` from day one; ADDING a token to a SHIPPED method is a new overload, and when a second optional-bearing overload would appear, switch the newest overloads to explicit (no-default) parameters (`an-ct-explicit`) or restructure to the canonical pattern.

**Why `adamralph__simple-exec` suppresses RS0026.** `Command` declares `Run`, `RunAsync`, `ReadAsync` each twice - `string args = ""` vs `IEnumerable<string> args` - and every one carries 9 optional parameters plus `Ct ct = default` (`adamralph__simple-exec@f80913246993:src/SimpleExec/Command.cs:46-58` and `:103-114`; overloads at `:182,:240,:317,:373`). That is exactly what RS0026 forbids, so one `#pragma warning disable RS0026` precedes the class (`Command.cs:12`). The repo records no rationale (no comment; history unavailable in the clone). The surrounding choices explain the posture: it also disables RS0016 and RS0037 (`src/Directory.Build.props:16-17`), has no `PublicAPI.*.txt`, and instead guards the surface with a PublicApiGenerator golden test (`tests/Tests/PublicApi.cs:9-16`, `tests/Tests/PublicApi.Surface.expected.txt`). It is a single-maintainer lib that traded the declared-API workflow for a snapshot, and accepts that future parameter additions need overloads. A library with a package-validation baseline should NOT copy this: RS0026 is the guard that keeps binary-compat additions possible.

Other exemplar stances: npgsql turns RS0026/RS0027 off for the whole `src/` tree (`npgsql__npgsql@9c47244547c2:src/.editorconfig:11,14`) while keeping RS0016 (turned off only for `src/*/Internal/**.cs`, `.editorconfig:67-68`); testfx keeps RS0027 on and suppresses it per site with a written reason: the shipped 3-parameter constructor keeps its optional `description` "for binary compatibility" while a wider overload adds `kind` (`microsoft__testfx@7226b0c74729:src/Platform/Microsoft.Testing.Platform/Messages/FileArtifacts.cs:6-12`, repeated `:118-123`). The testfx style is the one to copy: suppress narrowly, with the binary-compat reason adjacent.

### 6. Multi-targeting: file layout and churn

Experiment (`net8.0;net10.0`, API: common `Hello`, `Bye`; `Wave` only under `#if NET10_0_OR_GREATER`):

| Layout | Files | Result |
|---|---|---|
| A: one root pair listing `Wave` | 2 | net8.0 inner build: `RS0017 Symbol 'static Acme.Greeter.Wave(...)' is part of the declared API, but is either not public or could not be found`; warning by default (exit 0), exit 1 with `-warnaserror` |
| B: full pair per TFM `PublicAPI/$(TargetFramework)/...` | 4 | green; every common API is listed twice |
| C: shared pair + delta dirs for differing TFMs | 2 + 2 | green; common API listed once |

Layout C csproj (verified, `mt-c-shared`):

```xml
<ItemGroup>
  <AdditionalFiles Include="PublicAPI/PublicAPI.Shipped.txt" />
  <AdditionalFiles Include="PublicAPI/PublicAPI.Unshipped.txt" />
</ItemGroup>
<ItemGroup Condition="Exists('PublicAPI/$(TargetFramework)')">
  <AdditionalFiles Include="PublicAPI/$(TargetFramework)/PublicAPI.Shipped.txt" />
  <AdditionalFiles Include="PublicAPI/$(TargetFramework)/PublicAPI.Unshipped.txt" />
</ItemGroup>
```

Churn for one 1.1 change set (new `Nod` on all TFMs, new `Bow` net10-only): layout B touched 2 files / +3 lines (Nod twice, Bow once); layout C touched 2 files / +2 lines. At fixture scale the difference is small; at library scale it is the duplication of the whole shared surface per TFM. Real data: Azure.Core's per-TFM listings are 1846 lines each for net8.0 and net10.0 with 0 differing lines (`Azure__azure-sdk-for-net@32c48fc3d524:sdk/core/Azure.Core/api/Azure.Core.net8.0.cs` vs `.net10.0.cs`; `net462` vs `netstandard2.0` also 0 differing of 1786); net8.0 vs netstandard2.0 differs on 80 lines. testfx uses layout C: `TestFramework.Extensions` has a 44-line shared Shipped file and per-TFM deltas of 4-114 lines (`net462` 114, `net8.0` 12, `net9.0` 12, `netstandard2.0` 12, `uap10.0.16299` 4), wired at `microsoft__testfx@7226b0c74729:src/TestFramework/TestFramework.Extensions/TestFramework.Extensions.csproj:102-108`. Polly wires the same `Exists(...)` conditions, including by `GetTargetFrameworkIdentifier` (`App-vNext__Polly@e4476096da5b:eng/Library.targets:57-71`) but ships only the shared pair today (5 `.PublicAPI` dirs, no TFM subdirs).

Package validation does the cross-TFM part for free: `mt-c-rm-wave` (Wave removed from net10.0 only) -> `CP0002` against the net10.0 asset; `mt-c-drop-tfm` -> `PKV006 Target framework net8.0 is no longer supported in the latest version`. File names must stay exactly `PublicAPI.Shipped.txt` / `PublicAPI.Unshipped.txt`; the analyzer identifies them by name, so directories carry the TFM.

### 7. Snapshot alternatives

**PublicApiGenerator + approval test** (Humanizer, simple-exec): `GeneratePublicApi()` returns the surface as C#-like text, "supports C# 8 Nullable Reference Types from version 10" ([README](https://github.com/PublicApiGenerator/PublicApiGenerator)); latest 11.5.4 (nuget flat container; Humanizer pins it, `Humanizr__Humanizer@4574b93883bf:Directory.Packages.props:17`). Humanizer verifies one file per TFM: `Verify(publicApi).ScrubLinesContaining("CommitHash","RepositoryUrl","InternalsVisibleTo","CloudBuildNumber").UniqueForTargetFrameworkAndVersion()` -> `...DotNet8_0/DotNet10_0/DotNet11_0/Net4_8.verified.txt` (130 KB each) (`Humanizr__Humanizer@4574b93883bf:tests/Humanizer.Tests/ApiApprover/PublicApiApprovalTest.cs:5-13`). Verified minimal equivalent here: `snap-tool` prints the surface per TFM, `snap.sh check` diffs against `snap-golden/<tfm>.txt`; adding an optional parameter to `Hello` showed `-Hello(string name)` / `+Hello(string name, string greeting = "Hello")` and exit 1; regenerating the golden restores green. The net8.0 golden had 9 lines and net10.0 11 (`Bow`, `Wave`), i.e. the TFM split is visible in review.

**GenAPI listings in-repo** (Azure, OpenAI): generated `.cs` files per TFM (`api/*.net8.0.cs` ...); OpenAI regenerates with `./scripts/Export-Api.ps1` (GenAPI, `openai__openai-dotnet@1f0e8829acac:scripts/Export-Api.ps1:234`) and fails CI if regeneration changes the tree: `integrity-checks.yml:95-111` ("API export produced changes. Please run './scripts/Export-Api.ps1' locally and commit the results."), with `api/in-progress/` vs `api/released/` and `api/api-version.txt` (2.14.0) marking the baseline. Azure additionally tracks `ApiCompatVersion` (1.63.0 for Azure.Core 1.64.0-beta.1, `Azure.Core.csproj:6-7`, "managed automatically and should not generally be modified manually") - a repo-specific mechanism; its consumer sits under `eng/` which the blob-less clone does not materialize, so its exact wiring is not verified here.

**Verdict.** Snapshots buy readable diffs and a reviewable per-TFM file; they cost a golden that an agent can regenerate with one command (`snap.sh write`). Use them as an additional layer for review ergonomics, never as the compatibility gate. xunit shows the opposite extreme: no analyzer, no validation, no snapshot found by `git grep -il -E "apicompat|publicapi|package.?validation|ApiApproval"` over `xunit__xunit@0c7aa4991fa3` (zero hits).

### 8. Deprecation: Obsolete and Experimental

`ObsoleteAttribute.DiagnosticId` "Gets or sets the ID that the compiler will use when reporting a use of the API" and `UrlFormat` is "a format string" that yields a URL containing the ID ([API](https://learn.microsoft.com/en-us/dotnet/api/system.obsoleteattribute)). Since .NET 5 the platform uses them for `SYSLIB0XXX`/`EXTOBS0XXX`; such warnings "can't be suppressed using the standard diagnostic ID (CS0618)" ([obsoletions overview](https://learn.microsoft.com/en-us/dotnet/fundamentals/syslib-diagnostics/obsoletions-overview)). `[Experimental("ID")]` (.NET 8+) lets a stable package ship preview APIs; use "your own diagnostic ID" per feature ([Preview APIs](https://learn.microsoft.com/en-us/dotnet/fundamentals/runtime-libraries/preview-apis), [API](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.codeanalysis.experimentalattribute)). `[RequiresPreviewFeatures]` is for the platform itself.

Verified consumer output (`obs-lib` + `obs-consumer`, SDK 10.0.401):

```text
error ACME0002: 'Api.Dead()' is obsolete: 'Removed in 3.0; use New().' (https://example.test/diag/ACME0002)
error ACMEEXP001: 'Obs.Api.Preview()' is for evaluation purposes only and is subject to change or removal in future updates. Suppress this diagnostic to proceed. (https://example.test/exp/ACMEEXP001)
warning ACME0001: 'Api.Old()' is obsolete: 'Use New().' (https://example.test/diag/ACME0001)
warning CS0618: 'Api.Plain()' is obsolete: 'Plain: use New().'
# consumer adds <NoWarn>ACME0001;ACMEEXP001</NoWarn>: both vanish; ACME0002 (error) and CS0618 remain
```

```csharp
// INCORRECT: unsuppressable per API, no pointer to guidance
[Obsolete("Use New().")]
// CORRECT
[Obsolete("Use New(); removal planned for 3.0.", DiagnosticId = "ACME0001", UrlFormat = "https://docs.example/diag/{0}")]
public static void Old() { }
[Experimental("ACMEEXP001", UrlFormat = "https://docs.example/exp/{0}")]
public static void Preview() { }
```

Gate interaction: adding `[Obsolete]` does not change `PublicAPI.txt` (no analyzer signal) and passed package validation (`pv-opt-obsolete`, exit 0, including with `ApiCompatEnableRuleAttributesMustMatch=true`). Deprecation is therefore a minor-release act per SemVer item 7 ("MUST be incremented if any public API functionality is marked as deprecated", [semver.org](https://semver.org/spec/v2.0.0.html)) that no gate enforces; policy must. MS guidance: keep obsolete members indefinitely in low-level libraries "if maintaining them is low cost" ([breaking-changes](https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/breaking-changes)).

### 9. SemVer: what each gate enforces

NuGet versions follow SemVer 2.0 (`Major.Minor.Patch[-suffix]`; prerelease sorts below the release; build metadata ignored; dotted prerelease labels need NuGet 4.3.0+) ([NuGet versioning](https://learn.microsoft.com/en-us/nuget/concepts/package-versioning), [library versioning](https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/versioning)). SemVer 0.y.z: "Anything MAY change at any time" ([spec item 4](https://semver.org/spec/v2.0.0.html)); the gates do not relax for 0.x, so adopt the stricter convention: while 0.y.z, a break bumps minor and must pass through a reviewed suppression.

| Change set (from the diff) | Mechanical signal | Bump (>=1.0) | Bump (0.y.z) |
|---|---|---|---|
| No `PublicAPI.Unshipped.txt` lines | file equals `#nullable enable` | patch | patch |
| Added API lines only; ApiCompat green without suppressions | Unshipped has no `*REMOVED*` | minor | patch or minor |
| `[Obsolete]` added | no signal (grep `Obsolete`) | minor | patch or minor |
| Any `*REMOVED*` line, any `IsBaselineSuppression=true` entry, any CPxxxx suppressed, PKV006 | grep below | major | minor |
| Behavior change (exception type, parse tolerance, default value, exit-code mapping) | NONE | judgment: major if observable | minor |

`dotnet pack` itself does not compute the version; the table is a release-script input (section 10).

### 10. Release-time steps

Feeds the `dotnet-release` skill. Order matters; each step has an observable check.

1. **Merge-time gate (every PR).** `dotnet build -c Release -warnaserror` (analyzers) and `dotnet pack -c Release` (validation against `PackageValidationBaselineVersion`), exit codes honoured. Never `|| true`; never push a nupkg from a failed pack (verified: written anyway).
2. **Decide the version.** Inspect `git diff <last-tag>..HEAD -U0 -- '*PublicAPI.Unshipped.txt' '*CompatibilitySuppressions*.xml'` and apply section 9.
3. **Promote Unshipped to Shipped** in the release commit. Script (verified on single, multi-TFM shared+delta, per-TFM and `*REMOVED*` fixtures; re-build green with `-warnaserror` afterwards):

   ```bash
   #!/usr/bin/env bash
   # promote.sh <dir>: fold PublicAPI.Unshipped.txt into PublicAPI.Shipped.txt in <dir>
   set -euo pipefail; export LC_ALL=C
   dir=${1:-.}; S="$dir/PublicAPI.Shipped.txt"; U="$dir/PublicAPI.Unshipped.txt"; tmp=$(mktemp)
   { grep -hv -e '^#nullable' -e '^\*REMOVED\*' -e '^$' "$S" "$U" || true; } | sort -u > "$tmp"
   grep -h '^\*REMOVED\*' "$U" | sed 's/^\*REMOVED\*//' | sort -u > "$tmp.rm" || true
   if [ -s "$tmp.rm" ]; then grep -vxF -f "$tmp.rm" "$tmp" > "$tmp.2" || true; mv "$tmp.2" "$tmp"; fi
   { echo '#nullable enable'; cat "$tmp"; } > "$S"; echo '#nullable enable' > "$U"
   ```

   Run per directory: `find src -name PublicAPI.Unshipped.txt -print0 | xargs -0 -r -n1 dirname | sort -u | xargs -r -n1 ./promote.sh`. (Polly after a release: Shipped 562 lines, Unshipped 1 line, `App-vNext__Polly@e4476096da5b:src/Polly.Core/.PublicAPI/`; npgsql mid-cycle: Unshipped 60 lines.)
4. **Delete `CompatibilitySuppressions.xml`** entries that carried `IsBaselineSuppression=true` for this release - they would otherwise fail the NEXT pack as "Unnecessary suppressions" (verified) - or set `ApiCompatPreserveUnnecessarySuppressions`/`ApiCompatPermitUnnecessarySuppressions` knowingly.
5. **Pack and publish** from a clean checkout: `dotnet pack -c Release -o artifacts` then push `artifacts/*.nupkg` only if the step exited 0. Do not touch `PackageValidationBaselineVersion` in this commit.
6. **After the package is visible on the feed**, bump `PackageValidationBaselineVersion` to the version just released (a separate `chore:` commit/PR). Doing it earlier fails restore with `NU1102` (verified with a nonexistent version).
7. **Verify post-conditions:** Unshipped holds only `#nullable enable`; no `*REMOVED*` anywhere; `dotnet pack` against the new baseline is green.

First release: no baseline exists - leave `PackageValidationBaselineVersion` unset (pack still succeeded for `pv-v1`, validating compatible TFMs only), promote the initial Unshipped, publish, then add the baseline per step 6.

### 11. Exemplar survey

| Repo (sha12) | Analyzer + files | Package validation | Snapshot | Notes / citation |
|---|---|---|---|---|
| Polly (`e4476096da5b`) | yes, 5 projects, `.PublicAPI/` shared pair | yes, baseline 8.5.2 | no | `eng/Library.targets:16-17,51-71`; 3 compat-TFM suppressions `src/Polly.Core/CompatibilitySuppressions.xml:4-15`; samples opt out (`samples/Directory.Build.props:5,10` NoWarn `RS0016;RS0037`) |
| simple-exec (`f80913246993`) | package referenced, RS0016/RS0037 `NoWarn`, RS0026 pragma, no files | no | PublicApiGenerator golden | `src/Directory.Build.props:16-17,26`, `Command.cs:12`, `tests/Tests/PublicApi.cs:9-16` |
| npgsql (`9c47244547c2`) | yes, 5 projects (Npgsql alone: Shipped 2060 lines) | no | no | RS0026/RS0027 off `src/.editorconfig:11,14` |
| testfx (`7226b0c74729`) | yes, 41 Unshipped files, shared + per-TFM delta | no | no | `.globalconfig:3-11`; analyzer previews `Directory.Packages.props:25-35` (comment: RS0017/RS0026/RS0036 fixes, dotnet/roslyn#84437) |
| Azure.Core (`32c48fc3d524`) | no (GenAPI listings) | custom `ApiCompatVersion` 1.63.0 | `api/*.net8.0/.net10.0/.net462/.net472/.netstandard2.0.cs` | `Azure.Core.csproj:6-7` |
| openai-dotnet (`1f0e8829acac`) | no | custom `ApiCompatVersion` 2.13.0 + `apicompat` script | GenAPI listings + CI clean-tree check | `OpenAI.csproj:7`, `scripts/Test-ApiCompatibility.ps1:124,202`, `integrity-checks.yml:95-111` |
| Humanizer (`4574b93883bf`) | no | no | Verify per TFM (net8/10/11/4.8) | `ApiApprover/PublicApiApprovalTest.cs:5-13` |
| xunit (`0c7aa4991fa3`) | no | no | no | no gate found |

Observation: 4 of 8 targeted repos have no release-comparison gate at all (xunit, Humanizer, simple-exec, Azure.Core/OpenAI rely on custom tooling). Only Polly runs analyzer + SDK package validation + a baseline. That is the composite to copy.

### 12. Verified on the toolchain

Fixture root: `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-api-evolution-gates/` (parent `global.json` pins SDK 10.0.401; `nuget.config` = local folder feed `feed/` + nuget.org). Baseline packages: `Acme.Lib` 1.0.0 (`pv-v1`), `Acme.Multi` 1.0.0 (`mt-c-shared`), `Acme.Lib8` 1.0.0 (`sdk8/pv-v1`), `Acme.Pre` 1.0.0-beta.1. Analyzer: `Microsoft.CodeAnalysis.PublicApiAnalyzers` 5.6.0. Re-run everything with:

```bash
cd /home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-api-evolution-gates
/home/mherwig/.cache/research-lang/dotnet-tools/run.sh ./verify-all.sh     # prints "ALL AS EXPECTED"; transcript in verify-results.txt
```

Result: 49 checks, 23 watched red (exit != 0) and 26 watched green (exit 0), all as expected. Representative, with exact commands (`p.sh` = `run.sh dotnet pack <dir> -c Release -o out/<dir>`, `b.sh` = `run.sh dotnet build <dir> -c Release --no-incremental`):

| Gate | Red (command -> observed) | Green twin (observed) |
|---|---|---|
| Package validation, removed overload | `./p.sh pv-red-remove` -> `exit=1 error CP0002: Member 'string Acme.Greeter.Bye(string, int)' exists on [Baseline] lib/net10.0/Acme.Lib.dll but not on lib/net10.0/Acme.Lib.dll` | `./p.sh pv-green-additive` -> `exit=0` |
| Package validation, optional param | `./p.sh pv-red-optional` -> `exit=1 error CP0002: Member 'string Acme.Greeter.Hello(string)' exists on [Baseline]...` | `pv-green-overload`, `pv-green-cancel` -> `exit=0` |
| Seal / abstract / iface | `pv-red-sealed` CP0009+CP0012; `pv-red-abstract` CP0005+CP0019; `pv-red-iface` CP0006 | `pv-green-dim` -> `exit=0` |
| Opt-in rule | `./p.sh pv-opt-rename -p:ApiCompatEnableRuleCannotChangeParameterName=true` -> `CP0017: Parameter name on member 'Acme.Greeter.Hello(string)' changed from 'name' to 'who'` | same fixture without flag -> `exit=0` |
| Stale suppression | `./p.sh pv-sup-stale` -> `exit=1 error : Unnecessary suppressions found. The APICompat suppression file can be updated by rebuilding with '/p:ApiCompatGenerateSuppressionFile=true'` | `pv-green-overload` -> `exit=0` |
| Wrong property name | `pv-noop-apicompatversion` (ApiCompatVersion=1.0.0 on the red change) -> `exit=0` (gate silently absent) | `pv-red-optional` -> `exit=1` |
| Analyzer, undeclared API | `./b.sh an-red-unlisted` -> `exit=1 error RS0016 x2` | `./b.sh an-green-listed` -> `exit=0` |
| Analyzer, removal | `./b.sh an-red-removed` -> `exit=0 warning RS0017 x2` (default); `./b.sh an-red-removed -warnaserror` -> `exit=1 error RS0017 x2` | `an-green-unchanged` -> `exit=0` |
| Analyzer, optional param | `./b.sh an-red-optional` -> `exit=1 error RS0016 x2; warning RS0017 x2` | `an-canonical` -> `exit=0` |
| RS0026 / RS0027 | `an-ct-optional2` -> `error RS0026: Symbol 'Hello' violates the backcompat requirement: 'Do not add multiple overloads with optional parameters'`; `an-rs0027` -> `error RS0027` | `an-ct-optional`, `an-ct-explicit` -> `exit=0` |
| RS0036 / RS0037 | `an-rs0037` -> `RS0037: PublicAPI.txt is missing '#nullable enable'...`; `an-rs0036` -> `RS0036: Symbol 'Acme.IPlugin.Id.get -> string!' is missing nullability annotations in the declared API` | `an-green-unchanged` |
| Evasion | `./b.sh an-evade-optional -warnaserror` -> `exit=0` (Unshipped carries `*REMOVED*static Acme.Greeter.Hello(string! name) -> string!`) | `./p.sh an-evade-optional -warnaserror` -> `exit=1 error CP0002`; `./p.sh an-canonical -warnaserror` -> `exit=0` |
| Silent pass | `an-nofiles-req` (no API files + `require_api_files = true`) -> `exit=0` | `an-nofiles` (same, option absent) -> `exit=1 error RS0016 x18; error RS0037 x10` |
| .editorconfig vs severity | `.editorconfig` RS0017=error -> still warning, `exit=0` | `.globalconfig` RS0017=error -> `exit=1` |
| Multi-target | `mt-a-single -warnaserror` -> `RS0017` for `Wave` on net8.0; `mt-c-drop-tfm` -> `PKV006`; `mt-c-rm-wave` -> `CP0002` | `mt-b-pertfm`, `mt-c-shared`, `mt-c-shared-v11` -> `exit=0` |
| Snapshot | `./snap.sh check` after `Hello` gained an optional parameter -> `exit=1` (unified diff on both net8.0 and net10.0 goldens) | restored source -> `exit=0` |
| SDK floor / RC | `sdk8/` (SDK 8.0.425) and `sdk11/` (11.0.100-rc.1.26425.128) `pv-red-optional` -> `CP0002` | `pv-green-overload` -> `exit=0` on both |
| Modern C# | - | `an-modern` (record + C# 14 `extension` block) with `dotnet format analyzers` entries -> `exit=0` under `TreatWarningsAsErrors` |
| Obsolete/Experimental | consumer: `ACME0002` error, `ACMEEXP001` error | `NoWarn ACME0001;ACMEEXP001` clears warnings (section 8) |

Also observed and recorded (no red/green twin): pack writes the nupkg even when validation fails (`pv-red-*` -> `ls out/<d>/*.nupkg` = 1); `dotnet build pv-red-optional` -> `Build succeeded`; baseline `0.9.0` -> `NU1102`; prerelease baseline `1.0.0-beta.1` -> `CP0002` red (`pre-red`).

## Normative guidance candidates

1. **Enable PublicApiAnalyzers in every packable library and commit both files.** Rationale: surface changes become reviewable diffs and accidental `public` is caught (RS0016). Verify: `grep -rL --include='*.csproj' -e 'Microsoft.CodeAnalysis.PublicApiAnalyzers' src/` lists nothing for packable projects (check `Directory.Build.props`/`.targets`/Polly-style `Library.targets` if centralized), and `test -s src/<proj>/PublicAPI.Shipped.txt` for each.
2. **Every `PublicAPI.*.txt` starts with `#nullable enable`.** Rationale: otherwise nullability is untracked (RS0037) or entries are oblivious (RS0036). Verify: `grep -rL --include='PublicAPI.*.txt' -e '#nullable enable' src/` prints nothing (do not anchor with `^`; Polly's files carry a BOM).
3. **Generate entries with the code fix, never by hand; seed the header first.** Rationale: records and C# 14 extension blocks emit 12+ non-obvious entries. Verify: `cd src/Acme.Lib && dotnet format analyzers Acme.Lib.csproj --diagnostics RS0016 RS0036 --severity info --no-restore --verify-no-changes` exits 0 when the files are complete (observed exit 0 on `an-v1`, exit 2 on `an-red-unlisted`).
4. **Raise RS0016, RS0017, RS0026, RS0027, RS0036, RS0037 to `error` in a repo-root `.globalconfig`, not `.editorconfig`.** Rationale: RS0017 is reported on the text file and ignores `.editorconfig`; default severity is warning. Verify: `grep -E 'dotnet_diagnostic\.RS00(16|17|26|27|36|37)\.severity *= *error' .globalconfig | wc -l` equals 6, or CI runs `dotnet build -c Release -warnaserror`.
5. **Do not set `dotnet_public_api_analyzer.require_api_files` in single-package libraries.** Rationale: it turns a missing or mis-wired API file into a silent pass. Verify: `grep -rn --include='.editorconfig' --include='.globalconfig' -e 'require_api_files' .` returns nothing.
6. **Never silence gate IDs with `NoWarn`, `#pragma`, or severity `none` without a same-line reason.** Rationale: each silencer is the cheapest way to defeat the gate. Verify: `grep -rnE --include='*.csproj' --include='*.props' --include='*.targets' -e '<NoWarn>.*(RS00[0-9]{2}|CP0[0-9]{3}|PKV[0-9]{3})' .` and `grep -rnE --include='*.cs' -e '#pragma warning disable (RS00[0-9]{2}|CP[0-9]{4})' src/` each hit must carry a binary-compat explanation (testfx `FileArtifacts.cs:6-12` is the model).
7. **Enable package validation with a baseline on every packable library after its first release.** Rationale: only it compares binaries (CP0002, CP0005, CP0006, CP0009, PKV006). Verify: `grep -rn --include='*.csproj' --include='*.props' --include='*.targets' -e '<EnablePackageValidation>true' -e '<PackageValidationBaselineVersion>' .` shows both properties; `dotnet pack -c Release` exits 0.
8. **Use the SDK property name `PackageValidationBaselineVersion`.** Rationale: `ApiCompatVersion`, `EnableApiCompat`, `PackageValidationBaseline` do nothing and fail open (verified). Verify: `grep -rnE --include='*.csproj' --include='*.props' --include='*.targets' -e '<(ApiCompatVersion|ApiCompatBaseline[A-Za-z]*|EnableApiCompat|PackageValidationBaseline|EnablePackageValidationBaseline)>' .` returns nothing.
9. **CI publishes only after `dotnet pack` exits 0, with no `|| true` and no glob over a failed output dir.** Rationale: the nupkg is written even when validation fails. Verify: reading heuristic on the workflow - `grep -rnE --include='*.yml' --include='*.yaml' -e 'dotnet (pack|nuget push)|\|\| *true|continue-on-error' .github/` and confirm the push step `needs` the pack step and neither tolerates failure.
10. **Validate on a clean checkout; never trust a re-pack in a dirty `obj/`.** Rationale: validation is incremental by semaphore. Verify: CI uses `actions/checkout` without caching `obj/`; locally `find . -name '*ValidatePackage.semaphore' -delete` before diagnosing.
11. **Keep `ApiCompatGenerateSuppressionFile` / `GenerateCompatibilitySuppressionFile` out of all committed files.** Rationale: they convert red into green by rewriting the suppression file. Verify: `grep -rnE --include='*.csproj' --include='*.props' --include='*.targets' --include='*.yml' --include='*.yaml' -e 'ApiCompatGenerateSuppressionFile|GenerateCompatibilitySuppressionFile' .` returns nothing; PRs touching `*CompatibilitySuppressions*.xml` need a stated version bump (`git diff --name-only origin/main...HEAD -- '*CompatibilitySuppressions*.xml'`).
12. **`PublicAPI.Shipped.txt` changes only in a release commit.** Rationale: Shipped is released history. Verify: `git diff --name-only origin/main...HEAD -- '*PublicAPI.Shipped.txt'` must be empty unless the branch is `release/*`.
13. **A `*REMOVED*` line in Unshipped is a major (0.y.z: minor) change and needs the matching CP0002 suppression reviewed.** Rationale: it is the only way to make the analyzer accept a break. Verify: `git diff origin/main...HEAD -U0 -- '*PublicAPI.Unshipped.txt' | grep -c '^+\*REMOVED\*'` > 0 => version bump check in the release script.
14. **Never add a parameter, optional or not, to a shipped member; add an overload and keep the old shape.** Rationale: binary break (CP0002). Verify: package validation (CP0002) plus `git diff -U0 origin/main...HEAD -- '*PublicAPI.Shipped.txt'` empty; reading heuristic: any removed `-` line in a `.cs` public signature.
15. **Follow the Roslyn optional-parameter pattern: one overload with defaults and the most parameters; older overloads mandatory-only.** Rationale: RS0026/RS0027 encode it. Verify: RS0026 and RS0027 at `error` (candidate 4); `grep -rn --include='*.cs' -e 'RS0026' -e 'RS0027' src/` hits need a comment.
16. **Add `CancellationToken` to a shipped async method as a new overload.** Rationale: appending a defaulted token to the existing signature breaks compiled callers. Verify: CP0002 + RS0017 on the changed signature; for new methods `CancellationToken cancellationToken = default` is allowed as the last parameter (CA1068 enforces the last position; not run here).
17. **Seal new public classes by default; never seal a shipped class.** Rationale: unsealing is allowed, sealing is CP0009. Verify: CP0009 in pack; reading heuristic with `grep -rnE --include='*.cs' -e 'public (abstract |static )?class ' src/` for new non-sealed public classes lacking an inheritance design (no default analyzer seals public types; CA1852 covers internal ones).
18. **Do not add members to shipped public interfaces; add `IFoo2` or use an abstract class.** Rationale: CP0006; DIMs still break `ref struct` implementers (C# 13+). Verify: pack (CP0006); reading heuristic on `interface` diffs.
19. **Do not drop a target framework in a minor/patch release.** Rationale: PKV006. Verify: pack; `git diff origin/main...HEAD -U0 -- '*.csproj' '*.props' | grep -E '^-.*TargetFrameworks?'`.
20. **Multi-target libraries use the shared-pair + `Exists('PublicAPI/$(TargetFramework)')` delta layout, and create a TFM directory only when that TFM's surface differs.** Rationale: no duplicated lists, no RS0017 on TFMs lacking `#if` APIs. Verify: `grep -rlE --include='*.csproj' '<TargetFrameworks>[^<]*;' src/` projects containing `#if NET` in sources must contain `PublicAPI/$(TargetFramework)` (`grep -rcF --include='*.csproj' 'PublicAPI/$(TargetFramework)' src/`); build all TFMs with `-warnaserror`.
21. **Deprecate with `[Obsolete(msg, DiagnosticId = "<PREFIX>NNNN", UrlFormat = "<url>/{0}")]`; keep the member at least one minor before `error: true`; remove only in a major.** Rationale: per-API suppressible, SemVer item 7. Verify: `grep -rn --include='*.cs' -e '\[Obsolete' src/ | grep -v DiagnosticId` returns nothing.
22. **Ship unfinished public surface under `[Experimental("<PREFIX>EXPNNN")]` with its own ID per feature, not behind a preview version alone.** Rationale: stable package, opt-in consent, .NET 8+. Verify: `grep -rn --include='*.cs' -e 'Experimental(' src/` shows unique IDs; API is listed in PublicAPI files as normal.
23. **Release script derives the bump from the Unshipped diff (section 9) and refuses a bump smaller than the signal.** Rationale: neither tool computes the version. Verify: script exit code; reading heuristic.
24. **Promote Unshipped to Shipped in the release commit; afterwards Unshipped holds only `#nullable enable`.** Rationale: keeps the analyzer's "declared API" equal to the released one. Verify: `grep -rhvE -e '#nullable enable' -e '^[[:space:]]*$' --include='PublicAPI.Unshipped.txt' src/ | wc -l` prints 0 on the release tag.
25. **Bump `PackageValidationBaselineVersion` in a separate commit AFTER the package is on the feed; delete accepted baseline suppressions in the release commit.** Rationale: `NU1102` otherwise; stale suppressions fail the next pack. Verify: `dotnet restore` exits 0; `grep -c 'IsBaselineSuppression>true' src/*/CompatibilitySuppressions.xml` = 0 on the tag.
26. **Treat behavior as API: exception types, parse tolerance, default values, exit-code mapping get contract tests; neither gate sees them.** Rationale: library-change-rules lists them DISALLOWED. Verify: tests exist: `grep -rln --include='*.cs' -e 'ThrowsAsync<' -e 'Assert.Throws' tests/` per public failure mode; reviewer heuristic on exception-type changes.
27. **A snapshot test is optional and additive; its golden changes only via an explicit regenerate command reviewed like source.** Rationale: a regenerated golden proves nothing. Verify: the CI step regenerates and fails on a dirty tree (OpenAI `integrity-checks.yml:95-111`): `git diff --exit-code -- api/ tests/**/*.verified.txt`.
28. **Pin the analyzer version centrally and prefer the latest stable (5.6.0 as of 2026-10-10); a prerelease pin needs a written reason.** Rationale: testfx pins 5.10.0-1.x only to get RS0017/RS0026/RS0036 fixes and an `[Embedded]` exclusion. Verify: `grep -rn --include='Directory.Packages.props' -e 'PublicApiAnalyzers' .` shows one version; if it contains `-`, a comment must follow.

## AI-agent angle

| What an LLM gets wrong | Why it compiles/passes locally | Smallest mechanical check |
|---|---|---|
| "Just add an optional parameter" (`Hello(string name, string greeting = "Hello")`) to a shipped method | source-compatible, builds, tests pass | `dotnet pack -c Release` with baseline -> `CP0002`; or RS0016+RS0017 at `error` |
| Hand-writes `PublicAPI.Unshipped.txt` lines (omits `!`, forgets ctor of a record, omits `Widget.Widget() -> void` for implicit ctors) | errors only show as RS0016/RS0036 later | seed `#nullable enable`, run `dotnet format analyzers --diagnostics RS0016 RS0036 --severity info`; `dotnet build -warnaserror` |
| Satisfies RS0016/RS0017 by writing `*REMOVED*` + new line (analyzer-green break) | analyzer cannot see binaries | package validation; grep `'^+\*REMOVED\*'` in the PR diff |
| Silences instead of fixing: `<NoWarn>RS0016</NoWarn>`, `dotnet_diagnostic.RS0016.severity = none`, `#pragma warning disable RS0016` (Polly/Npgsql/simple-exec contain such lines and models copy them) | all legitimate in the corpus, in narrow contexts (samples, Internal folders) | candidate 6 greps; hit needs a reason comment |
| Sets `RS0017` severity in `.editorconfig` and believes it is enforced | RS0016 in the same file works, RS0017 silently stays a warning | `.globalconfig` + `-warnaserror`; `dotnet build -warnaserror` on a removal fixture exits 1 |
| Copies `<ApiCompatVersion>` from Azure/OpenAI csproj; or invents `EnableApiCompat`, `ApiCompatBaselineVersion` | MSBuild ignores unknown properties; no error | candidate 8 grep; check `Microsoft.NET.ApiCompat.ValidatePackage.targets` property names |
| Runs `dotnet build` and calls the gate green; or `dotnet pack || true` then pushes `*.nupkg` | validation is Pack-only; nupkg exists after failure | CI heuristic candidate 9; assert exit code |
| Sets `require_api_files = true` "to be safe" | missing files then pass silently | candidate 5 grep |
| Uses `-p:ApiCompatGenerateSuppressionFile=true` to "fix" a red pack and commits the XML (or the property) | exit 0, file written | candidate 11 grep and PR path check |
| Re-runs pack after changing flags and sees green | incremental semaphore skipped validation | delete `*.semaphore` or use a clean clone |
| Seals a class / adds `abstract` / adds interface member "for cleanliness" | compiles, tests pass | CP0009 / CP0005 / CP0006 |
| Treats DIM as always safe | green on both gates | reading heuristic for `ref struct` implementers; prefer new interface |
| Uses plain `[Obsolete("...")]` or `[Obsolete(..., true)]` immediately; uses `[Obsolete]` for preview features | CS0618 compiles | candidate 21 grep; use `[Experimental]` |
| Recommends .NET Framework-era advice: pin `AssemblyVersion`/`AssemblyFileVersion` manually, add `<AdditionalFiles Include="PublicAPI.Shipped.txt"/>` at root (needed only before analyzer 3.3.x), `Microsoft.DotNet.ApiCompat` NuGet task (pre-.NET 6 era) | harmless or no-op | prefer SDK properties; versioning doc says do not use a fixed AssemblyVersion |
| Appends the new baseline version in the release PR | local feed/cache may already hold it | `dotnet restore` from a clean cache -> `NU1102` |
| Assumes one `PublicAPI.Shipped.txt` suffices for `net8.0;net10.0` with `#if` APIs | RS0017 is only a warning | multi-TFM build with `-warnaserror` |
| Renames a parameter in a "cleanup" | binary-compatible, breaks named-argument callers | enable `ApiCompatEnableRuleCannotChangeParameterName=true` -> CP0017 |

## Contested / evolving

- **Analyzer versions (as of 2026-10-10):** stable 5.6.0 (nuget.org 2026-07-02; Polly pins it) vs previews 5.10/5.11 (testfx pins `5.10.0-1.26477.9` for RS0017/RS0026/RS0036 fixes and an `[Embedded]` exclusion, `Directory.Packages.props:25-35`). Trend: stable is enough unless you hit those bugs; revisit when a stable carries dotnet/roslyn#84437.
- **Property name drift:** the docs use both `GenerateCompatibilitySuppressionFile` (diagnostic-ids page) and `ApiCompatGenerateSuppressionFile` (msbuild-props page, SDK error text). Both worked on SDK 10.0.401. Use the `ApiCompat*` family.
- **Baseline "stable only":** the baseline-validator page says "previously released, stable version"; a prerelease baseline (`1.0.0-beta.1`) worked in the fixture. Still treat stable baselines as the policy.
- **Where the surface is recorded:** Roslyn-style text files (Polly, npgsql, testfx) vs generated listings/snapshots (Azure, OpenAI, Humanizer, simple-exec). Trend in the largest SDK vendors (Azure, OpenAI) is generated listings with a CI clean-tree check plus ApiCompat; for a small SDK the text files give a faster inner loop and RS0026/RS0027 hygiene, so both are acceptable but the release-baseline compare (package validation) is not optional.
- **Suppress RS0026/RS0027 or not:** npgsql and simple-exec switch them off wholesale; testfx suppresses per site with reasons; Roslyn's own guidance builds the API to satisfy them. Trend for libraries with a baseline: keep them on.
- **Default interface members:** the library-change-rules page marks adding interface members REQUIRES JUDGMENT and notes the `ref struct` (C# 13) source break; the older runtime breaking-change-rules page lists "Adding an interface method with a default implementation" as allowed with caution. ApiCompat's CP0006 accepts DIMs. Practice: avoid.
- **New language shapes (flag, not tested through ApiCompat):** C# 14 `extension` blocks are IL-identical to `this` extension methods (binary/source compatible conversion per library-change-rules), and PublicApiAnalyzers 5.6.0 tracks them; C# 15 / .NET 11 RC1 `union` types are listed in library-change-rules as DISALLOWED to add/remove case types, but the gates' behavior on `union` was not run (RC1, GA Nov 2026). `params ReadOnlySpan<T>` changes are binary-breaking (C# 13).
- **Platform coverage:** every run here was Linux x64. The gates operate on managed assemblies and NuGet metadata, so results should not vary by OS/arch, but nothing was executed on Windows or arm64; the CI matrix for the SDK should still run `dotnet pack` once on Windows (path-separator handling of the `Exists('PublicAPI/$(TargetFramework)')` condition is slash-agnostic in MSBuild, not re-measured).
- **Behavior compatibility:** no tool in this stack detects it; the field is open and policy-driven (library-change-rules marks most as DISALLOWED/REQUIRES JUDGMENT).

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/package-validation/overview | Package validation overview | updated 2025-08-21 | validators, `EnablePackageValidation` runs after Pack |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/package-validation/baseline-version-validator | Baseline validator with optional-parameter CP0002 example | updated 2025-08-21 | the canonical "optional param is a binary break" demonstration; suppression lifecycle |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/diagnostic-ids | CPxxxx / PKVxxx table and suppression file format | updated 2025-12-03 | exact IDs and descriptions |
| https://learn.microsoft.com/en-us/dotnet/core/project-sdk/msbuild-props | MSBuild reference, package validation properties | current | exact property names and defaults |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/global-tool | Microsoft.DotNet.ApiCompat.Tool | updated 2026-02-13 | CLI form for non-MSBuild use |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/library-change-rules | API change compatibility rules | updated 2026-04-14 | allowed/disallowed verdicts incl. C# 13 `params`, C# 14 extension blocks, union |
| https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/breaking-changes | Breaking changes and .NET libraries | 2021, updated 2023 | binary/source/behavior definitions; Obsolete guidance |
| https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/versioning | Versioning and .NET libraries | updated 2025-12 | package/assembly/file version rules |
| https://learn.microsoft.com/en-us/dotnet/api/system.obsoleteattribute | ObsoleteAttribute API | 2026 | `DiagnosticId`, `UrlFormat`, `IsError` |
| https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.codeanalysis.experimentalattribute | ExperimentalAttribute API | .NET 8+ | experimental surface in stable packages |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/runtime-libraries/preview-apis | Preview APIs guidance | 2025-01 | when to use `[Experimental]` vs `[RequiresPreviewFeatures]` |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/syslib-diagnostics/obsoletions-overview | SYSLIB/EXTOBS obsoletion model | updated 2026-07 | the platform's own DiagnosticId deprecation convention |
| https://raw.githubusercontent.com/dotnet/roslyn-analyzers/main/src/PublicApiAnalyzers/PublicApiAnalyzers.Help.md | PublicApiAnalyzers help (roslyn-analyzers path) | 3.3.x+ | `#nullable enable`, per-TFM files, `require_api_files` |
| https://raw.githubusercontent.com/dotnet/roslyn/main/src/RoslynAnalyzers/PublicApiAnalyzers/Microsoft.CodeAnalysis.PublicApiAnalyzers.md | Rule table RS0016..RS0061 | current main | titles, severities, enabled-by-default |
| https://raw.githubusercontent.com/dotnet/roslyn/main/docs/Adding%20Optional%20Parameters%20in%20Public%20API.md | Roslyn's optional-parameter policy | current main | the backcompat-overload pattern and `*REMOVED*` usage |
| https://raw.githubusercontent.com/dotnet/runtime/main/docs/coding-guidelines/breaking-change-rules.md | dotnet/runtime breaking change rules | current main | allowed/disallowed rules incl. DIM caution |
| https://www.nuget.org/packages/Microsoft.CodeAnalysis.PublicApiAnalyzers | Package page | read 2026-10-10 | current stable 5.6.0 / prerelease 5.11.0-1.26425.128 |
| https://github.com/PublicApiGenerator/PublicApiGenerator | Snapshot generator README | current | usage, Verify integration, NRT support |
| https://learn.microsoft.com/en-us/nuget/concepts/package-versioning | NuGet version reference | updated 2025-07 | SemVer 2.0 handling, prerelease ordering |
| https://semver.org/spec/v2.0.0.html | SemVer 2.0.0 | 2013 | items 4, 6-9 mapping used in section 9 |
| `Azure__azure-sdk-for-net@32c48fc3d524:sdk/core/Azure.Core/api/*.cs`, `Azure.Core.csproj:6-7` | Azure per-TFM API listings, `ApiCompatVersion` | 2026 | scale of per-TFM listings (1846 lines, 0 diff net8 vs net10) |
| `openai__openai-dotnet@1f0e8829acac:scripts/Test-ApiCompatibility.ps1`, `scripts/Export-Api.ps1`, `.github/workflows/integrity-checks.yml:95-111` | GenAPI + apicompat pipeline | 2026 | snapshot + baseline combination with CI clean-tree check |
| `App-vNext__Polly@e4476096da5b:eng/Library.targets:16-17,51-71` | analyzer + package validation + TFM wiring | 2026 | the only exemplar combining both gates |
| `microsoft__testfx@7226b0c74729:.globalconfig`, `Directory.Packages.props:25-35`, `FileArtifacts.cs:6-12` | `require_api_files`, analyzer preview pin, RS0027 suppression with reason | 2026 | how a heavy user handles edge rules |
| `adamralph__simple-exec@f80913246993:src/Directory.Build.props:16-17,26`, `Command.cs:12`, `tests/Tests/PublicApi.cs` | RS0016/RS0037 NoWarn, RS0026 pragma, snapshot test | 2026 | smallest "snapshot instead of files" recipe |
| `npgsql__npgsql@9c47244547c2:src/.editorconfig:11,14` and `Humanizr__Humanizer@4574b93883bf:tests/Humanizer.Tests/ApiApprover/PublicApiApprovalTest.cs:5-13` | RS0026/27 disabled; Verify per TFM | 2026 | contrasting stances |
| `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-api-evolution-gates/` (`verify-all.sh`, `verify-results.txt`) | the planted red/green fixtures run for this artifact | 2026-10-10 | reproduces every "verified" claim above |
