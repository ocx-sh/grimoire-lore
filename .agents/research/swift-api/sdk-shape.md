---
title: Swift SDK wrapping the ocx CLI - module layout, discovery, exit and signal mapping, cancellation, timeout, capture limits, envelope, seams, dependency budget
topic: swift / API and SDK shape (SW-API) - revised W3-3, rows M-D-09..M-D-12 (SDK-over-CLI)
agent: research-lang worker "api/sdk-shape" (wave 3, W3-3)
model: sonnet
date_researched: 2026-10-10
sources_count: 22
fixtures: /home/mherwig/.cache/research-lang/swift-tools/fixtures/sdk-shape/
scope: |
  Covers one deliverable, built and run: a Swift package (467 source lines, 487 test lines) that wraps the `ocx` CLI the way `ocx-sdk-python@80136dde4162` does,
  on Swift 6.4.0 and 6.3.3 (Linux, swift-subprocess 1.0.1, tools 6.2, Swift 6 mode). It decides the module layout, binary discovery, argument building, the
  exit/signal mapping, the public error type, the cancellation and timeout contract (including the unimplemented SW-IO-26/Q-IO-3 path), capture limits (measured
  against real `ocx` 0.6.5), the JSON decode and evolution rules, the version gate, the test seam, the 100% coverage gate and the dependency budget.
  Imports, does not restate: SW-IO-03/-23/-24/-26/-27/-28, SW-CLI-01, SW-ERR-20, SW-TEST-13/-15/-16, SW-API-01/-04/-07 (sibling `library-api-shape.md`).
  Not covered: Network/registry clients (W3-4), swift-argument-parser CLIs. macOS and Windows: every statement is "unverified: read only" (owner Q7); the fixtures ran in Docker on Linux x86_64 only.
---

