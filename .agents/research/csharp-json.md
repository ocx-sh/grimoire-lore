---
title: "Binding ocx JSON with System.Text.Json (consolidated)"
topic: csharp-json
model: claude-opus-5-5
consolidates:
  - csharp-json/csharp-json-source-generation-and-trim.md
  - csharp-json/csharp-json-forward-compatible-binding.md
  - csharp-json/csharp-json-error-document-and-generic-unions.md
date: 2026-10-11
revised: 2026-10-11
---

# Binding ocx JSON with System.Text.Json

Citation keys: **[SG §n]** = [source-generation-and-trim](csharp-json/csharp-json-source-generation-and-trim.md) finding n;
**[FB Fn / On]** = [forward-compatible-binding](csharp-json/csharp-json-forward-compatible-binding.md) finding n / probe line n;
**[ED Fn / En / Rn / Vn]** = [error-document-and-generic-unions](csharp-json/csharp-json-error-document-and-generic-unions.md) finding n / error case / report case / verify step;
**[API CS-xxx-nn]** = the consolidated [csharp-api](csharp-api.md) rules; **[EXC §n]** = [csharp-api-exceptions-from-exit-codes](csharp-api/csharp-api-exceptions-from-exit-codes.md);
**[SHAPE §n]** = [csharp-api-surface-shape](csharp-api/csharp-api-surface-shape.md);
**[CLI :n]** = [ocx-cli-contract](csharp-audit/ocx-cli-contract.md) line n; **[PY :n / Sn]** = [python-sdk-digest](csharp-audit/python-sdk-digest.md) line n / smell n;
**[CJ Vn/Cn/Sn]** = this consolidation's own fixture `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/consolidate-csharp-json/`
(`verify.sh`, output in `verify.log`; SDK 10.0.401, run on .NET 10.0.12 and .NET 8.0.31, Native AOT linux-x64);
**[CJ2 Gxx]** = the revision's gate run in the same fixture (`r2/gates.sh`, output `r2/gates.log`): every rg gate below run over the generic-converter
library of [ED] with its planted `#if RED_*` branches stripped (`green`) and over planted files (`red`: [ED] `twins/red/PlantedConverter.cs`,
the 13 hand-written converters `Unions.hand.g.cs`, [ED] `naive/` and `detail/Consts.cs`, plus `r2/planted/*.cs`).

## Verdict

1. **Source generation is mandatory.** Every bind goes through a `JsonTypeInfo` from one `internal sealed partial class OcxJsonContext`. `IsAotCompatible` is set for TFMs >= net8.0, and IL2026/IL3050 are errors. A reflection call publishes with exit 0 and crashes at run time (exit 134) [SG §2].
2. **The attribute-only options block below is the only serializer configuration, and the generic union converter does not change it.** The converter is attached by `[JsonConverter(typeof(TaggedUnionConverter<X>))]` on each union base. It binds arms through whatever options it is handed, so it needs no `Converters` entry and no runtime `JsonSerializerOptions` [ED F6]. A context used as a foreign `TypeInfoResolver` drops its naming policy [SG §4, CJ S1].
3. **Bind tolerantly where ocx is open and strictly where it is closed.** Unknown members are skipped. Wire enums are open record structs over `string` or over `int` (`OcxExitCode`). Unions are tag-first. Schema-required keys are `required`. An explicit `null` in a required slot, duplicate keys and a wrong JSON kind are refused [FB F3, CJ C1-C9, ED F2].
4. **Conflict resolved, one generic converter instead of 13 hand-written ones.** The earlier CS-JSON-07 said "a hand-written `JsonConverter<TBase>` per union" [FB F5]. [ED F6] says to adopt one `TaggedUnionConverter<TBase>` with an internal static-abstract arm table. **The generic converter wins:**
   - Over 165 cases on .NET 8.0.31, 10.0.12, Native AOT and the 11 RC1 runtime, its output is byte-identical to the hand-written converters (one md5) [ED V1/V2/V5/V9].
   - The cost is +1,024 B for `Lib.dll` and +0.9 % on the AOT binary, and decode time is within noise [ED V6-V7]. Union-support source drops from 326 lines to 170 + 44.
   - The table can be enumerated, which drives the registration loop and an exact schema diff.
   - Three things would reverse this: a union whose tag is not `type`, an arm that needs its own converter (neither exists among the 13), or a native STJ "unknown discriminator keeps raw" mode.
   - `[JsonPolymorphic]` stays rejected: it collapses unseen, missing, numeric and wrong-case tags into one silent base [FB O62/O72/O74].
5. **Conflict resolved, which exceptions the seam catches.** It catches `JsonException` only. A `NotSupportedException` from STJ is a programming error. [ED V4] watched it: a deleted arm registration surfaces as `NotSupportedException` on that tag alone, and the registration loop in CS-JSON-03 catches it, not the seam. CS-ERR-01/04 still list `NotSupportedException` as a decode inner exception, so that is flagged to csharp-api.
6. **Exception leaves follow [API CS-ERR-01].** Wrong-shaped output on exit 0 raises `OcxDecodeException`. A `schema_version` or contract mismatch, or a binary without `contract`, raises `OcxContractException`. The earlier names `OcxParseException` and `OcxVersionException` are corrected in place.
7. **Conflict resolved, the exit code beats stdout on the failure path.** CS-JSON-09 and CS-ERR-04 send a `schema_version` mismatch to `OcxContractException` and wrong shape to `OcxDecodeException`. That now applies only when the process exited 0 or with an accepted code. Once ocx exits with an unaccepted non-zero code, every stdout problem still gives `OcxCommandException` with the real code, because a retry policy keys on it (75) [ED F4, R5-R7b]. The document's `exit_code` never overrides the process status [ED E5].
8. **report_then_fail: skim once, bind once, attach the typed report.** That covers 17 modes over 14 commands, not 17 commands [ED F5].
   - A top-level `Utf8JsonReader` skim classifies stdout: an `error` object plus a numeric `exit_code` means the error document. Then stdout is bound exactly once.
   - The typed report rides on `OcxCommandException.PartialReport` (`object?`), which replaces `PartialReportJson`. This property change is flagged to csharp-api.
   - "Non-zero means error document" leaks a `JsonException` and loses both the code and the report [ED V8].
9. **The error document binds to internal wire types.** `detail` is the only optional `ErrorBody` member and stays `string?` with no constants: the slug list grew from 505 to 516 in three days [ED F1/F3]. `OcxErrorKind` (11 values) is an open string struct.
10. **The strict test instrument** is a copy of the context options with `Disallow`. The generic converter honours it by construction: 13 of 13 unions refuse an added arm key [ED S4] [CJ S2-S5].
11. **The net8/net10 split needs no `#if`.** Add the `System.Text.Json` 10.x package to the net8.0 asset only [CJ V1/V2/V4]. The converter uses only APIs that exist on net8 with that package [ED F8].
12. **Models are hand-written and gated by one schema-diff test.** It covers `reports.json`, `errors.json` and `cli.json`, and now also verifies the arm tables, exit and kind tables and the report_then_fail pairs [FB F9, ED F7]. Newtonsoft.Json is rejected [SG §12].
13. **Known gaps, not blockers.** Every run was on Linux x64. Still unexecuted:
    - Windows negative exit statuses (shown only through the decode seam, [ED E8]);
    - Native AOT on win-x64, osx-arm64 and linux-arm64;
    - a real main-built `ocx` binary (Ocx.Fake stands in);
    - BenchmarkDotNet-grade timings.

## The ruleset

### Canonical setup (deliverable 1)

```csharp
// src: the only serializer configuration in the SDK. Values are attribute-baked; no runtime JsonSerializerOptions.
// The generic union converter (CS-JSON-07) adds nothing here: it is attached per union base by attribute.
[JsonSourceGenerationOptions(
    PropertyNamingPolicy = JsonKnownNamingPolicy.SnakeCaseLower,     // net8; dotted keys (os.features) need [JsonPropertyName] [FB F2]
    UnmappedMemberHandling = JsonUnmappedMemberHandling.Skip,        // net8; the default, stated: additions never bump ocx versions
    RespectNullableAnnotations = true,                               // net9 -> package on net8: explicit null in required slot refused
    RespectRequiredConstructorParameters = true,                     // net9 -> package on net8: satisfies MA0223
    AllowDuplicateProperties = false)]                               // net10 -> package on net8: duplicate key refused
[JsonSerializable(typeof(AboutRoot))]                                // one line per *Root def bound ...
[JsonSerializable(typeof(ErrorDocument))]                            // ... the internal error document ...
[JsonSerializable(typeof(SkippedReason))]                            // ... each union base ...
[JsonSerializable(typeof(SkippedReasonOffline))]                     // ... and each known union arm (arms are not discovered)
internal sealed partial class OcxJsonContext : JsonSerializerContext;
```

