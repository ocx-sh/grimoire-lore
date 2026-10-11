---
title: "Forward-compatible binding of ocx JSON reports with System.Text.Json"
topic: "csharp-json / csharp-json-forward-compatible-binding: How must models bind so a newer ocx never breaks an older SDK?"
agent: "deep-dive researcher (sonnet subagent, research-lang csharp, wave 1)"
model: claude-sonnet-5-5
date_researched: 2026-10-11
sources_count: 27
scope: |
  Covers: STJ defaults for unknown members, case, numbers, null, duplicates; the open-enum shape; unknown union tags; absent vs null vs required;
  Strict / Disallow / AllowDuplicateProperties for a consumer of a growing contract; schema_version + the `contract` handshake and what it refuses before spawning;
  the schema-diff test (port of the Python phantom/unsafe test); generated vs hand-written models; Meziantou MA0222-MA0225 and companion gates; net8 floor vs net10 vs net11 RC1.
  Not covered: source-generation/trim/AOT mechanics beyond the flags that decide policy (sibling topic csharp-json-source-generation-and-trim), process spawning and exit codes
  (csharp-process-*), NuGet packaging, serialization (write) of requests, error-document taxonomy beyond its binding shape.
  Evidence base: ocx origin/main 246863abc1d4 (unreleased contract), ocx-sdk-python 80136dde4162, .NET SDK 10.0.401 / 8.0.425 / 11.0.100-rc.1.26425.128, fixtures under
  /home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-json-forward-compatible-binding/.
---

