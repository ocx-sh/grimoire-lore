---
title: "Portable code, and the proof it runs everywhere: paths, culture, platform guards, the fake-ocx harness and the CI matrix"
topic: csharp-crossplatform
model: claude-opus-5-5 (consolidation); sub-artifacts by sonnet
consolidates:
  - csharp-crossplatform/csharp-crossplatform-paths-culture-guards.md
  - csharp-crossplatform/csharp-crossplatform-fake-cli-harness.md
  - csharp-crossplatform/csharp-crossplatform-ci-matrix.md
  - csharp-audit/python-sdk-digest.md (grounding, S5-S8, S12, rows 32/40/43)
  - csharp-audit/ocx-cli-contract.md (grounding, sections 1, 3, 5, 6, 8)
  - cross-checked against the sibling consolidations csharp-process.md, csharp-build.md, csharp-packaging.md, csharp-async.md, csharp-api.md
date: 2026-10-11
targets: "csharp-quality/platform-and-paths.md (CS-XP-*), csharp-quality/testing.md (CS-TEST-*, CS-CI-*)"
fixtures: /home/mherwig/.cache/research-lang/dotnet-tools/fixtures/consolidate-csharp-crossplatform/ (run-all.sh -> evidence.txt)
---

# Portable code, and the proof it runs everywhere

## Verdict

