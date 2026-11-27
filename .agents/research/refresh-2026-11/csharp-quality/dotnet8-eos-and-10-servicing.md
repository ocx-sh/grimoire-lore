---
title: .NET 8 and 9 end of support and 10.0 servicing, delta 2026-10-11 to 2026-11-27
pair: csharp-quality
date_researched: 2026-11-27
window_start: 2026-10-11
model: sonnet
sources_fetched: 8
---

# Delta: .NET 8 and 9 end of support, 10.0 servicing

This is a delta update to the research baselined on 2026-10-11. Sibling `dotnet-build` owns the `global.json` pin, the TFM allow-list and the upgrade steps. This file covers only the sentences the csharp-quality pair states.

## Verdict

The trigger fired. .NET 8 and .NET 9 both reached end of support on 2026-11-10, exactly as scheduled. No date moved. The owner default D2 ("net8.0;net10.0 until .NET 8 end of support") now has a past "until" date; this file reports that the trigger fired and does not decide the default.

.NET 11.0.0 also went GA on 2026-11-10 (SDK 11.0.100). The baseline mentions SDK 11.0.100-rc.1 in testing.md:30; that row is now stale in tense, because 11.0.0 GA exists.

## Facts, with sources

Sources (all fetched 2026-11-27):

1. https://builds.dotnet.microsoft.com/dotnet/release-metadata/releases-index.json (also read via the dotnetcli.blob.core.windows.net mirror; identical values)
2. https://builds.dotnet.microsoft.com/dotnet/release-metadata/8.0/releases.json
3. https://builds.dotnet.microsoft.com/dotnet/release-metadata/9.0/releases.json
4. https://builds.dotnet.microsoft.com/dotnet/release-metadata/10.0/releases.json
5. https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core
6. https://github.com/dotnet/core/blob/main/release-notes/10.0/10.0.15/10.0.15.md
7. https://github.com/dotnet/core/blob/main/release-notes/8.0/8.0.34/8.0.34.md
8. https://github.com/dotnet/core/blob/main/release-notes/10.0/10.0.14/10.0.14.md (10.0.13 notes also read)

| Channel | support-phase | eol-date | Latest release | Release date | Runtime | SDK feature bands |
|---|---|---|---|---|---|---|
| 11.0 | active | 2028-11-14 | 11.0.0 | 2026-11-10 | 11.0.0 | 11.0.100 |
| 10.0 | active | 2028-11-14 | 10.0.15 | 2026-11-10 | 10.0.15 | 10.0.404, 10.0.115 |
| 9.0 | eol | 2026-11-10 | 9.0.23 | 2026-11-10 | 9.0.23 | 9.0.321, 9.0.124 |
| 8.0 | eol | 2026-11-10 | 8.0.34 | 2026-11-10 | 8.0.34 | 8.0.428, 8.0.134 |

The support policy page (source 5) lists .NET 9 and .NET 8 under "Out of support versions" with end of support November 10, 2026, and .NET 10 and 11 as Active until November 14, 2028.

Servicing releases inside the window, 10.0 channel: 10.0.13 (2026-10-13, SDK 10.0.402), 10.0.14 (2026-10-25, out of band for security, SDK 10.0.403), 10.0.15 (2026-11-10, SDK 10.0.404). The 8.0 channel went 8.0.32 (2026-10-13, SDK 8.0.426), 8.0.33 (2026-10-25, SDK 8.0.427), 8.0.34 (2026-11-10, SDK 8.0.428). 8.0.34 is the final 8.0 runtime and 8.0.428 the final 8.0.4xx SDK, since the channel is eol; 9.0 ends at 9.0.23.

Baseline stamps check: 10.0.12 with SDK 10.0.401 (2026-09-08) and 8.0.31 with SDK 8.0.425 (2026-09-08) were the latest on 2026-10-11, so the stamps were correct when measured. They are now three servicing releases behind (10.0) and three behind (8.0), which is expected for a dated measurement.

Behaviour changes: the 10.0.13, 10.0.14 and 10.0.15 release notes document no behaviour change, breaking change or known issue touching process signals, `Process.Kill`, Microsoft.Testing.Platform exit codes, nullable defaults or analyzer defaults. They list security CVEs, package version tables and (10.0.14) the Brotli decoder fix CVE-2026-111497. The notes only say nothing was documented; they do not prove no behaviour changed. No measured row is known to be invalidated by the notes. Re-running the measurements on 10.0.404 was not done here and is outside this task.

CVE-2026-118741 (ASP.NET Core Identity scaffolding and templates, 10.0.15 and 8.0.34 notes) needs a template or scaffolding update, not only a runtime update. It touches none of the pair's sentences.

