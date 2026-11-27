---
title: dotnet-diagnose refresh decision, spillover round, 2026-11-27
target: dotnet-diagnose
date: 2026-11-27
model: opus
consolidates: /home/mherwig/dev/ocx-sh/grimoire-lore/.agents/research/refresh-2026-11/dotnet-diagnose/spillover-check.md
---

# dotnet-diagnose refresh decision, spillover round

## Verdict

Small in-place change. The spillover check carried two items, both confirmed by Microsoft Learn pages, which are primary sources. The first round of this refresh left the files under skills/dotnet-diagnose/ untouched (no working-tree diff against HEAD), so this round builds on the committed text.

Item 1 (from csharp-quality) makes two statements incomplete on SDK 11, which reached general availability in November 2026. The MTP flag sentence in SKILL.md (Capture) reads as if `--nologo` and `--tl` always give exit 5 on an MTP project. The SDK 11 `dotnet test` page documents both as accepted in MTP mode. The sentence becomes scoped to SDK 10.0.401, and the SDK 11 behaviour is added as read, not measured. The Test exit codes table gains the SDK 11 `--timeout` meaning of exit 3 and two rows, exit 13 and exit 14. The DN-RULE-02 advice to keep all four flags off `dotnet test` stays, because `--interactive` and `--disable-build-servers` still give exit 5 on 11 RC1 (measured) and the skill runs on SDK 10.

Item 2a (from dotnet-build) gives DN-DIAG-05 its primary source and the exact SDK versions in which the `dnx` script bypasses `global.json`. The fix `dotnet tool run` stays. Items 2b to 2e make no statement in the skill false and are declined.

No rule or step ID is added, changed or retired.

## Changed statements

1. SKILL.md, Capture, the MTP flag sentence. Before: on an MTP project `dotnet test` takes no `--nologo`, `--tl:off`, `--interactive` or `--disable-build-servers`, and each gives exit 5. After: the same statement, scoped to SDK 10.0.401, followed by the SDK 11 behaviour (`--nologo` and `--tl` documented as accepted in MTP mode, read 2026-11-27, not measured). Verification: `grep -c -e 'SDK 11 documents' skills/dotnet-diagnose/SKILL.md` prints `1`.
2. SKILL.md, Test exit codes, the measurement sentence. Before: "3 and 7 are unverified: read only." After: "3, 7, 13 and 14 are unverified: read only." Verification: `grep -c -e '3, 7, 13 and 14 are' skills/dotnet-diagnose/SKILL.md` prints `1`.
3. SKILL.md, Test exit codes, row 3. Before: "The session was aborted". After: the session was aborted, or a `--timeout` expired (the `dotnet test` option needs SDK 11 and MTP 2.4), unverified. Verification: `grep -c -e 'a `--timeout` expired' skills/dotnet-diagnose/SKILL.md` prints `1`.
4. references/catalogue.md, DN-DIAG-05, Cause cell. Before: "`dnx` ignores `global.json`." After: the `dnx` script (SDK 10.0.302, 10.0.400 and 11) runs the newest installed SDK and bypasses `global.json`, with the breaking-change page cited. The Fix cell (`dotnet tool run`, CS-BUILD-22) and the Verification cell are unchanged. The dotnet-build pair notes that the documented workaround `dotnet dnx` still floats the tool version, so it is not offered as the fix. Verification: `grep -c -e 'dnx-scripts-bypass-global-json' skills/dotnet-diagnose/references/catalogue.md` prints `1`.
5. references/catalogue.md, DN-DIAG-57, Era cell. Appends that SDK 11 documents `--nologo` and `--tl` as accepted (read only), so the cause cell's flag list is not read as true on SDK 11. Verification: `grep -c -e 'SDK 11 documents `--nologo`' skills/dotnet-diagnose/references/catalogue.md` prints `1`.

## New rules

No new DN-DIAG or DN-RULE ID. Two rows are added to the SKILL.md Test exit codes table, which is keyed by exit number, not by ID:

- Exit 13: `--maximum-failed-tests` stopped the run at that many failures (the `dotnet test` option needs SDK 11 and MTP 2.4), routed to DN-DIAG-79 because the run holds failing tests. Unverified: read only.
- Exit 14: a coverage collector reported a failed coverage threshold. Unverified: read only. No row: it is a coverage policy result, and the skill has no coverage row.

Verification for both: `grep -c -E '^\| 1[34] \|' skills/dotnet-diagnose/SKILL.md` prints `2`. A competent agent that sees exit 13 or 14 without the table would otherwise read them as unknown failures, which is why they earn a line each. `--timeout` and `--maximum-failed-tests` are not added to any command the skill runs, because its commands are measured on SDK 10.

## Declined

