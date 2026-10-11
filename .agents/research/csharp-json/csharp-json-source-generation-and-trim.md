---
title: "System.Text.Json source generation and trim/AOT compatibility for a CLI-wrapping .NET SDK"
topic: "csharp-json / csharp-json-source-generation-and-trim"
agent: "deep-dive researcher (sonnet)"
model: "claude-sonnet-5-5"
date_researched: 2026-10-10
sources_count: 22
scope: |
  Covers: whether the ocx C# SDK must use System.Text.Json source generation (JsonSerializerContext, modes, combining, polymorphism with a `type` discriminator), what trim/Native AOT demand of a library (IsAotCompatible/IsTrimmable, IL2026/IL3050/IL2104/IL3053, SYSLIB1034/1221), netstandard2.0 and net8.0 floor behaviour, context layout, CI gates, Newtonsoft.Json as an agent reflex, and what the vendor-SDK exemplars do. Native AOT was published and RUN on linux-x64 with SDK 10.0.401 (gcc standing in for clang); .NET 11 RC1 checked once.
  Not covered: converters/enums/`required`/nullable binding rules in depth (sibling subtopics), process spawning, packaging/TFM policy beyond what JSON forces. Native AOT on win-*/osx-*/arm64 was NOT executed here (docs and the xunit exemplar are cited instead); no Windows host run was needed.
---

# System.Text.Json source generation and trim/AOT compatibility

