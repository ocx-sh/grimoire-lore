---
# Read on demand through the index. This glob matches no file, so a client never auto-loads the file.
paths:
  - "**/.csharp-quality-depth-on-demand"
title: JSON Contract Binding
summary: The CS-JSON family, owning how a .NET library binds a versioned external JSON contract with System.Text.Json, which is source generation and trim safety, open enums and tagged unions, required keys, the one decode seam, the failure path, and the contract tests
---

# JSON Contract Binding

Binds to System.Text.Json 10.0.12 (the net8.0 package asset; inbox on net10.0), SDK 10.0.401 on Linux x64, runtimes
8.0.31 and 10.0.12 and Meziantou.Analyzer 3.0.297 (measured 2026-10-11). Windows, macOS, arm64 and Native AOT on any
RID but linux-x64 are `unverified: read only`.

Owns binding the stdout of a wrapped tool whose JSON is versioned and additive: the serializer setup, open value
sets, union decoding, required keys, the decode seam, the failure path and the tests that pin the contract. Not
owned here: the exception leaves are `CS-ERR-01` and `CS-ERR-04`, the exit table and its drift test are `CS-ERR-02`,
the accepted-code set is `CS-ERR-09`, the open-enum and internal-constructor shapes are `CS-API-07` and `CS-API-08`,
the packed-dependency budget is `CS-SEC-09`, and the process engine and its output cap are `CS-PROC`. The analyzer
severity lines (IL2026, IL3050, MA0222, MA0223) live in `analyzers.globalconfig` and the `JsonStringEnumConverter`
bans in `BannedSymbols.txt`; a row below names the ID and the file and does not restate the line.

