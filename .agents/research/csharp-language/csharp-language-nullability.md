---
title: "C# nullability posture: project-wide NRT, the `!` policy, nullable attributes, guard clauses"
topic: "Language posture and modern idioms (csharp-quality/language.md) - LG-01, API-13, API-15"
agent: deep-dive researcher (csharp-language-nullability)
model: sonnet
date_researched: 2026-10-11
sources_count: 23
scope: |
  Covers: Nullable=enable project-wide vs per-file #nullable; WarningsAsErrors=nullable vs TreatWarningsAsErrors over the CS86xx/CS9264 family; the null-forgiving operator (IDE0370 measured, grep checks); `= null!` on wire DTOs vs `required`/[JsonRequired]/RespectNullableAnnotations; nullable attributes on Try*/init/throw helpers; nullable as API contract (RS0016/RS0017/RS0036/RS0037, package validation); runtime argument guards per TFM (CA1510-CA1513, CA1062, CA2264); unconstrained `T?`; `is null` vs `== null`.
  Does not cover: ConfigureAwait/async guards beyond one cross-reference (CS-ASYNC), JSON converter design (CS-JSON), XML doc hygiene (code-docs set), non-nullable value-type `Nullable<T>` API design, EF Core nullability.
  Builds on, and where measured evidence disagrees corrects, CS-BUILD-08/15, CS-ERR (R-EXC-23), CS-JSON, CS-API. Corrections are listed in section 1.10 and under Contested.
---