# Swift SDK wrapping the `ocx` CLI

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   - 2.1 [What the Python SDK fixes, and where Swift must differ](#21-what-the-python-sdk-fixes-and-where-swift-must-differ)
   - 2.2 [The fixture package, and how every claim was run](#22-the-fixture-package-and-how-every-claim-was-run)
   - 2.3 [Module layout and the dependency budget](#23-module-layout-and-the-dependency-budget)
   - 2.4 [Binary discovery](#24-binary-discovery)
   - 2.5 [Argument building and environment](#25-argument-building-and-environment)
   - 2.6 [The spawn module: teardown, typed failures, one pure mapper](#26-the-spawn-module-teardown-typed-failures-one-pure-mapper)
   - 2.7 [Exit status and signal mapping (owner Q6)](#27-exit-status-and-signal-mapping-owner-q6)
   - 2.8 [The public error type](#28-the-public-error-type)
   - 2.9 [Cancellation and timeout contract](#29-cancellation-and-timeout-contract)
   - 2.10 [Capture limits, measured](#210-capture-limits-measured)
   - 2.11 [JSON decoding: reports, the error envelope, evolution](#211-json-decoding-reports-the-error-envelope-evolution)
   - 2.12 [The version gate](#212-the-version-gate)
   - 2.13 [The test seam and the 100% line gate](#213-the-test-seam-and-the-100-line-gate)
   - 2.14 [Corrections to earlier rules](#214-corrections-to-earlier-rules)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- **Two targets, one importer.** `OcxSDK` (the public library product) depends on `OcxSpawn` (a non-product target); only `OcxSpawn` lists the `Subprocess` product. SwiftPM does not enforce this: adding `import Subprocess` to `OcxSDK` built and passed on 6.4 and 6.3, even with `InternalImportsByDefault` and `MemberImportVisibility`. The grep is the enforcement.
- **Dependency budget holds at exactly one direct dependency** (`swift-subprocess` from `1.0.1`), resolved graph `swift-subprocess 1.0.1 -> swift-system 1.8.1`; the linked binary needs only `libFoundationEssentials` (`ldd`), with the default `SubprocessFoundation` trait on or off. `Synchronization` and `FoundationEssentials` ship with the toolchain.
- **Discovery order, resolved once at `init`:** explicit path, `OCX_SDK_EXE`, `PATH` (absolute entries only, parent directory not group/other-writable), then `$OCX_HOME` or `$HOME/.ocx` `/symlinks/ocx.sh/ocx/cli/current/content/bin/ocx`. It reads an environment snapshot, never `ProcessInfo` inside the resolver.
- **Argv is `--format json --color never`, then global flags, command, positionals;** a positional starting with `-` is refused before spawn (CWE-88).
- **Signal mapping:** `.exited(n)` is `n`; `.signaled(s)` is `128 + s` with `s` kept in `signal`. The raw pass-through is red: SIGTERM becomes status 15 and is misfiled as `unknownStatus`. Status `>= 128` (or negative, a Windows NT status) is `crashed`; 2-63 and 88-127 are `unknownStatus`; 1 and 64-87 are the named table copied from `ocx_exit/src/exit_code.rs`.
- **The Python SDK's `ExitCode` stops at 86;** ocx 5de9d777eb7d assigns 87 (`RegistryDeleteUnsupported`). A copied table must be diffed against the Rust file, not against the Python one.
- **One public error:** `struct OcxError: Error, Sendable` with an open `Code`, `exitStatus`, `signal`, `stderr`, `envelope`, `cause` (SW-ERR-20). Cancellation is `CancellationError`, never an `OcxError`. The internal `ProcessFailure` enum stays `package`-level, where SE-0413 allows typed throws.
- **Cancellation is implemented and pinned:** after the child is reaped, `Task.isCancelled` throws `.cancelled`, which the SDK maps to `CancellationError`. Without that line a cancelled call returns `crashed: ocx x exited 143` (red). With `createSession` plus a group `.send(signal: .terminate, toProcessGroup: true, ...)` the grandchild is gone (`pgrep` exit 1); without it two `sleep` grandchildren survive (`pgrep` exit 0).
- **Timeout beats a later cancel, by construction, 100/100:** the timer is a task-group race with an injectable `sleep`; `timedOut` iff the timer returned before the child finished. The reversed order is red 100 of 100 on both toolchains.
- **Capture limits:** real ocx 0.6.5 stdout is at most 4,040 bytes (remote catalog), recorded fixtures at most 7,145 bytes; stderr is 1.4 KB at debug but 56-68 KB for a traced query and 1,372,005 bytes for a traced `package pull`. The prototype's 256 KiB stderr default is red; use one symmetric `captureLimit` of 4 MiB per stream.
- **Decoding is tolerant by default:** `decode` for the fields ocx always writes, `decodeIfPresent` for the rest, unknown keys ignored. A strict "no unknown key" decoder rejects the recorded 0.6.5 `about` document (it adds `features`). `container.allKeys` on a `CodingKeys` container never lists unknown keys, so SW-IO-28's strict recipe needs a raw-key container.
- **ocx prints a structured failure envelope on stdout** (`{schema_version, command, exit_code, error: {kind, message, detail?, context}}`); attach it with `try?`, never throw while building an error, and classify only on the exit status (real 0.6.5 labels exit 81 with `kind: "permission_denied"`).
- **Version gate:** probe `ocx version` once per handle family, cache only success, refuse older, accept newer; the comparator ignores a pre-release tail.
- **Seam = values, not protocols:** `ProcessRunner(captureLimit:killGrace:sleep:)`, two pure static functions (`status`, `map`) and a `package init(executable:...)`; the real spawn path runs a fake `ocx` script out of process. 283 of 283 `Sources/` lines covered; the SW-TEST-16 gate exits 0, and 123 (jq `false`) at 259/283 once one test file is deleted.
- **Under `InternalImportsByDefault`** a `package` seam initializer needs `package import OcxSpawn`; `import OcxSpawn` is a compile error (red on both toolchains).
- **Windows is unverified:** `TerminationStatus` has only `.exited(DWORD)` there, so the `.signaled` arm sits in `#if !os(Windows)`; the negative-status branch is the read-only guard.
- **Twenty-two verifications watched red** on a planted violation with a green twin; two plants stayed green on purpose and are reported as such (typed `allKeys`, transitive import).

## Findings

### 2.1 What the Python SDK fixes, and where Swift must differ

The Python SDK is the fleet's only SDK-over-ocx; its choices are the baseline (all `ocx-sdk-python@80136dde4162:src/ocx_sdk/`):

| Concern | Python (file:line) | Swift decision |
|---|---|---|
| One spawn module, primitives only | `_process.py:4-18` ("Every ocx spawn in this SDK goes through this module") | `OcxSpawn` target, `package` access (SW-IO-26) |
| Discovery | `_bootstrap.py:245-292` (`exe`, `OCX_SDK_EXE`, `PATH`, install symlink); trust rules `:430-460` | same order and trust rules, section 2.4 |
| Resolved once per handle | `_client.py` class docstring ("Construction resolves the binary once") | `Ocx.init` resolves and pins `executable` |
| argv | `_client.py:119` `_JSON = ("--format", "json", "--color", "never")`; `_process.py:157-196` `compose_argv`, dash guard `:187-193` | same |
| Kill ladder | `_process.py:68` `KILL_GRACE = 5.0`; `:763-781` terminate group, wait, kill group; `:473-481` `start_new_session` | `createSession` + group `.send(signal: .terminate ...)` (5 s), section 2.6 |
| Async cancel | `_process.py:591-599` terminate the group, "No grace wait and no awaits at all here" | `Task.isCancelled` check after `run` returns; teardown is Subprocess's job |
| Exit status to error | `_errors.py:28-51` `ExitCode` (0-86), `:118-165` `OcxProcessError`; `_process.py:822-831` unknown status becomes the base class | open `Code` struct, section 2.8 |
| Signal-killed child | `_process.py:826-829` "A signal-killed ocx exits with a status ocx never assigns (137)"; Python keeps the raw `returncode` | `128 + s` plus `signal` (owner Q6) |
| Capture | `_process.py:224-227` "A capture is held whole in memory and has no ceiling by design" | bounded, `.outputTooLarge(limit:)`, section 2.10 |
| Decode | `_results.py:6-8` unknown keys ignored; `:206-222` `_need` names the missing field; `:154-178` `_decode` | `decode`/`decodeIfPresent`, section 2.11 |
| Failure envelope | `_results.py:319-414` `ErrorEnvelope`, `error_envelope(err)` | `ErrorEnvelope?` on `OcxError`, section 2.11 |
| Version gate | `_client.py:201-213` `_CompatCell`, `:831-857` `gate`/`accept` | `CompatCell` + `Mutex`, section 2.12 |
| Seams | `_process.py:93-106` `Redact`, `Clock`, `PopenFactory`, `ExecFactory` | values and pure functions, section 2.13 |
| Coverage bar | `pyproject.toml:89-106` `fail_under = 100` | SW-TEST-16 gate at 100 (owner Q4) |

The Go sibling in this repo reached the same decisions independently: version handshake lazy, once per client, cached only on success (`go-api.md` GO-API-18, line 196); a signal-killed child becomes `128 + n` at the spawn point (GO-API-19, line 218); and the spawn point checks its own timeout cause before classifying the exit, otherwise it reports its own timeout as `Code: 137` (GO-API-20, line 231). The Swift contract in 2.9 is the same ordering rule.

### 2.2 The fixture package, and how every claim was run

`fixtures/sdk-shape/pkg/` is a real package: `Package.swift` (tools 6.2, `swiftLanguageModes: [.v6]`), `Sources/OcxSpawn/ProcessRunner.swift` (127 lines), `Sources/OcxSDK/{Ocx,OcxError,Discovery,Reports}.swift` (340 lines), `Tests/OcxSDKTests/` (487 lines, Swift Testing, every test `.timeLimit`). The fake `ocx` is a 40-line shell script (`Tests/OcxSDKTests/fake-ocx/ocx`) whose behaviour is selected by the environment variable `FAKE_OCX_MODE` (so the SDK's own argv is never altered, and the environment-override path is exercised on every call). Modes: `ok`, `argv`, `env`, `exit1`, `exit64`, `exit75`, `exit79`, `exit87`, `exit99`, `exit132`, `sigterm` (`kill -TERM $$`), `sigkill`, `sleep-grandchild`, `term-ignore-grandchild`, `stdout-bytes`, `stderr-bytes`, `exit81-envelope`, `exit81-badenvelope`, `badjson`, `empty`. Documents are real ocx output recorded from 0.5.8 (copied from `ocx-sdk-python/tests/fixtures/cli/about.json`) and 0.6.5 (recorded from the installed binary on 2026-10-10, plus a failure envelope). The resources are found with `Bundle.module` and `.copy`; the executable bit survives the copy (the tests run the script).

Every red below is a one-line mutation of a copy of the package (`variant.sh`, `redsuite.sh`), run on 6.4.0 and 6.3.3, one variant at a time. (A first attempt ran two suites at once against the same copy and produced exit 132/137 noise; the numbers in this file are from a clean sequential rerun, `logs/redsuite-final.txt`.)

### 2.3 Module layout and the dependency budget

```swift
// Package.swift (fixtures/sdk-shape/pkg)
dependencies: [.package(url: "https://github.com/swiftlang/swift-subprocess", from: "1.0.1")],
targets: [
    .target(name: "OcxSpawn", dependencies: [.product(name: "Subprocess", package: "swift-subprocess")], swiftSettings: sdkSettings),
    .target(name: "OcxSDK",   dependencies: ["OcxSpawn"], swiftSettings: sdkSettings),
    .testTarget(name: "OcxSDKTests", dependencies: ["OcxSDK", "OcxSpawn", .product(name: "Subprocess", package: "swift-subprocess")],
                resources: [.copy("fake-ocx"), .copy("recorded")]),
],
swiftLanguageModes: [.v6]
// sdkSettings = InternalImportsByDefault + MemberImportVisibility (SW-API-01 of library-api-shape)
```

- **Only `OcxSDK` is a product.** `OcxSpawn` is reachable by `package` access ([SE-0386](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0386-package-access-modifier.md)); `ProcessRunner`, `Completed` and `ProcessFailure` are `package`, so no consumer sees them. Under `InternalImportsByDefault`, a `package` declaration that mentions `ProcessRunner` needs `package import OcxSpawn` in that file: with a bare `import` the compiler says `initializer cannot be declared package because its parameter uses an internal type` (`red-n`, exit 1 on 6.4 and 6.3).
- **The manifest does not keep Subprocess out of `OcxSDK`.** `red-g` adds `import Subprocess` to `OcxSDK/Ocx.swift`: `swift test` exits 0 on 6.4.0 and 6.3.3, even with both upcoming features on. SwiftPM puts transitive modules on the import path. SW-IO-26's "only the spawn module imports `Subprocess`" is therefore a grep (G1 below: output `Sources/OcxSDK/Ocx.swift` on the plant, empty on the twin), not a layout property.
- **Budget (owner Q4), measured.** `swift package dump-package | jq -e '[.dependencies[] | .sourceControl[0].location.remote[0].urlString] == ["https://github.com/swiftlang/swift-subprocess"]'` exits 0 on the package and 1 when `swift-log` is added (`plants/dep-red`). `swift package show-dependencies` prints `swift-subprocess 1.0.1 (traits: SubprocessFoundation)` over `swift-system 1.8.1`. Release probe binary, `ldd`: `libFoundationEssentials.so` only, with the default `SubprocessFoundation` trait (3,818,816 bytes) and with `traits: []` (3,749,280 bytes): the trait does not pull full Foundation on Linux in 1.0.1, so there is no reason to turn it off. The toolchain does not ship Subprocess (`find /usr/lib/swift -iname '*subprocess*'` is empty on 6.4.0 and 6.3.3), although the [Swift 6.4 release post](https://www.swift.org/blog/swift-6.4-released/) announces Subprocess 1.0 as stable: it stays a package dependency.
- **Stdlib-adjacent modules used:** `Synchronization` (`Mutex`, Swift 6.0) for the version memo; `FoundationEssentials` for `JSONDecoder`, `Data`, `ProcessInfo` (guarded `#if canImport(FoundationEssentials)` with a `Foundation` fallback, SW-IO-04). Test-only: Swift Testing and full `Foundation` (`Bundle`, `FileManager`).
- **Floor.** swift-subprocess `from: "1.0.1"`: 1.0.0 leaks one descriptor per early-break `.sequence` (SW-IO-06) and 1.0.1 fixes it, makes pipes `O_CLOEXEC` atomic and prefers `posix_spawn` ([release notes](https://github.com/swiftlang/swift-subprocess/releases/tag/1.0.1), published 2026-10-09). Tools 6.2 matches the dependency's own `// swift-tools-version: 6.2` ([Package.swift](https://github.com/swiftlang/swift-subprocess/blob/1.0.1/Package.swift)).

### 2.4 Binary discovery

`Sources/OcxSDK/Discovery.swift:16-33`, `OcxLocation.resolve(_:environment:)`:

```swift
// Correct: explicit > OCX_SDK_EXE > trusted PATH entries > install symlink; reads a snapshot
for entry in (environment["PATH"] ?? "").split(separator: ":", omittingEmptySubsequences: true) {
    guard entry.hasPrefix("/"), isTrustedDirectory(String(entry)) else { continue }   // CWE-426
    let candidate = "\(entry)/ocx"
    if isExecutableFile(candidate) { return candidate }
}
```

```swift
// Incorrect: shells out, trusts the working directory, reads the ambient process environment in the resolver
let path = try await run(.name("which"), arguments: ["ocx"], output: .string(limit: 1024)).standardOutput  // GCD-era habit
```

- **Why these four tiers.** They mirror `_bootstrap.py:245-292` exactly (`OCX_SDK_EXE` at `:68`, the install symlink components at `:78`). The PATH rule has two halves from `_bootstrap.py:430-460`: relative or empty entries are skipped because a relative entry is the working directory in disguise, and a hit whose parent directory is group- or other-writable is refused. `DiscoveryTests.pathSkipsRelativeAndWritableEntries` plants both; deleting the `guard` (`red-l`) makes the world-writable directory win (`returned ".../writable/ocx"`), exit 1 on both toolchains.
- **Resolve once, at `init`.** `Ocx.init(location:...) throws` resolves against `ProcessInfo.processInfo.environment` overlaid with the `environment:` overrides (a nil override deletes the key, so a narrowed environment narrows discovery) and pins `executable`; a long-lived handle that wants a replaced binary is rebuilt, as `_client.py` documents. The resolver itself takes `[String: String]`, which is the test seam.
- **`.name("ocx")` is not used for the resolved path.** The spawn module dispatches `contains("/") ? .path : .name` (SW-IO-26), so a resolved absolute path never goes through Subprocess's own `PATH` search.
- **Windows is unverified: read only.** `.exe` suffixing and the `cwd` exclusion that `_which` applies on Windows (`_bootstrap.py:430-460`) are not ported; the Linux resolver uses `stat`/`access` from Glibc/Musl/Darwin.

### 2.5 Argument building and environment

`Ocx.compose(global:command:positionals:)` (`Ocx.swift:59-64`) returns `["--format","json","--color","never"] + global + command + positionals` and throws `OcxError(code: .invalidArgument)` if any positional starts with `-`. Global flags go first because ocx's clap grammar takes them there only (`_process.py:157-196`). `argvIsComposedGlobalFlagsFirst` runs the fake in `argv` mode and compares the eight lines; `leadingDashPositionalIsRefused` is red when the guard is neutralised (`red-m`, `an error was expected but none was thrown`, exit 1 on both).

Environment overrides are `[String: String?]` and reach the child through `Environment.inherit.updating(overrides)` (`ProcessRunner.swift:93-94`). The SW-IO-24 hazard (`var c = self.config(); c.environment = e; run(self.config(), ...)`, `swiftly@c8cf2e35bfca:Sources/SwiftlyCore/ModeledCommandLine.swift:64-71`) is proved absent two ways: `environmentOverridesReachTheChild` sees the sentinel, and because the fake selects its mode through the environment, dropping the override (`red-i`) fails nearly every test (exit 1).

### 2.6 The spawn module: teardown, typed failures, one pure mapper

`ProcessRunner` (`Sources/OcxSpawn/ProcessRunner.swift`) is a `package struct` of values: `captureLimit`, `killGrace`, `sleep`. Its parts:

- **Teardown.** `platform.createSession = true; platform.teardownSequence = [.send(signal: .terminate, toProcessGroup: true, allowedDurationToNextStep: killGrace)]` (lines 89-92). The implicit final step is a SIGKILL that "inherits `toProcessGroup` from the last explicit step, so descendants don't leak" ([SF-0037, line 754](https://github.com/swiftlang/swift-foundation/blob/main/Proposals/0037-subprocess-1.0.md)); `toProcessGroup` without `createSession` would signal the SDK's own group (`Teardown.swift:47-52` at swift-subprocess 1.0.1). The `term-ignore-grandchild` mode traps TERM and starts a `sleep 3001`; it is the case that needs the SIGKILL step.
- **Typed failures stay internal.** `package enum ProcessFailure: Error` has `executableNotFound`, `launchFailed`, `outputTooLarge(limit:)`, `timedOut(after:)`, `cancelled`, `ioFailed`. [SE-0413](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0413-typed-throws.md) calls untyped `throws` "the better default" and allows typed throws for module-internal code, which is exactly this; the public API stays untyped `throws` (2.8). `cancelled` is the member SW-IO-26's sketch lacked.
- **Two pure mappers**, so branches that no real child can reach are still unit-tested: `static func status(_: TerminationStatus) -> (code: Int32, signal: Int32?)` and `static func map(_: any Error, executable:, limit:) -> ProcessFailure`. `map` casts `error as? SubprocessError` and compares `.code` (never message text; `SubprocessError.context` is private, so the limit that tripped is not recoverable from the error, which is why the SDK uses one symmetric limit, 2.10). `SubprocessError.Code` has no public initializer, so a test cannot construct one; the non-`SubprocessError` branch is fed a local `struct Foreign: Error`, and the `failedToChangeWorkingDirectory` branch is reached with a real nonexistent `workingDirectory`.
- **stdout as bytes, stderr as text.** `output: .bytes(limit:)` for the JSON payload (no U+FFFD substitution, SW-IO-03), `error: .string(limit:)` because stderr is diagnostic.

### 2.7 Exit status and signal mapping (owner Q6)

`TerminationStatus` at swift-subprocess 1.0.1 (`Configuration.swift:756-782`): `.exited(Code)` always; `.signaled(Code)` only `#if !os(Windows)`; `Code` is `CInt` on Unix and `DWORD` on Windows.

```swift
// Correct (ProcessRunner.swift:110-117, tested over every case)
static func status(_ status: TerminationStatus) -> (code: Int32, signal: Int32?) {
    switch status {
    case .exited(let code): return (Int32(truncatingIfNeeded: code), nil)
    #if !os(Windows)
    case .signaled(let signal): return (128 + signal, signal)
    #endif
    }
}
// Incorrect: raw pass-through (red-a). SIGTERM -> status 15 -> OcxError.Code.unknownStatus; SIGKILL -> 9.
case .signaled(let signal): return (signal, signal)
```

The table (`OcxError.code(forExitStatus:)`, `OcxError.swift:72-93`), copied from [`crates/ocx_exit/src/exit_code.rs@5de9d777eb7d`](https://github.com/ocx-sh/ocx/blob/5de9d777eb7d/crates/ocx_exit/src/exit_code.rs) (the file says its values "follow BSD `sysexits.h` (64+), clear of shell-reserved (1-2) and signal-derived (128+) codes"; [sysexits(3)](https://man.freebsd.org/cgi/man.cgi?query=sysexits&sektion=3) defines 64-78):

| Status | `OcxError.Code` | Status | `OcxError.Code` |
|---|---|---|---|
| 0 | success (no error) | 80 | `auth` |
| 1 | `failure` | 81 | `policyBlocked` |
| 64 | `usage` | 82 | `dirtyRcBlock` |
| 65 | `dataError` | 83 | `transparencyLogUnavailable` |
| 69 | `unavailable` | 84 | `referrersUnsupported` |
| 74 | `ioError` | 85 | `unsupportedKeyBackend` |
| 75 | `tempFail` (the only retry-safe status, `isRetryable`) | 86 | `forgeCapabilityUnavailable` |
| 77 | `permissionDenied` | 87 | `registryDeleteUnsupported` |
| 78 | `config` | 2-63, 88-127 | `unknownStatus` |
| 79 | `notFound` | 128 or more, or negative | `crashed` |

- **Python drift.** `ocx-sdk-python@80136dde4162:src/ocx_sdk/_errors.py:28-51` stops at `FORGE_CAPABILITY_UNAVAILABLE = 86`; the Rust file (line 62) has `RegistryDeleteUnsupported = 87`, and `_process.py:822-831` files an unmapped status under the base `OcxProcessError`. A table copied from the Python SDK silently loses 87. The Swift test `tableCoversEveryStatus` walks all 256 byte values against an independently typed expectation; `child status` tests exit 87 through a real child.
- **`>= 128` is a crash, not an ocx status.** ocx never assigns it (`exit_code.rs:8`); a Swift trap exits 132 on Linux x86_64 (SW-CLI "New commitments"), a signal death is `128 + s`. `crashed` carries `signal` when the SDK saw a signal, so `exit(137)` and `SIGKILL` stay distinguishable even though `exitStatus` is 137 for both. The error text is the SDK's, never a parse of stderr: a crashed child's stderr is not ocx's.
- **Verified.** `childStatusMapsToCode` runs nine real children (`exit1`, `64`, `75`, `79`, `87`, `99`, `132`, `sigterm` -> 143/signal 15, `sigkill` -> 137/signal 9); `red-a` fails `terminationStatusCases` and four child cases on both toolchains (`error.exitStatus -> 15` against `143`).
- **Windows: unverified, read only.** The `.signaled` arm does not exist there; a child killed by an unhandled exception exits with an NT status such as `0xC0000005`, which `Int32(truncatingIfNeeded:)` turns negative. `case ..<0` routes it to `crashed`; the test `negativeStatusIsACrash` feeds `-1073741819` on Linux, which proves the branch, not the platform.

### 2.8 The public error type

```swift
public struct OcxError: Error, Sendable, CustomStringConvertible {
    public struct Code: RawRepresentable, Hashable, Sendable { public let rawValue: String; public static let notFound = Code(rawValue: "notFound") /* ... */ }
    public let code: Code;  public let message: String   // one sentence, no "Error:" prefix, no period
    public let exitStatus: Int32?;  public let signal: Int32?;  public let stderr: String
    public let envelope: ErrorEnvelope?;  public let cause: (any Error)?
    public var isRetryable: Bool { exitStatus == 75 }
}
```

This is SW-ERR-20 verbatim, and the one place where it improves on a closed enum: **a status a newer ocx adds is a new `Code`, never a source break** (ocx's own `ExitCode` is `#[non_exhaustive]`, `exit_code.rs:10`). SW-IO-26's sketch made `ProcessFailure` the public vocabulary (`throws(ProcessFailure)`); that conflicts with SW-ERR-20 and with SE-0413's "untyped is the better default". Resolution: `ProcessFailure` is `package`, the public surface is `async throws` documenting `OcxError` and `CancellationError`. Classification is by exit status only; `message` and `envelope.kind` are for people (2.11).

### 2.9 Cancellation and timeout contract

Cooperative cancellation is the language model ([TSPL, Task Cancellation](https://github.com/swiftlang/swift-book/blob/main/TSPL.docc/LanguageGuide/Concurrency.md): responding "usually means ... throwing an error like `CancellationError`"). swift-subprocess does not throw on cancel: the calling task's cancellation starts the teardown sequence ([README, Graceful Teardown](https://github.com/swiftlang/swift-subprocess/blob/1.0.1/README.md)) and `run` returns the dead child's `terminationStatus` (SW-IO-27: `.signaled(9)` with the default teardown, `.signaled(15)` / 143 with this SDK's SIGTERM-first sequence). The SDK therefore owns the decision, in `ProcessRunner.run` (`ProcessRunner.swift:79-80`):

```swift
if timerFired, let timeout { throw .timedOut(after: timeout) }   // 1. the timer finished before the child did
if Task.isCancelled { throw .cancelled }                          // 2. otherwise a cancelled caller never gets a result
return try outcome.get()
```

`Ocx.translate` maps `.cancelled` to `CancellationError()` and `.timedOut` to `OcxError(code: .timedOut)`.

- **The timer is a race in a task group, with an injectable `sleep`.** Two children: the spawn, and `try await sleep(timeout)` returning `.timer` (or `.timerAborted` when its own sleep is cancelled). The group loop records `timerFired = true` only if the spawn had not already finished (`if !finished`), so a late timer cannot turn a finished child into a timeout (`finishedChildBeatsLateTimer`: the injected sleep swallows its own cancellation and returns normally after the child is done; the result stays a result). Whichever child finishes first calls `group.cancelAll()`, and the loop keeps draining until the spawn child's teardown has completed, so `timedOut` and `cancelled` are thrown only after the process group is dead (no race for `pgrep`).
- **Precedence (Q-IO-3), proved by construction, not by timing.** `timerFirstWinsOverLaterCancel`: the injected `sleep` waits until the child's pid file exists, flips a `Mutex<Bool>`, and returns; the test cancels the outer task only after reading that flag; the child traps SIGTERM, so teardown is still running when the cancel lands (`killGrace` 300 ms). Expect `OcxError.code == .timedOut`. 100 iterations in ten batches of ten concurrent races: green on 6.4.0 (also `swift test --filter CancellationTests --repeat-until fail --maximum-repetitions 10` = 1,000 races, "Test run with 8 tests in 1 suite passed after 31.484 seconds"; the flag does not exist on 6.3: `error: Unknown option '--repeat-until'`, so five plain runs = 500 races green there). The mirror order, `cancelFirstWinsOverPendingTimer` (timeout 600 s, cancel after the child is up), expects `CancellationError`.
- **Red, both directions.** Swapping the two lines (`red-c`): 100 of 100 iterations fail with `Expectation failed: timedOut` on 6.4.0 and on 6.3.3. Deleting the `Task.isCancelled` line (`red-b`): the cancelled call returns a child result and surfaces as `crashed: ocx x exited 143` instead of `CancellationError`, in three tests.
- **No grandchild survives.** `cancelThrowsAndReapsGrandchild`, `cancelWithoutTimeoutAlsoThrows` and `timeoutKillsGrandchild` read the grandchild's pid from the fake's pid file and poll `kill(pid, 0)` until `ESRCH`; the external check `pgrep -af "sleep 300[01]"` after `swift test` exits 1 ("no survivor") on the package and 0 with a list of survivors when `teardownSequence`/`createSession` are removed (`red-h`, 97 `sleep` processes alive after the suite on 6.4).
- **Real ocx.** With `OCX_SDK_EXE` pointing at the installed ocx 0.6.5 (static musl binary copied to `fixtures/sdk-shape/real/ocx`), the env-gated contract tier decodes `about` and `version`, maps `package which --offline` to exit 81 (`policyBlocked`), and cancels a live `package pull ocx.sh/ocx/cli:latest` after 400 ms: `CancellationError`, and no process whose argv[0] is that binary remains (read from `/proc`). Not planted red (a single process dies either way); it is an observation.
- **`CancellationError` after completion is discarded.** If the child finished on its own at the instant of cancellation, `Task.isCancelled` still throws. A cancelled mutating call (`install`, `pull`) therefore means "outcome unknown, re-query": document it on the API.
- **SE-0504 does not change this.** `withTaskCancellationShield` (Swift 6.4, [SE-0504](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0504-task-cancellation-shields.md)) is for cleanup bodies; `run` still reports a cancelled child as a return value. Keep the explicit check.

### 2.10 Capture limits, measured

SW-IO-26's prototype carried 4 MiB stdout and 256 KiB stderr "without a source" (Q-IO-2). Sources found: real `ocx` 0.6.5 run on 2026-10-10 with `--format json --color never` and a throwaway `OCX_HOME`, plus the recorded corpus in `ocx-sdk-python` (74 JSON files under `tests/fixtures/{cli,results}`).

| Stream | What | Bytes |
|---|---|---|
| stdout | `about` 812; `version` 614; `status` 3,949; `index catalog` offline 3,947 / `--remote` 4,040 (largest real); `index list` 661-689; `package inspect ocx.sh/ocx/cli:latest` 2,562 | at most 4,040 |
| stdout | recorded fixtures: largest `results/cascade_repair.json` | 7,145 |
| stderr | `--log-level debug package pull` (cached) | 1,386 |
| stderr | `--log-level trace --remote index list` / `index catalog` / `package inspect` | 67,783 / 56,106 / 67,470 |
| stderr | `--log-level trace package pull ocx.sh/ocx/cli:latest` | **1,372,005** |

Decision: **one symmetric `captureLimit`, default 4 MiB per stream, configurable on `Ocx.init` and `ProcessRunner`.** Reasons: (1) stdout headroom is about 1,000x over the real maximum and 590x over the recorded one, so the limit is a runaway guard, not a size estimate; (2) 256 KiB is below a traced pull (1,372,005 bytes), so the prototype default turns `--log-level trace` into `outputTooLarge`: `traceSizedStderrFitsDefaultButNot256KiB` is red when the default is changed to `256 << 10` (`red-d1`, `Caught error: outputTooLarge: ocx wrote more than 262144 bytes to one stream`); (3) `SubprocessError`'s context is private (`Error.swift:43`), so with two different limits the SDK could not say which stream tripped, whereas one limit makes `.outputTooLarge(limit:)` exact; (4) the corpus does the same: `tuist@2f6ac74754bf:cli/Sources/XcodeGraph/Sources/XcodeGraphMapper/Utilities/SubprocessRunner.swift:33-34` passes `10 * 1024 * 1024` to both streams. Python's "no ceiling by design" (`_process.py:224-227`) does not transfer: Subprocess 1.0 made every limit explicit on purpose ([SF-0037, line 1035](https://github.com/swiftlang/swift-foundation/blob/main/Proposals/0037-subprocess-1.0.md): "Output factories now require an explicit limit ... replaced `.string`, which silently capped collection at 128 KB").

Planted: `stdoutOverLimit` (1,000 bytes against a 500-byte limit gives `.outputTooLarge`, message names 500); `red-d2` (`Int.max`) turns two tests red (`an error was expected but none was thrown`). Overflow tears the child down (`.outputLimitExceeded`, SW-IO-03).

### 2.11 JSON decoding: reports, the error envelope, evolution

There is no single success envelope: each command prints its own document (`ocx-sdk-python/_results.py:1-34` "One command, one result struct"), generated from the Rust types and published as [`https://ocx.sh/schemas/reports/v1.json`](https://ocx.sh/schemas/reports/v1.json) (vendored as `tests/fixtures/contract/reports.v1.json`, 272.7 KB; `tests/fixtures/contract/README.md` gives the presence-rule table). Failures are different: when a failing command wrote no report, ocx prints a failure envelope on **stdout** under `--format json` (`_results.py:319-414`, contract C-S1-1). Recorded from ocx 0.6.5:

```json
{"schema_version":1,"command":"package which","exit_code":81,"error":{"kind":"permission_denied","message":"failed to find package: ...","context":{}}}
```

- **Tolerant by default; the rule is three-way, from ocx's own table** (`tests/fixtures/contract/README.md`): ocx `T` (always written, non-null) -> `decode`; `Option<T>` always written (null when unset) or `skip_serializing_if` -> `decodeIfPresent`. `AboutInfo` (`Reports.swift:1-24`) decodes `version`, `registry`, `platforms` strictly and `libc`, `shell`, `home`, `channel` with `decodeIfPresent`; the two recorded releases differ (0.6.5 adds `features`, neither has `channel`) and both decode (`recordedAboutDocumentsDecode`); an invented `"future":{"x":1}` key decodes (`unknownFieldsAreTolerated`). A missing required field gives `OcxError(code: .malformedOutput, message: "ocx about output is malformed: missing field 'version'", cause: DecodingError)`; wrong type, non-JSON and empty stdout give `.malformedOutput` too. Red: `decode(String?.self, forKey: .channel)` makes both recorded documents fail (`red-e`, `missing field 'channel'`); a strict unknown-key decoder fails the 0.6.5 document (`red-j2`, `unknown key`).
- **Correction to SW-IO-28.** The strict-contract recipe "compare `container.allKeys` to the known set" is silently wrong with the usual container: `plants/allkeys` (`swift run probe`, 6.4.0 and 6.3.3) prints `CodingKeys-typed allKeys: ["version"]` and `AnyKey-typed allKeys: ["future", "version"]` for `{"version":"1","future":2}`. A `keyedBy: CodingKeys.self` container never lists unknown keys; the strict check needs `keyedBy: AnyKey.self`. The wrong recipe (`red-j1`) stayed green on both toolchains, i.e. it enforces nothing.
- **Attach the failure envelope, never trust it.** `checked` does `envelope: try? JSONDecoder().decode(ErrorEnvelope.self, from: Data(out.stdout))`. `ErrorEnvelope` requires the contract's frozen keys and treats `detail` as optional. Building an error must not itself fail: `red-k` (`try` instead of `try?`) turns every non-JSON failure into a thrown `DecodingError` (`expected error of type OcxError, but "Decod..."`). Real 0.6.5 labels exit **81** (`policyBlocked`) with `kind: "permission_denied"`: `failureEnvelopeIsAttachedButNotTrusted` asserts `code == .policyBlocked` while `envelope.kind == "permission_denied"`. `ocx-sdk-python` already says "the exit code is still the category" (`_results.py` `ErrorEnvelope` docstring); the Swift rule is that `Code` is a function of `exitStatus` alone.
- **A usage failure carries no envelope** (clap prints text to stderr; exit 64 with empty stdout was observed), and `package test -- CMD` prints the child's raw stdout under `--format json` (`_results.py` module docstring): a typed call must know which commands emit which shape. A report-then-fail command (`partial_report`, `_errors.py:127-135`) keeps its stdout verbatim; the Swift SDK drops `stdout` from `OcxError` in this slice (an SDK that exposes `sign`/`attest` should add `stdout: [UInt8]`, never rendered in `description`).

### 2.12 The version gate

`Ocx.gate()` (`Ocx.swift:122-130`): `ocx version` is the probe (so `version()` itself is ungated, `about()` is gated); older than `minimumVersion` (default `0.6.2`, `_types.py` `MIN_SUPPORTED`) or unparsable throws `.incompatibleVersion`; newer is expected. The memo is a `final class CompatCell: Sendable { let verified = Mutex(false) }` shared by every copy of the `Ocx` value, written only on success, so a failed probe is retried (`gateProbesOnceAndCachesOnlySuccess`: two `about()` calls = one probe line; two failing calls = two more). The comparator is the dotted numeric head, ignoring a pre-release tail (`Ocx.core("0.5.8-rc1") == [0,5,8]`). Go's contract dive found its comparator rejected `0.6.2-rc1` against a floor of `0.6.2` (`go-api.md` line 47); the Swift table includes that case.

### 2.13 The test seam and the 100% line gate

The seam is values, not protocols (SW-API-09 of the sibling set: no one-conformer protocol):

- `ProcessRunner.sleep: @Sendable (Duration) async throws -> Void` is the timer/clock seam (the analogue of `_process.py:96` `Clock`).
- `ProcessRunner.status` and `ProcessRunner.map` are pure statics, tested without a child.
- `Ocx.init(executable:environment:timeout:minimumVersion:runner:)` is `package`; the public `init` resolves and delegates.
- `OcxLocation.resolve` takes an environment dictionary.
- The spawn itself has no seam on purpose: the fake `ocx` runs out of process (SW-TEST-15), so the 100% covers the real `Subprocess.run` path. The Python SDK needs `PopenFactory`/`ExecFactory` because `subprocess` cannot be given a fake binary as cheaply; here a 40-line shell script is the cheaper test double.

Coverage: `swift test --enable-code-coverage` then the SW-TEST-16 jq (verbatim, host-side `jq`, `Sources/` filter) gives `true`, 283/283 lines in `Discovery`, `Ocx`, `OcxError`, `Reports`, `ProcessRunner`, on 6.4.0 and 6.3.3. The first run was 282/283: the one miss was the public `init`'s `{ ProcessInfo.processInfo.environment }` closure, which only the production entry point executes; `publicInitRunsEndToEnd` fixed it, which is the argument for testing through the public initializer once. Deleting `DiscoveryTests.swift` drops it to 259/283 and the gate exits 123 (jq `false` under `xargs -r`); the same tree passes the gate at 90. The contract tier (`RealOcxContractTests`) is excluded by `.enabled(if:)` and does not count toward `Sources/` coverage.

### 2.14 Corrections to earlier rules

| Earlier statement | Finding | Evidence |
|---|---|---|
| SW-IO-26: public `throws(ProcessFailure)`, closed `ProcessFailure` | Public error is the SW-ERR-20 struct; `ProcessFailure` is `package`, gains `cancelled` | 2.6, 2.8 |
| SW-IO-26: defaults 4 MiB / 256 KiB | One symmetric 4 MiB; 256 KiB is red against a traced pull | `red-d1`, 2.10 |
| SW-IO-26 / Q-IO-3: `Task.isCancelled` throw "not implemented, nothing ran" | Implemented; red without it; precedence 100/100 | `red-b`, `red-c`, 2.9 |
| SW-IO-26 check: `import Subprocess` count | Layout does not enforce it; grep G1 does | `red-g` exit 0 |
| SW-IO-28: strict contract compares `container.allKeys` | A `CodingKeys` container hides unknown keys; needs `AnyKey` | `plants/allkeys`, `red-j1` green, `red-j2` red |
| SW-IO-27: cancelled `run()` is `.signaled(9)` | With the SDK's SIGTERM-first teardown it is `.signaled(15)`, status 143 | `red-b` message |
| SW-TEST-14: `--repeat-until fail` on 6.4+ | Confirmed absent on 6.3 | `Unknown option '--repeat-until'` |
| Python SDK `ExitCode` as the table | Missing 87 | `_errors.py:28-51` vs `exit_code.rs:62` |

## Normative guidance candidates

IDs are provisional (`SW-API-S01...`) so they cannot collide with the sibling `library-api-shape.md`'s `SW-API-01..14`; the consolidation assigns final numbers. "RUN" means a planted violation and a compliant twin were run (fixture under `/home/mherwig/.cache/research-lang/swift-tools/fixtures/sdk-shape/`).

1. **SW-API-S01 (MUST, SDK).** An SDK wrapping a CLI has exactly two source targets: the public library target and one non-product spawn target; only the spawn target lists `Subprocess` in its dependencies; cross-target API is `package`, never `public`. Rationale: one place owns limits, grace, environment and exit mapping (SW-IO-26). Verify: `grep -rl --include='*.swift' --exclude-dir=OcxSpawn -e 'import Subprocess' -e 'import SystemPackage' Sources` (output = violation; replace `OcxSpawn` with the spawn directory) and `grep -rn --include='*.swift' -e 'public .*SubprocessError' -e 'package .*SubprocessError' -e 'public .*TerminationStatus' -e 'package .*TerminationStatus' -e 'public .*Execution' -e 'package .*PlatformOptions' Sources` (output = violation). RUN: `greps.sh plants/red` prints `Sources/OcxSDK/Bad.swift` (G1) and two lines in `Leak.swift` (G6), `plants/green` and `pkg` print nothing. The manifest does not enforce it (`red-g` exits 0); do not claim it does.
2. **SW-API-S02 (MUST, SDK).** The SDK's direct dependencies are exactly `swift-subprocess` (`from: "1.0.1"`); transitive `swift-system` is allowed; stdlib-adjacent `Synchronization` and `FoundationEssentials` only; no `Foundation` import in `Sources/` outside a `canImport` fallback. Rationale: owner Q4 budget; measured link footprint is `libFoundationEssentials` only. Verify: `swift package dump-package | jq -e '[.dependencies[] | .sourceControl[0].location.remote[0].urlString] == ["https://github.com/swiftlang/swift-subprocess"]'` (exit 1 = violation) and `grep -rl --include='*.swift' -e '^import Foundation$' Sources | xargs -r grep -L -e 'canImport(FoundationEssentials)'` (output = violation; SW-IO-04). RUN: dump-package exit 0 on `pkg`, 1 on `plants/dep-red`; the `import Foundation` grep not re-run here (SW-IO-04 owns it).
3. **SW-API-S03 (MUST, SDK).** Binary discovery resolves once at `init`, in this order: explicit path, `OCX_SDK_EXE`, `PATH` (absolute entries only; parent directory neither group- nor other-writable), then `$OCX_HOME`/`$HOME/.ocx` `symlinks/ocx.sh/ocx/cli/current/content/bin/ocx`; it reads an environment snapshot passed in, not `ProcessInfo` inside the resolver; it never shells out to `which`. Rationale: CWE-426; a narrowed environment must narrow discovery; mirrors `_bootstrap.py:245-292`. Verify: `swift test --filter DiscoveryTests` (exit 1 = violation) plus `grep -rn --include='*.swift' -e '"which"' -e '/usr/bin/which' Sources` (output = violation). RUN: `red-l` (neutralised trust guard) exit 1 on 6.4 and 6.3; the `which` grep is a reading heuristic, not run.
4. **SW-API-S04 (MUST, SDK).** argv is `--format json --color never`, then global flags, command, positionals; a positional starting with `-` throws `invalidArgument` before any spawn. Rationale: ocx's grammar takes globals first; CWE-88 (`_process.py:157-196`). Verify: `swift test --filter EnvelopeTests` (the `argv` fake mode compares all eight lines). RUN: `red-m` exit 1 on both toolchains.
5. **SW-API-S05 (MUST, SDK).** Environment overrides are `[String: String?]` layered on `.inherit` (nil deletes); the mutated `Environment` is the one passed to `run`; a sentinel test proves it. Rationale: SW-IO-24 (latent in `swiftly@c8cf2e35bfca:Sources/SwiftlyCore/ModeledCommandLine.swift:64-71`). Verify: `swift test --filter environmentOverridesReachTheChild`. RUN: `red-i` (`.inherit` without `updating`) exit 1.
6. **SW-API-S06 (MUST, SDK).** `.exited(n)` maps to `n`; `.signaled(s)` maps to `128 + s` with `s` retained in `signal`; the `.signaled` arm is under `#if !os(Windows)`; status `>= 128` or `< 0` is `crashed`, 2-63 and 88-127 are `unknownStatus`; a test walks 0...255 and every `TerminationStatus` case. Rationale: owner Q6; a pass-through files SIGTERM as ocx status 15. Verify: `swift test --filter MappingTests` (exit 1 = violation); reading heuristic for review: `grep -rn --include='*.swift' -e 'case .signaled' Sources` must list exactly one site and it must contain `128 +`. RUN: `red-a` exit 1 on both toolchains; the grep is a reading heuristic. Windows: unverified: read only.
7. **SW-API-S07 (MUST, SDK).** The exit-status table is copied from the ocx source at a pinned commit and a test enumerates all 0...255; when ocx adds a status, the diff against `crates/ocx_exit/src/exit_code.rs` is the first check, not the Python SDK. Rationale: `_errors.py:28-51` lacks 87. Verify: `grep -n -e '= 8[0-9],' -e '= 9[0-9],' crates/ocx_exit/src/exit_code.rs` against the SDK's `code(forExitStatus:)` cases (reading heuristic: the numbers must match one to one). RUN: no (reading heuristic); the 87 case is exercised by `exit87` through a real child.
8. **SW-API-S08 (MUST, SDK).** The one public error is `struct XError: Error, Sendable` with open `Code`, `exitStatus`, `signal`, `stderr`, `envelope`, `cause`; no `public enum ...: Error`; `Code` is a function of `exitStatus` alone; cancellation is `CancellationError`, not an `XError` code. Rationale: SW-ERR-20; ocx's `ExitCode` is `#[non_exhaustive]`. Verify: `grep -rn --include='*.swift' -e 'public enum [A-Za-z]*: Error' -e 'public enum [A-Za-z]*: Swift.Error' -e 'public enum [A-Za-z]*: .*, Error' Sources` (output = violation). RUN: prints 2 lines on `plants/red`, empty on `plants/green` and `pkg`.
9. **SW-API-S09 (MUST, SDK).** After the spawn returns, the wrapper checks `Task.isCancelled` and throws `CancellationError`; it never returns a result to a cancelled caller. Rationale: swift-subprocess returns the reaped child's status on cancel (README, SW-IO-27). Verify: `swift test --filter CancellationTests` (a cancelled call must throw `CancellationError`). RUN: `red-b` fails three tests (`crashed: ocx x exited 143`) on 6.4 and 6.3.
10. **SW-API-S10 (MUST, SDK).** A timeout is a task-group race against an injectable timer; `timedOut` is thrown iff the timer completed before the child finished, and it wins over a cancellation that arrives afterwards; the throw happens only after the child's process group is dead. Rationale: Q-IO-3, GO-API-20. Verify: `swift test --filter timerFirstWinsOverLaterCancel` (100 races by construction; on 6.4 also `swift test --filter CancellationTests --repeat-until fail --maximum-repetitions 10`). RUN: `red-c` 100/100 failures on both toolchains; green 100/100 and 1,000/1,000 (6.4), 500/500 by plain reruns (6.3).
11. **SW-API-S11 (MUST, SDK).** The child gets `createSession = true` and `teardownSequence = [.send(signal: .terminate, toProcessGroup: true, allowedDurationToNextStep: killGrace)]` (5 s default, Q-IO-4); after cancel or timeout, `pgrep` for the fake's grandchild finds nothing. Rationale: SW-IO-23; the implicit final kill inherits `toProcessGroup` (SF-0037:754). Verify: run `swift test --filter CancellationTests` then `pgrep -af "sleep 300[01]"` in the same container (exit 1 = pass). RUN: `pgrep-check.sh pkg` exit 0 (green, 6.4 and 6.3); `pgrep-check.sh pkg-red` with `red-h` exit 1 and 97 survivors.
12. **SW-API-S12 (MUST, SDK).** Capture is bounded by one symmetric `captureLimit` (default 4 MiB per stream, configurable); stdout is collected with `.bytes(limit:)`, stderr with `.string(limit:)`; overflow is `.outputTooLarge(limit:)`; no `Int.max`, no per-stream defaults below the largest observed stderr (1,372,005 bytes, `--log-level trace package pull`, ocx 0.6.5). Rationale: Q-IO-2 closed with measurements, section 2.10. Verify: `grep -rn --include='*.swift' -e 'limit: Int.max' -e 'limit: .max' Sources` (output = violation) and `swift test --filter traceSizedStderrFitsDefaultButNot256KiB`. RUN: grep prints the plant line on `plants/red`, empty on `plants/green`; `red-d1` (256 KiB default) and `red-d2` (`Int.max`) both exit 1.
13. **SW-API-S13 (MUST, SDK).** A typed result decodes fields ocx always writes with `decode`, everything else with `decodeIfPresent`, ignores unknown keys, and turns a missing required key, a wrong type, non-JSON and empty stdout into a typed error naming the command and key; tests decode recorded documents from at least two ocx releases. Rationale: ocx adds fields between releases (0.6.5 `features`). Verify: `swift test --filter EnvelopeTests`. RUN: `red-e` (a required `channel`) exit 1 on both; `red-j2` (strict unknown-key) exit 1 on both.
14. **SW-API-S14 (MUST, any Decodable that rejects unknown keys).** A strict-key check uses a raw-key container (`keyedBy: AnyKey.self`), never `container.allKeys` of the `CodingKeys` container. Rationale: the typed container filters unknown keys, so the check passes everything (amends SW-IO-28). Verify: a unit test with an extra key must fail the strict decoder. RUN: `plants/allkeys` prints `["version"]` against `["future", "version"]`; `red-j1` stays green (exit 0), `red-j2` is red.
15. **SW-API-S15 (MUST, SDK).** The failure envelope on stdout is attached with `try?` as optional data; the error's `Code` comes from the exit status only, never from the envelope's `kind` or any message; no code path that builds an error may throw. Rationale: real ocx 0.6.5 labels exit 81 `permission_denied`. Verify: `swift test --filter failureEnvelopeIsAttachedButNotTrusted`. RUN: `red-k` (`try`) exit 1 on both.
16. **SW-API-S16 (SHOULD, SDK).** The first typed call probes `ocx version` once per handle family (a `Sendable` class holding a `Mutex<Bool>`), caches success only, refuses a version below the floor, accepts a newer one, and ignores a pre-release tail in the comparison. Rationale: GO-API-18, `_CompatCell`. Verify: `swift test --filter gateProbesOnceAndCachesOnlySuccess` and `versionProbeAndCoreParsing`. RUN: green only (no red planted).
17. **SW-API-S17 (MUST, SDK).** `ProcessRunner`-style spawn modules expose seams as stored values (`sleep`, limits) and pure `static` functions for branches no real child can reach; they do not introduce a protocol for the spawn; the fake CLI is a script run out of process and is located with `Bundle.module` resources (`.copy`), not `#filePath`. Rationale: the real spawn path stays under the 100% gate; fewer one-conformer protocols (sibling SW-API-09). Verify: `grep -rn --include='*.swift' -e 'protocol [A-Za-z]*Runn' -e 'protocol [A-Za-z]*Spawn' Sources` (output = candidate; read it) and the coverage gate of rule 18. RUN: the protocol grep is a reading heuristic (empty on `pkg`, not planted).
18. **SW-API-S18 (MUST, SDK).** Line coverage of `Sources/` is 100% on the Linux leg, computed by the SW-TEST-16 jq from `swift test --show-codecov-path`: `swift test --enable-code-coverage`, then `swift test --show-codecov-path | tail -1 | xargs -r jq -e --arg root "$PWD" --argjson min 100 '[.data[0].files[] | select(.filename | startswith($root + "/Sources/"))] | ((map(.summary.lines.covered) | add) / (map(.summary.lines.count) | add) * 100) as $pct | ($pct >= $min)'` (exit 1 or 123 = violation). Test the public initializer end to end once, or its default closure is the uncovered line. RUN: `covgate.sh pkg 100` exit 0 on 6.4 and 6.3 (283/283); `covgate.sh pkg-red 100` exit 123 with 259/283 after deleting one test file.
19. **SW-API-S19 (MUST, SDK).** With `InternalImportsByDefault`, a `package` or `public` declaration that mentions another module's type is imported `package import`/`public import` in that file; a bare `import` fails the build. Rationale: the seam initializer exposes `ProcessRunner`. Verify: `swift build` (exit 1 = violation). RUN: `red-n` exit 1 on both toolchains (`initializer cannot be declared package because its parameter uses an internal type`).
20. **SW-API-S20 (MUST, SDK).** The SDK never calls `exit`, `fatalError`, `preconditionFailure`, constructs `Foundation.Process`, or uses `@unchecked Sendable` / `nonisolated(unsafe)` / `Task.detached`. Rationale: a library reports failure by throwing (SW-CLI); the spawn goes through Subprocess. Verify: `grep -rn --include='*.swift' -e 'Process()' -e 'Foundation.Process' -e ' exit(' -e 'fatalError(' -e 'preconditionFailure(' Sources` and `grep -rn --include='*.swift' -e '@unchecked Sendable' -e 'nonisolated(unsafe)' -e 'Task.detached' Sources` (output = violation). RUN: both print the plant lines on `plants/red`, nothing on `plants/green` and `pkg`.
21. **SW-API-S21 (SHOULD, SDK).** The contract tier runs the real binary behind `.enabled(if: ProcessInfo.processInfo.environment["OCX_SDK_EXE"] != nil)`, with a throwaway `OCX_HOME`, and asserts the mapping on real failures (exit 64 for an unknown subcommand, 81 for `package which --offline` of an unknown package) and one real cancel. Rationale: the fake proves the SDK, the real binary proves the fake. Verify: `env OCX_SDK_EXE=/path/to/ocx swift test --filter RealOcxContractTests` (exit 1 = violation). RUN: green on ocx 0.6.5, 4 tests, 6.4 and 6.3; no red planted.
22. **SW-API-S22 (SHOULD, SDK; Windows: unverified, read only).** A status that is negative after `Int32(truncatingIfNeeded:)` (a `DWORD` NT status) is `crashed`; the `.signaled` arm and any `toProcessGroup` use are `#if !os(Windows)`/documented as ignored there. Rationale: `TerminationStatus` has only `.exited(DWORD)` on Windows (`Configuration.swift:756-770`); `createSession` does not exist there (Teardown docs). Verify: `swift test --filter negativeStatusIsACrash` on Linux proves the branch only; a Windows run is required for the platform claim. RUN: branch yes (Linux), platform no.

## Verification runs

Notation: `F=/home/mherwig/.cache/research-lang/swift-tools/fixtures/sdk-shape`; `./run.sh pkg <cmd>` is `F/run.sh` (it runs `swift-tools/run.sh` and appends `--scratch-path "$SWIFT_SCRATCH/sdk-shape/pkg-<ver>"`); `SWIFT_VERSION=6.3` selects the prior line (default 6.4). Logs: `F/logs/`. All runs on 2026-10-10, Linux x86_64, Docker.

**Green twin.** `cd F && ./run.sh pkg swift test` -> exit 0, `Test run with 38 tests in 5 suites passed after 3.271 seconds` (6.4.0) and `after 3.176 seconds` (6.3.3); 4 of the 38 are the env-gated contract tests, skipped here.

**Mutation suite.** `cd F && ./redsuite.sh` (per toolchain, one variant at a time, `variant.sh <label> <file> <old> <new>` copies `pkg` to `pkg-red`, mutates once, runs `./run.sh pkg-red swift test`). Exit codes are the same on 6.4.0 and 6.3.3 (`logs/redsuite-final.txt`).

| Variant (mutation) | Exit on violation | Exit on twin | Relevant output lines |
|---|---|---|---|
| `red-a-passthrough` (`return (128 + signal, signal)` -> `return (signal, signal)`) | 1 | 0 | `Expectation failed: ProcessRunner.status(.signaled(15)) == (143, 15)`; sigterm: `error.exitStatus -> 15` vs `143`, code `unknownStatus` vs `crashed` |
| `red-b-no-cancel-check` (delete `if Task.isCancelled { throw .cancelled }`) | 1 | 0 | `expected error of type CancellationError, but "crashed: ocx x exited 143" of type OcxError was thrown instead` (3 tests) |
| `red-c-cancel-before-timer` (swap the two throw lines) | 1 | 0 | `Expectation failed: timedOut` x 100 (`grep -c` = 100 on 6.4 and on 6.3) |
| `red-d1-default-256k` (`captureLimit` default `256 << 10`) | 1 | 0 | `Caught error: outputTooLarge: ocx wrote more than 262144 bytes to one stream` |
| `red-d2-unbounded` (`limit: Int.max`) | 1 | 0 | `Expectation failed: an error was expected but none was thrown` (`stdoutOverLimit`, trace stderr) |
| `red-e-strict-decode` (`decode(String?.self, forKey: .channel)`) | 1 | 0 | `malformedOutput: ocx about output is malformed: missing field 'channel'` |
| `red-h-no-teardown` (delete `createSession`/`teardownSequence`) | 1 | 0 | `Expectation failed: try await Fake.isGone(grandchild)` (2 tests) |
| `red-i-env-dropped` (`.inherit.updating(overrides)` -> `.inherit`) | 1 | 0 | `an error was expected but none was thrown` (mode selection travels in the environment) |
| `red-j2-unknown-field-strict-anykey` (raw-key container rejecting unknown keys) | 1 | 0 | `DecodingError.dataCorrupted ... unknown key` on both recorded documents |
| `red-k-envelope-throws` (`try?` -> `try`) | 1 | 0 | `expected error of type OcxError, but "Decod..."` |
| `red-l-path-untrusted` (`guard true`) | 1 | 0 | `an error was expected but none was thrown and ".../writable/ocx" was returned` |
| `red-m-dash-positional` (guard neutralised) | 1 | 0 | `Expectation failed: an error was expected but none was thrown` |
| `red-n-internal-import` (`package import OcxSpawn` -> `import OcxSpawn`) | 1 | 0 | `error: initializer cannot be declared package because its parameter uses an internal type` |
| `red-j1-allkeys-typed-NOT-RED` (`guard c.allKeys.count <= 6`) | **0 (not red)** | 0 | the typed container hides unknown keys, the guard never fires |
| `red-g-transitive-import-NOT-RED` (`import Subprocess` in `OcxSDK`) | **0 (not red)** | 0 | SwiftPM and the compiler accept a transitive import, with both upcoming features on |

**Structural greps** (`F/greps.sh <dir>`, each line is a grep exit: 0 = violation found):

| Check | `plants/red` | `plants/green` | `pkg` | Output on red |
|---|---|---|---|---|
| G1 `grep -rl --include='*.swift' --exclude-dir=OcxSpawn -e 'import Subprocess' -e 'import SystemPackage' Sources` | exit 0 | exit 1 | exit 1 | `Sources/OcxSDK/Bad.swift` |
| G2 `grep -rn --include='*.swift' -e 'Process()' -e 'Foundation.Process' -e ' exit(' -e 'fatalError(' -e 'preconditionFailure(' Sources` | exit 0 | exit 1 | exit 1 | `Bad.swift:9`, `:11`, `:12` |
| G3 `grep -rn --include='*.swift' -e 'public enum [A-Za-z]*: Error' -e 'public enum [A-Za-z]*: Swift.Error' -e 'public enum [A-Za-z]*: .*, Error' Sources` | exit 0 | exit 1 | exit 1 | `Bad.swift:4`, `:5` |
| G4 `grep -rn --include='*.swift' -e 'limit: Int.max' -e 'limit: .max' Sources` | exit 0 | exit 1 | exit 1 | `Spawn.swift:3` |
| G5 `grep -rn --include='*.swift' -e '@unchecked Sendable' -e 'nonisolated(unsafe)' -e 'Task.detached' Sources` | exit 0 | exit 1 | exit 1 | `Bad.swift:7`, `:11` |
| G6 `grep -rn --include='*.swift' -e 'public .*SubprocessError' -e 'package .*SubprocessError' -e 'public .*TerminationStatus' -e 'package .*TerminationStatus' -e 'public .*Execution' -e 'package .*PlatformOptions' Sources` | exit 0 | exit 1 | exit 1 | `Leak.swift:3`, `:4` |

**Dependency budget.** `cd F/pkg && /home/mherwig/.cache/research-lang/swift-tools/run.sh swift package dump-package | jq -e '[.dependencies[] | .sourceControl[0].location.remote[0].urlString] == ["https://github.com/swiftlang/swift-subprocess"]'` -> `true`, exit 0; in `F/plants/dep-red` (adds `swift-log`) -> `false`, exit 1. `swift package show-dependencies` -> `swift-subprocess<...@1.0.1>(traits: SubprocessFoundation)` over `swift-system<...@1.8.1>`.

**Coverage gate (SW-TEST-16 verbatim jq).** `./covgate.sh pkg 100` -> `true`, exit 0 (283 of 283 `Sources/` lines), 6.4 and 6.3. `./covgate.sh pkg-red 100` (one test file removed) -> `false`, exit 123 (259 of 283); `./covgate.sh pkg-red 90` -> `true`, exit 0. The earlier 282/283 (public-init closure) is described in 2.13.

**Grandchild survivors.** `./pgrep-check.sh pkg` -> `swift test exit=0`, `no survivor`, exit 0 (6.4 and 6.3); `./pgrep-check.sh pkg-red` after `red-h` -> `swift test exit=1`, ninety-seven lines `NNN sleep 3001`/`3000`, `SURVIVOR`, exit 1.

**Race repetition.** `./run.sh pkg swift test --filter CancellationTests --repeat-until fail --maximum-repetitions 10` (6.4.0) -> `Test run with 8 tests in 1 suite passed after 31.484 seconds`, exit 0 (10 x 100 races). On 6.3.3 the flag is `error: Unknown option '--repeat-until'`; `./run.sh pkg swift test --filter timerFirstWinsOverLaterCancel` x5 -> five passes, 3.16-3.77 s each.

**Typed `allKeys` probe.** `cd F && ./run.sh plants/allkeys swift run probe` -> `CodingKeys-typed allKeys: ["version"]` / `AnyKey-typed allKeys:    ["future", "version"]`, 6.4.0 and 6.3.3.

**Link footprint.** `./run.sh plants/traits-default swift build -c release --product probe` and `plants/traits-off` (`traits: []`) -> both `Build complete`; `ldd` shows only `libFoundationEssentials.so`; sizes 3,818,816 and 3,749,280 bytes; the binary prints `0.6.5` against the real ocx.

**Contract tier (real ocx 0.6.5).** `./run.sh pkg env OCX_SDK_EXE=F/real/ocx swift test --filter RealOcxContractTests` -> `REAL-OCX package which (missing): exit=81 code=policyBlocked`, `Test run with 4 tests in 1 suite passed`, exit 0, 6.4 and 6.3. Green only.

**Output size measurement.** `ocx --format json --color never <cmd>` with `OCX_NO_CONFIG=1`, throwaway `OCX_HOME`: byte counts in 2.10 (stdout/stderr via `wc -c` on redirected files); network-dependent rows (`--remote`, `package pull`) were run once and are not part of the suite.

**Count.** Verifications watched red on a planted fixture and green on its twin: 13 mutation variants + 6 greps + 1 dependency-budget jq + 1 coverage gate + 1 grandchild `pgrep` = 22. Reported as not red: `red-j1`, `red-g`.

## Exemplar evidence

The fleet has no Swift SDK; evidence comes from the exemplar corpus (`swift-audit/`), re-measured with read-only greps on 2026-10-10.

- **Subprocess adoption.** `import Subprocess` appears in 3 of 40 repos: swiftly (14 files), tuist (3), element-x-ios (1). Foundation `Process()` is constructed in 12+ repos (tuist 14 files, swift-package-manager 14, swift-build 10, JavaScriptKit 9, SwiftLint 4). The SDK-over-CLI shape therefore has no direct Swift exemplar; the contract is built from Python (`ocx-sdk-python@80136dde4162`), Go (`go-api.md`) and the fixtures.
- **S06 signal mapping.** Contradicting or partial: `tuist@2f6ac74754bf:cli/Sources/TuistProcess/CommandRunner.swift:321-322` and `.../XcodeGraphMapper/Utilities/SubprocessRunner.swift:45-46` keep the signal as a separate error (`CommandError.signalled(signal, command:)`), under `#if !os(Windows)`, which is the "keep `signal`" half of S06 without the `128 + n` status. `swiftly@c8cf2e35bfca:Sources/Swiftly/Proxy.swift:94-95` maps `.signaled` to `exit(1)`, losing the signal.
- **S05 environment.** Violates (latent): `swiftly@c8cf2e35bfca:Sources/SwiftlyCore/ModeledCommandLine.swift:64-71` mutates `c.environment` on a local copy and runs `self.config()`.
- **S12 limits.** Satisfy the principle (an explicit limit), differ in size: `tuist@2f6ac74754bf:.../SubprocessRunner.swift:33-34` 10 MiB on both streams; swiftly `1024 * 10` and `1024 * 100` for short probes (`swiftly@c8cf2e35bfca:Sources/MacOSPlatform/MacOS.swift:65`, `Sources/SwiftlyCore/Commands+Runnable+Output.swift:6`); 8 call sites total with `.string(limit:)`/`.bytes(limit:)` across 3 repos. None sizes a limit from measurement.
- **S08 error type.** Satisfies: the SW-ERR-20 precedent `apple/containerization@3e7bc39e66b3:Sources/ContainerizationError/ContainerizationError.swift:23-29`. Tuist's `CommandError` is a closed enum (a new case breaks exhaustive consumers).
- **S09/S10 cancellation.** No corpus repo throws `CancellationError` after a subprocess `run`; `withTaskCancellationHandler` appears in swift-package-manager (`Sources/Basics/Concurrency/ConcurrencyHelpers.swift`) and swift-build (`Sources/SWBUtil/AsyncOperationQueue.swift`) for queues, not for children. The path is unimplemented across the corpus, as SW-IO-27 predicted.
- **S18 coverage.** `ocx-sdk-python@80136dde4162:pyproject.toml:94-97` `fail_under = 100`; no Swift exemplar gates at 100 (`swift-audit/exemplar-quality-gates.md`).
- **S13 evolution.** The recorded-document practice has an exact Python precedent (`tests/fixtures/cli/*.json`, 70 files, plus `contract/reports.v1.json`); no Swift exemplar decodes recorded CLI output.

## AI-agent angle

| Characteristic mistake | Why it compiles | Smallest mechanical check |
|---|---|---|
| `Foundation.Process` + `Pipe` + `waitUntilExit()` for the CLI | compiles, deadlocks above 64 KiB (SW-IO-25) | G2 (`Process()`), `swift test` fake `stderr-bytes` |
| Old Subprocess spellings from 0.x: `output: .string` with no limit, `.sendSignal(...)`, `alloweDurationToNextStep` | 1.0 removed them ([SF-0037](https://github.com/swiftlang/swift-foundation/blob/main/Proposals/0037-subprocess-1.0.md), lines 727-754, 1035) | `swift build` on the pinned `1.0.1` |
| `.string(limit: .max)`, `Int.max`, or a huge guess instead of a measured limit | compiles | G4 grep; `stdoutOverLimit` |
| `switch status { case .exited(let c): ... }` with a `default` for signals, or `.signaled(let s): return s` | compiles; a SIGTERM looks like ocx status 15 | `MappingTests`, `red-a` |
| Treating `terminationStatus.isSuccess == false` as "ocx said no" and parsing stderr | compiles | exit-status-only classification test; `red-k` for the envelope variant |
| `public enum OcxError: Error { case notFound, ... }` | compiles; the next ocx status breaks consumers | G3 grep |
| `Task { try await run(...) }` / `Task.detached` to "add a timeout", then `task.cancel()` | compiles; `run` returns `.signaled` instead of throwing | `CancellationTests`, G5 grep |
| `try? await Task.sleep` as the timer, or `withThrowingTaskGroup` with the cancel check before the timer check | compiles; wrong precedence | `timerFirstWinsOverLaterCancel`, `red-c` |
| Missing `createSession`, or `toProcessGroup: true` without it | compiles; grandchild survives, or the SDK signals its own group | `pgrep -af "sleep 300[01]"`, `red-h` |
| Synthesized `Decodable` with every field non-optional; or `decodeIfPresent` on required fields | compiles; breaks on the next/previous ocx, or hides a missing `version` | `recordedAboutDocumentsDecode`, `red-e` |
| Strict "unknown key" via `container.allKeys` on `CodingKeys` | compiles, rejects nothing | `plants/allkeys`, `red-j1` |
| Hallucinated `Subprocess.run(...).result`, `Process.run(.name("ocx"))`, `ocx --json`, `ocx --output json` | not valid | build; the argv test (`--format json --color never`) |
| `import Subprocess` in the public target "because it is already a dependency" | compiles (transitive imports are allowed) | G1 grep |
| `public init(runner: ProcessRunner)` leaking the seam | compiles without `InternalImportsByDefault` | G6 grep; `red-n`-style build |
| A protocol `ProcessRunning` plus a mock for "testability" | compiles; the real spawn is never covered, gate cannot reach 100 honestly | `grep -rn --include='*.swift' -e 'protocol [A-Za-z]*Runn' Sources` (reading), coverage gate |
| `@unchecked Sendable` on a class wrapping a handle | compiles | G5 grep |
| Test fixtures located by `#filePath` or a hard-coded `.build/debug` | works locally, breaks relocated builds | `Bundle.module` + `.copy` resources (ran) |
| `exit(1)` / `fatalError` in the SDK on a bad status | compiles | G2 grep |

## Contested / evolving

- **128+n versus keeping the signal apart (owner Q6, as of 2026-10-10).** The Swift/Go/this-fleet default is `128 + n`; tuist keeps `signalled(signal)` separate and swiftly collapses to `exit(1)`; Python keeps the raw status. This SDK does both: `exitStatus = 128 + s` and `signal = s`. Q6 stays open for CLIs (SW-CLI), where a status is what the shell sees.
- **Cancel after completion discards the result.** The alternative (return a finished result if the child exited 0 before cancellation) keeps side effects visible but makes `Task.isCancelled` a lie. Chosen: throw, document "outcome unknown". Revisit if `ocx install` needs idempotent confirmation.
- **Eager versus lazy version gate.** Python and Go gate lazily on the first typed call; this SDK does the same. An eager `init` probe would turn a missing binary into a version error at construction; not chosen. Trend: unchanged.
- **Capture policy.** Python: unbounded by design. Subprocess 1.0: explicit limit always. This SDK: one symmetric 4 MiB. If ocx ever streams a large JSON (SBOM, `--format json` catalog of a large registry), the limit becomes the SDK's visible ceiling; raise it per call, do not remove it.
- **Typed throws.** SE-0413 keeps untyped `throws` the default; the internal `throws(ProcessFailure)` is allowed as module-internal. If a future toolchain makes `withTaskGroup` child closures typed-throwing, the `Result` plumbing in `ProcessRunner.run` can be deleted.
- **Windows.** swift-subprocess 1.0.1 is tested on Windows 11 in its CI (README table), but this SDK's teardown (`createSession`, `toProcessGroup`), `.signaled` and NT status mapping are unverified: read only. Owner Q7 stays at the default.
- **SE-0504 (Swift 6.4).** Cancellation shields may be the right tool for a future "send `ocx` a graceful interrupt and wait" cleanup inside a cancelled task; today the teardown sequence does that job inside Subprocess.
- **Where the swift-subprocess floor goes.** `1.0.1` (2026-10-09) is current; the `from:` bound should track the first release that carries each fix the SDK depends on.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://github.com/swiftlang/swift-subprocess/blob/1.0.1/README.md | swift-subprocess README at 1.0.1 (limits, graceful teardown, platform test table) | 2026-10-09 | primary; states the cancellation/teardown contract and the CI matrix |
| https://github.com/swiftlang/swift-subprocess/releases/tag/1.0.1 | 1.0.1 release notes | 2026-10-09 | primary; the fd-leak and `posix_spawn` fixes that set the dependency floor |
| https://github.com/swiftlang/swift-subprocess/tree/1.0.1/Sources/Subprocess | source at `55d30558b8b1`: `Configuration.swift:756-782` (`TerminationStatus`), `Error.swift:42-111` (`SubprocessError`), `Teardown.swift:26-102` | 1.0.1 | primary; the types the mapping and cancellation rules depend on |
| https://github.com/swiftlang/swift-foundation/blob/main/Proposals/0037-subprocess-1.0.md | SF-0037 Subprocess 1.0 proposal | 2026 | primary; explicit limits (line 1035), `toProcessGroup` and the final-kill rule (727-754) |
| https://forums.swift.org/t/second-review-sf-0037-subprocess-1-0/88199 | second review thread for SF-0037 | 2026-07 | primary; review status only (cancellation, limits and Windows are not discussed there) |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0413-typed-throws.md | SE-0413 typed throws | Swift 6.0 | primary; untyped is the default, typed for module-internal code (lines 91, 450) |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0487-extensible-enums.md | SE-0487 `@nonexhaustive` | implemented Swift 6.2.3 | primary; why the public error is a struct with an open `Code` |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0504-task-cancellation-shields.md | SE-0504 task cancellation shields | implemented Swift 6.4 | primary; scope of `withTaskCancellationShield` against the explicit check |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0386-package-access-modifier.md | SE-0386 `package` access | Swift 5.9 | primary; the cross-target visibility used for the spawn module |
| https://github.com/swiftlang/swift-book/blob/main/TSPL.docc/LanguageGuide/Concurrency.md | The Swift Programming Language, Concurrency (Task Cancellation, lines 655-709) | 2026 | primary; cooperative cancellation and `CancellationError` |
| https://www.swift.org/blog/swift-6.4-released/ | Swift 6.4 release post | 2026-09-14 | primary; Subprocess 1.0 and SE-0504 announced |
| https://github.com/swiftlang/swift-foundation/blob/main/Sources/FoundationEssentials/JSON/JSONDecoder.swift | `JSONDecoder` in FoundationEssentials | main, 2026 | primary; why the SDK needs no full Foundation |
| https://github.com/swiftlang/swift-testing/blob/main/Sources/Testing/Testing.docc/ParameterizedTesting.md | Swift Testing parameterized tests | main, 2026 | primary; the `arguments:` form of the nine-case status test |
| https://github.com/swiftlang/swift-testing/blob/main/Sources/Testing/Traits/TimeLimitTrait.swift | `.timeLimit` trait | main, 2026 | primary; every process test carries it (SW-TEST-13) |
| https://github.com/ocx-sh/ocx/blob/5de9d777eb7d/crates/ocx_exit/src/exit_code.rs | ocx exit codes 0-87 | ocx 0.6.5 era, `5de9d777eb7d` | primary (the tool's own source); the mapping table and `#[non_exhaustive]` |
| https://ocx.sh/schemas/reports/v1.json | ocx's published `--format json` report contract | 2026 | primary (the tool's own contract); presence rules for decode vs `decodeIfPresent` |
| https://github.com/ocx-sh/ocx-sdk-python/tree/80136dde4162/src/ocx_sdk | `_process.py`, `_errors.py`, `_bootstrap.py`, `_results.py`, `_client.py` | `80136dde4162` | the fleet's SDK baseline; every Python row in 2.1 cites file:line |
| https://man.freebsd.org/cgi/man.cgi?query=sysexits&sektion=3 | sysexits(3) | BSD | meaning of 64-78 behind ocx's table |
| https://www.infoq.com/news/2026/09/swift-6-4-released/ | InfoQ summary of Swift 6.4 | 2026-09 | secondary; confirms "Subprocess package is now stable" |
| swiftlang/swiftly @c8cf2e35bfca `Sources/SwiftlyCore/ModeledCommandLine.swift:64-71`, `Sources/Swiftly/Proxy.swift:94-95` | exemplar corpus: latent environment bug; signal collapsed to `exit(1)` | 2026 | exemplar for S05/S06 |
| tuist/tuist @2f6ac74754bf `cli/Sources/TuistProcess/CommandRunner.swift:321`, `.../SubprocessRunner.swift:33-46` | exemplar corpus: separate signal error, symmetric 10 MiB limits | 2026 | exemplar for S06/S12 |
| `.agents/research/go-api.md` GO-API-18..20 (lines 47-49, 196, 218, 231) in this repo | the Go SDK's version gate, `128+n`, timeout ordering | wave 3 sibling | independent convergence on the same three decisions |
