---
# Read on demand through the index. This glob matches no file, so a client never auto-loads the file.
paths:
  - "**/.csharp-quality-depth-on-demand"
title: Public API Surface and Its Evolution
summary: The CS-API family, owning the public surface of a .NET library or CLI-wrapping SDK and how it changes after release, which is the sealed async-factory client, sealed options and closed result classes, open sets as record structs, the union pattern, additive-only evolution, both API gates, experimental markers, the SemVer table and the release order
---

# Public API Surface and Its Evolution

Binds to SDK 10.0.401 on Linux x64 (`net8.0` and `net10.0` legs), `Microsoft.CodeAnalysis.PublicApiAnalyzers` 5.6.0,
`Meziantou.Analyzer` 3.0.297 and System.Text.Json 10.0.12 on `net8.0` (measured 2026-10-11). Nothing here depends on
the operating system. A `net11.0` leg does not exist yet (`CS-LANG-16`), so every .NET 11 statement is read-only.

This file owns what a library exposes and how that surface changes after release: the entry type, the shape of
inputs, outputs and open sets, the gates that catch a break, `[Experimental]`, the version bump and the release
order. Not owned here: exception types and the behaviour table (`CS-ERR-01`, `CS-ERR-12`, `CS-ERR-15`, `CS-ERR-16`),
the JSON converter and schema diff (`CS-JSON-03`, `CS-JSON-08`, `CS-JSON-11`), pack properties (`CS-PKG`), analyzer
packs and severity lines (`CS-BUILD-15`), test tiers (`CS-TEST-01`) and the release procedure (`dotnet-release`).
**Client** means a library that wraps a CLI. Example names from the reference consumer, rename them: `Ocx.Sdk` (package,
namespace, `src/Ocx.Sdk`), `OcxClient`, `OcxClientOptions`, `OcxExitCode`, `OcxLaunchException`. The commands keep working on those names.

