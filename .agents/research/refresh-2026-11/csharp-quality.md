---
title: csharp-quality delta refresh, 2026-10-11 to 2026-11-27
pair: csharp-quality
date: 2026-11-27
window_start: 2026-10-11
model: opus
consolidates:
  - .agents/research/refresh-2026-11/csharp-quality/csharp15-dotnet11-ga-language-and-json.md
  - .agents/research/refresh-2026-11/csharp-quality/dotnet11-runtime-bcl-and-sdk-test-behaviour.md
  - .agents/research/refresh-2026-11/csharp-quality/dotnet8-eos-and-10-servicing.md
  - .agents/research/refresh-2026-11/csharp-quality/test-and-benchmark-packages.md
  - .agents/research/refresh-2026-11/csharp-quality/analyzer-and-build-time-packages.md
  - .agents/research/refresh-2026-11/csharp-quality/ci-runner-images-and-actions.md
  - .agents/research/refresh-2026-11/csharp-quality/reference-tool-and-trace-context-spec.md
  - .agents/research/refresh-2026-11/csharp-quality/recent-shifts-csharp-quality.md
revises:
  - .agents/research/csharp-language.md
  - .agents/research/csharp-api.md
  - .agents/research/csharp-json.md
  - .agents/research/csharp-async.md
  - .agents/research/csharp-process.md
  - .agents/research/csharp-packaging.md
  - .agents/research/csharp-crossplatform.md
  - .agents/research/csharp-testing.md
  - .agents/research/csharp-security.md
  - .agents/research/csharp-observability.md
---

# csharp-quality delta refresh, 2026-10-11 to 2026-11-27

## Contents

1. Verdict
2. Changed rules
3. New rules
4. Confirmed unchanged
5. Open questions
6. Revision log
7. Edit list
8. Spillover round

## Verdict

- The pair is updated in place, not re-created. Every rule ID keeps its number and meaning. No rule is added, retired or renumbered.
- The baseline binding stays: SDK 10.0.401, `net8.0;net10.0`, LangVersion 14, measured 2026-10-11. Those are dated measurements and remain true as written. No re-measurement on SDK 10.0.404 was made, and none is claimed.
- Two upstream events drive most of the edits, both on 2026-11-10: .NET 8 and .NET 9 reached end of support, and .NET 11 went GA with SDK 11.0.100. Every sentence that put either event in the future is rewritten into the past tense. The owner default D2 is not decided here: its trigger has fired, and the text now says that the move to `net10.0` only is pending.
- The C# 15 fence (CS-LANG-15, CS-LANG-16) stands on the pair's floor. Its rationale gains the GA facts measured on SDK 11.0.100: on a `net10.0` target the syntax-only C# 15 features compile under an explicit `LangVersion`, while `closed` and `union` fail with `CS0656` and `CS0518`. The "wait for an SDK 11 GA pin" sentence is replaced, because GA exists.
- CS-LANG-11 gains a check for its existing name clause (no type or member named `union`, `closed` or `extension`). The clause had no cell, and C# 15 now makes the names errors on `net11.0` (`CS9380`, `CS9370`). The new cell L11d was watched red (8 lines) and green (0 lines) on 2026-11-27.
- The union open question is narrowed: a C# 15 `closed` hierarchy with System.Text.Json inference cannot replace the internal-constructor union of CS-API-08, because an unseen tag throws and `IgnoreUnrecognizedTypeDiscriminators` has no concrete base to fall back to (measured on SDK 11.0.100). CS-API-08 cites the measured throw. The ApiCompat half stays open.
- The xunit v3 pin check of CS-TEST-05 is widened to accept a later 4.0.x patch, because 4.0.3 shipped on 2026-11-09 and the exact `4.0.2` match would report a correct upgrade as missing. The pin itself stays valid. CS-TEST-23 records that `Verify.XunitV3` 33.4.0 and later needs xunit v3 4.0.3.
- CsCheck 5.x dropped `net8.0`; the floor note keeps 4.9.1 while `net8.0` is a target.
- The CI runner facts are re-dated: `macos-14` was retired, `ubuntu-latest` moved to 26.04, `ubuntu-22.04` has a 2027-04-17 retirement date, and two VS 2026 labels begin deprecation on 2026-12-01. The `.github/actionlint.yaml` declaration stays required, because actionlint 1.7.12 is still the latest release.
- The example tool facts are refreshed where a rule leans on them: D8 resolves to ocx 0.6.6, the first release carrying `contract`, and CS-OBS-29 records that ocx 0.6.8 still reads no trace context and that the OTel env-carrier spec became Stable in v1.63.0.
- The .NET 11-only library changes (host exit on a failing `BackgroundService`, DI disposal aggregation, `Uri` validation, System.Text.Json type-level attributes, the .NET 11 process APIs, the SDK 11 `dotnet test` options) do not bind the pair while CS-LANG-16 fences `net11.0`. They are spillover to `dotnet-upgrade`, not new rules here.
- Bumps: the rule takes a patch (D2 and D8 are corrected facts). The reference skill takes a minor (a new check cell L11d and a widened pin pattern, besides corrected facts).

## Changed rules

Each entry gives the ID, the old text, the new text and the primary source. Fragments are quoted; the full find-and-replace text is in the Edit list.

