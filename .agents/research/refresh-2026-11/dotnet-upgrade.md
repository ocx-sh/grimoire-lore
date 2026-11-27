---
title: dotnet-upgrade spillover round, 2026-11-27
target: dotnet-upgrade
date: 2026-11-27
model: opus
consolidates: /home/mherwig/dev/ocx-sh/grimoire-lore/.agents/research/refresh-2026-11/dotnet-upgrade/spillover-check.md
---

# dotnet-upgrade spillover round

## Verdict

Four edits change the skill, and all four are backed by primary sources. The first round of this refresh did not touch `skills/dotnet-upgrade/`, so these edits build on the text as it was committed. One edit corrects a stale tense in SKILL.md: .NET 8 and 9 have ended support, and .NET 11 (STS) shipped on 2026-11-10 and is supported to 2028-11-14. Three edits extend the dated re-checks in `references/re-checks.md`. R2 now names the C# 15 contextual keywords and the `with(...)` element form that break shared source on a `net11.0` leg, and it gets a grep that checks for them. R1 now states that `KillOnParentExit` is supported only on Windows, Linux and Android. No rule or step ID changes number or meaning, and no new ID is added. The dated RC1 measurements stay as they are, because nothing was measured on SDK 11.0.100 in this round.

I fetched three primary pages again in this round: the C# compiler breaking-changes page for .NET 11, the `ProcessStartInfo.KillOnParentExit` API reference and the `Process.RunAsync` API reference. All three match what the spillover check reported.

## Changed statements

- SKILL.md, the order section, fifth bullet. The old text was ".NET 8 and 9 both end support on 2026-11-10 … and .NET 11 reaches GA in November 2026". The new text is ".NET 8 and 9 both ended support on 2026-11-10 … and .NET 11 (STS) reached GA on 2026-11-10 and is supported to 2028-11-14". Source: the dotnet/core 11.0 release-notes README, release row 2026/11/10 11.0.0, which gives the STS window to November 14, 2028. Verification: the README row, and `dotnet --list-sdks` showing 11.0.1xx on a host that has the GA SDK.
- re-checks.md, R2 prose. The old text named only labeled `break`/`continue` and `union` runtime types. The new text adds three things for the `net11.0` leg at LangVersion 15. A type or alias named `closed` or `union` needs an `@` escape (CS9380; a field of that type gives CS1519 or CS9370). A method named `with` used as a collection-expression element is written `@with`. Source: the compiler breaking-changes page (updated 2026-08-13), which covers changes through SDK 11.0.100. Verification: the new grep line in block `r2`.
- re-checks.md, R1 prose. One added sentence says that `KillOnParentExit` is supported only on Windows, Linux and Android, so each use is guarded and macOS keeps another path. Source: the API reference (updated 2026-10-16), which carries `SupportedOSPlatform("android")`, `("linux")` and `("windows")`. Verification: the platform analyzer CA1416 warns when the property is used without a guard. The r1 probe is unchanged, because it still prints its two lines.

## New rules

None. The R2 grep is a new check inside the existing re-check item R2. It is not a new rule ID.

## Declined

- Item 1, the "re-measure on GA" part. This is an action, not a fact, and no SDK 11.0.100 exists on this host. The dated RC1 measurements (metadata summary, Scope, `r0` `V=`, `upg-12`) stay true as dated facts. The R1 trigger and the DN-UPG-12 "After GA" sentence already cover the SDK 11.0.1xx pin.
- Item 2, the IHost.RunAsync, DI scope disposal, Uri and System.Text.Json traps. These are confirmed, but they are runtime behaviour of application code, not part of a TFM-upgrade procedure. They belong to csharp-quality.
- Item 3, the `bool silent` parameter of the `fileName` overloads. This is confirmed by the RunAsync API reference. However, the compiler rejects a positional token at that parameter, so a competent model follows the signature without being told. The r1 probe uses the `ProcessStartInfo` overload, which is not affected.
- Item 3, runtime-async. It is not a process API and not a ladder step. The .NET 11 runtime page does not state its default, so the opt-in reading is an inference.
- Item 4, the SDK 11 `dotnet test` `--timeout`, `--maximum-failed-tests` and exit codes 3, 8 and 13. These are confirmed, but no step of this procedure passes those options. The `upg-08` flag grep does not match them, and an all-skipped or zero-test run is already stop S3. DN-RULE-02 belongs to dotnet-build.
- Item 5, the "exactly eight IDs" for `11.0-all`. No primary source confirms it: the `AnalyzerReleases.Shipped.md` files show no 11.0 section, and only the dotnet-build artifact states the count. The CA1878 and CA2267 documentation note is also declined. The R3 probe run on the GA SDK is the authority, and R3 already says to run it at GA and add every ID it prints.
- Item 6, NETSDK1138 on net8.0 or net9.0 Exe legs after 2026-11-10. No primary source confirms it: the Learn page (2026-08-04) lists only 1.0 to 7, and nothing was measured. The skill's NETSDK1138 row makes no claim about 8 or 9.
- Item 6, `dotnet tool exec --yes`. This is confirmed, but it is not part of the upgrade procedure.

