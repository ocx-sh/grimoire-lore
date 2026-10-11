---
title: "ocx error document, integer open enums, partial reports and a generic tagged-union converter (System.Text.Json)"
topic: "csharp-json / csharp-json-error-document-and-generic-unions: revision of CS-JSON-05/07/11 and CS-ERR-01/02/09 for the error document, OcxExitCode, report_then_fail and one converter for 13 wire unions"
agent: "deep-dive researcher (sonnet subagent, research-lang csharp, wave 3 revision)"
model: claude-sonnet-5-5
date_researched: 2026-10-11
sources_count: 28
scope: |
  Covers: the ocx `errors.json` document (required/optional members, 13 exit codes, 11 kinds, 516 details) bound into OcxCommandException;
  the integer open enum `readonly record struct OcxExitCode(int Value)`; report_then_fail (stdout report + non-zero exit) bound once and attached to the
  right exception leaf; a generic `TaggedUnionConverter<TBase>` with a static-abstract arm table replacing the 13 hand-written union converters
  (strict-option copies, case matrix C3-C3h, S4-S6, Native AOT linux-x64, net8/net10/.NET 11 RC1); and the schema-diff extension that verifies the arm table.
  Not covered: process spawning and the 340-LOC engine (fixture uses a 6-line Process.Start), retry policy, NuGet/packaging, observability of failures,
  Windows/macOS runs (every run is Linux x64, Windows claims are marked unverified), the ocx Rust side, a generated C# backend (ocx_sdkgen has none).
  Evidence base: ocx working tree `774a1ce760d0` (goldens copied and hashed into the fixture), ocx-sdk-python `80136dde4162`, SDK 10.0.401 / 8.0.425 / 11.0.100-rc.1.26425.128,
  fixture `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-json-error-document-and-generic-unions/`.
---

