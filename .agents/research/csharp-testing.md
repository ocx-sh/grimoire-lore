---
title: "Testing beyond the harness: framework, analyzers, assertions, coverage, snapshots and properties"
topic: csharp-testing
model: claude-opus-5-5 (consolidation); sub-artifacts by sonnet
consolidates:
  - csharp-testing/csharp-testing-framework-and-coverage.md
  - csharp-testing/csharp-testing-snapshots-and-property.md
  - csharp-audit/python-sdk-digest.md (grounding: test tiers :176-189, coverage gate :185, S11, S12 :313-314, rows 40-41 :365-366, quality-tests rule :291)
  - csharp-audit/ocx-cli-contract.md (grounding: goldens :70, argv rules :125, open enums :132)
  - csharp-audit/exemplar-build-and-gates.md (grounding: runner and coverage census :39, :49, :216-256)
  - cross-checked against csharp-crossplatform.md (CS-TEST-01..08, CS-CI-01..07), csharp-async.md (CS-ASYNC-06), csharp-build.md (CS-BUILD posture), csharp-api.md + csharp-api/csharp-api-evolution-gates.md, csharp-json.md (CS-JSON-11, class B), and the csharp-api-behavioral-compat fixture (its sub-artifact was not yet written; its evidence.txt was read)
date: 2026-10-11
target: "csharp-quality/testing.md, CS-TEST-09..31 (continues CS-TEST-01..08 and CS-CI-01..07)"
fixtures: /home/mherwig/.cache/research-lang/dotnet-tools/fixtures/consolidate-csharp-testing/ (run-all.sh -> posture-tests/evidence.txt)
---

# Testing beyond the harness

Citation keys: **[FC]** = [framework-and-coverage](csharp-testing/csharp-testing-framework-and-coverage.md) (section `§n`, check `Vn`, candidate `T-n`). **[SP]** = [snapshots-and-property](csharp-testing/csharp-testing-snapshots-and-property.md) (section `§n`, experiment `En`, candidate `SNAP-n`/`PROP-n`). **[CN]** = a check this consolidation ran (fixture root above, rows C1-C5). **[BC]** = `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-api-behavioral-compat/evidence.txt` (sections §1-§4). **[py]** = `csharp-audit/python-sdk-digest.md`, **[ocx]** = `csharp-audit/ocx-cli-contract.md`, **[gates]** = `csharp-audit/exemplar-build-and-gates.md`.

## Verdict

1. **CS-TEST-05 stands; it is confirmed, not overturned.** All four MTP frameworks exit 0/2/8/5 identically, and run times are within 0.3 s of each other (1.09-1.37 s) [FC §2, §3]. xUnit v3 stays because it is the only framework whose token analyzer is on by default (xUnit1051 Warning; MSTEST0049 is Info; NUnit has no such rule) [FC §4]. For libraries other than the SDK the rule generalises: MTP always, xUnit v3 for new repos, keep the incumbent framework, one framework per solution (CS-TEST-09).
2. **The test-project analyzer carve-out is exactly four IDs in one `.editorconfig` section:** CA2007, VSTHRD200, CA1707 and CS1591. Under the CS-BUILD posture, the CS-TEST-04 names (`E1_...`) failed the build with CA1707, and public test classes failed with CS1591 [CN C1]. csharp-build's advice "test projects set `GenerateDocumentationFile=false`" is **overturned**: it fails the build with `EnableGenerateDocumentationFile` (IDE0005 needs the doc file) [CN C4]. vs-threading carries exactly this pair (`microsoft__vs-threading@f6d817997090:test/.editorconfig:33-37`).
3. **Coverage is a report, not a gate.** Use one MTP-native tool: `Microsoft.Testing.Extensions.CodeCoverage`, always with an absolute settings file that excludes generated code (an STJ context turned 6/7 into 110/141 [FC V14]). Never use `coverlet.collector` or `coverlet.msbuild`: under MTP both exit 0 and write no report [FC V10, V11]. No threshold gates merge.
4. **For the SDK, coverage comes from two legs merged in `ci-ok`.** `ubuntu-24.04` and `windows-2025` collect coverage; ReportGenerator merges the reports inside the `ci-ok` job, after its result check. This overrides [FC]'s "one Linux leg". A Linux-only report marks every Windows branch uncovered. That is how the Python SDK came to put `pragma: no cover` on its Windows kill path [py S12, :314]. Linux and Windows reports merged cleanly (6/7 + 6/7 gave 6/7) [FC §12]. The arm64 and macOS legs collect nothing, because the tool documents no Linux or macOS arm64 instrumentation [FC §10].
5. **The SDK uses no snapshot library.** Each candidate subject is owned by a stronger gate: the API listing by PublicApiAnalyzers and package validation, decoded JSON by CS-JSON-11 and non-default assertions, exceptions by the exit table. The data:
   - A snapshot of a mis-bound DTO stayed green with the bug [SP E9].
   - An exception-shape snapshot failed a compatible change (2/2 red) and passed a breaking one (exit 0), while the explicit behaviour table caught all five planted breaks [BC §1, §3].
   - **This matches csharp-api-behavioral-compat:** that suite pins behaviour as explicit table rows, never as snapshots (CS-TEST-21, CS-TEST-28).
6. **Accepting a snapshot is a human act wherever snapshots exist.** `AutoVerify` passed a planted regression and rewrote the verified file [SP E2]. No exemplar fails CI on a changed verified file [SP §13]. Verify 33 and later fails the build with SC021 until the owner declares sponsorship status [SP E7].
7. **Property tests are a new SDK commitment.** Four example tests stayed green under three planted bugs (argv as one string, a lower-casing open-enum reader, `Path.Combine` containment); the properties went red [SP E5]. CsCheck is the library. `Ocx.Fake` gains a tenth verb, `echo-argv`, so the argv property runs through the production engine (CS-TEST-29).
8. **The SDK test-dependency set is closed:** `xunit.v3.mtp-v2`, the coverage extension, `Microsoft.Extensions.TimeProvider.Testing` and CsCheck. No assertion, mocking or snapshot libraries. FluentAssertions 8 prints a commercial-licence notice into test output, which an agent never sees [FC §8]. Moq 4.20.0 and 4.20.1 pull SponsorLink into the dependency closure [FC V18].

## The ruleset

Each rule has a stable ID. **General** rules apply to any .NET library; **[ocx]** rules are design commitments for the ocx C# SDK. "Watched" means the check went red on a planted defect and green on its fixed twin.

### General-library rules

**CS-TEST-09 (MUST, general) MTP always; one test framework per solution.** New test projects use xUnit v3 (`xunit.v3.mtp-v2`). An existing repo keeps its incumbent framework (MSTest 4, NUnit 5 or TUnit). MTP is wired in three places:
- `global.json` has `"test": {"runner": "Microsoft.Testing.Platform"}`;
- every test project has `OutputType` set to `Exe`;
- every test project has the framework switch: `UseMicrosoftTestingPlatformRunner` (xUnit), `EnableMSTestRunner` (MSTest) or `EnableNUnitRunner` (NUnit).
- *Rationale:* extension flags are per-framework, so a second framework needs per-project argument routing. Without the `global.json` section, SDK 10 fails the build. CS-TEST-05 remains the ocx form of this rule.
- *Verify:*
  - `jq -e '.test.runner == "Microsoft.Testing.Platform"' global.json`
  - `rg -o -N --no-filename -g '*.csproj' -g '*.props' -e 'Include="(xunit\.v3|MSTest|NUnit|TUnit)' . | sort -u | wc -l` prints `1`.
  - `rg --files-without-match -g '*Tests.csproj' -e 'UseMicrosoftTestingPlatformRunner' -e 'EnableMSTestRunner' -e 'EnableNUnitRunner' tests` prints nothing, unless `tests/Directory.Build.props` sets the switch.
