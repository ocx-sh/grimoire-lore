---
title: "Library instrumentation for a .NET CLI-wrapper SDK: zero-dependency diagnostics, OpenTelemetry-shaped spans, and ocx log-level / stderr forwarding"
topic: csharp-quality/observability.md (API-11, OB-01, OB-02), subtopic csharp-observability-library-instrumentation
agent: deep-dive researcher (sonnet), program research-lang / C#
model: sonnet (claude-sonnet-5-5)
date_researched: 2026-10-11
sources_count: 27
scope: |
  Covers: which diagnostics channel a .NET library should expose (none, callbacks, ILogger, ActivitySource+Meter, EventSource) with measured dependency and allocation costs; OpenTelemetry-conformant naming, attributes, status, cardinality and the telemetry secret rule; the consumer-side test pattern; W3C traceparent propagation toward ocx; ocx `--log-level` placement/precedence and the stderr-surfacing contract inside the CS-PROC 16 MiB cap.
  Does not cover: logging rules for application code ([LoggerMessage], CA1848/CA2254, levels, redaction in apps - sibling csharp-observability-logging-rules), XML doc hygiene (code-docs set), the process engine itself (CS-PROC), exception hierarchy (CS-ERR) beyond what telemetry reads from it.
  Not run: ocx main (no binary exists on this machine; main behaviour is cited from source at ocx@a23ec5be2939), macOS, arm64, Windows hosts (all fixtures ran on Linux x64; the one POSIX-`sh` fixture is flagged where it matters).
---