Contents: [Defaults](#defaults) · [Shape](#shape-of-the-public-surface) · [Evolution](#evolution-gates) ·
[Output Types](#output-types-under-source-generation) · [SemVer](#the-semver-table-and-release-order) ·
[Multi-line Checks](#multi-line-checks) · [Agent Mistakes](#what-agents-get-wrong-here)

## Defaults

Each is a default the adopter may override once, with the reason recorded.

- The reach is `net8.0;net10.0` with no `netstandard2.0` slice. That is what lets `IOpenEnum<T>` (`CS-API-07`) use a
  `static abstract` member; a `netstandard2.0` slice would need a per-type converter and rewrites `CS-API-07`.
- Dropping the `net8.0` leg after .NET 8 end of support (2026-11-10) is `PKV006` by design and a major (`CS-API-14`).
  The `dotnet-upgrade` skill runs it.
- Results are closed (`CS-API-17`) and no model factory ships (`CS-API-20`). `[Experimental]` starts at 1.0 (`CS-API-13`).
- Package ID, namespace and diagnostic prefix are the adopter's choice. Releases use Trusted Publishing and MinVer `v` tags.
- `[new-surface]` is a tag of this file, not of the index. It binds the options and result types added since the last release tag (all of them before the first release), and `OPTS` names their directories. A public type that already shipped keeps its shape (`CS-API-09`).

## Shape of the Public Surface

A command in a Verification cell prints violations, so empty output is a pass; a cell that says "exactly one path" is a
presence check, and an `N/A: <reason>` line means the row's tag does not apply here, so its cell reads nothing. Each was
watched red on a planted defect and green on its twin (measured 2026-10-11). The cells assume `SRC` is the production code of
a shipped library: a repo that ships no library has no public surface to scan, and a test or sample project under the root is
not one. Run block A0 ([Multi-line Checks](#multi-line-checks)) first in the same shell: it fails on an unset operand (`SRC`,
`TESTS`, `PRJ`, `BASE`) and prints `MISSING` for a directory, ref or merge base that does not exist (a missing operand makes
`rg` and `grep` print nothing, which reads as a pass; a shallow clone has no merge base), for an absolute operand and for a
scope that holds no `.cs` file. `SRC` and `TESTS` are space-separated lists of repo-relative directories, used unquoted: an
absolute path under a `tests/` ancestor matches the test exclusion and counts zero files. A0 defines the exclusions `x`, `xg`
and `xp`, the index glob keyed on test-project path segments, so a shipped `Foo.Testing` package or a `Latest/` directory
stays in scope. Keep the pattern and change the root.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CS-API-01 | Make the public entry type one `public sealed class` with a `private` constructor and one `public static` `CreateAsync(OcxClientOptions? options = null, CancellationToken cancellationToken = default)` returning `Task<OcxClient>`. Run all I/O (binary discovery, version handshake) only in that factory. Expose command families as sealed handle classes with `internal` constructors, reached through members of the client. A derived client (`WithOptions`) never re-discovers. | A constructor cannot be awaited and hides I/O failure. Pulumi has the shape (`pulumi__pulumi-dotnet@2a0dca84f09b:sdk/Pulumi.Automation/LocalWorkspace.cs:78-90`). | `grep -rnE --include='*.cs' "${xg[@]}" 'public\s+OcxClient\s*\(' $SRC` prints nothing. `grep -rlE --include='*.cs' "${xg[@]}" 'public\s+static\s+(async\s+)?Task.OcxClient.\s+CreateAsync\s*\(' $SRC` prints exactly one path. | MUST |
| CS-API-02 | [cli-wrapper] Declare no public interface or public abstract class that mirrors the client or a handle (`I*Client`, `I*Commands`, `I*Runner`, and the same role under `Service`, `Manager`, `Executor`, `Invoker`, `Wrapper` or `Tool`). Test against a fake CLI executable the options point to (`CS-TEST-01`). If a seam is demanded later, add a `public abstract class` with a `protected` constructor in a minor release, never an interface. Extension point: a public interface that consumers implement as the library's purpose (a handler, provider or plugin contract, a test-double seam) is sanctioned when its XML doc names that contract and every later addition is a default interface member; the suffix list targets the wrapped-tool client and is no ban on interfaces. | A member added to a published interface breaks every implementer (`CP0006`); an abstract class added later is additive and one removed never is. CliWrap and SimpleExec test against dummy executables. | Block `CS-API-02` prints nothing; it lists a public interface by those nine suffixes (an `IProcessService` or `IGitService` seam is a hit; an `internal` one is silent). On a library that wraps no CLI it is a reading aid: read each hit against the extension-point sanction. Pack exits 1 `CP0006` on a member added to a shipped interface and `CP0005` on an abstract member added to a shipped abstract class (measured 2026-10-11). | MUST |
| CS-API-03 | [packable-library] Seal every public non-abstract class, record class and exception. A public type left unsealed is `abstract` with an `internal` constructor, or carries `[SuppressMessage("Design", "MA0053", Justification = "extension point: ...")]`; an exception base or handler base that consumers are meant to subclass is the case for that justification (`CS-ERR-07` states the exception shape). Legacy baseline form: a library that shipped unsealed public classes before this rule keeps them through one exclusion file `LEG` (example `src/.editorconfig`, a non-root `.editorconfig` beside the sources) that holds one `# legacy-unsealed: <reason>` line and one `[<path>]` section per `.cs` file present in the baseline tag, each setting only `dotnet_diagnostic.MA0053.severity = none`. MA0053 then gates every type in a file added since that tag; a type added inside a listed file stays unflagged, so read the diff. Never seal a type that shipped unsealed. | Sealing later is `CP0009`; unsealing later packs clean. CA1852 covers internal types only, and a `public class` with CA1852 at `error` builds clean. | `dotnet build` exits 1 `error MA0053` on an unsealed public class or exception and ignores the `abstract` root; `MeziantouAnalysisMode` `None` leaves every other Meziantou rule silent. MA0053 at `error` with its `public_class_should_be_sealed` and `exceptions_should_be_sealed` options lives in `analyzers.globalconfig` (`CS-BUILD-15`). `dotnet pack` exits 1 `CP0009` on a late seal. Watched on `net8.0` and `net10.0`. Block `CS-API-03` checks `LEG` and prints nothing: one reason line, no other setting, no section for a file absent from the tag. Watched on `net8.0` (measured 2026-10-11): a listed file builds and a new unlisted file exits 1 `MA0053`; a `.globalconfig` section cannot do this because it takes absolute paths only. | MUST |
| CS-API-04 | [new-surface] Make public options (inputs) and results (outputs) `sealed class`es with get-only or `init` members, `required` on mandatory ones. `CS-API-10` governs inputs after release; `CS-API-17` governs outputs. Collections are `IReadOnlyList<T>` or `IReadOnlyDictionary<K,V>`. Declare no `{ get; set; }` (explicit `get { }` and `set { }` bodies included), array or `List<T>` in a public member, and no `record` with a collection member. Sanctioned, read each hit against them: a settable property on a configuration type that `IConfiguration` or the options binder fills (the binder needs the public setter); a property of a node in a tree that a parser or builder mutates by contract (an AST node); an attribute's named argument, written `init`. | Mutable shared state and aliasing (CA2227, CA1819, CA1002). A record's `==` compares collection members by reference, so two equal-looking records are `!=`. | CA1002, CA1819, CA2227 and CA1051 at error under `AnalysisLevel` `10.0-all` with warnings as errors (`CS-BUILD-13`) are the gate: they read effective visibility. Block `CS-API-04` is the backstop, scans `OPTS` only (unset: `N/A`) and prints nothing on new surface: the `{ get; set; }` scan and the accessor-body scan read only files that declare a literal `public` type or an `#if ... public` define (a member of an `internal` type in such a file is a hit to read; CA2227 does not fire there), and the collection scan matches public record declarations only (a `record` in a comment, an internal record or a local variable is silent). | MUST |
| CS-API-05 | [new-surface] [packable-library] Declare no public positional `record`, `record class` or `record struct`. The exceptions are a single-parameter wrapper named `Value` (`readonly record struct X(string Value)` or `(int Value)`, `CS-API-07`) and a documented closed value-pair key: a `readonly record struct` of at most two fields whose XML doc says it is a key. | A new positional parameter removes the old constructor and `Deconstruct` (`CP0002` twice); a new `init` property packs clean. `required` cannot sit on positional parameters. | Scan: block `CS-API-05` (it takes `partial` and `readonly` in any order, scans `OPTS` only and is silent on a `readonly record struct` of at most two parameters, whose doc you read); prints nothing. `dotnet pack` exits 1 `CP0002` as the backstop. | MUST |
| CS-API-06 | Give a type with a `string`, `byte[]`, `char[]` or `SecureString` member named like a secret (`Password`, `Passphrase`, `Pwd`, `Secret`, `Token`, `ApiKey`, `AccessKey`, `PrivateKey`, `Credential`, `ConnectionString`, or exactly `Pat`) class semantics, or make it a `sealed record` that declares `private bool PrintMembers(StringBuilder)` redacting it. | The generated record `ToString` prints every public member: `$"{opts}"` printed `Password = hunter2-SECRET`. | Block `CS-API-06` prints nothing. It is anchored to public records and to the member name, not its type, so `GitHubToken Value`, `CancellationToken`, `SyntaxToken Token`, any member whose type is not string-like or a secret buffer, an interface-typed member and internal records are silent; its positional half is the scan `CS-PROC-08` owns as block P2. | MUST |
| CS-API-07 | Declare every wire value from an open set as `readonly record struct X(string Value) : IOpenEnum<X>` (`status`, `kind`, `error.kind` and any value the tool's schema marks open; the converter is `CS-JSON`). Give it static well-known instances, `IsKnown`, a `ToString()` returning `Value ?? ""` and no implicit conversion from `string`. Integer sets (process exit status) are `readonly record struct OcxExitCode(int Value)`. Use a C# `enum` only for sets the SDK produces or sends (argv choices, `OcxLaunchException.Reason`), always with a zero member. Compare structs with `==`, never `case X.Known:`. Let no `JsonStringEnumConverter`, `Enum.Parse` or `Enum.TryParse` touch wire data. | A closed enum throws on a new value, reads a mismatched key as the zero member (`{"status":"failed"}` becomes `Ok`) and accepts `(Status)42`. An implicit `string` conversion makes `status != "faild"` compile and always be true. `case` on a struct is `CS9135`. | Block `CS-API-07` prints nothing: `JsonStringEnumConverter` anywhere, `Enum.Parse` or `Enum.TryParse` in a file that touches JSON, an implicit `string` conversion in a `record struct` file, and culture-sensitive comparison in an open-enum file. | MUST |
| CS-API-08 | Declare a tagged wire union as a `public abstract class` with an `internal` parameterless constructor, sealed case classes and a sealed `Unknown` case that keeps the raw tag and payload. Use no `[JsonPolymorphic]`, no public interface and no C# 15 `union` or `closed`. | An `internal` constructor closes the hierarchy on C# 14 (a consumer subclass is `CS1729`). `[JsonPolymorphic]` merges unknown, missing and wrong-case tags. `closed` is `CS8652` on SDK 10.0.401. Adding a `union` case is a DISALLOWED change, so each new wire tag would break consumers. | `grep -rnE --include='*.cs' "${xg[@]}" -e '^\s*public\s+closed\b' -e '^\s*public\s+union\b' -e 'JsonPolymorphic' $SRC` prints nothing. Closed-hierarchy scan: block `CS-API-08`; prints nothing. It reads union roots only; an extension-point abstract class with a `protected` constructor (`CS-API-02`) is not one. | MUST |

## Evolution Gates

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CS-API-09 | After a version ships, change the surface by addition only: new data is a new optional `init` property, new input is a new property on the per-command options class. Never add a parameter (optional ones included), change a default, rename a parameter, seal a type, add an abstract or interface member, or drop a TFM on a shipped member. To extend a method keep the old overload and add one overload with the most parameters and the optional ones; older overloads take mandatory parameters only. Add a `CancellationToken` as a new overload. | An optional parameter is source-compatible and binary-breaking, because defaults are baked into callers. | `dotnet pack -c Release` with a baseline exits 1: `CP0002` (parameter or overload), `CP0005` (abstract member), `CP0006` (interface member), `CP0009` (seal), `CP0017` (rename, flags on), `PKV006` (dropped TFM). `RS0026` and `RS0027` exit 1 at build. Green twins: the added overload, the canonical optional pattern. Watched on `net8.0` and `net10.0`. | MUST |
| CS-API-10 | On a type consumers can construct (an input type or any type with a public constructor), decide `required` when the type first ships and never add it after, on an existing or a new member. A wire key that becomes mandatory later is a non-`required` `init` property with `[JsonRequired]` and a default. Never put `[SetsRequiredMembers]` on a public constructor. Output types with an `internal` constructor (`CS-API-17`) are exempt: `required` there is a wire-contract change. | No gate sees a `required` addition, yet every consumer `new T { ... }` breaks with `CS9035`. A public `[SetsRequiredMembers]` constructor turns a later `required` into a silent `null`. `[JsonRequired]` keeps "missing key is an error" without the source break. | Diff scan and constructor scan: block `CS-API-10`; both print nothing. Compile: a new `required` member makes `new Options { }` exit 1 `CS9035`; the optional `init` twin exits 0. | MUST |
| CS-API-11 | [packable-library] Gate the public surface with a committed baseline per shipped surface (per TFM wherever the surface differs), a build that fails on any drift (an undeclared or a removed member) and a release step that records the new surface. The default form: reference `Microsoft.CodeAnalysis.PublicApiAnalyzers` 5.6.0 in every packable library and commit `PublicAPI.Shipped.txt` and `PublicAPI.Unshipped.txt`. Seed both with `#nullable enable`, generate the first set with `dotnet format analyzers`, and add later entries by pasting the symbol text of the `RS0016` message into Unshipped; never compose an entry by hand. Make `RS0016`, `RS0017`, `RS0026`, `RS0027`, `RS0036` and `RS0037` errors in the repo-root `.globalconfig` (`analyzers.globalconfig`), or through `TreatWarningsAsErrors` `true` or a `WarningsAsErrors` list that holds the six IDs (read with `-getProperty`); never in `.editorconfig`, and never set `dotnet_public_api_analyzer.require_api_files`. Under several TFMs use one shared pair plus `PublicAPI/<tfm>` delta directories, created only for TFMs whose surface differs. `*REMOVED*` lines are breaking-change markers (`CS-API-14`). Another analyzer with the three properties satisfies the row (PublicApiSharp keeps one `PublicAPI/<tfm>/PublicAPI.txt` per TFM and no promotion step); the `RS` lines, the `Shipped`/`Unshipped` files and `*REMOVED*` belong to the default form. | `RS0017` reports on the text file and ignores `.editorconfig`: without warnings as errors it stays a warning and the build exits 0. `require_api_files` turns missing files into a silent pass. A single pair under `net8.0;net10.0` raises `RS0017` on the leg that lacks an `#if` API. Records and C# 14 extension blocks emit 12 or more entries each (as of 2026-10). | Severity loop and file scans: block `CS-API-11` (the severity loop accepts the `.globalconfig` line, `TreatWarningsAsErrors` or `WarningsAsErrors`; it and the nullable-header scan run only where the default analyzer is referenced; any baseline file `PublicAPI*.txt` counts as present). First generation: `dotnet format analyzers src/Ocx.Sdk/Ocx.Sdk.csproj --diagnostics RS0016 RS0036 --severity info`; the same command with `--verify-no-changes` exits 2 while both files hold only the header and 0 after. The tool writes only into empty files and `--verify-no-changes` exits 0 on a later undeclared member, so the build is the gate. Build exits 1 `RS0016`, `RS0017`, `RS0036` or `RS0037` on the matching plant; the shared pair under two TFMs exits 1 `RS0017` and the delta layout exits 0. | MUST |
| CS-API-12 | Run package validation at `dotnet pack`: `EnablePackageValidation` and `PackageValidationBaselineVersion` as `CS-PKG-09` sets them (the last published version from the second release on, 0.y.z included), and `ApiCompatEnableRuleAttributesMustMatch` and `ApiCompatEnableRuleCannotChangeParameterName` `true`. Never commit `ApiCompatGenerateSuppressionFile` or `GenerateCompatibilitySuppressionFile`, and never use `ApiCompatVersion`, `EnableApiCompat` or `PackageValidationBaseline`: none is an SDK property. The pack properties are `CS-PKG`. | Default rules miss a nullability change (`CP0014` needs the attribute flag) and a parameter rename (`CP0017` needs its flag). `ApiCompatVersion`, copied from Azure csproj files, disables the check and pack exits 0. Validation runs after `Pack` only. | `dotnet msbuild "$PRJ" -getProperty:EnablePackageValidation -getProperty:PackageValidationBaselineVersion -getProperty:ApiCompatEnableRuleAttributesMustMatch -getProperty:ApiCompatEnableRuleCannotChangeParameterName` prints one JSON object with four properties (`true`, the baseline version, `true`, `true`; an empty value means unset). `grep -rnE --include='*.csproj' --include='*.props' --include='*.targets' --include='*.yml' -e 'ApiCompatVersion' -e 'EnableApiCompat\b' -e 'PackageValidationBaseline\b' -e 'ApiCompatGenerateSuppressionFile' -e 'GenerateCompatibilitySuppressionFile' .` prints nothing. Flags on exit 1 `CP0014` and `CP0017`; flags off exit 0. | MUST |
| CS-API-13 | [greenfield] From SDK 1.0 mark each contract part the wrapped tool has not frozen with `[Experimental("ACME0001", UrlFormat = "https://example.test/diagnostics/{0}")]` on its public types and entry methods, one ID per independently graduating report family. Deprecate with `[Obsolete("what to use", DiagnosticId = "ACME0002", UrlFormat = ...)]`. Both draw IDs from one registry file (`docs/diagnostics.md`) and an ID is never reused. Use no `[RequiresPreviewFeatures]`, no custom `[Beta]` or `[Preview]` and no plain `[Obsolete("...")]`. While the version is 0.y.z use no `[Experimental]`. Below net8.0 (`ExperimentalAttribute`) and net5.0 (`DiagnosticId`, `UrlFormat`; CS0246 on netstandard2.x) keep the ID visible another way: declare an `internal` `System.Diagnostics.CodeAnalysis.ExperimentalAttribute` with `DiagnosticId` and `UrlFormat` under `#if !NET8_0_OR_GREATER` (a consumer still gets the error), and write `[Obsolete("what to use (ACME0002)")]` in an `#else` of `#if NET5_0_OR_GREATER` beside the full form. | Only `[Experimental]` gives consumers a per-feature opt-in error: `error ACME0001 ... Suppress this diagnostic to proceed`. Plain `[Obsolete]` is `CS0618` and cannot be suppressed per API. Marking everything during 0.x trains a blanket `NoWarn`. | ID-less and URL-less forms, duplicate IDs and unregistered IDs: block `CS-API-13`; prints nothing (commented-out lines are skipped) and prints `N/A: lowest TFM below net8.0` where the tag does not apply. It reads every `Obsolete` spelling, namely `System.Obsolete`, an attribute list, `("msg", true)`, `error: true` and a wrapped attribute; a hit is an `Obsolete` whose attribute carries no `DiagnosticId` and no `(ACME0002)` ID in its message (the legacy form). While 0.y.z, `grep -rln --include='*.cs' "${xg[@]}" 'Experimental *(' $SRC` prints nothing. A consumer of an experimental type exits 1 with the experimental ID as the error, and exits 0 under a `#pragma warning disable` for that ID, on `net8.0` and `net10.0`. | MUST from 1.0 |
| CS-API-14 | Derive the version bump from mechanical signals, behaviour signals first; the highest matching row wins (table below). A change is a major if, for some input, a pinned outcome changes: which `catch` fires, throw versus return, a pinned property value. New members, new rows for uncovered paths, `Message` text and timing are minor or patch. Reviewer heuristics for what no row pins: shortening a default (`Timeout`) is a major, widening retry to more codes or to mutating commands is a major, lengthening a default is a minor, naming an exit code is a minor unless an existing code changes name or meaning. | Neither API gate computes a version. Package validation flags a change inside an `[Experimental]` type like any other, so without the exemption every experimental change reads as a major. A new leaf exception thrown for an existing exit packs as "added lines only" and breaks a pinned `catch`. | Block `CS-API-14`: the first command prints the simple type name of each suppression not on an `[Experimental]` type (empty output is a pass; red on a suppressed stable type, green on a suppressed experimental one). The other two print the count of added `*REMOVED*` lines and of added `supersedes` lines since the last tag (0 on a clean diff; a deleted block is not counted). | MUST |
| CS-API-15 | Release in this order. (1) Choose the version (`CS-API-14`). (2) In the release commit promote Unshipped into Shipped, leaving only `#nullable enable` in Unshipped, and delete accepted `IsBaselineSuppression=true` entries. (3) Pack from a clean checkout and publish only if pack exited 0; before trusting a local baseline, drop only the baseline package's own folder (`G=$(dotnet nuget locals global-packages -l); rm -rf "${G#*: }/$BID/$BV"`, `BID` the lowercase package ID and `BV` the baseline version), or restore the baseline into a scratch `--packages` folder in a disposable worktree. Never clear the global packages folder: it empties the machine-wide cache and the next `--no-restore` build exits 1 (`CS0006` or `NETSDK1064`). (4) In a separate commit after the package is on the feed, bump the single baseline-version property that feeds both `PackageValidationBaselineVersion` and the behaviour twin (`CS-ERR-15`), delete every `supersedes` block whose `before` is at or below it (`CS-ERR-16`) and, on the first bump, add the `.Baseline` twin project. `PublicAPI.Shipped.txt` changes only in release commits. | The nupkg is written even when validation fails. A stale suppression fails the next pack ("Unnecessary suppressions found"). A baseline bumped too early is `NU1102`. Validation is incremental, so a dirty `obj/` skips it. A repacked version stays in the global packages folder, so a baseline run stays green on old bytes. | `git diff --name-only "$BASE"...HEAD -- '*PublicAPI.Shipped.txt'` prints nothing off a release branch. On the tag, `grep -rhvE -e '#nullable enable' -e '^[[:space:]]*$' --include='PublicAPI.Unshipped.txt' $SRC` prints nothing. `rg -n -e 'nuget\s+locals\s+\S+\s+--clear' -e 'nuget\s+locals\s+\S+\s+-c\b' -g '*.sh' -g '*.yml' -g '*.yaml' -g '*.ps1' -g '*.cake' .` prints nothing (read a hit that runs after `NUGET_PACKAGES` names a scratch folder). Watched (measured 2026-10-11): on a scratch cache, restore, then `--clear`, then `build --no-restore` exits 1 (`NETSDK1064` on SDK 10.0.401, `CS0006` in the round-3 run); the single-folder removal leaves every other package. | SHOULD |
| CS-API-16 | [library] Reference no `Microsoft.Extensions.DependencyInjection*` from the core package. Ship any `AddOcx(this IServiceCollection, Action<OcxClientOptions>)` in a separate package under its own namespace, never `namespace Microsoft.Extensions.DependencyInjection`, and ship none until a consumer asks. | As of 2026-10, 0 of 8 SDK exemplar cores depend on DI; Microsoft reserves that namespace; the async factory makes registration awkward. | `rg -n -U -g '*.csproj' -g '*.props' -g '*.targets' 'PackageReference\b[^>]*Include="Microsoft\.Extensions\.DependencyInjection' "$PRJ"` and `rg -n -g '*.cs' "${x[@]}" -e '^\s*(?:global\s+)?using\s+(?:static\s+)?Microsoft\.Extensions\.DependencyInjection\b' -e '^\s*namespace\s+Microsoft\.Extensions\.DependencyInjection\b' "$PRJ"` print nothing (a comment or string that names the namespace is silent). | SHOULD |

## Output Types Under Source Generation

Every public data type is an input, which the caller builds, or an output, which the SDK returns. No type is both.
Outputs live in `src/Ocx.Sdk/Models/` and inputs never do. Open enums (`CS-API-07`), converters and union bases (`CS-API-08`) may sit there too; scan 1 of `CS-API-17` reads only files that declare a `public sealed class`.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CS-API-17 | Declare each output type `public sealed class` with `[JsonConstructor] internal T() { }`; the attribute is mandatory. Every schema-required key is `public required X Name { get; init; }`, including a key that becomes required in a later release; every optional key is a nullable `init` property. Give an output no public constructor, no parameterized `[JsonConstructor]`, no non-public setter and no `IEquatable<T>`, `Equals`, `GetHashCode` or `ToString` override. A result is never a public method parameter: take its identifying strings or an input type. The SDK's tests build results only through `InternalsVisibleTo`, which names the `CS-TEST-01` test assemblies (the `IVT_OK` regex) and never the `.Baseline` twin. Compare results with `Assert.Equivalent(expected, actual, strict: true)`. A `required` added under `Models/` also changes the vendored `reports.json` golden (`CS-JSON-11`). | Closing a shipped open type is `CP0002` plus consumer `CS1729`; opening a closed one later packs clean. With an `internal` constructor `required` is an SDK-side net (`CS9035` at SDK sites), not a consumer break. A parameterized constructor makes every parameter without a default a mandatory wire key and breaks `[JsonRequired]`. Without records `Equals` is reference equality and `Assert.Equal` fails on equal results. An extra friend assembly is hidden public API. | Six scans in block `CS-API-17` print nothing (the friend-assembly scan reads the signed `, PublicKey=` form too); the seventh is a reading heuristic. Closed type: a consumer `new T { Name = ... }` exits 1 `CS1729`; adding `internal T() { }` to a shipped open type exits 1 `CP0002` at pack. `Assert.Equal` fails and `Assert.Equivalent(strict)` passes on equal results (xunit.v3.assert 4.0.2). | MUST |
| CS-API-18 | Use no `private` or `protected` constructor under `[JsonConstructor]`, no `private` or `protected` accessor under `[JsonInclude]`, and no `[JsonRequired]` on a get-only property. Suppress `SYSLIB1222` and `SYSLIB1038` nowhere, by `NoWarn`, `#pragma` or `.editorconfig`. | The `net8.0` (System.Text.Json 10.0.12) and `net10.0` generators reject non-`internal` hidden members: `SYSLIB1222` or `SYSLIB1038`, an error under warnings as errors and a runtime throw if suppressed. .NET 11 RC1 accepted them as of 2026-10, and dotnet/runtime#77016 says the opposite about `internal`, so agents copy both wrong; neither is usable while `net8.0` is the floor. `[JsonRequired]` on a get-only property throws `InvalidOperationException ... does not specify a setter` at first use. | Three scans: block `CS-API-18`; each prints nothing (a `dotnet_diagnostic.SYSLIB1038.severity = error` line raises the ID and is no suppression). Build exits 1 `SYSLIB1222` on a `private` `[JsonConstructor]` and `SYSLIB1038` on a `private` `[JsonInclude]` accessor on both TFMs; the `internal` twin exits 0. | MUST |
| CS-API-19 | Add a UnitTests probe that walks every public `JsonTypeInfo` property of the generated context and runs `JsonSerializer.Deserialize("{}", info)` on each. A result or a `JsonException` passes. Any other exception fails and names the type: `NotSupportedException` means no usable constructor, `InvalidOperationException` means bad metadata. Assert it saw at least as many types as there are `[JsonSerializable]` attributes, never exactly as many. | An `internal` constructor without `[JsonConstructor]` builds with zero diagnostics and throws on the first `Deserialize`. A root round-trip (`CS-JSON-03`) misses a nested type the fixture never instantiates. The context exposes transitive types: 4 properties for 1 attribute (as of 2026-10). | Probe body: block `CS-API-19`, run in the `CS-TEST-06` test run. `rg -n -e 'GetProperties' -e 'JsonTypeInfo' "$UT"` prints the probe (empty output means the probe is missing). Exit 1 `NotSupportedException` with a nested `internal Item()` lacking the attribute; exit 0 on the twin. | MUST |
| CS-API-20 | Ship no `OcxModelFactory`, builder or other public way to create output types until a consumer records a test they cannot write. If one ships: name it `<Package>ModelFactory`, default every parameter of every method, hide a superseded overload with `[EditorBrowsable(EditorBrowsableState.Never)]` and no defaults when adding the next, and add a consumer-compile canary project that calls every method with its previous argument list. | The client has no mockable seam, so no factory is needed. A factory doubles the surface per result type. Overload ambiguity is invisible to package validation: pack clean, consumer `CS0121`. Adding one later is additive. | Block `CS-API-20` prints nothing before the recorded decision: it lists a `public` class named `*ModelFactory`, a public static method that returns an output type and a method of a public `*Builder` class that returns one, so an `internal` builder is silent. After it, `dotnet build tests/Ocx.Sdk.ConsumerCanary -c Release` exits 0 in CI. | SHOULD |

## The SemVer Table and Release Order

The release order is `CS-API-15`; the bump comes from this table (`CS-API-14`). Behaviour signals come first and the
highest bump among the matching rows wins. The behaviour table is the one `CS-ERR-12` pins.

| Signal | Bump at 1.0 or later | Bump at 0.y.z |
|---|---|---|
| In the behaviour table: a `supersedes` block added, an existing row deleted, or an existing row's `expect`, `argv`, `setup`, `op`, `os` or `since` edited | major | minor |
| A `*REMOVED*` line, `PKV006`, or a `CompatibilitySuppressions.xml` entry on a type not marked `[Experimental]` | major | minor |
| Added `PublicAPI.Unshipped.txt` lines only, or only new table rows whose `since` is the version being released | minor | minor |
| Suppressions only on `[Experimental]` types | minor | minor |
| No added `PublicAPI.Unshipped.txt` lines and no table change | patch | patch |

## Multi-line Checks

Each command prints violations, so empty output is a pass. `xargs` exits 123 when its last `grep` finds nothing or
`grep -L` lists a file; read the output, not the status. `rg` is ripgrep. Block A0 names the operands: a missing one
makes `rg` and `grep` print nothing, which reads as a pass, so A0 prints `MISSING` first. Every scan carries the test
exclusion `x` (`xg` for `grep`) because a literal `public` is not effective visibility and `src` is not always test-free;
CA1002, CA1051, CA1819 and CA2227 (effective visibility, at `error`) are the gate wherever one names the same member.

`A0`, run first, in the same shell as the block you run next (the cells above cite it; any output is a failed check):

```bash
# A0 (every block below): run first, in the same shell; any output is a failed check, except an `N/A:` line (the row's tag does not apply here)
: "${SRC:?MISSING SRC}" "${TESTS:?MISSING TESTS}" "${PRJ:?MISSING PRJ}" "${BASE:?MISSING BASE}"   # index Conventions: SRC and TESTS are space-separated repo-relative directory lists (used unquoted), PRJ the shipped library's project directory (SRC/Ocx.Sdk), BASE the merge target
for v in SRC TESTS; do for p in ${!v}; do case $p in /*) echo "MISSING repo-relative $v";; esac; done; done   # an absolute path under a tests/ ancestor matches the exclusion below and counts zero files
M=$PRJ/Models; UT=${TESTS%% *}/Ocx.Sdk.UnitTests            # outputs directory and unit-test project (example names: rename them)
for p in $SRC "$PRJ"; do test -d "$p" || echo "MISSING $p"; done
x=(-g '!**/{test,Test,tests,Tests,*.Test,*Tests,*TestFixtures,*TestServices}/**' -g '!**/obj/**' -g '!**/bin/**')   # rg, after -g '*.cs': test-project path segments and build output are not library code
xg=(--exclude-dir={test,Test,tests,Tests,'*.Test','*Tests','*TestFixtures','*TestServices'} --exclude-dir=obj --exclude-dir=bin)   # the same for grep
xp=(); for s in test Test tests Tests '*.Test' '*Tests' '*TestFixtures' '*TestServices'; do xp+=(":(exclude,glob)**/$s/**"); done   # the same for a git pathspec
rg --files -g '*.cs' "${x[@]}" $SRC | head -1 | grep -q . || echo "MISSING scanned zero files"
git rev-parse --verify -q "$BASE" >/dev/null || echo "MISSING $BASE"
git merge-base "$BASE" HEAD >/dev/null 2>&1 || echo "MISSING merge-base $BASE (fetch-depth: 0)"   # a shallow clone: the diff cells would print nothing
rg -q -g '*.csproj' -e 'OutputType>\s*(Win)?Exe' "$PRJ" && echo "N/A: $PRJ builds an executable; these rows guard a library's public surface"
test -d "$M" || echo "N/A: no $M, so CS-API-17, CS-API-19 and CS-API-20 read no output type (rename M)"
test -d "$UT" || echo "N/A: no $UT, so the CS-API-19 probe has no home (rename UT)"
tfm=$(dotnet msbuild "$PRJ" -getProperty:TargetFrameworks -getProperty:TargetFramework | jq -r '.Properties | [.TargetFrameworks, .TargetFramework] | join(";")'); [ -n "${tfm//;/}" ] || echo "MISSING TFM ($PRJ does not evaluate)"
gf=1; for t in ${tfm//;/ }; do [[ $t =~ ^net(8|9|[1-9][0-9])\.[0-9] ]] || gf=0; done   # gf=1: every shipped TFM is net8.0 or newer ([greenfield])
```

`CS-API-02`, a public interface that mirrors the client or a handle, by suffix (`Client`, `Commands`, `Runner`, `Service`, `Manager`, `Executor`, `Invoker`, `Wrapper`, `Tool`):

```bash
rg -n -P -g '*.cs' "${x[@]}" 'public\s+(?:partial\s+)?interface\s+I\w*(?:Client|Commands|Runner|Service|Manager|Executor|Invoker|Wrapper|Tool)\b' $SRC
```

`CS-API-03`, the legacy exclusion file `LEG` (the one `.editorconfig` that lists the files shipped unsealed; `TAG` is the baseline release tag):

```bash
TAG=$(git describe --tags --abbrev=0) || echo "MISSING tag"
if [ -z "${LEG:-}" ]; then echo "N/A: LEG unset, no legacy unsealed baseline"
elif [ ! -f "$LEG" ]; then echo "MISSING $LEG"
else
  [ "$(grep -c '^# legacy-unsealed: ' "$LEG")" = 1 ] || echo "$LEG: needs exactly one legacy-unsealed reason line"
  grep -vE '^(#|$|\[.*\]$|dotnet_diagnostic\.MA0053\.severity *= *none$)' "$LEG"   # nothing else lives in this file, root = true included
  sed -n 's/^\[\(.*\)\]$/\1/p' "$LEG" | while read -r f; do git cat-file -e "$TAG:$(dirname "$LEG")/$f" 2>/dev/null || echo "$f: not in $TAG, seal the type instead"; done
fi
```

`CS-API-04`, a `{ get; set; }` member in a public type of `OPTS` (files with a literal `public` type, or an `#if ... public` define such as `#if SCRIBAN_PUBLIC`), then an accessor-body setter, then a public record that holds a collection member (the declaration parameters, or a public member of the body; `-l` prints the file; the record scan reads literal `public` records only). Read each hit against the sanctioned forms of the row:

```bash
if [ -z "${OPTS:-}" ]; then echo "N/A: OPTS unset: CS-API-04 and CS-API-05 bind new options and result types ([new-surface])"; else
  pubf() { rg -l0 -P -g '*.cs' "${x[@]}" -e '^\s*public\s+(?:(?:sealed|abstract|static|partial|readonly)\s+)*(?:class|struct|record|interface)\b' -e '^\s*#if\b.*(?i:public)' $OPTS; }   # files with a literal public type or an #if ... public define
  pubf | xargs -0 -r rg -n -P 'public\s[^=(]*\{\s*get;\s*set;\s*\}'
  pubf | xargs -0 -r rg -U -n -P 'public\s[^=;(){}]*\{\s*get\s*(?:;|\{[^{}]*\}|=>[^;]*;)\s*set\s*(?:\{|=>)'   # an accessor-body setter: get { ... } set { ... }, get => x; set => y;
  R='public\s+(?:(?:sealed|abstract|partial|readonly)\s+)*record\b'
  C='\b(?:List|Dictionary|IList|IReadOnlyList|IReadOnlyDictionary|ImmutableArray|ImmutableList|IEnumerable|HashSet)<|\w\[\]'
  rg -l -U -P -g '*.cs' "${x[@]}" -e "(?m)^[ \t]*$R(?:\s+class|\s+struct)?\s+\w+(?:<[^>]*>)?\s*\([^)]*(?:$C)" -e "(?m)^[ \t]*${R}[^{;]*\{(?:[^{}]|(?<b>\{(?:[^{}]|(?&b))*\}))*?\bpublic\s[^;{=()]*?(?:$C)" $OPTS
fi
```

`CS-API-05`, a public positional record of `OPTS` other than a single `Value` wrapper or a `readonly record struct` of at most two fields:

```bash
if [ -z "${OPTS:-}" ]; then echo "N/A: OPTS unset ([new-surface])"; else
  grep -rnE --include='*.cs' "${xg[@]}" '^\s*public\s+((sealed|abstract|readonly|partial)\s+)*record(\s+(class|struct))?\s+\w+(<[^>]*>)?\s*\(' $OPTS | grep -vE -e 'record struct \w+\s*\(\s*(string|int)\s+Value\s*\)' -e 'readonly record struct \w+(<[^>]*>)?\s*\(\s*[^,()]+(,\s*[^,()]+)?\)'   # the Value wrapper and the two-field key (read its doc)
fi
```

`CS-API-06`, a public record with a secret-named member and no `PrintMembers`. The pattern anchors on the member name (the identifier after its type, not the type) and requires a string-like or secret-buffer type, so `GitHubToken Value`, `SyntaxToken Token`, `CancellationToken` and an interface-typed member (`ICredentialStore Credentials`) are silent and `string Password` is not; `Pat` counts only as a whole word:

```bash
R='public\s+(?:(?:sealed|abstract|partial|readonly)\s+)*record\b'
W='(?:(?!Cancellation)\w*(?:Token|Password|Passphrase|Pwd|Secret|ApiKey|AccessKey|PrivateKey|Credential|ConnectionString)\w*|Pat)'
T='(?:(?:System\.)?[Ss]tring|byte\[\]|char\[\]|(?:System\.Security\.)?SecureString|ReadOnly(?:Span|Memory)<(?:byte|char)>)\??'     # the member type: string-like or a secret buffer, so SyntaxToken Token and an interface-typed member are silent
rg -l -U -P -g '*.cs' "${x[@]}" -e "(?m)^[ \t]*$R(?:\s+class|\s+struct)?\s+\w+(?:<[^>]*>)?\s*\((?:[^)]*,)?\s*(?:\[[^\]]*\]\s*)*$T\s+$W\s*[,)=]" -e "(?m)^[ \t]*${R}[^{;]*\{(?:[^{}]|(?<b>\{(?:[^{}]|(?&b))*\}))*?\bpublic\s+(?:(?:required|static|virtual|override|new|readonly)\s+)*$T\s+$W\s*(?:\{|=|;)" $SRC | xargs -r rg --files-without-match PrintMembers
```

`CS-API-07`, `JsonStringEnumConverter`, then `Enum.Parse` or `Enum.TryParse` in a file that touches JSON, then an implicit `string` conversion in a `record struct` file, then culture-sensitive comparison in an open-enum file:

```bash
grep -rnE --include='*.cs' "${xg[@]}" 'JsonStringEnumConverter' $SRC
grep -rlE --include='*.cs' "${xg[@]}" -e 'IOpenEnum<' -e 'JsonSerializer' -e 'JsonElement' -e 'Utf8JsonReader' $SRC | xargs -r grep -nE -e 'Enum\.Parse' -e 'Enum\.TryParse'
grep -rlE --include='*.cs' "${xg[@]}" 'record struct' $SRC | xargs -r grep -nE 'implicit\s+operator\s+\w+\s*\(\s*string'
grep -rlE --include='*.cs' "${xg[@]}" 'IOpenEnum<' $SRC | xargs -r grep -nE -e 'IgnoreCase' -e 'InvariantCulture' -e 'CurrentCulture'
```

`CS-API-08`, a union root without an `internal` constructor or without an `Unknown` case (roots are the types a `TaggedUnionConverter<T>` names and the base of every `Unknown*` case; an extension-point abstract class is not a root):

```bash
rg -o -N -I -g '*.cs' "${x[@]}" -r '${1}${2}' -e 'TaggedUnionConverter<(\w+)>\)' -e 'sealed\s+class\s+Unknown\w*\s*(?:\([^)]*\))?\s*:\s*(\w+)' $SRC | grep -vx TBase | sort -u | while read -r t; do
  rg -q -g '*.cs' "${x[@]}" "internal\s+$t\s*\(" $SRC || echo "$t: no internal constructor"
  rg -q -g '*.cs' "${x[@]}" "sealed\s+class\s+Unknown\w*\s*(\([^)]*\))?\s*:\s*$t\b" $SRC || echo "$t: no Unknown case"
done
```

`CS-API-10`, a `required` added to an existing file outside the outputs (a hit is fine only on a type first introduced
in this diff), then `[SetsRequiredMembers]` beside a public constructor:

```bash
git diff --diff-filter=M -U0 "$BASE"...HEAD -- '*.cs' ":!$M" "${xp[@]}" | grep -E '^\+[^+].*\brequired\b'
rg -U -n -g '*.cs' "${x[@]}" -e 'SetsRequiredMembers[^\n]*\n[^\n]*public\s+\w+\s*\(' -e 'SetsRequiredMembers\]\s*public\s+\w+\s*\(' $SRC
```

`CS-API-11`, severity lines (a `.globalconfig` line, `TreatWarningsAsErrors` true or a `WarningsAsErrors` list that holds the ID), `.editorconfig` leaks and API files without the nullable header (both only where the default analyzer is referenced; unanchored, because some files carry a BOM), then `require_api_files` and a missing baseline (no baseline file at all prints `MISSING`; per-TFM `PublicAPI/<tfm>/PublicAPI.txt` counts):

```bash
if grep -rqE --include='*.csproj' --include='*.props' --include='*.targets' 'Microsoft\.CodeAnalysis\.PublicApiAnalyzers' .; then
  pj=$(dotnet msbuild "$PRJ" -getProperty:TreatWarningsAsErrors -getProperty:WarningsAsErrors) || echo "MISSING msbuild $PRJ"   # a gate through warnings as errors needs no .globalconfig line
  twae=$(jq -r '.Properties.TreatWarningsAsErrors' <<< "$pj"); wae=";$(jq -r '.Properties.WarningsAsErrors' <<< "$pj");"
  for id in RS0016 RS0017 RS0026 RS0027 RS0036 RS0037; do [ "${twae,,}" = true ] || [[ $wae == *";$id;"* ]] || grep -qsE "dotnet_diagnostic\.$id\.severity *= *error" .globalconfig || echo "missing $id: not an error (.globalconfig, TreatWarningsAsErrors, WarningsAsErrors)"; done
  test -f .editorconfig && grep -nE 'dotnet_diagnostic\.RS00' .editorconfig
  grep -rL --include='PublicAPI.Shipped.txt' --include='PublicAPI.Unshipped.txt' '#nullable enable' $SRC
fi   # another analyzer owns the baseline: read that gate against the three properties of the row
grep -rn --include='.editorconfig' --include='*.globalconfig' --include='.globalconfig' 'require_api_files' .
test -n "$(find $SRC -name 'PublicAPI*.txt' -print -quit)" || echo "MISSING PublicAPI*.txt under $SRC"
```

`CS-API-13`, an `[Obsolete]` without `DiagnosticId` (every spelling: `System.Obsolete`, an attribute list, `("msg", true)`, `error: true`, a wrapped attribute; commented-out lines skipped), an `[Experimental]` without an ID or URL, a preview marker, an ID used by both attributes, then an ID missing from the registry:

```bash
if [ "$gf" != 1 ]; then echo "N/A: lowest TFM below net8.0"; else
  rg -U -n -P -g '*.cs' "${x[@]}" '(?m)^[ \t]*(?!//)(?:\[[^\]]*\]\s*)*\[(?:[^\]]*,\s*)?(?:System\.)?Obsolete\b(?![^\]]*(?:DiagnosticId|\([A-Z]+[0-9]{4}\)"))[^\]]*\]' $SRC
  rg -n -P -g '*.cs' "${x[@]}" -e '\[(?:[^\]]*,\s*)?(?:System\.Diagnostics\.CodeAnalysis\.)?Experimental\s*\(\s*"[A-Za-z0-9]+"\s*\)' -e 'RequiresPreviewFeatures' $SRC | rg -v '^[^:]+:\d+:\s*//'
  comm -12 <(grep -rhoE --include='*.cs' "${xg[@]}" 'Experimental\s*\("[A-Z]+[0-9]{4}"' $SRC | grep -oE '[A-Z]+[0-9]{4}' | sort -u) <(grep -rhoE --include='*.cs' "${xg[@]}" 'DiagnosticId = "[A-Z]+[0-9]{4}"' $SRC | grep -oE '[A-Z]+[0-9]{4}' | sort -u)
  grep -rhoE --include='*.cs' "${xg[@]}" -e 'Experimental\s*\("[A-Z]+[0-9]{4}"' -e 'DiagnosticId = "[A-Z]+[0-9]{4}"' $SRC | grep -oE '[A-Z]+[0-9]{4}' | sort -u | while read -r id; do grep -q "$id" docs/diagnostics.md || echo "$id: not in the registry"; done
fi
```

`CS-API-14`, suppressions on a type not marked `[Experimental]` (prints each target; run it in a project with a
`CompatibilitySuppressions.xml`), then the signal counts since the last tag (added lines only, so a deleted block is not counted):

```bash
d=$PRJ
test -f "$d/CompatibilitySuppressions.xml" || echo "MISSING $d/CompatibilitySuppressions.xml"
comm -13 <(grep -rhzoP --include='*.cs' '\[Experimental\s*\("[A-Z]+[0-9]{4}"[^\]]*\]\s*(?:\[[^\]]*\]\s*)*public\s+(?:(?:sealed|abstract|readonly|partial|static)\s+)*(?:class|struct|record(?:\s+(?:class|struct))?|interface|enum)\s+\K\w+' "$d" | tr '\0' '\n' | sort -u) <(grep -oP '<Target>\K[^<]+' "$d/CompatibilitySuppressions.xml" | awk '{ t=substr($0,1,1); s=substr($0,3); sub(/\(.*/,"",s); n=split(s,a,"."); print (t=="T") ? a[n] : a[n-1] }' | sort -u)
TAG=$(git describe --tags --abbrev=0) || echo "MISSING tag"   # the last released tag
git diff "$TAG"..HEAD -U0 -- '*PublicAPI.Unshipped.txt' | grep -c '^+\*REMOVED\*'
git diff "$TAG"..HEAD -U0 -- '*behavior-table*.json' | grep -c '^+[^+].*"supersedes"'
```

`CS-API-17`, the output-type shape. Six scans print nothing; the seventh lists the golden file a `required` must touch:

```bash
test -d "$M" || echo "MISSING $M"
rg -l0 -P -g '*.cs' '^\s*public\s+sealed\s+(?:partial\s+)?class\b' "$M" | xargs -0 -r rg --files-without-match -e '\[JsonConstructor\]'
rg -n -g '*.cs' -e '^\s*public\s+[A-Z]\w*\s*\(' "$M"
rg -U -n -g '*.cs' -e '\[JsonConstructor\]\s*(internal|public|private|protected)\s+\w+\s*\([^)\s]' "$M"
rg -n -g '*.cs' -e '(private|internal|protected)\s+set;' -e 'IEquatable<' -e 'override bool Equals' -e 'override int GetHashCode' -e 'override string ToString' "$M"
rg -U -o --no-filename -g '*.cs' -e '\[JsonConstructor\]\s*internal\s+(\w+)\s*\(' -r '$1' "$M" | sort -u | while read -r n; do rg -n -g '*.cs' "${x[@]}" -g '!**/Models/**' -e "public [^=]*\\((.*[ ,(])?$n \\w+" $SRC; done
rg -n -e 'InternalsVisibleTo' -g '*.cs' -g '*.csproj' -g '*.props' "${x[@]}" $SRC | grep -vE "[\"](${IVT_OK:?MISSING IVT_OK})[\",]"   # IVT_OK: a regex of the allowed friend names (example Ocx\.Sdk\.(UnitTests|FakeCliTests|ContractTests)); the name ends at a quote or a comma, so , PublicKey= counts
git diff -U0 "$BASE"...HEAD -- "$M" | grep -E '^\+[^+].*\brequired\b' && git diff --name-only "$BASE"...HEAD
```

`CS-API-18`, hidden members under the generator (the second command needs `--hidden` to read `.editorconfig`):

```bash
rg -U -n -g '*.cs' "${x[@]}" -e '\[JsonConstructor\]\s*(?:\[[^\]]*\]\s*)*(private|protected)' -e '\[JsonInclude\]\s*(?:\[[^\]]*\]\s*)*[^\n]*(private|protected)\s+(set|init)' $SRC
rg -n --hidden -e 'SYSLIB1222' -e 'SYSLIB1038' --glob '*.csproj' --glob '*.props' --glob '*.targets' --glob '*.cs' --glob '.editorconfig' --glob '*.globalconfig' . | rg -v -e 'severity\s*=\s*error'
rg -U -n -g '*.cs' "${x[@]}" -e '\[JsonRequired\]\s*(?:\[[^\]]*\]\s*)*[^\n]*\{\s*get;\s*\}' $SRC
```

`CS-API-20`, a public `*ModelFactory` class, then for each output type a public static method that returns it and a method of a public `*Builder` class that returns it (an `internal` builder, a public builder that returns anything else and the client's own `CreateAsync` are silent):

```bash
rg -n -P -g '*.cs' "${x[@]}" 'public\s+(?:(?:sealed|static|abstract|partial)\s+)*class\s+\w*ModelFactory\b' $SRC
rg -U -o --no-filename -g '*.cs' -e '\[JsonConstructor\]\s*internal\s+(\w+)\s*\(' -r '$1' "$M" | sort -u | while read -r n; do
  rg -n -P -g '*.cs' "${x[@]}" -g '!**/Models/**' "public\s+static\s+(?:async\s+)?(?:Task<)?$n\b" $SRC
  rg -U -n -P -g '*.cs' "${x[@]}" "public\s+(?:(?:sealed|static|abstract|partial)\s+)*class\s+\w*Builder\b[^{]*\{(?:[^{}]|(?<b>\{(?:[^{}]|(?&b))*\}))*?\bpublic\s+(?:async\s+)?(?:Task<)?$n\b[^;{=]*\(" $SRC
done
```

`CS-API-19`, the probe body (the context type is yours; the assertion helper is your test framework's):

```csharp
var ctx = ApiJsonContext.Default;
var attrs = typeof(ApiJsonContext).GetCustomAttributes<JsonSerializableAttribute>().Count();
var seen = 0;
foreach (var p in typeof(ApiJsonContext).GetProperties().Where(p => typeof(JsonTypeInfo).IsAssignableFrom(p.PropertyType)))
{
    seen++;
    try { JsonSerializer.Deserialize("{}", (JsonTypeInfo)p.GetValue(ctx)!); }
    catch (JsonException) { }                                   // refused or required: fine
    catch (Exception e) { Assert.Fail($"{p.Name}: {e.GetType().Name}"); }
}
Assert.True(seen >= attrs);                                     // never ==
```

## What Agents Get Wrong Here

1. **`public enum Status` with `JsonStringEnumConverter` and `Enum.TryParse(..., ignoreCase: true)` for every JSON string.** Happy-path tests use known values. Check: `CS-API-07`.
2. **`public record Foo(string A, string B)` for every DTO and options type.** It compiles and `with` is handy. Check: `CS-API-05`, `CS-API-06`, `CP0002` at pack.
3. **Results given a public constructor, or made records, "so tests can build them"; a sealed result mocked with Moq.** The SDK's own tests pass. Check: `CS-API-17` constructor scan, `CP0002` if closed later.
4. **An optional parameter, a `CancellationToken = default` or a renamed parameter on a shipped method.** Source-compatible. Check: `CS-API-09`, `CS-API-12`.
5. **`IClient` generated "for mocking", unsealed public classes, `{ get; set; }` options.** The habit of generated SDKs (Stripe, as of 2026-10: 6,060 open types, 1 sealed). Check: `CS-API-02`, `CS-API-03`, `CA2227`.
6. **A green `dotnet pack` read as "no breaking change"** while the patch changes the thrown type, nulls a property or turns a failure into a result. Both API gates are blind to behaviour: 5 of 5 planted breaks packed clean (as of 2026-10). Check: `CS-ERR-12`, `CS-API-14`.
7. **`[Serializable]`, a `SerializationInfo` constructor and `GetObjectData` on new exceptions**, copied from old samples. Check: SYSLIB0051 under the gate, `CS-ERR-07`.
8. **`internal T() { }` without `[JsonConstructor]`, a `private` constructor from .NET 11 folklore, `NoWarn` for `SYSLIB1222`, or a probe asserting `seen ==` the attribute count.** Zero diagnostics until the first `Deserialize`. Check: `CS-API-17`, `CS-API-18`, `CS-API-19`.
9. **`RS0017` set in `.editorconfig`, `require_api_files = true`, `<ApiCompatVersion>`, hand-written `PublicAPI.Unshipped.txt` lines, a committed `CompatibilitySuppressions.xml` from `-p:ApiCompatGenerateSuppressionFile=true`, a re-pack into a dirty `obj/`.** Each exits 0. Check: `CS-API-11`, `CS-API-12`, `CS-API-14`, `CS-API-15`.
10. **`required` added to a shipped input type, then `CS9035` silenced with a public `[SetsRequiredMembers]` constructor and `= default!`.** No gate sees it and `null` appears at run time. Check: `CS-API-10`.
11. **Every type marked `[Experimental]` during 0.x, a custom `[Preview]`, `[Obsolete]` without `DiagnosticId`.** Check: `CS-API-13`.
12. **`case Status.Ok:` on a struct, hits `CS9135`, and reverts to an enum; or C# 15 `closed` because an RC SDK accepted it.** Check: `CS-API-07` and `CS-API-08` scans, `CS8652` on 10.0.401.
13. **A `ModelFactory` written unprompted, then an all-optional overload added.** Packs clean; consumers get `CS0121`. Check: `CS-API-20`.
14. **`AddOcx(this IServiceCollection ...)` in the core package, under `namespace Microsoft.Extensions.DependencyInjection`.** The core now references the DI abstractions and the namespace belongs to Microsoft. Check: `CS-API-16`.
