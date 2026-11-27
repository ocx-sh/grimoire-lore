---
title: dotnet-upgrade spillover check (items from csharp-quality and dotnet-build)
target: dotnet-upgrade
date_researched: 2026-11-27
model: sonnet
sources_fetched: 18
---

# dotnet-upgrade spillover check

Six items were addressed to dotnet-upgrade. Two sources returned HTTP 503 on first try (the roslyn-analyzers and dotnet/sdk `AnalyzerReleases.Shipped.md` raw files returned content that stops at release 10.0; the dotnet/core preview6 GitHub HTML page failed, the raw file worked). No .NET 11 SDK exists on this host, so nothing below is measured; every verdict is from documentation. "Primary" means Microsoft Learn or the dotnet/core release notes.

The target files are `/home/mherwig/dev/ocx-sh/grimoire-lore/skills/dotnet-upgrade/SKILL.md` and `/home/mherwig/dev/ocx-sh/grimoire-lore/skills/dotnet-upgrade/references/re-checks.md`.

## Item 1 (csharp-quality): a net11.0 leg pins SDK 11.0.100 or later; .NET 11 is STS to 2028-11-14; re-measure on GA

Verdict: confirmed by primary source (the re-measure part is an action, not a fact).

Sources:
- https://raw.githubusercontent.com/dotnet/core/main/release-notes/11.0/README.md, release table row "2026/11/10 | 11.0.0"; the page calls .NET 11 "Standard Term Support (STS)" and gives the support window "to November 14, 2028".
- https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/breaking-changes/compiler%20breaking%20changes%20-%20dotnet%2011 (updated_at 2026-08-13) states .NET 11 general release is ".NET SDK version 11.0.100".

Affected text in the target:
- SKILL.md, "The order is the product" list: `.NET 8 and 9 both end support on 2026-11-10, .NET 10 LTS runs to 2028-11-14, and .NET 11 reaches GA in November 2026.` The tense is stale (GA happened on 2026-11-10) and the STS date is absent.
- SKILL.md, `metadata.summary`: `measured on SDK 8.0.425, 10.0.401 and 11.0 RC1`, and Scope: `11.0.100-rc.1.26425.128 (RC1)`. These are dated measurements and stay true as dated facts.
- re-checks.md line 24 to 25: `Dated 2026-10-11 it is the RC1 build; at GA it is the 11.0.1xx GA version and allowPrerelease can be false.` Correct as a conditional, but line 33 still sets `V=11.0.100-rc.1.26425.128`.

Smallest change: in SKILL.md replace `and .NET 11 reaches GA in November 2026` with `and .NET 11 (STS) reached GA on 2026-11-10 and is supported to 2028-11-14`. The R1 trigger "An 11.0.1xx GA SDK is installed" in re-checks.md already covers the SDK pin.

## Item 2 (csharp-quality): .NET 11-only traps for a net11.0 leg

Verdict: confirmed by primary source, all parts.

Sources:
- IHost.RunAsync: https://learn.microsoft.com/en-us/dotnet/core/compatibility/extensions/11/ihost-runasync-stopasync-throw-backgroundservice-failure (ms.date 2026-11-10): with `StopHost` (default) the task "fails with an exception", "The application typically exits with a failure exit code (non-zero)"; several failures become an `AggregateException`.
- DI scope disposal: https://learn.microsoft.com/en-us/dotnet/core/compatibility/extensions/11/dependency-injection-disposal-exceptions (ms.date 2026-11-10): every captured disposable is disposed after a failure; multiple failures throw `AggregateException`; "No compatibility switch restores the previous behavior."
- Uri: https://learn.microsoft.com/en-us/dotnet/core/compatibility/networking/11/uri-parsing-validation (ms.date 2026-10-21, "Version introduced .NET 11 GA"): `UriBuilder.Host` rejects `"contoso.com/path"` and `"user@host"` with `ArgumentException`; IPv6 without `/`, with length prefix, or embedded octal now fail.
- STJ: https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/libraries (ms.date 2026-11-10): "`JsonIgnoreCondition.Always` isn't valid at the type level; reflection throws InvalidOperationException, while source generation reports SYSLIB1226"; `[JsonUnion(TypeClassifier = typeof(JsonUnionTypeStructuralClassifier))]` selects an object case.
- C# 15: https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/breaking-changes/compiler%20breaking%20changes%20-%20dotnet%2011 (updated_at 2026-08-13): `with(...)` in a collection expression at LangVersion 15 or greater binds as construction arguments, use `@with` for a method; "a type or alias declaration named `closed` without an `@` escape produces CS9380"; `union` followed by a type name can produce CS9370.

