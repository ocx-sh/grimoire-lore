---
title: "Behavioural compatibility of a CLI-wrapping SDK: a table-driven failure-mode suite, run against the previous release, and the SemVer weight of each change"
topic: csharp-api-behavioral-compat
agent: deep-dive researcher (group csharp-api, revision wave)
model: sonnet (claude-sonnet-5-5)
date_researched: 2026-10-11
sources_count: 34
scope: |
  Covers: the gap that PublicApiAnalyzers and package validation leave (what an SDK throws, returns and populates), the SemVer weight of each kind of
  behavioural change, the data shape, location and mandatory rows of one behaviour table, how that table runs against the last published nupkg in the same
  `dotnet test` invocation, explicit assertions versus Verify snapshots, and how the suite relates to the Ocx.Fake tier (CS-TEST-02/04) and the real-ocx
  contract tier (CS-TEST-07). C# 14 / .NET 10 SDK 10.0.401, net8.0 floor, xUnit v3 4.0.2 on Microsoft.Testing.Platform.
  Not covered: process mechanics (pumps, caps, kill), JSON binding internals, exit-table content, packaging metadata. Windows, arm64, macOS and
  ocx main (only ocx 0.6.5 was installed) were NOT run; .NET 11 RC1 was not exercised. The fixture engine is a toy: the table, not the engine, is the subject.
---

