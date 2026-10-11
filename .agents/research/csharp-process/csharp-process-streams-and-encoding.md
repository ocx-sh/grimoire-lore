---
title: "Pumping stdout, stderr and stdin of the ocx child process: no deadlock, no truncation, no mojibake"
topic: csharp-process / csharp-process-streams-and-encoding
agent: deep-dive researcher (csharp-process group)
model: claude-sonnet-5-5
date_researched: 2026-10-10
sources_count: 32
scope: |
  Covers the I/O half of the ocx process engine for net8.0 and net10.0 on Windows, Linux and macOS: concurrent drain, WaitForExitAsync semantics, grandchild-held pipes, output caps, the encoding of all three streams, BOM and newline traps on stdin, and the rule checks that keep agents from regressing any of it. .NET 11 / C# 15 (RC1) is flagged where it differs.
  Not covered: argv construction and quoting (csharp-process-launch-and-argv), cancellation, signals and tree kill (csharp-process-cancellation-and-exit), exit-code mapping to exceptions, JSON binding. macOS was not measured: Linux (WSL2) and Windows 11 (SDK 10.0.102, code page 437) were.
---

# Pumping stdout, stderr and stdin of the ocx child process

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The deadlock is a pipe-capacity contract, not a .NET bug](#1-the-deadlock-is-a-pipe-capacity-contract-not-a-net-bug)
   2. [The canonical pump shape](#2-the-canonical-pump-shape)
   3. [What WaitForExitAsync really waits for](#3-what-waitforexitasync-really-waits-for)
   4. [The Meziantou "drops trailing output" claim is historical](#4-the-meziantou-drops-trailing-output-claim-is-historical)
   5. [Grandchild-held pipes: bound the drain, return what was read](#5-grandchild-held-pipes-bound-the-drain-return-what-was-read)
   6. [Output size caps](#6-output-size-caps)
   7. [Encodings of all three streams](#7-encodings-of-all-three-streams)
   8. [Stdin: BOM, newline, and the concurrent write](#8-stdin-bom-newline-and-the-concurrent-write)
   9. [ocx specifics that shape the I/O layer](#9-ocx-specifics-that-shape-the-io-layer)
   10. [.NET 11 RC1: ReadAllText/ReadAllBytes](#10-net-11-rc1-readalltextreadallbytes)
   11. [What the exemplars do](#11-what-the-exemplars-do)
   12. [Verified on the toolchain](#12-verified-on-the-toolchain)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- Drain stdout and stderr concurrently from the moment `Process.Start` returns. Reading one to EOF before the other deadlocks once the unread pipe fills; measured red at 1 MiB of stderr on net8.0 and net10.0, Linux and Windows, in both the sync (`ReadToEnd`) and the async-but-sequential (`await ... ReadToEndAsync()` twice) form.
- Use one task per stream that loops `BaseStream.ReadAsync(byte[])` into a bounded buffer. `Task.WhenAll(ReadToEndAsync, ReadToEndAsync, WaitForExitAsync)` is correct for small trusted output, but it has no cap and no bound on a grandchild-held pipe, so it is not the SDK core shape.
- Past the output cap, discard and keep reading. Stopping at the cap re-creates the deadlock (measured: child blocked, 6 s timeout). Default cap 16 MiB per stream; stdout overflow is an error (a truncated JSON document must never be parsed), stderr overflow keeps the head and sets a flag.
- `Process.WaitForExitAsync` waits for EOF only on streams opened in event mode (`BeginOutputReadLine` / `BeginErrorReadLine`); with direct `BaseStream` pumps it returns at process exit (42 to 77 ms measured with a grandchild still holding the pipe).
- A grandchild that inherited the pipe stalls event-mode `WaitForExitAsync`, parameterless `WaitForExit()` and `ReadToEndAsync` alike (8056 ms against an 8000 ms sleeper, same on Linux and Windows). .NET maintainers say this is expected and unfixable. Policy: after the process exits, bound the drain (default 5 s, matching the Python SDK's `_PUMP_JOIN`), then return what was read with a `DrainTimedOut` flag; do not throw.
- The Meziantou claim that `WaitForExitAsync` drops trailing output is .NET 5 only. Fixed in .NET 6 by [dotnet/runtime#42556](https://github.com/dotnet/runtime/issues/42556); re-verified on net8.0 and net10.0 (2 of 2 lines delivered). The recommended workaround of calling sync `WaitForExit()` afterwards is now harmful: it re-introduces the grandchild stall on a blocked thread.
- `ProcessStartInfo.StandardOutputEncoding` defaults to null. On Unix null means UTF-8; on Windows it means the console output code page (`GetConsoleOutputCP()`, 437 on the test host). Same child bytes decoded to 3 code points on Linux and 9 mojibake code points on Windows. Set a shared `UTF8Encoding(false)` on all three streams explicitly.
- Read bytes and decode once after the drain, or use a `Decoder`. `Encoding.GetString(buf, 0, n)` per read chunk corrupts multibyte characters at read boundaries (18 U+FFFD on Linux, 222 on Windows for 2000 emoji).
- Never write a secret to stdin with `StandardInputEncoding = Encoding.UTF8` or `WriteLine`. `Encoding.UTF8` makes `StreamWriter` emit EF BB BF on a non-seekable pipe, and `WriteLine` appends `\r\n` on Windows. ocx `login --password-stdin` strips only one trailing `\n` and reads with Rust `read_to_string`, so a BOM or CR becomes part of the credential silently.
- Write stdin as exact bytes (`Encoding.UTF8.GetBytes(secret)`, no newline) to `StandardInput.BaseStream`, concurrently with the drains, then close it. Writing 2 MiB of stdin before starting the drains deadlocks against a child that echoes (red at 6 s).
- Parse stdout on non-zero exit for the 17 `report_then_fail` ocx modes: the process engine returns `(exitCode, stdoutBytes, stderrBytes, flags)` and never throws before the streams are drained.
- Gate the above mechanically: `CA1849` and `VSTHRD103` at `error` (CA1849 is not enabled by default in .NET 10), BannedApiAnalyzers `RS0030` for `StreamReader.ReadToEnd`, `Process.WaitForExit`, `Encoding.UTF8`, `Encoding.Default`, plus seven `rg` rules (R1 to R7) that were watched red on a bad twin and green on a good twin.
- .NET 11 RC1 adds `Process.ReadAllTextAsync` / `ReadAllBytesAsync`: concurrent, deadlock-free (48 ms for 1 MiB stderr), cancellable, but unbounded in size and still stalled by a grandchild-held pipe (6046 ms). Not a replacement for the bounded pump; GA is Nov 2026, so it cannot be the only path anyway (net8.0 floor).
- ocx global flags `--format json` and `--color never` are pre-subcommand argv tokens with no env equivalent; stdout is the JSON document, stderr is logs. The engine must keep the two streams separate, never merge them into one pipe or one buffer.

## Findings

### 1. The deadlock is a pipe-capacity contract, not a .NET bug

The Microsoft reference states the mechanism: synchronous reads "do not complete until the associated Process writes to its StandardOutput stream, or closes the stream", and "a deadlock condition results if the parent process calls `p.StandardOutput.ReadToEnd` followed by `p.StandardError.ReadToEnd` and the child process writes enough text to fill its error stream" ([Process.StandardOutput](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process.standardoutput)). The same page's own fix is "use an asynchronous read operation on at least one of the streams", and it warns that sync and async modes cannot be mixed on one stream: do not follow `BeginOutputReadLine` with `ReadLine` on the same `StandardOutput`.

Two forms an agent writes that both hang (fixture `probe/Program.cs`, scenarios `deadlock-seq-sync-bad`, `deadlock-seq-async-bad`; child writes 1 MiB to stderr, then 1 byte to stdout):

```csharp
// INCORRECT (sync): hangs at 1 MiB of stderr. Red: TIMEOUT 6 s on net8.0 + net10.0, Linux + Windows.
var o = p.StandardOutput.ReadToEnd();
var e = p.StandardError.ReadToEnd();
p.WaitForExit();

// INCORRECT (async but sequential): same hang. `await` does not make the order concurrent.
var o = await p.StandardOutput.ReadToEndAsync();
var e = await p.StandardError.ReadToEndAsync();
```

The wrapper audit measured the same thing at 200 KB (`exemplar-cli-wrappers-and-sdks.md`, E1: DEADLOCK after 3 s). The Python SDK avoids it with one daemon pump thread per stream (`ocx-sdk-python@80136dde4162:src/ocx_sdk/_process.py:616-631` per the digest).

Stdin has the mirror-image deadlock: writing all of stdin before the drains start blocks when the child echoes while its stdout pipe is full (`stdin-deadlock-bad`: TIMEOUT 6 s; `stdin-deadlock-good`: 2,097,152 bytes echoed in 61 to 103 ms). Aspire documents the same ordering rule: "Write standard input after output reads are active so processes can write before reading input" (`dotnet__aspire@af646baee1e8:src/Aspire.Hosting/Dcp/Process/ProcessUtil.cs:134`). The Python SDK carries this as a self-documented shortcut ("blocks if input exceeds pipe buffer and child never reads", digest S9); the C# SDK should not copy it.

### 2. The canonical pump shape

Decision: byte pumps over `Process.StandardOutput.BaseStream` and `Process.StandardError.BaseStream`, started immediately after `Start`, one task per stream; stdin written by a third concurrent task; `WaitForExitAsync(ct)` for exit; then a bounded drain.

```csharp
// CORRECT (fixture probe/Pump.cs, trimmed). Watched green on net8.0 + net10.0, Linux + Windows.
public static readonly UTF8Encoding Utf8NoBom = new(encoderShouldEmitUTF8Identifier: false);

static async Task PumpAsync(Stream s, Capture c, int cap, CancellationToken ct)
{
    var buf = ArrayPool<byte>.Shared.Rent(81920);
    try
    {
        int n;
        while ((n = await s.ReadAsync(buf.AsMemory(), ct).ConfigureAwait(false)) > 0)
            c.Add(buf.AsSpan(0, n), cap);   // past the cap: DISCARD but keep reading, or the child blocks on a full pipe
    }
    catch (OperationCanceledException) { }
    finally { ArrayPool<byte>.Shared.Return(buf); }
}

psi.RedirectStandardOutput = psi.RedirectStandardError = psi.RedirectStandardInput = true;
psi.StandardOutputEncoding = psi.StandardErrorEncoding = psi.StandardInputEncoding = Utf8NoBom;
using var p = Process.Start(psi)!;
var outT = PumpAsync(p.StandardOutput.BaseStream, so, cap, pumpCts.Token);
var errT = PumpAsync(p.StandardError.BaseStream,  se, cap, pumpCts.Token);
var inT  = WriteStdinAsync(p, stdinBytes, ct);                 // exact bytes, then Close()
await p.WaitForExitAsync(ct);                                  // returns at exit: no Begin*ReadLine in use
try { await Task.WhenAll(outT, errT).WaitAsync(drainGrace, ct); }   // .NET 6+ Task.WaitAsync
catch (TimeoutException) { so.Seal(); se.Seal(); pumpCts.Cancel(); /* DrainTimedOut = true */ }
```

Why not the alternatives:

| Shape | Deadlock-safe | Bounded memory | Bounded wait on grandchild | Verdict |
|---|---|---|---|---|
| `Task.WhenAll(ReadToEndAsync, ReadToEndAsync, WaitForExitAsync)` | yes (`deadlock-whenall-good`, 57 to 95 ms) | no (256 MiB allocated for a 64 MiB child) | no (8057 ms) | fine for tiny trusted output only; used by SimpleExec (`adamralph__simple-exec@f80913246993:src/SimpleExec/Command.cs:421-422`) |
| `BeginOutputReadLine` + `BeginErrorReadLine` events | yes (`deadlock-events-good`) | no | no, and `WaitForExitAsync` now waits for EOF | rejected: line-split (loses final-newline and CRLF information), unbounded, and the EOF wait is the grandchild stall |
| Byte pump + `WaitForExitAsync` + bounded drain | yes | yes | yes (1065 ms for a 1000 ms grace) | **chosen** |
| .NET 11 `ReadAllTextAsync` | yes | no | no (6046 ms) | .NET 11 only; see section 10 |

CliWrap uses the same architecture, byte pumps with the process task and the stream tasks awaited together (`Tyrrrz__CliWrap@7dbc252fa773:CliWrap/Command.Execution.cs:191-210`), with a comment that "Output and error streams may legally outlive the process, so we don't cancel them on exit" (`:191`). It does not bound that wait, which is the gap section 5 closes.

### 3. What WaitForExitAsync really waits for

Read from the runtime source at `v10.0.0`: `WaitForExitAsync` ends with `await WaitUntilOutputEOF(cancellationToken)`, whose body is "if `_output` is not null, await `_output.EOF`; if `_error` is not null, await `_error.EOF`" ([Process.cs:1530,1558,1565-1576](https://github.com/dotnet/runtime/blob/v10.0.0/src/libraries/System.Diagnostics.Process/src/System/Diagnostics/Process.cs#L1565)). `_output`/`_error` are assigned only by `BeginOutputReadLine` / `BeginErrorReadLine` (`Process.cs:1611,1651`). Consequence:

- Event mode (`Begin*ReadLine`): `WaitForExitAsync` returns only after EOF on the pipes. A grandchild holding the write end stalls it. This is dotnet/runtime#29232 and #120452; maintainer tmds: "waiting for redirected output to reach EOF is expected behavior" ([#29232](https://github.com/dotnet/runtime/issues/29232), [comment](https://github.com/dotnet/runtime/issues/29232#issuecomment-1451584094)), ".NET can't solve this ... the suggested workaround is to call `WaitForExit` with a timeout" ([#120452](https://github.com/dotnet/runtime/issues/120452), closed as a duplicate on 2025-10-23).
- Direct-stream mode (`BaseStream` / `StandardOutput.ReadToEndAsync`): `WaitForExitAsync` does not look at the pipes at all. Measured: 42 to 77 ms with the grandchild still holding stdout (`grandchild-streams-bad` prints `WaitForExitAsync alone=...`). The stall then comes from the read task, which is why the bounded drain wraps the read tasks, not the exit wait.
- Sync overloads (Unix source `Process.Unix.cs:203-215`, v10.0.0): `WaitForExit()` (infinite) waits for `_output`/`_error` EOF; `WaitForExit(int ms)` with a finite timeout "cannot wait for the streams" and skips it. The docs say the same: after a finite wait returns true, "call the `WaitForExit()` overload that takes no parameter" to be sure async handlers finished ([Process.WaitForExit](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process.waitforexit)). Measured with a grandchild: `WaitForExit()` 8045 to 8153 ms; `WaitForExit(30000)` 42 to 78 ms (`grandchild-sync-waitforexit-bad`, `grandchild-sync-timed-informational`).
- The learn page for `WaitForExitAsync` does not mention any of this; it says only that the task completes "when the process has exited, cancellation has been requested, or an error occurs" ([WaitForExitAsync](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process.waitforexitasync)). The source, not the page, is authoritative.

### 4. The Meziantou "drops trailing output" claim is historical

Meziantou (2020-11-16) reported that `WaitForExitAsync` "does not wait for redirected output to complete" in .NET 5, with the workaround "call `WaitForExit` after `WaitForExitAsync`" ([post](https://meziantou.net/process-waitforexitasync-doesn-t-behave-like-process-waitforexit.htm)). The tracking issue is [dotnet/runtime#42556](https://github.com/dotnet/runtime/issues/42556) (milestone 6.0.0, closed 2020-09-28; maintainers declined a .NET 5 backport on 2020-09-23).

Re-verification, three independent ways:

1. Source: `raw.githubusercontent.com/dotnet/runtime/v5.0.0/.../Process.cs` has zero matches for `WaitUntilOutputEOF` / `_output.EOF`; `v6.0.0` has them at lines 1484, 1512, 1519, 1523; `v8.0.0` at 1528, 1556, 1563, 1567; `v10.0.0` at 1530, 1558, 1565, 1569.
2. Behavior (`trailing-output`): the Meziantou repro shape (child exits, 1.5 s later `BeginOutputReadLine()`, then `await WaitForExitAsync()`) yields `logs=2 (line1|line2)` immediately after `WaitForExitAsync` on net8.0 and net10.0, Linux and Windows.
3. Tooling: Meziantou.Analyzer excludes the method from `MA0042` because of it (post update note); that exclusion is a .NET 5 artifact.

Do not pass the old workaround to agents:

```csharp
// INCORRECT (historical, .NET 5 era): the extra sync wait blocks a thread and re-adds the grandchild stall.
await p.WaitForExitAsync(ct);
p.WaitForExit();            // RS0030 / CA1849 / VSTHRD103 in this repo

// CORRECT (.NET 6+): WaitForExitAsync already waits for EOF in event mode; with byte pumps you bound the drain yourself.
await p.WaitForExitAsync(ct);
await Task.WhenAll(outT, errT).WaitAsync(drainGrace, ct);
```

### 5. Grandchild-held pipes: bound the drain, return what was read

Why it matters for ocx: `ocx exec` launches arbitrary tools and a tool may background a daemon; MedallionShell #104 (a `dotnet build` server inheriting the pipes hung `Command.Result` until `dotnet build-server shutdown` was run) is the field example ([issue](https://github.com/madelson/MedallionShell/issues/104), closed not-planned 2023-08-15). The ocx Rust spawn has the same limitation and bounds it with a drain deadline (`await_readers`, per `ocx-cli-contract.md`), and the contract rule is "treat pipes held open by grandchildren as a timeout" (rule 11 there).

Fixture (`dummy grandchild 8`: spawns an 8 s sleeper that inherits stdio, prints `done`, exits at once):

| Shape | Linux net8.0 | Linux net10.0 | Windows net10.0 |
|---|---|---|---|
| events + `WaitForExitAsync` (E7 shape) | 8058 ms | 8061 ms | 8141 ms |
| `ReadToEndAsync` + `WaitForExitAsync` | exit seen at 49 ms, read done 8057 ms | 53 / 8060 ms | 77 / 8157 ms |
| parameterless `WaitForExit()` | 8047 ms | 8052 ms | 8142 ms |
| byte pump + bounded drain (grace 1000 ms) | 1065 ms, `done`, flag set | 1059 ms | 1101 ms |

Decision: time out, then return what was read.

- The child has exited, so every byte it wrote is already in the pipe (a blocked write cannot have completed otherwise). The drain after exit is O(one pipe buffer), milliseconds, and a grace of 1 s lost nothing in any run. The long grace is paid only in the held-pipe case.
- Default grace 5 s: equals Python's `_PUMP_JOIN = 5.0` (`ocx-sdk-python@80136dde4162:src/ocx_sdk/_process.py:80,643`) and Aspire's `s_processExitTimeout` (`ProcessUtil.cs:20`); expose it as an option.
- Do not throw: the exit code and the JSON document are complete. Return `DrainTimedOut = true`. When stdout then fails to parse, put the flag into the error message.
- After the grace, cancel the pump token and seal the capture so a late grandchild write cannot mutate the returned buffers. `ReadAsync(ct)` on the process pipe honors cancellation on Linux and Windows (`grandchild-readasync-cancel-honored`: Canceled 503 / 511 ms after a 500 ms cancel); macOS is not measured, so do not `await` the pumps after the grace and observe their faults instead (`ContinueWith(t => _ = t.Exception, OnlyOnFaulted)`).
- Limit of this policy: the grandchild survives (orphan). Killing it is the cancellation topic (`Kill(entireProcessTree: true)` reaped it on Linux in the audit's E3); it is not done by the drain.

Alternative `process.WaitForExit(timeout)` then `WaitForExit(small)` (tmds's suggestion for the sync API) works only for event-mode handlers and gives the caller no way to tell "drained" from "gave up".

### 6. Output size caps

A child can write without limit; `ReadToEnd` allocates 4x the output (fixture `cap-readtoend-alloc-bad`: 256 MiB allocated on Linux, 261 MiB on Windows, for a 64 MiB child) and the Python SDK documents "no ceiling by design — a truncated [JSON document] is worse than a large one" (`_process.py:224-228`). Precedent for a ceiling in ocx itself: the script host caps captured stdout and stderr at `OUTPUT_CAP_BYTES = 10 * 1024 * 1024` (`ocx@5de9d777eb7d:crates/ocx_script/src/run_result.rs:13`; documented "UTF-8 lossy, truncated at 10 MiB", `website/src/docs/reference/script-host-api.md:187-188`).

Decision:

- Cap each captured stream independently. Default 16 MiB per stream (above ocx's own 10 MiB so anything ocx tooling accepts fits), configurable via one options record.
- Never stop reading at the cap. `cap-stop-reading-bad` is red (TIMEOUT 6 s, child blocked on a full pipe); `cap-drain-good` captures exactly 1,048,576 bytes of a 64 MiB flood with `truncated=True` in 121 to 256 ms and 3 to 4 MiB allocated.
- Overflow semantics differ by stream: stdout overflow on a command whose output is a JSON document is an `OutputLimitExceeded` error carrying the exit code (never parse a truncated document); stderr overflow keeps the head, sets `StderrTruncated`, and never fails the call.
- Passthrough commands (`exec`, `run`, `package exec`, `package test`, `launcher *`: 7 modes) forward raw child output; give them a `Stream` sink and do not buffer. Buffer-and-cap applies to the 65 report modes and the other JSON modes.
- Buffer type: `MemoryStream` (or `ArrayBufferWriter<byte>`) of bytes, not `StringBuilder`; decode once at the end.

### 7. Encodings of all three streams

Facts, from source and measurement:

- `StandardOutputEncoding`, `StandardErrorEncoding` and `StandardInputEncoding` default to null; the docs say a null value means "the default standard output encoding" and "setting this property does not guarantee that the process will use the specified encoding" ([StandardOutputEncoding](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.processstartinfo.standardoutputencoding), [StandardInputEncoding](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.processstartinfo.standardinputencoding), the latter from .NET Core 2.1 / .NET Standard 2.1).
- What null resolves to (v10.0.0 source): Unix `startInfo.StandardOutputEncoding ?? Encoding.Default` (UTF-8; `Process.Unix.cs:469-483`, with the comment "We use UTF8 encoding without BOM by-default (instead of Console encoding as on Windows)"); Windows `startInfo.StandardOutputEncoding ?? GetEncoding((int)Interop.Kernel32.GetConsoleOutputCP())` (`Process.Windows.cs:634-646`), i.e. the console code page, 437 on the test host.
- The decode is therefore host-dependent. Same child bytes (C3 A9 E2 82 AC F0 9F 98 80, "é€😀") with null encoding (`enc-null-default`):

| Host | Console code page | Decoded code points | Result |
|---|---|---|---|
| Linux net8.0 / net10.0 | 65001 | `U+00E9 U+20AC U+1F600` | PASS |
| Windows net10.0, `chcp 437` (default of `cmd.exe` here) | 437 | `U+251C U+2310 U+0393 U+00E9 U+00BC U+2261 U+0192 U+00FF U+00C7` (9 chars) | **FAIL** |
| Windows net10.0, `chcp 65001` (typical CI) | 65001 | `U+00E9 U+20AC U+1F600` | PASS |
| any host, explicit `UTF8Encoding(false)` (`enc-utf8-explicit`) | any | `U+00E9 U+20AC U+1F600` | PASS on all three |

  The row pair 437/65001 is the dangerous one: green on CI, mojibake on a developer machine, so the bug survives review.
- ocx is the producer. Rust writes UTF-8 bytes to a pipe regardless of the Windows code page; the only Windows special case in `std::io::Stdout` is for console handles ([Stdout, Windows portability](https://doc.rust-lang.org/std/io/struct.Stdout.html): "When operating in a console, the Windows implementation ... does not support non-UTF-8 byte sequences"; redirected handles are not discussed there). A pipe to the SDK is not a console, so ocx output is UTF-8 on every OS; only the decode side can go wrong.
- `StandardOutputEncoding` does not change what the child emits. CliWrap #196 (Go program choosing its encoding from the console code page, reporter finally traced it to passing the encoding to `Observe()` instead of the pipe) shows the confusion; the property only selects the parent's decoder ([issue](https://github.com/Tyrrrz/CliWrap/issues/196), closed as invalid 2023-02-26). For `ocx exec <tool>`, the tool's own encoding is the tool's business: the SDK returns raw bytes for passthrough.

Decision:

1. One shared `static readonly UTF8Encoding Utf8NoBom = new(encoderShouldEmitUTF8Identifier: false)`. The parameterless constructor is also BOM-free (docs: "does not provide a Unicode byte order mark and does not throw"), but the explicit argument makes the intent greppable ([UTF8Encoding ctor](https://learn.microsoft.com/en-us/dotnet/api/system.text.utf8encoding.-ctor)).
2. Assign it to all three `Standard*Encoding` properties on every redirecting `ProcessStartInfo`, even when you read `BaseStream` yourself: it costs nothing, protects any later `StandardOutput.Read*` call, and is what the lint (R7) checks.
3. Decode captured bytes once after the drain, or feed a `Decoder` (`Encoding.GetDecoder()`) across chunks. Per-chunk `Encoding.GetString` splits multibyte characters:

```csharp
// INCORRECT: chunk boundary lands inside a 4-byte sequence -> U+FFFD. Red: 18 on Linux, 222 on Windows (2000 emoji = 4000 chars expected).
while ((n = await s.ReadAsync(buf)) > 0) sb.Append(Encoding.UTF8.GetString(buf, 0, n));

// CORRECT: Decoder carries the partial sequence across reads. Green: 4000 chars, 0 U+FFFD.
var dec = Utf8NoBom.GetDecoder();
while ((n = await s.ReadAsync(buf)) > 0) sb.Append(cs, 0, dec.GetChars(buf, 0, n, cs, 0));
// CORRECT and simpler: accumulate bytes (bounded), then Utf8NoBom.GetString(all) once.
```

4. Stdout that is a JSON document: parse from the bytes (`JsonSerializer.Deserialize(ReadOnlySpan<byte>)` / `Utf8JsonReader`) so no UTF-16 copy exists; that is a design recommendation here, not a measured one. Stderr (logs): decode lossy with the default replacement fallback, like Python's `errors="replace"` (`_process.py:515-516`). Do not use `throwOnInvalidBytes: true` for stderr; the docs' security caution about error detection applies to input validation, and a log line with a stray byte must not fail a command.
5. Line endings: pumped bytes carry whatever ocx wrote (`\n`). Python normalises `\r\n` to `\n` so its sync and async drivers match across OSes (digest, Encoding row); with byte pumps there is no newline translation to undo, so there is nothing to normalise unless a passthrough tool emits CRLF.

The MTP migration guide documents a related host trap: when the console code page is 65001 (Azure DevOps), `Console.InputEncoding` is preserved under MTP but dropped under VSTest's isolation mode (`CreateNoWindow = true` testhost), so a test that spawns a child and redirects stdin can see a UTF-8 BOM; the documented workarounds are `Console.InputEncoding = new UTF8Encoding(encoderShouldEmitUTF8Identifier: false)` at assembly init or not using `CreateNoWindow = true` ([migration guide](https://learn.microsoft.com/en-us/dotnet/core/testing/migrating-vstest-microsoft-testing-platform), updated 2026-08-31). The guide scopes that BOM scenario to ".NET Framework". On .NET 8/10 the null default does not emit a BOM (next section), and explicit encodings make the whole class moot, which is a further reason for rule 8 below.

### 8. Stdin: BOM, newline, and the concurrent write

Why a BOM appears: `StreamWriter` writes `_encoding.Preamble` on the first flush unless the stream is seekable and past position 0 (`StreamWriter.cs:125-127, 288-295`, v10.0.0). A process pipe is not seekable, so any encoding with a preamble emits it. `Encoding.UTF8` has one. The .NET runtime avoids it for the null default by wrapping the code page encoding in `ConsoleEncoding`, "which delegates every call ... except `GetPreamble()`" (`ConsoleEncoding.cs:19-23`; `Process.Windows.cs:662-666`). Measured (`bom-*`, dummy `stdin-check` reads all stdin and exits 3 on EF BB BF):

| Setup | Child saw | Linux net8/10 | Windows net10 (cp437 and cp65001) |
|---|---|---|---|
| `StandardInputEncoding = Encoding.UTF8`, `StandardInput.Write("s3cret")` | `BOM:EFBBBF73:9`, exit 3 | RED | RED |
| `StandardInputEncoding = new UTF8Encoding(false)` | `ok:73336372:6` | green | green |
| `StandardInputEncoding` left null | `ok:73336372:6` | green | green |
| exact bytes to `StandardInput.BaseStream` | `ok:73336372:6` | green | green |

Why the BOM is worse for ocx than for the dummy: `ocx login --password-stdin` does `io::stdin().read_to_string(&mut buf)` then `buf.strip_suffix('\n')` and rejects only an empty buffer (`ocx@5de9d777eb7d:crates/ocx_cli/src/command/login.rs:76-87`). A BOM is valid UTF-8, so the secret becomes U+FEFF + token and the failure looks like a wrong password at the registry. The same file shows only `\n` is stripped, so the second trap is `WriteLine`:

| Setup | Child saw (Windows) | Child saw (Linux) |
|---|---|---|
| `StandardInput.WriteLineAsync("s3cret")` (`stdin-writeline-bad`) | `...tail=0D0A`, exit 4: **RED** (CRLF; ocx would keep `\r` in the secret) | `tail=740A`, green |
| exact bytes, no newline (`stdin-exact-bytes-good`) | `tail=6574`, green | green |

Rules that follow:

```csharp
// INCORRECT: BOM (Encoding.UTF8) and CRLF on Windows (WriteLine); writes before the pumps exist (deadlock with a chatty child).
psi.StandardInputEncoding = Encoding.UTF8;
p.StandardInput.WriteLine(secret);
p.StandardInput.Close();

// CORRECT: bytes, no newline, concurrent with the drains, tolerate a child that closes stdin early.
var bytes = Utf8NoBom.GetBytes(secret);                        // GetBytes never emits a preamble
var inT = Task.Run(async () =>
{
    try { await p.StandardInput.BaseStream.WriteAsync(bytes, ct); await p.StandardInput.BaseStream.FlushAsync(ct); }
    catch (IOException) { /* broken pipe: child exited or stopped reading; its exit code explains why */ }
    finally { try { p.StandardInput.Close(); } catch (IOException) { } }   // EOF is what --password-stdin waits for
});
```

Hold the secret as `byte[]`/`ReadOnlyMemory<byte>`, zero it after the write, and never put it in argv or log it (ocx contract rule 2). Do not rely on `AutoFlush`: `StandardInput` is created with `AutoFlush = true` (`Process.Unix.cs:471`, `Process.Windows.cs:636`), but the `BaseStream` path needs the explicit flush shown.

### 9. ocx specifics that shape the I/O layer

- Stdout carries the JSON document, stderr carries logs; progress bars appear only when stderr is a terminal (`ocx-cli-contract.md`, progress/colour lines), so a piped stderr stays quiet but can still be large at `--log-level debug`. Two separate captures with separate caps; never one merged pipe.
- 17 of the 105 output modes (65 report, 17 `report_then_fail`, 10 empty, 7 passthrough, 5 `shell_stream`, 1 `raw_document`) are `report_then_fail`: the report is on stdout and the exit code is non-zero. The engine must hand `(exitCode, stdout, stderr)` to the command layer even for non-zero exits; throwing on `exitCode != 0` inside the pump layer loses the document.
- `--format json` and `--color never` are global pre-subcommand flags with no env twin (`ocx-cli-contract.md`, rule 3): the I/O layer assumes they are already in argv. A command that emits colour escapes into the JSON stream would be an argv bug, not an I/O bug; the check lives in the argv-builder test.
- `exec` forwards the child's exit code and raw stdout (7 passthrough modes). The drain/cap/grace policy applies to the ocx process as the thing the SDK waits for, and the grandchild case is precisely a tool that backgrounds a daemon.
- Windows `launcher` shims use a Job Object so a force-killed launcher reaps the child tree; generated Rust spawn kills only the direct child and bounds the pipe wait itself (`ocx-cli-contract.md`, Signals). Neither removes the need for the SDK-side bound: the SDK spawns `ocx.exe` itself, not the shim.

### 10. .NET 11 RC1: ReadAllText/ReadAllBytes

.NET 11 (C# 15, GA Nov 2026; RC1 `11.0.100-rc.1.26425.128` on this toolchain) adds `Process.ReadAllText[Async]`, `ReadAllBytes[Async]`, `ReadAllLines[Async]` and `RunAndCaptureText[Async]` ([blog](https://devblogs.microsoft.com/dotnet/process-api-improvements-in-dotnet-11/)): they "drain stdout and stderr at the same time", decode with `Standard*Encoding` "or the default when not specified", throw `TimeoutException` / `OperationCanceledException`, and the high-level methods kill the process. Fixture `net11/` (own `global.json`, `allowPrerelease: true`):

```
ReadAllTextAsync 1MiB stderr: stdout=1 stderr=1048576 in 48ms (no deadlock)
ReadAllTextAsync grandchild-held: returned after 6046ms stdout='done'        <- still stalls (child slept 6 s)
ReadAllTextAsync(ct@1s) grandchild-held: OperationCanceledException after 1003ms
ReadAllBytesAsync utf8: stdout=C3A9E282ACF09F9880 (raw bytes, no decoding)
```

Implications: (a) nothing here is net8.0/net10.0-reachable, so the pump stays the engine; (b) `ReadAllBytesAsync` is a future internal simplification inside `#if NET11_0_OR_GREATER` only if it grows a size cap, which the blog does not describe; (c) the blog's own grandchild note ("a pipe reaches EOF only after all write-end handles close") plus `ProcessStartInfo.InheritedHandles` is the .NET 11 mitigation for the cause (the grandchild inheriting the pipe) rather than the symptom. It applies to handles ocx's child spawns, which the SDK does not control, so the bounded drain stays necessary. All of this is RC-era: re-measure at GA.

### 11. What the exemplars do

| Library | Drain | Encoding | Stdin | Bound on held pipe | Cap |
|---|---|---|---|---|---|
| CliWrap 7dbc252fa773 | byte pumps, `Task.WhenEach` (`Command.Execution.cs:191-210`) | none on `ProcessStartInfo`; `PipeTarget.ToStringBuilder` defaults to `Encoding.Default` (`PipeTarget.cs:234-236`) | pumped as its own task | none (comment at `:191`) | none |
| SimpleExec f80913246993 | `ReadToEndAsync` x2 then `Task.WhenAll` (`Command.cs:421-430`) | one optional `Encoding` on all three (`Internal/ProcessStartInfoExtensions.cs:23-25`) | `WriteAsync` then `Close()` before the reads (`Command.cs:418-419`), a deadlock for large stdin + chatty child | none | none; suppresses `CA1849`/`VSTHRD103` for `.Result` after `WhenAll` (`:432-437`) |
| MedallionShell e45f1f6ffd4c | background `InternalProcessStreamReader` per stream, 1024-byte `ByteBufferSize` (`Streams/InternalProcessStreamReader.cs:35-39`, `Constants.cs:11`) | optional `ProcessStreamEncoding` on out/err (`Shell.cs:53-56`) | `standardInputEncoding` passed through | none; field report #104 | none |
| Aspire af646baee1e8 | `BeginOutputReadLine` + `WaitForExitAsync` + `Task.WhenAll(stdoutComplete, stderrComplete)` (`ProcessUtil.cs:131,149-150`) | none | written after reads are active (`:134`) | 5 s only when stopping the process (`:20,276`); cites #29232 (`:80`) | none |
| Testcontainers 04cbb73fcc58 | `StandardOutput.ReadToEnd()` after writing stdin (`Builders/DockerCredentialProcess.cs:24-26`); safe only because stderr is not redirected | none | `WriteLine(hostname)` | none | none |
| ocx-sdk-python 80136dde4162 | one daemon pump thread per stream | `utf-8`, `errors="replace"` (`_process.py:515-516`) | `input=` written before waiting (known shortcut) | `_PUMP_JOIN = 5.0` (`:80,643`) | none by design (`:224-228`) |

No surveyed .NET library has a size cap or sets all three encodings by default; the combination in section 2 is new relative to them. CliWrap #346 (Aug 2026) is a reminder against hand-rolled `Stream` plumbing: `PipeTarget.Merge`'s `SimplexStream` signalled EOF once, so a `StreamReader` over-read blocked forever when the byte count was a multiple of 1024 and contained a multibyte character; the reporter's framing as a stdout/stderr merge deadlock is inaccurate, it is any sub-target reading past EOF ([issue](https://github.com/Tyrrrz/CliWrap/issues/346), fixed the next day via PR 347). The pump above reads straight from the OS pipe streams and owns no custom EOF logic.

### 12. Verified on the toolchain

Fixture root: `/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-process-streams-and-encoding/`

| Path | Purpose |
|---|---|
| `dummy/` | net10.0 child; modes `stderr-then-stdout N`, `stdout-flood N`, `utf8`, `chunked-utf8 N`, `grandchild S`, `sleep S`, `lines`, `stdin-check`, `echo-stdin`; writes raw bytes only |
| `probe/` | net8.0;net10.0 runner; `Pump.cs` is the canonical engine; `Program.cs` has 30 scenarios, exit 0 = PASS, 1 = FAIL |
| `net11/` | own `global.json` pinning `11.0.100-rc.1.26425.128`; `ReadAllTextAsync` checks |
| `analyzers/{bad,good,bad-default,bad-ec}` | analyzer + BannedApiAnalyzers twins |
| `rules-check.sh`, `run-all.sh` | `rg` rules R1 to R7 red/green; all probe scenarios on one or more TFMs |

Commands:

```bash
T=/home/mherwig/.cache/research-lang/dotnet-tools/run.sh
F=/home/mherwig/.cache/research-lang/dotnet-tools/fixtures/csharp-process-streams-and-encoding
(cd $F/dummy && $T dotnet build -c Release --nologo -v q)
(cd $F/probe && $T dotnet build -c Release --nologo -v q)
$F/run-all.sh net8.0 net10.0                       # Linux, both runtimes
$T dotnet $F/probe/bin/Release/net10.0/probe.dll deadlock-seq-sync-bad; echo exit=$?
# Windows host (SDK 10.0.102), staged at C:\Users\ecom\csharp-wintest\streams (bin/obj excluded):
cd /mnt/c/Users/ecom && /mnt/c/Windows/System32/cmd.exe /v:on /c "cd /d C:\Users\ecom\csharp-wintest\streams && dotnet probe\bin\Release\net10.0\probe.dll enc-null-default & echo exit=!ERRORLEVEL!"
```

Red then green, observed output (`elapsed` is the probe's own clock; `exit` is the probe's exit code):

| Claim | Red (bad shape) | Green (fixed twin) |
|---|---|---|
| Sequential drain deadlocks | `deadlock-seq-sync-bad` FAIL `TIMEOUT 6s` exit 1; `deadlock-seq-async-bad` FAIL `TIMEOUT 6s` (net8, net10, Windows) | `deadlock-whenall-good` PASS 57 to 95 ms; `deadlock-events-good` PASS; `deadlock-pump-good` PASS `stdout=1 stderr=1048576` |
| Stdin-before-drain deadlocks | `stdin-deadlock-bad` FAIL `TIMEOUT 6s` | `stdin-deadlock-good` PASS `echoed=2097152` |
| Grandchild stalls the wait | `grandchild-events-bad` FAIL `WaitForExitAsync took 8056ms` (Linux), `8141ms` (Windows); `grandchild-streams-bad` FAIL `alone=49ms, +ReadToEndAsync=8057ms`; `grandchild-sync-waitforexit-bad` FAIL `WaitForExit() took 8050ms` | `grandchild-pump-good` PASS `returned after 1059ms drainTimedOut=True stdout='done' exit=0` |
| Meziantou claim is gone | (.NET 5 source has no EOF wait) | `trailing-output` PASS `logs=2 (line1\|line2)` on net8.0, net10.0, Windows |
| Null encoding is host-dependent | Windows `enc-null-default` FAIL `stdout=[U+251C U+2310 U+0393 U+00E9 U+00BC U+2261 U+0192 U+00FF U+00C7] consoleOutCP=437`; Linux `enc-latin1-sim` FAIL `[U+00C3 U+00A9 U+00E2 U+0082 ...]` | `enc-utf8-explicit` PASS `[U+00E9 U+20AC U+1F600]` on Linux and Windows; Windows `chcp 65001` `enc-null-default` PASS (so CI hides the bug) |
| Per-chunk decode corrupts | `enc-chunk-getstring-bad` FAIL `chars=4006 U+FFFD=18` (Linux), `chars=4076 U+FFFD=222` (Windows) | `enc-chunk-decoder-good` PASS `chars=4000 U+FFFD=0`; `enc-bytes-once-good` PASS |
| BOM on stdin | `bom-utf8-static-bad` FAIL `BOM:EFBBBF73:9` exit 3 (all hosts) | `bom-nobom-good`, `bom-null-default`, `bom-basestream-good` PASS `ok:73336372:6` |
| `WriteLine` CRLF | Windows `stdin-writeline-bad` FAIL `ok:73336372:8:tail=0D0A` exit 4 | `stdin-exact-bytes-good` PASS `tail=6574`; Linux `stdin-writeline-bad` is green (`NewLine=0A`), the defect is Windows-only |
| Naive cap deadlocks | `cap-stop-reading-bad` FAIL `TIMEOUT 6s`; `cap-readtoend-alloc-bad` FAIL `allocated=256 MiB` (261 on Windows) for a 64 MiB child | `cap-drain-good` PASS `captured=1048576 truncated=True exit=0`; `cap-drain-alloc-good` PASS `allocated=3 MiB` (4 on Windows) |
| Pipe `ReadAsync` honors cancel | (n/a) | `grandchild-readasync-cancel-honored` PASS `state=Canceled after 502ms` Linux, `511ms` Windows |
| Analyzers catch the sync forms | `analyzers/bad`: `dotnet build` yields 13 distinct errors: `CA1849` x4, `RS0030` x6, `VSTHRD103` x3 (e.g. `Spawn.cs(14,17): error CA1849`; the build log prints each twice) | `analyzers/good`: `0 Warning(s) 0 Error(s)` |
| CA1849 is off by default | `analyzers/bad-default` (no `AnalysisLevel`, no editorconfig, `TreatWarningsAsErrors`): `0 Error(s)` although the file has `ReadToEnd()` in an async method | `analyzers/bad-ec` with `dotnet_diagnostic.CA1849.severity = error`: errors at `Spawn.cs(12,17)`, `(13,17)`, `(14,9)` (3 errors on the earlier 3-call revision of the file) |
| `rg` rules R1 to R7 | `rules-check.sh` on `bad`: R1 hits=4, R2 1, R3 2, R4 1, R5 1, R6 1, R7-Output 1, R7-Error 1 (R7-Input 0: the file sets it, with the wrong value, which R3 catches) | on `good`: every rule `hits=0` |
| .NET 11 RC1 | n/a | `ReadAllTextAsync` 1 MiB stderr in 48 ms; grandchild-held 6046 ms; `ct@1s` cancels at 1003 ms |

Matrix summary: 30 probe scenarios x (net8.0 Linux, net10.0 Linux, net10.0 Windows) = 90 runs. Every `*-bad` scenario was red on every host where the defect exists; every `*-good` scenario was green on all three. Exceptions by design: `stdin-writeline-bad` and `enc-null-default` are host-specific (Windows red, Linux green), and `trailing-output` is a regression check that is green because the bug is fixed. Not run: macOS, .NET Framework, and `net8.0` on the Windows host (only the 10.0.2 runtime is installed there).

## Normative guidance candidates

1. **Drain stdout and stderr concurrently from the instant `Start` returns; never read one stream to EOF before starting the other.** Rationale: a full unread pipe blocks the child, which blocks the reader (red at 1 MiB, sync and async-sequential). Verify: `rg -n --glob '*.cs' -e '\.ReadToEnd\(\)' -e '\.WaitForExit\(\)' src` returns nothing; `.editorconfig` `dotnet_diagnostic.CA1849.severity = error` and `dotnet_diagnostic.VSTHRD103.severity = error` (CA1849 is "Enabled by default in .NET 10: No", so the explicit severity is required); reading heuristic: two `Standard*` reads with an `await` between them and no task started for the second is a violation; plus a test that spawns `stderr-then-stdout 1048576` under a 10 s timeout.
2. **Pump with `BaseStream.ReadAsync(byte[])` loops, not `ReadToEnd(Async)` and not `OutputDataReceived` events, in the SDK core.** Rationale: only the byte loop gives a cap, a bounded wait and exact bytes. Verify: `rg -n --glob '*.cs' -e 'Standard(Output|Error)\.ReadToEndAsync\(' -e 'Begin(Output|Error)ReadLine\(' -e 'OutputDataReceived' src` returns nothing under the process engine directory (R2, R6; `rules-check.sh` shows hits=1 each on `bad`, 0 on `good`).
3. **When a cap is reached, discard and keep reading; never stop reading.** Rationale: a stopped reader re-creates the deadlock (red, 6 s timeout). Verify: reading heuristic: the cap branch of the loop must not `break`/`return`; test with `stdout-flood 67108864` and `MaxOutputBytes = 1 MiB` asserting completion and `Truncated == true`.
4. **Cap every captured stream: option `MaxOutputBytes`, default 16 MiB per stream; stdout overflow on a JSON command is an error, stderr overflow keeps the head and sets a flag.** Rationale: unbounded `ReadToEnd` allocated 256 MiB for a 64 MiB child; a truncated JSON document must not be parsed. Verify: `rg -n --glob '*.cs' 'MaxOutputBytes' src` finds the option and its use in every pump call; named test `Stdout_over_cap_fails_closed`.
5. **Do not call parameterless `Process.WaitForExit()` or sync `ReadToEnd()` in the SDK; ban them.** Rationale: both block a thread and wait for EOF (8 s with a grandchild). Verify: `BannedSymbols.txt` lines `M:System.Diagnostics.Process.WaitForExit` and `M:System.IO.StreamReader.ReadToEnd` with `<AdditionalFiles Include="BannedSymbols.txt" />` and `dotnet_diagnostic.RS0030.severity = error` (package `Microsoft.CodeAnalysis.BannedApiAnalyzers`; fixture red `RS0030` x6 on `bad`, green on `good`).
6. **Await `WaitForExitAsync(ct)` only on processes whose streams are read through `BaseStream`; never combine it with `Begin*ReadLine`, and never follow it with a sync `WaitForExit()` "to flush output".** Rationale: the .NET 5 workaround is obsolete since .NET 6 and re-adds the stall. Verify: rule R6 plus R1; reading heuristic: any `WaitForExit()` inside a comment-justified "flush" is a defect.
7. **After the process exits, bound the drain: `await Task.WhenAll(outTask, errTask).WaitAsync(DrainGrace, ct)`, default 5 s, option-configurable; on `TimeoutException` seal the captures, cancel the pump token and return what was read with `DrainTimedOut = true`; do not throw.** Rationale: a grandchild holding the pipe otherwise stalls for its lifetime; exit code and document are already complete. Verify: `rg -n --glob '*.cs' '\.WaitAsync\(' src` shows the drain site; named test `Grandchild_held_pipe_returns_within_grace` using `grandchild 8` and asserting elapsed < grace + 2 s and stdout `done`.
8. **Set `StandardOutputEncoding`, `StandardErrorEncoding` and `StandardInputEncoding` explicitly on every `ProcessStartInfo` that redirects the stream, to the shared `Utf8NoBom`.** Rationale: null means the OEM code page on Windows (9 mojibake chars for 3). Verify: `for k in Output Error Input; do rg -l --glob '*.cs' "RedirectStandard${k}\s*=\s*true" src | xargs -r rg --files-without-match "Standard${k}Encoding"; done` prints nothing (R7); on Windows CI run the `utf8` child test with `chcp 437`.
9. **Declare exactly one `static readonly UTF8Encoding Utf8NoBom = new(encoderShouldEmitUTF8Identifier: false)` and ban `Encoding.UTF8`, `Encoding.Default`, `Encoding.Unicode`, `Encoding.ASCII`, `Encoding.Latin1` in the process layer.** Rationale: `Encoding.UTF8` carries a preamble that `StreamWriter` emits on a pipe. Verify: `BannedSymbols.txt` lines `P:System.Text.Encoding.UTF8;...` and `P:System.Text.Encoding.Default;...`, or `rg -n -P --glob '*.cs' -e '\bEncoding\.(UTF8|Default|Unicode|ASCII|Latin1)\b' -e 'new UTF8Encoding\((?!\s*(encoderShouldEmitUTF8Identifier:\s*)?false)' src` returns only the `Utf8NoBom` declaration (R3). Scope the ban to the process-engine project or folder: `Encoding.UTF8.GetBytes` elsewhere is legitimate.
10. **Never decode per read chunk; decode the whole captured buffer once, or use a `Decoder`.** Rationale: multibyte characters split at read boundaries (18 and 222 U+FFFD). Verify: `rg -n --glob '*.cs' -e '\.GetString\(\s*\w+\s*,\s*0\s*,\s*\w+\s*\)' src` inside a read loop returns nothing (R5); test `chunked-utf8 2000` expects 4000 chars and 0 `U+FFFD`.
11. **Treat captured stdout as UTF-8 bytes: deserialize JSON from `ReadOnlySpan<byte>`/`Utf8JsonReader` or decode once; decode stderr lossy (default replacement fallback); never `throwOnInvalidBytes: true` on stderr.** Rationale: no UTF-16 copy of a large document, and a stray byte in a log line must not fail a command. Verify: `rg -n --glob '*.cs' 'new UTF8Encoding\([^)]*true\)' src` returns nothing; reading heuristic: `StandardOutput.ReadToEnd*` feeding `JsonSerializer.Deserialize(string)` is a violation of rule 2.
12. **Write stdin as exact bytes to `StandardInput.BaseStream` (`Utf8NoBom.GetBytes(secret)`, no trailing newline), concurrently with the drains, then `Close()`; catch `IOException` from the write.** Rationale: `Encoding.UTF8` writes a BOM, `WriteLine` writes CRLF on Windows, and ocx login strips only one `\n` (`login.rs:81-83`). Verify: `rg -n --glob '*.cs' 'StandardInput\.(Write|WriteLine)(Async)?\(' src` returns nothing (R4); named tests `Stdin_secret_has_no_bom_or_crlf` run on Windows and Linux with `stdin-check`.
13. **Never start writing stdin before the stdout/stderr pumps are running.** Rationale: red `stdin-deadlock-bad` (child echoes while its stdout pipe fills). Verify: reading heuristic: in the engine, the pump tasks are created above the first `StandardInput` access; test `echo-stdin` with 2 MiB under a 10 s timeout.
14. **The process engine returns `(ExitCode, StdoutBytes, StderrBytes, StdoutTruncated, StderrTruncated, DrainTimedOut)` for any exit code and throws no exit-code exception itself; the command layer decides, and parses stdout on non-zero exit for the 17 `report_then_fail` modes.** Rationale: the report is on stdout when the exit is non-zero. Verify: `rg -n --glob '*.cs' 'ExitCode\s*!=\s*0' src/Process` returns nothing in the engine; contract test per `report_then_fail` command with a dummy that writes a document and exits 1.
15. **Keep stdout and stderr in separate buffers; never merge them into one stream or one string.** Rationale: ocx stdout is the machine contract; merged logs corrupt the JSON. Verify: `rg -n --glob '*.cs' -e 'RedirectStandardError\s*=\s*false' -e '2>&1' src` returns nothing; reading heuristic: one `Capture` instance per stream.
16. **Observe or await every pump and stdin task so faults never go unobserved; never `await` pumps after the grace expired.** Rationale: abandoned reads can outlive the call; macOS cancellation is unmeasured. Verify: `rg -n --glob '*.cs' 'OnlyOnFaulted' src` at the abandon site; `TaskScheduler.UnobservedTaskException` count is 0 in the grandchild test.
17. **Do not use .NET 11 `ReadAllText[Async]` / `ReadAllBytes[Async]` / `RunAndCaptureText` as the engine; if used behind `#if NET11_0_OR_GREATER`, keep the cap and the grace outside them.** Rationale: RC1 API, unbounded, stalls on a grandchild (6046 ms). Verify: `rg -n --glob '*.cs' -e 'ReadAllTextAsync' -e 'ReadAllBytesAsync' -e 'RunAndCaptureText' src` appears only inside `#if NET11_0_OR_GREATER`.
18. **Name the I/O defaults in one `ProcessIoOptions` record (`MaxOutputBytes`, `DrainGrace`) with the default numbers and a doc comment citing this policy.** Rationale: magic numbers drift between SDK and docs. Verify: `rg -n --glob '*.cs' 'record\s+ProcessIoOptions' src` and a test asserting defaults 16 MiB and 5 s.
19. **CI must run the encoding and BOM tests on a Windows runner with the console code page not 65001.** Rationale: CI with `chcp 65001` hides the bug (`enc-null-default` green at 65001, red at 437). Verify: workflow reading: a `windows-latest` job runs the `Utf8_child_output` and `Stdin_secret_has_no_bom_or_crlf` tests without a `chcp 65001` step; cross-check locally with `/mnt/c/Windows/System32/cmd.exe /c "chcp & dotnet test ..."`.

## AI-agent angle

| What an LLM gets wrong | Why it compiles | Smallest mechanical check |
|---|---|---|
| Copies the learn.microsoft.com example: `string o = p.StandardOutput.ReadToEnd(); p.WaitForExit();` with stderr redirected too | The page's own example reads one stream | R1 `rg -n --glob '*.cs' -e '\.ReadToEnd\(\)' -e '\.WaitForExit\(\)' src`; `RS0030` ban |
| `await ReadToEndAsync()` on stdout then on stderr, believing async removes the deadlock | Compiles, looks idiomatic, hangs at ~64 KiB+ | `CA1849`/`VSTHRD103` do not catch it (they flag sync calls); R1 does not either; test `deadlock-seq-async-bad`, i.e. the 1 MiB stderr test. Reading heuristic: two awaits on two `Standard*` reads in sequence |
| Adds `p.WaitForExit();` after `await p.WaitForExitAsync()` "to make sure output is flushed" (Meziantou/StackOverflow advice, .NET 5 era) | Valid; historical | RS0030 on `Process.WaitForExit`; R1 |
| Assumes `OutputDataReceived` + `WaitForExitAsync` is bounded in time | It is not when a grandchild holds the pipe | R6 `Begin(Output|Error)ReadLine`; test `Grandchild_held_pipe_returns_within_grace` |
| Writes `StandardOutputEncoding = Encoding.UTF8` and `StandardInputEncoding = Encoding.UTF8` | Reads fine; BOM goes to the child's stdin | R3/`RS0030` on `Encoding.UTF8`; test `bom-utf8-static-bad` shape |
| Omits all encoding properties because "Linux is UTF-8 by default" | Passes on the agent's Linux sandbox and on CI at 65001 | R7; Windows `chcp 437` test |
| `p.StandardInput.WriteLine(secret)` / `Write(secret + "\n")` | Fine on Linux, CRLF on Windows | R4; Windows `Stdin_secret_has_no_bom_or_crlf` |
| Writes all stdin first, then starts reading | Natural reading order | Heuristic (rule 13); `echo-stdin` 2 MiB test |
| Stops reading once a cap is reached, or truncates after `ReadToEnd` | Looks like a memory guard | Test `stdout-flood` 64 MiB with a 1 MiB cap under a timeout |
| Decodes in the read loop with `Encoding.UTF8.GetString(buf, 0, n)` | Correct for ASCII, wrong for emoji and CJK | R5; `chunked-utf8` test |
| Merges stderr into stdout (`2>&1` via a shell, or one shared `StringBuilder`) | Easy way to "capture everything" | R-merge `rg -n --glob '*.cs' '2>&1' src`; reading heuristic: one `Capture` per stream |
| Throws on non-zero exit before reading stdout (`if (p.ExitCode != 0) throw new ...(stderr)`) | Mirrors `check=True` habits | Rule 14 grep; `report_then_fail` contract test |
| Uses `Process.Start(...)` with `UseShellExecute` left at the .NET Framework default | In .NET Core `false` is the default, so it works, but agents add `true` when "the window flashes" | `rg -n --glob '*.cs' 'UseShellExecute\s*=\s*true' src` returns nothing (redirection requires false) |
| Recommends `RunAndCaptureTextAsync` / `ReadAllTextAsync` (.NET 11) as "the modern way" | Compiles only on the RC SDK; fails on net8.0/net10.0 | R17 grep with `#if`; the net8.0 build is the check |
| Treats `WaitForExitAsync(ct)` cancellation as killing the child | It only stops waiting | Out of scope here; test asserts the child is gone (cancellation topic) |

## Contested / evolving

- **Cap default and overflow semantics.** Python: no ceiling, by design, because "a truncated one is worse than a large one" (`_process.py:224-228`). ocx script host: 10 MiB cap, lossy (`run_result.rs:13`). Here: 16 MiB, fail-closed on stdout. The number is judgment, not physics; trend: caps are becoming standard in agent-facing tooling. Revisit if the largest real ocx report (`package sbom` is `raw_document`) exceeds it.
- **Drain grace 5 s vs 1 s.** Physics allows 1 s (nothing lost in any run); 5 s is chosen for parity with Python and Aspire. The cost is a 5 s latency on `exec` of a daemonizing tool; make it a per-call option.
- **Time out and return vs treat as error.** The brief and the ocx contract say "treat as a timeout"; this note returns data with a flag, because the exit code and document are complete. Python also abandons the pump quietly (debug log). Stricter users can turn the flag into an exception in the command layer.
- **Event-mode vs byte pumps.** Aspire and many apps use `BeginOutputReadLine`; it is simpler for line logging and is fine for a host that must show live output. For an SDK that needs exact bytes, a cap and a bound, pumps win. Not contested among the library authors surveyed, but common in application code.
- **Is the grandchild stall a runtime bug?** Maintainers (tmds, 2023-03 and 2025-10): no, expected; the issue is closed as a duplicate and locked. .NET 11 `InheritedHandles` and `KillOnParentExit` attack the cause from the spawner side. Trend: handle inheritance control, not changes to `WaitForExit`. As of 2026-10-10 on RC1, `ReadAllTextAsync` still stalls.
- **Meziantou's `WaitForExitAsync` claim.** Resolved in .NET 6; the advice still circulates (StackOverflow, older blog posts, model training data). Historical-only.
- **`Process.StandardInputEncoding` BOM text in the MTP guide.** It scopes the BOM scenario to ".NET Framework"; on .NET 8/10 the null default is BOM-free (measured). The `Console.InputEncoding = new UTF8Encoding(false)` workaround matters for the test process, not for the SDK's own `ProcessStartInfo`. Guide dated 2026-08-31.
- **Windows default console code page.** Windows 11 can enable "Beta: Use Unicode UTF-8 for worldwide language support", which changes the OEM page to 65001 system-wide; the null default would then pass. Not measured here; do not rely on it, set the encoding.
- **macOS.** Not measured: cancellation of pending pipe reads, and whether `posix_spawn` (.NET 11 change per the blog) alters inherited-handle behavior. Treat the section 5 policy as unverified there.
- **.NET 11 GA (Nov 2026).** Re-run `net11/` at GA; if a size cap or a held-pipe bound lands in `ReadAll*`, rule 17 can relax for net11.0+ targets.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process.standardoutput | Reference + remarks: sync/async reads, deadlock explanation, examples | updated 2026-09-09, net-10.0 | Primary statement of the two-stream deadlock and the no-mixing rule |
| https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process.waitforexit | Reference: `WaitForExit()` vs `WaitForExit(int)` | updated 2026-09-09 | Documents that the infinite overload waits for async handlers and the finite one does not |
| https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process.waitforexitasync | Reference: `WaitForExitAsync` | updated 2026-09-09 | Shows the page says nothing about EOF; source is authoritative |
| https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.processstartinfo.standardoutputencoding | Reference: output encoding, default null | updated 2026-08-13 | "Does not guarantee that the process will use the specified encoding" |
| https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.processstartinfo.standardinputencoding | Reference: input encoding (.NET Core 2.1+) | updated 2026-08-13 | Availability bound for the stdin encoding property |
| https://learn.microsoft.com/en-us/dotnet/api/system.text.utf8encoding.-ctor | Reference: `UTF8Encoding` constructors | updated 2026-07-01 | BOM flag semantics and the `throwOnInvalidBytes` caution |
| https://learn.microsoft.com/en-us/dotnet/core/testing/migrating-vstest-microsoft-testing-platform | Migration guide, "Console.InputEncoding preservation" | updated 2026-08-31 | The VSTest-to-MTP BOM trap and its two workarounds |
| https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1849 | Analyzer rule CA1849 | updated 2026-04-02 | States "Enabled by default in .NET 10: No" |
| https://devblogs.microsoft.com/dotnet/process-api-improvements-in-dotnet-11/ | .NET team post on .NET 11 Process APIs | 2026 (.NET 11 preview/RC era) | `ReadAllText*`, `InheritedHandles`, `KillOnParentExit`, grandchild-pipe note |
| https://github.com/dotnet/runtime/issues/29232 | Issue: `WaitForExit()` hangs when a grandchild holds the pipe | opened 2019-04, closed 2023-03 | Maintainer position: waiting for EOF is expected |
| https://github.com/dotnet/runtime/issues/29232#issuecomment-1451584094 | tmds comment on grandchildren keeping output open | 2023-03-02 | Cited by Aspire in code; the canonical explanation |
| https://github.com/dotnet/runtime/issues/120452 | Issue: hang with uncontrollable child processes | opened 2025-10-06, duplicate of #29232 | Suggested workaround: `WaitForExit(timeout)` then drain; "cannot solve" |
| https://github.com/dotnet/runtime/issues/42556 | Issue: `WaitForExitAsync` doesn't wait for redirected output | 2020-09, milestone 6.0.0 | The fix for the Meziantou claim; no .NET 5 backport |
| https://github.com/dotnet/runtime/blob/v10.0.0/src/libraries/System.Diagnostics.Process/src/System/Diagnostics/Process.cs | Runtime source, `WaitForExitAsync` / `WaitUntilOutputEOF` / `BeginOutputReadLine` | .NET 10.0.0 (also read at v8.0.0, v6.0.0, v5.0.0) | Ground truth for what is awaited; v5 vs v6 diff proves the claim is historical |
| https://github.com/dotnet/runtime/blob/v10.0.0/src/libraries/System.Diagnostics.Process/src/System/Diagnostics/Process.Unix.cs | Runtime source, Unix stream/encoding setup, `WaitForExitCore` | .NET 10.0.0 | Null encoding = UTF-8 without BOM on Unix; finite wait skips EOF |
| https://github.com/dotnet/runtime/blob/v10.0.0/src/libraries/System.Diagnostics.Process/src/System/Diagnostics/Process.Windows.cs | Runtime source, Windows stream/encoding setup | .NET 10.0.0 | Null encoding = `GetConsoleOutputCP()` / `GetConsoleCP()` |
| https://github.com/dotnet/runtime/blob/v10.0.0/src/libraries/System.Private.CoreLib/src/System/IO/StreamWriter.cs | Runtime source, preamble logic | .NET 10.0.0 | Why a non-seekable pipe gets a BOM from `Encoding.UTF8` |
| https://github.com/dotnet/runtime/blob/v10.0.0/src/libraries/Common/src/System/Text/ConsoleEncoding.cs | Runtime source, preamble-stripping wrapper | .NET 10.0.0 | Why the null default is BOM-free |
| https://doc.rust-lang.org/std/io/struct.Stdout.html | Rust std reference, Windows portability notes | current stable | Why ocx's piped output is UTF-8 regardless of code page |
| https://github.com/dotnet/roslyn-analyzers/blob/main/src/Microsoft.CodeAnalysis.BannedApiAnalyzers/BannedApiAnalyzers.Help.md | BannedApiAnalyzers usage | current | `BannedSymbols.txt` syntax and `AdditionalFiles` wiring used by the fixture |
| https://meziantou.net/process-waitforexitasync-doesn-t-behave-like-process-waitforexit.htm | Blog post by Gerald Barre | 2020-11-16 (.NET 5) | The claim under test; historical |
| https://github.com/Tyrrrz/CliWrap/issues/196 | CliWrap issue: encoding not honored | 2023-02, closed invalid | Shows the property only selects the parent decoder |
| https://github.com/Tyrrrz/CliWrap/issues/346 | CliWrap issue: `PipeTarget.Merge` deadlock | 2026-08-18, fixed 2026-08-19 | Hand-rolled stream EOF hazards; framing correction |
| https://github.com/madelson/MedallionShell/issues/104 | MedallionShell issue: build-server daemon hangs read | 2023-07, closed not-planned | Field example of the grandchild-held pipe |
| `/home/mherwig/.cache/research-lang/exemplars/csharp/Tyrrrz__CliWrap` @7dbc252fa773 | Exemplar clone | read 2026-10-10 | Pump architecture and the unbounded-wait gap |
| `.../adamralph__simple-exec` @f80913246993, `.../madelson__MedallionShell` @e45f1f6ffd4c, `.../dotnet__aspire` @af646baee1e8, `.../testcontainers__testcontainers-dotnet` @04cbb73fcc58 | Exemplar clones | read 2026-10-10 | Four other drain/encoding/stdin choices, compared in section 11 |
| `/home/mherwig/dev/ocx` @5de9d777eb7d (`crates/ocx_cli/src/command/login.rs`, `crates/ocx_script/src/run_result.rs`, `website/src/docs/reference/script-host-api.md`) | ocx source | read 2026-10-10 | Stdin parsing rules and the 10 MiB precedent |
| `/home/mherwig/dev/ocx-sdk-python` @80136dde4162 (`src/ocx_sdk/_process.py`) | Python SDK source | read 2026-10-10 | `_PUMP_JOIN`, UTF-8 replace, no-ceiling rationale |
| `.agents/research/csharp-audit/{exemplar-cli-wrappers-and-sdks,ocx-cli-contract,python-sdk-digest}.md` | Prior audit | 2026-10-10 | Experiments E1 to E7, contract rules 5, 11, report_then_fail counts |