Affected text in the target: the target says nothing on these points. The nearest text is re-checks.md R2, line 90 to 92: `C# 15 syntax that needs no new runtime type (labeled break and continue) compiles into net8.0 code when LangVersion is one value for every leg, and union needs runtime types from .NET 11.` R2 does not mention `with(`, `closed`, or the CS9380 and CS9370 names; its grep at line 97 covers only `UnionAttribute`, `IUnion` and `IsClosedTypeAttribute`. The host, DI, Uri and STJ traps are runtime behaviour of application code and fall outside a TFM-upgrade procedure; they belong to csharp-quality.

Smallest change: add one sentence to R2 after line 92: `At LangVersion 15, name no type closed or union without an @ escape (CS9380, CS9370), and write @with for a method named with that is called inside a collection expression.` Leave the four runtime traps to csharp-quality.

## Item 3 (csharp-quality): process APIs and runtime-async on a net11.0 leg

Verdict: confirmed by primary source, with one caveat (the default of runtime-async is not stated).

Sources:
- Silent parameter: https://raw.githubusercontent.com/dotnet/core/main/release-notes/11.0/preview/preview6/libraries.md (Preview 6, released 2026-07-14 per the 11.0 README table): the `fileName` overloads "gained a `bool silent = false` parameter before the existing optional parameters"; calls passing the timeout or `CancellationToken` positionally need updating.
- KillOnParentExit: https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.processstartinfo.killonparentexit?view=net-11.0 (updated_at 2026-10-16): attributes `SupportedOSPlatform("android")`, `("linux")`, `("windows")`; Windows uses Job Objects, Linux and Android use `prctl(PR_SET_PDEATHSIG)`. The What's New libraries page (ms.date 2026-11-10) still says "(Windows only)", so it is stale against the API reference.
- Runtime-async: https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/runtime (ms.date 2026-11-10): "To enable Runtime Async in a project that targets `net11.0`, add `<Features>runtime-async=on</Features>`" and, as an opt-out, `<UseRuntimeAsync>false</UseRuntimeAsync>`. The page never says whether it is on by default; opt-in is the safe reading.

Affected text in the target: re-checks.md line 44 to 46: `Process.RunAsync, Process.Run, RunAndCaptureText and ProcessStartInfo.KillOnParentExit exist from .NET 11. No leg compiles a region behind NET11_0_OR_GREATER until a net11.0 leg exists (CS-LANG-16), so the code waits.` The probe uses `Process.RunAsync(new ProcessStartInfo("sleep", ["5"]), cts.Token)` (the `ProcessStartInfo` overload, not the `fileName` overload) and reads `KillOnParentExit`. The target says nothing about `silent`, the platform limit, or runtime-async. The probe itself is not affected by the `silent` change, because it uses the `ProcessStartInfo` overload.

Smallest change: append to line 46 of re-checks.md: `KillOnParentExit works on Windows, Linux and Android only, not macOS. The fileName overloads of Run and RunAsync gained a bool silent parameter in Preview 6, so a positional timeout or token breaks; pass them by name. Runtime-async is enabled with <Features>runtime-async=on</Features> and is not on by default as far as the .NET 11 runtime page states.`

## Item 4 (csharp-quality): SDK 11 dotnet test options and exit codes

Verdict: confirmed by primary source.

Sources:
- https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-test-mtp (ms.date 2026-11-19): `--maximum-failed-tests` "The run exits with code 13. Available starting with .NET 11 and requires MTP 2.4 or later"; `--timeout` "A timed-out run exits with code 3. Available starting with .NET 11 and requires MTP 2.4 or later"; "An all-skipped whole run exits with code 8 regardless of the per-module `--zero-tests-policy` value" with the .NET 11 SDK.
- https://learn.microsoft.com/en-us/dotnet/core/testing/microsoft-testing-platform-troubleshooting (ms.date 2026-09-21): exit 13 for `--maximum-failed-tests`; exit 14 "a compatible coverage collector published a failed coverage threshold evaluation"; "This whole-run zero-tests verdict requires the .NET 11 SDK or a later version."

Affected text in the target: SKILL.md, DN-UPG-08 row: `remove every forwarded flag from each dotnet test (DN-RULE-02, CS-TEST-06, DN-RULE-07)`. The target says nothing about SDK 11. DN-RULE-02 itself belongs to dotnet-build, not to this target, so the allow-list edit is outside this skill. The risk for this skill is that DN-UPG-12 repeats DN-UPG-08 on SDK 11.0.1xx and an agent strips `--timeout` or `--maximum-failed-tests` as "forwarded flags".