| ID | Old text | New text | Source |
|---|---|---|---|
| D2 (owner default, rule) | "The floor is `net8.0;net10.0` until .NET 8 end of support (2026-11-10); `net10.0` only is the end state, executed by `dotnet-upgrade`." | "... until .NET 8 end of support, which came on 2026-11-10 (last release 8.0.34); `net10.0` only is the end state, executed by `dotnet-upgrade`, and that move is now pending." | dotnet support policy page and 8.0 `releases.json` (support-phase eol, 8.0.34 on 2026-11-10), read 2026-11-27 (<https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core>; <https://builds.dotnet.microsoft.com/dotnet/release-metadata/8.0/releases.json>; <https://github.com/dotnet/core/blob/main/release-notes/8.0/8.0.34/8.0.34.md>) |
| D8 (owner default, rule) | "The SDK floor is the first tool release carrying the machine contract" | adds "(for the example tool, ocx 0.6.6 of 2026-11-12)" | ocx CHANGELOG at v0.6.8 and the v0.6.6 release notes; `contract` absent at tag v0.6.5 (<https://raw.githubusercontent.com/ocx-sh/ocx/v0.6.8/CHANGELOG.md>; <https://github.com/ocx-sh/ocx/releases/tag/v0.6.6>; <https://github.com/ocx-sh/ocx/releases>) |
| CS-LANG-11 | Rationale had no fact for the `union` and `closed` names; the name clause had no check | Rationale: on `net11.0` a type named `closed` is `CS9380`, a field typed `closed` is `CS1519`, a declaration that `union` starts is `CS9370`, and a type named `union` is only `CS8981`. Verification adds L11d, watched red and green 2026-11-27 | Roslyn breaking changes .NET 10 to 11; measurement on SDK 11.0.100 (CS9380, CS1519, CS8981) (<https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/breaking-changes/compiler%20breaking%20changes%20-%20dotnet%2011>) |
| CS-LANG-15 | Rationale: "`LangVersion=preview` on SDK 10.0.401 silently accepts C# 15 syntax." | Adds the SDK 11.0.100 behaviour on `net10.0` (syntax-only features accepted under `LangVersion` 15 or `preview`; `closed` is `CS0656`, `union` is `CS0518`; `CS8652` now names `updated memory safety rules`). Verification records the re-check and that a project-file `LangVersion` 15 is `CS-BUILD-04`'s check | Measurement on SDK 11.0.100, 2026-11-27; What's new in C# 15 (updated 2026-11-10) (<https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-15>) |
| CS-LANG-16 | Rationale: "The .NET 11 process APIs wait for an SDK 11 GA pin and are a `dotnet-upgrade` re-check." | SDK 11.0.100 (GA 2026-11-10) can add the leg and still built such a region with 0 errors on `net8.0;net10.0`; adding the leg with its SDK 11 pin, and the .NET 11 process APIs, are a `dotnet-upgrade` re-check | dotnet/core 11.0.0 release notes and `releases.json`; measurement on SDK 11.0.100 (<https://github.com/dotnet/core/blob/main/release-notes/11.0/11.0.0/11.0.0.md>; <https://github.com/dotnet/core/blob/main/release-notes/11.0/releases.json>) |
| CS-LANG-19 | "a `readonly` parameter does not exist even on RC1" | "a `readonly` parameter does not exist on RC1 or on GA (`CS9190` on SDK 11.0.100, measured 2026-11-27)" | Measurement on SDK 11.0.100; Roslyn feature status C# 15 table (<https://github.com/dotnet/roslyn/blob/main/docs/Language%20Feature%20Status.md>) |
| CS-API-08 | "`closed` is `CS8652` on SDK 10.0.401." | Adds `CS0656` on SDK 11.0.100 for `net10.0`, legal only on `net11.0`, and the measured unseen-tag throw | Measurement on SDK 11.0.100; STJ polymorphism page (closed-hierarchy inference) (<https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/polymorphism>) |
| CS-API-18 | ".NET 11 RC1 accepted them as of 2026-10" | ".NET 11 accepts them on `net11.0` only (RC1 as of 2026-10; GA documents it, and SDK 11.0.100 still reported both on the `net10.0` target of the same project, measured 2026-11-27)" | What's new in .NET 11 libraries (updated 2026-11-10); measurement on SDK 11.0.100 (<https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/libraries>) |
| CS-ASYNC-06 | "Same on 11.0.100-rc.1 with runtime-async on." | Names the switch `<Features>runtime-async=on</Features>` as the documented opt-in and states it was not re-measured on GA | What's new in the .NET 11 runtime (updated 2026-11-12) (<https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/runtime>) |
| CS-OBS-29 | "`ocx` 0.6.5 and main read no trace context ... The OTel env-carrier spec is a Release Candidate." | "`ocx` 0.6.5 and 0.6.8 (2026-11-15) read no trace context ... The OTel env-carrier spec is Stable since specification v1.63.0 (2026-11-23) and fixes no variable names; propagators choose them." Verification records the re-check on the v0.6.8 tag | ocx v0.6.8 source and CHANGELOG; opentelemetry-specification CHANGELOG v1.63.0 and `env-carriers.md` (<https://raw.githubusercontent.com/ocx-sh/ocx/v0.6.8/CHANGELOG.md>; <https://raw.githubusercontent.com/open-telemetry/opentelemetry-specification/main/CHANGELOG.md> for v1.63.0, 2026-11-23; <https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/context/env-carriers.md>) |
| CS-TEST-05 | "`xunit.v3.mtp-v2` 4.0.2" and a pin grep for exactly `4\.0\.2` | "4.0.2 or a later 4.0.x patch, with `xunit.v3.assert` on the same version"; the grep accepts 4.0.2 to 4.0.99 | xunit 4.0.3 release notes and the 4.0.3 nuspec (exact `[4.0.3]` inner pins); NuGet publish 2026-11-09 (<https://xunit.net/releases/v3/4.0.3>; <https://github.com/xunit/xunit/releases/tag/v3-4.0.3>; <https://api.nuget.org/v3-flatcontainer/xunit.v3.mtp-v2/4.0.3/xunit.v3.mtp-v2.nuspec>) |
| CS-TEST-23 | Rationale ended at "`LicenseIgnored` survives warnings-as-errors." | Adds that `Verify.XunitV3` 33.4.0 and later depends on xunit v3 4.0.3, so a repository on 4.0.2 stays on 33.3.4 or earlier; verification adds a restore with no package downgrade | `Verify.XunitV3` 33.3.3 and 33.4.0 nuspecs; Verify releases page (<https://api.nuget.org/v3-flatcontainer/verify.xunitv3/33.3.3/verify.xunitv3.nuspec>; <https://api.nuget.org/v3-flatcontainer/verify.xunitv3/33.4.0/verify.xunitv3.nuspec>; <https://github.com/VerifyTests/Verify/releases>) |
| CS-CI-02 | Rationale: "`ubuntu-latest` moves to 26.04 between 2026-10-19 and 2026-11-19" | Past tense, plus the `ubuntu-22.04` retirement on 2027-04-17 and the 2026-12-01 deprecation start of `windows-2025-vs2026` and `windows-11-vs2026-arm`; verification records actionlint 1.7.12 as still the latest release | runner-images issues 14748, 14254 and 15373 and the README; actionlint releases and `rule_runner_label.go` on main (<https://github.com/actions/runner-images/issues/14748>; <https://github.com/actions/runner-images/issues/14254>; <https://github.com/actions/runner-images/issues/15373>; <https://github.com/actions/runner-images/blob/main/README.md>; <https://github.com/rhysd/actionlint/releases/latest>; <https://raw.githubusercontent.com/rhysd/actionlint/main/rule_runner_label.go>) |
| CS-CI-06 | "a separate .NET 11 RC setup step" | "a separate .NET 11 setup step (SDK 11.0.100, GA 2026-11-10)" | dotnet/core 11.0.0 release notes (<https://github.com/dotnet/core/blob/main/release-notes/11.0/11.0.0/11.0.0.md>) |

Unnumbered sentences changed in the same way (tense and version facts, no rule meaning): `language.md` header binding, `json.md` defaults, the RC1 union-converter probe, the policy-table `closed` row and its footnote, anti-pattern row 25, `api-design.md` reach note, `security.md` end-of-support line, `async.md` defaults, the `processes.md` CS-PROC-23 retirement note (adds the `KillOnParentExit` platform list), and the `testing.md` floors, dated externals and exit-8 gap.

Sources for the facts stated outside the table:

- `KillOnParentExit` platforms (Windows, Linux and Android only; not macOS): <https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.processstartinfo.killonparentexit?view=net-11.0> and <https://devblogs.microsoft.com/dotnet/process-api-improvements-in-dotnet-11/>.
- CsCheck 5.x dropped `net8.0` (5.0.1 nuspec has `net10.0` and `net11.0` only; 4.9.1 has `net8.0`): <https://api.nuget.org/v3-flatcontainer/cscheck/5.0.1/cscheck.nuspec>, <https://api.nuget.org/v3-flatcontainer/cscheck/4.9.1/cscheck.nuspec> and <https://www.nuget.org/packages/CsCheck/5.0.1>.
- Verify.XunitV3 33.4.0 needs xunit v3 4.0.3: <https://api.nuget.org/v3-flatcontainer/verify.xunitv3/33.4.0/verify.xunitv3.nuspec>.
- Runner-image retirement dates and the 2026-12-01 deprecation start: <https://github.com/actions/runner-images/issues/14748>, <https://github.com/actions/runner-images/issues/15373> and <https://github.com/actions/runner-images/blob/main/README.md>.
- End of support 2026-11-10 for .NET 8 and .NET 9, and .NET 11 GA: <https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core> and <https://github.com/dotnet/core/blob/main/release-notes/11.0/11.0.0/11.0.0.md>.
- ocx 0.6.6 and 0.6.8: <https://github.com/ocx-sh/ocx/releases>; OTel specification v1.63.0: <https://raw.githubusercontent.com/open-telemetry/opentelemetry-specification/main/CHANGELOG.md>.

## New rules

None. Every candidate in the delta artifacts either restates an existing rule, binds only a `net11.0` target that CS-LANG-16 fences, or belongs to a sibling (see spillover in the structured result). The one new mechanism, check cell L11d, verifies an existing clause of CS-LANG-11 and so does not get a new ID.

## Confirmed unchanged

- The SDK 10.0.401 binding and every dated measurement stamp (runtimes 10.0.12 and 8.0.31, SDK 8.0.425, System.Text.Json 10.0.12, Windows SDK 10.0.102). The 10.0.13 to 10.0.15 notes document no behaviour change to signals, `Process.Kill`, MTP exit codes, nullable or analyzer defaults.
- `CS9327` and `CS8652` diagnostic IDs and the `updated-memory-safety-rules` Features flag (re-measured on SDK 11.0.100). Memory safety is still a preview feature and stays banned by CS-LANG-15.
- CS-LANG-11 "match both" for CS9272 and CS9273: SDK 11.0.100 still reports CS9273 and CS9258; the Learn pages returned 404, so the "docs say" half is unverifiable and the wording stays.
- CS-API-18 itself: `net10.0` still reports `SYSLIB1222` and `SYSLIB1038`, and `[JsonRequired]` on a get-only property still throws.
- `json.md` row 25 and CS-JSON-07 G7: closed inference throws on an unseen tag (now measured on GA).
- CS-PROC-17: no .NET 11 breaking change touches SIGTERM or `ProcessExit`. CS-PROC-09 and CS-PROC-14 bind every leg below `net11.0`. The .NET 11 process API names are unchanged from RC1 to GA.
- MTP exit codes 1, 2, 5, 8 and 9 (DN-RULE-07) and the DN-RULE-02 allow-list on SDK 10.0.401; DN-RULE-02's "xunit.v3.mtp-v2 4.0.1" is a historical measurement.
- Package pins still valid: `Microsoft.Testing.Extensions.CodeCoverage` 18.12.0 (newest), `Microsoft.Extensions.TimeProvider.Testing` 10.10.0, ReportGenerator 5.5.11 or later, FluentAssertions 8.x commercial, Moq SponsorLink history, BenchmarkDotNet 0.15.8 (0.16 has previews only), VS.Threading.Analyzers 18.7.23, IDisposableAnalyzers 4.0.8, BannedApiAnalyzers 5.6.0, PublicApiAnalyzers 5.6.0, Meziantou.Analyzer 3.0.297 (MA0004, MA0110, MA0143 unchanged; MA0053 narrowed upstream for generic-constraint classes, which needs no edit), MinVer 8.0.0, Logging.Abstractions floors.
- RS0030 default severity, RS0016, RS0017, RS0036 and RS0037, IDE0370, CA5350 and CA5379 at `10.0-all`, SYSLIB0060, and the SYSLIB10xx logging diagnostics cited by observability.
- CA1861 and CS-PERF-04; CA1876 and CA1877 match no prescribed pattern (CS-XP-01 already bans `Path.Combine` in greenfield code).
- `check-ci-matrix.sh` R3 retired-label regex (`ubuntu-22.04` is already listed, `windows-2022` has no retirement date) and R7 logic; the R7 watched examples (`actions/checkout@v4`, `github/codeql-action/init@v3`) remain valid tags and stay as recorded measurements. The Intel macOS fall-2027 date (no new date found).
- The example tool facts the pair hard-codes: the pair names no ocx exit number (errors.md keeps the table in the adopter's design record), so the 0.6.6 change of exit 82 and the retirement of 83 to 87 change no pair sentence; the `exit_code: 83` examples are unseen-integer examples and stay correct. `binaries.md` 0.6.5 and 0.6.2 references are dated reads. `binaries.md` "publishes none" holds: www-setup issue 14 (detached `dist.json` signature) is still open.
- No System.Text.Json, System.Diagnostics.Process or Microsoft.Extensions CVE in the window.

## Open questions

- D2: the trigger fired on 2026-11-10. Whether and when the owner runs the `dotnet-upgrade` move to `net10.0` only is an owner decision. That move would also delete the `CS-JSON-14` package line, drop the CsCheck 4.x constraint and change the CS-SEC-09 budget.
- .NET 11 is Standard Term Support (2026-11-10 to 2028-11-14). Whether to add a `net11.0` leg is the owner's decision and a `dotnet-upgrade` step.
- `windows-11-vs2026-arm` in the CS-CI-02 `.github/actionlint.yaml` declaration: it begins deprecation on 2026-12-01 with no removal date, and no workflow in the pair uses it. Drop it from the declaration at the next refresh once a removal date exists.
- MTP 3.0.0 (unreleased) removes `--no-progress`, which DN-RULE-02 allow-lists. Re-measure when 3.0 ships.
- DN-RULE-02 and DN-RULE-07 on SDK 11 (`--timeout` exit 3, `--maximum-failed-tests` exit 13, exit 14): not measured; bind only when a `net11.0` leg exists.
- The exit-8 all-skipped whole run is documented for the .NET 11 SDK but not re-measured on 11.0.100.
- Runtime-async default for `net11.0`: documented as opt-in, but an opt-out property also exists; the CS-ASYNC-06 deadlock table on a native `net11.0` build is unmeasured.
- The shared union converter (0 warnings, 198 cases) was not re-run on GA. ApiCompat verdicts for adding a `union` or `closed` case were not run. Whether a custom `TypeClassifier` can map unseen shapes to an `Unknown` case is undetermined.
- CA2252 default severity in .NET 11 and whether CA1861 learned collection expressions: undetermined.
- `Verify` SponsorCheck 0.28.0 (33.7.3) has no description; whether SC021 and SC049 behave as measured on 33.3.3 needs a fresh run. The SC049 wording is not named by the current sponsorship doc.
- Whether `-v:q` still exits 0 on xunit v3 4.0.3 (DN-RULE-02 rationale): not measured.
- Whether every ocx 0.6.8 `--format json` success document carries `schema_version`, and whether ocx-sh/ocx uses immutable releases: undetermined.
- Stryker.NET 5.x ships MTP support; whether it works with an `xunit.v3.mtp-v2` test application is undetermined.

## Revision log

1. D2: tense of the .NET 8 end-of-support trigger; last release named; move marked pending.
2. D8: the contract floor resolves to ocx 0.6.6 for the example tool.
3. language.md header: C# 15 rows re-checked on SDK 11.0.100 GA.
4. CS-LANG-15 rationale: SDK 11.0.100 behaviour on `net10.0`.
5. CS-LANG-15 verification: GA re-check and the `CS-BUILD-04` boundary.
6. CS-LANG-16 rationale: GA exists; the SDK 11 pin and the process APIs are `dotnet-upgrade` steps.
7. CS-LANG-11 rationale: CS9380, CS1519, CS9370 and CS8981 facts.
8. CS-LANG-11 verification: L11d listed.
9. CS-LANG-11 verification: L11d watched result.
10. language.md block: L11d check cell inserted after L11c.
11. CS-LANG-19: `readonly` parameter absent on GA (CS9190).
12. json.md defaults: end-of-support tense.
13. json.md union-converter probe: not re-run on GA.
14. json.md policy table: `closed` is CS0656 on SDK 11.0.100.
15. json.md policy footnote: closed inference available only on `net11.0` since GA.
16. json.md anti-pattern row 25: the measured unseen-tag throw.
17. api-design.md reach note: dropping `net8.0` is available now.
18. CS-API-08 rationale: CS0656 on SDK 11.0.100 and the measured throw.
19. CS-API-18 rationale: GA acceptance on `net11.0` only.
20. security.md: .NET 8 and 9 reached end of support; last releases.
21. async.md defaults: end-of-support tense.
22. CS-ASYNC-06 rationale: runtime-async switch named.
23. processes.md CS-PROC-23 note: `KillOnParentExit` platform list.
24. CS-OBS-29 rationale: ocx 0.6.8.
25. CS-OBS-29 rationale: env-carrier spec Stable.
26. CS-OBS-29 verification: re-checked on the v0.6.8 tag.
27. testing.md versions: CsCheck 5.x net8.0 note.
28. testing.md versions: Verify 33.4.0 and xunit 4.0.3 coupling.
29. testing.md dated externals: .NET 8 and 9, `macos-14`, `ubuntu-latest`, `ubuntu-22.04`, VS 2026 labels.
30. testing.md dated externals: .NET 11 GA, re-run pending.
31. testing.md exit-8 gap: documented for the .NET 11 SDK.
32. testing.md cs-test-05 cell: pin pattern accepts later 4.0.x patches.
33. CS-TEST-05 rule: pin wording.
34. CS-TEST-05 verification: widened pattern watched.
35. CS-TEST-23 rationale: Verify and xunit coupling.
36. CS-TEST-23 verification: restore with no downgrade.
37. CS-CI-02 rationale: runner label dates.
38. CS-CI-02 verification: actionlint still 1.7.12.
39. CS-CI-06: .NET 11 setup step is GA.

Spillover round: no change to the target. Both items were checked and the target text was already correct (see "Spillover round").

## Edit list

Apply each entry with an exact find-and-replace. Every find text below was checked to occur exactly once in its file on 2026-11-27. Paths are relative to the repository root.

### 1. `rules/csharp-quality.md`

Find:

```text
**D2** The floor is `net8.0;net10.0` until .NET 8 end of support (2026-11-10); `net10.0` only is the end state, executed by `dotnet-upgrade`.
```

Replace with:

```text
**D2** The floor is `net8.0;net10.0` until .NET 8 end of support, which came on 2026-11-10 (last release 8.0.34); `net10.0` only is the end state, executed by `dotnet-upgrade`, and that move is now pending.
```

### 2. `rules/csharp-quality.md`

Find:

```text
**D8** The SDK floor is the first tool release carrying the machine contract, and the tested version lives in one constant.
```

Replace with:

```text
**D8** The SDK floor is the first tool release carrying the machine contract (for the example tool, ocx 0.6.6 of 2026-11-12), and the tested version lives in one constant.
```

### 3. `skills/csharp-quality-reference/language.md`

Find:

```text
C# 15 and .NET 11 rows bind to SDK 11.0.100-rc.1.26425.128 (RC1, measured 2026-10-11) and are fenced.
```

Replace with:

```text
C# 15 and .NET 11 rows bind to SDK 11.0.100-rc.1.26425.128 (RC1, measured 2026-10-11), were re-checked on SDK 11.0.100 (GA 2026-11-10, measured 2026-11-27) and are fenced.
```

### 4. `skills/csharp-quality-reference/language.md`

Find:

```text
`LangVersion=preview` on SDK 10.0.401 silently accepts C# 15 syntax.
```

Replace with:

```text
`LangVersion=preview` on SDK 10.0.401 silently accepts C# 15 syntax. On SDK 11.0.100 a `net10.0` target accepts the syntax-only C# 15 features (labeled `continue`, `[with(...)]`) under `LangVersion` 15 or `preview`, while `closed` fails with `CS0656` and `union` with `CS0518`, because their attribute types ship only in the `net11.0` reference assemblies; there `CS8652` names the feature `updated memory safety rules` (measured 2026-11-27).
```

### 5. `skills/csharp-quality-reference/language.md`

Find:

```text
L15b now scans every yml and yaml file, where it scanned `.github` only and missed docker-tools' pipeline files. | MUST |
```

Replace with:

```text
L15b now scans every yml and yaml file, where it scanned `.github` only and missed docker-tools' pipeline files. Re-checked on SDK 11.0.100 (measured 2026-11-27): a `net10.0` project built labeled `continue` with 0 errors under `LangVersion` 15 and failed `closed` with `CS0656`; a `LangVersion` 15 in a project file is `CS-BUILD-04`'s check, and the per-TFM build is the check for the syntax. | MUST |
```

### 6. `skills/csharp-quality-reference/language.md`

Find:

```text
SDK 10.0.401 cannot add the leg (`NETSDK1045`, `CS1617`). The .NET 11 process APIs wait for an SDK 11 GA pin and are a `dotnet-upgrade` re-check.
```

Replace with:

```text
SDK 10.0.401 cannot add the leg (`NETSDK1045`, `CS1617`). SDK 11.0.100 (GA 2026-11-10) can, and on `net8.0;net10.0` it still built such a region with 0 errors (measured 2026-11-27). Adding the `net11.0` leg, with its SDK 11 pin, and the .NET 11 process APIs are a `dotnet-upgrade` re-check.
```

### 7. `skills/csharp-quality-reference/language.md`

Find:

```text
(measured 2026-10-11). `CS9264`, not CS8618, reports the missing initializer
```

Replace with:

```text
(measured 2026-10-11). On a `net11.0` target a type named `closed` is `CS9380` and a field typed `closed` is `CS1519` (SDK 11.0.100, measured 2026-11-27), a `union` that starts a declaration is `CS9370` (Roslyn breaking changes for .NET 11), and a type named `union` is only `CS8981`, so the name clause has its own cell. `CS9264`, not CS8618, reports the missing initializer
```

### 8. `skills/csharp-quality-reference/language.md`

Find:

```text
L11c prints nothing, L11a prints nothing
```

Replace with:

```text
L11c and L11d print nothing, L11a prints nothing
```

### 9. `skills/csharp-quality-reference/language.md`

Find:

```text
and green printed nothing for all three. | MUST |
```

Replace with:

```text
and green printed nothing for all three. L11d (measured 2026-11-27, GNU grep 3.11) red printed 8 lines (a `class closed`, a `record union`, a `struct @extension`, an `interface union` and four members with a modifier named `union`, `closed` or `extension`), green nothing for `public closed class Shape`, `public union Pet(Cat, Dog);`, an `extension(string s)` block, a comment, a string literal, `unionCount` and `IsClosed`. | MUST |
```

### 10. `skills/csharp-quality-reference/language.md` (insertion)

Anchor line (insert the two lines below directly after it):

```text
grep -rnE --include='*.props' --include='*.csproj' --include='*.targets' --include='.globalconfig' --include='.editorconfig' --exclude-dir=obj --exclude-dir=bin -e 'CS9258' -e 'CS927[23]' -e 'CS9264' .
```

Insert after:

```text
# L11d no type, and no member with a modifier, named union, closed or extension, with or without @ (strings and comment lines skipped; a C# 15 union or closed declaration is the CS-API-08 scan)
grep -rnP --include='*.cs' --exclude-dir=obj --exclude-dir=bin '"(?:[^"\\]|\\.)*"(*SKIP)(*F)|//.*(*SKIP)(*F)|\b(?:class|record|struct|interface|enum)\s+@?(?:closed|union|extension)\b|^\s*(?:(?:public|private|protected|internal|static|readonly|const|new|override|virtual|abstract|sealed|required)\s+)+[\w<>,?.\[\] ]*[\w>?\]]\s+@?(?:closed|union|extension)\s*[;={(]' $SRC | grep -vE ':[0-9]+:[[:space:]]*(//|\*)'
```

### 11. `skills/csharp-quality-reference/language.md`

Find:

```text
a `readonly` parameter does not exist even on RC1
```

Replace with:

```text
a `readonly` parameter does not exist on RC1 or on GA (`CS9190` on SDK 11.0.100, measured 2026-11-27)
```

### 12. `skills/csharp-quality-reference/json.md`

Find:

```text
  (2026-11-10), then `net10.0` only, which deletes the package line of `CS-JSON-14`.
```

Replace with:

```text
  (reached 2026-11-10; the move is pending), then `net10.0` only, which deletes the package line of `CS-JSON-14`.
```

### 13. `skills/csharp-quality-reference/json.md`

Find:

```text
  198 cases (measured 2026-10-11). It is a probe; no `net11.0` leg exists.
```

Replace with:

```text
  198 cases (measured 2026-10-11; not re-run on SDK 11.0.100 GA). It is a probe; no `net11.0` leg exists.
```

### 14. `skills/csharp-quality-reference/json.md`

Find:

```text
| no (`closed` is CS8652 on SDK 10.0.401) |
```

Replace with:

```text
| no (`closed` is CS8652 on SDK 10.0.401 and CS0656 on SDK 11.0.100) |
```

### 15. `skills/csharp-quality-reference/json.md`

Find:

```text
last row is unavailable until .NET 11 GA (November 2026).
```

Replace with:

```text
last row works only on `net11.0`, from .NET 11 GA (2026-11-10, SDK 11.0.100), and stays unavailable on these three targets.
```

### 16. `skills/csharp-quality-reference/json.md`

Find:

```text
(CS8652 on SDK 10.0.401, throws on an unseen tag)
```

Replace with:

```text
(CS8652 on SDK 10.0.401; on `net11.0` an unseen tag throws `JsonException` and `IgnoreUnrecognizedTypeDiscriminators` has no concrete base to fall back to, measured 2026-11-27)
```

### 17. `skills/csharp-quality-reference/api-design.md`

Find:

```text
Dropping the `net8.0` leg after .NET 8 end of support (2026-11-10) is `PKV006` by design and a major (`CS-API-14`).
```

Replace with:

```text
Dropping the `net8.0` leg, open since .NET 8 end of support on 2026-11-10, is `PKV006` by design and a major (`CS-API-14`).
```

### 18. `skills/csharp-quality-reference/api-design.md`

Find:

```text
`closed` is `CS8652` on SDK 10.0.401.
```

Replace with:

```text
`closed` is `CS8652` on SDK 10.0.401 and `CS0656` on SDK 11.0.100 targeting `net10.0`; it is legal only on `net11.0`, and there an unseen tag still throws, because `IgnoreUnrecognizedTypeDiscriminators` cannot fall back to the implicitly abstract closed base (measured 2026-11-27).
```

### 19. `skills/csharp-quality-reference/api-design.md`

Find:

```text
.NET 11 RC1 accepted them as of 2026-10
```

Replace with:

```text
.NET 11 accepts them on `net11.0` only (RC1 as of 2026-10; GA documents it, and SDK 11.0.100 still reported both on the `net10.0` target of the same project, measured 2026-11-27)
```

### 20. `skills/csharp-quality-reference/security.md`

Find:

```text
- .NET 8 and 9 reach end of support on 2026-11-10.
```

Replace with:

```text
- .NET 8 and 9 reached end of support on 2026-11-10 and get no further security fixes (last releases 8.0.34 and 9.0.23).
```

### 21. `skills/csharp-quality-reference/async.md`

Find:

```text
net8.0 and net10.0 until .NET 8 end of support (2026-11-10)
```

Replace with:

```text
net8.0 and net10.0 until .NET 8 end of support (reached 2026-11-10; the move to net10.0 only is pending)
```

### 22. `skills/csharp-quality-reference/async.md`

Find:

```text
Same on 11.0.100-rc.1 with runtime-async on.
```

Replace with:

```text
Same on 11.0.100-rc.1 with runtime-async on (`<Features>runtime-async=on</Features>`, the documented opt-in; not re-measured on 11.0.100 GA).
```

### 23. `skills/csharp-quality-reference/processes.md`

Find:

```text
`dotnet-upgrade` re-check, and no such code compiles until a `net11.0` leg exists (`CS-LANG-16`).
```

Replace with:

```text
`dotnet-upgrade` re-check, and no such code compiles until a `net11.0` leg exists (`CS-LANG-16`). At GA (2026-11-10) `KillOnParentExit`
covers Windows, Linux and Android only, never macOS, so the tree kill of `CS-PROC-14` stays the only containment there (API reference, read 2026-11-27).
```

### 24. `skills/csharp-quality-reference/observability.md`

Find:

```text
`ocx` 0.6.5 and main read no trace context
```

Replace with:

```text
`ocx` 0.6.5 and 0.6.8 (2026-11-15) read no trace context
```

### 25. `skills/csharp-quality-reference/observability.md`

Find:

```text
The OTel env-carrier spec is a Release Candidate.
```

Replace with:

```text
The OTel env-carrier spec is Stable since specification v1.63.0 (2026-11-23) and fixes no variable names; propagators choose them.
```

### 26. `skills/csharp-quality-reference/observability.md`

Find:

```text
Absence on the tool side was checked by search only.
```

Replace with:

```text
Absence on the tool side was checked by search only (re-checked on the ocx v0.6.8 tag, 2026-11-27).
```

### 27. `skills/csharp-quality-reference/testing.md`

Find:

```text
CsCheck 4.9.1, ReportGenerator
```

Replace with:

```text
CsCheck 4.9.1 (5.x ships only `net10.0` and `net11.0` assets: keep 4.x while `net8.0` is a target), ReportGenerator
```

### 28. `skills/csharp-quality-reference/testing.md`

Find:

```text
Verify 33 and later fails with SC021 without a declaration.
```

Replace with:

```text
Verify 33 and later fails with SC021 without a declaration, and `Verify.XunitV3` 33.4.0 and later needs xunit v3 4.0.3 or later (33.3.4 is the last on 4.0.2, read 2026-11-27).
```

### 29. `skills/csharp-quality-reference/testing.md`

Find:

```text
- Dated externals (read 2026-10-11): .NET 8 and 9 reach end of support 2026-11-10. `macos-14` is unsupported from 2026-11-02. `ubuntu-latest` moves to 26.04 between 2026-10-19 and 2026-11-19.
```

Replace with:

```text
- Dated externals (re-read 2026-11-27): .NET 8 and 9 reached end of support on 2026-11-10. `macos-14` was retired on 2026-11-02. `ubuntu-latest` moved to 26.04 in the 2026-10-19 to 2026-11-19 rollout. `ubuntu-22.04` and `ubuntu-22.04-arm` retire on 2027-04-17. `windows-2025-vs2026` and `windows-11-vs2026-arm` start deprecation on 2026-12-01 (use `windows-2025` and `windows-11-arm`).
```

### 30. `skills/csharp-quality-reference/testing.md`

Find:

```text
  The Intel macOS image ends in fall 2027. .NET 11 GA is November 2026: re-run the analyzer and exit-code checks then.
```

Replace with:

```text
  The Intel macOS image ends in fall 2027. .NET 11 went GA on 2026-11-10 (SDK 11.0.100): the re-run of the analyzer and exit-code checks on it is still pending.
```

### 31. `skills/csharp-quality-reference/testing.md`

Find:

```text
- Gap: SDK 11.0.100-rc.1 fails an all-skipped whole run with exit 8, SDK 10.0.401 exits 0 (measured 2026-10-11). The per-module minimum of `CS-TEST-06` fails both.
```

Replace with:

```text
- Gap: SDK 11.0.100-rc.1 fails an all-skipped whole run with exit 8, SDK 10.0.401 exits 0 (measured 2026-10-11). The .NET 11 SDK documents this for GA: with no global minimum, an all-skipped whole run exits 8 whatever the per-module `--zero-tests-policy` (read 2026-11-27, not re-measured on 11.0.100). The per-module minimum of `CS-TEST-06` fails both.
```

### 32. `skills/csharp-quality-reference/testing.md`

Find:

```text
  rg -q -g 'Directory.Packages.props' -e 'PackageVersion Include="xunit\.v3\.mtp-v2" Version="4\.0\.2"' . || echo 'missing xunit.v3.mtp-v2 4.0.2'
```

Replace with:

```text
  rg -q -g 'Directory.Packages.props' -e 'PackageVersion Include="xunit\.v3\.mtp-v2" Version="4\.0\.([2-9]|[1-9][0-9])"' . || echo 'missing xunit.v3.mtp-v2 4.0.2 or a later 4.0.x'
```

### 33. `skills/csharp-quality-reference/testing.md`

Find:

```text
`xunit.v3.mtp-v2` 4.0.2, `<UseMicrosoftTestingPlatformRunner>
```

Replace with:

```text
`xunit.v3.mtp-v2` 4.0.2 or a later 4.0.x patch, with `xunit.v3.assert` on the same version (4.0.3 pins its inner packages exactly), `<UseMicrosoftTestingPlatformRunner>
```

### 34. `skills/csharp-quality-reference/testing.md`

Find:

```text
Block `cs-test-05` (the pin and the `jq` check exit 0), then `cs-test-10`.
```

Replace with:

```text
Block `cs-test-05` (the pin and the `jq` check exit 0), then `cs-test-10`. The widened pin pattern (measured 2026-11-27, ripgrep 14.1.1) passed 4.0.2, 4.0.3 and 4.0.10 and printed `missing` for 4.0.1, 4.1.0 and 40.0.2.
```

### 35. `skills/csharp-quality-reference/testing.md`

Find:

```text
`LicenseIgnored` survives warnings-as-errors. |
```

Replace with:

```text
`LicenseIgnored` survives warnings-as-errors. `Verify.XunitV3` 33.4.0 and later depends on xunit v3 4.0.3 (nuspec, read 2026-11-27), so it moves together with xunit, and a repository on 4.0.2 stays on 33.3.4 or earlier. |
```

### 36. `skills/csharp-quality-reference/testing.md`

Find:

```text
Block `cs-test-23`, empty output is the pass, and `dotnet build` exits 0.
```

Replace with:

```text
Block `cs-test-23`, empty output is the pass, the restore reports no package downgrade, and `dotnet build` exits 0.
```

### 37. `skills/csharp-quality-reference/testing.md`

Find:

```text
`ubuntu-latest` moves to 26.04 between 2026-10-19 and 2026-11-19, and brownouts fail retiring labels early.
```

Replace with:

```text
`ubuntu-latest` moved to 26.04 in the 2026-10-19 to 2026-11-19 rollout, `ubuntu-22.04` retires on 2027-04-17 after brownouts from 2027-03-23, `windows-2025-vs2026` and `windows-11-vs2026-arm` start deprecation on 2026-12-01 (use `windows-2025` and `windows-11-arm`), and brownouts fail retiring labels early (read 2026-11-27).
```

### 38. `skills/csharp-quality-reference/testing.md`

Find:

```text
R3 of `check-ci-matrix.sh` and `actionlint` with no unaccepted finding (block `cs-ci-07`).
```

Replace with:

```text
R3 of `check-ci-matrix.sh` and `actionlint` with no unaccepted finding (block `cs-ci-07`). actionlint 1.7.12 is still the latest release, and its label list on main still lacks the three declared labels (read 2026-11-27).
```

### 39. `skills/csharp-quality-reference/testing.md`

Find:

```text
a separate .NET 11 RC setup step
```

Replace with:

```text
a separate .NET 11 setup step (SDK 11.0.100, GA 2026-11-10)
```

## Spillover round

This round decides two items that the dotnet-build pipeline reported for this pair. The evidence is `.agents/research/refresh-2026-11/csharp-quality/spillover-check.md`. Both items are confirmed by a primary source, and in both cases the target text is already true on 2026-11-27.

### Verdict

- No rule or skill text changes. No rule ID is added, retired or renumbered.
- The CA1515 extension-member fix in the SDK 11 analyzers belongs to `CS-BUILD-12` in dotnet-build. The CA1515 text in this pair (`CS-TEST-12` and the `performance.md` benchmark step) is about public helper and benchmark types, not about extension members, so the fix does not touch it. The `CS-LANG-12` CA1034 line is only a pointer to `CS-BUILD-12`.
- The `pull_request_target` block and the workflow lockfile GA leave `CS-CI-08` R7 true. Nothing in the target recommends `pull_request_target`, and `check-ci-matrix.sh` lists it only as one of several other triggers.

### Changed rules

None.

### New rules

None.

### Declined

1. Item 1, CA1515 false positive on C# extension members fixed in the SDK 11 analyzers. Confirmed by primary source, but no text in this pair makes the contradicted claim. The `analyzers.props` comment the item cites is in the dotnet-build artifacts (`CS-BUILD-12`) and is that pipeline's to update.
2. Item 2, `pull_request_target` blocked by default in public repositories from 2026-12-02. Confirmed by primary source. The optional sentence for the `CS-CI-08` reason column is declined: no target text is wrong, no rule depends on the trigger staying allowed, and the sentence would add a fact that no check verifies.
3. Item 2, workflow lockfiles GA on 2026-10-28 as a competitor to 40-hex SHA pins. The GA date is confirmed, but the primary source scopes it to GitHub Enterprise Cloud and does not mention SHA pinning; the competitor framing is secondary inference. `check-ci-matrix.sh` R7 cannot verify a lockfile, so lockfiles are not added as an alternative to R7.

### Sources

| Item | Source | Kind | Date | Finding |
|---|---|---|---|---|
| 1 | https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/sdk | primary | 2026-11-10, updated 2026-11-17 | "CA1515: Fixed false positive when C# extension members are present"; no 10.0 backport documented. No target change. |
| 2 | https://github.blog/changelog/2026-11-02-pull_request_target-blocked-by-default-december-2/ | primary | 2026-11-02 | Blocked by default in public repositories from 2026-12-02 unless an Actions event policy allows it; private and internal repositories not affected. No target change. |
| 2 | https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available/ | primary | 2026-10-28 | GA on GitHub Enterprise Cloud; `.github/workflows/actions.lock`; no mention of SHA pinning. No target change. |

### Edit list (spillover round)

Empty. No file in the target changes in this round.