# Behavioural compatibility of a CLI-wrapping SDK

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The gap: what the two API gates cannot see](#1-the-gap-what-the-two-api-gates-cannot-see)
   2. [What counts as a break: Microsoft's rules mapped onto the SDK](#2-what-counts-as-a-break-microsofts-rules-mapped-onto-the-sdk)
   3. [The SemVer weight of each change kind](#3-the-semver-weight-of-each-change-kind)
   4. [The table: data shape and location](#4-the-table-data-shape-and-location)
   5. [The mandatory rows](#5-the-mandatory-rows)
   6. [Explicit asserts versus a Verify snapshot](#6-explicit-asserts-versus-a-verify-snapshot)
   7. [Running the same table against the previous release](#7-running-the-same-table-against-the-previous-release)
   8. [Relation to FakeCliTests and the real-ocx contract tier](#8-relation-to-fakeclitests-and-the-real-ocx-contract-tier)
   9. [Release flow: bump derivation and the dotnet-release steps](#9-release-flow-bump-derivation-and-the-dotnet-release-steps)
   10. [What the exemplars do](#10-what-the-exemplars-do)
   11. [Verified on the toolchain](#11-verified-on-the-toolchain)
   12. [Not verified](#12-not-verified)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- **Package validation and PublicApiAnalyzers are blind to behaviour.** Five planted behaviour changes (a leaked BCL exception, a nulled property, a failure turned into a result, a result turned into a throw, cancel reported as timeout) all packed with exit 0, no CP*/RS* diagnostic, and baseline 1.0.0 validation on. The same two gates went red the moment the API surface changed (CP0002, RS0016). So green means blind, not off (section 11).
- **Keep one behaviour table as data**, `tests/Ocx.Sdk.BehaviorTests/behavior-table.json`, one row per promised outcome. It is the SDK's behavioural contract; a code review of it is a review of the contract.
- **Assert catch semantics, not exact types and not messages.** A row says which `catch` clauses fire (`type`, `catchAs`) and which must not (`notCatchAs`). This encodes Microsoft's "throwing a more derived exception is allowed" and "changing the text of an error message is allowed" directly, and it is the only form that stays green on both.
- **Only listed properties are read.** An added property can never fail a row; a removed or nulled one always does. Pin `null` only where null is a promise.
- **Run the same table twice in one `dotnet test --solution`:** once against the source (`ProjectReference`), once against the last published nupkg (`PackageReference` at the same version as `PackageValidationBaselineVersion`). The second project is a small csproj (25 lines with the fake-copy target) that globs the first project's sources. Measured: 1.9 s of test time, 5.1 s from an empty package cache (restore, build and run, two projects, 32-core WSL2).
- **A baseline run must prove it ran the package.** Without a guard a mis-wired baseline silently tests the source twice. A single assembly-metadata attribute plus one test makes that red (the baseline DLL is byte-identical to the nupkg's, sha256 checked).
- **The restored package is cached by version.** Repacking the same version leaves the old DLL in the global packages folder; the baseline run stayed green on a package that was red until `ocx.sdk` was evicted. CI has no NuGet cache (CS-BUILD-27), so this bites locally and in agent sandboxes.
- **SemVer weight follows one question:** does some input that used to produce outcome X (a catch that fires, a return branch taken, a property value) now produce Y? Yes means MAJOR at >=1.0. New members, new rows for new paths, and message text are MINOR or PATCH. CS-API-14's API-only table is incomplete; add the behaviour signal (section 9).
- **An additive API plus a behaviour change is still MAJOR.** A new sealed leaf thrown for exit 75 passed pack (API only grew) and failed the table; the table passed only after the row carried a `supersedes` block. This is the case CS-API-14's "added lines only = minor" gets wrong.
- **The agent failure mode is editing the table to go green.** `check-table-diff.sh` (jq, 11 lines) fails a PR that deletes a row, changes `expect`/`since`/`op`/`os`/`argv`/`setup` of an existing row, or raises `since`, unless the row gains `supersedes`. Watched red x3, green x3.
- **Do not snapshot exceptions in this suite.** A Verify snapshot of the exception went red on the allowed change (new property plus new message text) and stayed green on four of five breaking changes, because a snapshot only covers the scenarios it contains. This agrees with SNAP-2(c) of the snapshots sibling.
- **One table, three tiers.** Rows run against Ocx.Fake on every leg; rows with a `contract` block also run against the real ocx when `OCX_SDK_CONTRACT=1`, with a props subset the real binary can satisfy. Armed with no binary is red (watched), not skipped. Real ocx 0.6.5 satisfied the `cmd-usage` row (exit 64, `UsageError`).
- **Launch the fake through the public explicit-path option, not an internal seam.** The suite must compile and run against the previous release, which has no new internals. A post-build `Copy` puts the fake's apphost beside the tests as `ocx`/`ocx.exe`, the name the resolver accepts, and still finds `Ocx.Fake.dll`.
- **Filter rows by `since`; do not skip them.** A row newer than the SDK under test is not yielded, and `--minimum-expected-tests` counts what remains. A bad `since` on every row gives xUnit's "No data found" (red); deleting one row gives the `Mandatory_rows_are_present` failure (red).
- **`supersedes` is the behavioural twin of `CompatibilitySuppressions.xml`.** It carries the old expectation for baselines older than the break, and is deleted when the baseline is bumped past it (CS-API-15 step 4).
- **Exemplars pin exceptions only in-process or against a live service.** None of the five requested exemplars (and no clone inspected) runs an exception test against its own previous nupkg; Polly, Stripe and vs-threading set `PackageValidationBaselineVersion`, which is API-only. Azure.Core ships exception-type changes in minor releases and labels them in the changelog.
- **Run it on every PR leg.** At 2-5 s it needs no release-only job; R4's existing `dotnet test` covers it once the Baseline project is in the solution, which R13 adds with the baseline bump.

## Findings

### 1. The gap: what the two API gates cannot see

**What the documentation says they check.** Package validation "validates that there are no breaking changes across versions", that the package "has the same set of public APIs for all the different runtime-specific implementations", and "catches any applicability holes" ([package validation overview](https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/package-validation/overview)). The baseline validator's worked example is a removed method signature, error `CP0002` ([baseline validator](https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/package-validation/baseline-version-validator)). The ApiCompat page frames the whole tool family as comparing "versions built for different target frameworks" and "a newer version against a baseline version" at assembly/package level ([API compatibility tools](https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/overview)). None of the three mentions runtime behaviour. Microsoft's own compatibility taxonomy lists "behavioral change" as a separate category from binary and source compatibility, and its first example is "a method may throw a different exception" ([compatibility categories](https://learn.microsoft.com/en-us/dotnet/core/compatibility/categories)).

**What the fixtures show.** Five candidate releases that change only what a caller observes, with the public API byte-identical to 1.0.0, were packed with `EnablePackageValidation=true`, `PackageValidationBaselineVersion=1.0.0` (resolved from a local folder feed) and `Microsoft.CodeAnalysis.PublicApiAnalyzers` 5.6.0 under `TreatWarningsAsErrors`. All five: `pack exit=0`, no RS/CP diagnostic. Two controls prove the gates were armed: a removed member gives `error CP0002: Member 'bool Ocx.Sdk.OcxCommandException.IsTransient.get' exists on [Baseline] lib/net10.0/Ocx.Sdk.dll but not on lib/net10.0/Ocx.Sdk.dll`, and an unlisted new member gives `error RS0016: Symbol 'Ocx.Sdk.OcxCommandException.Hint.get -> string?' is not part of the declared public API`. The table (section 4) failed on exactly the planted row of each of the five. Full output in section 11.

**What the types do see.** A change of base type is API surface: the snapshots sibling measured `OcxException` to `Exception` as clean under PublicApiAnalyzers and `CP0007` under package validation ([csharp-testing-snapshots-and-property.md:185](csharp-testing/csharp-testing-snapshots-and-property.md)). What the gates cannot see is *which* type is thrown at run time, *whether* it throws at all, and *what value* a property holds.

**Why it matters for this SDK in particular.** The SDK's consumers branch on `catch (OcxCommandException e) when (e.ExitCode...)`, on `ChildExit` being data, and on `OperationCanceledException` versus `OcxTimeoutException` (CS-ERR-02/03/05, CS-ASYNC-08). Framework Design Guidelines are explicit that thrown exceptions are contract: "Exceptions that are a part of the contract should not change from one version to the next (i.e., exception type should not change, and new exceptions should not be added)" ([FDG, Exception Throwing](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/exception-throwing)). Hyrum's Law states the pressure: "With a sufficient number of users of an API, it does not matter what you promise in the contract: all observable behaviors of your system will be depended on by somebody" ([hyrumslaw.com](https://www.hyrumslaw.com/)). The table turns "observable and promised" into a list.

### 2. What counts as a break: Microsoft's rules mapped onto the SDK

Microsoft's [library change rules](https://learn.microsoft.com/en-us/dotnet/core/compatibility/library-change-rules) (updated 2026-04-10; dotnet/runtime's own [breaking-change-rules.md](https://raw.githubusercontent.com/dotnet/runtime/main/docs/coding-guidelines/breaking-change-rules.md) lists the same exception and return-value rules) mark each change as allowed, disallowed, or "requires judgment". The ones that bear on this SDK, quoted:

| Rule (library-change-rules, "Behavioral changes") | Verdict | SDK reading |
|---|---|---|
| "Throwing a more derived exception than an existing exception" | allowed | A new subclass of a leaf, or `TaskCanceledException` for `OperationCanceledException`: green (`v2-green-derived`). |
| "Throwing a new exception in a new code path" (only for state existing code cannot reach) | allowed | A new leaf for a *new* verb or a newly mapped condition. |
| "Removing an exception to enable more robust behavior or new scenarios" | allowed | A failure that now succeeds because ocx gained a capability. |
| "Changing the text of an error message" | allowed | `Message` is never pinned (CS-ERR-08 fixes the template, the table does not read it). |
| "Throwing an exception in any other case not listed above" | **disallowed** | A different sibling leaf, or a leaked BCL exception, for an existing failure (`v2-red-type`). |
| "Removing an exception in any other case not listed above" | **disallowed** | A failure that becomes a result (`v2-red-result`). |
| "Changing the returned values for a property, field, method return value, or out parameter" | **disallowed** | A populated `ErrorKind` that becomes `null` (`v2-red-null`). |
| "Increasing the range of returned values for a property" | **disallowed** | A new `OcxLaunchFailure` member or a newly assigned exit-code name; see the open-enum judgment in section 3. |
| "Changing the default value of a property, field, or parameter" | **disallowed** | `OcxClientOptions.Timeout` default. |
| "A change in the parsing of input and throwing new exceptions" | requires judgment | Decode tolerance (section 5). |
| "Changing a synchronous API to asynchronous (and vice versa)" | **disallowed** | n/a: the surface is async-only (CS-ASYNC). |

Two further sources agree: Microsoft's library guidance defines a "behavior breaking change" as "the most common type of breaking change: almost any change in behavior could cause a logic error for a consumer. Changes to your library, such as method signatures, exceptions thrown or input or output data formats, could all negatively impact your library consumers. Even a bug fix can qualify" ([Breaking changes and .NET libraries](https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/breaking-changes)); and the Azure SDK guideline `[dotnet-versioning-no-api-breaking]` ("DO NOT introduce API-breaking changes in any release of an existing package") together with `[dotnet-errors-response-failed]` ("DO throw `RequestFailedException` or its subtype when a service method fails with non-success status code") make the exception type the failure contract ([Azure SDK .NET guidelines](https://azure.github.io/azure-sdk/dotnet_introduction.html)).

**Implication for table design.** Because "more derived is allowed" and "message text is allowed", the table's assertion must be assignability (`catch` semantics), not `GetType() ==` and not `Message ==`. Measured with xUnit v3 4.0.2: `Assert.ThrowsAsync<OperationCanceledException>` failed on a `TaskCanceledException` (`Expected: typeof(System.OperationCanceledException)  Actual: typeof(System.Threading.Tasks.TaskCanceledException)`), `Assert.ThrowsAnyAsync<OperationCanceledException>` passed, and `Assert.ThrowsAnyAsync<Exception>` passed on everything. Exact-type asserts over-fail on allowed changes; `Any<Exception>` under-fails on every break. Neither is the table's form.

### 3. The SemVer weight of each change kind

SemVer 2.0.0 gives three rules: patch "MUST be incremented if only backward compatible bug fixes are introduced", minor "if new, backward compatible functionality is introduced", major "if any backward incompatible changes are introduced to the public API"; and "A bug fix is defined as an internal change that fixes incorrect behavior" ([semver.org](https://semver.org/spec/v2.0.0.html)). It does not say whether a documented exception contract is "the public API". This research decides it is: the FDG sentence above, and the Azure.Core practice below, put thrown types inside the contract.

**Decision rule (one question).** Take the table's rows as the contract. A change is MAJOR (>=1.0.0; MINOR while 0.y.z, matching CS-API-14's second column) if for some input a *pinned* outcome changes: which catch clauses fire, throw versus return, or a pinned property value. A change is MINOR if it adds members or rows for paths no existing row covers. A change is PATCH if no row changes, no API line changes, and the difference is Message text, timing, or internals. A change to unpinned behaviour is not a promise, but a changelog line is still owed.

| Change | Bump (>=1.0) | Basis | Watched |
|---|---|---|---|
| Different leaf (or a BCL exception) thrown for an existing failure | **MAJOR** | library-change-rules "Throwing an exception in any other case"; FDG "exception type should not change" | `v2-red-type`: red |
| Failure becomes a result (throw -> return), e.g. unknown report status stops failing closed | **MAJOR** | "Removing an exception in any other case"; fail-closed is CS-JSON-06 | `v2-red-result`: red |
| Result becomes a failure (return -> throw), e.g. passthrough child exit | **MAJOR** | "Throwing an exception in any other case"; CS-ERR-03 | `v2-red-throws`: red |
| Pinned property value changes, including populated -> null | **MAJOR** | "Changing the returned values for a property" | `v2-red-null`: red |
| Caller cancel reported as SDK timeout (or reverse) | **MAJOR** | CS-ASYNC-08 and CS-ERR-05 make the split the contract | `v2-red-cancel`: red |
| Leaf removed from a base chain (`OcxException` no longer an ancestor) | **MAJOR** | library-change-rules "Removing a class from the set of base classes" is judgment; here `catchAs: [OcxException]` pins it | CP0007 measured by sibling |
| New sealed leaf thrown on an *existing* path, API purely additive | **MAJOR** | the surface grows (minor by CS-API-14) but a pinned catch stops firing | `v3-major-leaf`: pack green, table red without `supersedes` |
| Thrown type becomes *more derived* (`TaskCanceledException` for OCE) | PATCH (no new public type) or MINOR (new public type) | library-change-rules "more derived exception" allowed | `v2-green-derived`: green |
| New public property on an exception or result | **MINOR** | additive; RS0016 forces the `PublicAPI.Unshipped.txt` line | `v2-green-add`: green |
| `Message` text change | **PATCH** | "Changing the text of an error message" allowed; CS-ERR-08 | `v2-green-add` also changed it: green |
| New row for a new verb, report or condition (`since` = this version) | **MINOR** | "new exception in a new code path" allowed | `cmd-hint-for-permission-denied`, filtered out of the 1.0.0 baseline run |
| Previously-`null` property now populated | **MINOR** if the property was not pinned, **MAJOR** if a row pins `null` | the row, not the reviewer, decides | `cmd-temp-fail` pins `ErrorKind: null` |
| Exit code newly given a name (`IsKnown` false -> true) | **MINOR** if the unknown-code row uses a code ocx will never assign; **MAJOR** if an existing code's name or meaning changes | open struct (CS-JSON-05); ocx reused 82 between 0.6.5 and main ([ocx-cli-contract.md:57](../csharp-audit/ocx-cli-contract.md)) | `cmd-unknown-code` pins 200 |
| Default `Timeout` shortened | **MAJOR** | a call that succeeded can now fail with `OcxTimeoutException`; "Changing the default value" disallowed | not a table row; reviewer heuristic |
| Default `Timeout` lengthened | MINOR | fewer failures, later failures; judgment, see Contested | same |
| Retry widened (more exit codes, or mutating commands) | **MAJOR** | repeats side effects (CS-ERR-10: 75 only, non-mutating only) | row specified, not run |
| Retry narrowed or tuned inside the documented set | MINOR | | row specified, not run |
| Bug fix that reclassifies a failure no row pinned | PATCH, plus a new row | SemVer's bug-fix definition; Hyrum's Law says callers may already depend on it, so write the row now | |
| Pinned ocx version bumped and a `contract` row changes outcome | follows the row | CS-TEST-07, section 8 | |

**Azure.Core is the in-corpus evidence that practice varies and that labelling is the discipline.** Version 1.62.0, a minor, lists two credential-resolution behaviour changes under `### Breaking Changes` ([Azure.Core CHANGELOG.md:38-41](#sources) at `Azure__azure-sdk-for-net@32c48fc3d524`). Version 1.60.0, also a minor, lists under `### Bugs Fixed` that `DefaultAzureCredential` now surfaces a `CredentialUnavailableException` where it used to throw `AuthenticationFailedException` (`CHANGELOG.md:66-69`). The second is an exception-type change shipped as a bug fix in a minor. It is defensible only because `CredentialUnavailableException` is a documented "try the next credential" signal, which is exactly the case a row would have to pin or not pin on purpose. This SDK has fewer consumers to warn and a machine reader; it should not copy the looseness.

### 4. The table: data shape and location

**Location.** `tests/Ocx.Sdk.BehaviorTests/behavior-table.json`, copied to the output directory and loaded from `AppContext.BaseDirectory`. It sits with the test project that runs it. A second project reads the same file through a glob (section 7). It is not under `src/`: the shipped package must not carry it, and CS-JSON's rule against runtime `JsonSerializerOptions` is scoped to `src`, so reflection-based `System.Text.Json` in a test project is fine.

**Why data, not `[InlineData]`.** Four consumers read it: the source run, the baseline run, the contract tier (section 8), and the diff guard (section 9). A C# `TheoryData` cannot be shared by two projects without a shared source file, cannot be diffed by `jq`, and hides the "expected outcome" inside code that an agent edits to make a red test green. A JSON file whose rows are diffable by an 11-line script is a gate an agent cannot weaken silently.

**Row shape.** The fixture's real row for the headline case (trimmed of the `contract` block):

```json
{ "id": "cmd-usage", "since": "1.0.0", "op": "run",
  "argv": ["emit-exit", "64", "{\"error\":{\"kind\":\"usage_error\",\"detail\":\"bad-flag\"}}"],
  "expect": { "kind": "throws", "type": "OcxCommandException", "catchAs": ["OcxException"],
    "props": { "ExitCode.Value": 64, "ExitCode.Name": "UsageError", "ExitCode.IsKnown": true,
               "ErrorKind": "usage_error", "Detail": "bad-flag", "IsTransient": false } },
  "contract": { "argv": ["bogus-cmd"], "props": { "ExitCode.Value": 64, "ExitCode.Name": "UsageError" } } }
```

| Field | Meaning |
|---|---|
| `id` | Unique, stable, kebab-case. Becomes the xUnit test name; never reused. |
| `since` | First SDK version where the row holds. A row with `since` greater than the SDK under test is **not yielded** (filtered, not skipped). |
| `op` | `run` (typed report call) or `exec` (passthrough). Maps to `RunAsync` / `ExecAsync`. |
| `argv` | Handed to the fake `ocx`; one verb per hazard (CS-TEST-02): `exit <n>`, `emit-exit <n> <stdout>`, `sleep <ms>`. |
| `setup` | `exe` (`missing`, `nonexec`), `timeoutMs`, `cancelAfterMs`. |
| `os` | `posix` rows are skipped on Windows with `Assert.SkipWhen` and a reason (CS-TEST-04), never a bare `return`. |
| `expect.kind` | `throws` or `returns`. |
| `expect.type` | A type *name in the base chain* of what was thrown or returned. |
| `expect.catchAs` / `notCatchAs` | Names that must / must not be in the base chain: which `catch` clauses fire. |
| `expect.props` | Dotted paths read by reflection (`ExitCode.Value`). Numbers compare as doubles, strings by `ToString()` so enums and open-enum structs compare by name; a missing property is a mismatch. `$tokenIsCallers` is the one synthetic path: the `OperationCanceledException.CancellationToken` equals the caller's token. |
| `contract` | Optional. `argv` for the real binary and the *subset* of props it can satisfy (section 8). |
| `supersedes` | Optional. `{ "before": "2.0.0", "expect": { ...old... } }`: for SDK versions below `before`, the old expectation applies. |

**The assertion semantics, in code.** Only the listed props are read, so an additive change cannot fail a row:

```csharp
// Probe.Check, trimmed. chain = the thrown/returned type and its base types, by Name.
if (!chain.Contains(e.Type))   bad.Add($"type: expected a {e.Type}, got {o.Value.GetType().Name}");
foreach (var c in e.CatchAs)    if (!chain.Contains(c)) bad.Add($"catchAs: a 'catch ({c})' no longer fires");
foreach (var c in e.NotCatchAs) if (chain.Contains(c))  bad.Add($"notCatchAs: a 'catch ({c})' now fires");
foreach (var (path, want) in e.Props) if (!Same(want, Read(o.Value, path))) bad.Add(...);
```

**xUnit v3 wiring.** One theory over the row ids; each id is its own test, so a failure names the row:

```csharp
public static IEnumerable<TheoryDataRow<string>> Rows() =>
    Table.Applicable().Select(r => new TheoryDataRow<string>(r.Id) { TestDisplayName = r.Id });

[Theory] [MemberData(nameof(Rows))]
public async Task Row_holds(string id) { /* look the row up, Probe.RunAsync, Check, Assert.True(bad.Count == 0, ...) */ }
```

`ITheoryDataRow` carries `Skip`, `SkipUnless`, `SkipWhen`, `Label`, `TestDisplayName`, `Explicit`, `Timeout` and `Traits` ([ITheoryDataRow API](https://api.xunit.net/v3/3.0.1/Xunit.ITheoryDataRow.html)); v3 accepts `object[]`, tuples and `ITheoryDataRow` as rows ([xUnit v3 what's new](https://xunit.net/docs/getting-started/v3/whats-new)). Passing the string id, not a `Row` object, keeps every argument trivially serializable. A theory whose data source yields nothing fails with `No data found for ...Row_holds` (watched), so an empty table cannot go green.

**Launching the fake.** `OcxClientOptions.ExecutablePath` is the public explicit-path rung of the CS-BIN-01 discovery order. The behaviour tests use it and nothing else: no `InternalsVisibleTo`, no internal constructor, no `IProcessRunner`. This is not style. The same test sources must compile against the 1.0.0 nupkg, which has none of today's internals. The resolver accepts only `ocx` or `ocx.exe` (CS-PROC-03), so each behaviour project copies the fake's apphost under that name after build:

```xml
<Target Name="FakeAsOcx" AfterTargets="Build">
  <PropertyGroup><FakeExt Condition="$([MSBuild]::IsOSPlatform('Windows'))">.exe</FakeExt></PropertyGroup>
  <Copy SourceFiles="$(OutDir)Ocx.Fake$(FakeExt)" DestinationFiles="$(OutDir)ocx$(FakeExt)" />
</Target>
```

An apphost embeds the app dll by relative path, so the copy named `ocx` still runs `Ocx.Fake.dll` (watched: 30 tests, 0 failed; the fixture first tried `<AssemblyName>ocx</AssemblyName>`, which also works but renames the dll and would break CS-TEST-03's `Path.Join(AppContext.BaseDirectory, "Ocx.Fake.dll")`). This differs from CS-TEST-03, which launches the fake through `dotnet exec <dll>` for the process-mechanics tier; that tier tests the *engine* on source only, so it can use internals and the launcher. The behaviour tier tests the *public contract* and must not. The apphost is built for the leg's own RID, which is what the five native legs (CS-CI) provide.

### 5. The mandatory rows

Twelve rows ran in the fixture. Seven more are specified from CS-ERR/CS-JSON/CS-ASYNC and must exist in the real table; the test `Mandatory_rows_are_present` fails when one is missing (watched).

| Row id | Pins | Source rule | Ran |
|---|---|---|---|
| `cmd-usage` | exit 64 -> `OcxCommandException`, `ExitCode.Value/Name/IsKnown`, `ErrorKind`, `Detail`, `IsTransient=false`, `catchAs OcxException` | CS-ERR-01/02/04 | yes, also real ocx 0.6.5 |
| `cmd-temp-fail` | exit 75 -> `IsTransient=true`, `ErrorKind` pinned `null` | CS-ERR-10 | yes |
| `cmd-unknown-code` | exit 200 -> `ExitCode.IsKnown=false`, `Name=null`, no throw from the mapper | CS-ERR-02 | yes |
| `cmd-garbage-error-document` | non-JSON stdout with exit 78 -> still `OcxCommandException`, `ErrorKind=null` (a bad error document never becomes a decode failure) | CS-ERR-04, CS-JSON tolerance | yes |
| `report-unknown-member-tolerated` | exit 0 plus unknown JSON member -> returns `OcxReport` | CS-JSON "tolerant where ocx is open" | yes |
| `report-unknown-status-fails-closed` | exit 0, status not a known success -> throws `OcxCommandException` | CS-ERR-01, CS-JSON-06 | yes |
| `decode-truncated-json` | exit 0, truncated stdout -> `OcxDecodeException`, `catchAs OcxException`, `notCatchAs JsonException` | CS-ERR-04 | yes |
| `passthrough-child-exit-is-data` | `exec` with child exit 80 -> returns `ChildExit{ExitCode=80}`, no exception | CS-ERR-03 | yes |
| `timeout-is-sdk-type` | SDK timer -> `OcxTimeoutException`, `Timeout.TotalMilliseconds`, `notCatchAs OperationCanceledException` | CS-ASYNC-08, CS-ERR-05 | yes |
| `caller-cancel-is-oce` | caller token -> `OperationCanceledException` with the caller's token, `notCatchAs OcxException` | CS-ASYNC-08 | yes |
| `launch-missing-binary` | no binary -> `OcxLaunchException`, `Reason=NotFound` | CS-ERR-01 | yes |
| `launch-not-executable` | file without the exec bit -> `Reason=NotExecutable` (`os: posix`) | CS-ERR-01 | yes (Linux only) |
| `contract-version-mismatch` | handshake `contract` differs -> `OcxContractException`, `Part`, `Found`, `Expected`; not `OcxDecodeException` | CS-ERR-04, CS-JSON handshake | specified |
| `report-then-fail-partial-document` | non-zero exit with a report on stdout -> `OcxCommandException.PartialReportJson` non-null | CS-ERR-09, [ocx-cli-contract.md:60](../csharp-audit/ocx-cli-contract.md) | specified |
| `decode-unknown-enum-value` | unseen open-enum string -> value kept, `IsKnown=false`, `IsOk=false` | CS-JSON-05/06 | specified |
| `decode-unknown-union-tag` | unseen tag -> `Unknown` arm with `Raw`; known tag with bad payload -> `OcxDecodeException` | CS-JSON-07 | specified |
| `decode-missing-required` | missing `[JsonRequired]` member -> `OcxDecodeException` | CS-JSON-08 | specified |
| `secret-canary-not-in-message` | canary in argv and `OCX_AUTH_*` echoed on stderr; assert on `Message` and `ToString()` (a `notContains` check, the one place `Message` is read) | CS-ERR-08 | specified |
| `retry-only-on-75-nonmutating` | attempts counted via a fake counter file | CS-ERR-10, CS-PROC retry | specified |

**Two pinning rules that decide a row's SemVer weight.** (1) Pin `null` only when null is a promise. `cmd-temp-fail` pins `ErrorKind: null` because no error document means no kind, so a later change that populates it is a reviewed, versioned decision; an unpinned property can be populated in a minor. (2) The unknown-code row must use a code that ocx will never assign. ocx uses 0, 1 and 64-82 and retired 83-87 forever ([ocx-cli-contract.md:35-56](../csharp-audit/ocx-cli-contract.md)); 200 is outside every range it uses. A row that used 83 would turn red the day someone maps it, which is the correct signal that an open enum was closed.

### 6. Explicit asserts versus a Verify snapshot

The snapshots sibling ruled "SNAP-2: Do not snapshot ... (c) an exception" ([csharp-testing-snapshots-and-property.md:315](csharp-testing/csharp-testing-snapshots-and-property.md)), on the grounds that `Verify(ex)` writes `Type`, public properties, `Message` and a stack trace whose frame names are compiler-generated. This research adds the compatibility-specific reason, measured with Verify.XunitV3 32.0.0 and `IgnoreStackTrace()` (the 33.x sponsorship gate is SNAP-3's concern):

| Candidate | Snapshot suite (2 scenarios, verified on v1) | Table (12 rows) | Right answer |
|---|---|---|---|
| `v2-green-add` (new property, new message text) | **red** twice: `Message: ocx command failed with exit code 64` against `Message: ocx failed (exit 64)`, and `Hint: check file permissions` appears | green | green (both allowed) |
| `v2-green-derived` | green | green | green |
| `v2-red-null` | red (`ErrorKind` line gone) | red | red |
| `v2-red-type` | green | red | red |
| `v2-red-cancel`, `v2-red-result`, `v2-red-throws` | green | red | red |

Two defects, both structural. A snapshot compares *everything printed*, so it cannot express "additive is fine, message text is fine"; the only way to make it tolerant is to hand-maintain `IgnoreMember` lists, which is the table again with worse ergonomics. And a snapshot only covers the scenarios someone wrote, so it missed four of five breaks that the table caught; the table is also scenario-bound, which is why section 5 makes the rows mandatory and section 9 makes deleting one a CI failure. Verify's own agent guidance ("copy the received file to the `Verified:` path") is a one-command way for an agent to accept a break ([snapshots sibling section 8](csharp-testing/csharp-testing-snapshots-and-property.md)); a JSON `expect` change is a visible, mechanically diffable edit.

**Decision.** Explicit data-driven asserts for the compatibility suite. Verify stays available for large rendered text (SNAP-1), and an exception's *rendered* text, if anyone wants to snapshot it, belongs outside this suite because it is intended to change in minors.

### 7. Running the same table against the previous release

**Mechanics.** Two test projects, one set of sources:

```xml
<!-- tests/Ocx.Sdk.BehaviorTests.Baseline/Ocx.Sdk.BehaviorTests.Baseline.csproj (fixture, trimmed) -->
<PropertyGroup>
  <OutputType>Exe</OutputType>
  <UseMicrosoftTestingPlatformRunner>true</UseMicrosoftTestingPlatformRunner>
  <DefineConstants>$(DefineConstants);SDK_IS_PACKAGE</DefineConstants>
  <RootNamespace>Ocx.Sdk.BehaviorTests</RootNamespace>
  <TestingPlatformCommandLineArguments>$(TestingPlatformCommandLineArguments) --minimum-expected-tests 5</TestingPlatformCommandLineArguments>
</PropertyGroup>
<ItemGroup>
  <AssemblyAttribute Include="System.Reflection.AssemblyMetadataAttribute">
    <_Parameter1>BaselineVersion</_Parameter1><_Parameter2>$(OcxBaselineVersion)</_Parameter2>
  </AssemblyAttribute>
  <Compile Include="../Ocx.Sdk.BehaviorTests/*.cs" />
  <None Include="../Ocx.Sdk.BehaviorTests/behavior-table.json" CopyToOutputDirectory="PreserveNewest" />
  <PackageReference Include="xunit.v3.mtp-v2" Version="4.0.2" />
  <PackageReference Include="Ocx.Sdk" Version="$(OcxBaselineVersion)" />   <!-- exact; never a range, never a ProjectReference -->
  <ProjectReference Include="../Ocx.Fake/Ocx.Fake.csproj" />   <!-- plus the FakeAsOcx copy target, section 4 -->
</ItemGroup>
```

`OcxBaselineVersion` is one property in `Directory.Build.props`; the library's `PackageValidationBaselineVersion` is set from it, so the API gate and the behaviour gate always compare against the same release ([PackageValidationBaselineVersion](https://learn.microsoft.com/en-us/dotnet/core/project-sdk/msbuild-props#package-validation-properties)). Both test projects are listed in the solution, so `dotnet test --solution Ocx.Sdk.slnx` runs both in one invocation (MTP mode of the .NET 10 SDK, CS-TEST-05). The source project takes the SDK from `$(SdkDir)` in the fixture; in the real repo it is a plain `ProjectReference` to `src/Ocx.Sdk`.

**Where the baseline comes from.** In CI it is the published package on nuget.org through the normal package source mapping (CS-BUILD), exactly where package validation fetches its baseline. In the fixture it is a local folder feed next to the source (`nuget.config` with `<add key="baseline-feed" value="feed" />`); NuGet supports a flat or hierarchical folder as a source ([local feeds](https://learn.microsoft.com/en-us/nuget/hosting-packages/local-feeds)), and `dotnet pack -o feed` produced a flat folder that restored and validated. The same local feed rehearses a release offline.

**Proof it ran the package.** `Sdk_under_test_is_the_expected_artifact` reads the `BaselineVersion` assembly metadata and the SDK assembly's informational version. In the Baseline project it asserts `SdkVersion == baseline`; in the source project, `SdkVersion >= baseline`. Evidence that the baseline run loaded the nupkg's bytes: `sha256sum` of `lib/net10.0/Ocx.Sdk.dll` inside `Ocx.Sdk.1.0.0.nupkg` and of `behavior-baseline/bin/Debug/net10.0/Ocx.Sdk.dll` are both `fed126a0402a...`; the source project's copy (a Debug build) is `b9e80d0347e5...`. A first draft of the guard used the assembly `Location` and failed, because the package DLL is copied next to the test assembly; the version attribute is the check that works.

**`since` and the first-release problem.** A row newer than the SDK under test does not exist for it, so the table filters on `since <= SdkVersion` (filter, not skip; MTP's `--minimum-expected-tests` counts skipped tests, so a skip would let a half-empty table pass, CS-TEST-06). In `v2-green-add` the source project ran 13 rows and the baseline project 12; the 1.1.0 row was absent from the 1.0.0 run. There is no baseline before 1.0.0 ships. List the Baseline project in the solution in the commit that sets `OcxBaselineVersion` (R13), not before: an empty `Version` is a restore error. Package validation has the same lifecycle ([baseline validator](https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/package-validation/baseline-version-validator): bump the baseline after the release, and delete `CompatibilitySuppressions.xml`).

**An intentional break needs `supersedes`.** For a real major, the baseline run (old SDK) must still assert the old behaviour while the source run asserts the new one. The `supersedes` block does that; `Row.ExpectFor(sdkVersion)` returns the old `expect` when `sdkVersion < before`. Watched with `v3-major-leaf` (2.0.0, exit 75 throws a new `OcxTransientException`): old table gives red on `cmd-temp-fail`; the v3 table with `supersedes` gives green on both projects; the v3 table against the 1.0.0 source gives green. When the baseline moves to 2.0.0 the block is stale and must be deleted (CS-BEH-11 below).

**Measured cost** (SDK 10.0.401, WSL2, 32 logical CPUs; 28 tests + 2 skipped contract rows in two projects):

| Run | Wall time |
|---|---|
| `dotnet test --solution`, warm | 3.3 s |
| `--no-build` only | 2.4 s (current project alone 2.3 s: process spawn dominates, ~35 ms per row; the two 300 ms timeout/cancel rows set the floor) |
| bin/obj removed, `ocx.sdk` evicted from the package cache | 3.9 s |
| empty `--packages` directory (18 packages, 51 MB), `restore` then `test --no-restore` | restore 2.1 s, total 5.1 s |
| restore of the Baseline project alone with `ocx.sdk` evicted | 1.2 s |

Multiply by 2-4 for hosted runners; it is still a single-digit-second job per leg.

**Pitfalls found.**
1. *Stale package cache.* NuGet stores a restored package by id and version in the global packages folder and does not re-fetch it. I repacked the red-type source as `1.0.0` into the feed: the baseline run stayed **green** (`total: 14, failed: 0`) on the old cached bytes; after deleting `nuget-packages/ocx.sdk` it went **red** on `launch-missing-binary`. It bit a second time when a multi-TFM 1.0.0 was packed after a single-TFM one: `NU1202: Package Ocx.Sdk 1.0.0 is not compatible with net8.0 ... supports: net10.0`. CI is clean (no NuGet cache, CS-BUILD-27); locally and in agent sandboxes, evict first: `dotnet nuget locals global-packages --clear` or delete the package's folder. A published version is immutable on nuget.org, so the trap is a rehearsal-feed trap.
2. *Central Package Management.* With `ManagePackageVersionsCentrally`, the `PackageReference Include="Ocx.Sdk"` carries no `Version`; put `<PackageVersion Include="Ocx.Sdk" Version="$(OcxBaselineVersion)" />` in `Directory.Packages.props`. Watched: 30 tests, 0 failed.
3. *Multi-TFM.* With `<TargetFrameworks>net8.0;net10.0</TargetFrameworks>` both projects run once per TFM (4 test runs, 60 tests); `v2-red-type` failed on both TFMs. A multi-targeted package is therefore exercised on every shipped asset, not only the newest.
4. *Any older release on demand.* `dotnet test --project tests/Ocx.Sdk.BehaviorTests.Baseline -p:OcxBaselineVersion=1.0.1` ran the table against a 1.0.1 nupkg placed in the feed and failed on the broken release. The command therefore also audits *already published* versions.

### 8. Relation to FakeCliTests and the real-ocx contract tier

| Tier | What runs | Against | Pins | Gate |
|---|---|---|---|---|
| FakeCliTests (CS-TEST-04) | the production *engine* (internals allowed) | Ocx.Fake via `dotnet exec` | pipes, kill, caps: E1, E3, E7 | every leg, source only |
| **BehaviorTests (this)** | the public SDK surface | Ocx.Fake apphost named `ocx` | which exception, which value, throw vs return | every leg, source **and** previous nupkg |
| ContractTests (CS-TEST-07) | the public SDK surface | the pinned real ocx | exit codes real ocx emits; real output parses | every leg, armed by `OCX_SDK_CONTRACT=1` |

The behaviour table and the contract tier share rows. A row with a `contract` block runs a second time with the real binary: `argv` is the real command (`bogus-cmd`, whose real exit is 64) and `props` is the subset the real binary can satisfy. The fake can lie; the subset is what keeps the fake honest, and a fake row that promises more than the subset (for example `ErrorKind: usage_error`, which ocx 0.6.5 does not emit because it prints no error document) is flagged by simply not appearing in `contract.props`.

Watched with ocx 0.6.5 (`/home/mherwig/.ocx/symlinks/ocx.sh/ocx/cli/current/content/bin/ocx`): `OCX_SDK_CONTRACT=1 OCX_SDK_EXE=<that path>` gave 30/30 passed, 0 skipped, including `cmd-usage` (real exit 64, `ExitCode.Name == "UsageError"`). Armed with `OCX_SDK_EXE` unset: 2 failed with `armed but OCX_SDK_EXE is unset` (red, not a skip, as CS-TEST-07 requires). Armed against `/bin/true`: 2 failed (`type: expected a OcxCommandException, got OcxDecodeException`). The contract tier covers only what is reachable offline; the rest of the table is the fake's, and the nightly `OCX_TEST_VERSIONS=latest` run (CS-TEST-07) is where real-ocx drift against the table surfaces.

There is a fourth cell nobody runs: the previous SDK against the current real ocx. The table cannot tell whether the old SDK still works with new ocx, only whether the new SDK still behaves like the old one against the same fake. Accepted gap.

### 9. Release flow: bump derivation and the dotnet-release steps

**CS-API-14 is API-only and needs one more signal.** Its table maps added lines to minor and `*REMOVED*`/PKV006/suppressions to major ([csharp-api.md, CS-API-14](../csharp-api.md)). `v3-major-leaf` passes it as "added lines only = minor" and is a major. Add behavioural signals above its first row:

| Signal | Bump (>=1.0) | Bump (0.y.z) |
|---|---|---|
| Any `supersedes` block added, or any existing row's `expect`/`argv`/`setup`/`op`/`os`/`since` edited | major | minor |
| A row deleted | major (and a deletion needs the same `supersedes` scrutiny) | minor |
| Only new rows (each `since` equals the version being released) | minor | minor |
| Table unchanged | per CS-API-14 | per CS-API-14 |

**Where it lands in the release procedure** ([csharp-packaging.md, dotnet-release R1-R14](../csharp-packaging.md)): R4 `dotnet test -c Release --no-build` already runs both projects once the solution lists them, so there is no extra release step and no release-only job; the suite runs on every PR leg. R5 (`dotnet pack`) keeps owning CP#### and RS####. R13 (set `PackageValidationBaselineVersion` to the released version) gains two lines: set `OcxBaselineVersion` (the single property), and delete every `supersedes` whose `before` is now `<=` the new baseline. The pre-release command an agent or human runs locally:

```bash
dotnet nuget locals global-packages --clear      # or delete the ocx.sdk folder: the baseline is cached by version
dotnet test --solution Ocx.Sdk.slnx -c Release   # source table + baseline table, all TFMs, one invocation
```

### 10. What the exemplars do

- **Azure.Core** tests its `RequestFailedException` by constructing it in-process from a mock response and asserting the formatted `Message`, the raw response and headers ([Azure__azure-sdk-for-net@32c48fc3d524:sdk/core/Azure.Core/tests/FailedResponseExceptionTests.cs:25-58](#sources)). Its compatibility discipline is the changelog (`CHANGELOG.md:38-41`, `66-69`) and exported API listings (`sdk/core/Azure.Core/api/Azure.Core.net8.0.cs`), not a replay against the previous package. It pins `Message` text, which section 2 says is allowed to change.
- **Npgsql** asserts a `PostgresException`'s `MessageText`, `Severity`, `InvariantSeverity`, `SqlState`, `Data` entries and `ToString()` prefix, but needs a live PostgreSQL to raise it ([npgsql__npgsql@9c47244547c2:test/Npgsql.Tests/ExceptionTests.cs:17-58](#sources); `catch (PostgresException e)` at line 35). That is the "property set per failure" pattern the table adopts, without the server.
- **Octokit.net** constructs `ApiException` and asserts `StatusCode`, `ApiError.Message` and `ApiError.Errors`, with a theory over malformed bodies (`""`, `null`, `{{{{{`, an HTML 502) that still must produce an `ApiError` ([octokit__octokit.net@7fa5b0fe4a18:Octokit.Tests/Exceptions/ApiExceptionTests.cs:15-74](#sources)). This is the decode-tolerance row (`cmd-garbage-error-document`) in constructor form.
- **CliWrap** pins `CommandExecutionException` with `ExitCode` for a non-zero exit and returns a result when validation is off ([Tyrrrz__CliWrap@7dbc252fa773:CliWrap.Tests/ValidationSpecs.cs:12-27](#sources) and `47-61`). The second test is the throw-or-return switch that CS-ERR-09 and FDG forbid ("DO NOT have public members that can either throw or not based on some option"); the table pins `ExecAsync` as always-data and `RunAsync` as always-throws.
- **Polly** pins `TimeoutRejectedException.Timeout` and the default message in constructor tests ([App-vNext__Polly@e4476096da5b:test/Polly.Core.Tests/Timeout/TimeoutRejectedExceptionTests.cs:7-19](#sources)) and sets `PackageValidationBaselineVersion` to `8.5.2` for API validation only ([eng/Library.targets:15-18](#sources)). Stripe gates its baseline on `RunBaselineCheck` ([stripe__stripe-dotnet@dbdca6ba5efc:src/Stripe.net/Stripe.net.csproj:27-28](#sources)); vs-threading sets one only on Windows ([microsoft__vs-threading@f6d817997090:src/Microsoft.VisualStudio.Threading/Microsoft.VisualStudio.Threading.csproj:14](#sources)).
- **openai-dotnet** has a compile-only source-compatibility test for legacy named arguments ([openai__openai-dotnet@1f0e8829acac:tests/SourceCompatibility/PaginationNamedArgumentCompatibilityTests.cs:11-16](#sources)): the nearest thing in the corpus to a compat suite, and it pins source shape, not behaviour.

Search basis: `PackageValidationBaselineVersion` appears in five files across the 35 clones (FluentValidation, nodatime, Polly, Stripe, vs-threading), all package validation; no test project restores the repo's own previous package. The idea in this document has no exemplar. It follows from combining two things the exemplars already do separately.

### 11. Verified on the toolchain

**Fixture:** `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-api-behavioral-compat/` (SDK 10.0.401, PublicApiAnalyzers 5.6.0, xunit.v3.mtp-v2 4.0.2, Verify.XunitV3 32.0.0, local folder feed `feed/`). Regenerate everything with `./evidence.sh` (output in `evidence.txt`); candidates are derived from `lib/v1` by `make-variants.py`, one patch each.

| Piece | Path |
|---|---|
| v1 library (five exception leaves, `ChildExit`, `OcxReport`, `OcxClient`) | `lib/v1/Ocx.Sdk.cs` (`PublicAPI.Shipped.txt` generated from RS0016 messages, 37 symbols) |
| Fake `ocx` (verbs `exit`, `emit-exit`, `sleep`) | `fake/Ocx.Fake.csproj`, `fake/Program.cs` |
| The table | `behavior/behavior-table.json` (13 rows), `behavior/behavior-table.v3.json` |
| Harness | `behavior/Table.cs`, `Probe.cs`, `BehaviorTests.cs` |
| Baseline project (same sources, PackageReference) | `behavior-baseline/Ocx.Sdk.BehaviorTests.Baseline.csproj` |
| Solution | `Compat.slnx` |
| Snapshot control | `snap/` |
| Diff guard | `check-table-diff.sh` |

**Row 1 - v1 slice, green on v1, one invocation** (`./run-all.sh v1`; command inside: `dotnet test --solution Compat.slnx -p:SdkDir=$PWD/lib/v1`):

```
v1: pack exit=0 [no RS/CP diagnostics]  behaviour-suite exit=0   total: 30  failed: 0  succeeded: 28  skipped: 2
```

(15 tests per project: 12 rows + presence test + provenance test, plus the armed-only contract theory shown as one skipped test each; the 13th row, `cmd-hint-for-permission-denied` with `since` 1.1.0, is filtered out at 1.0.0.)

**Row 2 - five red candidates, each a PATCH-numbered release (1.0.1) with an unchanged API** (`./run-all.sh v2-red-type v2-red-null v2-red-result v2-red-throws v2-red-cancel`). Every one: `pack exit=0 [no RS/CP diagnostics]  behaviour-suite exit=2   total: 30  failed: 1`. The failing line of each:

```
v2-red-type   [launch-missing-binary] behaviour changed: type: expected a OcxLaunchException, got FileNotFoundException (FileNotFoundException > IOException > SystemException); catchAs: a 'catch (OcxException)' no longer fires; Reason: expected "NotFound", got <missing property>
v2-red-null   [cmd-usage] behaviour changed: ErrorKind: expected "usage_error", got null; Detail: expected "bad-flag", got null
v2-red-result [report-unknown-status-fails-closed] behaviour changed: kind: expected throws, got returns (OcxReport)
v2-red-throws [passthrough-child-exit-is-data] behaviour changed: kind: expected returns, got throws (OcxCommandException)
v2-red-cancel [caller-cancel-is-oce] behaviour changed: type: expected a OperationCanceledException, got OcxTimeoutException (OcxTimeoutException > OcxException > Exception); notCatchAs: a 'catch (OcxException)' now fires; $tokenIsCallers: expected true, got False
```

The failure is in the *source* project only; the baseline project (v1 nupkg) is green on every one of them, which is how you tell "the new source regressed" from "the table is wrong".

**Row 3 - green twins:** `v2-green-add` (1.1.0, new `Hint` property, new message text, new row) `pack exit=0`, `exit=0 total: 31 failed: 0`; `v2-green-derived` (cancel throws `TaskCanceledException`) `exit=0 total: 30 failed: 0`.

**Row 4 - the API gates are armed (controls):**

```
v2-ctl-api-removed        pack exit=1 [error CP0002]  behaviour-suite exit=2  total: 30 failed: 3
v2-ctl-api-added-unlisted pack exit=1 [error RS0016]
```

`v2-ctl-api-removed` acknowledged the removal for RS0017 with `*REMOVED*` in `PublicAPI.Unshipped.txt`, so only package validation (against the baseline restored from the local feed) could object; it did, with `[Baseline]` in the message, which also proves the feed baseline resolved.

**Row 5 - intentional major** (`./evidence.sh` section 2). `v3-major-leaf` (2.0.0; exit 75 throws new `OcxTransientException`): `pack exit=0 []`; with the old table `exit=2 ... [cmd-temp-fail] behaviour changed`; with `behavior-table.v3.json` (row gains `supersedes: {before: "2.0.0", ...}`) `exit=0 total: 31 failed: 0`.

**Row 6 - snapshot control** (`./snap-run.sh`): `v1` exit 0; `v2-green-add` exit 2 (2 failed; `Message` and `Hint` lines); `v2-green-derived` 0; `v2-red-null` 2; `v2-red-type` 0 (undetected).

**Row 7 - contract tier** (section 8): real ocx 0.6.5 `exit=0 total: 30 failed: 0 skipped: 0`; armed and unset `exit=2 failed: 2`; armed against `/bin/true` `exit=2 failed: 2`.

**Row 8 - guards on the guard.**

```
# row deleted from the output copy of the table
failed Ocx.Sdk.BehaviorTests.BehaviorTests.Mandatory_rows_are_present
  mandatory behaviour rows deleted: launch-missing-binary
# every row's "since" set to 9.0.0 in the output copy
  Xunit.MicrosoftTestingPlatform.XunitException: No data found for Ocx.Sdk.BehaviorTests.BehaviorTests.Row_holds   (exit 2)
```

```
$ check-table-diff.sh base.json head.json          # head = base with a change
unchanged                                   exit=0
expect.type edited, no supersedes           CHANGED row launch-missing-binary without supersedes      exit=1
same edit plus supersedes                   exit=0
row deleted                                 DELETED row launch-missing-binary                         exit=1
since raised to 9.0.0                       CHANGED row cmd-usage without supersedes                  exit=1
new row added                               exit=0
```

**Row 9 - stale cache, multi-TFM, CPM, override** (section 7): stale cache green-then-red; `NU1202` on a stale single-TFM package; net8.0+net10.0 both red on `v2-red-type` (`total: 60 failed: 2`); CPM green; `-p:OcxBaselineVersion=1.0.1` red on a broken 1.0.1.

**Row 10 - rule one-liners watched:** `comm -23 <(...thrown Ocx*Exception names in src) <(...types in the table)` prints nothing for v1, prints `OcxTransientException` for v3 with the old table, nothing for v3 with the v3 table. The `jq -e '.schema==1 and ...'` unique-id check returns 0 on the table and 1 with a duplicated row. The stale-`supersedes` check returns "ok" for baseline 1.0.0 and "STALE" for 2.0.0 and 10.0.0.

**Row 11 - assertion forms:** `Assert.ThrowsAsync<OperationCanceledException>` fails on `TaskCanceledException`; `ThrowsAnyAsync<OperationCanceledException>` passes; `ThrowsAnyAsync<Exception>` passes on everything.

Red/green pairs watched (18): (1-5) the five red candidates against v1 green; (6) `v3-major-leaf` without and with `supersedes`; (7) CP0002 control against the green pack; (8) RS0016 control; (9) mandatory-row deletion against the full table; (10) empty theory (`No data found`) against the full table; (11) the diff guard, three reds and three greens; (12) contract tier armed with no binary and with a wrong binary against the real binary; (13) stale package cache green against evicted red; (14) the snapshot false positive against the table on `v2-green-add`; (15) `ThrowsAsync<OperationCanceledException>` red against `ThrowsAnyAsync` on a derived exception; (16) the thrown-types-without-a-row check; (17) the unique-id `jq` check; (18) the stale-`supersedes` check. Windows, arm64, macOS: none.

### 12. Not verified

- **Windows, arm64, macOS.** All runs were Linux x64 on WSL2. The `launch-not-executable` row is POSIX-only by construction. The Windows apphost `ocx.exe` path, `Win32Exception` mapping to `Reason`, and the exit-code reading of a killed child (`-1` on Windows) are unmeasured; the engine group owns them.
- **ocx main.** Only 0.6.5 was installed. Main prints an error document (so `ErrorKind` would be `usage_error` there), and main reuses exit code 82; the contract `props` subset deliberately omits both.
- **The `.NET 11` RC1 SDK** was not used. xUnit v3 `Assert.SkipWhen` and `ITheoryDataRow` behaviour on MTP v2 is as documented for 4.0.2.
- **The seven specified rows** (`contract-version-mismatch` through `retry-only-on-75-nonmutating`) are not in the fixture. The engine is a toy (no pumps, no cap, `ReadToEndAsync`), so process-mechanics claims are not made here.
- **Package source mapping** for the baseline package against nuget.org was not exercised (local feed only); it is the same mechanism as for any dependency (CS-BUILD).

## Normative guidance candidates

IDs use a proposed family `CS-BEH-*` (behavioural compatibility). Severities: MUST / SHOULD / CONSIDER as in the program. "Watched" says whether a red and a green twin were run.

**CS-BEH-01 (MUST).** Keep exactly one behaviour table as data at `tests/Ocx.Sdk.BehaviorTests/behavior-table.json`: `{"schema":1,"rows":[...]}`, row ids unique and kebab-case, each row with `id`, `since`, `op`, `argv`, `expect`. Do not express expected outcomes as `[InlineData]` or per-test code.
- Why: four consumers (source run, baseline run, contract tier, diff guard) read it; a JSON diff is reviewable and mechanically guardable; code is what an agent edits to go green.
- Verify: `jq -e '.schema==1 and (.rows|length)>=12 and ([.rows[].id]|length)==([.rows[].id]|unique|length) and all(.rows[]; has("id","since","op","argv","expect"))' tests/Ocx.Sdk.BehaviorTests/behavior-table.json`; `rg -n -g '*.cs' -e 'InlineData' tests/Ocx.Sdk.BehaviorTests` prints nothing.
- Watched: yes (jq returns 0 on the table, 1 with a duplicated id).

**CS-BEH-02 (MUST).** The mandatory rows of section 5 exist, and a test fails when one is removed. Each failure path in `src` that throws `Ocx*Exception` has a row whose `expect.type` names it, added in the same PR as the throw site.
- Why: deleting a failing row is the cheapest way to go green; an unpinned failure path is an unpromised one.
- Verify: `comm -23 <(grep -rhoE --include='*.cs' 'new Ocx[A-Za-z]+Exception' src | sed 's/new //' | sort -u) <(jq -r '.rows[].expect.type' tests/Ocx.Sdk.BehaviorTests/behavior-table.json | sort -u)` prints nothing; `rg -n 'Mandatory_rows_are_present' tests/Ocx.Sdk.BehaviorTests` has one hit.
- Watched: yes (empty for v1; `OcxTransientException` for v3 with the old table; empty with the v3 table; presence test red when `launch-missing-binary` removed).

**CS-BEH-03 (MUST).** Rows assert catch semantics: `expect.type` is a name in the thrown or returned type's base chain, plus `catchAs`/`notCatchAs`. No row compares `GetType()` for equality and no row reads `Message`, except the one `notContains` canary row (CS-ERR-08). The behaviour project never uses `Assert.ThrowsAsync<Exception>`, `Assert.ThrowsAnyAsync<Exception>`, `Record.ExceptionAsync` followed by `Assert.NotNull`, or `Assert.ThrowsAsync<Ocx...>` outside the harness.
- Why: library-change-rules allow a more derived exception and a changed message; `ThrowsAsync<T>` failed on a derived type, `ThrowsAnyAsync<Exception>` passed on everything.
- Verify: `rg -n -g '*.cs' -e 'Throws(Any)?Async<Exception>' -e 'Record\.Exception' -e 'GetType\(\) *==' -e '\.Message' tests/Ocx.Sdk.BehaviorTests` prints nothing apart from the single canary row's file; `jq -e '[.rows[].expect.props | keys[]] | all(. != "Message")' <table>`.
- Watched: the two assert forms (yes); the greps were not planted.

**CS-BEH-04 (MUST).** `expect.props` lists only properties the SDK promises. Pin `null` only where null is documented as a promise; pin the unknown-exit-code row to a code ocx never assigns (200).
- Why: only listed props are read, so an unlisted property can be added or populated in a minor; a pinned `null` or a code in ocx's range turns later population into a reviewed major.
- Verify: reading heuristic: every `null` in `props` has a sentence in the XML doc of that property saying when it is null; `jq -r '.rows[] | select(.id=="cmd-unknown-code") | .argv[1]' <table>` prints a number above 82 and not in 83-87.
- Watched: row behaviour yes (`v2-green-add` populates an unpinned path green; `cmd-temp-fail` pins null).

**CS-BEH-05 (MUST).** The behaviour projects reach the fake only through `OcxClientOptions.ExecutablePath` (or `OCX_SDK_EXE`), pointing at the apphost copy named `ocx`/`ocx.exe` that a post-build `Copy` makes. They use no `InternalsVisibleTo`, no internal types and no process seam, so the same sources compile against any released package.
- Why: the Baseline project compiles the same files against the previous nupkg; an internal reference breaks that build.
- Verify: `! rg -n -g '*.cs' -e 'InternalsVisibleTo\(.*Behavio' src`; `rg -n 'DestinationFiles="\$\(OutDir\)ocx' tests/Ocx.Sdk.BehaviorTests*/*.csproj` hits both projects; `! rg -n -g '*.csproj' -e 'Include="\.\./\.\./src' tests/Ocx.Sdk.BehaviorTests.Baseline`.
- Watched: construction (the Baseline project compiled the shared sources and ran against the package; the copy target ran green on Linux); the greps were not planted.

**CS-BEH-06 (MUST).** A second test project, `Ocx.Sdk.BehaviorTests.Baseline`, compiles the first project's sources by glob and references `Ocx.Sdk` by `PackageReference` at exactly `$(OcxBaselineVersion)`. It has no `ProjectReference` to `src`, no version range or floating version, and `OcxBaselineVersion` is the one property that also feeds `PackageValidationBaselineVersion`. Both projects are in the solution and run in one `dotnet test --solution`.
- Why: one property keeps the API gate and the behaviour gate on the same release; a floating version or source reference stops testing what shipped.
- Verify: `rg -n -g '*.csproj' 'Include="Ocx\.Sdk"' tests/Ocx.Sdk.BehaviorTests.Baseline` shows `Version="$(OcxBaselineVersion)"` (or a central `PackageVersion` with the same value); `! rg -n -g '*.csproj' 'ProjectReference.*src/Ocx\.Sdk' tests/Ocx.Sdk.BehaviorTests.Baseline`; `dotnet msbuild src/Ocx.Sdk -getProperty:PackageValidationBaselineVersion` equals `dotnet msbuild tests/Ocx.Sdk.BehaviorTests.Baseline -getProperty:OcxBaselineVersion`.
- Watched: yes (v1 baseline green, broken 1.0.1 baseline red through `-p:OcxBaselineVersion`).

**CS-BEH-07 (MUST).** A provenance test fails if the Baseline project did not load the baseline version, and the source project asserts its SDK version is not older than the baseline. Implement it with an `AssemblyMetadata("BaselineVersion", ...)` attribute, not with assembly `Location`.
- Why: a mis-wired baseline silently tests the source twice; the package DLL is copied beside the test assembly, so `Location` cannot tell them apart (the first draft failed that way).
- Verify: `rg -n 'Sdk_under_test_is_the_expected_artifact' tests/Ocx.Sdk.BehaviorTests` has one hit; `rg -n 'BaselineVersion' tests/Ocx.Sdk.BehaviorTests*/*.csproj` hits both projects.
- Watched: the passing form (yes) and the `Location` form red (yes); the mis-wired-baseline red was not planted separately.

**CS-BEH-08 (MUST).** Rows newer than the SDK under test are filtered out of the theory, never skipped, and both projects bake `--minimum-expected-tests` into `TestingPlatformCommandLineArguments`. A bad `since` that empties the theory must stay red (xUnit's `No data found`).
- Why: a skipped row still counts toward a minimum and hides a half-empty table (CS-TEST-06).
- Verify: `rg -n 'minimum-expected-tests' tests/Ocx.Sdk.BehaviorTests*/*.csproj` hits both; `! rg -n -g '*.cs' 'Skip *=' tests/Ocx.Sdk.BehaviorTests` except the contract theory.
- Watched: yes (empty theory red; row deletion red).

**CS-BEH-09 (MUST).** CI runs `check-table-diff.sh` against the merge base of every PR. An existing row may not be deleted, and its `expect`, `since`, `op`, `os`, `argv` or `setup` may not change, unless the row gains a `supersedes` block.
- Why: the AI failure is editing the expectation to match the new behaviour; this makes that edit a visible, versioned decision.
- Verify: `git show "$(git merge-base origin/main HEAD)":tests/Ocx.Sdk.BehaviorTests/behavior-table.json > /tmp/base.json && tests/check-table-diff.sh /tmp/base.json tests/Ocx.Sdk.BehaviorTests/behavior-table.json` exits 0 (script body below).
- Watched: yes, three reds and three greens.

```bash
#!/usr/bin/env bash
base=$1; head=$2
jq -n -r --slurpfile b "$base" --slurpfile h "$head" '
  ($h[0].rows | map({key: .id, value: .}) | from_entries) as $H |
  $b[0].rows[] | . as $r | ($H[$r.id]) as $n |
  if $n == null then "DELETED row \($r.id)"
  elif ($n.supersedes == null) and (($n.expect != $r.expect) or ($n.since != $r.since) or ($n.op != $r.op) or ($n.os != $r.os) or ($n.argv != $r.argv) or ($n.setup != $r.setup)) then "CHANGED row \($r.id) without supersedes"
  else empty end' | tee /dev/stderr | { ! read -r _; }
```

**CS-BEH-10 (MUST).** Extend the CS-API-14 bump derivation with the behavioural signals of section 9: a `supersedes` block, an edited existing row or a deleted row is a major (minor at 0.y.z); only new rows with `since` equal to the release version is a minor.
- Why: CS-API-14 computes bumps from API lines only and calls the `v3-major-leaf` change a minor.
- Verify: `git diff "$(git describe --tags --abbrev=0)"..HEAD -- tests/Ocx.Sdk.BehaviorTests/behavior-table.json | grep -c '"supersedes"'` is 0 unless the version being released has a new major component; the `dotnet-release` skill step "choose the version" reads both signals.
- Watched: the underlying case (yes: pack green, table red then green with `supersedes`).

**CS-BEH-11 (MUST).** When `OcxBaselineVersion` moves to a release, delete every `supersedes` whose `before` is less than or equal to it (R13).
- Why: a stale block keeps asserting an expectation no baseline has; it is the behavioural twin of a stale `CompatibilitySuppressions.xml`, which Microsoft says to delete after the release ([baseline validator](https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/package-validation/baseline-version-validator)).
- Verify:
```bash
BASE=$(dotnet msbuild tests/Ocx.Sdk.BehaviorTests.Baseline -getProperty:OcxBaselineVersion)
min=$(jq -r '.rows[] | select(.supersedes) | .supersedes.before' tests/Ocx.Sdk.BehaviorTests/behavior-table.json | sort -V | head -1)
[ -z "$min" ] || { [ "$min" != "$BASE" ] && [ "$(printf '%s\n%s\n' "$BASE" "$min" | sort -V | head -1)" = "$BASE" ]; }
```
exits 0.
- Watched: the comparison (yes: ok for 1.0.0, STALE for 2.0.0 and 10.0.0); `dotnet msbuild -getProperty:OcxBaselineVersion` printed a bare `1.0.0` on the fixture (a single property is not JSON).

**CS-BEH-12 (MUST).** The behaviour suite runs on every PR leg inside the normal `dotnet test --solution`; there is no release-only or nightly-only variant. List the Baseline project in the solution in the commit that sets `OcxBaselineVersion` (R13), not earlier.
- Why: it costs 2-5 s, and an empty `Version` is a restore error before 1.0.0 ships.
- Verify: `rg -n 'BehaviorTests' Ocx.Sdk.slnx` lists the source project always and the Baseline project only once `OcxBaselineVersion` is set; `! rg -n -g '*.yml' 'filter-(class|method|namespace).*Behavior' .github/workflows`.
- Watched: cost yes; the wiring is the fixture's own.

**CS-BEH-13 (MUST).** Every row that can be reproduced offline against the real ocx carries a `contract` block (`argv` plus a props subset), runs under `OCX_SDK_CONTRACT=1`, and is red, not skipped, when armed without `OCX_SDK_EXE`. The subset omits anything the pinned ocx does not emit.
- Why: keeps the fake honest; same arming rule as CS-TEST-07.
- Verify: `jq -e '[.rows[] | select(.contract) | .contract.props | keys[]] | all(. != "ErrorKind")' <table>` while the pinned ocx predates the error document; `OCX_SDK_CONTRACT=1 dotnet test --project tests/Ocx.Sdk.BehaviorTests` exits non-zero when `OCX_SDK_EXE` is unset.
- Watched: yes (armed+unset red, armed+wrong binary red, armed+real green).

**CS-BEH-14 (MUST).** Evict the baseline package from the global packages folder before trusting a local baseline run. CI keeps no NuGet cache (CS-BUILD-27).
- Why: a repacked version stays cached; a stale baseline stayed green on a package that was red.
- Verify: the pre-release command starts with `dotnet nuget locals global-packages --clear`; `rg -n 'actions/cache' .github/workflows` prints nothing for NuGet paths.
- Watched: yes (green stale, red after eviction; `NU1202` from a stale single-TFM package).

**CS-BEH-15 (SHOULD).** Both behaviour projects inherit the repository TFMs, so every shipped target framework of the baseline and of the source is exercised.
- Why: `v2-red-type` failed on net8.0 and net10.0; a net10-only test project would miss a net8-only regression.
- Verify: `! rg -n '<TargetFramework' tests/Ocx.Sdk.BehaviorTests*/*.csproj` (TFMs come from `Directory.Build.props`); `dotnet test --solution Ocx.Sdk.slnx` lists `net8.0` and `net10.0` in its `Running tests from` lines.
- Watched: yes (60 tests, 4 modules).

**CS-BEH-16 (MUST).** Do not snapshot exceptions in the behaviour suite. Where an exception's rendered text must be reviewed, snapshot it outside this suite with `IgnoreStackTrace()`.
- Why: the snapshot went red on the allowed change and stayed green on four of five breaks (section 6); SNAP-2(c) and SNAP-13.
- Verify: `rg -ln -g '*.cs' 'Verifier\.Verify|Verify\(' tests/Ocx.Sdk.BehaviorTests*` prints nothing.
- Watched: yes (section 6 table).

**CS-BEH-17 (MUST).** Every row that sleeps uses a bounded fake verb (`sleep <ms>` with a value below the fake's watchdog), a per-row `timeoutMs` or `cancelAfterMs`, and the harness removes temp directories in `finally`.
- Why: a regression to a hang must fail within seconds, not hang the leg (CS-TEST-04 deadline rule).
- Verify: `jq -e '[.rows[] | select(.argv[0]=="sleep") | (.setup.timeoutMs // .setup.cancelAfterMs)] | all(. != null and . <= 1000)' <table>`.
- Watched: construction (the two sleep rows finish in ~0.3 s each).

## AI-agent angle

| What an LLM characteristically gets wrong | Smallest mechanical check |
|---|---|
| Reads green `dotnet pack` with `EnablePackageValidation` and green RS0016/RS0017 as "no breaking change" and ships a patch that changes the thrown type. | The behaviour suite in the same `dotnet test`; the 5 measured candidates. CS-BEH-12. |
| Goes red on a behaviour row and edits `expect` (or deletes the row, or raises `since`) to match the new behaviour. | `check-table-diff.sh` (CS-BEH-09). Red x3. |
| Writes the compat test as `Assert.ThrowsAnyAsync<OcxException>(...)`, `ThrowsAsync<Exception>`, or `Record.ExceptionAsync` plus `Assert.NotNull`; passes whatever is thrown. | `rg` of CS-BEH-03; the `ThrowsAnyAsync<Exception>` pass-on-everything measurement. |
| Writes `Assert.ThrowsAsync<OperationCanceledException>(...)` for the cancel case; breaks the day the SDK throws `TaskCanceledException` (allowed by Microsoft). | Assert via the table's `type` (base chain) instead; measured red/green of the two forms. |
| Asserts `ex.Message` equality, pinning text Microsoft says may change, and breaks every wording fix. | `jq` and `rg` of CS-BEH-03. |
| Snapshots the exception with Verify and accepts the received file; a new property or message edit then "breaks" and the agent re-accepts, burying real breaks. | `rg` of CS-BEH-16; SNAP-2(c). |
| Adds the baseline with `Version="*"`, a range, or a `ProjectReference` to a checkout of the last tag; tests source twice or something that is not the shipped artifact. | CS-BEH-06 greps; provenance test (CS-BEH-07). |
| Believes `PackageValidationBaselineVersion` covers behaviour, or copies `ApiCompatVersion` from Azure.Core (a silent no-op, CS-API-12). | `dotnet msbuild -getProperty` equality in CS-BEH-06; CS-API-12's grep. |
| Re-runs a baseline after repacking the same version and trusts the green; the cached DLL is the old one. | Pre-release command starts with `dotnet nuget locals global-packages --clear` (CS-BEH-14). |
| Reaches into internals (`InternalsVisibleTo`, an internal `ProcessRunner`) from the behaviour tests, so the shared sources no longer compile against the old nupkg. | CS-BEH-05 greps; the Baseline project build is the red. |
| Marks rows `Skip` instead of filtering by `since`, so a half-empty table is green. | CS-BEH-08 (`--minimum-expected-tests`, no `Skip =`). |
| Treats an additive API plus a changed throw as a MINOR because the `PublicAPI.Unshipped.txt` diff has only added lines (CS-API-14). | CS-BEH-10: the row diff forces major. `v3-major-leaf`. |
| Adds a new failure path and no row, because "the tests pass". | CS-BEH-02 `comm -23` check. |
| Pins `null` for every unset property "to be safe", turning each later improvement into a major. | Reading heuristic in CS-BEH-04: each pinned `null` needs a doc sentence. |
| Uses a mocked `IProcessRunner` or a `Mock<Process>` to produce the failure instead of the fake `ocx`. | `rg` of CS-TEST-02 (`Mock<`, `Substitute.For<`) on the behaviour projects. |

## Contested / evolving

- **Is a thrown exception type "the public API" for SemVer?** SemVer says major for "backward incompatible changes ... to the public API" and does not define the term ([semver.org](https://semver.org/spec/v2.0.0.html)). Microsoft's rules and the FDG treat thrown types as contract; Azure.Core ships exception-type changes in minors under "Bugs Fixed" (CHANGELOG.md:66-69) when the new type is a documented signal. This research sides with Microsoft and with the table as the definition: pinned rows are API, unpinned behaviour is not. Hyrum's Law argues the second half is optimistic; the countermeasure is writing a row the moment a behaviour matters. As of 2026-10 there is no .NET tool that automates this; the nearest in the corpus is a source-compat test (openai-dotnet) and API listings (Azure.Core).
- **Populating a previously-null property.** Microsoft's text calls "changing the returned values" disallowed; most teams ship a newly populated field in a minor. The table decides per row (pinned null = major). A fully conservative reading (always major) would make every ocx improvement a breaking release; a fully liberal one lets `if (ex.ErrorKind is null)` branches break. Revisit if consumers report such branches.
- **Defaults.** Microsoft lists "changing the default value of a property" as disallowed, which would make lengthening `OcxClientOptions.Timeout` a major. This document calls loosening a bound a minor because it cannot convert a success into a failure; that is a judgment, not a measurement, and no row pins it.
- **Source versus package baseline.** Some projects build the previous tag and run the tests on it. That checks the old source, not what shipped (a different compiler, packing step or `Deterministic` flag changes bytes), and doubles the build. The restored nupkg is the choice here; the cost is the cache pitfall.
- **Where the baseline suite should be a separate required check.** ci-ok is the sole required check (CS-CI); this suite is part of the ordinary test job. If a future baseline run becomes slow (network restore of a large package), splitting it is possible without changing the table.
- **Trend.** Package validation gained strict mode and baseline properties over .NET 6-10 ([MSBuild properties](https://learn.microsoft.com/en-us/dotnet/core/project-sdk/msbuild-props#package-validation-properties)); behavioural validation has no first-party equivalent as of 2026-10-11, and I found no announcement of one. xUnit v3 on MTP (4.0.2) is the current target (CS-TEST-05); `-list` output and external serializers (`IXunitSerializer`) make per-row identity cheaper than in v2 ([what's new](https://xunit.net/docs/getting-started/v3/whats-new)).
- **Historical-only advice to ignore:** `[Serializable]` exceptions and binary-serialization round-trip tests (Polly keeps `BinaryDeserialization_Ok` under `#if NETFRAMEWORK` at `TimeoutRejectedExceptionTests.cs:21-31`); `Microsoft.NET.Test.Sdk` and VSTest-era `--logger` flags (CS-TEST-05); `ApiCompatVersion` (CS-API-12).

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/library-change-rules | Microsoft's allowed/disallowed/judgment table for library changes, including the "Exceptions" and "Behavioral changes" sections | updated 2026-04-10 | The normative classification the table encodes; the source of "more derived allowed", "message text allowed", "any other case disallowed" |
| https://raw.githubusercontent.com/dotnet/runtime/main/docs/coding-guidelines/breaking-change-rules.md | dotnet/runtime's own breaking-change rules (primary repo) | main, read 2026-10-11 | Same exception and return-value rules from the team that applies them to the BCL |
| https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/breaking-changes | Microsoft library guidance: source, behaviour and binary breaking changes | 2021, updated 2023 | Defines "behavior breaking change" and says exceptions thrown are in scope |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/categories | Compatibility categories (behavioural, binary, source, backwards, forwards) | updated 2026-01 | "A method may throw a different exception" as the first example of a behavioural change |
| https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/exception-throwing | Framework Design Guidelines, Exception Throwing | 2008 text, page updated 2023 | "Exceptions that are a part of the contract should not change"; "DO NOT have public members that can either throw or not" |
| https://semver.org/spec/v2.0.0.html | SemVer 2.0.0 specification | 2013 | The patch/minor/major wording and the bug-fix definition the decision rule is measured against |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/package-validation/baseline-version-validator | Baseline package validator, with the CP0002 and suppression-file lifecycle | updated 2025-08 | What the API gate checks and how its baseline is bumped; the model for `supersedes` |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/package-validation/overview | Package validation overview | updated 2025-08 | The three validators; no behaviour check among them |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/overview | API compatibility tools overview, strict mode | updated 2025-12 | Confirms the tools compare assemblies and packages |
| https://learn.microsoft.com/en-us/dotnet/core/project-sdk/msbuild-props#package-validation-properties | MSBuild reference for EnablePackageValidation, PackageValidationBaselineVersion, ApiCompat properties | .NET 10 docs | Exact property names shared with `OcxBaselineVersion` |
| https://learn.microsoft.com/en-us/nuget/hosting-packages/local-feeds | Local folder feeds | updated 2025-10 | The offline baseline mechanism used in the fixture |
| https://azure.github.io/azure-sdk/dotnet_introduction.html | Azure SDK .NET design guidelines (errors, versioning) | live | `dotnet-errors-response-failed`, `dotnet-versioning-no-api-breaking`: a mature SDK program's exception-as-contract position |
| https://api.xunit.net/v3/3.0.1/Xunit.ITheoryDataRow.html | xUnit v3 API: `ITheoryDataRow` members | 3.0.1 | Row-level `Skip`, `SkipWhen`, `TestDisplayName`, `Timeout`, `Traits` |
| https://xunit.net/docs/getting-started/v3/whats-new | xUnit v3 what's new | live | Theory row formats, `Assert.SkipWhen/SkipUnless`, `-list`, serializers |
| https://learn.microsoft.com/en-us/dotnet/core/testing/microsoft-testing-platform-intro | Microsoft.Testing.Platform overview | updated 2026-10-01 | The runner model behind `dotnet test --solution` and `--minimum-expected-tests` |
| https://www.hyrumslaw.com/ | Hyrum's Law | 2012 | The statement behind "observable behaviour is depended on" |
| owner__repo `Azure__azure-sdk-for-net@32c48fc3d524:sdk/core/Azure.Core/CHANGELOG.md:38-41,66-69` | Azure.Core release notes | 1.60.0-1.62.0, 2026-06 to 2026-08 | Behaviour changes labelled "Breaking Changes" and "Bugs Fixed" in minors |
| `Azure__azure-sdk-for-net@32c48fc3d524:sdk/core/Azure.Core/tests/FailedResponseExceptionTests.cs:25-58` | `RequestFailedException` tests | 2026 | In-process construction and Message assertion |
| `npgsql__npgsql@9c47244547c2:test/Npgsql.Tests/ExceptionTests.cs:17-58` | `PostgresException` property tests | 2026 | One-failure-many-properties assertion; needs a live server |
| `octokit__octokit.net@7fa5b0fe4a18:Octokit.Tests/Exceptions/ApiExceptionTests.cs:15-74` | `ApiException` tests with malformed bodies | 2026 | Decode-tolerance theory in constructor form |
| `Tyrrrz__CliWrap@7dbc252fa773:CliWrap.Tests/ValidationSpecs.cs:12-61` | Exit-code validation tests | 2026 | The throw-or-return option the SDK forbids |
| `App-vNext__Polly@e4476096da5b:test/Polly.Core.Tests/Timeout/TimeoutRejectedExceptionTests.cs:7-31` and `eng/Library.targets:15-18` | Exception property tests; baseline 8.5.2 | 2026 | Property pinning, `#if NETFRAMEWORK` serialization test, API-only baseline |
| `stripe__stripe-dotnet@dbdca6ba5efc:src/Stripe.net/Stripe.net.csproj:27-28`, `microsoft__vs-threading@f6d817997090:src/Microsoft.VisualStudio.Threading/Microsoft.VisualStudio.Threading.csproj:14` | Baseline version properties | 2026 | How others gate package validation |
| `openai__openai-dotnet@1f0e8829acac:tests/SourceCompatibility/PaginationNamedArgumentCompatibilityTests.cs:11-16` | Compile-only source-compat test | 2026 | The nearest existing "compat suite" in the corpus |
| ../csharp-api.md (CS-API-12/14/15, CS-ERR-01..11) | Sibling consolidation | 2026-10-10 | The error model and bump derivation this work extends |
| ../csharp-api/csharp-api-exceptions-from-exit-codes.md | Wave 1 exception research | 2026-10-10 | Source of the leaf list and property names pinned by the rows |
| ../csharp-async.md (CS-ASYNC-08) | Sibling consolidation | 2026-10-10 | Cancel versus timeout classification |
| ../csharp-crossplatform.md (CS-TEST-01..08) | Sibling consolidation | 2026-10-11 | Test tiers, fake verbs, zero-test gate, contract arming |
| ../csharp-json.md (CS-JSON-05..08) | Sibling consolidation | 2026-10-10 | Decode tolerance policy the rows pin |
| ../csharp-testing/csharp-testing-snapshots-and-property.md (SNAP-2, SNAP-13) | Sibling deep dive | 2026-10-11 | Exception-snapshot verdict, Verify behaviour |
| ../csharp-audit/ocx-cli-contract.md | ocx exit table, error document, report-then-fail | 2026-10 | The facts the rows reflect; code reuse (82) |
| ../csharp-packaging.md (dotnet-release R1-R14) | Release procedure | 2026-10-10 | Where the suite and the baseline bump slot in |
