---
title: .NET build, restore, analyzer and NuGet packaging shifts the pair does not mention, delta 2026-10-11 to 2026-11-27
pair: dotnet-build
date_researched: 2026-11-27
window_start: 2026-10-11
model: sonnet
sources_fetched: 22
---

# Shifts the pair does not mention, delta 2026-10-11 to 2026-11-27

Scope: a delta on `rules/dotnet-build.md` and `skills/dotnet-build-reference/`, baseline 2026-10-10/11 (the pair was measured on SDK 10.0.401 and 11.0.100-rc.1). Every source below was fetched on 2026-11-27; nothing is from memory. Search was used once, only to find the URL of the staged-publishing post, which was then fetched. Release-train facts (SDK 11.0.100 GA on 2026-11-10, NuGet 8.0.0) live in the sibling file `release-train-and-support-dates.md` and are not repeated, except where they decide a verdict.

## Summary

- Result: 8 items. 2 amend a row (CS-BUILD-27, CS-PKG-01), 1 amends by re-measurement only (CS-PKG-05), 5 need no action. No new row is warranted.
- No deprecation of `.sln`, `snupkg`, `dotnet format` as a tool path, `PublicApiAnalyzers`, `BannedApiAnalyzers` or MinVer was found in any fetched source. The .NET 11 announcement post states it does not cover them. Status: unchanged, absence of evidence only.
- No new default warnings-as-errors, no new default analyzers, and no changed default for `Nullable` or `GenerateDocumentationFile` appear in the SDK 11 what's-new page (updated 2026-11-17) or the .NET 11 breaking-change index (updated 2026-11-23).
- No nupkg attestation or SBOM feature for `dotnet pack` or nuget.org was found in the SDK page, the NuGet 8.0 notes, or the NuGet blog index for the window.
- Could not determine: MSBuild 11 what's-new (the URL `learn.microsoft.com/en-us/visualstudio/msbuild/whats-new-msbuild-11` returned 404); anything in the NuGet Announcements repo beyond issue 75.

## Findings

Each item: change, source and upstream date, the row it touches, verdict.

### 1. Minimum package publish age (`minPublishAgeHours`), changed