```csharp
// One union = one base + one arm table; the converter is shared (ED F6, measured AOT-clean).
[JsonConverter(typeof(TaggedUnionConverter<SkippedReason>))]
public abstract class SkippedReason : ITaggedUnion<SkippedReason>            // ITaggedUnion<>, UnionArm<>, the converter: internal
{
    internal SkippedReason() { }                                             // [API CS-API-08]
    [JsonPropertyName("type")] public required string Type { get; init; }    // the ONLY base member (CS-JSON-18)
    private static readonly UnionArm<SkippedReason>[] s_arms =
        [UnionArm<SkippedReason>.Of<SkippedReasonOffline>("offline") /* one row per reports.json tag */];
    static IReadOnlyList<UnionArm<SkippedReason>> ITaggedUnion<SkippedReason>.Arms => s_arms;
    static SkippedReason ITaggedUnion<SkippedReason>.Unknown(string tag, JsonElement raw) => new UnknownSkippedReason { Type = tag, Raw = raw };
}
```

```xml
<TargetFrameworks>net8.0;net10.0</TargetFrameworks>
<IsAotCompatible Condition="$([MSBuild]::IsTargetFrameworkCompatible('$(TargetFramework)', 'net8.0'))">true</IsAotCompatible>
<ItemGroup Condition="'$(TargetFramework)' == 'net8.0'"><PackageReference Include="System.Text.Json" Version="10.0.12" /></ItemGroup>
```

Option availability. Every row marked "no" on net8 is closed by the package line above [FB F10, SG §10, CJ V4]:

| Option / API | net8 inbox | net9 | net10 | net11 RC1 |
|---|---|---|---|---|
| `UnmappedMemberHandling`, `SnakeCaseLower`, `required`, `JsonStringEnumConverter<T>`, `GetTypeInfo(Type)`, `TypeInfoResolverChain`, `static abstract` interface members | yes | yes | yes | yes |
| `RespectNullableAnnotations`, `RespectRequiredConstructorParameters`, `AllowOutOfOrderMetadataProperties`, `JsonSerializerOptions.Web` | **no** | yes | yes | yes |
| `AllowDuplicateProperties`, `JsonSerializerDefaults.Strict`, `JsonSerializerOptions.Strict`, `GetTypeInfo<T>()` (docs list it for net10+ only; do not use, CS-JSON-07) | **no** | **no** | yes | yes |
| `InferClosedTypePolymorphism`, C# 15 `closed`, `JsonNamingPolicy.PascalCase`, non-public `[JsonInclude]` in source gen, open-generic `[JsonConverter(typeof(C<>))]` on generic types | no | no | no (`closed` = CS8652) | preview, GA Nov 2026 |

On .NET 11 RC1 the SDK 11.0.100-rc.1.26425.128 builds the generic converter at 0 warnings, and the RC1 runtime passes 198/198 cases [ED V9]. The open-generic attribute form is for generic model types. It does not apply to non-generic union bases, which keep `typeof(TaggedUnionConverter<X>)` [ED F8].

### Forward-compatibility policy (deliverable 2)

| Case | Policy | Mechanism | Watched |
|---|---|---|---|
| Unknown member (root or nested, union arm included) | accept, ignore | `UnmappedMemberHandling = Skip` | [CJ C1], [FB C1] |
| Unseen string enum value | accept; keep the raw string; `IsKnown == false`; never success | `readonly record struct X(string Value)` + `OpenEnumConverter<T>` | [CJ C2]; red [FB naive C2] |
| Wrong-case string enum value (`"Updated"`) | accept as an *unknown* value (Ordinal) | same | [CJ C2b] |
| String enum value that is not a string | refuse → `OcxDecodeException` | converter throws `JsonException` | [CJ C2c] |
| Unseen integer value (`exit_code: 83`, process status `-1073741819`, `143`) | accept; keep the `int`; `IsKnown == false`; `Name == null` | `readonly record struct OcxExitCode(int Value)` + `OpenIntEnumConverter<T>` | [ED E4, E8, E9]; red [ED V10 naive: 83 accepted as undefined enum] |
| Integer enum given `"65"`, `65.0`, `true` or `null` | refuse (`JsonException`) | converter reads `JsonTokenType.Number` + `TryGetInt32` only | [ED E6, E6b]; red [ED V10 naive: `"65"` bound as `DataError`] |
| Unseen union tag, wrong-case tag, empty tag | accept as the `Unknown` arm, which keeps `Type` and a cloned `Raw` | `TaggedUnionConverter<TBase>` | [ED C3, C3f, C3g] x13 unions; red [FB O61] |
| Known tag spelled with a `\u00xx` escape | the known arm | `JsonElement.ValueEquals` (escape-aware, ordinal) | [ED C3h] |
| Union with a missing, `null` or numeric tag, a non-object union, or a known tag with a bad payload | refuse → `OcxDecodeException` | same converter; no `catch` around arm binding | [ED C3c-C3e]; red [ED V3 `TAGKIND` 13, `SWALLOW` 22] |
| Tag not first | accept | converter buffers the object | [ED C3b]; red on net8 [FB O66] |
| Missing schema-required key | refuse | C# `required` | [CJ C4]; red [FB C4 `Version=""`] |
| Missing schema-optional key / explicit `null` there | accept as unset | nullable member, not `required` | [CJ C5b]; [ED E3] (`error.detail` absent) |
| Explicit `null` in a required slot | refuse | `RespectNullableAnnotations` | [CJ C5]; red [FB O10] |
| Duplicate key | refuse | `AllowDuplicateProperties = false` | [CJ C6] on net8 and net10; [ED E11]; red [FB O17 last-wins] |
| `schema_version` differs or is absent, exit 0 | refuse **before** binding → `OcxContractException` | top-level skim in the decode seam | [CJ C7/C7b], [ED R6]; red [FB `--bind-first`] |
| `null` document or truncated output, exit 0 | refuse → `OcxDecodeException` | `?? throw`, catch `JsonException` | [CJ C8/C9], [ED R5b, R7b] |
| **Any** stdout problem with an unaccepted non-zero exit (non-JSON, wrong shape, `schema_version` 2, string or float `exit_code`, missing `context`, duplicate key, document `exit_code` differing from the process) | `OcxCommandException` carrying the **process** exit code; a defective error document is ignored | outcome seam (CS-JSON-20) | [ED E5-E11, R5, R6b, R7]; red [ED V8 naive `LEAK:JsonException`] |
| report_then_fail: a report on stdout with an unaccepted non-zero exit | `OcxCommandException` with `PartialReport` = the typed report; one bind | outcome seam (CS-JSON-21) | [ED R1b, R2b, R3b `BindCount == 1`] |
| Same, with the code in the caller's accepted set | return the report, throw nothing | [API CS-ERR-09] | [ED R2] |
| Publisher `OpaqueJson` | carried as given (may hold `null`) | `JsonElement` | [FB O50/O51] |

### Schema-diff test design (deliverable 3)

- **Inputs:**
  - The source-generated contract: `OcxJsonContext.Default.GetTypeInfo(t).Properties` gives `Name`, `IsRequired` and `PropertyType`.
  - The arm tables, read through `ITaggedUnion<T>.Arms`.
  - `OcxExitCode.Known`, `OcxErrorKind.Known` and a hand-maintained `ReportThenFailTable.Pairs`.
  - Three goldens vendored from the ocx commit the SDK pins: `crates/ocx_schema/tests/golden/{reports,errors,cli}.json`. Pin the goldens, not a URL: v1 and v2 are both live, #604 edits v1 in place [CLI :69], and `cli.json` is "golden only", never published [CLI :70].
  - A `Map` table pairs each bound type with a `*Root` or `$defs` name, so `schema_version` is checked as an ordinary required member [FB F1, F9].
