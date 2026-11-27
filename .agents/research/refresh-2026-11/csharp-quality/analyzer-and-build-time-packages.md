---
title: Analyzer and build-time package delta, csharp-quality pair
pair: csharp-quality
date_researched: 2026-11-27
window_start: 2026-10-11
model: sonnet
sources_fetched: 14
---

# Analyzer and build-time package delta, 2026-10-11 to 2026-11-27

This is a delta update of the 2026-10-11 research. Each claim at risk is marked unchanged, changed, or could not determine. A plain version bump with no behaviour change is reported as "pin still valid". Posture files (`analyzers.globalconfig`, `analyzers.editorconfig`, `BannedSymbols.txt`) belong to sibling `dotnet-build` and were not researched here.

## Verdict in one paragraph

No sentence in the pair's files is now false. Two packages have a newer stable release than the pinned version (VS.Threading.Analyzers and Meziantou.Analyzer); in both cases the pinned version is still valid because no rule this pair names was added, removed, renamed or had its default changed. Every other pinned package is unchanged on NuGet.

## NuGet version table (as of 2026-11-27)

Source for all rows: NuGet flat-container and registration APIs (`https://api.nuget.org/v3-flatcontainer/<id>/index.json` and `https://api.nuget.org/v3/registration5-gz-semver2/<id>/index.json`).

| Package | Pinned in files | Newest stable 2026-11-27 | Published | Status |
|---|---|---|---|---|
| Microsoft.VisualStudio.Threading.Analyzers | 18.7.23 (published 2026-06-22) | 18.12.1 (NuGet shows 2026-10-12, GitHub release v18.12.1 shows 2026-10-26); servicing 18.7.65 and 18.7.139 on 2026-11-13 | in window | pin still valid |
| IDisposableAnalyzers | 4.0.8 | 4.0.8 (published 2024-06-19) | none | unchanged |
| Microsoft.CodeAnalysis.BannedApiAnalyzers | 5.6.0 | 5.6.0 (2026-07-02) | none | unchanged |
| Microsoft.CodeAnalysis.PublicApiAnalyzers | 5.6.0 | 5.6.0 stable (2026-07-02); 5.11.0-1.26425.128 is a prerelease from 2026-09-08, before the baseline | none in window | unchanged |
| Meziantou.Analyzer | 3.0.297 (2026-10-10) | 3.0.342 (2026-11-22); 45 releases in window | in window | pin still valid |
| MinVer | 8.0.0 (2026-09-05) | 8.0.0; 8.1.0-alpha.1 is a prerelease from 2026-09-29 | none in window | unchanged |
| Microsoft.Extensions.Logging.Abstractions | 8.0.0 (floor), 10.0.0 | 10.0.15 and 11.0.0 GA, both 2026-11-10 | in window | pins still valid (floor and application ranges) |

Note: the NuGet and GitHub dates for VS.Threading.Analyzers 18.12.1 disagree by two weeks (2026-10-12 versus 2026-10-26). Both are after the 2026-10-11 baseline, so the conclusion holds either way.

## Per-claim decisions

### async.md:8-9 (VS.Threading.Analyzers 18.7.23, IDisposableAnalyzers 4.0.8, BannedApiAnalyzers 5.6.0, Meziantou.Analyzer 3.0.297 with MA0004 only)

