---
title: C# 15, Roslyn and System.Text.Json at .NET 11 GA - delta against the 2026-10-11 RC1 baseline
pair: csharp-quality
date_researched: 2026-11-27
window_start: 2026-10-11
model: sonnet
sources_fetched: 14
---

# C# 15, Roslyn and System.Text.Json at .NET 11 GA (delta)

## Contents

1. Summary
2. Findings, claim by claim
3. Normative guidance candidates
4. AI-agent angle
5. Contested / evolving
6. Sources

Scope: only the claims named in the commission. Anything not listed is out of scope, and the .NET 11 process API detail is another brief. Method: the dotnet/core release notes, the Microsoft Learn pages and the Roslyn feature-status file were fetched and read. In addition, SDK 11.0.100 GA was installed into a scratch directory (`dotnet-install.sh --version 11.0.100`, `dotnet --version` printed `11.0.100`, runtime Microsoft.NETCore.App 11.0.0) and every diagnostic below was measured with `dotnet build` on 2026-11-27. Measured items are marked "measured".

## Summary

- GA shipped on 2026-11-10, on the expected "November 2026" slot. The exact SDK version is `11.0.100` (runtime 11.0.0). The RC1 build `11.0.100-rc.1.26425.128` is superseded by RC2 (`11.0.100-rc.2.26504.105`, 2026-10-13), RC3 (`11.0.100-rc.3.26522.148`, 2026-10-25) and GA. No 11.0.x patch exists as of 2026-11-27: `releases.json` lists 11.0.0 as the latest release.
- .NET 11 is STS, supported 2026-11-10 to 2028-11-14.
- Every C# 15 feature the pair cares about shipped in GA: unions, closed hierarchies, collection expression arguments, extension indexers, labeled break/continue, non-virtual static interface members. None slipped.
- C# 15 is now the default language version for `net11.0`. Only the memory-safety work still needs `LangVersion=preview`.
- RC1 diagnostic IDs and texts hold on GA: `CS9327`, `CS8652`, `CS9273`, `CS9258` measured unchanged on GA; the CA2252 default severity could not be re-determined.
- The claim "`LangVersion=preview` on SDK 10.0.401 silently accepts C# 15 syntax" is still a true statement about SDK 10.0.401, but the fence needs a GA sentence: on SDK 11.0.100 a `net10.0` project accepts only the syntax-only C# 15 features under `LangVersion=15` or `preview`. `closed` and `union` fail with `CS0656` or `CS0518` because the attribute types live only in the .NET 11 reference assemblies.
- The CS-LANG-16 sentence "wait for an SDK 11 GA pin" is now answerable: GA happened, so the pin is `11.0.100`. The fence on the pair's own floor (`net8.0;net10.0`) still holds: a `#if NET11_0_OR_GREATER` region still compiles nowhere (measured, SDK 11.0.100, 0 errors with a misspelled type inside the region).
- System.Text.Json at GA: closed-hierarchy inference works and throws on an unseen discriminator (measured). The .NET 11 generator accepts private `[JsonConstructor]` and non-public `[JsonInclude]` accessors, and its documentation says so. The net10.0 target on the same SDK still reports `SYSLIB1222` and `SYSLIB1038` (measured), so CS-API-18 stands while net8.0 or net10.0 is in `TargetFrameworks`.
- The union open question can be answered: a `closed` hierarchy cannot replace the internal-constructor union for tagged wire data, because an unseen tag throws and `IgnoreUnrecognizedTypeDiscriminators` cannot produce an instance of the implicitly abstract closed base (measured).

## Findings

### 1. GA date and exact SDK version

Claim at risk: `language.md:9` "C# 15 and .NET 11 rows bind to SDK 11.0.100-rc.1.26425.128 (RC1, measured 2026-10-11) and are fenced."

Result: changed. The upstream change date is 2026-11-10.

