---
title: "The analyzer gate: a pinned, diffable warning posture for a .NET 10 library"
topic: csharp-build / csharp-build-analyzer-gate
agent: deep-dive researcher (sonnet subagent, research-lang csharp, wave 1)
model: claude-sonnet-5-5
date_researched: 2026-10-10
sources_count: 24
scope: |
  Covers: AnalysisLevel/AnalysisMode/EnforceCodeStyleInBuild/TreatWarningsAsErrors/WarningsAsErrors/NoWarn/Nullable/GenerateDocumentationFile as one gate; precedence between SDK analysis-level globalconfigs, .globalconfig, .editorconfig and compiler switches; SDK 11 RC1 float breakage; third-party packs (Meziantou, VS.Threading, BannedApi, Roslynator, StyleCop) measured; the dotnet format CI command; suppression list with reasons. Everything marked "measured" was built on SDK 10.0.401 (and 11.0.100-rc.1.26425.128 where stated).
  Does not cover: SDK/restore pinning (global.json, lock files, CPM beyond GlobalPackageReference) beyond the analyzer-package angle; test-project posture except where it changes the gate; PublicApiAnalyzers (RS0016/RS0017 etc.) and package validation; Windows/macOS behaviour (analyzer output is platform-neutral; nothing here was run on the Windows host).
---

# The analyzer gate: a pinned, diffable warning posture for a .NET 10 library