- **Failure classes** (the [FB F9] set, extended by [ED F7]):
  - `phantom`: the model binds a key the schema does not have.
  - `unsafe`: the model is `required` but the schema key is optional.
  - `lossy`: the schema key is required but the model member is optional. A waiver with a reason is allowed, as in Python's `_WAIVED`.
  - `missing-required`: the schema requires a key the model lacks.
  - `unmodelled-new` / `stale-baseline`: an optional key outside `unmodelled-baseline.txt`, or a baseline entry that no longer exists.
  - `kind`: the JSON kind differs.
  - `enum-value-new/-stale`: `x-ocx-enum` versus the struct's `Known`.
  - `union-arm-new/-stale`: `oneOf` `properties.type.const` tags versus the table's `Arms` tags.
  - `union-unmapped/-extra`: schema unions versus the test's union map.
  - `union-closed/-schema-inconsistent`: the `x-ocx-unknown-variant` arm vanished, or its `not.enum` differs from the known tags.
  - `arm-unregistered`: some `ctx.GetTypeInfo(arm.ArmType)` does not resolve.
  - `exit-new/-renamed/-stale`: `errors.json` `ExitCode` `x-ocx-enum` (value, name) versus `OcxExitCode.Known`. This **is** the drift test of [API CS-ERR-02]. Name the class `ExitTableConformance` inside the `WireContract` namespace so both test filters select it.
  - `kind-new/-stale`: `ErrorCategory` versus `OcxErrorKind.Known`.
  - `detail-exit-unknown`: every `ErrorDetail.exit_code` is an `ExitCode` row.
  - `error-body-required`: `ErrorBody.required` is exactly `[context, kind, message]`.
  - `root-looks-like-error-document`: no report root has both `error` and `exit_code`. This guard keeps the CS-JSON-21 classifier sound.
  - `rtf-new/-stale`: the `(command, root)` pairs whose output type is `report_then_fail` in `cli.json`, versus the table (17 pairs today).
  - `version`: the `schema_version` const versus the compiled contract table.
  - `unmapped-type`: set equality between bound types and `Map` rows.
- **Watched:**
  - [FB F12]: 9 planted twins red, the real golden green.
  - [CJ]: `reports.build_id.json lib` exit 1, `FAIL missing-required About.build_id`; the fixed twin exit 0.
  - [ED V12]: the real goldens give `failures=0` (13 unions, 13 exit codes, 11 kinds, 17 rtf pairs), and each of 11 new twins exits 1 with its class. Examples: `FAIL error-body-required schema requires [context,detail,kind,message] ...`, `FAIL rtf-new pull:PullReport`. A twin with an updated table is green, and restoring the real tables is green again.
- **What the Python test lacks:** Python's test has none of `missing-required`, `kind`, enum, union, exit, rtf or `schema_version` classes [FB F9]. Add them.
- **Test-project access:** the context and the union machinery are `internal`, so the test project needs `InternalsVisibleTo`.

### Rules

Each verification is real shell run from the repo root, with `src/` for the library and `tests/` for tests. `! rg ...` passes when the search finds nothing. "Watched" means the check was observed red on a planted defect and green on its fixed twin.

**CS-JSON-01 (MUST) Bind only through a source-generated `JsonTypeInfo`.** Do not use reflection overloads, `options` overloads, or explicit-generic `Deserialize<T>()`/`ReadFromJsonAsync<T>()` extension forms.
*Why:* publish succeeds and the binary throws `Reflection-based serialization has been disabled` (exit 134) [SG §2].
*Verify:* `.editorconfig` under `[*.cs]` has `dotnet_diagnostic.IL2026.severity = error` and `dotnet_diagnostic.IL3050.severity = error`, with the conditional `IsAotCompatible` set; `dotnet build -c Release` exits 0. Then:
`! rg -n -g '*.cs' -e '\.(Serialize|Deserialize|SerializeAsync|DeserializeAsync|SerializeToUtf8Bytes|SerializeToElement|SerializeToNode|ReadFromJsonAsync|GetFromJsonAsync|PostAsJsonAsync|PutAsJsonAsync)<[^>(]+>\(' src`
*Watched:*
- Analyzer red/green [SG G1/G2].
- The rg gate matched 4 lines in `csharp-json-source-generation-and-trim/{gates/red,halluc/ext-red}` and nothing in `consolidate-csharp-json/lib`.
- The generic converter's `root.Deserialize(options.GetTypeInfo(armType))` is the non-generic `JsonTypeInfo` overload. It does not match the gate and is AOT-clean (`publish warnings/errors=0`) [ED V5].

**CS-JSON-02 (MUST) Use exactly one `internal sealed partial class OcxJsonContext` per assembly, configured only by the canonical `[JsonSourceGenerationOptions]` block.** Never put `new JsonSerializerOptions`, `TypeInfoResolver =`, `JsonTypeInfoResolver.Combine`, `.Web`/`.Strict`/`.Default` options, `PropertyNameCaseInsensitive`, `AllowReadingFromString` or `Disallow` in `src`. Union converters are attached by `[JsonConverter]` on the base, never through `Converters`.
*Why:* foreign options silently drop the naming policy and return empty fields [SG §4]. Web and case-insensitive settings accept more than the contract allows, so skew goes unnoticed [FB O5/O6].
*Verify:*
`! rg -n -g '*.cs' -e 'new JsonSerializerOptions' -e 'TypeInfoResolver\s*=' -e 'JsonTypeInfoResolver\.Combine' -e 'JsonSerializerOptions\.(Web|Strict|Default)\b' -e 'JsonSerializerDefaults\.(Web|Strict)' -e 'PropertyNameCaseInsensitive' -e 'AllowReadingFromString' -e 'JsonUnmappedMemberHandling\.Disallow' -e 'Converters\.Add\(' src`
plus `! rg -n -g '*.cs' 'public (sealed )?partial class \w+ : JsonSerializerContext' src`
plus `.editorconfig` `dotnet_diagnostic.MA0222.severity = error` and `dotnet_diagnostic.MA0223.severity = error` (Meziantou, off by default).
*Watched:* the rg gate matched `consolidate-csharp-json/app/Program.cs:51,54` and nothing in `lib`. The `public partial` gate matched `csharp-json-forward-compatible-binding/lib/Models.cs:183` and nothing in `consolidate-csharp-json/lib`. MA0222-MA0225 analyzers red/green [FB F12 item 4]. The `Converters\.Add\(` term added in revision 2 was not watched.

**CS-JSON-03 (MUST) Run the test project with reflection disabled. Give every registered root a wire-fixture round-trip test, and add one test that loops over every union's arm table.** That loop asserts `OcxJsonContext.Default.GetTypeInfo(arm.ArmType)` resolves for every arm and runs the C3-C3h and S4-S6 matrix of the policy table per union.
*Why:* arms are never discovered automatically. A missing `[JsonSerializable]` fails only at the first use of that one tag, and it fails as `NotSupportedException`, not `JsonException`, so it never reaches the seam's catch [SG §5, §7; ED V4]. A `GenerationMode = Serialization` context fails at the first call [SG §5].
*Verify:*
- `rg -n '<JsonSerializerIsReflectionEnabledByDefault>false</JsonSerializerIsReflectionEnabledByDefault>' tests`. The property belongs on the executable test project, because a library produces no runtimeconfig.
- `rg -n -g '*.cs' -e '\.Arms\b' tests` finds the loop.
- `dotnet test tests/Ocx.Sdk.Tests --filter FullyQualifiedName~WireContract` exits 0.
*Watched:*
- The switch flips a CoreCLR run red [SG `red-trim/jit`; FB `noreflect`].
- [ED V4]: deleting `typeof(PriorValue)` gave `FAIL Prior/C3e ... got NotSupportedException` and `FAIL U-REG ... unregistered=1`, while the 164 other cases stayed green. Restored: `total=198 wrong=0`.

**CS-JSON-04 (SHOULD) Keep a `PublishAot` smoke app that references the SDK, publishes with `-p:TreatWarningsAsErrors=true`, and *runs* the binary on a wire fixture in CI.** Run it on linux-x64, win-x64 and osx-arm64 at minimum.
*Why:* exit 0 from publish proves nothing [SG A2]. AOT behaviour is per-RID; xunit tests 7 RIDs [SG §8].
*Verify:* `rg -l -g '*.csproj' '<PublishAot>true</PublishAot>' tests samples` and `rg -n -e 'linux-x64' -e 'win-x64' -e 'osx-arm64' .github/workflows`.
*Watched:*
- Red/green [SG A1/A3].
- [CJ V5]: the policy app published with 0 warnings and ran `wrong=0` natively.
- [ED V5]: the generic converter published with 0 warnings and ran 198/198 natively.
- Only linux-x64 was measured.

