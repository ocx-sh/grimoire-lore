---
title: Test, coverage, assertion, mocking, snapshot and benchmark packages, delta 2026-10-11 to 2026-11-27
pair: csharp-quality
date_researched: 2026-11-27
window_start: 2026-10-11
model: sonnet
sources_fetched: 27
---

# Test and benchmark packages: delta since 2026-10-11

Scope: a delta update of the pins in `skills/csharp-quality-reference/testing.md`, `api-design.md`, `observability.md`, `performance.md` and `rules/csharp-quality.md`. Only changes dated 2026-10-11 to 2026-11-27 are reported. Not covered: the rest of the test stack (NSubstitute, actionlint, TrxReport) and Windows or macOS behaviour. Dates come from the NuGet registration API (`published`) and the NuGet or GitHub pages cited below. GitHub release pages show no year, so each was cross-checked against NuGet dates.

## Summary

- Two pins must be reviewed because a newer release breaks an assumption: CsCheck 5.x drops net8.0, and Verify 33.4.0 and later requires xunit.v3 4.0.3 or newer.
- `xunit.v3.mtp-v2` and `xunit.v3.assert` 4.0.3 exist (NuGet 2026-11-09, notes dated 2026-11-08). No exit code or option change. Pin 4.0.2 still valid, but see the Verify coupling below.
- The MTP exit-code table (1, 2, 5, 8, 9) is unchanged. The docs page is dated 2026-09-21, before the window. Exit 14 (coverage threshold) exists and is not used by the pair.
- A future MTP 3.0.0 is unreleased and removes `--no-progress` and `--no-ansi`. DN-RULE-02 allow-lists `--no-progress`. Watch item, no edit now.
- CodeCoverage 18.12.0 is still the newest (2026-10-06). Unchanged.
- TimeProvider.Testing 10.10.0 is old. Newest 10.x is 10.11.1 (2026-11-20), and 11.0.1 (2026-11-21) is the .NET 11 line. No behaviour change in notes. Pin still valid.
- ReportGenerator 5.5.11 "or later" already covers 5.5.12, 5.6.0, 5.6.1. No breaking change listed.
- FluentAssertions: newest 8.11.0 (2026-09-14, before baseline). Licence text unchanged.
- Moq: newest 4.21.0 (2026-09-24, before baseline). No release in the window. Unchanged.
- Verify: sponsorship model unchanged (SC021 still fails a build with no declaration). 33.7.3 bumps SponsorCheck to 0.28.0 with no description.
- BenchmarkDotNet: 0.15.8 still the newest stable. 0.16.0 has only preview.1 and preview.2 (preview.2 dated 2026-09-23). No GA. Pin stays.
- Stryker.NET (dotnet-stryker) 5.0.0 (2026-09-11) and 5.1.0 (2026-11-10) both ship MTP runner support. The open question can be closed as "MTP support has shipped".

## Findings

### 1. xunit v3: 4.0.2 to 4.0.3

Claim at risk: `testing.md:8` "`xunit.v3.mtp-v2` 4.0.2 (measured 2026-10-11)"; the `Version="4\.0\.2"` grep at `testing.md:56`; `api-design.md:81` "xunit.v3.assert 4.0.2"; DN-RULE-02 "xunit.v3.mtp-v2 4.0.1".