# Library instrumentation for the C# ocx SDK

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The five options, measured against this SDK](#1-the-five-options-measured-against-this-sdk)
   2. [What Microsoft.Extensions.Logging.Abstractions costs per TFM, and the diamond](#2-what-microsoftextensionsloggingabstractions-costs-per-tfm-and-the-diamond)
   3. [Zero cost without a listener](#3-zero-cost-without-a-listener)
   4. [Names: source, meter, version, span, kind](#4-names-source-meter-version-span-kind)
   5. [Attribute allow-list and the telemetry secret rule](#5-attribute-allow-list-and-the-telemetry-secret-rule)
   6. [Status, error.type and exceptions](#6-status-errortype-and-exceptions)
   7. [Metrics: one histogram, bounded tags](#7-metrics-one-histogram-bounded-tags)
   8. [Activity.Current flow and the sync-wrapper leak](#8-activitycurrent-flow-and-the-sync-wrapper-leak)
   9. [The consumer test pattern](#9-the-consumer-test-pattern)
   10. [W3C traceparent: ocx does not read it](#10-w3c-traceparent-ocx-does-not-read-it)
   11. [ocx side: `--log-level`, environment variables, streams](#11-ocx-side---log-level-environment-variables-streams)
   12. [The stderr-surfacing contract](#12-the-stderr-surfacing-contract)
   13. [API availability by TFM, and .NET 11](#13-api-availability-by-tfm-and-net-11)
   14. [Verified on the toolchain](#14-verified-on-the-toolchain)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- The SDK takes **no logging dependency**: no `Microsoft.Extensions.Logging*`, no `OpenTelemetry*`, no `System.Diagnostics.DiagnosticSource` PackageReference. `ActivitySource` and `Meter` are in-box on net8.0+ and Microsoft's own guidance says library authors "can exclusively rely on APIs in System.Diagnostics.DiagnosticSource".
- On `net8.0`, `Microsoft.Extensions.Logging.Abstractions` 10.0.0 adds three packages (itself, `Microsoft.Extensions.DependencyInjection.Abstractions` 10.0.0, `System.Diagnostics.DiagnosticSource` 10.0.0); a consumer pinned to Abstractions 8.0.3 then fails restore with NU1605, an error even with `TreatWarningsAsErrors=false` (measured).
- Corpus: 0 of 10 CLI wrappers take an `ILogger`; CliWrap, simple-exec and MedallionShell reference none of `ILogger`, `ActivitySource`, `EventSource`, `DiagnosticSource` in any `.cs` file (grep, section 1). Libraries that do take `ILogger` (Redis, Testcontainers, Npgsql) are network clients with long-lived connections, not one-shot process runners.
- Diagnostics channel: one static `ActivitySource` and one static `Meter`, both named `Ocx.Sdk`, version from the assembly informational version with `+sha` stripped, exposed as `public const string` on a tiny `OcxTelemetry` class so consumers write `AddSource(OcxTelemetry.SourceName)`.
- Span: name `ocx {command}` from a closed table (`ocx index list`), `ActivityKind.Client`, started inside the async method that awaits the child. A non-async wrapper leaks `Activity.Current` into the caller (measured red).
- Tag allow-list, exactly five keys: `process.executable.name` (constant `ocx`), `process.exit.code` (int), `error.type`, `ocx.command`, `ocx.attempt`. Never `process.command_args`, `process.command_line`, `process.executable.path`, cwd, env, stdout, stderr, package refs, `Exception.Message`, stack traces. The OTel registry itself says command args "SHOULD NOT be collected by default unless there is sanitization".
- Failure marking: `SetStatus(Error, "ocx exited with code N")` from a fixed template, `error.type` = leaf exception type full name (5 values), success leaves status `Unset`. Do not copy `Exception.Message` or call `AddException` (it records `exception.message` and `exception.stacktrace`; and OTel's error-recording page now routes exceptions to logs, not span events).
- Metrics: one `Histogram<double>` `ocx.client.operation.duration`, unit `s`, tags `ocx.command` and `error.type` only, about 70 commands x (5 error types plus none) stays under the documented 1000-combination safe bound.
- No listener means no cost: static source, `StartActivity` returns `null` (0 B, 16 ns measured); a per-call `new ActivitySource` costs 128 B and 330 ns; `ILogger.LogInformation(template, args)` on `NullLogger` costs 64 B per call even though nothing is written.
- Do not inject `TRACEPARENT` into the ocx child and do not scrub it: ocx 0.6.5 and main read no trace-context variable (grep of crates, tests, taskfiles, docs finds none). Revisit when ocx documents env-carrier support; the OTel env-carrier spec is Release Candidate.
- ocx log level: the SDK always sends `--log-level <level>` as the first argv pair, before the subcommand (after it, exit 64). Default `warn`. The flag beats `OCX_LOG_LEVEL`, `OCX_LOG` and `RUST_LOG` (measured) and `OCX_LOG_LEVEL` is ignored by 0.6.5, so no env scrubbing is needed for log control.
- `Trace`/`Debug` levels write a dump of the invocation options and, per the Python SDK, ocx may print secrets it holds at `trace`; the SDK can only redact values it knows. `Trace` is opt-in, documented, never a default.
- stderr surfacing: data first (bounded, redacted `Stderr` on the result and `StderrExcerpt` on exceptions), live second (optional `Action<string>? OnStderrLine`, redacted lines, invoked from the pump, never after the awaited task completes). The callback must be wrapped in try/catch: an unguarded throwing consumer callback killed the pump and the child blocked on a full pipe (measured: 6 s timeout, 50000 lines).
- stderr text is never classified, never copied into an Activity tag, event or status, and never into a metric tag: ocx stderr and the error document embed package references (`ocx.sh/zz:1`) and, at `trace`, more.
- Never use .NET 9-only telemetry APIs on the net8.0 floor: `Activity.AddException`, `InstrumentAdvice<T>` and the `ActivitySource(name, version, tags)` constructor fail to compile on net8.0 (CS1061, CS0246, CS1729, measured), while `Instrument.Enabled`, `MeterOptions` and `Activity.SetStatus` are fine.
- Consumer-side ILogger is a recipe, not a package: `OnStderrLine = l => logger.LogDebug("{OcxLine}", l)` in the consumer's own code. Correlation is free because ILogger captures the active `Activity` ids.

## Findings

### 1. The five options, measured against this SDK

| Option | Dependency added | Fits a one-shot process wrapper? | Verdict |
|---|---|---|---|
| None | 0 | Loses diagnosis of "which ocx call was slow/failed" | Too little: the exit code exists, but timing, retries and nesting are invisible |
| Callbacks on the options type | 0 | Good for the *stderr stream* only (Pulumi.Automation ships exactly that) | Keep for stderr lines; not a general channel |
| `ILogger` via `Microsoft.Extensions.Logging.Abstractions` | 1 package, plus 2 transitive on net8.0 (section 2) | Fits long-lived connection clients | Reject for the SDK |
| `ActivitySource` + `Meter` (`System.Diagnostics.DiagnosticSource`) | 0 on net8.0+ (in-box) | Fits: one span per CLI call | **Adopt** |
| `EventSource` | 0 (in-box) | Designed for ETW/EventPipe perf analysis | Reject: no OpenTelemetry tag/status model; Azure keeps it for its own HTTP pipeline |

Evidence for the corpus claim:

- 13 of 35 exemplar repos reference `ILogger`; 0 of the 9 SDK/CLI-wrapper-like repos do ([exemplar-language-shape.md:22](../csharp-audit/exemplar-language-shape.md)). Libraries that wrap a process or HTTP API instrument with `ActivitySource` when they instrument at all ([exemplar-language-shape.md:451](../csharp-audit/exemplar-language-shape.md)).
- Re-measured for this note: `grep -rlE "ILogger|ActivitySource|EventSource|DiagnosticSource" --include='*.cs'` returns 0 files in `Tyrrrz__CliWrap@7dbc252fa773`, and 0 files across `adamralph__simple-exec` and `madelson__MedallionShell`.
- Libraries that *do* take a logger are connection-oriented clients: StackExchange.Redis references `Microsoft.Extensions.Logging.Abstractions` unconditionally (`StackExchange__StackExchange.Redis@e7c43a269f53:src/StackExchange.Redis/StackExchange.Redis.csproj:22`) and exposes `ILoggerFactory? LoggerFactory` on `ConfigurationOptions` (`:src/StackExchange.Redis/ConfigurationOptions.cs:856`); Testcontainers pins Abstractions 8.0.3 (`testcontainers__testcontainers-dotnet@04cbb73fcc58:Directory.Packages.props:12`, `src/Testcontainers/Testcontainers.csproj:14`) and offers `WithLogger(ILogger)` (``src/Testcontainers/Builders/IAbstractBuilder`3.cs:137``) with `NullLogger.Instance` internally (`src/Testcontainers/Clients/BuildKitImageOperations.cs:306`); Npgsql references Abstractions plus DI.Abstractions (`npgsql__npgsql@9c47244547c2:src/Npgsql/Npgsql.csproj:16-17`) *and* has an `ActivitySource` named `Npgsql` (`src/Npgsql/NpgsqlActivitySource.cs:15`) plus a `Meter` (`src/Npgsql/MetricsReporter.cs:54`). Even the ILogger users add the in-box tracing channel.
- Instrumenters in the process-wrapper space: Pulumi's core SDK declares `ActivitySource("pulumi-sdk-dotnet")` (`pulumi__pulumi-dotnet@2a0dca84f09b:sdk/Pulumi/Deployment/Instrumentation.cs:87`) and Pulumi.Automation (the CLI-driving layer) exposes `Action<string>? OnStandardError` (`sdk/Pulumi.Automation/Commands/BaseOptions.cs:39`) instead of a logger. OpenAI declares one `ActivitySource` and one `Meter` per client (`openai__openai-dotnet@1f0e8829acac:OpenAI/src/Utility/Telemetry/OpenTelemetryScope.cs:16-19`).
- Azure.Core is the only exemplar with `EventSource` plus its own tracing wrapper: `EventSourceName = "Azure-Core"` (`Azure__azure-sdk-for-net@32c48fc3d524:sdk/core/Azure.Core/src/Diagnostics/AzureCoreEventSource.cs:15`) and `new ActivitySource(n)` behind `DiagnosticScopeFactory` (`sdk/core/Azure.Core/src/Shared/DiagnosticScopeFactory.cs:101`). Its guideline: "DO NOT use `DiagnosticSource`, or `ActivitySource` API directly from client libraries" and "DO use EventSource library to produce diagnostic events" ([Azure SDK .NET implementation](https://azure.github.io/azure-sdk/dotnet_implementation.html)). That rule exists because Azure.Core wraps the API for netstandard2.0/older hosts and a shared pipeline; a net8.0+ SDK with no pipeline has no such reason (section "Contested").
- EventSource's own docs place it as "a fast structured logging solution ... Most often developers use EventSource logs for performance analysis" over ETW/EventPipe ([learn.microsoft.com EventSource](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/eventsource)); it has no OpenTelemetry-conformant tag/status model.

Microsoft's own library guidance names the zero-dependency choice. Tracing: "Only app developers need to reference an optional third-party library for collecting the distributed trace telemetry ... .NET library authors can exclusively rely on APIs in System.Diagnostics.DiagnosticSource, which is part of .NET runtime. This ensures that libraries will run in a wide range of .NET apps, regardless of the app developer's preferences about which library or vendor to use" ([distributed tracing instrumentation](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/distributed-tracing-instrumentation-walkthroughs)). Dependencies: "A good way to reduce the likelihood of a diamond dependency breaking your library is to minimize the number of packages you depend on. DO review your .NET library for unnecessary dependencies." ([Dependencies and .NET libraries](https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/dependencies)).

Why the callback is still wanted for stderr: events on an Activity "are stored in an in-memory list ... only suitable for recording a modest number of events. For a large or unbounded volume of events, it's better to use a logging API" (same tracing page), and ocx at `debug`/`trace` can emit hundreds of lines. Activities are for the call's shape; the stderr stream is a separate, optional channel (section 12).

### 2. What Microsoft.Extensions.Logging.Abstractions costs per TFM, and the diamond

Nuspec dependency groups, read from the NuGet flat container ([8.0.3](https://api.nuget.org/v3-flatcontainer/microsoft.extensions.logging.abstractions/8.0.3/microsoft.extensions.logging.abstractions.nuspec), [10.0.0](https://api.nuget.org/v3-flatcontainer/microsoft.extensions.logging.abstractions/10.0.0/microsoft.extensions.logging.abstractions.nuspec)):

| Package version | net8.0 group | net10.0 group | netstandard2.0 group |
|---|---|---|---|
| Abstractions 8.0.3 | DI.Abstractions 8.0.2 | (no net10 group) | DI.Abstractions 8.0.2, System.Buffers 4.5.1, System.Memory 4.5.5 |
| Abstractions 10.0.0 | DI.Abstractions 10.0.0, **System.Diagnostics.DiagnosticSource 10.0.0** | DI.Abstractions 10.0.0 | DI.Abstractions, DiagnosticSource, Bcl.AsyncInterfaces and 7 more |

Resolved graph of a `net8.0` library with a single `PackageReference` (fixture `diamond/`, `project.assets.json`):

```
lib-pin10   [net8.0]  Microsoft.Extensions.DependencyInjection.Abstractions/10.0.0, Microsoft.Extensions.Logging.Abstractions/10.0.0, System.Diagnostics.DiagnosticSource/10.0.0
lib-pin10   [net10.0] Microsoft.Extensions.DependencyInjection.Abstractions/10.0.0, Microsoft.Extensions.Logging.Abstractions/10.0.0
consE-libnone [net8.0] (none)
```

Because System.Text.Json 10.0.0 on net8.0 depends only on `System.IO.Pipelines` and `System.Text.Encodings.Web` ([nuspec](https://api.nuget.org/v3-flatcontainer/system.text.json/10.0.0/system.text.json.nuspec)), the CS-JSON-mandated STJ 10 package leaves in-box `System.Diagnostics.DiagnosticSource` 8.0 alone; adding Abstractions 10 on net8.0 would *replace* it with the 10.0.0 package for every consumer of the SDK. `System.Diagnostics.DiagnosticSource` 10.0.0 itself has empty dependency groups on net8.0/9/10 ([nuspec](https://api.nuget.org/v3-flatcontainer/system.diagnostics.diagnosticsource/10.0.0/system.diagnostics.diagnosticsource.nuspec)), which is why the in-box route has nothing to add.

The diamond, measured (restore of five consumers, all `net8.0`, `Directory.Build.props` with `TreatWarningsAsErrors=true`):

| Consumer | Direct ref | Library | Result |
|---|---|---|---|
| consA | Abstractions 8.0.3 | lib-pin10 (Abstractions 10.0.0) | **restore exit 1, NU1605** "Detected package downgrade: Microsoft.Extensions.Logging.Abstractions from 10.0.0 to 8.0.3 ... consA -> lib-pin10 -> Microsoft.Extensions.Logging.Abstractions (>= 10.0.0)" |
| consB | Abstractions 8.0.3 | lib-floor8 (Abstractions 8.0.0) | exit 0; resolves 8.0.3 and DI.Abstractions 8.0.2 |
| consC | none | lib-pin10 | exit 0; resolves 10.0.0 + DI.Abstractions 10.0.0 + DiagnosticSource 10.0.0 |
| consD | Abstractions 10.0.0 | lib-floor8 | exit 0; resolves 10.0.0 |
| consE | none | lib-none | exit 0; **zero packages** |

`-p:TreatWarningsAsErrors=false` does not rescue consA: NuGet documents "the .NET SDK opts into treating this warning as an error through `WarningsAsErrors`" ([NU1605](https://learn.microsoft.com/en-us/nuget/reference/errors-and-warnings/nu1605)) and the fixture still exits 1. The mitigation if a logging dependency were ever accepted: reference the *lowest* Abstractions that has the API (8.0.0, consB/consD), per "NuGet prefers the lowest applicable version" and "DO NOT have NuGet package references with no minimum version" ([Dependencies guidance](https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/dependencies)). That is the Testcontainers choice (8.0.3 on a repo whose peers sit at 10.x). It still leaves one more package for the CS-BUILD source-mapping/audit surface (CS-BUILD) and one more reason for a version to move.

Counter-argument kept honest: Microsoft's own logging guidance says to expose logging via `ILoggerFactory` and to default to `NullLoggerFactory.Instance` ([logging guidance for library authors](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/library-guidance)). That guidance is written for libraries that log internally in many classes; this SDK has one choke point (the process engine) whose interesting facts are already structured data (argv shape, exit code, duration, stderr). An in-box `ActivitySource` plus a stderr callback gives the same visibility without the dependency, and ILogger users still get correlation: "ILogger supports automatically capturing the active Activity IDs so messages logged via that API can still be correlated with the distributed trace" ([tracing instrumentation page](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/distributed-tracing-instrumentation-walkthroughs)).

### 3. Zero cost without a listener

Fixture `alloc/` (net10.0 Release, 1,000,000 calls, `GC.GetAllocatedBytesForCurrentThread`, exit 0 = no allocation):

| Scenario | Bytes/call | ns/call | Exit |
|---|---|---|---|
| `new ActivitySource("Ocx.Sdk")` per call, `StartActivity` null | **128** | 330 | 1 (red) |
| Same, never disposed, 100,000 calls | retains **63 B per leaked source** (global registry) | | 1 (red) |
| Static source, `StartActivity` null, `a?.SetTag("process.exit.code", code)` | **0** | 16 | 0 (green) |
| Static source, tag value built before the null check (`var v = $"{cmd}:{code}"; a?.SetTag(.., v)`) | **48** | 196 | 1 (red) |
| `NullLogger.Instance.LogInformation("ocx {Command} exited {ExitCode}", cmd, code)` | **64** (params array + boxed int) | 82 | 1 (red) |
| `[LoggerMessage]` generated method on `NullLogger` | 0 | 5 | 0 (green) |
| `Histogram<double>.Record` guarded by `.Enabled`, no listener | 0 | 3 | 0 (green) |
| `a?.SetTag("k", Expensive())` with a null activity | `Expensive()` evaluated **0** times | | 0 (green) |

Readings: (a) the only per-call-free pattern is a static `ActivitySource` with `StartActivity` returning null; the docs say "If there are no registered listeners or there are listeners that are not interested, `StartActivity()` will return `null` and avoid creating the Activity object" ([tracing walkthrough](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/distributed-tracing-instrumentation-walkthroughs)); (b) C# `?.` short-circuits argument evaluation when the receiver is null (0 evaluations), but any value *computed on a separate line* before the call still costs; use `activity is { IsAllDataRequested: true }` as the block guard when more than one tag needs preparing, which is the Npgsql shape (`npgsql__npgsql@9c47244547c2:src/Npgsql/NpgsqlActivitySource.cs:46-48`); (c) "no-op ILogger" is not free: the generated `[LoggerMessage]` path is, the template-plus-args extension path allocates; since the SDK adds no logger, the question disappears. Meter docs add the recording side: "typically run in <10 ns when no data is being collected" ([metrics instrumentation](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/metrics-instrumentation)), matching the 3 ns above.

### 4. Names: source, meter, version, span, kind

- **Source and meter name `Ocx.Sdk`.** Microsoft: "The source name ... has to be unique ... use a hierarchical name that contains the assembly name" and "If an assembly is adding instrumentation for code in a second, independent assembly, the name should be based on the assembly that defines the ActivitySource" ([tracing walkthrough](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/distributed-tracing-instrumentation-walkthroughs)); the same page says "Each library or library subcomponent can (and often should) create its own source" so consumers can toggle them separately. One component (the process engine) means one source; OpenAI and Npgsql also use one name for both source and meter (`OpenAI/src/Utility/Telemetry/OpenTelemetryScope.cs:16-19`, `npgsql__npgsql@9c47244547c2:src/Npgsql/NpgsqlActivitySource.cs:15` and `MetricsReporter.cs:54`). The NuGet package id should equal the source name so `AddSource` and `dotnet add package` agree.
- **Version.** "We recommend that you provide the version in case you release multiple versions of the library and make changes to the instrumented telemetry." Npgsql reads `AssemblyInformationalVersionAttribute` (`npgsql__npgsql@9c47244547c2:src/Npgsql/NpgsqlActivitySource.cs:184-187`); with MinVer (CS-PKG) that string is `1.2.3+<sha>`, so strip the `+` suffix to keep the value low-cardinality. The measured fixture shows the version arrives on `Activity.Source.Version` (`source=Ocx.Sdk@1.0.0`).
- **Public constants.** `public static class OcxTelemetry { public const string SourceName = "Ocx.Sdk"; public const string MeterName = "Ocx.Sdk"; }`. OTel .NET requires an exact match: "The name of each `ActivitySource` must match a name passed to `AddSource`" ([OTel .NET instrumentation](https://opentelemetry.io/docs/languages/dotnet/instrumentation/)); a constant removes the typo class. A `const` is baked into consumer assemblies, so the name is permanent API (PublicApiAnalyzers, CS-API).
- **Span name.** OTel: the span name should be "the most general string that identifies a (statistically) interesting class of Spans ... Generality SHOULD be prioritized over human-readability", with `get_account` preferred over `get_account/42` ([trace API](https://opentelemetry.io/docs/specs/otel/trace/api/)). Use `ocx {command}` where `{command}` is the space-joined leaf from the SDK's closed command table (`ocx index list`, `ocx package pull`), never built from caller strings. Npgsql follows the same "operation + low-cardinality target" pattern (`NpgsqlActivitySource.cs:23-44`).
- **Kind.** `ActivityKind.Client`: a synchronous call to another process whose work is not part of this trace. Default is `Internal`, "appropriate for Activities that are an internal operation within an application with no remote parent or children" ([tracing walkthrough](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/distributed-tracing-instrumentation-walkthroughs)). Neither OTel semconv nor the .NET docs define a "subprocess" span kind; `Client` mirrors Npgsql's database calls and is flagged contested below.

### 5. Attribute allow-list and the telemetry secret rule

Allow-list (every key the SDK may ever set on a span; metric tags are a subset):

| Key | Type | Value source | Why safe | Semconv status |
|---|---|---|---|---|
| `process.executable.name` | string | the constant `"ocx"` (not the resolved path) | constant | Release Candidate ([registry](https://opentelemetry.io/docs/specs/semconv/registry/attributes/process/)) |
| `process.exit.code` | int | raw child exit code | number, closed set (13 ocx codes plus signal/passthrough values) | Release Candidate |
| `error.type` | string | leaf exception type full name (5 values) | closed set | stable, "SHOULD set" on failure ([recording errors](https://opentelemetry.io/docs/specs/semconv/general/recording-errors/)) |
| `ocx.command` | string | closed command table | closed set (about 70 leaves) | custom, `ocx.` prefix |
| `ocx.attempt` | int | 1-based try number (retry only on exit 75, CS-PROC) | bounded | custom |

Custom keys use an app-specific prefix: "Application-specific names: prefix with the application name" and "It is not recommended to use existing OpenTelemetry semantic convention namespace as a prefix" ([naming](https://opentelemetry.io/docs/specs/semconv/general/naming/)); `ocx.` is not an OTel namespace. Names stay lowercase dotted snake_case.

What is forbidden, with the primary reason:

- `process.command_args` / `process.command_line`: the registry's own note, "SHOULD NOT be collected by default unless there is sanitization that excludes sensitive data" ([process registry](https://opentelemetry.io/docs/specs/semconv/registry/attributes/process/)). argv is a leak surface whenever a caller or a future ocx flag puts a credential there (CS-PROC already says secrets go only as stdin bytes, so this is defence in depth), and the Python SDK redacts argv from every outbound surface (`python-sdk-digest.md` row 25).
- `process.executable.path`: the full resolved path contains the user name (`/home/alice/.ocx/...`).
- Package references, registry hosts, project paths, env values, stdout, stderr, `Exception.Message`: measured to contain package refs. `ocx --offline --json package pull zz:1` puts `ocx.sh/zz:1` on both the stdout error document and stderr (`grep -c` = 1 and 2, fixture `loglevel/`). Private package names are business-sensitive and unbounded in cardinality.
- Anything from `OCX_AUTH_*`: never read for telemetry.

Fixture `listener/` plants the leak. Red (`red-argv-tags`): the span gets `process.command_args = [--offline, --json, package, pull, zz:1, --password, hunter2]` and the test fails three checks (subset of allow-list, argv/package value found in span, even the exit-code assertion because ocx rejected the planted flag with 64). Green: tags `process.executable.name=ocx`, `ocx.command=package pull`, `process.exit.code=81`, `error.type=Ocx.Sdk.OcxCommandException`, no events.

The rule is enforced by *structure*, not by redaction: a redactor fails open on any secret it does not know (ocx at `trace` may print secrets "that never passed through the SDK's own composition", ocx-sdk-python `concepts/errors-and-security/package-ref-and-credentials.md:55`), an allow-list cannot.

### 6. Status, error.type and exceptions

OTel: leave status `Unset` on success; set `Error` on failure; "SHOULD set the `error.type` attribute"; "A span and its corresponding metric ... SHOULD have the same `error.type` value" ([recording errors](https://opentelemetry.io/docs/specs/semconv/general/recording-errors/)); "When span status is set to Ok it SHOULD be considered final" ([trace API](https://opentelemetry.io/docs/specs/otel/trace/api/)), so never set `Ok` from a library: it overrides an application's own judgement.

Two deliberate deviations from the semconv text:

1. The convention says the description "SHOULD be set to the exception message". The SDK uses a fixed template instead. CS-ERR (R-EXC-18) makes `Message` a fixed template **plus redacted argv** (`csharp-api-exceptions-from-exit-codes.md:65,454`), and exceptions carry `StderrExcerpt` on a separate property; copying `Message` to telemetry would copy redacted argv into a store with a different retention policy. Measured red (`red-message-status`): status description became the full stderr line `error: failed to install package: ocx.sh/zz:1 ...`.
2. `Activity.AddException` (available from DiagnosticSource 9.0) records an event named "exception" with the tags `exception.message`, `exception.stacktrace` and `exception.type` ([API](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.activity.addexception)). Do not call it: it carries `Message` and a stack trace into a span, it does not exist on the net8.0 floor (CS1061, section 13), and the OTel recording-errors page directs exception recording to log records ("instrumentation SHOULD record this exception as a" log record) and says "It's NOT RECOMMENDED to record the same exception more than once" and not to record exceptions "that are handled by the instrumented library". Npgsql calls `activity.AddException(exception)` and sets status from `exception.Message` (`npgsql__npgsql@9c47244547c2:src/Npgsql/NpgsqlActivitySource.cs:134-157`); that is a database driver whose messages are authored by the server, not a precedent for a process wrapper.

Template: `activity.SetStatus(ActivityStatusCode.Error, $"ocx exited with code {exit}")` for `OcxCommandException`; `"ocx timed out"` / `"ocx launch failed"` / `"ocx output undecodable"` / `"ocx contract violation"` for the other four leaves. Caller cancellation (`OperationCanceledException`) leaves status `Unset` and sets no `error.type` (the caller's choice is not a failure of the call; this is a judgement, section "Contested").

### 7. Metrics: one histogram, bounded tags

One instrument: `meter.CreateHistogram<double>("ocx.client.operation.duration", unit: "s", description: "Duration of ocx CLI invocations made by the SDK.")`. Microsoft's guidance: "For timing things, Histogram is usually preferred"; "When recording measurements of time, prefer units of seconds recorded as a floating point or double value"; names are "lowercase dotted hierarchical names and an underscore as the separator between multiple words"; "make the instrument name globally unique on its own" because not all tools preserve the Meter name ([metrics instrumentation](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/metrics-instrumentation)). The `*.client.operation.duration` shape follows OTel's database and HTTP client durations; Npgsql's `CommandDuration` is the analogue (`npgsql__npgsql@9c47244547c2:src/Npgsql/MetricsReporter.cs:57`).

Tag cardinality: "likely less than 1000 combinations for one instrument is safe" and histograms "could be 10-100 times lower" (same page). Tags `ocx.command` (about 70 leaves, 81 command-tree nodes of which 70 are leaves per `ocx-cli-contract.md` section 4) times `error.type` (0 or 5 values) is at most 420 combinations; a histogram multiplies that by bucket storage, so keep it to these two tags and never add `process.exit.code` (about 20 plausible values) or any caller-supplied string. Guard the recording: `if (Duration.Enabled) { var tags = new TagList {...}; Duration.Record(seconds, tags); }`; the docs say Add/Record are "allocation-free ... with three or fewer tags specified individually. To avoid allocations with larger numbers of tags, use TagList". Time with `TimeProvider.GetTimestamp()`/`GetElapsedTime` (CS-XP: TimeProvider for every timer); the fixture used `Stopwatch` and works on both TFMs.

Do not ship `InstrumentAdvice<T>` bucket boundaries: it needs DiagnosticSource 9.0 (fails to compile on net8.0, CS0246) and "is supported in the OpenTelemetry .NET SDK as of version 1.10.0" only; the OTel default buckets start at 0 to 10000 and put all sub-second durations in the first bucket, so consumers will see coarse histograms until they add a View. Gate with `#if NET9_0_OR_GREATER` only if a consumer asks. No counters in v1: failure counts derive from the histogram's `error.type` dimension.

### 8. Activity.Current flow and the sync-wrapper leak

Fixture `current-flow/` (net10.0): a caller activity, then `await client.RunAsync()`.

- Green (`green-async-method`): `StartActivity` is *inside* the `async` method that awaits the child, with `.ConfigureAwait(false)` on every await (CS-ASYNC). Result: `child_is_child_of_caller=True caller_current_restored_after_call=True`. `ConfigureAwait(false)` does not break parenting: `Activity.Current` rides `ExecutionContext`, not the synchronization context.
- Red (`red-sync-wrapper`): a non-async `Task RunAsync()` calls `StartActivity` and returns `Inner(a)`. Result: parenting is right but `caller_current_restored_after_call=False current_after='ocx index list'`: the SDK's span is still `Activity.Current` in the caller after the call returned, so every later span the caller creates is mis-parented under a stopped SDK span. An `async` method gets its own `ExecutionContext` copy, so its `Activity.Current` assignment does not escape; a synchronous prologue does.

Rule: the Activity is started and disposed inside the same `async` method (use `using var activity = Source.StartActivity(...)` at the top of the method that awaits the process). This composes with CS-ASYNC (async-only, TCS with `RunContinuationsAsynchronously`) because the span's lifetime equals the awaited call.

### 9. The consumer test pattern

Both the SDK's own tests and consumers' tests need to assert on spans. The fixture's harness is the pattern:

```csharp
// CORRECT (listener fixture): global listener scoped by source name; keep ActivityStopped results
var stopped = new List<Activity>();
using var listener = new ActivityListener
{
    ShouldListenTo = s => s.Name == "Ocx.Sdk",
    Sample = (ref ActivityCreationOptions<ActivityContext> _) => ActivitySamplingResult.AllDataAndRecorded,
    ActivityStopped = a => { lock (stopped) stopped.Add(a); },
};
ActivitySource.AddActivityListener(listener);

var span = stopped.Single(a => a.DisplayName == "ocx package pull");
Assert.Equal(ActivityKind.Client, span.Kind);
Assert.Equal(ActivityStatusCode.Error, span.Status);
Assert.Equal(81, (int?)span.GetTagItem("process.exit.code"));
Assert.All(span.TagObjects, t => Assert.Contains(t.Key, AllowedKeys));
```

```csharp
// INCORRECT: asserting on Activity.Current after the call, or on a listener that did not opt in
using var listener = new ActivityListener { ShouldListenTo = _ => true };  // no Sample callback => StartActivity returns null
```

A listener *without* `Sample` yields no activities even though `HasListeners()` is true (measured, `listener-nosample/`: `no-sample: StartActivity returned null; HasListeners=True`, exit 1; `with-sample`: returns an Activity, exit 0), which is the commonest "my test sees nothing" bug. `ActivitySource.AddActivityListener` is process-global, so under parallel test execution filter by `TraceId`: start a root activity in the test (from a `ShouldListenTo`-whitelisted test source) and keep only `a.TraceId == root.TraceId`; the SDK span inherits it through `Activity.Current` (parenting verified in section 8; the parallel run itself was not executed). Metrics: `MeterListener` with `EnableMeasurementEvents` for instruments whose `Meter.Name == "Ocx.Sdk"` and `SetMeasurementEventCallback<double>` (fixture; `MetricCollector<T>` (namespace `Microsoft.Extensions.Diagnostics.Metrics.Testing`) is a test-only alternative, [metrics page](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/metrics-instrumentation)). Note Microsoft's warning that tests of a static `Meter` "should not be configured to run in parallel" if they use a global collector.

### 10. W3C traceparent: ocx does not read it

- The `traceparent` header is `version-traceid-parentid-traceflags` with 16-byte/8-byte ids, all-zero ids invalid, header name case-insensitive ([W3C Trace Context](https://www.w3.org/TR/trace-context/)). W3C defines HTTP bindings only; environment-variable carriers are an OpenTelemetry convention (`TRACEPARENT`, uppercase-normalised), currently "Release Candidate", and the spec warns "Context propagation via environment variables is not appropriate for sensitive information" ([env carriers](https://opentelemetry.io/docs/specs/otel/context/env-carriers/)).
- ocx: `grep -rniE 'traceparent' crates test taskfiles website/src .github` in `ocx@a23ec5be2939` returns nothing. `taskfiles/telemetry.taskfile.yml` pushes *CI test/Bazel* telemetry to `otel.ocx.sh` as OTLP traces and has nothing to do with the CLI's runtime. `Cargo.toml` and the crate manifests contain no `opentelemetry` dependency (grep).
- Pulumi is the exemplar for the other direction: its .NET SDK *reads* `TRACEPARENT` from its environment when the Pulumi engine sets it (`pulumi__pulumi-dotnet@2a0dca84f09b:sdk/Pulumi/Deployment/Instrumentation.cs:97`) and starts a root activity from it (`:92-97`), because the Pulumi CLI honours that contract. ocx does not.
- Decision: do not inject. Setting `TRACEPARENT` on the child would be dead data today and, once ocx (or a tool ocx execs, via `ocx exec`) starts reading it, a silent behaviour change. Do not scrub either: the CS-PROC scrub list is 7 keys, none trace-related, and a CI-provided `TRACEPARENT` is the user's property. The span the SDK emits already parents to the caller's `Activity.Current` (section 8), which is all the propagation the SDK needs; revisit when ocx documents an env carrier.

### 11. ocx side: `--log-level`, environment variables, streams

Facts from source (`ocx@a23ec5be2939`) and measured on the installed `ocx 0.6.5` (`loglevel/loglevel.sh`, isolated `OCX_HOME`, `OCX_NO_UPDATE_CHECK=1`, `--offline index list zz`):

| Invocation | exit | stdout bytes | stderr lines |
|---|---|---|---|
| `--log-level trace` / `debug` | 0 | 15 | 6 |
| `--log-level warn` | 0 | 15 | 1 (`warning: Package 'ocx.sh/zz' not found in the index.`) |
| `--log-level error` / `off` | 0 | 15 | 0 |
| no flag, no env | 0 | 15 | 1 (default level is info) |
| `OCX_LOG_LEVEL=trace`, no flag | 0 | 15 | **1 (ignored by 0.6.5)** |
| `OCX_LOG=trace`, no flag | 0 | 15 | 6 (0.6.5 reads `OCX_LOG`) |
| `RUST_LOG=trace`, no flag | 0 | 15 | 6 |
| `OCX_LOG_LEVEL=trace` + `--log-level off` | 0 | 15 | 0 (flag wins) |
| `OCX_LOG=trace` + `--log-level off` | 0 | 15 | 0 (flag wins) |
| `RUST_LOG=trace` + `--log-level warn` | 0 | 15 | 1 (flag wins) |
| `--log-level trace` placed **after** the subcommand | **64** | 0 | 7 (`error: unexpected argument '--log-level' found`) |

- **Placement:** global, pre-subcommand only (`ocx-cli-contract.md:66`: all 13 root args have `global: false`). `--log-level=debug`, `--log-level debug`, `-l debug` and `-ldebug` all parse and produce the same output.
- **Precedence:** the flag outranks every environment variable on 0.6.5. In main source, `build_env_filter` reads `OCX_LOG_CONSOLE` then `OCX_LOG_LEVEL` then `RUST_LOG` (`crates/ocx_cli/src/tracing_init/log_settings.rs:107-121`), but when `console_level` (the flag) is `Some` it parses that instead of the env directives (`:136-140`); the doc agrees: "The same value can be set via `OCX_LOG_LEVEL`; the flag wins" (`website/src/docs/reference/command-line.md:25`), and `crates/ocx_cli/src/app/env_flags.rs:19` registers the pair. `OCX_LOG` is retired in 0.7.0 (`ocx_env/src/retired.rs:79`, replacement `OCX_LOG_LEVEL`). The in-process seam used by tests ignores both env variables outright (`crates/ocx_cli/src/app/seam.rs:162-163`).
- **Streams:** stdout carries exactly one JSON document, unchanged by log level (`{"zz":[]}` at trace and at off, 15 bytes); logs, warnings and errors go to stderr; on failure the error document is on stdout and the log lines on stderr (exit 81 example: 7 stderr lines at `debug`). Progress renders only on a terminal stderr, so a piped stderr stays line-oriented.
- **Formats** (parse only for display, never to classify): at info/warn the lines are `warning: ...` / `error: ...`; at debug/trace each line is `<RFC3339 timestamp> LEVEL message`. At `debug` the first line dumps the parsed `ContextOptions { config, project, ..., index, log_level, color }` (`crates/ocx_cli/src/app/context.rs:119`). A canary `OCX_AUTH_EXAMPLE_COM_TOKEN` did not appear at `trace` for `index list` (0 hits), but the Python SDK warns that at `trace` ocx "may print secrets it holds" (`ocx-sdk-python/src/ocx_sdk/_config.py:149`); one offline probe does not disprove that for registry traffic.
- **Main vs 0.6.5:** main honours `OCX_LOG_LEVEL`; 0.6.5 does not. Not measured on main (no main binary exists locally; `csharp-process-real-ocx` produced none). Because the flag wins on both, an SDK that always passes the flag behaves identically on both and never needs the env var.

The ocx contract for the SDK (matches `ocx-cli-contract.md` lessons 3 and the Python SDK `_client.py:694-695`, which only sends the flag when configured):

```csharp
// CORRECT: explicit, pre-subcommand, from a closed enum; explicit switch (no ToString().ToLowerInvariant(): CA1308)
static string Wire(OcxLogLevel l) => l switch {
    OcxLogLevel.Trace => "trace", OcxLogLevel.Debug => "debug", OcxLogLevel.Info => "info",
    OcxLogLevel.Warn => "warn", OcxLogLevel.Error => "error", OcxLogLevel.Off => "off",
    _ => throw new ArgumentOutOfRangeException(nameof(l)) };
psi.ArgumentList.Add("--log-level"); psi.ArgumentList.Add(Wire(options.LogLevel));   // then --format json --color never, then the verb
```

```csharp
// INCORRECT (every line a documented failure): env var for 0.6.5, flag after the verb, ambient level
psi.Environment["OCX_LOG_LEVEL"] = "debug";   // ignored by 0.6.5; honoured by main: version-dependent behaviour
psi.ArgumentList.Add("index"); psi.ArgumentList.Add("list"); psi.ArgumentList.Add("--log-level"); // exit 64
```

`--log-level` takes a *closed* clap enum (`trace|debug|info|warn|error|off`, `crates/ocx_cli/src/tracing_init/log_level.rs`), so a plain C# `enum OcxLogLevel` is right here; the open-enum `readonly record struct` rule (CS-API) is for values ocx *emits*, not values the SDK sends.

Default `Warn`: keeps warnings (e.g. "not found in the index", exit 0) and errors, drops `Installing packages ...` info chatter, and avoids the debug-level options dump. Always sending the flag also neutralises a host-ambient `RUST_LOG=trace`/`OCX_LOG=trace` that would otherwise flood captured stderr (6 lines instead of 1 in the table).

### 12. The stderr-surfacing contract

Constraints inherited from CS-PROC: stderr is read by one byte pump, UTF-8 without BOM, capped at 16 MiB, and "past the cap, discard and keep reading" (`csharp-process-streams-and-encoding.md:38-40`); CS-ERR: exceptions carry `StderrExcerpt` (bounded, redacted, 500 chars, not in `Message`; `csharp-api-exceptions-from-exit-codes.md:176`) and classification never reads stderr text (`:149`).

Contract:

1. **Data, always.** The result of every call carries the captured `Stderr` (redacted, at most 16 MiB; a `StderrTruncated` bool if the cap hit). Every `OcxException` leaf that has a child process carries `StderrExcerpt`. This is what an agent or a CI log needs after a failure and costs nothing extra.
2. **Live lines, opt-in.** `Action<string>? OnStderrLine { get; init; }` on the client options (Pulumi shape: `Action<string>? OnStandardError`, `pulumi__pulumi-dotnet@2a0dca84f09b:sdk/Pulumi.Automation/Commands/BaseOptions.cs:39`; Python's `on_log` is client-level). Lines are split on `\n`, trailing `\r` trimmed, redacted *before* invocation, and delivered even past the retention cap (a stream, not storage). Invocation is from the stderr pump's continuation (thread-pool), sequential within one call, concurrent across calls; the callback must be thread-safe and fast. **No invocation after the awaited task completes** (the pump is drained first; fixture shows `calls_after_return=0`).
3. **Callback faults must not stop the pump.** Wrap each invocation in try/catch (suppress CA1031 with a justification: the one place the CS-ERR catch-all ban has an exception), disable the callback after the first fault, keep draining. Fixture `stderr-callback/` (child writes 50000 lines, ~1.3 MB, to stderr; consumer callback throws on the 3rd line): red = unguarded throw: the pump unwinds, the child blocks on the full stderr pipe, `TaskCanceledException after 6184 ms`; green = guarded: `exit=0 elapsed_ms=843 lines_seen_by_pump=50000 callback_calls=3 callback_faulted=True calls_after_return=0`. (Python avoided the issue by rejecting `on_log` on async paths; .NET continuations run on the pool, so no event-loop stall, but the same "consumer code inside the drain loop" hazard remains.) The fixture used `/bin/sh`, so Windows behaviour of this exact scenario was not run; the mechanism (a stopped reader fills a pipe) is the same E1 deadlock already measured on both OSes in CS-PROC.
4. **Never on telemetry.** stderr content is not an Activity tag, event, status description or metric tag (section 5).
5. **Never classify.** Exit code only (CS-ERR: never classify by stderr). `Stderr` text is for humans and logs.
6. **Consumer ILogger bridge is documented, not shipped:**

```csharp
// consumer code (their own dependency on M.E.L): lines arrive redacted; correlation comes from Activity.Current
var client = await OcxClient.CreateAsync(new OcxClientOptions {
    LogLevel = OcxLogLevel.Debug,
    OnStderrLine = line => OcxLog.Line(logger, line),   // [LoggerMessage(Level = LogLevel.Debug, Message = "ocx: {Line}")]
});
```

Open design question left for the consolidator: whether `OnStderrLine` should be per-call (Pulumi) or client-level (Python); per-call avoids shared mutable captured state but multiplies the options surface. The fault-handling rule is the same either way.

### 13. API availability by TFM, and .NET 11

Compiled on `net8.0` and `net10.0` with `Probe.cs` (fixture `api-eras/`, one `#if` per API):

| API | net8.0 | net10.0 | Package floor |
|---|---|---|---|
| `Activity.AddException(Exception, in TagList, DateTimeOffset)` | CS1061 | OK | DiagnosticSource 9.0 ([API](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.activity.addexception) lists net-9.0+) |
| `InstrumentAdvice<T>` / `advice:` parameter | CS0246 | OK | 9.0 ([metrics page](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/metrics-instrumentation)) |
| `new ActivitySource(name, version, tags)` | CS1729 | OK | 9.0 |
| `new Meter(MeterOptions)`, `new Meter(name, version, tags, scope)` | OK | OK | 8.0 |
| `Instrument.Enabled`, `Activity.SetStatus`, `ActivityEvent(tags:)`, `ActivitySource.HasListeners()`, `TimeProvider.GetElapsedTime` | OK | OK | 5.0 to 8.0 |
| `Activity.RecordException`, `ActivitySource.Create`, `GetTracer`, `SetStatus("error")` | CS1061 / CS1929 / CS1061 / CS1503 on net10.0 | | do not exist (OTel Java/JS and OpenTelemetry.Api spellings) |

- The in-box version on net8.0 is DiagnosticSource 8.0, and the "package version >= 8" advice in the docs applies to older TFMs only; `net8.0;net10.0` needs no PackageReference. If the SDK ever multi-targets `netstandard2.0` (CS-BUILD facts), the guidance is "reference the oldest version of the package which is still supported and contains the APIs your library needs" ([tracing walkthrough](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/distributed-tracing-instrumentation-walkthroughs)); the default TFMs in CS-BUILD make that moot.
- **.NET 11 (C# 15, RC1 `11.0.100-rc.1.26425.128`):** the listener fixture builds and gives GREEN/RED identically on `net11.0` (`transcript-net11.txt`). Nothing in this note is specific to .NET 11; no telemetry API used here changed. The ActivitySource docs' default moniker is already net-11.0 and show the same `StartActivity` overloads ([API](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.activitysource.startactivity)).

### 14. Verified on the toolchain

Fixtures root: `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-observability-library-instrumentation/` (SDK 10.0.401 via parent `global.json`; `net11/` pins `11.0.100-rc.1.26425.128`). Run with `/home/mherwig/.cache/research-lang/dotnet-tools/run.sh dotnet ...`. Linux x64 only. Transcripts sit beside each fixture as `transcript-*.txt`.

**V1. Per-call allocation: ActivitySource vs ILogger/NullLogger** (`alloc/`)

```
cd alloc && run.sh dotnet build -c Release -v q
for s in per-call-source static-source static-source-tags-unguarded logger-params logger-generated meter-record per-call-source-nodispose short-circuit; do run.sh dotnet bin/Release/net10.0/alloc.dll $s; echo exit=$?; done
```
Red: `scenario=per-call-source bytes_per_call=128 exit=1`; `static-source-tags-unguarded bytes_per_call=48 exit=1`; `logger-params bytes_per_call=64 exit=1`; `per-call-source-nodispose retained_bytes_per_leaked_source=63 exit=1`. Green: `static-source bytes_per_call=0 exit=0`; `logger-generated bytes_per_call=0 exit=0`; `meter-record bytes_per_call=0 exit=0`; `short-circuit: Expensive() evaluated 0 times with a null activity exit=0`.

**V2. ActivityListener test: name, tags, status for a failing real command** (`listener/`, real `ocx 0.6.5`, `net8.0` and `net10.0`, also `net11/`)

```
run.sh dotnet build -c Release -v q ; export OCX_HOME=$(mktemp -d)
for v in green red-no-status red-argv-tags red-message-status; do run.sh dotnet bin/Release/net10.0/listener.dll $v $(which ocx); done
```
Green (exit 0):
```
span: ocx package pull kind=Client status=Error desc='ocx exited with code 81' source=Ocx.Sdk@1.0.0
  tag process.executable.name = ocx | tag ocx.command = package pull | tag process.exit.code = 81 | tag error.type = Ocx.Sdk.OcxCommandException
  events: 0; metrics: ocx.client.operation.duration[ocx.command=package pull,error.type=Ocx.Sdk.OcxCommandException] | ...[ocx.command=index list]
RESULT: GREEN
```
Red `red-no-status` (exit 1): `status=Unset` and `FAIL non-zero exit => Status Error`. Red `red-argv-tags` (exit 1): `tag process.command_args = [--offline, --json, package, pull, zz:1, --password, hunter2]`, `FAIL tags are a subset of the allow-list`, `FAIL no argv value or package ref anywhere in the span`, `RESULT: RED (3 failed)`. Red `red-message-status` (exit 1): `desc='error: failed to install package: ocx.sh/zz:1 ...'`, `FAIL no argv value or package ref anywhere in the span`. Identical verdicts on net8.0, net10.0, net11.0 (`transcript-listener-tfms.txt`, `transcript-net11.txt`).

**V3. Consumer on Abstractions 8.0.3, library on 10.0.0, net8.0** (`diamond/`)

```
run.sh dotnet restore consA-direct8-libpin10/consA-direct8-libpin10.csproj -v q
run.sh dotnet restore consA-direct8-libpin10/consA-direct8-libpin10.csproj -p:TreatWarningsAsErrors=false -v q
```
Red: `error NU1605: Warning As Error: Detected package downgrade: Microsoft.Extensions.Logging.Abstractions from 10.0.0 to 8.0.3 ... consA-direct8-libpin10 -> lib-pin10 -> Microsoft.Extensions.Logging.Abstractions (>= 10.0.0)`, restore exit 1, also with `TreatWarningsAsErrors=false`. Green twins: consB (lib floor 8.0.0) exit 0; consC (no direct ref) exit 0 and resolves DiagnosticSource 10.0.0 on net8.0; consD exit 0; consE (zero-dependency library) exit 0 with `packages: (none)`.

**V4. Activity.Current leak from a sync wrapper** (`current-flow/`)

Green `green-async-method`: `child_is_child_of_caller=True caller_current_restored_after_call=True`, exit 0. Red `red-sync-wrapper`: `caller_current_restored_after_call=False current_after='ocx index list'`, exit 1.

**V5. Throwing stderr callback** (`stderr-callback/`, POSIX `sh` child, 50000 stderr lines)

Red `red-unguarded-throw`: `TaskCanceledException after 6184 ms` / `RESULT: RED (pump died or child blocked on a full stderr pipe)`, exit 1. Green `green-guarded`: `exit=0 elapsed_ms=843 lines_seen_by_pump=50000 callback_calls=3 callback_faulted=True calls_after_return=0`, exit 0; `green-no-callback-after-return`: `callback_calls=50000 callback_faulted=False calls_after_return=0`, exit 0.

**V6. API availability** (`api-eras/`): `ADD_EXCEPTION net8.0 -> error CS1061 ... net10.0 -> OK`; `INSTRUMENT_ADVICE net8.0 -> CS0246`; `ACTIVITYSOURCE_TAGS net8.0 -> CS1729`; hallucinated APIs (`RecordException`, `ActivitySource.Create`, `GetTracer`, `SetStatus("error")`) all fail on net10.0 with CS1061/CS1929/CS1061/CS1503 (`transcript-api-eras.txt`).

**V7. `--log-level` vs `OCX_LOG_LEVEL` against ocx 0.6.5** (`loglevel/loglevel.sh`; no main binary available): table in section 11. Red: `OCX_LOG_LEVEL=trace` -> `stderr_lines=1` (ignored); flag after subcommand -> `exit=64`. Green: `--log-level trace` -> `stderr_lines=6`; `OCX_LOG_LEVEL=trace --log-level off` -> `stderr_lines=0`; stdout identical at trace and off (`{"zz":[]}`).

**V8. Listener without `Sample`** (`listener-nosample/`): red `no-sample: StartActivity returned null; HasListeners=True` exit 1; green `with-sample: StartActivity returned an Activity` exit 0.

Pairs watched red then green: 16 (alloc 4, listener 3, listener-nosample 1, diamond 1, current-flow 1, stderr-callback 1, api-eras 3, loglevel 2).

## Normative guidance candidates

1. **OBS-LIB-01. The SDK project has no logging or telemetry package dependency.** Rationale: Microsoft says libraries "can exclusively rely on" in-box DiagnosticSource; Abstractions 10.0 on net8.0 adds 3 packages and NU1605-breaks consumers pinned at 8.0.3 (V3). Verify: `dotnet list src/Ocx.Sdk/Ocx.Sdk.csproj package --include-transitive | grep -c -e 'Microsoft.Extensions' -e 'OpenTelemetry' -e 'System.Diagnostics.DiagnosticSource'` prints `0` per TFM (build/test-only packages are not in the library graph); `rg -n -e 'Microsoft\.Extensions\.(Logging|DependencyInjection)' -e 'OpenTelemetry' src/ Directory.Packages.props --glob '*.csproj' --glob '*.props'` returns nothing; `rg -n 'using Microsoft\.Extensions\.Logging|ILogger' src/` returns nothing.
2. **OBS-LIB-02. Exactly one `ActivitySource` and one `Meter`, both `static readonly`, both named `Ocx.Sdk`, created in one file.** Rationale: per-call construction costs 128 B and 20x time, and an undisposed one leaks (V1). Verify: `rg -n 'new (ActivitySource|Meter)\(' src/` matches exactly 2 lines, both in `OcxTelemetry.cs`, both containing `static readonly`: `rg -n 'new (ActivitySource|Meter)\(' src/ | rg -v 'static readonly'` returns nothing.
3. **OBS-LIB-03. Publish the names as `public const string` on `OcxTelemetry` and version the source from the informational version with `+sha` stripped.** Rationale: `AddSource` must match exactly; version tells consumers when telemetry changed. Verify: `rg -n 'public const string (SourceName|MeterName) = "Ocx.Sdk"' src/` has 2 hits; test asserts `Activity.Source.Version` is non-empty and contains no `+`; PublicApiAnalyzers RS0016 severity error tracks the constants.
4. **OBS-LIB-04. Start the Activity inside the `async` method that awaits the child, with `using var`; never in a non-async wrapper.** Rationale: a synchronous prologue leaks `Activity.Current` into the caller (V4). Verify: test "Activity.Current is unchanged after `await client.X()`" (the V4 assertion); reading heuristic: every `StartActivity(` is in a method declared `async Task`; `rg -n -B6 'StartActivity\(' src/ | rg -n 'async Task'` shows the enclosing method.
5. **OBS-LIB-05. Every tag, status and metric write is null-safe via `activity?.` or an `is { IsAllDataRequested: true }` block; never `!`.** Rationale: `StartActivity` returns `null` with no listener; `?.` skips argument evaluation, a pre-computed local does not (V1). Verify: nullable analysis, `CS8602` error via CS-BUILD `.globalconfig` `dotnet_diagnostic.CS8602.severity = error`; `rg -n 'StartActivity\([^;]*\)!' src/` returns nothing; `rg -n 'activity\.(SetTag|SetStatus|AddEvent)' src/` hits only inside `IsAllDataRequested` blocks (reading).
6. **OBS-LIB-06. Span tags are exactly `process.executable.name`, `process.exit.code`, `error.type`, `ocx.command`, `ocx.attempt`.** Rationale: allow-list beats redaction; any other key is a leak surface (V2). Verify: `rg -o 'SetTag\("[^"]+"' src/ | sort -u` equals the 5 keys (diff against a checked-in `telemetry-allowlist.txt`: `rg -o 'SetTag\("[^"]+"' src/ | sed 's/SetTag("//;s/"//' | sort -u | diff - docs/telemetry-allowlist.txt`); the listener test asserts `TagObjects` keys are a subset (V2).
7. **OBS-LIB-07. Never record argv, env, cwd, resolved executable path, stdout, stderr, package references, `Exception.Message`, stack traces on any activity, event or metric tag.** Rationale: OTel says `process.command_args` "SHOULD NOT be collected by default unless there is sanitization"; measured: package refs appear in stderr and error docs. Verify: `rg -n -e 'process\.command_(args|line)' -e 'process\.executable\.path' -e 'AddException' -e 'RecordException' -e 'AddEvent' -e '\.Message\b.*SetStatus|SetStatus.*\.Message\b' src/` returns nothing; canary test: plant `hunter2` in argv and `zz:1` as package, assert neither string appears in tags, events, status description or metric tags (V2).
8. **OBS-LIB-08. Failure marking: `SetStatus(ActivityStatusCode.Error, <fixed template>)` plus `error.type` = leaf exception type full name; success leaves status `Unset`; never `ActivityStatusCode.Ok`.** Rationale: `Ok` is final and overrides the application; `Message` carries redacted argv. Verify: `rg -n 'ActivityStatusCode\.Ok' src/` returns nothing; every `SetStatus(` argument in `src/` is an interpolated string without `.Message`/`ex`; listener test asserts Error plus `error.type` on failure and `Unset` plus no `error.type` on success (V2).
9. **OBS-LIB-09. Span name is `ocx {command}` from a closed table; kind `Client`; no interpolation of caller strings into `StartActivity`.** Rationale: OTel span names must be low-cardinality. Verify: `rg -n 'StartActivity\(\$' src/` returns nothing; `rg -n 'StartActivity\(' src/` shows `ActivityKind.Client`; test asserts `DisplayName` equals `"ocx " + CommandTable[id]`.
10. **OBS-LIB-10. One histogram `ocx.client.operation.duration` (unit `s`, `double`), tags only `ocx.command` and `error.type`; record under `if (Duration.Enabled)`.** Rationale: bounded cardinality (<=420 series), zero cost unobserved (3 ns, 0 B). Verify: `rg -c 'CreateHistogram|CreateCounter|CreateUpDownCounter|CreateGauge|CreateObservable' src/` totals 1; `rg -n 'Duration\.Record' -B2 src/ | rg 'Enabled'` shows the guard; `MeterListener` test asserts the tag key set equals `{ocx.command, error.type}`.
11. **OBS-LIB-11. Do not call .NET-9-only telemetry APIs unconditionally while `net8.0` is a TFM.** Rationale: `Activity.AddException`, `InstrumentAdvice<T>`, `ActivitySource(name, version, tags)` fail to compile on net8.0 (V6). Verify: `dotnet build -f net8.0 -c Release` exits 0 with CS-BUILD TWAE (the compiler is the check); `rg -n -e 'InstrumentAdvice' -e 'AddException' src/` only inside `#if NET9_0_OR_GREATER`.
12. **OBS-LIB-12. Always send `--log-level <level>` as the first argv pair, before `--format`/`--color` and the verb; the level comes from `OcxLogLevel` (closed enum, default `Warn`) through an explicit switch.** Rationale: `OCX_LOG_LEVEL` is ignored by 0.6.5, honoured by main; ambient `RUST_LOG`/`OCX_LOG` otherwise changes stderr volume; the flag wins on both (V7); a flag after the verb exits 64. Verify: argv-builder unit test `Assert.Equal(["--log-level","warn"], argv[..2])`; `rg -c '"--log-level"' src/` equals 1; `rg -n -e 'OCX_LOG_LEVEL' -e '"OCX_LOG"' -e 'RUST_LOG' src/` returns nothing; `rg -n 'ToLowerInvariant' src/` returns nothing in the log-level mapper (CA1308 error).
13. **OBS-LIB-13. `Trace` and `Debug` are opt-in, documented as possibly exposing secrets; the default is never below `Warn`.** Rationale: ocx prints an options dump at debug and may print held secrets at trace; the SDK can redact only values it knows. Verify: test `new OcxClientOptions().LogLevel == OcxLogLevel.Warn`; `rg -n 'Trace' --glob '*.cs' src/ | rg 'Remarks|<remarks>'` shows the warning in XML docs (code-docs set owns the doc hygiene).
14. **OBS-LIB-14. stderr is surfaced as data first (`Stderr` on the result, `StderrExcerpt` on exceptions, both redacted and bounded) and as an optional `Action<string>? OnStderrLine`; never as Activity data, never classified.** Rationale: CS-ERR (never classify by stderr) and the telemetry secret rule. Verify: `rg -n -i 'stderr' src/**/*Telemetry*.cs src/**/*Activity*.cs` returns nothing; the exit-table conformance test (CS-ERR) is the classification guard.
15. **OBS-LIB-15. Every invocation of `OnStderrLine` is inside a try/catch that disables the callback after the first fault and never stops the drain; no invocation after the awaited task completes.** Rationale: unguarded throw hung the child for 6 s (V5). Verify: test with a callback that throws on line 3 against a child that writes >64 KiB to stderr must complete under the test timeout with `callback_faulted` observed and `calls_after_return == 0`; `rg -n 'OnStderrLine' -A3 src/ | rg -c 'try'` is at least the number of invocation sites; CA1031 suppression at that site carries the text "consumer code must never break the drain".
16. **OBS-LIB-16. Do not inject, forward or scrub `TRACEPARENT`/`TRACESTATE`/`BAGGAGE`.** Rationale: ocx reads none; injecting is dead data now and a silent behaviour change later. Verify: `rg -n -i -e 'traceparent' -e 'tracestate' -e 'baggage' src/` returns nothing; revisit trigger: `rg -n -i traceparent <ocx checkout>/crates` becomes non-empty.
17. **OBS-LIB-17. The README documents `AddSource(OcxTelemetry.SourceName)`, `AddMeter(OcxTelemetry.MeterName)` and the ILogger bridge as consumer code; the SDK ships no `AddOcx…` DI/logging extension package in v1.** Rationale: the bridge is a 3-line lambda; a DI package is a separate decision (API-12). Verify: `rg -n -e 'AddSource' -e 'AddMeter' -e 'OnStderrLine' README.md docs/` has all three; `rg -n 'IServiceCollection' src/` returns nothing.
18. **OBS-LIB-18. Tests that assert on spans use an `ActivityListener` with both `ShouldListenTo` and `Sample` set, filter by the test's own `TraceId`, and run no assertions on `Activity.Current` inside the SDK.** Rationale: a listener without `Sample` sees nothing; the listener is process-global. Verify: `rg -n 'new ActivityListener' tests/` – each initializer contains `Sample =` (`rg -c 'Sample =' tests/` >= `rg -c 'new ActivityListener' tests/`); reading heuristic for the `TraceId` filter.
19. **OBS-LIB-19. Ban ad-hoc diagnostic output in library code.** Rationale: `Console.WriteLine`, `Debug.WriteLine`, `Trace.WriteLine` bypass every listener and corrupt a consumer's stdout. Verify: BannedApiAnalyzers RS0030 error with `M:System.Console.WriteLine(*)`, `M:System.Console.Write(*)`, `M:System.Diagnostics.Debug.WriteLine(*)`, `M:System.Diagnostics.Trace.WriteLine(*)` in `BannedSymbols.txt` (extends the CS-XP-12 list); `rg -n -e 'Console\.(Write|Error)' -e 'Debug\.Write' -e 'Trace\.Write' src/` returns nothing.

## AI-agent angle

| Characteristic LLM mistake | Why it compiles and looks right | Smallest mechanical check |
|---|---|---|
| Adds `ILogger<OcxClient>` to the constructor / `Microsoft.Extensions.Logging.Abstractions` to the csproj "because that is how .NET libraries log" | Microsoft's own library-author page recommends `ILoggerFactory` + `NullLogger`; correct for in-process logging libs, wrong for a zero-dep wrapper; NU1605 appears only in a consumer pinned lower | OBS-LIB-01 `dotnet list package --include-transitive` + `rg 'ILogger' src/` |
| `new ActivitySource(...)` in the method or constructor, or `using var source = new ActivitySource` per call | Looks like normal scoped disposal | OBS-LIB-02 `rg -v 'static readonly'` |
| Tags the span with `process.command_args`, `string.Join(" ", argv)` or the resolved path "for debuggability" | It is in the semantic-convention registry, so it feels standards-compliant; the registry says SHOULD NOT collect by default | OBS-LIB-06/07 grep + canary test |
| `activity.SetStatus(Error, ex.Message)` and `activity.AddException(ex)` copied from Npgsql/OTel docs | Matches the spec text ("description SHOULD be the exception message"); leaks redacted argv; AddException does not compile on net8.0 | OBS-LIB-07/08 grep; `dotnet build -f net8.0` |
| Sets `ActivityStatusCode.Ok` on success | Symmetric with `Error`, many blog posts do it; `Ok` is final and overrides the app | `rg 'ActivityStatusCode\.Ok'` |
| Starts the Activity in a non-async `Task RunAsync()` wrapper or in a constructor | Parenting looks right in a console exporter; the leak shows later as mis-parented spans | V4 test; OBS-LIB-04 |
| Writes `OCX_LOG_LEVEL` into the child env (docs for main say so) | True for main, ignored by the released 0.6.5; silent no-op | OBS-LIB-12 grep + argv test + V7 |
| Puts `--log-level` after the verb (`index list --log-level debug`) like most CLIs | Fine in clap crates that mark flags global; ocx marks none global, exit 64 | argv-builder unit test; `ocx` exit-64 contract test |
| `RecordException`, `ActivitySource.Create`, `GetTracer()`, `SetStatus("error")` | OTel Java/JS/OpenTelemetry.Api spellings | compile error, CS1061/CS1929/CS1503 (V6) |
| Pulls `OpenTelemetry`/`OpenTelemetry.Api` into the library to "do tracing properly" | Many blog tutorials start with the OTel packages | OBS-LIB-01 grep |
| Invokes the stderr callback inline in the read loop without try/catch, or `await`s it | Reads cleanly; the hang appears only under a throwing consumer plus output above the 64 KiB pipe | OBS-LIB-15 fault-injection test (V5) |
| Uses `Console.WriteLine`/`Debug.WriteLine` for diagnostics, or `Process.OutputDataReceived` echoing to the console | Quick debug aid that ships | OBS-LIB-19 RS0030 |
| Emits stderr lines as `activity.AddEvent` | "Activity events are the OTel way to log" | OBS-LIB-14 grep; tracing docs say events suit a modest count only |
| Forgets that a listener needs `Sample` and concludes `StartActivity` is broken | `ShouldListenTo` alone looks sufficient | OBS-LIB-18 grep |
| Adds `InstrumentAdvice` buckets or `ActivitySource(tags)` | Appear in current .NET 10 docs | `dotnet build -f net8.0` (V6) |

## Contested / evolving

- **ILogger vs no logger for libraries (as of 2026-10).** Microsoft's library-author guidance still centres `ILoggerFactory`/`NullLogger` ([page updated 2026-06-26](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/library-guidance)), and large client libraries (Redis, Testcontainers, Npgsql) follow it. Trend among *process wrappers and SDK clients* is the opposite: CliWrap, simple-exec, MedallionShell, Anthropic, OpenAI, Octokit have none. The deciding variable is whether the library logs from many internal classes (take ILogger) or has one choke point with structured outputs (take ActivitySource plus a callback). Revisit only if the SDK grows a long-lived component (a daemon/session pool).
- **Azure's "do not use ActivitySource directly".** Azure.Core wraps it in `DiagnosticScope` and keeps `EventSource` for logs ([guideline](https://azure.github.io/azure-sdk/dotnet_implementation.html)); that policy predates broad ActivitySource support and serves a shared HTTP pipeline. For a single-component net8.0+ library the direct API is what Npgsql, OpenAI and Pulumi use.
- **ActivityKind for a subprocess call.** No semconv defines it. `Client` (Npgsql analogy) treats ocx as a remote operation; `Internal` is defensible because ocx emits no spans. If OTel adds process-spawn conventions this may change; as of 2026-10 the `process.*` registry is Release Candidate, not Stable.
- **Exceptions on spans.** Older OTel guidance and Npgsql record exceptions as span events (`AddException`); the current "recording errors" page prefers log records and `error.type`. Trend: away from span-event exceptions. This note follows the current page.
- **Status description = exception message.** Current semconv says to copy it; this note deviates because `Message` carries redacted argv (CS-ERR, R-EXC-18). If the project later makes `Message` argv-free, the description could follow the spec.
- **Cancellation and span status.** `OperationCanceledException` leaving status `Unset` is a judgement call; some instrumentations mark cancellation as Error with `error.type = System.OperationCanceledException`. Neither is normative.
- **Environment context carriers.** `TRACEPARENT` for child processes is an OTel Release Candidate spec ([env-carriers](https://opentelemetry.io/docs/specs/otel/context/env-carriers/)); the W3C spec has no environment binding. Pulumi already reads it. Trend: stabilising in 2026; ocx has no support.
- **ocx env vs flag for log control.** Documentation on main describes `OCX_LOG_LEVEL`; 0.6.5 reads `OCX_LOG`; `OCX_LOG` is retired in 0.7.0. Always-flag makes the SDK indifferent. If a future ocx makes log level env-only, this contract needs a re-check (the contract tier armed by `OCX_SDK_CONTRACT`, CS-TEST).
- **Callback scope (per-call vs per-client) and delivery after cap.** Open; the fault-handling rule is independent.
- **stderr tail beyond the cap.** CS-PROC discards past 16 MiB, so `StderrExcerpt` (a tail) is taken from the retained head when the cap was hit. For ocx's volumes this does not occur at `warn`; a ring buffer for the tail is a possible follow-up.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://learn.microsoft.com/en-us/dotnet/core/diagnostics/distributed-tracing-instrumentation-walkthroughs | Microsoft: add distributed-tracing instrumentation (ActivitySource, tags, events, status, kind, links) | updated 2026-03-30 (.NET 5+) | Primary: "library authors can exclusively rely on System.Diagnostics.DiagnosticSource"; naming, null `StartActivity`, `IsAllDataRequested`, events-vs-logging |
| https://learn.microsoft.com/en-us/dotnet/core/diagnostics/metrics-instrumentation | Microsoft: creating metrics (Meter, instruments, tags, advice, testing) | updated 2026-06-26 (.NET 6+/8+) | Primary: naming, units, 1000-combination cardinality bound, TagList, InstrumentAdvice (9.0), `MetricCollector` |
| https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/library-guidance | Microsoft: logging guidance for .NET library authors | updated 2026-06-26 | Primary: the ILoggerFactory/NullLogger recommendation this note argues against for a one-choke-point wrapper |
| https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/dependencies | Microsoft: dependencies and .NET libraries (diamond, ranges, lowest applicable version) | updated 2025-12-04 | Primary: "minimize the number of packages you depend on"; min-version rules |
| https://learn.microsoft.com/en-us/nuget/reference/errors-and-warnings/nu1605 | NuGet NU1605 package downgrade | updated 2024-08-13 | Primary: confirms the SDK treats it as an error; direct-dependency-wins rule |
| https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.activitysource.startactivity | API reference for `ActivitySource.StartActivity` | 2026-09-02 (net-11 moniker) | Primary: null when no listeners; overloads |
| https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.activity.addexception | API reference for `Activity.AddException` | 2026-05-27; net-9.0+ | Primary: version floor and the `exception.message`/`exception.stacktrace` tags it adds |
| https://learn.microsoft.com/en-us/dotnet/core/diagnostics/eventsource | Microsoft: EventSource overview | 2022 (historical focus) | Primary: positions EventSource for ETW/EventPipe performance analysis |
| https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.logging.loggerfactoryoptions.activitytrackingoptions | API reference: ILogger scope enrichment from the active Activity | 2026-05-27 | Primary: why consumers get correlation without the SDK taking ILogger (thin page; the claim itself is on the tracing page) |
| https://opentelemetry.io/docs/specs/semconv/registry/attributes/process/ | OTel semantic-conventions registry: `process.*` attributes | Release Candidate, 2026 | Primary: `process.exit.code`, `process.executable.name`, and the "SHOULD NOT be collected by default" note on `process.command_args`/`command_line` |
| https://opentelemetry.io/docs/specs/semconv/general/recording-errors/ | OTel: recording errors (status, `error.type`, exceptions) | 2026 | Primary: status description rule, `error.type` consistency across span and metric, exceptions go to logs |
| https://opentelemetry.io/docs/specs/otel/trace/api/ | OTel Trace API spec | 2026 | Primary: span-name generality, tracer name/version, `Ok` is final, no-op without SDK |
| https://opentelemetry.io/docs/specs/semconv/general/naming/ | OTel naming conventions | 2026 | Primary: lowercase snake_case, custom prefixes, do not reuse semconv namespaces |
| https://opentelemetry.io/docs/specs/otel/context/env-carriers/ | OTel: environment variables as context propagation carriers | Release Candidate | Primary: `TRACEPARENT` convention, injection into child envs, sensitive-info warning |
| https://www.w3.org/TR/trace-context/ | W3C Trace Context Recommendation | W3C REC | Primary: `traceparent` format, all-zero invalid, no environment binding |
| https://opentelemetry.io/docs/languages/dotnet/instrumentation/ | OpenTelemetry .NET: instrumenting with ActivitySource | 2026 | Primary: `AddSource` exact-name match; library authors depend on the API only; uses `AddException` |
| https://azure.github.io/azure-sdk/dotnet_implementation.html | Azure SDK .NET implementation guidelines | living document | Counter-example: EventSource + DiagnosticScope policy, "DO NOT use ActivitySource directly" |
| https://api.nuget.org/v3-flatcontainer/microsoft.extensions.logging.abstractions/10.0.0/microsoft.extensions.logging.abstractions.nuspec | Nuspec of M.E.L.Abstractions 10.0.0 (per-TFM dependency groups) | 2025-11 release | Primary data: net8.0 group adds DI.Abstractions 10.0.0 and DiagnosticSource 10.0.0 |
| https://api.nuget.org/v3-flatcontainer/microsoft.extensions.logging.abstractions/8.0.3/microsoft.extensions.logging.abstractions.nuspec | Nuspec of M.E.L.Abstractions 8.0.3 | 2024 | Primary data: the "consumer on 8.0" side of the diamond |
| https://api.nuget.org/v3-flatcontainer/system.text.json/10.0.0/system.text.json.nuspec | Nuspec of System.Text.Json 10.0.0 | 2025-11 | Primary data: net8.0 group has no DiagnosticSource dependency |
| https://api.nuget.org/v3-flatcontainer/system.diagnostics.diagnosticsource/10.0.0/system.diagnostics.diagnosticsource.nuspec | Nuspec of System.Diagnostics.DiagnosticSource 10.0.0 | 2025-11 | Primary data: empty dependency groups on net8.0/9/10 |
| `ocx@a23ec5be2939:crates/ocx_cli/src/tracing_init/log_settings.rs` (+ `log_level.rs`, `app/env_flags.rs`, `app/seam.rs`, `ocx_env/src/retired.rs`, `website/src/docs/reference/command-line.md`) | ocx main source: log-level resolution, env twin, retired `OCX_LOG` | 2026-10-11 | Primary: flag-wins precedence, `OCX_LOG_LEVEL` honoured on main |
| `npgsql__npgsql@9c47244547c2:src/Npgsql/NpgsqlActivitySource.cs`, `MetricsReporter.cs` | Npgsql: ActivitySource + Meter implementation | 2026 | Real source: version from informational version, `HasListeners`, `IsAllDataRequested`, error.type handling |
| `pulumi__pulumi-dotnet@2a0dca84f09b:sdk/Pulumi/Deployment/Instrumentation.cs`, `sdk/Pulumi.Automation/Commands/BaseOptions.cs` | Pulumi: ActivitySource + TRACEPARENT read; `Action<string>? OnStandardError` | 2026 | Real source: the CLI-driving SDK uses a stderr callback, not a logger |
| `StackExchange__StackExchange.Redis@e7c43a269f53:src/StackExchange.Redis/StackExchange.Redis.csproj`, `ConfigurationOptions.cs`; `testcontainers__testcontainers-dotnet@04cbb73fcc58:Directory.Packages.props`, `src/Testcontainers/Testcontainers.csproj` | Redis and Testcontainers ILogger dependencies | 2026 | Real source: the ILogger-taking side of the corpus and what version they pin |
| `Azure__azure-sdk-for-net@32c48fc3d524:sdk/core/Azure.Core/src/Diagnostics/AzureCoreEventSource.cs`, `Shared/DiagnosticScopeFactory.cs`; `openai__openai-dotnet@1f0e8829acac:OpenAI/src/Utility/Telemetry/OpenTelemetryScope.cs`; `Tyrrrz__CliWrap@7dbc252fa773` | EventSource, DiagnosticScope, per-client ActivitySource+Meter; CliWrap absence | 2026 | Real source for the EventSource and zero-instrumentation positions |
| `ocx-sdk-python` (`src/ocx_sdk/_client.py:694-695`, `_config.py:149`, `site/.../concepts/concurrency.md`, `package-ref-and-credentials.md:55`) | Python SDK log-level, `on_log`, trace-secret caveat | 2026 | Real source: the mirrored design and its documented caveats |
