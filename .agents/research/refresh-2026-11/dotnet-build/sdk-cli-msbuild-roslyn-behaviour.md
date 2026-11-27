---
title: SDK CLI, MSBuild and Roslyn behaviour delta, 2026-10-11 to 2026-11-27
pair: dotnet-build
date_researched: 2026-11-27
window_start: 2026-10-11
model: sonnet
sources_fetched: 20
---

# SDK CLI, MSBuild and Roslyn behaviour delta (dotnet-build)

Scope: a delta against the baseline measured 2026-10-11 on SDK 10.0.401 with SDK 11.0.100-rc.1.26425.128 as probe-only. Only the behaviour the rows of rules/dotnet-build.md measured is covered. No dotnet SDK is installed on the research host, so nothing here was measured locally. Every "changed" verdict rests on a Microsoft Learn page or release feed; every "needs re-measure" names the command.

## Summary

- .NET 11.0.0 reached GA on 2026-11-10 (SDK 11.0.100); RC2 (11.0.100-rc.2.26504.105, 2026-10-13) and RC3 (11.0.100-rc.3.26522.148, 2026-10-25) came between the baseline and GA. The 10.0 band moved from 10.0.401 to 10.0.404 (10.0.402 on 2026-10-13, 10.0.403 on 2026-10-25 per the 10.0 feed, 10.0.404 on 2026-11-10, runtime 10.0.15). The 8.0 floor SDK is now 8.0.428 and 9.0 is 9.0.321, both released 2026-11-10.
- Every "SDK 11 RC1" statement in the rule text is now stale: a machine with no pin selects 11.0.100 GA. The behaviour claims survive; the version label does not.
- CS-BUILD-12 claim changed: CA1034 and CA1515 false positives on C# extension members are listed as fixed in the .NET 11 SDK.
- CS-BUILD-22 claim confirmed and now documented as a breaking change, with the introducing versions 10.0.302, 10.0.400 and .NET 11.
- CS-BUILD-04 changed in one fact: C# 15 is the default for net11.0 and `latest` is 15 on a released SDK 11. Pin value 14 still valid.
- New .NET 11 default that can bite the gate: the MSBuild server is enabled by default, and the NativeAOT CLI fast path is on by default. `--disable-build-servers` stays correct.
- New .NET 11 override: `DOTNET_TEST_RUNNER` selects the test runner without a `global.json` change, so the CS-BUILD-20 MSB1001 branch can differ by environment.
- dotnet/roslyn#41640 is still open (last updated 2026-10-06), so the IDE0005 claim is unchanged.

## Findings (per claim)

Verdict key: unchanged, changed, re-measure, could not determine.

### 1. CS-BUILD-04 LangVersion

