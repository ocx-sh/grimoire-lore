---
title: Recent shifts scan for csharp-quality (2026-10-11 to 2026-11-27)
pair: csharp-quality
date_researched: 2026-11-27
window_start: 2026-10-11
model: sonnet
sources_fetched: 15
---

# Recent shifts: csharp-quality

## Summary

- This is a delta scan for gaps against the 2026-10-11 baseline. It does not re-check existing pins.
- The pair already covers C# 15 syntax (CS-LANG-15, CS-LANG-16 against preview switches and `NET11_0_OR_GREATER`) and already retired CS-PROC-23 as a `dotnet-upgrade` re-check for `Process.Run`, `RunAndCaptureText` and `KillOnParentExit`. Those are "unchanged" except where noted below.
- .NET 11 reached GA on 2026-11-10, so every "wait for GA" deferral in the pair is now actionable. The pair is written for `net8.0;net10.0`.
- Eight candidates qualify (C1 to C8). Two existing statements are made obsolete or stale (O1, O2).
- No System.Text.Json, System.Diagnostics.Process or Microsoft.Extensions CVE is named in the window. The only library CVEs are Brotli (Oct 13/25 out-of-band) and System.Formats.Cbor (Nov 10).

## Findings by claim at risk

### F1. .NET 8 and .NET 9 end of support: changed
- Old text: the pair treats `net8.0` as a live leg (`net8` appears in language.md, json.md, testing.md, security.md and others; CS-TEST/CS-CI matrices are measured on `net8.0;net10.0`).
- New fact: .NET 8 (LTS) and .NET 9 (STS) both reached end of support on 2026-11-10. .NET 10 (LTS) and .NET 11 (STS, GA 2026-11-10) are supported to 2028-11-14. Source: [dotnet support policy](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core), page dated 2026-11-10.
- Consequence for this pair: a `net8.0` leg is now an out-of-support leg. A rule that keeps `net8.0` for consumers is a compatibility choice, not a support baseline. The TFM list itself belongs to `dotnet-build`.