**CS-JSON-05 (MUST) Make every ocx `x-ocx-enum` an open record struct, never a CLR `enum`.**
- **String sets:** `readonly record struct X(string Value) : IOpenEnum<X>` [API CS-API-07]. It has a static abstract `From(string)`, static well-known instances, a `Known` list, `IsKnown`, `ToString() => Value ?? ""` and `[JsonConverter(typeof(OpenEnumConverter<X>))]`. The shared converter accepts only `JsonTokenType.String`. `OcxErrorKind` (11 values) has this shape.
- **Integer sets:** the exit status and `error.exit_code` use `readonly record struct OcxExitCode(int Value) : IOpenIntEnum<OcxExitCode>` with `OpenIntEnumConverter<T>`. That converter accepts only `JsonTokenType.Number` and `TryGetInt32`, and it writes with `WriteNumberValue`.
- **Construction:** `new OcxExitCode(process.ExitCode)` is total over int32. Never cast to an enum or `byte`.
- **Never** `JsonStringEnumConverter` (either form) for a wire value.
*Why:*
- `JsonStringEnumConverter` throws on an unseen value, accepts any case and accepts undefined integers [FB O21-O24].
- The naive integer model accepts 83 silently as an undefined enum value and binds the string `"65"` as `DataError` [ED V10].
- A `byte` or a closed enum loses `-1073741819` (a Windows NTSTATUS as `int`) [ED F2].
*Verify:* `! rg -n -g '*.cs' -e 'JsonStringEnumConverter' -e 'Enum\.(Try)?Parse' -e 'IgnoreCase' -e '\benum\s+\w*Exit\w*' src`. Also `BannedSymbols.txt` lines `T:System.Text.Json.Serialization.JsonStringEnumConverter` and ``T:System.Text.Json.Serialization.JsonStringEnumConverter`1``, with `dotnet_diagnostic.RS0030.severity = error`. The cast ban is [API CS-ERR-02]'s gate.
*Watched:*
- Analyzers red/green [FB F12 item 4].
- String form: [CJ C2/C2b/C2c] green; [FB naive C2] red.
- Integer form: [ED E4/E6/E6b/E8/E9] green; [ED V10] naive red.
- `enum ...Exit` gate [CJ2 G05]: green 0, red 2.

**CS-JSON-06 (MUST) Write success predicates as allow-lists:** `IsOk => this == A || this == B`. Never `!= Failed`. Unknown is never success.
*Why:* ocx's machine-interface page forbids "not failed" by name [FB F1].
*Verify:* `! rg -n -g '*.cs' -e '!=\s*\w+\.(Failed|Failure|Error)\b' src`, plus a test that feeds conformance `synthetic_unknown_enum_value` and asserts `IsOk == false`.
*Watched:* green only [CJ C2 `ok=False`]. The red side was not run.

**CS-JSON-07 (MUST) Decode every wire union with the one shared, internal `TaggedUnionConverter<TBase>` and a per-union arm table. Write no per-union `JsonConverter<>`.** *(Changed in place in this revision. It previously asked for one hand-written converter per union.)*
- **Base:** `public abstract class` with an `internal` constructor [API CS-API-08] and `public required string Type`. It implements `ITaggedUnion<TBase>` explicitly: a `static abstract IReadOnlyList<UnionArm<TBase>> Arms` and `static abstract TBase Unknown(string tag, JsonElement raw)`. It carries `[JsonConverter(typeof(TaggedUnionConverter<TBase>))]`.
- **Arm rows:** `UnionArm<TBase>.Of<TArm>("tag")`, where `TArm : class, TBase` is the compile-time proof.
- **The converter:**
  - It does `JsonDocument.ParseValue` and requires an object whose `type` has `ValueKind == String`, otherwise `JsonException`.
  - It matches tags with `tag.ValueEquals(arm.Tag)`.
  - It binds the arm with `root.Deserialize(options.GetTypeInfo(arm.ArmType))`, which uses the caller's options and the non-generic overload. It never uses `OcxJsonContext.Default` and never `GetTypeInfo<T>()`.
  - It has no `catch` around arm binding.
  - It returns `TBase.Unknown(tag.GetString()!, root.Clone())` for an unseen tag.
- **Visibility:** `ITaggedUnion<>`, `UnionArm<>` and the converter are `internal`, and nothing of them appears in `PublicAPI.*.txt`.
- **Never** `[JsonPolymorphic]`, `[JsonDerivedType]`, `UnknownDerivedTypeHandling`, `InferClosedTypePolymorphism`, `MakeGenericType` or `Activator` for wire unions.
*Why:*
- One reviewed definition of the tag rules replaces 13 drifting copies, at no measurable cost [ED F6].
- The attribute route makes "unseen" and "malformed" the same thing. `UnknownDerivedTypeHandling` only affects writing [FB O69]. .NET 11 closed inference throws on an unseen tag [FB K2].
- Binding arms through `Default` bypasses the strict instrument [CJ V3, ED V3].
- Swallowing a bad payload into `Unknown` is the anthropic-sdk-csharp defect (`ToolChoice.cs:362-365`) [ED F6].
*Verify:*
`! rg -n -g '*.cs' -e 'JsonPolymorphic' -e 'JsonDerivedType' -e 'IgnoreUnrecognizedTypeDiscriminators' -e 'UnknownDerivedTypeHandling' -e 'InferClosedTypePolymorphism' src`
`test -z "$(rg -n -g '*.cs' ':\s*JsonConverter<' src | rg -v -e 'TaggedUnionConverter<' -e 'OpenEnumConverter<' -e 'OpenIntEnumConverter<')"`
`! rg -n -g '*.cs' -e 'MakeGenericType' -e 'Activator\.CreateInstance' -e 'Type\.GetType\(' -e 'GetTypeInfo<' src`
`test -z "$(rg -l -g '*.cs' ':\s*JsonConverter<' src | xargs -r rg -n -e 'OcxJsonContext\.Default' -e 'catch \((System\.Text\.Json\.)?JsonException')"`
`! rg -n -g '*.cs' -e 'GetProperty\("type"\)\.GetString\(\)' -e 'GetString\(\)!?\s*switch' src`
`! rg -n -g '*.cs' 'public\s+(static\s+)?(readonly\s+)?(sealed\s+)?(interface|class|struct)\s+(ITaggedUnion|UnionArm|TaggedUnionConverter)\b' src`
`! rg -n -e 'Converter' -e 'ITaggedUnion' -e 'UnionArm' src/Ocx.Sdk/PublicAPI.Shipped.txt src/Ocx.Sdk/PublicAPI.Unshipped.txt`
Plus the CS-JSON-03 loop. The C3e case per union catches a swallow, and reading `Raw` after the call returns catches a missing `Clone()`.
*Watched:*
- The `JsonPolymorphic` gate matched `csharp-json-source-generation-and-trim/green/lib/Models.cs:7-9` and nothing in `consolidate-csharp-json/lib`.
- [ED V3] planted converter bugs, all with 0 failures unplanted:
  - `TAGKIND` failed 13 cases;
  - `SWALLOW` failed 22;
  - `DEFAULT` failed 13 (`FAIL EntrySource/S4 strict: added key in arm: want JsonException, got EntrySourcePackage|package`).
- [CJ2] rg gates, green / red:
  - per-union converter: 0 / 14;
  - reflection dispatch: 0 / 2;
  - `Default` or `catch` in a converter: 0 / 1 and 0 / 1;
  - unguarded tag: 0 / 14;
  - public machinery: 0 / 1.
- [ED V13] reflection dump: `public ITaggedUnion/UnionArm/TaggedUnionConverter types=0`.

**CS-JSON-08 (MUST) Mark schema-required keys `public required T X { get; init; }`.** Schema-optional keys are nullable and never `required`. `RespectNullableAnnotations = true` stays in the context. On a consumer-constructible type, a key that becomes wire-mandatory after first release is an `init` property with `[JsonRequired]`. Output types with an `internal` constructor are exempt [API CS-API-10].
*Why:* STJ treats "missing" and "null" as separate questions. Without `required`, a missing key quietly gives `""` or `0` [FB F6, O8/O15].
*Verify:* the schema-diff `unsafe`, `lossy` and `missing-required` classes are green, plus `! rg -n -g '*.cs' -e '\{ *get; *set; *\}' src/Models` (DTOs are init-only).
*Watched:* [CJ C4/C5/C5b] green; [FB naive C4/C5] red.

**CS-JSON-09 (MUST) Route every bind through one internal decode seam: the outcome seam of CS-JSON-20/21.**
- **Order:** it first skims the top-level members of the stdout bytes with `Utf8JsonReader`, skipping values. Then, on exit 0 or an accepted code, it compares `schema_version` against the compiled value (→ `OcxContractException`, before binding). Then it binds with `JsonSerializer.Deserialize(bytes, info) ?? throw new JsonException(...)`.
- **Catching:** it catches **only** `JsonException`. On exit 0 or an accepted code that becomes `OcxDecodeException`, with the inner exception and `Path`. It never echoes stdout in the message.
- **The one other file:** the union converter file is the only other place a `.Deserialize(` appears.
*Why:*
- This is Python smell S3 [PY S3]. Binding first reports a v2 shape as a decode error [FB F8].
- STJ leaves payload values out of its messages on purpose [FB F2].
- The skim allocates nothing and fits the engine's `byte[]`. It is preferred for that reason, not for speed: three variants measured within noise [ED V8].
*Verify:*
`test "$(rg -l -g '*.cs' -e 'JsonSerializer\.Deserialize' -e 'JsonDocument\.Parse\(' src | wc -l)" -le 1`
`! rg -n -g '*.cs' -e 'catch \((System\.)?NotSupportedException' -e 'JsonSerializer\.Deserialize\([^;]*\)!' src`
*Watched:*
- [CJ C7/C7b/C8/C9] and [ED R5b/R6/R7b] green; [FB `replay --bind-first`] red; the leak red/green in [EXC §6].
- The seam count is 1 in `consolidate-csharp-json/lib`.
- On the generic layout [CJ2]: this gate lists only `Errors.cs`. [API CS-ERR-04]'s wider form (`\.Deserialize\(`) also lists `TaggedUnion.cs`, so it is red on a correct design (flagged).

**CS-JSON-10 (MUST) Handshake once per binary with `ocx --format json version`.**
- **No `contract`:** a missing `contract` key means `OcxContractException`, checked on the raw document before binding.
- **Per spawn:** before each spawn, compare `contract.errors`, `contract.commands[cmd]` and `contract.reports[root]` for each output root by integer equality. Accept every addition.
- **Never** compare semver strings for compatibility, and never hard-code a minimum ocx that nobody measured.
*Why:* this is ocx's own runtime protocol. ocx's `MINIMUM_OCX = "0.6.4"` is refused by its own handshake [CLI :97-105, :141; FB F8].
*Verify:* unit tests for the 7 handshake rows in [FB F8], using the captured 0.6.5 `version` document as a permanent `OcxContractException` case. Plus `! rg -n -g '*.cs' -e 'Version\.Parse' -e 'new Version\(' src/Handshake`.
*Watched:* [FB replay] green; `--bind-first` red.

**CS-JSON-11 (MUST) Keep the schema-diff test (design above) in CI.** It reads the vendored `reports.json`, `errors.json` and `cli.json`, with one planted twin per class kept in `tests/**/schema-twins/`. It must exit non-zero on every planted twin and zero on the vendored goldens. When the goldens are refreshed, the same change must update the models, the arm/exit/kind/rtf tables or the baselines.
*Why:* three presence inversions reached Python `main` [FB F9]. The detail list grew 505 → 506 → 516 in three days, and exit 82 changed meaning between releases [ED F1, CLI :57].
*Verify:* `dotnet test tests/Ocx.Sdk.Tests --filter FullyQualifiedName~WireContract` exits 0, and `ls tests/*/schema-twins | wc -l` is at least the number of classes.
*Watched:* 9 red / 1 green [FB F12]; 2 red / 2 green [CJ]; 11 red / 3 green [ED V12].

**CS-JSON-12 (SHOULD) Replay ocx's conformance corpus** (`crates/ocx_schema/contract/conformance/`) at the pinned commit: 35 cases at `774a1ce760d0` (33 at `246863abc1d4`). These include `synthetic_error_without_detail`, `synthetic_unknown_error_detail` and `synthetic_report_then_fail`. Enumerate the directory, and fail on any case whose root has no decoder and is missing from an explicit `NotYetModelled` list.
*Why:* it is the language-neutral oracle ocx wrote for exactly this [FB F1, ED F1].
*Verify:* the test calls `Directory.GetDirectories` over the vendored corpus, checked by `rg -n 'GetDirectories' tests`.
*Watched:*
- 8 modelled cases green [FB F12 item 2].
- The two error-document synthetics: naive model red (`THROWS JsonException` x2), policy model green [ED V10].

**CS-JSON-13 (MUST) Use strictness only as a test instrument.** Build it with `new OcxJsonContext(new JsonSerializerOptions(OcxJsonContext.Default.Options) { UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow })` and replay recorded real ocx output through it on schema-refresh changes. Never use `JsonSerializerOptions.Strict`, never use `JsonSerializerDefaults.Strict` with `TypeInfoResolver = OcxJsonContext.Default`, and never use either in `src`.
*Why:* Disallow throws on every addition [FB C1]. The preset-plus-resolver form drops the naming policy [CJ S1]. `JsonSerializerOptions.Strict` is IL2026/IL3050 and read-only [FB F7]. The copy reaches union arms only because CS-JSON-07 binds through the caller's options, and an unseen tag stays `Unknown` under it [ED S6].
*Verify:* `! rg -n -g '*.cs' -e 'TypeInfoResolver\s*=' -e 'JsonSerializerOptions\.Strict' -e 'JsonSerializerDefaults\.Strict' src tests`, plus `BannedSymbols.txt` line `P:System.Text.Json.JsonSerializerOptions.Strict`.
*Watched:* [CJ S1] red (`'schema_version' could not be mapped`); [CJ S2-S5] green; [ED S4-S6] 13/13 unions. The rg gate matched `app/Program.cs:51` and not `:54`.

**CS-JSON-14 (MUST) Multi-target `net8.0;net10.0` and add `PackageReference System.Text.Json` 10.0.x to the net8.0 asset only.** Write no `#if NET9_0_OR_GREATER` around serializer options.
*Why:* the policy options are CS0246 on the net8 inbox STJ. Versions below 8.0.5 carry CVE-2024-43485 [SG §10].
*Verify:* `dotnet build -c Release` builds both TFMs, `dotnet list package --vulnerable --include-transitive` reports nothing, and `! rg -n -g '*.cs' -B1 -e 'RespectNullableAnnotations' -e 'AllowDuplicateProperties' src | rg -e '#if'`.
*Watched:* [CJ V4] red (CS0246 x3); [CJ V1/V2] and [ED V1] green on .NET 8.0.31 and 10.0.12.

**CS-JSON-15 (MUST) Keep publisher `OpaqueJson` as `JsonElement`. Keep ocx timestamps, digests and paths as `string`.** Do not use `object`, `Dictionary<string, object>`, `DateTimeOffset` or `Uri`.
*Why:* `JsonElement` keeps `Null` and `Undefined` distinct and needs no registration. Timestamp precision varies between roots [FB O48-O51, SG §1].
*Verify:* `! rg -n -g '*.cs' -e 'Dictionary<string, *object' -e '\bobject\?? +[A-Z]\w* *\{ *get' -e 'DateTime(Offset)?\?? +[A-Z]\w* *\{ *get' src/Models`
*Watched:* green only [FB O50/O51]. `object? PartialReport` lives on the exception in `src/Errors`, not `src/Models`, so this gate does not cover it.

**CS-JSON-16 (MUST) No Newtonsoft.Json, `DataContractJsonSerializer` or `JavaScriptSerializer` anywhere in the dependency graph.**
*Why:* see Verdict 12.
*Verify:* `! rg -n -g '*.cs' -e 'Newtonsoft' -e 'JsonConvert\.' -e '\bJ(Object|Token)\b' -e 'DataContractJsonSerializer' -e 'JavaScriptSerializer' src tests` and `! dotnet list package --include-transitive | rg -i newtonsoft`.
*Watched:* IL2104/IL3053 red [SG N1].

**CS-JSON-17 (SHOULD) Do not suppress IL2026, IL3050, IL2xxx or SYSLIB1034 without a one-line justification on the line above.**
*Why:* suppressing the warning moves the crash into the consumer's binary [SG R11].
*Verify:* `! rg -n -g '*.cs' -g '*.csproj' -g '*.props' -e 'UnconditionalSuppressMessage' -e 'disable +IL[23][0-9]{3}' -e '<NoWarn>.*(IL[23][0-9]{3}|SYSLIB1)' src`
*Watched:* not run.

**CS-JSON-18 (MUST) A union base declares only `Type`. In a flattened union, members shared by the arms are declared on each known arm. Never put `[SetsRequiredMembers]` on a wire model.** This is stricter than [API CS-API-10], which bans it only on public constructors.
*Why:* the `Unknown` arm guarantees only `type` (`x-ocx-unknown-variant` requires `["type"]`). A `required` member on the base makes the `Unknown` factory fail with `error CS9035: Required member 'Var.Key' must be set`. The fixes an agent reaches for, `[SetsRequiredMembers]` or dropping `required`, both silently weaken the known arms. `Var` is the 1 flattened union of 13 [ED F6].
*Verify:* `! rg -n -g '*.cs' 'SetsRequiredMembers' src/Models`, plus `dotnet build -c Release` (CS9035 is a compiler error).
*Watched:* CS9035 red on the first generated draft and green with members on the arms [ED F6]; [CJ2 G18] green 0, red 1.

**CS-JSON-19 (MUST) Bind the error document to `internal sealed` `ErrorDocument`/`ErrorBody` classes whose `required` set is exactly the schema's.**
- **Required:** `schema_version`, `command`, `exit_code` and `error` on the document; `kind`, `message` and `context` on the body.
- **Optional:** `detail` and the three `ErrorContext` strings are nullable and never `required`.
- **No slug constants:** `error.detail` surfaces as `string? Detail`. Declare no type, enum or constants for `ErrorDetail` slugs. A slug the SDK itself branches on is a `private const string` at the use site.
*Why:*
- The naive model (`required string Detail`, closed kind enum) throws on conformance `synthetic_error_without_detail` and `synthetic_unknown_error_detail` [ED V10].
- The slug list went 505 → 506 → 516 between 2026-10-07 and -10. 516 constants cost 107,520 B of IL against 5,120 B for the plain model, add 516 `PublicAPI` lines, and every new slug is an RS0016 break [ED F1, V11].
*Verify:* `! rg -n -g '*.cs' -e '(struct|enum|class)\s+\w*ErrorDetail\b' src`, plus the schema-diff classes `error-body-required` and `detail-exit-unknown`, plus the CS-JSON-12 replay.
*Watched:*
- [ED V10] naive red / policy green; [ED V12] `errors.detail_required.json` red.
- [CJ2 G19] green 0, red 1.

**CS-JSON-20 (MUST) On the failure path the process exit code is authoritative.**
- **Source of the code:** `OcxCommandException.ExitCode` is `new OcxExitCode(process.ExitCode)`. The document's `exit_code` is read only to cross-check and is never copied.
- **Unaccepted non-zero exit:** any stdout problem gives `OcxCommandException` with the real code: non-JSON, wrong shape, a `schema_version` mismatch, a duplicate key, a string or float `exit_code`, or a missing `context`. A defective error document is ignored.
- **Exit 0 or an accepted code:** the same problems give `OcxDecodeException` or `OcxContractException` (CS-JSON-09).
*Why:*
- ocx says "Read the exit code first, then parse stdout" [ED F4, CLI :128].
- The retry signal is the code (`IsTransient` = 75 [API CS-ERR-10]), and a decode problem on a failing command is secondary.
- `ocx exec` children forward their own codes, so a document is not guaranteed [ED F1].
*Verify:* `! rg -n -g '*.cs' -e '\bed\??\.ExitCode\b' -e 'Document\w*\??\.ExitCode\b' src`, plus tests E5 (process 65, document 83 → 65), E6-E11, R5, R5b, R6, R6b, R7 and R7b.
*Watched:* [ED V10] all E1-E13 and R1-R8 `PASS`; [ED V8] naive `report+exit 65 -> LEAK:JsonException`; [CJ2 G20] green 0, red 1.

**CS-JSON-21 (MUST) Classify the stdout of a non-zero exit by shape with one top-level skim, then bind exactly once.**
- **Classify:** a top-level `error` object plus a numeric `exit_code` means the error document. Anything else is the command's report.
- **Attach:** the typed report goes on `OcxCommandException.PartialReport` (`object?`). For a code in the caller's accepted set, return the report instead [API CS-ERR-09].
- **Retain nothing raw:** no stdout string is kept and `PartialReportJson` is not declared.
- **Never** "non-zero means error document", and never "try the error document, catch, try the report".
- **Where it lives:** the classifier lives in the CS-JSON-09 seam. The `(command, root)` table of the 17 report_then_fail pairs is hand-maintained and diffed against `cli.json` (CS-JSON-11 `rtf-*`).
*Why:*
- The naive classifier leaks `JsonException` on a real report_then_fail document and loses the code and the report [ED V8].
- Try-catch-try uses exceptions as control flow and binds twice.
- A raw string forces a second decode and keeps up to the 16 MiB stdout cap alive on an object loggers capture [ED F5].
- The discriminator is sound only while no report root has both members (0 of 56 today, guarded by `root-looks-like-error-document`).
*Verify:*
`test "$(rg -n -g '*.cs' 'Deserialize[^;]*ErrorDocument' src | wc -l)" -eq 1`
`! rg -n -g '*.cs' -e 'PartialReportJson' -e 'string\??\s+(Stdout|RawStdout|Output)\b' src`
`! rg -U -n -g '*.cs' 'catch \((System\.Text\.Json\.)?JsonException[^)]*\)\s*\{[^}]*Deserialize' src`
Plus tests R1b, R2b and R3b asserting one binding pass per invocation.
*Watched:* [ED R1b/R2b/R3b] `BindCount == 1`; [ED V8] naive red. [CJ2], green / red:
- raw stdout kept: 0 / 3;
- bind inside a catch: 0 / 1;
- error-document binds: 1 on green, as required.

**CS-JSON-22 (SHOULD) Never use `FirstOrDefault`/`SingleOrDefault` over `OcxExitCode` or any other open record struct whose `default` is a valid row.** Use `Where(...).ToArray()` and test `Length`, or compare with `==`.
*Why:* `default(OcxExitCode)` is `0 Success`, so a missing code reads as success. The [ED] schema-diff test's own first draft reported a new code 83 as `renamed, table Success` [ED F2, E13].
*Verify:* `! rg -n -g '*.cs' 'OcxExitCode[^/]*\.(FirstOrDefault|SingleOrDefault)\(' src tests`
*Watched:* [ED V14 G6] and [CJ2 G22]: green 0, red 1.

## Applied to the ocx C# SDK

**New commitments the SDK design must take on** (none of these exist in the Python SDK):
- CS-JSON-01/02/03/04: an AOT-clean library with one internal context, a reflection-off test project with an arm-table loop, and an AOT smoke app.
- CS-JSON-07/18: one internal `TaggedUnionConverter<TBase>` plus 13 arm tables. `Var` keeps `key`/`visibility` on its arms. If ocx ever ships an `ocx_sdkgen` C# backend, it should emit tables and arm classes and leave the converter alone [ED F6].
- CS-JSON-05: `OcxExitCode` and `OcxErrorKind` as open record structs with number-only and string-only converters.
- CS-JSON-09/20/21: one outcome seam, holding the skim, the exit-code authority, the single bind and the typed `PartialReport`.
- CS-JSON-10: a pre-spawn contract handshake with equality per command and per root.
- CS-JSON-11/19: the extended schema diff over three goldens, plus internal error-document types without slug constants.
- CS-JSON-13: the strict replay instrument.
- CS-JSON-14: the net8 package line.

**Property deltas handed to csharp-api.** The five leaves stay; no leaf is added.
1. `OcxCommandException`: replace `string? PartialReportJson` with `object? PartialReport` (CS-ERR-01 table). In CS-ERR-08, "`ToString()` never prints `PartialReportJson`" becomes "never prints `PartialReport`".
2. `OcxDecodeException`: `InnerException` is `JsonException` only. CS-ERR-01 and CS-ERR-04 should drop `NotSupportedException` (Verdict 5).
3. CS-ERR-04's seam gate `\.Deserialize\(` lists the union converter file as a second file [CJ2]. Narrow it to the CS-JSON-09 form, or exclude the converter file.
4. The earlier request that `OcxVersionException` carry `Document`, `Expected` and `Found` integers is **withdrawn**. CS-ERR-01's `OcxContractException` (`Part`, `Found`, `Expected`) covers it.

**Already modelled by the Python SDK, so port it:**
- All decoding in one module (`_results.py`) [PY :121-122]; unknown keys are ignored.
- Presence rules come from the schema, through `test_wire_contract.py` (phantom/unsafe/lossy plus the set-equality and stale-waiver gates) [FB F9]. That is CS-JSON-11.
- Open sets stay strings ([API] Python-port notes). That is CS-JSON-05. Opaque sub-objects stay `Mapping`, which becomes `JsonElement` here (CS-JSON-15).
- The exit status is a plain `int` that "building an error must not itself raise" [PY :112]. That becomes `OcxExitCode`, total over int32.
- report_then_fail codes are accepted per call (`_CASCADE_OK=(0,65)`) [PY :114]. That becomes CS-ERR-09's accepted set plus CS-JSON-21.
- A partial report and an error envelope are mutually exclusive [PY :113]. That becomes the CS-JSON-21 classification.

**Forced by the ocx contract** [CLI :128-131; FB F1; ED F1, F5]:
- Additive versioning, so CS-JSON-02 and CS-JSON-13 keep `Skip` in production.
- Open enums and unions, and "unknown status is not success": CS-JSON-05/06/07.
- Absent means unset and `null` appears only in opaque data: CS-JSON-08/15/19.
- `schema_version` on every root plus `contract` in `version`: CS-JSON-09/10.
- Read the exit code first; kind does not determine the code (77 and 81 are both `permission_denied`) [CLI :56]: CS-JSON-20.
- 17 report_then_fail modes over 14 commands, with no error document after the report: CS-JSON-21.
- Exactly one document on stdout, so concatenation or trailing text is a parse error [FB O90].
- There is **no `x-ocx` absent marker**. Absence is encoded only by leaving a key out of `required` [FB F1].

**Do NOT copy from Python:**
1. The `ValueError` skew leak [PY S3] becomes `OcxDecodeException`.
2. The semver `MIN_SUPPORTED`/`TESTED_OCX_VERSION` compat gate [PY :125] becomes contract-integer equality (CS-JSON-10).
3. Its diff test has no `missing-required`, `kind`, enum, union, exit, rtf or `schema_version` classes. Add them.
4. Its default tolerance (`.get` on always-written keys) [FB contested]: C# uses `required` plus explicit, reasoned `lossy` waivers.
5. Hand-written `from_dict` parsers become source-generated metadata with reflection-free converters.
6. `partial_report(err)` returns raw stdout for the caller to decode again [PY :113, ED F1]. C# decodes once and attaches the typed report (CS-JSON-21).
7. `_is_envelope` treats any object with an `error` key as the error document [PY :127]. C# also requires a numeric `exit_code` and guards the collision in the diff test.
8. `ExitCode(int)` as a 17-member closed `IntEnum` raises on `-9` [PY :111, S1]. `OcxExitCode` keeps any int.

Also do not copy the ocx Rust generator's `MINIMUM_OCX = "0.6.4"` [FB F8].

## AI-agent failure modes

Ranked by how often each bites. Training data and exemplars push hardest toward the first ones.

1. **A closed `enum` with `JsonStringEnumConverter` for status, kind or exit code, or `(ExitCode)process.ExitCode`.** It compiles, passes the happy path, and throws or loses the value on a newer ocx. → RS0030 ban plus the CS-JSON-05 rg gate.
2. **`JsonSerializer.Deserialize<T>(json, options)` copied from 2019-2023 tutorials, or `JsonElement.Deserialize<T>()` and `ReadFromJsonAsync<T>()`.** → IL2026/IL3050 as errors plus the CS-JSON-01 rg gate.
3. **"Non-zero exit means error document" (`if (exit != 0) Deserialize<ErrorDocument>(stdout)`), or try the error document, catch, then try the report.** → CS-JSON-21 gates plus R1b/R2b/R3b.
4. **`[JsonPolymorphic]` with `IgnoreUnrecognizedTypeDiscriminators`, or `UnknownDerivedTypeHandling = FallBackToBaseType`, to handle unknown types.** The second has no effect on reads. → CS-JSON-07 rg plus the per-union matrix.
5. **`!= Failed` success checks, or `_ => true` arms.** → CS-JSON-06 rg plus the unknown-value test.
6. **Missing `required`, `string?` everywhere, `required string Detail`, or the belief that `RespectNullableAnnotations` rejects missing keys.** → schema-diff `unsafe`/`lossy`/`missing-required`/`error-body-required` plus [CJ C4] plus the conformance replay.
7. **One hand-written converter per union, copy-pasted, or a `JsonConverterFactory` using `MakeGenericType`, or `catch (JsonException) { return Unknown; }` around arm binding** (the anthropic-sdk-csharp shape). → CS-JSON-07 converter gates plus case C3e.
8. **Throwing `OcxDecodeException` when a failing command's stdout does not parse, or copying `doc.ExitCode` onto the exception.** Either masks the code the retry logic needs. → CS-JSON-20 gate plus E5 and R5/R6b/R7.
9. **Plugging the context into custom options** "belt and braces", or building the strict test mode as `Strict` + `TypeInfoResolver`. Fields come back empty or every key goes unmapped. → CS-JSON-02/13 rg plus [CJ S1].
10. **`JsonSerializerOptions.Strict` or `Disallow` in production because .NET 10 docs call it best practice.** → CS-JSON-02/13 rg plus RS0030 on `.Strict`.
11. **Newtonsoft as the default reflex** (`JsonConvert`, `[JsonProperty]`, `JObject`). → CS-JSON-16.
12. **Letting `JsonException` escape, catching `Exception`, or swallowing `NotSupportedException` as a parse error.** → CS-JSON-09 seam gates plus CA1031.
13. **Checking `schema_version` after binding, or comparing ocx semver strings.** → [FB `--bind-first`] replay case plus CS-JSON-10.
14. **Generating 516 `ErrorDetail` constants "for IntelliSense", or `OcxErrorKind` as a closed enum.** → CS-JSON-19 gate plus the RS0016 baseline.
15. **Forgetting to register a union arm or a `List<T>` root.** This throws `NotSupportedException` on that one tag only. → the CS-JSON-03 arm-table loop.
16. **Using a net9/net10 option on net8 and patching it with `#if`, `GetTypeInfo<T>()` on a net8 asset, or testing only net10 locally.** → CS-JSON-14 plus the CS-JSON-07 `GetTypeInfo<` gate, building both TFMs.
17. **A union converter that binds arms through `OcxJsonContext.Default` "for AOT safety"**, so strict replay misses arm additions. → CS-JSON-07 gate plus S4 per union.
18. **`tag.GetString()` without a `ValueKind` check, or `GetProperty("type").GetString()`.** A `null` tag becomes `Unknown(null)`; a missing tag throws `KeyNotFoundException`. → CS-JSON-07 tag gate plus C3c-C3d3.
19. **`OcxExitCode.Known.FirstOrDefault(...)`.** A missing code becomes `0 Success`. → CS-JSON-22.
20. **`required` members on a flattened union base, then `[SetsRequiredMembers]` to silence CS9035.** → CS-JSON-18.
21. **Hallucinated APIs:** `JsonKnownNamingPolicy.SnakeCase`, `JsonSourceGenerationMode.FastPath`, `TypeInfoName`, `JsonUnknownEnumHandling`, `AllowUnknownEnumValues`. → the first `dotnet build` (CS0117/CS0246) [SG halluc, FB AI 15].
22. **Holding a `JsonElement` from a disposed `JsonDocument`** in the `Unknown` arm. → read `Raw` after the call in the C3 case.
23. **Treating exit 0 from `PublishAot` as proof, or suppressing IL2026 to silence it.** → CS-JSON-04/17.
24. **`GenerationMode = Serialization` "for performance".** The context then cannot deserialize. → CS-JSON-03 round-trip.
25. **Adopting C# 15 `closed` or `InferClosedTypePolymorphism` as the modern union.** It is CS8652 on 10.0.401 and throws on unseen tags. → CS-JSON-07 rg.

## Failure classes

| Class | Mechanism | Modes | Check that catches the class |
|---|---|---|---|
| A. Closed-world assumption on an open contract | the code treats ocx's value set, tag set, key set or exit set as complete | 1, 4, 5, 10, 14, 25 | RS0030 `BannedSymbols.txt` + the CS-JSON-02/05/07/19 rg gates + conformance `synthetic_unknown_*` replay (CS-JSON-12) |
| B. Silent default instead of refusal | STJ or LINQ fills a default where the wire disagreed (missing key, name or case mismatch, foreign-options drop, null into non-nullable, last-wins duplicate, `default(OcxExitCode)`) | 6, 9, 17, 19 | `required` + `RespectNullableAnnotations` + `AllowDuplicateProperties=false` + the schema-diff test + CS-JSON-22 + tests asserting a *non-default* value from a captured payload |
| C. Compile-green, run-red under trim/AOT | reflection or dynamic code reached at run time, or a registration missing | 2, 15, 23, 24 | IL2026/IL3050 errors + reflection-disabled tests + the arm-table loop + running the AOT smoke binary |
| D. Error taxonomy leak or mislabel | the wrong exception type or the wrong check order at the seam | 12, 13, 22 | one decode seam (CS-JSON-09) + `catch (OcxException)` tests on truncated, null and skewed output |
| E. TFM/era drift | an API from the wrong framework or an imagined API | 16, 21, 25 | build every TFM + the package line + `LangVersion` below 15 + compile |
| F. Newtonsoft/.NET Framework idiom transfer | another serializer's semantics carried over | 11 | CS-JSON-16 rg + `dotnet list package` |
| G. Failure-path masking | a stdout problem or the document's own fields replace the process outcome (exit code, report) | 3, 8 | CS-JSON-20/21 gates + the E5-E11 and R1-R8 outcome tests with Ocx.Fake real exit codes |
| H. Per-copy drift and over-modelling | rules copied per union, or a moving value list frozen into types, so one copy or one release breaks | 7, 14, 18, 20 | one shared converter (CS-JSON-07 gates) + the table-driven schema diff (CS-JSON-11) + CS-JSON-18/19 gates |

## Open questions

**Owner decisions:**
1. **Minimum ocx.** No released ocx carries `contract`; 0.6.5 has no `schema_version` [CLI :25]. Choose between:
   - (a) waiting for the first contract release as the SDK floor, which is the [EXC §3 item 4] default;
   - (b) also supporting 0.6.5 with a frozen legacy model set and table.
2. **Does ocx count "required → optional" as a version bump?** `machine-interface.md` does not say. If it does not, the SDK's `required` members can break on a non-bumped release. Ask ocx before freezing CS-JSON-08 strictness [FB contested].
3. **Hand-written models versus an ocx-owned `ocx_sdkgen` C# backend.** The surface is 56 roots and about 970 properties. The diff test gates either path, and the backend would emit arm tables, not converters. Scheduling it is the owner's call [FB F9, ED F6].
4. **AOT RID matrix scope for CS-JSON-04.** Only linux-x64 was measured.
5. **The public type of `PartialReport`** (with csharp-api, before 1.0):
   - `object?` is adopted here and needs only a pattern match;
   - a shared `abstract class OcxReport` base for the 56 roots would type it and give `schema_version` one home.
   - Adding the base later is binary-compatible only if no member is added to existing sealed report classes [ED Contested].

**Next research round:**
- **csharp-crossplatform AOT smoke and Windows exit status:**
  - Run the [CJ V5]/[ED V5] app as Native AOT on win-x64, osx-arm64 and linux-arm64.
  - Confirm through the real CS-PROC engine that a crashing child yields a negative `Process.ExitCode` on Windows that reaches `OcxExitCode` unchanged (E8 was shown only through the seam).

## Sub-artifacts

- [csharp-json-source-generation-and-trim.md](csharp-json/csharp-json-source-generation-and-trim.md): source generation is mandatory; context anatomy and the foreign-options trap; IsAotCompatible/IL IDs; netstandard2.0/net8 package facts; the Newtonsoft rejection; 12 red/green pairs including Native AOT runs.
- [csharp-json-forward-compatible-binding.md](csharp-json/csharp-json-forward-compatible-binding.md): the ocx contract facts; STJ defaults probe (O1-O113); the per-case policy table; the open-enum and tag-first union shapes; Strict/Disallow placement; the handshake; the schema-diff test design with 9 planted twins; the net8 floor; Meziantou MA0222-MA0225.
- [csharp-json-error-document-and-generic-unions.md](csharp-json/csharp-json-error-document-and-generic-unions.md): the error document and its mapping to `OcxCommandException`; `OcxExitCode` as an integer open enum; exit-code authority and report_then_fail single-bind; one generic `TaggedUnionConverter<TBase>` measured against 13 hand-written converters (165 cases, 4 runtimes, AOT); the schema-diff extension with 11 planted twins.

## Key sources

- https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/source-generation
- https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/polymorphism
- https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/converters-how-to
- https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/missing-members
- https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/required-properties
- https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/nullable-annotations
- https://learn.microsoft.com/en-us/dotnet/api/system.text.json.jsonserializeroptions.gettypeinfo
- https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/libraries
- https://learn.microsoft.com/en-us/dotnet/api/system.text.json.jsonserializeroptions.strict
- https://learn.microsoft.com/en-us/dotnet/core/deploying/native-aot/
- https://github.com/dotnet/runtime/blob/v10.0.0/src/libraries/System.Text.Json/src/System/Text/Json/Serialization/Metadata/DefaultJsonTypeInfoResolver.Converters.cs
- https://github.com/meziantou/Meziantou.Analyzer/blob/main/docs/Rules/MA0222.md
- https://azure.github.io/azure-sdk/dotnet_introduction.html
- https://ocx.sh/docs/reference/machine-interface
- https://github.com/ocx-sh/ocx/tree/774a1ce760d0/crates/ocx_schema/tests/golden

## Revision log

- 2026-10-11, revision 2 (folds in csharp-json-error-document-and-generic-unions):
  - **CS-JSON-07 changed in place.** It moved from one hand-written converter per union to one shared internal `TaggedUnionConverter<TBase>` plus arm tables. The base is `abstract class` + `internal` ctor (was `abstract record` + `private protected`), per [API CS-API-08]. Arms bind through the non-generic `GetTypeInfo(Type)`. Why: byte-identical output on 165 cases x 4 runtimes at +1 KB, and the table drives the diff [ED F6].
  - **CS-JSON-05 changed in place.** The shape is now `readonly record struct` per [API CS-API-07] (was "open `readonly struct`" with the [SHAPE §5.3] member set). It gains the integer variant `OcxExitCode` with `OpenIntEnumConverter<T>` (number + int32 only), and the gate gains `enum ...Exit`. Why: [ED F2, V10].
  - **CS-JSON-03 extended in place** with the arm-table registration loop. Why: a missing arm registration is `NotSupportedException` on one tag only [ED V4].
  - **CS-JSON-09 changed in place.** The seam peeks by a `Utf8JsonReader` skim (was `JsonDocument.Parse`). It applies the contract/decode mapping only on exit 0 or an accepted code. The exceptions are renamed. Why: the exit-code authority [ED F4, F5] and the byte-input fit.
  - **CS-JSON-11 extended in place.** The diff covers `errors.json` and `cli.json` and adds the union-unmapped/-extra/-schema-inconsistent, arm-unregistered, exit-*, kind-*, detail-exit-unknown, error-body-required, root-looks-like-error-document and rtf-* classes. Its exit classes are CS-ERR-02's drift test. Why: [ED F7, V12].
  - **CS-JSON-12 updated.** The corpus has 35 cases at `774a1ce760d0`, and the error-document synthetics are named. Why: [ED F1].
  - **CS-JSON-02 and CS-JSON-13 clarified:**
    - CS-JSON-02 gains a `Converters.Add(` ban; the attribute-only options block is unchanged.
    - CS-JSON-13 notes that the generic converter honours the strict copy by construction.
    - Why: [ED S4-S6].
  - **Exception names corrected in place** in Verdict 5/6, the policy table and CS-JSON-09/10:
    - `OcxParseException` → `OcxDecodeException`;
    - `OcxVersionException` → `OcxContractException`;
    - Why: [API CS-ERR-01] fixed the five leaves after the first consolidation.
  - **New rules CS-JSON-18 to CS-JSON-22:**
    - CS-JSON-18: flattened-union base.
    - CS-JSON-19: error document binding and no slug constants.
    - CS-JSON-20: exit-code authority.
    - CS-JSON-21: skim-classify, single bind and a typed `PartialReport`.
    - CS-JSON-22: no `FirstOrDefault` over open record structs.
    - Why: [ED F1-F6], with gates watched in [CJ2].
  - **Property delta to csharp-api replaced.** The `OcxVersionException` integer properties are withdrawn. Four items are flagged instead: `PartialReportJson` → `object? PartialReport`, dropping `NotSupportedException` from CS-ERR-01/04, CS-ERR-04's seam gate (measured red on the correct layout) and the CS-ERR-08 `ToString` clause.
  - **Open questions:**
    - Removed the answered rounds `csharp-json-union-converter-generalisation` and `csharp-json-error-document-and-integer-enums`.
    - Added owner decision 5 (the `PartialReport` type).
    - Folded the Windows exit-status gap into the crossplatform round. The gaps moved to Verdict 13.
  - **Failure modes and classes:** modes 3, 7, 8, 14, 18, 19 and 20 added, and the list re-ranked. Classes G (failure-path masking) and H (per-copy drift and over-modelling) added.