Fixture root (all commands below run from here via `/home/mherwig/.cache/research-lang/dotnet-tools/run.sh`):
`FX=/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-json-source-generation-and-trim`.
Re-runnable scripts: `$FX/verify.sh`, `$FX/verify-tfm.sh`, `$FX/verify-halluc.sh`; saved output: `$FX/verify.log`, `verify-tfm.log`, `verify-halluc.log`.

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Decision: source generation is mandatory, and why](#1-decision-source-generation-is-mandatory-and-why)
   2. [What the runtime does without it](#2-what-the-runtime-does-without-it)
   3. [Context anatomy and the call overloads that matter](#3-context-anatomy-and-the-call-overloads-that-matter)
   4. [The silent trap: a context plugged into your own options](#4-the-silent-trap-a-context-plugged-into-your-own-options)
   5. [Generation modes](#5-generation-modes)
   6. [Polymorphism with a `type` discriminator under source generation](#6-polymorphism-with-a-type-discriminator-under-source-generation)
   7. [Context layout: one per assembly, when to Combine](#7-context-layout-one-per-assembly-when-to-combine)
   8. [IsAotCompatible / IsTrimmable and the analyzer IDs](#8-isaotcompatible--istrimmable-and-the-analyzer-ids)
   9. [Should a spawn-a-process-and-parse-JSON library claim AOT compatibility](#9-should-a-spawn-a-process-and-parse-json-library-claim-aot-compatibility)
   10. [netstandard2.0, net8.0 floor, package versions, LangVersion](#10-netstandard20-net80-floor-package-versions-langversion)
   11. [Enums under source generation](#11-enums-under-source-generation)
   12. [Newtonsoft.Json: reject](#12-newtonsoftjson-reject)
   13. [Why the vendor SDKs mostly do not source-generate, and what the corpus does](#13-why-the-vendor-sdks-mostly-do-not-source-generate-and-what-the-corpus-does)
   14. [.NET 11 / C# 15 delta](#14-net-11--c-15-delta)
   15. [Verified on the toolchain](#15-verified-on-the-toolchain)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- Source generation is mandatory for the SDK: every `JsonSerializer` call takes a `JsonTypeInfo<T>` (`Ctx.Default.X`) from one `[JsonSerializable]` context; reflection-based overloads are banned. Measured: the reflection overload compiles, publishes with warnings (exit 0), and crashes at runtime with `InvalidOperationException: Reflection-based serialization has been disabled` (exit 134) under both `PublishAot` and `PublishTrimmed`.
- Set `IsAotCompatible=true` on the library, conditioned on a net8.0-or-later TFM (`IsTargetFrameworkCompatible(..., 'net8.0')`). A library whose only reflection is JSON and which spawns a process built clean with `TreatWarningsAsErrors` and ran under Native AOT (fixture E1).
- Make IL2026 and IL3050 errors (`dotnet_diagnostic.IL2026.severity = error`, same for IL3050 and SYSLIB1034) so the library build fails; by default a `PublishAot`/`PublishTrimmed` consumer publish succeeds with warnings and only fails at runtime.
- Only the `JsonTypeInfo<T>` and `JsonSerializerContext` overloads are warning-free; every overload that takes `JsonSerializerOptions` warns IL2026+IL3050, including `Ctx.Default.Options` (probe B, lines 16/17/18/20).
- Never plug the context into your own `JsonSerializerOptions { TypeInfoResolver = Ctx.Default }`: `[JsonSourceGenerationOptions]` settings (naming policy) are silently dropped and deserialization returns empty properties instead of failing (`FirstName =` empty, probe B).
- Put every option on `[JsonSourceGenerationOptions]` (`PropertyNamingPolicy = JsonKnownNamingPolicy.SnakeCaseLower`, `AllowOutOfOrderMetadataProperties = true`, `DefaultIgnoreCondition`); unknown JSON members are skipped by default, so `UnmappedMemberHandling` is only needed to opt in to `Disallow`.
- One internal sealed partial context per assembly holding every wire type; split or `Combine` only across assemblies. Unregistered types throw `NotSupportedException` at runtime in every runtime (no reflection fallback since .NET 7).
- Leave `GenerationMode` at the default (both) or `Metadata`; a `Serialization`-only context cannot deserialize and failed on polymorphic types (`InvalidOperationException ... did not provide property metadata`).
- ocx unions (`type` tag, snake_case): use `[JsonPolymorphic(TypeDiscriminatorPropertyName = "type", IgnoreUnrecognizedTypeDiscriminators = true)]` on a NON-abstract base with `[JsonExtensionData]`, set `AllowOutOfOrderMetadataProperties = true`, and never give a derived type a property that maps to `type`.
- `AllowOutOfOrderMetadataProperties` is .NET 9+: on a `net8.0` TFM it is CS0246 until the library references `System.Text.Json` >= 9 (verified with 10.0.12 on net8.0).
- On `netstandard2.0` the source generator needs `LangVersion` >= 9 (default 7.3 gives SYSLIB1221) plus a `System.Text.Json` PackageReference; `IsAotCompatible` there is a no-op (analyzers evaluate `false`) and a netstandard-only project gets NETSDK1210.
- Non-generic `JsonStringEnumConverter` is rejected twice (SYSLIB1034 at build, `NotSupportedException ... missing native code` at runtime); use `JsonStringEnumConverter<T>` or `UseStringEnumConverter = true`, and remember a closed enum still throws on an unknown value.
- Reject Newtonsoft.Json: under `PublishAot` it produced IL2104 + IL3053 + IL3050 warnings and worked only by luck on a trivial record; it has no source generator.
- Test projects should set `JsonSerializerIsReflectionEnabledByDefault=false` so a missing registration fails in plain `dotnet test` (CoreCLR) instead of only in a published binary; also add a `PublishAot` smoke app run per RID (xunit does 7 RIDs).
- The brief's "0/5 vendor SDKs source-generate" needs one correction: Azure.Core has an internal context (ResponseError parsing) but opts out of AOT analyzers; openai reaches AOT with generated `Utf8JsonWriter` models, not contexts; anthropic uses reflection with options and sets no AOT flags.
- .NET 11 RC1 adds `InferClosedTypePolymorphism` for C# 15 `closed` hierarchies (worked in a probe) and `[JsonInclude]` on non-public members; treat both as preview until GA in November 2026.

## Findings

### 1. Decision: source generation is mandatory, and why

The consumers of this SDK may publish trimmed or Native AOT. Microsoft's guidance: reflection metadata collection "takes time and uses memory", and "certain reflection APIs can't be used in Native AOT applications, so you must use source generation for those apps" ([reflection-vs-source-generation](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/reflection-vs-source-generation), updated 2026-09-29). The trimming guide names reflection-based serializers as the canonical "mostly trim-incompatible API" and tells library authors to adopt source generators ([prepare-libraries-for-trimming](https://learn.microsoft.com/en-us/dotnet/core/deploying/trimming/prepare-libraries-for-trimming)).

Decision for the ocx C# SDK:

| Question | Decision | Basis |
|---|---|---|
| Source generation mandatory? | Yes, no exceptions in library code | Findings 2, 3, 15 |
| `IsAotCompatible` on? | Yes, on TFMs >= net8.0 only | Findings 8, 9, 10 |
| Context layout | One `internal sealed partial` context per assembly | Finding 7 |
| Checks | IL2026/IL3050/SYSLIB1034 as errors; `PublishAot` smoke app; rg gate | Finding 15, rules R1-R6 |

Cost of the decision is low for this SDK: the ocx wire models are a closed, known set (about 56 report roots per [ocx-cli-contract.md](../csharp-audit/ocx-cli-contract.md) line 69), plain DTOs, and the only polymorphism is the `type` tag. Opaque sub-objects stay `JsonElement`, which needs no registration (probe A `jsonelement: OK {"k":[1,2]}`).

### 2. What the runtime does without it

`JsonSerializerIsReflectionEnabledByDefault` is set to `false` automatically when `PublishTrimmed` (and therefore `PublishAot`) is on; "If you don't specify this property and PublishTrimmed is enabled, reflection-based serialization is automatically disabled." Code that uses reflection then throws `InvalidOperationException` with a descriptive message ([source-generation](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/source-generation), "Disable reflection defaults"). The property is a link-time constant, identical on CoreCLR and Native AOT.

INCORRECT (compiles, warns, crashes in the consumer):

```csharp
// library, net10.0, IsAotCompatible=true
public static VersionReport? ParseVersion(string json) =>
    JsonSerializer.Deserialize<VersionReport>(json);   // IL2026 + IL3050 at library build
```

CORRECT:

```csharp
[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.SnakeCaseLower)]
[JsonSerializable(typeof(VersionReport))]
internal sealed partial class OcxJsonContext : JsonSerializerContext;

public static VersionReport? ParseVersion(string json) =>
    JsonSerializer.Deserialize(json, OcxJsonContext.Default.VersionReport);
```

Observed (fixture `red/`, `$FX/verify.sh` sections G1, A1, A2, T1):

- Library build with `IsAotCompatible`: `warning IL2026` and `warning IL3050` on `Deserialize<TValue>(String, JsonSerializerOptions)`; with `dotnet_diagnostic.IL2026.severity = error` the build exits 1 (G1).
- Consumer `dotnet publish -r linux-x64` with `PublishAot=true`, no warnings-as-errors: exit 0, native binary produced, 2x IL2026 + 2x IL3050 warnings (A2). Running it: exit 134, `System.InvalidOperationException: Reflection-based serialization has been disabled for this application. Either use the source generator APIs or explicitly configure the 'JsonSerializerOptions.TypeInfoResolver' property.`
- Same with `PublishTrimmed=true SelfContained=true` (no AOT): publish exit 0 with IL2026/IL3050 warnings, run exit 134, same exception (T1).
- Setting only `<JsonSerializerIsReflectionEnabledByDefault>false</JsonSerializerIsReflectionEnabledByDefault>` on a plain CoreCLR `dotnet run` throws the same exception (`red-trim/jit`), which is how tests catch it without publishing.

So the trim/AOT break is invisible to the SDK's own CI unless a warning is promoted to an error or a smoke app runs.

### 3. Context anatomy and the call overloads that matter

Shape ([source-generation](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/source-generation), section "Use source-generation defaults"): a `partial` class deriving `JsonSerializerContext`, one `[JsonSerializable(typeof(T))]` per root type; member types are discovered transitively except `object`-typed members, whose runtime types must be registered, and collections, which are registered as the collection type (`List<T>`). `TypeInfoPropertyName` renames the generated `Default.X` property. Source generation requires C# 9 or later. C# 12 primary-style `internal sealed partial class Ctx : JsonSerializerContext;` is accepted by the generator (used in fixtures; exemplars testfx `AzureDevOpsHistoryClientJsonContext.cs:10`, testcontainers `SourceGenerationContext.cs:6`, GitVersion `CliSchemaDocument.cs:28`).

Overload table, measured on SDK 10.0.401 net10.0 with `IsAotCompatible=true` (probe B, `$FX/probe-b/Program.cs`):

| Call | Analyzer | Honours `[JsonSourceGenerationOptions]` |
|---|---|---|
| `Serialize(v, Ctx.Default.Alpha)` / `Deserialize(json, Ctx.Default.Alpha)` | clean | yes (`{"first_name":"x"}`) |
| `Serialize(v, typeof(Alpha), Ctx.Default)` | clean | yes |
| `Serialize(v, Ctx.Default.Options)` | IL2026 + IL3050 | yes |
| `Serialize<Alpha>(v, new JsonSerializerOptions { TypeInfoResolver = Ctx.Default })` | IL2026 + IL3050 | NO (`{"FirstName":"x"}`) |
| `Deserialize<Alpha>(json, thatOptions)` | IL2026 + IL3050 | NO, returns `Alpha { FirstName = }` (empty) |
| `JsonElement.Deserialize<T>()`, `JsonNode.Deserialize<T>()`, `HttpContent.ReadFromJsonAsync<T>()` | IL2026 + IL3050 | n/a (reflection) |

The extension-method rows are verified in `halluc/ext-red` (`verify-halluc.sh`). Each has a context twin (`element.Deserialize(Ctx.Default.RepInfo)`, `content.ReadFromJsonAsync(Ctx.Default.RepInfo)`) that is clean (`halluc/green`).

### 4. The silent trap: a context plugged into your own options

The docs say options set through the attribute apply to `Ctx.Default`, and "If you create and use a context instance by calling the constructor that takes a JsonSerializerOptions instance, the supplied instance will be used instead of the options specified by JsonSourceGenerationOptionsAttribute" ([source-generation](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/source-generation)). The observable consequence, which the docs do not state: using `Ctx.Default` as the `TypeInfoResolver` of a different `JsonSerializerOptions` also drops the attribute's settings, because the options object supplies the policy. With `PropertyNamingPolicy = SnakeCaseLower` on the context:

```text
typeinfo      : {"first_name":"x"}
ctx.Options   : {"first_name":"x"}
resolver-opts : {"FirstName":"x"}        <- wrong, no error
deser opts    : Alpha { FirstName =  }   <- wrong, no error (wire says first_name)
```

For a JSON-binding SDK this is the worst failure class: a green build, no exception, empty typed results. `Combine(CtxA.Default, CtxB.Default)` behaves the same (probe A `combine-options-A: {"FirstName":"x","Meta":null}` vs `combine-serialize-A: {"first_name":"x",...}`).

Correct way to customise runtime options while keeping the attribute settings, as GitVersion does: construct the context from a copy of the default options and still call the `JsonTypeInfo` overloads (GitTools__GitVersion@5057cdbcc177:src/GitVersion.Output/Serializer/VersionVariablesJsonContext.cs:13-17: `new VersionVariablesJsonContext(new JsonSerializerOptions(Default.Options) { Encoder = ... })`). BenchmarkDotNet shows the other style (dotnet__BenchmarkDotNet@61ebda8a50ae:src/BenchmarkDotNet/Serialization/BdnJsonSerializer.cs:23-26 chain + :38,:40 `JsonSerializer.Serialize(item, IndentedOptions)`): fine for an app that is not AOT-compatible, but it is exactly the pattern that warns IL2026 and drops attribute settings.

Since .NET 7 a context used through options no longer falls back to reflection for unregistered types; it throws ([breaking change](https://learn.microsoft.com/en-us/dotnet/core/compatibility/serialization/7.0/reflection-fallback)). The switch `System.Text.Json.Serialization.EnableSourceGenReflectionFallback` that restores it is an app-level escape hatch and must never be set by the SDK.

### 5. Generation modes

`JsonSourceGenerationMode`: `Default` (both), `Metadata`, `Serialization` (fast path). Set per context with `[JsonSourceGenerationOptions(GenerationMode = ...)]` or per type with `[JsonSerializable(typeof(T), GenerationMode = ...)]`; the type-level value wins ([source-generation](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/source-generation)).

- Fast path emits `Utf8JsonWriter` code, "doesn't support asynchronous serialization or any mode of deserialization", and does not support `JsonConverterAttribute`, `JsonConstructorAttribute`, `JsonExtensionDataAttribute`, `JsonNumberHandlingAttribute`, `Converters`, `ReferenceHandler`; unsupported features fall back to metadata only if metadata was generated ([source-generation-modes](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/source-generation-modes)). Fast-path deserialization is a future item: [dotnet/runtime#55043](https://github.com/dotnet/runtime/issues/55043) is open, milestone Future, last activity 2025-08-24.
- Measured: a `Serialization`-only context deserializes nothing: `InvalidOperationException: TypeInfoResolver 'FastOnly' did not provide property metadata for type 'Alpha'` (probe A). A `Serialization`-only context also failed serializing a `[JsonPolymorphic]` base (`... did not provide property metadata for type 'PolyA'`), although the modes table marks `JsonPolymorphic`/`JsonDerivedType` as supported and the same page later says "Polymorphism is supported in metadata-based source generation, but not fast-path source generation." Trust the observation and the sentence, not the table.
- The SDK is read-mostly (it parses ocx stdout; it writes only small request/config documents), so the fast path buys nothing. Rule: leave `GenerationMode` unset.

### 6. Polymorphism with a `type` discriminator under source generation

ocx contract: "unions carry `type`, keys/enums snake_case ... Enums and unions are open; unknown `status` is NOT success" ([ocx-cli-contract.md](../csharp-audit/ocx-cli-contract.md) line 69) and decoders "skip unknown tags" (line 132). `[JsonPolymorphic]` + `[JsonDerivedType]` (STJ since .NET 7) maps onto this ([polymorphism](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/polymorphism)). Facts from the docs and the probes:

| Concern | Behaviour | Evidence |
|---|---|---|
| Default discriminator name | `$type`; rename with `[JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]` | docs |
| Discriminator position | Must be first unless `AllowOutOfOrderMetadataProperties = true` (JsonSerializerOptions property .NET 9; also on `JsonSourceGenerationOptionsAttribute`). Without it `{"n":4,"type":"a"}` throws `NotSupportedException: ... must specify a type discriminator` | probe A `poly-out-of-order`; green A3 prints `out-of-order -> InstallReport 3` |
| Unknown tag, default | `JsonException: Read unrecognized type discriminator id 'zzz'` | probe A |
| Unknown tag with `IgnoreUnrecognizedTypeDiscriminators = true`, non-abstract base | returns a base-type instance (`unknown tag -> Report`) | A3 (AOT binary) |
| Same, abstract/interface base | still `NotSupportedException ... must specify a type discriminator` | probe H `abstract-base-unknown+ignore` |
| Base-type fallback keeps payload? | Not by default; with `[JsonExtensionData] Dictionary<string, JsonElement>? Extra` on the base, the unknown object's other keys land in `Extra` (`Node2 extra=a,b`) | probe H `unknown-keeps-extra` |
| Known tag, bad payload | expected to be a normal `JsonException` (not "unknown"), matching the Rust generator's "known tag + bad payload = error" | NOT tested here; add a unit test |
| Derived type with a property that maps to `type` | `InvalidOperationException: The type 'ClashA' contains property 'type' that conflicts with an existing metadata property name` on first use, not at build | probe H `clash-*`; with `SnakeCaseLower` the C# property `Type` maps to `type` |
| Nested properties / `List<Base>` | polymorphic per element | probe H `nested: OK Leaf,Node` |
| Registration | register only the BASE with `[JsonSerializable]`; derived types come from `[JsonDerivedType]` | A3 registers only `Report` |
| Fast path | not supported (see Finding 5) | probe A |

CORRECT union (net9+/STJ 9+; this is `green/lib/Models.cs`, run under Native AOT):

```csharp
[JsonPolymorphic(TypeDiscriminatorPropertyName = "type", IgnoreUnrecognizedTypeDiscriminators = true)]
[JsonDerivedType(typeof(PushReport), "push")]
[JsonDerivedType(typeof(InstallReport), "install")]
public class Report { [JsonExtensionData] public Dictionary<string, JsonElement>? Extra { get; set; } }
public sealed class PushReport : Report { public string Digest { get; set; } = ""; }

[JsonSourceGenerationOptions(
    PropertyNamingPolicy = JsonKnownNamingPolicy.SnakeCaseLower,
    AllowOutOfOrderMetadataProperties = true)]
[JsonSerializable(typeof(Report))]
internal sealed partial class OcxJsonContext : JsonSerializerContext;
```

INCORRECT (each fails differently): `public abstract class Report` with `IgnoreUnrecognizedTypeDiscriminators`; omitting `AllowOutOfOrderMetadataProperties`; `public string Type { get; set; }` on a derived report; `GenerationMode = Serialization`; `[JsonSerializable(typeof(PushReport))]` only (loses the polymorphic base contract).

Caveat on the extension-data line: I verified extension data on the base catching unknown-tag payloads (probe H) but not mixed with all derived-type extension-data combinations; test that per union in the SDK's own suite.

### 7. Context layout: one per assembly, when to Combine

Evidence from the corpus: one context per concern or assembly, all `internal`: BenchmarkDotNet one `BdnJsonSerializerContext` (dotnet__BenchmarkDotNet@61ebda8a50ae:src/BenchmarkDotNet/Serialization/BdnJsonSerializerContext.cs:6-11, 8 attributes); testfx one context per extension assembly (microsoft__testfx@7226b0c74729:src/Platform/Microsoft.Testing.Extensions.AzureDevOpsReport/AzureDevOpsHistoryClientJsonContext.cs:8-10; `...CtrfReport/CtrfReportGenerator.cs:67-68`; `...GitHubActionsReport/GitHubActionsHistoryModels.cs:120-122`); GitVersion two contexts in two assemblies, each with its own options (GitTools__GitVersion@5057cdbcc177:src/GitVersion.App/CliSchema/CliSchemaDocument.cs:23-28 and src/GitVersion.Output/Serializer/VersionVariablesJsonContext.cs:5-9); testcontainers one tiny context for one type (testcontainers__testcontainers-dotnet@04cbb73fcc58:src/Testcontainers/Builders/SourceGenerationContext.cs:5-6, used at DockerConfig.cs:113). Azure.Core one context for error parsing (Azure__azure-sdk-for-net@32c48fc3d524:sdk/core/Azure.Core/src/ResponseErrorSourceGenerationContext.cs:14-23).

Decision: one `internal sealed partial class OcxJsonContext` in the SDK assembly registering all roots (including `Report` bases, `List<T>` roots used directly, and any non-DTO runtime type placed in an `object` member). Reasons: a single set of baked options (naming policy, ignore condition, out-of-order metadata) cannot drift; the unregistered-type error names the resolver. Split only when (a) types live in different assemblies, or (b) two payload families need different baked options (GitVersion's CLI-schema vs output contexts differ). `JsonTypeInfoResolver.Combine(A.Default, B.Default)` (and `JsonSerializerOptions.TypeInfoResolverChain`, .NET 8+, ordered, first non-null wins) is for when one `JsonSerializerOptions` must cover several contexts, e.g. a host app combining the SDK's types with its own; it inherits the Finding 4 trap, so the SDK itself must not use it internally. If the SDK's DTOs are public and consumers want to serialize them, expose nothing; consumers add their own context for their own types.

Missing registration surfaces as `NotSupportedException: JsonTypeInfo metadata for type 'NotRegistered' was not provided by TypeInfoResolver of type '[CtxA, CtxB]'. ... ensure that all root types passed to the serializer have been annotated with 'JsonSerializableAttribute', along with any types that might be serialized polymorphically.` (probe A), at call time, not build time. Therefore a wire-fixture round-trip test per registered root is part of the design.

### 8. IsAotCompatible / IsTrimmable and the analyzer IDs

`IsAotCompatible=true` "assigns a default of true to": `IsTrimmable`, `EnableTrimAnalyzer`, `EnableSingleFileAnalyzer`, `EnableAotAnalyzer` ([native-aot overview](https://learn.microsoft.com/en-us/dotnet/core/deploying/native-aot/), updated 2026-07-27). Minimum TFM: "target `net8.0` or later. This version is required for AOT analysis warnings" (trim: `net6.0`). The documented multi-target idiom:

```xml
<TargetFrameworks>netstandard2.0;net8.0;net10.0</TargetFrameworks>
<IsAotCompatible Condition="$([MSBuild]::IsTargetFrameworkCompatible('$(TargetFramework)', 'net8.0'))">true</IsAotCompatible>
```

The same shape is used in the corpus: openai (openai__openai-dotnet@1f0e8829acac:Directory.Build.props:45, condition `net7.0`; set false only for test/sample projects at :91-100), testfx (microsoft__testfx@7226b0c74729:src/Platform/Directory.Build.props:32-33), CliWrap (Tyrrrz__CliWrap@7dbc252fa773:CliWrap/CliWrap.csproj:9-11), command-line-api (dotnet__command-line-api@ba7fb9bd4443:src/System.CommandLine/System.CommandLine.csproj:14-17 sets `IsTrimmable`, `EnableTrimAnalyzer`, `IsAotCompatible`). Corpus counts: 11 repos set `IsAotCompatible`, 4 `IsTrimmable`, 1 `EnableTrimAnalyzer`, 0 `EnableAotAnalyzer` (exemplar-build-and-gates.md:28, :307); `EnableAotAnalyzer` is redundant when `IsAotCompatible` is set.

Analyzer IDs and what they mean here:

| ID | Source | Meaning for JSON |
|---|---|---|
| IL2026 | trim analyzer, `RequiresUnreferencedCode` ([doc](https://learn.microsoft.com/en-us/dotnet/core/deploying/trimming/trim-warnings/il2026)) | reflection-based `JsonSerializer` overloads, `JsonElement.Deserialize<T>()`, `ReadFromJsonAsync<T>()` |
| IL3050 | AOT analyzer, `RequiresDynamicCode` ([doc](https://learn.microsoft.com/en-us/dotnet/core/deploying/native-aot/warnings/il3050)) | same call sites; also non-generic `JsonStringEnumConverter` |
| IL2104 / IL3053 | publish-time, one per assembly from a PackageReference | "Assembly 'Newtonsoft.Json' produced trim/AOT warnings" |
| IL2125 / IL3058 | opt-in `VerifyReferenceTrimCompatibility` / `VerifyReferenceAotCompatibility` | referenced assembly lacks `IsTrimmable`/`IsAotCompatible` metadata (the latter metadata exists since .NET 10) |
| SYSLIB1034 | STJ generator | member annotated with non-generic `JsonStringEnumConverter` (observed text: "not supported in native AOT. Consider using the generic 'JsonStringEnumConverter<TEnum>'") |
| SYSLIB1221 | STJ generator | generator unavailable below C# 9 |
| SYSLIB1224 | STJ generator | `[JsonSerializable]` on something that is not a `JsonSerializerContext`-derived class ([list](https://learn.microsoft.com/en-us/dotnet/fundamentals/syslib-diagnostics/syslib1220-1229)) |
| SYSLIB1030 | STJ generator | type not supported, e.g. `int[,]`; register a converter ([doc](https://learn.microsoft.com/en-us/dotnet/fundamentals/syslib-diagnostics/syslib1030)) |
| NETSDK1210 | SDK | `IsAotCompatible`/`EnableAotAnalyzer` on a netstandard/net4x TFM ([breaking change](https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/8.0/trimming-unsupported-targetframework)) |

Severity control. Library build: IL2026/IL3050 are Roslyn analyzer diagnostics, so `.editorconfig` works (fixture `gates/`, exit 1 with 2x IL2026, 2x IL3050): `dotnet_diagnostic.IL2026.severity = error`. Publish-time ILLink/ILC warnings obey `NoWarn`, `WarningsAsErrors`, `TreatWarningsAsErrors`, and the separate `ILLinkTreatWarningsAsErrors` ([trimming-options](https://learn.microsoft.com/en-us/dotnet/core/deploying/trimming/trimming-options)); with `-p:TreatWarningsAsErrors=true` the red AOT publish failed (A1, exit 1) and the green one succeeded (A3). By default, "trim analysis produces at most one warning for each assembly that comes from a PackageReference", so `TrimmerSingleWarn=false` is needed to see detail.

Assembly-level trim claims are not enough: the trimming guide says to use BOTH `IsTrimmable` and "a trimming test app that uses the library" with `PublishTrimmed` and `<TrimmerRootAssembly Include="MyLibrary" />`, because the library build cannot see dependency implementations ([prepare-libraries-for-trimming](https://learn.microsoft.com/en-us/dotnet/core/deploying/trimming/prepare-libraries-for-trimming)). The corpus's strongest example is xunit: `.aot` projects across `XunitAotRuntimeIdentifiers=win-x86;win-x64;win-arm64;linux-x64;linux-arm64;osx-x64;osx-arm64` (xunit__xunit@0c7aa4991fa3:src/Directory.Build.props:34, `IsAotCompatible` at :23, `PublishAot` at :28, `IsTrimmable` at :71).

### 9. Should a spawn-a-process-and-parse-JSON library claim AOT compatibility

Yes. Evidence: fixture `probe-f` (library `IsAotCompatible=true` containing `Process.Start`, `ProcessStartInfo.ArgumentList`, `StandardOutput.ReadToEndAsync`, `WaitForExitAsync`, and source-generated `Deserialize(stdout, Ctx.Default.VersionReport)`) built and published with `-r linux-x64 -p:TreatWarningsAsErrors=true`: exit 0, zero IL warnings, binary printed `0.6.5 zz` (E1). The only reflection in such a library is JSON, so the claim costs one attribute and is cheap to keep true. The cost of NOT claiming: a consumer publishing with `PublishAot` gets IL2104/IL3053 for the whole assembly (Finding 12 shows this for Newtonsoft) and, without source generation, a runtime crash. Preconditions before the claim is made (otherwise the metadata lies): a `PublishAot` smoke app run in CI, no warning suppressions without a written justification, no netstandard2.0-only build. The Azure.Core exception (`AotAnalyzersOptOut=true`, Azure__azure-sdk-for-net@32c48fc3d524:sdk/core/Azure.Core/src/Azure.Core.csproj:15) is a documented opt-out for a huge legacy surface; it is not a model for a new SDK.

### 10. netstandard2.0, net8.0 floor, package versions, LangVersion

All measured with `$FX/verify-tfm.sh` (SDK 10.0.401 unless noted):

| Fixture | Result |
|---|---|
| `tfm/ns2-default`: netstandard2.0, default LangVersion, `System.Text.Json` 10.0.12, `IsAotCompatible=true` | exit 1: `SYSLIB1221: The System.Text.Json source generator is not available in C# 7.3. Please use language version 9.0 or greater.` plus CS0534 noise; also `NETSDK1210` warning |
| `tfm/ns2-fixed`: `LangVersion=latest`, `Nullable=enable`, no `IsAotCompatible` | exit 0 |
| `tfm/multi`: `netstandard2.0;net8.0;net10.0`, conditional `IsAotCompatible`, a deliberate reflective call | exit 0 (warnings); IL2026/IL3050 appear for net8.0 and net10.0 only, none for netstandard2.0, no NETSDK1210 |
| `tfm/net8-oo-red`: net8.0, `AllowOutOfOrderMetadataProperties` in `[JsonSourceGenerationOptions]`, no package | exit 1, CS0246 (property is .NET 9) |
| `tfm/net8-oo-green`: same plus `PackageReference System.Text.Json 10.0.12` | exit 0 |
| `tfm/net8-sdk8`: SDK 8.0.425 pinned, net8.0, `IsAotCompatible=true`, polymorphic context without the .NET 9 option | exit 0 |

MSBuild evaluation (`dotnet msbuild gates/green/OcxJson.csproj -p:TargetFramework=X -getProperty:...`, section M1): for net10.0 and net8.0 `IsAotCompatible`, `IsTrimmable`, `EnableAotAnalyzer`, `EnableTrimAnalyzer` all `true`; for netstandard2.0 `IsAotCompatible`/`IsTrimmable` evaluate `true` but `EnableAotAnalyzer`/`EnableTrimAnalyzer` evaluate `false`. The unconditional property is therefore harmless but misleading in multi-target libs, and a netstandard-only project gets NETSDK1210 ("IsAotCompatible and EnableAotAnalyzer are not supported for the target framework").

Package facts: `System.Text.Json` latest stable is 10.0.12 (2026-09-08); netstandard2.0 depends on Microsoft.Bcl.AsyncInterfaces, System.Buffers, System.IO.Pipelines, System.Memory, System.Runtime.CompilerServices.Unsafe, System.Text.Encodings.Web, System.Threading.Tasks.Extensions; net8.0/net9.0 depend on System.IO.Pipelines and System.Text.Encodings.Web; net10.0 has none ([NuGet page](https://www.nuget.org/packages/System.Text.Json/)). Versions 8.0.0 through 8.0.4 are affected by CVE-2024-43485 (denial of service), patched in 8.0.5 ([GHSA-8g4q-xg66-9fp4](https://github.com/advisories/GHSA-8g4q-xg66-9fp4)), so a floor pin must be >= 8.0.5 and in practice the current 10.0.x. The generator version that runs is the one shipped in the referenced `System.Text.Json` package when present, which is why the net8.0+package row gains .NET 9 options.

Implication for the open netstandard2.0 question (language-shape audit, other subtopic): JSON does not force netstandard2.0 out, but keeping it forces `LangVersion >= 9`, the package, the conditional property, and loses trim/AOT analysis for that asset; for net8.0+ consumers the `net8.0`+ asset is selected, so they still get analyzed code. If the SDK targets net8.0+ only, it needs no package for .NET 8 features but must add `System.Text.Json` >= 9 to use `AllowOutOfOrderMetadataProperties` on net8.0.

### 11. Enums under source generation

- Non-generic `[JsonConverter(typeof(JsonStringEnumConverter))]`: build `warning SYSLIB1034` plus `IL3050`; runtime under Native AOT `NotSupportedException: 'System.Text.Json.Serialization.Converters.EnumConverter`1[Status]' is missing native code or metadata` (probe E / N1). The docs: "The non-generic JsonStringEnumConverter type is not supported by the Native AOT runtime".
- `[JsonConverter(typeof(JsonStringEnumConverter<Status2>))]` or `[JsonSourceGenerationOptions(UseStringEnumConverter = true)]`: works under AOT (`stj-generic-enum: OK R2 { Name = a, S = Failed }`). An unknown wire value still throws: `JsonException: The JSON value could not be converted to R2. Path: $.S` (N1). ocx enums are open, so closed C# enums are only safe for enums ocx declares closed; open ones need a string-backed type or custom converter (sibling subtopic).
- `JsonStringEnumMemberName` custom names exist from .NET 9 ([source-generation](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/source-generation)).

### 12. Newtonsoft.Json: reject

Reasons, each measured or sourced:

1. Under `PublishAot` a project referencing Newtonsoft.Json 13.0.3 published with `warning IL2104` (assembly produced trim warnings) and `warning IL3053` (assembly produced AOT analysis warnings) (N1), and the 13 MB binary compared with 2.3 MB for the green app (not like-for-like: different test programs, but the direction is the usual one).
2. It worked at runtime for a trivial record (`newtonsoft-deserialize: OK R { Name = a, S = Ok }`), which is exactly why it is dangerous: it passes a smoke test and fails on a real type graph. Treat as unsupported, not as proven broken.
3. It has no source generator; the docs' migration table notes behaviour differences an agent will silently inherit (case-insensitive matching by default in Newtonsoft; STJ is case-sensitive by default) ([migrate-from-newtonsoft](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/migrate-from-newtonsoft)).
4. Corpus: 15 repos use STJ (463 references), 5 Newtonsoft (72) (exemplar-language-shape.md:585); Stripe keeps Newtonsoft for legacy reasons (stripe__stripe-dotnet@dbdca6ba5efc:src/Stripe.net/Stripe.net.csproj:48) and Octokit its own `SimpleJsonSerializer` (octokit__octokit.net@7fa5b0fe4a18:Octokit/Http/JsonHttpPipeline.cs:16). They are legacy decisions, not a pattern to copy. A zero-dependency SDK (python-sdk-digest.md row 3) argues for the BCL serializer.

A third-party statement from a search result that Newtonsoft is "AOT-incompatible" is NOT used as evidence: no Newtonsoft maintainer statement was found.

### 13. Why the vendor SDKs mostly do not source-generate, and what the corpus does

Corpus table (exemplar-language-shape.md section 3.8): `[JsonSerializable]` appears in 5 repos (GitVersion 5, BenchmarkDotNet 8, testfx 7, azure 9, testcontainers 1; 30 attributes) while 12 set AOT/trim flags, so AOT-flagged does not imply source-generated.

Correction to the commission's "0/5 vendor SDKs": Azure.Core does have a context (ResponseErrorSourceGenerationContext.cs:14-23, `#if NET6_0_OR_GREATER` guarded, used at Pipeline/Internal/DefaultRequestFailedDetailsParser.cs:35-36) but opts out of AOT analyzers (Azure.Core.csproj:15). The other four:

| SDK | Mechanism | AOT flags | Evidence |
|---|---|---|---|
| openai-dotnet | generated `*.Serialization.cs` with `Utf8JsonWriter`/`JsonDocument` per model, no contexts | `IsAotCompatible` true on libraries (Directory.Build.props:45) | openai__openai-dotnet@1f0e8829acac:OpenAI.Responses/src/Generated/Models/FunctionTool.Serialization.cs:94 |
| anthropic-sdk-csharp | reflection-based STJ with shared options and custom converters | none (`git grep IsAotCompatible` empty) | anthropics__anthropic-sdk-csharp@ae16e5933f39:src/Anthropic/Core/ApiEnum.cs:50, src/Anthropic/Helpers/SchemaInference.cs:22 |
| stripe-dotnet | Newtonsoft.Json | none | Stripe.net.csproj:48 |
| octokit.net | custom SimpleJson | none | JsonHttpPipeline.cs:16 |

Inference (no source states the reasons): these vendors ship hundreds of polymorphic, evolving models produced by a code generator that already emits its own serialization, so a hand-curated `[JsonSerializable]` list is the wrong tool for them. That reasoning does not transfer to the ocx SDK, whose roots are enumerable from `reports.json` and where generating the context list is trivial. Anthropic is the anti-example: no AOT claim and reflection overloads mean a `PublishAot` consumer crashes the same way as fixture `red/`.

### 14. .NET 11 / C# 15 delta

Flagged because .NET 11 is at RC1 (GA November 2026); nothing here is a requirement for the .NET 10 LTS target.

- Closed hierarchies: "Starting in .NET 11 ... infer derived types from a C# 15 `closed` hierarchy" via `[JsonPolymorphic(InferClosedTypePolymorphism = true)]` or `JsonSourceGenerationOptions.InferClosedTypePolymorphism`; explicit `[JsonDerivedType]` replaces inference; discriminator defaults to `$type` with the simple type name ([polymorphism](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/polymorphism)). Verified on SDK 11.0.100-rc.1.26425.128, `net11.0`, `LangVersion=preview` (`$FX/probe-g`): `{"$type":"Circle","R":2}` and `Square` round-trip through a generated context with `IsAotCompatible=true`, no warnings.
- Source-generated `[JsonInclude]` on `private`/`internal`/`protected` members and inaccessible `[JsonConstructor]` constructors; on .NET 10 and earlier it throws `NotSupportedException` ([source-generation-modes](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/source-generation-modes)).
- New generator diagnostics SYSLIB1227/1228 (C# union types) and SYSLIB1229 (open generic derived types) ([list](https://learn.microsoft.com/en-us/dotnet/fundamentals/syslib-diagnostics/syslib1220-1229)).
- `JsonSourceGenerationOptionsAttribute` also lists `AllowDuplicateProperties`, `RespectNullableAnnotations`, `RespectRequiredConstructorParameters`, `TypeClassifiers`, `PreferredObjectCreationHandling` ([API page](https://learn.microsoft.com/en-us/dotnet/api/system.text.json.serialization.jsonsourcegenerationoptionsattribute?view=net-10.0), rendered for the net-11.0-pp moniker); which of these exist on .NET 10 was not individually verified.

### 15. Verified on the toolchain

Fixture root `$FX`. Toolchain: `run.sh` with SDK 10.0.401 (global.json in the fixtures parent), 8.0.425 for `tfm/net8-sdk8`, 11.0.100-rc.1.26425.128 for `probe-g`. Native AOT: host has no clang or zlib headers; `$FX/shim/clang` is a one-line wrapper that execs `/usr/sbin/gcc` (gcc 15.2.1) and is put first on PATH; the ILCompiler 10.0.12 packages are used from the NuGet cache. Linux x64 only.

| ID | Fixture and command | RED observed | GREEN twin observed |
|---|---|---|---|
| G1/G2 | `cd $FX/gates/red && run.sh dotnet build -c Release` (editorconfig sets IL2026, IL3050, SYSLIB1034 to error, `IsAotCompatible=true`) | `exit=1`, `2 error IL2026`, `2 error IL3050` (reflection `Deserialize<VersionReport>`) | `gates/green`: `exit=0`, no diagnostics |
| A1/A3 | `cd $FX/red/app && PATH=$FX/shim:$PATH run.sh dotnet publish -c Release -r linux-x64 -o out -p:TreatWarningsAsErrors=true` | `exit=1`, `1 error IL2026`, `1 error IL3050` | `green/app` same command: `exit=0`; `./out/App` prints `version=0.6.5 commit=abc`, `push -> PushReport sha256:aa`, `out-of-order -> InstallReport 3`, `unknown tag -> Report`, `{"type":"install","path":"/y","file_count":2}`, `exit=0` |
| A2 | same publish without `-p:TreatWarningsAsErrors` | `exit=0`, `2 warning IL2026`, `2 warning IL3050`; `./out/App` `exit=134`: `InvalidOperationException: Reflection-based serialization has been disabled ...` | n/a (A3) |
| T1 | `red-trim/app` publish `PublishTrimmed=true SelfContained=true -r linux-x64` | `exit=0`, `2 warning IL2026`, `1 warning IL3050`; run `exit=134`, same exception | A3 |
| E1 | `probe-f/app` publish `-p:TreatWarningsAsErrors=true` (lib spawns `/bin/sh -c 'echo {...}'`, parses with context) | none | `exit=0`, 0 diagnostics, prints `0.6.5 zz` |
| N1 | `probe-e` publish `PublishAot`; Newtonsoft + non-generic enum converter | `IL2104`, 3x `IL3050`, `IL3053`, `SYSLIB1034`; `stj-nongeneric-enum: NotSupportedException ... missing native code or metadata` | `stj-generic-enum: OK R2 { Name = a, S = Failed }` (same binary) |
| P2 | `probe-b`: `Serialize(v, viaResolverOptions)` / `Deserialize<Alpha>(json, viaResolverOptions)` | `{"FirstName":"x"}` and `Alpha { FirstName =  }`; IL2026+IL3050 at Program.cs lines 16, 17, 18, 20 | `Serialize(v, Ctx.Default.Alpha)` `{"first_name":"x"}`, `Deserialize(json, Ctx.Default.Alpha)` `Alpha { FirstName = q }`, no warning |
| P1 | `probe-a` `Deserialize("""{"N":4,"type":"a"}""", PolyStrict.Default.Poly)` | `NotSupportedException: ... must specify a type discriminator`; unknown tag `JsonException: Read unrecognized type discriminator id 'zzz'`; `FastOnly` deserialize `InvalidOperationException ... did not provide property metadata` | A3: out-of-order `InstallReport 3`, unknown tag `Report` |
| tfm | `$FX/verify-tfm.sh` | `ns2-default` exit 1 `SYSLIB1221`; `net8-oo-red` exit 1 `CS0246` | `ns2-fixed` exit 0; `net8-oo-green` exit 0 |
| G3 | `cd $FX && rg -n --glob '*.cs' -e 'JsonSerializer\.(Serialize\|Deserialize)\w*(<[^>]*>)?\(' gates/red \| rg -v -e '\.Default\.' -e 'TypeInfo'` | `gates/red/Models.cs:8: JsonSerializer.Deserialize<VersionReport>(json);` rg-exit 0 | `gates/green` rg-exit 1 (no match) |
| halluc | `$FX/verify-halluc.sh` | `halluc/red` exit 1: `CS0117 JsonKnownNamingPolicy ... 'SnakeCase'`, `CS0117 JsonSourceGenerationMode ... 'FastPath'`, `CS0246 TypeInfoName`, generator failure CS8785; `halluc/ext-red` exit 0 with 3x IL2026 + 3x IL3050 on `JsonElement.Deserialize<T>`, `JsonNode.Deserialize<T>`, `ReadFromJsonAsync<T>`; extended rg gate matches all three lines | `halluc/green` exit 0, no diagnostics, rg-exit 1 |
| M1 | `run.sh dotnet msbuild gates/green/OcxJson.csproj -p:TargetFramework=netstandard2.0 -getProperty:EnableAotAnalyzer ...` | netstandard2.0: `EnableAotAnalyzer false`, `EnableTrimAnalyzer false`, `IsAotCompatible true` | net10.0/net8.0: all four `true` |
| H1 | `probe-h` | abstract base + ignore: `NotSupportedException`; `ClashA` with property `Type`: `InvalidOperationException ... conflicts with an existing metadata property name` | non-abstract base with `[JsonExtensionData]`: `unknown-keeps-extra: OK Node2 extra=a,b`; nested `Leaf,Node` |
| .NET 11 | `cd $FX/probe-g && run.sh dotnet run -c Release` (SDK 11.0.100-rc.1.26425.128) | n/a | `{"$type":"Circle","R":2}` then `Square` |

Red/green pairs watched: 12 (G1/G2, A1/A3, A2/A3, N1 enum, P2, P1 out-of-order, P1 unknown tag, ns2, net8-oo, G3, halluc, halluc ext).
Not run: Native AOT on Windows, macOS, arm64 (no host or cross toolchain here); `ILLinkTreatWarningsAsErrors` isolated from `TreatWarningsAsErrors`; the `WarningsAsErrors` list form for publish-time warnings.

## Normative guidance candidates

Numbering is stable for citation. Verification commands assume sources under `src/` and tests under `tests/`; run from the repo root.

**R1. Every serializer call passes a `JsonTypeInfo<T>` or a `JsonSerializerContext`; no reflection overloads, no extension-method forms.**
Rationale: reflection overloads are the single cause of the publish-green/run-red failure (IL2026/IL3050, runtime `InvalidOperationException`).
Verify: (a) analyzer: `.editorconfig` with `dotnet_diagnostic.IL2026.severity = error` and `dotnet_diagnostic.IL3050.severity = error` under `[*.cs]`, `IsAotCompatible=true` on the library, then `dotnet build -c Release` exits 0. (b) rg gate must print nothing: `rg -n -g '*.cs' -e '\.(Serialize|Deserialize|SerializeAsync|DeserializeAsync|SerializeToUtf8Bytes|SerializeToElement|SerializeToNode|ReadFromJsonAsync|GetFromJsonAsync|PostAsJsonAsync|PutAsJsonAsync)(<[^>]*>)?\(' src | rg -v -e 'Default\.' -e 'TypeInfo'` (multi-line calls whose context argument is on another line need a human read; the analyzer is authoritative).

**R2. Exactly one `internal sealed partial class OcxJsonContext : JsonSerializerContext` per assembly registers every wire root; add a second context only for another assembly or for a payload family needing different baked options.**
Rationale: one place for baked options and registrations; unregistered types fail at runtime only.
Verify: `rg -c -g '*.cs' -e ': JsonSerializerContext' src` lists at most one hit per project directory; `rg -n -g '*.cs' -e 'public (sealed )?partial class \w+ : JsonSerializerContext' src` prints nothing (contexts are internal). Reading heuristic: every type returned by a public method has a `[JsonSerializable]` line or is reachable from one; the wire-fixture round-trip test (R6) is the enforcer.

**R3. Configure serialization only through `[JsonSourceGenerationOptions]` on the context (`PropertyNamingPolicy = JsonKnownNamingPolicy.SnakeCaseLower`, `AllowOutOfOrderMetadataProperties = true`, `DefaultIgnoreCondition`); never build `new JsonSerializerOptions { TypeInfoResolver = ... }` or `JsonTypeInfoResolver.Combine` inside the SDK.**
Rationale: a context used as a resolver in foreign options silently loses its naming policy (empty typed results, no error).
Verify: `rg -n -g '*.cs' -e 'new JsonSerializerOptions' -e 'TypeInfoResolver' -e 'JsonTypeInfoResolver\.Combine' -e 'JsonSerializerOptions\.Default' src` prints nothing (allowed exception: a single `new OcxJsonContext(new JsonSerializerOptions(Default.Options) { ... })` property, GitVersion style, reviewed by name). Test: a unit test deserializing a snake_case fixture through every public entry point asserts non-empty fields.

**R4. Leave `GenerationMode` unset (default) or `Metadata`; never `Serialization` on any type that is deserialized or polymorphic.**
Rationale: fast path has no deserialization and failed on a polymorphic base; the SDK is read-mostly.
Verify: `rg -n -g '*.cs' -e 'JsonSourceGenerationMode\.Serialization' -e 'GenerationMode *= *JsonSourceGenerationMode\.Serialization' src` prints nothing.

**R5. Open unions use `[JsonPolymorphic(TypeDiscriminatorPropertyName = "type", IgnoreUnrecognizedTypeDiscriminators = true)]` on a non-abstract base that carries `[JsonExtensionData] Dictionary<string, JsonElement>? Extra`, with `AllowOutOfOrderMetadataProperties = true` on the context; derived types must not declare a member that serializes to `type`.**
Rationale: unknown tags must degrade to the base without losing payload; ocx does not promise tag position; a `type` property clashes at first use.
Verify: `rg -n -g '*.cs' -A4 '\[JsonPolymorphic' src` and read that each has `TypeDiscriminatorPropertyName`, `IgnoreUnrecognizedTypeDiscriminators = true`, a class declaration without `abstract` on the line after the attribute stack, and `JsonExtensionData` on the base; mechanical part: `rg -n -g '*.cs' -A6 '\[JsonPolymorphic' src | rg 'abstract'` prints nothing. Test per union: known tag, unknown tag (expect base type with `Extra` populated), tag not first.

**R6. The repo contains a `PublishAot` smoke app that references the library, sets `<TrimmerRootAssembly>`, publishes with `TreatWarningsAsErrors=true`, runs the binary on a wire fixture and asserts output, and CI runs it per RID (at least linux-x64, win-x64, osx-arm64; add linux-arm64, win-arm64).**
Rationale: analyzers miss missing registrations; the binary is the only complete proof; AOT is per-RID (xunit tests 7 RIDs).
Verify: `rg -l -g '*.csproj' '<PublishAot>true</PublishAot>' tests samples` returns at least one project; CI workflow matrix lists the RIDs: `rg -n -e 'linux-x64' -e 'win-x64' -e 'osx-arm64' .github/workflows`. Tests project sets `<JsonSerializerIsReflectionEnabledByDefault>false</JsonSerializerIsReflectionEnabledByDefault>`: `rg -n 'JsonSerializerIsReflectionEnabledByDefault' tests`.

**R7. Set `IsAotCompatible` on the library only through the TFM-conditional form; do not set `PublishTrimmed`/`PublishAot` on a library or on netstandard targets.**
Rationale: the analyzers need a net8.0+ asset; unconditional use on netstandard2.0-only warns NETSDK1210 and is a no-op.
Verify: `rg -n -g '*.csproj' -g '*.props' 'IsAotCompatible' src Directory.Build.props` shows `Condition="$([MSBuild]::IsTargetFrameworkCompatible('$(TargetFramework)', 'net8.0'))"`; MSBuild check: `dotnet msbuild src/Ocx/Ocx.csproj -p:TargetFramework=net10.0 -getProperty:EnableAotAnalyzer -getProperty:EnableTrimAnalyzer` prints both `true`. `NETSDK1210` must be absent from build output: `dotnet build -c Release 2>&1 | rg -c NETSDK1210` prints 0.

**R8. Enum string conversion uses `JsonStringEnumConverter<TEnum>` or `UseStringEnumConverter = true`; never the non-generic `JsonStringEnumConverter`. Closed C# enums only for wire enums ocx declares closed.**
Rationale: non-generic converter needs dynamic code (SYSLIB1034, runtime `NotSupportedException` under AOT); unknown values throw `JsonException`.
Verify: `.editorconfig` `dotnet_diagnostic.SYSLIB1034.severity = error`; `rg -n -g '*.cs' 'JsonStringEnumConverter(?!<)' --pcre2 src` prints nothing.

**R9. No Newtonsoft.Json, no `System.Web.Script.Serialization`, no `DataContractJsonSerializer`, no `BinaryFormatter`-era serializers in SDK code or its dependency graph.**
Rationale: IL2104/IL3053/IL3050 under PublishAot, no source generator, and it works on trivial types, hiding the failure.
Verify: `rg -n -g '*.cs' -e 'Newtonsoft' -e 'JsonConvert\.' -e 'JObject' -e 'JToken' -e 'DataContractJsonSerializer' -e 'JavaScriptSerializer' src tests` prints nothing; `rg -n -g '*.csproj' -g 'Directory.Packages.props' -i 'Newtonsoft' .` prints nothing; `dotnet list src/Ocx/Ocx.csproj package --include-transitive | rg -i newtonsoft` prints nothing.

**R10. On any TFM below net9.0 or on netstandard2.0, reference `System.Text.Json` >= 10.0.x explicitly (never below 8.0.5), and set `LangVersion` to `latest` (>= 9).**
Rationale: the generator version comes from the package; .NET 9 options (`AllowOutOfOrderMetadataProperties`) are CS0246 on net8.0 without it; SYSLIB1221 on the 7.3 default; CVE-2024-43485 below 8.0.5.
Verify: `rg -n -g '*.csproj' -g 'Directory.Packages.props' 'System.Text.Json' .` shows a version >= 10.0 (conditioned on those TFMs); `dotnet list package --vulnerable --include-transitive` reports none; `dotnet build -c Release 2>&1 | rg -c SYSLIB1221` prints 0.

**R11. No `[UnconditionalSuppressMessage]`, `#pragma warning disable IL2026/IL3050`, `<NoWarn>` for IL*/SYSLIB1* in the SDK without a one-line justification comment citing why the reflection target is preserved.**
Rationale: suppression moves the failure to the consumer's runtime; the docs call out invalid justifications for serializers.
Verify: `rg -n -g '*.cs' -g '*.csproj' -g '*.props' -e 'UnconditionalSuppressMessage' -e 'disable +(IL2026|IL3050|IL2[0-9]{3}|IL3[0-9]{3})' -e '<NoWarn>.*(IL[0-9]+|SYSLIB1)' .` prints nothing, or each hit has a justification on the preceding line.

**R12. Opaque ocx sub-objects are `JsonElement` (or `JsonObject` kept read-only), not `object` and not `Dictionary<string, object>`.**
Rationale: `JsonElement` needs no registration and no reflection; `object` members need registered runtime types and often deserialize to `JsonElement` anyway.
Verify: `rg -n -g '*.cs' -e 'Dictionary<string, *object' -e '\bobject\??\s+\w+\s*\{ *get' src` prints nothing.

**R13. Serializer exceptions are mapped deliberately: `JsonException` is wire skew; `NotSupportedException` / `InvalidOperationException` thrown by the serializer are SDK bugs (unregistered type, fast-path-only context, discriminator clash) and must not be swallowed as parse errors.**
Rationale: probes show registration and contract errors surface as `NotSupportedException`/`InvalidOperationException`, not `JsonException`.
Verify: `rg -n -g '*.cs' -e 'catch *\((System\.)?Exception' -e 'catch *\{' src` near serializer calls prints nothing; reading heuristic: only `catch (JsonException)` wraps `JsonSerializer.*` calls.

**R14. Before relying on any .NET 9+/11 serializer option, check the TFM and package floor; treat .NET 11 RC1 features (`InferClosedTypePolymorphism`, non-public `[JsonInclude]`) as unusable until GA.**
Rationale: they do not compile or throw on .NET 10.
Verify: `rg -n -g '*.cs' -e 'InferClosedTypePolymorphism' -e 'closed class' src` prints nothing before GA; `global.json` pins 10.0.x: `rg -n '"version"' global.json`.

## AI-agent angle

What an LLM characteristically gets wrong, each with the smallest mechanical check:

| # | Characteristic error | Why it compiles | Mechanical check |
|---|---|---|---|
| 1 | `JsonSerializer.Deserialize<T>(json)` or `Deserialize<T>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })` copied from 2019-2023 tutorials | valid API; only a warning | IL2026/IL3050 = error; R1 rg gate |
| 2 | Registers a context but then calls `Deserialize<T>(json, options)` with `options.TypeInfoResolver = Ctx.Default` ("belt and braces") | valid, warns only, and silently drops `[JsonSourceGenerationOptions]` | R3 rg gate (`TypeInfoResolver`); snake_case round-trip test |
| 3 | Reaches for `Newtonsoft.Json` (`JsonConvert.DeserializeObject`, `[JsonProperty]`, `JObject`) as the default | valid; even runs under AOT on simple types | R9 rg gate |
| 4 | `[JsonConverter(typeof(JsonStringEnumConverter))]` | warns SYSLIB1034 only | SYSLIB1034 = error; R8 rg `--pcre2` |
| 5 | Hallucinated names: `JsonKnownNamingPolicy.SnakeCase`, `JsonNamingPolicy.SnakeCase`, `JsonSourceGenerationMode.FastPath`/`Fast`, `[JsonSerializable(..., TypeInfoName = ...)]`, `JsonSerializerContext.Create` | none compile (CS0117, CS0246, CS8785) | `dotnet build`; real names: `SnakeCaseLower`, `Serialization`, `TypeInfoPropertyName` (halluc fixture) |
| 6 | Forgets to register a type: polymorphic derived only, `List<T>` roots, runtime types behind `object` | compiles; `NotSupportedException` at the first call | test project with `JsonSerializerIsReflectionEnabledByDefault=false` plus a fixture round-trip per root (R6) |
| 7 | Marks the base `abstract` for a union and adds `IgnoreUnrecognizedTypeDiscriminators` expecting a fallback | compiles; unknown tag throws `NotSupportedException` | unit test with an unknown tag (R5) |
| 8 | Names a derived member `Type` under a snake_case policy while also using discriminator `type` | compiles; throws on first use | unit test per union; R5 reading heuristic |
| 9 | `GenerationMode = JsonSourceGenerationMode.Serialization` "for performance" on a type that is also deserialized | compiles | R4 rg gate; deserialization test |
| 10 | Sets `IsAotCompatible`/`IsTrimmable`/`PublishAot` unconditionally in a netstandard2.0 multi-target or sets `PublishTrimmed` on a library | builds; NETSDK1210 or no analysis | R7 MSBuild property check |
| 11 | netstandard2.0 library without the package or with default LangVersion 7.3 | CS0534 cascade is misleading; root cause is SYSLIB1221 | `dotnet build 2>&1 | rg SYSLIB1221` (R10) |
| 12 | `JsonElement.Deserialize<T>()`, `JsonNode.Deserialize<T>()`, `HttpContent.ReadFromJsonAsync<T>()` as "the modern API" | valid; IL2026/IL3050 | R1 rg gate with extension names |
| 13 | Uses `AllowOutOfOrderMetadataProperties` on net8.0 without raising the package | CS0246 only on net8.0, so passes a net10-only local check | build all TFMs: `dotnet build -c Release` on the multi-target project (verify-tfm `net8-oo-red`) |
| 14 | Treats `PublishAot` success (exit 0) as proof | publish succeeds with warnings; crash is at run time | run the binary in the smoke app (R6) |
| 15 | Suppresses IL2026 with `[UnconditionalSuppressMessage]` to make the warning go away | removes the signal and the safety | R11 rg gate |
| 16 | Applies .NET Framework-era advice: `DataContractJsonSerializer`, `JavaScriptSerializer`, `Install-Package Newtonsoft.Json`, `System.Web.Extensions` | valid on older targets | R9 rg gate |

Note that Microsoft itself publishes an agent skill for this class of work (`dotnet-aot-compat` in dotnet/skills, covering IL2070/IL2067/IL2072/IL2026/IL3050 and enabling `IsAotCompatible`); only its summary page was readable here, so its rules were not audited.

## Contested / evolving

- Fast-path (`Serialization`) value: the docs claim throughput benefits, the 2023 benchmark in dotnet/runtime#55043 shows default source-gen deserialization roughly equal to reflection, and fast-path deserialization remains unimplemented (open, Future milestone, last activity 2025-08-24). Trend: no change expected soon; the SDK ignores it.
- Docs inconsistency on polymorphism and fast path: the modes table ticks `JsonPolymorphic`/`JsonDerivedType`, the same page's final bullet says polymorphism is metadata-mode only, and the probe failed in fast-path-only mode. Trend: expect a docs fix; behave as if unsupported.
- Whether vendor SDKs will adopt contexts: openai reaches AOT through generated serialization, anthropic does not claim AOT, Azure.Core opts out. Trend (as of 2026-10): AOT-compatibility claims are growing (11 of 35 corpus repos) but contexts stay rare (5); do not read that as evidence the pattern is optional for a CLI-wrapper SDK.
- `IsAotCompatible` on libraries whose dependencies lack the metadata: the `VerifyReference*` checks (IL2125, IL3058) are opt-in because "the warning can be noisy"; the `IsAotCompatible` assembly metadata only exists since .NET 10 (2025-11), so the signal is incomplete until dependencies republish. Trend: expect more repos to switch it on.
- Recommended access path `JsonSerializerContext` instance vs `JsonTypeInfo<T>` vs options: Microsoft documents all three as equivalent; measured behaviour differs (Finding 3/4). Trend: guidance in docs is likely to catch up; until then follow the stricter rule here.
- .NET 11 / C# 15: `closed` hierarchies with `InferClosedTypePolymorphism`, non-public `[JsonInclude]` in source gen, C# union support in the generator (SYSLIB1227/1228). Still RC1 on 2026-10-10; GA November 2026. Trend: closed hierarchies will likely replace manually listed `[JsonDerivedType]` for closed unions, but only on net11.0+.
- Newtonsoft.Json: no maintainer statement on Native AOT was found; position here rests on measured warnings (IL2104/IL3053) and absence of a source generator, not on an official "unsupported" declaration.
- Reflection fallback: .NET 7 removed implicit fallback (breaking change, 2022-09); the `EnableSourceGenReflectionFallback` AppContext switch still exists as an app-level opt-in. Trend: stable.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/source-generation | How to use STJ source generation (context, overloads, options, Combine, TypeInfoResolverChain, disable reflection, enums) | updated 2026-03-30, .NET 8-11 | Primary spec for every API named here |
| https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/source-generation-modes | Metadata vs serialization-optimization modes, fast-path option/attribute tables, non-public members | updated 2026-09-29 | Fast-path limits; .NET 11 `[JsonInclude]` delta |
| https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/polymorphism | `[JsonPolymorphic]`, `[JsonDerivedType]`, discriminators, ordering, closed hierarchies, contract model | updated 2026-09-29, .NET 7-11 | Union semantics; source-gen restriction sentence |
| https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/reflection-vs-source-generation | Choosing reflection vs source generation, feature comparison | updated 2026-09-29 | Canonical statement of why source gen is required for AOT |
| https://learn.microsoft.com/en-us/dotnet/core/deploying/native-aot/ | Native AOT overview: prerequisites, `IsAotCompatible` analyzer section, limitations, RIDs | updated 2026-07-27 | Property expansion list, TFM requirement, `VerifyReferenceAotCompatibility`, clang/zlib prerequisites |
| https://learn.microsoft.com/en-us/dotnet/core/deploying/trimming/prepare-libraries-for-trimming | Library trimming guide: `IsTrimmable`, test app with `TrimmerRootAssembly`, recommendations | updated 2026-01-08 | Library-author checklist; names reflection serializers explicitly |
| https://learn.microsoft.com/en-us/dotnet/core/deploying/trimming/trimming-options | MSBuild trimming options: `TrimmerSingleWarn`, `ILLinkTreatWarningsAsErrors`, warning-code handling | updated 2026-08-24 | How trim warnings become errors |
| https://learn.microsoft.com/en-us/dotnet/core/deploying/native-aot/warnings/il3050 | IL3050 reference | updated 2025-12-03 | Definition of the AOT analyzer warning |
| https://learn.microsoft.com/en-us/dotnet/core/deploying/trimming/trim-warnings/il2026 | IL2026 reference | updated 2025-12-03 | Definition of the trim analyzer warning |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/sdk/8.0/trimming-unsupported-targetframework | .NET 8 SDK breaking change: trimming settings on netstandard/net4x | 2023-08, SDK 8 | Origin of NETSDK1210 and the conditional-property idiom |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/serialization/7.0/reflection-fallback | .NET 7 breaking change: no implicit reflection fallback with options | 2022-09, .NET 7 | Explains runtime `NotSupportedException` for unregistered types |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/syslib-diagnostics/syslib1220-1229 | SYSLIB1220-1229 generator diagnostics | updated 2026-07-07 | IDs for SYSLIB1224/1227-1229 |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/syslib-diagnostics/syslib1030 | SYSLIB1030 and suppression guidance | 2021, updated 2024-03 | Unsupported-type diagnostic and the NoWarn pattern |
| https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/configure-options | Reusing/copying `JsonSerializerOptions`, web defaults | updated 2026-03-30 | Options-reuse guidance and `new JsonSerializerOptions(existing)` |
| https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/migrate-from-newtonsoft | Newtonsoft to STJ behaviour differences | updated 2026-03-30 | Case-sensitivity, unmapped member and required differences |
| https://learn.microsoft.com/en-us/dotnet/api/system.text.json.serialization.jsonsourcegenerationoptionsattribute?view=net-10.0 | API reference for the options attribute (net-11.0-pp rendering) | updated 2026-09-02 | Complete property list incl. `AllowOutOfOrderMetadataProperties`, `InferClosedTypePolymorphism` |
| https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/how-to | Serialization how-to | updated 2026-03-30 | Options reuse tip; UTF-8 serialization |
| https://devblogs.microsoft.com/dotnet/system-text-json-in-dotnet-8/ | .NET team blog on STJ in .NET 8 | 2023-11, .NET 8 | Source of SYSLIB1034 intent, `JsonStringEnumConverter<T>`, `TypeInfoResolverChain` |
| https://github.com/dotnet/runtime/issues/55043 | Fast-path deserialization proposal | open, last activity 2025-08-24 | Status and benchmark evidence for fast-path value |
| https://github.com/advisories/GHSA-8g4q-xg66-9fp4 | CVE-2024-43485, STJ denial of service | 2024 | Minimum safe STJ version (8.0.5) |
| https://www.nuget.org/packages/System.Text.Json/ | NuGet package page | 10.0.12, 2026-09-08 | Latest version and per-TFM dependencies for netstandard2.0 |
| https://skills.sh/dotnet/skills/dotnet-aot-compat | Microsoft's `dotnet-aot-compat` agent skill listing (summary only was readable) | 2026 | Shows the vendor itself ships agent guidance for IL2026/IL3050 work |
| Exemplar corpus (not a URL; file:line cited inline) | owner__repo@sha12 clones under /home/mherwig/.cache/research-lang/exemplars/csharp | corpus HEAD at 2026-10-10 | Real-world contexts, AOT flags, vendor SDK serialization strategies |
