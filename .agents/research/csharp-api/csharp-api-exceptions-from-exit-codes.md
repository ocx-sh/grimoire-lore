---
title: "Exceptions from exit codes: the exception model of a C# SDK that wraps the ocx CLI"
topic: csharp-api-exceptions-from-exit-codes
agent: deep-dive researcher (group csharp-api, wave 1)
model: sonnet (claude-sonnet-5-5)
date_researched: 2026-10-10
sources_count: 43
scope: >
  Covers: the exception hierarchy of the ocx C# SDK (names, count, sealing), how an ocx exit code becomes a category
  (versioned table, open enum), the error document as exception properties, the exception-versus-result boundary,
  parse failures, timeout versus cancellation, secrets in messages, and the general .NET exception-design rules with the
  analyzer IDs that enforce them (CA1031 CA1032 CA1064 CA2200 CA2201 CA1710, SYSLIB0051), on C# 14 / .NET 10 with a
  .NET 8 floor and .NET 11 RC1 flagged. Not covered: process launch/argv, stream draining and the full cancellation/kill
  protocol (sibling topics), JSON binding strategy beyond the exception seam, PublicApiAnalyzers/API baselines, bootstrap/download
  errors. Windows behaviour is NOT measured here (every run is Linux x64); Windows-only claims are marked unverified.
---