- Item 1, the SDK 11 whole-run exit 8 for an all-skipped run regardless of the per-module `--zero-tests-policy`. Confirmed, but the skill names no `--zero-tests-policy`, and DN-DIAG-58 already says the whole-run verdict across modules needs SDK 11. Nothing to correct.
- Item 2b, a new NU5052 row for a `PackageId` outside the restricted set on SDK 11 pack. Confirmed by primary source, but no statement in the skill is false, the pair itself calls the row unreproduced, and Procedure step 3 already covers a code with no row (read the Learn page for the code and fix the cause; do not add a row).
- Item 2c, an NU1020 row for `minPublishAgeHours`. Confirmed, but the feature is opt-in per source, no text in the skill touches it, and step 3 covers the code.
- Item 2d, an SDK 11 note on DN-DIAG-06 that restore no longer searches the global packages folder for the nearest version. Confirmed, but the row stays true: its cause (no mapped source carries the version) and its fix hold on SDK 11, and its era tag `all` is defined as SDK 8.0.425 and 10.0.401. An NU1102 that first appears after moving to SDK 11 follows an SDK change, which is the `dotnet-upgrade` skill's scope, not this one's.
- Item 2e, the NuGet Linux lock directory moving to `~/.nuget/locks` from SDK 11.0.200. Confirmed by primary source, but the skill describes no concurrent restore and names no lock directory, and the check could not confirm that SDK 11.0.200 has shipped by 2026-11-27.

## Sources

- https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-test-mtp, ms.date 2026-11-19: `--timeout` exits 3 and `--maximum-failed-tests` exits 13, both "Available starting with .NET 11 and requires MTP 2.4 or later"; an aborted run exits 3; `--nologo|--no-logo|--no-banner` "Available in MTP mode starting with .NET 11"; `--tl`, `--terminallogger` and `--tlp` are forwarded to MSBuild starting with .NET 11.
- https://learn.microsoft.com/en-us/dotnet/core/testing/microsoft-testing-platform-troubleshooting, ms.date 2026-09-21: exit 3 "the test session was aborted", exit 13 "stopped due to reaching the specified number of maximum failed tests", exit 14 "a compatible coverage collector published a failed coverage threshold evaluation".
- https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/11/dnx-scripts-bypass-global-json, ms.date 2026-11-10: version introduced ".NET 10 SDK 10.0.302, 10.0.400, and .NET 11"; the scripts use `dotnet --list-sdks` to pick the newest installed SDK, bypassing the muxer and any `global.json` pin.
- https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/11/nuget-pack-nu5052-packageid, ms.date 2026-11-10 (declined item 2b).
- https://learn.microsoft.com/en-us/nuget/release-notes/nuget-8.0, ms.date 2026-11-06 (declined items 2b and 2c).
- https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/11/restore-global-packages-folder-version-search, ms.date 2026-11-10 (declined item 2d).
- https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/11/nuget-locks-directory-linux, ms.date 2026-11-06 (declined item 2e).

## Revision log

- 2026-11-27, spillover round: two confirmed items. Item 1 scopes the MTP flag sentence to SDK 10.0.401, adds the SDK 11 `--timeout` meaning of exit 3 and exit rows 13 and 14, and notes the SDK 11 flag behaviour on DN-DIAG-57. Item 2a cites the primary source and the SDK versions on DN-DIAG-05. Items 2b to 2e and the exit-8 detail of item 1 are declined. Six edits, no ID changes. SKILL.md grows by three lines to 391, under the 500-line budget, and both files keep their contents lines.

### Edit list (spillover round)

1. File: skills/dotnet-diagnose/SKILL.md
   Find:
   ```
   app, which reports `Zero tests ran` and exit 5 (DN-DIAG-57). A VSTest project accepts
   ```
   Replace with:
   ```
   app, which reports `Zero tests ran` and exit 5 (DN-DIAG-57; measured on SDK 10.0.401. SDK 11 documents
   `--nologo` and `--tl` as accepted by `dotnet test` in MTP mode, read 2026-11-27, not measured). A VSTest project accepts
   ```

2. File: skills/dotnet-diagnose/SKILL.md
   Find:
   ```
   Ocelot's `xunit.v3` unit tests; 3 and 7 are
   ```
   Replace with:
   ```
   Ocelot's `xunit.v3` unit tests; 3, 7, 13 and 14 are
   ```

3. File: skills/dotnet-diagnose/SKILL.md
   Find:
   ```
   | 3 | The session was aborted | none |
   ```
   Replace with:
   ```
   | 3 | The session was aborted, or a `--timeout` expired (the `dotnet test` option needs SDK 11 and MTP 2.4). Unverified: read only | none |
   ```

4. File: skills/dotnet-diagnose/SKILL.md
   Anchor (insert after this line):
   ```
   | 9 | Fewer tests ran than the minimum | DN-DIAG-59 |
   ```
   Insert:
   ```
   | 13 | `--maximum-failed-tests` stopped the run at that many failures (the `dotnet test` option needs SDK 11 and MTP 2.4). Read the failures as for exit 2. Unverified: read only | DN-DIAG-79 |
   | 14 | A coverage collector reported a failed coverage threshold. Unverified: read only | none |
   ```

5. File: skills/dotnet-diagnose/references/catalogue.md
   Find:
   ```
   | `dnx` ignores `global.json`. | Use `dotnet tool run` (CS-BUILD-22). |
   ```
   Replace with:
   ```
   | The `dnx` script (SDK 10.0.302, 10.0.400 and 11) runs the newest installed SDK and bypasses `global.json` (https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/11/dnx-scripts-bypass-global-json, 2026-11-10). | Use `dotnet tool run` (CS-BUILD-22). |
   ```

6. File: skills/dotnet-diagnose/references/catalogue.md
   Find:
   ```
   | net10; on net11-RC1 `--interactive` and `--disable-build-servers` still give it |
   ```
   Replace with:
   ```
   | net10; on net11-RC1 `--interactive` and `--disable-build-servers` still give it; SDK 11 documents `--nologo` and `--tl` as accepted (read only) |
   ```
