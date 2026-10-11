---
title: "Launching the ocx child process from C#: argv, executable resolution, environment, secrets"
topic: csharp-process-launch-and-argv (group csharp-process, research-lang C# / .NET, wave 1)
agent: deep-dive researcher, subtopic csharp-process-launch-and-argv (sonnet subagent)
model: claude-sonnet-5-5
date_researched: 2026-10-10
sources_count: 26
scope: |
  Covers the LAUNCH half of a C# wrapper over the ocx CLI (net8.0 floor, net10.0 target, net11.0 RC1 flagged): ProcessStartInfo argv construction
  (ArgumentList vs Arguments), executable resolution and the cwd/PATH trust problem, the .cmd/.bat (BatBadBut) question, the child environment
  (copy semantics, scrub list, hermetic mode, HOME vs USERPROFILE, case rules), secrets on stdin and redaction, and the analyzers that enforce it.
  Windows claims were re-run on the Windows host (Windows 10.0.26200, SDK 10.0.102 / runtime 10.0.2, x64, ocx 0.6.3). Linux x64 (Fedora 43 on WSL2).
  NOT covered and NOT run: macOS, arm64 (any OS), net8.0 on Windows (host has only runtime 10.0.2). Not covered: stdout/stderr draining, cancellation,
  kill-tree, exit-code mapping, JSON parsing (other csharp-process subtopics).
---

# Launching the ocx child process from C#: argv, executable resolution, environment, secrets

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
  - [1. argv: ArgumentList, the string path, and what Windows really does](#1-argv-argumentlist-the-string-path-and-what-windows-really-does)
  - [2. Executable resolution: .NET searches your cwd first](#2-executable-resolution-net-searches-your-cwd-first)
  - [3. Typed launch failures: Win32Exception.NativeErrorCode](#3-typed-launch-failures-win32exceptionnativeerrorcode)
  - [4. A .cmd or .bat target: BatBadBut is real on .NET](#4-a-cmd-or-bat-target-batbadbut-is-real-on-net)
  - [5. Environment: copy semantics, scrub list, hermetic mode](#5-environment-copy-semantics-scrub-list-hermetic-mode)
  - [6. Secrets: stdin only, encoding, redaction](#6-secrets-stdin-only-encoding-redaction)
  - [7. Enforcement: BannedApiAnalyzers and Meziantou](#7-enforcement-bannedapianalyzers-and-meziantou)
  - [8. What the exemplars do (and what not to copy)](#8-what-the-exemplars-do-and-what-not-to-copy)
  - [9. Era notes: net8 floor, net10 target, net11 RC1](#9-era-notes-net8-floor-net10-target-net11-rc1)
  - [10. Verified on the toolchain](#10-verified-on-the-toolchain)
- [Normative guidance candidates](#normative-guidance-candidates)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

- Build every ocx argv with `ProcessStartInfo.ArgumentList` (or the .NET 8+ ctor `new ProcessStartInfo(file, IEnumerable<string>)`); never assign `ProcessStartInfo.Arguments`. Measured: string-join of 12 hostile args reaches the child as 19 args on Linux, Windows, .NET 8/10/11-rc1 and a Rust child; `ArgumentList` round-trips all 12 on every one.
- The string path is *technically* defensible only as a byte-faithful port of `PasteArguments` (green on Linux and Windows against .NET and Rust children), but net8+ has no reason to carry it; netstandard2.0 (the only reason exemplars keep it) is out of scope. Ban `Arguments` with RS0030, no exceptions.
- CliWrap #298 is not an escaping bug: the reporter's backslash arrived intact; `ArgumentsBuilder.Escape` is a copy of `PasteArguments`. A real string-path hazard is hand-rolled quoting (`"\"" + a + "\""`): 10 of 12 args corrupted, identically on both OSes.
- Never pass the bare name `ocx` as `FileName`. On Linux .NET probes the host app directory, then the **current directory**, then PATH (`ProcessUtils.Unix.cs:370-392`); on Windows `CreateProcess` probes the app directory, then the cwd, then System32 and PATH. A planted `./ocx` ran on net8 and net10 (Linux) and on Windows.
- Resolve once, to an absolute path, with your own scanner: skip the cwd entry on Windows, skip group/other-writable directories on POSIX, match the exact name `ocx` / `ocx.exe` only (no PATHEXT), then fall back to `$OCX_HOME/symlinks/ocx.sh/ocx/cli/current/content/bin/ocx[.exe]`.
- `psi.Environment["PATH"]` does **not** steer `FileName` lookup on either OS: the lookup reads the parent's PATH (measured Linux net8/net10 and Windows). Do not "fix" resolution by editing the child PATH.
- Refuse every `.cmd` / `.bat` target. .NET hands the command line to `CreateProcess`, which routes batch files through `cmd.exe`; `ArgumentList` quoting is the CRT rule, not the `cmd.exe` rule. Measured on Windows: `x&ver` ran `ver` (injection), `%USERNAME%` expanded inside quotes, `"&ver` broke the quoting. Same result via `Arguments`.
- A bare name never finds `ocx.cmd`: `Process.Start("t")` with `t.cmd` on PATH throws `Win32Exception` `NativeErrorCode=2` on Windows (PATHEXT is not consulted). Accept only the exact file `ocx.exe` on Windows.
- Map launch failure by `Win32Exception.NativeErrorCode` around `Process.Start` only: 2 and 3 not found, 5 and 13 access, 193 bad format, 206 (Windows) / 7 (Linux) argv too long; a directory as `FileName` gives code `0` on Linux and `5` on Windows, so a `== 2` test alone misses it.
- Windows caps the command line near 32,767 UTF-16 chars (32,000 started, 32,700 failed with 206); Linux caps a single argument near 128 KiB (130,000 ok, 140,000 failed with 7). Pre-check the built length and fail with a typed error.
- `ProcessStartInfo.Environment` is a snapshot copy of the parent environment taken at first access: later parent changes do not appear, child edits never touch the parent, keys are `OrdinalIgnoreCase` on Windows and `Ordinal` elsewhere (`ProcessStartInfo.cs:94-117`). Scrub case-insensitively; never call `Environment.SetEnvironmentVariable`.
- Scrub `OCX_PROJECT`, `OCX_GLOBAL`, `OCX_QUIET`, `OCX_NO_VERIFY`, `OCX_NO_HOOK`, `OCX_NO_COMPLETIONS` and `CLICOLOR_FORCE` from every child, **and** send `--format json --color never`. Real ocx 0.6.5: ambient `OCX_QUIET=1` gave exit 0 with **0 bytes** of JSON; ambient `CLICOLOR_FORCE=1` put ANSI escapes inside the JSON on stdout (80 bytes, invalid JSON).
- Hermetic mode is `OCX_NO_CONFIG=1` plus a private `OCX_HOME`; the ocx docs say a SYSTEM-scope config still loads under `OCX_NO_CONFIG=1`, so hermetic is "no ambient user config", not "no config at all".
- Derive the default ocx home from `Environment.GetFolderPath(Environment.SpecialFolder.UserProfile)`, never from `HOME`: on a stock Windows box `HOME` is unset while `GetFolderPath` still returns `USERPROFILE` (measured). ocx itself uses `%USERPROFILE%\.ocx`.
- Secrets travel on stdin only (`login --password-stdin`, `package sign|attest --identity-token-stdin`): with the password in argv an unrelated observer read it from `/proc/<pid>/cmdline` and from `Win32_Process.CommandLine`; with stdin both were clean.
- Set `StandardInputEncoding = new UTF8Encoding(false)` or write bytes to `StandardInput.BaseStream`. `Encoding.UTF8` prepends `EF BB BF` (both OSes) and the Windows default is the console code page (`pässwörd→世` became 10 bytes `70 84 73 73 77 94 72 64 1A 3F`): a silent wrong secret.
- A C# `record` prints every member in `ToString()`: `Secret { User = u, Token = s3cr3t... }`. Override `PrintMembers` (or never model the secret as a record member). `Win32Exception.Message` carries file name and cwd but never arguments (measured), so keep argv out of your own exception messages.
- Enforce with BannedApiAnalyzers 5.6.0: `P:System.Diagnostics.ProcessStartInfo.Arguments`, `M:...ProcessStartInfo.#ctor(System.String,System.String)`, `M:...Process.Start(System.String,System.String)` all fire RS0030 (warning by default, set `error`). RS0030 is **silent** if `BannedSymbols.txt` is not an `<AdditionalFiles>` item. Meziantou MA0161/MA0162 are off by default (Info); MA0163 is on (Warning).
- `ProcessStartInfo.KillOnParentExit`, `StartDetached` and `SafeProcessHandle.Start(ProcessStartInfo)` exist only in .NET 11 (CS0117 on net8 and net10); `KillOnParentExit` is `android/linux/windows` only (CA1416). `new ProcessStartInfo(string, IEnumerable<string>)` and `Process.Start(string, IEnumerable<string>)` exist since .NET 8.

## Findings

Evidence tags: **[run]** observed on this toolchain (see section 10), **[src]** read in dotnet/runtime `main@0e45f6c8d90d` (fetched 2026-10-10), **[doc]** read on learn.microsoft.com, **[ex]** exemplar file:line.

### 1. argv: ArgumentList, the string path, and what Windows really does

**1.1 What the runtime does with each property.**

- `ArgumentList` and `Arguments` are independent and mutually exclusive: setting both throws `InvalidOperationException` (`dotnet/runtime@0e45f6c8d90d:src/libraries/System.Diagnostics.Process/src/System/Diagnostics/ProcessStartInfo.cs:448-451`). The docs say `ArgumentList` "escapes the provided arguments and internally builds a single string" and "if you aren't sure how to properly escape your arguments, you should choose `ArgumentList`" [[doc](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.processstartinfo.argumentlist?view=net-10.0)].
- Windows: both paths end as one command-line string. `ArgumentList` entries go through `PasteArguments.AppendArgument` (`ProcessStartInfo.cs:410-418`); `Arguments` is appended verbatim (`:419-427`). `BuildCommandLine` quotes the file name unless already quoted (`ProcessUtils.Windows.cs:32-54`), and `CreateProcess` is called with `lpApplicationName = null` (`SafeProcessHandle.Windows.cs:400-401`).
- Linux/macOS: no string at all. `ParseArgv` copies `ArgumentList` straight into argv (`ProcessUtils.Unix.cs:324-327`), but *re-parses* a string `Arguments` with MSVC rules (`ParseArgumentsIntoList`, `:407-419`). This is why CliWrap's string output round-trips on Linux: Paste and Parse are inverses.
- `PasteArguments` rules (`System.Private.CoreLib/src/System/PasteArguments.cs:17-22`): backslash is literal except before a quote; `2N` backslashes + quote = N backslashes + a real quote; `2N+1` = N backslashes + literal quote; an argument with whitespace or a quote is wrapped in quotes and trailing backslashes are doubled (`:44-48`).
- The runtime treats arguments as trusted: "Per .NET's published security baselines, process arguments are trusted ... The checks below are purely hygienic" (`ProcessStartInfo.cs:453-455`); it rejects only NUL (`:456-475`) and null entries.

**1.2 Is any string-quoting path defensible?** Only a faithful `PasteArguments` port. Observed with a port (`Paste` in the fixture) on 12 hostile args (`a b`, `"q"`, `back\\`, `trail\`, empty string, `héllo → 世界`, `x y\`, `a\"b`, `--flag=va lue`, `C:\Program Files\x\`, tab, `$HOME *`): green on Linux net10 and net8, Windows net10, with a .NET child and with a Rust child (`std::env::args`). Everything else is red:

```csharp
// INCORRECT: string-join. Child saw 19 args for 12 sent (Linux, Windows, net8/10/11rc, Rust child)
psi.Arguments = string.Join(" ", args);

// INCORRECT: hand quoting. 10 of 12 mismatches: "q" -> q ; trail\ swallows the next arg's quote ;
// the empty string collapses ; back\\ -> back\
psi.Arguments = string.Join(" ", args.Select(a => "\"" + a + "\""));

// CORRECT (net8+): no quoting code in the SDK at all
foreach (var a in args) psi.ArgumentList.Add(a);
// ALSO CORRECT (net8+): the (string, IEnumerable<string>) constructor, same semantics
var psi = new ProcessStartInfo(exe, args) { UseShellExecute = false };
```

The 3 of 10 vs 10 of 10 exemplar split in the brief is explained by one fact: libraries that target netstandard2.0 have no `ArgumentList` (CS1061, `exemplar-cli-wrappers-and-sdks.md` fixture ns20). A net8+ SDK has no such constraint. Decision: **string `Arguments` is never allowed**; the SDK contains no quoting code.

**1.3 CliWrap #298 (the "backslash bug").** Reporter: `WithArguments(..., true)` with the systemd unit `exports-backup\x2dsql.mount`; expected the backslash to be escaped. Maintainer's answer: "It's an escape character only in the shell, not within the actual command line"; the reporter's own test showed the argument arrived unchanged, and the issue was closed as completed with no code change [[CliWrap#298](https://github.com/Tyrrrz/CliWrap/issues/298)]. `Tyrrrz__CliWrap@7dbc252fa773:CliWrap/Builders/ArgumentsBuilder.cs:135` (`Escape`) is a transcription of `PasteArguments`, with a source comment pointing at the same runtime file. Measured: a lone backslash not before a quote is passed through untouched by both the Windows CRT rules and .NET's Unix re-parse (`back\\` and `C:\Program Files\x\` rows green in `pasted` and `argumentlist` modes). The lesson for the SDK is narrower than the brief implies: do not conclude "backslashes need escaping"; conclude "do not own an escaper".

**1.4 What must any string escaper escape (for the record).** Whitespace and `"` trigger quoting; before a `"` or at end of a quoted argument, backslash runs double; `"` becomes `\"`; the empty string becomes `""` (PasteArguments `:23`, `:44-55`). That is the entire CRT/CommandLineToArgvW contract and it is **not** the `cmd.exe` contract (section 4).

**1.5 Argument-count limits are launch errors, not argv bugs.** [run] Windows: 32,000-char argument started; 32,700 threw `Win32Exception` `NativeErrorCode=206` "The filename or extension is too long." (`CreateProcess` documents 32,767 chars including the terminator [[doc](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-createprocessw)]). Linux: 130,000 chars ok; 140,000 threw `NativeErrorCode=7` "Argument list too long". An `ocx` verb that takes many package refs can reach the Windows limit first.

### 2. Executable resolution: .NET searches your cwd first

**2.1 What `FileName = "ocx"` does.**

- Linux/macOS (`ProcessUtils.Unix.cs:352-398`): a rooted path is used as-is "regardless of whether it exists" (`:363-368`); otherwise (1) the directory of `Environment.ProcessPath` (`:370-382`), (2) `Directory.GetCurrentDirectory()` (`:384-389`), (3) each directory of the **parent's** `PATH` (`:391-392`, `FindProgramInPath` reads `Environment.GetEnvironmentVariable("PATH")` at `:63`). The comment at `:354-360` says it follows the Windows `CreateProcess` order.
- Windows: `CreateProcess(null, "\"ocx\" ...")`: the file name has ".exe" appended if it has no extension; with no directory component the system searches (1) the application directory, (2) "the current directory for the parent process", (3) System32, (4) the 16-bit system dir, (5) the Windows dir, (6) `PATH` [[doc](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-createprocessw)].
- CWE-426 (Untrusted Search Path) names the fixes: use fully-qualified paths, "remove unsafe elements such as the current working directory" from the search path, clean `PATH` [[CWE-426](https://cwe.mitre.org/data/definitions/426.html)].

**2.2 Measured.** Fixture `resolve`: cwd contains a copy of the dummy exe named `ocx`; PATH holds a world-writable dir `loose/` then `good/`. [run]

```text
bare-name  (net10, Linux)   exe=<tmp>/planted/ocx          RESULT RED ranFromCwd=True
bare-name  (net8,  Linux)   exe=<tmp>/planted/ocx          RESULT RED ranFromCwd=True
bare-name  (net10, Windows) exe=...\planted\ocx.exe        RESULT RED ranFromCwd=True
resolve-once (own scanner)  exe=<tmp>/good/ocx             RESULT GREEN   (cwd skipped, world-writable dir skipped)
psi.Environment["PATH"]=loose with parent PATH=good, FileName="ocx":
                            exe=.../good/ocx (Linux) and ...\good\ocx.exe (Windows)   RED: child PATH ignored
```

CliWrap reproduces the same probe order *on purpose* for `.cmd` support (`Tyrrrz__CliWrap@7dbc252fa773:CliWrap/Command.Execution.cs:40-63`, working directory yielded at `:55-56`), so adopting its resolution adopts the cwd hit.

**2.3 The policy (decided).** Resolve **once**, at SDK-handle construction, to an absolute path that is then the only value ever assigned to `ProcessStartInfo.FileName`. Per-call PATH lookup re-opens the race between check and use and re-reads a PATH the host can mutate. Order, mirroring the Python reference (`ocx-sdk-python@80136dde4162:src/ocx_sdk/_bootstrap.py:245-292`, scanner `:430-484`):

1. explicit option path (must exist; rooted);
2. an `OCX_SDK_EXE`-style override (name is the SDK's choice);
3. PATH scan, entry by entry, over the *SDK-captured* PATH string: absolute entries only; resolve a relative entry against the cwd *and then* compare, so `.` cannot sneak past the cwd test (`_bootstrap.py:430-465` docstring); skip a hit whose directory equals the cwd on Windows; skip a hit whose real parent directory has `S_IWGRP|S_IWOTH` on POSIX (`_bootstrap.py:467-484`); exact file name `ocx` (POSIX) / `ocx.exe` (Windows), no PATHEXT;
4. ocx's own stable symlink `$OCX_HOME/symlinks/ocx.sh/ocx/cli/current/content/bin/ocx[.exe]` with `$OCX_HOME` defaulting to `<UserProfile>/.ocx` (`ocx@5de9d777eb7d:website/src/docs/reference/environment.md:293-296`). [run] on this host `which ocx` is that symlink path and `readlink -f` lands in `~/.ocx/packages/ocx.sh/sha256/85/.../content/bin/ocx`, i.e. `current` is a symlink into the content-addressed store.

Pin decision for tier 4: keep the symlink path as found (so a later `ocx self update`, which repoints `current`, does not strand a pinned content-addressed path) and `File.Exists`-check at construction; for PATH hits pin the resolved target like the Python SDK (`ResolveLinkTarget(true)`). The "update repoints current" step is inferred from the symlink structure, not observed. Also export `OCX_BINARY_PIN=<pinned path>` to the child, as the Rust SDK does; the ocx docs say the running ocx sets it on every subprocess it spawns (`environment.md:192-194`).

**2.4 PATHEXT and the exact name.** [run] `Process.Start("t")` with `t.cmd` first on PATH threw `Win32Exception` `NativeErrorCode=2` on Windows for all six payloads: .NET does not consult PATHEXT and `CreateProcess` only appends `.exe`. CliWrap documents the same limitation in its own source (`CliWrap/Command.Execution.cs:18-20`: "Process.Start("foo") will work if it's an EXE file, but will fail if it's a BAT or CMD file, even if it's on the PATH"). SimpleExec works around it by reading `PATHEXT` and accepting `.exe/.bat/.cmd` (`adamralph__simple-exec@f80913246993:src/SimpleExec/Command.cs:449-479`, `:462`); an ocx SDK must **not** copy that (section 4). The ocx contract audit already records "the generated runtime looks for the exact file name only (`ocx.exe` on Windows never matches a bare `ocx`) on absolute PATH entries only" (`csharp-audit/ocx-cli-contract.md:108`).

**2.5 Working directory.** With an absolute `FileName` the cwd no longer affects *which* binary runs, but ocx walks the cwd for `ocx.toml` project discovery (`ocx-sdk-python@80136dde4162:src/ocx_sdk/_client.py:128` `_PROJECT_FILE = "ocx.toml"`). Always set `ProcessStartInfo.WorkingDirectory` explicitly per call.

### 3. Typed launch failures: Win32Exception.NativeErrorCode

`Process.Start` signals launch failure with `Win32Exception` built by `CreateExceptionForErrorStartingProcess(message, errorCode, fileName, workingDirectory)` (`ProcessUtils.cs:21-26`): message = "An error occurred trying to start process '<file>' with working directory '<cwd>'. <OS message>", `NativeErrorCode` = the OS code. It never contains `Arguments` [run]. Observed:

| Input | Linux (net10) | Windows (net10) |
|---|---|---|
| bare name not found | `NativeErrorCode=2` | `2` (ERROR_FILE_NOT_FOUND) |
| absolute path in missing dir | `2` | `2` |
| existing text file | `13` (EACCES, "Permission denied") | `193` (ERROR_BAD_EXE_FORMAT) |
| a directory | **`0`**, message "The FileName property should not be a directory unless UseShellExecute is set." | `5` (ERROR_ACCESS_DENIED) |
| argv too long | `7` (E2BIG) | `206` (ERROR_FILENAME_EXCED_RANGE) |

Win32 meanings are from the system error code table [[doc](https://learn.microsoft.com/en-us/windows/win32/debug/system-error-codes--0-499-)]: 2 file not found, 3 path not found, 5 access denied, 193 "%1 is not a valid Win32 application", 206 filename or extension too long.

```csharp
// INCORRECT: swallows everything; "ocx missing" is reported for a bad permission, a bad arch, a too-long argv...
try { Process.Start(psi); } catch (Exception) { throw new OcxNotFoundException(); }

// CORRECT: catch only the launch call, branch on NativeErrorCode, keep the original as InnerException
try { process = Process.Start(psi); }
catch (Win32Exception e) when (e.NativeErrorCode is 2 or 3)          { throw new OcxNotFoundException(exe, e); }
catch (Win32Exception e) when (e.NativeErrorCode is 5 or 13)         { throw new OcxNotExecutableException(exe, e); }
catch (Win32Exception e) when (e.NativeErrorCode is 193 or 8)        { throw new OcxBadFormatException(exe, e); }   // 8 = ENOEXEC; 193 = Windows
catch (Win32Exception e) when (e.NativeErrorCode is 206 or 7)        { throw new OcxArgvTooLongException(e); }
```

(`8`/ENOEXEC was not provoked in the fixture; the Linux bad-format row above came back as `13`. Treat 193 and 13 as the observed pair and 8 as defensive.) Because the SDK pins an absolute path and checks `File.Exists` at construction, `2` at launch time means "removed after discovery", a distinct, rarer case worth its own message.

### 4. A .cmd or .bat target: BatBadBut is real on .NET

**4.1 Mechanism.** `CreateProcess` starts batch files by routing them through `cmd.exe`, whose argument parsing differs from the CRT's, so a runtime that escapes for the CRT is bypassable. This is BatBadBut [[flatt.tech](https://flatt.tech/research/posts/batbadbut-you-cant-securely-execute-commands-on-windows/)]: "the `cmd.exe` has different escaping rules compared to the usual escaping mechanism"; backslash-escaping quotes is insufficient and caret-escaping alone is insufficient because `cmd.exe` expands variables first (`%CMDCMDLINE:~-1%` yields a `"`). The research lists Rust, Node.js, PHP, Haskell as patched, Go/Python/Ruby/Erlang as docs-only, Java as won't-fix; **.NET is not mentioned**. The assigned CVE, CVE-2024-24576, is Rust's standard library (fixed in Rust 1.77.2: where `Command` cannot escape safely it now returns `InvalidInput`) [[Rust blog](https://blog.rust-lang.org/2024/04/09/cve-2024-24576/)]. I found no .NET advisory and no dotnet/runtime issue (searched GitHub issues and the web 2026-10-10); the runtime's own stance is "arguments are trusted" (`ProcessStartInfo.cs:453-455`), and the CreateProcess doc says "To run a batch file, you must start the command interpreter" [[doc](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-createprocessw)].

**4.2 Measured on Windows (net10, 10.0.26200).** Target `t.cmd` = `@echo off` / `echo ARG1=[%1]`, one argument per run, via `ArgumentList` and (identical) via the `Paste`d string: [run]

| payload | outcome |
|---|---|
| `&echo pwned` | **safe**: contains a space, so PasteArguments quotes it; output `ARG1=["&echo pwned"]` |
| `x&ver` | **injected**: no whitespace, no quote, so it is emitted bare; `cmd.exe` ran `ver` and printed `Microsoft Windows [Version 10.0.26200.9457]` |
| `a^&ver` | **injected** (same) |
| `"&ver` | quoting broken: `'ver"' is not recognized as an internal or external command` (cmd tried to execute the tail) |
| `%USERNAME%` | **expanded** to `ecom` even in the quoted position (data/secret exfil channel) |
| `ok` | fine |

So the brief's own example `&echo pwned` is *not* the dangerous one; whitespace-free payloads are. The guard twin refuses the target before launching: `RESULT GREEN ... (never launched)`.

```csharp
// INCORRECT: "works on my machine" for ocx.exe, silently becomes cmd.exe parsing for a shim
var psi = new ProcessStartInfo(@"C:\tools\ocx.cmd") { ArgumentList = { userSuppliedRef } };

// CORRECT: refuse, once, in the resolver and again at the launch seam (exe may come from user config)
static void RejectBatch(string exe)
{
    var ext = Path.GetExtension(exe);
    if (ext.Equals(".cmd", StringComparison.OrdinalIgnoreCase) || ext.Equals(".bat", StringComparison.OrdinalIgnoreCase))
        throw new OcxLaunchException($"batch target refused: {Path.GetFileName(exe)}");
}
```

PowerShell is the exemplar that keeps a *raw* path for exactly these targets: legacy extension set `.js .wsf .cmd .bat .vbs` and commands `cmd cscript find sqlcmd wscript` use `startInfo.Arguments = <user string>` while everything else uses `ArgumentList` (`PowerShell__PowerShell@5d871eb5e02c:src/System.Management.Automation/engine/NativeCommandProcessor.cs:202-222`, `:1587-1593`, `:1678-1697`, `:1737-1746`). That is correct for a shell whose user typed the text; it is not a model for an SDK that receives structured values. Decision: refuse; no escape hatch, because no complete `cmd.exe` escaper exists (Rust's maintainers reached the same conclusion).

### 5. Environment: copy semantics, scrub list, hermetic mode

**5.1 Copy semantics (`ProcessStartInfo.cs:94-117`) [src][run].** First access to `psi.Environment` snapshots `Environment.GetEnvironmentVariables()` into a new dictionary (`OrdinalIgnoreCase` on Windows, `Ordinal` otherwise, `:104`). Observed: `child sees SNAP_A=child-only; parent still SNAP_A=parent-before`; a variable set in the parent after the first access is absent (`snapshot has SNAP_B? False`); the second access returns the same instance; `null` values are accepted (they are dropped from the block, `ProcessUtils.Windows.cs:108-112`). Windows `lookup 'snap_a'` hit = True, Linux = False. `UseShellExecute = true` plus an edited `Environment` throws at `Start` [[doc](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.processstartinfo.environment?view=net-10.0)]. On Windows the block is sorted case-insensitively before the call (`ProcessUtils.Windows.cs:93-119`).

Consequence: all env policy is `psi.Environment` edits made on a fresh `ProcessStartInfo`. Never `Environment.SetEnvironmentVariable` (process-global, racy, and invisible to a snapshot already taken).

**5.2 The scrub list and why each member.** From the ocx contract audit and the references (`csharp-audit/ocx-cli-contract.md:82`, `ocx-sdk-python@80136dde4162:src/ocx_sdk/_env.py:53-60`, `:153`):

| Variable | Effect if inherited | Evidence |
|---|---|---|
| `OCX_QUIET` | suppresses the structured stdout report (docs `environment.md:874-879`) | [run] real ocx: exit 0, stdout 0 bytes |
| `CLICOLOR_FORCE` | ANSI in output even when piped | [run] real ocx 0.6.5: 80 stdout bytes with ESC, invalid JSON |
| `OCX_NO_VERIFY` | skips policy-gated signature verification on install/pull (`environment.md:840-846`); the per-command flag outranks it | by reading; documented fail-open |
| `OCX_PROJECT`, `OCX_GLOBAL` | repoints project/global scope for every call | [run] Windows ocx 0.6.3 with `OCX_PROJECT=C:\evil`: exit 79, stdout 0 bytes |
| `OCX_NO_HOOK`, `OCX_NO_COMPLETIONS` | interactive-shell affordances; scrubbed by the Python SDK | Python `_env.py:53-60` docstring rationale |

Real-binary results: ocx 0.6.5 (Linux) `OCX_QUIET=1 CLICOLOR_FORCE=1 OCX_NO_VERIFY=1`, command `ocx --json --offline index list zz`: `exit=0 stdout-bytes=0 valid-json=False` (inherit) vs `exit=0 stdout-bytes=15 valid-json=True` (scrub). Windows ocx 0.6.3 with `OCX_QUIET=1 CLICOLOR_FORCE=1`: `exit=0 stdout-bytes=0` vs `stdout-bytes=15 valid-json=True`. A flag also fixes the colour half: `CLICOLOR_FORCE=1 ocx --json --color never ...` printed clean JSON, because `--color` outranks the env (`ocx-cli-contract.md`, colour precedence `color_mode.rs:102-110`). Do both; the flag is the contract, the scrub is belt and braces and the only fix for `OCX_QUIET`, which has no flag-off.

**5.3 Case rules (Python smell S8).** [run] Linux: a parent exporting lowercase `ocx_quiet=lower` survives `psi.Environment.Remove("OCX_QUIET")` (`exact-remove` mode `leaked=1`), and passes `OrdinalIgnoreCase` scrubbing (`leaked=0`). Windows: `Remove("OCX_QUIET")` already removes `ocx_quiet` because the dictionary is case-insensitive (`exact-remove` `leaked=0`). ocx treats names case-sensitively on Linux, so the Linux lowercase variable is not read by ocx; over-dropping it is the cheap direction (the Python module states the same rule, `_env.py` module docstring "D14"). Scrub with `StringComparison.OrdinalIgnoreCase` on every OS; it is correct on Windows and harmless on Linux.

```csharp
// INCORRECT on Linux (lowercase spelling survives); a Windows-only mental model
foreach (var k in Scrubbed) psi.Environment.Remove(k);

// CORRECT: case-insensitive on every OS, over-dropping is the safe direction
foreach (var key in psi.Environment.Keys.ToArray())
    if (Scrubbed.Contains(key, StringComparer.OrdinalIgnoreCase)) psi.Environment.Remove(key);
```

**5.4 Baseline applied to every call (decided).**

1. `psi.UseShellExecute = false`; `CreateNoWindow = true`; all of stdin/stdout/stderr redirected (stdin always, closed immediately when unused: `login` is the one ocx command that prompts, and a non-TTY without `--password-stdin` is exit 64 per `ocx-cli-contract.md:93`; an inherited terminal stdin would instead block on a prompt. That last step is by reading, not run).
2. Absolute `FileName` (section 2), explicit `WorkingDirectory`.
3. argv prefix `--format json --color never` for typed calls (Python `_JSON`, `_client.py:119`), `--` before child argv for `exec` (`_process.py:195`).
4. Env: inherit the host environment, then remove the scrub set case-insensitively, then set explicit SDK values. Keep `PATH`, `USERPROFILE`/`HOME`, `SYSTEMROOT`, `TEMP`, `APPDATA`, `LOCALAPPDATA`, proxy and CA variables untouched; the Python `HostEnv.minimal()` drops `USERPROFILE`/`LOCALAPPDATA`/`APPDATA`/`PATHEXT` (smell S7), do not copy that.
5. Set `OCX_NO_UPDATE_CHECK=1` (the Python SDK writes it either way, `_env.py:250`; background checks are already gated off for piped stderr, `ocx-cli-contract.md` background-check note, so this is belt and braces) and `OCX_BINARY_PIN=<pinned path>`.
6. Hermetic option: `OCX_NO_CONFIG=1` plus a caller-supplied private `OCX_HOME`. [run] real ocx with both set and the scrub list: valid JSON; on Linux ocx 0.6.5 created `state/` inside the private home (`OCX_HOME-children=1`), on Windows ocx 0.6.3 created nothing for this verb. Caveat from the docs: `OCX_NO_CONFIG` does not suppress a SYSTEM-scope `/etc/ocx/config.toml` (`environment.md:699-705`).

The stricter alternative (drop every `OCX_*`/`__OCX_*` and re-add an allow-list, the Rust SDK's approach, `ocx-cli-contract.md:82`) is robust to variables added later; see Contested.

**5.5 HOME vs USERPROFILE (Python smell S7).** [run] With `HOME` unset (`set HOME=` in the Windows shell) the child printed `HOME=<unset> USERPROFILE=C:\Users\ecom GetFolderPath(UserProfile)=C:\Users\ecom`. This host exports a persistent user-level `HOME` (found in `HKCU\Environment`), so the unset case needed the explicit `set HOME=`. ocx resolves its home as `$OCX_HOME`, else `~/.ocx` on every OS via `std::env::home_dir`, i.e. `%USERPROFILE%` on Windows, deliberately not `dirs::home_dir` (`ocx-cli-contract.md:83`). C#: `Environment.GetFolderPath(Environment.SpecialFolder.UserProfile)` matches; `Environment.GetEnvironmentVariable("HOME")` does not.

### 6. Secrets: stdin only, encoding, redaction

**6.1 Where secrets may go.** ocx has exactly three secret-bearing arguments, all with stdin forms: `login --password-stdin`, `package sign --identity-token-stdin`, `package attest --identity-token-stdin` (`ocx-cli-contract.md:93`; confirmed in `ocx login --help` / `ocx package sign --help` on 0.6.5: "Read password/token from stdin. Required in non-interactive contexts"). CWE-214 covers the weakness: sensitive data in "command-line arguments, environment variables, or other elements that other processes on the system can see" [[CWE-214](https://cwe.mitre.org/data/definitions/214.html)]. [run] a child sleeping with the password in argv: observer on Linux read `/proc/<pid>/cmdline` = `... echoargv --sleep s3cr3t-PASSWORD-xyz`; observer on Windows read `(Get-CimInstance Win32_Process).CommandLine` with the same token; the stdin twin showed `--sleep --stdin` only (both OSes). Credentials ocx reads from the environment (`OCX_AUTH_<SLUG>_{TYPE,USER,TOKEN}`, `OCX_IDENTITY_TOKEN`, `OCX_KEY_PASSWORD`, `OCX_SIGNING_KEY`, `OCX_ANNOUNCE_TOKEN`, `OCX_ANNOUNCE_GIT_TOKEN`; 10 secret variables in `cli.json`, `ocx-cli-contract.md:79,82`) necessarily live in the child environment; keep them there only, never in argv.

**6.2 The stdin encoding trap.** [run, both OSes] sending `pässwörd→世` (UTF-8 bytes `70 C3 A4 73 73 77 C3 B6 72 64 E2 86 92 E4 B8 96`, 16 bytes):

| `StandardInputEncoding` | Linux | Windows |
|---|---|---|
| unset | 16 bytes, correct | **10 bytes `70847373779472641A3F`** (console code page 437: `ä`=0x84, `ö`=0x94, `→`=0x1A, `世`=`?`) |
| `Encoding.UTF8` | **19 bytes, `EF BB BF` prefix** | **19 bytes, BOM prefix** |
| `new UTF8Encoding(false)` | 16 correct | 16 correct |
| raw bytes to `StandardInput.BaseStream` | 16 correct | 16 correct |

The Windows default comes from the console code page (`Process.Windows.cs` `GetStandardInputEncoding`/`GetStandardOutputEncoding` call `GetEncoding((int)Interop.Kernel32.GetConsoleOutputCP())` per the fetched source; the observed bytes are CP437). A wrong password is a *silent* failure (auth error), the worst kind.

```csharp
// INCORRECT (BOM) and INCORRECT (Windows default: console code page)
psi.StandardInputEncoding = Encoding.UTF8;
// CORRECT
psi.StandardInputEncoding = new UTF8Encoding(encoderShouldEmitUTF8Identifier: false);
await process.StandardInput.WriteAsync(secret); process.StandardInput.Close();
// ALSO CORRECT: bytes, no encoder in the loop
await process.StandardInput.BaseStream.WriteAsync(new UTF8Encoding(false).GetBytes(secret));
```

**6.3 Redaction surfaces.** (a) Records: [run] `record Secret(string User, string Token)` prints `Secret { User = u, Token = s3cr3t-PASSWORD-xyz }`; `PrintMembers(StringBuilder)` overridden to print `Token = ***` is clean (the `private bool PrintMembers(StringBuilder)` override of a sealed record). (b) Exceptions: [run] `Win32Exception.Message` for a failed launch contains the file name and cwd, never `ArgumentList`; your own `OcxException` must follow suit (print the verb, not the argv). (c) Logs and captured stderr: ocx can echo credentials at trace level; the Python SDK redacts every `OCX_AUTH_*_TOKEN`, the base64 of `user:token` (the `Authorization: Basic` form), and the three forge tokens from errors, `on_log` and logged argv (`ocx-sdk-python@80136dde4162:src/ocx_sdk/_env.py:161-200,472`). Nuke's equivalent is a plain `string.Replace(secret, "[REDACTED]")` over output (`nuke-build__nuke@27e8077b8ab0:source/Nuke.Tooling/ToolTasks.Run.cs:20-21`) which misses encoded forms and over-redacts short secrets; the Python set-of-forms design is the better template.

### 7. Enforcement: BannedApiAnalyzers and Meziantou

**7.1 RS0030 (Microsoft.CodeAnalysis.BannedApiAnalyzers 5.6.0).** Entries are documentation-comment IDs in `BannedSymbols.txt`, optionally `;message`; the file must be an `AdditionalFiles` item [[Help.md](https://github.com/dotnet/roslyn/blob/main/src/RoslynAnalyzers/Microsoft.CodeAnalysis.BannedApiAnalyzers/BannedApiAnalyzers.Help.md)]. Verified file:

```text
// BannedSymbols.txt
P:System.Diagnostics.ProcessStartInfo.Arguments;Use ProcessStartInfo.ArgumentList (no string quoting).
M:System.Diagnostics.ProcessStartInfo.#ctor(System.String,System.String);Use new ProcessStartInfo(fileName) + ArgumentList.
M:System.Diagnostics.Process.Start(System.String,System.String);Use Process.Start(ProcessStartInfo) with ArgumentList.
M:System.Diagnostics.Process.Start(System.String,System.String,System.Security.SecureString,System.String);Use Process.Start(ProcessStartInfo).
M:System.Environment.SetEnvironmentVariable(System.String,System.String);Mutate ProcessStartInfo.Environment, never the SDK host process.
```

[run] on `net10.0`, SDK 10.0.401: RS0030 fired on the object-initializer assignment (`Bad.cs(6,48)`), the `(string,string)` constructor (`(7,18)`), the setter statement (`(9,9)`), `Process.Start(string,string)` (`(10,9)`) and `SetEnvironmentVariable`; it did **not** fire on `new ProcessStartInfo("ocx", new[]{...})`, the safe `(string, IEnumerable<string>)` ctor. A single `P:` entry bans getter and setter together. Default severity is Warning (build exit 0 with 7 warnings); with `dotnet_diagnostic.RS0030.severity = error` in `.editorconfig` the red project fails (`build-exit=1`) and the twin passes (`build-exit=0`). **Omit the `<AdditionalFiles Include="BannedSymbols.txt" />` line and RS0030 never fires** (red project still fails, but only on MA0161/62/63; zero RS0030 lines): a false-green an agent can create by deleting one csproj line.

**7.2 Meziantou.Analyzer 3.0.297.** `ProcessStartAnalyzer.cs:8-36` (`meziantou__Meziantou.Analyzer@161b7e948ad3`) and the README table: MA0161 "UseShellExecute must be explicitly set" Info, **disabled by default**; MA0162 "Use Process.Start overload with ProcessStartInfo" Info, **disabled by default**; MA0163 "UseShellExecute must be false when redirecting standard input or output" Warning, **enabled by default**. [run] defaults: only MA0163 fired (`Bad.cs(12,18)`, a `RedirectStandardOutput = true` initializer without `UseShellExecute`); MA0161 and MA0162 stayed silent until set to `error`, then fired at `Bad.cs(7,18)` (ctor without the property) and `(10,9)` / `Bad2.cs(6,23)`. MA0162 also flags `Process.Start(string, IEnumerable<string>)` (`Bad2.cs`), so it is stricter than RS0030 on the safe overload; keep it, because the SDK has exactly one launch seam. MA0161/MA0163 do not catch `UseShellExecute = true` with no redirection (`Bad.cs:11` stays clean), so the grep rule is still needed.

### 8. What the exemplars do (and what not to copy)

| Exemplar | Launch behaviour | Take / leave |
|---|---|---|
| `adamralph__simple-exec@f80913246993` | `ArgumentList.Add` loop, `UseShellExecute=false`, env via `Action<IDictionary>` (`src/SimpleExec/Internal/ProcessStartInfoExtensions.cs:30-38`); Windows `Resolve` reads PATHEXT, accepts `.exe/.bat/.cmd` (`Command.cs:449-479`) | take the argv + env shape; leave the `.cmd/.bat` resolution |
| `Tyrrrz__CliWrap@7dbc252fa773` | string `Arguments` built by `Escape` = PasteArguments copy (`Builders/ArgumentsBuilder.cs:135`; `Command.Execution.cs:405-413`); `Environment.Remove` for null values (`:450-463`); cwd probe (`:40-63`) | leave the string layer and the cwd probe; the null-removes-variable idiom is right |
| `madelson__MedallionShell@e45f1f6ffd4c` | `CommandLineSyntax.CreateArgumentString` into `Arguments` (`MedallionShell/Shell.cs:41-45`) | leave (dormant, netstandard-era) |
| `pulumi__pulumi-dotnet@2a0dca84f09b` | `Cli.Wrap("pulumi").WithArguments(PulumiArgs(...), escape: true)` bare name (`sdk/Pulumi.Automation/Commands/LocalPulumiCommand.cs:349`) | leave bare-name launch |
| `nuke-build__nuke@27e8077b8ab0` | `Arguments = arguments` string (`Nuke.Tooling/ProcessTasks.cs:147-157`); `Environment.Clear()` whenever a dictionary is passed (`:159-164`, would drop PATH/SYSTEMROOT); secret filter `[REDACTED]` (`ToolTasks.Run.cs:20-21`) | leave all three; `Clear()` is a Windows foot-gun |
| `PowerShell__PowerShell@5d871eb5e02c` | `ArgumentList` default, raw string only for `.cmd/.bat/.js/.wsf/.vbs` and five command names (`NativeCommandProcessor.cs:1678-1697`); edits to `Environment` force `UseShellExecute=false` (`:750-751`) | take the "list by default" principle; the legacy set is the BatBadBut surface |
| `GitTools__GitVersion@5057cdbcc177` | `ArgumentList` loop, `GIT_TERMINAL_PROMPT=0`, `LC_ALL=C`, removes seven repo-targeting `GIT_*` variables (`src/GitVersion.Git.Managed/CommandLine/GitCliExecutor.cs:38-60`) | take: an explicit hygiene list plus determinism variables is the pattern; it uses exact-case `Remove` (fine for git on both OSes) |
| `dotnet__aspire@af646baee1e8` | `Arguments` OR `ArgumentList`, both set = throw; `InheritEnv=false` clears (`src/Aspire.Hosting/Dcp/Process/ProcessUtil.cs:24-27,57-68`) | leave the clear-all default for ocx |

Count check against the brief: of these eight, SimpleExec (when handed a list), PowerShell and GitVersion build argv with `ArgumentList` and Aspire supports it as an opt-in; none of the eight prevents a cwd hit and none refuses `.cmd` (SimpleExec and CliWrap actively resolve it).

### 9. Era notes: net8 floor, net10 target, net11 RC1

- `ProcessStartInfo.ArgumentList` since .NET Core 2.1 / netstandard2.1 (docs monikers); not in netstandard2.0 (CS1061, audit fixture ns20).
- `new ProcessStartInfo(string, IEnumerable<string>)` and `Process.Start(string, IEnumerable<string>)` compile on net8.0 and net10.0 [run]; reference assembly lines `ref/System.Diagnostics.Process.cs:335,240`.
- .NET 11 RC1 (11.0.100-rc.1, GA Nov 2026) adds `ProcessStartInfo.KillOnParentExit`, `StartDetached`, `StandardInputHandle`/`StandardOutputHandle`, `InheritedHandles`, and `SafeProcessHandle.Start(ProcessStartInfo)` (`ProcessStartInfo.cs:144,195,221,292`; ref `:37,353,357,374`). [run] net8 and net10: `CS0117` for `KillOnParentExit`, `StartDetached`, `SafeProcessHandle.Start`; net11: builds, `CA1416` "KillOnParentExit is only supported on: 'android', 'linux', 'windows'" (not macOS). Gate these behind `#if NET11_0_OR_GREATER` until the SDK floor is net11. Nothing in the launch rules above changes under net11: `Arguments`/`ArgumentList`, resolution and `Environment` semantics are the same code paths (`main@0e45f6c8d90d`).
- `UseShellExecute` defaults to `false` on .NET Core and `true` on .NET Framework (Meziantou MA0161 doc); an agent trained on Framework-era snippets may rely on either.

### 10. Verified on the toolchain

Fixture root: `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-process-launch-and-argv/` (parent `global.json` pins 10.0.401; `api-eras/a8` pins 8.0.425; `api-eras/a11` pins 11.0.100-rc.1.26425.128). Contents: `echoargv/` (dummy .NET child printing argv/env/stdin), `rustecho/` (Rust child, std only), `launch/` (multi-target net8.0;net10.0 driver, tests `argv env resolve notfound toolong secrets stdin-encoding cmd snapshot ocx`), `analyzers/{red,green,red-noadd}`, `api-eras/`, `halluc/`. Windows staging: `C:\Users\ecom\csharp-wintest\` (copy of the above plus `run.cmd`, `repro-windows.cmd`).

Commands (all exit codes were asserted; `repro.sh` fails on any unexpected result):

```bash
cd /home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-process-launch-and-argv
(cd echoargv && ../../../run.sh dotnet build -c Release -nologo -v q)
(cd launch   && ../../../run.sh dotnet build -c Release -nologo -v q)
(cd rustecho && cargo build --release)
./repro.sh                         # Linux: 28 checks, transcript-linux.txt, repro-linux-summary.txt  -> exit 0
PATH=/home/mherwig/.ocx/toolchain/active/bin:$PATH ./analyzers.sh   # transcript-analyzers.txt
./api-eras.sh                      # transcript-api-eras.txt
/mnt/c/Windows/System32/cmd.exe /c "C:\Users\ecom\csharp-wintest\repro-windows.cmd"   # Windows: transcript-windows.txt (28 RESULT lines)
```

Observed results (RED = the hazard reproduced, GREEN = the fixed twin):

| # | Claim | RED observed | GREEN observed |
|---|---|---|---|
| V1 | string-join argv corrupts | `launch argv --mode naive-join` -> `# sent 12 args, child saw 19`, `RESULT RED mismatches=12 argc-ok=False` (Linux net10, net8, net11-rc1 via `DOTNET_ROLL_FORWARD=LatestMajor`, Windows, Rust child on both) | `--mode argumentlist` -> `RESULT GREEN mismatches=0` on the same matrix |
| V2 | hand quoting corrupts | `--mode naive-quote` -> `mismatches=10` (only `a b` and `--flag=va lue` survive), Linux and Windows | `--mode pasted` -> `GREEN` (faithful PasteArguments port), both OSes, .NET and Rust child |
| V3 | ambient env corrupts a typed call (synthetic) | `env --mode inherit` with `OCX_QUIET OCX_NO_VERIFY CLICOLOR_FORCE OCX_PROJECT ocx_quiet` set -> `leaked=5`, both OSes | `--mode scrub` -> `leaked=0` |
| V4 | exact-case `Remove` misses a lowercase spelling | Linux `--mode exact-remove` -> `leaked=1` | Linux `scrub` -> `leaked=0`; Windows `exact-remove` is already `GREEN` |
| V5 | real ocx, ambient env | Linux ocx 0.6.5 `ocx --mode inherit` -> `exit=0 stdout-bytes=0 valid-json=False` (`OCX_QUIET=1`); with only `CLICOLOR_FORCE=1`: `stdout-bytes=80 contains-ESC=True valid-json=False`. Windows ocx 0.6.3: `stdout-bytes=0` | `--mode scrub` -> `stdout-bytes=15 valid-json=True`; `scrub-hermetic` (`OCX_HOME` private + `OCX_NO_CONFIG=1`) -> `valid-json=True` |
| V6 | bare name executes the cwd binary | `resolve --mode bare-name` -> `exe=<tmp>/planted/ocx`, `RESULT RED ranFromCwd=True` (net10 and net8 Linux; Windows `...\planted\ocx.exe`) | `--mode resolve-once` -> `exe=<tmp>/good/ocx`, `RESULT GREEN` (cwd and the world-writable `loose/` dir skipped) |
| V7 | child PATH does not steer lookup | `resolve --mode psi-path` -> `RED psi.Environment[PATH]-honoured-for-FileName-lookup=False` (Linux net10/net8, Windows) | twin is V6 `resolve-once` (absolute path) |
| V8 | secret in argv visible | `secrets --mode argv` -> observer sees `... --sleep s3cr3t-PASSWORD-xyz`, `RESULT RED` (Linux `/proc/<pid>/cmdline`, Windows `Get-CimInstance Win32_Process`) | `--mode stdin` -> `--sleep --stdin`, `GREEN` |
| V9 | record prints secret | `secrets --mode record` -> `Secret { User = u, Token = s3cr3t-PASSWORD-xyz }`, `RESULT RED` | `SecretRedacted { User = u, Token = *** }` (`override green=True`) |
| V10 | stdin encoding | `stdin-encoding --mode utf8-bom` -> `stdin-len=19 hex=EFBBBF70C3...` RED (both OSes); `--mode default` Windows -> `stdin-len=10 hex=70847373779472641A3F` RED | `--mode utf8-nobom` and `--mode bytes` -> `stdin-len=16`, `GREEN` (both OSes); Linux default is also green |
| V11 | `.cmd` target (Windows) | `cmd --mode argumentlist` and `--mode string` -> `payload "x&ver" injected=True`, `"a^&ver"` injected, `"%USERNAME%"` expanded=True, `RESULT RED payloads-that-escaped-or-expanded=3` | `cmd --mode guard` -> `refused: refusing batch target t.cmd`, `RESULT GREEN`; `cmd --mode bare-name-no-ext` -> `NativeErrorCode=2` x6 |
| V12 | RS0030 enforcement | `analyzers.sh` section B: 8 errors incl. `RS0030` at `Bad.cs(6,48)`, `(7,18)`, `(9,9)`, `(10,9)`, `Bad3.cs(1,39)`; `build-exit=1` | section C: `0 Error(s) 0 Warning(s)`, `build-exit=0` |
| V13 | RS0030 silent without AdditionalFiles | section D: no `RS0030` line, only `MA0161 MA0162 MA0163`, `build-exit=1` | with the `<AdditionalFiles>` line (V12) RS0030 fires |
| V14 | Meziantou default states | section A (no `.editorconfig`): `MA0163` warning only, 0 errors, `RS0030` warnings | section B after `MA0161/62/63 = error`: all three fire |
| V15 | .NET 11-only APIs | `api-eras.sh`: net8 and net10 -> `3 Error(s)` all `CS0117` | net11 -> `0 Error(s)` (+ `CA1416` for `KillOnParentExit`) |
| V16 | no `AddRange` / read-only `ArgumentList` | `halluc/` build -> `CS0200 ... 'ProcessStartInfo.ArgumentList' cannot be assigned to -- it is read only`, `CS1929 'Collection<string>' does not contain a definition for 'AddRange'` | n/a (compile-time) |
| V17 | argv size limits | Windows `toolong`: 32,700 chars -> `NativeErrorCode=206`; Linux 140,000 -> `NativeErrorCode=7` | 32,000 (Windows) / 130,000 (Linux) start fine |

Reading-only (not run): the claim that an inherited terminal stdin would block `login` on a prompt; the claim that `ocx self update` repoints `current`; the `ENOEXEC=8` row; behaviour on macOS and on arm64.

## Normative guidance candidates

1. **Build argv only with `ArgumentList` (or `new ProcessStartInfo(file, IEnumerable<string>)`); never read or write `ProcessStartInfo.Arguments`, never call `new ProcessStartInfo(string, string)` or `Process.Start(string, string)`.** Rationale: string-join corrupted 12 of 12 args and hand quoting 10 of 12 on every platform; the SDK should own no quoting code. Verify: RS0030 with the `BannedSymbols.txt` in section 7.1, `dotnet_diagnostic.RS0030.severity = error` in `.editorconfig`, `dotnet build src -c Release` exits 0; plus `rg -n -e '<AdditionalFiles[^>]*BannedSymbols' -g '*.csproj' -g '*.props' -g '*.targets' .` must match at least once (RS0030 is silent without it).
2. **Never `UseShellExecute = true`; always set `UseShellExecute = false` explicitly on every `ProcessStartInfo`.** Rationale: `true` forbids env edits and redirection and invokes the shell; the default flipped between .NET Framework and .NET Core. Verify: `rg -n -e 'UseShellExecute\s*=\s*true' src` prints nothing; Meziantou `dotnet_diagnostic.MA0161.severity = error` and `MA0163` (default Warning, set `error`).
3. **Exactly one place creates a `ProcessStartInfo`.** Rationale: every rule below is enforceable only at a single seam. Verify: `rg -l -e 'new ProcessStartInfo' -e 'Process\.Start\(' -e 'new Process\(' src --glob '*.cs' | wc -l` prints `1`; `dotnet_diagnostic.MA0162.severity = error` flags any stray `Process.Start(string, ...)`.
4. **`FileName` is only ever an absolute path produced by the resolver; never a string literal or a bare name.** Rationale: .NET probes the cwd before PATH on both OSes (measured RED on Linux net8/net10 and Windows). Verify: `rg -n -e 'FileName\s*=\s*"' -e 'new ProcessStartInfo\("' src --glob '*.cs'` prints nothing; unit test plants an executable named `ocx` in the cwd and asserts the resolved path is not it (fixture `resolve --mode bare-name` shape).
5. **Resolve once at handle construction; do not re-resolve per call and do not use `psi.Environment["PATH"]` to steer lookup.** Rationale: lookup reads the parent PATH (measured, both OSes), and a per-call lookup re-opens the check-versus-use race. Verify: reading heuristic: `File.Exists`/`Which` appears only in the resolver; `rg -n 'Environment\["PATH"\]' src --glob '*.cs'` has no hit that precedes `Process.Start`.
6. **The resolver scans PATH entry by entry: absolute entries only (resolve relative ones against cwd before comparing), skip the cwd on Windows, skip hits whose parent directory is group- or other-writable on POSIX (`File.GetUnixFileMode(dir) & (UnixFileMode.GroupWrite | UnixFileMode.OtherWrite)`), match the exact file name `ocx` / `ocx.exe`.** Rationale: CWE-426; Python reference `_bootstrap.py:430-484`. Verify: resolver unit tests mirror fixture `resolve --mode resolve-once` (planted cwd binary and a world-writable directory both rejected); `rg -n 'PATHEXT' src` prints nothing.
7. **Refuse any target whose extension is `.cmd` or `.bat` (case-insensitive), in the resolver and again at the launch seam; on Windows accept only `.exe`.** Rationale: batch files go through `cmd.exe`; `x&ver` ran `ver`, `%USERNAME%` expanded (measured); no complete escaper exists. Verify: `rg -n -i -e '\.(cmd|bat)\b' src --glob '*.cs'` returns only the refusal guard and its test; test runs fixture `cmd --mode guard` shape on Windows CI.
8. **Wrap only `Process.Start` in `catch (Win32Exception e)`, branch on `NativeErrorCode` (2/3 not found, 5/13 access, 193 bad format, 206/7 argv too long, `0` with a directory as `FileName`), keep `e` as `InnerException`; never `catch (Exception)` around the launch.** Rationale: one code space per OS, and `0` appears for a directory on Linux. Verify: `rg -n 'NativeErrorCode' src --glob '*.cs'` has at least one hit; `rg -n 'catch\s*\(Exception' src --glob '*.cs'` prints nothing; enable `dotnet_diagnostic.CA1031.severity = warning` (CA1031 "Do not catch general exception types", not run here).
9. **Pre-check the built command length on Windows (<= 32,766 UTF-16 chars including the quoted exe and spaces) and a single argument <= 131,072 bytes on Linux, and raise a typed error before `Start`.** Rationale: measured `206` at 32,700 chars and `7` at 140,000. Verify: unit test with a 33,000-char argument expects the typed error, not `Win32Exception`.
10. **Mutate only `psi.Environment`, on a fresh `ProcessStartInfo`; never `Environment.SetEnvironmentVariable`.** Rationale: `Environment` is a first-access snapshot; the global setter is process-wide. Verify: RS0030 entry `M:System.Environment.SetEnvironmentVariable(System.String,System.String)` (fired in V12); `rg -n 'SetEnvironmentVariable' src --glob '*.cs'` prints nothing.
11. **Scrub `OCX_PROJECT OCX_GLOBAL OCX_QUIET OCX_NO_VERIFY OCX_NO_HOOK OCX_NO_COMPLETIONS CLICOLOR_FORCE` from every child with `StringComparison.OrdinalIgnoreCase`, never with exact-case `Remove`.** Rationale: V5 (0-byte and ESC-polluted JSON from real ocx) and V4 (lowercase spelling survives exact-case `Remove` on Linux). Verify: parametrised test sets each name upper- and lower-case in the parent, asserts the child sees none (fixture `env --mode scrub`); `rg -n 'Environment\.Remove\(' src --glob '*.cs'` is confined to the seam.
12. **Every typed call sends `--format json --color never` as the first global flags, in addition to the scrub.** Rationale: the flag outranks the env for colour; there is no flag-off for `OCX_QUIET`, so scrub and flag are both required. Verify: unit test on the built `ArgumentList` prefix; `rg -n -e '"--color"' src --glob '*.cs'` has one hit in the argv builder.
13. **Do not `Environment.Clear()` or start from a minimal env; inherit, then scrub. Keep `PATH`, `USERPROFILE`, `HOME`, `SYSTEMROOT`, `TEMP`, `APPDATA`, `LOCALAPPDATA`, `PATHEXT` untouched.** Rationale: Nuke's `Environment.Clear()` and Python's `HostEnv.minimal()` (S7) strip Windows-required variables. Verify: `rg -n 'Environment\.Clear\(\)|\.Environment\.Clear' src --glob '*.cs'` prints nothing.
14. **Hermetic mode is exactly `OCX_NO_CONFIG=1` plus a caller-supplied `OCX_HOME`, documented as "no ambient user config, SYSTEM scope still applies".** Rationale: `environment.md:699-705`. Verify: unit test asserts both variables on the child; doc string contains "SYSTEM".
15. **Default ocx home comes from `Environment.GetFolderPath(Environment.SpecialFolder.UserProfile)`; never `GetEnvironmentVariable("HOME")` as the primary source.** Rationale: stock Windows has no `HOME`; ocx uses `%USERPROFILE%\.ocx` (V-section 5.5). Verify: `rg -n -e 'GetEnvironmentVariable\("HOME"\)' src --glob '*.cs'` prints nothing or only a documented fallback after `GetFolderPath`.
16. **Secrets reach ocx only through stdin (`login --password-stdin`, `package sign|attest --identity-token-stdin`) or the child environment; no secret value ever enters `ArgumentList`.** Rationale: V8 (visible to any local observer on both OSes), CWE-214. Verify: reading heuristic: a parameter named `*password*`, `*token*`, `*secret*`, `*key*` flows to `StandardInput`/`Environment` and never to `ArgumentList.Add`; `rg -n -i -e 'ArgumentList\.Add\([^)]*(password|token|secret)' src --glob '*.cs'` prints nothing.
17. **Always redirect stdin; write secrets with `StandardInputEncoding = new UTF8Encoding(false)` or raw bytes on `StandardInput.BaseStream`; never `Encoding.UTF8`, never the default.** Rationale: V10 (BOM on both OSes, code-page corruption on Windows). Verify: `rg -n -e 'StandardInputEncoding\s*=\s*Encoding\.' -e 'StandardInputEncoding\s*=\s*null' src --glob '*.cs'` prints nothing; test sends `pässwörd→世` and compares bytes (fixture `stdin-encoding`).
18. **Secret-bearing types override `PrintMembers`/`ToString` (or are not records); exceptions and logs print the ocx verb, never `ArgumentList` or environment values; run all captured text through one redactor holding every secret form (raw value, base64 of `user:token`).** Rationale: V9; `Win32Exception.Message` already omits argv. Verify: `rg -n -e 'record\s+\w+\s*\([^)]*(Token|Password|Secret)' src --glob '*.cs'` hits must each have `PrintMembers` in the same file (`rg -L 'PrintMembers' <file>` lists offenders); test asserts `ToString()` of each credential type lacks the secret.
19. **Gate .NET 11 launch APIs (`KillOnParentExit`, `StartDetached`, `StandardInputHandle`, `SafeProcessHandle.Start`) behind `#if NET11_0_OR_GREATER` until the floor is net11.** Rationale: CS0117 on net8/net10; `KillOnParentExit` also needs a `CA1416` platform guard (no macOS). Verify: `dotnet build src -f net8.0 -c Release` and `-f net10.0` succeed; `rg -n -e 'KillOnParentExit' -e 'StartDetached' -e 'SafeProcessHandle\.Start' src --glob '*.cs'` hits sit inside `#if NET11_0_OR_GREATER`.
20. **Pass `OCX_BINARY_PIN=<pinned absolute path>` and set `OCX_NO_UPDATE_CHECK=1` on every child; set `WorkingDirectory` explicitly on every call.** Rationale: nested ocx launches stay on the same binary; background update notices are noise on a piped stderr; ocx project discovery walks the cwd. Verify: unit test asserts the three on the built `ProcessStartInfo`.

## AI-agent angle

What an LLM characteristically gets wrong here, and the smallest mechanical check that catches it:

| Characteristic error | Why it compiles and looks fine | Catch |
|---|---|---|
| `psi.Arguments = $"install {pkg} --json"` or `string.Join(" ", args)` | the idiom of .NET Framework and nearly all StackOverflow answers; works for simple args | RS0030 on `P:ProcessStartInfo.Arguments` (V12); `rg -n '\.Arguments\s*=' src` |
| `new ProcessStartInfo("ocx", argsString)` / `Process.Start("ocx", "version")` | two-argument overloads read as the "short form" | RS0030 on the ctor and `Process.Start(string,string)` entries; MA0162 |
| Hallucinated `psi.ArgumentList = new List<string>{...}` / `psi.ArgumentList.AddRange(args)` | reads naturally | compiler: `CS0200` read-only, `CS1929` no `AddRange` (V16); use `foreach (...) Add` or the `IEnumerable<string>` ctor |
| `FileName = "ocx"` | works in the author's shell | `rg -n 'FileName\s*=\s*"' src`; planted-cwd test (V6) |
| `UseShellExecute = true` copied from "open a URL" snippets, or relying on the Framework default | compiles; breaks redirection/env at runtime | grep + MA0161/MA0163 |
| `Process.Start("cmd", "/c ocx ...")` or `where ocx` / `which ocx` shell-outs for discovery | "portable" feeling | `rg -n -e '"cmd(\.exe)?"' -e '"/bin/(ba)?sh"' -e '"(where|which)"' src` |
| Treating `ocx.cmd` / `npm.cmd`-style shims as normal, adding PATHEXT scanning | copied from Node/npm wrappers | `rg -n -e 'PATHEXT' -e '\.cmd' src`; guard test (V11) |
| `Environment.SetEnvironmentVariable("OCX_HOME", ...)` before `Process.Start` | children inherit it, so it "works" | RS0030 ban (V12); `rg -n SetEnvironmentVariable src` |
| `psi.Environment.Clear()` then add only `OCX_*` | looks hermetic | `rg -n 'Environment\.Clear' src`; on Windows the child loses `SYSTEMROOT` |
| `psi.Environment.Remove("OCX_QUIET")` only (exact case) | correct on Windows | case-insensitive scrub test on Linux (V4) |
| Hermetic = `OCX_NO_CONFIG=1` alone, or assuming it also hides SYSTEM config | the name suggests "no config" | read `environment.md:699-705`; test with a SYSTEM file is outside this fixture |
| `--password`/`--token` in argv, `echo $PW \| ocx login`, or a secret in an env var named for it | works interactively | `rg -n -i -e 'ArgumentList\.Add\([^)]*(password\|token\|secret)' -e '"--password"' src` |
| `StandardInputEncoding = Encoding.UTF8` or unset stdin encoding | "UTF-8 is the default" | `rg -n 'StandardInputEncoding' src`; byte-compare test (V10) |
| `catch (Exception) { /* ocx not found */ }` or string-matching `ex.Message.Contains("No such file")` | message text is OS- and locale-specific | `rg -n 'catch\s*\(Exception' src`; `rg -n 'Message\.Contains' src` |
| `HOME`-based home directory | correct on Linux/macOS | `rg -n 'GetEnvironmentVariable\("HOME"\)' src`; Windows `set HOME=` test |
| `record Auth(string User, string Token)` as a public credential type | records "just work" and print nicely | grep for `record ... Token`; `ToString()` assertion (V9) |
| Uses `KillOnParentExit`/`StartDetached` found in recent docs | present in docs for net11 | `dotnet build -f net10.0` (CS0117, V15) |
| Quotes the file name itself (`FileName = $"\"{path}\""`) | seen in old Windows snippets | `rg -n 'FileName\s*=\s*\$?"\\\\"' src`; .NET already quotes (`ProcessUtils.Windows.cs:39-51`) |

## Contested / evolving

- **String `Arguments` vs `ArgumentList` in libraries (as of 2026-10).** Practice is split by target framework, not by merit: CliWrap, Medallion, Nuke, Cake, Azure.Core keep strings (netstandard2.0 reach, or legacy), SimpleExec, PowerShell and GitVersion use the list. Trend: list-first; CliWrap keeps its string API but the escaper is the runtime's own. This SDK (net8+) sides with the list unconditionally.
- **Deny-list vs allow-list environment.** Python SDK: six-key deny-list over an inherited env; Rust SDK: drop every `OCX_*`/`__OCX_*` then re-add explicit pairs (`ocx-cli-contract.md:82`). The prefix-drop is robust to variables ocx adds later (56 public ones today, `cli.json`), but it needs an allow-list for ambient `OCX_AUTH_*` that CI pipelines legitimately export. Recommendation: deny-list now (verified minimal), move to prefix-drop plus allow-list if the env-config subtopic adopts an options record that makes every intended variable explicit.
- **Pin symlink vs realpath.** Python pins `realpath`; this report keeps the stable ocx symlink for the `OCX_HOME` tier so self-update does not strand the SDK. Unobserved; decide with an `ocx self update` test when the SDK exists.
- **BatBadBut and .NET.** No CVE or runtime advisory covers it for .NET (checked 2026-10-10); Rust returns `InvalidInput`, Go/Python/Ruby documented it. .NET's stance ("arguments are trusted") may change; until then refusal is the only safe policy. Trend across ecosystems: refuse or error rather than escape.
- **`KillOnParentExit`/`StartDetached`/`SafeProcessHandle.Start` (net11 RC1).** Not GA until Nov 2026 and platform-restricted; shapes may still change before GA.
- **ocx contract moving.** Released 0.6.5 (Linux here) and 0.6.3 (Windows host) lack `contract`/`schema_version` and behave differently in small ways (Windows 0.6.3 created no `state/` dir under a private `OCX_HOME` for the probe verb); the env rows above were measured against those binaries, not against unreleased main.
- **Windows writable-directory check.** POSIX has mode bits; Windows has ACLs and the Python reference skips only the cwd there. An ACL check (`DirectorySecurity`) is possible but unverified; treat "Windows PATH dir writable by Everyone/Users" as open.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.processstartinfo.argumentlist?view=net-10.0 | API doc, `ProcessStartInfo.ArgumentList` | updated 2026-08-13, net10/net11 | official statement that `ArgumentList` escapes and that Arguments/ArgumentList are exclusive; the "untrusted data" warning |
| https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.processstartinfo.environment?view=net-10.0 | API doc, `ProcessStartInfo.Environment` | updated 2026-08-13 | `UseShellExecute=false` requirement for env edits; `Environment` vs `EnvironmentVariables` |
| https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.processstartinfo.filename?view=net-10.0 | API doc, `ProcessStartInfo.FileName` | updated 2026-08-13 | what FileName may be; trusted-data warning |
| https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-createprocessw | Win32 `CreateProcessW` reference | 2025-07 | search order (app dir, cwd, System32, PATH), ".exe appended", 32,767 limit, "to run a batch file start the command interpreter" |
| https://learn.microsoft.com/en-us/windows/win32/debug/system-error-codes--0-499- | Win32 system error code table | 2025-07 | meaning of 2, 3, 5, 193, 206 for `NativeErrorCode` mapping |
| https://github.com/dotnet/runtime/blob/0e45f6c8d90d/src/libraries/System.Private.CoreLib/src/System/PasteArguments.cs | dotnet/runtime source, argument quoting | main@0e45f6c8d90d, 2026-10-10 | the exact CRT quoting rules `ArgumentList` uses on Windows |
| https://github.com/dotnet/runtime/blob/0e45f6c8d90d/src/libraries/System.Diagnostics.Process/src/System/Diagnostics/ProcessStartInfo.cs | dotnet/runtime source, `ProcessStartInfo` | same | `Environment` snapshot and comparer, both-set exception, NUL checks, "arguments are trusted" comment |
| https://github.com/dotnet/runtime/blob/0e45f6c8d90d/src/libraries/System.Diagnostics.Process/src/System/Diagnostics/ProcessUtils.Unix.cs | dotnet/runtime source, Unix resolution | same | `ResolvePath`: app dir, then cwd, then parent PATH; ENOENT exception; string-args re-parse |
| https://github.com/dotnet/runtime/blob/0e45f6c8d90d/src/libraries/System.Diagnostics.Process/src/System/Diagnostics/ProcessUtils.Windows.cs and .../Microsoft/Win32/SafeHandles/SafeProcessHandle.Windows.cs | dotnet/runtime source, Windows launch | same | `BuildCommandLine`, `CreateProcess(null, ...)`, env block sorting, error construction |
| https://github.com/dotnet/runtime/blob/0e45f6c8d90d/src/libraries/System.Diagnostics.Process/ref/System.Diagnostics.Process.cs | public API surface (ref assembly) | same | which overloads exist (`IEnumerable<string>` ctor/Start) and which members are new in .NET 11 |
| https://flatt.tech/research/posts/batbadbut-you-cant-securely-execute-commands-on-windows/ | BatBadBut research write-up | 2024-04 | root cause, why backslash/caret escaping fails, affected-language table (no .NET row) |
| https://blog.rust-lang.org/2024/04/09/cve-2024-24576/ | Rust security advisory CVE-2024-24576 | 2024-04-09 | the canonical mitigation: error when args cannot be escaped for `cmd.exe` |
| https://github.com/Tyrrrz/CliWrap/issues/298 | CliWrap issue "WithArguments escape error" | closed 2025-07-16 | the brief's "backslash bug": maintainer reasoning, shows it is not an escaping defect |
| https://github.com/dotnet/roslyn/blob/main/src/RoslynAnalyzers/Microsoft.CodeAnalysis.BannedApiAnalyzers/BannedApiAnalyzers.Help.md | BannedApiAnalyzers usage doc | current | `BannedSymbols.txt` ID syntax and the mandatory `AdditionalFiles` wiring |
| https://github.com/meziantou/Meziantou.Analyzer/blob/main/README.md (rules MA0161-MA0163 under docs/Rules/) | analyzer README and rule docs | current (3.0.297 measured) | default severity and enabled state of the three Process rules |
| https://cwe.mitre.org/data/definitions/426.html | CWE-426 Untrusted Search Path | current | canonical mitigations: full paths, drop cwd, clean PATH |
| https://cwe.mitre.org/data/definitions/214.html | CWE-214 Invocation of Process Using Visible Sensitive Information | current | argv and environment visibility as a weakness class |
| /home/mherwig/dev/ocx/website/src/docs/reference/environment.md (ocx@5de9d777eb7d) | ocx environment reference | working tree, branch `goat` | `OCX_QUIET`, `OCX_NO_VERIFY`, `OCX_NO_CONFIG`, `OCX_HOME`, `OCX_BINARY_PIN` semantics |
| /home/mherwig/dev/ocx-sdk-python/src/ocx_sdk/_bootstrap.py and _env.py (ocx-sdk-python@80136dde4162) | Python SDK reference implementation | 2026 | `_which` trust rules, `_NEUTRALIZED_KEYS`, case rule, redactor |
| /home/mherwig/dev/grimoire-lore/.agents/worktrees/csharp/.agents/research/csharp-audit/ocx-cli-contract.md | measured ocx CLI contract audit | 2026-10-10 | spawn-hygiene set, colour precedence, secret variables, exit codes |
| /home/mherwig/dev/grimoire-lore/.agents/worktrees/csharp/.agents/research/csharp-audit/exemplar-cli-wrappers-and-sdks.md | exemplar launch-layer matrix | 2026-10-10 | the 3-of-10 ArgumentList count and per-library resolution/env rows |
| adamralph__simple-exec@f80913246993 (Command.cs, ProcessStartInfoExtensions.cs) | exemplar clone | 2026-10-08 | `ArgumentList` loop and PATHEXT resolver |
| Tyrrrz__CliWrap@7dbc252fa773 (ArgumentsBuilder.cs, Command.Execution.cs) | exemplar clone | 2026-10-09 | `Escape` = PasteArguments, the .cmd comment, the cwd probe, null-removes-variable |
| PowerShell__PowerShell@5d871eb5e02c (NativeCommandProcessor.cs) | exemplar clone | 2026-10-09 | legacy raw-string set for `.cmd/.bat`, `ArgumentList` default |
| GitTools__GitVersion@5057cdbcc177 and nuke-build__nuke@27e8077b8ab0, dotnet__aspire@af646baee1e8, meziantou__Meziantou.Analyzer@161b7e948ad3 | exemplar clones | 2025-12 to 2026-10 | env hygiene list, `Environment.Clear()` and `[REDACTED]` filter, `InheritEnv`, analyzer defaults |
| /home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-process-launch-and-argv/ (transcript-linux.txt, transcript-windows.txt, transcript-analyzers.txt, transcript-api-eras.txt) | the run evidence for this report | 2026-10-10 | every [run] claim above, with raw output |
