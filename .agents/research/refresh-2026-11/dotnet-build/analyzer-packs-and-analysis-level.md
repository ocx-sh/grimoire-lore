---
title: dotnet-build delta - analyzer packs, AnalysisLevel and Polyfill, 2026-10-11 to 2026-11-27
pair: dotnet-build
date_researched: 2026-11-27
window_start: 2026-10-11
model: sonnet
sources_fetched: 24
---

# dotnet-build delta: analyzer packs, AnalysisLevel and Polyfill

This is a delta update of an existing, already-researched pair. Only what changed between 2026-10-11 and 2026-11-27 is reported. Everything marked "unchanged" stays exactly as written in the pair. The sibling pair csharp-quality owns the rules these IDs enforce, so only existence, name, default and version facts appear here.

## Contents

- Summary
- Findings by claim at risk
- Normative guidance candidates
- AI-agent angle
- Contested / evolving
- Could not determine
- Sources

## Summary

- .NET 11 reached GA on 2026-11-10 (dotnet/dotnet release v11.0.100). It is the first date on which `11.0-all` is a final rule set.
- Two of the six pins are no longer the newest stable version: `Meziantou.Analyzer` (3.0.297 is now 3.0.342) and `Microsoft.VisualStudio.Threading.Analyzers` (18.7.23 is now 18.12.1). The other four pins are still the newest stable.
- `Microsoft.CodeAnalysis.BannedApiAnalyzers` 5.6.0 and `Microsoft.CodeAnalysis.PublicApiAnalyzers` 5.6.0 are unchanged. Only `PublicApiAnalyzers` has a newer build, `5.11.0-1.26425.128`, and it is a prerelease.
- `IDisposableAnalyzers` 4.0.8 is unchanged and is still the newest version (last updated 2024-06-19).
- `MinVer` 8.0.0 is unchanged and is still the newest stable. `8.1.0-alpha.1` (2026-09-29) is a prerelease.
- Meziantou 3.0.297 to 3.0.342 added three rules (MA0243, MA0244, MA0245) and removed or renamed none. Every Meziantou ID that the posture files set still exists at 3.0.342.
- The Threading pin moves across a feature release. 18.12.1 adds ThreadStatic analyzers and a redundant-async-state-machine analyzer, whose rule IDs and default severities could not be read (see Could not determine).
- CA rule delta from `10.0-all` to `11.0-all`: exactly eight new rules, CA1517, CA1876, CA1877, CA1878, CA2026, CA2027, CA2028 and CA2267. Seven are Info and one (CA2267) is Warning by default. Under `-all` every one of them fires as a warning.
- The five RC1 errors in CS-BUILD-10 (CA1517, CA1876, CA1877, CA2027, CA2028) are confirmed as part of the eight. CA1878 and CA2026 are also in the set, so the corpus open question is answered at the rule-existence level. Which of the eight fires on a clean tree could not be measured because no SDK 11 is installed here.
- `10.0-all` stays the pin. A bump to `11.0-all` is available, not required, and needs the dedicated commit that CS-BUILD-10 demands. That commit's ID list is given below.
- Polyfill moved from 11.4.3 to 12.0.0 (2026-11-21). None of the three gaps closed. `PolyArgumentExceptions` is unchanged.
- MinVer still sets `AssemblyVersion` to `{MinVerMajor}.0.0.0`.

## Findings

### 1. Newest stable version of each pinned package

Dates come from the GitHub release lists and the nuget.org version tables. nuget.org labels its Threading and Polyfill column "Last Updated", not "Published".

| Package | Pinned | Newest stable now | Verdict | Date of upstream change |
|---|---|---|---|---|
| Microsoft.CodeAnalysis.BannedApiAnalyzers | 5.6.0 | 5.6.0 | unchanged | none in window |
| Microsoft.CodeAnalysis.PublicApiAnalyzers | 5.6.0 | 5.6.0 (5.11.0-1.26425.128 is a prerelease) | unchanged | none stable in window |
| Microsoft.VisualStudio.Threading.Analyzers | 18.7.23 | 18.12.1 | changed | 18.12.1 released 2026-10-26 |
| IDisposableAnalyzers | 4.0.8 | 4.0.8 | unchanged | none (4.0.8 is dated 2024-06-19) |
| Meziantou.Analyzer | 3.0.297 | 3.0.342 | changed | 3.0.342 released 2026-11-22 |
| MinVer | 8.0.0 | 8.0.0 (8.1.0-alpha.1 is a prerelease) | unchanged | none stable in window |