- VS.Threading.Analyzers: **pin still valid.** Source: https://github.com/microsoft/vs-threading/releases (v18.12.1 notes, read through a page summarizer; the rule metadata is not in the notes). Changes in 18.12.1, none touching a rule ID the files name as an error gate except behaviour narrowing:
  - New analyzers: ThreadStatic correctness (#1646) and redundant async state machines (#1666). Rule IDs are not in the notes. The `async.md` gate list is a fixed list of IDs, so new rules do not enter it unless the posture file adds them.
  - Severity change: "Reduce VSTHRD117 severity for default initializers" (#1658). `VSTHRD117` is not cited anywhere in the pair's files (the files cite VSTHRD002, 003, 011, 100, 101, 103, 105, 110, 114, 200).
  - Behaviour narrowing: VSTHRD103 now excludes non-equivalent async alternatives (#1665); fixes to VSTHRD002, 003, 010, 103, 104 and 200 (the VSTHRD200 fix concerns methods returning `IAsyncEnumerator`). No ID removed or renamed.
  - Residual risk: a row that cites a measured VSTHRD103 finding was measured on 18.7.23; on 18.12.1 it could report fewer sites. Could not determine without a build. Re-measure only if the owner moves the pin.
- IDisposableAnalyzers 4.0.8: **unchanged** (still the newest release).
- BannedApiAnalyzers 5.6.0: **unchanged.**
- Meziantou.Analyzer 3.0.297 (MA0004 only): **pin still valid.** MA0004 received code-fix and reachability fixes in 3.0.334, 3.0.336 and 3.0.339 (all 2026-11-12) and earlier fixes in the 3.0.30x range (await expressions without semicolon, await as an argument). No change to its default or mode. Source: https://github.com/meziantou/Meziantou.Analyzer/releases (pages 1 to 6 read, covering 3.0.283 to 3.0.342).

### processes.md "analyzers 18.7.23" and "BannedApiAnalyzers 5.6.0"; json.md:9 "Meziantou.Analyzer 3.0.297"

Same evidence as above. **Pin still valid** for 18.7.23 and 3.0.297; **unchanged** for BannedApiAnalyzers 5.6.0. api-design.md:8-9 (PublicApiAnalyzers 5.6.0 and Meziantou 3.0.297) likewise: PublicApiAnalyzers has no new stable release, Meziantou is a pin-still-valid bump.

### platform-and-paths.md:60 "RS0030 defaults to a warning on BannedApiAnalyzers 4.14.0 and 5.6.0"

**Unchanged.** The package has no release after 5.6.0, and the analyzer's rule table on `main` still reads RS0030, Enabled True, Severity Warning. Source: https://raw.githubusercontent.com/dotnet/roslyn-analyzers/main/src/Microsoft.CodeAnalysis.BannedApiAnalyzers/Microsoft.CodeAnalysis.BannedApiAnalyzers.md.

### language.md CS-LANG-19 (MA0143), MA0053 and MA0110 references, CS-LANG-07 (RS0016, RS0017, RS0036, RS0037)

- MA0143: **unchanged.** No release note for it in 3.0.298 to 3.0.342 and no change to `MeziantouAnalysisMode` behaviour listed. The claim that MA0143 must be set to `error` at mode `None` is unaffected; no sign of a default change.
- MA0053: **changed in behaviour, no statement false.** 3.0.307 (2026-10-18, PR #1662) made it "not report classes used as generic constraints"; 3.0.333 (2026-11-12) added the CompilationEnd tag to its descriptor (with MA0036, MA0038, MA0041). The api-design.md `CS-API-03` sanctioned `[SuppressMessage(... "MA0053" ...)]` form still applies to unsealed public classes; a class used only as a generic constraint no longer needs it. Verification of the narrowed scope, if wanted: build a public unsealed class referenced only as `where T : Base` with 3.0.297 and 3.0.342 and compare MA0053 counts.
- MA0110: **unchanged as a rule.** Only code-fix and pattern-handling fixes (3.0.30x, and 3.0.334 on partial properties for attributes that cannot apply to properties).
- RS0016, RS0017, RS0036, RS0037: **unchanged.** All four still exist in the PublicApiAnalyzers rule table on `main` (https://raw.githubusercontent.com/dotnet/roslyn-analyzers/main/src/PublicApiAnalyzers/Microsoft.CodeAnalysis.PublicApiAnalyzers.md); no stable package after 5.6.0.

### language.md CS-LANG-03 "IDE0370 ... needs EnforceCodeStyleInBuild and SDK 10 or later"

**Unchanged.** The Learn page for IDE0370 (https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/style-rules/ide0370) was last updated 2026-05-26 and says nothing about a version or build gate either way; the pair's statement rests on its own 2026-10-11 measurement and nothing newer contradicts it. The page lists no options and no default severity change.

### security.md:8 "BannedApiAnalyzers 5.6.0, MinVer 8.0.0"

**Unchanged** for both. MinVer 8.1.0-alpha.1 (2026-09-29) is a prerelease from before the baseline.

### security.md:18 "CA5350, CA5351, CA5379 and SYSLIB0060 fire at 10.0-all"

**Unchanged.** The Learn pages for CA5350 and CA5379 (re-dated 2026-11-13) state "Enabled by default in .NET 10: No" and "in .NET 11: No", which agrees with firing only at the `all` mode. SYSLIB0060 (Rfc2898DeriveBytes constructors obsolete since .NET 10) page last updated 2026-04-24. Sources: https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca5350, .../ca5379, https://learn.microsoft.com/en-us/dotnet/fundamentals/syslib-diagnostics/syslib0060.
Observation, not verified by a build: .NET 11 reached GA on 2026-11-10 (Logging.Abstractions 11.0.0 stable that day), so `latest-all` on an SDK 11 resolves to a different analysis level than `10.0-all`. security.md CS-SEC-01 accepts `latest-all` as an equivalent spelling. Could not determine whether any SDK 11 rule change breaks that equivalence; the pair pins SDK 10.0.401 and `10.0-all`, which is unaffected.

### observability.md:9 and rows (Microsoft.Extensions.Logging.Abstractions 10.0.0 and 8.0.0; SYSLIB1002, 1006, 1012-1015, 1018, 1019, 1025)

- Packages: **pins still valid.** 8.0.0 and 10.0.0 are floors and ranges, not "newest" claims. Newest: 10.0.15 and 11.0.0 (2026-11-10). 9.0.23 and 10.0.13 to 10.0.15 are patch releases.
- Diagnostics: **unchanged.** The dotnet/runtime diagnostics list on `main` (https://raw.githubusercontent.com/dotnet/runtime/main/docs/project/list-of-diagnostics.md) still lists SYSLIB1002, 1006, 1012, 1013, 1014, 1015, 1018, 1019 and 1025 with the same titles the rows rely on. The Learn page for the SYSLIB1001-1999 range returned 404 at the URL tried, so the severity column (the SYSLIB1006 "Info" claim at observability.md:26) was **not re-read**: could not determine; the claim rests on the 2026-10-11 measurement. The list also shows SYSLIB1026 to 1029 (language version, primary-constructor hiding, params, ref struct); whether these were added inside the window could not be determined and none is cited in the pair.

## Normative candidates

None. No rule needs to change or be added on this evidence. Optional low-priority candidate: note in api-design.md `CS-API-03` that MA0053 no longer fires for classes used only as generic constraints (rationale: avoid a needless suppression comment; verification: the two-version build described above).

## Sources fetched

1. https://api.nuget.org/v3-flatcontainer/ (seven package indexes)
2. https://api.nuget.org/v3/registration5-gz-semver2/ (seven registrations, with published dates)
3. https://github.com/microsoft/vs-threading/releases and releases.atom (v18.12.1)
4. https://github.com/meziantou/Meziantou.Analyzer/releases (pages 1 to 6) and releases.atom
5. https://raw.githubusercontent.com/dotnet/roslyn-analyzers/main/src/Microsoft.CodeAnalysis.BannedApiAnalyzers/Microsoft.CodeAnalysis.BannedApiAnalyzers.md
6. https://raw.githubusercontent.com/dotnet/roslyn-analyzers/main/src/PublicApiAnalyzers/Microsoft.CodeAnalysis.PublicApiAnalyzers.md
7. https://raw.githubusercontent.com/dotnet/runtime/main/docs/project/list-of-diagnostics.md
8. Learn pages: IDE0370, SYSLIB0060, CA5350, CA5379

Not fetched: DotNetAnalyzers/IDisposableAnalyzers release notes (NuGet shows no new release), adamralph/minver release notes (no new stable release). The GitHub API was rate limited, so release text came from the HTML pages.
