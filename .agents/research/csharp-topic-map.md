---
title: "C# topic map: wave 0 consolidated, wave 1 commissioned"
phase: 3
model: opus
date: 2026-10-10
wave: "0 grounding consolidated → 1 commissioned"
inputs:
  - csharp-frame.md
  - csharp-audit/ocx-cli-contract.md
  - csharp-audit/python-sdk-digest.md
  - csharp-audit/exemplar-cli-wrappers-and-sdks.md
  - csharp-audit/exemplar-build-and-gates.md
  - csharp-audit/exemplar-language-shape.md
  - csharp-topic-map/canonical.md
  - csharp-topic-map/practitioner.md
  - csharp-topic-map/codified.md
  - csharp-topic-map/failure.md
  - csharp-topic-map/shifts.md
  - csharp-topic-map/domain.md
  - ../../research/swift-topic-map.md (shape only, first 120 lines)
candidates_deduplicated: 112
selected_wave_1: "7 groups, 18 subtopics"
---

# C# topic map (phase 3)

## How to read this

1. **Every row is a question.** Each one is a question a later rule answers with a named check.
2. **Coverage is measured against the sibling lore sets.** The fleet has zero first-party C# (frame).
   - `covered`: a sibling rule already owns both the glob and the content. Only `code-docs` qualifies, because it already globs `**/*.cs`.
   - `partial`: a sibling owns the *shape* but none of the .NET mechanism. Examples are `python-quality/processes.md`, `swift-quality/io.md` and `cli-contract.md`, the Go `api-design` SDK rows, and the release skills.
   - `uncovered`: everything else, which is most rows.
3. **Priority is judged against two consumers.**
   - **The ocx C# SDK**, the owner's adopting codebase (frame correction 1): a .NET library that wraps the `ocx` CLI on Windows, Linux and macOS, on x64 and arm64.
   - **General C# quality** for any lore user.

   Tiers:
   - **P0**: selected for wave 1, or folded into a wave-1 subtopic.
   - **P1**: wave 2.
   - **P2**: wave 2 or later, only if cheap.
4. **Source keys.**
   - Audits: [ocx] ocx-cli-contract · [py] python-sdk-digest · [wrap] exemplar-cli-wrappers-and-sdks · [gates] exemplar-build-and-gates · [shape] exemplar-language-shape.
   - Scouts: [canon] canonical · [prac] practitioner · [cod] codified · [fail] failure · [shift] shifts · [dom] domain.
5. **Version-specific rows carry their version.** The versions current on 2026-10-10:

   | Line | Version | Status |
   |---|---|---|
   | .NET 10 LTS | SDK 10.0.401, C# 14 | Supported to 2028-11-14 |
   | .NET 8 LTS | 8.0.425 | EOS 2026-11-10 |
   | .NET 9 STS | 9.0.318 | EOS 2026-11-10 |
   | .NET 11 | 11.0.100-rc.1, C# 15 | GA Nov 2026; anything here is marked **RC1 only** |

## Frame corrections

Each correction is a place where the audits or scouts contradict the frame. The frame body is not edited; these are the appended corrections.

1. **The net8.0 floor is one month from end of support.** The frame calls .NET 8 "the floor".
   - .NET 8 and .NET 9 both reach EOS on 2026-11-10 ([canon], releases-index); .NET 10 runs to 2028-11-14.
   - An SDK first shipped in Q4 2026 with a net8-only floor ships onto an unsupported runtime within weeks.
   - The floor is therefore a decision (csharp-build-tfm-reach), not a premise. The live options are `net8.0;net10.0` or `net10.0` alone.
2. **The C# version is not bound to the TFM.**
   - Measured default LangVersion: netstandard2.0 → 7.3, net8.0 → 12, net10.0 → 14 ([canon]).
   - `LangVersion=14` on net8.0 compiles the `field` keyword; without it net8 gives CS9202 ([shift]).
   - "C# 14 needs .NET 10" is wrong. "C# 14 on net8 is a supported configuration" is also wrong: Microsoft documents newer-than-default LangVersion as unsupported.
   - On netstandard2.0 the ceiling is set by polyfills. Missing ones give CS0518 IsExternalInit, CS0656 RequiredMember and CS0234 Index/Range ([canon]).
3. **netstandard2.0 buys no platform reach.** The frame poses ns2.0 as the "all platforms" question. Modern .NET already runs on every one of the 8 ocx dist targets: win, osx, linux and linux-musl, each on x64 and arm64 ([ocx] §8.13).
   - ns2.0 adds *runtimes*, not OSes or CPUs: .NET Framework 4.6.1–4.8.1, Mono, Unity and Xamarin.
   - Unity's default profile is netstandard2.1 ([prac]), so a net8-only package is invisible to Unity and to .NET Framework.
   - The owner's ".net core … all platforms" is satisfied by net8+/net10 plus a 3-OS × 2-arch CI matrix. All-platforms is a matrix property, not a TFM property.
4. **netstandard2.0 has a measured cost in exactly the APIs an ocx SDK needs.** The ns20 compile probe ([wrap]) and [py] §11 show what is missing:
   - On the process path: ArgumentList, `Kill(entireProcessTree)`, WaitForExitAsync, StandardInputEncoding and `OperatingSystem.IsWindows`.
   - On the bootstrap path: System.Formats.Tar, File.SetUnixFileMode and an in-box TimeProvider.
   - Trim and AOT analysis.
   - It also starts from LangVersion 7.3, so it needs polyfills.

   Two corpus counts point in opposite directions:
   - **Shipping ns2.0:** 9 of 13 wrappers and SDKs ship it ([wrap]), and 4/4 vendor SDKs keep it ([gates]).
   - **Modern-only:** the four ocx-shaped process wrappers that drop it are SimpleExec, Pulumi, Cake and Aspire.

   Microsoft's guidance says to start at net8+ and only *consider* ns2.0. The Azure guidelines mandate ns2.0 ([canon]).
5. **The "32-bit .NET Framework cannot be served" claim in [ocx]/[wrap] is overstated.** ocx has no win-x86 build. Under WOW64, though, a 32-bit host can still spawn an x64 `ocx.exe`.
   - The real hazard is binary selection that keys on ProcessArchitecture (X86) instead of OSArchitecture.
   - The claim is unverified and is commissioned in csharp-packaging-ocx-binary-acquisition and csharp-build-tfm-reach.