System.Text.Json: the 10.0.14 notes list package version 10.0.14, so the package line tracks the runtime. The 10.0.15 notes list only package versions without a System.Text.Json behaviour statement. The 8.0.34 notes do not list System.Text.Json. The exact 10.0.15 System.Text.Json version was not read from the table and is assumed to be 10.0.15; could not determine from a fetched row.

## Claims at risk

| # | Claim | Verdict | Detail |
|---|---|---|---|
| 1 | csharp-quality.md:30-31 "Binds to SDK 10.0.401, `net8.0;net10.0` and LangVersion 14, measured 2026-10-11 on Linux x64. Windows rows were measured on SDK 10.0.102." | unchanged | It is a dated measurement statement. It stays true as written. Optionally append that 10.0.404 is the current 10.0 SDK as of 2026-11-10; no behaviour change is documented. LangVersion 14 and the Windows SDK 10.0.102 are not touched by this upstream. |
| 2 | Owner Default D2 "The floor is `net8.0;net10.0` until .NET 8 end of support (2026-11-10); `net10.0` only is the end state" | changed (tense) | Old text: future "until" 2026-11-10. New fact: .NET 8 reached end of support on 2026-11-10 (sources 1, 2, 5), so the trigger fired and the date is past. Replacement fact: ".NET 8 reached end of support on 2026-11-10; its last release is 8.0.34". Whether the floor now drops to `net10.0` only is the owner's decision, not made here. Upstream change date: 2026-11-10. |
| 3 | async.md:42 "net8.0 and net10.0 until .NET 8 end of support (2026-11-10)" | changed (tense) | Same fact as 2. Past-tense wording: "net8.0 and net10.0 while .NET 8 was supported (end of support 2026-11-10)", or follow the owner's D2 outcome. |
| 4 | api-design.md:30 "Dropping the `net8.0` leg after .NET 8 end of support (2026-11-10) is `PKV006` by design and a major" | changed (tense) | The "after" condition is now met. Replacement fact: ".NET 8 reached end of support on 2026-11-10, so dropping the `net8.0` leg is available now and is still `PKV006` and a major". The PKV006 and major-version consequence is not touched by upstream. |
| 5 | security.md:38 ".NET 8 and 9 reach end of support on 2026-11-10" | changed (tense) | Replacement fact: ".NET 8 and 9 reached end of support on 2026-11-10 and receive no further security fixes; the last releases are 8.0.34 and 9.0.23". |
| 6 | testing.md:27 "Dated externals (read 2026-10-11): .NET 8 and 9 reach end of support 2026-11-10" | changed (tense) | It is a dated read, so the reading date stays; the verb tense and the claim should become "reached" with a 2026-11-27 re-read. The same line holds `macos-14` unsupported from 2026-11-02 and `ubuntu-latest` moving to 26.04; those are outside this commission and were not checked here. Also testing.md:30 mentions SDK 11.0.100-rc.1; 11.0.0 GA with SDK 11.0.100 shipped 2026-11-10 (source 1), so the rc row is superseded, and whether exit 8 persists on GA was not measured. |
| 7 | json.md:45 "(2026-11-10), then `net10.0` only, which deletes the package line of `CS-JSON-14`" | changed (tense) | The date is past. Replacement fact: ".NET 8 reached end of support on 2026-11-10". Whether `net10.0` only is adopted, and so whether the `CS-JSON-14` package line goes, follows the owner's D2 decision. |
| 8 | Runtime stamps: runtimes 10.0.12 and 8.0.31, SDK 8.0.425, System.Text.Json 10.0.12 | unchanged | They are measurement stamps, correct for 2026-10-11. Current values for any re-measure: 10.0.15 runtime, SDK 10.0.404; final 8.0.34 runtime, SDK 8.0.428; System.Text.Json 10.0.14 confirmed from notes, 10.0.15 presumed. |

## Normative candidates

Candidate A: rewrite every "until .NET 8 end of support (2026-11-10)" into a statement of a past event, after the owner decides D2.
- Rationale: the tense is wrong from 2026-11-10 onward, and an agent reading "until" could treat the floor as still open or as already dropped.
- Verification: `grep -rn "2026-11-10" rules/csharp-quality.md skills/csharp-quality-reference` returns no future-tense verb ("reach", "until", "after") next to the date.

Candidate B: in testing.md, replace the SDK 11.0.100-rc.1 exit-8 row with a re-measure on SDK 11.0.100 GA, or label it "rc.1 only".
- Rationale: rc.1 is superseded by GA, and the row would mislead as a statement about the current preview.
- Verification: `grep -n "rc.1" skills/csharp-quality-reference/testing.md`; run an all-skipped whole `dotnet test` on SDK 11.0.100 and record the exit code.

## Could not determine

- The exact System.Text.Json package version in the 10.0.15 notes (not read from the table).
- Whether any measured row changes behaviour on SDK 10.0.404; no measurement was run.
- The `macos-14` and `ubuntu-latest` dated externals in testing.md:27 (outside this commission).
