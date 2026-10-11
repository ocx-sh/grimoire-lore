---
title: "C# language idioms and generated-SDK mimicry"
topic: "csharp-quality/language.md (CS-LANG): primary constructors, internal records, collection expressions, patterns, Span, code-style defaults, mimicry checks (LG-04, LG-05, LG-06, LG-07)"
agent: "csharp-language-idioms-and-mimicry (research-lang deep-dive, wave 3)"
model: "sonnet (claude-sonnet-5-5)"
date_researched: 2026-10-11
sources_count: 36
scope: |
  Covers hand-written C# 14 on .NET 10 (floor .NET 8) in the ocx SDK: primary-constructor hazards, internal records, collection-expression semantics, switch/pattern exhaustiveness (including the CS-API-07 open-enum structs), Span/stackalloc, IDE style defaults, and the checks against copying generated-SDK style, including the analyzer skip for generated code.
  Not covered: public type shape (CS-API-03..07 own sealing, records and open enums), async rules (CS-ASYNC), XML docs (code-docs set), the allocation/CA18xx gate (csharp-performance), TFM polyfills (LG-08).
  C# 15 / .NET 11 RC1 facts are flagged inline and in section 8; they are not recommendations.
---

# C# language idioms and generated-SDK mimicry

Fixture root used throughout: `FX=/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-language-idioms-and-mimicry`. Every fixture builds with SDK 10.0.401, `LangVersion 14`, `AnalysisLevel 10.0-all`, `EnforceCodeStyleInBuild`, `TreatWarningsAsErrors`, `Nullable`, `ImplicitUsings`, `GenerateDocumentationFile` (`$FX/Directory.Build.props`), i.e. the CS-BUILD posture. Exemplar citations are `owner__repo@sha12:path:line` under `/home/mherwig/.cache/research-lang/exemplars/csharp/`.

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
  - [1. Primary constructors](#1-primary-constructors)
  - [2. Records, internal only](#2-records-internal-only)
  - [3. Collection expressions](#3-collection-expressions)
  - [4. Patterns and switch exhaustiveness](#4-patterns-and-switch-exhaustiveness)
  - [5. Span, ref structs, stackalloc](#5-span-ref-structs-stackalloc)
  - [6. Code-style defaults](#6-code-style-defaults)
  - [7. Generated-SDK mimicry and the analyzer skip](#7-generated-sdk-mimicry-and-the-analyzer-skip)
  - [8. C# 15 / .NET 11 flags](#8-c-15--net-11-flags)
  - [9. Idiom decision table](#9-idiom-decision-table)
  - [10. Verified on the toolchain](#10-verified-on-the-toolchain)
- [Normative guidance candidates](#normative-guidance-candidates)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

- A primary-constructor parameter that any member reads becomes a hidden, mutable, non-`readonly` field; the compiler never warns about assignment to it. SDK 10.0.401 with `10.0-all` + TWAE + `EnforceCodeStyleInBuild` built a class that mutates its captured parameter with exit 0 (`pc-mutate-red`). Only Meziantou `MA0143` flags it, and only when enabled per rule.
- There is no `readonly` primary-constructor parameter in C# 14 or in SDK 11.0 RC1 `preview` (`CS9190` on both); the LDM left it "Proposed" ([LDM 2023-07-17](https://raw.githubusercontent.com/dotnet/csharplang/main/meetings/2023/LDM-2023-07-17.md)). Mutable state therefore lives in an explicit `private` field, never in a captured parameter.
- Allow primary constructors only on non-public types whose parameters are read-only inputs. Never on a `public` type (the primary constructor takes the type's accessibility, which breaks the "no public constructor" shape of `OcxClient`) and never mixed capture-plus-initializer.
- `CS9124`, `CS9107` and `CS9113` are warnings that TWAE turns into errors, but `CS9124` fires only for a bare `= name` initializer. `= name ?? throw ...` plus a captured read of `name` built clean (`pc-validate-red`): double storage with no diagnostic. Read the field after the initializer, never the parameter.
- Set `IDE0290` to `none`. Its analyzer "does not check `readonly` or whether a field is mutated" ([Roslyn source](https://raw.githubusercontent.com/dotnet/roslyn/main/src/Analyzers/CSharp/Analyzers/UsePrimaryConstructor/CSharpUsePrimaryConstructorDiagnosticAnalyzer.cs)); it flagged a class whose field is mutated (`ide0290-mutable`). Five exemplars disable or soften it.
- Internal records are for immutable scalar value objects only. `==` on a record compares collection members by reference (`c == d` was `False` for two equal-looking lists) and `with` is a shallow copy (the copy's `Tags.Add` leaked into the original). A positional `record struct` without `readonly` is mutable.
- Collection expressions: the result type depends on the target. `IEnumerable<T>`/`IReadOnlyCollection<T>`/`IReadOnlyList<T>` get a synthesized read-only type (`<>z__ReadOnlyArray`1`), `IList<T>`/`ICollection<T>` get `List<T>`, `[]` for a read-only interface target is `Array.Empty<T>()`. Casting the read-only result throws `InvalidCastException` or `NotSupportedException` (identical on 8.0.31 and 10.0.12).
- The IDE0028/IDE0305 default `when_types_loosely_match` rewrites `IEnumerable<int> x = new List<int>{1,2}` into `[1,2]` and silently changes the runtime type. Use `dotnet_style_prefer_collection_expression = when_types_exactly_match`; it removed exactly one of 12 diagnostics in the matrix (the loose-only `IDE0305`).
- Enum switch expressions: `CS8509` (missing named member) and `CS8524` (unnamed value) are both warnings, so TWAE makes both errors. A `_ => throw` arm clears them and hides new members, so add `IDE0072` (expression) and `IDE0010` (statement) at `warning`; both fired with a discard arm present.
- Open-enum structs (CS-API-07): `Status.Ok => ...` is `CS9135`, and `{ Value: "ok" } => ...` without a discard is `CS8509`. With the mandatory discard arm, adding a new known value produces no diagnostic at all. The remaining checks are a discard that means "unknown/failure" and a conformance test over the type's static members.
- Span: `CS4012` still exists but only for a `Span<T>` parameter of an async method. A `Span<T>` local that does not cross an `await` is legal from C# 13 (`CS9202` on `LangVersion 12`), one that crosses is `CS4007`. Async code uses `Memory<T>`/arrays; confine Span to synchronous internal helpers.
- `stackalloc`: `CA2014` (enabled as warning in .NET 10) is an error under TWAE; pointer `stackalloc` needs `unsafe`/`AllowUnsafeBlocks` and fails with `CS0227` otherwise. Use `Span<byte> b = n <= 256 ? stackalloc byte[n] : new byte[n]` outside loops.
- Analyzers skip generated files. A `// <auto-generated/>` header made `CA1305`, `CA2007`, `CA2016` and `MA0004/MA0011` all silent (`gen-hidden` exit 0 vs `gen-fires` exit 1). The same silence comes from `*.g.cs`, `*.generated.cs`, `*.designer.cs`, `/* <autogenerated> */`, `[GeneratedCode]`. `[CompilerGenerated]`, a prose header (`// Auto-generated by tool`) and a header after the first token do NOT hide.
- The explicit `generated_code` key overrides the heuristics in both directions (`generated_code = false` re-enabled analysis under a header). A blanket `[*.cs] generated_code = false` also re-enables it on source-generator output (`CA1305` in `Ctx.g.cs`), so pair it with `[*.g.cs] generated_code = true` (watched green).
- `#nullable disable` hides only nullable flow warnings (`CS8602` silent) and every CA/MA rule still fires; a generated-header file additionally has nullable off by default and `string?` there is `CS8669`. Both are grep-gated in hand-written code.
- Fleet evidence for mimicry: OpenAI's generated tree carries `// <auto-generated/>` plus `#nullable disable` in 2,316 of 2,316 `Generated/` files, Stripe uses a prose header the analyzers do not recognise, Anthropic has no header.
- Style defaults that earn a gate are the ones that change semantics or hide defects; `var` (IDE0007/IDE0008) does not, and the fleet disagrees (Aspire `suggestion`, testfx `warning`, npgsql `error`). Gate none.
- C# 15 features (`union`, `closed`, `with(...)` collection arguments) compile on SDK 11.0 RC1 with `LangVersion preview` and are parse errors (`CS1001`) on `LangVersion 14`. Dictionary expressions `["a": 1]` do not parse on either as of RC1.

## Findings

### 1. Primary constructors

**Semantics (C# 12+, unchanged in 14).** Parameters are "parameters", not members; they can be assigned to; the compiler creates storage "only when the parameter is accessed in the body of a member" ([MS tutorial](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/tutorials/primary-constructors)). The spec calls the storage "a private field using a mangled name" and says capture fields are readonly only in a `readonly struct` ([csharplang spec](https://raw.githubusercontent.com/dotnet/csharplang/main/proposals/csharp-12.0/primary-constructors.md)). Parameters used only in initializers or base arguments are not captured (same spec). Every other constructor must chain with `this(...)`; referencing a parameter inside another constructor is an error (same spec; `CS9105` in [constructor-errors](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-messages/constructor-errors)).

**Diagnostics that exist** ([constructor-errors](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-messages/constructor-errors), confirmed in `$FX/pc-double-red`):

| ID | Level | Meaning | Observed |
|---|---|---|---|
| CS9124 | warning | parameter captured AND used to initialize a field/property/event | `Types.cs(11,37): warning CS9124`, error under TWAE |
| CS9107 | warning | parameter captured AND passed to the base constructor | `Types.cs(16,49)` |
| CS9113 | warning | parameter unread | `Types.cs(22,34)` |
| CS9179 | warning | parameter shadowed by a base member | documented, not exercised |
| CS9105 | error | parameter used in an explicit constructor's `: base()` | documented |
| CS9114-9119 | error | assignment/ref use in a `readonly struct` | documented |
| CS9190 | error | `readonly` written before the parameter type | `$FX/pc-readonly-param`, SDK 10.0.401 and 11.0 RC1 `preview` |

**Gaps (all watched).**

```csharp
// RED, compiles clean at 10.0-all + TWAE + EnforceCodeStyleInBuild (exit 0): no CS/CA/IDE diagnostic.
internal sealed class Counter(int start)
{
    internal void Bump() => start++;     // mutates the hidden, non-readonly field
    internal int Current() => start;
}
// GREEN: mutable state is a visible field; the parameter is read once.
internal sealed class Counter(int start)
{
    private int _current = start;
    internal void Bump() => _current++;
    internal int Current() => _current;
}
```

- `$FX/pc-mutate-red` built exit 0. With `Meziantou.Analyzer 3.0.297` the same file gave `Counter.cs(6,29): error MA0143: Primary constructor parameters should be readonly` (`$FX/pc-mutate-3p`); the green twin built exit 0. MA0143 is documented as "reports all assignments to primary constructor parameters" (`meziantou__Meziantou.Analyzer@161b7e948ad3:docs/Rules/MA0143.md:5`, README row 175: warning, enabled by default).
- MA0143 is silent under `MeziantouAnalysisMode None` until the per-rule line is added: `$FX/pc-mutate-ma-none` exit 0; `$FX/pc-mutate-ma-perrule` with `dotnet_diagnostic.MA0143.severity = error` exit 1. That matches the CS-API-03 setup (None mode plus per-rule lines).
- `CS9124` is narrow. `private readonly string _name = name ?? throw new ArgumentNullException(nameof(name));` together with `public override string ToString() => name;` built clean (`$FX/pc-validate-red`, exit 0): the type stores the string twice (field `_name` and the hidden capture). The csharplang spec words the rule as "a variable initializer that is just a primary constructor parameter". Review-only.
- `IDE0290` (use primary constructor) fires only for a `public` constructor: `$FX/ide0290-ctor-public` flagged `T.cs(6,12)`, `$FX/ide0290-ctor-internal` exit 0. The Roslyn analyzer comment says: "protected constructor in an abstract type is fine ... otherwise it has to be public" ([Roslyn analyzer source](https://raw.githubusercontent.com/dotnet/roslyn/main/src/Analyzers/CSharp/Analyzers/UsePrimaryConstructor/CSharpUsePrimaryConstructorDiagnosticAnalyzer.cs)). The same source "does not check `readonly` or whether a field is mutated": `$FX/ide0290-mutable` (a field `_n` incremented in `Bump`) was flagged, and the code fix would turn it into exactly the `start++` shape above.
- A `public` type cannot have a non-public primary constructor, because the primary constructor is public (protected on an abstract type, same Roslyn comment). CS-API-01 requires `OcxClient` to have a private constructor and `CreateAsync`, so primary constructors are for internal types only.

**What the corpus does.** 1,130 primary constructors, mostly DI-style (exemplar-language-shape §6): `dotnet__aspire@af646baee1e8:src/Aspire.Hosting/Dcp/ExecutableLaunchPolicy.cs:14` (`internal sealed class ExecutableLaunchPolicy(IConfiguration configuration)`), `npgsql__npgsql@9c47244547c2:src/Npgsql/Internal/ChainDbTypeResolver.cs:8` (`sealed class ChainDbTypeResolver(IEnumerable<IDbTypeResolver> resolvers)`), `Humanizr__Humanizer@4574b93883bf:src/Humanizer/Bytes/ByteRate.cs:11` (public). Five of the 35 exemplars switch IDE0290 off or down: `anthropics__anthropic-sdk-csharp@ae16e5933f39:.editorconfig:28` (`none`), `coverlet-coverage__coverlet@ecd6fd5533e7:.editorconfig:148` (`none`), `dotnet__roslynator@167f43468118:.editorconfig:253` (`none`), `microsoft__testfx@7226b0c74729:.editorconfig:712` (`csharp_style_prefer_primary_constructors = false`), `cake-build__cake@08885933e936:.editorconfig:93` (`suggestion`). xunit mutes the sibling `CS9113` (`xunit__xunit@0c7aa4991fa3:.editorconfig:263`) and npgsql pragmas it with a reason (`npgsql__npgsql@9c47244547c2:src/Npgsql/Internal/Converters/Primitive/ByteaConverters.cs:11`).

**Verdict.** Primary constructors are allowed on non-public classes/structs for read-only inputs and field initializers; mutation, double use and public types are banned; IDE0290 is off so the analyzer cannot push an agent toward the hazard. Why not ban them outright: the DI shape is the dominant fleet use, the DCP-style types have no mutation, and a ban would cost boilerplate for no safety.

The LDM notes record the same concern: developers say capturing primary-constructor parameters is "off limits" until they can be marked `readonly`, and the team was "very inclined to restrict this to just primary constructors, at least initially" ([LDM 2023-07-17](https://raw.githubusercontent.com/dotnet/csharplang/main/meetings/2023/LDM-2023-07-17.md)). Three years on the syntax still does not exist: `CS9190` on SDK 10.0.401 and on SDK 11.0 RC1 `preview` (fixtures 7 and `cs15-probe2`).

### 2. Records, internal only

CS-API-04/05 own public types. For internal use:

```csharp
// OK: immutable scalar value object (internal, sealed).
internal sealed record Digest(string Algorithm, string Hex);
internal readonly record struct Port(int Value);
// BAD: collection member. == is reference equality on the list; `with` aliases it.
internal sealed record Opts(string Name, List<string> Tags);
// BAD: positional record struct is MUTABLE (properties are settable).
internal record struct Pt(int X, int Y);
```

Watched in `$FX/rec-run` (net10.0):

```
1 with-copy aliasing: a.Tags.Count=2 (expected 1 if deep)
2 equal-looking records: c == d -> False
3 record struct is mutable: q.X=99 p.X=1
5 record ToString leaks: Secret { User = u, Password = hunter2 }
```

The language reference matches: `with` produces "a shallow copy" and "init-only properties ... have shallow immutability"; positional properties are "mutable in a `record struct`"; computed properties must be computed on access, not at initialization, or `with` returns a stale value ([MS records](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/record)). The generated `ToString` prints every public member, so CS-API-06's `PrintMembers` rule applies to internal records that reach logs. Fleet scale: records are 407 declarations against 12,483 classes (exemplar-language-shape §7 item 9); a public positional record exists in the corpus (`spectreconsole__spectre.console@0de183140529:src/Spectre.Console/Rendering/RenderOptions.cs:8`) and is the pattern CS-API-05 bans for an SDK.

No analyzer in the gate catches "record with a collection member"; it is a grep (R1) plus review. R1 and R2 greps are in the Normative section and were watched on `$FX/grep-fx/rec`.

### 3. Collection expressions

**What the compiler builds** ([spec](https://raw.githubusercontent.com/dotnet/csharplang/main/proposals/csharp-12.0/collection-expressions.md), [MS reference](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/collection-expressions)):

- `IEnumerable<T>`, `IReadOnlyCollection<T>`, `IReadOnlyList<T>`: a compliant implementation produces a non-mutable value; it "must throw on any call to a mutation method"; the empty expression "is permitted to be a singleton".
- `ICollection<T>`, `IList<T>`: "The value must be an instance of `List<T>`."
- The reference states the expression "always creates a collection that includes all elements ... regardless of the target type": no laziness, unlike LINQ.

Measured on 8.0.31 and 10.0.12 (identical, `$FX/coll-run/Program.cs`, output in `$FX/coll-run.out`):

```
1a IEnumerable<int> runtime type: <>z__ReadOnlyArray`1; as List<int> is null: True
1c ((IList<int>)e).Add -> NotSupportedException
1d (List<int>)e -> InvalidCastException
2  IList<int> -> List`1; ICollection<int> -> List`1
3a IEnumerable<int> [] is Array.Empty singleton: True (Int32[])
3b two List<int> [] are distinct instances: True
3c empty IReadOnlyList cast + Add -> NotSupportedException
4  snapshot count=3 lazy(Concat) count=4        // [..a, ..b] is a copy; LINQ Concat is a view
5  before is List<int>: True; after is List<int>: False
7a P(1,2) -> ReadOnlySpan<int>                  // params int[] vs params ReadOnlySpan<int>: span wins
7b P([1,2]) -> ReadOnlySpan<int>
7c P(arr1) -> int[]
7d Q(1,2) [params int[] vs params IEnumerable<int>] -> int[]
```

Bytes per call for three ints on this thread (identical on both runtimes): `IEnumerable<int>`/`IReadOnlyList<int>` 64 B, `int[]` 40 B, `List<int>` 72 B, `IReadOnlyList<int> [..a, ..b]` (3+3 ints) 72 B, `int[] [..a, ..b]` 48 B, `IEnumerable<int> []` 0 B, `a.Concat(b).ToList()` 136 B. So the read-only-interface form costs one extra wrapper object over an array; the `[]` empty case is free. The `params ReadOnlySpan<T>` overload (C# 13, [what's new](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-13)) works on `net8.0` because it needs only the BCL span type (watched: the same output on 8.0.31).

**The IDE rewrite changes types.** [IDE0028](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/style-rules/ide0028) and [IDE0305](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/style-rules/ide0305) default to `when_types_loosely_match`, which the docs mark "the code fix might change the semantics of your code". Finding 5 above is that change: a `List<int>` held behind `IEnumerable<int>` becomes a read-only synthesized type. Matrix over `$FX/ide-coll-matrix/T.cs` (all six IDE0300-0305/0028 at warning): loose = 12 diagnostics, `when_types_exactly_match` = 11 (the missing one is `L11 IEnumerable<int> d = src.ToList()`, IDE0305), `false` = 0 (exit 0). Rules fired: IDE0028 (`new List<int>{..}`, `new(); AddRange`), IDE0300 (`new int[]{..}`), IDE0301 (`Array.Empty<int>()`), IDE0302 (`stackalloc int[]{..}`), IDE0303 (`ImmutableArray.Create/CreateRange`), IDE0304 (`ImmutableArray.CreateBuilder` + `Add`, `$FX/ide-coll`), IDE0305 (`.ToList()` fluent).

**Limits.** `[]` is not a constant: `List<int>? items = []` as a default parameter is `CS1736` ("must be a compile-time constant", `$FX/ce-default-red`; same as the reference: "can't use ... as the default value for a method argument"). Dictionary expressions `["a": 1]` do not parse on SDK 10.0.401 or on SDK 11.0 RC1 `preview` (`CS1003`).

**Fleet.** Collection expressions: 2,252 vs 1,159 `new List<T>()`, 808 in testfx (exemplar-language-shape §6). testfx enables the family (`microsoft__testfx@7226b0c74729:.editorconfig:199` IDE0028 `warning`, `:721` `dotnet_style_prefer_collection_expression = true`) but mutes the fluent rule (`:346` IDE0305 `none`); Roslynator mutes all of it (`dotnet__roslynator@167f43468118:.editorconfig:254-257`).

### 4. Patterns and switch exhaustiveness

**Closed C# enum.** `CS8509` (some named member not covered) and `CS8524` (all named members covered, an unnamed value such as `(Kind)4` is not) are warnings, so TWAE makes them errors. Watched in `$FX/sw-enum-red`:

```
S.cs(16,47): error CS8524: ... involving an unnamed enum value. For example, the pattern '(Fx.Kind)4' is not covered.
S.cs(8,46):  error CS8509: ... For example, the pattern 'Fx.Kind.Rare' is not covered.
```

With `-p:TreatWarningsAsErrors=false` both are `warning` and the build exits 0, so a command-line TWAE override (CS-BUILD forbids it) would erase this gate. The MS reference confirms the runtime failure: `SwitchExpressionException` on .NET Core 3.0+, "the compiler generates a warning" and "To guarantee that a switch expression handles all possible input values, provide a switch expression arm with a discard pattern" ([switch expression](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/switch-expression)). The green shape has a named arm per member plus `_ => throw new ArgumentOutOfRangeException(...)` (`$FX/sw-enum-green`, exit 0). The discard clears CS8509, so a newly added member passes the build silently. [IDE0072](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/style-rules/ide0072) (expressions) and IDE0010 (statements) restore the signal: with a discard arm present and `Rare` unhandled, `$FX/sw-enum-ide0072` printed `IDE0010 S.cs(18,9)` and `IDE0072 S.cs(8,43)` as errors. (Exemplars mute these: xunit `IDE0072 none` at `xunit__xunit@0c7aa4991fa3:.editorconfig:268`; a tree that wants the signal must set them itself.)

**Open-enum structs (CS-API-07).** `readonly record struct Status(string Value)` with static known instances:

```csharp
// RED ($FX/sw-struct-red)
s switch { Status.Ok => 0, Status.Failed => 1, _ => 2 }        // CS9135 x2: constant value of type 'Status' is expected
s switch { { Value: "ok" } => 0, { Value: "failed" } => 1 }     // CS8509: the pattern '{ Value: "" }' is not covered
// GREEN ($FX/sw-struct-green, exit 0)
s switch { { Value: "ok" } => true, _ => false }                // discard mandatory; routes to NOT success
s == Status.Ok                                                  // single comparison: ==, ordinal
```

The compiler requires a discard arm (CS8509 otherwise) and then says nothing about new known values (`Partial` was added with no arm: exit 0). What remains is not a compile-time check: (a) the discard must mean "unknown/not success", never `true`/default-success, (b) a conformance test enumerates the struct's `public static readonly` members by reflection and asserts each has an explicit handler, (c) never `Enum.Parse`/`JsonStringEnumConverter` on wire data (CS-API-07).

**Other patterns.** `x is not null` / `x is { }` instead of `!= null` (no user-defined `==` invocation, [patterns](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/patterns)). `not` binds before `and`/`or`: the reference's own "Incorrect pattern" example `c is not >= 'a' and <= 'z'` shows the trap; parenthesize. C# 14 added a warning for the redundant pattern in `is not null or 42` ([compiler breaking changes](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/breaking-changes/compiler%20breaking%20changes%20-%20dotnet%2010)). List patterns (`[var first, .., "--"]`) "don't generate a warning when all possible inputs aren't handled" ([switch expression](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/switch-expression)), so every list-pattern switch ends in a discard. Extended property patterns (`{ Start.Y: 0 }`) are IDE0170's territory (patterns page); not gated here.

### 5. Span, ref structs, stackalloc

- **Language limits today** ([ref struct](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/ref-struct), [C# 13](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-13)): a `ref struct` cannot be an array element or class field, cannot be boxed, cannot be captured by a lambda/local function; "Beginning with C# 13, a `ref struct` variable can't be used in the same block as the `await` expression".
- Watched ($FX/span-async-*): `Span<byte> buf = stackalloc byte[16]; await ...; buf[0] = ...` is `CS4007: Instance of type 'System.Span<byte>' cannot be preserved across 'await' or 'yield' boundary` (twice); the same file's `stackalloc` in a loop is `CA2014`. The legal shape (Span declared after the await, never crossing) builds exit 0 on `net10.0` and on `net8.0` (C# 14; a compile-time feature). On `LangVersion 12` the same legal code is `CS9202: Feature 'ref and unsafe in async and iterator methods' is not available in C# 12.0`. `CS4012` (the brief's code) now fires only for a `Span<byte>` parameter of an async method: `CS4012: Parameters of type 'Span<byte>' cannot be declared in async methods or async lambda expressions`. A Span captured by a lambda is `CS8175`.
- Rule from the Memory/Span guidelines: "For a synchronous API, use `Span<T>` ... as a parameter"; Span is unsuitable "for scenarios such as asynchronous method calls", which is what `Memory<T>` is for ([usage guidelines](https://learn.microsoft.com/en-us/dotnet/standard/memory-and-spans/memory-t-usage-guidelines)). The SDK path is almost entirely async I/O and small JSON documents (CS-PROC, CS-JSON), so the reflex is arrays/`string`/`ReadOnlyMemory<byte>`; Span appears only inside a synchronous internal helper that has a measured reason.
- `stackalloc` ([MS](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/stackalloc)): "if the intended buffer size is below a certain limit, allocate the memory on the stack. Otherwise, use an array", "Avoid using `stackalloc` inside loops", and the memory is uninitialized. The reference example uses a 1024 limit and says to "be conservative". [CA2014](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2014) is "Enabled by default in .NET 10: As warning" (Aspire pins it explicitly: `dotnet__aspire@af646baee1e8:.editorconfig:269`). Pointer `stackalloc` needs `unsafe`: `CS0227` without `AllowUnsafeBlocks` (`$FX/unsafe-red`; `$FX/unsafe-green` with `Span<byte> p = stackalloc byte[16]` is exit 0).
- **C# 14 first-class spans** change overload resolution: `Assert.Equal([2], x)` became ambiguous, and a `Span<T>` overload can now beat an `IEnumerable<T>` one and throw `ArrayTypeMismatchException` with a covariant array ([breaking changes](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/breaking-changes/compiler%20breaking%20changes%20-%20dotnet%2010)). Practical consequence: do not add span overloads next to collection overloads on public API (also `OverloadResolutionPriority` exists but is a library-author tool).
- Memory ownership (`IMemoryOwner<T>`, ArrayPool) is a performance topic, left to csharp-performance.

### 6. Code-style defaults

- **Namespaces, usings.** File-scoped namespaces and IDE0005/IDE0055/IDE0161 at `warning` are already CS-BUILD-14. Watched here: the block-scoped namespace (`IDE0161 T.cs(5,11)`) and redundant `using System;` + `using System.Collections.Generic;` (`IDE0005 T.cs(1,1)`) under `ImplicitUsings` are both errors (`$FX/ide-style-red`). `ImplicitUsings=enable` for `Microsoft.NET.Sdk` generates `obj/Debug/net10.0/*.GlobalUsings.g.cs` with `System`, `System.Collections.Generic`, `System.IO`, `System.Linq`, `System.Net.Http`, `System.Threading`, `System.Threading.Tasks` (`$FX/ide-style-green/obj/.../ide-style-green.GlobalUsings.g.cs`, 7 lines).
- **Collisions.** `using System.Timers;` plus the implicit `System.Threading` makes `Timer` ambiguous: `CS0104: 'Timer' is an ambiguous reference between 'System.Timers.Timer' and 'System.Threading.Timer'` (twice). Fix with an alias directive, not a `global using` and not a fully qualified rewrite everywhere (`using Timer = System.Timers.Timer;`, `$FX/ide-style-green` exit 0). A type in your own namespace beats a using, so `Lock`/`Path`-named user types do not collide.
- **`var`.** IDE0007 / IDE0008 fire at build with `EnforceCodeStyleInBuild` (`$FX/ide-var`: `L8 IDE0007`, `L9 IDE0008`), so a gate is mechanically possible. The fleet splits: Aspire `true:suggestion` (`dotnet__aspire@af646baee1e8:.editorconfig:38-40`), testfx built-ins explicit and the rest `warning` (`microsoft__testfx@7226b0c74729:.editorconfig:824-826`), npgsql `true:error` (`npgsql__npgsql@9c47244547c2:.editorconfig:38-39`), Roslynator `none` (`dotnet__roslynator@167f43468118:.editorconfig:205-208`). `var` carries no behavior difference, so no gate (agent loops would oscillate between IDE0007 and IDE0090).
- **`field` keyword (C# 14).** `get; set => field = value?.Trim() ?? string.Empty;` plus `= string.Empty;` builds on `net10.0` and `net8.0` (`$FX/field-kw-green`, `$FX/field-kw-net8`). A type that already has a member named `field` gets `CS9258` (and `CS9266` when only one accessor uses it); a local named `field` inside an accessor is `CS9272` ([breaking changes](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/breaking-changes/compiler%20breaking%20changes%20-%20dotnet%2010)); `$FX/field-kw-red` printed two `CS9258` and one `CS9266`. A nullable-flow wrinkle: without an initializer a non-nullable `field`-backed property is `CS9264`.
- `IDE0066` (switch statement to expression) and `IDE0090` (`new()`) stay at their defaults; the exemplars either mute or soften them (Roslynator `IDE0066 silent`, `.editorconfig:242`).

### 7. Generated-SDK mimicry and the analyzer skip

**Mechanism** ([GeneratedCodeUtilities.cs](https://raw.githubusercontent.com/dotnet/roslyn/main/src/Compilers/Core/Portable/SourceGeneration/GeneratedCodeUtilities.cs), [config options](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/configuration-options)):

- File name: starts with `TemporaryGeneratedFile_` or, minus the extension, ends with `.designer`, `.generated`, `.g` or `.g.i` (case-insensitive).
- Header: any comment in the root's leading trivia containing `<autogenerated` or `<auto-generated` (case-sensitive `Contains`; no count limit; no "generated by" phrase).
- Attributes (watched, not in the fetched file): `[GeneratedCode("tool","1.0")]` on a type hides; `[CompilerGenerated]` does not.
- `generated_code = true|false` in an editorconfig section wins over the heuristics when it parses as a boolean (Roslyn source: `true` -> MarkedGenerated, `false` -> NotGenerated).
- "Generated code files are excluded only from code analysis diagnostics. Other diagnostics, such as those from the C# compiler, aren't affected" (config options). Exception observed: nullable context (below).

**Matrix** ($FX/gen-matrix, one file per row, same planted defects: `await Task.Delay(1)` with a token in scope = CA2016, `42.ToString()` and `string.Format("{0}", 1.5)` = CA1305, awaits without `ConfigureAwait` = CA2007 and MA0004, a `string?` null dereference = CS8602, plus MA0011/MA0048):

| File | Trigger | Analyzer diagnostics |
|---|---|---|
| H1 | `// <auto-generated/>` on line 1 | none (only `CS8669`) |
| H2 | none (plain) | CA1305 CA2007 CA2016 CS8602 MA0004 MA0011 MA0048 |
| H3 | `H3_suffix.g.cs` | none (only `CS8669`) |
| H4 | header after `using System;` | all fire |
| H5 | header + `[H5...] generated_code = false` | all fire |
| H6 | plain + `generated_code = true` | none (only `CS8669`) |
| H7 | `/* <autogenerated> */` | none (only `CS8669`) |
| H8 | `// Auto-generated by tool, do not edit` | all fire |
| H9 | `#nullable disable` | CA1305 CA2007 CA2016 MA* fire; CS8602 silent |
| H10 | `[GeneratedCode("tool","1.0")]` | none |
| H11 | `[CompilerGenerated]` | CA1305 CA2007 CA2016 MA0004 MA0011 fire |
| H12 | `H12.generated.cs` | none |
| H13 | `H13.Designer.cs` | none |

`CS8669` is the compiler's own reminder: "The annotation for nullable reference types should only be used in code within a '#nullable' annotations context. Auto-generated code requires an explicit '#nullable' directive in source." So a header also turns nullable analysis off in that file, with `string?` an error under TWAE; a hand-written file with a copied header therefore also silently loses CS8602-class checks.

**Clean two-file proof** ($FX/gen-hidden vs $FX/gen-fires): identical body, header line 1 only difference. `gen-hidden`: exit 0, zero diagnostics. `gen-fires`: exit 1, `CA2007`, `CA2016`, `CA1305` x2, `CA2007`.

**The defense and its trap.**

```ini
# .editorconfig at the repo root
[*.cs]
generated_code = false      # a header, or a copied .g.cs name, no longer hides anything
[*.g.cs]
generated_code = true       # later section wins: real generator output stays exempt
```

- `$FX/stj-gc-off` (System.Text.Json `[JsonSerializable]` context, no key): exit 0. `$FX/stj-gc-on` (`[*.cs] generated_code = false` only): exit 1, `obj/Debug/net10.0/System.Text.Json.SourceGeneration/.../Ctx.g.cs(72,68): CA1305` and `(80,72)`. `$FX/stj-gc-scoped` (both sections plus a hand-written `// <auto-generated/>` file with a planted CA1305): the only diagnostic is `Hidden.cs(6,37): CA1305`, generator output stays quiet. Only that scoped pair is safe with CS-JSON's mandatory source generation.
- The editorconfig-precedence rule is "the entry that appears later in the file wins" ([configuration files](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/configuration-files)), which is what the second section relies on.
- The brief asked for the `.editorconfig` equivalent of a header: `generated_code = true` is it (H6), and `generated_code = false` is the opposite switch (H5).

**Fleet evidence (what a model has seen).**

- OpenAI: all 2,316 files under `Generated/` start with `// <auto-generated/>` on line 1 and contain `#nullable disable` (`openai__openai-dotnet@1f0e8829acac:OpenAI.Responses/src/Generated/CollectionResults/ResponsesClientGetResponseInputItemsAsyncCollectionResult.cs:1,3`); 2,028 `partial class` declarations across them; `Directory.Build.props` mutes docs (`NoWarn 1591`, `:33`).
- Stripe: 5,934 of 6,151 `.cs` files under `src/Stripe.net` start with a prose line `// File generated from our OpenAPI spec` (`stripe__stripe-dotnet@dbdca6ba5efc:src/Stripe.net/Entities/Charges/Charge.cs:1`), which the Roslyn check does not recognise (H8 behaviour), and the classes are open with mutable DTOs (`Charge.cs:20` `public class Charge`, `:27` `public string Id { get; set; }`). `TreatWarningsAsErrors` is on (`src/Stripe.net/Stripe.net.csproj:24`), so these files are analysed like hand-written ones.
- Anthropic: no `<auto-generated` header in `src/Anthropic/**` (0 of the files), `public sealed record class ApiErrorObject : JsonModel` with `required`/`init` and `_rawData` indirection (`anthropics__anthropic-sdk-csharp@ae16e5933f39:src/Anthropic/Models/ApiErrorObject.cs:12`); a `#pragma warning disable CS9113` in `src/Anthropic/Shims.cs:3`.
- Language-shape §7 item 11 (sealed counts 1/0/269 for Stripe/OpenAI/Anthropic) is why copying this style yields open, mutable, header-hidden code. Models learn the pair "header + `#nullable disable` + `partial`" from the OpenAI tree; each element separately defeats a gate (header: analyzers; `#nullable disable`: null-flow; `partial`: no analyzer, but it signals a generator that is not there).

### 8. C# 15 / .NET 11 flags

SDK 11.0.100-rc.1.26425.128, `net11.0`, `LangVersion preview` (`$FX/cs15-probe`): `[with(capacity: values.Length * 2), .. values]`, `union Pet(Cat, Dog)`, `closed record class Method` all compile; removing a union/closed arm gives `CS8509` (`Fx.Cat`, `Fx.Card` not covered). Switching the same project to `LangVersion 14` gives `CS1001: Identifier expected` at the `union` and `closed` tokens, not a feature-gate message. `readonly` on a primary-constructor parameter is still `CS9190` on RC1 (`$FX/cs15-probe2`). Dictionary expressions `["a": 1]` are `CS1003` on RC1 preview (`$FX/cs15-probe3`). The MS reference now documents C# 15 collection-expression `with(...)` ([collection expressions](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/collection-expressions)), union patterns and closed-hierarchy exhaustiveness ([patterns](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/patterns)) and a C# 15 "memory safety" preview that allows pointer `stackalloc` outside `unsafe` ([stackalloc](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/stackalloc)). None of it is usable under the pinned `LangVersion 14`. CS-API-08 already forbids `union`/`closed` in the public API.

### 9. Idiom decision table

Severity column is the effective severity in the CS-BUILD posture (TWAE turns a warning into a build error). "grep" rows have no compiler gate.

| Idiom | Verdict | ID | Severity / gate |
|---|---|---|---|
| Primary ctor on internal/private class, read-only parameter | allowed | MA0143 | `error` (needs Meziantou; see CS-LANG-02) |
| Primary ctor on a `public` type | banned | grep G6 | grep, 0 hits |
| Assign to a primary-ctor parameter | banned | MA0143 | `error` |
| Parameter captured and used as bare initializer | banned | CS9124 | warning -> error (TWAE) |
| Parameter captured and passed to base | banned | CS9107 | warning -> error |
| Unread primary-ctor parameter | banned | CS9113 | warning -> error |
| `readonly` primary-ctor parameter | does not exist | CS9190 | compiler error |
| "Use primary constructor" suggestion | off | IDE0290 | `none`, `csharp_style_prefer_primary_constructors = false` |
| Internal sealed record, scalar members | allowed | - | review |
| Record with List/array/dictionary member | banned | grep R1 | grep |
| Positional `record struct` without `readonly` | banned | grep R2 | grep |
| `[]` for array, `List<T>`, `Span<T>`, `IReadOnlyList<T>` | required where flagged | IDE0300 IDE0301 IDE0302 IDE0303 IDE0304 IDE0305 IDE0028 | `warning` |
| `dotnet_style_prefer_collection_expression` | `when_types_exactly_match` | - | editorconfig |
| `IEnumerable<T> x = [..]` then cast/mutate | banned | runtime InvalidCast/NotSupported | review heuristic (grep C1) |
| `[]` as default parameter | impossible | CS1736 | compiler error |
| `[with(...)]`, `union`, `closed`, `["k": v]` | banned until C# 15 GA | CS1001 CS1003 | compiler error on 14 |
| Enum switch expression with arm per member | required | CS8509 CS8524 | warning -> error |
| Enum switch with discard that hides new members | caught | IDE0072 IDE0010 | `warning` |
| `default`/`_` arm returning success | banned | - | review heuristic |
| Open-enum struct `case X.Known` | impossible | CS9135 | compiler error |
| Open-enum struct switch without discard | impossible | CS8509 | warning -> error |
| `== null` / `!= null` on references | banned | grep N1 | grep, 0 hits; use `is null` / `is not null` |
| List-pattern switch without discard | banned | - | review heuristic |
| `Span<T>` in a synchronous internal helper | allowed | - | review |
| `Span<T>` parameter of async method | impossible | CS4012 | compiler error |
| `Span<T>` local across `await` | impossible | CS4007 | compiler error |
| `stackalloc` in a loop | banned | CA2014 | warning -> error |
| Pointer `stackalloc`, `unsafe`, `AllowUnsafeBlocks` | banned | CS0227 / grep | compiler error |
| File-scoped namespace, no redundant usings | required | IDE0161 IDE0005 | `warning` (CS-BUILD-14) |
| `global using` in `src` | banned except alias fix | grep U1 | grep |
| `var` vs explicit type | unregulated | IDE0007 IDE0008 | `none` |
| `field` keyword | allowed | CS9258 CS9266 CS9272 | compiler |
| Member named `field` | banned | CS9258 | warning -> error |
| `<auto-generated` / `<autogenerated` header in hand-written file | banned | grep G1 | grep, 0 hits |
| `*.g.cs`, `*.generated.cs`, `*.designer.cs` file in `src`/`tests` | banned | grep G3 | grep, 0 hits |
| `[GeneratedCode]` in hand-written code | banned | grep G4 | grep |
| `#nullable disable` / `restore` | banned | grep G2 | grep |
| `generated_code = false` / `[*.g.cs] true` pair | required | grep G5 | grep, count 1 |
| `partial` type without a generator attribute | banned | grep G9 | grep |

### 10. Verified on the toolchain

Helper: `$FX/b.sh <dir> [args]` = `cd $FX/<dir> && /home/mherwig/.cache/research-lang/dotnet-tools/run.sh dotnet build --nologo -v:q --no-incremental [args]`, output filtered to `(error|warning) ID` lines (paths shortened). Every project is `<Project Sdk="Microsoft.NET.Sdk" />` unless stated; props and `.editorconfig` come from `$FX`. "R" = red, "G" = green twin.

| # | Claim | Fixture | Command | Observed |
|---|---|---|---|---|
| 1 | no built-in diagnostic for mutated primary-ctor parameter | R `pc-mutate-red` | `./b.sh pc-mutate-red` | `exit=0`, no lines |
| 2 | MA0143 flags it; green passes | R `pc-mutate-3p` / G `pc-mutate-3p-green` | `./b.sh pc-mutate-3p` | R `Counter.cs(6,29): error MA0143: Primary constructor parameters should be readonly`, `exit=1`; G `exit=0` |
| 3 | MA0143 needs the per-rule line under mode None | `pc-mutate-ma-none` / `pc-mutate-ma-perrule` | `./b.sh ...` | none: `exit=0`; with `dotnet_diagnostic.MA0143.severity = error`: `error MA0143`, `exit=1` |
| 4 | CS9124 / CS9107 / CS9113 | R `pc-double-red` / G `pc-double-green` | `./b.sh pc-double-red`; `-p:TreatWarningsAsErrors=false` | R `error CS9124`, `CS9107`, `CS9113` (+ `CA1822`), `exit=1`; with TWAE off the same lines are `warning`, `exit=0`; G `exit=0` |
| 5 | CS9124 does not see `?? throw` initializer + capture | R `pc-validate-red` / G `pc-validate-green` | `./b.sh pc-validate-red` | both `exit=0` (the gap) |
| 6 | IDE0290 only for a public ctor, even when the field is mutated | `ide0290-ctor-public`, `ide0290-ctor-internal`, `ide0290-mutable` | `./b.sh ...` | public: `error IDE0290`, internal: `exit=0`, mutable-field public ctor: `error IDE0290` |
| 7 | `readonly` primary-ctor parameter | `pc-readonly-param`, `cs15-probe2` (SDK 11 RC1) | `./b.sh pc-readonly-param` | `error CS9190: 'readonly' modifier must be specified after 'ref'` on both |
| 8 | Header hides CA rules; plain file fires | R `gen-hidden` / G `gen-fires` | `./b.sh gen-hidden`; `./b.sh gen-fires` | R `exit=0` zero lines; G `CA2007`, `CA2016`, `CA1305`x2, `CA2007`, `exit=1` |
| 9 | trigger matrix H1-H13 | `gen-matrix` | `./b.sh gen-matrix > gen-matrix.out` + per-file `grep -o` | section 7 table; `CS8669` on every generated-marked file using `string?` |
| 10 | `generated_code` blanket vs scoped | `stj-gc-off`, `stj-gc-on`, `stj-gc-scoped` | `./b.sh ...` | off `exit=0`; on: `Ctx.g.cs(72,68): CA1305`, `(80,72): CA1305`, `exit=1`; scoped: only `Hidden.cs(6,37): CA1305`, `exit=1` |
| 11 | enum switch CS8509/CS8524 | R `sw-enum-red` / G `sw-enum-green` | `./b.sh sw-enum-red`; `-p:TreatWarningsAsErrors=false` | R `error CS8524`, `error CS8509`, `exit=1`; TWAE off: both `warning`, `exit=0`; G `exit=0` |
| 12 | IDE0072/IDE0010 with discard present | `sw-enum-ide0072` | `./b.sh sw-enum-ide0072` | `IDE0010 S.cs(18,9)`, `IDE0072 S.cs(8,43)`, `exit=1` |
| 13 | open-enum struct switch | R `sw-struct-red` / G `sw-struct-green` | `./b.sh sw-struct-red` | R `CS9135` x2, `CS8509` (`{ Value: "" }` not covered), `exit=1`; G `exit=0` (a new known value `Partial` has no arm, no diagnostic) |
| 14 | collection-expression runtime types, snapshots, params | `coll-run` | `cd $FX/coll-run && ...run.sh dotnet run -f net8.0 --nologo -v:q` (and `-f net10.0`) | section 3 listing, identical on 8.0.31 and 10.0.12 |
| 15 | IDE0028/IDE0300-0305 and the option values | `ide-coll-matrix`, `ide-coll` | `./b.sh ide-coll-matrix` per option value | loose: 12 IDE lines; `when_types_exactly_match`: 11; `false`: `exit=0`; `ide-coll` adds IDE0304 |
| 16 | Span across await, in loop, as async parameter, C# 12 | R `span-async-red` / G `span-async-green` / `span-async-param-red` / `span-async-old` | `./b.sh ...` | R `CS4007` x2 + `CA2014`; G `exit=0`; param `CS4012`; old `CS9202`; G also `exit=0` as `span-async-green-net8` (net8.0 target) |
| 17 | pointer stackalloc | R `unsafe-red` / G `unsafe-green` | `./b.sh unsafe-red` | R `error CS0227: Unsafe code may only appear if compiling with /unsafe`; G `exit=0` |
| 18 | namespace, usings, ambiguity | R `ide-style-red` / G `ide-style-green` | `./b.sh ide-style-red` | R `CS0104` x2, `IDE0005 (1,1)`, `IDE0161 (5,11)`; G `exit=0` |
| 19 | `field` keyword | R `field-kw-red` / G `field-kw-green` / `field-kw-net8` | `./b.sh ...` | R `CS9258` x2, `CS9266`; G and net8 `exit=0` |
| 20 | var rules fire at build | `ide-var` | `./b.sh ide-var` | `L8 IDE0007`, `L9 IDE0008` |
| 21 | internal-record traps | `rec-run` | `cd $FX/rec-run && ...run.sh dotnet run --nologo -v:q` | section 2 listing |
| 22 | C# 15 on SDK 11 RC1 | `cs15-probe`, `cs15-probe3` | `cd $FX/cs15-probe && ...run.sh dotnet build` | `with(...)`/`union`/`closed` compile; removing an arm `CS8509`; `LangVersion 14`: `CS1001`; dictionary expression `CS1003` |
| 23 | the proposed greps (G1-G6, G9, R1, R2) | R `grep-fx/red` / G `grep-fx/green` / `grep-fx/rec` | `$FX/grep-fx/checks.sh red`; `checks.sh green` | red: one hit per check (G5 prints `0`); green: nothing printed. R1 hit two lines, R2 one |
| 24 | the second grep suite and the `.editorconfig` assertions (C1, N1, S1, W1, P1, F1, X1, U1, E1-E5) | R `grep-fx2/red` / G `grep-fx2/green` | `$FX/grep-fx2/checks2.sh red`; `checks2.sh green` | red: every check prints its planted hit (E1-E5 print `0`); green: nothing printed |

Red/green pairs watched on this toolchain: rows 2, 3, 4, 6, 8, 10, 11, 13, 15, 16, 17, 18, 19, 23 and 24 (15 pairs). Rows 5 and 20 are one-sided observations (a gap, a config effect); rows 7, 9, 12, 14, 21, 22 are single-sided facts (a diagnostic, a matrix, a runtime listing).

## Normative guidance candidates

Numbering is provisional (`CS-LANG-nn`). Every grep below was run red then green (suites `$FX/grep-fx/checks.sh`, `$FX/grep-fx2/checks2.sh`) in bash from the repo root with `src` and `tests` as the tree; each flag set is spelled out so it works in any shell. "Prints nothing" means exit status is irrelevant and stdout is empty. The `.editorconfig` count checks end in `| grep -vx 1` (or the expected count) and print only on failure.

**CS-LANG-01 (MUST). A primary constructor may appear only on a non-public `class`/`struct`.**
- Rationale: the primary constructor takes the type's accessibility, so on a public type it creates a public constructor that CS-API-01 forbids.
- Verify: `grep -rnE --include='*.cs' --exclude-dir=obj --exclude-dir=bin -e '^[[:space:]]*public[[:space:]]+((sealed|abstract|static|partial|readonly|unsafe|file)[[:space:]]+)*(class|struct)[[:space:]]+[A-Za-z0-9_]+(<[^>]*>)?[[:space:]]*\(' src` prints nothing. Watched red: `src/Client.cs:2` and `:6`; green clean (`grep-fx` G6).

**CS-LANG-02 (MUST). Never assign to a primary-constructor parameter; mutable state is an explicit `private` field initialized from the parameter.**
- Rationale: a captured parameter is a hidden, non-`readonly` field and no compiler or IDE rule warns (`pc-mutate-red` exit 0); there is no `readonly` parameter syntax (`CS9190`).
- Verify: `dotnet_diagnostic.MA0143.severity = error` in `.globalconfig` with `Meziantou.Analyzer` referenced (CS-API-03 already references it at 3.0.297, mode `None`, per-rule lines). If the build posture drops Meziantou (CS-BUILD lists only BannedApiAnalyzers and VS.Threading as third-party), the fallback is a named reading heuristic: in every file matching `grep -rlE --include='*.cs' --exclude-dir=obj -e '(class|struct)[[:space:]]+[A-Za-z0-9_]+(<[^>]*>)?\(' src`, no primary-constructor parameter appears as an assignment target (`p = `, `p++`, `p +=`, `(p, _) =`). This conflict between CS-API-03 and CS-BUILD is flagged for the consolidator.

**CS-LANG-03 (MUST). Each primary-constructor parameter is either captured by members or used in initializers/base arguments, never both; and a validated parameter is read through its field afterwards.**
- Rationale: both forms double-store (`CS9124`, `CS9107`); `x ?? throw` initializers plus a captured read are the same bug with no diagnostic (`pc-validate-red` exit 0).
- Verify: `CS9124`, `CS9107`, `CS9113` are compiler warnings and stay errors through TWAE (CS-BUILD-08); no `#pragma warning disable CS9124|CS9107|CS9113` and no `dotnet_diagnostic.CS91*` line: `grep -rnE --include='*.cs' --include='.editorconfig' --include='.globalconfig' -e 'CS9124|CS9107|CS9113' src .editorconfig .globalconfig` prints nothing (xunit sets `CS9113 none` at `.editorconfig:263`; the pragma in the Anthropic tree is the pattern to refuse). The `?? throw` plus capture case: reading heuristic, "after the initializer the parameter name appears nowhere else in the type".

**CS-LANG-04 (MUST). `IDE0290` is off.**
- Rationale: its analyzer ignores mutation and `readonly`, so it proposes rewriting a mutated field into a mutable captured parameter (`ide0290-mutable`); five exemplars disable it.
- Verify (E1): `grep -cE '^dotnet_diagnostic\.IDE0290\.severity[[:space:]]*=[[:space:]]*none' .editorconfig | grep -vx 1` and `grep -cE '^csharp_style_prefer_primary_constructors[[:space:]]*=[[:space:]]*false' .editorconfig | grep -vx 1` both print nothing (watched red: both print `0`).

**CS-LANG-05 (MUST). Internal records are `sealed record` or `readonly record struct` with scalar members only (string, primitive, enum, another such value object).**
- Rationale: `==` on collection members is reference equality, `with` is shallow, a plain positional `record struct` has settable properties (`rec-run` items 1-3).
- Verify: `grep -rnE --include='*.cs' --exclude-dir=obj --exclude-dir=bin -e '\brecord([[:space:]]+(class|struct))?[[:space:]]+[A-Za-z0-9_]+(<[^>]*>)?[[:space:]]*\([^)]*(List<|Dictionary<|HashSet<|IReadOnly(List|Dictionary|Collection)<|IEnumerable<|ICollection<|IList<|ImmutableArray<|\[\])' src` prints nothing; `grep -rnE --include='*.cs' --exclude-dir=obj --exclude-dir=bin -e '^[[:space:]]*(public|internal|private)?[[:space:]]*record[[:space:]]+struct' src` prints nothing (watched red: 2 lines and 1 line on `grep-fx/rec`).

**CS-LANG-06 (MUST). Use collection expressions where the IDE rules flag, with `dotnet_style_prefer_collection_expression = when_types_exactly_match`.**
- Rationale: loose matching rewrites `IEnumerable<T> x = new List<T>{..}` into a read-only synthesized type and changes `is List<T>` from true to false (finding 5); exact matching still flags 11 of those 12 forms.
- Verify (E2, `.editorconfig`): `dotnet_style_prefer_collection_expression = when_types_exactly_match` and `dotnet_diagnostic.IDE0028.severity`, `IDE0300` ... `IDE0305` all `= warning`. `grep -cE '^dotnet_diagnostic\.IDE0(028|30[0-5])\.severity[[:space:]]*=[[:space:]]*warning' .editorconfig | grep -vx 7` and `grep -cE '^dotnet_style_prefer_collection_expression[[:space:]]*=[[:space:]]*when_types_exactly_match' .editorconfig | grep -vx 1` print nothing. Watched: `ide-coll-matrix` 11 diagnostics, `ide-coll` IDE0304; the E2 greps red (`0`, `0`) and green on `grep-fx2`.

**CS-LANG-07 (MUST). A collection expression assigned to `IEnumerable<T>`, `IReadOnlyCollection<T>` or `IReadOnlyList<T>` is never cast to a mutable type or mutated; a value that will be mutated is declared `List<T>`/`T[]`/`IList<T>`.**
- Rationale: the result is a read-only synthesized type: cast to `List<T>` -> `InvalidCastException`, `((IList<T>)x).Add` -> `NotSupportedException`, empty `[]` -> `Array.Empty<T>()`; `IList<T>`/`ICollection<T>` targets are `List<T>`.
- Verify: no compiler check. Reading heuristic plus `grep -rnE --include='*.cs' --exclude-dir=obj --exclude-dir=bin -e '\((List|IList|ICollection|HashSet)<[^>]+>\)[[:space:]]*[A-Za-z_]' src` prints nothing (casts of collection values to mutable types need a reviewed comment; the grep is a tripwire, not a proof).

**CS-LANG-08 (MUST). Never use `[]` or `new List<T>()` as a default parameter value; the parameter is `IReadOnlyList<T>? x = null` and the body uses `x ?? []`.**
- Rationale: `CS1736` (compile-time constant required); agents generate it from the property-initializer idiom.
- Verify: compiler (`CS1736` error, `ce-default-red`); no extra gate.

**CS-LANG-09 (MUST NOT). No C# 15 syntax: `with(...)` collection arguments, `union`, `closed`, dictionary expressions.**
- Rationale: pinned `LangVersion 14` (CS-BUILD); on `LangVersion 14` they are parse errors; they only compile on SDK 11 RC1 with `preview` (`cs15-probe`).
- Verify: `grep -rnE --include='*.cs' --exclude-dir=obj --exclude-dir=bin -e '\[with\(' -e '^[[:space:]]*((public|internal)[[:space:]]+)?(closed|union)[[:space:]]' src` prints nothing (watched red: `[with(` and `closed record class`); build with `LangVersion 14` is the backstop (`CS1001`/`CS1003`).

**CS-LANG-10 (MUST). A `switch` expression/statement over a C# enum has one explicit arm per named member and a final `_ => throw new ArgumentOutOfRangeException(...)`; the discard is never a success value.**
- Rationale: `CS8509` and `CS8524` are the only compile-time exhaustiveness checks, both warnings turned into errors by TWAE; a discard clears them, so `IDE0072`/`IDE0010` carry the "member added" signal; `-warnaserror` overrides on the command line would erase both (`sw-enum-red` with TWAE off exit 0).
- Verify: `dotnet_diagnostic.IDE0072.severity = warning` and `dotnet_diagnostic.IDE0010.severity = warning` in `.editorconfig` (E3: `grep -cE '^dotnet_diagnostic\.IDE0(010|072)\.severity[[:space:]]*=[[:space:]]*warning' .editorconfig | grep -vx 2` prints nothing); S1: `grep -rnE --include='*.cs' --exclude-dir=obj --exclude-dir=bin -e '_[[:space:]]*=>[[:space:]]*(true|Ok|Success)\b' src` prints nothing (heuristic for success-by-default arms; watched red `_ => true`; the open-enum rule covers wire data).

**CS-LANG-11 (MUST). A switch over an open-enum struct (CS-API-07) matches `{ Value: "..." }` property patterns or compares with `==`, always has a discard arm, and that arm means unknown/failure.**
- Rationale: `case Status.Ok` is `CS9135`; a missing discard is `CS8509`; a new known value gets no diagnostic (`sw-struct-green`), so the discard must be fail-closed.
- Verify: compiler (`CS9135`, `CS8509`). The "new known value" signal is a test, not a grep: each open-enum type has a test that reflects over its `public static readonly` instances of its own type and asserts every one is handled by the mapping under test (reading heuristic; the placement belongs to CS-TEST). Without it a new `static readonly` instance passes the build silently (`sw-struct-green`).

**CS-LANG-12 (MUST). Null checks use `is null` / `is not null` / `is { }`; `not`, `and`, `or` are parenthesized when mixed; every switch over list patterns ends in a discard.**
- Rationale: the compiler never invokes a user `==` for `is null`; `not` binds before `and` (the reference's own wrong example); list patterns produce no exhaustiveness warning ([switch expression](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/switch-expression)).
- Verify (N1): `grep -rnE --include='*.cs' --exclude-dir=obj --exclude-dir=bin -e '[=!]=[[:space:]]*null\b' src` prints nothing (watched red `== null` and `!= null`); reading heuristic for the other two.

**CS-LANG-13 (MUST). `Span<T>`, `ReadOnlySpan<T>` and `stackalloc` appear only in synchronous internal helpers; async methods take `Memory<T>`, arrays or `string`, never a Span parameter or a Span local that lives across an `await`.**
- Rationale: `CS4012` (parameter), `CS4007` (across await), `CS9202` on `LangVersion < 13`; the SDK path is async I/O.
- Verify: compiler errors; plus `grep -rnE --include='*.cs' --exclude-dir=obj --exclude-dir=bin -e 'async[^=;{]*\([^)]*\b(Span|ReadOnlySpan)<' src` prints nothing (watched red: both an `async` `Span<byte>` and an `async` `ReadOnlySpan<byte>` parameter; green: an `async` `ReadOnlyMemory<byte>` parameter and a synchronous `ReadOnlySpan<byte>` helper pass).

**CS-LANG-14 (MUST). `stackalloc` is `Span<T> b = n <= 256 ? stackalloc T[n] : new T[n]` (a named constant threshold of at most 1024 bytes, the figure in the Learn example; 256 is this document's conservative choice), outside every loop; no pointer `stackalloc`, no `unsafe`, no `AllowUnsafeBlocks`.**
- Rationale: the reference warns of `StackOverflowException`, uninitialized memory and loops; `CA2014` is on by default in .NET 10; pointers need `unsafe`.
- Verify: `CA2014` error under TWAE (`span-async-red`); `CS0227` (`unsafe-red`); `grep -rnE --include='*.csproj' --include='*.props' 'AllowUnsafeBlocks' .` prints nothing; `grep -rnE --include='*.cs' --exclude-dir=obj --exclude-dir=bin -e '\bunsafe\b' src` prints nothing (watched red: `internal unsafe void U()`).

**CS-LANG-15 (MUST). `ImplicitUsings` stays enabled, redundant usings are errors, and an ambiguous type is resolved by an alias directive in the file, never by a project-wide `global using`.**
- Rationale: `CS0104` after adding `using System.Timers;`; `IDE0005`/`IDE0161` are CS-BUILD-14; a `global using` of an ambiguous namespace re-creates the collision everywhere.
- Verify (U1): `grep -rnE --include='*.cs' --exclude-dir=obj --exclude-dir=bin -e '^[[:space:]]*global[[:space:]]+using[[:space:]]' src` prints nothing (SDK-generated `obj/**/GlobalUsings.g.cs` is excluded by `--exclude-dir=obj`); `IDE0005`, `IDE0161` `= warning` per CS-BUILD-14.

**CS-LANG-16 (MUST). No member, local or parameter in a property accessor is named `field`; the `field` keyword is allowed in C# 14 accessors and always paired with an initializer for non-nullable types.**
- Rationale: `CS9258`, `CS9266`, `CS9272`, `CS9264` (`field-kw-red`).
- Verify: compiler errors under TWAE; `grep -rnE --include='*.cs' --exclude-dir=obj --exclude-dir=bin -e '\b(private|internal|public|protected)[[:space:]]+[A-Za-z0-9_<>?,]+(\[\])?[[:space:]]+field[[:space:]]*[;=]' src` prints nothing (watched red: `private int field;`).

**CS-LANG-17 (MUST NOT). `IDE0007` and `IDE0008` are not gated; `var` is neither required nor banned.**
- Rationale: no semantic effect; the exemplars disagree (suggestion/warning/error); enabling both at `warning` makes agents oscillate against IDE0090.
- Verify (E4): `grep -cE '^dotnet_diagnostic\.IDE000[78]\.severity[[:space:]]*=[[:space:]]*none' .editorconfig | grep -vx 2` prints nothing.

**CS-LANG-18 (MUST NOT). No hand-written file carries a generated-code marker: no `<auto-generated`/`<autogenerated` comment, no `*.g.cs`/`*.generated.cs`/`*.designer.cs` name, no `[GeneratedCode]`.**
- Rationale: each one makes every CA/MA/IDE analyzer skip the file (`gen-hidden` exit 0 with planted CA1305/CA2007/CA2016) and turns nullable analysis off in it (`CS8669`).
- Verify (all three print nothing; watched on `grep-fx`):
  - G1: `grep -rlE --include='*.cs' --exclude-dir=obj --exclude-dir=bin -e '<auto-?generated' -e '^//[[:space:]]*(File )?generated (by|from)' src`
  - G3: `find src tests -type f \( -iname '*.g.cs' -o -iname '*.generated.cs' -o -iname '*.designer.cs' \) -not -path '*/obj/*' -not -path '*/bin/*'`
  - G4: `grep -rnE --include='*.cs' --exclude-dir=obj --exclude-dir=bin -e '\[(System\.CodeDom\.Compiler\.)?GeneratedCode(Attribute)?\(' src`

**CS-LANG-19 (MUST). The root `.editorconfig` ends with `[*.cs] generated_code = false` followed by `[*.g.cs] generated_code = true`.**
- Rationale: the explicit key beats the header/name heuristics (`gen-matrix` H5); the second section keeps real source-generator output (`Ctx.g.cs`, CS-JSON) exempt (`stj-gc-on` red, `stj-gc-scoped` green). Without the pair a header slips through; with only the first section the gate fails on generated STJ code.
- Verify (G5/E5): `grep -cE '^generated_code[[:space:]]*=[[:space:]]*false' .editorconfig | grep -vx 1` and `grep -A1 -E '^\[\*\.g\.cs\]' .editorconfig | grep -cE '^generated_code[[:space:]]*=[[:space:]]*true' | grep -vx 1` print nothing (watched red: both print `0`; green: nothing). Canary (optional, proven by `stj-gc-scoped`): a fixture file with a header and a planted CA1305 must fail the build.

**CS-LANG-20 (MUST NOT). No `#nullable disable` or `#nullable restore` directive in `src` or `tests`.**
- Rationale: it silently disables null-flow in that file (`H9`: `CS8602` silent while CA rules still fire); the project property is the only switch (CS-BUILD-14, language-shape §7 item 3: 562 disable directives are migration debt).
- Verify (G2): `grep -rnE --include='*.cs' --exclude-dir=obj --exclude-dir=bin -e '^[[:space:]]*#nullable[[:space:]]+(disable|restore)' src tests` prints nothing.

**CS-LANG-21 (MUST). `partial` on a type appears only with a source-generator attribute in the same file (`[JsonSerializable]`, `[LoggerMessage]`, `[GeneratedRegex]`, `[LibraryImport]`).**
- Rationale: OpenAI's tree has 2,028 `partial class` declarations because of its generator; a hand-written `partial` is mimicry and splits a type across files with no analyzer benefit.
- Verify (G9): `grep -rlE --include='*.cs' --exclude-dir=obj --exclude-dir=bin -e '\bpartial[[:space:]]+(class|struct|record|interface)' src | xargs -r grep -LE 'JsonSerializable|LoggerMessage|GeneratedRegex|LibraryImport'` prints nothing.

**CS-LANG-22 (MUST). Hand-written public types do not copy the generated-SDK shape: sealed (CS-API-03), `required`/`init` or get-only members (CS-API-04), no `get; set;` DTOs, no `List<T>`/array members.**
- Rationale: Stripe/OpenAI/Anthropic generated trees have 1/0/269 sealed classes; models imitate the dominant style.
- Verify: `MA0053` error (CS-API-03); `grep -rnE --include='*.cs' --exclude-dir=obj 'public\s[^=(]*\{\s*get;\s*set;\s*\}' src` prints nothing (CS-API-04).

## AI-agent angle

| What an LLM characteristically does | Why it compiles or passes review | Smallest mechanical catch |
|---|---|---|
| Writes `class Foo(int start) { void Inc() => start++; }` as "modern C#". | Legal; the parameter is a hidden mutable field; no built-in diagnostic. | `MA0143` error, or CS-LANG-02 reading rule. |
| Uses a primary constructor on a `public sealed class` it also gives a `CreateAsync` factory. | Legal; the constructor becomes public. | G6 grep (CS-LANG-01). |
| Assumes `readonly` works on a primary-ctor parameter (`class C(readonly int x)`), a C# 12 discussion item that never shipped. | Hallucinated syntax. | `CS9190` compile error. |
| Writes `Name { get; } = name;` and `ToString() => name;` in the same class. | Compiles with a warning most agents "fix" with `#pragma`. | `CS9124` is an error; the pragma grep in CS-LANG-03. |
| Adds `?? throw new ArgumentNullException(nameof(x))` to a field initializer and keeps reading `x`. | Silent double storage. | Reading heuristic CS-LANG-03 only. |
| Takes the IDE0290 "Use primary constructor" quick fix on a class with a mutated field. | The analyzer does not check mutation. | IDE0290 `none`. |
| Declares `record Options(string Name, List<string> Tags)` and compares or `with`-copies it. | Compiles; equality and copy are shallow. | R1 grep (CS-LANG-05). |
| Declares `record struct Point(int X, int Y)` (no `readonly`) as "immutable". | Properties are settable. | R2 grep. |
| Writes `IEnumerable<string> names = ["a"]; ((List<string>)names).Add("b");` (or relies on `.GetType() == typeof(List<>)`). | Compiles; throws `InvalidCastException`. | CS-LANG-07 grep tripwire; test. |
| Accepts the IDE0028/IDE0305 loose rewrite of `IEnumerable<T> x = new List<T>()`. | The fix "preserves semantics" visually. | `when_types_exactly_match`. |
| Writes `void M(List<int> x = [])` or `= new()`. | Looks like the property initializer. | `CS1736`. |
| Reaches for C# 15 syntax (`["k": v]` dictionary expression, `with(capacity: n)`, `union`, `closed`) from 2026 blog posts. | Compiles on SDK 11 preview only. | CS-LANG-09 grep; `LangVersion 14` parse errors. |
| Writes `switch (kind) { case Kind.Ok: ...; default: return true; }` (default = success). | Compiles; hides new members; fails open on wire data. | IDE0010/IDE0072 `warning`; fail-closed review rule. |
| Writes `case Status.Ok:` / `Status.Ok =>` on an open-enum struct (copied from enum idiom). | Reads naturally. | `CS9135`. |
| Declares `Span<byte> buf` in an `async` method and awaits afterwards, or takes `Span<T>` as an async parameter, citing "Span is faster". | Pre-C# 13 advice; today's compiler allows the non-crossing form. | `CS4007` / `CS4012` / `CS9202`. |
| Allocates `stackalloc` in a loop or with a size from untrusted input. | Compiles. | `CA2014` error; size threshold rule. |
| Writes `unsafe { byte* p = stackalloc byte[n]; ... }`. | Pre-Span idiom. | `CS0227` (no `AllowUnsafeBlocks`). |
| Adds `using System;`, `using System.Collections.Generic;`, block-scoped `namespace X { }` (.NET Framework-era boilerplate). | Compiles. | `IDE0005`, `IDE0161` errors. |
| Adds `using System.Timers;` and `Timer t`. | Looks fine locally. | `CS0104`. |
| Names a field `field` in a new C# 14 type. | Fine on C# 13. | `CS9258`. |
| Copies a generator's shape: `// <auto-generated/>` + `#nullable disable` + `partial class` + `public class X { public string Id { get; set; } }`. | Matches 2,316 training-corpus files. | G1, G2, G9, `MA0053`, CS-API-04 grep. |
| Writes `// Auto-generated by tool, do not edit` thinking it exempts the file from the gate. | Header is not recognised (H8) so it is harmless, but the next agent will "fix" it to `<auto-generated/>` which does. | G1 includes the prose pattern. |
| Marks a hand-written type `[GeneratedCode("x","1")]` to quiet analyzers. | Works (silences CA and MA). | G4 grep. |
| Sets `[*.cs] generated_code = false` globally, breaking CS-JSON's generated context. | `Ctx.g.cs` then fails CA1305. | CS-LANG-19 pair; G5. |

## Contested / evolving

- **Primary constructors.** Fleet use is high (1,130; Humanizer 213, xunit 224) yet five of 35 exemplars disable IDE0290. The language team has not shipped a `readonly` form ("Proposed", LDM 2023-07-17: restrict to primary constructors, "inclined"); if it ships, the CS-LANG-02 rule becomes "mark every parameter readonly" and MA0143 becomes redundant. Trend: toward allowing primary constructors for DI-style types and away from IDE0290 enforcement. As of 2026-10-11 nothing in C# 15 RC1 changes this (`CS9190` on RC1).
- **MA0143 vs the CS-BUILD third-party limit.** CS-API-03 already references Meziantou for MA0053; CS-BUILD says only BannedApiAnalyzers and VS.Threading. The consolidator must decide; MA0143 is the only mechanical catch for mutated parameters.
- **Collection-expression IDE rules.** testfx runs them at `warning` but mutes IDE0305; Roslynator mutes them all; the default `when_types_loosely_match` is documented as semantics-changing. The safe option (`when_types_exactly_match`) is the least-contested recommendation. C# 15 adds `with(...)` arguments and (per proposals, not RC1) dictionary expressions; expect IDE0300-series updates in the SDK 11 analyzers.
- **`var`.** Three exemplars, three severities; a style the team can decide freely; kept ungated here.
- **IDE0072 on open-enum structs.** IDE0072 targets enums and a missing `_`; C# has no compiler-enforced exhaustiveness over open sets, and the C# 15 `closed`/`union` features target the SDK-defined hierarchies rather than wire strings (CS-API-08 rejects them in the public API).
- **Span vs async.** C# 13 relaxed the `Span<T>` async rule (CS4012 -> CS4007 across await only) and C# 14 changed overload resolution for spans; `params ReadOnlySpan<T>` is a library-design tool in .NET 9+ BCL. For a CLI-wrapper SDK this is irrelevant; the rule is "don't".
- **Generated-code detection.** Stable since C# 8; `generated_code` keys are long-standing. The recent trend is a general "AI-generated" file marker in repos, which Roslyn does not recognise; a header comment saying so does not hide analysis (H8).
- **IDE0290 accessibility rule.** The analyzer only fires for `public` constructors (and protected on abstract types); that is an implementation detail and may widen. Do not rely on it as a gate.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/tutorials/primary-constructors | MS tutorial on primary constructors (primary) | C# 12, updated 2026-08 | Hidden field creation, DI use, base double-copy warning |
| https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-messages/constructor-errors | Compiler messages for constructors (primary) | 2026-09 | CS9124/CS9107/CS9113/CS9179/CS9105/CS9114-9119 wording |
| https://raw.githubusercontent.com/dotnet/csharplang/main/proposals/csharp-12.0/primary-constructors.md | csharplang primary-constructors spec (primary) | C# 12 | Capture rules, "just a primary constructor parameter" warning wording |
| https://raw.githubusercontent.com/dotnet/csharplang/main/meetings/2023/LDM-2023-07-17.md | LDM notes on readonly parameters (primary) | 2023-07 | Why `readonly` primary-ctor parameters did not ship |
| https://raw.githubusercontent.com/dotnet/roslyn/main/src/Analyzers/CSharp/Analyzers/UsePrimaryConstructor/CSharpUsePrimaryConstructorDiagnosticAnalyzer.cs | IDE0290 analyzer source (primary) | main, 2026 | Public-only rule; "does not check readonly or whether a field is mutated" |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/style-rules/ide0290 | IDE0290 rule page (primary) | 2023-11, updated 2026-01 | Option `csharp_style_prefer_primary_constructors` |
| https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/record | Records reference (primary) | updated 2026-08 | Shallow `with`, shallow immutability, computed properties |
| https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/collection-expressions | Collection expressions reference (primary) | updated 2026-08 | Conversions, "always creates a collection", overload rules, C# 15 `with(...)` |
| https://raw.githubusercontent.com/dotnet/csharplang/main/proposals/csharp-12.0/collection-expressions.md | csharplang collection-expressions spec (primary) | C# 12 | Interface-target requirements, empty singleton |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/style-rules/ide0028 | IDE0028 (primary) | 2025-04 | `dotnet_style_prefer_collection_expression` values, "might change semantics" |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/style-rules/ide0305 | IDE0305 (primary) | 2023-12, updated 2025-04 | Fluent rewrite, semantics warning |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/style-rules/ide0072 | IDE0072 (primary) | 2020, updated 2023 | Enum/discard completeness for switch expressions |
| https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/switch-expression | Switch expression reference (primary) | updated 2026-10 | Non-exhaustive behavior, list-pattern gap, union/closed notes |
| https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/patterns | Patterns reference (primary) | updated 2026-10 | `not` precedence, list/slice patterns, closed/union (C# 15) |
| https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/ref-struct | ref struct reference (primary) | updated 2026-08 | C# 13 async/iterator relaxation, restrictions |
| https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/stackalloc | stackalloc reference (primary) | updated 2026-06 | Limits, loops, uninitialized memory, C# 15 pointer preview |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2014 | CA2014 (primary) | updated 2026-04 | "Enabled by default in .NET 10: As warning" |
| https://learn.microsoft.com/en-us/dotnet/standard/memory-and-spans/memory-t-usage-guidelines | Memory/Span usage rules (primary) | updated 2026-03 | Span for sync, Memory for async |
| https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-13 | What's new in C# 13 (primary) | .NET 9 | params collections, ref/unsafe in async, ref struct interfaces |
| https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-14 | What's new in C# 14 (primary) | .NET 10, updated 2026-09 | `field`, first-class spans, null-conditional assignment |
| https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/breaking-changes/compiler%20breaking%20changes%20-%20dotnet%2010 | Roslyn breaking changes C# 14 (primary) | 2025 | span overload changes, CS9258/CS9272, redundant `or` pattern warning |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/configuration-options | Code-analysis configuration (primary) | updated 2026-02 | "Exclude generated code", `generated_code`, severity precedence |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/configuration-files | EditorConfig / globalconfig (primary) | updated 2024-08 | "The entry that appears later in the file wins" |
| https://raw.githubusercontent.com/dotnet/roslyn/main/src/Compilers/Core/Portable/SourceGeneration/GeneratedCodeUtilities.cs | Roslyn generated-code detection (primary) | main, 2026 | Exact suffix list, `<autogenerated`/`<auto-generated`, `generated_code` override |
| https://learn.microsoft.com/en-us/dotnet/csharp/nullable-references | Nullable reference types (primary) | updated 2026-07 | Nullable context, default-struct and array pitfalls |
| `meziantou__Meziantou.Analyzer@161b7e948ad3:docs/Rules/MA0143.md` | MA0143 rule doc in the corpus (primary, real source) | 2026 | Reports all assignments to primary-constructor parameters |
| `microsoft__testfx@7226b0c74729:.editorconfig:199,346,712,721,824-826` | A strict repo's IDE settings | 2026 | IDE0028 on, IDE0305 off, IDE0290 false, var warnings |
| `dotnet__roslynator@167f43468118:.editorconfig:205-208,242,253-257` | Roslynator's own IDE settings | 2026 | Mutes IDE0007/8, IDE0028, IDE0290, IDE0300-0305 |
| `anthropics__anthropic-sdk-csharp@ae16e5933f39:.editorconfig:28`; `coverlet-coverage__coverlet@ecd6fd5533e7:.editorconfig:148`; `cake-build__cake@08885933e936:.editorconfig:93` | IDE0290 off/softened in three more repos | 2026 | Fleet disagreement on primary-constructor suggestions |
| `dotnet__aspire@af646baee1e8:.editorconfig:38-40,54,269,349-350` | Aspire var, file-scoped namespace, CA2014 | 2026 | `var` suggestion, CA2014 warning, IDE0161 |
| `npgsql__npgsql@9c47244547c2:.editorconfig:38-40` and `src/Npgsql/Internal/ChainDbTypeResolver.cs:8` | Strict `var` and a primary-constructor example | 2026 | var `error`, internal sealed DI class |
| `xunit__xunit@0c7aa4991fa3:.editorconfig:263,268` | Mutes CS9113 and IDE0072 | 2026 | Example of muting both signals |
| `openai__openai-dotnet@1f0e8829acac:OpenAI.Responses/src/Generated/CollectionResults/ResponsesClientGetResponseInputItemsAsyncCollectionResult.cs:1,3` | OpenAI generated tree header | 2026 | `// <auto-generated/>` + `#nullable disable` x2,316 |
| `stripe__stripe-dotnet@dbdca6ba5efc:src/Stripe.net/Entities/Charges/Charge.cs:1,20,27` | Stripe generated entity | 2026 | Prose header that Roslyn does not recognise; open class, `get; set;` |
| `anthropics__anthropic-sdk-csharp@ae16e5933f39:src/Anthropic/Models/ApiErrorObject.cs:12` and `src/Anthropic/Shims.cs:3` | Anthropic generated model | 2026 | Sealed record class, no header; CS9113 pragma |
| `spectreconsole__spectre.console@0de183140529:src/Spectre.Console/Rendering/RenderOptions.cs:8`; `Humanizr__Humanizer@4574b93883bf:src/Humanizer/Bytes/ByteRate.cs:11` | Public positional record and public primary constructor | 2026 | Counter-examples to CS-API-01/05 |