The Banned and PublicApi 5.6.0 builds are listed as last updated 2026-07-02 on nuget.org, so they predate the window.

Order of dates matters for 18.x: the v18.7.23 tag is 2026-06-22 and v18.12.1 is 2026-10-26. nuget.org also lists 18.7.65 and 18.7.139 as updated 2026-11-13, which look like servicing builds of the 18.7 line published after 18.12.1. They are not newer feature versions.

The existing header "Versions read 2026-10-11" in `Directory.Packages.analyzers.props` and CS-BUILD-15 is still true for the four unchanged pins. It is stale for Meziantou and Threading.

#### 1a. Meziantou.Analyzer 3.0.297 to 3.0.342

Source: the 45 GitHub release bodies 3.0.298 to 3.0.342 (all searched for the IDs below and for rename, remove, deprecate, severity), plus a diff of the README rule table at tag 3.0.297 against tag 3.0.342.

- New rules: MA0243 (Usage, "Use an escape sequence for invisible characters", Info, off by default, code fix), MA0244 (Usage, "Use a decimal literal instead of converting a floating-point constant to decimal", Warning, on by default, code fix) and MA0245 (Usage, "Review the conversion of a floating-point value to decimal", Info, off by default). That diff was the only difference in the table.
- With `MeziantouAnalysisMode` set to `None` only the rules named per-rule in the posture files fire, so none of the three new rules fires under the posture. This relies on the pair's own statement of what `None` does and was not re-measured.
- No ID was removed, renamed or merged between the two tags.
- MA0143: still present, "Primary constructor parameters should be readonly", Warning, enabled by default, not configurable. Unchanged.
- MA0222 and MA0223: still present (JsonSourceGenerationOptions should set `RespectNullableAnnotations` and `RespectRequiredConstructorParameters`), severity Warning, not enabled by default, code fix available. This matches why the posture files set them explicitly. Unchanged.
- MA0053: still present, "Make class or record sealed". The doc at 3.0.342 shows the options `MA0053.public_class_should_be_sealed`, `MA0053.class_with_virtual_member_should_be_sealed` and `MA0053.exceptions_should_be_sealed`. The posture sets the first and the third, so both option names still exist. The 3.0.3xx range changed MA0053 behavior once: "do not report classes used as generic constraints" ([PR 1662](https://github.com/meziantou/Meziantou.Analyzer/pull/1662)) and added a CompilationEnd tag ([PR 1793](https://github.com/meziantou/Meziantou.Analyzer/pull/1793)). Fewer reports, never more, so this cannot add errors to the posture. This is a behavior change inside the window, not an ID change.

#### 1b. Microsoft.VisualStudio.Threading.Analyzers 18.7.23 to 18.12.1

Source: the [v18.12.1 release notes](https://github.com/microsoft/vs-threading/releases/tag/v18.12.1).

- The release is a feature jump covering VSTHRD fixes and three additions: "Add ThreadStatic correctness analyzers" ([PR 1646](https://github.com/microsoft/vs-threading/pull/1646)), "Add analyzer for redundant async state machines" ([PR 1666](https://github.com/microsoft/vs-threading/pull/1666)) and a reduced-severity change, "Reduce VSTHRD117 severity for default initializers" ([PR 1658](https://github.com/microsoft/vs-threading/pull/1658)).
- Fixes touch VSTHRD002, 003, 010, 103, 104 and 200. The posture sets VSTHRD002, 003 (none), 100, 101, 103, 105, 110, 114 and 200. All of those IDs still exist: the doc directory listing of `doc/analyzers` shows VSTHRD001 to 004, 010 to 012, 100 to 115 and 200.
- No VSTHRD ID in the release notes is described as removed or renamed.
- The IDs and default severities of the new ThreadStatic and state-machine rules could not be read. A bump therefore cannot yet say whether they fire under the posture. Treat the bump as unverified until a build is run (see candidate 4).
- VSTHRD011: its doc page still exists. The comment "VSTHRD011 stays at its package default" holds in the sense that nothing was renamed. The release notes do not mention a VSTHRD011 default change. Its default severity value itself was not read in this pass, so "unchanged" here means no reported change.

#### 1c. IDisposableAnalyzers, Roslyn analyzers, MinVer

- IDisposableAnalyzers: no version after 4.0.8 exists on nuget.org. IDISP001, IDISP004, IDISP024 and IDISP025 cannot have changed in a package that did not release. Unchanged.
- BannedApiAnalyzers and PublicApiAnalyzers: no stable release in the window. The `RS0016`, `RS0037` and `RS0026` behavior the header comment describes belongs to 5.6.0 and is unchanged. The 5.11.0-1.26425.128 prerelease was not opened and does not matter for an exact pin.
- MinVer: 8.0.0 is the newest stable (2026-09-05). 8.1.0-alpha.1 (2026-09-29) is a prerelease. Unchanged.

### 2. CA rule delta between `10.0-all` and `11.0-all` at .NET 11 GA

Sources: [dotnet/sdk AnalyzerReleases.Unshipped.md](https://raw.githubusercontent.com/dotnet/sdk/main/src/Microsoft.CodeAnalysis.NetAnalyzers/src/Microsoft.CodeAnalysis.NetAnalyzers/AnalyzerReleases.Unshipped.md) (a "New Rules" table with eight rows) and the [Shipped file on release/11.0.1xx](https://raw.githubusercontent.com/dotnet/sdk/release/11.0.1xx/src/Microsoft.CodeAnalysis.NetAnalyzers/src/Microsoft.CodeAnalysis.NetAnalyzers/AnalyzerReleases.Shipped.md), whose newest section is still "Release 10.0", so the 11.0 rules sit in the Unshipped file. Cross-checked against the learn.microsoft.com rule index.

| ID | Category | Default severity | Rule (analyzer) |
|---|---|---|---|
| CA1517 | Maintainability | Info | Use `ReadOnlySpan<T>` or `ReadOnlyMemory<T>` instead of `Span<T>` or `Memory<T>` (PreferReadOnlySpanOverSpanAnalyzer) |
| CA1876 | Performance | Info | Do not use `AsParallel` in `foreach` |
| CA1877 | Performance | Info | Use `Path.Combine` or `Path.Join` overloads instead of nesting them |
| CA1878 | Performance | Info | Prefer ReadOnlySpan properties over readonly array fields (not enabled by default in .NET 10 or .NET 11, per its learn page) |
| CA2026 | Reliability | Info | Prefer `JsonElement.Parse` over `JsonDocument.Parse().RootElement` (learn page: enabled "As suggestion" in .NET 11) |
| CA2027 | Reliability | Info | Cancel `Task.Delay` after `Task.WhenAny` completes |
| CA2028 | Reliability | Info | Avoid redundant `Regex.IsMatch` call before `Regex.Match` |
| CA2267 | Usage | Warning | Quote whitespace in file-based program directive values (learn overview marks it as the one new enabled-by-default rule, version added .NET 11) |

Reading of the delta:

- Every `10.0` rule that the Shipped file lists (CA1873, CA1874, CA1875, CA2023, CA2024, CA2025 disabled, CA2266) is already in `10.0-all`, so nothing is lost moving up. No CA rule was reported removed or renamed in the Unshipped file.
- The five rules that CS-BUILD-10 names as RC1 errors are all in the table. The two the corpus listed as "listed but not seen firing", CA1878 and CA2026, are in the table too, so the final list is eight, not five.
- CA2267 is a file-based-program rule and fires only on `#:` directives, so it cannot fire on an ordinary csproj tree.
- The Unshipped file was read on `main`, not on the 11.0 tag. The set could contain a post-11.0 addition. The learn rule index, updated 2026-11-12 to 2026-11-26, lists these eight and no other new ID above CA1875 or CA2025 in the portion read.
- The rule IDs were not checked against `analysislevel_11_all.globalconfig` itself. No .NET SDK is installed on this machine and the GitHub API was rate-limited. This is the one claim that still needs a read of the generated file.

### 3. `10.0-all` or `11.0-all`

Source for the value forms: [msbuild-props, AnalysisLevel](https://learn.microsoft.com/en-us/dotnet/core/project-sdk/msbuild-props#analysislevel) accepts `11.0`, `11`, `10.0`, `10` with `-<mode>`, and states that a numeric level "locks the warnings to that set", so an SDK 11 build still honors `10.0-all`. The [code-analysis overview](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/overview) (ms.date 2026-11-12) confirms that moving from .NET 10 to 11 and keeping `<AnalysisLevel>10.0</AnalysisLevel>` leaves the rule set unchanged.

Decision: `10.0-all` stays the pin. `11.0-all` is a valid, newly available bump but nothing requires it, and it adds eight warnings. A repository on SDK 11 that wants the new rules makes the bump in its own commit that lists the eight IDs above (CS-BUILD-10 text). The existing sentence "A floating `latest-all` made 5 new errors on clean code on SDK 11 RC1 (CA1517, CA1876, CA1877, CA2027, CA2028)" is still correct as far as it goes and is now incomplete: the full set is eight.

### 4. Polyfill, the three gaps and `PolyArgumentExceptions`

Source: [Polyfill releases](https://github.com/SimonCropp/Polyfill/releases) and a shallow clone of tag 12.0.0, searched by grep.

- Versions in the window: 11.4.3 (2026-10-05), 11.4.4 and 11.4.5 (both 2026-10-12), 12.0.0 (2026-11-21). The 12.0.0 notes list two items: keep conditional guards on split type forwards ([PR 725](https://github.com/SimonCropp/Polyfill/pull/725)) and return `Task<Stream>` from `ZipArchiveEntry.OpenAsync(FileAccess)` ([PR 727](https://github.com/SimonCropp/Polyfill/pull/727)).
- `StandardInputEncoding`: no match in the 12.0.0 tree for `StandardInputEncoding`. Gap still open.
- `System.Formats.Tar`: no match for `System.Formats.Tar`, `TarReader` or `TarWriter`. Gap still open.
- `a[1..]` on arrays: `src/Tests/IndexRangeSample.cs` still carries the comment "Array not supported due to no RuntimeHelpers.GetSubArray", and `src/Consume/Consume.cs` repeats it. Gap still open.
- `PolyArgumentExceptions`: still the property name, still documented in the readme for the ArgumentException polyfills ("Requires `<PolyArgumentExceptions>true</PolyArgumentExceptions>`"), and listed in the repository's consumer options. Unchanged.
- The CS-BUILD-06 reason clause says "the three gaps still fail with Polyfill 11.4.3". That text is true but names a version two majors-of-patches old. It should say 12.0.0. The grep-based proof above is not a build; the original claim was a measured build failure.

### 5. Posture file IDs (analyzers.globalconfig, analyzers.editorconfig)

| Claim | Result |
|---|---|
| MA0143, MA0222, MA0223, MA0053 and both MA0053 options | unchanged, see 1a |
| IDISP001, IDISP004, IDISP024, IDISP025 | unchanged, package did not release |
| VSTHRD002, 003, 100, 101, 103, 105, 110, 114, 200 | still exist at 18.12.1 per the doc directory; defaults not re-read |
| VSTHRD011 "stays at its package default" | no reported change; default value not re-read |
| IDE0370 | could not determine |
| LOGGEN000, LOGGEN002, SYSLIB1002, 1006, 1012, 1013, 1015, 1018, 1025, 0014 | could not determine; they ship in the runtime or `Microsoft.Extensions.Logging` and no window change was found |
| SYSLIB1045 "Info by default" | learn page for SYSLIB1040 to 1049 still lists SYSLIB1045, now with a `net11.0` example; its severity is not stated on that page. Could not determine the default |
| SYSLIB1006 "is Info" | could not determine |
| xUnit1051 "is a Warning by default" | could not determine; xunit.analyzers is not a pinned package and was not opened |

### 6. CS-PKG-06

The [MinVer README](https://raw.githubusercontent.com/adamralph/minver/main/README.md) still gives `AssemblyVersion` as `{MinVerMajor}.0.0.0`. Unchanged. The README lists .NET SDK 10.0 or later as a requirement, while the nuget.org page for 8.0.0 says 8.0 or later; this does not touch the pin.

## Normative guidance candidates

1. Rule: when the repository builds on SDK 11, the optional `11.0-all` bump is one commit that changes only `AnalysisLevel` and lists CA1517, CA1876, CA1877, CA1878, CA2026, CA2027, CA2028 and CA2267 in the message.
   Rationale: CS-BUILD-10 already demands a dedicated commit that lists new IDs, and this is the verified list.
   Verification: `git show --stat HEAD` touches one file; `dotnet msbuild -getProperty:AnalysisLevel` prints `11.0-all` on every TFM leg; build output on a clean tree is read for those eight IDs only.
2. Rule: rewrite the CS-BUILD-10 reason text to name eight IDs, not five, and keep `10.0-all` as the pin.
   Rationale: the five-ID list is a subset.
   Verification: grep `rules/dotnet-build.md` for `CA1878` and `CA2026`.
3. Rule: bump `Meziantou.Analyzer` to 3.0.342 and refresh the header date. No posture ID changes are needed.
   Rationale: only MA0243 to MA0245 are new and none fires under `MeziantouAnalysisMode` `None`.
   Verification: `grep -rh 'Include="Meziantou.Analyzer" Version=' --include='Directory.Packages*.props' .` prints 3.0.342; a clean build shows no MA0243, MA0244 or MA0245.
4. Rule: bump `Microsoft.VisualStudio.Threading.Analyzers` to 18.12.1 only after a build on a reference tree and a list of any new VSTHRD ID that fires. Until then keep 18.7.23.
   Rationale: the release adds analyzers whose IDs and defaults could not be read.
   Verification: build once at 18.7.23 and once at 18.12.1, diff the `VSTHRD` IDs in the log (`grep -o 'VSTHRD[0-9]*' build.log | sort -u`).
5. Rule: change the CS-BUILD-06 clause to "the three gaps still fail with Polyfill 12.0.0" only after a build proves it; keep the gap list as is.
   Rationale: source grep shows the APIs absent, but the original claim was a measured failure.
   Verification: a ns2.0 test project using `ProcessStartInfo.StandardInputEncoding`, `System.Formats.Tar` and `a[1..]` fails with Polyfill 12.0.0.
6. Rule: replace "Versions read 2026-10-11" with a date for each package that was re-read, or add "re-read 2026-11-27" for the four unchanged ones.
   Rationale: the header otherwise claims a read that predates 3.0.342 and 18.12.1.
   Verification: grep for the string in `Directory.Packages.analyzers.props` and CS-BUILD-15.

## AI-agent angle

- An agent that remembers Meziantou 3.0.x as "3.0.297" or Threading as "18.7.x" will write a stale pin. Check: compare the exact version in the props file with nuget.org before editing.
- An agent that sees "5 new errors" will list only five IDs in a bump commit. Check: the commit message contains all eight IDs from candidate 1.
- An agent may treat `11.0-all` as the safe default on SDK 11 because the docs say a project targeting the newest .NET defaults to `latest`. Check: the `analysislevel` block in `rules/dotnet-build.md` still prints nothing for a repository pinned to `10.0-all`.
- An agent may add MA0243 to MA0245 lines to the posture because they are new. They are not needed under `None`. Check: grep the globalconfig for MA0243, MA0244, MA0245 returns nothing.

## Contested / evolving

- Whether the `analysislevel_11_all.globalconfig` shipped in the 11.0.100 SDK matches the Unshipped table here is not settled; the SDK file is the authority.
- Threading 18.12.1 is a large jump. Its new analyzers are the most likely source of a new error on a clean tree, trending toward more analyzers per release, as of 2026-10-26.
- Polyfill went to 12.0.0 with a small change list. A future 12.x may add the Tar or `StandardInputEncoding` polyfills; nothing in the window did.

## Could not determine

- The rule IDs and default severities of the new ThreadStatic and redundant-async-state-machine analyzers in Threading 18.12.1. The source file listing was not readable after the GitHub API rate limit was exhausted.
- Whether `analysislevel_11_all.globalconfig` matches the Unshipped table (no SDK 11 installed, API limit hit, release-tag paths in the dotnet/dotnet repository returned 404).
- Default severities of SYSLIB1006, SYSLIB1045, xUnit1051, LOGGEN000, LOGGEN002, IDE0370 and VSTHRD011. No change was reported anywhere; the values themselves were not re-read.
- The exact publication date of Meziantou 3.0.297 on nuget.org. The GitHub release is dated 2026-10-10, one day before the baseline read.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://api.nuget.org/v3-flatcontainer/microsoft.codeanalysis.bannedapianalyzers/index.json | NuGet version list | read 2026-11-27 | newest Banned version |
| https://api.nuget.org/v3-flatcontainer/microsoft.codeanalysis.publicapianalyzers/index.json | NuGet version list | read 2026-11-27 | shows the 5.11 prerelease |
| https://api.nuget.org/v3-flatcontainer/microsoft.visualstudio.threading.analyzers/index.json | NuGet version list | read 2026-11-27 | newest Threading version |
| https://api.nuget.org/v3-flatcontainer/idisposableanalyzers/index.json | NuGet version list | read 2026-11-27 | confirms 4.0.8 is newest |
| https://api.nuget.org/v3-flatcontainer/meziantou.analyzer/index.json | NuGet version list | read 2026-11-27 | newest Meziantou version |
| https://api.nuget.org/v3-flatcontainer/minver/index.json | NuGet version list | read 2026-11-27 | confirms 8.0.0 stable |
| https://api.nuget.org/v3-flatcontainer/polyfill/index.json | NuGet version list | read 2026-11-27 | newest Polyfill version |
| https://www.nuget.org/packages/Microsoft.VisualStudio.Threading.Analyzers/ | NuGet package page | 2026-11 | dates of 18.x builds |
| https://www.nuget.org/packages/Polyfill/ | NuGet package page | 2026-11 | Polyfill dates |
| https://www.nuget.org/packages/Meziantou.Analyzer/ | NuGet package page | 2026-11 | Meziantou dates |
| https://www.nuget.org/packages/MinVer/ | NuGet package page | 2026-11 | MinVer dates and prerelease |
| https://www.nuget.org/packages/Microsoft.CodeAnalysis.BannedApiAnalyzers/ | NuGet package page | 2026-07 | 5.6.0 date |
| https://www.nuget.org/packages/IDisposableAnalyzers/ | NuGet package page | 2024-06 | 4.0.8 date |
| https://github.com/SimonCropp/Polyfill/releases | release notes 11.3.0 to 12.0.0 | 2026-09 to 2026-11 | gap and change list |
| https://github.com/SimonCropp/Polyfill (tag 12.0.0, cloned) | source tree grep | 2026-11-21 | gap proof, `PolyArgumentExceptions` |
| https://github.com/meziantou/Meziantou.Analyzer/releases | 45 release bodies 3.0.298 to 3.0.342 | 2026-10-11 to 2026-11-22 | rule changes |
| https://github.com/meziantou/Meziantou.Analyzer (tags 3.0.297, 3.0.342, cloned) | README rule table and docs/Rules/MA0053.md | 2026-11-22 | rule diff and MA0053 options |
| https://github.com/microsoft/vs-threading/releases/tag/v18.12.1 | release notes | 2026-10-26 | Threading changes |
| https://raw.githubusercontent.com/dotnet/sdk/main/src/Microsoft.CodeAnalysis.NetAnalyzers/src/Microsoft.CodeAnalysis.NetAnalyzers/AnalyzerReleases.Unshipped.md | NetAnalyzers new-rules file | 2026-11 | the eight 11.0 rules |
| https://raw.githubusercontent.com/dotnet/sdk/release/11.0.1xx/src/Microsoft.CodeAnalysis.NetAnalyzers/src/Microsoft.CodeAnalysis.NetAnalyzers/AnalyzerReleases.Shipped.md | NetAnalyzers shipped file | 2026-11 | confirms 10.0 section is last |
| https://learn.microsoft.com/en-us/dotnet/core/project-sdk/msbuild-props | AnalysisLevel values | 2026-11 | `11.0-all` form and lock semantics |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/overview | code analysis overview | ms.date 2026-11-12 | CA2267 default, lock guidance |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ (plus ca1878, ca2026 pages) | CA rule index and rule pages | 2026-11-13 to 2026-11-19 | rule existence, enabled-by-default |
| https://raw.githubusercontent.com/adamralph/minver/main/README.md | MinVer README | 2026-11 | AssemblyVersion rule |
| https://github.com/dotnet/dotnet/releases (v11.0.100) | SDK release list | 2026-11-10 | .NET 11 GA date |

Primary sources: the release notes, source trees, NetAnalyzers rule files, the MinVer README and the learn pages, 16 of the 25 rows. Searches were never used as sources.
