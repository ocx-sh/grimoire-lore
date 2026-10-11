---
title: "C# SDK result types: consumer-constructible or SDK-only, under source-generated System.Text.Json"
topic: csharp-api-result-construction
agent: deep-dive researcher (wave-3 revision, group "csharp-api: result construction and the behavioural-compatibility suite")
model: claude-sonnet-5-5
date_researched: 2026-10-11
sources_count: 21
scope: >
  Covers who may construct the ocx SDK's result types (options a-d of the commission), the general rule for result types bound by
  source-generated System.Text.Json on net8.0 (STJ 10.0.12 package), net10.0 (inbox) and net11.0 RC1, the evolution cost of each
  shape under package validation, and the trim/AOT cost. It does not re-decide CS-API-01..16, CS-ERR, CS-JSON or CS-PROC, and it does
  not cover the behavioural-compatibility suite (sibling subtopic). Windows and macOS were not run: everything measured is
  managed-code compile/runtime behaviour on linux-x64 (WSL2); Native AOT was linked on net10.0 only.
---

# C# SDK result types: consumer-constructible or SDK-only, under source-generated System.Text.Json

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The verdict in one table](#1-the-verdict-in-one-table)
   2. [What the source generator does with non-public constructors and members](#2-what-the-source-generator-does-with-non-public-constructors-and-members)
   3. [Who can construct what: the consumer matrix](#3-who-can-construct-what-the-consumer-matrix)
   4. [Evolution: adding a member in a minor release](#4-evolution-adding-a-member-in-a-minor-release)
   5. [required, JsonRequired and SetsRequiredMembers with a non-public constructor](#5-required-jsonrequired-and-setsrequiredmembers-with-a-non-public-constructor)
   6. [ToString and equality without records](#6-tostring-and-equality-without-records)
   7. [Trim and Native AOT](#7-trim-and-native-aot)
   8. [Option (d): faking at the process boundary](#8-option-d-faking-at-the-process-boundary)
   9. [Does a ModelFactory ship?](#9-does-a-modelfactory-ship)
   10. [How the exemplars decide](#10-how-the-exemplars-decide)
   11. [Verified on the toolchain](#11-verified-on-the-toolchain)
   12. [Proposed CS-API row text](#12-proposed-cs-api-row-text)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- **Verdict:** ocx result types are SDK-only. Shape: `public sealed class`, `[JsonConstructor] internal T() { }`, `public required X { get; init; }` for schema-required keys. Consumers cannot construct them (`CS1729`); the SDK and its `InternalsVisibleTo` test assemblies can.
- **Input types stay consumer-constructible** (options, per-command options): public implicit constructor, `required`/`init`, `required` frozen at first release (CS-API-10 unchanged). A type is an input or an output, never both; if a result must go back in, accept its identifying strings.
- **Closing later is breaking, opening later is additive.** Making shape (a) internal removes the implicit public constructor: `CP0002` plus `CS1729` for consumers. Making an internal-constructor type public, or adding a ModelFactory to one, is package-validation clean (`b2-open`, `b1rj-factory`). So start closed.
- **Source generation on net8.0 (STJ 10.0.12) and net10.0 accepts `[JsonConstructor]` on an `internal` constructor** (parameterless or parameterized) with no diagnostic; it rejects `private`/`protected` constructors with `SYSLIB1222` and `[JsonInclude]` on a `private`/`protected` accessor with `SYSLIB1038`. Both are warnings by default and errors under the unconditional TWAE (CS-BUILD).
- **The silent trap:** an `internal` constructor WITHOUT `[JsonConstructor]` (parameterless or the sole parameterized one) builds with zero diagnostics and throws `NotSupportedException` at the first `Deserialize`. The generator ignores non-public constructors that lack the attribute ([Parser.cs](https://raw.githubusercontent.com/dotnet/runtime/main/src/libraries/System.Text.Json/gen/JsonSourceGenerator.Parser.cs)). No analyzer catches it; a probe test over every registered type does.
- **.NET 11 RC1 lifts the private restrictions** (private `[JsonConstructor]` and private `[JsonInclude]` accessors work, `b3`/`b4j` green on SDK 11.0.100-rc.1) but the attribute is still required (`b1`, `b2n`, `b4` still throw). With a net8.0 floor none of this is usable; flag, do not adopt.
- **`[JsonRequired]` on a get-only, constructor-bound property is a runtime `InvalidOperationException`** ("marked required but does not specify a setter"), not a compile error. `[JsonRequired]` needs an `init`/`set` property. This is why results bind through `init` members, not a parameterized constructor.
- **A parameterized internal constructor makes every parameter without a default a mandatory JSON key** (`RespectRequiredConstructorParameters = true`), even a nullable one (`b2x`: a payload without `tags` is refused). Adding a constructor parameter silently tightens the wire contract. Another reason to prefer `init` members.
- **`required` on an output type becomes a pure SDK-side safety net.** Adding `required Origin` to an internal-constructor type is package-validation clean and consumer-clean (`b1rj-req`), while an SDK construction site that forgets it fails to compile (`CS9035`, `b1rj-site`). It is still a wire-contract change: needs the CS-JSON schema-diff run and an ocx minimum-version decision.
- **`[SetsRequiredMembers]` belongs on internal constructors only.** On a public constructor it let a v2 add `required Origin` with package validation clean, the v1 consumer compiling, and `Origin` null at runtime (`a3-req`).
- **No ModelFactory in 0.x or 1.0.** With a sealed `OcxClient` (CS-API-02) a factory has no mockable client to feed; it would add one public method per result type (the Python SDK has 64 result dataclasses) and the overload dance that package validation cannot fully police (`c-ambig`: pack clean, consumers get `CS0121`). Adding one later is additive; if it ships, follow the Azure two-overload rule.
- **Without records, equality is reference equality and `ToString()` prints the type name** (`Equals=False`, `'Acme.PackageInfo'`). Tests compare with `Assert.Equivalent(expected, actual, strict: true)` (xunit.v3.assert 4.0.2, passes on equal, throws on different). Do not add `IEquatable`/`Equals`/`ToString` to results.
- **Trim/AOT is clean:** the internal-constructor shape publishes warning-free with `PublishAot` on net10.0 linux-x64 (`b1rj`, `b2`, `c`) and `PublishTrimmed` on net8.0 and net10.0; the red twin (a consumer reflection-binding the type) gives `IL2026` and `IL3050`. net8.0 `PublishAot` compiled but could not link (host has gcc, no clang).
- **Option (d) costs ~25 ms and a compiled helper executable per fake result** (24.9 ms for `dotnet exec fake.dll` plus stdout capture, 30-run mean on this WSL2 host, versus ~65 ns for a factory call), and `.cmd`/`.bat` fakes are refused by CS-PROC. Consumers should wrap results in their own types at one adapter and fake the process boundary once.
- **Octokit enforces the opposite policy** by convention test (`AllResponseModelsHavePublicParameterlessCtors`, `AllResponseModelsHavePublicCtorWithAllProperties`) and pays for it with constructors that change when a property is added. Anthropic keeps public `required` records. Azure and OpenAI hide constructors and ship factories because their clients are mockable. ocx's client is sealed, so the Azure/OpenAI reason does not carry over.
- **Floor SDK 8.0.425 behaves identically** to SDK 10.0.401 for every shape tested (`b1` throws, `b1rj`/`b2` round-trip, `b3` `SYSLIB1222`, `b4` `SYSLIB1038`).

## Findings

### 1. The verdict in one table

Measured on `net8.0` (System.Text.Json 10.0.12 package) and `net10.0` (inbox), SDK 10.0.401, `TreatWarningsAsErrors=true` unless stated. Fixture names in code font are directories under `fixtures/csharp-api-result-construction/` (section 11).

| Option | Fixture | Consumer can fake a result | STJ SG round trip | Evolution, minor release | Trim/AOT | Verdict |
|---|---|---|---|---|---|---|
| (a) public sealed, `required init`, implicit public ctor | `a` | yes: `new T { ... }` | green, net8+net10 | optional `init` member: clean. New `required`: package validation silent, consumer `CS9035` (`a-req`). Closing later: `CP0002` + `CS1729` (`a-close`) | clean (lib is `IsAotCompatible`) | **inputs only** |
| (a2) public parameterized ctor (Octokit style) | `a2` | yes: `new T(...)` | green | new parameter: `CP0002` (`a2-replace`, `a2-optparam`); new overload: clean (`a2-overload`) | clean | rejected |
| (a3) public `required` + public `[SetsRequiredMembers]` ctor (Anthropic style) | `a3` | yes, two ways | green | later `required` slips through the SRM ctor: all gates clean, value null at runtime (`a3-req`) | clean | rejected |
| (b) internal `[JsonConstructor]` parameterless + `required init` | `b1rj`, `b1j` | **no** (`CS1729`) | green | any member add: clean, consumer untouched (`b1j-add`, `b1rj-req`); SDK sites caught by the compiler (`b1rj-site`) | clean on net10.0 AOT, net8.0/net10.0 trimmed | **results (chosen)** |
| (b') internal `[JsonConstructor]` parameterized, get-only members | `b2` | no | green | add parameter: clean (`b2-add`); but no-default parameter = mandatory key (`b2x`), `[JsonRequired]` invalid (`b2j`) | clean | allowed by the SG, not chosen |
| (b'') internal ctor WITHOUT the attribute | `b1`, `b1r`, `b2n` | no | **compiles green, `NotSupportedException` at runtime** | n/a | n/a | forbidden |
| (b''') private `[JsonConstructor]` / private `[JsonInclude]` accessor | `b3`, `b4`, `b4j` | no | `SYSLIB1222` / `SYSLIB1038`, runtime throw if suppressed | n/a | n/a | forbidden on net8/net10 |
| (c) internal ctor + public static `AcmeModelFactory` | `c` | yes, through the factory only | green | optional parameter: `CP0002` (`c-optparam`); second overload with defaults: pack clean, consumer `CS0121` (`c-ambig`); Azure rule: clean (`c-azure`) | clean | **not now; additive later** (`b1rj-factory`) |
| (d) fake only the process | `dcost` | via a compiled fake exe | n/a | none (SDK surface unchanged) | n/a | cost: ~25 ms and a helper exe per result |

### 2. What the source generator does with non-public constructors and members

The docs state two things that look contradictory. [Use immutable types and properties](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/immutability) says: "Starting in .NET 11, source-generation mode supports them too" (non-public `[JsonConstructor]`), and in a note: "In .NET 10 and earlier versions, source generation doesn't support `private` or `protected` members or accessors ... Source generation supports `internal` members and accessors only when they're in the same assembly as the generated JsonSerializerContext. It doesn't support inaccessible constructors, even when you mark them with `[JsonConstructor]`." The same page lists the .NET 8 reflection-mode behaviour separately. The generator source resolves it ([JsonSourceGenerator.Parser.cs](https://raw.githubusercontent.com/dotnet/runtime/main/src/libraries/System.Text.Json/gen/JsonSourceGenerator.Parser.cs), `TryGetDeserializationConstructor`):

- Public constructors are collected first; one `[JsonConstructor]` public constructor wins, else a public parameterless constructor, else the lone public constructor.
- "Non-public constructors are checked only for the attribute": an `internal` or `private` constructor is picked up only when it carries `[JsonConstructor]`.
- Then `constructorIsInaccessible = !IsSymbolAccessibleWithin(constructor, within: contextType)`. An `internal` constructor in the context's assembly is accessible, a `private` one is not.

So "inaccessible" in the docs means "not accessible from the generated context", which excludes `private` and `protected` but not `internal`. Watched (SDK 10.0.401; row `net8.0` uses the STJ 10.0.12 package, `net10.0` the inbox generator; identical on SDK 8.0.425):

| Shape (`Models.cs`) | Build, raw (TWAE off) | Build, under the gate (TWAE on) | Runtime `Deserialize` | net11.0 RC1 |
|---|---|---|---|---|
| `[JsonConstructor] internal T()` + `init` members (`b1j`, `b1rj`) | clean | clean | works | n/a (same) |
| `[JsonConstructor] internal T(string name, ...)` (`b2`, `c`, `b5`) | clean | clean | works | n/a |
| `internal T()` no attribute (`b1`, `b1r`) | **clean, no diagnostic** | clean | `NotSupportedException: Deserialization of types without a parameterless constructor, a singular parameterized constructor, or a parameterized constructor annotated with 'JsonConstructorAttribute' is not supported. Type 'Acme.PackageInfo'.` | still throws (`sdk11/b1`) |
| sole `internal T(string name, ...)`, no attribute (`b2n`) | **clean, no diagnostic** | clean | same `NotSupportedException` | still throws (`sdk11/b2n`) |
| `[JsonConstructor] private T(...)` (`b3`) | `warning SYSLIB1222` | `error SYSLIB1222` | throws if suppressed | **works, no diagnostic** (`sdk11/b3`) |
| `[JsonInclude] ... { get; private set; }` (`b4`, `b4j`) | `warning SYSLIB1038` | `error SYSLIB1038` | `InvalidOperationException: The member 'PackageInfo.Size' has been annotated with the JsonIncludeAttribute but is not visible to the source generator.` (`b4j`) | `b4j` works; `b4` still throws (no attribute on its ctor) |
| `[JsonInclude] ... { get; internal set; }` (`b4j` `Name`) | clean | clean | works | works |

Diagnostic IDs: `SYSLIB1222` "Constructor annotated with `JsonConstructorAttribute` is inaccessible" ([SYSLIB1220-1229](https://learn.microsoft.com/en-US/dotnet/fundamentals/syslib-diagnostics/syslib1220-1229)); `SYSLIB1038` "annotated with `[JsonInclude]` but has accessors that are inaccessible to the source generator. The property must have `public` or `internal` accessors" ([SYSLIB1038](https://learn.microsoft.com/dotnet/fundamentals/syslib-diagnostics/syslib1038)). The `SYSLIB1038` page is dated 2021 and says nothing about .NET 11; read it as the net8/net10 behaviour. The fixture message text: `warning SYSLIB1222: The constructor on type 'Acme.PackageInfo' has been annotated with JsonConstructorAttribute but is not accessible by the source generator.`

The history is why agents get this wrong: [dotnet/runtime#77016](https://github.com/dotnet/runtime/issues/77016) (2022, .NET 7 era) reported "the source generator doesn't support internal constructors", the reporter saw `[JsonConstructor]` "won't make a difference", and it was closed in favour of the general story #87431. On the .NET 8+ generator an attributed `internal` constructor works, as the fixtures show. The .NET 11 libraries page ([What's new in .NET libraries for .NET 11](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/libraries)) records the lift: "Members marked with `JsonInclude` can have `private`, `internal`, or `protected` accessors ... An inaccessible constructor marked with `JsonConstructor` can participate in deserialization."

A .NET 11-only behaviour change that bites the `= ""` default pattern: "Starting in .NET 11, a source-generated setter runs only when the JSON payload contains the property. An omitted property retains its initializer value" ([immutability](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/immutability)). Not measured; `required` and `[JsonRequired]` members are unaffected because a missing key is refused first.

Gotcha found while testing `b4j`: `public IReadOnlyList<string>? Tags { get; internal set; }` WITHOUT `[JsonInclude]` is silently never populated (`tags=null` after a payload with tags). A non-public setter needs the attribute.

Incorrect (compiles green, throws at runtime) versus correct:

```csharp
// INCORRECT: b1. Internal parameterless constructor, no attribute. Zero diagnostics.
public sealed class PackageInfo
{
    internal PackageInfo() { }
    public required string Name { get; init; }
}
// Codec.Parse(...) -> NotSupportedException: Deserialization of types without a parameterless constructor ...

// CORRECT: b1rj. Same, plus the attribute.
public sealed class PackageInfo
{
    [JsonConstructor] internal PackageInfo() { }
    public required string Name { get; init; }
    public required string Version { get; init; }
    public required long Size { get; init; }
    public IReadOnlyList<string>? Tags { get; init; }
}
```

### 3. Who can construct what: the consumer matrix

A net10.0 consumer project (`cons/<shape>-<attempt>`) with a `ProjectReference` to the shape's library tries three one-line constructions. Exit 0 means it compiles.

| Shape | `new T { Name = .., Version = .., Size = .. }` | `new T("n", "1", 1)` | `AcmeModelFactory.PackageInfo(name: .., ..)` |
|---|---|---|---|
| `a` public required init | **compiles** | `CS1729` | `CS0103` (no factory) |
| `a2` public ctor | `CS0200` x6 + `CS7036` | **compiles** | `CS0103` |
| `b1j` / `b1rj` internal parameterless | `CS1729` ("does not contain a constructor that takes 0 arguments") | `CS1729` | `CS0103` |
| `b2` internal parameterized | `CS0200`, `CS1729` | `CS1729` | `CS0103` |
| `c` internal + factory | `CS0200`, `CS1729` | `CS1729` | **compiles** |

The SDK's own test assembly constructs results through `InternalsVisibleTo`: `ivt/tests` (assembly `Acme.Models.Tests`, named in `[assembly: InternalsVisibleTo("Acme.Models.Tests")]`) compiles `new PackageInfo { Name = "n", Version = "1", Size = 1 }`; `ivt/tests-nofriend` (assembly `Other.Tests`) gives `CS1729`. This is the same compile-time rule that makes the CS-TEST harness possible without a public seam.

### 4. Evolution: adding a member in a minor release

Each v2 packs as `1.1.0` against baseline `1.0.0` from a local folder feed (`EnablePackageValidation=true`, `PackageValidationBaselineVersion=1.0.0`), and the v1 consumer line is recompiled against the v2 library. Both TFMs (`net8.0;net10.0`) are validated. Diagnostic IDs per [Package Validation Diagnostics IDs](https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/diagnostic-ids).

| v2 change | Variant | `dotnet pack` (package validation) | v1 consumer recompiled |
|---|---|---|---|
| (a) add `required string Origin` | `a-req` | **clean** (silent) | **`CS9035`** |
| (a) add optional `string? Origin { get; init; }` | `a-opt` | clean | clean |
| (a) add `[JsonRequired] string Origin { get; init; } = ""` | `a-jr` | clean | clean |
| (a) later make the ctor internal (close) | `a-close` | **`CP0002`** `Member 'Acme.PackageInfo.PackageInfo()' exists on ...` | `CS1729` |
| (a2) replace ctor with one that has `origin` | `a2-replace` | `CP0002` | `CS7036` |
| (a2) append `string? origin = null` to the ctor | `a2-optparam` | `CP0002` (binary break) | clean (source compiles) |
| (a2) keep old ctor, add overload | `a2-overload` | clean | clean |
| (a3) add `required Origin`, leave the public SRM ctor | `a3-req` | clean | clean; **runtime `Origin=NULL`** |
| (b) add `[JsonRequired] Origin` to internal-ctor type | `b1j-add` | clean | clean |
| (b) add `required Origin` to internal-ctor type | `b1rj-req` | clean | clean |
| (b) same, SDK-internal site `new() { Name, Version, Size }` forgets it | `b1rj-site` | n/a | the **SDK library itself fails: `CS9035 Required member 'PackageInfo.Origin' must be set in the object initializer or attribute constructor`** |
| (b') add constructor parameter `origin` | `b2-add` | clean | clean |
| (b') open: internal ctor becomes public | `b2-open` | clean | clean |
| (b) add a public ModelFactory later | `b1rj-factory` | clean | clean |
| (c) append `string? origin = null` to the factory method | `c-optparam` | `CP0002` on `AcmeModelFactory.PackageInfo(string, string, long, IReadOnlyList<string>?)` | clean (source) |
| (c) add second overload with all optional parameters, keep old defaults | `c-ambig` | **clean** | **`CS0121` ambiguous call** |
| (c) Azure rule: old overload hidden, no defaults; new overload with defaults | `c-azure` | clean | clean; 4 positional args still bind (`c-azure-4`) |

Reading the table:

- Only shape (b) keeps every v2 change free for the maintainers: the consumer cannot depend on any of it. Shape (a) pays in two places that package validation does not see (`a-req`, `a3-req`). This matches [Breaking change rules](https://raw.githubusercontent.com/dotnet/runtime/main/docs/coding-guidelines/breaking-change-rules.md), which has no entry for adding required members and treats "adding a constructor to a class that previously had no constructor" and parameter-default changes as breaking.
- One-way door: closing (a) is breaking (`a-close`), opening (b) is not (`b2-open`, `b1rj-factory`).
- Package validation cannot police factory overload ambiguity (`c-ambig`), so any shipped factory needs a consumer-compile canary (section 9).
- Fixture trap, observed once while building these: with the baseline id `Acme.A`, `PackageValidationBaselineVersion=1.0.0` resolved an unrelated real `Acme.A 1.0.0` from nuget.org (error `PKV006: Target framework .NETStandard,Version=v2.0 is no longer supported in the latest version`) because the baseline restores from the configured sources. Renaming the fixture ids `Zq.ResCon.*` and adding `<packageSourceMapping>` (`Zq.ResCon.*` to `local`, `*` to `nuget.org`) fixed it. A real SDK package id with `PackageSourceMapping` avoids the same collision.

### 5. required, JsonRequired and SetsRequiredMembers with a non-public constructor

- STJ treats C# `required` and `[JsonRequired]` as the same metadata, `JsonPropertyInfo.IsRequired` ([Require properties for deserialization](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/required-properties)). That page also says the C# modifier "won't compile" under source generation; that sentence is historical, since `a`, `b1rj`, `b5` and `a3` all compile with `required` and refuse missing keys (`missing-name: refused JsonException`, net8.0 and net10.0).
- `[JsonConstructor] internal T()` + `public required X { get; init; }` works (`b1rj`); `[JsonConstructor] internal T()` + `[JsonRequired] ... { get; init; } = ""` works (`b1j`).
- `[JsonRequired]` on a get-only property bound through the constructor fails at runtime, not build: `InvalidOperationException: JsonPropertyInfo 'tags' defined in type 'Acme.PackageInfo' is marked required but does not specify a setter.` (`b2j`, both TFMs). CS-API-10's remedy "bind later-mandatory keys as non-`required` `init` properties with `[JsonRequired]`" therefore applies to `init` shapes only.
- With a parameterized constructor, `RespectRequiredConstructorParameters = true` (net9+; STJ 10 package on net8) makes every parameter without a default a mandatory key, nullable or not: `b2x` (`IReadOnlyList<string>? tags` without `= null`) refuses `{"name":"n","version":"1","size":1}`; `b2` (`tags = null`) accepts it. The docs describe the option ("Starting in .NET 9, you can set the `RespectRequiredConstructorParameters` flag to treat non-optional constructor parameters as required"); the nullable-parameter consequence is measured here.
- `[SetsRequiredMembers]` "disables the compiler's checks that all `required` members are initialized" ([required modifier](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/required)); the csharplang speclet says it "removes _all_ requirements from a constructor, and those requirements are not checked for validity in any way" ([required-members.md](https://raw.githubusercontent.com/dotnet/csharplang/main/proposals/csharp-11.0/required-members.md)). `b5` (`[JsonConstructor, SetsRequiredMembers] internal T(...)` + `required` members) round-trips on net8.0 and net10.0: legitimate when SDK code constructs the type through the constructor. On a public constructor it defeats `required` for consumers (`a3-req`: pack clean, consumer clean, `Origin=NULL`). An agent that sees `CS8618` after adding the member silences it with `= default!`, which is exactly what `a3-req` does.
- Required members must be at least as visible as the type ([required modifier](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/required)): `public required` on a `public` type is the only legal combination, which is why the internal constructor, not an internal member, carries the closure.

### 6. ToString and equality without records

CS-API-04 forbids records for result types. Measured on `b2` results parsed twice from the same JSON (`eq/`, xunit.v3.assert 4.0.2):

```text
Equals=False ===False ToString='Acme.PackageInfo'
Assert.Equal: FAIL EqualException
Assert.Equivalent(strict): pass
Assert.Equivalent differing: FAIL as expected EquivalentException
```

`Assert.Equivalent(expected, actual, strict: true)` compares public members structurally and detects a difference, so consumers and the SDK's tests need neither `IEquatable<T>` nor `Equals`. Because consumers cannot construct results, `expected` is also produced by the SDK parser (golden JSON in, golden JSON out) or by the SDK's own tests through `InternalsVisibleTo`. Do not add `ToString` overrides to results for debugging; CS-API-06 already covers secret-bearing types.

### 7. Trim and Native AOT

Consumer `aot/` publishes `Codec.Parse` through the internal-constructor library with `IsAotCompatible=true` on the consumer and `TreatWarningsAsErrors=true`, `-r linux-x64`:

- `PublishAot`, net10.0: `b1rj`, `b2`, `c`: `Generating native code`, no `IL2026`/`IL3050`, native binary runs and prints the round-trip (missing/null key refused).
- `PublishTrimmed`, net8.0 and net10.0, `b1rj`: no warnings, runs.
- `PublishAot`, net8.0, `b1rj`: the ILC stage ran (`Generating native code`) and the native link failed (`collect2 : error : ld returned 1 exit status`; the host has gcc and no clang). Not evidence either way for net8.0 AOT; the trimmed net8.0 run is the clean datum.
- Red twin `aotred`: a consumer doing `JsonSerializer.Deserialize<PackageInfo>(json, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower })` on the internal-constructor type gives `error IL2026` and `error IL3050` for `Deserialize<TValue>(String, JsonSerializerOptions)` under both `PublishAot` and `PublishTrimmed`. (The same hack does bind the type in a normal JIT run, because reflection mode supports non-public constructors since .NET 8; that is why agents reach for it.)

### 8. Option (d): faking at the process boundary

`dcost/bench` spawns `dotnet exec fake.dll` (a 2-line net10.0 console that writes the JSON) 30 times, reading stdout, and compares with one factory call:

```text
process-boundary fake (dotnet exec fake.dll + stdout capture): 24.9 ms per fake result (mean of 30)
ModelFactory call:                                                  65 ns per result
```

What it costs a consumer's unit test beyond time:

- A compiled helper (`.dll`/`.exe`) per test project. CS-PROC resolves exact `ocx`/`ocx.exe` and refuses `.cmd`/`.bat`; a POSIX shell script is not an option on Windows. CS-TEST's `Ocx.Fake` is the SDK's own harness, not shipped.
- Code that takes an SDK result as a parameter (a mapper, a renderer) cannot be called without running the whole client first.
- Windows spawn is slower than the measured Linux figure; not measured here.

The mitigation costs the SDK nothing: consumers map results to their own types at one adapter, test everything past it with plain objects, and test the adapter once against the process fake. Azure's own testing guide ends the same way: its "Refactor your types for testability" section tells consumers to inject the client rather than construct it inside their class ([Unit testing and mocking with the Azure SDK](https://learn.microsoft.com/en-us/dotnet/azure/sdk/unit-testing-mocking)).

### 9. Does a ModelFactory ship?

**Not in 0.x or 1.0.** Reasons, each from a measurement above or a cited guideline:

1. Azure's factory exists to build "model graphs returned from virtual service methods" (`dotnet-mocking-factory-builder`, [Azure SDK .NET guidelines](https://azure.github.io/azure-sdk/dotnet_introduction.html)). Azure clients are mockable (`dotnet-mocking-virtual-method`: "DO make all service methods virtual"); `OcxClient` is sealed with no seam (CS-API-02, CS-API-03). A factory would let consumers build values they can only hand to their own code.
2. It doubles the public surface per result type and ties every future result change to a second, hand-maintained evolution protocol. OpenAI's file model factory shows the protocol: the old overload `[EditorBrowsable(EditorBrowsableState.Never)]` with required parameters forwarding to a new overload with all optional parameters (`openai__openai-dotnet@1f0e8829acac:OpenAI/src/Custom/Files/OpenAIFilesModelFactory.cs:23-49`). Azure states it as `dotnet-mocking-factory-builder-methods`: "hide older overloads and avoid ambiguity" (remove defaults from the old method, hide it, add the new overload).
3. The failure mode of getting it wrong is invisible to package validation: `c-ambig` packs clean and breaks consumers with `CS0121`; `c-optparam` is `CP0002` only because it removes the old signature.
4. The door stays open at no cost: `b1rj-factory` (a v2 that adds a public factory to an internal-constructor type) is package-validation clean and consumer-clean.

If a consumer later shows a concrete test they cannot write, add `OcxModelFactory` (one `public static partial class` per package, named `<Package>ModelFactory`, Azure naming) with these rules: methods named after the type, all parameters with defaults, new members appended through the two-overload protocol (old overload `EditorBrowsable(Never)`, no defaults, forwards with `default`), and a consumer-compile canary project in CI that calls every factory method with its v1 argument list (`cons-ev/c-azure-4` is the shape: four positional arguments must still bind).

### 10. How the exemplars decide

Exemplar commit pins are the `owner__repo@sha12` directories under `~/.cache/research-lang/exemplars/csharp/`.

| Exemplar | Result-type construction | Evidence |
|---|---|---|
| Azure SDK for .NET | Output models have no public constructors; a static `*ModelFactory` builds them; clients are mockable | `Azure__azure-sdk-for-net@32c48fc3d524:sdk/core/Azure.Core/src/Identity/IdentityModelFactory.cs:17-29` (`public static class IdentityModelFactory`, `AuthenticationRecord(...)` => `new AuthenticationRecord(...)`); consumer sample `sdk/core/Azure.Core/tests/samples/MockingSamples.cs:22` (`SecretModelFactory.KeyVaultSecret(...)`); guideline `dotnet-mocking-factory-builder`, "Model types shouldn't have public constructors" ([guidelines](https://azure.github.io/azure-sdk/dotnet_introduction.html)); three model kinds (input / output / round-trip) in [Unit testing and mocking](https://learn.microsoft.com/en-us/dotnet/azure/sdk/unit-testing-mocking) |
| OpenAI .NET | `internal` constructors, get-only properties, `internal` parameterless ctor for the serializer, factories per area | `openai__openai-dotnet@1f0e8829acac:OpenAI/src/Generated/Models/Files/OpenAIFile.cs:15` (`internal OpenAIFile(...)`), `OpenAI/src/Generated/Models/Files/OpenAIFile.Serialization.cs:17` (`internal OpenAIFile()`), `OpenAI/src/Custom/Files/OpenAIFilesModelFactory.cs:23-49` |
| Anthropic C# | Public `sealed record class` with `required` members and public constructors (including `[SetsRequiredMembers]`) | `anthropics__anthropic-sdk-csharp@ae16e5933f39:src/Anthropic/Models/Models/ModelInfo.cs:13,18,196,202-203` |
| Stripe .NET | Mutable public setters, public constructors, tests build entities with initializers | `stripe__stripe-dotnet@dbdca6ba5efc:src/Stripe.net/Entities/Customers/Customer.cs:17,24`; `src/StripeTests/Wholesome/NewtonsoftAndSystemTextJsonOutputTheSameObject.cs:331` |
| Octokit.net | Public parameterless AND all-properties constructors, enforced by convention tests; `private set` | `octokit__octokit.net@7fa5b0fe4a18:Octokit/Models/Response/GitHubCommit.cs:12-14,47`; `Octokit.Tests.Conventions/ModelTests.cs:45,57` |
| Pulumi .NET | No result construction; tests mock the engine through a public interface | `pulumi__pulumi-dotnet@2a0dca84f09b:sdk/Pulumi/Testing/IMocks.cs:11,19` |
| ocx Python SDK (the mirror target) | Frozen slotted dataclasses, public by language default; tests parse fixtures rather than construct | `ocx-sdk-python@80136dde4162:src/ocx_sdk/_results.py:329,552` (`@dataclass(frozen=True, slots=True)`) |

Reading: the sealed-client SDKs with generated models (Anthropic, Stripe) keep models public; the hand-designed, mock-oriented ones (Azure, OpenAI) close them and add factories; Octokit is the extreme public case and its convention tests show the cost (a constructor that must list every property). ocx falls between: handwritten, sealed client, no seam. Python's constructibility is a language default, not a decision to mirror.

### 11. Verified on the toolchain

Fixture root: `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-api-result-construction/`. Re-run everything with `./all.sh` (about 12 minutes; writes `verify.log`). Toolchain: `/home/mherwig/.cache/research-lang/dotnet-tools/run.sh`, SDK 10.0.401 (`global.json` inherited), `sdk11/global.json` = 11.0.100-rc.1.26425.128, `sdk8/global.json` = 8.0.425. Shared setup: `Directory.Build.props` (`LangVersion 14`, `Nullable`, `TreatWarningsAsErrors=true`, `NuGetAudit=false`); each library `TargetFrameworks=net8.0;net10.0`, `IsAotCompatible=true`, `System.Text.Json 10.0.12` on net8.0 only, one `[JsonSerializable(typeof(PackageInfo))]` context with `PropertyNamingPolicy = SnakeCaseLower`, `UnmappedMemberHandling = Skip`, `RespectNullableAnnotations`, `RespectRequiredConstructorParameters`. Ids are `Zq.ResCon.*`, mapped to the local `feed/` folder.

Commands (each is a line of `all.sh`; `b.sh <dir> <tfm> [args]` runs `dotnet build -c Release -f <tfm> --no-incremental` and prints distinct diagnostics; `ev.sh` packs the v2 against the baseline and recompiles the consumer):

```bash
cd /home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-api-result-construction
./b.sh b3/lib net10.0 -p:TreatWarningsAsErrors=false   # raw severity
./b.sh b3/lib net10.0                                   # under the gate
./rt.sh b1 net10.0                                      # runtime round trip
./probe.sh b1 net10.0                                   # silent-failure probe
./ev.sh a-req a-close c-ambig c-azure                   # pack vs baseline + consumer recompile
```

Red and green outputs (from `verify.log`):

| # | Claim | Red (command, observed) | Green twin (observed) |
|---|---|---|---|
| 1 | private `[JsonConstructor]` is rejected on net8/net10 | `./b.sh b3/lib net10.0` -> `exit=1 :: error SYSLIB1222 x2` (raw: `warning SYSLIB1222`); same on `net8.0` | `b2/lib`, `b1rj/lib`: `exit=0` |
| 2 | private accessor under `[JsonInclude]` is rejected | `./b.sh b4/lib net8.0` -> `error SYSLIB1038 x2`; `b4j` same | `b1j/lib`: `exit=0` (internal/`init` accessors) |
| 3 | internal ctor without the attribute: green build, runtime throw | `./rt.sh b1 net10.0` -> `System.NotSupportedException: Deserialization of types without a parameterless constructor ...`; `./b.sh b1/lib net10.0` -> `exit=0 ::` (no diagnostic) | `./rt.sh b1rj net10.0` -> `parse: cmake 3.30.0 42 tags=2`, `missing-name: refused JsonException` |
| 4 | sole internal parameterized ctor without the attribute | `./rt.sh b2n net10.0` -> same `NotSupportedException` | `./rt.sh b2 net10.0` -> round trip |
| 5 | probe catches 3 and 4 | `./probe.sh b1 net10.0` -> `PackageInfo: NO USABLE CONSTRUCTOR (...)`, `exit=1` (also `b1r`, `b2n`, `b3`, `b4` on both TFMs) | `./probe.sh b1rj net10.0` -> `PackageInfo: ok (JsonException = required member enforced)`, `exit=0` (all of `a, a2, a3, b1j, b1rj, b2, b5, c` on both TFMs) |
| 6 | `[JsonRequired]` on get-only ctor-bound property | `./rt.sh b2j net10.0` -> `InvalidOperationException: JsonPropertyInfo 'tags' ... is marked required but does not specify a setter.` | `b1j`: missing key refused with `JsonException` |
| 7 | constructor parameter without default is a mandatory key | `./rt.sh b2x net10.0` -> `unknown-key: refused JsonException` | `b2`: `unknown-key: accepted name=n` |
| 8 | consumers cannot build internal-ctor results | `cons/b1rj-init` -> `error CS1729: 'PackageInfo' does not contain a constructor that takes 0 arguments` | `cons/a-init`: `exit=0` |
| 9 | factory is the only door in (c) | `cons/b2-fact` -> `CS0103` | `cons/c-fact`: `exit=0` |
| 10 | adding `required` to a consumer-constructible type | `./ev.sh a-req` -> `pack exit=0 clean | consumer exit=1 error CS9035` | `a-opt`: `pack exit=0 clean | consumer exit=0 clean` |
| 11 | closing a shipped type | `a-close`: `error CP0002: Member 'Acme.PackageInfo.PackageInfo()' exists on ...` + `CS1729` | `b2-open`: clean/clean |
| 12 | replaced public ctor | `a2-replace`: `CP0002`, consumer `CS7036` | `a2-overload`: clean/clean |
| 13 | optional ctor parameter is a binary break | `a2-optparam`: `CP0002`, consumer compiles | `a2-overload` |
| 14 | optional factory parameter is a binary break | `c-optparam`: `CP0002` on the factory method | `c-azure`: clean/clean |
| 15 | factory overload ambiguity is invisible to package validation | `c-ambig`: `pack exit=0 clean | consumer exit=1 error CS0121` | `c-azure`; `cons-ev/c-azure-4`: `exit=0` |
| 16 | public SRM ctor defeats a later `required` | `a3-req`: `pack exit=0 clean | consumer exit=0 clean`, then `Origin=NULL` | `b1rj-req`: clean/clean (no consumer path to the hole) |
| 17 | SDK-internal sites are checked by the compiler | `ev/b1rj-site/lib` -> `error CS9035: Required member 'PackageInfo.Origin' must be set ...` | `b1rj-req` (all sites updated): `exit=0` |
| 18 | `InternalsVisibleTo` lets only friends construct | `ivt/tests-nofriend` -> `error CS1729` | `ivt/tests`: `exit=0` |
| 19 | reflection-bound consumer breaks trim/AOT | `aotred` -> `error IL2026` + `error IL3050` | `aot` with `b1rj`, `b2`, `c` (`PublishAot` net10.0) and `b1rj` (`PublishTrimmed` net8.0, net10.0): no warnings, binaries run |
| 20 | `Assert.Equal` on class results | `Assert.Equal: FAIL EqualException` | `Assert.Equivalent(strict): pass`; differing input -> `FAIL as expected EquivalentException` |
| 21 | net11 lifts private restrictions (version-gated) | `sdk11/b1`, `b2n`, `b4` (no attribute) still throw `NotSupportedException` | `sdk11/b3` (private `[JsonConstructor]`) and `b4j` (private setter): `Build succeeded`, round trip works; same sources fail with `SYSLIB1222`/`SYSLIB1038` on net8/net10 |

Floor SDK check (`sdk8/`, SDK 8.0.425, `-p:LangVersion=12`): `b1` -> `NotSupportedException`; `b1rj`, `b2` -> round trip; `b3` -> `warning SYSLIB1222` then `NotSupportedException`; `b4` -> `warning SYSLIB1038`. Same as SDK 10.0.401.

Count: 21 red/green pairs watched (one per row above; rows 3 and 5 use the same red shapes, seen at runtime and through the probe).

The probe itself (fixture `probe/Program.cs`; the SDK version belongs in its unit-test project with `InternalsVisibleTo`):

```csharp
foreach (var prop in typeof(OcxJsonContext).GetProperties(BindingFlags.Public | BindingFlags.Instance))
{
    if (!typeof(JsonTypeInfo).IsAssignableFrom(prop.PropertyType)) continue;
    var info = (JsonTypeInfo)prop.GetValue(OcxJsonContext.Default)!;
    try { JsonSerializer.Deserialize("{}", info); }
    catch (JsonException) { /* required member enforced: constructible */ }
    catch (NotSupportedException e) { Assert.Fail($"{info.Type}: no usable constructor: {e.Message}"); }
}
```

### 12. Proposed CS-API row text

Replaces nothing; amends CS-API-04 and CS-API-10, and slots in after CS-API-10. Needs the owner's yes on one point: that consumers have no way to fake results other than their own adapter (section 8).

**CS-API-17 (MUST).** A type the SDK returns is an output type; a type the caller passes in is an input type; no type is both.
- Output type: `public sealed class`; `[JsonConstructor] internal T() { }` (attribute mandatory); every schema-required key is `public required X Name { get; init; }`; every schema-optional key is a nullable `init` property; no public constructor, no `[SetsRequiredMembers]` on a public constructor, no parameterized `[JsonConstructor]`, no `[JsonInclude]` on a `private`/`protected` accessor, no `[JsonRequired]` on a get-only property. The SDK's tests construct results through `InternalsVisibleTo("<its own test assemblies>")` only.
- Input type: unchanged CS-API-04 / CS-API-10 (public implicit constructor, `required init`, `required` fixed at first release).
- A result that must be passed back in is not passed as the result object: the method takes the identifying strings or a separate input type.
- No `OcxModelFactory` or other public builder of output types before a consumer shows a test they cannot write; when one ships, the Azure two-overload rule and a consumer-compile canary apply.
- `required` added to an output type is a wire-contract change (CS-JSON-08 schema-diff, ocx minimum version), not an API change; `CS-API-10`'s diff grep does not apply to types with an `internal` constructor.
- Why: closing a type later is `CP0002`/`CS1729`, opening is additive; an internal constructor makes `required` an SDK-side safety net (`CS9035` at SDK sites) instead of a consumer break; the generator drops non-public constructors that lack the attribute without a diagnostic, so the attribute and a probe test are the contract.
- Check: rules 1-8 below (grep set + `ProbeTests` + consumer canary + AOT smoke).

## Normative guidance candidates

Paths such as `src/Ocx.Sdk/Models` and `tests/Ocx.Sdk.*` assume the adopting repo's layout from CS-API and CS-TEST; every pattern was run against the fixtures (red and green) with ripgrep 14+.

1. **Every output type has `[JsonConstructor] internal T() { }`.**
   - Rationale: the source generator ignores non-public constructors without the attribute and gives no diagnostic (`b1`, `b1r`, `b2n`); the first `Deserialize` throws `NotSupportedException`.
   - Verify: `rg --files-without-match -e '\[JsonConstructor\]' --glob '*.cs' src/Ocx.Sdk/Models` prints nothing (red: `b1/lib/Models.cs`, `b2n/lib/Models.cs`; green: `b1rj`); plus rule 6.
2. **Output types have no public constructor.**
   - Rationale: shape (a2) pins every future member to a constructor signature (`CP0002`); shape (a) cannot be closed later (`a-close`).
   - Verify: `rg -n --glob '*.cs' -e '^\s*public\s+[A-Z]\w*\s*\(' src/Ocx.Sdk/Models` prints nothing (red: `a2`).
3. **`[SetsRequiredMembers]` appears only on `internal` constructors.**
   - Rationale: on a public constructor it hides a later `required` addition (`a3-req`: gates clean, `Origin=NULL`).
   - Verify: `rg -U -n --glob '*.cs' -e 'SetsRequiredMembers[^\n]*\n[^\n]*public\s+\w+\s*\(' src` prints nothing (red: `a3`; green: `b5`).
4. **No `private`/`protected` constructor under `[JsonConstructor]` and no `private`/`protected` accessor under `[JsonInclude]`; `SYSLIB1222` and `SYSLIB1038` are errors and never suppressed.**
   - Rationale: net8.0/net10.0 generators reject them (`b3`, `b4`); net11 accepts them, but the floor is net8.0.
   - Verify: gate `.globalconfig` keeps `dotnet_diagnostic.SYSLIB1222.severity = error` and `dotnet_diagnostic.SYSLIB1038.severity = error` (TWAE already promotes both: `./b.sh b3/lib net10.0` -> `error SYSLIB1222`); `! rg -n -e 'SYSLIB1222' -e 'SYSLIB1038' --glob '*.csproj' --glob '*.props' --glob '*.targets' --glob '*.cs' .` prints nothing outside `.globalconfig`; `rg -U -n --glob '*.cs' -e '\[JsonConstructor\][^\n]*\n\s*(private|protected)' src` prints nothing.
5. **Mandatory keys on results are `required` (or `[JsonRequired]`) on `init` properties; never `[JsonRequired]` on a get-only property.**
   - Rationale: `InvalidOperationException ... marked required but does not specify a setter` at first use (`b2j`).
   - Verify: `rg -n --glob '*.cs' -e '\[JsonRequired\][^\n]*\{\s*get;\s*\}' src` prints nothing (red: `b2j`).
6. **A probe test deserializes `{}` through every type registered in `OcxJsonContext` and fails on `NotSupportedException`.**
   - Rationale: the only check that sees the silent failure; also guards future generator changes (the net11 floor move).
   - Verify: the test exists and iterates `JsonTypeInfo` properties of the context (code in section 11); red `./probe.sh b1 net10.0` exit 1, green `./probe.sh b1rj net10.0` exit 0; `rg -n -e 'GetProperties' -e 'JsonTypeInfo' tests/Ocx.Sdk.Tests` shows it. Assert the number probed equals the number of `[JsonSerializable]` attributes so an empty loop cannot pass.
7. **No parameterized `[JsonConstructor]` on output types.**
   - Rationale: a parameter without a default is a mandatory wire key even when nullable (`b2x`); adding a parameter silently tightens the contract; `[JsonRequired]` is unusable (`b2j`); `required` safety net lost.
   - Verify: `rg -U -n --glob '*.cs' -e '\[JsonConstructor\][^\n]*\n\s*(internal|public|private)\s+\w+\s*\([^)\s]' src/Ocx.Sdk/Models` prints nothing (red: `b2`; green: `b1rj`).
8. **Input vs output is stated per type; a result never appears as a parameter type of a public method.**
   - Rationale: a type cannot be both constructible and closed.
   - Verify: `names=$(rg -o --no-filename --glob '*.cs' -e '\[JsonConstructor\] internal (\w+)\(' -r '$1' src/Ocx.Sdk/Models | sort -u | paste -sd'|'); rg -n --glob '*.cs' --glob '!Models/**' -e "public [^=]*\((.*[ ,(])?($names) \w+" src/Ocx.Sdk` prints nothing (watched: red on `public void Take(PackageInfo p)`, exit 0; green on `Take(string p)`, exit 1). Methods that return a result are fine; only parameter positions match.
9. **No public factory, builder or `Create` method for output types until a consumer demand is recorded.**
   - Rationale: no mockable client to feed; surface doubling; ambiguity invisible to package validation (`c-ambig`).
   - Verify: `rg -n --glob '*.cs' -e 'class \w*ModelFactory' -e 'static \w+ (Create|From)\w*\(' src/Ocx.Sdk/Models` prints nothing before the decision; after it ships, rule 10 applies.
10. **If a ModelFactory ships: old overload `[EditorBrowsable(EditorBrowsableState.Never)]` with no defaults, new overload with all defaults, and a canary consumer project calls every method with its previous argument list.**
    - Rationale: `c-ambig` (`CS0121`) is not caught by package validation; `c-azure` (and `cons-ev/c-azure-4`) is.
    - Verify: `dotnet build tests/Ocx.Sdk.ConsumerCanary -c Release` exits 0 in CI (project references the package, not the source, once a baseline exists); `rg -U -n --glob '*.cs' -e 'EditorBrowsable\(EditorBrowsableState\.Never\)\][^\n]*\n[^\n]*= ' src` prints nothing (a hidden overload with a default).
11. **No `IEquatable<T>`, `Equals`, `GetHashCode` or `ToString` override on output types; tests compare with `Assert.Equivalent(expected, actual, strict: true)` or on projected members.**
    - Rationale: CS-API-04 forbids records; reference equality is the default (`Equals=False`); `Assert.Equivalent` already does the structural job.
    - Verify: `rg -n -e 'IEquatable<' -e 'override bool Equals' -e 'override int GetHashCode' -e 'override string ToString' src/Ocx.Sdk/Models` prints nothing (secret-bearing types handled by CS-API-06 live outside `Models`); `rg -n -e 'Assert\.Equal\(' tests/Ocx.Sdk.Tests` hits are reviewed for class results.
12. **`InternalsVisibleTo` lists exactly the SDK's own test assemblies.**
    - Rationale: it is the only way to construct results (`ivt/tests` green, `ivt/tests-nofriend` `CS1729`); an extra friend is a hidden public API.
    - Verify: `rg -n -e 'InternalsVisibleTo' --glob '*.cs' --glob '*.csproj' --glob '*.props' src` lists only the four CS-TEST test assemblies by exact name (compare with `dotnet sln list`).
13. **A `PublishAot` smoke consumer (net10.0, linux-x64) calls `Parse` for one result per family and publishes warning-free with TWAE.**
    - Rationale: proves the attribute shape stays trim/AOT-clean (`aot` green) and catches a reflection fallback (`aotred` red: `IL2026`, `IL3050`).
    - Verify: `dotnet publish tests/Ocx.Sdk.AotSmoke -c Release -r linux-x64 -p:TreatWarningsAsErrors=true` exits 0; `rg -n --glob '*.cs' -e 'JsonSerializer\.(Deserialize|Serialize)(<[^>]+>)?\([^)]*(JsonSerializerOptions|new JsonSerializerOptions)' src samples docs` prints nothing. (Needs clang on the runner; the trimmed publish needs none.)
14. **Adding `required` to an output type goes through the wire-contract gate, not the API gate.**
    - Rationale: no consumer path breaks (`b1rj-req` clean/clean) but older ocx output without the key is now refused.
    - Verify: a diff that adds `required` on an output type must also touch the vendored `reports.json` golden (`git diff --name-only origin/main...HEAD | rg -e 'reports\.json'` non-empty), and the CS-JSON schema-diff test is green. For input types CS-API-10's `git diff --diff-filter=M -U0 origin/main...HEAD -- '*.cs' | rg '^\+[^+].*\brequired\b'` stays empty.
15. **Shipped-type changes go through baseline package validation with source mapping for the package id.**
    - Rationale: the baseline restores from configured sources and can resolve an unrelated package of the same id (`PKV006` seen with a colliding fixture id).
    - Verify: `rg -n -e 'packageSourceMapping' nuget.config` matches and `dotnet msbuild src/Ocx.Sdk -getProperty:PackageValidationBaselineVersion` is non-empty from the second release (CS-API-12).

## AI-agent angle

| What an LLM characteristically does | Why it compiles/passes | Smallest mechanical check |
|---|---|---|
| Adds `public T(...)` or turns results into records "so tests can build them" (Octokit/Anthropic/Stripe habit) | compiles; its own tests pass | rule 2 `rg` for public ctors in `Models`; CS-API-05 |
| Hides the constructor and forgets the attribute: `internal T() { }` | zero diagnostics; fails only on first `Deserialize` | rule 1 `rg --files-without-match`, rule 6 probe |
| Makes the constructor `private` and adds `[JsonConstructor]` or `[JsonInclude]` with a `private set` (true on .NET 11, in .NET 11 docs) | green on a net11 sandbox; `SYSLIB1222`/`SYSLIB1038` on net8/net10 | TWAE + rule 4; floor SDK build |
| "Fixes" `SYSLIB1222`/`SYSLIB1038` with `<NoWarn>` or `#pragma` | build goes green; runtime `NotSupportedException` | rule 4 second grep; probe |
| Believes "the source generator cannot see internal constructors, make it public" (dotnet/runtime#77016, 2022) | outdated for .NET 8+; leads to public constructors | rule 2 |
| Puts `[JsonRequired]` on `{ get; }` properties bound by a constructor | compiles | rule 5 grep; probe (`InvalidOperationException`) |
| Binds results through a parameterized constructor with nullable parameters without defaults, then wonders why optional keys are "required" | `RespectRequiredConstructorParameters` is set elsewhere | rule 7 grep; round trip with a payload missing optional keys |
| Puts `[SetsRequiredMembers]` on a public constructor to "satisfy" `CS9035` after adding `required` | silences `CS9035` and `CS8618` (with `= default!`) | rule 3 grep |
| Writes an Azure/OpenAI-style `ModelFactory` unprompted, with all-optional parameters, and later adds an optional parameter to a shipped method | pack passes in the ambiguity case (`c-ambig`); optional parameter is source-compatible | rule 9 grep; rule 10 canary; `CP0002` at pack |
| Builds a fake result in a consumer test by reflection: `JsonSerializer.Deserialize<T>(json, options)`, `Activator.CreateInstance(typeof(T), nonPublic: true)` or `RuntimeHelpers.GetUninitializedObject` | works under JIT since reflection mode supports non-public constructors (.NET 8+); the last two bypass `required` (not run here, language rule) | rule 13 grep and AOT smoke (`aotred`: `IL2026`/`IL3050`) |
| Mocks the sealed result with Moq/NSubstitute | fails at runtime (proxy cannot subclass a sealed type); not run here | rule 8; CS-API-03 sealed rule |
| Adds `Equals`/`ToString` or switches tests to `Assert.Equal(expected, actual)` on classes | `Assert.Equal` fails (`EqualException`) | rule 11 grep; `Assert.Equivalent(strict: true)` |
| Adds `required` to a shipped input type and runs `dotnet pack` as the proof | package validation is silent (`a-req`) | CS-API-10 diff grep; consumer canary |
| Treats a clean `dotnet pack` as proof for factory changes | `c-ambig` | consumer canary (rule 10) |

## Contested / evolving

- **Constructible vs closed results (unresolved industry split, as of 2026-10).** Generated SDKs from the OpenAPI toolchains (Anthropic, Stripe) keep public mutable or `required` models; hand-curated SDKs (Azure, OpenAI) close them and add factories; Octokit enforces public constructors by test. Trend: new Microsoft-style guidance still says "Model types shouldn't have public constructors" ([Azure guidelines](https://azure.github.io/azure-sdk/dotnet_introduction.html)); AI-generated SDKs drift public. This artifact sides with closed because ocx has no mockable client and a wire contract it does not own; the choice flips if consumers show a real need for constructed results (rule 9's trigger).
- **.NET 11 / C# 15 (RC1, GA Nov 2026).** The generator will accept private constructors and `[JsonInclude]` on private accessors, and source-generated `init` setters run only for present keys. Unusable while net8.0 is the floor; revisit when the floor moves to net10.0 or net11.0. Watch the `required`-with-initializer interaction (not measured). C# 15 `closed`/`union` remain out (CS-API-08, `CS8652` on 10.0.401).
- **Docs vs generator.** The immutability page says .NET 10 source generation "doesn't support inaccessible constructors, even when you mark them with `[JsonConstructor]`"; the generator and the fixtures show `internal` attributed constructors work. Treat the page's "inaccessible" as `private`/`protected`. The required-properties page's "your code won't compile if you use the `required` modifier" under source generation is out of date (it compiles and enforces on net8.0).
- **Should the SDK ever ship `Ocx.Sdk.Testing`?** A separate package with a canned-output fake host would give consumers the process-boundary fake without touching the core surface. Not decided here; it is the cleaner answer to option (d) if demand appears, and it does not need public result constructors.
- **Native AOT on net8.0.** The link step failed on a gcc-only host; the ILC compile stage printed no warnings. A native-AOT net8.0 run on a runner with clang would close this; trimmed net8.0 is clean.
- **Windows and macOS.** All verdicts rest on managed compile/runtime behaviour that does not vary by OS; the process-cost figure (~25 ms) is a Linux/WSL2 number and Windows spawn is typically slower (unmeasured).

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/immutability | Use immutable types and properties (STJ) | updated 2026-09 (net8-net11) | States the net8-net11 source-gen matrix for non-public constructors and `[JsonInclude]` accessors; the .NET 11 init-only change. Precision caveat in Findings 2 |
| https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/required-properties | Require properties for deserialization (STJ) | updated 2026-03 | `required` = `[JsonRequired]` = `IsRequired`; `RespectRequiredConstructorParameters` (net9+); one stale sentence about source generation |
| https://learn.microsoft.com/dotnet/fundamentals/syslib-diagnostics/syslib1038 | SYSLIB1038 reference | page 2021, still current for net8-net10 | Exact meaning of the `[JsonInclude]` inaccessible-accessor warning |
| https://learn.microsoft.com/en-US/dotnet/fundamentals/syslib-diagnostics/syslib1220-1229 | SYSLIB1220-1229 reference | updated 2026-07 | `SYSLIB1222` inaccessible `[JsonConstructor]` (ID not on its own page: `/syslib1222` is a 404) |
| https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/libraries | What's new in .NET libraries for .NET 11 | 2026-09 (RC) | Records that .NET 11 source generation accepts private/internal/protected members and inaccessible constructors |
| https://raw.githubusercontent.com/dotnet/runtime/main/src/libraries/System.Text.Json/gen/JsonSourceGenerator.Parser.cs | The generator's constructor selection (`TryGetDeserializationConstructor`, `IsSymbolAccessibleWithin`) | main, read 2026-10-11 | Primary evidence that non-public constructors without the attribute are ignored, which explains the silent runtime failure |
| https://github.com/dotnet/runtime/issues/77016 | "Json serializer code generator doesn't support internal constructors" | 2022, closed 2023-06 into #87431, milestone 8.0.0 | Origin of the folklore agents repeat; shows the maintainers' stance and that no workaround was given |
| https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/required | `required` modifier reference | updated 2026-01 (C# 11-14) | Visibility rule, `SetsRequiredMembers` semantics and warning |
| https://raw.githubusercontent.com/dotnet/csharplang/main/proposals/csharp-11.0/required-members.md | Required members speclet | C# 11 | "removes all requirements ... not checked in any way"; metadata encoding and binary-compat note |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/diagnostic-ids | Package Validation Diagnostics IDs (CP0001-CP0020, PKV001-007) | updated 2025-12 | Exact meaning of `CP0002`, `CP0009`, `CP0019`, `PKV006` used in Findings 4 |
| https://raw.githubusercontent.com/dotnet/runtime/main/docs/coding-guidelines/breaking-change-rules.md | .NET runtime breaking-change rules | main | Rules on adding constructors, defaults, sealing; confirms no rule exists for adding `required` members |
| https://azure.github.io/azure-sdk/dotnet_introduction.html | Azure SDK .NET design guidelines (mocking, model factories) | current 2026 | `dotnet-mocking-factory-builder`, `dotnet-mocking-factory-builder-methods`, "Model types shouldn't have public constructors" |
| https://learn.microsoft.com/en-us/dotnet/azure/sdk/unit-testing-mocking | Unit testing and mocking with the Azure SDK for .NET | 2025-04, updated 2026-03 | Input / output / round-trip model taxonomy; how consumers use `*ModelFactory` |
| exemplar `Azure__azure-sdk-for-net@32c48fc3d524:sdk/core/Azure.Core/src/Identity/IdentityModelFactory.cs:17-29` | real ModelFactory | 2026 | The pattern in production |
| exemplar `openai__openai-dotnet@1f0e8829acac:OpenAI/src/Custom/Files/OpenAIFilesModelFactory.cs:23-49` and `.../Generated/Models/Files/OpenAIFile.cs:15` | internal-constructor model plus hidden-overload factory | 2026 | The two-overload evolution protocol in practice |
| exemplar `anthropics__anthropic-sdk-csharp@ae16e5933f39:src/Anthropic/Models/Models/ModelInfo.cs:13,196,202` | public `required` record with `[SetsRequiredMembers]` | 2026 | The consumer-constructible counter-example |
| exemplar `stripe__stripe-dotnet@dbdca6ba5efc:src/Stripe.net/Entities/Customers/Customer.cs:17,24` | mutable public entities | 2026 | The most open model |
| exemplar `octokit__octokit.net@7fa5b0fe4a18:Octokit.Tests.Conventions/ModelTests.cs:45,57` | convention tests forcing public constructors | 2026 | The cost of policy (a2) written down as a test |
| exemplar `pulumi__pulumi-dotnet@2a0dca84f09b:sdk/Pulumi/Testing/IMocks.cs:11,19` | public mock interface at the engine boundary | 2026 | A third way: test seam instead of constructible results |
| local `ocx-sdk-python@80136dde4162:src/ocx_sdk/_results.py:329,552` | Python SDK frozen dataclass results | 2026-10 | The mirror target's construction story |
| local fixtures `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-api-result-construction/` (`verify.log`, `all.sh`) | the evidence for every "watched" claim | 2026-10-11 | Re-runnable in about 12 minutes |
