---
# Read on demand through the index. This glob matches no file, so a client never auto-loads the file.
paths:
  - "**/.csharp-quality-depth-on-demand"
title: Errors and Behaviour Compatibility
summary: The CS-ERR family, owning the exception hierarchy of a library that wraps a command-line tool, the exit-code table and its conformance test, passthrough exits, the one decode seam, cancellation, catch-all sites, exception shape, message text, and the behaviour table with its baseline twin and diff guard
---

# Errors and Behaviour Compatibility

Binds to .NET SDK 10.0.401 with `AnalysisLevel 10.0-all` and warnings as errors, on net8.0 and net10.0, Linux x64, GNU grep 3.12 and jq 1.8.1
(measured 2026-10-11). Windows, macOS and arm64 rows are `unverified: read only`.

Owns how a failure of the wrapped tool is declared, mapped, thrown and pinned. Not owned here: the kill protocol and
the argv, stream and environment rules are `CS-PROC`, the fake-CLI tier is `CS-TEST-01`, `CS-TEST-03` and `CS-TEST-07`, the decode
seam mechanics are `CS-JSON-09` and `CS-JSON-21`, the stderr callback contract is `CS-OBS-28`, the redactor is `CS-PROC-08`, and
the public-API gates and the version choice are `CS-API-11` to `CS-API-15`. Type, leaf and property names (`OcxException`,
`OcxCommandException`, `ExitTable.cs`, `ChildExit`) are example names from the reference consumer: rename them once. The schema marker `x-ocx-enum`, the `ocx` in the message
template of `CS-ERR-08` and in the apphost copy of Checks C 14a, `OcxBaselineVersion` and `FakeAsOcx` are example names too. This file pins
no exit number, no command list and no environment variable name: the adopter's own exit table is its design record's.