- Newest: 4.0.3. NuGet publish 2026-11-09, release notes dated 2026-11-08, GitHub release 2026-11-11 ([release notes](https://xunit.net/releases/v3/4.0.3), [GitHub](https://github.com/xunit/xunit/releases/tag/v3-4.0.3)).
- Changes in 4.0.3: crash detection no longer reports a premature crash; MTP argument validation now reports all errors before tests run and names the switch and value; MTP cleanup failures are reported per test case; results-file corruption fix; `DateOnly` theory display; MTP v2 packages updated to 2.5.2. No exit-code or runner-option change is stated.
- 4.0.3 `xunit.v3.mtp-v2` depends on `xunit.v3.assert` and `xunit.v3.core.mtp-v2` pinned to exactly `[4.0.3]` ([nuspec](https://api.nuget.org/v3-flatcontainer/xunit.v3.mtp-v2/4.0.3/xunit.v3.mtp-v2.nuspec)). 4.0.2 pins exactly `[4.0.2]`, so the two packages must move together.
- Verdict: **unchanged, newer exists, pin still valid.** The grep at `testing.md:56` keeps passing for a repo on 4.0.2. A consumer of the grep who sees 4.0.3 gets a false "missing" (see candidate 1).
- DN-RULE-02's "4.0.1" is an older baseline observation about `-v:q` exit 0. It stays a historical measurement. Whether `-v:q` still exits 0 on 4.0.3 was not re-measured: **could not determine** (no run possible; the release notes do not mention it).

### 2. Verify and Verify.XunitV3 (coupling to xunit)

Claim at risk: `testing.md:26` "Verify 33 and later fails with SC021 without a declaration"; CS-TEST-23 "33.3.3 with no declaration gave SC021 ... otherwise pin `Verify.XunitV3` to 32.0.0".

- Newest `Verify.XunitV3`: 33.7.3, 2026-11-25 ([NuGet](https://www.nuget.org/packages/Verify.XunitV3)). In-window releases: 33.3.4 (2026-10-15/16), 33.4.0 (11-13), 33.5.0 (11-16), 33.6.0 (11-18), 33.7.0 (11-19), 33.7.1 (11-20), 33.7.2 (11-21), 33.7.3 (11-25) ([Verify releases](https://github.com/VerifyTests/Verify/releases)).
- Changed fact that matters: 33.3.3 and 33.3.4 depend on `xunit.v3.extensibility.core` 4.0.2, while 33.4.0 and every later version depend on 4.0.3 ([33.3.3 nuspec](https://api.nuget.org/v3-flatcontainer/verify.xunitv3/33.3.3/verify.xunitv3.nuspec), [33.4.0 nuspec](https://api.nuget.org/v3-flatcontainer/verify.xunitv3/33.4.0/verify.xunitv3.nuspec)). A repo that pins `xunit.v3.mtp-v2` at 4.0.2 and takes Verify 33.4.0 or later will get a NuGet downgrade error (NU1605 class) unless xunit also moves to 4.0.3.
- Release notes list DiffEngine bumps (20.8.2 to 21.2.0), a SynchronizationContext fix in `ToTask` (33.7.1), no forced `Deterministic=false` in `Verify.props` (33.7.2), and "SponsorCheck 0.28.0" (33.7.3, [PR 2026](https://github.com/VerifyTests/Verify/pull/2026), no description). None mentions SC021, SC049 or exemption changes.
- Sponsorship doc, read 2026-11-27 ([maintenance-fee.md](https://raw.githubusercontent.com/VerifyTests/Verify/main/docs/maintenance-fee.md)): `Verify_SponsorshipExemption` takes `SmallRevenue`, `OpenSource` or `MaintainerConsulting`; `Verify_SponsorshipExemptionUntil` (`yyyy-MM`) is required; SC021 is the failure for no declaration; an expired exemption fails the build "until the claim is renewed"; `Verify_SponsorshipLicenseIgnored` logs SC023 and fails only under `-warnaserror`. The page does not name SC049, so CS-TEST-23's SC049 wording is **could not determine** from this source (it was measured on 2026-10-11 by the original research and is not contradicted).
- Behaviour to recheck: SponsorCheck 0.28.0 is a new tool version with unknown diagnostics changes. It is not a documented behaviour change.
- Verdict: SC021 claim **unchanged**. CS-TEST-23 "33.3.3" is **valid but no longer the newest**; the last version compatible with xunit 4.0.2 is 33.3.4. "Pin to 32.0.0" fallback not re-measured, unchanged.

### 3. Microsoft.Testing.Platform and exit codes

Claim at risk: DN-RULE-07 meanings for 1, 2, 5, 8, 9; the `dotnet test` allow-list in DN-RULE-02.

- MTP releases in window: 2.5.0 (2026-10-06), 2.5.1 (10-07), 2.5.2 (10-27), 2.5.3 (11-11); testfx 4.5.1 to 4.5.3 ([testfx 4.5.3](https://github.com/microsoft/testfx/releases/tag/v4.5.3)). Pin by xunit 4.0.3: MTP 2.5.2.
- Platform changelog ([Changelog-Platform.md](https://raw.githubusercontent.com/microsoft/testfx/main/docs/Changelog-Platform.md)): 2.5.2 fixed terminal verdicts to match framework-session failures; minimum executed-test counts now exclude skipped tests, and explicit zero-test allowances are honoured; startup failure before the `dotnet test` handshake now writes warnings and errors to the console. 2.5.3 separated elapsed from cumulative time in CI summaries and reports runner-policy exits separately. The zero-tests policy (exit 8) and `--minimum-expected-tests` (exit 9) entries are in 2.3.0, before the baseline.
- Exit-code page ([MTP troubleshooting](https://learn.microsoft.com/en-us/dotnet/core/testing/microsoft-testing-platform-troubleshooting), `ms.date` 2026-09-21): 1 unknown, 2 at least one test failure, 5 invalid arguments, 8 no tests discovered or all skipped under strict `--zero-tests-policy`, 9 fewer than `--minimum-expected-tests`. Explicit minimum supersedes zero-tests policy. These match DN-RULE-07. Exit 14 (failed coverage threshold) is listed and is new to the rules' vocabulary but not required. The page is dated before the window, so it is **unchanged** for this delta.
- Nuance for exit 8: the page says a whole-run zero-tests verdict across modules needs the .NET 11 SDK. The pair binds to SDK 10.0.401, where per-module exit 8 behaviour stays as written.
- Unreleased, in the changelog: "3.0.0" removes `--no-ansi` and `--no-progress` (use `--ansi off`, `--progress off`), changes `--show-stdout` and `--show-stderr` defaults to `Failed`, and replaces `%p` with `{pid}` in HangDump file names. Not shipped as of 2026-11-27 (latest is 2.5.3). DN-RULE-02 allow-lists `--no-progress`, so it will break at MTP 3.0.
- Verdict: exit-code meanings **unchanged**; allow-list **unchanged**, flag `--no-progress` as a pending change.

### 4. Coverage and time: CodeCoverage, TimeProvider.Testing, ReportGenerator

- `Microsoft.Testing.Extensions.CodeCoverage`: 18.12.0 (2026-10-06) is still the newest ([NuGet](https://www.nuget.org/packages/Microsoft.Testing.Extensions.CodeCoverage)). **Unchanged.**
- `Microsoft.Extensions.TimeProvider.Testing`: 10.11.0 (2026-10-14), 10.11.1 (2026-11-20), 11.0.0 (2026-11-10), 11.0.1 (2026-11-21) ([NuGet](https://www.nuget.org/packages/Microsoft.Extensions.TimeProvider.Testing/11.0.1)). 11.x adds net11.0 targets. 10.11.1 removes unsupported-TFM warnings. Release notes name no `FakeTimeProvider` change ([dotnet/extensions releases](https://github.com/dotnet/extensions/releases)). The 11.x package still supports net8.0, net9.0, net10.0 and net11.0. Verdict: **newer exists, pin still valid**. Recommend 10.11.1 on a net10 repo; 11.0.1 on .NET 11.
- ReportGenerator: 5.5.12 (2026-10-27, custom source file reader), 5.6.0 (2026-11-10, .NET 11 support, `.netconfig` for all settings, SonarQube paths now mapped or absolute), 5.6.1 (2026-11-20, LCOV parser ignores DA checksum) ([releases](https://github.com/danielpalme/ReportGenerator/releases)). No CLI option or report-type removal. The "5.5.11 or later" floor stays valid. One note: SonarQube output paths changed in 5.6.0.

### 5. CsCheck

- 4.9.1 is no longer the newest. 5.0.0-rc1 (2026-10-11), rc2 (10-14), 5.0.0 (10-24), 5.0.1 (11-03) ([NuGet 5.0.1](https://www.nuget.org/packages/CsCheck/5.0.1)).
- 5.0.1 nuspec has target groups `net10.0` and `net11.0` only; 4.9.1 has `net8.0` ([5.0.1 nuspec](https://api.nuget.org/v3-flatcontainer/cscheck/5.0.1/cscheck.nuspec), [4.9.1 nuspec](https://api.nuget.org/v3-flatcontainer/cscheck/4.9.1/cscheck.nuspec)). A project built as `net8.0;net10.0` cannot take 5.x on the net8.0 leg.
- NuGet page: 5.0.1 notes "Fixed type initializers for WebAssembly" and "Improved Spec.ConformExhaustive now fully parallel". README: "CsCheck 5 is now AOT compatible"; with `Sample` returning a string for classification, `writeLine:` is "now mandatory" (the page does not tie this to 5.0, so treat it as unconfirmed). No 5.0.0 release notes found: GitHub has no releases page entries ([GitHub](https://github.com/AnthonyLloyd/CsCheck/releases)).
- Verdict: **changed.** Old text "CsCheck 4.9.1". New fact: 5.x targets net10.0 and net11.0 only. Pin stays valid and should stay 4.9.1 for any repo that still multi-targets net8.0. Upstream change date 2026-10-24 (5.0.0).

### 6. FluentAssertions and Moq

- FluentAssertions: newest 8.11.0 (2026-09-14) ([NuGet](https://www.nuget.org/packages/FluentAssertions)). Licence text on NuGet: free for open-source and non-commercial use, commercial use needs a paid licence. No release or licence change in the window ([releases](https://github.com/fluentassertions/fluentassertions/releases)). The fluentassertions.com licence page returned 404, so wording "8.0.0 and later is commercial" is confirmed only by the NuGet text. **Unchanged.**
- Moq: newest 4.21.0 (2026-09-24, performance fixes, no SponsorLink mention); 4.20.72 (2026-09-07 per GitHub, 2024-09-07 per NuGet metadata, which is the correct year for a 4.20.x tag). Moq 4.20.0 added SponsorLink (08 Aug), 4.20.2 removed it (09 Aug) ([Moq releases](https://github.com/devlooped/moq/releases)). No release in the window. `testing.md:296` "4.20.2, 4.20.72 and 4.21.0 gave 0" and `observability.md:116` "Moq 4.20.72" are **unchanged**. Caveat: the GitHub page shows 4.20.72 as "07 Sep" and 4.20.70 as "28 Nov"; the years are not shown, so these dates were not used.

### 7. BenchmarkDotNet

- Newest stable 0.15.8 (2025-11-30). 0.16.0-preview.1 (NuGet 2026-06-30; GitHub release 22 Sep) and preview.2 (2026-09-23) are prereleases, no GA, no release in the window ([NuGet](https://www.nuget.org/packages/BenchmarkDotNet/), [releases](https://github.com/dotnet/BenchmarkDotNet/releases)).
- Preview notes: in-process diagnosers, net11, `.slnx`, `--list json`, `--exporters`, OSR off by default, `.NET 12` support, Perfolizer 0.7.5. Nothing about Debug-build refusal or the `--filter` prompt; the console-args doc does not cover either ([console-args.md](https://raw.githubusercontent.com/dotnet/BenchmarkDotNet/master/docs/articles/guides/console-args.md)).
- Verdict: **unchanged.** "0.15.8" and "Stay on 0.15.x until 0.16 is GA" stay. The open question stays open; the exit-code and prompt re-verification cannot be done until a GA exists.

### 8. Stryker.NET on MTP

- dotnet-stryker 5.0.0 (2026-09-11, before baseline) fixed flaky MTP coverage, calculates MTP coverage per mutated assembly, added `perTest` and `perTestInIsolation` for MTP and MTP test info in reports. Breaking: targets .NET 10 runtime ([5.0.0 notes](https://github.com/stryker-mutator/stryker-net/releases/tag/dotnet-stryker%405.0.0)).
- 5.1.0 (2026-11-10, in window): MTP concurrency fix on the mutant-control file, test-case filter now applies with the MTP runner even when the test app has no `--filter`, new CLI option for test-case filters ([releases](https://github.com/stryker-mutator/stryker-net/releases)).
- Neither page names xunit v3. So: MTP support has shipped; whether it works with an xunit.v3.mtp-v2 test app is **could not determine**.

## Per-claim decision table

| Claim | Newest (2026-11-27) | Behaviour change | Decision |
|---|---|---|---|
| xunit.v3.mtp-v2 / assert 4.0.2 | 4.0.3 (2026-11-09) | none for exit codes or options | newer exists, pin still valid |
| CodeCoverage 18.12.0 | 18.12.0 | none | unchanged |
| TimeProvider.Testing 10.10.0 | 10.11.1 / 11.0.1 | none stated | newer exists, pin still valid |
| CsCheck 4.9.1 | 5.0.1 | drops net8.0 | changed; keep 4.9.1 on net8.0 repos |
| ReportGenerator 5.5.11 or later | 5.6.1 | none breaking | unchanged |
| FluentAssertions 8.0.0+ commercial | 8.11.0 | none | unchanged |
| Moq 4.20.x SponsorLink; 4.20.72 | 4.21.0 | none in window | unchanged |
| Verify 33+ SC021 | 33.7.3 | needs xunit >= 4.0.3 from 33.4.0 | SC021 unchanged; CS-TEST-23 version note changed |
| MTP exits 1,2,5,8,9 and allow-list | MTP 2.5.3 | none; 3.0 unreleased | unchanged |
| BenchmarkDotNet 0.15.8 | 0.15.8 (0.16 preview.2) | none | unchanged |
| Stryker on MTP | 5.1.0 | MTP runner shipped | closed as "shipped" |

## Normative guidance candidates

1. Rule: the grep for the xunit pin accepts the newest 4.0.x patch and requires `xunit.v3.mtp-v2` and `xunit.v3.assert` on the same version. Rationale: 4.0.3 pins both inner packages exactly. Verify: `rg -o 'Include="xunit\.v3\.(mtp-v2|assert)" Version="[^"]+"' Directory.Packages.props | sort -u` shows one version.
2. Rule: when `Verify.XunitV3` is 33.4.0 or later, `xunit.v3.mtp-v2` is 4.0.3 or later; when xunit stays at 4.0.2, Verify stays at 33.3.4 or earlier. Rationale: 33.4.0+ requires `xunit.v3.extensibility.core` 4.0.3. Verify: `dotnet restore` exits 0 with no NU1605, and the `rg` above shows the paired versions.
3. Rule: do not move CsCheck to 5.x on any project whose TFM list contains `net8.0`. Rationale: 5.0.x ships only net10.0 and net11.0 assets. Verify: `rg 'CsCheck' Directory.Packages.props` and `rg -l '<TargetFrameworks?>[^<]*net8\.0' --glob '*.csproj' .` must not both match a CsCheck 5 reference.
4. Rule: pass `--progress off` instead of `--no-progress` once MTP 3.0 is the resolved platform version. Rationale: the unreleased 3.0.0 changelog removes the old flag. Verify: `rg -- '--no-progress' .github taskfile.yml` is empty after the MTP major bump.
5. Rule: treat a SponsorCheck upgrade (Verify 33.7.3 and later) as a fresh SC021/SC049 measurement. Rationale: the 0.28.0 bump has no description. Verify: a no-declaration build on the new version still prints SC021 and exits nonzero.

## AI-agent angle

- An agent seeing 4.0.3 on NuGet rewrites only the `mtp-v2` line and leaves `xunit.v3.assert` at 4.0.2, producing a NU1605 or exact-version conflict. Catch with candidate 1.
- An agent updating "to latest" moves CsCheck to 5.0.1 and breaks the net8.0 leg with a restore error NU1202. Catch with candidate 3.
- An agent bumps Verify to 33.7.3 while xunit stays 4.0.2. Catch with candidate 2.

## Contested / evolving

- MTP 3.0.0 (unreleased as of 2026-11-27): flag removals and a default-output change; trending toward stricter, explicit CLI. See finding 3.
- BenchmarkDotNet 0.16 GA: not yet; previews dated 2026-09. Re-check at the next refresh.
- CsCheck 5: AOT and net10-only direction; the net8.0 drop follows .NET 8 end of support on 2026-11-10.

## Sources

| URL | What it is | Date/era | Why |
|---|---|---|---|
| https://xunit.net/releases/v3/4.0.3 | xunit v3 4.0.3 notes (primary) | 2026-11-08 | MTP/cleanup/arg validation changes |
| https://github.com/xunit/xunit/releases/tag/v3-4.0.3 | GitHub release | 2026-11-11 | release date |
| https://api.nuget.org/v3-flatcontainer/xunit.v3.mtp-v2/4.0.3/xunit.v3.mtp-v2.nuspec | nuspec (primary) | 2026-11 | exact-version coupling |
| https://api.nuget.org/v3/registration5-semver1/ (all packages) | NuGet publish dates (primary) | 2026-11-27 | dates for every pin |
| https://github.com/microsoft/testfx/releases/tag/v4.5.3 | testfx and MTP 2.5.3 release | 2026-11-11 | MTP versions |
| https://raw.githubusercontent.com/microsoft/testfx/main/docs/Changelog-Platform.md | MTP changelog (primary) | 2026-11 | 2.5.x and unreleased 3.0.0 |
| https://learn.microsoft.com/en-us/dotnet/core/testing/microsoft-testing-platform-troubleshooting | MTP exit codes (primary) | ms.date 2026-09-21 | exit meanings |
| https://www.nuget.org/packages/Microsoft.Testing.Extensions.CodeCoverage | package page | 2026-10-06 | newest 18.12.0 |
| https://www.nuget.org/packages/Microsoft.Extensions.TimeProvider.Testing/11.0.1 | package page | 2026-11-21 | version table, TFMs |
| https://github.com/dotnet/extensions/releases | dotnet/extensions releases (primary) | 2026-11 | 10.11.x, 11.0.x notes |
| https://github.com/danielpalme/ReportGenerator/releases | ReportGenerator releases (primary) | 2026-11 | 5.5.12 to 5.6.1 |
| https://www.nuget.org/packages/CsCheck/5.0.1 | package page | 2026-11-03 | TFMs and notes |
| https://api.nuget.org/v3-flatcontainer/cscheck/5.0.1/cscheck.nuspec | nuspec (primary) | 2026-11-03 | net10/net11 only |
| https://github.com/AnthonyLloyd/CsCheck | repo readme | 2026-11 | AOT note |
| https://www.nuget.org/packages/FluentAssertions | package page | 2026-09-14 | 8.11.0 and licence text |
| https://github.com/fluentassertions/fluentassertions/releases | releases (primary) | 2026-09 | no change in window |
| https://github.com/devlooped/moq/releases | Moq releases (primary) | 2026-09-24 | SponsorLink history, 4.21.0 |
| https://github.com/VerifyTests/Verify/releases | Verify releases (primary) | 2026-11-25 | 33.3.4 to 33.7.3 |
| https://github.com/VerifyTests/Verify/pull/2026 | SponsorCheck 0.28.0 PR | 2026-11-25 | no description |
| https://raw.githubusercontent.com/VerifyTests/Verify/main/docs/maintenance-fee.md | sponsorship doc (primary) | 2026-11 | SC021, exemption properties |
| https://api.nuget.org/v3-flatcontainer/verify.xunitv3/33.4.0/verify.xunitv3.nuspec | nuspec (primary) | 2026-11-13 | xunit >= 4.0.3 |
| https://www.nuget.org/packages/Verify.XunitV3 | package page | 2026-11-25 | version dates |
| https://github.com/dotnet/BenchmarkDotNet/releases | BDN releases (primary) | 2026-09 | 0.16 previews only |
| https://www.nuget.org/packages/BenchmarkDotNet/ | package page | 2026-09-23 | no stable after 0.15.8 |
| https://raw.githubusercontent.com/dotnet/BenchmarkDotNet/master/docs/articles/guides/console-args.md | BDN docs | 2026 | no Debug/--filter text |
| https://github.com/stryker-mutator/stryker-net/releases | Stryker releases (primary) | 2026-11-10 | 5.1.0 MTP notes |
| https://github.com/stryker-mutator/stryker-net/releases/tag/dotnet-stryker%405.0.0 | 5.0.0 notes | 2026-09-11 | MTP runner |

Not fetched or failed: fluentassertions.com licence page (404), microsoft/codecoverage CHANGELOG (404), Verify sponsorship.md (404), devlooped/moq per-release year (not shown). The GitHub API was rate limited, so release pages were read as HTML instead.
