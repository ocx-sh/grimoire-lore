---
title: .NET release train and support dates, delta 2026-10-11 to 2026-11-27
pair: dotnet-build
date_researched: 2026-11-27
window_start: 2026-10-11
model: sonnet
sources_fetched: 17
---

# .NET release train and support dates, delta 2026-10-11 to 2026-11-27

Scope: a delta update of the claims in `rules/dotnet-build.md` and `skills/dotnet-build-reference/` that bind to SDK, runtime, TFM and support-date facts. All sources were fetched on 2026-11-27. Nothing here comes from memory or search snippets. The only search result used (the .NET 11 GA announcement lookup) was followed by a fetch of the blog post itself.

## Summary

- Item 1, SDK and runtime patches: changed. 10.0 is at runtime 10.0.15 with SDK 10.0.404 (released 2026-11-10); the pair measured 10.0.12 and 10.0.401.
- No 10.0.5xx feature band exists. The 10.0 channel lists only the 4xx band (10.0.404) and the 1xx band (10.0.115) in its two newest releases; the channel index names 10.0.404 as the latest SDK.
- Final 8.0 build is runtime 8.0.34 with SDK 8.0.428 (and 8.0.134); final 9.0 build is runtime 9.0.23 with SDK 9.0.321 (and 9.0.124). Both are marked `eol`.
- .NET 11 GA shipped 2026-11-10 as runtime 11.0.0 with SDK 11.0.100 (the GA SDK string has no prerelease suffix). Visual Studio 18.12.0 carries it.
- Item 2, EOS dates: unchanged. .NET 8 and .NET 9 reached end of support on 2026-11-10, exactly as the rule says.
- Item 3, .NET 11: STS, supported through 2028-11-14. The STS length now in force is two years (24 months).
- Item 4, .NET Framework 4.6.2: unchanged, end date 2027-01-13.
- Item 5, NuGet client: SDK 10.0.400 is documented to carry NuGet 7.9.0; NuGet 8.0.0 is documented to ship in SDK 11.0.100. The NuGet client version inside SDK 10.0.404 could not be determined from any fetched source.
- NuGet 8.0 changes pack behaviour relevant to CS-PKG rows (deterministic timestamps opt-in again; NU5052 for non-standard package IDs under SdkAnalysisLevel 11.0.100).

## Findings

### 1. Current SDK and runtime patches (changed)