6. **The ocx CLI contract the SDK must bind to is unreleased.**
   - The `contract` key, `schema_version`, the error document and cli.json exist only on ocx main ([6daf9a164](https://github.com/ocx-sh/ocx/commit/6daf9a164)). Released v0.6.5 lacks them.
   - Exit codes differ between releases: 13 on main, 18 on 0.6.5. Code 82 was reused with a new meaning.
   - `error.kind` ≠ exit code: 81 maps to permission_denied.
   - The reports v1 and v2 schemas are both live, so nothing is frozen.
   - The sdkgen `MINIMUM_OCX="0.6.4"` is wrong.
   - C# is not an sdkgen language; `Lang` has only Rust ([ocx]).

   The frame's "wrap the CLI" premise holds. Its implied stable target does not.
7. **The Python reference SDK is not the clean model the frame quotes ([py]).**
   - **"Wrap not reimplement" is partly false.** `_bootstrap.py` and `_dist.py` (1,809 LOC) reimplement ocx's installer.
   - **Windows and arm64 are unverified.** The contract tier runs on ubuntu only, the Windows kill path is `pragma: no cover`, and there are no arm64 legs (S5/S6).
   - **Smell S2:** child exit codes from passthrough commands are mapped like ocx's own codes.
   - **Smell S3:** 36 builtin ValueErrors leak past OcxError.

   Port: the presence-rule table, the choke-point layering and the bootstrap hardening. Do not port: S2, S3, the untested platforms.
8. **Exemplar norms contradict the "obvious" defaults the frame lists.** An agent should not assume them.
   - **Sealing:** 44% of public classes are sealed, not "always seal".
   - **Records:** about 3% of types.
   - **ConfigureAwait(false):** at 82%, it follows whether CA2007 is enabled, not a belief ([shape]).
   - **Logging:** 0 of 9 wrappers and SDKs use ILogger ([shape]).
   - **JSON:** 0 of 5 vendor SDKs source-generate System.Text.Json ([wrap]).
   - **ArgumentList:** only 3 of 10 process spawners use it ([wrap]).

   The frame's layer list ("records and `with`", "source generators vs reflection") reads as endorsement. The map treats each one as an open question.
9. **"Analyzers as the gate" is false at the defaults.** `AnalysisMode` Default yields 0 warnings on the planted probe; Recommended yields 17 and All yields 24 ([cod]).
   - CA2007, CA1031, CA2000, CA1849, CA1062 and CA1063 fire only at All.
   - Bulk `.editorconfig` severities are ignored once AnalysisMode is set.
   - A floating `AnalysisLevel` with TreatWarningsAsErrors breaks on the SDK 11 upgrade, which adds CA1517, CA1876, CA1877, CA2026, CA2027 and CA2028.
   - NuGetAuditMode is `all` for net10, so NU1901–1904 become errors under TWAE.
   - No Microsoft rule catches a process hazard ([cod]).
10. **.NET 11 Process APIs are RC1 only.** Process.Run/RunAsync, RunAndCaptureText, ProcessExitStatus, Signal(PosixSignal), KillOnParentExit and StartDetached exist only on net11 ([wrap], [shift]).
    - KillOnParentExit covers Linux, Windows and Android, not macOS.
    - The design must not depend on them. Cake gates them behind `#if NET11_0_OR_GREATER`.
11. **.NET 10 changed SIGTERM handling.** The default SIGTERM handler was removed, so ProcessExit no longer runs and the exit code stays 143 ([shift], [canon]).
12. **The `bazel-quality/csharp.md` depth file has no evidence.** None of the 35 exemplars has a BUILD.bazel or MODULE.bazel, and no scout found rules_dotnet adoption. Drop it.

## The map

The 112 deduplicated candidates are grouped by surface. Rows marked "→ <slug>" are folded into that wave-1 subtopic.

### Process control (the SDK's core)

| # | Topic | Coverage | Priority, justified | Sources |
|---|---|---|---|---|
| PR-01 | Is argv passed as ProcessStartInfo.ArgumentList, and is a string `Arguments` path ever defensible? | partial | P0 → csharp-process-launch-and-argv. 10/10 wrappers keep a string path. E4b showed a string join corrupting argv, and CliWrap #298 is a backslash bug. An RS0030 ban makes it checkable. | wrap, canon, cod, fail, py |
| PR-02 | How is `ocx` resolved: a pinned path, PATH scan, `ocx.exe` by exact name, refusal of cwd or world-writable hits (CWE-426)? | partial | P0 → launch. The Python SDK resolves once and refuses unsafe hits; no C# wrapper does. | ocx, py, dom |
| PR-03 | Which env vars must a hermetic ocx call scrub or set, and are env keys case-insensitive on Windows? | uncovered | P0 → launch. CLICOLOR_FORCE leaks ANSI into JSON, and OCX_* vars change behaviour. Python S7/S8 bugs. | ocx, py, dom |
| PR-04 | How are secrets passed (stdin) and kept out of argv, logs, exception text and record ToString? | partial | P0 → launch. ocx has `--password-stdin` and `--identity-token-stdin`. Records print every member. | ocx, py, dom, prac |
| PR-05 | What happens if the target is a `.cmd`/`.bat` shim (BatBadBut class)? | uncovered | P0 → launch. Needs a Windows fixture. ocx shims are native exes, but users can point the SDK anywhere. | dom, fail |
| PR-06 | How are stdout and stderr drained concurrently and bounded in size? | partial | P0 → csharp-process-streams-and-encoding. E1 deadlock measured at 200 KB of stderr. | wrap, fail, canon, py |
| PR-07 | Does WaitForExitAsync wait for pipe EOF or drop trailing output, and how is a grandchild-held pipe bounded? | uncovered | P0 → streams. E7: a 5001 ms stall (runtime#29232/#120452). The Meziantou "drops output" claim is unverified on 8/10. | wrap, prac, fail |
| PR-08 | Which encodings are set on stdout, stderr and stdin (default null → OEM codepage on Windows; BOM)? | uncovered | P0 → streams. CliWrap #196; the VSTest→MTP BOM-on-stdin trap. | wrap, fail, shift, py |
| PR-09 | How does cancellation become graceful interrupt, then tree kill, on each OS? | partial | P0 → csharp-process-cancellation-and-exit. E3: Kill(false) orphans the grandchild. Only 3/10 wrappers do a tree kill. | wrap, canon, dom, py |
| PR-10 | Is caller cancellation distinguishable from an SDK timeout? | uncovered | P0 → cancellation. Two distinct exception types are needed ([py] §11). | py, prac |
| PR-11 | How are exit statuses mapped: signal 137/143, passthrough child codes, 13 vs 18 code sets, reused 82? | partial | P0 → cancellation. Python S2 is the anti-pattern. | ocx, py, wrap |
| PR-12 | When is a retry allowed (75 only; never mutating commands by default; never exec children)? | partial | P0 → cancellation. One line on the contract. | ocx, py |
| PR-13 | How are .NET 11 Process APIs (Run/RunAsync, ProcessExitStatus, KillOnParentExit) adopted without breaking net8/10? | uncovered | P1, era-flagged. RC1 only; covered in cancellation as a fencing note. | wrap, shift, canon |
| PR-14 | How does the SDK avoid orphans and zombies if its host dies (Job Objects; KillOnParentExit not on macOS; SIGCHLD runtime#114847)? | uncovered | P1. Host-death is rarer than cancellation, and the mechanisms differ per OS. | fail, shift, ocx |
| PR-15 | How does .NET 10's removed SIGTERM handler affect a host process using the SDK? | uncovered | P2. Host-app concern, not library. | canon, shift |
| PR-16 | Should the SDK depend on CliWrap or own a ~300-400 LOC engine on ArgumentList? | uncovered | P0, decided inside the process group's consolidation. CliWrap ranks first (12/13) but adds a dependency and its cancellation semantics. | wrap, dom |
| PR-17 | How long-running ocx commands stream progress (stderr lines, events) to the caller | uncovered | P2. ocx has no progress contract yet. | ocx, dom |

### Async contract and resource ownership

| # | Topic | Coverage | Priority, justified | Sources |
|---|---|---|---|---|
| AS-01 | What are the CancellationToken naming, position, default and forwarding rules (CA2016, CA1068)? | partial | P0 → csharp-async-cancellation-and-context. Stripe: 701/1330 async methods lack a CT. | shape, wrap, cod, canon |
| AS-02 | Does a net8+ library still need ConfigureAwait(false), and which analyzer enforces the policy (CA2007)? | partial | P0 → cancellation-and-context. The 82% rate tracks analyzer severity, not reasoning. | shape, cod, prac |
| AS-03 | Task or ValueTask in the public API? | uncovered | P0 → cancellation-and-context. Cheap to settle with the CT rule. | canon, prac |
| AS-04 | When must TaskCompletionSource use RunContinuationsAsynchronously (thread theft)? | uncovered | P0 → cancellation-and-context. An engine needs a TCS for exit. | prac, fail |
| AS-05 | IAsyncEnumerable streaming with [EnumeratorCancellation] (CS8425)? | uncovered | P2. No streaming ocx command yet. | canon |
| AS-06 | Sync-over-async and sync facades (VSTHRD002, VSTHRD103, CA1849)? | partial | P0 → csharp-async-disposal-and-sync-bridges. Exemplar sync facades exist; agents emit `.Result`. | shape, cod, wrap |
| AS-07 | async void and fire-and-forget (VSTHRD100/101/110, CA2012)? | partial | P0 → disposal-and-sync-bridges. Ranked agent mistake ([shape] §7). | shape, cod |
| AS-08 | Who owns which disposables (Process, CTS, registrations), and is the reflexive Dispose(bool)/finalizer pattern wrong (CA1063, CA2000, CA2213)? | partial | P0 → disposal-and-sync-bridges. Nothing caught an undisposed Process ([cod]). Only 10 finalizers in the corpus. | shape, cod, canon |
| AS-09 | Is a client instance thread-safe for concurrent calls, and how is that documented? | uncovered | P1. Matters once the API shape is fixed. | canon, dom |
| AS-10 | Channels, thread-pool starvation, SemaphoreSlim patterns? | uncovered | P2. Not on the SDK's path. | canon, prac |
| AS-11 | Async suffix on async methods (Anthropic drops it)? | uncovered | P0 → cancellation-and-context. One line. | wrap, shape |

### Public API, evolution, errors

| # | Topic | Coverage | Priority, justified | Sources |
|---|---|---|---|---|
| API-01 | Entry type: a sealed client with static CreateAsync, an abstract runner seam, or a builder? | partial | P0 → csharp-api-surface-shape. Pulumi layering is the recommended model ([wrap]). | wrap, dom, py |
| API-02 | Options and result types: class, record or record struct? ToString leaks, collection equality | partial | P0 → surface-shape. Agents emit records everywhere (3% in the corpus); secret leak. | shape, prac, py |
| API-03 | How are open sets (ocx kinds, statuses) modelled: extensible string structs or enums? | uncovered | P0 → surface-shape. Closed enums break on new ocx values ([ocx] §8.9). | wrap, ocx, canon |
| API-04 | Seal by default? CA1852 scope | partial | P0 → surface-shape. 44% sealed; agents either always or never seal. | shape |
| API-05 | How are unfrozen contract parts marked ([Experimental] with a diagnostic ID)? | uncovered | P0 → surface-shape. Reports v1/v2 are both live. | wrap, ocx |
| API-06 | Public API tracking (PublicApiAnalyzers RS0016/RS0017) and package validation (CP0002)? | uncovered | P0 → csharp-api-evolution-gates. 9 and 6 repos respectively; checkable at build. | gates, wrap, canon |
| API-07 | Library change rules: optional params, overloads, adding a CT, positional record params? | uncovered | P0 → evolution-gates. | canon, wrap |
| API-08 | Exception hierarchy derived from ocx exit codes; a dedicated parse exception | partial | P0 → csharp-api-exceptions-from-exit-codes. Python has 26 classes; is that right-sized? | py, ocx, wrap |
| API-09 | No framework exceptions leaking (JsonException, ArgumentException, Win32Exception)? | uncovered | P0 → exceptions. Python S3. | py |
| API-10 | Exception design rules: sealed leaves, standard ctors CA1032, SYSLIB0051, catch-all CA1031, CA2201 | partial | P0 → exceptions. 39% sealed; simple-exec suppresses CA1031/CA1032. | shape, cod |
| API-11 | Logging and tracing in a wrapper: none, ILogger abstractions, ActivitySource, or callbacks? | uncovered | P1. 0/9 SDKs use ILogger. The dependency decision follows the API shape. | shape, py, dom |
| API-12 | DI registration (IServiceCollection extensions) as a separate add-on package? | uncovered | P2. Domain says keep the core DI-free. | dom |
| API-13 | Nullable annotations as the API contract; `!` suppression policy | partial | P1 → language wave. Nothing catches `!` ([cod]). | shape, cod |
| API-14 | XML docs on the public surface (GenerateDocumentationFile, CS1591) | covered | P1. code-docs owns `**/*.cs` comment hygiene; the build-side property goes to the analyzer gate. | gates, cod |
| API-15 | Guard clauses: ThrowIfNull is TFM-bound (CA1510 vs CA1062 on ns2.0) | uncovered | P1. Agents emit ThrowIfNull on ns2.0 ([shape] §7). The TFM verdict decides it. | shape, canon |
| API-16 | Obsoletion with DiagnosticId/UrlFormat | uncovered | P2. | canon |
| API-17 | How many methods: one per ocx leaf command (70), grouped sub-clients, or a generic Run? | uncovered | P1. Decided after the contract stabilises and sdkgen grows C#. | ocx, py |

### JSON binding

| # | Topic | Coverage | Priority, justified | Sources |
|---|---|---|---|---|
| JS-01 | Is System.Text.Json source generation required for a library? | uncovered | P0 → csharp-json-source-generation-and-trim. 0/5 vendor SDKs use it, but AOT consumers need it. | wrap, canon, shift |
| JS-02 | IsAotCompatible / IsTrimmable and IL2026/IL3050 as errors? | uncovered | P0 → source-generation. 11 repos set it; reflection is disabled under PublishTrimmed. | gates, canon |
| JS-03 | Policy for unknown members, unknown enum values and unknown union tags | partial | P0 → csharp-json-forward-compatible-binding. Contract point §8.9. | ocx, canon, fail |
| JS-04 | Absent vs null vs required (x-ocx absent marker, JsonRequired) | uncovered | P0 → forward-compatible-binding. | ocx, py |
| JS-05 | JsonSerializerOptions.Strict and AllowDuplicateProperties (net10): where is strict right? | uncovered | P0 → forward-compatible-binding. | shift, cod |
| JS-06 | Schema-diff test of C# models against reports.v1.json (port of the presence-rule table) | uncovered | P0 → forward-compatible-binding. Highest-value Python artifact. | py, ocx, dom |
| JS-07 | Version handshake on `ocx --format json version` → `contract` | uncovered | P0 → forward-compatible-binding. Needs an ocx release (owner decision). | ocx |
| JS-08 | Newtonsoft.Json vs System.Text.Json | partial | P0 → source-generation, one line. Agents reach for Newtonsoft ([shape] §7). | shape, wrap |
| JS-09 | C# 15 unions and STJ round-trip | uncovered | P2. RC1 only. | shift |
| JS-10 | Date, number and duration formats on the wire | uncovered | P2. | canon, fail |

### Build, analyzers, pinning

| # | Topic | Coverage | Priority, justified | Sources |
|---|---|---|---|---|
| BD-01 | netstandard2.0 or net8+ only: what does each buy and cost? | uncovered | P0 → csharp-build-tfm-reach (mandatory). Owner question. | wrap, gates, canon, prac, py, shape |
| BD-02 | Floor: net8.0;net10.0 or net10.0 only, given net8/9 EOS on 2026-11-10 | uncovered | P0 → tfm-reach. | canon, shift |
| BD-03 | LangVersion decoupled from TFM; polyfills (PolySharp/Polyfill) | uncovered | P0 → tfm-reach. | canon, shift |
| BD-04 | Pinned analyzer posture: AnalysisLevel, AnalysisMode, TWAE, Nullable as errors | uncovered | P0 → csharp-build-analyzer-gate. Default posture is silent. | cod, gates |
| BD-05 | Severity precedence across .globalconfig, .editorconfig, AnalysisMode and WarningsAsErrors | uncovered | P0 → analyzer-gate. Bulk severities are ignored under AnalysisMode. | cod |
| BD-06 | Third-party analyzer set: Meziantou, VSTHRD, BannedApiAnalyzers, Roslynator, StyleCop | uncovered | P0 → analyzer-gate. RS0030 is the only one that caught a hazard. | cod, gates |
| BD-07 | Format gate (dotnet format --verify-no-changes, EnforceCodeStyleInBuild) | uncovered | P0 → analyzer-gate. Used by 4 and 11 repos. | gates, cod |
| BD-08 | global.json: rollForward, allowPrerelease, unpinned dirs picking 11 RC1 | uncovered | P0 → csharp-build-sdk-and-restore-pinning. Measured in the frame (correction 3). | gates, shift |
| BD-09 | Central Package Management with transitive pinning | uncovered | P0 → sdk-and-restore-pinning. | gates, shift |
| BD-10 | Lock files and RestoreLockedMode for a library | uncovered | P0 → sdk-and-restore-pinning. Used by 5 and 3 repos. | gates, cod |
| BD-11 | NuGetAudit mode and its TWAE interaction (NU1901–1904) | uncovered | P0 → sdk-and-restore-pinning. | cod, gates |
| BD-12 | Package source mapping | uncovered | P0 → sdk-and-restore-pinning. | canon, fail |
| BD-13 | Directory.Build.props/targets layering | uncovered | P1. 32 repos; mechanics are well known. | gates |
| BD-14 | slnx migration | uncovered | P2. | gates, shift |
| BD-15 | File-based apps (`dotnet run app.cs`) for repo scripts | uncovered | P2. | shift |
| BD-16 | NU1510 package pruning (.NET 10) | uncovered | P2 → diagnose skill. | shift |
| BD-17 | Terminal Logger and the `--interactive` default in CI | uncovered | P2 → diagnose skill. | shift |
| BD-18 | `dnx` bypassing global.json | uncovered | P2 → diagnose skill. | shift |
| BD-19 | Bazel rules_dotnet depth file | uncovered | P2, dropped. 0/35 adoption. | gates |
| BD-20 | Build-server and daemon hangs (MSBuild node reuse, VBCSCompiler holding pipes) | uncovered | P1 → diagnose skill. MedallionShell #104. | fail |

### Packaging and the ocx binary

| # | Topic | Coverage | Priority, justified | Sources |
|---|---|---|---|---|
| PK-01 | NuGet metadata: id, license expression, readme, icon, repository | partial | P0 → csharp-packaging-nuget-release. Release-skill shape exists in go/jvm/swift. | canon, gates |
| PK-02 | SourceLink, deterministic builds, ContinuousIntegrationBuild, snupkg, `/_/` paths | uncovered | P0 → nuget-release. | canon, gates, prac |
| PK-03 | Version source (MinVer, GitVersion, hand-set) | uncovered | P0 → nuget-release. | gates |
| PK-04 | Strong naming on modern .NET | uncovered | P0 → nuget-release. 22 repos ship .snk; is it needed? | gates, canon |
| PK-05 | Trusted Publishing via OIDC (NuGet/login) vs API keys | uncovered | P0 → nuget-release. 11 repos. | gates, shift |
| PK-06 | Author signing (dotnet/sign, Key Vault; the SHA-1 sign error) | uncovered | P0 → nuget-release. 2 repos; cost is an owner decision. | gates, shift |
| PK-07 | ocx binary delivery: PATH, per-RID native assets, or download | uncovered | P0 → csharp-packaging-ocx-binary-acquisition. Owner decision on the model. | dom, ocx, py, wrap |
| PK-08 | RID detection and RID→triple mapping (musl, Rosetta, WOW64, Windows-on-ARM emulation) | uncovered | P0 → binary-acquisition. | ocx, py, dom |
| PK-09 | Download verification (sha256) and safe extraction (Tar traversal, SetUnixFileMode, atomic rename) | uncovered | P0 → binary-acquisition. No C# exemplar verifies a digest. | py, dom, wrap |
| PK-10 | Self-contained, single-file, Native AOT and container publish for apps | uncovered | P2. The SDK is a library; app publishing goes to dotnet-release wave 2. | canon, shift |
| PK-11 | HttpClient lifetime for downloads | uncovered | P0 → binary-acquisition, one line. | fail |
| PK-12 | Signature verification of the ocx binary beyond the digest | uncovered | P1. Python does not do it; ocx has `package attest`. | py, ocx |
| PK-13 | NuGet ID prefix reservation and package naming | uncovered | Owner decision. | canon |

### Cross-platform correctness and proof

| # | Topic | Coverage | Priority, justified | Sources |
|---|---|---|---|---|
| XP-01 | Path APIs: Path.Combine discarding at a rooted segment, Path.Join, case sensitivity, reserved names, long paths | partial | P0 → csharp-crossplatform-paths-culture-guards. | fail, prac, canon |
| XP-02 | Culture and string comparison (CA1305, CA1307, CA1309, CA1310, CA1311) | uncovered | P0 → paths-culture-guards. "InvariantCulture is not invariant". | prac, cod, canon |
| XP-03 | Platform guards (OperatingSystem.IsX, CA1416, [SupportedOSPlatform]) | uncovered | P0 → paths-culture-guards. | canon |
| XP-04 | Home and config roots per OS (HOME vs USERPROFILE, OCX_HOME) | partial | P0 → paths-culture-guards. Python S7. | py, ocx |
| XP-05 | NTFS junctions and symlinks (ResolveLinkTarget) | uncovered | P0 → paths-culture-guards. ocx uses junctions. | ocx |
| XP-06 | A fake-ocx dummy exe as the test seam | uncovered | P0 → csharp-crossplatform-fake-cli-harness. CliWrap.Tests.Dummy. | dom, wrap, py |
| XP-07 | Test tiers: unit, fake-binary, contract against pinned ocx | partial | P0 → fake-cli-harness. | py, dom |
| XP-08 | Framework and runner: xUnit v3, MSTest, NUnit on MTP vs VSTest; exit 8 on zero tests | uncovered | P0 → fake-cli-harness. MTP in 12 repos. | gates, shift, canon |
| XP-09 | CI matrix: 3 OS × 2 arch × TFM legs, musl leg | partial | P0 → csharp-crossplatform-ci-matrix. Owner hard requirement; 3/35 repos test arm64. | gates, py, wrap |
| XP-10 | Coverage tooling (coverlet vs Microsoft.Testing.Extensions.CodeCoverage) | uncovered | P1. | gates |
| XP-11 | TimeProvider/FakeTimeProvider for retry and backoff | uncovered | P0 → fake-cli-harness. | py, prac |
| XP-12 | Snapshot testing (Verify) for API listings and JSON | uncovered | P2. | wrap |
| XP-13 | Benchmarks (BenchmarkDotNet) | uncovered | P2. | gates |
| XP-14 | Line endings and Environment.NewLine in parsed output | uncovered | P0 → paths-culture-guards. | fail |

### Language and idioms (general C# quality)

| # | Topic | Coverage | Priority, justified | Sources |
|---|---|---|---|---|
| LG-01 | Nullable project-wide vs `#nullable` per file (221 enable vs 562 disable); `!` policy; nullable warnings as errors | uncovered | P1. Agents add per-file pragmas ([shape] §7). | shape, cod |
| LG-02 | C# 14 features (`field`, extension members, null-conditional assignment) on net8 vs net10 | uncovered | P1. Era. | canon, shift |
| LG-03 | Fencing C# 15 / .NET 11 features (unions, etc.) in multi-target code | uncovered | P1. RC1 only. | shift, canon |
| LG-04 | Primary-constructor pitfalls (captured params, CS9124) | uncovered | P2. | prac |
| LG-05 | Collection expressions, pattern matching and switch-expression idioms | uncovered | P2. | canon |
| LG-06 | Span/ref struct and allocation idioms | uncovered | P2. Not on the SDK path. | canon |
| LG-07 | Mimicking generated-SDK style (Stripe/OpenAI generator output) in hand-written code | uncovered | P1. [shape] §7 agent mistake. | shape |
| LG-08 | `required`/`init` on ns2.0 (polyfills) | uncovered | P1, after the TFM verdict. | canon |
| LG-09 | Banned legacy APIs (DateTime.Now, Encoding.Default, Thread.Sleep in async) via RS0030 | uncovered | P0 → analyzer-gate. | cod |

### Security, observability, contract

| # | Topic | Coverage | Priority, justified | Sources |
|---|---|---|---|---|
| SC-01 | Deserialization safety (no TypeNameHandling, BinaryFormatter removed) | uncovered | P1. | canon, fail |
| SC-02 | Redaction in logs and diagnostics (Nuke/Cake secret masking) | partial | P0 → launch (PR-04). | dom |
| SC-03 | Supply chain: dependency count, transitive audit, minimal runtime deps for an SDK | uncovered | P1. | canon, gates |
| OB-01 | Forwarding `--log-level` (OCX_LOG_LEVEL is ignored by 0.6.5) and surfacing ocx stderr logs | uncovered | P1. | ocx |
| OB-02 | ActivitySource/Meter for SDK calls | uncovered | P1. Tied to API-11. | py, dom |
| CT-01 | Supported-ocx window: a tested range (Python) or a single pinned version (Pulumi)? | uncovered | P1. Gated on the owner's contract-baseline decision. | dom, py, ocx |
| CT-02 | Generating C# models and commands from ocx schemas (sdkgen has no C#) | uncovered | P1. Large; after the hand-written slice proves the shape. | ocx |
| CT-03 | `index list` on a missing package exits 0; report_then_fail commands (17); interactive `login` | partial | P0 → cancellation (exit mapping) and streams (parse on failure). | ocx |

### Agent procedures (skills)

| # | Topic | Coverage | Priority, justified | Sources |
|---|---|---|---|---|
| AG-01 | Upgrade procedure: TFM floor bump, SDK pin, LangVersion, AnalysisLevel bump, net8/9 EOS | partial | P1 → dotnet-upgrade wave 2. Consumes the tfm-reach and analyzer-gate verdicts; urgent before 2026-11-10. | shift, cod, canon |
| AG-02 | Diagnose catalogue: NU1xxx, NETSDK, CS restore/build errors, analyzer noise, hangs | partial | P1 → dotnet-diagnose wave 2. | shift, fail, cod |
| AG-03 | Release procedure | partial | P0 → nuget-release (feeds dotnet-release). | gates, shift |
| AG-04 | Agent-config prior art (Aspire `.agents/skills`, `.github/instructions/xmldoc.instructions.md`; Azure `.github/skills`) | uncovered | P2. Inspiration for skill shape only. | dom |

## Selected for wave 1

There are 7 groups and 18 subtopics. They were selected on four criteria:

- the row is uncovered;
- it gives direct leverage for the ocx SDK;
- agents demonstrably get it wrong (the [shape] §7 ranking, the [wrap] counts, the [cod] probe);
- a rule can check it (an analyzer ID, a banned symbol, an MSBuild property, a fixture).

The netstandard2.0-vs-net8+ decision is `csharp-build-tfm-reach`. It consolidates first, because its verdict sets the TFM assumptions of every other brief. Until it lands, workers test both `net8.0` and `net10.0`, and test `netstandard2.0` wherever the brief names it.

### csharp-process: Driving the ocx child process

**Consolidation brief.** Merge the three subtopics into one depth file, `csharp-quality/processes.md`, ordered launch → I/O → termination.
- **Rows.** Each row is a rule with a named check: an analyzer ID, a BannedSymbols.txt entry, a grep, or a fixture test.
- **Consistency.** Reconcile the overlaps:
  - The encoding verdict (streams) must match the stdin-secret path (launch).
  - The tree-kill verdict (cancellation) must agree with the grandchild-held-pipe timeout (streams).
- **Reference engine and bans.**
  - Produce one reference engine sketch within the ~300-400 LOC budget from the wrapper audit. Every row points at it.
  - Produce one BannedSymbols.txt fragment covering every ban found.
  - Decide PR-16, a CliWrap dependency vs an owned engine, and give the reason.
- **.NET 11.** Mark every .NET 11-only API with `#if NET11_0_OR_GREATER` guidance; never make one the default.
- **What survives.**
  - Rows that cannot be machine-checked get a named reading heuristic instead.
  - Drop any claim that was not reproduced red/green on SDK 10.0.401, and on the Windows host if it is a Windows claim.

#### csharp-process-launch-and-argv: How must the SDK launch ocx: argv, executable resolution, environment and secrets?

```text
Commission: decide the launch half of a C# wrapper over the ocx CLI (net8.0 and net10.0; Windows, Linux, macOS).
(1) ProcessStartInfo.ArgumentList vs the Arguments string: 3/10 wrapper exemplars use ArgumentList, 10/10 keep a string
path; netstandard2.0 lacks ArgumentList (CS1061). Is any string-quoting path defensible, and what must it escape
(CliWrap #298 backslash bug; Windows PasteArguments rules)? (2) Executable resolution: pin an absolute path once vs
per-call PATH lookup; ocx.exe exact name and PATHEXT; refuse a cwd hit on Windows and a group/other-writable dir on
POSIX (CWE-426; /home/mherwig/dev/ocx-sdk-python/src/ocx_sdk/_bootstrap.py:430-484); ocx's stable symlink
$OCX_HOME/symlinks/ocx.sh/ocx/cli/current/content/bin; Win32Exception NativeErrorCode 2 → a typed not-found error.
(3) A .cmd/.bat target: does .NET route through cmd.exe metacharacter parsing (BatBadBut, CVE-2024-24576)?
(4) Environment: ProcessStartInfo.Environment copy semantics; scrub OCX_PROJECT, OCX_GLOBAL, OCX_QUIET, OCX_NO_VERIFY,
OCX_NO_HOOK, OCX_NO_COMPLETIONS; CLICOLOR_FORCE leaking ANSI into JSON; hermetic OCX_NO_CONFIG=1 + OCX_HOME;
case-insensitive keys on Windows (Python smell S8); HOME vs USERPROFILE (S7). (5) Secrets: login --password-stdin,
package sign/attest --identity-token-stdin, never in argv; OCX_AUTH_* redacted from exceptions, logs, record ToString.
Exemplars: Tyrrrz__CliWrap, adamralph__simple-exec, madelson__MedallionShell, pulumi__pulumi-dotnet, nuke-build__nuke
(secret masking), cake-build__cake, PowerShell__PowerShell (native-command args), GitTools__GitVersion (env hygiene).
Fixtures (red on the bad one, green on its twin): argv round-trip of `a b`, `"q"`, `back\\`, `trail\`, an empty string
and a non-ASCII arg through a dummy echo exe, string-join red vs ArgumentList green, on Linux AND the Windows host;
parent OCX_QUIET leaking into the child (red) vs scrubbed (green); a .cmd target receiving `&echo pwned` on Windows.
Checks to evaluate: BannedApiAnalyzers RS0030 on the ProcessStartInfo.Arguments setter and the (string, string) ctor;
Meziantou MA0161/MA0162/MA0163 default states; a grep for UseShellExecute = true.
Decide: the launch rules (one sentence each, each with its check), whether string Arguments is ever allowed, the
resolution policy, and the env baseline the SDK applies to every call.
Method: fixtures under /home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-process-launch-and-argv/, built
with /home/mherwig/.cache/research-lang/dotnet-tools/run.sh inside that tree (global.json pins SDK 10.0.401); Windows
claims re-run on the Windows host staged under C:\Users\ecom\csharp-wintest\ via cmd.exe. Cite exemplars as
owner__repo@sha12:path:line from /home/mherwig/.cache/research-lang/exemplars/csharp/.
```

#### csharp-process-streams-and-encoding: How must stdout, stderr and stdin be pumped so the SDK never deadlocks, truncates or mis-decodes?

```text
Commission: decide the I/O half of the ocx process engine for net8.0 and net10.0 on all three OSes.
Investigate: the sequential ReadToEnd deadlock (wrapper audit E1, ~200 KB of stderr) vs concurrent drain (E2:
Task.WhenAll over ReadToEndAsync; BeginOutputReadLine events; Pipe/Stream copy); WaitForExitAsync semantics: it waits for
EOF on redirected streams (dotnet/runtime#29232, #120452), so a grandchild holding stdout stalls it (E7: 5001 ms) — how
to bound that; re-verify on 8 and 10 the Meziantou claim that WaitForExitAsync can drop trailing output (.NET 5 era);
output size caps so a runaway child cannot exhaust memory (Python uses 1 MiB / 256 MiB style caps); encodings:
StandardOutputEncoding defaults to null → console encoding (OEM codepage on Windows), so set UTF8Encoding(false)
explicitly; StandardInputEncoding and a BOM written on stdin (the VSTest→MTP BOM trap in shifts.md); CliWrap #196
(encoding not honoured), CliWrap #346 (merge deadlock), MedallionShell #104 (a build-server daemon inheriting pipes
hangs the read). ocx specifics: `--format json` and `--color never` are pre-subcommand flags with no env equivalent;
stdout carries the JSON document, stderr carries logs; 17 report_then_fail commands write a document AND exit
non-zero, so stdout must be parsed on failure too.
Exemplars: Tyrrrz__CliWrap, madelson__MedallionShell, adamralph__simple-exec, testcontainers__testcontainers-dotnet, dotnet__aspire.
Fixtures (red then green twin): a dummy child that writes 1 MB to stderr then 1 byte to stdout — sequential read hangs
(bounded by a test timeout) vs concurrent drain completes; a child emitting "é€😀" as UTF-8 read on the Windows host with
default encoding (mojibake) vs explicit UTF-8; a child that leaves a sleeping grandchild holding stdout — measure
WaitForExitAsync and the bounded-wait fix; a secret written to stdin with a BOM rejected by the child vs
UTF8Encoding(false) accepted.
Decide: the canonical pump shape, the encoding of all three streams, the size cap, the grandchild-held-pipe policy
(time out vs return what was read), and the rule checks (grep for ReadToEnd() before WaitForExit, a missing
StandardOutputEncoding, synchronous Read* calls in async code).
Method: fixtures under /home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-process-streams-and-encoding/,
via /home/mherwig/.cache/research-lang/dotnet-tools/run.sh (SDK 10.0.401 pinned); Windows claims re-run on the Windows
host under C:\Users\ecom\csharp-wintest\ via cmd.exe; cite exemplars as owner__repo@sha12:path:line from
/home/mherwig/.cache/research-lang/exemplars/csharp/.
```

#### csharp-process-cancellation-and-exit: How does the SDK cancel, time out and kill ocx, and how does it map the exit status?

```text
Commission: decide the termination half of the ocx process engine and its exit-status mapping.
Investigate: CancellationToken → optional graceful phase → Kill(entireProcessTree: true) (net5+, absent on ns2.0);
measured: Kill(false) orphans the grandchild (wrapper audit E3) and only 3/10 wrappers kill the tree. Windows has no
SIGINT for a non-console child: evaluate CliWrap's Signaler helper exe extracted to %TEMP%, GenerateConsoleCtrlEvent,
CREATE_NEW_PROCESS_GROUP (ProcessStartInfo.CreateNewProcessGroup exists on net10) and Job Objects (ocx's own shims use
one); POSIX SIGTERM/SIGKILL surface as ExitCode 143/137; .NET 10 removed the default SIGTERM handler (ProcessExit not
run, exit stays 143). Distinguish caller cancellation (OperationCanceledException carrying the caller's token) from an
SDK timeout (dedicated OcxTimeoutException) using linked sources with CancelAfter. SIGCHLD zombies:
dotnet/runtime#114847. .NET 11 RC1 only: Process.RunAsync, ProcessExitStatus, Signal(PosixSignal), KillOnParentExit
(linux/windows/android, not macOS) — fence with #if NET11_0_OR_GREATER (cake-build__cake precedent), never the default.
Exit mapping: ocx main has 13 codes (0,1,64,65,69,74,75,77,78,79,80,81,82), 0.6.5 has 18, 82 changed meaning between
them, error.kind is not the exit code (81 → permission_denied); passthrough commands (exec, run, package exec,
package test) forward the child's code and must NOT be mapped as ocx errors (Python smell S2); `index list` on a missing
package exits 0; retry only on 75, never by default for mutating commands, never for exec children.
Exemplars: Tyrrrz__CliWrap, adamralph__simple-exec, madelson__MedallionShell, dotnet__aspire, cake-build__cake.
Fixtures (red then green twin): a child that spawns a sleeping grandchild, cancelled with Kill() (grandchild alive after
2 s per ps/tasklist) vs Kill(true), on Linux AND the Windows host; caller-cancel vs timeout yielding the same exception
type (red) vs distinguishable types (green); a passthrough child exiting 75 that the SDK retries (red) vs returns as a
child result (green).
Decide: the cancellation contract (what throws, what returns), the grace period per OS, the Windows interrupt
strategy, the exit-code table and its generation source, and the retry rule.
Method: fixtures under /home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-process-cancellation-and-exit/
via /home/mherwig/.cache/research-lang/dotnet-tools/run.sh (SDK 10.0.401 pinned; a net11 probe pins its own
global.json); Windows claims re-run on the Windows host under C:\Users\ecom\csharp-wintest\ via cmd.exe; cite
exemplars as owner__repo@sha12:path:line from /home/mherwig/.cache/research-lang/exemplars/csharp/.
```

### csharp-async: The async contract of a library

**Consolidation brief.** Merge both subtopics into `csharp-quality/async.md`.
- **Scope.** Both are general C# quality: write the rows for any library, and tag the rows specific to the ocx SDK.
- **Analyzer per row.** Each row names its analyzer ID and the AnalysisLevel/severity at which that analyzer actually fires. The codified probe showed CA2007, CA1849 and CA2000 fire only at All.
- **ConfigureAwait.** Collapse it into one policy sentence plus the exact analyzer configuration that enforces it.
- **Agreement with csharp-process.** The CancellationToken contract must be identical to csharp-process-cancellation-and-exit's.
- **VSTHRD.** List the applicable VSTHRD set (002, 003, 100, 103, 105, 110, 114, 200 per the codified scout) and mark the rest as noise for a library.

#### csharp-async-cancellation-and-context: What is the CancellationToken, ConfigureAwait and Task-type contract of a public async API?

```text
Commission: decide the signature-level async contract for a public .NET library (worked example: the ocx SDK).
Investigate: CancellationToken naming and position (corpus: 91.5% named cancellationToken, 95.4% last parameter),
`= default` vs overloads (stripe__stripe-dotnet: 701/1330 async methods have no token; pulumi__pulumi-dotnet
retrofitted overloads — what that cost), CA2016 (forward the token), CA1068 (token last), CA2007 (ConfigureAwait) and
the AnalysisLevel at which each fires; ConfigureAwait(false) prevalence (82%) tracks CA2007 severity, so decide on
reasons: does a net8+ library still need it for WPF/WinForms/MAUI and legacy ASP.NET consumers;
ConfigureAwaitOptions (.NET 8); TaskCompletionSource with TaskCreationOptions.RunContinuationsAsynchronously (thread
theft); Task vs ValueTask in a public API; the Async suffix (anthropic drops it; Azure and BCL keep it); async-only
vs sync overloads as a signature question (the disposal subtopic owns sync-over-async bodies).
Exemplars: microsoft__vs-threading, App-vNext__Polly, npgsql__npgsql, stripe__stripe-dotnet,
anthropics__anthropic-sdk-csharp, openai__openai-dotnet, Azure__azure-sdk-for-net (sdk/core/Azure.Core),
pulumi__pulumi-dotnet.
Fixtures (red then green twin): a library with an unforwarded token and no ConfigureAwait built at
AnalysisLevel 10.0-recommended (silent: red for the gate) vs 10.0-all or explicit severities (CA2016/CA2007 fire);
a single-threaded SynchronizationContext consumer calling .Result on a library method without ConfigureAwait(false)
(deadlock, bounded by a timeout) vs with it (completes); a TCS completed inline running the continuation on the
completing thread (observed thread id) vs RunContinuationsAsynchronously.
Decide: the token signature rule, the ConfigureAwait policy and its analyzer configuration, the Task/ValueTask rule,
the suffix rule — each with the check that enforces it.
Method: fixtures under /home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-async-cancellation-and-context/,
built with /home/mherwig/.cache/research-lang/dotnet-tools/run.sh from inside that tree (global.json pins SDK 10.0.401).
Cite exemplars as owner__repo@sha12:path:line from /home/mherwig/.cache/research-lang/exemplars/csharp/.
```

#### csharp-async-disposal-and-sync-bridges: When must a type be disposable, and may a library ever bridge sync over async?

```text
Commission: decide resource ownership and sync/async bridging rules for a .NET library.
Investigate: who owns Process, CancellationTokenSource, CancellationTokenRegistration and stream handles in a process
engine; IAsyncDisposable plus IDisposable dual implementation and when only one is right; the reflexive
Dispose(bool)/finalizer pattern (CA1063; only 10 finalizers across 35 exemplars) as an agent mistake; CA2000 and
CA2213 fire only at AnalysisMode All, and the codified probe found nothing catching an undisposed Process — reconfirm
and find a check that does (CA2000 at All, IDISP analyzers, a grep); `using` declarations; sync-over-async:
.Result/.Wait()/GetAwaiter().GetResult() (VSTHRD002, VSTHRD103, CA1849 at All), the sync facades found in the corpus;
async void (VSTHRD100/VSTHRD101), fire-and-forget (VSTHRD110, CA2012 for ValueTask); thread-pool starvation from
blocking. SDK question: async-only (pulumi, CliWrap ExecuteBufferedAsync) vs sync + async (MedallionShell,
StackExchange.Redis dual API, the Python SDK).
Exemplars: microsoft__vs-threading, madelson__MedallionShell, Tyrrrz__CliWrap, testcontainers__testcontainers-dotnet,
npgsql__npgsql, StackExchange__StackExchange.Redis, DapperLib__Dapper.
Fixtures (red then green twin): 2,000 undisposed Process starts in a loop (handle/fd count growth measured via
/proc/self/fd) vs `using`, and which analyzer flags the red one; a sync wrapper calling .Result under a single-threaded
SynchronizationContext (deadlock) vs async-all-the-way; VSTHRD002 and CA1849 firing on the red twin and not the green;
an async void handler whose exception crashes the process vs an async Task.
Decide: the disposal rules (ownership, which interfaces, no reflexive pattern), the SDK's sync-API policy (none, or
thin blocking wrappers with a documented caveat), the analyzer IDs and a BannedSymbols.txt fragment.
Method: fixtures under /home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-async-disposal-and-sync-bridges/,
built with /home/mherwig/.cache/research-lang/dotnet-tools/run.sh from inside that tree (global.json pins SDK 10.0.401).
Cite exemplars as owner__repo@sha12:path:line from /home/mherwig/.cache/research-lang/exemplars/csharp/.
```

### csharp-api: Public API surface, its evolution, and its errors

**Consolidation brief.** Merge into two depth files: `csharp-quality/api-design.md` (surface-shape and evolution-gates) and `csharp-quality/errors.md` (exceptions).
- **Scope.** Rows apply to any NuGet library; the ocx SDK supplies the worked example.
- **Azure guidelines.** Cite an Azure SDK guideline ID wherever the verdict agrees with one. Say explicitly where the corpus contradicts the guidelines: sealing (44%) and records (~3%).
- **Split with dotnet-build.** The evolution-gates MSBuild properties (EnablePackageValidation, PublicApiAnalyzers wiring) also land in dotnet-build's packaging depth. Record which rule owns each so neither duplicates it.
- **Agreement with other groups.**
  - The exceptions verdict must use the same exit-code table as csharp-process-cancellation-and-exit.
  - Its parse-failure exception must be the one csharp-json-forward-compatible-binding throws.

#### csharp-api-surface-shape: What shape should the public types of a CLI-wrapping SDK take?

```text
Commission: decide the public type shapes of a .NET SDK that wraps a CLI (ocx: 70 leaf commands, JSON reports).
Investigate: entry type — pulumi__pulumi-dotnet's layering (abstract PulumiCommand seam, sealed LocalWorkspace with
static CreateAsync) vs a single client class vs Tyrrrz__CliWrap's immutable builder vs testcontainers' builder;
options as classes with init/required vs records (a record's compiler-generated ToString prints every member — a secret
leak; record equality on collection members is reference equality, per Skeet); positional records in a public API and
their versioning cost (adding a parameter breaks the ctor and Deconstruct); sealing by default (corpus: 44% of public
classes sealed; CA1852 covers internal types only); open sets as extensible readonly structs over a string
(openai__openai-dotnet, Azure ExpandableStringEnum pattern) vs C# enums; [Experimental("OCX0001")] for contract parts
that are not frozen (ocx reports v1 and v2 both live); nullable annotations as part of the contract; required/init on
ns2.0 (CS0656/CS0518 without polyfills); DI-free core with any IServiceCollection extension in a separate package.
Exemplars: pulumi__pulumi-dotnet (Automation API), openai__openai-dotnet, anthropics__anthropic-sdk-csharp,
Azure__azure-sdk-for-net (sdk/core/Azure.Core), octokit__octokit.net, stripe__stripe-dotnet,
testcontainers__testcontainers-dotnet, Tyrrrz__CliWrap.
Fixtures (red then green twin): an options record with a Password property printed by ToString/string interpolation
(leaks) vs a class or a record with a PrintMembers override (redacted); a closed enum bound to the JSON value
"future_kind" (JsonException) vs an extensible struct (round-trips); v1→v2 adding a positional-record parameter, caught
by package validation against a 1.0.0 baseline (red) vs adding an init property (green); an [Experimental] member used
without suppression produces its diagnostic.
Decide: the entry-type pattern, the type kind for options and results, the enum policy, the sealing default, how
unfrozen contract parts are marked — each with a check (analyzer ID, package validation, or reading heuristic).
Method: fixtures under /home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-api-surface-shape/, built with
/home/mherwig/.cache/research-lang/dotnet-tools/run.sh from inside that tree (global.json pins SDK 10.0.401). Cite
exemplars as owner__repo@sha12:path:line from /home/mherwig/.cache/research-lang/exemplars/csharp/.
```

#### csharp-api-evolution-gates: How is public API change gated so a minor or patch release never breaks consumers?

```text
Commission: decide which build-time gates guard a .NET library's public API across releases.
Investigate: Microsoft.CodeAnalysis.PublicApiAnalyzers (RS0016 undeclared public API, RS0017 removed API, RS0026/RS0027
optional-parameter overload rules, RS0036/RS0037 nullable annotations; PublicAPI.Shipped.txt/Unshipped.txt, per-TFM
files under multi-targeting) — 9 corpus repos; EnablePackageValidation with PackageValidationBaselineVersion (ApiCompat
CP0002 member removed, CP0005, CP0008 and friends) — 6 repos; the .NET library change rules (adding an optional
parameter is binary-breaking, adding a CancellationToken overload, default interface members, sealing an unsealed type);
snapshot alternatives (PublicApiGenerator/Verify listings; Azure api/*.cs listings per TFM); why adamralph__simple-exec
suppresses RS0026; [Obsolete] with DiagnosticId and UrlFormat for deprecations; how SemVer ties to each gate; the
release-time step that moves Unshipped into Shipped (this feeds the dotnet-release skill).
Exemplars: App-vNext__Polly, xunit__xunit, adamralph__simple-exec, Azure__azure-sdk-for-net, openai__openai-dotnet,
microsoft__testfx, npgsql__npgsql, Humanizr__Humanizer.
Fixtures (red then green twin): pack v1.0.0 of a small library; v2 removes a public overload → dotnet pack with
EnablePackageValidation and baseline 1.0.0 fails CP0002 (red) vs a purely additive v2 (green); a new public method not
listed in PublicAPI.Unshipped.txt fails RS0016 (red) vs listed (green); adding an optional parameter to an existing
public method — record which gate catches the binary break and which misses it; the same under net8.0;net10.0
multi-targeting to measure per-TFM file churn.
Decide: which gate or gates are mandatory (analyzer, package validation, or both), the file layout, the SemVer policy
they enforce, and the exact release-time steps.
Method: fixtures under /home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-api-evolution-gates/, built with
/home/mherwig/.cache/research-lang/dotnet-tools/run.sh from inside that tree (global.json pins SDK 10.0.401); use a
local folder feed for the baseline package. Cite exemplars as owner__repo@sha12:path:line from
/home/mherwig/.cache/research-lang/exemplars/csharp/.
```

#### csharp-api-exceptions-from-exit-codes: How should a C# SDK model ocx failures as exceptions without leaking framework exceptions?

```text
Commission: decide the exception model of the ocx C# SDK and the general exception-design rules for .NET libraries.
Investigate: a hierarchy rooted at one OcxException — the Python SDK has 26 classes, one per exit category, each with a
hint; is that right-sized for C#, or a few types plus a category property; category comes from the ocx exit code,
not error.kind (81 → permission_denied), and the table differs between ocx 0.6.5 (18 codes) and main (13 codes; 82
reused); a dedicated OcxParseException wrapping JsonException for version skew (Python smell S3: 36 builtin ValueErrors
leak past OcxError); OcxTimeoutException vs OperationCanceledException; a passthrough child's non-zero exit as a result,
not an exception (smell S2); the ocx error document (on which stream, which fields) as exception properties; secrets
never in Message. General rules: sealed leaf types (39% sealed in the corpus), CA1032 standard constructors and why
simple-exec suppresses it, no [Serializable]/ISerializable on net8+ (SYSLIB0051), CA1031 catch-all only at boundaries,
CA1064 public exceptions, CA2201 reserved types, `when` filters, typed properties over Exception.Data.
Exemplars: Azure__azure-sdk-for-net (RequestFailedException), octokit__octokit.net (ApiException tree),
stripe__stripe-dotnet, pulumi__pulumi-dotnet (stderr-regex error classification — evaluate as an anti-pattern),
Tyrrrz__CliWrap (CommandExecutionException), npgsql__npgsql (PostgresException), App-vNext__Polly.
Fixtures (red then green twin): a dummy ocx emitting malformed JSON → JsonException escapes the SDK (red) vs
OcxParseException with InnerException (green); an exception type with the legacy serialization ctor on net8 raising
SYSLIB0051 (red) vs none (green); catch (Exception) in a non-boundary method under AnalysisLevel 10.0-all → CA1031;
a dummy exiting 82 mapped with the 0.6.5 table vs the main table → different categories (shows the table must be
versioned).
Decide: the hierarchy (names and count), where the exit-code table lives (generated from ocx_exit vs hand-written),
the exception-vs-result boundary, and the analyzer set that guards it.
Method: fixtures under /home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-api-exceptions-from-exit-codes/,
built with /home/mherwig/.cache/research-lang/dotnet-tools/run.sh from inside that tree (global.json pins SDK 10.0.401).
ocx exit codes: /home/mherwig/dev/ocx/crates/ocx_exit. Cite exemplars as owner__repo@sha12:path:line from
/home/mherwig/.cache/research-lang/exemplars/csharp/.
```

### csharp-json: Binding ocx JSON with System.Text.Json

**Consolidation brief.** Merge into `csharp-quality/json.md`. Deliver four things:
1. One recommended JsonSerializerContext setup.
2. One forward-compatibility policy table covering the unknown member, unknown enum value, unknown union tag, absent vs null, and duplicate key.
3. The design of the schema-diff test that keeps the C# models honest against ocx's reports.v1.json.
4. A one-line verdict on Newtonsoft.Json.

Mark every option that differs between net8 and net10 System.Text.Json; Strict and AllowDuplicateProperties are net10 only. Say how a `net8.0;net10.0` build handles those options without `#if` sprawl. The parse exception named here must be the one in csharp-api-exceptions-from-exit-codes.

#### csharp-json-source-generation-and-trim: Must the SDK use System.Text.Json source generation, and what does trim/AOT compatibility demand?

```text
Commission: decide the serialization infrastructure for a .NET library whose consumers may publish trimmed or Native AOT.
Investigate: JsonSerializerContext with [JsonSerializable], JsonSourceGenerationOptions, GenerationMode (Metadata vs
Serialization fast path), combining contexts (JsonTypeInfoResolver.Combine), [JsonPolymorphic]/[JsonDerivedType] with a
`type` discriminator under source gen; reflection is disabled under PublishTrimmed/PublishAot
(JsonSerializerIsReflectionEnabledByDefault=false → InvalidOperationException at runtime); IsAotCompatible / IsTrimmable
on the library (turns on IL2026/IL3050/IL2xxx at library build time; 11 corpus repos set IsAotCompatible, 0 set
EnableAotAnalyzer separately); whether a library that only spawns a process and parses JSON should claim AOT
compatibility; System.Text.Json on netstandard2.0 (package version, source gen behaviour, LangVersion); why 0/5 vendor
SDKs (openai, anthropic, stripe, octokit, Azure.Core) source-generate while 5 corpus repos do; Newtonsoft.Json as the
agent's reflex (language-shape audit §7) — reject or justify.
Exemplars: openai__openai-dotnet, anthropics__anthropic-sdk-csharp, stripe__stripe-dotnet, dotnet__aspire,
xunit__xunit (.aot projects across 7 RIDs), testcontainers__testcontainers-dotnet, dotnet__command-line-api,
PowerShell__PowerShell.
Fixtures (red then green twin): a console app consuming the library, published with PublishAot=true: reflection-based
JsonSerializer.Deserialize<T> → IL2026/IL3050 at publish and a runtime failure (red) vs a source-generated context
(green, clean publish and correct output); the same library with IsAotCompatible=true surfacing the warnings at
library build time; a polymorphic report type round-tripping under source gen.
Decide: whether source generation is mandatory, whether IsAotCompatible is on, the context layout (one per assembly vs
per area), and the checks (IL2026/IL3050 as errors; a grep for JsonSerializer calls without a JsonTypeInfo/context).
Method: fixtures under /home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-json-source-generation-and-trim/,
built with /home/mherwig/.cache/research-lang/dotnet-tools/run.sh from inside that tree (global.json pins SDK 10.0.401;
Native AOT publish needs clang/zlib on the host — record if unavailable and use PublishTrimmed instead). Cite exemplars
as owner__repo@sha12:path:line from /home/mherwig/.cache/research-lang/exemplars/csharp/.
```

#### csharp-json-forward-compatible-binding: How must models bind so a newer ocx never breaks an older SDK?

```text
Commission: decide the forward-compatibility policy for binding ocx JSON reports in C#, and design the schema-diff test.
Investigate: System.Text.Json defaults (unknown members skipped; JsonUnmappedMemberHandling.Disallow; case sensitivity;
number handling); JsonStringEnumConverter throws on an unknown value → the open-enum strategy (string-backed readonly
struct, or enum + Unknown via a custom converter); absent vs explicit null (ocx schemas use an x-ocx absent marker;
`required` members, [JsonRequired], nullable value semantics; null is meaningful only inside opaque publisher
metadata); JsonSerializerOptions.Strict and AllowDuplicateProperties (net10 only) — where strictness is right for a
consumer of a growing contract and where it is wrong; unknown discriminator handling under [JsonPolymorphic]
(UnknownDerivedTypeHandling); schema_version handling and the version handshake (`ocx --format json version` → the
`contract` key; absent on 0.6.5); Meziantou MA0222-MA0225 (JSON strictness, off by default); the Python SDK's
schema-derived presence-rule table and its phantom/unsafe test against reports.v1.json — the highest-value artifact
to port (python-sdk digest).
Exemplars: openai__openai-dotnet (extensible enums), anthropics__anthropic-sdk-csharp (ApiEnum),
stripe__stripe-dotnet, octokit__octokit.net (StringEnum<T>), Azure__azure-sdk-for-net, pulumi__pulumi-dotnet. ocx
schemas: /home/mherwig/dev/ocx/crates/ocx_schema (reports v1 and v2 both live); Python reference:
/home/mherwig/dev/ocx-sdk-python/src/ocx_sdk/_results.py and its tests.
Fixtures (red then green twin): five payloads — an added field, an unseen enum value, an unknown union tag, a missing
required field, an explicit null where absent is expected — each bound by a naive model (exception or silently wrong
value) and by the policy model (correct); the same five under Strict on net10; a test that diffs the C# model's
properties against reports.v1.json and fails when the schema gains a required field the model lacks.
Decide: the per-case policy table, the open-enum shape, the schema-diff test design (generated vs hand-maintained
models), and what the handshake refuses before spawning a command.
Method: fixtures under /home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-json-forward-compatible-binding/,
built with /home/mherwig/.cache/research-lang/dotnet-tools/run.sh from inside that tree (global.json pins SDK 10.0.401).
Cite exemplars as owner__repo@sha12:path:line from /home/mherwig/.cache/research-lang/exemplars/csharp/.
```

### csharp-build: Target reach, the analyzer gate, and SDK/restore pinning

**Consolidation brief.** This group produces the bulk of the `dotnet-build` rule (index plus depth), and the analyzer depth that `csharp-quality` cites.
- **Order.** `csharp-build-tfm-reach` is the pivotal decision of the program. It consolidates first, and the other two rebase their TargetFrameworks on its verdict.
- **TFM verdict.** State it conditioned on the owner's consumer decision ("if .NET Framework/Unity hosts are out of scope, then …"); never guess the owner's answer.
- **Analyzer posture.** Present it as one Directory.Build.props + .globalconfig pair that a rule can diff against.
  - Every property is pinned; nothing floats as `latest`.
  - Every suppression carries its reason.
- **Pinning baseline.** One global.json plus Directory.Packages.props plus nuget.config triple, with the command that verifies each file.

#### csharp-build-tfm-reach: netstandard2.0 or net8.0+, and which floor, for an ocx SDK that must run on every platform?

```text
Commission: decide the ocx SDK's TargetFrameworks (and the general library rule); owner needs Win/Linux/macOS × x64/arm64.
(1) Reach. Modern .NET runs on all 8 ocx dist targets (win/osx/linux/linux-musl × x64/arm64); confirm per
target from the .NET 8 and 10 supported-OS matrices. netstandard2.0 adds runtimes, not OSes: .NET Framework
4.6.1-4.8.1, Mono, Unity (default profile netstandard2.1 per the practitioner scout), Xamarin. (2) Cost on ns2.0, each
confirmed by a compile probe: ArgumentList, Kill(bool), WaitForExitAsync, StandardInputEncoding,
OperatingSystem.IsWindows, System.Formats.Tar, File.SetUnixFileMode, TimeProvider (in-box vs
Microsoft.Bcl.TimeProvider), default LangVersion 7.3 and the polyfill errors CS0518/CS0656/CS0234, no trim analysis,
un-annotated BCL nullability. (3) Corpus: 26/34 libraries ship ns; 9/13 wrappers and SDKs ship ns2.0 while
SimpleExec, Pulumi, Cake and Aspire do not; Azure guidelines mandate ns2.0; Microsoft's cross-platform library guidance
says start at net8+ and only consider ns2.0; Skeet: never ship a TFM you cannot test (anthropic tests net472).
(4) The split option: models/JSON in ns2.0, process engine net8+. (5) The floor: .NET 8 and 9 EOS 2026-11-10, .NET 10
to 2028-11-14, STS now 24 months; net8.0;net10.0 vs net10.0 only; LangVersion 14 on net8 (compiles `field`,
unsupported by Microsoft). (6) A 32-bit .NET Framework host on x64 Windows: can it spawn x64 ocx.exe under WOW64, and
does binary selection key on OSArchitecture rather than ProcessArchitecture (ocx has no win-x86 build)?
Exemplars: Tyrrrz__CliWrap, madelson__MedallionShell, adamralph__simple-exec, pulumi__pulumi-dotnet,
testcontainers__testcontainers-dotnet, anthropics__anthropic-sdk-csharp, Azure__azure-sdk-for-net, App-vNext__Polly.
Fixtures (red then green twin): one engine project multi-targeted netstandard2.0;net8.0;net10.0 — record every compile
error per TFM, then the polyfill set (PolySharp or Polyfill) that clears the language errors and the API errors that
remain; a net472 console on the Windows host, built x86 and AnyCPU, consuming the ns2.0 build and spawning an x64 child;
a net8.0 app referencing a net10.0-only package (NU1202, red) vs a net8.0;net10.0 package (green).
Decide: the cost/benefit table, the TargetFrameworks string for each owner answer, when ns2.0 is worth carrying (a
named consumer class with its own test leg), and the floor-bump procedure for the dotnet-upgrade skill.
Method: fixtures under /home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-build-tfm-reach/ via
/home/mherwig/.cache/research-lang/dotnet-tools/run.sh (SDK 10.0.401 pinned, 8.0.425 installed); Windows claims on the host
(SDK 10.0.102) under C:\Users\ecom\csharp-wintest\; cite owner__repo@sha12:path:line from /home/mherwig/.cache/research-lang/exemplars/csharp/.
```

#### csharp-build-analyzer-gate: What analyzer and warning configuration makes the build a real gate without breaking on SDK upgrades?

```text
Commission: decide the pinned analyzer and warning posture for a .NET library, expressed as a Directory.Build.props +
.globalconfig a rule can diff against.
Investigate: AnalysisLevel/AnalysisMode measured on the codified probe: Default 0 warnings, Recommended 17, All 24; SDK 10
globalconfig sizes Minimum 92 / Recommended 145 / All 280; CA2007/CA1031/CA2000/CA1849/CA1062/CA1063 fire only at All;
precedence between .globalconfig, .editorconfig, AnalysisMode, <WarningsAsErrors>/<NoWarn> (bulk editorconfig
severities measured as ignored under AnalysisMode — confirm and explain); a floating AnalysisLevel=latest with
TreatWarningsAsErrors breaking when SDK 11 RC1 adds CA1517/CA1876/CA1877/CA2026/CA2027/CA2028; TWAE always vs
CI/Release only (23 repos); Nullable enable + WarningsAsErrors=nullable; EnforceCodeStyleInBuild (11 repos) with
dotnet format --verify-no-changes (4); GenerateDocumentationFile with CS1591 (suppressed in 19 repos, an error in testfx);
third-party packs and what each adds for this SDK: Meziantou.Analyzer, Microsoft.VisualStudio.Threading.Analyzers,
Microsoft.CodeAnalysis.BannedApiAnalyzers (RS0030 caught DateTime.Now and Encoding.Default in the probe), Roslynator,
StyleCop.Analyzers; the adamralph__simple-exec recipe (AnalysisMode All + `.globalconfig dotnet_analyzer_diagnostic.severity
= warning` + TWAE in Release) and its suppressions (CA2025, CA1849, VSTHRD103, CA1031, CA1032, RS0026) with reasons.
Exemplars: adamralph__simple-exec, xunit__xunit, App-vNext__Polly, microsoft__testfx, microsoft__vs-threading,
meziantou__Meziantou.Analyzer, dotnet__roslynator, DotNetAnalyzers__StyleCopAnalyzers, Humanizr__Humanizer.
Fixtures (red then green twin): one source file with planted defects (unforwarded token, catch-all, DateTime.Now,
.Result, undisposed IDisposable, no ConfigureAwait, culture-sensitive ToString, undocumented public member, nullable
dereference, string-built process arguments) built under each posture — a table of which fire; then the chosen posture
under SDK 11 RC1 with AnalysisLevel=latest (new errors, red) vs pinned AnalysisLevel=10.0-all (unchanged, green).
Decide: the exact posture (properties + .globalconfig), the third-party analyzer set, the suppression list with
reasons, and the CI format command.
Method: fixtures under /home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-build-analyzer-gate/, built with
/home/mherwig/.cache/research-lang/dotnet-tools/run.sh from inside that tree (global.json pins SDK 10.0.401; the SDK 11
probe needs its own pinned global.json). Cite exemplars as owner__repo@sha12:path:line from
/home/mherwig/.cache/research-lang/exemplars/csharp/.
```

#### csharp-build-sdk-and-restore-pinning: How are the SDK version, package versions and restore pinned so CI and a laptop build the same thing?

```text
Commission: decide the reproducibility baseline (SDK selection, package versions, restore, audit) for a .NET library repo.
Investigate: global.json (28 corpus repos): rollForward latestFeature (10) vs latestPatch vs latestMinor (5);
allowPrerelease (true in 7 repos; StackExchange.Redis guards with false); without global.json the newest installed SDK,
including 11 RC1, is selected (frame correction 3); `dnx` bypassing global.json; the MTP `test` runner section in
global.json. Central Package Management (22 repos) with CentralPackageTransitivePinningEnabled; packages.lock.json (5
repos) with RestoreLockedMode in CI (3) and lock churn under multi-targeting — is a lock file right for a library;
NuGetAudit: NuGetAuditMode `all` is the default for net10, NU1901-NU1904 become errors under TWAE, only 2 repos
configure audit; package source mapping in nuget.config; NU1510 package pruning (.NET 10); .slnx as the SDK 10 default
(24 repos); Terminal Logger and the `--interactive` default in CI.
Exemplars: adamralph__simple-exec, App-vNext__Polly, xunit__xunit, StackExchange__StackExchange.Redis, dotnet__aspire,
GitTools__GitVersion, npgsql__npgsql, coverlet-coverage__coverlet.
Fixtures (red then green twin): a repo with no global.json built from a directory outside the pinned fixtures tree
selects 11 RC1 (red) vs a pinned global.json (green); a lock file with RestoreLockedMode after a Directory.Packages.props
version drift fails restore (NU1004, the gate working) vs no lock file floating silently (red); a transitive vulnerable
package with NuGetAuditMode=direct (silent, red) vs all (NU1903/NU1904, green); package source mapping blocking a
same-named package from a second local feed (dependency confusion) vs an unmapped config resolving it.
Decide: the global.json shape, CPM + transitive pinning, lock-file policy for a library, audit mode and its TWAE
interaction, source mapping — each with the command that verifies it.
Method: fixtures under /home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-build-sdk-and-restore-pinning/,
built with /home/mherwig/.cache/research-lang/dotnet-tools/run.sh (global.json in that tree pins SDK 10.0.401; the
unpinned probe must run from a directory outside it); use local folder feeds, never publish. Cite exemplars as
owner__repo@sha12:path:line from /home/mherwig/.cache/research-lang/exemplars/csharp/.
```

### csharp-packaging: Shipping the SDK, and getting the ocx binary to it

**Consolidation brief.** Two outputs:
- `dotnet-build`'s packaging depth: the MSBuild properties.
- The `dotnet-release` skill procedure: steps, each naming its command and the verification it runs (for example `dotnet nuget verify`, `dotnet validate package local`, or listing the nupkg for `runtimes/<rid>/native`).

The binary-acquisition subtopic also yields code rules for `csharp-quality`: a security and platform row on digest verification, safe extraction and RID selection.

The owner's delivery-model decision is an input:
- if it has landed by consolidation, write only the chosen model;
- otherwise write all three compactly, with the trade-off table.

#### csharp-packaging-nuget-release: What must a NuGet library package carry, and how is it published?

```text
Commission: decide the package contents, build provenance and publishing route for a .NET library on nuget.org.
Investigate: pack metadata (PackageId, Authors, PackageLicenseExpression, PackageReadmeFile, PackageIcon, RepositoryUrl,
PackageProjectUrl, Description, PackageTags) and what nuget.org flags when missing; SourceLink (is a
Microsoft.SourceLink.* package still needed with SDK 8+/10), ContinuousIntegrationBuild, Deterministic,
EmbedUntrackedSources, `/_/` path mapping, IncludeSymbols + SymbolPackageFormat snupkg; version source (MinVer,
GitVersion, Nerdbank.GitVersioning, hand-set) and AssemblyVersion policy; strong naming on modern .NET (22 corpus repos
ship an .snk — is it still worth it for a new library); NuGet Trusted Publishing via OIDC (NuGet/login action, 11
repos) vs long-lived API keys; author signing (2 repos: App-vNext__Polly, openai__openai-dotnet via dotnet/sign + Azure
Key Vault; the SHA-1 signing error in the shifts scout) and its cost; package validation at pack (tie-in with
csharp-api-evolution-gates); prefix reservation on nuget.org.
Exemplars: App-vNext__Polly, openai__openai-dotnet, dotnet__sourcelink, adamralph__simple-exec, xunit__xunit,
Tyrrrz__CliWrap, GitTools__GitVersion, serilog__serilog, nodatime__nodatime.
Fixtures (red then green twin): pack without ContinuousIntegrationBuild → PDB with absolute source paths (red) vs `/_/`
mapped (green), verified with `dotnet validate package local` or sourcelink test tooling; two packs of the same commit
compared byte-for-byte (determinism holds or not, and what breaks it); a nupkg missing readme/license metadata vs
complete; a symbols package that resolves sources from the repository URL.
Decide: the required MSBuild property set, the version source, the signing stance (author signing and strong naming,
each yes/no with a reason), and the dotnet-release step list with a verification per step.
Method: fixtures under /home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-packaging-nuget-release/, built
with /home/mherwig/.cache/research-lang/dotnet-tools/run.sh from inside that tree (global.json pins SDK 10.0.401); pack
to a local folder only, never push. Cite exemplars as owner__repo@sha12:path:line from
/home/mherwig/.cache/research-lang/exemplars/csharp/.
```

#### csharp-packaging-ocx-binary-acquisition: How does a C# SDK obtain, select and verify the right ocx binary for the host?

```text
Commission: decide how the ocx C# SDK finds or delivers the ocx executable on all 8 ocx targets, and how it verifies it.
Investigate: delivery models — (a) locate only: explicit path → OCX_SDK_EXE → PATH → ocx's own stable symlink
$OCX_HOME/symlinks/ocx.sh/ocx/cli/current/content/bin/{ocx,ocx.exe}; (b) ship binaries in the package:
runtimes/<rid>/native in one nupkg (size × 8) or per-RID runtime packages under a meta package (dotnet__aspire DCP
pattern); (c) download at first use from the ocx dist manifest (setup.ocx.sh/dist.json) with sha256 verification, as the
Python SDK's _dist.py does — pulumi__pulumi-dotnet runs an install script with no digest (anti-pattern) and no C#
exemplar verifies a digest. RID selection: RuntimeInformation.OSArchitecture vs ProcessArchitecture vs RuntimeIdentifier;
musl detection for Alpine; the Python mapping (Linux → musl by default; Rosetta x64 → aarch64 via
sysctl.proc_translated); Windows on ARM running x64; a 32-bit host on 64-bit Windows (ocx has no win-x86).
Extraction and install: System.Formats.Tar TarFile.ExtractToDirectory traversal behaviour, ZipFile on Windows,
File.SetUnixFileMode for the exec bit, temp file + atomic rename, cache root ownership/permission checks, size caps
(1 MiB manifest / 256 MiB archive), fail closed on a non-canonical host; HttpClient lifetime and proxy settings.
Exemplars: dotnet__aspire, pulumi__pulumi-dotnet, Tyrrrz__CliWrap (Signaler to %TEMP%), nuke-build__nuke, cake-build__cake;
Python reference: /home/mherwig/dev/ocx-sdk-python/src/ocx_sdk/_bootstrap.py and _dist.py.
Fixtures (red then green twin): a tar containing `../evil` extracted with TarFile.ExtractToDirectory (record whether .NET
rejects it; red if not guarded); a downloaded archive with one flipped byte accepted without a digest check (red) vs
rejected by sha256 (green); RID selection as a pure function table-tested over (OS, OSArchitecture,
ProcessArchitecture, libc, translated) tuples; a nupkg with runtimes/linux-musl-x64/native/ocx resolving inside an
Alpine container (or record that container tooling is unavailable).
Decide: the recommended delivery model (subject to the owner's decision), the RID→triple table, the verification and
extraction rules, and which of them a grep or test can check.
Method: fixtures under /home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-packaging-ocx-binary-acquisition/,
built with /home/mherwig/.cache/research-lang/dotnet-tools/run.sh from inside that tree (global.json pins SDK 10.0.401);
use local files for downloads, no network writes. Cite exemplars as owner__repo@sha12:path:line from
/home/mherwig/.cache/research-lang/exemplars/csharp/.
```

### csharp-crossplatform: Portable code, and the proof it runs everywhere

**Consolidation brief.** Merge into `csharp-quality/platform-and-paths.md` and `csharp-quality/testing.md`.
- **The owner's hard requirement** (Windows, Linux and macOS on x64 and arm64) becomes a checkable rule: exact runner labels, TFM legs, and which legs block a merge.
- **The fake-CLI harness** is the SDK's central test seam. Specify it once. The csharp-process, csharp-json and csharp-api rows cite it as their verification instead of each inventing one.
- **How each row is checked.** Every row says whether it is caught statically (CA1416, CA1305/CA1307/CA1309/CA1310, BannedApiAnalyzers) or only by running the matrix.
- **The Python SDK's untested Windows and arm64 paths** (S5/S6) are cited as the failure this group exists to prevent.

#### csharp-crossplatform-paths-culture-guards: Which path, culture and platform-guard rules keep one codebase correct on Windows, Linux and macOS?

```text
Commission: decide the portability rules for .NET library code that touches paths, strings, time and OS-specific APIs.
Investigate: Path.Combine discards every earlier segment when a later one is rooted (failure scout) vs Path.Join; case
sensitivity (Linux sensitive, macOS and Windows insensitive by default) and StringComparer.Ordinal vs OrdinalIgnoreCase
for paths; Windows reserved names (CON, NUL, COM1, AUX), trailing dots and spaces, MAX_PATH and long-path support;
NTFS junctions (ocx uses them for directory links) vs symlinks, FileSystemInfo.LinkTarget and ResolveLinkTarget;
Environment.GetFolderPath vs HOME/USERPROFILE (ocx: OCX_HOME defaults to ~/.ocx, USERPROFILE on Windows; Python smell
S7); Environment.NewLine vs "\n" when parsing child output; culture: CA1305, CA1307, CA1309, CA1310, CA1311,
"InvariantCulture is not invariant" (practitioner scout), InvariantGlobalization in tests, ordinal comparison for keys
and paths; platform guards: OperatingSystem.IsWindows()/IsMacOS()/IsLinux(), CA1416 with [SupportedOSPlatform] and
[UnsupportedOSPlatform], RuntimeInformation; TimeProvider vs DateTime.Now/UtcNow (an RS0030 ban).
Exemplars: PowerShell__PowerShell, nuke-build__nuke (AbsolutePath), cake-build__cake (FilePath/DirectoryPath),
dotnet__aspire, GitTools__GitVersion, nodatime__nodatime, npgsql__npgsql, Humanizr__Humanizer.
Fixtures (red then green twin): Path.Combine(root, "/abs") escaping root (red) vs Path.Join or a validated combine (green);
1.5.ToString() under tr-TR or de-DE written into an ocx argv as "1,5" (red) vs CultureInfo.InvariantCulture (green), with
CA1305 firing on the red; a Windows-only API (e.g. a registry or Job Object call) without a guard → CA1416 (red) vs
guarded (green); a case-only path collision test passing on Windows and failing on Linux; parsing "\r\n" child output.
Run the Windows and macOS-sensitive cases on the Windows host; record macOS as unverified locally.
Decide: the rule rows, each with its analyzer ID and severity or its grep, and the portability BannedSymbols.txt entries.
Method: fixtures under /home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-crossplatform-paths-culture-guards/,
built with /home/mherwig/.cache/research-lang/dotnet-tools/run.sh from inside that tree (global.json pins SDK 10.0.401);
Windows claims re-run on the Windows host staged under C:\Users\ecom\csharp-wintest\ via cmd.exe. Cite exemplars as
owner__repo@sha12:path:line from /home/mherwig/.cache/research-lang/exemplars/csharp/.
```

#### csharp-crossplatform-fake-cli-harness: How is the SDK tested without the real ocx, and against which real ocx in a contract tier?

```text
Commission: design the test seam and test tiers for a .NET SDK that wraps a CLI, and pick the framework and runner.
Investigate: a dummy console executable as a fixture (Tyrrrz__CliWrap's CliWrap.Tests.Dummy) controlled by args/env:
exit code, stdout payload from a file, stderr volume, spawn a grandchild, sleep, emit a given encoding, ignore SIGTERM;
how to build and locate it for the host RID in every CI leg (ProjectReference with ReferenceOutputAssembly=false and
copying the apphost, vs a .NET 10 file-based app via `dotnet run app.cs`, vs `dotnet exec dummy.dll` to avoid apphosts);
the Python SDK's three tiers (unit tests over a runner seam, fake-binary tests, a contract tier against a pinned real
ocx) and their C# equivalents; an abstract runner seam (pulumi PulumiCommand) vs an interface; TimeProvider with
FakeTimeProvider for retry/backoff; framework and runner: xUnit v3, MSTest or NUnit on Microsoft.Testing.Platform (12
corpus repos) vs VSTest, the global.json `test` runner section, exit code 8 on zero tests, the VSTest→MTP BOM-on-stdin
trap; a contract tier pinned to an ocx version (installed via ocx itself) that is skipped with a stated reason when
absent, and asserts the presence-rule table and exit codes.
Exemplars: Tyrrrz__CliWrap, madelson__MedallionShell, adamralph__simple-exec, testcontainers__testcontainers-dotnet,
pulumi__pulumi-dotnet, xunit__xunit, microsoft__testfx, coverlet-coverage__coverlet. Python reference:
/home/mherwig/dev/ocx-sdk-python/tests.
Fixtures (red then green twin): the dummy driving the stderr flood (E1), orphaned grandchild (E3) and held pipe (E7)
scenarios as xUnit v3 tests — red against a naive engine (sequential reads, Kill(false), unbounded wait), green against
the reference engine; an MTP test project that discovers zero tests exiting 8 (the gate catching a broken filter) vs a
correct filter; a retry test using FakeTimeProvider that completes without real sleeping.
Decide: the harness shape and how it is located per RID, the framework + runner, the tier layout and naming, and what
the contract tier asserts.
Method: fixtures under /home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-crossplatform-fake-cli-harness/,
built with /home/mherwig/.cache/research-lang/dotnet-tools/run.sh from inside that tree (global.json pins SDK 10.0.401);
re-run the harness on the Windows host staged under C:\Users\ecom\csharp-wintest\ via cmd.exe. Cite exemplars as
owner__repo@sha12:path:line from /home/mherwig/.cache/research-lang/exemplars/csharp/.
```

#### csharp-crossplatform-ci-matrix: What CI matrix proves "all platforms" for a .NET library, and how is each leg kept cheap and honest?

```text
Commission: decide the CI matrix that turns "Windows, Linux, macOS × x64, arm64" into a verified property of a .NET
library, and the rule a reviewer checks a workflow against.
Investigate: GitHub-hosted runner labels current in October 2026 — ubuntu-24.04, ubuntu-24.04-arm, windows-2025 /
windows-latest, windows-11-arm, macos-15 (arm64), and whether an Intel macOS label still exists (macos-13 retirement);
a linux-musl leg via an Alpine container; corpus: macOS in 11/35 repos, explicit arm64 in 3/35 (GitVersion,
simple-exec, BenchmarkDotNet); per-TFM legs (dotnet test -f net8.0 and -f net10.0 from one SDK 10 install — needs the
8.0 runtime: actions/setup-dotnet with several versions and global-json-file); a net472 leg on Windows only if
csharp-build-tfm-reach keeps netstandard2.0; NuGet cache keyed on lock files or Directory.Packages.props; fail-fast
off; which legs block merge vs run nightly; cost per leg (arm64 and macOS minutes). The anti-pattern to cite: the Python
SDK's contract tier runs on ubuntu only, so its Windows kill path and arm64 behaviour are untested (smells S5/S6).
Exemplars: adamralph__simple-exec, GitTools__GitVersion, dotnet__BenchmarkDotNet, xunit__xunit, App-vNext__Polly,
Tyrrrz__CliWrap, testcontainers__testcontainers-dotnet, npgsql__npgsql (read their .github/workflows).
Fixtures (red then green twin): a minimal library + test repo whose workflow is linted with actionlint; a test that
fails only on Windows (path separator or culture) and one that fails only on musl or arm64 (RID-dependent selection),
showing a linux-x64-only matrix passing them (red) vs the full matrix catching them (green) — run the Windows case on
the Windows host and the musl case in an Alpine container locally; record arm64 and macOS as unverified locally.
Decide: the exact matrix (runner labels × TFMs × musl), which legs are required for merge, the caching keys, and the
rule text plus the grep or actionlint check a reviewer runs against a workflow file.
Method: fixtures under /home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-crossplatform-ci-matrix/, built
with /home/mherwig/.cache/research-lang/dotnet-tools/run.sh from inside that tree (global.json pins SDK 10.0.401);
Windows claims re-run on the Windows host staged under C:\Users\ecom\csharp-wintest\ via cmd.exe. Do not push or
dispatch workflows. Cite exemplars as owner__repo@sha12:path:line from /home/mherwig/.cache/research-lang/exemplars/csharp/.
```

## Deferred

This is the wave-2 backlog, grouped. Rows keep their IDs from the map.

- **Language and idioms (csharp-quality `language.md`):**
  - LG-01 nullable posture and the `!` policy
  - LG-02 C# 14 features vs TFM
  - LG-03 fencing C# 15 / .NET 11
  - LG-07 generated-SDK mimicry
  - LG-08 required/init on ns2.0
  - API-13 nullable as the API contract
  - API-15 guard clauses by TFM
  - LG-04/05/06 primary constructors, collection and pattern idioms, Span (P2)
- **Async remainder:**
  - AS-09 client thread-safety
  - AS-05 IAsyncEnumerable streaming
  - AS-10 channels and starvation (P2)
- **Observability:**
  - API-11 logging dependency (ILogger abstractions vs ActivitySource vs none)
  - OB-01 `--log-level` forwarding and stderr log surfacing
  - OB-02 ActivitySource/Meter
- **Security remainder:**
  - SC-01 deserialization safety
  - SC-03 runtime-dependency minimalism and supply chain
  - PK-12 binary signature/attestation verification beyond sha256
- **Contract and code generation:**
  - CT-01 supported-ocx window model
  - CT-02 sdkgen C# backend
  - API-17 command-surface layout (70 leaves)
  - These are gated on the owner's contract-baseline decision and an ocx release.
- **Process remainder:**
  - PR-13 adopting .NET 11 Process APIs after GA (Nov 2026)
  - PR-14 host-death orphan prevention (Job Objects, KillOnParentExit)
  - PR-15 the SIGTERM handler in host apps
  - PR-17 progress streaming
- **API remainder:**
  - API-12 DI add-on package
  - API-16 obsoletion conventions
  - JS-09 unions in STJ (after C# 15 GA)
  - JS-10 wire formats for dates and durations
- **Build remainder:**
  - BD-13 Directory.Build layering
  - BD-14 slnx
  - BD-15 file-based apps
  - BD-16 NU1510 pruning
  - BD-17 Terminal Logger and interactive defaults
  - BD-18 dnx
  - BD-20 build-server hangs
  - Most of these feed `dotnet-diagnose`.
- **Testing remainder:**
  - XP-10 coverage tooling
  - XP-12 snapshot tests
  - XP-13 BenchmarkDotNet
- **Application publishing:** PK-10 (self-contained, single-file, Native AOT, container). This is for `dotnet-release`'s app path, not the SDK.
- **Skills:**
  - AG-01 `dotnet-upgrade`: consumes the tfm-reach and analyzer-gate verdicts; schedule before 2026-11-10.
  - AG-02 `dotnet-diagnose`: the error catalogue.
  - AG-04 agent-config prior art (shape only).
- **Dropped:** BD-19, the Bazel rules_dotnet depth file. 0/35 adoption.

## Intended artifact set

The frame's set stands with five revisions. Each line gives one reason.

- **Rule `csharp-quality`: kept, with the depth list changed.**
  - Wave-1 depth files: `processes.md`, `async.md`, `api-design.md`, `errors.md`, `json.md`, `platform-and-paths.md`, `testing.md`.
  - Wave-2 depth files: `language.md`, `security.md`, `observability.md`.
  - Process control and JSON binding are where the evidence concentrates the SDK risk. The frame's list had neither.
- **No separate `csharp-sdk-authoring` rule.** It would glob the same `**/*.cs` and so load on the same edits. One index pointing at depth files beats two rules with an identical trigger (globs-must-not-miss).
- **Rule `dotnet-build`: kept.**
  - Wave-1 depth files: `analyzers.md`, `sdk-and-restore.md`, `packaging.md`.
  - Its globs: `**/*.csproj`, `**/Directory.Build.props`, `**/Directory.Build.targets`, `**/Directory.Packages.props`, `**/global.json`, `**/nuget.config`, `**/*.slnx`, `**/*.sln`, `**/.globalconfig`, `**/packages.lock.json`.
  - The CI-matrix rule lives in `csharp-quality/testing.md`, because globbing every workflow file from a .NET rule would load it in non-.NET repos.
- **Skill `dotnet-release`: narrowed to library NuGet release.** This covers package validation, Trusted Publishing and verification. App publish modes (AOT, single-file, container) move to wave 2, because the adopting codebase is a library.
- **Skills `dotnet-upgrade` and `dotnet-diagnose`: kept, built in wave 2.** They consume the wave-1 verdicts. `dotnet-upgrade` is time-critical given the net8/9 EOS on 2026-11-10.
- **Bundle `dotnet-essentials`: kept, and gains `code-docs` and `code-docs-cleanup`.** This follows the JVM precedent: `code-docs` already globs `**/*.cs`.
- **`bazel-quality/csharp.md`: dropped.** There is no rules_dotnet adoption in the 35 exemplars or in the fleet.
- **Naming: kept** as `csharp-` for language rules and `dotnet-` for build rules and skills. This mirrors the JVM split (language rule plus build rule), and `dotnet` is the CLI the skills drive.

## Owner decisions

1. **Consumer reach.** Are .NET Framework 4.x and Unity hosts in scope for the ocx SDK?
   - **No:** net8+/net10 only.
   - **Yes:** a netstandard2.0 slice plus a net472 Windows CI leg.

   Modern .NET already covers every OS and CPU ocx ships for. csharp-build-tfm-reach measures the cost; who must be served is yours.
2. **Support floor.** Should `net8.0` stay in TargetFrameworks for the first release cycle, or should the SDK ship `net10.0`-only? .NET 8 and 9 reach EOS on 2026-11-10.
3. **ocx binary delivery.** Choose one:
   - locate only (PATH or an ocx-managed install);
   - bundle per-RID binaries in NuGet packages;
   - download from the dist manifest with sha256 verification at first use.
4. **Contract baseline.** The SDK's handshake, error document and exit-code table exist only on ocx main ([6daf9a164](https://github.com/ocx-sh/ocx/commit/6daf9a164)). Either cut an ocx release carrying them before SDK 0.1, or have the SDK target 0.6.5 with a degraded, unversioned mode.
5. **Publishing identity.** This needs:
   - a NuGet package ID and root namespace (e.g. `Ocx.Sdk`);
   - nuget.org organisation and ID-prefix reservation;
   - a Trusted Publishing policy;
   - a yes/no on an author-signing certificate, which is a recurring cost.

## Wave 3 selection (2026-10-11)

Phase 6 (iterate). 21 subtopics: 14 in six new groups that cover the general C# quality surface and the three skills' corpora, and 7 revision subtopics in four wave-2 groups. Every brief is answerable on this machine: Linux SDK 10.0.401 / 8.0.425 / 11 RC1 via `run.sh`, and the Windows host SDK 10.0.102 via cmd.exe. Nothing here needs macOS or arm64 hardware, .NET 11 GA or an owner decision.

### New groups

- **csharp-language → `csharp-quality/language.md` (CS-LANG)**
  - `csharp-language-nullability`: project-wide nullable posture, the `!` policy, nullability attributes, and guard clauses by TFM (LG-01, API-13, API-15).
  - `csharp-language-csharp14-and-fencing`: the C# 14 feature matrix on net8.0 (LangVersion 14) vs net10.0, the span-conversion break, and fencing C# 15 / preview (LG-02, LG-03).
  - `csharp-language-idioms-and-mimicry`: primary constructors, internal records, collection expressions, patterns, Span, and generated-SDK style copied by hand (LG-04..07).
- **csharp-observability → `csharp-quality/observability.md` (CS-OBS)**
  - `csharp-observability-logging-rules`: Microsoft.Extensions.Logging rules for any code: templates, `[LoggerMessage]`, CA2254/CA1848, levels, redaction.
  - `csharp-observability-library-instrumentation`: a library's dependency choice (none, ILogger, ActivitySource/Meter, EventSource), telemetry secrets, and ocx `--log-level` and stderr surfacing (API-11, OB-01, OB-02).
- **csharp-security → `csharp-quality/security.md` (CS-SEC)**
  - `csharp-security-unsafe-apis`: deserialization, XML, crypto, randomness, ReDoS and SecureString, each with an analyzer or a ban (SC-01).
  - `csharp-security-supply-chain`: runtime-dependency minimalism, PrivateAssets, trustedSigners, SBOM, and the review rule for adding packages (SC-03).
  - `csharp-security-binary-attestation`: verifying the ocx binary beyond sha256: what ocx publishes and what C# can verify in-box (PK-12).
- **csharp-testing → `csharp-quality/testing.md` (CS-TEST-09+)**
  - `csharp-testing-framework-and-coverage`: xUnit v3 / MSTest / NUnit on MTP for any library, assertion and mocking libraries, coverage tool and merge (XP-08 generalised, XP-10).
  - `csharp-testing-snapshots-and-property`: Verify snapshot rules and its CI guard, and property-based tests (XP-12).
- **csharp-performance → `csharp-quality/performance.md` (CS-PERF)**
  - `csharp-performance-allocation-and-analyzers`: the CA18xx gate set, allocation idioms agents get wrong, and the BenchmarkDotNet procedure (LG-06, XP-13).
- **csharp-procedures → skills `dotnet-diagnose`, `dotnet-upgrade`, `dotnet-release` (app path)**
  - `csharp-procedures-diagnose-catalogue`: NU/MSB/NETSDK/CS/IL/MTP codes and hangs, each reproduced with fix and verify command (AG-02, BD-13/16/17/18/20).
  - `csharp-procedures-upgrade-path`: net8 → net10 replayed on a real exemplar's pre-bump commit, plus the 10 → 11 hop shape (AG-01, BD-14).
  - `csharp-procedures-app-publish`: framework-dependent, self-contained, single-file, R2R, Native AOT, container and file-based app publish, plus SIGTERM in containers (PK-10, PR-15, BD-15).

### Revisions (one entry per wave-2 group; each subtopic writes a new file in the group dir)

- **csharp-process**
  - `csharp-process-real-ocx`: the reference engine against a main-built ocx (cargo; xwin for Windows), falling back to 0.6.5.
  - `csharp-process-windows-path-acl`: the Windows writable-PATH-directory ACL check, adopt or document.
- **csharp-async**
  - `csharp-async-single-flight-and-thread-safety`: Lazy<Task> fault caching, first-caller token, SemaphoreSlim, and the client thread-safety statement (AS-09).
  - `csharp-async-callbacks-and-streaming`: IProgress<T>, callbacks and IAsyncEnumerable: context, ordering, exceptions, back-pressure (AS-05, PR-17).
- **csharp-api**
  - `csharp-api-result-construction`: consumer-constructible results vs internal constructors vs ModelFactory, under source-generated STJ.
  - `csharp-api-behavioral-compat`: a table-driven failure-mode suite run against the previous release, and its SemVer weight.
- **csharp-json**
  - `csharp-json-error-document-and-generic-unions`: errors.json with integer open enums, report_then_fail partial documents, and a generic AOT-clean tagged-union converter.

No revision for csharp-build, csharp-packaging or csharp-crossplatform. Each of their open follow-ups needs .NET 11 GA, macOS/arm64 hardware, a nuget.org write or an owner answer.

### Dropped, and why

- **Hardware we lack (macOS, native arm64), recorded as a gap for a later CI dispatch:**
  - csharp-process-macos-arm64
  - csharp-crossplatform-native-arm-macos (Rosetta OSArchitecture, APFS case, setup-ocx on arm legs, minutes per leg)
  - the packaging macOS leg and the 20-row arm runner table
  - the JSON AOT smoke on osx-arm64 and linux-arm64 (the win-x64 AOT run is folded into app-publish)
  - OSArchitecture under Windows-on-Arm emulation
- **Needs .NET 11 GA (Nov 2026):**
  - PR-13 and the process re-measure (RunAsync, KillOnParentExit, ReadAll* caps)
  - JS-09 / csharp-api-csharp15-unions
  - the analyzer-gate 11.0-all re-diff (CA1878/CA2026) and the CA1034 extension-block servicing check
  - the MSBuild-server state-leak probe
  - the packaging ZipArchive CRC, DeterministicTimestamp and TarExtractOptions re-measures
  - the crossplatform analyzer re-check
  - C# 15 beyond RC1 fencing (that part is folded into csharp14-and-fencing)
- **Gated on an owner decision:**
  - PR-16 confirmation, cap policy, env deny- vs allow-list, held-pipe outcome, passthrough grace, BannedSymbols approval, PR-14 host-death containment
  - async-only v1, kill style, Meziantou adoption
  - ocx floor / contract baseline, CT-01, CT-02, API-17
  - diagnostic ID prefix, the sixth exception type (OcxAcquireException)
  - the ns2.0 branch: Polyfill kill and cancel on .NET Framework, LG-08 required/init on ns2.0, the IOpenEnum static-abstract conflict
  - delivery model, publishing identity
  - LangVersion 14 on net8, TWAE for humans, repo visibility, branch protection, contract-tier pin
- **Needs external writes or environments we cannot reproduce:**
  - Trusted Publishing first publish and the prefix-reservation channel (nuget.org writes)
  - the static-musl resolver vs glibc NSS on LDAP/sssd hosts
  - the cache-root `geteuid`+`stat` P/Invoke (the struct layout differs per OS and arch, so a Linux-only answer misleads)
- **Low value or covered elsewhere:**
  - the WinForms/WPF real-UI-context run (not load-bearing, per csharp-async)
  - Windows reserved names on Server 2025 (settled at the first CI run)
  - API-12 DI add-on (core stays DI-free; no consumer asks for it)
  - API-16 obsoletion (in CS-API evolution gates)
  - JS-10 wire date and duration formats (no ocx driver)
  - AS-10 Channels (SemaphoreSlim folded into single-flight)
  - AG-04 agent-config prior art (shape only)
- **Folded, not dropped:** XP-12 → snapshots; XP-13 → performance; BD-13/16/17/18/20 → diagnose; BD-14 → upgrade; BD-15 and PR-15 → app-publish.

## Authoring notes (binding on the drafters)

These notes bind the phase-7 drafters. Where a note and a consolidation disagree, the note wins: it records a cross-group resolution the consolidations could not make alone. Where a note is silent, the consolidation's own text is final. Sources are the 13 consolidations in this directory, cited as [process], [async], [api] (holds CS-API and CS-ERR), [json], [build], [packaging] (holds CS-PKG, CS-BIN-01..19 and release steps R1-R14), [xp] (csharp-crossplatform: CS-XP, CS-TEST-01..08, CS-CI), [language], [obs], [security] (CS-SEC, CS-BIN-20..28), [testing] (CS-TEST-09..31), [perf] and [procedures] (DN-*).

### N-1. Rules and exact glob lists

- **`csharp-quality`**, `paths: ["**/*.cs"]`.
  - Keywords: `csharp,dotnet,quality,nullable,async,cancellation,process,subprocess,json,system-text-json,api-design,exceptions,testing,xunit,ci,cross-platform,security,logging,telemetry,performance`.
  - Index body under 200 lines (target 185, so a later edit has room).
- **`dotnet-build`**, with these `paths` in this order, 16 entries, all double-quoted:
  - `"**/*.csproj"`, `"**/*.props"`, `"**/*.targets"`, `"**/global.json"`
  - `"**/nuget.config"`, `"**/NuGet.config"`, `"**/NuGet.Config"` (clients match case-sensitively; all three spellings are live in the exemplars: 11, 12 and 5 repos)
  - `"**/.globalconfig"`, `"**/*.globalconfig"` (Polly names its files `*.globalconfig`; a `*` glob does not match a leading dot in picomatch-style clients)
  - `"**/BannedSymbols*.txt"`, `"**/PublicAPI.Shipped.txt"`, `"**/PublicAPI.Unshipped.txt"`
  - `"**/*.slnx"`, `"**/*.sln"`, `"**/packages.lock.json"`, `"**/dotnet-tools.json"`
  - Keywords: `dotnet,msbuild,csproj,nuget,analyzers,globalconfig,bannedsymbols,central-package-management,global-json,tfm,pack,nupkg,trusted-publishing,release`.
- **Widened from the topic map on purpose (globs-must-not-miss):** `*.props`/`*.targets` replace `Directory.Build.props`/`.targets`, because `src/Directory.Build.props`, `eng/*.props` and `Directory.Packages.props` carry the same posture; `BannedSymbols*.txt` and `PublicAPI.*.txt` are added because deleting a ban line or hand-editing an API file is the commonest gate-weakening edit and neither touches a `.csproj`. `dotnet-tools.json` is added for the local tool manifest (CS-PKG-10). No glob is narrower than a structural file name. No brace globs.
- **`.editorconfig` is not globbed.** It is not .NET-specific (the Kotlin set's ktlint reads it, and most fleet repos carry one), so a glob would load a .NET rule in every repo. In a .NET repo the agent has already loaded `csharp-quality` from the `.cs` file it is fixing, and that index's CS-CORE-01 covers `.editorconfig` edits and routes "editing `.editorconfig`" to `dotnet-build`. N-6 keeps the `.editorconfig` content minimal for the same reason.
- Never globbed: workflow YAML (CS-CI lives in `csharp-quality/testing.md`, N-2), `Dockerfile`, `*.fsproj`, `*.vbproj`, `*.ruleset`, `*.nuspec`.
- Depth files carry a never-matching glob: `"**/.csharp-quality-depth-on-demand"` and `"**/.dotnet-build-depth-on-demand"`, with the Swift comment line.
- **Checker**, behind an `if [ -d … ]` guard (root: microsoft/testfx at `7226b0c74729`, which holds every glob above except two NuGet spellings: 3911 `*.cs`, 111 `*.csproj`, 84 `*.props`, 52 `*.targets`, 19 `global.json`, 4 `NuGet.config`, 1 `.globalconfig`, 40 `BannedSymbols*.txt`, 41 + 41 `PublicAPI.*.txt`, 5 `*.slnx`, 13 `*.sln`, 1 `packages.lock.json`, 2 `dotnet-tools.json`):

  ```
  python3 -I .claude/skills/research-lang/scripts/check-artifacts.py \
    rules/csharp-quality.md rules/dotnet-build.md \
    skills/dotnet-upgrade skills/dotnet-diagnose skills/dotnet-release \
    --root /home/mherwig/.cache/research-lang/exemplars/csharp/microsoft__testfx \
    --allow-absent '**/nuget.config' --allow-absent '**/NuGet.Config' \
    --allow-absent '**/.csharp-quality-depth-on-demand' --allow-absent '**/.dotnet-build-depth-on-demand' \
    --forbid /home/ --forbid .cache/research-lang --forbid .agents/research --forbid consolidate-csharp
  ```

  `nuget.config` is live in DapperLib, coverlet and FluentValidation; `NuGet.Config` in BenchmarkDotNet, xunit and StackExchange.Redis.
- The checker reads only `.md` files. Shipped scripts and data under `checks/` get their own leak scan: `grep -rn -e /home/ -e .cache/research-lang -e .agents/research -e consolidate-csharp rules/csharp-quality rules/dotnet-build skills/dotnet-upgrade skills/dotnet-diagnose skills/dotnet-release` prints nothing.
- Each index says which globs it installs with, and that the other index ships beside it in `dotnet-essentials`.

### N-2. Depth files, owned families, sources

One family per file and one file per family, forever. A file may own two families only where the table says so. Depth files never point at each other; a cross-family reference cites the ID, and the index routing resolves it. Every rule is a table row `| ID | Rule | Rationale | Verification | Severity |` with a filled Verification cell (the checker reads only rows that start with an ID as definitions).

| File | Family | Draw from |
|---|---|---|
| `rules/csharp-quality/processes.md` | CS-PROC | [process] Ruleset 01-25, the Win32 `NativeErrorCode` table, failure modes and classes A-I, conflicts 1-30; N-5 rows P1-P6 |
| `rules/csharp-quality/binaries.md` | CS-BIN | [packaging] CS-BIN-01..18 and [security] CS-BIN-20..22, 24..26; N-5 rows B1-B4; N-7 retirements |
| `rules/csharp-quality/async.md` | CS-ASYNC | [async] Ruleset 01-33, the per-rule severity block (moves to N-6 posture files, cited by CS-ASYNC-19), conflicts; N-5 row A1 |
| `rules/csharp-quality/api-design.md` | CS-API | [api] CS-API-01..20, SemVer table, release order; N-5 row E1 |
| `rules/csharp-quality/errors.md` | CS-ERR | [api] CS-ERR-01..17, the exit-table and behaviour-table mechanism; N-5 rows E1-E4 |
| `rules/csharp-quality/json.md` | CS-JSON | [json] Ruleset 01-22, the canonical options block, the policy table, failure modes 1-25 |
| `rules/csharp-quality/platform-and-paths.md` | CS-XP | [xp] CS-XP-01..12, the PathSafe contract, failure classes A-E |
| `rules/csharp-quality/testing.md` | CS-TEST, CS-CI | [xp] CS-TEST-01..08 and CS-CI-01..07 (with `check-ci-matrix.sh` R1-R12), [testing] CS-TEST-09..31, conflicts 1-8; N-5 rows T1-T3 |
| `rules/csharp-quality/language.md` | CS-LANG | [language] CS-LANG-01..25, conflicts 1-12; drop the ns2.0 conditional section to one line (owner default 1) |
| `rules/csharp-quality/security.md` | CS-SEC | [security] CS-SEC-01..16, the hazard matrix compressed to the silent rows (H5, H6, H9, H12-H17), Verdict 4-11; N-5 row S1 |
| `rules/csharp-quality/observability.md` | CS-OBS | [obs] CS-OBS-01..24, 26..29 (25 to the ADR, N-7), Verdicts 4-9 |
| `rules/csharp-quality/performance.md` | CS-PERF | [perf] CS-PERF-01..09 and its benchmark procedure |
| `rules/dotnet-build/packaging.md` | CS-PKG | [packaging] CS-PKG-01..15 (pack properties only; R1-R14 go to `dotnet-release`); N-5 row K1 |

- **Index-owned families:** CS-CORE and DN-RULE in `rules/csharp-quality.md`; CS-BUILD in `rules/dotnet-build.md` (N-3).
- **Skill-owned families:** DN-UPG in `skills/dotnet-upgrade/SKILL.md`; DN-DIAG in `skills/dotnet-diagnose/references/catalogue.md`; DN-REL in `skills/dotnet-release/SKILL.md`. These are procedure step IDs from [procedures]; skills define no other family.
- **`processes.md` plus `binaries.md` are the "wrapping an external CLI from .NET" depth.** Between them they cover the resolver, argv, streams and encoding, cancellation and kill, exit-code mapping, the env scrub and binary acquisition and verification. The fake-CLI harness is CS-TEST-01..04 in `testing.md`, which both cite. Each file's opening scope line names the other family by prefix only.
- **Shipped scripts and data** (house convention of `rules/docs-quality/checks/`; no `.md` in any `checks/`; named by installed path in prose, not as links):
  - `rules/dotnet-build/checks/`: the analyzer posture (N-6): `BannedSymbols.txt`, `BannedSymbols.Src.txt`, `analyzers.globalconfig`, `analyzers.editorconfig`, `Directory.Packages.analyzers.props` (the `GlobalPackageReference` block), and `posture-check.sh` (duplicate-symbol, severity-line and `AdditionalFiles` assertions).
  - `rules/csharp-quality/checks/`: `weaken-check.sh` (CS-CORE-01), `check-ci-matrix.sh` (CS-CI-07, R1-R12 plus `continue-on-error` from CS-TEST-11), `test-greps.sh` (the [testing] `greps.sh` checks for CS-TEST-12, ported).
  - Any fixture script a consolidation cites as a verification (`b.sh`, `greps.sh`, `net11gate.sh`, `run-all.sh`) is either ported into one of these `checks/` dirs under a neutral name or replaced by an inline command. Never cited by its fixture path.

### N-3. Index-owned versus depth-owned

- **`rules/csharp-quality.md` owns CS-CORE outright** (new family; each row draws on the consolidations named):
  - CS-CORE-01: never reach green by weakening a check. The weaken list, union of [language] CS-LANG-02/23, [security] CS-SEC-06, [testing] CS-TEST-11/12, [build] CS-BUILD-11..13, [xp] failure mode 21 and [procedures] DN-RULE-04: `NoWarn`/`WarningsNotAsErrors` beyond NU1900-1905, `#pragma warning disable` or `[SuppressMessage]` without a reason, a lowered `dotnet_diagnostic` severity, a deleted `BannedSymbols` line or `AdditionalFiles` item, `-p:TreatWarningsAsErrors=false`, `--ignore-exit-code`, `continue-on-error`, `generated_code = true` outside `obj/`, `#nullable disable`, a `Skip` without a reason, a deleted test. Verification: `checks/weaken-check.sh` against `BASE`.
  - CS-CORE-02: watch every check red on a planted defect and green on its twin before relying on it; an unwatched check is a reading heuristic. Draws on every consolidation's Watched column, [xp] class B (planted canary) and CS-BUILD-18.
  - CS-CORE-03: a step is done when its command, exit code and tree are named, and exit 0 alone proves nothing: prove a fix by a zero diagnostic count, a test run by per-TFM test counts, a release by running the artifact ([procedures] Verdict 1, DN-RULE-07).
- **It also owns DN-RULE-01..10** as one-line rows (they bind every `dotnet` invocation, so they belong where every `.cs` edit loads them). DN-RULE-02 carries the N-5 amendment to CS-BUILD-30.
- **`rules/dotnet-build.md` owns CS-BUILD outright** (rows 01..08, 10..18, 20..30, as amended in N-5 and N-6), in the shape of `swift-package`'s SW-PKG rows: one line per row.
- **Each index also holds:**
  - the gate block, commands only, owned by CS-BUILD-16 and quoted in both indexes: SDK assert (CS-BUILD-21), restore into an empty packages folder (CS-BUILD-27), `dotnet build` with warnings-as-errors from the props (CS-BUILD-13), `dotnet format --verify-no-changes` (CS-BUILD-16), `dotnet test` with the zero-test gate (CS-TEST-06), and for packable projects `dotnet pack` plus the nuspec budget (CS-SEC-09) and package validation (CS-PKG-09). Every line wrapped per DN-RULE-01, knobs per DN-RULE-02;
  - a non-negotiables list (at most 25 lines in `csharp-quality`, at most 12 in `dotnet-build`), each line ending in its ID;
  - a routing table keyed by task words (verbs and file names an agent is about to touch), one row per depth file, plus rows for the sibling index, the three skills, `code-docs` and `docs-quality`;
  - the owner defaults (N-9), one line each, in `csharp-quality` only; `dotnet-build` cites them.
- **`csharp-quality` non-negotiables** (curated, not the MUST inventory): CS-CORE-01, CS-CORE-02, CS-BUILD-13, DN-RULE-01, DN-RULE-07, CS-LANG-01, CS-LANG-03, CS-LANG-05, CS-LANG-23, CS-ASYNC-01, CS-ASYNC-14, CS-ASYNC-16, CS-ASYNC-17, CS-PROC-01, CS-PROC-03, CS-PROC-08, CS-PROC-09, CS-PROC-14, CS-XP-01, CS-XP-07, CS-XP-11, CS-JSON-01, CS-JSON-06, CS-ERR-06, CS-SEC-03, CS-TEST-04. That is 26 IDs; merge CS-PROC-09 and CS-PROC-14 into one line to stay at 25.
- **`dotnet-build` non-negotiables:** CS-BUILD-01, CS-BUILD-04, CS-BUILD-10, CS-BUILD-12, CS-BUILD-13, CS-BUILD-15, CS-BUILD-20, CS-BUILD-23, CS-BUILD-25, CS-BUILD-27, CS-SEC-09, CS-PKG-11.

### N-4. Bounded duplication

- A rule's text appears once, in its owning file. Allowed duplication: the non-negotiable line, the gate block copy (citing CS-BUILD-16), and skill `| # | Finding | Rule |` tables (N-13).
- These appear in one file only:

  | Content | Only in |
  |---|---|
  | Every `BannedSymbols` line | `rules/dotnet-build/checks/BannedSymbols*.txt`; depth rows cite the file and quote at most the symbol |
  | Every `dotnet_diagnostic` severity line | `checks/analyzers.globalconfig` or `checks/analyzers.editorconfig`; depth rows name the ID and the file |
  | The test-project carve-out section | CS-TEST-12 |
  | The PathSafe contract | CS-XP-01 |
  | The env scrub list | CS-PROC-06 |
  | The resolver order | CS-PROC-03 (CS-BIN-01 cites it, N-5 P1) |
  | The stderr callback contract | CS-OBS-27/28 (CS-ASYNC-30 cites it; CS-ASYNC-31 retired, N-8) |
  | The weaken list | CS-CORE-01 |
  | `check-ci-matrix.sh` | `rules/csharp-quality/checks/`; CS-CI-07 names it |
  | The packed-dependency budget | CS-SEC-09 (CS-BUILD-24's nuspec clause and CS-OBS-13's nuspec grep cite it) |

### N-5. Cross-group conflicts, resolved

Each row is binding. "Owner" is the file that carries the resolved text.

| # | Conflict | Resolution | Owner |
|---|---|---|---|
| A1 | CS-ASYNC-24 vs CS-BIN-12 step 3 (overwrite on install) | `File.Move(..., overwrite: false)` plus a catch for the loser of the race; CS-ASYNC-24 itself goes to the ADR | CS-BIN-12 |
| B1 | CS-BIN-03 home (GetFolderPath only) vs CS-XP-04 (env first) | CS-XP-04 wins (watched: cwd-relative `.ocx`); CS-BIN-03 retired | CS-XP-04 |
| B2 | CS-BUILD-07 binary selection grep vs CS-XP-10 RS0030 bans | CS-XP-10 wins (analyzer over grep); CS-BUILD-07 retired | CS-XP-10 |
| B3 | Linux libc probe ([xp] ci-matrix rule 9) vs CS-BIN-05 | No probe; select the variant the tool ships (musl static for the reference consumer, an example) | CS-BIN-05 |
| B4 | `HttpContent.ReadAs*` and `RuntimeIdentifier` in two fragments | One line each: `ReadAs*` owned by CS-BIN-11, `RuntimeIdentifier` by CS-XP-10 | N-6 |
| P1 | Resolver order: CS-PROC-03 has no re-entry-pin tier, CS-BIN-01 does | One order, in CS-PROC-03: explicit argument, the SDK override variable, the tool's own re-entry pin variable if it defines one, rooted PATH (exact name, no PATHEXT, trust check, CS-PROC-25 on Windows), the tool's home, then the opt-in download (CS-BIN-06). CS-BIN-01 shrinks to "resolve via CS-PROC-03, start only the rooted result" | CS-PROC-03 |
| P2 | CS-PROC-07 fixed argv prefix vs CS-OBS-26 `--log-level` | The prefix gains the tool's log-level flag after the output flags and before the verb (example: `--format json --color never --log-level warn <verb>`); the composer test asserts it | CS-PROC-07 |
| P3 | CS-PROC-15 `CancelAfter`, CS-PROC-22 `Task.Delay(d, ct)` vs CS-XP-11 | Every timer takes the injected `TimeProvider` | CS-XP-11 |
| P4 | CS-PROC-24 (a Linux and a Windows leg) vs CS-TEST-04 / CS-CI-01 | CS-TEST-04 supersedes; CS-PROC-24 retired | CS-TEST-04 |
| P5 | CS-PROC-23 (.NET 11 APIs behind `#if NET11_0_OR_GREATER`) vs CS-LANG-16 (such a region is never compiled) | No such region until a `net11.0` leg exists; CS-PROC-23 retired, and the .NET 11 process APIs become a `dotnet-upgrade` re-check | CS-LANG-16 |
| P6 | `Encoding.Default` banned with "use Encoding.UTF8" (CS-BUILD-15) while CS-PROC bans `Encoding.UTF8` | One line, owned by CS-PROC-11, message "use new UTF8Encoding(false)"; the CS-BUILD-15 five-line starter is retired into the CS-PROC and CS-XP owners | N-6 |
| C1 | CA1062: CS-BUILD-12 repo-wide `none` vs CS-LANG-05 `warning` | CS-LANG-05 wins (measured). CA1062 leaves the repo-wide list; tests relax it in CS-TEST-12's section | CS-LANG-05, CS-BUILD-12 |
| C2 | CA1867: CS-BUILD-12 closes the `none` list at five vs CS-PERF-02 | CA1867 joins. The repo-wide `none` list is exactly CA1303, CA1308, CA1716, CA1867, VSTHRD003, each with a reason line | CS-BUILD-12 |
| C3 | CS-BUILD-15 "exactly two packs" vs IDisposableAnalyzers (async), Meziantou (api MA0053, async MA0004, json MA0222/MA0223, language MA0143, xp MA0076), PublicApiAnalyzers (api) | Five packs (N-6). CS-PROC's "no Meziantou" meant MA0161-MA0163 only and stays: those three are not enabled | CS-BUILD-15 |
| C4 | Severity location: [language] conflict 5 (CA/RS/MA in `.globalconfig`) vs the `[src/**.cs]` `.editorconfig` blocks in [process], [async], [packaging], [xp] | `.globalconfig` for every CA, RS, MA, SYSLIB, VSTHRD, IDISP, xUnit and IL severity that is the same for src and tests. `.editorconfig` only for IDE rules, editorconfig options (`generated_code`, collection-expression style) and path-scoped differences (the src-only CA2007/MA0004 errors and the CS-TEST-12 section) | N-6 |
| C5 | CS-BUILD-17 test-layer `.globalconfig` (`global_level = 101`), used by CS-OBS-02 and CS-LANG-05 for test relaxations, vs CS-TEST-12 "one `.editorconfig` section, nothing else" | One root `.globalconfig`, no test layer. CS-TEST-12's section is the only test relaxation and becomes seven IDs: CA2007, VSTHRD200, CA1707, CS1591 (measured) plus CA1062, CA1848, CA1873 (watch red/green before shipping, CS-CORE-02). CS-BUILD-17 is reworded to "one root `.globalconfig`; never a second file to relax severities" | CS-TEST-12, CS-BUILD-17 |
| C6 | CS-BUILD-14 "test projects set `GenerateDocumentationFile=false`" | Overturned (measured: `error EnableGenerateDocumentationFile`); tests inherit `true` and relax CS1591 in CS-TEST-12 | CS-BUILD-14 |
| C7 | CS-BUILD-30 demands `--tl:off`/`--interactive false` on `dotnet test` | Flags only on `restore`, `build`, `publish`, `pack`, `clean`; `MSBUILDTERMINALLOGGER=off` and `DOTNET_NOLOGO=1` in the environment for everything else (measured: `dotnet test` under MTP exits 5). CS-BUILD-30's verify grep changes to match | DN-RULE-02 |
| C8 | `-warnaserror` as the upgrade step-0 green check | `dotnet build --no-incremental` relying on the props (CS-BUILD-13) | DN-UPG-00 |
| K1 | CS-PKG-06 MinVer as `PackageReference Version=` vs CS-BUILD-23 (NU1008 under CPM) | `GlobalPackageReference` in `Directory.Packages.props` | CS-SEC-10 |
| K2 | Release step R3 `dotnet restore --locked-mode` vs CS-BUILD-25 (no lock file; `--locked-mode` without a lock passes and creates one) | R3 becomes restore into an empty packages folder with the audit asserted (CS-BUILD-26/27) | `dotnet-release` |
| K3 | CS-BUILD-24 nuspec dependency count 0 vs CS-JSON-14 (System.Text.Json on net8.0) | net10.0 group empty; net8.0 group holds `System.Text.Json` only | CS-SEC-09 |
| S1 | CS-SEC-03 allows `new Regex(p, o, TimeSpan)` for literals vs CS-PERF-03 | Literal patterns use `[GeneratedRegex(pattern, options, matchTimeoutMilliseconds: 1000)]`; the `TimeSpan` forms are for runtime patterns only | CS-PERF-03, CS-SEC-03 |
| S2 | Polymorphism: `[JsonDerivedType]` allow-list vs the tag-first converter | CS-JSON-07 wins (an unknown tag must not throw) | CS-JSON-07 |
| S3 | `FixedTimeEquals` on every digest vs CS-JSON-15 string digests | Bytes are authenticated in one helper (CS-SEC-08); tool-reported digests stay ordinal strings | CS-SEC-08 |
| S4 | CA5394 pragma for retry jitter vs CS-SEC-06 | `RandomNumberGenerator.GetInt32`; no suppression | CS-SEC-07 |
| O1 | Abstractions version: latest 10.x vs lowest | Apps pin latest; a packable library references the lowest it compiles against | CS-OBS-14 |
| O2 | Throwing stderr callback: swallow vs rethrow | Guard, stop calling, keep draining, rethrow after exit | CS-OBS-28 |
| O3 | `Action<string>` vs `IProgress<string>` | `Action<string>` (measured reordering) | CS-OBS-27 |
| E1 | [json] flags to [api]: `PartialReportJson`, `NotSupportedException`, the CS-ERR-04 seam gate | Rename to `PartialReport` (`object?`), drop `NotSupportedException` from the decode catch list, narrow the CS-ERR-04 gate to the one decode seam | CS-ERR-01/04 |
| E2 | [process] flags to [api]: `ChildExit` gains `IsOcxError`-style flag, launch-failure enum gains `BatchRefused`, CS-ERR-10 `IsTransient` needs the transient marker | Apply all three, written generically (example names allowed) | CS-ERR-03/10, CS-ERR-01 |
| E3 | CS-ERR "thrown synchronously" (R-EXC-23 wording) vs async guards | The guard faults the returned Task; document it so | CS-LANG-05 |
| E4 | CS-ERR-06 CA1031 site list | Gains the CS-OBS-28 callback site | CS-ERR-06 |
| T1 | CS-TEST-01 "exactly four projects" vs the `.Baseline` twin build | "Four tiers; the fake-CLI tier gains a `.Baseline` twin build from the second release"; CS-TEST-06's grep hits 3 projects, or 4 with the twin | CS-TEST-01, CS-TEST-06 |
| T2 | Coverage on one Linux leg vs "exclude no platform branch" | Linux x64 plus Windows x64, merged in the aggregator job; general libraries add the Windows leg only when `src` branches on the OS | CS-TEST-19, CS-TEST-30 |
| T3 | NuGet cache in CI (ci-matrix rule 16) vs CS-BUILD-27 | No cache; R12 enforces | CS-BUILD-27 |

### N-6. The analyzer posture (one set of files, every group's lines)

- **Packs**, each a `GlobalPackageReference` with an exact version in `Directory.Packages.props`: `Microsoft.CodeAnalysis.BannedApiAnalyzers` 5.6.0, `Microsoft.CodeAnalysis.PublicApiAnalyzers` 5.6.0 (packable projects only), `Microsoft.VisualStudio.Threading.Analyzers` 18.7.23, `IDisposableAnalyzers` 4.0.8, `Meziantou.Analyzer` 3.0.297 with `<MeziantouAnalysisMode>None</MeziantouAnalysisMode>` (only the per-rule lines fire), and `MinVer` 8.0.0 (K1). Never StyleCop, Roslynator or the NetAnalyzers package. CS-BUILD-15 is rewritten to this list.
- **`analyzers.globalconfig`**: `is_global = true`; one line per ID, each with a trailing `# <ID>` naming the owning rule. It merges [async] CS-ASYNC-19's lines, [obs]'s 16 lines, [perf]'s three lines, [security]'s RS0030/RS0031 pair, [language]'s CA1062 and MA0143, [xp]'s CA1304/1305/1307/1309/1310/1311/1416 and MA0076, [api]'s RS0016/RS0017/RS0036/RS0037/MA0053, [json]'s IL2026/IL3050/MA0222/MA0223, [packaging]'s CA5350/CA5359/SYSLIB0014, and CS-BUILD-12's five `none` lines with reasons. Security IDs get no line (CS-SEC-01).
- **`analyzers.editorconfig`** (the lines an adopter appends to the root `.editorconfig`): the `[*.cs]`/`[**/obj/**.cs]` `generated_code` pair (CS-LANG-24); IDE0005/0055/0161 (CS-BUILD-14), IDE0370 (CS-LANG-03), IDE0010/IDE0072 (CS-LANG-22), `dotnet_style_prefer_collection_expression` (CS-LANG-21); `[src/**.cs]` CA2007 and MA0004 at error (CS-ASYNC-06); the CS-TEST-12 `[{test,tests,samples}/**.cs]` section with the seven IDs of C5. The brace pattern is `.editorconfig` section syntax, not a rule glob.
- **`BannedSymbols.txt`** (repo-wide) and **`BannedSymbols.Src.txt`** (registered from `src/Directory.Build.props` only). Every symbol appears once across both files, under a `// --- <owning family>` header, with a message that names exactly one shipped rule ID. Src-only: the [xp] Time fragment (CS-XP-11) and the [obs] CS-OBS-16 console/trace lines (the fake CLI is a console app). Everything else is repo-wide unless its consolidation scopes it to `src`. Collisions resolved by B4 and P6, and `DangerousAcceptAnyServerCertificateValidator` lives only in the security section. The five `ECDsa` lines cite CS-SEC-08 (CS-BIN-28 goes to the ADR, N-7). The `MemoryExtensions.Reverse` line cites CS-LANG-08.
- **`posture-check.sh`** asserts: no duplicate symbol across the two ban files (`sort | uniq -d` empty); RS0030 and RS0031 lines present at `error`; both files registered as `AdditionalFiles`; every `.globalconfig` ID line unique. Watch it red on a concatenated (duplicated) fragment and on a deleted severity line.
- **Canary.** The drafter builds one fixture on SDK 10.0.401 with `net8.0;net10.0`: a red project hitting at least one line from each ban section and each new severity line, and a green twin. Red exits 1 on both TFMs, green exits 0. Record the counts in the drafter's report, not in shipped text (N-10).

### N-7. Portability split and the ADR

- **Published files keep the mechanism.** "The wrapped tool", "the SDK" and "the reference consumer" are the generic nouns. `ocx`, `Ocx.Sdk`, `OcxClient`, `OCX_*` and `tests/Ocx.Sdk.*` may stay as example names, and the first use in each file says "example names from the reference consumer; rename". Verification commands keep working on the example names; an adopter renames once.
- **These move to the ADR and are retired in the shipped files** (one line per file: "CS-X-nn is retired, not reused"):
  - CS-ASYNC-24 (bootstrap coalescing), CS-ASYNC-28 (the v1 streaming surface);
  - CS-BIN-19 and CS-BIN-27 (delivery model b, not the default), CS-BIN-23 (crypto-package ban tied to the reference consumer's upgrade path), CS-BIN-28 (dormant P-256 verification);
  - CS-OBS-25 (the telemetry identity instance).
- **Numbers and names that appear only in the ADR**, never as rule text: the exit-code table values (64, 65, 69, 74, 75, 78, 79, 80, 81, 82 and their meanings, including 82's reuse between 0.6.5 and main); the command layout and verb list; `Ocx.Sdk` package ID and namespace, `OcxTelemetry` names, the `OCX` diagnostic prefix; the behaviour-table path; the full `OCX_*` environment table (`OCX_SDK_EXE`, `OCX_BINARY_PIN`, `OCX_HOME`, `OCX_AUTH_*`, `OCX_NO_VERIFY`, `OCX_LOG`, `OCX_LOG_LEVEL`, `OCX_OFFLINE`, `OCX_FROZEN`, `OCX_NO_CONSENT`, `OCX_SDK_CONTRACT`, `OCX_TEST_VERSIONS`); the contract handshake fields; the delivery model and `ocx-pins.json`; `TestedOcxVersion`; the upstream asks.
- **The ADR** is `.agents/research/csharp-ocx-sdk/adr_ocx_csharp_sdk.md`, Status Proposed, addressed to the ocx-sh/ocx maintainers, in the shape of `nix-generated-flakes/adr_nix_flake_generation.md` (Metadata, Context, Decision Drivers, Considered Options, Decision Outcome D1..Dn, Requests to ocx-sh/ocx, Consequences, Validation, Open Questions, Links). Each decision cites the shipped rule IDs it instantiates. Upstream asks: a release carrying `contract`; the [process] owner question 9 issues (`login` exit 0, `self update` label, non-global `--format`); a signed `dist.json` (ECDSA P-256 DER, [security] F10); `OCX_LOG_LEVEL` on releases; a non-forgeable passthrough marker; whether ocx reads `TRACEPARENT`. Commit links are written as `[6daf9a164](https://github.com/ocx-sh/ocx/commit/6daf9a164)`.

### N-8. Funnel and retirements

- Ship a row only when all four hold: an agent gets it wrong unprompted (a failure-mode row or a corpus count backs it), it has a check (analyzer, ban, grep, test or build), it changes a diff, and no sibling row contradicts it. A CONSIDER row ships only if watched. A row whose only content is "the BCL default is already safe" (the [security] historical rows H1-H4, H7, H8, H10, H11) becomes one sentence in the file's intro, not a row.
- **Retired, not reused** (one line each in the owning file): CS-PROC-23, CS-PROC-24, CS-BIN-03, CS-BUILD-07, CS-ASYNC-31 (duplicate of CS-OBS-28), CS-LANG-14 (CONSIDER, unwatched), CS-LANG-17 (dormant until a .NET 11 GA pin; becomes a `dotnet-upgrade` re-check), plus the N-7 list.
- **[ocx]-tagged rows that ship generalised** (rewrite the rule in mechanism terms, keep the ID): CS-ASYNC-15, 20, 26, 27, 29, 30, 32; CS-API-01/02 (sealed client with async factory, no public seam); CS-ERR-01 (abstract root plus one sealed leaf per failure class: command, decode, contract, timeout, launch); CS-JSON-05, 10, 12; CS-OBS-26, 27, 28, 29; CS-TEST-01, 07, 27..31; CS-CI-01; CS-BIN-01, 02, 05, 06, 09, 20..22, 24..26; CS-PROC-20, 21, 22.
- Target after the funnel: about 230 shipped rows across 13 depth files and two indexes (Swift shipped 260), each depth file within its budget in the drafter brief.

### N-9. Pins and owner defaults

- **Toolchain and packages** (each dated with its consolidation's frontmatter date, N-11): SDK 10.0.401 with `rollForward: latestFeature` and no prerelease; runtimes 10.0.12 and 8.0.31; LangVersion 14; AnalysisLevel 10.0-all; SDK 11.0.100-rc.1.26425.128 for probes only; the five analyzer packs and MinVer in N-6; System.Text.Json 10.0.12 (net8.0 asset); xunit.v3.mtp-v2 4.0.2; Microsoft.Extensions.TimeProvider.Testing 10.10.0; Microsoft.Testing.Extensions.CodeCoverage 18.12.0; CsCheck at the [testing] version; image `mcr.microsoft.com/dotnet/sdk:10.0.401-alpine3.24`; actionlint 1.7.12 or later; BenchmarkDotNet 0.15.8 (procedure only).
- **Owner defaults**, each written "default; the adopter may override", listed once in the `csharp-quality` index (the StructuredOutput `owner_defaults` array carries the same list):
  1. Reach: net8+ only, no netstandard2.0 slice.
  2. Floor: `net8.0;net10.0` until .NET 8 end of support (2026-11-10); `net10.0`-only is the end state, executed by `dotnet-upgrade`.
  3. LangVersion 14 on both TFMs.
  4. Warnings-as-errors unconditional, for humans too; only NU1900-NU1905 exempt.
  5. Meziantou adopted with mode `None` and per-rule lines.
  6. No lock file for a library; CI restores into an empty packages folder; no NuGet cache.
  7. Delivery: locate plus opt-in download verified against a compiled-in SHA-256 pin; no binary in the nupkg.
  8. Contract baseline: the SDK floor is the first tool release carrying the machine contract; the tested version lives in one constant.
  9. Identity: package ID and namespace chosen by the adopter (`Ocx.Sdk` is the example); Trusted Publishing; MinVer `v` tags; no author signing; no strong naming.
  10. Owned process engine (no CliWrap); async-only v1 surface.
  11. Output cap 16 MiB (discard and keep draining), 5 s post-exit drain bound with a timed-out flag, kill grace 0, no Windows job object.
  12. Environment scrub as a 7-key deny-list, compared OrdinalIgnoreCase.
  13. Closed results (no public constructors, no model factory); `[Experimental]` only from 1.0.
  14. Five exception leaves; no sixth acquisition leaf until the download path ships.
  15. Passthrough exits carry a heuristic "tool reported this" flag, documented as a heuristic.
  16. Coverage is a report (Linux x64 plus Windows x64), no threshold, no coverage service.
  17. No snapshot library; behaviour pinned by explicit table rows.
  18. Benchmarks never merged; a performance claim carries its table in the PR.
  19. No signature verification at v1 (digest pin only); NuGet `signatureValidationMode` stays `accept`; Dependabot only; no SBOM in the nupkg.
  20. Five native PR legs including macOS; `ci-ok` is the only required check.
  21. CA1062 on for `src`.

### N-10. Drop at authoring

- **Research-host specifics appear nowhere in shipped text:** `run.sh`, `~/.cache/research-lang` and every `/home/` path; fixture and probe names (`b.sh`, `gate/red`, `consolidate-csharp-*`, `f1-red`, `ca1062-red`); run and row IDs (`[CL]`, `[NUL] V6`, `[K]`, `P1`, `V3`, `C4`); citation keys of sub-artifacts. A row says "watched red (measured 2026-10-11)". Exemplar citations keep `owner__repo@sha:path:line`.
- **Rejected or corrected claims appear nowhere:** "guards trip CA2264 so they are redundant"; the `[*.g.cs] generated_code = true` pair; `--blame-hang-timeout` under MTP; `GenerateDocumentationFile=false` in tests; `coverlet.*` under MTP; `-warnaserror` as a green check; `--locked-mode` without a lock; `Is64BitOperatingSystem` for arm64; the VSTest `--filter` exit-5 claim for xUnit v3 (it exits 0); NETSDK1179 as current behaviour; `[JsonDerivedType]` for open unions; Ed25519 in the BCL.
- **Answered or owner-gated open questions** are not carried into shipped files; owner defaults appear only as N-9 lines. Research rounds named in the consolidations' Open questions are not mentioned.

### N-11. Version-dating convention

- Every version-specific claim names the tool and version and says "(measured 2026-10-11)" or "(read 2026-10-11)", using the date in the source consolidation's frontmatter. Each depth file opens with one line naming the versions it binds to (SDK 10.0.401 on Linux x64; Windows rows measured on SDK 10.0.102 say so; macOS and arm64 rows are `unverified: read only`).
- TFM-dependent rows say which TFM they were watched on (net8.0, net10.0 or both).
- Dated externals keep their date: .NET 8 and 9 end of support 2026-11-10; .NET 11 GA November 2026; `macos-14` unsupported from 2026-11-02; `ubuntu-latest` moving to 26.04 between 2026-10-19 and 2026-11-19.

### N-12. Verification-command shape and the drafter's watch

- Every lint in Swift N-10 applies unchanged. In particular: an explicit directory operand (`src`, `tests`, `.`); one `-e` per alternative, never `\|` in a table cell (the [xp] and [language] cells that use `\|` or `-E 'a|b'` are rewritten); quoted `-g '*.cs'` and `--include='*.cs'`; no `<placeholder>` inside a pattern (use the example name); no `$(...)`; `xargs -r` or `xargs -0 -r`; a command with a pipe goes in a fenced block under the table and the cell cites it; each cell says what empty output means.
- **`rg` in this harness is rewritten** to a different tool by a shell hook. Watch every `rg` check with the absolute ripgrep binary (`/home/mherwig/.ocx/toolchain/active/bin/rg`), and write plain `rg` in shipped text.
- **Every check that can run is watched red and green by its drafter** on `~/.cache/research-lang/dotnet-tools/fixtures/author-<slug>/` (slug = the file's stem, e.g. `author-processes`), through `~/.cache/research-lang/dotnet-tools/run.sh`, with SDK 10.0.401 and `net8.0;net10.0`. A check copied from a consolidation whose Watched cell says yes is re-run once on the drafter's fixture only if the drafter changed its text. A check that cannot run here (macOS, arm64, a real registry, nuget.org writes) is labelled a reading heuristic or `unverified: read only`.
- Exit-code contracts named in cells: `dotnet test` under MTP 0 pass, 2 failed test, 5 unknown option, 8 zero tests, 9 below the per-module minimum; `xargs` 123 when a `grep -L` lists a file; `timeout` 124; RS0030 failures exit 1 through the build.

### N-13. Skill scope

- **Procedures only**, numbered steps that cite rule IDs; a skill never restates rule text. Any MUST it repeats goes in a `| # | Finding | Rule |` table with the ID last (never a row starting with an ID, except the skill's own DN family).
  - `dotnet-upgrade`: DN-UPG-00..12, net8 to net10, plus the .NET 11 RC1 probe shape. Steps cite DN-RULE, CS-BUILD-01/02/04/08/20/21/26, CS-LANG-15/16, CS-TEST-06. `references/re-checks.md` lists the dated re-checks: .NET 11 GA process APIs (former CS-PROC-23), C# 15 fencing (former CS-LANG-17), the `11.0-all` analyzer re-diff, CS-PERF's net8 numbers, the net8 drop removing CS-LANG-08's cause.
  - `dotnet-diagnose`: the triage order (SDK, restore, project, compile, analyzers, trim/AOT, test, hang) in SKILL.md; DN-DIAG-01..66 as rows in `references/catalogue.md`; the DN-RULE-06 owner handoff; the CS-CORE-03 receipt.
  - `dotnet-release`: two scopes in one table. Library path: [packaging] R1-R14 with K2 applied, citing CS-PKG and CS-SEC-09/10. App path: DN-REL-01..14 with the mode table in `references/app-modes.md`. The tag push is the only publishing step and runs only when the owner asked.
- Descriptions: at most 1024 characters, third person, a "Use when" clause, exact symptom phrases (`A compatible .NET SDK was not found`, `MSB4242`, `NU1605`, `NETSDK1045`, "Zero tests ran", "exit code 8", `IL2026`, "the build hangs") and negative triggers. Bodies at most 500 lines. Every run ends with the CS-CORE-03 receipt.

### N-14. Bundle and plumbing (one wiring change)

- **Bundle `dotnet-essentials`**: `csharp-quality`, `dotnet-build`, `dotnet-upgrade`, `dotnet-diagnose`, `dotnet-release`, `code-docs`, `code-docs-cleanup`. Every member untagged (no tag, `latest` counts as a pin), with the Swift bundle's comment block.
- **`publish.toml`**: `[rules.csharp-quality]`, `[rules.dotnet-build]`, `[skills.dotnet-upgrade]`, `[skills.dotnet-diagnose]`, `[skills.dotnet-release]`, `[bundles.dotnet-essentials]`, each `version = "0.1.0"`, `description = { readme = "docs/<name>.md", logo = "assets/lore-dotnet.svg" }`, preceded by a set comment in the Swift shape (globs listed, what is never globbed and why).
- **Docs**: `docs/<name>.md` for the six, in the shape of `docs/swift-quality.md` and `docs/swift-essentials.md`. Numbers in docs come from the shipped files (row counts, MUST counts), counted after wave 2.
- **Mark**: `assets/glyphs/dotnet.svg` (a plain monochrome glyph drawn as paths, not a copy of any official logo) and `python3 scripts/make-mark.py dotnet assets/glyphs/dotnet.svg --disc '#512BD4' --ink '#FFFFFF'`, which writes `assets/lore-dotnet.svg`.
- **Taskfile**: a `CSHARP_CONSUMER` variable (`'{{.CSHARP_CONSUMER | default ""}}'`, "no default: the fleet has no .NET tree") and a check step after the Swift one, guarded on `{{.CSHARP_CONSUMER}}/global.json`, with N-1's `--allow-absent` and `--forbid` flags in the taskfile's style (`--forbid '/home/mherwig' --forbid '.agents/research'`); the else branch runs without `--root` and prints the Swift-style note.
- `README.md` lists no sets; it is not touched. The ADR is not part of the wiring change and is not published.

## Integration log

Phase-7 integrator pass (2026-10-11). Everything below was edited in place; nothing was committed.

### Fixes

- **Retired-ID citations (checker, 3 findings).** `platform-and-paths.md` intro rewrapped so `CS-BIN-03` sits on the line carrying "retired, not reused"; `dotnet-upgrade/references/re-checks.md` names CS-PROC-23 and CS-LANG-17 as retired on the citing lines (table cells and R1/R2 openers).
- **One gate block (N-3, N-4).** The two index copies disagreed: `dotnet-build` ran `dotnet test --no-build` without `-c Release` after a Release build and lacked `--disable-build-servers` (DN-RULE-10); `csharp-quality` lacked `--minimum-expected-tests` (DN-RULE-07) and `--tl:off` (CS-BUILD-30). Both now carry one block, byte-identical, owned by CS-BUILD-16: the stop-on-first-failure `g` wrapper, `--tl:off --interactive false` on restore, build and pack, `--disable-build-servers` on restore and build, `dotnet test -c Release --no-build --minimum-expected-tests 1`, and pack of the project file `src/Lib/Lib.csproj` (CS-BUILD-29). Watched on SDK 10.0.401, `net8.0;net10.0`, on a copy of the index fixture: exit 0 with one nupkg; `--minimum-expected-tests 1000` stopped at `gate: test exit 9`. The block passes the CS-BUILD-30 `tl-flags`, DN-RULE-02 and DN-RULE-10 greps. CS-BUILD-21 now points at the gate's first step rather than "the second line". DN-RULE-02 says `dotnet test --no-build` takes `-c`, `-f` and MTP options.
- **Root `dotnet pack` writes no nupkg on a `.slnx`.** Project-file packs in `packaging.md` (Dates and Defaults), `observability.md` (nuspec block intro), `security.md` (pack block and CS-SEC-09 cell) and the `dotnet-diagnose` catalogue captures.
- **CS-PROC-20 vs CS-ERR-02 (two exit-literal greps).** CS-ERR-02's check 02a owns the pattern, widened to the union `\b(?:[eE]xit)?[cC]ode(\.Value)?\s*(==|!=|is)\s*[1-9]\d{0,2}\b` (watched: hits `code`, `exitCode`, `ExitCode is`, `Code`, `.Value`; silent on `== 0` and `barcode`). CS-PROC-20's cell cites 02a/02b instead of carrying its own.
- **CS-PROC-06 vs CS-BIN-02 (pin write stated twice).** CS-PROC-06 now cites the re-entry pin "that CS-BIN-02 owns".
- **CS-SEC-03 vs CS-PERF-03 (S1).** CS-SEC-03 no longer allows a `const` or `static readonly` literal through `new Regex(p, o, TimeSpan)`: a runtime pattern is only `Regex.Escape` output, one marked `static readonly Regex`, as CS-PERF-03 says. The review-aid comment matches.
- **CS-SEC-01 vs the posture file.** CS-SEC-01 forbade any per-rule security line while `analyzers.globalconfig` raises CA5350 (CS-SEC-08) and CA5359 (CS-BIN-16). CS-SEC-01 now names those two raising lines as the only exceptions. CS-SEC-02's RS0030/RS0031 grep reads the installed root `.globalconfig`, not `analyzers.globalconfig`.
- **CS-PERF-01 / G1 vs CS-ASYNC-19, CS-OBS-02 and CS-TEST-12.** G1 flagged the shipped CA1849, CA1848 and CA1873 lines on a green tree. The row now names their owners and G1 excludes exactly those tagged lines. Watched with the absolute ripgrep on the shipped posture pair: green prints nothing, a planted `CA1805 = none` prints.
- **CS-OBS-13 vs CS-SEC-09.** A MEL-shaped library's `Microsoft.Extensions.Logging.Abstractions` dependency is recorded as the CS-SEC-09 written owner exception.
- **`analyzers.globalconfig`.** xUnit1051 retagged `# CS-TEST-13` (the row that requires it). posture-check.sh watched green on the installed set and red on a lowered xUnit1051.
- **`dotnet` invocation flags in skills and depth files.** Every `restore`, `build`, `pack`, `publish` and `clean` line that used `-tl:off` now carries `--tl:off --interactive false` (CS-BUILD-30's awk matches only the double-dash form), plus `--disable-build-servers` on restore, build and publish (DN-RULE-10). This covers the dotnet-release workflow snippets an adopter copies into `.github`. Each flag set was watched exit 0 per verb on the fixture copy.
- **Docs counts.** The `csharp-quality` index carries 24 non-negotiable lines (N-3's merged list), not 25: fixed in `docs/csharp-quality.md` (twice) and `docs/dotnet-essentials.md`. The other counts match the shipped files: 261 depth rows (219 MUST, 1 MUST from 1.0, 38 SHOULD, 3 CONSIDER), 13 index rows, 27 CS-BUILD, 15 CS-PKG (12 MUST), 13 DN-UPG, 66 DN-DIAG, 14 DN-REL, R1-R14 and 5 re-checks.

### Checked and left as is

- Ban files: no duplicate symbol across the two files; the CS-XP (21 repo-wide, 15 src-only, including the `CancellationTokenSource(TimeSpan)` and `CancelAfter` bans), CS-OBS-16 (5), CS-BIN-10/11 (14 and 12 overloads), CS-BIN-16 and CS-XP-10 lines are present; the security section holds 40 lines with `DangerousAcceptAnyServerCertificateValidator` once.
- `analyzers.globalconfig` carries RS0026/RS0027 and both MA0053 options; CS-ASYNC-19's C19a still counts 24; the CS-TEST-12 section holds the seven IDs; CS-BUILD-12's `none` count is 5, each with a reason line.
- No file repeats the `dotnet format analyzers --verify-no-changes` gate claim, CP0015 or the `-p:TargetFrameworks=a%3Bb` form. The `dotnet-diagnose` weaken-check interface matches the script (stdout = violation, exits 64/66).

### Open for the owner

- N-7 lists the reference tool's exit numbers as ADR-only, but `processes.md` CS-PROC-22 (`== *75` grep) and `async.md` (line 98) keep 75 as a labelled example. Left as is because the watched greps depend on it.
- CA1515 fails public helper types in an Exe test project under `10.0-all`. Resolved in phase 8: CS-TEST-12 carries eight IDs, CA1515 the eighth, in `testing.md` and the shipped `analyzers.editorconfig`.
- An incremental build after an `AdditionalFiles` or severity edit exited 0 on a canary that fails clean. The canaries use `--no-incremental`. No posture-check line was added.
- IDE0044 and CA2211 (CS-ASYNC-26 rationale) are not in the posture.

## Phase 8 review log

Consistency pass, 2026-10-11, after the per-unit review and fix waves. Nothing committed. Per-unit totals live in
`csharp-topic-map/scratch/review-receipt.json` (written by the orchestrator); below are the 45 cross-unit findings this pass
received, with the class each carries. Fixtures for every watch below: `fix-consistency/` under the dotnet-tools fixtures dir.

### Cross-unit findings received, per unit

| Unit | Count | Classes |
|---|---|---|
| processes | 5 | unfaithful 2 (F05 major, F17), contradiction 3 (F15, F16, F24) |
| async | 3 | stale-ref (F23), contradiction (F24), missing-route (F25) |
| api-errors | 3 | contradiction (F15 major), gap (F18), fidelity (F21) |
| json | 2 | contradiction 2 (F14 major, F15) |
| platform-perf | 2 | unenforced-claim (PP-10), routing-gap (PP-20) |
| testing | 2 | stale-count (TEST-F02 major), contradiction (TEST-F13) |
| language | 4 | contradiction 2 (F1 major, F12), redundant-row (F10), routing-gap (F17) |
| security-obs | 5 | contradiction 2 (F1 major, F24), placeholder (F4 major), dead-pattern 2 (F5 major, F6 major) |
| build | 4 | unfaithful (F04 major), contradiction (F05 major, same as api-errors F15), broken-step (F17), redundant-row (F19) |
| quality-index | 3 | contradiction (F-03 major), broken-step (F-17), redundant-row (F-22 major) |
| upgrade | 2 | dead-pattern 2 (UPG-07 major, UPG-08) |
| diagnose | 4 | false-negative-pattern (F2 major), contradiction (F4), unfaithful (F5 major), trigger-overlap (F13) |
| release | 2 | unfaithful (F5 major), contradiction (F12) |
| adr-docs | 4 | stale-era 2 (F6, F15), stale-log (F10), id-collision (F16) |

Found by this pass: CS-SEC-05 forbade `LibraryImport` in `src` while CS-PROC-18 mandates one (contradiction), and CS-BIN-20 threw
a `ChecksumMismatchException` that CS-ERR-01's five leaves do not hold (part of api-errors F18).

### Cross-unit resolutions

Applied:
- **CS-BIN-10 (processes F05).** The 10 net10.0-only extractor overloads (8 `ZipFile.ExtractToDirectoryAsync`, 2 `ZipFileExtensions`) appended from the reflection diff; `BannedSymbols.txt` now holds all 24. Canary text says the Bad variant calls a net10.0 overload behind `#if NET10_0_OR_GREATER`. The integration log's "CS-BIN-10/11 (14 and 12 overloads)" is now 24 and 12.
- **CS-ERR-08 (processes F15).** Launch failures use `<tool> could not be started: <reason>. <hint>`; the `NotFound` message may list skipped PATH directories as `dir: reason` (the one environment value a message carries). `Excerpt` joins the opt-in bounded properties.
- **CS-PROC-10 (processes F16).** No output-limit leaf: stdout overflow is `OcxDecodeException` on exit 0 or an accepted code, and the unaccepted non-zero exit keeps `OcxCommandException` (CS-ERR-04, CS-JSON-20).
- **CS-PROC-11 (processes F17).** The cp437 test drives the `emit` verb of CS-TEST-02 (retargeted; CS-TEST-04 untouched).
- **CS-XP-10 (processes F24).** Signature is `(host, arch) -> target triple`; CS-BIN-04 stays the table owner.
- **CS-TEST-12 snippet (async F23).** Comments relabelled `# CS-TEST-12`.
- **CS-PROC-14 (async F24).** The reap `CancellationToken.None` carries a same-line `//` reason (CS-ASYNC-02).
- **Index routing (async F25, PP-20, language F17).** Async row adds `TaskCompletionSource`, async iterator, thread-safety claim, stderr pump, line splitter, inline callback; platform row adds delay/timeout/retry, working directory, splitting child output; language row adds `Span` parameter, `unsafe`, preview `LangVersion`, `NET11_0_OR_GREATER` region.
- **Baseline policy (api-errors F15 = build F05).** CS-PKG-09 decides: unset until the first release is on the feed, then the last published version from the second release on (0.y.z included), in the commit after each release. CS-API-12 cites CS-PKG-09.
- **Acquisition leaf (api-errors F18).** A library that ships the download path adds exactly one acquisition leaf (example `OcxAcquireException`, a `Reason` per failure), which is CS-ERR-01's written decision; ADR Q16 already named it. CS-BIN-20 throws it instead of `ChecksumMismatchException`.
- **CS-API-03 (api-errors F21), recorded here.** The consolidation's `// extension point: <reason>` comment became `[SuppressMessage("Design", "MA0053", Justification = "extension point: ...")]`, because a comment cannot suppress an error-level MA0053.
- **CS-ERR-04 (json F14, F15).** 04a exempts the CS-JSON-07 converter file (`xargs -r grep -L 'class TaggedUnionConverter'`), matching G9; watched green on the json green tree, green with a converter calling `JsonSerializer.Deserialize`, red with a second decode file. Excerpt wording settled in both files: stdout never in `Message`, `Excerpt` is the bounded opt-in property (CS-ERR-08), and CS-JSON-09 cites it.
- **CS-XP-11 (PP-10).** `Task.WaitAsync(TimeSpan[, CancellationToken])` on both task types and `PeriodicTimer(TimeSpan)` banned in `BannedSymbols.Src.txt`; `Timer` and `Stopwatch.GetTimestamp` named as review items. Watched: Bad exit 1 with 5 RS0030 sites on net8.0 and net10.0, Good (provider overloads) exit 0.
- **CA1515 (TEST-F02).** `analyzers.editorconfig` carries the eighth ID and says "eight"; posture-check watched green on the installed set and red with the line deleted.
- **TEST-F13.** Already renamed by the api-errors fixer; no `tests/FakeCliTests` left in rules, skills, docs or the taskfile.
- **CS-LANG-10 (language F1).** `AllowUnsafeBlocks` allowed only in the CS-PROC-18 project; L10c's cell accepts exactly that project. CS-PROC-18 names `AllowUnsafeBlocks` (SYSLIB1062) and `DefaultDllImportSearchPaths` (CA5392). CS-SEC-05 exempts the same import.
- **CS-LANG-25 (language F10).** Retired, not reused; L25 deleted; CS-PERF-03 no longer cites it.
- **CS-PERF-04/06 (language F12).** Span parameters on internal methods only; `stackalloc` in synchronous internal helpers (CS-LANG-10).
- **CS-SEC-06 (security-obs F1).** RS0030 leaves the no-pragma list and the `SEC` regex; RS0030 is suppressed only by the reasoned call-line pragma the ban header names (CS-ASYNC-14's form). RS0031 stays.
- **CS-SEC-02 canary (security-obs F4).** Full command `dotnet build canary/canary.csproj -p:Variant=Bad -p:TreatWarningsAsErrors=false --no-incremental ...`, the CS-BIN-10 canary, whose Bad variant now also calls one symbol per security group.
- **CS-SEC-04 (security-obs F5).** 41 dynamic-loading lines added from reflection (string-named `Activator`/`AppDomain` instantiation, `Assembly.Load*`, `Assembly.GetType`, `AppDomain.Load`/`ExecuteAssembly*`, `AssemblyLoadContext.LoadFrom*`); 48 in all.
- **CS-SEC-03 (security-obs F6).** 9 Regex lines added (static `Count` x4, `EnumerateSplits` x2, `MatchEvaluator` `Replace` x2, culture `GeneratedRegex`); 27 in all. Security section 40 to 90 lines. Watched: Bad exit 1 with 19 RS0030 sites on net8.0 and 20 on net10.0 (`EnumerateSplits`), Good twin exit 0 on both.
- **CS-SEC-08 (security-obs F24).** Raised to MUST, so CS-BIN-07/20 route through a MUST.
- **CS-BUILD-29 (build F04).** The false "a `.slnx` pack writes no nupkg" rationale replaced by "a solution pack packs every packable project; naming the project gives one nupkg per run". The phase-7 integration log bullet "Root `dotnet pack` writes no nupkg on a `.slnx`" is superseded.
- **CS-BUILD-20 (build F17).** Shape and the `global-json` jq require `test.runner` = `Microsoft.Testing.Platform`; jq watched green 0, red 1.
- **DN-RULE-02 / CS-BUILD-30 (quality-index F-03, release F12).** The tl-flags awk already requires `--disable-build-servers` only on restore, build and publish; DN-RULE-02 now says "CS-BUILD-30 cites this row". The second tl-flags grep is kept: it covers `msbuild`, `format`, `tool` and `package`, which dn-rule-02 does not. The release workflow's pack line passes.
- **Gate block (quality-index F-17).** The SDK grep and both nuspec tests print `gate: ...` on failure; one prose line names jq, unzip, xmllint and GNU `timeout`. Byte-identical in both indexes. Watched: green exit 0, red-nuspec exit 1 with its message, red-sdk exit 1 with its message.
- **test-greps.sh (quality-index F-22).** Deleted; the index and `docs/csharp-quality.md` name two scripts. The index line for `check-ci-matrix.sh` names the `CONTRACT_VAR` prefix that arms R10.
- **CS-BUILD-05, CS-BUILD-11 (upgrade UPG-07, UPG-08).** CS-BUILD-05 is a `git grep -nP` over every tracked `.cs` with a `NETCOREAPP` alternative (two `-e`, no pipe in the cell); upg-05 and upg-06 use `git grep`; CS-BUILD-11 and upg-01 allow leading whitespace. Watched red (planted `test/T.cs` and `#elif NETCOREAPP3_1`) and green.
- **DN-RULE-08 (diagnose F2).** One perl pattern in the index block and hang-capture step 2: a background `&amp;` anywhere in an `Exec` `Command`, multi-line included, unless both streams are redirected. Watched red 5 (trailing, trailing space, mid-command, stdout-only, multi-line), green 0 (`&amp;&amp;`, full redirect, `&amp;&gt;`, a non-Exec attribute).
- **build-server shutdown (diagnose F4).** Step 3 and DN-RULE-10 say shutdown is host-wide and goes to the owner when another job's servers run.
- **NU1510 (diagnose F5).** DN-DIAG-12, CS-BUILD-28 and DN-UPG-06 say: delete the reference; only a net8.0 leg that needs a version above the in-box one keeps it, conditioned `'$(TargetFramework)' == 'net8.0'`. The `!IsTargetFrameworkCompatible` form is gone.
- **Descriptions (diagnose F13).** dotnet-diagnose now says "with no SDK or target-framework migration in progress", IL2026/IL3050 "outside a release run", and routes post-change failures to dotnet-upgrade.
- **DN-REL-04 (release F5).** Reworded: the shipped posture does not ban `Assembly.Location`; an app repo adds the line, and IL3000 flags it under `PublishSingleFile`.
- **OCX_NO_COMPLETION (adr-docs F6).** CS-PROC-06, ADR D6 (with a rename note) and the process consolidation's list and code use the live name.
- **Stale log bullet (adr-docs F10).** Deleted.
- **ADR labels (adr-docs F16).** ADR decisions are `ADR-D1..ADR-D13`; the Links line reads "library release steps (dotnet-release R1 to R14)". The index owner defaults keep `D1..D21`.
- **Fixer follow-ups.** CS-SEC-10 names `Directory.Packages.analyzers.props` like CS-PKG-06; dotnet-diagnose's never-silence row 2 carries DN-RULE-04's `Exec` exception; `docs/dotnet-diagnose.md` says to install the bundle; doc counts updated to 255 depth rows (219 MUST, 1 MUST from 1.0, 32 SHOULD, 3 CONSIDER) and 61 DN-DIAG rows (five retired); ruff reformatted the `eng/triangulate.py` block in `binaries.md` (compiles; logic unchanged).

Refused or deferred:
- **CS-BUILD-22 and CS-BUILD-08 (build F19), refused.** DN-DIAG-05 cites CS-BUILD-22 for the `dnx` symptom, and DN-UPG-11 and dotnet-upgrade S5 cite CS-BUILD-08; folding them would orphan live skill citations for a two-row saving.
- **code-docs-essentials stale "C# and Swift" text (adr-docs F15), deferred.** It edits another set's published package (code-docs-essentials 0.1.1); it needs its own version-bumped commit, not this set's.

### Gates (2026-10-11)

| Gate | Exit |
|---|---|
| `check-artifacts.py` with the N-1 flags | 0, `clean` (first run: 3 findings, all from this pass's edits, fixed) |
| N-1 leak grep over shipped dirs | 1, no output (pass) |
| `task ci CSHARP_CONSUMER=<testfx>` | 0 (first run 201: ruff wanted the `binaries.md` python block reformatted) |
| `ruff format --check .` | 0 |
| `grim publish --dry-run` | 0, six dotnet artifacts listed, no warnings |
| ID scan: every CS/DN ID defined once, every cited ID defined | 0 duplicates, 0 undefined outside retired lines |
| Ban union `uniq -d` | empty |
| posture-check on the installed set / CA1515 deleted | 0 / 1 |
| Gate block on green / red-nuspec / red-sdk | 0 / 1 / 1 |


## Held-out round 1 (2026-10-11)

### Trees

| Tree | SHA |
|---|---|
| JamesNK/Newtonsoft.Json | 52fa3aef1f2c |
| devlooped/moq | 4a97e0718a69 |
| bchavez/Bogus | 6ece18c5c226 |
| scriban/scriban | b916a431461e |
| jstedfast/MailKit | c896b7d7f8fc |
| dotnet/docker-tools | ef7fe4504066 |

None of the six is a reference-consumer shape (greenfield net8/net10 library wrapping a CLI). Two are apps or app-heavy (docker-tools, scriban tools), four ship legacy TFMs, all six run VSTest, three build outside GitHub Actions.

### Cells run

Every Verification cell and fenced block in the 13 csharp-quality files, `dotnet-build.md` and `packaging.md`, the shipped checks (`check-ci-matrix.sh`, `weaken-check.sh`, `posture-check.sh`, `check-table-diff.sh`, `eng/triangulate.py`), the posture install (`BannedSymbols*.txt`, `analyzers.globalconfig`, `analyzers.editorconfig`, `Directory.Packages.analyzers.props`) built on scriban and docker-tools, and the three skills run end to end (dotnet-upgrade and dotnet-release on Bogus, release app modes on scriban, dotnet-diagnose on organic and planted breakage across all six). Run verbatim from each tree root, then retargeted to the tree's real layout; plants added for sibling shapes. Spot-checked by the classifier: MailKit `main.yml` test step plus `outcome == 'failure'` gate, docker-tools `DockerHelper.cs:83` `WriteLine(Password)`, Newtonsoft eight-TFM list.

### Failures by class (165)

| Class | Count | Notes |
|---|---|---|
| Dead or false-negative pattern | 56 | Two sub-mechanisms carry most: `\(` with no `\s*` (MailKit `Name (args)` style defeats async, perf, platform, obs cells), and hard-coded `src`/`tests`/`origin/main`/root operands that exit 2 with empty stdout, read as pass. |
| Broken step or placeholder | 25 | No solution operand (MSB1003/MSB1011 on 4 of 6), `--minimum-expected-tests` on VSTest, root-anchored `global.json`, literal `10.0`, `./Acme.App --version`. |
| No sanctioned form for a legitimate use (NEW) | 20 | See below. |
| Reference-consumer scope stated as universal (NEW) | 12 | See below. |
| Contradiction between owning rows | 12 | LANG-05 vs LANG-19 `?? throw`; ASYNC-20 cell vs ASYNC-08; TEST-17 vs TEST-27; R1 vs R3; CS-BUILD-20 vs DN-UPG-01; SEC-09 gate vs BUILD-06; release step 3 vs CS-BUILD-16 gate. |
| Unenforced claim / gap | 10 | PROC-02 positive requirements, BIN-21 empty manifest, ASYNC-01 no-token members, ERR-16 supersedes edits, release package-validation on/off. |
| Redundant row or script | 10 | Mostly-noise candidate cells (ERR B05/B06, G9, SEC/OBS greps, API-20, PROC-22b). |
| Unfaithful claim | 9 | LANG-11 (`field` local compiles clean on C# 14), PERF-01 quiet range, PKG-06 MinVer/CPM, diagnose `--nologo` claim, release untracked-sources cause. |
| Organic failure outside a plant-built catalogue (NEW) | 6 | See below. |
| Unbounded side effect of a prescribed command (NEW) | 3 | See below. |
| Undocumented fidelity change | 1 | CS-ERR-09 faults the Task for usage errors against TAP/BCL convention and does not say it is deliberate. |
| Routing gap | 1 | No analyzer/generator row; index loads on `**/*.cs` only, so workflow, `.ps1`, `.editorconfig` edits load nothing; processes row never names `Process`. |

Sweep labels corrected: 15 findings filed as "Redundant row or script" are rule-text defects (exception or scope), not noise, and move to the two new classes; LANG-11 moves to Unfaithful claim; the five diagnose coverage misses and the three temp-dir leaks get their own classes.

### New classes

| Class | Mechanism | Count | Check that catches it | Files hit |
|---|---|---|---|---|
| Reference-consumer scope stated as universal | A rule written and verified against the reference consumer (greenfield net8/net10 library that wraps a CLI, binds with System.Text.Json, runs MTP on GitHub Actions) binds every repo its glob loads in, with no applicability statement. On an app, a VSTest repo, a legacy-TFM library or a serializer library it demands what does not apply. Phase 8 reviewed against the reference consumer only, so it could not see this. | 12 (PROC-12; LANG-18; legacy TFMs in PERF/XP/TEST; PERF-09 benchmarks; TEST-08/09/10/27 incumbents; SEC-04/05; OBS-02/07/12; BUILD-01..PKG-06 misfit; analyzer-posture adoption; MTP-only index rules; Non-Negotiables; upgrade sibling Exe projects) | For each MUST and Non-Negotiable, write its applicability (always, STJ, launches a CLI, packable library, MTP, GitHub Actions, greenfield). Run its cell on one held-out tree outside that applicability: every hit there must be silenced by the tag or be a real defect. | processes.md, language.md, performance.md, platform-and-paths.md, testing.md, security.md, observability.md, dotnet-build.md, Directory.Packages.analyzers.props, csharp-quality.md, dotnet-upgrade |
| No sanctioned form for a legitimate use | A MUST or ban has no exception route, yet well-run code inside its scope breaks it on purpose for a reason the row never names: a protocol-mandated MD5/SHA1, a seeded RNG that is the product, `protected virtual Dispose(bool)` on an abstract public base, `is null` inside an expression tree (CS8122), `continue-on-error` plus an `outcome` gate step, committed generator output, a `#nullable disable` migration, an isolating `Directory.Build.props`, a user-supplied regex with a timeout, `IHttpClientFactory`. | 20 | For every MUST hit on a held-out well-run tree, read the site. If the maintainer did it on purpose (comment, design, compile constraint), the row must name the sanctioned form and its cell must pass that form. | processes.md, binaries.md, async.md, language.md, performance.md, platform-and-paths.md, testing.md, security.md, observability.md, analyzers.editorconfig, csharp-quality.md, check-ci-matrix.sh |
| Organic failure outside a plant-built catalogue | Catalogue rows came from planted breakage. Failures that come from the host or the checkout (OpenSSL SHA1 policy breaking strong-name signing, SourceLink on `repositoryformatversion=1`, uninitialised submodule MSB3202, a missing shared runtime, a VSTest zero-match filter, a transient MSB4018) have no row, and the step-3 fallback ("the Learn page for the code") is unusable on a code-less error. | 6 | Run the triage capture verbatim on six fresh held-out clones in a stock environment (blob-less clone, distro crypto policy, default SDK set, submodules not initialised). Route every failure; each must land on a row or on a fallback that names an action, code-less errors included. | dotnet-diagnose SKILL.md, catalogue.md |
| Unbounded side effect of a prescribed command | A block writes a large state directory (`NUGET_PACKAGES=$(mktemp -d)`, `--packages $(mktemp -d)`) and never removes it. One run is fine; "run after every change" fills a tmpfs (6.1 GB over five gate runs, ENOSPC), and the resulting code-less NuGet error then hides behind the code-only log filter. | 3 (index Gate, DN-UPG-04, DN-DIAG step 5) | Run each fenced block twice with `TMPDIR` on a small quota directory and compare `du` before and after; any growth beyond the log needs a `trap ... EXIT` cleanup and a stated per-run size. | csharp-quality.md, dotnet-build.md, dotnet-upgrade SKILL.md, dotnet-diagnose SKILL.md |

### New MUST

None. Every finding corrects, scopes or excepts an existing row; no sweep proposed a missing rule, and the classifier found none an agent would get wrong that is not already a row.

### Verdict

Not converged: four new classes. Fix wave in 11 file-disjoint groups (processes; binaries; language; async; api-design+errors+json; performance+platform+testing+check-ci-matrix.sh; security+observability; index+dotnet-build+checks+docs; dotnet-upgrade; dotnet-diagnose; dotnet-release), with eight shared decisions fixed before the wave so no two groups write opposite halves (operand variables and fail-on-missing-operand, `\s*\(`, applicability tag set, generated-output path section, nullable migration clause, ban-file moves, MTP/VSTest wording, `continue-on-error` gate exception). Round 2 runs the four new checks first, on a fresh held-out set that includes at least one app and one legacy-TFM library.

## Held-out round 2 (2026-10-11)

### Trees

| Tree | SHA |
|---|---|
| reactiveui/refit | 970bf3e9595c |
| Cysharp/UniTask | a77a1b4a8982 |
| nsubstitute/NSubstitute | f2b623d762fc |
| Azure/bicep | 5c15624d19a7 |
| ardalis/GuardClauses | f96b823e4228 |

Round 1's selection requirement held: one app-heavy tree (bicep: compiler, language server, VS extension, and Bicep.RpcClient, the only near-reference-consumer shape in either round), four legacy-TFM libraries (netstandard2.0/2.1, net462..net481), three test frameworks under MTP (TUnit, MSTest, NUnit) plus one VSTest xUnit v2 incumbent, one Unity-shared source tree.

### Cells run

Every Verification cell and fenced block in the 13 csharp-quality files, `dotnet-build.md`, `packaging.md`, the shipped checks (`check-ci-matrix.sh`, `weaken-check.sh`, `posture-check.sh`), the posture install built on GuardClauses and NSubstitute, the index Gate end to end on all five, and the three skills end to end (dotnet-upgrade on UniTask, dotnet-diagnose organic and planted on all five, dotnet-release library path on NSubstitute and app modes on bicep and refit's AOT smoke). Round 1's four new-class checks ran first. Verbatim from each tree root, then retargeted; plants added for BOM, CRLF, `.proj`, background `Exec`, removed TFM in a named property. Spot-checked by the classifier: the new-class claim reproduced on GuardClauses (restore `--packages $p`, `rm -rf $p`, `build --no-restore` exits 1 with NETSDK1064).

### Failures by class (189)

| Class | Count | Notes |
|---|---|---|
| No sanctioned form for a legitimate use | 46 | Largest class again. Round 1's check ran but its fixes only named the cases round 1 saw. New legitimate shapes: job object for parent-death, P/Invoke `CreateProcess` arm64 launch, JSON-RPC write gate, protocol-public OCI digest string compare, BCL/third-party fixed signatures (`override`, `ConnectCallback`, OmniSharp `Handle`), pool-returning and unobserved-exception finalizers, `.Forget()` and Unity `async void`, NonBacktracking regex, `#if !NET7_0_OR_GREATER` fallback, lock file `OpenOrCreate`, embedded PDB, `--ignore-exit-code 8` on a filter fan-out, bot baseline-update job, test `NoWarn IL2xxx`, public-API `#nullable disable annotations`, reflection `!` on API contracts, STJ serializer-adapter library. |
| Dead or false-negative pattern | 38 | Three repeat sub-mechanisms: (a) round 1's operand fix shipped as `for d in $SRC; do [ -d "$d" ]...` which is vacuous on unset SRC, so `rg ... $SRC` reads stdin or cwd (processes, async, language default `${SRC:-src}`); (b) hard-coded example operands left in cells round 1 did not reach (`src/Bootstrap`, `ocx-pins.json`, `$S/Ocx.Sdk`, `src/Lib/Lib.csproj`, `.github/dependabot.yml`); (c) one syntactic shape per effect (`Convert.ToHexString` only, `StandardInput.Write*` only, `new HttpClient(` only, explicit `<T>` only, `switch (x.ToLowerInvariant())` missed, `*.proj` unscanned, BOM before a first-line directive, CRLF workflow). |
| Reference-consumer scope stated as universal | 35 | Round 1 added the tag set to the index but did not tag the rows: async.md has no tags, testing.md tags 4 rows, binaries.md 0, check-ci-matrix.sh binds the ocx CI shape on every repo. Legacy TFM again (netstandard2.0 lacks `ArgumentList`, `Kill(true)`, `WaitForExitAsync`, `SetUnixFileMode`, `DiagnosticId`), apps (TimeProvider, TWAE), multiple seams per repo, Unity. |
| Broken step or placeholder | 20 | Gate pack tail and dotnet-build cells still carry `src/Lib/Lib.csproj`; `BASE` from `origin/HEAD`; receipt without the tag; `cat $PROPS` with empty PROPS; zsh `no matches found`; checksum on a directory. |
| Organic failure outside a plant-built catalogue | 14 | Repeats round 1's host causes (SHA1 strong-name, missing runtime) and adds blob-less NBGV MSB4018, `-v:q` hiding linker stderr, NETSDK1243, MTP exit 150, GeneratePackageOnBuild NU5026, System.Linq.Async collision, baseline flake, config above repo root. |
| Contradiction between owning rows | 10 | Tag name `[launches a CLI]` vs `[cli-wrapper]`; test-exclusion glob narrow vs wide; LANG-23 vs TEST-22 snapshots; ERR-01 five leaves vs sixth acquisition leaf; R9 vs TEST-09/10 incumbent; BUILD-03 net472 leg vs BUILD-16 Linux gate; Gate `g()` sort vs DN-RULE-03 first diagnostic. |
| Redundant row or script | 9 | Substring `token`, `FileName`, LINQ-in-loop, tl-flags on hosted CI, DN-RULE-01/10 on repo scripts, weaken-check `#nullable restore`. |
| Unenforced claim / gap | 6 | Negative-only cells pass a download with no verification at all (BIN-07/20, SEC-08), no positive kill/timeout cell, `IPath.Combine` unbanned, pragma restore pairing. |
| Unfaithful claim | 5 | Grow-swap order (Rent, copy, Return), Trace "bypasses every listener", weaken-check header, DN-RULE-07 bridge mode, DIAG-63 lifetime. |
| Routing gap | 3 | Round 1's routing pointer lives in a file that does not load on workflow/script edits; HttpClient/`AddX(IServiceCollection)`, P/Invoke, expression tree absent from routing words; `*.proj`, `*.nuspec`, `PublicAPI/<tfm>/PublicAPI.txt` unglobbed. |
| Unbounded side effect of a prescribed command | 2 | Gate's stated 0.5-1.3 GB is 0.2-3.5 GB; release step 3/7/11 temp dirs never removed. |
| Prescribed cleanup breaks a later prescribed command (NEW) | 1 | See below. |

Sweep labels corrected: the release CS-PKG-11 `NUGET_USER` item is the packaging dead-pattern finding seen twice (one fix, packaging.md); the release CS-SEC-10 item duplicates the security SEC-09/10 scope finding (one fix, security.md). Ten findings are defects in round 1's own fixes (vacuous operand loop, untagged rows, routing pointer placement, trap-cleanup state); the fix wave must run each fixed cell red and green on a held-out tree, not only re-read it.

### New classes

| Class | Mechanism | Count | Check that catches it | Files hit |
|---|---|---|---|---|
| Prescribed cleanup breaks a later prescribed command | A block cleans up after itself correctly (round 1's `trap ... rm -rf "$NUGET_PACKAGES"`, DN-RULE-05's `rm -rf $p`), but the command it ran left tree state that points at what it removed: `obj/project.assets.json` names the deleted packages folder. Every later `--no-restore` or `--no-build` command, the agent's next build, or the IDE then fails (NETSDK1064) or misreports (`No test projects were found`). Each block passes alone; the failure exists only in sequence. The round-1 check for side effects (du before and after) cannot see it, and its prescribed fix (a trap) causes it. | 1 (Gate + DN-RULE-05 + DN-RULE-07 ordering; same latent shape in dotnet-release step 3 and dotnet-diagnose step 5) | Run the documented blocks in their stated order on one tree, then a plain `dotnet build "$SLN" --no-restore` and `dotnet test --no-build`; each must behave as after a normal restore. For every block that redirects or deletes state another command reads (packages folder, `obj/`, `global.json`, git config), require it to restore that state before returning or to work in a disposable copy (`git worktree add`). | csharp-quality.md, dotnet-release SKILL.md, dotnet-diagnose SKILL.md |

### New MUST

None. Every finding corrects, scopes, excepts or routes an existing row. Two near-misses checked and rejected: `SuppressTrimAnalysisWarnings=true` (an agent does set it, but it belongs on the existing CS-CORE-01 weakening list and DN-REL-03, not a new rule) and `GeneratePackageOnBuild` (a loud failure, a diagnose row, not a silent-trap MUST).

### Verdict

Not converged: one new class (cross-command state). The 188 others are instances of known classes; the volume in No sanctioned form, Dead pattern and Reference scope says round 1's fixes were too narrow, not that the classes are wrong. Fix wave in 11 file-disjoint groups (processes; binaries; async; language; errors+api-design+json; performance+platform+testing+check-ci-matrix.sh; security+observability; index+weaken-check+dotnet-build+packaging+build checks; dotnet-upgrade; dotnet-diagnose; dotnet-release), with these shared decisions fixed before the wave:

1. Operands: every cell starts `: "${SRC:?MISSING SRC}"` (and TESTS, SLN, PRJ, CIF, REL, PACK as used); no defaults, no `for d in $SRC` loop. PRJ, PACK, CIF, REL join the index Conventions.
2. Test exclusion: one glob, defined once in the index, keyed on test-project path segments (`tests?`, `*.Tests?`, `*Tests`, `*TestFixtures`, `*TestServices`), not the substring `*[Tt]est*`, so a shipped `Foo.Testing` package and `Latest/` stay in scope. Every family file copies it verbatim.
3. Tags: the index set gains `[downloads-binary]` and `[library]` (vs app). Every row is tagged or deliberately untagged; a legacy-TFM clause in the index says a row that needs an API missing on the project's lowest TFM binds `[greenfield]` only and the row names the fallback.
4. Snapshot paths: `*.verified.*`, `*.received.*`, `_snapshots/` are tool output for LANG-23, TEST-13, weaken-check and XP cells alike.
5. Cross-file sanctioned forms, worded once: NonBacktracking regex (PERF-03 = SEC-03); public protocol digest string compare (BIN-07 = SEC-08); Win32 P/Invoke in a platform project and job object for parent-death (PROC-14 = SEC-05); `--ignore-exit-code 8` on a filter fan-out with a solution-level count (TEST-11 = DN-RULE-07); `continue-on-error` on a manually dispatched regenerate-and-commit job (R13 = CS-CORE-01); public-API `#nullable disable annotations` with a reason (LANG-01 = index Conventions); test-project `NoWarn` limited to IL/trim IDs (TEST-12 = DN-RULE-04).
6. New-class fix: the Gate trap and the DN-RULE-05 cell re-run a plain `dotnet restore "$SLN"` after removing the temp folder (or run the proof in a disposable worktree); release step 3 and diagnose step 5 follow the same form.

Round 3 runs the five new-class checks first (round 1's four plus cross-command state), then every fixed cell red and green, on a fresh held-out set.

## Held-out round 3 (2026-10-11)

### Trees

| Tree | SHA |
|---|---|
| xoofx/markdig | 56e9c238584a |
| JoshClose/CsvHelper | 33970e518338 |
| natemcmaster/CommandLineUtils | 00c331e7359c |
| ThreeMammals/Ocelot | 863c0d89d597 |

All four are well-run libraries outside the reference-consumer shape. Two ship legacy TFMs down to net462/net472 (CsvHelper, CommandLineUtils), one is an ASP.NET Core gateway packed as a library (Ocelot, net8/9/10, mixed MTP/VSTest solution), one is a span-heavy parser with BCL polyfills (markdig). CommandLineUtils is the only tree that launches a child process (a pager), and none wraps a JSON CLI. All four are 1-commit blob-less clones, so they also exercise the shallow-history and SourceLink host paths.

### Cells run

Round 2's five new-class checks ran first (scope, sanctioned form, organic host failures, side-effect growth, cross-command state). Then every Verification cell and fenced block in the 13 csharp-quality files, `dotnet-build.md`, `packaging.md`, the shipped checks (`check-ci-matrix.sh`, `weaken-check.sh`, `posture-check.sh`, `eng/triangulate.py` from binaries.md), the posture install (`BannedSymbols*.txt`, `analyzers.globalconfig`) built on CommandLineUtils, markdig and Ocelot, the index Gate end to end on all four, and the three skills end to end (dotnet-upgrade on CsvHelper, dotnet-diagnose organic and planted on all four, dotnet-release library path on CommandLineUtils). Verbatim from each tree root, then retargeted; plants for generic methods, null-conditional log calls, wrapped `Type.GetType(`, CRLF config, untracked new files, absolute operands under a `tests/` ancestor, zsh. Spot-checked by the classifier: processes.md:43 still carries the substring glob `!**/*[Tt]est*/**` that round 2 decision 2 retired; binaries.md quotes `"${SRC:?...}"` 13 times while processes.md uses `$SRC` unquoted; `BannedSymbols.txt:203` messages SecureString as `CS-PROC-08`; api-design.md CS-API-15 prescribes `dotnet nuget locals global-packages --clear`.

### Failures by class (175)

| Class | Count | Notes |
|---|---|---|
| Dead or false-negative pattern | 48 | Same three sub-mechanisms as round 2: one syntactic shape per effect (generic `Name<T>(`, interface members, `?.Log`, wrapped calls, lambda projections, per-file instead of per-site seam members, VSTest `Failed ` capital F), vacuous success on missing input (absolute SRC under a `tests/` ancestor excludes every file, no merge base on a shallow clone, nested `Directory.Build.targets` shadows the wired root one, untracked new `.cs` skipped by the format step, CRLF `none\r`), and hard-coded names (`README.md`, `OcxExitCode`, example IVT names, `net8.0;net10.0` order, `tr-TR` as the pass token). |
| No sanctioned form for a legitimate use | 34 | Largest rule-text class again: interactive pager child, CLI framework owning Ctrl+C and the console, ASP.NET-only ConfigureAwait omission, `async` lambda to an Action-only API, shipped `params` overload, project-level nullable migration, span-based parse API and polyfill `unsafe`, idempotent `field ??=`, unsealed shipped surface, operator-opt-in CA5359, logging facade, caller-chosen culture, spec-defined linguistic comparer, app-wide regex timeout, early-return stackalloc guard, zero-byte-read rent, xUnit v2, lightweight-tag repos, CI tightening `-warnaserror:CS1591`. |
| Reference-consumer scope stated as universal | 21 | Untagged rows still binding the reference shape: `[cli-wrapper]` defined as any child launch, ASYNC-08 TimeProvider/CS-ERR leaf, API-04/05 on every public type, ERR-07 `[Serializable]` on legacy TFMs, A0/E0/G0 with no applicability probe, CS-CI-07 `OCX_SDK_CONTRACT`, OBS-08 on middleware libraries, upgrade ladder presuming the posture. |
| Contradiction between owning rows | 18 | Test-exclusion glob in three spellings (round 2 decision 2 not applied to processes.md); SRC list vs single directory; SecureString owned by SEC-05/H17 but messaged PROC-08 (seen twice); legacy fallbacks the rows mandate are RS0030 errors; ASYNC-02 flags ASYNC-01's `= default(CancellationToken)`; LANG-03 L03c vs form (b); ERR 04a vs JSON G9; BUILD-25 vs 27 lock-hash cache; DN-RULE-07 exit table vs mixed-runner exit 1; CS-BUILD-01 `$(Prop)` TFM list vs upgrade greps; release clean-tree check vs its own logs. |
| Broken step or placeholder | 13 | zsh `$R[^{;]` / `$t[|)]` subscript parse aborts two api-design cells and upg-00 silently; `--solution` on a csproj; hard-coded `obj/project.assets.json`, `artifacts/coverage`, `net10.0`, `global.json`; L09b discards output; Gate has unstated jq/bash 4/timeout dependencies. |
| Organic failure outside a plant-built catalogue | 12 | Repeats: SHA1 strong-name, blob-less SourceLink, missing runtime, GeneratePackageOnBuild NU5026, ancestor `.globalconfig`. New strings for known causes: `Could not find 'mono' host`, `Test Run Aborted`, `supported on Windows only`, MTP mixed-runner refusal, `global.json file: Not found`, a sibling that never built. |
| Redundant row or script | 9 | `lock(this)` matches `Block(this)`, L03b inside strings, API-16 comment hits, JSON G14/G17, OBS-11 on samples, DN-RULE-10 on all scripts, posture bans (ReadToEnd, IDISP001, IDE0055 on CRLF). |
| Unenforced claim / gap | 8 | triangulate.py never compares pin digests or version; C08 forbidden filter unchecked; JSON-22 only `OcxExitCode`; R12 any cache; UPG-03 hazard review has no command; DIAG-49 zero count vacuous on a pre-suppressed tree. |
| Unfaithful claim | 4 | H18 says CA5359 is silent on lambda forms (fires on 3 of 5); DN-DIAG-75 `root = true` does not stop a parent `.globalconfig`; empty `--packages` does not defeat the http-cache; `dotnet tool update` rewrites other entries. |
| Prescribed cleanup breaks a later prescribed command | 3 | upg-04 temp packages folder without the round-2 restore; release `COLD` not shared across blocks; CS-API-15 `nuget locals global-packages --clear` (CS0006 on the next `--no-restore` build, and it empties the machine-wide cache, not a scratch one). |
| Routing gap | 2 | `.cake`, `.bat`, `.csx`, `azure-pipelines*.yml`, `appveyor.yml`, `.azuredevops/`, `.github/actions/**` load no rule. |
| Stale reference, count or era | 2 | Empty-packages size; release host-gap tells for SDK 10.0.401 VSTest. |
| Unbounded side effect of a prescribed command | 1 | Cell logs written into the repository root become committable files. |

Duplicates inside the 175: SecureString ownership (BannedSymbols.txt and security.md), R13 coverage upload (testing.md and check-ci-matrix.sh), and the mixed-runner exit 1 (index Gate, DN-RULE-07, diagnose catalogue) are one fix each. About 15 findings are round-2 fixes that did not land or landed narrow (processes glob, untagged async rows, upg-04 restore, release temp state, operand vacuity in A0/E0/G0).

CS-API-15 `--clear` was weighed as a candidate new class (a command whose scope is machine-global). Round 2's cross-command check (run the blocks in order, then `build --no-restore`) reproduces it as CS0006, and that class's remedy (scratch folder or disposable copy) is the fix, so it is an instance. Its fix is still the most urgent of the round: delete the command.

### New classes

None. Every failure matched a known mechanism and was caught by that class's check.

### New MUST

None. Every finding corrects, scopes, excepts or routes an existing row. Checked and rejected: "never run a machine-global cache clear" (the fix is deleting the one command and the existing scratch-`NUGET_PACKAGES` rule covers it); undisposed linked `CancellationTokenSource` and an `async` lambda with no catch handed to `OnChange` (already ASYNC-11 and ASYNC-16, only their cells miss them).

### Verdict

Converged on classes: no new class and no new MUST in a clean held-out round on four fresh trees. The 175 instances still need one fix wave in 12 file-disjoint groups (processes; binaries; async; language; api-design+errors+json; performance+platform-and-paths+testing+check-ci-matrix.sh; security+observability; index+weaken-check; dotnet-build+packaging+BannedSymbols.txt; dotnet-upgrade; dotnet-diagnose; dotnet-release). Shared decisions fixed before the wave:

1. Operands: SRC and TESTS are space-separated lists of repo-relative directories, used unquoted after `: "${SRC:?MISSING SRC}"`. An absolute operand prints `MISSING repo-relative SRC`. Every family's first cell prints `MISSING scanned zero files` when the scope lists no `.cs` file. binaries.md drops its quoted single-directory form.
2. Test exclusion: one glob array defined once in the index Conventions, plus the TESTS directories, interpolated by every family (no retyped glob). processes.md's substring glob goes.
3. Tags: `[cli-wrapper]` means a library whose purpose is wrapping one tool. A new `[launches-process]` binds only PROC-01, 09, 11, 12, 14. `[json-cli]` binds PROC-07, PROC-19 to 22 and the BIN-26 pin sentences. Index and family headers use the same definitions. async.md, errors.md and api-design.md tag ASYNC-08's clock sentence, ERR-07's `[Serializable]` clause, ERR-12..17, API-04 and API-05.
4. Applicability: every family block starts with a probe that prints `N/A: <reason>` on stdout and exits 0 when its tag does not apply. MISSING lines go to stdout, so an empty stdout is a pass only when the family applies.
5. Legacy fallback and product-console forms are written once. The fallback line carries `#pragma warning disable RS0030 // <reason>` inside the one seam; the ban file is the greenfield posture. A console product's single Console seam carries one reasoned pragma block (OBS-16 = PROC-17 = the pager clause of PROC-02/09/15).
6. SecureString belongs to CS-SEC-05/H17. BannedSymbols.txt:203 is re-messaged CS-SEC-05, and SEC-05 names the reasoned pragma for a shipped public prompt API.
7. Host-condition strings live in the dotnet-diagnose catalogue: `Could not find 'mono' host`, `Test Run Aborted`, `Running .NET Framework tests is supported on Windows only`, `Unsupported repository version 1`, `You must install or update .NET`, `invalid digest`, the MTP mixed-runner refusal, `global.json file: Not found`. The index DN-RULE-06/07, upgrade S1/S2 and release step 3 cite that row and do not restate it. DN-RULE-07 gains exit 1 = runner mismatch, run per project.
8. State: every prescribed log or output goes under one `L=$(mktemp -d)` outside the work tree, removed by the trap and followed by the round-2 restore. No block mutates machine-global state (`nuget locals --clear`, global tool installs, `git config --global`). The held-out harness copies trees to a root with no posture file above it.
9. zsh: every `$VAR` followed by `[` in a double-quoted pattern is written `${VAR}`, and the index says blocks run under bash 4+.

Round 4 is not a discovery round. It reruns each fixed cell red and green on these four trees plus one fresh tree, and it counts only regressions. A new mechanism found there reopens discovery.