# Exceptions from exit codes

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The ocx facts that drive the design](#1-the-ocx-facts-that-drive-the-design)
   2. [Hierarchy: right-sizing 26 classes for C#](#2-hierarchy-right-sizing-26-classes-for-c)
   3. [Exit code to category: where the table lives and how it is versioned](#3-exit-code-to-category-where-the-table-lives-and-how-it-is-versioned)
   4. [The error document as exception properties](#4-the-error-document-as-exception-properties)
   5. [Exception versus result: the boundary](#5-exception-versus-result-the-boundary)
   6. [Parse failures: OcxParseException instead of leaked JsonException](#6-parse-failures-ocxparseexception-instead-of-leaked-jsonexception)
   7. [Timeout versus cancellation](#7-timeout-versus-cancellation)
   8. [Serialization: SYSLIB0051 and the end of ISerializable](#8-serialization-syslib0051-and-the-end-of-iserializable)
   9. [Constructors: CA1032 and why simple-exec suppresses it](#9-constructors-ca1032-and-why-simple-exec-suppresses-it)
   10. [Catch-all, filters, rethrow: CA1031, CA2200 and the filter loophole](#10-catch-all-filters-rethrow-ca1031-ca2200-and-the-filter-loophole)
   11. [Type hygiene: CA1064, CA2201, CA1710, records, typed properties versus Exception.Data](#11-type-hygiene-ca1064-ca2201-ca1710-records-typed-properties-versus-exceptiondata)
   12. [Secrets never in Message](#12-secrets-never-in-message)
   13. [Evaluating pulumi-dotnet: stderr-regex classification](#13-evaluating-pulumi-dotnet-stderr-regex-classification)
   14. [Analyzer set and severity matrix](#14-analyzer-set-and-severity-matrix)
   15. [Era notes: C# 14 / .NET 10, .NET 11 RC1](#15-era-notes-c-14--net-10-net-11-rc1)
   16. [Verified on the toolchain](#16-verified-on-the-toolchain)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

Conventions. `F` = `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-api-exceptions-from-exit-codes`.
`RUN` = `/home/mherwig/.cache/research-lang/dotnet-tools/run.sh` (SDK 10.0.401 pinned by `F/global.json`; 8.0.425 and 11.0.100-rc.1 used where stated).
Exemplars are cited `owner__repo@sha12:path:line` (clones under `/home/mherwig/.cache/research-lang/exemplars/csharp/`).
ocx facts cite `ocx@sha12:path:line` (`/home/mherwig/dev/ocx`; `origin/main` = `246863abc1d4`, tag `v0.6.5` = `26ad03a17b34`).

## Summary

- Root every SDK failure in one `public abstract class OcxException : Exception` with protected standard constructors; ship **five sealed leaves** (`OcxCommandException`, `OcxParseException`, `OcxTimeoutException`, `OcxLaunchException`, `OcxVersionException`), not the Python SDK's 26 classes: the exit table changed from 18 codes to 13 in one release, and a public type can never be removed, an enum member can.
- Carry the ocx category as a property (`OcxCommandException.Category`, plus raw `int ExitCode`, `ErrorKind`, `Detail`) and filter with `catch (OcxCommandException e) when (e.Category == ...)`; add a per-category subclass only when callers demonstrably branch on it (Anthropic/Octokit do so because HTTP statuses are RFC-stable, ocx's table is not).
- Derive the category from the **exit code**, never from `error.kind` (kind 81 and 77 both report `permission_denied`: `ocx@246863abc1d4:crates/ocx_exit/src/exit_code.rs:73` maps `PolicyBlocked` to `PermissionDenied`), never from `error.message` or stderr text.
- The exit table is **generation-specific**: 82 means `DirtyRcBlock` on v0.6.5 and `Unsupported` on main. A single hand-written table mislabels one of them (watched: red prints `Unsupported` for a 0.6.5 dirty-rc exit, green prints `DirtyRcBlock`). Select the table from the `ocx version` handshake (`contract` key), and treat unknown numbers as `Unknown` with the raw int preserved.
- Hand-write the 13-row current table and guard it with a conformance test against the vendored `errors.json` `ExitCode` `x-ocx-enum` (13 entries with `value/name/category`); a code generator is not worth it below ~30 rows.
- A **passthrough child's exit code is data, not an exception**: `exec`, `run`, `package exec`, `package test`, `launcher *` return an `ExecResult`. Mapping a child's `80` to an auth failure is the Python SDK's smell S2 (watched red: `exit 80 category AuthError` for a build tool; green returns `ExitCode=80`).
- Wrap every `JsonException`, null document and missing-required-member in `OcxParseException` at **one decode seam**; watched red: `JsonException` leaks past `catch (OcxException)` on truncated and skewed output, and `Deserialize<T>("null")!` silently returns null.
- Caller cancellation is always `OperationCanceledException` (never wrapped); an SDK-owned timeout is `OcxTimeoutException` with a `Timeout` property. Both surface as `TaskCanceledException` from the BCL, so the discriminator is `!ct.IsCancellationRequested && timeoutCts.IsCancellationRequested`. A blanket `catch (Exception e) { throw new OcxX(e) }` swallows cancellation, and CA1031 does not flag it.
- No `[Serializable]`, no `SerializationInfo`/`StreamingContext` constructor, no `GetObjectData` on net8+: SYSLIB0051 fires on both (watched on SDK 10.0.401 and 8.0.425); set `<WarningsAsErrors>$(WarningsAsErrors);SYSLIB0051</WarningsAsErrors>`. The MS docs' own CA1032/Creating-exceptions samples still show `[Serializable]`, so an agent copying them is wrong.
- CA1031, CA1032, CA1064 and CA2201 are **off in default analysis mode** (only CA2200 fires); they fire under `AnalysisLevel` `10.0-all`/`Recommended` or an explicit `dotnet_diagnostic.CAxxxx.severity = error` (verified).
- CA1031 has a hole: `catch (Exception ex) when (ex is not OperationCanceledException) { return -1; }` is **not flagged** while `when (true)` is; a reviewer needs a grep for swallowing bodies (R10 below), not just the analyzer.
- CA1032 wants three public standard constructors; a leaf that is only built by the SDK should instead keep an `internal` data constructor and carry a `[SuppressMessage(..., Justification = "...")]` (abstract roots with protected standard constructors pass cleanly: verified). A public parameterless constructor on a leaf permits a category-less instance.
- Exceptions are classes: `record X : Exception` is `CS8864`; give them read-only typed properties, never `{ get; set; }` (Stripe) and never `Exception.Data` for data a caller needs (untyped, not secure per the docs, and not printed by `ToString()`).
- Secrets: `Message` carries a fixed template plus redacted argv; stderr/stdout tails and raw documents live on opt-in properties; no environment snapshot, no `Data` entries. Corpus counterexamples: CliWrap puts `{TargetFilePath} {Arguments}` in the message, simple-exec puts full stdout+stderr in it, Anthropic puts the response body in `Message`.
- Do not copy pulumi-dotnet's stderr-regex classification (`CommandException.CreateFromResult`): ocx publishes a stable exit code and `error.detail` slug, and documents `error.message` as "Not stable: never match on it".
- Exit numbers are lossy on .NET: `exit 300` reports `44`, a SIGKILLed child reports `137`, SIGTERM `143` (measured); only .NET 11 RC1's `Process.RunAsync` returns a `ProcessExitStatus` with `Signal`, so a net8 floor cannot rely on it.
- Treat `TempFail` (75) alone as retryable (`IsTransient`, mirrors Npgsql's `IsTransient`) and `Unavailable` (69) as not: `machine-interface.md` states "A wrapper can loop on 75 and stop on 69".

## Findings

### 1. The ocx facts that drive the design

**Two exit-code generations.** `v0.6.5` has 18 codes, main has 13 (`ocx@26ad03a17b34:crates/ocx_exit/src/exit_code.rs`, `git show v0.6.5:... | grep -E '^\s+[A-Z][A-Za-z]+ = [0-9]+'` lists Success=0, Failure=1, 64, 65, 69, 74, 75, 77, 78, 79, 80, 81, 82 `DirtyRcBlock`, 83 `TransparencyLogUnavailable`, 84 `ReferrersUnsupported`, 85 `UnsupportedKeyBackend`, 86 `ForgeCapabilityUnavailable`, 87 `RegistryDeleteUnsupported`). Main declares `Unsupported = 82` (`ocx@246863abc1d4:crates/ocx_exit/src/exit_code.rs:78`) and `pub const RETIRED: &[u8] = &[83, 84, 85, 86, 87]` (`:84`). The enum is `#[repr(u8)] #[non_exhaustive]` (`:16`).

| Code | v0.6.5 name | main name (category) | note |
|---|---|---|---|
| 81 | PolicyBlocked | PolicyBlocked (`permission_denied`) | same number, same meaning; kind is NOT 1:1 with code |
| 82 | DirtyRcBlock | Unsupported (`unsupported`) | **same number, different meaning** |
| 83 | TransparencyLogUnavailable | retired; slug `transparency_log_unavailable` lives under 75, others under 69/65/81 | |
| 84-87 | per-feature codes | retired; collapse into 82 as `error.detail` slugs (86 split: allowlist refusal goes to 77) | |

The ADR calls the 82 reuse "one-time", justified because "no contract baseline exists yet" (`ocx@246863abc1d4:.claude/artifacts/adr_exit_code_taxonomy.md:123-128`; deciders line 7), while the user-facing docs say "The values are stable across releases, so `case $?` is a supported way to branch" (`ocx@246863abc1d4:website/src/docs/reference/machine-interface.md:113`). An SDK therefore cannot assume stability pre-baseline.

**Kind is not code.** `ErrorCategory::from_exit_code` maps both `PermissionDenied` (77) and `PolicyBlocked` (81) to kind `permission_denied` (`ocx@246863abc1d4:crates/ocx_exit/src/error_category.rs`, `from_exit_code`; and `exit_code.rs:73`). Branch on exit code first, `error.kind` second, `error.detail` third.

**The error document** (`ocx@246863abc1d4:crates/ocx_cli/src/error_document.rs:33-62`, golden `crates/ocx_schema/tests/golden/errors.json`, `$id` `https://ocx.sh/schemas/errors/v2.json`): `schema_version` (int, `ERRORS_SCHEMA_VERSION = 2` at `:29`), `command` (string, empty when no command named), `exit_code` (int), `error.kind` (string, open enum), `error.detail` (string slug, optional; 505 `ErrorDetail` values each with an `exit_code`), `error.message` (human text; "Not stable: never match on it", `machine-interface.md:104`), `error.context` (`identifier`, `source`, `target`; always present, possibly empty). It is printed on **stdout** under `--format json`, "including after a usage error"; stderr carries logs (`machine-interface.md:24`, `:79-81`). On v0.6.5 a usage error printed 0 bytes on stdout (measured in the audit: `ocx-cli-contract.md:26`); the ADR says v0.6.5 already shipped `schema_version: 1` documents with the old kinds, but `errors/v1.json` was never published (`adr_exit_code_taxonomy.md:22`).

**Three outcomes** (`machine-interface.md:67-77`): success; report-then-fail (non-zero exit, stdout holds the report root, no error document follows); error (non-zero, stdout holds the error document). "Read the exit code first, then parse stdout." Enum values are open: "An unknown status is not success ... fail closed" (`:55-63`).

**Passthrough**: "A child process run by `ocx exec` is the one case where the exit code is not ocx's own: the child's exit code is forwarded unchanged" (`machine-interface.md:121`). Measured on 0.6.5 by the audit: `exec -- sh -c 'exit 64'` returns 64, indistinguishable from `UsageError` (`ocx-cli-contract.md:58`).

**Versions**: `contract` in `ocx --format json version` carries `errors` (the error document's `schema_version`), `reports`, `commands`; "A version increases when ... an exit code is removed or renumbered ... a value keeps its name but changes meaning" (`machine-interface.md:33-53`). Pre-contract binaries (<= 0.6.5) have no `contract` key. #604 rolls the errors schema back to v1 in place until a baseline exists (`ocx-cli-contract.md:28`), so `errors.schema_version == 1` may mean either the old or the new table: **presence of `contract` is the reliable generation discriminator, its numbers are not (yet)**.

### 2. Hierarchy: right-sizing 26 classes for C#

The Python SDK has 26 exception classes: `OcxError` > `OcxExecutionError` > `OcxProcessError` with 15 subclasses keyed by `ExitCode`, plus `OcxTimeoutError`, `BootstrapError` family, `OcxNotFoundError`, `VersionCompatError` (`ocx-sdk-python@80136dde4162:src/ocx_sdk/_errors.py`, summarised in `python-sdk-digest.md` section 3). That fits Python's `except AuthError` idiom; .NET has an equally cheap filter form, so the question is asymmetric cost.

Measured exemplar shapes:

| Library | Shape | Discriminator | Sealed? | Evidence |
|---|---|---|---|---|
| Azure.Core | one `RequestFailedException` (+ `Status`, `ErrorCode`); guidance: "Don't introduce new exception types unless there's a programmatic scenario" | int + string properties | not sealed | `Azure__azure-sdk-for-net@32c48fc3d524:sdk/core/Azure.Core/src/RequestFailedException.cs:29-34`; [Azure .NET guidelines](https://azure.github.io/azure-sdk/dotnet_introduction.html) |
| Npgsql | `NpgsqlException` > `PostgresException` (+ `SqlState` string, `IsTransient`) | open string | not sealed | `npgsql__npgsql@9c47244547c2:src/Npgsql/NpgsqlException.cs:19,45-46`; `PostgresException.cs:205-215` |
| Octokit | `ApiException` tree, ~21 classes (NotFound, Forbidden, RateLimit, ...) | type per HTTP status/condition | 0 of 21 sealed | `octokit__octokit.net@7fa5b0fe4a18:Octokit/Exceptions/ApiException.cs:16`, `NotFoundException.cs:15` |
| Anthropic SDK | `AnthropicApiException` tree, one subclass per HTTP status via factory switch | type per status | 0 of 17 sealed | `anthropics__anthropic-sdk-csharp@ae16e5933f39:src/Anthropic/Exceptions/AnthropicExceptionFactory.cs:19-67` |
| Stripe | one `StripeException` (+ `StripeError`, `HttpStatusCode`), a few generated V2 subclasses | properties | not sealed | `stripe__stripe-dotnet@dbdca6ba5efc:src/Stripe.net/Infrastructure/Public/StripeException.cs:7,37-41` |
| CliWrap | abstract `CliWrapException` > `CommandExecutionException(Command, ExitCode)` | `ExitCode` int | abstract root, leaf not sealed | `Tyrrrz__CliWrap@7dbc252fa773:CliWrap/Exceptions/CliWrapException.cs:9`, `CommandExecutionException.cs:9-33` |
| simple-exec | `ExitCodeException(ExitCode)` > `ExitCodeReadException(+StandardOutput/StandardError)` | `ExitCode` int | neither | `adamralph__simple-exec@f80913246993:src/SimpleExec/ExitCodeException.cs:7`, `ExitCodeReadException.cs:7` |
| MedallionShell | one `ErrorExitCodeException` | `ExitCode` int | sealed | `madelson__MedallionShell@e45f1f6ffd4c:MedallionShell/ErrorExitCodeException.cs:14` |
| Testcontainers | 14 exceptions | none | all sealed | `testcontainers__testcontainers-dotnet@04cbb73fcc58:src/Testcontainers/Builders/DockerUnavailableException.cs:11` |

The two libraries that wrap a **process** and expose an exit code (CliWrap, simple-exec, Medallion) all use *one* exception with an `int ExitCode`; the ones with many subclasses wrap HTTP, whose status taxonomy is an RFC. Per-category subclasses make sense where the category set is stable and the generator is mechanical (Anthropic's is generated). ocx's set changed 18 -> 13 with a reused number between two releases, so:

- Adding a member to an open `OcxErrorCategory` enum is non-breaking; removing or renumbering a *public type* is a breaking change forever (FDG: "Exceptions that are a part of the contract should not change from one version to the next", [FDG exception throwing](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/exception-throwing)).
- Starting small is reversible: un-sealing a sealed leaf and throwing a subclass later does not break `catch (OcxCommandException)`. Starting with 15 leaves is not reversible.
- Corpus sealing: the audit's count is 70 of 180 custom exception classes sealed (39%) (`exemplar-language-shape.md:401`). A re-count for this topic (regex over direct `: *Exception`-suffixed bases, test directories excluded, script at the scratchpad) gives 73 of 235 (31%) overall and 44 of 188 public (23%); Octokit, Anthropic, Azure.Core, Stripe, xunit, MessagePack: 0 sealed; nodatime 11/13, StackExchange.Redis 8/9, Polly 5/12. Method differences move the headline figure (39% vs 31%) but not the conclusion: the corpus mostly leaves exception leaves open, and the libraries that seal (Testcontainers, Redis, nodatime, MedallionShell) are the ones with a closed, SDK-constructed set. Sealing is cheap to relax, impossible to add later without a break, so seal leaves by default.

**Decision (hierarchy, 1 abstract root + 5 sealed leaves):**

```csharp
public abstract class OcxException : Exception          // protected standard ctors: CA1032-clean (verified)
{
    public string? Command { get; }                      // "package pull"; null if none
}
public sealed class OcxCommandException  : OcxException  // ocx ran and reported failure
{ int ExitCode; OcxErrorCategory Category; string? ErrorKind; string? Detail; string? OcxMessage;
  OcxErrorContext Context; string? StderrExcerpt; string? PartialReportJson; bool IsTransient => Category == TempFail; }
public sealed class OcxParseException    : OcxException  // output undecodable or wrong shape
{ string Excerpt; string? TestedContract; }
public sealed class OcxTimeoutException  : OcxException  // SDK-owned timer fired
{ TimeSpan Timeout; }
public sealed class OcxLaunchException   : OcxException  // could not start ocx (missing/not executable); InnerException = Win32Exception
public sealed class OcxVersionException  : OcxException  // handshake says unsupported
{ string? Found; string Minimum; }
```

(`OcxBootstrapException` and download/checksum errors belong to the packaging topic and would derive from the same root.) 26 -> 6 types; the Python categories survive as `OcxErrorCategory` members.

### 3. Exit code to category: where the table lives and how it is versioned

Rules established by the sources and the fixtures:

1. **Open enum, int on the wire.** ocx exit codes are `u8`, but `Process.ExitCode` is `int`, and on .NET the value is lossy: `sh -c 'exit 300'` -> `44`; SIGKILL -> `137`; SIGTERM -> `143` (watched; section 16, g-misc measurements). Store `int ExitCode`; map to `OcxErrorCategory` through a table; never cast the int to a `byte`-backed enum (watched: `(OcxExitCode)137` has `Enum.IsDefined == false` and a `switch` falls through silently to `_`). The Python SDK documents the same hazard ("a process killed by a signal exits with a code ocx never assigns, and building an error must not itself raise", `_errors.py:122-124` via the digest).
2. **Unknown number -> `Unknown`, never throw from the mapper.** The ocx docs require handling an unlisted value as "a value that cannot be classified" (`machine-interface.md:59`); `ExitCode` is `#[non_exhaustive]` (`exit_code.rs:16`).
3. **Version the table by the handshake.** Fixture D: one frozen "main" table applied to a 0.6.5 binary labels a dirty-rc exit `Unsupported`; a table selected by the presence of `contract` in `ocx --format json version` labels it `DirtyRcBlock`. Because #604 may reuse `schema_version` 1, key on `contract` presence first, then `contract.errors`.
4. **Floor decision.** Simplest correct policy: the SDK's minimum ocx is the first release that has `contract`; an older binary fails the handshake with `OcxVersionException(Found, Minimum)`, exactly as the generated Rust SDK answers `Error::Unsupported` (`ocx-cli-contract.md:101`). Then only the current generation's table is ever needed, and the "82 changed meaning" problem reduces to a handshake. Supporting 0.6.x needs a second, frozen, hand-written table (Fixture D shows its shape). The Python SDK's floor is 0.6.2 (`_types.py:30,33`), so this is a deliberate departure to put to the owner.
5. **Generated vs hand-written.** The vendored `errors.json` carries `ExitCode.x-ocx-enum` = 13 entries `{value, name, description, category}` and `ErrorDetail.x-ocx-enum` = 505 slugs with `exit_code` each (verified by `python3 -I` over `crates/ocx_schema/tests/golden/errors.json` at `246863abc1d4`). The C# generator does not exist (`Lang` has exactly `Rust`, `ocx-cli-contract.md:30`). A source generator for 13 rows is more machinery than the table; hand-write 13 rows and add a **conformance test** that loads the vendored schema and fails on any missing/renamed/recategorised value. Generate only if the table grows past ~30 rows or the schema is frozen with a published baseline.
6. **Never match text.** Python's stated principle: "nothing in this SDK ever classifies a failure by matching stderr text" (`_errors.py:6-8` via digest); ocx: `error.message` "Not stable: never match on it".

```csharp
// WRONG: one frozen table, cast, text match
var cat = (OcxExitCode)process.ExitCode;                       // 137 -> undefined member
if (stderr.Contains("not found")) throw new OcxNotFoundException();

// RIGHT: handshake-selected table, int preserved, Unknown is a value
ExitTable table = await HandshakeAsync(ct);                    // contract present -> Current else OcxVersionException
OcxErrorCategory cat = table.Map(process.ExitCode);           // default arm -> OcxErrorCategory.Unknown
throw new OcxCommandException(command, process.ExitCode, cat, doc, ...);
```

### 4. The error document as exception properties

Parse the document only when exit != 0 **and** the command is not report-then-fail-with-accepted-code, and only from stdout. On 0.6.5 the document may be absent (usage errors) or v1: every property except `ExitCode`/`Category` must be nullable.

| Document field | Exception property | Rule |
|---|---|---|
| process exit code | `int ExitCode` | authoritative; the document's `exit_code` is a cross-check, mismatch -> trust the process |
| (from table) | `OcxErrorCategory Category` | from exit code via the generation table |
| `error.kind` | `string? ErrorKind` | keep as string (open enum); do not derive Category from it |
| `error.detail` | `string? Detail` | stable slug; the thing callers should branch on when Category is too coarse |
| `error.message` | `string? OcxMessage` | display only, bounded, redacted; never matched |
| `error.context.{identifier,source,target}` | `OcxErrorContext Context` (sealed record, nullable members) | only present for sign/verify/copy failures today |
| `schema_version` | `int? DocumentSchemaVersion` | diagnostic |
| `command` | `OcxException.Command` | |
| stderr tail | `string? StderrExcerpt` | opt-in diagnostic property, bounded (Python: 500 chars), redacted, NOT in `Message` |
| stdout of a failed report-then-fail command | `string? PartialReportJson` | raw; `ToString()` must not print it (Python keeps `stdout` out of `__str__`, digest section 3) |

`IsTransient` returns `Category == OcxErrorCategory.TempFail` only; Npgsql derives `IsTransient` from a closed list of SQL states plus inner exception types (`PostgresException.cs:205-215`, `NpgsqlException.cs:45-46`), and ocx documents 75 as the code "which makes automated retry safe here only" (`ocx@246863abc1d4:crates/ocx_exit/src/exit_code.rs:57`) and the docs add "A wrapper can loop on 75 and stop on 69" (`machine-interface.md:117`).

### 5. Exception versus result: the boundary

Throw when ocx **itself** failed to do what the method name promises. Return data when the non-zero code is information.

| Situation | Outcome | Why |
|---|---|---|
| ocx's own command exits non-zero, no accepted-code set | `OcxCommandException` | execution failure (FDG: "DO report execution failures by throwing exceptions") |
| `exec`/`run`/`package exec`/`package test`/`launcher *` child exit code | **`ExecResult(ExitCode, ...)`, no throw** | forwarded unchanged; indistinguishable from ocx's own code (S2) |
| report-then-fail (17 command modes) with a documented finding code | typed report + accepted-code set per call; non-accepted code -> `OcxCommandException` with `PartialReportJson` | full report on stdout AND non-zero exit (`machine-interface.md:72-75`) |
| exit 0 but `status` not a known success value | fail closed: throw (suggest `OcxCommandException` with `Category = Unknown`, or `OcxParseException`; owner decision) | `machine-interface.md:77` |
| "absent" is the expected answer (`index list <missing>` exits 0 with a stderr warning on 0.6.5; Python `_RECEIPT_OK=(0,79)` returns `None`) | `null`/`Find...Async`/`TryGet...Async`, not an exception | FDG: "DO NOT use exceptions for the normal flow of control, if possible" |
| usage errors by the caller (null, bad enum, leading-dash positional) | `ArgumentException` family via `ThrowIfNull`/`ThrowIfNullOrEmpty`, synchronously before any `await` | [best practices](https://learn.microsoft.com/en-us/dotnet/standard/exceptions/best-practices-for-exceptions) |
| caller token cancelled | `OperationCanceledException` | section 7 |

Never offer a `bool throwOnError`/`CommandResultValidation`-style switch on one method: FDG says "DO NOT have public members that can either throw or not based on some option". CliWrap does it deliberately (`Tyrrrz__CliWrap@7dbc252fa773:CliWrap/CommandResultValidation.cs:9-20`; `Command.Execution.cs:278`); two methods (`RunAsync` throws, `ExecAsync` returns) say it in the type system. Never return or `out` an exception.

Watched (Fixture D): the red runner throws for every non-zero code and reports `./ocx-main.sh exec -- build-tool -> exit 80 category AuthError`; the green `ExecAsync` returns `ExitCode=80 (no exception)`.

### 6. Parse failures: OcxParseException instead of leaked JsonException

Python smell S3: `OcxError` is documented as "Base class for every error raised by ocx-sdk" but 36 `raise ValueError` sites leak past it, and the leaked ones are exactly the version-skew failures (`python-sdk-digest.md` S3). The .NET equivalent is `JsonException` (and `InvalidOperationException`, `NotSupportedException` from `JsonSerializer`), plus the `null` return for the JSON literal `null`.

- `JsonException` is thrown for invalid JSON, depth overrun, and type mismatch; it carries `Path`, `LineNumber`, `BytePositionInLine` ([API](https://learn.microsoft.com/en-us/dotnet/api/system.text.json.jsonexception)); its serialization constructor and `GetObjectData` are `[Obsolete(... DiagnosticId = ...)]` under `#if NET` in the BCL itself ([JsonException.cs](https://raw.githubusercontent.com/dotnet/runtime/main/src/libraries/System.Text.Json/src/System/Text/Json/JsonException.cs)).
- Since .NET 8 `[JsonUnmappedMemberHandling(Disallow)]`/`JsonSerializerOptions.UnmappedMemberHandling` makes unknown members an error ([missing-members](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/missing-members)); for forward compatibility with ocx (additions never bump the version, `machine-interface.md:51`) leave the default (skip), and use `required`/`[JsonRequired]` only for the members the SDK genuinely cannot work without.
- `JsonSerializer.Deserialize<T>("null")` returns `null`; a trailing `!` hides it (watched: red prints `./ocx-null.sh: ok`).

```csharp
// WRONG: leaks JsonException; hides null
return JsonSerializer.Deserialize<VersionReport>(stdout, Opts)!;

// RIGHT: one seam, everything becomes OcxParseException with InnerException and a bounded excerpt
static T Decode<T>(string command, string stdout) where T : class
{
    var excerpt = stdout.Length <= 200 ? stdout : stdout[..200];   // redact before storing
    try   { return JsonSerializer.Deserialize<T>(stdout, Opts) ?? throw new OcxParseException(command, excerpt, "0.6.5"); }
    catch (JsonException e) { throw new OcxParseException(command, excerpt, "0.6.5", e); }
}
```

The exception carries `Command`, `Excerpt`, the contract/tested version, and the original `JsonException` as `InnerException` (path/line preserved). Message states "This SDK is tested against ocx X" like Python's `_need` (`_results.py:206-221` via digest). The anthropic SDK has the same idea as `AnthropicInvalidDataException` (`anthropics__anthropic-sdk-csharp@ae16e5933f39:src/Anthropic/Exceptions/AnthropicInvalidDataException.cs`).

### 7. Timeout versus cancellation

- `Task.WaitAsync(TimeSpan)` faults with the BCL `TimeoutException`; `WaitAsync(CancellationToken)` and `CancellationTokenSource.CancelAfter` produce `OperationCanceledException` ([WaitAsync](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.task.waitasync), [CancelAfter](https://learn.microsoft.com/en-us/dotnet/api/system.threading.cancellationtokensource.cancelafter)). Catch `OperationCanceledException`, not `TaskCanceledException` ([best practices](https://learn.microsoft.com/en-us/dotnet/standard/exceptions/best-practices-for-exceptions)).
- A timeout built as `linked.CancelAfter(timeout)` is **indistinguishable** from caller cancellation at the catch site: both surface as `TaskCanceledException` (watched, V7 red). CliWrap has the same property: its forceful and graceful cancellation both throw `OperationCanceledException` with different messages (`Tyrrrz__CliWrap@7dbc252fa773:CliWrap/Command.Execution.cs:243-270`), and its tokens have no timeout concept.
- Rule: caller cancellation stays `OperationCanceledException` (never wrapped, never converted); only the SDK's own timer becomes `OcxTimeoutException(timeout)` with the `TaskCanceledException` as `InnerException`; the discriminator is `when (!ct.IsCancellationRequested && timeoutCts.IsCancellationRequested)`. Polly models the same split: `TimeoutRejectedException` with a `Timeout` property (`App-vNext__Polly@e4476096da5b:src/Polly.Core/Timeout/TimeoutRejectedException.cs:46-47`).
- `OcxTimeoutException : OcxException`, not `: TimeoutException`: a class has one base, and catching `OcxException` must see it. Callers who want BCL semantics can filter on `e.InnerException`.
- A blanket wrap is the real cancellation killer: `catch (Exception e) { throw new OcxLaunchException("...", e); }` converted a cancelled `Task.Delay` into an SDK failure (watched, V8 wrap-red); the fix is `catch (Exception e) when (e is not OperationCanceledException)`. **CA1031 does not flag the blanket wrap** (a `throw new` in the handler satisfies it; only the boundary `Main` was flagged), so this needs the R8/R9 greps.

### 8. Serialization: SYSLIB0051 and the end of ISerializable

- From .NET 8, every public/protected `(SerializationInfo, StreamingContext)` constructor and every implicit `GetObjectData` is obsolete with warning `SYSLIB0051`; the docs' advice for a custom exception: "consider whether you really need it to be serializable. It's likely that you don't ... support for remoting was dropped in .NET Core 1.0. ... simply remove the `[Serializable]` attribute, the serialization constructor, and the `GetObjectData` override" ([SYSLIB0051](https://learn.microsoft.com/en-us/dotnet/fundamentals/syslib-diagnostics/syslib0051); breaking-change list: [8.0 obsolete APIs](https://learn.microsoft.com/en-us/dotnet/core/compatibility/core-libraries/8.0/obsolete-apis-with-custom-diagnostics), which says "Warning (not an error by default)").
- Compat escape hatch for libraries that already shipped the surface: apply `[Obsolete(DiagnosticId = "SYSLIB0051")]` under `#if NET8_0_OR_GREATER` (Azure.Core: `Azure__azure-sdk-for-net@32c48fc3d524:sdk/core/Azure.Core/src/RequestFailedException.cs:132-135,143-147`; Npgsql marks without the id: `NpgsqlException.cs:62-63`; Polly drops `[Serializable]` on netcoreapp: `TimeoutRejectedException.cs:10-13`). **A brand-new SDK has no shipped surface to protect, so it needs none of this.**
- CA2229 ("Implement serialization constructors") was removed in .NET 8 because it conflicts with SYSLIB0051 ([CA2229](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2229)); an agent that "fixes" CA2229 findings from an old ruleset adds the obsolete constructor back.
- The MS docs still show the old pattern: CA1032's good example is `[Serializable()] public class GoodException`; "Creating and throwing exceptions" defines `[Serializable] public class InvalidDepartmentException` ([CA1032](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1032), [creating-and-throwing](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/exceptions/creating-and-throwing-exceptions)). The SYSLIB0051 page is the authority; the others are stale on this point.

Watched (V2): the legacy form raises `SYSLIB0051` twice (`Ex.cs(11,86)` base constructor, `Ex.cs(18,9)` `base.GetObjectData`) plus `CS0672` on both `net8.0` and `net10.0`, and on SDK 8.0.425 too; the plain form and the `#if NET8_0_OR_GREATER [Obsolete(DiagnosticId = "SYSLIB0051")]` form build with 0 warnings; `-p:WarningsAsErrors=SYSLIB0051` turns the red into `error SYSLIB0051` and `Build FAILED`.

### 9. Constructors: CA1032 and why simple-exec suppresses it

CA1032 requires `()`, `(string)`, `(string, Exception)` as **public** constructors; the docs allow suppression "when the violation is caused by using a different access level for the public constructors" ([CA1032](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1032)); "Enabled by default in .NET 10: No".

- simple-exec's `ExitCodeException` offers only `(int exitCode)`, `(int, Exception)`, `(int, string)`, `(int, string, Exception)` — every constructor requires the exit code, so a parameterless one would create an exception with no exit code — and wraps the class in `#pragma warning disable CA1032` (`adamralph__simple-exec@f80913246993:src/SimpleExec/ExitCodeException.cs:6-8`; `ExitCodeReadException.cs:6-8`). Octokit suppresses it by attribute with a justification string "These exceptions are specific to the GitHub API and not general purpose exceptions" (`octokit__octokit.net@7fa5b0fe4a18:Octokit/Exceptions/ApiException.cs:14-15`). Polly enforces it at `warning` for library code and `none` for tests (`App-vNext__Polly@e4476096da5b:eng/analyzers/Library.globalconfig:230`, `Test.globalconfig:222`).
- Verified variants (V3c): an **abstract root with three protected standard constructors passes**; a sealed leaf with an `internal` data constructor fails (3 findings: add `()`, `(string)`, `(string, Exception)`); a sealed leaf with public `(string, Exception?)` + data constructor fails (`()` and `(string)`); a leaf deriving from the clean root with a public data constructor fails (3). One `[SuppressMessage("Design", "CA1032:Implement standard exception constructors", Justification = "...")]` per leaf clears it (0 warnings).
- C# 12 primary constructors do not satisfy it: `sealed class X(string message, int code) : Exception(message)` raised three CA1032 findings in the red fixture (V3).

Recommended shape: the abstract root satisfies CA1032 honestly (protected standard constructors); each sealed leaf keeps its `internal` data constructor, with the attribute-plus-justification suppression (auditable by grep, unlike a file-wide `#pragma`).

```csharp
// WRONG (satisfies the analyzer, breaks the invariant): leaf gets public new OcxCommandException() { } -> no ExitCode
// RIGHT
[SuppressMessage("Design", "CA1032:Implement standard exception constructors",
    Justification = "SDK-constructed leaf; a public parameterless ctor would permit an instance with no exit code.")]
public sealed class OcxCommandException : OcxException
{
    internal OcxCommandException(string message, int exitCode, Exception? inner = null) : base(message, inner) => ExitCode = exitCode;
    public int ExitCode { get; }
}
```

### 10. Catch-all, filters, rethrow: CA1031, CA2200 and the filter loophole

- FDG and the analyzer agree: "DO NOT catch `System.Exception` ... in framework code, unless you intend to rethrow. AVOID catching `System.Exception` ... except in top-level exception handlers" ([using standard exception types](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/using-standard-exception-types)); CA1031 "Do not suppress a warning from this rule" ([CA1031](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1031)). The corpus suppresses it anyway at narrow best-effort boundaries: simple-exec's kill helper catches `Exception` and returns `false` under `#pragma warning disable CA1031` (`adamralph__simple-exec@f80913246993:src/SimpleExec/Internal/ProcessExtensions.cs:117-119`, with the comment "exceptions may be thrown for all kinds of reasons"). Polly has 53 CA1031 mentions (suppressions and config), testfx 27.
- Legitimate catch-all sites in the SDK: (1) the process/decode seam, filtered `when (e is not OperationCanceledException)` and wrapping into an SDK type; (2) best-effort cleanup (kill, delete temp) with a justified suppression; (3) log-and-`throw;`.
- `throw;` keeps the stack; `throw ex;` restarts it and is CA2200 (a default-on warning even in default analysis mode, verified V3) ([exception-handling statements](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/exception-handling-statements)). Exception filters run before unwinding and are the idiomatic way to decide *not* to handle (`when`), not a way to handle more broadly.
- **Loophole (verified V3b):** CA1031 flags `catch (Exception) { return -1; }`, `catch { return -1; }` and `catch (Exception) when (true) { return -1; }` but **not** `catch (Exception ex) when (ex is not OperationCanceledException) { return -1; }`. A filter mentioning the exception variable is treated as "specific enough". Agents write exactly this to "fix" CA1031. Pair the analyzer with the R10 grep, which matches all four forms.
- FDG: "DO NOT throw exceptions from exception filter blocks" (a throwing filter becomes `false`): keep `when` conditions pure.

### 11. Type hygiene: CA1064, CA2201, CA1710, records, typed properties versus Exception.Data

- **CA1064** fires on a non-public exception deriving *directly* from `Exception`/`SystemException`/`ApplicationException`; fix: make it public or derive from a public SDK exception ([CA1064](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1064)). Verified: `internal sealed class InternalOnlyException : Exception` -> `CA1064 (10,23)`. Internal control-flow exceptions should derive from `OcxException`.
- **CA2201** fires on `throw new Exception(...)` and the reserved types (`NullReferenceException`, `IndexOutOfRangeException`, `OutOfMemoryException`, `StackOverflowException`, `COMException`, `SEHException`, `ExternalException`, `AccessViolationException`, `ExecutionEngineException`); "Do not suppress a warning from this rule" ([CA2201](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2201)). Verified at `Ex.cs(34,40)`. Never `ApplicationException` (FDG: "DO NOT throw or derive from `ApplicationException`").
- **CA1710** (suffix) fires under `10.0-all`: my own green draft named `OcxInternalFailure : Exception` and the analyzer reported `CA1710` until renamed to `...Exception` (watched during fixture construction).
- **Records cannot be exceptions**: `public record OcxRecordException(string Message, int ExitCode) : Exception(Message);` -> `error CS8864: Records may only inherit from object or another record` (verified). Use `sealed class` with `{ get; }`/`init` properties; the *value* types they carry (`OcxErrorContext`) can be records.
- **Typed properties, not `Exception.Data`.** The docs: the `Data` pairs "are not secure ... you must guarantee that the information ... is not confidential" and keys can collide across handlers ([Exception.Data](https://learn.microsoft.com/en-us/dotnet/api/system.exception.data)); verified: on .NET 10 `Data` accepts arbitrary objects and `ToString()` does **not** print it, so a caller reading `e.ToString()` never sees it and a telemetry exporter that walks `Data` sees everything. Exemplars that do it anyway: Azure copies service details into `Data` (`RequestFailedException.cs:98`) and Npgsql mirrors props via `AddData` (`PostgresException.cs:64-66`) — both *also* expose typed properties (`Status`, `ErrorCode`, `SqlState`); Stripe's typed properties are mutable (`{ get; set; }`, `StripeException.cs:37-41`), which lets any handler rewrite the failure.
- Don't hide `InnerException`: Anthropic declares `public new HttpRequestException InnerException` whose getter **throws `ArgumentNullException` when there is no inner** (`anthropics__anthropic-sdk-csharp@ae16e5933f39:src/Anthropic/Exceptions/AnthropicApiException.cs:9-19`, also `AnthropicIOException.cs:8`). A throwing getter in an exception type breaks every logger that walks the chain (CA1065 territory: exception members must not throw; [best practices](https://learn.microsoft.com/en-us/dotnet/standard/exceptions/best-practices-for-exceptions)).
- If you add properties, override `ToString()` to include them ("If new properties are added to the derived exception class, `ToString()` should be overridden", [creating-and-throwing](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/exceptions/creating-and-throwing-exceptions)) — but never to include secrets or the raw report (section 12).

### 12. Secrets never in Message

The brief's last constraint, with measured corpus counterexamples:

| Where | What leaks | Evidence |
|---|---|---|
| CliWrap `CommandExecutionException` message | `{TargetFilePath} {Arguments}` verbatim; buffered variant adds the full stderr | `Tyrrrz__CliWrap@7dbc252fa773:CliWrap/Command.Execution.cs:283-292`; `Buffered/BufferedCommandExtensions.cs:67-82` |
| simple-exec `ExitCodeReadException` | complete stdout and stderr in `Message` | `adamralph__simple-exec@f80913246993:src/SimpleExec/ExitCodeReadException.cs:92-93` |
| Medallion `ErrorExitCodeException` | `FileName` + `Arguments` | `madelson__MedallionShell@e45f1f6ffd4c:MedallionShell/ErrorExitCodeException.cs:17` |
| Pulumi `CommandException` | `result.ToString()` = code + full stdout + full stderr | `pulumi__pulumi-dotnet@2a0dca84f09b:sdk/Pulumi.Automation/Commands/Exceptions/CommandException.cs:18`, `CommandResult.cs:26-33` |
| Anthropic `AnthropicApiException.Message` | the response body | `AnthropicApiException.cs:31-39` |
| Azure.Core | deliberately *not*: success-path messages say "Response content and headers are not included to avoid logging sensitive data" | `RequestFailedException.cs:24` (the error path still appends content, `:183,196-214`, but guarded by a try/catch so a failure there cannot mask the real error) |

ocx sources of secrets on the argv/env side: `login --password-stdin`, `package sign --identity-token-stdin` keep secrets off argv; secrets can still arrive as `OCX_AUTH_*`-style environment variables (the Python SDK scrubs `OCX_NO_VERIFY` etc.; `ocx-cli-contract.md:79-82`; 10 of 124 env entries are marked secret). MS guidance: "Information that is sensitive to security shouldn't be put in the message text" ([creating-and-throwing](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/exceptions/creating-and-throwing-exceptions)).

Policy for the SDK:
- `Message` = fixed template `ocx <command> failed (exit <code>, <category>).` + `Detail` slug + one hint sentence. No argv values for flags that can hold secrets, no env, no stdout.
- `OcxMessage`/`StderrExcerpt` are separate bounded (500 char) properties passed through a redactor (Bearer tokens, URL userinfo, known env names). ocx's own scrubbing of `error.message` is **unverified**; assume it can contain registry URLs and identifiers.
- No `Exception.Data` entries; no environment snapshot; `ToString()` never prints `PartialReportJson`.

Watched (Fixture F, canary `ghp_SECRETTOKEN123`): red `Message`/`ToString()`/`Data` all contain the canary; green: `Message contains secret: False`, `ToString() ... False`, `StderrExcerpt ... False`, `Data entries: 0`.

### 13. Evaluating pulumi-dotnet: stderr-regex classification

`CommandException.CreateFromResult` classifies a failed `pulumi` run by `Regex("no stack named.*found")`, `Regex("stack.*already exists")`, and `Contains("[409] Conflict: Another update is currently in progress.")` / `"the stack is currently locked by"` over `result.StandardError`, producing `StackNotFoundException`, `StackAlreadyExistsException`, `ConcurrentUpdateException` (`pulumi__pulumi-dotnet@2a0dca84f09b:sdk/Pulumi.Automation/Commands/Exceptions/CommandException.cs:23-33`), invoked after `WithValidation(CommandResultValidation.None); // we check non-0 exit code ourselves` (`.../LocalPulumiCommand.cs:355,366`).

Verdict: an **anti-pattern for ocx, defensible for pulumi**. Pulumi's CLI has no structured error contract, only `0/1` and prose; the three regexes are the only available signal, and they break on message rewording or locale. ocx publishes a stable exit code, a stable `error.detail` slug and states `error.message` is "Not stable: never match on it". Classifying ocx failures by text re-creates a fragile second taxonomy next to a published one. It also puts stdout+stderr in the exception message (section 12). Keep the *shape* worth borrowing: validation off in the process layer, one classification function, specific subclasses for the few conditions callers branch on (here: `Category`/`Detail`).

### 14. Analyzer set and severity matrix

Verified by `dotnet build` of `c-analyzers/red` (V3):

| Rule | Default mode | `Recommended` | `10.0-all` | Needs explicit severity | Flags |
|---|---|---|---|---|---|
| CA2200 rethrow `throw ex;` | **warning** | warning | warning | no | `Ex.cs(40,48)` |
| CA1031 general catch | off | warning | warning | `dotnet_diagnostic.CA1031.severity = error` | `Swallow` only; not `SwallowFiltered`; not a wrapping `throw new` |
| CA1032 standard ctors | off | warning | warning | `...CA1032.severity = error` | 3 findings per class |
| CA1064 exceptions public | off | warning | warning | `...CA1064.severity = error` | internal-over-`Exception` only |
| CA2201 reserved types | off | warning | warning | `...CA2201.severity = error` | `throw new Exception` |
| CA1710 suffix | off | n/a (not measured) | warning | `...CA1710.severity = error` | missing `Exception` suffix |
| SYSLIB0051 | warning (compiler) | warning | warning | `<WarningsAsErrors>$(WarningsAsErrors);SYSLIB0051</WarningsAsErrors>` | legacy ctor/`GetObjectData` |

Minimal `.editorconfig` that turns the exception rules into errors without the whole `-all` firehose (verified: default mode + these lines gave `error CA1031`, `error CA1032`, `error CA1064`, `error CA2201`, still `warning CA2200`):

```ini
root = true
[*.cs]
dotnet_diagnostic.CA1031.severity = error
dotnet_diagnostic.CA1032.severity = error
dotnet_diagnostic.CA1064.severity = error
dotnet_diagnostic.CA2200.severity = error
dotnet_diagnostic.CA2201.severity = error
dotnet_diagnostic.CA1710.severity = error
```

`AnalysisLevel`/`AnalysisMode` mechanics (values `None|Default|Minimum|Recommended|All`, `latest-all` compound form, `CodeAnalysisTreatWarningsAsErrors`) are in [code analysis overview](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/overview); the overall build gate is another topic.

### 15. Era notes: C# 14 / .NET 10, .NET 11 RC1

- Nothing in C# 14 changes exception declaration. Primary constructors (C# 12) work on exceptions but do not satisfy CA1032 (verified) and tempt agents into `sealed class X(string message, int code) : Exception(message)`, which is legal but has no standard constructors and exposes `code` only if re-declared as a property.
- **.NET 11 RC1 (GA Nov 2026): `Process.RunAsync` returns `Task<ProcessExitStatus>`** with `ExitCode`, `Canceled`, `Signal` (verified by reflection and run on SDK 11.0.100-rc.1.26425.128: `sh -c 'exit 137'` -> `Signal=null`; `sh -c 'kill -9 $$'` -> `Signal=SIGKILL`; both `ExitCode=137`). It finally distinguishes "exited 137" from "killed by SIGKILL"; the dotnet/runtime source keeps the two separate (`ProcessWaitState.Unix.cs`, `ChildReaped` builds `new ProcessExitStatus(exitCode, canceled: ..., signal)`). `Process` in net8/net10 has no such member; use only under `#if NET11_0_OR_GREATER` for diagnostics.
- **C# 15 `union` types compile on 11.0 RC1** (`public union OcxOutcome(Ok, Failed);` plus a type-pattern `switch` built and printed `failed 80`, with `LangVersion` default and with `preview`). That is the future language-level alternative to an `ExecResult`/`OcxOutcome` record hierarchy at the exception-vs-result boundary; do not use it on a net8 floor, and treat the syntax as RC1-observed, not final.
- `Exception` serialization constructors remain obsolete on net10/net11 (the API page marks `JsonException(SerializationInfo, StreamingContext)` Obsolete for net-8.0 through net-11.0).

### 16. Verified on the toolchain

Fixtures under `F`; every command run from inside the named directory with `RUN` = `/home/mherwig/.cache/research-lang/dotnet-tools/run.sh`; SDK 10.0.401 unless stated. At least 13 red->green pairs watched across V1-V13 (V6 holds two: table and passthrough; V10-V13 are the reviewer greps).

**V1 Parse failure leaks (a-parse).** `cd F/a-parse/red && RUN dotnet run --nologo` ->
```
./ocx-truncated.sh: LEAKED JsonException
./ocx-null.sh: ok
./ocx-skew.sh: LEAKED JsonException
```
`cd F/a-parse/green && RUN dotnet run --nologo` ->
```
./ocx-truncated.sh: handled OcxParseException inner=JsonException
./ocx-null.sh: handled OcxParseException inner=none
./ocx-skew.sh: handled OcxParseException inner=JsonException
```
(The dummy "ocx" scripts print a truncated document, the JSON literal `null`, and a document missing the `required` member.)

**V2 SYSLIB0051 (b-serialization).** `cd F/b-serialization/red && RUN dotnet build --nologo -v q` (TFMs net8.0;net10.0) ->
```
Ex.cs(11,86): warning SYSLIB0051: 'Exception.Exception(SerializationInfo, StreamingContext)' is obsolete: 'This API supports obsolete formatter-based serialization. It should not be called or extended by application code.' (https://aka.ms/dotnet-warnings/SYSLIB0051) [TargetFramework=net10.0]   (same for net8.0)
Ex.cs(18,9): warning SYSLIB0051: 'Exception.GetObjectData(SerializationInfo, StreamingContext)' is obsolete: ...
Ex.cs(16,26): warning CS0672: Member 'OcxOldStyleException.GetObjectData(...)' overrides obsolete member ...
```
`green` and `green-compat` (the `#if NET8_0_OR_GREATER [Obsolete(DiagnosticId = "SYSLIB0051")]` form) -> `0 Warning(s) 0 Error(s)`. SDK floor: `cd F/b-serialization/red-sdk8 && RUN dotnet build` (global.json 8.0.425) -> SYSLIB0051 and CS0672 present.

**V3 Analyzer set (c-analyzers).** csproj has `<AnalysisLevel>10.0-all</AnalysisLevel>`. `cd F/c-analyzers/red && RUN dotnet build --nologo --no-incremental` (unique lines) ->
```
Ex.cs(10,23): warning CA1064: Exceptions should be public
Ex.cs(23,9):  warning CA1031: Modify 'Swallow' to catch a more specific allowed exception type, or rethrow the exception
Ex.cs(34,40): warning CA2201: Exception type System.Exception is not sufficiently specific
Ex.cs(40,48): warning CA2200: Re-throwing caught exception changes stack information
Ex.cs(4,21):  warning CA1032: Add the following constructor to OcxPrimaryOnlyException: public OcxPrimaryOnlyException()   (and (string message), (string message, Exception innerException))
```
`green` -> `0 Warning(s) 0 Error(s)` (an earlier draft raised `CA1710` for a non-`Exception`-suffixed name and `CA1062` for unchecked parameters; both fixed by `ThrowIfNull`/rename).
Severity modes on the red project: `RUN dotnet build --nologo --no-incremental -p:AnalysisLevel=latest -p:AnalysisMode=Default` -> only `warning CA2200`; `-p:AnalysisMode=Recommended` -> CA1031, CA1032, CA1064, CA2201, CA2200 (+ CA1062, CA1812); with `F/c-analyzers/red/.editorconfig` setting the four rules to `error` under Default -> `error CA1031`, `error CA1032`, `error CA1064`, `error CA2201`, `warning CA2200` (the file was removed after the run).

**V3b CA1031 filter loophole (c-analyzers/red-filter).** `RUN dotnet build --nologo --no-incremental | grep CA1031` ->
```
Ex.cs(20,9): warning CA1031: Modify 'Bare' ...
Ex.cs(26,9): warning CA1031: Modify 'Plain' ...
Ex.cs(8,9):  warning CA1031: Modify 'WhenTrue' ...      # catch (Exception) when (true)
                                                         # WhenNotOce: catch (Exception ex) when (ex is not OperationCanceledException) { return -1; }  -> NOT reported
```

**V3c CA1032 variants (c-analyzers/ctor-variants, ctor-suppressed).** `ctor-variants`: `AbstractRootException` (protected standard ctors) clean; `InternalCtorException` -> 3 findings; `TwoCtorException` -> 2; `LeafException : AbstractRootException` with a public data ctor -> 3. `ctor-suppressed` (abstract root + sealed leaf with `[SuppressMessage("Design","CA1032:...", Justification=...)]`) -> `0 Warning(s)`.

**V4 Record exception (b-serialization/red-record).** `RUN dotnet build --nologo -v q` -> `error CS8864: Records may only inherit from object or another record` (net8.0 and net10.0). Green twin: the `sealed class` in `b-serialization/green` builds clean.

**V5 SYSLIB0051 as error.** `cd F/b-serialization/red && RUN dotnet build --nologo --no-incremental -f net10.0 "-p:WarningsAsErrors=SYSLIB0051"` -> `error SYSLIB0051 ... Ex.cs(11,86)`, `... Ex.cs(18,9)`, `Build FAILED`; same command in `green` and `green-compat` -> `Build succeeded.`

**V6 Versioned exit table and passthrough (d-exitcodes).** Dummy `ocx-065.sh` (`version` -> `{"version": "0.6.5"}`; `self setup` exits 82) and `ocx-main.sh` (`version` carries `contract`; `package delete` exits 82; `exec` exits 80).
`cd F/d-exitcodes/red && RUN dotnet run --nologo` ->
```
./ocx-065.sh self setup -> exit 82 category Unsupported
./ocx-main.sh package delete -> exit 82 category Unsupported
./ocx-main.sh exec -- build-tool -> exit 80 category AuthError
```
`cd F/d-exitcodes/green && RUN dotnet run --nologo` ->
```
./ocx-065.sh self setup -> exit 82 category DirtyRcBlock
./ocx-main.sh package delete -> exit 82 category Unsupported
./ocx-main.sh exec -- build-tool -> result ExitCode=80 (no exception)
```
Two pairs in one run: the table pair (line 1: wrong label -> right label) and the passthrough pair (line 3).

**V7 Timeout versus cancel (e-timeout).** `cd F/e-timeout/red && RUN dotnet run --nologo` ->
```
timeout surfaces as TaskCanceledException; caller token cancelled: false -> caller cannot tell timeout from cancel
user cancel surfaces as TaskCanceledException; caller token cancelled: True
```
`green` ->
```
timeout surfaces as OcxTimeoutException Timeout=200ms inner=TaskCanceledException
user cancel surfaces as TaskCanceledException; caller token cancelled: True
```

**V8 Blanket wrap swallows cancellation (e-timeout/wrap-red, wrap-green).** red -> `caller saw OcxLaunchException: cancellation was converted to an SDK failure`; green (`when (e is not OperationCanceledException)`) -> `caller saw OperationCanceledException (cancellation honoured)`. `RUN dotnet build -p:AnalysisLevel=10.0-all` on `wrap-red` reports CA1031 only for the boundary `Main`, not for the wrapping `catch`.

**V9 Secrets (f-secrets).** red -> `Message contains secret: True / ToString() contains secret: True / Data contains secret: True`; green -> `Message contains secret: False / ToString() contains secret: False / StderrExcerpt contains secret: False / Data entries: 0`.

**V10-V13 Reviewer greps (run from `F`).**
- R1 (legacy serialization): `grep -rnE --include='*.cs' -e 'SerializationInfo' -e '\[Serializable\]' -e 'ISerializable' b-serialization/red b-serialization/green` -> red: `Ex.cs:3 [Serializable]`, `:11 ...SerializationInfo...`, `:16 ...GetObjectData(SerializationInfo...`; green: no output.
- R2 (unsealed public concrete exception): `grep -rnP --include='*.cs' '^\s*public\s+(?!sealed\b|abstract\b|static\b)(partial\s+)?class\s+\w+\s*(\([^)]*\))?\s*:\s*[\w.]*Exception\b' a-parse e-timeout f-secrets c-analyzers/red c-analyzers/green b-serialization/red b-serialization/green` -> only `b-serialization/red/Ex.cs:4:public class OcxOldStyleException : Exception`.
- R8 (blanket wrap, multiline): `grep -rlPz --include='*.cs' 'catch\s*\(Exception\s+\w+\)\s*\{[^{}]*throw\s+new\s' e-timeout/wrap-red e-timeout/wrap-green` -> lists `wrap-red/Program.cs` only.
- R10 (swallowing catch-all incl. filter loophole): `grep -rnPzo --include='*.cs' 'catch\s*(\(Exception[^)]*\))?\s*(when\s*\([^)]*\))?\s*\{\s*(return[^;]*;|\})' c-analyzers/red c-analyzers/red-filter c-analyzers/green | tr '\0' '\n'` -> 2 hits in `red` (plain and `when (ex is not OperationCanceledException)`), 4 in `red-filter` (including `when (true)` and bare `catch`), none in `green`.
- Other greps validated: R3 (`throw new (Exception|SystemException|ApplicationException|NullReferenceException|IndexOutOfRangeException)\(`) -> `c-analyzers/red/Ex.cs:34`; R4 (`\bData\[|\bData\.Add\(`) -> `f-secrets/red/Program.cs:10`; R5 (`catch \(JsonException`) -> only the decode seam `a-parse/green/Program.cs:46`; R6 (`Deserialize<[^>]+>\([^)]*\)!`) -> `a-parse/red/Program.cs:23`; R11 (`new\s+\w+\s+InnerException`) on the Anthropic exemplar -> `AnthropicApiException.cs:9`, `AnthropicIOException.cs:8`.

**Measurements (g-misc), no red/green:** `sh -c 'exit 7'` -> 7; `exit 300` -> 44; `exit 255` -> 255; `kill -9 $$` -> 137; `kill -15 $$` -> 143 (`Process.ExitCode`, Linux x64, .NET 10). `(OcxExitCode)137` -> `IsDefined=False`. `ex.Data["token"]=...; ex.ToString().Contains(...)` -> `False`; `Data` accepts `new object()`. SDK 11.0.100-rc.1: `Process.RunAsync` -> `ProcessExitStatus` (section 15); `union` compiles. **Windows is unmeasured**: the NTSTATUS-style exit codes of a killed child (e.g. `0xC000013A`) and `Process.Kill` semantics are unverified here and belong to the process topic.

## Normative guidance candidates

Paths below assume the conventional layout `src/` (library) and `tests/`; replace nothing, run from the repository root.

1. **R-EXC-01 One root.** Declare exactly one `public abstract class OcxException : Exception` with three `protected` standard constructors; every SDK failure type derives from it directly or transitively. *Why:* one `catch` covers the SDK (fixes smell S3), CA1032/CA1064-clean. *Verify:* `grep -rnP --include='*.cs' ':\s*Exception\b' src | grep -v 'abstract class OcxException'` must print nothing (no second root); plus a test enumerating `typeof(OcxException).Assembly.GetExportedTypes()` whose base is `Exception`.
2. **R-EXC-02 Five sealed leaves, no per-code subclasses.** Public concrete exceptions: `OcxCommandException`, `OcxParseException`, `OcxTimeoutException`, `OcxLaunchException`, `OcxVersionException`; categories are an `OcxErrorCategory` property. *Why:* the exit table lost 5 codes and reused 82 within one release; types cannot be retired. *Verify:* `grep -rhoP --include='*.cs' 'class\s+(\w+)\s*(\([^)]*\))?\s*:\s*OcxException\b' src | sort -u | wc -l` is 5 (update only with an ADR); `grep -rnE --include='*.cs' 'class\s+Ocx\w*(Auth|NotFound|Usage|Config|Permission)\w*Exception' src` prints nothing.
3. **R-EXC-03 Seal concrete exceptions; abstract roots.** Every concrete exception is `sealed`; inheritance points are `abstract`. *Why:* sealing can be relaxed later, not added; CA1064/closed set. *Verify:* `grep -rnP --include='*.cs' '^\s*public\s+(?!sealed\b|abstract\b|static\b)(partial\s+)?class\s+\w+\s*(\([^)]*\))?\s*:\s*[\w.]*Exception\b' src` prints nothing (watched: flags only the red twin).
4. **R-EXC-04 No legacy serialization.** No `[Serializable]`, `ISerializable`, `SerializationInfo`, `StreamingContext`, `GetObjectData` on SDK types. *Why:* obsolete since .NET 8 (SYSLIB0051), remoting is gone, a new SDK has no compat debt. *Verify:* `grep -rnE --include='*.cs' -e 'SerializationInfo' -e 'StreamingContext' -e '\[Serializable\]' -e 'ISerializable' -e 'GetObjectData' src` prints nothing, and `Directory.Build.props` contains `<WarningsAsErrors>$(WarningsAsErrors);SYSLIB0051</WarningsAsErrors>` (`grep -n 'SYSLIB0051' Directory.Build.props`).
5. **R-EXC-05 Exceptions are classes with read-only typed properties.** No `record` deriving from `Exception`; no `{ get; set; }` on exception types; no `Exception.Data` for caller-needed data. *Why:* CS8864; mutable failures; `Data` is untyped, insecure, not in `ToString()`. *Verify:* `grep -rnP --include='*.cs' 'record\s+\w+\s*(\([^)]*\))?\s*:\s*[\w.]*Exception\b' src` prints nothing; `grep -rnE --include='*Exception*.cs' '\{ *get; *set; *\}' src` prints nothing; `grep -rnE --include='*.cs' '\.Data\[|\.Data\.Add\(' src` prints nothing.
6. **R-EXC-06 Category from exit code via a handshake-selected table; unknown is a value.** `OcxCommandException.Category` is computed from the process exit code using the table for the detected contract generation; unlisted numbers map to `OcxErrorCategory.Unknown`; the raw `int ExitCode` is always kept; no direct enum cast; no text matching. *Why:* kind != code; 82 changed meaning; `exit 300` -> 44, signals -> 137/143. *Verify:* `grep -rnE --include='*.cs' '\((OcxExitCode|OcxErrorCategory)\)\s*[a-zA-Z_.]*([eE]xit|code)' src` prints nothing outside `src/Internal/ExitTable*.cs`; `grep -rnE --include='ExitTable*.cs' 'Regex|\.Contains\(\"' src` prints nothing; a unit test feeds the numbers 0..255 and asserts no throw and `Unknown` for 3, 66, 137, 143, 255.
7. **R-EXC-07 Conformance test against the vendored schema.** The hand-written table is checked in CI against the vendored `errors.json` `ExitCode.x-ocx-enum` (value, name, category) so schema drift fails the build. *Why:* guards the 13 rows without a code generator. *Verify:* `dotnet test --filter FullyQualifiedName~ExitTableConformance` exists and is in the CI test set (`grep -rn 'ExitTableConformance' tests`).
8. **R-EXC-08 Floor via handshake.** The SDK reads `ocx --format json version` once and throws `OcxVersionException(Found, Minimum)` if `contract` is absent (unless a legacy table is a documented requirement). *Why:* pre-contract binaries use another exit meaning for 82. *Verify:* a test with a fake `ocx` printing `{"version":"0.6.5"}` expects `OcxVersionException`; `grep -rn 'contract' src --include='*.cs' | grep -i handshake` hits the single handshake site.
9. **R-EXC-09 Child exit codes are data.** Methods for `exec`, `run`, `package exec`, `package test`, `launcher *` return a result type carrying `ExitCode`; they never call the category mapper and never throw for a non-zero child code. *Why:* S2: forwarded codes are indistinguishable from ocx's own. *Verify:* test with a fake `ocx` whose `exec` exits 80 expects `ExitCode == 80` and no exception (watched in V6); `grep -rn 'ExitTable' src/Exec* src/Run* 2>/dev/null` prints nothing.
10. **R-EXC-10 No throw-or-not switches.** No `bool throwOnError`, `Validation`, `check:` parameter on a public method; no public method returns or `out`s an `Exception`. *Why:* FDG ("DO NOT have public members that can either throw or not based on some option"). *Verify:* `grep -rnE --include='*.cs' -e 'bool\s+(throwOnError|throwOnFailure|check)\b' -e 'out\s+\w*Exception\s' -e 'Task<\w*Exception>' src` prints nothing.
11. **R-EXC-11 One decode seam; `JsonException` never escapes.** All `JsonSerializer.Deserialize*`/`JsonDocument.Parse` calls live in one internal class; it is the only place with `catch (JsonException`; a `null` result becomes `OcxParseException`; no `!` after `Deserialize`. *Why:* S3; watched leak. *Verify:* `grep -rlE --include='*.cs' 'JsonSerializer\.Deserialize|JsonDocument\.Parse' src` lists exactly one file; `grep -rnE --include='*.cs' 'catch \(JsonException' src` hits only that file; `grep -rnE --include='*.cs' 'Deserialize<[^>]+>\([^)]*\)!' src` prints nothing; fake-ocx tests for truncated, `null`, and missing-required output assert `OcxParseException` with `InnerException`.
12. **R-EXC-12 Cancellation is never wrapped; timeouts are typed.** Caller cancellation propagates as `OperationCanceledException`; a catch that wraps must carry `when (e is not OperationCanceledException)`; an SDK timer becomes `OcxTimeoutException` only under `when (!ct.IsCancellationRequested && timeoutCts.IsCancellationRequested)`. *Why:* the wrap swallows cancellation and CA1031 does not see it (watched V8). *Verify:* `grep -rlPz --include='*.cs' 'catch\s*\(Exception\s+\w+\)\s*\{[^{}]*throw\s+new\s' src` prints nothing; `grep -rnP --include='*.cs' 'catch\s*\(Exception\b(?!.*\bwhen\b)' src` hits are each reviewed as a documented boundary; test: cancel a fake long-running `ocx` and assert `OperationCanceledException`, then a 200 ms timeout and assert `OcxTimeoutException`.
13. **R-EXC-13 Catch-all only at three sites, never swallowing.** `catch (Exception)` is allowed only (a) in the process/decode seam with the cancellation filter and a wrap, (b) in best-effort cleanup with `[SuppressMessage("Design","CA1031:...", Justification="...")]`, (c) with `throw;`. *Why:* FDG; filter loophole in CA1031. *Verify:* `dotnet_diagnostic.CA1031.severity = error` in `.editorconfig`; and `grep -rnPzo --include='*.cs' 'catch\s*(\(Exception[^)]*\))?\s*(when\s*\([^)]*\))?\s*\{\s*(return[^;]*;|\})' src | tr '\0' '\n'` prints nothing except lines whose catch carries a `SuppressMessage` Justification.
14. **R-EXC-14 Rethrow with `throw;`.** *Why:* `throw ex;` resets the stack. *Verify:* `dotnet_diagnostic.CA2200.severity = error`; `grep -rnE --include='*.cs' 'throw\s+(ex|e|exc|exception|err)\s*;' src` prints nothing.
15. **R-EXC-15 Never throw general or reserved types; never `ApplicationException`.** *Why:* CA2201, FDG. *Verify:* `dotnet_diagnostic.CA2201.severity = error`; `grep -rnE --include='*.cs' 'throw new (Exception|SystemException|ApplicationException|NullReferenceException|IndexOutOfRangeException)\(' src` prints nothing; `grep -rn --include='*.cs' 'ApplicationException' src` prints nothing.
16. **R-EXC-16 Public, suffixed, wrapped.** Exceptions are `public` (internal ones derive from `OcxException`), names end in `Exception`, and every wrap passes the original as `InnerException`. *Why:* CA1064, CA1710; callers need the root cause. *Verify:* `.editorconfig` lines `dotnet_diagnostic.CA1064.severity = error` and `...CA1710.severity = error`; `grep -rnP --include='*.cs' 'throw new \w+Exception\([^)]*\.Message[^)]*\)' src` prints nothing (message-only wrap drops the cause).
17. **R-EXC-17 CA1032 handled by design, not by a public blank constructor.** Roots have protected standard constructors; sealed leaves keep `internal` data constructors and a `[SuppressMessage("Design","CA1032:Implement standard exception constructors", Justification=...)]`; no file-wide `#pragma warning disable CA1032`. *Why:* a public `()` constructor permits a category-less failure. *Verify:* `grep -rn 'pragma warning disable CA1032' src` prints nothing; `grep -rnE --include='*Exception.cs' 'public Ocx\w+Exception\(\)' src` prints nothing for leaves.
18. **R-EXC-18 Secrets stay out of `Message`, `Data` and `ToString()`.** `Message` is a fixed template with redacted argv; stderr/stdout/documents live on bounded, redacted, opt-in properties; no environment snapshot. *Why:* four exemplars leak args/streams into messages (section 12). *Verify:* canary test (a fake `ocx` receiving `--token ghp_CANARY` in argv, `OCX_AUTH_*=ghp_CANARY` in env, echoing it on stderr) asserts `!ex.Message.Contains("ghp_CANARY") && !ex.ToString().Contains("ghp_CANARY") && ex.Data.Count == 0` (watched V9); `grep -rnE --include='*Exception*.cs' 'string\.Join\(.*(argv|args|Arguments)' src` hits must go through `Redact(`; `grep -rn --include='*.cs' 'GetEnvironmentVariables\|psi.Environment' src/*Exception*` prints nothing.
19. **R-EXC-19 Only `TempFail` is transient.** `IsTransient` is `Category == TempFail`; `Unavailable`, `PolicyBlocked`, `Unsupported` are never retried by the SDK. *Why:* ocx contract ("loop on 75, stop on 69"). *Verify:* unit test over all categories; `grep -rn 'IsTransient' src --include='*.cs'` shows a single definition.
20. **R-EXC-20 Do not hide or throw from exception members.** No `new` redeclaration of `InnerException`/`Message`-getters that throw; no throwing `ToString()`. *Why:* Anthropic's throwing `InnerException` getter breaks log walkers. *Verify:* `grep -rnE --include='*.cs' 'new\s+\w+\s+InnerException' src` prints nothing; CA1065 at `error`.
21. **R-EXC-21 Analyzer set is explicit.** `.editorconfig` sets CA1031, CA1032, CA1064, CA2200, CA2201, CA1710 to `error` (they are off or warning-only in default mode); build uses `<AnalysisLevel>10.0-all</AnalysisLevel>` or equivalent. *Why:* default mode only reports CA2200 (verified). *Verify:* `grep -cE 'dotnet_diagnostic\.(CA1031|CA1032|CA1064|CA2200|CA2201|CA1710)\.severity = error' .editorconfig` prints 6; `dotnet build -warnaserror` on the repo is green.
22. **R-EXC-22 Exit numbers are `int`; never narrow.** Store/compare `int`; never `(byte)` the exit code; use `Enum.IsDefined` only for naming. *Why:* wrap-around (`300 -> 44`), signal codes. *Verify:* `grep -rnE --include='*.cs' '\(byte\)\s*\w*([eE]xit|code)' src` prints nothing.
23. **R-EXC-23 Usage errors are BCL argument exceptions, thrown synchronously.** Validate arguments before the first `await`, using `ArgumentNullException.ThrowIfNull` / `ArgumentException.ThrowIfNullOrEmpty`. *Why:* usage != ocx failure; async methods otherwise fault the task. *Verify:* CA1062 at `warning` or higher plus `grep -rnE --include='*.cs' 'new Argument(Null)?Exception\(' src` hits reviewed; CA1510-CA1513 enabled so the throw-helper forms are preferred.

## AI-agent angle

| # | What an LLM characteristically gets wrong | Smallest mechanical check |
|---|---|---|
| 1 | Writes `[Serializable]` + `protected X(SerializationInfo info, StreamingContext context)` + `GetObjectData` on a new exception (older training data, and the MS CA1032/creating-exceptions pages still show it) | `grep -rnE --include='*.cs' -e 'SerializationInfo' -e '\[Serializable\]' src` + `SYSLIB0051` as error (V2, V5) |
| 2 | Ports Python's 26 classes: `OcxAuthException`, `OcxNotFoundException`, ... one per exit code, unsealed | R-EXC-02 count grep; `grep -rnE 'class\s+Ocx\w*(Auth|NotFound|Usage|Config)\w*Exception' src` |
| 3 | `record OcxException(...) : Exception(...)` because "records are the modern way" (CS8864) | build fails; R-EXC-05 grep |
| 4 | Leaves `JsonSerializer.Deserialize<T>(...)!` and lets `JsonException` out; or `catch (Exception) { return null; }` | R-EXC-11 greps; fake-ocx tests (V1) |
| 5 | `catch (Exception e) { throw new SdkException(e); }` around async code, converting cancellation to a failure (compiles, CA1031-clean) | R8 multiline grep (V8) |
| 6 | "Fixes" CA1031 by adding `when (ex is not OperationCanceledException)` to a body that still swallows (analyzer goes silent) | R10 grep (V3b) |
| 7 | Satisfies CA1032 by adding a public parameterless constructor to a leaf, creating category-less instances; or blanket `#pragma warning disable CA1032` | R-EXC-17 greps |
| 8 | Maps `error.kind` to the exception type (81 and 77 collapse), or `Enum.Parse`/casts the exit code, or matches `stderr.Contains("not found")` | R-EXC-06 greps |
| 9 | Treats every non-zero exit of `exec` as an ocx failure (S2: child `80` becomes "auth error") | child-exit test (V6) |
| 10 | Hard-codes one exit table (often from `exit_code.rs` on whatever branch it saw) with 18 or 13 rows and 82 = one meaning | handshake test with two fake binaries (V6); conformance test R-EXC-07 |
| 11 | Puts argv, env or the stderr tail in `Message` ("helpful diagnostics"), or stashes env in `Exception.Data` | canary test (V9); R-EXC-18 greps |
| 12 | Uses `TimeoutException`/`TaskCanceledException` interchangeably and tries to tell a timeout from a cancel by exception type | `when (!ct.IsCancellationRequested && timeoutCts.IsCancellationRequested)` test (V7) |
| 13 | `throw ex;` in a catch, or `throw new Exception("...")`, or `throw new ApplicationException` (Framework-era advice) | CA2200/CA2201 at `error`; R-EXC-14/15 greps |
| 14 | Adds a `bool throwOnError` parameter instead of two methods (copying CliWrap's `WithValidation`) | R-EXC-10 grep |
| 15 | Trusts the docs claim that ocx exit codes are "stable across releases" and ignores the 82 reuse; or assumes `schema_version` alone selects the table | handshake on `contract` presence (V6); `Contested` below |
| 16 | Casts the process exit code to `byte` or assumes a SIGKILLed child exits `-9` (Python habit) | R-EXC-22 grep; g-misc measurements (137, 143, 44) |
| 17 | Declares `public new X InnerException` with a throwing getter, or an `Exception` property with `{ get; set; }` (Anthropic, Stripe patterns in the corpus) | R-EXC-20/R-EXC-05 greps |

## Contested / evolving

- **Per-category subclasses versus a category property.** Anthropic (generated, per HTTP status) and Octokit (hand-written, ~21) go the Python way; Azure.Core, Npgsql, Stripe and every process wrapper (CliWrap, simple-exec, Medallion) use one type plus data. As of 2026-10 the single-type-plus-property form is the Microsoft/Azure guidance ("Don't introduce new exception types unless there's a programmatic scenario") and the safer choice for an unstable table; the trend in new SDKs generated from specs is per-status subclasses. Revisit once ocx cuts a contract baseline and the table stops moving.
- **Exit-code stability.** Docs: "stable across releases"; ADR: 82 reused once pre-baseline; #604 may roll `schema_version` back to 1 in place (`ocx-cli-contract.md:28`). Until `task contract:rotate` cuts a baseline, treat the table as a moving target: handshake on `contract` presence, conformance test, no per-code types. After the baseline the same machinery becomes cheap insurance.
- **Whether to support pre-contract ocx (<= 0.6.5).** Python supports 0.6.2; a handshake floor at the first contract release is simpler and removes the 82 ambiguity, at the cost of excluding the only released ocx. Owner decision.
- **Sealed leaves in a library.** Corpus majority is unsealed (23% of public exception classes sealed in this recount, 39% overall in the audit's count); Microsoft guidance for sealing is about members/performance, not exceptions specifically. Sealing is the cautious default because it is the only direction that can be relaxed later.
- **CA1032 on SDK-constructed exceptions.** Microsoft: suppress only for different access levels; Octokit, simple-exec, Polly (tests) suppress or disable for domain exceptions. Trend: keep the rule on at roots, justify-and-suppress on data-carrying leaves.
- **`Exception.Data`.** Still used by Azure.Core and Npgsql for telemetry, alongside typed properties; Microsoft documents it as insecure and untyped. Trend: typed properties first; `Data` only as additive telemetry and never for secrets.
- **Serialization constructors.** Obsolete since .NET 8 (SYSLIB0051), still present in libraries that multi-target netstandard2.0/net462 (Azure.Core, Octokit, Npgsql, Polly's `#if !NETCOREAPP`). A net8+-only SDK drops them entirely; the MS docs' own samples lag.
- **Result types versus exceptions.** C# 15 `union` compiles on 11.0 RC1 and may eventually make `OcxOutcome = Ok | Failed` idiomatic; FDG-style "throw for failures" remains the mainstream rule for .NET libraries as of 2026-10. Not adoptable on a net8 floor.
- **Signal-versus-exit-137 distinction.** Only .NET 11 (`ProcessExitStatus.Signal`, RC1) can tell them apart; GA is Nov 2026. Until then both map to `Unknown` with the raw int.
- **CA1031 filter semantics.** The analyzer's acceptance of `when (ex is not X)` as "specific" is observed behaviour (SDK 10.0.401), not documented; it may be tightened. Keep the R10 grep regardless.
- **Windows exit codes** (NTSTATUS-style values from killed processes) are not measured here; the process topic owns them.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| [CA1032](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1032) | Rule page: standard exception constructors | updated 2026-04-02; ".NET 10: not enabled by default" | Exact constructor set, the access-level suppression clause; its sample is stale (`[Serializable]`) |
| [CA1031](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1031) | Rule page: do not catch general exceptions | updated 2026-04-02 | "Do not suppress"; `disallowed_symbol_names` option; rethrow-as-last-statement fix |
| [CA1064](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1064) | Rule page: exceptions should be public | updated 2026-04-02 | Fires only for non-public types deriving *directly* from Exception/SystemException/ApplicationException |
| [CA2201](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2201) | Rule page: reserved/general exception types | updated 2026-04-02 | Full reserved list and the "which built-in exception to throw" tables |
| [CA2229](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2229) | Rule page: serialization constructors | "removed in .NET 8 because it conflicts with SYSLIB0051" | Explains why an old ruleset's advice is now wrong |
| [SYSLIB0051](https://learn.microsoft.com/en-us/dotnet/fundamentals/syslib-diagnostics/syslib0051) | Obsoletion page for formatter serialization APIs | .NET 8 (2023-05; updated 2024-03) | The authoritative "remove `[Serializable]` and the constructor" guidance and the `#if NET8_0_OR_GREATER [Obsolete(DiagnosticId=...)]` compat form |
| [8.0 obsolete APIs with custom diagnostics](https://learn.microsoft.com/en-us/dotnet/core/compatibility/core-libraries/8.0/obsolete-apis-with-custom-diagnostics) | Breaking-change list | .NET 8 | Confirms warning-not-error default and the affected API families |
| [Best practices for exceptions](https://learn.microsoft.com/en-us/dotnet/standard/exceptions/best-practices-for-exceptions) | Microsoft guidance | ms.date 2025-10-22, updated 2026-03-30 | Three constructors, "more properties only when programmatic", OCE over TaskCanceledException, throw helpers, filters |
| [FDG: Exception throwing](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/exception-throwing) | Framework Design Guidelines (2nd ed. reprint) | 2008, page updated 2023-10; "may be out-of-date" banner | "DO NOT return error codes", no throw-or-not options, contract exceptions must not change between versions, 100/s throw-rate note |
| [FDG: Using standard exception types](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/using-standard-exception-types) | Framework Design Guidelines | 2008 reprint | DO NOT throw/catch `Exception`, no `ApplicationException`, reserved types |
| [Creating and throwing exceptions](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/exceptions/creating-and-throwing-exceptions) | C# fundamentals | ms.date 2023-10-31, updated 2026-03-30 | Sensitive data out of Message; override `ToString()` with new properties; its sample still shows `[Serializable]` |
| [Exception-handling statements](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/exception-handling-statements) | C# language reference | ms.date 2026-01-16 | `throw;` vs `throw e;`, `when` filters run before unwinding |
| [JsonException](https://learn.microsoft.com/en-us/dotnet/api/system.text.json.jsonexception) | API reference | updated 2026-05-27 (covers net-8..net-11) | Members `Path`/`LineNumber`/`BytePositionInLine`; serialization members Obsolete net8-net11 |
| [dotnet/runtime JsonException.cs](https://raw.githubusercontent.com/dotnet/runtime/main/src/libraries/System.Text.Json/src/System/Text/Json/JsonException.cs) | Real source | main, 2026 | The BCL's own `#if NET [Obsolete(DiagnosticId=...)] [EditorBrowsable(Never)]` handling |
| [Handle unmapped members](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/missing-members) | STJ docs | .NET 8, updated 2025-01 | `JsonUnmappedMemberHandling` throws `JsonException`; default is skip |
| [Exception.Data](https://learn.microsoft.com/en-us/dotnet/api/system.exception.data) | API reference | updated 2026-07-01 (net-10/net-11) | "Key/value pair security ... not secure"; key collisions |
| [Task.WaitAsync](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.task.waitasync) | API reference | .NET 6+ (TimeProvider overloads .NET 8+) | Timeout surfaces as `TimeoutException`, cancellation as `OperationCanceledException` |
| [CancellationTokenSource.CancelAfter](https://learn.microsoft.com/en-us/dotnet/api/system.threading.cancellationtokensource.cancelafter) | API reference | updated 2026-07-01 | Basis of the timeout-via-linked-CTS pattern |
| [HttpClient.Timeout](https://learn.microsoft.com/en-us/dotnet/api/system.net.http.httpclient.timeout) | API reference | net-10/net-11 | Read for contrast: BCL timeouts are per-instance and also flow through cancellation |
| [Azure SDK .NET guidelines](https://azure.github.io/azure-sdk/dotnet_introduction.html) | Library design guidelines | current (2026) | `dotnet-errors-response-failed`, "Don't introduce new exception types unless there's a programmatic scenario" |
| [Code analysis overview](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/overview) | SDK analyzers | updated 2026-05-28 | AnalysisMode values, default-enabled CA list for .NET 8/9/10 (CA2200 yes; CA1031/1032/1064/2201 no) |
| [dotnet/runtime ProcessWaitState.Unix.cs](https://raw.githubusercontent.com/dotnet/runtime/main/src/libraries/System.Diagnostics.Process/src/System/Diagnostics/ProcessWaitState.Unix.cs) | Real source | main, .NET 11 era | `ProcessExitStatus(exitCode, canceled, signal)` construction |
| `ocx@246863abc1d4:crates/ocx_exit/src/exit_code.rs` | ocx main: exit-code table, `RETIRED`, `#[non_exhaustive]` | 2026-10 (unreleased) | The 13-row source of truth |
| `ocx@26ad03a17b34:crates/ocx_exit/src/exit_code.rs` (v0.6.5) | ocx last release: 18-code table | 2026 (released) | Proves 82 changed meaning |
| `ocx@246863abc1d4:crates/ocx_exit/src/error_category.rs` | `ErrorCategory::from_exit_code` | 2026-10 | 77 and 81 both map to `permission_denied` |
| `ocx@246863abc1d4:crates/ocx_cli/src/error_document.rs` | Error document struct and `render_error_document` | 2026-10 | Exact fields; stdout; `ERRORS_SCHEMA_VERSION = 2` |
| `ocx@246863abc1d4:crates/ocx_schema/tests/golden/errors.json` | Published error schema golden | 2026-10 | `ExitCode`/`ErrorDetail` `x-ocx-enum` tables usable for a conformance test |
| `ocx@246863abc1d4:website/src/docs/reference/machine-interface.md` | Machine-interface reference | 2026-10 | Outcomes, open values, "never match on message", 75 vs 69, passthrough, contract versions |
| `ocx@246863abc1d4:.claude/artifacts/adr_exit_code_taxonomy.md` | ADR for the 18 -> 13 collapse | 2026-10-07 | The reuse of 82, retired numbers, v0.6.5 `schema_version: 1` fact |
| `csharp-audit/python-sdk-digest.md`, `ocx-cli-contract.md`, `exemplar-language-shape.md` (this repo) | Internal audits | 2026-10 | Python hierarchy (26 classes), smells S2/S3, corpus sealing/catch statistics |
| Exemplar sources: `Azure__azure-sdk-for-net@32c48fc3d524`, `npgsql__npgsql@9c47244547c2`, `octokit__octokit.net@7fa5b0fe4a18`, `anthropics__anthropic-sdk-csharp@ae16e5933f39`, `stripe__stripe-dotnet@dbdca6ba5efc`, `Tyrrrz__CliWrap@7dbc252fa773`, `adamralph__simple-exec@f80913246993`, `madelson__MedallionShell@e45f1f6ffd4c`, `pulumi__pulumi-dotnet@2a0dca84f09b`, `App-vNext__Polly@e4476096da5b`, `testcontainers__testcontainers-dotnet@04cbb73fcc58` | Real library code | 2025-2026 | The shape comparison, the counterexamples, the suppression practice |
