---
title: "Diagnosing a failing .NET build, restore, test or hang: a frequency-ranked catalogue of 60 diagnostics, the triage order, and the CI flags the exemplars use"
topic: csharp-procedures-diagnose-catalogue (AG-02, BD-13, BD-16, BD-17, BD-18, BD-20) - input to the dotnet-diagnose skill
agent: deep-dive researcher (wave 2, group "Skill corpora: dotnet-diagnose, dotnet-upgrade, dotnet-release app path")
model: claude-sonnet-5-5
date_researched: 2026-10-11
sources_count: 14
scope: |
  Covers: NU1xxx restore codes (including CPM, lock-file, audit and source-mapping variants), NETSDK / MSB / CS / IL codes that a C# 14 repo on .NET 10 LTS (floor .NET 8) actually hits, global.json and SDK resolution failures, Directory.Build.props layering (BD-13), NU1510 pruning (BD-16), Terminal Logger and --interactive defaults (BD-17), `dnx` (BD-18), build-server / node-reuse / Exec / pipe hangs (BD-20), Microsoft.Testing.Platform exit codes, analyzer noise under TreatWarningsAsErrors, and the CI flags used by the 35 exemplar repos.
  Measured on a linux-x64 WSL2 host with SDK 10.0.401 (default), 8.0.425 (floor) and 11.0.100-rc.1 (flagged), plus a Windows host with SDK 10.0.102 for the file-lock case. 58 red/green pairs watched.
  Does not cover: Visual Studio / Rider-only diagnostics, MAUI / Blazor / ASP.NET errors, workload errors, macOS-only failures, NuGet signing errors (NU3xxx), and any wave 1-2 decision (CS-PROC, CS-ASYNC, CS-API, CS-ERR, CS-JSON, CS-BUILD, CS-PKG, CS-BIN, CS-XP, CS-TEST, CS-CI): those IDs are cited, never re-decided.
  Not reproduced (flagged in place): NU1009 (documented only), MSB4018 (the fixture gave NETSDK1060 instead), CS8032, a 401 feed that then accepts credentials, a long-path failure (the Windows host has LongPathsEnabled=1), and a pipe-capture hang caused by leftover build nodes (did not occur on Linux or Windows).
---

# Diagnosing a failing .NET build, restore, test or hang