- Change: NuGet 8.0 (SDK 11.0.100, VS 18.12) adds an opt-in `minPublishAgeHours` attribute on a `packageSources` entry, a `<minPublishAgeExceptions>` section, and `--min-publish-age-hours` on `dotnet nuget add source` and `dotnet nuget update source`. `dotnet package add` and `dotnet package update` skip versions younger than the age when they pick a version themselves; `update --vulnerable` still honours the age. Ordinary restore does not enforce the age for non-floating or transitive references. A floating reference on a source with a nonzero age fails restore with NU1020, even when all versions are old enough. The exceptions section replaces inherited exceptions, so an empty `<minPublishAgeExceptions />` stops inherited bypasses. A higher-priority file that redefines a source must repeat the attribute or the age resets to 0.
- Sources: [Minimum package publish age](https://learn.microsoft.com/en-us/nuget/consume-packages/minimum-package-publish-age) (ms.date 2026-11-03), [NU1020](https://learn.microsoft.com/en-us/nuget/reference/errors-and-warnings/nu1020) (2026-11-03), [NuGet 8.0 release notes](https://learn.microsoft.com/en-us/nuget/release-notes/nuget-8.0) (2026-11-06), [SDK 11 what's new](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/sdk) (2026-11-17).
- Pair today: CS-BUILD-27 owns the root `nuget.config` (clear, mapping, audit sources); the pair has no `minPublishAge` text. The pair already bans floating versions via the `Version="*"` / `CentralPackageFloatingVersions` grep in the CS-BUILD-23 check, so NU1020 cannot appear in a conforming repository.
- Verdict: amend CS-BUILD-27 (SHOULD, one clause). Not a new row: it is an opt-in policy knob on the file CS-BUILD-27 already owns, and it does not enforce anything on restore.

### 2. NU5052 for non-standard `PackageId`, changed (also recorded in the sibling file)

- Change: `dotnet pack` on SDK 11 with `SdkAnalysisLevel >= 11.0.100` warns NU5052 when `PackageId` is not: start with letter, digit or underscore; only ASCII letters, digits, `.`, `-`, `_`; no consecutive `.` or `-`; at most 100 characters. nuget.org itself already rejects pushes of non-compliant IDs since 2026-07-15 (new IDs since 2026-06-15). The `NUGET_DISABLE_PACKAGEID_VALIDATION` escape hatch is removed in .NET 11.
- Sources: [breaking change NU5052](https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/11/nuget-pack-nu5052-packageid) (ms.date 2026-11-10), [NuGet Announcements #75](https://github.com/NuGet/Announcements/issues/75) (dates as stated in the issue), [NuGet 8.0 notes](https://learn.microsoft.com/en-us/nuget/release-notes/nuget-8.0).
- Pair today: CS-PKG-01 owns the metadata block; it has no `PackageId` shape rule. Inference, not verified here: because CS-BUILD-13 makes `TreatWarningsAsErrors=true` unconditional, a library built on SDK 11 with a non-compliant ID would fail pack. The doc offers `NoWarn` NU5052 as a suppression, which implies the code is an ordinary warning.
- Verdict: amend CS-PKG-01: `PackageId` matches `^[A-Za-z0-9_]([A-Za-z0-9_]|[.-](?![.-]))*$` and is at most 100 characters (sketch of the doc's four conditions; verify the regex against the nuget.org published expression in Announcements #75 before writing it).
- Verification: `unzip -p artifacts/*.nupkg '*.nuspec' | xmllint --xpath 'string(//*[local-name()="id"])' -` piped to the regex with `grep -Ex`; or `dotnet pack` on SDK 11 exits 0 with no NU5052 line in the log.

### 3. Deterministic nupkg timestamps opt-in again, amend by re-measurement only

- Change: NuGet 8.0 "Make deterministic package timestamps opt-in again to preserve existing PreserveNewest behavior" ([NuGet/Home#15050](https://github.com/NuGet/Home/issues/15050), closed by NuGet.Client#7652, milestone 8.0). The issue shows the regression first appeared in SDK 10.0.400 (NuGet.Build.Tasks.Pack 7.9.0-rc.37502) and was absent in 10.0.302. The switch name is not on the page; the reporter's workaround was `<DeterministicTimestamp>false</DeterministicTimestamp>`, so the opt-in is probably `DeterministicTimestamp=true` (inference). The page does not mention `SOURCE_DATE_EPOCH`.
- Pair today: CS-PKG-05 says SOURCE_DATE_EPOCH on SDK 10.0.401 or newer gives an identical nupkg, and "11.0 RC1 is still non-identical by default". Could not determine whether SDK 10.0.404 and 11.0.100 GA still honour `SOURCE_DATE_EPOCH` after the opt-in change, or whether `DeterministicTimestamp=true` is now needed.
- Verdict: amend CS-PKG-05 only after re-measuring the `repro` block on SDK 10.0.404 and 11.0.100. Until then the row stays as written and its "SDK 10.0.401 or newer" claim carries a staleness risk. Do not edit from this research alone.
- Verification: run the existing `repro` block (two clones, `SOURCE_DATE_EPOCH` set) on both SDKs; add `-p:DeterministicTimestamp=true` as a second run if the first is not EQUAL.

### 4. `dnx` scripts bypass `global.json`, unchanged in substance

- Change: since SDK 10.0.302, 10.0.400 and 11, the `dnx` and `dnx.cmd` scripts run the newest installed SDK directly and ignore `global.json`; `dotnet dnx` still goes through the muxer and honours `global.json`. In SDK 11, `dotnet tool exec` and `dnx` also no longer prompt for an extra approval.
- Sources: [dnx breaking change](https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/11/dnx-scripts-bypass-global-json) (ms.date 2026-11-10), [SDK 11 what's new](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/sdk) (2026-11-17).
- Pair today: CS-BUILD-22 already states the first fact (read 2026-10-11 from dotnet/sdk commit cf67b96). Its grep `-nw 'dnx'` also matches `dotnet dnx`, so the `dotnet dnx` form stays banned, which is stricter than needed but correct (it still floats the tool version).
- Verdict: no action. The upstream doc now confirms CS-BUILD-22's rationale; the dropped approval prompt makes an unpinned `dnx` slightly more dangerous, which supports the existing ban.

### 5. Restore stops searching the global packages folder for a "next best" version; Linux lock directory moves

- Change A: SDK 11 restore selects the nearest higher version only from package sources, not from the global packages folder. A missing requested version can now resolve higher or fail NU1102. An exact version present in the global folder still restores. ([breaking change](https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/11/restore-global-packages-folder-version-search), ms.date 2026-11-10.)
- Change B: from SDK 11.0.200, NuGet's inter-process locks on Linux move from `/tmp/NuGetScratch{username}/locks` to `~/.nuget/locks`; `NUGET_SCRATCH` overrides both. Concurrent restores from older and newer SDKs then do not coordinate. ([breaking change](https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/11/nuget-locks-directory-linux), ms.date 2026-11-06.) Could not determine whether SDK 11.0.200 has shipped by 2026-11-27; the sources do not say.
- Pair today: CS-BUILD-27 already restores into an empty `NUGET_PACKAGES` per run, so change A cannot alter selection there, and each gate run uses a fresh packages folder, so mixed-SDK lock coordination (change B) has little to share.
- Verdict: no action. A future re-measurement on 11.0.200 should note B if the floor-leg SDK 8 and the SDK 11 probe ever restore concurrently into one folder.

### 6. Staged publishing on nuget.org, no action

- Change: opt-in staged publishing. A package is uploaded and validated (malware scan, signature checks, repository signing) but stays invisible to search and restore until a maintainer promotes it on the website. A staging-only API key or a staging-only Trusted Publishing policy can upload but not publish. The post says no existing `dotnet nuget push` flow breaks. Staged content expires if not promoted; group promotion is not atomic; the CLI cannot promote.
- Sources: [Introducing staged publishing on NuGet.org](https://devblogs.microsoft.com/dotnet/nuget-staged-publishing/) (published 2026-11-17 per the post; a search listing showed 2026-11-10 for the same post, so the exact day is uncertain), [Trusted Publishing doc](https://learn.microsoft.com/en-us/nuget/nuget-org/trusted-publishing) (updated 2026-09-01; it does not mention staging, token life 1 hour and one-time use unchanged).
- Discrepancy to resolve before any rule cites the command: the blog gives `dotnet package stage push` (SDK 11 RC2 or later); the NuGet 8.0 notes say `dotnet nuget stage push`; a fetch of the `dotnet nuget stage push` doc page returned 404. Use neither spelling in a rule until `dotnet package stage push --help` is run on 11.0.100.
- Pair today: CS-PKG-11 (Trusted Publishing) and CS-PKG-12 (tag-only, `needs:` verify, `--skip-duplicate`) stay correct. A staged push is not `dotnet nuget push`, so the push-gate greps would not see it.
- Verdict: no action now. Revisit as a possible SHOULD in CS-PKG-11 (staging-only policy plus manual promotion) once the command and the listing support settle.

### 7. GitHub Actions: workflow lockfiles GA, `pull_request_target` blocked by default, no action

- Change A: workflow lockfiles reached GA on 2026-10-28. `.github/workflows/actions.lock` (generated with the `gh actions-lock` extension) records the commits of actions and their transitive dependencies, so a workflow can keep tag or branch references and still run the locked commits. A "Require lockfile" policy exists for admins; Dependabot regenerates lock entries; the page says a lockfile does not prove a dependency is safe. ([changelog](https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available/).)
- Change B: `pull_request_target` is blocked by default in public repositories from 2026-12-02 (moved from 2026-11-02; brownouts 2026-11-09 and 2026-11-16, 16:00 to 18:00 UTC). ([changelog](https://github.blog/changelog/2026-11-02-pull_request_target-blocked-by-default-december-2/).)
- The changelog index page showed only titles for other entries; no attestation or OIDC-token entry for nupkgs appeared in the window (titles only, so this is "none seen", not "none exist").
- Pair today: CS-PKG-11 requires a 40-hex SHA pin on `NuGet/login` and any publish action, checked by the `workflow-pins` grep. A repository that adopted lockfiles and kept `NuGet/login@v1` would fail that grep. The pair's tag-only release workflows do not use `pull_request_target`.
- Verdict: no action. The SHA pin is stricter and still the checkable form; lockfiles are a competing mechanism the grep cannot verify. Record it under contested if lockfile adoption spreads in the exemplar repositories.

### 8. C# 15 and SDK 11 compiler/analysis defaults, no action

- Change: C# 15 is the default language version for `net11.0` projects on the .NET 11 SDK; only the memory-safety preview needs `LangVersion=preview`. Union types rely on `System.Runtime.CompilerServices.UnionAttribute` and `IUnion`, which "the .NET 11 runtime includes"; the page gives no polyfill note for older TFMs (so a net8.0 or net10.0 leg would lack them; this is an inference from the sentence). `with(...)` in a collection expression binds as constructor arguments at `LangVersion >= 15`, and `closed` and `union` become contextual keywords (CS9380, CS9370). Non-virtual static interface members now work on older runtimes. SDK 11 also fixes `AnalysisLevel=latest` wrongly selecting .NET 9 rules, and adds NETSDK1235 (custom `.nuspec` with `PackAsTool`).
- Sources: [What's new in C# 15](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-15) (ms.date 2026-11-10), [Union types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/union) (2026-10-19), [C# compiler breaking changes since C# 14](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/breaking-changes/compiler%20breaking%20changes%20-%20dotnet%2011) (page updated 2026-08-13), [SDK 11 what's new](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/sdk).
- Pair today: CS-BUILD-04 pins `LangVersion` to the literal `14` and CS-BUILD-10 pins `AnalysisLevel` to `10.0-all`; the allow-list ships net8.0 and net10.0 only. All three facts above are neutralised by those pins, so nothing needs a new TFM or LangVersion row now. The compiler-breaking page also lists "C# 16" items (pointer types without `unsafe`, `safe` keyword), which are outside this window and outside this pair.
- Verdict: no action. When the pair later moves `LangVersion` to 15, the bump checklist is: grep for `with(` as a method name, for types named `closed` or `union`, and re-run the canary (CS-BUILD-18). Source-level C# 15 rules belong to csharp-quality.

## Normative guidance candidates

1. Rule (amend CS-BUILD-27, SHOULD): when a root `nuget.config` sets `minPublishAgeHours` on the single mapped source, it also contains an empty `<minPublishAgeExceptions />`, and no `PackageReference` or `PackageVersion` uses a floating version. Rationale: a nonzero age makes restore fail NU1020 on any floating reference, and inherited exceptions silently bypass the delay. Verification: `xmllint --xpath 'count(//packageSources/add[@minPublishAgeHours > 0])' nuget.config` and `xmllint --xpath 'count(//minPublishAgeExceptions/package)' nuget.config` prints 0 when the former is above 0; the existing floating-version grep in the CS-BUILD-23 block stays empty. State in the rule that restore does not enforce the age for fixed versions, so it is a policy for `dotnet package add/update`, not a gate.
2. Rule (amend CS-PKG-01, MUST once SDK 11 is the pack SDK, SHOULD before): `PackageId` is at most 100 characters of ASCII letters, digits, `.`, `-`, `_`, starts with a letter, digit or underscore, and has no consecutive `.` or `-`. Rationale: nuget.org rejects other IDs since 2026-07-15 and SDK 11 warns NU5052, which the unconditional `TreatWarningsAsErrors` would turn into a pack failure. Verification: extract `<id>` from the packed nuspec and test with the regex in Finding 2; `dotnet pack` log has no `NU5052`.
3. Rule (amend CS-PKG-05, conditional on re-measurement): state the exact SDK versions on which `SOURCE_DATE_EPOCH` alone gives byte-identical nupkg and snupkg, and whether `-p:DeterministicTimestamp=true` is also needed. Rationale: NuGet 8.0 flipped deterministic timestamps back to opt-in. Verification: the existing `repro` block, run on 10.0.404 and 11.0.100.

## AI-agent angle

- An agent adding `minPublishAgeHours` will assume restore enforces it and will leave a `1.*` reference in place; the first restore then fails NU1020. Check: floating-version grep from CS-BUILD-23.
- An agent writes a `PackageId` with a non-ASCII name or doubled dots (`Müller.Logging`, `Acme..Core`) because older NuGet accepted it; pack passes on SDK 10 and fails on SDK 11 under TWAE. Check: the nuspec id regex.
- An agent "fixes" `dnx` failures by adding `dotnet dnx` or by unpinning `global.json`; both float the tool version. Check: the CS-BUILD-22 grep.
- An agent bumps `LangVersion` to `latest` or 15 on SDK 11 to use unions and ships net8.0 or net10.0 legs that lack `UnionAttribute`. Check: CS-BUILD-04 grep for `latest|preview|default`.
- An agent copies `dotnet nuget stage push` from the NuGet 8.0 notes, which may not exist under that name. Check: `dotnet package stage push --help` exit code on the pinned SDK.

## Contested / evolving

- Staged publishing versus a direct Trusted Publishing push: the vendor recommends pairing them; no exemplar repository does yet. Trend: likely a SHOULD in CS-PKG-11 within a release or two, as of 2026-11-17.
- Workflow lockfiles versus 40-hex SHA pins: both fix the commit; only the SHA form is greppable in one file. As of 2026-10-28 the lockfile is GA but newly so.
- Deterministic nupkg timestamps: moved to opt-in in NuGet 8.0 after a regression in SDK 10.0.400; the final switch name needs confirmation.
- A reader comment (unverified) on the .NET 11 announcement claims the new SDK compiler changes how decimal constants assigned double values behave even when targeting .NET 10. Not in the official post; could not determine whether it is real. It would belong to csharp-quality if confirmed.

## Sources

| URL | What it is | Date | Why worth reading |
|---|---|---|---|
| https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/sdk | SDK and tooling what's new for .NET 11 | updated 2026-11-17 | Primary; source for no-default-change conclusions |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/11 | .NET 11 breaking-change index | updated 2026-11-23 | Primary; complete SDK/MSBuild list |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/11/dnx-scripts-bypass-global-json | dnx breaking change | 2026-11-10 | Primary; CS-BUILD-22 |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/11/nuget-pack-nu5052-packageid | NU5052 breaking change | 2026-11-10 | Primary; CS-PKG-01 |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/11/restore-global-packages-folder-version-search | Restore next-best version change | 2026-11-10 | Primary; CS-BUILD-27 |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/11/nuget-locks-directory-linux | NuGet locks directory on Linux | 2026-11-06 | Primary; SDK 11.0.200 |
| https://learn.microsoft.com/en-us/nuget/consume-packages/minimum-package-publish-age | Minimum publish age feature doc | 2026-11-03 | Primary; CS-BUILD-27 |
| https://learn.microsoft.com/en-us/nuget/reference/errors-and-warnings/nu1020 | NU1020 reference | 2026-11-03 | Primary; floating versions |
| https://learn.microsoft.com/en-us/nuget/release-notes/nuget-8.0 | NuGet 8.0 release notes | 2026-11-06 | Primary; pack, audit, stage push |
| https://github.com/NuGet/Home/issues/15050 | Deterministic timestamp opt-in issue | 8.0 milestone | Primary; CS-PKG-05 |
| https://github.com/NuGet/Announcements/issues/75 | Restricted package ID announcement | enforcement 2026-06-15 and 2026-07-15 | Primary; nuget.org rule |
| https://devblogs.microsoft.com/dotnet/nuget-staged-publishing/ | Staged publishing post | 2026-11-17 | Primary; CS-PKG-11 context |
| https://learn.microsoft.com/en-us/nuget/nuget-org/trusted-publishing | Trusted Publishing doc | updated 2026-09-01 | Confirms 1-hour single-use key unchanged |
| https://learn.microsoft.com/en-us/nuget/concepts/auditing-packages | NuGet Audit doc | updated 2026-07-07 | Confirms no audit default change for SDK 11 |
| https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-15 | C# 15 what's new | 2026-11-10 | Primary; LangVersion default |
| https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/union | Union types reference | 2026-10-19 | Primary; runtime types |
| https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/breaking-changes/compiler%20breaking%20changes%20-%20dotnet%2011 | C# compiler breaking changes | updated 2026-08-13 | Primary; with(), closed, union |
| https://devblogs.microsoft.com/dotnet/announcing-dotnet-11/ | .NET 11 announcement | 2026-11-10 | States no deprecation of sln, snupkg or dotnet format |
| https://devblogs.microsoft.com/nuget/ | NuGet blog index | window listing | Post titles in the window |
| https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available/ | Workflow lockfiles GA | 2026-10-28 | Primary; CS-PKG-11 |
| https://github.blog/changelog/2026-11-02-pull_request_target-blocked-by-default-december-2/ | pull_request_target block | 2026-11-02 | Primary; enforcement 2026-12-02 |
| https://github.blog/changelog/label/actions/ | Actions changelog index | window listing | Titles only; no attestation entry seen |

Fetched and failed (404): `learn.microsoft.com/en-us/visualstudio/msbuild/whats-new-msbuild-11`, `learn.microsoft.com/en-us/dotnet/core/tools/dotnet-nuget-stage-push`, `devblogs.microsoft.com/nuget/introducing-staged-publishing-on-nuget-org/` (the post lives under `/dotnet/nuget-staged-publishing/`).