Fixtures: `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-build-analyzer-gate/` (cited below as `$FIX`). Tool wrapper: `/home/mherwig/.cache/research-lang/dotnet-tools/run.sh`. Citation form for exemplars is `owner__repo@sha12:path:line` under `/home/mherwig/.cache/research-lang/exemplars/csharp/`.

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [What each AnalysisMode enables (measured)](#1-what-each-analysismode-enables-measured)
   2. [Where the severities come from, and why bulk editorconfig severities are ignored](#2-where-the-severities-come-from-and-why-bulk-editorconfig-severities-are-ignored)
   3. [Precedence, measured](#3-precedence-measured)
   4. [Floating AnalysisLevel and SDK 11 RC1](#4-floating-analysislevel-and-sdk-11-rc1)
   5. [The default AnalysisLevel is the TFM, not "latest"](#5-the-default-analysislevel-is-the-tfm-not-latest)
   6. [TreatWarningsAsErrors: always, or CI/Release only](#6-treatwarningsaserrors-always-or-cirelease-only)
   7. [Nullable, CS1591 and the doc-comment phase](#7-nullable-cs1591-and-the-doc-comment-phase)
   8. [EnforceCodeStyleInBuild and dotnet format](#8-enforcecodestyleinbuild-and-dotnet-format)
   9. [Third-party packs, measured](#9-third-party-packs-measured)
   10. [The simple-exec recipe, dissected](#10-the-simple-exec-recipe-dissected)
   11. [The suppression list](#11-the-suppression-list)
   12. [The chosen posture (files a rule can diff against)](#12-the-chosen-posture-files-a-rule-can-diff-against)
   13. [Verified on the toolchain](#13-verified-on-the-toolchain)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- Set `<AnalysisLevel>10.0-all</AnalysisLevel>` in the root `Directory.Build.props`. It pins the rule set to the .NET 10 release and turns every rule on; omit `<AnalysisMode>` because `AnalysisLevel` wins when both are set ([msbuild-props](https://learn.microsoft.com/en-us/dotnet/core/project-sdk/msbuild-props)). Measured: unchanged (0 errors) on SDK 11.0 RC1, while `latest-all` produced 5 new errors on the same file.
- Never write `AnalysisLevel` as `latest`, `preview`, `latest-<mode>` or `preview-<mode>` in a gate that also has TreatWarningsAsErrors. SDK 11 RC1's `analysislevel_11_{minimum,recommended,all}.globalconfig` add six rules (CA1517, CA1876, CA1877, CA2026, CA2027, CA2028) at `warning`; 5 of them fired on a probe and turned into errors.
- The docs say the default AnalysisLevel is `latest`; measured on SDK 11 RC1 with a `net10.0` project the effective level is `10.0`. With no explicit level the TFM is the pin; moving a project to `net11.0` moves the rule set. Set the level explicitly anyway: multi-targeting `net8.0;net10.0` otherwise gets a different rule set per leg (CA2022, a .NET 9 rule, fired only on the net10.0 leg).
- A malformed level is fail-open: `AnalysisLevel=10.0.401-all` and `10.0-allx` build with exit 0 and no CA findings (measured). Keep a canary project that must fail to build and run it in CI; do not rely on reading the property.
- `AnalysisMode` sizes on SDK 10.0.401, counted from the SDK's own files: Minimum 92, Recommended 145, All 280 rules at `warning` (SDK 11 RC1 at level 11: 98 / 151 / 286). On the planted-defect probe: Default 0 CA warnings, Minimum 4 CA ids, Recommended 8, All 14. CA2007, CA1031, CA2000, CA1849, CA1062, CA1063 fire only at All.
- Bulk severities (`dotnet_analyzer_diagnostic.severity`, `...category-X.severity`) cannot downgrade or upgrade rules once AnalysisMode/Level is `All`: the SDK writes one per-rule `dotnet_diagnostic.CAxxxx.severity` line for every rule, and a per-rule entry beats a bulk entry. Measured: editorconfig `severity = none` left 33 diagnostics at 33. Use per-rule entries.
- In `AnalysisMode All` the simple-exec `.globalconfig` line `dotnet_analyzer_diagnostic.severity = warning` does nothing for CA rules; its only effect is promoting `IDE` style rules (5 ids, 14 diagnostics on the probe) when `EnforceCodeStyleInBuild=true`. On Default mode the same line promotes the suggestion-level CA rules instead.
- Per-rule precedence, measured: `NoWarn`/`WarningsAsErrors` (compiler switches) beat `.editorconfig`, which beats `.globalconfig`, which beats the SDK's `analysislevel_*.globalconfig` (`global_level = -100`). Two same-`global_level` globalconfigs in different directories collide and emit `MultipleGlobalAnalyzerKeys`; give the child one `global_level = 101`.
- A `.globalconfig` or `.editorconfig` is discovered by walking up from the directories of the project's `Compile` items, not from the project file. A csproj whose `Compile Include="../../src/X.cs"` lives outside the config's directory silently gets none of it (measured; `Microsoft.Managed.Core.targets:139-146`).
- Gate every build, not only Release/CI: set `TreatWarningsAsErrors=true` unconditionally in `Directory.Build.props` for `src/`. An agent runs `dotnet build` in Debug; a Release-only gate lets it declare success on a tree that CI rejects (measured: same tree exits 0 with 83 warnings with the switch off, exits 1 with 82 errors on).
- `CS1591` is hidden whenever any other error exists: the compiler skips doc-comment diagnostics when compilation has errors (measured: 82 errors without CS1591, 83 warnings with it). Fix errors first, then CS1591 surfaces; do not conclude documentation is complete from an error-only run.
- IDE0005 (unused usings) is silent at the command line unless `GenerateDocumentationFile=true` (measured; [dotnet/roslyn#41640](https://github.com/dotnet/roslyn/issues/41640), open since 2020-02-13). Keep `GenerateDocumentationFile=true` even if you do not publish XML.
- `dotnet format --verify-no-changes` is a formatting/style check, not an analyzer gate: it exited 0 on a tree containing `DateTime.Now` (RS0030, no code fix) and exited 2 on mis-indentation and an unused using. Run `dotnet build` as the gate and `dotnet format --verify-no-changes --no-restore` as the second, cheap step.
- Third-party set to adopt: `Microsoft.CodeAnalysis.BannedApiAnalyzers` 5.6.0 (the only gate for `DateTime.Now`, `Encoding.Default`, `Process.Start(string,string)`) and `Microsoft.VisualStudio.Threading.Analyzers` 18.7.23 (the only gate for `.Result`), both as `GlobalPackageReference`. Do not adopt StyleCop.Analyzers (12 SA ids, 34 diagnostics on a 70-line probe, 70 unique locations on a clean 870-line library) or Roslynator.Analyzers (2 ids, both duplicates). Meziantou.Analyzer 3.0.297 is optional: on the probe every default-on MA id except MA0048 (file name = type name) duplicated a CA id.
- Turn `VSTHRD003` off: it flagged `await t.ConfigureAwait(false)` on a caller-supplied `Task` in the fixed twin (2 false errors).
- Under `10.0-all`, CA1034 fires on every C# 14 `extension(T x) { }` block ("Do not nest type ." on SDK 10.0.401); SDK 11 RC1 does not fire. Suppress with a scoped `#pragma warning disable CA1034 // reason` around the block, not repo-wide.
- Suppress by per-rule `.globalconfig` lines only for decisions that hold for the whole repo (CA1062 with Nullable on, CA1308 for lowercase OCI refs, CA1716 for a C#-only API); suppress everything else at the site with `#pragma ... // reason`, as simple-exec does ([adamralph__simple-exec@f80913246993:src/SimpleExec/Command.cs:432](https://github.com/adamralph/simple-exec)). Never put analyzer ids in `NoWarn`.

## Findings

### 1. What each AnalysisMode enables (measured)

The Microsoft docs define the modes ([overview](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/overview)): `None` disables all, `Default` enables a small set as warnings and some as IDE suggestions, `Minimum` and `Recommended` add rules as build warnings, `All` "enables all rules as build warnings" except CA1017, CA1045, CA1005, CA1014, CA1060, CA1021 and the metrics rules CA1501/1502/1505/1506/1509.

Rule counts straight from the SDK's own generated files (`grep -c 'severity = warning'`):

| File (SDK 10.0.401, `Sdks/Microsoft.NET.Sdk/analyzers/build/config/`) | rules at `warning` |
|---|--:|
| `analysislevel_10_default.globalconfig` | 0 |
| `analysislevel_10_minimum.globalconfig` | 92 |
| `analysislevel_10_recommended.globalconfig` | 145 |
| `analysislevel_10_all.globalconfig` | 280 |
| SDK 11.0 RC1, `analysislevel_11_minimum / recommended / all` | 98 / 151 / 286 |

Probe: `$FIX/postures/<name>/Probe.cs` (13 planted defects, `Nullable=enable`, `GenerateDocumentationFile=true`, CS1591 NOT suppressed). Unique `ID severity line` per posture, all warnings (CA1822 fires 12 times on methods that do not touch `this`; fixture artifact):

| ID | Default | Minimum | Recommended | All | planted defect |
|---|---|---|---|---|---|
| CS1591 | W | W | W | W | undocumented public field |
| CS8602 | W | W | W | W | `string?` dereference |
| CA2016 | - | W | W | W | token received, not forwarded |
| CA1816, CA1862, CA1822 | - | W | W | W | Dispose without SuppressFinalize; `ToLower() ==`; could be static |
| CA1051, CA1304, CA1305, CA1311 | - | - | W | W | public field; culture-sensitive `ToLower`/`ToString` |
| CA1031 | - | - | - | W | `catch (Exception)` |
| CA2007 | - | - | - | W | `await t` without ConfigureAwait |
| CA2000 | - | - | - | W | undisposed `FileStream` |
| CA1849 | - | - | - | W | `Stream.Write` inside async |
| CA1062 (6x), CA1063 (2x) | - | - | - | W | public arg not null-checked; non-canonical Dispose |
| total diagnostics / distinct ids | 2 / 2 | 17 / 6 | 21 / 10 | 33 / 16 | |

CA-only distinct ids: Default 0, Minimum 4, Recommended 8, All 14. The six ids the brief named (CA2007, CA1031, CA2000, CA1849, CA1062, CA1063) appear only in the All column, reproduced exactly. `AnalysisLevel=latest-all` and `10.0-all` produce the same 33 on SDK 10.0.401 (`$FIX/res_level-latest-all.txt`, `res_level-10-all.txt`).

Reproduce: `cd $FIX && python3 -I tools/gen.py && for p in default minimum recommended all; do tools/measure.sh $p > res_$p.txt; done && python3 -I tools/matrix.py default minimum recommended all`.

A realistic API-shaped probe (`$FIX/sdkshape`, `$FIX/sdkshape2`) shows what All adds beyond the table, i.e. what the suppression decision in section 11 is about: CA1002/CA2227 (`List<string>` property with setter), CA1056 (URL as `string`), CA1819 (array property), CA1032 (exception without standard ctors), CA1812 (internal never instantiated), CA1000 (static on generic type), CA1034 (nested public type), CA1303 (literal to Console), CA1307/CA1310 (culture-sensitive `Contains`/`StartsWith`), CA1308 (`ToLowerInvariant`), CA1510/CA1513 (hand-rolled `ArgumentNullException`/`ObjectDisposedException` throw), CA1711 (`...Stream` suffix), CA1716 (member named `Stop`), CA1847, CA1869 (new `JsonSerializerOptions` per call), CA2201 (`throw new Exception`).

### 2. Where the severities come from, and why bulk editorconfig severities are ignored

Docs: "If you configure code analysis using MSBuild properties like `AnalysisMode`, any bulk configuration options you set in your configuration file are ignored" and bulk severities "only [apply] to rules that are enabled by default" ([configuration-options](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/configuration-options)). The docs do not say why. The mechanism, read from the SDK:

- `AnalysisMode`/`AnalysisLevel` select one of `analysislevel_<ver>_<mode>.globalconfig` and pass it to csc as `/analyzerconfig:` (seen in `dotnet build -v:d`: `.../analyzers/build/config/analysislevel_10_default.globalconfig`).
- Each file is `is_global = true`, `global_level = -100` (`analysislevel_10_all.globalconfig:8`) and then one `dotnet_diagnostic.CAxxxx.severity = warning` line per rule (280 lines, zero `dotnet_analyzer_diagnostic` lines).
- Documented precedence: "An entry for an individual rule by ID takes precedence over an entry for a category [...] over an entry for all analyzer rules" ([configuration-options](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/configuration-options)). The SDK file has a per-rule line for every rule, so no bulk line can win. Rules not listed in the file (the exclusions in section 1) fall through to the bulk value.
- A rule the file sets to `none` is also a per-rule entry: bulk `warning` cannot revive it, which is why `AnalysisLevel=10.0-all` on SDK 11 keeps the six new rules off (`analysislevel_10_all.globalconfig` on SDK 11 lists `CA1517 ... = none`; SDK 10's copy omits them).

Measured on `AnalysisMode=All` (`$FIX/postures/`):

| posture | change | result (diagnostics) |
|---|---|---|
| `all` (baseline) | - | 33 |
| `all-with-editorconfig-none` | `.editorconfig [*.cs] dotnet_analyzer_diagnostic.severity = none` | 33 (ignored) |
| `all-with-globalconfig-category-none` | `.globalconfig dotnet_analyzer_diagnostic.category-Globalization.severity = none` | 33 (ignored) |
| `all-with-perrule-none` | `.globalconfig dotnet_diagnostic.CA1305.severity = none` | 32 (CA1305 gone) |
| `v-editorconfig-perrule-none` | `.editorconfig dotnet_diagnostic.CA2007.severity = none` | 32 (CA2007 gone) |
| `bulk-only-default-nostyle` (Default mode) | `.globalconfig dotnet_analyzer_diagnostic.severity = warning` | 2 -> 21: CA1051, CA1304, CA1305, CA1311, CA1816, CA1822, CA1862, CA2016 promoted (the rules enabled as suggestions by default) |
| `all-nostyle-bulkwarn` | same bulk line under All, no `EnforceCodeStyleInBuild` | 33 (no effect) |
| `v-globalconfig-category-warning-on-default` | `category-Reliability.severity = warning` on Default | 3 diagnostics (only CA2016 added) |
| `v-allmode-category-reliability-only` | `<AnalysisModeReliability>All</AnalysisModeReliability>` | CA2000 and CA2007 appear: the supported way to go "all" for one category |

Rule: to enable use the property (`AnalysisLevel`, or `AnalysisMode<Category>`/`AnalysisLevel<Category>` for one category); to disable or retune use per-rule `dotnet_diagnostic.ID.severity`. Never mix a bulk line in and expect it to do anything under `All`.

### 3. Precedence, measured

Docs ([configuration-files](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/configuration-files)): same file: later entry wins; two editorconfigs: deeper wins; two global configs: higher `global_level` wins, `.globalconfig` defaults to 100 and other global files to 0, equal levels "a compiler warning is reported and both entries are ignored"; "In an EditorConfig file and a Global AnalyzerConfig file: the entry in the EditorConfig file wins"; and "Severity options specified at the command line as compiler options (`-nowarn` or `-warnaserror`) always override" config files. Verified end to end:

| test | setup (all on `AnalysisMode All`) | observed |
|---|---|---|
| NoWarn vs globalconfig error | `.globalconfig CA2007 = error` + `<NoWarn>$(NoWarn);CA2007</NoWarn>` | CA2007 absent: NoWarn wins (`v-nowarn-vs-globalconfig-error`) |
| editorconfig vs globalconfig | `.globalconfig CA2007 = error`, `.editorconfig CA2007 = none` | CA2007 absent: editorconfig wins (`v-editorconfig-vs-globalconfig`) |
| SDK file vs user file | `.globalconfig` (level 100) vs SDK file (level -100) | user per-rule entry wins (`all-with-perrule-none`) |
| same-level collision | root `.globalconfig` `CA2007=warning`; child `tests-nolevel/.globalconfig` `CA2007=none`, neither sets `global_level` | `CSC : warning MultipleGlobalAnalyzerKeys: Multiple global analyzer config files set the same key 'dotnet_diagnostic.ca2007.severity' ... It has been unset.` (`$FIX/testlayer/tests-nolevel`) |
| same, with `global_level = 101` in the child | `tests-level/.globalconfig` | no collision; CA2007 off in tests, CA1305 still on (`$FIX/testlayer/tests-level`) |
| WarningsAsErrors on a CA id | `<WarningsAsErrors>CA2007;CA1031</WarningsAsErrors>` | exactly those two become errors (`v-warnaserror-ca`) |
| WarningsNotAsErrors on CA ids | `TreatWarningsAsErrors=true` + `<WarningsNotAsErrors>CA1822;CA1062;CS1591</WarningsNotAsErrors>` | CA1822 and CA1062 stay warnings, rest errors (`v-twae-notaserr`) |
| CodeAnalysisTreatWarningsAsErrors | `TreatWarningsAsErrors=true` + `<CodeAnalysisTreatWarningsAsErrors>false</CodeAnalysisTreatWarningsAsErrors>` | all CA stay warnings, CS8602 is an error (`v-twae-codeanalysis-false`) |

Discovery pitfall (red/green, `$FIX/run0-compile-outside-projdir` vs `$FIX/postures`): `.globalconfig`/`.editorconfig` are found by `_AllDirectoriesAbove Include="@(Compile->GetPathsOfAllDirectoriesAbove())"` (`dotnet/sdk/10.0.401/Roslyn/Microsoft.Managed.Core.targets:139`, `:142`, `:145`). In round 0 each probe csproj compiled `../../src/Probe.cs`; the `.globalconfig` sitting beside the csproj was never passed to csc (`grep -o '/analyzerconfig:[^ ]*'` listed only the SDK file and the generated MSBuild editorconfig) and `perrule-default` reported 2 diagnostics instead of 4. Moving `Probe.cs` next to the csproj fixed it. Rule: config files go at or above every `Compile` item's directory; a linked source file outside the tree does not extend the search (it adds its own parent directories, which is usually not what you want).

### 4. Floating AnalysisLevel and SDK 11 RC1

Measured diff of the SDK's own files, SDK 11.0.100-rc.1.26425.128, `comm -13` of `dotnet_diagnostic` lines between `analysislevel_10_<mode>` and `analysislevel_11_<mode>`: Minimum, Recommended and All each gain `CA1517, CA1876, CA1877, CA2026, CA2027, CA2028 = warning`. The unshipped analyzer list shows them as Info by default and also lists CA1878 and CA2267 (Warning, `PreferQuotedFileBasedProgramDirective`, file-based programs only) ([AnalyzerReleases.Unshipped.md](https://github.com/dotnet/sdk/blob/main/src/Microsoft.CodeAnalysis.NetAnalyzers/src/Microsoft.CodeAnalysis.NetAnalyzers/AnalyzerReleases.Unshipped.md)). They are Info, so only an `AnalysisMode` of Minimum or higher at level 11 promotes them, and TreatWarningsAsErrors then breaks the build. CA1878 did not appear in the `analysislevel_11_*` diff on RC1; GA may change the set (flag: .NET 11 is RC1, GA Nov 2026).

Red (SDK 11 RC1, `$FIX/sdk11/latest-all`, `<AnalysisLevel>latest-all</AnalysisLevel>`, TWAE on, `Clean.cs` clean on SDK 10):

```
Clean.cs(21,64): error CA1877: Multiple consecutive Path.Combine operations can be collapsed into a single operation
Clean.cs(28,31): error CA2027: Using Task.WhenAny with Task.Delay may result in a timer continuing to run after the operation completes
Clean.cs(37,13): error CA2028: Redundant call to 'Regex.IsMatch' before 'Regex.Match'
Clean.cs(45,41): error CA1517: Parameter 'data' can be declared as 'ReadOnlySpan<byte>' instead of as 'Span<byte>'
Clean.cs(56,27): error CA1876: Using 'AsParallel()' directly in a 'foreach' loop has no effect
    5 Error(s)
```

Green (same SDK, same file, `<AnalysisLevel>10.0-all</AnalysisLevel>`): `0 Error(s)`. Control: the identical `latest-all` project on SDK 10.0.401: `0 Error(s)` (`$FIX/sdk10-same-latest-all`), so the break is the SDK bump, not the file. Pinned still enforces the old rules: adding `await t;` (CA2007) under `10.0-all` on SDK 11 gave `error CA2007` (`$FIX/sdk11/pinned-10-all-oldrule`). CA2026 and CA1878 did not trigger on my probe shapes; they are listed from the SDK files, not observed firing.

Bug fixes still arrive under a pinned level: Microsoft's own text is "When you upgrade to a newer SDK, you'll still get bug fixes for those warnings, but no new warnings will be enabled and no existing warnings will be disabled" ([overview](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/overview)). Observed example in section 13 (CA1034).

Exemplar practice: no exemplar pins a numeric level. Of 35 repos, 10 set `AnalysisLevel`: `latest` (8), `latest-All` ([xunit__xunit@0c7aa4991fa3:src/Directory.Build.props:61](https://github.com/xunit/xunit)), `preview-recommended` ([microsoft__testfx@7226b0c74729:eng/Analyzers.props:6](https://github.com/microsoft/testfx)); Humanizer pairs `AnalysisMode Minimum` with `latest` ([Humanizr__Humanizer@4574b93883bf:Directory.Build.props:18-19](https://github.com/Humanizr/Humanizer)). They survive by pinning the SDK in `global.json` and absorbing the break in the SDK-bump PR; that is a legitimate alternative, but it makes every SDK bump a rule-triage task. A pinned level decouples the two.

### 5. The default AnalysisLevel is the TFM, not "latest"

Docs: "If your project targets .NET 5 or later [...] the default value is `latest`" ([msbuild-props](https://learn.microsoft.com/en-us/dotnet/core/project-sdk/msbuild-props)). The compiler-options page says "The default AnalysisLevel matches the Target Framework Moniker" ([errors-warnings](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-options/errors-warnings)). Measured with `dotnet msbuild -getProperty:EffectiveAnalysisLevel` on SDK 11 RC1:

| project | `AnalysisLevel` | `EffectiveAnalysisLevel` |
|---|---|---|
| `net10.0`, `AnalysisMode=All`, no level | `10.0` | `10.0` |
| `net11.0`, `AnalysisMode=All`, no level | (derived) | `11.0` (5 new-rule errors) |
| `net10.0`, `AnalysisLevel=latest-all` | `latest-all` | `11.0` |
| `net10.0`, `AnalysisLevel=10.0-all` | `10.0-all` | `10.0` |
| multi-target `net8.0;net10.0`, `AnalysisMode=All`, SDK 10.0.401 | - | `8.0` / `10.0` per leg |

So the implicit behaviour is "pinned to the TFM", and the docs' `latest` default is wrong for projects that do not set it (as of SDK 10.0.401 and 11.0 RC1). Consequence for multi-targeting (red/green, `$FIX/multitarget`, `$FIX/multitarget-pinned`): with `AnalysisMode=All` and no level, `Stream.Read` ignoring its result (CA2022, added in the .NET 9 rule set) fired on `net10.0` only; with `AnalysisLevel=10.0-all` it fired on both `net8.0` and `net10.0`. One explicit level = one gate across all TFMs.

Fail-open values (measured, `$FIX/badvals`, `$FIX/canary`): an `AnalysisLevel` the SDK cannot map to a shipped `analysislevel_<ver>_<mode>.globalconfig` does not error; it removes the gate.

| value | `EffectiveAnalysisLevel` | result with a planted CA2007 (an All-only rule) |
|---|---|---|
| `10.0-all` | `10.0` | `error CA2007`, exit 1 |
| `10-all`, `10.0-All`, `AnalysisMode=all` (case-insensitive) | `10` / `10.0` / `10.0` | fires |
| `AnalysisMode=AllEnabledByDefault` (NetAnalyzers-package-era value) | `10.0` | fires (still accepted as an alias of All) |
| `10.0.401-all` (SDK version instead of release) | `10.0.401` | **nothing fires, exit 0** |
| `10.0-allx` (typo in the mode) | `10.0` | **nothing fires, exit 0** |
| `net10.0` / `net10.0-all` | - | `error MSB4184` in `Microsoft.NET.Sdk.Analyzers.targets(69,18)` (loud) |

So the gate needs a canary: a project that must fail to build (`$FIX/canary`: exit 1 with `error CA2007` under `10.0-all`, exit 0 under `10.0.401-all`). `EffectiveAnalysisLevel` printing `10.0` is necessary but not sufficient (`10.0-allx` prints `10.0`).

### 6. TreatWarningsAsErrors: always, or CI/Release only

Facts: `TreatWarningsAsErrors` "only impacts the C# compiler, not any other MSBuild tasks" whereas the `-warnaserror` switch "impacts all tasks" (NuGet `NU1903` audit warnings included) ([errors-warnings](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-options/errors-warnings)); `WarningsAsErrors` accepts `nullable` as a group; `WarningsNotAsErrors` exempts ids when TWAE is on; `NoWarn` appends with `$(NoWarn);`. TWAE covers analyzer diagnostics too (all 32 CA/IDE/MA diagnostics became errors in `all-twae`), and `CodeAnalysisTreatWarningsAsErrors=false` exempts CA only (section 3).

Practice (23 of 35 exemplars have TWAE somewhere; `count.py props` in the build-gates audit): unconditional in [xunit__xunit@0c7aa4991fa3:src/Directory.Build.props:33](https://github.com/xunit/xunit); Release-only in [adamralph__simple-exec@f80913246993:Directory.Build.props:20-22](https://github.com/adamralph/simple-exec). Other repos that gate TWAE (for example through `$(ContinuousIntegrationBuild)`) were not enumerated.

Decision: unconditional for `src/`, exempt tests selectively. Why: the consumer here is an agent loop that runs `dotnet build` (Debug) and `dotnet test` (Debug) and stops when they pass. Measured on `$FIX/chosen/red`: with the switch forced off (`-p:TreatWarningsAsErrors=false`) the tree builds with exit 0 and 83 warnings; with it on, exit 1 and 82 errors. A Release-only gate means a green local loop and a red CI. Humans pay for unconditional TWAE with annoying WIP failures (unused local, etc.); agents do not. Trade-off recorded in "Contested".

### 7. Nullable, CS1591 and the doc-comment phase

`Nullable=enable` is the default of the .NET 6+ templates (the setting's own default is `disable`) and exemplars set it in 30 of 35 repos ([language options](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-options/language)). The global context does not apply to generated files (`generated_code = true`, `<auto-generated>` header, `*.g.cs`...). `<WarningsAsErrors>nullable</WarningsAsErrors>` promotes only the nullability group: `v-nullable-only` made CS8602 an error and left all 15 CA diagnostics warnings. With TWAE already on, the property is redundant; use it only on a repo that cannot enable TWAE yet (stepping stone), never in addition.

CS1591 (missing XML doc, needs `GenerateDocumentationFile=true`): 30 repos generate the file, 19 suppress CS1591, one escalates it: `WarningsAsErrors=$(WarningsAsErrors);CS1591` in [microsoft__testfx@7226b0c74729:src/Platform/Microsoft.Testing.Platform/Microsoft.Testing.Platform.csproj:12](https://github.com/microsoft/testfx). simple-exec suppresses it only in tests and cites the roslyn bug ([adamralph__simple-exec@f80913246993:tests/Directory.Build.props:16](https://github.com/adamralph/simple-exec)). For an SDK whose public surface is read by agents (IntelliSense/XML docs are the discoverable contract), keep CS1591 as an error for `src/`, suppress for tests.

Hidden-error behaviour, measured: when any compile error exists the compiler does not produce doc-comment diagnostics. `all` (warnings): CS1591 listed once. `all-twae` (same code, TWAE): 32 errors, `grep -c CS1591 out_all-twae.txt` = 0. `chosen/red`: 82 errors without CS1591 vs 83 warnings with it. So a TWAE tree is not documentation-complete until it compiles with zero other errors: fix everything else, rebuild, then CS1591 shows up.

### 8. EnforceCodeStyleInBuild and dotnet format

`EnforceCodeStyleInBuild=true` makes IDE rules run in `dotnet build`; "all code style rules that are configured to be warnings or errors will execute on build" and "a handful of code-style rules" stay IDE-only ([msbuild-props](https://learn.microsoft.com/en-us/dotnet/core/project-sdk/msbuild-props)). The severity must be set per rule or per category in `.editorconfig`/`.globalconfig` (`dotnet_diagnostic.IDE0005.severity = warning`); since .NET 9 the option format `dotnet_style_require_accessibility_modifiers = always:warning` also works ([overview](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/overview)). 11 of 35 exemplars set it.

Measured on `$FIX/chosen/fmt-*` (all derived from the green twin, `IDE0005/0055/0161 = warning`, ECSB on):

| defect | `dotnet build` | `dotnet format --verify-no-changes --no-restore` |
|---|---|---|
| green (control) | exit 0 | exit 0 |
| wrong indentation | exit 1, `error IDE0055` | exit 2, `error WHITESPACE: Fix whitespace formatting` |
| unused `using System.Net;` | exit 1, `error IDE0005` | exit 2 |
| `DateTime.Now` (RS0030, no code fix) | exit 1, `error RS0030`, `error CA1822` | exit 0 (blind) |

So: build = the gate. `dotnet format` only reports diagnostics that have a fixer at or above `--severity` (default `warn`) plus whitespace; its exit code is non-zero (observed 2) only when it would change a file ([dotnet-format](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-format): "Terminates with a non zero exit code if any files would have been formatted"). Its value is as the agent's *fixer* (`dotnet format`, then re-run the gate) and as a `--verify-no-changes` line that emits a readable diff-style message. With IDE0055 and IDE0005 at warning in the build it is redundant as a gate (both tests above fail in both tools); keep it as the fixer and as a cheap second line. Exemplar practice: 4 of 35 run it in CI (GitVersion, roslynator with `--severity info`, Humanizer, vs-threading); CliWrap uses CSharpier.MsBuild instead. `--framework` for multi-target projects exists only from .NET 11.

IDE0005 caveat, red/green on SDK 10.0.401: same file with `using System.Net;`, `EnforceCodeStyleInBuild` and IDE0005 at warning: `GenerateDocumentationFile=false` reports nothing; `=true` reports `warning IDE0005` (`$FIX/chosen/ide0005-nodoc`, `.../ide0005-doc`). Matches [dotnet/roslyn#41640](https://github.com/dotnet/roslyn/issues/41640) (open; latest comment 2026-10-06 asks for an update) and simple-exec's comment at `Directory.Build.props:8`.

### 9. Third-party packs, measured

All five run clean (no AD0001 analyzer crash) on a C# 14 file using `field`, `extension(T)` blocks and null-conditional assignment (`$FIX/cs14`). Versions are the latest stable on nuget.org as of 2026-10-10 except StyleCop (stable 1.1.118 predates C# 8+; 1.2.0-beta.556 is what everyone uses).

On the 13-defect probe in Default mode, one pack at a time (`$FIX/postures/pack-*`):

| pack | version | distinct ids on probe | what it catches that the SDK All set does not |
|---|---|---|---|
| Microsoft.CodeAnalysis.BannedApiAnalyzers | 5.6.0 | RS0030 x2 | `DateTime.Now`, `Encoding.Default` (nothing in CA flags either); anything you list in `BannedSymbols.txt` |
| Microsoft.VisualStudio.Threading.Analyzers | 18.7.23 | VSTHRD002, 003, 103, 200 | `.Result` in a sync method (VSTHRD002); no CA equivalent |
| Meziantou.Analyzer | 3.0.297 | MA0004, MA0006, MA0011 x2, MA0048 | all duplicate a CA id (CA2007, CA1862, CA1305/CA1304) except MA0048 (file name = type name) |
| Roslynator.Analyzers | 5.0.1 | RCS1075 (empty catch), RCS1155 | both duplicate CA1031/CA1310-family |
| StyleCop.Analyzers | 1.2.0-beta.556 | 12 SA ids, 34 diagnostics | style/doc-format only (SA1101, SA1200, SA1600-series); on a clean real 870-line library (`$FIX/realworld`, simple-exec's sources) it adds 70 unique locations across 11 SA ids (SA1200, SA1101, SA1642, SA1128, SA1003 lead) |

On real code that already passes All (simple-exec's `src/SimpleExec`, 870 lines, 5 pragma suppressions; `$FIX/realworld/out_*.txt`): `10.0-all` + ECSB alone 0 diagnostics; + VS.Threading 0; + Meziantou 4 unique locations (MA0006 x3 "use string.Equals instead of operator", MA0144 x1 "use OperatingSystem"); + Roslynator 2 (RCS1194 x2, implement exception constructors, a duplicate of CA1032 that simple-exec suppresses); + StyleCop 70 (11 ids). Counts are unique `file(line,col) id` triples.

Package facts: the Meziantou README ships `GlobalPackageReference` guidance and `MeziantouAnalysisMode` (`Default|None|all-suggestions|all-warnings|all-errors`); `all-warnings` on the probe added MA0038 (12x), MA0211 (15x), MA0040, MA0042, MA0075, MA0137, MA0148, MA0162, MA0215 (~30 extra diagnostics, mostly noise). MA0161/MA0162 (Process.Start with `ProcessStartInfo`; "UseShellExecute must be explicitly set") are disabled by default; MA0162 flagged `Process.Start("ocx", "install " + pkg)` when enabled. VSTHRD rules are tagged Critical 001-099, Advisory 100-199, Guideline 200-299 ([vs-threading analyzers](https://microsoft.github.io/vs-threading/analyzers/index.html)); VSTHRD003 ("Avoid awaiting foreign Tasks") is a JoinableTaskFactory heuristic and flagged a caller-supplied `Task` await in the fixed twin. Roslynator's README lists three analyzer packages and the CLI `dotnet tool install -g roslynator.dotnet.cli` ([README](https://github.com/dotnet/roslynator)); StyleCop's README states C# 8 needs 1.2.0-beta or newer and that "not all versions support all features of each C# language version" ([README](https://github.com/DotNetAnalyzers/StyleCopAnalyzers)). Exemplar adoption: BannedApi 3 repos (+ `BannedSymbols.txt` in 6), VS.Threading 2 (simple-exec, testfx), StyleCop 5, Roslynator 2, Meziantou 0 as a consumer ([build-gates audit §4.1](../csharp-audit/exemplar-build-and-gates.md)).

BannedSymbols file format ([BannedApiAnalyzers.Help.md](https://github.com/dotnet/roslyn-analyzers/blob/main/src/Microsoft.CodeAnalysis.BannedApiAnalyzers/BannedApiAnalyzers.Help.md)): `BannedSymbols.txt` or `BannedSymbols.*.txt` supplied as `AdditionalFiles`; one documentation-comment ID per line (`T:`, `M:`, `P:`, `F:`, `E:`, `N:`), `;message` optional, `//` comments. The diagnostic observed is `RS0030` (the page does not name the id; measured). Reference lists: Polly's is `P:System.DateTime.Now; Use TimeProvider.GetLocalNow().DateTime instead.` and three siblings ([App-vNext__Polly@e4476096da5b:eng/analyzers/BannedSymbols.txt:1-5](https://github.com/App-vNext/Polly), wired at `eng/Analyzers.targets:6` only when `IsTestProject != true`).

Gap closed by a custom entry: nothing in the SDK or VS.Threading flags `Process.Start("ocx", "install " + pkg)` (string-built arguments, the defect an ocx wrapper cares about most). Two `BannedSymbols.txt` lines do: `M:System.Diagnostics.Process.Start(System.String,System.String)` and `P:System.Diagnostics.ProcessStartInfo.Arguments` (observed: `RS0030: The symbol 'Process.Start(string, string)' is banned in this project: Build a ProcessStartInfo and fill ArgumentList`).

### 10. The simple-exec recipe, dissected

[adamralph__simple-exec@f80913246993](https://github.com/adamralph/simple-exec): `Directory.Build.props:4` `AnalysisMode All`; `:6-8` `EnableNETAnalyzers`, `EnforceCodeStyleInBuild`, `GenerateDocumentationFile` (comment cites roslyn#41640); `:17` `NoWarn CA1014`; `:20-22` TWAE when `Configuration=Release`; `:29` `Microsoft.VisualStudio.Threading.Analyzers`; `.globalconfig:3` `dotnet_analyzer_diagnostic.severity = warning`; versions centralized in `Directory.Packages.props:11` (VS.Threading 18.7.23).

What each piece does (measured, `$FIX/postures/simple-exec` vs `all-ecsb`): the `.globalconfig` bulk line is a no-op for CA rules (section 2) and promotes 14 IDE diagnostics across IDE0008, IDE0022, IDE0130, IDE0160, IDE0370 (47 vs 33 total). `NoWarn CA1014` is dead config: CA1014 is not among the 280 warning rules in `analysislevel_10_all.globalconfig` (grep: absent) and the docs list it as excluded from All. The three-line .globalconfig is better written as explicit IDE rule lines in an `.editorconfig`; the bulk line also silently turns on every IDE rule that someone adds in a future SDK, which is the float problem again.

Its suppressions, all at the site, each with a reason in the neighbouring code or the rule text:

| id | site | reason |
|---|---|---|
| CA2025 | `src/SimpleExec/Command.cs:409-411` | `process` (IDisposable) is passed to `RunAsync` whose task is awaited later in the same method inside a `using var`; the rule cannot see the later `await`. CA2025 is "Enabled by default: No" and only fires at All ([CA2025](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2025): "Suppress these warnings if you know tasks finish using `IDisposable` instances before they're disposed") |
| CA1849 + VSTHRD103 | `Command.cs:432-437` | `.Result` read on tasks already completed by the preceding `await Task.WhenAll`; both rules flag `.Result` inside async methods regardless |
| CA1031 | `src/SimpleExec/Internal/ProcessExtensions.cs:117-119` | `TryKill`: comment at lines 112-115 says any exception can come from `Process.Kill` and the same type for different reasons; best-effort kill. Microsoft's own advice is "Do not suppress" ([CA1031](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1031)); a narrowly scoped pragma with a reason is the compromise |
| CA1032 | `ExitCodeException.cs:6`, `ExitCodeReadException.cs:6`, `targets/Command.cs:23` | exception types require an exit code; the "standard constructors" the rule wants would create invalid instances |
| RS0026 | `Command.cs:12` | PublicApiAnalyzers (not in our set): deliberate overload set with optional parameters |

Test relaxations live in `tests/Directory.Build.props:13-19`: `NoWarn` CA1034, CA1062, CA1515 (roslyn-analyzers#7734), CS1591, CA2007, VSTHRD111, VSTHRD200. Fine for tests; for `src/` they would hide real findings.

### 11. The suppression list

Repo-wide, as per-rule `.globalconfig` lines, each with a reason (these hold for any repo with the stated property):

| id | decision | reason (checkable) |
|---|---|---|
| CA1062 | none | `Nullable=enable` makes null flow a compiler diagnostic (CS8602/CS8604/CS8618); the runtime guard is redundant. Measured: fired 6x on non-null-annotated parameters. Microsoft's page only says suppress "if you are sure the dereferenced parameter has been validated by another method call" ([CA1062](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1062)); this is a judgement call, flagged in Contested |
| CA1308 | none | OCI references and digests are lowercase by spec; "normalize to upper-case" advice is wrong for identifiers that must stay lowercase (fires on `ToLowerInvariant`) |
| CA1716 | none | VB reserved-keyword clash (`Stop`, `Error`); C#-only SDK |
| CA1303 | none | literals are not localised |
| VSTHRD003 | none | JoinableTaskFactory heuristic; flags every await of a caller-supplied Task (measured 2 false errors on fixed code) |

Everything else is a site-level `#pragma warning disable ID // reason` ... `restore`, or `[SuppressMessage(category, "ID:title", Justification = "...")]` ([suppress-warnings](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/suppress-warnings)). Candidates seen in the simple-exec pattern: CA1031 (best-effort cleanup), CA1032 (exceptions with mandatory data), CA1849/VSTHRD103 (`.Result` after `WhenAll`), CA2025 (disposable awaited later). Known false positive to suppress at site: CA1034 on `extension(T x)` blocks (section 13).

Never suppress by: `NoWarn` for an analyzer id (hides it from every file, no reason attached); bulk `none`; `CodeAnalysisRuleSet`/`.ruleset` (deprecated, precedence vs globalconfig "undefined", [configuration-files](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/configuration-files)).

### 12. The chosen posture (files a rule can diff against)

Built and exercised in `$FIX/chosen` (red twin: 13 planted defects, 21 distinct error ids, 82 errors; green twin: 0 errors, `dotnet format --verify-no-changes` exit 0).

`Directory.Build.props`:

```xml
<Project>
  <PropertyGroup>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <!-- Pin: rules + severities move only when this line is edited, never when the SDK moves. -->
    <AnalysisLevel>10.0-all</AnalysisLevel>
    <EnableNETAnalyzers>true</EnableNETAnalyzers>
    <EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>
    <GenerateDocumentationFile>true</GenerateDocumentationFile> <!-- needed for IDE0005 at build: roslyn#41640 -->
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
  </PropertyGroup>
  <ItemGroup>
    <AdditionalFiles Include="$(MSBuildThisFileDirectory)BannedSymbols.txt" />
  </ItemGroup>
</Project>
```

`Directory.Packages.props` (central versions; `GlobalPackageReference` applies to every project with `IncludeAssets=Runtime;Build;Native;contentFiles;Analyzers` and `PrivateAssets=All`, needs NuGet 6.4 / SDK 7.0.100 ([CPM docs](https://learn.microsoft.com/en-us/nuget/consume-packages/central-package-management))):

```xml
<Project>
  <PropertyGroup><ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally></PropertyGroup>
  <ItemGroup>
    <GlobalPackageReference Include="Microsoft.CodeAnalysis.BannedApiAnalyzers" Version="5.6.0" />
    <GlobalPackageReference Include="Microsoft.VisualStudio.Threading.Analyzers" Version="18.7.23" />
  </ItemGroup>
</Project>
```

(An earlier iteration of the fixture also referenced Meziantou 3.0.297: red then showed 24 ids / 86 errors, adding MA0004, MA0006, MA0011, each a duplicate of a CA id; the saved variant is `$FIX/tools/Directory.Packages.with-meziantou.props`. Optional, see Contested.)

`.globalconfig` (repo root; `global_level = 100` is the default for a file with this name, written for clarity; a `tests/.globalconfig` must set `global_level = 101`):

```ini
is_global = true
global_level = 100

# CA1062: Nullable=enable makes null-flow a compiler error (CS8602/CS8604); runtime guard is redundant noise.
dotnet_diagnostic.CA1062.severity = none
# CA1308: OCI references and digests are lowercase by spec; 'normalise to upper' advice is wrong for them.
dotnet_diagnostic.CA1308.severity = none
# CA1716: VB keyword clash; this SDK is C#-only.
dotnet_diagnostic.CA1716.severity = none
# CA1303: output is not localised; messages are English literals by design.
dotnet_diagnostic.CA1303.severity = none
# VSTHRD003: JoinableTaskFactory heuristic; flags every await of a caller-supplied Task, which is a normal library shape.
dotnet_diagnostic.VSTHRD003.severity = none
```

`.editorconfig` (IDE rules; severities here because they are build-time style gates):

```ini
root = true
[*.cs]
csharp_style_namespace_declarations = file_scoped:warning
dotnet_diagnostic.IDE0005.severity = warning
dotnet_diagnostic.IDE0055.severity = warning
dotnet_diagnostic.IDE0161.severity = warning
```

`BannedSymbols.txt`:

```
P:System.DateTime.Now;Use TimeProvider.GetUtcNow() so time is injectable
P:System.DateTimeOffset.Now;Use TimeProvider.GetUtcNow() so time is injectable
P:System.Text.Encoding.Default;Use Encoding.UTF8; Default is machine-dependent
M:System.Diagnostics.Process.Start(System.String,System.String);Build a ProcessStartInfo and fill ArgumentList; never concatenate arguments
P:System.Diagnostics.ProcessStartInfo.Arguments;Use ProcessStartInfo.ArgumentList; one string is re-tokenised per platform
```

CI commands (after restore): `dotnet build -c Release --no-incremental -nologo` (the gate; `--no-incremental` so a stale incremental cache cannot hide a finding; unmeasured precaution) then `dotnet format --verify-no-changes --no-restore -v q`. Optional third step for a fixer pass when the second fails: `dotnet format --no-restore` (locally, then re-run the gate).

Test projects: reuse the root props; relax with a second `.globalconfig` in `tests/` carrying `global_level = 101` and `severity = none` for CA2007, CA1062 (already off), CA1303, CS1591 (via `<GenerateDocumentationFile>false</GenerateDocumentationFile>` in the test props). Verified mechanism in `$FIX/testlayer/tests-level`.

### 13. Verified on the toolchain

All commands start with `FIX=/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-build-analyzer-gate; T=/home/mherwig/.cache/research-lang/dotnet-tools`. `$T/run.sh` is the pinned toolchain; the fixture tree has `global.json` pinned to 10.0.401 (`$FIX/sdk11/global.json` pins 11.0.100-rc.1.26425.128).

| # | claim | red (bad fixture) | green (fixed twin) |
|---|---|---|---|
| V1 | `latest-all` breaks on SDK 11; `10.0-all` does not | `cd $FIX/sdk11/latest-all && $T/run.sh dotnet build -nologo -v:q --no-incremental` -> `CA1877, CA2027, CA2028, CA1517, CA1876` as `error`, `5 Error(s)` | `cd $FIX/sdk11/pinned-10-all && $T/run.sh dotnet build ...` -> `0 Warning(s) 0 Error(s)`; control `$FIX/sdk10-same-latest-all` on SDK 10.0.401 -> `0 Error(s)`; old rule still live: `$FIX/sdk11/pinned-10-all-oldrule` -> `error CA2007` |
| V2 | the whole chosen posture catches every planted defect and passes the fixed one | `cd $FIX/chosen/red && $T/run.sh dotnet build -nologo -v:q --no-incremental` -> exit 1, 82 errors, 21 ids: CA1031 CA1051 CA1063 CA1304 CA1305 CA1311 CA1816 CA1822 CA1849 CA1862 CA2000 CA2007 CA2016 CS8602 IDE0005 IDE0055 IDE0161 RS0030 VSTHRD002 VSTHRD103 VSTHRD200 (output saved as `$FIX/out_chosen_red.txt`) | `cd $FIX/chosen/green && ...` -> `Build succeeded. 0 Warning(s) 0 Error(s)`, exit 0; `$T/run.sh dotnet format --verify-no-changes --no-restore` exit 0 |
| V3 | bulk editorconfig severity is ignored under All; per-rule is not | `cd $FIX && tools/measure.sh all-with-editorconfig-none \| wc -l` -> 33 (same as `all`) | `tools/measure.sh all-with-perrule-none \| wc -l` -> 32 (CA1305 gone) |
| V4 | `.globalconfig` beside csproj is not applied if Compile items live elsewhere | `$FIX/run0-compile-outside-projdir/res_perrule-default.txt` -> `CS1591;CS8602` only (CA2007/CA1031 `= warning` never applied) | `tools/measure.sh perrule-default` -> `CA1031 L23; CA2007 L43; CS1591; CS8602` |
| V5 | two same-level globalconfigs collide | `cd $FIX/testlayer/tests-nolevel && $T/run.sh dotnet build ...` -> `warning MultipleGlobalAnalyzerKeys ... 'dotnet_diagnostic.ca2007.severity' ... It has been unset.` | `$FIX/testlayer/tests-level` (child has `global_level = 101`) -> no such warning; CA2007 off, CA1305 on |
| V6 | CA1034 false positive on C# 14 extension blocks | `cd $FIX/cs14-ca1034 && $T/run.sh dotnet build ...` (SDK 10.0.401, `10.0-all`, TWAE) -> `error CA1034: Do not nest type .` | `$FIX/cs14-ca1034-pragma` (`#pragma warning disable CA1034 // reason` around the `extension` block) -> `0 Error(s)`; `$FIX/cs14-ca1034-green` (globalconfig `none`) -> `0 Error(s)`; SDK 11 RC1 (`$FIX/sdk11/cs14-ca1034`) -> `0 Error(s)` unpatched |
| V7 | multi-target rule set differs per leg unless level is explicit | `cd $FIX/multitarget && $T/run.sh dotnet build ...` -> `warning CA2022` only for `TargetFramework=net10.0` (2 hits) | `cd $FIX/multitarget-pinned && ...` (`AnalysisLevel=10.0-all`) -> CA2022 for both `net8.0` and `net10.0` (2 + 2) |
| V8 | `dotnet format` is blind to analyzer diagnostics without a fixer | `cd $FIX/chosen/fmt-nofixer && $T/run.sh dotnet format --verify-no-changes --no-restore; echo $?` -> `0` while `dotnet build` -> `error RS0030` | `fmt-whitespace`/`fmt-unused-using`: format exit `2` with `error WHITESPACE`; build exit 1 with `IDE0055`/`IDE0005` |
| V9 | IDE0005 needs GenerateDocumentationFile at CLI | `cd $FIX/chosen/ide0005-nodoc && $T/run.sh dotnet build ...` -> no IDE0005/CS8019 | `cd $FIX/chosen/ide0005-doc && ...` -> `warning IDE0005` |
| V10 | CS1591 hides behind other errors | `grep -c CS1591 $FIX/out_all-twae.txt` -> 0 (32 errors) | `cat $FIX/res_all.txt \| grep CS1591` -> `CS1591 warning L67` |
| V11 | default AnalysisLevel follows the TFM | `cd $FIX/sdk11/mode-all-nolevel && $T/run.sh dotnet msbuild -nologo -getProperty:EffectiveAnalysisLevel` -> `"10.0"`, build 0 errors | `$FIX/sdk11/mode-all-net11` (TFM net11.0) -> `"11.0"`, 5 new-rule errors |
| V12 | reviewer greps work | `grep -rnE -e '<AnalysisLevel>(latest\|preview)' --include='*.props' --include='*.csproj' --include='*.targets' $FIX/sdk11/latest-all` -> `P.csproj:9: <AnalysisLevel>latest-all</AnalysisLevel>` | same command on `$FIX/chosen` -> no output; `grep -rnE -e '<AnalysisLevel>[0-9]+(\.0)?-all</AnalysisLevel>' ... $FIX/chosen` -> `Directory.Build.props:6` |
| V13 | a malformed level silently disables the gate | `cd $FIX/canary && $T/run.sh dotnet build -nologo -v:q --no-incremental -p:Lvl=10.0.401-all; echo $?` -> exit `0`, no `error CA2007` (same for `-p:Lvl=10.0-allx`) | `cd $FIX/canary && $T/run.sh dotnet build -nologo -v:q --no-incremental` (default `10.0-all`) -> exit `1`, `error CA2007` |

Total: 13 red/green pairs observed (V1-V13), plus the posture matrices in sections 1-3 (19 + 9 builds, all watched).

Not run: Windows host (analyzers are platform-neutral); .NET 8 SDK (8.0.425) against `AnalysisLevel=10.0-all` (the repo pins 10.0.401 via `global.json` so a contributor on SDK 8 fails earlier, at global.json resolution); the SDK 11 GA set (RC1 only).

## Normative guidance candidates

1. **Pin the analysis level explicitly: `<AnalysisLevel>10.0-all</AnalysisLevel>` in the root `Directory.Build.props`; bump it in its own commit, never as a side effect of an SDK or TFM bump.** Rationale: the rule set is code; an SDK or TFM change must not change it. Verify: `grep -rnE -e '<AnalysisLevel>[0-9]+(\.0)?-all</AnalysisLevel>' --include='Directory.Build.props' .` has exactly one hit, and `grep -rnE -e '<AnalysisLevel>(latest|preview)' --include='*.props' --include='*.csproj' --include='*.targets' .` has none; `dotnet msbuild src/Ocx/Ocx.csproj -getProperty:EffectiveAnalysisLevel` prints `10.0`.
2. **Never set `AnalysisMode` together with `AnalysisLevel`; use the compound value.** Rationale: `AnalysisLevel` takes precedence, so a second property is a lie in the file. Verify: `grep -rnE -e '<AnalysisMode>' --include='*.props' --include='*.csproj' .` returns nothing when `AnalysisLevel` is set (category refinement `AnalysisMode<Category>` is the only allowed sibling).
3. **Configure CA/IDE/third-party severities with per-rule `dotnet_diagnostic.<ID>.severity` only; never `dotnet_analyzer_diagnostic.severity` or `dotnet_analyzer_diagnostic.category-*` in a repo that sets AnalysisLevel/Mode.** Rationale: bulk lines are ignored under `All` and silently widen IDE rules on future SDKs. Verify: `grep -rnE -e '^dotnet_analyzer_diagnostic' --include='.globalconfig' --include='.editorconfig' .` returns nothing.
4. **Every `severity = none` line in a `.globalconfig`/`.editorconfig` has a `#` comment line directly above it giving the reason.** Rationale: an unexplained `none` is unreviewable. Verify: `awk 'prev !~ /^#/ && /severity *= *none/ {print FILENAME": "FNR} {prev=$0}' .globalconfig .editorconfig` prints nothing.
5. **Do not put analyzer ids in `NoWarn`; suppress at the site with `#pragma warning disable <ID> // <reason>` ... `restore`, or `[SuppressMessage(..., Justification = "...")]`.** Rationale: `NoWarn` is project-wide and carries no reason. Verify: `grep -rnE -e '<NoWarn>[^<]*(CA|IDE|MA|RS|VSTHRD|SA|RCS)[0-9]' --include='*.props' --include='*.csproj' --include='*.targets' .` returns nothing; `grep -rnE -e '#pragma warning disable [A-Za-z0-9, ]+$' --include='*.cs' src` returns nothing (a pragma without a trailing `// reason`).
6. **`TreatWarningsAsErrors=true` unconditionally in the root props for `src/`; not behind `Configuration==Release` or `$(CI)`.** Rationale: an agent's Debug build must fail where CI fails (measured: exit 0 with 83 warnings vs exit 1 with 82 errors). Verify: `dotnet msbuild src/Ocx/Ocx.csproj -getProperty:TreatWarningsAsErrors -p:Configuration=Debug` prints `true`.
7. **Do not add `CodeAnalysisTreatWarningsAsErrors=false`, `WarningsNotAsErrors`, or `-p:TreatWarningsAsErrors=false` to the gate.** Rationale: each turns a gate into a log. Verify: `grep -rnE -e 'CodeAnalysisTreatWarningsAsErrors|WarningsNotAsErrors|TreatWarningsAsErrors>false' --include='*.props' --include='*.csproj' --include='*.targets' --include='*.yml' .` returns nothing outside `tests/`.
8. **`Nullable=enable` and `ImplicitUsings=enable` in the root props; `#nullable disable` only with `// reason`.** Rationale: CS86xx become errors under rule 6 and replace CA1062. Verify: `dotnet msbuild src/Ocx/Ocx.csproj -getProperty:Nullable` prints `enable`; `grep -rnE -e '#nullable disable' --include='*.cs' src` returns nothing without an adjacent reason.
9. **Keep `GenerateDocumentationFile=true` and `EnforceCodeStyleInBuild=true` in the root props, with IDE0005, IDE0055 and IDE0161 (or the repo's chosen IDE set) at `warning` in `.editorconfig`.** Rationale: IDE0005 is silent without the doc file (roslyn#41640); IDE rules are silent without ECSB. Verify: `dotnet msbuild src/Ocx/Ocx.csproj -getProperty:GenerateDocumentationFile -getProperty:EnforceCodeStyleInBuild` prints `true` twice; `grep -nE -e 'IDE0005\.severity *= *(warning|error)' .editorconfig` has a hit.
10. **CS1591 is an error for `src/` (do not `NoWarn` it); test projects set `GenerateDocumentationFile=false` instead of suppressing.** Rationale: the public API is the SDK's contract; CS1591 is only reported when the rest compiles clean, so run the gate until it exits 0 before claiming docs are complete. Verify: `grep -rn -e 'CS1591' --include='*.props' --include='*.csproj' --include='*.targets' --include='.globalconfig' --include='.editorconfig' .` hits only under `tests/`.
11. **Enable exactly these third-party packs, as `GlobalPackageReference` with exact versions in `Directory.Packages.props`: Microsoft.CodeAnalysis.BannedApiAnalyzers, Microsoft.VisualStudio.Threading.Analyzers.** Rationale: they are the only gates for `DateTime.Now`/`Encoding.Default`/process-argument concatenation and for `.Result`; measured no overlap with CA. Verify: `grep -nE -e 'GlobalPackageReference Include="(Microsoft.CodeAnalysis.BannedApiAnalyzers|Microsoft.VisualStudio.Threading.Analyzers)" Version="[0-9]+\.[0-9]+\.[0-9]+"' Directory.Packages.props` yields 2 lines; `grep -nE -e 'Version="[^"]*[*\[\(]' Directory.Packages.props` yields none.
12. **Do not add StyleCop.Analyzers or Roslynator.Analyzers.** Rationale: StyleCop is 100% style (34 diagnostics on a 70-line probe, 70 unique locations on a clean 870-line library) and conflicts with IDE rules; Roslynator's 2 probe ids duplicated CA rules. Verify: `grep -rniE -e 'StyleCop\.Analyzers|Roslynator\.' --include='*.props' --include='*.csproj' --include='*.targets' .` returns nothing.
13. **`BannedSymbols.txt` ships with at least: `P:System.DateTime.Now`, `P:System.DateTimeOffset.Now`, `P:System.Text.Encoding.Default`, `M:System.Diagnostics.Process.Start(System.String,System.String)`, `P:System.Diagnostics.ProcessStartInfo.Arguments`, each with a `;message` naming the replacement; registered as `AdditionalFiles`.** Rationale: the SDK's rule set has no equivalent for any of the five. Verify: `grep -cE -e '^(P|M):System\.' BannedSymbols.txt` is at least 5 and `grep -n -e 'BannedSymbols.txt' Directory.Build.props` has a hit; a planted `DateTime.Now` makes `dotnet build` print `RS0030`.
14. **Disable `VSTHRD003` (and only that VSTHRD id) repo-wide, with a reason.** Rationale: JoinableTaskFactory heuristic, flags every caller-supplied `Task` await (2 false errors on the fixed twin). Verify: `grep -nE -e 'dotnet_diagnostic\.VSTHRD003\.severity *= *none' .globalconfig` has a hit.
15. **Repo-wide `none` is limited to ids whose precondition the repo guarantees: CA1062 (only with Nullable on), CA1308 (lowercase identifiers), CA1716 (C#-only), CA1303 (not localised).** Rationale: these four were the only API-shaped All findings that were wrong for an ocx wrapper; all others (CA1002, CA2227, CA1056, CA1819, CA1000, CA1034 ...) push toward better public API. Verify: `grep -hoE -e 'dotnet_diagnostic\.[A-Z]+[0-9]+\.severity *= *none' .globalconfig | sort` equals that list (plus VSTHRD003).
16. **For C# 14 `extension(T x) { }` blocks, wrap the block in `#pragma warning disable CA1034 // C# 14 extension block lowers to a nested type` / `restore`.** Rationale: CA1034 misfires on SDK 10.0.401 under `10.0-all` ("Do not nest type ."); do not disable CA1034 repo-wide. Verify: build a file with an `extension(string s)` block, expect `error CA1034` without the pragma, `0 Error(s)` with it; `grep -rn -B1 -e 'extension(' --include='*.cs' src` shows the pragma above each block.
17. **A test project's `.globalconfig` that overrides the root file sets `global_level = 101`.** Rationale: equal levels yield `MultipleGlobalAnalyzerKeys` and *unset* the key, so the override silently does nothing. Verify: `grep -L -e '^global_level *= *10[1-9]' tests/.globalconfig` prints nothing; a build log has no `MultipleGlobalAnalyzerKeys` (`dotnet build 2>&1 | grep -c MultipleGlobalAnalyzerKeys` is `0`).
18. **Place `.globalconfig`/`.editorconfig` at or above the directory of every `Compile` item; do not `Compile Include` files from outside the config's tree.** Rationale: discovery walks up from the Compile items' directories (`Microsoft.Managed.Core.targets:139-146`); misplaced configs apply silently to nothing. Verify: `dotnet build -v:d 2>&1 | grep -o '/analyzerconfig:[^ ]*' | sort -u` (run in the repo root) lists the repo's `.globalconfig`.
19. **CI runs, in order, `dotnet build -c Release --no-incremental` then `dotnet format --verify-no-changes --no-restore`; treat a non-zero exit of either as failure; never use `dotnet format` alone as the gate.** Rationale: format exit 0 on a tree with `DateTime.Now` (measured). Verify: `grep -rnE -e 'dotnet format .*--verify-no-changes' --include='*.yml' --include='*.yaml' .github` has a hit and the same workflow has a preceding `dotnet build` step; no workflow runs `dotnet format` without `--verify-no-changes`.
20. **Multi-target with one explicit level: with `<TargetFrameworks>net8.0;net10.0</TargetFrameworks>` the single `AnalysisLevel=10.0-all` applies to every leg.** Rationale: otherwise the net8.0 leg gets the .NET 8 rule set (CA2022 missing, measured). Verify: `dotnet build 2>&1 | grep -E 'CA2022' | grep -o 'TargetFramework=net[0-9.]*' | sort -u` lists both TFMs on a planted `Stream.Read` whose result is ignored.
21. **Bumping `AnalysisLevel` (to `11.0-all` after the TFM floor moves) is a dedicated change: run the build with the new level, list new ids with `comm -13 <(grep '^dotnet_diagnostic' analysislevel_10_all.globalconfig | sort) <(grep '^dotnet_diagnostic' analysislevel_11_all.globalconfig | sort)` run in the SDK's `Sdks/Microsoft.NET.Sdk/analyzers/build/config` directory (bash), fix or suppress each at the site, then commit the level.** Rationale: the six SDK-11 ids produced 5 errors on clean code. Verify: the PR touching `<AnalysisLevel>` touches no other property; `git diff -U0 | grep -c '^[-+].*AnalysisLevel'` is 2.
22. **Run the gate until it exits 0 before judging documentation or "no warnings".** Rationale: doc-comment diagnostics are skipped when other errors exist. Verify: reviewer reruns `dotnet build 2>&1 | tail -3` and sees `0 Error(s)`.
23. **Keep a canary project (one file with `public static async Task A(Task t) { await t; }`, CA2007 is All-only) that MUST fail with `error CA2007` under the repo's props; CI asserts the failure.** Rationale: `AnalysisLevel` typos (`10.0.401-all`, `10.0-allx`) disable the gate with exit 0. Verify: `dotnet build tests/Canary/Canary.csproj 2>&1 | grep -c 'error CA2007'` prints `1` (and the CI step fails if it prints `0`).

## AI-agent angle

| What an LLM does | Why it is wrong | Smallest mechanical check |
|---|---|---|
| Writes `<AnalysisLevel>latest</AnalysisLevel>` or `latest-All` "to always get the newest rules", | floats with the SDK | `grep -rnE -e '<AnalysisLevel>(latest\|preview)' --include='*.props' --include='*.csproj' .` (none allowed); `dotnet msbuild -getProperty:EffectiveAnalysisLevel` must print `10.0` |
| Writes a plausible but unmapped level: `<AnalysisLevel>10.0.401-all</AnalysisLevel>`, `10.0-allx`, `net10.0-all` | the first two build clean with the gate OFF (exit 0, no CA findings); the third errors with MSB4184 | the canary project must fail: `dotnet build tests/Canary/Canary.csproj 2>&1 \| grep -c 'error CA2007'` prints `1` |
| Adds `dotnet_analyzer_diagnostic.severity = warning` / `category-Style.severity = error` to `.editorconfig` expecting it to raise everything | no-op for CA under AnalysisLevel/Mode All, and a widening lever for IDE rules on future SDKs | `grep -rnE -e '^dotnet_analyzer_diagnostic' .globalconfig .editorconfig` |
| Silences a failure with `<NoWarn>$(NoWarn);CA2007;CA1062;...</NoWarn>` or `<TreatWarningsAsErrors>false</TreatWarningsAsErrors>` / `-p:TreatWarningsAsErrors=false` / `-p:WarningLevel=0` to "get the build green" | removes the gate for the whole project, with no reason on file | the NoWarn/TWAE greps in rules 5, 7; CI refuses `-p:Treat...` on the command line: `grep -rnE -e 'TreatWarningsAsErrors=false\|WarningLevel=0\|-nowarn' .github Makefile build` |
| Puts `.globalconfig` next to the csproj but links sources from a sibling tree (`Compile Include="../shared/*.cs"`), or creates a `tests/.globalconfig` without `global_level` | config never applied / `MultipleGlobalAnalyzerKeys` unsets the key | `dotnet build -v:d \| grep -c 'analyzerconfig:.*\.globalconfig'`; `grep -c MultipleGlobalAnalyzerKeys` on the build log |
| Adds `.ruleset` / `CodeAnalysisRuleSet` (the .NET Framework / FxCop idiom) | deprecated; precedence vs globalconfig undefined | `grep -rniE -e 'CodeAnalysisRuleSet\|\.ruleset' --include='*.props' --include='*.csproj' .` |
| Installs `Microsoft.CodeAnalysis.NetAnalyzers` or `Microsoft.CodeAnalysis.FxCopAnalyzers` "for CA rules" in a net10.0 project | the SDK already bundles NetAnalyzers; installing the package turns the SDK analyzers off and warns when `EnableNETAnalyzers` is also set ([overview](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/overview)); FxCopAnalyzers is deprecated | `grep -rniE -e 'NetAnalyzers\|FxCopAnalyzers' --include='*.props' --include='*.csproj' .` |
| Writes pre-.NET 6/8 idioms that `10.0-all` rejects: `if (x == null) throw new ArgumentNullException(nameof(x))` (CA1510), `if (_disposed) throw new ObjectDisposedException(...)` (CA1513), `new JsonSerializerOptions{...}` per call (CA1869), `s.ToLower() == "x"` (CA1304/1311/1862), `s.Contains("/")` (CA1847), `Task.Result`/`.Wait()` (VSTHRD002), `DateTime.Now` (RS0030), `catch (Exception) { }` (CA1031), `"id " + x` into `Process.Start` (RS0030) | all measured to fail the gate | run the gate: `dotnet build -nologo -v:q --no-incremental 2>&1 \| grep -E 'error (CA1510\|CA1513\|CA1869\|CA1304\|CA1311\|CA1862\|CA1847\|VSTHRD002\|RS0030\|CA1031)'` |
| "Fixes" CA1062 by sprinkling `ArgumentNullException.ThrowIfNull(x)` on every non-nullable parameter | with Nullable on, CA2264 (`ThrowIfNull` on a non-nullable value) is a .NET 9 default-warning rule and the guard is redundant | `grep -rn -e 'ThrowIfNull' --include='*.cs' src` reviewed against parameter nullability; the gate flags CA2264 at default |
| Reads a TWAE build that lists errors and concludes docs are fine because CS1591 is absent | CS1591 is suppressed by the compiler while any other error exists | repeat until `0 Error(s)`, then `grep -c CS1591` |
| Replaces a flagged `ToLowerInvariant()` with `ToUpperInvariant()` on OCI references to satisfy CA1308 | changes data (OCI refs are lowercase) | rule 15: CA1308 is `none` with reason; `grep -rn -e 'ToUpperInvariant' --include='*.cs' src` reviewed |
| Claims `dotnet format` "checks analyzers" and adds only `dotnet format --verify-no-changes` as the gate | blind to non-fixable diagnostics (measured exit 0 with `DateTime.Now`) | CI must contain `dotnet build` before it (rule 19) |
| Adds StyleCop.Analyzers "for consistency" and then `NoWarn`s SA1633;SA1200;SA1600... | 100+ style diagnostics per clean library; the usual fix is to turn them off wholesale | rule 12 grep |

## Contested / evolving

- **TWAE always vs Release/CI only (as of 2026-10-10).** Exemplars split: unconditional (xunit, 23 repos have it somewhere) vs Release-only (simple-exec) . Human-centric guidance favours a conditional so local WIP builds stay quiet; this research chooses unconditional because the consumer is an agent whose "done" signal is a local Debug build. Counter-view (valid for mixed human/agent repos): TWAE only when `$(ContinuousIntegrationBuild)=='true'` or in Release, plus a pre-commit hook that runs the Release build. Trend: the .NET 8+ templates ship no TWAE; no movement.
- **Numeric pin vs `latest` + pinned SDK.** No exemplar pins a numeric level; xunit and testfx float (`latest-All`, `preview-recommended`) and rely on `global.json` plus triage at SDK-bump time. The pin trades a one-line edit per .NET release for no surprise errors; it also forgoes new rules until someone bumps. SDK 11 GA (Nov 2026) is the first real test: the six ids above may differ at GA, and CA2026/CA1878 are Info-only on RC1 and unverified here.
- **Docs vs behaviour on the AnalysisLevel default.** msbuild-props says `latest`; the SDK derives it from the TFM (measured, SDK 10.0.401 and 11.0 RC1). Relying on either is fragile; set it explicitly. Watch for the docs being corrected.
- **CA1062 off when Nullable is on.** Microsoft's rule page still presents CA1062 as a validity check and has no Nullable note (page last updated 2026-04-02); in practice the .NET team's own repos with NRT rely on the compiler. Libraries with untrusted callers or reflection-heavy hosts, or consumers using `#nullable disable`, may still want it on. Condition: only disable it where every project is `Nullable=enable`.
- **Meziantou.Analyzer.** Zero exemplars consume it; its default-on MA rules duplicated CA rules on the probe, and its unique value (MA0048, MA0009 regex timeout, many more) is real but not measured as defect-catching here. Optional second tier; if added, set `MeziantouAnalysisMode` explicitly (`Default`, not `all-warnings`, which added ~30 noisy diagnostics) and pin the version like the others (new MA versions add warnings that break TWAE exactly as a floating AnalysisLevel does).
- **BannedApiAnalyzers vs a custom Roslyn analyzer.** BannedSymbols.txt is symbol-only (no pattern like "string concatenation passed to Process.Start"); banning `Process.Start(string,string)` and `ProcessStartInfo.Arguments` is a sound proxy, not a data-flow check. MA0162 offers a similar check but is off by default.
- **dotnet format as a gate.** Since ECSB + IDE0055 at warning covers whitespace at build time, running `dotnet format --verify-no-changes` is belt-and-braces; 30 of 35 exemplars have no format check. Keep as an agent-fix aid and a CI second step; revisit if `dotnet format` gets analyzer-aware exit codes. `--framework` support lands in .NET 11.
- **IDE0005 + GenerateDocumentationFile** is a seven-year-old open bug (roslyn#41640); a fix would let repos drop the doc file for non-library projects.
- **CA1034 on extension blocks** is fixed in SDK 11 RC1 (not firing); SDK 10.0.x servicing may or may not backport. Until then the site-level pragma is correct; remove it after the SDK floor moves past the fix.
- **C# 14/15 note.** `field`-keyword properties, `extension` blocks and null-conditional assignment all built clean with the five packs on SDK 10.0.401 (no AD0001). .NET 11 / C# 15 adds the `updated-memory-safety-rules` feature behind `LangVersion=preview` + `Features`; not tested here with the analyzers.

## Sources

| URL | what it is | date/era | why worth reading |
|---|---|---|---|
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/overview | Code analysis overview: modes, "Latest updates" (pin AnalysisLevel), CodeAnalysisTreatWarningsAsErrors, ECSB, third-party list | ms.date 2025-11-05, updated 2026-05-28; .NET 8/9/10 tabs | primary statement of Default/Minimum/Recommended/All and the pinning advice |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/configuration-options | Severity syntax, scope (rule/category/all), the "bulk is ignored under AnalysisMode" note, precedence | 2026-02-13 | the exact sentences behind rules 2-3 |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/configuration-files | EditorConfig vs global AnalyzerConfig, `global_level`, naming, precedence table | updated 2024-08-31 | defines `global_level` defaults 0/100 and the collision behaviour |
| https://learn.microsoft.com/en-us/dotnet/core/project-sdk/msbuild-props | MSBuild reference for AnalysisLevel, AnalysisMode, EnableNETAnalyzers, EnforceCodeStyleInBuild, CodeAnalysisTreatWarningsAsErrors, GenerateDocumentationFile | .NET 10 era | supported-values table (`10.0-<mode>`) and the (wrong) `latest` default claim |
| https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-options/errors-warnings | TreatWarningsAsErrors / WarningsAsErrors / WarningsNotAsErrors / NoWarn semantics; AnalysisLevel default = TFM | 2025-05-30, updated 2026-05-01 | the TWAE vs `-warnaserror` difference; `nullable` group |
| https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-options/language | Nullable, LangVersion (`latest` warning), C# 15 memory-safety preview | 2026-09-10 | Nullable default `disable`, generated-file exclusion |
| https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-format | `dotnet format` options, `--verify-no-changes`, `--severity`, subcommands, `--framework` (.NET 11) | 2026-09-15 | CI command and its limits |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/suppress-warnings | pragma, SuppressMessage with Justification, GlobalSuppressions, config severity none | 2022 (updated 2022-10) | the three suppression mechanisms; site vs file scope |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1062 | CA1062 rule page | updated 2026-04-02 | "Enabled by default in .NET 10: No"; no nullable guidance |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2007 | CA2007 rule page | updated 2026-04-02 | library-vs-app suppression guidance; `output_kind` option |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1031 | CA1031 rule page | updated 2026-04-02 | "Do not suppress" wording; `disallowed_symbol_names` |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2025 | CA2025 rule page | 2025-05-08 | simple-exec's suppressed rule; disabled by default, All only |
| https://learn.microsoft.com/en-us/nuget/consume-packages/central-package-management | Central Package Management incl. GlobalPackageReference | updated 2026-03-03 | `GlobalPackageReference` metadata and minimum versions |
| https://github.com/dotnet/sdk/blob/main/src/Microsoft.CodeAnalysis.NetAnalyzers/src/Microsoft.CodeAnalysis.NetAnalyzers/AnalyzerReleases.Shipped.md and `.../AnalyzerReleases.Unshipped.md` (read via raw.githubusercontent.com) | per-release rule list with default severity | main as of 2026-10-10 | Unshipped lists CA1517/1876/1877/1878/2026/2027/2028/2267 as the next release; Shipped 10.0 lists CA2025 as Disabled |
| https://github.com/dotnet/roslyn/issues/41640 | roslyn issue: IDE0005 / CS8019 not reported without XML doc parsing | opened 2020-02-13; last comment 2026-10-06 | root cause of GenerateDocumentationFile requirement |
| https://github.com/dotnet/roslyn-analyzers/blob/main/src/Microsoft.CodeAnalysis.BannedApiAnalyzers/BannedApiAnalyzers.Help.md | BannedApiAnalyzers usage | current | `BannedSymbols.txt` format, AdditionalFiles, ID string prefixes |
| https://github.com/meziantou/Meziantou.Analyzer/blob/main/README.md | Meziantou.Analyzer rule list and `MeziantouAnalysisMode` | 3.0.297 era | MA0004/6/11/40/42/45/48/161/162/163 titles and enabled-by-default state |
| https://microsoft.github.io/vs-threading/analyzers/index.html | VS.Threading analyzers VSTHRD001-202 table | 18.x era | default severities; VSTHRD003 semantics |
| https://github.com/dotnet/roslynator (README via raw.githubusercontent.com) | Roslynator packages and CLI | current | three analyzer packages; CLI install |
| https://github.com/DotNetAnalyzers/StyleCopAnalyzers (README via raw.githubusercontent.com) | StyleCop.Analyzers README | current | C# version/beta statements |
| adamralph__simple-exec@f80913246993: `Directory.Build.props`, `.globalconfig`, `tests/Directory.Build.props`, `src/SimpleExec/Command.cs:12,409,432-437`, `Internal/ProcessExtensions.cs:117`, `ExitCodeException.cs:6` | real recipe with AnalysisMode All, bulk globalconfig line, TWAE in Release, site pragmas | HEAD 2026-10-08 | the minimal real-world All posture and its five suppression sites |
| xunit__xunit@0c7aa4991fa3: `src/Directory.Build.props:33,61,68,72`; microsoft__testfx@7226b0c74729: `eng/Analyzers.props:4-17`, `src/Platform/Microsoft.Testing.Platform/Microsoft.Testing.Platform.csproj:12`; App-vNext__Polly@e4476096da5b: `eng/Analyzers.targets:3-19`, `eng/analyzers/BannedSymbols.txt:1-5`; Humanizr__Humanizer@4574b93883bf: `Directory.Build.props:18-19`; npgsql__npgsql@9c47244547c2: `.editorconfig:64`, `src/.editorconfig:16` | exemplar practice for floating level, CS1591-as-error, BannedSymbols, Minimum mode, library-vs-test CA2007 | 2026 | counter-practice evidence for the Contested section |
| `/home/mherwig/.cache/research-lang/dotnet-tools/dotnet/sdk/{10.0.401,11.0.100-rc.1.26425.128}/Sdks/Microsoft.NET.Sdk/analyzers/build/config/analysislevel_*.globalconfig` and `.../Roslyn/Microsoft.Managed.Core.targets:139-146` | the SDK's own generated rule files and the config-discovery target | SDK 10.0.401, 11.0 RC1 | source of the 92/145/280 counts, `global_level = -100`, and the six new SDK-11 rules |
