---
title: "C# 14 on net8.0 and net10.0, and fencing C# 15 / .NET 11 / preview (LG-02, LG-03)"
topic: csharp-language-csharp14-and-fencing
agent: deep-dive researcher (research-lang, csharp, language posture and modern idioms)
model: sonnet (claude-sonnet-5-5)
date_researched: 2026-10-11
sources_count: 15 URLs (all primary) + 14 exemplar citations + 3 sibling artifacts
scope: |
  Covers: which C# 14 features a repo pinned at LangVersion 14 (CS-BUILD) may use on net8.0 and net10.0, each classified pure-syntax vs runtime/BCL-dependent and compiled+run on 8.0.31 and 10.0.12; the implicit-span-conversion break set as rules; what C# 15 ships in SDK 11.0.100-rc.1 and what needs a net11 runtime; how to fence C# 15 / net11.0 in multi-target code; how LangVersion=preview, EnablePreviewFeatures and Features leak into release builds.
  Not covered: C# 13 and earlier features (LG-05, LG-06); nullable policy (LG-01); primary-constructor pitfalls (LG-04); netstandard2.0 polyfill policy beyond one extension-block fact (LG-08); XML-doc hygiene for extension blocks (sibling code-docs set); .NET 9 behaviour (no net9.0 leg was built).
---

# C# 14 on net8.0 and net10.0, and fencing C# 15 / .NET 11 / preview

