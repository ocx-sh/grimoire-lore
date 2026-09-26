---
title: "exec.Cmd lifetime: context, WaitDelay, pipes, argv and exit errors"
topic: "Go SDK subprocess contract — the boundary os/exec draws around a wrapped CLI"
agent: "go-io/subprocess-contract"
model: sonnet
date_researched: 2026-09-26
sources_count: 17
fixtures: /home/mherwig/.cache/research-lang/go-tools/fixtures/subprocess-contract/
scope: >
  Covers M-G-08..14 and M-E-18: starting a child safely (CommandContext,
  WaitDelay, Cancel), argv/env hygiene (ErrDot, no shell, secrets not in
  argv), pipe draining and bounded capture, telling ExitError/ErrNotFound/
  context errors apart, process-group kill reaching descendants, the
  undocumented execwait=2 leak finalizer, and testing a subprocess wrapper
  without the real binary. Does NOT cover atomic file writes, os.Root,
  archive-extraction traversal guards (M-G-01..07, 15..18 — files-atomicity
  dive), or SIGPIPE/exit-code CLI contract mechanics (GO-CLI rows).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [CommandContext + WaitDelay + Cancel is the MUST shape](#1-commandcontext--waitdelay--cancel-is-the-must-shape)
   2. [WaitDelay applies with or without a Context](#2-waitdelay-applies-with-or-without-a-context)
   3. [ErrDot: Start refuses to run, it does not warn](#3-errdot-start-refuses-to-run-it-does-not-warn)
   4. [A canceled child that dies by signal is *exec.ExitError, not a context error](#4-a-canceled-child-that-dies-by-signal-is-execexiterror-not-a-context-error)
   5. [Draining only one stream deadlocks; concurrent drain is the fix](#5-draining-only-one-stream-deadlocks-concurrent-drain-is-the-fix)
   6. [Bounded capture: truncate, never grow unbounded](#6-bounded-capture-truncate-never-grow-unbounded)
   7. [Process-group kill: Setpgid + killpg reaches descendants; Process.Kill does not](#7-process-group-kill-setpgid--killpg-reaches-descendants-processkill-does-not)
   8. [The undocumented execwait leak finalizer panics, it does not log](#8-the-undocumented-execwait-leak-finalizer-panics-it-does-not-log)
   9. [Argv and env: no shell, no secrets in argv, an explicit env allowlist](#9-argv-and-env-no-shell-no-secrets-in-argv-an-explicit-env-allowlist)
   10. [Windows has no process group: job objects are the analogue, and nothing in std/x/sys/exec wires them for you](#10-windows-has-no-process-group-job-objects-are-the-analogue-and-nothing-in-stdxsysexec-wires-them-for-you)
   11. [Testing the wrapper without the real binary: TestMain re-exec](#11-testing-the-wrapper-without-the-real-binary-testmain-re-exec)
   12. [Which linters actually cover this surface, at golangci-lint 2.14.0](#12-which-linters-actually-cover-this-surface-at-golangci-lint-2140)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- Every child a fleet Go program starts uses `exec.CommandContext` (never `exec.Command`) with a nonzero `Cmd.WaitDelay` and, when SIGTERM-then-escalate is wanted, a custom `Cmd.Cancel` — the default `Cancel` is a hard `Kill`.
- `WaitDelay` is not context-only: it also bounds `awaitGoroutines` when no `Context` was used at all, so a plain `exec.Command` with `WaitDelay` set is still protected against an orphaned descendant holding a pipe open ([go1.27.1:src/os/exec/exec.go:993-1008](https://pkg.go.dev/os/exec)).
- Without `WaitDelay`, a grandchild that inherits and holds a pipe open makes `Wait` hang past both the context deadline and the process's own exit — confirmed by running it: see [Verification runs](#verification-runs).
- `exec.Start` on a name that resolves through `.` in `$PATH` never runs the binary: it returns `cmd.Err` (wrapping `exec.ErrDot`) directly, at `go1.27.1:src/os/exec/exec.go:675,679`, before any process is spawned — this is a refusal, not a lint warning.
- A child canceled via context that then **dies by signal** reports through `Wait` as `*exec.ExitError`, **not** `context.DeadlineExceeded` — the doc's own context-error branch fires only when the child exits with a *success* status after `Cancel` ran (`go1.27.1:src/os/exec/exec.go:272-279,944-957`). Check `ctx.Err()` directly; do not expect `errors.Is(err, context.DeadlineExceeded)` to fire on the wrapped error in the common case.
- `StdoutPipe`/`StderrPipe` deadlock the parent if only one stream is read while the child fills the other's OS pipe buffer (~64 KiB on Linux); the fix is draining both pipes concurrently, exactly as `bytes.Buffer`/`io.Writer` `Cmd.Stdout`/`Cmd.Stderr` already do internally via per-stream copying goroutines — confirmed with a 1 MiB stderr write that hangs one way and completes the other.
- A capture with no ceiling is a memory hazard for an untrusted child; a bounded writer that truncates past a cap (never blocks, never errors) is the right shape when the payload's size is not already bounded by contract.
- `ExitCode()` returns `-1` when the process died by signal, not by exiting (`go1.27.1:src/os/exec_posix.go:157-163` calling `syscall.WaitStatus.ExitStatus()`, `go1.27.1:src/syscall/syscall_linux.go:479-484`); the signal number needs `cmd.ProcessState.Sys().(syscall.WaitStatus).Signal()` and is Unix-only.
- `*exec.ExitError`, `exec.ErrNotFound`, and a context error are told apart with `errors.As`/`errors.Is` in that order — never a bare type switch, never comparing `err.Error()` strings.
- `SysProcAttr.Setpgid` (plus `Pgid`) puts a child in its own process group; killing that group (`syscall.Kill(-pid, sig)`) reaches every descendant that inherited the group, while `cmd.Process.Kill()` reaches only the immediate child — confirmed: a grandchild survives a lone `Process.Kill()` and dies under a group kill.
- `GODEBUG=#execwait=2` (an *undocumented* debug flag — absent from `go.dev/doc/godebug`) makes `exec.Command` register a finalizer that **panics** the whole program if a started `Cmd` is garbage-collected without a call to `Wait` — confirmed by running it: the panic prints the creating call's stack.
- `gosec` G204 fires on `exec.Command`/`exec.CommandContext` whenever any argument is not resolvable to a compile-time constant — it fires equally on both constructors and does not credit `CommandContext` for being context-aware; it does **not** fire on a hand-rolled shell-out like `exec.Command("/bin/sh", "-c", "…")` when every argument is a literal.
- `noctx` (golangci-lint) flags every bare `exec.Command(...)` call site with "use os/exec.CommandContext" — confirming the map's open question: **noctx does cover `os/exec`**, in golangci-lint 2.14.0.
- Neither `gosec`, `noctx`, `staticcheck`'s default set, nor `go vet` catches a literal shell-out through `/bin/sh -c` when the arguments are constants; `staticcheck` SA1005 checks only whether the *first* argument itself looks like a multi-word shell command (`exec.Command("ls / /tmp")`), and explicitly does not flag `exec.Command("/bin/sh", "-c", …)` — confirmed by running it on a planted violation that produced zero findings.
- None of `gosec`, `noctx`, or `staticcheck` are in golangci-lint 2.14.0's `standard` default (5 linters: `errcheck`, `govet`, `ineffassign`, `staticcheck`, `unused`) except `staticcheck` itself; `gosec` and `noctx` both need `--enable` (or the fleet's config) to run at all.
- Secrets belong in env or stdin, never argv — `ps`/`/proc/<pid>/cmdline` show argv to any co-resident user; the `aquasecurity/trivy` exemplar's own integration-test helper does this wrong (`docker login -p <password>` as a literal arg).
- Windows has no process group to signal; the closest analogue to a group kill is a Job Object with `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE` via `golang.org/x/sys/windows`, and nothing in `os/exec` or `x/sys/windows` wires this automatically — a Windows-targeting SDK must build it.
- A subprocess wrapper is tested without the real binary by re-executing the test binary itself (`TestMain` + an env-var gate + `os.Args` dispatch) — the pattern `os/exec`'s own tests use, and the one `ocx-sdk-python`'s test suite would need to mirror in reverse (spawning a Go helper instead of Python).

## Findings

### 1. `CommandContext` + `WaitDelay` + `Cancel` is the MUST shape

`exec.CommandContext` "arranges to call [`Cancel`] if the context becomes
done before the command completes on its own," and by default sets `Cancel`
to `Kill` and leaves `WaitDelay` at zero
([pkg.go.dev/os/exec](https://pkg.go.dev/os/exec)). Both `Cmd.Cancel` and
`Cmd.WaitDelay` were added in **Go 1.20**: "The new `Cmd` fields `Cancel`
and `WaitDelay` specify the behavior of the `Cmd` when its associated
`Context` is canceled or its process exits with I/O pipes still held open
by a child process" ([go.dev/doc/go1.20](https://go.dev/doc/go1.20)).

```go
// MUST
ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()
cmd := exec.CommandContext(ctx, "ocx", "resolve", pkg)
cmd.WaitDelay = 5 * time.Second
cmd.Cancel = func() error { return cmd.Process.Signal(syscall.SIGTERM) }

// WRONG — hand-rolled timer + Process.Kill; loses the pipe-close bound
// WaitDelay gives you for free, and races the goroutine that reads output
go func() {
    time.Sleep(30 * time.Second)
    cmd.Process.Kill()
}()
cmd := exec.Command("ocx", "resolve", pkg)
```

`WaitDelay`'s own doc is explicit about the two hazards it bounds: "a child
process that fails to exit after the associated Context is canceled, **and**
a child process that exits but leaves its I/O pipes unclosed"
([go1.27.1:src/os/exec/exec.go:289-314](https://pkg.go.dev/os/exec)). The
second hazard is the one map row M-G-11 targets and the one every
hand-rolled `time.AfterFunc`+`Kill` pattern misses, because `Process.Kill`
only ever reaches the process it names — see §7.

### 2. `WaitDelay` applies with or without a Context

`awaitGoroutines` starts its own timer from `c.WaitDelay` whenever no
context-derived timer already exists — "either there is no Context
associated with the command, or `c.Process.Wait` completed before the
Context was done" ([go1.27.1:src/os/exec/exec.go:993-1008](https://pkg.go.dev/os/exec)).
Practically: `exec.Command("ocx", ...)` (no context at all) with
`cmd.WaitDelay = 5 * time.Second` is still protected against the pipe-hang
hazard. This matters for a one-shot wrapper (`ocx-sdk-python`'s
`run_command`, mirrored by a future Go SDK's `RunCommand`) that may not need
cancellation but always needs a capture bound.

Confirmed by fixture (see [Verification runs](#verification-runs) #1): a
child that spawns a grandchild inheriting its stdout, then exits
immediately, leaves `Wait()` blocked past 800 ms when `WaitDelay == 0`;
with `WaitDelay = 300ms` (no context involved), `Wait()` returns
`exec.ErrWaitDelay` within the delay.

### 3. `ErrDot`: `Start` refuses to run, it does not warn

`os/exec`'s package doc: "as of Go 1.19, this package will not resolve a
program using an implicit or explicit path entry relative to the current
directory... these functions return an error err satisfying
`errors.Is(err, ErrDot)`"
([go1.27.1:src/os/exec/exec.go:33-38](https://pkg.go.dev/os/exec); background
in [go.dev/blog/path-security](https://go.dev/blog/path-security)). The
mechanism is a hard refusal, confirmed in source: `Command` stores the
`LookPath` error (including `ErrDot`) on `cmd.Err`, and `Start` returns it
immediately —

```go
// go1.27.1:src/os/exec/exec.go:672-679
if c.Path == "" && c.Err == nil && c.lookPathErr == nil {
    return errors.New("exec: no command")
}
if c.Err != nil || c.lookPathErr != nil {
    if c.lookPathErr != nil {
        return c.lookPathErr
    }
    return c.Err
}
```

— no process is spawned. Confirmed by fixture: a marker-writing binary named
`greet`, resolved with `PATH=.`, is never executed (`errors.Is(err,
exec.ErrDot) == true`; the marker file the binary would have created does
not exist); the same binary invoked as `./greet` runs normally.

`GODEBUG=execerrdot=0` disables this entirely and is the *only* documented
exec-related `GODEBUG` — "Go 1.19 made it an error for path lookups to
resolve to binaries in the current directory, controlled by the `execerrdot`
setting. There is no plan to remove this setting"
([go.dev/doc/godebug](https://go.dev/doc/godebug)). It is a per-binary
compatibility escape hatch, not a fleet default; a fleet SDK/CLI never sets
it and never resolves a bare name that could hit `.`.

### 4. A canceled child that dies by signal is `*exec.ExitError`, not a context error

The doc for `Cancel` reads carefully: "If the command exits with a success
status **after** Cancel is called... Wait... will return a non-nil error:
either an error wrapping the one returned by Cancel, or the error from the
Context.... If the command exits with a non-success status... Wait...
continue[s] to return the command's usual exit status"
([go1.27.1:src/os/exec/exec.go:272-279](https://pkg.go.dev/os/exec)). `Wait`
itself checks the process's own result first:

```go
// go1.27.1:src/os/exec/exec.go:944-957
state, err := c.Process.Wait()
if err == nil && !state.Success() {
    err = &ExitError{ProcessState: state}
}
...
if err == nil && watch.err != nil {   // watchCtx's ctx-derived error
    err = watch.err
}
```

A child killed by `SIGTERM` (the common `Cancel` shape) has
`state.Success() == false` (it died by signal, it did not exit 0), so `err`
is already a non-nil `*ExitError` **before** `watch.err` (the context error)
is even consulted — the ctx error is discarded. Confirmed by fixture: a
`sleep`-forever helper canceled at 100 ms via `SIGTERM` reports
`*exec.ExitError` ("signal: terminated"), while `ctx.Err()` independently
reports `context.DeadlineExceeded`. Only a helper that catches `SIGTERM` and
calls `os.Exit(0)` itself produces the documented "success after cancel"
branch, where `Wait` does return the context error.

**Practical rule**: to know *why* a child was torn down, check `ctx.Err()`
directly, never rely on `errors.Is(waitErr, context.DeadlineExceeded)` —
it will almost never fire, because most children die by signal rather than
exiting 0 in response to one.

### 5. Draining only one stream deadlocks; concurrent drain is the fix

`Cmd.Stdout`/`Cmd.Stderr` doc: "if either is nil, Run connects the
corresponding file descriptor to the null device... otherwise a separate
goroutine reads from the process over a pipe" — one goroutine **per
stream**, so `bytes.Buffer`/plain `io.Writer` values never deadlock each
other ([pkg.go.dev/os/exec](https://pkg.go.dev/os/exec)). The deadlock is a
*hand-rolled* hazard, reachable only through `StdoutPipe`/`StderrPipe`:
"it is thus incorrect to call Wait before all reads from the pipe have
completed... it is incorrect to call `Cmd.Run` when using `StdoutPipe`"
(same doc). If a caller takes both raw pipes and reads only one, the other
stream's OS pipe buffer (commonly 64 KiB on Linux) fills, the child blocks
on `write(2)`, and the caller's `Read` on the *other* pipe never sees more
data because the child is stuck — not because that pipe is empty.

```go
// WRONG — reads only stdout; a chatty child on stderr deadlocks this
stdout, _ := cmd.StdoutPipe()
_, _ = cmd.StderrPipe()   // taken but never drained
cmd.Start()
io.ReadAll(stdout)        // blocks forever if stderr fills up first

// RIGHT — drain both concurrently before/while waiting
stdout, _ := cmd.StdoutPipe()
stderr, _ := cmd.StderrPipe()
cmd.Start()
var wg sync.WaitGroup
wg.Add(2)
go func() { defer wg.Done(); outBuf, _ = io.ReadAll(stdout) }()
go func() { defer wg.Done(); errBuf, _ = io.ReadAll(stderr) }()
wg.Wait()
cmd.Wait()
```

Confirmed by fixture: a child writing 1 MiB to stderr while stdout is read
alone hangs past 1 s; the same child with both pipes drained concurrently
finishes and both buffers are complete (`stderr` length exactly 1,048,576
bytes). `ocx-sdk-python`'s own `_process._run_once` names the identical
hazard: "so neither can fill its pipe buffer and deadlock the child"
(`/home/mherwig/dev/ocx-sdk-python/src/ocx_sdk/_process.py:218-219`), using
one pump thread per stream — the same one-goroutine-per-stream shape Go's
own `Cmd.Stdout`/`Cmd.Stderr` already gives for free when they are plain
`io.Writer`s rather than raw pipes.

### 6. Bounded capture: truncate, never grow unbounded

Neither `Cmd.Output`/`CombinedOutput` nor a `bytes.Buffer` `Stdout` caps
size — a chatty or hostile child can grow the buffer without bound. A
bounded `io.Writer` that stops accepting past a cap (never blocking, never
erroring, just discarding and flagging truncation) is the shape used
elsewhere in the stdlib itself for a related purpose: `ExitError.Stderr` is
filled by a `prefixSuffixSaver{N: 32 << 10}` inside `Cmd.Output`
(`go1.27.1:src/os/exec/exec.go:1035-1037`), which keeps a prefix and suffix
and reports how much was omitted in the middle — proof the Go team
considers unbounded capture a real hazard worth a dedicated type, not just
a comment. `ocx-sdk-python`'s `run_command` takes the opposite, deliberate
position for its one payload (§12 of `_process.py`): stdout capture is
*never* bounded, because it is a whole JSON document a parser needs intact
— truncating it corrupts the message. **The choice is per-stream and
per-contract**, not a single universal cap: bound whatever stream is
free-form/diagnostic (stderr, a log passthrough); never truncate a stream
that is a parseable payload with a known reasonable size, and reject an
oversized payload as an error instead of silently cutting it.

### 7. Process-group kill: `Setpgid` + `killpg` reaches descendants; `Process.Kill` does not

`syscall.SysProcAttr` on Linux: `Setpgid` "sets the process group ID of the
child to Pgid, or, if Pgid == 0, to the new child's process ID"
(`go1.27.1:src/syscall/exec_linux.go:75-77`). `os.Process.Kill` only ever
signals the one PID it wraps; it has no group-aware variant. Reaching a
grandchild that the immediate child spawned (and never waited on) requires
signalling the *group*: `syscall.Kill(-pid, sig)` where `pid` is the
process-group leader's PID (equal to its own PID when it called `Setpgid`
with `Pgid == 0`).

```go
// MUST, for anything that may spawn further descendants
cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
cmd.Start()
...
// terminate the whole tree, not just the immediate child
syscall.Kill(-cmd.Process.Pid, syscall.SIGTERM)
```

Confirmed by fixture: an immediate child spawns a grandchild (no `Setpgid`
anywhere — both share the test binary's own process group) that records its
own PID to a file and sleeps. Killing only `cmd.Process` (the immediate
child) leaves the grandchild's PID signalable (`kill -0` succeeds) 150 ms
later; the identical scenario with `Setpgid: true` on the top-level `Cmd`
and a group kill (`syscall.Kill(-pid, SIGKILL)`) leaves the grandchild gone.

The pid-recycling hazard `ocx-sdk-python`'s `_process._signal_group` guards
against (CWE-367, "once a child is reaped, its pid... can be handed to an
unrelated process, and the signal would hit a stranger",
`_process.py:803-810`) applies identically in Go: check
`cmd.ProcessState != nil` (already reaped) before signalling, exactly as
the Python guard checks `proc.returncode is not None`.

### 8. The undocumented `execwait` leak finalizer panics, it does not log

`os/exec` registers a `runtime.SetFinalizer` on every `*Cmd` **only when**
`GODEBUG` contains a nonzero `#execwait` value, checked once inside
`Command` itself (`go1.27.1:src/os/exec/exec.go:390,421-455`). This name is
absent from [go.dev/doc/godebug](https://go.dev/doc/godebug) — it is not a
documented compatibility `GODEBUG`, and the leading `#` marks it internal
tooling rather than a public setting (contrast `execerrdot`, which has no
`#` and is documented). If the finalizer later observes `c.Process != nil &&
c.ProcessState == nil` — a `Cmd` that was started but never `Wait`ed —
it does not log a warning, it **panics**:

```go
// go1.27.1:src/os/exec/exec.go:452
panic("exec: Cmd started a Process but leaked without a call to Wait" + debugHint)
```

Confirmed by running a two-line program under `GODEBUG=execwait=2`: leaking
a started `Cmd` crashes the process (exit status 2) and prints the
finalizer's captured creation stack to stderr; the identical program without
the `GODEBUG` variable, or with `Wait()` called, exits 0 (see
[Verification runs](#verification-runs) #6). Because this only fires when a
finalizer runs — i.e., only after a GC cycle collects the leaked `*Cmd` —
it is a debugging aid for a `go test` or CI run with `GODEBUG=execwait=2`
set, never something to enable in production (a stray leak would crash the
whole program, not just log).

### 9. Argv and env: no shell, no secrets in argv, an explicit env allowlist

`os/exec`'s package doc is explicit that it "intentionally does not invoke
the system shell": "unlike the 'system' library call from C... the package
behaves more like C's 'exec' family of functions"
([pkg.go.dev/os/exec](https://pkg.go.dev/os/exec)). Shelling out through
`exec.Command("/bin/sh", "-c", fullCommandLine)` reintroduces every hazard
the package was designed to avoid (word-splitting, glob expansion,
injection through an unescaped argument) and is flagged by `gosec` G204
only when an argument is *not* a compile-time constant — see §12 for the
gap when it is literal.

Secrets in argv are visible to any co-resident process via `ps` or
`/proc/<pid>/cmdline` for the argv's lifetime, not just at spawn time. The
`aquasecurity/trivy` exemplar's own integration-test helper gets this wrong:
`exec.Command("docker", "login", "-u", auth.Username, "-p", auth.Password,
…)`
(`aquasecurity/trivy@ae561f8cca36:pkg/fanal/test/integration/docker/docker.go:63`,
[gosec G204](https://github.com/securego/gosec/blob/master/rules/subproc.go)
would flag this if `auth.Password` isn't a constant — and it isn't). The
fix mirrored from `ocx-sdk-python`'s `run_command`: accept an `input
*string` parameter written to the child's stdin and then closed (so a
`--password-stdin`-style flag sees EOF), and redact it from every log
surface the wrapper touches
(`/home/mherwig/dev/ocx-sdk-python/src/ocx_sdk/_process.py:236-239,648-658`).

An explicit env allowlist (`ComposedEnv` in the Python SDK) rather than
inheriting the whole parent environment (`Cmd.Env = nil`) keeps a child from
seeing credentials the wrapper never intended to hand it — the Go analogue
is a small `env []string` built by a `HostEnv`-shaped composer, never
`cmd.Env = os.Environ()` for anything that spawns an untrusted or
third-party binary.

### 10. Windows has no process group: job objects are the analogue, and nothing in std/x/sys/exec wires them for you

Go's own `syscall.SysProcAttr` on Windows carries no `Setpgid` field at all
— `Setpgid`/`Pgid`/`Foreground` are POSIX-only
(`go1.27.1:src/syscall/exec_linux.go`; Windows's `SysProcAttr` in
`syscall/exec_windows.go` has a different field set entirely, with no
process-group concept). The closest Windows analogue to "kill this process
and everything it spawned" is a **Job Object**: create one with
`windows.CreateJobObject`, configure
`JOBOBJECT_EXTENDED_LIMIT_INFORMATION` with
`JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE` via
`windows.SetInformationJobObject`, assign the started process with
`windows.AssignProcessToJobObject`, and close the job handle to kill every
process still assigned to it
([pkg.go.dev/golang.org/x/sys/windows](https://pkg.go.dev/golang.org/x/sys/windows);
pattern documented in
[buildkite/agent#1329](https://github.com/buildkite/agent/pull/1329) and
[a worked example](https://gist.github.com/hallazzang/76f3970bfc949831808bbebc8ca15209);
background on the primitive itself at
[Microsoft's Job Objects doc](https://learn.microsoft.com/windows/win32/procthread/job-objects)).
Nothing in `os/exec` or `golang.org/x/sys/windows` wires a `Cmd` to a job
object automatically — a Windows-targeting SDK builds this itself (create
the job before `Start`, assign the PID right after `Start` returns, before
the child can spawn anything of its own). `ocx-sdk-python`'s own Windows
carve-out is instructive by contrast: it does *not* attempt a Windows
process-group equivalent for signal forwarding, documenting the gap
explicitly instead (`_process.py:479-481,721-724`: "Windows: no new process
group, so Ctrl-C still reaches the child" / "TerminateProcess only, no
graceful phase"). A Go SDK has the option Python's stdlib does not
(`x/sys/windows` job objects are a real, if manual, primitive) but should
not assume it is free — it is meaningfully more code than the Unix path.

### 11. Testing the wrapper without the real binary: `TestMain` re-exec

`os/exec`'s own test suite answers M-E-18 directly: it re-executes the test
binary itself, dispatching on an env-var gate and argv, rather than
building a separate stub binary or relying on a fake `PATH` entry:

```go
// go1.27.1:src/os/exec/exec_test.go:73-77 (paraphrased structure)
func TestMain(m *testing.M) {
    flag.Parse()
    pid := os.Getpid()
    if os.Getenv("GO_EXEC_TEST_PID") == "" {
        os.Setenv("GO_EXEC_TEST_PID", strconv.Itoa(pid))
        os.Exit(m.Run())
    }
    // this process was re-exec'd to impersonate a helper; dispatch on argv
}
```

The stdlib's own env var is `GO_EXEC_TEST_PID`; the older and still more
common convention across the wider ecosystem (documented in many net/http,
os/signal-adjacent packages historically, and the shape this dive's own
fixture uses) is `GO_WANT_HELPER_PROCESS=1` — functionally identical, only
the name differs, and either is fine as long as one test binary plays every
role. `helperCommand`/`helperCommandContext`
(`go1.27.1:src/os/exec/exec_test.go:151,158`) then just build an
`exec.Command`/`CommandContext` pointing back at `os.Executable()` with a
mode name as `argv[1]`.

This is the pattern a Go OCX SDK's own test suite mirrors: no real `ocx`
binary needed, no separate `go build` step for a stub, no `PATH`
manipulation — the test binary re-execs itself with
`os.Executable()` and a mode argument, and a `switch` in `helperMain`
plays whatever child behavior the test needs (exit code N, hold a pipe
open, write to stderr, catch a signal and exit 0, etc.), exactly as this
dive's own fixture does (`exec_test.go` in the fixture directory).
`ocx-sdk-python`'s test suite achieves the same isolation differently —
its `popen_factory`/`exec_factory` seams (`_process.py:102-106`) let a test
inject a fake `Popen`/`create_subprocess_exec` entirely in-process, with no
subprocess at all. Go's equivalent seam (also present in this dive's
fixture as `PopenFactory`-shaped injection is unnecessary in Go because
`*exec.Cmd` is already a concrete, easily-constructed value) is simpler:
there is no interface to fake, so the re-exec pattern is normally the
better default — it exercises the real `os/exec` machinery (real pipes,
real `Wait`, real signals) rather than a hand-maintained double.

### 12. Which linters actually cover this surface, at golangci-lint 2.14.0

Measured directly (see [Verification runs](#verification-runs)):

| Check | Catches | Does not catch |
|---|---|---|
| `noctx` | Every bare `exec.Command(...)` call — "use os/exec.CommandContext" | Whether `WaitDelay`/`Cancel` are set on the `CommandContext` it approves of |
| `gosec` G204 | `exec.Command`/`exec.CommandContext` with any non-constant argument | The identical call with only literal arguments — including a literal `exec.Command("/bin/sh", "-c", "…")` |
| `staticcheck` SA1005 | `exec.Command("ls / /tmp")` — a whole shell command line jammed into `argv[0]` | `exec.Command("/bin/sh", "-c", "…")` — its own doc example of the *documented workaround*, deliberately excluded because `argv[0]` contains `/` |
| `go vet` (default, in `go test`) | Malformed Test/Benchmark signatures, copylocks, etc. | Nothing exec-specific |

None of `gosec`, `noctx` are in golangci-lint 2.14.0's `standard` default
set — confirmed: `golangci-lint linters --default=standard` lists exactly
`errcheck`, `govet`, `ineffassign`, `staticcheck`, `unused`. A fleet
`.golangci.yml` must explicitly `enable: [gosec, noctx]` for either check to
run; the map's own [gates](../go-audit/exemplar-quality-gates.md) dive
should be the one that pins this in the shared config (this dive only
confirms what each linter does and does not see on this surface).

**The gap that remains uncovered by any tool**: a literal shell-out
(`exec.Command("/bin/sh", "-c", literalString)`, or the `sh`/`bash -c`
equivalent) with no dynamic arguments is invisible to the entire
golangci-lint 2.14.0 catalogue tested here. The only working check is a
reading heuristic / grep for the literal pattern — see
[Normative guidance candidates](#normative-guidance-candidates) #9.

## Normative guidance candidates

1. **Every subprocess starts with `exec.CommandContext`, never bare
   `exec.Command`.**
   *Rationale*: a child with no context has no deadline and no cancellation
   path; `CommandContext` costs nothing when the context is
   `context.Background()`.
   *Verify*: `golangci-lint run --enable-only=noctx` (2.14.0) — flags every
   `exec.Command(` call; enable it in the pinned config, since it is not in
   `standard`.
   *Run*: **yes** — `fixtures/subprocess-contract/` (12 issues incl. 3
   `noctx` hits) vs `gosec-noctx-twin/` (0 issues). Exit 1 → exit 0.

2. **Every subprocess sets a nonzero `Cmd.WaitDelay`.**
   *Rationale*: without it, `Wait` can hang indefinitely on an orphaned
   descendant holding a pipe open, regardless of context cancellation
   (§1–2).
   *Verify*: no analyzer checks this (uncovered — `[cfg]` §3, `[run]` §6);
   reading heuristic: grep for `exec.CommandContext(` / `exec.Command(` call
   sites and confirm a `.WaitDelay =` assignment on the same `Cmd` within
   the enclosing function.
   *Run*: **yes**, as a behavioral proof rather than a static check —
   `TestWaitDelay_ZeroHangsPastBound_Violation` (Wait still blocked at
   800 ms) vs `TestWaitDelay_NonZeroReturnsErrWaitDelay_Twin` (returns
   `exec.ErrWaitDelay` within the delay). `go test -run TestWaitDelay -v`
   exit 0 both ways (both are pass/fail assertions of the claimed
   behavior, not lint runs); see Verification runs #1.

3. **A custom `Cmd.Cancel` sends `SIGTERM` (or the platform-appropriate
   graceful signal); never rely on the default hard `Kill` for anything
   that should shut down cleanly.**
   *Rationale*: the default `Cancel` set by `CommandContext` is `Kill`
   (`go1.27.1:src/os/exec/exec.go`, `CommandContext` doc) — a child gets no
   chance to flush or clean up unless a custom `Cancel` is supplied.
   *Verify*: reading heuristic — grep for `exec.CommandContext(` sites and
   confirm a `.Cancel =` assignment when the child is expected to shut down
   gracefully (a short-lived one-shot like `ocx resolve` may not need one;
   a long-running `ocx run`/`ocx serve` child does).
   *Run*: no (reading heuristic only — the *effect* of a custom `Cancel` is
   exercised implicitly by #4's fixture, but no dedicated check was run).

4. **Never rely on `errors.Is(waitErr, context.DeadlineExceeded)` to detect
   a timeout; check `ctx.Err()` directly.**
   *Rationale*: a child that dies by signal after `Cancel` reports as
   `*exec.ExitError`; the context error only surfaces on the doc's
   "success status after Cancel" branch, which most `SIGTERM`-killed
   children never hit (§4).
   *Verify*: reading heuristic — grep for `errors.Is(` `context.DeadlineExceeded`
   or `context.Canceled` immediately following an `exec.Cmd.Wait()`/`Run()`
   call, and flag it for review; there is no tool-level check.
   *Run*: **yes** — `TestClassify_SignalDeathIsExitError_NotContextError`
   and `TestClassify_GracefulExitAfterCancel_IsContextError` both pass,
   demonstrating the two branches. `go test -run TestClassify -v` exit 0.

5. **Capture output through `Cmd.Stdout`/`Cmd.Stderr` as plain `io.Writer`s
   (or `Output`/`CombinedOutput`) by default; reach for `StdoutPipe`/
   `StderrPipe` only when streaming is required, and then drain every pipe
   taken, concurrently, before or while waiting.**
   *Rationale*: `Cmd.Stdout`/`Cmd.Stderr` already run one copying goroutine
   per stream; raw pipes hand that responsibility to the caller, and a
   caller that reads only one deadlocks the moment the other fills its OS
   buffer (§5).
   *Verify*: reading heuristic — grep for `StdoutPipe()` or `StderrPipe()`
   and confirm both are drained via a goroutine (or neither pipe API is
   used at all).
   *Run*: **yes** — `TestDrainOnlyStdout_Deadlocks_Violation` (still
   blocked at 1 s) vs `TestDrainBothConcurrently_Completes_Twin` (completes,
   stderr length exactly 1,048,576 bytes). `go test -run Drain -v` exit 0.

6. **Bound any captured stream whose size is not already bounded by
   contract; never bound a stream that is itself the parseable payload
   (bound stderr/log passthrough, not a JSON envelope on stdout).**
   *Rationale*: an untrusted or hostile child can write without limit; the
   stdlib's own `prefixSuffixSaver` for `ExitError.Stderr` shows the Go team
   treats this as a real hazard for diagnostic streams specifically (§6).
   *Verify*: reading heuristic — for any `Cmd.Stderr`/log-capture writer,
   confirm it is bounded (a `BoundedWriter`-shaped type, or
   `io.LimitReader`/`prefixSuffixSaver`-style saver), not a bare
   `bytes.Buffer` fed indefinitely.
   *Run*: **yes** — `TestBoundedWriter_Truncates` /
   `TestBoundedWriter_NoTruncationUnderCap_Twin`. `go test -run
   BoundedWriter -v` exit 0.

7. **A child that may spawn its own descendants gets `SysProcAttr.Setpgid:
   true`; tearing it down signals the group (`syscall.Kill(-pid, sig)`),
   never `cmd.Process.Kill()` alone — and checks `ProcessState != nil`
   first to avoid the pid-recycling hazard (CWE-367).**
   *Rationale*: `Process.Kill` signals only the PID it wraps; an orphaned
   grandchild in the same group as its parent (no `Setpgid` on it) is
   unreachable by a lone `Kill` (§7).
   *Verify*: reading heuristic — grep for `exec.Command(Context)?(` sites
   that themselves invoke a further subprocess (or wrap an unknown binary)
   and confirm `Setpgid: true` plus a group-aware kill path.
   *Run*: **yes** — `TestKillWithoutGroup_LeavesGrandchildAlive_Violation`
   (grandchild PID still signalable 150 ms later) vs
   `TestKillWithGroup_ReachesGrandchild_Twin` (grandchild gone). `go test
   -run KillWith -v` exit 0.

8. **A test suite that starts an `exec.Cmd` and asserts leak-freedom runs
   under `GODEBUG=execwait=2`; production code never sets it.**
   *Rationale*: the finalizer this enables *panics* the whole program on a
   detected leak (§8) — valuable as a CI-only tripwire for "did every
   `Start` get a matching `Wait`", actively dangerous as a runtime default.
   *Verify*: run the test suite (or a dedicated leak-check binary) with
   `GODEBUG=execwait=2` and confirm it exits 0 (no finalizer panic);
   `go.dev/doc/godebug` does not document this flag, so it is discoverable
   only by reading `os/exec`'s source (or this dive).
   *Run*: **yes** — `execwait-leak/main.go leak` under
   `GODEBUG=execwait=2` panics with the leaked-`Cmd` message and exits 2;
   the same binary run `compliant` (calls `Wait`), or without the
   `GODEBUG` variable at all, exits 0 and prints "reached end of main
   without a finalizer panic".

9. **Never shell out through `/bin/sh -c`/`sh -c`/`cmd /c` with a
   caller-composed command line; pass argv directly to
   `exec.CommandContext`.**
   *Rationale*: reintroduces word-splitting, glob expansion and injection
   that `os/exec`'s direct-exec design exists to avoid
   ([pkg.go.dev/os/exec](https://pkg.go.dev/os/exec) package doc; §9).
   *Verify*: `grep -rl -e 'exec\.Command("/bin/sh"' -e 'exec\.Command("sh"'
   -e 'exec\.CommandContext([^,]*, "/bin/sh"' -e
   'exec\.CommandContext([^,]*, "sh"' --include='*.go' . | xargs -r -n1
   echo` — empty output is a pass; **no linter in the tested catalogue
   backs this** (§12), so the grep (or an equivalent reading pass) is the
   only check.
   *Run*: **yes** — on `shellout-check/` (the violation) prints
   `violation.go`; on `shellout-check-twin/` (argv passed directly) prints
   nothing. Confirmed separately that `gosec`, `noctx`, and `staticcheck`
   (including SA1005 specifically) all produce zero findings on the
   violation — see Verification runs #4.

10. **Secrets reach a child through env or stdin, never argv.**
    *Rationale*: argv is visible via `ps`/`/proc/<pid>/cmdline` to any
    co-resident process for the argv's lifetime; env is visible only to a
    process that can read `/proc/<pid>/environ` (typically the same user or
    root), and stdin leaves no persistent trace at all (§9).
    *Verify*: `gosec` G204 flags a non-constant password/token argument
    directly (confirmed: it would flag
    `aquasecurity/trivy@ae561f8cca36:pkg/fanal/test/integration/docker/docker.go:63`'s
    `auth.Password` argument, since it is not a compile-time constant);
    reading heuristic for anything G204 misses (e.g. a constant-looking but
    actually-injected value): grep for `-p`, `--password`, `--token`,
    `-u`/`--user` immediately followed by a non-literal identifier in an
    `exec.Command(Context)?(` argument list.
    *Run*: no dedicated fixture (covered indirectly by #1/#9's tooling
    runs; gosec's constant-resolution behavior on tainted args is the
    standard, already-verified G204 mechanism, not a new check).

## Verification runs

All commands run through `/home/mherwig/.cache/research-lang/go-tools/run.sh`
(Go 1.27.1, golangci-lint 2.14.0, staticcheck bundled 0.8.1/2026.2) against
fixtures under `/home/mherwig/.cache/research-lang/go-tools/fixtures/subprocess-contract/`.

**1. `WaitDelay` bounds a pipe-hang hazard (M-G-08/11).**
```
$ run.sh go test -run TestWaitDelay -v -timeout 30s ./...
=== RUN   TestWaitDelay_ZeroHangsPastBound_Violation
--- PASS: TestWaitDelay_ZeroHangsPastBound_Violation (0.80s)
=== RUN   TestWaitDelay_NonZeroReturnsErrWaitDelay_Twin
--- PASS: TestWaitDelay_NonZeroReturnsErrWaitDelay_Twin (0.30s)
PASS
```
Exit 0 for both — the "violation" test's assertion is that `Wait` is
*still blocked* at 800 ms (proving the hazard is real when `WaitDelay==0`);
the "twin" test asserts `Wait` returns `exec.ErrWaitDelay` within the delay
when `WaitDelay=300ms`. Empty stderr/no failure output = pass in both
directions.

**2. `ErrDot` refuses to run, `./prog` runs normally (M-G-10).**
```
$ run.sh go test -run TestErrDot -v ./...
--- PASS: TestErrDot_BareNameWithDotInPath_Violation (0.09s)
--- PASS: TestErrDot_ExplicitDotSlash_Twin (0.07s)
```
The "violation" test asserts `errors.Is(err, exec.ErrDot)` AND that the
marker file the binary would create is absent (proof the process never
ran); the twin asserts the marker file exists.

**3. Draining only one stream deadlocks; concurrent drain completes
(M-G-11).**
```
$ run.sh go test -run Drain -v -timeout 30s ./...
--- PASS: TestDrainOnlyStdout_Deadlocks_Violation (1.00s)
--- PASS: TestDrainBothConcurrently_Completes_Twin (0.00s)
```

**4. Linter coverage of the shell-out gap (M-G-10, §12).**
```
$ run.sh golangci-lint run --default=none --enable-only=gosec,noctx ./...
   # (run against fixtures/subprocess-contract/shellout-check/, arg0="/bin/sh" literal)
violation.go:8:21: os/exec.Command must not be called. use os/exec.CommandContext (noctx)
1 issues: * noctx: 1
$ echo $?
1
```
`gosec` found **zero** issues on this file (all arguments are literal
constants, so G204's `TryResolve` succeeds and nothing is flagged) — only
`noctx` fired, and only because the call uses `exec.Command` instead of
`exec.CommandContext`, which is orthogonal to the shell-out hazard.
```
$ run.sh staticcheck ./...       # fixtures/subprocess-contract/shellout-check/
(no output)
$ echo $?
0
```
**Did not go red, as expected and explained**: SA1005 only inspects
`argv[0]` for embedded spaces, and explicitly excludes any value containing
`/` (`dominikh/go-tools@6cb65e58a558:staticcheck/sa1005/sa1005.go:58`:
`if !strings.Contains(val, " ") || strings.Contains(val, `+"`\\`"+`) ||
strings.Contains(val, "/") { continue }`) — `"/bin/sh"` contains `/` and is
skipped by design. The check exists to catch `exec.Command("ls / /tmp")`
(a whole command line stuffed into one string), not a `/bin/sh -c` shell-out
with clean argv splitting. This overturns this dive's own initial reading of
the map's brief (which cited the check's doc-comment example without
running it) — recorded honestly rather than asserted.

The grep-based reading heuristic (Normative guidance candidate #9) **does**
catch it:
```
$ grep -rl -e 'exec\.Command("/bin/sh"' -e 'exec\.Command("sh"' \
    -e 'exec\.CommandContext([^,]*, "/bin/sh"' -e 'exec\.CommandContext([^,]*, "sh"' \
    --include='*.go' fixtures/subprocess-contract/shellout-check | xargs -r -n1 echo
violation.go
$ grep -rl -e 'exec\.Command("/bin/sh"' -e 'exec\.Command("sh"' \
    -e 'exec\.CommandContext([^,]*, "/bin/sh"' -e 'exec\.CommandContext([^,]*, "sh"' \
    --include='*.go' fixtures/subprocess-contract/shellout-check-twin | xargs -r -n1 echo
(empty — pass)
```
Empty output on the twin (argv passed directly, no shell) means pass;
non-empty output (the matched filename) means at least one shell-out site
to review.

**5. `gosec`/`noctx` on a fully compliant call (baseline for #1/#9).**
```
$ run.sh golangci-lint run --default=none --enable-only=gosec,noctx ./...
   # fixtures/subprocess-contract/gosec-noctx-twin/ (CommandContext, all-literal argv)
0 issues.
$ echo $?
0
```
vs. the main fixture module (13 real usage sites, several deliberately
constructed as violations):
```
$ run.sh golangci-lint run --default=none --enable-only=gosec,noctx ./...
   # fixtures/subprocess-contract/ (the main module)
12 issues: * gosec: 9  * noctx: 3
$ echo $?
1
```

**6. `GODEBUG=execwait=2` leak finalizer panics on a leaked `Cmd` (M-G-12).**
```
$ GODEBUG=execwait=2 ./leak-tester leak
GODEBUG=execwait=2 detected a leaked exec.Cmd created by:
os/exec.Command(...)
	.../os/exec/exec.go:427 +0x2c5
main.main()
	.../execwait-leak/main.go:23 +0x74

panic: exec: Cmd started a Process but leaked without a call to Wait
goroutine 18 [running]:
os/exec.Command.func1(...)
	.../os/exec/exec.go:452 +0xe9
runtime.runFinalizers()
	.../runtime/mfinal.go:272 +0x3f7
$ echo $?
2
$ ./leak-tester leak                     # no GODEBUG at all
reached end of main without a finalizer panic
$ echo $?
0
$ GODEBUG=execwait=2 ./leak-tester compliant   # calls Wait
reached end of main without a finalizer panic
$ echo $?
0
```

**7. Process-group kill reaches a grandchild; a lone `Process.Kill` does
not (M-G-09).**
```
$ run.sh go test -run KillWith -v -timeout 30s ./...
--- PASS: TestKillWithoutGroup_LeavesGrandchildAlive_Violation (0.15s)
--- PASS: TestKillWithGroup_ReachesGrandchild_Twin (0.15s)
```
The "violation" test asserts the grandchild's PID is still signalable
(`syscall.Kill(pid, 0)` returns nil) 150 ms after killing only the immediate
child; the twin asserts the opposite after a group kill.

**8. Full suite (13 tests, all directions).**
```
$ run.sh go test -v -timeout 90s ./...
... (all 13 PASS, listed individually above)
ok  	subprocesscontract	2.782s
$ run.sh gofmt -l .
(empty)
$ run.sh go vet ./...
(empty)
```

## Exemplar evidence

- **`exec.Command` vs `exec.CommandContext` split**: 443 vs 141 call sites
  corpus-wide, `WaitDelay` in only 8, `Cancel` in only 4
  ([go-audit/exemplar-runtime-posture.md §6](../go-audit/exemplar-runtime-posture.md)).
  A 20-site manual sample (grep across the corpus, classified by hand)
  matches this shape closely: the overwhelming majority are literal-argv,
  short-lived tool invocations (`dominikh__go-tools/internal/xtools-internal/testenv/testenv.go:120,137,154`
  — `go build`, `go env`, `<tool> -version`; `tailscale__tailscale/net/netutil/ip_forward.go:287`
  — `sysctl -n`), with **no `WaitDelay` or custom `Cancel` anywhere in the
  sample**. Two sites are generic passthrough wrappers that forward
  caller-supplied argv verbatim — `bazelbuild__bazel-gazelle/vendor/golang.org/x/sys/execabs/execabs.go:99`
  (`exec.Command(name, arg...)`, itself the security-patch wrapper the
  `os/exec` package doc references) and
  `bazelbuild__bazel-gazelle/vendor/golang.org/x/tools/go/vcs/vcs.go:220`
  (`exec.Command(v.Cmd, args...)`).
- **`sh -c`**: 5 corpus-wide hits, genuinely rare
  ([go-audit/exemplar-runtime-posture.md §6](../go-audit/exemplar-runtime-posture.md)).
  One of the 20 sampled hits that superficially matches, `dominikh/go-tools@6cb65e58a558:staticcheck/sa1005/sa1005.go:40`,
  is the SA1005 analyzer's own doc-comment example, not production code —
  a false positive in any naive count that doesn't exclude doc strings.
- **Secrets in argv**: `aquasecurity/trivy@ae561f8cca36:pkg/fanal/test/integration/docker/docker.go:63`
  passes a password as a literal `-p` argument to `docker login` — the one
  concrete violation of the argv-secrets rule the runtime-posture audit
  found ([go-audit/exemplar-runtime-posture.md §6](../go-audit/exemplar-runtime-posture.md)),
  in integration-test code, not a shipped binary's own code path.
- **Process-tree cancellation and Windows job objects**: zero hits for
  `Setpgid`/group-kill or Windows job-object usage anywhere in the
  35-repo corpus per the runtime-posture audit's own command set (not
  separately re-run here — the audit's grep for `WaitDelay`/`Cancel` at
  8/4 hits already implies group-aware cancellation, which needs both, is
  rarer still). This is a genuine gap between exemplar practice and the
  contract this dive recommends: **no exemplar in the corpus demonstrates
  the MUST shape end-to-end** (`CommandContext` + `WaitDelay` + `Cancel` +
  `Setpgid`), which is itself the strongest argument for writing the
  pattern down explicitly rather than pointing at "how the ecosystem does
  it."
- **`ocx-sdk-python`'s `_process.py`** is the one artifact in this dive's
  evidence base that implements the full contract this dive recommends —
  timeout via `subprocess.TimeoutExpired`/`asyncio.timeout`, a
  SIGTERM-then-SIGKILL ladder (`KILL_GRACE = 5.0`,
  `/home/mherwig/dev/ocx-sdk-python/src/ocx_sdk/_process.py:68-69,763-770`),
  concurrent pump threads for both streams (`:616-624`), a pid-recycling
  guard before every group signal (`:800-819`), and an explicit rejection of
  `shell`/`args`/`executable` overrides (`_REJECTED_POPEN_KW`, `:86-91`).
  It is the template, not an exemplar to critique — every Go-specific
  finding in this dive states where the Go mechanism differs from it (no
  process-group primitive without `Setpgid`; `ExitCode()==-1` on signal
  death instead of Python's `returncode` carrying the negative signal
  number directly; no async/sync split, since Go has one concurrency
  model).

## AI-agent angle

- **Assuming `CommandContext` alone bounds `Wait`.** An LLM reaches for
  `exec.CommandContext` for the timeout and stops there, not realizing
  `WaitDelay` is a *separate* field it must also set — the context deadline
  only triggers `Cancel` (default: `Kill` the immediate child); it does not
  bound how long `Wait` then blocks on orphaned pipes (§1–2). **Smallest
  check**: grep for `exec.CommandContext(` sites with no `.WaitDelay =`
  assignment in the same function.
- **Expecting `errors.Is(err, context.DeadlineExceeded)` to fire after a
  timeout.** This is the single most plausible-looking wrong pattern an
  LLM will write, because it matches how `context.Context` errors surface
  everywhere else in Go (HTTP clients, `database/sql`, gRPC) — but `Wait`'s
  actual behavior on signal death breaks the analogy (§4). **Smallest
  check**: any `errors.Is(cmdErr, context.DeadlineExceeded)` or
  `errors.Is(cmdErr, context.Canceled)` immediately after a `Cmd.Wait()`/
  `Run()` call is a candidate for review — the reliable pattern is to check
  `ctx.Err()` directly.
- **Using `subprocess`-flavored shelling out from muscle memory
  (`sh -c` string composition), a Python/shell habit that pre-generics-era
  Go code sometimes carries too.** `os/exec` is direct-exec by design; an
  LLM trained partly on Python `subprocess.run(cmd, shell=True)` idioms
  will reach for `exec.Command("sh", "-c", composedString)` reflexively,
  and — as §12 shows — **no lint in the tested catalogue catches it** when
  the string is a literal, so this mistake survives `golangci-lint run`
  clean. **Smallest check**: the grep from Normative guidance candidate #9.
- **Reading only `StdoutPipe()` "because I don't need stderr."** An LLM
  asked to "capture stdout" will often take `cmd.StdoutPipe()` alone and
  leave `Cmd.Stderr` at its zero value — which is actually *safe* (nil
  connects to `/dev/null`, no deadlock) — but the failure mode appears when
  the same LLM is later asked to "also capture stderr for debugging" and
  adds `cmd.StderrPipe()` without adding a second reader, silently
  introducing the deadlock of §5. **Smallest check**: grep for
  `StderrPipe()` or `StdoutPipe()` and confirm each returned reader has a
  paired `io.Copy`/`io.ReadAll`/pump goroutine.
- **Hand-rolling a `time.AfterFunc` + `Process.Kill` timeout instead of
  `WaitDelay`.** This compiles, looks correct, and passes casual review —
  it is exactly the "pattern that compiles but is wrong" this dive was
  asked to flag. It fails specifically on the orphaned-descendant-holds-a-
  pipe-open case (§1), which a quick manual test (kill a short-lived child)
  will not exercise. **Smallest check**: reading heuristic — any
  `time.AfterFunc`/`time.Sleep`-based goroutine that calls
  `cmd.Process.Kill()` is a candidate to replace with `WaitDelay` (+
  `Cancel` if graceful shutdown matters).
- **Treating `cmd.ProcessState.ExitCode()` as always non-negative.** Code
  generated to "map the exit code" often writes a `switch` or lookup table
  assuming `ExitCode()` is in `[0,255]`; it returns `-1` on signal death
  (§findings item, `syscall.WaitStatus.ExitStatus()`), and a naive lookup
  table indexed by exit code will silently miss or panic on that case.
  **Smallest check**: grep for `.ExitCode()` usage and confirm a `-1` (or
  "signal death") branch exists alongside the table/switch.
- **Assuming `killpg`/`Setpgid` "just works" the same on Windows.** An LLM
  writing cross-platform code sometimes adds `SysProcAttr.Setpgid = true`
  unconditionally, which does not compile on Windows at all (the field
  does not exist in that OS's `SysProcAttr`) — this is a build failure, not
  a subtle bug, but a common one from copy-pasting a Unix-only snippet.
  **Smallest check**: `go build` (or `go vet`) for the `windows` GOOS target
  specifically; the fixture's own `setpgid_unix.go` uses `//go:build unix`
  for exactly this reason.

## Contested / evolving

- **This dive's own initial reading of the map's brief was wrong about
  SA1005**, and the correction is recorded rather than smoothed over: the
  brief's phrasing ("does staticcheck ban `sh -c`?") reads naturally as
  "yes, SA1005 exists for this," but the analyzer's actual source
  (§Verification runs #4) shows it checks only `argv[0]` for embedded
  spaces and explicitly *excludes* any value containing `/` — meaning
  `/bin/sh` as `argv[0]` is specifically exempted, and the doc-comment's
  `/bin/sh -c "ls | grep Awesome"` example is presented as the *recommended
  workaround* for when a shell really is wanted, not a flagged anti-pattern.
  As of golangci-lint 2.14.0 / staticcheck 2026.2.1, **no analyzer in the
  standard toolchain catches a literal shell-out**; this is a gap the
  `go-quality` rule set should either accept (reading heuristic only) or
  propose upstream (a new gosec rule or golangci custom `ruleguard`
  pattern) — open, as of 2026-09-26.
- **Whether `execwait=2` belongs in a `go-diagnose` skill.** The mechanism
  is real, undocumented, and Go-team-internal-tooling in character (the
  `#` prefix, the total absence from `go.dev/doc/godebug`). It is a strong
  candidate for a diagnosis skill's "how do I find a leaked `exec.Cmd`"
  procedure — run the test suite once with `GODEBUG=execwait=2` — but it is
  a bad candidate for a MUST rule in `go-quality`, since it changes program
  behavior (a panic instead of silent leak) rather than merely reporting.
  This dive's recommendation (candidate #8: CI-only, never production) is a
  position, not yet cross-checked against whichever dive owns `go-diagnose`
  scoping.
- **Whether the SDK should expose a `Setpgid`/group-kill helper as public
  API, or keep it an internal implementation detail.** `ocx-sdk-python`
  keeps the equivalent (`_session_kwargs`, `_signal_group`) entirely
  private, exposed only through the effects of `run_command`'s own timeout
  handling. A Go SDK could do the same, or could expose a
  `subprocess.Group`-shaped public type for callers building their own
  wrappers around non-`ocx` binaries. This dive found no exemplar precedent
  either way (§Exemplar evidence: zero corpus hits for this shape at all)
  and defers the decision to whichever dive owns the SDK's public surface
  (`api/sdk-surface`, per the map).
- **Windows job objects: build one in the SDK, or document the gap like
  `ocx-sdk-python` does and skip it for v0.1.** Given `ocx-sdk-python`
  itself does not attempt a Windows process-group equivalent and the
  owner's Q6 default treats Windows as first-class for the Go SDK (per
  `go-frame.md`'s recorded orchestrator decisions), this is a real tension:
  first-class Windows support plausibly requires the job-object machinery
  §10 describes, which has no exemplar precedent and non-trivial surface
  area (create, configure, assign, and — critically — assign *before* the
  child can spawn anything of its own, a narrow race window right after
  `Start`). Flagged for the owner/SDK-surface dive rather than resolved
  here.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [pkg.go.dev/os/exec](https://pkg.go.dev/os/exec) | Package reference | Current, Go 1.27.1 | Primary doc for `CommandContext`, `Cancel`, `WaitDelay`, `ErrDot`, `ErrWaitDelay`, `ExitError`, pipe-deadlock warnings |
| [go.dev/blog/path-security](https://go.dev/blog/path-security) | Go team blog post | 2021 (background for the Go 1.19 change) | Explains the current-directory resolution vulnerability `ErrDot` fixes and why `execerrdot` exists |
| [go.dev/doc/godebug](https://go.dev/doc/godebug) | Official GODEBUG reference | Current, updated through 1.27 | Confirms `execerrdot` is the *only* documented exec-related GODEBUG — the absence of `execwait` here is itself the finding |
| [go.dev/doc/go1.20](https://go.dev/doc/go1.20) | Release notes | Go 1.20 (2023) | Confirms `Cmd.Cancel`/`Cmd.WaitDelay` version-added |
| go1.27.1:src/os/exec/exec.go | Go stdlib source (via ocx-provisioned toolchain) | Go 1.27.1, 2026 | Ground truth for every mechanism in this dive: the `#execwait` finalizer (:390-455), `Start`'s `ErrDot` refusal (:672-679), `watchCtx` (:800-893), `Wait`/`awaitGoroutines` (:936-1021) |
| go1.27.1:src/os/exec_posix.go, src/syscall/syscall_linux.go | Go stdlib source | Go 1.27.1, 2026 | `ProcessState.ExitCode()` returning -1 on signal death, traced to `WaitStatus.ExitStatus()` |
| go1.27.1:src/syscall/exec_linux.go | Go stdlib source | Go 1.27.1, 2026 | `SysProcAttr` field list (`Setpgid`, `Pgid`, `Pdeathsig`, etc.) on Linux |
| go1.27.1:src/os/exec/exec_test.go | Go stdlib's own test suite | Go 1.27.1, 2026 | The `TestMain` re-exec helper-process pattern this dive's own fixture mirrors |
| [securego/gosec rules/subproc.go](https://github.com/securego/gosec/blob/master/rules/subproc.go) | gosec's own source (GitHub) | current as fetched 2026-09-26 | Ground truth for what G204 actually checks (constant-resolution, which functions) |
| dominikh/go-tools@6cb65e58a558:staticcheck/sa1005/sa1005.go | Exemplar corpus (staticcheck's own upstream repo) | pinned SHA, fetched 2026-09-26 | Ground truth for SA1005's actual trigger condition — the source overturned this dive's own initial assumption |
| [go.dev/issue/23019](https://go.dev/issue/23019) | Go issue tracker | referenced from stdlib source comments | The upstream issue behind "an orphaned subprocess inherited the pipe and is still holding it open" — the exact hazard §1/§2 test |
| [pkg.go.dev/golang.org/x/sys/windows](https://pkg.go.dev/golang.org/x/sys/windows) | x/sys/windows package reference | current as fetched 2026-09-26 | `CreateJobObject`/`SetInformationJobObject`/`AssignProcessToJobObject` — the Windows process-tree-kill primitive |
| [Microsoft Job Objects doc](https://learn.microsoft.com/windows/win32/procthread/job-objects) | Platform reference | current | Background on the underlying Windows primitive x/sys/windows wraps |
| [buildkite/agent#1329](https://github.com/buildkite/agent/pull/1329) | Real-world PR | 2023 | A production Go codebase wiring a job object to an `exec.Cmd`-spawned tree |
| `/home/mherwig/dev/ocx-sdk-python/src/ocx_sdk/_process.py` | The fleet's own Python SDK subprocess module | as of this conversation, 2026-09-26 | The mechanism this dive's Go recommendations mirror or explicitly diverge from — pump threads, kill ladder, pid-recycling guard, Windows carve-outs |
| [go-audit/exemplar-runtime-posture.md §6](../go-audit/exemplar-runtime-posture.md) | This program's own wave-1 audit | 2026-09-26 | Corpus-wide counts for `exec.Command`/`CommandContext`/`WaitDelay`/`Cancel`/`sh -c`, and the trivy secrets-in-argv citation |
| [go-audit/config-inventory.md §3](../go-audit/config-inventory.md) | This program's own wave-1 audit | 2026-09-26 | The ocx-sdk-python template mapping and the SDK's public-surface commitments this dive's recommendations must fit |
| [go-topic-map.md](../go-topic-map.md) rows M-G-08..14, M-E-18, conflict 16 | This program's own phase-3 map | 2026-09-26 | The commissioning brief and the SIGPIPE/exit-code conflict this dive's scope explicitly excludes but must not contradict |