- *Watched:* the exit contract was watched for all four frameworks: pass 0, failing test 2, zero tests 8, unknown option 5 [FC V1-V4]. The count grep was not watched.

**CS-TEST-10 (MUST, general) No VSTest leftovers.** An MTP repo references none of these: `Microsoft.NET.Test.Sdk` (MSTest's metapackage brings its own copy; do not add another), `xunit.runner.visualstudio`, xUnit v2 `xunit`, `coverlet.collector`, `coverlet.msbuild`. Commands and docs never pass `--logger`, `--collect`, `--settings` or `--blame*`. Use each framework's own filter syntax: MSTest and NUnit take `--filter` only, and TUnit takes `--treenode-filter`.
- *Rationale:* both coverlet VSTest packages exit **0 with no coverage file**: the pipeline is green and the report is simply missing. The VSTest flags exit 5.
- *Verify:*
  - `rg -n -g '*.csproj' -g '*.props' -e 'Include="(Microsoft\.NET\.Test\.Sdk|xunit\.runner\.visualstudio|xunit|coverlet\.collector|coverlet\.msbuild)"' .` prints nothing.
  - `rg -n -g '*.yml' -g '*.yaml' -g '*.sh' -g '*.ps1' -g '*.md' -e '--(logger|collect|settings|blame)\b' .` prints nothing.
- *Watched:* yes. `coverlet.collector` gave `exit=0 coverage-files=0`; `coverlet.msbuild` with `-p:CollectCoverage=true` gave `exit=0 coverage-files=0`; `--collect` exited 5 [FC V10, V11]. `--filter-class` on MSTest or NUnit exited 5 [FC V2, V3].

**CS-TEST-11 (MUST, general) Never mask the runner's exit code.** Never use `--ignore-exit-code`, `TESTINGPLATFORM_EXITCODE_IGNORE`, or `continue-on-error` on a test or coverage step. A gate treats any non-zero exit as failure and never matches a specific code.
- *Rationale:* exit 8 (no tests ran) and exit 9 (fewer than the minimum) are the gates of CS-TEST-06. `dotnet test` on Windows SDK 10.0.102 reported a module's exit 5 as 1.
- *Verify:* `rg -n -g '*.yml' -g '*.yaml' -g '*.sh' -g '*.ps1' -g '*.props' -g '*.targets' -e '--ignore-exit-code' -e 'TESTINGPLATFORM_EXITCODE_IGNORE' -e 'continue-on-error' .` prints nothing. This extends `check-ci-matrix.sh` R9, which does not catch `continue-on-error`.
- *Watched:* the 5-to-1 mapping was watched on the Windows host [FC V25]. The grep was not watched.

**CS-TEST-12 (MUST, general) Test-project analyzer carve-out: four IDs, one `.editorconfig` section.**
- Exactly this section, and nothing else, relaxes analyzers for tests:
  ```ini
  [{test,tests,samples}/**.cs]
  dotnet_diagnostic.CA2007.severity = none     # CS-ASYNC-06; xUnit1030 forbids ConfigureAwait in tests
  dotnet_diagnostic.VSTHRD200.severity = none  # CS-ASYNC-06
  dotnet_diagnostic.CA1707.severity = none     # test names carry underscores (CS-TEST-04's E1_...)
  dotnet_diagnostic.CS1591.severity = none     # public test classes carry no XML docs
  ```
- Test projects inherit `GenerateDocumentationFile=true`. Never use `<NoWarn>` in test projects.
- Never silence a test-framework analyzer (`xUnit*`, `NUnit*`, `MSTEST*`, `TUnit*`). These are the rules that make an unawaited async assertion a compile error: NUnit2059, TUnitAssertions0002, xUnit2021.
- *Rationale:*
  - Under the CS-BUILD posture (`AnalysisLevel 10.0-all`, TreatWarningsAsErrors), the CS-TEST-04 test names do not build.
  - The two obvious agent fixes are wrong: `NoWarn` hides it from review, and `GenerateDocumentationFile=false` fails the build.
  - Silencing NUnit2059 made an unawaited `ThrowsAsync` pass [FC V19].
  - `VSTHRD111` (in [FC]'s T-07 set) is dropped, because CS-ASYNC does not enable it.
- *Verify:*
  - `fixtures/consolidate-csharp-testing/greps/greps.sh .` exits 0. It checks `<NoWarn>` and `GenerateDocumentationFile>false` under `tests`, and any test-framework severity of `none`, `silent` or `suggestion`.
  - `rg -c -e 'CA1707' -e 'CS1591' .editorconfig` prints `2`.
- *Watched:* yes, all on SDK 10.0.401 [CN]:

  | Row | Variant | Result |
  |---|---|---|
  | C1 | posture without the carve-out | `build-exit=1 [8 error CA1707; 12 error CS1591]` |
  | C2 | with the carve-out | `build-exit=0`, `test-exit=0 total: 6 succeeded: 6` |
  | C3 | `ConfigureAwait(false)` in a test | `4 error xUnit1030` |
  | C4 | `GenerateDocumentationFile=false` | `4 error EnableGenerateDocumentationFile` |
  | C5 | `greps.sh` | red tree exit 1 (3 FAIL lines), green tree exit 0 |

**CS-TEST-13 (MUST, general) The test's token flows to every call; tests are async without blocking.**
- Pass the framework's test token to every call that accepts a `CancellationToken`:
  - xUnit: `TestContext.Current.CancellationToken`, with xUnit1051 set to `error`.
  - MSTest: `TestContext.CancellationToken`, with `<MSTestAnalysisMode>Recommended</MSTestAnalysisMode>`.
  - NUnit: `TestContext.CurrentContext.CancellationToken`. No analyzer checks this, so the grep below is the only check.
  - TUnit: the injected `CancellationToken`.
- Test methods are `async Task` or `async ValueTask`: no `async void`, no `.Result`, `.Wait()` or `.GetAwaiter().GetResult()`, and no `ConfigureAwait`.
- *Rationale:* a hung test is cancelled on timeout or run abort only if the token flows. MSTEST0049 is Info at the default analysis mode.
- *Verify:*
  - `rg -n 'dotnet_diagnostic\.xUnit1051\.severity\s*=\s*error' .editorconfig`
  - `rg -n -g '*.cs' -e 'CancellationToken\.None' -e 'default\(CancellationToken\)' -e '\.ConfigureAwait\(' -e '\.GetAwaiter\(\)\.GetResult\(\)' -e 'async void' tests` prints nothing.
- *Watched:* yes:
  - xUnit1051 fired at `Tests.cs(16,62)` [FC V5].
  - `MSTEST0049` appeared only under Recommended [FC V6].
  - xUnit1049, xUnit1031 and xUnit1030 [FC V21].
  - xUnit1030 under the posture [CN C3].

**CS-TEST-14 (MUST, general) Tests that mutate process-global state run in one non-parallel group.** Process-global state means environment variables, `CultureInfo.DefaultThreadCurrent*Culture` and static singletons. The group is:
- xUnit: `[Collection("process-global")]` plus `[CollectionDefinition("process-global", DisableParallelization = true)]`;
- MSTest: `[DoNotParallelize]`;
- NUnit: `[NonParallelizable]`.
- *Rationale:* xUnit v3 runs test classes in parallel by default. MSTest and NUnit do too once a repo opts in.
- *Verify:* `rg -l -g '*.cs' -e 'SetEnvironmentVariable' -e 'DefaultThreadCurrent(UI)?Culture\s*=' tests | xargs -r rg -L -e 'Collection\(' -e 'DoNotParallelize' -e 'NonParallelizable'` prints nothing.
- *Watched:* the defaults were measured: xUnit took 1366 ms by default and 3752 ms with `Mode=None`; MSTest took 3567 ms by default and 832 ms opted in [FC V7-V9]. The grep was not watched.

**CS-TEST-15 (MUST, general) An unmet precondition skips with a reason through the framework API, never with an early `return`.**
- xUnit: `Assert.SkipUnless`, `Assert.SkipWhen`, or `Skip=` with `SkipUnless=`.
- MSTest: `Assert.Inconclusive`, `[OSCondition]`, or `[Ignore("reason")]`. MSTest has **no `Assert.Skip`**.
- NUnit: `Assert.Ignore`.
- *Rationale:* an early return reports a pass. `Assert.Skip` on MSTest resolves to LINQ and fails with CS0411. CS-TEST-04 is the narrower ocx form of this rule.
- *Verify:* `rg -U -n -g '*.cs' '\[(Fact|Theory|Test|TestMethod)[^\]]*\]\s*public (async )?(void|Task|ValueTask) \w+\([^)]*\)\s*\{\s*if \([^)]*\)\s*return;' tests` prints nothing.
- *Watched:* CS0411 was watched [FC V22]. The silent-return pass was watched in the harness (CS-TEST-04).

**CS-TEST-16 (MUST, general) Use the framework's built-in asserts.** If a fluent library is wanted, use AwesomeAssertions (Apache-2.0) or Shouldly (BSD-3). FluentAssertions at 8.0.0 or later is forbidden, directly or transitively; pins at 7.x or lower are licence-clean.
- *Rationale:* 8.x ships under the Xceed Community Licence, and commercial use is paid. It prints a licence warning into captured test output. That output is hidden in the default summary, and MTP hides stderr by default when it detects an AI agent.
- *Verify:*
  - `rg -n -g '*.csproj' -g '*.props' -e 'Include="FluentAssertions"\s+Version="([89]|[1-9][0-9])\.' .` prints nothing.
  - `dotnet list package --include-transitive | rg -e 'FluentAssertions\s+([89]|[1-9][0-9])\.'` prints nothing.
- *Watched:* yes. `fa8: licence-notice-lines=4`; FluentAssertions 7, AwesomeAssertions and Shouldly all printed `0` [FC V17].

**CS-TEST-17 (SHOULD, general) Use no mocking library by default; write fakes you own and use the real process.**
- If isolating an interface is unavoidable, use NSubstitute together with `NSubstitute.Analyzers.CSharp`.
- Use Moq only if the repo already uses it, and never at 4.20.0 or 4.20.1.
- `Devlooped.SponsorLink` never appears in the dependency closure.
- *Rationale:* SponsorLink is an analyzer that reads the developer's git e-mail. NS1000 turns "a non-virtual member is silently not mocked" into a build error.
- *Verify:*
  - `dotnet list package --include-transitive | rg -i SponsorLink` prints nothing.
  - `rg -n -g '*.csproj' -g '*.props' -e 'Include="Moq"\s+Version="4\.20\.[01]"' .` prints nothing.
- *Watched:* yes. Moq 4.20.0 and 4.20.1 gave `SponsorLink-in-closure=16`; 4.20.2, 4.20.72 and 4.21.0 gave `0` [FC V18]. `NS1000` [FC V23].

**CS-TEST-18 (MUST, general) Exactly one MTP-native coverage tool, configured so that it cannot miscount.**
- The default is `Microsoft.Testing.Extensions.CodeCoverage` 18.12.0. Run it with `--coverage --coverage-output-format cobertura --coverage-settings <absolute path>`. The settings file excludes `GeneratedCodeAttribute`, `CompilerGeneratedAttribute` and `ExcludeFromCodeCoverageAttribute`.
- `coverlet.MTP` is the alternative. If it has a `testconfig.json`, that file lists `"excludeByAttribute": "GeneratedCode,CompilerGenerated,ExcludeFromCodeCoverage"`.
- A multi-TFM run never uses a fixed `--coverage-output` name.
- The coverage step asserts at least one cobertura file per TFM and zero `.g.cs` entries.
- *Rationale:*
  - Generated code is counted by default: an STJ context turned 6/7 into 110/141.
  - A `testconfig.json` that sets only `format` drops coverlet's default exclusions.
  - A fixed output name meant two TFMs wrote one file.
  - A relative settings path crashed `dotnet test` on Windows SDK 10.0.102.
- *Verify:*
  - `rg -o -N --no-filename -g '*.csproj' -g '*.props' -e 'Include="(Microsoft\.Testing\.Extensions\.CodeCoverage|coverlet\.MTP)"' . | sort -u | wc -l` prints `1`.
  - `rg -n -e '--coverage-settings' .github | rg -v -e 'github\.workspace' -e 'GITHUB_WORKSPACE'` prints nothing.
  - After the run: `test "$(find artifacts/coverage -name '*.xml' | wc -l)" -ge 2 && ! rg -l 'filename="[^"]*\.g\.cs"' artifacts/coverage`
- *Watched:* yes:
  - generated-code exclusion: 110/141 red, 6/7 green [FC V14];
  - coverlet `testconfig.json`: 110/141 red, 8/9 green [FC V15];
  - output clobber [FC V12];
  - the Windows relative-path crash and the absolute-path green run [FC V25].

**CS-TEST-19 (MUST, general) Collect coverage in Release on x64 legs; merge with ReportGenerator in the aggregator job.**
- Collect coverage in Release on the Linux x64 leg. Add the Windows x64 leg when `src` has `OperatingSystem.Is*` branches.
- Merge every per-TFM and per-leg cobertura file with ReportGenerator 5.5.11 or later, pinned in `.config/dotnet-tools.json`: `dotnet reportgenerator -reports:"artifacts/coverage/**/*.xml" -targetdir:artifacts/coverage-report -reporttypes:"Cobertura;MarkdownSummaryGithub" -sourcedirs:"$GITHUB_WORKSPACE"`.
- Never run `dotnet-coverage merge` on cobertura input.
- *Rationale:*
  - The denominator differs between Debug and Release (9/10 vs 8/9).
  - `dotnet-coverage merge` halved branch counts (4/8 became 2/4).
  - The first report's absolute path wins a merge, so `-sourcedirs` is needed.
  - arm64 instrumentation is undocumented and unverified.
- *Verify:*
  - `rg -n -A2 'dotnet-reportgenerator-globaltool' .config/dotnet-tools.json` shows a version.
  - `rg -n 'reportgenerator' .github/workflows | rg -v sourcedirs` prints nothing.
  - `rg -n 'dotnet-coverage merge' .github/workflows` prints nothing.
- *Watched:* yes:
  - TFM merge: `dotnet-coverage` gave branches 2/4, ReportGenerator 6/7 lines and 4/8 branches [FC V13];
  - Linux plus Windows merge: 6/7 [FC §12];
  - `/_/` paths: 0 source hits, then 4 with `-sourcedirs` [FC V16].

**CS-TEST-20 (MUST, general) Coverage is a report; no threshold gates merge by default.**
- Publish the merged summary to the job summary on every PR.
- Never use `--coverlet-threshold`, a per-module threshold or a branch threshold.
- If the owner sets a floor, it applies to the merged **line** rate, is evaluated once in the aggregator job, starts at the current value rounded down minus 1 point, and is only ever raised.
- `[ExcludeFromCodeCoverage]` is allowed only with a `Justification`, only on hand-written code that cannot be tested, and never on a platform branch.
- *Rationale:*
  - A per-module threshold sees one TFM and exits 14 without printing a summary.
  - The same tests produce denominators of 8/9, 9/10, 6/7 and 110/141 depending on tool, configuration and build.
  - A percentage target invites assertion-free tests and exclusion attributes.
  - The Python SDK's 100% gate was held by 10 `pragma: no cover` lines on platform branches [py :185, S12].
- *Verify:*
  - `rg -n -g '*.yml' -g '*.props' -g '*.json' -e 'coverlet-threshold' -e '"threshold"' .` prints nothing.
  - `rg -n -g '*.cs' 'ExcludeFromCodeCoverage' src | rg -v Justification` prints nothing.
- *Watched:* yes. `--coverlet-threshold 95` exited 14 per module; at 70 it exited 0. `gate-line-rate.sh` with floor 85 against 80.0% exited 1; floor 75 exited 0 [FC V24].

**CS-TEST-21 (MUST, general) Snapshot only large rendered text that no other gate owns.**
- Snapshot (Verify or a golden file) only generated or rendered multi-line text of about 20 lines or more: help text, generated source, SQL, Markdown.
- Never snapshot:
  - (a) a public API listing in a library that has PublicApiAnalyzers;
  - (b) a decoded JSON model;
  - (c) an exception;
  - (d) a behaviour or failure-mode table.
- Vendored upstream goldens (ocx `reports.json` for CS-JSON-11) are test **inputs**. They are refreshed by a vendoring commit, never "accepted".
- *Rationale:*
  - Verify omits null members, so a mis-bound DTO's snapshot recorded the bug.
  - PublicApiAnalyzers plus package validation own every listing mutation except an intentional `[Obsolete]`.
  - Exception snapshots fail on wording and miss type changes.
  - This agrees with csharp-api-evolution-gates #27 (a snapshot is optional, and additive at most).
- *Verify:*
  - `if ls src/*/PublicAPI.Shipped.txt >/dev/null 2>&1; then ! rg -l -g '*.cs' GeneratePublicApi tests; fi`
  - `! rg -n -g '*.cs' -e 'Verify\(.*(Deserialize|Decode)' tests`
- *Watched:* yes:
  - the listing against the analyzer [SP E4];
  - a baked bug: the snapshot was green on run 2 and the assertion twin red [SP E9];
  - a stack-trace line [SP E10];
  - an exception snapshot over behaviour versions: `v2-green-add` gave exit 2 (2/2 failed), `v2-red-type` gave exit 0 [BC §3].

**CS-TEST-22 (MUST, general) Accepting a snapshot is a human act.**
- No `AutoVerify` in any form.
- An agent never moves, copies, renames or edits a `*.verified.*` or `*.golden.*` file. It reports the diff and stops.
- CI runs this guard immediately after the test step, on every leg:
  ```bash
  git diff --exit-code -- '*.verified.*' '*.golden.*' || exit 1
  [ -z "$(git ls-files --others --exclude-standard -- '*.verified.*' '*.golden.*')" ] || exit 1
  [ -z "$(find . -name '*.received.*' -not -path '*/bin/*' -not -path '*/obj/*')" ] || exit 1
  ```
- `.gitignore` has `*.received.*`, and `.github/CODEOWNERS` has `*.verified.* @<owner>`.
- *Rationale:*
  - `AutoVerify()` passed a planted regression on CI and rewrote the file.
  - `includeBuildServer: false` failed open on `CI=true` and on `GITHUB_ACTIONS`, because DiffEngine reads `GITHUB_ACTION`.
  - The guard protects only the CI run. CODEOWNERS covers a pull request that edits both the code and the snapshot.
- *Verify:*
  - `! rg -n -g '*.cs' '\bAutoVerify\b' tests`
  - `grep -qxF '*.received.*' .gitignore`
  - `rg -n '^\*\.verified\.\*\s+@' .github/CODEOWNERS`
  - the guard text appears in the workflow.
- *Watched:* yes. In the AutoVerify matrix, the guard gave `FAIL` on every rewrite and `ok` on the clean run [SP E2]. The nine reviewer greps flagged 9/9 on the bad tree and passed 9/9 on the good tree [SP E6].

**CS-TEST-23 (MUST, general) Verify 33 or later needs exactly one owner-chosen declaration; otherwise pin 32.0.0.**
- Declare exactly one of these in `Directory.Build.props`: `Verify_SponsorshipExemption` with `Verify_SponsorshipExemptionUntil`, a sponsor account, or a licence.
- Otherwise pin `Verify.XunitV3` to 32.0.0.
- Never set `Verify_SponsorshipLicenseIgnored`.
- *Rationale:*
  - Without a declaration the build fails with SC021.
  - An expired exemption fails CI with SC049 on the first day of its month.
  - `LicenseIgnored` survives TreatWarningsAsErrors, and CS-BUILD forbids the `-warnaserror` switch that would catch it.
- *Verify:*
  - `dotnet build` exits 0.
  - `! rg -n -g '*.props' -g '*.csproj' 'Verify_SponsorshipLicenseIgnored' .`
- *Watched:* yes. 33.3.3 with no declaration gave `exit=1 SC021`; an expired exemption gave `exit=1 SC049`; 32.0.0 and a valid exemption gave `exit=0` [SP E7].

**CS-TEST-24 (SHOULD, general) Snapshot hygiene, wherever snapshots exist.**
- `.gitattributes` has `*.verified.* text eol=lf`.
- No `FixNewlinesOnRead()` or `IgnoreTrailingNewline()`.
- Multi-TFM snapshots call `.UniqueForTargetFrameworkAndVersion()`.
- The snapshotted object holds no absolute paths, user or host names, or clock values. Project to a DTO first.
- Exception snapshots, if a project insists on them, call `.IgnoreStackTrace()`.
- The workflow `env:` sets `DiffEngine_Disabled: true` and `Verify_DisableClipboard: true`.
- A hand-rolled golden helper takes its directory from `AssemblyMetadata`, never from `[CallerFilePath]`, and refuses update mode when `CI` is set.
- *Rationale:*
  - A CRLF checkout threw `VerifiedLineEndingException` on Windows.
  - Renaming a received file to the verified name in a multi-TFM project produced a file that is never read.
  - Scrubbers run in reverse registration order.
  - `[CallerFilePath]` became `/_/...` under `ContinuousIntegrationBuild`.
- *Verify:*
  - `git ls-files -z '*.verified.*' | xargs -0 -r grep -lU $'\r'` prints nothing.
  - `! rg -n -g '*.cs' -e 'FixNewlinesOnRead' -e 'IgnoreTrailingNewline' -e 'CallerFilePath' tests`
- *Watched:* yes:
  - CRLF: `cr_count=10` red, `0` green [SP E3];
  - the rename [SP E4b];
  - scrubbers on Linux and Windows [SP E1, E1-win];
  - `CALLERPATH=/_/GoldenTests.cs` and the CI refusal [SP E8].

**CS-TEST-25 (SHOULD, general) Use property tests where a law exists; CsCheck is the default library.**
- Laws that justify a property: round-trip codecs, containment invariants, hand-written converters and tolerant parsers. Each property states its law in a one-line comment.
- Process lifecycle, time, and anything whose oracle is the real CLI get scenario tests instead.
- One property library per repo. A repo that already has `FsCheck.Xunit.v3` keeps it.
- *Rationale:*
  - CsCheck shrinks composed generators without `Arbitrary` classes and prints `Set seed: "..."`.
  - FsCheck's default `string` failed correct argv code with `"\000"`.
  - A custom `Arb.From` neither shrank nor printed its counterexample.
- *Verify:* `rg -o -N --no-filename -g 'Directory.Packages.props' -e 'Include="(CsCheck|FsCheck[A-Za-z.0-9]*|Hedgehog[A-Za-z.]*)"' . | sort -u | wc -l` prints `1` or less.
- *Watched:* yes. The examples gave `total: 4 failed: 0` with the bugs planted; CsCheck failed 3/3 and FsCheck 2/2; the fixed code was green, including on Windows (10/10). The count grep gave 1 against 2 [SP E5, PROP-2].

**CS-TEST-26 (MUST, general) Property hygiene.**
- Commit no seed or replay value: copy the shrunk counterexample into a plain `[Fact]`.
- Generators exclude what the boundary cannot carry: NUL, lone surrogates, characters illegal in file names.
- Oracles are platform-neutral: build roots from `Path.GetTempPath()`, never `"/srv/..."`.
- Process-spawning properties pass an explicit `iter:` of at most 40. Pure properties leave `iter:` unset, so `CsCheck_Iter` can raise them in a nightly run.
- No `new Random(<literal>)` loops posing as properties.
- *Rationale:*
  - A pinned seed turns a property into a single example.
  - A POSIX oracle failed correct code on Windows.
  - An argv property with 40 spawns took 0.55 s; FsCheck's shrinking with spawns took 8 s.
  - Polly's `new Random(0)` field never generates a new input (`App-vNext__Polly@e4476096da5b:test/Polly.Core.Tests/Retry/RetryHelperTests.cs:13`).
- *Verify:*
  - `! rg -n -g '*.cs' -e 'seed:\s*"' -e 'Replay\s*=' -e 'CsCheck_Seed' -e 'new Random\([0-9]+\)' -e '"/(srv|tmp|home|etc)/' tests`
- *Watched:* yes. Replay: 8/8 CsCheck replays failed on the bug and passed on the fix. The budget and the Windows oracle were measured [SP E5, E5 replay].

### [ocx] rules: commitments for the C# SDK

**CS-TEST-27 (MUST, [ocx]) The SDK's test-dependency set is closed.**
- Allowed: `xunit.v3.mtp-v2` (CS-TEST-05), `Microsoft.Testing.Extensions.CodeCoverage`, `Microsoft.Extensions.TimeProvider.Testing` (CS-XP-11) and `CsCheck`.
- No assertion, mocking, snapshot or second property library.
- *Rationale:*
  - Zero licence surface.
  - CS-TEST-02 already bans mocks in FakeCliTests; this extends the ban to every SDK test project.
  - The Python SDK's own rule is "write a fake, mock at the I/O boundary only" [py :291].
- *Verify:* `greps.sh` check `CS-TEST-27-deps`, i.e. `rg -n -g '*.csproj' -g '*.props' -e 'Include="(FluentAssertions|AwesomeAssertions|Shouldly|Moq|NSubstitute|FakeItEasy|Verify\.[A-Za-z0-9]+|PublicApiGenerator|ApprovalTests|FsCheck[A-Za-z.0-9]*)"' .` prints nothing.
- *Watched:* yes [CN C5]. The red tree printed `FAIL CS-TEST-27-deps` (Shouldly, Verify.XunitV3, NSubstitute); the green tree printed `OK`.

**CS-TEST-28 (MUST, [ocx]) Behaviour is pinned by explicit table rows, never by snapshots.**
- The per-command argv mapping is an explicit theory table: method, then the expected argv.
- The failure-mode table (failure, then exception type and its properties, version-keyed) is the behavioral-compat suite. A row is changed only together with a `supersedes` block, which `check-table-diff.sh` enforces.
- *Rationale:* a named row fails with the row's name, and a snapshot fails with a diff that an agent can accept. Both were measured:
  - Pack gates were silent on all five behaviour breaks; the table failed each one.
  - The exception snapshot was wrong in both directions: it failed a compatible change and passed a breaking one.
- *Verify:*
  - CS-TEST-27's grep (Verify cannot compile without its package).
  - `bash check-table-diff.sh <(git show origin/main:tests/Ocx.Sdk.FakeCliTests/behavior-table.json) tests/Ocx.Sdk.FakeCliTests/behavior-table.json` exits 0. The script is in the csharp-api-behavioral-compat fixture. The table path is that sibling's to fix; the path here follows its fixture.
- *Watched:* yes [BC]:
  - §1: `v2-red-*` five times gave `pack exit=0` and `behaviour-suite exit=2`;
  - §2: an unacknowledged major change gave exit 2, and acknowledging it with `supersedes` gave exit 0;
  - §3: the snapshot control.

**CS-TEST-29 (MUST, [ocx]) Three properties are part of the SDK's suite.**
- `Ocx.Fake` gains a tenth verb, `echo-argv`. It writes its argv to stdout as a JSON string array, UTF-8 with no BOM.
- FakeCliTests holds a CsCheck property, `iter: 40`: argv built by the production engine reaches `echo-argv` byte-identical. The generator includes empty strings, spaces, tabs, `"`, `\`, a trailing `\`, a leading `-`, `=`, and non-ASCII characters, and excludes NUL and lone surrogates.
- UnitTests hold two pure properties:
  - every open-enum struct round-trips any string through its STJ converter unchanged (CS-JSON open enums);
  - `PathSafe.Combine(root, rel)` either throws or returns a path under `root`, with `root` taken from `Path.GetTempPath()`.
- *Rationale:*
  - The planted bugs (`Arguments` as a joined string, `ToLowerInvariant` in the reader, `Path.Combine` plus `StartsWith("..")`) passed every example test.
  - CsCheck found `//..` as an escape.
  - On Windows the property confirmed that `ArgumentList` quoting round-trips through a real child.
  - The ocx contract prefers `--long=value` single tokens and `--` before operands that start with `-` [ocx :125], and requires open enums [ocx :132]. The alphabet above covers both.
- *Verify:*
  - `rg -n -g '*.cs' '"echo-argv"' tests/Ocx.Fake`
  - `rg -n -g '*.cs' 'iter:\s*40' tests/Ocx.Sdk.FakeCliTests`
  - `rg -c -g '*.cs' 'Gen\.' tests/Ocx.Sdk.UnitTests` prints at least 2.
  - After any engine change, swap the planted string-`Arguments` engine in once and watch the property fail.
- *Watched:* the mechanism was watched [SP E5]. The `echo-argv` verb is a new design commitment and has not been built.

**CS-TEST-30 (MUST, [ocx]) The SDK's coverage shape.**
- `tests/Directory.Build.props` adds the coverage extension to the three test projects. `Ocx.Fake` gets nothing.
- The `ubuntu-24.04` and `windows-2025` legs (matrix `coverage: true`) add these flags to their existing `dotnet test -c Release` step: `--coverage --coverage-output-format cobertura --coverage-settings "$GITHUB_WORKSPACE/tests/coverage.settings.xml" --results-directory "$GITHUB_WORKSPACE/artifacts/coverage"`. Each leg then uploads `artifacts/coverage`.
- `ci-ok` keeps `needs: [test]` (CS-CI-03, CS-CI-06). After its result check it downloads both artifacts, runs the CS-TEST-19 ReportGenerator command, and appends `SummaryGithub.md` to `$GITHUB_STEP_SUMMARY`.
- No threshold.
- The arm64 and macOS legs collect nothing.
- No `[ExcludeFromCodeCoverage]` on any `OperatingSystem.Is*` branch.
- *Rationale:*
  - The Windows leg turns the SDK's Windows branches (`.exe` resolution, `USERPROFILE`, the PATH ACL check) from "uncovered" into measured.
  - This removes the pressure that produced Python's `pragma: no cover` [py :185, :314].
  - Merging inside `ci-ok` keeps one required check, and a merge failure (a silent collector) fails it.
- *Verify:*
  - `rg -n -e '--coverage\b' .github/workflows/ci.yml` hits only the coverage-conditioned step.
  - `rg -n -A3 'ci-ok:' .github/workflows/ci.yml | rg needs` shows `[test]`.
  - CS-TEST-18's file-count and `.g.cs` checks run inside `ci-ok`.
- *Watched:* the components were watched [FC V14, V25, §12]. The workflow itself has not run; settle it at the first CI dispatch.

**CS-TEST-31 (SHOULD, [ocx]) SDK code and SDK tests never mutate the process environment.**
- Code that reads the environment takes a snapshot parameter, as `OcxHome.Resolve(Func<string, string?> env)` does in CS-XP-04.
- Tests pass a dictionary instead of calling `Environment.SetEnvironmentVariable`.
- *Rationale:*
  - xUnit runs classes in parallel, and the engine inherits the process environment into every child (CS-PROC).
  - One test's `OCX_HOME` would leak into another class's spawn.
  - A snapshot parameter is a delegate, not an interface, so CS-TEST-08's no-runner-seam rule holds.
- *Verify:* `! rg -n -g '*.cs' 'Environment\.SetEnvironmentVariable' src tests`
- *Watched:* no. This is a decision; the parallel default it relies on was measured [FC V7].

## Applied to the ocx C# SDK

**New commitments this group adds to the design:**
- **`Ocx.Fake`** gains `echo-argv`, a tenth verb that amends CS-TEST-02's list. Three CsCheck properties are added (CS-TEST-29).
- **Test posture:** a four-ID `.editorconfig` test section, and test projects inherit `GenerateDocumentationFile=true` (CS-TEST-12). csharp-build's test-project line must change to match.
- **Dependencies:** the closed test-dependency set (CS-TEST-27). No snapshot library and therefore no Verify fee question for v1 (CS-TEST-21, -23).
- **Coverage:** collected on two x64 legs, merged and reported inside `ci-ok`, with no threshold (CS-TEST-30).
- **Behaviour:** the argv mapping and the failure-mode table are explicit theory rows (CS-TEST-28), shared with csharp-api-behavioral-compat.
- **Environment:** every environment read goes through a snapshot parameter (CS-TEST-31). This extends CS-XP-04's resolver shape to CS-PROC's environment inheritance.

**What the Python SDK already models (keep):**
- **Table-driven tests of pure functions.** `uname_to_triple` and platform passed as a parameter [py :145, :187]. 1,844 parametrised cases [py :176] become xUnit `[Theory]` rows.
- **"Never mock the SUT's own methods; you own the interface, write a fake"** [py :291]. This becomes CS-TEST-17 and CS-TEST-27.
- **Tiers with an env-armed contract tier and a nightly `latest` canary** [py :176-178]. Already in CS-TEST-07 and CS-CI-06.

**What the ocx CLI contract forces:**
- **Argv rules.** Argv never goes through a shell, and the contract prefers `--long=value` and `--` [ocx :125]. The argv property's alphabet includes a leading `-`, `=` and quotes (CS-TEST-29).
- **Open enums and unknown tags** [ocx :132] call for a round-trip property, not an example list (CS-TEST-29).
- **The schema goldens** (`crates/ocx_schema/tests/golden/`, [ocx :70]) are vendored *inputs* for CS-JSON-11, never snapshots of SDK output (CS-TEST-21).
- **The exit table is version-keyed.** Code 82 was reused across releases (CS-TEST-07). A version-keyed table needs named rows with `supersedes`, not an accepted diff (CS-TEST-28).

**Where the Python design must NOT be copied:**
- **`fail_under = 100` enforced on Linux legs only, held by 10 `pragma: no cover` lines on platform branches** [py :185, S12 :314]. Replaced by a two-OS merged report with no gate (CS-TEST-20, -30).
- **The digest's own porting suggestion, "coverlet + `[ExcludeFromCodeCoverage(Justification)]`"** for those branches [py row 41, :366]. Rejected: the C# SDK uses the Microsoft extension, and no exclusion goes on a platform branch.
- **Bare exception-type assertions.** 27 of 190 `pytest.raises` calls had no `match=` [py S11 :313]. The C# failure-mode table asserts the exception type *and* its properties (`ExitCode`, `ErrorKind`) per row (CS-TEST-28), never type alone and never a message snapshot.

## AI-agent failure modes

Ranked by how often an agent produces it unprompted.

| # | Failure | Check that catches it |
|---|---|---|
| 1 | Adds `coverlet.collector` with `--collect:"XPlat Code Coverage"`, or `coverlet.msbuild` with `/p:CollectCoverage=true`. The run is green and has no report. | CS-TEST-10 grep; CS-TEST-18 file-count assertion |
| 2 | Gets a red test-project build green with `<NoWarn>CA1707;CS1591</NoWarn>`, `GenerateDocumentationFile=false`, or by renaming `E1_` tests | CS-TEST-12 `greps.sh`; [CN C4] build error; CS-TEST-04 name grep |
| 3 | Copies `.ConfigureAwait(false)` from library code into tests, or blocks with `.Result` | xUnit1030 and xUnit1031 at error [CN C3]; CS-TEST-13 grep |
| 4 | Accepts a snapshot: `mv X.received.txt X.verified.txt`, hand-edits the file, or adds `AutoVerify()` "to bootstrap" | CS-TEST-22 guard, CODEOWNERS and `AutoVerify` grep |
| 5 | Adds the latest FluentAssertions (8.x) or an unversioned Moq | CS-TEST-16 and CS-TEST-17 `dotnet list package` greps; CS-TEST-27 for the SDK |
| 6 | Calls `CancellationToken.None`, or omits the token, in test calls | xUnit1051 error; CS-TEST-13 grep |
| 7 | Snapshots a decoded DTO or an exception "to prove the mapping" | CS-TEST-21 greps; the non-default assertion of csharp-json class B |
| 8 | Sets a coverage threshold near the first number it sees, then adds hollow tests or `[ExcludeFromCodeCoverage]` to reach it | CS-TEST-20 greps |
| 9 | Leaves the STJ source-generated context in the coverage denominator, or writes a coverlet `testconfig.json` with only `format` | CS-TEST-18 `.g.cs` count |
| 10 | Uses a fixed `--coverage-output coverage.xml` on a multi-TFM project, or a relative `--coverage-settings` | CS-TEST-18 file count and absolute-path grep |
| 11 | Uses an early `return;` for an unmet precondition, or a hallucinated MSTest `Assert.Skip` | CS-TEST-15 grep; CS0411 |
| 12 | Sets environment variables in parallel xUnit tests | CS-TEST-14 pipeline; CS-TEST-31 grep |
| 13 | Adds `Verify.XunitV3` 33.x, hits SC021, then sets `Verify_SponsorshipLicenseIgnored` or silently downgrades | CS-TEST-23 build exit and grep |
| 14 | Merges with `dotnet-coverage merge`, or renders ReportGenerator without `-sourcedirs` | CS-TEST-19 greps |
| 15 | Writes a property with FsCheck's default `string`, a pinned seed, a POSIX literal root, or `iter: 100000` on a spawning property | CS-TEST-26 grep |
| 16 | Masks a red run with `continue-on-error: true` or `--ignore-exit-code 8` | CS-TEST-11 grep |
| 17 | Uses xUnit v2 or MSTest v2 idioms: `Xunit.Abstractions`, `[ExpectedException]`, `[UsesVerify]`, `[CulturedFact("de-DE")]` | the compiler: CS0234, CS0246, CS1503 [FC V22, SP AI row] |

## Failure classes

| Class | Mechanism | Members | The check that catches the class |
|---|---|---|---|
| **A. Silent-success tooling** | The tool runs, exits 0 and produces nothing or the wrong thing: VSTest collectors under MTP, a clobbered output file, the generated-code denominator, `testconfig.json` dropping defaults, `continue-on-error` | 1, 9, 10, 16 | **Assert on the artefact, not the exit code:** a cobertura count per TFM, zero `.g.cs` entries, and the merge inside `ci-ok` |
| **B. Gate defeated by local suppression** | The agent edits configuration until the build is green: `NoWarn`, a severity of `none` on a test-framework analyzer, `GenerateDocumentationFile=false`, `LicenseIgnored` | 2, 13 | **One fixed carve-out** (CS-TEST-12) plus `greps.sh`. Every other suppression in `tests` is a finding. |
| **C. The accept button** | A red test turns green by changing the expectation instead of the code: snapshot accept, AutoVerify, a regenerated golden, an edited behaviour row, a coverage target met with hollow tests | 4, 7, 8 | **Expectations change only under human review:** the CI git guard, CODEOWNERS, `supersedes` in `check-table-diff.sh`, and no threshold |
| **D. Library-code idioms in test code** | Rules that are right in `src` are wrong in tests: `ConfigureAwait(false)`, missing XML docs, `Async` suffixes, no underscores | 2, 3 | The scoped `.editorconfig` section; xUnit1030 at error |
| **E. Stale or commercial package priors** | Training data predates the 2025-26 licence and API changes: FluentAssertions 8, Moq SponsorLink, Verify 33's fee, xUnit v2 and MSTest v2 APIs | 5, 13, 17 | `dotnet list package --include-transitive` greps; the closed SDK set (CS-TEST-27); the compiler |
| **F. Examples where a law exists** | A hand-picked example list misses the input that breaks a codec, a containment check or argv quoting; a pinned seed turns a property back into an example | 15 | Properties with shrinking (CS-TEST-25, -29) and the seed/replay grep (CS-TEST-26) |
| **G. Shared process state under parallelism** | Environment variables, statics and culture defaults leak between parallel classes | 12 | A non-parallel collection (CS-TEST-14); for the SDK, no mutation at all (CS-TEST-31) |

## Conflicts resolved

1. **CS-TEST-05 against the framework study.** Kept. No measured reason to overturn: runtime is equal, and the exit contract is identical. xUnit's default-on token analyzer is the tiebreaker. Generalised for other libraries as CS-TEST-09.
2. **csharp-build's "test projects set `GenerateDocumentationFile=false`" against its own IDE0005 posture.** Overturned by measurement: `error EnableGenerateDocumentationFile` [CN C4]. Use `CS1591 = none` in the test section instead. simple-exec's `NoWarn CS1591` cites the same root cause, roslyn#41640 (`adamralph__simple-exec@f80913246993:tests/Directory.Build.props:16`).
3. **[FC] T-07's test suppression set (`CA2007;VSTHRD111;VSTHRD200` via NoWarn) against CS-ASYNC-06 and the posture.** The set becomes CA2007, VSTHRD200, CA1707 and CS1591, in `.editorconfig` only. VSTHRD111 is dropped because CS-ASYNC never enables it. CA1707 and CS1591 are added on measurement [CN C1]. Exemplars back this: `xunit__xunit@0c7aa4991fa3:.editorconfig:248`, `microsoft__testfx@7226b0c74729:test/.editorconfig:22`, `microsoft__vs-threading@f6d817997090:test/.editorconfig:33-37`.
4. **[FC]'s "coverage on one Linux x64 leg" against Python S12 and the cross-platform verdict ("exclude no platform branch").** The SDK uses Linux x64 plus Windows x64, merged. The merge was measured clean, and arm64 is excluded because its instrumentation is undocumented. General libraries add the Windows leg only when `src` branches on the OS.
5. **[FC] T-21 put the optional gate "in the aggregator (CS-CI-05)".** That is a mislabel: the aggregator is `ci-ok` (CS-CI-03). The merge runs inside `ci-ok`, so CS-CI-06's `needs: [test]` check stays valid.
6. **Snapshots: evolution-gates #27 ("an optional additive layer") against [SP] ("the SDK needs none") against behavioral-compat.** The SDK adopts none. General libraries may snapshot large rendered text, and an API listing only where PublicApiAnalyzers is absent. Behaviour tables are explicit rows, never snapshots [BC §3].
7. **Property library: Polly's "use FsCheck, don't introduce new libraries" against [SP]'s CsCheck default.** A greenfield repo uses CsCheck; a repo with FsCheck keeps it. One library per repo.
8. **[FC] T-09 lists "culture" as process-global.** Narrowed to `DefaultThreadCurrent*Culture`. CS-XP-08's culture sweep sets and restores `CurrentCulture` inside the test. This consolidation did not measure whether that is parallel-safe, so it neither bans nor collections it.

## Open questions

**Owner decisions:**
1. **Coverage floor.** The default is none (report only). Alternatively, a raise-only floor on the merged line rate, evaluated in `ci-ok` (CS-TEST-20).
2. **A coverage service.** The default is the job summary only: no Codecov token, no third-party upload. Polly gates through Codecov (`App-vNext__Polly@e4476096da5b:.github/codecov.yml:5-9`).
3. **CODEOWNERS on expectation files.** `behavior-table*.json` (CS-TEST-28), plus `*.verified.*` if snapshots ever arrive. Only the owner can be that reviewer, and only the owner can enable the branch-protection setting that enforces it.
4. **Verify's fee**, only if a snapshot library is ever adopted: an OpenSource exemption (yearly renewal commit), a sponsorship, or a pin at 32.0.0 (CS-TEST-23). Not needed for v1.

**Subareas for another research round:**
- **`csharp-testing-coverage-native-arm-macos`** (fold into the planned `csharp-crossplatform-native-arm-macos` dispatch). Does `Microsoft.Testing.Extensions.CodeCoverage` 18.12.0 instrument on `ubuntu-24.04-arm`, `windows-11-arm` and `macos-26`? Do the merged numbers match x64? If yes, CS-TEST-30 can collect on all five legs.
- **`csharp-testing-mutation`.** Is Stryker.NET on MTP a better gate than coverage for the exit table, argv builder and open-enum converters? What does a weekly run cost on this suite? testfx runs it weekly [FC Contested]. This is the candidate replacement if the owner wants a quality number that hollow tests cannot satisfy.
- **`csharp-api-behavioral-compat`** must land its sub-artifact. Confirm that its table location and the `check-table-diff.sh` contract match CS-TEST-28. This consolidation read only its fixture evidence.
- **The Windows exit 5 → 1 mapping** [FC §3, measured on SDK 10.0.102 only]. Re-check it on the CI runner's SDK 10.0.401; CS-TEST-11 already makes it harmless.

## Sub-artifacts

- [csharp-testing/csharp-testing-framework-and-coverage.md](csharp-testing/csharp-testing-framework-and-coverage.md): xUnit v3, MSTest 4, NUnit 5 and TUnit on MTP measured side by side: exit codes, analyzers, parallelism, skip APIs, assertion licences, Moq SponsorLink, the two coverage tools and their silent no-op traps, generated-code exclusion, merge, `/_/` paths, thresholds. Linux, Windows host and SDK 11 RC1 (V1-V26).
- [csharp-testing/csharp-testing-snapshots-and-property.md](csharp-testing/csharp-testing-snapshots-and-property.md): Verify's sponsor gate, AutoVerify and DiffEngine CI detection, scrubber order, line endings and per-TFM files, the three SDK snapshot candidates against existing gates, a dependency-free golden helper, and CsCheck against FsCheck on argv, open-enum and path-containment properties (E1-E10).

## Key sources

1. https://learn.microsoft.com/en-us/dotnet/core/testing/microsoft-testing-platform-troubleshooting: the MTP exit-code table 0-14 and `--ignore-exit-code`.
2. https://learn.microsoft.com/en-us/dotnet/core/testing/microsoft-testing-platform-extensions-code-coverage: the Microsoft extension, coverlet.MTP options, and the exit-14 threshold channel.
3. https://raw.githubusercontent.com/microsoft/codecoverage/main/docs/configuration.md: default attribute exclusions; `GeneratedCodeAttribute` is not among them.
4. https://learn.microsoft.com/en-us/dotnet/core/additional-tools/dotnet-coverage: `merge` and the platforms where instrumentation is supported.
5. https://github.com/danielpalme/ReportGenerator: merge by glob, report types, `-sourcedirs`.
6. https://xunit.net/docs/getting-started/v3/microsoft-testing-platform: `xunit.v3.mtp-v2`, and "Standard Coverlet isn't supported with MTP".
7. https://xunit.net/xunit.analyzers/rules/: xUnit analyzer severities (xUnit1051, 1030, 1031, 1049).
8. https://learn.microsoft.com/en-us/dotnet/core/testing/mstest-analyzers/overview: `MSTestAnalysisMode` and MSTEST0049's default of Info.
9. https://xunit.net/docs/running-tests-in-parallel: xUnit runs classes in parallel by default.
10. https://github.com/fluentassertions/fluentassertions: the v8 licence statement; v7 stays open source.
11. https://github.com/devlooped/moq/releases: SponsorLink added in 4.20.0 and removed in 4.20.2.
12. https://raw.githubusercontent.com/VerifyTests/Verify/main/docs/maintenance-fee.md: Verify 33's build-time sponsorship check (SC021).
13. https://github.com/VerifyTests/Verify/blob/main/docs/autoverify.md: AutoVerify applies to build servers by default.
14. https://raw.githubusercontent.com/AnthonyLloyd/CsCheck/master/README.md: CsCheck `Gen`, seeds and the `CsCheck_Iter`/`CsCheck_Seed` env knobs.
15. https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1707: CA1707, which the test carve-out turns off.

### Consolidation verification log

Fixture root: `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/consolidate-csharp-testing/`. SDK 10.0.401 via `run.sh`. The posture files were copied from `consolidate-csharp-build/posture/` and the `.editorconfig` test section from CS-ASYNC-06. `./run-all.sh` rewrites `posture-tests/evidence.txt`.

| # | Question settled | Red | Green |
|---|---|---|---|
| C1 | Do CS-TEST-04 names build under the CS-BUILD posture plus CS-ASYNC-06's test section? | `./check.sh red tests/T/T.csproj`: `build-exit=1 diagnostics=[ 8 error CA1707; 12 error CS1591;]` | n/a |
| C2 | The four-ID carve-out | (C1) | `./check.sh green tests/T/T.csproj run`: `build-exit=0`, `test-exit=0 total: 6 failed: 0 succeeded: 6` |
| C3 | Does `ConfigureAwait(false)` in a test still fail with the carve-out? | `./check.sh green tests/T2/T2.csproj`: `build-exit=1 [4 error xUnit1030]` | C2 tree (no ConfigureAwait): exit 0 |
| C4 | csharp-build's `GenerateDocumentationFile=false` for tests | `./check.sh green tests/T3/T3.csproj`: `build-exit=1 [4 error EnableGenerateDocumentationFile]` | C2 (inherited `true` plus `CS1591 = none`): exit 0 |
| C5 | Static greps for CS-TEST-12 and CS-TEST-27 | `greps/greps.sh greps/red`: 3 FAIL lines (`<NoWarn>` and `GenerateDocumentationFile>false`, xUnit1051 `none`, Shouldly/Verify/NSubstitute), exit 1 | `greps/greps.sh greps/green`: `OK`, exit 0 |