Fixture root used throughout: `FX=/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-language-csharp14-and-fencing`. Every command was run as `/home/mherwig/.cache/research-lang/dotnet-tools/run.sh dotnet ...` from inside the named fixture directory. SDK 10.0.401 (compiler 5.9.0-1.26423.113) unless a fixture has its own `global.json` pinning 11.0.100-rc.1.26425.128. Runtimes: 8.0.31, 10.0.12, 11.0.0-rc.1.

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Classification: what the compiler guards and what it does not](#1-classification-what-the-compiler-guards-and-what-it-does-not)
   2. [The `field` keyword](#2-the-field-keyword)
   3. [Extension blocks](#3-extension-blocks)
   4. [Null-conditional assignment](#4-null-conditional-assignment)
   5. [Implicit span conversions: the break catalogue](#5-implicit-span-conversions-the-break-catalogue)
   6. [The other C# 14 syntax features](#6-the-other-c-14-syntax-features)
   7. [Runtime-dependent features the compiler refuses on net8.0](#7-runtime-dependent-features-the-compiler-refuses-on-net80)
   8. [The C# 14 allow-list per TFM](#8-the-c-14-allow-list-per-tfm)
   9. [C# 15 on SDK 11 RC1: what ships and what needs a net11 runtime](#9-c-15-on-sdk-11-rc1-what-ships-and-what-needs-a-net11-runtime)
   10. [Fencing C# 15 and net11.0 in multi-target code](#10-fencing-c-15-and-net110-in-multi-target-code)
   11. [LangVersion=preview, EnablePreviewFeatures and Features leaking into a release](#11-langversionpreview-enablepreviewfeatures-and-features-leaking-into-a-release)
   12. [Exemplar practice](#12-exemplar-practice)
   13. [Verified on the toolchain](#13-verified-on-the-toolchain)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- Every pure-syntax C# 14 feature (`field`, extension blocks, `a?.B = c`, `nameof(List<>)`, untyped lambda parameter modifiers, partial constructors and events, user-defined compound assignment) compiled and ran identically on net8.0 and net10.0 at `LangVersion 14` (8.0.31 and 10.0.12, fixture `$FX/matrix`). The allow-list is the whole set, minus the two restrictions in the next bullets.
- The compiler itself refuses runtime-dependent features on net8.0 with a hard error: `allows ref struct` gives `CS9240` and a covariant span conversion gives `CS0656 ... 'ReadOnlySpan<T>.CastUp'`. Both build on net10.0. These cannot silently miscompile.
- The real hazard is implicit span conversions (first-class spans). They are always on at LangVersion 14, cannot be switched off, and change which overload `array.Method()` binds to depending on the BCL of the TFM. Same source, same LangVersion, different behaviour per TFM.
- Worst case measured: statement `x.Reverse();` on an `int[]` is a no-op discard on net10.0 (`Enumerable.Reverse(T[])`, 1,2,3) and an in-place reversal on net8.0 at LangVersion 14 (`MemoryExtensions.Reverse(Span<T>)`, 3,2,1). It compiles clean on both. Ban `MemoryExtensions.Reverse(Span<T>)` with `RS0030` and call `Array.Reverse` or `Enumerable.Reverse` explicitly.
- Other measured span breaks: `var y = x.Reverse()` is `CS0815` on net8.0 only; a `Span<T>` overload now wins over `IEnumerable<T>` and throws `ArrayTypeMismatchException` for covariant arrays on both TFMs; `MemoryMarshal.Cast` on an array is `CS0029` on both; `array.Contains(n)` inside `Expression<>` becomes `op_Implicit(a).Contains(n)` and fails to compile (interpreted) on both; an extension-method call flipped from the `Span<T>` receiver in a closer namespace to the `ReadOnlySpan<T>` one.
- Public API rule that removes most of this: no `Span<T>`/`ReadOnlySpan<T>` in the SDK's public signatures, and never ship an overload set mixing `IEnumerable<T>`, `T[]` and span types. The SDK needs none.
- `field` is safe to use but a member, local or inherited member named `field` silently rebinds: reading `field` in an accessor of a class with `private int field = 41` returns the synthesized (null/default) field, not 41. The compiler reports `CS9258` as a warning (error under the repo's unconditional TWAE) and `CS9273` as an error for a local. Rename; do not paper over with `@field`.
- `field ??= x` is the same data race as a hand-written lazy init. Do not use it for state of `OcxClient` or anything it owns that can be touched from two threads; use `Lazy<T>`.
- Extension blocks work on net8.0 and netstandard2.0 (no polyfill needed: `ExtensionAttribute` exists there). Methods in a block stay callable from LangVersion 13 consumers (compat static methods are emitted); extension properties and static extension members force the consumer to LangVersion 14 (`CS9260`). Keep extension properties out of the public API.
- A static `extension(Guid) { public static Guid CreateVersion7() ... }` block is a no-`#if` polyfill for a BCL gap: on net8.0 the polyfill is used, on net10.0 the real BCL member wins, with no ambiguity (measured). Exemplars do this (xunit, Humanizer, testfx). It is allowed only as `internal`, and only when semantics equal the BCL.
- Do not declare user-defined compound assignment operators (`public void operator +=(int)`): they mutate in place, so `var alias = a; a += 10;` changes `alias` too (11/11 vs 11/1 with the binary operator). Adding one to a type later silently changes recompiled callers.
- With the pinned SDK 10.0.401 the C# 15 fence is absence: `net11.0` gives `NETSDK1045`, `LangVersion 15` gives `CS1617`. There is nothing to guard until the SDK pin moves. `#if NET11_0_OR_GREATER` code is dead under SDK 10 and never compiled: a body with a misspelled API and an undefined type built green on net8.0;net10.0.
- `LangVersion=preview` on SDK 10.0.401 is not inert: it accepts C# 15 syntax (collection-expression `with(...)`, extension indexers, labeled `break`/`continue`, pointer relaxations) on a net10.0 build with no warning. At LangVersion 14 the same syntax is `CS8652` "currently in Preview and unsupported", which is the free red to keep.
- C# 15 on RC1, measured: `union` needs `IUnion` and `UnionAttribute`, `closed` needs `IsClosedTypeAttribute` (`CS0518`/`CS0656` on net8.0 and net10.0); `with(...)`, extension indexers and labeled `break`/`continue` are syntax-only and ran on net8.0. A user-declared `UnionAttribute`/`IUnion` polyfill compiled and ran on net8.0 and net10.0; the spec says the compiler never synthesizes them. Do not ship that in a public API.
- Fence for a future net11.0 leg: per-TFM `LangVersion` (15 on net11.0 only) plus the C# 15 code in a folder or `#if NET11_0_OR_GREATER` region. Both fences measured: unguarded union is red on the net8.0 and net10.0 legs, fenced is green on all three.
- `EnablePreviewFeatures=true` in a library stamps `[assembly: RequiresPreviewFeatures]`; every consumer then fails with `CA2252` (error by default in .NET 10). `LangVersion=preview` alone stamps nothing. Catch both with one grep over project files plus `dotnet msbuild -getProperty:LangVersion`.
- Practice in the 35-repo corpus is the opposite of the pin: `LangVersion` is `latest` 87 times and `preview` 7 times (6 repos); Microsoft's own page says not to set `latest` and that a language version newer than the TFM's "isn't supported". Treat the pin plus the `net8.0` LangVersion 14 choice as a recorded owner decision (CS-BUILD), not as common practice.

## Findings

### 1. Classification: what the compiler guards and what it does not

Three kinds of C# feature exist for a multi-target library at a fixed `LangVersion`:

| Kind | Mechanism | Failure mode on the older TFM | Guard |
|---|---|---|---|
| Pure syntax | lowered to IL that older runtimes already understand | none | none needed |
| Runtime-type dependent | compiler needs a specific BCL type or member | hard compile error naming the missing member (`CS0518`, `CS0656`, `CS9240`) | the compiler |
| Binding dependent | language rule changes which existing overload is chosen | none: compiles clean, behaviour differs per TFM | tests on every TFM leg plus bans |

Microsoft states the support position: "Using a C# language version newer than the version associated with your target TFM isn't supported" and "Each specific feature has its own minimum .NET API or common language runtime requirements that might allow it to run on down-level frameworks" ([configure-language-version](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/configure-language-version), updated 2026-01-20; [compiler-options/language](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-options/language), 2026-09-10). The sibling artifact [csharp-build-tfm-reach.md §7](../csharp-build/csharp-build-tfm-reach.md) already measured `net8.0` plus `LangVersion 14` and records it as an owner decision. This artifact adds the per-feature matrix and finds the one class (binding dependent) that the compiler does not guard.

Default `LangVersion` per TFM, from `dotnet msbuild lvprobe.csproj -getProperty:LangVersion -p:TargetFramework=<tfm>`: SDK 10.0.401 gives net8.0 = 12.0, net9.0 = 13.0, net10.0 = 14.0; SDK 11.0.100-rc.1 gives net8.0 = 12.0, net10.0 = 14.0, net11.0 = 15.0. So `LangVersion 14` on net8.0 is two versions ahead of that TFM's default.

### 2. The `field` keyword

Semantics ([What's new in C# 14](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-14), updated 2026-09-03; [field spec](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/proposals/csharp-14.0/field-keyword)):

- `field` is a contextual keyword only as a primary expression inside `get`/`set`/`init` bodies of properties (not indexers, not event accessors), in attributes on those accessors, and in lambdas and local functions nested there. Anywhere else, and at LangVersion 12 or lower, it is an identifier.
- Property initializers write the backing field directly and do not call the setter. Constructor assignment calls the setter if one exists.
- `[field: Attr]` works whenever an accessor uses the backing field. `nameof(field)` does not compile. Ref-returning properties cannot use it. `readonly` struct members get a `readonly` backing field.
- One accessor may stay auto: `{ get; set => field = value.Trim(); }`.

Pure syntax: ran on 8.0.31 and 10.0.12 (`$FX/matrix/F01_field.cs`: `x|lazy` on both). It also works with STJ source generation on both TFMs (`F13_stj_field.cs`: `{"Name":"n","Tag":"t"}`).

Collision behaviour, measured in `$FX/fieldvs` (net8.0 and net10.0 identical):

```csharp
// RED: member named field. LangVersion 13 prints 41. LangVersion 14 binds `field` to the synthesized backing
// field, prints an empty line (null), and reports CS9258 (warning; error under TreatWarningsAsErrors).
class C {
    private int field = 41;
    public object Property { get { return field; } }
}
// GREEN: no identifier called field.
class C {
    private int _count = 41;
    public object Property { get { return _count; } }
}
```

```text
D1_member_named_field.cs(4,43): error CS9258: In language version 14.0, the 'field' keyword binds to a synthesized
  backing field for the property. To avoid generating a synthesized backing field, and to refer to the existing member,
  use 'this.field' or '@field' instead.
D1_member_named_field.cs(4,19): error CS9264: Non-nullable property 'Property' must contain a non-null value ...
D1_member_named_field.cs(3,17): error CS0414: The field 'C.field' is assigned but its value is never used
```

The same CS9258 fires for an inherited member (`class B { protected int field = 1; } class D : B { public int P => field; }`, `D5_inherited_field.cs`). A local named `field` is a hard error on SDK 10.0.401: `error CS9273: In language version 14.0, 'field' is a keyword within a property accessor. Rename the variable or use the identifier '@field' instead.` The Roslyn breaking-changes page lists this as `CS9272` ([compiler breaking changes, .NET 10](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/breaking-changes/compiler%20breaking%20changes%20-%20dotnet%2010), updated 2025-10-10); the shipped SDK 10.0.401 prints `CS9273`. Match on the text or on both IDs.

Nullability: a non-nullable reference property whose setter uses `field` and has no initializer is `CS9264` (the spec's "setter analysis"). Green is an initializer (`{ get; set => field = value.Trim(); } = "";`, `D3_semantics.cs` ran `[Ada] [computed] [5]` on both TFMs) or `required`.

Thread-safety: `field ??= new X()` compiles to the same unsynchronised read-check-write as a hand-written lazy field. The spec's own motivating example is the lazy property ([field spec](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/proposals/csharp-14.0/field-keyword)). It is fine for thread-confined state and a data race for shared state. For `Lazy<T>` semantics use `Lazy<T>` or `LazyInitializer`.

### 3. Extension blocks

Syntax and rules ([extension keyword](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/extension), updated 2026-08-13; [extensions spec](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/proposals/csharp-14.0/extensions)): `extension(T name) { ... }` inside a top-level, non-generic `static class`; members may be methods, properties, operators; `extension(T) { static ... }` omits the receiver name when all members are static; type parameters go on the block when used in the receiver; all members across all blocks of one class must have unique signatures (a block opens no scope). The page says converting an existing `this` method to a block member "is a binary and source compatible" change.

Measured on net8.0 and net10.0 at LangVersion 14 (`$FX/matrix/F02_extblock.cs`): `abab True 0` on both.

Metadata: per the spec the compiler emits a grouping type with a content-based name plus marker types and a marker method, the containing class carries `[Extension]`, and instance methods are also emitted as classic static extension methods so older consumers can call them. Measured with a net8.0 library and net8.0 consumers (`$FX/extcompat`):

| Consumer LangVersion | Call | Result |
|---|---|---|
| 13 | `"ab".Twice()` (block method) | `ababab!` printed, works |
| 13 | `"ab".IsBlank` (block property) | `error CS9260: Feature 'extensions' is not available in C# 13.0. Please use language version 14.0 or greater.` |
| 14 | `"ab".Twice()`, `"ab".IsBlank`, `string.Hello()` | `ababFalsehello` |

netstandard2.0 at LangVersion 14 builds an `extension(string s) { public string Twice() ... }` block with no polyfill (`$FX/extcompat/ns2`, 0 errors), because `System.Runtime.CompilerServices.ExtensionAttribute` exists in netstandard2.0. This differs from `record`/`init`/`required`, which need compiler-type polyfills there ([csharp-build-tfm-reach.md §4](../csharp-build/csharp-build-tfm-reach.md)).

Analyzer interaction: under `AnalysisLevel 10.0-all` CA1034 fires on every block on SDK 10.0.401 and not on 11 RC1; the scoped-pragma decision is already in [csharp-build-analyzer-gate.md §13](../csharp-build/csharp-build-analyzer-gate.md) and is not re-decided here. The five approved analyzer packs built an extension-block file without an analyzer crash ([same file §9](../csharp-build/csharp-build-analyzer-gate.md)).

Static blocks as no-`#if` polyfills. A BCL static member missing on the floor TFM can be supplied without a preprocessor guard (`$FX/matrix/F15_static_polyfill.cs`):

```csharp
public static class Polyfills { extension(Guid) { public static Guid CreateVersion7() => new("00000000-0000-7000-8000-000000000000"); } }
// call site: Guid.CreateVersion7()  ->  net8.0: "polyfill-used"   net10.0: "BCL-used"  (no ambiguity, real member wins)
```

Three exemplars do this: [xunit__xunit@0c7aa4991fa3:src/common/DotNetApiPolyfills.cs:61-62](https://github.com/xunit/xunit) (`#if !NET8_0_OR_GREATER` then `extension(Enum)`), [Humanizr__Humanizer@4574b93883bf:src/Humanizer/PolyfillShims.cs:14](https://github.com/Humanizr/Humanizer) (`extension(ArgumentNullException)`), and testfx's generated polyfills ([microsoft__testfx@7226b0c74729:src/Polyfills/OperatingSystem.cs:15](https://github.com/microsoft/testfx), `// <auto-generated />`). The silent risk is that a polyfill with different semantics from the BCL makes the same call behave differently per TFM, so a polyfill must be `internal` and byte-for-byte equivalent.

### 4. Null-conditional assignment

`a?.B = c`, `a?.B += c`, `a?[i] = c` ([What's new in C# 14](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-14)): "The right side of the `=` operator is evaluated only when the left side isn't null"; `++` and `--` are not allowed. Pure syntax, ran on both TFMs (`F03_nullcond.cs`: `7 calls=1 2` on 8.0.31 and 10.0.12: two statements with a side-effecting right side, one executed). `a?.V++` is `CS1059` on both (`F14_nullcond_errors.cs`). At LangVersion 13: `CS9260 Feature 'null conditional assignment' is not available in C# 13.0`.

Hazard: the assignment is silently skipped when the receiver is null. Where a null receiver is a bug (a non-nullable contract), `r?.X = v` swallows it. Real uses in the corpus are state-clearing on optional members: [microsoft__testfx@7226b0c74729:src/Platform/Microsoft.Testing.Extensions.AzureDevOpsReport/AzureDevOpsSummaryReporter.Lifecycle.cs:384](https://github.com/microsoft/testfx) (`row.HistoryTest?.IsFlaky = false;`), [dotnet__aspire@af646baee1e8:src/Aspire.Hosting/Dcp/DcpResourceWatcher.cs:458](https://github.com/dotnet/aspire) (`logStream?.PendingDeduplication = null;`).

### 5. Implicit span conversions: the break catalogue

The language change ([first-class span types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/proposals/csharp-14.0/first-class-span-types), spec 2025-08-06): "The changes in this proposal will be tied to `LangVersion >= 14`." New implicit conversions array to `Span<T>`, array to `ReadOnlySpan<T>` (with covariance), `Span<T>` to `ReadOnlySpan<T>`, `string` to `ReadOnlySpan<char>`; allowed as extension receivers; `ReadOnlySpan<T>` preferred over `Span<T>` by betterness. Because it keys on LangVersion and not on TFM, `LangVersion 14` on net8.0 turns it on against the net8.0 BCL.

Each row below was compiled and run for LangVersion 13 and 14 on net8.0 and net10.0 (`$FX/spanbreak`, driver `./run.sh <Case> <LV>`):

| Case | LV13 | LV14 net8.0 | LV14 net10.0 | Green twin |
|---|---|---|---|---|
| `int[] x; x.Reverse();` (statement) | `1,2,3` (discarded lazy LINQ) | `3,2,1` in-place, no diagnostic | `1,2,3` | `Array.Reverse(x)` or `Enumerable.Reverse(x)`: `3,2,1 1,2,3` on all |
| `var y = x.Reverse();` | `321` | `CS0815 Cannot assign void to an implicitly-typed variable` | `321` (BCL has `Enumerable.Reverse(T[])`) | `Enumerable.Reverse(x)` |
| `C.R(object[] o)` with `R<T>(IEnumerable<T>)` and `R<T>(Span<T>)` | `1` | `ArrayTypeMismatchException` | `ArrayTypeMismatchException` | `C.R(o.AsEnumerable())`: `1` |
| `Span<ulong> y = MemoryMarshal.Cast<double,ulong>(x)` on `double[]` | `1` | `CS0029 ReadOnlySpan<ulong> to Span<ulong>` | same | `MemoryMarshal.Cast<double,ulong>(x.AsSpan())` |
| `Expression<Func<int[],int,bool>> e = (a,n) => a.Contains(n)` | body `a.Contains(n)`, compiles | body `op_Implicit(a).Contains(n)`; interpreted compile throws `ArgumentException ... violates the constraint of type 'TRet'` | same | `Enumerable.Contains(a, n)` |
| Extension `Test(this Span<string>)` in `N2` vs `Test(this ReadOnlySpan<string>)` in own namespace `N1`, call on a `Span<string>` | prints `N2` | prints `N1` | prints `N1` | qualify the call (not run) |
| `int[] a; a.StartsWith(1)` | `CS0411` / `CS1929` | `CS1503 Argument 2: cannot convert from 'int' to 'System.ReadOnlySpan<int>'` | `True` | n/a |

Lessons: (a) the first row is a silent semantic change and differs between the two TFMs of the same build; (b) `Enumerable.Reverse(this T[])` exists only on net10.0 ([dotnet/runtime#107723](https://github.com/dotnet/runtime/issues/107723): API approved 2024-09-17, implemented in PR 107957, milestone 10.0.0) and the Roslyn page calls net8.0 plus C# 14 an "unsupported configuration" for this exact case ([compiler breaking changes, .NET 10](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/breaking-changes/compiler%20breaking%20changes%20-%20dotnet%2010)); (c) the Roslyn page documents the ambiguity (`Assert.Equal([2], x)` against `Assert.Equal<T>(ReadOnlySpan<T>, Span<T>)`) and says "another workaround is for API authors to use the `OverloadResolutionPriorityAttribute`"; (d) the expression-tree break is still present in 10.0.12 even though the spec's design notes discuss changing it (LDM 2025-01-06); LINQ providers and mocking libraries that inspect trees see `MemoryExtensions.Contains` or `op_Implicit` instead of `Enumerable.Contains`.

BCL overloads present only on newer TFMs that these changes depend on (measured net8.0 absent / net10.0 present):

| API | net8.0 | net10.0 | Effect |
|---|---|---|---|
| `Enumerable.Reverse<T>(this T[])` | absent (docs) | present | `arr.Reverse()` binds LINQ on net10.0, `MemoryExtensions.Reverse(Span<T>)` on net8.0 |
| `MemoryExtensions.StartsWith<T>(this ReadOnlySpan<T>, T)` | absent (`CS1503`) | present | `arr.StartsWith(1)` compiles only on net10.0 |
| `ReadOnlySpan<T>.CastUp` | absent (`CS0656`) | present | `ReadOnlySpan<object> r = stringArray;` compiles only on net10.0 |

Not BCL-dependent (identical on both): array to `Span<int>`/`ReadOnlySpan<int>`, `string` to `ReadOnlySpan<char>` (`F11_array_ros_invariant.cs`: `3,3,3`), `arr.Contains(2)`/`SequenceEqual`/`IndexOf` receiver conversions (`F12_ext_recv_span.cs`: `True,True,2`). net9.0 was not built; the Roslyn page says "targeting .NET older than `net10.0`".

### 6. The other C# 14 syntax features

All pure syntax, ran on 8.0.31 and 10.0.12 (`$FX/matrix`):

| Feature | File | Output | Note |
|---|---|---|---|
| `nameof(List<>)`, `nameof(Dictionary<,>)` | `F05_nameof.cs` | `List,Dictionary` | |
| `(text, out result) => int.TryParse(text, out result)` | `F06_lambdamod.cs` | `42` | `params` still needs explicit types ([What's new](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-14)); `scoped` is always a modifier now (breaking-change page) |
| `partial` constructor and `partial` event | `F07_partialctor.cs` | `5` | `partial` can no longer be a bare return type (escape `@partial`) |
| `public void operator +=(V o)` | `F08_compound.cs` | `103` | metadata names `op_AdditionAssignment` etc. ([compound assignment spec](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/proposals/csharp-14.0/user-defined-compound-assignment)) |

User-defined compound assignment changes meaning for existing callers, because the compiler prefers the instance `+=` over `+` when both exist ("the priority is given to compound assignment operators", same spec):

```csharp
public sealed class Acc { public int N; public static Acc operator +(Acc a, int b) => new() { N = a.N + b };
                          public void operator +=(int b) { N += b; } }
var a = new Acc { N = 1 }; var alias = a; a += 10;
// with the instance +=:  a=11 alias=11 (net8.0 and net10.0)     without it (binary + only): a=11 alias=1
```

Contextual-keyword fallout from C# 14/15 (breaking-change pages, both read): `extension` cannot be a type name (VS 18.0), `partial` cannot be a bare return type, `scoped scoped s` is an error; C# 15 adds `union` and `closed` (CS9370/CS9380 as type names) and `with(...)` in collection expressions. Do not name types, members or aliases `extension`, `union`, `closed`, `field`, `safe`.

### 7. Runtime-dependent features the compiler refuses on net8.0

`where T : allows ref struct` (C# 13) at LangVersion 14: net8.0 `error CS9240: Target runtime doesn't support by-ref-like generics.`, net10.0 builds and runs (`F09_allowsref.cs`). The covariant span conversion fails as `error CS0656: Missing compiler required member 'ReadOnlySpan<T>.CastUp'` (`F10_covariant_span.cs`, net8.0; net10.0 prints `2,2`). The span-types spec confirms the mechanism: the conversions "will always exist, regardless of whether any runtime helpers used to implement them are present"; absent helpers become "a compile-time error that a compiler-required member is missing". Both are loud, so no rule beyond "build both legs".

### 8. The C# 14 allow-list per TFM

Decision for a repo pinned at `LangVersion 14` with `net8.0;net10.0` (CS-BUILD):

| Feature | net8.0 | net10.0 | Kind | Verdict |
|---|---|---|---|---|
| `field` | yes | yes | syntax | allow; no identifier named `field` anywhere in the file; no `field ??=` on shared state |
| Extension blocks, methods | yes | yes | syntax | allow; `CA1034` scoped pragma (CS-BUILD); compat static methods emitted |
| Extension blocks, properties / static / operators | yes | yes | syntax | internal only; public use forces consumers to LangVersion 14 |
| Static `extension(BclType)` as polyfill | yes | yes | syntax | allow, `internal`, semantics identical to BCL |
| `a?.B = c`, `a?[i] = c` | yes | yes | syntax | allow where a null receiver is legitimate |
| `nameof(Generic<>)` | yes | yes | syntax | allow |
| Lambda parameter modifiers without types | yes | yes | syntax | allow |
| `partial` constructors and events | yes | yes | syntax | allow (generator authors); no use in hand-written SDK code expected |
| User-defined compound assignment | yes | yes | syntax | ban (aliasing, silent for recompiled callers) |
| Implicit span conversions | on | on | binding | cannot opt out; manage with bans (section 5) |
| `allows ref struct` | `CS9240` | yes | runtime | n/a; compiler-guarded |
| Covariant array to `ReadOnlySpan<object>` | `CS0656` | yes | runtime | avoid; compiler-guarded |
| File-based-app directives (`#:`) | n/a | n/a | tooling | not applicable to a library |

### 9. C# 15 on SDK 11 RC1: what ships and what needs a net11 runtime

The C# 15 page lists six areas (collection expression arguments, union types, closed hierarchies, extension indexers, labeled `break`/`continue`, memory safety) and says ".NET 11 preview versions support C# 15" ([What's new in C# 15](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-15), updated 2026-09-14). The Roslyn status page adds "Non-virtual static interface members without DIM runtime support" at "C# 15" and lists unsafe evolution and runtime async as preview-only ([Language Feature Status](https://github.com/dotnet/roslyn/blob/main/docs/Language%20Feature%20Status.md), read 2026-10-11, no versions given for the C# 15 rows).

Measured with `$FX/rc1` (SDK 11.0.100-rc.1.26425.128, one source file per feature, `-p:LV=<v> -p:TFM=<t>`):

| Feature | LV14 | LV15 net11.0 | LV15 net10.0 / net8.0 | LV preview | Kind |
|---|---|---|---|---|---|
| `public union Pet(Cat, Dog);` | `CS0106`, `CS8803`, `CS1001` (not a keyword) | ran: `Rex` | `CS0518 'IUnion' not defined`, `CS0656 UnionAttribute..ctor` | ran | runtime types |
| `public closed record class GateState;` | `CS9327 ... not available in C# 14.0. Please use language version 15.0 or greater.` | ran: `5% open` | `CS0656 IsClosedTypeAttribute..ctor` | ran | runtime types |
| `[with(capacity: 10), .. values]` | `CS9327` | ran: `10 1` | ran: `10 1` | ran | syntax |
| `extension(IEnumerable<int> s) { public int this[int i] => ... }` | `CS9327` | ran: `3` | ran: `3` | ran | syntax |
| `continue outer;` (labeled) | `CS9327` | ran: `3` | ran: `3` | ran | syntax |
| `int* p = &n;` outside `unsafe` | `CS0214` | `CS0214` | not run | ran: `42` | preview-only (LangVersion `preview`) |

Further facts: LangVersion `latest` on SDK 11 RC1 resolves to 15.0 and on 10.0.401 to 14.0 ([csharp-build-tfm-reach.md §7](../csharp-build/csharp-build-tfm-reach.md)). The runtime ships `UnionAttribute` and `IUnion` "beginning with .NET 11 Preview 5" and "Some features from the proposal specification aren't yet implemented" ([C# 15 page](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-15)). The union spec resolves "What if types for union declaration are missing": "The compiler should not synthesize these types and users should provide them explicitly, either by referencing assemblies or defining them locally" ([unions spec](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/proposals/csharp-15.0/unions), 2026-08-19). Measured: declaring `System.Runtime.CompilerServices.UnionAttribute` and `IUnion` locally made the union compile and run on net8.0, net10.0 and net11.0 (`U7_union_polyfilled.cs`). That is technically possible and a type-identity trap for a public API (the type later exists in the runtime).

The memory-safety work is preview-only and has two independent switches: `LangVersion preview` (syntax, pointer relaxations) and `<Features>$(Features);updated-memory-safety-rules</Features>`, which makes the compiler record `System.Runtime.CompilerServices.MemorySafetyRulesAttribute` in the assembly; "A future stable SDK property, `MemorySafetyRules` ... isn't implemented yet" ([compiler-options/language](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-options/language)). Measured: with the feature flag the assembly contains the attribute (also when targeting net10.0 under the RC1 SDK); without it, not (`strings out/s-true/rc1s.dll | grep -c MemorySafetyRulesAttribute` = 1 vs 0).

The .NET 11 compiler breaking-changes page ([updated 2026-08-13](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/breaking-changes/compiler%20breaking%20changes%20-%20dotnet%2011)) lists items relevant to a net11 leg: collection-expression `Span<T>` safe-context becomes declaration-block (new errors); `ref readonly` synthesized delegates and local functions need `System.Runtime.InteropServices.InAttribute` (`CS0518`); `with(...)` as a collection element binds as constructor arguments when LangVersion >= 15 (use `@with`); `closed` and `union` become contextual keywords in declaration contexts. Several entries are labelled "C# 16" (pointer types without `unsafe`, `safe` keyword, VS 18.7 and 18.9) while the C# 15 page says memory safety is part of C# 15 preview: the labels are inconsistent on RC1 docs; verify on the shipped GA SDK.

### 10. Fencing C# 15 and net11.0 in multi-target code

Fact 1: under the pinned SDK 10.0.401 nothing C# 15 or net11 can be built (`$FX/sdk10-probe`): `TargetFramework net11.0` gives `error NETSDK1045: The current .NET SDK does not support targeting .NET 11.0`; `LangVersion 15` gives `error CS1617: Invalid option '15' for /langversion`. A pinned SDK is therefore a total fence for C# 15 `union`, `closed`, net11.0 APIs.

Fact 2: `#if NET11_0_OR_GREATER` regions are not compiled under SDK 10. `$FX/deadcode` (TargetFrameworks `net8.0;net10.0`, LangVersion 14, TWAE on):

```csharp
#if NET11_0_OR_GREATER
    public static System.Threading.Tasks.Task<NoSuchType> Run() => System.Diagnostics.Process.RunAsyncc("ocx");  // typo + undefined type
#endif
```

`dotnet build` printed `0 Error(s)`. Changing the guard to `NET10_0_OR_GREATER` makes it `error CS0246: The type or namespace name 'NoSuchType' could not be found`. Code behind a guard no leg compiles rots. The constants are defined as expected on an RC1 build: compiled `NET8` for net8.0, `NET10_0_OR_GREATER` for net10.0, `NET11_0_OR_GREATER` for net11.0 (`strings -e l out/probe/<tfm>/fence2.dll`). Exemplar: [cake-build__cake@08885933e936:src/Cake.Core/IO/ProcessRunner.cs:7,89](https://github.com/cake-build/cake) guards `Process.RunAsync` with `#if NET11_0_OR_GREATER`; cake builds with an SDK that has the net11.0 leg.

Fact 3 (the multi-target fence once SDK 11 is pinned), `$FX/fence`, global.json pinning 11.0.100-rc.1:

```xml
<!-- per-TFM LangVersion: C# 15 only where the runtime has the types -->
<TargetFrameworks>net8.0;net10.0;net11.0</TargetFrameworks>
<LangVersion Condition="'$(TargetFramework)' == 'net11.0'">15</LangVersion>
<LangVersion Condition="'$(TargetFramework)' != 'net11.0'">14</LangVersion>
```

| Variant | net8.0 | net10.0 | net11.0 |
|---|---|---|---|
| RED A: `LangVersion 15` on every leg, `public union Pet(Cat, Dog);` unguarded | `CS0518 IUnion`, `CS0656 UnionAttribute..ctor` | same | clean |
| RED B: per-TFM LangVersion, same unguarded union | `CS0106`, `CS8803` | same | clean |
| GREEN: per-TFM LangVersion (or uniform 15), union inside `#if NET11_0_OR_GREATER ... #else <fallback> #endif` | clean | clean | clean |
| GREEN (folder fence): `<Compile Include="Net11/**/*.cs" Condition="'$(TargetFramework)' == 'net11.0'" />` | clean | clean | clean |
| RED (folder, `-p:Unfenced=true`) | `CS0106` | `CS0106` | clean |

Choice between "`#if` vs per-TFM LangVersion": they fence different things. `#if` fences code; per-TFM LangVersion fences syntax. Use per-TFM LangVersion so syntax-only C# 15 features (`with(...)`, extension indexers, labeled `continue`, which build on net8.0 at LV15) cannot leak into the net8.0/net10.0 legs, and use `#if NET11_0_OR_GREATER` or a conditioned folder for the code itself. Uniform `LangVersion 15` also builds the fenced variant, but then only the runtime-dependent two (`union`, `closed`) are caught by the compiler and the rest compile into net8.0 code unnoticed. Whichever is chosen, the build matrix is the check: an unfenced use is red on the net8.0/net10.0 leg.

Fact 4 (the dead-code check): an `#if NET11_0_OR_GREATER` region is only legitimate if a leg compiles it. `$FX/net11gate.sh` fails when sources contain the symbol and `TargetFrameworks` has no `net11.0`:

```bash
tfms=$(dotnet msbuild "$proj" -getProperty:TargetFrameworks | tr -d '\n ')
hits=$(grep -rl --include='*.cs' -e 'NET11_0_OR_GREATER' "$src" | wc -l)
[ "$hits" -gt 0 ] && ! printf '%s' "$tfms" | grep -q 'net11\.0' && { echo "FAIL ..."; exit 1; }
```

Red on `gate-red` (`FAIL: 1 file(s) use NET11_0_OR_GREATER but TargetFrameworks has no net11.0: net8.0;net10.0`), green on `gate-green` (`OK: 1 file(s) ...; TargetFrameworks=net8.0;net10.0;net11.0`).

Contradiction to resolve with the process artifact: CS-PROC says ".NET 11 APIs only behind #if". Under the pinned SDK that guard is dead code. The two are consistent only if the code ships with a CI leg on SDK 11; otherwise do not write those branches. The net11.0 TFM itself waits for the SDK pin to move; .NET 11 GA is announced for .NET Conf 2026-11-10..13 ([csharp-build-tfm-reach.md §7](../csharp-build/csharp-build-tfm-reach.md)).

### 11. LangVersion=preview, EnablePreviewFeatures and Features leaking into a release

Four separate switches, with different blast radii:

| Switch | What it does (measured) | Visible to |
|---|---|---|
| `<LangVersion>preview</LangVersion>` | On SDK 10.0.401, net10.0, accepts C# 15 syntax with no warning: `with(...)`, extension indexers, labeled `continue`, `int* p = &n;` all compiled (`$FX/sdk10-probe`, U3-U6); `union`/`closed` still fail with `CS0518`/`CS0656`. `#error version` prints `Language version: preview`. `dotnet msbuild -getProperty:LangVersion` prints `Preview`. Stamps nothing in the assembly (consumer built clean, `$FX/previewleak`, `-p:LibLV=preview`). | the repo only |
| `<EnablePreviewFeatures>true</EnablePreviewFeatures>` | Writes `[assembly: System.Runtime.Versioning.RequiresPreviewFeaturesAttribute()]` (found at line 20 of the lib's `obj/**/*.AssemblyInfo.cs`; `strings lib.dll \| grep -c RequiresPreviewFeaturesAttribute` = 1, vs 0 for a default build). A consumer that did not opt in fails: `error CA2252: Using 'Hello' requires opting into preview features.` | every consumer |
| `<Features>$(Features);updated-memory-safety-rules</Features>` | Compiler embeds `MemorySafetyRulesAttribute` (1 vs 0 in the dll, also on a net10.0 target under RC1); callers may be forced into `unsafe` blocks ([compiler-options/language](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-options/language)). | consumers who opt into updated rules |
| `<AnalysisLevel>preview</AnalysisLevel>` or `latest` | already forbidden by CS-BUILD (adds rules that become errors under TWAE). | the repo |

CA2252 ([CA2252](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2252), updated 2026-04-02): "Enabled by default in .NET 10: As error"; the assembly-level opt-in is "the preferred way to consume preview dependencies". For a published library the corollary is the red above.

Preview-feature diagnostics when the language version is too low (SDK 10.0.401, LangVersion 14): `error CS8652: The feature 'collection expression arguments' is currently in Preview and *unsupported*. To use Preview features, use the 'preview' language version.` (same for `extension indexers`, `labeled break and continue`, `closed classes`). On SDK 11 RC1 the same features at LangVersion 14 say `CS9327 Feature '...' is not available in C# 14.0. Please use language version 15.0 or greater.` The right response to either is to remove the syntax, never to raise LangVersion to `preview`.

Detection (both verified on `$FX/previewcheck/{red,green}`):

```bash
# 1. text: any floating or preview language level, preview opt-ins, in project files and response files
grep -rEin --include='Directory.Build.props' --include='Directory.Build.targets' --include='*.csproj' --include='*.props' --include='*.targets' --include='*.rsp' \
  -e '<LangVersion>[[:space:]]*(preview|latest|latestMajor|default)' -e '<EnablePreviewFeatures>[[:space:]]*true' \
  -e 'updated-memory-safety-rules' -e '<AnalysisLevel>[^<]*(preview|latest)' .
# red tree: 2 files, exit 0 (matches). green tree: no output, exit 1.
# 2. resolved value per TFM leg (catches a value injected from the command line or an imported file)
dotnet msbuild src/a.csproj -getProperty:LangVersion -p:TargetFramework=net8.0     # green: 14   red: latest / Preview
```

### 12. Exemplar practice

Corpus: 35 clones under `/home/mherwig/.cache/research-lang/exemplars/csharp`. Counts below are from `grep -rE --include=*.cs` with StyleCopAnalyzers fixtures excluded.

- `field`-backed properties in 8 repos (production sources in testfx, Polly, npgsql, GitVersion, vs-threading `JoinableTask.cs:381`, BenchmarkDotNet `ParameterInstances.cs:35`, Azure.Core `DefaultAzureCredentialOptions.cs:245`; MessagePack only in a test; Meziantou.Analyzer matches only an analyzer-test string), for example [microsoft__testfx@7226b0c74729:src/Adapter/MSTestAdapter.PlatformServices/MSTestSettings.cs:67](https://github.com/microsoft/testfx) (`get => field ??= new MSTestSettings();`, 24 sites in testfx), [npgsql__npgsql@9c47244547c2:src/Npgsql/PostgresTypes/PostgresType.cs:70](https://github.com/npgsql/npgsql) (`FullName => field ??= Namespace + "." + Name;`), [App-vNext__Polly@e4476096da5b:src/Polly/Context.Dictionary.cs:18](https://github.com/App-vNext/Polly) (`get => field ??= [];`), [GitTools__GitVersion@5057cdbcc177:src/GitVersion.Output/Serializer/VersionVariablesJsonContext.cs:13](https://github.com/GitTools/GitVersion) (`Custom => field ??= new ...`). Almost all uses are the lazy-cache form.
- Extension blocks match in 15 repos (strict regex; Meziantou.Analyzer's hits are in analyzer-test strings), e.g. [dotnet__command-line-api@ba7fb9bd4443:src/System.CommandLine.StaticCompletions/DynamicSymbolExtensions.cs:19](https://github.com/dotnet/command-line-api) (`extension(Option option)` with a property), [npgsql__npgsql@9c47244547c2:src/Npgsql/Util/TypeExtensions.cs:7](https://github.com/npgsql/npgsql), and the polyfill form cited in section 3. GitVersion has 51 hits, xunit 8, CliWrap 7.
- Null-conditional assignment in 3 repos (testfx 4 sites, Redis 1, aspire 1).
- `LangVersion` values in project files (`Directory.Build.props`, `*.csproj`, `*.targets`): `latest` 87, `Latest` 4, `preview` 7 (aspire, testfx, Humanizer, Meziantou.Analyzer, nuke, a roslynator test library), numeric `14` 3, `14.0` in xunit. Examples: [dotnet__aspire@af646baee1e8:Directory.Build.props:6](https://github.com/dotnet/aspire) `preview`; [microsoft__testfx@7226b0c74729:Directory.Build.props:17](https://github.com/microsoft/testfx) `preview` ("default to allowing all language features"); [Humanizr__Humanizer@4574b93883bf:Directory.Build.props:4](https://github.com/Humanizr/Humanizer) `preview`; [dotnet__command-line-api@ba7fb9bd4443:Directory.Build.props:8](https://github.com/dotnet/command-line-api) `latest`; [npgsql__npgsql@9c47244547c2:Directory.Build.props:4](https://github.com/npgsql/npgsql) `latest`; [xunit__xunit@0c7aa4991fa3:src/Directory.Build.props:24](https://github.com/xunit/xunit) `14.0`. None of the repos that use `preview` is a pinned-SDK-plus-net8-floor library with consumers on LangVersion 12; most are SDKs/tools whose consumers do not compile their source. Adopting the `preview` posture is therefore not transferable.
- net11 multi-targeting: [dotnet__aspire@af646baee1e8:eng/Versions.props:11-12](https://github.com/dotnet/aspire) (`AllTargetFrameworks` = `net10.0;net11.0`); cake guards with `NET11_0_OR_GREATER` (section 10).
- Nobody in the corpus bans `MemoryExtensions.Reverse`: `grep -rn MemoryExtensions --include=BannedSymbols.txt .` returned nothing. The ban in this artifact is new, not borrowed.

### 13. Verified on the toolchain

All paths under `$FX`. Observed output quoted; commands run via `/home/mherwig/.cache/research-lang/dotnet-tools/run.sh`.

| # | Claim | Fixture and command | Red (observed) | Green (observed) |
|---|---|---|---|---|
| 1 | Pure-syntax features equal on both TFMs | `matrix/`: `dotnet build -nologo -v q -f <tfm> -p:Feature=F0N_x -o out/F0N_x/<tfm>` then `dotnet out/.../matrix.dll` | n/a | F01 `8.0.31 x\|lazy`, `10.0.12 x\|lazy`; F02 `abab True 0`; F03 `7 calls=1 2`; F05 `List,Dictionary`; F06 `42`; F07 `5`; F08 `103` (identical per TFM) |
| 2 | `a.StartsWith(1)` is BCL-dependent | `spanbreak/`: `./run.sh B7_startswith 14` | net8.0 `CS1503 Argument 2: cannot convert from 'int' to 'System.ReadOnlySpan<int>'` | net10.0 `True` |
| 3 | `x.Reverse();` statement silently changes | `spanbreak/`: `./run.sh B1_reverse_stmt 13` and `14` | LV13 `1,2,3` both; LV14 net8.0 `3,2,1` (no diagnostic), net10.0 `1,2,3` | `./run.sh B1g_reverse_explicit 14`: `3,2,1 1,2,3` on both |
| 4 | `var y = x.Reverse()` | `./run.sh B2_reverse_value 14` | net8.0 `error CS0815: Cannot assign void to an implicitly-typed variable` | net10.0 `321`; LV13 `321` |
| 5 | Covariant array picks `Span<T>` overload | `./run.sh B3_covariant 14` | `ArrayTypeMismatchException` (both TFMs); LV13 prints `1` | `./run.sh B3g_covariant_explicit 14`: `1` |
| 6 | `MemoryMarshal.Cast` on array | `./run.sh B4_marshalcast 14` | `error CS0029: Cannot implicitly convert type 'System.ReadOnlySpan<ulong>' to 'System.Span<ulong>'` | `./run.sh B4g_marshalcast_explicit 14`: `1` |
| 7 | Expression tree sees span conversion | `./run.sh B5_exprtree 14` | `op_Implicit(a).Contains(n)` then `ArgumentException: GenericArguments[1], 'System.ReadOnlySpan`1[System.Int32]' ... violates the constraint of type 'TRet'` | `./run.sh B5g_exprtree_explicit 14`: `a.Contains(n)` / `True` |
| 8 | Extension lookup flips | `./run.sh B6_extlookup 13` / `14` | LV13 `N2`; LV14 `N1` (both TFMs; no explicit twin run) | n/a |
| 9 | `allows ref struct` is runtime-guarded | `matrix/ -p:Feature=F09_allowsref` | net8.0 `error CS9240: Target runtime doesn't support by-ref-like generics.` | net10.0 `ok` |
| 10 | Covariant span needs `CastUp` | `-p:Feature=F10_covariant_span` | net8.0 `error CS0656: Missing compiler required member 'ReadOnlySpan<T>.CastUp'` | net10.0 `2,2` |
| 11 | Member named `field` rebinds | `fieldvs/`: `dotnet build -nologo -v q --no-incremental -f net10.0 -p:Case=D1_member_named_field -p:LV=14 -o out/d1-twae` | `error CS9258 ...`, `CS9264`, `CS0414`; with `-p:TWAE=false` they are warnings and the program prints an empty line (LV13 prints `41`) | `D1g_this_field` (rename) and `D1h_at_field` (`this.field`): clean, `41` |
| 12 | Local named `field` | `-p:Case=D2_local_named_field -p:LV=14` | `error CS9273: In language version 14.0, 'field' is a keyword within a property accessor.` | `D2g_at_field_local`, `D2h_renamed_local`: clean, `3` |
| 13 | Inherited `field` member | `-p:Case=D5_inherited_field -p:LV=14` | `error CS9258` on both TFMs (LV13 prints `1`) | not run (rename is the fix) |
| 14 | Non-nullable `field` property | `-p:Case=D6_nullable_field -p:LV=14` | `error CS9264: Non-nullable property 'Name' must contain a non-null value` | `D3_semantics` (initializer `= ""`): `[Ada] [computed] [5]` |
| 15 | Compound assignment aliases | `matrix/ -p:Feature=F16_compound_alias` | `a=11 alias=11` (both TFMs) | `F16g_compound_binary_only`: `a=11 alias=1` |
| 16 | SDK 10 cannot build net11 / C# 15 | `sdk10-probe/`: `dotnet build -p:Case=U5_label -p:LV=14 -p:TFM=net11.0`; `-p:LV=15 -p:TFM=net10.0` | `NETSDK1045 ... does not support targeting .NET 11.0`; `CS1617: Invalid option '15' for /langversion` | `rc1/` (global.json 11.0.100-rc.1.26425.128): builds |
| 17 | Unfenced union, uniform 15 | `fence/`: `dotnet build -f <tfm> -p:Variant=uniform15 -p:Src=Unguarded` | net8.0, net10.0: `CS0518 ... 'IUnion' is not defined`, `CS0656 ... 'UnionAttribute..ctor'` | `-p:Src=Guarded`: clean x3 |
| 18 | Unfenced union, per-TFM LangVersion | `-p:Variant=pertfm -p:Src=Unguarded` | net8.0, net10.0: `CS0106`, `CS8803` | `-p:Src=Guarded`: clean x3 |
| 19 | Folder fence | `fence-folder/`: `dotnet build -f <tfm> [-p:Unfenced=true]` | `-p:Unfenced=true` net8.0, net10.0: `CS0106` | default: clean x3 |
| 20 | `#if NET11_0_OR_GREATER` rots under SDK 10 | `deadcode/`: `dotnet build --no-incremental` | guard changed to `NET10_0_OR_GREATER`: `error CS0246 'NoSuchType'` | as committed: `0 Error(s)` despite broken body |
| 21 | Gate script | `gate-red/`, `gate-green/`: `run.sh ../net11gate.sh . <csproj>` | `FAIL: 1 file(s) use NET11_0_OR_GREATER but TargetFrameworks has no net11.0: net8.0;net10.0`, exit 1 | `OK: 1 file(s) ...; TargetFrameworks=net8.0;net10.0;net11.0`, exit 0 |
| 22 | `RS0030` ban of `MemoryExtensions.Reverse(Span<T>)` | `banreverse/` (BannedApiAnalyzers 5.6.0, TWAE): `dotnet build --no-incremental -f <tfm> -p:Case=R1_red` | net8.0 `error RS0030: The symbol 'MemoryExtensions.Reverse<T>(Span<T>)' is banned in this project: In-place and returns void; ...` (net10.0 clean: binds LINQ) | `R1_green`: clean x2 |
| 23 | `RS0030` ban of `MemoryExtensions.Contains(ROS<T>, T)` in trees | `-p:Case=R2_red` | both TFMs `error RS0030: The symbol 'MemoryExtensions.Contains<T>(ReadOnlySpan<T>, T)' is banned ...` | `R2_green` (`Enumerable.Contains(a, n)`): clean x2 |
| 24 | `EnablePreviewFeatures` leaks to consumers | `previewleak/`: `dotnet build app/app.csproj -p:Preview=true` | `error CA2252: Using 'Hello' requires opting into preview features.` ; `strings lib.dll \| grep -c RequiresPreviewFeaturesAttribute` = 1 | default: `hi`; `-p:LibLV=preview` alone: `hi` (no leak); strings count 0 |
| 25 | Preview grep and resolved-value gates | `previewcheck/{red,green}` | grep hits 2 files (exit 0); `-getProperty:LangVersion` = `latest` (net8.0) / `Preview` (net10.0) | grep exit 1, no output; `14` on both TFMs |
| 26 | `LangVersion=preview` on SDK 10.0.401 accepts C# 15 syntax | `sdk10-probe/`: `-p:Case=U3_with -p:LV=preview -p:TFM=net10.0` (also U4, U5, U6) | LV14: `CS8652 ... currently in Preview and *unsupported*` (U3, U4, U5), `CS0214` (U6) | LV preview: clean (U3-U6); U1/U2 still `CS0518/CS0656` |
| 27 | RC1: union/closed need runtime types, others do not | `rc1/`: `-p:LV=15 -p:TFM=<tfm>` | net10.0, net8.0: U1 `CS0518`/`CS0656`, U2 `CS0656 IsClosedTypeAttribute..ctor` | net11.0: all ran; U3, U4, U5 ran on net10.0 and net8.0 |
| 28 | `Features=updated-memory-safety-rules` stamps the assembly | `rc1/rc1s.csproj` (removed after run; Library, `-p:Safety=true\|false`) | n/a | `strings out/s-true/rc1s.dll \| grep -c MemorySafetyRulesAttribute` = 1; `false` = 0 |
| 29 | Extension blocks and LangVersion 13 consumers | `extcompat/`: `dotnet build app13b/app13b.csproj` | `error CS9260: Feature 'extensions' is not available in C# 13.0.` (property) | `app13` (method): `ababab!`; `app14`: `ababFalsehello` |
| 30 | Static extension block as polyfill | `matrix/ -p:Feature=F15_static_polyfill` | n/a | net8.0 `polyfill-used`, net10.0 `BCL-used` |
| 31 | PublicApiAnalyzers sees extension-block members | `publicapi/` (PublicApiAnalyzers 5.6.0, TWAE, empty `PublicAPI.*.txt`): `dotnet build --no-incremental -p:Case=P_red` | `public static class StringExt { extension(string s) { public bool IsBlank => ...; } }` gives `error RS0016: Symbol 'Lib.StringExt.extension(string).IsBlank.get -> bool' is not part of the declared public API` (and `Lib.StringExt.extension(string)`, `static Lib.StringExt.get_IsBlank(string s) -> bool`) | `P_green` (`internal static class`): `0 Error(s)` |

Pairs watched red then green: 26 (rows 2-7, 9-12, 14-15, 16-27, 29, 31; row 8 and 13 are red-only; rows 1, 28 (partly), 30 are positive observations).

## Normative guidance candidates

1. **Pin `LangVersion` to the numeric value `14`; never `latest`, `preview`, `default` or `latestMajor`.** Rationale: `latest` is 14.0 on SDK 10 and 15.0 on SDK 11 RC1, and `preview` silently accepts C# 15 syntax on SDK 10. Verify: `grep -rEin --include='Directory.Build.props' --include='*.csproj' --include='*.props' --include='*.targets' --include='*.rsp' -e '<LangVersion>[[:space:]]*(preview|latest|latestMajor|default)' .` prints nothing, and `[ "$(dotnet msbuild src/Ocx/Ocx.csproj -getProperty:LangVersion -p:TargetFramework=net8.0)" = 14 ]`.
2. **Do not set `EnablePreviewFeatures`, `Features` with `updated-memory-safety-rules`, `AnalysisLevel preview|latest` in any shipped project, and never pass `-p:LangVersion=` or `-p:EnablePreviewFeatures=` in a workflow.** Rationale: `EnablePreviewFeatures=true` stamps `RequiresPreviewFeatures` and makes `CA2252` an error in every consumer. Verify: `grep -rEin --include='*.csproj' --include='*.props' --include='*.targets' --include='*.rsp' -e '<EnablePreviewFeatures>[[:space:]]*true' -e 'updated-memory-safety-rules' -e '<AnalysisLevel>[^<]*(preview|latest)' .` prints nothing; `grep -rEn -e 'LangVersion=|EnablePreviewFeatures=' .github/workflows` prints nothing; after `dotnet build -c Release`, `grep -rln RequiresPreviewFeatures --include='*.AssemblyInfo.cs' src` prints nothing.
3. **Do not add a `net11.0` TargetFramework or `LangVersion 15` before the SDK pin in `global.json` is an 11.0.1xx GA, and never write `union`, `closed`, `with(...)` collection arguments, extension indexers, labeled `break`/`continue` or pointer-outside-`unsafe` code on the net8.0/net10.0 legs.** Rationale: SDK 10.0.401 rejects both (`NETSDK1045`, `CS1617`) and the C# 15 syntax is `CS8652` at LangVersion 14; the pin is the fence. Verify: `dotnet build` is the gate (the compiler errors above are the red); `dotnet msbuild src/Ocx/Ocx.csproj -getProperty:TargetFrameworks` contains no `net11.0`.
4. **`#if NET11_0_OR_GREATER` is allowed only while some leg builds `net11.0` on an SDK 11.** Rationale: otherwise the region is never compiled and rots (measured). Verify: run `net11gate.sh` (section 10); fails when `grep -rl --include='*.cs' -e 'NET11_0_OR_GREATER' src` hits and `dotnet msbuild <proj> -getProperty:TargetFrameworks` lacks `net11.0`.
5. **When a net11.0 leg exists: `LangVersion` is conditioned per TFM (15 on `net11.0` only, 14 otherwise), and every C# 15 construct sits in a `#if NET11_0_OR_GREATER` region or a `Net11/` folder compiled only for `net11.0`.** Rationale: both fences measured red unguarded, green fenced; per-TFM LangVersion keeps syntax-only C# 15 out of the floor legs. Verify: the multi-TFM `dotnet build` (an unfenced use is red on the net8.0/net10.0 leg); `grep -rEn --include='*.cs' -e '^[[:space:]]*(public|internal)?[[:space:]]*(closed|union)[[:space:]]' -e '\[with\(' src` outside a `Net11/` path or an `#if NET11_0_OR_GREATER` region is a finding.
6. **Never declare `System.Runtime.CompilerServices.UnionAttribute`, `IUnion` or `IsClosedTypeAttribute` in the repo.** Rationale: the compiler accepts a local copy (measured on net8.0/net10.0), which collides with the runtime's type from .NET 11 on and puts a fake type into public API. Verify: `grep -rEn --include='*.cs' -e 'class[[:space:]]+UnionAttribute' -e 'interface[[:space:]]+IUnion' -e 'IsClosedTypeAttribute' src` prints nothing.
7. **Never call `.Reverse()` on an array; call `Array.Reverse(arr)` for in place or `Enumerable.Reverse(arr)` for a lazy copy.** Rationale: the same statement is a no-op on net10.0 and an in-place reversal on net8.0 at LangVersion 14, with no diagnostic. Verify: `BannedSymbols.txt` contains `M:System.MemoryExtensions.Reverse``1(System.Span{``0});<reason>`, `.globalconfig` has `dotnet_diagnostic.RS0030.severity = error`; `grep -n -e 'MemoryExtensions.Reverse' BannedSymbols.txt` is non-empty; build red on net8.0 for `R1_red.cs`.
8. **No `Span<T>` or `ReadOnlySpan<T>` in public signatures of the SDK, and no overload set that mixes `IEnumerable<T>`, `T[]` and span parameters.** Rationale: C# 14 prefers span overloads (ambiguity, `ArrayTypeMismatchException` on covariant arrays); the SDK has no hot path that needs them. Verify: `grep -En -e 'Span<' src/Ocx/PublicAPI.Shipped.txt src/Ocx/PublicAPI.Unshipped.txt` prints nothing (PublicApiAnalyzers files, CS-API); reading heuristic for any new public overload group: "could one call site bind two overloads after a C# 14 span conversion?"
9. **Inside `Expression<...>` and in code under test that is inspected as an expression tree, never use array/`List` `.Contains` with an implicit span conversion; call `Enumerable.Contains(a, n)`.** Rationale: the tree contains `op_Implicit(a).Contains(n)` and the interpreter rejects the ref struct (measured both TFMs). Verify: only needed in a test project that uses expression trees (mocking `Setup(x => ...)`); add `M:System.MemoryExtensions.Contains``1(System.ReadOnlySpan{``0},``0)` to that project's `BannedSymbols.txt` (RS0030 red/green measured); otherwise not applicable to `src`.
10. **Run every behavioural test on both `net8.0` and `net10.0`.** Rationale: binding-dependent span changes appear only as a per-TFM behaviour difference. Verify: `dotnet msbuild tests/Ocx.Tests/Ocx.Tests.csproj -getProperty:TargetFrameworks` equals `net8.0;net10.0` (CS-TEST/CS-CI).
11. **No identifier named `field` in a type that has a property accessor; no local, parameter, member or inherited member called `field`.** Rename; do not `@field` or `this.field` unless a public contract forces the name. Rationale: silent rebind to the synthesized backing field (empty output measured). Verify: `CS9258` and `CS9273` build red (TWAE unconditional; keep `CS9258` out of `NoWarn`); `grep -rEn --include='*.cs' -e '(private|protected|internal|public)[^;=(]*[[:space:]]field[[:space:]]*[;=]' -e '\b(int|string|var|object|bool|long)[[:space:]]+@?field\b' src` prints nothing; `grep -rEn -e 'CS9258|CS9264|CS9273' --include='*.props' --include='*.csproj' --include='.globalconfig' --include='.editorconfig' .` prints nothing.
12. **`field` properties of non-nullable reference type must have an initializer or `required`.** Rationale: otherwise `CS9264`. Verify: build (TWAE); reading heuristic: `{ get; set => field = ...; }` is followed by `= <value>;`.
13. **No `field ??=` (or any check-then-set on `field`) in state reachable from more than one thread; use `Lazy<T>` or `LazyInitializer`.** Rationale: unsynchronised lazy init; `OcxClient` is shared. Verify: `grep -rn --include='*.cs' -e 'field ??=' -e 'field is null' src` lists every site for review; each hit must be in a type documented as not thread-safe or a `private` single-thread helper.
14. **Extension blocks: methods may be public; properties, static members and operators in blocks must be `internal` (or in an `internal static class`).** Rationale: they force every consumer to LangVersion 14 (`CS9260` at 13), and net8.0 consumers default to 12. Verify: `grep -En 'extension\(.*\)\.[A-Za-z_]+\.(get|set)|static [A-Za-z_.]+\.get_' src/Ocx/PublicAPI.Shipped.txt src/Ocx/PublicAPI.Unshipped.txt` prints nothing (PublicApiAnalyzers writes block members as `Lib.StringExt.extension(string).IsBlank.get -> bool`; an unrecorded public block member is `RS0016` red, row 31); then read any `extension(` entry that remains for properties or statics.
15. **Extension-block polyfills for BCL statics missing on net8.0 are allowed only in an `internal static class`, with a comment naming the TFM that has the real member, and with semantics identical to the BCL.** Rationale: the real member wins on newer TFMs (measured), so any semantic difference is a per-TFM behaviour change. Verify: PublicApiAnalyzers (`RS0016`, row 31) catches accidental `public`; reading heuristic: each `extension(BclType)` block sits next to the comment `// BCL since net<N>`.
16. **Do not declare user-defined compound assignment operators or instance increment operators.** Rationale: aliasing: `var alias = a; a += 10;` mutates `alias` (11/11 vs 11/1), and adding the operator later changes recompiled callers silently. Verify: `grep -rEn --include='*.cs' 'void[[:space:]]+operator' src` prints nothing.
17. **Use `a?.B = c` only where a null receiver is a legitimate state, never to silence a nullable warning or an invariant.** Rationale: the assignment (and the right-hand side) is skipped without a trace. Verify: `grep -rEn --include='*.cs' '\?\.[A-Za-z_.]+[[:space:]]*(\+|-)?=[^=>]' src` enumerates sites; each needs a nullable (`T?`) receiver by declaration.
18. **Do not name a type, member, alias or type parameter `extension`, `union`, `closed`, `field`, `safe` or `partial`.** Rationale: contextual keywords in C# 14/15 (`CS9370`, `CS9380`, escaped only by `@`). Verify: `grep -rEn --include='*.cs' '\b(class|struct|record|enum|interface)[[:space:]]+(extension|union|closed|safe|partial|field)\b' src` prints nothing.
19. **A diagnostic `CS8652` or `CS9327` ("preview"/"not available in C# 14.0") is fixed by deleting the syntax, never by changing `LangVersion`.** Rationale: raising it admits unsupported features into net8.0 code. Verify: reading heuristic on the diff: a commit that edits a `<LangVersion>` line is rejected unless it is the planned SDK-pin PR (rule 1 grep).

## AI-agent angle

| What an LLM characteristically gets wrong | Smallest mechanical check |
|---|---|
| Sets `<LangVersion>latest</LangVersion>` or `preview` "to get the newest features" (87 and 7 corpus hits; Microsoft says do not) | rule 1 grep + `-getProperty:LangVersion` |
| Adds `<EnablePreviewFeatures>true</EnablePreviewFeatures>` to fix a build error mentioning "preview" | rule 2 grep; `CA2252` in a consumer |
| Writes a `private int field;` or `var field = ...;` (very common name, pre-C# 14 habit) in a class that also has a property with a body | `CS9258`/`CS9273` under TWAE; rule 11 grep |
| Keeps writing `private string? _x; public string X => _x ??= ...` (pre-14 idiom), or the reverse: converts every backing field to `field` including ones read by other members (cannot) or shared across threads | rule 13 grep for `field ??=`; compile error `CS0103` for a cross-member read |
| `arr.Reverse()` expecting LINQ, or `arr.Reverse();` as in-place; both compile on net8.0 at LangVersion 14 | rule 7 `RS0030` |
| Adds `Span<T>` and `IEnumerable<T>` overloads side by side "for performance" in a public API | rule 8 grep on `PublicAPI.*.txt` |
| Calls `arr.StartsWith(x)` / `arr.Contains(x)` and assumes the same overload on both TFMs | multi-TFM build and test (rule 10); `CS1503` on net8.0 |
| Uses `.NET Framework`-era or net6-era extension syntax only, or asserts "extension properties are not possible"; or the opposite: uses `extension` blocks in a netstandard2.0 doc claiming a polyfill is required (it is not) | the fixtures in section 3 (compile and run) |
| Puts extension *properties* in the public API of a net8.0-targeting library, then consumers on the default LangVersion 12 get `CS9260` | rule 14; `RS0016` |
| Suggests `#if NET11_0_OR_GREATER` branches "for future-proofing" and hallucinates `Process.RunAsync` shapes from RC1 as stable | rule 4 `net11gate.sh`; rule 3 |
| Writes `public union Foo(A, B);` or `closed` on a TFM below net11.0, or polyfills `UnionAttribute` when the compiler complains | `CS0518`/`CS0656`; rule 6 grep |
| Adds `void operator +=` "for allocation-free accumulation" | rule 16 grep |
| "Fixes" `CS9258` with `@field`, silencing the warning rather than renaming | rule 11 (grep for `@?field` locals) |
| Uses `a?.B = c` to swallow a null that should throw | rule 17 enumeration |
| Applies `OverloadResolutionPriorityAttribute` (C# 13) to dodge span ambiguities in public API without a twin `ReadOnlySpan` overload; attribute is ignored at older LangVersions (spec "Open questions") | rule 8 |

## Contested / evolving

- **LangVersion 14 on net8.0.** Microsoft: "isn't supported" and "Don't set the `LangVersion` element to `latest`"; the Roslyn page calls net8.0 plus C# 14 "an unsupported configuration" for the `Enumerable.Reverse` case. Practice in the corpus: xunit pins `14.0`, most others float to `latest` or `preview`. This repo's owner decision (CS-BUILD) is to pin 14 anyway; this artifact makes the cost explicit: the compiler guards runtime-dependent features, but binding-dependent ones need bans and per-TFM tests. Trend: net8.0 and net9.0 reach end of support on 2026-11-10 ([csharp-build-tfm-reach.md §7](../csharp-build/csharp-build-tfm-reach.md)), after which the floor can become net10.0 and the whole question disappears. As of 2026-10-11.
- **Expression-tree break (`op_Implicit`).** The spec text (2025-08-06) describes it as present; LDM 2025-01-06 "ignoring ref structs in expressions" suggests a fix. Measured on 10.0.12 it is still present. A later servicing release may change it; re-run `B5_exprtree` after each SDK bump.
- **CA1034 on extension blocks.** Fires on SDK 10.0.401 under `10.0-all`, silent on 11 RC1 (CS-BUILD). One web search returned an unrelated `CA2208` issue for extension receivers ([dotnet/sdk#51887](https://github.com/dotnet/sdk/issues/51887), search summary only, not fetched); no CA1034 issue was located. Expect analyzers to keep lagging the syntax.
- **C# 15 versus C# 16 labelling.** The RC1 documentation attributes pointer relaxations and `safe` to "C# 16" in the breaking-changes page and to C# 15 preview in the "What's new" page; the Roslyn status page has no C# 16 section. Treat all memory-safety items as preview and re-read at SDK 11 GA (2026-11).
- **Unions without synthesized types.** The spec resolution is "do not synthesize"; the runtime types arrive with .NET 11. Library authors targeting older TFMs have no supported way to expose a union. Direction: wait for net11.0-only or a netstandard polyfill package from the BCL team, if one appears; as of RC1 none was seen.
- **`LangVersion=preview` as house style.** Six of 35 repos use it, all with their own compiler and consumer story (testfx: "default to allowing all language features"). It is trending up among Microsoft-owned repos on .NET 11 previews and is wrong for a library published to consumers on older runtimes.
- **`field` in public libraries.** 8 of 35 repos use it, almost all as a lazy cache; no repo in the sample uses the validating-setter form on public API yet. Both Polly and Npgsql use it only for derived/lazy values.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-14 | Official feature list for C# 14, with `field`, extension, null-conditional assignment, span, lambda, partial, compound assignment | updated 2026-09-03 (C# 14, .NET 10) | the canonical feature set and the `@field`/`this.field` guidance |
| https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/breaking-changes/compiler%20breaking%20changes%20-%20dotnet%2010 | Roslyn breaking changes C# 13 to 14 | updated 2025-10-10 | span ambiguity examples, `Enumerable.Reverse` note, `CS9258`, contextual keywords |
| https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/proposals/csharp-14.0/first-class-span-types | Feature spec: first-class span types, conversion list, betterness rules, breaking-change section | spec dated 2025-08-06 | exact conversion rules, helpers (`CastUp`, `AsSpan`), expression-tree and covariance breaks |
| https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/proposals/csharp-14.0/field-keyword | Feature spec for `field` | updated 2025-09-23 | scope rules, nullability analysis, initializer and constructor semantics |
| https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/proposals/csharp-14.0/extensions | Feature spec for extension members, metadata encoding | updated 2025-11-07 | grouping/marker types, `[Extension]` compat emission, lookup rules |
| https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/extension | Language reference for the `extension` block | updated 2026-08-13 | syntax, generic blocks, source/binary compatibility with `this` methods, indexers (C# 15) |
| https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/proposals/csharp-14.0/user-defined-compound-assignment | Feature spec for instance `+=` and `++` | spec dated 2025-08-06 | semantics: priority over binary operators, mutation in place, aliasing |
| https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-15 | What's new in C# 15 (unions, closed, collection expression arguments, extension indexers, labeled jumps, memory safety) | updated 2026-09-14 (preview, .NET 11) | the RC1-era feature list and the `UnionAttribute`/`IUnion` runtime note |
| https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/proposals/csharp-15.0/unions | Feature spec for unions | updated 2026-08-19 | union shape, `IUnion`, resolution "the compiler should not synthesize these types" |
| https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/breaking-changes/compiler%20breaking%20changes%20-%20dotnet%2011 | Roslyn breaking changes C# 14 to 15 | updated 2026-08-13 | RC1-relevant breaks (`InAttribute`, `with()`, `union`/`closed` keywords) and the inconsistent "C# 16" labels |
| https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/configure-language-version | Configure language version; the unsupported-newer-than-TFM statement | updated 2026-01-20 | official position on `latest`, `preview`, newer-than-TFM |
| https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-options/language | `LangVersion`, `Features`, updated memory safety rules | updated 2026-09-10 | `updated-memory-safety-rules` plus `LangVersion preview` switches and the future `MemorySafetyRules` property |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2252 | CA2252 opt in to preview features | updated 2026-04-02 | default severity "error" in .NET 10 and the assembly-level opt-in |
| https://github.com/dotnet/roslyn/blob/main/docs/Language%20Feature%20Status.md | Roslyn language feature status (raw copy read 2026-10-11) | live document | which features are C# 15, working set, preview-only |
| https://github.com/dotnet/runtime/issues/107723 | API proposal `Enumerable.Reverse(this T[])` | approved 2024-09-17, .NET 10 | the BCL mitigation that exists only on net10.0 |
| Exemplars (cited inline as owner__repo@sha12:path:line): microsoft__testfx@7226b0c74729, dotnet__aspire@af646baee1e8, dotnet__command-line-api@ba7fb9bd4443, npgsql__npgsql@9c47244547c2, xunit__xunit@0c7aa4991fa3, Humanizr__Humanizer@4574b93883bf, cake-build__cake@08885933e936, App-vNext__Polly@e4476096da5b, GitTools__GitVersion@5057cdbcc177 | real C# 14 `field`, extension, `?.=`, LangVersion, `NET11_0_OR_GREATER` usage | HEAD at corpus clone, 2026-10 | what practitioners actually do; counts in section 12 |
| Sibling artifacts: `../csharp-build/csharp-build-tfm-reach.md` §4, §7; `../csharp-build/csharp-build-analyzer-gate.md` §9, §13; `../csharp-topic-map.md` LG-02, LG-03 | prior-wave measurements of LangVersion 14 on net8.0, CA1034, `latest` drift | 2026-10-10 | decisions not re-made here |
