---
title: "Microsoft.Extensions.Logging rules for C# code: templates, [LoggerMessage], cost, exceptions, scopes, levels, injection, redaction"
topic: csharp-observability / csharp-observability-logging-rules (feeds csharp-quality/observability.md, CS-OBS-LOG)
agent: deep-dive researcher (research-lang wave 3), one subtopic
model: sonnet (claude-sonnet-5-5)
date_researched: 2026-10-11
sources_count: 33
scope: |
  Covers: every rule an agent follows when code logs through Microsoft.Extensions.Logging (MEL): template analyzers (CA2254, CA1848, CA1873, CA1727, CA2253, CA2017, CA2023),
  the [LoggerMessage] generator (SYSLIB1001-SYSLIB1029, and LOGGEN### when Microsoft.Extensions.Telemetry is referenced), cost of disabled logs (measured), exception logging,
  scopes, level policy, injection (ILogger<T> / ILoggerFactory / NullLogger), secrets and redaction, Serilog as an app-side provider.
  Not covered: whether the ocx SDK should depend on ILogger at all, ActivitySource/Meter/EventSource, and ocx `--log-level` / stderr surfacing (sibling subtopic csharp-observability-library-instrumentation);
  OpenTelemetry exporter setup; log aggregation and retention; XML doc-comment hygiene (code-docs set). Built-in analyzer severities are measured on SDK 10.0.401 (also 8.0.425 and 11.0 RC1); Windows-only behaviour was not needed.
---

# Microsoft.Extensions.Logging rules for C# code

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Template analyzers: which rule fires at which AnalysisLevel](#1-template-analyzers-which-rule-fires-at-which-analysislevel)
   2. [Is CA1848 too noisy to gate? Is LoggerMessage always required?](#2-is-ca1848-too-noisy-to-gate-is-loggermessage-always-required)
   3. [The [LoggerMessage] generator: shape, diagnostics, EventIds](#3-the-loggermessage-generator-shape-diagnostics-eventids)
   4. [The cost of disabled logs, measured](#4-the-cost-of-disabled-logs-measured)
   5. [CA1873 and IsEnabled guards](#5-ca1873-and-isenabled-guards)
   6. [Exception logging](#6-exception-logging)
   7. [Scopes and structured state](#7-scopes-and-structured-state)
   8. [Level policy](#8-level-policy)
   9. [Injection: ILogger of T, ILoggerFactory, NullLogger](#9-injection-iloggert-iloggerfactory-nulllogger)
   10. [Secrets, redaction and data classification](#10-secrets-redaction-and-data-classification)
   11. [Serilog: app-side provider, never a library dependency](#11-serilog-app-side-provider-never-a-library-dependency)
   12. [Testing log output](#12-testing-log-output)
   13. [Version facts: net8.0 floor, SDK 11 RC1](#13-version-facts-net80-floor-sdk-11-rc1)
   14. [Verified on the toolchain](#14-verified-on-the-toolchain)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- **Templates are constants.** A message template must be a compile-time constant with PascalCase named placeholders. Interpolation, concatenation and a variable as the template (CA2254) destroy the structure and are the single most common agent error. CA2254 is only a suggestion at the SDK default and a warning from `10.0-minimum` ([CA2254](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2254); measured, §1).
- **The SDK default catches almost nothing.** At `AnalysisLevel=10.0` (Default mode) only CA2017 (argument count) and CA2023 (invalid braces) are warnings; CA2254, CA2253, CA1873 are suggestions and CA1848, CA1727 are off. Set every logging rule's severity explicitly in `.globalconfig`; it then works at any AnalysisLevel (measured, §1 and §14).
- **Require `[LoggerMessage]` for all logging in `src/**` of code this fleet writes, not only hot paths.** CA1848 fires 1:1 on every `LogX` extension call, with no level exemption, so an agent cannot judge "hot" and a reviewer cannot audit it. Brownfield code gets a floor tier (CA2254/CA2253/CA2017/CA2023/CA1727 as errors, CA1848/CA1873 as suggestions) and a ratchet (§2).
- **Disabled log calls are not free unless generated or guarded.** Measured allocation per disabled `Debug` call: interpolation 64 B, template with two ints 88 B (boxing plus `params object[]`), one string 32 B, `string.Join` argument 120 B; `[LoggerMessage]` 0 B; an `IsEnabled` guard 0 B. `NullLogger.Instance` with extension methods still allocates 88 B (§4).
- **`[LoggerMessage]` still evaluates its arguments at the call site.** The generated `IsEnabled` check does not stop `string.Join(...)` from running first (88 B measured). Guard the call and hoist the expensive value into a local (§4, §5).
- **CA1873 (SDK 10+) is broader than its name.** In 10.0.401 it flags every Trace/Debug/Information/Critical call that passes at least one template argument (the implicit `params` array counts as a creation), exempts Warning and Error, and does not recognise an `IsEnabled` guard around a static or instance `[LoggerMessage]` method (it does around `this ILogger` extension methods). Hoisting the value into a local inside the guard satisfies every form (§5).
- **EventIds: SYSLIB1006 is Info and per-class.** A duplicate `EventId` is silent at the command line; cross-class duplicates are silent even at `severity = error`. Set `SYSLIB1006` (and `LOGGEN002`) to error and add a reflection uniqueness test (Redis pattern). An omitted `EventId` becomes a hash of the method name, so a rename changes it (§3).
- **A `[LoggerMessage]` parameter missing from the template still reaches structured sinks.** SYSLIB1015 is only a warning, yet the value lands in the JSON console `State` (measured with a password). Set SYSLIB1015 to error; allow a state-only property only with a reasoned pragma (Npgsql does) (§3, §10).
- **Pass the exception object, never its text.** `LogError(ex, "...")` sets the `Exception` field; `{Ex}`, `ex.Message` and `ex.ToString()` as arguments do not, and no built-in analyzer flags them (3 of 5 wrong forms are invisible). Enforce with `rg` (§6).
- **Log where you handle, not where you rethrow.** Log-and-rethrow duplicates the event up the stack. A multiline `rg` finds it. Azure's SDK guidelines log thrown exceptions at Warning as a deliberate exception for opt-in client logging (§6, Contested).
- **Scopes: an interpolated `BeginScope($"...")` is flagged by nothing.** The template overload triggers CA1848; the generic `BeginScope<TState>` with an interpolated string triggers no rule. Use a key-value collection or `LoggerMessage.DefineScope`, always in `using` (§7).
- **"Libraries never log at Information" is not what the exemplars do.** Npgsql is 63% Trace/Debug, Redis is 89% Information, Testcontainers is 65% Information. The defensible rule: Information only for rare lifecycle events, never per operation; per-operation detail is Debug or Trace; a library never logs Error for a failure it also throws (§8).
- **A library depends on `Microsoft.Extensions.Logging.Abstractions` only.** Npgsql, Redis and Testcontainers do. The public entry point takes `ILoggerFactory?`, normalised to `NullLoggerFactory.Instance`; DI-built classes take non-nullable `ILogger<T>` (§9, §11).
- **The primary-constructor logger form needs the Abstractions package at 9.0 or later.** On `net8.0` with Abstractions 8.0.3 the generator reports SYSLIB1019; with 10.0.0 it compiles. Pin Abstractions at 10.x for every TFM (§13).
- **Secrets reach logs through four routes, all measured:** an unreferenced `[LoggerMessage]` parameter, a record's `ToString()`, a scope value, and an exception message. Fixes are exclusion, a masking wrapper or `PrintMembers` (agrees with CS-PROC-08), or classification plus redaction (§10).
- **Redaction packages are an app-side tool for regulated data, never a library dependency.** `Microsoft.Extensions.Telemetry` plus `Compliance.Redaction` pull 22 packages; a classified parameter without `EnableRedaction()` is omitted, not leaked (fail-closed, measured); the JSON console `State.Message` degrades to a type name when redaction is on (§10).
- **Serilog is an app-side provider.** Core `Serilog` has no MEL dependency; the bridge is `Serilog.Extensions.Logging`. MEL does not destructure `{@Obj}` (the JSON console prints the literal key `@Obj` and calls `ToString()`) (§11).
- **Test logs with `FakeLogger<T>`, not Moq.** `Verify(l => l.LogInformation(...))` compiles and throws `NotSupportedException` at runtime (§12).

## Findings

Fixture root for every "measured" claim: `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-observability-logging-rules/`. All builds ran through `/home/mherwig/.cache/research-lang/dotnet-tools/run.sh` with SDK 10.0.401 unless stated. Exemplar SHAs: `npgsql__npgsql@9c47244547c2`, `StackExchange__StackExchange.Redis@e7c43a269f53`, `testcontainers__testcontainers-dotnet@04cbb73fcc58`, `dotnet__aspire@af646baee1e8`, `serilog__serilog@bebc7719004f`, `Azure__azure-sdk-for-net@32c48fc3d524`.

### 1. Template analyzers: which rule fires at which AnalysisLevel

Documentation and measurement agree. The "enabled by default in .NET 10" column is from each rule page; the AnalysisLevel columns are the fixture `f1-red` (9 methods, one mistake each) built with `-p:AnalysisLevel=<level> -p:TreatWarningsAsErrors=false`, counting unique diagnostics.

| Rule | What it catches | Docs: default in .NET 10 | `10.0` (Default) | `10.0-minimum` | `10.0-recommended` | `10.0-all` | SDK 8.0.425 |
|---|---|---|---|---|---|---|---|
| CA2254 | template not constant (interpolation, `+`, variable) | suggestion ([CA2254](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2254)) | not shown | warning x3 | warning x3 | warning x3 | x3 |
| CA2253 | numeric placeholder `{0}` | suggestion ([CA2253](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2253)) | not shown | warning x1 | warning x1 | warning x1 | x1 |
| CA2017 | placeholder count differs from argument count | warning ([CA2017](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2017)) | warning x1 | warning x1 | warning x1 | warning x1 | x1 |
| CA2023 | unbalanced or unescaped braces (new in .NET 10 analyzers) | warning ([overview table](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/overview)) | warning x3 (probe) | not run | not run | warning x3 (probe) | absent |
| CA1727 | placeholder not PascalCase | no ([CA1727](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1727)) | off | off | warning x1 | warning x1 | x1 |
| CA1848 | any `LogX`/`Log` extension call instead of a delegate | no ([CA1848](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1848)) | off | off | warning x9 | warning x9 | x9 |
| CA1873 | potentially expensive argument when disabled (SDK 10+) | suggestion ([CA1873](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1873)) | not shown | warning x6 | warning x6 | warning x6 | absent |

Facts that follow from the table:

- AnalysisMode `Minimum` is not "fewer rules than Default" for logging: it promotes CA2254, CA2253 and CA1873 from suggestion to warning ([AnalysisMode semantics](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/overview)). `Recommended` adds CA1848 and CA1727. The default `AnalysisLevel` is `latest`, so new rules appear as the SDK moves; the fleet pins `10.0-all` (CS-BUILD).
- CA2254's page says it is "safe to suppress" when "your use case doesn't require structured logging" or the template comes from a resource file; CA1848 says "Do not suppress a warning from this rule"; CA2253 and CA2017 also say do not suppress ([CA1848](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1848), [CA2253](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2253), [CA2017](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2017)). CA1727 says "safe to suppress"; the generator docs still recommend Pascal casing ([source generation](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/source-generation), [high-performance logging](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/high-performance-logging)).
- An explicit `dotnet_diagnostic.CAxxxx.severity = error` in `.globalconfig` applies at `AnalysisLevel=10.0` too (fixture `f10-posture`: CA1848 x9, CA1873 x6, CA2254 x3, CA2253 x1, CA2017 x1, CA1727 x1 all `error`). Explicit severities are therefore the portable gate; do not rely on a mode (§14).
- Correct, incorrect side by side:

```csharp
// WRONG: CA2254 (and CA1848, CA1873). The template varies per call; placeholder names are lost.
logger.LogInformation($"user {user} logged in");
logger.LogInformation("user " + user + " logged in");
// WRONG: CA2253 (numeric), CA1727 (camelCase), CA2017 (count), CA2023 (braces)
logger.LogInformation("adding {0} and {1}", a, b);
logger.LogInformation("creating {firstName}", first);
logger.LogInformation("a={A} b={B}", a);
logger.LogWarning("payload {\"id\": {Id}}", id);          // unescaped braces; correct form is {{ and }}

// RIGHT: constant template, PascalCase names, one argument per placeholder
logger.LogInformation("User {User} logged in", user);
```

- Placeholders bind by position, never by name: `"{p2}, {p1}", p1, p2` prints p1 first ([Logging in C#](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/overview#log-message-template)). The generator is the exception: it matches template names to parameter names case-insensitively and order does not matter ([source generation](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/source-generation)).
- Format specifiers are allowed in templates (`{Value:E}`, `{Date:MMMM dd, yyyy}`) and are culture-sensitive at render time; CA1305 does not see inside templates (same Learn page).

### 2. Is CA1848 too noisy to gate? Is LoggerMessage always required?

**Observed noise.** CA1848 produced exactly one diagnostic per extension call (9 diagnostics for 9 calls in `f1-red`, including `LogError` and the `ILogger.Log` overloads) and also fires on the `BeginScope(string, params object[])` extension (fixture `f5-scope`, line 9). It never exempts a level. Under `10.0-recommended` that means a brownfield app with N existing `LogX` calls gets N errors at once. That is noise for migration and zero noise for new code.

**What the evidence says about "always" versus "hot path only".**

| Source | Position |
|---|---|
| [CA1848](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1848) | "For high-performance logging scenarios, use the LoggerMessage pattern"; "Do not suppress a warning from this rule." |
| [Logging in C# overview](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/overview) | Source generation "is usually a better alternative"; "The tradeoff is that using this technique requires a bit more code." |
| [Library authors](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/library-guidance) | "For most situations, the source generator is recommended"; the extension approach is for those "willing to give up those advantages to make the code more concise." |
| `npgsql__npgsql@9c47244547c2:src/Npgsql/LogMessages.cs` | 73 `[LoggerMessage]` methods behind 11 `IsEnabled(LogLevel...)` guards for the expensive call sites (e.g. `NpgsqlConnection.cs:238`). |
| `StackExchange__StackExchange.Redis@e7c43a269f53:src/StackExchange.Redis/LoggerExtensions.cs` | 124 `[LoggerMessage]` methods with explicit EventIds. |
| `testcontainers__testcontainers-dotnet@04cbb73fcc58:src/Testcontainers/Logging.cs:32-38` | 46 `[LoggerMessage]` methods (no EventId). |
| `dotnet__aspire@af646baee1e8:src/Aspire.Hosting/Dcp/DcpPipelineBuilder.cs:25` | App/framework: 73 `LogX` extension calls with templates, 0 `[LoggerMessage]`, 0 interpolated calls; `Directory.Build.props:19` sets TWAE and no `AnalysisLevel`/`AnalysisMode` appears anywhere in the repo's props, targets, csproj or editorconfig files, so CA1848 is off. |

**Decision.** For code the fleet writes (library, service or app), `[LoggerMessage]` is required for every log call in `src/**`, with CA1848 and CA1873 at `error`. Reasons: (1) CA1848 is mechanical and level-blind, so "hot path only" would need a judgement an agent cannot be audited on; (2) the extra boilerplate costs an agent nothing; (3) the generator also removes four other failure classes at compile time (count mismatch becomes SYSLIB1014/1015, malformed template SYSLIB1022, exception-in-template SYSLIB1013, level duplication SYSLIB1012). Two carve-outs, each a scoped `.editorconfig` section: `tests/**` and one-shot `samples/**` set CA1848 and CA1873 to `none` (templates must still be constant). For **brownfield** code that already uses `LogX` calls, the floor tier applies (CA2254, CA2253, CA2017, CA2023, CA1727 at `error`; CA1848, CA1873 at `suggestion`) and every new file is written with `[LoggerMessage]`; the ratchet is "CA1848 count does not rise" by `dotnet build -p:AnalysisLevel=10.0-recommended` diagnostic count.

### 3. The [LoggerMessage] generator: shape, diagnostics, EventIds

**Shape** ([source generation](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/source-generation), [LoggerMessageAttribute](https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.logging.loggermessageattribute)):

```csharp
internal static partial class LogMessages
{
    [LoggerMessage(EventId = 1001, Level = LogLevel.Debug, Message = "Resolved {Binary} from {Source}")]
    internal static partial void BinaryResolved(this ILogger logger, string binary, string source);

    [LoggerMessage(EventId = 1002, Level = LogLevel.Warning, Message = "Read of {Id} failed")]
    internal static partial void ReadFailed(this ILogger logger, Exception exception, string id);   // exception is NOT in the template
}
```

- The method is `partial`, returns `void`, its name and parameter names do not start with `_`, it has no body, and it may not use `params`, `scoped`, `out` or `ref struct` parameters. A static method needs an `ILogger` parameter (add `this` for an extension); an instance method reads an `ILogger` field, or, since the .NET 9 package, a primary-constructor parameter (§13). The first `ILogger`, `LogLevel` and `Exception` parameters are special; later ones are ordinary arguments ([source generation](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/source-generation)).
- `Level` may be omitted if a `LogLevel` parameter is supplied (dynamic level); `Message` may be omitted (then every parameter is state-only and SYSLIB1015 fires).
- Generated code (read from `f3-alloc/gen/.../LoggerMessage.g.cs`): a `static readonly Action<...>` built by `LoggerMessage.Define<...>(level, new EventId(id, nameof(Method)), "template", new LogDefineOptions { SkipEnabledCheck = true })` plus a wrapper that does `if (logger.IsEnabled(level)) { __Callback(logger, args, null); }`. So the template is parsed once, value types are not boxed, and the enabled check is already there. With `SkipEnabledCheck = true` the wrapper calls the delegate directly.
- The event **name** is `nameof(Method)`. Renaming a method changes `EventId.Name`, which structured sinks expose; Redis documents this as a shipped contract (`StackExchange__StackExchange.Redis@e7c43a269f53:src/StackExchange.Redis/LoggerExtensions.cs:67-70`: "renaming any method here is NOT a refactor ... pin the old one via the attribute's EventName").

**Diagnostics, measured and read from source.** IDs, severities and messages are from [`DiagnosticDescriptors.cs`](https://raw.githubusercontent.com/dotnet/runtime/main/src/libraries/Microsoft.Extensions.Logging.Abstractions/gen/DiagnosticDescriptors.cs) and the resource file; "obs" is what `f2-red`/`f2c-red` printed under `10.0-all` with TWAE off.

| ID | Default | Meaning | Obs |
|---|---|---|---|
| SYSLIB1001 / 1003 | Error | method / parameter name starts with `_` | error |
| SYSLIB1002 | Warning | `LogLevel` mentioned in template (and level not in attribute) | not triggered by a level parameter when `Level=` is set |
| SYSLIB1005 | Error | required type not found (missing Abstractions) | n/a |
| SYSLIB1006 | **Info** | multiple methods use event id N **in the same class** | silent at the command line; error only if raised (see below) |
| SYSLIB1007 / 1009 / 1010 | Error / Warning / Error | must return void / should be static / must be partial | 1010-class error is CS0260 when the containing type is not partial |
| SYSLIB1008 | Error | static method without an `ILogger` argument | error |
| SYSLIB1012 | Warning | redundant `Error:` / `Warning:` qualifier in message | warning |
| SYSLIB1013 | Warning | template names the `Exception` parameter | warning (docs call it `SYSLIB0025`, a typo; the real ID is 1013) |
| SYSLIB1014 | **Error** | template placeholder has no matching parameter | error (a mismatch also produces a secondary CS0103) |
| SYSLIB1015 | **Warning** | parameter not referenced by the template | warning |
| SYSLIB1016 | Error | method has a body | error (with CS0759) |
| SYSLIB1017 | Error | no `LogLevel` in attribute or parameters | error |
| SYSLIB1018 | Warning | template names the `ILogger` parameter | warning |
| SYSLIB1019 / 1020 | Error | no / multiple `ILogger` fields on the type | 1019 error |
| SYSLIB1021 | Error | same template name with different casing | **no diagnostic observed** for `"{User} {user}"`; the descriptor exists but the parser source has no reporter |
| SYSLIB1022 | Error | malformed format string | error (`"x {A"`) |
| SYSLIB1023 | Error | more than 6 arguments | not triggered: an 8-parameter `[LoggerMessage]` built clean (`f11-scopecost`); the six-argument limit belongs to `LoggerMessage.Define` |
| SYSLIB1024 / 1028 / 1029 | Error | `out` / `params`,`scoped` / `ref struct` parameter | n/a |
| SYSLIB1025 | Warning | multiple methods use event **name** N in the class | warning |
| SYSLIB1026 | Error | generator unavailable below the C# version it requires | n/a |
| SYSLIB1027 | Info | primary-constructor `ILogger` is hidden by a field | n/a |

**EventId behaviour (measured).**

- `SYSLIB1006` default severity is Info: `f2b-red` (two methods, `EventId = 1`) builds `exit=0` with no output at the default severities. With `dotnet_diagnostic.SYSLIB1006.severity = error` the same build fails with `error SYSLIB1006`; the green twin with ids 1 and 2 passes (§14).
- The check is **per class**: `f2e-crossclass` (`LogA.A` and `LogB.B` both `EventId = 1`) builds `exit=0` with `SYSLIB1006 = error`. Cross-class collisions need a test; Redis ships one: it reflects over every `[LoggerMessage]`, asserts `EventId >= 0` and no duplicates, and also asserts the list is non-empty so the test cannot go vacuous (`StackExchange__StackExchange.Redis@e7c43a269f53:tests/StackExchange.Redis.Tests/LoggerEventIdTests.cs:19-45`; its comment cites parallel branches both taking "the next free number").
- Omitting `EventId` is allowed. The generator then derives it from a non-randomised hash of the method name (or `EventName`): `new EventId(285071031, nameof(NoId))` in the generated file; the parser line is `eventId = GetNonRandomizedHashCode(string.IsNullOrWhiteSpace(eventName) ? logMethodSymbol.Name : eventName)` ([`LoggerMessageGenerator.Parser.cs`](https://raw.githubusercontent.com/dotnet/runtime/main/src/libraries/Microsoft.Extensions.Logging.Abstractions/gen/LoggerMessageGenerator.Parser.cs), line 234). Redis's test comment ("the generator then emits 0") is out of date for the current generator. Testcontainers omits ids entirely (`Logging.cs:32-38`); Npgsql publishes a `public static class NpgsqlEventId` with constants in ranges (`OpeningConnection = 1000`, `NpgsqlEventId.cs:6-11`), which makes ids a public contract. Rule: libraries set explicit ids and treat them as API; apps may use the hash default but must not filter on ids.
- Referencing `Microsoft.Extensions.Telemetry` swaps in `Microsoft.Gen.Logging`; the same duplicate-id mistake is then **`LOGGEN002`, a Warning** ([`DiagDescriptors.cs`](https://raw.githubusercontent.com/dotnet/extensions/main/src/Generators/Microsoft.Gen.Logging/Parsing/DiagDescriptors.cs); fixture `f2d-telemetry-gen`: `warning LOGGEN002`). Gate both IDs.

**SYSLIB1015 is the important one.** A parameter that the template omits is still placed in the log state. Npgsql does this on purpose: `OpeningConnection(ILogger, string Host, int Port, string Database, string ConnectionString)` references only three placeholders, and the file starts with `#pragma warning disable SYSLIB1015` and `SYSLIB1006` (`npgsql__npgsql@9c47244547c2:src/Npgsql/LogMessages.cs:10-11,18-21`). The value is the data source's `ConnectionString`, documented as password-free unless `Persist Security Info=true` (`NpgsqlDataSource.cs:25-26`). Under this fleet's rule that is allowed only with a pragma plus a one-line reason, because the same construct is how a password leaks (§10).

### 4. The cost of disabled logs, measured

Fixture `f3-alloc`: Release, `TieredCompilation=false`, 200 000 calls after 1 000 warm-up calls, `GC.GetAllocatedBytesForCurrentThread()` delta. The logger is created by a `LoggerFactory` with minimum level Information and a provider that would accept everything, so Debug calls are filtered by the pipeline. The numbers were identical on `net10.0` and on `net8.0` (`out_alloc_net10.txt`, `out_alloc_net8.txt`, and a rerun).

| # | Disabled `Debug` call | Bytes per call |
|---|---|---|
| A | `LogDebug($"user {user} a={a} b={b}")` | 64 |
| B | `LogDebug("a={A} b={B}", a, b)` (two `int`s: boxing + `object[]`) | 88 |
| C | `LogDebug("user {User}", user)` (one string: `object[]`) | 32 |
| D | `LogDebug("nothing to see")` (no arguments) | 0 |
| E | `LogDebug("items {Items}", string.Join(",", data))` | 120 |
| F | `if (log.IsEnabled(Debug)) log.LogDebug("a={A} b={B}", a, b)` | 0 |
| G | `[LoggerMessage]` Debug, two ints | 0 |
| H | `[LoggerMessage]` Debug, string + two ints | 0 |
| I | `if (IsEnabled) Gen.Items(log, string.Join(...))` with `SkipEnabledCheck = true` | 0 |
| J | `Gen.ItemsNoSkip(log, string.Join(...))` (default enabled check) | **88** |
| K | `NullLogger.Instance.LogDebug("a={A} b={B}", a, b)` | **88** |
| L | `[LoggerMessage]` call on `NullLogger.Instance` | 0 |

Reading it:

- Interpolation (A) is not the worst allocator in this shape; its sin is that it is evaluated eagerly and destroys structure. The unconditional costs are the `params object[]` array (C), boxing (B), and any computed argument (E, J).
- Rows G, H, L: the generated wrapper checks `IsEnabled` first, so a disabled call costs nothing, with a real logger or `NullLogger`.
- Row J is the trap: the `string.Join` runs before the generated method is entered. The generated `IsEnabled` check protects the formatting, not the caller's argument expression. [Library guidance](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/library-guidance) says the same ("parameters that might be expensive to compute are only evaluated when truly needed") and recommends `SkipEnabledCheck = true` plus a manual guard.
- Row K: a library that defaults to `NullLogger.Instance` but uses extension calls still pays 32-120 B per call. "Null logger default" removes output, not cost; only `[LoggerMessage]` or a guard removes the cost.
- The docs state the mechanism: extension methods box value types and parse the template on every call; `LoggerMessage` parses once ([CA1848](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1848), [high-performance logging](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/high-performance-logging)); an `IsEnabled` guard avoids "value-type boxing and an allocation of `object[]`" (same page).
- Do not double-guard generated methods whose arguments are already cheap: row G/H show 0 B without any guard. A guard is only for computed arguments.

### 5. CA1873 and IsEnabled guards

CA1873 ("Avoid potentially expensive logging", SDK 10, added by [roslyn-analyzers PR 7290](https://github.com/dotnet/roslyn-analyzers/issues?q=CA1873)) reports an argument as expensive when it is an invocation, a reference-type object creation, a boxing conversion, an anonymous object, a collection expression, an `await`, or a non-empty array creation, and it treats the implicit `params object[]` creation as an array creation ([source](https://github.com/dotnet/roslyn-analyzers/blob/main/src/NetAnalyzers/Core/Microsoft.NetCore.Analyzers/Performance/AvoidPotentiallyExpensiveCallWhenLogging.cs): `IsPotentiallyExpensive`, `IsEmptyImplicitParamsArrayCreation`). Measured on 10.0.401 (`f1-probe`):

| Call | CA1873 |
|---|---|
| `LogTrace/LogDebug/LogInformation/LogCritical("u {U}", u)` with a plain string parameter | **yes** |
| the same with a constant `"lit"` or a field | **yes** |
| `Log(LogLevel.Information/Debug, "u {U}", u)` | yes |
| `LogWarning(...)`, `LogError(...)`, `Log(LogLevel.Warning, ...)`, even with `string.Join(...)` | **no** (exempt) |
| `LogDebug("nothing")` (no argument) | no |
| `[LoggerMessage]` method called with `string.Join(...)` | yes |
| `[LoggerMessage]` method called with `d.Length` | no |
| `if (logger.IsEnabled(Debug)) logger.LogDebug("...", string.Join(...))` | no |
| `if (logger.IsEnabled(Debug)) logger.ItemsExt(string.Join(...))` (`this ILogger` generated extension) | no |
| `if (logger.IsEnabled(Debug)) Gen.ItemsStatic(logger, string.Join(...))` (static, logger as parameter) | **yes (false positive)** |
| `if (logger.IsEnabled(Debug)) ItemsInstance(string.Join(...))` (instance generated method) | **yes (false positive)** |
| guard, then `string joined = string.Join(...)` in a local, then the call (any form) | no |

Consequences:

- Under `10.0-minimum` and above every `LogInformation("...{X}", x)` is an error-in-waiting. CA1873 is therefore coupled to CA1848: if code uses extension calls, either guard each call or accept the diagnostics; with `[LoggerMessage]` it fires only on computed arguments.
- The guard-recognition gap matches [issue 7690](https://github.com/dotnet/roslyn-analyzers/issues?q=CA1873) ("False positives when log message wrapped in `IsEnabled()` check", opened 2025-06-11). It was still present in SDK 10.0.401 and 11.0 RC1 for the static and instance generated forms.
- Safe pattern that passes every form and avoids double evaluation:

```csharp
if (logger.IsEnabled(LogLevel.Debug))
{
    string joined = string.Join(",", data);   // computed only when enabled
    LogMessages.Items(logger, joined);        // [LoggerMessage(..., SkipEnabledCheck = true)]
}
```

- SDK 8.0.425 has no CA1873 and no CA2023 (§1), so a repo that builds on the 8 SDK in CI would silently lose both. The fleet pins SDK 10.0.401 (CS-BUILD), so this only bites contributors on an older global SDK.

### 6. Exception logging

Facts (fixtures `f6-exc` and `f4-redact exc`):

```csharp
// RIGHT: exception object first; the Exception field is populated, the template has no exception placeholder
logger.ReadFailed(ex, id);                       // [LoggerMessage] with Exception parameter, not in template
logger.LogError(ex, "Read of {Id} failed", id);  // extension form

// WRONG, and which tool notices:
logger.LogError(ex.Message);                     // CA2254 + CA1848   (flagged)
logger.LogError("failed", ex);                   // CA2017            (flagged: ex is an extra template argument)
logger.LogError("failed: {Ex}", ex);             // nothing           (ex lands in State["Ex"], Exception field is empty)
logger.LogError("failed: {Message}", ex.Message);// nothing           (stack trace and type lost)
logger.LogError("failed: {Ex}", ex.ToString());  // nothing           (string, not the exception)
```

- JSON console output for the three non-flagged shapes (`out_exc.txt`): the correct form emits `"Exception":"System.InvalidOperationException: boom"` and `"State":{"Id":7,...}`; `{Ex}` emits `State.Ex` and no `Exception` field; `{Message}` emits `State.Message:"boom"` and no exception. Providers that key on the exception (Application Insights exception telemetry, OpenTelemetry `exception.*` attributes) only see the first. "Exception logging is provider-specific" ([Logging in C#](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/overview#log-exceptions)).
- The generator keeps the exception out of the template: `SYSLIB1013` warns when a template names it ("implicitly taken care of"); the exception is the first `Exception` parameter, a second one is an ordinary argument ([source generation](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/source-generation)).
- Aspire shows both sides: `dotnet__aspire@af646baee1e8:src/Aspire.Hosting/Dcp/DcpExecutor.cs:302` passes the exception correctly (`LogDebug(ex, "One or more monitoring tasks terminated with an error.")`), while `DcpPipelineBuilder.cs:25` logs only `retry.Outcome.Exception?.Message` and `ExecutableCreator.cs:93` passes `ex` and also repeats `{Message}`. Mechanical `rg` (§Normative LOG-08) catches the `.Message` form; the repeated form is harmless.
- **Log-and-rethrow.** `catch (...) { logger.LogError(ex, ...); throw; }` records the same failure once per frame that does it. Detect with a multiline pattern (§14, V3, 1 hit in `f6-exc`, 0 in `f6-green`). The guidance is "log at the handler, not the rethrower". Azure's SDK guidelines take the opposite position for client libraries: "Log thrown exceptions as `Warning`" and "Do not log self-healing events, such as automatic retries" ([Azure SDK general guidelines](https://azure.github.io/azure-sdk/general_implementation.html)). For this fleet: a library may log at Debug where it converts or swallows an error; it never logs Error for a failure it also throws (§8).

### 7. Scopes and structured state

- `BeginScope` returns an `IDisposable`; the scope lasts until disposed; only providers that support scopes show them, and the console provider needs `IncludeScopes = true` ([Logging in C#](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/overview#log-scopes)). Always `using var scope = ...`; a discarded `_ = logger.BeginScope(...)` never ends (no built-in analyzer flagged it in `f5-scope`, line 15; CA1030 fired for the method name only).
- Measured analyzer coverage of the four spellings (`f5-scope`, 10.0-all):

| Spelling | Result |
|---|---|
| `logger.BeginScope($"op {id}")` | **nothing** (binds to the generic `BeginScope<TState>(TState)` with a string state, not the template extension) |
| `logger.BeginScope("op {OpId}", id)` | CA1848 |
| `logger.BeginScope(new Dictionary<string, object?> { ["OpId"] = id })` | nothing (correct) |
| `logger.BeginScope(new List<KeyValuePair<string, object?>> { new("OpId", id) })` | nothing (correct) |

- Prefer a key-value state (what the Learn example uses: `List<KeyValuePair<string, object>>`) or a delegate from `LoggerMessage.DefineScope<T>("op {OpId}")` (verified: `f9-testing` and `f6-green` build clean under 10.0-all+TWAE and `FakeLogger` records the scope). `[LoggerMessage]` cannot define a scope; the Learn page combines it with `BeginScope` ([high-performance logging](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/high-performance-logging)). The Serilog bridge documents the same split: the string-template extension adds a single `Scope` property; passing a dictionary or tuple to `BeginScope<TState>` yields real properties and is "far better" ([serilog-extensions-logging](https://github.com/serilog/serilog-extensions-logging)).
- Scope values are part of the log record: a password in a scope is a password in the log (`f4-redact red` #3: `"Scopes":[{"Password":"hunter2-SECRET"}]`). The JSON console renders a dictionary scope's `Message` as the type name `System.Collections.Generic.Dictionary`2[...]` (cosmetic).
- A scope allocates on every call, even when no provider reads scopes (fixture `f11-scopecost`, Release, 200 000 calls, bytes per call): `BeginScope("op {OpId}", id)` 200 B, `BeginScope(new Dictionary<...>)` 336 B, `LoggerMessage.DefineScope<string>` 152 B, identically for a provider with and without `ISupportExternalScope`. `DefineScope` is the cheapest; none is free. Create one scope per operation, not per item.

### 8. Level policy

Microsoft's table ([Logging in C#](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/overview#log-level)): Trace "might contain sensitive app data ... disabled by default and should not be enabled in production"; Debug "for debugging and development. Use with caution in production due to the high volume"; Information "tracks the general flow of the app. Might have long-term value"; Warning "abnormal or unexpected events"; Error "errors and exceptions that can't be handled ... failure in the current operation or request"; Critical "failures that require immediate attention". Default log level when unset is `Information`, and `Warning` through `Critical` "should produce few log messages". Azure's guidance for client libraries: consumers run at Warning or above in production; Informational "when a function operates normally"; Verbose "detailed troubleshooting"; Warning "when a function fails to perform its intended task ... Do not log self-healing events, such as automatic retries" ([Azure SDK](https://azure.github.io/azure-sdk/general_implementation.html)).

Exemplar level mix, computed by counting `Level = LogLevel.X` inside `[LoggerMessage(...)]` attributes:

| Library | Trace | Debug | Information | Warning | Error | Total |
|---|---|---|---|---|---|---|
| Npgsql (`LogMessages.cs`) | 15 | 31 | 18 | 3 | 6 | 73 |
| StackExchange.Redis (`LoggerExtensions.cs`) | 0 | 0 | 110 | 3 | 11 | 124 |
| Testcontainers (`Logging.cs`) | 0 | 5 | 30 | 11 | 0 | 46 |

So "libraries never log Information" is not industry practice: Redis and Testcontainers use Information as their main level because logging is opt-in and event-poor (connection and container lifecycle). The commission's premise ("default to Debug/Trace, never Information") is therefore **narrowed**: the fleet rule is below.

| Level | Library (SDK, client, driver) | Application / service |
|---|---|---|
| Trace | payload-level detail that may include data (commands, parameters, bodies); opt-in, never secrets | same |
| Debug | per-operation steps and decision points (resolved binary, spawned process, retry attempt) | diagnostics for developers |
| Information | **rare lifecycle events only** (client created, binary downloaded once, connection pool opened); never per call | request/job summaries, state changes with long-term value |
| Warning | degraded but continuing in a way the caller cannot see (fallback taken, deprecated input); not automatic retries | same |
| Error | only for a failure that is **not** surfaced to the caller as an exception or result (background work) | operation failed at the handling boundary, logged once |
| Critical | never | data loss, cannot start |

Rationale: consumers commonly leave `Default: Information` and filter `Microsoft`; a library logging per call at Information fills their sink, while Trace/Debug are off by default. A library that throws should not also log Error (the caller decides severity; double reporting).

### 9. Injection: ILogger of T, ILoggerFactory, NullLogger

- [Library guidance](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/library-guidance): accept `ILoggerFactory` at "public entry point APIs for a library or public constructors of types that might create helper classes internally", and call `CreateLogger` per class so each gets its own category; accept `ILogger<T>` when the object "is only used inside one class and never shared", for example a constructor of a class created by DI. For stable public APIs, `ILoggerFactory` "accommodates creating new `ILogger<T>` objects ... without changing the public API". Defaults: `NullLogger.Instance`, `NullLogger<T>`, `NullLoggerFactory.Instance`, `NullLoggerProvider.Instance`; "null logging differs from defining types as nullable" ([NullLogger](https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.logging.abstractions.nulllogger)).
- Exemplars: Npgsql's `NpgsqlLoggingConfiguration` takes an `ILoggerFactory` and creates six named categories (`Npgsql.Connection`, `.Command`, `.Transaction`, `.Copy`, `.Replication`, `.Exception`), default `NullLoggerFactory.Instance` (`npgsql__npgsql@9c47244547c2:src/Npgsql/NpgsqlLoggingConfiguration.cs:11-24`); the builder method is `UseLoggerFactory(ILoggerFactory?)` (`NpgsqlDataSourceBuilder.cs:107`). Redis exposes `ConfigurationOptions.LoggerFactory` as nullable (`ConfigurationOptions.cs:853-856`) and stores `ILogger<ConnectionMultiplexer>?` with `configuration.LoggerFactory?.CreateLogger<...>()` (`ConnectionMultiplexer.cs:169`), guarding with `log is null`. Testcontainers takes `.WithLogger(ILogger)`, ships an opt-in `ConsoleLogger.Instance` (minimum Information, `Logger.cs:57-61`) and uses `NullLogger.Instance` internally (`BuildKitImageOperations.cs:306`). All three reference only `Microsoft.Extensions.Logging.Abstractions` (`Npgsql.csproj:16`, `StackExchange.Redis.csproj:22`, `Testcontainers.csproj:14`).
- Decision: a library's public surface takes `ILoggerFactory? loggerFactory = null` (constructor parameter or an options property) and normalises once to `loggerFactory ?? NullLoggerFactory.Instance`; internal types get `ILogger` from `factory.CreateLogger<T>()`. A class created by a DI container takes non-nullable `ILogger<T>`. Nothing creates a factory (`LoggerFactory.Create(...)`) or reads one from a static service locator in `src/`. This agrees with CS-API-01 (sealed `OcxClient` with static `CreateAsync`, no public seam): the factory is an optional parameter of `CreateAsync` or of its options type, not a seam type.
- `ILogger<T>` in the constructor of a type that users `new` themselves is the usual agent mistake: the caller must then construct `NullLogger<T>.Instance` or a factory just to instantiate your type.

### 10. Secrets, redaction and data classification

**Four leak routes, all red in `f4-redact` (JSON console, `AddJsonConsole`, `IncludeScopes = true`):**

```text
red 1  Msgs.Login(log,"alice",Pw)            "State":{"password":"hunter2-SECRET","User":"alice",...}   // SYSLIB1015 param, template omits it
red 2  LogInformation("creds {Creds}", rec)  "Message":"creds Creds { User = alice, Password = hunter2-SECRET }"  // record ToString
red 3  BeginScope(dict{Password})            "Scopes":[{"Message":"System.Collections.Generic.Dictionary`2[...]","Password":"hunter2-SECRET"}]
red 4  LogError(new Exception($"... password={Pw}"), "login failed")  "Exception":"...bad login password=hunter2-SECRET"
```

`grep -c hunter2` over the four outputs: red 4 lines, wrapper 0, excluded 0, redacted 0, classified-not-enabled 0 (`out_*.txt`).

**Greens (each watched):**

| Fix | Output | When |
|---|---|---|
| Do not pass it (`LoginOk(log,"alice")`) | `"State":{"User":"alice",...}` | default |
| Masking wrapper: `readonly struct Secret { ToString() => "***" }` as the argument | `"Message":"login alice ***"`, `State.Secret:"***"` | small SDKs, libraries |
| `record` with a `PrintMembers` override, as CS-PROC-08 requires | `"creds SafeCreds { User = alice, Password = *** }"` | types that hold secrets |
| `[Private] string password` with `EnableRedaction()` + `AddRedaction(r => r.SetRedactor<StarRedactor>(Taxonomy.Private))` | `"Message":"login alice ***"`, `State.Password:"***"` | apps handling regulated data |

- Agreement with CS-PROC-08: types that hold secrets already override `PrintMembers` to print sizes; "exceptions and logs carry the ocx verb, never argv or env values". The same rule applies to any log argument: log the verb (`install`, `login`), not argv, env or stdin. The SDK's captured-stderr redactor (CS-PROC-08) must run before any text is passed as a log argument.
- **Redaction package cost.** `Microsoft.Extensions.Telemetry` 10.10.0 plus `Microsoft.Extensions.Compliance.Redaction` 10.10.0 plus the console provider resolve to **22 packages** (`dotnet list package --include-transitive`, `out_f4_packages.txt`), including `AmbientMetadata.Application`, `DependencyInjection.AutoActivation`, `Logging.Configuration`, `ObjectPool`, `Options.ConfigurationExtensions`. Redactors: `ErasingRedactor` (empty string, the default fallback) and `HmacRedactor` (HMACSHA256, key at least 44 base64 characters, still experimental: `EXTEXP0002`) ([data redaction](https://learn.microsoft.com/en-us/dotnet/core/extensions/data-redaction)). Classification: `DataClassification`, `DataClassificationAttribute`, `DataClassificationSet` ([data classification](https://learn.microsoft.com/en-us/dotnet/core/extensions/data-classification)). `[LogProperties]` (in `Microsoft.Extensions.Telemetry.Abstractions`) logs a parameter's public properties as tags ([API](https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.logging.logpropertiesattribute)).
- **Fail-closed behaviour (measured).** With `Microsoft.Extensions.Telemetry` referenced but `EnableRedaction()` not called, the `[Private]` parameter was not leaked: the output was `login alice (null)` with `Password=<omitted> ([Fx:Private])` (`out_classified_not_enabled.txt`). With redaction enabled, the JSON console's `State.Message` becomes `Microsoft.Extensions.Logging.ExtendedLogger+ModernTagJoiner` (cosmetic; the top-level `Message` is correct).
- **When warranted.** Only for an application that must log regulated fields (PII, payment data) and has the telemetry pipeline already; the Learn page says "always use redaction when logging potentially sensitive data" and "regularly audit your logs". Everywhere else (libraries, SDKs, tools) the rule is exclusion: do not log the field. A library never references these packages (22 transitive packages for an opt-in feature the consumer owns; the consumer can still wrap what the library logs).
- **Opt-in payload logging.** Npgsql logs SQL parameters only if `IsParameterLoggingEnabled` or `LogParameters` is set, default false, with the doc comment "this may reveal sensitive information" (`NpgsqlLoggingConfiguration.cs:36-40`, `NpgsqlCommand.cs:1779`). Azure.Core: `IsLoggingContentEnabled` defaults to false (`DiagnosticsOptions.cs:184`), and `HttpMessageSanitizer` redacts every header and query value except an allow-list, replacing it with `"REDACTED"` (`Shared/HttpMessageSanitizer.cs:25-43`). Redis formats options with `includePassword: false` through a log-value struct (`LoggerExtensions.cs:23-26`). Pattern: allow-list, default closed, switch to open.
- OWASP's logging cheat sheet lists what should "not be recorded directly in the logs": passwords, access tokens, encryption keys, session ids, payment data, database connection strings; and says to sanitise CR/LF to prevent log injection ([OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)). Measured on a user-controlled value `"alice\nwarn: Auth[9] ADMIN LOGIN OK"`: the default `SimpleConsole` printed a separate forged line `warn: Auth[9] ADMIN LOGIN OK`; `SingleLine = true` folded it to one line; the JSON console escaped it as `\n` (`out_inject-*.txt`). Production services should use the JSON formatter or `SingleLine`.

### 11. Serilog: app-side provider, never a library dependency

- Core Serilog has no MEL dependency: `serilog__serilog@bebc7719004f:src/Serilog/Serilog.csproj:12` targets `net10.0;net9.0;net8.0;net6.0;netstandard2.0` (plus `net471`/`net462` on Windows, `:8`), and its only packages are `PolySharp`, `System.Diagnostics.DiagnosticSource` and `System.Threading.Channels` (`:56-78`). The bridge is the separate [Serilog.Extensions.Logging](https://github.com/serilog/serilog-extensions-logging) package, which "plugs into the Microsoft.Extensions.Logging pipeline" and notes that the provider route "is not the simplest or best-performing way to integrate Serilog"; the host-level package `Serilog.Extensions.Hosting` is preferred.
- Rule: libraries log through `ILogger` only; the application chooses Serilog (or any provider) in its composition root with `AddSerilog()`. A library that references `Serilog`, `NLog` or `log4net` forces the choice on every consumer and duplicates the pipeline (`rg` V8, §14: Npgsql and Redis `src` print nothing).
- MEL and Serilog templates differ. MEL "does not destructure": in the JSON console `"user {@User} {$Raw}"` produced the literal keys `"@User"` and `"$Raw"` and called `ToString()` (`out_at.txt`), and no analyzer flags the operators (`f1-at`: only CA1848). The Serilog provider's behaviour for `@` and `$` was not verified here; do not write them in a MEL template. Serilog's own guidance on templates matches MEL's: "Serilog events have a message template associated, not a message", concatenation "will degrade performance and consume cache memory", property names PascalCase ([Writing Log Events](https://github.com/serilog/serilog/wiki/Writing-Log-Events)).
- Serilog's `Log.Information(...)` static in app code bypasses `ILogger<T>` and the DI-configured providers; in a MEL codebase use `ILogger<T>`.

### 12. Testing log output

- `Mock<ILogger<T>>.Verify(l => l.LogInformation("hello {X}", 1))` compiles and throws at runtime: `NotSupportedException: Unsupported expression: l => l.LogInformation("hello {X}", new[] { (object)1 })` (fixture `f9-testing`, Moq 4.20.72). The extension methods cannot be mocked; the real interface method is `Log<TState>(...)`.
- `FakeLogger<T>` from `Microsoft.Extensions.Diagnostics.Testing` (10.10.0) records level, message, exception, structured state and scopes: `level=Warning msg='read of 42 failed' ex=InvalidOperationException id=42 scopes=1 count=1`. Use it to assert on the exception object, the structured `Id`, the scope, and that a secret never appears (`Assert.DoesNotContain("hunter2", rec.Message)` and in `StructuredState`).
- A log test is also the right place for the EventId uniqueness check (§3, Redis pattern) and a "no secret in ToString" test for any type passed as a log argument.

### 13. Version facts: net8.0 floor, SDK 11 RC1

- The generator ships inside the `Microsoft.Extensions.Logging.Abstractions` package, so its behaviour follows the **package** version, not the SDK. Instance methods that take the logger from a primary-constructor parameter need the .NET 9 package ([source generation](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/source-generation): "Starting with .NET 9"). Measured (`f7-primary-8`/`f7-primary-10`): `net8.0` + Abstractions **8.0.3** fails with `SYSLIB1019` plus `CS8795`; `net8.0` + Abstractions **10.0.0** builds. Pin Abstractions at 10.x for every TFM, as CS-JSON does for System.Text.Json. Exemplars: Npgsql 10.0.11 (`Directory.Packages.props:3`), Redis 10.0.5 (`:5`), Testcontainers 8.0.3 (`:12`, an older floor).
- SDK 8.0.425 ships no CA1873 and no CA2023; CA2254, CA2253, CA2017, CA1727 and CA1848 behave as in 10 (§1).
- SDK 11.0 RC1 (`11.0.100-rc.1.26425.128`, `Microsoft.Extensions.Logging.Abstractions 11.0.0-rc.1.26425.128`, `AnalysisLevel=11.0-all`, fixture `f8-sdk11`): identical results, CA1848 x9, CA1873 x6, CA2254 x3, CA2253 x1, CA1727 x1, CA2017 x1, and SYSLIB1013/1014/1015 for the generator fixture. Nothing logging-specific was observed to change at RC1; re-run `f8-sdk11` at GA (Nov 2026).

### 14. Verified on the toolchain

Fixture root: `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-observability-logging-rules/`. `Directory.Build.props` there sets `net10.0`, `LangVersion 14`, `AnalysisLevel 10.0-all`, `EnableNETAnalyzers`, `EnforceCodeStyleInBuild`, `TreatWarningsAsErrors`, `GenerateDocumentationFile`. `run.sh <dir> [args]` runs `/home/mherwig/.cache/research-lang/dotnet-tools/run.sh dotnet build -nologo -v:q -clp:NoSummary` in that directory and prints the diagnostic IDs. (The raw build log lists each diagnostic twice; the counts below are de-duplicated by `diags.py`.)

| # | Pair | Command | Red (observed) | Green (observed) |
|---|---|---|---|---|
| 1 | template mistakes -> `[LoggerMessage]` | `./run.sh f1-red` / `./run.sh f1-green` | `exit=1`: CA1848 x9, CA1873 x6, CA2254 x3, CA2253 x1, CA2017 x1, CA1727 x1 (plus unrelated CA1062 x2, CA1711 x1) | `exit=0`, no diagnostics |
| 2 | generator mismatches | `./run.sh f2c-red` / `./run.sh f2c-green` | `exit=1`: `L.cs:6 SYSLIB1014` (template `{Ip}` has no parameter), `:10 SYSLIB1015` (`password` unreferenced), `:13 SYSLIB1013` (exception in template); with TWAE off 1013/1015 are warnings, 1014 an error | `exit=0` |
| 3 | duplicate EventId | `./run.sh f2b-red` with and without `.globalconfig` (`dotnet_diagnostic.SYSLIB1006.severity = error`); `./run.sh f2b-green` | default severities: `exit=0`, silent. With `SYSLIB1006 = error`: `exit=1`, `error SYSLIB1006` | ids 1 and 2: `exit=0` |
| 4 | disabled-call allocation | `cd f3-alloc && dotnet run -c Release` (via `run.sh`) | A 64, B 88, C 32, E 120, J 88, K 88 B/call | D, F, G, H, I, L: 0 B/call (net10 and net8 identical) |
| 5 | secrets in log state | `dotnet bin/Debug/net10.0/F4Redact.dll red|wrapper|excluded|redacted|classified-but-not-enabled` | `red`: password appears in 4 lines (state, record ToString, scope, exception) | `wrapper`, `excluded`, `redacted`, `classified-but-not-enabled`: 0 occurrences |
| 6 | explicit severities as the portable gate | `./run.sh f10-posture -p:AnalysisLevel=10.0 -p:TreatWarningsAsErrors=false`, same `.globalconfig` on `f1-green` | all seven logging rules `error` even at AnalysisLevel 10.0 (CA1848 x9, CA1873 x6, CA2254 x3, CA2253 x1, CA2017 x1, CA1727 x1) | `f1-green` `exit=0` |
| 7 | primary-ctor logger vs package floor | `./run.sh f7-primary-8` (Abstractions 8.0.3, net8.0) / `./run.sh f7-primary-10` | `exit=1`: `SYSLIB1019` + `CS8795` | Abstractions 10.0.0 on net8.0 and net10.0: `exit=0` (CA1812 only) |
| 8 | IsEnabled guard vs CA1873 | `./run.sh f1-probe` (guard cases) | static and instance generated method inside a guard: CA1873 (false positive) | extension form inside a guard, and hoisted local inside a guard: no CA1873 |
| 9 | log-argument `rg` checks (V1-V4, serilog operators) | the loop in §Normative (hits per dir) | `f1-red` interp/concat=3 exMessage=2; `f6-exc` exMessage=3 logRethrow=1; `f5-scope` beginScopeInterp=1; `f1-at` serilogOps=1 | `f6-green` and `f1-green`: all counts 0; `./run.sh f6-green` `exit=0` |
| 10 | Moq vs FakeLogger | `dotnet run` in `f9-testing` | `NotSupportedException: Unsupported expression: l => l.LogInformation(...)` | `FakeLogger` captured level, exception, state and scope |
| 11 | scope allocation | `cd f11-scopecost && dotnet run -c Release` (via `run.sh`) | `BeginScope(template,args)` 200 B, `BeginScope(Dictionary)` 336 B per call, with or without a scope-aware provider | `LoggerMessage.DefineScope` 152 B (cheapest, not free) |

Key raw outputs (verbatim excerpts):

```text
$ ./run.sh f1-red            # AnalysisLevel 10.0-all, TWAE
  18 error CA1848 (each printed twice; 9 unique)  12 error CA1873  6 error CA2254  2 error CA2253
   2 error CA2017  2 error CA1727  4 error CA1062  2 error CA1711          exit=1
$ ./run.sh f1-green          exit=0

$ AnalysisLevel matrix (out_matrix_levels.txt, unique)
10.0:             CA2017(warning)x1
10.0-minimum:     CA1873(warning)x6 CA2017(warning)x1 CA2253(warning)x1 CA2254(warning)x3
10.0-recommended: CA1727 x1 CA1848 x9 CA1873 x6 CA2017 x1 CA2253 x1 CA2254 x3   (all warning)
10.0-all:         same as recommended

$ ./run.sh f2b-red   (SYSLIB1006 at default Info)      exit=0
$ ./run.sh f2b-red   (+ .globalconfig SYSLIB1006=error) error SYSLIB1006 x2 (dup print)  exit=1
$ ./run.sh f2e-crossclass (+ SYSLIB1006=error, ids equal across two classes)   exit=0

$ dotnet bin/Debug/net10.0/F4Redact.dll classified-but-not-enabled
{"EventId":4,...,"Message":"login alice (null)","State":{"Message":"User=alice,...,Password=<omitted> ([Fx:Private])",...}}
```

Generated code (excerpt, `f3-alloc/gen/Microsoft.Extensions.Logging.Generators/.../LoggerMessage.g.cs`): `internal static partial void Pair(ILogger logger, int a, int b) { if (logger.IsEnabled(LogLevel.Debug)) { __PairCallback(logger, a, b, null); } }` with `__PairCallback = LoggerMessage.Define<int,int>(LogLevel.Debug, new EventId(1, nameof(Pair)), "a={A} b={B}", new LogDefineOptions { SkipEnabledCheck = true })`.

Recommended `.globalconfig` fragment (verified in `f10-posture/.globalconfig`):

```ini
is_global = true
global_level = 100
dotnet_diagnostic.CA2254.severity = error
dotnet_diagnostic.CA2253.severity = error
dotnet_diagnostic.CA2017.severity = error
dotnet_diagnostic.CA2023.severity = error
dotnet_diagnostic.CA1727.severity = error
dotnet_diagnostic.CA1848.severity = error
dotnet_diagnostic.CA1873.severity = error
dotnet_diagnostic.SYSLIB1002.severity = error
dotnet_diagnostic.SYSLIB1006.severity = error
dotnet_diagnostic.SYSLIB1012.severity = error
dotnet_diagnostic.SYSLIB1013.severity = error
dotnet_diagnostic.SYSLIB1015.severity = error
dotnet_diagnostic.SYSLIB1018.severity = error
dotnet_diagnostic.SYSLIB1025.severity = error
dotnet_diagnostic.LOGGEN000.severity = error
dotnet_diagnostic.LOGGEN002.severity = error
```

## Normative guidance candidates

IDs are proposals for the CS-OBS-LOG block; `src` is the library or app source directory, `tests` the test projects. All `rg` commands print nothing when the rule is satisfied.

1. **CS-OBS-LOG-01 (MUST): every log call uses a constant template.** No interpolation, `+` concatenation or variable as the message template. Rationale: preserves placeholder names, avoids per-call template churn ([CA2254](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2254)). Verify: `dotnet_diagnostic.CA2254.severity = error`; `rg -n -g '*.cs' -e 'Log(Trace|Debug|Information|Warning|Error|Critical)\(\s*(\w+,\s*)?\$"' -e 'Log(Trace|Debug|Information|Warning|Error|Critical)\(\s*(\w+,\s*)?"[^"]*"\s*\+' src`.
2. **CS-OBS-LOG-02 (MUST): named PascalCase placeholders, equal in number to the arguments, balanced braces.** Rationale: the placeholder name becomes the structured property key. Verify: CA1727, CA2253, CA2017, CA2023 at `error`; `rg -n -g '*.cs' -P 'Log\w*\(\s*"[^"]*\{\d+[}:]' src`.
3. **CS-OBS-LOG-03 (MUST): all logging in `src/**` is a `[LoggerMessage]` partial method.** One `internal static partial class LogMessages` per area, methods as `this ILogger` extensions. Rationale: zero disabled cost, compile-time checks, level-blind rule is auditable (§2, §4). Verify: `dotnet_diagnostic.CA1848.severity = error` and `CA1873.severity = error` in `.globalconfig`; scoped `none` only for `tests/**`; `rg -n -g '*.cs' '\.Log(Trace|Debug|Information|Warning|Error|Critical)\(' src` prints nothing.
4. **CS-OBS-LOG-04 (MUST, brownfield floor): code that already uses `LogX` keeps CA2254/CA2253/CA2017/CA2023/CA1727 at error and CA1848/CA1873 at suggestion; the count of `LogX` calls never rises; new files use `[LoggerMessage]`.** Rationale: a bulk migration is N errors at once (§2). Verify: `dotnet build -p:AnalysisLevel=10.0-recommended -p:TreatWarningsAsErrors=false` diagnostic count of CA1848 not above the committed baseline; `rg -c -g '*.cs' '\.Log(Trace|Debug|Information|Warning|Error|Critical)\(' src` per file not above baseline.
5. **CS-OBS-LOG-05 (MUST): every `[LoggerMessage]` sets an explicit `EventId`, unique across the assembly; libraries publish ids as constants; method names are frozen once shipped.** Rationale: ids and `EventName` reach consumers' alerts; SYSLIB1006 is Info and per-class (§3). Verify: `SYSLIB1006` and `LOGGEN002` at `error`; a reflection test that asserts non-empty, `EventId >= 0`, no duplicates (Redis pattern, `LoggerEventIdTests.cs:19-45`); `rg -n -U -P -g '*.cs' '\[LoggerMessage\((?![^\]]*EventId)' src` prints nothing (watched: 1 hit on the id-less `f3-alloc/Program.cs:48`, 0 on `f2c-green`).
6. **CS-OBS-LOG-06 (MUST): every `[LoggerMessage]` parameter other than the logger, level and exception appears in the template.** A deliberate state-only property needs `#pragma warning disable SYSLIB1015` with a reason comment on the same line. Rationale: an omitted parameter still reaches structured sinks (§3, §10). Verify: `SYSLIB1015 = error`; `rg -n -g '*.cs' 'pragma warning disable SYSLIB1015$' src` prints nothing (every pragma carries a reason).
7. **CS-OBS-LOG-07 (MUST): the remaining generator diagnostics are errors.** SYSLIB1002, 1012, 1013, 1018, 1025 and LOGGEN000. Rationale: they flag a redundant level word, an exception or logger named in the template, a reused event name. Verify: the `.globalconfig` fragment in §14; `grep -n -e 'SYSLIB1013' -e 'SYSLIB1015' .globalconfig` shows `severity = error`.
8. **CS-OBS-LOG-08 (MUST): pass the exception object as the exception argument; never its text.** No `ex.Message` or `ex.ToString()` or `{Ex}` as a log argument; no exception placeholder in a template. Rationale: only the exception argument fills the `Exception` field (§6). Verify: `rg -n -g '*.cs' -P 'Log\w*\([^;]*\b\w*[eE]x\w*\.(Message|ToString\(\))' src`; SYSLIB1013 and CA2017 at error; `rg -n -g '*.cs' -P '\{(Ex|Exception|Error)\}' src` prints nothing.
9. **CS-OBS-LOG-09 (MUST): log where the failure is handled; a catch that logs and rethrows is a defect.** Library code that throws does not also log Error (§8). Rationale: duplicate events and double reporting. Verify: `rg -n -U -P -g '*.cs' 'catch\b[^{]*\{[^{}]*\.Log\w+\([^;]*;[^{}]*\bthrow\s*;' src` prints nothing; the pattern only sees single-block catches, so also read any `catch` that contains a log call.
10. **CS-OBS-LOG-10 (MUST NOT): log secrets.** Passwords, tokens, API keys, authorization headers, connection strings with credentials, ocx argv/env/stdin. Log the ocx verb only (agrees with CS-PROC-08). Rationale: four measured leak routes (§10). Verify: `rg -n -i -g '*.cs' -P '(?<!\]\s)\b(string|byte\[\]|ReadOnlyMemory<byte>|object)\??\s+(password|passwd|pwd|secret|token|apikey|api_?key|authorization|credential\w*|connectionstring)\b' src` prints nothing for `[LoggerMessage]` signatures (classified parameters carry a leading `]`); a canary test that logs a planted secret through `FakeLogger<T>` and asserts it is absent from `Message`, `StructuredState`, `Scopes` and `Exception`.
11. **CS-OBS-LOG-11 (MUST): a type that holds a secret and may be logged overrides `ToString`/`PrintMembers`, or is wrapped in a masking struct.** Rationale: record `ToString()` prints every member (`Creds { User = alice, Password = hunter2-SECRET }`). Verify: `rg -l -P -g '*.cs' 'record\s+\w+\s*\([^)]*\b(Token|Password|Secret)\b' src | xargs -r rg --files-without-match -e PrintMembers`; a `ToString()` test (CS-PROC-08).
12. **CS-OBS-LOG-12 (MUST): scopes use key-value state or `LoggerMessage.DefineScope`, are disposed with `using`, and carry no secrets.** No `BeginScope($"...")`, no discarded scope. Rationale: no analyzer covers the interpolated generic overload (§7). Verify: `rg -n -g '*.cs' -e 'BeginScope\(\s*\$"' -e '\b_\s*=\s*\w+\.BeginScope\(' src` prints nothing.
13. **CS-OBS-LOG-13 (MUST): follow the level table in §8.** Library: Information only for rare lifecycle events; per-operation detail Debug or Trace; no Error for a failure that is also thrown; payload-level Trace. Rationale: consumers default to Information. Verify: reading heuristic on each `[LoggerMessage(` `Level =` (a Level of Information inside a method called per request, per command or per file is a defect); `rg -n -g '*.cs' 'Level = LogLevel\.(Error|Critical)' src` is reviewed against throw sites.
14. **CS-OBS-LOG-14 (MUST): a library references `Microsoft.Extensions.Logging.Abstractions` only.** No `Microsoft.Extensions.Logging` (implementation), no console/debug providers, no Serilog/NLog/log4net, no `LoggerFactory.Create`. Rationale: the host picks providers (§9, §11). Verify: `rg -n -g '*.csproj' -g 'Directory.Packages.props' -e 'PackageReference (Include|Update)="(Serilog[^"]*|NLog[^"]*|log4net|Microsoft\.Extensions\.Logging(\.(Console|Debug|EventLog|Configuration|EventSource|TraceSource))?)"' src` prints nothing; `rg -n -g '*.cs' 'LoggerFactory\.Create\(' src` prints nothing.
15. **CS-OBS-LOG-15 (MUST): injection shape.** Public entry points take `ILoggerFactory? loggerFactory = null` and normalise to `NullLoggerFactory.Instance`; DI-built classes take non-nullable `ILogger<T>`; no `= null` or `null!` logger; no static logger holder. Rationale: §9. Verify: `rg -n -g '*.cs' -P -e 'ILogger(<[^>]+>)?\??\s+\w+\s*=\s*null' -e 'static\s+(readonly\s+)?ILogger(<[^>]+>)?\s+\w+\s*=\s*(?!NullLogger)' src` prints nothing (watched: flags `ILogger<T>? logger = null`, `= null!` and a static `LoggerFactory.Create` holder); the public API baseline (CS-API, PublicApiAnalyzers) shows no `ILogger<T>` parameter on a public constructor.
16. **CS-OBS-LOG-16 (SHOULD): guard computed arguments and hoist them.** `if (logger.IsEnabled(level)) { var x = Compute(); Log.Method(logger, x); }`, with `SkipEnabledCheck = true` on that method; no guard around cheap arguments. Rationale: row J and CA1873 false positives (§4, §5). Verify: `CA1873 = error`; reading heuristic: an invocation (`string.Join`, `ToString()`, `JsonSerializer.Serialize`, LINQ) directly inside the argument list of a log call.
17. **CS-OBS-LOG-17 (MUST): payload, parameter and body logging is off by default and gated by an explicit option; unredacted values never appear above Trace.** Allow-list headers and query keys. Rationale: Npgsql `IsParameterLoggingEnabled`, Azure `IsLoggingContentEnabled` and `HttpMessageSanitizer` (§10). Verify: reading heuristic: each option that enables payload logging has a default of `false` and an XML doc remark that it "may reveal sensitive information".
18. **CS-OBS-LOG-18 (MUST for apps that log regulated data): classify and redact.** `[Private]`-style classification attributes, `EnableRedaction()`, a registered redactor per classification, an `ErasingRedactor` fallback; no redaction packages in libraries. Rationale: §10. Verify: `rg -l -g '*.cs' 'DataClassificationAttribute' src | xargs -r rg --files-without-match -e 'EnableRedaction\(' -e 'AddRedaction\('` prints nothing; a test that logs a classified value and asserts it is absent.
19. **CS-OBS-LOG-19 (SHOULD): production hosts use the JSON console formatter or `SimpleConsole` with `SingleLine = true`.** Rationale: default SimpleConsole lets a user-controlled newline forge a log line (`out_inject-default.txt`). Verify: `rg -n -g '*.cs' 'AddConsole\(\)|AddSimpleConsole\(\)' src` is reviewed in the composition root.
20. **CS-OBS-LOG-20 (MUST): tests assert logs through `FakeLogger<T>` (or a capturing provider), never a mocked `ILogger`.** Rationale: Moq cannot verify extension methods (§12). Verify: `rg -n -g '*.cs' -e 'Mock<ILogger' -e 'Substitute\.For<ILogger' tests` prints nothing.
21. **CS-OBS-LOG-21 (MUST): the Abstractions package is pinned at 10.x for every TFM.** Rationale: the generator ships in the package and the primary-constructor logger needs 9.0+ (§13). Verify: `rg -n -g 'Directory.Packages.props' 'PackageVersion Include="Microsoft.Extensions.Logging.Abstractions" Version="(10|11)\.' .` prints one line (watched on Npgsql and Redis; Testcontainers' 8.0.3 floor does not match); `./run.sh f7-primary-8` style build red/green.
22. **CS-OBS-LOG-22 (SHOULD NOT): no Serilog-only template syntax in MEL templates.** No `{@Obj}` or `{$Obj}`. Rationale: MEL's console formatter prints the literal key and calls `ToString()` (§11). Verify: `rg -n -g '*.cs' -P 'Log\w*\(\s*"[^"]*\{[@$]\w+' src` prints nothing.
23. **CS-OBS-LOG-23 (MUST): the static posture lives in one `.globalconfig`** using the §14 fragment, with scoped `.editorconfig` sections for `tests/**`. Rationale: explicit severities do not depend on AnalysisMode or SDK (§1). Verify: `dotnet build -p:AnalysisLevel=10.0 -p:TreatWarningsAsErrors=false` on a planted `LogInformation($"x {y}")` prints `error CA2254`.

Verification loop used in §14 row 9 (copy as is):

```bash
for d in src; do
  rg -c -g '*.cs' -e 'Log(Trace|Debug|Information|Warning|Error|Critical)\(\s*(\w+,\s*)?\$"' "$d"
  rg -c -g '*.cs' -P 'Log\w*\([^;]*\b\w*[eE]x\w*\.(Message|ToString\(\))' "$d"
  rg -c -U -P -g '*.cs' 'catch\b[^{]*\{[^{}]*\.Log\w+\([^;]*;[^{}]*\bthrow\s*;' "$d"
  rg -c -g '*.cs' -e 'BeginScope\(\s*\$"' "$d"
done
```

## AI-agent angle

| What an LLM gets wrong | Why it compiles | Smallest mechanical check |
|---|---|---|
| `logger.LogInformation($"User {user} logged in")` | `string` is accepted as the template | CA2254 error; `rg` V1 (LOG-01) |
| `logger.LogError("failed: " + ex.Message)` or `LogError(ex.Message)` | same | CA2254; `rg` LOG-08 |
| `logger.LogError("failed: {Ex}", ex)` or `("... {Message}", ex.Message)` | valid `params object[]` | no analyzer; `rg -P 'Log\w*\([^;]*\b\w*[eE]x\w*\.(Message|ToString\(\))'` and `rg '\{(Ex|Exception)\}'` |
| `logger.LogError("failed", ex)` (exception second) | `params` accepts it | CA2017 (error) |
| `logger.LogInformation("adding {0}", x)` (String.Format habit) | valid | CA2253 (error) |
| `{firstName}` camelCase; `{@Obj}` / `{$Obj}` Serilog operators in MEL | valid strings | CA1727; `rg` LOG-22 (no analyzer for operators) |
| Wrapping every call in `if (logger.IsEnabled(...))` (pre-.NET 6 advice) around `[LoggerMessage]` or cheap args | harmless but noisy, double check | reading heuristic; LOG-16 allows a guard only for computed arguments |
| Hand-writing `LoggerMessage.Define<...>` delegates (pre-.NET 6, still in many blog posts) | works | `rg -n -g '*.cs' 'LoggerMessage\.Define[<(]' src` prints nothing for new code ([legacy note](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/high-performance-logging)); `DefineScope` is the one allowed use |
| `[LoggerMessage]` on a non-`partial` method or in a non-`partial` class; method with a body; `_Name` | looks right | SYSLIB1010/1016/1001 and CS0260 (build fails) |
| Copy-pasting `EventId = 1` into a second class | valid | SYSLIB1006 is Info and per-class: needs `severity = error` plus the reflection test |
| Adding a `password` parameter to a `[LoggerMessage]` "for context" and leaving it out of the template | builds with a warning | SYSLIB1015 error; `rg` LOG-10 |
| `logger.LogInformation("creds {Creds}", creds)` where `creds` is a `record` | prints every member | `rg` LOG-11 (PrintMembers check) |
| `using var f = LoggerFactory.Create(b => b.AddConsole());` inside a library, or `AddSerilog()` in a library, or referencing `Serilog` | compiles and "works" | `rg` LOG-14 on csproj and `LoggerFactory.Create` |
| `ILogger<T> logger = null` / `NullLogger<T>.Instance` as a static default / `ILogger<T>` as a public ctor parameter | valid | `rg` LOG-15; API baseline |
| `_ = logger.BeginScope(...)`, `BeginScope($"op {id}")`, or a scope per item in a loop (152-336 B each) | valid; no analyzer | `rg` LOG-12 |
| `catch (Exception ex) { logger.LogError(ex, "..."); throw; }` | valid | multiline `rg` LOG-09 |
| `LogInformation` for every request/step inside a library "so users can see what happens" | valid | level table (LOG-13); reading heuristic on `Level = LogLevel.Information` |
| Mocking the logger: `new Mock<ILogger<T>>().Verify(l => l.LogError(...))` | compiles | runtime `NotSupportedException`; `rg 'Mock<ILogger' tests` (LOG-20) |
| Inventing APIs: `logger.LogInformationAsync`, `LogWarn`, `[LoggerMessage]` on `ILogger<T>` fields, `ILogger.WithProperties`, `AddLogging(b => b.AddRedaction())` without `Microsoft.Extensions.Telemetry` | does not compile, or compiles against a different type | the build; for redaction, check that `EnableRedaction()` (in `Microsoft.Extensions.Telemetry`) and `AddRedaction(...)` (in `Compliance.Redaction`) are both present (LOG-18) |
| Suppressing CA1848 or CA1873 with `#pragma` or `[SuppressMessage]` "because it is noisy" (CA1848 says do not suppress) | valid | `rg -n -g '*.cs' -e 'pragma warning disable (CA1848|CA2254|CA1873|CA2017|SYSLIB1015)' -e 'SuppressMessage\("[^"]*",\s*"(CA1848|CA2254|CA1873)' src` prints nothing |
| Treating `NullLogger.Instance` as "logging is free when no logger is set" | no output, but 32-120 B per call with extension calls (row K) | LOG-03 (`[LoggerMessage]`) |
| Logging a connection string, argv or env to "help debugging" | valid | `rg` LOG-10; CS-PROC-08 rows |

## Contested / evolving

- **CA1848 as a gate.** Microsoft says never suppress it, yet it is off by default in .NET 10, and Aspire (73 extension calls, 0 `[LoggerMessage]`) ships without it. Trend: the SDK team keeps adding logging analyzers (CA2023, CA1873 arrived in .NET 10); the cheap direction for greenfield is gating. Brownfield stays on the floor tier until a migration is scheduled. As of 2026-10-11 nothing in .NET 11 RC1 changes this.
- **"Libraries never log Information."** The brief's premise is not supported by the exemplars or by Microsoft (the Learn library page has no level advice). Azure's client guidelines and Npgsql lean Debug/Trace for chatter, Redis and Testcontainers lean Information because logging is opt-in. The fleet rule narrows to "Information only for rare lifecycle events". Revisit if the sibling subtopic decides the ocx SDK logs at all.
- **Log-and-throw.** Azure SDK guidelines log thrown exceptions at Warning; most .NET guidance and this fleet's rule log at the handler. The Azure position is tied to opt-in logging and retry pipelines. If the ocx SDK adopts `ILogger`, a Debug line at the throw site is acceptable, an Error is not.
- **CA1873 maturity.** New in SDK 10; false positives around guards on static/instance generated methods ([issue 7690](https://github.com/dotnet/roslyn-analyzers/issues?q=CA1873), opened 2025-06) persist in 10.0.401 and RC1. It also flags constants because of the implicit `params` array. It may be narrowed later; re-run `f1-probe` after each SDK bump (the fleet pins `latestFeature`).
- **Docs drift.** The source-generation page names the exception-in-template diagnostic `SYSLIB0025`; the generator source and the build say `SYSLIB1013`. The "up to six arguments" limit applies to `LoggerMessage.Define`, not the attribute. Trust the build and the generator source.
- **SYSLIB1021** (inconsistent casing) exists as a descriptor but was not raised for `{User} {user}`; behaviour may change.
- **Redaction API stability.** `HmacRedactor` is experimental (`EXTEXP0002`); `Microsoft.Extensions.Telemetry` is versioned 10.x separately from the runtime packages, and the JSON console `State.Message` quirk suggests the pipeline is still settling. Treat the redaction stack as app-side and revisit in 2027.
- **`LoggerMessage.Define` and `ILogger` primary-constructor capture.** The attribute replaced `Define` for new code in .NET 6; instance methods that capture a primary-constructor logger need the .NET 9 package; the SYSLIB1027 Info diagnostic covers a hiding field. No sign of a further generator API at RC1.
- **Scope allocation.** One scope per operation is a convention backed by the measurement in §7 (152-336 B per scope); the Learn pages give no threshold and no analyzer covers it.
- **Serilog's `{@}` in MEL templates** is provider-dependent and was not verified for the Serilog provider here; treat as unspecified until measured.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1848 | CA1848 rule page | updated 2026-04 (page 2025-08) | "Do not suppress"; boxing and template-parse rationale |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2254 | CA2254 rule page | 2022, refreshed 2026-04 | Defines the constant-template rule and its two legitimate suppressions |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1873 | CA1873 rule page | 2025-10 | New .NET 10 rule; guard or LoggerMessage as fixes |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1727 | CA1727 rule page | 2022 | PascalCase placeholders; "safe to suppress" |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2253 | CA2253 rule page | 2022 | No numeric placeholders; "do not suppress" |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2017 | CA2017 rule page | 2025-09 | Placeholder/argument count; warning by default in .NET 10 |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/overview | Code analysis overview (AnalysisMode, default rule table) | 2025-11, updated 2026-05 | The .NET 10 default-warning list (CA2017, CA2023) and AnalysisMode definitions |
| https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/source-generation | Compile-time logging source generation | 2026-03 | Method constraints, case-insensitive matching, dynamic level, redaction section; contains the `SYSLIB0025` typo |
| https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/high-performance-logging | High-performance logging | 2026-02 | Boxing/parse/alloc claims, `IsEnabled` guard, legacy `LoggerMessage.Define` |
| https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/overview | Logging in C# | 2025-10 | Level table, templates, exceptions, scopes, categories, DI |
| https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/library-guidance | Logging guidance for .NET library authors | 2024-03, updated 2026-06 | `ILoggerFactory` vs `ILogger<T>`, `SkipEnabledCheck`, no-op defaults |
| https://learn.microsoft.com/en-us/dotnet/core/extensions/data-redaction | Data redaction in .NET | 2025-03 | `ErasingRedactor`, `HmacRedactor`, `EnableRedaction`, `EXTEXP0002` |
| https://learn.microsoft.com/en-us/dotnet/core/extensions/data-classification | Data classification in .NET | 2025-03 | `DataClassification`, attribute subclassing, sets |
| https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.logging.loggermessageattribute | LoggerMessageAttribute API | 2025, net-11.0 pp | Property list, `SkipEnabledCheck`, remarks on method shape |
| https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.logging.logpropertiesattribute | LogPropertiesAttribute API | package 10.9.0 | Lives in Telemetry.Abstractions, not in Abstractions |
| https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.logging.abstractions.nulllogger | NullLogger API | net-11.0 pp | The no-op default and its extension surface |
| https://raw.githubusercontent.com/dotnet/runtime/main/src/libraries/Microsoft.Extensions.Logging.Abstractions/gen/DiagnosticDescriptors.cs | Generator diagnostic IDs and severities (source) | main, read 2026-10-11 | Ground truth for SYSLIB1001-1029 severities (1006 = Info) |
| https://raw.githubusercontent.com/dotnet/runtime/main/src/libraries/Microsoft.Extensions.Logging.Abstractions/gen/LoggerMessageGenerator.Parser.cs | Generator parser (source) | main | Hash-derived EventId (line 234), per-class SYSLIB1006 |
| https://raw.githubusercontent.com/dotnet/runtime/main/src/libraries/Microsoft.Extensions.Logging.Abstractions/gen/Resources/Strings.resx | Generator message texts | main | Exact wording of each SYSLIB diagnostic |
| https://raw.githubusercontent.com/dotnet/extensions/main/src/Generators/Microsoft.Gen.Logging/Parsing/DiagDescriptors.cs | Telemetry-side generator diagnostics (LOGGEN###) | main | LOGGEN002 (duplicate id) is a Warning |
| https://github.com/dotnet/roslyn-analyzers/blob/main/src/NetAnalyzers/Core/Microsoft.NetCore.Analyzers/Performance/AvoidPotentiallyExpensiveCallWhenLogging.cs | CA1873 analyzer source | main | What counts as "expensive" (implicit params array) |
| https://github.com/dotnet/roslyn-analyzers/issues?q=CA1873 | Issue/PR search: #7290 (added), #7690 (guard false positives) | 2025 | History and the known false-positive report |
| https://azure.github.io/azure-sdk/general_implementation.html | Azure SDK general implementation guidelines (logging) | current | Level semantics, allow-list redaction, "no self-healing retries" |
| https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html | OWASP Logging Cheat Sheet | current | What must never be logged; log injection |
| https://github.com/serilog/serilog/wiki/Writing-Log-Events | Serilog message-template guidance | current | Templates over concatenation, PascalCase |
| https://github.com/serilog/serilog-extensions-logging | Serilog provider for MEL | current | Scope handling, bridge package, host-level preference |
| `npgsql__npgsql@9c47244547c2` `src/Npgsql/LogMessages.cs`, `NpgsqlLoggingConfiguration.cs`, `NpgsqlEventId.cs`, `NpgsqlDataSource.cs` | Real library using `[LoggerMessage]`, six categories, opt-in parameter logging | 2026 | Reference shape for a library; deliberate SYSLIB1015 pragma |
| `StackExchange__StackExchange.Redis@e7c43a269f53` `src/StackExchange.Redis/LoggerExtensions.cs`, `tests/StackExchange.Redis.Tests/LoggerEventIdTests.cs` | Library with 124 `[LoggerMessage]` methods and an EventId test | 2026 | EventId uniqueness test; rename-is-a-breaking-change comment |
| `testcontainers__testcontainers-dotnet@04cbb73fcc58` `src/Testcontainers/Logging.cs`, `Logger.cs` | Library with its own opt-in console logger | 2026 | Information-heavy exemplar; hash EventIds |
| `dotnet__aspire@af646baee1e8` `src/Aspire.Hosting/Dcp/*.cs`, `Directory.Build.props` | Framework/app using templates only | 2026 | Counter-example: 73 extension calls, no `[LoggerMessage]`, TWAE without CA1848 |
| `serilog__serilog@bebc7719004f` `src/Serilog/Serilog.csproj` | Serilog core project file | 2026 | Proof that core Serilog has no MEL dependency |
| `Azure__azure-sdk-for-net@32c48fc3d524` `sdk/core/Azure.Core/src/Shared/HttpMessageSanitizer.cs`, `DiagnosticsOptions.cs` | Allow-list redaction and opt-in content logging | 2026 | EventSource-based contrast to MEL; default-closed pattern |
| `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-observability-logging-rules/` | Fixtures and raw outputs of this report | 2026-10-11 | Reproduces every red/green claim (§14) |
