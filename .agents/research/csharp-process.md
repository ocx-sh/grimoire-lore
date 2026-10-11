---
title: "Driving the ocx child process from C#: launch, I/O, termination and exit status (consolidated)"
topic: csharp-process (research-lang C# / .NET, wave 1 consolidation, revised with the real-ocx and Windows PATH-ACL round; target depth file csharp-quality/processes.md)
model: claude-opus-5-5
consolidates:
  - csharp-process/csharp-process-launch-and-argv.md
  - csharp-process/csharp-process-streams-and-encoding.md
  - csharp-process/csharp-process-cancellation-and-exit.md
  - csharp-process/csharp-process-real-ocx.md
  - csharp-process/csharp-process-windows-path-acl.md
grounding:
  - csharp-audit/ocx-cli-contract.md
  - csharp-audit/python-sdk-digest.md
  - csharp-audit/exemplar-cli-wrappers-and-sdks.md
  - csharp-async.md, csharp-build.md and csharp-api.md (sibling consolidations, checked for agreement)
date: 2026-10-11
revised: 2026-10-11
fixtures: /home/mherwig/.cache/research-lang/dotnet-tools/fixtures/consolidate-csharp-process/ (run-all.sh; transcript-linux.txt, transcript-windows-net10.txt; round 2: engine-r2/, engine-r2-mut/, driver-r2/, transcript-r2-linux.txt, transcript-r2-windows.txt, transcript-r2-rules.txt)
---

# Driving the ocx child process from C#

Citation keys used below:

| Key | Source |
|---|---|
| [L] | [csharp-process-launch-and-argv.md](csharp-process/csharp-process-launch-and-argv.md), V-numbers are its section 10 table |
| [S] | [csharp-process-streams-and-encoding.md](csharp-process/csharp-process-streams-and-encoding.md), scenario names are its section 12 table |
| [C] | [csharp-process-cancellation-and-exit.md](csharp-process/csharp-process-cancellation-and-exit.md), V-numbers are its section 11 table |
| [R] | [csharp-process-real-ocx.md](csharp-process/csharp-process-real-ocx.md), section numbers and `PROC-R-nn` rows |
| [A] | [csharp-process-windows-path-acl.md](csharp-process/csharp-process-windows-path-acl.md), section numbers and its 1.17 table rows |
| [OC] | [ocx-cli-contract.md](csharp-audit/ocx-cli-contract.md) |
| [PY] | [python-sdk-digest.md](csharp-audit/python-sdk-digest.md) (S-numbers are its smells, rows are its section 11 table) |
| [W] | [exemplar-cli-wrappers-and-sdks.md](csharp-audit/exemplar-cli-wrappers-and-sdks.md) (E-numbers are its fixtures) |
| [K] | this consolidation's fixture `consolidate-csharp-process/`: the wave-2 reference engine, the `driver/` scenario run (`PROC-nn` lines), the `bans/` red twin and `rules/rules-check.sh` |
| [K2] | this revision's runs in the same fixture: `engine-r2/` (the revised engine), `engine-r2-mut/` (planted defects), `driver-r2/` (rows `R1-R4`, `W1-W3`, `C1-C7`) and the round-2 lines of `rules/rules-check.sh` |
| [ERR] | [csharp-api.md](csharp-api.md) CS-ERR rows (sibling consolidation, owner of the exception and `ChildExit` type shapes) |

**Which ocx each claim ran against.** Every rule below carries an `ocx:` line naming one of these builds:

| Label | Build | Used by |
|---|---|---|
| `main@3485207c1` | `~/dev/ocx` main at `3485207c183e`, reports `v0.6.5-15-g3485207c1-dirty`; Linux glibc (`cargo build --release --locked`) and Windows MSVC (`cargo xwin`) | [R] |
| `0.6.5` | the released musl binary, Linux | [R] (one leg), [L V5], [C §5], [OC] |
| `0.6.3` | the binary installed on the Windows host | [L V5] |
| `source@<sha>` | source reading only, no execution (`246863abc1d4`, `a23ec5be2939`, `3485207c1`) | [C], [OC], [A] |
| `dummy` | no ocx at all: a .NET or shell dummy child | [L], [S], [C], [K], [K2] |

## Verdict

1. **PR-16 is decided: the SDK owns its engine and does not depend on CliWrap.** The reference engine is now 464 lines:
   - 276 for the engine and 63 for the resolver;
   - 58 for the Windows ACL check and 28 for the error-document reader;
   - 39 for `ChildExit`, the retry classifier and the exit-table stand-in.

   It builds clean with analyzers at error on net8.0 and net10.0 [K2]. It passed 23 Linux scenarios per runtime and 13 Windows scenarios at code page 437 [K]. Against a real ocx (main@3485207c1) it passed 78 checks on Linux and 44 on Windows [R §2.14].

   CliWrap ranks first in the wrapper audit (12/13 [W §4]), but it fails four rules this group must enforce:
   - It builds a string `Arguments` (CS-PROC-01).
   - It probes the cwd and resolves `.cmd`/`.bat` (CS-PROC-03/04).
   - Its drain has no cap and no bound on a grandchild-held pipe (`Command.Execution.cs:191`; CS-PROC-10/13).
   - It extracts `Signaler.exe` to `%TEMP%` (CS-PROC-18).

   An RS0030 ban cannot reach inside a dependency, and the Python SDK is zero-dependency by rule ([PY] row 3).
2. **Launch:**
   - argv goes only through `ArgumentList`, and every call starts with `--format json --color never`, passthrough calls included.
   - `FileName` is the one absolute path a resolver chose once. The exact name is `ocx`/`ocx.exe`: no PATHEXT and no cwd.
   - **New:** a PATH or `$OCX_HOME` hit must pass a trust check on both its directory and its file. On POSIX that is the mode bits. On Windows it is an ACL allow-list (CS-PROC-25), because default Windows ACLs make `C:\<new folder>` writable by Authenticated Users [A §1.8].
   - `.cmd`/`.bat` targets are refused.
   - The child environment inherits, then scrubs 7 keys case-insensitively. Secrets travel only as stdin bytes.
3. **I/O:**
   - One byte-pump task per stream, started before stdin is written.
   - A 16 MiB cap per capture; past the cap the pump discards and keeps reading.
   - One `UTF8Encoding(false)` on all three streams, with stdin written as raw bytes.
   - Real `ocx login --password-stdin` stores a BOM or a CR verbatim as part of the password [R §2.10]. That is the observable reason for the encoding rule.
4. **The grandchild-held pipe and tree kill agree:**
   - The engine tree-kills only while the root is alive.
   - After a natural exit it bounds the drain at 5 s and returns `DrainTimedOut = true`. It does not throw.
5. **Termination:**
   - Every kill is `Kill(entireProcessTree: true)` plus a bounded reap.
   - Caller cancel is `OperationCanceledException`; an SDK timeout is `OcxTimeoutException`. The default grace is 0 everywhere.
   - **Real ocx confirms the design on both OSes [R §2.9]:**
     - On Linux `ocx exec` execs into the tool, so no ocx process is in the tree.
     - On Windows `ocx.exe` spawns the tool and waits, and it holds no job object.
     - `Kill(true)` reaped `ocx.exe > cmd.exe > tool`.
     - A SIGTERM-first stop orphaned a real grandchild and took 5975 ms.
   - The SDK creates no job object.
6. **Exit status (rewritten this round).**
   - The engine returns raw `(exit, stdout, stderr, flags)` for every code.
   - The command layer classifies stdout **by shape**: an error document, a report, or empty. It never decides by command name or by the `cli.json` mode list, because `self update` is labelled `report` yet exits 75 with a report.
   - Exit numbers come from CS-ERR-02's one hand-written table. That table is selected by the `contract` handshake, never by the version string: main reports `0.6.5`.
   - Passthrough is a property of the output mode, not of the command name. It returns `ChildExit { ExitCode, IsOcxError }`, because ocx's own launch failures (65, 77, 64) share the child's exit channel.
   - A retry needs exit 75 **and** a `temp_fail` error document.
7. **.NET 11 APIs live only inside `#if NET11_0_OR_GREATER`.** The shipping TFMs stay net8.0;net10.0.
8. **One 25-line `BannedSymbols.txt` fragment** covers every bannable API. It was watched red on 22 of 22 planted lines. The round-2 rules (CS-PROC-21/22/25) are guarded by `rg` lines and CA1416, each watched red on `engine-r2-mut` [K2].
9. **Documented gaps (not decided; recorded so nobody assumes coverage):**
   - Nothing ran on macOS or on arm64.
   - The following were not run: `ocx self update` repointing `current`, `patch test`, and the report path of `update`/`upgrade`/`inspect`/`copy`/`deps`/`cascade` [R §2.12].
   - The Windows ACL check ignores Deny ACEs, does not inspect ancestor directories, and leaves a check-then-launch window [A §1.16].
   - The Windows tree walk is a snapshot. A descendant whose intermediate parent died before the kill is unreachable (source only) [R §2.9].
   - `IsOcxError` can be forged by a tool that prints a matching document [R §2.7].

## The ruleset

Ordered launch, then I/O, then termination, then exit status. Conventions:
- **Watched** means a planted defect was observed red and its fixed twin green on SDK 10.0.401.
- **Windows claims** were watched on the Windows host: Windows 11 build 26200, runtime 10.0.2, SDK 10.0.102, code page 437, non-elevated user.
- **ocx:** names the build a claim ran against (see the table above).
- **Engine comments.** Every rule points at the [reference engine](#reference-engine) by its `CS-PROC-nn` comment.
- **Timings.** Millisecond figures vary by about 10% between runs. The saved transcripts are authoritative, and the pass or fail outcome was identical in every rerun.

### Launch

**CS-PROC-01 (MUST): build argv only with `ProcessStartInfo.ArgumentList`.**
- Never read or write `ProcessStartInfo.Arguments`. Never call `new ProcessStartInfo(string, string)` or `Process.Start(string, string)`. The SDK owns no quoting code.
- Why:
  - String-join turned 12 arguments into 19, on Linux, on Windows, on net8/10/11-rc1 and with a Rust child. Hand quoting corrupted 10 of 12 [L V1, V2].
  - `ArgumentList` round-tripped 9 of 9 hostile arguments, including the empty string, `trail\` and `héllo → 世界` [K PROC-01].
- Check:
  - The `BannedSymbols.txt` fragment below, with `dotnet_diagnostic.RS0030.severity = error`.
  - `rg -l -e '<AdditionalFiles[^>]*BannedSymbols' -g '*.csproj' -g '*.props' .` prints at least one path. Without that line RS0030 is silent: `bans/red-noadd` produced 0 RS0030 [K], and [L V13] saw the same.
- ocx: dummy [K]. Hostile child argv through `ocx exec` on main@3485207c1, Linux and Windows [R §2.13 R-02].
- Watched: yes. `bans/red` gave 22 of 22 banned lines as `error RS0030`; the engine built with 0 errors [K].

**CS-PROC-02 (MUST): create a `ProcessStartInfo` in exactly one place.**
- That place calls `Process.Start(ProcessStartInfo)` and sets:
  - `UseShellExecute = false` and `CreateNoWindow = true`, explicitly.
  - An explicit `WorkingDirectory`.
  - Redirection of all three streams. Stdin is always redirected and is closed at once when unused.
- Why:
  - Every other launch rule is enforceable only at one seam.
  - ocx discovers `ocx.toml` by walking the cwd ([L §2.5], [OC §3]).
  - `UseShellExecute` defaulted to `true` on .NET Framework [L §9].
- Check:
  - `rg -l -g '*.cs' -e 'new ProcessStartInfo\(' -e 'Process\.Start\(' src | wc -l` prints `1`.
  - `rg -n -g '*.cs' 'UseShellExecute\s*=\s*true' src` prints nothing.
  - RS0030 on all four `Process.Start(string, ...)` overloads.
- ocx: dummy.
- Watched: yes. On `rules/bad` P02-seam printed 2 and P02-shell printed 1; on the engine they printed 1 and 0 [K].

**CS-PROC-03 (MUST): `FileName` is only ever the absolute path the resolver produced, once, at handle construction, and every discovered hit passes a trust check.** *(Revised: trust check on the file and on the `$OCX_HOME` tier; skips reported.)*
- Resolver order:
  1. The explicit option.
  2. The SDK override variable.
  3. The PATH string the SDK captured, scanned entry by entry:
     - Absolute entries only.
     - Skip the cwd on Windows.
     - Match the exact name `ocx`/`ocx.exe`. No PATHEXT.
     - Skip a hit that fails the trust check.
  4. `$OCX_HOME/symlinks/ocx.sh/ocx/cli/current/content/bin/ocx[.exe]`, with `OCX_HOME` defaulting to `GetFolderPath(UserProfile)/.ocx`. It is subject to the same trust check, and the path is kept unresolved.
- **Trust check:**
  - On POSIX, neither the real target's directory nor the file may be group- or other-writable.
  - On Windows, apply CS-PROC-25.
  - Tiers 1 and 2 are caller intent and are never checked.
- **Each skipped hit appears as `dir: reason` in the `NotFound` launch error.** Otherwise an agent sees "ocx not found" while `which ocx` finds it [A §1.1].
- Never steer the lookup through `psi.Environment["PATH"]`.
- Why:
  - .NET probes the app directory, then the cwd, then the parent's PATH. A planted `./ocx` ran on Linux net8/net10 and on Windows [L V6].
  - The child PATH is ignored for lookup [L V7].
  - `HOME` is unset on stock Windows [L §5.5].
  - A mode-0666 `ocx` inside a clean directory, and a 0777 `$OCX_HOME` bin directory, were both accepted by the wave-2 resolver [K2 R1, R3]. This is CWE-426.
- Check:
  - `rg -n -g '*.cs' -e 'FileName\s*=\s*"' -e 'new ProcessStartInfo\("' -e 'PATHEXT' -e 'GetEnvironmentVariable\("HOME"\)' src` prints nothing.
  - A resolver test covers a planted cwd binary, a 0777 PATH directory, a 0666 file, a `.` entry and a 0777 home tier, and asserts the skip reason in the message.
- ocx: none (the resolver is a unit). The Windows real-ocx runs used the absolute `ocx.exe` of main@3485207c1 [R §2.13].
- Watched: yes.
  - Red in [L V6/V7]. Green in [K PROC-03] on Linux and Windows.
  - [K2] wave-2 resolver: `R1`, `R2`, `R3` RED on net8 and net10. Revised resolver: GREEN, with `skipped untrusted: <tmp>/badfile: file group/other-writable`.
  - `R4` controls (clean home tier, unchecked explicit path) were green on both.

**CS-PROC-04 (MUST): refuse every `.cmd`/`.bat` target, compared case-insensitively.**
- Refuse it in the resolver and again at the seam, with no escape hatch.
- Why:
  - Windows routes batch files through `cmd.exe`, via `ArgumentList` and string alike. Measured: `x&ver` ran `ver`, and `%USERNAME%` expanded inside quotes [L V11].
  - No complete `cmd.exe` escaper exists. Rust's fix for CVE-2024-24576 returns `InvalidInput`.
  - Real ocx refuses to exec its own launcher shim (`ocx exec -- <shim.exe>` exits 64 [R §2.9]), so the SDK has no reason to route through one.
- Check:
  - `rg -l -i -g '*.cs' -e '\.(cmd|bat)\b' src | xargs -r rg --files-without-match RejectBatch` prints nothing.
  - A test refuses `ocx.CMD` before any launch.
- ocx: dummy.
- Watched: yes. Red in [L V11] on Windows. Green in [K PROC-04] on Linux and Windows; the `rules` check printed 1/0.

**CS-PROC-05 (SHOULD): catch launch failures only around `Process.Start`, as `catch (Win32Exception)`, and branch on `NativeErrorCode`.**
- Codes:
  - 2 or 3: not found.
  - 0, 5 or 13: not executable.
  - 8, 193 or 216: bad format.
  - 7 or 206: argv too long.
- Throw one `OcxLaunchException` with a failure enum and the original as `InnerException`.
- The message names the exe and never the argv.
- Never write an unfiltered `catch (Exception)`.
- Why:
  - The code spaces differ per OS. A directory as `FileName` gives 0 on Linux and 5 on Windows [L §3].
  - A non-PE `ocx.exe` gave **216**, not the 193 [L] recorded for a text file [K Windows]. 216 is also the wrong-architecture error.
  - An over-long argv gives 206 on Windows and 7 on Linux [L V17]. [L]'s separate length pre-check is dropped because this mapping already types it.
- Check:
  - `rg -n -P -g '*.cs' 'catch\s*\(\s*Exception(\s+\w+)?\s*\)(?!\s*when)' src` prints nothing.
  - A table test.
- ocx: dummy.
- Watched: yes. [K PROC-05] gave 2/0/13 on Linux and 2/5/216 on Windows. The first Windows run was red at 216 until it was mapped.

**CS-PROC-06 (MUST): give the child the inherited environment, scrubbed.**
- Inherit the environment, then remove these keys, compared `OrdinalIgnoreCase` on every OS: `OCX_PROJECT OCX_GLOBAL OCX_QUIET OCX_NO_VERIFY OCX_NO_HOOK OCX_NO_COMPLETION CLICOLOR_FORCE`.
- Then set `OCX_NO_UPDATE_CHECK=1` and `OCX_BINARY_PIN=<exe>`.
- Then apply the caller's values. A `null` value removes the key.
- Mutate only `psi.Environment`. Never call `Environment.SetEnvironmentVariable` and never call `Environment.Clear()`.
- **Do not add `OCX_OFFLINE`, `OCX_FROZEN` or `OCX_NO_CONSENT` to the scrub.** They are the operator's intent. A garbage value surfaces as exit 78 `invalid_env`, and `OCX_OFFLINE=1` as exit 81 [R §2.11]. The deny-list vs allow-list question stays open (owner decision 3).
- Why:
  - Real ocx corrupts or empties the document when these keys leak:
    - An ambient `OCX_QUIET=1` gave exit 0 with 0 bytes of JSON.
    - `CLICOLOR_FORCE=1` ANSI-highlighted the JSON on stdout itself, so it no longer parsed [L V5], [R §2.4].
    - A leaked `OCX_PROJECT`, `OCX_GLOBAL` or `OCX_NO_VERIFY` changed the exit to 79, 74 or 78 [R §2.11].
  - On Linux an exact-case `Remove` leaks `ocx_quiet` [L V4].
  - `psi.Environment` is a snapshot taken at first access [L §5.1].
  - `Clear()` drops `PATH`/`SYSTEMROOT` (Nuke) [W §11.11].
- Check:
  - RS0030 on both `SetEnvironmentVariable` overloads.
  - `rg -n -g '*.cs' 'Environment\.Clear\(\)' src` prints nothing.
  - An env test.
- ocx:
  - 0.6.5 on Linux and 0.6.3 on Windows [L V5].
  - main@3485207c1 on Linux: 5 keys observable, `OCX_NO_HOOK` and `OCX_NO_COMPLETIONS` defensive. Scrubbed equalled the baseline for every key [R §2.11].
- Watched: yes. Red in [L V3-V5] and [R PROC-R-03/R-11] (leaked twin). Green in [K PROC-06] on Linux and Windows; the `rules` P06 check printed 1/0.

**CS-PROC-07 (MUST): build every call's argv in a fixed shape.** *(Revised: every call, passthrough included; `--project` for project handles.)*
- It starts `--format json --color never`, before the subcommand, on **every** call, passthrough included.
- Never send `--quiet`. Control logs with `--log-level`, never `OCX_LOG_LEVEL`.
- A call made through a project handle passes `--project <absolute ocx.toml>` as a global flag. It never relies on the cwd walk.
- Refuse an operand that starts with `-` (CWE-88).
- Exec gets `--` before the child argv.
- Why:
  - The format and colour flags are pre-subcommand only and have no env twin. `version --format json`, `version --json` and `--format json version --color never` exit 64 on main and on 0.6.5 [R §2.4].
  - `--color never version` without `--format json` prints 6 bytes of plain text [R §2.4].
  - ocx's own error document on a failed `exec` appears only with `--format json`, and CS-PROC-21 needs it.
  - `--color` outranks `CLICOLOR_FORCE` [L §5.2].
  - 0.6.5 ignores `OCX_LOG_LEVEL` [OC §2].
  - Under an ambient `OCX_NO_PROJECT=1`, which is not scrubbed, a bare `exec` exits 64 `no_project` [R §2.1, §2.6].
  - Python's `compose_argv` has the same leading-dash guard [PY §2].
- Check: a unit test on the composer output, asserting `--project` precedes the subcommand for a project handle. `rg -n -g '*.cs' '"--format"' src | wc -l` prints 1.
- ocx: main@3485207c1 and 0.6.5, placement matrix PROC-R-02 [R §2.4].
- Watched: the composer is green only [K PROC-07]. Flag precedence was watched red/green in [L V5] and [R PROC-R-03]. The `--project` clause rests on an observed exit 64, not on an SDK twin.

**CS-PROC-08 (MUST): pass secrets only as stdin bytes or child environment variables.**
- The stdin-secret arguments are `login --password-stdin` and `package sign|attest --identity-token-stdin` [OC §4].
- The `OCX_AUTH_*` family travels in the child environment.
- No secret ever enters `ArgumentList`.
- Types that hold secrets or captured output override `PrintMembers` to print sizes.
- Exceptions and logs carry the ocx verb, never argv or env values.
- Captured stderr goes through one redactor that holds every form of each secret: the raw value and base64 of `user:token`.
- Why:
  - A secret in argv was readable from `/proc/<pid>/cmdline` and from `Win32_Process.CommandLine` [L V8].
  - A record's generated `ToString()` printed the token [L V9].
  - The Python redaction set is the template [PY row 25].
  - No password appeared in any stdout or stderr of real `ocx login` [R §2.10].
- Check:
  - `rg -n -i -g '*.cs' 'ArgumentList\.Add\([^)]*(password|token|secret)' src` prints nothing.
  - `rg -l -P -g '*.cs' 'record\s+\w+\s*\([^)]*\b(Token|Password|Secret)\b' src | xargs -r rg --files-without-match PrintMembers` prints nothing. This corrects [L] rule 18, whose `rg -L` is `--follow`.
  - A `ToString()` test.
- ocx: dummy [L V8/V9]. Login on main@3485207c1 against `registry:2` [R §2.10].
- Watched: yes. Red in [L V8/V9]. Green in [K PROC-08] (`OcxInvocation { Exe = ..., Args = 2 items, Stdin = 6 bytes }`). The `rules` P08 checks printed 1/0 each.

### I/O

**CS-PROC-09 (MUST): drain stdout and stderr with one byte-pump task each.**
- Each pump loops `BaseStream.ReadAsync(Memory<byte>)`.
- Start both immediately after `Start`, and before writing stdin.
- Wait for the process with `WaitForExitAsync(token)`.
- Never use `ReadToEnd`/`ReadToEndAsync`, `Begin*ReadLine`/`OutputDataReceived`, or any sync `WaitForExit` overload.
- Why:
  - Sequential reads deadlock at 1 MiB of stderr in the sync form and in the async-but-sequential form. Seen on net8/10, Linux and Windows [S `deadlock-seq-*-bad`].
  - Event mode makes `WaitForExitAsync` wait for EOF, which a grandchild can hold for 8 s [S §3].
  - Writing stdin before the drains deadlocks [S `stdin-deadlock-bad`].
  - Meziantou's .NET 5 workaround ("sync `WaitForExit()` after the async wait") is obsolete since .NET 6 (runtime#42556) and re-adds the stall [S §4].
- Check:
  - The RS0030 lines for `ReadToEnd`, `ReadToEndAsync` (both overloads), `BeginOutputReadLine`, `BeginErrorReadLine` and all three `WaitForExit` overloads.
  - `dotnet_diagnostic.CA1849.severity = error` and `dotnet_diagnostic.VSTHRD103.severity = error`. CA1849 is not enabled by default in .NET 10 [S].
  - A 1 MiB stderr test under a 10 s bound.
- ocx: dummy.
- Watched: yes. Red in [S], 6 s timeouts. The bans fired on lines 16-22 of `bans/red` [K]. Green in [K PROC-09]: 30 ms on Linux, 101 ms on Windows.

**CS-PROC-10 (MUST): cap each captured stream.**
- The option is `ProcessIoOptions.MaxOutputBytes`, default 16 MiB. Past the cap, discard and keep reading.
- On a JSON command, stdout overflow fails closed with an output-limit error that carries the exit code.
- Stderr overflow keeps the head and sets `StderrTruncated`.
- Passthrough output goes to a caller-supplied `Stream` sink, not a buffer. The engine still keeps the first 64 KiB of stdout for the CS-PROC-21 check.
- Why:
  - Stopping at the cap re-creates the deadlock: 6 s [S `cap-stop-reading-bad`].
  - `ReadToEnd` allocated 256 MiB for a 64 MiB child [S].
  - ocx's own script host caps at 10 MiB [S §6].
- Check:
  - Reading heuristic: the cap branch of the pump never `break`s or `return`s.
  - A test floods 64 MiB against a 1 MiB cap.
- ocx: dummy.
- Watched: yes. Red in [S]. Green in [K PROC-10]: 1,048,576 bytes captured, `truncated=True`, 113 ms, 5 MiB allocated. The 64 KiB head on the sink path is not watched.

**CS-PROC-11 (MUST): set one encoding on all three streams.**
- On the seam, set `StandardInputEncoding`, `StandardOutputEncoding` and `StandardErrorEncoding` to one shared `static readonly UTF8Encoding Utf8NoBom = new(encoderShouldEmitUTF8Identifier: false)`.
- Ban `Encoding.UTF8` and `Encoding.Default`.
- Decode each capture once, with the span overload or a `Decoder`.
- Parse JSON from bytes. Decode stderr lossily.
- Why:
  - A null encoding means the console code page on Windows. At cp437, `é€😀` decoded to 9 mojibake code points, and it was green at cp65001, so CI hides the bug [S §7].
  - `Encoding.UTF8` makes `StreamWriter` emit `EF BB BF` on a pipe [S §8, L V10].
  - A per-chunk `GetString` produced 18 U+FFFD on Linux and 222 on Windows [S].
  - Real `ocx exec` passed `héllo→世界` through byte-exact on Linux and Windows [R §2.7].
- Check:
  - RS0030 on `P:System.Text.Encoding.UTF8`, `P:System.Text.Encoding.Default` and `M:System.Text.Encoding.GetString(System.Byte[],System.Int32,System.Int32)`.
  - `for k in Output Error Input; do rg -l -g '*.cs' "RedirectStandard${k}\s*=\s*true" src | xargs -r rg --files-without-match "Standard${k}Encoding"; done` prints nothing.
  - A Windows test at `chcp 437`.
- ocx: dummy [S], [K]. Pass-through on main@3485207c1 [R].
- Watched: yes. Red in [S] at Windows cp437. Green in [K PROC-11] on Windows at code page 437 (`U+00E9 U+20AC U+1F600`). The loop printed 1/0 for Output.

**CS-PROC-12 (MUST): write stdin as exact bytes to `StandardInput.BaseStream`.**
- No newline and no `TextWriter`.
- Write from a task created after the pumps. Flush, then `Close()`.
- Swallow `IOException`, which means the child stopped reading.
- Never call `StandardInput.Write*`.
- Why:
  - Real `ocx login --password-stdin` strips exactly one trailing `\n`. It keeps a `\r` and a UTF-8 BOM as password bytes: the stored `user:password` ended in `0D` or began `EFBBBF`, and the follow-up call got 80. UTF-16 stdin exited 1 `internal` [R §2.10].
  - The default code page turned `pässwörd→世` into 10 bytes [L V10].
  - Raw bytes bypass every encoder, so this rule and CS-PROC-11 agree by construction.
- Check:
  - `rg -n -g '*.cs' 'StandardInput\.(Write|WriteLine)(Async)?\(' src` prints nothing.
  - A test sends `pässwörd→世` and expects 16 bytes with no BOM and no CR.
- ocx: dummy [L], [S], [K]. main@3485207c1 against `registry:2` with htpasswd [R §2.10].
- Watched: yes.
  - Red in [L V10] and [S `stdin-writeline-bad`] on Windows. The real-consumer red rows (CRLF, BOM → 80) are in [R PROC-R-07].
  - Green in [K PROC-12] on Linux and on Windows cp437 (`ok:70C3A473:16`). BOM-less UTF-8 was stored byte-exact by ocx [R].

**CS-PROC-13 (MUST): bound the drain once the process has exited.**
- The bound is `DrainGrace`, default 5 s, settable per call.
- On expiry:
  - Seal both captures.
  - Cancel the pump token.
  - Observe the abandoned tasks.
  - Return with `DrainTimedOut = true`. Do not throw and do not kill.
- Why:
  - A grandchild that holds the pipe stalls every EOF-based wait for its whole life [S §5, W E7, MedallionShell #104].
  - The exit code and the document are already complete.
  - After a natural exit, Linux `Kill(true)` cannot reach re-parented grandchildren [C asymmetry].
  - The ocx Rust spawn bounds its reader the same way [OC §6].
- Check: a test spawns `grandchild 8` with a 1 s grace and expects a return within 3 s, the flag set and stdout `done`.
- ocx: dummy [S], [K]. On main@3485207c1 the `term-first` row returned after the full 5 s grace [R §2.9].
- Watched: yes. Red in [S], 8056 ms. Green in [K PROC-13]: 1046 ms on Linux, 1097 ms on Windows.

### Termination

**CS-PROC-14 (MUST): kill with `Kill(entireProcessTree: true)`, and only while the root is alive.**
- Wrap it in a filtered catch: `InvalidOperationException`, `Win32Exception` or `AggregateException`.
- Follow it with a bounded reap, `WaitForExitAsync(CancellationToken.None)` bounded by `ReapTimeout` (5 s), before returning or throwing.
- Never use bare `Kill()`, `CloseMainWindow()`, `taskkill`/`pkill`, or a helper exe extracted at runtime.
- **Never create a job object.** No `CreateJobObject`/`AssignProcessToJobObject` P/Invoke. Host-death containment stays an owner decision (owner decision 7).
- Why:
  - Bare `Kill()` orphans the grandchild on Linux, on Windows and on net8 [C V1, W E3].
  - **Real ocx, both shapes:**
    - On Unix `ocx exec` calls execvp, so the tree is `engine > tool` with no ocx in it.
    - On Windows `ocx.exe` spawns and waits, so the tree is `engine > ocx.exe > tool`.
    - `ocx.exe` holds no job object: `Kill(false)` on it left the tool alive.
    - `Kill(true)` reaped `ocx.exe > cmd.exe > ocxslow.exe` and the shim chain [R §2.9].
  - Only the launcher shim makes a `KILL_ON_JOB_CLOSE` job. It is a second, independent net, not one the SDK can rely on [R §2.9].
  - Cancelling the wait does not stop the child [C §4].
  - Host native code that resets SIGCHLD hangs `WaitForExitAsync` (runtime#114847), hence the bound.
- Check:
  - RS0030 on `M:System.Diagnostics.Process.Kill()` (explicit parentheses, so `Kill(bool)` stays legal) and on `CloseMainWindow`.
  - `rg -n -w -g '*.cs' -e taskkill -e pkill -e killall -e GenerateConsoleCtrlEvent src` prints nothing.
  - `rg -n -g '*.cs' -e CreateJobObject -e AssignProcessToJobObject -e SetInformationJobObject src` prints nothing.
- ocx:
  - dummy [C], [K].
  - main@3485207c1 on Linux and Windows: `win-tree` before `ocx.exe=1 cmd.exe=1 ocxslow.exe=1`, after `0 0 0` [R §2.9].
  - [C]'s Windows exec reading was source@246863abc1d4 only.
- Watched: yes.
  - Red in [C V1] and [R `no-shim-control`] (tool orphaned after `Kill(false)`).
  - Green in [K PROC-14] and [R `win-tree`, `shim-tree`].
  - The job-object `rg` is not watched red.

**CS-PROC-15 (MUST): the caller's token and the SDK timeout surface as two distinct exceptions.**
- Take one caller token.
- Per call, create `CreateLinkedTokenSource(ct)` and call `CancelAfter(timeout)`.
- Classify in `catch (OperationCanceledException e) when (linked.IsCancellationRequested)`:
  1. Kill and reap.
  2. If `ct.IsCancellationRequested`, throw `new OperationCanceledException(msg, e, ct)`.
  3. Otherwise throw `OcxTimeoutException : OcxException` with the redacted stderr tail. It is not an OCE, not `TimeoutException` and not `TaskCanceledException`.
- This is identical to CS-ASYNC-08 and CS-ERR-05.
- Why: for both causes, `WaitForExitAsync` throws `TaskCanceledException` carrying the linked token [C V2].
- Check:
  - `rg -n -P -g '*.cs' 'catch\s*\(\s*OperationCanceledException[^)]*\)(?!\s*when)' src` prints nothing.
  - `rg -n -P -g '*.cs' 'new OperationCanceledException\((?![^;]*\b(ct|cancellationToken|token)\b)' src` prints nothing.
  - `rg -n -P -g '*.cs' 'class OcxTimeoutException\b[^{]*:\s*+(?!OcxException\b)' src` prints nothing. The possessive `\s*+` is required: without it the pattern matched the correct declaration [K].
- ocx: dummy [C], [K]. With real `ocx exec`, main@3485207c1 on Linux: caller cancel gave an OCE in 1169-1192 ms, a 2 s timeout gave `OcxTimeoutException` at 2.7 s, 0 orphans [R §2.9].
- Watched: yes. Red in [C V2]. Green in [K PROC-15] on Linux and Windows. The `rules` P15 checks printed 1/0 each.

**CS-PROC-16 (SHOULD): validate `Timeout` once.**
- Accept `InfiniteTimeSpan` or a value in (0, 24 days].
- Call `CancelAfter` only for a finite value.
- Why:
  - `CancelAfter` throws above `uint.MaxValue - 1` ms on net8/10, and the documented cap varies by version.
  - `0` cancels at once [C §3].
- Check: a test at -2 ms, 0 and 25 days.
- ocx: dummy.
- Watched: the bounds are green in [K PROC-16]. The throwing edge was measured in [C].

**CS-PROC-17 (MUST): the SDK installs no process-wide handler.**
- None of: `Console.CancelKeyPress`, `AppDomain.ProcessExit`, `PosixSignalRegistration`, a SIGCHLD/`sigaction` P/Invoke.
- Docs tell hosts to cancel in-flight calls on SIGTERM.
- Why:
  - .NET 10 removed the default SIGTERM handler. `ProcessExit` ran on net8 and did not run on net10; the exit code stays 143 [C §9].
  - Library handlers collide with the host's.
- Check: the RS0030 `E:`/`M:` lines (they fired on `bans/red` lines 28-30 [K]), plus `rg -n -g '*.cs' sigaction src`.
- ocx: dummy.
- Watched: yes (the bans). The runtime behaviour was measured in [C].

**CS-PROC-18 (MUST): default grace is zero on every OS and for every command class.**
- Cancellation goes straight to `Kill(entireProcessTree: true)`.
- A POSIX SIGTERM rung is opt-in per call (`TermGrace`) and only for passthrough. It goes through exactly one `[LibraryImport("libc", EntryPoint = "kill")]`, fenced by `!OperatingSystem.IsWindows()`.
- Windows never interrupts: no `CTRL_BREAK`, no `CreateNewProcessGroup`.
- Why:
  - ocx 0.6.5 dies on SIGINT/SIGTERM at once, so grace buys nothing for ocx-owned commands [C §5].
  - .NET 8/10 can signal only the root, not its process group. A cooperative root exited on SIGTERM, its background child survived and kept the pipe, and the call took 5,504 ms. With the default it took 958 ms and the child died [K PROC-18].
  - **Reproduced on real ocx:** `ocx exec` with `TermGrace = 2 s` left 1 orphan `sleep` and returned at 5975 ms. With the default there were 0 orphans at 1169 ms. Because `ocx exec` execs into the tool, SIGTERM reaches the tool directly [R §2.9].
  - `GenerateConsoleCtrlEvent` returned true with nothing delivered. It needs `CreateNoWindow = false` (against CS-PROC-02) and net10 [C §6].
- Check:
  - `rg -c -g '*.cs' 'LibraryImport\("libc"' src` totals at most 1.
  - The P18 `rg` from CS-PROC-14.
  - A cancel test asserts the tree is gone in under 1.5 s.
- ocx: 0.6.5 for the signal behaviour [C §5]; dummy [K]; main@3485207c1 on Linux [R §2.9].
- Watched: yes, both twins in [K PROC-18] on net8 and net10, and in [R PROC-R-09] on main. The TERM-ignorer was killed after the 1 s grace, at 1,668 ms.

### Exit status

**CS-PROC-19 (MUST): the engine returns a result for every exit code; the command layer classifies stdout by shape, in one place.** *(Rewritten: the real-ocx run contradicted "parse stdout on non-zero only for the 17 `report_then_fail` modes".)*
- The engine result is `RawResult(ExitCode, Stdout, Stderr, StdoutTruncated, StderrTruncated, DrainTimedOut)`. The engine never throws on exit status.
- **The exit code is authoritative.** On every non-zero exit, one classifier reads stdout once and sorts it into one of three shapes:
  - **Error document:** a root object with an integer `exit_code` equal to the exit and an object `error` with a string `kind`. `detail` is optional.
  - **Report:** a root object without `error`.
  - **Empty:** a 0.6.5 usage error.
- It then throws `OcxCommandException` carrying `kind` and `detail` from an error document, or the raw report (CS-ERR-01 `PartialReportJson`) from a report.
- Never decide the shape by command name, by the `cli.json` mode list, or by whether stderr is empty.
- Never deserialize stderr. The error document is on stdout.
- Exit 0 with an unknown `status` fails closed. `index list <missing>` exit 0 is data.
- Why:
  - Five `report_then_fail` commands produced a genuine report **and** a non-zero exit, with no `error` member:
    - `package push`: 74.
    - `package prune`: 81 and 82.
    - `package sign`/`attest` sweeps: 79.
    - `package test --script`: 1.

    The sweeps printed 0 bytes on stderr, so the report is the only failure detail [R §2.3].
  - `self update` is labelled `report` (not `report_then_fail`) in `cli.json`, yet exits 75 for its `skipped` and `pulled` reports (`ocx@3485207c1:crates/ocx_cli/src/command/self_group/update.rs:15-16`; measured [R §2.8]). A list-driven parser would miss it.
  - On main every post-parse failure, and every usage error when `--format json` is anywhere on the line, prints one error document on stdout. All 49 documents had `exit_code` equal to the process exit [R §2.2].
  - On 0.6.5 a clap error prints nothing, and command errors print a compact document with no `detail` [R §2.2].
  - Throwing inside the pump layer loses the document [S §9].
- Check:
  - `rg -l -g '*.cs' -e '"exit_code"' src | wc -l` prints 1 (the decode seam, CS-ERR-04).
  - `rg -n -g '*.cs' -e 'Deserialize[^;]*Stderr' -e 'Stderr[^;]*Deserialize' src` prints nothing.
  - `rg -n -g '*.cs' 'ExitCode\s*!=\s*0' src/Process` prints nothing.
  - Contract tests (CS-TEST-07): `sign-sweep` expects the second item `failed`, `push --tags-file` expects 74 plus a report, and `--bogus` expects 64 plus a document on main and empty stdout on 0.6.5.
- ocx: main@3485207c1 on Linux and Windows, and 0.6.5 on Linux [R §2.2-2.3, §2.6].
- Watched: the engine is green in [K PROC-19] (`exit=65 stdout=15B, no throw`). The shapes were observed live in [R PROC-R-01/R-05]. The SDK classifier itself is specified, not built: the two `rg` lines are not watched red.

**CS-PROC-20 (MUST): never write an exit number outside the one exit table; select the table by the `contract` handshake, never by the `version` string.** *(Rewritten: wave 1 said "generate, keyed by ocx version".)*
- The table is CS-ERR-02's:
  - one hand-written `ExitTable.cs` with 13 rows;
  - open, so an unknown number keeps its raw `int` with `IsKnown == false`;
  - guarded by a conformance test against the vendored `errors.json` `$defs.ExitCode["x-ocx-enum"]` at the pinned ocx commit.
- A binary whose `ocx --format json version` has no `contract` object is `OcxContractException` before any typed call (CS-JSON handshake).
- Branch on `exit_code`, then `error.kind`, then `detail`. Never branch on `message`.
- `kind` never selects the category: 77 and 81 both carry `permission_denied`.
- Why:
  - main@3485207c1 reports `version: 0.6.5` (`describe: v0.6.5-15-g3485207c1-dirty`). A version-keyed table cannot tell 0.6.5's `82 DirtyRcBlock` from main's `82 Unsupported`. Only `contract` separates them, and no released ocx has it [R §2.5].
  - All 49 live error documents conformed to `errors.json`: `kind == category(exit)` and each `detail`'s own `exit_code` equals the exit. None was nonconforming [R §2.6].
  - The 0.6.5 and main tables differ [OC §1]. The Python enum is already stale ([OC §0], [PY S10]).
- Check:
  - `rg -n -P -g '*.cs' -g '!**/ExitTable.cs' '\b(code|exitCode|ExitCode)(\.Value)?\s*(==|!=|is)\s*\d{1,3}\b' src` prints nothing. This is CS-ERR-02's pattern.
  - `dotnet test --filter FullyQualifiedName~ExitTableConformance` runs in CI.
  - `rg -n -g '*.cs' 'Message\.(Contains|StartsWith)' src` prints nothing in the mapping code.
- ocx: main@3485207c1 for conformance and the handshake; 0.6.5 for the absent `contract` [R §2.5-2.6].
- Watched: the literal `rg` is red/green in [C V7] and [K P20] (1/0). Conformance was checked live by the [R] driver, not by the SDK test.

**CS-PROC-21 (MUST): a passthrough invocation returns `ChildExit` with the raw `int` code and an `IsOcxError` flag; it is never mapped, thrown or retried.** *(Rewritten: the command list was wrong and `ChildExit(int)` could not tell ocx's failure from the tool's.)*
- **Passthrough is a property of the invocation's output mode** (`cli.json` `output[].type == "passthrough"`), not of the command name.
  - Passthrough at 3485207c1: `exec`, `run`, `package exec`, `launcher exec`, `launcher shim`, and the non-script modes of `package test` and `patch test`.
  - `package test --script` is `report_then_fail` (`ScriptRunReport`: exit 1 plus a report, measured) and goes through CS-PROC-19.
- **Shape:** `sealed class ChildExit { int ExitCode; bool IsOcxError; }`. CS-ERR-03 owns the type shape; it is not a positional record.
- **`IsOcxError` rule.** It is true only when stdout is at most 64 KiB, starts with `{`, and is an ocx error document whose `exit_code` equals the exit. Document it as a heuristic: a tool can forge it.
  - It needs `--format json` on the passthrough argv (CS-PROC-07).
  - When output streams to a sink, it needs the engine's 64 KiB head (CS-PROC-10).
- Exit codes are `int` end to end, and never cast to `byte` (CS-ERR-02).
- Never hand the mapper an exit status the SDK itself caused: 137 or 143 on POSIX, -1 on Windows.
- Why:
  - ocx's own pre-launch failures share the tool's exit channel [R §2.7]:
    - `exec -- missing` exits 65 with a 1517 B error document.
    - `exec -- ./mode-644` exits 77 with a document.
    - A tool's own `exit 77` exits 77 with empty stdout.
  - `ChildExit(int)` could not tell these apart (RED x4).
  - A child's 64 or 80 collides with `UsageError` or `AuthError` ([OC §1], [PY S2]).
  - A child `exit 300` reads 300 on Windows and 44 on Linux [R §2.7].
  - An SDK kill reads 137 on POSIX and -1 on Windows [C §7].
- Check:
  - `rg -l -g '*.cs' ChildExit src | xargs -r rg -n -e 'ExitTable' -e 'OcxCommandException'` prints nothing.
  - P21-flag: `rg -l -g '*.cs' -e 'class ChildExit' src | xargs -r rg --files-without-match IsOcxError` prints nothing.
  - A unit test diffs the SDK's passthrough set against `cli.json` at the pinned commit.
  - Contract tests `launch-missing`, `launch-noexec`, `child-exit77`.
  - A cancel test expects an OCE and no `OcxCommandException`.
- ocx: main@3485207c1 on Linux and Windows; 0.6.5 for the forwarding [OC §1]. `cli.json` modes read at 3485207c1.
- Watched: yes.
  - [R §2.14]: the wave-2 engine gave `flag=(no such member)` x4 RED; the fixed engine gave `True/True/False/False` GREEN.
  - [K2] `C1-C3` GREEN on Linux net8/net10 and Windows.
  - P21-flag printed 1 on the wave-2 engine and 0 on `engine-r2`.
  - [C V7] for the mapper `rg`.

**CS-PROC-22 (MUST): retry only when exit 75 comes with a `temp_fail` error document of the same `exit_code`, and only for non-mutating ocx-owned invocations.** *(Rewritten: exit 75 alone was retried for a deterministic skip.)*
- The retry is bounded: 3 attempts, 1 s doubling to a 30 s cap, full jitter, `Task.Delay(d, ct)`. The timeout applies per attempt.
- Never retry passthrough, the 10 mutating commands [PY §6], timeouts or cancellations.
- Why:
  - `ocx self update --check --offline` exits 75 with a successful `{"status":"skipped"}` report on main and 0.6.5. The number-alone classifier returned `IsRetryable == true` for it [R §2.8].
  - The transient case is real: `package copy --to localhost:1` exits 75 with `kind: temp_fail, detail: registry_transient` [R §2.8].
  - 0.6.5's compact document carries `kind`, so the rule works on both builds [K2 C4].
  - A timed-out `login` exits 75 [PY §6].
  - A blind retry ran a passthrough 75 three times [C V3].
- Check:
  - `rg -n -g '*.cs' -e '== *75\b' -e TempFail src` hits only `OcxRetry.cs` and `ExitTable.cs`.
  - P22-doc: `rg -l -g '*.cs' -g '!**/ExitTable.cs' TempFail src | xargs -r rg --files-without-match '"temp_fail"'` prints nothing.
  - Contract tests `retry-skip` and `retry-copy-down`, and a matrix with one row per mutating command.
- ocx: main@3485207c1 and 0.6.5 [R §2.8].
- Watched: yes.
  - [R]: `retry-skip` RED `IsRetryable=True` → GREEN `False`; `exit75-retry` RED → GREEN.
  - [K2] `C4-C7` GREEN.
  - P22-doc printed 1/0/1 on the wave-2 engine, `engine-r2` and `engine-r2-mut`.
  - [C V3].

**CS-PROC-23 (MUST): .NET 11 process APIs appear only inside `#if NET11_0_OR_GREATER` and are never the default path.**
- The APIs:
  - On `Process`: `Run`/`RunAsync`, `RunAndCaptureText[Async]`, `ReadAllText`/`Bytes`/`Lines[Async]`, `WaitForExitStatus[Async]`, `Signal`, `StartAndForget`.
  - `ProcessExitStatus`.
  - On `ProcessStartInfo`: `KillOnParentExit`, `StartDetached`, `StartSuspended`, `InheritedHandles`, `Standard*Handle`.
  - `SafeProcessHandle.Start`.
- The shipping TFMs are net8.0;net10.0, and no RC SDK goes into `global.json`.
- Why:
  - They give CS0117 on net8/net10 [L V15].
  - RC1 `RunAsync` returns `Canceled=true` instead of throwing, and orphans grandchildren [C §10].
  - `ReadAllTextAsync` is unbounded and stalled 6 s on a held pipe [S §10].
  - `KillOnParentExit` docs disagree on platforms, and macOS is excluded [C §10].
- Check:
  - `dotnet build -c Release -f net8.0` and `-f net10.0` pass.
  - `rg -n -g '*.csproj' -g '*.props' 'net11' .` prints nothing.
- ocx: dummy.
- Watched: yes [L V15].

**CS-PROC-24 (SHOULD): test every mechanism above against a real dummy child on a Linux leg and a Windows leg, and against a real ocx in the contract tier.**
- The encoding and stdin tests run on Windows at a console code page that is not 65001.
- The contract tier (CS-TEST-07, armed by `OCX_SDK_CONTRACT`) carries the [R] probes:
  - Offline: usage error, flag placement, handshake, `package test --script` red/green, the `exec` exit table, `CLICOLOR_FORCE`.
  - Docker-gated: `push --tags-file`, `prune`, the `sign`/`attest` sweeps, the `login` byte rows [R normative 14].
- Why: these defects show only on a real process, and a cp65001 runner hides CS-PROC-11 [S §7]. Six engine divergences surfaced only against real ocx [R §2.14].
- Check: workflow reading. A Windows job runs the engine suite with no `chcp 65001` step. [K]'s `driver/` and [R]'s `driver/` are the templates. `dotnet test --filter "Category=Contract" --minimum-expected-tests 20`.
- ocx: dummy [K]; main@3485207c1 and 0.6.5 [R].
- Watched: [K]'s Windows leg ran at cp437. [R] ran 78/44/49 checks on main Linux, main Windows and 0.6.5 Linux.

**CS-PROC-25 (MUST, Windows): accept a PATH-tier or `$OCX_HOME`-tier `ocx.exe` only when neither its directory nor the file can be changed by anyone but the current user, Administrators, SYSTEM or TrustedInstaller.** *(New.)*
- **Placement:**
  - One `[SupportedOSPlatform("windows")] internal static class PathAcl`. The attribute goes on the class, not on a method.
  - It is called only under `OperatingSystem.IsWindows()`, from the resolver's PATH loop and home tier (CS-PROC-03).
  - Never call it for the explicit path or `OCX_SDK_EXE`.
- **How to read the ACL:**
  - Resolve junctions and symlinks first (`ResolveLinkTarget(true) ?? fsi`).
  - Read `GetAccessControl(AccessControlSections.Access | AccessControlSections.Owner)`. Never the `Audit` section.
  - Call `GetAccessRules(true, true, typeof(SecurityIdentifier))`. Never use `NTAccount` names.
- **What counts as untrusted:**
  - The trusted set is an allow-list: the current user SID, `S-1-5-18`, `S-1-5-32-544`, `S-1-3-0` and TrustedInstaller. Never write a deny-list of untrusted SIDs.
  - An untrusted owner refuses.
  - The mutating mask is exactly `WriteData | AppendData | ChangePermissions | TakeOwnership`. Never `Write`, `Modify` or `FullControl`.
  - Only Allow ACEs count; Deny ACEs are ignored, which errs toward refusing. Inherited ACEs count. `InheritOnly` ACEs are skipped on directories only.
- **Failure handling:**
  - Fail closed on `UnauthorizedAccessException`, `IOException` and `InvalidOperationException`, and on nothing broader.
  - Each refusal reason is appended to the `NotFound` message (CS-PROC-03).
- **Packaging:** no `System.IO.FileSystem.AccessControl` package on net8/net10. The shared framework has the assembly.
- **Tests:**
  - Build each test directory with `FileSystemAclExtensions.Create(DirectoryInfo, DirectorySecurity)` after `SetAccessRuleProtection(true, false)`.
  - Mark them `[Fact(SkipUnless = nameof(IsWindows))]` and run them on both Windows legs.
- Why:
  - **Default Windows ACLs create the hazard by themselves.** A standard user's new `C:\<folder>` inherits `Authenticated Users: Modify`; a new `C:\ProgramData\<folder>` inherits `Users: Write` [A §1.8]. The same class shipped as CVE-2022-45301 and usd-2019-0068 [A §1.12].
  - **The check is precise.** On a real 43-entry developer PATH it refused nothing that should pass: 41 accepted, 2 missing [A §1.8].
  - **The rejected alternatives fail measurably:**
    - A deny-list of Everyone, Users and Authenticated Users missed 3 of 6 bad directories (INTERACTIVE, another account, the user's own group).
    - Composite masks flipped 4 to 11 verdicts.
    - A junction passed until links were resolved.
    - A user-only directory holding an `Everyone:F` `ocx.exe` ran the plant until the file was checked too [A §1.4-1.10].
  - **CA1416 is the trap.** It fires on 34 symbols because the ref assembly is Windows-only at assembly level. A method-level attribute left 13 errors. An unguarded Linux call throws `PlatformNotSupportedException` [A §1.2].
  - **Nobody else covers it.** The Python SDK skips the cwd only on Windows, and the ocx CLI checks no Windows ownership [A §1.12].
- Check:
  - CA1416 at error under the gate (CS-BUILD TWAE). Unannotated plus unguarded gave 58 errors: [A V1] and [K2] `engine-r2-mut`.
  - P25-deny: `rg -n -g '*.cs' -e 'WellKnownSidType\.(WorldSid|AuthenticatedUserSid|BuiltinUsersSid|InteractiveSid|NetworkSid)' src` prints nothing.
  - P25-mask: `rg -o --no-filename -g '*PathAcl*.cs' 'FileSystemRights\.\w+' src | sort -u` prints exactly `AppendData`, `ChangePermissions`, `TakeOwnership`, `WriteData`.
  - P25-attr: `rg -l -g '*.cs' GetAccessControl src | xargs -r rg --files-without-match 'SupportedOSPlatform\("windows"\)'` prints nothing.
  - `rg -n -g '*.cs' NTAccount src` prints nothing.
  - `rg -n -e 'System\.IO\.FileSystem\.AccessControl' -e 'System\.Security\.AccessControl' -g '*.csproj' -g 'Directory.Packages.props' .` prints nothing.
  - The six-case Windows unit test [A §1.15], plus a missing directory that must refuse.
- ocx: none. Windows 11 build 26200, SDK 10.0.102, runtimes 10.0.2 and 8.0.31.
- Watched: yes.
  - [A §1.17]: 16 red/green pairs, the 19-right matrix and a 12-assert self-test on net10 and net8.
  - [K2] `W1-W3`: the integrated resolver on the Windows host. With `fx\bad` at `Everyone:(OI)(CI)(M)`, the wave-2 resolver ran `fx\bad\ocx.exe` (RED). `engine-r2` skipped it with `S-1-1-0 Modify, Synchronize inherited=False` and picked `fx\good` (GREEN).
  - P25-deny, P25-mask and P25-attr printed 1, `Modify`-containing and 1 on `engine-r2-mut`; on `engine-r2` they printed 0, the four names and 0.
  - P25-ntacct is not watched red.

### Conflicts resolved during the merge

1. **CliWrap dependency vs an owned engine (PR-16).** Decided: owned engine. The reasons are in Verdict 1, and the engine is verified [K], [R].
2. **Passthrough SIGTERM grace.** [C] proposed 5 s by default; this file sets 0. Reason: a measured orphan plus a 5.5 s stall [K PROC-18], reproduced on real ocx at 5975 ms [R §2.9].
3. **Grandchild-held pipe vs tree kill.**
   - [OC §8.11] and [C] rule 13 said "treat as a timeout". [S] said "return with a flag".
   - Decided: return with the flag; tree-kill only while the root is alive.
   - Reason: after exit on Linux the tree is unreachable [C asymmetry], and the result is complete.
4. **Stdin-secret path vs encoding.**
   - [L] proposed `StandardInputEncoding = UTF8Encoding(false)` plus `WriteAsync(string)`. [S] proposed raw bytes and a ban on `StandardInput.Write*`.
   - Decided: raw bytes, and set the encoding anyway. The string-writer form is dropped.
5. **PATHEXT.** [PY] row 31 says honour it; [L] says exact name. Decided for [L]: .NET ignores PATHEXT (code 2), and batch files bring BatBadBut.
6. **Drain shape.** [PY] row 15 offers `ReadToEndAsync`/`Begin*ReadLine`; [S] uses a byte pump. Decided: byte pump.
7. **Kill wiring.** [PY] row 18 and CliWrap use `ct.Register`; [C] uses a catch. Decided: catch-based, which matches CS-ASYNC-08.
8. **CRLF normalisation** ([PY] row 16). Not needed with byte pumps.
9. **BannedApiAnalyzers version.** [C] and [S] used 4.14.0; [L] used 5.6.0. Decided: 5.6.0, per CS-BUILD-15.
10. **Meziantou MA0161/MA0162/MA0163** ([L]) vs csharp-build's "exactly two packs". Decided: no Meziantou. RS0030 now covers every `Process.Start(string, ...)` overload, plus `rg` for `UseShellExecute = true`.
11. **`Encoding.Default` replacement.** csharp-build's message says `Encoding.UTF8`; this group bans `Encoding.UTF8`. Decided: `Utf8NoBom`. The build file must change; see owner decision 6.
12. **Paren-less documentation IDs.** [S] banned `M:...WaitForExit`, and [C]'s `WaitForExit(int)` ban was claimed "by analogy". Measured: the paren-less form bans only the parameterless overload. Explicit overload lines were added.
13. **`rg -L`** ([L] rule 18). It means `--follow`. Replaced by `--files-without-match`.
14. **The `OcxTimeoutException` type-pattern regex.** Without the possessive `\s*+` it matched the correct declaration. Fixed and watched [K].
15. **Argv length pre-check** ([L] rule 9). Dropped: the typed 206/7 mapping covers it.
16. **Windows CTRL_BREAK opt-in** ([C] rule 10) vs the `CreateNoWindow = true` baseline ([L]). Decided: no Windows interrupt in v1.
17. **Bad-format codes.** [L] recorded 193; the Windows host gave 216 for a non-PE `.exe`. Both are mapped.
18. **Launch exception types.** [L] proposed four types. Decided: one `OcxLaunchException` with an enum.
19. **CS-ASYNC-09 ("no `WaitAsync` as the timeout") vs the engine's `WaitAsync` drain and reap bounds.** They are compatible. `WaitAsync` here only bounds waits after the process has exited or been killed. The work timeout is `CancelAfter`.
20. **"Should `OcxTimeoutException` also derive from `TimeoutException`?"** (left open in [C]). Closed: C# has single inheritance, and the base is `OcxException`, as CS-ASYNC-08 and the API group require.
21. **Exit table: generated and keyed by ocx version (wave-1 CS-PROC-20, [C] #14) vs hand-written with a conformance test and floored at `contract` (CS-ERR-02).**
    - Decided for CS-ERR-02. CS-PROC-20 is rewritten in place.
    - Reason: main reports `version: 0.6.5`, so a version key cannot separate the two meanings of 82 [R §2.5]. The live conformance check gives the drift alarm a generator would [R §2.6].
22. **`ChildExit` shape.** Wave 2 had `readonly record struct ChildExit(int Code)` and [R] added `bool OcxErrorDocument`; CS-ERR-03 has `sealed class ChildExit` with `int ExitCode`.
    - Decided: CS-ERR-03's class (CS-API-05 forbids public positional records) plus [R]'s flag, named `IsOcxError`.
23. **Passthrough command list.** CS-PROC-21, CS-ERR-03 and [OC §1] name `exec, run, package exec, package test, launcher *`.
    - `cli.json` at 3485207c1 shows that `package test` and `patch test` each have both a passthrough mode and a `report_then_fail` mode. `patch test` was missing from the list.
    - Decided: classify per output mode, checked against `cli.json` by a unit test.
24. **When to parse stdout on a non-zero exit.** [S] and [OC §8.5] said only for the 17 `report_then_fail` modes; [R] said by shape.
    - Decided by shape. `self update` (mode `report`) exits 75 with a report [R §2.8], so the list is not a reliable discriminator.
25. **Retry on 75.** [C], [PY] `.retryable` and CS-ERR-10 key on the number alone; [R] requires a `temp_fail` document.
    - Decided for [R]: a deterministic `skipped` report exits 75 too.
26. **Scope of the trust check.** [A] scoped the Windows check to the PATH and `$OCX_HOME` tiers "as on POSIX". The wave-2 POSIX check covered only the PATH tier's directory.
    - Decided: one symmetric check of directory plus file on both tiers and both OSes. It costs one line on POSIX and was watched [K2 R1, R3].
27. **Job objects.** [R] normative 9 says "no job object". Owner decision 7 keeps an opt-in job for host death.
    - Decided: no job object in the kill path and none in v1. Host-death containment is a different concern and stays an owner decision.
28. **Scrub breadth.** [R] normative 15 says do not scrub `OCX_OFFLINE`/`OCX_FROZEN`/`OCX_NO_CONSENT`. [R] contested notes that hermetic-by-default favours dropping more.
    - Decided: keep the 7 keys. Those three are operator intent and fail loudly (78/81) rather than silently.
29. **Carrying the report on failure.** [R] sketches a decoded `Report` property; CS-ERR-01 has `string? PartialReportJson`.
    - Decided: keep CS-ERR-01's raw JSON on the non-generic exception. Typed reports for expected codes come through CS-ERR-09's accepted-exit-code set.
    - The word "Partial" is misleading, since `package push` printed a complete `pushed` report. This is flagged to csharp-api.
30. **Windows `ocx exec` spawn path.** [C §2] read "no `kill_on_drop`" at source@246863abc1d4; [R §2.7] reads `.kill_on_drop(true)` at 3485207c1.
    - The newer source wins. It does not affect the SDK: `TerminateProcess` runs no Rust drop, which is why `Kill(true)` is still required [R `no-shim-control`].

## Applied to the ocx C# SDK

### New commitments: the SDK design must change for these

| Commitment | Rules | Departs from |
|---|---|---|
| Own a 464-line engine (below). No CliWrap and no runtime dependencies (PR-16). | all | wrapper audit recommendation 4 left it open [W §8] |
| `RawResult` vs `ChildExit` are separate return types, so the compiler keeps passthrough codes out of the mapper. | 19, 21 | Python's single `_exit_error` path (S2) |
| **One stdout-shape classifier** (error document / report / empty) on every non-zero exit; the exit code is authoritative and the report rides on the exception. | 19 | [OC §8.5] "parse stdout only for `report_then_fail`"; [S] |
| **`ChildExit.IsOcxError`**, and passthrough decided per `cli.json` output mode. | 21 | [OC §8.8] "accept the ambiguity or spawn the tool yourself"; CS-ERR-03's single-field shape and command list |
| **Retry needs a `temp_fail` document**, not just 75. | 22 | Python `.retryable` fixed `True` for 75 ([PY §3], `_errors.py:158-165`); CS-ERR-10 |
| **Exit table selected by `contract`**, never by the version string. | 20 | wave-1 CS-PROC-20 and [C] #14 |
| **Windows ACL trust check (`PathAcl`)**; POSIX trust check extended to the file and the `$OCX_HOME` tier; skips listed in the error. | 3, 25 | Python `_trusted_location` (cwd only on Windows) and the ocx CLI (no Windows ownership check) [A §1.12] |
| Project handles pass `--project <abs ocx.toml>`; every call, passthrough included, carries `--format json --color never`. | 7 | cwd discovery only |
| `DrainTimedOut` flag, not a timeout exception, for a pipe held past exit. | 13 | [OC §8.11], [C] rule 13 |
| Output cap of 16 MiB per stream; stdout overflow fails closed; a 64 KiB stdout head is kept on the passthrough sink path. | 10, 21 | Python "no ceiling by design" [PY §2] |
| `TermGrace` defaults to 0 for every command class; SIGTERM is opt-in for passthrough only; no job object. | 14, 18 | [C] rule 8 (5 s for passthrough); Python `KILL_GRACE = 5.0` to the process group |
| One `OcxLaunchException` plus a failure enum; native error 216 mapped. | 5 | [L]'s four exception types |
| **`LoginAsync` promises no credential check.** ocx `login` exits 0 for a wrong password against a Basic-realm registry; only a later authenticated call returns 80. The result type has no `Verified` member, and the doc comment says so. | 8, 12 | [R §2.10]; the stated intent of `login` |
| The merged bans go into the single posture `BannedSymbols.txt` from csharp-build. | 1, 2, 6, 9, 11, 14, 17 | csharp-build's message "Encoding.Default → use Encoding.UTF8" (must change; see Open questions) |

### What the Python SDK already models (port semantics, not code)

- argv list with `shell=False`, the leading-dash guard and `--` before child argv (`compose_argv`, [PY §2]): CS-PROC-01/07.
- The neutralised-key choke point `build_spawn_env` ([PY row 24]; `_env.py:53-60`): CS-PROC-06.
- Two pumps with a bounded join, `_PUMP_JOIN = 5.0` ([PY §2]): CS-PROC-09/13. The 5 s default is taken from it.
- `OcxTimeoutError` kept apart from cancellation, with the timeout applied per attempt ([PY §2]): CS-PROC-15.
- `RetryPolicy`: mutating commands off, exec children never retried ([PY §6]): CS-PROC-22. Its number-only classifier is not ported.
- The redaction set and sizes-only `__repr__` ([PY rows 25-26]): CS-PROC-08.
- Discovery order, the cwd skip on Windows and the group-writable directory skip on POSIX ([PY row 31]; `_bootstrap.py:430-484`): CS-PROC-03.

### What the ocx CLI contract forces

- `--format json --color never` go before the subcommand. There is no env twin. Without `--format json` the output is plain text. Do not send `--quiet` [OC §2], [R §2.4].
- Secrets go only on stdin, through the three `stdin_secret` arguments [OC §4]. `login` strips one `\n` and keeps CR and BOM bytes [R §2.10].
- On main the error document is on stdout for every failure, including usage errors; on 0.6.5 usage errors print nothing [R §2.2].
- No released ocx has `contract`, so the handshake answers `Unsupported` for every release today [R §2.5].
- There are 17 `report_then_fail` modes across 14 commands, and a report can arrive with 74, 79, 81, 82 or 1. `self update` exits 75 with a report while labelled `report`. `index list <missing>` exits 0 [R §2.3, §2.8], [OC §1].
- Passthrough forwards the child's code as a 32-bit value on Windows and mod 256 on Linux, and ocx's own launch failures use the same channel [R §2.7].
- `OCX_BINARY_PIN` and an exact-name lookup on absolute PATH entries only [OC §6, §8.1].
- The data root is `%USERPROFILE%\.ocx` via `home_dir` [OC §3].
- On Unix `ocx exec` execs into the tool. On Windows `ocx.exe` spawns and waits with no job object; only the launcher shim has one. `ocx exec -- <shim>` is refused with 64 [R §2.9].

### Where the Python design must NOT be copied

| Python decision | Why not | Replaced by |
|---|---|---|
| The child's exit code goes through `_exit_error` (S2) | A tool's 80 surfaces as `AuthError` | CS-PROC-21 |
| `OcxProcessError.retryable` is fixed `True` for 75 ([PY §3]) | `self update --check --offline` exits 75 with a successful skip | CS-PROC-22 |
| `_trusted_location` on Windows is "not the cwd" ([A §1.12]) | `C:\<new folder>` is writable by Authenticated Users by default | CS-PROC-25 |
| `_verify_root` skips ownership and mode on Windows ([A §1.12]) | Same gap, for the binary cache | reuse `PathAcl` (flagged to CS-BIN) |
| `HostEnv.minimal()` drops `USERPROFILE`/`APPDATA`/`PATHEXT`, and discovery reads `HOME` only (S7) | Breaks Windows | CS-PROC-03/06 |
| Case-sensitive env keys (S8) | Linux lowercase leak; Windows folds | CS-PROC-06 `OrdinalIgnoreCase` |
| Stdin written before the drains, and unbounded capture (S9) | Deadlock at 2 MiB; 256 MiB for 64 MiB | CS-PROC-09/10/12 |
| Portability row 31: "honour PATHEXT" | `.cmd` goes through `cmd.exe`, and .NET does not consult PATHEXT anyway (`NativeErrorCode=2` [L §2.4]) | CS-PROC-03/04 |
| Row 15: `Task.WhenAll(ReadToEndAsync…)` or `BeginOutputReadLine` | No cap, no bound; event mode waits for EOF | CS-PROC-09 |
| Row 16: normalise CRLF | Byte pumps translate nothing | CS-PROC-11 |
| Row 18: `ct.Register(() => Kill(...))` | Races the awaiting continuation and needs a double-kill guard. The catch-based form is what CS-ASYNC-08 decided | CS-PROC-15 |
| Process-group SIGTERM ladder, 5 s | .NET 8/10 cannot `setsid` before exec; root-only SIGTERM orphans (measured, also on real ocx) | CS-PROC-18 |
| Windows `TerminateProcess` on one pid (S5) | Orphans the tool that ocx.exe spawned (measured [R `no-shim-control`]) | CS-PROC-14 |

### Reference engine

The fixture is `consolidate-csharp-process/engine-r2/`, targeting net8.0;net10.0.
- Analyzers match the csharp-build posture: BannedApiAnalyzers 5.6.0 and VS.Threading 18.7.23. `AnalysisLevel` is `latest-recommended`, with `TreatWarningsAsErrors`.
- Build: `0 Warning(s) 0 Error(s)` on both TFMs [K2].
- `OcxProcess.cs` is byte-identical to the wave-2 engine. It was verified in:
  - `transcript-linux.txt`: net8.0 8.0.31 and net10.0 10.0.12, `fails=0` each.
  - `transcript-windows-net10.txt`: runtime 10.0.2, cp437, `fails=0`.
  - [R]'s real-ocx runs.
- Rule IDs in comments are the CS-PROC rules.

**Naming note.** The reference uses `LaunchFailure`/`Failure`/`Other`/`BatchRefused` and `OcxException` with public constructors. In the SDK, CS-ERR-01 names and shapes win: `OcxLaunchFailure Reason`, `Unknown`, an abstract root with protected constructors. `BatchRefused` must be added to CS-ERR-01's enum (flagged).

Engine (`OcxProcess.cs`, unchanged from wave 2):

```csharp
// Reference process engine for the ocx C# SDK (net8.0;net10.0). Rule IDs = csharp-process.md CS-PROC-nn.
using System.Buffers;
using System.ComponentModel;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;

namespace Ocx.Sdk;

public class OcxException : Exception
{
    public OcxException() { }
    public OcxException(string message) : base(message) { }
    public OcxException(string message, Exception? inner) : base(message, inner) { }
}

// CS-PROC-15: an SDK timeout is NOT an OperationCanceledException.
public sealed class OcxTimeoutException : OcxException
{
    public OcxTimeoutException(TimeSpan timeout, string stderrTail, Exception? inner)
        : base($"ocx did not finish within {timeout}", inner) { Timeout = timeout; StderrTail = stderrTail; }
    public TimeSpan Timeout { get; }
    public string StderrTail { get; }   // already redacted; deliberately not in Message
}

public enum LaunchFailure { NotFound, NotExecutable, BadFormat, ArgvTooLong, BatchRefused, Other }

// CS-PROC-05: one typed launch error; message names the exe, never the argv.
public sealed class OcxLaunchException : OcxException
{
    public OcxLaunchException(LaunchFailure failure, string exe, Exception? inner)
        : base($"cannot start ocx ({failure}): {exe}", inner) { Failure = failure; }
    public LaunchFailure Failure { get; }
}

public sealed record ProcessIoOptions
{
    public int MaxOutputBytes { get; init; } = 16 * 1024 * 1024;           // CS-PROC-10
    public TimeSpan DrainGrace { get; init; } = TimeSpan.FromSeconds(5);   // CS-PROC-13 (Python _PUMP_JOIN)
    public TimeSpan ReapTimeout { get; init; } = TimeSpan.FromSeconds(5);  // CS-PROC-14
}

public sealed record OcxInvocation(string Exe, IReadOnlyList<string> Args, string WorkingDirectory)
{
    public IReadOnlyDictionary<string, string?> Env { get; init; } = new Dictionary<string, string?>(StringComparer.Ordinal);
    public ReadOnlyMemory<byte> Stdin { get; init; }                        // CS-PROC-08/12: secrets as bytes
    public TimeSpan Timeout { get; init; } = System.Threading.Timeout.InfiniteTimeSpan;
    public TimeSpan TermGrace { get; init; } = TimeSpan.Zero;               // CS-PROC-18: >0 only for passthrough
    public Func<string, string> Redact { get; init; } = static s => s;      // CS-PROC-08

    private bool PrintMembers(StringBuilder b)                              // CS-PROC-08: no env values, no stdin
    {
        b.Append("Exe = ").Append(Exe).Append(", Args = ").Append(Args.Count).Append(" items, Stdin = ").Append(Stdin.Length).Append(" bytes");
        return true;
    }
}

// CS-PROC-19: returned for EVERY exit code; the command layer decides what is a failure.
public sealed record RawResult(int ExitCode, byte[] Stdout, byte[] Stderr, bool StdoutTruncated, bool StderrTruncated, bool DrainTimedOut)
{
    private bool PrintMembers(StringBuilder b)
    {
        b.Append("ExitCode = ").Append(ExitCode).Append(", Stdout = ").Append(Stdout.Length).Append(" bytes, Stderr = ")
         .Append(Stderr.Length).Append(" bytes, DrainTimedOut = ").Append(DrainTimedOut);
        return true;
    }
}

public static partial class OcxProcess
{
    public static readonly UTF8Encoding Utf8NoBom = new(encoderShouldEmitUTF8Identifier: false);   // CS-PROC-11
    private static readonly TimeSpan MaxTimeout = TimeSpan.FromDays(24);                           // CS-PROC-16
    private static readonly string[] Scrubbed =                                                    // CS-PROC-06
        ["OCX_PROJECT", "OCX_GLOBAL", "OCX_QUIET", "OCX_NO_VERIFY", "OCX_NO_HOOK", "OCX_NO_COMPLETION", "CLICOLOR_FORCE"];

    // CS-PROC-07: global flags before the subcommand; leading-dash operands refused (CWE-88); "--" before child argv.
    public static IReadOnlyList<string> ComposeArgv(IEnumerable<string> command, IEnumerable<string> operands, IReadOnlyList<string>? child = null)
    {
        List<string> argv = ["--format", "json", "--color", "never", .. command];
        foreach (var o in operands)
        {
            if (o.StartsWith('-')) throw new ArgumentException("an operand may not start with '-'", nameof(operands));
            argv.Add(o);
        }
        if (child is { Count: > 0 }) { argv.Add("--"); argv.AddRange(child); }
        return argv;
    }

    // CS-PROC-04: batch files go through cmd.exe parsing (BatBadBut); refused at the resolver AND here.
    public static void RejectBatch(string exe)
    {
        var ext = Path.GetExtension(exe);
        if (ext.Equals(".cmd", StringComparison.OrdinalIgnoreCase) || ext.Equals(".bat", StringComparison.OrdinalIgnoreCase))
            throw new OcxLaunchException(LaunchFailure.BatchRefused, exe, null);
    }

    // CS-PROC-02: the ONLY place a ProcessStartInfo is built.
    public static ProcessStartInfo BuildStartInfo(OcxInvocation inv)
    {
        ArgumentNullException.ThrowIfNull(inv);
        RejectBatch(inv.Exe);
        if (!Path.IsPathFullyQualified(inv.Exe))                             // CS-PROC-03
            throw new OcxLaunchException(LaunchFailure.NotFound, inv.Exe, null);
        var psi = new ProcessStartInfo(inv.Exe)
        {
            UseShellExecute = false,
            CreateNoWindow = true,
            WorkingDirectory = inv.WorkingDirectory,
            RedirectStandardInput = true,                                    // always: never inherit a terminal stdin
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            StandardInputEncoding = Utf8NoBom,                               // CS-PROC-11: all three, every time
            StandardOutputEncoding = Utf8NoBom,
            StandardErrorEncoding = Utf8NoBom,
        };
        foreach (var a in inv.Args) psi.ArgumentList.Add(a);                 // CS-PROC-01
        foreach (var key in psi.Environment.Keys.ToArray())                  // CS-PROC-06: inherit, then scrub, case-insensitive
            if (Scrubbed.Contains(key, StringComparer.OrdinalIgnoreCase)) psi.Environment.Remove(key);
        psi.Environment["OCX_NO_UPDATE_CHECK"] = "1";
        psi.Environment["OCX_BINARY_PIN"] = inv.Exe;
        foreach (var (k, v) in inv.Env)
        {
            if (v is null) psi.Environment.Remove(k); else psi.Environment[k] = v;
        }
        return psi;
    }

    public static async Task<RawResult> RunAsync(OcxInvocation inv, ProcessIoOptions io, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(inv);
        ArgumentNullException.ThrowIfNull(io);
        if (inv.Timeout != Timeout.InfiniteTimeSpan && (inv.Timeout <= TimeSpan.Zero || inv.Timeout > MaxTimeout))
            throw new ArgumentOutOfRangeException(nameof(inv), inv.Timeout, "Timeout must be InfiniteTimeSpan or in (0, 24 days]");

        using var p = Start(BuildStartInfo(inv), inv.Exe);
        using var linked = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);    // CS-PROC-15
        if (inv.Timeout != Timeout.InfiniteTimeSpan) linked.CancelAfter(inv.Timeout);
        using var pumpCts = new CancellationTokenSource();
        var so = new Capture(io.MaxOutputBytes);
        var se = new Capture(io.MaxOutputBytes);
        Task[] io3 =
        [
            PumpAsync(p.StandardOutput.BaseStream, so, pumpCts.Token),       // CS-PROC-09: pumps first,
            PumpAsync(p.StandardError.BaseStream, se, pumpCts.Token),
            WriteStdinAsync(p, inv.Stdin, pumpCts.Token),                    // CS-PROC-12: then stdin, concurrently
        ];
        try
        {
            await p.WaitForExitAsync(linked.Token).ConfigureAwait(false);   // no Begin*ReadLine => returns at exit
        }
        catch (OperationCanceledException oce) when (linked.IsCancellationRequested)
        {
            await StopAsync(p, inv.TermGrace, io.ReapTimeout).ConfigureAwait(false);   // CS-PROC-14/18
            await DrainAsync(io3, so, se, pumpCts, io.DrainGrace).ConfigureAwait(false);
            if (cancellationToken.IsCancellationRequested)                   // caller wins a tie
                throw new OperationCanceledException("ocx cancelled by caller", oce, cancellationToken);
            throw new OcxTimeoutException(inv.Timeout, inv.Redact(Tail(se.ToArray())), oce);
        }
        var drained = await DrainAsync(io3, so, se, pumpCts, io.DrainGrace).ConfigureAwait(false);  // CS-PROC-13
        return new RawResult(p.ExitCode, so.ToArray(), se.ToArray(), so.Truncated, se.Truncated, DrainTimedOut: !drained);
    }

    // CS-PROC-05: catch only the launch call, branch on NativeErrorCode, keep the original.
    private static Process Start(ProcessStartInfo psi, string exe)
    {
        try
        {
            return Process.Start(psi) ?? throw new OcxLaunchException(LaunchFailure.Other, exe, null);
        }
        catch (Win32Exception e)
        {
            var failure = e.NativeErrorCode switch
            {
                2 or 3 => LaunchFailure.NotFound,
                0 or 5 or 13 => LaunchFailure.NotExecutable,   // 0 = a directory as FileName on Linux
                8 or 193 or 216 => LaunchFailure.BadFormat,   // 216: non-PE or wrong-arch .exe (measured, Windows)
                7 or 206 => LaunchFailure.ArgvTooLong,         // E2BIG (Linux) / ERROR_FILENAME_EXCED_RANGE (Windows)
                _ => LaunchFailure.Other,
            };
            throw new OcxLaunchException(failure, exe, e);
        }
    }

    // CS-PROC-09/10: byte loop; past the cap DISCARD and keep reading, or the child blocks on a full pipe.
    private static async Task PumpAsync(Stream s, Capture c, CancellationToken ct)
    {
        var buf = ArrayPool<byte>.Shared.Rent(81920);
        try
        {
            int n;
            while ((n = await s.ReadAsync(buf.AsMemory(), ct).ConfigureAwait(false)) > 0) c.Add(buf.AsSpan(0, n));
        }
        catch (Exception e) when (e is OperationCanceledException or IOException or ObjectDisposedException) { }
        finally { ArrayPool<byte>.Shared.Return(buf); }
    }

    // CS-PROC-12: exact bytes, no newline, no encoder, then EOF; a child that stops reading is not an SDK error.
    private static async Task WriteStdinAsync(Process p, ReadOnlyMemory<byte> bytes, CancellationToken ct)
    {
        try
        {
            if (!bytes.IsEmpty)
            {
                await p.StandardInput.BaseStream.WriteAsync(bytes, ct).ConfigureAwait(false);
                await p.StandardInput.BaseStream.FlushAsync(ct).ConfigureAwait(false);
            }
            p.StandardInput.Close();
        }
        catch (Exception e) when (e is OperationCanceledException or IOException or ObjectDisposedException) { }
    }

    // CS-PROC-13: bounded drain; on expiry seal, cancel, observe, and report instead of throwing.
    private static async Task<bool> DrainAsync(Task[] tasks, Capture so, Capture se, CancellationTokenSource pumpCts, TimeSpan grace)
    {
        try
        {
            await Task.WhenAll(tasks).WaitAsync(grace).ConfigureAwait(false);
            return true;
        }
        catch (TimeoutException)
        {
            so.Seal();
            se.Seal();
            await pumpCts.CancelAsync().ConfigureAwait(false);
            foreach (var t in tasks)
                _ = t.ContinueWith(static t => _ = t.Exception, CancellationToken.None, TaskContinuationOptions.OnlyOnFaulted, TaskScheduler.Default);
            return false;
        }
    }

    // CS-PROC-14/18: optional SIGTERM rung (POSIX passthrough only), then tree kill, then a BOUNDED reap.
    private static async Task StopAsync(Process p, TimeSpan termGrace, TimeSpan reapTimeout)
    {
        if (termGrace > TimeSpan.Zero && !OperatingSystem.IsWindows() && !p.HasExited)
        {
            _ = SysKill(p.Id, 15);   // SIGTERM; .NET 11: p.Signal(PosixSignal.SIGTERM) inside #if NET11_0_OR_GREATER only
            try
            {
                await p.WaitForExitAsync(CancellationToken.None).WaitAsync(termGrace).ConfigureAwait(false);
                return;
            }
            catch (TimeoutException) { }
        }
        try { p.Kill(entireProcessTree: true); }
        catch (Exception e) when (e is InvalidOperationException or Win32Exception or AggregateException) { }   // exited / partial tree
        try { await p.WaitForExitAsync(CancellationToken.None).WaitAsync(reapTimeout).ConfigureAwait(false); }
        catch (TimeoutException) { }   // ponytail: host native code broke the SIGCHLD reaper (runtime#114847); stop waiting, never hang
    }

    [LibraryImport("libc", EntryPoint = "kill", SetLastError = true)]
    private static partial int SysKill(int pid, int sig);

    private static string Tail(byte[] stderr) =>
        Utf8NoBom.GetString(stderr.AsSpan(Math.Max(0, stderr.Length - 4096)));   // CS-PROC-11: decode once, lossy

    private sealed class Capture(int cap)
    {
        private readonly ArrayBufferWriter<byte> _buf = new();
        private bool _sealed;
        public bool Truncated { get; private set; }

        public void Add(ReadOnlySpan<byte> b)
        {
            lock (_buf)
            {
                if (_sealed) return;
                var room = cap - _buf.WrittenCount;
                if (b.Length > room) { Truncated = true; b = b[..Math.Max(room, 0)]; }
                _buf.Write(b);
            }
        }

        public void Seal() { lock (_buf) _sealed = true; }
        public byte[] ToArray() { lock (_buf) return _buf.WrittenSpan.ToArray(); }
    }
}
```

Resolver (CS-PROC-03/04/25). Watched in [K2] as `R1-R4` on Linux and `W1-W3` on Windows:

```csharp
// CS-PROC-03/04/25: resolve ocx ONCE, to an absolute path, at handle construction (CWE-426).
namespace Ocx.Sdk;

public static class OcxBinaryResolver
{
    public static string DefaultHome() =>
        Environment.GetEnvironmentVariable("OCX_HOME") is { Length: > 0 } h
            ? h
            : Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".ocx");   // never $HOME (unset on Windows)

    /// <param name="explicitPath">caller option; wins; not trust-checked (caller intent).</param>
    /// <param name="overridePath">SDK env override (e.g. OCX_SDK_EXE), captured by the caller; not trust-checked.</param>
    /// <param name="pathVar">the PATH string captured once by the SDK.</param>
    public static string Resolve(string? explicitPath, string? overridePath, string? pathVar, string cwd, string ocxHome)
    {
        foreach (var configured in new[] { explicitPath, overridePath })
            if (!string.IsNullOrEmpty(configured)) return Accept(Path.GetFullPath(configured, cwd), []);

        var skipped = new List<string>();                                     // CS-PROC-25: surfaced in the NotFound message
        var name = OperatingSystem.IsWindows() ? "ocx.exe" : "ocx";          // exact name; no extension search
        var cwdFull = Path.TrimEndingDirectorySeparator(Path.GetFullPath(cwd));
        var cmp = OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal;
        foreach (var raw in (pathVar ?? "").Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries))
        {
            var entry = raw.Trim('"');
            if (!Path.IsPathFullyQualified(entry)) continue;                  // absolute entries only ("." never counts)
            var dir = Path.TrimEndingDirectorySeparator(Path.GetFullPath(entry));
            if (OperatingSystem.IsWindows() && string.Equals(dir, cwdFull, cmp)) continue;   // CreateProcess-style cwd hit
            var candidate = Path.Combine(dir, name);
            if (!File.Exists(candidate)) continue;
            var real = File.ResolveLinkTarget(candidate, returnFinalTarget: true)?.FullName ?? candidate;
            if (WhyUntrusted(dir, candidate, real) is { } why) { skipped.Add($"{dir}: {why}"); continue; }
            return Accept(real, skipped);                                     // PATH hit: pin the real target
        }
        // ocx's stable symlink; kept unresolved so `ocx self update` (repoints `current`) does not strand the pin
        var home = Path.Combine(ocxHome, "symlinks", "ocx.sh", "ocx", "cli", "current", "content", "bin", name);
        if (File.Exists(home))
        {
            var real = File.ResolveLinkTarget(home, returnFinalTarget: true)?.FullName ?? home;
            if (WhyUntrusted(Path.GetDirectoryName(home)!, home, real) is { } why) { skipped.Add($"{Path.GetDirectoryName(home)}: {why}"); home = ""; }
        }
        return Accept(home, skipped);
    }

    // CS-PROC-03 (POSIX mode bits) and CS-PROC-25 (Windows ACL): the directory AND the file must be writable by nobody else.
    private static string? WhyUntrusted(string dir, string candidate, string real)
    {
        if (OperatingSystem.IsWindows())
            return PathAcl.WhyUntrusted(new DirectoryInfo(dir)) ?? PathAcl.WhyUntrusted(new FileInfo(candidate));
        const UnixFileMode loose = UnixFileMode.GroupWrite | UnixFileMode.OtherWrite;
        if ((File.GetUnixFileMode(Path.GetDirectoryName(real)!) & loose) != 0) return "directory group/other-writable";
        if ((File.GetUnixFileMode(real) & loose) != 0) return "file group/other-writable";
        return null;
    }

    private static string Accept(string path, List<string> skipped)
    {
        OcxProcess.RejectBatch(path);                                         // CS-PROC-04
        if (File.Exists(path)) return path;
        var where = path.Length > 0 ? path : "ocx";
        throw new OcxLaunchException(LaunchFailure.NotFound, skipped.Count == 0 ? where : $"{where}; skipped untrusted: {string.Join("; ", skipped)}", null);
    }
}
```

Windows trust check (CS-PROC-25). This is [A §1.14] verbatim, namespace changed to `Ocx.Sdk`:

```csharp
// CS-PROC-25: Windows trust check for a PATH-tier or $OCX_HOME-tier hit (verbatim from csharp-process-windows-path-acl 1.14).
// Residual gaps, by design: Deny ACEs ignored (conservative), ancestors not checked, check-then-launch window.
using System.Runtime.Versioning;
using System.Security.AccessControl;
using System.Security.Principal;

namespace Ocx.Sdk;

[SupportedOSPlatform("windows")]
internal static class PathAcl
{
    // Rights that let a principal plant or replace a binary, or grant itself those rights.
    private const FileSystemRights Mutating =
        FileSystemRights.WriteData            // = CreateFiles on a directory
        | FileSystemRights.AppendData         // = CreateDirectories on a directory
        | FileSystemRights.ChangePermissions  // WRITE_DAC
        | FileSystemRights.TakeOwnership;     // WRITE_OWNER

    // NT SERVICE\TrustedInstaller owns System32 and Program Files content.
    private const string TrustedInstaller = "S-1-5-80-956008885-3418522649-1831038044-1853292631-2271478464";

    private static bool Trusted(SecurityIdentifier sid, SecurityIdentifier self) =>
        sid.Equals(self)
        || sid.IsWellKnown(WellKnownSidType.LocalSystemSid)           // S-1-5-18
        || sid.IsWellKnown(WellKnownSidType.BuiltinAdministratorsSid) // S-1-5-32-544
        || sid.IsWellKnown(WellKnownSidType.CreatorOwnerSid)          // S-1-3-0
        || sid.Value == TrustedInstaller;

    /// <summary>Why someone other than the current user, Administrators, SYSTEM or TrustedInstaller can change
    /// <paramref name="fsi"/>; null when nobody can. Fails closed.</summary>
    internal static string? WhyUntrusted(FileSystemInfo fsi)
    {
        try
        {
            using var me = WindowsIdentity.GetCurrent();
            var self = me.User!;
            // GetAccessControl reads the ACL of the link object itself, so resolve junctions and symlinks first.
            var real = fsi.ResolveLinkTarget(true) ?? fsi;
            const AccessControlSections sections = AccessControlSections.Access | AccessControlSections.Owner;
            FileSystemSecurity acl = real is DirectoryInfo d ? d.GetAccessControl(sections) : ((FileInfo)real).GetAccessControl(sections);
            if (acl.GetOwner(typeof(SecurityIdentifier)) is SecurityIdentifier owner && !Trusted(owner, self))
                return $"owner {owner.Value}";
            foreach (FileSystemAccessRule r in acl.GetAccessRules(true, true, typeof(SecurityIdentifier)))
            {
                if (r.AccessControlType != AccessControlType.Allow) continue;                                  // Deny ignored: conservative
                if (real is DirectoryInfo && (r.PropagationFlags & PropagationFlags.InheritOnly) != 0) continue; // children only
                if ((r.FileSystemRights & Mutating) == 0) continue;
                var sid = (SecurityIdentifier)r.IdentityReference;
                if (!Trusted(sid, self)) return $"{sid.Value} {r.FileSystemRights} inherited={r.IsInherited}";
            }
            return null;
        }
        catch (Exception e) when (e is UnauthorizedAccessException or IOException or InvalidOperationException)
        {
            return $"unreadable ACL ({e.GetType().Name})";   // fail closed
        }
    }
}
```

Error-document reader (CS-PROC-19/21/22). It comes from the [R] fixed engine. In the SDK it lives inside the CS-ERR-04 decode seam, the only file that reads `"exit_code"`:

```csharp
// CS-PROC-21/22 (revision, PROC-R-08/R-10): ocx writes ONE error document to stdout on its own failures, passthrough commands included.
using System.Text.Json;

namespace Ocx.Sdk;

/// <summary>The error document ocx prints on stdout when it fails itself: root object, "exit_code", "error":{"kind"[, "detail"]}.</summary>
public readonly record struct OcxExitDocument(int ExitCode, string Kind, string? Detail)
{
    private const int MaxBytes = 64 * 1024;   // an error document is ~0.3-1.5 KB; a child's stdout is never parsed past this

    public static OcxExitDocument? TryRead(ReadOnlySpan<byte> stdout)
    {
        var s = stdout.TrimStart((byte)' ').TrimStart((byte)'\n').TrimStart((byte)'\r');
        if (s.Length == 0 || s.Length > MaxBytes || s[0] != (byte)'{') return null;
        try
        {
            using var d = JsonDocument.Parse(s.ToArray());
            var root = d.RootElement;
            if (root.ValueKind != JsonValueKind.Object
                || !root.TryGetProperty("exit_code", out var code) || code.ValueKind != JsonValueKind.Number || !code.TryGetInt32(out var exit)
                || !root.TryGetProperty("error", out var err) || err.ValueKind != JsonValueKind.Object
                || !err.TryGetProperty("kind", out var kind) || kind.ValueKind != JsonValueKind.String)
                return null;
            return new(exit, kind.GetString()!, err.TryGetProperty("detail", out var det) && det.ValueKind == JsonValueKind.String ? det.GetString() : null);
        }
        catch (JsonException) { return null; }
    }
}
```

Passthrough result, retry classifier and exit-table stand-in (CS-PROC-20/21/22). They sit in separate files, so the `ChildExit` file check stays empty:

```csharp
// CS-PROC-21 / CS-ERR-03: a passthrough mode returns the child's raw code; never mapped, never thrown, never retried.
// ocx's OWN pre-launch failures (65 command not found, 77 not executable, 64 no project) use the same exit channel,
// so IsOcxError says whether stdout is an ocx error document whose exit_code equals the exit (heuristic: a tool can forge it).
namespace Ocx.Sdk;

public sealed class ChildExit
{
    private ChildExit(int exitCode, bool isOcxError) { ExitCode = exitCode; IsOcxError = isOcxError; }

    public int ExitCode { get; }
    public bool IsOcxError { get; }

    internal static ChildExit From(RawResult r)
    {
        ArgumentNullException.ThrowIfNull(r);
        return new(r.ExitCode, OcxExitDocument.TryRead(r.Stdout) is { } d && d.ExitCode == r.ExitCode);
    }
}
```

```csharp
// CS-PROC-22: the only retry classifier. Exit 75 alone is NOT a retry signal: `self update --check --offline`
// exits 75 with a successful `skipped` report. Only a temp_fail error document with the same exit_code is.
namespace Ocx.Sdk;

public static class OcxRetry
{
    public static bool IsRetryable(RawResult r, bool passthrough, bool mutating)
    {
        ArgumentNullException.ThrowIfNull(r);
        return !passthrough && !mutating && r.ExitCode == OcxExitCode.TempFail.Value
            && OcxExitDocument.TryRead(r.Stdout) is { Kind: "temp_fail" } d && d.ExitCode == r.ExitCode;
    }
}
```

```csharp
// CS-PROC-20 / CS-ERR-02: the ONE hand-written exit table (stand-in: only the row the retry classifier needs).
// A conformance test diffs the full 13-row table against vendored errors.json $defs.ExitCode["x-ocx-enum"].
namespace Ocx.Sdk;

public readonly record struct OcxExitCode(int Value)
{
    public static readonly OcxExitCode TempFail = new(75);
}
```

### BannedSymbols.txt fragment (merge into the csharp-build posture file)

Every line was watched. `bans/red/Bad.cs` raised `error RS0030` on all 22 planted lines (lines 9-30). The allowed controls stayed clean: `Kill(entireProcessTree: true)`, `WaitForExitAsync(ct)` and the `IEnumerable<string>` constructor. The engine built clean. This round adds no line: the round-2 rules are guarded by CA1416 and by `rg` checks, not by bannable APIs.

A documentation ID without a parameter list bans **only the parameterless overload**. That is why `WaitForExit`, `ReadToEndAsync` and `SetEnvironmentVariable` each carry explicit overload lines.

```text
P:System.Diagnostics.ProcessStartInfo.Arguments;CS-PROC-01: use ArgumentList, the SDK owns no quoting code
M:System.Diagnostics.ProcessStartInfo.#ctor(System.String,System.String);CS-PROC-01: use new ProcessStartInfo(exe) + ArgumentList
M:System.Diagnostics.Process.Start(System.String);CS-PROC-02: launch only through OcxProcess.Start(ProcessStartInfo)
M:System.Diagnostics.Process.Start(System.String,System.String);CS-PROC-01: string argv; launch only through OcxProcess
M:System.Diagnostics.Process.Start(System.String,System.Collections.Generic.IEnumerable{System.String});CS-PROC-02: launch only through OcxProcess
M:System.Diagnostics.Process.Start(System.String,System.String,System.Security.SecureString,System.String);CS-PROC-02: launch only through OcxProcess
M:System.Environment.SetEnvironmentVariable(System.String,System.String);CS-PROC-06: mutate ProcessStartInfo.Environment, never the host process
M:System.Environment.SetEnvironmentVariable(System.String,System.String,System.EnvironmentVariableTarget);CS-PROC-06: mutate ProcessStartInfo.Environment, never the host process
M:System.IO.StreamReader.ReadToEnd;CS-PROC-09: drain with the byte pump, never ReadToEnd
M:System.IO.TextReader.ReadToEnd;CS-PROC-09: drain with the byte pump, never ReadToEnd
M:System.IO.StreamReader.ReadToEndAsync;CS-PROC-09: drain with the byte pump (cap + bounded drain), never ReadToEndAsync
M:System.IO.StreamReader.ReadToEndAsync(System.Threading.CancellationToken);CS-PROC-09: drain with the byte pump (cap + bounded drain), never ReadToEndAsync
M:System.Diagnostics.Process.BeginOutputReadLine;CS-PROC-09: event mode makes WaitForExitAsync wait for EOF (grandchild stall)
M:System.Diagnostics.Process.BeginErrorReadLine;CS-PROC-09: event mode makes WaitForExitAsync wait for EOF (grandchild stall)
M:System.Diagnostics.Process.WaitForExit;CS-PROC-09: sync wait blocks a thread and waits for EOF; use WaitForExitAsync + bounded drain
M:System.Diagnostics.Process.WaitForExit(System.Int32);CS-PROC-09: sync wait; use WaitForExitAsync + bounded drain
M:System.Diagnostics.Process.WaitForExit(System.TimeSpan);CS-PROC-09: sync wait; use WaitForExitAsync + bounded drain
P:System.Text.Encoding.UTF8;CS-PROC-11: carries a BOM preamble on pipes; use OcxProcess.Utf8NoBom
P:System.Text.Encoding.Default;CS-PROC-11: host dependent; use OcxProcess.Utf8NoBom
M:System.Text.Encoding.GetString(System.Byte[],System.Int32,System.Int32);CS-PROC-11: per-chunk decode splits multibyte chars; decode the whole capture once
M:System.Diagnostics.Process.Kill();CS-PROC-14: use Kill(entireProcessTree: true); bare Kill() orphans grandchildren
M:System.Diagnostics.Process.CloseMainWindow;CS-PROC-14: GUI API, not a graceful stop for a console child
E:System.Console.CancelKeyPress;CS-PROC-17: a library installs no process-wide signal handler
E:System.AppDomain.ProcessExit;CS-PROC-17: not raised on SIGTERM since .NET 10; a library installs no exit handler
M:System.Runtime.InteropServices.PosixSignalRegistration.Create(System.Runtime.InteropServices.PosixSignal,System.Action{System.Runtime.InteropServices.PosixSignalContext});CS-PROC-17: hosts own signals
```

`.editorconfig` lines this group needs. RS0030 and CA2016 are shared with csharp-build and csharp-async. CA1416 needs no line: it is a warning by default and an error under CS-BUILD's unconditional TWAE [A §1.2].

```ini
[*.cs]
dotnet_diagnostic.RS0030.severity = error
dotnet_diagnostic.CA1849.severity = error
dotnet_diagnostic.CA2016.severity = error
dotnet_diagnostic.CA1068.severity = error
dotnet_diagnostic.VSTHRD103.severity = error
```

Round-2 commands. `T=/home/mherwig/.cache/research-lang/dotnet-tools/run.sh`; `F=.../fixtures/consolidate-csharp-process`. Observed output:

```text
(cd $F/engine-r2 && $T dotnet build -c Release --nologo -v q)          ->  0 Warning(s)  0 Error(s)
(cd $F/engine-r2-mut && $T dotnet build -c Release --nologo -v q)      ->  58 Error(s), 116 'error CA1416' lines (29 per TFM, 2 lines each)
(cd $F/driver-r2 && $T dotnet build -c Release -p:EngineDir=engine && $T dotnet bin/engine/Release/net10.0/DriverR2.dll)
    RED   R1 path-file-mode  <tmp>/badfile/ocx      RED R2 skip-reported      RED R3 home-tier-mode      fails=3 (net8.0 8.0.31 and net10.0 10.0.12)
(... -p:EngineDir=engine-r2 ...)
    GREEN R1 path-file-mode  <tmp>/good/ocx
    GREEN R2 skip-reported   THROW cannot start ocx (NotFound): ...; skipped untrusted: <tmp>/badfile: file group/other-writable
    GREEN R3 home-tier-mode  THROW ... skipped untrusted: <tmp>/home/symlinks/ocx.sh/ocx/cli/current/content/bin: directory group/other-writable
    GREEN R4 x2, C1-C7 x7    fails=0 (net8.0 and net10.0)
Windows host (consolidate-r2\run.cmd, runtime 10.0.2), fx\bad = Everyone:(OI)(CI)(M):
    old: RED W1 path-acl ...\fx\bad\ocx.exe    RED W2    GREEN W3              fails=2
    new: GREEN W1 ...\fx\good\ocx.exe   GREEN W2 skipped untrusted: ...\fx\bad: S-1-1-0 Modify, Synchronize inherited=False   GREEN W3, C1-C7   fails=0
rules/rules-check.sh {engine, engine-r2, engine-r2-mut}:  P21-flag 1/0/0   P22-doc 1/0/1   P25-deny 0/0/1   P25-attr 0/0/1   P25-mask -/4 names/contains Modify
```

## AI-agent failure modes

Ranked by how often the shape appears in training data and in the surveyed libraries. The census is [W §4/§11]: 10 of 10 wrappers keep a string argv path, and 5 of 10 call bare `Kill()`. Rows 18-25 are new this round, ranked within the new rows.

| # | Failure | Why it looks right | Check that catches it |
|---|---|---|---|
| 1 | `psi.Arguments = $"install {pkg}"`, `string.Join(" ", args)`, `Process.Start("ocx", "version")` | The .NET Framework and StackOverflow idiom | RS0030 (CS-PROC-01) |
| 2 | `ReadToEnd()` on stdout then stderr, or two sequential `await ReadToEndAsync()` | The learn.microsoft.com example reads one stream; `await` reads as concurrent | RS0030, CA1849, the 1 MiB stderr test (CS-PROC-09) |
| 3 | `p.Kill()` on cancel | The one-argument form dominates | RS0030 `Process.Kill()` (CS-PROC-14) |
| 4 | No `Standard*Encoding`, or `Encoding.UTF8` | "Linux is UTF-8", and CI runs at cp65001 | RS0030 on `Encoding.UTF8`/`Default`, the R7 loop, the cp437 test (CS-PROC-11) |
| 5 | `FileName = "ocx"` | Works in the author's shell | `rg FileName\s*=\s*"`, the planted-cwd test (CS-PROC-03) |
| 6 | `catch (OperationCanceledException) { throw new TimeoutException(); }` or `catch (TaskCanceledException)` | HttpClient habit | The P15 `rg` trio and the token-equality test (CS-PROC-15) |
| 7 | `if (p.ExitCode != 0) throw ...(stderr)` before stdout is read, which drops a `report_then_fail` report (the sweeps print 0 bytes on stderr); or deserializing stderr for the error JSON; or mapping an exec child's code | `check=True` habit; Python S2; Click puts errors on stderr | The one-reader `rg` (`"exit_code"` in one file), the stderr-deserialize `rg`, `ChildExit` file check, `sign-sweep` contract test (CS-PROC-19/21) |
| 8 | `p.WaitForExit()` after `WaitForExitAsync` "to flush output" | Meziantou 2020 advice, valid only on .NET 5 | RS0030, all three overloads (CS-PROC-09) |
| 9 | `StandardInput.WriteLine(secret)`, a BOM preamble, or a secret in argv | Works on Linux and interactively | P12 and P08 `rg`, stored-bytes `login` test (CS-PROC-08/12) |
| 10 | `psi.Environment.Remove("OCX_QUIET")` exact-case, `Environment.Clear()`, `Environment.SetEnvironmentVariable` | Correct on Windows; looks hermetic | RS0030, P06 `rg`, the lowercase-key test (CS-PROC-06) |
| 11 | `case 82: DirtyRcBlock`, `code == 75` typed from memory, or a table keyed on the `version` string | Stale tables in training data; semver looks authoritative | P20 `rg`, the conformance test, the `contract` handshake test (CS-PROC-20/22) |
| 12 | Stopping the read loop at the cap | Looks like a memory guard | The 64 MiB flood test (CS-PROC-10) |
| 13 | `RunAndCaptureTextAsync`, `ReadAllTextAsync`, `KillOnParentExit` offered as "the modern way" | In current docs (.NET 11 RC1) | `dotnet build -f net8.0` / `-f net10.0` (CS-PROC-23) |
| 14 | `psi.ArgumentList = new List<string>{...}` or `.AddRange(args)` | Reads naturally | Compiler: CS0200 and CS1929 [L V16] |
| 15 | PATHEXT scanning, or accepting `ocx.cmd` shims | npm/Node wrapper habit; Python row 31 | P03/P04 `rg`, the Windows guard test (CS-PROC-03/04) |
| 16 | `GenerateConsoleCtrlEvent`, `taskkill /T`, or a default SIGTERM grace | "Graceful is better" | P18 `rg`, the [K PROC-18] and [R term-first] timings (CS-PROC-18) |
| 17 | Gate false-greens: deleting `<AdditionalFiles Include="BannedSymbols.txt"/>`; a paren-less doc ID believed to ban every overload; `rg -L` read as "files without match" | One-line edits that keep the build green | P01-wired check (at least 1); red twin `bans/red` with one planted line per ban; `--files-without-match` spelled out |
| 18 | Retry on `ExitCode == 75` alone (Polly `HandleResult(r => r.ExitCode == 75)`) | ocx docs call 75 "the only code where retry is safe" | P22-doc `rg`; `retry-skip` contract test (CS-PROC-22) |
| 19 | A hard-coded passthrough list `exec, run, package exec, package test` | Copied from the audit and the Python SDK | Unit test diffing the SDK set against `cli.json` `output[].type` (CS-PROC-21) |
| 20 | Windows trust check ported as "no mode bits, skip it", or written with a deny-list of Everyone/Users/Authenticated Users, a `Write`/`Modify` mask, `GetAccessRules(true, false, ...)`, `NTAccount` names, or a method-level `[SupportedOSPlatform]` | The Python SDK skips it; hardening scripts name those three groups | P25-deny/mask/attr/ntacct `rg`, CA1416 at error, the six-case Windows test (CS-PROC-25) |
| 21 | `catch (Exception)` or `catch {}` around the ACL read, treating an unreadable ACL as safe | "Best effort" | CS-PROC-05's P05 `rg`, CA1031; the missing-directory test must refuse (CS-PROC-25) |
| 22 | Treating `ChildExit` 65/77 as the tool's failure, or casting the exit to `byte` / assuming `% 256` on Windows | Linux habit | `IsOcxError` tests `launch-missing`/`child-exit77`; CS-ERR-02's `(byte)` grep (CS-PROC-21) |
| 23 | Assuming a Windows `ocx` is a shim with a job object and killing only the root, or adding a `CreateJobObject` P/Invoke | ocx docs mention the shim's job | RS0030 `Kill()`, P14-job `rg`, `win-tree` test (CS-PROC-14) |
| 24 | `LoginAsync` returning `Verified = true` on exit 0 | `docker login` habit | `rg -n -i -e verified -e validated -g '*Login*.cs' src` prints nothing; [R PROC-R-07] `wrong` row |
| 25 | `--json`/`--format json` placed after the subcommand, or omitted on `exec` | "per-command flag" | Composer unit test; the one-site `"--format"` `rg` (CS-PROC-07) |

## Failure classes

| Class | Mechanism | Members | Check that catches the class |
|---|---|---|---|
| A. String/shell boundary | A structured value is flattened into a string that another parser re-tokenises | 1, 15, 16 (taskkill), the BatBadBut `.cmd` hit | RS0030 on every string-argv API; refusal of `.cmd`/`.bat`; no shell-outs (`rg -w taskkill pkill killall`) |
| B. Ambient-state leakage and untrusted search path | The child or the resolver trusts host state the SDK did not choose: cwd binary, env vars, console code page, `HOME`, a directory or file other principals can write | 4, 5, 10, 20, 21 | Resolver plus env scrub at one seam (CS-PROC-02/03/06/25), explicit encodings; tests that plant the ambient state (cwd `ocx`, lowercase `ocx_quiet`, cp437, 0666 file, `Everyone:M` directory, junction) |
| C. Pipe capacity and EOF coupling | A reader, writer or waiter depends on a pipe another process controls | 2, 8, 12, stdin-before-drain, grandchild-held pipe | Byte pumps plus bans on every EOF-waiting API; a bounded drain; the 1 MiB, 2 MiB-stdin, 64 MiB and grandchild-8 s tests |
| D. Byte/text boundary | Bytes cross an encoder or decoder the SDK did not pin | 4, 9 (CRLF, BOM), per-chunk decode | `Utf8NoBom` everywhere, raw-byte stdin, decode-once; the Windows cp437 byte tests and the real `login` stored-bytes test |
| E. Process lifetime | A kill, wait or handler assumes one process, or assumes waiting means stopping | 3, 16, 23, cooperative-root orphan, unbounded reap, process-wide handlers | RS0030 on `Kill()` and the handler events; Kill-tree-while-alive plus a bounded reap; the tree-alive tests [K PROC-14/18], [R win-tree] |
| F. Outcome classification | One number or exception type carries two meanings | 6, 22, SDK-caused 137/-1, a retried passthrough 75 | Distinct types (`OcxTimeoutException`, `ChildExit`, `RawResult`), `IsOcxError`, P15/P21 `rg` |
| G. API-era hallucination | An API from another era or TFM is used as if current | 13, 14, `Process.Signal` on net10 | Per-TFM build (CS0117/CS1061), `#if NET11_0_OR_GREATER` |
| H. Gate wiring false-green | The check exists but silently does not run or does not match | 17, method-level CA1416 attribute | Wired check plus one planted red line per ban in CI; `engine-r2-mut`; checker transcripts kept next to the rules |
| I. Contract-shape assumption *(new)* | A command name, a `cli.json` mode label, a version string or an exit number is taken to decide what stdout holds or what the outcome means | 7, 11, 18, 19, 24, 25 | One stdout-shape reader (CS-PROC-19); `contract` handshake (CS-PROC-20); retry needs a `temp_fail` document (CS-PROC-22); `cli.json` diff test (CS-PROC-21); the real-ocx contract tier (CS-PROC-24) |

## Open questions

**Owner decisions:**

1. **PR-16 (owned engine) is decided here on the evidence above.** Confirm, or override in favour of CliWrap and accept the four rule exemptions listed in the Verdict.
2. **Cap policy.** Choose 16 MiB with stdout failing closed (this file), or Python's "no ceiling, a truncated document is worse". ocx's own tooling caps at 10 MiB. Revisit if `package sbom` (`raw_document`) can exceed it.
3. **Env policy.**
   - This file uses a deny-list of 7 keys. The alternative is the Rust SDK's "drop every `OCX_*`/`__OCX_*` and re-add an allow-list", which is robust to future variables. That alternative must also allow the `OCX_AUTH_*` variables CI exports.
   - New facts [R §2.11]: `OCX_OFFLINE`, `OCX_FROZEN` and `OCX_NO_CONSENT` flow through today. A garbage value exits 78 on every command, and `OCX_OFFLINE=1` turns networked calls into 81. This file keeps them as operator intent.
   - Still unmeasured: an SDK host that was itself started by `ocx exec` inherits `__OCX_*` plumbing.
4. **Held-pipe outcome.** This file returns `DrainTimedOut = true`. The ocx contract says "treat as a timeout". Confirm the flag, or have the command layer turn the flag into an exception.
5. **Passthrough grace.** The default is 0 (tree kill), now confirmed on real ocx. The cost: a tool that would have cleaned up on SIGTERM gets SIGKILL unless the caller opts in. The benefit: no orphan and no 5 s stall [K PROC-18], [R §2.9].
6. **Approve the merged BannedSymbols fragment into the csharp-build posture.** csharp-build's `P:System.Text.Encoding.Default` message says "Use Encoding.UTF8". That contradicts the `Encoding.UTF8` ban here (BOM on pipes) and must change to `UTF8Encoding(false)`.
7. **Host-death containment (PR-14).** Options are an opt-in Windows Job Object, or .NET 11 `KillOnParentExit` for long-lived `exec`. Neither is in v1. Real ocx gives no help: `ocx.exe` holds no job [R §2.9].
8. **`IsOcxError` is a heuristic.** Accept it as documented (this file), or ask ocx for a sideband that a tool cannot forge: an env-controlled marker, or a distinct exit range for ocx's own passthrough failures [R contested].
9. **Upstream ocx issues to file:**
   - (a) `login` exits 0 for a wrong password against a Basic-realm registry [R §2.10].
   - (b) `self update` is labelled `report` in `cli.json` but exits 75 for `skipped`/`pulled`. Either label it `report_then_fail` or exit 0 [R §2.8].
   - (c) `--format` is not global, so a misplaced flag is exit 64 [R §2.4].

   This file's rules hold whichever way ocx answers.

**Drift flagged to sibling groups:**
- **csharp-api (CS-ERR):**
  - CS-ERR-03: `ChildExit` gains `bool IsOcxError`, and passthrough must be per `cli.json` output mode. `package test --script` and `patch test --script` are `report_then_fail`, and `patch test` is missing from the list.
  - CS-ERR-10: `IsTransient` must also require `ErrorKind == temp_fail`. `self update` exits 75 with a report and no error document.
  - CS-ERR-01:
    - `OcxLaunchFailure` needs `BatchRefused` (CS-PROC-04).
    - `PartialReportJson` carries complete reports, so rename or document it.
    - `ErrorKind` and `Detail` stay nullable, because 0.6.5 and exit-1 documents have no `detail`.
  - CS-ERR-09: `self update` needs an accepted-exit-code set ({0, 75}) like the `report_then_fail` commands.
  - CS-ERR-02: confirmed live, with 49 documents and 0 nonconforming. The floor "first ocx release with `contract`" has no release behind it yet, so their Open question 1 now blocks the contract tier.
- **csharp-json:**
  - The handshake on `contract` is confirmed.
  - `OcxExitDocument` decoding must accept both the compact 0.6.5 document and the pretty main document, and must live inside the CS-ERR-04 seam.
- **csharp-packaging (CS-BIN):** reuse `PathAcl.WhyUntrusted` for the Windows cache-root check that Python skips [A §1.13].
- **csharp-crossplatform (CS-TEST-07):** add the [R] contract probes listed in CS-PROC-24.

**Subareas that deserve another research round:**

- **csharp-process-macos-arm64.** Do CS-PROC-09/13/14/18 hold on macOS (x64 and arm64) and on linux-arm64 and windows-arm64? Nothing in this group ran there. The specific unknowns:
  - Whether pending pipe reads honour cancellation.
  - The `libc` `kill` binding.
  - `Kill(true)` tree discovery.
  - `File.GetUnixFileMode` in the resolver.
  - `ocx exec` exec semantics on Darwin.
  - The `PathAcl` unit test on `windows-11-arm`.
  - The .NET 11 `posix_spawn` switch.
- **csharp-process-self-update-pin.** Does `ocx self update` repoint `symlinks/.../current` atomically, so the unresolved `$OCX_HOME` pin survives an in-flight call? [R §2.12] could not run it: it needs `ocx.sh` or a local mirror registry that serves `ocx.sh/ocx/cli`. The owner must allow one of the two.
- **.NET 11 GA re-measure (Nov 2026).** Check:
  - `RunAsync` cancel semantics.
  - `KillOnParentExit` platforms.
  - Whether `ReadAll*` gained a size cap or a held-pipe bound.

  If they did, CS-PROC-23 can relax for a net11.0 target.

## Sub-artifacts

- [csharp-process-launch-and-argv.md](csharp-process/csharp-process-launch-and-argv.md): argv (ArgumentList vs string), cwd/PATH resolution, BatBadBut on .NET, env snapshot and scrub, stdin secrets, RS0030 wiring. Linux and Windows, 17 watched pairs.
- [csharp-process-streams-and-encoding.md](csharp-process/csharp-process-streams-and-encoding.md): the deadlock forms, the byte pump, what `WaitForExitAsync` waits for, the grandchild-held pipe, caps, the three encodings, BOM and CRLF on stdin, .NET 11 `ReadAll*`. 30 scenarios on 3 hosts.
- [csharp-process-cancellation-and-exit.md](csharp-process/csharp-process-cancellation-and-exit.md): tree kill, caller-cancel vs timeout, reap, the POSIX ladder, Windows interrupt options, signal exit codes, the ocx exit table and retry, the .NET 10 SIGTERM change, the .NET 11 RC1 surface.
- [csharp-process-real-ocx.md](csharp-process/csharp-process-real-ocx.md): the wave-2 engine against ocx main@3485207c1 (Linux and Windows) and 0.6.5. It covers error documents, `report_then_fail`, flag placement and `CLICOLOR_FORCE`, the handshake, live exit conformance, passthrough and retry divergences (6 red → green), tree reaping and the shim job, and `login` stdin bytes.
- [csharp-process-windows-path-acl.md](csharp-process/csharp-process-windows-path-acl.md): the Windows PATH ACL trust check. It covers the API and CA1416, the SID allow-list, the 4-bit rights mask, inherited/inherit-only/Deny ACEs, default ACLs at real locations, junction and file-level bypasses, failure modes, and the 59-line `PathAcl` with its tests.

## Key sources

1. https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.processstartinfo.argumentlist?view=net-10.0: `ArgumentList` escapes per argument; it is exclusive with `Arguments`.
2. https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-createprocessw: search order (cwd before PATH), batch files via the command interpreter, the 32,767-character limit.
3. https://flatt.tech/research/posts/batbadbut-you-cant-securely-execute-commands-on-windows/: BatBadBut root cause; no .NET row.
4. https://blog.rust-lang.org/2024/04/09/cve-2024-24576/: the canonical mitigation is to refuse rather than escape.
5. https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process.standardoutput: the two-stream deadlock and the rule against mixing sync and async reads.
6. https://github.com/dotnet/runtime/blob/v10.0.0/src/libraries/System.Diagnostics.Process/src/System/Diagnostics/Process.cs: `WaitForExitAsync` → `WaitUntilOutputEOF` only in event mode.
7. https://github.com/dotnet/runtime/issues/29232: the maintainers' view that a grandchild holding the pipe is expected and unfixable.
8. https://github.com/dotnet/runtime/blob/v10.0.0/src/libraries/System.Diagnostics.Process/src/System/Diagnostics/Process.Win32.cs: Windows `KillTree` kills the root first, then walks children by parent pid and start time (why `ocx.exe > tool` is reaped).
9. https://github.com/dotnet/runtime/blob/v10.0.0/src/libraries/System.Diagnostics.Process/src/System/Diagnostics/Process.Windows.cs: null encoding becomes `GetConsoleOutputCP()`; `Kill()` is `TerminateProcess(-1)`.
10. https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process.kill?view=net-10.0: tree-kill semantics; `HasExited` does not cover descendants.
11. https://learn.microsoft.com/en-us/dotnet/core/compatibility/core-libraries/10.0/sigterm-signal-handler: .NET 10 no longer raises `ProcessExit` on SIGTERM.
12. https://github.com/dotnet/runtime/issues/114847: a SIGCHLD reset by host native code hangs `WaitForExitAsync`.
13. https://learn.microsoft.com/en-us/dotnet/api/system.io.filesystemaclextensions.getaccesscontrol?view=net-10.0: the Windows ACL read the CS-PROC-25 check uses (shared framework on net8+, despite the stale package line).
14. https://learn.microsoft.com/en-us/windows/win32/secauthz/well-known-sids: the SIDs behind the CS-PROC-25 allow-list.
15. https://github.com/dotnet/roslyn/blob/main/src/RoslynAnalyzers/Microsoft.CodeAnalysis.BannedApiAnalyzers/BannedApiAnalyzers.Help.md: `BannedSymbols.txt` ID syntax and the mandatory `AdditionalFiles` wiring.

## Revision log

- 2026-10-11, round 2: folded in [R] and [A].
- CS-PROC-03 changed in place: the trust check now covers the file as well as the directory, and the `$OCX_HOME` tier as well as PATH. Skipped hits are listed in `NotFound`. Why: a 0666 file and a 0777 home tier were accepted (watched [K2 R1-R3]), and [A] scoped the check to both tiers.
- CS-PROC-25 added (MUST, Windows ACL trust check). Why: default ACLs make `C:\<folder>` writable by others [A §1.8]; 16 watched pairs [A], integrated resolver W1-W3 [K2].
- CS-PROC-19 rewritten in place: classify stdout by shape on every non-zero exit, in one reader. It no longer keys on the `report_then_fail` list, never deserializes stderr, and treats `detail` as optional. Why: `self update` (mode `report`) exits 75 with a report, the sweeps print 0 bytes on stderr, and 0.6.5 usage errors print nothing [R §2.2-2.3, §2.8].
- CS-PROC-20 rewritten in place: CS-ERR-02's hand-written table, selected by the `contract` handshake, not generated and not version-keyed. Why: main reports version 0.6.5 [R §2.5]; aligned with CS-ERR-02.
- CS-PROC-21 rewritten in place:
  - What changed: passthrough is decided per `cli.json` output mode; `ChildExit` is a sealed class with `ExitCode` and `IsOcxError`; codes are `int` end to end.
  - Why: ocx's 65/77/64 share the tool's channel (RED x4 [R §2.7]); `package test --script` is `report_then_fail`, and `patch test` was missing; CS-ERR-03 owns the shape.
- CS-PROC-22 rewritten in place: retry needs exit 75 plus a `temp_fail` error document. Why: `self update --check --offline` 75 skip was retried (RED [R §2.8]).
- CS-PROC-07 extended:
  - What changed: `--format json --color never` on every call, passthrough included; `--project` for project handles.
  - Why: without `--format json` the output is plain text and the exec error document is lost; a bare `exec` exits 64 under ambient `OCX_NO_PROJECT=1` [R §2.4, §2.1].
- CS-PROC-14 extended: no job object, plus the P14-job `rg`; real-ocx tree evidence on Linux (execvp) and Windows (spawn). Why: [R §2.9] measured both shapes and `ocx.exe` without a job.
- CS-PROC-06 extended: `OCX_OFFLINE`/`OCX_FROZEN`/`OCX_NO_CONSENT` deliberately not scrubbed; main evidence added. Why: [R §2.11].
- CS-PROC-10 extended: a 64 KiB stdout head is kept on the passthrough sink path. Why: CS-PROC-21's flag needs it.
- CS-PROC-24 extended: the real-ocx contract-tier probes. Why: six divergences showed only against real ocx [R §2.14].
- CS-PROC-01, 04, 08, 11, 12, 13, 15, 18 and the other rows: `ocx:` build lines and real-ocx confirmations added; no rule text changed. Why: the brief requires the build per claim.
- Reference engine: `ChildExit`, `OcxRetry`, `ExitTable` and the resolver replaced; `OcxExitDocument` and `PathAcl` added; `OcxProcess.cs` unchanged. Why: the rewritten rows above; built and run in [K2].
- Verdict: items 1, 2, 3, 5 and 6 updated and item 9 (documented gaps) added. Open questions: owner decisions 8-9 added, a drift block added, the `csharp-process-real-ocx` and Windows writable-PATH rounds removed as answered, and `csharp-process-self-update-pin` added. Failure modes 18-25 and class I added. Key sources: runtime#42556 and the cancellation guide replaced by `Process.Win32.cs`, `GetAccessControl` and well-known SIDs.