Contents: [Defaults](#defaults) · [Hierarchy and Exits](#hierarchy-and-exits) · [The Exit Table](#the-exit-table) ·
[Seams and Catches](#seams-and-catches) · [The Behaviour Table](#the-behaviour-table) · [What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Defaults

- Default, the adopter may override: five exception leaves, plus the `CS-BIN` acquisition leaf (example `OcxAcquireException`)
  once a download path ships and no other sixth leaf. Shipping that path is the written decision for the acquisition leaf; check 01a accepts it by name.
- `[cli-wrapper]` binds the hierarchy rows (`CS-ERR-01`, Checks A 01a to 01e): the leaf list is the wrapper's. A library that wraps
  no CLI keeps `CS-ERR-07` for the exception types it has and declares its own hierarchy; it has nothing for Checks A 01 to read.
- Extension point (`CS-API-02`, `CS-API-03`, `CS-ERR-07`): a public exception base or interface that is meant to be subclassed or
  implemented by consumers is sanctioned as one when its constructors are `protected`, its XML doc names the contract
  and the leaves below it stay sealed; a documented multi-level hierarchy is sanctioned too, each level above a leaf documented with `protected` constructors. The sanction needs the `MA0053` `Justification` of `CS-API-03` and is read, not scanned.
- Default, the adopter may override: passthrough exits carry a heuristic "the tool reported this" flag.
- Every public async method reports every failure by faulting the returned `Task`, argument guards included: the guard sits
  inside the `async` method, so `ArgumentNullException` arrives from `await`, never from the call (`CS-LANG-05` owns the guard).
  This departs from the Task-based Asynchronous Pattern and the BCL, which throw usage errors synchronously from the call.
  The departure is deliberate: a caller then handles every failure at the one `await`, and `Task.WhenAll(a(null), b())`
  cannot throw before `b` has started. The adopter may override it once, with the reason recorded.
- Under the gate (`CS-BUILD-13`) CA1031, CA1032, CA2200, CA2201, CA1064, CA1710 and SYSLIB0051 are errors with no per-rule
  line. In default mode only CA2200 fires. Each check block below prints violations, so empty output is the pass, except
  Checks B 06 and Checks C 13a: on a green tree each prints only the sanctioned sites named on its row (`CS-ERR-06`, `CS-ERR-13`).
  The cells assume `SRC` is the production code of a shipped library that declares its own exception hierarchy (an app, or a
  library that throws only BCL exceptions, has nothing for Checks A to read), with `$TESTS/Ocx.Sdk.FakeCliTests` as the
  fake-CLI tier (`CS-TEST-01`). Run block E0 first, in the same shell: it fails on an unset operand, prints `MISSING` for a path,
  ref or merge base that does not exist (a missing operand makes `grep` and `rg` print nothing, which reads as a pass; a shallow
  clone has no merge base), for an absolute operand and for a scope that holds no `.cs` file, prints `N/A: <reason>` where
  `[cli-wrapper]` does not apply (`TOOL`, the wrapped tool's file name, is unset) and defines the test exclusions `x` and `xg`.
  `SRC` and `TESTS` are space-separated lists of repo-relative directories, used unquoted: an absolute path under a `tests/`
  ancestor matches the exclusion and counts zero files. The exclusions are the index glob, keyed on test-project path
  segments, so a shipped `Foo.Testing` package or a `Latest/` directory stays in scope.
  A block needs GNU grep with `-P`; Checks B 05 and 06 and Checks A 09 need ripgrep (`rg`), and Checks C needs jq.
- Retired, not reused: `CS-ERR-11` (never redeclare `InnerException` or `Message`; folded into `CS-ERR-08`, check 08b).

## Hierarchy and Exits

| Leaf (example name) | Thrown when | Properties |
|---|---|---|
| `OcxCommandException` | the tool ran and reported failure; also exit 0 whose report `status` is not a known success value (fail closed) | `OcxExitCode ExitCode`, `OcxErrorKind? ErrorKind`, `string? Detail`, `OcxErrorContext? Context`, `object? PartialReport`, `string? OcxMessage`, `string? StderrExcerpt`, `bool IsTransient` |
| `OcxDecodeException` | stdout is undecodable or the wrong shape for a matching `schema_version`, on exit 0 or an accepted exit (an unaccepted non-zero exit throws `OcxCommandException`, `CS-JSON-20`) | `string Excerpt` (bounded, redacted), `string? JsonPath`, `InnerException` is `JsonException` only |
| `OcxContractException` | the tool has no `contract` key, or a contract version differs from the compiled one | `string Part`, `string? Found`, `string Expected` |
| `OcxTimeoutException` | the SDK's own timer fired | `TimeSpan Timeout`, `InnerException` is the `TaskCanceledException` |
| `OcxLaunchException` | the tool could not be started | `OcxLaunchFailure Reason` (`Unknown`, `NotFound`, `NotExecutable`, `BadFormat`, `ArgvTooLong`, `BatchRefused` per `CS-PROC-04`), `InnerException` is the `Win32Exception` |

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CS-ERR-01 | [cli-wrapper] Declare one `public abstract class OcxException : Exception` with three `protected` standard constructors and `string? Command`, and exactly the five `sealed` leaves above, plus the one `CS-BIN` acquisition leaf (example `OcxAcquireException`) once that download path ships. No per-exit-code subclass. `PartialReport` is the typed report bound once by the decode seam (`CS-JSON-21`), never raw stdout. Any other leaf needs a written decision naming its programmatic scenario. | One `catch (OcxException)` covers the SDK. Exit categories churn and a public type cannot be retired, while a property value can: a reference port grew 26 classes and was stale one release later. A reference port named the report property `PartialReportJson` while holding a bound object. | Checks A 01a to 01e print leaves beyond the five and the acquisition leaf (01a accepts that one name), any exception whose base is not the root (01b reads every `class X : ...Exception`, so a BCL subclass such as `: InvalidOperationException` is a hit), an unsealed public exception, a launch enum file lacking `BatchRefused` (xargs exits 123) and a raw-stdout property. Sealing is also MA0053 (`CS-API-03`). Watched red and green (measured 2026-10-11). | MUST |
| CS-ERR-02 | Map the process exit status to `OcxExitCode` through the one table in [The Exit Table](#the-exit-table), guarded by its conformance test. Write no nonzero exit literal outside the table file. | `kind` is not `code` (two kinds can share a code), and a code can change meaning between tool releases. A hard-coded or cast enum matches the one binary the agent read. | Checks A 02a (a nonzero literal outside the table, in files that mention `ExitCode`: `==`, `!=`, relational and `is` forms, a literal on the left, `case N:` and a switch arm `N =>`) and 02b (cast, message or stderr matching) print offenders in library code; test projects are excluded by `xg`. The conformance test: `dotnet test --project tests/Ocx.Sdk.FakeCliTests` exits 0, 2 when it finds drift. Watched red and green against a stub table (measured 2026-10-11). | MUST |
| CS-ERR-03 | A passthrough command (the tool runs a caller-chosen child) returns `sealed class ChildExit` with `int ExitCode` and `bool IsOcxError`, never a positional record (`CS-API-05`). It never reads the exit table, never throws on a nonzero child status and never retries. A status the SDK caused by killing the tree surfaces as cancellation or timeout (`CS-PROC-14`, `CS-PROC-15`), never `OcxCommandException`. The passthrough path lives in its own file. Classify a command as passthrough from the tool's machine-readable contract file, not a hand list. `IsOcxError` is a heuristic a child can forge: document it so on the property; its derivation is `CS-PROC-21`. | A child's own exit code collides with the tool's table, so a build tool exiting with the auth code raised an auth error in a reference port. An SDK kill reads 137 on POSIX and -1 on Windows. | Checks A 03 print a file that mentions `ChildExit` and also names the table or the command exception, and a `ChildExit` file lacking `IsOcxError`. Fake-CLI row `passthrough-child-exit-is-data` (`CS-ERR-12`): a child exiting with a code in the tool's table yields `ExitCode` equal to it and no exception. Watched red and green (measured 2026-10-11). | MUST |
| CS-ERR-09 | No public method takes a throw-or-not switch (`bool throwOnError`, a validation enum) and none returns or `out`s an exception. Two methods say it in the type system: `RunAsync` throws, `ExecAsync` returns `ChildExit`. A `NotSupportedException` stub and a `Create*` or `*Factory*` member (which builds an exception, as `ApiException.Create` does) are outside both halves. A report-then-fail command, and a command that exits with the temp-fail code beside a success report, takes an explicit accepted-exit-code set per call and returns the typed report for those codes. | The design guidelines forbid options that toggle throwing, and a wrapper library did it anyway. A report-then-fail command prints a full report and exits nonzero. The guard-in-the-task half is a deliberate departure from TAP and the BCL (see Defaults). | Checks A 09a prints a public method with a throw-switch parameter, an `out` exception or a `Task<...Exception>` return (a `Create*` or `*Factory*` member is silent). 09b prints a public non-`async` `Task` method (generic methods included) whose block body throws synchronously (`throw` or a `ThrowIf*` guard), and, as its second line, one whose expression body does (`=> x ?? throw ...`, `=> ThrowIf...`); a forwarding method with no throw, a body whose only `throw` is `new NotSupportedException` and a `Create*` or `*Factory*` member are silent. Both read only files that declare a literal `public` type or an `#if ... public` define, so a method of an `internal` type (a `Pop3Engine`) is silent. The behavioural twin is a faulted-`Task` test: call with `null`, assert `task.IsFaulted`. Watched red and green (measured 2026-10-11). | SHOULD |
| CS-ERR-10 | `OcxCommandException.IsTransient` is true only when `ExitCode == OcxExitCode.TempFail` and `ErrorKind` is the temp-fail kind. It is the only retry signal. The retry policy (non-mutating tool-owned commands only) is `CS-PROC-22`. | The tool says a wrapper can loop on temp-fail and stop on the rest, but a skipped self-update exits with the temp-fail code beside a success report and no error document, so the code alone retried a deterministic skip. | Checks A 10 prints an `IsTransient =>` definition lacking both comparisons. A unit test over every table row asserts exactly the temp-fail row with the temp-fail kind is transient. Watched red and green (measured 2026-10-11). | SHOULD |

```bash
# E0 (Checks A, B, C): run first, in the same shell; any output is a failed check, except an `N/A:` line (the tag does not apply here)
: "${SRC:?MISSING SRC}" "${TESTS:?MISSING TESTS}" "${PRJ:?MISSING PRJ}" "${BASE:?MISSING BASE}"   # index Conventions: SRC and TESTS are space-separated repo-relative directory lists (used unquoted), PRJ the shipped library's project directory (SRC/Ocx.Sdk), BASE the merge target
for v in SRC TESTS; do for p in ${!v}; do case $p in /*) echo "MISSING repo-relative $v";; esac; done; done   # an absolute path under a tests/ ancestor matches the exclusion below and counts zero files
D=${TESTS%% *}/Ocx.Sdk.FakeCliTests; CT=${TESTS%% *}/Ocx.Sdk.ContractTests   # the fake-CLI and contract-tier test projects under the first TESTS directory (example names: rename them)
for p in $SRC "$PRJ"; do test -e "$p" || echo "MISSING $p"; done
x=(-g '!**/{test,Test,tests,Tests,*.Test,*Tests,*TestFixtures,*TestServices}/**' -g '!**/obj/**' -g '!**/bin/**')   # rg, after -g '*.cs': test-project path segments and build output are not library code
xg=(--exclude-dir={test,Test,tests,Tests,'*.Test','*Tests','*TestFixtures','*TestServices'} --exclude-dir=obj --exclude-dir=bin)   # the same for grep; Checks C scans "$D" on purpose and does not use them
rg --files -g '*.cs' "${x[@]}" $SRC | head -1 | grep -q . || echo "MISSING scanned zero files"
git rev-parse --verify -q "$BASE" >/dev/null || echo "MISSING $BASE"
git merge-base "$BASE" HEAD >/dev/null 2>&1 || echo "MISSING merge-base $BASE (fetch-depth: 0)"   # a shallow clone: 16a would fail on it
tfm=$(dotnet msbuild "$PRJ" -getProperty:TargetFrameworks -getProperty:TargetFramework | jq -r '.Properties | [.TargetFrameworks, .TargetFramework] | join(";")'); [ -n "${tfm//;/}" ] || echo "MISSING TFM ($PRJ does not evaluate)"
gf=1; for t in ${tfm//;/ }; do [[ $t =~ ^net(8|9|[1-9][0-9])\.[0-9] ]] || gf=0; done   # gf=1: every shipped TFM is net8.0 or newer ([greenfield]; 07a reads [Serializable] only then)
if [ -z "${TOOL:-}" ]; then echo "N/A: TOOL unset, so CS-ERR-01 (Checks A 01) and CS-ERR-12 to 17 (Checks C) read nothing"
else for p in "$D" "$D/Behavior" "$D/behavior-table.json" "$D/Ocx.Sdk.FakeCliTests.csproj"; do test -e "$p" || echo "MISSING $p"; done; fi
```

```bash
# Checks A. Run E0, then these from the repository root; each command prints violations, empty output is the pass. 01a to 01e bind [cli-wrapper] (TOOL set).
if [ -n "${TOOL:-}" ]; then
grep -rhoP --include='*.cs' "${xg[@]}" 'class\s+\K\w+(?=\s*(\([^)]*\))?\s*:\s*OcxException\b)' $SRC | sort -u | grep -vxE 'Ocx(Command|Decode|Contract|Timeout|Launch|Acquire)Exception'   # 01a: the five leaves and the one CS-BIN acquisition leaf
grep -rnP --include='*.cs' "${xg[@]}" 'class\s+\w+\s*(\([^)]*\))?\s*:\s*[\w.]*Exception\b' $SRC | grep -vE -e 'abstract class OcxException' -e ':\s*OcxException\b'   # 01b: any base but the root, BCL subclasses included
grep -rnE --include='*.cs' "${xg[@]}" '^\s*public\s+class\s+\w+Exception\b' $SRC   # 01c
grep -rl --include='*.cs' "${xg[@]}" 'enum OcxLaunchFailure' $SRC | xargs -r grep -L 'BatchRefused'   # 01d
grep -rnE --include='*.cs' "${xg[@]}" -e 'PartialReportJson' -e 'string\??\s+PartialReport\b' $SRC   # 01e
fi
grep -rlE --include='*.cs' "${xg[@]}" --exclude='ExitTable.cs' 'ExitCode' $SRC | xargs -r rg -H -n -P -e '\b(?:[eE]xit)?[cC]ode(?:\.Value)?\s*(?:==|!=|<=|>=|<|>|is(?:\s+not)?(?:\s*[<>]=?)?)\s*[1-9]\d{0,2}\b' -e '\b[1-9]\d{0,2}\s*(?:==|!=|<=|>=|<|>)\s*(?:\w+\.)*(?:[eE]xit)?[cC]ode\b' -e '\bcase\s+[1-9]\d{0,2}\s*:' -e '(?:^|[{,])\s*[1-9]\d{0,2}(?:\s+or\s+[1-9]\d{0,2})*\s*=>'   # 02a, in files that mention ExitCode: ==, !=, relational and is forms, a literal on the left, case N: and a switch arm
grep -rnE --include='*.cs' "${xg[@]}" -e '\((byte|OcxExitCode)\)\s*\w*([eE]xit|[cC]ode)' -e 'Message\.(Contains|StartsWith)' -e 'stderr\w*\.Contains' $SRC   # 02b
grep -rlE --include='*.cs' "${xg[@]}" 'ChildExit' $SRC | xargs -r grep -nE 'ExitTable|OcxCommandException'   # 03
grep -rl --include='*.cs' "${xg[@]}" 'class ChildExit' $SRC | xargs -r grep -L 'IsOcxError'   # 03
P='^\s*(?:#if\b.*(?i:public)|public\s+(?:(?:sealed|abstract|static|partial|readonly)\s+)*(?:class|struct|record|interface)\b)'   # a file with a literal public type or an #if ... public define
pub() { rg -l0 -P -g '*.cs' "${x[@]}" "$P" $SRC | xargs -0 -r rg -U -n -P "$@"; }   # rg over those files only: a public member of an internal type is not API
pub -e 'public\s[^;{(]*\([^;{)]*\b(?:bool\s+throw(?:OnError|OnFailure)\b|out\s+\w*Exception\s)' -e 'public\s[^;{=(]*Task<\w*Exception>\s+(?!(?:Create|\w*Factory)\w*\s*[(<])'   # 09a, a Create or Factory member may return the exception task
pub 'public\s+(?:(?:static|override|virtual|sealed)\s+)*(?!async\b)(?:Value)?Task(?:<[^>]+>)?\s+(?!(?:Create|\w*Factory)\w*\s*[(<])\w+\s*(?:<[^>]+>)?\s*\([^)]*\)\s*(?!(?<b>\{(?:(?!\bthrow\b(?!\s+new\s+(?:System\.)?NotSupportedException\b)|\bThrowIf\w+\s*\()[^{}]|(?&b))*\}))\{'   # 09b, block body
pub 'public\s+(?:(?:static|override|virtual|sealed)\s+)*(?!async\b)(?:Value)?Task(?:<[^>]+>)?\s+(?!(?:Create|\w*Factory)\w*\s*[(<])\w+\s*(?:<[^>]+>)?\s*\([^)]*\)\s*=>[^;]*?(?:\bthrow\b(?!\s+new\s+(?:System\.)?NotSupportedException\b)|\bThrowIf\w+\s*\()'   # 09b, expression body
grep -rhE --include='*.cs' "${xg[@]}" 'IsTransient\s*=>' $SRC | grep -vE 'ExitCode.*TempFail.*ErrorKind.*TempFail'   # 10
grep -rnE --include='*.cs' "${xg[@]}" 'new\s+\w+\??\s+(InnerException|Message)\b' $SRC   # 08b
```

## The Exit Table

The mechanism for `CS-ERR-02`; other families that map an exit status (`CS-PROC-20`) cite this section and do not restate it.

- **One file.** `src/**/ExitTable.cs` holds a static list of (value, name, category) for the tool's documented codes. It is the only place a number maps to a name.
- **Open codes.** A status missing from the table is a valid `OcxExitCode` with `IsKnown == false` and its raw `int`. The mapper never throws, the status is never cast to an enum or `byte`, and a launch or kill status the SDK caused never reaches it.
- **Conformance.** A test loads the tool's vendored machine-readable code list (value, name and category per code) with `JsonDocument` and fails on any difference in either direction: missing, extra, renamed or recategorised.
- **Never derive** the code from `error.kind`, `error.message` or stderr text. Branch on `ExitCode`, then `ErrorKind`, then `Detail`.
- **One table per contract.** A single table is correct only while the SDK floor is the first tool release in which each code keeps one meaning. Supporting an older release needs a second frozen table selected by the handshake (`CS-JSON-10`), never by the version string, and is an owner decision.

```csharp
[Fact] // shape of the conformance test; ExitTable is internal, the test assembly is a friend
public void ExitTable_matches_vendored_schema()
{
    using var doc = JsonDocument.Parse(File.ReadAllText("errors.json"));
    var schema = doc.RootElement.GetProperty("$defs").GetProperty("ExitCode").GetProperty("x-ocx-enum").EnumerateArray()
        .Select(e => (e.GetProperty("value").GetInt32(), e.GetProperty("name").GetString()!, e.GetProperty("category").GetString()!)).Order().ToArray();
    Assert.Equal(schema, ExitTable.Rows.Select(r => (r.Value, r.Name, r.Category)).Order().ToArray());
}
```

## Seams and Catches

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CS-ERR-04 | All JSON decoding lives in one internal seam: apart from the `CS-JSON-07` union converter file, the only file that calls `JsonSerializer.Deserialize` or `JsonDocument.Parse(` and the only file with `catch (JsonException`. It turns a `null` result into `OcxDecodeException`, carries `InnerException` and `JsonException.Path`; stdout is never in `Message`, and `Excerpt` is the opt-in bounded, redacted property of `CS-ERR-08`, and writes no `Deserialize<T>(...)!`. Peek `schema_version` before binding: a mismatch is `OcxContractException`. Catch `JsonException` only: `NotSupportedException` is never in the seam's catch list (a `catch (NotSupportedException)` around a process kill, an encoding or a stream elsewhere is another subject). On an unaccepted non-zero exit the command exception wins over any decode or contract exception (`CS-JSON-20`); decode and contract exceptions apply on exit 0 or an accepted exit. | `JsonException` leaked past `catch (OcxException)` on truncated and skewed output, and `Deserialize<T>("null")!` returned null silently. Binding first hides a version skew as a decode error. | Checks B 04a to 04d read the `seam` list of `CS-JSON-09` block G9 (the one decode pattern, counted in files that use `System.Text.Json` only, so a Newtonsoft or YamlDotNet `Deserialize` is silent) and print a second decode file, a `JsonException` catch outside the seam, a bang on `Deserialize` (nested parentheses included) and a `NotSupportedException` catch in the seam file only. Fake-CLI rows `decode-truncated-json` and `decode-unknown-union-tag` pin the behaviour (specified, not run in the watch). Greps watched red and green (measured 2026-10-11). | MUST |
| CS-ERR-05 | Caller cancellation propagates as `OperationCanceledException` carrying the caller's token, never wrapped or converted. Only the SDK's own timer becomes `OcxTimeoutException`, never a BCL `TimeoutException` or an OCE subtype. Every `catch (Exception e)` that wraps carries `when (e is not OperationCanceledException)`, or follows a `catch (OperationCanceledException) { throw; }` clause on the same `try`, which is the same guard. | A blanket `catch (Exception e) { throw new OcxLaunchException(..., e); }` turned a cancel into an SDK failure, and CA1031 does not flag a wrapping catch. A linked-token timeout is a `TaskCanceledException` indistinguishable from a cancel. | Checks B 05 prints a catch-all that wraps (`throw new`, also inside a nested block), has no filter naming `OperationCanceledException` (so a filter on the wrong type is caught too), no `OperationCanceledException` guard in its body (`if (e is OperationCanceledException) throw;`) and no preceding `catch (OperationCanceledException) { throw; }` clause (any other body, a swallow included, does not count), and only when its `try` awaits or names a `CancellationToken`: a synchronous wrap cannot swallow a cancel. Fake-CLI rows `caller-cancel-is-oce` (token equals the caller's) and `timeout-is-sdk-type` (200 ms timeout). Watched red and green (measured 2026-10-11). | MUST |
| CS-ERR-06 | No catch-all swallows. `catch (Exception)` or a bare `catch` is allowed at five sites only: (1) the process or decode seam, with the cancellation filter and a wrap; (2) best-effort cleanup, with `[SuppressMessage("Design", "CA1031:...", Justification = "...")]`; (3) a handler that ends in `throw;` or captures the exception for a deferred rethrow after the process exits, which is the stderr-callback guard of `CS-OBS-28` and carries the same suppression with its justification; (4) a library that returns results or diagnostics instead of throwing (a compiler, a linter, a language server) converts the exception into a diagnostic or result at its API boundary, with the cancellation filter and the same suppression with its justification; (5) a framework or API boundary (middleware, a controller action, a hosted-service loop, an event or callback such as a reader's error callback, a `Try*` method that returns `false`) converts the exception into a response, a result or a callback decision, with the cancellation filter and the same suppression with its justification. | CA1031 accepts `when (ex is not OperationCanceledException) { return -1; }`: a filter that names the variable reads as specific to the analyzer. | CA1031 is an error under the gate: `dotnet build src --no-incremental` exits 1 at an unjustified site (net8.0 and net10.0). Checks B 06 prints the header line of every catch-all (one line per site, never the body) whose last top-level statement (found brace-balanced and string-aware: a brace in a string or comment does not count) is not a `throw` of any form (`throw;` after a nested block, `throw Wrap(e);`, `throw new X($"...{v}...", e);`), nor a forward of the exception (`return Task.FromException(e);`, `tcs.TrySetException(e);`, `observer.OnError(e);`, `ExceptionDispatchInfo.Capture(e).Throw();`) that may be followed by `continue;`, `break;`, `goto L;` or `return ...;`, which is what the analyzer misses (the `when (ex is not OperationCanceledException) { return -1; }` form, a filter plus log-only body and a path that rethrows on one branch and falls through on another build clean). On a green tree it prints exactly the sanctioned sites 2 to 5, each in a method carrying the CA1031 `Justification`; any other hit is a violation. A retry-then-rethrow (`if (lastAttempt) throw; continue;`) and an `if (handled) { return null; } else { throw; }` body print too: read each, and sanction it only as site 3 with the `Justification`. Watched red and green on both TFMs (measured 2026-10-11). | MUST |
| CS-ERR-07 | Exception types are classes, never `record` (CS8864), with get-only typed properties: no `{ get; set; }`, no `Exception.Data` write, [greenfield] no `[Serializable]` (below net8.0 the attribute alone is allowed), no `ISerializable`, no `SerializationInfo` or `StreamingContext` constructor, no `GetObjectData`. The root's protected constructors satisfy CA1032. Each sealed leaf keeps `internal` data constructors and one `[SuppressMessage("Design", "CA1032:Implement standard exception constructors", Justification = "...")]`; no public parameterless leaf constructor, no `#pragma warning disable CA1032`. A public base meant for subclassing is the extension point of Defaults: `protected` constructors, a documented contract, sealed leaves below it (a documented multi-level hierarchy keeps `protected` constructors on each level above a leaf). | SYSLIB0051 has obsoleted the serialization surface since .NET 8, yet the Microsoft CA1032 samples still show `[Serializable]`, which agents copy. `Data` is untyped and absent from `ToString()`. A public `()` constructor allows a failure with no exit code. | Checks B 07a and 07b print the banned members (in files that declare a type deriving from an exception only; `[Serializable]` only where every TFM is net8.0 or newer) and a record exception. `dotnet build src --no-incremental` exits 1 on SYSLIB0051 and CA1032 (net8.0 and net10.0); the suppressed leaf builds clean. Watched red and green (measured 2026-10-11). | MUST |
| CS-ERR-08 | `Message` is a fixed template: `<tool> <command> failed (exit <code> <name>)[: <detail>]. <one actionable hint>` (example tool name `ocx`). It never contains argv values, environment, stdout or the stderr tail. A launch failure has no exit, so `OcxLaunchException` uses `<tool> could not be started: <reason>. <hint>`, and its `NotFound` message lists each skipped PATH directory as `dir: reason` (`CS-PROC-03`), the one environment value a message may carry. `OcxMessage`, `StderrExcerpt` and the decode leaf's `Excerpt` are opt-in properties, bounded to 500 characters and passed through the SDK's single redactor (`CS-PROC-08`). `ToString()` never prints `PartialReport`. Never redeclare `InnerException` or `Message` with `new`, and never let an exception member or `ToString()` throw. | Process wrappers put argv, streams or response bodies in `Message`, and the tool's `OCX_AUTH_*` variables (example name) are secrets. A getter that throws when there is no inner exception breaks every logger that walks the chain. | The canary row `secret-canary-not-in-message` (`CS-ERR-12`): the fake tool gets a canary string in argv and in a secret variable and echoes it on stderr and in a report; assert `Message` and `ToString()` lack it and `Data.Count == 0`. Checks A 08b prints a `new` redeclaration; CA1065 under the gate. Watched red (argv in `Message`) and green (measured 2026-10-11). | MUST |

```bash
# Checks B. Run E0, then CS-JSON G0 and the seam= line of its block G9 (json.md: the one decode pattern, in files that use System.Text.Json) in the same shell; each command prints violations, empty output is the pass (06: see its row).
[ -n "${seam+x}" ] || echo "MISSING seam: run the seam= line of CS-JSON-09 G9 first"
[ "$(printf '%s\n' "$seam" | grep -c .)" -le 1 ] || echo "04a more than one decode file"                                                                  # 04a
grep -rlE --include='*.cs' "${xg[@]}" 'catch\s*\(\s*(System\.Text\.Json\.)?JsonException' $SRC | grep -vxF "$seam"                                       # 04b
rg -n -P -g '*.cs' "${x[@]}" 'Deserialize(?:Async)?\s*<[^>]+>\s*(?<p>\((?:[^()]|(?&p))*\))\s*!(?!=)' $SRC                                                 # 04c, nested parentheses balanced
printf '%s\n' "$seam" | xargs -r grep -nE 'catch\s*\(\s*(System\.)?NotSupportedException'                                                                  # 04d, in the decode seam file only
# 05 and 06 share these parts: u = one token (string, comment or balanced block), a balanced body, whitespace and comments, a statement, and the last statement that ends a body.
dfn='(?(DEFINE)(?<u>(?>//[^\n]*+|/\*.*?\*/|@\x22(?:[^\x22]|\x22\x22)*+\x22|\$?\x22(?:[^\x22\\\n]|\\.)*+\x22|\x27(?:\\.|[^\x27\\])\x27|[^{}\x22\x27/]|[/\x27\x22]|(?&bal)))(?<bal>\{(?&u)*+\})(?<ws>(?:\s++|//[^\n]*+|/\*.*?\*/)*+)(?<st>(?:(?!;)(?&u))*+;)(?<fwd>\{(?&u)*?(?<=[;}{])(?&ws)(?:throw\b(?&st)|(?:return\s++)?[\w.<>?\[\]]+\s*\.\s*(?:FromException|(?:Try)?SetException|Capture|OnError|SetError|TryComplete)\b(?&st)(?:(?&ws)(?:(?:continue|break|goto\s++\w++)\s*;|return\b(?&st)))?)(?&ws)\}))'
c='catch\s*(?:\(\s*(?:System\.)?Exception\b[^)]*\))?\s*'                                          # a bare catch, or catch (Exception ...)
w='(?:when\s*\([^\n]*\)\s*)?'                                                                  # any filter
q='(?:when\s*\((?![^\n]*\bOperationCanceledException\b)[^\n]*\)\s*)?'                          # no filter, or one that never names OperationCanceledException
n='(?<nb>\{(?:(?!\bthrow\s+new\b)[^{}]|(?&nb))*\})'                                             # a balanced body with no throw new
o='(?<ob>\{(?:(?!\bOperationCanceledException\b)[^{}]|(?&ob))*\})'                              # a balanced body that never names OperationCanceledException
a='try\s*(?=\{(?:(?!\bcatch\b)[\s\S])*?\b(?:await|[cC]ancellationToken)\b)(?&bal)\s*(?:catch\s*\((?!\s*(?:System\.)?Exception\b)(?!\s*(?:System\.)?OperationCanceledException\b[^)]*\)\s*\{\s*throw\s*;\s*\})[^)]*\)\s*(?:when\s*\([^\n]*\)\s*)?(?&bal)\s*)*\K'   # a try that awaits or names a token, up to its catch-all, past every clause but a bare catch (OperationCanceledException) { throw; }
rg -U -n -P -g '*.cs' "${x[@]}" "$dfn$a$c$q(?!$n)(?=$o)\{" $SRC                                  # 05
rg -U -n -o -P -g '*.cs' "${x[@]}" "$dfn(?=$c$w(?!(?&fwd))(?&bal))catch[^\r\n{]*" $SRC               # 06, the catch header only
ser=(); [ "$gf" = 1 ] && ser=(-e '\[Serializable\]')   # [Serializable] alone is banned only where every TFM is net8.0 or newer
grep -rlP --include='*.cs' "${xg[@]}" 'class\s+\w+\s*(\([^)]*\))?\s*:\s*[\w.]*Exception\b' $SRC | xargs -r grep -nE "${ser[@]}" -e 'SerializationInfo' -e 'StreamingContext' -e 'ISerializable' -e 'GetObjectData' -e '\.Data\[' -e '\.Data\.Add\s*\(' -e 'pragma warning disable CA1032'   # 07a, in files that declare an exception type only
grep -rnP --include='*.cs' "${xg[@]}" 'record\s+(class\s+)?\w+\s*(\([^)]*\))?\s*:\s*[\w.]*Exception\b' $SRC                                                  # 07b
```

## The Behaviour Table

Package validation and the public-API analyzers are blind to behaviour: five planted breaks (a changed thrown type, a nulled
property, a failure turned into a result, a swallowed cancel, a new leaf for an existing exit) packed clean under both, and the
table caught each (measured 2026-10-11). Behaviour is API, so one data table pins which `catch` fires, throw versus return, and the
promised property values. It runs against the source and against the last published package in one `dotnet test --solution`
(`CS-CI-01`). A change to any pinned outcome is a MAJOR at 1.0 and later, even when the API only grew (`CS-API-14` reads the table diff).

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CS-ERR-12 | [cli-wrapper] Keep exactly one table as data at `tests/Ocx.Sdk.FakeCliTests/behavior-table.json`: `{"schema":1,"rows":[...]}`, unique kebab-case ids, every row with `id`, `since`, `op`, `argv`, `expect`. The harness in `tests/Ocx.Sdk.FakeCliTests/Behavior/` loads it with `JsonDocument` and runs one theory over the row ids. Mandatory rows (the `Mandatory_rows_are_present` test fails when one is missing): `cmd-usage`, `cmd-temp-fail`, `cmd-unknown-code`, `cmd-garbage-error-document`, `report-unknown-member-tolerated`, `report-unknown-status-fails-closed`, `decode-truncated-json`, `decode-unknown-enum-value`, `decode-unknown-union-tag`, `decode-missing-required`, `passthrough-child-exit-is-data`, `timeout-is-sdk-type`, `caller-cancel-is-oce`, `launch-missing-binary`, `launch-not-executable` (`os: posix`), `contract-version-mismatch`, `report-then-fail-partial-document`, `secret-canary-not-in-message`, `retry-only-on-temp-fail-nonmutating`. Every `Ocx*Exception` constructed in `src` is the `expect.type` of some row, added in the PR that adds the throw. Filter rows newer than the SDK under test by `since`; never `Skip` them. | Four consumers read the table: the source run, the baseline twin, the contract tier and the diff guard. Expected outcomes in code are what an agent edits to go green. A skipped row still counts toward `--minimum-expected-tests` (`CS-TEST-06`). `JsonDocument` keeps the loader working in reflection-disabled test projects (`CS-JSON-03`). | Checks C 12a (schema, unique ids, 19 or more rows, required keys, jq exits 1), 12b (exception types without a row) and 12c (`InlineData`, reflection decode or `Skip` in the harness) print offenders. Watched red and green; deleting a mandatory row turns `Mandatory_rows_are_present` red, and a table of only future rows fails with `No data found` (measured 2026-10-11). | MUST |
| CS-ERR-13 | [cli-wrapper] Rows assert catch semantics, never exact types or message text. `expect.type` names a type in the thrown object's base chain; `catchAs` lists the clauses that must fire and `notCatchAs` those that must not; only the listed `props` are read and `Message` is never one. The unknown-exit row uses a code outside the tool's table (example 200). Pin `null` only where the property's XML doc promises null. Forbidden in `Behavior/`: exact `ThrowsAsync<T>`, `ThrowsAnyAsync<Exception>`, `Record.Exception*`, `GetType() ==` and Verify snapshots. | The library change rules allow a more derived exception and new message text. `ThrowsAsync<OperationCanceledException>` failed on a `TaskCanceledException`, `ThrowsAnyAsync<Exception>` passed on everything, and a snapshot went red on an allowed addition and green on 4 of 5 breaks. | Checks C 13a prints forbidden forms; on a green tree it prints exactly one line, the canary row's `notContains` reader of `.Message`, 13b prints a `Message` prop key and 13c the unknown-exit code. Watched red and green (measured 2026-10-11). | MUST |
| CS-ERR-14 | [cli-wrapper] The `Behavior/` harness is the executable-resolution tier of `CS-TEST-03`, the one place an apphost is launched. It uses only the public SDK surface and reaches the fake only through the SDK's executable-path option, pointing at a post-build copy of the fake's apphost named as the tool (`FakeAsOcx` target). No internal type, `InternalsVisibleTo` member or process seam. Every row that sleeps carries `timeoutMs` or `cancelAfterMs` of 1000 or less. | The same files must compile against the previous package, which has none of today's internals; the source tier is a friend assembly, so only the twin's compile sees a leak. A hang regression must fail in seconds (`CS-TEST-04`). | Checks C 14a (the apphost copy target) and 14b (bounded sleeps) print offenders. From the second release `dotnet build tests/Ocx.Sdk.FakeCliTests.Baseline --no-incremental` exits 1 with CS0122 on an internal. Watched red and green (measured 2026-10-11). | MUST |
| CS-ERR-15 | [cli-wrapper] From the second release, a twin `tests/Ocx.Sdk.FakeCliTests.Baseline` compiles `Behavior/*.cs` and the table from `Ocx.Sdk.FakeCliTests` and runs them against the last published package. It has no sources of its own, references the SDK by `PackageReference` at exactly `$(OcxBaselineVersion)` (a CPM `PackageVersion`; never a range, a float or a `ProjectReference` to `src`), keeps its own `AssemblyName` (never a friend) and bakes `--minimum-expected-tests`. `OcxBaselineVersion` is the one property that also sets `PackageValidationBaselineVersion`. The test `Sdk_under_test_is_the_expected_artifact` compares `AssemblyMetadata("BaselineVersion")` with the SDK's informational version: equal in the twin, at least in the source tier. | One property keeps the API gate and the behaviour gate on one release. A mis-wired baseline silently tests the source twice, and assembly `Location` cannot tell the copies apart because the package DLL is copied beside the test. An empty `Version` is a restore error, so the twin starts with the first baseline bump (`CS-API-15`). Cost: 1.9 s warm. | Checks C 15a (property equality), 15b (`ProjectReference` to `src`), 15c (one provenance test) and 15d (twin lacks the minimum) print offenders. 15a, 15b and 15d run only when the twin exists, and 15a also prints when a baseline is set without one. Watched red with a mismatched version, a `ProjectReference` and a missing twin, green on the twin and on a first-release tree (measured 2026-10-11). | MUST |
| CS-ERR-16 | [cli-wrapper] CI runs `tests/check-table-diff.sh` (below) against the merge base. It fails a PR that deletes a row or edits an existing row's `expect`, `since`, `op`, `os`, `argv` or `setup`, unless the same diff adds that row's first `supersedes: {before, expect}` block (a row that already carries one gets no free edit, and changing an existing block's `before` or `expect` fails on its own). `Row.ExpectFor(sdkVersion)` returns the old expectation below `before`. At each baseline bump, delete every `supersedes` whose `before` is at or below the new baseline. | The characteristic agent move is editing the expectation to match the new behaviour; this makes that edit a visible, versioned decision. A stale block is the twin of a stale `CompatibilitySuppressions.xml`. | Checks C 16a runs the guard (exit 0; a missing script or merge base prints `16a failed`) and 16b the stale check (prints `STALE`). The guard prints each violation once, on stdout, so a combined `> log 2>&1` capture is not truncated. Watched red on an edited `expect.type`, a deleted row, a raised `since`, an `expect` edit on a row that already had `supersedes`, a rewritten `before` or `expect` inside an existing block, and a removed block plus an `expect` edit; green on unchanged, edit plus a first `supersedes`, a new row and a block deleted alone at a baseline bump (measured 2026-10-11). | MUST |
| CS-ERR-17 | [cli-wrapper] The contract-tier project links the same `behavior-table.json` and, when armed by the contract environment variable, runs every row that has a `contract` block: the real `argv` and the subset of `props` the pinned tool satisfies. While the pinned tool prints no error document the subset omits `ErrorKind`. | The fake can lie; the subset keeps it honest. A released tool satisfied `cmd-usage` on the exit code and name but emitted no `error.kind`. | Checks C 17a prints a `contract` block that names `ErrorKind` while the tested version predates the error document; 17b prints the contract project file if it does not link the table. Watched red and green (measured 2026-10-11); unverified against a real tool here. | SHOULD |

```bash
# Checks C. Run E0, then these from the repository root; each command prints violations, empty output is the pass (jq -e exits 1 on false; 13a: see its row). They bind [cli-wrapper] (TOOL set).
if [ -n "${TOOL:-}" ]; then
T=$D/behavior-table.json
jq -e '.schema==1 and (.rows|length)>=19 and ([.rows[].id]|length)==([.rows[].id]|unique|length) and all(.rows[]; (["id","since","op","argv","expect"]-keys)==[])' "$T" >/dev/null || echo "12a table shape"
comm -23 <(grep -rhoE --include='*.cs' "${xg[@]}" 'new\s+Ocx[A-Za-z]+Exception' $SRC | sed -E 's/new[[:space:]]+//' | sort -u) <(jq -r '.rows[].expect.type' "$T" | sort -u)         # 12b
grep -rnE --include='*.cs' -e 'InlineData' -e 'JsonSerializer\.Deserialize' -e 'Skip *=' "$D/Behavior"                                         # 12c
grep -rnE --include='*.cs' -e 'ThrowsAsync<' -e 'ThrowsAnyAsync<' -e 'Record\.Exception' -e 'GetType\s*\(\s*\) *==' -e '\.Message\b' -e 'Verifier\.Verify' "$D/Behavior"   # 13a
jq -e '[.rows[].expect.props // {} | keys[]] | all(. != "Message")' "$T" >/dev/null || echo "13b Message prop"
[ "$(jq -r '.rows[] | select(.id=="cmd-unknown-code") | .argv[1]' "$T")" = 200 ] || echo "13c unknown code"
grep -L 'DestinationFiles="$(OutDir)ocx' "$D/Ocx.Sdk.FakeCliTests.csproj"                                                                             # 14a (ocx: example tool name)
jq -e '[.rows[] | select(.argv[0]=="sleep") | (.setup.timeoutMs // .setup.cancelAfterMs)] | all(. != null and . <= 1000)' "$T" >/dev/null || echo "14b"
Bd=$D.Baseline   # the twin exists from the second release: 15a, 15b, 15d and 16b run only then
a=$(dotnet msbuild "$PRJ" -getProperty:PackageValidationBaselineVersion) || echo "15a msbuild failed"
if [ -d "$Bd" ]; then
  [ -n "$a" ] && [ "$a" = "$(dotnet msbuild "$Bd" -getProperty:OcxBaselineVersion)" ] || echo "15a"
  grep -n 'ProjectReference.*src/' "$Bd/Ocx.Sdk.FakeCliTests.Baseline.csproj"                              # 15b
  grep -L 'minimum-expected-tests' "$Bd/Ocx.Sdk.FakeCliTests.Baseline.csproj"                              # 15d
else [ -z "$a" ] || echo "15a baseline set, twin missing"; fi
[ "$(grep -rc 'Sdk_under_test_is_the_expected_artifact' "$D/Behavior" | awk -F: '{s+=$2} END {print s}')" = 1 ] || echo "15c"
mb=$(git merge-base "$BASE" HEAD) && base=$(mktemp) && git show "$mb:$T" > "$base" && tests/check-table-diff.sh "$base" "$T" || echo "16a failed"; rm -f "$base"   # 16a
if [ -d "$Bd" ]; then   # 16b
  BV=$(dotnet msbuild "$Bd" -getProperty:OcxBaselineVersion)
  min=$(jq -r '.rows[] | select(.supersedes) | .supersedes.before' "$T" | sort -V | head -1)
  [ -z "$min" ] || [ "$(printf '%s\n%s\n' "$min" "$BV" | sort -V | head -1)" != "$min" ] || echo "STALE supersedes at or below $BV"
fi
jq -e '[.rows[] | select(.contract) | .contract.props | keys[]] | all(. != "ErrorKind")' "$T" >/dev/null || echo "17a"
c=$CT/Ocx.Sdk.ContractTests.csproj; test -f "$c" || echo "17b MISSING $c"; grep -L 'behavior-table.json' "$c"   # 17b
fi
```

```bash
#!/usr/bin/env bash
# tests/check-table-diff.sh <base-table.json> <head-table.json>: prints each violation once and exits 1. It fails a deleted row, a changed expect/since/op/os/argv/setup, and a rewritten existing supersedes block. The only allowed edits are a row's first supersedes block beside the change it explains, and deleting a block alone (a baseline bump).
base=$1; head=$2
out=$(jq -n -r --slurpfile b "$base" --slurpfile h "$head" '
  ($h[0].rows | map({key: .id, value: .}) | from_entries) as $H |
  $b[0].rows[] | . as $r | ($H[$r.id]) as $n |
  if $n == null then "DELETED row \($r.id)"
  elif ($r.supersedes != null and $n.supersedes != null and $n.supersedes != $r.supersedes) then "REWROTE supersedes of row \($r.id)"
  elif (($n.expect != $r.expect) or ($n.since != $r.since) or ($n.op != $r.op) or ($n.os != $r.os) or ($n.argv != $r.argv) or ($n.setup != $r.setup)) and ($r.supersedes != null or $n.supersedes == null) then "CHANGED row \($r.id) without a new supersedes"
  else empty end') || exit 2
[ -z "$out" ] || { printf '%s\n' "$out"; exit 1; }
```

## What Agents Get Wrong Here

Ranked by how often each bites; the counts are human-written proxies and the order is judgement.

1. **`catch (Exception e) { throw new OcxXException(e); }` around awaits, or "fixing" CA1031 with a filter that still returns.** A cancel becomes an SDK failure. `CS-ERR-05`, `CS-ERR-06`.
2. **`JsonSerializer.Deserialize<T>(stdout)!` per command, so `JsonException` escapes or `null` flows on.** `CS-ERR-04`.
3. **Maps every nonzero exit, `exec` children included, to a category.** A child's code collides with the tool's. `CS-ERR-03`.
4. **Hard-codes one exit enum from the branch it read, casts the status, or maps `error.kind` to a type.** `CS-ERR-02`.
5. **Goes red on a behaviour row, then edits its `expect`, raises `since`, deletes it or adds `Skip`.** `CS-ERR-12`, `CS-ERR-16`.
6. **Reads a green `dotnet pack` as "no breaking change" and ships a patch that changes a thrown type.** Both API gates are blind to behaviour. `CS-ERR-12`, `CS-ERR-15`.
7. **Ports a reference SDK's 26 exception classes, unsealed.** `CS-ERR-01`.
8. **Copies `[Serializable]` and a `SerializationInfo` constructor from a Microsoft sample.** Only SYSLIB0051 under the gate stops it. `CS-ERR-07`.
9. **Puts argv, the stderr tail or environment in `Message`, or in `Exception.Data`.** `CS-ERR-08`.
10. **Writes compat tests as `ThrowsAsync<OperationCanceledException>`, `ThrowsAnyAsync<Exception>` or `ex.Message ==`, or re-accepts a Verify snapshot.** `CS-ERR-13`.
11. **Wires the baseline as a floating version or a `ProjectReference`, or reaches into internals from `Behavior/`.** It tests the source twice. `CS-ERR-14`, `CS-ERR-15`.
12. **Treats the temp-fail code alone as retryable, or throws a guard synchronously before the first `await`.** `CS-ERR-10`, `CS-ERR-09`.
13. **Forks the behaviour table for the contract tier, or pins `ErrorKind` against a tool that prints no error document.** `CS-ERR-17`.
