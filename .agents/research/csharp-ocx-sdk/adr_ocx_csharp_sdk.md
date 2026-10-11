# ADR: The ocx C# SDK, the Decisions the Published C# Rules Leave to the Reference Consumer

## Metadata

**Status:** Proposed
**Date:** 2026-10-11
**Deciders:** ocx-sh/ocx maintainers (this ADR is addressed to them). The owner answers the questions in Open Questions.
**Beads Issue:** N/A
**Related PRD:** N/A
**Tech Strategy Alignment:**
- [x] Same shape as the Python SDK: hand-written typed models over the CLI, no code generator, a fixed `--format json` argv, one exit table. The C# SDK adds an owned process engine and a pinned-digest download path.
**Domain Tags:** sdk | process | supply-chain | api
**Supersedes:** N/A
**Superseded By:** N/A
**Evidence:** the C# / .NET research corpus in `ocx-sh/grimoire-lore`, paths below relative to its research directory. Every measurement is dated 2026-10-11 on .NET SDK 10.0.401 (runtimes 10.0.12 and 8.0.31), Linux x64, unless a line names another build. Windows rows ran on SDK 10.0.102 (Windows 11 build 26200). ocx rows ran on the 0.6.5 release and on main at [3485207c1](https://github.com/ocx-sh/ocx/commit/3485207c1). macOS and arm64 rows are unverified: read only.

Contents: Context · Decision Drivers · Considered Options · Decision Outcome (ADR-D1 to ADR-D13) · Requests to ocx-sh/ocx · Consequences · Validation · Open Questions · Links · Changelog

## Context

The published rules `csharp-quality`, `dotnet-build` and the `dotnet-*` skills are language rules. They use `ocx`, `Ocx.Sdk` and `OCX_*` only as example names from the reference consumer. This ADR holds every ocx-only value those rules leave out: the exit table, the command layout, the package and telemetry names, the environment table, the handshake, the delivery model and seven retired rows. Six facts shape it.