## Sources

- https://raw.githubusercontent.com/dotnet/core/main/release-notes/11.0/README.md (release row 2026/11/10 11.0.0; STS, supported to November 14, 2028)
- https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/breaking-changes/compiler%20breaking%20changes%20-%20dotnet%2011 (updated 2026-08-13, fetched 2026-11-27: "`with()` as a collection expression element is treated as collection construction arguments"; "`closed` is a contextual keyword in type declaration contexts", CS9380 and CS1519; "`union` is a contextual keyword in type declaration contexts", CS9370)
- https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.processstartinfo.killonparentexit?view=net-11.0 (updated 2026-10-16, fetched 2026-11-27: SupportedOSPlatform android, linux, windows)
- https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process.runasync?view=net-11.0 (updated 2026-10-16, fetched 2026-11-27: `RunAsync(string fileName, IEnumerable<string>? arguments = default, bool silent = false, CancellationToken cancellationToken = default)`)
- https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1416 (the platform compatibility analyzer)
- The spillover check named in the frontmatter, for items 4 to 6 and their sources.

## Revision log

- 2026-11-27, spillover round (opus): four edits (SKILL.md order section; re-checks.md R1 prose, R2 prose and the R2 grep). No first-round edits existed for this target. Version bump: patch.

### Edit list (spillover round)

Each find and replace text sits alone in a fenced `text` block, verbatim, with no surrounding quotes.

1. File `skills/dotnet-upgrade/SKILL.md`. Find:
   ```text
   - **`net9.0` is never a stop, `net11.0` is a probe branch only.** .NET 8 and 9 both end
     support on 2026-11-10, .NET 10 LTS runs to 2028-11-14, and .NET 11 reaches GA in
     November 2026.
   ```
   Replace with:
   ```text
   - **`net9.0` is never a stop, `net11.0` is a probe branch only.** .NET 8 and 9 both ended
     support on 2026-11-10, .NET 10 LTS runs to 2028-11-14, and .NET 11 (STS) reached GA on
     2026-11-10 and is supported to 2028-11-14.
   ```

2. File `skills/dotnet-upgrade/references/re-checks.md`. Find:
   ```text
   .NET 11. Both are fenced with a per-TFM `LangVersion` and `NET11_0_OR_GREATER`.
   ```
   Replace with:
   ```text
   .NET 11. Both are fenced with a per-TFM `LangVersion` and `NET11_0_OR_GREATER`. At `LangVersion` 15 the
   `net11.0` leg also reads the shared source with two contextual keywords and one element form: a type or
   alias named `closed` or `union` needs an `@` escape (CS9380 for `closed`; a field of either type parses as
   a modifier or a union declaration, CS1519 or CS9370), and a method named `with` used as an element of a
   collection expression is written `@with`, or it binds as collection construction arguments.
   ```

3. File `skills/dotnet-upgrade/references/re-checks.md`. Insert after the anchor line:
   ```text
   git grep --untracked -nE -e 'class[[:space:]]+UnionAttribute' -e 'interface[[:space:]]+IUnion' -e 'IsClosedTypeAttribute' -- '*.cs'    # exit 1, no output: no local declaration (from the repository root)
   ```
   Text to insert (a new line directly below the anchor):
   ```text
   git grep --untracked -nP -e '\b(class|struct|interface|enum|record|using)\s+(closed|union)\b' -e '[\[,]\s*with\s*\(' -- '*.cs'    # exit 1, no output: each hit gets its @ escape in the commit that adds net11.0 (from the repository root)
   ```

4. File `skills/dotnet-upgrade/references/re-checks.md`. Find:
   ```text
   `NET11_0_OR_GREATER` until a `net11.0` leg exists (CS-LANG-16), so the code waits.
   ```
   Replace with:
   ```text
   `NET11_0_OR_GREATER` until a `net11.0` leg exists (CS-LANG-16), so the code waits.
   `KillOnParentExit` is supported on Windows, Linux and Android only, not on macOS: a replacement that relies
   on it guards each use with `OperatingSystem.IsWindows()`, `IsLinux()` or `IsAndroid()` and keeps another
   path for macOS. The platform analyzer (CA1416) warns at an unguarded use.
   ```