# Forward-compatible binding of ocx JSON reports with System.Text.Json

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   - [F1 What the ocx contract promises (the ground truth to bind to)](#f1-what-the-ocx-contract-promises)
   - [F2 System.Text.Json defaults: what is forward-compatible for free, what silently is not](#f2-stj-defaults)
   - [F3 The per-case policy table](#f3-the-per-case-policy-table)
   - [F4 The open-enum shape](#f4-the-open-enum-shape)
   - [F5 Tagged unions and unknown tags](#f5-tagged-unions-and-unknown-tags)
   - [F6 Absent vs null vs required](#f6-absent-vs-null-vs-required)
   - [F7 Strict, Disallow, AllowDuplicateProperties: right and wrong places](#f7-strict-disallow-allowduplicateproperties)
   - [F8 schema_version, the `contract` handshake, what is refused before spawning](#f8-schema_version-and-the-handshake)
   - [F9 The schema-diff test and the generated-vs-hand-maintained decision](#f9-the-schema-diff-test)
   - [F10 TFM reach: net8 floor, net10 target, net11 RC1](#f10-tfm-reach)
   - [F11 Gates: MA0222-MA0225, RS0030, CA1869, IL2026/IL3050, reflection switch](#f11-gates)
   - [F12 Verified on the toolchain](#f12-verified-on-the-toolchain)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- ocx's contract is explicitly additive: a new property, root, enum value, union variant, command or flag never bumps a version, and consumers "ignore unknown keys"; only removal, rename, retype or meaning change bumps an integer. Bind to that: skip unknown members, never close an enum, never close a union.
- STJ already skips unknown members and is case-sensitive by default (probe O1, O4). The default is the right runtime posture; do not add `JsonUnmappedMemberHandling.Disallow` or `JsonSerializerOptions.Strict` to the production decode path (a one-property addition then throws, cases C1 under `policy-strict`).
- `JsonStringEnumConverter` and `JsonStringEnumConverter<T>` throw `JsonException` on an unseen value, accept any letter case and (default ctor) any integer including undefined ones (O21-O24). Never use them for a wire enum.
- Model every ocx `x-ocx-enum` as a `readonly record struct` wrapping the wire string, implementing a static-abstract `IOpenEnum<T>` and a string-only generic converter. Compare with `Ordinal` (record-struct equality does); never `OrdinalIgnoreCase` / `InvariantCultureIgnoreCase` (OpenAI and Octokit do; ocx values are case-significant snake_case).
- Success checks on an open enum are an allow-list (`IsOk => this == A || this == B`). "not Failed" is a fail-open bug the machine-interface page forbids by name.
- `[JsonPolymorphic]` cannot express ocx unions: an unseen tag throws unless `IgnoreUnrecognizedTypeDiscriminators = true`, which then also swallows a missing tag, a numeric tag and a wrong-case tag into the same silent base type (O62, O63, O72, O74); `UnknownDerivedTypeHandling` is a serialization-only knob (O69). Use a custom `JsonConverter<TBase>` that reads `type` first: no string `type` is an error, an unregistered tag is an `Unknown` arm that keeps tag and raw object, a registered tag with a bad payload is an error.
- ocx never sends `null` for unset (absent means unset); `null` appears only in publisher `OpaqueJson`. Bind schema-`required` keys as C# `required` members, schema-optional keys as nullable, and set `RespectNullableAnnotations = true` so an explicit null in a required slot is refused (O10 silent, O11 throws). `required` and non-nullable are orthogonal in STJ: `RespectNullableAnnotations` alone does NOT reject an absent key (nullable-annotations doc; O8, O15).
- Null *elements* inside collections are not enforced even with `RespectNullableAnnotations` (O111). The contract has none; keep it that way by never putting publisher data in typed lists.
- `JsonSerializerOptions.Strict` (net10) is a read-only singleton marked `RequiresUnreferencedCode`/`RequiresDynamicCode`: no converters can be added (O54, InvalidOperationException) and it breaks `IsAotCompatible` (IL2026/IL3050). Use `new JsonSerializerOptions(JsonSerializerDefaults.Strict) { ... }` or source-gen attribute properties when a strict mode is wanted (tests).
- Strictness belongs on the producer side of a contract you own, in tests, and for files the SDK authors itself (GitVersion, BenchmarkDotNet use `Disallow` on their own config/result files). A strict-mode replay of real ocx output in CI is the cheap drift alarm; it is wrong at runtime.
- Peek `schema_version` before binding. Binding first turns a v2 payload with a new shape into a generic decode error that hides the real cause (replay `--bind-first` red). Refuse with a typed `ContractMismatch`.
- Handshake once per binary with `ocx --format json version`; no `contract` key means `UnsupportedBinary` (0.6.5 prints no `contract` and no `schema_version`, captured). Verify per call, before spawn: error-document version, the command's version, each output root's version, by integer equality; ignore every addition on the binary side.
- Port the Python wire-contract test, with one more failure class: reflect the C# model through STJ metadata (`JsonTypeInfo.Properties[].IsRequired`) and diff against `reports.json` for phantom, unsafe, lossy and missing-required keys, plus JSON kind, `x-ocx-enum` values, union tags, the unknown-variant arm and `schema_version` const. It ran red on 9 planted defects and green on the real golden.
- Hand-maintain the C# models now, gated by that test; do not point a generic schema-to-C# generator at `reports.json`. The ocx ADR measured the equivalent Rust generator (typify) emitting 0 of 13 tagged unions; an owned `ocx_sdkgen` C# backend is the generated path and the same diff test must gate its output.
- net8.0 (floor) lacks `RespectNullableAnnotations`, `RespectRequiredConstructorParameters`, `AllowOutOfOrderMetadataProperties`, `AllowDuplicateProperties` and `Strict`; multi-target and add `System.Text.Json` 10.x to the net8.0 asset (builds red without it, green with it, all replay cases pass on .NET 8.0.31).
- C# 15 `closed` (preview on SDK 10.0.401, CS8652; compiles on 11.0 RC1) plus `InferClosedTypePolymorphism` throws on an unseen tag (K2) and so is wrong for wire unions unless the `Unknown` arm is a registered member of the closed hierarchy and a custom converter does the dispatch. Treat as .NET 11 / GA-November item, not default.
- Turn on the gates: Meziantou MA0222-MA0225 (off by default, warning, they only demand an explicit choice), a `BannedSymbols.txt` (RS0030) for `JsonStringEnumConverter`, `JsonSerializerOptions.Web`, `.Strict` and reflection `Deserialize<T>(string, options)`, CA1869, and `JsonSerializerIsReflectionEnabledByDefault=false`.

## Findings

### F1 What the ocx contract promises

Facts bound to, all from ocx `origin/main` at `246863abc1d4` (the contract is unreleased; the installed 0.6.5 has none of it, see F8).

- Roots and absence: every document is an object with `schema_version` first; "Absent means unset ... `null` never stands for 'unset'. Publisher-supplied JSON ... passes through unchanged and may contain `null`." Unions carry `type`. ([ocx@246863abc1d4:website/src/docs/reference/machine-interface.md:15-22](https://github.com/ocx-sh/ocx/blob/246863abc1d4/website/src/docs/reference/machine-interface.md), read via `git show origin/main:`.)
- Versioning rule: `schema_version` names one document's shape, `contract` (in `ocx --format json version`) names all of them; a version increases only for removal/rename of a property, root, enum value or union variant, a type change, or a changed meaning; "Additions do not change a version ... A program that ignores unknown keys keeps working across additions." (same file, `## Versions`, line 33 onward.)
- Open values: "Enum values and union variants are open ... An unknown `status` is not success. Checks for success compare against the known success values and fail closed. A check written as 'not `failed`' treats a future failure value as success. An unknown union variant is skipped, not guessed." (same file, `## Open Values`, lines 55-61.)
- The published schema encodes it: the schemas "allow unknown properties"; open enums are `type: string` plus the vendor keyword `x-ocx-enum`; each of 13 unions ends in an arm carrying `x-ocx-unknown-variant` whose `type` is `not: {enum: [known tags]}`; one `x-ocx-opaque` marks publisher JSON. Measured over the golden with `python3 -I` on `git show origin/main:crates/ocx_schema/tests/golden/reports.json` (saved as `schema/reports.main.json`): 56 roots (50 at `schema_version` 1, 6 at 2), 284 `$defs`, 654 required and 317 optional properties, 45 `x-ocx-enum` defs, 13 unknown-variant unions, **0 nullable properties** (no `type: [T,"null"]`, no `anyOf` with `null`). `ExitCode` in `errors.json` is an *integer* `x-ocx-enum`. ([JSON Schema object reference](https://json-schema.org/understanding-json-schema/reference/object) states the baseline: "By default any additional properties are allowed" and properties are optional unless listed in `required`.)
- There is **no "absent marker" keyword**. The briefed `x-ocx` absent marker does not exist at this commit; absence is encoded by omission from `required` (`grep -o 'x-ocx-[a-z-]*'` over the golden prints only `x-ocx-enum`, `x-ocx-unknown-variant`, `x-ocx-opaque`). `ocx_sdkgen`'s subset allow-lists exactly those three plus the standard keywords ([ocx@246863abc1d4:crates/ocx_sdkgen/src/subset.rs:11-58](https://github.com/ocx-sh/ocx/tree/246863abc1d4/crates/ocx_sdkgen/src), per the python-sdk digest).
- The `*Root` pattern: a report schema `X` is the payload and `XRoot` adds `schema_version` (`UpdateCheckData` required `['status']` vs `UpdateCheckDataRoot` required `['schema_version','status']`). Map C# models to the `*Root` def.
- ocx ships a language-neutral conformance corpus: 33 cases under `crates/ocx_schema/contract/conformance/` with `expect.json` keys `root`, `exit_code`, `decode: ok|refused`, `error: contract_mismatch`, `unknown` (JSON pointers that must land in an Unknown arm), `fields`, `absent`. Replay it from the C# test suite ([ocx@246863abc1d4:crates/ocx_schema/contract/conformance/README.md](https://github.com/ocx-sh/ocx/tree/246863abc1d4/crates/ocx_schema/contract/conformance)). The fixture's `replay` project ran the 8 cases whose roots were modelled: all pass.
- The pattern is Fowler's Tolerant Reader: "take only the elements you need, ignore anything you don't", keep parsing in one place ([TolerantReader](https://martinfowler.com/bliki/TolerantReader.html)); his caveat that "schema validation offers a false sense of security" is why the diff test pins presence and registries and leaves value validation to STJ.
- Open enums are the proven default elsewhere: protobuf proto3/editions use open enums "specifically because of the unexpected behavior that closed enums cause" ([protobuf enum guide](https://protobuf.dev/programming-guides/enum/)); the Azure SDK guideline allows "a `readonly struct` in place of an `enum` ... [that] can contain unknown values returned from the service" ([Azure .NET guidelines](https://azure.github.io/azure-sdk/dotnet_introduction.html)).

### F2 STJ defaults

Everything below was observed (probe `probe/Program.cs`, .NET 10.0.12 unless marked); O-numbers are the probe line ids. Docs: [unmapped members](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/missing-members), [required](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/required-properties), [nullable annotations](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/nullable-annotations).

| Concern | Default behaviour | Evidence | Forward-compat verdict |
|---|---|---|---|
| Unknown member | skipped: "they're simply ignored" | doc; O1 `{"a":1,"extra":2}` -> `Plain(A=1)` | right default |
| `Disallow` (`[JsonUnmappedMemberHandling]` or `options.UnmappedMemberHandling`, net8+) | `JsonException: The JSON property 'extra' could not be mapped ...` | doc; O2 | breaks on any addition |
| `JsonSerializerOptions.Strict` (net10) | Disallow + no duplicates + case-sensitive + `RespectNullableAnnotations` + `RespectRequiredConstructorParameters` | .NET 10 what's-new; runtime `JsonSerializerOptions.cs:180-186`; O3 throws on the extra key | breaks on any addition |
| Property-name case | **case-sensitive**: `{"A":1}` into `a` -> `A=0`, no error | O4 | right default; a missing naming policy is a silent all-defaults bug unless members are `required` |
| `JsonSerializerOptions.Web` | case-insensitive names, camelCase, numbers from strings (`"7"` -> 7) | O5, O6; runtime `:165-175` | wrong for ocx: widens what is accepted |
| Missing non-required value member | default value, silently (`int` -> 0, `string` -> null) | O8, O15 (`CtorRec(Name=<null>, Age=0)`) | wrong for required keys |
| Missing `required` / `[JsonRequired]` member | `JsonException: ... was missing required properties including: 'name'` | doc; O9, O80 | the tool for schema-required keys |
| Explicit `null` into non-nullable reference type | silently sets null | O10 | wrong; fix with `RespectNullableAnnotations` (net9+) |
| same, `RespectNullableAnnotations = true` | `JsonException: ... doesn't allow setting null values` | O11; works for generic constructed property types like `IReadOnlyList<string>` (O110) | right |
| Explicit `null` into `int` | `JsonException` | O12 | fine |
| `null` element inside a list | accepted even with the flag ("collection element types" not enforced) | doc limitation list; O111 | known hole; contract has none |
| `int?` absent vs `null` | indistinguishable (".NET doesn't have an `undefined` concept") | doc; O14 | irrelevant for ocx (never emits null for unset) |
| Number: `long` 2^53-1 and 2^63-1 | exact | O40, O41 (ocx pins 2^53-1 in `synthetic_size_max_safe_integer`) | fine |
| Number: 2^63, `1.0`, `1e2` into `long`, 3e9 into `int` | `JsonException` | O42-O45 | a retype is a contract break anyway |
| Numbers as strings | rejected (default), accepted under `Web` / `AllowReadingFromString` | O7, O6 | keep `JsonNumberHandling.Strict` |
| `double` given integer `5` | accepted | O46 | fine |
| Timestamps | `DateTimeOffset` takes 9 fractional digits, fails at 17 | O48, O49 | keep `string` (schema says `string`) |
| Duplicate keys | last wins | O17 (`A=2`), O100 | `AllowDuplicateProperties = false` (net10) throws: O18, O101, O102 |
| `schema_version` | an ordinary int; **never checked by STJ** | O81 (`schema_version:2` binds fine) | must be checked by the decoder (F8) |
| Trailing second document / BOM / empty / `[]` for object | `JsonException` each | O90, O91, O92, O94 | stdout must be exactly one document; ocx promises it |
| Exception messages | omit the offending value by design ("We generally don't output payload information in exception messages", maintainer, [dotnet/runtime#113756](https://github.com/dotnet/runtime/issues/113756), closed not planned) | issue; O21 message ends at `Path: $.status` | wrap and add `JsonException.Path` yourself, never echo stdout |

`JsonNamingPolicy.SnakeCaseLower` exists from .NET 8 ([customize-properties](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/customize-properties), footnote `*`): `Sha256Digest` -> `sha256_digest`, `XMLReader` -> `xml_reader` (O31, O33) but `OsFeatures` -> `os_features` while the wire key is `os.features` (O30, `conformance/captured_about/instance.json`), so dotted keys need `[JsonPropertyName]`. `JsonNamingPolicy.PascalCase` is .NET 11 only and turns `os_features` into `Os_Features` (K5): not a snake_case inverse.

### F3 The per-case policy table

Five payloads, taken from ocx's conformance corpus (or one mutation of a captured instance), each bound by a naive model and by the policy model (`lib/Naive.cs` vs `lib/Models.cs`), then again under Strict (`cases/Program.cs`). Observed (`dotnet run -- <binder>`, see F12):

| # | Payload | Correct behaviour | naive (CLR enum + `JsonStringEnumConverter`, settable props, `[JsonPolymorphic]`, defaults) | policy | naive + Strict | policy + Strict |
|---|---|---|---|---|---|---|
| C1 | added field (root and nested, `synthetic_unknown_property`) | decode, ignore it | PASS | PASS | **FAIL** threw `JsonException` | **FAIL** threw (`OcxDecodeException`) |
| C2 | unseen enum value (`status: "paused_by_aliens"`) | decode; keep raw string; not known; not success | **FAIL** threw `JsonException` on legal input | PASS | FAIL | PASS |
| C3 | unknown union tag (`skipped_reason.type: "gravity_failure"`) | decode; Unknown arm keeps tag | **FAIL** threw `Read unrecognized type discriminator id` | PASS | FAIL | PASS |
| C4 | missing required key (`version` deleted) | refuse with a typed error | **FAIL** silent: `Version=""` | PASS refused `OcxDecodeException` | **FAIL** silent | PASS |
| C5 | explicit `null` in a required slot (`home: null`) | refuse | **FAIL** silent: `Home=null` | PASS refused | PASS (nullable flag on) | PASS |
| C5b | explicit `null` on an optional member (`shell: null`) | decode, treat as unset | PASS | PASS | FAIL (extra key) | PASS |

Exit codes of the harness: `naive` 4, `policy` 0, `naive-strict` 4, `policy-strict` 1. Strict fixes C4/C5 only for constructor-parameter records or via nullability, but gives up C1, the property that matters most for a growing contract. The decision table, one line per case:

| Case | Policy | Mechanism |
|---|---|---|
| Unknown member | accept, ignore | `UnmappedMemberHandling = Skip` stated explicitly |
| Unseen enum value | accept, keep raw string, `IsKnown == false`, never success | `readonly record struct` + `OpenEnumConverter<T>` (F4) |
| Unknown union tag | accept as `Unknown` arm (tag + `JsonElement` clone) | custom `JsonConverter<TBase>` (F5) |
| Union with no/!string `type`, or known tag with bad payload | refuse | same converter throws `JsonException` |
| Missing schema-`required` key | refuse | C# `required` + `RespectRequiredConstructorParameters` |
| Missing schema-optional key | accept, member is `null`/`default` | nullable member, no `required` |
| Explicit `null`, required slot | refuse | `RespectNullableAnnotations = true` |
| Explicit `null`, optional slot | accept as unset | nullable member |
| Wrong JSON kind (string for int, object for array) | refuse | STJ default |
| `schema_version` differs | refuse, typed `ContractMismatch`, before binding | peek in decoder (F8) |
| No `schema_version` | refuse | peek in decoder |
| Duplicate keys | accept (optionally refuse, F7) | default / `AllowDuplicateProperties = false` |

Every `JsonException` (and `NotSupportedException`, F5) is wrapped into an SDK exception under the SDK base type, because the Python SDK's skew failures were plain `ValueError` outside `except OcxError` ([python-sdk digest S3](../csharp-audit/python-sdk-digest.md)); the fixture's `OcxDecodeException` carries the inner exception and its `Path`.

### F4 The open-enum shape

**Decision: string-backed `readonly record struct` + static-abstract interface + one shared string-only converter.** An `enum` with `Unknown` (custom converter) loses the raw value; a class wrapper (Anthropic) pays an allocation and weak equality; `StringEnum<T>` (Octokit) pairs a CLR enum with a string and throws when the string is unknown.

```csharp
// Correct: lib/OpenEnum.cs + lib/Models.cs (net8+, source-generator and AOT safe: no reflection)
public interface IOpenEnum<TSelf> where TSelf : struct, IOpenEnum<TSelf>
{ string Value { get; } static abstract TSelf From(string value); }

public sealed class OpenEnumConverter<T> : JsonConverter<T> where T : struct, IOpenEnum<T>
{
    public override T Read(ref Utf8JsonReader r, Type t, JsonSerializerOptions o) =>
        r.TokenType == JsonTokenType.String ? T.From(r.GetString()!)
            : throw new JsonException($"{typeof(T).Name} expects a JSON string, found {r.TokenType}.");
    public override void Write(Utf8JsonWriter w, T v, JsonSerializerOptions o) => w.WriteStringValue(v.Value);
}

[JsonConverter(typeof(OpenEnumConverter<ConfigUpdateStatus>))]
public readonly record struct ConfigUpdateStatus(string Value) : IOpenEnum<ConfigUpdateStatus>
{
    public static readonly ConfigUpdateStatus Updated = new("updated");           // ...one per x-ocx-enum value
    public static IReadOnlyList<ConfigUpdateStatus> Known { get; } = [/* all statics */];
    public bool IsKnown => Known.Contains(this);
    public bool IsOk => this == AlreadyCurrent || this == Updated || this == Checked;   // allow-list, fails closed
    static ConfigUpdateStatus IOpenEnum<ConfigUpdateStatus>.From(string v) => new(v);
    public override string ToString() => Value ?? "";                              // default(struct).Value is null
}
```

```csharp
// Incorrect: compiles, passes the happy-path test, throws on the first newer ocx (C2, O21)
public enum ConfigUpdateStatus { NotConfigured, AlreadyCurrent, Updated }
options.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.SnakeCaseLower));
if (report.Status != ConfigUpdateStatus.Failed) { /* "success" */ }                  // fail-open even if it bound
```

Why `JsonStringEnumConverter` is wrong beyond throwing: reading is case-insensitive ("Reading is case insensitive", [API doc](https://learn.microsoft.com/en-us/dotnet/api/system.text.json.serialization.jsonstringenumconverter)) so `"Checked"` binds as `checked` (O22); the default constructor "allows integer values", so `1` binds and `99` binds as an undefined enum value (O23, O24); only `allowIntegerValues: false` fixes the second (O26). The runtime source shows the two gates (`AllowStrings`, `AllowNumbers`) and that a failed parse always `ThrowHelper.ThrowJsonException()` ([EnumConverter.cs:106-128, 186-188](https://github.com/dotnet/runtime/blob/v10.0.0/src/libraries/System.Text.Json/src/System/Text/Json/Serialization/Converters/Value/EnumConverter.cs)). There is no built-in unknown-name fallback: the only workaround offered in the tracker is a third-party converter (#113756 thread). The non-generic converter is also `RequiresDynamicCode` (IL3050); only `JsonStringEnumConverter<TEnum>` is AOT-safe ([customize-properties](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/customize-properties)).

Exemplar comparison (what real SDKs ship):

| Exemplar | Shape | Defects relevant to ocx |
|---|---|---|
| OpenAI `RealtimeResponseStatusReason` | `readonly partial struct`, 350 of them in the repo (files declaring `readonly partial struct ... : IEquatable`) ([openai__openai-dotnet@1f0e8829acac:OpenAI/src/Generated/Models/Realtime/RealtimeResponseStatusReason.cs:13-52](https://github.com/openai/openai-dotnet)) | `Equals` uses `StringComparison.InvariantCultureIgnoreCase` (`:47`) and the hash `InvariantCultureIgnoreCase` (`:50`): culture-sensitive and case-folding |
| OpenAI `ChatFinishReason` | **closed `enum`** (`OpenAI/src/Custom/Chat/ChatFinishReason.cs:43`) with `ToChatFinishReason` ending `throw new ArgumentOutOfRangeException(... "Unknown ChatFinishReason value.")` (`.../Generated/Models/Chat/ChatFinishReason.Serialization.cs:43`), called on the response path (`InternalCreateChatCompletionResponseChoice.Serialization.cs:134`) | the live counter-example: one SDK mixes both shapes and the closed one is a latent outage |
| Anthropic `ApiEnum<TRaw,TEnum>` | `record class` over `JsonElement Json` (`anthropics__anthropic-sdk-csharp@ae16e5933f39:src/Anthropic/Core/ApiEnum.cs:15,27`); `Value()` documented to give `(TEnum)(-1)` for unknown (`:63-68`) | `GetHashCode()` returns `0` (`:112`) next to a deep-equality `Equals`; reference type; unknown is silent `-1` |
| Octokit `StringEnum<TEnum>` | `struct` with `_stringValue` + cached `_parsedValue` (`octokit__octokit.net@7fa5b0fe4a18:Octokit/Models/Response/StringEnum.cs:11-16`) | `Value` throws `ArgumentException` for unknown (`:43-46,141-150`); `Equals`/hash `OrdinalIgnoreCase` (`:98,113`); the parsed cache makes a non-readonly mutable struct |
| Azure `RequestMethod` | `readonly struct`, `Equals` is `Ordinal` ([Azure__azure-sdk-for-net@32c48fc3d524:sdk/core/Azure.Core/src/RequestMethod.cs:11,119-121](https://github.com/Azure/azure-sdk-for-net)) | the comparison to copy; the clone has no `ExpandableStringEnum` file, guideline cited from the Azure page |

Keep the CLR `enum` for sets the *SDK* owns and closes (its own exit-category buckets, retry kinds), never for anything a registry or ocx can extend. `ExitCode` and similar integer `x-ocx-enum`s need the same shape over `int` (`OpenEnumConverter` variant reading `JsonTokenType.Number`); the fixture only built the string form.

### F5 Tagged unions and unknown tags

Observed behaviours of the attribute route (`[JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]` + `[JsonDerivedType]`, .NET 7+, [polymorphism doc](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/polymorphism)):

| Payload | Behaviour | Obs |
|---|---|---|
| known tag | derived type | O60 |
| unseen tag, default | `JsonException: Read unrecognized type discriminator id 'gravity_failure'` (source: `PolymorphicTypeResolver.cs:176-179`, `if (!IgnoreUnrecognizedTypeDiscriminators) ThrowHelper.ThrowJsonException_UnrecognizedTypeDiscriminator`) | O61 |
| **missing tag**, concrete base | **silently the base type** | O62 |
| unseen tag, `IgnoreUnrecognizedTypeDiscriminators = true`, concrete base | base type (works as an "Unknown" arm) | O63 |
| unseen **or missing** tag, `IgnoreUnrecognized...`, abstract base | `NotSupportedException ... must specify a type discriminator` (note: not `JsonException`) | O64, O65 |
| `"type": 5` or `"type": "OFFLINE"` with string tags, `IgnoreUnrecognized...` | silently the base type (indistinguishable from "missing") | O72, O74 |
| tag not first property | `JsonException: The metadata property is either not supported by the type or is not the first property` on net8 and net10; fixed by `AllowOutOfOrderMetadataProperties = true` which exists from .NET 9 | O66, O67, N2 |
| known tag, bad payload (`detail: 5`) | `JsonException` | O68 |
| discriminator kept in `[JsonExtensionData]` | no: the tag is consumed as metadata; the payload keys are kept | O70, O71 |
| `UnknownDerivedTypeHandling = FallBackToBaseType` | **no effect on deserialization of an unseen tag** (still throws); the enum governs *serializing* an undeclared runtime type | O69; doc: "Undeclared types will result in a runtime exception [on serialization]" |

Conclusions. (1) `UnknownDerivedTypeHandling` is a serialization setting; AI agents routinely reach for it to "handle unknown types" and it does nothing on the read path. (2) `IgnoreUnrecognizedTypeDiscriminators` produces an Unknown arm but erases the difference between "unseen tag" and "malformed union", the very distinction the machine-interface page needs ("skipped, not guessed" is for unseen *registered-shape* variants; a union without `type` is not a union). (3) ocx does not promise `type` is first (serde_json key order when a `Value` is serialized is alphabetical; `detail` sorts before `type`; the schema lists `detail` before `type` for `registry_probe_failed`), and net8 cannot reorder. So: **custom converter, read `type` first**. The fixture's `SkippedReasonConverter` (`lib/Models.cs`) buffers the object once with `JsonDocument.ParseValue`, requires a string `type`, dispatches a `switch` on the tag through source-generated `JsonTypeInfo`s, and for an unregistered tag returns `new UnknownSkippedReason(tag, root.Clone())` (`Clone` so the raw object outlives the disposed document).

```csharp
// Correct: tag first, three distinct outcomes (lib/Models.cs)
if (!root.TryGetProperty("type", out var t) || t.ValueKind != JsonValueKind.String)
    throw new JsonException("union without its tag is malformed, not unknown");
return tag switch { "offline" => root.Deserialize(PolicyContext.Default.OfflineSkip)!,
                    /* ...one arm per registered tag... */
                    _ => new UnknownSkippedReason(tag, root.Clone()) };   // unseen tag: legal, kept whole
// Incorrect: one attribute, three behaviours collapsed into one silent base type
[JsonPolymorphic(TypeDiscriminatorPropertyName = "type", IgnoreUnrecognizedTypeDiscriminators = true)]
[JsonDerivedType(typeof(OfflineSkip), "offline")]  public class SkippedReason { }   // O62, O72, O74
```

Replay of 11 union cases (all pass): known tag with/without payload; tag not first; unseen tag kept whole after the document is disposed; known tag with missing/mistyped payload, no tag, numeric tag, null tag, non-object union -> `OcxDecodeException` (never Unknown); `OFFLINE` -> Unknown (tag match is `Ordinal`). A subtlety the fixture settled: the `[JsonConverter]` on the abstract base is *not* picked up by the derived arm types, so `root.Deserialize(PolicyContext.Default.OfflineSkip)` does not recurse.

Exemplars on unknown tags: Stripe is split in one repo. `STJDiscriminatedUnionConverterFactory` throws `JsonException($"Unknown discriminator value '...'")` ([stripe__stripe-dotnet@dbdca6ba5efc:src/Stripe.net/Infrastructure/JsonConverters/STJDiscriminatedUnionConverterFactory.cs:94](https://github.com/stripe/stripe-dotnet)) while the V2 event converter falls back: `?? typeof(Events.UnknownEventNotification)` (`STJV2EventNotificationConverter.cs:43`); its default object converter keeps unknown properties in extension data or `reader.Skip()`s them (`STJDefaultConverter.cs:113,117`). The second pattern is the one to copy. C# 15 `closed` hierarchies + `[JsonPolymorphic(InferClosedTypePolymorphism = true)]` (.NET 11) give exhaustive `switch` without a default arm (compiled on 11.0 RC1, K4) but an unseen tag still throws (K2) and a missing tag throws `NotSupportedException` (K3): usable only if `Unknown` is one of the closed hierarchy's direct descendants *and* the converter above still does the dispatch ([closed keyword](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/closed)). On SDK 10.0.401 with `LangVersion 14` the keyword is `error CS8652: The feature 'closed classes' is currently in Preview` (fixture `closed10`).

### F6 Absent vs null vs required

ocx rule: key absent = unset; `null` only inside `OpaqueJson`. STJ facts: ".NET doesn't have an `undefined` concept, so both cases deserialize to `null`"; `RespectNullableAnnotations` throws for explicit `null` into a non-nullable member but "A **missing property** doesn't throw ... even for non-nullable properties"; "`System.Text.Json` treats required and non-nullable properties as orthogonal concepts" ([nullable-annotations](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/nullable-annotations)). So two switches are needed, and each answers a different question:

| Schema says | C# member | Absent key | Explicit `null` |
|---|---|---|---|
| in `required`, non-null type | `public required string Version { get; init; }` | `JsonException` (required) | `JsonException` (nullable flag) |
| not in `required` | `public string? Shell { get; init; }` | `null` = unset | `null` = unset (tolerated) |
| `OpaqueJson` | `JsonElement` (value kind `Null` is legal) | `ValueKind == Undefined` | `ValueKind == Null` (O50, O51) |

- `required` and `[JsonRequired]` are equivalent to the serializer; use the C# keyword unless a down-level language/version or JSON-only intent applies ([required-properties](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/required-properties)). The docs say source generation cannot compile `required`; on SDK 10.0.401 it does (`lib` builds with `required` + `init` records under `[JsonSerializable]`, `TreatWarningsAsErrors`), so that sentence is stale for net8+ generators. For positional records set `RespectRequiredConstructorParameters = true` (net9+; "Prior to .NET 9 ... all constructor parameters as optional", O15 vs O16).
- Nullable *value* members (`bool? Drift`) cannot tell absent from `null` (O14); fine for ocx, wrong for any future patch-style request body (use `JsonElement?` or an `Optional<T>`; not needed now).
- Collections: a non-nullable `IReadOnlyList<string>` property rejects an explicit `null` (O110) but accepts `["a", null]` (O111, documented limitation: "Collection element types ... `List<string>` and `List<string?>` ... are indistinguishable"). Keep publisher-controlled data out of typed lists.
- Python's three-row rule, which is the language-neutral artefact to keep ([ocx-sdk-python@80136dde4162:tests/fixtures/contract/README.md](https://github.com/ocx-sh/ocx-sdk-python)): `T` (always written, non-null) -> required; `Option<T>` always written with `null` when unset -> required but nullable; `Option<T>` + `skip_serializing_if` -> optional. **At the pinned golden there is no second row**: 0 nullable properties, so every property is either `required` or omitted-when-unset. If a later golden reintroduces `type: [T,"null"]`, model it `required` + nullable (`required string? X`) and let the diff test's kind check (F9) and a new `nullable-new` class flag it.

### F7 Strict, Disallow, AllowDuplicateProperties

What they are (runtime source, `v10.0.0`): `JsonSerializerOptions.Strict` is a read-only shared singleton (`JsonSerializerOptions.cs:68-73`) built by `JsonSerializerDefaults.Strict` which sets `UnmappedMemberHandling = Disallow`, `AllowDuplicateProperties = false`, `RespectNullableAnnotations = true`, `RespectRequiredConstructorParameters = true` and, by omission, keeps names case-sensitive (`:180-186`); `AllowDuplicateProperties` defaults to `true` and "If set to false, `JsonException` is thrown when a duplicate property name is encountered" (`:856-873`); both are .NET 10 ([what's new](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/libraries)). The preset "is read-compatible with Default". Facts that bite:

- `Strict.Converters.Add(...)` -> `InvalidOperationException: ... read-only` (O54, `Strict.IsReadOnly == True` O56). To combine strict with `OpenEnumConverter`s use `new JsonSerializerOptions(JsonSerializerDefaults.Strict) { Converters = {...} }` (O55 shows the four flags carried over and case-insensitivity off). With `[JsonConverter]` on the types, no option-level converters are needed at all.
- The `Strict` *property* carries `RequiresUnreferencedCode` and `RequiresDynamicCode` ([API page](https://learn.microsoft.com/en-us/dotnet/api/system.text.json.jsonserializeroptions.strict)); in an `IsAotCompatible` project it fails the build with `IL2026` and `IL3050` (fixture `aot/red`). The `JsonSerializerDefaults.Strict` *value* with `TypeInfoResolver = Ctx.Default` is clean (`aot/green`).
- `[JsonUnmappedMemberHandling(Disallow)]` on a type that also has `[JsonExtensionData]` throws at first use: `InvalidOperationException ... conflicts with extension data property` (O53).
- Source-gen attribute equivalents exist for everything: `JsonSourceGenerationOptions` has `UnmappedMemberHandling`, `RespectNullableAnnotations`, `RespectRequiredConstructorParameters`, `AllowDuplicateProperties`, `AllowOutOfOrderMetadataProperties`, `UseStringEnumConverter`, and a `(JsonSerializerDefaults)` constructor ([JsonSourceGenerationOptionsAttribute.cs:27,126,131,141,167,177](https://github.com/dotnet/runtime/blob/v10.0.0/src/libraries/System.Text.Json/Common/JsonSourceGenerationOptionsAttribute.cs)). Passing your own `JsonSerializerOptions` to the context constructor replaces the attribute ([source-generation](https://learn.microsoft.com/en-us/dotnet/standard/serialization/source-generation) page text: "the supplied instance will be used instead of the options specified by `JsonSourceGenerationOptionsAttribute`").

Where strictness is **right** (all with a producer or an owner on the other side):
1. A CI test that replays *recorded real ocx output* (and the conformance corpus) through the models under `Disallow` to alarm on keys the SDK does not yet bind. It must run on the schema-refresh PR, never at runtime. Stripe tests the opposite property with the same instrument: a test that proves its deserializer ignores a hostile global `MissingMemberHandling.Error` ([stripe__stripe-dotnet@dbdca6ba5efc:src/StripeTests/Infrastructure/JsonUtilsTest.cs:18-30](https://github.com/stripe/stripe-dotnet)).
2. Files the SDK or a sibling tool authors and owns: GitVersion validates its own config with `UnmappedMemberHandling = Disallow` ([GitTools__GitVersion@5057cdbcc177:src/GitVersion.Configuration/ConfigurationMigrationService.cs:10](https://github.com/GitTools/GitVersion)); BenchmarkDotNet reads its own result files with `Disallow` and `RespectNullableAnnotations = true` ([dotnet__BenchmarkDotNet@61ebda8a50ae:src/BenchmarkDotNet/Serialization/BdnJsonSerializer.cs:23-27](https://github.com/dotnet/BenchmarkDotNet)). For ocx: the SDK's own request/config documents and the vendored `reports.json` loader.
3. `AllowDuplicateProperties = false` on ocx stdout is harmless to forward compatibility (a growing contract never legitimately repeats a key; probe O100-O102 show it throws for nested duplicates) and is a tripwire for corrupted or concatenated output; it is net10 (or STJ 10.x package). Optional, low value: ocx emits typed structs, and publisher `OpaqueJson` is deduplicated by serde's map before it reaches stdout.

Where it is **wrong**: the production decode of any ocx report (additions throw: `policy-strict` C1), and any nested type (`Disallow` is per type, so one missed `[JsonUnmappedMemberHandling(Skip)]` re-introduces the break).

### F8 schema_version and the handshake

Protocol to copy from ocx's own Rust runtime ([ocx@246863abc1d4:crates/ocx_sdkgen/templates/rust/runtime.rs:299-330 handshake, 352-366 verify, 475-483 expect_version](https://github.com/ocx-sh/ocx/tree/246863abc1d4/crates/ocx_sdkgen/templates/rust)): `fetch_handshake` runs `--format=json version`, returns `Error::Unsupported{found, minimum}` when `contract` is absent, checks `VersionData`'s own `schema_version`, and caches; `verify(command, roots)` compares, **before the spawn**, the error-document version, the command's version and each output root's version for exact equality; `decode_report` re-checks the root's `schema_version` on every call. The Rust generator's `MINIMUM_OCX = "0.6.4"` (`rust.rs:27`) is wrong (neither 0.6.4 nor 0.6.5 has `contract`); the C# SDK must not copy a minimum it has not measured.

What the C# handshake refuses (verified by `replay`, all pass; the installed 0.6.5 payload is `conformance/captured_065_version.json`, captured with `ocx --format json version`):

| Input | Result | Spawns the command? |
|---|---|---|
| `version` document without a `contract` key (0.6.5: `{"version":"0.6.5","commit":...}`, no `schema_version`) | `OcxUnsupportedBinaryException` (checked on the raw JSON *before* binding; else the missing `schema_version` would read as a decode error) | no |
| `contract.errors` != compiled value | `OcxContractMismatchException("the error document")` | no |
| `contract.commands[cmd]` absent or != compiled | mismatch, names the command | no |
| `contract.reports[root]` absent or != compiled, for each output root of the call | mismatch, names the root | no |
| `VersionData.schema_version` != 1 | mismatch | no |
| additions: new command, new root, new key inside `contract`, a bump on a command this SDK does not call | accepted | yes |
| patch/minor `version` string differences | accepted (never compare `version` for compatibility) | yes |

Order matters inside `decode`: peek `schema_version` from the `JsonDocument`, compare, then bind. Binding first turns a v2 payload with a different shape into `OcxDecodeException` (the harness' `--bind-first` run is red: `v2 payload with new shape -> got OcxDecodeException (a decode error hides the version skew)`). Equality, not ranges, is what ocx's own runtime checks ("Only exact equality is checked ... each ocx contract bump forces an SDK release", digest §8 item 10); per-call verification limits the blast radius to the commands the caller actually uses. An SDK that wants to straddle a bump ships both models for that root (`reports/v1.json` and `reports/v2.json` are both live at the commit: 50 roots at 1, 6 at 2) and chooses by `contract.reports[root]`; do not invent ranges.

Exit-code interplay (from the machine-interface outcomes table, same file): read the exit code first; "Report, then fail" still prints a report root; a zero exit with an unknown-valued `status` is a failure for the program's purposes (the fail-closed `IsOk` predicate). The error document has `command`, `exit_code`, `error.kind`, optional `error.detail`, `error.message` ("Not stable: never match on it"), `error.context`; bind `kind`/`detail` as open strings and branch on them, never on `message`.

### F9 The schema-diff test

**Python design** ([ocx-sdk-python@80136dde4162:tests/unit/test_wire_contract.py](https://github.com/ocx-sh/ocx-sdk-python)): `_DEFS` (`:35`) maps each of 61 parsing structs to the schema defs it reads; `_resolve` (`:143-158`) folds `$ref`/`oneOf`/`anyOf` into `(every key, keys required in every non-null arm)`; three tests assert **phantom** (reads a key never published, `:181`), **unsafe** (`_need`s a key that may be omitted, `:189`) and **lossy** (reads with `.get` a key always written, `:197`, waived per struct with a reason in `_WAIVED`, `:121`); `test_every_parsing_struct_is_mapped` (`:172`) is a set-equality gate so a new parser with no row fails; `test_every_waiver_names_a_real_disagreement` (`:204`) fails stale waivers. Motivation recorded in the fixture README: three presence-rule inversions reached `main` from hand-written fixtures, one crashed `env()`. It has no check for a schema key the model **lacks**, and no JSON-kind check.

**C# port** (fixture `schemadiff/`, 141 + 100 lines, no packages): reflect the model through the source-generated contract instead of source text. `JsonSerializerContext.GetTypeInfo(type).Properties` yields, per member, the wire `Name`, `IsRequired`, `PropertyType`; the schema comes from the vendored golden. Failure classes and what the run printed:

| Class | Meaning | Planted twin | Output |
|---|---|---|---|
| `phantom` | model binds a key the schema never publishes | `reports.removed.json` (drops `AboutRoot.shell`) | `FAIL phantom About.shell` |
| `unsafe` | model `required`, schema optional | `bad` model: `required string Shell` | `FAIL unsafe About.shell` |
| `lossy` | schema `required`, model optional | `bad` model: `Platforms` nullable | `FAIL lossy About.platforms` (waive with a reason, as Python's `_WAIVED`) |
| `missing-required` (**new**) | schema requires a key the model lacks | `reports.build_id.json` (AboutRoot gains required `build_id`) | `FAIL missing-required About.build_id`; green once `AboutFixed.BuildId` exists |
| `unmodelled-new` (**new**) | new *optional* key not in `unmodelled-baseline.txt` | `reports.newopt.json` (`labels`) | `FAIL unmodelled-new UpdateCheckData.labels` |
| `stale-baseline` | baseline names a vanished key | (implemented, not planted) | |
| `kind` (**new**) | coarse JSON kind differs (string/integer/boolean/array/object) | `reports.retyped.json` | `FAIL kind About.version schema says integer, model binds string` |
| `enum-value-new` / `-stale` | `x-ocx-enum` values vs the struct's `Known` | `reports.enum.json` | `FAIL enum-value-new ConfigUpdateStatus schema value "paused"...` |
| `union-arm-new` / `-stale` / `union-closed` | oneOf `const` tags vs the converter's `Arms`; unknown-variant arm vanished | `reports.union_new.json`, `reports.union_closed.json` | `FAIL union-arm-new SkippedReason schema tag "quarantined"...`; `FAIL union-closed ... became closed` |
| `version` | root `schema_version` const vs `Contracts.Reports` | `reports.version.json` | `FAIL version ConfigUpdateData schema says 2, Contracts.Reports says 1` |
| `unmapped-type` / `unmapped-context` | a bound type with no `Map` row | (implemented) | the set-equality gate |

Run against the real golden the shipping models gave `failures=0` with 10 baselined unmodelled optional keys (`About.build`, `About.ci`, six `ConfigUpdateData.*`, `VersionData.build/ci`): the hand-written models were already consistent with the schema, and the test is how that stays true. Two design points: the union discriminator `type` is not a model property, so arm diffs ignore it and the tag set is diffed against `SkippedReasonConverter.Arms`; and mapping goes to the `*Root` defs so `schema_version` is checked as a normal required member.

**Generated vs hand-maintained models: decision = hand-maintained now, diff-test-gated; generation only through an ocx-owned backend.**
- Evidence against generic generators: the ocx ADR's go/no-go measured typify 0.8.0 over this very schema: "emits **0 of 13** unions as tagged", takes "the first arm that fits", silently mis-dispatches an unknown tag, and drops `type` on serialise ([ocx@246863abc1d4:.claude/artifacts/adr_ocx_interface_contract.md](https://github.com/ocx-sh/ocx/blob/246863abc1d4/.claude/artifacts/adr_ocx_interface_contract.md), "Go/no-go outcome (b)"). I did not measure any C# generator (NJsonSchema, Kiota, quicktype); the structural reasons (`x-ocx-unknown-variant` arm as a `not: enum` schema, `x-ocx-enum` on `type: string`, `oneOf` with sibling-field arms) apply to them too, but that is inference, not measurement.
- The owned path exists: `ocx_sdkgen` has an IR (`ir.rs`, 1152 lines) and a Rust backend that already emits "open scalar enums and tagged unions with an `Unknown` arm, a union decoder that reads `type` first (known tag + bad payload = error, not unknown)" and fail-closed `SUCCESS_STATUSES` ([ocx@246863abc1d4:crates/ocx_sdkgen/src/rust.rs:33-41](https://github.com/ocx-sh/ocx/tree/246863abc1d4/crates/ocx_sdkgen/src)). A C# backend would emit exactly the shapes in F4/F5; the ADR says other languages are "decided per SDK plan" and that backends "keep golden output and are compiled and integration-tested in its SDK's CI". If that backend is built, the schema-diff test stays as the gate on its output and on hand-added members.
- Size reality: 56 roots, 284 defs, ~970 properties. The Python SDK carries 64 hand-written dataclasses + 3,039 lines for the same surface (digest §4); the fixture's 12 models (about 180 lines) cover 4 roots. Hand-writing all 56 is real work, so the plan should phase roots by use and let the `Map` set-equality gate list what is still unmodelled.

### F10 TFM reach

Feature availability, each verified by compile or run:

| Capability | net8.0 inbox | net9.0 | net10.0 | net11.0 RC1 |
|---|---|---|---|---|
| unknown members skipped; `UnmappedMemberHandling`; `SnakeCaseLower`; `required`; `JsonPolymorphic` + `IgnoreUnrecognizedTypeDiscriminators` | yes (N1-N4, N6) | yes | yes | yes |
| `RespectNullableAnnotations`, `RespectRequiredConstructorParameters`, `AllowOutOfOrderMetadataProperties` | **no** (`CS0117`; N7: explicit null stays silent) | yes | yes | yes |
| `JsonSerializerDefaults.Strict`, `JsonSerializerOptions.Strict`, `AllowDuplicateProperties` | **no** (`CS0117`) | no | yes | yes |
| `JsonNamingPolicy.PascalCase`, `JsonNamingPolicyAttribute`, `InferClosedTypePolymorphism`, open-generic `[JsonDerivedType]` | no | no | no | yes ([customize-properties](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/customize-properties), [polymorphism](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/polymorphism)) |
| C# `closed` class | no | no | preview only (`CS8652` at `LangVersion 14`) | compiles with `LangVersion preview` |

Floor decision: the SDK needs the net9 flags on every TFM, so on `net8.0` reference the `System.Text.Json` package (10.0.x) from the `net8.0` asset only. Fixture `floor/`: `<TargetFrameworks>net10.0;net8.0</TargetFrameworks>` plus `<PackageReference Include="System.Text.Json" Version="10.0.0" />` conditioned on `net8.0`. Red without it: `CS0246: The type or namespace name 'RespectNullableAnnotations' could not be found` (the generator attribute properties are unknown). Green with it: the whole replay passes on `.NET 8.0.31`. The same four-flag set can also be switched globally by the runtime feature switches `System.Text.Json.Serialization.RespectNullableAnnotationsDefault` / `RespectRequiredConstructorParametersDefault` (`RuntimeHostConfigurationOption`, [nullable-annotations](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/nullable-annotations), [required-properties](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/required-properties)); do not rely on them in a library, a host app can flip them.

### F11 Gates

Meziantou.Analyzer 3.0.297 (cached package; same IDs in clone `meziantou__Meziantou.Analyzer@161b7e948ad3`):

| ID | Message (observed) | Category | Default | Flags |
|---|---|---|---|---|
| MA0222 | `Set RespectNullableAnnotations on [JsonSourceGenerationOptions]` | Design | **off** (`dotnet_diagnostic.MA0222.severity = none` in `default.editorconfig:659-660`); `warning` in `all-warnings.editorconfig` | reported on a `JsonSerializerContext` that does not set it, including one with no attribute |
| MA0223 | `Set RespectRequiredConstructorParameters on [JsonSourceGenerationOptions]` | Design | off (`:662-663`) | same |
| MA0224 | `Set RespectNullableAnnotations on the JsonSerializerOptions instance` | Design | off (`:665-666`) | `new JsonSerializerOptions()` not configuring it |
| MA0225 | `Set RespectRequiredConstructorParameters on the JsonSerializerOptions instance` | Design | off (`:668-669`) | same |

IDs at [RuleIdentifiers.cs:223-226](https://github.com/meziantou/Meziantou.Analyzer); README row `252-255`: severity warning, enabled-by-default no, code fix yes, configurable no. The rule docs state they "do not require a particular value: setting the option to `false` is a deliberate choice, and satisfies the rule as much as setting it to `true`" and that `JsonSerializerDefaults.Strict` "sets the option" ([MA0222](https://github.com/meziantou/Meziantou.Analyzer/blob/main/docs/Rules/MA0222.md), [MA0224](https://github.com/meziantou/Meziantou.Analyzer/blob/main/docs/Rules/MA0224.md)). They are explicitness gates, not strictness gates: they do **not** police `UnmappedMemberHandling`, enums, duplicates or discriminators. Turn them to `warning` (or `error` with `TreatWarningsAsErrors`) in the SDK's `.editorconfig`, then close the gap with `BannedSymbols.txt`:

```text
T:System.Text.Json.Serialization.JsonStringEnumConverter;wire enums are open: IOpenEnum<T> struct
T:System.Text.Json.Serialization.JsonStringEnumConverter`1;wire enums are open: IOpenEnum<T> struct
P:System.Text.Json.JsonSerializerOptions.Web;Web = case-insensitive + numbers from strings
P:System.Text.Json.JsonSerializerOptions.Strict;Disallow on a growing contract; tests use JsonSerializerDefaults.Strict explicitly
M:System.Text.Json.JsonSerializer.Deserialize``1(System.String,System.Text.Json.JsonSerializerOptions);bind through OcxDecode with a JsonTypeInfo<T>
```

(`Microsoft.CodeAnalysis.BannedApiAnalyzers` 5.6.0, `<AdditionalFiles Include="BannedSymbols.txt" />`, `dotnet_diagnostic.RS0030.severity = error`.) Other gates verified: CA1869 ("Avoid creating a new `JsonSerializerOptions` instance for every serialization operation") fires with `AnalysisLevel latest-all`; `IsAotCompatible` turns reflection overloads, `Strict` and the non-generic `JsonStringEnumConverter` into `IL2026`/`IL3050` errors; `<JsonSerializerIsReflectionEnabledByDefault>false</JsonSerializerIsReflectionEnabledByDefault>` makes the reflection overload throw `InvalidOperationException: Reflection-based serialization has been disabled for this application` at runtime (fixture `noreflect`: `P(0)` from both calls with the flag on proves nothing about names, see AI-angle item 3).

### F12 Verified on the toolchain

Fixture root: `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-json-forward-compatible-binding/` (parent `global.json` pins SDK 10.0.401; `net11/` has its own pin to `11.0.100-rc.1.26425.128`). Everything runs through `/home/mherwig/.cache/research-lang/dotnet-tools/run.sh dotnet ...` from inside the named subdirectory. `./run-all.sh` replays all 27 runs below and prints want/got exit codes: **27 runs, 18 red (non-zero), 9 green (zero), 0 mismatches**.

Layout: `lib/` (policy models `Models.cs`, `OpenEnum.cs`, `Wire.cs`; planted-naive `Naive.cs`), `cases/` (5 payloads x 4 binders), `replay/` (ocx conformance corpus + handshake + union decoder + check order), `schemadiff/` + `schema/` (engine, golden, 8 planted twins, `make-twins.py`), `analyzers/{red,green}`, `aot/{red,green}`, `ca/{red,green}`, `floor/` (net8), `net11/`, `closed10/`, `noreflect/`, `probe/` and `probe8/` (observations O1-O113, N1-N7), `conformance/` (copied from `git archive origin/main`), `schema/errors.main.json`.

1. Five payloads, naive vs policy (`cd cases`):
   - `dotnet run -- naive` -> exit 4 (red):
     `C2 unseen enum value FAIL threw on legal input (JsonException: The JSON value could not be converted to Ocx.Json.Naive.ConfigUpdateStatus. Path: $.status)`, `C3 ... FAIL threw (Read unrecognized type discriminator id 'gravity_failure'.)`, `C4 FAIL silently wrong: decoded with Version="" instead of refusing`, `C5 FAIL silently wrong: decoded with Home=null instead of refusing`; C1 and C5b PASS.
   - `dotnet run -- policy` -> exit 0 (green): C1, C2, C3, C5b `PASS decoded correctly`; C4, C5 `PASS refused (OcxDecodeException)`; `wrong=0`.
   - `dotnet run -- naive-strict` -> exit 4; `dotnet run -- policy-strict` -> exit 1: `C1 FAIL threw on legal input (OcxDecodeException: cannot decode About: The JSON property 'future_commit_field' could not be mapped ...)`, C2-C5b PASS.
2. Conformance replay + handshake + union decoder (`cd replay`): `dotnet run` -> exit 0, `failures=0`; includes `PASS ocx 0.6.5 (no contract) -> OcxUnsupportedBinaryException`, `PASS command 'about' 1->2 refused pre-spawn`, `PASS additions (new command, new root, new contract key) are NOT refused`. Red twin: `dotnet run -- --bind-first` -> exit 1: `FAIL v2 payload with new shape -> OcxContractMismatchException -> got OcxDecodeException (a decode error hides the version skew)`.
3. Schema diff (`cd schemadiff`, `dotnet run --no-build -- ../schema/<file> <scenario>`):
   - `reports.main.json lib` -> exit 0 `failures=0` (green on the real golden, 10 baselined unmodelled optional keys).
   - `reports.build_id.json lib` -> exit 1 `FAIL missing-required About.build_id schema requires a key the model lacks`; the fixed twin `reports.build_id.json fixed` -> exit 0.
   - `reports.enum.json`, `reports.union_new.json`, `reports.union_closed.json`, `reports.version.json`, `reports.newopt.json`, `reports.removed.json`, `reports.retyped.json` each -> exit 1 with the messages in F9; `reports.main.json bad` -> exit 5: `lossy About.platforms`, `unsafe About.shell`, `phantom About.hostname`, `missing-required About.libc`, `unmodelled-new About.channel`.
4. Analyzer gate: `cd analyzers/red && dotnet build` -> exit 1: `error MA0222`, `MA0223` (Bad.cs 11,29), `MA0224`, `MA0225` (16,60), `RS0030` x4 (18,84 `JsonStringEnumConverter`; 19,46 `Strict`; 20,46 `Web`; 22,46 `Deserialize<TValue>(string, JsonSerializerOptions?)`). `cd analyzers/green && dotnet build` -> `Build succeeded`, 0 warnings. (`MA0048` file-name noise silenced by editorconfig in both.)
5. AOT/trim: `cd aot/red && dotnet build` -> `error IL2026` + `IL3050` for `JsonSerializerOptions.Strict.get` and `JsonSerializer.Deserialize<TValue>(String, JsonSerializerOptions)`, `error IL3050` for `JsonStringEnumConverter()`; `aot/green` -> `Build succeeded`.
6. CA1869: `cd ca/red && dotnet build` -> two `error CA1869`; `ca/green` (static readonly options) -> `Build succeeded`.
7. net8 floor: `cd floor/lib && dotnet build -f net8.0 -p:FLOOR_PKG=0` -> `error CS0246 ... 'RespectNullableAnnotations'` (exit 1); `cd floor/replay && dotnet run -f net8.0` -> `conformance replay (bindFirst=False) on .NET 8.0.31 ... failures=0`.
8. C# 15: `cd closed10 && dotnet build` -> `error CS8652: The feature 'closed classes' is currently in Preview`; `cd net11 && dotnet run` prints `.NET 11.0.0-rc.1.26425.128`, K1 `Circle(2)`, K2 `THROWS JsonException: Read unrecognized type discriminator id 'Hexagon'`, K3 `THROWS NotSupportedException`, K4 exhaustive `switch` without default compiles, K5 `Os_Features`.
9. Probe excerpts (`cd probe && dotnet run`, .NET 10.0.12; full list in F2): `O3 ... THROWS JsonException ... 'extra' could not be mapped`, `O10 ... Name==null (silent)`, `O11 ... THROWS ... doesn't allow setting null values`, `O21 ... THROWS JsonException: The JSON value could not be converted to St. Path: $.status`, `O22 'Checked' accepted -> Checked`, `O24 integer 99 -> 99`, `O54 Strict.Converters.Add ... THROWS InvalidOperationException: This JsonSerializerOptions instance is read-only`, `O62 poly missing tag ... => Reason`, `O64 ... NotSupportedException`, `O69 ... FallBackToBaseType ... THROWS JsonException ... unrecognized type discriminator`, `O81 schema_version 2 binds -> VersionedRoot(2)`, `O111 ["a",null] -> 2`. `probe8` (net8.0): `N2` tag-not-first throws, `N3` Ignore-unrecognized yields base, `N7` `null silently`; with `-p:PROBE_PKG=1` (STJ 10.0.0 package) the net9/net10 API compile.
10. Reflection switch: `cd noreflect && dotnet run` -> `IsReflectionEnabledByDefault=False`, `reflection overload THROWS InvalidOperationException: Reflection-based serialization has been disabled for this application`; `-p:NOREFL=0` -> both calls run (and both print `P(0)`: the keys `a` vs property `A` differ in case, the silent-default bug of F2/O4).
11. grep checks used by the rules (run from the fixture root; `G` = `/usr/bin/grep -rnE --include='*.cs'`): `G -e 'JsonStringEnumConverter' -e 'JsonSerializerOptions\.(Strict|Web)\b' ... analyzers/red` prints 4 lines, same on `analyzers/green` prints none (exit 1); `G -e '^ *(public|internal) +enum +[A-Za-z]+' lib/Models.cs` exit 1 (no CLR enum in the policy models); `G -e 'JsonUnmappedMemberHandling\.Disallow|JsonSerializerDefaults\.Strict|JsonSerializerOptions\.Strict' lib` exit 1.

Measurement notes: counts in F1 came from `python3 -I` over `git show origin/main:crates/ocx_schema/tests/golden/reports.json` (368,665 bytes; the working tree of `~/dev/ocx` is branch `goat` with an older 244 KB golden, so everything labelled "main" reads `origin/main` via `git show`). No main-built `ocx` binary exists, so the `contract` handshake against a live binary, `ocx --json --bogus` exit 64 and the unreleased `version` document were not executed; they are exercised only through the committed conformance instances. The fixtures were built on Linux x64; no Windows/macOS claim here is load-bearing (JSON binding has no OS dependence; line endings are not inspected by STJ).

## Normative guidance candidates

1. **Skip unknown members on every ocx report.** Set `UnmappedMemberHandling = JsonUnmappedMemberHandling.Skip` explicitly in `[JsonSourceGenerationOptions]` (the default made visible). Rationale: ocx additions are non-breaking by contract and Disallow throws on any of them (`policy-strict` C1). Verify: `grep -rnE --include='*.cs' -e 'JsonUnmappedMemberHandling\.Disallow' -e 'JsonSerializerDefaults\.Strict' -e 'JsonSerializerOptions\.Strict' src/` returns nothing (tests may match); plus `RS0030` on `P:System.Text.Json.JsonSerializerOptions.Strict` via `BannedSymbols.txt`, severity `error`.
2. **No CLR `enum` and no `JsonStringEnumConverter` for any wire enum.** Open enums are `readonly record struct X(string Value) : IOpenEnum<X>` with an `OpenEnumConverter<X>` on the type. Rationale: unseen values throw (O21), case/integers are accepted silently (O22-O24). Verify: `RS0030` banning `T:System.Text.Json.Serialization.JsonStringEnumConverter` and ``…JsonStringEnumConverter`1``; `grep -rnE --include='*.cs' -e '^ *(public|internal) +enum +[A-Za-z]+' src/Models/` returns nothing (an SDK-owned closed enum lives outside `Models/`).
3. **Open-enum equality is `Ordinal` and the type is a `readonly` struct with a string-only converter.** Rationale: ocx values are case-significant snake_case; OpenAI/Octokit use `InvariantCultureIgnoreCase`/`OrdinalIgnoreCase` and `Equals` then disagrees with the wire. Verify: `grep -rnE --include='*.cs' -e 'IgnoreCase' src/Models/` returns nothing; `grep -rnE --include='*.cs' -e 'struct +[A-Za-z]+.*IOpenEnum' src/ | grep -v readonly` returns nothing; analyzer `CA1307`/`MA0001` at `warning` for culture-sensitive string comparisons.
4. **Success predicates are allow-lists.** `IsOk => this == A || this == B`; never `!= Failed`/`!= Error`; an unknown value is neither ok nor failed-known. Rationale: machine-interface page: "A check written as 'not `failed`' treats a future failure value as success". Verify: `grep -rnE --include='*.cs' -e '[Ss]tatus[A-Za-z.]* *!= *[A-Za-z.]*(Failed|Error|Fail)' src/` returns nothing; a unit test that feeds `{"status":"future_value"}` and asserts `IsOk == false` and `IsKnown == false` (conformance `synthetic_unknown_enum_value`).
5. **Wire unions use a hand-written `JsonConverter<TBase>` that reads `type` first, never `[JsonPolymorphic]`.** Outcomes: no string `type` -> `JsonException`; unregistered tag -> `Unknown` arm with `Tag` and a cloned `JsonElement`; registered tag + bad payload -> `JsonException`; tag match `Ordinal`. Rationale: the attribute route collapses unseen, missing, numeric and wrong-case tags into one silent base type (O62, O72, O74), `UnknownDerivedTypeHandling` is serialization-only (O69), and `type` need not be first (O66, net8). Verify: `grep -rnE --include='*.cs' -e 'JsonPolymorphic|JsonDerivedType|IgnoreUnrecognizedTypeDiscriminators|UnknownDerivedTypeHandling' src/` returns nothing; every union has a `replay` case from `conformance/synthetic_unknown_union_tag`.
6. **Schema-required keys are C# `required`; schema-optional keys are nullable and never `required`.** For records using constructor parameters also set `RespectRequiredConstructorParameters = true`. Rationale: STJ treats missing and null as orthogonal; without `required`, a missing key yields silent defaults (O8, O15). Verify: the schema-diff test classes `unsafe`, `lossy`, `missing-required` all green; `grep -rnE --include='*.cs' -e 'public +(int|long|bool|string) +[A-Z][A-Za-z]* *\{ *get; *set;' src/Models/` returns nothing (no settable value-typed DTO members).
7. **Set `RespectNullableAnnotations = true` and `RespectRequiredConstructorParameters = true` in every `[JsonSourceGenerationOptions]`.** Rationale: otherwise an explicit `null` lands in a required slot silently (O10). Verify: Meziantou `MA0222`, `MA0223`, `MA0224`, `MA0225` set to `warning` (default none) in `.editorconfig` with `TreatWarningsAsErrors` true; `grep -c` of those four `dotnet_diagnostic.MA022[2-5].severity = (warning|error)` lines in `.editorconfig` equals 4.
8. **Do not use `JsonSerializerOptions.Web`, `PropertyNameCaseInsensitive = true`, or `JsonNumberHandling.AllowReadingFromString`.** Rationale: they widen what a report may contain (O5, O6) so skew stops being detected. Verify: `grep -rnE --include='*.cs' -e 'JsonSerializerDefaults\.Web' -e 'JsonSerializerOptions\.Web' -e 'PropertyNameCaseInsensitive *= *true' -e 'AllowReadingFromString' src/` returns nothing; `RS0030` on `P:System.Text.Json.JsonSerializerOptions.Web`.
9. **Bind only through a source-generated `JsonTypeInfo<T>`; no reflection overloads.** Rationale: AOT/trim safety, `Strict` and the non-generic enum converter are IL2026/IL3050, and the shared `Default` contract is the single place policy lives. Verify: `<IsAotCompatible>true</IsAotCompatible>` plus `TreatWarningsAsErrors` (IL2026/IL3050 fail the build); `<JsonSerializerIsReflectionEnabledByDefault>false</JsonSerializerIsReflectionEnabledByDefault>` in the SDK csproj; `grep -rnE --include='*.cs' -e 'JsonSerializer\.(De)?[sS]erialize<' src/` returns nothing.
10. **Cache `JsonSerializerOptions`/contexts; never `new JsonSerializerOptions(...)` per call.** Rationale: each instance rebuilds converter caches; CA1869. Verify: `dotnet_diagnostic.CA1869.severity = error` with `AnalysisLevel latest-all`; reproduces as `error CA1869` on `ca/red`.
11. **Check `schema_version` before binding, with equality, and raise a typed `ContractMismatch`.** Peek via `JsonDocument`, then `element.Deserialize(info)`. Rationale: STJ never checks it (O81); bind-first reports a decode error for a re-shaped v2 payload. Verify: the `replay` check-order case passes; `grep -rnE --include='*.cs' -e 'Deserialize' src/ | grep -v 'OcxDecode'` returns nothing outside the single decode helper.
12. **Handshake once per binary; refuse before spawning.** `ocx --format json version`; no `contract` -> `UnsupportedBinary`; then per call compare error-doc, command and each output-root version for equality; accept every addition. Rationale: ocx's own runtime does exactly this; additions never bump. Verify: unit tests for the 8 handshake rows of F8 (the `replay` handshake block); `grep -rnE --include='*.cs' -e 'Version\b.*(>=|<=|CompareTo)' src/Handshake/` returns nothing (never range-compare `version` strings for compatibility).
13. **Never hard-code a minimum ocx version that was not measured.** Rationale: ocx's own generator ships `MINIMUM_OCX = "0.6.4"` that its own handshake refuses. Verify: a CI job runs the handshake against the oldest ocx claimed supported and the conformance corpus; `grep -rn 'MinimumOcx' src/` shows a value with a cited release.
14. **A schema-diff test gates the models.** It reflects `JsonTypeInfo.Properties` of the source-generated context against the vendored `reports.json` and fails on phantom, unsafe, missing-required, lossy (unless waived with a reason), kind, `x-ocx-enum` values, union tags, vanished `x-ocx-unknown-variant`, `schema_version` const, any bound type without a `Map` row, and any new optional key outside `unmodelled-baseline.txt`. Rationale: three presence inversions reached Python `main` from hand-written fixtures. Verify: `dotnet test` (or the console harness) exits 0 on the golden and non-zero on each planted twin; the vendored golden is refreshed from the pinned ocx commit and a canary compares it with `https://ocx.sh/schemas/reports/v2.json`.
15. **Replay ocx's conformance corpus.** Copy `crates/ocx_schema/contract/conformance/*` at the pinned commit; for every case whose `root` is modelled assert `decode`, `unknown` pointers, `absent` pointers and `fields`. Rationale: it is the language-neutral oracle ocx wrote for exactly this. Verify: the test enumerates the directory (`Directory.GetDirectories`) rather than listing cases, and fails if a case's root has no decoder yet is not on an explicit `NotYetModelled` list.
16. **Wrap decode failures in the SDK exception hierarchy and catch both `JsonException` and `NotSupportedException`.** Include `JsonException.Path`; never include stdout. Rationale: STJ omits payload by design (#113756), an abstract polymorphic base without a tag throws `NotSupportedException` (O64), and Python's `ValueError` skew leaked past `except OcxError`. Verify: `grep -rnE --include='*.cs' -e 'catch *\(JsonException' src/` returns only the decode helper; a test asserts `Assert.IsAssignableFrom<OcxException>` for C4/C5.
17. **Strict mode is a test instrument.** Replay recorded real ocx output through `new JsonSerializerOptions(JsonSerializerDefaults.Strict) { TypeInfoResolver = ctx }` in CI on the schema-refresh change to list unbound keys; never in `src/`. Rationale: catches additions early without breaking users. Verify: `grep -rnE --include='*.cs' 'JsonSerializerDefaults\.Strict' src/` returns nothing; the same grep over `tests/` is allowed.
18. **On net8.0 reference `System.Text.Json` 10.x; multi-target `net8.0;net10.0`.** Rationale: the four policy flags are absent on the net8 inbox (`CS0117`). Verify: `grep -n 'System.Text.Json' src/*.csproj` shows a conditional `PackageReference` on `net8.0` with `Version="10.*"`-pinned exact value (use an exact version, not a range); CI builds both TFMs and runs the replay on both runtimes.
19. **Do not add C# 15 `closed` or `InferClosedTypePolymorphism` to wire unions before .NET 11 GA and the net8 floor moves.** Rationale: preview on 10.0.401 (CS8652), throws on unseen tags (K2). Verify: `grep -rnE --include='*.cs' -e '\bclosed +(abstract +)?(record|class)' -e 'InferClosedTypePolymorphism' src/` returns nothing while `<LangVersion>` is below 15.
20. **Timestamps, digests, paths stay `string` (or a thin validated wrapper), not `DateTimeOffset`/`Uri`/`FileInfo`.** Rationale: ocx timestamps carry 9 fractional digits in some roots and whole seconds in others (O48), and `AbsolutePath` is "the native spelling of the host that wrote it". Verify: schema-diff `kind` class passes; `grep -rnE --include='*.cs' -e 'DateTime(Offset)? +[A-Z]' src/Models/` returns nothing unless the schema carries `format: date-time` for that property.
21. **Keep publisher `OpaqueJson` as `JsonElement`, never a typed model or `Dictionary<string, object>`.** Rationale: it may contain `null`, duplicates and any shape; `JsonElement` represents `Null`/`Undefined` distinctly (O50, O51). Verify: the schema-diff `kind` class maps `x-ocx-opaque` to "any" and the model type must be `JsonElement`: `grep -rnE --include='*.cs' -e 'Dictionary<string, *object' src/Models/` returns nothing.

## AI-agent angle

What an LLM characteristically gets wrong here, and the smallest mechanical catch:

1. **Closed `enum` + `[JsonConverter(typeof(JsonStringEnumConverter))]` for every status/kind** (the default answer in training data; it compiles, passes the happy test, throws `JsonException` on a newer ocx; also quietly accepts `"Checked"` and `99`). Catch: `RS0030` ban on both converter types; `grep -rnE --include='*.cs' '^ *(public|internal) +enum' src/Models/`.
2. **"Tolerant" via `UnknownDerivedTypeHandling = FallBackToBaseType`.** Reads like "unknown type handling"; it only changes serialization (O69). Catch: `grep -rn 'UnknownDerivedTypeHandling' src/` must be empty; the conformance case `synthetic_unknown_union_tag` in replay.
3. **Omitting the naming policy or `[JsonPropertyName]`** so `a` never binds to `A`: every field silently defaults (O4; the `noreflect` fixture printed `P(0)` for `{"a":1}`), and for `os.features` the policy cannot produce a dot (O30). Catch: members `required` (turns silence into `JsonException` O9) plus the schema-diff `phantom`/`missing-required` classes; a unit test asserting a non-default value from `captured_about`.
4. **`JsonSerializerOptions.Web` / `PropertyNameCaseInsensitive = true` "to be lenient".** Widens acceptance (strings as numbers, any case) and hides skew. Catch: RS0030 on `Web`; grep rule 8.
5. **`JsonSerializerOptions.Strict` / `Disallow` / `MissingMemberHandling.Error` copied from "best practice" (.NET 10 what's-new says Strict "follows best practices").** Correct for a closed schema you own; wrong for a growing contract (C1). Catch: RS0030 on `.Strict`; grep rule 1; `policy-strict` shape in replay must stay red.
6. **`!= Failed` success checks and `switch` with a `_ => true`/`default: ok` arm** over open enums. Catch: grep rule 4; `-warnaserror` on `CS8509`/IDE0072 does not help for struct enums, so require the `synthetic_unknown_enum_value` test.
7. **Assuming `null` means unset (Newtonsoft/JS habit)**, writing `string? X` everywhere and no `required`, or `[JsonIgnore(Condition = WhenWritingNull)]` (a write-side feature) to "handle absent". ocx never writes null for unset. Catch: schema-diff `unsafe`/`lossy`; `RespectNullableAnnotations` + MA0222-MA0225 enabled.
8. **Relying on `RespectNullableAnnotations` to reject missing keys.** It does not (doc "Missing values versus null values"; O8). Catch: C4 in `cases` (`Version=""`) as a regression test, `required` rule 6.
9. **Binding the version after the payload** (`Deserialize<Report>` then `if (r.SchemaVersion != 1)`), giving a decode error where a contract mismatch belongs; or comparing `ocx` semver strings for compatibility instead of the `contract` map. Catch: the check-order replay case; grep rule 12.
10. **Copying the Rust generator's `MINIMUM_OCX = "0.6.4"` or inventing a version floor.** Catch: rule 13 CI handshake against the oldest claimed ocx; ocx 0.6.5 captured payload as a permanent `Unsupported` test.
11. **.NET Framework / Newtonsoft-era advice:** `[JsonProperty]`, `JsonConvert.DeserializeObject`, `MissingMemberHandling`, `StringEnumConverter { AllowIntegerValues = false }`, `JsonExtensionData` on Newtonsoft semantics. Stripe's repo still ships both worlds (`JsonUtilsTest.cs:18` uses Newtonsoft). Catch: `grep -rnE --include='*.cs' -e 'Newtonsoft' -e 'JsonConvert\.' -e '\[JsonProperty\(' src/` and no `Newtonsoft.Json` package reference (`dotnet list package`).
12. **Using `JsonDocument`/`JsonNode` and indexers (`root["status"]!.GetValue<string>()`) instead of typed binding**, which throws `KeyNotFoundException`/`InvalidOperationException` outside the SDK exception hierarchy and loses the diff test. Catch: grep rule 11 (only the decode helper touches `JsonDocument`).
13. **`JsonElement` cloned or kept after its `JsonDocument` is disposed** (union Unknown arm holding `root`): `ObjectDisposedException` later. Catch: the replay case reading `unk.Raw.GetProperty("n")` after disposal; grep `-e 'RootElement'` in model types.
14. **Adding C# 15 `closed` / .NET 11 `InferClosedTypePolymorphism` because it looks like the modern exhaustive-union answer.** Catch: rule 19 grep; `CS8652` on `LangVersion 14`.
15. **Hallucinated APIs seen in drafts of this topic:** `JsonStringEnumConverter` "fallback to default" option (none exists, no API proposal found in the tracker search), `JsonUnknownEnumHandling`, `JsonSerializerOptions.AllowUnknownEnumValues`, `[JsonUnknownMember]`. Catch: compile; `CS0117`/`CS0246` on the first build.

## Contested / evolving

- **Strict as the new default (.NET 10, 2025-11).** Microsoft's docs call the Strict preset "best practices" and "highly recommended" for new apps (RespectNullable/RespectRequiredConstructorParameters). That is sound for a closed schema you control and for request bodies; it is wrong for consuming a contract that adds fields. Trend: tooling nudges toward Strict (MA0222-MA0225 treat `Strict` as satisfying the rule); expect AI agents to adopt it. Resolve by surface: Strict for SDK-owned documents and tests, Skip for ocx reports.
- **Extensible enum shape.** OpenAI and Azure converge on `readonly struct` over a string; Anthropic wraps `JsonElement` in a record class; Octokit pairs a CLR enum with a string. The struct has the clearer trajectory (350 in OpenAI's generated code; the Azure guideline lists it as an allowed alternative). Disagreement: comparison semantics. OpenAI/Octokit fold case, Azure `RequestMethod` is `Ordinal`; for ocx's case-significant values Ordinal is right.
- **Whether to bind unknown enum strings or fail the whole report.** ocx says unknown is legal and fail-closed on success; protobuf's open/closed split is the analogue ("unexpected behavior that closed enums cause"). Some SDKs still throw (OpenAI `ChatFinishReason`). The ocx-owned contract settles it for this SDK; no general consensus in .NET.
- **Union dispatch.** Attribute-based polymorphism is the "official" way (since .NET 7) and is trending better (.NET 9 `AllowOutOfOrderMetadataProperties`, .NET 11 closed-hierarchy inference), but none of it models "unseen vs malformed". C# 15 `closed` (preview, GA with .NET 11 in November 2026) may make `closed` + a converter the idiom; as of 2026-10-11 that is RC1 and net8-incompatible.
- **`required` on every schema-required key vs tolerant optional reads.** The Python SDK deliberately reads `build`, `channel`, `ci`, `commit` with `.get` although the schema (then) always wrote them, because "for a wrapper that tracks a moving CLI, tolerating the absence is worth more than pinning the presence" (`_WAIVED`, `test_wire_contract.py:121-141`). ocx's versioning list does not name "optional -> required" or "required -> optional" as a break, so a relaxed `required` is not guaranteed to bump. My recommendation (strict `required`, lossy waivable) is the safe side only while `required` members are the identity/status keys; waive informational ones explicitly rather than loosening everything. Open question for the owner: does ocx treat making a required key optional as a version bump? (Not stated in `machine-interface.md`.)
- **Generated models.** ocx chose an owned IR + backend over off-the-shelf generation (2026-10-04); a C# backend is "decided per SDK plan" and unscheduled. Until it exists the hand-written + diff-test path is the only measured one.
- **Equality-only handshake.** Every bump forces an SDK release; ranges would reduce churn but are not what ocx implements or promises. Revisit when a first baseline is cut (`task contract:rotate`); #604 was still editing v1 in place on 2026-10-09.
- **Runtime feature switches** (`RespectNullableAnnotationsDefault`, `RespectRequiredConstructorParametersDefault`) are opt-in "to avoid breaking existing applications" in .NET 9; Microsoft recommends turning them on for new apps. A future major may flip the default; set the options explicitly so the SDK does not depend on it.
- **Exception text.** Maintainers declined to put payload values in `JsonException` messages (#113756, 2025-05): do not expect richer messages; build your own context from `Path`.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/missing-members | MS Learn: unmapped members, `JsonUnmappedMemberHandling` | page 2025-01 (.NET 8+) | primary: default skip, three ways to set Disallow, exact exception |
| https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/required-properties | MS Learn: `required`, `[JsonRequired]`, `RespectRequiredConstructorParameters` | updated 2026-03 (.NET 9) | primary: required vs ctor params, source-gen note, feature switch |
| https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/nullable-annotations | MS Learn: `RespectNullableAnnotations` | updated 2025-12 (.NET 9) | primary: missing-vs-null, required orthogonality, generic limitations |
| https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/polymorphism | MS Learn: polymorphism, discriminators, unknown derived types, closed inference | updated 2026-09 (.NET 7-11) | primary: what `UnknownDerivedTypeHandling` covers; `AllowOutOfOrderMetadataProperties`; .NET 11 closed |
| https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/libraries | What's new in .NET 10 libraries | 2025-11 | primary: `Strict`, `AllowDuplicateProperties` definitions |
| https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-9/libraries | What's new in .NET 9 libraries | 2024-11 | primary: `RespectNullableAnnotations`, `RespectRequiredConstructorParameters`, `JsonStringEnumMemberName` |
| https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/customize-properties | MS Learn: naming policies, enums as strings | updated 2026-09 | primary: `SnakeCaseLower` (.NET 8), `PascalCase` (.NET 11), enum converters, AOT note |
| https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/source-generation | MS Learn: source generation | 2025-11 | primary: options attribute, context-constructor override, reflection-disable switch |
| https://learn.microsoft.com/en-us/dotnet/api/system.text.json.jsonserializeroptions.strict | API: `JsonSerializerOptions.Strict` | net10/net11 | primary: read-only singleton, RequiresUnreferencedCode/RequiresDynamicCode |
| https://learn.microsoft.com/en-us/dotnet/api/system.text.json.serialization.jsonstringenumconverter | API: `JsonStringEnumConverter` | all TFMs | primary: "Reading is case insensitive", default allows integers |
| https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/closed | C# reference: `closed` modifier | C# 15 preview, 2026-08 | primary: closed hierarchies, exhaustiveness (class-only) |
| https://github.com/dotnet/runtime/blob/v10.0.0/src/libraries/System.Text.Json/src/System/Text/Json/Serialization/JsonSerializerOptions.cs | dotnet/runtime source | v10.0.0 | primary: `Strict` (`:68-73`), Strict preset flags (`:180-186`), duplicate doc (`:856-873`) |
| https://github.com/dotnet/runtime/blob/v10.0.0/src/libraries/System.Text.Json/src/System/Text/Json/Serialization/Metadata/PolymorphicTypeResolver.cs | dotnet/runtime source | v10.0.0 | primary: unrecognized discriminator throws unless ignored (`:176-179`) |
| https://github.com/dotnet/runtime/blob/v10.0.0/src/libraries/System.Text.Json/src/System/Text/Json/Serialization/Converters/Value/EnumConverter.cs | dotnet/runtime source | v10.0.0 | primary: string/number gates, failed parse throws |
| https://github.com/dotnet/runtime/blob/v10.0.0/src/libraries/System.Text.Json/Common/JsonSourceGenerationOptionsAttribute.cs | dotnet/runtime source | v10.0.0 | primary: every policy option exists on the generator attribute |
| https://github.com/dotnet/runtime/issues/113756 | Issue: invalid enum message lacks the value | 2025-03, closed not planned 2025-05 | maintainer stance on payload in messages; no fallback offered |
| https://github.com/meziantou/Meziantou.Analyzer/blob/main/docs/Rules/MA0222.md (also MA0223, MA0224, MA0225) | Analyzer rule docs | 2026 (pack 3.0.297) | primary for the gates: explicitness, not strictness; Strict satisfies |
| https://azure.github.io/azure-sdk/dotnet_introduction.html | Azure SDK .NET guidelines | current | the `readonly struct` instead of `enum` guideline |
| https://protobuf.dev/programming-guides/enum/ | protobuf enum guide | current | open vs closed enum semantics and rationale |
| https://martinfowler.com/bliki/TolerantReader.html | Fowler, Tolerant Reader | 2011 (still cited) | the pattern name and caveat (schema validation false security) |
| https://json-schema.org/understanding-json-schema/reference/object | JSON Schema object reference | 2020-12 | additionalProperties default, `required` semantics |
| ocx@246863abc1d4 `website/src/docs/reference/machine-interface.md` | ocx machine-interface contract | unreleased main, 2026-10 | primary: absent/null, open values, versions, outcomes |
| ocx@246863abc1d4 `crates/ocx_schema/contract/conformance/` (README + 33 cases) | ocx conformance corpus | 2026-10 | primary: language-neutral decode oracle |
| ocx@246863abc1d4 `crates/ocx_schema/tests/golden/reports.json`, `errors.json` | golden schemas | 2026-10 | primary: measured 56 roots / 654 required / 0 nullable / 13 unknown-variant unions |
| ocx@246863abc1d4 `crates/ocx_sdkgen/templates/rust/runtime.rs`, `wire.rs`, `src/rust.rs` | Rust SDK runtime and generator | 2026-10 | primary: handshake, verify-before-spawn, fail-closed success table |
| ocx@246863abc1d4 `.claude/artifacts/adr_ocx_interface_contract.md` | ADR + go/no-go | 2026-10-04 | typify 0 of 13 tagged unions; owned backend decision |
| ocx-sdk-python@80136dde4162 `tests/unit/test_wire_contract.py`, `tests/fixtures/contract/README.md`, `src/ocx_sdk/_results.py` | Python reference SDK | 2026-10-09 | the phantom/unsafe/lossy test and presence table to port |
| exemplars: openai__openai-dotnet@1f0e8829acac, anthropics__anthropic-sdk-csharp@ae16e5933f39, octokit__octokit.net@7fa5b0fe4a18, stripe__stripe-dotnet@dbdca6ba5efc, Azure__azure-sdk-for-net@32c48fc3d524, pulumi__pulumi-dotnet@2a0dca84f09b, GitTools__GitVersion@5057cdbcc177, dotnet__BenchmarkDotNet@61ebda8a50ae, meziantou__Meziantou.Analyzer@161b7e948ad3 | cloned real SDK source (paths and lines in the findings) | 2026-10 clones | real shapes and defects of extensible enums, union fallbacks, Disallow on owned files |