1. **No released ocx carries the machine contract.** The contract is `schema_version` on every report root, the `contract` object in `ocx --format json version`, an error document on stdout for usage errors, and `cli.json`. It lives in one commit, [6daf9a164](https://github.com/ocx-sh/ocx/commit/6daf9a164) (PR [ocx-sh/ocx#580](https://github.com/ocx-sh/ocx/pull/580), 1059 files, merged 2026-10-08). Main is 15 commits past `v0.6.5` and no tag contains it (read 2026-10-11). The 0.6.5 release prints a bare map for `index list`, prints 0 bytes on stdout for `--bogus` (exit 64) and has no `contract` key (`csharp-audit/ocx-cli-contract.md` §0, measured).
2. **Exit number 82 changed meaning between releases.** 0.6.5 has 18 codes and main has 13. A table keyed by the version string cannot tell them apart, because main still reports `0.6.5`.
3. **Passthrough shares the exit channel.** `ocx exec` returns the child's code unchanged. A child's 64 equals `UsageError`, and ocx's own launch failures (65, 77) arrive in the same field.
4. **The download has no independent authority.** `setup.ocx.sh/dist.json` (schema 1, 280 rows over 35 versions, 8 targets) carries the URL and the digest from one origin, with no signature.
5. **C# is not an `ocx_sdkgen` language.** `Lang` has one variant, `Rust` (read 2026-10-11). A C# SDK is hand-written.
6. **The reference consumer in Python is stale.** `ocx-sdk-python` pins `TESTED_OCX_VERSION = "0.6.2"`, models 17 exit codes with 82 as `DIRTY_RC_BLOCK` and has 26 exception classes. The C# SDK copies its shape and none of its numbers.

## Decision Drivers

- An agent loop is the typical caller: failures must be typed, secrets must never reach `Message`, and no option may turn verification off.
- The contract is unfrozen. [ocx-sh/ocx#604](https://github.com/ocx-sh/ocx/pull/604) (merged 2026-10-10 as 3485207c1) rewrote the error and report schemas in place, so every SDK decision must survive a contract bump.
- Public API is forever: a type cannot be retired, a property value can. Prefer one root, five leaves and open sets.
- .NET 8 and 9 reach end of support on 2026-11-10. The first SDK release lands near that date.
- Nothing in this ADR may require a macOS or arm64 measurement that has not been run.

## Considered Options

| # | Option | Verdict | Reason |
|---|---|---|---|
| 1 | Hand-written SDK, owned engine, contract-bearing floor, locate plus pinned opt-in download | Chosen | Fits the drivers. One table, one handshake, no runtime dependency except `System.Text.Json` on net8.0 |
| 2 | Option 1 plus a degraded 0.6.5 mode: a second frozen table (82 = `DirtyRcBlock`), no handshake | Rejected | Two tables, and 0.6.5 prints no error document for usage errors, so `ErrorKind` is null for a released binary |
| 3 | Wait for an `ocx_sdkgen` C# backend | Rejected | Not scheduled. The IR (`ir.rs`, 1155 lines at 3485207c1) is reusable later: the diff test gates either path |
| 4 | Wrap `CliWrap` | Rejected | Ranks first in the wrapper audit (12 of 13) but fails four rules: string `Arguments`, cwd probe and `.cmd` resolution, an uncapped drain with no held-pipe bound, `Signaler.exe` extracted to `%TEMP%` |

The owned engine is 464 lines. It passed 78 checks on Linux and 44 on Windows against main (measured 2026-10-11).

## Decision Outcome

Chosen: Option 1. Each decision names the shipped rule IDs it instantiates. Rows retired from the published files are decided here: CS-ASYNC-24, CS-ASYNC-28, CS-BIN-19, CS-BIN-23, CS-BIN-27, CS-BIN-28 and CS-OBS-25 (ADR-D1 to ADR-D13 mark each).

### ADR-D1. Contract baseline, handshake and floor

- The SDK floor is the first ocx release carrying `contract`. Today no release does, so the SDK refuses every released binary, 0.6.5 included, with `OcxContractException` (`Part` "binary", `Found` "0.6.5"). Request R1 unblocks it.
- `OcxClient.CreateAsync` runs `ocx --format json version` once per binary. The fields (read at 3485207c1, `crates/ocx_cli/src/api/data/version.rs`):

| Field | Type | Compared with |
|---|---|---|
| `contract` | object | absent means unsupported binary, checked on the raw document before binding |
| `contract.errors` | integer, the error document's `schema_version` | the compiled value, equality |
| `contract.commands["<verb path>"]` | integer per command, path space-separated | the compiled value for each command the call uses, equality |
| `contract.reports["<Root>"]` | integer per output root | the compiled value for each root of the call, equality |
| `schema_version` of the `version` document | integer | 1 |

- Equality only, accept every addition (a new command, root or key). Never compare the `version` string. The handshake has seven test rows. The captured 0.6.5 `version` document is a permanent `OcxContractException` case.
- ocx's own generated runtime sets `MINIMUM_OCX = "0.6.4"` (`rust.rs:27`), and its own handshake refuses 0.6.4 and 0.6.5. The SDK does not copy a minimum nobody measured.
- `TestedOcxVersion` is one `public const string`. It drives the bootstrap default (ADR-D7), is mirrored in every `setup-ocx` workflow step and is guarded by a drift test. It holds the placeholder `0.6.5` until R1 lands, then the first contract-bearing release.
- Instantiates: CS-JSON-10, CS-ERR-01, CS-PROC-20, CS-BIN-06, CS-TEST-07, CS-API-14.

### ADR-D2. The exit-code table

Main, 13 rows, one hand-written `ExitTable.cs` (read 2026-10-11, `crates/ocx_exit/src/exit_code.rs`, golden `errors.json`):

| Code | Name | `error.kind` | Meaning |
|---|---|---|---|
| 0 | Success | internal | succeeded |
| 1 | Failure | internal | no specific code applies |
| 64 | UsageError | usage_error | bad flag, arity or syntax. clap's own exit 2 is remapped |
| 65 | DataError | data_error | malformed identifier, digest or manifest; verification fails |
| 69 | Unavailable | unavailable | a required service or resource is unavailable (for example the registry is unreachable); rerunning will not change the outcome |
| 74 | IoError | io_error | filesystem read or write |
| 75 | TempFail | temp_fail | transient; the only code where an automated retry is safe |
| 77 | PermissionDenied | permission_denied | EPERM, forge refusal |
| 78 | ConfigError | config_error | bad config or bad `OCX_*` value |
| 79 | NotFound | not_found | package, tag or file absent |
| 80 | AuthError | auth_error | 401, 403 or missing credentials |
| 81 | PolicyBlocked | permission_denied | `--offline`, `--frozen` or a dirty shell block was refused |
| 82 | Unsupported | unsupported | registry, forge or build lacks a capability; never retry |

- **82 was reused.** 0.6.5 has 18 codes: the 13 above except that 82 is `DirtyRcBlock`, plus `TransparencyLogUnavailable` 83, `ReferrersUnsupported` 84, `UnsupportedKeyBackend` 85, `ForgeCapabilityUnavailable` 86 and `RegistryDeleteUnsupported` 87. Main moves the dirty-profile case to 81 and folds 84 to 87 into 82. 83 to 87 are retired for good (`retired_numbers_are_never_reused`). The reuse is justified upstream as "before any contract baseline exists".
- **One table suffices** because ADR-D1 floors the SDK at `contract`, where 82 means one thing. The handshake selects the table, never the version string.
- The table is open: an unknown number is a valid `OcxExitCode` with `IsKnown == false` and its raw `int`. Exit codes stay `int` end to end (a child `exit 300` reads 300 on Windows and 44 on Linux). The behaviour table's unknown-code row uses 200, which ocx never assigns.
- A conformance test diffs the table against the vendored `errors.json` `$defs.ExitCode["x-ocx-enum"]`. All 49 live error documents matched `kind == category(exit)` (measured on main).
- Branch on `exit_code`, then `error.kind` (11 values), then `error.detail` (516 slugs at 3485207c1, kept as strings). Never on `message`. 77 and 81 share the kind `permission_denied`, so the kind never picks the code.
- Retry only on 75 with a `temp_fail` error document of the same `exit_code`, for non-mutating ocx-owned calls. Never on 69, 81 or 82. `ocx self update --check --offline` exits 75 with a successful `skipped` report, so the number alone is not enough.
- A change to any pinned exit outcome is a major at 1.0 or later, even when the API only grew.
- Instantiates: CS-ERR-02, CS-ERR-10, CS-ERR-13, CS-PROC-20, CS-PROC-22, CS-JSON-20, CS-API-14.

### ADR-D3. Command layout and argv prefix

- Every call, passthrough included, starts `--format json --color never --log-level warn <verb>`. All 13 root arguments have `"global": false`, so these flags go before the verb: `ocx version --format json` exits 64. `--format` and `--color` have no environment twin. The SDK never sends `--quiet`.
- A project handle adds `--project <absolute ocx.toml>`. `exec` gets `--` before the child argv. An operand that starts with `-` is refused.
- `cli.json` at 3485207c1 (identical at 246863abc1d4 except the detail count): 81 nodes, 70 leaves and 11 groups with the root among them, 4 hidden (`launcher`, `package describe`, `package info`, `run`). Visible top level: `env add clean config direnv index about init lock login logout update upgrade package patch pull remove exec shell self status inspect version`.
- Output modes over the 70 leaves: report 65, report_then_fail 17, empty 10, passthrough 7, shell_stream 5, raw_document 1. The 17 report_then_fail modes sit on 14 commands and print a complete report with exit 1, 74, 79, 81 or 82.
- The exit code is authoritative. On any non-zero exit one classifier sorts stdout by shape: error document, report, or empty. It never decides by command name, because `self update` is labelled `report` yet exits 75 with a report.
- Binary: `ocx` or `ocx.exe`, exact name, no PATHEXT. Data root: `$OCX_HOME`, else `~/.ocx` on every OS (`%USERPROFILE%` on Windows).
- Instantiates: CS-PROC-03, CS-PROC-07, CS-PROC-19, CS-OBS-26, CS-XP-04, CS-JSON-21, CS-ERR-09.

### ADR-D4. Passthrough exits and the `IsOcxError` heuristic

- Passthrough is a property of the invocation's output mode: `exec`, `run`, `package exec`, `launcher exec`, `launcher shim`, and the non-script modes of `package test` and `patch test`. The SDK returns `ChildExit { int ExitCode; bool IsOcxError }`. It never maps, throws or retries the code.
- `IsOcxError` is true when stdout is at most 64 KiB, starts with `{` and is an ocx error document whose `exit_code` equals the exit. It needs `--format json` on the argv. It is a heuristic: a tool that prints a matching document forges it. The XML doc says so.
- Why: `exec -- missing` exits 65 with a 1517-byte document, `exec -- ./mode-644` exits 77 with a document, and a tool's own `exit 77` exits 77 with empty stdout. An SDK kill reads 137 or 143 on POSIX and -1 on Windows, and surfaces as cancellation or timeout.
- Request R7 replaces the heuristic with a marker a tool cannot forge.
- Instantiates: CS-PROC-21, CS-ERR-03, CS-ERR-05.

### ADR-D5. Package identity, telemetry names and exception types

| Item | Value |
|---|---|
| NuGet package ID and root namespace | `Ocx.Sdk`. The owner applies for the nuget.org ID prefix once, after the first publish |
| Publishing | Trusted Publishing from a `v*.*.*` tag; policy fields owner, repo, `release.yml`, environment `nuget.org`; MinVer with `v` tags; no author signing; no strong naming while every TFM is net8.0+ |
| Diagnostic prefix | `OCX`. `[Experimental("OCXnnnn")]` starts at SDK 1.0, one ID per ocx contract part not yet frozen |
| Telemetry | `public static class OcxTelemetry` with `SourceName = "Ocx.Sdk"` and `MeterName = "Ocx.Sdk"`. The values are `const`, so they are permanent once shipped |
| Spans and metric | one `ActivityKind.Client` span per public call, named `ocx {command}`; tags `process.executable.name` (the constant `ocx`), `process.exit.code`, `error.type`, `ocx.command`, `ocx.attempts`; histogram `ocx.client.operation.duration` with at most about 420 series |
| Exceptions | root `OcxException`; five sealed leaves `OcxCommandException`, `OcxDecodeException`, `OcxContractException`, `OcxTimeoutException`, `OcxLaunchException`. No leaf per exit code (Python has 26). No sixth acquisition leaf (`OcxAcquireException`) until the download path ships |

- Instantiates (CS-OBS-25 is retired into this row): CS-OBS-17, CS-OBS-20, CS-OBS-22, CS-API-11, CS-API-13, CS-ERR-01, CS-PKG-06, CS-PKG-08, CS-PKG-11, CS-PKG-12, CS-PKG-13.

### ADR-D6. The `OCX_*` environment table

| Variable | Read by | SDK policy |
|---|---|---|
| `OCX_SDK_EXE` | the SDK | explicit override, resolver tier 2, caller intent, never trust-checked |
| `OCX_BINARY_PIN` | ocx (launchers re-enter through it) | read as resolver tier 3; set to the resolved path on every child; an empty value counts as unset |
| `OCX_HOME` | ocx | data root; read from the caller's environment snapshot; hermetic tests set a temp directory |
| `OCX_AUTH_<SLUG>_{TYPE,USER,TOKEN}` | ocx | credentials, one of the 10 secret env entries in `cli.json` (6 `OCX_`-prefixed, 4 foreign CI tokens: `ACTIONS_ID_TOKEN_REQUEST_TOKEN`, `CI_JOB_TOKEN`, `SIGSTORE_ID_TOKEN`, `CIRCLE_OIDC_TOKEN_V2`); only the `TOKEN` name is secret; never in argv or `Message`; redaction covers all 10 names |
| `OCX_NO_VERIFY` | ocx | disables signature policy; scrubbed from the child; the library never sets it; an invalid value exits 78 |
| `OCX_LOG` | ocx 0.6.5 | the 0.6.5 log variable, retired in 0.7.0; the SDK never sets it |
| `OCX_LOG_LEVEL` | ocx main | 0.6.5 ignores it; main reads `OCX_LOG_CONSOLE`, `OCX_LOG_LEVEL`, then `RUST_LOG`; the SDK never sets it and sends `--log-level` (R6) |
| `OCX_OFFLINE`, `OCX_FROZEN`, `OCX_NO_CONSENT` | ocx | operator intent, not scrubbed; an invalid value exits 78 on every command; `OCX_OFFLINE=1` turns networked calls into 81 |
| `OCX_SDK_CONTRACT` | the SDK tests | `1` arms the contract tier; an armed run with a missing or mismatched ocx throws |
| `OCX_TEST_VERSIONS` | the SDK tests | the nightly lane sets `latest` |

- The child environment inherits, then removes these seven keys, compared `OrdinalIgnoreCase`: `OCX_PROJECT OCX_GLOBAL OCX_QUIET OCX_NO_VERIFY OCX_NO_HOOK OCX_NO_COMPLETION CLICOLOR_FORCE` (main renamed `OCX_NO_COMPLETIONS` to `OCX_NO_COMPLETION`; 0.6.5 reads the old name, which is below the contract floor). It then sets `OCX_NO_UPDATE_CHECK=1` and `OCX_BINARY_PIN`. Observed leaks (main, measured): `OCX_QUIET=1` gave exit 0 with 0 bytes of JSON, `CLICOLOR_FORCE=1` put ANSI colour inside the JSON on stdout, and a leaked `OCX_PROJECT`, `OCX_GLOBAL` or `OCX_NO_VERIFY` changed the exit to 79, 74 or 78.
- Resolver order: explicit argument, `OCX_SDK_EXE`, `OCX_BINARY_PIN`, rooted PATH entries (exact name, trust check), `$OCX_HOME/symlinks/ocx.sh/ocx/cli/current/content/bin/ocx[.exe]`, then the opt-in download. A tier-4 or tier-5 hit must pass a trust check on its directory and file (Windows ACL allow-list, POSIX mode bits).
- Instantiates: CS-PROC-03, CS-PROC-06, CS-PROC-25, CS-BIN-01, CS-BIN-02, CS-BIN-24, CS-XP-04, CS-OBS-26, CS-OBS-29, CS-TEST-07, CS-TEST-31.

### ADR-D7. Delivery model and `ocx-pins.json`

| Model | Cost (measured 2026-10-11) | Failure | Decision |
|---|---|---|---|
| a. locate only (PATH or an ocx-managed install) | 0 bytes, no trust surface | a fresh runner has no ocx | default |
| b. bundle per-RID binaries in NuGet | raw binaries 152,638,224 bytes for 6 RIDs; all-8 package 91,600,345 bytes; nuget.org cap about 250 MB | exec bit lost, publish flattens the app root, every ocx release is an SDK release | not chosen; CS-BIN-19 and CS-BIN-27 are retired here |
| c. download from `dist.json`, sha256-verified | 86 KB manifest plus an archive of about 11 MB once per version and target | needs network once; the digest has one origin | opt-in, default with a |

- Default: a plus c. The nupkg holds no ocx binary and stays under 5 MiB (managed-only: 3,269 bytes).
- `OcxLocator.Discover` is synchronous and does no I/O. `OcxBootstrap.EnsureAsync` installs `TestedOcxVersion` unless the caller names a version. Any other version needs a caller-supplied digest through an option named `TrustManifestOrigin`, never a default.
- `ocx-pins.json` holds `version` and `pins`, one SHA-256 per target, exactly 8. Regenerate it only when three sources agree for all 8 triples: the `dist.json` row, the release asset `sha256.sum`, and the `digest` field of `gh release view v<ver> --json assets`.
- The 8 targets map one to one onto RIDs: `aarch64` and `x86_64` for apple-darwin (osx-arm64, osx-x64), pc-windows-msvc (win-arm64, win-x64), unknown-linux-gnu and unknown-linux-musl (linux-arm64, linux-x64, linux-musl-arm64, linux-musl-x64). There is no win-x86, no 32-bit Linux and no FreeBSD, so a 32-bit Windows process cannot be served.
- Linux defaults to the static musl build for both architectures with no libc probe. Windows ARM64 uses the native `aarch64` build.
- Model b, if the owner ever chooses it (CS-BIN-19, retired): one explicit `<None Include=... PackagePath="runtimes/<rid>/native/">` item per file; six RID directories (`linux-x64`, `linux-arm64`, `osx-x64`, `osx-arm64`, `win-x64`, `win-arm64`) with the static musl binary under both `linux-*`; the resolver probes `AppContext.BaseDirectory` first, then `runtimes/<rid>/native/`; `File.SetUnixFileMode` re-applies the exec bit. CS-BIN-27 (retired) checks every staged `runtimes/*/native/ocx*` against `ocx-pins.json` before `dotnet pack`.
- Instantiates: CS-BIN-01, CS-BIN-02, CS-BIN-04 to CS-BIN-09, CS-BIN-20 to CS-BIN-22, CS-PKG-15, CS-XP-10.

### ADR-D8. No signature verification at v1

- The v1 trust root is the compiled-in digest pin. NuGet `signatureValidationMode` stays `accept`. Dependabot is the only updater. No SBOM ships in the nupkg.
- **CS-BIN-23 is retired here.** The core assembly carries no Ed25519, minisign, NaCl, BouncyCastle, NSec, Sodium, Chaos.NaCl or `Sigstore` package. No public Ed25519 type exists on net8.0, net10.0 or 11.0 RC1 (`CS0234`), and `Sigstore` 1.1.1 is net10.0-only, pulls BouncyCastle and TUF, and accepted a tampered file against a genuine DSSE bundle unless the caller bound the subject itself. The ban follows the upgrade path: once the SDK is net10.0-only, an optional Sigstore add-on package can exist outside the core assembly.
- **CS-BIN-28 is retired here and dormant.** It activates when ocx publishes a P-256 signature over `dist.json` (R5): `ECDsa` P-256 with SHA-256 and `DSASignatureFormat.Rfc3279DerSequence`; the SPKI is a `static readonly` constant, never taken from the artifact's origin; assert the curve OID `1.2.840.10045.3.1.7`; catch only `CryptographicException`; at most two SPKIs (`current`, `next`) selected by key ID `hex(SHA256(SPKI))[..16]`; an unknown key ID fails closed; no network I/O. The five `ECDsa` ban lines stay and cite CS-SEC-08.
- The README and the install entry point's XML doc say what the pin proves, what it does not prove (a compromised ocx release pipeline) and that a located binary is not verified. They never say "signature verified".
- Instantiates: CS-BIN-20 to CS-BIN-22, CS-BIN-24 to CS-BIN-26, CS-SEC-08, CS-SEC-14, CS-SEC-15.

### ADR-D9. Bootstrap coalescing and the v1 streaming surface

- **CS-ASYNC-24 is retired here.** v1 ships no in-flight coalescing of `OcxBootstrap.EnsureAsync`. Correctness comes from temp file plus move: `File.Move(tmp, final, overwrite: false)`, and the loser re-hashes the winner through the sidecar and deletes its temp. No named `Mutex` and no `FileShare.None` sentinel. Measured: 64 first calls download 64 archives and 63 are discarded, all correct; write-in-place gave 15 of 16 callers a partial binary, temp plus move gave 0. If coalescing is added, the shape is `lock (_gate) { _inflight ??= RunAsync(); return _inflight.WaitAsync(cancellationToken); }` with `RunAsync` starting `await Task.CompletedTask.ConfigureAwait(ConfigureAwaitOptions.ForceYielding)`. The Windows loser path against a running `ocx.exe` was not run.
- **CS-ASYNC-28 is retired here.** The only streaming member is `OcxClientOptions.OnStderrLine` (`Action<string>?`). The public API has no `IAsyncEnumerable<T>`, `IProgress<T>`, `event` or `Func<string, Task>`, and `Progress<T>` is banned in `src`. ocx has no progress contract: progress draws only on a terminal, and a piped `--log-level debug index list` wrote 7 stderr lines (723 B). Measured: with 20,000 lines `Progress<T>` had delivered 1,066 callbacks when the Task completed, 7,271 ran out of order and up to 43 ran concurrently; a throwing handler killed the process (exit 134). An iterator added later is additive.
- `OnStderrLine` is split on `\n`, redacted before the call, sequential per call, never invoked after the call returns, and a throwing callback is captured and rethrown after ocx exits without stalling the drain.
- Instantiates: CS-ASYNC-15, CS-ASYNC-29, CS-ASYNC-30, CS-ASYNC-32, CS-OBS-27, CS-OBS-28, CS-BIN-12.

### ADR-D10. Test layout

- Four tiers: `tests/Ocx.Sdk.UnitTests` (pure logic, never spawns), `tests/Ocx.Sdk.FakeCliTests` (the production engine against a dummy), `tests/Ocx.Sdk.ContractTests` (a pinned real ocx) and `tests/Ocx.Fake` (the dummy console app, not a test project). From the second release `tests/Ocx.Sdk.FakeCliTests.Baseline` builds the same behaviour files against the last published nupkg.
- Behaviour table: `tests/Ocx.Sdk.FakeCliTests/behavior-table.json`, `{"schema":1,"rows":[...]}`, at least 19 rows. The 19 mandatory ids are `cmd-usage`, `cmd-temp-fail`, `cmd-unknown-code`, `cmd-garbage-error-document`, `report-unknown-member-tolerated`, `report-unknown-status-fails-closed`, `decode-truncated-json`, `decode-unknown-enum-value`, `decode-unknown-union-tag`, `decode-missing-required`, `passthrough-child-exit-is-data`, `timeout-is-sdk-type`, `caller-cancel-is-oce`, `launch-missing-binary`, `launch-not-executable`, `contract-version-mismatch`, `report-then-fail-partial-document`, `secret-canary-not-in-message` and `retry-only-on-75-nonmutating`. Rows assert catch semantics, never message text or exact types.
- ContractTests links the same table and runs the rows that carry a `contract` block when `OCX_SDK_CONTRACT=1`. While `TestedOcxVersion` predates `contract`, the block omits `ErrorKind`. One `OcxBaselineVersion` drives both the Baseline twin and `PackageValidationBaselineVersion`.
- Coverage is a report from Linux x64 and Windows x64, merged in the aggregator job, with no threshold and no coverage service. No snapshot library. A benchmark is never merged; a performance claim carries its table in the PR.
- CI: five native PR legs (`ubuntu-24.04`, `ubuntu-24.04-arm`, `windows-2025`, `windows-11-arm`, `macos-26`). `ci-ok` is the only required check.
- Instantiates: CS-TEST-01, CS-TEST-06, CS-TEST-07, CS-TEST-27 to CS-TEST-31, CS-ERR-12 to CS-ERR-17, CS-CI-01, CS-CI-03.

### ADR-D11. Process engine ownership and limits

- The SDK owns its engine and depends on no process library. Limits: 16 MiB per captured stream (past the cap the pump discards and keeps draining; stdout overflow fails closed); a 64 KiB stdout head on the passthrough sink path; a 5 s drain bound after exit that returns `DrainTimedOut` instead of throwing; kill grace 0 with `Kill(entireProcessTree: true)` and a bounded reap; no Windows job object and no Windows interrupt in v1.
- Real ocx confirms it. On Linux `ocx exec` execs into the tool, so no ocx process stays in the tree. On Windows `ocx.exe` spawns the tool and waits with no job object, and `Kill(true)` reaped `ocx.exe`, `cmd.exe` and the tool. A SIGTERM-first stop orphaned a grandchild and took 5975 ms.
- `LoginAsync` promises no credential check: `ocx login` exits 0 for a wrong password against a Basic-realm registry (R2), and only a later authenticated call returns 80. The result type has no `Verified` member.
- Secrets travel only as stdin bytes: `login --password-stdin`, `package sign --identity-token-stdin`, `package attest --identity-token-stdin`. `login` keeps a BOM or CR in the password, so the pump writes raw bytes.
- Instantiates: CS-PROC-03, CS-PROC-08, CS-PROC-09, CS-PROC-10, CS-PROC-13, CS-PROC-14, CS-PROC-18, CS-PROC-25, CS-ASYNC-01.

### ADR-D12. Reach, floor and toolchain defaults

- Reach: net8.0 and net10.0 only. No netstandard2.0 slice and no net472 leg: modern .NET covers every OS and CPU ocx ships for.
- Floor: `net8.0;net10.0` until .NET 8 end of support on 2026-11-10 (.NET 9 the same day). `net10.0`-only is the end state, executed by `dotnet-upgrade`, and it makes the packed dependency budget zero.
- LangVersion 14 on both TFMs (Microsoft supports it only on net10.0; compile-only features measured working on net8.0). Warnings-as-errors unconditional, humans included, with only NU1900 to NU1905 exempt. Meziantou adopted with mode `None` and per-rule lines. No lock file for a library; CI restores into an empty packages folder. CA1062 on for `src`.
- Instantiates: CS-BUILD-01, CS-BUILD-04, CS-BUILD-08, CS-BUILD-13, CS-BUILD-15, CS-BUILD-25, CS-BUILD-26, CS-BUILD-27, CS-LANG-05, CS-SEC-09, DN-UPG-11.

### ADR-D13. Public API shape

- Results are closed: `[JsonConstructor] internal T() { }`, no public constructors, no `ModelFactory`. A consumer fakes at its own adapter or at the process boundary (about 25 ms and one compiled helper per fake result). Opening later is additive; closing later is `CP0002`. An `Ocx.Sdk.Testing` package is the later answer if demand appears.
- `OcxClient` is sealed, built by `static CreateAsync`, with no public seam (`IOcxClient`) and no `IDisposable`. The surface is async-only, with no sync twins.
- Open wire sets (`status`, `kind`, every `x-ocx-enum`) are `readonly record struct` wrappers; `OcxExitCode` wraps an `int`.
- Instantiates: CS-API-01, CS-API-02, CS-API-07, CS-API-17, CS-API-20, CS-ASYNC-15, CS-JSON-05.

## Requests to ocx-sh/ocx

| # | Request | Evidence | Effect on this ADR |
|---|---|---|---|
| R1 | Cut a release carrying `contract` ([6daf9a164](https://github.com/ocx-sh/ocx/commit/6daf9a164)); correct `MINIMUM_OCX` in the generated runtime | `git tag --contains 6daf9a164` prints nothing; main is 15 commits past `v0.6.5`; the generated runtime's floor `0.6.4` fails its own handshake | The SDK cannot run against any release until then (ADR-D1). `TestedOcxVersion` stays a placeholder |
| R2 | `ocx login` returns non-zero for a wrong password against a Basic-realm registry | Exit 0 on main; only a later authenticated call returns 80 | `LoginAsync` documents no credential check (ADR-D11) |
| R3 | Label `self update` `report_then_fail` in `cli.json`, or exit 0 for `skipped` and `pulled` | Labelled `report`, exits 75 with a report (`update.rs:15-16`) | The classifier already works by shape; the label stays wrong for list-driven callers (ADR-D3) |
| R4 | Make `--format`, `--json`, `--color` and `--log-level` global | All 13 root arguments have `"global": false`; `ocx version --format json` exits 64 | Removes the argv-order trap; the fixed prefix stays (ADR-D3) |
| R5 | Publish an ECDSA P-256 DER signature over `dist.json` (`dist.json.sig`). Related, in order of cost: `github-attestations = true` in `dist-workspace.toml`, immutable releases on `ocx-sh/ocx`; [ocx-sh/www-setup#14](https://github.com/ocx-sh/www-setup/issues/14) moves from minisign to P-256 | The BCL has no Ed25519 type; DER through the default `VerifyData` silently returns `false`; the digest has one origin | Activates CS-BIN-28 (ADR-D8). Until then the pin is the only root |
| R6 | Ship `OCX_LOG_LEVEL` in a release, with `OCX_LOG` retired as planned for 0.7.0 | 0.6.5 ignores `OCX_LOG_LEVEL` (1 stderr line against 6 for `--log-level trace`); main reads it | The SDK sends the flag either way (ADR-D6) |
| R7 | A marker a tool cannot forge for ocx's own passthrough failures: an environment-controlled marker or a distinct exit range | `exec -- missing` exits 65 and `exec -- ./mode-644` exits 77, the same channel as the tool's code | Replaces the `IsOcxError` heuristic (ADR-D4) |
| R8 | State whether ocx reads `TRACEPARENT` (the OpenTelemetry environment carrier is a Release Candidate) | ocx 0.6.5 and main read no trace context (grep, 2026-10-11) | If yes, the SDK injects it from `Activity.Current`; today it neither injects nor scrubs it (CS-OBS-29) |

## Consequences

**Positive:**
- One exit table, one handshake and one classifier. A contract bump fails closed with a typed error before any spawn.
- Passthrough codes never become ocx errors. An agent loop cannot mistake a tool's 80 for `AuthError`.
- The download path trusts a pin shipped inside a nuget.org-signed package, not the manifest host.

**Negative:**
- The SDK cannot ship a useful 0.1 until R1. A degraded 0.6.5 mode was rejected.
- Equality-only versioning means every ocx contract bump forces an SDK release.
- `IsOcxError` is forgeable until R7.
- Every pinned exit outcome is part of the public contract.

**Risks:**
- **The contract moves again before R1.** #604 rewrote the schemas in place. Mitigation: the schema-diff test gates every golden refresh, and the SDK stays 0.y.z.
- **82 or another number is reused after the baseline.** Mitigation: the conformance test fails on the first drift, and R1 asks for the baseline to be cut.
- **The pin goes stale.** Mitigation: the triangulation gate runs on every change to `ocx-pins.json` and nightly.

### Quantified Impact

| Metric | Value | Notes |
|---|---|---|
| Exit codes | 13 on main, 18 on 0.6.5 | 83 to 87 retired |
| `cli.json` | 81 nodes, 70 leaves, 124 `env` entries | 56 public, 66 foreign, 2 plumbing; 10 secret |
| Reports | 56 roots | `reports.json` at 3485207c1 |
| nupkg, models a and c | under 5 MiB | model b adds 91,600,345 bytes per ocx release |

### How Would We Reverse This?

Hand-written models and the owned engine are two-way doors. The package ID, the namespace, `OcxTelemetry` names, the `OCX` diagnostic prefix and every exception type are one-way doors: a `const` is baked into consumer assemblies and a public type cannot be retired.

## Validation

Run from the SDK repository root. Each command was watched red on a planted fixture and green on its twin (measured 2026-10-11). The adopter renames `Ocx` once.

```sh
# V1 ADR-D2. Owned by CS-ERR-02 check 02a (errors.md, Checks A); run that command, empty output (exit 1) is the pass.
#    It matches `code|exitCode|ExitCode|exitcode|r.Code` against `== != is` and a nonzero literal; reversed operands (`75 == code`) and `switch` forms are not caught.
# V2 ADR-D2. Prints true, exit 0 is the pass. Exit 1 is drift between the golden and the 13 rows.
jq -e '."$defs".ExitCode."x-ocx-enum" | map(.value) == [0,1,64,65,69,74,75,77,78,79,80,81,82]' errors.json
# V3 ADR-D6. Empty output (exit 1) is the pass. The SDK sends the flag and never sets the variables.
rg -n -g '*.cs' -e 'OCX_LOG_LEVEL' -e '"OCX_LOG"' -e 'RUST_LOG' src
# V4 ADR-D3. Prints 1 (the composer). Any other count is a second argv site.
rg -n -g '*.cs' '"--format"' src | wc -l
# V5 ADR-D4. Empty output is the pass (xargs exits 123). A printed file declares ChildExit with no IsOcxError.
rg -l0 -g '*.cs' 'class ChildExit' src | xargs -0 -r rg --files-without-match IsOcxError
# V6 ADR-D1. Prints 1. A second declaration of the tested version is the finding.
rg -n -g '*.cs' 'const string TestedOcxVersion\b' src | wc -l
# V7 ADR-D5. Prints 2 (source name and meter name).
rg -n -g '*.cs' 'public const string (SourceName|MeterName) = "Ocx.Sdk"' src | wc -l
# V8 ADR-D7. Prints true, exit 0 is the pass. Exit 1 is a pin file that is not 8 lowercase SHA-256 values.
jq -e '(.version|type=="string") and (.pins|type=="object") and (.pins|length==8) and (.pins|all(.[]; test("\\A[0-9a-f]{64}\\z")))' ocx-pins.json
# V9 ADR-D9. Empty output (exit 1) is the pass. A hit is a streaming type the v1 surface forbids.
rg -n -P -g '*.cs' -e '\bIAsyncEnumerable<' -e '\bIProgress<' -e '^\s*(?!//)[^"/]*\bevent\s+[\w<>?.,\s]+\s\w+\s*[;{]' -e 'Func<string,\s*(Value)?Task>' src
# V10 ADR-D10. Owned by CS-TEST-01, block `cs-test-01` (testing.md); exit 0 is the pass. A missing project file is the finding.
# V11 ADR-D10. Owned by CS-ERR-12 check 12a and CS-ERR-13 check 13c (errors.md, Checks C); both silent is the pass. Table shape: schema 1, at least 19 unique ids, required row keys; the unknown-code row uses 200.
```

V2 compares against the golden `errors.json` vendored from the pinned ocx commit. **Not yet watched, required before acceptance:** the handshake rows against a real released binary that carries `contract` (none exists), the Windows loser path of ADR-D9, and the armed contract tier against main on a CI runner (R1 blocks the released form).

## Open Questions

Each row is an owner question with the recommended default. "Ask ocx" rows go to the maintainers.

| # | Question | Recommended default | See |
|---|---|---|---|
| Q1 | Are .NET Framework 4.x and Unity hosts in scope? | No: net8+ and net10 only | ADR-D12 |
| Q2 | Keep `net8.0` for the first release cycle, or ship `net10.0` only? | `net8.0;net10.0` until 2026-11-10, then `net10.0` only | ADR-D12 |
| Q3 | How does the SDK get the ocx binary? | Locate, plus an opt-in download verified against a compiled-in SHA-256 pin; no binary in the nupkg | ADR-D7 |
| Q4 | Contract baseline: wait for a release or support 0.6.5? | Floor at the first contract-bearing release; no 0.6.5 mode | ADR-D1, R1 |
| Q5 | Publishing identity | `Ocx.Sdk`, Trusted Publishing, MinVer `v` tags, no author signing, no strong naming; the owner applies for the ID prefix and creates the policy | ADR-D5 |
| Q6 | Own the process engine or take CliWrap? | Own it, no runtime dependency | ADR-D11 |
| Q7 | Output cap policy | 16 MiB, stdout overflow fails closed. Revisit if `package sbom` (`raw_document`) can exceed it | ADR-D11 |
| Q8 | Environment policy: deny-list or allow-list? | The 7-key deny-list. The alternative drops every `OCX_*` and `__OCX_*` and re-adds an allow-list that must keep `OCX_AUTH_*`. An SDK host started by `ocx exec` inherits `__OCX_*` plumbing (unmeasured) | ADR-D6 |
| Q9 | Held pipe after exit: flag or exception? | The `DrainTimedOut` flag | ADR-D11 |
| Q10 | Passthrough kill grace | 0 (tree kill). SIGTERM is opt-in | ADR-D11 |
| Q11 | Host-death containment | None in v1. Options later: an opt-in Windows job object, or .NET 11 `KillOnParentExit` | ADR-D11 |
| Q12 | Accept `IsOcxError` as a heuristic? | Yes, documented | ADR-D4, R7 |
| Q13 | Sync twins for MSBuild and PowerShell consumers? | No: async-only v1 | ADR-D13 |
| Q14 | Ask ocx: does any ocx path take the project mutation lock after reading or writing `ocx.toml`? | Retry stays 75-only. If none does, widen to `detail == "project_locked"` for mutating commands (3 attempts, 100 to 400 ms jitter) | ADR-D2 |
| Q15 | In-flight coalescing of `EnsureAsync` in v1? | No | ADR-D9 |
| Q16 | A sixth exception type for download and checksum failures? | None until the download path ships; then `OcxAcquireException` with an ADR | ADR-D5 |
| Q17 | Can consumers construct result types? | No; fake at the adapter or the process | ADR-D13 |
| Q18 | Ask ocx: does a required-to-optional change count as a version bump? | Ask before 1.0. Keep `required` strictness meanwhile | ADR-D1 |
| Q19 | Hand-written models or an `ocx_sdkgen` C# backend? | Hand-written with 13 union arm tables; the diff test gates both | ADR-D1 |
| Q20 | LangVersion 14 on net8.0, and warnings-as-errors for humans? | Accept both | ADR-D12 |
| Q21 | Windows ARM64 binary and cache-root ownership check | Native `aarch64`. Skip the ownership P/Invoke and document the gap | ADR-D7 |
| Q22 | Non-tested versions: expose them? | Yes, with a caller digest through `TrustManifestOrigin` | ADR-D7 |
| Q23 | Does Dependabot rewrite `GlobalPackageReference` versions? | Unverified; check on the first Dependabot PR | ADR-D8 |
| Q24 | Keep the macOS PR leg; set `ci-ok` as the only required check | Keep it (the only osx-arm64 evidence). Only the owner sets branch protection | ADR-D10 |
| Q25 | Coverage floor, coverage service, CODEOWNERS on `behavior-table*.json` | No floor, no service. Only the owner enables CODEOWNERS | ADR-D10 |
| Q26 | Does the repo ship an application (a tool or container)? | No application in this repository; the app-publish path of `dotnet-release` stays a skill for consumers | ADR-D12 |
| Q27 | Ask ocx: `TRACEPARENT` | Neither inject nor scrub until R8 is answered | R8 |

## Links

- `csharp-audit/ocx-cli-contract.md`: the contract audit, exit table, environment, command tree, `dist.json`
- `csharp-process.md`: owned engine, argv prefix, scrub, passthrough, retry, PathAcl
- `csharp-api.md`: CS-API and CS-ERR (exception leaves, exit table, behaviour table)
- `csharp-json.md`: handshake, open sets, union arms, schema diff
- `csharp-packaging.md`: CS-PKG, CS-BIN-01 to CS-BIN-19, library release steps (dotnet-release R1 to R14), delivery models
- `csharp-security.md`: CS-SEC, CS-BIN-20 to CS-BIN-28, the attestation findings
- `csharp-async.md`, `csharp-observability.md`: CS-ASYNC-24 and 28, CS-OBS-25 to 29
- `csharp-crossplatform.md`, `csharp-testing.md`: the four tiers, the contract tier, the CI matrix
- `csharp-build.md`, `csharp-language.md`, `csharp-performance.md`, `csharp-procedures.md`: floor, LangVersion, benchmarks, upgrade and release procedures
- [ocx-sh/ocx#580](https://github.com/ocx-sh/ocx/pull/580), [ocx-sh/ocx#604](https://github.com/ocx-sh/ocx/pull/604), [ocx-sh/www-setup#14](https://github.com/ocx-sh/www-setup/issues/14)

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-10-11 | research-lang C# program (drafter) | Initial draft from the 13 consolidations and the ocx contract audit |
