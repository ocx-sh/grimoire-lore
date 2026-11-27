---
title: Spillover check for dotnet-diagnose, delta refresh 2026-11
target: dotnet-diagnose
date_researched: 2026-11-27
model: sonnet
sources_fetched:
  - https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-test-mtp
  - https://learn.microsoft.com/en-us/dotnet/core/testing/microsoft-testing-platform-troubleshooting
  - https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/11/dnx-scripts-bypass-global-json
  - https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/11/nuget-pack-nu5052-packageid
  - https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/11/restore-global-packages-folder-version-search
  - https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/11/nuget-locks-directory-linux
  - https://learn.microsoft.com/en-us/nuget/release-notes/nuget-8.0
---

All sources are Microsoft Learn pages, which are primary (the vendor's own documentation). Files named below are under /home/mherwig/dev/ocx-sh/grimoire-lore/skills/dotnet-diagnose/.

## Item 1 (from csharp-quality): SDK 11 `dotnet test` exit codes 3, 13, 14 and whole-run exit 8; DN-RULE-02 allow-list needs re-measuring

Evidence in the pair: .agents/research/refresh-2026-11/csharp-quality/dotnet11-runtime-bcl-and-sdk-test-behaviour.md (lines 80-82, 111) and csharp-quality.md line 114 ("not measured").

Verdict: confirmed by primary source (documented, not re-measured on SDK 11.0.100 by anyone in this run).

Sources and dates:
- https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-test-mtp, ms.date 2026-11-19. `--timeout`: "A timed-out run exits with code 3. Available starting with .NET 11 and requires MTP 2.4 or later." `--maximum-failed-tests`: "The run exits with code 13. Available starting with .NET 11 and requires MTP 2.4 or later." "An aborted run exits with code 3." "An all-skipped whole run exits with code 8 regardless of the per-module `--zero-tests-policy` value" when no global minimum is set. The same page says `--nologo|--no-logo|--no-banner` is "Available in MTP mode starting with .NET 11", and that `--tl`, `--terminallogger` and `--tlp` are forwarded to MSBuild instead of the test application starting with .NET 11.
- https://learn.microsoft.com/en-us/dotnet/core/testing/microsoft-testing-platform-troubleshooting, ms.date 2026-09-21. Exit 13: "stopped due to reaching the specified number of maximum failed tests". Exit 14: "a compatible coverage collector published a failed coverage threshold evaluation". Exit 3: "the test session was aborted". The whole-run verdict "requires the .NET 11 SDK or a later version".

Affected text in the target:
- SKILL.md line 115-119: "On a Microsoft.Testing.Platform (MTP) project `dotnet test` takes no `--nologo`, `--tl:off`, `--interactive` or `--disable-build-servers`: each one is passed to the test app, which reports `Zero tests ran` and exit 5 (DN-DIAG-57)." On SDK 11 the docs say `--nologo` and `--tl` are accepted by `dotnet test` in MTP mode, so this sentence is true for SDK 10 only. The skill already states this evidence was measured on net10 (catalogue.md line 206 last cell: "net10; on net11-RC1 `--interactive` and `--disable-build-servers` still give it").
- SKILL.md lines 254-262: "Exit 1 (the `mono` module), 5, 8, 9 and 150 were measured on SDK 10.0.401 ... 3 and 7 are unverified: read only." and the table row "| 3 | The session was aborted | none |". Exit 3 is also now the `--timeout` exit on SDK 11; exits 13 and 14 are absent from the table.
- catalogue.md line 207 (DN-DIAG-58) last cell: "all; the whole-run verdict across modules needs SDK 11". Already correct.
- DN-RULE-02 itself is not in these files (only cited); the allow-list is the "never any of them on `dotnet test`" wording at catalogue.md line 25.

Smallest change: in the exit table, make row 3 read "The session was aborted (Ctrl+C), or on SDK 11 with MTP 2.4 a `--timeout` expired" and add one row "| 13 | SDK 11 only: `--maximum-failed-tests` stopped the run (needs MTP 2.4); exit 14: a coverage threshold failed | none |". Add "read 2026-11-27, not measured on SDK 11" to those rows. Leave the SDK 10 flag sentence as is, but append "(SDK 10.0.401; SDK 11 documents `--nologo` and `--tl` as accepted by `dotnet test` in MTP mode, not measured)". Do not add `--timeout` or `--maximum-failed-tests` to any command the skill runs, because the skill runs on SDK 10.

## Item 2 (from dotnet-build): DN-DIAG-05 should cite the dnx breaking-change page; candidate rows NU5052, NU1020, NU1102 change; NuGet Linux lock dir moves

Evidence in the pair: .agents/research/refresh-2026-11/dotnet-build/sdk-cli-msbuild-roslyn-behaviour.md section 3 (lines 52-59, 107), nuget-client-restore-and-pack.md lines 22 and 125, recent-shifts.md sections 1, 2 and 5, and dotnet-build.md lines 95-98.

### 2a. dnx breaking-change page

Verdict: confirmed by primary source.
Source: https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/11/dnx-scripts-bypass-global-json, ms.date 2026-11-10. "Version introduced: .NET 10 SDK 10.0.302, 10.0.400, and .NET 11". The scripts "use `dotnet --list-sdks` to identify the newest installed SDK ... bypassing the .NET muxer and any `global.json` SDK pinning." Recommended action: run `dotnet dnx` to restore the global.json behaviour.
Affected text: references/catalogue.md line 93: "| DN-DIAG-05 | none | The `dnx` script runs SDK 11 RC1 while `dotnet --version` says 8.0.425. | `dnx` ignores `global.json`. | Use `dotnet tool run` (CS-BUILD-22). | ..." and SKILL.md line 200: "`dnx` ignores `global.json`, so a script can run SDK 11 RC1 while `dotnet --version` says 8.0.425. Use `dotnet tool run`". The target cites no source and says "SDK 11 RC1".
Smallest change: in the DN-DIAG-05 cause cell write "The `dnx` script (SDK 10.0.302, 10.0.400 and 11) runs the newest installed SDK and bypasses `global.json` (https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/11/dnx-scripts-bypass-global-json, 2026-11-10)". The example "SDK 11 RC1" is a recorded measurement and may stay. Do not recommend `dotnet dnx` as a fix: the dotnet-build pair says that still floats the tool version, so `dotnet tool run` stays.

### 2b. NU5052

Verdict: confirmed by primary source.
Sources: https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/11/nuget-pack-nu5052-packageid (ms.date 2026-11-10): "Starting in .NET 11 (with `SdkAnalysisLevel >= 11.0.100`), packing a project whose `PackageId` doesn't meet the restricted rules emits warning NU5052"; suppress with `<NoWarn>NU5052</NoWarn>` or lower `SdkAnalysisLevel`. https://learn.microsoft.com/en-us/nuget/release-notes/nuget-8.0 (ms.date 2026-11-06) lists it under breaking changes, NuGet 8.0.0 in SDK 11.0.100.
Affected text: the target has no NU5052 row for a PackageId shape. The only NU5052 hit in the target is none; related text is catalogue.md line 60: "with NU5026 and reads `0` for NU5104 whatever the tree holds."
Smallest change: optional. Add one catalogue row "NU5052 | `warning NU5052` on `dotnet pack` | `PackageId` outside the nuget.org set (ASCII letters, digits, `.`, `-`, `_`, no consecutive `.` or `-`, at most 100 characters) on SDK 11 | Rename the id (transliterate to ASCII); never `NoWarn` it without the owner | `grep -c -e NU5052 pack.log` prints `0` | net11 only; read only, not reproduced". The dotnet-build pair itself calls this candidate unverified.

### 2c. NU1020

Verdict: confirmed by primary source (the NuGet release note), with the condition exact: "Report NU1020 when minimum publish age restrictions apply to floating versions during restore" (https://learn.microsoft.com/en-us/nuget/release-notes/nuget-8.0, ms.date 2026-11-06). The NU1020 page itself (ms.date 2026-11-03) was cited by the pair and not re-fetched here. The feature is opt-in (`minPublishAgeHours` on a source), so a repository that does not set it never sees NU1020.
Affected text: the target says nothing about NU1020 or `minPublishAgeHours`; its restore rows are DN-DIAG-06 to 22 (catalogue.md lines 99-111).
Smallest change: none required. Optional one row "NU1020 | floating version on a source with a nonzero `minPublishAgeHours` | Pin an exact version (CS-BUILD-23) | NuGet 8.0 / SDK 11 only".

### 2d. NU1102 from SDK 11 restore no longer searching the global packages folder

Verdict: confirmed by primary source.
Source: https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/11/restore-global-packages-folder-version-search, ms.date 2026-11-10. "Starting in .NET 11, restore searches only the package sources for the 'next best' version ... restore might select a higher version than before, or fail with an NU1102 error if no package source has a higher version." An exact version present in the global folder still restores.
Affected text: catalogue.md line 99: "| DN-DIAG-06 | NU1102 (42) | `Unable to find package acme.b with version (>= 9.0.0)` then `Nearest version: 2.0.0` | The id exists but no mapped source carries the version. | Take the printed nearest version, or map the source (CS-BUILD-27). | `grep -c -e NU1102 restore.log` prints `0` | all |". The row is still true; on SDK 11 the NU1102 can appear where SDK 10 gave NU1603 and picked a version from the cache. The row's last cell "all" overstates that the same input behaves the same on all SDKs.
Smallest change: append to the cause cell "On SDK 11 the nearest-version search ignores the global packages folder, so a version only the cache holds no longer rescues the restore (NU1603 on 10 becomes NU1102 on 11; compatibility/sdk/11/restore-global-packages-folder-version-search, 2026-11-10)". Note the skill restores with `--force` and may use a fresh `NUGET_PACKAGES`, so the effect is small.

### 2e. NuGet Linux lock directory moves to ~/.nuget/locks from SDK 11.0.200

Verdict: confirmed by primary source. Not confirmed that SDK 11.0.200 has shipped by 2026-11-27 (the page does not say; the pair also could not determine it).
Source: https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/11/nuget-locks-directory-linux, ms.date 2026-11-06. "Starting in .NET SDK 11.0.200, NuGet uses `~/.nuget/locks` instead of `/tmp/NuGetScratch{username}/locks` for inter-process locks on Linux, unless you set `NUGET_SCRATCH`." Mixed older and newer SDKs restoring concurrently "don't coordinate access to the global packages folder".
Affected text: the target says nothing about NuGet lock directories or `NUGET_SCRATCH`. grep for `NUGET_SCRATCH`, `/tmp/NuGet` and `locks` found only unrelated hits (DN-DIAG-17 packages lock file, DN-DIAG-25 assets lock file, DN-DIAG-27 file locked by a process).
Smallest change: none required, as the skill describes no concurrent restore. If a row for hung or contended restores on Linux is ever added, name `~/.nuget/locks` (SDK 11.0.200 and later) and `/tmp/NuGetScratch{username}/locks` (earlier) and `NUGET_SCRATCH`.
