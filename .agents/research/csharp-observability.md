---
title: "Logging, tracing and metrics in C#: MEL rules for any code, the library dependency choice, and the ocx SDK's telemetry, log-level and stderr contract (consolidated)"
topic: csharp-observability (research-lang C# / .NET, wave 3 consolidation; target depth file csharp-quality/observability.md, IDs CS-OBS-nn)
model: claude-opus-5-5
consolidates:
  - csharp-observability/csharp-observability-logging-rules.md
  - csharp-observability/csharp-observability-library-instrumentation.md
grounding:
  - csharp-audit/ocx-cli-contract.md
  - csharp-audit/python-sdk-digest.md
  - csharp-audit/exemplar-language-shape.md
  - csharp-topic-map.md (API-11, API-12, OB-01, OB-02)
  - csharp-process.md, csharp-api.md, csharp-async.md, csharp-build.md, csharp-json.md (checked for agreement; cited, not restated)
date: 2026-10-11
fixtures: /home/mherwig/.cache/research-lang/dotnet-tools/fixtures/consolidate-csharp-observability/ (argv-order, cb, lib-floor, nuspec, bans, rg, mel-throw; transcript.txt in each)
---

# Logging, tracing and metrics in C#

Citation keys:

| Key | Source |
|---|---|
| [LR] | [csharp-observability-logging-rules.md](csharp-observability/csharp-observability-logging-rules.md). § is its Findings section; "row n" is its §14 verification table |
| [LI] | [csharp-observability-library-instrumentation.md](csharp-observability/csharp-observability-library-instrumentation.md). § is its Findings section; Vn is its §14 |
| [K] | this consolidation's fixtures under `consolidate-csharp-observability/` (directory named per claim) |
| [OC] | [ocx-cli-contract.md](csharp-audit/ocx-cli-contract.md):line |
| [PY] | [python-sdk-digest.md](csharp-audit/python-sdk-digest.md):line or its §11 row |
| [SH] | [exemplar-language-shape.md](csharp-audit/exemplar-language-shape.md):line |

Scope tags on rules: **[any]** = any code that logs through Microsoft.Extensions.Logging (MEL); **[lib]** = a packable library's dependency and instrumentation choice; **[ocx]** = only the ocx C# SDK.

## Verdict

1. **The ocx SDK takes no logging or telemetry package (API-11 decided).** It instruments with the in-box `ActivitySource` and `Meter` (`System.Diagnostics.DiagnosticSource`, part of the net8+ shared framework). It surfaces ocx's stderr as data and through one optional `Action<string>` callback. `Microsoft.Extensions.Logging.Abstractions` is a NuGet package: on net8.0, version 10.0.0 brings 3 packages, and a consumer pinned at 8.0.3 then fails restore with NU1605, even with `TreatWarningsAsErrors=false` ([LI] V3). 0 of 9 SDK/CLI-wrapper exemplars reference `ILogger` ([SH]:22). This agrees with csharp-build's zero-runtime-dependency stance. The dependency choice is a library-shape rule (CS-OBS-13): one choke point means no logger; a long-lived, many-class client may take Abstractions only.
2. **Code that logs through MEL uses `[LoggerMessage]` everywhere in `src`, with explicit per-rule severities.** At the SDK default `AnalysisLevel=10.0`, only CA2017 and CA2023 fire. CA2254, CA2253 and CA1873 are hidden suggestions, and CA1848 and CA1727 are off ([LR] §1). The pinned `10.0-all` + TWAE gate makes them all errors except SYSLIB1006, which is Info and needs its own line ([LR] rows 1, 3, 6).
3. **Telemetry is an allow-list, not a redactor.** Five span tags, two metric tags, a fixed-template status, and no `AddException`. A redactor fails open on secrets it does not know; an allow-list cannot ([LI] §5, V2).
4. **Conflict resolved: library Abstractions version.** [LR] says to pin Abstractions 10.x for every TFM; [LI] says reference the lowest version. Decision: apps pin the latest 10.x. A packable library references the lowest version its code compiles against (8.0.x on the net8.0 floor) and writes static `this ILogger` methods. The reason is that a library's pin becomes every consumer's floor (NU1605, [LI] V3). The 8.0 generator rejects the primary-constructor form with SYSLIB1019 on both net8.0 and net10.0 ([K] `lib-floor`).
5. **Conflict resolved: what happens when the stderr callback throws.** [LI] swallows the fault and disables the callback. Decision: guard each call, stop calling after the first fault, keep draining, then rethrow that exception unchanged from the awaited call once ocx has exited. Reasons:
   - MEL itself does not swallow: a throwing provider surfaces as `AggregateException` to the caller ([K] `mel-throw`).
   - The Python house rules block silent swallows ([PY]:289).
   - Rethrowing after the drain cannot stall the pipe ([K] `cb` green-rethrow: 50000 lines drained, `InvalidOperationException` surfaced).
6. **Conflict resolved: `Action<string>`, not `IProgress<string>`.** csharp-async allowed either. `Progress<T>` posts each report to the thread pool. In [K] `cb` red-progress, 5436 of 50000 lines arrived out of order, which breaks the "sequential, in pump order" contract.
7. **Conflict resolved: argv position of `--log-level`.** [LI] put `--log-level` first; CS-PROC-07 fixes the prefix as `--format json --color never`. Decision: append `--log-level <level>` after that prefix and before the verb. This keeps CS-PROC-07's composer test intact. Measured on ocx 0.6.5, the appended order works, and the flag beats ambient `RUST_LOG`/`OCX_LOG=trace` (0 stderr lines against 6 without it). After the verb it exits 64 ([K] `argv-order`).
8. **Conflict resolved: span status description.** The semconv says the description SHOULD be the exception message. [LI] declined because "Message carries redacted argv", but CS-ERR-08 has since made `Message` argv-free, so that reason is gone. The fixed template stays for other reasons:
   - A mechanical `SetStatus(..., x.Message)` ban cannot tell an `OcxException` from a BCL exception.
   - The launch message names the executable path, which contains the user name (CS-PROC-05).
   - A semconv SHOULD is not a MUST.
9. **Always send `--log-level` (default `warn`), unlike Python, which sends it only when configured** ([LI] §11). 0.6.5 ignores `OCX_LOG_LEVEL`, so the env var is never the control ([OC]:74,126).

## The ruleset

Severity under the pinned gate means the result with `AnalysisLevel=10.0-all`, TWAE on and SDK 10.0.401 (CS-BUILD-10/13). Every analyzer row still gets an explicit `.globalconfig` line (CS-BUILD-11), because the SDK default level hides most logging rules ([LR] row 6). "Watched" means a red/green pair was observed on the toolchain; the source is named.

### A. Any code that logs through MEL [any]

**CS-OBS-01 (MUST) [any]. A message template is a compile-time constant with named PascalCase placeholders, one argument each, and escaped braces. Serilog `{@X}`/`{$X}` operators are not allowed.**
- Why: the placeholder name becomes the structured key. Interpolation evaluates eagerly and destroys structure. MEL prints `@X` literally and calls `ToString()` ([LR] §1, §11).
- Check:
  - CA2254 (non-constant), CA2253 (`{0}`), CA2017 (count), CA2023 (braces) and CA1727 (casing): all error under the gate.
  - `.globalconfig`: `dotnet_diagnostic.CA2254.severity = error`, plus the same line for each of the other four IDs.
  - `rg -n -g '*.cs' -P 'Log\w*\(\s*"[^"]*\{[@$]\w+' src` prints nothing. No analyzer covers the operators.
- Watched: yes. `f1-red` gave CA2254 x3, CA2253 x1, CA2017 x1, CA1727 x1; `f1-green` exit 0; `f1-at` 1 hit / 0 ([LR] rows 1, 9).

**CS-OBS-02 (MUST) [any]. Every log call in `src` is a `[LoggerMessage]` partial method in an `internal static partial class` per area. Hand-written `LoggerMessage.Define` is not allowed (`DefineScope` is the one exception).**
- Carve-outs:
  - The test-layer `.globalconfig` (CS-BUILD-17) sets CA1848 and CA1873 to `none` for `tests/**`.
  - Brownfield code keeps CA1848/CA1873 at `suggestion` until migrated. Its `LogX` count must not rise, and new files use the generator.
- Why:
  - CA1848 fires on every extension call regardless of level, so "hot path only" cannot be audited.
  - A disabled extension call allocates 32-120 B even on `NullLogger`. The generated call allocates 0 B ([LR] §2, §4 rows K/L).
- Check:
  - CA1848 and CA1873 are errors under the gate.
  - `rg -n -g '*.cs' -e '\.Log(Trace|Debug|Information|Warning|Error|Critical)\(' -e 'LoggerMessage\.Define[<(]' src` prints nothing.
  - Brownfield ratchet: `dotnet build -p:AnalysisLevel=10.0-recommended -p:TreatWarningsAsErrors=false 2>&1 | grep -c 'warning CA1848'` is no higher than the committed baseline.
- Watched: yes. CA1848 x9 red, green exit 0 ([LR] row 1); allocation table ([LR] row 4).

**CS-OBS-03 (MUST) [any]. Every generator parameter other than the logger, level and exception appears in the template. The remaining generator diagnostics are errors.**
- A deliberate state-only parameter needs `#pragma warning disable SYSLIB1015 // <reason>` on the same line.
- Why: an unreferenced parameter still lands in structured `State`. A password was measured there ([LR] §3, §10 red 1).
- Check:
  - SYSLIB1015, SYSLIB1013, SYSLIB1002, SYSLIB1012, SYSLIB1018 and SYSLIB1025 are errors under the gate through TWAE. Pin each with a `dotnet_diagnostic.<ID>.severity = error` line.
  - LOGGEN000 and LOGGEN002 get the same lines if `Microsoft.Extensions.Telemetry` is referenced.
  - `rg -n -g '*.cs' 'pragma warning disable SYSLIB1015$' src` prints nothing.
- Watched: yes. `f2c-red` gave SYSLIB1014/1015/1013; `f2c-green` exit 0 ([LR] row 2).

**CS-OBS-04 (MUST) [any]. Every `[LoggerMessage]` sets an explicit `EventId`, unique across the assembly. Shipped method names are frozen; on a rename, pin the old name with `EventName`.**
- Why:
  - SYSLIB1006 is Info, so it is silent even under TWAE, and it only checks within one class.
  - An omitted id becomes a hash of the method name, so a rename changes both the id and `EventId.Name` ([LR] §3).
- Check:
  - `dotnet_diagnostic.SYSLIB1006.severity = error` (required: the gate alone does not raise it).
  - A reflection test over every `[LoggerMessage]` that asserts the list is non-empty, every id is >= 0 and no id repeats (Redis `LoggerEventIdTests.cs:19-45`).
  - `rg -n -U -P -g '*.cs' '\[LoggerMessage\((?![^\]]*EventId)' src` prints nothing.
- Watched: yes. `f2b-red` exits 0 at default severities, then 1 with the line; `f2e-crossclass` stays exit 0, which is why the test is needed ([LR] row 3).

**CS-OBS-05 (SHOULD) [any]. Compute an expensive argument only inside `if (logger.IsEnabled(level))`, into a local, and call a method marked `SkipEnabledCheck = true`. Do not guard cheap arguments.**
- Why:
  - The generated enabled-check does not stop the caller's `string.Join` from running (88 B when disabled).
  - CA1873 false-positives on a guard around static and instance generated methods unless the value is hoisted ([LR] §4 row J, §5).
- Check: CA1873 is an error under the gate (SDK 10+; absent on SDK 8.0.425).
- Watched: yes ([LR] rows 4, 8).

**CS-OBS-06 (MUST) [any]. Pass the exception object as the `Exception` argument. Never pass `ex.Message`, `ex.ToString()` or `{Ex}`.**
- Why: only the exception argument fills the `Exception` field. 3 of the 5 wrong forms trip no analyzer ([LR] §6).
- Check:
  - SYSLIB1013 and CA2017 are errors under the gate.
  - `rg -n -g '*.cs' -P 'Log\w*\([^;]*\b\w*[eE]x\w*\.(Message|ToString\(\))' src` prints nothing.
  - `rg -n -g '*.cs' -P '\{(Ex|Exception|Error)\}' src` prints nothing.
- Watched: yes. `f6-exc` gave 3 hits; `f6-green` 0 ([LR] row 9).

**CS-OBS-07 (MUST) [any]. Log a failure once, where it is handled. A `catch` that logs and rethrows is a defect. A library never logs Error for a failure it throws or returns.**
- At a throw or convert site, a library may log at Debug.
- Why: duplicate events, and the caller owns the severity. Azure's "log thrown exceptions at Warning" is tied to its opt-in retry pipeline and is not adopted ([LR] §6, Contested).
- Check:
  - `rg -n -U -P -g '*.cs' 'catch\b[^{]*\{[^{}]*\.Log\w+\([^;]*;[^{}]*\bthrow\s*;' src` prints nothing. It only sees single-block catches, so also read each `catch` that logs.
  - `rg -n -g '*.cs' 'Level = LogLevel\.(Error|Critical)' src` is reviewed against throw sites.
- Watched: yes. `f6-exc` gave 1 hit; `f6-green` 0 ([LR] row 9).

**CS-OBS-08 (SHOULD) [any]. Follow the level table. In a library:**
- Trace = payload detail, opt-in.
- Debug = per-operation steps.
- Information = rare lifecycle events only, never per call.
- Warning = degraded but continuing, and not automatic retries.
- Error = only failures not surfaced to the caller.
- Critical = never.

Applications use the Microsoft table.
- Why: consumers default to `Information`. The exemplars split (Npgsql 63% Trace/Debug, Redis 89% Information), so the rule is about volume, not "never Information" ([LR] §8).
- Check: reading heuristic. A `Level = LogLevel.Information` method called per command, request or item is a defect.
- Watched: no (judgement rule).

**CS-OBS-09 (MUST) [any]. A scope uses key-value state or a `LoggerMessage.DefineScope` delegate, lives in a `using`, is opened once per operation (not per item), and carries no secret.**
- Why: `BeginScope($"...")` binds to the generic overload and no analyzer flags it. A discarded scope never ends. Each scope allocates 152-336 B ([LR] §7).
- Check: `rg -n -g '*.cs' -e 'BeginScope\(\s*\$"' -e '\b_\s*=\s*\w+\.BeginScope\(' src` prints nothing.
- Watched: yes. `f5-scope` gave 1 hit / 0 ([LR] rows 9, 11).

**CS-OBS-10 (MUST) [any]. No secret reaches a log record. Payload, parameter and body logging is off by default behind an explicit option and allow-listed.**
- This rule adds only the logging-specific routes. The secret rules themselves are cited, not restated:
  - CS-PROC-08: secrets travel only as stdin bytes or `OCX_AUTH_*` env. Logs carry the verb, never argv or env. One redactor holds every form of each secret.
  - CS-API-06: secret-bearing types redact `PrintMembers`.
  - CS-ERR-08: `Message` is argv-free.
- The four measured leak routes are:
  - an unreferenced generator parameter (CS-OBS-03);
  - a record's `ToString()` (CS-API-06);
  - a scope value (CS-OBS-09);
  - an exception message built with the secret.
- Why: all four routes printed `hunter2-SECRET` ([LR] §10 red 1-4). Npgsql's `LogParameters` and Azure's `IsLoggingContentEnabled` are default-closed precedents ([LR] §10).
- Check: a `FakeLogger<T>` canary test plants a secret through each route and asserts it is absent from `Message`, `StructuredState`, `Scopes` and `Exception`. CS-PROC-08's `rg` checks still apply.
- Watched: yes. `f4-redact`: red 4 lines; wrapper, excluded and redacted 0 ([LR] row 5).

**CS-OBS-11 (CONSIDER) [any, apps only]. An application that must log regulated data classifies parameters and calls `EnableRedaction()` with a redactor per class. Production console logging uses the JSON formatter or `SingleLine = true`. A library references neither redaction package.**
- Why:
  - Redaction pulls 22 packages and is fail-closed when not enabled.
  - The default `SimpleConsole` let a newline in user input forge a log line ([LR] §10).
- Check:
  - `rg -l -g '*.cs' 'DataClassificationAttribute' src | xargs -r rg --files-without-match -e 'EnableRedaction\(' -e 'AddRedaction\('` prints nothing.
  - `rg -n -g '*.cs' -e 'AddConsole\(\)' -e 'AddSimpleConsole\(\)' src` is reviewed in the composition root.
- Watched: yes for redaction, `classified-but-not-enabled` 0 leaks ([LR] row 5). Injection was observed only ([LR] §10).

**CS-OBS-12 (MUST) [any]. Tests assert logs through `FakeLogger<T>` (`Microsoft.Extensions.Diagnostics.Testing`), never a mocked `ILogger`.**
- Why: `Mock<ILogger<T>>.Verify(l => l.LogInformation(...))` compiles and then throws `NotSupportedException` ([LR] §12).
- Check: `rg -n -g '*.cs' -e 'Mock<ILogger' -e 'Substitute\.For<ILogger' tests` prints nothing.
- Watched: yes ([LR] row 10).

### B. A library's dependency choice [lib]

**CS-OBS-13 (MUST) [lib]. Choose the diagnostics channel by library shape:**
- **One choke point** (process wrapper, one-shot client): no logging or telemetry package. Use in-box `ActivitySource`/`Meter`, and return streams as data or through a callback.
- **Many internal classes over a long lifetime** (connection pools, drivers): `Microsoft.Extensions.Logging.Abstractions` only.
- **Never**: the MEL implementation, providers, `Serilog*`, `NLog*`, `log4net`, `OpenTelemetry*`, `EventSource` as the primary channel, or `System.Diagnostics.DiagnosticSource` as a package on net8+.
- Why:
  - Microsoft: libraries "can exclusively rely on APIs in System.Diagnostics.DiagnosticSource".
  - The NU1605 diamond ([LI] §1-2, V3).
  - 0/9 wrappers use `ILogger` ([SH]:22).
  - Npgsql, Redis and Testcontainers take Abstractions and are connection clients ([LI] §1).
- Check (after `dotnet pack -c Release -o artifacts`):
  - No logger: `unzip -p artifacts/*.nupkg '*.nuspec' | grep -c -E 'dependency id="(Microsoft\.Extensions\.|OpenTelemetry|System\.Diagnostics\.DiagnosticSource|Serilog|NLog|log4net)'` prints `0`.
  - Logger shape: `unzip -p artifacts/*.nupkg '*.nuspec' | grep -oE 'dependency id="(Microsoft\.Extensions\.[^"]+|Serilog[^"]*|NLog[^"]*|log4net|OpenTelemetry[^"]*)"' | sort -u` prints at most `dependency id="Microsoft.Extensions.Logging.Abstractions"`.
- Watched: yes. [K] `nuspec`: red gave `check: 2` (Abstractions in both groups); green gave `check: 0` with only `System.Text.Json` on net8.0. NU1605 red/green in [LI] V3.

**CS-OBS-14 (MUST) [lib, when it takes MEL]. Reference the lowest Abstractions version the code compiles against (8.0.x while net8.0 is a TFM), not the latest. Write generator methods as static `this ILogger` extensions, never as primary-constructor instance methods. Applications pin the current 10.x.**
- Why:
  - A library's version is every consumer's floor: consumer 8.0.3 plus library 10.0.0 gives NU1605 and exit 1 ([LI] V3).
  - The generator ships in the package, so the 8.0 generator governs both TFMs ([LR] §13).
- Check:
  - `unzip -p artifacts/*.nupkg '*.nuspec' | grep -oE 'id="Microsoft.Extensions.Logging.Abstractions" version="[^"]+"' | sort -u` shows a version starting with `8.0.`.
  - The build is the check for the method form (SYSLIB1019 + CS8795).
- Watched: yes. [K] `lib-floor`: red (primary constructor, Abstractions 8.0.0) gave `error SYSLIB1019` and `CS8795` on `[net8.0]` and `[net10.0]`, exit 1; green (static extension) exit 0 under 10.0-all + TWAE.

**CS-OBS-15 (MUST) [lib, when it takes MEL]. The public entry point takes `ILoggerFactory? loggerFactory = null`, normalised once to `NullLoggerFactory.Instance`. Internal types call `CreateLogger<T>()`. A DI-built type takes non-nullable `ILogger<T>`. `src` has no `LoggerFactory.Create` and no static logger holder.**
- Why: an `ILogger<T>` on a type users construct forces them to build a `NullLogger<T>`. With `ILoggerFactory`, categories can be added without an API break ([LR] §9).
- Check:
  - `rg -n -g '*.cs' -P -e 'ILogger(<[^>]+>)?\??\s+\w+\s*=\s*null' -e 'static\s+(readonly\s+)?ILogger(<[^>]+>)?\s+\w+\s*=\s*(?!NullLogger)' -e 'LoggerFactory\.Create\(' src` prints nothing.
  - `PublicAPI.Shipped.txt` (CS-API-11) has no `ILogger<` constructor parameter.
- Watched: yes. The rg flagged `= null`, `null!` and a static `LoggerFactory.Create` holder ([LR] LOG-15).

**CS-OBS-16 (MUST) [lib]. Library code writes no ad-hoc diagnostics: no `Console`, no `System.Diagnostics.Trace`, no `Debug.Write*`.**
- Why: these bypass every listener the consumer configured and corrupt a consumer's stdout. `Debug.WriteLine` is still flagged although it is `[Conditional]` ([LI] OBS-LIB-19).
- Check: RS0030 (error, CS-BUILD-15) with these `BannedSymbols.txt` lines, which extend CS-PROC's fragment:
  ```text
  T:System.Console;CS-OBS-16: a library never writes to the host console; return data or invoke OnStderrLine
  T:System.Diagnostics.Trace;CS-OBS-16: bypasses the consumer's listeners; use ActivitySource
  M:System.Diagnostics.Debug.Write(System.String);CS-OBS-16: ad-hoc diagnostics
  M:System.Diagnostics.Debug.WriteLine(System.String);CS-OBS-16: ad-hoc diagnostics
  M:System.Diagnostics.Debug.WriteLine(System.String,System.Object[]);CS-OBS-16: ad-hoc diagnostics
  ```
- Watched: yes. [K] `bans`: red gave RS0030 on all 4 lines (`Console.WriteLine`, `Console.Error`, `Debug.WriteLine`, `Trace.TraceInformation`) on both TFMs, exit 1. Green (`ActivitySource` + `Debug.Assert`) exit 0.

### C. Library tracing and metrics [lib]

**CS-OBS-17 (MUST) [lib]. One `static readonly ActivitySource` and one `static readonly Meter` per library, in one file.**
- Both are named after the package id, and the names are exposed as `public const string`.
- The version is the informational version with `+<sha>` stripped.
- Why:
  - A per-call source costs 128 B and 330 ns, and an undisposed one leaks 63 B into the global registry.
  - `AddSource` needs an exact name match ([LI] §3-4, V1).
- Check: `rg -n -g '*.cs' -P '(new\s+(ActivitySource|Meter)\s*\(|\b(ActivitySource|Meter)\s+\w+\s*=\s*new\s*\()' src | rg -v 'static readonly'` prints nothing.
  - This corrects [LI]'s `new (ActivitySource|Meter)\(`, which misses target-typed `new(...)`.
- Watched: yes. [K] `rg`: red gave 3 hits (an instance field, a `using var` local and `Meter m = new(...)`); [LI]'s pattern caught only 1. Green 0. Allocation in [LI] V1.

**CS-OBS-18 (MUST) [lib]. Start the Activity with `using var activity = Source.StartActivity(...)` inside the `async` method that awaits the work. Never start it in a non-async `Task`-returning wrapper or a constructor.**
- Why: a synchronous prologue leaks `Activity.Current` into the caller, and later spans are mis-parented. `ConfigureAwait(false)` does not break parenting ([LI] §8).
- Check: a test asserts `Activity.Current` is unchanged after `await client.XAsync()`.
- Watched: yes. `red-sync-wrapper` gave `caller_current_restored_after_call=False`; green True ([LI] V4).

**CS-OBS-19 (MUST) [lib]. Every tag, status and metric write is null-safe: `activity?.SetTag(k, v)`, or a block under `if (activity is { IsAllDataRequested: true })`. No tag value is computed before the null check.**
- Why: with no listener, `StartActivity` returns `null` at 0 B. `?.` skips argument evaluation, but a pre-computed local costs 48 B ([LI] §3).
- Check:
  - `rg -n -g '*.cs' 'StartActivity\([^;]*\)!' src` prints nothing.
  - Nullable errors via CS-LANG.
- Watched: yes. `static-source` 0 B; `static-source-tags-unguarded` 48 B ([LI] V1).

**CS-OBS-20 (MUST) [lib]. Span and metric attributes are a closed, checked-in allow-list of closed-set values.**
- Never record: argv (`process.command_args`/`command_line`), `process.executable.path`, cwd, env, stdout, stderr, package or resource names, `Exception.Message` or stack traces.
- Never call `Activity.AddException`, and never emit stream lines as `AddEvent`.
- Why:
  - The OTel registry says command args "SHOULD NOT be collected by default".
  - The executable path contains the user name.
  - Package references were measured in ocx's stderr and in its error document.
  - OTel now routes exceptions to logs ([LI] §5-6).
- Check:
  - `rg -n -g '*.cs' -e 'process\.command_(args|line)' -e 'process\.executable\.path' -e '\.AddException\(' -e 'ActivityStatusCode\.Ok' -e 'SetStatus\([^;]*\.Message' src` prints nothing.
  - `rg -o -N -g '*.cs' 'SetTag\("[^"]+"' src | sed 's/.*SetTag("//;s/"$//' | sort -u | diff - docs/telemetry-allowlist.txt` is empty.
  - A listener canary test.
- Watched: yes. [K] `rg` P2: red 5, green 0. `red-argv-tags` failed 3 checks ([LI] V2).

**CS-OBS-21 (MUST) [lib]. On failure, call `SetStatus(ActivityStatusCode.Error, <fixed template>)` and set `error.type` to the exception type's full name, the same value on span and metric. Success leaves status `Unset`, and caller cancellation also leaves it `Unset` with no `error.type`. Never set `Ok`.**
- Why:
  - `Ok` is final and overrides the application.
  - The template rule is Verdict 8.
  - Cancellation is the caller's choice, consistent with CS-ERR-05.
- Check:
  - The CS-OBS-20 rg (it includes `ActivityStatusCode\.Ok` and `.Message`).
  - A listener test asserts `Error` + `error.type` on failure, and `Unset` with no `error.type` on success.
- Watched: yes. `red-no-status` and `red-message-status` red; green ([LI] V2).

**CS-OBS-22 (MUST) [lib]. Duration is one `Histogram<double>` in seconds, named `<lib>.client.operation.duration`, with at most two bounded tags. Record only under `if (Duration.Enabled)`. Ship no counters that the histogram already implies.**
- Why:
  - Microsoft: prefer a histogram, in seconds, under about 1000 tag combinations.
  - The `Enabled` guard costs 0 B and 3 ns ([LI] §7, V1).
- Check:
  - `rg -c -g '*.cs' -e 'CreateHistogram' -e 'CreateCounter' -e 'CreateUpDownCounter' -e 'CreateGauge' -e 'CreateObservable' src` totals 1.
  - A `MeterListener` test asserts the tag key set.
- Watched: yes. `meter-record` 0 B; metric tags in V2 green ([LI]).

**CS-OBS-23 (MUST) [lib]. While net8.0 is a TFM, never call .NET 9+ telemetry APIs unconditionally: `Activity.AddException`, `InstrumentAdvice<T>`, `new ActivitySource(name, version, tags)`.**
- Why: they fail to compile on net8.0 with CS1061, CS0246 and CS1729. OTel Java/JS spellings (`RecordException`, `GetTracer`) do not exist ([LI] §13).
- Check: `dotnet build -c Release` of every TFM (the compiler).
- Watched: yes ([LI] V6).

**CS-OBS-24 (MUST) [lib]. Span tests use an `ActivityListener` that sets both `ShouldListenTo` and `Sample`, and keep only activities whose `TraceId` matches the test's own root.**
- Why: without `Sample`, `HasListeners()` is true but `StartActivity` returns null. The listener is process-global ([LI] §9).
- Check: `test "$(rg -c -g '*.cs' 'Sample\s*=' tests | awk -F: '{s+=$NF} END {print s+0}')" -ge "$(rg -c -g '*.cs' 'new ActivityListener' tests | awk -F: '{s+=$NF} END {print s+0}')"`.
- Watched: yes for `Sample` ([LI] V8). The count check gave exit 1 / exit 0 ([K] `rg` P6). The `TraceId` filter under parallel runs was not executed ([LI] §9).

### D. The ocx SDK [ocx]

**CS-OBS-25 (MUST) [ocx]. The ocx SDK's telemetry identity follows CS-OBS-17/20/22.**
- Names:
  - `public static class OcxTelemetry { public const string SourceName = "Ocx.Sdk"; public const string MeterName = "Ocx.Sdk"; }`. The names equal the package id (the package id itself is an open CS-API question).
  - One span per public call, named `ocx {command}` from the closed command table, `ActivityKind.Client`.
- The span tags are exactly:
  - `process.executable.name` (the constant `ocx`);
  - `process.exit.code` (int);
  - `error.type` (one of the 5 `OcxException` leaf full names);
  - `ocx.command`;
  - `ocx.attempts` (int; >1 only after an exit-75 retry, CS-ERR-10).
- Metric: `ocx.client.operation.duration`, tagged `ocx.command` and `error.type` only. At most about 420 series ([LI] §7).
- The README documents `AddSource(OcxTelemetry.SourceName)`, `AddMeter(OcxTelemetry.MeterName)` and the consumer's ILogger bridge (CS-OBS-27). The core ships no DI package (CS-API-16).
- Why per-call spans with an `attempts` count, not [LI]'s per-attempt `ocx.attempt`: a span and its histogram then share a unit (the awaited call), and the name states a count.
- Check:
  - `rg -n -g '*.cs' 'public const string (SourceName|MeterName) = "Ocx.Sdk"' src` prints 2 lines.
  - `rg -n -g '*.cs' 'StartActivity\(\$' src` prints nothing.
  - The CS-OBS-20 allow-list diff.
  - A listener test against `Ocx.Fake` (CS-TEST) asserts `DisplayName`, `Kind`, the tags and `Source.Version` with no `+`.
- Watched: yes for the shape: `span: ocx package pull kind=Client status=Error ... source=Ocx.Sdk@1.0.0` ([LI] V2 green); the interpolated-name rg gave 1 / 0 ([K] `rg` P3).

**CS-OBS-26 (MUST) [ocx]. Every call sends `--log-level <level>`, appended to the CS-PROC-07 prefix: `--format json --color never --log-level <level> <verb>`.**
- The level comes from a closed `enum OcxLogLevel { Trace, Debug, Info, Warn, Error, Off }` through an explicit `switch`.
- The default is `Warn`. Do not use `ToString().ToLowerInvariant()`, which trips CA1308.
- `Trace` and `Debug` are opt-in. Their XML docs say ocx may print held secrets at `trace`, which the SDK cannot redact.
- `src` never sets `OCX_LOG_LEVEL`, `OCX_LOG` or `RUST_LOG`.
- `--log-level` is a closed clap enum that the SDK sends, so the open-enum rule (CS-API-07) does not apply.
- Why:
  - The flag is pre-subcommand only.
  - 0.6.5 ignores `OCX_LOG_LEVEL` and main honours it, so only the flag is version-proof.
  - Ambient `RUST_LOG`/`OCX_LOG=trace` otherwise floods captured stderr ([OC]:66,74,126; [LI] §11; [PY]:149 via [LI] §11).
- Check:
  - The CS-PROC-07 composer test asserts `argv[..6]` is `["--format","json","--color","never","--log-level","warn"]` for default options.
  - `rg -n -g '*.cs' -e 'OCX_LOG_LEVEL' -e '"OCX_LOG"' -e 'RUST_LOG' src` prints nothing.
  - A unit test asserts `new OcxClientOptions().LogLevel == OcxLogLevel.Warn`.
- Watched: yes. [K] `argv-order` on ocx 0.6.5: appended order `off` gave 0 stderr lines and `warn` gave 1, with ambient trace env set. With no flag: 6 lines. After the verb: exit 64. Env-only red in [LI] V7.

**CS-OBS-27 (MUST) [ocx]. stderr is data first and a live stream second.**
- **Data.** Every result carries the redacted, capped `Stderr` and `StderrTruncated` (CS-PROC-10). Every leaf with a child carries `StderrExcerpt` (CS-ERR-08).
- **Live stream.** One client-level `Action<string>? OnStderrLine { get; init; }` on `OcxClientOptions`:
  - Lines are split on `\n`, with a trailing `\r` trimmed.
  - Each line passes through the CS-PROC-08 redactor before the call.
  - Calls are sequential and in pump order within one call, and may run concurrently across calls.
  - Nothing is invoked after the awaited call returns.
  - `IProgress<string>`/`Progress<T>` are not offered.
- stderr text never becomes telemetry (CS-OBS-20) and never drives classification (CS-ERR-02).
- Why:
  - Python's `on_log` is client-level and redacted ([PY] row 20, 25).
  - Pulumi.Automation uses `Action<string>? OnStandardError` ([LI] §12).
  - `Progress<T>` reorders lines.
  - Per-call callbacks can be added later as an additive change (CS-API-09).
- Check:
  - `rg -n -g '*.cs' -e 'IProgress<string>' -e '\bProgress<string>' src` prints nothing.
  - A fake-ocx test asserts in-order delivery, `calls_after_return == 0` and that a planted secret is absent from the lines.
- Watched: yes. [K] `cb` red-progress gave `out_of_order=5436`; green-rethrow `out_of_order=0 calls_after_return=0`. [K] `rg` P5 1 / 0.

**CS-OBS-28 (MUST) [ocx]. A throwing `OnStderrLine` never stalls the drain. Each call runs inside `try/catch`. The first fault is captured with `ExceptionDispatchInfo.Capture` and the callback is not called again. The pump keeps reading to EOF. After ocx exits and the drain completes, the awaited call rethrows the captured exception unchanged.**
- This is the one CA1031 site added to CS-ERR-06's list. It counts as site 3, a deferred `throw`.
- It carries `[SuppressMessage("Design", "CA1031", Justification = "consumer callback must never break the drain; rethrown after exit")]`.
- Why:
  - An unguarded throw unwound the pump, and the child blocked on a full pipe for 6.2 s ([LI] V5).
  - Swallowing hides the consumer's bug, and MEL itself surfaces provider exceptions ([K] `mel-throw`).
- Check: CA1031 is an error under the gate, so the unjustified site fails the build. A fake-ocx test: a callback that throws on line 3, against more than 64 KiB of stderr, completes inside the test timeout and surfaces the callback's exception type.
- Watched: yes. [K] `cb`: red-swallow `surfaced=none` gave RESULT RED; green-rethrow `elapsed_ms=1130 lines=50000 surfaced=InvalidOperationException` gave GREEN. The unguarded red is [LI] V5.

**CS-OBS-29 (MUST) [ocx]. Do not inject, forward or scrub `TRACEPARENT`, `TRACESTATE` or `BAGGAGE` in the child environment.**
- Why:
  - ocx 0.6.5 and main read no trace context.
  - Injecting is dead data today and a silent behaviour change later.
  - CS-PROC-06's scrub list stays at 7 keys.
  - The SDK span already parents to the caller ([LI] §10).
- Check: `rg -n -g '*.cs' -i -e 'traceparent' -e 'tracestate' -e 'baggage' src` prints nothing.
- Revisit when `rg -n -i traceparent ~/dev/ocx/crates` prints anything.
- Watched: the rg gave 1 / 0 ([K] `rg` P4). ocx-side absence was checked by grep only ([LI] §10).

### `.globalconfig` fragment (CS-OBS-01..05)

```ini
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

These lines were verified as errors even at `AnalysisLevel=10.0` ([LR] row 6). SYSLIB1006 is the line the pinned gate cannot replace.

## Applied to the ocx C# SDK

**New commitments (the SDK design changes for these):**
1. **No `ILogger` anywhere.**
   - `rg -n -g '*.cs' -e 'Microsoft\.Extensions\.Logging' -e '\bILogger\b' src` prints nothing.
   - The nuspec check in CS-OBS-13 prints 0.
   - Section A applies only to the SDK's test helpers and to consumer samples.
2. **A new public type, `OcxTelemetry`, with two `const` names.** It enters `PublicAPI.Shipped.txt` (CS-API-11). The names are permanent once shipped, because `const` values are baked into consumer assemblies ([LI] §4).
3. **New `OcxClientOptions` members:**
   - `OcxLogLevel LogLevel { get; init; } = OcxLogLevel.Warn` (CS-OBS-26);
   - `Action<string>? OnStderrLine { get; init; }` (CS-OBS-27/28).
4. **Results gain `string Stderr` and `bool StderrTruncated`** (CS-OBS-27, CS-PROC-10).
5. **Engine changes:**
   - The engine owns the one `StartActivity` and the one histogram record, at the top of the async method that awaits the child (CS-OBS-18).
   - The pump owns the callback guard and the deferred rethrow (CS-OBS-28).
   - The composer appends `--log-level` (CS-OBS-26). This is an amendment to CS-PROC-07's fixed shape, and CS-PROC-07 should cite this rule.
6. **The CS-OBS-16 lines join `BannedSymbols.txt`.** CS-ERR-06 gains the CS-OBS-28 site.
7. **Test additions, all against `Ocx.Fake` (CS-TEST):**
   - the span/metric listener test with the allow-list canary;
   - the `Activity.Current`-unchanged test;
   - the callback order and fault test;
   - the argv-prefix assertion.

**Already modelled by the Python SDK (port, do not reinvent):**
- A per-line stderr callback, redacted before invocation, at client level ([PY]:80; row 20, 25). The C# form is `OnStderrLine`.
- `LogLevel` is an argv-only closed set (`Literal`, [PY]:128). The C# form is a plain `enum`, not an open-enum struct.
- Exit code is the category and stderr is never classified ([PY]:93). Telemetry's `error.type` derives from that type, never from text.
- Sizes-only `__repr__` ([PY] row 26). The C# form is `PrintMembers` (CS-API-06), which also covers the log route in CS-OBS-10.

**Forced by the ocx CLI contract:**
- `--log-level` is pre-subcommand only, because no root argument is `global` ([OC]:66). After the verb it exits 64 ([K] `argv-order`).
- `OCX_LOG_LEVEL` is ignored by 0.6.5 ([OC]:74,126). The flag is the only version-proof control.
- stdout carries exactly one JSON document and logs go to stderr ([OC]:68). That is why stderr can be a line stream at all. Progress renders only on a TTY, so piped stderr stays line-oriented ([OC]:73).
- The error document and stderr both embed package references (`ocx.sh/zz:1`, [LI] §5). That is why neither may reach telemetry.

**Do not copy from Python:**
- **Two stdlib loggers, with redacted argv logged at DEBUG** ([PY]:80; row 37). C# has no logger, and argv never reaches any observability surface. Python's row 37 itself says "Decision needed, not copied"; Verdict 1 is that decision.
- **`on_log` rejected on async paths** ([PY] row 20). The C# surface is async-only (CS-ASYNC), so the callback must work there. That is why CS-OBS-28's guard is needed.
- **`--log-level` sent only when configured** ([LI] §11). C# always sends it (Verdict 9).

## AI-agent failure modes

Ranked by how often the shape appears in training data and in the surveyed repos.

| # | Failure | Why it looks right | Check |
|---|---|---|---|
| 1 | `logger.LogInformation($"User {user} ...")` or `"..." + x` | `string` is accepted as a template | CA2254 error (CS-OBS-01) |
| 2 | Adds `ILogger<OcxClient>` plus Abstractions to a wrapper "because .NET libraries log" | Microsoft's library page centres `ILoggerFactory` | CS-OBS-13 nuspec grep; `rg '\bILogger\b' src` |
| 3 | `LogError("failed: {Ex}", ex)`, `ex.Message` as an argument | Valid `params object[]`; no analyzer | CS-OBS-06 rg |
| 4 | Tags spans with `process.command_args`, a joined argv or the resolved path | It is in the semconv registry | CS-OBS-20 rg + allow-list diff + canary |
| 5 | `SetStatus(Error, ex.Message)`, `AddException(ex)`, `SetStatus(Ok)` | Spec text, Npgsql, blog posts | CS-OBS-20/21 rg; net8 build fails on `AddException` |
| 6 | Extension `LogX` calls everywhere, with `NullLogger` treated as free | Aspire does it (73 calls) | CA1848 error; 88 B per disabled call (CS-OBS-02) |
| 7 | `new ActivitySource(...)` per call or per instance, often target-typed `new(...)` | Looks like ordinary scoped disposal | CS-OBS-17 rg (the corrected pattern) |
| 8 | `psi.Environment["OCX_LOG_LEVEL"] = "debug"`, or `--log-level` after the verb | The main docs say so; most CLIs accept trailing flags | CS-OBS-26 argv test + rg |
| 9 | Copy-pasted `EventId = 1`, or no `EventId` | Valid; SYSLIB1006 is Info and per class | `SYSLIB1006 = error` + reflection test (CS-OBS-04) |
| 10 | `catch (Exception ex) { logger.LogError(ex, ...); throw; }` | "Log everything" habit | CS-OBS-07 multiline rg |
| 11 | Stderr callback invoked inline without a guard, or the fault swallowed, or `IProgress<string>` | Reads cleanly; the hang or reorder shows only under load | CS-OBS-27/28 fake-ocx tests |
| 12 | Generator parameter `password` left out of the template "for context" | Builds with a warning only | SYSLIB1015 error (CS-OBS-03) |
| 13 | Activity started in a non-async `Task RunAsync()` wrapper | Parenting looks right in a console exporter | CS-OBS-18 `Activity.Current` test |
| 14 | `Mock<ILogger<T>>.Verify(l => l.LogX(...))` | Compiles | Runtime `NotSupportedException`; CS-OBS-12 rg |
| 15 | `ActivityListener { ShouldListenTo = ... }` with no `Sample`, then "StartActivity is broken" | `ShouldListenTo` looks sufficient | CS-OBS-24 count check |
| 16 | Library pins Abstractions 10.x and uses the primary-constructor logger form | "Use the latest package" | CS-OBS-14 nuspec version + SYSLIB1019 on the floor |
| 17 | `Console.WriteLine` / `Debug.WriteLine` diagnostics left in the library | Quick debug aid | RS0030 (CS-OBS-16) |
| 18 | `BeginScope($"op {id}")`, `_ = BeginScope(...)`, a scope per item | No analyzer | CS-OBS-09 rg |
| 19 | Invented APIs: `RecordException`, `GetTracer`, `LogWarn`, `InstrumentAdvice` on net8 | OTel Java/JS spellings, .NET 9+ docs | The multi-TFM build (CS-OBS-23) |
| 20 | Injects `TRACEPARENT` into the ocx child | The OTel env-carrier spec exists (RC) | CS-OBS-29 rg |

## Failure classes

| Class | Mechanism | Failure modes | Check that catches the class |
|---|---|---|---|
| **F1 Structure destroyed at the call site** | Data is flattened to text before the logging pipeline sees it | 1, 3, 12, 18 | Explicit analyzer severities (CS-OBS-01/03) plus the call-site rgs. Analyzers miss 3 of 5 exception forms, so the rgs are required |
| **F2 Silent by default** | The diagnostic exists but its default severity hides it (CA1848 off, CA2254 suggestion, SYSLIB1006 Info and per class; SDK 8 lacks CA1873/CA2023) | 6, 9 | Every ID gets a `.globalconfig` line; anything per-class gets an assembly-wide test |
| **F3 Cost when nobody listens** | Work happens before the enabled/null check (params array, boxing, computed argument, per-call source, pre-computed tag) | 6, 7, CS-OBS-05/19 | CA1848 + CA1873; static-source rg; `?.`/`IsAllDataRequested` |
| **F4 Leak through a side channel** | A secret or identifier rides a channel the author did not think of (state, `ToString`, scope, exception, span tag or status, argv) | 4, 5, 12, CS-OBS-10 | Allow-lists over redaction; canary tests on every surface (FakeLogger, ActivityListener, MeterListener), citing CS-PROC-08 |
| **F5 Wrong dependency for the shape** | The library imports the consumer's choice: a logger in a wrapper, a latest pin causing NU1605, a provider or Serilog in a library | 2, 16 | Assert on the packed nuspec, never on the csproj |
| **F6 Lifetime and context** | An observability object outlives or escapes its operation, or consumer code runs inside the SDK's I/O loop | 11, 13, 18 | Behavioural tests: `Activity.Current` unchanged, ordered callback with nothing after return, a throwing callback under load |
| **F7 Era and contract drift** | Correct for another version (net9+ APIs, OCX_LOG_LEVEL on main, the 9.0 generator, OTel other-language APIs) | 8, 16, 19 | Build every TFM; argv-prefix test; the contract tier against the real ocx (CS-TEST) |
| **F8 Test-harness blind spots** | The harness cannot observe what it asserts (no `Sample`, mocked extension methods) | 14, 15 | The rgs in CS-OBS-12/24 |

## Open questions

**Owner decisions:**
1. **The cross-group check needs an owner ruling, because CS-BUILD-24 and CS-JSON-14 disagree.**
   - CS-BUILD-24 says `grep -c '<dependency'` over the nuspec prints `0`.
   - CS-JSON-14 adds `System.Text.Json` 10.0.12 to the net8.0 group, so that count is 1 ([K] `nuspec` green: `1 <dependency id="System.Text.Json"`).
   - My recommendation: CS-BUILD-24 should allow exactly `System.Text.Json` on net8.0. CS-OBS-13's check is written to hold either way.
2. **Should ocx read `TRACEPARENT`?** The OTel env-carrier spec is a Release Candidate. If ocx adopts it, CS-OBS-29 flips to "inject from `Activity.Current`" and ocx's own spans join the caller's trace. Until then the SDK does nothing.
3. **Package id = telemetry name.** `Ocx.Sdk` is still open in CS-API (open question 2). Whatever the owner picks becomes `OcxTelemetry.SourceName` and is permanent.

**Another research round:**
- **csharp-observability-library-instrumentation, cross-OS.** Question: do CS-OBS-27/28 (callback order, deferred rethrow, no call after return) hold on Windows (host SDK 10.0.102) and arm64? Does the parallel-test `TraceId` filter (CS-OBS-24) isolate spans under xUnit v3 parallelism? All callback fixtures used POSIX `sh` on Linux x64.
- **ocx at `trace` with registry traffic (contract tier).** Question: does ocx 0.6.5 or main print `OCX_AUTH_*` values, bearer tokens or `Authorization` headers at `--log-level trace` during an authenticated pull or push? The offline probe found 0 hits ([LI] §11), which does not cover network auth. If secrets do appear, `Trace` needs more than a doc warning, for example running stderr through the redactor with registry-auth forms added.
- **csharp-async callbacks and streaming (already named by csharp-async).** CS-OBS-27 settles `Action<string>` over `IProgress<string>`. The open part is whether a later `IAsyncEnumerable<string>` stderr stream is worth its back-pressure and cancellation semantics.

## Sub-artifacts

- [csharp-observability-logging-rules.md](csharp-observability/csharp-observability-logging-rules.md): MEL rules for any code. It covers template analyzers by AnalysisLevel, the `[LoggerMessage]` diagnostic table, disabled-call allocations, exception and scope handling, the level table, injection shape, four measured secret routes and the redaction stack. It has 11 red/green pairs.
- [csharp-observability-library-instrumentation.md](csharp-observability/csharp-observability-library-instrumentation.md): the library channel choice and the NU1605 diamond, then `ActivitySource`/`Meter` naming, tags, status and cardinality, the `Activity.Current` leak, listener tests, `TRACEPARENT`, and ocx `--log-level` and stderr surfacing. It has 16 red/green pairs.

## Key sources

1. https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/library-guidance: the `ILoggerFactory`/`NullLogger` guidance, and `SkipEnabledCheck`.
2. https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/source-generation: generator method shape, case-insensitive name matching, the .NET 9 primary-constructor form.
3. https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1848: "Do not suppress", boxing and parse costs.
4. https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1873: the .NET 10 expensive-argument rule.
5. https://raw.githubusercontent.com/dotnet/runtime/main/src/libraries/Microsoft.Extensions.Logging.Abstractions/gen/DiagnosticDescriptors.cs: ground truth for SYSLIB1001-1029 severities (1006 is Info).
6. https://learn.microsoft.com/en-us/dotnet/core/diagnostics/distributed-tracing-instrumentation-walkthroughs: "library authors can exclusively rely on System.Diagnostics.DiagnosticSource", null `StartActivity`, naming.
7. https://learn.microsoft.com/en-us/dotnet/core/diagnostics/metrics-instrumentation: histogram in seconds, the 1000-combination bound, `TagList`, `InstrumentAdvice` (9.0).
8. https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/dependencies: minimise dependencies, and the lowest applicable version.
9. https://learn.microsoft.com/en-us/nuget/reference/errors-and-warnings/nu1605: package downgrade is an error by SDK default.
10. https://opentelemetry.io/docs/specs/semconv/registry/attributes/process/: `process.*` attributes, and command args "SHOULD NOT be collected by default".
11. https://opentelemetry.io/docs/specs/semconv/general/recording-errors/: `error.type`, status, exceptions routed to logs.
12. https://opentelemetry.io/docs/specs/otel/trace/api/: span-name generality, and `Ok` is final.
13. https://opentelemetry.io/docs/specs/otel/context/env-carriers/: the `TRACEPARENT` env carrier (Release Candidate).
14. https://github.com/dotnet/runtime/blob/main/src/libraries/Microsoft.Extensions.Logging/src/Logger.cs: MEL aggregates provider exceptions and rethrows them (observed in [K] `mel-throw`).
15. https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html: what never to log, and log injection.
