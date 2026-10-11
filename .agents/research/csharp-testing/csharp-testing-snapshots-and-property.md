---
title: "Snapshot tests (Verify) and property-based tests in a .NET library suite: where they belong, and the rules that keep them honest"
topic: csharp-testing-snapshots-and-property
agent: deep-dive researcher, subtopic XP-12 of csharp-testing
model: claude-sonnet-5-5
date_researched: 2026-10-11
sources_count: 22
scope: |
  Covers: Verify (Verify.XunitV3 on xunit.v3 + Microsoft.Testing.Platform) mechanics, its new build-time sponsor gate, AutoVerify and DiffEngine CI detection, scrubbers,
  line endings and per-TFM files, the "agent accepts received" rot mode and the CI guard, the three candidate snapshot uses (API listing, JSON decode, exception shape)
  measured against the gates already chosen in CS-API / CS-JSON, a dependency-free golden helper, and property-based testing with CsCheck vs FsCheck.Xunit.v3
  (argv round-trip, open-enum round-trip, path containment), including seeds, shrinking and run-time budget.
  Not covered: test framework / mocking / coverage choice (sibling csharp-testing-framework-and-coverage), BenchmarkDotNet, mutation testing, fuzzing with SharpFuzz,
  MSTest/NUnit variants beyond a mention, .NET 11 / SDK 11 runs (all fixtures ran on SDK 10.0.401; Windows on 10.0.102).
---