- `latest` is 14 on SDK 10: unchanged (no source says otherwise; SDK 10 is a servicing band).
- `latest` is 15 on SDK 11 RC1: changed in label only. The page [What's new in C# 15](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-15) (ms.date 2026-11-10, updated 2026-11-19) states "C# 15 is the default language version for projects that target `net11.0` in the .NET 11 SDK" and C# 15 is shipped, not preview. [Configure language version](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/configure-language-version) (updated 2026-11-26) lists `15.0` and defines `latest` as the latest released compiler version, and warns against `latest`. New text: `latest` is 15 on SDK 11.0.100 GA. Upstream change date: 2026-11-10.
- Preview-only status: the Roslyn page [compiler breaking changes since C# 14](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/breaking-changes/compiler%20breaking%20changes%20-%20dotnet%2011) (updated 2026-08-13) also mentions C# 16 items under `langversion:16`; `preview` on SDK 11 therefore means C# 16 features. This does not affect the pin of 14 but strengthens the "never `preview`" half.
- SDK 8 rejects `14` (CS1617): could not determine for the delta; no source in the window touches it. Treat as unchanged. The floor SDK moved to 8.0.428, so a local re-measure on that SDK is cheap: `dotnet --version && dotnet msbuild -p:LangVersion=14 -t:CoreCompile` in a net8.0 project under `global.json` pinning 8.0.428.
- CS9240 compile-only C# 14 features on net8: could not determine; the Roslyn .NET 11 breaking-change list has no CS9240 entry. Re-measure on SDK 10.0.404 with a net8.0 project using `extension` blocks and a runtime-bound C# 14 feature.
- New C# 15 contextual keywords (`closed`, `union`) are source-breaking only under C# 15. Not relevant under a pin of 14.
- Verification cell: block `langversion` accepts `14` and `14.0`; it is unaffected. No false pass or false fail.

### 2. CS-BUILD-20 and CS-BUILD-21 global.json

Source: [global.json overview](https://learn.microsoft.com/en-us/dotnet/core/tools/global-json) (ms.date 2026-03-05, updated 2026-04-30; predates the window, so it is unchanged by definition).

- "No global.json, a version-less allowPrerelease: true and latestMajor all select the highest installed SDK, prereleases included outside Visual Studio": unchanged in mechanism (matching rules text still says this). Result now: the highest installed SDK is 11.0.100 GA, not RC1. Wording must say "SDK 11".
- "latestFeature cannot reach 11": unchanged; the docs define latestFeature as the same major and minor.
- Invalid global.json ignored with exit 0: could not determine from docs; the page documents only that `dotnet --info` shows "Version '10.0' is not valid for the 'sdk/version' value." Re-measure on 10.0.404 and 11.0.100: `printf '{"sdk":{"version":"10.0","rollForward":"latestFeature"},}' > global.json; dotnet --version; echo $?; dotnet --info | grep -i 'not valid'`. NETSDK1057 info level: re-measure with `dotnet build -v:n | grep NETSDK1057`.
- Exit 155 without errorMessage: could not determine; re-measure with an unsatisfiable pin (`"version":"9.9.999","rollForward":"disable"`) and read `echo $?`.
- `errorMessage` and `paths`: documented "Available since .NET 10 SDK"; unchanged.
- `test.runner` and MSB1001: the key is documented ("Available since .NET 10.0 SDK", values `Microsoft.Testing.Platform`). Changed context: the page [What's new in the SDK and tooling for .NET 11](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/sdk) (updated 2026-11-17) adds a `DOTNET_TEST_RUNNER` environment variable ("Set it to `VSTest` or `Microsoft.Testing.Platform` to override `global.json` for the current session"). The MSB1001 behaviour on 11.0.100 is not documented; re-measure: `dotnet test --solution X.slnx --minimum-expected-tests 1` once with the key removed and `DOTNET_TEST_RUNNER` unset, once with it set.
- False pass risk: the gate reads `jq -e '.test.runner == ...' "$G"`. If a CI image exports `DOTNET_TEST_RUNNER=VSTest`, the gate takes the MTP branch while dotnet runs VSTest, or the reverse. Add `echo "${DOTNET_TEST_RUNNER:-unset}"` to the gate or unset it in DN-RULE-02's environment block. This is a possible false fail or false pass on SDK 11 only.
- Also noted: [Breaking changes in .NET 11](https://learn.microsoft.com/en-us/dotnet/core/compatibility/11) lists "Workload operations and global.json now detect versions written in the internal NuGet package format" (SDK 11 whats-new). No effect on the rows.

### 3. CS-BUILD-22 dnx

Source: [dnx scripts bypass global.json SDK selection](https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/11/dnx-scripts-bypass-global-json) (ms.date 2026-11-10).

- Claim "dnx on SDK 10.0.3xx/4xx and 11 runs the newest installed SDK, ignoring global.json": unchanged and now confirmed. New text: introduced in .NET 10 SDK 10.0.302, 10.0.400 and .NET 11; the scripts run `dotnet --list-sdks`, pick the newest and invoke `dotnet exec <sdk>/dotnet.dll dnx`. Recommended action in the page: use `dotnet dnx` to keep global.json in force. Replace the baseline source "dotnet/sdk commit cf67b96" with this URL.
- "floats the tool version": unchanged. [dotnet tool exec](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-tool-exec) (ms.date 2026-09-15): no version means the latest from configured feeds; a local tool manifest wins when present.
- Changed fact that weakens a rationale, not the rule: the 11 SDK page says "`dotnet tool exec` and `dnx` no longer prompt for an extra approval when running tools", and `-y|--yes` is "Available starting with .NET 11" (the approval prompt exists on the 10 band). The rule's recommendation `dotnet tool exec <id>@<exact version>` is still valid. Under SDK 10 CI there may be a prompt: pass `--yes` only on 11. Re-measure: `dotnet tool exec dotnetsay@2.1.0 --yes -- hi` on 10.0.404 (expect an unknown-option error on 10) and on 11.0.100 (expect success).
- Verification grep for the word `dnx`: unchanged, no false pass or fail. Note `dotnet dnx` also matches `-w dnx`; the rule says never call dnx, and the docs call `dotnet dnx` a hidden alias, so the hit is correct.

### 4. CS-BUILD-30 and the gate flags

Sources: [dotnet build](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-build) (ms.date 2026-05-18, predates window), [dotnet test with MTP](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-test-mtp) (ms.date 2026-11-19), [MTP troubleshooting](https://learn.microsoft.com/en-us/dotnet/core/testing/microsoft-testing-platform-troubleshooting) (2026-09-21).

- `--disable-build-servers` accepted by `build`: unchanged ("Available since .NET 7 SDK"). `--tl:[auto|on|off]` on build: unchanged.
- `--interactive` defaults on in interactive terminals since .NET 10: could not determine from docs; the build page only says "Allows the command to stop and wait for user input". Re-measure on 11.0.100: `script -qec 'dotnet restore' /dev/null` against a feed that returns 401, and read whether a prompt appears.
- `dotnet test` under MTP exits 5 on either flag: unchanged in mechanism (exit 5 means invalid arguments per the troubleshooting table), but a changed condition on SDK 11: the test page says "Starting with .NET 11, `--tl`, `--terminallogger`, and `--tlp` are forwarded to MSBuild instead of being passed to the test application." So `dotnet test --tl:off` on SDK 11 no longer reaches the test app and may no longer exit 5. `--interactive` is not documented for `dotnet test` MTP. Re-measure on 10.0.404 and 11.0.100: `dotnet test --solution S.slnx --no-build --tl:off; echo $?` and `... --interactive false; echo $?`. The rule's advice (use the environment, not the flag) stays safe on both bands. Rewrite of the rationale is needed only if the re-measure shows 0 on 11.
- `msbuild` and `package list` reject `--interactive false`: could not determine; no doc covers it. Same re-measure with those verbs.
- MSBuild server and `--disable-build-servers` (corpus open question): the 11 SDK page says "The MSBuild server is now enabled by default ... To opt out, set `DOTNET_CLI_USE_MSBUILD_SERVER=false` or `MSBUILDUSESERVER=0`", and a second entry says the CLI no longer writes `MSBUILDUSESERVER=0` when `DOTNET_CLI_USE_MSBUILD_SERVER` is unset. The environment variables page (updated 2026-11-11) still says "By default, MSBuild will execute in-proc"; the two Microsoft pages disagree, so the default is best treated as needing a re-measure: `dotnet build -c Release; pgrep -af 'MSBuild.dll.*nodemode|msbuild.*server'` on 11.0.100. Either way `--disable-build-servers` is still an accepted flag on build in the docs, and keeping it is the safe choice. GA did not remove it.
- NativeAOT CLI (corpus open question): [NativeAOT CLI command handling enabled by default](https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/11/native-cli-command-handling-enabled) (ms.date 2026-11-10): `DOTNET_CLI_ENABLEAOT` defaults to enabled on all platforms from .NET 11; opt-out with `false`, `0`, `no` or `off`; unhandled commands fall back to the managed CLI. Served natively: `--version`, `--info`, `--help`, `--cli-schema`, `sln list/migrate/remove`, plus tool and external commands. Impact: the gate's `dotnet --version` (sdk-assert) now runs through the native path on 11. State leaked across repeated invocations is not documented. Re-measure: `DOTNET_CLI_ENABLEAOT=false dotnet --version` versus unset, same output on both, and `dotnet --info | head`.
- Verification cell (block `tl-flags`) reads flags in source; unaffected by the above.

### 5. CS-BUILD-16 dotnet format exit codes

Source: [dotnet format](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-format) (ms.date 2026-09-15). The page still says only "Terminates with a non zero exit code if any files would have been formatted"; no code table. Unchanged and could not determine for the exact value 2 on both an analyzer error and a style diff. New in 11: `--framework <TFM>` ("Available starting with .NET 11") and `dotnet format` accepts a file-based app; configuration discovery in folder mode is limited to included files. The gate's `--include` and `--no-restore` are unchanged. Re-measure on 10.0.404 and 11.0.100: tree with `DateTime.Now` and an RS0030 ban: `dotnet format --verify-no-changes --no-restore; echo $?` expecting 2, and a whitespace-only diff expecting 2. A multi-target repo on 11 could pass `--framework net10.0` to skip the second TFM, but the rule does not need it.

### 6. CS-BUILD-14 IDE0005 and EnableGenerateDocumentationFile

- dotnet/roslyn#41640 "Compiler does not report unused imports when XML doc comments are disabled": still open, updated 2026-10-06 (read through `gh api repos/dotnet/roslyn/issues/41640`). Unchanged.
- `error EnableGenerateDocumentationFile`: could not determine; no source. Re-measure on 11.0.100: a test project with `GenerateDocumentationFile=false` plus `EnforceCodeStyleInBuild=true` and an IDE0005 line at warning, `dotnet build 2>&1 | grep -i EnableGenerateDocumentationFile`.
- Related: `AnalysisLevel=latest` previously used .NET 9 rules on SDK 11 and is fixed in 11.0.100 ("AnalysisLevel corrected for .NET 11"). If a repo uses `AnalysisLevel=latest`, new analyzer findings on 11 are expected. The rule pins `AnalysisLevel` per CS-BUILD-10; re-run the effective-value read there.

### 7. CS-BUILD-12 CA1034 and extension blocks

Changed. The SDK 11 page ([What's new in the SDK and tooling for .NET 11](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/sdk)) has an "Analyzer bug fixes" table: "CA1034: Fixed false positive when C# extension members are present" and the same for CA1515, in the .NET 11 SDK. Date of upstream change: GA 2026-11-10, exact commit not found. A servicing backport to 10.0.404 is not documented anywhere I could read; the baseline measured the false positive on 10.0.401. New text for the row: "CA1034 on `extension(...)` blocks is a false positive on SDK 10.0.4xx (measured 10.0.401); fixed in the SDK 11 analyzers; suppress at the site on the 10 band." Re-measure: a public static class with one `extension(string s)` block, `dotnet build -warnaserror -p:AnalysisMode=All` on 10.0.404 and 11.0.100; grep CA1034. I did not find the upstream issue number; GitHub search was rate-limited and web search returned no matching issue, so the issue link is "could not determine".

False pass risk: on SDK 11, a site-level `#pragma warning disable CA1034` around an extension class becomes unnecessary, and the suppress-scan check will still count it as a normal pragma. No failure.

### 8. CS-BUILD-29 .slnx

- ".slnx is the SDK 10 default": unchanged for 10. On 11 the same: the 11 SDK page uses `MySolution.slnx` in examples; no change of default is documented. Solution filters (`.slnf`) can now be created with `dotnet new slnf` and edited with `dotnet sln Tests.slnf add ...` ("Solution filter CLI support", SDK 11). A tracked `.slnf` file beside `SLN` is not a solution file for MSB1011? Not documented; the `sln-one` block counts only `.sln` and `.slnx`, so a `.slnf` does not trigger it. The rule text "bare `dotnet build` fails with MSB1011 with two solution files": unchanged; re-measure whether an `.slnf` plus one `.slnx` also fails: `touch Tests.slnf; dotnet build; echo $?` on 11.0.100.
- `dotnet test` MTP in 11 accepts traversal projects (`dirs.proj`). Not a rule row.
- `dotnet test --solution X.slnx`: unchanged.

### 9. CS-BUILD-02 NETSDK1138

[NETSDK1138](https://learn.microsoft.com/en-us/dotnet/core/tools/sdk-errors/netsdk1138) (updated 2026-08-04, before the window) lists out-of-support versions "1.0 ... 5, 6, and 7". It does not yet list 8 or 9, which went out of support on 2026-11-10 (the rule's own date). "Fires for an Exe only": could not determine from the doc. The baseline measurement was before 2026-11-10 for net8 and net9, where the warning cannot have fired. Re-measure after the date on 10.0.404 and 11.0.100: build an Exe and a library with `net8.0` and `net9.0` each, `dotnet build 2>&1 | grep NETSDK1138`. Likely false-pass if the rule's note is read to mean net8 projects will warn: net8 and net9 targets on a library are still free of it per the baseline, but an Exe test project targeting `net8.0` (a test leg) may now emit NETSDK1138 as a warning and fail `TreatWarningsAsErrors` gates. This is a possible new failure for the net8 test-leg Exe projects after 2026-11-10 and is the highest-risk re-measure in this file.

### 10. Corpus open question: interactive and build-server pass-through at GA

No source says GA stopped passing `--interactive` or `--disable-build-servers`. The 11 build page lists `--disable-build-servers` and `--interactive` for `dotnet build`; `dotnet tool exec` lists `--interactive`. The `dotnet test` MTP page lists neither. Verdict: unchanged for `restore`, `build`, `publish`, `pack`, `clean`; re-measure `dotnet test` and `dotnet msbuild`.

## Normative guidance candidates

1. Rule: in CS-BUILD-04 and CS-BUILD-20 replace "SDK 11 RC1" with "SDK 11 (RC and GA)", and say `latest` is 15 on SDK 11.0.100. Rationale: GA shipped 2026-11-10; the probe SDK is no longer RC1. Verify: `dotnet --version` on a machine with no `global.json` prints `11.0.100` and `echo '#error version' > /tmp/t.cs` build prints compiler language version 15.
2. Rule: CS-BUILD-12 states the CA1034 false positive is fixed in the SDK 11 analyzers and persists on 10.0.401. Rationale: SDK 11 page analyzer fix table. Verify: the extension-block probe in Finding 7 on 10.0.404 and 11.0.100.
3. Rule: CS-BUILD-22 cites the breaking-change page and the 10.0.302 start. Rationale: replaces an unreproducible commit reference. Verify: `grep -n 'compatibility/sdk/11/dnx' rules/dotnet-build.md`.
4. Rule: the gate prints or unsets `DOTNET_TEST_RUNNER`. Rationale: SDK 11 lets the environment override `global.json`. Verify: `env | grep DOTNET_TEST_RUNNER` in the gate before the test step.
5. Rule: CS-BUILD-30 rationale for `dotnet test --tl:off` carries "on SDK 11 the flag is forwarded to MSBuild" once re-measured. Verify: Finding 4 commands.
6. Rule: keep `--disable-build-servers` on restore, build and publish under SDK 11. Rationale: MSBuild server enabled by default in the 11 SDK page. Verify: process list after a build.
7. Rule: a net8.0 or net9.0 Exe (a test leg) may warn NETSDK1138 from 2026-11-10; gate on `-warnaserror` re-measured. Verify: `dotnet build -warnaserror 2>&1 | grep NETSDK1138`.

## AI-agent angle

- An agent trained before 2026-11 writes "C# 14 is latest" or "SDK 11 is preview": the current `latest` is 15 on SDK 11 GA. Mechanical check: `grep -rn LangVersion Directory.Build.props` shows `14`.
- An agent runs `dnx` or `dotnet tool exec foo` with no version in CI: floats the tool. Check: the CS-BUILD-22 grep.
- An agent adds `--interactive false` to `dotnet test`: exit 5 on 10, possibly different on 11. Check: the tl-flags block.
- An agent suppresses CA1034 project-wide on seeing the extension false positive: check the suppress-scan block.

## Contested / evolving

- MSBuild server default: the SDK 11 what's-new page says enabled; the environment-variables page (same dates, 2026-11-10/11) says MSBuild runs in-proc by default and describes server V1 as opt-in. Trending toward enabled; re-measure before editing text.
- NETSDK1138 for net8 and net9: the docs page has not caught up with the 2026-11-10 end of support.
- The 11 breaking-change index lists no `global.json` change; the SDK what's-new lists none either. Invalid-`global.json` behaviour is therefore assumed unchanged, not proven.

## Sources

| URL | What | Date | Why |
| --- | --- | --- | --- |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/11 | .NET 11 breaking-change index (SDK and MSBuild section) | updated 2026-11-23 | no global.json, no --interactive change listed |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/11/dnx-scripts-bypass-global-json | dnx breaking change | 2026-11-10 | CS-BUILD-22 |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/11/native-cli-command-handling-enabled | NativeAOT CLI default | 2026-11-10 | corpus open question |
| https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/sdk | .NET 11 SDK what's new | updated 2026-11-17 | CA1034 fix, MSBuild server, DOTNET_TEST_RUNNER, format |
| https://learn.microsoft.com/en-us/dotnet/core/tools/global-json | global.json docs | 2026-03-05 | CS-BUILD-20 mechanics |
| https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-tool-exec | tool exec and dnx | 2026-09-15 | CS-BUILD-22 |
| https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-test-mtp | dotnet test MTP | 2026-11-19 | --tl forwarding, exit codes |
| https://learn.microsoft.com/en-us/dotnet/core/testing/microsoft-testing-platform-troubleshooting | MTP exit codes | 2026-09-21 | exit 5 meaning |
| https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-build | dotnet build options | 2026-05-18 | flags accepted |
| https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-format | dotnet format | 2026-09-15 | exit codes, --framework |
| https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-environment-variables | CLI env variables | 2026-11-10 | ENABLEAOT, MSBuild server |
| https://learn.microsoft.com/en-us/dotnet/core/tools/sdk-errors/netsdk1138 | NETSDK1138 | updated 2026-08-04 | EOL list lacks 8 and 9 |
| https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-15 | C# 15 | 2026-11-10 | default for net11.0 |
| https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/configure-language-version | LangVersion values | updated 2026-11-26 | latest definition |
| https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/breaking-changes/compiler%20breaking%20changes%20-%20dotnet%2011 | Roslyn breaking changes | updated 2026-08-13 | no CS1617/CS9240 entry |
| https://raw.githubusercontent.com/dotnet/core/main/release-notes/11.0/README.md | 11.0 release status | read 2026-11-27 | GA 2026-11-10, RC dates |
| https://raw.githubusercontent.com/dotnet/core/main/release-notes/11.0/releases.json | 11.0 SDK versions | read 2026-11-27 | 11.0.100, rc.2, rc.3 |
| https://raw.githubusercontent.com/dotnet/core/main/release-notes/10.0/releases.json | 10.0 SDK versions | read 2026-11-27 | 10.0.402 to 10.0.404 |
| https://github.com/dotnet/sdk/releases | dotnet/sdk releases via `gh api` | read 2026-11-27 | 8.0.428, 9.0.321, 10.0.404 dates |
| https://github.com/dotnet/roslyn/issues/41640 | IDE0005 without doc file | open, updated 2026-10-06 | CS-BUILD-14 |

Not fetched: the dotnet/sdk 11.0.100 GA GitHub release notes (the API returned only servicing releases for 8, 9 and 10, and the dotnet/core 11.0.100 note path returned 404), the CA1034 extension-block issue (not found), and the MSBuild-specific breaking-change pages (the index lists none).