### F2. .NET 11 / C# 15 GA surface: changed (GA, window event)
- [What's new in .NET 11](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/overview), ms.date 2026-11-10: C# 15 is the default language for `net11.0`. Only the memory-safety work needs `LangVersion=preview`. Runtime Async needs no preview flag for `net11.0`.
- [What's new in C# 15](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-15), updated 2026-11-19: collection expression arguments `[with(capacity: n), ..x]`, `union` types, `closed` classes, extension indexers, labeled `break`/`continue` (style rule IDE0410), non-virtual static interface members on older runtimes, memory safety preview (`unsafe(expr)`, `safe`, pointer relaxations, `updated-memory-safety-rules` feature flag).
- CS-LANG-15 text ("`LangVersion=preview` accepts C# 15 syntax", `CS9327` "not available in C# 14.0") stays correct for SDK 10.x. On SDK 11 the message text and the default change: unchanged for the rule, but see C1.

### F3. Process API: changed (now GA, previously a re-check)
- Old text (processes.md line 32): CS-PROC-23 retired; `Process.Run`, `RunAndCaptureText`, `KillOnParentExit` are a `dotnet-upgrade` re-check.
- New fact: [.NET 11 libraries](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/libraries) lists `Process.Run/RunAsync`, `RunAndCaptureText/RunAndCaptureTextAsync`, `ReadAllText/ReadAllBytes/ReadAllLines(+Async)` with `ProcessOutputLine` that tags stdout versus stderr, `StartAndForget`, `ProcessStartInfo.StartDetached`, `KillOnParentExit` (Windows only), `InheritedHandles` plus `StandardInputHandle/OutputHandle/ErrorHandle`, `StartSuspended` (Windows and macOS), `Process.Signal(PosixSignal)`, `WaitForExitStatus` and `ProcessExitStatus`. GA 2026-11-10. This directly replaces the two-pump drain pattern of CS-PROC-09 for `net11.0` only.
- Unchanged: CS-PROC-09 stays mandatory for any leg below `net11.0` (the pair's `net8.0;net10.0` legs).

### F4. Library breaking changes at GA: changed
- [IHost.RunAsync/StopAsync throw when a BackgroundService fails](https://learn.microsoft.com/en-us/dotnet/core/compatibility/extensions/11/ihost-runasync-stopasync-throw-backgroundservice-failure) (ms.date 2026-11-10): with `BackgroundServiceExceptionBehavior.StopHost` (the default) the host task now faults and the process exits non-zero; before it completed and exited 0.
- [DI scope disposal aggregates exceptions](https://learn.microsoft.com/en-us/dotnet/core/compatibility/extensions/11/dependency-injection-disposal-exceptions) (2026-11-10): every captured disposable is disposed after a failure; several failures surface as `AggregateException`. No compatibility switch.
- [Uri parsing and UriBuilder validation](https://learn.microsoft.com/en-us/dotnet/core/compatibility/networking/11/uri-parsing-validation) (2026-10-21): `UriBuilder.Host` rejects `contoso.com/path` and `user@host` with `ArgumentException`; IPv6 URIs without `/`, with a length prefix, or with embedded octal now fail to parse; `new Uri("p%41th", UriKind.Relative)` and `TryCreate` normalize identically.
- [API obsoletions with custom IDs](https://learn.microsoft.com/en-us/dotnet/core/compatibility/core-libraries/11/obsolete-apis) (2026-11-12): SYSLIB0063, SYSLIB0064, SYSLIB0066 (`IStartupValidator` obsolete, use `IAsyncStartupValidator`, do not register one type under both). Also on the [SYSLIB list](https://learn.microsoft.com/en-us/dotnet/fundamentals/syslib-diagnostics/obsoletions-overview) (updated 2026-11-02).
- Also in the breaking-changes index ([compat/11](https://learn.microsoft.com/en-us/dotnet/core/compatibility/11), updated 2026-11-23): named mutexes default to user scope on Unix, `NamedPipeServerStream` with `CurrentUserOnly` tightens Unix socket permissions, TAR reading verifies header checksums, `DateOnly/TimeOnly.TryParse` throws `ArgumentException` for invalid input (title only; body not read, "could not determine" for the exact trigger), Options validation generator reports SYSLIB1205 for explicit `Validate`.

### F5. System.Text.Json at .NET 11: changed
- [.NET 11 libraries](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/libraries): C# `union` serializes as its active case (default case chosen by token kind; two object cases are ambiguous unless `[JsonUnion(TypeClassifier = ...)]` is set, which throws `JsonException` on zero or several matches); `[JsonNamingPolicy]` on types and members; type-level `[JsonIgnore(Condition = ...)]` where `Always` is invalid (reflection throws `InvalidOperationException`, source generator reports SYSLIB1226); `JsonNamingPolicy.PascalCase`; JSON Lines via `SerializeAsyncEnumerable(..., topLevelValues: true)`; closed-hierarchy polymorphism inference; F# unions are reflection-only (no source generation, trimming or AOT).
- The pair mentions `union`/`closed` in json.md (CS-JSON-15 area) but not these attributes; see C5.

### F6. Security APIs and advisories: changed / unchanged
- New in .NET 11: `CryptographicOperations.FixedTimeEquals(ReadOnlySpan<byte>, byte)`, `X25519DiffieHellman`, AES Key Wrap (`EncryptKeyWrap`), experimental `CompositeMLKem`/`Hpke` (need SYSLIB5006 and SYSLIB5009) and `TlsContext/TlsSession` (SYSLIB5007). The pair's existing `FixedTimeEquals` rules (security.md, binaries.md) stay valid: unchanged.
- Advisories in window (all runtime or ASP.NET, none for System.Text.Json, Process or Extensions): CVE-2026-111497 Brotli decompression buffer overflow (fixed 8.0.33, 9.0.22, 10.0.14, 11 RC3; [.NET blog 2026-10-25](https://devblogs.microsoft.com/dotnet/dotnet-october-2026-oob-security-updates/)); the 11.0.0 [CVE list](https://github.com/dotnet/core/blob/main/release-notes/11.0/cve.md) names 22 entries by ID only; CVE-2026-118747 `System.Formats.Cbor` hash flood needs a package bump (8.0.2, 9.0.24, 10.0.15, 11.0.0), reported by a secondary source ([startdebugging.net](https://startdebugging.net/2026/11/november-2026-dotnet-patch-two-cves-a-runtime-update-does-not-fix/)), not confirmed on a Microsoft page, so treat as "could not determine" for versions.

### F7. Logging and telemetry at .NET 11: changed
- `[LoggerMessage]` works on generic methods (to avoid boxing); `allows ref struct` raises SYSLIB1011. Built-in `MemoryCache` metrics with `TrackStatistics = true`; the hit/miss tag renamed from `dotnet.cache.request.type` to `dotnet.cache.request.result`. `AddTracing` rules for `Activity` in `Microsoft.Extensions.Diagnostics`, `ActivitySource` unsealed. `[ConfigurationIgnore]`. CA1873 analyzer noise reduced. Source: [.NET 11 libraries](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/libraries). The pair's CS-OBS rules (templates constant, explicit `EventId`) are unchanged.

### F8. Tests and CI: changed
- `dotnet test` in the .NET 11 SDK adds `--no-dependencies`, `--timeout`, `--maximum-failed-tests`, `--results-directory-layout per-module`, `--use-current-runtime`, `--list-tests` JSON output, per-assembly counts; built-in templates scaffold xUnit v3 on Microsoft.Testing.Platform ([What's new in .NET 11](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/overview)). DN-RULE-02 allow-list (measured on SDK 10.0.401) does not list these.
- testfx v4.5.2 (27 Oct) and v4.5.3 (11 Nov), MTP 2.5.2 and 2.5.3 ([testfx releases](https://github.com/microsoft/testfx/releases)); changelog bodies not read: "could not determine" whether exit codes changed. Existing exit-code table (1, 2, 5, 8, 9): unchanged as far as verified.
- GitHub Actions: `pull_request_target` blocked by default in public repos from 2026-12-02 (brownouts 2026-11-09 and 2026-11-16; [changelog 2026-11-02](https://github.blog/changelog/2026-11-02-pull_request_target-blocked-by-default-december-2)). Workflow lockfiles `.github/workflows/actions.lock` GA 2026-10-28 via `gh actions-lock`, with an admin "Require lockfile" policy ([changelog](https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available)). Pinning by SHA is not made mandatory by it. The pair's `check-ci-matrix.sh` only parses `pull_request_target` as a trigger name.

## Normative guidance candidates

### C1. SHOULD: a `net11.0` leg uses the SDK 11 default; no hand-set preview for C# 15 (language.md, tighten CS-LANG-15/16)
- Rule: when a `net11.0` target exists, write C# 15 syntax only for `net11.0`-or-later legs and set no `LangVersion`; `preview` stays banned. Add `NET11_0_OR_GREATER` regions only once a `net11.0` leg builds (CS-LANG-16 already says so; its "wait for an SDK 11 GA pin" text is now stale, see O1).
- Rationale: GA 2026-11-10 removes the blocker CS-LANG-16 names (`NETSDK1045`), so the rule's reason line must be re-measured, not repeated.
- Verification: `rg -n 'LangVersion|EnablePreviewFeatures|updated-memory-safety-rules'` returns nothing; `dotnet build -f net11.0` with SDK 11 succeeds; a `with(` or `union` use on a `net8.0` leg fails with CS8652 or CS9327.
- Agent mistake caught: copying C# 15 syntax (`union`, `closed`, `[with(...)]`) into a multi-targeted project that still builds `net8.0` or `net10.0`.

### C2. SHOULD: on `net11.0` only, replace the hand-written two-pump drain with `Process.RunAndCaptureTextAsync` where its limits fit (processes.md, near CS-PROC-09, replacing the retired CS-PROC-23 note)
- Rule: guard with `#if NET11_0_OR_GREATER`; keep CS-PROC-09 for every other leg. Keep `ArgumentList`-style array arguments, a `CancellationToken`/timeout, and an explicit exit-code check on `ProcessExitStatus`.
- Rationale: GA API removes the deadlock class that CS-PROC-09 guards against, but only above `net11.0`; a multi-target repo needs both paths.
- Verification: `rg -n 'RunAndCapture|Process\.Run' --glob '*.cs'` hits sit inside `NET11_0_OR_GREATER`; the build lists a `net11.0` leg; reading heuristic: no `Process.Start` plus `ReadToEnd` on one stream.
- Agent mistake caught: using `Process.Run` on a `net10.0` leg (compile error, then "fixed" by deleting the leg) or inventing `RunAndCaptureText` overloads from memory.
- Caveat: signatures beyond the doc excerpt (`ProcessTextOutput` members) were read from one doc page; confirm against the API reference before writing a code sample.

### C3. SHOULD: `BackgroundService` host exits non-zero is now the contract on .NET 11 (errors.md or api-design.md, new trap line)
- Rule: do not wrap `await host.RunAsync()` in a catch-all to keep exit 0; a failing `ExecuteAsync` is expected to fault `RunAsync`; map it to a documented exit code at the single top-level catch (CS-ERR-06 site list).
- Rationale: .NET 11 changed the default `StopHost` behavior from success to failure; the Microsoft doc's "keep old behavior" try/catch is exactly the CS-ERR-06 swallow.
- Verification: `rg -n -U 'RunAsync\(\)[^;]*;\s*\}\s*catch\s*\((Exception)?\)?\s*\{\s*\}'` and read each `catch` after `RunAsync`; a test asserts a throwing `BackgroundService` gives a non-zero exit code on `net11.0` and 0 on `net10.0` (document the difference).
- Agent mistake caught: restoring exit 0 with an empty catch after the upgrade.

### C4. SHOULD: disposal code expects `AggregateException` from DI scope disposal (errors.md)
- Rule: `Dispose`/`DisposeAsync` must not throw; code that catches disposal failures handles both a single exception and `AggregateException` (catch `AggregateException` first). No code relies on a throwing disposable to stop later disposals.
- Rationale: .NET 11 disposes every captured service and aggregates failures; no switch restores the old behavior.
- Verification: `rg -n 'catch \(AggregateException' ` near scope disposal; reading heuristic on `Dispose` bodies for `throw`.
- Agent mistake caught: `catch (InvalidOperationException)` around `await using var scope` that no longer matches when two services fail.

### C5. SHOULD: System.Text.Json type-level attributes and unions (json.md, new rows)
- Rule: (a) a C# `union` with two object-shaped case types carries `[JsonUnion(TypeClassifier = ...)]`; (b) never put `JsonIgnoreCondition.Always` at type level; (c) on `net11.0`, do not combine `[JsonNamingPolicy]` on a type with a conflicting `[JsonPropertyName]` expecting the type policy to win (precedence: `[JsonPropertyName]`, member `[JsonNamingPolicy]`, type `[JsonNamingPolicy]`, options policy, member name); (d) treat SYSLIB1226 and SYSLIB1227 as errors, not suppressions (CS-CORE-01).
- Rationale: documented precedence and failure modes in the .NET 11 docs; (b) throws at run time under reflection and is silently ignored (with a build warning) under source generation.
- Verification: `rg -n 'JsonIgnore\(Condition *= *JsonIgnoreCondition\.Always\)' --glob '*.cs'` on a type declaration; build log has no SYSLIB1226; a round-trip test per union case.
- Agent mistake caught: assuming a union serializes like a polymorphic base with `$type`; assuming type-level `Always` hides the whole type.

### C6. CONSIDER: UriBuilder and Uri on .NET 11 (platform-and-paths.md or security.md, new trap line)
- Rule: set `UriBuilder.Path`, `UserName`, `Password` individually; never assign `Host = "a.com/path"` or `"user@host"`; treat IPv6 inputs without `/` or with `/64` as invalid input.
- Rationale: 2026-10-21 behavior change throws `ArgumentException` where .NET 10 silently re-parsed the host into other components, a classic URL-confusion source.
- Verification: `rg -n 'Host *= *[^;]*[/@]'` in `.cs` files that use `UriBuilder`; a test for each rejected shape on `net11.0`.
- Agent mistake caught: building `UriBuilder { Host = $"{host}{path}" }`.

### C7. SHOULD: workflow content for `pull_request_target` and lockfiles (testing.md CI section, `check-ci-matrix.sh`)
- Rule: a workflow in a public repository does not use `pull_request_target` unless an Actions event policy allows it, and never checks out or builds fork code under it. A repository that adopts `actions.lock` commits it with the workflow change and keeps a stale-lockfile check in CI (read-only).
- Rationale: GitHub blocks `pull_request_target` by default in public repos from 2026-12-02; builds that rely on it fail from then on. The lockfile is a new pinning mechanism that does not replace reviewing the dependency.
- Verification: `rg -n 'pull_request_target' .github/workflows` is empty or sits behind a documented policy; `check-ci-matrix.sh` already lists it as a trigger name, so extend it to print the line; `test -f .github/workflows/actions.lock` when the repo opted in.
- Agent mistake caught: "fixing" a fork-PR secrets problem by switching to `pull_request_target` with `actions/checkout` of the PR head, which is the exact pattern GitHub is blocking.
- Boundary: pinning policy for actions may belong to `dotnet-build` or a CI sibling; keep this row to workflow content.

### C8. CONSIDER: `dotnet test` allow-list for SDK 11 (testing.md and DN-RULE-02)
- Rule: when the SDK is 11.x, `--timeout` and `--maximum-failed-tests` are legitimate `dotnet test` options for the MTP runner; re-measure DN-RULE-02 on SDK 11 before adding them to the allow-list. Until then the SDK 10.0.401 allow-list stands.
- Rationale: the 2026-10-11 measurement covers SDK 10.0.401 only; the SDK 11 doc lists new options, and an agent that rewrites a command line from the new docs hits exit 5 on SDK 10.
- Verification: run each option against both SDKs and record exit codes; `dn-rule-02` block.
- Agent mistake caught: adding `--timeout` or `--results-directory-layout` to a command that CI runs on SDK 10.

## Obsolete or stale existing text

- O1. CS-LANG-16 rationale and processes.md line 32 ("The .NET 11 process APIs wait for an SDK 11 GA pin", "no such code compiles until a `net11.0` leg exists") are stale as a justification: GA shipped 2026-11-10. The rule itself (no `NET11_0_OR_GREATER` without a `net11.0` target) stays. Re-measure `NETSDK1045` and `CS1617` on SDK 11.0.100 before keeping the sentence "SDK 10.0.401 cannot add the leg".
- O2. Any statement that treats `net8.0` as a supported baseline (language.md, testing.md matrix prose) now rests on a compatibility choice only: .NET 8 and 9 left support on 2026-11-10. Rows that say "MUST keep net8.0" should say "while consumers need it".
- Not obsolete: CS-PROC-09, CS-OBS-01..04, FixedTimeEquals rules, MTP exit-code table.

## AI-agent angle

- Agents will use `Process.Run`, `union` or `closed` from this month's docs on `net8.0`/`net10.0` legs: caught by building each TFM (C1, C2).
- Agents restore the old exit-0 behavior with a swallow after the .NET 11 host change: caught by the CS-ERR-06 reading heuristic (C3).
- Agents switch a fork-PR workflow to `pull_request_target` to get secrets: caught by the grep in C7.
- Agents trust a `UriBuilder.Host` concatenation: caught by C6.

## Contested / evolving

- Memory safety (`unsafe(expr)`, `safe`, pointer relaxations) is preview in C# 15 and stays banned by CS-LANG-15; it will move toward GA in a later release (trend per the C# 15 page, 2026-11-19).
- Runtime Async no longer needs a preview flag on `net11.0`; whether to opt libraries into it is a `dotnet-build` and performance decision with no measurement in this window.
- `System.Formats.Cbor` advisory details rest on a secondary source.

## Not found (empty results)

- No System.Text.Json, System.Diagnostics.Process or Microsoft.Extensions CVE in the window.
- No new GitHub Actions default `GITHUB_TOKEN` permission change or enforced SHA pinning in the window (the changelog listing shows titles only; the 2026-10-02 "stateless GitHub App installation tokens" item was not read).
- xUnit v3 release notes inside the window: could not determine (not fetched; testfx only).
- .NET blog November 2026 posts other than the Oct 25 out-of-band post and the Nov 10 servicing summary were not opened; ".NET Conf 2026" content not fetched.

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/overview | .NET 11 What's new | 2026-11-10 | GA surface (primary) |
| https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/libraries | .NET 11 libraries (first 100k chars) | 2026-11 | Process, STJ, logging, crypto (primary) |
| https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-15 | C# 15 What's new | 2026-11-19 | Language features (primary) |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/11 | .NET 11 breaking changes index | 2026-11-23 | Candidate list (primary) |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/core-libraries/11/obsolete-apis | Obsoletions | 2026-11-12 | SYSLIB0063/64/66 (primary) |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/syslib-diagnostics/obsoletions-overview | SYSLIB list | 2026-11-02 | Diagnostics (primary) |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/extensions/11/ihost-runasync-stopasync-throw-backgroundservice-failure | Host exit change | 2026-11-10 | C3 (primary) |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/extensions/11/dependency-injection-disposal-exceptions | DI disposal | 2026-11-10 | C4 (primary) |
| https://learn.microsoft.com/en-us/dotnet/core/compatibility/networking/11/uri-parsing-validation | Uri changes | 2026-10-21 | C6 (primary) |
| https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core | Support policy | 2026-11-10 | EOS dates (primary) |
| https://github.com/dotnet/core/tree/main/release-notes/11.0 | 11.0 release listing | 2026-11-10 | GA date (primary) |
| https://github.com/dotnet/core/blob/main/release-notes/11.0/cve.md | 11.0 CVE list | 2026-11 | Advisories (primary, IDs only) |
| https://devblogs.microsoft.com/dotnet/dotnet-october-2026-oob-security-updates/ | Out-of-band security post | 2026-10-25 | Brotli CVE (primary) |
| https://github.blog/changelog/2026-11-02-pull_request_target-blocked-by-default-december-2 | Actions changelog | 2026-11-02 | C7 (primary) |
| https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available | Actions changelog | 2026-10-28 | C7 (primary) |
| https://github.com/microsoft/testfx/releases | testfx releases | 2026-11-11 | MTP versions (primary, bodies unread) |
| https://startdebugging.net/2026/11/november-2026-dotnet-patch-two-cves-a-runtime-update-does-not-fix/ | Third-party servicing summary | 2026-11 | Cbor CVE (secondary) |