Source: [releases-index.json](https://builds.dotnet.microsoft.com/dotnet/release-metadata/releases-index.json), read 2026-11-27; [support policy page](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core), read 2026-11-27.

| Channel | Latest release | Date | Runtime | Latest SDK | Type | Phase | EOL |
|---|---|---|---|---|---|---|---|
| 11.0 | 11.0.0 | 2026-11-10 | 11.0.0 | 11.0.100 | sts | active | 2028-11-14 |
| 10.0 | 10.0.15 | 2026-11-10 | 10.0.15 | 10.0.404 | lts | active | 2028-11-14 |
| 9.0 | 9.0.23 | 2026-11-10 | 9.0.23 | 9.0.321 | sts | eol | 2026-11-10 |
| 8.0 | 8.0.34 | 2026-11-10 | 8.0.34 | 8.0.428 | lts | eol | 2026-11-10 |

Per-channel files, read 2026-11-27 (each file is more than 1 MB; only the first 100000 characters, which hold the newest entries, were read):

- [10.0 releases.json](https://builds.dotnet.microsoft.com/dotnet/release-metadata/10.0/releases.json): 10.0.15 (2026-11-10) lists SDK 10.0.404 (VS 18.11.4) and SDK 10.0.115. The previous release 10.0.14 (2026-10-25) lists SDK 10.0.403 and 10.0.114. No 5xx SDK appears in either entry, and the channel index reports 10.0.404 as the latest SDK. Conclusion: no 10.0.5xx band exists as of 2026-11-27. The older entries beyond the first two were not read, so "never existed" is not proven; "not current" is.
- [8.0 releases.json](https://builds.dotnet.microsoft.com/dotnet/release-metadata/8.0/releases.json): 8.0.34 is the first and latest entry, 2026-11-10, SDKs 8.0.428 and 8.0.134, phase `eol`.
- [9.0 releases.json](https://builds.dotnet.microsoft.com/dotnet/release-metadata/9.0/releases.json): 9.0.23, 2026-11-10, SDKs 9.0.321 and 9.0.124, phase `eol`.
- [11.0 releases.json](https://builds.dotnet.microsoft.com/dotnet/release-metadata/11.0/releases.json): 11.0.0 (2026-11-10), runtime 11.0.0, SDK `11.0.100`, VS 18.12.0, C# 15.0; the earlier entry is 11.0.0-rc.3 (2026-10-25) with SDK `11.0.100-rc.3.26522.148`.
- [11.0.0 release notes](https://github.com/dotnet/core/blob/main/release-notes/11.0/11.0.0/11.0.0.md): lists "11.0 SDKs that include 11.0.0 runtimes: 11.0.100"; 22 CVE entries; no NuGet client version.
- [10.0.15 release notes](https://github.com/dotnet/core/blob/main/release-notes/10.0/10.0.15/10.0.15.md): SDKs 10.0.404 and 10.0.115; 17 CVEs; no NuGet client version. One CVE (CVE-2026-118741, ASP.NET Core Identity scaffolding) needs the SDK or template packages updated, not only the runtime.

Old text in `rules/dotnet-build.md` (intro, line 46): "SDK 10.0.401 ... runtimes 10.0.12 and 8.0.31, SDK 8.0.425 ... SDK 11.0.100-rc.1.26425.128". New facts: 10.0.404 / 10.0.15, 8.0.428 / 8.0.34 (final), and the GA SDK 11.0.100 / 11.0.0. The upstream changes landed 2026-10-25 (10.0.14, 11.0.0-rc.3) and 2026-11-10 (10.0.15, 8.0.34, 9.0.23, 11.0.0).

The pair's binding line describes what was measured on 2026-10-11 with SDK 10.0.401. Those measurements stay valid as history; the version strings are a measurement record, not a policy. The `global.json` examples and CS-BUILD-20/21 do not need a version change unless the maintainers re-measure. A re-measurement against 10.0.404 is the honest way to move the binding line; rewriting the string without re-measuring would claim an unrun measurement.

### 2. NuGet client per SDK

- [NuGet 7.9 release notes](https://learn.microsoft.com/en-us/nuget/release-notes/nuget-7.9), read 2026-11-27: NuGet 7.9.0 is available in VS 18.9.0 and .NET SDK 10.0.400. This confirms the "NuGet 7.9.0" half of the packaging.md binding line for the 10.0.4xx band as of 10.0.400.
- [NuGet 7.10](https://learn.microsoft.com/en-us/nuget/release-notes/nuget-7.10) (ms.date 2026-09-09) and [NuGet 7.11](https://learn.microsoft.com/en-us/nuget/release-notes/nuget-7.11) (ms.date 2026-10-16) are marked Visual Studio-only; SDK column "N/A"; note: "NuGet SDK packages are published quarterly with .NET."
- [NuGet 8.0 release notes](https://learn.microsoft.com/en-us/nuget/release-notes/nuget-8.0) (ms.date 2026-11-06): NuGet 8.0.0 is available in VS 18.12.0 and .NET SDK 11.0.100. Notable for CS-PKG: "Make deterministic package timestamps opt-in again to preserve existing PreserveNewest behavior" ([NuGet/Home#15050](https://github.com/NuGet/Home/issues/15050)); NU5052 for non-standard package IDs when `SdkAnalysisLevel` is `11.0.100` or later ([#14949](https://github.com/NuGet/Home/issues/14949)); the NuGet client libraries drop the net8 target for net10.
- Could not determine: the NuGet client version inside SDK 10.0.404. The 10.0.404 and 10.0.15 release notes and the releases.json entries carry no NuGet field. The NuGet docs map 7.9.0 to 10.0.400 only. Do not write "10.0.404 carries NuGet 7.9.0" without running `dotnet nuget --version` or reading the SDK's `NuGet.Build.Tasks.dll` version on 10.0.404.
- Verification for the maintainers: `dotnet --version` and `dotnet nuget --version` inside a container pinned to the 10.0.404 image, recorded as "measured <date>".

### 3. End of support for .NET 8 and .NET 9 (unchanged)

Source: [support policy page](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core), read 2026-11-27. .NET 9 (STS) and .NET 8 (the page does not print a release type for .NET 8) both show "Out of support", end of support Nov 10, 2026. The releases index agrees (`eol`, 2026-11-10). The date did not move. The rule's sentence ".NET 8 and 9 end support on 2026-11-10" is now past tense. The page also states that end-of-life dates fall on Patch Tuesday and that the final six months of support are security-fix-only maintenance.

### 4. .NET 11 support type and length (changed, from "RC1 probe" to a supported GA)

- Sources: releases-index.json and the support policy page (above); the [Announcing .NET 11 blog post](https://devblogs.microsoft.com/dotnet/?p=61205), dated 2026-11-10, read 2026-11-27; [What's new in .NET 11](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/overview), ms.date 2026-11-10, read 2026-11-27.
- .NET 11 is STS. The blog says: ".NET 11 is a Standard Term Support (STS) release with two years of support"; the post does not print an end date and does not state the SDK version. The support policy page gives the end date: Nov 14, 2028. The releases index agrees (`eol-date` 2028-11-14).
- STS length now in force: the policy page says STS releases get two years: supported for one year after the next release, and releases come every 12 months, which totals two years. The policy page is the only source read for the length; the previous STS length was not compared. The consequence that matters for the rule: .NET 10 (LTS) and .NET 11 (STS) share the same end-of-support date, 2028-11-14. The old argument "net11 is STS so it dies early" no longer distinguishes net10 from net11.
- The 11.0.0 GA SDK string is exactly `11.0.100` (release notes and releases.json). The probe string `11.0.100-rc.1.26425.128` is superseded; the later prerelease was `11.0.100-rc.3.26522.148` (2026-10-25).
- Behaviour changes in the GA relevant to this pair (from the What's new page): C# 15 is the default language version for projects targeting .NET 11 (the CS-BUILD-04 rationale "latest is 14 on SDK 10 and 15 on SDK 11 RC1" stays true; on SDK 11 GA, `latest` is C# 15 per the releases.json `csharp-version`). NativeAOT CLI and the MSBuild server are enabled by default in the 11 SDK. Whether the five new CA rules measured under RC1 (CA1517, CA1876, CA1877, CA2027, CA2028) still fire on GA was not re-measured.

### 5. .NET Framework 4.6.2 end date (unchanged)

Source: [Microsoft .NET Framework lifecycle](https://learn.microsoft.com/en-us/lifecycle/products/microsoft-net-framework), read 2026-11-27 (page last updated 2023-01-25): .NET Framework 4.6.2 end date 1/13/2027. 4.7 through 4.8.1 have no end date. The rule's "net462 ends 2027-01-13" stands; it is now 47 days away from the research date.

## Decisions requested by the commission

1. Current versions: see Finding 1. 10.0: runtime 10.0.15, SDK 10.0.404 (4xx band, current); a 1xx band SDK 10.0.115 also ships; no 5xx band. 8.0 final: 8.0.34 / SDK 8.0.428. 9.0 final: 9.0.23 / SDK 9.0.321. 11 GA SDK: `11.0.100`. NuGet: 7.9.0 documented for 10.0.400 (10.0.404 undetermined); 8.0.0 for 11.0.100.
2. EOS on 2026-11-10: unchanged, happened on the date.
3. .NET 11: STS, two years, ends 2028-11-14.
4. 4.6.2: unchanged, 2027-01-13.
5. See below.
6. See below.

### Item 5: keep `net8.0` in the default list and allow-list?

Recommendation: split the two questions.

- Allow-list (CS-BUILD-02, `tfm-allow`): keep `net8.0`. Verdict: the ban list is about what a library may ship, and net8 still runs on every machine with an old runtime; removing it from the allow-list would make the `tfm-allow` block fail on every existing library that has not yet cut a major release, and CS-BUILD-08 already says the removal path: only after the end-of-support date, and only at a major version (0.x: a minor), because removal fails restore for net8 consumers with NU1202. The end-of-support date has now passed, so a major release may drop net8; no rule forces it to.
- Default list (CS-BUILD-01, "default `net8.0;net10.0`"): change for greenfield. The corpus Verdict 2 named `net10.0` as the probable end state once net8 left support on 2026-11-10, and that condition is now true. Recommended wording: the default for a new library is `net10.0`; an existing library keeps `net8.0;net10.0` until its next major release, then drops `net8.0` (CS-BUILD-08), and a library whose consumers still run net8 keeps it as a recorded decision. If the maintainers prefer a conservative default, keep `net8.0;net10.0` but state that net8 is out of support and removal is allowed at the next major. This is an owner decision (the Severity section lists the floor as an owner default), so flag it as one rather than rewriting it silently.
- Verification: `dotnet msbuild -getProperty:TargetFrameworks` per project (the existing `tfm-allow` effective half); for the default change, a reviewer grep `grep -n 'TargetFrameworks' Directory.Build.props` on new repositories must print `net10.0` only.
- `net9.0` stays banned. Rationale text must change from future to past tense: "net9 ended support on 2026-11-10, the same day as net8; a net9 consumer resolves the `net8.0` asset (or `net10.0` once a library drops net8)".
- Keep the ban on `net11.0`. Recommendation: keep it as the default ban, but drop the STS-lifetime argument if the rule uses it, because net11 and net10 now share the 2028-11-14 end date. The remaining reasons are factual and verifiable: a library that targets `net10.0` is consumable from a net11 app (this pair did not re-measure that on GA; verify with a throwaway net11 consumer referencing a `net10.0` package, expecting restore exit 0), net11 requires the 11 SDK (`rollForward: latestFeature` cannot reach it, CS-BUILD-20), and net11-only APIs add a consumer split with no named consumer class. A library that needs a net11 API lists `net11.0` as a recorded decision under the existing greenfield clause. Revisit when NuGet 8.0's library net8-to-net10 move and SDK 11 rollout have a measured consumer base; no date can be derived from the sources.
- CS-BUILD-08: "Add a new LTS when it ships; remove one only after its end-of-support date" stays correct as written. It names LTS only, so net11 (STS) is not added by it, which is consistent with the net11 ban. No change needed; the text matches the new facts.

### Item 6: which references must be rewritten, which stay history

Must be rewritten (or re-measured first):

- `rules/dotnet-build.md` intro, line 46: the binding versions "10.0.401", "10.0.12", "8.0.31", "8.0.425" and the probe "11.0.100-rc.1.26425.128". Replace with the current builds only after re-measuring; at minimum replace the probe SDK with the GA `11.0.100` and keep the "measured 2026-10-11" date on the claims that were not re-run.
- Line 47: ".NET 8 and 9 end support on 2026-11-10" becomes "ended".
- CS-BUILD-02 rationale: "net9 ends support the same day as net8 (2026-11-10)" becomes "ended". "net462 ends 2027-01-13" stays.
- CS-BUILD-04, 10, 20, 21 mention "SDK 11 RC1" as the SDK that `latest`, floating `AnalysisLevel`, no `global.json` or an invalid `global.json` selects. With GA out, the SDK that an unpinned machine picks is now 11.0.100, not RC1: a machine with the GA SDK installed selects it under `latestMajor`, no `global.json`, or `allowPrerelease: true`. Reword to "SDK 11 (RC1 measured 2026-10-11, GA 11.0.100 released 2026-11-10)" unless re-measured on GA.
- `skills/dotnet-build-reference/packaging.md` intro (lines 8-9): "SDK 10.0.401 with NuGet 7.9.0" and "SDK 8.0.425 and 11.0 RC1 appear only where a row names them". The NuGet part stays true for 10.0.400 per the NuGet docs; for 10.0.404 it is undetermined (Finding 2).
- CS-PKG-05: "11.0 RC1 is still non-identical by default". NuGet 8.0.0 (SDK 11.0.100) makes deterministic package timestamps opt-in again (NuGet/Home#15050), which indicates the GA default may still be non-identical, but the notes do not say what RC1 did, so re-measure on 11.0.100 before rewriting.

Stay as history (dated measurements, do not edit): every "measured 2026-10-11, SDK 10.0.401" row in the CS-PKG and CS-BUILD tables (CS-PKG-01, CS-PKG-06, CS-PKG-16 and similar), the NU1202 removal measurement in CS-BUILD-08, and the "SDK 8.0.425 ignores `SOURCE_DATE_EPOCH`" measurement in CS-PKG-05 (8.0.428 is the final 8 SDK; the claim about 8.0.425 is a dated fact, and 8 is out of support, so no re-measurement is needed).

## Normative guidance candidates

1. Rule: CS-BUILD-01 states the default TFM for a new `[packable-library]` as `net10.0` and keeps `net8.0;net10.0` only for libraries that have not yet had a major release since 2026-11-10 (an owner decision). Rationale: .NET 8 left support on 2026-11-10 and Verdict 2 named net10.0 as the end state. Verification: `grep -n '<TargetFrameworks\?>' Directory.Build.props` on a greenfield repository prints `net10.0` only; a reviewer reads the README for a recorded reason when `net8.0` is present.
2. Rule: CS-BUILD-02 rationale uses past tense for net8 and net9 end of support (ended 2026-11-10) and keeps `net462 ends 2027-01-13`. Rationale: dates were read 2026-11-27 and match the support policy page. Verification: reading heuristic, compare each date in the rationale column against the support policy page and the Microsoft lifecycle page for 4.6.2.
3. Rule: CS-BUILD-02 keeps the ban on `net11.0` and does not justify it by STS length. Rationale: net10 and net11 both end 2028-11-14. Verification: grep the rationale text for "STS" next to net11 (should be absent), and run a throwaway net11 consumer of a `net10.0`-only package; `dotnet restore` exit 0 proves the claim.
4. Rule: the binding line quotes versions only with a "measured <date>" mark, and an SDK version string in the intro changes only together with a re-run of the blocks that cite it. Rationale: 10.0.404 and 11.0.100 exist but were not measured. Verification: grep `measured` count per changed version string in the diff.
5. Rule: wherever a row says "SDK 11 RC1", state whether the row was measured on RC1 or on GA. Rationale: GA 11.0.100 exists since 2026-11-10; RC1 behaviour may not equal GA behaviour. Verification: `grep -n 'RC1' rules/dotnet-build.md skills/dotnet-build-reference/*.md` lists every site; each must carry a date or be re-measured.

## AI-agent angle

- An agent trained before November 2026 treats .NET 8 as supported LTS and .NET 9 as supported STS, and may recommend `net8.0;net9.0`. Check: `grep -nE 'net9\.0' **/*.props **/*.csproj` (the existing `tfm-allow` block catches it).
- An agent assumes SDK 11 is a preview. On a machine with the GA SDK and no `global.json`, `dotnet --version` prints `11.0.100`; check with the `sdk-assert` block.
- An agent may invent a 10.0.5xx band or write "SDK 10.0.500". Check: compare against the `latest-sdk` field of releases-index.json.
- An agent may write a different STS length. The policy page says two years. Check: reading heuristic against the support policy page.

## Contested / evolving

- Whether to drop `net8.0` from defaults now or at each library's next major: trending toward dropping at the next major, as of 2026-11-27. The sources give the permission (end of support passed) but not the policy.
- Whether `net11.0` should be allowed for libraries: no source argues for it; the argument against rests on a consumer-compatibility measurement this pair has not run on GA.
- NuGet 8.0 shipping with SDK 11.0.100, while NuGet 7.10 and 7.11 are VS-only: the SDK-to-NuGet map for 10.0.4xx patch builds is not published in any source read.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://builds.dotnet.microsoft.com/dotnet/release-metadata/releases-index.json | Channel index (primary) | read 2026-11-27 | Latest SDK, runtime, EOL per channel |
| https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core | Support policy (primary) | read 2026-11-27 | EOS dates, STS length |
| https://builds.dotnet.microsoft.com/dotnet/release-metadata/10.0/releases.json | 10.0 release metadata (primary) | read 2026-11-27 | 10.0.15, SDK bands |
| https://builds.dotnet.microsoft.com/dotnet/release-metadata/11.0/releases.json | 11.0 release metadata (primary) | read 2026-11-27 | GA SDK string, rc.3 |
| https://builds.dotnet.microsoft.com/dotnet/release-metadata/8.0/releases.json | 8.0 release metadata (primary) | read 2026-11-27 | Final 8.0.34 |
| https://builds.dotnet.microsoft.com/dotnet/release-metadata/9.0/releases.json | 9.0 release metadata (primary) | read 2026-11-27 | Final 9.0.23 |
| https://github.com/dotnet/core/blob/main/release-notes/11.0/11.0.0/11.0.0.md | 11.0.0 release notes (primary) | 2026-11-10 | GA SDK, CVEs |
| https://github.com/dotnet/core/blob/main/release-notes/10.0/10.0.15/10.0.15.md | 10.0.15 release notes (primary) | 2026-11-10 | SDK 10.0.404, CVEs |
| https://github.com/dotnet/core/blob/main/release-notes/11.0/supported-os.md | 11.0 supported OS (primary) | read 2026-11-27 | Labels 11.0 STS |
| https://devblogs.microsoft.com/dotnet/?p=61205 | Announcing .NET 11 (primary) | 2026-11-10 | STS, two years |
| https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/overview | What's new in .NET 11 (primary) | 2026-11-10 | C# 15 default, SDK changes |
| https://learn.microsoft.com/en-us/lifecycle/products/microsoft-net-framework | .NET Framework lifecycle (primary) | page dated 2023-01-25, read 2026-11-27 | 4.6.2 ends 1/13/2027 |
| https://learn.microsoft.com/en-us/nuget/release-notes/nuget-7.9 | NuGet 7.9 notes (primary) | 2026-07-31 | 7.9.0 in SDK 10.0.400 |
| https://learn.microsoft.com/en-us/nuget/release-notes/nuget-7.10 | NuGet 7.10 notes (primary) | 2026-09-09 | VS-only |
| https://learn.microsoft.com/en-us/nuget/release-notes/nuget-7.11 | NuGet 7.11 notes (primary) | 2026-10-16 | VS-only |
| https://learn.microsoft.com/en-us/nuget/release-notes/nuget-8.0 | NuGet 8.0 notes (primary) | 2026-11-06 | 8.0.0 in SDK 11.0.100, pack changes |
| https://learn.microsoft.com/en-us/nuget/release-notes/ | NuGet release index | updated 2026-11-11 | Version list |

Limits: the per-channel releases.json files were read only to the first 100000 characters; the NuGet client version inside SDK 10.0.404 and any GA re-measurement of the pair's RC1-based rows are undetermined.
