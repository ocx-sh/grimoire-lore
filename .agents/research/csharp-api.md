---
title: "Public API surface, its evolution, and its errors (CS-API, CS-ERR): type shapes, change gates, exception model of a CLI-wrapping .NET SDK"
topic: "csharp-api -> csharp-quality/api-design.md (CS-API) and csharp-quality/errors.md (CS-ERR); map rows API-01..API-10, API-12, API-13, API-16"
model: claude-opus-5-5
id_family: [CS-API, CS-ERR]
consolidates:
  - csharp-api/csharp-api-surface-shape.md
  - csharp-api/csharp-api-evolution-gates.md
  - csharp-api/csharp-api-exceptions-from-exit-codes.md
  - csharp-api/csharp-api-result-construction.md
  - csharp-api/csharp-api-behavioral-compat.md
date: 2026-10-11
revised: 2026-10-11
---

# Public API surface, its evolution, and its errors (consolidated)

Era: C# 14 / .NET 10 LTS (SDK 10.0.401) target, .NET 8 LTS floor, .NET 11 / C# 15 RC1 flagged where it matters. Scope: the rows apply to any NuGet library; the ocx C# SDK is the worked example.

Citation keys. **[SS]** = [surface-shape](csharp-api/csharp-api-surface-shape.md), **[EG]** = [evolution-gates](csharp-api/csharp-api-evolution-gates.md), **[EX]** = [exceptions-from-exit-codes](csharp-api/csharp-api-exceptions-from-exit-codes.md), **[RC]** = [result-construction](csharp-api/csharp-api-result-construction.md), **[BC]** = [behavioral-compat](csharp-api/csharp-api-behavioral-compat.md) (section `§n`, normative candidate `#n` or `CS-BEH-nn`, verification row `Vn`/`row n`). **[CN]** = a check this consolidation ran, fixture root `F-CN` = `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/consolidate-csharp-api/` (re-run everything: `cd F-CN && /home/mherwig/.cache/research-lang/dotnet-tools/run.sh bash ./verify.sh` prints 21 rows, `fails=0`). Consolidated siblings: **[xp]** = `csharp-crossplatform.md` (CS-TEST, CS-CI), **[jsonc]** = `csharp-json.md` (CS-JSON), **[snap]** = `csharp-testing/csharp-testing-snapshots-and-property.md` (SNAP-n), **[pkgc]** = `csharp-packaging.md` (dotnet-release R1-R14). Audits: **[ocx]** = `csharp-audit/ocx-cli-contract.md`, **[py]** = `csharp-audit/python-sdk-digest.md`, **[shape]** = `csharp-audit/exemplar-language-shape.md`, **[gates]** = `csharp-audit/exemplar-build-and-gates.md`, **[wrap]** = `csharp-audit/exemplar-cli-wrappers-and-sdks.md`. Sibling groups (same research tree): **[json]** = `csharp-json/csharp-json-forward-compatible-binding.md`, **[exit]** = `csharp-process/csharp-process-cancellation-and-exit.md`, **[argv]** = `csharp-process/csharp-process-launch-and-argv.md`, **[anz]** = `csharp-build/csharp-build-analyzer-gate.md`, **[tfm]** = `csharp-build/csharp-build-tfm-reach.md`, **[pkg]** = `csharp-packaging/csharp-packaging-nuget-release.md`.

## Verdict

1. **Entry type: one `public sealed class OcxClient`, private constructor, `static async Task<OcxClient> CreateAsync(OcxClientOptions?, CancellationToken)`; command families are sealed handles with `internal` constructors (`client.Package`, `client.Project(path)`).** Pulumi's `LocalWorkspace` shape [SS §1], Python's "discovery runs in a factory" [py:262].
2. **No public seam in 0.x/1.0: no `IOcxClient`, no public abstract runner.** The test seam is a fake `ocx` executable pointed to by `OcxClientOptions.ExecutablePath`. *Conflict resolved:* the wrapper audit recommends Pulumi's public abstract command seam [wrap:27]; [SS §1] and the crossplatform group's fake-CLI harness say no. Decided **no**: CliWrap and SimpleExec, the two best process libraries, test against dummy executables [wrap:23]; a public seam is a surface that must then evolve under CP0005/CP0006; adding an abstract class later is additive, removing one never is.
3. **Seal every public class, record and leaf exception; gate it with Meziantou `MA0053` alone (`MeziantouAnalysisMode=None`).** *Conflict resolved:* [anz] rated Meziantou optional because its default rules duplicate CA ids; [SS] needs MA0053 because CA1852 skips public types. [CN] showed `MeziantouAnalysisMode=None` + one `.globalconfig` line flags exactly the two unsealed public types and nothing else (`mz-red`: `MA0053` at `A.cs(2,14)`, `(3,14)`; planted `a.Equals(b)` produced no MA0006). One rule, zero noise.
4. **Public data types are sealed classes with `required`/`init`. Input types (options) can be built by consumers. Output types (results) cannot: they get `[JsonConstructor] internal T() { }`. Records are used only for the single-value open-enum wrappers.**
   - Records' `ToString` prints secrets, their `==` compares collections by reference, and positional ones break on the next field [SS §3, §4]. Corpus agrees: records are ~3% of declarations [shape:21].
   - *Revised, conflict resolved:* [SS §2] said results have "no public constructor". The first consolidation reduced that to "`required`/`init`", which leaves the implicit public constructor in place. [RC] measured the one-way door:
     - closing a shipped result later is `CP0002` plus consumer `CS1729` (`a-close`);
     - opening a closed one later (a public constructor or a ModelFactory) packs clean (`b2-open`, `b1rj-factory`).
   - Azure and OpenAI close results and ship factories because their clients are mockable. Anthropic, Stripe and Octokit leave results public. `OcxClient` is sealed with no seam (items 2-3), so results are closed and no factory ships [RC §9-10].
   - Python's results are public only because frozen dataclasses are public by default; that was not a design decision [RC §10].