# C# nullability posture

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   - 1.1 [Project-wide Nullable vs per-file #nullable](#11-project-wide-nullable-vs-per-file-nullable)
   - 1.2 [Warning promotion: TWAE vs WarningsAsErrors=nullable](#12-warning-promotion-twae-vs-warningsaserrorsnullable)
   - 1.3 [The null-forgiving operator and IDE0370](#13-the-null-forgiving-operator-and-ide0370)
   - 1.4 [`= null!` and `default!` on wire DTOs](#14--null-and-default-on-wire-dtos)
   - 1.5 [Nullable attributes on public APIs](#15-nullable-attributes-on-public-apis)
   - 1.6 [Nullable annotations as the API contract](#16-nullable-annotations-as-the-api-contract)
   - 1.7 [Runtime guards on public entry points, per TFM](#17-runtime-guards-on-public-entry-points-per-tfm)
   - 1.8 [Unconstrained `T?` and `is null` vs `== null`](#18-unconstrained-t-and-is-null-vs--null)
   - 1.9 [C# 14 / .NET 11 deltas](#19-c-14--net-11-deltas)
   - 1.10 [Corrections to earlier waves](#110-corrections-to-earlier-waves)
   - 1.11 [Verified on the toolchain](#111-verified-on-the-toolchain)
   - 1.12 [Exemplar evidence](#112-exemplar-evidence)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- Set `<Nullable>enable</Nullable>` once, in the root `Directory.Build.props`; a per-file `#nullable enable` in a project whose `Nullable` is off leaves every file without the directive nullable-oblivious, and an oblivious public member accepts `null` from an NRT-enabled consumer with no diagnostic (measured: consumer built clean, then threw `NullReferenceException`).
- The corpus's 562 `#nullable disable` are migration debt (Azure 137, StyleCop 408) except the commented ones: `#nullable disable // <reason>` is a legitimate pattern for unconstrained-generic code (`npgsql__npgsql@9c47244547c2:src/Npgsql/Internal/PgConverter.cs:101`). New code gets zero bare directives.
- With `TreatWarningsAsErrors=true` (CS-BUILD) do NOT add `<WarningsAsErrors>nullable</WarningsAsErrors>`: it is a strict subset (measured: 16 distinct nullable ids all error under both; the non-nullable controls CS0169, CS0219 and the CA rules stayed warnings under `nullable`). Use it only as a stepping stone where TWAE cannot be on yet.
- Never enumerate CS codes (`WarningsAsErrors=CS8600;CS8602;CS8604;CS8618;CS8625`): measured, that promoted 4 of 16 present nullable ids and left 12 as warnings: CS8601/CS8603/CS8619/CS8620/CS8632/CS8669/CS8714/CS8762/CS8763/CS8764/CS8767/CS8774 as warnings. The special value `nullable` is documented and complete (it also covers CS8632, CS8669 and the C# 14 `field` warning CS9264).
- The `!` operator has no gate in the default toolchain, but IDE0370 ("Suppression is unnecessary") exists in SDK 10.0.401 and 11.0 RC1 (absent from 8.0.425) and fires in `dotnet build` once `EnforceCodeStyleInBuild=true` and `dotnet_diagnostic.IDE0370.severity = error` are set. It works per member: it flags a `!` only if EVERY `!` in the member could be removed together, so it is a floor, not a policy; a grep for all `!` is the other half.
- `!` policy: banned in `src/` except (a) `= null!;` on a member that also carries `[JsonRequired]`, (b) a same-line `// null-forgiving: <invariant>` comment. Tests may pass `null!` to guard tests. `default!` is never needed for `Try*` out parameters: `[MaybeNullWhen(false)] out T value` plus `value = default` compiled clean.
- A bare `public string Name { get; init; } = null!;` on a DTO deserialized by STJ silently yields `null` when the JSON omits it (measured) and a later `NullReferenceException`. `required` (first release) or `[JsonRequired]` (later additions) fails the parse with `JsonException` instead. Both accept an explicit `null`; only `RespectNullableAnnotations = true` rejects that (measured on net10 and on net8 + System.Text.Json 10.0.0).
- A `Try*` method without `[NotNullWhen(true)]` forces every caller into `!` or a redundant null check; annotated, the same caller compiles with zero `!` (measured: 5 CS8602 plus 1 CS8618 red, 0 green).
- Attribute set for public APIs: `[NotNullWhen(true)]` on non-generic `out T?`, `[MaybeNullWhen(false)]` on generic `out T`, `[NotNullIfNotNull]` on pass-through returns, `[MemberNotNull]` on init helpers, `[DoesNotReturn]` on throw helpers, `[AllowNull]`/`[DisallowNull]` on setters, avoid `[MaybeNull]` ([dotnet/runtime guidance](https://raw.githubusercontent.com/dotnet/runtime/main/docs/coding-guidelines/api-guidelines/nullability.md)). All live in `System.Diagnostics.CodeAnalysis`, absent on netstandard2.0 (measured CS0246) and need a polyfill there.
- A fully annotated library still needs runtime guards on public entry points: the compiler is silent for oblivious callers, reflection and `null!` (measured: unguarded `NoGuard(null)` -> `NullReferenceException`, guarded -> `ArgumentNullException`). dotnet/runtime says "continue to validate all arguments ... even if the parameter is defined as non-nullable" (nullability.md, Annotation Guidance).
- Guard form on net8.0 and net10.0: `ArgumentNullException.ThrowIfNull`, `ArgumentException.ThrowIfNullOrEmpty`, `ArgumentOutOfRangeException.ThrowIf*`, `ObjectDisposedException.ThrowIf`. CA1510, CA1511 (only for an empty message), CA1512, CA1513 fire on both TFMs and reject the hand-rolled `if (x is null) throw new ArgumentNullException(nameof(x))`.
- CA2264 does NOT flag `ThrowIfNull` on a non-nullable reference parameter (measured silent on `string s`); it flags value types, `nameof` and `new` expressions (measured on `int n`). The CS-BUILD claim that guards on non-nullable parameters trip CA2264 is wrong; guards plus Nullable=enable are the intended pairing.
- CA1062 is the only analyzer that checks the "guard public entry points" rule: it fires on an unguarded dereference of a non-null-annotated public parameter, follows a call into a private helper, accepts `ThrowIfNull`/`ThrowIfNullOrEmpty`/`ThrowIfNullOrWhiteSpace`, and stays silent when a parameter is only stored or passed to a BCL call. Whether to set it to `warning` for `src/` (reversing CS-BUILD-15) is the consolidator's call; both fallbacks are given.
- Changing a shipped annotation (`string` -> `string?` on a parameter or return, either direction) is caught by PublicApiAnalyzers (RS0016 + RS0017 pair, warning severity by default) and NOT by package validation: measured exit 0 for all four directions, even with `EnableStrictModeForBaselineValidation` and `EnableRuleAttributesMustMatch`, while a removed member gave CP0002 exit 1.
- `ArgumentNullException.ThrowIfNull` inside an `async` method makes a Faulted Task, not a synchronous throw (measured); only a non-async wrapper throws synchronously. CS-ERR R-EXC-23 says "synchronously".
- Unconstrained `T?` on a value type argument is the same `T`, not `Nullable<T>`: `Find<int>` miss returns `0` (measured `Int32 value=0`), so a "not found" API needs `where T : struct` (`int?`), `where T : class`, or a `bool Try*`.
- `== null` / `!= null` calls a user-defined operator; `is null` / `is not null` never does (measured with an overload that lies: `real != null` printed `False`, `real is not null` printed `True`). No IDE or CA rule enforces `is null` (IDE0041 covers only `ReferenceEquals(x, null)`), so a grep is the only check.
- The C# 14 `field` keyword changes the init warning: a field-backed property with no initializer reports CS9264, not CS8618 (measured); `WarningsAsErrors=nullable` and TWAE both cover it; a grep for `CS8618` alone would miss it.

## Findings

### 1.1 Project-wide Nullable vs per-file #nullable

**What the platform says.** The nullable context has two independent flags, annotations and warnings; `<Nullable>` sets both, `#nullable enable|disable|restore [warnings|annotations]` overrides them for a region ([language ref](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/nullable-reference-types), 2026-05-15). Microsoft's migration page states the end state for every strategy: "the project sets `<Nullable>enable</Nullable>` and contains no `#nullable` preprocessor directives" ([migration strategies](https://learn.microsoft.com/en-us/dotnet/csharp/advanced-topics/update-applications/nullable-migration-strategies), 2026-05-04). The same page lists `#nullable disable` per file as the strategy for "active codebases" mid-migration and `Nullable=disable` plus `#nullable enable` per file for "stable libraries that won't take new feature work".

So the 221 enable / 562 disable directive split in the corpus ([exemplar-language-shape.md section 3.1](../csharp-audit/exemplar-language-shape.md)) is not one pattern. Classification, from the exemplar tree:

| Directive population | Meaning | Evidence |
|---|---|---|
| bare `#nullable disable` in files of an enabled project | migration debt | Azure.Core 137, StyleCop 408 (shape audit) |
| `#nullable disable // <reason>` around unconstrained-generic code | deliberate, local | `npgsql__npgsql@9c47244547c2:src/Npgsql/Internal/PgConverter.cs:101` ("T may or may not be nullable depending on the converter's read behavior"), also `:113`, `:348`, `:355` |
| `#nullable enable` per file in a project that does not enable NRT | the "stable library" strategy, on purpose | `App-vNext__Polly@e4476096da5b:src/Polly/Polly.csproj:10` ("We do not plan on enabling nullable annotations for Polly", `NoWarn` `CA1510;RS0037` on line 11) with `#nullable enable` in `src/Polly/Retry/RetryEngine.cs:1` |
| `#nullable enable` in source-only polyfill files shipped into consumers' compilations | context of the consuming project is unknown | `microsoft__testfx@7226b0c74729:src/Polyfills/NullableAttribtues.cs:4` |
| `#nullable enable` emitted by a source generator | generated files get a disabled context otherwise | `microsoft__testfx@7226b0c74729:src/TestFramework/TestFramework.SourceGeneration/AssertInterpolatedStringAppendMethodsGenerator.cs:112`; STJ's own generator emits `#nullable enable annotations` + `#nullable disable warnings` (measured in `f4-dto/obj/.../Strict.RequiredDto.g.cs:3-4`) |

Generated files (`.g.cs`, `.generated.cs`, `<auto-generated>` header, `generated_code = true`) get a disabled context regardless of the project setting, and generators opt back in with a directive ([language ref](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/nullable-reference-types)). This is why `string?` in a hand-written `x.g.cs` yields CS8669 (measured).

**The hazard of the "stable library" strategy for a new SDK.** In a project with `Nullable` off, a file without the directive is nullable-oblivious. Fixture `f1-posture`: `lib-perfile` (Nullable unset) has `A.cs` with `#nullable enable` and `B.cs` without; the consumer is Nullable=enable + TWAE:

```csharp
// consumer Program.cs
string? maybe = null;
_ = Annotated.Len(maybe);                 // annotated file:  error CS8604
_ = Unannotated.Len(null);                // oblivious file:  silent
Console.WriteLine(Unannotated.Find("nope").Length);   // oblivious return: silent, NullReferenceException at run time
```

Red (per-file): exactly one error (CS8604 for the annotated member); the two oblivious lines produce nothing, and `dotnet run` printed `RUNTIME NullReferenceException`. Green (project-wide, `lib-project`): three errors (CS8604, CS8625, CS8602), one per planted bug. An agent that creates a new file and forgets the directive silently opens a hole; with the project-wide switch there is no per-file state to forget. `lib-perfile/C.cs` (`string?` without directive) also showed CS8632 as a warning.

**Verdict.** Greenfield: project-wide `enable`, zero directives except the two documented exceptions (commented `disable` for unconstrained generics; generated/polyfill files). `Nullable` unset is the SDK default (`disable`) and must be set explicitly: `dotnet msbuild lib-perfile.csproj -getProperty:Nullable` printed an empty line, `lib-project` printed `enable`.

### 1.2 Warning promotion: TWAE vs WarningsAsErrors=nullable

Docs: "In addition to the list of warning IDs, you can also specify the string `nullable`, which treats all warnings related to nullability as errors" and "`TreatWarningsAsErrors` only impacts the C# compiler, not any other MSBuild tasks" ([errors-warnings](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-options/errors-warnings), 2025-05-30).

Fixture `f2-warnings` (net10.0, `Nullable=enable`, `AnalysisLevel=10.0-all`, probe plants 16 nullable ids plus CS0169/CS0219 and several CA rules). Four modes, result per id:

| id | meaning | none | `WarningsAsErrors=nullable` | TWAE | explicit `CS8600;CS8602;CS8604;CS8618;CS8625` |
|---|---|---|---|---|---|
| CS8600 | null/maybe-null to non-nullable | W | **E** | E | **E** |
| CS8601 | possible null assignment | W | E | E | W |
| CS8602 | dereference of maybe-null | W | E | E | **E** |
| CS8603 | possible null return | W | E | E | W |
| CS8604 | maybe-null argument | W | E | E | **E** |
| CS8618 | uninitialized non-nullable member | W | E | E | **E** |
| CS8619 / CS8620 | nested nullability mismatch (value / argument) | W | E | E | W |
| CS8625 | null literal to non-nullable | W | E | E | **E** |
| CS8632 | `?` outside an annotations context | W | E | E | W |
| CS8669 | `?` in generated code without directive | W | E | E | W |
| CS8714 | `notnull` constraint violated | W | E | E | W |
| CS8762 / CS8763 | `[NotNullWhen]` / `[DoesNotReturn]` violated by the body | W | E | E | W |
| CS8764 / CS8767 | override / interface-impl nullability mismatch | W | E | E | W |
| CS8774 | `[MemberNotNull]` member null at exit | W | E | E | W |
| CS0169 / CS0219 (control) | non-nullable compiler warnings | W | **W** | E | W |
| CA1062, CA1822, CA1050... (control) | analyzer warnings | W | **W** | E | W |

(Reproduce: `./b.sh f2-warnings -p:Mode=<none|nullable|twae|explicit>`; CS8602 was observed in the first run and drops out of later runs only because flow state after a preceding `Take(s)` makes `s` not-null.)

Conclusions: (1) `nullable` is complete for the nullable family and touches nothing else; (2) with TWAE on it adds nothing, so adding it is the redundancy CS-BUILD already forbids; (3) a hand-written CS-code list misses 12 of 16 ids in this probe - an agent that "tightens" nullable by listing the five codes it knows weakens the gate; (4) CS8632 and CS8669 are in the group, so a stray `?` in a no-context file or generated file fails the build only under `nullable` or TWAE. The `nullable` shorthand also works in `<NoWarn>`; ban that (see the rules).

`WarningsAsErrors=nullable` is the right stepping stone in exactly one situation: a repo that cannot enable TWAE yet but wants the nullable family hard. For the ocx C# SDK (greenfield, TWAE per CS-BUILD-06) it has no role.

### 1.3 The null-forgiving operator and IDE0370

**Platform stance.** "Use `!` sparingly. Each occurrence is a place the compiler can no longer protect you. Prefer adding a null check, restructuring the code, or annotating the relevant API" ([NRT overview](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/null-safety/nullable-reference-types), 2026-05-04) and "Use the null-forgiving operator `!` only when you can guarantee a value isn't null but can't express that guarantee in the type system" ([resolve warnings](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/null-safety/common-tasks/resolve-warnings), 2026-05-04). The operator "has no effect at run time" ([null-forgiving](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/null-forgiving), 2026-01-20). Its one blessed use is test code passing `null!` to exercise argument validation (same page). Migration cleanup: "Remove `null!` and `default!` initializers that you added only to silence warnings during migration" (migration strategies).

**IDE0370 identity.** The rule ID is IDE0370, title "Remove unnecessary suppression", subcategory "Unnecessary code rules (suppression preferences)", options none ([IDE0370](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/style-rules/ide0370), 2025-11-08). Do not confuse with IDE0080 (`o !is string`, a different "unnecessary suppression operator" rule; Microsoft's IDE0080 page was returned by search, not fetched here).

**Present in the pinned SDKs?** `IDE0370` appears in `sdk/10.0.401/.../codestyle/cs/build/config/analysislevelstyle_all.globalconfig:418-420` (`severity = warning`) and `analysislevelstyle_none.globalconfig:434-436` (`none`), in `Microsoft.CodeAnalysis.CSharp.CodeStyle.dll`, and in 11.0.100-rc.1; a recursive grep of `sdk/8.0.425` finds no hit. So the SDK 10.0.401 pin (CS-BUILD) is what makes the rule available; it is not an SDK 8 feature.

**How it decides.** Roslyn's analyzer removes every candidate `!` from a member, recompiles with nullable diagnostics enabled, and flags the group only if the member then has no errors or warnings: "all suppressions in a member must be removable together to be flagged" because per-suppression checking is "just far too slow" ([Roslyn source, UnnecessaryNullableWarningSuppressionsUtilities](https://source.dot.net/Microsoft.CodeAnalysis.CSharp.CodeStyle/src/roslyn/src/Analyzers/CSharp/Analyzers/RemoveUnnecessarySuppressions/UnnecessaryNullableWarningSuppressionsUtilities.cs.html), summarized by the fetch tool; code fix: [CSharpRemoveUnnecessaryNullableWarningSuppressionsCodeFixProvider](https://source.dot.net/Microsoft.CodeAnalysis.CSharp.Features/src/roslyn/src/Analyzers/CSharp/CodeFixes/RemoveUnnecessarySuppressions/CSharpRemoveUnnecessaryNullableWarningSuppressionsCodeFixProvider.cs.html)). Consequence, measured in `f3-bang-mixed`: a member with one removable `!` and one needed `!` produces no IDE0370 at all. Meziantou's write-up of the alternative, an external tool that removes each operator in turn and keeps it if the compiler then warns, is [Automating Null-Forgiving Operator Removal](https://www.meziantou.net/automating-null-forgiving-operator-removal-in-csharp-projects.htm) (post dated 2025-02-06 or 2025-06-02; the date is ambiguous in the page).

**Does it fire at build?** Yes, with two conditions, both measured (`f3-bang`, net10.0, SDK 10.0.401):

| setup | result |
|---|---|
| no `.editorconfig` line, `EnforceCodeStyleInBuild=true` | exit 0, silent |
| `dotnet_diagnostic.IDE0370.severity = warning`, `EnforceCodeStyleInBuild` off | exit 0, silent |
| `severity = warning` + `EnforceCodeStyleInBuild=true` | 3 x `warning IDE0370`, exit 0 |
| `severity = error` + `EnforceCodeStyleInBuild=true` | 3 x `error IDE0370: Suppression is unnecessary`, exit 1 |
| `-p:AnalysisLevelStyle=latest-all`, no per-rule line | fires (the SDK globalconfig sets it to warning) |
| `dotnet format style --diagnostics IDE0370 --severity info --verify-no-changes --no-restore` | red tree exit 2, green twin exit 0 |

Red code (`f3-bang/Bang.cs`) and green twin (`f3-bang-green/Bang.cs`):

```csharp
// RED: every ! in these members is removable -> IDE0370 at lines 5, 6, 11
public static int OnlyUnnecessary(string nonNull) { string a = nonNull!; return a!.Length; }
public static int NewBang() { List<string> names = new()!; return names.Count; }

// GREEN
public static int OnlyUnnecessary(string nonNull) { string a = nonNull; return a.Length; }
public static int NewBang() { List<string> names = new(); return names.Count; }
public static int Needed(string? maybe) => maybe!.Length;   // needed: not flagged
public static string NullBang() => null!;                   // deliberate: not flagged (red tree has it too)
```

Not flagged in either tree: `maybe!.Length` on a `string?` (needed) and `null!` (a deliberate lie, the compiler can't call it unnecessary). So IDE0370 removes "dead" suppressions; it cannot judge "deliberate" ones. The policy needs the grep.

**Grep for `!`.** The shape audit's PCRE (`(?<=[\w\)\]>])!(?=[\.\)\;\,\[\]\s\}]|$)`) worked as a detector on the fixture: it matched `nonNull!;`, `maybe!.Length`, `!a!.Equals(b)`, `default!` and `null!` and skipped `!=`, `"Hello!"` and `s + "!"` (`f9-greps`, green tree has all of these and produced no hits). Comments ending in ` !` match; accept the noise.

### 1.4 `= null!` and `default!` on wire DTOs

The corpus pattern: `public string Name { get; set; } = null!;` for "set by the deserializer" (`npgsql__npgsql@9c47244547c2:src/Npgsql.SourceGenerators/NpgsqlConnectionStringBuilderSourceGenerator.cs:127-129`). The platform's recommended alternatives for CS8618 are constructor parameter, `required`, a real default, or `string?` ([resolve warnings](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/null-safety/common-tasks/resolve-warnings)), and it warns against sentinel defaults.

STJ treats C# `required` and `[JsonRequired]` identically: "both map to the same piece of metadata, `JsonPropertyInfo.IsRequired`" ([required properties](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/required-properties), 2024-10-22). Nullability is a separate axis: "System.Text.Json treats required and non-nullable properties as orthogonal concepts"; `RespectNullableAnnotations` (opt-in, .NET 9+) rejects an explicit `null` for a non-nullable property but "a missing property doesn't throw" ([respect nullable annotations](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/nullable-annotations), 2025-10-20). Limits: no enforcement on top-level types, collection element types or generic members.

Fixture `f4-dto` (net10.0, source-generated context, TWAE, `Nullable=enable`; `Plain` = default options, `Strict` = `[JsonSourceGenerationOptions(RespectNullableAnnotations = true)]`):

| DTO | `{}` (omitted) | `{"Name":null}` | `{"Name":"x"}` |
|---|---|---|---|
| `string Name {get;init;} = null!` Plain | **ok, `Name == null`** | **ok, null** | ok |
| same, Strict | **ok, null** | JsonException (does not allow null) | ok |
| `required string Name` Plain | JsonException (missing required) | **ok, null** | ok |
| `required string Name` Strict | JsonException (missing) | JsonException (null) | ok |
| `[JsonRequired] string Name = null!` Plain | JsonException (missing) | **ok, null** | ok |
| `[JsonRequired] string Name = null!` Strict | JsonException (missing) | JsonException (null) | ok |
| `string? Name` | ok, null | ok, null | ok |

Run-time consequence of the bare `= null!`: `JsonSerializer.Deserialize("{}", Plain.Default.BangDto)!.Name.Length` -> `NullReferenceException` (printed `BangDto.Name.Length -> NullReferenceException`). The same `Strict` rows reproduced on `net8.0` with `System.Text.Json` 10.0.0 (`f4-dto-net8`), so no `#if` is needed (consistent with the CS-JSON net8 rule).

Two things the docs get wrong or leave open, both measured on SDK 10.0.401: the required-properties page says source generation "won't compile if you use the `required` modifier"; `RequiredDto` with `required` compiled and enforced under a source-generated context. And `RespectNullableAnnotations = true` does not catch omission, so `= null!` stays unsafe even with the strict option; only `required`/`[JsonRequired]` close that hole.

Decision matrix for the SDK's data classes (CS-API: sealed class, `required`/`init`; "later wire-mandatory members use `[JsonRequired]`" because `required` is fixed at a type's first release):

| member situation | declaration | `= null!`? |
|---|---|---|
| wire-mandatory, in the type's first release | `public required string Name { get; init; }` | no |
| wire-mandatory, added in a later release | `[JsonRequired] public string Name { get; init; } = null!;` | yes, only here: `required` would break source callers, and CS8618 would fire without an initializer |
| optional on the wire | `public string? Name { get; init; }` | no |
| optional with a real default | `public IReadOnlyList<string> Tags { get; init; } = [];` | no |
| any member where ocx may send an explicit `null` | `string?` | no |

Add `RespectNullableAnnotations = true` on the strict (closed-schema) context only (attribute-only per CS-JSON; it is a proposal for CS-JSON, see Contested). `default!` has no DTO use at all. `ChaosFaultStrategyOptions.OnFaultInjected { get; set; } = default!` (`App-vNext__Polly@e4476096da5b:src/Polly.Core/Simmy/Fault/ChaosFaultStrategyOptions.cs:21`) is the same smell on a `?`-typed member.

### 1.5 Nullable attributes on public APIs

Microsoft's reference table ([nullable-analysis](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/attributes/nullable-analysis), 2026-01-14) and dotnet/runtime's authoritative annotation guidance ([nullability.md](https://raw.githubusercontent.com/dotnet/runtime/main/docs/coding-guidelines/api-guidelines/nullability.md)) agree on the following rules, which the fixture then exercised.

| situation | attribute | notes |
|---|---|---|
| non-generic `Try*`: `bool TryX(..., out string? v)` | `[NotNullWhen(true)] out string? v` | "the argument should be nullable because a failed call will generally store null into the argument, and it should be `[NotNullWhen(true)]`" (nullability.md) |
| generic `Try*`: `bool TryX<T>(..., out T v)` | `[MaybeNullWhen(false)] out T v`, assign `default` | no `!`; if consumer's T is nullable the attribute is a no-op |
| method that returns non-null whenever an argument is non-null | `[return: NotNullIfNotNull(nameof(s))]` | keeps `string? Trim(string? s)` callable without a check on a literal |
| helper that initializes fields called from ctors | `[MemberNotNull(nameof(_f))]` (or `[MemberNotNullWhen(bool, ...)]`) | else CS8618 at every ctor ("the compiler doesn't track field assignments through all helper methods") |
| throw helper | `[DoesNotReturn]` / `[DoesNotReturnIf(true)] bool cond` | else CS8602 after the guard |
| validator that takes `object?` | `[NotNull] object? o` | |
| property: getter never null, setter accepts null | non-nullable type + `[AllowNull]` | |
| property: getter may be null, setter rejects null | nullable type + `[DisallowNull]` | |
| `[MaybeNull]` | avoid | runtime has 7 uses; `T?` is almost always better (nullability.md) |
| overrides of `Equals(object? obj)` | `[NotNullWhen(true)] object? obj` | nullability.md |

Fixture `f5-attrs` (net10.0, Nullable, TWAE; identical `Use.cs` caller with zero `!`):

```csharp
// RED Api.cs                                           // GREEN Api.cs
public bool TryGet(string key, out string? value)  ->  public bool TryGet(string key, [NotNullWhen(true)] out string? value)
public static bool TryFind<T>(..., out T value)    ->  public static bool TryFind<T>(..., [MaybeNullWhen(false)] out T value)
  { ...; value = default!; return false; }                { ...; value = default; return false; }
public static void Require(object? o, string n)    ->  public static void Require([NotNull] object? o, [CallerArgumentExpression(nameof(o))] string n = "")
public static string? Trim(string? s)              ->  [return: NotNullIfNotNull(nameof(s))] public static string? Trim(string? s)
public string? Label { get; set; }                 ->  [AllowNull] public string Label { get; set; }   // backing field = "default"
public static void Fail() => throw ...             ->  [DoesNotReturn] public static void Fail() => throw ...
void Init() { _id = "id"; }                        ->  [MemberNotNull(nameof(_id))] void Init() { _id = "id"; }
```

RED: `Build FAILED`, 6 errors (CS8618 at the ctor plus 5 x CS8602 in `Use.cs` at the `TryGet`, `Require`, `Trim`, `Label`, `Fail` sites; `TryFind` compiles because `T` = `string` there, and the lie is hidden inside the `default!` in the library). GREEN: 0 errors, exit 0. Note the attributes "don't enable more checks on your implementation" for the declaring method; CS8762/CS8763/CS8774 show when the body violates the contract (f2 probe).

**TFM reach.** The attributes ship in the shared framework of the net8.0 and net10.0 targets (measured: `f5-attrs/green` compiles; the runtime annotated all its APIs by .NET 5, [NRT overview](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/null-safety/nullable-reference-types)). On `netstandard2.0` (not the default TFM, CS-BUILD-02) the compile fails: `error CS0246: The type or namespace name 'NotNullWhenAttribute' could not be found` plus the same for `MaybeNullWhen`, `NotNull`, `CallerArgumentExpression` (`f5-attrs/green-ns2`). Remedies seen in the corpus: a source-only polyfill (`App-vNext__Polly@e4476096da5b:src/LegacySupport/NullableAttributes.cs:56` defines `internal sealed class MaybeNullWhenAttribute`), the Polyfill package (`Humanizr__Humanizer@4574b93883bf:src/Humanizer/Humanizer.csproj:12`), or an annotated reference-assembly package (`xunit__xunit@0c7aa4991fa3:src/Directory.Build.targets:28-35` uses `TunnelVisionLabs.ReferenceAssemblyAnnotator` so ns2.0/net4x BCL calls are annotated). The BCL on ns2.0 is oblivious, so flow warnings differ per TFM (CS-BUILD tfm-reach finding).

### 1.6 Nullable annotations as the API contract

dotnet/runtime treats annotations as part of the contract: "Nullability annotations are considered to represent intent ... Any deviation from that intent on the part of an implementation should be considered an implementation bug", and annotations are changed rarely and deliberately because they change consumers' warnings (nullability.md, Breaking Change Guidance). Microsoft's migration page ends with: "Spot-check the public API. Every member that returns or accepts `null` should be annotated with `?`. The annotations are part of your contract once the package ships."

Rules of thumb from nullability.md used below: a parameter is non-nullable if the method throws on `null` or would dereference it; nullable if documented to accept null, normalized, or optional-with-null-default; a return/out is nullable if `null` may be returned in any circumstance; prefer nullable on genuine disagreement.

**What tracks it.** PublicApiAnalyzers records the annotation in each entry (`string!`, `string?`, `~` prefix for oblivious) once the file starts with `#nullable enable` ([PublicApiAnalyzers.Help.md](https://raw.githubusercontent.com/dotnet/roslyn-analyzers/main/src/PublicApiAnalyzers/PublicApiAnalyzers.Help.md)). RS0037 = file lacks `#nullable enable`; RS0036 = entry lacks annotations (setup and bootstrap order are covered by CS-API evolution gates and not repeated). Polly shows the deliberate-opt-out form: `NoWarn` of `RS0037` in an unannotated project (`Polly.csproj:11`).

**Does a change to an annotation get caught?** Fixture `f8-annot`: `Acme.Nul` v1 packed to `baseline/Acme.Nul.1.0.0.nupkg` with four members whose annotation then changes in v2:

| change in v2 | caller impact | PublicApiAnalyzers (Shipped unchanged, v2 build) | package validation (baseline = v1 nupkg) |
|---|---|---|---|
| param `string` -> `string?` | none | RS0016 (new text) + RS0017 (old text gone) | exit 0 |
| return `string?` -> `string` | none | RS0016 + RS0017 | exit 0 |
| param `string?` -> `string` | new CS8604 for callers | RS0016 + RS0017 | exit 0 |
| return `string` -> `string?` | new CS8602 for callers | RS0016 + RS0017 | exit 0 |

All four directions: 4 x RS0016 and 4 x RS0017 (warning severity; build `exit=0` without TWAE). Package validation (`-p:EnablePackageValidation=true -p:PackageValidationBaselinePath=<v1 nupkg>`) returned exit 0 in three configurations: default, `+EnableRuleAttributesMustMatch=true`, and `+EnableStrictModeForBaselineValidation=true +EnableStrictModeForCompatibleTfms=true +AssemblyVersion=1.0.0.0`. Control, same harness, remove one member: `error CP0002: Member 'string Acme.Api.TightenParam(string?)' exists on [Baseline] ... but not on ...`, exit 1. The ApiCompat diagnostic table lists no nullable-annotation rule ([diagnostic-ids.md](https://raw.githubusercontent.com/dotnet/docs/main/docs/fundamentals/apicompat/diagnostic-ids.md); `grep -i nullab` over it and the package-validation overview returned nothing). So the annotation contract has exactly one mechanical gate: PublicApiAnalyzers with RS0016/RS0017 raised to `error` (already CS-API rule 4). Package validation does not substitute for it.

Policy for what an annotation change is: tightening a parameter (`string?` -> `string`) or loosening a return (`string` -> `string?`) is source-visible to NRT callers and is a minor/major-by-judgement change recorded in the release notes; loosening a parameter or tightening a return is non-breaking. The analyzer cannot tell them apart, so the release reviewer reads the Unshipped diff (CS-API step).

### 1.7 Runtime guards on public entry points, per TFM

**The question.** Does an annotated, TWAE-clean library still guard? Microsoft's own runtime team says yes: "**DO** continue to validate all arguments as you would have prior to nullability warnings ... even if the parameter is defined as non-nullable. Many consumers will not have nullability checked enabled, either because they're using a language other than C#, they're using an older version of C#, they simply haven't opted-in ..., they've explicitly suppressed warnings, or the compiler isn't able to detect the misuse" and "**DO NOT** remove existing argument validation when annotating existing public/protected APIs" (nullability.md, Annotation Guidance). In-tree evidence of the same practice in an NRT+TWAE repo: `Humanizr__Humanizer@4574b93883bf:src/Humanizer/ChineseFinancialNumeralExtensions.cs:53` (`ArgumentNullException.ThrowIfNull(culture);`) under `Directory.Build.props:5,8` (`Nullable=enable`, `TreatWarningsAsErrors=true`).

Measured (`f6-guards`; library Nullable=enable; consumer `oblivious` has Nullable off, as a VB/F#/legacy-C# caller would):

| call | result |
|---|---|
| `Guarded.NoGuard(null)` (`s.Length`, no guard) | `NullReferenceException: Object reference not set to an instance of an object.` |
| `Guarded.Guard(null)` (`ArgumentNullException.ThrowIfNull(s)`) | `ArgumentNullException: Value cannot be null. (Parameter 's')` |
| `Guarded.Hand(null)` (hand-rolled throw) | `ArgumentNullException` (same) |
| reflection `Invoke(null, [null])` on either | `TargetInvocationException` wrapping the above |

The consumer built with zero diagnostics for the `null` argument in all cases: the library's annotation reaches only NRT-enabled callers.

**Which guard form, by TFM.** `ThrowIfNull` exists on .NET 6+ ([API](https://learn.microsoft.com/en-us/dotnet/api/system.argumentnullexception.throwifnull), monikers net-6.0 through net-11.0, page 2026-07-01); the other helpers are .NET 7/8+ (`ThrowIfNullOrEmpty`, `ThrowIfNullOrWhiteSpace`, `ArgumentOutOfRangeException.ThrowIf*`, `ObjectDisposedException.ThrowIf`), all present on the net8.0 floor. Analyzer behaviour per TFM, `AnalysisLevel=10.0-all`, same `Guarded.cs` built with `-p:Tfm=<x>`:

| TFM | diagnostics on the probe |
|---|---|
| net8.0 | CA1510 (hand-rolled null throw), CA1511 (empty-message throw), CA1512 (`ArgumentOutOfRangeException` negative), CA1513 (`ObjectDisposedException`), CA2264 (`ThrowIfNull(int)`), CA1062 (unguarded deref) |
| net10.0 | identical set |
| netstandard2.0 | **CS0117** `ThrowIfNull` missing (2x); CA1510-1513 never fire; CA1062 fires |
| netstandard2.0 + `Polyfill` 11.4.3 + `PolyArgumentExceptions=true` | compiles; CA1510-1513 **silent**; CA1062 fires |

CA1510 is "As suggestion" by default in .NET 10 ([CA1510](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1510), page updated 2026-04-02); `AnalysisLevel 10.0-all` (CS-BUILD) makes it a warning, hence an error under TWAE. CA1511 fires only for the empty message form (`throw new ArgumentException("", nameof(s))`; the docs example, [CA1511 source](https://raw.githubusercontent.com/dotnet/docs/main/docs/fundamentals/code-analysis/quality-rules/ca1511.md)); a message such as `"empty"` was silent (measured), so CA1511 cannot be relied on to modernize every `IsNullOrEmpty` throw. On ns2.0 + Polyfill the helper compiles (extension members, needs C# 14, CS-BUILD tfm-reach) but analyzers cannot see it, so the helper form there is a convention, not a gate.

**CA2264 is not a verdict on guards.** The rule ([CA2264](https://raw.githubusercontent.com/dotnet/docs/main/docs/fundamentals/code-analysis/quality-rules/ca2264.md), enabled as warning in .NET 10) flags "non-nullable structs (except `Nullable<T>`), type parameters known to be non-nullable structs, `nameof()` expressions, and `new` expressions". Measured on net8.0 and net10.0: `ThrowIfNull(n)` for `int n` -> `warning CA2264: Calling 'ArgumentNullException.ThrowIfNull' and passing a non-nullable value is a no-op`; `ThrowIfNull(s)` for `string s` -> no CA2264. See 1.10.

**CA1062.** Docs: "All reference arguments that are passed to externally visible methods should be checked against `null`" ([CA1062](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1062), "Enabled by default in .NET 10: No", page updated 2026-04-02). Measured behaviour with `Nullable=enable` at `10.0-all` (`f6-guards/lib`):

| method shape | CA1062 |
|---|---|
| `NoGuard(string s) => s.Length` | fires (even though `s` is non-nullable) |
| `Guard(string s)` with `ThrowIfNull(s)` | silent |
| `ArgumentException.ThrowIfNullOrEmpty(s)` / `ThrowIfNullOrWhiteSpace(s)` then deref | silent |
| `Forward(string s) => Inner(s)` where private `Inner` dereferences | fires (interprocedural) |
| `Ctor(string s) => new Uri(s)...`, `Store(string s) { _held = s; }` | silent (BCL param / store only) |

So CA1062 mechanically enforces "guard a public parameter before a dereference reachable in the same compilation", with false negatives for stored or BCL-forwarded values. CS-BUILD-15 sets it to `none` (noise with Nullable on). Reasonable positions: keep `none` and verify by reading heuristic (below); or `warning` for `src/` as the only mechanical check. The cost side measured: it fired on every unguarded deref in the probe, i.e. exactly the lines that need a guard under the dotnet/runtime rule; for a small sealed surface (`OcxClient` plus option/data types) the noise is the work item itself.

**Where to guard / not guard.**
- Guard: public and protected members of public types, constructors of public types, public static factories (`OcxClient.CreateAsync`), parameters that are dereferenced, stored, or forwarded to oblivious code.
- Do not guard: `internal`/`private` members (dotnet/runtime: "such use can be removed or replaced by asserts"), value types (CA2264), parameters typed `T?` that accept null, the `this` parameter of extension methods unless you want CA1062's `exclude_extension_method_this_parameter` option off.
- Async: inside an `async Task` method a thrown `ArgumentNullException` surfaces on the returned Task. Measured (`f12-asyncguard`): `async Task Async(string s) { ArgumentNullException.ThrowIfNull(s); await Task.Yield(); }` returned `status=Faulted` with no synchronous throw; a non-async wrapper `Task Wrapper(string s) { ThrowIfNull(s); return Inner(s); }` threw synchronously. Callers that `await` immediately cannot tell the difference; CS-ERR R-EXC-23 ("thrown synchronously") is only true for the wrapper form.

### 1.8 Unconstrained `T?` and `is null` vs `== null`

**`T?` semantics (C# 9+).** "If a type parameter `T` is substituted with a reference type, then `T?` represents a nullable instance of that reference type. If `T` is substituted with a value type, then `T?` represents an instance of `T`" ([csharplang proposal](https://raw.githubusercontent.com/dotnet/csharplang/main/proposals/csharp-9.0/unconstrained-type-parameter-annotations.md)); `Nullable<T>` only with a `struct` constraint ([language ref, Generics](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/nullable-reference-types)). Measured (`f7-equality`):

```csharp
public static T? Find<T>(IEnumerable<T> src, Func<T, bool> p) { ...; return default; }      // unconstrained
var i = Gen.Find([0, 1, 2], x => x > 5);       // type=Int32 value=0  (a miss is indistinguishable from 0)
int? j = Gen.FindStruct([0, 1, 2], x => x > 5);// where T : struct -> null on miss
string? s = Gen.FindClass(["a"], x => x == "z");// where T : class  -> null on miss
var k = Gen.Find<int?>([0, 1], x => x > 5);    // T = int? -> null on miss
```

`i is null` on the first result does not compile (`error CS0037: Cannot convert null to 'int'`). Rule for the SDK: a lookup that can miss is `bool TryX(..., [MaybeNullWhen(false)] out T v)` (generic) or `[NotNullWhen(true)] out X? v` (reference), or the `struct`/`class` constrained pair; unconstrained `T?` return is a bug-in-waiting. `where T : notnull` documents "no nulls in", and `Box<string?>` is then CS8714 (f2 probe).

**`is null` vs `== null`.** `==`/`!=` dispatch to a user-defined operator when one exists; `is null`/`is not null` are pattern tests that never call it. Measured: with `Liar` overloading `==` to `true` and `!=` to `false`: `n == null` -> True, `real != null` -> **False** for a real object, `real is null` -> False, `real is not null` -> True, `n is null` -> True. `Equals`-style value types in an SDK (the CS-API open-enum `readonly record struct`) are exactly where overloads appear. Enforcement: IDE0041 ("Null check can be simplified") fired only on `ReferenceEquals(o, null)` (`f7-ide`, warning with `ECSB`); no IDE or CA rule rewrites `x == null` (fixture: `s == null`, `s != null`, a user-operator type and an unconstrained generic produced no diagnostic). The check is a grep (`[=!]=\s*null\b`). Expression-tree contexts (LINQ providers) are the one place `is null` is not allowed; the SDK has none.

### 1.9 C# 14 / .NET 11 deltas

- **`field` keyword and CS9264.** `public string A { get; set => field = value ?? throw new ArgumentNullException(nameof(value)); }` with no initializer produced `warning CS9264: Non-nullable property 'A' must contain a non-null value when exiting constructor` (CS8618's sibling for field-backed properties); `WarningsAsErrors=nullable` made it an error (`f10-field`). Properties with an initializer (`... } = "";`) or an `[AllowNull]` getter-default form (`get => field ?? ""`) were clean. Review heuristic: when a property uses `field`, the CS8618 grep misses it; rely on the build, not on text search.
- **SDK 11.0 RC1** (11.0.100-rc.1.26425.128): the f2 probe produced the same 16 nullable ids; `f3-bang` produced the same IDE0370 diagnostics; `f5-attrs/red` the same CS8618/CS8602. No nullable-analysis difference found; C# 15 specifics for nullability were not found in the pages read (the language-options page notes a C# 15 memory-safety preview, outside this topic).
- `ArgumentNullException.ThrowIfNull(void*, string?)` is .NET 7+ and `[CLSCompliant(false)]`; irrelevant to reference parameters.

### 1.10 Corrections to earlier waves

1. **CS-BUILD (analyzer-gate), "Fixes CA1062 by sprinkling ThrowIfNull ... CA2264 ... the guard is redundant".** Measured false: CA2264 targets value types, `nameof` and `new`, not non-nullable reference parameters. A guard on `string s` stays silent on net8.0 and net10.0 and is the dotnet/runtime-recommended practice. The wrong claim would make agents delete entry-point guards.
2. **CS-ERR R-EXC-23, "thrown synchronously".** In an `async` method the exception faults the Task (measured).
3. **CS-BUILD-15, CA1062 `none`.** The reasoning (NRT makes the guard redundant) contradicts the runtime team's guidance and the oblivious-caller measurement above. Present as a decision for the consolidator; either way the guard rule stands.
4. **STJ docs.** The `required` + source generation "won't compile" sentence does not hold on SDK 10.0.401 (measured).
5. **IDE0370 docs.** The page's description ("when the compiler can already determine that a value is not null") omits the member-level granularity; its sample (`new()!`) is flagged only when no other needed `!` shares the member (`f3-bang-mixed`).

### 1.11 Verified on the toolchain

Fixture root: `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-language-nullability/` (global.json inherited: SDK 10.0.401). Helper `b.sh <dir> [args]` runs `/home/mherwig/.cache/research-lang/dotnet-tools/run.sh dotnet build -nologo -v:q --no-incremental <args>` inside `<dir>` and prints the unique diagnostic lines and `exit=<code>`. Run runtime fixtures with `.../run.sh dotnet run -nologo -v:q`.

| # | fixture | command | RED observed | GREEN observed |
|---|---|---|---|---|
| V1 | `f1-posture/consumer` | `./b.sh f1-posture/consumer` (red: `lib-perfile`) vs `./b.sh f1-posture/consumer -p:Lib=lib-project` | `1 Error(s)`: only `Program.cs(3,19) error CS8604`; `lib-perfile/C.cs(3,25) warning CS8632`; exit 1. `consumer-run` -> `RUNTIME NullReferenceException` | `3 Error(s)`: CS8604, `(4,21) CS8625`, `(5,19) CS8602`; exit 1 (all three planted bugs caught); `dotnet msbuild -getProperty:Nullable` -> `enable` (red: empty) |
| V2 | `f2-warnings` | `./b.sh f2-warnings -p:Mode=explicit` vs `-p:Mode=nullable` | explicit list: `4 Error(s)` (CS8600, CS8604, CS8618, CS8625), 12 nullable ids stay `warning`; exit 1 | `nullable`: 15+ nullable ids `error`, `CS0169`/`CS0219`/CA stay `warning`; TWAE: 30 errors; `none`: exit 0 with all as warnings |
| V3 | `f3-bang` (red), `f3-bang-green` | `./b.sh f3-bang` / `./b.sh f3-bang-green`; `dotnet format style --diagnostics IDE0370 --severity info --verify-no-changes --no-restore` | 3 x `error IDE0370: Suppression is unnecessary` at `Bang.cs(5,27)`, `(6,17)`, `(11,35)`; exit 1; format exit 2 | exit 0; format exit 0. `-p:Ecsb=off` or no per-rule line: exit 0, silent. `f3-bang-mixed`: one removable + one needed `!` in a member: silent |
| V4 | `f4-dto`, `f4-dto-net8` | `cd f4-dto && .../run.sh dotnet run -nologo -v:q` | `Plain BangDto {}`: `ok name=<null>`; `BangDto.Name.Length -> NullReferenceException` | `required`/`[JsonRequired]` `{}`: `JsonException: ... missing required properties including: 'Name'`; Strict `{"Name":null}`: `JsonException: The constructor parameter 'Name' ... doesn't allow null values` (also on net8.0 + STJ 10.0.0) |
| V5 | `f5-attrs/red`, `f5-attrs/green`, `green-ns2` | `./b.sh f5-attrs/red` etc. | `6 Error(s)`: CS8618 `Api.cs(5,12)`, CS8602 x5 in `Use.cs` | `0 Error(s)`, exit 0; `green-ns2`: CS0246 `NotNullWhenAttribute`, `MaybeNullWhenAttribute`, `NotNullAttribute`, `CallerArgumentExpressionAttribute` |
| V6 | `f6-guards/lib`, `oblivious` | `cd f6-guards/oblivious && .../run.sh dotnet run -nologo -v:q`; `./b.sh f6-guards/lib -p:Tfm=net8.0` (and `net10.0`, `netstandard2.0`, `+ -p:Poly=true -p:PolyArgumentExceptions=true`) | `NoGuard(null) direct -> NullReferenceException`; reflection -> `TargetInvocationException` | `Guard(null) direct -> ArgumentNullException: Value cannot be null. (Parameter 's')`. TFM matrix as in 1.7 (net8/net10 `CA1062@4 CA1510@6 CA1511@7 CA1512@8 CA1513@14 CA2264@9`; ns2.0 `CS0117@5 CS0117@9`; ns2.0+Polyfill `CA1062@4` only) |
| V7 | `f7-equality`, `f7-ide` | `.../run.sh dotnet run -nologo -v:q`; `./b.sh f7-ide` | `real != null : False`, `real is null : False`, `Find<int> miss : type=Int32 value=0` | `real is not null: True`; `FindStruct miss : null`; IDE0041 only on `ReferenceEquals(o, null)` (`C.cs(8,40) warning IDE0041`), nothing on `== null` |
| V8 | `f8-annot/v1`, `v2` | `cd v1 && dotnet pack -c Release -p:Pub=true -o ../baseline`; `./b.sh f8-annot/v2 -p:Pub=true`; `./pv.sh <label> [args]` | v2 build: 4 x RS0016 + 4 x RS0017 (annotation text changed); pack with validation, annotation-only change: exit 0 (default, `EnableRuleAttributesMustMatch`, strict+AV fixed) | control (member removed): `error CP0002: Member 'string Acme.Api.TightenParam(string?)' exists on [Baseline] ...`, exit 1 |
| V9 | `f9-greps/{red,green}` | `cd f9-greps/red && ../checks.sh` (and `green`) | C2: `Bad.cs:1:#nullable disable`; C3: `Bad.cs:5: ... = null!;`; C4: `Bad.cs:11 (default!)`, `:12 (s!.Length)`; C5: `:13 (== null)`, `:14 (!= null)` | all four checks empty on `green` (including `"Hello!"`, `s + "!"`, `a != b`, `[JsonRequired] ... = null!;`, `#nullable disable // reason`) |
| V10 | `f10-field`, `f11-sdk11`, `f12-asyncguard` | `./b.sh f10-field -p:WarningsAsErrors=nullable`; SDK 11 copies built under a `global.json` pinning 11.0.100-rc.1.26425.128; `.../run.sh dotnet run` | `CS9264` error on `field`-backed property; async `ThrowIfNull` -> `status=Faulted` | SDK 11 RC1: same ids and counts as SDK 10; wrapper throws synchronously |

Count: 10 red/green pairs watched (V1 to V10), plus the three IDE0370 severity/ECSB control builds and the CP0002 control.

### 1.12 Exemplar evidence

Counts are over non-test `*.cs` in the sparse clones (`find ... -not -path '*Test*'`), pinned SHAs; they are density indicators, not full-repo totals.

| repo@sha12 | `= null!;` | `default!` | `[NotNullWhen]` | `[MemberNotNull*]` | `[NotNullIfNotNull]` | `[DoesNotReturn]` | `[AllowNull]` | `ThrowIfNull(` | `#nullable disable` | `required` |
|---|---|---|---|---|---|---|---|---|---|---|
| dotnet__aspire@af646baee1e8 | 0 | 0 | 6 | 0 | 0 | 1 | 0 | 1 | 0 | 17 |
| microsoft__testfx@7226b0c74729 | 0 | 0 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 14 |
| npgsql__npgsql@9c47244547c2 | 47 | 33 | 23 | 8 | 0 | 39 | 9 | 37 | 9 | 51 |
| App-vNext__Polly@e4476096da5b | 3 | 5 | 5 | 0 | 0 | 0 | 0 | 1 | 0 | 18 |
| xunit__xunit@0c7aa4991fa3 | 0 | 6 | 15 | 0 | 12 | 2 | 0 | 0 | 0 | 61 |
| Humanizr__Humanizer@4574b93883bf | 9 | 0 | 15 | 0 | 14 | 0 | 0 | 35 | 0 | 63 |
| StackExchange__StackExchange.Redis@e7c43a269f53 | 5 | 8 | 24 | 2 | 27 | 17 | 0 | 13 | 0 | 64 |

Reading: the three repos with the highest attribute vocabulary (npgsql, Redis, Humanizer) are also the ones that use `ThrowIfNull`/`NotNullIfNotNull` heavily, while repos near zero `!` density and zero `null!` (aspire, testfx) are the TWAE + `Nullable=enable` ones (`dotnet__aspire@af646baee1e8:Directory.Build.props:19,29`; `microsoft__testfx@7226b0c74729:src/Directory.Build.props:4`). Concrete patterns worth copying:

- Attributes on `Try*`: `npgsql__npgsql@9c47244547c2:src/Npgsql/NpgsqlBatchCommand.cs:197` (`[NotNullWhen(true)] out PreparedStatement? preparedStatement`), `dotnet__aspire@af646baee1e8:src/Aspire.Hosting/Dcp/DcpModelUtilities.cs:341`.
- `[MemberNotNull(nameof(RowDescription))]` on an init helper: `npgsql__npgsql@9c47244547c2:src/Npgsql/NpgsqlDataReader.cs:2086`; `[AllowNull]` on a property that normalizes null: `:src/Npgsql/NpgsqlBatchCommand.cs:23`.
- `[NotNullIfNotNull(nameof(...))]` on properties: `xunit__xunit@0c7aa4991fa3:src/xunit.v3.core.aot/ITestContext_aot.cs:27,38,51`.
- A documented `!` for an unconstrained generic out value: `App-vNext__Polly@e4476096da5b:src/Polly.Core/ResilienceProperties.cs:32-38` (six-line comment justifying `value = default!`). It is the shape the proposed `// null-forgiving:` rule asks for (shorter); the attribute form avoids the `!` when the method returns false on null.
- Guards under NRT+TWAE: Humanizer `ArgumentNullException.ThrowIfNull` with `Polyfill` for ns2.0/net48 TFMs (`Humanizer.csproj:3,12`); Redis keeps `_ = server ?? throw new ArgumentNullException(nameof(server));` (`ConnectionMultiplexer.cs:239`) because its TFM list includes net461 (`StackExchange.Redis.csproj:5`).
- Annotation tracking: Redis and RESPite `PublicAPI.*.txt` start with `#nullable enable` (`StackExchange__StackExchange.Redis@e7c43a269f53:src/RESPite/PublicAPI/PublicAPI.Unshipped.txt:1`).
- Annotated reference assemblies for old TFMs: `xunit__xunit@0c7aa4991fa3:src/Directory.Build.targets:28-35`.

## Normative guidance candidates

1. **Set `<Nullable>enable</Nullable>` in the root `Directory.Build.props` and nowhere else.** *Why:* per-file opt-in leaves forgotten files oblivious and silent to consumers. *Verify:* `dotnet msbuild src/Ocx/Ocx.csproj -getProperty:Nullable` prints `enable`; `grep -rn --include='*.csproj' -e '<Nullable>' src tests` returns nothing (the value is inherited).

2. **No `#nullable` directive in `src/` without a trailing `// reason` comment; `#nullable restore` is exempt; generated and polyfill files are exempt.** *Why:* a bare `disable` is migration debt; the commented form is the one legitimate pattern (unconstrained generics). *Verify:* `grep -rnP --include='*.cs' '^\s*#nullable\s+(?!restore\b)(?![^/]*//\s*\S)' src` returns nothing (measured: red hit `Bad.cs:1`, green clean).

3. **Do not add `WarningsAsErrors=nullable` or a hand-written CS8xxx list when `TreatWarningsAsErrors=true` is already in force; never put `nullable` in `NoWarn` or `WarningsNotAsErrors`.** *Why:* subset at best; an enumerated list leaves 12 of 16 ids as warnings; `NoWarn=nullable` removes the whole family. *Verify:* `grep -rnE --include='*.props' --include='*.csproj' --include='*.targets' -e 'WarningsAsErrors[^>]*CS8[0-9]{3}' -e '(NoWarn|WarningsNotAsErrors)[^>]*nullable' .` returns nothing; `dotnet msbuild src/Ocx/Ocx.csproj -getProperty:TreatWarningsAsErrors` prints `true`.

4. **Pin `dotnet_diagnostic.IDE0370.severity = error` in the repo `.globalconfig`, with `EnforceCodeStyleInBuild=true` and SDK >= 10.0.100.** *Why:* the only compiler-side check for dead `!`; silent at default severity, silent without ECSB, absent in SDK 8. *Verify:* `grep -nE 'IDE0370\.severity *= *error' .globalconfig` has a hit and `dotnet msbuild src/Ocx/Ocx.csproj -getProperty:EnforceCodeStyleInBuild` prints `true`; behaviour check: `dotnet format style --diagnostics IDE0370 --severity info --verify-no-changes --no-restore src/Ocx/Ocx.csproj` exits 0.

5. **The null-forgiving operator in `src/` is allowed only as `= null!;` on a `[JsonRequired]` member or with a same-line `// null-forgiving: <the invariant that makes it non-null>`; `default!` is never allowed on `out` parameters (use `[MaybeNullWhen(false)] out T` with `default`).** *Why:* each `!` is an unchecked claim; the comment makes the claim reviewable and greppable. *Verify:* `grep -rnP --include='*.cs' '(?<=[\w\)\]>])!(?=[\.\)\;\,\[\]\s\}]|$)' src | grep -v -e 'null-forgiving:' -e '= null!;'` returns nothing (measured red: 2 hits, green: 0); tests are excluded by the `src` operand.

6. **`= null!;` is allowed only on a property that also has `[JsonRequired]` (same or previous line).** *Why:* a bare `= null!` makes STJ return an object with a null non-nullable property (measured), later `NullReferenceException`. *Verify:* `find src -name '*.cs' -print0 | xargs -0 -r awk 'FNR==1{prev=""} /= *null! *;/ && prev !~ /JsonRequired/ && $0 !~ /JsonRequired/ {print FILENAME":"FNR": "$0} {prev=$0}'` prints nothing.

7. **Wire-mandatory members of a type's first release use `required`; later wire-mandatory additions use `[JsonRequired]`; optional wire members are `T?`; never declare a non-nullable member that the wire may omit or null.** *Why:* only these make a missing field a `JsonException` (measured) and keep CS8618 honest. *Verify:* reading heuristic on `src/**/Models` diffs: every `{ get; init; }` of a non-nullable reference type has `required`, `[JsonRequired]` or an initializer; the schema-diff test against `reports.json` (CS-JSON) fails when optionality differs.

8. **Strict (closed-schema) source-generation contexts declare `[JsonSourceGenerationOptions(RespectNullableAnnotations = true)]`; tolerant contexts do not, and any field ocx can send as `null` is `T?`.** *Why:* `required` accepts an explicit `null` (measured), only this option rejects it; STJ 9+ on net8 via the STJ 10 package works. *Verify:* `grep -rn --include='*.cs' -e 'RespectNullableAnnotations *= *true' src` shows each strict context; a unit test deserializing `{"field":null}` into each non-nullable member expects `JsonException` (red when the attribute is removed).

9. **Every public `Try*` carries `[NotNullWhen(true)]` (non-generic `out X?`) or `[MaybeNullWhen(false)]` (generic `out T`); throw helpers carry `[DoesNotReturn]`; init helpers called from constructors carry `[MemberNotNull]`; pass-through returns carry `[return: NotNullIfNotNull]`.** *Why:* otherwise callers need `!` (measured 5 CS8602 + CS8618). *Verify:* the gate itself: a callers-compile test (the SDK's own tests and samples) with TWAE; `grep -rnE --include='*.cs' 'bool Try\w+(<\w+>)?\(.*\bout ' src | grep -v -e 'NotNullWhen' -e 'MaybeNullWhen' -e 'out (int|long|bool|double|TimeSpan|DateTimeOffset|Guid)\b'` returns nothing for reference-type outs.

10. **Property setters: `[AllowNull]` when a non-nullable getter normalizes `null`; `[DisallowNull]` when a nullable getter rejects `null`; never `[MaybeNull]` where `T?` expresses it.** *Why:* dotnet/runtime guidance; the type plus attribute tells callers the exact contract. *Verify:* reading heuristic: any setter body containing `?? ` or `throw` over a nullable type must show one of the two attributes; `grep -rn --include='*.cs' -e '\[MaybeNull\]' src` returns nothing or each hit has a comment.

11. **Nullability attributes on netstandard2.0 (only if that TFM is chosen) come from a polyfill (Polyfill with `PrivateAssets="all"`), never from hand-copied `public` attribute classes.** *Why:* the types are absent (CS0246, measured) and public copies collide in consumers. *Verify:* `unzip -p artifacts/*.nupkg '*.nuspec' | grep -i -e polyfill` prints nothing; `grep -rnE --include='*.cs' 'public (sealed )?class (NotNullWhen|MaybeNullWhen|AllowNull|DisallowNull|MemberNotNull|NotNullIfNotNull|DoesNotReturn)Attribute' src` returns nothing.

12. **Public and protected members of public types validate every reference-type parameter that is dereferenced, stored or forwarded, as the first statements of the member: `ArgumentNullException.ThrowIfNull(p)`, `ArgumentException.ThrowIfNullOrEmpty(p)` / `ThrowIfNullOrWhiteSpace(p)`, `ArgumentOutOfRangeException.ThrowIf*`, `ObjectDisposedException.ThrowIf(cond, this)`. Do not guard `internal`/`private` members, value types, or `T?` parameters that accept null.** *Why:* oblivious callers, reflection and `null!` bypass the compiler (measured NRE vs ArgumentNullException); runtime team: "DO continue to validate all arguments". *Verify:* either CA1062 at `warning` for `src` (`dotnet_diagnostic.CA1062.severity = warning` in `.globalconfig`; measured to flag unguarded dereferences including via a private helper and to accept the three `ThrowIfNull*` helpers) or, with CS-BUILD-15 kept at `none`, the reading heuristic: open each public method of `OcxClient` and the option types and confirm the guard block precedes the first use; `grep -rn --include='*.cs' -e 'ThrowIfNull' src/Ocx` must be non-empty for each public type that takes reference parameters.

13. **On net8.0 and net10.0 use only the throw helpers; hand-rolled `if (x is null) throw new ArgumentNullException(nameof(x))`, `if (n < 0) throw new ArgumentOutOfRangeException`, `if (_disposed) throw new ObjectDisposedException` are build errors.** *Why:* CA1510/1512/1513 (and CA1511 for empty messages) fire on both TFMs at `10.0-all`, smaller IL and inlining (CA1510 rationale). *Verify:* `dotnet build -nologo -v:q --no-incremental src/Ocx/Ocx.csproj 2>&1 | grep -E 'error (CA1510|CA1511|CA1512|CA1513)'` prints nothing; severities: `dotnet_diagnostic.CA1510.severity = warning` (CS-BUILD already runs `10.0-all`, which gives warning -> error under TWAE).

14. **If netstandard2.0 is added, write the same helper calls (Polyfill + `<PolyArgumentExceptions>true</PolyArgumentExceptions>`, `LangVersion` 14); do not write the hand-rolled form on that leg.** *Why:* the analyzers are blind there (CA1510-1513 silent, measured), so consistency is a convention only. *Verify:* `grep -rn --include='*.cs' -e 'new ArgumentNullException(' src` returns nothing (exceptions with a custom message use `ArgumentException`).

15. **Do not put `ArgumentNullException.ThrowIfNull` on value types, `nameof` or `new` expressions.** *Why:* CA2264 (default warning in .NET 10; measured on `int n`). *Verify:* the gate (`error CA2264`); CA2264 stays at its default and is never `none`d.

16. **Async public methods: guard in the first lines of the method body and document that an invalid argument surfaces on the awaited Task; where a synchronous throw is required, use a non-async wrapper that guards and returns the async inner Task.** *Why:* measured Faulted Task vs synchronous throw; keeps CS-ERR honest. *Verify:* `grep -rnE --include='*.cs' -B2 'async Task' src/Ocx | grep -c ThrowIfNull` is non-zero for every public async method with reference parameters (reading heuristic); amend CS-ERR R-EXC-23's wording.

17. **Treat nullability annotations on shipped API as contract: any `?` added or removed on a shipped public signature is reviewed in the Unshipped diff and recorded in the release notes; RS0016/RS0017/RS0036/RS0037 are `error`.** *Why:* PublicApiAnalyzers is the only gate (package validation is blind, measured exit 0 for four annotation changes). *Verify:* `grep -E 'dotnet_diagnostic\.RS00(16|17|36|37)\.severity *= *error' .globalconfig | wc -l` prints 4 (or 6 with RS0026/RS0027 per CS-API rule 4); `grep -rL --include='PublicAPI.*.txt' -e '#nullable enable' src` prints nothing.

18. **Lookups that can miss return `bool Try*(..., [MaybeNullWhen(false)] out T v)` or are constrained (`where T : struct` returning `T?`, or `where T : class`); never an unconstrained `T?` return as a "not found" signal.** *Why:* for value types `T?` is `T`, so a miss is `default(T)` (measured `Int32 value=0`). *Verify:* `grep -rnE --include='*.cs' 'public (static )?\w+\? \w+<\w+>\(' src` hits are each followed by a `where T : struct|class` clause (reading heuristic); no unconstrained generic `T?` return in the public surface.

19. **Null tests use `is null` / `is not null`; `== null` / `!= null` are not used.** *Why:* the operator form calls user-defined overloads (measured `real != null` -> False); no analyzer enforces it. *Verify:* `grep -rnE --include='*.cs' -e '[=!]=\s*null\b' src` returns nothing (measured red 2 hits, green 0).

20. **Public properties declared with the C# 14 `field` keyword and no initializer get an explicit non-null initializer, `[AllowNull]` with a non-null getter, or a nullable type; do not rely on a CS8618 text search.** *Why:* the diagnostic is CS9264 (measured). *Verify:* the build under TWAE (`WarningsAsErrors=nullable` also covers it); `grep -rn --include='*.cs' -e '\bfield\b' src` reviewed against initializers.

21. **Test projects may use `null!` to call APIs with `null` in guard tests; all other rules apply with `Nullable=enable` set once in the root props.** *Why:* the one use the platform documents; a guard without a test is untested. *Verify:* each public type with a `ThrowIfNull` has a test calling it with `null!` that asserts `ArgumentNullException` (`grep -rn --include='*.cs' -e 'null!' tests | grep -c .` is non-zero).

## AI-agent angle

| What an LLM characteristically does | Why it is wrong | Smallest mechanical check |
|---|---|---|
| Adds `#nullable enable` at the top of every new file "to be safe" in a project that already has `Nullable=enable` | redundant; in a project without the property it creates per-file state that later files forget | rule 2 grep: `grep -rnP '^\s*#nullable\s+(?!restore\b)(?![^/]*//\s*\S)' --include='*.cs' src` |
| Writes `public string Name { get; set; } = null!;` for every DTO property | silent `null` on omitted JSON (measured NRE) | rule 6 awk; STJ run test with `{}` |
| Silences CS8618/CS8600 with `= default!`, `string x = null!` or `value = default!` | hides the defect; `default!` has no legitimate out-param use | rule 5 grep |
| Adds `!` after every flagged dereference (`x!.Foo()`) instead of an attribute or check | the claim is unchecked; IDE0370 will not flag a needed or deliberate one | rule 5 grep + review of the `// null-forgiving:` reasons |
| Omits `[NotNullWhen(true)]` on `Try*` then calls `result!` at call sites | forces `!` into every caller | rule 9 grep + callers compile |
| Writes `bool TryGet(..., out T value) { value = default!; ... }` (the Polly pattern) copied from older code | attribute form needs no `!` | rule 5 grep (`default!`) |
| Removes `ArgumentNullException.ThrowIfNull(x)` from public methods "because nullable is enabled" (or because CA2264 "says so") | oblivious and reflection callers get NullReferenceException deep inside; CA2264 does not flag reference parameters | rule 12 (CA1062 `warning`, or the reading check) |
| Writes the .NET Framework-era guard `if (x == null) throw new ArgumentNullException("x");` | string literal param name, hand-rolled, `==` operator | CA1510 error + rule 19 grep |
| Writes `x ?? throw new ArgumentNullException(nameof(x))` as the guard (the Redis/Polly style) | the helper is smaller and CA1510 flags the `if` form; the `??` form is not flagged but is the older style | `grep -rn 'new ArgumentNullException(' --include='*.cs' src` returns nothing (rule 14) |
| Puts `ThrowIfNull(count)` on an `int` or a `struct` | CA2264 | the gate |
| Adds `<WarningsAsErrors>nullable</WarningsAsErrors>` next to TWAE, or `<WarningsAsErrors>CS8600;CS8602</WarningsAsErrors>` | redundant, or weaker than TWAE | rule 3 grep |
| Puts `<NoWarn>$(NoWarn);CS8618</NoWarn>` (or `nullable`) to "fix" a build | removes the check | rule 3 grep |
| Uses `T?` as the "not found" return of an unconstrained generic | `T?` is `T` for value types, miss = 0 | rule 18 reading check; a unit test with `int` |
| Writes `if (x == null)` / `x != null` | calls operator overloads, not enforced by any rule | rule 19 grep |
| Declares `Task<string?> FooAsync()` and `string?` when the API never returns null, or non-null `string` for something ocx can omit | annotation = contract; mismatches break consumers' warnings | schema-diff test (CS-JSON) + PublicAPI diff review |
| Uses `[MaybeNull]` / `[AllowNull]` interchangeably | different directions (return vs setter) | reading heuristic against rule 10 |
| Copies `[NotNullWhen]` into `netstandard2.0` code without a polyfill | CS0246 | build the ns2.0 leg |
| Hallucinates `ArgumentNullException.ThrowIfNull` on `netstandard2.0`, or `[NotNull]` params to "enforce" non-null at runtime | not in the BCL there; the attributes enforce nothing at run time | build the ns2.0 leg; docs: attributes "don't enable more checks on your implementation" |
| Believes `required` accepts only non-null JSON values | `required` only checks presence (measured explicit null passes) | rule 8 test with `{"field":null}` |
| Believes `RespectNullableAnnotations` also enforces presence | docs: "a missing property doesn't throw" | rule 7 test with `{}` |
| Searches `CS8618` to find uninitialized properties in C# 14 code | `field`-backed properties report CS9264 | build under TWAE, not text search |
| Claims package validation (`EnablePackageValidation`) guards nullable API changes | measured exit 0 for four annotation changes | PublicApiAnalyzers RS0016/RS0017 at error |
| Puts `ThrowIfNull` in an `async` body and promises a synchronous throw in the XML docs | the Task is Faulted | rule 16 |

## Contested / evolving

- **Guards plus NRT vs NRT alone (as of 2026-10-11).** Microsoft's runtime team: keep validating (nullability.md; guidance unchanged through the page's current form). Many application codebases drop guards once annotated and rely on CS8604. The libraries in the corpus that target public consumption keep guards (Humanizer 35 `ThrowIfNull`, npgsql 37, Redis 157 manual). Condition for dropping: every consumer is a known NRT-enabled C# caller (internal-only package). The ocx SDK is public and agent-consumed (agents also write oblivious `null`-passing tests); keep guards. Trend: stable.
- **CA1062 on or off.** CS-BUILD-15 turns it off; the rule's page has no NRT note (page updated 2026-04-02) and treats every public reference parameter as needing validation. With guards required, CA1062 at `warning` is the only mechanical enforcer, and costs one line per flagged method. Unresolved in this research: noise on future public types with many pass-through methods. Decision belongs to the consolidator.
- **`RespectNullableAnnotations` default.** Opt-in since .NET 9 "to avoid breaking existing applications"; the docs call enabling it "highly recommended" for new applications (nullable-annotations page, 2025-10-20). Its limits (no top-level, collection element or generic enforcement) mean it is a partial net; whether to turn it on for the tolerant context depends on whether ocx ever sends `null` for a documented-non-null field (a contract question, `ocx-cli-contract.md`, not decided here). Trend: likely to become default in a future major.
- **IDE0370 maturity.** Present and working in SDK 10.0.401 and 11 RC1; the docs page is `ai-usage: ai-assisted`, dated 2025-11-08, and omits the member-granularity behaviour; the check could change before GA. Re-measure on the SDK bump; the grep rule is the stable half.
- **`required` and source generation docs.** Docs say it will not compile; measured it does on SDK 10.0.401. The docs are probably stale from the .NET 7 era; re-verify if the SDK is bumped.
- **`!` as an API (post-C# 14).** The `field` keyword and `required` members removed two historical reasons to write `= null!`; extension members and `Polyfill` change nothing here. No language proposal replacing `!` was found in the pages read.
- **Annotated reference assemblies for old TFMs.** xunit uses `TunnelVisionLabs.ReferenceAssemblyAnnotator` for ns2.0/net4x (`Directory.Build.targets:28-35`); the CS-BUILD finding says the ns2.0 BCL is oblivious (CS8604 missed). Only relevant if netstandard2.0 is selected by the owner.
- **Annotation-change policy.** dotnet/runtime treats annotation changes as breaking-adjacent and rare; no tool in the .NET SDK classifies them, which is why the rules put the burden on the Unshipped diff review. An ApiCompat nullability rule would change this; none found in the diagnostic-ids list as of 2026-10-11.

## Sources

| URL | what it is | date/era | why worth reading |
|---|---|---|---|
| https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/null-safety/nullable-reference-types | NRT overview: annotations, null-state, `!`, attributes, known pitfalls | ms.date 2026-05-04 (updated 2026-07-21) | Current Microsoft stance: "Use `!` sparingly" |
| https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/nullable-reference-types | Language reference: contexts table, `#nullable` forms, generated-code rule, generics `T?` | 2026-05-15 | Exact context semantics, generics rules, EF Core reflection note |
| https://learn.microsoft.com/en-us/dotnet/csharp/advanced-topics/update-applications/nullable-migration-strategies | Migration strategies and end state | 2026-05-04 | Defines the "no `#nullable` directives" end state; the "remove `null!` and `default!`" step |
| https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/attributes/nullable-analysis | The attribute catalogue with semantics and examples | 2026-01-14 | Pre/postcondition vocabulary; `Try*`, `MemberNotNull`, `DoesNotReturn` examples |
| https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/null-forgiving | `!` reference | 2026-01-20 | Test-only `null!` use; "no effect at run time" |
| https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/null-safety/common-tasks/resolve-warnings | Five techniques for resolving warnings | 2026-05-04 | `required` / `MemberNotNull` / sentinel warning for CS8618 |
| https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-options/errors-warnings | `TreatWarningsAsErrors`, `WarningsAsErrors`, `nullable` shorthand, `NoWarn` | 2025-05-30 | The documented `nullable` value |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/style-rules/ide0370 | IDE0370 rule page | 2025-11-08 | Rule ID and example; its granularity omission is measured |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1510 | CA1510 throw-helper rule | 2023-11-16, updated 2026-04-02 | "As suggestion" default, code-size rationale |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1062 | CA1062 validate public arguments | 2020-12-18, updated 2026-04-02 | "Enabled by default in .NET 10: No"; configuration options |
| https://raw.githubusercontent.com/dotnet/docs/main/docs/fundamentals/code-analysis/quality-rules/ca2264.md | CA2264 source page | 02/25/2024 | Exactly what it flags (structs, `nameof`, `new`) |
| https://raw.githubusercontent.com/dotnet/docs/main/docs/fundamentals/code-analysis/quality-rules/ca1511.md | CA1511 source page | 11/16/2023 | The empty-message trigger |
| https://raw.githubusercontent.com/dotnet/runtime/main/docs/coding-guidelines/api-guidelines/nullability.md | dotnet/runtime nullability annotation guidance | current main, read 2026-10-11 | The canonical rules for parameters, `Try*`, `MemberNotNull`, "DO continue to validate all arguments" |
| https://raw.githubusercontent.com/dotnet/roslyn-analyzers/main/src/PublicApiAnalyzers/PublicApiAnalyzers.Help.md | PublicApiAnalyzers help | current main | `#nullable enable` in API files, `~` oblivious marker |
| https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/nullable-annotations | STJ `RespectNullableAnnotations` | 2025-10-20 | Missing-vs-null behaviour, limits, feature switch |
| https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/required-properties | STJ required members | 2024-10-22 (updated 2026-03-30) | `required` == `[JsonRequired]`; source-gen sentence contradicted by measurement |
| https://raw.githubusercontent.com/dotnet/csharplang/main/proposals/csharp-9.0/unconstrained-type-parameter-annotations.md | C# 9 proposal: `T?` on unconstrained type parameters | C# 9 (2020) | Primary source for `T?` = `T` for value types |
| https://learn.microsoft.com/en-us/dotnet/api/system.argumentnullexception.throwifnull | `ThrowIfNull` API page | 2025-07-01 (updated 2026-07-01) | .NET 6 to 11 availability, CallerArgumentExpression note |
| https://source.dot.net/Microsoft.CodeAnalysis.CSharp.CodeStyle/src/roslyn/src/Analyzers/CSharp/Analyzers/RemoveUnnecessarySuppressions/UnnecessaryNullableWarningSuppressionsUtilities.cs.html | Roslyn IDE0370 detection logic (read through the fetch tool's summary) | current Roslyn | Explains the member-level "all removable together" behaviour |
| https://source.dot.net/Microsoft.CodeAnalysis.CSharp.Features/src/roslyn/src/Analyzers/CSharp/CodeFixes/RemoveUnnecessarySuppressions/CSharpRemoveUnnecessaryNullableWarningSuppressionsCodeFixProvider.cs.html | IDE0370 code fix and FixAll | current Roslyn | Linked-document caveat; code-fix semantics |
| https://www.meziantou.net/automating-null-forgiving-operator-removal-in-csharp-projects.htm | SuppressionCleanupTool write-up | 2025 (date ambiguous in page) | Alternative dead-`!` finder |
| https://raw.githubusercontent.com/dotnet/docs/main/docs/fundamentals/apicompat/diagnostic-ids.md | ApiCompat CP-rule list (source for learn.microsoft.com/dotnet/fundamentals/apicompat/diagnostic-ids) | current main | No nullable-annotation rule exists |
| /home/mherwig/.cache/research-lang/dotnet-tools/nuget-packages/polyfill/11.4.3/readme.md | Polyfill package readme (local, read) | 11.4.3 | Source-only polyfill model; C# 14 extension members |