- Old text: "bind to SDK 11.0.100-rc.1.26425.128 (RC1, measured 2026-10-11) and are fenced."
- New fact: .NET 11.0.0 was released on 2026-11-10 with SDK `11.0.100`; `dotnet --version` prints `11.0.100`. Source: [11.0.0.md](https://github.com/dotnet/core/blob/main/release-notes/11.0/11.0.0/11.0.0.md) ("# .NET 11.0.0 - November 10, 2026", "11.0 SDKs that include 11.0.0 runtimes: 11.0.100") and [releases.json](https://github.com/dotnet/core/blob/main/release-notes/11.0/releases.json) (`latest-release 11.0.0`, `latest-sdk 11.0.100`, `latest-release-date 2026-11-10`; previous entries rc.3 2026-10-25 and rc.2 2026-10-13).
- Replacement fact for the line: rows measured on RC1 stay dated 2026-10-11; GA re-measurement on SDK 11.0.100 dated 2026-11-27 (this file) confirms them except where findings 3 to 6 say otherwise. The "(RC1 ... fenced)" fence can drop to a "GA 11.0.100" binding for the rows this file confirms.
- No 11.0.x patch release exists yet (`releases.json` top entry is 11.0.0), so no further SDK build changes the result.
- Also relevant to the fence: [README.md](https://github.com/dotnet/core/blob/main/release-notes/11.0/README.md) says .NET 11 is Standard Term Support, 2026-11-10 to 2028-11-14. Moving the floor to net11.0 therefore buys a 24-month window, not an LTS.

### 2. Which C# 15 features shipped, slipped or changed shape

Result: all shipped; one shape note.

- [What's new in C# 15](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-15) (last updated 2026-11-10) lists, as shipped: collection expression arguments, union types, closed hierarchies, extension indexers, labeled break and continue, non-virtual static interface members on older runtimes, and memory safety as a preview feature. "C# 15 is the default language version for projects that target net11.0 in the .NET 11 SDK. Only the memory safety preview feature requires `<LangVersion>preview</LangVersion>`."
- [Roslyn Language Feature Status](https://github.com/dotnet/roslyn/blob/main/docs/Language%20Feature%20Status.md) (read 2026-11-27): the `# C# 15.0` table lists collection-expression-arguments, Unions, non-virtual static interface members, ExtendedLayoutAttribute, Closed class hierarchies, Extension indexers and Labeled break/continue, each in state "C# 15". "Unsafe evolution" sits in the working set as "Merged as preview feature into .NET 11p2 and VS 18.6".
- Shape note, memory safety: the [Roslyn breaking-changes page](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/breaking-changes/compiler%20breaking%20changes%20-%20dotnet%2011) says that the pointer relaxations and the `safe` keyword land "In C# 16" under `langversion:16` (VS 18.7 and 18.9), while What's new in C# 15 describes the same memory-safety work as a preview feature of the .NET 11 SDK. Both pages say it is not default-on. The pair's wording ("`updated-memory-safety-rules` Features flag", preview switch) holds; do not describe memory safety as a C# 15 feature that is on by default.
- New breaking change to know, not in the pair today: with `LangVersion` 15 or greater, `with(...)` as the first element of a collection expression binds as collection-construction arguments, not as a call to a method named `with`; `@with(...)` restores the call (same breaking-changes page, "Introduced in Visual Studio 2026 version 18.4"). I did not measure it end to end beyond the collection-expression-arguments sample compiling.

### 3. CS-LANG-15 diagnostics and the preview fence

Result per sentence:

- `CS9327` "not available in C# 14.0": unchanged. Measured on SDK 11.0.100, `net10.0`, default language version: `error CS9327: Feature 'labeled break and continue' is not available in C# 14.0. Please use language version 15.0 or greater.` and the same for `collection expression arguments`.
- `CS8652` "currently in Preview": unchanged. Measured on SDK 11.0.100, `net11.0`, default language version, `unsafe(R())` expression with `AllowUnsafeBlocks`: `error CS8652: The feature 'updated memory safety rules' is currently in Preview and *unsupported*. To use Preview features, use the 'preview' language version.` Note the feature name in the message is now "updated memory safety rules", so a grep on the old text only for `closed` or `union` no longer finds CS8652 on SDK 11: those two are plain C# 15 features on `net11.0`.
- `updated-memory-safety-rules` Features flag: unchanged. `-p:Features=updated-memory-safety-rules` with `LangVersion=preview` and `AllowUnsafeBlocks` builds and turns on the stricter rules: a call to `unsafe int M(int* p)` from safe code gives `error CS9362: 'C.M(int*)' must be used in an unsafe context because it is marked as 'unsafe'` (with the flag) against `error CS9363 ... because it has pointers in its signature` (preview only). The flag without `LangVersion=preview` gives `CS8652`.
- "`LangVersion=preview` on SDK 10.0.401 silently accepts C# 15 syntax": unchanged as a statement about SDK 10.0.401 (not re-measured; no change upstream of an old SDK). Needs a GA companion fact, measured on SDK 11.0.100 with `net10.0`: `LangVersion=preview` and `LangVersion=15` both accept labeled `continue outer;` and `[with(capacity: 4), 1]` (0 errors), but `public closed class Shape` fails `CS0656: Missing compiler required member 'System.Runtime.CompilerServices.IsClosedTypeAttribute..ctor'` and `public union Pet(Cat, Dog);` fails `CS0518: Predefined type 'System.Runtime.CompilerServices.IUnion' is not defined or imported` plus `CS0656 ... UnionAttribute..ctor`. On the same SDK with `net11.0`, both compile with no flag.
- "CA2252, an error by default in .NET 10": I did not re-measure CA2252. The SDK 11.0.100 build of a `net8.0;net10.0` project with `EnablePreviewFeatures=true` and an empty class built with 0 warnings (the stamp only bites a consumer, as the row says). Status: could not determine whether the default severity changed in .NET 11; no upstream source found that says it changed.

### 4. CS-LANG-11 name rules and CS9272/CS9273

Result: confirmed, with a tighter diagnostic list.

- "Name no type or member `union`, `closed` or `extension`": still right, and now documented. The breaking-changes page says `closed` is a contextual keyword in type declaration contexts (VS 18.10): "a type or alias declaration named `closed` without an `@` escape produces CS9380", and a member using it as a type name may produce `CS1519`; `union` followed by a type name can parse as a union declaration and "produce CS9370". Measured on SDK 11.0.100, `net11.0`: `public class closed {}` gives `error CS9380: Types and aliases cannot be named 'closed'.`; a field `closed a;` gives `error CS1519: Invalid token ';' in a member declaration`; `public class union {}` gives only `warning CS8981` (lower-case type name), so a type named `union` is a warning, not an error, until a declaration site is parsed as a union declaration. Replacement fact for the row: add "CS9380 for a type named `closed`, CS9370 where `union` starts a declaration; escape with `@` to keep an old name".
- "the docs say CS9272, SDK 10.0.401 reports CS9273": on SDK 11.0.100 a `field` local in a getter with a `field` member reports `error CS9273: In language version 14.0, 'field' is a keyword within a property accessor. Rename the variable or use the identifier '@field' instead.` (measured; the text says "language version 14.0" even though the default is 15, so it describes the version `field` became a keyword) and `warning CS9258` for a member read, unchanged from the baseline. The Microsoft Learn pages for CS9272 and CS9273 returned 404 on 2026-11-27, so "the docs say CS9272" could not be re-checked: could not determine. Keep "match both".
- CS-LANG-19 "a `readonly` parameter does not exist even on RC1": still true on GA. Measured on SDK 11.0.100: `void M(readonly int x)` gives `error CS9190: 'readonly' modifier must be specified after 'ref'`. Replacement wording: "does not exist on RC1 or GA (CS9190)". The Roslyn feature-status C# 15 table has no readonly-parameter entry.

### 5. CS-LANG-16 and the floor

Result: the GA part is now decided; the fence stands.

- GA happened (finding 1), so "wait for an SDK 11 GA pin" can read "pin SDK 11.0.100 when a leg for `net11.0` is added".
- Measured on SDK 11.0.100: a project with `TargetFrameworks` `net8.0;net10.0` and a region `#if NET11_0_OR_GREATER ... Nope.X ... #endif` built with 0 errors, 0 warnings. So the first sentence of the rationale ("No leg compiles the region") holds on the new SDK too. A `net10.0;net11.0` project restored and built on the same SDK (so "SDK 10.0.401 cannot add the leg (NETSDK1045, CS1617)" is no longer true for SDK 11.0.100, which can add it).
- The fence wording for CS-LANG-15 and 16 while the floor is `net8.0;net10.0`: still holds. Nothing in C# 15 that is on by default for `net11.0` becomes available on `net10.0` except syntax-only features under an explicit `LangVersion` (finding 3), and that is what the row forbids.

### 6. api-design.md:59 (CS-API-08) and api-design.md:82 (CS-API-18)

- "no C# 15 `union` or `closed`": unchanged for the pair's floor. The reasons given: "`closed` is `CS8652` on SDK 10.0.401" stays true of SDK 10.0.401, but on SDK 11.0.100 with `net10.0` the failure is `CS0656` (`IsClosedTypeAttribute`), and on `net11.0` there is no error at all. Suggested replacement for the fragment: "`closed` is `CS8652` on SDK 10.0.401, `CS0656` on SDK 11.0.100 targeting `net10.0`, and legal only on `net11.0`". The "adding a `union` case is a DISALLOWED change" statement is not re-verified (ApiCompat not run): could not determine.
- CS-API-18 "`SYSLIB1222` or `SYSLIB1038` ... .NET 11 RC1 accepted them as of 2026-10": changed in confirmation only. Measured on SDK 11.0.100: for `net11.0` the generator builds with `TreatWarningsAsErrors` and 0 diagnostics a class with a private `[JsonConstructor]` and a `[JsonInclude]` property with a private setter, and both deserialize (`x`). For `net10.0` in the same project: `error SYSLIB1222: The constructor on type 'A' has been annotated with JsonConstructorAttribute but is not accessible by the source generator` and `error SYSLIB1038: The member 'B.Name' has been annotated with the JsonIncludeAttribute but is not visible to the source generator`. So "accepted as of 2026-10 on RC1" becomes "accepted on `net11.0` at GA (measured 2026-11-27), documented in [What's new in .NET 11 libraries](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/libraries): 'Members marked with JsonIncludeAttribute can have private, internal, or protected accessors' and 'An inaccessible constructor marked with JsonConstructorAttribute can participate in deserialization'; still rejected on `net8.0` and `net10.0`".
- The `[JsonRequired]` on a get-only property statement holds on GA: measured `InvalidOperationException: JsonPropertyInfo 'Name' defined in type 'C' is marked required but does not specify a setter.`
- "dotnet/runtime#77016 says the opposite about `internal`": unchanged. The issue ([api.github.com](https://api.github.com/repos/dotnet/runtime/issues/77016), "Json serializer code generator doesn't support internal constructors") is closed, last updated 2023-07-13. Its text describes internal-constructor failure, which is out of date for `net11.0` (my measurement accepts a private constructor on `net11.0`) and in date for `net10.0` as reported earlier by the pair.

### 7. json.md claims

- json.md:49 "The .NET 11 RC1 SDK (11.0.100-rc.1.26425.128) builds the shared union converter with 0 warnings and passes 198 ..." : could not determine on GA. I did not have the converter source or its tests, so the 0-warning and 198-pass counts were not re-run. Replacement sentence for when the owner re-runs: name SDK `11.0.100` and date it. The GA documentation for union serialization (in the libraries what's-new page) now describes built-in handling: `public union Reading(int, string)` serializes to the active case value, a struct union with no active case serializes to `null`, `JsonUnionAttribute.TypeClassifier` and `JsonUnionTypeStructuralClassifier` choose the case on read, and "the source generator no longer reports SYSLIB1227 for unions that use custom converters". The F# union support is reflection-only (no source generation, trimming or AOT).
- json.md:98 "C# 15 `closed`, `InferClosedTypePolymorphism`" no/no/no row: unchanged for the pair's targets. Now documented on [polymorphism](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/polymorphism): "Starting in .NET 11, System.Text.Json can infer derived types from a C# 15 closed hierarchy"; enable by `JsonPolymorphicAttribute.InferClosedTypePolymorphism`, `JsonSerializerOptions.InferClosedTypePolymorphism` or `JsonSourceGenerationOptionsAttribute.InferClosedTypePolymorphism`; discriminator is the simple type name; explicit `JsonDerivedType` registrations replace inference; enabling only the runtime option fails fast when generated metadata lacks the derived types; a per-type opt-in on a non-closed type throws `InvalidOperationException` (reflection) or a source-generation error; "Inferred types with duplicate simple names produce discriminator collisions".
- json.md:101 "last row is unavailable until .NET 11 GA (November 2026)": changed. GA is 2026-11-10. Replacement: "available on `net11.0` since .NET 11 GA (2026-11-10, SDK 11.0.100); unavailable on `net8.0` and `net10.0` targets". The pair's floor makes it unusable still.
- json.md:329 ".NET 11 closed inference throws on an unseen tag": confirmed on GA, measured 2026-11-27: `Deserialize<Shape>("{\"$type\":\"Triangle\"}")` throws `JsonException: Read unrecognized type discriminator id 'Triangle'.` A payload with no `$type` throws `NotSupportedException: The JSON payload for polymorphic interface or abstract type 'Shape' must specify a type discriminator.` Setting `IgnoreUnrecognizedTypeDiscriminators = true` on a closed hierarchy turns the unseen tag into `NotSupportedException ... must specify a type discriminator` (the base is implicitly abstract, so there is nothing to fall back to); the same happens on a hand-registered abstract base with `FallBackToBaseType`.

### 8. The union open question (csharp-api.md, "csharp-api-csharp15-unions")

Question: can a `closed` hierarchy with a registered `Unknown` arm replace the internal-constructor union without breaking on new ocx tags?

Answer, partly: no for the unseen-tag requirement, so the open item can be narrowed, though one half stays open.

- A `closed` hierarchy only fixes the set of direct descendants at compile time ([What's new in C# 15](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-15), "A closed class can only be derived from within its declaring assembly"). STJ inference maps each tag to one derived type by simple name, and an `Unknown` arm would need a discriminator string; there is no wildcard. A tag the producer adds later cannot reach an `Unknown` arm without a custom converter (measured, finding 7). That is exactly what the internal-constructor pattern with a sealed `Unknown` case that keeps the raw tag and payload does by hand, so it is not replaceable by inference.
- The language-level union (`public union Pet(Cat, Dog, Bird)`) selects a case by JSON token kind or a structural classifier, not by a string tag, and gives no place to keep an unseen tag's raw payload. I did not build an `Unknown` case into a union and measure it, so "can a custom `TypeClassifier` map unseen shapes to an `Unknown` case" is could not determine.
- Still open (not measurable here): what ApiCompat reports when a closed hierarchy or union gains a case. It was not run. Keep that half of the item open, drop "can closed replace the internal constructor", and cite the measured throw.

## Normative guidance candidates

1. Rule: when `TargetFrameworks` contains `net8.0` or `net10.0`, ship no `closed`, `union` or `InferClosedTypePolymorphism`, and leave `LangVersion` at the default; do not "fix" a `CS9327` by raising it. Rationale: on SDK 11.0.100 these fail with `CS0656` or `CS0518` on `net10.0` (measured 2026-11-27) and are `CS9327` at the default language version. Verification: `grep -rnE --include='*.cs' -e '^\s*public\s+(closed|union)\b' src` prints nothing (existing CS-API-08 scan), and `dotnet build` on each TFM exits 0.
2. Rule: name no type `closed` or `union`; escape an inherited name with `@`. Rationale: CS9380 and CS9370 are errors from C# 15 on `net11.0` (Roslyn breaking changes, measured CS9380). Verification: `grep -rnE --include='*.cs' -e '\b(class|record|struct|interface|enum)\s+(closed|union)\b' src` prints nothing (extend the existing L11 style scan).
3. Rule: when a project moves to `net11.0`, pin `global.json` to SDK `11.0.100` or newer feature band and re-run the full gate before using any C# 15 syntax. Rationale: C# 15 becomes the default only for `net11.0`; older TFMs stay at C# 14. Verification: `dotnet --version` in CI prints `11.0.100` or later and `grep -n '"version"' global.json` agrees.
4. Rule: do not rely on a closed hierarchy plus inference for a wire union that must survive new tags; keep the internal-constructor union with an `Unknown` case. Rationale: unseen tag throws `JsonException`, `IgnoreUnrecognizedTypeDiscriminators` cannot instantiate the abstract closed base (measured 2026-11-27). Verification: a unit test that deserializes `{"$type":"NewTag"}` and asserts the `Unknown` case; reading heuristic on any PR that adds `[JsonPolymorphic(InferClosedTypePolymorphism = true)]` to a wire type.
5. Rule: do not use private or protected members under `[JsonConstructor]` or `[JsonInclude]` while any target is `net8.0` or `net10.0`, even if `net11.0` accepts them (existing CS-API-18, no change). Rationale: `net11.0` accepts them, `net10.0` gives SYSLIB1222 and SYSLIB1038 (measured). Verification: the existing CS-API-18 scans, plus a build of every TFM.
6. Candidate wording change for CS-LANG-15 evidence: record both SDKs, "SDK 10.0.401 silently accepts C# 15 syntax under `LangVersion=preview`; SDK 11.0.100 accepts the syntax-only features on `net10.0` and fails `closed` and `union` with `CS0656` and `CS0518`". Verification: the red/green already in the row, rerun on a `net10.0` project with SDK 11.0.100.

## AI-agent angle

- An agent trained before GA will say "union and closed need `LangVersion=preview`". On SDK 11.0.100 with `net11.0` they need nothing, and on `net10.0` they cannot work even with `preview`. Mechanical check: build each TFM, read the error ID (`CS0656` or `CS0518` means a missing .NET 11 type, not a language-version problem).
- An agent will name a helper type `closed` or `union` in pre-C# 15 style (`class union {}`), which compiles with only `CS8981` today and breaks at declaration sites. Mechanical check: the identifier grep in candidate 2.
- An agent will assume `[JsonPolymorphic(InferClosedTypePolymorphism = true)]` with `IgnoreUnrecognizedTypeDiscriminators = true` gives forward compatibility. It throws `NotSupportedException` on an unseen tag. Mechanical check: candidate 4's unit test.
- An agent reading dotnet/runtime#77016 will say internal constructors cannot be source-generated. That is out of date on `net11.0` and still true enough on `net10.0` for private ones. Mechanical check: build all TFMs.
- An agent will copy `with(...)` as an ordinary method call named `with` into C# 15 projects. Mechanical check: build on `net11.0`, or search `\bwith\(` inside collection-expression brackets.

## Contested / evolving

- Memory safety: What's new in C# 15 treats it as a preview feature of C# 15, while the breaking-changes page attaches the pointer relaxations and `safe` keyword to `langversion:16`. Trend: it is a multi-release effort; do not write it into any rule as stable. As of 2026-11-27.
- Learn pages for CS9272, CS9273, CS8652 and CS9327 returned 404 on 2026-11-27, so the "docs say" half of CS-LANG-11 cannot be re-verified from the compiler-messages reference. The compiler text itself is the evidence.
- STS lifetime: .NET 11 is supported only to 2028-11-14, so a rule that moves the floor to `net11.0` trades LTS for new language features. The decision belongs to the pair owner, not to this brief.
- Not determined: GA re-run of the shared union converter (0 warnings, 198 tests), ApiCompat verdicts for union or closed case changes, CA2252 default severity in .NET 11, any `Unknown`-case design on top of a C# `union` with a custom `TypeClassifier`.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://github.com/dotnet/core/blob/main/release-notes/11.0/11.0.0/11.0.0.md | .NET 11.0.0 GA release notes | 2026-11-10 | Primary: GA date and SDK 11.0.100 |
| https://github.com/dotnet/core/blob/main/release-notes/11.0/releases.json | Release manifest | read 2026-11-27 | Primary: latest release, rc.2/rc.3 build numbers, no 11.0.x patch |
| https://github.com/dotnet/core/blob/main/release-notes/11.0/README.md | .NET 11 index | read 2026-11-27 | Primary: STS support window |
| https://github.com/dotnet/core/blob/main/release-notes/11.0/known-issues.md | Known issues | read 2026-11-27 | Primary: only a preview-era Task covariance entry |
| https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-15 | What's new in C# 15 | updated 2026-11-10 | Primary: shipped feature list, default LangVersion rule |
| https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/breaking-changes/compiler%20breaking%20changes%20-%20dotnet%2011 | Roslyn breaking changes .NET 10 to 11 | read 2026-11-27 | Primary: `closed`/`union` keyword errors, `with(` binding, C# 16 pointer note |
| https://github.com/dotnet/roslyn/blob/main/docs/Language%20Feature%20Status.md | Roslyn feature status | read 2026-11-27 | Primary: C# 15 table, unsafe evolution state |
| https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/overview | What's new in .NET 11 overview | updated 2026-11-12 | Primary: STJ and union scaffolding summary |
| https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/libraries | What's new in .NET 11 libraries | updated 2026-11-10 | Primary: STJ unions, closed inference, source-generator contract changes |
| https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/polymorphism | STJ polymorphism doc | read 2026-11-27 | Primary: closed-hierarchy inference rules |
| https://api.github.com/repos/dotnet/runtime/issues/77016 | dotnet/runtime#77016 | closed, 2023-07-13 | Primary: the internal-constructor issue the pair cites |
| https://raw.githubusercontent.com/dotnet/csharplang/main/proposals/csharp-15.0/unions.md | Unions proposal | speclet | Primary: fetched, head only read |
| https://dot.net/v1/dotnet-install.sh with `--version 11.0.100` | SDK 11.0.100 GA install used for measurement | 2026-11-27 | Primary: every "measured" statement above |
| Local measurement projects in the session scratchpad (`t1` to `t6`) | Builds and a runtime STJ test on SDK 11.0.100 | 2026-11-27 | Re-runnable evidence for diagnostics and the unseen-tag throw |