5. **Open wire sets are `readonly record struct X(string Value) : IOpenEnum<X>`; exit codes are `readonly record struct OcxExitCode(int Value)`; C# `enum` only for sets the SDK itself produces or sends.** *Conflict resolved:* [SS §5.3] prescribed a hand-written `readonly struct` with an implicit `string` conversion; [json] prescribed a `readonly record struct` with a static-abstract `IOpenEnum<T>` and one shared converter. Decided **[json]'s form**: less code per type, compiler-generated ordinal equality and hash, satisfies CA1815 for free. Dropped the implicit `string` conversion, because `status != "faild"` would then compile and always be true. This is the one carve-out from "no public positional records": a single-`Value` wrapper cannot grow a second field.
6. **Both API gates are mandatory: PublicApiAnalyzers (inner loop, RS errors in `.globalconfig`) and package validation at `dotnet pack` (release truth) with `ApiCompatEnableRuleAttributesMustMatch` and `ApiCompatEnableRuleCannotChangeParameterName` on.** Each misses a break the other catches [EG §1], [SS §10 matrix]. *Conflict resolved:* [SS] said a baseline "cannot run until a stable 1.0.0 exists"; [EG]/[pkg] baseline every release after the first. Decided **baseline from the second release on, 0.y.z included**: `0.1.0` is a stable NuGet version, and the gate is worth most while the ocx contract churns.
7. **On input types, `required` is fixed at the type's first release. On output types, `required` may be added later, and that addition is a wire-contract change, not an API change.**
   - *Original correction (kept):* [SS #18] said a `required` hit in the diff is fine "on a member added in the same diff". That is wrong for a consumer-constructible type: a **new** `required` member breaks every consumer initializer (`CS9035`, [CN] `req-red`). On such a type, later wire-mandatory keys use `[JsonRequired]` on an `init` property ([CN] `jsonrequired`: the key is refused on net8 and net10 and consumer code still compiles).
   - *Revised (Verdict 4 changes the premise):* consumers cannot reach an internal-constructor result. Adding `required Origin` to one packs clean and the consumer compiles (`b1rj-req`). An SDK site that forgets the member fails to compile (`CS9035`, `b1rj-site`). So output types use C# `required` for every schema-required key, early or late. This matches [jsonc] CS-JSON-08 without exception. Each late addition goes through CS-JSON-11's schema diff and an ocx-floor decision (CS-API-17).
   - **`[JsonRequired]` never sits on a get-only, constructor-bound property.** That is a runtime `InvalidOperationException` and not a build error (`b2j`).
   - **`[SetsRequiredMembers]` never sits on a public constructor.** It let a later `required` member through every gate with the value `null` at run time (`a3-req`).
   - *Interplay with CS-API-07:* `required` governs whether a key is present, not which values it may hold. A `required` open-enum member refuses a missing key, but binds an unseen value with `IsKnown == false`, and fail-closed success (CS-JSON-06) still applies.
8. **`[Experimental("OCXnnnn")]` starts at SDK 1.0, not before.** *Conflict resolved:* [SS §7] marks every unfrozen report now. But no ocx baseline is cut [ocx:28], so that means every result type, and consumers would blanket-`NoWarn` the ID, which destroys the per-feature opt-in. While the SDK is 0.y.z, the version number is the signal (SemVer item 4). New, from [CN]: package validation treats `[Experimental]` members as frozen (`exp-v2-red`: `CP0002` on `ReportV2.Count`). An experimental change therefore needs a baseline suppression, and the SemVer rule must exempt suppressions on `[Experimental]` types. `check-exp-suppressions.sh` enforces this (watched red and green).
9. **Exceptions: one `public abstract class OcxException` plus exactly five sealed leaves.** The leaves are `OcxCommandException`, `OcxDecodeException`, `OcxContractException`, `OcxTimeoutException` and `OcxLaunchException`. There is no per-exit-code subclass. The Python SDK has 26 classes [py:39]; ocx's exit table went from 18 codes to 13 in one release, and a public type can never be retired [EX §2]. *Conflicts resolved:* four artifacts proposed eleven names, and each choice has a reason:
   - **Parse failure is `OcxDecodeException`**, [json]'s name, not [EX]'s `OcxParseException`. The brief requires the json group's name, and its decode seam also wraps `NotSupportedException` and union-tag faults.
   - **`OcxContractException`** merges [EX]'s `OcxVersionException` with [json]'s `OcxUnsupportedBinaryException` and `OcxContractMismatchException`. All three mean "binary and SDK speak different contracts" and have the same remedy.
   - **`OcxLaunchException` carries a `Reason`.** This replaces [argv]'s four launch types and [exit]'s `OcxSpawnException`.
   - **`OcxCommandException`** replaces [exit]'s `OcxProcessException`, which reads as a launch failure.
10. **Exit codes become `OcxExitCode` through ONE hand-written table, guarded by a conformance test against vendored `errors.json`; the SDK floor is the first ocx release with `contract`.** *Conflict resolved:* [exit #14] said "generate it, key it by ocx version"; [EX §3] and [json] said hand-write it with a conformance test, and floor at `contract`. Decided **hand-written with the test**. 13 rows are smaller than a generator, and a conformance test gives the same drift alarm as regenerate-and-diff. With the floor at `contract`, one table suffices, because 82 means one thing. Supporting 0.6.5 is an owner decision (Open questions 1).
11. **Passthrough exit codes are data, cancellation is never wrapped, `JsonException` never escapes, secrets never reach `Message`.** All four were watched failing in the corpus or the Python port [EX V1, V6, V8, V9].
12. **Behaviour is API. One data table, `tests/Ocx.Sdk.FakeCliTests/behavior-table.json`, pins which `catch` fires, throw versus return, and the promised property values. It runs against the source and against the last published nupkg in the same `dotnet test --solution`.**
    - Five planted behaviour breaks packed clean under both API gates, and the table caught each one [BC §1, row 2].
    - *Conflicts resolved:*
      - **Location.** [BC] proposed two new projects, `Ocx.Sdk.BehaviorTests` and `.Baseline`. But [xp] CS-TEST-01 fixes four tiers, and the brief puts the suite in FakeCliTests. Decided: the table and harness live in `tests/Ocx.Sdk.FakeCliTests/Behavior/`. The baseline run is a *twin build of that tier*, `tests/Ocx.Sdk.FakeCliTests.Baseline`, which compiles the same files against the package. It is not a fifth tier. The twin's assembly name is not a friend, so its compile is the no-internals gate ([CN] `twin-internal-red`: `CS0122` in the twin while FakeCliTests built green).
      - **Contract rows.** They run in ContractTests (CS-TEST-07), not from the behaviour project as [BC §8] did.
      - **Table loader.** [BC] loads the table with reflection `JsonSerializer.Deserialize<T>`, which CS-JSON-03's reflection-disabled test projects would break. Decided: load it with `JsonDocument`.
      - **Assertion form.** [EG #26] verifies with `grep ThrowsAsync<`, but [BC §2] measured that `ThrowsAsync<T>` over-fails on an allowed derived type. Decided: rows assert catch semantics.
13. **A change to any pinned outcome is a MAJOR (≥1.0; minor at 0.y.z), even when the API only grew.** A new leaf thrown for an existing exit passed pack as "added lines only = minor" and was a major (`v3-major-leaf`), so CS-API-14 now reads the table diff too.
    - Exceptions are never snapshotted in this suite. That agrees with [snap] SNAP-2(c), and [BC §6] measured the snapshot red on the allowed change and green on 4 of 5 breaks.

**Documented gaps (accepted, not open questions):**
- Nobody runs the fourth cell, the previous SDK against the current real ocx [BC §8].
- The behaviour suite ran on Linux x64 only. The Windows `ocx.exe` apphost copy and the `Win32Exception`→`Reason` row are unmeasured [BC §12]. The first windows-2025 / windows-11-arm PR leg is the measurement.
- 7 of the 19 mandatory rows are specified but not yet run [BC §5].
- net8.0 native-AOT linking of the result shape is unmeasured, because the host has no clang. The trimmed net8.0 publish is clean [RC §7].
- "Lengthening the default `Timeout` is a minor" is a judgment, not a measurement [BC Contested].

Alignment with the Azure SDK guidelines and the corpus, stated explicitly:
- **Agrees with Azure:** `dotnet-params-complex-methods` (optional inputs on an options class, CS-API-09), `dotnet-enums-exception` (a `readonly struct` for open sets, CS-API-07), `dotnet-errors-response-failed` / "Don't introduce new exception types unless there's a programmatic scenario" (CS-ERR-01).
- **Contradicts Azure:** `dotnet-service-methods-virtual` and `dotnet-client-constructor-for-mocking` (Azure keeps clients unsealed and virtual for mocking; this program seals them and mocks at the process boundary).
- **Contradicts the corpus:**
  - Sealing: 44% of public classes are sealed [shape:17], and 23-39% of exceptions depending on the count [EX §2]. This program seals by default because sealing later is `CP0009` and unsealing is free [SS §6].
  - Records: ~3% of declarations [shape:21], matched by this verdict except for open-enum wrappers.

## The ruleset

Conventions:
- **Check output.** A grep check prints the violations, so empty output is a pass. Paths assume `src/` for library code; keep the patterns and adapt the root.
- **The gate it assumes.** "Under the gate" means the dotnet-build analyzer gate: `<AnalysisLevel>10.0-all</AnalysisLevel>` plus `TreatWarningsAsErrors`, severity lines in `.globalconfig` [anz]. Under it CA1002, CA1031, CA1032, CA1064, CA1710, CA1815, CA1819, CA2200, CA2201, CA2227 and SYSLIB0051 are errors without per-rule lines. In default mode only CA2200 fires [EX §14].
- **Red** says whether the check was watched failing on a planted defect and passing on its twin.
- **Lands in** names the single file that owns the rule text; other files reference the ID.

### A. Type shapes (lands in `csharp-quality/api-design.md`)

**CS-API-01 (MUST).** The public entry type is one `public sealed class` with a `private` constructor and a single `public static async Task<TClient> CreateAsync(TOptions? options = null, CancellationToken cancellationToken = default)`. Its I/O (binary discovery, `ocx --format json version` handshake) runs only in that factory. Per-command methods live on sealed handle classes with `internal` constructors, exposed as properties or methods of the client. Deriving with changed options (`WithOptions`) never re-discovers.
- Why: constructors cannot be awaited, and I/O in a constructor hides failure. Python made the same rule [py:262], and Pulumi has the shape (`pulumi__pulumi-dotnet@2a0dca84f09b:sdk/Pulumi.Automation/LocalWorkspace.cs:78-90`) [SS §1].
- Check: `grep -rnE --include='*.cs' 'public\s+OcxClient\s*\(' src` prints nothing; `grep -rcE --include='*.cs' 'public\s+static\s+async\s+Task<OcxClient>\s+CreateAsync\s*\(' src | awk -F: '{s+=$2} END {print s}'` prints `1`.
- Red: **yes**, [CN] `grep/checks.sh` G3/G4b (red: ctor hit, count 0; green: empty, count 1).

**CS-API-02 (MUST).** No public interface or public abstract class mirrors the client or a handle (`I*Client`, `I*Commands`, `I*Runner`). Tests substitute a fake `ocx` executable. If a seam is later demanded, add a `public abstract class` with a `protected` constructor in a minor release, never an interface.
- Why: adding a member to a published interface breaks every implementer (CP0006; library-change-rules "REQUIRES JUDGMENT"; MS guidance prefers abstract classes) [SS §1], [EG §4].
- Check: `grep -rnE --include='*.cs' '^\s*public\s+(partial\s+)?interface\s+I\w*(Client|Commands|Handle|Runner)\b' src` prints nothing.
- Red: **yes**, [CN] G2.

**CS-API-03 (MUST).** Every public non-abstract class, `record class` and exception is `sealed`. An unsealed public type is either `abstract` with an `internal` constructor (closed hierarchy) or carries an `// extension point: <reason>` comment. Never seal a type that already shipped unsealed.
- Why: adding `sealed` later is `CP0009`; removing it packs clean [SS §6] (`c-v2-probe`, `c-v2-unseal`). CA1852 covers internal types only, and a `public class` with CA1852 at `error` builds clean (`i-ca1852-public`).
- Check:
  - `.csproj`/`Directory.Build.props`: `<MeziantouAnalysisMode>None</MeziantouAnalysisMode>` with a `Meziantou.Analyzer` 3.0.297 `PackageReference`.
  - `.globalconfig`: `dotnet_diagnostic.MA0053.severity = error`, `MA0053.public_class_should_be_sealed = true`, `MA0053.exceptions_should_be_sealed = true`.
  - The sealing-later direction is caught by `CP0009` at pack.
- Red: **yes**:
  - [CN] `mz-red`: `error MA0053` at `A.cs(2,14)` (public class) and `(3,14)` (unsealed exception); the `abstract` root is not flagged; zero MA0006 under `None`. `mz-green` builds clean.
  - `CP0009` watched in [SS] `c-v2-probe` and [EG] `pv-red-sealed`.
- Lands in: the rule here; the package reference and the three `.globalconfig` lines in `dotnet-build/analyzers.md`.

**CS-API-04 (MUST).** Public options and config types (inputs) and result types (outputs) are `sealed class`es with get-only or `init` members. Mandatory members are `required`. CS-API-10 governs inputs after release. CS-API-17 governs outputs, including their `internal` constructor. Collections are `IReadOnlyList<T>` / `IReadOnlyDictionary<K,V>`. There is no `{ get; set; }`, no array and no `List<T>` in public members. A type with a collection member is never a `record`.
- Why:
  - Mutable shared state and aliasing (CA2227, CA1819, CA1002 fired in [SS] `i-an-red`).
  - Record `==` compares collection members by reference: two equal-looking records are `!=` ([SS §3.2] `a-eq-red`; Skeet 2025).
  - Results follow Python's "one frozen result per command" [py:253,255].
- Check: under the gate (CA1002, CA1819, CA2227, CA1051 errors); `grep -rnE --include='*.cs' 'public\s[^=(]*\{\s*get;\s*set;\s*\}' src` prints nothing; `grep -rlE --include='*.cs' '\brecord\b' src | xargs -r grep -nE 'IReadOnly(List|Dictionary)|ImmutableArray|ImmutableList|IEnumerable<|List<|\[\]'` prints nothing (except CS-API-07 wrappers, which have none).
- Red: **yes** for the analyzers ([SS] `i-an-red` / `i-an-green`) and the equality trap (`a-eq-red` / `a-eq-green`); the greps were not separately watched.

**CS-API-05 (MUST).** No public positional `record`, `record class` or `record struct`. The only exception is a single-parameter wrapper named `Value` (`readonly record struct X(string Value)` or `(int Value)`, CS-API-07).
- Why: a new positional parameter removes the old constructor and `Deconstruct` (`CP0002` x2, [SS §4] `c-v2-red`), while a new `init` property packs clean (`c-v2-green`). `required` cannot sit on positional parameters. Only 3 positional records ship in 8 SDK exemplars [SS §4].
- Check: `grep -rnE --include='*.cs' '^\s*public\s+(sealed\s+|abstract\s+)?(readonly\s+)?record(\s+(class|struct))?\s+\w+(<[^>]*>)?\s*\(' src | grep -vE 'record struct \w+\((string|int) Value\)'` prints nothing. `CP0002` at pack is the backstop.
- Red: **yes**: [CN] G1 (red: `record Report(string Name)` and `record struct Pair(string A, string B)`; green: `Status(string Value) : IOpenEnum<Status>`, `OcxExitCode(int Value)` pass); `CP0002` in [SS] `c-v2-red`.

**CS-API-06 (MUST).** A type with a member named like a secret (`Password|Secret|Token|ApiKey|Credential`) is a `class`, or a `sealed record` that declares `private bool PrintMembers(StringBuilder)` redacting it.
- Why: the compiler-generated record `ToString` prints every public member; `$"{opts}"` printed `Password = hunter2-SECRET` [SS §3.1] `a-secret-red`. Python masks the same fields [py:269]. The correct modifier differs for unsealed records (`protected virtual`) [SS §3.1].
- Check: `grep -rlE --include='*.cs' '\brecord\b' src | xargs -r grep -lE '(Password|Secret|Token|ApiKey|Credential)' | xargs -r grep -L 'PrintMembers'` prints nothing.
- Red: **yes**, [SS] `a-secret-red` / `a-secret-green` / `a-secret-green-class`; the grep listed only the red fixture.

**CS-API-07 (MUST).** Every value read from wire output that belongs to an open set is a `readonly record struct X(string Value) : IOpenEnum<X>`. Open sets include `status`, `kind`, `error.kind` and any `x-ocx-enum`. The type has static well-known instances, `IsKnown`, a `ToString()` override returning `Value ?? ""`, the shared `OpenEnumConverter<T>`, and no implicit conversion from `string`. Integer open sets, such as the process exit status, are `readonly record struct OcxExitCode(int Value)`. A C# `enum` is allowed only for sets the SDK produces or sends: argv choices, `OcxLaunchException.Reason`. Every such enum has a zero member. No `JsonStringEnumConverter`, `Enum.Parse` or `Enum.TryParse` touches wire data. Never `switch` on struct instances with `case X.Known:`; compare with `==`.
- Why: a closed enum fails three ways on open data, all watched in [SS §5.2]:
  - it throws `JsonException` on a new value (`b-enum-red`);
  - a key mismatch reads the zero member, so `{"status":"failed"}` becomes `Ok` (`b-failopen-red`);
  - `(Status)42` and `Enum.TryParse("42")` succeed (`b-cast-red`, `b-tryparse-red`).
  The ocx contract says "enums and unions are open; unknown `status` is NOT success" [ocx:69,132]. `case` on a struct is `CS9135` (`b-switch-red`). Record-struct equality is ordinal; never copy openai's `InvariantCultureIgnoreCase` [SS §5.3].
- Check: `grep -rnE --include='*.cs' -e 'JsonStringEnumConverter' -e 'Enum\.(Try)?Parse' src` prints nothing; `grep -rnE --include='*.cs' 'implicit\s+operator\s+\w+\s*\(\s*string' src` prints nothing; `grep -rlE --include='*.cs' 'IOpenEnum<' src | xargs -r grep -nE 'IgnoreCase|InvariantCulture|CurrentCulture'` prints nothing.
- Red: **yes** for the failure modes and the green struct ([SS] `b-enum-red` / `b-enum-green`, `b-failopen-*`, `b-switch-red`; [json] O21-O24). The greps were not separately watched.
- Lands in: the type shape here; the converter, `BannedSymbols.txt` entries and success-predicate allow-lists in `csharp-quality/json.md` [json].

**CS-API-08 (MUST).** A tagged wire union is a `public abstract class` with an `internal` parameterless constructor, sealed case classes, and a sealed `Unknown` case that keeps the raw `type` and payload. Do not use `[JsonPolymorphic]`, a public interface, or C# 15 `union`/`closed` in the public API.
- Why:
  - An `internal` constructor closes the hierarchy on C# 14: a consumer subclass is `CS1729` ([SS] `j-hier-red`).
  - `[JsonPolymorphic]` silently merges unknown, missing and wrong-case tags [json].
  - `closed` is `CS8652`/`CS0656` on SDK 10.0.401 [SS §11].
  - Adding or removing a `union` case is DISALLOWED by library-change-rules, so every new ocx `type` would break consumers.
- Check: for each `grep -rnE --include='*.cs' '^\s*public\s+abstract\s+class\s+(\w+)' src` hit, the type declares `internal <Name>()`; `grep -rnE --include='*.cs' '^\s*public\s+(closed|union)\b|\[JsonPolymorphic' src` prints nothing.
- Red: **yes** for `CS1729` ([SS] `j-hier-red`) and `CS8652` (`h-closed-on-sdk10`); the greps were not watched.

### B. Evolution gates (rule text in `csharp-quality/api-design.md`; properties and wiring as noted)

**CS-API-09 (MUST).** After a version ships, only additive moves are allowed:
- New data is a new optional `init` property on an existing type.
- New input is a new property on the per-command options class (Azure `dotnet-params-complex-methods`).

Never do any of these to a shipped member: add a parameter (optional ones included), change a default, rename a parameter, seal a type, add an abstract member, add an interface member, or drop a TFM. To extend a method, keep the old overload and add one overload that carries all the optional parameters and has the most parameters (Roslyn pattern). Older overloads take mandatory parameters only. Add a `CancellationToken` to a shipped method as a new overload.
- Why: an optional parameter is source-compatible but binary-breaking, because defaults are baked into callers [EG §4-5].
- Check: `dotnet pack -c Release` with a baseline (`CP0002`, `CP0005`, `CP0006`, `CP0009`, `CP0017`, `PKV006`); `RS0026`/`RS0027` at error (CS-API-11).
- Red: **yes**:
  - [EG] `pv-red-optional` `CP0002`, `pv-red-abstract` `CP0005`, `pv-red-iface` `CP0006`, `pv-red-sealed` `CP0009`, `pv-opt-rename` `CP0017`, `mt-c-drop-tfm` `PKV006`.
  - `an-ct-optional2` `RS0026`, `an-rs0027` `RS0027`.
  - Twins `pv-green-overload`, `an-canonical`, `an-ct-explicit` green.
  - Same on SDK 8.0.425 and 11.0 RC1 [EG §3 trap 7].

**CS-API-10 (MUST).** On a type consumers can construct, `required` is decided when the type first ships. That means an input type, or any type with a public constructor. After that, never add `required` to the type, whether on an existing member or a new one. If the type is JSON-bound, a wire key that becomes mandatory later is a non-`required` `init` property with `[JsonRequired]` and a default. Never put `[SetsRequiredMembers]` on a public constructor. Output types with an `internal` constructor (CS-API-17) are exempt: `required` on them is a wire-contract change.
- Why:
  - No gate sees a `required` addition ([SS §10] matrix: package validation, the attribute rule and PublicApiAnalyzers are all silent), yet every consumer `new T { ... }` breaks with `CS9035`. That holds for a new member too ([CN] `req-red`; this corrects [SS #18]).
  - `[JsonRequired]` keeps [json]'s "missing key is an error" without the source break.
  - A public `[SetsRequiredMembers]` constructor turns a later `required` into a silent `null`: pack and the consumer are both clean, and `Origin=NULL` at run time ([RC] `a3-req`).
  - Consumers cannot reach an internal-constructor type, so `required` added there breaks no consumer ([RC] `b1rj-req`).
- Check (output types live in `src/Ocx.Sdk/Models/`, inputs never do):
  - `git diff --diff-filter=M -U0 origin/main...HEAD -- '*.cs' ':!src/Ocx.Sdk/Models/**' | grep -E '^\+[^+].*\brequired\b'` prints nothing unless every hit is on a type first introduced in this diff.
  - `rg -U -n --glob '*.cs' -e 'SetsRequiredMembers[^\n]*\n[^\n]*public\s+\w+\s*\(' -e 'SetsRequiredMembers\]\s*public\s+\w+\s*\(' src` prints nothing.
- Red: **yes**:
  - [CN] `req-red` `error CS9035: Required member 'Opts.Added' must be set` vs `req-green` (optional `init`) `Build succeeded`.
  - `jsonrequired-red` accepted a missing `digest` (exit 1); `jsonrequired` refused it with `JsonException` on net8.0 and net10.0 while v1.0 consumer code compiled (exit 0).
  - Diff grep red (v1→v2) and green (v1→v1).
  - The `[SetsRequiredMembers]` grep: red on [RC] `a3`, green on `b5` (internal constructor) [RC #3].

**CS-API-11 (MUST).** Every packable library references `Microsoft.CodeAnalysis.PublicApiAnalyzers` 5.6.0 and commits `PublicAPI.Shipped.txt` + `PublicAPI.Unshipped.txt`.
- **Seed and generate.** Seed both files with `#nullable enable` before the first run of `dotnet format analyzers src/Ocx.Sdk/Ocx.Sdk.csproj --diagnostics RS0016 RS0036 --severity info`. Never hand-write entries: records and C# 14 extension blocks emit 12+ of them.
- **Severities.** Set `RS0016`, `RS0017`, `RS0026`, `RS0027`, `RS0036` and `RS0037` to `error` in a repo-root `.globalconfig`. Never set them in `.editorconfig`, and never set `dotnet_public_api_analyzer.require_api_files`.
- **Multi-targeting.** Use one shared pair plus per-TFM delta directories wired with `Exists('PublicAPI/$(TargetFramework)')`, created only for TFMs whose surface differs.
- **Removals.** `*REMOVED*` lines are breaking-change markers (CS-API-14).

Why each part matters:
- `RS0017` is reported on the text file and ignores `.editorconfig`: it stays a warning and the build exits 0 [EG §2].
- `require_api_files` turns missing files into a silent pass.
- A wrong bootstrap order writes oblivious entries and floods `RS0036`.
- A single pair under `net8.0;net10.0` raises `RS0017` on the TFM that lacks an `#if` API.
- The analyzer cannot see binaries: `*REMOVED*` makes a binary break analyzer-green (`an-evade-optional`), so CS-API-12 must also run.

Checks:
- `grep -cE 'dotnet_diagnostic\.RS00(16|17|26|27|36|37)\.severity *= *error' .globalconfig` prints `6`.
- `grep -rn --include='.editorconfig' --include='.globalconfig' 'require_api_files' .` prints nothing.
- `grep -rL --include='PublicAPI.*.txt' '#nullable enable' src` prints nothing (unanchored: Polly's files carry a BOM).
- `dotnet format analyzers src/Ocx.Sdk/Ocx.Sdk.csproj --diagnostics RS0016 RS0036 --severity info --no-restore --verify-no-changes` exits 0.

Red: **yes**, [EG §12]:
- `.editorconfig` RS0017=error exits 0 while `.globalconfig` exits 1.
- `an-nofiles-req` exits 0 vs `an-nofiles` exit 1.
- `an-rs0036` / `an-rs0037` red.
- `mt-a-single` `RS0017` vs `mt-c-shared` green.
- `an-evade-optional` analyzer-green / pack-red.

Lands in: the file discipline here; the package reference and the `.globalconfig` lines in `dotnet-build/analyzers.md` (which explicitly left PublicApiAnalyzers out of its own scope, [anz]:10).

**CS-API-12 (MUST).** Package validation runs at `dotnet pack` with:
- `EnablePackageValidation=true`;
- `PackageValidationBaselineVersion` set to the last published version from the second release on, 0.y.z included;
- `ApiCompatEnableRuleAttributesMustMatch=true`;
- `ApiCompatEnableRuleCannotChangeParameterName=true`.

Never commit `ApiCompatGenerateSuppressionFile` or `GenerateCompatibilitySuppressionFile`. Never use `ApiCompatVersion`, `EnableApiCompat` or `PackageValidationBaseline`: none of them is an SDK property.
- Why: the default rules miss a `string` → `string?` change. `CP0015` catches it only with the attribute rule ([SS §10], `c-v2-probe`), and `CP0017` needs its flag ([EG] `pv-opt-rename`). `ApiCompatVersion` (copied from Azure.Core/OpenAI csproj) silently disables the check ([EG] `pv-noop-apicompatversion` exit 0). Package validation runs after `Pack` only ([EG §3] trap 1).
- Check: `dotnet msbuild src/Ocx.Sdk -getProperty:EnablePackageValidation -getProperty:PackageValidationBaselineVersion -getProperty:ApiCompatEnableRuleAttributesMustMatch -getProperty:ApiCompatEnableRuleCannotChangeParameterName`; `grep -rnE --include='*.csproj' --include='*.props' --include='*.targets' --include='*.yml' -e '<(ApiCompatVersion|EnableApiCompat|PackageValidationBaseline)>' -e 'ApiCompatGenerateSuppressionFile|GenerateCompatibilitySuppressionFile' .` prints nothing.
- Red: **yes**: `CP0015` ([SS] `c-v2-probe` with the flag), `CP0017` ([EG] `pv-opt-rename`), the no-op property ([EG] `pv-noop-apicompatversion`).
- Lands in: `dotnet-build/packaging.md`, which owns every package-validation MSBuild property, the baseline lifecycle and "publish only if pack exited 0" ([pkg] #15). This file references it.

**CS-API-13 (MUST from SDK 1.0; do not use before).** At 1.0, mark each ocx contract part that ocx has not frozen with `[Experimental("OCXnnnn", UrlFormat = "<docs>/diagnostics/{0}")]` on its public types and entry methods. Use one ID per independently graduating report family. Deprecate with `[Obsolete("<what to use>", DiagnosticId = "OCXnnnn", UrlFormat = ...)]`. Both kinds draw IDs from one registry file (`docs/diagnostics.md`), and an ID is never reused. Never use `[RequiresPreviewFeatures]`, custom `[Beta]`/`[Preview]` attributes, or plain `[Obsolete("...")]`. While the SDK is 0.y.z, use no `[Experimental]` at all.
- Why:
  - Only `[Experimental]` gives consumers a per-feature opt-in error (`error OCX0001 ... Suppress this diagnostic to proceed.`, the same on SDK 8.0.425) [SS §7].
  - Plain `[Obsolete]` is `CS0618` and cannot be suppressed per API [EG §8].
  - Marking everything during 0.x trains a blanket `NoWarn` (Verdict 8).
  - One registry stops `Experimental` and `Obsolete` IDs from colliding. [SS] used `OCX0001` and [EG] used `ACMEEXP001`; a separate prefix carries nothing a consumer uses.
- Check: `grep -rnE --include='*.cs' -e '\[Experimental\("[A-Za-z0-9]+"\)\]' -e '\[Obsolete(\("[^"]*"\))?\]' -e 'RequiresPreviewFeatures' src` prints nothing (no ID-less or URL-less forms); `grep -rhoE --include='*.cs' '(Experimental\(|DiagnosticId = )"OCX[0-9]{4}"' src | grep -oE 'OCX[0-9]{4}' | sort | uniq -d` prints nothing unless the duplicate is one family's own ID; every ID appears in `docs/diagnostics.md`.
- Red: **yes** for the consumer error ([SS] `e-consumer-red` / `e-consumer-green`, `g-sdk8`; [EG] `obs-consumer`). The greps were not watched.

**CS-API-14 (MUST).** Derive the version bump from mechanical signals. Behaviour signals come first: the highest bump among the matching rows wins.

| Signal | Bump (≥1.0) | Bump (0.y.z) |
|---|---|---|
| In `behavior-table.json` (CS-ERR-12): a `supersedes` block added, an existing row deleted, or an existing row's `expect`/`argv`/`setup`/`op`/`os`/`since` edited | major | minor |
| A `*REMOVED*` line, `PKV006`, or a `CompatibilitySuppressions.xml` entry on a type NOT marked `[Experimental("OCXnnnn")]` | major | minor |
| Added `PublicAPI.Unshipped.txt` lines only, or only new table rows whose `since` equals the version being released | minor | minor |
| Suppressions only on `[Experimental]` types | minor | minor |
| No added lines in `PublicAPI.Unshipped.txt` and no table change | patch | patch |

The rule behind the table: a change is a major if, for some input, a *pinned* outcome changes. A pinned outcome is which `catch` fires, throw versus return, or a pinned property value. New members, new rows for uncovered paths, `Message` text and timing are minor or patch.

Reviewer heuristics for what no row pins:
- shortening a default (`Timeout`) is a major;
- widening retry to more codes or to mutating commands is a major;
- lengthening a default is a minor;
- giving an exit code a name is a minor, unless an existing code changes name or meaning (82 was reused [ocx:57]).

- Why:
  - Neither tool computes a version [EG §9].
  - [CN] found that package validation flags changes inside `[Experimental]` types like any other (`exp-v2-red`: `CP0002 ... ReportV2.Count`), so without the exemption every experimental change would read as a major.
  - *Revised:* the API-only table called `v3-major-leaf` a minor. That change has added lines only, but a new sealed leaf is thrown for exit 75, which a pinned `catch` no longer catches. The table went red without `supersedes` [BC §3, §9, row 5].
  - Library-change-rules mark a different exception for an existing case, a removed exception and a changed return value as DISALLOWED. They allow a more derived exception and new message text [BC §2].
- Check:
  - `F-CN/check-exp-suppressions.sh src/Ocx.Sdk` exits non-zero and names each suppressed non-experimental target.
  - `git diff "$(git describe --tags --abbrev=0)"..HEAD -U0 -- '*PublicAPI.Unshipped.txt' | grep -c '^+\*REMOVED\*'`.
  - `git diff "$(git describe --tags --abbrev=0)"..HEAD -- tests/Ocx.Sdk.FakeCliTests/behavior-table.json | grep -c '"supersedes"'` is 0 unless the released version bumps its major (minor at 0.y.z).
- Red: **yes**:
  - [CN] `exp-v2-stable-sup` (suppression on stable `Report.Name`) exits 1 with `non-experimental break suppressed: M:Ocx.Exp.Report.get_Name`.
  - `exp-v2-green` (suppression on experimental `ReportV2`) exits 0 and its pack is green.
  - [BC] `v3-major-leaf`: pack exit 0, table red without `supersedes`, green with it.
- Lands in: the `dotnet-release` skill (version step); this file states the table.

**CS-API-15 (SHOULD).** Release order:
1. Choose the version (CS-API-14).
2. In the release commit, promote Unshipped into Shipped (the [EG §10] script; afterwards Unshipped holds only `#nullable enable`) and delete the accepted `IsBaselineSuppression=true` entries.
3. Pack from a clean checkout and publish only if pack exited 0. Before trusting a local baseline run, evict the cached package: `dotnet nuget locals global-packages --clear`.
4. In a separate commit after the package is on the feed:
   - bump the single `OcxBaselineVersion` property in `Directory.Build.props`, which feeds both `PackageValidationBaselineVersion` and the behaviour twin (CS-ERR-15);
   - delete every `supersedes` block whose `before` is ≤ the new baseline (CS-ERR-16);
   - on the first bump, add `tests/Ocx.Sdk.FakeCliTests.Baseline` to the solution.

`PublicAPI.Shipped.txt` changes only in release commits.
- Why:
  - The nupkg is written even when validation fails [EG §3] trap 2.
  - A stale suppression fails the next pack ("Unnecessary suppressions found"); a stale `supersedes` is its behavioural twin [BC §7].
  - A baseline bumped too early is `NU1102`.
  - Validation is incremental, so a dirty `obj/` can skip it.
  - A repacked version stays in the global packages folder: a baseline run stayed green on old bytes until eviction [BC §7 pitfall 1].
- Check: `git diff --name-only origin/main...HEAD -- '*PublicAPI.Shipped.txt'` is empty off release branches; `grep -rhvE -e '#nullable enable' -e '^[[:space:]]*$' --include='PublicAPI.Unshipped.txt' src | wc -l` prints 0 on the tag.
- Red: **yes** for the promote script, the stale suppression, `NU1102` and the nupkg-on-failure ([EG §12]).
- Lands in: the `dotnet-release` skill; [pkg] owns the property side.

**CS-API-16 (SHOULD).** The core package references no `Microsoft.Extensions.DependencyInjection*`. Any `AddOcx(this IServiceCollection, Action<OcxClientOptions>)` ships in a separate package under its own namespace, never `namespace Microsoft.Extensions.DependencyInjection`. Ship none until a consumer asks.
- Why: 0 of 8 SDK exemplar cores depend on DI. Microsoft reserves that namespace for official packages. The async factory makes DI registration awkward anyway [SS §9].
- Check: `grep -rlE --include='*.cs' --include='*.csproj' --include='*.props' 'Microsoft\.Extensions\.DependencyInjection|IServiceCollection' src/Ocx.Sdk` prints nothing.
- Red: no (exemplar measurement only).

### C. Exceptions (lands in `csharp-quality/errors.md`)

**CS-ERR-01 (MUST).** Declare exactly one `public abstract class OcxException : Exception` with three `protected` standard constructors and a `string? Command` property. Its public concrete subclasses are exactly these five, all `sealed`:

| Type | Thrown when | Key properties |
|---|---|---|
| `OcxCommandException` | ocx ran and reported failure; also exit 0 whose report `status` is not a known success value (fail closed) | `OcxExitCode ExitCode`, `OcxErrorKind? ErrorKind`, `string? Detail`, `OcxErrorContext? Context`, `string? OcxMessage`, `string? StderrExcerpt`, `string? PartialReportJson`, `bool IsTransient` |
| `OcxDecodeException` | stdout undecodable or wrong shape for a matching `schema_version` | `string Excerpt` (bounded, redacted), `string? JsonPath`, `InnerException` = `JsonException`/`NotSupportedException` |
| `OcxContractException` | the binary has no `contract` key, or a contract version (error document, command, report root) differs from the compiled one | `string Part`, `string? Found`, `string Expected` |
| `OcxTimeoutException` | the SDK's own timer fired | `TimeSpan Timeout`, `InnerException` = the `TaskCanceledException` |
| `OcxLaunchException` | ocx could not be started | `OcxLaunchFailure Reason` (enum: `Unknown`, `NotFound`, `NotExecutable`, `BadFormat`, `ArgvTooLong`), `InnerException` = `Win32Exception` |

Add a sixth type only with an ADR naming the programmatic scenario. The binary-acquisition group may need one for download and checksum failures (Open questions 4).
- Why:
  - One `catch (OcxException)` covers the SDK, which fixes Python smell S3 [py:305].
  - Exit categories churn (18→13 codes, 82 reused) [ocx:35,57], and a type cannot be retired, while a property value can [EX §2].
  - Process wrappers (CliWrap, SimpleExec, MedallionShell) all use one exception plus an exit code [EX §2].
  - Azure says "Don't introduce new exception types unless there's a programmatic scenario".
- Check: `grep -rhoP --include='*.cs' 'class\s+\K\w+(?=\s*(\([^)]*\))?\s*:\s*OcxException\b)' src | sort -u | grep -vxE 'Ocx(Command|Decode|Contract|Timeout|Launch)Exception'` prints nothing; `grep -rnP --include='*.cs' 'class\s+\w+\s*(\([^)]*\))?\s*:\s*(System\.)?Exception\b' src | grep -v 'abstract class OcxException'` prints nothing; sealing via CS-API-03 (`MA0053.exceptions_should_be_sealed`).
- Red: **yes**, [CN] G4 (red lists `OcxAuthException`, green empty).

**CS-ERR-02 (MUST).**
- **The table.** `OcxCommandException.ExitCode` comes from the process exit status through ONE internal table file (`src/**/ExitTable.cs`) holding the 13 rows of the current ocx contract.
- **Unknown codes.** A number missing from the table stays a valid `OcxExitCode` with `IsKnown == false` and its raw `int`; the mapper never throws.
- **Drift test.** A conformance test loads the vendored `errors.json` `$defs.ExitCode["x-ocx-enum"]` (value, name, category) and fails on any difference.
- **Forbidden sources.** No numeric exit literal appears outside the table file. The table is never derived from `error.kind`, `error.message` or stderr text, and the exit code is never cast to an enum or `byte`.
- **Branch order.** Branch on `ExitCode`, then `ErrorKind`, then `Detail`.

Why:
- kind ≠ code: 77 and 81 both report `permission_denied` [ocx:56].
- 82 changed meaning between 0.6.5 and main ([EX] V6 red labels a 0.6.5 dirty-rc exit `Unsupported`).
- `exit 300` reads 44 and a signal reads 137/143 [EX §3].
- "never match on `error.message`" [ocx:129], [py:258].

Checks:
- `grep -rnP --include='*.cs' '\b(code|exitCode|ExitCode)(\.Value)?\s*(==|!=|is)\s*\d{1,3}\b' src | grep -v 'ExitTable'` prints nothing.
- `grep -rnE --include='*.cs' -e '\((byte|OcxExitCode)\)\s*\w*([eE]xit|[cC]ode)' -e 'Message\.(Contains|StartsWith)' -e 'stderr\w*\.Contains' src` prints nothing.
- `dotnet test --filter FullyQualifiedName~ExitTableConformance` is in CI.

Red: **yes** for the table pair ([EX] V6 `d-exitcodes`) and the literal grep ([exit] V7 `grep/bad`); the conformance test is specified, not yet run.

**CS-ERR-03 (MUST).** Passthrough commands (`exec`, `run`, `package exec`, `package test`, `launcher *`) return a `sealed class ChildExit` with `int ExitCode` (not a positional record, CS-API-05). They never call the exit table, never throw on a non-zero child code and never retry. An exit status the SDK caused by killing the tree surfaces as cancellation or timeout, never as `OcxCommandException`.
- Why: the child's 64 equals `UsageError` and its 80 equals `AuthError` [ocx:58]. The Python SDK raises `AuthError` for a build tool exiting 80 (smell S2, [py:304]). An SDK kill reads 137 on POSIX and -1 on Windows [exit].
- Check: `grep -rlE --include='*.cs' 'ChildExit' src | xargs -r grep -nE 'ExitTable|OcxCommandException'` prints nothing; fake-CLI test where `exec` exits 80 expects `ExitCode == 80` and no exception.
- Red: **yes**, [EX] V6 (red `exit 80 category AuthError`, green `ExitCode=80 (no exception)`); [exit] V7.
- Lands in: the type rule here; the cancellation and kill protocol in `csharp-quality/processes.md` [exit].

**CS-ERR-04 (MUST).** All JSON decoding lives in one internal seam. It is the only file with `catch (JsonException` / `catch (NotSupportedException`, it turns a `null` result into `OcxDecodeException`, and it carries `InnerException`, `JsonException.Path` and a bounded, redacted excerpt, never the full stdout. No `Deserialize<T>(...)!` anywhere. Peek `schema_version` before binding; a mismatch is `OcxContractException`, not a decode error.
- Why: `JsonException` leaked past `catch (OcxException)` on truncated and skewed output, and `Deserialize<T>("null")!` returned null silently ([EX] V1). Binding first hides a version skew as a decode error [json].
- Check: `grep -rlE --include='*.cs' 'JsonSerializer\.Deserialize|JsonDocument\.Parse|\.Deserialize\(' src` lists one file; `grep -rnE --include='*.cs' 'catch \((JsonException|NotSupportedException)' src` hits only that file; `grep -rnE --include='*.cs' 'Deserialize<[^>]+>\([^)]*\)!' src` prints nothing.
- Red: **yes**, [EX] V1 `a-parse/red` (LEAKED JsonException x2, null ok) vs `green` (`OcxDecodeException`, there named `OcxParseException`); R5/R6 greps watched.
- Lands in: the exception rule here; the seam mechanics in `csharp-quality/json.md`.

**CS-ERR-05 (MUST).** Caller cancellation propagates as `OperationCanceledException` carrying the caller's token, never wrapped or converted. Only the SDK's own timer becomes `OcxTimeoutException : OcxException`, never a BCL `TimeoutException` or an OCE subtype. Every `catch (Exception e)` that wraps carries `when (e is not OperationCanceledException)`.
- Why: a blanket `catch (Exception e) { throw new OcxLaunchException(..., e); }` turned a cancel into an SDK failure, and CA1031 does not flag a wrapping catch ([EX] V8). A linked-CTS timeout is a `TaskCanceledException` indistinguishable from a cancel ([EX] V7, [exit] V2).
- Check: `grep -rlPz --include='*.cs' 'catch\s*\(Exception\s+\w+\)\s*\{[^{}]*throw\s+new\s' src` prints nothing; fake-CLI tests: cancel → `OperationCanceledException` with `CancellationToken == callerToken`, 200 ms timeout → `OcxTimeoutException`.
- Red: **yes**, [EX] V7, V8 (R8 grep lists only `wrap-red`); [exit] V2.
- Lands in: here; the classification order (the caller wins a tie) in `csharp-quality/processes.md` [exit].

**CS-ERR-06 (MUST).** No catch-all swallows. A `catch (Exception)` or bare `catch` is allowed only at three sites:
1. the process or decode seam, with the cancellation filter and a wrap;
2. best-effort cleanup, with `[SuppressMessage("Design", "CA1031:...", Justification = "...")]`;
3. a handler that ends in `throw;`.
- Why: CA1031 is on under the gate but accepts `when (ex is not OperationCanceledException) { return -1; }`. A filter that mentions the variable reads as specific ([EX] V3b, observed and undocumented).
- Check: under the gate (CA1031); `grep -rnPzo --include='*.cs' 'catch\s*(\(Exception[^)]*\))?\s*(when\s*\([^)]*\))?\s*\{\s*(return[^;]*;|\})' src | tr '\0' '\n'` prints nothing except sites carrying a CA1031 `Justification`.
- Red: **yes**, [EX] V3b and R10 (4 hits in `red-filter`, none in `green`).

**CS-ERR-07 (MUST).** Exception types are classes, never `record` (that is `CS8864`), with get-only typed properties. They have no `{ get; set; }`, no `Exception.Data` writes, no `[Serializable]`, no `ISerializable`, no `SerializationInfo`/`StreamingContext` constructor and no `GetObjectData`. CA1032 is satisfied by the root's protected constructors. Each sealed leaf keeps `internal` data constructors and one `[SuppressMessage("Design", "CA1032:Implement standard exception constructors", Justification = "...")]`; there is no public parameterless leaf constructor and no `#pragma warning disable CA1032`.
- Why:
  - SYSLIB0051 has obsoleted the serialization surface since .NET 8. The MS CA1032 and "creating exceptions" samples still show `[Serializable]`, and that is the stale advice agents copy [EX §8].
  - `Data` is untyped, documented as insecure and missing from `ToString()` [EX §11].
  - A public `()` constructor allows a failure with no exit code [EX §9].
  - [anz] lists CA1032 as a site-level suppression for "exceptions with mandatory data", so the two groups agree.
- Check: `grep -rnE --include='*.cs' -e 'SerializationInfo' -e 'StreamingContext' -e '\[Serializable\]' -e 'ISerializable' -e 'GetObjectData' -e '\.Data\[' -e '\.Data\.Add\(' -e 'pragma warning disable CA1032' src` prints nothing; `grep -rnP --include='*.cs' 'record\s+\w+\s*(\([^)]*\))?\s*:\s*[\w.]*Exception\b' src` prints nothing; under the gate SYSLIB0051 and CA1032 are errors.
- Red: **yes**, [EX] V2/V5 (SYSLIB0051 on net8.0 and net10.0, SDK 8.0.425 too), V4 (`CS8864`), V3c (CA1032 variants; the suppressed leaf is clean), R1 and R4 greps.

**CS-ERR-08 (MUST).** `Message` is a fixed template: `ocx <command> failed (exit <code> <name>)[: <detail>]. <one actionable hint>`. It never contains argv values, environment, stdout or the stderr tail. `OcxMessage` and `StderrExcerpt` are opt-in properties, bounded to 500 chars and passed through the SDK's single redactor. `ToString()` never prints `PartialReportJson`.
- Why: CliWrap, SimpleExec, MedallionShell, Pulumi and Anthropic put argv, streams or bodies in `Message` [EX §12]. `OCX_AUTH_*` and 9 more variables are secrets [ocx:82]. Python's `__str__` excludes stdout and carries a next step [py:113,258].
- Check: canary test. A fake `ocx` receives `ghp_CANARY` in argv and in `OCX_AUTH_*` and echoes it on stderr; assert `!ex.Message.Contains("ghp_CANARY") && !ex.ToString().Contains("ghp_CANARY") && ex.Data.Count == 0`.
- Red: **yes**, [EX] V9 (`f-secrets` red True/True/True; green False/False/False, `Data entries: 0`).
- Lands in: here; the redactor itself in `csharp-quality/processes.md` [argv §6.3].

**CS-ERR-09 (SHOULD).** No public method takes a throw-or-not switch (`bool throwOnError`, a validation enum), and none returns or `out`s an exception. Two methods say it in the type system (`RunAsync` throws, `ExecAsync` returns `ChildExit`). Report-then-fail commands take an explicit accepted-exit-code set per call and return the typed report for those codes.
- Why: FDG says "DO NOT have public members that can either throw or not based on some option", while CliWrap's `WithValidation` does exactly that [EX §5]. 17 command modes print a report AND exit non-zero [ocx:60].
- Check: `grep -rnE --include='*.cs' -e 'bool\s+(throwOnError|throwOnFailure|validate|check)\b' -e 'out\s+\w*Exception\s' -e 'Task<\w*Exception>' src` prints nothing.
- Red: no.

**CS-ERR-10 (SHOULD).** `OcxCommandException.IsTransient` is `ExitCode == OcxExitCode.TempFail` (75) and nothing else. It is the only retry signal; the retry policy itself (non-mutating, ocx-owned commands only) is [exit]'s.
- Why: ocx says "A wrapper can loop on 75 and stop on 69" [EX §4]; 69, 81 and 82 are "retrying will not help" [ocx:130].
- Check: `grep -rnE --include='*.cs' 'IsTransient\s*=>' src` shows one definition comparing to `TempFail`; unit test over all 13 codes.
- Red: no (retry loop watched in [exit] V3).

**CS-ERR-11 (CONSIDER).** Never redeclare `InnerException` or `Message` with `new`, and never let an exception member or `ToString()` throw.
- Why: Anthropic's `public new HttpRequestException InnerException` getter throws when there is no inner exception, which breaks every logger that walks the chain [EX §11].
- Check: `grep -rnE --include='*.cs' 'new\s+\w+\??\s+(InnerException|Message)\b' src` prints nothing; CA1065 under the gate.
- Red: grep watched on the exemplar (R11).

### D. Output types under source generation (lands in `csharp-quality/api-design.md`; the probe test in `csharp-quality/json.md`)

**CS-API-17 (MUST).** Every public data type is either an input, which the caller builds, or an output, which the SDK returns. No type is both. Output types live in `src/Ocx.Sdk/Models/` and have this shape:
- `public sealed class` with `[JsonConstructor] internal T() { }`. The attribute is mandatory.
- Every schema-required key is `public required X Name { get; init; }`, including keys that become required in a later release.
- Every schema-optional key is a nullable `public ... { get; init; }`.
- None of these: a public constructor, a parameterized `[JsonConstructor]`, a non-public setter, an `IEquatable<T>`/`Equals`/`GetHashCode`/`ToString` override.

Where results meet code:
- A result never appears as a parameter of a public method. A method that needs one back takes its identifying strings or a separate input type.
- The SDK's own tests construct results only through `InternalsVisibleTo`, which names only the CS-TEST-01 test assemblies and never the `.Baseline` twin.
- Tests compare results with `Assert.Equivalent(expected, actual, strict: true)`.
- Adding `required` to an output type must touch the vendored `reports.json` golden and keep the CS-JSON-11 schema diff green.

- Why:
  - Opening a closed type later is additive, but closing an open one is `CP0002` + `CS1729` ([RC] `a-close` vs `b2-open`, `b1rj-factory`).
  - With an `internal` constructor, `required` becomes an SDK-side safety net (`CS9035` at SDK sites, `b1rj-site`) instead of a consumer break.
  - A parameterized constructor turns every parameter without a default into a mandatory wire key, even a nullable one (`b2x`), and makes `[JsonRequired]` unusable (`b2j`).
  - Without records, `Equals` is reference equality and `Assert.Equal` fails on equal results; `Assert.Equivalent(strict)` does the structural job ([RC §6], xunit.v3.assert 4.0.2).
  - An extra `InternalsVisibleTo` friend is hidden public API. Without strong naming (CS-PKG), any assembly with that name is a friend.
- Check (each prints nothing):
  - `rg --files-without-match -e '\[JsonConstructor\]' --glob '*.cs' src/Ocx.Sdk/Models`
  - `rg -n --glob '*.cs' -e '^\s*public\s+[A-Z]\w*\s*\(' src/Ocx.Sdk/Models`
  - `rg -U -n --glob '*.cs' -e '\[JsonConstructor\][^\n]*\n\s*(internal|public|private)\s+\w+\s*\([^)\s]' src/Ocx.Sdk/Models`
  - `rg -n --glob '*.cs' -e '(private|internal|protected)\s+set;' -e 'IEquatable<' -e 'override bool Equals' -e 'override int GetHashCode' -e 'override string ToString' src/Ocx.Sdk/Models`
  - `names=$(rg -o --no-filename --glob '*.cs' -e '\[JsonConstructor\] internal (\w+)\(' -r '$1' src/Ocx.Sdk/Models | sort -u | paste -sd'|'); rg -n --glob '*.cs' --glob '!Models/**' -e "public [^=]*\((.*[ ,(])?($names) \w+" src/Ocx.Sdk`
  - `rg -n -e 'InternalsVisibleTo' --glob '*.cs' --glob '*.csproj' --glob '*.props' src | rg -v -e 'Ocx\.Sdk\.(UnitTests|FakeCliTests|ContractTests)"'`
  - `git diff --name-only origin/main...HEAD` lists `reports.json` whenever a `+.*\brequired\b` line lands under `src/Ocx.Sdk/Models/`.
- Red: **yes**:
  - [RC] V8 `cons/b1rj-init` `error CS1729` vs `cons/a-init` exit 0;
  - V11 `a-close` `CP0002` vs `b2-open` clean;
  - V16 `a3-req` vs `b1rj-req`; V17 `b1rj-site` `CS9035`;
  - V18 `ivt/tests-nofriend` `CS1729` vs `ivt/tests` exit 0;
  - V20 `Assert.Equal` FAIL vs `Assert.Equivalent(strict)` pass.
  - The attribute, public-constructor, parameterized-constructor and result-as-parameter greps were watched on `b1`/`b2n`, `a2`, `b2` and a planted `Take(PackageInfo p)` [RC #1, #2, #7, #8]. The equality and IVT greps were not planted.

**CS-API-18 (MUST).** Nothing in `src` uses a `private` or `protected` constructor under `[JsonConstructor]`, a `private` or `protected` accessor under `[JsonInclude]`, or `[JsonRequired]` on a get-only property. No `NoWarn`, `#pragma` or `.editorconfig` line suppresses `SYSLIB1222` or `SYSLIB1038`.
- Why:
  - The net8.0 (STJ 10.0.12) and net10.0 generators reject non-`internal` hidden members. That is `SYSLIB1222`/`SYSLIB1038`, an error under the unconditional TWAE, and a runtime throw if suppressed ([RC] V1, V2; same on SDK 8.0.425).
  - .NET 11 RC1 accepts them (`sdk11/b3`, `b4j`). Its docs say so, and dotnet/runtime#77016 (2022) says the opposite about `internal`, so agents copy both wrong ways. Neither is usable while net8.0 is the floor [RC §2].
  - `[JsonRequired]` on a get-only property throws `InvalidOperationException ... does not specify a setter` at first use (`b2j`).
- Check (each prints nothing):
  - `rg -U -n --glob '*.cs' -e '\[JsonConstructor\][^\n]*\n\s*(private|protected)' -e '\[JsonInclude\][^\n]*(private|protected)\s+(set|init)' src`
  - `rg -n -e 'SYSLIB1222' -e 'SYSLIB1038' --glob '*.csproj' --glob '*.props' --glob '*.targets' --glob '*.cs' --glob '.editorconfig' .` (TWAE already makes both errors, so any mention is a suppression)
  - `rg -n --glob '*.cs' -e '\[JsonRequired\][^\n]*\{\s*get;\s*\}' src`
- Red: **yes**:
  - [RC] V1 `./b.sh b3/lib net10.0` → `error SYSLIB1222`;
  - V2 `b4` → `error SYSLIB1038`;
  - V6 `b2j` `InvalidOperationException`.
  - Green: `b1rj`, `b1j`.

**CS-API-19 (MUST).** A UnitTests probe walks every public `JsonTypeInfo` property of `OcxJsonContext.Default` and runs `JsonSerializer.Deserialize("{}", info)` on each. Success or `JsonException` passes. Any other exception fails the test and names the type: `NotSupportedException` means no usable constructor, `InvalidOperationException` means bad metadata. The probe asserts it saw at least as many types as there are `[JsonSerializable]` attributes, never exactly as many.
- Why:
  - An `internal` constructor *without* `[JsonConstructor]` builds with zero diagnostics and throws on first `Deserialize`, because the generator ignores non-public constructors that lack the attribute ([RC] V3-V5; `JsonSourceGenerator.Parser.cs`).
  - A root round-trip (CS-JSON-03) misses the defect on a nested type that the fixture never instantiates, such as an empty list.
  - *Correction to [RC #6]:* "assert the number probed equals the number of `[JsonSerializable]` attributes" always fails. The context exposes transitive types too: [CN] probed 4 properties (`Report`, `Item`, `IReadOnlyListItem`, `String`) for 1 attribute.
- Check:
  - `rg -n -e 'GetProperties' -e 'JsonTypeInfo' tests/Ocx.Sdk.UnitTests` shows the probe;
  - the probe is in the CS-TEST-06 run.
- Red: **yes**:
  - [CN] `probe-nested-red`: an attributed root over a nested `Item` whose `internal Item()` lacks the attribute gives `A Item: BAD NotSupportedException`, exit 1. `probe-nested-green` exits 0 with seen=4.
  - [RC] V5: `./probe.sh b1 net10.0` exit 1, `b1rj` exit 0.

**CS-API-20 (SHOULD).** Ship no `OcxModelFactory`, builder or other public way to create output types until a consumer records a test they cannot write. If one ships:
- name it `<Package>ModelFactory`;
- each method has all parameters defaulted;
- every later change adds a new overload and hides the old one with `[EditorBrowsable(EditorBrowsableState.Never)]` and no defaults (Azure `dotnet-mocking-factory-builder-methods`);
- a consumer-compile canary project calls every method with its previous argument list.
- Why:
  - Azure's factory exists to feed mockable clients, and `OcxClient` has none.
  - A factory doubles the surface per result type (Python has 64 result dataclasses).
  - Its overload ambiguity is invisible to package validation (`c-ambig`: pack clean, consumer `CS0121`).
  - Adding one later is clean (`b1rj-factory`) [RC §9].
- Check: `rg -n --glob '*.cs' -e 'class\s+\w*(ModelFactory|Builder)\b' src/Ocx.Sdk` prints nothing before the recorded decision. After it, `dotnet build tests/Ocx.Sdk.ConsumerCanary -c Release` exits 0 in CI.
- Red: the protocol is **yes** ([RC] V14 `c-optparam` `CP0002`, V15 `c-ambig` `CS0121` vs `c-azure` and `cons-ev/c-azure-4` green). The grep was not planted.

### E. Behavioural compatibility (lands in `csharp-quality/errors.md`; the release steps in the `dotnet-release` skill)

**CS-ERR-12 (MUST).** Keep exactly one behaviour table as data at `tests/Ocx.Sdk.FakeCliTests/behavior-table.json`.
- **Format.** The file is `{"schema":1,"rows":[...]}`. Ids are unique and kebab-case, and every row has `id`, `since`, `op`, `argv` and `expect`.
- **Harness.** It lives in `tests/Ocx.Sdk.FakeCliTests/Behavior/` and loads the table with `JsonDocument`. One xUnit v3 theory runs over the row ids.
- **Mandatory rows** (from [BC §5]); the `Mandatory_rows_are_present` test fails when one is missing:
  - CS-ERR-01/02: `cmd-usage`, `cmd-temp-fail`, `cmd-unknown-code`, `cmd-garbage-error-document`.
  - CS-JSON-06 tolerance and fail-closed: `report-unknown-member-tolerated`, `report-unknown-status-fails-closed`.
  - CS-ERR-04: `decode-truncated-json`, `decode-unknown-enum-value`, `decode-unknown-union-tag`, `decode-missing-required`.
  - CS-ERR-03: `passthrough-child-exit-is-data`.
  - CS-ERR-05: `timeout-is-sdk-type`, `caller-cancel-is-oce`.
  - CS-ERR-01 launch and contract: `launch-missing-binary`, `launch-not-executable` (`os: posix`), `contract-version-mismatch`.
  - CS-ERR-09: `report-then-fail-partial-document`.
  - CS-ERR-08: `secret-canary-not-in-message`.
  - CS-ERR-10: `retry-only-on-75-nonmutating`.
- **Coverage.** Every `Ocx*Exception` type constructed in `src` is the `expect.type` of some row, added in the same PR as the throw site.
- **Rows newer than the SDK under test** are filtered out by `since`, never `Skip`ped.
- Why:
  - Four consumers read the table: the source run, the baseline twin, ContractTests and the diff guard.
  - JSON is diffable and guardable; expected outcomes in code are what an agent edits to go green.
  - A skipped row still counts toward `--minimum-expected-tests` (CS-TEST-06).
  - `JsonDocument` keeps the loader working under CS-JSON-03's reflection-disabled test projects.
- Check:
  - `jq -e '.schema==1 and (.rows|length)>=19 and ([.rows[].id]|length)==([.rows[].id]|unique|length) and all(.rows[]; has("id","since","op","argv","expect"))' tests/Ocx.Sdk.FakeCliTests/behavior-table.json`
  - `comm -23 <(grep -rhoE --include='*.cs' 'new Ocx[A-Za-z]+Exception' src | sed 's/new //' | sort -u) <(jq -r '.rows[].expect.type' tests/Ocx.Sdk.FakeCliTests/behavior-table.json | sort -u)` prints nothing.
  - `rg -n -g '*.cs' -e 'InlineData' -e 'JsonSerializer\.Deserialize' -e 'Skip *=' tests/Ocx.Sdk.FakeCliTests/Behavior` prints nothing.
- Red: **yes**, from [BC] row 8 and row 10:
  - the jq duplicate-id check returned 1;
  - `comm` printed `OcxTransientException` for v3 with the old table;
  - `Mandatory_rows_are_present` was red with `launch-missing-binary` deleted;
  - every `since` set to 9.0.0 gave `No data found` (exit 2).

**CS-ERR-13 (MUST).** Rows assert catch semantics, never exact types or message text.
- **Type and catches.** `expect.type` names a type in the thrown or returned object's base chain. `catchAs` lists the `catch` clauses that must fire and `notCatchAs` those that must not.
- **Properties.** Only the listed `props` are read, and `Message` is never one of them. The only exception is the canary row's `notContains`.
- **Null and unknown codes.** Pin `null` only where the property's XML doc promises null. The unknown-exit row uses code 200, which ocx never assigns.
- **Forbidden in `Behavior/`:** exact `Assert.ThrowsAsync<T>`, `ThrowsAnyAsync<Exception>`, `Record.Exception*`, `GetType() ==`, and Verify snapshots.
- Why:
  - Library-change-rules allow a more derived exception and changed message text.
  - `ThrowsAsync<OperationCanceledException>` failed on a `TaskCanceledException`, and `ThrowsAnyAsync<Exception>` passed on everything [BC §2, row 11].
  - A row that reads only listed properties lets additions stay minor.
  - ocx uses 0, 1 and 64-82 and retired 83-87 [ocx:35-56].
  - A snapshot went red on the allowed `v2-green-add` and green on 4 of 5 breaks [BC §6]; [snap] SNAP-2(c).
- Check:
  - `rg -n -g '*.cs' -e 'ThrowsAsync<' -e 'Throws(Any)?Async<Exception>' -e 'Record\.Exception' -e 'GetType\(\) *==' -e '\.Message\b' -e 'Verifier\.Verify|Verify\(' tests/Ocx.Sdk.FakeCliTests/Behavior` prints nothing except the canary's `notContains` reader.
  - `jq -e '[.rows[].expect.props // {} | keys[]] | all(. != "Message")' tests/Ocx.Sdk.FakeCliTests/behavior-table.json`
  - `jq -r '.rows[] | select(.id=="cmd-unknown-code") | .argv[1]' tests/Ocx.Sdk.FakeCliTests/behavior-table.json` prints `200`.
- Red: **yes** for the assert forms and the snapshot control ([BC] rows 6, 11). The greps were not planted.

**CS-ERR-14 (MUST).** The `Behavior/` harness uses only the public SDK surface.
- **Launch.** It reaches the fake only through `OcxClientOptions.ExecutablePath`, which points at a post-build copy of `Ocx.Fake`'s apphost named `ocx`/`ocx.exe` (the `FakeAsOcx` target, [BC §4]). This is CS-TEST-03's executable-resolution case. FakeCliTests' engine tests keep `dotnet exec <dll>`.
- **No internals.** No internal type, `InternalsVisibleTo` member or process seam is used.
- **Bounded rows.** Every row that sleeps carries `timeoutMs` or `cancelAfterMs` ≤ 1000.
- Why:
  - The same files must compile against the previous nupkg, which has none of today's internals.
  - FakeCliTests itself is a friend assembly, so only the twin's compile sees a leak.
  - The resolver accepts only `ocx`/`ocx.exe` (CS-PROC-03). An apphost still finds `Ocx.Fake.dll` beside it.
  - A hang regression must fail in seconds (CS-TEST-04).
- Check:
  - `rg -n 'DestinationFiles="\$\(OutDir\)ocx' tests/Ocx.Sdk.FakeCliTests/*.csproj` hits.
  - `jq -e '[.rows[] | select(.argv[0]=="sleep") | (.setup.timeoutMs // .setup.cancelAfterMs)] | all(. != null and . <= 1000)' tests/Ocx.Sdk.FakeCliTests/behavior-table.json`
  - From the second release, `dotnet build tests/Ocx.Sdk.FakeCliTests.Baseline` is the internals gate.
- Red: **yes**:
  - [CN] `twin-internal-red`: a `Behavior/` file reading an internal gives `error CS0122: 'Engine' is inaccessible due to its protection level` in the twin, exit 1, while `twin-friend-builds` (FakeCliTests, a friend) exits 0. `twin-public-green` exits 0.
  - [BC] the apphost copy ran 30/30 on Linux.

**CS-ERR-15 (MUST).** From the second release, a twin project `tests/Ocx.Sdk.FakeCliTests.Baseline` runs the same table against the last published package.
- **What it compiles.** It has no sources of its own: `<Compile Include="../Ocx.Sdk.FakeCliTests/Behavior/*.cs" />` plus the linked table.
- **What it references.** `Ocx.Sdk` by `PackageReference` at exactly `$(OcxBaselineVersion)`, via a CPM `PackageVersion` with that value. `OcxBaselineVersion` is the one property that also sets `PackageValidationBaselineVersion`. There is no `ProjectReference` to `src`, no range and no floating version.
- **Assembly name.** It keeps its own `AssemblyName`, which is never an `InternalsVisibleTo` friend.
- **Settings.** It inherits the TFMs and bakes `--minimum-expected-tests` like FakeCliTests.
- **Provenance test.** `Sdk_under_test_is_the_expected_artifact` compares `AssemblyMetadata("BaselineVersion")` with the SDK's informational version: equal in the twin, ≥ in FakeCliTests.
- **Where it runs.** Both projects are in the solution, so every PR leg runs them in one `dotnet test --solution` (CS-CI-01).
- Why:
  - One property keeps the API gate and the behaviour gate on the same release.
  - A mis-wired baseline silently tests the source twice.
  - Assembly `Location` cannot tell the copies apart; the first draft failed that way.
  - An empty `Version` is a restore error, so the twin starts with the first baseline bump (CS-API-15 step 4).
  - Cost: 1.9 s test time, 5.1 s cold [BC §7].
- Check:
  - `[ "$(dotnet msbuild src/Ocx.Sdk -getProperty:PackageValidationBaselineVersion)" = "$(dotnet msbuild tests/Ocx.Sdk.FakeCliTests.Baseline -getProperty:OcxBaselineVersion)" ]`
  - `! rg -n -g '*.csproj' 'ProjectReference.*src/Ocx\.Sdk' tests/Ocx.Sdk.FakeCliTests.Baseline`
  - `rg -n 'Sdk_under_test_is_the_expected_artifact' tests/Ocx.Sdk.FakeCliTests/Behavior` has one hit.
  - `rg -n 'minimum-expected-tests' tests/Ocx.Sdk.FakeCliTests.Baseline` hits.
- Red: **yes** ([BC] row 9):
  - `-p:OcxBaselineVersion=1.0.1` against a broken 1.0.1 went red;
  - the stale-cache run was green, then red after eviction;
  - `NU1202` came from a stale single-TFM package;
  - the `Location`-form provenance test went red;
  - net8.0 and net10.0 were both red on `v2-red-type` (60 tests).

**CS-ERR-16 (MUST).** CI runs `tests/check-table-diff.sh` (11 lines of jq, body in [BC] CS-BEH-09) against the merge base. Without a new `supersedes: {before, expect}` block, the script fails a PR that:
- deletes a row;
- edits an existing row's `expect`, `since`, `op`, `os`, `argv` or `setup`.

`Row.ExpectFor(sdkVersion)` returns the old expectation below `before`. At each baseline bump, delete every `supersedes` whose `before` ≤ the new baseline.
- Why:
  - The characteristic agent move is editing the expectation to match the new behaviour; this turns that edit into a visible, versioned decision.
  - A stale block is the behavioural twin of a stale `CompatibilitySuppressions.xml` [BC §7].
- Check:
  - `base=$(mktemp) && git show "$(git merge-base origin/main HEAD)":tests/Ocx.Sdk.FakeCliTests/behavior-table.json > "$base" && tests/check-table-diff.sh "$base" tests/Ocx.Sdk.FakeCliTests/behavior-table.json` exits 0.
  - The stale check is the [BC] CS-BEH-11 `sort -V` snippet over `OcxBaselineVersion`.
- Red: **yes** ([BC] row 8, row 10):
  - three reds: `expect.type` edited, row deleted, `since` raised;
  - three greens: unchanged, edit plus `supersedes`, new row;
  - stale check: ok at 1.0.0, STALE at 2.0.0.

**CS-ERR-17 (SHOULD).** ContractTests links the same `behavior-table.json`. Under `OCX_SDK_CONTRACT=1` it runs every row that has a `contract` block, which holds the real `argv` and the subset of `props` the pinned ocx can satisfy. These are CS-TEST-07's "version-keyed exit-code rows reachable offline". While the pinned ocx prints no error document, the subset omits `ErrorKind`.
- Why: the fake can lie, and the subset keeps it honest. Real ocx 0.6.5 satisfied `cmd-usage` (exit 64, `UsageError`) but emits no `error.kind` [BC §8].
- Check:
  - `jq -e '[.rows[] | select(.contract) | .contract.props | keys[]] | all(. != "ErrorKind")' tests/Ocx.Sdk.FakeCliTests/behavior-table.json` holds while `TestedOcxVersion` predates `contract`.
  - `rg -n 'behavior-table.json' tests/Ocx.Sdk.ContractTests/*.csproj` hits.
- Red: **yes** in [BC] row 7: armed with `OCX_SDK_EXE` unset gave 2 failed; armed against `/bin/true` gave 2 failed; real 0.6.5 gave 30/30. That ran from the behaviour project. The ContractTests placement is this consolidation's decision and was not run.

**Dropped from the sub-artifacts as covered or generic.**
- **Covered by the [anz] gate without a rule here:**
  - `throw ex;` (CA2200, default-on);
  - general or reserved exception types (CA2201);
  - CA1064 / CA1710 naming;
  - explicit `.editorconfig` severity lines ([EX #21]). Severities live in `.globalconfig`, and `.editorconfig` would outrank them [anz:48].
- **Owned by sibling groups:**
  - netstandard2.0 polyfills ([SS #20]) belong to [tfm]. Owner decision: `IOpenEnum<T>`'s static abstract members do not exist on netstandard2.0.
  - `LangVersion 14` ([SS #22]) belongs to [tfm].
  - Success-predicate allow-lists ([SS #12]) belong to [json].
  - The CI pack-exit step belongs to [pkg].
- **Dropped:** synchronous `ArgumentException` before the first `await` ([EX #23]). It is generic, and its CA1062 dependency contradicts [anz]'s repo-wide CA1062 suppression.
- **Covered by siblings, from the revision round:**
  - [RC #13], the `PublishAot` smoke consumer, is [jsonc] CS-JSON-04. The reflection-fallback grep is CS-JSON-01.
  - [RC #15], source mapping for the baseline id, is CS-BUILD's package source mapping. The `PKV006` collision stays as failure mode 24.
  - [BC] CS-BEH-12 (every PR leg) is CS-CI-01, because the suite now lives in a tier that already runs on every leg.
  - CS-BEH-15 (inherit TFMs) is CS-TEST-01.
  - CS-BEH-17 (bounded sleeps) is folded into CS-ERR-14.
  - CS-BEH-14 (cache eviction) is folded into CS-API-15 step 3.
- **Superseded:** [EG #26]'s verification (`grep ThrowsAsync<` per failure mode) is replaced by CS-ERR-12/13. Exact-type asserts over-fail on allowed changes [BC §2].

## Applied to the ocx C# SDK

**New commitments this group forces on the SDK design:**
- `OcxClient.CreateAsync` performs discovery plus the handshake. A binary without `contract` throws `OcxContractException(Part: "binary", Found: "0.6.5")`, so the SDK cannot run against any released ocx today ([ocx:25-27]; Open questions 1).
- Result types are `sealed class`es with `required init` members as of their first release; later fields are optional `init` or `[JsonRequired]` (CS-API-10). Unknown JSON keys are skipped by default [ocx:132].
- Open sets read from ocx output use one `IOpenEnum<T>` family:
  - every `status`, `kind` and `x-ocx-enum` value;
  - the 11 `error.kind` values (`OcxErrorKind`);
  - the exit code (`OcxExitCode`, int).
  The 505 `error.detail` slugs stay `string` [ocx:56,71].
- Five exception leaves and one `ExitTable.cs` with 13 rows plus a conformance test. `IsTransient` = 75.
- Both API gates are on from the first commit. Package validation gets its baseline from the second release on (0.2.0 validates against 0.1.0).
- No `[Experimental]` while 0.y.z. At 1.0, each ocx report family whose `schema_version` is not frozen gets its own `OCXnnnn`.
- Every result type in `src/Ocx.Sdk/Models/` carries `[JsonConstructor] internal T() { }` (CS-API-17). Consumers test their code through their own adapter or the process fake. No ModelFactory ships (CS-API-20). An `Ocx.Sdk.Testing` package is the cleaner later answer if demand appears [RC Contested]. A UnitTests probe guards the attribute (CS-API-19).
- FakeCliTests gains `Behavior/` and `behavior-table.json` with the 19 mandatory rows (CS-ERR-12). From 0.2.0 the `.Baseline` twin runs them against the 0.1.0 nupkg (CS-ERR-15). One `OcxBaselineVersion` drives both that twin and package validation.
- The version is chosen from the table diff as well as the API diff (CS-API-14): an SDK change that reclassifies an exit, for example after ocx reused 82, is a major at ≥1.0.

**Rules the Python SDK already models (port the idea, change the mechanism):**
- Typed handles per command tier (`Ocx.project(path)`, `.package`) [py:58] become CS-API-01's sealed handles with `internal` constructors.
- "Discovery runs in a factory, never in `__init__`; `with_config` never re-discovers" [py:262] becomes `CreateAsync` + `WithOptions`. The `with_config` port is a sealed non-positional options record with `with` [py:347], or a sealed class with a copy method. If it is a record holding `OCX_AUTH_*` values, CS-API-06's `PrintMembers` applies ([py:269] masks with `field(repr=False)`).
- "One frozen result per command; unknown keys ignored" [py:120-123,253] becomes sealed get-only classes on STJ's default skip.
- `Literal` aliases for argv-only sets [py:128,254] become closed C# enums (CS-API-07 permits them); open sets stay strings in Python and become `IOpenEnum<T>` structs in C#.
- "Never classify by stderr text" [py:258] becomes CS-ERR-02.
- Redacted argv and a bounded stderr excerpt, with stdout kept out of `__str__` [py:112-113], become CS-ERR-08.
- Python's tests parse fixtures rather than construct results (`ocx-sdk-python@80136dde4162:src/ocx_sdk/_results.py:329,552`, [RC §10]). That is exactly what CS-API-17 leaves consumers and SDK tests: golden JSON in, and `Assert.Equivalent` out.

**What the ocx CLI contract forces:**
- open enums and unions with fail-closed success [ocx:69,117,128] (CS-API-07, CS-API-08, CS-ERR-01 row 1);
- an exit table keyed to a contract generation [ocx:57,129] (CS-ERR-02);
- passthrough codes are not ocx's [ocx:58,131] (CS-ERR-03);
- retry only on 75 [ocx:130] (CS-ERR-10);
- a handshake on `contract` with equality per part [ocx:101,133] (`OcxContractException`);
- report-then-fail on 17 modes [ocx:60] (CS-ERR-09);
- the error document on stdout [EX §1] (`OcxCommandException` properties, all nullable except `ExitCode`, because pre-contract binaries print nothing);
- the unknown-exit row uses 200, because ocx uses 0, 1 and 64-82 and retired 83-87 forever [ocx:35-56] (CS-ERR-13);
- the `contract` props subset omits `ErrorKind` while the pinned binary predates the error document [BC §8] (CS-ERR-17).

**Do NOT copy from the Python SDK:**
- **26 exception classes** (one per exit code) [py:39,95]. In C# they become five leaves plus a property; the Python taxonomy is already stale against ocx main (17 members, 82 = `DIRTY_RC_BLOCK`) [ocx:31].
- **Smell S2:** mapping a hosted child's exit code [py:304]; see CS-ERR-03.
- **Smell S3:** builtins leaking past the root, 36 `ValueError` sites [py:305]. In C#, `JsonException` would leak the same way; see CS-ERR-04.
- **The floor at 0.6.2** [ocx:31]. Pre-contract binaries reuse 82, so the floor is the contract-bearing release.
- **No fake `ocx` binary in its tests** [py:182]. In C#, the fake-CLI harness is the main test seam for CS-API-02, CS-ERR-03, CS-ERR-05 and CS-ERR-08.
- **A per-call throw-or-return switch.** Python's `check`-style sentinels must not become a C# parameter; see CS-ERR-09.
- **Public constructibility of results.** Frozen dataclasses are constructible by default [RC §10]. A C# port that keeps the implicit public constructor cannot close it later without `CP0002` (CS-API-17).

## AI-agent failure modes

Ranked by how often each bites, judged from three things: how common it is in the corpus, how often the sub-artifacts saw agents do it, and how often an edit hits it. Rows 3, 8, 13-15, 23 and 24 are new this revision, and 18 is widened.

| # | What the agent does | Why it passes locally | Check that catches it |
|---|---|---|---|
| 1 | `public enum Status { Ok, Failed }` + `JsonStringEnumConverter` for every JSON string; `Enum.TryParse(..., ignoreCase: true)` | happy-path tests use known values | CS-API-07 grep; [json] `BannedSymbols.txt` |
| 2 | `public record Foo(string A, string B)` for every DTO and options type | compiles; `with` is convenient | CS-API-05 G1; CS-API-06 `PrintMembers` grep; `CP0002` at pack |
| 3 | Gives results a public constructor, or makes them records, "so tests can build them" (the Octokit/Anthropic/Stripe habit); mocks a sealed result with Moq | compiles; the SDK's own tests pass | CS-API-17 public-ctor grep; CS-API-05; `CP0002` if it is closed later |
| 4 | Adds an optional parameter, a `CancellationToken = default`, or a renamed parameter to a shipped method | source-compatible | `CP0002`/`CP0017` at pack (CS-API-09, CS-API-12); RS0026/RS0027 |
| 5 | Ports Python's 26 exception classes, unsealed, one per exit code | mirrors the reference | CS-ERR-01 G4; MA0053 |
| 6 | `JsonSerializer.Deserialize<T>(stdout, o)!` scattered per command; `JsonException` escapes | valid fixtures decode | CS-ERR-04 single-file grep; fake-CLI truncated/`null` tests |
| 7 | `catch (Exception e) { throw new OcxXException(e); }` around awaits; "fixes" CA1031 with `when (ex is not OperationCanceledException)` while still returning | CA1031-clean | CS-ERR-05 R8 grep; CS-ERR-06 R10 grep |
| 8 | Reads a green `dotnet pack` (package validation + RS0016/17) as "no breaking change" and ships a patch that changes the thrown type, nulls a property, or turns a failure into a result | both API gates are blind to behaviour: 5 of 5 planted breaks packed clean [BC row 2] | CS-ERR-12 table in the normal `dotnet test`; CS-ERR-15 baseline twin; CS-API-14 table-diff signal |
| 9 | `[Serializable]` + `SerializationInfo` constructor + `GetObjectData` on new exceptions (copied from MS CA1032 samples) | only a warning without TWAE | SYSLIB0051 under the gate; CS-ERR-07 grep |
| 10 | Maps every non-zero exit, including `exec` children, to a category | the fake child exits with ocx codes | CS-ERR-03 test and grep; row `passthrough-child-exit-is-data` |
| 11 | Hard-codes one exit enum from whatever branch it read; casts `(OcxExitCode)process.ExitCode`; maps `error.kind` → type; `stderr.Contains("not found")` | matches the current binary | CS-ERR-02 greps; conformance test; two-binary handshake test |
| 12 | Generates `IOcxClient` "for mocking", unsealed public classes, `{ get; set; }` options | the habit of generated SDKs (stripe 6,060 open vs 1 sealed) | CS-API-02 G2; MA0053; CA2227 |
| 13 | Hides the constructor as `internal T() { }` and forgets `[JsonConstructor]`; or follows .NET 11 docs / runtime#77016 folklore to a `private` constructor or a public one; or "fixes" `SYSLIB1222`/`SYSLIB1038` with `NoWarn`; or asserts the probe count equals the `[JsonSerializable]` count | zero diagnostics on net8/net10 until the first `Deserialize`; green on a net11 sandbox | CS-API-19 probe (`seen >=`); CS-API-17 attribute grep; CS-API-18 greps and TWAE |
| 14 | Goes red on a behaviour row, then edits its `expect`, raises `since`, deletes it or marks it `Skip` | the suite goes green | CS-ERR-16 `check-table-diff.sh`; `Mandatory_rows_are_present`; CS-ERR-12 `Skip` grep |
| 15 | Writes compat tests as `Assert.ThrowsAsync<OperationCanceledException>` (over-fails on `TaskCanceledException`), `ThrowsAnyAsync<Exception>` (passes on everything), `ex.Message ==`, or a Verify snapshot of the exception that it then re-accepts | the current binary and SDK satisfy it | CS-ERR-13 greps and jq |
| 16 | Runs `dotnet build` and calls the API gate green; copies `<ApiCompatVersion>`; sets RS0017 in `.editorconfig`; sets `require_api_files = true`; re-packs into a dirty `obj/` | every one of these exits 0 | CS-API-11 / CS-API-12 greps; pack in CI from a clean checkout |
| 17 | Hand-writes `PublicAPI.Unshipped.txt` lines, or satisfies RS0017 with `*REMOVED*`; regenerates `CompatibilitySuppressions.xml` with `-p:ApiCompatGenerateSuppressionFile=true` and commits it | analyzer or pack goes green | `dotnet format analyzers --verify-no-changes`; CS-API-14 `*REMOVED*` count and `check-exp-suppressions.sh`; CS-API-12 grep |
| 18 | Adds `required` to a shipped input type ("it should always be set"), then silences `CS9035`/`CS8618` with a public `[SetsRequiredMembers]` constructor and `= default!` | no gate sees it; the SDK's own tests set it; `a3-req` is clean everywhere and `null` at run time | CS-API-10 diff grep and `SetsRequiredMembers` grep |
| 19 | Puts argv, stderr tail or env into `Message`; stashes data in `Exception.Data` | "helpful diagnostics" | CS-ERR-08 canary test (also row `secret-canary-not-in-message`); CS-ERR-07 grep |
| 20 | Marks every type `[Experimental]` during 0.x, invents `[Preview]`, omits `DiagnosticId` on `[Obsolete]` | compiles | CS-API-13 greps |
| 21 | Writes `case Status.Ok:` on the struct, hits `CS9135`, "fixes" it by reverting to an enum | the compiler error steers it back | CS-API-07 grep catches the revert |
| 22 | Uses C# 15 `closed`/`union` because it compiled on an RC SDK | RC1 accepts it | `CS8652` on the pinned 10.0.401; CS-API-08 grep |
| 23 | Writes an Azure/OpenAI-style `ModelFactory` unprompted, later adds an all-optional overload | `c-ambig` packs clean; consumers get `CS0121` | CS-API-20 grep; consumer canary |
| 24 | Wires the baseline as `Version="*"`, a range, or a `ProjectReference` to the last tag; trusts a re-run after repacking the same version; reaches into internals from `Behavior/`; lets a colliding package id resolve from nuget.org (`PKV006`) | tests the source twice, or old cached bytes, and stays green | CS-ERR-15 msbuild equality and provenance test; CS-API-15 step 3 eviction; twin compile (`CS0122`); package source mapping |

## Failure classes

| Class | Mechanism | Members (row #) | The check that catches the class |
|---|---|---|---|
| **A. Closed-world assumption on an open contract** | the code treats a set the producer may extend as finite (enum values, union tags, exit numbers, kind↔code) | 1, 10, 11, 21 | open `IOpenEnum<T>` / `OcxExitCode` types + `Unknown` arms (CS-API-07/08); behaviour rows `cmd-unknown-code` (200), `decode-unknown-enum-value`, `decode-unknown-union-tag`; the conformance test against vendored schemas |
| **B. Source-compatible, consumer-breaking edits** | the library compiles and its own tests pass; the break is only visible from a compiled or source consumer | 2, 3, 4, 12 (sealing later), 18, 23 | package validation at pack with both rule flags (CS-API-12) + PublicApiAnalyzers (CS-API-11) + the `required`/`SetsRequiredMembers` greps (CS-API-10) + closed outputs (CS-API-17) + a consumer canary for any factory (CS-API-20). Several tools are needed because each misses a break the others catch (CS-API-12 Why; [SS §10]; [RC §4]) |
| **C. Gates that fail open** | a misconfigured gate exits 0 the same way a passing gate does | 16, 17, 24 | a planted-red canary in CI per gate: a project that must fail pack with `CP0002`, one that must fail build with `RS0017`, and a baseline twin with a provenance test; the property-name grep; `check-exp-suppressions.sh` |
| **D. Leaky failure boundary** | a framework exception or a cancellation crosses the SDK boundary in the wrong shape | 6, 7, 10 | one decode seam + one launch seam, filtered catches (CS-ERR-04/05/06); behaviour rows for truncated, timeout, cancel and child exit (CS-ERR-12) |
| **E. Information leaks through generated or default members** | compiler- or BCL-generated members print more than intended (`record.ToString`, `Exception.Message`, `Data`) | 2 (secret half), 19 | `PrintMembers` grep (CS-API-06); canary test (CS-ERR-08) |
| **F. Stale-training-data idioms** | advice that was right before .NET 8, is right only on .NET 11, or that MS sample pages still show | 9, 13 (runtime#77016, the .NET 11 private-ctor lift), plus Newtonsoft, `ApplicationException`, CA2229 | SYSLIB0051, SYSLIB1222, SYSLIB1038 and CA2201 errors under the gate; `grep -rnE --include='*.cs' --include='*.csproj' -e 'Newtonsoft' -e '\[Serializable\]' -e 'ApplicationException' src`; a build on the floor SDK |
| **G. Over-modelling** | more public types or attributes than the evidence supports, each one a permanent surface | 5, 12 (interface), 20, 22, 23 | type-count greps (CS-ERR-01, CS-API-02); 0.x Experimental ban (CS-API-13); no-factory grep (CS-API-20) |
| **H. Behaviour blind spot** (new) | the change alters what a caller observes (which `catch` fires, throw vs return, a value) while the API diff is empty or additive, so every API gate is green | 8, 14, 15 | one behaviour table run against source and the previous nupkg (CS-ERR-12/15); catch-semantics asserts (CS-ERR-13); the table-diff guard and its bump signal (CS-ERR-16, CS-API-14) |
| **I. Build-green, first-call-red metadata** (new) | the source generator or STJ accepts the declaration without a diagnostic and fails only when a type is first (de)serialized | 13, plus `[JsonRequired]` on get-only (`b2j`) and reflection `Deserialize<T>` under a reflection-disabled test project | the context probe (CS-API-19) over every generated `JsonTypeInfo`, nested ones included; CS-API-18 greps; `JsonDocument` for non-SDK test data (CS-ERR-12) |

## Open questions

**Owner decisions.**
1. **ocx floor.** The default here is the first ocx release carrying `contract`. The SDK then rejects every released binary (0.6.5 included) with `OcxContractException` until ocx cuts that release. The alternative is a degraded 0.6.5 mode with a second, frozen, hand-written table (82 = `DirtyRcBlock`) and no handshake. This is the topic map's owner decision 4; this group recommends the floor.
2. **Diagnostic ID prefix and package identity.** `OCX` for `[Experimental]`/`[Obsolete]` IDs (one registry) and `Ocx.Sdk` as package ID and namespace. These tie to nuget.org prefix reservation (topic map decision 5).
3. **netstandard2.0.** If the owner puts it in scope (topic map decision 1), `IOpenEnum<T>`'s `static abstract` member cannot compile there. The open-enum design would need a per-type converter instead, and CS-API-07 changes. That interaction did not exist in any sub-artifact.
4. **A sixth exception type** for binary download and checksum failures (`csharp-packaging-ocx-binary-acquisition`) needs the ADR CS-ERR-01 demands. Name candidate: `OcxAcquireException`.
5. **Consumers cannot construct results (CS-API-17).** Default: closed. Consumers fake at their own adapter or at the process boundary, which costs about 25 ms and a compiled helper per fake result [RC §8]. This is a one-way door only in the other direction: opening later is additive. Say yes, or name the consumer test that needs constructed results; that would trigger CS-API-20's factory or an `Ocx.Sdk.Testing` package.
6. **Cross-file edit to [xp] CS-TEST-01 and CS-TEST-06.** CS-TEST-01 says "exactly four projects", and CS-TEST-06's grep "hits 3 projects". From the second release, `tests/Ocx.Sdk.FakeCliTests.Baseline` exists as a build twin of the FakeCliTests tier (CS-ERR-15), so that grep hits 4. The csharp-crossplatform owner should reword CS-TEST-01 to "four tiers; FakeCliTests gains a `.Baseline` twin from the second release". Without that, an agent following CS-TEST-01 literally will delete the twin.

**Subareas that deserve another research round.**
- **`csharp-api-behavioral-compat-windows`.** Run the [BC] fixture on the Windows host (SDK 10.0.102 via `cmd.exe`). Does the `FakeAsOcx` copy to `ocx.exe` launch `Ocx.Fake.dll`? Does `launch-missing-binary` map `Win32Exception` to `Reason=NotFound`? Does a killed child's `-1` stay out of `OcxCommandException`? CS-ERR-14 depends on all three, and none was run off Linux.
- **`csharp-api-csharp15-unions`, after .NET 11 GA (Nov 2026).** Can a `closed` hierarchy with a registered `Unknown` arm replace the `internal`-constructor union pattern without breaking on new ocx tags? What does ApiCompat report for union case changes? This has not been run anywhere ([EG] Contested). Also re-check whether the .NET 11 generator's private-`[JsonConstructor]` support and its present-keys-only setters change CS-API-17/18 once the floor moves past net8.0 [RC Contested].

## Sub-artifacts

- [csharp-api/csharp-api-surface-shape.md](csharp-api/csharp-api-surface-shape.md): entry type, options and results, records' `ToString`/equality traps, open-set structs, sealing, `[Experimental]`, `required`/nullable gate matrix; 25 fixture checks.
- [csharp-api/csharp-api-evolution-gates.md](csharp-api/csharp-api-evolution-gates.md): PublicApiAnalyzers and package validation mechanics and traps, change rules, optional-parameter pattern, multi-TFM layout, SemVer mapping, release promotion script; 49 fixture checks.
- [csharp-api/csharp-api-exceptions-from-exit-codes.md](csharp-api/csharp-api-exceptions-from-exit-codes.md): hierarchy sizing, versioned exit table, error document as properties, exception-versus-result boundary, decode/timeout/serialization/CA rules, secrets; V1-V13.
- [csharp-api/csharp-api-result-construction.md](csharp-api/csharp-api-result-construction.md): who may construct results under source-generated STJ (net8/net10/net11 RC1), the silent missing-`[JsonConstructor]` failure, `required`/`[JsonRequired]`/`[SetsRequiredMembers]` evolution, ModelFactory protocol, exemplar split; 21 red/green pairs.
- [csharp-api/csharp-api-behavioral-compat.md](csharp-api/csharp-api-behavioral-compat.md): what package validation cannot see, SemVer weight per change kind, the behaviour table's shape and mandatory rows, baseline-nupkg run, snapshot control, table-diff guard; 18 red/green pairs.

## Key sources

1. https://learn.microsoft.com/en-us/dotnet/core/compatibility/library-change-rules: allowed and disallowed API and behavioural changes (parameters, sealing, interface members, thrown exceptions, return values, `union` cases).
2. https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/package-validation/overview: package validation runs after `Pack`; its validators; nothing about behaviour.
3. https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/diagnostic-ids: CPxxxx/PKVxxx IDs and the suppression file format.
4. https://learn.microsoft.com/en-us/dotnet/core/project-sdk/msbuild-props: exact package-validation property names and defaults.
5. https://raw.githubusercontent.com/dotnet/roslyn-analyzers/main/src/PublicApiAnalyzers/PublicApiAnalyzers.Help.md: PublicAPI files, `#nullable enable`, `require_api_files`.
6. https://raw.githubusercontent.com/dotnet/roslyn/main/docs/Adding%20Optional%20Parameters%20in%20Public%20API.md: the backcompat-overload pattern behind RS0026/RS0027.
7. https://learn.microsoft.com/en-us/dotnet/fundamentals/runtime-libraries/preview-apis: `[Experimental]` versus `[RequiresPreviewFeatures]`; one ID per feature.
8. https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/record: record `ToString`/`PrintMembers` modifiers, equality, positional members.
9. https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/required: `required` rules, `SetsRequiredMembers`, visibility, no positional `required`.
10. https://azure.github.io/azure-sdk/dotnet_introduction.html: Azure .NET guideline IDs (options, enums-as-structs, exceptions, mocking, model factories).
11. https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/immutability: source generation and non-public constructors/accessors per .NET version (read "inaccessible" as `private`/`protected`, [RC §2]).
12. https://raw.githubusercontent.com/dotnet/runtime/main/src/libraries/System.Text.Json/gen/JsonSourceGenerator.Parser.cs: `TryGetDeserializationConstructor`; why an unattributed `internal` constructor is silently ignored.
13. https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/exception-throwing: no throw-or-not options; contract exceptions stay stable.
14. https://learn.microsoft.com/en-us/dotnet/core/compatibility/categories: behavioural change as its own category ("a method may throw a different exception").
15. https://github.com/meziantou/Meziantou.Analyzer/blob/main/docs/Rules/MA0053.md: the only analyzer that seals public types; its options.

## Revision log

- **2026-10-11, revision round (result construction, behavioural compatibility):**
  - **Frontmatter:** `consolidates` gained [RC] and [BC]; added `revised: 2026-10-11`. The citation keys gained [RC], [BC], [xp], [jsonc], [snap] and [pkgc].
  - **Verdict 4 changed in place:** output types are SDK-only (`[JsonConstructor] internal T() { }`) and inputs stay consumer-constructible. Why: closing later is `CP0002`+`CS1729`, while opening later is additive ([RC] `a-close`, `b2-open`). This corrects the first consolidation's loss of [SS §2]'s "no public constructor".
  - **Verdict 7 and CS-API-10 changed in place:**
    - The freeze-at-first-release rule is scoped to consumer-constructible (input) types. Output types may gain `required` later through the wire-contract gate. Why: `b1rj-req` is clean for consumers.
    - CS-API-10's diff grep now excludes `src/Ocx.Sdk/Models/`.
    - Added the public-`[SetsRequiredMembers]` ban. Why: `a3-req` is silent `null`.
    - Stated the open-enum interplay with `required` (presence, not membership).
  - **CS-API-04 amended:** names inputs and outputs and points outputs to CS-API-17. Its meaning is unchanged.
  - **CS-API-14 changed in place:**
    - Behaviour-table signals added above the API rows, plus the pinned-outcome rule and reviewer heuristics. Why: `v3-major-leaf` is "added lines only" and still a major.
    - Rows reordered highest-bump-first.
  - **CS-API-15 changed in place:** step 3 evicts the cached baseline; step 4 bumps `OcxBaselineVersion`, deletes stale `supersedes` and adds the twin on the first bump. Why: [BC §7] stale-cache green-then-red.
  - **New rules:**
    - CS-API-17 (MUST, output-type shape), CS-API-18 (MUST, source-generation accessibility), CS-API-19 (MUST, context probe) and CS-API-20 (SHOULD, no ModelFactory), from [RC] #1-#12.
    - CS-ERR-12..16 (MUST) and CS-ERR-17 (SHOULD), from [BC] CS-BEH-01..13, merged from 17 candidates into 6.
  - **Corrected [RC #6]:** the probe asserts `seen >=` the `[JsonSerializable]` count, never equality. Why: [CN] `probe-nested-*` saw 4 properties for 1 attribute and caught a nested-type defect.
  - **Conflicts resolved:**
    - [BC]'s new BehaviorTests projects versus CS-TEST-01: the suite lives in FakeCliTests, with a `.Baseline` twin build ([CN] `twin-*`).
    - Contract rows run in ContractTests (CS-TEST-07).
    - The table loader uses `JsonDocument`, not reflection STJ (CS-JSON-03).
    - [EG #26]'s `ThrowsAsync<` verification is superseded by catch-semantics rows.
  - **[CN] `verify.sh`:** grew from 16 to 21 rows (`probe-nested-red/green`, `twin-internal-red`, `twin-friend-builds`, `twin-public-green`), `fails=0`.
  - **AI-agent failure modes:** rows 3, 8, 13-15, 23 and 24 added; row 18 widened; renumbered. Failure classes H (behaviour blind spot) and I (build-green, first-call-red metadata) added.
  - **Open questions:**
    - Removed the answered rounds `csharp-api-result-construction` and `csharp-api-behavioral-compat`.
    - Added owner decisions 5 (closed results) and 6 (CS-TEST-01 wording), and the round `csharp-api-behavioral-compat-windows`.
    - Documented gaps moved to the Verdict.
  - **Key sources:** added the STJ immutability page, `JsonSourceGenerator.Parser.cs` and compatibility categories. Dropped Azure's implementation page, SYSLIB0051 and Skeet; the sub-artifacts still cite them.