All fixture paths are under `F=/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-procedures-diagnose-catalogue`. `bash $F/verify-all.sh` rebuilds every case from clean state in about 5 minutes and rewrites `$F/results.txt` (one line per case: exit code, hit count, first matching diagnostic).

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [How the catalogue was ranked, and what the ranking is worth](#1-how-the-catalogue-was-ranked-and-what-the-ranking-is-worth)
   2. [Triage order](#2-triage-order)
   3. [The catalogue (60 entries)](#3-the-catalogue-60-entries)
   4. [Does the fix differ between net8 and net10?](#4-does-the-fix-differ-between-net8-and-net10)
   5. [Capturing diagnostics: the extractor, the duplicate line, the binlog](#5-capturing-diagnostics-the-extractor-the-duplicate-line-the-binlog)
   6. [SDK resolution and global.json failures (silent fallbacks)](#6-sdk-resolution-and-globaljson-failures-silent-fallbacks)
   7. [Directory.Build.props layering (BD-13)](#7-directorybuildprops-layering-bd-13)
   8. [NU1510 pruning (BD-16)](#8-nu1510-pruning-bd-16)
   9. [Terminal Logger and --interactive (BD-17)](#9-terminal-logger-and---interactive-bd-17)
   10. [dnx (BD-18)](#10-dnx-bd-18)
   11. [Hangs: build servers, Exec, pipes (BD-20)](#11-hangs-build-servers-exec-pipes-bd-20)
   12. [Microsoft.Testing.Platform exit codes](#12-microsofttestingplatform-exit-codes)
   13. [Analyzer and warning noise under TreatWarningsAsErrors](#13-analyzer-and-warning-noise-under-treatwarningsaserrors)
   14. [CI flags in the 35 exemplar repos](#14-ci-flags-in-the-35-exemplar-repos)
   15. [Verified on the toolchain](#15-verified-on-the-toolchain)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

1. **Fix the first diagnostic in time, not the loudest.** A restore error (NU1xxx) stops the build before compile; every CS error after it is a cascade. Triage order: SDK resolution, restore, project shape, compile, analyzers, publish/trim, test, hang (section 2).
2. **A diagnostic prints twice on SDK 10.0.401** (inline and in the end summary), and `-clp:NoSummary` did not remove the copy. Extract with `grep -E '(error|warning) [A-Z]+[0-9]+:' | sort -u`. `-clp:ErrorsOnly` and a binlog replay (`dotnet msbuild x.binlog -v:q`) print each error once; ErrorsOnly drops warnings (section 5).
3. **The most-mentioned failures are not the most informative ones.** In 12 months of tracker traffic the top five are MSB3073 (119), CS0246 (93), MTP exit code 5 (84), MTP exit code 8 (74) and MSB4018 (74). Three of them are wrappers: MSB3073 only says "a command exited non-zero", and the real error is in the lines above it.
4. **An invalid global.json is not an error.** A trailing comma, or `"version": "10.0"`, makes the SDK ignore the file and pick the newest installed SDK, prereleases included (measured: 11.0.100-rc.1). `dotnet --version` must equal the pinned version, checked every time (rule 3).
5. **Exit 155 and "A compatible .NET SDK was not found" is the only loud global.json failure**: it fires for `rollForward: disable` or `latestPatch` with a missing band, never for malformed JSON.
6. **NU1301 hides behind a warm global packages folder.** The same restore that fails with a dead source exits 0 when the package is already cached. Prove restore with `--packages "$(mktemp -d)"` (CS-BUILD-27). A 401 feed is also NU1301 (with a 401 line below it), and `--interactive` changed nothing without a credential provider.
7. **NU1605 is an error without TreatWarningsAsErrors**, because the SDK promotes it itself (the message reads `error NU1605: Warning As Error:`). Fix by referencing the higher version directly, never by NoWarn.
8. **NU1510 is net10-only.** The same PackageReference is silent on net8.0 and a warning on net10.0 (CS-BUILD-28: delete the reference).
9. **MSB3277 is only the visible symptom, and only for strong-named assemblies.** The failure is CS1705 (or CS0012 when the dependency is not passed to the compiler). Name-only version differences are silent.
10. **CS9057 is an SDK/analyzer version mismatch, not a code bug.** SDK 8.0.425 (Roslyn 4.11) loads `Microsoft.CodeAnalysis.PublicApiAnalyzers` 5.6.0 (needs 4.12) with a warning; SDK 10.0.401 builds the same net8.0 project clean. Two fixes were watched: a newer SDK, or analyzer 3.3.4.
11. **`dotnet test` on SDK 8 with an MTP-only project exits 0 without running a test** (false green). `TestingPlatformDotnetTestSupport=true` makes it run and fail correctly (exit 1). On SDK 10 the same project needs the global.json `test.runner` opt-in, or restore-time targets fail with an explicit error.
12. **MTP exit 5 under `dotnet test` hides its reason.** `dotnet run -- <same args>` prints `Unknown option '--not-an-option'`. VSTest flags (`--logger`, `--collect`) all exit 5.
13. **Three independent hang mechanisms, each with a measured fix.** (a) Leftover build servers: `--disable-build-servers` left 0 processes, `-nodeReuse:false` alone left 1. (b) An `Exec` that backgrounds a child holding stdout blocks the build for the child's lifetime (26.2 s vs 1.2 s redirected), and `Exec Timeout` does not shorten it (26.1 s). (c) `Exec` fails the build when the command prints a line shaped `file(1,1): error X001: ...` even if it exits 0 (`IgnoreStandardErrorWarningFormat`).
14. **Terminal Logger is off under a pipe and under `CI=true` or `GITHUB_ACTIONS=true` even in a pty** (776 bytes, 6 escapes, identical to `--tl:off`); in a pty without those variables it is on (1005 bytes, 19 escapes). Automation should still pass `-tl:off` (CS-BUILD-30).
15. **`dnx` is not governed by global.json**: the `dnx` script picks the last SDK in `dotnet --list-sdks` (11.0.100-rc.1 here) while `dotnet --version` under the same global.json says 8.0.425. Never call it in CI (CS-BUILD-22).
16. **Windows adds one frequent failure Linux never shows**: MSB3027 + MSB3021 on a locked apphost (`The file is locked by: "App (43792)"`) after 10 one-second retries. Stop the named process; do not edit the retry count.
17. **The exemplars barely use diagnostic flags.** Of 35 repos: `-tl:off` 2, node-reuse off 5, `--blame-hang`/`--hangdump` 4, binlog 9, `--interactive false` 0. Six mention `-warnaserror` in CI or build scripts (two only as Arcade's option parser); a hard-coded command-line use would break CS-BUILD-13 (props only).
18. **Never fix a catalogue code with NoWarn.** Rule 27 is one grep that must print nothing.

## Findings

### 1. How the catalogue was ranked, and what the ranking is worth

Three signals, none perfect:

| Signal | What it measures | Command | Bias |
|---|---|---|---|
| Tracker mentions | Issues and PRs created 2025-10-11 to 2026-10-11 whose text contains the code, in `NuGet/Home`, `dotnet/sdk`, `dotnet/msbuild`, `dotnet/runtime`, `dotnet/roslyn`, `microsoft/testfx`, `dotnet/docs` | `bash $F/tracker-freq.sh NU1102 CS0246` (needs `gh` auth; 3 s between calls); results in `$F/logs/tracker-freq-nu.tsv` and `tracker-freq-rest.tsv` | Counts people who report, in Microsoft repos. MSB3073 (119) and MSB4018 (74) include repo-internal infrastructure failures. A code with no mentions is not rare, only quiet. |
| Fixture reproduction | Whether the code fires from a minimal project, and with which first line | `$F/results.txt` | Says nothing about how often. |
| Exemplar corpus | Which suppressions the 35 repos carry (CS1591 muted in 19 of 35, NU1510 in 5, NU1903 in 4) | cited from `csharp-audit/exemplar-build-and-gates.md` | A suppression marks a code that annoyed someone, not a code that is common. |

The tracker count is the rank key. Where a code has no count it is placed by fixture evidence and marked `-`. The ranking tells an agent which diagnoses to rehearse first; it does not say how often a given repo will see one.

### 2. Triage order

Do these in order and stop at the first that explains the output. Each step names the command that decides it.

1. **Which SDK am I on?** `dotnet --version` must print the global.json version (rule 3). Exit 155 with "A compatible .NET SDK was not found" means the SDK is missing (section 6). A `MSB4242`/`JsonReaderException` cascade with a prerelease SDK path in it means a malformed global.json.
2. **Capture once, unique, with no Terminal Logger**: `dotnet build -tl:off -nologo -v:q 2>&1 | tee build.log`, then `grep -E '(error|warning) [A-Z]+[0-9]+:' build.log | sort -u` (section 5).
3. **Look at the first diagnostic by position**: `grep -n -m1 -E 'error [A-Z]+[0-9]+' build.log`. Classify by prefix:
   - `NU1101/1102/1103/1301/1302`: sources and network. `NU1605/1608/1202/1701`: the graph. `NU1004/1008/1010/1011/1507`: policy (lock file, CPM, source mapping). `NU1510/1900-1905`: pruning and audit.
   - `NETSDK*` and `MSB4xxx/MSB1xxx`: project shape or SDK.
   - `MSB3073`: read the lines above it; `MSB3277/3021/3027`: references and file locks.
   - `CS0246/0012/1705/0518/0656/0234/8370/9035`: references, language version, polyfills. `CS9057/CS8032`: analyzer built for a newer compiler.
   - `IL2xxx/IL3xxx`: trim/AOT, only when `IsTrimmable`, `IsAotCompatible` or publish is on.
   - A line `Exit code: N` with no code: Microsoft.Testing.Platform (section 12).
   - No diagnostic and no progress: a hang (section 11).
4. **Is the "error" a promoted warning?** The message text says `Warning As Error:` (NU1605, NU1903) or the code is documented as a warning (CS*, IL*, NU1701). The fix is the same as for the warning; the promotion is the reason the build stopped.
5. **Apply the fix from the catalogue, then re-run the same command** and check that the code count is 0 and the exit code is 0. A restore fix is proved with an empty packages folder (rule 8).
6. **Do not widen the fix.** If the fix needs a credential, an SDK install, a source that is not in nuget.config, or a decision about a TFM, stop and hand it to the owner (AI-agent angle).

### 3. The catalogue (60 entries)

Columns: `#` running number (rows are ordered by tracker count, descending, within each tier), code with the 12-month tracker count in parentheses (`-` none, `unrep` not reproduced), the first error line as observed on SDK 10.0.401 (paths shortened, `...` truncated), cause and fix, the verify command, and whether the fix differs for net8 or net10 (era).

`V(X)` means: `dotnet build --no-incremental -tl:off -nologo -v:q 2>&1 | grep -c 'X'` prints `0` (for restore-phase codes use `dotnet restore --force -v:q 2>&1 | grep -c 'X'`). Every code has a red/green twin under `$F/<lowercase code>/red` and `/green` unless marked.

#### 3.1 Restore (NU)

| # | Code (N) | First line (observed) | Cause and fix | Verify | net8 vs net10 |
|---|---|---|---|---|---|
| 1 | NU1102 (42) | `error NU1102: Unable to find package acme.b with version (>= 9.0.0)` followed by `- Found 2 version(s) in local [ Nearest version: 2.0.0 ]` | The id exists, the version does not, in any mapped source. Lower to the nearest version printed, or add the source that has it through package source mapping. | V(NU1102) | Same |
| 2 | NU1605 (37) | `error NU1605: Warning As Error: Detected package downgrade: acme.b from 2.0.0 to 1.0.0. Reference the package directly from the project to select a different version.` | Direct-dependency-wins: a direct reference to a lower version beats a transitive requirement ([NU1605 doc](https://learn.microsoft.com/en-us/nuget/reference/errors-and-warnings/nu1605)). The SDK promotes this warning itself. Add a direct reference at the higher version (a `PackageVersion` under CPM). | V(NU1605) | Same |
| 3 | NU1903 (28) | `warning NU1903: Package 'Newtonsoft.Json' 12.0.3 has a known high severity vulnerability, https://github.com/advisories/GHSA-5crp-9r3c-p9vr`; under TWAE `error NU1903: Warning As Error: ...` | Known advisory. Upgrade the package (direct reference or a direct pin of the transitive one). The audit codes NU1900-NU1905 are the only exemption from TWAE (CS-BUILD-26). | V(NU190) | Audit mode default differs: net10 audits transitive packages (`all`), net8 direct only (see csharp-procedures-upgrade-path); set `NuGetAuditMode` explicitly (CS-BUILD-26) |
| 4 | NU1101 (25) | `error NU1101: Unable to find package Acme.DoesNotExist. No packages exist with this id in source(s): local, nuget.org` | Typo, private package, or the source that has it is not in nuget.config. The message lists the sources searched: fix the id or add the source (CS-BUILD-27 maps every source). | V(NU1101) | Same |
| 5 | NU1301 (15) | `error NU1301: Unable to load the service index for source https://127.0.0.1:9/v3/index.json.` | Source unreachable. A 401 gives the same code with a second line `Response status code does not indicate success: 401 (Unauthorized).`; `--interactive` changed nothing (no credential provider installed). A warm global packages folder masks it: the same restore exited 0 when the package was cached (`NU1301-red-cachemask`). Test with `--packages "$(mktemp -d)"`. A 401 is a credential problem: hand to the owner. | `dotnet restore --force --packages "$(mktemp -d)" -v:q; echo $?` prints `0` | Same. The 401-then-credentials green was not reproduced (my stub server did not implement a service index). |
| 6 | NU1701 (15) | `warning NU1701: Package 'acme.legacy 1.0.0' was restored using '.NETFramework,Version=v4.6.1, ... .NETFramework,Version=v4.8.1' instead of the project target framework` | The package has only .NET Framework assets; restore fell back. It can compile and fail at runtime. Replace with a package that has netstandard2.0 or net8.0+ assets. Do not NoWarn; ask the owner if no replacement exists. | V(NU1701) | Same |
| 7 | NU1904 (14), NU1901 (10), NU1902 | Same shape as NU1903 with severity low / critical / moderate (the 190x family is severity-keyed) | As NU1903. NU1904 is critical, NU1901 low, NU1902 moderate. | V(NU190) | As NU1903 |
| 8 | NU1510 (14) | `warning NU1510: PackageReference System.Text.Json will not be pruned. This package is automatically available and does not need to be referenced explicitly. Remove the PackageReference item.` | Package pruning (new in .NET 10): the reference is already in the targeting pack. Delete it (CS-BUILD-28). | V(NU1510) | **net10 only**: the same reference on net8.0 printed nothing (`NU1510-net8`, 0 hits) |
| 9 | NU1202 (9) | `error NU1202: Package acme.only10 1.0.0 is not compatible with net8.0 (.NETCoreApp,Version=v8.0). Package acme.only10 1.0.0 supports: net10.0 (.NETCoreApp,Version=v10.0)` | A package's lowest TFM is above one of the project's TFMs. This is the net8-floor trap in a multi-targeted repo: choose a lower package version, or condition the reference on the TFM that supports it. | V(NU1202) | Fails only on the older TFM leg |
| 10 | NU1103 (8) | `error NU1103: Unable to find a stable package acme.pre with version (>= 0.0.1)` | Only prerelease versions satisfy the range. Request the prerelease explicitly or a stable one. Needs a requested version lower than the prerelease to reproduce; a range at or above it is NU1102 or resolves. | V(NU1103) | Same |
| 11 | NU1507 (6) | `warning NU1507: There are 2 package sources defined in your configuration. When using central package management, map your package sources with package source mapping ... or specify a single package source. The following sources are defined: nuget.org, v2` | CPM with more than one **remote** source and no `<packageSourceMapping>`. A local-folder source is not counted. Map sources (CS-BUILD-27). | V(NU1507) | Same |
| 12 | NU1900 (5), NU1905 (4) | `warning NU1905: Audit source 'down' did not provide any vulnerability data.` (NU1900 is the same condition reported for a source that failed to answer) | The audit could not run, so a green build proves nothing about vulnerabilities. Fix the audit source or rerun; a CI audit job turns both into errors (csharp-build C2: `-warnaserror` turns them into errors on an outage). | V(NU190) with the source reachable | Same |
| 13 | NU1004 (4) | `error NU1004: The package reference acme.b version has changed from [1.0.0, ) to [2.0.0, ).The packages lock file is inconsistent with the project dependencies so restore can't be run in locked mode. Disable the RestoreLockedMode MSBuild property or pass an explicit --force-evaluate option to run restore to update the lock file.` | `CI=true` turns locked mode on and the lock file is stale. Run `dotnet restore --force-evaluate` locally and commit the file. Libraries commit no lock file (CS-BUILD-25). | V(NU1004) | Same |
| 14 | NU1608 (4) | `warning NU1608: Detected package version outside of dependency constraint: acme.a 1.0.0 requires acme.b (>= 1.0.0 && < 2.0.0) but version acme.b 2.0.0 was resolved.` | A pin or a direct reference is above a package's upper bound. Align versions or upgrade acme.a. Exit 0 until TWAE. | V(NU1608) | Same |
| 15 | NU1008 (4) | `error NU1008: The following PackageReference items cannot define a value for Version: acme.b. Projects using Central Package Management must define a Version value on a PackageVersion item.` | CPM is on and a csproj sets `Version=`. Move the version to `Directory.Packages.props` (CS-BUILD-23). | V(NU1008) | Same |
| 16 | NU1010 (3) | `error NU1010: The following PackageReference items do not define a corresponding PackageVersion item: acme.b.` | CPM is on and there is no `PackageVersion` for the reference. Add it. | V(NU1010) | Same |
| 17 | NU1009 (3, unrep) | not reproduced; documented as a CPM lock/override variant | Not claimed. | - | - |
| 18 | NU1302 (2) | `error NU1302: You are running the 'restore' operation with an 'HTTP' source: http://127.0.0.1:9/v3/index.json. NuGet requires HTTPS sources. To use an HTTP source, you must explicitly set 'allowInsecureConnections' to true in your NuGet.Config file.` | An http:// source. It fires **before** NU1301 would. Use https; `allowInsecureConnections` only for a local test feed. | V(NU1302) | Same |
| 19 | NU1504 (1) | `warning NU1504: Duplicate 'PackageReference' items found. Remove the duplicate items or use the Update functionality ... The duplicate 'PackageReference' items are: acme.b 1.0.0, acme.b 1.0.0.` | A package is listed twice (often props plus csproj). Remove one. | V(NU1504) | Same |
| 20 | NU1011 (-) | `error NU1011: The following PackageVersion items cannot specify a floating version: acme.b.` | A `*` version under CPM. Pin exactly. | V(NU1011) | Same |
| 21 | NU5104 (-) | `warning NU5104: A stable release of a package should not have a prerelease dependency. Either modify the version spec of dependency "acme.pre [1.0.0-beta.1, )" ...` | Pack-time. A stable package must not depend on a prerelease. Pin a stable dependency or version the package as a prerelease. | `dotnet pack --no-build -v:q 2>&1 \| grep -c NU5104` prints `0` | Same |

#### 3.2 SDK and MSBuild

| # | Code (N) | First line (observed) | Cause and fix | Verify | net8 vs net10 |
|---|---|---|---|---|---|
| 22 | MSB3073 (119) | `error MSB3073: The command "sh -c 'exit 3'" exited with code 3.` | An `Exec`, pre-build or post-build event returned non-zero. The cause is printed **above** this line by the command itself. Run the command by hand from the project directory, fix it, never `IgnoreExitCode` (the fixture's green twin uses `IgnoreExitCode="true"` only to prove the mechanism; it is not a fix). Related: section 11 (an `Exec` also fails on a printed `error X001:` line even when it exits 0). | V(MSB3073) | Same |
| 23 | MSB4018 (74, unrep) | not reproduced: the closest watched case, a truncated `obj/project.assets.json`, gave `error NETSDK1060: Error reading assets file: Error loading lock file '...project.assets.json' : Expected end of string, but instead reached end of data.` | A task threw. Read the exception text under it. For a corrupt assets file, delete that project's `obj/project.assets.json` and restore. | `dotnet build -tl:off -nologo -v:q 2>&1 \| grep -cE 'NETSDK1060\|MSB4018'` prints `0` | Same (not measured on SDK 8) |
| 24 | MSB4057 (28) | `error MSB4057: The target "Foo" does not exist in the project.` | `-t:Foo` names a target that no import defines, or the SDK imports differ. List with `dotnet msbuild -targets`. | V(MSB4057) | Same |
| 25 | MSB3277 (17) | `warning MSB3277: Found conflicts between different versions of "X" that could not be resolved.` (then the list of conflicting references) | Two references need different versions of one **strong-named** assembly. Reference the higher version directly. The warning is not the failure, see CS1705. | V(MSB3277) | Same |
| 26 | MSB3021 (10) + MSB3027 (6) | `error MSB3027: Could not copy "...\obj\Debug\net10.0\apphost.exe" to "bin\Debug\net10.0\App.exe". Exceeded retry count of 10. Failed. The file is locked by: "App (43792)"` then `error MSB3021: Unable to copy file ... because it is being used by another process.` | **Windows**: a running `App.exe` holds the apphost. The SDK names the process; there are 10 retries of 1 s (MSB3026 warnings). Stop that process, rebuild. Not seen on Linux. | `grep -c 'The file is locked by' build.log` prints `0` after stopping the process | Same (host SDK 10.0.102) |
| 27 | MSB4236 (10) | `error MSB4236: The SDK 'Microsoft.NET.Sdk.Foo' specified could not be found.` | A misspelled or unresolved `Sdk=` attribute or `msbuild-sdks` entry. Fix the name. | V(MSB4236) | Same |
| 28 | MSB4019 (10) | `error MSB4019: The imported project ".../missing.props" was not found. Confirm that the expression in the Import declaration "missing.props", which evaluated to "missing.props", is correct, and that the file exists on disk.` | An `Import` of a file that is not there. Use a `Condition="Exists(...)"` or fix the path. | V(MSB4019) | Same |
| 29 | NETSDK1022 (8) | `error NETSDK1022: Duplicate 'Compile' items were included. The .NET SDK includes 'Compile' items from your project directory by default.` | An explicit `<Compile Include="**/*.cs" />` on top of the default globs. Delete it or set `EnableDefaultCompileItems=false`. | V(NETSDK1022) | Same |
| 30 | NETSDK1045 (7) | `error NETSDK1045: The current .NET SDK does not support targeting .NET 11.0.  Either target .NET 10.0 or lower, or use a version of the .NET SDK that supports .NET 11.0.` | SDK older than the TFM. Measured both ways: SDK 10.0.401 cannot target net11.0; SDK 8.0.425 cannot target net10.0; SDK 11.0.100-rc.1 builds net11.0. Install the SDK ([NETSDK1045 doc](https://learn.microsoft.com/en-us/dotnet/core/tools/sdk-errors/netsdk1045)); do not lower the TFM without the owner. | V(NETSDK1045) | The fix is "use SDK >= TFM"; a rollback to SDK 8 after the net10 upgrade fails with this (csharp-procedures-upgrade-path) |
| 31 | NETSDK1004 (5) | `error NETSDK1004: Assets file '.../obj/project.assets.json' not found. Run a NuGet package restore to generate this file.` | `--no-restore` (or `--no-build`) without a prior restore, as in multi-stage container builds. Restore first. | V(NETSDK1004) | Same |
| 32 | NETSDK1194 (4) | `warning NETSDK1194: The "--output" option isn't supported when building a solution. Specifying a solution-level output path results in all projects copying outputs to the same directory ...` | `dotnet build Sln.slnx -o out`. Build the project, or use `--artifacts-path`/`ArtifactsPath`. | V(NETSDK1194) | Warning on SDK 10.0.401; not measured on SDK 8 |
| 33 | NETSDK1210 (4) | `warning NETSDK1210: IsAotCompatible and EnableAotAnalyzer are not supported for the target framework. Consider multi-targeting to a supported framework to enable ahead-of-time ...` | `IsAotCompatible` on netstandard2.0. Multi-target and set it only for the net8.0+ TFM (CS-BUILD-03). | V(NETSDK1210) | netstandard2.0 specific |
| 34 | NETSDK1100 (3) | `error NETSDK1100: To build a project targeting Windows on this operating system, set the EnableWindowsTargeting property to true.` | A `-windows` TFM with `UseWindowsForms` or `UseWPF` on Linux. Set `EnableWindowsTargeting` (needs the Windows targeting pack restore). | V(NETSDK1100) | Same |
| 35 | MSB3539 (1) | `warning MSB3539: The value of the property "BaseIntermediateOutputPath" was modified after it was used by MSBuild which can lead to unexpected build results.` | `BaseIntermediateOutputPath` set in the csproj body, too late. Set it in `Directory.Build.props`. | V(MSB3539) | Same |
| 36 | MSB1011 (1) | `MSBUILD : error MSB1011: Specify which project or solution file to use because this folder contains more than one project or solution file.` | Two project/solution files in the folder (also `.sln` plus `.slnx`). Pass the file, or keep one (CS-BUILD-29). | V(MSB1011) | `.slnx` on SDK 8 is MSB1003 (csharp-procedures-upgrade-path) |
| 37 | NETSDK1083 (0) | `error NETSDK1083: The specified RuntimeIdentifier 'linux-x65' is not recognized.` | A typo in `RuntimeIdentifier`. | V(NETSDK1083) | Same |
| 38 | exit 155 (-) | `A compatible .NET SDK was not found. Requested SDK version: 99.0.100  global.json file: .../global.json` | global.json asks for an SDK that is not installed, with `disable` or `latestPatch` and no matching band. Install the SDK (section 6). | `dotnet --version >/dev/null 2>&1; echo $?` prints `0` | Same |

#### 3.3 Compiler (CS)

| # | Code (N) | First line (observed) | Cause and fix | Verify | net8 vs net10 |
|---|---|---|---|---|---|
| 39 | CS0246 (93) | (a) `error CS0246: The type or namespace name 'Newtonsoft' could not be found (are you missing a using directive or an assembly reference?)` (b) `error CS0246: The type or namespace name 'List<>' could not be found ...` | (a) a missing PackageReference. (b) a BCL type with no `using`: a hand-written csproj without `<ImplicitUsings>enable</ImplicitUsings>`. Decide by whether the name is a BCL type; `dotnet new` adds ImplicitUsings and Nullable, a hand-written project does not. | V(CS0246) | Same; `ImplicitUsings` is the C# 10 / net6 template default |
| 40 | CS0012 (16) | `error CS0012: The type 'Foo' is defined in an assembly that is not referenced. You must add a reference to assembly 'X, Version=2.0.0.0, ...'.` | A referenced assembly (`Mid`) needs `X` and `X` is not passed to the compiler (a `Reference` with `HintPath` does not bring its dependencies). Reference `X` directly. | V(CS0012) | Same |
| 41 | CS8032 (11, unrep) | not reproduced | Not claimed. Same family by name (an analyzer that cannot load) but the cause was not watched. | - | - |
| 42 | CS0518 (10) | `error CS0518: Predefined type 'System.Runtime.CompilerServices.IsExternalInit' is not defined or imported` (also `System.Index`) | A C# 9+ feature on netstandard2.0. Add the polyfill type (an internal `IsExternalInit` class fixed the watched case); follow CS-BUILD-06. | V(CS0518) | netstandard2.0 only; net8.0+ has the type |
| 43 | CS1705 (9) | `error CS1705: Assembly 'Mid' with identity 'Mid, Version=1.0.0.0, ...' uses 'X, Version=2.0.0.0, ...' which has a higher version than referenced assembly 'X' with identity 'X, Version=1.0.0.0, ...'` | The MSB3277 situation reaching the compiler. Reference the higher version. | V(CS1705) | Same |
| 44 | CS9057 (8) | `warning CS9057: The analyzer assembly '.../microsoft.codeanalysis.publicapianalyzers/5.6.0/analyzers/dotnet/Microsoft.CodeAnalysis.PublicApiAnalyzers.dll' references version '4.12.0.0' of the compiler, which is newer than the currently running version '4.11.0.0'.` | The analyzer needs a newer Roslyn than the SDK's compiler. Watched: SDK 8.0.425 + analyzer 5.6.0 warns; SDK 10.0.401 + the same net8.0 project is clean; analyzer 3.3.4 on SDK 8 is clean. Use the newer SDK, or pin the analyzer lower. Do not NoWarn it: an analyzer that did not load enforces nothing. | V(CS9057) | **SDK-bound, not TFM-bound**: the net8.0 TFM is fine, the SDK 8 compiler is the problem |
| 45 | CS0656 (6) | `error CS0656: Missing compiler required member 'System.Runtime.CompilerServices.RequiredMemberAttribute..ctor'` | `required` on netstandard2.0. Polyfill `RequiredMemberAttribute` and `CompilerFeatureRequiredAttribute` (CS-BUILD-06). The green twin was not built (reds only). | V(CS0656) | netstandard2.0 only |
| 46 | CS9035 (5) | `error CS9035: Required member 'P.X' must be set in the object initializer or attribute constructor.` | A `required` member not set. Set it, or add `[SetsRequiredMembers]` to the constructor that does. | V(CS9035) | C# 11+, same on both |
| 47 | CS8370 (3) | `error CS8370: Feature 'top-level statements' is not available in C# 7.3. Please use language version 9.0 or greater.` | A project on an old default LangVersion (netstandard2.0 / net framework default is 7.3). Set `LangVersion` in props (CS-BUILD-04). | V(CS8370) | Defaults by TFM: net8.0 = C# 12, net10.0 = C# 14 |
| 48 | CS0234 (-) | `error CS0234: The type or namespace name 'Span<>' does not exist in the namespace 'System' (are you missing an assembly reference?)` | `Span<T>` on netstandard2.0 needs `System.Memory`. Reds only. | V(CS0234) | netstandard2.0 only |

#### 3.4 Analyzer noise under TreatWarningsAsErrors

| # | Code (N) | First line (observed) | Cause and fix | Verify | net8 vs net10 |
|---|---|---|---|---|---|
| 49 | CS8602 | `error CS8602: Dereference of a possibly null reference.` (fixture `twae/red`) | Nullable flow warning promoted. Fix the null path at the site. | V(CS8602) | Same |
| 50 | CS4014 / CS1998 | `error CS4014: Because this call is not awaited, execution of the current method continues before the call is completed. Consider applying the 'await' operator to the result of the call.` | Fire-and-forget or an async method with no await. Await it, or discard with `_ =` and a reason (CS-ASYNC rules). | V(CS4014) | Same |
| 51 | CS1591 (muted in 19 of 35 exemplars) | not in the first error list of `twae/red` although `GenerateDocumentationFile` is on | CS1591 is suppressed by the compiler while other errors exist; it appears only after the others are fixed. Re-run until `0 Error(s)` (CS-BUILD-14). Fix by documenting; do not mute. | V(CS1591) after the other errors are gone | Same |

#### 3.5 Trim and AOT (IL)

These fire only with `IsTrimmable`, `IsAotCompatible`, `EnableTrimAnalyzer` or on publish (fixture `trim/`). Not re-run on SDK 8.

| # | Code (N) | First line (observed) | Cause and fix | Verify | net8 vs net10 |
|---|---|---|---|---|---|
| 52 | IL2026 (68) | `warning IL2026: Using member 'System.Text.Json.JsonSerializer.Deserialize<TValue>(String, JsonSerializerOptions)' which has 'RequiresUnreferencedCodeAttribute' can break functionality when trimming application code. JSON serialization and deserialization might require types that cannot be statically analyzed ...` | Reflection-based JSON in a trimmable library. Use the source-generated overload with a `JsonSerializerContext` (CS-JSON rules). | V(IL2026) | Same analyzers; not measured on SDK 8 |
| 53 | IL3050 (43) | `warning IL3050: Using member '...Deserialize<TValue>(...)' which has 'RequiresDynamicCodeAttribute' can break functionality when AOT compiling.` | Same call, the AOT side. Same fix; both disappear together. | V(IL3050) | Same |
| 54 | IL2075 (22) | `warning IL2075: 'this' argument does not satisfy 'DynamicallyAccessedMemberTypes.PublicMethods' in call to 'System.Type.GetMethod(String)'. The return value of method 'System.Object.GetType()' does not have matching annotations.` | `GetType().GetMethod(...)`. Annotate the source with `[DynamicallyAccessedMembers(PublicMethods)]` or avoid reflection. | V(IL2075) | Same |
| 55 | IL2070 (15) | `warning IL2070: 'this' argument does not satisfy 'DynamicallyAccessedMemberTypes.PublicMethods' in call to 'System.Type.GetMethod(String)'. The parameter 't' of method 'Lib.P.ByParam(Type)' does not have matching annotations.` | Same, for a `Type` parameter: annotate the parameter. | V(IL2070) | Same |
| 56 | IL2104 (9) | `warning IL2104: Assembly 'Reflecty' produced trim warnings. For more information see https://aka.ms/il2104` | A **package** assembly is not trim-safe; this is a one-line summary. `-p:TrimmerSingleWarn=false` expands it into the per-method `ILLink : Trim analysis warning IL2026: Lib.P.Parse(String): ...` lines (watched). You cannot fix it at your site: replace the package or ask the owner. | `dotnet publish -r linux-x64 -v:q 2>&1 \| grep -c IL2104` prints `0` | Same |
| 57 | IL3053 (7) | `warning IL3053: Assembly 'Reflecty' produced AOT analysis warnings.` | The AOT twin of IL2104. | `dotnet publish -r linux-x64 -p:PublishAot=true -v:q 2>&1 \| grep -c IL3053` prints `0` | Same |

#### 3.6 Tests (Microsoft.Testing.Platform)

| # | Code (N) | First line (observed) | Cause and fix | Verify | net8 vs net10 |
|---|---|---|---|---|---|
| 58 | MTP exit 5 (84) | `Exit code: 5` / `Test run summary: Zero tests ran` | Invalid arguments: an unknown option, a VSTest flag (`--logger`, `--collect`, `--filter` on an xunit v3 project), or an extension option whose package is not referenced (`--report-trx` needs `Microsoft.Testing.Extensions.TrxReport`; `--report-xunit-trx` worked with xunit v3). Run `dotnet run -- <args>` to see `Unknown option '--not-an-option'` ([MTP troubleshooting](https://learn.microsoft.com/en-us/dotnet/core/testing/microsoft-testing-platform-troubleshooting)). | `cd "$F/mtp/pass" && dotnet run -- --not-an-option 2>&1 \| grep -c 'Unknown option'` prints `1` (red); `dotnet test --report-xunit-trx; echo $?` prints `0` (green) | SDK 8: `dotnet test` with an MTP-only project is a false green (below) |
| 59 | MTP exit 8 (74) | `Zero tests ran` then `Exit code: 8` | The filter matched nothing, or the project has no tests. Do not ignore it (`--ignore-exit-code 8` hides a broken filter). With an explicit minimum the code is 9: `Test run summary: Minimum expected tests policy violation, tests ran 1, minimum expected 5`. | `dotnet test --minimum-expected-tests 1; echo $?` prints `0` | Whole-run zero-test verdict across modules needs SDK 11 ([troubleshooting](https://learn.microsoft.com/en-us/dotnet/core/testing/microsoft-testing-platform-troubleshooting)) |
| 60 | MTP VSTest target on SDK 10 | `error : Testing with VSTest target is no longer supported by Microsoft.Testing.Platform on .NET 10 SDK and later. If you use dotnet test, you should opt-in to the new dotnet test experience.` | SDK 10 needs `"test": { "runner": "Microsoft.Testing.Platform" }` in global.json. Green: the same project with that section exits 0. | `dotnet test; echo $?` prints `0` | **SDK 8 is the opposite failure**: no error, no tests (false green, exit 0). |

#### 3.7 Not in the tables: the no-diagnostic failures

Hangs, leftover processes, Terminal Logger noise and `dnx` have no code. They are sections 9 to 11.

### 4. Does the fix differ between net8 and net10?

For most codes the fix is the same; the difference is **whether the code appears at all**. Measured:

| Code or behaviour | net8 / SDK 8.0.425 | net10 / SDK 10.0.401 |
|---|---|---|
| NU1510 | no warning for a redundant reference | warning; delete the reference |
| NU1903 family | audits direct dependencies by default | audits transitive too (`all`); set `NuGetAuditMode` explicitly (CS-BUILD-26) |
| CS9057 | analyzer 5.6.0 warns (Roslyn 4.11 < 4.12) | same net8.0 project is clean |
| NETSDK1045 | SDK 8 cannot target net10.0 | SDK 10 cannot target net11.0 |
| `dotnet test` with MTP | silent exit 0 without running tests unless `TestingPlatformDotnetTestSupport=true` | needs global.json `test.runner`; otherwise an explicit error |
| `dotnet test T.csproj` (positional) | not applicable (VSTest bridge) | worked on 10.0.401 in this run (`MTP-positional-red` printed no error and exit 0); `--project T.csproj` also worked (`MTP-project-opt-green`) |
| `.slnx` | MSB1003 | supported (CS-BUILD-29) |
| NU1202 | fires on the net8.0 leg for a net10-only package | fires only if a TFM is below the package's lowest |
| `dnx` | `dotnet dnx` does not exist (`dotnet-dnx does not exist`) | exists; the `dnx` script bypasses global.json |

Not measured on SDK 8: the IL codes, NETSDK1194, NETSDK1210, MSB4018.

### 5. Capturing diagnostics: the extractor, the duplicate line, the binlog

Watched on `cs0012/red` (one CS0012 error):

| Command | Count of `error CS0012` lines |
|---|---|
| `dotnet build --no-incremental` | 2 |
| `... -clp:NoSummary` | 2 (the summary copy was still printed) |
| `... -v:q -tl:off` | 2 |
| `... -clp:ErrorsOnly` (also `-clp:ErrorsOnly;NoSummary`) | 1 (errors only; warnings are dropped; `Build FAILED.` and the counts still print) |
| `dotnet msbuild x.binlog -nologo -tl:off -v:q` (replay of `-bl:x.binlog`) | 1 |

So: capture normally, extract with `grep -E '(error|warning) [A-Z]+[0-9]+:' | sort -u` (keeps warnings), and when a log is ambiguous record `-bl:x.binlog` and replay it. A binlog was 391.8 KB for a one-file project. `-clp:ErrorsOnly` gives one copy per error but hides the warnings that explain a TWAE failure, so use it only for a quick "what broke" view. The `-getProperty:`, `-getItem:` and `-preprocess` switches evaluate without building (MSBuild command-line reference); they are the tools for "why is this property this value".

### 6. SDK resolution and global.json failures (silent fallbacks)

| Case | Fixture | Observed | Exit |
|---|---|---|---|
| Version not installed, `rollForward: disable` | `gj/red-nomatch` (`99.0.100`) | `A compatible .NET SDK was not found. Requested SDK version: 99.0.100  global.json file: ...` | 155 |
| `10.0.100` + `latestPatch`, only 10.0.4xx installed | `gj/red-latestpatch` | the same message (a different feature band is not a patch) | 155 |
| Same + `latestFeature` | `gj/green-latestfeature` | builds | 0 |
| Exact `10.0.401` | `gj/green-exact` | `dotnet --version` prints `10.0.401` | 0 |
| Trailing comma / truncated JSON | `gj/red-badjson` | `dotnet --version` prints `11.0.100-rc.1.26425.128` (newest, prerelease). The build then fails with 22 lines, the first `error MSB4242: SDK Resolver Failure: "The SDK resolver "Microsoft.DotNet.MSBuildWorkloadSdkResolver" failed ...` and a `JsonReaderException` stack | 1 |
| `"version": "10.0"` | `gj/red-badversion` | `Version '10.0' is not valid for the 'sdk/version' value` appears only in `dotnet --info`; the build uses the newest SDK and does not fail | 0 |
| `errorMessage` set (new in SDK 10) | `gj/green-errormsg` | the custom text `Run ./install.sh to install the pinned SDK (see global.json).` is printed | 155 |
| Comments in global.json | `gj/green-comments` | accepted | 0 |

The [global.json reference](https://learn.microsoft.com/en-us/dotnet/core/tools/global-json) confirms: no global.json, or no `version`, means "the highest installed SDK, prereleases considered when not in Visual Studio". The malformed-file fall-through is a consequence of that default. Two pinned-SDK facts to carry: `version` needs all three parts, and `rollForward: disable` is advised with lock files. The pin policy itself is CS-BUILD-20 and the entry-point assertion is CS-BUILD-21.

### 7. Directory.Build.props layering (BD-13)

MSBuild imports **one** `Directory.Build.props`: the nearest one found walking up. A nearer file hides every parent unless it imports the parent explicitly.

| | `layer/red` | `layer/green` |
|---|---|---|
| Files | `layer/Directory.Build.props` sets `TreatWarningsAsErrors=true`; `layer/red/Directory.Build.props` sets only `Deterministic` | the same, but the nearer file starts with `<Import Project="$([MSBuild]::GetPathOfFileAbove('Directory.Build.props', '$(MSBuildThisFileDirectory)../'))" />` |
| `dotnet msbuild -getProperty:TreatWarningsAsErrors` in `src/` | empty | `true` |
| `dotnet build` | `warning CS0168: The variable 'unused' is declared but never used` (exit 0) | `error CS0168` (exit 1) |

So the symptom of a shadowed parent is a **gate that quietly stops gating**, not an error. Diagnose with `-getProperty:` (value) and `-preprocess` (which file set it): both are in the MSBuild reference. The props policy (TFMs only in the root file, TWAE from props) is CS-BUILD-01 and CS-BUILD-13. Related: MSB3539 (entry 35) when `BaseIntermediateOutputPath` is set too late.

### 8. NU1510 pruning (BD-16)

Entry 8. Watched: `System.Text.Json` referenced explicitly on net10.0 gives NU1510 (exit 0); the same reference on net8.0 gives nothing; deleting the reference clears it. Under TWAE it fails restore, which is why 5 exemplars carry `NoWarn NU1510` while keeping a dead reference (csharp-build). The fix is CS-BUILD-28 (delete); `RestoreEnablePackagePruning=false` is forbidden there.

### 9. Terminal Logger and --interactive (BD-17)

Measured with a pseudo-terminal of 120x40 (`hang/tl.py`) and a pipe, same project (`hang/multi`):

| Mode | Bytes | ANSI escapes |
|---|---|---|
| pty, default | 1005 | 19 |
| pty, `--tl:off` | 776 | 6 |
| pty, `--tl:off -v:q` | 126 | 6 |
| pty, `CI=true` | 776 | 6 |
| pty, `GITHUB_ACTIONS=true` | 776 | 6 |
| pty, `MSBUILDTERMINALLOGGER=off` | 776 | 6 |
| pty, `--tl:on` / `--tl:auto` | 1005 | 19 |
| pipe, default | 720 | (not counted; the logger is off) |

- The doc: `-tl:auto` "use the terminal logger only if the standard output is not redirected. Don't parse the output or otherwise rely on it remaining unchanged" ([MSBuild reference](https://learn.microsoft.com/en-us/visualstudio/msbuild/msbuild-command-line-reference)).
- So an agent in a pty gets Terminal Logger unless `CI` or `GITHUB_ACTIONS` is set. Pass `-tl:off` anyway (CS-BUILD-30). Six escapes remain with it off (console colour); I did not test `NO_COLOR`.
- `--interactive`: CS-BUILD-30 records that it defaults on in interactive terminals since .NET 10. The MSBuild reference warns: "Don't use this argument in an automated scenario where interactivity is not expected." Watched against a 401 feed: with and without `--interactive`, the result was the same NU1301 with a 401 line, and no prompt, because no credential provider is installed. A prompt-blocked agent is therefore a risk only where a provider exists; that case was not reproduced.
- Exemplars: `-tl:off` appears in 2 of 35 (BenchmarkDotNet, `dotnet__BenchmarkDotNet@61ebda8a50ae:.github/workflows/run-tests-selected.yaml:83`).

### 10. dnx (BD-18)

Under `global.json` pinning SDK 8.0.425 with `rollForward: disable` (`dnx/sdk8`):

| Command | Observed |
|---|---|
| `dotnet --version` | `8.0.425` |
| `dotnet dnx --help` | `Could not execute because the specified command or file was not found.` ... `dotnet-dnx does not exist` |
| the `dnx` shell script that ships beside `dotnet`, `--help` | runs: `Executes a tool from source without permanently installing it.` |
| SDK that script selects | the last line of `dotnet --list-sdks`: `11.0.100-rc.1.26425.128` |

So `dnx` resolves the newest installed SDK, prerelease included, ignoring the pin. That matches the upstream commit cited in csharp-build and the rule CS-BUILD-22 (never call `dnx`). I did not test whether it prompts before running a tool when stdin is not a terminal.

### 11. Hangs: build servers, Exec, pipes (BD-20)

All on SDK 10.0.401, multi-project solution `hang/multi` (3 projects), run through a pipe-capturing harness (`hang/multi/run.py`). Leftovers are counted by an environment marker so other agents' processes on the host are not included.

| Case | Command | Leftover server processes |
|---|---|---|
| H0 | baseline after `dotnet build-server shutdown` | 0 |
| H1 | `build --no-incremental -m` | **4** |
| H1b | after `dotnet build-server shutdown` | 0 |
| H2 | `-m -nodeReuse:false` | **1** (the compiler server) |
| H3 | `-m -nodeReuse:false -p:UseSharedCompilation=false` | 0 |
| H4 | `MSBUILDDISABLENODEREUSE=1` + `-p:UseSharedCompilation=false` | 0 |
| H4b | `-m --disable-build-servers` | 0 |

- One flag does it all: `--disable-build-servers`. `-nodeReuse:false` alone is not enough, because the Roslyn compiler server (VBCSCompiler) stays. Exemplar use: coverlet sets `MSBUILDDISABLENODEREUSE: 1` (`coverlet-coverage__coverlet@ecd6fd5533e7:.github/workflows/dotnet.yml:138`); 5 of 35 repos disable node reuse in some form.
- **The piped-capture hang caused by these leftovers did not reproduce**: the harness returned in 1.2 s with leftovers present, on Linux, and on Windows (`hang/multi` copy). The failure mode is real for others: MedallionShell issue 104 reports `Command.Result` hanging in tests that run `dotnet build`, ending immediately when `dotnet build-server shutdown` is run, closed as "not planned" and moved to dotnet/sdk#34653 ([source](https://github.com/madelson/MedallionShell/issues/104)). The mechanism there is unconfirmed.
- **The Exec hang is real and measured.**

| Case | Command in the target | Wall time | Exit |
|---|---|---|---|
| H5 red | `<Exec Command="sleep 25 &amp;" />` (child inherits stdout) | **26.2 s** | 0 |
| H5 green | `<Exec Command="sleep 25 > /dev/null 2>&1 &amp;" />` | **1.2 s** | 0 |
| H6 | the red command with `Timeout="3000"` | **26.1 s** | 0 |

The shell exits at once; `Exec` waits for end-of-file on its output pipe, which the background child holds. `Timeout` did not bound it. This is the general .NET rule, not an MSBuild quirk: with redirected output, `WaitForExit` waits for the stream to finish, and a grandchild that inherited the handle keeps it open ([dotnet/runtime#29232](https://github.com/dotnet/runtime/issues/29232): "The expected behavior is that WaitForExit, when output is redirected, waits until the output has finished", closed as expected behaviour). The fix belongs in the child: redirect its stdio. The same principle for our own code is CS-PROC-13 (bound the drain after the process exits).
- **`Exec` also parses output.** A command that exits 0 but prints `tool.cs(1,1): error TOOL001: pretend diagnostics from a child tool` fails the build (exit 1, H7 red); with `IgnoreStandardErrorWarningFormat="true"` it passes (exit 0, H7 green). The [Exec doc](https://learn.microsoft.com/en-us/visualstudio/msbuild/exec-task) states it: the task "indicates a failure ... if a diagnostic message is found in the executable's standard error stream", and "If you only want `Exec` to indicate failure if the executable returns a non-zero exit code, then set `IgnoreStandardErrorWarningFormat` to `true`."
- **Windows**: MSB3027/MSB3021 on a locked apphost (entry 26). Red: build v1, start `bin\Debug\net10.0\App.exe` in the background, change source, build again: ten `MSB3026` retry warnings, then `error MSB3027 ... The file is locked by: "App (43792)"` and `error MSB3021`. Green: `taskkill /im App.exe /f`, rebuild, `Build succeeded`. Files: `$F/windows/{run-lock.bat,red.log,green.log}`.
- **Long paths**: not reproduced; the Windows host has `LongPathsEnabled=1` and a 5x40-character directory path built and restored (`windows/long.log`).

### 12. Microsoft.Testing.Platform exit codes

The documented table ([troubleshooting](https://learn.microsoft.com/en-us/dotnet/core/testing/microsoft-testing-platform-troubleshooting)) and what was watched (xunit.v3.mtp-v2 4.0.2, SDK 10.0.401):

| Exit | Meaning | Watched | Action |
|---|---|---|---|
| 0 | all ran, no errors | `T.dll (net10.0\|x64) passed` | none |
| 1 | unknown error | - | read the output |
| 2 | at least one test failed | `failed Tests.Fails (1ms)` | fix the test |
| 3 | session aborted (Ctrl+C) | - | rerun |
| 4 | invalid extension setup | - | check extension packages |
| 5 | invalid command-line arguments | `Exit code: 5` | run `dotnet run -- <args>` for the reason |
| 7 | crashed | - | use `--hangdump`/`--crashdump` (testfx uses `--hangdump --hangdump-timeout 15m`: `microsoft__testfx@7226b0c74729:azure-pipelines.yml:86`) |
| 8 | no tests discovered / all skipped | `Zero tests ran` | fix filter; never ignore |
| 9 | fewer tests than `--minimum-expected-tests` | `Minimum expected tests policy violation, tests ran 1, minimum expected 5` | investigate |
| 10 | adapter infrastructure failure | - | read output |
| 13 | `--maximum-failed-tests` reached | - | expected stop |
| 14 | coverage threshold failed | - | coverage |
| 6 | no longer produced | - | - |

`--ignore-exit-code 2;3;8` and `TESTINGPLATFORM_EXITCODE_IGNORE` exist; ignoring 8 hides a wrong filter. VSTest leftovers (`--logger trx`, `--collect "XPlat Code Coverage"`, `--filter`) exit 5 on an MTP project; `Microsoft.NET.Test.Sdk` can stay referenced without breaking (`MTP-vstestleft-pkg-coexists` passed). Exemplar MTP flags: `--report-trx` etc. in 10 of 35 (`App-vNext__Polly@e4476096da5b:eng/Test.targets:36`). The zero-test gate and exit table are CS-TEST-01..08; the no-VSTest-flags CI check is CS-CI-07.

SDK 8 false green (`mtp/sdk8-fail-red`): a net8.0 MTP-only project with one failing test, `dotnet test` on SDK 8.0.425 exit **0**, no `Failed!` line. With `<TestingPlatformDotnetTestSupport>true</TestingPlatformDotnetTestSupport>` (`mtp/sdk8-fail-green`): `Failed! - Failed: 1, Passed: 1, Skipped: 0, Total: 2` and exit **1**. `dotnet run` on the same project passed and ran the test on SDK 8.

### 13. Analyzer and warning noise under TreatWarningsAsErrors

- A `TreatWarningsAsErrors` build (`twae/red`) printed `error CS8602` and `error CS4014`; CS1591 did not appear in that first list although `GenerateDocumentationFile` was on. The compiler suppresses CS1591 while other errors exist (csharp-build), so the list shrinks and then CS1591 appears. Fix everything, then re-run until `0 Error(s)` (CS-BUILD-14).
- The exemplar answer to noise is suppression: CS1591 muted in 19 of 35 repos, NU1510 in 5, NU1903 in 4 (`csharp-audit/exemplar-build-and-gates.md`). The wave 1-2 answer is site-level suppression only (CS-BUILD-12). Both are consistent with this file: a code in the catalogue is fixed, not muted.
- The audit codes are the one deliberate exemption (CS-BUILD-26): `-warnaserror` on the command line overrides it (csharp-build C2). Entries 3, 7 and 12.

### 14. CI flags in the 35 exemplar repos

`bash $F/exemplar-flags/flags.sh` greps workflow, `eng/`, `build*`, and pipeline files in the 35 blob-less clones under `/home/mherwig/.cache/research-lang/exemplars/csharp` (output `flags.tsv`, first cite per flag in `cites.txt`). It does not follow reusable workflows, Azure DevOps templates, or Cake/Nuke scripts, so counts are floors.

| Flag or variable | Repos of 35 | First cite | Verdict |
|---|---|---|---|
| `actions/setup-dotnet` or `dotnet-install` | 30 | `adamralph__simple-exec@f80913246993:.github/workflows/ci.yml:26` | the SDK comes from the pin: `global-json-file` is used in 8 (`cake-build__cake@08885933e936:.github/workflows/build.yml:44`) |
| `--no-build` | 17 | `coverlet-coverage__coverlet@ecd6fd5533e7:.github/workflows/dotnet.yml:129` | safe only after a restore in the same job (NETSDK1004 otherwise) |
| `DOTNET_CLI_TELEMETRY_OPTOUT` | 16 | `App-vNext__Polly@e4476096da5b:.github/workflows/build.yml:13` | noise only |
| `--nologo` / `DOTNET_NOLOGO` | 15 | `adamralph__simple-exec@f80913246993:.github/workflows/ci.yml:9` | harmless; does not remove the diagnostic duplicate |
| `DOTNET_SKIP_FIRST_TIME_EXPERIENCE` | 15 | `App-vNext__Polly@e4476096da5b:.github/workflows/build.yml:16` | historical (pre-.NET 8 first-run message) |
| `--verbosity` / `-v:` | 15 | `App-vNext__Polly@e4476096da5b:.github/workflows/build.yml:279` | needed for a parseable log (use `-v:q` or `-v:m`) |
| VSTest flags (`--logger`, `--collect`, `--blame`, `--filter`) | 14 | `coverlet-coverage__coverlet@ecd6fd5533e7:eng/build-legacy.yml:42` | exit 5 on an MTP project |
| `NUGET_PACKAGES` / `actions/cache` | 14 | `App-vNext__Polly@e4476096da5b:.github/workflows/build.yml:64` | a cached packages folder masks NU1301: also run a cold restore (CS-BUILD-27) |
| `-maxcpucount` / `-m` | 11 | `App-vNext__Polly@e4476096da5b:.github/workflows/after-release.yml:86` | with `-m`, expect leftover nodes unless servers are disabled |
| `ContinuousIntegrationBuild` | 11 | `Azure__azure-sdk-for-net@32c48fc3d524:eng/Directory.Build.Common.props:148` | CI-conditional determinism (exemplar audit) |
| `timeout-minutes` | 10 | `anthropics__anthropic-sdk-csharp@ae16e5933f39:.github/workflows/ci.yml:23` | bounds a hang (CS-CI-03) |
| MTP flags (`--report-trx`, `--results-directory`, `--minimum-expected-tests`, `--coverage`) | 10 | `App-vNext__Polly@e4476096da5b:eng/Test.targets:36` | adopt `--minimum-expected-tests` |
| binary log `-bl` | 9 | `coverlet-coverage__coverlet@ecd6fd5533e7:.github/workflows/dotnet.yml:71` | upload as an artifact on failure |
| `--no-restore` | 8 | `coverlet-coverage__coverlet@ecd6fd5533e7:.github/workflows/dotnet.yml:71` | as `--no-build` |
| `-warnaserror` / `-p:TreatWarningsAsErrors` mentioned in CI or build scripts | 6 | `dotnet__sourcelink@6ec19dda0e19:eng/common/build.sh:193` | in command-line-api and sourcelink it is Arcade's `eng/common/build.*` option parser (`--warnAsError`), not a hard-coded flag; a hard-coded command-line form **contradicts CS-BUILD-13** (props, not command line) and overrides the audit exemption |
| `dotnet --info` / `--list-sdks` | 6 | `cake-build__cake@08885933e936:build.ps1:131` | the right first diagnostic step |
| node reuse off (`-nodeReuse:false`, `MSBUILDDISABLENODEREUSE`, `--disable-build-servers`) | 5 | `coverlet-coverage__coverlet@ecd6fd5533e7:.github/workflows/dotnet.yml:138` | adopt `--disable-build-servers` |
| `--blame-hang` / `--hangdump` | 4 | `microsoft__testfx@7226b0c74729:azure-pipelines.yml:86`; `npgsql__npgsql@9c47244547c2:.github/workflows/build.yml:320` | the hang answer for exit 7 / timeouts |
| `-tl:off` | 2 | `dotnet__BenchmarkDotNet@61ebda8a50ae:.github/workflows/run-tests-selected.yaml:83` | CS-BUILD-30 asks for it |
| `NuGetAudit*` flags in CI files | 1 | `App-vNext__Polly@e4476096da5b:eng/Common.props:9` | audit lives in props (CS-BUILD-26) |
| `--locked-mode` / `RestoreLockedMode` | 1 | `microsoft__testfx@7226b0c74729:.github/workflows/unskip-closed-tests-prepare.md:34` | others set it in props under `CI` (exemplar audit) |
| `--interactive false` / `DOTNET_CLI_INTERACTIVE` | 0 | - | no exemplar sets it |

### 15. Verified on the toolchain

Host: linux-x64 (WSL2), SDK 8.0.425, 10.0.401, 11.0.100-rc.1.26425.128 from the ocx index via `/home/mherwig/.cache/research-lang/dotnet-tools/run.sh`. Windows: SDK 10.0.102, `C:\Users\ecom\csharp-wintest\diagnose\` (copies in `$F/windows/`).

Re-run everything: `bash $F/verify-all.sh` (5 min; rewrites `$F/results.txt`, 182 lines). Each case line: `label exit=N hits=N | first matching line`.

| Fixture (under `$F`) | Exact command | Red (observed) | Green (observed) |
|---|---|---|---|
| `nu1102/{red,green}` | `dotnet restore --force` | `exit=1`, `error NU1102: Unable to find package acme.b with version (>= 9.0.0)` | `exit=0`, 0 hits |
| `nu1101`, `nu1103`, `nu1202`, `nu1302` | same | `NU1101` (exit 1); `NU1103 ... (>= 0.0.1)` (exit 1); `NU1202 ... not compatible with net8.0` (exit 1); `NU1302 ... 'HTTP' source` (exit 1) | each exit 0, 0 hits |
| `nu1301/red` | `dotnet restore --force --packages <fresh dir>` | `exit=1`, `error NU1301 ... https://127.0.0.1:9/v3/index.json` | cached packages folder: `exit=0` (`NU1301-red-cachemask`) |
| `auth401/red` (stub server returning 401) | `dotnet restore --force`; and with `--interactive` | `exit=1`, `error NU1301 ...` + `Response status code does not indicate success: 401 (Unauthorized)`, both runs | not reached (stub could not serve a service index) |
| `nu1605`, `nu1608`, `nu1701`, `nu1504` | `dotnet restore --force` | `error NU1605: Warning As Error: ...` (exit 1); NU1608 warning; NU1701 warning with 7 .NETFramework TFMs; NU1504 warning | each 0 hits after the fix |
| `nu1510/{red,green}` and the net8 twin | `dotnet restore` | net10: `warning NU1510: PackageReference System.Text.Json will not be pruned.` | reference deleted: 0 hits; net8.0: 0 hits |
| `nu1008`, `nu1010`, `nu1011`, `nu1507`, `nu1004` | `dotnet restore` (`CI=true` for NU1004) | the five first lines in section 3.1 | exit 0 |
| `nu1903/{red,red-twae,green}`, `nu1900/red` | `dotnet restore` | `warning NU1903 ... Newtonsoft.Json 12.0.3 ... GHSA-5crp-9r3c-p9vr`; TWAE: `error NU1903: Warning As Error`; down audit source: `warning NU1905` | upgraded: 0 hits |
| `netsdk1045/{red,green,sdk8-red,sdk11-green}` | `dotnet build` | `error NETSDK1045 ... targeting .NET 11.0` (SDK 10); `... .NET 10.0` (SDK 8) | net10.0: 0; SDK 11 on net11.0: 0 |
| `netsdk1004`, `1022`, `1083`, `1100`, `1194`, `1210` | `dotnet build` | the first lines in section 3.2 | each 0 hits |
| `msb4236`, `msb1011`, `msb4019`, `msb4057`, `msb3073`, `msb3539` | `dotnet build` | first lines in 3.2 | each 0 hits |
| `gj/red-nomatch`, `red-latestpatch`, `red-badjson`, `red-badversion` vs `green-latestfeature`, `green-exact` | `dotnet build`; `dotnet --version`; `dotnet --info` | exit 155 (x2); `--version` prints `11.0.100-rc.1.26425.128`; `Version '10.0' is not valid` | exit 0; `--version` prints `10.0.401` |
| `msb3277/{red,green}`, `cs0012`, libs `asm/` | `dotnet build --no-incremental` (PublicSign strong-named assemblies from `asm/mk.sh`) | `warning MSB3277 ... "X"` + `error CS1705`; `error CS0012 ... assembly 'X, Version=2.0.0.0'` | each 0 hits after referencing `X` v2 |
| `layer/{red,green}/src` | `dotnet build`; `dotnet msbuild -getProperty:TreatWarningsAsErrors` | `warning CS0168` exit 0; property empty | `error CS0168` exit 1; property `true` |
| `cs0246/{red,red-usings}` | `dotnet build` | `CS0246 ... 'Newtonsoft'`; `CS0246 ... 'List<>'` | each 0 hits |
| `cs0518/{red-init,red-required,red-index,red-span,green-init}` | `dotnet build` | `CS0518 ... IsExternalInit`; `CS0656 ... RequiredMemberAttribute..ctor`; `CS0518 ... System.Index`; `CS0234 ... 'Span<>'` | `green-init` (internal `IsExternalInit` class): 0 hits |
| `cs9057/{red-sdk8,green-sdk8,green-sdk10}` | `dotnet build` | SDK 8.0.425: `warning CS9057 ... references version '4.12.0.0' ... currently running version '4.11.0.0'` | analyzer 3.3.4 on SDK 8: 0 hits; analyzer 5.6.0 on SDK 10: 0 hits |
| `cs8370`, `cs9035`, `twae/{red,green}` | `dotnet build` | `CS8370`, `CS9035`, `CS8602` + `CS4014` errors | 0 hits |
| `trim/{red,il2075-red,pub-red,pub-aot-red}` and greens | `dotnet build` / `dotnet publish -r linux-x64` | `IL2026` (4 hits), `IL3050` (2), `IL2075`, `IL2070`, `IL2104`, `IL3053` | greens: 0 hits; `-p:TrimmerSingleWarn=false` expands IL2104 into `ILLink : Trim analysis warning IL2026: Lib.P.Parse(String)` |
| `mtp/{pass,fail,none,nogj,vstestleft,sdk8,sdk8-fail-red,sdk8-fail-green}` | `dotnet test ...` | exit 2 / 8 / 8 / 9 / 5 (x4); SDK 10 without runner: `error : Testing with VSTest target is no longer supported ...`; SDK 8: exit 0, no tests | `--report-xunit-trx` exit 0; with `test.runner`: exit 0; `TestingPlatformDotnetTestSupport`: exit 1 with `Failed!` |
| `dnx/sdk8` | `dotnet dnx --help`; the `dnx` script | `dotnet-dnx does not exist` | script runs; picks SDK 11.0.100-rc.1 |
| `hang/multi` | `dotnet build ... -m` via `run.py`, `pgrep` marker count | H1: 4 leftover | `--disable-build-servers`: 0 |
| `hang/exec-{red,green,timeout}` | `dotnet build` | 26.2 s; with `Timeout`: 26.1 s | 1.2 s |
| `hang/exec-pattern-{red,green}` | `dotnet build` | exit 1 for a command that printed `error TOOL001:` | exit 0 with `IgnoreStandardErrorWarningFormat` |
| `hang/71-tl.sh` | pty 120x40 | section 9 table | `--tl:off` 776 B |
| `windows/run-lock.bat` | `dotnet build` while `App.exe` runs | 10 x `MSB3026`, `error MSB3027 ... The file is locked by: "App (43792)"`, `error MSB3021` | after `taskkill`, `Build succeeded.` 0 warnings |

**Red/green tally: 58.** 45 pairs paired automatically by label in `results.txt` (a `-red` line with a nonzero exit or hits, and every `-green` line with exit 0 and 0 hits), 8 paired by hand (4 global.json, `LAYER`, `IL2104`, `IL3053`, SDK 8 false green), 1 Windows lock, and 4 hang pairs (H1/H1b, H2/H3, H5, H7). Not counted: reds without a green (CS0656, CS0234, `auth401`, `exec-timeout`), and unreproduced items.

**Frequency pass**: `bash $F/tracker-freq.sh NU1102 ...` logs to `$F/logs/tracker-freq-*.tsv`.

## Normative guidance candidates

Each rule: the rule, a one-line rationale, how a reviewer verifies it. Commands run from the repo root in a POSIX shell, and `F` is the fixture root above. "CS-BUILD-nn", "CS-PROC-nn" and so on are cited, never re-decided. New IDs here are `CS-DIAG-nn` candidates for the dotnet-diagnose skill.

1. **CS-DIAG-01 (MUST): capture every build once, unique, with the Terminal Logger off, and extract diagnostics with a fixed command.** `dotnet build -tl:off -nologo -v:q 2>&1 | tee build.log`, then `grep -E '(error|warning) [A-Z]+[0-9]+:' build.log | sort -u`. Rationale: the diagnostic prints twice and `-clp:NoSummary` did not remove the copy; `sort -u` does (CS-BUILD-30 for `-tl:off`). Verify: `cd "$F/cs0012/red" && dotnet build --no-incremental -tl:off -nologo -v:q 2>&1 | grep -E '(error|warning) [A-Z]+[0-9]+:' | sort -u | wc -l` prints `1`.
2. **CS-DIAG-02 (MUST): fix the first diagnostic by position, restore before compile.** Rationale: an NU error stops the build and later CS errors are cascades. Verify: `cd "$F/nu1102/red" && dotnet build -tl:off -nologo -v:q 2>&1 | grep -m1 -oE 'error [A-Z]+[0-9]+'` prints `error NU1102`.
3. **CS-DIAG-03 (MUST): check `dotnet --version` against global.json before diagnosing anything.** Rationale: a malformed global.json or `"version": "10.0"` is ignored and the newest SDK, prerelease included, is used (measured 11.0.100-rc.1); the build may fail with an unrelated `MSB4242`. Complements CS-BUILD-20 and CS-BUILD-21. Verify: `cd "$F/gj/green-exact" && test "$(dotnet --version)" = "$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' global.json)" && echo ok` prints `ok`, and the same command in `gj/red-badjson` prints nothing.
4. **CS-DIAG-04 (MUST): treat exit 155 as "SDK missing": install the pinned SDK, never delete global.json or widen `rollForward` to get past it.** Rationale: 155 is the only loud global.json failure; widening hides a real pin. Verify: `cd "$F/gj/red-nomatch" && dotnet build >/dev/null 2>&1; echo $?` prints `155`.
5. **CS-DIAG-05 (MUST): prove every restore fix into an empty packages folder.** Rationale: a warm global packages folder made a dead source exit 0 (NU1301 masked); CS-BUILD-27 sets the cold-restore CI step. Verify: `dotnet restore --force --packages "$(mktemp -d)" -v:q; echo $?` prints `0`.
6. **CS-DIAG-06 (MUST): fix NU1605 with a direct reference at the higher version, and NU1608 by aligning versions; never `NoWarn`.** Rationale: the SDK promotes NU1605 to an error itself, and direct-dependency-wins is by design. Verify: `grep -rnE --include='*.csproj' --include='*.props' --include='*.targets' 'NU16(05|08)' . ; test $? -eq 1 && echo clean` prints `clean`.
7. **CS-DIAG-07 (MUST): a 401 or 403 from a feed is a credential problem: stop and hand it to the owner. Do not loop, do not add `--interactive`.** Rationale: the 401 case gave the same NU1301 with and without `--interactive`, and no prompt. Verify: `cd "$F/auth401/red" && dotnet restore --force --packages "$(mktemp -d)" 2>&1 | grep -c '401 (Unauthorized)'` prints a number above `0` while the stub server (`python3 -I auth401/server401.py 18401`) runs.
8. **CS-DIAG-08 (MUST): delete a redundant PackageReference for NU1510 (CS-BUILD-28); say in the report that it appears on net10 only.** Rationale: NU1510 is silent on net8.0. Verify: `grep -rnE --include='*.props' --include='*.csproj' 'NU1510|RestoreEnablePackagePruning' . ; test $? -eq 1 && echo clean` prints `clean`.
9. **CS-DIAG-09 (MUST): solve MSB3277, CS1705 and CS0012 as one problem: reference the higher version of the shared strong-named assembly directly. Never `NoWarn MSB3277`.** Rationale: MSB3277 is the visible symptom; the failure is CS1705 (CS0012 if the dependency is not passed to csc). Verify: `cd "$F/msb3277/green" && dotnet build --no-incremental -tl:off -nologo -v:q 2>&1 | grep -cE 'MSB3277|CS1705|CS0012'` prints `0`.
10. **CS-DIAG-10 (MUST): for CS0246, decide first whether the missing name is a BCL type or a third-party one.** Rationale: a hand-written csproj lacks ImplicitUsings/Nullable that `dotnet new` adds, so `List<>` fails without a package problem. Verify: `cd "$F/cs0246/red-usings" && dotnet build -tl:off -nologo -v:q 2>&1 | grep -c CS0246` prints a number above `0`; with `<ImplicitUsings>enable</ImplicitUsings>` added it prints `0`.
11. **CS-DIAG-11 (MUST): on netstandard2.0, CS0518, CS0656 and CS0234 mean a missing polyfill; follow CS-BUILD-06, do not raise the TFM to escape.** Rationale: all three are netstandard2.0-only; an internal `IsExternalInit` class fixed the watched case. Verify: `cd "$F/cs0518/green-init" && dotnet build -tl:off -nologo -v:q 2>&1 | grep -cE 'CS0518|CS0656|CS0234'` prints `0`.
12. **CS-DIAG-12 (MUST): fix CS9057 by matching SDK and analyzer, never by `NoWarn`.** Rationale: an analyzer that fails to load enforces nothing; SDK 10 builds the same net8.0 project clean. Verify: `cd "$F/cs9057/green-sdk10" && dotnet build --no-incremental -tl:off -nologo -v:q 2>&1 | grep -cE 'CS9057|CS8032'` prints `0`.
13. **CS-DIAG-13 (MUST): fix IL2026, IL3050, IL2075 and IL2070 at the call site (source-generated JSON, `DynamicallyAccessedMembers`); IL2104 and IL3053 mean a package is not trim-safe, so expand with `-p:TrimmerSingleWarn=false` and replace the package or ask the owner.** Rationale: the package-level warnings cannot be fixed in your code. Verify: `cd "$F/trim/green" && dotnet build -tl:off -nologo -v:q 2>&1 | grep -cE 'IL2026|IL3050|IL2075'` prints `0`.
14. **CS-DIAG-14 (MUST): when MSB3073 appears, read the lines above it and run the command by hand; never set `IgnoreExitCode`.** Rationale: the code only says a command exited non-zero. Verify: `grep -rnE --include='*.csproj' --include='*.props' --include='*.targets' 'IgnoreExitCode="true"' . ; test $? -eq 1 && echo clean` prints `clean`.
15. **CS-DIAG-15 (MUST): an `Exec` must never background a child without redirecting its output, and `Timeout` is not a remedy.** Rationale: `Exec` waits for end-of-file on its pipe: 26.2 s with the child holding stdout, 26.1 s with `Timeout=3000`, 1.2 s redirected ([dotnet/runtime#29232](https://github.com/dotnet/runtime/issues/29232)). Verify (repo root; the fixture tree contains the red cases on purpose): `grep -rnE --include='*.csproj' --include='*.props' --include='*.targets' '<Exec[^>]*Command="[^"]*&amp;[[:space:]]*"' . | grep -v '&gt;' ; test $? -eq 1 && echo clean` prints `clean` (no Exec command ends in a background `&` without an output redirect).
16. **CS-DIAG-16 (SHOULD): an `Exec` of a tool that prints diagnostics shaped like MSBuild's must say whether they count.** Set `IgnoreStandardErrorWarningFormat="true"` when only the exit code should decide. Rationale: `error TOOL001:` from a command that exited 0 failed the build (H7). Verify: `cd "$F/hang/exec-pattern-green" && dotnet build -tl:off -nologo -v:q >/dev/null 2>&1; echo $?` prints `0`.
17. **CS-DIAG-17 (MUST): agent and CI builds run with the build servers disabled: `--disable-build-servers`.** Rationale: a default `-m` build left 4 server processes, `-nodeReuse:false` alone left 1 (the compiler server), `--disable-build-servers` left 0. Verify (a before/after count, because other builds may share the host): `cd "$F/hang/multi" && n0=$(pgrep -fc 'VBCSCompiler|MSBuild\.dll.*nodemode'); dotnet build All.slnx --no-incremental -m --disable-build-servers -tl:off -nologo -v:q >/dev/null 2>&1; n1=$(pgrep -fc 'VBCSCompiler|MSBuild\.dll.*nodemode'); test "$n1" -le "$n0" && echo ok` prints `ok` (without the flag the same check printed `n0=1 n1=5`, a leak).
18. **CS-DIAG-18 (MUST): wrap every `dotnet` invocation an agent makes in a timeout, and capture to a file.** Rationale: the hangs above give no diagnostic; a timeout is the only signal. `dotnet build-server shutdown` is the manual unblock for the MedallionShell-style report. Verify: `timeout 3 sleep 10; echo $?` prints `124`, and the harness uses the same form: `timeout 900 dotnet build -tl:off -nologo -v:q > build.log 2>&1; echo $?`.
19. **CS-DIAG-19 (MUST): never call `dnx` (CS-BUILD-22).** Rationale: it runs the newest installed SDK including a prerelease, ignoring global.json; `dotnet dnx` is absent under an SDK 8 pin. Verify: `grep -rnE '(^|[[:space:];&|(])dnx([[:space:]]|$)' .github eng ; test $? -eq 1 && echo clean` prints `clean`.
20. **CS-DIAG-20 (MUST): diagnose a property that "does not apply" with `-getProperty:` before editing anything; the usual cause is a nearer `Directory.Build.props` that does not import its parent.** Rationale: a shadowed parent made TWAE silently stop (warning instead of error). The layering rules are CS-BUILD-01 and CS-BUILD-13. Verify: `cd "$F/layer/green/src" && dotnet msbuild -getProperty:TreatWarningsAsErrors` prints `true`.
21. **CS-DIAG-21 (MUST): every `Directory.Build.props` below the root begins with the `GetPathOfFileAbove` import of its parent.** Rationale: MSBuild imports only the nearest file. Verify: `find . -name Directory.Build.props -not -path './Directory.Build.props' -not -path './node_modules/*' -print0 | xargs -0 -r grep -L 'GetPathOfFileAbove'` prints nothing.
22. **CS-DIAG-22 (MUST): read MTP exit codes by number, never ignore 8, and gate on a minimum.** Use `--minimum-expected-tests` (exit 9 if fewer ran). Rationale: 8 means the filter or discovery is wrong; `--ignore-exit-code 8` hides it. The gate and the table are CS-TEST-01..08. Verify: `cd "$F/mtp/pass" && dotnet test --minimum-expected-tests 5 >/dev/null 2>&1; echo $?` prints `9`.
23. **CS-DIAG-23 (MUST): diagnose MTP exit 5 with `dotnet run -- <the same arguments>`.** Rationale: under `dotnet test` the reason is hidden; `run` prints `Unknown option`. Verify: `cd "$F/mtp/pass" && dotnet run -- --not-an-option 2>&1 | grep -c 'Unknown option'` prints `1`.
24. **CS-DIAG-24 (MUST): on SDK 8, an MTP-only project needs `TestingPlatformDotnetTestSupport=true`, or tests are not run.** Rationale: `dotnet test` exited 0 with a failing test and no output. Verify: `cd "$F/mtp/sdk8-fail-green" && dotnet test >/dev/null 2>&1; echo $?` prints `1`.
25. **CS-DIAG-25 (MUST): on SDK 10, an MTP project needs `"test": { "runner": "Microsoft.Testing.Platform" }` in global.json (the exemplar form: `adamralph__simple-exec@f80913246993:global.json:7`).** Rationale: without it restore-time targets fail with `Testing with VSTest target is no longer supported`. Verify: `cd "$F/mtp/pass" && grep -c '"runner": "Microsoft.Testing.Platform"' global.json` prints `1`.
26. **CS-DIAG-26 (SHOULD, Windows): MSB3027/MSB3021 are fixed by stopping the process the message names, never by raising retries.** Rationale: the SDK prints `The file is locked by: "App (43792)"`; ten 1 s retries cannot outlast a running app. Verify: `grep -c 'The file is locked by' build.log` prints `0` after the process is stopped.
27. **CS-DIAG-27 (MUST): no catalogue code is silenced with NoWarn (extends CS-BUILD-12).** Rationale: muting hid NU1510 in 5 exemplars with dead references and NU1903 in 4. Verify: `grep -rnE --include='*.csproj' --include='*.props' --include='*.targets' '<NoWarn>[^<]*(NU1605|NU1608|NU1510|NU1701|NU190[0-5]|MSB3277|CS9057|CS8032|IL2026|IL3050|IL2104)' . ; test $? -eq 1 && echo clean` prints `clean`.

## AI-agent angle

- **The first error is the root, and an agent must find it by position.** Agents read the last lines of a log, which are the summary and the cascade. `grep -n -m1 -E 'error [A-Z]+[0-9]+'` on the whole file is the cheap discipline (rule 2).
- **The `NoWarn` reflex is the failure mode.** NU1510, NU1903, CS1591 and CS9057 are the codes most often muted by humans in the exemplars; an agent copying that behaviour makes the build green and the repo worse. Rule 27 is one grep.
- **Know the four things an agent must not fix alone**: a 401 (credentials), a missing SDK (install), a source not in nuget.config (policy), a lowered TFM (compatibility). Report them in one line with the exact command that would unblock.
- **Hangs look like thinking.** There is no output; run every command under `timeout` and write to a file. After a `Terminal Logger` pty run, an agent sees 19 escape sequences per short build; `-tl:off` removes most of them.
- **A clean build does not mean tests ran.** SDK 8 + MTP exited 0 with a failing test. Always read the count line (`total:`) or gate with `--minimum-expected-tests`.
- **A green restore proves little when the packages folder is warm.** Use the cold restore.
- **Windows: a locked file is a process, not a build bug.** The message names the process; the agent should ask before killing a process it did not start.
- **Token cost**: a full `GJ-badjson` failure prints 22 lines of stack trace for one malformed comma. `dotnet --version` (one line) finds it first.

## Contested / evolving

- **Suppress or fix CS9057.** BenchmarkDotNet maintainers said the warning "can be suppressed and doesn't affect functionality" ([issue 2863](https://github.com/dotnet/BenchmarkDotNet/issues/2863)); a contributor proposed multi-targeting the analyzer. Here a suppressed CS9057 means the analyzer silently does not run, so rule 12 forbids it. Depends on whether the analyzer is a gate (do not suppress) or advisory (suppress is defensible).
- **`-warnaserror` on the command line.** Six exemplar trees mention it (two only as Arcade's option parser). CS-BUILD-13 forbids it because it overrides the NU190x exemption (csharp-build C2). Depends on whether you need the audit job to be able to fail on an outage; if you do, command-line `-warnaserror` is exactly the tool, in the dedicated audit job only (CS-BUILD-26).
- **Exec pipe-wait semantics.** dotnet/runtime#29232 was closed in 2023 as expected behaviour and later marked a duplicate of a newer issue (#120452, October 2025) about callers with no control over child processes. The behaviour may change; the redirect fix works either way.
- **`dotnet test` and MTP across SDKs.** The whole-run zero-tests verdict across modules needs SDK 11; exit 8 is per module until then ([troubleshooting](https://learn.microsoft.com/en-us/dotnet/core/testing/microsoft-testing-platform-troubleshooting)). SDK 11 is RC1 here; re-measure at GA.
- **Terminal Logger output is explicitly unstable.** The MSBuild reference says not to parse it. If a future SDK defaults it on under `CI`, the `CI=true` observation in section 9 changes.
- **Historical-only guidance an agent will meet**: `DOTNET_SKIP_FIRST_TIME_EXPERIENCE` (15 exemplars, pre-.NET 8); `runtime.<RID>` NU1605 workarounds with `Microsoft.NETCore.Targets` (the NU1605 doc's example 3 targets .NET Core 1.x packages); `Microsoft.NET.Test.Sdk` as a requirement (it coexists with MTP but is not required); `/p:` and `/tl` slash switches (still work, `-p:` is the documented form); the NETSDK1045 doc's `netcoreapp3.0` / Visual Studio 2019 advice.
- **Unmeasured**: the credential-provider prompt with `--interactive`; the pipe hang from leftover nodes; IL codes on SDK 8; whether `dnx` prompts without a tty; MSB4018 and CS8032 first-hand.

## Sources

Primary = a Microsoft Learn page or a maintainer-owned repository issue. Dates are the page's last update or the issue's.

| # | URL | What it is | Date / era | Why worth reading |
|---|---|---|---|---|
| 1 | https://learn.microsoft.com/en-us/dotnet/core/tools/global-json | global.json reference: `rollForward` table, `paths`, `errorMessage`, `test.runner`, matching rules | updated 2026-04 (primary) | The default-newest-SDK rule that explains the silent malformed-file fallback |
| 2 | https://learn.microsoft.com/en-us/dotnet/core/testing/microsoft-testing-platform-troubleshooting | MTP exit codes 0-14, `--ignore-exit-code`, diagnostic env vars, exit 5 from missing extension packages | updated 2026-09 (primary) | The authoritative exit-code table and the exit-5 cause list |
| 3 | https://learn.microsoft.com/en-us/visualstudio/msbuild/msbuild-command-line-reference | MSBuild switches: `-nodeReuse`, `-getProperty`, `-preprocess`, `-bl`, `-clp`, `-tl`, `-interactive` | updated 2026-10 (primary) | The introspection flags and the "do not parse Terminal Logger output" warning |
| 4 | https://learn.microsoft.com/en-us/visualstudio/msbuild/exec-task | The `Exec` task: parameters and the failure rules | updated 2026-10 (primary) | States that a diagnostic-shaped line fails `Exec`; names `IgnoreStandardErrorWarningFormat` |
| 5 | https://learn.microsoft.com/en-us/nuget/reference/errors-and-warnings/nu1605 | NU1605 (package downgrade): four examples and fixes | updated 2024-08 (primary) | Confirms the SDK promotes NU1605 to an error and gives the direct-reference fix |
| 6 | https://learn.microsoft.com/en-us/dotnet/core/tools/sdk-errors/netsdk1045 | NETSDK1045 causes and checks | updated 2024-10 (primary; examples are .NET Core 3.0 era) | The standard checklist (global.json, PATH, MSBuildSDKPath, Directory.Build.props) |
| 7 | https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-build-server | `dotnet build-server shutdown` and what a build server is | current (primary) | What the shutdown command stops |
| 8 | https://learn.microsoft.com/en-us/nuget/concepts/auditing-packages | NuGet audit: NU1900-NU1905, `NuGetAuditMode`, `auditSources` | current (primary) | The audit codes and their severity keys |
| 9 | https://learn.microsoft.com/en-us/dotnet/core/deploying/trimming/fixing-warnings | Fixing trim warnings: `DynamicallyAccessedMembers`, `RequiresUnreferencedCode` | current (primary) | The call-site fix for IL2026/IL2070/IL2075 |
| 10 | https://github.com/dotnet/runtime/issues/29232 | `Process.WaitForExit` hangs when a grandchild holds redirected stdout | opened 2019, closed 2023-03-03, duplicate note 2025-10 (primary: runtime maintainers) | The maintainer statement of the wait-for-EOF rule behind the Exec hang |
| 11 | https://github.com/madelson/MedallionShell/issues/104 | `dotnet build` run from a test via MedallionShell hangs until `dotnet build-server shutdown`; moved to dotnet/sdk#34653 | closed not planned (exemplar-repo issue) | The only first-hand report of the build-server pipe hang; mechanism unconfirmed |
| 12 | https://github.com/dotnet/BenchmarkDotNet/issues/2863 | CS9057: analyzer 4.14 vs running compiler 4.11 under SDK 8.0.415 | BenchmarkDotNet 0.15.7 era (issue date not captured) | Real-world CS9057 and the suppress-vs-fix argument |
| 13 | https://github.com/aws/aws-sdk-net/issues/2989 | CS9057 after a Dependabot bump of an analyzer package | date not captured (compiler 4.3 era) | CS9057 reached through a dependency bump |
| 14 | https://github.com/neo-project/neo/pull/3083 | CS9057 with Akka.Analyzers (4.8 vs 4.7) | date not captured | A maintainer's note on Roslyn version-support limits |

Internal (not counted): `csharp-build.md` and `csharp-build/*.md` (CS-BUILD-01 to 30, audit-pipeline measurement C2); `csharp-procedures/csharp-procedures-upgrade-path.md` (SDK / TFM upgrade facts); `csharp-process.md` (CS-PROC-13); `csharp-testing/csharp-testing-framework-and-coverage.md` (MTP exit codes, CS-TEST-01..08); `csharp-crossplatform.md` (CS-CI-01..07); `csharp-audit/exemplar-build-and-gates.md` (35-repo counts). Exemplar clones: `/home/mherwig/.cache/research-lang/exemplars/csharp`.
