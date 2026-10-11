---
title: "Public API surface shape for a .NET SDK that wraps a CLI (entry type, options/results, enums, sealing, unfrozen contract)"
topic: csharp-api / csharp-api-surface-shape
agent: deep-dive researcher (sonnet subagent, research-lang csharp, group "Public API surface, its evolution, and its errors")
model: claude-sonnet-5-5
date_researched: 2026-10-10
sources_count: 36
scope: >
  Covers the shape decisions for the public types of the ocx C# SDK: entry-type pattern, type kind for options
  and results (class vs record vs positional record), enum policy for open wire sets, sealing default, how
  unfrozen contract parts are marked ([Experimental]), nullable annotations and required/init on netstandard2.0
  as contract, DI-free core, and which tool catches which evolution mistake (package validation, PublicApiAnalyzers,
  analyzers). Every checkable claim was run on SDK 10.0.401 (some on 8.0.425 and 11.0.100-rc.1).
  NOT covered: the exception hierarchy and error mapping (sibling subtopic), async/cancellation shape, TFM selection,
  JSON source-generation/AOT, the process-spawn layer. Windows host was not used (no claim here is OS-specific).
---

# Public API surface shape for a CLI-wrapping .NET SDK

Citation forms: exemplar `owner__repo@sha12:path:line` (clones under `/home/mherwig/.cache/research-lang/exemplars/csharp`); fixture
`fx:<dir>` = `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-api-surface-shape/<dir>`; audit docs
`audit:<file>:<line>` = `/home/mherwig/dev/grimoire-lore/.agents/worktrees/csharp/.agents/research/csharp-audit/<file>:<line>`.

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Entry type: one sealed client, static async factory, no public interface](#1-entry-type)
   2. [Options and results: class, record, positional record](#2-options-and-results)
   3. [Records: the ToString secret leak and the collection-equality lie](#3-records-tostring-and-equality)
   4. [Positional records and the versioning cost](#4-positional-records)
   5. [Open sets: enums versus extensible structs](#5-open-sets)
   6. [Sealing by default](#6-sealing)
   7. [Marking unfrozen contract parts: `[Experimental]`](#7-experimental)
   8. [Nullable annotations and `required`/`init` as contract](#8-nullable-required)
   9. [DI-free core](#9-di-free-core)
   10. [Which gate catches which break](#10-gates)
   11. [C# 15 / .NET 11 specifics](#11-csharp15)
   12. [Verified on the toolchain](#12-verified)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- Ship one `public sealed class OcxClient` built by a `static async CreateAsync(OcxClientOptions? options = null, CancellationToken ct = default)` factory; keep the constructor private. This is pulumi's `LocalWorkspace` shape (`pulumi__pulumi-dotnet@2a0dca84f09b:sdk/Pulumi.Automation/LocalWorkspace.cs:34,78`) and mirrors the Python SDK rule "discovery runs in a factory, never in `__init__`" (`audit:python-sdk-digest.md:262`).
- Do not ship `IOcxClient`. Adding a member to a published interface breaks every implementer ([library-change-rules](https://learn.microsoft.com/en-us/dotnet/core/compatibility/library-change-rules): "Adding a member to an interface: REQUIRES JUDGMENT"; [breaking-changes](https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/breaking-changes): "CONSIDER using abstract base classes instead of interfaces"). Test seam for 1.0 is `OcxClientOptions.ExecutablePath` pointing at a fake `ocx`; a public abstract runner can be added later without breaking anyone.
- Seal every public class by default. Sealing later is DISALLOWED, unsealing later is free: `dotnet pack` with a baseline reports `CP0009` for adding `sealed` and nothing for removing it (`fx:c-v2-probe`, `fx:c-v2-unseal`). CA1852 covers internal types only; the public-class check is `MA0053` with `MA0053.public_class_should_be_sealed = true` (`fx:i-an-red`).
- Options are `public sealed class` with `required`/`init` members, or a `sealed` non-positional `record` when `with`-derivation is wanted (Python `with_config`). Results are `public sealed class` with `required init` members populated by the JSON binder.
- A record's compiler-generated `ToString()` prints every public member, so `$"{opts}"` leaks a `Password` (`fx:a-secret-red` prints `Password = hunter2-SECRET`). A sealed record must declare `private bool PrintMembers(StringBuilder)` to redact (`fx:a-secret-green`); a class prints only its type name (`fx:a-secret-green-class`).
- Record `==` compares collection members by reference: two records with equal-looking `IReadOnlyList<string>` are `!=` (`fx:a-eq-red`). Results with collection members therefore stay classes.
- No public positional records. Adding a parameter replaces the constructor and `Deconstruct`; package validation reports `CP0002` twice (`fx:c-v2-red`). Adding an `init` property is clean (`fx:c-v2-green`). Across the 8 SDK exemplars only 3 positional records ship in `src` (pulumi 1, anthropic 2 helper structs).
- A C# `enum` bound to an open wire set is wrong three ways: `JsonStringEnumConverter` throws `JsonException` on a new value (`fx:b-enum-red`), a key mismatch silently yields the zero member (`fx:b-failopen-red`: `{"status":"failed"}` reads as `Ok`), and `(Status)42` is a valid value (`fx:b-cast-red`). Use an extensible `readonly struct` over `string` with ordinal equality and a custom `JsonConverter<T>` (`fx:b-enum-green` round-trips `future_kind`).
- Closed C# enums are right only for sets the SDK sends and the CLI rejects when unknown (argv choices). Anything read from ocx JSON (status, kind, error detail) is an extensible struct; success predicates are allow-lists (`== Status.Succeeded`), never `!= Status.Failed` (`audit:ocx-cli-contract.md:69,117`).
- Extensible structs cannot be `case` labels (`CS9135`, `fx:b-switch-red`); expose `Value` and compare with `==`. Never copy openai's `StringComparison.InvariantCultureIgnoreCase` equality (`openai__openai-dotnet@1f0e8829acac:OpenAI/src/Generated/Models/Realtime/RealtimeMessageRole.cs:44`); wire tokens are ordinal.
- `Enum.TryParse<T>(wireString)` accepts `"42"` as an undefined member and rejects nothing it should (`fx:b-tryparse-red`); `JsonStringEnumConverter` and `Enum.Parse` are banned from wire-bound code.
- Mark every public API bound to an unfrozen ocx contract part with `[Experimental("OCX0001")]` (.NET 8+ attribute, any C# 12+ compiler): consumers get error `OCX0001` until they add it to `<NoWarn>`; one ID per independently graduating feature ([preview-apis](https://learn.microsoft.com/en-us/dotnet/fundamentals/runtime-libraries/preview-apis)). Works from a netstandard2.0 library with an `internal` polyfill and on SDK 8.0.425 (`fx:e-consumer-red`, `fx:g-sdk8`).
- Nullable annotations are contract and the gates disagree: default package validation misses `string` -> `string?`; `ApiCompatEnableRuleAttributesMustMatch=true` catches it as `CP0015`; PublicApiAnalyzers catches it as `RS0017` if `PublicAPI.Shipped.txt` starts with `#nullable enable` (`fx:c-v2-probe`, `fx:d-v2-probe`).
- Adding `required` to an existing member is a source break that NO gate catches (consumer gets `CS9035`; package validation, attribute rule and PublicApiAnalyzers are all silent). Review heuristic only.
- On netstandard2.0, `init`/`required` need `IsExternalInit`, `RequiredMemberAttribute`, `CompilerFeatureRequiredAttribute` or the build fails with `CS0518`/`CS0656` (`fx:f-ns20-red`). Polyfill them as `internal` (`fx:e-lib`); a consumer on net10.0 still gets `CS9035` for an unset required member (`fx:e-consumer-req`).
- The core package references no `Microsoft.Extensions.DependencyInjection*`: 0 of 8 SDK exemplars do. `AddOcx(this IServiceCollection)` belongs in a separate package and must not use the `Microsoft.Extensions.DependencyInjection` namespace ([options-library-authors](https://learn.microsoft.com/en-us/dotnet/core/extensions/options-library-authors)).
- C# 15 `closed` classes and `union` types exist on SDK 11.0.100-rc.1 but fail on the 10.0.401 target with `CS8652`/`CS0656`; `closed enum` does not exist (`CS0106`). Do not use them in a 1.x public API. A union's case list is itself a breaking surface.
- Package validation runs at `dotnet pack`, not `dotnet build` ([package-validation overview](https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/package-validation/overview): "runs a series of checks after the `Pack` task"); the CI gate command must be a pack.

## Findings

### 1. Entry type

**What the exemplars do** (all sha12 from `git rev-parse --short=12 HEAD`):

| exemplar | entry type | sealed? | test seam | options / construction | citation |
|---|---|---|---|---|---|
| pulumi-dotnet (CLI wrapper, closest analogue) | `abstract Workspace` with **internal** ctor, sealed `LocalWorkspace`, static `CreateAsync(options, ct)` | base abstract, leaf **sealed** | `abstract PulumiCommand` (public, 3 abstract members: `Version`, `RunAsync`, `RunInputAsync`) with unsealed `LocalPulumiCommand` | `LocalWorkspaceOptions` unsealed class, `{ get; set; }` | `pulumi__pulumi-dotnet@2a0dca84f09b:sdk/Pulumi.Automation/Workspace.cs:35`, `LocalWorkspace.cs:34,78-90`, `Commands/PulumiCommand.cs:12`, `Commands/LocalPulumiCommand.cs:46`, `LocalWorkspaceOptions.cs:12,28` |
| CliWrap | static `Cli.Wrap(path)` returns immutable `Command` | **unsealed** `public partial class Command(` 10-parameter primary ctor | none (pure value) | `With*` methods return copies, marked `[Pure]` | `Tyrrrz__CliWrap@7dbc252fa773:CliWrap/Cli.cs:14`, `Command.cs:13-24,78` |
| testcontainers | `ContainerBuilder : ContainerBuilder<ContainerBuilder, IContainer, IContainerConfiguration>` | unsealed (CRTP base needs it) | interfaces `IContainer` | fluent `With*`, 4-type-parameter `AbstractBuilder` | `testcontainers__testcontainers-dotnet@04cbb73fcc58:src/Testcontainers/Builders/ContainerBuilder.cs:39-41`, ``AbstractBuilder`4.cs:21`` |
| octokit | `GitHubClient : IGitHubClient` | unsealed + interface | the interface | models unsealed with a **50-parameter** all-properties ctor | `octokit__octokit.net@7fa5b0fe4a18:Octokit/GitHubClient.cs:10`, `IGitHubClient.cs:8`, `Models/Response/Repository.cs:19` |
| stripe | `StripeClient : IStripeClient` | unsealed + interface | the interface | entities open mutable classes | `stripe__stripe-dotnet@dbdca6ba5efc:src/Stripe.net/Infrastructure/Public/StripeClient.cs:15`, `IStripeClient.cs:11`, `Entities/Charges/Charge.cs:20` |
| anthropic-sdk-csharp | `AnthropicClient : IAnthropicClient` | unsealed + interface; models `sealed record class` | the interface | `required init` properties; "A small constructor plus `required init` properties reads better than a long positional parameter list" | `anthropics__anthropic-sdk-csharp@ae16e5933f39:src/Anthropic/AnthropicClient.cs:19`, `IAnthropicClient.cs:23`, `CLAUDE.md:73` |
| openai-dotnet | `partial class OpenAIClient`, `partial class ChatClient` | unsealed | `public virtual` methods (`Custom/Chat/ChatClient.cs:146`) | mutable options (`{ get; set; }`, `Custom/Chat/ChatCompletionOptions.cs:59`) | `openai__openai-dotnet@1f0e8829acac:OpenAI/src/Custom/OpenAIClient.cs:87` |
| Azure.Core guidelines | service clients are reference types, **virtual** methods and properties, "protected parameterless constructor for mocking", "DO NOT have a default constructor on the options type" | not sealed by design | virtual + protected ctor | `ClientOptions` subclasses | [Azure .NET guidelines](https://azure.github.io/azure-sdk/dotnet_introduction.html): `dotnet-client-constructor-for-mocking`, `dotnet-service-methods-virtual`, `dotnet-options-no-default-constructor` |

**The pulumi pair is the only exemplar that is both a CLI wrapper and structured for evolution**: the abstract base has an `internal` constructor (`Workspace.cs:35`: `internal Workspace(PulumiCommand cmd)`), which closes the hierarchy to the assembly on C# 14 without any new keyword; the leaf is `sealed`; construction is `static async Task<LocalWorkspace> CreateAsync(LocalWorkspaceOptions? options = null, CancellationToken cancellationToken = default)` (`LocalWorkspace.cs:78-90`) because it must run `pulumi version` first. ocx has the same need (binary discovery plus `ocx version` contract check, `audit:ocx-cli-contract.md:99`).

**Fixture proof that `internal` ctor closes a hierarchy** (`fx:j-hier-red`): a consumer subclass of `public abstract class PublishOutcome { internal PublishOutcome() {} }` fails with `error CS1729: 'PublishOutcome' does not contain a constructor that takes 0 arguments`.

**Why not CliWrap's immutable builder for the client**: `Command` is a per-invocation value (target file, args, pipes); ocx has 70 typed leaf commands with typed results (`audit:ocx-cli-contract.md:90`). CliWrap's builder is the right shape for the spawn layer (the sibling topic), not for the public client. **Why not testcontainers' builder**: CRTP with 4 type parameters earns its keep only for a family of products (container, network, volume, compose); ocx has one product, and the builder had to deprecate its own parameterless constructor (`ContainerBuilder.cs:39`: `[Obsolete("This parameterless constructor is obsolete and will be removed...")]`).

**Shape to mirror from the Python SDK** (`audit:python-sdk-digest.md:58`): `Ocx.project(path)` returns a handle carrying `--project`; `Ocx.package/config/patch` are stateless property wrappers. In C#: `client.Package`, `client.Config`, `client.Project(path)` return `sealed` handle classes with `internal` constructors; the 70 leaf methods live on the handles, not on `OcxClient`.

```csharp
// Correct
public sealed class OcxClient
{
    private OcxClient(OcxClientOptions options, OcxVersionInfo version) { /* ... */ }
    public static async Task<OcxClient> CreateAsync(
        OcxClientOptions? options = null, CancellationToken cancellationToken = default) { /* discover + `ocx version` */ }
    public PackageCommands Package { get; }                       // sealed handle, internal ctor
    public OcxClient WithOptions(Func<OcxClientOptions, OcxClientOptions> derive) { /* never re-discovers */ }
}

// Incorrect: 70 members on an interface + unsealed class (octokit/stripe/anthropic style)
public interface IOcxClient { /* every added leaf command breaks every implementer */ }
public class OcxClient : IOcxClient { public OcxClient() { /* does I/O in the ctor */ } }
```

**Evolution rule for method signatures** ([library-change-rules](https://learn.microsoft.com/en-us/dotnet/core/compatibility/library-change-rules)): "Adding, removing, or changing the order of parameters: DISALLOWED"; "Renaming a parameter (including changing its case): DISALLOWED"; changing/removing an optional parameter default is a source/behaviour break. So required arguments are positional parameters and everything optional goes on a per-command options class (Azure: `dotnet-params-complex-methods`, "Complex service methods should use an options parameter"). Adding a property to an options class is the only additive move.

### 2. Options and results

Measured shapes in the 8 SDK exemplars (commands in 12.3):

| exemplar | options type | result/model type |
|---|---|---|
| pulumi | unsealed class, `{ get; set; }` (`LocalWorkspaceOptions.cs:12`) | mostly sealed classes (37 sealed vs 52 open public classes under `Pulumi.Automation`) |
| CliWrap | class with primary ctor, get-only (`Credentials.cs:16-26`) | `CommandResult` class |
| anthropic | `public record class XParams : ParamsBase` (656 unsealed record classes) | `public sealed record class` raw-JSON-backed, `required` + `init` (1,486 sealed record classes) |
| openai | mutable classes (generated) | classes; 771 extensible structs, 273 enums |
| stripe | mutable classes (6,060 open, 1 sealed) | same |
| Azure guideline | "DO NOT have a default constructor on the options type" | output models: "DO ensure model public properties are get-only if they aren't intended to be changed by the user"; collections `IReadOnlyList<T>` |

Decision for ocx (matches the Python SDK's "one rich frozen result struct per command; unknown JSON keys ignored", `audit:python-sdk-digest.md:253`):

- **Results**: `public sealed class` per command report, `required` + `init` members, no public constructor, collection members typed `IReadOnlyList<T>` / `IReadOnlyDictionary<string,T>`. Reference equality is honest for them (3.2). Unknown JSON keys are ignored by System.Text.Json by default; do not add `[JsonExtensionData]` unless a field is declared opaque (`audit:ocx-cli-contract.md:71`, `x-ocx-opaque`).
- **Options/config**: `public sealed class` with `required` for mandatory and `init` for optional members; or a **sealed, non-positional** `record` for the one type that needs `with`-derivation (`OcxClientOptions`, Python `with_config`, `audit:python-sdk-digest.md:347`), with `PrintMembers` redaction because it carries credentials (`OCX_AUTH_*`, `audit:python-sdk-digest.md:269`).
- **Never** `{ get; set; }` on a public type (mutable shared state; fixture `fx:i-an-red` trips `CA2227`), arrays (`CA1819`) or `List<T>` (`CA1002`) in public members.

Anthropic's own contributor file is an AI-agent rule set worth copying line for line: "`sealed` unless designed for inheritance; `internal` unless deliberately public" and "Changing an existing public signature is a breaking change even where `detect-breaking-changes` can't see it; an added overload usually isn't" (`anthropics__anthropic-sdk-csharp@ae16e5933f39:CLAUDE.md:75`).

### 3. Records: ToString and equality

<a id="3-records-tostring-and-equality"></a>

**3.1 ToString leaks every public member.** The [records reference](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/record) states the compiler-generated `ToString` "displays the names and values of public properties and fields". Fixture `fx:a-secret-red`:

```csharp
// RED: prints  RegistryOptions { Host = registry.example, User = alice, Password = hunter2-SECRET }
public record RegistryOptions(string Host, string User, string Password);
```
```text
$ ../../run.sh dotnet run --project a-secret-red      # exit 1
RegistryOptions { Host = registry.example, User = alice, Password = hunter2-SECRET }
connecting with RegistryOptions { Host = registry.example, User = alice, Password = hunter2-SECRET }
LEAK: secret present in ToString/interpolation
```
```csharp
// GREEN A (fx:a-secret-green, exit 0): sealed record, redacting PrintMembers. Signature rule from the docs:
// "For a sealed record that derives from object: private bool PrintMembers(StringBuilder builder);"
public sealed record RegistryOptions
{
    public required string Host { get; init; }
    public required string User { get; init; }
    public required string Password { get; init; }
    private bool PrintMembers(StringBuilder builder)
    {
        builder.Append("Host = ").Append(Host).Append(", User = ").Append(User).Append(", Password = ***");
        return true;
    }
}
// GREEN B (fx:a-secret-green-class, exit 0): sealed class; Object.ToString() prints "RegistryOptions".
```
Output of green A: `RegistryOptions { Host = registry.example, User = alice, Password = *** }`. Note a non-sealed record needs `protected virtual bool PrintMembers`, a sealed record deriving from another record needs `protected override`; getting the modifier wrong is a compile error, not a silent fallback. Redacting `ToString` alone is not enough for a derived record: "The compiler synthesizes `PrintMembers` in derived records even when a base record sealed the `ToString` method."

**3.2 Equality of collection members is reference equality.** The record docs' own example shows `person1 == person2` stays `True` after mutating a shared array, and Jon Skeet states the limit: "there's no way of specifying an equality comparer to be used for a given property" in a record ([Records and Collections, 2025-03-27](https://codeblog.jonskeet.uk/2025/03/27/records-and-collections/); synthesized equality uses `EqualityComparer<T>.Default`, so an `ImmutableList<T>` or `IReadOnlyList<T>` compares by reference). Fixture `fx:a-eq-red`:

```text
a == b : False        // new Report("pkg", ["x","y"]) vs new Report("pkg", ["x","y"])
a.Equals(b): False
SURPRISE: equal-looking records are not equal            (exit 1)
```
Green (`fx:a-eq-green`): `public sealed class Report`, identity equality documented, content compare via `SequenceEqual` (exit 0). A hand-written `Equals`/`GetHashCode` on a record is possible but, per Skeet, "adding a property means updating both methods"; it rots.

**3.3 Records are 3% of the fleet.** 407 record declarations vs 12,483 class declarations (`audit:exemplar-language-shape.md:21,741`); generated-SDK style (anthropic) uses `sealed record class` for models only because the generator wants `with` and structural `ToString`.

### 4. Positional records

<a id="4-positional-records"></a>

A positional record is a public constructor plus a `Deconstruct` method plus properties, all derived from one parameter list; a new field changes all three at once. Fixture `fx:c-baseline` ships `Ocx.Fx` 1.0.0 with `public sealed record Report(string Name);`; `fx:c-v2-red` is 1.1.0 adding `int Count`:

```text
$ ../../run.sh dotnet pack c-v2-red -c Release         # EnablePackageValidation=true, PackageValidationBaselineVersion=1.0.0   (exit 1)
error CP0002: Member 'Ocx.Fx.Report.Report(string)' exists on [Baseline] lib/net10.0/Ocx.Fx.dll but not on lib/net10.0/Ocx.Fx.dll
error CP0002: Member 'void Ocx.Fx.Report.Deconstruct(out string)' exists on [Baseline] lib/net10.0/Ocx.Fx.dll but not on lib/net10.0/Ocx.Fx.dll
error : API breaking changes found. If those are intentional, the APICompat suppression file can be updated by rebuilding with '/p:ApiCompatGenerateSuppressionFile=true'
```
Green twin `fx:c-v2-green` (exit 0): `public sealed record Report(string Name) { public int Count { get; init; } }`. Hand-written compatibility is possible (`public Report(string Name) : this(Name, 0) {}` plus manual `Deconstruct`) but the compiler no longer generates it for you; the exemplars show where that ends: CliWrap keeps both `Credentials(domain, username, password)` and `Credentials(..., loadUserProfile)` with a `// TODO: (breaking change) remove in favor of the other overload` (`Tyrrrz__CliWrap@7dbc252fa773:CliWrap/Credentials.cs:16-26`), and octokit's `Repository` has a 50-parameter all-properties constructor that must change with every new GitHub field (`octokit__octokit.net@7fa5b0fe4a18:Octokit/Models/Response/Repository.cs:19`), guarded by a convention test `ExcludeFromCtorWithAllPropertiesConventionTest`.

Corpus check: the 8 SDK exemplars ship **3** public positional records in `src`: `pulumi__pulumi-dotnet@2a0dca84f09b:sdk/Pulumi/Provider/ComponentAnalyzer.cs:431` (`Metadata`), and two `readonly record struct` helpers `anthropics__anthropic-sdk-csharp@ae16e5933f39:src/Anthropic/Helpers/Fallbacks/ChainPolicy.cs:59` and `WireShape.cs:28`. The generated-model SDKs avoid them entirely. The rule "no public positional record" matches practice; the `required` modifier cannot be applied to positional parameters either ([required](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/required): "You can't use the `required` modifier on the declaration for positional parameters on a record").

### 5. Open sets

<a id="5-open-sets"></a>

**5.1 What the ocx contract says.** "Enums and unions are open; unknown `status` is NOT success" (`audit:ocx-cli-contract.md:69`); the Rust generator emits "open scalar enums and tagged unions with an `Unknown` arm" and "fail-closed success predicates" (`:117`); the C# note is "closed enums are NOT [fine]" (`:132`); exit code 82 changed meaning between 0.6.5 and main (`:57`) so even numeric codes are an open set.

**5.2 Three ways a closed enum fails on open data**, each reproduced.

(a) Unknown value throws `JsonException` (`fx:b-enum-red`, exit 1):
```csharp
public enum Status { Ok, Failed }
public sealed record Report(Status Status);
var opts = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
                                       Converters = { new JsonStringEnumConverter(JsonNamingPolicy.SnakeCaseLower) } };
JsonSerializer.Deserialize<Report>("""{ "status": "future_kind" }""", opts);
// JsonException: The JSON value could not be converted to Report. Path: $.status | LineNumber: 0 | BytePositionInLine: 25.
```
The exemplar that does this on purpose: openai's `ChatFinishReason` (a closed `enum`) is read by `ToChatFinishReason` which ends in `throw new ArgumentOutOfRangeException(nameof(value), value, "Unknown ChatFinishReason value.");` (`openai__openai-dotnet@1f0e8829acac:OpenAI/src/Generated/Models/Chat/ChatFinishReason.Serialization.cs:43`; `ToSerialString` has the same throw at `:18`) while the same SDK ships 771 extensible structs elsewhere. Anthropic's contributor rules name the failure: "Throwing on data the SDK doesn't recognize ... especially in streaming and middleware code, where an exception tears down the caller's response" (`anthropics__anthropic-sdk-csharp@ae16e5933f39:CLAUDE.md:53`).

(b) A key mismatch fails **open** (`fx:b-failopen-red`, exit 1). With default `JsonSerializerOptions` (case-sensitive, no naming policy) the key `status` does not bind to property `Status`, so the zero member wins:
```text
Report { Status = Ok }        // payload was {"status":"failed"}
```
Green (`fx:b-failopen-green`, exit 0): a `required` member makes the same payload throw `JSON deserialization for type 'Report' was missing required properties including: 'Status'.` System.Text.Json honours the C# `required` modifier (the [docs](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/customize-properties) say property names are unchanged "including case" by default; `SnakeCaseLower` is available since .NET 8).

(c) A C# enum is not closed: `(Status)42` compiles and `Enum.IsDefined` is `False`; an "exhaustive" switch expression is flagged `CS8524` ("does not handle some values of its input type ... involving an unnamed enum value") and with warnings relaxed throws `SwitchExpressionException` (`fx:b-cast-red`). `Enum.TryParse<Status>("42", out v)` returns `True` with an undefined member and `"Failed"` fails where `"failed"` is the wire token (`fx:b-tryparse-red`, exit 1).

**5.3 The extensible struct** ([Azure implementation guideline](https://azure.github.io/azure-sdk/dotnet_implementation.html), "Enumeration-like structures"; guideline `dotnet-enums-exception`: "YOU MAY use a `readonly struct` in place of an `enum` that declares well-known fields but can contain unknown values"). Required members of the pattern, as listed by that page: `readonly`, `IEquatable<T>` comparing only the string value, stores only the string, well-known values as `static` properties, `==`/`!=` and an implicit conversion from `string`, overrides of `Equals`/`GetHashCode`/`ToString`, `[EditorBrowsable(Never)]` on `Equals(object)`/`GetHashCode`. Exemplar listings: `Azure__azure-sdk-for-net@32c48fc3d524:sdk/core/Azure.Core/api/Azure.Core.net8.0.cs:408` (`ContentType : IEquatable<ContentType>, IEquatable<string>`), and the generated openai form (`RealtimeMessageRole.cs:12-50`). Green twin `fx:b-enum-green` (exit 0; output `read: future_kind  known=False` / `write: {"status":"future_kind"}` / `default(Status) is empty, not null-crash: ''`):

```csharp
[JsonConverter(typeof(StatusConverter))]
public readonly struct Status : IEquatable<Status>
{
    private readonly string? _value;                       // default(Status) has null: normalise it
    public Status(string value) { ArgumentNullException.ThrowIfNull(value); _value = value; }
    public static Status Ok { get; } = new("ok");
    public static Status Failed { get; } = new("failed");
    public string Value => _value ?? string.Empty;
    public bool Equals(Status other) => string.Equals(Value, other.Value, StringComparison.Ordinal);   // NOT InvariantCultureIgnoreCase
    public override bool Equals(object? obj) => obj is Status s && Equals(s);
    public override int GetHashCode() => StringComparer.Ordinal.GetHashCode(Value);
    public override string ToString() => Value;
    public static bool operator ==(Status l, Status r) => l.Equals(r);
    public static bool operator !=(Status l, Status r) => !l.Equals(r);
    public static implicit operator Status(string value) => new(value);
}
public sealed class StatusConverter : JsonConverter<Status> { /* GetString / WriteStringValue(v.Value) */ }
```
Pitfalls found: (1) `case Status.Ok:` does not compile: `error CS9135: A constant value of type 'Status' is expected` (`fx:b-switch-red`) - compare with `==` or switch on `Value` with `const string` tokens; (2) the generated openai structs use `StringComparison.InvariantCultureIgnoreCase` (`RealtimeMessageRole.cs:44`) and `StringComparer.InvariantCultureIgnoreCase.GetHashCode` (`:47`); the Azure page allows case-insensitive "if the service is inconsistent" and its template uses `StringComparison.Ordinal`; ocx tokens are lowercase snake_case, so ordinal; (3) CA1815 ("Override equals and operator equals on value types", [docs](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1815)) flags a public struct missing `Equals`/`==` (`fx:i-an-red`: two CA1815 errors on `Pair`); it is **not** enabled by default in .NET 10.

**5.4 The third pattern: closed enum + raw value** (`anthropics__anthropic-sdk-csharp@ae16e5933f39:src/Anthropic/Core/ApiEnum.cs:15`): `public record class ApiEnum<TRaw, TEnum>` stores the `JsonElement`; `Value()` returns "`(TEnum)(-1)` if the class was instantiated with an unknown value" and the contributor rules warn it "can't be re-serialized" and `ToString()` "returns JSON, quotes included" (`CLAUDE.md:53`). It works but is a sharper tool than the struct: prefer the struct for new code.

**5.5 Closed enums are still right in one place**: sets the SDK *sends* and ocx *rejects* when unknown (argv choice values such as log level, lazy mode; Python uses `Literal` aliases for these, `audit:python-sdk-digest.md:128`). [Framework Design Guidelines](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/enum): "DO NOT use an enum for open sets", "CONSIDER adding values to enums, despite a small compatibility risk", "DO provide a value of zero on simple enums" (analyzer `CA1008`, `fx:i-an-red`). Adding `[Flags]` to a shipped enum is DISALLOWED (library-change-rules).

**5.6 Tagged unions** (reports with `type`): `abstract` base with `internal` ctor plus sealed case classes plus a sealed `Unknown` arm carrying the raw `type`/`JsonElement` (`fx:j-hier-lib`). C# 14 cannot make the compiler check exhaustiveness; the switch needs a `_` arm that handles `Unknown` (fail-closed). `closed` and `union` (C# 15) would, see 11.

### 6. Sealing

<a id="6-sealing"></a>

- **Evidence that sealing later is the breaking direction**: library-change-rules: "DISALLOWED: Sealing a type that was previously unsealed"; "ALLOWED: Adding the sealed ... keyword to a type when there are no accessible (public or protected) constructors". [Designing for Extensibility](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/designing-for-extensibility): "it's usually possible to add more extensibility later, but you can never take it away without introducing breaking changes." Fixture: adding `sealed` to a 1.0.0 class is `error CP0009: Type 'Ocx.Fx.Client' has the sealed modifier on lib/net10.0/Ocx.Fx.dll but not on [Baseline]` (`fx:c-v2-probe`, exit 1); removing `sealed` from `Info` packs clean (`fx:c-v2-unseal`, exit 0).
- **What the fleet does**: 44% of public classes sealed overall (`audit:exemplar-language-shape.md:17`). Fresh counts for the 8 SDKs (public non-abstract `class`/`record class`, my regex in 12.3; `sealed`/`open`): pulumi 37/52, openai 18/1,078, anthropic 1,778/679, Azure.Core 18/88, octokit 9/609, stripe 1/6,060, testcontainers 38/10, CliWrap 0/27. The audit says anthropic is "2,775 open vs 269 sealed" (`:112`); that count misses the `sealed record class` form (1,486 declarations) - corrected here. Sealed is the habit of the strict repos (testcontainers, anthropic models, pulumi leaf), open is the habit of generated and legacy ones (stripe, openai, octokit). New code follows the strict habit.
- **The analyzers**: `CA1852` ("Seal internal types", introduced .NET 7, **not enabled by default in .NET 10**) applies to "a type that's not accessible outside its assembly and has no subtypes within its containing assembly"; fixture `fx:i-ca1852-public`: a `public class Client { }` with CA1852 at `error` builds clean (exit 0). The public check is `MA0053` ("Make class or record sealed", Design, default severity `suggestion`, `Meziantou.Analyzer/src/Meziantou.Analyzer.Pack/configuration/default.editorconfig:159`) whose option `MA0053.public_class_should_be_sealed` defaults to `false` (`meziantou__Meziantou.Analyzer@161b7e948ad3:src/Meziantou.Analyzer/Rules/ClassMustBeSealedAnalyzer.cs:19`). With `MA0053.public_class_should_be_sealed = true` and severity `error`, `fx:i-an-red` reports both `Report` (public) at (2,14) and `Hidden` (internal) at (10,16); `fx:i-an-green` is clean. Other options per the [rule page](https://github.com/meziantou/Meziantou.Analyzer/blob/main/docs/Rules/MA0053.md): `MA0053.class_with_virtual_member_should_be_sealed`, `MA0053.exceptions_should_be_sealed` (documented, not fixture-run).
- **Testfx precedent** for the internal half: `microsoft__testfx@7226b0c74729:.editorconfig:434-435` sets `CA1852` to `warning` (`audit:exemplar-language-shape.md:734`).
- **Extension points are explicit**: pulumi leaves `LocalPulumiCommand` and `LocalWorkspaceOptions` open because users subclass/replace them; each unsealed ocx class gets a `// extension point:` comment.

### 7. Experimental

<a id="7-experimental"></a>

`System.Diagnostics.CodeAnalysis.ExperimentalAttribute` (.NET 8+, applies to Assembly, Module, Class, Struct, Enum, Interface, Delegate, Constructor, Method, Property, Field, Event; `DiagnosticId`, `UrlFormat`, `Message`; [API page](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.codeanalysis.experimentalattribute)). Per [Preview APIs](https://learn.microsoft.com/en-us/dotnet/fundamentals/runtime-libraries/preview-apis): "When building against an experimental API, the compiler produces an error. Each feature ... has its own separate diagnostic ID", "the recommended way [to suppress] is to add the diagnostic to the project's `<NoWarn>` property", and for library developers: "Make sure to use your own diagnostic ID and make it specific to those features. If you have multiple independent features, consider using multiple IDs." `[RequiresPreviewFeatures]` "is only meant for components of the .NET platform itself" (it also forces `EnablePreviewFeatures`/`LangVersion=Preview` on consumers).

Corpus: `[Experimental]` appears 461 times across the 35 repos, the only evolution marker used at scale (`audit:exemplar-language-shape.md:497`). OpenAI uses two IDs (644x `OPENAI001`, 165x `OPENAI002`) plus 3 `SCME*` IDs (248x `SCME0001`, 41x `SCME0002`, 13x `SCME0004`), and suppresses them for its own build in `openai__openai-dotnet@1f0e8829acac:Directory.Build.props:42` (`<NoWarn>$(NoWarn);OPENAI001;OPENAI002;SCME0001</NoWarn>`); the attribute sits even on generated structs (`RealtimeMessageRole.cs:12`).

Fixtures (`fx:e-lib` is `netstandard2.0`, LangVersion 14, with an `internal` copy of `ExperimentalAttribute`; consumers are net10.0):
```csharp
[Experimental("OCX0001", UrlFormat = "https://example.invalid/diag/{0}")]
public sealed class ReportV2 { public string Name { get; init; } = ""; }
```
```text
RED  fx:e-consumer-red (exit 1):
 error OCX0001: 'Ocx.Fx.ReportV2' is for evaluation purposes only and is subject to change or removal in future updates. Suppress this diagnostic to proceed. (https://example.invalid/diag/OCX0001)
GREEN fx:e-consumer-green (exit 0): same code with <NoWarn>$(NoWarn);OCX0001</NoWarn> in the consumer csproj
SDK 8.0.425 / net8.0 consumer, LangVersion 12 (fx:g-sdk8/e-consumer-red): same error OCX0001   -> the .NET 8 LTS floor behaves the same
```
Consequences: (1) the polyfill must carry `DiagnosticId`, `UrlFormat`, `Message` and be `internal` (a `public` copy collides with consumers' own polyfills, `anthropics__anthropic-sdk-csharp@ae16e5933f39:CLAUDE.md:29`; Polyfill's default is the same: "The default type visibility for all polyfills is `internal`", `PolyPublic` flips it, [consuming.md](https://raw.githubusercontent.com/SimonCropp/Polyfill/main/consuming.md)); (2) the diagnostic is an error, not a warning, so an unsuppressed use fails CI of the *consumer* - that is the point; (3) graduating a feature = removing the attribute; library-change-rules lists "Removing an attribute: REQUIRES JUDGMENT" and `ApiCompatEnableRuleAttributesMustMatch` defaults to `false`, so the removal is not flagged by package validation unless that rule is on. For ocx: reports whose `schema_version` is not yet frozen (the contract is "not frozen: no baseline cut yet", `audit:ocx-cli-contract.md:28`; reports v1 and v2 both live) carry `[Experimental("OCX0001")]` on their public result types and entry methods; graduate one report family at a time with its own ID.

### 8. Nullable and required

<a id="8-nullable-required"></a>

**Nullable annotations are part of the contract** and a change is source-breaking only under `<Nullable>enable</Nullable>` consumers. Fixture `fx:c-consumer` compiled against `fx:c-v2-probe` (`Info.Value` became `string?`): `error CS8602: Dereference of a possibly null reference` (an error because the fixtures set `TreatWarningsAsErrors`; a warning otherwise). Gate coverage in 10. Annotate every public member, never `!` in public signatures.

**`required` on netstandard2.0** (brief claim verified): `fx:f-ns20-red` (LangVersion 14, no polyfills, exit 1):
```text
error CS0656: Missing compiler required member 'System.Runtime.CompilerServices.CompilerFeatureRequiredAttribute..ctor'
error CS0656: Missing compiler required member 'System.Runtime.CompilerServices.RequiredMemberAttribute..ctor'
error CS0518: Predefined type 'System.Runtime.CompilerServices.IsExternalInit' is not defined or imported
```
Green: `fx:e-lib/Polyfills.cs` (internal `IsExternalInit`, `RequiredMemberAttribute`, `CompilerFeatureRequiredAttribute`, `SetsRequiredMembersAttribute`, `ExperimentalAttribute`). A net10.0 consumer of that library still enforces required members: `new Options { }` -> `error CS9035: Required member 'Options.Host' must be set in the object initializer or attribute constructor.` (`fx:e-consumer-req`, exit 1). Anthropic does the same: "`required`, `init`, `[NotNullWhen]` and friends compile on netstandard2.0 through `Shims.cs`" (`CLAUDE.md:29`). Whether ocx targets netstandard2.0 at all is a TFM decision owned by another subtopic; `audit:ocx-cli-contract.md:103` notes the CLI has no win-x86 build.

**`required` is itself an evolution hazard**: `required` members force every `new T { }` site to set them, so adding `required` to an existing property breaks source. See 10: no gate catches it. Constructors annotated `[SetsRequiredMembers]` switch the compiler check off ("the compiler doesn't verify that these constructors do initialize all required members", [required](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/required)); do not use it on public constructors.

### 9. DI-free core

Zero of the 8 SDK exemplar trees reference `Microsoft.Extensions.DependencyInjection` in any `*.csproj`/`*.props`/`*.targets` (command in 12.3); `IServiceCollection` appears in no `src` of pulumi, openai, anthropic, octokit, stripe, testcontainers, CliWrap. Azure.Core references only `Microsoft.Extensions.Configuration.Abstractions` and `Microsoft.Extensions.Hosting.Abstractions` (`Azure__azure-sdk-for-net@32c48fc3d524:sdk/core/Azure.Core/src/Azure.Core.csproj:41-42`) and its DI integration lives in a different package (the Azure dependency rule `dotnet-dependencies-list` restricts the core's NuGet dependencies; the extensions package is outside the pinned sparse clone, so that half is the guideline, not a measurement). Microsoft's [options guidance for library authors](https://learn.microsoft.com/en-us/dotnet/core/extensions/options-library-authors): extension methods are named `Add{Service}`, and "DO NOT use the `Microsoft.Extensions.DependencyInjection` namespace for non-official Microsoft packages." Shape: core `Ocx.Sdk` (no DI), optional `Ocx.Sdk.Extensions.DependencyInjection` with `services.AddOcx(Action<OcxClientOptions>)`, namespace `Ocx.Sdk.Extensions.DependencyInjection`. Because `OcxClient` has an async factory, the extension registers a factory delegate (`AddSingleton<OcxClient>`-style async-init is the consumer package's problem and a reason to keep it out of the core).

### 10. Gates

<a id="10-gates"></a>

Package validation properties ([msbuild-props](https://learn.microsoft.com/en-us/dotnet/core/project-sdk/msbuild-props)): `EnablePackageValidation`, `PackageValidationBaselineVersion`, `PackageValidationBaselineName`, `ApiCompatEnableRuleAttributesMustMatch` (default `false`), `ApiCompatEnableRuleCannotChangeParameterName` (default `false`), `EnableStrictModeForBaselineValidation` (default `false`), `ApiCompatGenerateSuppressionFile`. The baseline must be a published stable package; the fixtures stand a local `RestoreSources` feed in for it (`fx:feed`, `RestoreSources` in `fx:c-v2-*/Ocx.Fx.csproj`).

What each gate caught on the same four breaking-or-not edits (`fx:c-v2-*`, `fx:d-v2-*`; PublicApiAnalyzers package `Microsoft.CodeAnalysis.PublicApiAnalyzers` 3.3.4, files generated with `dotnet format analyzers Lib.csproj --diagnostics RS0016 RS0037 --severity info`, `#nullable enable` prepended by hand):

| change after 1.0.0 | package validation (defaults) | + `ApiCompatEnableRuleAttributesMustMatch=true` | PublicApiAnalyzers (`TreatWarningsAsErrors`) |
|---|---|---|---|
| add positional parameter to record | `CP0002` x2 (ctor, `Deconstruct`) | same | `RS0017` (old ctor gone) + `RS0016` (new items); `Deconstruct` is not in the txt, so unseen |
| add `init` property | pass | pass | `RS0016` until added to `PublicAPI.Unshipped.txt`, then pass |
| unsealed class becomes `sealed` | `CP0009` | `CP0009` | **silent** |
| sealed class becomes unsealed | pass | pass | silent |
| output `string` -> `string?` | **silent** | `CP0015` (`NullableContextAttribute`) | `RS0017` (`Value.get -> string!` vs `string?`) |
| existing `init` property becomes `required` | **silent** | **silent** | **silent** (consumer: `CS9035`) |

Practical stack: `EnablePackageValidation` + baseline + `ApiCompatEnableRuleAttributesMustMatch` on the `dotnet pack` CI job; PublicApiAnalyzers for per-PR diff visibility in review (the txt diff is the review artifact: "RS0017 ... is part of the declared API, but is either not public or could not be found"); plus a grep over the diff for `required` (rule 18). Exemplar practice: stripe runs package validation with a baseline only in CI (`stripe__stripe-dotnet@dbdca6ba5efc:src/Stripe.net/Stripe.net.csproj:27-28`, `PackageValidationBaselineVersion Condition="'$(RunBaselineCheck)' == 'true'"`, invoked at `.github/workflows/ci.yml:232`); openai commits generated API listings (`api/released/` vs `api/in-progress/`, regenerated by `scripts/Export-Api.ps1`, checked by `scripts/Test-ApiCompatibility.ps1`, `api/README.md`); Azure commits `api/Azure.Core.<tfm>.cs`; anthropic runs a `detect-breaking-changes` CI job (`.github/workflows/ci.yml:77`) and still says in its rules that some changes escape it (`CLAUDE.md:75`); pulumi uses PublicAPI txt (2 files, 983 lines, `audit:exemplar-language-shape.md:497`). Every SDK exemplar has *some* mechanical surface gate; none relies on review alone.

### 11. C# 15

<a id="11-csharp15"></a>

- `closed` modifier on classes (C# 15, .NET 11): "A closed class can only be derived from within its declaring assembly", implicitly `abstract`, switch over all direct descendants needs no default arm ([closed](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/closed), [What's new in C# 15](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-15)). On SDK 11.0.100-rc.1: `closed record class JobStatus` with a missing arm gives `warning CS8509 ... the pattern 'Failed' is not covered` (red), a full switch builds clean (`fx:h-sdk11/closed-red`, `closed-green`). On the 10.0.401 target with LangVersion 14: `error CS8652: The feature 'closed classes' is currently in Preview and *unsupported*` plus `error CS0656: Missing compiler required member 'System.Runtime.CompilerServices.IsClosedTypeAttribute..ctor'` (`fx:h-closed-on-sdk10`). So `closed` would also need a polyfill on a .NET 8 target. It is the compiler-checked version of the `internal`-ctor hierarchy (5.6) and applies to `Unknown`-arm unions only if the arm set is allowed to be fixed - which is exactly what ocx's open unions are not.
- `union Pet(Cat, Dog)` parses and builds on 11.0 RC1. library-change-rules: "DISALLOWED: Adding or removing case types from a `union` declaration ... both a binary break and a source break." An open wire union modelled as a C# union breaks on every new `type`.
- **`closed enum` does not exist**: `public closed enum Status { Ok, Failed }` -> `error CS0106: The modifier 'closed' is not valid for this item` on 11.0 RC1. The csharplang proposal `closed-enums.md` (champion issue #9011) is unsettled and says "Adding the modifier to an existing enum, or adding members to a closed enum, can be a breaking change" ([proposal](https://raw.githubusercontent.com/dotnet/csharplang/main/proposals/closed-enums.md)). Even if it ships it is the opposite of what an open wire set needs.
- .NET 11 JSON: `JsonNamingPolicy.PascalCase` and `[JsonNamingPolicy(JsonKnownNamingPolicy.SnakeCaseLower)]` on types are .NET 11 additions ([docs](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/customize-properties)); on the .NET 8 floor use `JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower`.

### 12. Verified on the toolchain

<a id="12-verified"></a>

Fixture root: `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-api-surface-shape/` (parent `global.json` pins 10.0.401; `Directory.Build.props` there sets `net10.0`, `LangVersion 14`, `Nullable enable`, `TreatWarningsAsErrors true`). Re-run everything:

```text
$ cd /home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-api-surface-shape
$ /home/mherwig/.cache/research-lang/dotnet-tools/run.sh bash ./verify.sh
a-secret-red       want=1 got=1 OK        a-secret-green     want=0 got=0 OK      a-secret-green-class want=0 got=0 OK
a-eq-red           want=1 got=1 OK        a-eq-green         want=0 got=0 OK
b-failopen-red     want=1 got=1 OK        b-failopen-green   want=0 got=0 OK
b-enum-red         want=1 got=1 OK        b-enum-green       want=0 got=0 OK      b-switch-red want=1 got=1 OK
c-v2-red           want=1 got=1 OK        c-v2-green         want=0 got=0 OK      c-v2-unseal  want=0 got=0 OK     c-v2-probe want=1 got=1 OK
e-consumer-red     want=1 got=1 OK        e-consumer-green   want=0 got=0 OK      e-consumer-req want=1 got=1 OK    f-ns20-red want=1 got=1 OK
i-an-red           want=1 got=1 OK        i-an-green         want=0 got=0 OK      i-ca1852-public want=0 got=0 OK
j-hier-red         want=1 got=1 OK        d-v2-red-publicapi want=1 got=1 OK      d-v2-green-publicapi want=0 got=0 OK
b-tryparse-red     want=1 got=1 OK        (25 checks, 25 OK; 14 red, 11 green)
```
Ad hoc runs also watched (not in `verify.sh`): `b-cast-red` (CS8524 as error; with `-p:TreatWarningsAsErrors=false` prints `IsDefined=False` and throws `SwitchExpressionException: Non-exhaustive switch expression failed to match its input.`), `c-consumer` against `c-baseline` (green) and `c-v2-probe` (red: `CS9035`, `CS8602`), `g-sdk8` (SDK 8.0.425, red `OCX0001`), `h-sdk11/closed-red` (warning CS8509) and `closed-green` (clean), `h-sdk11/closed-enum` (`CS0106`), `h-closed-on-sdk10` (`CS8652`, `CS0656`), `d-v2-probe` (PublicApiAnalyzers on nullable/sealing/required), and the grep one-liners in the rules below.

Key commands and observed output (condensed):

| claim | command (run from the fixture root, via `run.sh`) | observed |
|---|---|---|
| positional record add-param breaks | `dotnet pack c-v2-red -c Release` | `error CP0002` x2 (ctor + `Deconstruct`), exit 1 |
| init property add is clean | `dotnet pack c-v2-green -c Release` | package created, exit 0 |
| sealing is one-way | `dotnet pack c-v2-probe -c Release` / `dotnet pack c-v2-unseal -c Release` | `CP0009` / clean |
| attribute rule catches nullable | `dotnet pack c-v2-probe -c Release -p:ApiCompatEnableRuleAttributesMustMatch=true -p:ApiCompatEnableRuleCannotChangeParameterName=true` | `CP0009` + `CP0015 ... NullableContextAttribute ... on 'Ocx.Fx.Info'`; `required` still silent |
| analyzers | `dotnet build i-an-red --no-incremental` | `MA0053` x2, `CA1002`, `CA2227`, `CA1819`, `CA1051` x2, `CA1815` x2, `CA1008`, `CA1852`, `CA1812` |
| twin | `dotnet build i-an-green --no-incremental` | `Build succeeded.` |
| CA1852 skips public | `dotnet build i-ca1852-public --no-incremental` | `Build succeeded.` for `public class Client { }` |
| PublicApiAnalyzers | `dotnet build d-v2-red --no-incremental -p:TreatWarningsAsErrors=true` | `error RS0016` x3, `error RS0017: Symbol 'Ocx.Fx.Report.Report(string! Name) -> void' is part of the declared API, but is either not public or could not be found` |
| Experimental | `dotnet build e-consumer-red --no-incremental` | `error OCX0001 ... Suppress this diagnostic to proceed.` |

#### 12.3 Corpus measurements (so a reviewer can reproduce)

```bash
cd /home/mherwig/.cache/research-lang/exemplars/csharp
# sealed vs open public classes per SDK (regex counts `class` and `record class`, partial allowed)
for d in pulumi__pulumi-dotnet/sdk/Pulumi.Automation openai__openai-dotnet/OpenAI/src anthropics__anthropic-sdk-csharp/src/Anthropic \
         Azure__azure-sdk-for-net/sdk/core/Azure.Core/src octokit__octokit.net/Octokit stripe__stripe-dotnet/src/Stripe.net \
         testcontainers__testcontainers-dotnet/src/Testcontainers Tyrrrz__CliWrap/CliWrap; do
  s=$(grep -rhE --include='*.cs' '^\s*public\s+sealed\s+(partial\s+)?(record\s+)?class\s' "$d" | wc -l)
  o=$(grep -rhE --include='*.cs' '^\s*public\s+(partial\s+)?(record\s+)?class\s' "$d" | wc -l)
  echo "$d sealed=$s open=$o"; done
# public positional records in shipped source
grep -rnE --include='*.cs' '^\s*public\s+(sealed\s+|readonly\s+|abstract\s+)*record(\s+(class|struct))?\s+\w+(<[^>]*>)?\s*\(' pulumi__pulumi-dotnet anthropics__anthropic-sdk-csharp/src | grep -v '/Tests\?/'
# DI references in project files
grep -rlE --include='*.csproj' --include='*.props' --include='*.targets' 'Microsoft\.Extensions\.DependencyInjection' pulumi__pulumi-dotnet openai__openai-dotnet anthropics__anthropic-sdk-csharp Azure__azure-sdk-for-net/sdk/core octokit__octokit.net stripe__stripe-dotnet testcontainers__testcontainers-dotnet Tyrrrz__CliWrap
# Experimental ID histogram (openai)
grep -rhoE --include='*.cs' 'Experimental\("[A-Z0-9]+"' openai__openai-dotnet/OpenAI/src | sort | uniq -c
```
Observed: sealed/open as in section 6; 3 shipped positional records (+ 3 in tests/examples); empty DI list; `644 OPENAI001, 165 OPENAI002, 248 SCME0001, 41 SCME0002, 13 SCME0004`. (The zsh `rtk` wrapper rewrote `grep`; absolute `/usr/bin/grep` was used for the runs, same patterns.)

## Normative guidance candidates

Each rule: statement; rationale; **Verify**. Paths use `src` for the SDK source root; adapt the root, keep the patterns.

1. **Public client = one `public sealed class` with a private/internal constructor and a `static async CreateAsync(options, ct)` factory; I/O (binary discovery, `ocx version`) only in the factory.** Why: unseal is free, seal is breaking; ctor I/O cannot be awaited. **Verify:** `grep -rnE --include='*.cs' 'public\s+OcxClient\s*\(' src` returns nothing; `grep -rnE --include='*.cs' 'public\s+static\s+async\s+Task<OcxClient>\s+CreateAsync' src` returns exactly 1 hit; MA0053 (rule 3).
2. **No public interface mirroring a client or handle (`I\w*Client`, `I\w*Commands`).** Why: adding a member to a published interface breaks implementers; abstract classes can grow. **Verify:** `grep -rnE --include='*.cs' '^\s*public\s+interface\s+I\w*(Client|Commands|Handle)\b' src` returns nothing. If a seam is demanded, add `public abstract class OcxRunner { protected OcxRunner() {} ... }` in a minor release.
3. **Seal all public classes; unsealing needs an explicit marker.** Why: sealing later is a `CP0009` break. **Verify:** `.editorconfig`: `dotnet_diagnostic.MA0053.severity = error` + `MA0053.public_class_should_be_sealed = true` + `dotnet_diagnostic.CA1852.severity = error`; plus `grep -rnE --include='*.cs' '^\s*public\s+(partial\s+)?(record\s+)?class\s' src | grep -v 'extension point'` returns nothing.
4. **Leaf exception classes are sealed; one unsealed `OcxException` root.** Why: catch-family root is the only legitimate extension point (testcontainers seals all 14, `audit:exemplar-language-shape.md:401`). **Verify:** `MA0053.exceptions_should_be_sealed = true` (documented option, not fixture-run) and grep rule 3 allows only the root with an `extension point` comment.
5. **Options and config: `public sealed class`, `required` for mandatory members, `init` for optional, no public setters, no constructor parameters.** Why: parameters and positional shape are the unsafe evolution axes. **Verify:** `grep -rnE --include='*.cs' 'public\s[^=(]*\{\s*get;\s*set;\s*\}' src` returns nothing (also `CA2227` error).
6. **No public positional `record`, `record class` or `record struct`.** Why: adding a field is `CP0002` on the ctor and `Deconstruct`. **Verify:** `grep -rnE --include='*.cs' '^\s*public\s+(sealed\s+|abstract\s+)?(readonly\s+)?record(\s+(class|struct))?\s+\w+(<[^>]*>)?\s*\(' src` returns nothing; backstop `EnablePackageValidation` with baseline (rule 18).
7. **Any record holding a secret-named member must be sealed and declare `private bool PrintMembers(StringBuilder)`; prefer a class for credential-bearing types.** Why: generated `ToString` prints every member (`$"{opts}"` leaks). **Verify:** `grep -rlE --include='*.cs' '\brecord\b' src | xargs -r grep -lE '(Password|Secret|Token|ApiKey|Credential)' | xargs -r grep -L 'PrintMembers'` returns nothing (tested: lists only the red fixture).
8. **Result types are `sealed class`, not `record`, when any member is a collection or dictionary.** Why: record `==` compares collections by reference, so equal-looking results are unequal. **Verify:** reading heuristic - for each `public sealed record`, no member type matches `IReadOnlyList|IReadOnlyDictionary|IEnumerable|ImmutableArray|ImmutableList|List<|Dictionary<|\[\]`; mechanical aid `grep -rlE --include='*.cs' '\brecord\b' src | xargs -r grep -nE 'IReadOnly(List|Dictionary)|ImmutableArray|ImmutableList|IEnumerable<'`.
9. **Public collections are `IReadOnlyList<T>` / `IReadOnlyDictionary<K,V>`; never arrays, `List<T>`, setters.** Why: stable abstraction, no aliasing. **Verify:** `.editorconfig` `dotnet_diagnostic.CA1002.severity = error`, `CA1819`, `CA2227`, `CA1051` (all fired in `fx:i-an-red`).
10. **Every value read from ocx output that comes from an open set is an extensible `readonly struct`: string payload, null-normalised `Value`, `IEquatable<T>`, `==`/`!=`, ordinal equality and hash, implicit from `string`, `[JsonConverter]`, static properties for known values.** Why: closed enums throw or fail open on new values. **Verify:** `grep -rnE --include='*.cs' 'JsonStringEnumConverter|Enum\.(Try)?Parse' src` returns nothing; every `public enum` in `grep -rnE --include='*.cs' '^\s*public\s+enum\s' src` is reachable only from method parameters / options (reading heuristic: not a property type of any result class); `CA1815` = error for the struct.
11. **Struct equality is ordinal: no `InvariantCulture*`/`CurrentCulture*`/`IgnoreCase` in wire-token types.** Why: tokens are case-sensitive snake_case; openai's culture-aware `Equals` is an anti-pattern. **Verify:** `grep -rnE --include='*.cs' 'IgnoreCase|CurrentCulture|InvariantCulture' src/Ocx.Sdk/Wire` returns nothing (adjust directory).
12. **Success is an allow-list: `status == Status.Succeeded`, never `status != Status.Failed`; unknown is failure.** Why: `audit:ocx-cli-contract.md:69,117`. **Verify:** `grep -rnE --include='*.cs' '!=\s*\w*(Status|Kind)\.(Failed|Error)' src` returns nothing; a unit test feeds `"future_kind"` to every success predicate and asserts `false`.
13. **JSON binding: one shared `JsonSerializerOptions` with `PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower`; mandatory wire members are `required`.** Why: a key mismatch silently yields `default` (`Ok` for a zero-first enum), `required` turns it into `JsonException`. **Verify:** `grep -rnE --include='*.cs' 'new\s+JsonSerializerOptions' src | wc -l` equals 1 (the shared instance) and that line contains `SnakeCaseLower`; a contract test deserialises each real `ocx` fixture and asserts no `default(T)` struct members.
14. **Never `switch`/`case` on an extensible struct constant; compare with `==` or switch on `.Value` with `const string` labels.** Why: `CS9135`. **Verify:** compiler.
15. **Closed `enum`s only for SDK-sent argv choices; each has a `None`/zero member.** Why: FDG "DO provide a value of zero", `CA1008`. **Verify:** `dotnet_diagnostic.CA1008.severity = error`; reading heuristic for rule 10.
16. **Unfrozen ocx contract parts: `[Experimental("OCXnnnn")]` with `UrlFormat`, one ID per independently graduating feature, IDs listed in one `docs/diagnostics.md`.** Why: consumers opt in per feature via `<NoWarn>`; no `[Obsolete]`/custom attributes/`[RequiresPreviewFeatures]`. **Verify:** `grep -rhoE --include='*.cs' 'Experimental\("[A-Za-z0-9]+"' src | sort | uniq -c` - every ID appears in the diagnostics doc; `grep -rnE --include='*.cs' '\[Experimental\("[A-Za-z0-9]+"\)\]' src` (attribute without `UrlFormat`) returns nothing; `grep -rnE --include='*.cs' 'RequiresPreviewFeatures|\[(Beta|Preview)\]' src` returns nothing; the SDK's own `NoWarn` for OCX IDs lives only in test/sample projects: `grep -rnE --include='*.csproj' --include='*.props' 'OCX[0-9]{4}' src` hits only test projects.
17. **Nullable is on in every library project and public annotations are tracked.** Why: annotations are source contract. **Verify:** `grep -rLE --include='*.csproj' '<Nullable>enable</Nullable>' src` (projects lacking it) returns nothing or Directory.Build.props supplies it; `PublicAPI.Shipped.txt` first line is `#nullable enable` (`head -n1 src/Ocx.Sdk/PublicAPI.Shipped.txt`); `ApiCompatEnableRuleAttributesMustMatch` = `true`.
18. **Evolution gate at pack time: `EnablePackageValidation=true`, `PackageValidationBaselineVersion` = last stable, `ApiCompatEnableRuleAttributesMustMatch=true`, plus PublicApiAnalyzers with `RS0016`/`RS0017`/`RS0037` as errors in CI; reviewers grep the diff for `required`.** Why: each tool misses one break (section 10 matrix); `required` is caught by none. **Verify:** CI runs `dotnet pack -c Release` (not `build`); `dotnet msbuild src/Ocx.Sdk -getProperty:EnablePackageValidation -getProperty:PackageValidationBaselineVersion`; review command `git diff -U0 origin/main...HEAD -- '*.cs' | grep -E '^\+[^+].*\brequired\b'` - every hit must be on a member added in the same diff.
19. **Additive moves only after 1.0: new data = new `init` property (optional) on an existing type; new input = new property on an options class; never a new ctor/method parameter, never a changed default, never a renamed parameter.** Why: library-change-rules DISALLOWED list. **Verify:** `CP0002` from rule 18 plus `ApiCompatEnableRuleCannotChangeParameterName=true`.
20. **netstandard2.0 TFM only with internal polyfills for `IsExternalInit`, `RequiredMemberAttribute`, `CompilerFeatureRequiredAttribute`, `SetsRequiredMembersAttribute`, `ExperimentalAttribute`; never public copies.** Why: `CS0518`/`CS0656` otherwise; public copies collide with consumers'. **Verify:** `grep -rnE --include='*.cs' '^\s*public\s+(sealed\s+|static\s+)*class\s+(IsExternalInit|RequiredMemberAttribute|CompilerFeatureRequiredAttribute|SetsRequiredMembersAttribute|ExperimentalAttribute)\b' src` returns nothing (tested on `fx:e-lib`); or `Polyfill` package without `<PolyPublic>true</PolyPublic>`.
21. **Core package has no DI dependency; `AddOcx` lives in `Ocx.Sdk.Extensions.DependencyInjection` under that package's own namespace.** Why: 0/8 exemplar cores depend on DI; Microsoft forbids the `Microsoft.Extensions.DependencyInjection` namespace for third parties. **Verify:** `grep -rlE --include='*.cs' --include='*.csproj' --include='*.props' 'Microsoft\.Extensions\.DependencyInjection|IServiceCollection' src/Ocx.Sdk` returns nothing.
22. **No C# 15 constructs in 1.x public API: pin `<LangVersion>14</LangVersion>` for the .NET 8/10 build; no `closed`, no `union` in public signatures.** Why: `CS8652`/`CS0656` on the 10.0.401 target; union case lists are breaking. **Verify:** `dotnet msbuild src/Ocx.Sdk -getProperty:LangVersion` prints `14`; `grep -rnE --include='*.cs' '^\s*public\s+(closed|union)\b' src` returns nothing.
23. **Tagged unions: `public abstract` base with an `internal` parameterless constructor, sealed case classes, sealed `Unknown` case carrying the raw `type`.** Why: assembly-closed on C# 14 without new syntax (pulumi `Workspace.cs:35`); unknown is data. **Verify:** `grep -rnE --include='*.cs' 'abstract\s+class' src` - each hit has `internal <Name>()`; consumer-subclass compile test (`CS1729`, `fx:j-hier-red`).
24. **Per-command results/options appear only through handle properties on the client (`client.Package.InstallAsync`); handle classes are `sealed` with `internal` constructors.** Why: mirrors Python's namespace objects; keeps 70 methods off the root. **Verify:** `grep -rnE --include='*.cs' 'public\s+(sealed\s+)?class\s+\w+Commands' src` hits have no `public \w+Commands\(`.

## AI-agent angle

| What the agent characteristically does | Why it is wrong here | Smallest mechanical check |
|---|---|---|
| Writes `public enum Status { Ok, Failed }` plus `[JsonConverter(typeof(JsonStringEnumConverter))]` for every JSON string field | Throws on new values, `(Status)42` is legal, zero member makes a missing key mean `Ok` (`fx:b-enum-red`, `fx:b-failopen-red`, `fx:b-cast-red`) | `grep -rnE --include='*.cs' -e 'JsonStringEnumConverter' -e 'Enum\.(Try)?Parse' src` must be empty |
| Calls `Enum.TryParse<T>(token, ignoreCase: true, out ...)` on wire strings | Accepts `"42"` as an undefined member (`fx:b-tryparse-red`); case folding hides drift | same grep |
| Emits `public record Foo(string A, string B, ...)` for every DTO and options type | `CP0002` on the next field; `ToString` prints secrets; collection `==` lies | positional-record grep (rule 6); `PrintMembers` grep (rule 7) |
| Copies generated-SDK style: open `public class`, `{ get; set; }`, `List<T>` (stripe 6,060 open vs 1 sealed) | Unseal-later is free but seal-later breaks; mutable shared state | MA0053 + CA1002/CA2227 at `error` |
| Generates `IOcxClient` "for mocking" with every command | Interface growth breaks implementers; the fake-executable seam needs no interface | rule 2 grep |
| Invents `[Preview]`, `[Beta]`, or `[Obsolete("preview")]` for unfrozen parts; or forgets the mandatory `DiagnosticId` argument; or uses `[RequiresPreviewFeatures]` | Wrong mechanism: only `[Experimental("ID")]` yields a per-feature opt-in error (`fx:e-consumer-red`) | rule 16 greps |
| Puts the Experimental polyfill / `IsExternalInit` as `public` in a netstandard2.0 library | Collides with consumers' polyfills | rule 20 grep |
| Recommends `ExpandableStringEnum` (Azure) for open sets | It is an Azure.Core base class; `grep ExpandableStringEnum` finds 0 hits under the pinned `sdk/core` clone and the Azure guideline documents a `readonly struct` instead | `grep -rn ExpandableStringEnum src` must be empty |
| Writes `switch (status) { case Status.Ok: ... }` on the extensible struct, hits `CS9135`, "fixes" it by converting to an enum | Reintroduces the closed enum | compiler error is the signal; rule 10 grep catches the revert |
| Uses `InvariantCultureIgnoreCase` in the struct's `Equals` (copied from openai generated code) | Culture/case-insensitive equality for protocol tokens | rule 11 grep |
| Believes `dotnet build` runs package validation | It runs after `Pack` only | CI must call `dotnet pack` (rule 18) |
| Assumes PublicApiAnalyzers or package validation "will catch" any break | `required` additions are caught by neither (section 10 matrix); sealing is missed by PublicApiAnalyzers; nullable by default package validation | the `required` diff grep in rule 18 |
| Adds a ctor/method parameter to "extend" a type, or adds an optional parameter `x = 0` | Binary break; defaults are compile-time constants baked into callers | `CP0002` via pack |
| Newtonsoft-era idioms: `[JsonProperty]`, `JsonConvert`, `[Serializable]` exceptions, `ApplicationException` | Wrong serializer and obsolete patterns for a .NET 8+ SDK | `grep -rnE --include='*.cs' --include='*.csproj' -e 'Newtonsoft' -e '\[Serializable\]' -e 'ApplicationException' src` must be empty |
| Puts `AddOcx(this IServiceCollection)` in the core and in `namespace Microsoft.Extensions.DependencyInjection` | DI dependency in the core; namespace reserved for official packages | rule 21 grep |
| Uses `closed`/`union` because it "just compiled" on an RC SDK | `CS8652` on the 10.0.401 target; union case lists are breaking | rule 22 |

## Contested / evolving

- **Interface-per-client vs sealed concrete.** Octokit, Stripe, Anthropic ship `I…Client` + unsealed class for mocking; Azure ships virtual members + protected ctor; pulumi and the Microsoft library guidance lean to abstract classes/sealed leaves. This report decides sealed concrete + fake executable for 1.0. Flip condition: if downstream users report they cannot unit-test without spawning a process, add an `abstract` runner seam in a minor release (additive), not an interface. Trend as of 2026-10: new Microsoft-authored SDKs keep virtual-for-mocking; newer third-party SDKs (anthropic) keep both. No consensus.
- **Records for models.** Generated SDKs (anthropic) use `sealed record class`; hand-written strict repos use sealed classes; records are ~3% of fleet declarations. The decision here (class by default, sealed non-positional record for derivation) is a judgment weighted by the secret-leak and collection-equality findings; if a result type has only scalar/enum-struct members, a sealed record is harmless and gives free value equality.
- **Extensible struct vs `ApiEnum` wrapper.** OpenAI uses structs (771) and closed enums (273, some throwing on unknown); Anthropic wraps closed enums with raw JSON. The struct is the Azure-documented pattern; a first-class language feature is not coming for open sets (csharplang closed-enums is the opposite feature and unsettled as of the 2026-10 docs).
- **C# 15 `closed` / `union` (.NET 11 RC1, GA 2026-11).** Docs say preview; `closed` classes need `IsClosedTypeAttribute`; union APIs "aren't yet implemented" in full. After GA they become the compiler-checked form of the `internal`-ctor hierarchy for fixed sets, but not for open wire sets. Revisit when the SDK's floor reaches .NET 11 (not before .NET 12 LTS in practice).
- **Case sensitivity of struct equality.** Azure allows case-insensitive "if the service is inconsistent"; openai generated code is culture-insensitive; ocx tokens are lowercase snake_case, so ordinal. If ocx ever returns mixed case, change the one `Equals`, not the callers.
- **Where the surface gate lives.** PublicAPI txt (pulumi, testfx, Polly), generated API listings (Azure, openai), package validation (stripe), custom script (anthropic). The matrix in section 10 shows the combination is stronger than any single tool; the minimum for ocx is package validation + attribute rule + `required` diff grep. Package validation with a baseline cannot run until a stable 1.0.0 exists; before that the ocx contract itself is unfrozen (`audit:ocx-cli-contract.md:28`), which is the reason `[Experimental]` exists in this design.
- **`[Experimental]` removal as a compatibility event.** library-change-rules: "Removing an attribute: REQUIRES JUDGMENT"; tooling default is silent. Treat graduation as a minor-version note, not a break.
- **Audit correction.** The earlier audit's "three generated SDKs are almost entirely open" (`audit:exemplar-language-shape.md:17,112`) is wrong for anthropic when `sealed record class` is counted (1,778 sealed vs 679 open here); the openai and stripe statements stand.

## Sources

| URL | what it is | date/era | why worth reading |
|---|---|---|---|
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/library-change-rules | .NET team's allowed/disallowed API change table (includes `union` case changes, sealing, parameters) | updated 2026-04 | The authoritative list behind every "breaking" claim here |
| https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/breaking-changes | Library guidance: source/binary/behaviour breaks, abstract class over interface, Obsolete policy | 2021, updated 2023 | Interface-vs-abstract-class rule |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/package-validation/overview | Package validation overview (runs after Pack, three validators) | updated 2025-08 | Establishes "pack, not build" |
| https://learn.microsoft.com/en-us/dotnet/core/project-sdk/msbuild-props | MSBuild property reference incl. package validation properties | 2026 | Exact property names and defaults |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/runtime-libraries/preview-apis | Preview APIs: Experimental vs RequiresPreviewFeatures, guidance for library developers | 2025-01 | Per-feature diagnostic ID guidance |
| https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.codeanalysis.experimentalattribute | ExperimentalAttribute API (net-8.0 to net-11.0) | 2026-05 | Targets, DiagnosticId, UrlFormat |
| https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/record | Records reference: ToString, PrintMembers signatures, equality, `with`, positional | updated 2026-08 | PrintMembers modifier table; `closed` mention |
| https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/required | `required` modifier rules, SetsRequiredMembers | updated 2026-09 | Positional parameters cannot be required |
| https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/closed | C# 15 `closed` class modifier | 2026-08 | Preview feature scope (classes only) |
| https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-15 | What's new in C# 15 (unions, closed, collection-expression args) | 2026-09 | Era flags for .NET 11 |
| https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/enum | Framework Design Guidelines: enums (2008, reprinted) | 2008 (historical but still the base text) | "DO NOT use an enum for open sets"; zero value; adding values |
| https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/designing-for-extensibility | FDG: extensibility cost ordering | 2008 | "you can never take it away" (basis of seal-by-default) |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1852 | CA1852 Seal internal types | .NET 7, not default in .NET 10 | Scope limited to non-visible types |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1815 | CA1815 equality on value types | .NET Core 3+ | Extensible-struct requirement |
| https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/customize-properties | System.Text.Json property/enum naming, JsonStringEnumConverter, .NET 9/11 notes | updated 2026-08 | Case-sensitivity default; AOT converter note |
| https://learn.microsoft.com/en-us/dotnet/core/extensions/options-library-authors | Options pattern guidance for library authors | 2023, updated 2026 | DI namespace rule |
| https://azure.github.io/azure-sdk/dotnet_introduction.html | Azure SDK .NET guidelines (client, options, models, enums, exceptions IDs) | living doc, 2026 | Guideline IDs for mocking, options, models |
| https://azure.github.io/azure-sdk/dotnet_implementation.html | Azure SDK .NET implementation guidelines: "Enumeration-like structures" | living doc | Extensible-struct template and comparison guidance |
| https://codeblog.jonskeet.uk/2025/03/27/records-and-collections/ | Jon Skeet, "Records and Collections" | 2025-03-27 | Records have no per-property comparer; collection reference equality |
| https://raw.githubusercontent.com/dotnet/csharplang/main/proposals/closed-enums.md | csharplang closed-enums proposal text | proposal, champion #9011 | Shows closed enums are unshipped and opposite to open sets |
| https://raw.githubusercontent.com/SimonCropp/Polyfill/main/consuming.md | Polyfill package consumption doc | 2026 | `internal` default, `PolyPublic` switch |
| https://raw.githubusercontent.com/dotnet/roslyn-analyzers/main/src/PublicApiAnalyzers/PublicApiAnalyzers.Help.md | PublicApiAnalyzers help (txt files, `#nullable enable`, `~` marker) | main | Tracking nullable in PublicAPI.txt |
| https://github.com/meziantou/Meziantou.Analyzer/blob/main/docs/Rules/MA0053.md | MA0053 Make class or record sealed, options | main | The only analyzer checking public sealing |
| https://github.com/pulumi/pulumi-dotnet (`pulumi__pulumi-dotnet@2a0dca84f09b`) | CLI-wrapping Automation API (abstract Workspace, sealed LocalWorkspace, PulumiCommand seam) | 2026 | Closest structural analogue |
| https://github.com/Tyrrrz/CliWrap (`Tyrrrz__CliWrap@7dbc252fa773`) | Immutable `Command` builder, netstandard2.0 | 2026 | Positional-ctor evolution debt (`Credentials.cs:16-26`) |
| https://github.com/testcontainers/testcontainers-dotnet (`04cbb73fcc58`) | CRTP fluent builders, sealed exceptions | 2026 | Builder pattern cost |
| https://github.com/openai/openai-dotnet (`1f0e8829acac`) | 771 extensible structs, 809 `[Experimental]`, API listings, closed enum that throws | 2026 | Both right and wrong patterns in one tree |
| https://github.com/anthropics/anthropic-sdk-csharp (`ae16e5933f39`) | SDK with `CLAUDE.md` agent rules, `ApiEnum`, sealed record classes | 2026 | A shipping agent-config for exactly this domain |
| https://github.com/Azure/azure-sdk-for-net (`32c48fc3d524`, sdk/core only) | Azure.Core API listings, extensible struct `ContentType` | 2026 | Reference listing format |
| https://github.com/octokit/octokit.net (`7fa5b0fe4a18`) | Interface+unsealed client, 50-parameter model ctor | 2026 | Shows the positional-ctor trap at scale |
| https://github.com/stripe/stripe-dotnet (`dbdca6ba5efc`) | Open mutable entities, package validation in CI | 2026 | Generated-style anti-example; baseline check wiring |
| https://github.com/meziantou/Meziantou.Analyzer (`161b7e948ad3`) | MA0053 implementation and default severities | 2026 | Option default `false` at `ClassMustBeSealedAnalyzer.cs:19` |
| https://github.com/microsoft/testfx (`7226b0c74729`) | CA1852 as warning, PublicAPI txt in 82 files | 2026 | Strict-repo gate precedent |
| audit:ocx-cli-contract.md (`.agents/research/csharp-audit/`) | ocx contract audit: open enums, fail-closed predicates, unfrozen baseline | 2026-10-10 | The domain constraints behind every decision |
| audit:python-sdk-digest.md | Python SDK digest: frozen dataclasses, factory discovery, secret masking | 2026-10-10 | The mirror target |
| audit:exemplar-language-shape.md | Fleet measurements: sealed %, records %, Experimental, PublicAPI usage | 2026-10-10 | Baseline numbers (one count corrected above) |
