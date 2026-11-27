---
title: NuGet client (restore, audit, pack) delta, 2026-10-11 to 2026-11-27
pair: dotnet-build
date_researched: 2026-11-27
window_start: 2026-10-11
model: sonnet
sources_fetched: 27
---

# NuGet client restore, audit and pack: delta for the dotnet-build pair

Scope: this is a delta against the rows measured on 2026-10-11 (SDK 10.0.401, SDK 8.0.425, SDK 11.0 RC1). It covers only what the NuGet client shipped with the .NET SDK changed in the window. Nothing was measured on a machine; every statement below comes from a page, a release note or a source file that was fetched on 2026-11-27. Where a source could not settle a question, the claim is marked "could not determine" and gets a re-measure fixture.

## Summary

- .NET 11 GA and SDK 11.0.100 shipped on 2026-11-10 with NuGet 8.0.0. Source: [NuGet 8.0 release notes](https://learn.microsoft.com/en-us/nuget/release-notes/nuget-8.0), [.NET 11 download page](https://dotnet.microsoft.com/en-us/download/dotnet/11.0). The same day shipped SDK 10.0.404 (also 10.0.403 on 2026-10-25 and 10.0.402 on 2026-10-13), per the [.NET 10 download page](https://dotnet.microsoft.com/en-us/download/dotnet/10.0).
- NuGet 7.10 and 7.11 are Visual Studio only; the SDK takes NuGet quarterly, so 8.0.0 is the only NuGet release in the window that reaches the CLI.
- The one change that touches a measured row is deterministic pack. CS-PKG-05 is CHANGED: SDK 11 GA does not make `SOURCE_DATE_EPOCH` unnecessary, it makes `SOURCE_DATE_EPOCH` useless for `dotnet pack`. Pack timestamps are opt-in again, and the NuGet code that read `SOURCE_DATE_EPOCH` automatically was removed.
- SDK 11 GA does not change the default audit mode. `NuGetAuditMode` is still `all` only when a target framework is net10.0 or higher, and `direct` for a net8-only project. No 8.0 note touches audit.
- Every other claim at risk is unchanged by absence: no 7.10, 7.11 or 8.0 entry names the property, code or behaviour, and every reference page read has an `updated_at` before the window.
- Two doc pages are now wrong and must not be used as a source: [Create Deterministic NuGet packages](https://learn.microsoft.com/en-us/nuget/create-packages/deterministic-packages) and the Deterministic rows of [NuGet pack and restore as MSBuild targets](https://learn.microsoft.com/en-us/nuget/reference/msbuild-targets) still say deterministic pack is the default in .NET 11 and that `SOURCE_DATE_EPOCH` is used automatically. Both were last updated 2026-07-20, before the reversal.
- New in 8.0 and worth a row or a note: NU5052 (non-standard package IDs warn on pack when `SdkAnalysisLevel` is 11.0.100 or later) and NU1020 (restore fails on a floating version when a source sets a nonzero minimum publish age).

## Findings

### 1. What shipped in the window

| Date | Item | Source |
| --- | --- | --- |
| 2026-10-13 | SDK 10.0.402 | [.NET 10 download](https://dotnet.microsoft.com/en-us/download/dotnet/10.0) |
| 2026-10-16 | NuGet 7.11 notes dated; VS 18.11 only, "N/A" for SDK | [NuGet 7.11](https://learn.microsoft.com/en-us/nuget/release-notes/nuget-7.11) |
| 2026-10-25 | SDK 10.0.403, 11.0.0-rc.3 | [.NET 10 download](https://dotnet.microsoft.com/en-us/download/dotnet/10.0), [.NET 11 download](https://dotnet.microsoft.com/en-us/download/dotnet/11.0) |
| 2026-11-06 | NuGet 8.0 notes dated; 8.0.0 ships in SDK 11.0.100 and VS 18.12 | [NuGet 8.0](https://learn.microsoft.com/en-us/nuget/release-notes/nuget-8.0) |
| 2026-11-10 | .NET 11 GA, SDK 11.0.100; SDK 10.0.404 | [.NET 11 download](https://dotnet.microsoft.com/en-us/download/dotnet/11.0) |

NuGet 7.10 is dated 2026-09-09, before the window, and is also VS only ([NuGet 7.10](https://learn.microsoft.com/en-us/nuget/release-notes/nuget-7.10)). Its entries still reach the SDK through 8.0 and matter here: "NuGet is restoring packages from feeds that are not configured" ([NuGet/Home#14974](https://github.com/NuGet/Home/issues/14974)) and "`dotnet restore` reads .sha512/.nupkg.metadata for ALL cached versions of a package during version resolution" ([NuGet/Home#14963](https://github.com/NuGet/Home/issues/14963)). Neither entry says what the old or new behaviour is, so the effect on CS-BUILD-27 is "could not determine".

The NuGet.Client GitHub releases page returned only 2016-era VS 2015 entries, so it added nothing.

### 2. Deterministic pack: the default was reversed

Timeline, all from primary issue and PR pages:

1. NuGet 7.9.0 (SDK 10.0.400) re-enabled deterministic pack: "Revisit deterministic pack" ([NuGet 7.9 notes](https://learn.microsoft.com/en-us/nuget/release-notes/nuget-7.9), [NuGet/Home#8601](https://github.com/NuGet/Home/issues/8601)). In that state `DeterministicTimestamp` unset stamped every package entry with the current pack time, and `SOURCE_DATE_EPOCH` was honoured automatically.
2. Reporters found that this breaks `CopyToOutputDirectory="PreserveNewest"` downstream, with version downgrades of `msvcp140.dll`, `vcruntime140.dll` and `olc.dll`: [NuGet/Home#15050](https://github.com/NuGet/Home/issues/15050). The reporter's SDK pair: 10.0.302 had NuGet.Build.Tasks.Pack 7.6.0-rc, 10.0.400 had 7.9.0-rc.
3. 2026-08-27: [NuGet.Client#7652](https://github.com/NuGet/NuGet.Client/pull/7652) "Deterministic pack should be opt-in (disabled by default)" merged into `dev`. Its commit list ([commits](https://github.com/NuGet/NuGet.Client/pull/7652/commits)) ends with "Make deterministic pack opt-in" and "Don't use SOURCE_DATE_EPOCH automatically". The stated reason for the second: the dotnet VMR build sets `SOURCE_DATE_EPOCH` and "it's causing problems there".
4. 2026-08-28: [NuGet.Client#7661](https://github.com/NuGet/NuGet.Client/pull/7661) cherry-picked it onto `release/7.9.x`, "which will become part of .NET 10.0.4xx SDK".
5. 2026-11-06 / 2026-11-10: NuGet 8.0.0 lists "Make deterministic package timestamps opt-in again to preserve existing `PreserveNewest` behavior" ([NuGet/Home#15050](https://github.com/NuGet/Home/issues/15050)) and ships in SDK 11.0.100.

Current code, fetched from the `dev` and `release/7.9.x` branches:

- `NuGet.Build.Tasks.Pack.targets` sets `<DeterministicTimestamp Condition="'$(DeterministicTimestamp)' == ''">false</DeterministicTimestamp>` and contains no mention of `SOURCE_DATE_EPOCH` ([dev](https://raw.githubusercontent.com/NuGet/NuGet.Client/dev/src/NuGet.Core/NuGet.Build.Tasks/NuGet.Build.Tasks.Pack.targets), [release/7.9.x](https://raw.githubusercontent.com/NuGet/NuGet.Client/release/7.9.x/src/NuGet.Core/NuGet.Build.Tasks/NuGet.Build.Tasks.Pack.targets)).
- `PackTask.cs`, `PackTaskLogic.cs` and `PackageBuilder.cs` on `dev` contain no `SOURCE_DATE_EPOCH` or environment-variable read ([PackageBuilder.cs](https://raw.githubusercontent.com/NuGet/NuGet.Client/dev/src/NuGet.Core/NuGet.Packaging/PackageCreation/Authoring/PackageBuilder.cs)). The summariser that read these files may have missed a line, so treat "no read" as strong but not proven until the fixture below is run.
- `PackageBuilder` parses `DeterministicTimestamp` as: empty or `true` means `DateTimeOffset.UtcNow`; `false` turns deterministic stamping off; an integer is Unix seconds; otherwise three RFC 3339 formats; anything else fails with NU5502.

What this means for the pair:

- Old claim, CS-PKG-05: "Pack releases as `SOURCE_DATE_EPOCH=$(git log -1 --format=%ct) dotnet pack ...` on SDK 10.0.401 or newer ... SDK 8.0.425 ignores `SOURCE_DATE_EPOCH`, and 11.0 RC1 is still non-identical by default (measured 2026-10-11)."
- New fact: on any SDK whose NuGet carries #7652 (SDK 11.0.100 for certain; some 10.0.4xx patch after 10.0.401 per #7661), `SOURCE_DATE_EPOCH` no longer reaches the nupkg and the default is "keep each file's own modification time". A byte-identical pack needs `-p:DeterministicTimestamp=<unix seconds>` explicitly. That form works on both sides of the change because an explicit property always wins and the property exists from NuGet 7.9.0 ([msbuild-targets page](https://learn.microsoft.com/en-us/nuget/reference/msbuild-targets)).
- The 2026-10-11 measurement (SDK 10.0.401, `SOURCE_DATE_EPOCH` gives `EQUAL`) is consistent with 10.0.401 predating the backport. Which patch first carries it (10.0.402, 10.0.403 or 10.0.404) could not be determined: the dotnet/sdk releases page lists no NuGet notes for any of them ([dotnet/sdk releases](https://github.com/dotnet/sdk/releases)), and the NuGet.Build.Tasks.Pack versions on nuget.org returned no 7.9 or 8.0 entries.
- Date of the upstream change: 2026-08-27 (merged), 2026-08-28 (7.9.x backport). Both are before the window; the window event is that the change reached GA in 8.0.0 and SDK 11.0.100 on 2026-11-10, and that the 11.0 RC1 observation in the row is superseded.
- NuGet maintainers said "we can revisit different defaults in a future release" and akoeplinger argued `SOURCE_DATE_EPOCH` "should actually be enough signal to opt-in too" ([PR 7652](https://github.com/NuGet/NuGet.Client/pull/7652)). Not decided; treat as trending, not as a default.

Separate feature, not to be confused: container publish does honour `SOURCE_DATE_EPOCH` on .NET 11 ([What's new in the SDK for .NET 11](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/sdk), "Reproducible container publishing"). That is not `dotnet pack`.

### 3. Audit (CS-BUILD-26)

- [Auditing package dependencies](https://learn.microsoft.com/en-us/nuget/concepts/auditing-packages) (`ms.date` 2025-10-01, `updated_at` 2026-07-07, so before the window): "`NuGetAuditMode` defaults to `all` when a project targets `net10.0` or higher. Otherwise `NuGetAuditMode` defaults to `direct`. When a project multi-targets, if any one target framework selects `all`, then audit will use this value for all target frameworks." Feature table stops at NuGet 7.0 / .NET 10 SDK. No NuGet 8.0 row.
- The same page still says `RestoreProjectCount`, `RestoreSkippedCount` and `RestoreProjectsAuditedCount` arrived in "NuGet in MSBuild 17.13 and .NET 9.0.200" and "are not available with static graph restore". Unchanged.
- `NuGetAuditSuppress` (6.11, SDK 8.0.400), `auditSources` (6.12, SDK 9.0.100), NU1900 to NU1905 meanings: unchanged on the same page. Note that 7.9 (before the window, already in SDK 10.0.400) added "Restore will start checking audit sources are secure HTTPS" ([NuGet/Home#14962](https://github.com/NuGet/Home/issues/14962)); an `http://` audit source is therefore a real risk, but the entry gives no warning code, so no row text changes.
- 8.0 adds audit-related VS UI items only (vulnerability indicators, audit-source data in the version list) and no restore-time audit change.

Verdict: unchanged. A net8-only project is still `direct`; SDK 11 GA does not change that.

### 4. Source mapping, lock files, central package management, pruning

- [Package Source Mapping](https://learn.microsoft.com/en-us/nuget/consume-packages/package-source-mapping) (`updated_at` 2026-08-03): the global-packages note "When the requested package already exists in the global packages folder, no source look-up will happen and the mappings will be ignored" is intact. That is the cold-cache fail-closed fact in CS-BUILD-27. Unchanged. Open risk: #14974 and #14963 above (7.10) touch cache and unconfigured feeds with no stated behaviour; re-measure.
- [PackageReference in project files](https://learn.microsoft.com/en-us/nuget/consume-packages/package-references-in-project-files) (`updated_at` 2026-08-15): locked mode, `--locked-mode`, lock file pruning awareness, and the PrunePackageReference section are unchanged. `dotnet build --locked-mode` (MSB1001), NU1403 and NU1004 are not named on any page read. NuGet 7.9 (before the window) lists "RestoreLockedMode=true & RestoreForceEvaluate=true should error" ([NuGet/Home#8222](https://github.com/NuGet/Home/issues/8222)); it does not touch "locked mode with no lock file passes and creates one".
- [NU1510](https://learn.microsoft.com/en-us/nuget/reference/errors-and-warnings/nu1510) (`updated_at` 2026-06-11): raised only when the direct `PackageReference` "can be completely removed" and, per the pruning page, "the project targets .NET 10". The "condition at or below the in-box version still raises NU1510" claim is consistent with the example that conditions per TFM each raise it. Unchanged. `RestoreEnablePackagePruning` text unchanged.
- [Central Package Management](https://learn.microsoft.com/en-us/nuget/consume-packages/central-package-management) (`updated_at` 2026-03-03): the transitive-pinning-promotes-dependencies-in-the-nuspec statement is intact. Unchanged. NU1008 and NU1504 are not named; no change evidence.

### 5. Pack, symbols, validation, signing

- CS-PKG-04: the [msbuild-targets page](https://learn.microsoft.com/en-us/nuget/reference/msbuild-targets) still says `SymbolPackageFormat` "default is `symbols.nupkg`". Unchanged.
- CS-PKG-02: `DeterministicTimestamp=true` is the wall clock. Confirmed by the `PackageBuilder` parse above. NU5125, NU5048 and bundled SourceLink providers: no mention in 7.10, 7.11 or 8.0. NU5048 text on the msbuild-targets page unchanged. Unchanged.
- CS-PKG-01 and CS-PKG-16 (NU5039, NU5046, NU5030, NU5026, "pack exits 0 on an anonymous, unlicensed package"): not named in any note in the window. 8.0 adds only the NU5052 package-ID warning and "Improve pack output filename calculation when nuspec metadata overrides the package ID or version" ([NuGet/Home#14711](https://github.com/NuGet/Home/issues/14711)). Unchanged, with the NU5052 addition below.
- CS-PKG-09: [Package validation overview](https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/package-validation/overview) (`updated_at` 2025-08-21) is unchanged, and the .NET 11 SDK "what's new" page lists no package validation change. CP0002, NU1102 on an unpublished baseline and "writes the nupkg even when validation fails" could not be checked against the dotnet/sdk source; no change evidence. Unchanged.
- CS-PKG-13: [NU3043](https://learn.microsoft.com/en-us/nuget/reference/errors-and-warnings/nu3043) (`updated_at` 2025-08-26): "This warning is promoted to an error in the .NET 10 SDK". Unchanged; SDK 11 not stated but not reduced.
- .NET 11 SDK adds NETSDK1235 (custom `.nuspec` with `PackAsTool`) as a warning ([What's new](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/sdk)). Not a measured row; relevant only to tool packages.

## Per-claim verdicts

| Claim | Verdict | Fact and source |
| --- | --- | --- |
| CS-BUILD-26 `direct` default without a net10+ TFM | unchanged | Audit doc, `updated_at` 2026-07-07; no 8.0 audit change. |
| CS-BUILD-26 audited-count needs NuGet 9.0.200, absent under static-graph restore | unchanged | Same page. |
| CS-BUILD-26 `NuGetAuditSuppress`, `auditSources`, NU1900-NU1905 | unchanged | Same page. |
| CS-BUILD-27 source mapping fail-closed only on a cold cache | unchanged, re-measure | Doc note intact; 7.10 items #14974 and #14963 unexplained. |
| CS-BUILD-27 `dotnet build` rejects `--locked-mode` (MSB1001), NU1403 | unchanged | Not mentioned anywhere in the window. |
| CS-BUILD-28 NU1510, condition at or below in-box still raises, `RestoreEnablePackagePruning` | unchanged | NU1510 page `updated_at` 2026-06-11. |
| CS-BUILD-23, 24, 25: NU1008, NU1504, transitive-pinning nuspec leak, locked mode with no lock file, NU1004 | unchanged | CPM and lock-file pages predate the window. |
| CS-PKG-05 `SOURCE_DATE_EPOCH` on 10.0.401+; "11.0 RC1 still non-identical by default" | CHANGED | See finding 2. Old text: "SOURCE_DATE_EPOCH=$(git log -1 --format=%ct) dotnet pack ... on SDK 10.0.401 or newer". New fact: pack timestamps are opt-in and `SOURCE_DATE_EPOCH` is not read on SDK 11.0.100 (NuGet 8.0.0) and on the 10.0.4xx patch that took [#7661](https://github.com/NuGet/NuGet.Client/pull/7661); use `-p:DeterministicTimestamp=$(git log -1 --format=%ct)`. Changed upstream 2026-08-27, reached GA 2026-11-10. |
| CS-PKG-05 "SDK 8.0.425 ignores `SOURCE_DATE_EPOCH`" | unchanged | Property never existed there. |
| CS-PKG-05 open question: re-measure defaults at GA | answered from source, confirm by measurement | Default `DeterministicTimestamp` is `false` in the targets file; fixture below. |
| CS-PKG-02 `DeterministicTimestamp=true` is the wall clock | unchanged | `PackageBuilder` parse. |
| CS-PKG-02 NU5125, NU5048, bundled SourceLink | unchanged | No note in the window. |
| CS-PKG-01, 16 NU5039, NU5046, NU5030, NU5026, exits 0 unlicensed | unchanged | No note in the window. |
| CS-PKG-04 default `.symbols.nupkg` | unchanged | msbuild-targets page. |
| CS-PKG-09 package validation | could not determine from dotnet/sdk source; no change evidence | Overview page predates the window. |
| CS-PKG-13 SHA-1 is NU3043 error on SDK 10 | unchanged | NU3043 page. |

## Re-measure on SDK 11.0.100 and 10.0.404

Fixture A (settles CS-PKG-05): a one-project library `net8.0;net10.0`, version `0.0.1`, `GITHUB_ACTIONS=true`. Clone it twice into different directories, wait 2 seconds between packs, and pack with `-c Release -o artifacts` on SDK 10.0.401, 10.0.404 and 11.0.100 in four modes: (1) no variable, (2) `SOURCE_DATE_EPOCH=$(git log -1 --format=%ct)`, (3) `-p:DeterministicTimestamp=$(git log -1 --format=%ct)`, (4) both. Record `EQUAL` or not for the nupkg and the snupkg per cell. Expected from source: mode 1 differs everywhere; mode 2 equal only on 10.0.401; modes 3 and 4 equal everywhere. If mode 2 is equal on 11.0.100, finding 2 is wrong and the `PackageBuilder` read missed a line.

Fixture B (settles the 7.10 unknowns for CS-BUILD-27): a repo with a root `nuget.config` that clears sources and maps `*` to one source, restore once into a populated `NUGET_PACKAGES`, then remove the source mapping entry for one package and restore again; run on 10.0.401 and 11.0.100. Confirm a populated cache still skips source lookup and a cold cache fails.

Fixture C (audit default): a net8.0-only and a net10.0-only project; `dotnet msbuild -getProperty:NuGetAuditMode` on 11.0.100 with the property unset. Expected `direct` and `all`.

## Normative guidance candidates

1. Rule: in CS-PKG-05, pass the timestamp as a property, `dotnet pack -p:DeterministicTimestamp=$(git log -1 --format=%ct)`, and treat `SOURCE_DATE_EPOCH` alone as insufficient. Rationale: since NuGet 8.0.0 (and the backported 7.9.x) pack ignores the variable and the default is no determinism; the property form is correct on every SDK from 10.0.400 on. Verification: block `repro` prints `EQUAL` for modes 3 and 4 of fixture A on 10.0.401, 10.0.404 and 11.0.100; a grep that finds `SOURCE_DATE_EPOCH` in a pack step with no `DeterministicTimestamp=` on the same command fails the rule.
2. Rule: never set `DeterministicTimestamp=true` or leave it empty for a release pack (wall clock). Rationale: `PackageBuilder` maps both to `UtcNow`. Verification: `git grep -nE 'DeterministicTimestamp>?\s*=?\s*"?true' -- '*.props' '*.csproj' '*.targets'` prints nothing (already part of CS-PKG-02's `config-bans`).
3. Rule: do not cite the Microsoft Learn deterministic-packages page or the `Deterministic` rows of the msbuild-targets page as evidence for "deterministic by default in .NET 11". Rationale: both predate the reversal (updated 2026-07-20) and contradict the NuGet 8.0 notes and the source. Verification: reading heuristic in review: any claim of "default on in .NET 11" must cite NuGet 8.0 notes or a measurement, not those pages.
4. Candidate (optional, unverified): add NU5052 to the hard-gate warning list `-p:WarningsAsErrors=NU5124%3BNU5125%3BNU5048` for SDK 11 packs. Rationale: 8.0 raises NU5052 for non-standard package IDs when `SdkAnalysisLevel` is 11.0.100 or later. Verification: `dotnet pack` on a fixture with `<PackageId>Müller.Package</PackageId>` prints `NU5052` on 11.0.100 and not on 10.0.404; not run.

## AI-agent angle

- An agent trained before August 2026 writes `SOURCE_DATE_EPOCH=... dotnet pack` and believes it is reproducible. It compiles and runs, and the nupkg differs per clone. Smallest check: the `repro` block (two clones, compare bytes).
- An agent reads the Learn page and concludes ".NET 11 packs are deterministic by default, delete the CI timestamp step". Smallest check: fixture A mode 1 on 11.0.100.
- An agent sets `DeterministicTimestamp=true` to "turn determinism on". It stamps the wall clock. Smallest check: grep in candidate 2.
- An agent concludes SDK 11 raises the audit default for every project. It does not; only net10.0+ targets get `all`. Smallest check: fixture C.

## Contested / evolving

- Default of deterministic pack: opt-in as of NuGet 8.0.0 (2026-11-10); maintainers said a future default is possible ([#15050](https://github.com/NuGet/Home/issues/15050), [#7652](https://github.com/NuGet/NuGet.Client/pull/7652)). Re-check at the next NuGet release (7.12 or 8.1).
- Whether `SOURCE_DATE_EPOCH` returns as an opt-in signal: argued in the PR, not decided.
- The first 10.0.4xx patch that includes the backport: not determined.

## Sources

| URL | What it is | Date | Why read |
| --- | --- | --- | --- |
| https://learn.microsoft.com/en-us/nuget/release-notes/ | Release notes index (primary) | updated 2026-11-11 | Lists 7.10, 7.11, 8.0 |
| https://learn.microsoft.com/en-us/nuget/release-notes/nuget-8.0 | NuGet 8.0 notes (primary) | 2026-11-06 | SDK 11.0.100 mapping, opt-in timestamps, NU5052, NU1020 |
| https://learn.microsoft.com/en-us/nuget/release-notes/nuget-7.11 | NuGet 7.11 notes (primary) | 2026-10-16 | VS only |
| https://learn.microsoft.com/en-us/nuget/release-notes/nuget-7.10 | NuGet 7.10 notes (primary) | 2026-09-09 | #14974, #14963 |
| https://learn.microsoft.com/en-us/nuget/release-notes/nuget-7.9 | NuGet 7.9 notes (primary) | 2026-07-31 | Deterministic pack, SDK 10.0.400 |
| https://learn.microsoft.com/en-us/nuget/release-notes/known-issues | Known issues (primary) | 2024 content | Nothing relevant |
| https://github.com/NuGet/Home/issues/15050 | Opt-in decision issue (primary) | 2026-08 | Reason and plan |
| https://github.com/NuGet/NuGet.Client/pull/7652 | Opt-in PR (primary) | 2026-08-27 | SOURCE_DATE_EPOCH removal |
| https://github.com/NuGet/NuGet.Client/pull/7652/commits | PR commit list (primary) | 2026-08-27 | Commit titles |
| https://github.com/NuGet/NuGet.Client/pull/7661 | Backport to 7.9.x (primary) | 2026-08-28 | 10.0.4xx |
| https://github.com/NuGet/Home/issues/8601 | Deterministic pack tracking (primary) | 2026-05 | History |
| https://raw.githubusercontent.com/NuGet/NuGet.Client/dev/src/NuGet.Core/NuGet.Build.Tasks/NuGet.Build.Tasks.Pack.targets | Pack targets on dev (primary) | 2026-11-27 read | Default false |
| https://raw.githubusercontent.com/NuGet/NuGet.Client/release/7.9.x/src/NuGet.Core/NuGet.Build.Tasks/NuGet.Build.Tasks.Pack.targets | Pack targets on 7.9.x (primary) | 2026-11-27 read | Backport content |
| https://raw.githubusercontent.com/NuGet/NuGet.Client/dev/src/NuGet.Core/NuGet.Packaging/PackageCreation/Authoring/PackageBuilder.cs | Timestamp parsing (primary) | 2026-11-27 read | true means UtcNow |
| https://raw.githubusercontent.com/NuGet/NuGet.Client/dev/src/NuGet.Core/NuGet.Build.Tasks.Pack/PackTask.cs | Pack task (primary) | 2026-11-27 read | No env read |
| https://raw.githubusercontent.com/NuGet/NuGet.Client/dev/src/NuGet.Core/NuGet.Build.Tasks.Pack/PackTaskLogic.cs | Pack logic (primary) | 2026-11-27 read | No env read |
| https://dotnet.microsoft.com/en-us/download/dotnet/11.0 | .NET 11 downloads (primary) | GA 2026-11-10 | GA date, SDK 11.0.100 |
| https://dotnet.microsoft.com/en-us/download/dotnet/10.0 | .NET 10 downloads (primary) | 2026-11-10 | SDK 10.0.402 to 10.0.404 |
| https://github.com/dotnet/sdk/releases | SDK releases (primary) | 2026-11 | No NuGet notes |
| https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/sdk | .NET 11 SDK what's new (primary) | 2026-11-10 | NETSDK1235, container SOURCE_DATE_EPOCH |
| https://learn.microsoft.com/en-us/nuget/concepts/auditing-packages | Audit doc (primary) | updated 2026-07-07 | Mode default |
| https://learn.microsoft.com/en-us/nuget/reference/errors-and-warnings/nu1510 | NU1510 (primary) | updated 2026-06-11 | Pruning |
| https://learn.microsoft.com/en-us/nuget/reference/msbuild-targets | Pack and restore targets (primary) | updated 2026-07-20 | Stale Deterministic rows, symbol default |
| https://learn.microsoft.com/en-us/nuget/consume-packages/package-source-mapping | Source mapping (primary) | updated 2026-08-03 | Cache note |
| https://learn.microsoft.com/en-us/nuget/consume-packages/package-references-in-project-files | PackageReference, lock files, pruning (primary) | updated 2026-08-15 | Locked mode |
| https://learn.microsoft.com/en-us/nuget/consume-packages/central-package-management | CPM (primary) | updated 2026-03-03 | Pinning leak |
| https://learn.microsoft.com/en-us/nuget/reference/errors-and-warnings/nu5052 | NU5052 (primary) | 2026-07-20 | New pack warning |
| https://learn.microsoft.com/en-us/nuget/reference/errors-and-warnings/nu3043 | NU3043 (primary) | updated 2025-08-26 | SHA-1 |
| https://learn.microsoft.com/en-us/nuget/create-packages/deterministic-packages | Deterministic packages guide (stale) | updated 2026-07-20 | Contradicted by source |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/package-validation/overview | Package validation (primary) | updated 2025-08-21 | No change |

Failed or empty: NuGet.Client releases page (old tags only), `raw.githubusercontent.com/dotnet/core` 10.0.402 and 10.0.404 notes (404), `learn.microsoft.com/dotnet/core/compatibility/11.0` (404), nuget.org flat container for NuGet.Build.Tasks.Pack (no 7.9 or 8.0 entries), GitHub code search and API (rate limited or login required).