# Snapshot tests and property-based tests

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The decision in one paragraph](#1-the-decision-in-one-paragraph)
   2. [Verify 33 has a build-time sponsor gate](#2-verify-33-has-a-build-time-sponsor-gate)
   3. [Verify mechanics: packages, files, names](#3-verify-mechanics-packages-files-names)
   4. [Never auto-accept: AutoVerify and DiffEngine's CI detection](#4-never-auto-accept-autoverify-and-diffengines-ci-detection)
   5. [Scrubbers: what is automatic, what is not, and the order trap](#5-scrubbers-what-is-automatic-what-is-not-and-the-order-trap)
   6. [Line endings, BOM, per-TFM files](#6-line-endings-bom-per-tfm-files)
   7. [The three candidate uses against the gates already chosen](#7-the-three-candidate-uses-against-the-gates-already-chosen)
   8. [The rot mode and the guard](#8-the-rot-mode-and-the-guard)
   9. [A dependency-free golden helper](#9-a-dependency-free-golden-helper)
   10. [Property-based testing: targets that pay](#10-property-based-testing-targets-that-pay)
   11. [CsCheck vs FsCheck.Xunit.v3](#11-cscheck-vs-fscheckxunitv3)
   12. [Seeds, shrinking, budget](#12-seeds-shrinking-budget)
   13. [Exemplar census](#13-exemplar-census)
   14. [Verified on the toolchain](#14-verified-on-the-toolchain)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- **The ocx SDK needs no snapshot library.** Every candidate use (API listing, JSON decode, exception shape) is already covered by a gate chosen in CS-API / CS-JSON, or is cheaper as an explicit assertion (section 7). Snapshots are an opt-in tool for large multi-line text, not part of the baseline stack.
- **Verify 33+ fails the build with `SC021` unless the project declares sponsorship or an exemption.** Versions released after 2026-09-01 are covered; 33.3.3 without a declaration exits 1 ([maintenance-fee.md](https://raw.githubusercontent.com/VerifyTests/Verify/main/docs/maintenance-fee.md), E7). This is an owner decision, not a coding detail.
- **Exemptions expire and break CI on a date.** `Verify_SponsorshipExemption=OpenSource` needs `Verify_SponsorshipExemptionUntil` (at most 12 months out); once the month passes the build fails with `SC049` (E7).
- **The last fee-free line is Verify.XunitV3 32.0.0 (2026-08-26).** It builds with no declaration and runs on xunit.v3.mtp-v2 4.0.2 (E7, E1). Verify.Xunit (xUnit v2) is frozen at 31.12.5 and is the wrong package for xunit.v3.
- **`VerifierSettings.AutoVerify()` is banned.** With a regression planted and `GITHUB_ACTION` set it passed the test and silently rewrote the verified file (E2 RED 1).
- **`AutoVerify(includeBuildServer: false)` is not a CI guard.** DiffEngine 20.8.1 detects CI by specific variables (`GITHUB_ACTION`, `TF_BUILD=True`, `JENKINS_URL`, ...), not `CI=true` and not `GITHUB_ACTIONS`; with only those set the planted regression was still accepted (E2 HOLE x2).
- **The CI guard is a git check after the tests**: `git diff --exit-code -- '*.verified.*'`, no untracked verified file, no leftover received file. It flagged every AutoVerify run and passed the clean run (E2, E6).
- **Never accept a snapshot by renaming `received` to `verified`.** In a multi-targeted project the received name carries a TFM segment the verified name does not; the renamed file is never read and the test stays red (E4b). Verify's own AI guide says "use the `Verified:` line".
- **Scrubbers run last-registered-first and before the built-in directory scrubbers.** Registering `{Home}` before the user name produced `/home/{User}`; a home scrubber also swallowed the temp path on Windows (E1). Keep absolute paths out of the snapshotted model instead.
- **Verify omits null members, so a snapshot of a mis-bound DTO records the bug.** A `[JsonPropertyName("digst")]` typo produced a green snapshot with `Digest` absent, while a non-default assertion failed (E9).
- **A hand-rolled golden helper is ~25 lines, needs no licence, and is as honest as Verify** if update mode is refused when `CI` is set and the golden directory comes from `AssemblyMetadata`, not `[CallerFilePath]` (rewritten to `/_/...` in CI builds inside a git repo, E8).
- **Verified files need `*.verified.* text eol=lf`.** A `core.autocrlf=true` checkout on Windows turned the file CRLF and Verify threw `VerifiedLineEndingException`; with the attribute the same run passed (E3).
- **Property tests pay on three target classes**: codecs that must round-trip (open-enum JSON, argv across a process), containment invariants (path join never escapes the root), and tolerant parsers. Four hand-written example tests per target stayed green with all three planted bugs; five properties went red (E5).
- **Default to CsCheck 4.9.1 for the SDK.** Composed generators shrink with no `Arbitrary` classes, the seed is printed as `Set seed: "..."`, and `CsCheck_Seed` / `CsCheck_Iter` env vars work. FsCheck.Xunit.v3 3.4.0 is acceptable where already used (Polly) but its default `string` generator emits `\000` (a false failure for argv) and a custom `Arb.From` wrapper neither shrinks nor prints its counterexample (E5).
- **Generators must exclude what the boundary cannot carry** (NUL, lone surrogates) and **oracles must be platform-neutral**: a POSIX `/srv/ocx` oracle failed correct code on Windows (E5 Windows).
- **Process-spawning properties get an explicit iteration cap (40)**; pure properties run 100 000+ iterations in about 0.6 s, so raise them with `CsCheck_Iter` in the nightly, never by hard-coding `iter:` (E5).
- **Property-based testing is rare in the corpus**: 1 of 35 exemplars (Polly, 2 FsCheck properties), 0 CsCheck. Verify appears in 7 of 35 and no exemplar has a CI step that fails on a changed verified file (section 13).

## Findings

### 1. The decision in one paragraph

Snapshots (Verify or a hand-rolled golden) belong where the expected value is a large multi-line artefact that is expensive to write as assertions and cheap to review as a diff, and where no stronger gate already owns the same property. For the ocx SDK that set is empty today: the public surface is owned by PublicApiAnalyzers plus package validation (CS-API-12..16), the wire model by the schema-diff test and non-default assertions (CS-JSON-11, class B), and exceptions by the exit table conformance test (CS-ERR). Property-based tests belong on pure functions and process boundaries with an algebraic law (round-trip, containment, idempotence), with CsCheck as the default library. Both tools share one failure mode: a test-green button that an agent presses to make red go away. Everything below is about making that button hard to press.

### 2. Verify 33 has a build-time sponsor gate

New in this wave and load-bearing for any agent that "adds Verify". [maintenance-fee.md](https://raw.githubusercontent.com/VerifyTests/Verify/main/docs/maintenance-fee.md) says versions released after 2026-09-01 are covered, "from v33, sponsorship is verified at build time by SponsorCheck", and a build needs exactly one declaration or it fails with SC021. Organisations with revenue of US$10 000 a year or more, and government agencies, pay (US$5 to US$100 a month by headcount); individuals, non-revenue open source and non-revenue NGOs are exempt. Diagnostic meanings are in the [SponsorCheck code table](https://raw.githubusercontent.com/SimonCropp/SponsorCheck/main/docs/VerifierDiagnosticCodes.md) (SC021 none declared, SC022 mutually exclusive, SC023 ignored, SC025 licence expired).

Observed on SDK 10.0.401 with `TreatWarningsAsErrors=true` inherited, xunit.v3.mtp-v2 4.0.2 (`fee/`, E7):

| Declaration in the csproj / Directory.Build.props | Build |
|---|---|
| Verify.XunitV3 **32.0.0**, nothing | exit 0 |
| Verify.XunitV3 **33.3.3**, nothing | **exit 1, `SponsorCheck error SC021`** |
| 33.3.3 + `Verify_SponsorshipExemption=OpenSource` + `Verify_SponsorshipExemptionUntil=2027-09` | exit 0 |
| same exemption with `Until=2026-09` (already expired) | **exit 1, `SC049`** |
| 33.3.3 + `Verify_SponsorshipLicenseIgnored=true`, TWAE on | exit 0, warning SC023 on every build |
| same, CLI `-warnaserror` | **exit 1** (CS-BUILD forbids `-warnaserror`, so the escape hatch silently survives the project's own gate) |

Consequences for agent behaviour: an agent that adds `Verify.XunitV3` from NuGet gets 33.x, hits SC021, and "fixes" it by the cheapest means (downgrade, `LicenseIgnored`, deleting Verify). None of those is the owner's call to leave to chance. The declaration is a one-line property in `Directory.Build.props`; which one is true (OpenSource exemption, a sponsor account, or 32.0.0 pinned) is a decision for the ocx-sh owner. The exemption needs a yearly renewal commit or CI breaks on the first day of the expiry month.

Exemplar census (section 13): every Verify user in the corpus pins a pre-fee version (Humanizer `Verify.XunitV3 31.27.0`, BenchmarkDotNet `Verify.Xunit 31.12.5`) because the clones predate the gate ([Humanizr__Humanizer@4574b93883bf:Directory.Packages.props:22-23](file:///home/mherwig/.cache/research-lang/exemplars/csharp/Humanizr__Humanizer/Directory.Packages.props)). Their practice transfers; their version pins do not.

### 3. Verify mechanics: packages, files, names

- **Package.** `Verify.XunitV3` for xunit.v3 on MTP, no class attribute needed (E1: `[Fact] public Task T() => Verifier.Verify(x);` ran as-is). `Verify.Xunit` is the xUnit v2 package, last release 31.12.5 (2026-02-11, NuGet registration). `[UsesVerify]` does not exist in Verify.XunitV3 32.0.0: `CS0246: UsesVerifyAttribute could not be found` (E-AI check). `[Fact]` compiled with no `using Xunit` in the Verify projects but not in the plain xunit.v3.mtp-v2 projects (`prop/`, `golden/`), which needed `<Using Include="Xunit" />`.
- **Files.** `{Dir}/{Class}.{Method}_{Params}_{UniqueFor...}.verified.{ext}`, default `.txt` ([naming.md](https://raw.githubusercontent.com/VerifyTests/Verify/main/docs/naming.md)). `*.received.*` is written on every failure and must be git-ignored; `*.verified.*` is committed ([readme](https://raw.githubusercontent.com/VerifyTests/Verify/main/readme.md)). Text snapshots are UTF-8 **with BOM**, LF, no trailing newline (readme; observed `EF BB BF` first bytes in E1).
- **A missing verified file fails the test** (E1 run 1: `New:` section, exit 2, observed locally). A new snapshot is therefore always a visible event, provided nobody accepts it blindly.
- **Failure message is machine-readable**: `Directory:`, then `New:` / `NotEqual:` / `Delete:` blocks listing `Received:` and `Verified:` file names, then `FileContent:` (E1 log; [ai-usage.md](https://raw.githubusercontent.com/VerifyTests/Verify/main/docs/ai-usage.md)). `DiffEngine_Disabled=true` stops diff tools launching and the message still carries the paths.
- **MTP side effect.** Verify 32.0.0 with no `.sln`/`.slnx` emits `warning : No solution files found. Unable to auto-discover SolutionDir` from `Verify.props(70,5)`; the build still succeeded under `TreatWarningsAsErrors=true` (a code-less task warning is not escalated). Put a `.slnx` at the repo root (CS-BUILD) and the warning is gone.
- **Dangling snapshots.** Verify tracks which verified files no test claims, and in multi-targeted projects keeps a manifest per TFM in `obj/` ([dangling-files.md](https://github.com/VerifyTests/Verify/blob/main/docs/dangling-files.md) at Verify@cfebdbf28b5e); the feature is `[Experimental("VerifyDanglingSnapshots")]`. Not run here.

### 4. Never auto-accept: AutoVerify and DiffEngine's CI detection

[autoverify.md](https://github.com/VerifyTests/Verify/blob/main/docs/autoverify.md): "AutoVerify applies to build servers by default, the same as local runs"; opt out with `includeBuildServer: false`. Source: `VerifierSettings.AutoVerify(GlobalAutoVerify autoVerify, bool includeBuildServer = true, bool throwException = false)` returns early only `if (!includeBuildServer && BuildServerDetector.Detected)` (Verify@cfebdbf28b5e:src/Verify/VerifierSettings.cs:43-52).

What `BuildServerDetector.Detected` actually reads (DiffEngine@87463acbf21d:src/DiffEngine/BuildServerDetector.cs): `JENKINS_URL`, **`GITHUB_ACTION`** (singular), `TEAMCITY_VERSION`, `BuildRunner=MyGet`, `GITLAB_CI`, `GO_SERVER_URL`, `TRAVIS_BUILD_ID`, `DOTNET_RUNNING_IN_CONTAINER=true`, `APPVEYOR`, `BITBUCKET_BUILD_NUMBER`, `TF_BUILD=True`. It does **not** read `CI`, `GITHUB_ACTIONS`, `CIRCLECI`, `BUILDKITE`. In the shipped DiffEngine 20.8.1 it also counts `WSL_DISTRO_NAME` (observed `detected=True wsl=True` in a WSL shell; DiffEngine `main` and its [readme](https://raw.githubusercontent.com/VerifyTests/DiffEngine/main/readme.md) say WSL is excluded, so this is version drift). DiffEngine separately disables diff launching for AI CLIs (`CLAUDECODE`, `CLAUDE_CODE_ENTRYPOINT`, Copilot, Aider: `AiCliDetector.cs:9-19`), which does not affect AutoVerify.

Wrong (RED) and right (GREEN), watched in `autov-repo/` (E2; shell modelled as non-WSL, non-agent):

```csharp
// WRONG: ModuleInitializer in the test project
VerifierSettings.AutoVerify();                       // accepts everything, on CI too
VerifierSettings.AutoVerify(includeBuildServer: false); // accepts on any CI the detector does not know (CI=true alone)
// RIGHT: no AutoVerify call at all; accepting is a local human act (section 8)
```

| Posture (planted regression `exit-code: 75` becomes `99 (BROKEN)`) | Test | Verified file afterwards | Git guard |
|---|---|---|---|
| `AutoVerify()` + `GITHUB_ACTION=run1` | **passes** | rewritten to `99 (BROKEN)` | FAIL (modified) |
| `AutoVerify()` + `CI=true` only | **passes** | rewritten | FAIL |
| `AutoVerify(includeBuildServer:false)` + `GITHUB_ACTION=run1` | fails (red CI) | untouched | ok |
| `AutoVerify(includeBuildServer:false)` + `CI=true` only | **passes** | rewritten | FAIL |
| `AutoVerify(includeBuildServer:false)` + `GITHUB_ACTIONS=true` only | **passes** | rewritten | FAIL |
| no AutoVerify, `CI=true` | fails (red CI) | untouched | ok |

The guard, as run:

```bash
git diff --quiet -- '*.verified.*'                                   || { echo "verified file modified"; exit 1; }
[ -z "$(git ls-files --others --exclude-standard -- '*.verified.*')" ] || { echo "untracked verified file"; exit 1; }
[ -z "$(find . -name '*.received.*' -not -path './bin/*' -not -path './obj/*' -not -path './TestResults/*')" ] || { echo "received file left"; exit 1; }
```

Related env knobs: `Verify_DisableClipboard=true` ([clipboard.md](https://github.com/VerifyTests/Verify/blob/main/docs/clipboard.md): "overrides all the other clipboard settings") and `DiffEngine_Disabled=true`. Nuke sets both from a `[ModuleInitializer]` ([nuke-build__nuke@27e8077b8ab0:source/Nuke.Common.Tests/VerifyTestsInitializer.cs:17-18](file:///home/mherwig/.cache/research-lang/exemplars/csharp/nuke-build__nuke/source/Nuke.Common.Tests/VerifyTestsInitializer.cs)). Set them as workflow `env:` instead; it cannot be forgotten per test project.

### 5. Scrubbers: what is automatic, what is not, and the order trap

Automatic ([scrubbers.md](https://raw.githubusercontent.com/VerifyTests/Verify/main/docs/scrubbers.md), [guids.md](https://raw.githubusercontent.com/VerifyTests/Verify/main/docs/guids.md), [dates.md](https://raw.githubusercontent.com/VerifyTests/Verify/main/docs/dates.md)): typed `Guid` -> `Guid_1`, typed `DateTime`/`DateTimeOffset`/`DateOnly`/`TimeOnly` -> `DateTime_1`..., and directories -> `{SolutionDirectory}`, `{ProjectDirectory}`, `{UserProfile}`, `{CurrentDirectory}`, `{TempPath}`. **Not** automatic: machine name, user name, GUIDs and timestamps inside free-text strings (`ScrubInlineGuids`, `ScrubInlineDateTimes(format)`), path separators.

Planted RED, `Verify(report)` on a model with a message string `installed on {MachineName} at {UtcNow:O} (run {Guid}) as {UserName}` (E1 `RedTests`, Linux):

```text
run 1: failed (New)        -> agent moves received to verified
run 2: failed NotEqual     Message: installed on Workstation at 2026-10-10T23:37:17.6074644Z (run 1c9a213b-...) as mherwig,
                           Message: installed on Workstation at 2026-10-10T23:37:16.3336752Z (run 1800f0e2-...) as mherwig,
run 3: failed NotEqual
```

On the Windows host (10.0.102) the Linux-produced verified file additionally differs by `{UserProfile}.ocx\packages` vs `/` separators, `WORKSTATION` vs `Workstation`, and `ecom` vs `mherwig` (E1-win).

GREEN twin that passes on both hosts (E1 `GreenTests`, replayed on Windows):

```csharp
Verifier.Verify(Reports.Make())
    .ScrubInlineGuids()
    .ScrubInlineDateTimes("yyyy-MM-ddTHH:mm:ss.fffffffZ")
    .ScrubMachineName()
    .AddScrubber(sb => sb.Replace('\\', '/'))                                                       // runs LAST
    .AddScrubber(sb => sb.Replace(Environment.UserName, "{User}"))
    .AddScrubber(sb => sb.Replace(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "{Home}"))
    .AddScrubber(sb => sb.Replace(Path.GetTempPath(), "{Temp}/"));                                  // runs FIRST
```

The order is the trap, and it is source-level, not folklore: `AddScrubber(..., ScrubberLocation location = ScrubberLocation.First)` does `InstanceScrubbers.Insert(0, scrubber)` (Verify@cfebdbf28b5e:src/Verify/Serialization/Scrubbers/VerifySettings_InstanceScrubbers.cs:68-73), so **the last registered runs first**, and custom scrubbers ran before the built-in `{TempPath}` / `{UserProfile}` ones (observed). Registering home then user name gave `/home/{User}/.ocx`; a custom `{Home}` replace ran before `{TempPath}` and turned the Windows temp dir into `{Home}/AppData/Local/Temp/...`. The cheaper rule is the one that needs no scrubbers: **do not put absolute paths, user names, host names or "now" in the object you snapshot**; project to a DTO with relative paths and typed dates first.

### 6. Line endings, BOM, per-TFM files

- **Verify rejects CR in a verified file.** `Comparer.cs:17-25` throws `VerifiedLineEndingException` when the verified text contains `\r` and `FixNewlinesOnRead` is off ([newline-tolerance.md](https://raw.githubusercontent.com/VerifyTests/Verify/main/docs/newline-tolerance.md)). Observed on Windows 10.0.102 (E3): a repo with `core.autocrlf=true` and no attribute checked the verified file out with 10 CRs (246 bytes) -> `VerifiedLineEndingException : Verified file must use \n line endings, but it contains a \r (carriage return).`, exit 2. With `.gitattributes` = `*.verified.* text eol=lf` the same file stayed 236 bytes, 0 CRs, and the test passed.
- **Attribute set to commit** (the readme's version also pins the encoding; Cake carries exactly that, [cake-build__cake@08885933e936:.gitattributes:73-76](file:///home/mherwig/.cache/research-lang/exemplars/csharp/cake-build__cake/.gitattributes)):

  ```gitattributes
  *.verified.txt  text eol=lf working-tree-encoding=UTF-8
  *.verified.json text eol=lf working-tree-encoding=UTF-8
  *.verified.xml  text eol=lf working-tree-encoding=UTF-8
  *.verified.bin  binary
  ```

  Humanizer relies on a global `* text=auto eol=lf` instead ([Humanizr__Humanizer@4574b93883bf:.gitattributes:8](file:///home/mherwig/.cache/research-lang/exemplars/csharp/Humanizr__Humanizer/.gitattributes)); that also works but protects nothing if someone narrows the global rule. A per-pattern line plus a check (rule 12) survives.
- **`FixNewlinesOnRead()` / `IgnoreTrailingNewline()`** (global, ModuleInitializer, throw if called after the first verify) hide a misconfigured checkout rather than fix it; do not set them.
- **Per-TFM files.** `.UniqueForTargetFrameworkAndVersion()` yields `Class.Method.DotNet8_0.verified.txt` / `DotNet10_0` (E4 produced both; Humanizer commits four, 130.5 KB each, [PublicApiApprovalTest.cs:5-13](file:///home/mherwig/.cache/research-lang/exemplars/csharp/Humanizr__Humanizer/tests/Humanizer.Tests/ApiApprover/PublicApiApprovalTest.cs)). Without it, a multi-targeted listing compares two different surfaces with one file: net10.0 accepted, net8.0 then failed `NotEqual` (E4b b). The received file always gets a TFM segment in a multi-targeted project ([naming.md](https://raw.githubusercontent.com/VerifyTests/Verify/main/docs/naming.md) "Received and multi-targeting"), the verified file only if `UniqueFor...` was called, so renaming received->verified left the test red on `Verified: NoUniqueTest.Approve_without_unique.verified.txt` (E4b a).
- **Test-project TFMs.** A parent `Directory.Build.props` that sets singular `<TargetFramework>` silently overrides `<TargetFrameworks>` in a child project (the net8.0 output directory stayed empty until the fixture got a standalone props file). Check `ls bin/Debug` before believing a two-TFM run.

### 7. The three candidate uses against the gates already chosen

Measured on `api/` (Lib net8.0;net10.0 with PublicApiAnalyzers 5.6.0 per-TFM files, Tests with PublicApiGenerator 11.5.4 + Verify 32.0.0). Mutations were applied one at a time; "analyzer" is `dotnet build Lib` with RS0016/RS0017 at error (TWAE), "listing" is the Verify test on both TFMs (E4):

| Mutation | PublicApiAnalyzers (run) | Verify listing (run) | Package validation (cited from `csharp-api-evolution-gates` / CS-API, not re-run here) |
|---|---|---|---|
| default `timeoutSeconds = 30` -> `60` | RS0016 RS0017 | red | not a binary break |
| `[JsonPropertyName("digest")]` -> `("digst")` | **clean** | red | CP0015 with `ApiCompatEnableRuleAttributesMustMatch` (on in CS-API) |
| base type `OcxException` -> `Exception` | **clean** | red | CP0007 |
| `[Obsolete]` added | **clean** | red | not raised (`csharp-api-evolution-gates` pv-opt-obsolete) |
| `sealed` removed from `Client` | **clean** | red | allowed; MA0053 owns it (CS-API-02) |
| `#if NET10_0_OR_GREATER` member | per-TFM files | per-TFM files, one diff line (`tfm-diff: > public string Net10Only()`) | n/a |

Verdict per candidate:

1. **Public API listing (PublicApiGenerator + Verify): not adopted.** Each mutation the listing catches that the analyzer misses is owned by package validation or by MA0053, except added `[Obsolete]`, which is an intended minor-release act. The listing adds a 130 KB review artefact per TFM, two packages (PublicApiGenerator, Verify) and the rot mode. `csharp-api-evolution-gates` reached the same verdict with a shell golden; this run adds the real tool. If a library has no PublicApiAnalyzers (simple-exec and Spectre.Console use the golden *instead*, [adamralph__simple-exec@f80913246993:tests/Tests/PublicApi.cs:9-16](file:///home/mherwig/.cache/research-lang/exemplars/csharp/adamralph__simple-exec/tests/Tests/PublicApi.cs), [spectreconsole__spectre.console@0de183140529:src/Spectre.Console.Tests/PublicApiTests.cs:7-30](file:///home/mherwig/.cache/research-lang/exemplars/csharp/spectreconsole__spectre.console/src/Spectre.Console.Tests/PublicApiTests.cs)), the golden is a defensible substitute. The ocx SDK has the analyzers.
2. **JSON round-trip / decode snapshot: banned for decoded models.** Verify serialises with null members omitted: the typo'd model's verified file was `{ Name: cmake }` with no `Digest` line at all, run 2 was green, and the non-default assertion `Assert.Equal("sha256:ab12", row.Digest)` failed on both runs (E9). A snapshot written from the actual output cannot tell a bug from a feature. CS-JSON-11 (schema-diff) plus "tests asserting a *non-default* value from a captured payload" (csharp-json class B) is the stronger pair.
3. **Exception-shape snapshot: not needed.** `Verify(ex)` writes `Type`, public properties, `Message` and a `StackTrace` of method names; the stack line for a thrown lambda is the compiler-generated `ExcTests.<>c.<Throws_shape>b__1_0()`, which changes when another lambda is added to the class (E10). With `.IgnoreStackTrace()` the file is stable (`Type`, `ExitCode`, `StderrTail`, `Message`). It pins the message text, but the CS-ERR conformance test and an explicit `DoesNotContain(secret)` assertion are the checks the exit-table and no-secrets rules need. If a project insists, `IgnoreStackTrace()` is mandatory.

Allowed snapshot subjects, for any .NET library (rule 1): generated or rendered multi-line text of at least about 20 lines (help text, generated source, SQL, markdown, a table of argv per verb) where no analyzer or schema test already owns it.

### 8. The rot mode and the guard

The dominant failure is not Verify's design but who presses accept. Verify's own [AI-usage guide](https://raw.githubusercontent.com/VerifyTests/Verify/main/docs/ai-usage.md) tells assistants: if the change is intended, "copy the received file to the `Verified:` path"; "never hand-edit `.verified.*`"; "if a snapshot changes between runs or machines, add a scrubber rather than accepting repeatedly"; and "for large refactors, enable AutoVerify temporarily, then review the diff in source control". That is a good manual protocol and a bad autonomy rule: with no human in the loop, "if the change is intended" is decided by the same agent whose test is red. E2 shows the effect of the last sentence taken literally.

No exemplar guards against it. Cake and Spectre upload `*.received.*` as a CI artefact on failure ([cake-build__cake@08885933e936:build/verify.cake:1-8](file:///home/mherwig/.cache/research-lang/exemplars/csharp/cake-build__cake/build/verify.cake), [spectreconsole__spectre.console@0de183140529:.github/workflows/ci.yaml:36-39](file:///home/mherwig/.cache/research-lang/exemplars/csharp/spectreconsole__spectre.console/.github/workflows/ci.yaml)); none fails the job on a changed verified file. Defence in depth, each layer watched:

1. no `AutoVerify` anywhere (grep, E6 SNAP-4);
2. the git guard after the tests (section 4, E2);
3. `CODEOWNERS` line `*.verified.* @owner` so a human approves every verified-file change (E6 SNAP-9; a configuration check, the approval itself is GitHub's);
4. a project rule that the agent *reports* a verified-file diff and stops: it does not move, copy, rename or edit `*.verified.*` (reading heuristic; no tool can prove the agent did not run `mv`, but layers 2 and 3 make it visible).

Layer 2 does not catch an agent that edits the code *and* the verified file in the same PR, because the guard only protects the CI run, not the PR. Layer 3 does. That asymmetry is why CODEOWNERS is in the list.

### 9. A dependency-free golden helper

If the owner declines Verify's fee, or the suite has fewer than about ten snapshot sites, a 25-line helper replaces it (`golden/Golden.cs`, E8):

```csharp
public static class Golden
{
    public static void Check(string actual, [CallerMemberName] string name = "", string? dir = null)
    {
        var path = Path.Join(dir ?? DirFromMetadata(), name + ".golden.txt");
        actual = actual.Replace("\r\n", "\n");
        if (Environment.GetEnvironmentVariable("OCX_UPDATE_GOLDEN") == "1")
        {
            if (Environment.GetEnvironmentVariable("CI") is { Length: > 0 })
                throw new InvalidOperationException("OCX_UPDATE_GOLDEN is refused when CI is set");
            File.WriteAllText(path, actual, new UTF8Encoding(false)); return;
        }
        if (!File.Exists(path)) throw new XunitException($"missing golden {path}; run locally with OCX_UPDATE_GOLDEN=1 and review the diff");
        var expected = File.ReadAllText(path).Replace("\r\n", "\n");
        if (!string.Equals(expected, actual, StringComparison.Ordinal)) throw new XunitException($"golden mismatch {path}\n--- expected\n{expected}\n--- actual\n{actual}");
    }
}
// csproj: <AssemblyMetadata Include="GoldenDir" Value="$(MSBuildProjectDirectory)/Golden" />
```

Watched: baseline green; `PLANT=1` -> `golden mismatch`; `PLANT=1 OCX_UPDATE_GOLDEN=1 CI=true` -> `OCX_UPDATE_GOLDEN is refused when CI is set`; local update rewrote the golden to `exit-code: 99 (BROKEN)` (so the rot mode remains: the same git guard and CODEOWNERS rules apply, with `*.golden.txt` in place of `*.verified.*`).

**The `[CallerFilePath]` trap.** The obvious implementation locates the golden next to the test source with `[CallerFilePath]`. In a git repo with a remote and `-p:ContinuousIntegrationBuild=true`, the compiler rewrote it to `/_/GoldenTests.cs`; in a plain directory it stayed absolute (E8). Hence the `AssemblyMetadata` route. NodaTime hit the same class of problem with ApprovalTests and switched deterministic source paths off for its test project ([nodatime__nodatime@4dd26f1ddfa7:src/NodaTime.Test/NodaTime.Test.csproj:5-6](file:///home/mherwig/.cache/research-lang/exemplars/csharp/nodatime__nodatime/src/NodaTime.Test/NodaTime.Test.csproj)); `CS-PKG`'s `ContinuousIntegrationBuild` only in CI makes this a CI-only failure, the worst kind. The [MSBuild reference](https://learn.microsoft.com/en-us/dotnet/core/project-sdk/msbuild-props) documents that `ContinuousIntegrationBuild` normalises stored paths.

### 10. Property-based testing: targets that pay

Fixtures in `prop/` use planted bugs that are the *plausible* mistakes, plus 4 example tests an agent would write first (E5):

| Target | Planted bug | Example tests (4 in total, all three targets) | Property |
|---|---|---|---|
| argv across a process boundary (CS-PROC-01) | `psi.Arguments = "exec echo.dll " + string.Join(" ", args)` instead of `ArgumentList` | green: `["install","cmake:3.30"]`, `["--format","json","-v"]` | CsCheck and FsCheck **red** |
| open enum `PackageStatus(string Value)` JSON round-trip (CS-API-05) | reader does `s.Trim().ToLowerInvariant()` "because wire values are lowercase" | green: `installed`, `missing`, `unknown-future` | CsCheck and FsCheck **red** |
| rooted path join never escapes the root (CS-XP-01) | `Path.Combine` plus a `rel.StartsWith("..")` check | green: `a/b`, `../x` refused | CsCheck **red** (counterexample `//..`) |

With the bugs planted the four examples still pass (`total: 4 failed: 0`), CsCheck fails 3/3 and FsCheck 2/2; with the fixed code all properties pass (E5, Linux; Windows all 10 pass fixed and the planted PATH and ARGV bugs fail there too, `e5-win.out`). The same property also confirmed on Windows that .NET's `ArgumentList` quoting round-trips `"`, `\"`, `x\`, empty strings, tabs and `é` through `dotnet exec` (fixed code, 40 CsCheck + 40 FsCheck cases), which no Linux example test can show.

Where properties do **not** pay in this SDK: process lifecycle (kill, drain, timeouts: CS-TEST E1/E3/E7 are scenario tests), retry/backoff (FakeTimeProvider scenarios), anything whose oracle is "what the real ocx prints" (contract tier). "Tolerant JSON binding" (unknown members ignored, known members preserved) fits the same shape but was not built here; the CS-JSON schema-diff test and captured payloads cover the known cases, and the property adds value only for the open-enum converter and any other hand-written converter.

### 11. CsCheck vs FsCheck.Xunit.v3

Both ran green on xunit.v3.mtp-v2 4.0.2 under MTP; FsCheck.Xunit.v3 3.4.0 needs no extra runner setup ([nuget](https://feed.nuget.org/packages/FsCheck.Xunit.v3/3.4.0), `PropertyAttribute` carries `MaxTest`, `Replay`, `Arbitrary`, `QuietOnSuccess`, [RunningTests](https://fscheck.github.io/FsCheck/RunningTests.html)). Observations on the same two properties (E5):

| | CsCheck 4.9.1 | FsCheck.Xunit.v3 3.4.0 |
|---|---|---|
| Hook into the test framework | none: `Gen<T>.Sample(...)` throws `CsCheckException`; works in any runner ([README](https://raw.githubusercontent.com/AnthonyLloyd/CsCheck/master/README.md)) | `[Property]` attribute, `FsCheck.Xunit.v3` package |
| Custom generator | composed `Gen.OneOf(Gen.String[Gen.Char["..."], 0, 6], Gen.OneOfConst(...))`, shrinks for free | `Arb.From(gen)` wrapped in an `Arbitrary` class registered with `Arbitrary = [typeof(X)]`; **no shrinking**; counterexample of a record holding `string[]` printed as `ArgvCase { Args = System.String[] }` and `0 shrinks` |
| Default generators | `Gen.String` printable by default | default `string` includes control characters: the argv property failed *on correct code* with shrunk `NonNull "\000"` (NUL cannot cross argv); `Gen.Elements(alphabet)` fixed it |
| Failure output | `Set seed: "000cIV8jZrni" or -e CsCheck_Seed=000cIV8jZrni to reproduce (4 shrinks, 7 skipped, 40 total).` plus the shrunk input | `Falsifiable, after 3 tests (2 shrinks) (s1,s2).` `Replay directly at failing step with (a,b,size).` plus Original and Shrunk |
| Replay | env `CsCheck_Seed=...` or `seed:`; replays the failing case, then re-shrinks (not always byte-identical) | `[Property(Replay = "a,b,size")]`; byte-identical Original and Shrunk (E5, verified red with bug, green without) |
| Async properties | `SampleAsync`; runs cases in parallel threads | `Task<bool>` property returns work |
| Env knobs | `CsCheck_Iter`, `CsCheck_Time`, `CsCheck_Threads`, `CsCheck_Seed`, ... ([README](https://raw.githubusercontent.com/AnthonyLloyd/CsCheck/master/README.md)); honoured only when the call does not pass `iter:` (observed) | attribute args only |
| Corpus adoption | 0 of 35 | 1 of 35 (Polly: `FsCheck.Xunit.v3 3.4.0`, `[FsCheck.Xunit.Property(Arbitrary = [typeof(Arbitraries)], MaxTest = 10_000)]`, [App-vNext__Polly@e4476096da5b:test/Polly.Core.Tests/Retry/RetryHelperTests.cs:279-307](file:///home/mherwig/.cache/research-lang/exemplars/csharp/App-vNext__Polly/test/Polly.Core.Tests/Retry/RetryHelperTests.cs), `Directory.Packages.props:6`) |

Polly's own guidance is the strongest local precedent: "FsCheck for property-based tests. Use these rather than introducing new libraries" ([App-vNext__Polly@e4476096da5b:.github/instructions/tests.instructions.md:7](file:///home/mherwig/.cache/research-lang/exemplars/csharp/App-vNext__Polly/.github/instructions/tests.instructions.md)). A repo that already has FsCheck keeps it. A greenfield SDK (this one) takes CsCheck: no `Arbitrary` boilerplate to maintain, shrinking by construction, and no attribute that the xUnit v2/v3 split can break. The one risk to flag: CsCheck's README on `master` advertises 5.0.0, NuGet's latest is 4.9.1; pin the NuGet version, not the README.

### 12. Seeds, shrinking, budget

- **Never pin a seed in source.** A pinned seed turns a property into one example. Copy the *shrunk counterexample* into a plain `[Fact]` (`Argv_empty_string_survives`) and keep the property random. CsCheck's shrunk outputs for the planted argv bug were `[]` (a list with one empty-string element: an empty list would have passed), `["]` (one argument that is a double quote) and `[_ -% ]` (one argument with spaces): precisely the cases an example list lacks.
- **CI log must show the seed**: both libraries put it in the exception message, which MTP prints on failure (E5). No extra configuration.
- **Replay semantics differ.** FsCheck `Replay` is exact. CsCheck's seed identifies the failing case; replaying it fails again (8 of 8 replays failed on the bug, the fixed code passed on the same seed) but shrinking runs again and may land on a different minimal input when the printed seed was not already minimal; with `dJsDqIOdXW4a` (minimal) two replays were byte-identical.
- **Budget** (this machine, 4 concurrent CsCheck threads): `Open_enum` and `Path` 100 cases each in about 5 ms; `CsCheck_Iter=200000` on the enum property 0.58 s total; the argv property (40 real process spawns, `explicit iter: 40`) 0.55 s wall, 1.0 s with `CsCheck_Threads=1`; FsCheck argv with 56 shrink steps each spawning a process: 8 s. Rule of thumb in the rules: property tier under 10 s per CI leg, process-spawning properties capped at 40 cases.
- **Raising the nightly**: `CsCheck_Iter=100000` applies to every property that does not hard-code `iter:`; the process-spawning one keeps its explicit cap (observed: `CsCheck_Iter=20000` left the argv property at 40).

### 13. Exemplar census

- Verify (any package) is referenced by 7 of 35 repos: Nuke (35 verified files), Cake (259), Spectre.Console (253), BenchmarkDotNet (47, `Verify.Xunit 31.12.5` at `dotnet__BenchmarkDotNet@61ebda8a50ae:tests/BenchmarkDotNet.Tests/BenchmarkDotNet.Tests.csproj:25`), command-line-api (23), Humanizer (4), testfx (1). `AutoVerify` appears in none, `UniqueForTargetFrameworkAndVersion` in Humanizer only.
- PublicApiGenerator in 4: simple-exec, Spectre.Console, Humanizer, Serilog (`PublicApiGenerator 11.1.0`, [serilog__serilog@bebc7719004f:test/Serilog.ApprovalTests/Serilog.ApprovalTests.csproj:13](file:///home/mherwig/.cache/research-lang/exemplars/csharp/serilog__serilog/test/Serilog.ApprovalTests/Serilog.ApprovalTests.csproj)). NodaTime uses ApprovalTests for an XML schema. Not found in xunit, MessagePack-CSharp, Dapper, octokit.net for snapshots or property tests (grep over `*.cs *.csproj *.props *.yml`).
- `.gitignore` for received files: `*.received.*` (Humanizer `:107`, Spectre `:96`), `*.received` (Cake `:100`), `*.received.txt` (Nuke `:58`).
- Property tests: Polly only. Polly also shows the pseudo-property anti-pattern that agents imitate: a seeded `new Random(0).NextDouble` field ([RetryHelperTests.cs:13](file:///home/mherwig/.cache/research-lang/exemplars/csharp/App-vNext__Polly/test/Polly.Core.Tests/Retry/RetryHelperTests.cs)): deterministic, so no shrinking, no new inputs after the first run.
- Zero exemplars have a CI step that fails when a verified file changed (grep `\.verified\.|\.received\.` over workflows and build scripts finds only the artefact-upload steps above).

### 14. Verified on the toolchain

Fixture root: `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-testing-snapshots-and-property/`. Build and run from inside it with `/home/mherwig/.cache/research-lang/dotnet-tools/run.sh` (SDK 10.0.401 via the parent `global.json`; `test.runner = Microsoft.Testing.Platform`). Packages: xunit.v3.mtp-v2 4.0.2, Verify.XunitV3 32.0.0 (and 33.3.3 in `fee/`), PublicApiGenerator 11.5.4, Microsoft.CodeAnalysis.PublicApiAnalyzers 5.6.0, CsCheck 4.9.1, FsCheck.Xunit.v3 3.4.0, DiffEngine 20.8.1 (transitive). `./run-all.sh` regenerates `evidence.txt` (Linux); Windows steps are `e1-win.sh`, `e3-win.cmd`, and `prop-e5/run.cmd` under `C:\Users\ecom\csharp-wintest\` (SDK 10.0.102, outputs `e1-win.out`, `e3.out`, `e5-win.out`). Every experiment below was watched red then green.

| # | Experiment (script) | Command | RED observed | GREEN observed |
|---|---|---|---|---|
| E1 | temp path + timestamp + machine name in a snapshot (`e1-scrub.sh`) | `dotnet exec snap/bin/Debug/net10.0/snap.dll --filter-class RedTests` x3 | run 2 and 3: `failed ... NotEqual: Message: installed on Workstation at 2026-10-10T23:37:17...` vs `...23:37:16...` | `GreenTests` run 2, 3: `failed: 0 succeeded: 1`; verified shows `TheMachineName at DateTime_1 (run Guid_1) as {User}` |
| E1-win | the Linux verified files on the Windows host (`e1-win.sh`) | `snap.exe --filter-class RedTests` / `GreenTests` | Red: `InstalledTo: {UserProfile}.ocx\packages\cmake` vs `/`; `WORKSTATION` vs `Workstation`; `ecom` vs `mherwig`; `failed: 1` | Green: `failed: 0 succeeded: 1` |
| E2 | AutoVerify under CI, planted regression (`e2-autoverify.sh`) | `AUTOV=unguarded GITHUB_ACTION=run1 PLANT=1 dotnet exec ...` | `failed: 0 succeeded: 1 | verified file: exit-code: 99 (BROKEN)`; `GUARD: FAIL (verified file modified: 1 file changed, 1 insertion(+), 1 deletion(-))` | no AutoVerify + `CI=true`: `failed: 1 succeeded: 0 | verified file: exit-code: 75`; `GUARD: ok` |
| E3 | CRLF checkout on Windows (`e3-win.cmd`) | `git config core.autocrlf true` ... `dotnet test --filter-class GreenTests` | `size=246 cr_count=10`; `VerifiedLineEndingException : Verified file must use \n line endings, but it contains a \r` ; `failed: 1` | with `*.verified.* text eol=lf`: `size=236 cr_count=0`; `succeeded: 1` |
| E4 | API listing vs analyzer, 5 mutations x 2 TFMs (`e4-api.sh`) | `dotnet build Lib -p:Mut=M2` / `dotnet exec Tests/bin/Debug/<tfm>/Tests.dll` | table in section 7: analyzer clean for M2..M5, listing red for all five | baseline: `snapshot test fails? 0`; files `...DotNet8_0.verified.txt`, `...DotNet10_0.verified.txt`; tfm-diff one line |
| E4b | no `UniqueFor...` in a multi-TFM project (`e4b-nounique.sh`) | rename received->verified; then correct accept | rename: still `failed: 1`, `Verified: NoUniqueTest.Approve_without_unique.verified.txt`; correct accept: net8.0 `failed: 1` | `UniqueForTargetFrameworkAndVersion` baseline in E4: both TFMs green |
| E5 | examples vs properties (`e5-prop.sh`) | `PLANT_ARGV=1 PLANT_ENUM=1 PLANT_PATH=1 dotnet exec prop/bin/Debug/net10.0/prop.dll --filter-class CsCheckTests` | examples: `total: 4 failed: 0`; CsCheck: `failed: 3` with `Set seed: "000cIV8jZrni" ...`; FsCheck: `failed: 2` with `Replay directly at failing step with (9897186388217785948,4253599083491567065,7)` | fixed code: examples 4/4, CsCheck 3/3, FsCheck 2/2; Windows fixed: `total: 10 failed: 0 succeeded: 10 duration: 3s 824ms` |
| E5 replay | seed replay | `CsCheck_Seed=000cBkJIheae PLANT_ARGV=1 ...` / `[Property(Replay="458144922758760499,4195251678885750905,5")]` | CsCheck 8/8 replays fail; FsCheck replay: `Falsifiable, after 1 test (3 shrinks)` | same seed on fixed code: `succeeded: 1`; FsCheck `PLANT_ENUM=0`: `succeeded: 1` |
| E6 | nine reviewer greps on three trees (`e6-guards.sh`) | rules 2, 4, 6, 7, 9, 11, 13 | bad tree: 9/9 `FLAG` | good and good2 trees: 9/9 `ok` |
| E7 | Verify fee (`e7-fee.sh`) | `dotnet build` in `fee/` | 33.3.3 bare: `exit=1 SponsorCheck error SC021`; expired exemption: `exit=1 SC049`; `LicenseIgnored` + `-warnaserror`: `exit 1` | 32.0.0 bare: `exit=0`; 33.3.3 + OpenSource until 2027-09: `exit=0` |
| E8 | golden helper (`e8-golden.sh`) | `PLANT=1 ... --filter-method *Exit_text` | `golden mismatch`; `OCX_UPDATE_GOLDEN is refused when CI is set`; `CALLERPATH=/_/GoldenTests.cs` in a git repo with remote | baseline `succeeded: 1`; CI build still `succeeded: 1` via AssemblyMetadata |
| E9 | snapshot of a mis-bound DTO (`e9-baked.sh`) | accept received, rerun | assertion twin: `failed` on run 1 and 2 | snapshot twin: run 2 `failed: 1 succeeded: 1` (green with the bug; verified file `{ Name: cmake }`) |
| E10 | exception snapshot (`e10-exc.sh`) | `Verifier.Verify(ex)` | `StackTrace: at ExcTests.<>c.<Throws_shape>b__1_0()` | `.IgnoreStackTrace()`: no StackTrace line |
| AI | hallucinated `[UsesVerify]` | `dotnet build` with the attribute | `error CS0246: The type or namespace name 'UsesVerifyAttribute' could not be found` | removed: `Build succeeded` |

Pair count: 27 planted/fixed pairs watched: E1 1, E1-win 1, E2 1, E3 1, E4 1, E4b 1, E5 properties 5 (argv x2 libraries, enum x2, path x1), E5 replay 2, E6 9 checks, E7 2 (SC021, SC049), E8 2 (mismatch, CI refusal), E9 1 (inverted: the snapshot stays green with the bug), E10 1 (stack trace vs `IgnoreStackTrace`), AI compile check 1 (`[UsesVerify]`); the E1 to E10 rows above are the same pairs grouped.

## Normative guidance candidates

IDs are provisional (`SNAP-n`, `PROP-n`); the consolidator renumbers into CS-TEST-09+.

1. **SNAP-1: Do not add a snapshot library unless a test would otherwise assert at least about 20 lines of multi-line text that no analyzer or schema test owns.** Rationale: the SDK's three candidate uses are covered by CS-API/CS-JSON gates (section 7), and each dependency adds the accept button. Verify: reading heuristic on the PR: `grep -rn --include='*.csproj' --include='Directory.Packages.props' -e 'Verify\.' -e 'PublicApiGenerator' .` lists every snapshot dependency; each must be justified in the PR description by a multi-line generated-text site.
2. **SNAP-2: Do not snapshot (a) a public API listing in a library that has PublicApiAnalyzers, (b) a decoded JSON model, (c) an exception.** Rationale: E4, E9, E10: redundant, bakes bugs, or brittle. Verify: `if ls src/*/PublicAPI.Shipped.txt >/dev/null 2>&1; then ! grep -rl --include='*.cs' -e GeneratePublicApi tests/; fi` (no listing test where analyzer files exist; E6 bad FLAG, good ok); `! grep -rnE --include='*.cs' -e 'Verify\(.*(Deserialize|Decode)' tests/`; `grep -rlE --include='*.cs' -e 'Verifier\.Verify\((ex|exception)\)' tests/ | xargs -r grep -L IgnoreStackTrace` prints nothing.
3. **SNAP-3: Verify 33 and later requires exactly one `Verify_*` declaration in `Directory.Build.props`; otherwise pin `Verify.XunitV3` to 32.0.0.** The declaration choice is the owner's. Never use `Verify_SponsorshipLicenseIgnored`. Put the expiry month in the PR checklist. Rationale: SC021/SC049 (E7). Verify: `dotnet build` exits 0; `grep -rnE --include='Directory.Build.props' -e 'Verify_(GitHubSponsorAccount|SponsorshipExemption|SponsorshipLicensedUntil)' .` has one hit when a Verify 33+ reference exists, or `grep -nE 'Include="Verify\.[A-Za-z0-9]+" Version="32\.0\.0"' Directory.Packages.props` does; `! grep -rn --include='*.props' --include='*.csproj' -e 'Verify_SponsorshipLicenseIgnored' .`.
4. **SNAP-4: Ban `AutoVerify` in every form.** Rationale: E2 RED 1/2: passes a planted regression and rewrites the verified file; `includeBuildServer: false` only works on CIs the detector knows. Verify: `! grep -rnE --include='*.cs' -e '\bAutoVerify\b' tests/` (watched: E6 SNAP-4 bad FLAG, good ok).
5. **SNAP-5: CI runs the verified-file guard immediately after the test step, on every leg.** Rationale: it is the only check that sees a rewritten verified file (E2). Verify: the workflow contains the three-line guard from section 4 or equivalent: `grep -rn --include='*.yml' -e "git diff --exit-code -- '\*.verified" .github/workflows/` returns a hit located after the `dotnet test` step (reading heuristic on order).
6. **SNAP-6: `.gitignore` contains `*.received.*`; no received file is tracked.** Rationale: E6. Verify: `grep -qxF '*.received.*' .gitignore` and `test -z "$(git ls-files '*.received.*')"`.
7. **SNAP-7: `.gitattributes` pins `eol=lf` for every text verified/golden file; binaries are `binary`.** Rationale: E3 (`VerifiedLineEndingException` on Windows with autocrlf). Verify: `git ls-files -z -- '*.verified.txt' '*.verified.json' '*.verified.xml' '*.verified.md' | xargs -0 -r git check-attr eol | grep -v 'eol: lf'` prints nothing; `git ls-files -z '*.verified.*' | xargs -0 -r grep -lU $'\r'` prints nothing (E6 SNAP-7).
8. **SNAP-8: Do not set `FixNewlinesOnRead()` or `IgnoreTrailingNewline()`.** Rationale: they hide a misconfigured checkout (newline-tolerance.md). Verify: `! grep -rnE --include='*.cs' -e 'FixNewlinesOnRead|IgnoreTrailingNewline' tests/`.
9. **SNAP-9: The agent never moves, copies, renames or edits a `*.verified.*` / `*.golden.txt` file.** It reports the received-vs-verified diff to the owner and stops. Rationale: section 8, E4b (a rename produces a never-read file), E2. Verify: `CODEOWNERS` has a line for the pattern: `grep -qE '^\*\.verified\.\* +@' .github/CODEOWNERS`; PR heuristic: `git diff --name-only origin/main...HEAD -- '*.verified.*' '*.golden.txt'` non-empty requires an explicit owner approval before merge.
10. **SNAP-10: Keep absolute paths, user/host names and clocks out of the snapshotted object; if unavoidable, register scrubbers in reverse of the wanted order and add `ScrubInlineGuids`, `ScrubInlineDateTimes(format)`, `ScrubMachineName`, separator normalisation.** Rationale: E1 order trap (`/home/{User}`; `{Home}/AppData/Local/Temp`). Verify: run the snapshot tests twice with no change (`git status --porcelain -- '*.verified.*' '*.received.*'` empty and both runs green), and the CS-CI matrix runs them on Linux and Windows legs: the leg that fails is the proof.
11. **SNAP-11: Multi-targeted listings call `.UniqueForTargetFrameworkAndVersion()`; when a snapshot is accepted, the target path is the `Verified:` line of the failure, never a rename of the received file.** Rationale: E4b. Verify: `grep -rl --include='*.cs' -e GeneratePublicApi tests/ | xargs -r grep -L UniqueForTargetFrameworkAndVersion` prints nothing (E6 SNAP-11).
12. **SNAP-12: Set `DiffEngine_Disabled=true` and `Verify_DisableClipboard=true` as workflow `env:`; do not rely on `Detected`.** Rationale: DiffEngine reads `GITHUB_ACTION`, not `CI`/`GITHUB_ACTIONS`, and 20.8.1 treats WSL as CI (section 4). Verify: `grep -rn --include='*.yml' -e 'DiffEngine_Disabled' -e 'Verify_DisableClipboard' .github/workflows/` shows both.
13. **SNAP-13: Exception snapshots (if used despite SNAP-2) call `.IgnoreStackTrace()`.** Rationale: compiler-generated lambda names (E10). Verify: the last command in SNAP-2.
14. **SNAP-14: A golden helper (Verify declined) takes its directory from `AssemblyMetadata`, normalises CRLF, compares ordinal, fails on a missing file, and refuses update mode when `CI` is set.** Rationale: `[CallerFilePath]` becomes `/_/...` in CI builds in a git repo (E8). Verify: `! grep -rn --include='*.cs' -e CallerFilePath tests/`; `grep -rn --include='*.csproj' -e AssemblyMetadata tests/` has a hit; the helper's own tests include the CI-refusal case (E8).
15. **PROP-1: Use property tests for round-trip codecs, containment invariants and tolerant converters; use scenario tests for process lifecycle, time and anything whose oracle is the real ocx.** Rationale: section 10. Verify: reading heuristic: each property states its law in a one-line comment (`// law: Parse(Format(x)) == x`).
16. **PROP-2: The default property library is CsCheck, pinned in `Directory.Packages.props`; a repo that already has FsCheck.Xunit.v3 keeps it and adds no second library.** Rationale: section 11. Verify: `grep -rhoE --include='Directory.Packages.props' -e 'Include="(CsCheck|FsCheck[A-Za-z.0-9]*|Hedgehog[A-Za-z.]*)"' . | sort -u | wc -l` prints at most 1 (watched: 1 with CsCheck alone, 2 with CsCheck + FsCheck.Xunit.v3).
17. **PROP-3: Do not pin a seed or a replay value in committed tests; copy a shrunk counterexample into a plain `[Fact]`.** Rationale: a pinned seed is one example (section 12). Verify: `! grep -rnE --include='*.cs' -e 'seed:' -e 'Replay *=' -e 'CsCheck_Seed' tests/` (the FsCheck replay fixture class in `prop/` exists only to demonstrate replay).
18. **PROP-4: Generators exclude values the boundary cannot carry (NUL, lone surrogates, characters illegal in the target file name) and never rely on FsCheck's default `string`.** Rationale: E5 (`NonNull "\000"` failed correct code). Verify: reading heuristic: any `string` parameter on a `[Property]` or any `Gen.String` without a char generator feeding a process or file boundary is a finding; `grep -rnE --include='*.cs' -e '\[Property' -A2 tests/ | grep -E 'string '`.
19. **PROP-5: Property oracles are platform-neutral: build roots from `Path.GetTempPath()`, compare with `OperatingSystem`-chosen `StringComparison`, never `"/srv/..."` literals.** Rationale: E5 Windows (correct code failed a POSIX oracle). Verify: `! grep -rnE --include='*.cs' -e '"/(srv|tmp|home|etc)/' tests/` plus the Windows CI legs.
20. **PROP-6: Process-spawning properties carry an explicit `iter:` of at most 40; pure properties leave `iter:` unset so `CsCheck_Iter` can raise them; the property tier stays under 10 s per leg.** Rationale: E5 budget. Verify: reading heuristic: every property whose body reaches `Process.Start`/the process engine passes `iter:` (`grep -rn --include='*.cs' -e 'iter:' tests/` lists them); the MTP summary `duration:` line of the property project stays under 10 s.
21. **PROP-7: No hand-rolled property loops.** `new Random(<literal>)` driving a `for` loop in a test is an example test with extra steps: no shrinking, no new inputs. Rationale: Polly `RetryHelperTests.cs:13`. Verify: `grep -rnE --include='*.cs' -e 'new Random\([0-9]+\)' tests/` hits are reviewed; each is either a documented stub or replaced by a property.
22. **PROP-8: A failing property is reported with its printed seed (CsCheck `Set seed: "..."`) or replay triple (FsCheck), the shrunk input, and the fix commit adds the shrunk input as an example test.** Rationale: closes the loop and makes the seed unnecessary later. Verify: reading heuristic on the PR: the diff adds a `[Fact]` with the counterexample.

## AI-agent angle

| What an LLM characteristically gets wrong | Smallest mechanical check |
|---|---|
| Presses accept: `mv X.received.txt X.verified.txt`, or hand-edits the verified file, to turn a red test green (Verify's own guide says to accept "if intended"). | CODEOWNERS on `*.verified.*` + CI git guard (SNAP-5, SNAP-9); E2/E6. |
| Adds `VerifierSettings.AutoVerify()` "to bootstrap snapshots", or `includeBuildServer: false` believing it makes CI safe. | `! grep -rnE --include='*.cs' -e '\bAutoVerify\b' tests/` (SNAP-4). |
| Derives the verified name from the received name; in a multi-TFM project the file is never read and the test stays red. | SNAP-11; E4b. |
| Adds `Verify.XunitV3` from NuGet (33.x) and hits `SC021`, then adds `Verify_SponsorshipLicenseIgnored=true` or downgrades silently. | `dotnet build` exit code; SNAP-3 greps. |
| Writes `[UsesVerify]`, `Verify.Xunit` with xunit.v3, `VerifyChecks.Run()` (xUnit v2 era). | Compiler: `CS0246 UsesVerifyAttribute` (E-AI); `grep -rn --include='*.csproj' -e 'Verify.Xunit"' .` should only match `Verify.XunitV3`. |
| Snapshots a decoded DTO "to prove the mapping"; the snapshot omits null members and records the bug. | SNAP-2 grep; assert a non-default value (E9). |
| Snapshots an exception with its stack trace or `ToString()`, or a model with a timestamp, temp path or machine name; accepts the first run; second run fails or Windows fails. | Run twice + two-OS legs (SNAP-10); `IgnoreStackTrace` grep (SNAP-13). |
| Registers scrubbers in reading order and gets `/home/{User}` or swallows `{TempPath}`. | The second-leg Windows run; prefer no absolute paths in the object (SNAP-10). |
| Builds a golden helper on `[CallerFilePath]`; green locally, `FileNotFound` under `ContinuousIntegrationBuild`. | SNAP-14 grep; E8. |
| Uses FsCheck's default `string` for argv or file names; the property fails on correct code with NUL; the agent "fixes" by weakening the property (`Where(s => s.Length < 3)`). | PROP-4 heuristic: any `Where(` on a generator in a property needs a comment; shrunk `\000`/`\ud800` in a CI log means a bad generator, not a bug. |
| Pins a seed (`seed: "..."`, `Replay = "..."`) in committed code. | PROP-3 grep. |
| Writes `FsCheck.Xunit` (v2) with xunit.v3 or `CsCheck` with `[Property]` (an FsCheck attribute). | Compiler/package restore; package name `FsCheck.Xunit.v3`. |
| Hard-codes `iter: 100000` on a process-spawning property, or `MaxTest = 1_000_000`. | PROP-6 grep + `duration:` line. |
| Uses a POSIX literal root in a path oracle; green on Linux, red on Windows. | PROP-5 grep + Windows leg. |

## Contested / evolving

- **Who may accept a snapshot.** Verify's guide (2026-10, `main`) tells agents to accept intended changes and even to use AutoVerify temporarily for refactors; this file bans both for autonomous agents. Trend: upstream is writing agent skills (`.claude/skills/SKILL.md` is its recommended setup, ai-usage.md) and inline snapshots (`.Snapshot(...)`, "currently in 32.0.0-beta") that put the expected text next to the code; neither adds a guard. Revisit if Verify ships a CI-refusal switch.
- **Verify's licensing.** As of 2026-09-01 (v33) the build checks sponsorship; the fee text, price tiers and exemption windows are the maintainers' and may change monthly. Practice trend: fee-ware drift in .NET test tooling, which is why the dependency-free golden (section 9) is a first-class option rather than a fallback. Owner decides.
- **DiffEngine CI detection.** `main` excludes WSL from `Detected`, the shipped 20.8.1 includes it; `CI=true` and `GITHUB_ACTIONS` are still not read. Expect convergence; do not depend on it (SNAP-12).
- **Dangling snapshots** are `[Experimental("VerifyDanglingSnapshots")]` and per-TFM manifests live in `obj/`; promising for the "orphaned verified file" problem, untested here.
- **Property libraries.** FsCheck 3.4.0 is maintained and has an xunit.v3 package; CsCheck's `master` README claims 5.0.0 while NuGet shows 4.9.1; neither has meaningful corpus adoption (1/35, 0/35). The recommendation to prefer CsCheck rests on measured ergonomics (shrinking by construction, no `Arbitrary` classes), not on adoption.
- **Public API snapshots vs analyzers.** The corpus is split (Humanizer, Spectre, Serilog, simple-exec use listings; Polly and Azure use analyzers per `csharp-api-evolution-gates`). The direction of travel in this program is analyzers + package validation; listings stay as an optional review aid.
- **.NET 11 / C# 15.** No finding specific to it; nothing here ran on SDK 11.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://raw.githubusercontent.com/VerifyTests/Verify/main/readme.md | Verify readme: received/verified model, `.gitignore` and `.gitattributes` guidance, BOM/LF rules | main, 2026-10 | Source of the committed-file rules |
| https://github.com/VerifyTests/Verify/blob/main/docs/autoverify.md | AutoVerify API and build-server note | main, 2026-10 | `includeBuildServer`, applies to CI by default |
| https://raw.githubusercontent.com/VerifyTests/Verify/main/docs/maintenance-fee.md | Open Source Maintenance Fee, SponsorCheck, property names | v33, after 2026-09-01 | The build-time gate (SC021) |
| https://raw.githubusercontent.com/SimonCropp/SponsorCheck/main/docs/VerifierDiagnosticCodes.md | SC021..SC028 table | 2026 | What each failure means |
| https://raw.githubusercontent.com/VerifyTests/Verify/main/docs/ai-usage.md | Verify's guidance for AI assistants | main, 2026-10 | Upstream's accept protocol, scrubber-over-accept rule |
| https://raw.githubusercontent.com/VerifyTests/Verify/main/docs/naming.md | File naming, `UniqueFor*`, received-vs-multi-target | main | Per-TFM names |
| https://raw.githubusercontent.com/VerifyTests/Verify/main/docs/scrubbers.md | Built-in directory scrubbers and APIs | main | What is automatic |
| https://raw.githubusercontent.com/VerifyTests/Verify/main/docs/guids.md and https://raw.githubusercontent.com/VerifyTests/Verify/main/docs/dates.md | Guid and date scrubbing | main | Typed vs inline scrubbing |
| https://raw.githubusercontent.com/VerifyTests/Verify/main/docs/newline-tolerance.md | CR rejection, `FixNewlinesOnRead`, `IgnoreTrailingNewline` | main | Line-ending behaviour |
| https://github.com/VerifyTests/Verify/blob/main/docs/build-server.md and https://github.com/VerifyTests/Verify/blob/main/docs/clipboard.md | CI artefact upload; `Verify_DisableClipboard` | main | CI setup |
| https://github.com/VerifyTests/Verify/blob/main/docs/dangling-files.md | Dangling snapshot check, per-TFM manifests | main, experimental | Orphaned verified files |
| Verify@cfebdbf28b5e (git clone, 2026-10-10): src/Verify/VerifierSettings.cs:43-52; src/Verify/Serialization/Scrubbers/VerifySettings_InstanceScrubbers.cs:68-73; src/Verify/Compare/Comparer.cs:15-30 | Real source | 2026-10-10 | Scrubber order, AutoVerify gate, CR rejection |
| https://raw.githubusercontent.com/VerifyTests/DiffEngine/main/readme.md and DiffEngine@87463acbf21d:src/DiffEngine/BuildServerDetector.cs, AiCliDetector.cs | DiffEngine docs and source | main, 2026-10-10 | Exact CI variables, WSL, AI CLI detection |
| https://raw.githubusercontent.com/AnthonyLloyd/CsCheck/master/README.md | CsCheck README: `Gen`, `Sample`, seed format, env vars | master (claims 5.0.0; NuGet 4.9.1) | Seed and shrink semantics |
| https://fscheck.github.io/FsCheck/ and https://fscheck.github.io/FsCheck/RunningTests.html | FsCheck docs: replay, `PropertyAttribute`, shrinking | 3.x | `Replay = "a,b,size"`; `Arb.fromGen` has no shrinking |
| https://feed.nuget.org/packages/FsCheck.Xunit.v3/3.4.0 | FsCheck.Xunit.v3 package page | 3.4.0 | v3 integration, `MaxTest` |
| https://github.com/PublicApiGenerator/PublicApiGenerator | PublicApiGenerator README | 11.5.x | Verify pairing, TFM note |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/package-validation/overview | Package validation overview | .NET 10 docs | What the binary gate covers |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/diagnostic-ids | CP/PKV diagnostic IDs (CP0007, CP0009, CP0014-16) | updated 2025-12 | Maps listing mutations to ApiCompat rules |
| https://learn.microsoft.com/en-us/dotnet/core/project-sdk/msbuild-props | MSBuild reference: `ContinuousIntegrationBuild` | .NET 10 docs | Path normalisation in CI builds |
| Exemplars: Humanizr__Humanizer@4574b93883bf, nuke-build__nuke@27e8077b8ab0, cake-build__cake@08885933e936, spectreconsole__spectre.console@0de183140529, adamralph__simple-exec@f80913246993, App-vNext__Polly@e4476096da5b, nodatime__nodatime@4dd26f1ddfa7, serilog__serilog@bebc7719004f, dotnet__BenchmarkDotNet@61ebda8a50ae (`/home/mherwig/.cache/research-lang/exemplars/csharp/`) | Real test projects | 2026-10 | Practice census; no CI guard exists |
| `/home/mherwig/dev/grimoire-lore/.agents/worktrees/csharp/.agents/research/csharp-api/csharp-api-evolution-gates.md`, `csharp-api.md`, `csharp-json.md`, `csharp-crossplatform.md` | Sibling findings this file defers to | 2026-10-11 | Gates the snapshot uses are measured against |
| `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-testing-snapshots-and-property/` (`evidence.txt`, `e1-win.out`, `e3.out`, `e5-win.out`) | The fixtures and raw outputs behind section 14 | 2026-10-11 | Reproduce every red and green |