1. **"Windows, Linux and macOS on x64 and arm64" is a property of the CI matrix, not of the TFM.** A linux-x64-only workflow passed a library with wrong PATH splitting, a wrong `.exe` suffix and wrong arm64 detection: 12 of 12 tests were green on both TFMs. The same tests failed on Windows, Alpine and arm64 ([ci-matrix V1-V4](csharp-crossplatform/csharp-crossplatform-ci-matrix.md#15-verified-on-the-toolchain)).
2. **Five native legs gate every PR:** `ubuntu-24.04`, `ubuntu-24.04-arm`, `windows-2025`, `windows-11-arm` and `macos-26`. Each leg runs **all three test tiers**, the contract tier included. Both Linux legs add a musl fake-CLI run as a `docker run` step. One `ci-ok` job is the only required check. osx-x64 (`macos-26-intel`) runs nightly.
3. **The Python SDK's failure is the thing this group prevents.** Its contract tier, the only tier that runs the real ocx and the kill path, ran on `ubuntu-latest` only. It had no arm64 leg, and the Windows branches were `pragma: no cover` ([python-sdk-digest.md:307-308,314](csharp-audit/python-sdk-digest.md)). The C# SDK inverts this: the tiers that spawn processes run on every leg.
4. **The fake-CLI harness is specified once (CS-TEST-01..04).** It is a real `tests/Ocx.Fake` console app launched with `dotnet exec`, with one argv verb per hazard. The csharp-process, csharp-json and csharp-api rows cite it as their verification.
5. **Bind the platform statically where an analyzer can see it, and say so where it cannot.** Paths, culture, clock and platform identity are enforced by a 36-line `BannedSymbols` pair plus CA1304/1305/1307/1309/1310/1311/1416 and Meziantou MA0076 at `error`. The pair was watched red on 24 sites per TFM and green on the twin. Case-only collisions, reserved names, CRLF and the home variable are caught only by running tests on the matrix. Each rule below says which kind of check it has.
6. **Conflicts decided:**
   - **Home directory: env first, then the OS API.** This supersedes CS-BIN-03. That rule's `GetFolderPath`-only form returned the cwd-relative `.ocx` when `$HOME` pointed at a missing directory (watched).
   - **Linux defaults to musl, and nothing probes libc.** CS-BIN-05 wins over ci-matrix rule 9.
   - **No NuGet cache.** CS-BUILD-27 wins over ci-matrix rule 16.
   - **MTP everywhere.** ci-matrix's `--blame-hang-timeout` exits 5 under MTP (watched).
   - **Every timer goes through `TimeProvider`.** This changes CS-PROC-15's `CancelAfter` and CS-PROC-22's `Task.Delay(d, ct)`.
   - **RS0030 needs its severity line.** Its default is warning on both 4.14.0 and 5.6.0 (watched). The harness's "error by default" came from its TreatWarningsAsErrors setting.

## The ruleset

Every rule ID below is stable. "Watched" means the check was run red on a planted defect and green on the fixed twin; the evidence column names where. The shared static gate is the following.

**Shared gate (applies to CS-XP-01, 03-07, 09-11).** The packages come from the csharp-build posture: BannedApiAnalyzers 5.6.0 and Meziantou.Analyzer 3.0.297 with `<MeziantouAnalysisMode>None</MeziantouAnalysisMode>`, as csharp-api already requires for MA0053. Register the two files as `AdditionalFiles`: `BannedSymbols.Portability.txt` repo-wide, and `BannedSymbols.Time.txt` in `src/Directory.Build.props` only, so tests keep real deadlines.

```ini
# .editorconfig, [src/**.cs] (and tests for RS0030/CA1416)
dotnet_diagnostic.RS0030.severity = error
dotnet_diagnostic.CA1304.severity = error
dotnet_diagnostic.CA1305.severity = error
dotnet_diagnostic.CA1307.severity = error
dotnet_diagnostic.CA1309.severity = error
dotnet_diagnostic.CA1310.severity = error
dotnet_diagnostic.CA1311.severity = error
dotnet_diagnostic.CA1416.severity = error
dotnet_diagnostic.MA0076.severity = error
```

```text
// BannedSymbols.Portability.txt  (repo-wide)
M:System.IO.Path.Combine(System.String,System.String);CS-XP-01: a rooted later segment discards the root; use Path.Join or PathSafe.Combine
M:System.IO.Path.Combine(System.String,System.String,System.String);CS-XP-01: use Path.Join or PathSafe.Combine
M:System.IO.Path.Combine(System.String,System.String,System.String,System.String);CS-XP-01: use Path.Join or PathSafe.Combine
M:System.IO.Path.Combine(System.String[]);CS-XP-01: use Path.Join or PathSafe.Combine
M:System.IO.Path.Combine(System.ReadOnlySpan{System.String});CS-XP-01: .NET 9+ params-span overload; use Path.Join or PathSafe.Combine
M:System.IO.Path.GetInvalidFileNameChars;CS-XP-03: 2 chars on Linux, 41 on Windows; use PathSafe.IsPortableFileName
M:System.IO.Directory.SetCurrentDirectory(System.String);CS-XP-06: process-global cwd; pass absolute paths and ProcessStartInfo.WorkingDirectory
M:System.IO.Directory.CreateSymbolicLink(System.String,System.String);CS-XP-05: Windows needs a privilege; the SDK reads links, never creates them
M:System.IO.File.CreateSymbolicLink(System.String,System.String);CS-XP-05: the SDK reads links, never creates them
M:System.IO.FileSystemInfo.CreateAsSymbolicLink(System.String);CS-XP-05: the SDK reads links, never creates them
F:System.Environment.SpecialFolder.Personal;CS-XP-04: means ~/Documents on Unix since .NET 8; use the OcxHome resolver
F:System.Environment.SpecialFolder.MyDocuments;CS-XP-04: means ~/Documents on Unix since .NET 8; use the OcxHome resolver
P:System.Environment.OSVersion;CS-XP-09: not a CA1416 guard; use OperatingSystem.IsWindows()/IsLinux()/IsMacOS()
P:System.Environment.Is64BitOperatingSystem;CS-XP-10: true on arm64; use RuntimeInformation.OSArchitecture
P:System.Environment.Is64BitProcess;CS-XP-10: use RuntimeInformation.OSArchitecture
P:System.Runtime.InteropServices.RuntimeInformation.ProcessArchitecture;CS-XP-10: x64 under emulation on arm64 hosts; use OSArchitecture
P:System.Runtime.InteropServices.RuntimeInformation.RuntimeIdentifier;CS-XP-10: opaque string, distro builds report alpine.3.24-x64; never parse it
P:System.StringComparer.InvariantCulture;CS-XP-07: linguistic, not invariant; use StringComparer.Ordinal
P:System.StringComparer.InvariantCultureIgnoreCase;CS-XP-07: use StringComparer.OrdinalIgnoreCase
F:System.StringComparison.InvariantCulture;CS-XP-07: use StringComparison.Ordinal
F:System.StringComparison.InvariantCultureIgnoreCase;CS-XP-07: use StringComparison.OrdinalIgnoreCase
```

```text
// BannedSymbols.Time.txt  (src only)
P:System.DateTime.Now;CS-XP-11: inject TimeProvider; use GetLocalNow()
P:System.DateTime.UtcNow;CS-XP-11: inject TimeProvider; use GetUtcNow()
P:System.DateTime.Today;CS-XP-11: inject TimeProvider
P:System.DateTimeOffset.Now;CS-XP-11: inject TimeProvider; use GetLocalNow()
P:System.DateTimeOffset.UtcNow;CS-XP-11: inject TimeProvider; use GetUtcNow()
M:System.Threading.Tasks.Task.Delay(System.TimeSpan);CS-XP-11: use Task.Delay(TimeSpan, TimeProvider, CancellationToken)
M:System.Threading.Tasks.Task.Delay(System.TimeSpan,System.Threading.CancellationToken);CS-XP-11: use Task.Delay(TimeSpan, TimeProvider, CancellationToken)
M:System.Threading.Tasks.Task.Delay(System.Int32);CS-XP-11: use Task.Delay(TimeSpan, TimeProvider, CancellationToken)
M:System.Threading.Tasks.Task.Delay(System.Int32,System.Threading.CancellationToken);CS-XP-11: use Task.Delay(TimeSpan, TimeProvider, CancellationToken)
M:System.Threading.CancellationTokenSource.#ctor(System.TimeSpan);CS-XP-11: use new CancellationTokenSource(TimeSpan, TimeProvider)
M:System.Threading.CancellationTokenSource.#ctor(System.Int32);CS-XP-11: use new CancellationTokenSource(TimeSpan, TimeProvider)
M:System.Threading.CancellationTokenSource.CancelAfter(System.TimeSpan);CS-XP-11: system timer; create the source with new CancellationTokenSource(TimeSpan, TimeProvider)
M:System.Threading.CancellationTokenSource.CancelAfter(System.Int32);CS-XP-11: system timer; create the source with new CancellationTokenSource(TimeSpan, TimeProvider)
M:System.Threading.Thread.Sleep(System.Int32);CS-XP-11: blocks; use Task.Delay(TimeSpan, TimeProvider, CancellationToken)
M:System.Threading.Thread.Sleep(System.TimeSpan);CS-XP-11: blocks; use Task.Delay(TimeSpan, TimeProvider, CancellationToken)
```

Merge both into csharp-build's single posture file set. csharp-build's `DateTime.Now`/`DateTimeOffset.Now` lines and csharp-process's 25-line fragment are disjoint from these, except that `DateTime.Now` appears in both; keep it once. Shared-gate evidence: `./b.sh gate/red` gave 24 distinct diagnostics per TFM, identical on net8.0 and net10.0, and exit 1. `./b.sh gate/green` gave `Build succeeded.` and exit 0 (consolidation V1).

### Portable code (`csharp-quality/platform-and-paths.md`)

| ID | Sev | Rule | Rationale | Verification | Watched |
|---|---|---|---|---|---|
| CS-XP-01 | MUST | **Never call `Path.Combine`.** Concatenate your own literals with `Path.Join`. Pass every foreign segment (package name, tag, digest, archive entry, caller path) through one `PathSafe.Combine(root, rel)`. It rejects `Path.IsPathRooted(rel)` and a leading `/` or `\`, then applies `Path.GetFullPath(Path.Join(root, rel))`, then requires `StartsWith(TrimEndingDirectorySeparator(GetFullPath(root)) + DirectorySeparatorChar, <OS comparison>)`. | `Combine` returns the rooted later argument: `/etc/passwd`, `\Windows\System32`, `D:\x` and `C:foo` all escaped the root on Linux or Windows. `Join` keeps `..`. A bare-root prefix test lets `home-evil` pass as `home`. | Static: the five `Path.Combine` lines in the shared gate. **The `ReadOnlySpan` line is load-bearing:** without it, a 5-argument `Path.Combine` on net10.0 binds to the .NET 9 params-span overload and passes. Dynamic: a unit-test matrix over `/etc/passwd`, `\etc\passwd`, `\Windows`, `D:\x`, `C:foo`, `../../x`, `..\..\x` and `../home-evil/x`, where every case must throw. | Yes. Escape seen on Linux and Windows ([paths §1, row 7](csharp-crossplatform/csharp-crossplatform-paths-culture-guards.md#15-verified-on-the-toolchain)). Span gap: consolidation V2, where `nospan/red` flagged L10 on net8.0 only. |
| CS-XP-02 | MUST | **Compare paths by the runtime's OS rule:** case-sensitive (`Ordinal`) unless `OperatingSystem.IsWindows()` or `IsMacOS()`, then `OrdinalIgnoreCase`. Never use a culture comparer. **Writers refuse two entries whose names differ only by case**, checked with `OrdinalIgnoreCase` on every OS. | Linux kept `Foo.txt` and `foo.txt` as 2 files. Windows kept 1: the first name's casing with the last write's content. A count assertion cannot pass on both. Choosing `OrdinalIgnoreCase` everywhere merges distinct Linux files. | Static: CA1309/CA1310 at error and the InvariantCulture bans. Dynamic only: a `Foo`/`foo` test that expects the writer to refuse, run on all five legs. | Yes, divergence observed Linux vs Windows ([paths §2, row 8](csharp-crossplatform/csharp-crossplatform-paths-culture-guards.md#2-case-sensitivity-and-path-comparison)). macOS unverified. |
| CS-XP-03 | MUST | **Every file or directory name derived from external input passes `PathSafe.IsPortableFileName`.** It forbids `<>:"/\|?*`, code points below 32, a trailing space or dot, `.` and `..`, and the reserved stems `CON PRN AUX NUL COM0-9 LPT0-9` plus their `¹²³` forms, case-insensitively and with any extension. | Linux accepts every one of these. Windows renamed `trail.` and `trail ` to `trail`, wrote `colon:stream` into an alternate data stream and threw on `q?`. `GetInvalidFileNameChars()` returns 2 characters on Linux and 41 on Windows. | Static: the `GetInvalidFileNameChars` ban. Dynamic: a unit test over the Win32 table (pure, so it runs on every leg). | Yes ([paths §3, row 12](csharp-crossplatform/csharp-crossplatform-paths-culture-guards.md#3-windows-names-reserved-trailing-dotspace-colon-invalid-chars)). |
| CS-XP-04 | MUST | **Resolve the ocx home from the caller's environment snapshot in this order:** a non-empty `OCX_HOME`, else a non-empty `USERPROFILE` (Windows) or `HOME` (elsewhere) joined with `.ocx`, else a non-empty `GetFolderPath(SpecialFolder.UserProfile)` joined with `.ocx`. If all are empty, throw. Never use `Personal` or `MyDocuments`. Hermetic tests set `OCX_HOME` and both `HOME` and `USERPROFILE`. | This mirrors ocx (`std::env::home_dir`, `%USERPROFILE%` on Windows, [ocx-cli-contract.md:83](csharp-audit/ocx-cli-contract.md)). `GetFolderPath` ignored `USERPROFILE=C:\fake` on Windows and returned `""` on Linux for a missing `$HOME`. CS-BIN-03's form then yields the cwd-relative `.ocx`. Python's HOME-only form misses Windows (S7). | Static: the `Personal`/`MyDocuments` bans and `rg -l -g '*.cs' '"HOME"' src tests \| xargs -r rg --files-without-match '"USERPROFILE"'`, which must print nothing. Dynamic: a resolver unit test that takes `env` as a parameter. | Yes. Consolidation V4 with `HOME=/tmp/no-such-home`: red `'.ocx' rooted=False`, green `'/tmp/no-such-home/.ocx' rooted=True`. Windows `USERPROFILE` case in [paths §6](csharp-crossplatform/csharp-crossplatform-paths-culture-guards.md#6-home-directory-getfolderpath-vs-homeuserprofile-python-smell-s7). |
| CS-XP-05 | MUST | **Read links; never create them.** "Is a link" is `info.LinkTarget is not null`. The target is `info.ResolveLinkTarget(returnFinalTarget: true)?.FullName`. Never use `Exists` or `Attributes.HasFlag(ReparsePoint)` to mean "is a link". | ocx's Windows directory links are NTFS junctions ([ocx-cli-contract.md:110](csharp-audit/ocx-cli-contract.md)). Both APIs resolve junctions and symlinks. The BCL cannot create a junction, and `CreateSymbolicLink` failed on Windows with "A required privilege is not held". A dangling symlink has `Exists=False`. | Static: the three `CreateSymbolicLink` bans. Reading heuristic: `rg -n -g '*.cs' 'ReparsePoint' src` hits only code that is not a link test. | Yes ([paths §5, row 14](csharp-crossplatform/csharp-crossplatform-paths-culture-guards.md#5-junctions-vs-symlinks-linktarget-resolvelinktarget); consolidation V1 L25). |
| CS-XP-06 | MUST | **Never change the process's current directory.** Pass absolute paths and `ProcessStartInfo.WorkingDirectory`. | The current directory is per-process; agents set it in test setup and race parallel tests. | Static: the `SetCurrentDirectory` ban, repo-wide. | Yes (consolidation V1 L12). |
| CS-XP-07 | MUST | **Data that crosses a process or file boundary is culture-free.** Numbers and dates use `CultureInfo.InvariantCulture`. Interpolated argv, file or JSON text uses `string.Create(CultureInfo.InvariantCulture, $"...")`. Keys, paths, environment names and headers compare with `Ordinal`/`OrdinalIgnoreCase`. Case normalisation uses `ToUpperInvariant`. Never use the `InvariantCulture` *comparers*; `CultureInfo.InvariantCulture` as an `IFormatProvider` is fine. | Under de-DE, `$"--timeout={1.5}"` reached the child as `--timeout=1,5`, and `double.Parse("1.5")` returned 15. CA1305 is blind to interpolation. `StringComparison.InvariantCulture` equated `é` with `e`+U+0301. The Anthropic C# SDK uses `InvariantCultureIgnoreCase` for HTTP headers. | Static: CA1304/1305/1307/1309/1310/1311 and MA0076 at error, plus the four InvariantCulture bans. Under csharp-build's `AnalysisLevel 10.0-all` with TreatWarningsAsErrors the CA rules already error, but keep the explicit lines so a later level change cannot drop them. | Yes ([paths rows 2-4](csharp-crossplatform/csharp-crossplatform-paths-culture-guards.md#15-verified-on-the-toolchain); consolidation V1 L26-29, V3 `lvl10.0-all` gave errors CA1304/1305/1310/1311 against 0 at `10.0-default`). |
| CS-XP-08 | MUST | **Tests prove culture independence by setting the culture themselves.** A UnitTests theory builds argv and parses fixtures under `de-DE`, `fr-FR` and `tr-TR` (`CultureInfo.CurrentCulture = new(...)` and restore) and asserts byte-identical results. No test project sets `InvariantGlobalization`. | Runner locales are en-US, so a matrix alone never shows the bug. Invariant mode masked `1,5` as `1.5`, and `new CultureInfo("de-DE")` throws there, so the sweep also proves invariant mode is off. This replaces paths-culture rule 18 (a `LANG=de_DE` CI leg) with a deterministic test. | `rg -l -g '*.csproj' -g '*.props' '<InvariantGlobalization>\s*true' tests` prints nothing. The sweep test exists: `rg -n -g '*.cs' 'tr-TR' tests/Ocx.Sdk.UnitTests`. | Yes for the mask and the throw ([paths §10, row 11](csharp-crossplatform/csharp-crossplatform-paths-culture-guards.md#10-invariantglobalization-in-tests-masks-bugs)). The sweep test itself is a design commitment. |
| CS-XP-09 | MUST | **Guard OS-specific calls so CA1416 can see the guard.** Use `OperatingSystem.IsWindows()` and its siblings. A helper guard carries `[SupportedOSPlatformGuard("windows")]`. Every type holding `[DllImport]`/`[LibraryImport]` into kernel32 or advapi32 carries `[SupportedOSPlatform("windows")]`. Keep one `net8.0;net10.0` assembly: no `-windows` TFM. | CA1416 still fired behind `Environment.OSVersion.Platform == Win32NT` and behind an unattributed helper. It was silent on an unannotated P/Invoke. An unguarded `Registry` call threw `NullReferenceException` on Linux. A `-windows` TFM marks the whole assembly Windows-only. | Static: CA1416 at error and the `OSVersion` ban. `rg -l -g '*.cs' '\[(DllImport\|LibraryImport)' src \| xargs -r rg --files-without-match 'SupportedOSPlatform'` prints nothing. `rg -n -g '*.csproj' -g '*.props' '<TargetFrameworks?>[^<]*-windows' .` prints nothing. | Yes ([paths §11, row 6](csharp-crossplatform/csharp-crossplatform-paths-culture-guards.md#11-platform-guards-and-ca1416); consolidation V1 L14, L30). |
| CS-XP-10 | MUST | **Platform identity has one source.** The SDK reads `OperatingSystem.Is*()` and `RuntimeInformation.OSArchitecture` in a thin detector. It feeds a pure `(host, arch, libc) -> triple` function that is table-tested over all 8 ocx targets on every leg (CS-BIN-04). Linux selects `*-unknown-linux-musl` without probing libc (CS-BIN-05). | `Is64BitOperatingSystem` returned the x86_64 triple on arm64. The RID is opaque: Alpine's own .NET reports `alpine.3.24-x64`. The installed ocx is a static-pie musl build running on glibc Fedora ([ocx-cli-contract.md:99](csharp-audit/ocx-cli-contract.md); `file` output in the consolidation run). So libc detection is dead code. | Static: the four identity bans (`Is64Bit*`, `ProcessArchitecture`, `RuntimeIdentifier`). This upgrades CS-BUILD-07's grep to an analyzer error. Dynamic: the table test, and the matrix's `EXPECTED_TRIPLE` test (CS-CI-04). | Yes ([ci-matrix V4, V7](csharp-crossplatform/csharp-crossplatform-ci-matrix.md#15-verified-on-the-toolchain); consolidation V1 L15-17). Native arm64 unverified. |
| CS-XP-11 | MUST | **Every clock, delay and timeout in `src` takes the injected `TimeProvider`:** `Task.Delay(TimeSpan, TimeProvider, CancellationToken)`, `new CancellationTokenSource(TimeSpan, TimeProvider)` and `GetUtcNow()`. UnitTests drive it with `FakeTimeProvider` (`Microsoft.Extensions.TimeProvider.Testing` 10.10.0). They call `Advance` in a loop bounded by a real-time ceiling and assert real elapsed time under 1.5 s. | A retry that ignored the provider slept 3.0 s for real, and the fake clock never fired. A single `Advance` before the timer registers is lost. Both run on net8.0, where the API has been in-box since .NET 8. | Static: `BannedSymbols.Time.txt` in src. Dynamic: the fake-clock retry test. | Yes ([harness §7, row 5](csharp-crossplatform/csharp-crossplatform-fake-cli-harness.md#7-timeprovider-and-faketimeprovider); consolidation V1 L20-24 on both TFMs; green built `new CancellationTokenSource(TimeSpan, TimeProvider)` on net8.0). |
| CS-XP-12 | SHOULD | **Split child text into lines with `StringReader.ReadLine`.** Never use `Split(Environment.NewLine)`, `Split('\n')` or `Split("\r\n")`. | `Environment.NewLine` describes this process, not the child. Real `ocx.exe` 0.5.7 on Windows wrote LF only, so `Split(NewLine)` returned 1 element. CRLF input left a `\r` behind `Split('\n')`. JSON is parsed from bytes (CS-PROC-11) and is unaffected. | `rg -n -g '*.cs' 'Split\((Environment\.NewLine\|"\\r\\n"\|.\\n.)' src` prints nothing. | Yes ([paths §7, row 9](csharp-crossplatform/csharp-crossplatform-paths-culture-guards.md#7-child-output-newline-crlf-encoding)). |

### The test seam and tiers (`csharp-quality/testing.md`)

| ID | Sev | Rule | Rationale | Verification | Watched |
|---|---|---|---|---|---|
| CS-TEST-01 | MUST | **The test side is exactly four projects.** `tests/Ocx.Sdk.UnitTests` holds pure logic and never spawns. `tests/Ocx.Sdk.FakeCliTests` runs the production engine against the dummy. `tests/Ocx.Sdk.ContractTests` runs the pinned real ocx. `tests/Ocx.Fake` is the dummy console app and is not a test project. All inherit their TFMs from `Directory.Build.props` (CS-BUILD-01). | Each tier has a different gate, matrix and failure meaning. .NET has no `Popen` seam, so Python's "fake Popen" tier becomes a real-child tier ([harness §1](csharp-crossplatform/csharp-crossplatform-fake-cli-harness.md#1-tier-layout)). | `test -f tests/Ocx.Fake/Ocx.Fake.csproj && test -f tests/Ocx.Sdk.UnitTests/Ocx.Sdk.UnitTests.csproj && test -f tests/Ocx.Sdk.FakeCliTests/Ocx.Sdk.FakeCliTests.csproj && test -f tests/Ocx.Sdk.ContractTests/Ocx.Sdk.ContractTests.csproj` | Layout ran in the harness fixture (10/10 green on Linux, 9+1 skipped on Windows). |
| CS-TEST-02 | MUST | **`Ocx.Fake` has one argv verb per hazard:** `exit <n>`, `cat <file>`, `flood-stderr <bytes>`, `sleep <ms>`, `grandchild-wait <pidfile>`, `hold-pipe <pidfile> <ms>`, `ignore-sigterm`, `emit <encoding> <text>` and `echo-stdin`. It also has a self-exit watchdog (`DUMMY_MAX_LIFE_SECONDS`, default 60). It re-launches itself as `<host> exec <dll>` when started by `dotnet exec`. FakeCliTests use no mocking library and no hand-written fake runner. | The verbs are the specification of what the engine must survive. A mock cannot show a pipe, signal or process-tree bug. A leaked dummy poisons later runs. | `rg -c -g '*.cs' -e '"flood-stderr"' -e '"grandchild-wait"' -e '"hold-pipe"' -e '"echo-stdin"' tests/Ocx.Fake` gives at least 4. `rg -n -g '*.cs' -e 'Mock<' -e 'Substitute\.For<' -e 'class Fake\w*Runner' tests/Ocx.Sdk.FakeCliTests` prints nothing. | Yes. A naive engine went red on 3 of 10 and the reference engine green on 10 of 10. No dummy survived the red run (`pgrep`) ([harness §3, rows 1-3](csharp-crossplatform/csharp-crossplatform-fake-cli-harness.md#11-verified-on-the-toolchain)). |
| CS-TEST-03 | MUST | **Build and locate the dummy the same way on every leg.** Use a plain `ProjectReference`. Find it with `Path.Join(AppContext.BaseDirectory, "Ocx.Fake.dll")`. Launch it as `<dotnet> exec <dll>`, where `<dotnet>` is `DOTNET_HOST_PATH`, else `RuntimeEnvironment.GetRuntimeDirectory()` three levels up plus `dotnet[.exe]`. Launch the apphost (`.exe` chosen by `OperatingSystem.IsWindows()`) only in executable-resolution tests. Never use a file-based app (`dotnet run x.cs`) as the fixture. | `ReferenceOutputAssembly="false"` copies the apphost without the dll, which exits 154. `dotnet exec` is architecture-neutral. `DOTNET_HOST_PATH` is unset when a test exe runs directly. A file-based app costs 1558 ms on the first spawn and about 230 ms cached, against 36-46 ms, and puts an SDK process into the tree. | `rg -n -P -g '*.csproj' 'ReferenceOutputAssembly="false"(?!.*CopyToOutputDirectory)' tests` prints nothing. `rg -n -g '*.cs' -e 'DOTNET_HOST_PATH' tests` is non-empty. `rg -n -g '*.cs' -e 'FileName = "dotnet"' -e 'bin[/\\\\](Debug\|Release)' tests` prints nothing. | Yes (rc 154 against rc 7, timings, and the direct-exe run at 10/10: [harness §4, row 9](csharp-crossplatform/csharp-crossplatform-fake-cli-harness.md#4-building-and-locating-the-dummy)). |
| CS-TEST-04 | MUST | **FakeCliTests pin the engine's process behaviour on every PR leg.** Required tests: `E1_` stderr flood of at least 200 000 B, `E3_` grandchild-after-cancel, `E7_` pipe held by a grandchild with partial output kept, a stdin test with a non-ASCII secret and no BOM or CR (CS-PROC-12), and a 1 MiB cap test (CS-PROC-10). Each test sets its own deadline with `Task.WaitAsync(budget)` and cleans up children and pid files in `finally`. POSIX-only cases use `Assert.SkipWhen(OperatingSystem.IsWindows(), "<reason>")`, never a bare `return`. This supersedes CS-PROC-24's "a Linux leg and a Windows leg". | A naive engine is red on all three hazards on Linux and on Windows. On Windows E3 shows up as a hang, not an orphan, so a Linux-only run under-specifies it. xUnit timeouts are cooperative. A silent `return` reports a pass. | `rg -o -g '*.cs' -e 'E1_\w+' -e 'E3_\w+' -e 'E7_\w+' tests/Ocx.Sdk.FakeCliTests \| sort -u \| wc -l` gives at least 3. `rg -n -P -g '*.cs' 'if \(!?OperatingSystem\.Is(Windows\|Linux\|MacOS)\(\)\)\s*return' tests` prints nothing. After any engine change, swap in the naive engine once and watch the three go red. | Yes, Linux and Windows ([harness §5, Windows evidence](csharp-crossplatform/csharp-crossplatform-fake-cli-harness.md#5-what-the-dummy-must-prove-e1-e3-e7)). |
| CS-TEST-05 | MUST | **Use xUnit v3 on Microsoft.Testing.Platform only.** Reference `xunit.v3.mtp-v2` 4.0.2 with `<UseMicrosoftTestingPlatformRunner>true</UseMicrosoftTestingPlatformRunner>` and `OutputType Exe`. `global.json` carries `"test": {"runner": "Microsoft.Testing.Platform"}`. Do not reference `Microsoft.NET.Test.Sdk`, `xunit.runner.visualstudio`, xUnit v2 `xunit` or `Xunit.SkippableFact`. Invoke tests as `dotnet test --solution\|--project ... [-f <tfm>]`. Never pass `--logger`, `--collect`, `--blame*` or `--report-trx` without its extension package. Set `xUnit1051` to error. | Without the `global.json` section, SDK 10 fails the build ("Testing with VSTest target is no longer supported"). VSTest-era flags exit 5. VSTest also exits 0 on an empty filter. | `jq -e '.test.runner == "Microsoft.Testing.Platform"' global.json`. `rg -n -g '*.{csproj,props}' -e 'Microsoft\.NET\.Test\.Sdk' -e 'xunit\.runner\.visualstudio' -e 'Include="xunit"' -e 'SkippableFact' .` prints nothing. Workflows pass `check-ci-matrix.sh` R9. | Yes. norunner gave a build error; `--logger trx` exited 5 ([harness §8](csharp-crossplatform/csharp-crossplatform-fake-cli-harness.md#8-framework-and-runner)); `--blame-hang-timeout 5m` exited 5 (consolidation V5). |
| CS-TEST-06 | MUST | **No run may pass with zero tests.** UnitTests and FakeCliTests bake `<TestingPlatformCommandLineArguments>$(TestingPlatformCommandLineArguments) --minimum-expected-tests 1</TestingPlatformCommandLineArguments>` unconditionally. ContractTests bakes the same line under `Condition="'$(CI)' == 'true'"`. Nothing passes `--ignore-exit-code` or sets `TESTINGPLATFORM_EXITCODE_IGNORE`. Filters are fully qualified names or wildcards (`--filter-method '*E3*'`). | On SDK 10.0.401 an all-skipped contract tier exits 0. A *global* `--minimum-expected-tests` counts skipped tests, so it does not help. A per-module minimum turns the run into exit 9. The CI condition keeps a local unarmed run green with its skip reason. | `rg -n -g '*.csproj' -g '*.props' 'minimum-expected-tests' tests` hits 3 projects. `rg -n -e 'ignore-exit-code' -e 'TESTINGPLATFORM_EXITCODE_IGNORE' -g '!*.md' .` prints nothing. | Yes. Filter-matches-nothing exits 8, all-skipped exits 0, per-module exits 9 ([harness §9](csharp-crossplatform/csharp-crossplatform-fake-cli-harness.md#9-the-zero-test-gate)). Consolidation V5: local unarmed 0, `CI=true` unarmed 9, armed 0. |
| CS-TEST-07 | MUST | **The contract tier is armed by `OCX_SDK_CONTRACT=1` and is honest in both states.** Use `[Fact(SkipUnless = nameof(Contract.Armed), Skip = "<reason>")]` with `public static bool Armed`. Armed with a missing or mismatched ocx **throws**. One `TestedOcxVersion` constant is mirrored in every `setup-ocx` step and guarded by a drift test. Every test is hermetic: temp `OCX_HOME` and `DOCKER_CONFIG`, plus an explicit minimal environment carrying `HOME` and `USERPROFILE`. It asserts three things: the version-keyed exit-code rows reachable offline (unreachable rows listed in a comment block), that real pinned output parses with the SDK models, and real timeout and large-stderr mechanics. A nightly job runs it with `OCX_TEST_VERSIONS=latest`. | A skip with a reason is honest; a skip while armed is silent green. Code 82 changed meaning between 0.6.5 and main ([ocx-cli-contract.md:57](csharp-audit/ocx-cli-contract.md)). The ambient `DOCKER_CONFIG` turns an offline `logout` into exit 80. | `dotnet build tests/Ocx.Sdk.ContractTests` is clean (xUnit1054 is an error by default). `rg -n -e 'TestedOcxVersion' src tests .github` hits at least 3 files. `rg -n -g '*.cs' -e 'Environment\.GetEnvironmentVariables\(\)' tests/Ocx.Sdk.ContractTests` prints nothing. | Partly. Skip and xUnit1054 were watched ([harness §10, row 12](csharp-crossplatform/csharp-crossplatform-fake-cli-harness.md#10-the-contract-tier)). The armed run against a real ocx was not run here. |
| CS-TEST-08 | SHOULD | **UnitTests need no runner seam.** Test pure functions directly: the argv builder, the decode seam, the exit table, the home resolver, `PathSafe`, the triple table and the culture sweep. Test retry through a delegate, `Retry.RunAsync(Func<CancellationToken, Task<RawResult>>, RetryPolicy, TimeProvider, CancellationToken)`. Declare no `IProcessRunner`, public or internal. | An interface with one production implementation adds surface for nothing. The harness's own retry fixture already used a delegate. CS-API-02 forbids a public seam. | `rg -n -g '*.cs' 'interface\s+I\w*(Runner\|Process\w*)\b' src` prints nothing. | Delegate form watched (harness row 5). The no-interface rule is a decision. |

### The matrix that proves it (`csharp-quality/testing.md`, CI section)

| ID | Sev | Rule | Rationale | Verification | Watched |
|---|---|---|---|---|---|
| CS-CI-01 | MUST | **Five native legs on every PR, each running all three tiers with the contract tier armed.** The TFM split: `ubuntu-24.04` (linux-x64, net8.0+net10.0), `ubuntu-24.04-arm` (linux-arm64, net8.0+net10.0), `windows-2025` (win-x64, net8.0+net10.0), `windows-11-arm` (win-arm64, net10.0) and `macos-26` (osx-arm64, net10.0). Both Linux legs add a FakeCliTests run on musl. | One leg per OS and architecture proves the owner's requirement except osx-x64, whose only unique content is a table row (CS-XP-10). The Python SDK ran its process-spawning tier on one leg (S5/S6). | `check-ci-matrix.sh` R1 and R10. | Yes. Consolidation V6: the ci-matrix `bad` workflow gave 15 FAIL lines; its pre-merge `good` gave 5 (R9 ×3, R10, R12); the merged workflow printed `OK all rules`. Each leg proved unique bugs ([ci-matrix V1-V4](csharp-crossplatform/csharp-crossplatform-ci-matrix.md#15-verified-on-the-toolchain)). Native arm64 and macOS unverified locally. |
| CS-CI-02 | MUST | **Use versioned runner labels.** `-latest` appears only in a non-blocking canary. Never use `macos-11` to `macos-14` (`macos-14` is unsupported from 2026-11-02), `ubuntu-18.04`/`20.04`/`22.04` or `windows-2019`. Run actionlint ≥ 1.7.12 from a git checkout, with `.github/actionlint.yaml` declaring `ubuntu-26.04`, `ubuntu-26.04-arm` and `windows-11-vs2026-arm`. | `ubuntu-latest` moves to 26.04 between 2026-10-19 and 2026-11-19. Brownouts fail retiring labels early. actionlint flags hallucinated labels (8 of 8) but knows no deprecation dates and false-flags new labels. | `check-ci-matrix.sh` R3, plus `actionlint; echo $?` prints 0. | Yes ([ci-matrix V8](csharp-crossplatform/csharp-crossplatform-ci-matrix.md#15-verified-on-the-toolchain); consolidation V6 actionlint exit 0). |
| CS-CI-03 | MUST | **Gate on one aggregate check.** Every matrix has `fail-fast: false` and every job has `timeout-minutes` (20 for PR, 30 for nightly). Branch protection requires exactly one check: `ci-ok` (`if: always()`, `needs: [test]`, `test "$RESULT" = success`). Never list leg names. | The default fail-fast cancels the other platforms' evidence. A skipped dependent reports Success. Renamed legs leave a required check pending forever. | `check-ci-matrix.sh` R2 and R8. `gh api repos/{owner}/{repo}/branches/main/protection --jq '.required_status_checks.contexts'` returns `["ci-ok"]`. | Lint and script were watched. The gate semantics come from GitHub documentation; no runner executed it. |
| CS-CI-04 | MUST | **Each leg proves its identity.** The matrix passes `EXPECTED_TRIPLE`; one test asserts the detected triple equals it and fails when it is unset. Linux legs expect `*-unknown-linux-musl` (CS-XP-10). Another test asserts `Environment.Version.Major` equals the TFM under test (`#if NET10_0 … #elif NET8_0 … #else #error`). Install the 8.0 runtime with `setup-dotnet` (`global-json-file` plus `dotnet-version: 8.0.x`) on legs that test net8.0. Never set `DOTNET_ROLL_FORWARD` or `<RollForward>`. | Without the 8.0 runtime, `-f net8.0` aborted. With `DOTNET_ROLL_FORWARD=Major` the "net8.0" leg ran on .NET 10, and only the identity test went red (Expected 8, Actual 10). Emulation or a wrong architecture fails the triple test. | `check-ci-matrix.sh` R4 and R5. `rg -n -g '*.cs' 'Environment\.Version\.Major' tests` is non-empty. | Yes ([ci-matrix V5, V6](csharp-crossplatform/csharp-crossplatform-ci-matrix.md#7-legs-must-prove-who-they-are)). |
| CS-CI-05 | MUST | **Run musl as a step, not a job container.** Use a `docker run` step on the Ubuntu legs with an image tag equal to the `global.json` SDK (`mcr.microsoft.com/dotnet/sdk:10.0.401-alpine3.24`), run as the runner's uid (`-u "$(id -u):$(id -g)"`), with `dotnet test --project tests/Ocx.Sdk.FakeCliTests -f net10.0`. Never use `container:`. Docker-dependent tests run on Ubuntu legs only. | The runner ships Alpine Node only for linux-x64, so a `container:` job breaks JavaScript actions on arm64. A floating `-alpine` tag breaks the exact SDK pin. Docker is gone from Windows ARM images and macOS has none. A root container left `obj/` unwritable. | `check-ci-matrix.sh` R1 (an exact-tag alpine image) and R11 (no floating tag). `rg -n 'container:' .github/workflows` prints nothing. | Yes for Alpine x64 and arm64 under QEMU ([ci-matrix V3, V4](csharp-crossplatform/csharp-crossplatform-ci-matrix.md#6-the-musl-leg-docker-run-not-a-job-container)). Native arm64 Docker not run. |
| CS-CI-06 | SHOULD | **Run a nightly lane for what PRs skip** (`schedule` and `workflow_dispatch`; never in `ci-ok`'s `needs`). It covers `macos-26-intel` (osx-x64), net8.0 on `macos-26` and `windows-11-arm`, `ubuntu-26.04`, the `-latest` canary, `OCX_TEST_VERSIONS=latest`, and a separate .NET 11 RC setup step. | macOS is about 60% of an illustrative $0.62 private-repo PR run at $0.062/min. Intel macOS ends with the macOS 15 image in fall 2027. | `rg -n -A3 'ci-ok:' .github/workflows/ci.yml \| rg needs` shows only `[test]`. | Linted (consolidation V6). |
| CS-CI-07 | MUST | **Every workflow change passes `check-ci-matrix.sh` and actionlint.** The script (R1-R12, below) also enforces SHA-pinned actions, top-level `permissions:`, no VSTest flags or ignored exit codes, an armed contract tier, and no NuGet cache (CS-BUILD-27). | actionlint cannot judge coverage. Every rule above is cheap to break in a one-line edit. | `bash check-ci-matrix.sh .github/workflows` exits 0. | Yes (consolidation V6, red and green). |

`check-ci-matrix.sh` (fixture `ci/check-ci-matrix.sh`; ci-matrix's script plus R1's alpine tag, R9, R10, R11 and R12):

```bash
#!/usr/bin/env bash
# usage: check-ci-matrix.sh <workflows-dir>  -- exit 1 when any rule fails (CS-CI-01..07)
set -u; dir="${1:?workflows dir}"; fail=0
bad() { echo "FAIL $1"; fail=1; }
hits() { [ -n "$2" ] && { printf '%s\n' "$2" | sed "s/^/FAIL $1: /"; fail=1; }; return 0; }
for pat in 'ubuntu-24\.04([^-.0-9]|$)' 'ubuntu-24\.04-arm' 'windows-(2025|latest)([^-.0-9]|$)' 'windows-11-arm' 'macos-(26|latest)([^-.0-9]|$)' 'sdk:[0-9]+\.[0-9]+\.[0-9]+-alpine'; do
  grep -rqE -e "$pat" "$dir" || bad "R1 missing leg matching /$pat/"; done
for f in $(grep -rlE -e '^\s+matrix:' "$dir"); do
  grep -qE -e 'fail-fast:\s*false' "$f" || bad "R2 $f has a matrix without fail-fast: false"; done
hits "R3 retired-or-retiring label" "$(grep -rnE -e '(macos-(11|12|13|14)|ubuntu-(18|20|22)\.04|windows-2019)([^0-9]|$)' "$dir")"
hits "R4 forced roll-forward" "$(grep -rnE -e 'DOTNET_ROLL_FORWARD|RollForward' "$dir")"
grep -rqE -e 'EXPECTED_TRIPLE' "$dir" || bad "R5 no leg passes EXPECTED_TRIPLE"
for f in $(grep -rlE -e '^jobs:' "$dir"); do
  grep -qE -e '^permissions:' "$f" || bad "R6 $f has no top-level permissions:"; done
hits "R7 unpinned action" "$(grep -rnE -e '^\s*-?\s*uses:\s+[^./]' "$dir" | grep -vE -e '@[0-9a-f]{40}')"
grep -rqE -e 'if:\s*always\(\)' "$dir" || bad "R8 no always() gate job"
hits "R9 VSTest-era or exit-code-silencing flag" "$(grep -rnE -e '--(blame|logger|collect)' -e 'ignore-exit-code|TESTINGPLATFORM_EXITCODE_IGNORE|vstest' "$dir")"
grep -rqE -e "OCX_SDK_CONTRACT:\s*'?\"?1" "$dir" || bad "R10 contract tier never armed (OCX_SDK_CONTRACT: '1')"
hits "R11 floating Alpine SDK tag" "$(grep -rnE -e 'dotnet/sdk:([0-9]+\.[0-9]+-|[a-z])' "$dir")"
hits "R12 NuGet cache (CS-BUILD-27: restore into an empty folder)" "$(grep -rnE -e 'actions/cache@' -e 'cache:\s*true' "$dir")"
[ "$fail" -eq 0 ] && echo "OK all rules"; exit "$fail"
```

The reference workflow that passes it and actionlint is `fixtures/consolidate-csharp-crossplatform/ci/good/.github/workflows/ci.yml`.

## Applied to the ocx C# SDK

**New commitments this group adds to the SDK design:**
- **Static helpers.** `PathSafe.Combine`, `PathSafe.IsPortableFileName` and `OcxHome.Resolve(Func<string, string?> env)` are internal static helpers with unit tables (CS-XP-01/03/04).
- **Clock.** `TimeProvider` is a constructor and options dependency that defaults to `TimeProvider.System`. All retry, timeout and drain timers come from it (CS-XP-11).
- **Test layout.** Four test-side projects, `Ocx.Fake` with nine verbs, and a contract tier that is armed on every PR leg (CS-TEST-01..07, CS-CI-01).
- **One workflow.** It carries five required legs, a musl step, the nightly lane, `ci-ok`, and the reviewer script (CS-CI-*).
- **Two `BannedSymbols` files and nine severity lines** in the csharp-build posture (shared gate).

**Rows in other groups that cite the harness as their verification** (each names the `Ocx.Fake` verb):

| Rule | Verb |
|---|---|
| CS-PROC-09/10/13/14/15 | `flood-stderr`, `grandchild-wait`, `hold-pipe`, `sleep` |
| CS-PROC-11/12 | `emit`, `echo-stdin` |
| CS-PROC-19/21 | `exit <n>` |
| CS-JSON-03/09 and CS-ERR-02/04 | `cat <recorded ocx --format json document>` |
| CS-API-02 | `ExecutablePath` points at `Ocx.Fake` |

**What the Python SDK already models (keep):**
- Three tiers with an env-gated contract tier and a nightly `latest` canary ([python-sdk-digest.md:178](csharp-audit/python-sdk-digest.md); `tests/contract/conftest.py:45-49`).
- A pinned `TESTED_OCX_VERSION` with a drift test (digest :125, :285).
- A pure `uname_to_triple` table with musl as the default (digest :134-145).
- Platform passed as a parameter so both branches run on any OS (digest :187).
- `fail-fast: false` and SHA-pinned actions (digest :188, :293).

**What the ocx CLI contract forces:**
- **8 targets, no 32-bit.** The 8 dist targets map one-to-one onto RIDs with no win-x86 ([ocx-cli-contract.md:103](csharp-audit/ocx-cli-contract.md)). That is why the matrix is 3 OS × 2 architectures, and why osx-x64 can be a table row.
- **Home and links (CS-XP-04/05).** The data root is `~/.ocx` via `%USERPROFILE%` on every OS, and Windows directory links are junctions (:83, :110).
- **Exact binary name (CS-TEST-03, CS-PROC-03).** `ocx.exe` is matched by exact name (:108). The dummy's apphost test must exercise the `.exe` branch.
- **Process mechanics are first-class in the contract tier (CS-TEST-04/07).** The contract requires draining both pipes, tree-killing, and handling a pipe held by a grandchild (:134).
- **Exit table keyed by version (CS-TEST-07).** Code 82 was reused across releases (:57), so the contract tier's table is version-keyed.

**Where the Python design must NOT be copied:**
- **Contract tier on ubuntu only, no arm64 legs** (S5/S6, digest :307-308, ci.yml:81-91). Replaced by CS-CI-01: all tiers on all five legs.
- **A coverage gate on Linux legs only, kept at 100% by `pragma: no cover` on the Windows kill path** (S12, digest :185, :314). Replaced by CS-TEST-04 running the hazards natively on Windows. Exclude no platform branch from coverage.
- **HOME-only home lookup** (S7, digest :309). Replaced by CS-XP-04.
- **Case-sensitive env keys on Windows** (S8, digest :310). Owned by CS-PROC-06, which scrubs keys case-insensitively. CS-XP-02's OS rule applies to paths only, not to env keys.
- **Rosetta `sysctl` probe** (digest :145). Not needed: `OSArchitecture` reports the hardware architecture (CS-XP-10). This is unverified on macOS; see Open questions.

## AI-agent failure modes

Ranked by how often an agent writes it unprompted (training-data frequency × number of places it can occur):

| # | Failure | Check that catches it |
|---|---|---|
| 1 | `os: [ubuntu-latest, windows-latest, macos-latest]` declared "cross-platform", with no arm64 leg and floating labels | `check-ci-matrix.sh` R1/R3; CS-CI-01/02 |
| 2 | `Path.Combine(dir, segment)` everywhere, including 5+ arguments on net10 | RS0030 with all five Combine lines (span line included) |
| 3 | `$"--flag={number}"` into argv, and `double.Parse(s)` without a culture | MA0076; CA1305 at error |
| 4 | VSTest-era test stack: `Microsoft.NET.Test.Sdk`, xUnit v2, `--logger trx`, `--blame-hang-timeout`, `--collect` | CS-TEST-05 greps; R9; exit 5 at run time |
| 5 | `DateTime.UtcNow`, `Task.Delay(ms)`, `CancelAfter`, `Thread.Sleep` in retry and timeout code | `BannedSymbols.Time.txt` (RS0030) |
| 6 | Mocking `Process` behind `IProcessWrapper` with Moq for "pipe tests" | CS-TEST-02 grep; CS-TEST-08 no-interface grep |
| 7 | Contract tier as `[Fact(Skip="needs ocx")]` or `if (!HasOcx) return;` | CS-TEST-06 CI minimum (exit 9); CS-TEST-04 silent-return grep |
| 8 | `StringComparison.InvariantCultureIgnoreCase` "to be culture-safe"; `ToLower()` keys | RS0030 InvariantCulture lines; CA1309/CA1311 |
| 9 | Reading `HOME` only, or `GetFolderPath(UserProfile)` only, or `SpecialFolder.Personal` as home | CS-XP-04 grep; RS0030 `Personal`; resolver unit test |
| 10 | `Is64BitOperatingSystem`, `ProcessArchitecture` or parsing `RuntimeIdentifier` to pick the binary; probing `/lib/ld-musl*` | RS0030 identity lines; CS-CI-04 triple test |
| 11 | Fixing "framework not found" with `DOTNET_ROLL_FORWARD: Major` | R4; runtime-major identity test |
| 12 | `fail-fast` left at its default; listing leg names as required checks; no `timeout-minutes` | R2/R8; `gh api ... required_status_checks` |
| 13 | Retired or hallucinated labels: `macos-13`, `macos-14`, `ubuntu-24.04-arm64`, `windows-latest-arm64` | R3; actionlint `[runner-label]` |
| 14 | `ReferenceOutputAssembly="false"` on the dummy; hard-coded `bin/Debug/net10.0/Dummy.exe`; bare `"dotnet"` | CS-TEST-03 greps |
| 15 | `--ignore-exit-code 8` to "fix" a red run | CS-TEST-06 grep; R9 |
| 16 | `InvariantGlobalization=true` in the test csproj "for determinism" | CS-XP-08 grep; the culture sweep throws |
| 17 | `Environment.OSVersion` or an unattributed `IsWin()` as a guard; an unannotated `[DllImport("kernel32")]` | CA1416 at error; RS0030 `OSVersion`; P/Invoke grep |
| 18 | `container: mcr…-alpine` job, a floating `10.0-alpine` tag, root-run Docker | R11; `container:` grep; CS-CI-05 |
| 19 | `actions/cache` keyed on `**/*.csproj` without architecture, or `setup-dotnet cache: true` | R12 (CS-BUILD-27 forbids the cache outright) |
| 20 | `Split(Environment.NewLine)` on child output | CS-XP-12 grep |
| 21 | Deleting the `AdditionalFiles` line or the RS0030 severity line, so the bans fall silent or become warnings | csharp-process's `AdditionalFiles` grep; consolidation V3 shows the warning default |

## Failure classes

| Class | Mechanism | Members (rank above) | The check that catches the class |
|---|---|---|---|
| **A. Host-convention leak** | Code is correct for the author's OS: separators, rooting, case, CRLF, reserved names, home variable, culture | 2, 3, 8, 9, 20; CS-XP-02/03 | The shared static gate for what an analyzer can see. Otherwise **pure unit tables run on every leg** (PathSafe, portable names, OcxHome, culture sweep): the table carries the other OS's inputs, so a Linux leg tests Windows logic. |
| **B. Silent analyzer** | The check exists but is off, a warning, or has a hole: CA13xx off by default, RS0030 a warning by default, CA1305 blind to interpolation, the span overload slipping past a `string[]` ban, a P/Invoke invisible to CA1416, a missing `AdditionalFiles` line | 2, 3, 17, 21 | A **planted red canary** that must fail the build (the `gate/red` shape, as CS-BUILD-18 does for CA2007), plus explicit per-rule `error` lines. Bans are watched per TFM, because overload sets differ between net8 and net10. |
| **C. False-green evidence** | The run is green but proves nothing: all-skipped exits 0, VSTest's empty filter exits 0, roll-forward runs net8 on net10, emulation reports the wrong platform, invariant mode masks culture, a mocked `Process`, a silent `return` | 6, 7, 11, 15, 16 | **Identity and non-emptiness assertions:** `--minimum-expected-tests` per module, `EXPECTED_TRIPLE`, runtime major equals TFM, the culture sweep, armed-but-missing throws. |
| **D. Stale platform knowledge** | Training data predates the 2025-26 changes: retired or invented labels, VSTest flags, the Docker/Node limits, setup-dotnet cache semantics, file-based apps | 1, 4, 13, 18, 19 | **actionlint plus `check-ci-matrix.sh`** with dated retirement patterns. Re-check the label list at each runner-images announcement. |
| **E. Process-tree and pipe mechanics** | Behaviour shows only on a real child on a specific OS: E1/E3/E7, BOM, codepage, Windows hang instead of orphan | 6 (and csharp-process's list) | **The `Ocx.Fake` hazard tests on all five legs** (CS-TEST-04), validated by the naive-engine swap. |

## Open questions

**Owner decisions:**
1. **The net8.0 floor.** .NET 8 reaches end of support on 2026-11-10, about a month from now. No ocx release carries the machine contract yet ([ocx-cli-contract.md:21-28](csharp-audit/ocx-cli-contract.md)). Dropping net8.0 removes the `sdk8` column and halves the TFM legs. csharp-build Verdict 1 asks the same question; answer it once.
2. **Repository visibility.** Public repositories pay nothing for any label. In a private repository, `macos-26` is about 60% of PR cost. Keep the macOS PR leg in both cases? This program says yes: it is the only osx-arm64 evidence.
3. **Branch protection.** Set `ci-ok` as the sole required check on `main`. Only the owner can do this.
4. **The contract-tier pin.** Pin `TestedOcxVersion` to 0.6.5 now, so the exit table is keyed to 0.6.5 and 82 means DirtyRcBlock? Or wait for the first release with `contract` (CS-JSON-10's floor)? The workflow fixture uses `"0.6.5"` as a placeholder.

**Another research round: `csharp-crossplatform-native-arm-macos`.** Nothing in this group ran on macOS or on native arm64. Dispatch a verification workflow from a scratch repository (allowed by the CI grant) and answer:
- Do E1/E3/E7 and `Kill(entireProcessTree: true)` behave on `macos-26`, `windows-11-arm` and `ubuntu-24.04-arm` as they do on Linux and Windows x64?
- Is APFS on the macOS runner case-insensitive, matching the runtime's `PathInternal` table? Does `/var` → `/private/var` break path equality in temp-dir tests?
- What does `RuntimeInformation.OSArchitecture` report under Rosetta, and for an x64 process on `windows-11-arm`? This tests the claim that no Rosetta probe is needed.
- Does `ocx-sh/setup-ocx` support `windows-11-arm` and `ubuntu-24.04-arm`? Python only ran it on x64 Windows and on arm64 macOS.
- What are the real wall-clock minutes per leg? They replace the illustrative cost table.

**Smaller items, settled at the first CI run rather than in research:**
- **Windows reserved names.** Verify that reserved device names are still accepted on the Windows Server 2025 runner, as on Windows 11 26200. CS-XP-03 forbids them either way.
- **Re-check analyzers at .NET 11 GA.** Re-run consolidation V1/V3 on 11.0.100 GA (November 2026). The paths sub-artifact found RC1 analyzer defaults identical to 10.0.401. The SDK 11 whole-run exit 8 on an all-skipped run changes nothing here, because CS-TEST-06 already fails it.

## Sub-artifacts

- [csharp-crossplatform-paths-culture-guards.md](csharp-crossplatform/csharp-crossplatform-paths-culture-guards.md): `Path.Combine` escapes, case, reserved names, junctions, the home variable, CRLF and encoding, the CA13xx and CA1416 gaps, the MA0076 interpolation hole and the portability bans. Linux and Windows host measured.
- [csharp-crossplatform-fake-cli-harness.md](csharp-crossplatform/csharp-crossplatform-fake-cli-harness.md): the `Ocx.Fake` dummy and how to locate it, the four test projects, E1/E3/E7 red/green on Linux and Windows, the stdin BOM, FakeTimeProvider, xUnit v3 on MTP, the exit-8/9 gate and contract-tier gating.
- [csharp-crossplatform-ci-matrix.md](csharp-crossplatform/csharp-crossplatform-ci-matrix.md): October 2026 runner labels and the retirement calendar, the five-leg matrix, per-TFM runtimes, musl via `docker run`, leg identity tests, `ci-ok` gating, cost and actionlint limits.

## Key sources

1. https://learn.microsoft.com/en-us/dotnet/api/system.io.path.combine: rooted later arguments discard earlier ones; use `Join` for untrusted input.
2. https://learn.microsoft.com/en-us/dotnet/standard/io/file-path-formats: drive-relative paths, trailing dots and spaces, and no MAX_PATH check on .NET Core and later.
3. https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file: reserved names, including the superscript digits.
4. https://learn.microsoft.com/en-us/dotnet/standard/base-types/best-practices-strings: Ordinal for paths, environment and registry; the limits of InvariantCulture.
5. https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1305: off by default in .NET 10; the `string.Create(InvariantCulture, …)` fix.
6. https://learn.microsoft.com/en-us/dotnet/standard/analyzers/platform-compat-analyzer: the guards CA1416 recognises, and `SupportedOSPlatformGuard`.
7. https://learn.microsoft.com/en-us/dotnet/standard/datetime/timeprovider-overview: `TimeProvider` overloads and `FakeTimeProvider`.
8. https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-test-mtp: `--minimum-expected-tests` whole-run vs per-module, exit 8/9, and the .NET 11 changes.
9. https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-with-dotnet-test: the `global.json` `test.runner` setting and the end of VSTest mode.
10. https://xunit.net/docs/getting-started/v3/microsoft-testing-platform: the `xunit.v3.mtp-v2` package matrix and filter switches.
11. https://github.com/dotnet/runtime/issues/29232: `WaitForExit` hangs on a grandchild-held pipe; closed with no API change.
12. https://github.com/actions/runner-images/blob/main/README.md: the authoritative runner labels; `macos-13` is gone and the Intel labels are listed.
13. https://github.com/actions/runner-images/issues/13518: `macos-14` unsupported from 2026-11-02.
14. https://github.com/actions/runner/blob/main/src/Misc/externals.sh: Alpine Node ships only for linux-x64, which rules out `container:` on arm64.
15. https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/troubleshooting-required-status-checks: skipped jobs report Success, which is why the gate uses `always()`.

### Consolidation verification log

Fixture root: `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/consolidate-csharp-crossplatform/`. SDK 10.0.401 via `run.sh`. `./run-all.sh` writes `evidence.txt`.

| # | Question settled | Red | Green |
|---|---|---|---|
| V1 | Merged ban pair + culture + MA0076 + CA1416 on both TFMs | `./b.sh gate/red`: 24 distinct diagnostics per TFM (RS0030 ×17 sites, CA1309, MA0076, CA1305, CA1310, CA1304+CA1311, CA1416), identical on net8.0 and net10.0, `build-exit=1` | `./b.sh gate/green`: `Build succeeded.`, `build-exit=0` |
| V2 | Is the `ReadOnlySpan` Combine line needed? | `./b.sh nospan/red` (ban file without it): `Bad.cs(10): error RS0030 [net8.0]` only, so the 5-argument call passes on net10.0 | With the line (V1): L10 flagged on both TFMs |
| V3 | RS0030 default severity; does `10.0-all` cover CA13xx? | `sev/b4.14.0` and `sev/b5.6.0` without a severity line or TWAE: `warning RS0030`, exit 0. `sev/lvl10.0-default` + TWAE: 0 diagnostics | `sev/lvl10.0-all` + TWAE: `error CA1062 CA1304 CA1305 CA1310 CA1311`, exit 1 |
| V4 | CS-BIN-03 vs the env-first home | `env -u OCX_HOME HOME=/tmp/no-such-home dotnet home.dll`: `red='.ocx' rooted=False` | `green='/tmp/no-such-home/.ocx' rooted=True` |
| V5 | MTP exit codes for the merged CI shape | `--blame-hang-timeout 5m` exit 5. Unconditional baked minimum: local unarmed exit 9 ([harness row 7](csharp-crossplatform/csharp-crossplatform-fake-cli-harness.md#11-verified-on-the-toolchain)) | `Condition="'$(CI)' == 'true'"`: local unarmed 0, `CI=true` unarmed 9, `CI=true OCX_SDK_CONTRACT=1` 0 |
| V6 | Merged workflow gate | `check-ci-matrix.sh` on the ci-matrix `bad`: 15 FAIL, exit 1. On ci-matrix's own `good`: R9 ×3 (`--blame-hang-timeout`), R10, R12, exit 1 | Merged `ci/good`: `OK all rules`, exit 0; `actionlint` exit 0 |