# ocx error document, integer open enums, partial reports and a generic tagged-union converter

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   - [F1 The error document: what the contract says and how it is moving](#f1-the-error-document)
   - [F2 OcxExitCode: the integer open enum](#f2-ocxexitcode-the-integer-open-enum)
   - [F3 Error document to OcxCommandException: the mapping](#f3-error-document-to-ocxcommandexception)
   - [F4 Failure-path rules: the exit code is never masked](#f4-failure-path-rules)
   - [F5 report_then_fail: bind once, attach to OcxCommandException](#f5-report_then_fail)
   - [F6 The generic TaggedUnionConverter: design, behaviour, measurements, verdict](#f6-the-generic-taggedunionconverter)
   - [F7 The schema-diff extension](#f7-the-schema-diff-extension)
   - [F8 Era notes: net8 floor, net10, .NET 11 RC1](#f8-era-notes)
   - [F9 Verified on the toolchain](#f9-verified-on-the-toolchain)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

Conventions. `F` = `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-json-error-document-and-generic-unions` (all fixture paths below are relative to it; `verify.sh` regenerates `verify.log`).
`[CJ]` = consolidated [csharp-json.md](../csharp-json.md) (CS-JSON-nn); `[API]` = consolidated [csharp-api.md](../csharp-api.md) (CS-API-nn, CS-ERR-nn);
`[ocx]` = `ocx@774a1ce760d0:crates/ocx_schema/` (`tests/golden/{errors,reports,cli}.json`, `contract/conformance/`), copied to `F/schema/` (sha256 prefixes `ec04aaad70b5d1b5`, `12c7e17a4e275b03`, `4adf1f07194a2384`).
Exemplars are cited `owner__repo@sha12:path:line` under `/home/mherwig/.cache/research-lang/exemplars/csharp/`.

## Summary

- Adopt one generic `TaggedUnionConverter<TBase>` (44 lines) plus a per-union arm table, and delete the 13 hand-written union converters. Over 165 generated cases (13 unions x C3-C3h/S4-S6) the generic and hand-written strategies produce byte-identical output (same md5) on .NET 8.0.31, 10.0.12 and as Native AOT; costs measured: Lib.dll +1,024 B, AOT binary +0.9 %, about 0 to +0.14 us per decode of a 0.4 to 1.4 us operation, union-support source 326 to 170 lines plus the 44-line converter.
- Make the table the only per-union code: `UnionArm<TBase>.Of<TArm>("tag")` rows behind an explicit, `internal` `ITaggedUnion<TBase>` implementation (`static abstract` `Arms` and `Unknown`), with `[JsonConverter(typeof(TaggedUnionConverter<X>))]` on the public abstract base. Nothing of it is public (reflection dump: 0 public union-machinery types, 0 public `Arms`/`Unknown` members).
- Bind every arm through `options.GetTypeInfo(armType)` (non-generic overload) and the `JsonElement` overload `Deserialize(JsonElement, JsonTypeInfo)`; no `MakeGenericType`, no `Activator`. The converter publishes with `PublishAot=true -p:TreatWarningsAsErrors=true` at 0 warnings and runs 198/198 cases natively on linux-x64.
- Keep the converter's tag rules identical to the old hand-written ones: a missing, null, numeric or non-object value is `JsonException`; a wrong-case or empty tag is an `Unknown` arm; an escaped spelling of a known tag binds the known arm; a known tag with a bad payload is `JsonException` (never `Unknown`). The planted bug twins fail 13 (null tag), 22 (bad payload swallowed) and 13 (arm bound via `Default`, strict copy bypassed) cases; the real converter fails 0.
- A flattened union (`Var`: `key` and `visibility` sit beside `type`) cannot declare the shared members on the base: the Unknown arm only guarantees `type` (`x-ocx-unknown-variant` requires `["type"]`), so a `required` base member breaks the `Unknown` factory with CS9035. Put shared members on each known arm. 1 of 13 unions is flattened.
- The arm table is data, so one loop proves registration (`ctx.GetTypeInfo(arm)` for 47 arms) and the schema-diff test compares tags to `reports.json` exactly: `union-arm-new`, `union-arm-stale`, `union-unmapped`, `union-extra`, `union-closed`, `union-schema-inconsistent`. Eleven planted twins are red, the real golden and a table-updated twin are green; a missing `[JsonSerializable]` shows as `NotSupportedException` (not `JsonException`) at first use, so the registration loop is mandatory.
- Model the process exit status and `error.exit_code` as `readonly record struct OcxExitCode(int Value)` with an int32-only converter (`TryGetInt32`, JSON number only): an unknown integer (83) is kept and unnamed, `"65"`, `65.0`, `true` and `null` are refused, and a negative Windows-style status (-1073741819) is a valid unknown code. `default(OcxExitCode)` is `0 Success`, so never `FirstOrDefault` over exit codes (the schema-diff test hit this in its first draft: a new code 83 was reported as "renamed, table Success").
- `OcxCommandException.ExitCode` is the process status; the document's `exit_code` is read only to cross-check and never overrides it. If the document is absent, malformed, has `exit_code` as a string or float, lacks the required `context`, has `schema_version` 2 or a duplicate key, the document is ignored and the exception still carries the exit code (cases E5-E11).
- Do not turn `ErrorDetail` into constants: the golden grew 505, 506, 516 values in three days (`ocx@6daf9a164`, `737c870c2`, `84c135e7f`, 2026-10-07 to 2026-10-10); 516 static members cost 107,520 B of IL versus 5,120 B for the plain struct and 516 PublicAPI lines, and every new slug becomes an RS0016 break. Keep `string? Detail`; keep `OcxErrorKind` (11 values) as an open string struct with constants. The brief's "~505" is now 516.
- `detail` is the only optional member of `ErrorBody` (`required: [kind, message, context]`); the naive model (`required string Detail`, closed enum kind) throws on the conformance case `synthetic_error_without_detail` and on `synthetic_unknown_error_detail`, and silently accepts exit code 83 as an undefined enum value and the string `"65"` as `DataError`.
- report_then_fail is 14 commands with 17 output modes (not 17 commands): `update`, `upgrade`, `package {attest,cascade check,cascade repair,copy,deps,inspect,prune,push,sign,test}`, `patch test`, `inspect`. The report is on stdout, no error document follows, and a failure before the command runs prints an error document instead, so the shape decides: an error document has a top-level `error` object and a numeric `exit_code`; none of the 56 report roots has both (schema-diff guard `root-looks-like-error-document`).
- Classify by a cheap top-level skim of the stdout bytes (`Utf8JsonReader`, `Skip()` over values, no object model), then bind exactly once: the error document, or the typed report. Attach the typed report to `OcxCommandException.PartialReport` (`object?`) and replace the planned `PartialReportJson` string, which forces a second decode and retains up to 16 MiB. A caller that accepts the non-zero code (CS-ERR-09) gets the report returned instead of an exception. Binding passes counted: 1 per invocation (R1b, R2b, R3b).
- Exit-code authority beats decode problems: non-JSON stdout, a wrong-shape report or a schema_version-2 report with a non-zero exit all throw `OcxCommandException` with the real exit code (R5, R6b, R7); the same problems with exit 0 throw `OcxDecodeException` or `OcxContractException`. The naive "exit != 0 means error document" classifier leaks a `JsonException` on a real report_then_fail document and loses both the code and the report.
- Single-bind is a correctness rule, not a speed rule: skim+bind, `JsonDocument`+`Deserialize(element)` and error-document-first-then-report measured within noise of each other (0.3 KB: 14 to 23 us; 328 KB: 0.77 to 1.1 ms on a shared machine). Do not cite speed for it.
- Neither exemplar family generalises: anthropic-sdk-csharp emits one `switch` converter per union and swallows a `JsonException` on a known tag into the unknown arm (`ToolChoice.cs:339-364`), and its unseen enum becomes `(ErrorType)(-1)` which loses the value (`ErrorType.cs:41`); openai-dotnet emits a `GetString()` switch per union (`ResponseItem.Serialization.cs:117-165`) that throws `InvalidOperationException`, not `JsonException`, on a numeric tag. Both are generated code; hand-maintained models want a table.
- The generic converter also works on the .NET 11 RC1 SDK and runtime unchanged (build 0 warnings, 198/198 on `11.0.0-rc.1.26425.128`). The .NET 11 open-generic `[JsonConverter(typeof(Conv<>))]` form is for generic model types and is not needed or applicable here; the closed form `typeof(TaggedUnionConverter<X>)` is the portable spelling on net8 to net11.

## Findings

### F1 The error document

Facts, all from the goldens at `ocx@774a1ce760d0` (copied to `F/schema/`):

- `errors.json` `ErrorDocument` requires `[schema_version, command, exit_code, error]`; `ErrorBody` requires `[kind, message, context]`; `detail` is **optional**; `ErrorContext` has three optional `PackageRef` strings (`identifier`, `source`, `target`) and requires nothing ([ocx]`errors.json#/$defs/ErrorBody`, `#/$defs/ErrorContext`). The prose agrees: "`error.detail` ... Omitted when the failure has no slug", "`error.context` ... Always present, and empty when the failure names no package", and "A failure with no slug, such as a plain I/O error, carries only `error.kind`, so a script must be able to branch on `kind` alone" ([machine interface](https://ocx.sh/docs/reference/machine-interface), Error Document).
- `ExitCode` is `type: integer` with `x-ocx-enum` of 13 rows (`0 Success, 1 Failure, 64 UsageError, 65 DataError, 69 Unavailable, 74 IoError, 75 TempFail, 77 PermissionDenied, 78 ConfigError, 79 NotFound, 80 AuthError, 81 PolicyBlocked, 82 Unsupported`), `ErrorCategory` is a string `x-ocx-enum` of 11 rows, `ErrorDetail` is a string `x-ocx-enum` of **516** rows each carrying the `exit_code` it implies (distribution `65:181, 78:94, 1:58, 64:54, 74:37, 79:29, 75:22, 69:11, 81:10, 80:8, 77:8, 82:4`). Measured with `python3 -I` over the copied golden.
- The detail list is moving. `git cat-file -p <sha>:crates/ocx_schema/tests/golden/errors.json` gives 505 values at `6daf9a164` and `681cc9f00`, 506 at `737c870c2` ("a transient GitHub OIDC token fetch failure exits 75") and 516 at `84c135e7f` ("every CLI-level refusal names its cause in error.detail"), all dated 2026-10-07..10. The audit and the brief carry "~505"; the number to design for is "grows every few days".
- Kind does not determine the code: 77 and 81 are both `permission_denied`; the document's `exit_code` "repeats the process exit code" ([machine interface](https://ocx.sh/docs/reference/machine-interface), Exit Codes), and a child process run by `ocx exec` forwards its own code unchanged, so an error document is not guaranteed for every non-zero status.
- The language-neutral conformance corpus has 7 captured and 2 synthetic `ErrorDocument` cases: `captured_error_{lock_stale,context_identifier,invalid_command_line,no_project,not_found,offline_index_blocked,unknown_subcommand}`, `synthetic_error_without_detail` (`absent: ["/error/detail"]`) and `synthetic_unknown_error_detail` (`unknown: ["/error/detail","/error/kind"]`) ([ocx]`contract/conformance/README.md`). The C# fixture replays the four that exercise a decision (E1, E1b, E1c, E2, E3) and the `report_then_fail` pair.
- The Python SDK never parses the document: `OcxProcessError.stdout` is kept verbatim, "never read by `_summary()` or `__str__`", and `partial_report(err)` returns the raw stdout or `None` ([ocx-sdk-python@80136dde4162:src/ocx_sdk/_errors.py:116-133](file:///home/mherwig/dev/ocx-sdk-python/src/ocx_sdk/_errors.py), [_results.py:417-455](file:///home/mherwig/dev/ocx-sdk-python/src/ocx_sdk/_results.py)). The C# SDK improves on this by decoding once into typed properties.

Decision: the wire document is an `internal` pair of sealed classes (`ErrorDocument`, `ErrorBody`); the public surface is `OcxCommandException`'s properties (F3). `required` follows the schema exactly; `Detail` is `string?`.

```csharp
// F/lib/Core.cs - internal wire types; required = schema required, nothing more
internal sealed class ErrorDocument
{
    [JsonPropertyName("schema_version")] public required int SchemaVersion { get; init; }
    [JsonPropertyName("command")]        public required string Command { get; init; }
    [JsonPropertyName("exit_code")]      public required OcxExitCode ExitCode { get; init; }
    [JsonPropertyName("error")]          public required ErrorBody Error { get; init; }
}
internal sealed class ErrorBody
{
    [JsonPropertyName("kind")]    public required OcxErrorKind Kind { get; init; }
    [JsonPropertyName("detail")]  public string? Detail { get; init; }          // optional: some failures carry no slug
    [JsonPropertyName("message")] public required string Message { get; init; }
    [JsonPropertyName("context")] public required OcxErrorContext Context { get; init; } // always emitted, possibly {}
}
```

```csharp
// WRONG (what an LLM writes first, F/naive/Program.cs): closed enums, required detail, string-enum converter on the exit code
public enum NaiveExit { Success = 0, /* ... */ Unsupported = 82 }
public enum NaiveKind { UsageError, /* ... */ Internal }
public class NaiveBody { public NaiveKind Kind { get; set; } public required string Detail { get; set; } /* ... */ }
```

Naive result on the same payloads (`F/naive.log`, `verify.log` V10): known case `ok`; `synthetic_unknown_error_detail` throws `JsonException: The JSON value could not be converted to NaiveKind`; `synthetic_error_without_detail` throws `JsonException ... missing required properties including: 'detail'`; exit code 83 is accepted silently as an undefined enum value (`IsDefined=False`); the string `"65"` is accepted as `DataError` (fail-open on a wrong JSON kind). The policy model passes the first two as `kind=future_kind known=False detail=future_slug` and `detail=-`, keeps 83 as `Command(exit=83,...)` and refuses `"65"` (E2, E3, E4, E6).

### F2 OcxExitCode: the integer open enum

[API] CS-API-07 already fixes the name and shape (`readonly record struct OcxExitCode(int Value)`), CS-ERR-02 fixes the 13-row table and its drift test, and [CJ] CS-JSON-05 says "integer `x-ocx-enum`s get the same shape over `int`". This finding settles the converter and the traps.

```csharp
// F/lib/Core.cs
internal interface IOpenIntEnum<TSelf> where TSelf : struct, IOpenIntEnum<TSelf>
{
    int Value { get; }
    static abstract TSelf From(int value);
}
internal sealed class OpenIntEnumConverter<T> : JsonConverter<T> where T : struct, IOpenIntEnum<T>
{
    // Number only, int32 only. "65", 65.0, 65.5, true and null are refused. Unknown integers are KEPT.
    public override T Read(ref Utf8JsonReader r, Type t, JsonSerializerOptions o) =>
        r.TokenType == JsonTokenType.Number && r.TryGetInt32(out var v) ? T.From(v)
            : throw new JsonException($"{typeof(T).Name} expects a JSON integer, found {r.TokenType}.");
    public override void Write(Utf8JsonWriter w, T v, JsonSerializerOptions o) => w.WriteNumberValue(v.Value);
}

[JsonConverter(typeof(OpenIntEnumConverter<OcxExitCode>))]
public readonly record struct OcxExitCode(int Value) : IOpenIntEnum<OcxExitCode>
{
    public static OcxExitCode Success { get; } = new(0);   // ... 13 rows, the only place numeric exit literals live
    public string? Name => Value switch { 0 => "Success", 1 => "Failure", 64 => "UsageError", /* ... */ 82 => "Unsupported", _ => null };
    public bool IsKnown => Name is not null;
    public override string ToString() => Name is { } n ? $"{Value} {n}" : Value.ToString(CultureInfo.InvariantCulture);
    static OcxExitCode IOpenIntEnum<OcxExitCode>.From(int v) => new(v);
}
```

What this buys, each watched (`verify.log` V1, cases E4, E4b, E6, E6b, E8, E9, E13):

| Input | Policy result | Why |
|---|---|---|
| `exit_code: 83` (no row) | kept: `Value 83`, `IsKnown false`, `Name null`, `ToString "83"` | an open set; ocx reused 82 with a new meaning between 0.6.5 and main ([API] CS-ERR-02), so an unknown number must be representable |
| `"exit_code": "65"` | document ignored, process exit kept (E6) | `JsonStringEnumConverter` and `AllowReadingFromString` accept it (naive P5); a wrong JSON kind is not a value |
| `65.0` | document ignored (E6b) | `Utf8JsonReader.TryGetInt32` refuses a fraction/exponent spelling |
| process exit `-1073741819` (0xC0000005 as `int`) | valid unknown code (E8) | `Process.ExitCode` is `int` and "reflects the specific convention implemented by the application developer" ([Process.ExitCode](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process.exitcode)); the Win32 status is a `DWORD` ([GetExitCodeProcess](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-getexitcodeprocess)); a `byte` or closed `enum` loses it. Windows itself unverified |
| process exit 143 with empty stdout | valid unknown code, no document (E9) | signal-style status; stdout is empty |
| `default(OcxExitCode)` | `0 Success` (E13) | trap: a `FirstOrDefault` over the 13 rows returns Success for a missing code |

The framework guidance agrees with an open struct, not an enum: "DO NOT use an enum for open sets" ([Framework Design Guidelines, enum design](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/enum)), Azure allows "a `readonly struct` in place of an `enum` that declares well-known fields but can contain unknown values returned from the service" ([Azure .NET guidelines](https://azure.github.io/azure-sdk/dotnet_introduction.html)), and protobuf moved proto3 and editions to open enums "specifically because of the unexpected behavior that closed enums cause" ([protobuf enums](https://protobuf.dev/programming-guides/enum/)). PowerShell's native-command exception stores a plain `int` ([PowerShell__PowerShell@5d871eb5e02c:src/System.Management.Automation/engine/NativeCommandProcessor.cs:184](file:///home/mherwig/.cache/research-lang/exemplars/csharp/PowerShell__PowerShell/src/System.Management.Automation/engine/NativeCommandProcessor.cs)); `OcxExitCode` is that int with names and a safe default.

`OcxErrorKind` (the 11-row `ErrorCategory`) is the string twin: a `readonly record struct OcxErrorKind(string Value)` with 11 static instances, `IsKnown` and the existing `OpenEnumConverter<T>` (string tokens only). 11 rows are stable enough to name; 516 are not (F1).

Wrong versus right, side by side:

```csharp
// WRONG: compiles, passes the happy path, loses information or throws on a newer ocx
[JsonConverter(typeof(JsonStringEnumConverter))] public enum ExitCode { Success = 0, DataError = 65 /* ... */ }
var code = (ExitCode)process.ExitCode;                       // 83 -> prints "83", Enum.IsDefined false
var hit  = OcxExitCode.Known.FirstOrDefault(x => x.Value == v); // missing -> default -> 0 Success

// RIGHT
var code = new OcxExitCode(process.ExitCode);                // total: any int32
var hit  = OcxExitCode.Known.Where(x => x.Value == v).ToArray(); // Length 0 means "not a row"
```

### F3 Error document to OcxCommandException

[API] CS-ERR-01 already lists the property names. This table fixes nullability, sources and the two changes (typed `PartialReport`; `Detail` has no constants).

| Property | Type | Source | Rule |
|---|---|---|---|
| `ExitCode` | `OcxExitCode` | process exit status | authoritative; the document's `exit_code` never overrides it (E5: process 65, document 83 gives exit 65) |
| `ErrorKind` | `OcxErrorKind?` | `error.kind` | null when no valid document; unknown values kept (`future_kind`, `IsKnown false`, E2) |
| `Detail` | `string?` | `error.detail` | null when omitted (E3) or no document; **no constants for the 516 slugs** |
| `Context` | `OcxErrorContext?` | `error.context` | sealed class with `Identifier`, `Source`, `Target` (all `string?`); present only with a valid document |
| `OcxMessage` | `string?` | `error.message` | display only; bounded and redacted per CS-ERR-08; never in `Message` (E12: `Message` is the fixed template `ocx pull failed (exit 65 DataError): lock_stale.`) |
| `PartialReport` | `object?` | typed report from stdout | the command's own sealed report class when the command printed one (F5); replaces `PartialReportJson` |
| `IsTransient` | `bool` | `ExitCode == OcxExitCode.TempFail` | CS-ERR-10, unchanged (R8) |
| `Command` | `string` | the SDK's own command name | not taken from the document (`command` is empty when the line named none) |

The document's `schema_version` is not exposed on the exception. The handshake already refuses a differing `contract.errors` before any spawn ([CJ] CS-JSON-10); on the failure path a version-2 document is simply ignored (E7).

```csharp
// RIGHT: pattern-match the typed report, branch on code then kind then detail (CS-ERR-02 order)
try { await client.UpdateAsync(options, ct); }
catch (OcxCommandException e) when (e.PartialReport is UpdateReport r) { Handle(r, e.ExitCode); }
catch (OcxCommandException e) when (e.ExitCode == OcxExitCode.NotFound) { /* ... */ }
catch (OcxCommandException e) when (e.Detail == "lock_stale") { /* a private const in the SDK, not a public constant */ }
```

Cost of modelling the detail list as constants (`F/detail/`, `verify.log` V11): 516 static properties compile to a 107,520 B assembly against 5,120 B for the plain struct, add 516 lines to `PublicAPI.Shipped.txt`, and a new slug is a new public member: with PublicApiAnalyzers RS0016 fails the build for every ocx release that adds one. The detail-to-exit-code relation is still useful as data: the schema-diff test checks that every `ErrorDetail.exit_code` is a row of `ExitCode` (`detail-exit-unknown`, F7).

### F4 Failure-path rules

The rule is one sentence: **once the process exited non-zero, no problem with stdout may change the exception type or hide the exit code.** The only types that replace `OcxCommandException` on that path are the launch, timeout and cancellation ones (CS-ERR-05), which are not stdout problems.

| Case (fixture id) | Exit | Stdout | Result |
|---|---|---|---|
| E1/E1b | 65, 81 | valid document | `OcxCommandException` with kind, detail, context |
| E5 | 65 | document says `exit_code` 83 | `ExitCode 65` |
| E6, E6b, E6c | 65 | `exit_code` string / `65.0` / missing `context` | document ignored, `ExitCode 65` |
| E7 | 65 | `schema_version` 2 | document ignored, `ExitCode 65` |
| E11 | 65 | duplicate `exit_code` key | document ignored (`AllowDuplicateProperties = false` throws inside the bind), `ExitCode 65` |
| E8/E9 | -1073741819 / 143 | empty | `OcxCommandException`, no document |
| R5 | 65 | `oops, not json` | `OcxCommandException` (exit wins) |
| R5b | 0 | `oops, not json` | `OcxDecodeException` |
| R6 | 0 | report with `schema_version` 2 | `OcxContractException` |
| R6b | 65 | report with `schema_version` 2 | `OcxCommandException`, no report attached |
| R7/R7b | 65 / 0 | report with wrong shape | `OcxCommandException` / `OcxDecodeException` |

Why not `OcxDecodeException` for R5-R7 with a non-zero exit: the exit code is the contract's primary signal ("Read the exit code first, then parse stdout", [machine interface](https://ocx.sh/docs/reference/machine-interface), Outcomes), a retry policy keys on it (75), and a decode problem on a failing command is secondary information, not the cause.

### F5 report_then_fail

Facts. `cli.json` marks 17 output entries of type `report_then_fail` over **14 commands** (`update`, `upgrade`, `package attest`, `package cascade check`, `package cascade repair`, `package copy`, `package deps`, `package inspect`, `package prune`, `package push`, `package sign`, `package test`, `patch test`, `inspect`); each `report_then_fail` root is also a success root of the same command, and some commands have two roots chosen by arguments (`update` / `VerboseUpdateReport`, `package sign` / `SweepReport<SignatureReport>`) ([ocx]`tests/golden/cli.json`, walked with `python3 -I`). The earlier audit's "17 modes" is right; "17 commands" would be wrong. Contract text: "Report, then fail | Non-zero | The report root. No error document follows it" and "Stdout is never two concatenated JSON values" ([machine interface](https://ocx.sh/docs/reference/machine-interface), Outcomes). A failure before the command runs (usage 64, config 78) prints an error document instead, even for these commands (fixture R3).

Design, in `F/lib/Errors.cs` (`OcxOutcome.Complete`):

1. **Skim, do not parse.** Walk the stdout bytes with `Utf8JsonReader` over the top-level members only (`Skip()` over every value) and record: is it an object, does it have an `error` object, a numeric `exit_code`, an int `schema_version`. No allocation, no object model. Malformed JSON throws `JsonException`, handled per F4.
2. **Classify by shape.** Non-zero exit and top-level `error` object and numeric `exit_code` means error document. Otherwise the stdout is the command's report. The discriminator is safe because no report root has both members (schema-diff `root-looks-like-error-document`, 0 of 56 today) and the guard turns a future collision into a red test.
3. **Bind once.** `JsonSerializer.Deserialize(bytes, info)` for the document or for the report: one binding pass (`BindCount == 1`, cases R1b, R2b, R3b).
4. **Attach to the leaf that matches what the process did.** Non-zero exit and a valid report: `OcxCommandException` with `PartialReport` set to the typed report; if the caller passed the accepted exit codes (CS-ERR-09), return the report and throw nothing (R2). Error document: `OcxCommandException` with kind/detail/context (R3).

```csharp
// RIGHT (F/lib/Errors.cs, abridged): classify with a skim, bind once, exit code wins on the failure path
var shape = Skim(stdout);                                  // top-level keys only
if (exitCode != 0 && shape.HasErrorObject && shape.HasExitCodeNumber)
{
    ErrorDocument? ed = null;
    if (shape.SchemaVersion == ErrorDocumentVersion)
        try { ed = JsonSerializer.Deserialize(stdout, OcxJsonContext.Default.ErrorDocument); } catch (JsonException) { }
    throw new OcxCommandException(command, exit, ed?.Error.Kind, ed?.Error.Detail, ed?.Error.Context, ed?.Error.Message, null);
}
// ... version check ...
var report = JsonSerializer.Deserialize(stdout, reportInfo) ?? throw new JsonException("document is null");
if (exitCode == 0 || acceptedNonZero.Contains(exitCode)) return report;
throw new OcxCommandException(command, exit, null, null, null, null, report);   // typed report attached
```

```csharp
// WRONG: "non-zero means error document" (R-naive in verify.log V8). On a real report_then_fail document:
if (exit != 0) { var d = JsonSerializer.Deserialize(stdout, ctx.ErrorDocument)!; throw new Failed(d); }
//   -> JsonException leaks (the report has no `error`), the exit code and the report are both lost.
// WRONG too: try the error document, catch JsonException, then decode the report - exception as control flow and two binds.
```

Measurements (`verify.log` V8, shared machine, Stopwatch, N=20,000 / 300; read as order-of-magnitude): for a 0.3 KB report skim+bind, `JsonDocument.Parse`+`Deserialize(element)` and error-document-first all land at 14 to 23 us per call; for a 328 KB report at 0.77 to 1.1 ms. No variant wins consistently. **The single-bind rule is about correctness (one place classifies, no exception as control flow, the exit code survives), not speed.** The skim is preferred because the process engine already holds `byte[]` (CS-PROC byte pump) and it allocates nothing; `JsonElement.Deserialize` re-reads the element's UTF-8 span internally anyway, so a `JsonDocument` is not "parse once" in cost terms ([JsonSerializer.Deserialize overloads](https://learn.microsoft.com/en-us/dotnet/api/system.text.json.jsonserializer.deserialize)).

Why `object? PartialReport` and not `PartialReportJson` or a generic leaf: [API] CS-ERR-01 caps the hierarchy at five sealed leaves, so `OcxCommandException<TReport>` is out; a raw string forces every caller to run the matching decoder again (Python's `partial_report` + `from_json` two-step) and keeps up to the 16 MiB stdout cap alive on an object that loggers capture; a typed property is one pattern match. Trade-off in Contested.

### F6 The generic TaggedUnionConverter

#### Design (all of it, `F/lib/TaggedUnion.cs`)

```csharp
internal readonly struct UnionArm<TBase> where TBase : class
{
    public string Tag { get; }
    public Type ArmType { get; }
    private UnionArm(string tag, Type armType) { Tag = tag; ArmType = armType; }
    public static UnionArm<TBase> Of<TArm>(string tag) where TArm : class, TBase => new(tag, typeof(TArm)); // constraint = compile-time proof arm : base
}

internal interface ITaggedUnion<TBase> where TBase : class, ITaggedUnion<TBase>
{
    static abstract IReadOnlyList<UnionArm<TBase>> Arms { get; }
    static abstract TBase Unknown(string tag, JsonElement raw);
}

internal sealed class TaggedUnionConverter<TBase> : JsonConverter<TBase> where TBase : class, ITaggedUnion<TBase>
{
    public override TBase? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        using var doc = JsonDocument.ParseValue(ref reader);
        var root = doc.RootElement;
        if (root.ValueKind != JsonValueKind.Object || !root.TryGetProperty("type"u8, out var tag) || tag.ValueKind != JsonValueKind.String)
            throw new JsonException($"{typeof(TBase).Name}: a union without a string \"type\" is malformed, not unknown.");
        foreach (var arm in TBase.Arms)
            if (tag.ValueEquals(arm.Tag))                                    // ordinal, escape-aware, no allocation
                return (TBase?)root.Deserialize(options.GetTypeInfo(arm.ArmType))   // the CALLER's options
                    ?? throw new JsonException($"{typeof(TBase).Name}.{arm.Tag}: arm is null.");
        return TBase.Unknown(tag.GetString()!, root.Clone());               // Clone: Raw outlives the JsonDocument
    }
    public override void Write(Utf8JsonWriter writer, TBase value, JsonSerializerOptions options) => throw new NotSupportedException("read-only model");
}
```

Per union (hand-written once, `F/lib/gen/Unions.generic.g.cs` shows all 13): the base is a `public abstract class` with an `internal` constructor (CS-API-08), `public required string Type`, the attribute, and the table:

```csharp
[JsonConverter(typeof(TaggedUnionConverter<SkippedReason>))]
public abstract class SkippedReason : ITaggedUnion<SkippedReason>
{
    internal SkippedReason() { }
    [JsonPropertyName("type")] public required string Type { get; init; }
    private static readonly UnionArm<SkippedReason>[] s_arms =
    [
        UnionArm<SkippedReason>.Of<SkippedReasonBootstrap>("bootstrap"),
        UnionArm<SkippedReason>.Of<SkippedReasonOffline>("offline"),
        // ... one row per tag in reports.json
    ];
    static IReadOnlyList<UnionArm<SkippedReason>> ITaggedUnion<SkippedReason>.Arms => s_arms;
    static SkippedReason ITaggedUnion<SkippedReason>.Unknown(string tag, JsonElement raw) => new UnknownSkippedReason { Type = tag, Raw = raw };
}
public sealed class SkippedReasonOffline : SkippedReason { }
public sealed class UnknownSkippedReason : SkippedReason { public required JsonElement Raw { get; init; } }
// plus one [JsonSerializable(typeof(...))] per base and per known arm on OcxJsonContext
```

The old per-union converter was 25 lines of `JsonDocument`, a `switch` and a local `Arm<T>` helper (`F/lib/gen/Unions.hand.g.cs`, 13 copies, 326 lines in total); the table is 11 lines of data per union.

Why each design point (proven, not asserted):

- **Registration is by attribute on the base, with a closed generic converter type.** `[JsonConverter(typeof(TaggedUnionConverter<SkippedReason>))]` resolves at compile time under source generation. The attribute is not inherited by arms: the runtime looks up the type-level attribute with `inherit: false` ([DefaultJsonTypeInfoResolver.Converters.cs:152 @ v10.0.0](https://github.com/dotnet/runtime/blob/v10.0.0/src/libraries/System.Text.Json/src/System/Text/Json/Serialization/Metadata/DefaultJsonTypeInfoResolver.Converters.cs)), and the source generator reads the arm's own symbol attributes. That is why `options.GetTypeInfo(typeof(SkippedReasonOffline))` yields the arm's object contract and not the union converter again (infinite recursion otherwise). The attribute docs say a type-level converter is used "unless a compatible converter is added to the `JsonSerializerOptions.Converters` collection" ([JsonConverterAttribute](https://learn.microsoft.com/en-us/dotnet/api/system.text.json.serialization.jsonconverterattribute)); the context's options never add one.
- **Arm binding through the caller's options.** `JsonSerializerOptions.GetTypeInfo(Type)` returns "the contract metadata resolved by the current JsonSerializerOptions instance" and "can be downcast to `JsonTypeInfo<T>`" ([GetTypeInfo](https://learn.microsoft.com/en-us/dotnet/api/system.text.json.jsonserializeroptions.gettypeinfo)); the non-generic `JsonSerializer.Deserialize(JsonElement, JsonTypeInfo)` returns `object?` ([JsonSerializer.Deserialize](https://learn.microsoft.com/en-us/dotnet/api/system.text.json.jsonserializer.deserialize)). With this, the strict test instrument of [CJ] CS-JSON-13 (`new OcxJsonContext(new JsonSerializerOptions(Default.Options) { UnmappedMemberHandling = Disallow })`) reaches the arms: 13 of 13 unions refuse an added key inside a known arm (S4) and still keep an unseen tag (S6); the planted `RED_DEFAULT` twin (arms bound via `OcxJsonContext.Default`) fails exactly those 13 S4 cases. Use the non-generic `GetTypeInfo(Type)`: the generic `GetTypeInfo<T>()` is listed only for .NET 10+ monikers in the API docs (it exists in the System.Text.Json 10 package that net8 consumes, but a rule that does not depend on that is safer).
- **AOT and trim clean without `MakeGenericType`.** `typeof(TArm)` inside the generic `Of<TArm>` is statically known; the constrained call `TBase.Arms` is a static-abstract interface call ([static abstract interface members, C# 11](https://learn.microsoft.com/en-us/dotnet/csharp/advanced-topics/interface-implementation/static-virtual-interface-members)) resolved per closed instantiation; there is no factory and no `Activator`. `IsAotCompatible` + `TreatWarningsAsErrors` build clean on net8 and net10, `dotnet publish -r linux-x64 -p:PublishAot=true -p:TreatWarningsAsErrors=true` reports 0 warnings, and the native binary passes 198/198 (V5). Reflection is off for the whole run (`JsonSerializerIsReflectionEnabledByDefault=false`), the documented way to make reflection fallbacks fail loudly ([source generation](https://learn.microsoft.com/en-us/dotnet/standard/serialization/source-generation)).
- **Nothing public.** `ITaggedUnion<>`, `UnionArm<>` and the converter are `internal`; the base implements the interface explicitly, so its members are not callable as `SkippedReason.Arms`. A reflection dump of the shipped assembly shows 0 public types matching, 0 public `Arms`/`Unknown` members, and `typeof(Prior).GetInterfaces()` lists `ITaggedUnion`1(internal)` (V13).
- **`[JsonPolymorphic]` stays rejected** and the reason is now documented by Microsoft too: type-discriminator polymorphism "is only supported for type hierarchies that use the default converters for objects, collections, and dictionary types" and `UnknownDerivedTypeHandling` governs serialization ([polymorphism](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/polymorphism)); there is no "unknown tag becomes an Unknown arm" mode ([CJ] Verdict 4).

#### Behaviour matrix (all 13 unions, both strategies identical)

Generated by `gen/gen.py` from `reports.json`; each union gets the cases below, 165 in total (case C3e needs a required scalar member, which 9 of 13 unions have). Expected values are asserted per case; the full per-case output is written to `out/cases.<impl>.<tfm>.txt` and the four files (hand/generic x net10.0/net8.0) have the same md5 `3d35d10c79e10a92ad581845b98615c3`; the AOT run of both strategies also matches byte for byte.

| Case | Payload shape | Result (both strategies) |
|---|---|---|
| C3 | unseen tag `gravity_failure` + extra member | `Unknown{U}` keeping `Type` and the whole raw object |
| C3b | known tag **last** in the object | the known arm |
| C3c | no `type` member | `JsonException` |
| C3d | `"type": 5` | `JsonException` (the InvalidOperationException from `GetString()` is wrapped by STJ; the explicit `ValueKind` check is still required for `null`, see red twin) |
| C3d2 | `"type": null` | `JsonException` |
| C3d3 | value is `[]` | `JsonException` |
| C3e | known tag, required scalar given `{}` | `JsonException` (never Unknown) |
| C3f | upper-cased known tag | `Unknown{U}` (ordinal compare) |
| C3g | `"type": ""` | `Unknown{U}` with empty tag |
| C3h | known tag written with a `\u00xx` escape | the known arm |
| S4 | strict copy, added key inside a known arm | `JsonException` |
| S5 | strict copy, valid known arm | the known arm |
| S6 | strict copy, unseen tag with an added key | `Unknown{U}` (an open arm is not made strict) |

Planted converter bugs, run against the same matrix (`verify.log` V3): `TAGKIND` (no `ValueKind == String` check: `{"type":null}` becomes `Unknown` with a null tag) fails 13 cases; `SWALLOW` (catch `JsonException`, return `Unknown`, the anthropic-sdk-csharp style) fails 22; `DEFAULT` (arms via `OcxJsonContext.Default`) fails 13; unplanted: 0. Registration red (V4): deleting `[JsonSerializable(typeof(PriorValue))]` leaves the 164 other cases green and fails `Prior/C3e` with **`NotSupportedException`** (not `JsonException`) plus the registration loop; this is why the loop over `UnionMap`/`Arms` is a required test, and why the decode seam must treat any non-`JsonException` from STJ as a programming error ([CJ] Verdict 5).

#### The flattened union

`Var` is "an environment variable declaration" with `key` and `visibility` beside the tag and arms `$ref` to `Path`, `Constant`, `List` (`reports.json#/$defs/Var`: base `properties`+`required`, `oneOf` arms with `$ref`). The first generated draft put `Key` and `Visibility` as `required` on the abstract base and failed to compile: `error CS9035: Required member 'Var.Key' must be set in the object initializer` at the `Unknown` factory. The correct model puts shared members on every **known** arm (generator emits them; the base keeps only `Type`). It is the only flattened union of 13; the other 12 have no base-level members. The Unknown arm keeps everything in `Raw`.

#### Measurements (`verify.log` V5-V7)

| Measure | Hand-written (13 converters) | Generic (1 converter + 13 tables) |
|---|---|---|
| Union-support source lines (non-blank) | 326 | 170 + 44 shared converter/interface/struct |
| `Lib.dll` size | 240,640 B | 241,664 B (+1,024 B) |
| Native AOT app size (registry excluded), linux-x64 | 4,022,240 B | 4,057,808 B (+35,568 B, +0.9 %) |
| Decode time, JIT net10.0, us/call: known arm / unseen / flattened | 0.76 / 0.43 / 1.03 | 0.89 / 0.51 / 1.03 |
| Decode time, Native AOT, us/call: known arm / unseen / flattened | 0.92 / 0.51 / 1.41 | 1.04 / 0.65 / 1.34 |
| Cases passed (JIT net8.0.31, net10.0.12, AOT, .NET 11 RC1 runtime) | 165/165 (AOT 165/165) | 165/165 on all four |

The timing is a Stopwatch loop (median of five rounds, 200,000 calls), not BenchmarkDotNet, on a shared machine: it supports "about the same", not a ranking. Process spawn costs milliseconds, five orders above a decode.

#### Comparison with the exemplars

- `anthropics__anthropic-sdk-csharp@ae16e5933f39`: `ToolChoiceConverter` (`src/Anthropic/Models/Messages/ToolChoice.cs:331`) reads a `JsonElement` with the **options overload** (line 339), switches on the tag per union, and on a known tag whose payload fails to bind does `catch (JsonException) { // ignore }` and returns the raw-element arm (lines 362-365, repeated per tag); that is the `SWALLOW` red twin above and contradicts the ocx rule "a registered tag with a bad payload is an error". Its open enum is `_ => (ErrorType)(-1)` (`src/Anthropic/Models/ErrorType.cs:41`), which drops the unseen value; ocx wants the value kept. Both are generated code, one converter per union.
- `openai__openai-dotnet@1f0e8829acac`: `DeserializeResponseItem` switches on `discriminator.GetString()` (`OpenAI.Responses/src/Generated/Models/ResponseItem.Serialization.cs:117-119`) and falls through to an `Unknown` resource (line 165). A numeric tag makes `GetString()` throw `InvalidOperationException`, and `TryGetProperty` throws on a non-object element, neither of which is `JsonException`. Also generated, per union.
- `dotnet__aspire@af646baee1e8:src/Aspire.Hosting/Dcp/Model/ModelCommon.cs:19-22` uses `static abstract string ObjectKind { get; }` on an internal interface as a per-type table entry, and `npgsql__npgsql@9c47244547c2:src/Npgsql/Internal/Converters/Primitive/TextConverters.cs:59-63` uses `static abstract` conversion hooks on an internal interface behind a generic converter: the same internal static-abstract pattern, shipped in production code.
- The conclusion from the exemplars: per-union code is what a generator emits; where models are maintained by hand, the right unit is a table (data) and one reviewed converter. If `ocx_sdkgen` ever grows a C# backend, it should emit the `Arms` table and the arm classes and leave the converter alone.

#### Verdict

**Adopt.** One converter instead of 13 means one place defines the tag rules, the tables are enumerable (registration loop, schema-diff), the strict-copy property holds by construction and the cost is below measurement noise. What would reverse the verdict: a union whose tag is not `type`, a union with an arm that needs a custom converter (neither exists in the 13: the schema-diff test asserts the tag property is `type` const), or STJ gaining a native "unknown derived type" mode that keeps the raw object.

### F7 The schema-diff extension

[CJ] CS-JSON-11 already specifies `union-arm-new/-stale/union-closed` classes against "the converter's `Arms`". With the table in place they are exact, and four more classes cover this revision. `F/diff/Program.cs` (`SchemaDiff <dir> [reports] [errors] [cli]`, exit 1 on any finding):

| Class | Compares | Planted twin that turned it red |
|---|---|---|
| `union-arm-new` / `union-arm-stale` | `oneOf` `properties.type.const` tags vs `ITaggedUnion<T>.Arms` tags | `reports.union_new.json` (+`quarantined`), `reports.union_stale.json` (-`offline`) |
| `union-unmapped` / `union-extra` | schema unions vs `UnionMap.All` keys | `reports.new_union.json` (new `Zork`), `reports.closed.json` |
| `union-closed` / `union-schema-inconsistent` | the `x-ocx-unknown-variant` arm exists and its `not.enum` equals the known tags | `reports.closed.json` |
| `arm-unregistered` | every table arm resolves in the context | (V4: deleted `[JsonSerializable]`) |
| `exit-new` / `exit-renamed` / `exit-stale` | `ExitCode` `x-ocx-enum` (value, name) vs `OcxExitCode.Known` | `errors.exit_new.json` (+83), `errors.exit_renamed.json` |
| `kind-new` / `kind-stale` | `ErrorCategory` values vs `OcxErrorKind.Known` | `errors.kind_new.json` |
| `detail-exit-unknown` | every `ErrorDetail.exit_code` is an `ExitCode` row | `errors.detail_exit.json` (exit 99) |
| `error-body-required` | `ErrorBody.required` is exactly `[context, kind, message]` (detail stays optional) | `errors.detail_required.json` |
| `root-looks-like-error-document` | no report root has both `error` and `exit_code` | `reports.collide.json` |
| `rtf-new` / `rtf-stale` | `(command, root)` pairs with `report_then_fail` in `cli.json` vs `ReportThenFailTable.Pairs` (17) | `cli.rtf_new.json` |

Result (`verify-diff.log`, V12): real goldens `failures=0` (13 unions, 13 exit codes, 11 kinds, 17 rtf pairs); each of the 11 twins exits 1 with the listed class; regenerating models and tables from `reports.union_new.json` and rebuilding turns that twin green; restoring the real tables is green again. `cli.json` is "golden only" (not published), so the test vendors it with the other two; the pair table is hand-maintained because the SDK method set is.

Answer to the brief's question (4): **yes**, the schema-diff test verifies the arm table, and more strongly than it could verify a `switch`, because the table is enumerable.

### F8 Era notes

- **net8.0 floor.** `JsonElement`, `Utf8JsonReader`, `JsonSerializerOptions.GetTypeInfo(Type)` and `static abstract` all exist on the net8 inbox library; the STJ 10 package (policy of [CJ] CS-JSON-14) supplies the options the context uses. No `#if` anywhere in `F/lib` for this revision. Without the package line the lib does not build ([CJ] V4).
- **net10.0 / C# 14.** `GetTypeInfo<T>()` appears only in the net-10.0 and later API monikers ([GetTypeInfo](https://learn.microsoft.com/en-us/dotnet/api/system.text.json.jsonserializeroptions.gettypeinfo)); the converter does not use it.
- **.NET 11 RC1 (GA November 2026).** (a) The SDK 11.0.100-rc.1.26425.128 builds the whole fixture at 0 warnings and the .NET 11 RC1 runtime (`dotnet exec --fx-version 11.0.0-rc.1.26425.128`) passes 198/198 (V9). (b) `[JsonConverter]` accepts **open generic** converter types "on generic types when the total type parameter arity matches" ([converters how-to](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/converters-how-to)): that is for `Option<T>`-style model types and does not apply to non-generic union bases, which keep the closed spelling `typeof(TaggedUnionConverter<X>)`. (c) `InferClosedTypePolymorphism` / C# 15 `closed` stay out for wire unions ([polymorphism](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/polymorphism), [CJ] Verdict 4).
- **Not measured.** Windows and macOS; Native AOT on win-x64/osx-arm64 ([CJ] CS-JSON-04 asks for them in CI); a real `ocx` binary (Ocx.Fake stands in); the full 340-LOC process engine.

### F9 Verified on the toolchain

Fixture `F` (`lib/`, `app/`, `fake/`, `diff/`, `naive/`, `detail/`, `gen/gen.py`, `twins/`, `schema/`); entry point `F/verify.sh` (about 5 minutes), output `F/verify.log`, schema-diff output `F/verify-diff.log`. Every command below was run through `/home/mherwig/.cache/research-lang/dotnet-tools/run.sh` (SDK 10.0.401 via the parent `global.json`, `latestPatch`).

| Id | Command (from `F/app` unless noted) | Observed |
|---|---|---|
| V1 green | `dotnet build -c Release --no-incremental -p:UnionImpl=generic`, then `dotnet run -c Release --no-build -f net10.0` and `-f net8.0` | `Build succeeded.` (net8.0;net10.0, `IsAotCompatible`, `TreatWarningsAsErrors`); `.NET 10.0.12` and `.NET 8.0.31`: `union cases: 165, wrong=0`, `total=198 wrong=0` |
| V2 green | same with `-p:UnionImpl=hand`; `CASES_OUT=../out/cases.<impl>.<tfm>.txt`; `md5sum` | four files, one md5 `3d35d10c79e10a92ad581845b98615c3`, 165 lines each |
| V3 red | `dotnet build ... -p:UnionImpl=generic -p:RedMode=TAGKIND|SWALLOW|DEFAULT` then run | `13`, `22`, `13` failing cases (first: `FAIL EntrySource/C3d2 null tag: want JsonException, got UnknownEntrySource||{"type":null}`; `FAIL EntrySource/C3e known tag, bad payload: want JsonException, got UnknownEntrySource|patch|...`; `FAIL EntrySource/S4 strict: added key in arm: want JsonException, got EntrySourcePackage|package`); no RedMode: `0 failing cases` |
| V4 red | delete `typeof(PriorValue)` from `lib/gen/Context.g.cs`, build, run; restore | `FAIL Prior/C3e known tag, bad payload: want JsonException, got NotSupportedException`; `FAIL U-REG ... unregistered=1`; restored: `total=198 wrong=0` |
| V5 green | `PATH=$SHIM:$PATH dotnet publish -c Release -f net10.0 -r linux-x64 -p:PublishAot=true -p:TreatWarningsAsErrors=true -p:UnionImpl=generic|hand -o ../aot-<impl>`, then run the binary | `publish warnings/errors=0` for both; `runtime .NET 10.0.12`, `union cases: 165, wrong=0`, `total=198 wrong=0` (hand 197: no registry); AOT generic output `cmp`-equal to the JIT hand output |
| V6-V7 | sizes with `stat -c%s`, `BENCH=1` runs (JIT net10.0 and the AOT binaries) | F6 measurement table: Lib.dll 240,640 vs 241,664 B; AOT app 4,022,240 vs 4,057,808 B; decode 0.43 to 1.41 us |
| V8 | `SHOW_NAIVE=1 dotnet run ...` | `NAIVE report+exit 65 -> LEAK:JsonException`; three timing variants within noise |
| V9 green | copy to `F/sdk11` with `global.json` `11.0.100-rc.1.26425.128`; build; `dotnet exec --fx-version 11.0.0-rc.1.26425.128 bin/Release/net10.0/App.dll` | `Build succeeded.`; `runtime .NET 11.0.0-rc.1.26425.128`; `total=198 wrong=0` |
| V10 red/green | `dotnet bin/Release/net10.0/Naive.dll F/schema` vs the E/R cases | naive: `THROWS JsonException` x2, `ok exit=83 (IsDefined=False)`, `ok exit=DataError` for `"65"`; policy: all E1-E13, R1-R8 `PASS` |
| V11 | `dotnet build` in `F/detail/Consts` and `Plain`; `stat -c%s` | `Consts: 107520 B`, `Plain: 5120 B`, 517 `public static` lines |
| V12 red/green | `F/verify-diff.sh` | real golden `failures=0` exit 0; 11 twins exit 1 with the classes in F7; table-updated twin exit 0; restored exit 0 |
| V13 | `dotnet build -p:ApiDump=true` and run | `API public types=81; public ITaggedUnion/UnionArm/TaggedUnionConverter types=0; public members named Arms/Unknown(string,..)=0`; `Prior interfaces: [ITaggedUnion`1(internal)]` |
| V14 | reviewer greps from the rules below, run on `lib` (green) and on `twins/red/PlantedConverter.cs`, the hand variant, `naive/` and `detail/` (red) | green/red hits: G1 0/13, G2 0/1, G4 0/1, G5 0/2, G6 0/1, G7 0/2, G8 0/1, G9 0/1, G10 0/1, G11 0/1; G3 green=1 is `Errors.cs:75`, the decode seam, outside a converter (rule 2 scopes to converter files) |

The fixture's process engine is deliberately tiny (`ProcessStartInfo` + `ReadToEnd`, launched `dotnet exec Fake.dll emit <file> <exit>`): it exercises the decode seam against real exit codes and real stdout bytes, not the CS-PROC engine.

## Normative guidance candidates

Each rule: statement; why; how a reviewer verifies. Greps are POSIX `grep -rE` run from the repo root with `src` for library code; empty output is a pass. `X='--exclude-dir=bin --exclude-dir=obj'`.

1. **Define every wire union with the shared `TaggedUnionConverter<TBase>` and a `UnionArm<TBase>.Of<TArm>("tag")` table; write no per-union `JsonConverter<>`.** Why: one reviewed definition of the tag rules; 13 copies drift. Verify: `grep -rnE --include='*.cs' ':\s*JsonConverter<' src $X | grep -vE 'TaggedUnionConverter<|OpenEnumConverter<|OpenIntEnumConverter<'` prints nothing (V14 G1: lib 0, hand-written variant 13).
2. **Bind arms only via `options.GetTypeInfo(armType)` with the converter's `options`; a converter never names `OcxJsonContext.Default`.** Why: strict-option copies must reach arms (13 S4 cases red otherwise). Verify: `grep -rlE --include='*.cs' 'JsonConverter<' src $X | xargs -r grep -nE 'OcxJsonContext\.Default'` prints nothing (in the fixture it prints only the planted `#if RED_DEFAULT` line `TaggedUnion.cs:52`); tests run the S4 case for every entry of `UnionMap.All`.
3. **No reflection dispatch in converters: no `MakeGenericType`, `Activator.CreateInstance`, `Type.GetType`, `GetMethod(`, and no `GetTypeInfo<T>()`.** Why: IL3050/IL2026 under `IsAotCompatible`; the generic overload is net10-only in the API docs. Verify: `grep -rnE --include='*.cs' -e 'MakeGenericType|Activator\.CreateInstance|Type\.GetType|GetMethod\(' -e 'GetTypeInfo<' src $X` prints nothing; plus `dotnet publish -r linux-x64 -p:PublishAot=true -p:TreatWarningsAsErrors=true` exits 0.
4. **Keep the union machinery `internal`: `ITaggedUnion<>`, `UnionArm<>`, `TaggedUnionConverter<>`; implement `Arms` and `Unknown` explicitly on the base.** Why: no public surface to baseline or break. Verify: `grep -rnE --include='*.cs' -e 'public\s+(static\s+)?(readonly\s+)?(interface|class|struct)\s+(ITaggedUnion|UnionArm|TaggedUnionConverter)' -e '^\s*public static .*\b(Arms|Unknown)\b' src $X` prints nothing.
5. **A union base declares only `Type`; members shared by arms (flattened unions) are declared on each known arm.** Why: the Unknown arm guarantees only `type`; a `required` base member makes the `Unknown` factory uncompilable (CS9035). Verify: the build itself (TWAE) plus reading heuristic: in each class that implements `ITaggedUnion<`, the only `required` member is `Type`.
6. **Every union tag read is guarded: require `JsonValueKind.String` before `GetString()`; never `GetProperty("type").GetString()` or `GetString() switch`.** Why: numeric/null tags otherwise throw non-`JsonException` or become `Unknown` with a null tag (13 red cases). Verify: `grep -rnE --include='*.cs' -e 'GetProperty\("type"\)\.GetString\(\)' -e 'GetString\(\)!?\s*switch' src $X` prints nothing; case matrix C3c, C3d, C3d2, C3d3 per union.
7. **A known tag with a bad payload is an error, never `Unknown`; do not catch `JsonException` around arm binding.** Why: `SWALLOW` twin fails 22 cases; the ocx contract skips only unknown variants. Verify: `grep -rnE --include='*.cs' 'catch \((System\.Text\.Json\.)?JsonException' src $X | grep -v 'Errors.cs'` prints nothing (catches live in the decode seam file only; the fixture prints only the planted `#if RED_SWALLOW` line `TaggedUnion.cs:50`) and case C3e per union.
8. **`TBase.Unknown(tag, raw)` always receives `root.Clone()`.** Why: `Raw` outlives the disposed `JsonDocument`. Verify: `grep -rnE --include='*.cs' 'TBase\.Unknown\(' src $X | grep -v 'Clone()' | grep -v static` prints nothing; test reads `Raw` after the call returns (C3).
9. **One test loops over the whole arm table: every arm resolves in the context (`ctx.GetTypeInfo(arm.ArmType)`), and the S4-S6 and C3-C3h matrix runs for every union.** Why: a missing `[JsonSerializable]` is `NotSupportedException` at first use of that tag only (V4). Verify: `dotnet test --filter FullyQualifiedName~WireContract` exits 0, and `grep -rn 'UnionMap.All' tests` finds the loop.
10. **Model integer open sets as `readonly record struct X(int Value)` with a number-only, int32-only converter; model the exit status as `OcxExitCode`.** Why: closed enums, `byte` and string-enum converters lose or mis-accept unknown/negative/quoted values. Verify: `grep -rnE --include='*.cs' -e '\benum\s+\w*Exit\w*' -e '\(\s*(byte|\w*Exit\w*)\s*\)\s*\w*([eE]xit|[cC]ode)' src $X` prints nothing; `grep -rn --include='*.cs' 'TryGetInt32' src | grep -c 'JsonTokenType.Number'` is at least 1.
11. **Never `FirstOrDefault`/`SingleOrDefault` over exit codes or other record-struct open enums whose `default` is a valid row.** Why: `default(OcxExitCode)` is `0 Success`. Verify: `grep -rnE --include='*.cs' 'OcxExitCode[^/]*\.(FirstOrDefault|SingleOrDefault)\(' src tests $X` prints nothing (V14 G6: planted file hits).
12. **Numeric exit literals live only in the exit table file.** Why: CS-ERR-02; one place to drift-test. Verify: `grep -rnE --include='*.cs' '\b(code|exitCode|ExitCode)(\.Value)?\s*(==|!=|is)\s*[1-9][0-9]*\b' src $X` prints nothing outside the exit table file (add `| grep -v <that file's path>` for it).
13. **`OcxCommandException.ExitCode` comes from the process; the document's `exit_code` is never copied onto the exception.** Why: E5; the document is advisory. Verify: `grep -rnE --include='*.cs' -e 'ed\??\.ExitCode' -e 'Document\w*\.ExitCode' src $X` prints nothing; test E5 (process 65, document 83 gives 65).
14. **On a non-zero exit, any stdout problem (non-JSON, wrong shape, wrong `schema_version`, duplicate key, string/float `exit_code`) yields `OcxCommandException` with the real code; the same problem on exit 0 yields `OcxDecodeException`/`OcxContractException`.** Why: F4. Verify: tests R5, R5b, R6, R6b, R7, R7b, E6-E11 pass; reading heuristic: in the outcome seam every `catch (JsonException` reachable with `exitCode != 0` constructs `OcxCommandException`.
15. **Classify a non-zero stdout by shape (top-level `error` object and numeric `exit_code` means error document) with one skim, then bind exactly once; never "try error document, catch, try report" and never "non-zero means error document".** Why: exception as control flow and a leaked `JsonException` (V8 NAIVE). Verify: `grep -rnE --include='*.cs' 'Deserialize[^;]*ErrorDocument' src $X | wc -l` is exactly 1 (the outcome seam), and tests R1b, R2b, R3b assert `BindCount == 1`.
16. **`OcxCommandException` carries the typed report as `object? PartialReport`; no raw stdout string is retained, and `PartialReportJson` is not declared.** Why: second decode, 16 MiB retained, logger capture. Verify: `grep -rnE --include='*.cs' -e 'PartialReportJson' -e 'string\??\s+(Stdout|RawStdout|Output)\b' src $X` prints nothing.
17. **`Detail` is `string?`; do not generate or hand-write constants/enums for `ErrorDetail` slugs. A slug the SDK itself branches on is a `private const string` at the use site.** Why: 505 to 516 values in three days; 107,520 B and 516 API lines. Verify: `grep -rlE --include='*.cs' 'struct\s+\w*ErrorDetail|enum\s+\w*ErrorDetail' src $X` prints nothing.
18. **Wire error-document members: `required` exactly for `schema_version`, `command`, `exit_code`, `error`, and `kind`, `message`, `context`; `detail` and the three context strings are nullable and never `required`.** Why: schema; naive `required Detail` throws on the conformance case. Verify: schema-diff class `error-body-required` plus conformance replay of `synthetic_error_without_detail` (`absent: /error/detail`).
19. **Run the schema-diff extension in CI against the vendored `reports.json`, `errors.json` and `cli.json` (pinned commit), with one planted twin per class kept in `tests/**/schema-twins/`.** Why: classes in F7; 11 reds watched. Verify: `dotnet test --filter FullyQualifiedName~WireContract` exits 0 and `ls tests/*/schema-twins | wc -l` is at least the number of classes.
20. **Keep the shape guard `root-looks-like-error-document` in the diff test.** Why: the classification in rule 15 is only safe while no report root has `error` and `exit_code`. Verify: the class exists in the test and fails on `reports.collide.json`.
21. **Keep the `(command, root)` `report_then_fail` table hand-maintained and diffed against `cli.json`; a typed method for such a command takes its accepted exit codes explicitly and returns the report for them.** Why: CS-ERR-09; 14 commands, 17 modes. Verify: class `rtf-new`/`rtf-stale` green; `grep -rn 'ReportThenFailTable' tests` finds the diff.
22. **Union and open-enum converters stay `internal`; the public API baseline (PublicApiAnalyzers) lists no converter, interface or arm table.** Why: F6. Verify: `grep -n -e 'Converter' -e 'ITaggedUnion' -e 'UnionArm' PublicAPI.Shipped.txt PublicAPI.Unshipped.txt` prints nothing.

## AI-agent angle

What an LLM characteristically gets wrong here, and the smallest mechanical check:

| Wrong move (compiles, looks standard) | Why it is wrong | Smallest check |
|---|---|---|
| `enum ExitCode : int` + `[JsonConverter(typeof(JsonStringEnumConverter))]`, or `(ExitCode)process.ExitCode` | undefined values, quoted numbers accepted; no unknown; name lost | rule 10 grep; `BannedSymbols.txt` entry for `JsonStringEnumConverter` (RS0030) |
| `OcxExitCode.Known.FirstOrDefault(...)` | `default` is `0 Success` | rule 11 grep (planted file hits) |
| `[JsonPolymorphic(IgnoreUnrecognizedTypeDiscriminators = true)]` + `[JsonDerivedType]` for a wire union | merges unknown, missing, numeric and wrong-case tags; `UnknownDerivedTypeHandling` is serialization-only | `grep -rnE 'JsonPolymorphic|JsonDerivedType' src` ([CJ] CS-JSON-07) |
| One hand-written `JsonConverter<T>` per union, copy-pasted, or a `JsonConverterFactory` using `MakeGenericType` | 13 drifting copies / IL3050 | rule 1 and 3 greps; AOT publish |
| `JsonSerializer.Deserialize<Arm>(element, options)` (reflection/options overload) inside the converter | IL2026/IL3050; the 2019-2023 tutorial form (also anthropic-sdk-csharp `ToolChoice.cs:339`) | IL2026/IL3050 as errors; [CJ] CS-JSON-01 grep |
| Binding arms with `OcxJsonContext.Default` "for AOT safety" | strict/test option copies never reach arms | rule 2 grep; S4 case |
| `catch (JsonException) { return Unknown }` around arm binding | turns a bad payload into a silently skipped variant (anthropic style) | rule 7; case C3e |
| `tag.GetString()` without a `ValueKind` check, or `GetProperty("type").GetString()` | `null` tag becomes `Unknown(null)`; `GetProperty` throws `KeyNotFoundException` | rule 6 grep; cases C3c-C3d3 |
| `if (exit != 0) Deserialize<ErrorDocument>(stdout)` | leaks `JsonException` on a real `report_then_fail` document, loses code and report | rule 15 grep and test R1 |
| Try error document, `catch`, try report | exception as control flow; two binds | rule 15; `BindCount == 1` |
| Taking the exit code from the document (`doc.ExitCode`) | process is authoritative; documents can be absent or skewed | rule 13 grep; E5 |
| Throwing `OcxDecodeException` when stdout of a failing command does not parse | masks the exit code the retry logic needs | tests R5, R6b, R7 |
| `required string Detail` or `OcxErrorKind` as a closed enum | throws on the conformance cases | rule 18; conformance replay |
| Generating 516 `ErrorDetail` constants "for IntelliSense" | 107 KB of IL, 516 API lines, RS0016 on every ocx release | rule 17 grep |
| Putting `required` members on the union base for a flattened union | CS9035 at the `Unknown` factory; the only fix an LLM finds is `[SetsRequiredMembers]` or removing `required`, both wrong | rule 5; do not accept `SetsRequiredMembers` in `src` |
| Forgetting `[JsonSerializable(typeof(Arm))]` (arms are not discovered) | `NotSupportedException`, not `JsonException`, at first use | rule 9 loop |
| `options.GetTypeInfo<T>()` on a net8 target | generic overload is net10-only in the docs | rule 3 grep |
| Using `JsonSerializerOptions.Strict` / `JsonSerializerDefaults.Strict + TypeInfoResolver` to test strictness | drops the naming policy ([CJ] S1) | [CJ] CS-JSON-13 grep |
| Assuming "17 report_then_fail commands" | it is 14 commands, 17 modes | `cli.json` walk in the diff test (`rtf-*`) |
| `Dispose`d `JsonDocument` then reading `Raw` | `ObjectDisposedException` | rule 8 grep; case C3 |

## Contested / evolving

- **Generated per-union code versus one table-driven converter.** Both big SDK exemplars emit code per union because a generator writes it. For hand-maintained models the table wins here (measurements above). Trend: if ocx ships an `ocx_sdkgen` C# backend, it should emit tables (data) and arm classes, not converters. As of 2026-10-11 no C# backend exists.
- **`object? PartialReport` versus a shared marker base.** A tiny `abstract class OcxReport` for the 56 root classes would let `PartialReport` be typed `OcxReport?` and give `schema_version` one home. It is a public-API decision (CS-API surface) deferred to the api owner; `object?` plus pattern matching is binary-compatible with adding the base later only if no member is added to existing sealed report classes, so decide before 1.0. Not measured.
- **Exceptions that expose report data.** Serilog-style destructuring and any logger that walks public exception properties will print `PartialReport` the way it would have printed `PartialReportJson`. The typed object does not make it better or worse; the Python SDK made the same warning about `stdout`. Mitigation, if wanted, is a policy for the logging doc, not a type change.
- **How much of `ErrorDetail` to name.** The contract promises "A `detail` slug is stable once a release emits it" and "A command's reference entry lists the slugs that command produces" ([machine interface](https://ocx.sh/docs/reference/machine-interface)). If ocx stabilises slugs per command, a per-command typed accessor (not a global 516-constant struct) may become reasonable. Today the list changes every few days.
- **Contract still unreleased.** The goldens at `774a1ce760d0` are `main`; the installed 0.6.5 prints no `contract` and no error document for some usage errors ([CJ] CS-JSON-10). Exit code 82 changed meaning between 0.6.5 and main. Numbers here (516, 13, 11, 17) will move; the diff test is the mechanism, not the numbers.
- **`JsonDocument` versus skim versus `JsonElement` re-read.** Measured within noise on a shared machine; the preference for the skim is allocation and byte-input fit, not speed. A BenchmarkDotNet run on a quiet machine could reorder them.
- **.NET 11 / C# 15.** `closed` hierarchies, `union` types and `InferClosedTypePolymorphism` go GA in November 2026; the Unknown-arm requirement of the ocx contract is what keeps them out of wire unions. Revisit if STJ adds a documented "unrecognised discriminator keeps the raw object" mode. The open-generic `[JsonConverter]` form (net11) does not change this design.
- **Not verified.** Windows exit-status behaviour of the real engine (negative `Process.ExitCode` is shown only through the decode seam), osx/arm64 AOT, and a BenchmarkDotNet-grade comparison.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/converters-how-to | Custom converters, factory pattern, polymorphic deserialization, open generic converters | updated 2026-09-29, .NET 10/11 | `[JsonConverter]` on types, the clone-the-reader alternative, .NET 11 open-generic attribute arity rule |
| https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/source-generation | Source generation: contexts, options attribute, disabling reflection | updated 2026-03-30 | `JsonSerializerIsReflectionEnabledByDefault`, `TypeInfoResolver`, enum converters under AOT |
| https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/polymorphism | `[JsonPolymorphic]`, unknown derived types, closed hierarchies | updated 2026-09-29, .NET 7 to 11 | "only supported ... default converters"; `UnknownDerivedTypeHandling`; net11 `InferClosedTypePolymorphism` |
| https://learn.microsoft.com/en-us/dotnet/api/system.text.json.serialization.jsonconverterattribute | API: JsonConverterAttribute | net-11.0 moniker | Targets, remarks on type-level precedence |
| https://learn.microsoft.com/en-us/dotnet/api/system.text.json.jsonserializeroptions.gettypeinfo | API: `GetTypeInfo(Type)` and `GetTypeInfo<T>()` | net-7 to net-11 monikers | Which overload exists on which TFM; downcast to `JsonTypeInfo<T>` |
| https://learn.microsoft.com/en-us/dotnet/api/system.text.json.jsonserializer.deserialize | API: `JsonSerializer.Deserialize` overloads incl. `Deserialize(JsonElement, JsonTypeInfo)` | net-11.0 moniker | The non-generic `JsonElement` + `JsonTypeInfo` overload the converter relies on |
| https://github.com/dotnet/runtime/blob/v10.0.0/src/libraries/System.Text.Json/src/System/Text/Json/Serialization/Metadata/DefaultJsonTypeInfoResolver.Converters.cs | Runtime source: converter-attribute lookup | v10.0.0 | Lines 138 and 152: `GetUniqueCustomAttribute<JsonConverterAttribute>(inherit: false)`, why arms do not inherit the union converter |
| https://learn.microsoft.com/en-us/dotnet/csharp/advanced-topics/interface-implementation/static-virtual-interface-members | Static abstract/virtual interface members tutorial | updated 2026-07-14, C# 11+ | Constraint form `where T : I<T>`, calling `T.Member`, compile-time resolution |
| https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process.exitcode | API: `Process.ExitCode` | current | "reflects the specific convention implemented by the application developer"; `int` |
| https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-getexitcodeprocess | Win32 `GetExitCodeProcess` | current | Exit status is a `DWORD`; why negative `int` values occur |
| https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/enum | Framework Design Guidelines: enums | current | "DO NOT use an enum for open sets" |
| https://azure.github.io/azure-sdk/dotnet_introduction.html | Azure SDK .NET design guidelines | current | `readonly struct` in place of an enum for service-returned unknown values; exception-type minimalism |
| https://protobuf.dev/programming-guides/enum/ | Protocol Buffers enum guide | current | Open vs closed enums; why proto3/editions chose open |
| https://martinfowler.com/bliki/TolerantReader.html | Tolerant Reader pattern | 2011 (still cited) | "take only the elements you need, ignore anything you don't" |
| https://ocx.sh/docs/reference/machine-interface | ocx machine interface: outcomes, error document, exit codes, open values | main (2026-10) | Primary contract: report-then-fail, `error.detail` omission, `exit_code` repeats the process code |
| https://github.com/ocx-sh/ocx/tree/774a1ce760d0/crates/ocx_schema/tests/golden | ocx goldens `errors.json`, `reports.json`, `cli.json` (copied to `F/schema/`) | 2026-10-10 | Required/optional sets, 13 exit codes, 11 kinds, 516 details, 13 unions, 17 report_then_fail modes |
| https://github.com/ocx-sh/ocx/tree/774a1ce760d0/crates/ocx_schema/contract/conformance | ocx language-neutral conformance corpus + README | 2026-10-10 | 35 cases incl. `synthetic_error_without_detail`, `synthetic_unknown_error_detail`, `synthetic_report_then_fail` |
| file:///home/mherwig/dev/ocx-sdk-python/src/ocx_sdk/_errors.py (@80136dde4162, lines 116-133) and `_results.py` 417-455 | Python SDK: `OcxProcessError.stdout`, `partial_report` | 2026-10 | Prior art for partial reports (raw stdout, caller re-decodes) |
| https://github.com/anthropics/anthropic-sdk-csharp (ae16e5933f39) `src/Anthropic/Models/Messages/ToolChoice.cs:331-365`, `src/Anthropic/Models/ErrorType.cs:41` | Real union converter and closed-enum fallback | 2026 | Swallowed `JsonException`, options-overload Deserialize, `(ErrorType)(-1)` |
| https://github.com/openai/openai-dotnet (1f0e8829acac) `OpenAI.Responses/src/Generated/Models/ResponseItem.Serialization.cs:111-166` | Generated discriminator switch | 2026 | `GetString()` switch, Unknown resource fallback |
| https://github.com/PowerShell/PowerShell (5d871eb5e02c) `src/System.Management.Automation/engine/NativeCommandProcessor.cs:184` | `NativeCommandExitException.ExitCode` | 2026 | Production exit-status type is a plain `int` |
| https://github.com/dotnet/aspire (af646baee1e8) `src/Aspire.Hosting/Dcp/Model/ModelCommon.cs:19-22` | `static abstract` internal interface as a table hook | 2026 | Production use of the same pattern |
| https://github.com/npgsql/npgsql (9c47244547c2) `src/Npgsql/Internal/Converters/Primitive/TextConverters.cs:59-63` | `static abstract` conversion hooks behind a generic converter | 2026 | Same pattern in a hot-path converter |
| https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/source-generation-modes | Source-generation modes | current | Metadata vs fast-path; polymorphism needs metadata mode |
| https://learn.microsoft.com/en-us/dotnet/core/deploying/trimming/fixing-warnings | Fixing trim warnings | current | IL2026 and `RequiresUnreferencedCode` semantics behind the AOT gate |
| ../csharp-json.md (consolidated, 2026-10-11) | Prior verdicts CS-JSON-01..17 | 2026-10-11 | Rules 05/07/11/13 revised here |
| ../csharp-api.md (consolidated, 2026-10-11) | Prior verdicts CS-API-01..16, CS-ERR-01..11 | 2026-10-11 | Property list and leaf set this revision refines |
| /home/mherwig/.cache/research-lang/dotnet-tools/fixtures/consolidate-csharp-json/ | Prior fixture (cases C1-C9, S1-S5, V1-V5) | 2026-10-11 | Base of the hand-written strategy and the strict-copy instrument |