Contents: [Dates and Defaults](#dates-and-defaults) · [Canonical Setup](#canonical-setup) ·
[Source Generation and Trim](#source-generation-and-trim) · [Open Sets and Models](#open-sets-and-models) ·
[The Decode Seam and the Failure Path](#the-decode-seam-and-the-failure-path) · [Contract Tests](#contract-tests) ·
[Forward-Compatibility Policy](#forward-compatibility-policy) · [What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Defaults

- **Example names from the reference consumer; rename once:** `OcxJsonContext`, `OcxExitCode`, `OcxErrorKind`,
  `OcxCommandException`, `OcxDecodeException`, `OcxContractException`, `PartialReport`, the wire marker `x-ocx-enum`
  and the directories `src/Models` and `src/Handshake`. The gates keep these names; an adopter renames them in one
  edit. The example exit values are 65, 83 and 143 (65 and 83 are arbitrary examples; 143 is 128 plus SIGTERM).
- Every gate runs from the repo root and assumes `SRC` is the production code of a shipped library that binds with
  System.Text.Json (a repo that serializes with another library has nothing for G1 to read), `TESTS` its tests, `PRJ` the
  library project, `SRC/Models` the wire models and `SRC/Handshake` the handshake directory. `SRC` and `TESTS` are
  space-separated lists of repo-relative directories, used unquoted (an absolute path under a `tests/` ancestor matches the
  test exclusion and counts zero files); `Models` and `Handshake` sit under the first `SRC` directory. A serializer library (an
  adapter such as Refit's) is out of scope for the `[cli-wrapper]` rows below and keeps the sanctioned forms they name.
  A bare `! rg ...` exits 0 on empty output, and it also exits 0 when an operand is missing (rg exits 2).
  Run block G0 first, in the same shell: it fails on an unset operand and prints `MISSING` for an absolute operand, a path that
  does not exist or a scope with no `.cs` file. It prints `N/A: <reason>` where a tag does not apply (no file uses System.Text.Json;
  `TOOL`, the wrapped tool's file name, is unset for the `[cli-wrapper]` rows). Any other output from it is a failed check.
  It defines `none` (exit 0 only when rg found nothing), `empty` (exit 0 only when a command printed nothing) and the test
  exclusion `cs`, keyed on test-project path segments so a shipped `Foo.Testing` package stays in scope. Every cell and
  gate below cites G0.
- **Defaults, the adopter may override each:** the floor is `net8.0;net10.0` until .NET 8 end of support
  (2026-11-10), then `net10.0` only, which deletes the package line of `CS-JSON-14`. LangVersion 14 on both TFMs.
- Every row of the policy table was run green on net8.0 and net10.0 (measured 2026-10-11). Each rule's gate was
  watched green on a clean tree and red on at least one planted defect (measured 2026-10-11, `CS-CORE-02`). A term that
  names a heuristic is a reading aid: read each hit.
- The .NET 11 RC1 SDK (11.0.100-rc.1.26425.128) builds the shared union converter with 0 warnings and passes 198 of
  198 cases (measured 2026-10-11). It is a probe; no `net11.0` leg exists.

## Canonical Setup

This block is the only serializer configuration in the library. Its values are baked into attributes and no
`JsonSerializerOptions` is built at run time. The union converter of `CS-JSON-07` is attached by attribute and adds
nothing here.

```csharp
[JsonSourceGenerationOptions(
    PropertyNamingPolicy = JsonKnownNamingPolicy.SnakeCaseLower,   // dotted keys (os.features) need [JsonPropertyName]
    UnmappedMemberHandling = JsonUnmappedMemberHandling.Skip,      // the default, stated: additions never bump versions
    RespectNullableAnnotations = true,                             // net9; package on net8: explicit null in a required slot is refused
    RespectRequiredConstructorParameters = true,                   // net9; package on net8: satisfies MA0223
    AllowDuplicateProperties = false)]                             // net10; package on net8: a duplicate key is refused
[JsonSerializable(typeof(AboutRoot))]                              // one line per root, per union base and per known arm
[JsonSerializable(typeof(SkippedReason))]
[JsonSerializable(typeof(SkippedReasonOffline))]                   // arms are not discovered; an unlisted arm fails at its first use
internal sealed partial class OcxJsonContext : JsonSerializerContext;
```

```csharp
[JsonConverter(typeof(TaggedUnionConverter<SkippedReason>))]       // attached per base; no Converters entry
public abstract class SkippedReason : ITaggedUnion<SkippedReason>  // ITaggedUnion<>, UnionArm<> and the converter are internal
{
    internal SkippedReason() { }                                   // CS-API-08
    [JsonPropertyName("type")] public required string Type { get; init; }    // the only base member (CS-JSON-18)
    private static readonly UnionArm<SkippedReason>[] s_arms = [UnionArm<SkippedReason>.Of<SkippedReasonOffline>("offline")];
    static IReadOnlyList<UnionArm<SkippedReason>> ITaggedUnion<SkippedReason>.Arms => s_arms;
    static SkippedReason ITaggedUnion<SkippedReason>.Unknown(string tag, JsonElement raw) => new UnknownSkippedReason { Type = tag, Raw = raw };
}
```

```xml
<!-- Directory.Build.props (root; CS-BUILD-01) -->
<TargetFrameworks>net8.0;net10.0</TargetFrameworks>
<IsAotCompatible Condition="$([MSBuild]::IsTargetFrameworkCompatible('$(TargetFramework)', 'net8.0'))">true</IsAotCompatible>
<!-- Directory.Packages.props (root; CS-BUILD-23) -->
<PackageVersion Include="System.Text.Json" Version="10.0.12" />
<!-- the library .csproj: no Version= here -->
<ItemGroup Condition="'$(TargetFramework)' == 'net8.0'"><PackageReference Include="System.Text.Json" /></ItemGroup>
```

| Option or API | net8.0 inbox | net9.0 | net10.0 |
|---|---|---|---|
| `UnmappedMemberHandling`, `SnakeCaseLower`, `required`, `GetTypeInfo(Type)`, `static abstract` interface members | yes | yes | yes |
| `RespectNullableAnnotations`, `RespectRequiredConstructorParameters` | no | yes | yes |
| `AllowDuplicateProperties`, `JsonSerializerOptions.Strict`, `GetTypeInfo<T>()` (banned by `CS-JSON-07`) | no | no | yes |
| C# 15 `closed`, `InferClosedTypePolymorphism` | no | no | no (`closed` is CS8652 on SDK 10.0.401) |

Every no on net8.0 in the first three rows is closed by the package line of `CS-JSON-14` (measured 2026-10-11). The
last row is unavailable until .NET 11 GA (November 2026).

## Source Generation and Trim

Reflection-based serialization compiles, publishes with exit 0 and throws at run time. Analyzers at
error plus a reflection-disabled test run turn that into a build failure.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CS-JSON-01 | Bind only through a source-generated `JsonTypeInfo`. Use no reflection overload, no `options` overload and no explicit-generic `Deserialize<T>()`, `ReadFromJsonAsync<T>()` or sibling extension form. A public API that is generic over the caller's own type may take the caller's `JsonSerializerOptions` and a runtime `Type` and forward them to a reflection overload, when its XML doc names the resolver route for AOT callers (`TypeInfoResolver = <their context>`): the library cannot know the type. | A reflection call publishes with exit 0 and the binary throws `Reflection-based serialization has been disabled`. | `dotnet build -c Release` exits 0 with IL2026 and IL3050 at `error` in `analyzers.globalconfig` and `IsAotCompatible` set: a reflection call turns it red on net8.0 and net10.0. Block G1 under this table is the backstop and prints nothing on a clean tree: the two severity lines, then, in the files that use `System.Text.Json` only (a `YamlDotNet` or Newtonsoft `JsonSerializer` call is silent), any generic `JsonSerializer` call, any `*AsJsonAsync<T>` or `ReadFromJsonAs*<T>` extension and any `.Deserialize<T>(` on a `JsonElement` or `JsonNode`. The inferred-generic form (`Serialize(value, options)`) passes the explicit-generic lines; the last G1 line is a reading heuristic that lists every such call whose arguments name no `TypeInfo`, `Context`, `info` or `.Default` (read each hit; it skips a file whose `///` comment names `TypeInfoResolver`, the sanction above). The non-generic `typeof` overloads are visible only to the build, so IL2026 and IL3050 at `error` are the primary gate. Watched on net8.0 and net10.0: IL2026 and IL3050 turn the build red (exit 1) with the lines; without them the build exits 0 and the reflection-disabled run throws `InvalidOperationException` (measured 2026-10-11). | MUST |
| CS-JSON-02 | [cli-wrapper] [stj] For the wrapped tool's contract, own exactly one `internal sealed partial class OcxJsonContext` per assembly, configured only by the canonical block. A library that reads several formats owns one context per format, each configured by its own block (the `[stj]` serializer-adapter sanction of the index covers a library whose product is a serializer). Write no `new JsonSerializerOptions`, `TypeInfoResolver =`, `JsonTypeInfoResolver.Combine`, `.Web`, `.Strict` or `.Default` options, `JsonSerializerDefaults`, `PropertyNameCaseInsensitive`, `AllowReadingFromString`, `Disallow` or `Converters.Add(` in `src`. Attach union converters by `[JsonConverter]` on the base. | Foreign options silently drop the naming policy and return empty fields. Web and case-insensitive settings accept more than the contract allows, so skew goes unnoticed. | Block G2: the severity lines, the option gate (target-typed `new()` included), the public-context gate and the one-context line count (with several contexts the count equals the number of formats you list). Plus MA0222 and MA0223 at `error` in `analyzers.globalconfig` (Meziantou, off by default; the file owns the lines). Watched: omitting `RespectNullableAnnotations` and `RespectRequiredConstructorParameters` makes the build exit 1 with MA0222 and MA0223 on both TFMs (measured 2026-10-11). | MUST |
| CS-JSON-14 | [cli-wrapper] [stj] [greenfield] Multi-target `net8.0;net10.0` and add `System.Text.Json` as a `PackageVersion` 10.0.x, referenced on the net8.0 asset only (`CS-BUILD-23` owns the central file). Write no `#if NET9_0_OR_GREATER` around serializer options. A library that keeps a TFM below net8.0 may wrap an option that TFM lacks in `#if`, with the fallback written beside it. | The policy options do not exist on the net8.0 inbox STJ and fail the build. STJ below 8.0.5 carries CVE-2024-43485. The nuspec holds this one dependency on net8.0 and none on net10.0 (`CS-SEC-09` owns the budget). | `dotnet build -c Release` builds both TFMs (exit 0). Block G14: no `#if` in the context file, and a listing of each `#if NET9_0_OR_GREATER` or `NET10_0_OR_GREATER` block that names `JsonSerializerOptions` or `JsonSourceGeneration*` (a hit fails; an `#if` around other code is silent; empty output is the pass). `dotnet list package --vulnerable --include-transitive` needs nuget.org and is `unverified: read only`. Watched: net8.0 without the package fails the build with CS0246, with it exit 0 and the cases pass on 8.0.31 and 10.0.12 (measured 2026-10-11). | MUST |
| CS-JSON-16 | [cli-wrapper] [stj] Depend on no Newtonsoft.Json, `DataContractJsonSerializer` or `JavaScriptSerializer`, directly or transitively. A dependency the library already ships, or an adapter package whose product is Newtonsoft support, stays and is named in the dependency decision (`CS-SEC-09`). | Newtonsoft semantics (case-insensitive, lenient nulls) differ from the policy, and its reflection raises IL2104 and IL3053 under AOT. | After G0, `none -n -g '*.cs' -e 'Newtonsoft' -e 'JsonConvert\.' -e '\bJObject\b' -e '\bJToken\b' -e 'DataContractJsonSerializer' -e 'JavaScriptSerializer' $SRC $TESTS`, plus block G16 over the package graph: it prints each Newtonsoft package that the dependency decision file `DEC` (`CS-SEC-09`) does not name, and a `dotnet list` failure. Watched: a `PackageReference` to Newtonsoft.Json makes the pipeline exit 1, a clean graph exits 0 (measured 2026-10-11). | MUST |
| CS-JSON-17 | Suppress IL2026, IL3050, other IL2xxx and SYSLIB1034 only at the site, with the reason in the same attribute (a `Justification` on a wrapped line, or a named `const` string, counts) or on the same line of a `#pragma` (`CS-BUILD-12`). Never in `NoWarn`, except the IL and trim IDs of a test project (`CS-TEST-12`). | A suppressed trim warning moves the crash into the consumer's binary. | Block G17 reads `SRC` and `TESTS` only (docs and samples are out of scope) and prints each suppression of these IDs that lacks a reason (an attribute is read whole with `-U`, so a wrapped `Justification` counts; a `#pragma` needs a same-line `//` reason), and each `NoWarn` entry outside test projects; empty output is the pass. A justified suppression is allowed, so only a bare one is red. Watched red and green (measured 2026-10-11). | SHOULD |

```sh
# G0  (every gate): run first, in the same shell; any output is a failed check, except an `N/A:` line (the tag does not apply here)
: "${SRC:?MISSING SRC}" "${TESTS:?MISSING TESTS}" "${PRJ:?MISSING PRJ}"   # index Conventions: SRC and TESTS are space-separated repo-relative directory lists (used unquoted), PRJ the shipped library's project directory or file
for v in SRC TESTS; do for p in ${!v}; do case $p in /*) echo "MISSING repo-relative $v";; esac; done; done   # an absolute path under a tests/ ancestor matches the exclusion below and counts zero files
M=${SRC%% *}/Models H=${SRC%% *}/Handshake       # wire models and handshake directory under the first SRC directory (example names: rename them)
cs=(-g '*.cs' -g '!**/{test,Test,tests,Tests,*.Test,*Tests,*TestFixtures,*TestServices}/**' -g '!**/obj/**' -g '!**/bin/**')   # library code only, by test-project path segments (a shipped Foo.Testing stays in scope); a scan of "$TESTS" takes -g '*.cs' alone
for p in $SRC $TESTS "$PRJ"; do test -e "$p" || echo "MISSING $p"; done
rg --files "${cs[@]}" $SRC | head -1 | grep -q . || echo "MISSING scanned zero files"
rg -l "${cs[@]}" 'System\.Text\.Json' $SRC | head -1 | grep -q . || echo "N/A: no file under SRC uses System.Text.Json, so no CS-JSON row has a scope"
[ -n "${TOOL:-}" ] || echo "N/A: TOOL unset, so the [cli-wrapper] rows (CS-JSON-02, 05, 14, 16: G2, G5, G14, G16) read nothing"
test -d "$M" || echo "N/A: no $M, so G5 to G8, G15 and G18 read no wire model (rename M)"
test -d "$H" || echo "N/A: no $H, so G10 reads no handshake directory (rename H)"
none() { rg "$@"; test $? -eq 1; }                # exit 0 only when rg found nothing: rg exits 2 on a missing operand, which a bare "! rg" reads as a pass
empty() { local o; o=$("$@"); test -z "$o" || { printf '%s\n' "$o"; return 1; }; }   # exit 0 only when the command printed nothing, and it prints what it found
stj() { rg -l0 "${cs[@]}" 'System\.Text\.Json' $SRC | xargs -0 -r rg -H "$@"; }   # rg over the files that use System.Text.Json (YamlDotNet and Newtonsoft's own JsonSerializer are not those)
nodoc() { rg -l0 "${cs[@]}" 'System\.Text\.Json' $SRC | xargs -0 -r rg --files-without-match -0 '^\s*///.*TypeInfoResolver' | xargs -0 -r rg -H "$@"; }   # stj minus the files whose XML doc names the resolver route (the CS-JSON-01 sanction)
conv() { rg -l0 "${cs[@]}" -e ':\s*JsonConverter(Factory)?\b' $SRC | xargs -0 -r rg -H "$@"; }   # rg over the converter files
# G1  (CS-JSON-01): no output on a clean tree; the build is the primary gate
for id in IL2026 IL3050; do rg -q -e "^dotnet_diagnostic\.$id\.severity *= *error" .globalconfig || echo "MISSING $id"; done
empty stj -n -e 'JsonSerializer\s*\.\s*\w+\s*<' -e '\.(ReadFromJsonAsync|GetFromJsonAsync|PostAsJsonAsync|PutAsJsonAsync|PatchAsJsonAsync|ReadFromJsonAsAsyncEnumerable|GetFromJsonAsAsyncEnumerable)\s*<' -e '\.Deserialize\s*<[^(]*>\s*\('
empty nodoc -U -n -P -e 'JsonSerializer\s*\.\s*(?:Serialize|Deserialize)\w*\s*(?:<[^()]*>)?\s*(?<p>\((?:(?!(?i:typeinfo|context)|\binfo\b|\.Default\b)(?:[^()]|(?&p)))*\))'   # reading heuristic: an inferred-generic call whose arguments name no TypeInfo, Context, info or .Default
# G2  (CS-JSON-02)
if [ -n "${TOOL:-}" ]; then
for id in MA0222 MA0223; do rg -q -e "^dotnet_diagnostic\.$id\.severity *= *error" .globalconfig || echo "MISSING $id"; done
none -n "${cs[@]}" -e 'new JsonSerializerOptions' -e 'JsonSerializerOptions\??\s+\w+\s*=\s*new\s*\(' -e 'TypeInfoResolver\s*=' -e 'JsonTypeInfoResolver\.Combine' -e 'JsonSerializerOptions\.(Web|Strict|Default)\b' -e 'JsonSerializerDefaults\.' -e 'PropertyNameCaseInsensitive' -e 'AllowReadingFromString' -e 'JsonUnmappedMemberHandling\.Disallow' -e 'Converters\.(Add|Insert)\s*\(' $SRC
none -n "${cs[@]}" '\bpublic\b.*\bclass\s+\w+\s*:\s*JsonSerializerContext\b' $SRC
test "$(rg -o "${cs[@]}" 'class\s+\w+\s*:\s*JsonSerializerContext\b' $SRC | wc -l)" -eq 1
fi
# G14 (CS-JSON-14): the first line is the context file; the second lists each #if block that names serializer options or the generator (empty output is the pass)
if [ -n "${TOOL:-}" ]; then
ctxfile() { rg -l0 "${cs[@]}" '^[^/]*\[JsonSourceGenerationOptions' $SRC | xargs -0 -r rg -H -n '^\s*#if'; }
empty ctxfile
rg -U -n -o -P "${cs[@]}" '(?m)^[ \t]*#if\s[^\n]*NET(?:9|10)_0_OR_GREATER[^\n]*(?=\n(?:(?!^[ \t]*#endif\b)[\s\S])*?(?:JsonSerializerOptions|JsonSourceGeneration))' $SRC
fi
# G16 (CS-JSON-16): DEC is the file that records the dependency decision (CS-SEC-09), read only when Newtonsoft is in the graph
if [ -n "${TOOL:-}" ]; then
out=$(dotnet list "$PRJ" package --include-transitive) || echo "G16 dotnet list failed"
printf '%s\n' "$out" | rg -io 'newtonsoft(\.\w+)+' | sort -u | while read -r d; do rg -qiF "$d" "${DEC:?MISSING DEC}" || echo "$d: not named in $DEC"; done
fi
# G17 (CS-JSON-17): empty output is the pass; SRC and TESTS only (docs and samples are out of scope); an attribute is read whole (-U), so a Justification on a wrapped line counts
rg -U -n -P -g '*.cs' -g '!**/obj/**' -g '!**/bin/**' '\[\s*(?:\w+\s*:\s*)?(?:Unconditional)?SuppressMessage\s*\((?![^\]]*Justification\s*=\s*(?:"[^"]+"|[A-Za-z_][\w.]*))[^\]]*\b(?:IL[23][0-9]{3}|SYSLIB1034)\b[^\]]*\]' $SRC $TESTS
rg -n -g '*.cs' -g '!**/obj/**' -g '!**/bin/**' -e 'disable[^/]*\b(IL[23][0-9]{3}|SYSLIB1034)\b' $SRC $TESTS | rg -v '//\s*\S'
rg -U -n -g '*.csproj' -g '*.props' -g '*.targets' -g '!**/{test,Test,tests,Tests,*.Test,*Tests,*TestFixtures,*TestServices}/**' -g '!**/obj/**' -e '<NoWarn[^>]*>[^<]*\b(IL[23][0-9]{3}|SYSLIB1034)\b' $SRC $(ls Directory.*.props Directory.*.targets 2>/dev/null)
```

## Open Sets and Models

An open set (a value list, a tag list, an exit-code list, a key list) grows without a version bump. Code written
as if the set were closed passes the happy path and fails on the next release of the tool.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CS-JSON-05 | [cli-wrapper] [stj] Make every open enum in the contract (a schema list marked as extensible, example marker `x-ocx-enum`) an open `readonly record struct`, never a CLR `enum`. String sets are `readonly record struct X(string Value) : IOpenEnum<X>` (`CS-API-07`) with a static abstract `From(string)`, well-known static instances, `Known`, `IsKnown`, `ToString() => Value ?? ""` and `[JsonConverter(typeof(OpenEnumConverter<X>))]`; the converter accepts `JsonTokenType.String` only. Integer sets (the exit status, `error.exit_code`) are `readonly record struct OcxExitCode(int Value)` with `OpenIntEnumConverter<T>`, which accepts `JsonTokenType.Number` and `TryGetInt32` only and writes with `WriteNumberValue`. `new OcxExitCode(process.ExitCode)` is total over int32; never cast to an enum or `byte`. Never use `JsonStringEnumConverter`, in either form, for a wire value. A closed enum of the library's own configuration file or format (not the wrapped tool's contract) may use `JsonStringEnumConverter<T>`, the AOT-safe generic form, with an unknown value refused. | `JsonStringEnumConverter` throws on an unseen value, accepts any case and accepts undefined integers. A naive integer model accepts 83 as an undefined enum value and binds the string `"65"`. A `byte` or closed enum loses a Windows NTSTATUS such as `-1073741819`. | `CS-API-07` owns the `JsonStringEnumConverter`, `Enum.Parse` and `Enum.TryParse` scan, and `BannedSymbols.txt` makes RS0030 fail the build on the converter. Block G5 adds the `Exit` enum gate and a closed-wire-enum probe (a reading heuristic: an enum on a wire model fails; empty output is the pass). The cast ban is the `CS-ERR-02` gate. Watched: RS0030 turns `new JsonStringEnumConverter()` red (build exit 1) on net8.0 and net10.0, the gates are red on planted files and green on a clean tree, and the string and integer converters refuse the shapes above (measured 2026-10-11). | MUST |
| CS-JSON-06 | Write every success predicate as an allow-list that names each success value (`IsOk` is `this == A` or `this == B`). Never `!= Failed`, and an unknown value is never success. | The tool's own machine-interface contract forbids "not failed". An open enum makes the unseen value reach the predicate. | The test is the real gate: bind a document whose status is a value no code knows (a corpus case `synthetic_unknown_enum_value`) and assert `IsOk == false`. Block G6 catches the qualified and bare `!= Failed`, the negated equality and `_ => true` arms in the models (where `IsOk` is declared); string compares are left to the test. Watched: the allow-list prints `ok=False`, the `!= Failed` twin prints `ok=True` and exits 1 (measured 2026-10-11). | MUST |
| CS-JSON-07 | Decode every wire union with the one shared, internal `TaggedUnionConverter<TBase>` and a per-union arm table; write no per-union `JsonConverter<>`. The base is a `public abstract class` with an `internal` constructor (`CS-API-08`) and `public required string Type`, implements `ITaggedUnion<TBase>` explicitly (`static abstract Arms` and `static abstract Unknown(string tag, JsonElement raw)`) and carries `[JsonConverter(typeof(TaggedUnionConverter<TBase>))]`. Arm rows are `UnionArm<TBase>.Of<TArm>("tag")`, where `TArm : class, TBase` is the compile-time proof. The converter does `JsonDocument.ParseValue`, requires an object whose `type` has `ValueKind == String` (else `JsonException`), matches with `tag.ValueEquals(arm.Tag)`, binds the arm with `root.Deserialize(options.GetTypeInfo(arm.ArmType))` (the caller's options, the non-generic overload), has no `catch` around arm binding and returns `TBase.Unknown(tag.GetString()!, root.Clone())` for an unseen tag, the `!` carrying the `CS-LANG-03` same-line comment `// null-forgiving: ValueKind is String`. `ITaggedUnion<>`, `UnionArm<>` and the converter are `internal` and absent from `PublicAPI.*.txt`. Never `[JsonPolymorphic]`, `[JsonDerivedType]`, `UnknownDerivedTypeHandling`, `InferClosedTypePolymorphism`, `MakeGenericType` or `Activator` for a wire union. | One reviewed definition of the tag rules replaces N drifting copies at +1 KB and no measurable cost. The attribute route makes "unseen" and "malformed" the same thing, `UnknownDerivedTypeHandling` affects writing only, and .NET 11 closed inference throws on an unseen tag. Binding arms through `Default` bypasses the strict instrument. Swallowing a bad payload into `Unknown` is the defect in a published SDK. | Block G7: its lines print nothing on a clean tree; the wrapped base list is read by multi-line matching, the reflection, `GetTypeInfo<` and catch lines read converter files only (a `MakeGenericType` in a serializer's own code is another subject), and the `TryGetProperty("type"` line is a reading heuristic. Plus the `CS-JSON-03` loop, whose per-union case for a known tag with a bad payload catches a swallow and whose read of `Raw` after the call catches a missing `Clone()`. Watched: planted converters failing 13, 22 and 13 cases of 198 (tag-kind, swallow, `Default`), 0 unplanted; every gate green on a clean tree and red on a planted file (measured 2026-10-11). | MUST |
| CS-JSON-08 | Mark schema-required keys `public required T X { get; init; }`. Schema-optional keys are nullable and never `required`. Keep `RespectNullableAnnotations = true`. On a consumer-constructible type, a key that becomes mandatory after the first release is an `init` property with `[JsonRequired]`. Output types with an `internal` constructor are exempt (`CS-API-10`). | STJ treats missing and null as separate questions. Without `required`, a missing key quietly gives `""` or `0`. | Block G8 (models are init-only; a multi-line accessor pair is seen), plus the schema-diff classes `unsafe`, `lossy` and `missing-required` (`CS-JSON-11`). Watched: missing key and null in a required slot refused, null in an optional slot accepted; the naive model red (measured 2026-10-11). | MUST |
| CS-JSON-15 | Keep an opaque sub-object as `JsonElement`. Keep timestamps, digests and paths as `string`. Use no `object`, `Dictionary<string, object>`, `List<object>`, `DateTimeOffset` or `Uri` on a wire model. | `JsonElement` keeps `Null` and `Undefined` distinct and needs no registration. Timestamp precision varies between roots. | Block G15 (exit 0 is the pass). It does not cover `object? PartialReport` on the exception (`CS-JSON-21`), which lives outside the models directory. | MUST |
| CS-JSON-18 | A union base declares only `Type`. In a flattened union, declare the members the arms share on each known arm. Never put `[SetsRequiredMembers]` on a wire model. | The `Unknown` arm guarantees only `type`. A `required` base member makes the `Unknown` factory fail with CS9035, and the agent's two fixes, `[SetsRequiredMembers]` or dropping `required`, silently weaken the known arms. This is stricter than `CS-API-10`. | Block G18, plus `dotnet build -c Release`: CS9035 is a compiler error. Watched: CS9035 red on a required base member, exit 0 with the members on the arms (measured 2026-10-11). | MUST |

```sh
# G5  (CS-JSON-05): the first line exits 0 on a clean tree, the second is a reading heuristic (empty output is the pass)
if [ -n "${TOOL:-}" ]; then
none -n "${cs[@]}" -e '\benum\s+\w*Exit\w*' $SRC
rg -n "${cs[@]}" -e '\benum\s+\w*(Status|Kind|State|Outcome|Reason)\b' "$M"
fi
# G6  (CS-JSON-06)
none -U -n "${cs[@]}" -e '!=\s*(\w+\.)?(Failed|Failure|Error)\b' -e '!\(\s*[\w.]+\s*==\s*(\w+\.)?(Failed|Failure|Error)\b' -e '=>\s*true\b' "$M"
# G7 (CS-JSON-07): each line exits 0 on a clean tree; the `TryGetProperty` line is a reading heuristic; the reflection lines read converter files only
none -n "${cs[@]}" -e 'JsonPolymorphic' -e 'JsonDerivedType' -e 'IgnoreUnrecognizedTypeDiscriminators' -e 'UnknownDerivedTypeHandling' -e 'InferClosedTypePolymorphism' $SRC
empty rg -U -n --pcre2 "${cs[@]}" 'class\s++(?!TaggedUnionConverter\b|OpenEnumConverter\b|OpenIntEnumConverter\b)\w+[^{;]*:[^{;]*\bJsonConverter(Factory)?\b' $SRC
empty conv -n -e 'MakeGenericType' -e 'GetTypeInfo\s*<'
empty conv -n -e 'Activator\.CreateInstance' -e 'Type\.GetType\s*\('
empty conv -n -e 'OcxJsonContext\.Default' -e 'catch\s*\(\s*(System\.Text\.Json\.)?JsonException'
none -n "${cs[@]}" -e 'GetProperty\s*\(\s*"type"\s*\)\s*\.\s*GetString\s*\(\s*\)' -e 'GetString\s*\(\s*\)!?\s*switch' $SRC
tags() { rg -n "${cs[@]}" 'TryGetProperty\s*\(\s*"type"' $SRC | rg -v -e 'ValueKind'; }
empty tags
none -n "${cs[@]}" 'public\s+(static\s+|abstract\s+|partial\s+|readonly\s+|sealed\s+|ref\s+)*(interface|class|struct|record)\s+(ITaggedUnion|UnionArm|TaggedUnionConverter)\b' $SRC
none -n -g 'PublicAPI.*.txt' -e 'TaggedUnionConverter' -e 'ITaggedUnion' -e 'UnionArm' $SRC
# G8  (CS-JSON-08)
none -U -n "${cs[@]}" -e '\{\s*get;\s*(private\s+|protected\s+|internal\s+)*set;' "$M"
# G15 (CS-JSON-15)
none -n "${cs[@]}" -e 'Dictionary<string, *object' -e '\bobject\?? +[A-Z]\w* *\{ *get' -e 'DateTime(Offset)?\?? +[A-Z]\w* *\{ *get' -e '\bUri\??\s+[A-Z]\w*\s*\{' -e 'List<object' "$M"
# G18 (CS-JSON-18)
none -n "${cs[@]}" 'SetsRequiredMembers' $SRC
```

## The Decode Seam and the Failure Path

The exit code is read first and stdout second. Every bind goes through one function, so the order, the catch list
and the exception mapping exist once.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CS-JSON-09 | Route every bind through one internal decode seam, the outcome seam of `CS-JSON-20` and `CS-JSON-21`. It first skims the top-level members of the stdout bytes with `Utf8JsonReader`, skipping values. On exit 0 or an accepted code it then compares `schema_version` with the compiled value (mismatch: `OcxContractException`, before binding) and binds with `JsonSerializer.Deserialize(bytes, info) ?? throw new JsonException(...)`. It catches `JsonException` only, which becomes `OcxDecodeException` on exit 0 or an accepted code, with the inner exception and `Path`. It never echoes stdout in a message; the bounded, redacted `Excerpt` property is the only stdout an exception carries (`CS-ERR-08`). The union converter file is the only other place a `.Deserialize(` appears. | Binding first reports a newer shape as a decode error. STJ leaves payload values out of its messages on purpose. The skim allocates nothing and fits the engine's `byte[]`; three variants measured within noise. `NotSupportedException` from the binder is a programming error (a missing registration), not a decode failure. | Block G9: at most one file that uses `System.Text.Json` besides the converter file holds a `.Deserialize*`, `JsonDocument.Parse*` (`ParseAsync` included), `JsonNode.Parse` or `new Utf8JsonReader`, there is no `catch (NotSupportedException` in that seam file (the same catch around a process kill, an encoding or a stream elsewhere is not this rule) and no `!` after `Deserialize(`. Watched: the schema-version-first order green, bind-first red; truncated, null and skewed output all raise the decode or contract leaf (measured 2026-10-11). | MUST |
| CS-JSON-10 | Handshake once per binary on the contract version integers. Query the tool's own contract document (example: `ocx --format json version`). A missing `contract` key is an `OcxContractException`, checked on the raw document before binding. Before each spawn, compare the integer for the errors table, for the command and for each output root by equality, and accept every addition. Never compare semver strings for compatibility and never hard-code a minimum tool version nobody measured. | This is the tool's own runtime protocol. A reference tool's own minimum-version constant fails that tool's own handshake. | Unit tests for the handshake rows: no `contract`; every integer equal; one command integer differs; an added command accepted; a missing root entry; a captured pre-contract document kept as a permanent `OcxContractException` case. Plus block G10: no `Version` parse or construction in the handshake directory. Watched red and green (measured 2026-10-11). | MUST |
| CS-JSON-19 | Bind the error document to `internal sealed` `ErrorDocument` and `ErrorBody` classes whose `required` set is exactly the schema's: `schema_version`, `command`, `exit_code`, `error` on the document and `kind`, `message`, `context` on the body. `detail` and the context strings are nullable and never `required`. `error.detail` surfaces as `string? Detail`; declare no type, enum or constants for detail slugs, and a slug the SDK branches on is a `private const string` at the use site. | The naive model (`required string Detail`, a closed kind enum) throws on a document without `detail` and on an unseen slug. A reference tool's slug list grew by 11 entries in three days; a constant per slug costs about 20 times the IL of a string and makes every new slug an RS0016 break. | Block G19 (a type named for the detail fails; the constants listing is a reading heuristic), plus the schema-diff classes `error-body-required` and `detail-exit-unknown` and the `CS-JSON-12` replay. Watched red and green (measured 2026-10-11). | MUST |
| CS-JSON-20 | On the failure path the process exit code is authoritative. `OcxCommandException.ExitCode` is `new OcxExitCode(process.ExitCode)`; the document's `exit_code` is read only to cross-check and never copied. With an unaccepted non-zero exit, any stdout problem (non-JSON, wrong shape, a `schema_version` mismatch, a duplicate key, a string or float `exit_code`, a missing `context`) still gives `OcxCommandException` with the real code, and a defective error document is ignored. With exit 0 or an accepted code the same problems give `OcxDecodeException` or `OcxContractException` (`CS-JSON-09`). | The retry signal is the code (`IsTransient` is `CS-ERR-10`), and a decode problem on a failing command is secondary. A wrapped child forwards its own code, so a document is not guaranteed. | Block G20 flags a copy of a document's code into the exception (reading heuristic: only the process variable names `process`, `proc`, `child` and `result` are exempt, so read other hits; the cross-check read is allowed), plus tests: process 65 with a document saying 83 gives 65, and one test per problem listed. Watched: all pass, naive classifier red with a leaked `JsonException`; block G20 red and green (measured 2026-10-11). | MUST |
| CS-JSON-21 | Classify the stdout of a non-zero exit by shape with one top-level skim, then bind exactly once. A top-level `error` object plus a numeric `exit_code` is the error document; anything else is the command's report. Attach the typed report to `OcxCommandException.PartialReport` (`object?`), or return it when the code is in the caller's accepted set (`CS-ERR-09`). Keep no raw stdout string and declare no `PartialReportJson`. Never "non-zero means error document" and never "try the error document, catch, try the report". The classifier lives in the `CS-JSON-09` seam; the table of `(command, root)` pairs whose output is report-then-fail is hand-maintained and diffed against the schema. | The naive classifier leaks `JsonException` on a real report-then-fail document and loses the code and the report. Try-catch-try binds twice. A raw string forces a second decode and keeps up to the output cap alive on an object loggers capture. The discriminator is sound only while no report root has both members. | Block G21 (exit 0 is the pass), watched red and green (measured 2026-10-11), plus tests asserting one binding pass per invocation for a report with an unaccepted code, with an accepted code and with a document. The schema-diff classes `rtf-new`, `rtf-stale` and `root-looks-like-error-document` guard the table and the discriminator. | MUST |
| CS-JSON-22 | Never use `FirstOrDefault` or `SingleOrDefault` over `OcxExitCode` or any other open record struct whose `default` is a valid row. Use `Where(...).ToArray()` and test `Length`, or compare with `==`. | `default(OcxExitCode)` is `0 Success`, so a missing code reads as success. The first draft of the schema-diff test reported a new code 83 as "renamed, table Success". | After G0, block G22: its type list is every `record struct` name under `SRC` (collected by ripgrep, not typed), not only `OcxExitCode`, and it prints a `First` or `SingleOrDefault` call on a line that names one. Watched: the `FirstOrDefault` twin prints `Success` for 83 and exits 1, the `Where` twin exits 0, on net8.0 and net10.0 (measured 2026-10-11). | SHOULD |

```sh
# G9 (CS-JSON-09): the decode files are those that use System.Text.Json and bind or parse (any Deserialize*, JsonDocument.Parse*, JsonNode.Parse or a new Utf8JsonReader) outside the converter file
seam=$(stj -l -e '\.Deserialize\w*\s*[(<]' -e 'JsonDocument\.Parse' -e 'JsonNode\.Parse' -e 'new\s+Utf8JsonReader\b' | xargs -r -d '\n' rg --files-without-match 'class TaggedUnionConverter')   # only files that use System.Text.Json: CS-ERR-04 reads this list
test "$(printf '%s\n' "$seam" | grep -c .)" -le 1
printf '%s\n' "$seam" | xargs -r rg -H -n -e 'catch\s*\(\s*(System\.)?NotSupportedException'      # prints a hit: the ban is on the seam file; a process-kill, encoding or stream catch elsewhere is not this rule
none -n "${cs[@]}" -e 'JsonSerializer\.Deserialize\s*\([^;]*\)!\s*[.;,)]' $SRC
# G10 (CS-JSON-10)
none -n "${cs[@]}" -e 'Version\s*\.\s*(Try)?Parse' -e 'new\s+Version\s*\(' -e 'SemanticVersion' -e '\bVersion\??\s+\w+\s*=\s*new\s*\(' "$H"
# G19 (CS-JSON-19): the first line exits 0 on a clean tree; the second lists slug constants to read
none -n "${cs[@]}" -e '(struct|enum|class|record|interface)\s+\w*ErrorDetail\w*' $SRC
rg -n "${cs[@]}" 'const\s+string\s+\w+\s*=\s*"[a-z]+(_[a-z]+)+"' $SRC
# G20 (CS-JSON-20): reading heuristic, the process variable names are exempt
none -n --pcre2 "${cs[@]}" -e 'new\s+OcxExitCode\s*\(\s*(?!(?i:process|proc|child|result)\b)\w+\??\.ExitCode' -e '\bExitCode\s*=\s*(?!(?i:process|proc|child|result)\b)\w+\??\.ExitCode\b' $SRC
# G21 (CS-JSON-21)
test "$(rg -U --count-matches "${cs[@]}" 'Deserialize\s*\([^;]*ErrorDocument' $SRC | awk -F: '{s+=$NF} END{print s+0}')" -eq 1
none -n "${cs[@]}" -e 'PartialReportJson' -e '(?i)\b(string|byte\[\]|ReadOnlyMemory<byte>)\??\s+_?(stdout|rawstdout|output)\s*[;{]' $SRC
none -U -n "${cs[@]}" 'catch\s*\((System\.Text\.Json\.)?JsonException[^)]*\)\s*\{[^}]*Deserialize' $SRC
# G22 (CS-JSON-22): the type list is every record struct under SRC, not one name
ts=$(rg -o -N -I -r '$1' "${cs[@]}" -e '\brecord\s+struct\s+(\w+)' $SRC | sort -u | paste -sd'|')
if [ -n "$ts" ]; then none -n -g '*.cs' -e "\b($ts)\b[^/;]*\.(First|Single)OrDefault\s*\(" $SRC $TESTS; else echo "N/A: no record struct under SRC"; fi
```

## Contract Tests

Strictness is a test instrument, never a production setting. The tests pin the models to the schema the tool
publishes, so a refresh that changes the contract fails a test instead of production.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CS-JSON-03 | Run the test project with reflection disabled. Give every registered root a wire-fixture round-trip test and add one test that loops over every union's arm table, asserting that `OcxJsonContext.Default.GetTypeInfo(arm.ArmType)` resolves and running the policy-table union cases per arm. | Arms are never discovered. A missing `[JsonSerializable]` fails only at the first use of that tag, as `NotSupportedException` and not `JsonException`, so the seam's catch never sees it. A `GenerationMode = Serialization` context cannot deserialize. | `rg -q -g '*.csproj' 'JsonSerializerIsReflectionEnabledByDefault>false' $TESTS` (the property belongs on the executable test project; a library produces no runtimeconfig), `rg -q -g '*.cs' -e '\.Arms\b' $TESTS` finds the loop, and `dotnet test --filter-namespace '*WireContract*'` exits 0 (`unverified: read only`, xUnit v3 option). Watched: the switch turns a reflection call red at run time; deleting one arm registration fails that tag's cases only (measured 2026-10-11). | MUST |
| CS-JSON-04 | Keep a `PublishAot` smoke app that references the library, publishes with `-p:TreatWarningsAsErrors=true` and runs the binary on a wire fixture in CI, on linux-x64, win-x64 and osx-arm64 at least. | Exit 0 from publish proves nothing, and AOT behaviour is per RID. | `rg -l -g '*.csproj' -g '!**/obj/**' -g '!**/bin/**' 'PublishAot>true' .` lists the smoke project, wherever it lives (empty output is the failure) and block G4 prints each RID the workflow lacks on a non-comment line (a presence heuristic; empty output is the pass). Watched red and green (measured 2026-10-11); AOT runs on linux-x64 only: 0 publish warnings and 198 of 198 cases natively; the other RIDs are `unverified: read only`. | SHOULD |
| CS-JSON-11 | Keep the schema-diff test in CI. It reads the schema documents vendored from the tool commit the library pins (pin the files, never a URL), with one planted twin per class kept under `tests/**/schema-twins/`, a file whose stem is the class name (`kind.json` for `kind`). It exits non-zero on every twin and zero on the vendored documents. A refresh updates the models, the arm, exit-code, kind and report-then-fail tables or the baselines in the same change. | Presence inversions (a required key made optional, the reverse, an optional key left unmodelled) reached the main branch of a reference SDK. A detail list grew by 11 entries in three days and an exit code changed meaning between releases. | `dotnet test --filter-namespace '*WireContract*'` exits 0 (`unverified: read only`, xUnit v3 option), and block G11 lists a class with no twin (empty output is the pass; watched red and green, measured 2026-10-11). Watched: 9, 2 and 11 planted twins red and the real documents green, in three runs (measured 2026-10-11). | MUST |
| CS-JSON-12 | Replay the tool's published conformance corpus if it has one, at the pinned commit. Enumerate the corpus directory, and fail on any case whose root has no decoder and is missing from an explicit `NotYetModelled` list. | The corpus is the language-neutral oracle the tool's authors wrote for exactly this, including the unseen-value and missing-detail synthetics. | `rg -q -g '*.cs' -e 'GetDirectories' -e 'EnumerateDirectories' -e 'GetFiles' -e 'EnumerateFiles' $TESTS` finds the enumeration (exit 0). Watched: the two error-document synthetics throw `JsonException` on the naive model and pass on the policy model (measured 2026-10-11). | SHOULD |
| CS-JSON-13 | Use strictness only as a test instrument: `new OcxJsonContext(new JsonSerializerOptions(OcxJsonContext.Default.Options) { UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow })`, replaying recorded real output on every schema refresh. Never `JsonSerializerOptions.Strict`, never `JsonSerializerDefaults.Strict` with `TypeInfoResolver = OcxJsonContext.Default`, and neither in `src`. | `Disallow` throws on every addition. The preset-plus-resolver form drops the naming policy and maps no key. `Strict` is IL2026 and IL3050 and read-only. The copy reaches union arms because `CS-JSON-07` binds through the caller's options, and an unseen tag stays `Unknown` under it. | After G0, `none -n -g '*.cs' -e 'TypeInfoResolver\s*=' -e 'JsonSerializerDefaults\.Strict' $SRC $TESTS`; `BannedSymbols.txt` owns `JsonSerializerOptions.Strict` (RS0030 turns a use red in `src` and `tests`, build exit 1, watched). Watched: the preset form red (`'schema_version' could not be mapped`), the copied-options form green and an added arm key refused on 13 of 13 unions (measured 2026-10-11). | MUST |

```sh
# G4  (CS-JSON-04): prints each RID the workflow lacks on a non-comment line
: "${CIF:?MISSING CIF}"   # index Conventions: the CI definition paths that exist
for rid in linux-x64 win-x64 osx-arm64; do rg -q -e "^[^#]*$rid" $CIF || echo "NO $rid"; done
# G11 (CS-JSON-11): prints each class that has no planted twin
for c in phantom unsafe lossy missing-required unmodelled-new stale-baseline kind enum-value-new enum-value-stale \
  union-arm-new union-arm-stale union-unmapped union-extra union-closed union-schema-inconsistent arm-unregistered \
  exit-new exit-renamed exit-stale kind-new kind-stale detail-exit-unknown error-body-required \
  root-looks-like-error-document rtf-new rtf-stale version unmapped-type; do
  find $TESTS -path '*/schema-twins/*' \( -name "$c.*" -o -name "$c" \) | rg -q . || echo "NO TWIN $c"
done
```

Schema-diff classes, one twin each: `phantom` (a model key the schema lacks), `unsafe` (model `required`, schema
optional), `lossy` (schema required, model optional; a waiver with a reason is allowed), `missing-required`,
`unmodelled-new` and `stale-baseline` (optional keys outside the baseline file), `kind` (JSON kind differs),
`enum-value-new/-stale`, `union-arm-new/-stale`, `union-unmapped/-extra`, `union-closed` (the unknown-variant arm
vanished), `union-schema-inconsistent` (the unknown arm's `not.enum` differs from the known tags), `arm-unregistered`, `exit-new/-renamed/-stale` (the `CS-ERR-02` drift test), `kind-new/-stale`,
`detail-exit-unknown`, `error-body-required`, `root-looks-like-error-document`, `rtf-new/-stale`, `version` and
`unmapped-type`. Name the exit-table class `ExitTableConformance` inside the `WireContract` namespace. The context
and the union machinery are `internal`, so the test project needs `InternalsVisibleTo`.

## Forward-Compatibility Policy

Every row was run green on net8.0 and net10.0 (measured 2026-10-11). An agent's default shortcut fails the row's
"Refuse" or "Accept" side silently, so write the test from this table.

| Case | Policy | Mechanism |
|---|---|---|
| Unknown member, root or nested, union arm included | accept and ignore | `UnmappedMemberHandling = Skip` |
| Unseen string enum value, or the wrong case (`"Updated"`) | accept; keep the raw string; `IsKnown == false`; never success | open record struct, `OpenEnumConverter<T>`, ordinal compare |
| String enum value that is not a string | refuse, `OcxDecodeException` | the converter throws `JsonException` |
| Unseen integer (`exit_code: 83`, status `-1073741819`, `143`) | accept; keep the `int`; `IsKnown == false` | `OcxExitCode(int)` with `OpenIntEnumConverter<T>` |
| Integer enum given `"65"`, `65.0`, `true` or `null` | refuse | `JsonTokenType.Number` and `TryGetInt32` only |
| Unseen, wrong-case or empty union tag | accept as the `Unknown` arm, keeping `Type` and a cloned `Raw` | `TaggedUnionConverter<TBase>` |
| Known tag spelled with a `\u00xx` escape | the known arm | `JsonElement.ValueEquals` |
| Missing, `null` or numeric tag; a non-object union; a known tag with a bad payload | refuse, `OcxDecodeException` | same converter, no `catch` around arm binding |
| Tag not first | accept | the converter buffers the object |
| Missing schema-required key | refuse | C# `required` |
| Missing schema-optional key, or an explicit `null` there | accept as unset | nullable member, not `required` |
| Explicit `null` in a required slot | refuse | `RespectNullableAnnotations` |
| Duplicate key | refuse | `AllowDuplicateProperties = false` |
| `schema_version` differs or is absent, exit 0 | refuse before binding, `OcxContractException` | top-level skim in the seam |
| `null` document or truncated output, exit 0 | refuse, `OcxDecodeException` | `?? throw`, catch `JsonException` |
| Any stdout problem with an unaccepted non-zero exit | `OcxCommandException` carrying the process exit code | `CS-JSON-20` |
| A report on stdout with an unaccepted non-zero exit | `OcxCommandException` with `PartialReport` set, one bind | `CS-JSON-21` |
| Opaque sub-object | carried as given, may hold `null` | `JsonElement` |

## What Agents Get Wrong Here

Ranked by how often each bites. The first entries are what training data and tutorials push hardest.

| # | Mistake | Caught by |
|---|---|---|
| 1 | A closed `enum` with `JsonStringEnumConverter` for status, kind or exit code, or `(ExitCode)process.ExitCode` | `CS-JSON-05` gate and RS0030 |
| 2 | `JsonSerializer.Deserialize<T>(json, options)` from 2019 to 2023 tutorials, `JsonElement.Deserialize<T>()`, `ReadFromJsonAsync<T>()` | `CS-JSON-01` gate and IL2026 |
| 3 | "Non-zero exit means error document", or try the error document, catch, try the report | `CS-JSON-21` gate and the outcome tests |
| 4 | `[JsonPolymorphic]` with `IgnoreUnrecognizedTypeDiscriminators`, or `UnknownDerivedTypeHandling = FallBackToBaseType` (no effect on reads) | `CS-JSON-07` G7 and the per-union matrix |
| 5 | `!= Failed` success checks or `_ => true` arms | `CS-JSON-06` gate and the unknown-value test |
| 6 | Missing `required`, `string?` everywhere, `required string Detail`, or believing `RespectNullableAnnotations` rejects missing keys | schema-diff `unsafe`, `lossy`, `missing-required` |
| 7 | One converter per union, a `MakeGenericType` factory, or `catch (JsonException) { return Unknown; }` around arm binding | `CS-JSON-07` G7 and the bad-payload case |
| 8 | `OcxDecodeException` for a failing command's unparsable stdout, or copying `doc.ExitCode` onto the exception | `CS-JSON-20` gate |
| 9 | Plugging the context into custom options "belt and braces", or building strict mode as `Strict` plus `TypeInfoResolver` | `CS-JSON-02` and `CS-JSON-13` gates |
| 10 | `JsonSerializerOptions.Strict` or `Disallow` in production because the .NET 10 docs call it best practice | `CS-JSON-02` gate, RS0030 |
| 11 | Newtonsoft as the default reflex (`JsonConvert`, `[JsonProperty]`, `JObject`) | `CS-JSON-16` |
| 12 | Letting `JsonException` escape, catching `Exception`, or swallowing `NotSupportedException` as a parse error | `CS-JSON-09` G9 and CA1031 |
| 13 | Checking `schema_version` after binding, or comparing the tool's semver strings | `CS-JSON-09`, `CS-JSON-10` |
| 14 | Generating hundreds of detail constants "for IntelliSense", or the kind as a closed enum | `CS-JSON-19` gate |
| 15 | Forgetting to register a union arm or a `List<T>` root (fails on that one tag only) | the `CS-JSON-03` arm loop |
| 16 | A net9 or net10 option on net8 patched with `#if`, `GetTypeInfo<T>()` on a net8 asset, testing one TFM | `CS-JSON-14` G14, building both TFMs |
| 17 | A union converter that binds arms through `OcxJsonContext.Default` "for AOT safety" | `CS-JSON-07` G7 and strict per union |
| 18 | `tag.GetString()` without a `ValueKind` check, or `GetProperty("type").GetString()` (null tag becomes `Unknown(null)`) | `CS-JSON-07` G7 and the tag cases |
| 19 | `OcxExitCode.Known.FirstOrDefault(...)` | `CS-JSON-22` |
| 20 | `required` on a flattened union base, then `[SetsRequiredMembers]` to silence CS9035 | `CS-JSON-18` |
| 21 | Hallucinated APIs: `JsonKnownNamingPolicy.SnakeCase`, `JsonSourceGenerationMode.FastPath`, `JsonUnknownEnumHandling`, `AllowUnknownEnumValues` | the first `dotnet build` (CS0117, CS0246) |
| 22 | Holding a `JsonElement` from a disposed `JsonDocument` in the `Unknown` arm | the `CS-JSON-03` loop reading `Raw` after the call |
| 23 | Treating exit 0 from `PublishAot` as proof, or suppressing IL2026 to silence it | `CS-JSON-04`, `CS-JSON-17` |
| 24 | `GenerationMode = Serialization` "for performance" | `CS-JSON-03` round trip |
| 25 | C# 15 `closed` or `InferClosedTypePolymorphism` as the modern union (CS8652 on SDK 10.0.401, throws on an unseen tag) | `CS-JSON-07` G7 |