Smallest change: add to the DN-UPG-12 row, after "repeat DN-UPG-01, DN-UPG-02, DN-UPG-05 and DN-UPG-08 with 11.0.1xx": `On SDK 11 the options --timeout and --maximum-failed-tests (MTP 2.4, exit 3 and 13) are native to dotnet test, and an all-skipped whole run exits 8; read these exits before judging the run, and re-measure DN-RULE-02 before changing it.`

## Item 5 (dotnet-build): SDK 11.0.100 is GA, eight IDs for 11.0-all, LangVersion 15 checklist

Verdict: GA and the LangVersion 15 checklist are confirmed by primary source. The exact list of eight IDs could not be confirmed from a primary file: only CA2267 is confirmed as new in .NET 11 by a primary page, and CA1878 and CA2026 are confirmed to exist.

Sources:
- GA: https://raw.githubusercontent.com/dotnet/core/main/release-notes/11.0/README.md ("2026/11/10 | 11.0.0").
- https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/overview (ms.date 2026-11-12): CA2267 "Usage | Warning | .NET 11 | Quote whitespace in file-based program directive values" in the .NET 11 enabled-by-default table.
- https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1878 (ms.date 2026-11-13): "Enabled by default in .NET 11: No".
- https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2026 (ms.date 2026-11-13): "Enabled by default in .NET 11: As suggestion".
- The `AnalyzerReleases.Shipped.md` raw files in dotnet/sdk and dotnet/roslyn-analyzers (main) showed no 11.0 section and none of the eight IDs, so the dotnet-build pair's statement that the file lists them could not be reproduced. The dotnet-build artifact (`analyzer-packs-and-analysis-level.md`, line 33) is the only place stating "exactly eight". CA1517, CA1876, CA1877, CA2027 and CA2028 were not checked on their rule pages.
- LangVersion 15: the compiler breaking-changes page (above) confirms `with(` as a collection expression element and the `closed` and `union` contextual keywords.

Affected text in the target:
- SKILL.md DN-UPG-12: `After GA repeat DN-UPG-01, DN-UPG-02, DN-UPG-05 and DN-UPG-08 with 11.0.1xx, then run references/re-checks.md.` Correct; the trigger is now met. The block `upg-12` still pins `11.0.100-rc.1.26425.128` (SKILL.md line 372) and labels results "RC1".
- re-checks.md lines 181 to 182: `Observed 2026-10-11 (RC1): exit 0 and six added lines, each severity = warning: CA1517, CA1876, CA1877, CA2026, CA2027, CA2028. CA1878 is absent from the RC1 file. Run the probe at GA and add every ID it prints.` This is a dated observation and stays true; the instruction to rerun at GA is already there.

Smallest change: none to the dated text. Add to R3 after line 182: `Documentation of 2026-11-13 lists CA1878 (not enabled by default) and CA2267 (Warning, file-based programs only, cannot fire on a csproj tree) as .NET 11 rules; the count of eight is unconfirmed until the r3 probe runs on SDK 11.0.100.` Replace the `V=` value in `r0` only when the owner runs the probe on GA.

## Item 6 (dotnet-build): NETSDK1138 on net8.0 Exe test legs after 2026-11-10; dotnet tool exec --yes only on SDK 11

Verdict: NETSDK1138 part could not confirm (target already correct for what the primary page supports). The `--yes` part is confirmed by primary source.

Sources:
- https://learn.microsoft.com/en-us/dotnet/core/tools/sdk-errors/netsdk1138 (updated_at 2026-08-04): "Out-of-support versions include 1.0, 1.1, 2.0, 2.1, 2.2, 3.0, 3.1, 5, 6, and 7." Neither 8 nor 9 is listed, so the page does not yet support the claim. Whether the SDK's EOL table is updated for 8 and 9 is a property of the SDK build, not of the page, and needs a measurement on a current SDK.
- https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-tool-exec (ms.date 2026-09-15): `-y|--yes` "Accepts all confirmation prompts, including the prompt to download and run the tool package... Available starting with .NET 11."

Affected text in the target:
- SKILL.md line 158: `NETSDK1138 ("target framework is out of support") in the baseline build | Expected on every non-library project (an Exe, a sandbox, a test project that is an Exe) on net5.0 to net7.0, never on a library ... measured 2026-10-11, SDK 10.0.401`. This matches the Learn page list (5, 6, 7) and the date of measurement. It makes no claim about net8.0 or net9.0, so it is correct as written and silent on the new question.
- The target never mentions `dotnet tool exec`, `dnx` or `--yes`.

Smallest change: none required. Optionally add to the NETSDK1138 row: `After 2026-11-10 an Exe on net8.0 or net9.0 may also raise it on a newer SDK; not measured, and the Learn page of 2026-08-04 does not list them.` Do not state `dotnet tool exec --yes` in this skill; it is not part of the upgrade procedure.
